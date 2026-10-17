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
  var duplicada = Conduta_ativos_(CONDUTA_SHEETS.MISSAO).some(function (m) {
    return Conduta_soData_(m.DATA) === data && SGO_UTILS.safeUpper(m.DESTINO) === SGO_UTILS.safeUpper(referencia.DESTINO) &&
      execs.some(function (e) { return String(m.EXECUTANTE_1_ID) === e || String(m.EXECUTANTE_2_ID) === e; });
  });
  if (duplicada) throw new Error('Já existe missão lançada para este destino, nesta data, com este executante.');

  var parametros = Conduta_obterParametros_();
  var kmMinimo = Number(parametros.MISSAO_KM_MINIMO) || 200;
  var kmTrecho = Number(referencia.KM_TRECHO) || 0;
  var qualifica = CondutaCalculo.missaoQualifica(kmTrecho, kmMinimo);

  // 17/10/2026 (decisão do dono): missão com incentivo lançada pelo próprio
  // colaborador (ou por quem não é da gestão) só conta depois de aprovada pela
  // gestão. Lançada pela gestão para outra pessoa já nasce aprovada.
  var gestaoLanca = isAdminSession(sessionId);
  var lancaPraSi = execs.some(function (e) { return String(e) === String(sessao.userId); });
  var aprovacao = !qualifica ? 'SEM_INCENTIVO' : (gestaoLanca && !lancaPraSi ? 'APROVADA' : 'PENDENTE');
  var agora = SGO_UTILS.nowIso();

  var registro = SGO_DATA.insert(CONDUTA_SHEETS.MISSAO, {
    APROVACAO: aprovacao,
    APROVACAO_POR: aprovacao === 'APROVADA' ? sessao.userId : '',
    APROVACAO_POR_NOME: aprovacao === 'APROVADA' ? String(sessao.nome || sessao.usuario || '') : '',
    APROVACAO_EM: aprovacao === 'APROVADA' ? agora : '',
    APROVACAO_MOTIVO: aprovacao === 'APROVADA' ? 'Lançada pela gestão.' : '',
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
  if (aprovacao === 'PENDENTE') Conduta_avisarGestaoMissaoPendente_(registro, sessao);
  SGO_DATA.log('CONDUTA_MISSAO_REGISTRAR', sessao.usuario, 'Missão registrada: ' + registro.DESTINO + ' em ' + data + ' (' + Conduta_rotuloAprovacao_(aprovacao) + ')', 'CONDUTA');
  return {
    success: true, item: registro, aprovacao: aprovacao,
    message: aprovacao === 'PENDENTE'
      ? 'Missão registrada e enviada para aprovação da gestão. O incentivo só conta depois de aprovado; você recebe o aviso da decisão.'
      : aprovacao === 'APROVADA' ? 'Missão registrada e aprovada.' : 'Missão registrada. Ela não atinge a distância mínima, então não gera incentivo.'
  };
}

// ------------------------------------------------------------
// APROVAÇÃO DA GESTÃO (17/10/2026)
// ------------------------------------------------------------
var CONDUTA_APROVACAO_ROTULOS = {
  PENDENTE: 'Aguardando aprovação da gestão', APROVADA: 'Aprovada', RECUSADA: 'Recusada',
  LEGADA: 'Aprovação legada', SEM_INCENTIVO: 'Sem incentivo (abaixo da distância mínima)'
};
function Conduta_rotuloAprovacao_(s) { return CONDUTA_APROVACAO_ROTULOS[String(s || 'LEGADA').toUpperCase()] || String(s || ''); }

/** Situação da aprovação; registro antigo sem o campo vale como aprovação legada. */
function Conduta_situacaoAprovacao_(m) {
  var s = SGO_UTILS.safeUpper(m && m.APROVACAO);
  return s || 'LEGADA';
}

/** Conta para o incentivo: aprovada pela gestão ou lançada antes da regra (legada). */
function Conduta_missaoAprovada_(m) {
  var s = Conduta_situacaoAprovacao_(m);
  return s === 'APROVADA' || s === 'LEGADA';
}

/** Missões com incentivo aguardando decisão numa competência (travam o fechamento). */
function Conduta_missoesPendentesCompetencia_(competencia) {
  return Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    return Conduta_soComp_(m.COMPETENCIA) === competencia && Conduta_situacaoAprovacao_(m) === 'PENDENTE';
  });
}

function Conduta_gestoresParaAviso_(excetoIds) {
  var fora = (excetoIds || []).map(String);
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    var p = SGO_UTILS.safeUpper(u.PERFIL);
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && (p === 'GESTOR' || p === 'DIRETORIA') && fora.indexOf(String(u.ID)) < 0;
  }).map(function (u) { return u.ID; });
}

function Conduta_avisarGestaoMissaoPendente_(registro, sessao) {
  try {
    var destino = Conduta_gestoresParaAviso_([sessao.userId]);
    if (!destino.length) return;
    var dataBr = Conduta_dataBr_(registro.DATA);
    SGO_notificar_({ usuarios: destino, titulo: 'Missão aguardando aprovação: ' + registro.DESTINO + ' em ' + dataBr,
      texto: (sessao.nome || sessao.usuario || 'Um colaborador') + ' registrou uma missão com incentivo que precisa da aprovação da gestão.\n' +
        'Destino: ' + registro.DESTINO + '\nData: ' + dataBr + '\nDistância do trecho: ' + String(Number(registro.KM_TRECHO) || 0).replace('.', ',') + ' km.\n' +
        'Para decidir, abra Programa de conduta > Missões no SGO+ e clique em Aprovar ou Recusar. O mês só fecha depois da decisão.',
      canais: ['sgo', 'email', 'whatsapp'], origem: 'CONDUTA', refId: registro.ID });
  } catch (e) { console.error('Conduta aviso missão pendente: ' + ((e && e.message) || e)); }
}

/**
 * Aprovar ou recusar missão pendente. payload: { id, decisao: 'APROVAR'|'RECUSAR', motivo }
 * Só gestão (Gestor, Diretoria ou Administrador); ninguém decide missão em que é executante.
 */
function Conduta_apiDecidirMissao(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  if (decisao !== 'APROVAR' && decisao !== 'RECUSAR') throw new Error('Escolha Aprovar ou Recusar.');
  var motivo = String(payload.motivo || '').trim();
  if (decisao === 'RECUSAR' && motivo.length < 8) throw new Error('Para recusar, escreva o motivo (pelo menos 8 caracteres). Ele vai no aviso para quem lançou a missão.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var m = SGO_DATA.getById(CONDUTA_SHEETS.MISSAO, payload.id);
    if (!m || SGO_UTILS.safe(m.EXCLUIDA_EM)) throw new Error('Missão não encontrada (pode ter sido removida). Atualize a lista de missões.');
    var situacao = Conduta_situacaoAprovacao_(m);
    if (situacao !== 'PENDENTE') throw new Error('Esta missão não está aguardando aprovação (situação atual: ' + Conduta_rotuloAprovacao_(situacao) + '). Atualize a lista.');
    if ([m.EXECUTANTE_1_ID, m.EXECUTANTE_2_ID].map(String).indexOf(String(sessao.userId)) >= 0) {
      throw new Error('Você é executante desta missão e não pode decidir sobre ela. Peça a outra pessoa da gestão (Gestor ou Diretoria) para aprovar ou recusar.');
    }
    Conduta_exigirCompetenciaAberta_(Conduta_soComp_(m.COMPETENCIA || m.DATA));
    var nova = decisao === 'APROVAR' ? 'APROVADA' : 'RECUSADA';
    SGO_DATA.update(CONDUTA_SHEETS.MISSAO, m.ID, {
      APROVACAO: nova, APROVACAO_POR: sessao.userId, APROVACAO_POR_NOME: String(sessao.nome || sessao.usuario || ''),
      APROVACAO_EM: SGO_UTILS.nowIso(), APROVACAO_MOTIVO: motivo || (nova === 'APROVADA' ? 'Aprovada pela gestão.' : '')
    });
    SGO_DATA.log('CONDUTA_MISSAO_' + nova, sessao.usuario, 'Missão ' + m.DESTINO + ' em ' + Conduta_soData_(m.DATA) + ' ' + nova.toLowerCase() + (motivo ? ': ' + motivo : ''), 'CONDUTA');
  } finally { lock.releaseLock(); }

  try {
    var destino = [m.REGISTRADO_POR, m.EXECUTANTE_1_ID, m.EXECUTANTE_2_ID].filter(function (id) { return id && String(id) !== String(sessao.userId); });
    var dataBr = Conduta_dataBr_(m.DATA);
    SGO_notificar_({ usuarios: destino, titulo: 'Missão ' + (nova === 'APROVADA' ? 'aprovada' : 'recusada') + ': ' + m.DESTINO + ' em ' + dataBr,
      texto: 'A missão para ' + m.DESTINO + ' em ' + dataBr + ' foi ' + (nova === 'APROVADA' ? 'aprovada' : 'recusada') + ' por ' + (sessao.nome || sessao.usuario) + '.\n' +
        (nova === 'APROVADA' ? 'Ela passa a contar para o incentivo de missão do mês.' : 'Motivo: ' + motivo + '\nEla não conta para o incentivo. Se houver engano, fale com a gestão antes do fechamento do mês.') +
        '\nVeja em Programa de conduta > Missões, no SGO+.',
      canais: ['sgo', 'email', 'whatsapp'], origem: 'CONDUTA', refId: m.ID });
  } catch (eAviso) { console.error('Conduta aviso decisão missão: ' + ((eAviso && eAviso.message) || eAviso)); }
  return { success: true, aprovacao: nova, message: 'Missão ' + (nova === 'APROVADA' ? 'aprovada' : 'recusada') + '. Quem lançou recebe o aviso.' };
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

  return Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    if (payload.competencia && Conduta_soComp_(m.COMPETENCIA) !== Conduta_soComp_(payload.competencia)) return false;
    if (payload.aprovacao && Conduta_situacaoAprovacao_(m) !== SGO_UTILS.safeUpper(payload.aprovacao)) return false;
    if (somenteMinhas) {
      return String(m.EXECUTANTE_1_ID) === String(sessao.userId) || String(m.EXECUTANTE_2_ID) === String(sessao.userId) || String(m.REGISTRADO_POR) === String(sessao.userId);
    }
    return true;
  }).map(function (m) {
    var item = Object.assign({}, m);
    item.DATA = Conduta_soData_(m.DATA);
    item.COMPETENCIA = Conduta_soComp_(m.COMPETENCIA);
    item.EXECUTANTE_1_NOME = nomes[String(m.EXECUTANTE_1_ID)] || 'Colaborador não localizado';
    item.EXECUTANTE_2_NOME = m.EXECUTANTE_2_ID ? (nomes[String(m.EXECUTANTE_2_ID)] || 'Colaborador não localizado') : '';
    item.QUALIFICA = m.QUALIFICA === true || SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE';
    item.APROVACAO = Conduta_situacaoAprovacao_(m);
    item.APROVACAO_ROTULO = Conduta_rotuloAprovacao_(item.APROVACAO);
    item.APROVACAO_EM = Conduta_soData_(m.APROVACAO_EM);
    item.REGISTRADO_POR_NOME = nomes[String(m.REGISTRADO_POR)] || '';
    item.CONTA_INCENTIVO = item.QUALIFICA && Conduta_missaoAprovada_(m);
    // gestão decide, exceto quem é executante da própria missão
    item.PODE_DECIDIR = !somenteMinhas && item.APROVACAO === 'PENDENTE' && String(m.EXECUTANTE_1_ID) !== String(sessao.userId) && String(m.EXECUTANTE_2_ID) !== String(sessao.userId);
    return item;
  }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); });
}

function Conduta_apiRemoverMissao(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var missao = SGO_DATA.getById(CONDUTA_SHEETS.MISSAO, payload.id);
  if (!missao || SGO_UTILS.safe(missao.EXCLUIDA_EM)) throw new Error('Missão não encontrada (pode já ter sido removida). Atualize a lista.');
  // 16/10/2026: mês já fechado não muda (o incentivo já foi apurado e congelado).
  Conduta_exigirCompetenciaAberta_(Conduta_soComp_(missao.COMPETENCIA || missao.DATA));
  // não apaga a linha: fica no histórico como excluída, com quem e quando
  SGO_DATA.update(CONDUTA_SHEETS.MISSAO, missao.ID, { EXCLUIDA_EM: SGO_UTILS.nowIso(), EXCLUIDA_POR: sessao.userId });
  SGO_DATA.log('CONDUTA_MISSAO_REMOVER', sessao.usuario, 'Missão removida: ' + missao.DESTINO + ' em ' + Conduta_soData_(missao.DATA), 'CONDUTA');
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
  var missoesDoColaborador = Conduta_ativos_(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    // 17/10/2026: só conta missão aprovada pela gestão (ou legada, lançada antes da regra)
    return Conduta_soComp_(m.COMPETENCIA) === competencia && (SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true) && Conduta_missaoAprovada_(m) &&
      (String(m.EXECUTANTE_1_ID) === String(colaboradorId) || String(m.EXECUTANTE_2_ID) === String(colaboradorId));
  });
  if (!missoesDoColaborador.length) return 0;

  var missoesComOcorrenciaDoExecutante = {};
  Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    if (SGO_UTILS.safeUpper(o.STATUS) !== 'FIRME') return;
    if (!o.MISSAO_ID) return;
    if (String(o.COLABORADOR_ID) !== String(colaboradorId)) return;
    missoesComOcorrenciaDoExecutante[String(o.MISSAO_ID)] = true;
  });

  return missoesDoColaborador.filter(function (m) { return !missoesComOcorrenciaDoExecutante[String(m.ID)]; }).length;
}
