/****************************************************
 * PROGRAMA DE CONDUTA — MISSÕES (Incentivo de Missão)
 *
 * Registro MANUAL (nunca derivado automaticamente do Auvo — a tarefa do
 * Auvo só suporta 1 técnico por tarefa, e o briefing exige pagar os 2
 * quando há 2 executantes na mesma missão; ver decisão no plano de
 * implementação). O Destino vem de um autocomplete direto da tabela de
 * distâncias de referência (qual_distancia_referencia) — o cadastro de
 * Cliente não tem cidade/UF estruturado, então não dá pra derivar
 * automaticamente do endereço.
 *
 * Regra 13 (não negociável): qualifica com km_trecho >= MISSAO_KM_MINIMO
 * (200km), sempre medido a partir da sede.
 * Regra 14 (não negociável): 2 executantes na mesma missão => R$300 pra
 * CADA um, sem dividir — refletido no motor de cálculo (cada execução
 * de CondutaCalculo.apurarColaborador conta 1 missão inteira por pessoa).
 ****************************************************/

function Conduta_apiRegistrarMissao(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};

  var referenciaId=String(payload.referenciaId||'').trim(),destino=String(payload.destino||'').trim();
  var referencia = SGO_DATA.getAll(CONDUTA_SHEETS.DISTANCIA_REFERENCIA).find(function(d){
    return referenciaId?String(d.ID)===referenciaId:SGO_UTILS.safeUpper(d.DESTINO)===SGO_UTILS.safeUpper(destino);
  });
  if (!referencia) throw new Error('Selecione um destino cadastrado para a missão.');

  var data = String(payload.data || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data da missão inválida (use AAAA-MM-DD).');
  // 2026-10-15 (auditoria): sem data futura e sem lançar em mês já fechado
  // (ficaria no relatório de missões mas fora do fechamento congelado).
  if (data > Conduta_hojeISO_()) throw new Error('A data da missão não pode estar no futuro.');
  Conduta_exigirCompetenciaAberta_(Conduta_competenciaDe_(data));

  var executante1Id = String(payload.executante1Id || '').trim();
  if (!executante1Id) throw new Error('Informe pelo menos 1 executante.');

  var executante2Id = String(payload.executante2Id || '').trim();
  if (executante2Id && executante2Id === executante1Id) {
    throw new Error('O 2º executante precisa ser uma pessoa diferente do 1º.');
  }

  // 2026-10-15 (auditoria): a mesma missão (data + destino + executante) não pode
  // ser lançada duas vezes — cada lançamento vale um incentivo.
  var execs = [executante1Id, executante2Id].filter(Boolean);
  var duplicada = SGO_DATA.getAll(CONDUTA_SHEETS.MISSAO).some(function (m) {
    return Conduta_soData_(m.DATA) === data && SGO_UTILS.safeUpper(m.DESTINO) === SGO_UTILS.safeUpper(referencia.DESTINO) &&
      execs.some(function (e) { return String(m.EXECUTANTE_1_ID) === e || String(m.EXECUTANTE_2_ID) === e; });
  });
  if (duplicada) throw new Error('Já existe missão lançada para este destino, nesta data, com este executante.');

  var parametros = Conduta_obterParametros_();
  var kmMinimo = Number(parametros.MISSAO_KM_MINIMO) || 200;
  var kmTrecho = Number(referencia.KM_TRECHO) || 0;
  var qualifica = CondutaCalculo.missaoQualifica(kmTrecho, kmMinimo);

  var registro = SGO_DATA.insert(CONDUTA_SHEETS.MISSAO, {
    COMPETENCIA: Conduta_competenciaDe_(data),
    // Destinos cadastrados pela busca de CNPJ carregam o vínculo do cliente;
    // assim a missão continua rastreável mesmo quando a tela envia só a cidade.
    CLIENTE_ID: String(payload.clienteId || referencia.CLIENTE_ID || ''),
    DESTINO: referencia.DESTINO,
    KM_TRECHO: kmTrecho,
    QUALIFICA: qualifica,
    DATA: data,
    EXECUTANTE_1_ID: executante1Id,
    EXECUTANTE_2_ID: executante2Id,
    AUVO_TASK_ID: String(payload.auvoTaskId || ''),
    REGISTRADO_POR: sessao.userId
  });

  Conduta_notificarMissao_(registro, sessao, execs, qualifica, kmMinimo);
  return { success: true, item: registro };
}

/**
 * 2026-10-16: avisa por e-mail/WhatsApp (SGO_Notificar.js) os executantes da missão
 * recém-cadastrada, menos quem cadastrou. Só informa — não muda regra nem cálculo;
 * qualquer falha de envio fica em NTF_ENVIOS e não desfaz o cadastro.
 * Missão não tem prazo (a data é a da execução, nunca futura), então não há aviso de atraso.
 */
function Conduta_notificarMissao_(registro, sessao, execs, qualifica, kmMinimo) {
  try {
    var destino = execs.filter(function (id) { return id && String(id) !== String(sessao.userId); });
    if (!destino.length) return;
    var nomes = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { nomes[String(u.ID)] = String(u.NOME || u.USUARIO || '').trim(); });
    var d = String(registro.DATA || ''), dataBr = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.substring(8, 10) + '/' + d.substring(5, 7) + '/' + d.substring(0, 4) : d;
    var km = Number(registro.KM_TRECHO) || 0;
    var texto = (nomes[String(sessao.userId)] || sessao.nome || 'A gestão') + ' cadastrou uma missão em que você é executante.\n' +
      'Destino: ' + registro.DESTINO + '\n' +
      'Data: ' + dataBr + '\n' +
      'Executante(s): ' + execs.map(function (id) { return nomes[String(id)] || 'colaborador'; }).join(' e ') + '\n' +
      'Distância do trecho: ' + String(km).replace('.', ',') + ' km. ' +
      (qualifica ? 'Qualifica para o incentivo de missão (mínimo de ' + kmMinimo + ' km).' : 'Não qualifica para o incentivo de missão (mínimo de ' + kmMinimo + ' km).') + '\n' +
      'Se algum dado estiver errado, fale com a gestão. Veja em Programa de conduta, no SGO+.';
    SGO_notificar_({ usuarios: destino, titulo: 'Missão cadastrada: ' + registro.DESTINO + ' em ' + dataBr, texto: texto, canais: ['sgo', 'email', 'whatsapp'], origem: 'CONDUTA', refId: registro.ID,
      modelo: { nome: 'sgo_missao_nova', parametros: ['@NOME', registro.DESTINO, dataBr, '@LINK'] } });
  } catch (e) {
    console.error('Conduta notificar missão: ' + ((e && e.message) || e));
  }
}

function Conduta_apiListarMissoes(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var somenteMinhas = !isAdminSession(sessionId);
  var nomes = Object.create(null);
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u){nomes[String(u.ID)] = String(u.NOME || '').trim();});

  return SGO_DATA.getAll(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    if (payload.competencia && Conduta_soComp_(m.COMPETENCIA) !== Conduta_soComp_(payload.competencia)) return false;
    if (somenteMinhas) {
      return String(m.EXECUTANTE_1_ID) === String(sessao.userId) || String(m.EXECUTANTE_2_ID) === String(sessao.userId);
    }
    return true;
  }).map(function (m) {
    var item = Object.assign({}, m);
    item.DATA = Conduta_soData_(m.DATA);
    item.COMPETENCIA = Conduta_soComp_(m.COMPETENCIA);
    item.EXECUTANTE_1_NOME = nomes[String(m.EXECUTANTE_1_ID)] || 'Colaborador não localizado';
    item.EXECUTANTE_2_NOME = m.EXECUTANTE_2_ID ? (nomes[String(m.EXECUTANTE_2_ID)] || 'Colaborador não localizado') : '';
    item.QUALIFICA = m.QUALIFICA === true || SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE';
    return item;
  }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); });
}

function Conduta_apiRemoverMissao(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var ok = SGO_DATA.remove(CONDUTA_SHEETS.MISSAO, payload.id);
  if (!ok) throw new Error('Missão não encontrada.');
  return { success: true };
}

/**
 * Missões qualificadas de um colaborador numa competência, já excluindo
 * qualquer missão em que exista ocorrência FIRME do PRÓPRIO executante
 * vinculada a ela (MISSAO_ID) — implementa
 * "ocorrencia_do_executante_na_missao" do pseudocódigo da seção 5.
 * Usado só pelo fechamento (SGO_Conduta_Fechamento.js).
 */
function Conduta_qtdMissoesElegiveisColaborador_(competencia, colaboradorId) {
  var missoesDoColaborador = SGO_DATA.getAll(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    return Conduta_soComp_(m.COMPETENCIA) === competencia && (SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true) &&
      (String(m.EXECUTANTE_1_ID) === String(colaboradorId) || String(m.EXECUTANTE_2_ID) === String(colaboradorId));
  });
  if (!missoesDoColaborador.length) return 0;

  var missoesComOcorrenciaDoExecutante = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    if (SGO_UTILS.safeUpper(o.STATUS) !== 'FIRME') return;
    if (!o.MISSAO_ID) return;
    if (String(o.COLABORADOR_ID) !== String(colaboradorId)) return;
    missoesComOcorrenciaDoExecutante[String(o.MISSAO_ID)] = true;
  });

  return missoesDoColaborador.filter(function (m) { return !missoesComOcorrenciaDoExecutante[String(m.ID)]; }).length;
}
