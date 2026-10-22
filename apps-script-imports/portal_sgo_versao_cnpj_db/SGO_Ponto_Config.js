/****************************************************
 * ASSISTENTE DO PONTO — NATIVO DO SGO+ (21/10/2026)
 *
 * Pedido do dono (21/10/2026): "quero o módulo do ponto também no SGO". O SGO+ é o sistema único; o assistente do
 * ponto do COMMAND (Ponto.js, docs/ASSISTENTE_PONTO_20261017.md) nasce aqui de novo, usando o que o SGO+ já tem:
 * expediente comum e feriados (SGO_Expediente.js), notificador com o piloto do WhatsApp e a regra do vínculo
 * (SGO_Notificar.js, categoria PONTO), ausências do Programa de conduta, atendimentos do Auvo, Minhas atividades,
 * central de pendências, Caixa de decisões e documentos A4.
 *
 * O QUE ELE É: o ponto oficial é o RELÓGIO FÍSICO da empresa (em viagem, o aplicativo de ponto que o RH libera). O
 * SGO+ não fala com o relógio e não sabe quem bateu: o assistente só LEMBRA, recebe a confirmação de um toque e leva o
 * "Esqueci de bater" ao RH como pedido de ajuste. Não confirmado não é prova de falta. Nenhuma medida é automática.
 *
 * REGRAS DO DONO (não mudar sem decisão dele):
 *  - Lembretes só em dia útil e só nestes horários: entrada 5 min antes (07:55), almoço na hora (11:00), volta do
 *    almoço = saída para o almoço + 1 h (a saída confirmada; sem confirmação, o horário do almoço), saída 5 min antes
 *    (17:55; sexta 17:25). Jornada configurável por pessoa.
 *  - Sem insistência: UM lembrete por marcação, nunca um segundo; nada fora do horário da pessoa (antes da entrada
 *    menos 5 min ou depois da saída); sem mensagem de fim de semana, de "bom trabalho" ou de resumo pelo WhatsApp.
 *  - Quais marcações lembrar é configurável (padrão: as 4; opção "só entrada e saída" para o piloto).
 *  - Só CLT (CAD_USUARIOS.VINCULO_TRABALHO). PJ, Diretoria (22/10/2026) e vínculo vazio nunca recebem nada do ponto.
 *  - Piloto: com o piloto do WhatsApp ligado, só as pessoas da lista (SGO_WhatsappPiloto.js) participam; o servidor
 *    também barra (sgo_servidor, servicos/whatsappPiloto.ts).
 *  - Não lembra quem está em atendimento no Auvo (check-in sem check-out) nem quem está ausente (férias e afastamento
 *    do Programa de conduta; folgas e dispensas lançadas aqui pelo RH).
 *  - WhatsApp oficial (Meta), modelos sgo_ponto_* (SGO_Notificar.js, NTF_MODELOS_META) com botão de link. Sem o
 *    WhatsApp (modelo não aprovado, sem celular), o lembrete vai por e-mail, como reserva (configurável).
 *  - 3º esquecimento no mês ("Esqueci de bater" + não confirmados): resumo no sistema e por e-mail ao RH e à gestão
 *    da pessoa (NUNCA pelo WhatsApp) e uma SUGESTÃO no Programa de conduta (nunca ocorrência automática).
 *  - Nasce DESLIGADO (PONTO_CONFIG.ligado = false); o dono liga na tela.
 *  - Sem envio em dobro com o COMMAND: com o assistente do SGO+ ligado, o do COMMAND não envia (ele lê esta
 *    configuração pelo alias PONTO_SGO_CONFIG do servidor; CMD_PONTO_NO_SGO = SIM esconde o ponto do COMMAND).
 *  - LGPD: nada de localização. A evidência do pedido de ajuste é só o horário do check-in/check-out do Auvo.
 *
 * QUEM VÊ O QUÊ (o servidor confere em toda chamada):
 *   RH (perfil RH, área RH no cadastro ou marcado na configuração), Administrador e Diretoria: tudo do ponto;
 *   tratam os pedidos de ajuste; RH ajusta quem participa, jornada por pessoa e folgas. Ligar e desligar,
 *   marcações, jornada geral e quem é o RH: Administrador e Diretoria.
 *   Gestor: a própria equipe (área dele no cadastro e as áreas pelas quais responde na Caixa de decisões), só leitura.
 *   Colaborador: os próprios lembretes, confirmações e pedidos.
 *
 * Arquivos: SGO_Ponto_Config.js (base), SGO_Ponto_Rodada.js (rotina de 5 min), SGO_Ponto_Api.js (telas, página
 * pública, pendências, resumo A4), PontoPagina.html (página do link), JS_Ponto.html (telas), SGO_Ajuda_Ponto.js.
 * Abas (criadas sob demanda; nada é apagado): PONTO_MARCACOES, PONTO_AJUSTES, PONTO_PESSOAS, PONTO_DISPENSAS,
 * PONTO_RESUMOS, PONTO_AVISOS. Nenhuma função devolve Date cru.
 ****************************************************/

var PONTO_FUSO = 'America/Sao_Paulo';
var PONTO_PROP_CFG = 'PONTO_CONFIG';
var PONTO_URL_PADRAO = 'https://sgo.metrolabs.com.br';
var PONTO_ABAS = { MARCACOES: 'PONTO_MARCACOES', AJUSTES: 'PONTO_AJUSTES', PESSOAS: 'PONTO_PESSOAS', DISPENSAS: 'PONTO_DISPENSAS', RESUMOS: 'PONTO_RESUMOS', AVISOS: 'PONTO_AVISOS' };
var PONTO_COLUNAS = {
  PONTO_MARCACOES: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'MARCACAO', 'PREVISTO', 'SITUACAO', 'LEMBRETE_EM', 'CANAL', 'ENVIO_MOTIVO', 'TOKEN_ID',
    'CONFIRMADO_EM', 'CONFIRMADO_POR', 'HORARIO_INFORMADO', 'JUSTIFICATIVA', 'AJUSTE_ID', 'OBS', 'ATUALIZADO_EM', 'CRIADO_EM'],
  PONTO_AJUSTES: ['ID', 'CODIGO', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'MARCACAO', 'HORARIO_INFORMADO', 'JUSTIFICATIVA', 'EVIDENCIA', 'ORIGEM', 'SITUACAO',
    'OBSERVACAO', 'TRATADO_POR_ID', 'TRATADO_POR_NOME', 'TRATADO_EM', 'MARCACAO_ID', 'ATIVIDADE_ID', 'CRIADO_POR_ID', 'ATUALIZADO_EM', 'CRIADO_EM'],
  PONTO_PESSOAS: ['ID', 'USUARIO_ID', 'PARTICIPA', 'ENTRADA', 'ALMOCO', 'RETORNO_MIN', 'SAIDA', 'SAIDA_SEXTA', 'SEM_ALMOCO', 'OBSERVACAO', 'ATUALIZADO_POR', 'ATUALIZADO_EM', 'CRIADO_EM'],
  PONTO_DISPENSAS: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'DE', 'ATE', 'MOTIVO', 'OBSERVACAO', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'EXCLUIDA_EM', 'EXCLUIDA_POR', 'CRIADO_EM'],
  PONTO_RESUMOS: ['ID', 'CHAVE', 'USUARIO_ID', 'USUARIO_NOME', 'MES', 'QUANTIDADE', 'TEXTO', 'DESTINATARIOS_IDS', 'SUGESTAO', 'DIA', 'CRIADO_EM'],
  PONTO_AVISOS: ['ID', 'DESTINATARIO_ID', 'TIPO', 'TITULO', 'TEXTO', 'REF_TIPO', 'REF_ID', 'DATA', 'LIDO_EM', 'EMAIL_SITUACAO', 'EMAIL_EM', 'EMAIL_MOTIVO', 'CRIADO_EM']
};
var PONTO_COLUNAS_TEXTO = {
  PONTO_MARCACOES: ['DIA', 'PREVISTO', 'LEMBRETE_EM', 'CONFIRMADO_EM', 'HORARIO_INFORMADO', 'ATUALIZADO_EM'],
  PONTO_AJUSTES: ['DIA', 'HORARIO_INFORMADO', 'TRATADO_EM', 'ATUALIZADO_EM', 'CODIGO'],
  PONTO_PESSOAS: ['ENTRADA', 'ALMOCO', 'SAIDA', 'SAIDA_SEXTA', 'ATUALIZADO_EM'],
  PONTO_DISPENSAS: ['DE', 'ATE', 'EXCLUIDA_EM'], PONTO_RESUMOS: ['MES', 'DIA'], PONTO_AVISOS: ['DATA', 'LIDO_EM', 'EMAIL_EM']
};

var PONTO_ORDEM = ['ENTRADA', 'ALMOCO', 'RETORNO', 'SAIDA'];
var PONTO_MARC = {
  ENTRADA: { cod: 'E', rotulo: 'Entrada', botao: 'Já bati a entrada', modelo: 'sgo_ponto_entrada', de: 'da entrada', curto: 'entrada', esqueci: 'Horário em que você chegou' },
  ALMOCO: { cod: 'A', rotulo: 'Saída para o almoço', botao: 'Saí para o almoço', modelo: 'sgo_ponto_almoco', de: 'da saída para o almoço', curto: 'almoço', esqueci: 'Horário em que você saiu para o almoço' },
  RETORNO: { cod: 'R', rotulo: 'Volta do almoço', botao: 'Voltei do almoço', modelo: 'sgo_ponto_retorno', de: 'da volta do almoço', curto: 'volta do almoço', esqueci: 'Horário em que você voltou do almoço' },
  SAIDA: { cod: 'S', rotulo: 'Saída', botao: 'Já bati a saída', modelo: 'sgo_ponto_saida', de: 'da saída', curto: 'saída', esqueci: 'Horário em que você saiu' }
};
/** Conjuntos de marcações. PADRAO = decisão do dono; ENTRADA_SAIDA = proposta da matriz de avisos para o piloto (o dono decide). */
var PONTO_CONJUNTOS = {
  PADRAO: { nome: 'As quatro marcações (entrada, almoço, volta do almoço e saída)', marcacoes: ['ENTRADA', 'ALMOCO', 'RETORNO', 'SAIDA'] },
  ENTRADA_SAIDA: { nome: 'Só entrada e saída (opção para o piloto)', marcacoes: ['ENTRADA', 'SAIDA'] }
};
var PONTO_SIT = {
  ENVIANDO: 'Enviando o lembrete', LEMBRADO: 'Lembrado, sem confirmação', CONFIRMADO: 'Confirmado', ESQUECI: 'Esqueci de bater (pedido ao RH)',
  NAO_CONFIRMADO: 'Não confirmado', DISPENSADO: 'Não lembrado (ausência ou atendimento)', NAO_ENVIADO: 'Lembrete não saiu'
};
var PONTO_AJ_SIT = { PENDENTE: 'Pendente', LANCADO: 'Tratado: lançado no ponto', RECUSADO: 'Tratado: não lançado' };
var PONTO_MOTIVOS_DISPENSA = { FOLGA: 'Folga', FERIAS: 'Férias', ATESTADO: 'Atestado', CONSULTA: 'Consulta', VIAGEM_SEM_PONTO: 'Viagem sem marcação de ponto', OUTRO: 'Outro' };
var PONTO_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
var PONTO_ANTES_MIN = 5;          // entrada e saída: 5 min antes
var PONTO_JANELA_MIN = 20;        // o lembrete só sai até 20 min depois do horário dele (servidor parado não dispara atrasado)
var PONTO_AJUSTE_PRAZO_DIAS = 31; // o colaborador pede ajuste de até 31 dias atrás, pela tela
var PONTO_AJUSTE_PARADO_DU = 2;   // pedido pendente há 2 dias úteis: Caixa de decisões da gestão do RH
var PONTO_RODAPE = 'O registro oficial é o do relógio ou do aplicativo de ponto (Portaria MTP 671/2021). Este lembrete não substitui a batida.';

var PONTO_CFG_PADRAO = {
  ligado: false,
  conjunto: 'PADRAO',
  jornada: { entrada: '', almoco: '11:00', retorno_min: 60, saida: '18:00', saida_sexta: '17:30' },
  rhIds: [],
  emailReserva: true,
  atividadeRh: true,
  resumoAPartir: 3
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Pto_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Pto_up_(v) { return Pto_s_(v).toUpperCase(); }
function Pto_2_(n) { return (n < 10 ? '0' : '') + n; }
function Pto_json_(t, padrao) { try { var v = JSON.parse(Pto_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Pto_texto_(v, max) { var s = Pto_s_(v).replace(/\s+/g, ' '); return max && s.length > max ? s.slice(0, max) : s; }
function Pto_verdade_(v) { return v === true || /^(SIM|TRUE|1)$/i.test(Pto_s_(v)); }
/** Partes da data no fuso da empresa: { dia, hora, min (minuto do dia), semana }. */
function Pto_partes_(quando) {
  var d = quando instanceof Date ? quando : new Date(quando === undefined ? Date.now() : quando);
  var dia = Utilities.formatDate(d, PONTO_FUSO, 'yyyy-MM-dd'), hora = Utilities.formatDate(d, PONTO_FUSO, 'HH:mm');
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return { dia: dia, hora: hora, min: Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)), semana: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(), ms: d.getTime() };
}
function Pto_agoraIso_(quando) { return Utilities.formatDate(quando instanceof Date ? quando : new Date(), PONTO_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function Pto_min_(hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(Pto_s_(hhmm).replace(/^'/, '')); return m && +m[1] < 24 && +m[2] < 60 ? (+m[1]) * 60 + (+m[2]) : NaN; }
function Pto_hhmm_(min) { return Pto_2_(Math.floor(min / 60)) + ':' + Pto_2_(min % 60); }
function Pto_normHora_(v) { if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, PONTO_FUSO, 'HH:mm'); var x = Pto_min_(v); return isNaN(x) ? '' : Pto_hhmm_(x); }
/** Dia "aaaa-mm-dd" de qualquer formato (Date, ISO, dd/mm/aaaa). */
function Pto_dia_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, PONTO_FUSO, 'yyyy-MM-dd');
  var s = Pto_s_(v).replace(/^'/, ''), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    if (/T\d{2}:\d{2}.*([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, PONTO_FUSO, 'yyyy-MM-dd'); }
    return m[1] + '-' + m[2] + '-' + m[3];
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
/** Milissegundos de "dia + minuto do dia" no fuso da empresa (Brasília, sem horário de verão desde 2019). */
function Pto_ms_(dia, min) { return Date.parse(dia + 'T' + Pto_hhmm_(Math.max(0, Math.min(1439, Math.round(min)))) + ':00-03:00'); }
/** Instante gravado (ISO com ou sem fuso) -> ms. Sem fuso = horário de Brasília. */
function Pto_msDe_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  var s = Pto_s_(v);
  if (!s) return NaN;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) s += (s.length === 16 ? ':00' : '') + '-03:00';
  return Date.parse(s);
}
function Pto_horaDe_(v) { var ms = Pto_msDe_(v); return isNaN(ms) ? '' : Utilities.formatDate(new Date(ms), PONTO_FUSO, 'HH:mm'); }
function Pto_br_(dia) { var p = Pto_s_(dia).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : Pto_s_(dia); }
function Pto_curto_(dia) { return Pto_br_(dia).slice(0, 5); }
function Pto_mes_(dia) { return Pto_s_(dia).slice(0, 7); }
function Pto_mesNome_(mes) { var p = Pto_s_(mes).split('-'); return (PONTO_MESES[Number(p[1]) - 1] || '') + ' de ' + p[0]; }
function Pto_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Pto_s_(dia));
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Pto_2_(t.getUTCMonth() + 1) + '-' + Pto_2_(t.getUTCDate());
}
function Pto_semanaDe_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; }
var PONTO_DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
/** Motivo de o dia não ter expediente ('' = dia útil): dias e feriados do expediente comum (SGO_Expediente.js). */
function Pto_motivoDia_(dia) {
  if (typeof SGO_expedienteMotivoDia_ !== 'function') { var w = Pto_semanaDe_(dia); return w === 0 || w === 6 ? (w === 0 ? 'domingo' : 'sábado') : ''; }
  return SGO_expedienteMotivoDia_(dia, Pto_semanaDe_(dia), SGO_expediente_());
}
function Pto_primeiroNome_(nome) { var p = Pto_s_(nome).split(/\s+/)[0] || ''; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : 'colaborador'; }
function Pto_mascara_(fone) { var f = Pto_s_(fone).replace(/\D/g, ''); return f ? '…' + f.slice(-4) : ''; }

function Pto_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e2) {} }
  }
}

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
function Ponto_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('PONTO_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(PONTO_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, PONTO_COLUNAS[aba]);
    PONTO_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (PONTO_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('PONTO_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function Pto_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

// ------------------------------------------------------------
// CONFIGURAÇÃO (propriedade PONTO_CONFIG; o COMMAND lê pelo alias PONTO_SGO_CONFIG)
// ------------------------------------------------------------
function Ponto_cfg_() {
  var g = Pto_json_(PropertiesService.getScriptProperties().getProperty(PONTO_PROP_CFG), null) || {};
  var j = Object.assign({}, PONTO_CFG_PADRAO.jornada, g.jornada || {});
  var lista = function (v) { return (Array.isArray(v) ? v : []).map(Pto_s_).filter(function (x, i, a) { return x && a.indexOf(x) === i; }); };
  var ret = Number(j.retorno_min);
  var c = {
    ligado: g.ligado === true,
    conjunto: PONTO_CONJUNTOS[Pto_up_(g.conjunto)] ? Pto_up_(g.conjunto) : PONTO_CFG_PADRAO.conjunto,
    jornada: { entrada: Pto_normHora_(j.entrada), almoco: Pto_normHora_(j.almoco) || '11:00', retorno_min: ret >= 15 && ret <= 240 ? Math.round(ret) : 60,
      saida: Pto_normHora_(j.saida) || PONTO_CFG_PADRAO.jornada.saida, saida_sexta: Pto_normHora_(j.saida_sexta) },
    rhIds: lista(g.rhIds),
    emailReserva: g.emailReserva !== false,
    atividadeRh: g.atividadeRh !== false,
    resumoAPartir: Number(g.resumoAPartir) >= 2 && Number(g.resumoAPartir) <= 10 ? Math.round(Number(g.resumoAPartir)) : 3,
    atualizadoEm: Pto_s_(g.atualizadoEm), atualizadoPor: Pto_s_(g.atualizadoPor)
  };
  c.marcacoes = PONTO_CONJUNTOS[c.conjunto].marcacoes.slice();
  return c;
}
function Ponto_gravarCfg_(c, por) {
  var limpa = { v: 1, ligado: c.ligado === true, conjunto: c.conjunto, jornada: c.jornada, rhIds: c.rhIds, emailReserva: c.emailReserva !== false, atividadeRh: c.atividadeRh !== false,
    resumoAPartir: c.resumoAPartir, atualizadoEm: Pto_agoraIso_(new Date()), atualizadoPor: Pto_s_(por).slice(0, 80) };
  PropertiesService.getScriptProperties().setProperty(PONTO_PROP_CFG, JSON.stringify(limpa));
  return Ponto_cfg_();
}

/** Jornada da pessoa no dia, em minutos: { entrada, almoco (null = sem intervalo registrado), retorno_min, saida, sexta }. */
function Ponto_jornada_(cfg, pessoa, dia) {
  var ex = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30' };
  var p = pessoa || {}, j = cfg.jornada, sexta = Pto_semanaDe_(dia) === 5;
  var m = function (v, padrao) { var x = Pto_min_(Pto_normHora_(v)); return isNaN(x) ? padrao : x; };
  var entradaGeral = m(j.entrada, Pto_min_(ex.ini));
  var saidaGeral = m(j.saida, Pto_min_(ex.fim)), saidaSextaGeral = m(j.saida_sexta, saidaGeral);
  var saidaPessoa = m(p.SAIDA, NaN);
  var saida = sexta ? m(p.SAIDA_SEXTA, isNaN(saidaPessoa) ? saidaSextaGeral : saidaPessoa) : (isNaN(saidaPessoa) ? saidaGeral : saidaPessoa);
  var retP = Number(p.RETORNO_MIN);
  return { entrada: m(p.ENTRADA, entradaGeral), almoco: Pto_verdade_(p.SEM_ALMOCO) ? null : m(p.ALMOCO, m(j.almoco, 11 * 60)),
    retorno_min: retP >= 15 && retP <= 240 ? Math.round(retP) : j.retorno_min, saida: saida, sexta: sexta };
}

/**
 * Horário previsto (ref) e do lembrete de uma marcação no dia, em ms; null = não se aplica (sem almoço registrado).
 * almocoRow: a marcação do almoço de hoje (a volta conta da saída confirmada; sem confirmação, do horário do almoço).
 */
function Ponto_horario_(marc, dia, j, almocoRow) {
  if (marc === 'ENTRADA') { var e = Pto_ms_(dia, j.entrada); return { ref: e, lembrete: e - PONTO_ANTES_MIN * 60000 }; }
  if (marc === 'SAIDA') { var s = Pto_ms_(dia, j.saida); return { ref: s, lembrete: s - PONTO_ANTES_MIN * 60000 }; }
  if (j.almoco === null || isNaN(j.almoco)) return null;
  var a = Pto_ms_(dia, j.almoco);
  if (marc === 'ALMOCO') return { ref: a, lembrete: a };
  var base = a;
  if (almocoRow && Pto_up_(almocoRow.SITUACAO) === 'CONFIRMADO' && !isNaN(Pto_msDe_(almocoRow.CONFIRMADO_EM)) && Pto_dia_(almocoRow.CONFIRMADO_EM) === dia) base = Pto_msDe_(almocoRow.CONFIRMADO_EM);
  else if (almocoRow && Pto_up_(almocoRow.SITUACAO) === 'ESQUECI' && !isNaN(Pto_min_(Pto_normHora_(almocoRow.HORARIO_INFORMADO)))) base = Pto_ms_(dia, Pto_min_(Pto_normHora_(almocoRow.HORARIO_INFORMADO)));
  var r = base + j.retorno_min * 60000;
  return { ref: r, lembrete: r };
}

/** Confere a ordem da jornada (lança no padrão "o que + por que + o que fazer"). */
function Ponto_conferirJornada_(cfg, pessoa) {
  ['2026-10-19', '2026-10-23'].forEach(function (dia) {
    var j = Ponto_jornada_(cfg, pessoa, dia), qual = Pto_semanaDe_(dia) === 5 ? ' na sexta' : '';
    if (!(j.entrada >= 5 * 60 && j.saida <= 22 * 60)) throw new Error('Não foi possível salvar a jornada: os horários' + qual + ' precisam ficar entre 05:00 e 22:00 (o assistente nunca manda mensagem de madrugada ou à noite). Corrija e salve de novo.');
    if (!(j.entrada < j.saida)) throw new Error('Não foi possível salvar a jornada: a entrada precisa ser antes da saída' + qual + '. Corrija os horários e salve de novo.');
    if (j.almoco !== null && !(j.entrada < j.almoco && j.almoco + j.retorno_min < j.saida)) throw new Error('Não foi possível salvar a jornada: o almoço precisa ficar entre a entrada e a saída, e a volta (almoço + pausa) antes da saída' + qual + '. Corrija e salve de novo.');
  });
}
function Ponto_horaValida_(v, rotulo, vazioOk) {
  var s = Pto_s_(v);
  if (!s && vazioOk) return '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new Error(rotulo + ': use o formato HH:MM (por exemplo 08:00) e salve de novo.');
  return s;
}

// ------------------------------------------------------------
// PESSOAS: cadastro, quem participa, RH e gestão
// ------------------------------------------------------------
function Ponto_usuarios_() {
  var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? (function () { try { return Areas_mapaNomes_(); } catch (e) { return {}; } })() : {};
  var mapa = {};
  Pto_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Pto_up_(u.PERFIL);
    if (!perfil || perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return;
    var login = Pto_s_(u.USUARIO), area = Pto_up_(u.AREA), dono = false;
    try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(login); } catch (e) { dono = false; }
    var sistema = false;
    try { sistema = typeof Areas_contaDoSistema_ === 'function' ? Areas_contaDoSistema_(u) : login.toLowerCase() === 'admin'; } catch (e) { sistema = false; }
    mapa[Pto_s_(u.ID)] = { id: Pto_s_(u.ID), nome: Pto_s_(u.NOME) || login, login: login, perfil: perfil, area: area, areaNome: area ? (nomesAreas[area] || area) : 'Sem área',
      ativo: Pto_up_(u.STATUS || 'ATIVO') === 'ATIVO', email: Pto_s_(u.EMAIL).toLowerCase(), vinculo: Pto_up_(u.VINCULO_TRABALHO).replace(/\s+/g, ''),
      celular: typeof Notificar_normalizarTelefone_ === 'function' ? (Notificar_normalizarTelefone_(u.CELULAR) || Notificar_normalizarTelefone_(u.WHATSAPP) || Notificar_normalizarTelefone_(u.TELEFONE)) : Pto_s_(u.CELULAR),
      diretoria: perfil === 'DIRETORIA' || dono, dono: dono, sistema: sistema };
  });
  return mapa;
}
function Ponto_pessoas_() { var m = {}; Pto_ler_(PONTO_ABAS.PESSOAS).forEach(function (p) { var k = Pto_s_(p.USUARIO_ID); if (k && !m[k]) m[k] = p; }); return m; }

/** RH do assistente: marcados na configuração + perfil RH + área RH (ativos). */
function Ponto_rhIds_(cfg, us) {
  us = us || Ponto_usuarios_();
  var ids = (cfg || Ponto_cfg_()).rhIds.filter(function (id) { return us[id] && us[id].ativo; });
  Object.keys(us).forEach(function (id) { var u = us[id]; if (u.ativo && !u.sistema && (u.perfil === 'RH' || u.area === 'RH') && ids.indexOf(id) < 0) ids.push(id); });
  return ids;
}
/** Quem recebe pedido de ajuste e resumo do RH: o RH; sem RH, a Diretoria; sem ela, os administradores. */
function Ponto_destinosRh_(cfg, us) {
  us = us || Ponto_usuarios_();
  var ids = Ponto_rhIds_(cfg, us);
  if (ids.length) return ids;
  ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].diretoria; });
  if (ids.length) return ids;
  return Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'ADMIN'; });
}
/** Gestão da pessoa: gestores da área dela (Caixa de decisões > Regras e responsáveis) e Gestor com a mesma área; sem ninguém, a Diretoria. */
function Ponto_gestaoDe_(uid, us) {
  us = us || Ponto_usuarios_();
  var u = us[uid], ids = [];
  if (!u) return ids;
  try { var g = typeof Ges_cfg_ === 'function' ? (Ges_cfg_().gestoresPorArea || {})[u.area] : null; (g || []).forEach(function (id) { if (us[id] && us[id].ativo && ids.indexOf(id) < 0) ids.push(id); }); } catch (e) {}
  if (u.area) Object.keys(us).forEach(function (id) { var x = us[id]; if (x.ativo && x.perfil === 'GESTOR' && x.area === u.area && ids.indexOf(id) < 0) ids.push(id); });
  ids = ids.filter(function (id) { return id !== uid; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].diretoria && id !== uid; });
  return ids;
}
/** Áreas que o gestor acompanha: a dele (perfil Gestor) e as da Caixa de decisões. */
function Ponto_areasDoGestor_(eu) {
  var areas = [];
  if (eu.perfil === 'GESTOR' && eu.area) areas.push(eu.area);
  try { if (typeof Ges_cfg_ === 'function' && typeof Ges_areasDoGestor_ === 'function') Ges_areasDoGestor_(eu.id, Ges_cfg_()).forEach(function (a) { if (areas.indexOf(a) < 0) areas.push(a); }); } catch (e) {}
  return areas;
}

/**
 * Pode receber os lembretes? '' = apto; senão o código do motivo. Ordem: inativo, conta do sistema, PJ, vínculo vazio,
 * tirado do assistente, fora do piloto do WhatsApp, sem celular e sem e-mail.
 */
var PONTO_FORA_TEXTO = {
  INATIVO: 'usuário inativo', SISTEMA: 'conta do sistema', PJ: 'PJ: não recebe nada do ponto', DIRETORIA: 'Diretoria: não recebe nada do ponto',
  SEM_VINCULO: 'vínculo de trabalho não informado (cadastre CLT, PJ ou Diretoria em Administração > Usuários > Vínculo)',
  NAO_PARTICIPA: 'tirado do assistente pelo RH (Pessoas e jornadas)', FORA_PILOTO: 'fora da lista do piloto do WhatsApp (Administração > Piloto do WhatsApp)',
  SEM_CONTATO: 'sem celular e sem e-mail no cadastro (Administração > Usuários)'
};
function Ponto_motivoFora_(u, pessoa, pilotoCfg, cfg) {
  if (!u || !u.ativo) return 'INATIVO';
  if (u.sistema) return 'SISTEMA';
  if (u.vinculo === 'PJ') return 'PJ';
  if (u.vinculo === 'DIRETORIA') return 'DIRETORIA';   // 22/10/2026: Diretoria não bate ponto, como PJ
  if (u.vinculo !== 'CLT') return 'SEM_VINCULO';
  if (pessoa && Pto_s_(pessoa.PARTICIPA) && !Pto_verdade_(pessoa.PARTICIPA)) return 'NAO_PARTICIPA';
  if (pilotoCfg && pilotoCfg.ligado && typeof SGO_waPilotoMotivo_ === 'function' && SGO_waPilotoMotivo_({ id: u.id, perfil: u.perfil, telefone: u.celular }, pilotoCfg)) return 'FORA_PILOTO';
  if (!u.celular && !(cfg && cfg.emailReserva && u.email)) return 'SEM_CONTATO';
  return '';
}
function Ponto_pilotoCfg_() { try { return typeof SGO_waPilotoCfg_ === 'function' ? SGO_waPilotoCfg_() : null; } catch (e) { return { ligado: true, usuarios: [], areas: [], telefones: [] }; } }

/** Participantes de hoje: [{ u, pessoa }]. */
function Ponto_participantes_(cfg, us, pessoas, piloto) {
  return Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return !Ponto_motivoFora_(u, pessoas[u.id], piloto, cfg); })
    .map(function (u) { return { u: u, pessoa: pessoas[u.id] || null }; });
}

// ------------------------------------------------------------
// ACESSO
// ------------------------------------------------------------
function Ponto_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = Pto_up_(s.perfil);
  if (perfil === 'CLIENTE') throw new Error('O Assistente do ponto é da equipe interna. Use o menu para voltar ao Início.');
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); } catch (e) { u = null; }
  var dono = false;
  try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(s.usuario); } catch (e) { dono = false; }
  var cfg = Ponto_cfg_();
  var eu = { id: Pto_s_(s.userId), nome: Pto_s_(s.nome) || Pto_s_(s.usuario), login: Pto_s_(s.usuario), perfil: perfil, area: Pto_up_(u && u.AREA),
    vinculo: Pto_up_(u && u.VINCULO_TRABALHO).replace(/\s+/g, '') };
  eu.admin = perfil === 'ADMIN';
  eu.diretoria = perfil === 'DIRETORIA' || dono;
  eu.rh = perfil === 'RH' || eu.area === 'RH' || cfg.rhIds.indexOf(eu.id) >= 0;
  // 21/10/2026 (pedido do dono): ligar, desligar, horários e textos do assistente são rotina da empresa (Administrador,
  // Diretoria, Gestor, RH e Financeiro). Ver o ponto de todos continua com Administrador, Diretoria e RH; o gestor vê a área dele.
  eu.configurar = eu.admin || eu.diretoria || eu.rh || (typeof SGO_ehGestaoRotina_ === 'function' && SGO_ehGestaoRotina_(perfil));
  eu.verTodos = eu.admin || eu.diretoria || eu.rh;
  eu.tratar = eu.verTodos;
  eu.areasGestor = eu.verTodos ? [] : Ponto_areasDoGestor_(eu);
  eu.gestor = !eu.verTodos && eu.areasGestor.length > 0;
  eu.papel = eu.rh ? 'RH' : (eu.admin || eu.diretoria) ? 'GESTAO_GERAL' : eu.gestor ? 'GESTOR' : 'COLABORADOR';
  return eu;
}
/** Ids que a pessoa vê (null = todos). */
function Ponto_idsVisiveis_(eu, us) {
  if (eu.verTodos) return null;
  var ids = [eu.id];
  if (eu.gestor) Object.keys(us).forEach(function (id) { if (eu.areasGestor.indexOf(us[id].area) >= 0 && ids.indexOf(id) < 0) ids.push(id); });
  return ids;
}
function Ponto_exigir_(eu, oQue, acao) {
  var ok = oQue === 'configurar' ? eu.configurar : oQue === 'tratar' ? eu.tratar : oQue === 'pessoas' ? eu.verTodos : oQue === 'equipe' ? (eu.verTodos || eu.gestor) : true;
  if (ok) return eu;
  if (oQue === 'configurar') throw new Error('Não foi possível ' + acao + ': ligar, desligar e mudar a jornada geral do assistente do ponto é da gestão (Administrador, Diretoria, Gestor, RH ou Financeiro). Peça a um deles.');
  if (oQue === 'tratar' || oQue === 'pessoas') throw new Error('Não foi possível ' + acao + ': isso é do RH (perfil RH, área RH no cadastro ou marcado na configuração do assistente), do Administrador ou da Diretoria. O pedido continua na fila do RH.');
  throw new Error('Não foi possível ' + acao + ': o acompanhamento da equipe é do RH e da gestão. Em Assistente do ponto > Meus lembretes você vê os seus.');
}

// ------------------------------------------------------------
// TOKEN DO LINK (confirmação de um toque, sem login)
// v1.<AAAAMMDD>.<20 hex aleatórios, guardados na marcação>.<HMAC-SHA256 32 hex>. Nada pessoal no endereço.
// Vale só naquele dia; uso único (depois de confirmar ou pedir ajuste, o link só mostra a situação).
// p1. = pré-visualização (a página não grava; a pessoa e a marcação ficam no cache por 1 hora).
// ------------------------------------------------------------
function Ponto_segredo_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('PONTO_SEGREDO');
  if (s) return s;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    s = p.getProperty('PONTO_SEGREDO');
    if (!s) { s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); p.setProperty('PONTO_SEGREDO', s); }
    return s;
  } finally { lock.releaseLock(); }
}
function Ponto_hex_(bytes) { return bytes.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? '0' + h : h; }).join(''); }
function Ponto_assinar_(base) { return Ponto_hex_(Utilities.computeHmacSha256Signature(String(base), Ponto_segredo_())).slice(0, 32); }
function Ponto_nonce_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/[^0-9a-f]/gi, '').toLowerCase().slice(0, 20); }
function Ponto_token_(dia, nonce, previa) { var base = (previa ? 'p1' : 'v1') + '.' + Pto_s_(dia).replace(/-/g, '') + '.' + nonce; return base + '.' + Ponto_assinar_(base); }
function Ponto_iguais_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function Ponto_urlBase_() {
  var u = '';
  try { u = String(ScriptApp.getService().getUrl() || ''); } catch (e) { u = ''; }
  u = u.replace(/\/(exec|dev)$/, '').replace(/\/+$/, '');
  return /^https:\/\//.test(u) ? u : PONTO_URL_PADRAO;
}
function Ponto_link_(token) { return Ponto_urlBase_() + '/?ponto=' + token; }

/** Lê o token: { ok, dia, nonce, previa } | { ok:false, motivo: INVALIDO|VENCIDO|FUTURO, dia }. */
function Ponto_lerToken_(tk, quando) {
  var m = /^(v1|p1)\.(\d{8})\.([0-9a-f]{20})\.([0-9a-f]{32})$/.exec(Pto_s_(tk));
  if (!m) return { ok: false, motivo: 'INVALIDO' };
  if (!Ponto_iguais_(Ponto_assinar_(m[1] + '.' + m[2] + '.' + m[3]), m[4])) return { ok: false, motivo: 'INVALIDO' };
  var dia = m[2].slice(0, 4) + '-' + m[2].slice(4, 6) + '-' + m[2].slice(6, 8), hoje = Pto_partes_(quando || new Date()).dia;
  if (dia < hoje) return { ok: false, motivo: 'VENCIDO', dia: dia };
  if (dia > hoje) return { ok: false, motivo: 'FUTURO', dia: dia };
  return { ok: true, dia: dia, nonce: m[3], previa: m[1] === 'p1' };
}

// ------------------------------------------------------------
// MARCAÇÕES: índice (a primeira linha de cada pessoa/dia/marcação é a que vale)
// ------------------------------------------------------------
function Ponto_chave_(uid, dia, marc) { return Pto_s_(uid) + '|' + dia + '|' + marc; }
function Ponto_indice_(filtro) {
  var ix = {};
  Pto_ler_(PONTO_ABAS.MARCACOES).forEach(function (r) {
    var dia = Pto_dia_(r.DIA);
    if (filtro && !filtro(r, dia)) return;
    r.DIA = dia;
    var k = Ponto_chave_(r.USUARIO_ID, dia, Pto_up_(r.MARCACAO));
    if (!ix[k]) ix[k] = r;
  });
  return ix;
}
function Ponto_marcacaoPorToken_(nonce) {
  var achou = null;
  Pto_ler_(PONTO_ABAS.MARCACOES).some(function (r) { if (Pto_s_(r.TOKEN_ID) === nonce) { achou = r; return true; } return false; });
  if (achou) achou.DIA = Pto_dia_(achou.DIA);
  return achou;
}

// ------------------------------------------------------------
// AUSÊNCIAS E ATENDIMENTO
// ------------------------------------------------------------
/** Ausências que cobrem o dia: { uid: [{ de, ate, motivo }] } — Programa de conduta (férias, afastamento) e dispensas do ponto. */
function Ponto_ausencias_(dia) {
  var m = {}, add = function (uid, de, ate, motivo) { if (uid && de && ate && de <= dia && dia <= ate) (m[uid] = m[uid] || []).push({ de: de, ate: ate, motivo: motivo }); };
  try {
    if (typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS && CONDUTA_SHEETS.AUSENCIA) {
      Pto_ler_(CONDUTA_SHEETS.AUSENCIA).forEach(function (a) {
        if (Pto_s_(a.EXCLUIDA_EM)) return;
        add(Pto_s_(a.COLABORADOR_ID), Pto_dia_(a.DATA_INICIO), Pto_dia_(a.DATA_FIM), Pto_up_(a.TIPO) === 'FERIAS' ? 'férias (Programa de conduta)' : 'afastamento (Programa de conduta)');
      });
    }
  } catch (e) {}
  Pto_ler_(PONTO_ABAS.DISPENSAS).forEach(function (d) {
    if (Pto_s_(d.EXCLUIDA_EM)) return;
    add(Pto_s_(d.USUARIO_ID), Pto_dia_(d.DE), Pto_dia_(d.ATE), (PONTO_MOTIVOS_DISPENSA[Pto_up_(d.MOTIVO)] || 'dispensa').toLowerCase() + ' (lançada pelo RH)');
  });
  return m;
}
function Ponto_abaAuvo_() { return (SGO_CFG.SHEETS && SGO_CFG.SHEETS.AUVO_TAREFAS) || 'AUVO_TAREFAS'; }
/** Tarefas do Auvo do dia por técnico (lidas uma vez por rodada). */
function Ponto_tarefasAuvo_(dia) {
  var m = {};
  try {
    // 21/10/2026: fonte única (Auvo + O.S. da Assistência do SGO+): o técnico em atendimento no aplicativo novo também conta
    (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Pto_ler_(Ponto_abaAuvo_())).forEach(function (t) {
      var uid = Pto_s_(t.TECNICO_ID_SGO);
      if (!uid) return;
      var ci = Pto_msDe_(t.CHECKIN_EM), co = Pto_msDe_(t.CHECKOUT_EM);
      var doDia = (!isNaN(ci) && Pto_dia_(new Date(ci)) === dia) || (!isNaN(co) && Pto_dia_(new Date(co)) === dia);
      if (doDia) (m[uid] = m[uid] || []).push({ id: Pto_s_(t.AUVO_TASK_ID) || Pto_s_(t.ID), ci: ci, co: co, finalizada: Pto_up_(t.FINALIZADA) === 'SIM', cliente: Pto_s_(t.CLIENTE_NOME_AUVO), origem: Pto_s_(t.ORIGEM) || 'AUVO' });
    });
  } catch (e) {}
  return m;
}
/** Em atendimento agora (check-in de hoje sem check-out e não finalizada). Devolve a tarefa ou null. */
function Ponto_emAtendimento_(tarefas, uid, agoraMs) {
  return (tarefas[uid] || []).filter(function (t) { return !isNaN(t.ci) && t.ci <= agoraMs && isNaN(t.co) && !t.finalizada; })[0] || null;
}
/** Evidência para o pedido de ajuste: só os horários de check-in e check-out do Auvo naquele dia (sem local, sem cliente). */
function Ponto_evidencia_(uid, dia) {
  var l = (Ponto_tarefasAuvo_(dia)[uid] || []).map(function (t) {
    return (t.origem === 'SGO' ? 'SGO+ (O.S. ' + t.id + '): chegada ' : 'Auvo (tarefa ' + t.id + '): check-in ') + (isNaN(t.ci) ? '—' : Pto_horaDe_(new Date(t.ci))) + (t.origem === 'SGO' ? ', conclusão ' : ', check-out ') + (isNaN(t.co) ? 'não feito' : Pto_horaDe_(new Date(t.co)));
  });
  return l.join('; ');
}

// ------------------------------------------------------------
// AVISOS NO SISTEMA (e-mail guardado para o expediente; nunca WhatsApp)
// ------------------------------------------------------------
function Ponto_avisar_(destId, tipo, titulo, texto, ref, comEmail) {
  if (!destId) return;
  try {
    SGO_DATA.insert(PONTO_ABAS.AVISOS, { DESTINATARIO_ID: Pto_s_(destId), TIPO: tipo, TITULO: Pto_texto_(titulo, 200), TEXTO: Pto_s_(texto).slice(0, 2000), REF_TIPO: Pto_s_(ref && ref.tipo),
      REF_ID: Pto_s_(ref && ref.id), DATA: Pto_agoraIso_(new Date()), LIDO_EM: '', EMAIL_SITUACAO: comEmail ? 'PENDENTE' : '', EMAIL_EM: '', EMAIL_MOTIVO: '' });
  } catch (e) { console.error('Assistente do ponto, aviso: ' + ((e && e.message) || e)); }
}
