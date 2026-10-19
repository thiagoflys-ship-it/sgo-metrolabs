/****************************************************
 * PROGRAMA DE CONDUTA — QUALIDADE (19/10/2026)
 *
 * 1. Área do colaborador: lida de CAD_USUARIOS.AREA (SGO_Areas.js). O
 *    Conduta não guarda área em lugar nenhum.
 * 2. Sugestões de ocorrência (aba qual_sugestao): os outros módulos
 *    (Frota, Auvo, Painel de qualidade, Minhas atividades, Avisos e o
 *    Assistente do ponto do COMMAND pela ponte) geram SUGESTÕES. Nada vira
 *    ocorrência sozinho: a gestão aceita (registra a ocorrência, com o
 *    vínculo ao registro de origem) ou descarta com motivo. A ocorrência
 *    aceita segue o fluxo de sempre (homologação por outra pessoa da
 *    gestão, contestação, julgamento). O resumo do ponto do COMMAND é
 *    só informativo.
 * 3. Análise de causa (aba qual_analise_causa): 5 Porquês e, se quiser,
 *    Ishikawa (6M), ligada a uma ocorrência ou a um código recorrente.
 * 4. Plano de ação 5W2H com ciclo PDCA (aba qual_plano_acao). Cada ação
 *    do plano é uma atividade de Minhas atividades (módulo "conduta"), com
 *    responsável e prazo; não existe outro sistema de tarefas.
 * 5. Kanban das ocorrências (Registrada, Em defesa, Homologada, Plano de
 *    ação, Concluída) e indicadores de qualidade por área.
 *
 * O cálculo do índice, o farol, o bônus e as regras do fluxo não mudam.
 * Nada é apagado: sugestão descartada, plano cancelado e análise antiga
 * ficam guardados com quem decidiu e quando.
 ****************************************************/

var CNDQ_SHEETS = Object.freeze({
  SUGESTAO: 'qual_sugestao',
  PLANO: 'qual_plano_acao',
  ANALISE: 'qual_analise_causa'
});
var CNDQ_COLETA_PROP = 'CONDUTA_SUGESTOES_COLETA_EM';
var CNDQ_COLETA_HORAS = 3;
var CNDQ_JANELA_DIAS = 60;           // origem mais antiga que vira sugestão
var CNDQ_ATRASO_RECORRENTE_MIN = 3;  // atividades atrasadas no mês para sugerir
var CNDQ_CODIGO_RECORRENTE_MIN = 3;  // firmes do mesmo código no período

var CNDQ_ORIGENS = {
  FROTA: { nome: 'Frota', tela: 'frota' },
  AUVO: { nome: 'Integração Auvo', tela: 'auvo' },
  QUALIDADE: { nome: 'Painel de qualidade', tela: 'qualidade' },
  ATIVIDADES: { nome: 'Minhas atividades', tela: 'atividades_equipe' },
  AVISOS: { nome: 'Avisos', tela: 'avisos' },
  COMMAND_PONTO: { nome: 'Assistente do ponto (COMMAND)', tela: '' }
};

// ------------------------------------------------------------
// ESTRUTURA (chamada por Conduta_migrate_, uma vez por instalação)
// ------------------------------------------------------------
function Conduta_qualidadeMigrar_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CONDUTA_QUALIDADE_V1') === '1') return;
  CertCal_garantirTabela_(CNDQ_SHEETS.SUGESTAO, [
    'ID', 'CHAVE', 'ORIGEM_MODULO', 'ORIGEM_TIPO', 'ORIGEM_ID', 'ORIGEM_ROTULO', 'ORIGEM_TELA', 'ORIGEM_LINK',
    'COLABORADOR_ID', 'COLABORADOR_NOME', 'DATA_FATO', 'TIPO_CODIGO', 'TITULO', 'DETALHE', 'INFORMATIVA',
    'STATUS', 'DETECTADA_EM', 'DECIDIDA_POR_ID', 'DECIDIDA_POR_NOME', 'DECIDIDA_EM', 'MOTIVO', 'OCORRENCIA_ID', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(CNDQ_SHEETS.ANALISE, [
    'ID', 'OCORRENCIA_ID', 'TIPO_CODIGO', 'AREA', 'PROBLEMA', 'PORQUES_JSON', 'CAUSA_RAIZ', 'ISHIKAWA_JSON',
    'REGISTRADO_POR_ID', 'REGISTRADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'
  ]);
  CertCal_garantirTabela_(CNDQ_SHEETS.PLANO, [
    'ID', 'CODIGO', 'TITULO', 'ORIGEM_TIPO', 'OCORRENCIA_ID', 'TIPO_CODIGO', 'AREA', 'ANALISE_ID',
    'O_QUE', 'POR_QUE', 'ONDE', 'QUANDO', 'QUEM_ID', 'QUEM_NOME', 'COMO', 'QUANTO',
    'FASE', 'CICLO', 'ATIVIDADES_JSON', 'VERIFICACAO_TEXTO', 'EFICAZ', 'VERIFICADO_EM', 'PADRONIZACAO_TEXTO',
    'CONCLUIDO_EM', 'CANCELADO_MOTIVO', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'HISTORICO_JSON', 'ATUALIZADO_EM', 'CRIADO_EM'
  ]);
  // Ocorrência ganha a descrição do fato e o vínculo com a origem (linhas antigas ficam vazias).
  ['DESCRICAO', 'ORIGEM_MODULO', 'ORIGEM_TIPO', 'ORIGEM_ID', 'ORIGEM_ROTULO', 'ORIGEM_TELA', 'ORIGEM_LINK', 'SUGESTAO_ID'].forEach(function (c) {
    CertCal_garantirColuna_(CONDUTA_SHEETS.OCORRENCIA, c);
  });
  ['DATA_FATO', 'DETECTADA_EM', 'DECIDIDA_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(CNDQ_SHEETS.SUGESTAO, c); });
  ['QUANDO', 'VERIFICADO_EM', 'CONCLUIDO_EM', 'ATUALIZADO_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(CNDQ_SHEETS.PLANO, c); });
  SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {};
  props.setProperty('CONDUTA_QUALIDADE_V1', '1');
}

function Cndq_ler_(aba) {
  try { if (!SGO_DATA.getDB().getSheetByName(aba)) return []; } catch (e) { return []; }
  return SGO_DATA.getAll(aba);
}

function Cndq_json_(txt, padrao) {
  try { var v = JSON.parse(String(txt || '')); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; }
}

/** "dd/mm/aaaa", "aaaa-mm-dd(...)" ou Date -> "aaaa-mm-dd" ('' se ilegível). */
function Cndq_iso_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Conduta_formatarDataISO_(v);
  var s = String(v || '').trim();
  var br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) return br[3] + '-' + br[2] + '-' + br[1];
  var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? iso[0] : '';
}

function Cndq_menosDias_(dias) {
  var d = new Date(); d.setDate(d.getDate() - dias);
  return Conduta_formatarDataISO_(d);
}

/** Dias úteis entre duas datas (b depois de a = positivo). Mesmo calendário do programa (sem feriados). */
function Cndq_diasUteisEntre_(a, b) {
  var ini = Conduta_parseDataISO_(Conduta_soData_(a)), fim = Conduta_parseDataISO_(Conduta_soData_(b));
  if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim <= ini) return 0;
  var n = 0, d = new Date(ini.getTime());
  while (d < fim) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

function Cndq_usuarios_() {
  var m = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { m[String(u.ID)] = u; });
  return m;
}

/** Área do colaborador para o Programa de conduta: { codigo, nome } (fonte: CAD_USUARIOS.AREA). */
function Conduta_areaColaborador_(u, nomes) {
  if (typeof SGO_areaDoUsuario_ !== 'function') return { codigo: '', nome: 'Sem área definida' };
  return SGO_areaDoUsuario_(u, nomes);
}

function Cndq_nomesAreas_() {
  try { if (typeof Areas_garantir_ === 'function') Areas_garantir_(); return Areas_mapaNomes_(); } catch (e) { return {}; }
}

function Cndq_pessoa_(sessao) { return { id: String(sessao.userId || ''), nome: String(sessao.nome || sessao.usuario || ''), perfil: SGO_UTILS.safeUpper(sessao.perfil) }; }

function Cndq_exigirConsulta_(sessionId) {
  var s = Conduta_exigirEquipe_(sessionId);
  if (!Conduta_podeConsultarTodos_(sessionId)) {
    throw new Error('Esta parte do Programa de conduta (sugestões, planos de ação e indicadores) é da gestão e do RH. Suas ocorrências estão na aba Ocorrências.');
  }
  return s;
}

// ------------------------------------------------------------
// SUGESTÕES — COLETORES (só leitura nas origens)
// Cada coletor devolve candidatos { chave, origem, tipo, origemId, rotulo,
// link, colaboradorId, dataFato, tipoCodigo, titulo, detalhe, informativa,
// resolvivel }. "resolvivel": se a origem sumir da lista (KM conferido,
// O.S. finalizada, ciência dada), a sugestão pendente vira SUPERADA.
// ------------------------------------------------------------
function Cndq_coletarFrota_(usuarios, desde, avisos) {
  var saida = [];
  var condutores = {};
  Cndq_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[String(c.ID)] = c; });
  var usuarioDoCondutor = function (id) { var c = condutores[String(id || '')]; return c ? SGO_UTILS.safe(c.USUARIO_ID) : ''; };
  var veiculos = {};
  Cndq_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veiculos[String(v.ID)] = SGO_UTILS.safe(v.PLACA); });

  // Multas com condutor identificado (ENCONTRADO ou indicado pela gestão). As
  // ambíguas continuam na central como "multa sem condutor definido".
  var semUsuario = 0;
  Cndq_ler_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function (m) {
    if (SGO_UTILS.safe(m.EXCLUIDO_EM) || SGO_UTILS.safeUpper(m.STATUS) === 'CANCELADA') return;
    var cruz = SGO_UTILS.safeUpper(m.STATUS_CRUZAMENTO);
    if (cruz !== 'ENCONTRADO' && cruz !== 'MANUAL') return;
    var data = Cndq_iso_(m.DATA_INFRACAO);
    if (!data || data < desde) return;
    var uid = usuarioDoCondutor(m.CONDUTOR_ID);
    if (!uid) { semUsuario++; return; }
    saida.push({ chave: 'FROTA|MULTA|' + m.ID, origem: 'FROTA', tipo: 'MULTA', origemId: String(m.ID), colaboradorId: uid, dataFato: data, tipoCodigo: 'VEI-06',
      rotulo: 'Multa ' + (veiculos[String(m.VEICULO_ID)] || '') + ' em ' + Conduta_dataBr_(data),
      titulo: 'Multa de trânsito do veículo ' + (veiculos[String(m.VEICULO_ID)] || '') + ' (' + Conduta_dataBr_(data) + ')',
      detalhe: [SGO_UTILS.safe(m.DESCRICAO), SGO_UTILS.safe(m.LOCAL), m.NUMERO_AIT ? 'AIT ' + m.NUMERO_AIT : ''].filter(Boolean).join(' · ') +
        '. Condutor ' + (cruz === 'MANUAL' ? 'indicado pela gestão' : 'identificado pela retirada do veículo') + '.' });
  });
  if (semUsuario) avisos.push(semUsuario + ' multa(s) com condutor sem login no SGO+ não viraram sugestão (ligue o condutor a um usuário em Frota > Condutores).');

  Cndq_ler_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (mv) {
    var dataCheg = Cndq_iso_(mv.DATA_CHEGADA), dataSai = Cndq_iso_(mv.DATA_SAIDA);
    var uid = usuarioDoCondutor(mv.CONDUTOR_ID) || SGO_UTILS.safe(mv.REGISTRADO_SAIDA_POR_ID);
    if (!uid) return;
    var placa = veiculos[String(mv.VEICULO_ID)] || '';
    // Avaria: item do checklist que estava em ordem na retirada e voltou com problema.
    if (dataCheg && dataCheg >= desde) {
      var saidaCk = Cndq_json_(mv.CHECKLIST_SAIDA_JSON, []), chegadaCk = Cndq_json_(mv.CHECKLIST_CHEGADA_JSON, []);
      var okSaida = {};
      (Array.isArray(saidaCk) ? saidaCk : []).forEach(function (i) { okSaida[String(i.grupo) + '|' + String(i.item)] = i.ok !== false; });
      var novos = (Array.isArray(chegadaCk) ? chegadaCk : []).filter(function (i) { var k = String(i.grupo) + '|' + String(i.item); return i.ok === false && okSaida[k] !== false; });
      if (novos.length) {
        saida.push({ chave: 'FROTA|AVARIA|' + mv.ID, origem: 'FROTA', tipo: 'AVARIA', origemId: String(mv.ID), colaboradorId: uid, dataFato: dataCheg, tipoCodigo: 'VEI-08',
          rotulo: 'Devolução do ' + placa + ' em ' + Conduta_dataBr_(dataCheg),
          titulo: 'Avaria na devolução do veículo ' + placa + ' (' + Conduta_dataBr_(dataCheg) + ')',
          detalhe: 'Itens em ordem na retirada e com problema na devolução: ' + novos.map(function (i) { return i.item + (i.observacao ? ' (' + i.observacao + ')' : ''); }).join('; ') +
            '. VEI-08 é para dano por imprudência: se foi desgaste ou acidente sem culpa, descarte com o motivo.' });
      }
      // Devolução registrada pela gestão no lugar do condutor (check de retorno não feito).
      if (SGO_UTILS.safeUpper(mv.REGISTRO_GESTAO_CHEGADA) === 'SIM') {
        saida.push({ chave: 'FROTA|DEVOLUCAO_GESTAO|' + mv.ID, origem: 'FROTA', tipo: 'DEVOLUCAO_PELA_GESTAO', origemId: String(mv.ID), colaboradorId: uid, dataFato: dataCheg, tipoCodigo: 'VEI-04',
          rotulo: 'Devolução do ' + placa + ' em ' + Conduta_dataBr_(dataCheg),
          titulo: 'Devolução do veículo ' + placa + ' registrada pela gestão no lugar do condutor',
          detalhe: 'Justificativa da gestão: ' + (SGO_UTILS.safe(mv.JUSTIFICATIVA_CHEGADA) || SGO_UTILS.safe(mv.MOTIVO_GESTAO_CHEGADA) || 'não informada') + '.' });
      }
    }
    if (dataSai && dataSai >= desde && SGO_UTILS.safeUpper(mv.REGISTRO_GESTAO_SAIDA) === 'SIM') {
      saida.push({ chave: 'FROTA|RETIRADA_GESTAO|' + mv.ID, origem: 'FROTA', tipo: 'RETIRADA_PELA_GESTAO', origemId: String(mv.ID), colaboradorId: uid, dataFato: dataSai, tipoCodigo: 'VEI-04',
        rotulo: 'Retirada do ' + placa + ' em ' + Conduta_dataBr_(dataSai),
        titulo: 'Retirada do veículo ' + placa + ' registrada pela gestão no lugar do condutor',
        detalhe: 'Justificativa da gestão: ' + (SGO_UTILS.safe(mv.JUSTIFICATIVA_SAIDA) || SGO_UTILS.safe(mv.MOTIVO_GESTAO_SAIDA) || 'não informada') + '.' });
    }
  });

  // KM a conferir (some da lista quando a gestão confere: a sugestão vira SUPERADA).
  if (typeof Frota_kmAConferir_ === 'function') {
    try {
      Frota_kmAConferir_().forEach(function (k) {
        var data = Cndq_iso_(k.data);
        if (!k.condutorUsuarioId || !data || data < desde) return;
        saida.push({ chave: 'FROTA|KM|' + k.movimentacaoId + '|' + k.etapa, origem: 'FROTA', tipo: 'KM_A_CONFERIR', origemId: String(k.movimentacaoId), colaboradorId: k.condutorUsuarioId,
          dataFato: data, tipoCodigo: 'VEI-04', resolvivel: true,
          rotulo: 'KM a conferir do ' + (k.placa || '') + ' em ' + Conduta_dataBr_(data),
          titulo: 'KM a conferir: ' + (k.placa || '') + ' (' + Conduta_dataBr_(data) + ')',
          detalhe: String(k.motivo || '') + '. Confira a foto do painel em Frota > Situação e retiradas > KM a conferir antes de decidir; se o KM estiver certo, descarte.' });
      });
    } catch (e) { avisos.push('KM a conferir da Frota não foi lido: ' + String((e && e.message) || e)); }
  }
  return saida;
}

function Cndq_coletarAuvo_(usuarios, desde, avisos) {
  var saida = [], semVinculo = 0;
  var dataTarefa = function (v) { return Cndq_iso_(v); };
  Cndq_ler_(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function (t) {
    if (SGO_UTILS.safeUpper(t.FINALIZADA) !== 'SIM') return;
    var data = dataTarefa(t.DATA_TAREFA);
    if (!data || data < desde) return;
    var motivos = typeof QualidadeAuvo_motivosTarefa_ === 'function' ? QualidadeAuvo_motivosTarefa_(t, { semVinculo: false }) : [];
    var semFoto = motivos.indexOf('foto ausente') >= 0, semRelato = motivos.indexOf('relato ausente') >= 0, semCheckout = motivos.indexOf('check-out ausente') >= 0;
    if (!semFoto && !semRelato && !semCheckout) return;
    var uid = SGO_UTILS.safe(t.TECNICO_ID_SGO);
    if (!uid) { semVinculo++; return; }
    var base = { origem: 'AUVO', origemId: String(t.AUVO_TASK_ID || t.ID), colaboradorId: uid, dataFato: data, link: SGO_UTILS.safe(t.TASK_URL),
      rotulo: 'O.S. ' + (t.AUVO_TASK_ID || '') + ' de ' + Conduta_dataBr_(data) + (t.CLIENTE_NOME_AUVO ? ' (' + t.CLIENTE_NOME_AUVO + ')' : '') };
    if (semFoto) saida.push(Object.assign({ chave: 'AUVO|SEM_FOTO|' + base.origemId, tipo: 'OS_SEM_FOTO', tipoCodigo: 'CAM-01',
      titulo: 'O.S. finalizada sem foto (' + Conduta_dataBr_(data) + ')', detalhe: 'O.S. ' + base.origemId + ' finalizada no Auvo sem nenhuma foto de evidência.' }, base));
    if (semRelato) saida.push(Object.assign({ chave: 'AUVO|SEM_RELATO|' + base.origemId, tipo: 'OS_SEM_RELATO', tipoCodigo: 'CAM-02',
      titulo: 'O.S. finalizada sem relato do serviço (' + Conduta_dataBr_(data) + ')', detalhe: 'O.S. ' + base.origemId + ' finalizada no Auvo sem o relato do serviço.' }, base));
    if (semCheckout) saida.push(Object.assign({ chave: 'AUVO|SEM_CHECKOUT|' + base.origemId, tipo: 'CHECKOUT_ESQUECIDO', tipoCodigo: 'CAM-02',
      titulo: 'O.S. finalizada sem check-out (' + Conduta_dataBr_(data) + ')', detalhe: 'O.S. ' + base.origemId + ' finalizada sem o check-out: o tempo de atendimento não fica registrado.' }, base));
  });
  // O.S. aberta há 3 dias ou mais (check-out esquecido): some quando é finalizada.
  Cndq_ler_(SGO_CFG.SHEETS.AUVO_PENDENCIAS).forEach(function (p) {
    var dias = Number(p.DIAS_ABERTA) || 0, uid = SGO_UTILS.safe(p.TECNICO_ID_SGO), data = Cndq_iso_(p.TASK_DATE);
    if (dias < 3 || !data || data < desde) return;
    if (!uid) { semVinculo++; return; }
    saida.push({ chave: 'AUVO|ABERTA|' + p.AUVO_TASK_ID, origem: 'AUVO', tipo: 'OS_ABERTA', origemId: String(p.AUVO_TASK_ID), colaboradorId: uid, dataFato: data,
      tipoCodigo: 'CAM-02', resolvivel: true, link: SGO_UTILS.safe(p.TASK_URL),
      rotulo: 'O.S. ' + p.AUVO_TASK_ID + ' aberta há ' + dias + ' dias',
      titulo: 'O.S. aberta há ' + dias + ' dias no Auvo (check-out esquecido?)',
      detalhe: (p.CLIENTE_NOME ? p.CLIENTE_NOME + '. ' : '') + 'Agendada para ' + Conduta_dataBr_(data) + (SGO_UTILS.safeUpper(p.TEM_EVIDENCIA) === 'SIM' ? ', com evidência registrada.' : ', sem evidência.') });
  });
  if (semVinculo) avisos.push(semVinculo + ' O.S. do Auvo sem técnico ligado ao SGO+ não viraram sugestão (vincule o técnico em Integração Auvo).');
  return saida;
}

/** Cobranças do Painel de qualidade (reclamação de cliente ou da gestão sobre técnico/condutor). */
function Cndq_coletarQualidade_(usuarios, desde, avisos) {
  var saida = [];
  var aba = typeof QUALIDADE_OCORRENCIAS_SHEET !== 'undefined' ? QUALIDADE_OCORRENCIAS_SHEET : 'QUALIDADE_OCORRENCIAS';
  var condutores = {};
  Cndq_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[String(c.ID)] = c; });
  Cndq_ler_(aba).forEach(function (q) {
    if (SGO_UTILS.safeUpper(q.TIPO) !== 'COBRANCA') return;
    var data = Cndq_iso_(q.CRIADO_EM);
    if (!data || data < desde) return;
    var pt = SGO_UTILS.safeUpper(q.PESSOA_TIPO), uid = '';
    if (pt === 'TECNICO' || pt === 'PESSOA') uid = usuarios[String(q.PESSOA_ID)] ? String(q.PESSOA_ID) : '';
    if (pt === 'CONDUTOR') uid = SGO_UTILS.safe((condutores[String(q.PESSOA_ID)] || {}).USUARIO_ID);
    if (!uid) return;
    saida.push({ chave: 'QUALIDADE|COBRANCA|' + q.ID, origem: 'QUALIDADE', tipo: 'RECLAMACAO', origemId: String(q.ID), colaboradorId: uid, dataFato: data, tipoCodigo: 'CAM-08',
      rotulo: 'Cobrança de ' + Conduta_dataBr_(data) + (q.AREA ? ' (' + q.AREA + ')' : ''),
      titulo: 'Cobrança registrada no Painel de qualidade (' + Conduta_dataBr_(data) + ')',
      detalhe: SGO_UTILS.safe(q.DESCRICAO).slice(0, 400) + ' CAM-08 vale para reclamação PROCEDENTE do cliente; se não foi procedente ou não veio do cliente, escolha outro código ou descarte.' });
  });
  return saida;
}

/** Atraso recorrente em Minhas atividades: 3 ou mais atividades atrasadas no mês para a mesma pessoa. */
function Cndq_coletarAtividades_(usuarios, desde, avisos) {
  var saida = [];
  if (typeof Atividades_todas_ !== 'function' || typeof Atividades_abas_ !== 'function') return saida;
  var linhas = Cndq_ler_(Atividades_abas_().ATIVIDADES);
  if (!linhas.length) return saida;
  var agora = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : Conduta_hojeISO_() + 'T23:59';
  var porPessoaMes = {};
  linhas.map(Atividades_limpar_).forEach(function (a) {
    if (a.SITUACAO === 'Cancelada' || !a.RESPONSAVEL_ID || !a.PRAZO) return;
    var atrasada = a.SITUACAO === 'Concluída' ? (a.CONCLUIDA_EM && a.CONCLUIDA_EM > a.PRAZO) : a.PRAZO < agora;
    if (!atrasada) return;
    var dia = a.PRAZO.substring(0, 10);
    if (dia < desde) return;
    var k = a.RESPONSAVEL_ID + '|' + dia.substring(0, 7);
    (porPessoaMes[k] = porPessoaMes[k] || []).push(a);
  });
  Object.keys(porPessoaMes).forEach(function (k) {
    var lista = porPessoaMes[k];
    if (lista.length < CNDQ_ATRASO_RECORRENTE_MIN) return;
    var uid = k.split('|')[0], comp = k.split('|')[1];
    lista.sort(function (a, b) { return a.PRAZO.localeCompare(b.PRAZO); });
    var ultima = lista[lista.length - 1].PRAZO.substring(0, 10);
    saida.push({ chave: 'ATIVIDADES|ATRASO|' + k, origem: 'ATIVIDADES', tipo: 'ATRASO_RECORRENTE', origemId: uid + '|' + comp, colaboradorId: uid,
      dataFato: ultima > Conduta_hojeISO_() ? Conduta_hojeISO_() : ultima, tipoCodigo: '',
      rotulo: lista.length + ' atividades atrasadas em ' + Conduta_nomeCompetencia_(comp),
      titulo: 'Atraso recorrente em Minhas atividades: ' + lista.length + ' atividades em ' + Conduta_nomeCompetencia_(comp),
      detalhe: lista.slice(0, 6).map(function (a) { return '"' + a.TITULO + '" (prazo ' + Conduta_dataBr_(a.PRAZO) + (a.QTD_JUSTIFICATIVAS ? ', ' + a.QTD_JUSTIFICATIVAS + ' justificativa(s)' : '') + ')'; }).join('; ') +
        (lista.length > 6 ? '; e mais ' + (lista.length - 6) : '') + '. O catálogo não tem código próprio para atraso de atividade: escolha o código que se aplica ou descarte.' });
  });
  return saida;
}

/** Ciência pendente em Avisos: prazo de ciência vencido há 2 dias úteis ou mais. Some quando a pessoa confirma. */
function Cndq_coletarAvisos_(usuarios, desde, avisos) {
  var saida = [];
  var abaA = SGO_CFG.SHEETS.AVS_AVISOS || 'AVS_AVISOS', abaC = SGO_CFG.SHEETS.AVS_CIENCIA || 'AVS_CIENCIA';
  var lista = Cndq_ler_(abaA);
  if (!lista.length) return saida;
  var ciente = {};
  Cndq_ler_(abaC).forEach(function (c) { if (SGO_UTILS.safe(c.CIENTE_EM)) ciente[String(c.AVISO_ID) + '|' + String(c.USUARIO_ID)] = 1; });
  var hoje = Conduta_hojeISO_();
  lista.forEach(function (a) {
    if (SGO_UTILS.safeUpper(a.SITUACAO) !== 'PUBLICADO') return;
    var prazo = Cndq_iso_(a.PRAZO_CIENCIA);
    if (!prazo || prazo < desde || Conduta_somarDiasUteis_(prazo, 2) > hoje) return;
    String(a.DESTINATARIOS_IDS || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (uid) {
      if (ciente[String(a.ID) + '|' + uid] || !usuarios[uid]) return;
      saida.push({ chave: 'AVISOS|CIENCIA|' + a.ID + '|' + uid, origem: 'AVISOS', tipo: 'CIENCIA_PENDENTE', origemId: String(a.ID), colaboradorId: uid, dataFato: prazo,
        tipoCodigo: '', resolvivel: true,
        rotulo: 'Aviso "' + SGO_UTILS.safe(a.TITULO).slice(0, 60) + '"',
        titulo: 'Ciência pendente do aviso "' + SGO_UTILS.safe(a.TITULO).slice(0, 80) + '"',
        detalhe: 'O prazo de ciência era ' + Conduta_dataBr_(prazo) + ' e a pessoa ainda não confirmou a leitura. Antes de registrar, confira em Avisos se ela viu o aviso e reenvie se for o caso.' });
    });
  });
  return saida;
}

/**
 * Grava os candidatos novos (CHAVE única: o que já foi sugerido, aceito ou
 * descartado nunca volta) e marca SUPERADA a sugestão pendente cuja origem
 * resolvível saiu da lista. Devolve o resumo da coleta.
 */
function Conduta_coletarSugestoes_(quem) {
  Conduta_setup_();
  var usuarios = Cndq_usuarios_();
  var desde = Cndq_menosDias_(CNDQ_JANELA_DIAS);
  var avisos = [], candidatos = [], porOrigem = {};
  var fontes = [['FROTA', Cndq_coletarFrota_], ['AUVO', Cndq_coletarAuvo_], ['QUALIDADE', Cndq_coletarQualidade_], ['ATIVIDADES', Cndq_coletarAtividades_], ['AVISOS', Cndq_coletarAvisos_]];
  fontes.forEach(function (f) {
    try { var c = f[1](usuarios, desde, avisos) || []; porOrigem[f[0]] = c.length; candidatos = candidatos.concat(c); }
    catch (e) { avisos.push(CNDQ_ORIGENS[f[0]].nome + ': não foi possível ler (' + String((e && e.message) || e) + ').'); porOrigem[f[0]] = 0; }
  });
  var existentes = Cndq_ler_(CNDQ_SHEETS.SUGESTAO);
  var porChave = {};
  existentes.forEach(function (s) { porChave[String(s.CHAVE)] = s; });
  var agora = SGO_UTILS.nowIso(), hoje = Conduta_hojeISO_(), novas = [], vistas = {};
  candidatos.forEach(function (c) {
    vistas[c.chave] = 1;
    if (porChave[c.chave]) return;
    var u = usuarios[String(c.colaboradorId)];
    if (!u || SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE' || Conduta_ehContaGenerica_(u)) return;
    var o = CNDQ_ORIGENS[c.origem] || { nome: c.origem, tela: '' };
    novas.push({ CHAVE: c.chave, ORIGEM_MODULO: c.origem, ORIGEM_TIPO: c.tipo, ORIGEM_ID: c.origemId, ORIGEM_ROTULO: c.rotulo || '', ORIGEM_TELA: o.tela, ORIGEM_LINK: c.link || '',
      COLABORADOR_ID: String(c.colaboradorId), COLABORADOR_NOME: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), DATA_FATO: c.dataFato, TIPO_CODIGO: c.tipoCodigo || '',
      TITULO: String(c.titulo || '').slice(0, 200), DETALHE: String(c.detalhe || '').slice(0, 1500), INFORMATIVA: c.informativa ? 'SIM' : '',
      STATUS: 'PENDENTE', DETECTADA_EM: hoje, RESOLVIVEL: c.resolvivel ? 'SIM' : '' });
    porChave[c.chave] = 1;
  });
  if (novas.length) SGO_DATA.insertMany(CNDQ_SHEETS.SUGESTAO, novas.map(function (n) { var r = Object.assign({}, n); delete r.RESOLVIVEL; return r; }));
  // Origem resolvida: KM conferido, O.S. finalizada, ciência dada.
  var superadas = 0;
  existentes.forEach(function (s) {
    if (SGO_UTILS.safeUpper(s.STATUS) !== 'PENDENTE' || vistas[String(s.CHAVE)]) return;
    var t = SGO_UTILS.safeUpper(s.ORIGEM_TIPO);
    if (t !== 'KM_A_CONFERIR' && t !== 'OS_ABERTA' && t !== 'CIENCIA_PENDENTE') return;
    SGO_DATA.update(CNDQ_SHEETS.SUGESTAO, s.ID, { STATUS: 'SUPERADA', DECIDIDA_EM: agora, DECIDIDA_POR_NOME: 'Sistema',
      MOTIVO: 'A origem foi resolvida em ' + Conduta_dataBr_(hoje) + ' (' + (t === 'KM_A_CONFERIR' ? 'KM conferido pela gestão' : t === 'OS_ABERTA' ? 'O.S. finalizada' : 'ciência confirmada') + ').' });
    superadas++;
  });
  PropertiesService.getScriptProperties().setProperty(CNDQ_COLETA_PROP, agora);
  var r = { novas: novas.length, superadas: superadas, porOrigem: porOrigem, avisos: avisos, em: agora };
  if (novas.length || superadas) SGO_DATA.log('CONDUTA_SUGESTOES_COLETA', quem || 'sistema', novas.length + ' sugestão(ões) nova(s), ' + superadas + ' superada(s). ' + avisos.join(' ').slice(0, 600), 'CONDUTA');
  return r;
}

/** Coleta no máximo a cada 3 horas quando alguém abre a lista (a rotina diária também coleta). */
function Cndq_coletarSeAntigo_(quem) {
  var ultima = PropertiesService.getScriptProperties().getProperty(CNDQ_COLETA_PROP) || '';
  if (ultima && (Date.now() - new Date(ultima).getTime()) < CNDQ_COLETA_HORAS * 3600000) return null;
  try { return Conduta_coletarSugestoes_(quem); } catch (e) { SGO_DATA.log('CONDUTA_SUGESTOES_FALHA', quem || 'sistema', String((e && e.message) || e), 'CONDUTA'); return null; }
}

// ------------------------------------------------------------
// SUGESTÕES — API
// ------------------------------------------------------------
function Cndq_sugestaoParaTela_(s, usuarios, nomesAreas, podeDecidir, sessao) {
  var u = usuarios[String(s.COLABORADOR_ID)] || {};
  var ar = Conduta_areaColaborador_(u, nomesAreas);
  var o = CNDQ_ORIGENS[SGO_UTILS.safeUpper(s.ORIGEM_MODULO)] || { nome: SGO_UTILS.safe(s.ORIGEM_MODULO), tela: '' };
  var status = SGO_UTILS.safeUpper(s.STATUS);
  var envolvido = String(s.COLABORADOR_ID) === String(sessao.userId);
  return {
    ID: String(s.ID), STATUS: status, ORIGEM_MODULO: SGO_UTILS.safeUpper(s.ORIGEM_MODULO), ORIGEM_NOME: o.nome, ORIGEM_TIPO: SGO_UTILS.safeUpper(s.ORIGEM_TIPO),
    ORIGEM_ID: SGO_UTILS.safe(s.ORIGEM_ID), ORIGEM_ROTULO: SGO_UTILS.safe(s.ORIGEM_ROTULO), ORIGEM_TELA: SGO_UTILS.safe(s.ORIGEM_TELA) || o.tela, ORIGEM_LINK: SGO_UTILS.safe(s.ORIGEM_LINK),
    COLABORADOR_ID: String(s.COLABORADOR_ID), COLABORADOR_NOME: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(s.COLABORADOR_NOME), AREA: ar.codigo, AREA_NOME: ar.nome,
    DATA_FATO: Conduta_soData_(s.DATA_FATO), DETECTADA_EM: Conduta_soData_(s.DETECTADA_EM), TIPO_CODIGO: SGO_UTILS.safeUpper(s.TIPO_CODIGO),
    TITULO: SGO_UTILS.safe(s.TITULO), DETALHE: SGO_UTILS.safe(s.DETALHE), INFORMATIVA: SGO_UTILS.safeUpper(s.INFORMATIVA) === 'SIM',
    DECIDIDA_POR_NOME: SGO_UTILS.safe(s.DECIDIDA_POR_NOME), DECIDIDA_EM: SGO_UTILS.safe(s.DECIDIDA_EM).substring(0, 10), MOTIVO: SGO_UTILS.safe(s.MOTIVO), OCORRENCIA_ID: SGO_UTILS.safe(s.OCORRENCIA_ID),
    // A pessoa envolvida não decide a sugestão sobre ela mesma (mesma regra da homologação).
    PODE_DECIDIR: podeDecidir && status === 'PENDENTE' && !envolvido,
    SOU_O_ENVOLVIDO: envolvido
  };
}

function Conduta_apiListarSugestoes(sessionId, payload) {
  var sessao = Cndq_exigirConsulta_(sessionId);
  payload = payload || {};
  var coleta = Cndq_coletarSeAntigo_(sessao.usuario);
  var usuarios = Cndq_usuarios_(), nomes = Cndq_nomesAreas_();
  var podeDecidir = isAdminSession(sessionId);
  var filtro = SGO_UTILS.safeUpper(payload.status || 'PENDENTE');
  var todas = Cndq_ler_(CNDQ_SHEETS.SUGESTAO);
  var contagem = { PENDENTE: 0, ACEITA: 0, DESCARTADA: 0, SUPERADA: 0 };
  todas.forEach(function (s) { var st = SGO_UTILS.safeUpper(s.STATUS); if (contagem[st] !== undefined) contagem[st]++; });
  var itens = todas.filter(function (s) { return filtro === 'TODAS' || SGO_UTILS.safeUpper(s.STATUS) === filtro; })
    .map(function (s) { return Cndq_sugestaoParaTela_(s, usuarios, nomes, podeDecidir, sessao); })
    .filter(function (s) { return !payload.area || s.AREA === SGO_UTILS.safeUpper(payload.area) || (payload.area === '-' && !s.AREA); })
    .sort(function (a, b) { return b.DATA_FATO.localeCompare(a.DATA_FATO); });
  return {
    ok: true, itens: itens, contagem: contagem, podeDecidir: podeDecidir,
    ultimaColeta: PropertiesService.getScriptProperties().getProperty(CNDQ_COLETA_PROP) || '',
    coleta: coleta, regraPrazo: Conduta_regraPrazoSugestao_()
  };
}

function Conduta_apiColetarSugestoesAgora(sessionId) {
  var sessao = Conduta_exigirGestor_(sessionId);
  var r = Conduta_coletarSugestoes_(sessao.usuario);
  r.ok = true;
  r.message = (r.novas ? r.novas + ' sugestão(ões) nova(s).' : 'Nenhuma sugestão nova.') + (r.superadas ? ' ' + r.superadas + ' sugestão(ões) saíram da fila porque a origem foi resolvida.' : '');
  return r;
}

/** Regra do prazo de registro para sugestão (decisão pendente do dono; ver docs/CONDUTA_PENTE_FINO_QUALIDADE_20261019.md). */
function Conduta_regraPrazoSugestao_() {
  var p = Conduta_obterParametros_();
  var pelaDescoberta = String(p.SUGESTAO_PRAZO_PELA_DESCOBERTA === undefined ? '1' : p.SUGESTAO_PRAZO_PELA_DESCOBERTA).trim() !== '0';
  return { pelaDescoberta: pelaDescoberta, dias: Number(p.PRAZO_REGISTRO_DIAS_UTEIS) || 2,
    texto: pelaDescoberta
      ? 'O prazo de registro (' + (Number(p.PRAZO_REGISTRO_DIAS_UTEIS) || 2) + ' dias úteis) conta da data em que o SGO+ encontrou o caso, porque multas e falhas de registro chegam depois do fato.'
      : 'O prazo de registro (' + (Number(p.PRAZO_REGISTRO_DIAS_UTEIS) || 2) + ' dias úteis) conta da data do fato, como no registro manual.' };
}

function Conduta_apiAceitarSugestao(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var s = SGO_DATA.getById(CNDQ_SHEETS.SUGESTAO, String(payload.id || ''));
  if (!s) throw new Error('A sugestão não foi encontrada: atualize a lista de sugestões.');
  if (SGO_UTILS.safeUpper(s.STATUS) !== 'PENDENTE') throw new Error('Esta sugestão já foi decidida (' + SGO_UTILS.safe(s.STATUS).toLowerCase() + ' por ' + (SGO_UTILS.safe(s.DECIDIDA_POR_NOME) || 'outra pessoa') + '). Atualize a lista.');
  var colaboradorId = String(payload.colaboradorId || s.COLABORADOR_ID || '');
  if (colaboradorId === String(sessao.userId)) throw new Error('A sugestão é sobre você: peça a outra pessoa da gestão para decidir.');
  var tipoCodigo = SGO_UTILS.safeUpper(payload.tipoCodigo || s.TIPO_CODIGO);
  if (!tipoCodigo) throw new Error('Escolha o código da ocorrência no catálogo antes de aceitar (esta origem não tem código sugerido).');
  var descricao = String(payload.descricao || '').trim() || (SGO_UTILS.safe(s.TITULO) + '. ' + SGO_UTILS.safe(s.DETALHE));
  var regra = Conduta_regraPrazoSugestao_();
  var o = CNDQ_ORIGENS[SGO_UTILS.safeUpper(s.ORIGEM_MODULO)] || { nome: s.ORIGEM_MODULO };
  var r = Conduta_registrarOcorrencia_(sessao, {
    tipoCodigo: tipoCodigo, colaboradorId: colaboradorId, dataFato: String(payload.dataFato || Conduta_soData_(s.DATA_FATO)),
    descricao: descricao, fotoUrl: '', fotoLegenda: ''
  }, {
    dataBasePrazo: regra.pelaDescoberta ? Conduta_soData_(s.DETECTADA_EM) : '',
    origem: { ORIGEM_MODULO: SGO_UTILS.safeUpper(s.ORIGEM_MODULO), ORIGEM_TIPO: SGO_UTILS.safeUpper(s.ORIGEM_TIPO), ORIGEM_ID: SGO_UTILS.safe(s.ORIGEM_ID),
      ORIGEM_ROTULO: o.nome + ': ' + SGO_UTILS.safe(s.ORIGEM_ROTULO), ORIGEM_TELA: SGO_UTILS.safe(s.ORIGEM_TELA), ORIGEM_LINK: SGO_UTILS.safe(s.ORIGEM_LINK), SUGESTAO_ID: String(s.ID) }
  });
  SGO_DATA.update(CNDQ_SHEETS.SUGESTAO, s.ID, { STATUS: 'ACEITA', DECIDIDA_POR_ID: sessao.userId, DECIDIDA_POR_NOME: sessao.nome || sessao.usuario,
    DECIDIDA_EM: SGO_UTILS.nowIso(), OCORRENCIA_ID: r.item.ID, MOTIVO: String(payload.motivo || '').trim() });
  SGO_DATA.log('CONDUTA_SUGESTAO_ACEITA', sessao.usuario, 'Sugestão ' + s.ID + ' (' + s.ORIGEM_MODULO + '/' + s.ORIGEM_TIPO + ', origem ' + s.ORIGEM_ID + ') virou a ocorrência ' + r.item.ID + ' (' + tipoCodigo + ')', 'CONDUTA');
  return { success: true, ocorrenciaId: r.item.ID,
    message: 'Ocorrência registrada com você como fiscal. Ela segue o fluxo normal: outra pessoa da gestão homologa (Ocorrências), e o colaborador pode contestar.' };
}

function Conduta_apiDescartarSugestao(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var s = SGO_DATA.getById(CNDQ_SHEETS.SUGESTAO, String(payload.id || ''));
  if (!s) throw new Error('A sugestão não foi encontrada: atualize a lista de sugestões.');
  if (SGO_UTILS.safeUpper(s.STATUS) !== 'PENDENTE') throw new Error('Esta sugestão já foi decidida. Atualize a lista.');
  if (String(s.COLABORADOR_ID) === String(sessao.userId)) throw new Error('A sugestão é sobre você: peça a outra pessoa da gestão para decidir.');
  var motivo = String(payload.motivo || '').trim();
  if (motivo.length < 10) throw new Error('Escreva por que a sugestão não vira ocorrência (pelo menos 10 caracteres), por exemplo "KM conferido, foto do painel confirma".');
  SGO_DATA.update(CNDQ_SHEETS.SUGESTAO, s.ID, { STATUS: 'DESCARTADA', DECIDIDA_POR_ID: sessao.userId, DECIDIDA_POR_NOME: sessao.nome || sessao.usuario, DECIDIDA_EM: SGO_UTILS.nowIso(), MOTIVO: motivo.slice(0, 1000) });
  SGO_DATA.log('CONDUTA_SUGESTAO_DESCARTADA', sessao.usuario, 'Sugestão ' + s.ID + ' (' + s.ORIGEM_MODULO + '/' + s.ORIGEM_TIPO + '): ' + motivo.slice(0, 300), 'CONDUTA');
  return { success: true, message: 'Sugestão descartada. Ela não volta para a fila e fica no histórico com o motivo.' };
}

/**
 * Entrada da ponte do COMMAND (SGO_PonteCommand.js, ação "conduta.sugestao"):
 * o Assistente do ponto manda o resumo do 3º esquecimento do mês. Vira
 * sugestão INFORMATIVA (sem código sugerido): a gestão lê e decide.
 * dados: { sgoUsuarioId, mes 'aaaa-mm', quantidade, texto, chave }.
 */
function Conduta_sugestaoDoPonto_(dados) {
  Conduta_setup_();
  dados = dados || {};
  var uid = SGO_UTILS.safe(dados.sgoUsuarioId);
  var u = uid ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, uid) : null;
  if (!u) return { ok: false, message: 'Pessoa sem cadastro no SGO+ (sgo_id vazio ou desconhecido).' };
  var mes = /^\d{4}-\d{2}$/.test(String(dados.mes || '')) ? String(dados.mes) : Conduta_competenciaDe_(Conduta_hojeISO_());
  var chave = 'COMMAND_PONTO|' + uid + '|' + mes + '|' + (Number(dados.quantidade) || 3);
  if (Cndq_ler_(CNDQ_SHEETS.SUGESTAO).some(function (s) { return String(s.CHAVE) === chave; })) return { ok: true, repetida: true };
  var hoje = Conduta_hojeISO_();
  SGO_DATA.insert(CNDQ_SHEETS.SUGESTAO, { CHAVE: chave, ORIGEM_MODULO: 'COMMAND_PONTO', ORIGEM_TIPO: 'PONTO_ESQUECIMENTO', ORIGEM_ID: SGO_UTILS.safe(dados.chave) || (uid + '|' + mes),
    ORIGEM_ROTULO: 'Resumo do ponto de ' + Conduta_nomeCompetencia_(mes), ORIGEM_TELA: '', ORIGEM_LINK: '',
    COLABORADOR_ID: uid, COLABORADOR_NOME: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), DATA_FATO: hoje, TIPO_CODIGO: '',
    TITULO: (Number(dados.quantidade) || 3) + ' esquecimentos de ponto em ' + Conduta_nomeCompetencia_(mes) + ' (informativo)',
    DETALHE: String(dados.texto || '').slice(0, 1200) + ' Informativo do Assistente do ponto: nenhuma medida é automática. Se houver falta de comunicação (RH-01) ou atraso recorrente (RH-02), registre; senão, descarte com o motivo.',
    INFORMATIVA: 'SIM', STATUS: 'PENDENTE', DETECTADA_EM: hoje });
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {}
  return { ok: true };
}

/** Quantas sugestões pendentes (para a central de pendências da gestão). */
function Conduta_qtdSugestoesPendentes_() {
  var n = 0;
  Cndq_ler_(CNDQ_SHEETS.SUGESTAO).forEach(function (s) { if (SGO_UTILS.safeUpper(s.STATUS) === 'PENDENTE') n++; });
  return n;
}

// ------------------------------------------------------------
// ANÁLISE DE CAUSA (5 Porquês e Ishikawa)
// ------------------------------------------------------------
var CNDQ_ISHIKAWA = ['METODO', 'MAO_DE_OBRA', 'MATERIAL', 'MAQUINA', 'MEDIDA', 'MEIO_AMBIENTE'];

function Cndq_analiseParaTela_(a) {
  return { ID: String(a.ID), OCORRENCIA_ID: SGO_UTILS.safe(a.OCORRENCIA_ID), TIPO_CODIGO: SGO_UTILS.safeUpper(a.TIPO_CODIGO), AREA: SGO_UTILS.safeUpper(a.AREA),
    PROBLEMA: SGO_UTILS.safe(a.PROBLEMA), PORQUES: Cndq_json_(a.PORQUES_JSON, []), CAUSA_RAIZ: SGO_UTILS.safe(a.CAUSA_RAIZ), ISHIKAWA: Cndq_json_(a.ISHIKAWA_JSON, {}),
    REGISTRADO_POR_NOME: SGO_UTILS.safe(a.REGISTRADO_POR_NOME), ATUALIZADO_EM: SGO_UTILS.safe(a.ATUALIZADO_EM).substring(0, 10), CRIADO_EM: SGO_UTILS.safe(a.CRIADO_EM).substring(0, 10) };
}

function Conduta_apiSalvarAnaliseCausa(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var ocorrenciaId = SGO_UTILS.safe(payload.ocorrenciaId), tipoCodigo = SGO_UTILS.safeUpper(payload.tipoCodigo);
  var oc = null;
  if (ocorrenciaId) {
    oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, ocorrenciaId);
    if (!oc) throw new Error('A ocorrência não foi encontrada: atualize a tela.');
    tipoCodigo = SGO_UTILS.safeUpper(oc.TIPO_CODIGO);
  } else if (!tipoCodigo) throw new Error('Ligue a análise a uma ocorrência ou a um código do catálogo.');
  else Conduta_buscarTipoOcorrencia_(tipoCodigo);
  var problema = String(payload.problema || '').trim();
  if (problema.length < 10) throw new Error('Descreva o problema (pelo menos 10 caracteres): o que aconteceu, onde e quantas vezes.');
  var porques = (Array.isArray(payload.porques) ? payload.porques : []).map(function (p) { return String(p || '').trim().slice(0, 500); }).filter(Boolean).slice(0, 5);
  if (porques.length < 3) throw new Error('Responda pelo menos 3 porquês (cada resposta vira a pergunta seguinte, até chegar à causa que a empresa controla).');
  var causa = String(payload.causaRaiz || '').trim();
  if (causa.length < 10) throw new Error('Escreva a causa raiz (pelo menos 10 caracteres): normalmente é a resposta do último porquê.');
  var ish = {};
  CNDQ_ISHIKAWA.forEach(function (k) { var v = String((payload.ishikawa || {})[k] || '').trim(); if (v) ish[k] = v.slice(0, 500); });
  var u = oc ? Cndq_usuarios_()[String(oc.COLABORADOR_ID)] : null;
  var area = SGO_UTILS.safeUpper(payload.area) || (u ? Conduta_areaColaborador_(u).codigo : '');
  var dados = { OCORRENCIA_ID: ocorrenciaId, TIPO_CODIGO: tipoCodigo, AREA: area, PROBLEMA: problema.slice(0, 1500), PORQUES_JSON: JSON.stringify(porques),
    CAUSA_RAIZ: causa.slice(0, 1000), ISHIKAWA_JSON: JSON.stringify(ish), REGISTRADO_POR_ID: sessao.userId, REGISTRADO_POR_NOME: sessao.nome || sessao.usuario, ATUALIZADO_EM: SGO_UTILS.nowIso() };
  var id = SGO_UTILS.safe(payload.id), item;
  if (id) {
    if (!SGO_DATA.getById(CNDQ_SHEETS.ANALISE, id)) throw new Error('A análise não foi encontrada: atualize a tela.');
    SGO_DATA.update(CNDQ_SHEETS.ANALISE, id, dados); dados.ID = id; item = dados;
  } else item = SGO_DATA.insert(CNDQ_SHEETS.ANALISE, dados);
  SGO_DATA.log('CONDUTA_ANALISE_CAUSA', sessao.usuario, (id ? 'Análise alterada ' : 'Análise registrada ') + item.ID + ' (' + (ocorrenciaId ? 'ocorrência ' + ocorrenciaId : 'código ' + tipoCodigo) + ')', 'CONDUTA');
  return { success: true, item: Cndq_analiseParaTela_(item), message: 'Análise de causa salva. Agora crie o plano de ação 5W2H para atacar a causa raiz.' };
}

// ------------------------------------------------------------
// PLANO DE AÇÃO 5W2H + PDCA (as ações são atividades de Minhas atividades)
// ------------------------------------------------------------
var CNDQ_FASES = { PLANEJAR: 'Planejar (P)', EXECUTAR: 'Executar (D)', VERIFICAR: 'Verificar (C)', AGIR: 'Agir (A)', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

function Cndq_atividadesDoPlano_(p, todas) {
  var ids = Cndq_json_(p.ATIVIDADES_JSON, []);
  var mapa = {};
  (todas || []).forEach(function (a) { mapa[String(a.ID)] = a; });
  return (Array.isArray(ids) ? ids : []).map(function (id) {
    var a = mapa[String(id)];
    return a ? { ID: a.ID, TITULO: a.TITULO, RESPONSAVEL_NOME: a.RESPONSAVEL_NOME, PRAZO: a.PREVISAO_ATUAL || a.PRAZO, SITUACAO: a.SITUACAO, CONCLUIDA_EM: a.CONCLUIDA_EM }
      : { ID: String(id), TITULO: '(atividade não encontrada)', SITUACAO: 'Cancelada' };
  });
}

function Cndq_planoParaTela_(p, todasAtv, nomesAreas, agora) {
  var acoes = Cndq_atividadesDoPlano_(p, todasAtv);
  var fase = SGO_UTILS.safeUpper(p.FASE) || 'EXECUTAR';
  var abertas = acoes.filter(function (a) { return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; });
  var quando = Conduta_soData_(p.QUANDO);
  return {
    ID: String(p.ID), CODIGO: SGO_UTILS.safe(p.CODIGO), TITULO: SGO_UTILS.safe(p.TITULO), ORIGEM_TIPO: SGO_UTILS.safeUpper(p.ORIGEM_TIPO), OCORRENCIA_ID: SGO_UTILS.safe(p.OCORRENCIA_ID),
    TIPO_CODIGO: SGO_UTILS.safeUpper(p.TIPO_CODIGO), AREA: SGO_UTILS.safeUpper(p.AREA), AREA_NOME: nomesAreas[SGO_UTILS.safeUpper(p.AREA)] || (p.AREA ? p.AREA : 'Sem área definida'), ANALISE_ID: SGO_UTILS.safe(p.ANALISE_ID),
    O_QUE: SGO_UTILS.safe(p.O_QUE), POR_QUE: SGO_UTILS.safe(p.POR_QUE), ONDE: SGO_UTILS.safe(p.ONDE), QUANDO: quando, QUEM_ID: SGO_UTILS.safe(p.QUEM_ID), QUEM_NOME: SGO_UTILS.safe(p.QUEM_NOME),
    COMO: SGO_UTILS.safe(p.COMO), QUANTO: SGO_UTILS.safe(p.QUANTO), FASE: fase, FASE_NOME: CNDQ_FASES[fase] || fase, CICLO: Number(p.CICLO) || 1,
    ACOES: acoes, ACOES_ABERTAS: abertas.length, ACOES_ATRASADAS: abertas.filter(function (a) { return a.PRAZO && a.PRAZO < agora; }).length,
    ATRASADO: (fase === 'EXECUTAR' || fase === 'PLANEJAR') && !!quando && quando < Conduta_hojeISO_(),
    VERIFICACAO_TEXTO: SGO_UTILS.safe(p.VERIFICACAO_TEXTO), EFICAZ: SGO_UTILS.safeUpper(p.EFICAZ), VERIFICADO_EM: Conduta_soData_(p.VERIFICADO_EM),
    PADRONIZACAO_TEXTO: SGO_UTILS.safe(p.PADRONIZACAO_TEXTO), CONCLUIDO_EM: Conduta_soData_(p.CONCLUIDO_EM), CANCELADO_MOTIVO: SGO_UTILS.safe(p.CANCELADO_MOTIVO),
    CRIADO_POR_NOME: SGO_UTILS.safe(p.CRIADO_POR_NOME), CRIADO_EM: SGO_UTILS.safe(p.CRIADO_EM).substring(0, 10), HISTORICO: Cndq_json_(p.HISTORICO_JSON, [])
  };
}

function Cndq_hist_(p, sessao, acao, texto) {
  var h = Cndq_json_(p && p.HISTORICO_JSON, []);
  if (!Array.isArray(h)) h = [];
  h.push({ em: SGO_UTILS.nowIso(), por: String(sessao.nome || sessao.usuario || ''), acao: acao, texto: String(texto || '').slice(0, 600) });
  return JSON.stringify(h);
}

/** Cria a atividade de uma ação do plano em Minhas atividades (módulo "conduta"). */
function Cndq_criarAtividade_(sessionId, plano, o) {
  if (typeof Atividades_apiCriar !== 'function') throw new Error('o módulo Minhas atividades não está disponível nesta instalação');
  var r = Atividades_apiCriar(sessionId, {
    titulo: (plano.CODIGO ? plano.CODIGO + ': ' : '') + String(o.oQue).slice(0, 180), descricao: String(o.descricao || '').slice(0, 3900),
    prazo: o.quando + 'T18:00', prioridade: o.prioridade || 'Alta', responsavelId: o.quemId, modulo: 'conduta', moduloNome: 'Programa de conduta'
  });
  if (!r || r.ok !== true) throw new Error((r && r.message) || 'não foi possível criar a atividade do plano');
  return r.item;
}

function Cndq_proximoCodigo_() {
  var ano = Conduta_hojeISO_().substring(0, 4), max = 0;
  Cndq_ler_(CNDQ_SHEETS.PLANO).forEach(function (p) { var m = /^PA-(\d{4})-(\d+)$/.exec(String(p.CODIGO || '')); if (m && m[1] === ano) max = Math.max(max, Number(m[2])); });
  return 'PA-' + ano + '-' + String(max + 1).padStart(3, '0');
}

function Cndq_validarData_(v, rotulo) {
  var d = Conduta_soData_(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Informe ' + rotulo + ' (data no formato dd/mm/aaaa).');
  if (d < Conduta_hojeISO_()) throw new Error(rotulo.charAt(0).toUpperCase() + rotulo.slice(1) + ' não pode estar no passado.');
  return d;
}

function Conduta_apiCriarPlanoAcao(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var oc = null, tipoCodigo = SGO_UTILS.safeUpper(payload.tipoCodigo), origemTipo = 'LIVRE';
  if (payload.ocorrenciaId) {
    oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, String(payload.ocorrenciaId));
    if (!oc) throw new Error('A ocorrência não foi encontrada: atualize a tela.');
    tipoCodigo = SGO_UTILS.safeUpper(oc.TIPO_CODIGO); origemTipo = 'OCORRENCIA';
    var abertoMesma = Cndq_ler_(CNDQ_SHEETS.PLANO).filter(function (p) { return String(p.OCORRENCIA_ID) === String(oc.ID) && ['CONCLUIDO', 'CANCELADO'].indexOf(SGO_UTILS.safeUpper(p.FASE)) < 0; })[0];
    if (abertoMesma) throw new Error('Esta ocorrência já tem o plano ' + abertoMesma.CODIGO + ' em andamento: abra-o na aba Qualidade e planos.');
  } else if (tipoCodigo) { Conduta_buscarTipoOcorrencia_(tipoCodigo); origemTipo = 'CODIGO_RECORRENTE'; }
  var t = function (k, min, rot) { var v = String(payload[k] || '').trim(); if (v.length < min) throw new Error('Preencha "' + rot + '" (pelo menos ' + min + ' caracteres).'); return v.slice(0, 1500); };
  var oQue = t('oQue', 5, 'O quê (ação)'), porQue = t('porQue', 5, 'Por quê'), como = t('como', 10, 'Como');
  var onde = String(payload.onde || '').trim().slice(0, 300) || 'Não se aplica';
  var quanto = String(payload.quanto || '').trim().slice(0, 300) || 'Sem custo previsto';
  var quando = Cndq_validarData_(payload.quando, 'o prazo (Quando)');
  var usuarios = Cndq_usuarios_();
  var quem = usuarios[String(payload.quemId || '')];
  if (!quem || SGO_UTILS.safeUpper(quem.STATUS || 'ATIVO') !== 'ATIVO' || SGO_UTILS.safeUpper(quem.PERFIL) === 'CLIENTE') throw new Error('Escolha o responsável (Quem) na lista da equipe ativa.');
  var analiseId = SGO_UTILS.safe(payload.analiseId);
  if (analiseId && !SGO_DATA.getById(CNDQ_SHEETS.ANALISE, analiseId)) throw new Error('A análise de causa escolhida não foi encontrada: atualize a tela.');
  var areaCod = SGO_UTILS.safeUpper(payload.area) || (oc && usuarios[String(oc.COLABORADOR_ID)] ? Conduta_areaColaborador_(usuarios[String(oc.COLABORADOR_ID)]).codigo : '');
  var titulo = String(payload.titulo || '').trim().slice(0, 200) || ((oc ? 'Ocorrência ' : 'Código ') + tipoCodigo + ': ' + oQue.slice(0, 120));
  var plano = { CODIGO: Cndq_proximoCodigo_(), TITULO: titulo, ORIGEM_TIPO: origemTipo, OCORRENCIA_ID: oc ? String(oc.ID) : '', TIPO_CODIGO: tipoCodigo, AREA: areaCod, ANALISE_ID: analiseId,
    O_QUE: oQue, POR_QUE: porQue, ONDE: onde, QUANDO: quando, QUEM_ID: String(quem.ID), QUEM_NOME: SGO_UTILS.safe(quem.NOME) || quem.USUARIO, COMO: como, QUANTO: quanto,
    FASE: 'EXECUTAR', CICLO: 1, CRIADO_POR_ID: sessao.userId, CRIADO_POR_NOME: sessao.nome || sessao.usuario, ATUALIZADO_EM: SGO_UTILS.nowIso() };
  var atv = Cndq_criarAtividade_(sessionId, plano, { oQue: oQue, quemId: plano.QUEM_ID, quando: quando,
    descricao: 'Plano de ação ' + plano.CODIGO + ' do Programa de conduta (5W2H).\nO quê: ' + oQue + '\nPor quê: ' + porQue + '\nOnde: ' + onde + '\nQuando: ' + Conduta_dataBr_(quando) +
      '\nQuem: ' + plano.QUEM_NOME + '\nComo: ' + como + '\nQuanto: ' + quanto + '\nAo terminar, marque esta atividade como Concluída; a gestão verifica a eficácia no plano.' });
  plano.ATIVIDADES_JSON = JSON.stringify([atv.ID]);
  plano.HISTORICO_JSON = Cndq_hist_(null, sessao, 'CRIADO', 'Plano criado na fase Executar, com a atividade "' + atv.TITULO + '" para ' + plano.QUEM_NOME + ' até ' + Conduta_dataBr_(quando) + '.');
  var reg = SGO_DATA.insert(CNDQ_SHEETS.PLANO, plano);
  SGO_DATA.log('CONDUTA_PLANO_CRIADO', sessao.usuario, reg.CODIGO + ' (' + origemTipo + (oc ? ' ' + oc.ID : ' ' + tipoCodigo) + ')', 'CONDUTA');
  return { success: true, id: reg.ID, codigo: reg.CODIGO, message: 'Plano ' + reg.CODIGO + ' criado. A ação foi lançada em Minhas atividades para ' + plano.QUEM_NOME + ' (aparece também em Atividades do módulo).' };
}

function Conduta_apiAdicionarAcaoPlano(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(CNDQ_SHEETS.PLANO, String(payload.planoId || ''));
  if (!p) throw new Error('O plano não foi encontrado: atualize a tela.');
  var fase = SGO_UTILS.safeUpper(p.FASE);
  if (fase !== 'PLANEJAR' && fase !== 'EXECUTAR') throw new Error('Ação nova só entra no plano em Planejar ou Executar. Este está em ' + (CNDQ_FASES[fase] || fase) + '.');
  var oQue = String(payload.oQue || '').trim();
  if (oQue.length < 5) throw new Error('Escreva a ação (O quê), com pelo menos 5 caracteres.');
  var quando = Cndq_validarData_(payload.quando, 'o prazo da ação');
  var quem = Cndq_usuarios_()[String(payload.quemId || '')];
  if (!quem || SGO_UTILS.safeUpper(quem.STATUS || 'ATIVO') !== 'ATIVO') throw new Error('Escolha o responsável da ação na lista da equipe ativa.');
  var atv = Cndq_criarAtividade_(sessionId, p, { oQue: oQue, quemId: String(quem.ID), quando: quando, prioridade: payload.prioridade,
    descricao: 'Ação do plano ' + p.CODIGO + ' (' + SGO_UTILS.safe(p.TITULO) + ').\n' + String(payload.como || '').trim() });
  var ids = Cndq_json_(p.ATIVIDADES_JSON, []); if (!Array.isArray(ids)) ids = [];
  ids.push(atv.ID);
  SGO_DATA.update(CNDQ_SHEETS.PLANO, p.ID, { ATIVIDADES_JSON: JSON.stringify(ids), FASE: 'EXECUTAR', ATUALIZADO_EM: SGO_UTILS.nowIso(),
    HISTORICO_JSON: Cndq_hist_(p, sessao, 'ACAO', 'Ação "' + oQue.slice(0, 120) + '" para ' + (SGO_UTILS.safe(quem.NOME) || quem.USUARIO) + ' até ' + Conduta_dataBr_(quando) + '.') });
  return { success: true, message: 'Ação lançada em Minhas atividades para ' + (SGO_UTILS.safe(quem.NOME) || quem.USUARIO) + '.' };
}

/**
 * Avança o ciclo PDCA. payload: { planoId, para: 'VERIFICAR'|'AGIR'|'CONCLUIDO'|'NOVO_CICLO'|'CANCELADO', texto, eficaz }
 * - Executar -> Verificar: todas as ações concluídas ou canceladas (pelo menos uma concluída).
 * - Verificar -> Agir: verificação da eficácia escrita e marcada (eficaz SIM).
 * - Verificar -> Novo ciclo (eficaz NAO): volta para Planejar, ciclo + 1; lance novas ações.
 * - Agir -> Concluído: o que foi padronizado (procedimento, treinamento, checklist).
 * - Cancelar: qualquer fase aberta, com motivo. Nada é apagado.
 */
function Conduta_apiAvancarPlano(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var p = SGO_DATA.getById(CNDQ_SHEETS.PLANO, String(payload.planoId || ''));
  if (!p) throw new Error('O plano não foi encontrado: atualize a tela.');
  var fase = SGO_UTILS.safeUpper(p.FASE) || 'EXECUTAR', para = SGO_UTILS.safeUpper(payload.para), texto = String(payload.texto || '').trim();
  if (fase === 'CONCLUIDO' || fase === 'CANCELADO') throw new Error('O plano ' + p.CODIGO + ' já está ' + CNDQ_FASES[fase].toLowerCase() + '.');
  var agora = SGO_UTILS.nowIso(), campos = { ATUALIZADO_EM: agora }, msg = '';
  if (para === 'CANCELADO') {
    if (texto.length < 10) throw new Error('Escreva o motivo do cancelamento (pelo menos 10 caracteres).');
    campos.FASE = 'CANCELADO'; campos.CANCELADO_MOTIVO = texto.slice(0, 1000); msg = 'Plano cancelado. As atividades já lançadas continuam em Minhas atividades; cancele lá as que não fazem mais sentido.';
  } else if (para === 'VERIFICAR') {
    if (fase !== 'EXECUTAR') throw new Error('Só passa para Verificar quem está em Executar.');
    var acoes = Cndq_atividadesDoPlano_(p, typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []);
    var abertas = acoes.filter(function (a) { return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; });
    if (abertas.length) throw new Error('Ainda há ' + abertas.length + ' ação(ões) em aberto: ' + abertas.map(function (a) { return '"' + a.TITULO + '" (' + a.SITUACAO + ', ' + (a.RESPONSAVEL_NOME || '') + ')'; }).join('; ') + '. Conclua ou cancele em Minhas atividades e tente de novo.');
    if (!acoes.some(function (a) { return a.SITUACAO === 'Concluída'; })) throw new Error('Nenhuma ação do plano foi concluída: lance uma ação nova ou cancele o plano.');
    campos.FASE = 'VERIFICAR'; msg = 'Plano em Verificar: confira se o problema voltou a acontecer e registre a eficácia.';
  } else if (para === 'AGIR' || para === 'NOVO_CICLO') {
    if (fase !== 'VERIFICAR') throw new Error('A verificação da eficácia é feita na fase Verificar.');
    if (texto.length < 15) throw new Error('Descreva a verificação (pelo menos 15 caracteres): o que foi conferido, em que período e o resultado.');
    campos.VERIFICACAO_TEXTO = texto.slice(0, 1500); campos.VERIFICADO_EM = Conduta_hojeISO_();
    if (para === 'AGIR') { campos.EFICAZ = 'SIM'; campos.FASE = 'AGIR'; msg = 'Eficácia confirmada. Na fase Agir, registre o que foi padronizado para o problema não voltar.'; }
    else { campos.EFICAZ = 'NAO'; campos.FASE = 'PLANEJAR'; campos.CICLO = (Number(p.CICLO) || 1) + 1; msg = 'Ação não foi eficaz: o plano voltou para Planejar (ciclo ' + campos.CICLO + '). Revise a análise de causa e lance as novas ações.'; }
  } else if (para === 'CONCLUIDO') {
    if (fase !== 'AGIR') throw new Error('O plano é concluído na fase Agir, depois da verificação da eficácia.');
    if (texto.length < 10) throw new Error('Escreva o que foi padronizado (procedimento, treinamento, checklist), com pelo menos 10 caracteres.');
    campos.PADRONIZACAO_TEXTO = texto.slice(0, 1500); campos.FASE = 'CONCLUIDO'; campos.CONCLUIDO_EM = Conduta_hojeISO_(); msg = 'Plano ' + p.CODIGO + ' concluído.';
  } else throw new Error('Passo do plano não reconhecido. Atualize a tela e use os botões do plano.');
  campos.HISTORICO_JSON = Cndq_hist_(p, sessao, para, texto || (CNDQ_FASES[campos.FASE] || ''));
  SGO_DATA.update(CNDQ_SHEETS.PLANO, p.ID, campos);
  SGO_DATA.log('CONDUTA_PLANO_' + para, sessao.usuario, p.CODIGO + ': ' + (texto || para).slice(0, 300), 'CONDUTA');
  return { success: true, message: msg };
}

// ------------------------------------------------------------
// KANBAN DAS OCORRÊNCIAS
// ------------------------------------------------------------
var CNDQ_COLUNAS = [
  { id: 'registrada', nome: 'Registrada', ajuda: 'Aguardando a homologação da gestão.' },
  { id: 'defesa', nome: 'Em defesa', ajuda: 'Homologada no prazo de contestação, contestada ou em recurso.' },
  { id: 'homologada', nome: 'Homologada', ajuda: 'Firme. As marcadas "plano recomendado" são graves ou reincidentes.' },
  { id: 'plano', nome: 'Plano de ação', ajuda: 'Com plano 5W2H em andamento.' },
  { id: 'concluida', nome: 'Concluída', ajuda: 'Plano concluído, ou firme sem necessidade de plano e com o prazo de recurso encerrado.' }
];

function Cndq_exigePlano_(o) {
  var nivel = SGO_UTILS.safeUpper(o.NIVEL_APLICADO);
  if (nivel === 'G' || nivel === 'GG') return 'grave';
  if (SGO_UTILS.safe(o.REINCIDENCIA_DE_ID) || /R$/.test(nivel)) return 'reincidente';
  return '';
}

function Conduta_apiKanbanQualidade(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var todos = Conduta_podeConsultarTodos_(sessionId);
  var dias = Math.min(Math.max(Number(payload.dias) || 90, 7), 400);
  var desde = Cndq_menosDias_(dias);
  var usuarios = Cndq_usuarios_(), nomes = Cndq_nomesAreas_();
  var descr = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (t) { descr[SGO_UTILS.safeUpper(t.CODIGO)] = t.DESCRICAO; });
  var planos = {}, analises = {};
  Cndq_ler_(CNDQ_SHEETS.PLANO).forEach(function (p) {
    if (!p.OCORRENCIA_ID) return;
    var atual = planos[String(p.OCORRENCIA_ID)];
    if (!atual || SGO_UTILS.safeUpper(atual.FASE) === 'CANCELADO') planos[String(p.OCORRENCIA_ID)] = p;
  });
  Cndq_ler_(CNDQ_SHEETS.ANALISE).forEach(function (a) { if (a.OCORRENCIA_ID) analises[String(a.OCORRENCIA_ID)] = String(a.ID); });
  var hoje = Conduta_hojeISO_();
  var cols = {}; CNDQ_COLUNAS.forEach(function (c) { cols[c.id] = []; });
  var encerradas = 0;
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    var data = Conduta_soData_(o.DATA_FATO);
    if (data < desde) return;
    if (!todos && String(o.COLABORADOR_ID) !== String(sessao.userId) && String(o.FISCAL_ID) !== String(sessao.userId)) return;
    var u = usuarios[String(o.COLABORADOR_ID)] || {};
    var ar = Conduta_areaColaborador_(u, nomes);
    if (payload.area && !(payload.area === '-' ? !ar.codigo : ar.codigo === SGO_UTILS.safeUpper(payload.area))) return;
    var st = SGO_UTILS.safeUpper(o.STATUS);
    var p = planos[String(o.ID)], faseP = p ? SGO_UTILS.safeUpper(p.FASE) : '';
    if (faseP === 'CANCELADO') p = null;
    var exige = Cndq_exigePlano_(o), col;
    if (st === 'REGISTRADA') col = 'registrada';
    else if (st === 'HOMOLOGADA' || st === 'CONTESTADA' || st === 'EM_RECURSO') col = 'defesa';
    else if (st === 'FIRME') {
      if (p && faseP === 'CONCLUIDO') col = 'concluida';
      else if (p) col = 'plano';
      else if (!exige && Conduta_soData_(o.PRAZO_RECURSO) && Conduta_soData_(o.PRAZO_RECURSO) < hoje) col = 'concluida';
      else col = 'homologada';
    } else { encerradas++; if (!payload.comEncerradas) return; col = 'concluida'; }
    cols[col].push({ ID: String(o.ID), TIPO_CODIGO: SGO_UTILS.safeUpper(o.TIPO_CODIGO), TIPO_DESCRICAO: descr[SGO_UTILS.safeUpper(o.TIPO_CODIGO)] || '',
      COLABORADOR_NOME: SGO_UTILS.safe(u.NOME) || '', AREA: ar.codigo, AREA_NOME: ar.nome, DATA_FATO: data, STATUS: st, NIVEL: SGO_UTILS.safeUpper(o.NIVEL_APLICADO),
      ENCERRADA_SEM_EFEITO: ['REJEITADA', 'ANULADA', 'DESCARTADA'].indexOf(st) >= 0, EXIGE_PLANO: exige,
      PLANO: p ? { ID: String(p.ID), CODIGO: SGO_UTILS.safe(p.CODIGO), FASE: faseP, FASE_NOME: CNDQ_FASES[faseP] || faseP } : null,
      ANALISE_ID: analises[String(o.ID)] || '', ORIGEM_ROTULO: SGO_UTILS.safe(o.ORIGEM_ROTULO), PRAZO_CONTESTACAO: Conduta_soData_(o.PRAZO_CONTESTACAO) });
  });
  Object.keys(cols).forEach(function (k) { cols[k].sort(function (a, b) { return b.DATA_FATO.localeCompare(a.DATA_FATO); }); });
  return { ok: true, colunas: CNDQ_COLUNAS.map(function (c) { return { id: c.id, nome: c.nome, ajuda: c.ajuda, itens: cols[c.id] }; }),
    encerradasSemEfeito: encerradas, dias: dias, podeGerir: isAdminSession(sessionId), consultaTodos: todos };
}

// ------------------------------------------------------------
// PLANOS E ANÁLISES (lista) E INDICADORES POR ÁREA
// ------------------------------------------------------------
function Conduta_apiListarPlanos(sessionId, payload) {
  Cndq_exigirConsulta_(sessionId);
  payload = payload || {};
  var nomes = Cndq_nomesAreas_();
  var atv = typeof Atividades_todas_ === 'function' ? Atividades_todas_() : [];
  var agora = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : Conduta_hojeISO_() + 'T00:00';
  var planos = Cndq_ler_(CNDQ_SHEETS.PLANO).map(function (p) { return Cndq_planoParaTela_(p, atv, nomes, agora); })
    .filter(function (p) { return payload.todos || ['CONCLUIDO', 'CANCELADO'].indexOf(p.FASE) < 0 || p.CONCLUIDO_EM >= Cndq_menosDias_(90); })
    .sort(function (a, b) { return b.CODIGO.localeCompare(a.CODIGO); });
  var analises = Cndq_ler_(CNDQ_SHEETS.ANALISE).map(Cndq_analiseParaTela_).sort(function (a, b) { return b.ATUALIZADO_EM.localeCompare(a.ATUALIZADO_EM); });
  return { ok: true, planos: planos, analises: analises, fases: CNDQ_FASES, ishikawa: CNDQ_ISHIKAWA, podeGerir: isAdminSession(sessionId) };
}

/**
 * Indicadores de qualidade por área (ISO 9001, 9.1): no período (dias, pela
 * data do fato), por área do colaborador (CAD_USUARIOS.AREA):
 *  - registradas, firmes, reincidência (% das firmes que são reincidência),
 *  - tempo médio de homologação (dias úteis do registro à homologação) e % no prazo,
 *  - descartadas por prazo (ninguém homologou a tempo),
 *  - planos de ação: abertos, concluídos, % concluídos, atrasados, eficácia,
 *  - sugestões pendentes.
 * E os códigos recorrentes da empresa (3 ou mais firmes no período).
 */
function Conduta_apiIndicadoresQualidade(sessionId, payload) {
  Cndq_exigirConsulta_(sessionId);
  payload = payload || {};
  var dias = Math.min(Math.max(Number(payload.dias) || 90, 7), 400);
  var desde = Cndq_menosDias_(dias);
  var usuarios = Cndq_usuarios_(), nomes = Cndq_nomesAreas_();
  var areas = {};
  var area = function (cod) {
    var k = cod || '-';
    if (!areas[k]) areas[k] = { area: cod, nome: cod ? (nomes[cod] || cod) : 'Sem área definida', registradas: 0, firmes: 0, reincidentes: 0, homologadas: 0, diasHomolog: 0, noPrazo: 0,
      descartadasPrazo: 0, planos: 0, planosConcluidos: 0, planosAbertos: 0, planosAtrasados: 0, verificados: 0, eficazes: 0, sugestoesPendentes: 0, pessoas: 0 };
    return areas[k];
  };
  Object.keys(usuarios).forEach(function (id) {
    var u = usuarios[id];
    if (SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') !== 'ATIVO' || SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE' || Conduta_ehContaGenerica_(u)) return;
    area(Conduta_areaColaborador_(u, nomes).codigo).pessoas++;
  });
  var porCodigo = {};
  var descr = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (t) { descr[SGO_UTILS.safeUpper(t.CODIGO)] = t.DESCRICAO; });
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
    if (Conduta_soData_(o.DATA_FATO) < desde) return;
    var a = area(Conduta_areaColaborador_(usuarios[String(o.COLABORADOR_ID)] || {}, nomes).codigo);
    var st = SGO_UTILS.safeUpper(o.STATUS);
    a.registradas++;
    if (st === 'FIRME') {
      a.firmes++;
      if (Cndq_exigePlano_(o) === 'reincidente') a.reincidentes++;
      var c = SGO_UTILS.safeUpper(o.TIPO_CODIGO);
      (porCodigo[c] = porCodigo[c] || { codigo: c, descricao: descr[c] || '', firmes: 0, areas: {} }).firmes++;
      porCodigo[c].areas[a.nome] = 1;
    }
    if (st === 'DESCARTADA') a.descartadasPrazo++;
    var hom = Conduta_soData_(o.HOMOLOGADA_EM);
    if (hom) {
      a.homologadas++;
      a.diasHomolog += Cndq_diasUteisEntre_(Conduta_soData_(o.CRIADO_EM) || Conduta_soData_(o.DATA_FATO), hom);
      if (!Conduta_soData_(o.PRAZO_HOMOLOGACAO) || hom <= Conduta_soData_(o.PRAZO_HOMOLOGACAO)) a.noPrazo++;
    }
  });
  var hoje = Conduta_hojeISO_();
  Cndq_ler_(CNDQ_SHEETS.PLANO).forEach(function (p) {
    var criado = Conduta_soData_(p.CRIADO_EM), fase = SGO_UTILS.safeUpper(p.FASE);
    if (fase === 'CANCELADO') return;
    var aberto = fase !== 'CONCLUIDO';
    if (!aberto && criado < desde && Conduta_soData_(p.CONCLUIDO_EM) < desde) return;
    var a = area(SGO_UTILS.safeUpper(p.AREA));
    a.planos++;
    if (aberto) { a.planosAbertos++; if (Conduta_soData_(p.QUANDO) && Conduta_soData_(p.QUANDO) < hoje && (fase === 'EXECUTAR' || fase === 'PLANEJAR')) a.planosAtrasados++; }
    else a.planosConcluidos++;
    if (SGO_UTILS.safeUpper(p.EFICAZ)) { a.verificados++; if (SGO_UTILS.safeUpper(p.EFICAZ) === 'SIM') a.eficazes++; }
  });
  Cndq_ler_(CNDQ_SHEETS.SUGESTAO).forEach(function (s) {
    if (SGO_UTILS.safeUpper(s.STATUS) !== 'PENDENTE') return;
    area(Conduta_areaColaborador_(usuarios[String(s.COLABORADOR_ID)] || {}, nomes).codigo).sugestoesPendentes++;
  });
  var pct = function (a, b) { return b ? Math.round((a / b) * 1000) / 10 : null; };
  var lista = Object.keys(areas).map(function (k) {
    var a = areas[k];
    a.reincidenciaPct = pct(a.reincidentes, a.firmes);
    a.tempoMedioHomologacao = a.homologadas ? Math.round((a.diasHomolog / a.homologadas) * 10) / 10 : null;
    a.homologacaoNoPrazoPct = pct(a.noPrazo, a.homologadas);
    a.planosConcluidosPct = pct(a.planosConcluidos, a.planos);
    a.eficaciaPct = pct(a.eficazes, a.verificados);
    delete a.diasHomolog;
    return a;
  }).filter(function (a) { return a.pessoas || a.registradas || a.planos || a.sugestoesPendentes; })
    .sort(function (a, b) { return (a.area ? 0 : 1) - (b.area ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var total = lista.reduce(function (t, a) {
    ['registradas', 'firmes', 'reincidentes', 'homologadas', 'noPrazo', 'descartadasPrazo', 'planos', 'planosConcluidos', 'planosAbertos', 'planosAtrasados', 'verificados', 'eficazes', 'sugestoesPendentes', 'pessoas'].forEach(function (c) { t[c] = (t[c] || 0) + (a[c] || 0); });
    t.somaTempo = (t.somaTempo || 0) + (a.tempoMedioHomologacao || 0) * (a.homologadas || 0);
    return t;
  }, { nome: 'Empresa' });
  total.reincidenciaPct = pct(total.reincidentes, total.firmes);
  total.tempoMedioHomologacao = total.homologadas ? Math.round((total.somaTempo / total.homologadas) * 10) / 10 : null;
  total.homologacaoNoPrazoPct = pct(total.noPrazo, total.homologadas);
  total.planosConcluidosPct = pct(total.planosConcluidos, total.planos);
  total.eficaciaPct = pct(total.eficazes, total.verificados);
  delete total.somaTempo;
  var recorrentes = Object.keys(porCodigo).map(function (k) { var c = porCodigo[k]; c.areas = Object.keys(c.areas); return c; })
    .filter(function (c) { return c.firmes >= CNDQ_CODIGO_RECORRENTE_MIN; })
    .sort(function (a, b) { return b.firmes - a.firmes; });
  var planosCodigo = {};
  Cndq_ler_(CNDQ_SHEETS.PLANO).forEach(function (p) { if (['CONCLUIDO', 'CANCELADO'].indexOf(SGO_UTILS.safeUpper(p.FASE)) < 0 && p.TIPO_CODIGO) planosCodigo[SGO_UTILS.safeUpper(p.TIPO_CODIGO)] = SGO_UTILS.safe(p.CODIGO); });
  recorrentes.forEach(function (c) { c.planoAberto = planosCodigo[c.codigo] || ''; });
  return { ok: true, dias: dias, desde: desde, areas: lista, total: total, recorrentes: recorrentes, minimoRecorrente: CNDQ_CODIGO_RECORRENTE_MIN,
    semArea: lista.filter(function (a) { return !a.area; }).reduce(function (n, a) { return n + a.pessoas; }, 0) };
}
