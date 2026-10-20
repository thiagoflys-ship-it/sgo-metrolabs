/****************************************************
 * MINHAS ATIVIDADES / ATIVIDADES DA EQUIPE — servidor (2026-10-16)
 *
 * Atividades de trabalho com responsável, prazo, situação e histórico.
 * Tela em JS_Atividades.html (incluída direto no Index, porque a janela
 * de justificativa de atraso e o Kanban de cada módulo precisam existir
 * desde o login, fora de qualquer módulo).
 *
 * Abas próprias no banco principal (criadas sob demanda, idempotente,
 * mesmo padrão de CertCal_garantirTabela_ usado por Conduta/Auvo/CertCal —
 * NUNCA usar setupSGO() aqui):
 *  ATV_ATIVIDADES — uma linha por atividade.
 *  ATV_HISTORICO  — criação, mudanças de situação, comentários,
 *                   justificativas de atraso, "fazendo agora", edições
 *                   (EDICAO), replanejamento da gestão (REPLANEJAMENTO)
 *                   e troca de responsável (RESPONSAVEL).
 *  ATV_AVISOS     — avisos para uma pessoa (ex.: gestor avisado da
 *                   justificativa), lidos no painel/toast.
 *
 * Datas gravadas como texto no horário de Brasília, "aaaa-mm-ddThh:mm"
 * (comparáveis como texto). Nada de Date cru volta ao navegador.
 *
 * Perfis: lançar atividade para OUTRA pessoa = Gestor, Admin, Diretoria
 * (isAdminPerfilAuth_, SGO_Auth.js). Demais perfis só criam para si.
 * Perfil CLIENTE não usa o módulo.
 *
 * 19/10/2026 — equipe inteira e COMMAND:
 *  - VER: todo perfil interno vê a equipe (Gantt, Kanban, lista). Fica fora
 *    só a atividade restrita (RESTRITA = SIM, ou do Programa de conduta),
 *    que só o responsável, quem lançou e a gestão veem.
 *  - ALTERAR (situação, comentário, andamento): só o responsável, quem
 *    lançou e a gestão. Os demais só veem. Editar os campos continua com
 *    a gestão e com quem lançou para si (Atividades_podeEditar_).
 *  - A justificativa de atraso (texto) só aparece para os envolvidos e a
 *    gestão; os demais veem que houve justificativa e a nova previsão.
 *  - COMMAND: uma fonte só. O COMMAND lê e grava pela ponte assinada
 *    (SGO_PonteCommand.js, ações "atividades.*" -> Atividades_ponte_), em
 *    nome do usuário do SGO+ ligado à conta (sgo_id). As MESMAS funções e
 *    regras daqui atendem as duas telas. SISTEMA_ORIGEM diz onde foi lançada.
 *  - 5W2H opcional na atividade: o quê (título), por quê, onde, quando
 *    (prazo), quem (responsável), como, quanto. O PDCA fica no plano de
 *    ação do Programa de conduta (SGO_Conduta_Qualidade.js), cujas ações
 *    são atividades daqui.
 *  - Avisos (SGO_Atividades_Avisos.js): no sistema na hora (ATV_AVISOS e a
 *    central de pendências, que cobra até concluir ou justificar); e-mail
 *    só no expediente (fora dele fica guardado e sai na abertura do próximo
 *    expediente); WhatsApp só no resumo diário, no máximo um por pessoa por
 *    dia, em dia útil e no horário de trabalho, sem repetir cobrança.
 ****************************************************/

var ATV_SITUACOES = ['A fazer', 'Em andamento', 'Aguardando', 'Concluída', 'Cancelada'];
var ATV_PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente'];
var ATV_FUSO = 'America/Sao_Paulo';

var ATV_COLUNAS = [
  'ID', 'TITULO', 'DESCRICAO', 'MODULO', 'MODULO_NOME', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME',
  'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'PRIORIDADE',
  'INICIO_PREVISTO', 'PRAZO', 'PREVISAO_ATUAL', 'SITUACAO', 'PERCENTUAL', 'INICIADA_EM', 'CONCLUIDA_EM',
  'AGORA_DESDE', 'MOTIVO_AGUARDANDO', 'OBS_CONCLUSAO', 'QTD_JUSTIFICATIVAS', 'ATUALIZADO_EM', 'CRIADO_EM',
  // 2026-10-16: previsão cujo atraso já foi avisado por e-mail/WhatsApp (um aviso por atraso;
  // nova previsão vencida = novo atraso = novo aviso). Ver Atividades_notificarAtrasos_.
  'ATRASO_AVISADO_PREV',
  // 19/10/2026: sistema onde foi lançada (SGO+ ou COMMAND), 5W2H opcional e atividade restrita.
  'SISTEMA_ORIGEM', 'POR_QUE', 'ONDE', 'COMO', 'QUANTO', 'RESTRITA'
];
var ATV_COLUNAS_HIST = [
  'ID', 'ATIVIDADE_ID', 'TIPO', 'USUARIO_ID', 'USUARIO_NOME', 'DATA', 'DE', 'PARA', 'TEXTO',
  'PREVISAO_ANTERIOR', 'PREVISAO_NOVA', 'CRIADO_EM',
  'CATEGORIA' // 19/10/2026: motivo da justificativa de atraso (ATV_MOTIVOS_ATRASO), para os indicadores
];
// EMAIL_*: fila do e-mail do aviso (PENDENTE até sair no expediente; ENVIADO; PULADO). Ver SGO_Atividades_Avisos.js.
var ATV_COLUNAS_AVISOS = ['ID', 'DESTINATARIO_ID', 'ATIVIDADE_ID', 'TIPO', 'TITULO', 'TEXTO', 'DATA', 'LIDO_EM', 'CRIADO_EM', 'EMAIL_SITUACAO', 'EMAIL_EM', 'EMAIL_MOTIVO'];
/** Motivo do atraso, escolhido na justificativa (o texto continua obrigatório). */
var ATV_MOTIVOS_ATRASO = [
  'Aguardando cliente', 'Aguardando peça ou material', 'Aguardando outra área ou pessoa', 'Outra prioridade definida pela gestão',
  'Volume de trabalho acima do previsto', 'Problema técnico ou de equipamento', 'Prazo estimado curto demais', 'Ausência (férias, folga ou afastamento)', 'Outro motivo'
];
var ATV_SISTEMAS = ['SGO+', 'COMMAND'];

// ------------------------------------------------------------
// INFRA
// ------------------------------------------------------------
function Atividades_abas_() {
  return {
    ATIVIDADES: SGO_CFG.SHEETS.ATV_ATIVIDADES || 'ATV_ATIVIDADES',
    HISTORICO: SGO_CFG.SHEETS.ATV_HISTORICO || 'ATV_HISTORICO',
    AVISOS: SGO_CFG.SHEETS.ATV_AVISOS || 'ATV_AVISOS'
  };
}

/** Cria/completa as abas sob demanda. Guardado em cache para não conferir a planilha a cada chamada. */
function Atividades_garantirAbas_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('ATV_ABAS_OK_V3')) return;
  var abas = Atividades_abas_();
  CertCal_garantirTabela_(abas.ATIVIDADES, ATV_COLUNAS);
  CertCal_garantirTabela_(abas.HISTORICO, ATV_COLUNAS_HIST);
  CertCal_garantirTabela_(abas.AVISOS, ATV_COLUNAS_AVISOS);
  ATV_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(abas.ATIVIDADES, c); });
  ATV_COLUNAS_HIST.forEach(function (c) { CertCal_garantirColuna_(abas.HISTORICO, c); });
  ATV_COLUNAS_AVISOS.forEach(function (c) { CertCal_garantirColuna_(abas.AVISOS, c); });
  // Datas são texto "aaaa-mm-ddThh:mm": trava o formato para a planilha não converter sozinha.
  ['INICIO_PREVISTO', 'PRAZO', 'PREVISAO_ATUAL', 'INICIADA_EM', 'CONCLUIDA_EM', 'AGORA_DESDE', 'ATUALIZADO_EM', 'ATRASO_AVISADO_PREV'].forEach(function (c) {
    CertCal_forcarColunaTexto_(abas.ATIVIDADES, c);
  });
  ['DATA', 'PREVISAO_ANTERIOR', 'PREVISAO_NOVA'].forEach(function (c) { CertCal_forcarColunaTexto_(abas.HISTORICO, c); });
  CertCal_forcarColunaTexto_(abas.AVISOS, 'DATA');
  CertCal_forcarColunaTexto_(abas.AVISOS, 'LIDO_EM');
  CertCal_forcarColunaTexto_(abas.AVISOS, 'EMAIL_EM');
  cache.put('ATV_ABAS_OK_V3', '1', 21600);
}

// Chamada vinda do COMMAND pela ponte (Atividades_ponte_): enquanto a ação roda, as APIs abaixo
// aceitam este identificador de uso único no lugar da sessão. Ele é sorteado no servidor e
// descartado no fim da mesma execução; o navegador nunca o conhece.
var ATV_PONTE_CTX = null;

/** Sessão válida e perfil que pode usar o módulo. Lança erro com mensagem para a tela. */
function Atividades_sessao_(sessionId) {
  if (ATV_PONTE_CTX && ATV_PONTE_CTX.token && sessionId === ATV_PONTE_CTX.token) return ATV_PONTE_CTX.eu;
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (perfil === 'CLIENTE') {
    throw new Error('Não foi possível abrir as atividades: o perfil Cliente não usa este módulo. Se precisar, peça acesso de colaborador ao administrador.');
  }
  Atividades_garantirAbas_();
  return {
    id: SGO_UTILS.safe(s.userId),
    usuario: SGO_UTILS.safe(s.usuario),
    nome: SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario),
    perfil: perfil,
    gestor: isAdminPerfilAuth_(perfil)
  };
}

function Atividades_exigirGestor_(eu, acao) {
  if (!eu.gestor) {
    throw new Error('Não foi possível ' + acao + ': esta ação é só para os perfis Gestor, Admin e Diretoria. Peça a um gestor para fazer, ou lance a atividade para você mesmo.');
  }
}

function Atividades_agora_() {
  return Utilities.formatDate(new Date(), ATV_FUSO, "yyyy-MM-dd'T'HH:mm");
}

function Atividades_menosDias_(dias) {
  return Utilities.formatDate(new Date(Date.now() - dias * 86400000), ATV_FUSO, "yyyy-MM-dd'T'HH:mm");
}

/** Normaliza "aaaa-mm-dd", "aaaa-mm-ddThh:mm(:ss)" ou Date para "aaaa-mm-ddThh:mm". Vazio se inválido. */
function Atividades_normData_(v, horaPadrao) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, ATV_FUSO, "yyyy-MM-dd'T'HH:mm");
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return '';
  var mes = Number(m[2]), dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
  return m[1] + '-' + m[2] + '-' + m[3] + 'T' + (m[4] ? m[4] + ':' + m[5] : (horaPadrao || '23:59'));
}

function Atividades_dataBr_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : '';
}

function Atividades_texto_(v, max) {
  var s = SGO_UTILS.safe(v);
  return max && s.length > max ? s.slice(0, max) : s;
}

/** 5W2H opcional (o quê = título, quando = prazo, quem = responsável já são campos próprios). */
function Atividades_campos5w2h_(p) {
  return {
    POR_QUE: Atividades_texto_(p.porQue, 1000), ONDE: Atividades_texto_(p.onde, 300),
    COMO: Atividades_texto_(p.como, 2000), QUANTO: Atividades_texto_(p.quanto, 300)
  };
}

function Atividades_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    // toda gravação das atividades passa por aqui: o Início e o painel recalculam as pendências
    if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  }
}

// E-mails pedidos durante a chamada (avisos com EMAIL_SITUACAO = PENDENTE): só saem depois que
// a gravação deu certo e a trava foi solta, e só no expediente (SGO_Atividades_Avisos.js).
// Aqui ficam só os destinatários a conferir; se a chamada falhar, nada é enviado agora
// (o aviso já gravado sai na rotina de hora em hora, no expediente).
var ATV_FILA_NTF = [];

function Atividades_enviarFila_() {
  var fila = ATV_FILA_NTF;
  ATV_FILA_NTF = [];
  if (!fila.length) return;
  try { if (typeof Atividades_enviarEmailsPendentes_ === 'function') Atividades_enviarEmailsPendentes_(fila); }
  catch (e) { console.error('Atividades e-mails: ' + ((e && e.message) || e)); }
}

function Atividades_resposta_(fn) {
  ATV_FILA_NTF = [];
  try {
    var r = fn();
    var saida = JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
    Atividades_enviarFila_();
    return saida;
  } catch (e) {
    ATV_FILA_NTF = [];
    return { ok: false, message: String((e && e.message) || e) };
  }
}

function Atividades_textoNtf_(a, extra) {
  var linhas = [extra];
  linhas.push('Atividade: ' + a.TITULO);
  if (a.DESCRICAO) linhas.push('Descrição: ' + a.DESCRICAO);
  if (a.MODULO_NOME) linhas.push('Módulo: ' + a.MODULO_NOME);
  if (a.CLIENTE_NOME) linhas.push('Cliente: ' + a.CLIENTE_NOME + (a.UNIDADE_NOME ? ' - ' + a.UNIDADE_NOME : ''));
  if (a.PRIORIDADE) linhas.push('Prioridade: ' + a.PRIORIDADE);
  linhas.push('Prazo: ' + Atividades_dataBr_(a.PREVISAO_ATUAL || a.PRAZO) + '.');
  linhas.push('Veja em Minhas atividades, no SGO+ ou no COMMAND.');
  return linhas.join('\n');
}

/**
 * Atraso: grava UM aviso por atraso para o responsável (marca a previsão avisada em
 * ATRASO_AVISADO_PREV; nova previsão que vencer = novo aviso). O aviso nasce lido (a cobrança
 * na tela é a janela de justificativa e a central de pendências) e leva o e-mail, que sai no
 * expediente. Chamado pela verificação periódica das telas (no máximo a cada 10 min) e pela
 * rotina de hora em hora (Atividades_rotinaAtrasos).
 */
function Atividades_notificarAtrasos_() {
  var agora = Atividades_agora_();
  var avisar = [];
  Atividades_comTrava_(function () {
    Atividades_todas_().forEach(function (a) {
      if (!Atividades_vencida_(a, agora) || !a.RESPONSAVEL_ID) return;
      if (a.ATRASO_AVISADO_PREV && a.ATRASO_AVISADO_PREV === a.PREVISAO_ATUAL) return;
      SGO_DATA.update(Atividades_abas_().ATIVIDADES, a.ID, { ATRASO_AVISADO_PREV: a.PREVISAO_ATUAL });
      Atividades_avisar_(a.RESPONSAVEL_ID, a.ID, 'ATRASO', 'Atividade atrasada: ' + a.TITULO,
        'A atividade passou da previsão de entrega (' + Atividades_dataBr_(a.PREVISAO_ATUAL) + ') e ainda está aberta. Registre a justificativa de atraso com a nova previsão, ou conclua a atividade.',
        { email: true, lido: true });
      avisar.push(a);
    });
  });
  return avisar.length;
}

function Atividades_verificarAtrasosTalvez_() {
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('ATV_ATRASOS_CHECADO')) return;
    cache.put('ATV_ATRASOS_CHECADO', '1', 600);
    Atividades_garantirRotina_();
    Atividades_notificarAtrasos_();
  } catch (e) { console.error('Atividades atrasos: ' + ((e && e.message) || e)); }
}

/** Gatilho de hora em hora: avisa atrasos mesmo sem ninguém com o SGO+ aberto. */
function Atividades_garantirRotina_() {
  var props = PropertiesService.getScriptProperties();
  var hoje = Atividades_agora_().slice(0, 10);
  if (props.getProperty('ATV_ROTINA_CHECADA_EM') === hoje) return;
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'Atividades_rotinaAtrasos'; });
  if (!tem) ScriptApp.newTrigger('Atividades_rotinaAtrasos').timeBased().everyHours(1).create();
  props.setProperty('ATV_ROTINA_CHECADA_EM', hoje);
}

/**
 * Gatilho de hora em hora (nome sem "_" no fim para o gatilho de tempo do Google achar a função).
 * Não recebe nem devolve dado de ninguém: só dispara os avisos de atraso ainda não enviados
 * (cada atraso uma vez), então é inofensiva se chamada de outro lugar.
 */
function Atividades_rotinaAtrasos() {
  // Rotina do gatilho: recusada quando chamada pelo navegador (SGO_Main.js SGO_execucaoInterna_).
  if (!SGO_execucaoInterna_()) return 0;
  Atividades_garantirAbas_();
  ATV_FILA_NTF = [];
  var n = Atividades_notificarAtrasos_();
  ATV_FILA_NTF = [];
  // e-mails guardados (inclusive os que chegaram fora do expediente) e o resumo diário do WhatsApp
  try { if (typeof Atividades_enviarEmailsPendentes_ === 'function') Atividades_enviarEmailsPendentes_(null); } catch (e) { console.error('Atividades e-mails: ' + ((e && e.message) || e)); }
  try { if (typeof Atividades_resumoDiario_ === 'function') Atividades_resumoDiario_(); } catch (e) { console.error('Atividades resumo: ' + ((e && e.message) || e)); }
  return n;
}

// ------------------------------------------------------------
// LEITURA
// ------------------------------------------------------------
function Atividades_todas_() {
  return SGO_DATA.getAll(Atividades_abas_().ATIVIDADES).map(Atividades_limpar_);
}

/** Linha da planilha -> objeto para o navegador (só strings/números). */
function Atividades_limpar_(r) {
  var o = {};
  ATV_COLUNAS.forEach(function (c) { o[c] = r[c] === undefined || r[c] === null ? '' : r[c]; });
  ['INICIO_PREVISTO', 'PRAZO', 'PREVISAO_ATUAL', 'INICIADA_EM', 'CONCLUIDA_EM', 'AGORA_DESDE', 'ATUALIZADO_EM', 'ATRASO_AVISADO_PREV'].forEach(function (c) {
    o[c] = Atividades_normData_(o[c], '00:00');
  });
  o.CRIADO_EM = String(o.CRIADO_EM || '');
  if (!o.PREVISAO_ATUAL) o.PREVISAO_ATUAL = o.PRAZO;
  var p = Number(String(o.PERCENTUAL).replace(',', '.'));
  o.PERCENTUAL = isFinite(p) && String(o.PERCENTUAL) !== '' ? Math.max(0, Math.min(100, Math.round(p))) : '';
  o.QTD_JUSTIFICATIVAS = Number(o.QTD_JUSTIFICATIVAS) || 0;
  o.SITUACAO = ATV_SITUACOES.indexOf(o.SITUACAO) >= 0 ? o.SITUACAO : 'A fazer';
  o.SISTEMA_ORIGEM = ATV_SISTEMAS.indexOf(String(o.SISTEMA_ORIGEM)) >= 0 ? String(o.SISTEMA_ORIGEM) : 'SGO+';
  ['POR_QUE', 'ONDE', 'COMO', 'QUANTO', 'RESTRITA'].forEach(function (c) { o[c] = String(o[c] === undefined || o[c] === null ? '' : o[c]); });
  return o;
}

function Atividades_aberta_(a) {
  return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada';
}

function Atividades_vencida_(a, agora) {
  return Atividades_aberta_(a) && !!a.PREVISAO_ATUAL && a.PREVISAO_ATUAL < agora;
}

function Atividades_obter_(id) {
  var alvo = SGO_UTILS.safe(id);
  if (!alvo) throw new Error('Não foi possível localizar a atividade: identificação não informada. Feche a janela e abra a atividade de novo.');
  var r = SGO_DATA.getById(Atividades_abas_().ATIVIDADES, alvo);
  if (!r) throw new Error('Não foi possível localizar a atividade: ela não existe mais no banco. Atualize a tela para ver a lista atual.');
  return Atividades_limpar_(r);
}

/** Responsável ou quem lançou. */
function Atividades_envolvido_(eu, a) {
  return !!eu.id && (a.RESPONSAVEL_ID === eu.id || a.CRIADO_POR_ID === eu.id);
}

/** Restrita: marcada ao lançar ou ligada ao Programa de conduta (ação de plano disciplinar não é da equipe toda). */
function Atividades_restrita_(a) {
  return SGO_UTILS.safeUpper(a.RESTRITA) === 'SIM' || a.MODULO === 'conduta';
}

/** Ver: toda a equipe interna, menos atividade restrita de outra pessoa. */
function Atividades_podeVer_(eu, a) {
  if (eu.gestor || Atividades_envolvido_(eu, a)) return true;
  return !Atividades_restrita_(a);
}

/** Alterar situação, comentar: só o responsável, quem lançou e a gestão. */
function Atividades_podeAlterar_(eu, a) {
  return eu.gestor || Atividades_envolvido_(eu, a);
}

/** Atividade para a tela, com o que esta pessoa pode fazer nela (a tela só mostra; o servidor confere de novo). */
function Atividades_paraTela_(eu, a) {
  var o = Object.assign({}, a);
  o.PODE_ALTERAR = Atividades_podeAlterar_(eu, a);
  o.PODE_EDITAR = Atividades_podeEditar_(eu, a);
  o.ENVOLVIDO = Atividades_envolvido_(eu, a);
  o.RESTRITA = Atividades_restrita_(a) ? 'SIM' : '';
  o.SISTEMA_ORIGEM = o.SISTEMA_ORIGEM || 'SGO+';
  return o;
}

/** Quem vê o texto da justificativa de atraso: envolvidos e gestão. */
function Atividades_veJustificativa_(eu, a) {
  return eu.gestor || Atividades_envolvido_(eu, a);
}

/** Pessoa do SGO+ pelo ID (chamadas da ponte do COMMAND). Lança erro com mensagem para a tela. */
function Atividades_euDoUsuario_(userId, sistema) {
  var id = SGO_UTILS.safe(userId);
  if (!id) throw new Error('Não foi possível abrir as atividades: a sua conta do COMMAND não está ligada a um usuário do SGO+. Peça ao administrador para ligar a conta em Usuários e papéis (Migrar do SGO+).');
  var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, id);
  if (!u) throw new Error('Não foi possível abrir as atividades: o usuário do SGO+ ligado à sua conta não existe mais. Peça ao administrador para ligar a conta de novo em Usuários e papéis.');
  if (SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') !== 'ATIVO') throw new Error('Não foi possível abrir as atividades: o seu usuário está inativo no SGO+. Peça ao administrador para reativar em Administração > Usuários.');
  var perfil = SGO_UTILS.safeUpper(u.PERFIL);
  if (perfil === 'CLIENTE') throw new Error('Não foi possível abrir as atividades: o perfil Cliente não usa este módulo.');
  Atividades_garantirAbas_();
  return { id: String(u.ID), usuario: SGO_UTILS.safe(u.USUARIO), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), perfil: perfil, gestor: isAdminPerfilAuth_(perfil), sistema: sistema || 'COMMAND' };
}

function Atividades_usuariosAtivos_() {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function (u) {
      return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE';
    })
    .map(function (u) { return { id: String(u.ID), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), perfil: SGO_UTILS.safeUpper(u.PERFIL) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

function Atividades_historico_(atividadeId) {
  return SGO_DATA.getAll(Atividades_abas_().HISTORICO)
    .filter(function (h) { return String(h.ATIVIDADE_ID) === String(atividadeId); })
    .map(Atividades_limparHist_)
    .sort(Atividades_ordemHistDesc_);
}

/** Mais recente primeiro; no mesmo minuto, desempata pelo carimbo CRIADO_EM (com segundos). */
function Atividades_ordemHistDesc_(a, b) {
  var ka = a.DATA + "|" + a.CRIADO_EM, kb = b.DATA + "|" + b.CRIADO_EM;
  return ka < kb ? 1 : ka > kb ? -1 : 0;
}

function Atividades_limparHist_(h) {
  var o = {};
  ATV_COLUNAS_HIST.forEach(function (c) { o[c] = h[c] === undefined || h[c] === null ? '' : String(h[c]); });
  o.DATA = Atividades_normData_(o.DATA, '00:00');
  o.PREVISAO_ANTERIOR = Atividades_normData_(o.PREVISAO_ANTERIOR, '00:00');
  o.PREVISAO_NOVA = Atividades_normData_(o.PREVISAO_NOVA, '00:00');
  return o;
}

// ------------------------------------------------------------
// ESCRITA
// ------------------------------------------------------------
function Atividades_registrarHist_(eu, atividadeId, tipo, extra) {
  var e = extra || {};
  SGO_DATA.insert(Atividades_abas_().HISTORICO, {
    ATIVIDADE_ID: atividadeId, TIPO: tipo, USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: Atividades_agora_(),
    DE: e.de || '', PARA: e.para || '', TEXTO: Atividades_texto_(e.texto, 4000),
    PREVISAO_ANTERIOR: e.previsaoAnterior || '', PREVISAO_NOVA: e.previsaoNova || '', CATEGORIA: e.categoria || ''
  });
}

/**
 * Aviso no sistema (toast no SGO+ e no COMMAND, central de pendências).
 * opcoes.email: o aviso também vai por e-mail (fila: sai depois da gravação, só no expediente).
 * opcoes.lido: já nasce lido (aviso que só carrega o e-mail; a cobrança na tela é outra).
 */
function Atividades_avisar_(destinatarioId, atividadeId, tipo, titulo, texto, opcoes) {
  if (!destinatarioId) return;
  var o = opcoes || {};
  var agora = Atividades_agora_();
  SGO_DATA.insert(Atividades_abas_().AVISOS, {
    DESTINATARIO_ID: destinatarioId, ATIVIDADE_ID: atividadeId, TIPO: tipo,
    TITULO: Atividades_texto_(titulo, 200), TEXTO: Atividades_texto_(texto, 2000), DATA: agora, LIDO_EM: o.lido ? agora : '',
    EMAIL_SITUACAO: o.email ? 'PENDENTE' : '', EMAIL_EM: '', EMAIL_MOTIVO: ''
  });
  if (o.email && ATV_FILA_NTF.indexOf(String(destinatarioId)) < 0) ATV_FILA_NTF.push(String(destinatarioId));
}

function Atividades_gravar_(id, dados) {
  dados.ATUALIZADO_EM = Atividades_agora_();
  var ok = SGO_DATA.update(Atividades_abas_().ATIVIDADES, id, dados);
  if (!ok) throw new Error('Não foi possível gravar a atividade: ela não foi encontrada no banco. Atualize a tela e tente de novo.');
}

// ------------------------------------------------------------
// API — todas validam sessão e perfil em toda chamada
// ------------------------------------------------------------

/** Opções dos formulários: pessoas, clientes e quem sou eu. */
function Atividades_apiOpcoes(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var usuarios = Atividades_usuariosAtivos_();
    if (!eu.gestor) usuarios = usuarios.filter(function (u) { return u.id === eu.id; });
    if (!usuarios.some(function (u) { return u.id === eu.id; })) usuarios.unshift({ id: eu.id, nome: eu.nome, perfil: eu.perfil });
    var clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES)
      .filter(function (c) { return SGO_UTILS.safeUpper(c.STATUS || 'ATIVO') === 'ATIVO'; })
      .map(function (c) { return { ID: String(c.ID), NOME: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL), CNPJ: SGO_UTILS.safe(c.CNPJ) }; })
      .sort(function (a, b) { return a.NOME.localeCompare(b.NOME); });
    return {
      eu: { id: eu.id, nome: eu.nome, perfil: eu.perfil, gestor: eu.gestor, configuraAvisos: eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' },
      usuarios: usuarios, clientes: clientes, situacoes: ATV_SITUACOES, prioridades: ATV_PRIORIDADES, motivosAtraso: ATV_MOTIVOS_ATRASO, agora: Atividades_agora_()
    };
  });
}

function Atividades_apiUnidades(sessionId, payload) {
  return Atividades_resposta_(function () {
    Atividades_sessao_(sessionId);
    var clienteId = SGO_UTILS.safe(payload && payload.clienteId);
    if (!clienteId) return { unidades: [] };
    var unidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES)
      .filter(function (u) { return String(u.CLIENTE_ID) === clienteId && SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO'; })
      .map(function (u) { return { ID: String(u.ID), NOME: SGO_UTILS.safe(u.NOME_UNIDADE) }; })
      .sort(function (a, b) { return a.NOME.localeCompare(b.NOME); });
    return { unidades: unidades };
  });
}

/** Atividades em que sou o responsável. */
function Atividades_apiListarMinhas(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var itens = Atividades_todas_().filter(function (a) { return a.RESPONSAVEL_ID === eu.id; }).map(function (a) { return Atividades_paraTela_(eu, a); });
    return { itens: itens, agora: Atividades_agora_() };
  });
}

/**
 * Kanban de um módulo: todas as atividades daquele módulo que a pessoa pode ver (a equipe inteira,
 * menos as restritas de outras pessoas). Cada item diz se a pessoa pode alterar.
 */
function Atividades_apiListarModulo(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var modulo = SGO_UTILS.safe(payload && payload.modulo);
    if (!/^[a-z0-9_]{1,60}$/.test(modulo)) throw new Error('Não foi possível abrir as atividades do módulo: módulo não identificado. Abra o módulo pelo menu e tente de novo.');
    var itens = Atividades_todas_().filter(function (a) { return a.MODULO === modulo && a.SITUACAO !== 'Cancelada' && Atividades_podeVer_(eu, a); })
      .map(function (a) { return Atividades_paraTela_(eu, a); });
    return { itens: itens, agora: Atividades_agora_(), gestor: eu.gestor };
  });
}

function Atividades_apiDetalhe(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var a = Atividades_obter_(payload && payload.id);
    if (!Atividades_podeVer_(eu, a)) throw new Error('Não foi possível abrir a atividade: ela é restrita. Só o responsável, quem lançou e a gestão veem atividades restritas e as do Programa de conduta.');
    var veJust = Atividades_veJustificativa_(eu, a);
    var hist = Atividades_historico_(a.ID).map(function (h) {
      if (h.TIPO === 'JUSTIFICATIVA' && !veJust) { h.TEXTO = ''; h.CATEGORIA = ''; h.OCULTO = true; }
      return h;
    });
    var plano = typeof Atividades_planoDaAtividade_ === 'function' ? Atividades_planoDaAtividade_(a) : null;
    return { item: Atividades_paraTela_(eu, a), historico: hist, plano: plano, agora: Atividades_agora_(), eu: { id: eu.id, gestor: eu.gestor } };
  });
}

function Atividades_apiCriar(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var titulo = Atividades_texto_(p.titulo, 200);
    if (titulo.length < 3) throw new Error('Não foi possível salvar a atividade: o título está vazio ou curto demais. Escreva no campo Título o que precisa ser feito (mínimo 3 letras) e clique em Salvar atividade de novo.');
    var prazo = Atividades_normData_(p.prazo, '18:00');
    if (!prazo) throw new Error('Não foi possível salvar a atividade: o prazo não foi informado. Preencha o campo Prazo com data e hora e clique em Salvar atividade de novo.');
    var inicio = Atividades_normData_(p.inicioPrevisto, '08:00');
    if (p.inicioPrevisto && !inicio) throw new Error('Não foi possível salvar a atividade: o início previsto é inválido. Corrija a data ou deixe o campo vazio.');
    if (inicio && inicio > prazo) throw new Error('Não foi possível salvar a atividade: o início previsto está depois do prazo. Ajuste uma das duas datas e clique em Salvar atividade de novo.');
    var prioridade = ATV_PRIORIDADES.indexOf(p.prioridade) >= 0 ? p.prioridade : 'Normal';

    var respId = SGO_UTILS.safe(p.responsavelId) || eu.id;
    var respNome = eu.nome;
    if (respId !== eu.id) {
      Atividades_exigirGestor_(eu, 'lançar atividade para outra pessoa');
      var resp = Atividades_usuariosAtivos_().filter(function (u) { return u.id === respId; })[0];
      if (!resp) throw new Error('Não foi possível lançar a atividade: o responsável escolhido não está ativo no SGO+. Escolha outra pessoa na lista ou reative o usuário em Administração.');
      respNome = resp.nome;
    }

    var modulo = SGO_UTILS.safe(p.modulo);
    if (modulo && !/^[a-z0-9_]{1,60}$/.test(modulo)) modulo = '';
    var clienteId = SGO_UTILS.safe(p.clienteId), clienteNome = '', unidadeId = SGO_UTILS.safe(p.unidadeId), unidadeNome = '';
    if (clienteId) {
      var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, clienteId);
      if (!c) throw new Error('Não foi possível lançar a atividade: o cliente escolhido não existe mais. Escolha o cliente de novo na lista.');
      clienteNome = SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
      if (unidadeId) {
        var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, unidadeId);
        if (!u || String(u.CLIENTE_ID) !== clienteId) throw new Error('Não foi possível lançar a atividade: a unidade não pertence ao cliente escolhido. Escolha a unidade de novo.');
        unidadeNome = SGO_UTILS.safe(u.NOME_UNIDADE);
      }
    } else unidadeId = '';
    var w = Atividades_campos5w2h_(p);

    return Atividades_comTrava_(function () {
      var agora = Atividades_agora_();
      var reg = SGO_DATA.insert(Atividades_abas_().ATIVIDADES, {
        TITULO: titulo, DESCRICAO: Atividades_texto_(p.descricao, 4000), MODULO: modulo, MODULO_NOME: Atividades_texto_(p.moduloNome, 120),
        CLIENTE_ID: clienteId, CLIENTE_NOME: clienteNome, UNIDADE_ID: unidadeId, UNIDADE_NOME: unidadeNome,
        RESPONSAVEL_ID: respId, RESPONSAVEL_NOME: respNome, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome,
        PRIORIDADE: prioridade, INICIO_PREVISTO: inicio, PRAZO: prazo, PREVISAO_ATUAL: prazo, SITUACAO: 'A fazer',
        PERCENTUAL: '', INICIADA_EM: '', CONCLUIDA_EM: '', AGORA_DESDE: '', MOTIVO_AGUARDANDO: '', OBS_CONCLUSAO: '',
        QTD_JUSTIFICATIVAS: 0, ATUALIZADO_EM: agora,
        SISTEMA_ORIGEM: eu.sistema === 'COMMAND' ? 'COMMAND' : 'SGO+', POR_QUE: w.POR_QUE, ONDE: w.ONDE, COMO: w.COMO, QUANTO: w.QUANTO,
        RESTRITA: p.restrita === true || SGO_UTILS.safeUpper(p.restrita) === 'SIM' ? 'SIM' : ''
      });
      Atividades_registrarHist_(eu, reg.ID, 'CRIACAO', { para: 'A fazer', texto: 'Atividade lançada para ' + respNome + (eu.sistema === 'COMMAND' ? ' pelo COMMAND' : '') + '. Prazo: ' + Atividades_dataBr_(prazo) + '.' });
      if (respId !== eu.id) {
        Atividades_avisar_(respId, reg.ID, 'NOVA', 'Nova atividade para você', eu.nome + ' lançou "' + titulo + '" com prazo ' + Atividades_dataBr_(prazo) + '.', { email: true });
      }
      return { item: Atividades_paraTela_(eu, Atividades_limpar_(reg)), message: 'Atividade lançada para ' + respNome + '.' };
    });
  });
}

/** Quem pode editar: gestão qualquer uma; demais perfis só a que lançaram para si mesmos. */
function Atividades_podeEditar_(eu, a) {
  return eu.gestor || (a.CRIADO_POR_ID === eu.id && a.RESPONSAVEL_ID === eu.id);
}

function Atividades_resumoHist_(v) {
  var s = SGO_UTILS.safe(v).replace(/\s+/g, ' ');
  if (!s) return '(vazio)';
  return s.length > 160 ? s.slice(0, 157) + '...' : s;
}

/**
 * Edição de atividade já lançada (título, descrição, módulo, cliente/unidade,
 * responsável, prioridade, início previsto, prazo). Situação continua pelos botões/Kanban.
 * Prazo mudado pela gestão = replanejamento: a previsão volta a ser o novo prazo e,
 * se ficar no futuro, a atividade deixa de exigir justificativa de atraso.
 * Campo ausente no payload = mantém o valor atual.
 */
function Atividades_apiEditar(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var tem = function (k) { return Object.prototype.hasOwnProperty.call(p, k) && p[k] !== undefined && p[k] !== null; };
    return Atividades_comTrava_(function () {
      var a = Atividades_obter_(p.id);
      if (!Atividades_podeEditar_(eu, a)) {
        throw new Error('Não foi possível editar a atividade: ela foi lançada por ' + (a.CRIADO_POR_NOME || 'outra pessoa') +
          (a.RESPONSAVEL_ID !== eu.id ? ' para ' + (a.RESPONSAVEL_NOME || 'outra pessoa') : ' para você') +
          '. Só um gestor (Gestor, Admin ou Diretoria) ou quem lançou a atividade para si mesmo pode editar. Para mudar algo, comente na atividade ou peça a um gestor.');
      }
      var agora = Atividades_agora_();
      var dados = {}, mudancas = [];
      var mudou = function (campo, rotulo, antes, depois, antesTxt, depoisTxt) {
        if (String(antes) === String(depois)) return;
        dados[campo] = depois;
        if (rotulo) mudancas.push(rotulo + ': ' + Atividades_resumoHist_(antesTxt !== undefined ? antesTxt : antes) + ' → ' + Atividades_resumoHist_(depoisTxt !== undefined ? depoisTxt : depois));
      };

      if (tem('titulo')) {
        var titulo = Atividades_texto_(p.titulo, 200);
        if (titulo.length < 3) throw new Error('Não foi possível salvar a atividade: o título está vazio ou curto demais. Escreva no campo Título o que precisa ser feito (mínimo 3 letras) e clique em Salvar de novo.');
        mudou('TITULO', 'Título', a.TITULO, titulo);
      }
      if (tem('descricao')) mudou('DESCRICAO', 'Descrição', a.DESCRICAO, Atividades_texto_(p.descricao, 4000));
      var w = Atividades_campos5w2h_(p);
      if (tem('porQue')) mudou('POR_QUE', 'Por quê', a.POR_QUE, w.POR_QUE);
      if (tem('onde')) mudou('ONDE', 'Onde', a.ONDE, w.ONDE);
      if (tem('como')) mudou('COMO', 'Como', a.COMO, w.COMO);
      if (tem('quanto')) mudou('QUANTO', 'Quanto', a.QUANTO, w.QUANTO);
      if (tem('restrita')) {
        var restr = p.restrita === true || SGO_UTILS.safeUpper(p.restrita) === 'SIM' ? 'SIM' : '';
        if (restr !== (SGO_UTILS.safeUpper(a.RESTRITA) === 'SIM' ? 'SIM' : '')) {
          if (!eu.gestor && a.CRIADO_POR_ID !== eu.id) throw new Error('Não foi possível mudar a visibilidade: só quem lançou a atividade ou a gestão decide se ela é restrita.');
          mudou('RESTRITA', 'Visibilidade', SGO_UTILS.safeUpper(a.RESTRITA) === 'SIM' ? 'restrita' : 'equipe', restr ? 'restrita' : 'equipe');
          dados.RESTRITA = restr;
        }
      }
      if (tem('prioridade')) {
        if (ATV_PRIORIDADES.indexOf(p.prioridade) < 0) throw new Error('Não foi possível salvar a atividade: prioridade desconhecida. Escolha Baixa, Normal, Alta ou Urgente.');
        mudou('PRIORIDADE', 'Prioridade', a.PRIORIDADE, p.prioridade);
      }
      if (tem('modulo')) {
        var modulo = SGO_UTILS.safe(p.modulo);
        if (modulo && !/^[a-z0-9_]{1,60}$/.test(modulo)) throw new Error('Não foi possível salvar a atividade: módulo não reconhecido. Escolha o módulo de novo na lista.');
        if (modulo !== a.MODULO) {
          var moduloNome = modulo ? Atividades_texto_(p.moduloNome, 120) || modulo : '';
          dados.MODULO = modulo;
          mudou('MODULO_NOME', 'Módulo', a.MODULO_NOME || a.MODULO, moduloNome);
          dados.MODULO_NOME = moduloNome;
        }
      }
      if (tem('clienteId') || tem('unidadeId')) {
        var clienteId = tem('clienteId') ? SGO_UTILS.safe(p.clienteId) : a.CLIENTE_ID;
        var unidadeId = clienteId ? (tem('unidadeId') ? SGO_UTILS.safe(p.unidadeId) : a.UNIDADE_ID) : '';
        if (clienteId !== a.CLIENTE_ID || unidadeId !== a.UNIDADE_ID) {
          var clienteNome = '', unidadeNome = '';
          if (clienteId) {
            var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, clienteId);
            if (!c) throw new Error('Não foi possível salvar a atividade: o cliente escolhido não existe mais. Escolha o cliente de novo na lista.');
            clienteNome = SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
            if (unidadeId) {
              var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, unidadeId);
              if (!u || String(u.CLIENTE_ID) !== clienteId) throw new Error('Não foi possível salvar a atividade: a unidade não pertence ao cliente escolhido. Escolha a unidade de novo.');
              unidadeNome = SGO_UTILS.safe(u.NOME_UNIDADE);
            }
          }
          var cliTxt = function (cn, un) { return cn ? cn + (un ? ' · ' + un : '') : ''; };
          mudancas.push('Cliente: ' + Atividades_resumoHist_(cliTxt(a.CLIENTE_NOME, a.UNIDADE_NOME)) + ' → ' + Atividades_resumoHist_(cliTxt(clienteNome, unidadeNome)));
          dados.CLIENTE_ID = clienteId; dados.CLIENTE_NOME = clienteNome; dados.UNIDADE_ID = unidadeId; dados.UNIDADE_NOME = unidadeNome;
        }
      }

      // Responsável: só gestão troca.
      var novoResp = null;
      if (tem('responsavelId')) {
        var respId = SGO_UTILS.safe(p.responsavelId);
        if (!respId) throw new Error('Não foi possível salvar a atividade: o responsável não foi escolhido. Escolha uma pessoa no campo Responsável.');
        if (respId !== a.RESPONSAVEL_ID) {
          Atividades_exigirGestor_(eu, 'trocar o responsável da atividade');
          novoResp = Atividades_usuariosAtivos_().filter(function (x) { return x.id === respId; })[0];
          if (!novoResp) throw new Error('Não foi possível salvar a atividade: o responsável escolhido não está ativo no SGO+. Escolha outra pessoa na lista ou reative o usuário em Administração.');
          dados.RESPONSAVEL_ID = novoResp.id; dados.RESPONSAVEL_NOME = novoResp.nome;
          dados.AGORA_DESDE = ''; // quem estava executando deixa de ser o responsável
        }
      }

      // Datas.
      var prazo = a.PRAZO, inicio = a.INICIO_PREVISTO;
      if (tem('prazo')) {
        prazo = Atividades_normData_(p.prazo, '18:00');
        if (!prazo) throw new Error('Não foi possível salvar a atividade: o prazo não foi informado ou é inválido. Preencha o campo Prazo com data e hora e clique em Salvar de novo.');
      }
      if (tem('inicioPrevisto')) {
        inicio = Atividades_normData_(p.inicioPrevisto, '08:00');
        if (p.inicioPrevisto && !inicio) throw new Error('Não foi possível salvar a atividade: o início previsto é inválido. Corrija a data ou deixe o campo vazio.');
      }
      if (inicio && prazo && inicio > prazo) throw new Error('Não foi possível salvar a atividade: o início previsto está depois do prazo. Ajuste uma das duas datas e clique em Salvar de novo.');
      mudou('INICIO_PREVISTO', 'Início previsto', a.INICIO_PREVISTO, inicio, Atividades_dataBr_(a.INICIO_PREVISTO), Atividades_dataBr_(inicio));
      var replanejada = prazo !== a.PRAZO, estavaVencida = Atividades_vencida_(a, agora);
      if (replanejada) {
        if (!eu.gestor && estavaVencida) {
          throw new Error('Não foi possível mudar o prazo: a atividade está com prazo vencido. Registre primeiro a justificativa de atraso (motivo e nova previsão) na janela que aparece na tela; mudar o prazo sem justificar só é permitido à gestão.');
        }
        dados.PRAZO = prazo;
        dados.PREVISAO_ATUAL = prazo; // replanejamento: a previsão passa a ser o novo prazo
      }

      if (!Object.keys(dados).length) return { item: a, message: 'Nada foi alterado: os campos estão iguais aos já gravados.' };
      Atividades_gravar_(a.ID, dados);

      if (mudancas.length) Atividades_registrarHist_(eu, a.ID, 'EDICAO', { texto: mudancas.join('\n') });
      if (replanejada) {
        var deixou = estavaVencida && prazo > agora;
        Atividades_registrarHist_(eu, a.ID, eu.gestor ? 'REPLANEJAMENTO' : 'EDICAO', {
          texto: (eu.gestor ? 'Replanejada: prazo ' : 'Prazo: ') + Atividades_dataBr_(a.PRAZO) + ' → ' + Atividades_dataBr_(prazo) + ' por ' + eu.nome + '.' +
            (deixou ? ' A atividade deixou de estar atrasada e não exige mais justificativa.' : '') +
            (eu.gestor ? ' Replanejamento da gestão; não conta como justificativa de atraso.' : ''),
          previsaoAnterior: a.PREVISAO_ATUAL, previsaoNova: prazo
        });
      }
      if (novoResp) {
        Atividades_registrarHist_(eu, a.ID, 'RESPONSAVEL', {
          de: a.RESPONSAVEL_NOME, para: novoResp.nome,
          texto: 'Responsável: ' + (a.RESPONSAVEL_NOME || '(vazio)') + ' → ' + novoResp.nome + ' por ' + eu.nome + '.'
        });
      }

      var titAtual = dados.TITULO || a.TITULO, prazoTxt = Atividades_dataBr_(prazo);
      if (novoResp && novoResp.id !== eu.id) {
        Atividades_avisar_(novoResp.id, a.ID, 'NOVA', 'Atividade passada para você',
          eu.nome + ' passou para você "' + titAtual + '" (antes com ' + (a.RESPONSAVEL_NOME || 'ninguém') + '). Prazo: ' + prazoTxt + '.', { email: true });
      }
      if (novoResp && a.RESPONSAVEL_ID && a.RESPONSAVEL_ID !== eu.id) {
        Atividades_avisar_(a.RESPONSAVEL_ID, a.ID, 'RESPONSAVEL', 'Atividade passada para outra pessoa',
          eu.nome + ' passou "' + titAtual + '" para ' + novoResp.nome + '. Ela saiu das suas atividades.');
      }
      var respFinal = novoResp ? novoResp.id : a.RESPONSAVEL_ID;
      if (!novoResp && respFinal && respFinal !== eu.id && (replanejada || mudancas.length)) {
        Atividades_avisar_(respFinal, a.ID, replanejada ? 'REPLANEJAMENTO' : 'EDICAO', replanejada ? 'Atividade replanejada' : 'Atividade alterada',
          eu.nome + (replanejada ? ' mudou o prazo de "' + titAtual + '" de ' + Atividades_dataBr_(a.PRAZO) + ' para ' + prazoTxt + '.' : ' alterou "' + titAtual + '": ' + mudancas.join('; ') + '.'));
      }
      return { item: Atividades_paraTela_(eu, Atividades_obter_(a.ID)), message: 'Atividade alterada.' + (replanejada ? ' Novo prazo: ' + prazoTxt + '.' : '') + (novoResp ? ' Responsável agora: ' + novoResp.nome + '.' : '') };
    });
  });
}

/** Muda a situação (lista, detalhe e arrastar no Kanban). */
function Atividades_apiMudarSituacao(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var nova = String(p.situacao || '');
    if (ATV_SITUACOES.indexOf(nova) < 0) throw new Error('Não foi possível mudar a situação: situação desconhecida. Escolha A fazer, Em andamento, Aguardando, Concluída ou Cancelada.');
    return Atividades_comTrava_(function () {
      var a = Atividades_obter_(p.id);
      if (!Atividades_podeAlterar_(eu, a)) throw new Error('Não foi possível mudar a situação: a atividade é de ' + (a.RESPONSAVEL_NOME || 'outra pessoa') + '. Só o responsável, quem lançou e a gestão mudam a situação; os demais só acompanham. Se precisar de algo, fale com ' + (a.RESPONSAVEL_NOME || 'o responsável') + '.');
      var dono = eu.gestor || a.CRIADO_POR_ID === eu.id;
      if (a.SITUACAO === nova) return { item: a, message: 'A atividade já estava em ' + nova + '.' };
      if (!Atividades_aberta_(a) && !dono) throw new Error('Não foi possível reabrir a atividade: ela já está ' + a.SITUACAO.toLowerCase() + '. Só quem lançou ou um gestor pode reabrir; peça a essa pessoa.');
      if (nova === 'Cancelada' && !dono) throw new Error('Não foi possível cancelar: só quem lançou a atividade ou um gestor pode cancelar. Se ela não faz mais sentido, comente o motivo e avise quem lançou.');
      var motivo = Atividades_texto_(p.motivo, 2000);
      if ((nova === 'Aguardando' || nova === 'Cancelada') && motivo.length < 5) {
        throw new Error('Não foi possível mudar para ' + nova + ': informe o motivo (mínimo 5 letras), por exemplo o que você está aguardando. Escreva o motivo e confirme de novo.');
      }
      var agora = Atividades_agora_();
      var dados = { SITUACAO: nova };
      if (nova === 'Em andamento' && !a.INICIADA_EM) dados.INICIADA_EM = agora;
      if (nova === 'Aguardando') { dados.MOTIVO_AGUARDANDO = motivo; dados.AGORA_DESDE = ''; }
      if (nova === 'Concluída') {
        dados.CONCLUIDA_EM = agora; dados.PERCENTUAL = 100; dados.AGORA_DESDE = '';
        dados.OBS_CONCLUSAO = Atividades_texto_(p.observacao, 2000);
        if (!a.INICIADA_EM) dados.INICIADA_EM = agora;
      }
      if (nova === 'Cancelada') dados.AGORA_DESDE = '';
      if (Atividades_aberta_({ SITUACAO: nova }) && !Atividades_aberta_(a)) dados.CONCLUIDA_EM = '';
      Atividades_gravar_(a.ID, dados);
      var texto = nova === 'Aguardando' || nova === 'Cancelada' ? 'Motivo: ' + motivo : (nova === 'Concluída' && dados.OBS_CONCLUSAO ? 'Observação: ' + dados.OBS_CONCLUSAO : '');
      Atividades_registrarHist_(eu, a.ID, 'SITUACAO', { de: a.SITUACAO, para: nova, texto: texto });
      if (a.CRIADO_POR_ID && a.CRIADO_POR_ID !== eu.id && (nova === 'Concluída' || nova === 'Aguardando')) {
        Atividades_avisar_(a.CRIADO_POR_ID, a.ID, nova === 'Concluída' ? 'CONCLUIDA' : 'AGUARDANDO',
          nova === 'Concluída' ? 'Atividade concluída' : 'Atividade aguardando',
          eu.nome + ' mudou "' + a.TITULO + '" para ' + nova + (texto ? '. ' + texto : '.'));
      }
      return { item: Atividades_paraTela_(eu, Atividades_obter_(a.ID)), message: 'Situação alterada para ' + nova + '.' };
    });
  });
}

function Atividades_apiComentar(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var texto = Atividades_texto_(p.texto, 4000);
    if (texto.length < 2) throw new Error('Não foi possível registrar o comentário: o texto está vazio. Escreva o comentário e clique em Comentar de novo.');
    return Atividades_comTrava_(function () {
      var a = Atividades_obter_(p.id);
      if (!Atividades_podeAlterar_(eu, a)) throw new Error('Não foi possível comentar: só o responsável (' + (a.RESPONSAVEL_NOME || 'outra pessoa') + '), quem lançou e a gestão comentam nesta atividade. Para combinar algo, fale com o responsável.');
      Atividades_registrarHist_(eu, a.ID, 'COMENTARIO', { texto: texto });
      var destino = eu.id === a.RESPONSAVEL_ID ? a.CRIADO_POR_ID : a.RESPONSAVEL_ID;
      if (destino && destino !== eu.id) Atividades_avisar_(destino, a.ID, 'COMENTARIO', 'Comentário em atividade', eu.nome + ' comentou em "' + a.TITULO + '": ' + texto);
      Atividades_gravar_(a.ID, {});
      return { message: 'Comentário registrado.' };
    });
  });
}

function Atividades_apiPercentual(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var n = Number(String(p.percentual).replace(',', '.'));
    if (!isFinite(n) || n < 0 || n > 100) throw new Error('Não foi possível gravar o andamento: informe um percentual entre 0 e 100.');
    n = Math.round(n);
    return Atividades_comTrava_(function () {
      var a = Atividades_obter_(p.id);
      if (a.RESPONSAVEL_ID !== eu.id && !eu.gestor) throw new Error('Não foi possível gravar o andamento: só o responsável ou um gestor pode alterar o percentual.');
      if (!Atividades_aberta_(a)) throw new Error('Não foi possível gravar o andamento: a atividade já está ' + a.SITUACAO.toLowerCase() + '.');
      Atividades_gravar_(a.ID, { PERCENTUAL: n });
      Atividades_registrarHist_(eu, a.ID, 'PERCENTUAL', { de: String(a.PERCENTUAL === '' ? '' : a.PERCENTUAL + '%'), para: n + '%' });
      return { item: Atividades_obter_(a.ID), message: 'Andamento gravado: ' + n + '%.' };
    });
  });
}

/** "Estou fazendo agora": só uma por pessoa. ligar=false desmarca. */
function Atividades_apiFazendoAgora(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var ligar = p.ligar !== false;
    return Atividades_comTrava_(function () {
      var a = Atividades_obter_(p.id);
      if (a.RESPONSAVEL_ID !== eu.id) throw new Error('Não foi possível marcar "fazendo agora": só o responsável pela atividade pode marcar o que está executando.');
      if (ligar && !Atividades_aberta_(a)) throw new Error('Não foi possível marcar "fazendo agora": a atividade já está ' + a.SITUACAO.toLowerCase() + '. Escolha uma atividade aberta.');
      var agora = Atividades_agora_();
      if (!ligar) {
        if (a.AGORA_DESDE) { Atividades_gravar_(a.ID, { AGORA_DESDE: '' }); Atividades_registrarHist_(eu, a.ID, 'AGORA', { texto: 'Deixou de executar agora.' }); }
        return { message: 'Atividade desmarcada como "fazendo agora".' };
      }
      Atividades_todas_().forEach(function (o) {
        if (o.RESPONSAVEL_ID === eu.id && o.AGORA_DESDE && o.ID !== a.ID) {
          Atividades_gravar_(o.ID, { AGORA_DESDE: '' });
          Atividades_registrarHist_(eu, o.ID, 'AGORA', { texto: 'Deixou de executar agora (passou para "' + a.TITULO + '").' });
        }
      });
      var dados = { AGORA_DESDE: agora };
      if (a.SITUACAO !== 'Em andamento') { dados.SITUACAO = 'Em andamento'; if (!a.INICIADA_EM) dados.INICIADA_EM = agora; }
      Atividades_gravar_(a.ID, dados);
      if (dados.SITUACAO) Atividades_registrarHist_(eu, a.ID, 'SITUACAO', { de: a.SITUACAO, para: 'Em andamento', texto: 'Marcada como "fazendo agora".' });
      else Atividades_registrarHist_(eu, a.ID, 'AGORA', { texto: 'Marcada como "fazendo agora".' });
      return { item: Atividades_obter_(a.ID), message: 'Marcada como a atividade que você está fazendo agora.' };
    });
  });
}

/** Verificação periódica do navegador: minhas atividades vencidas sem justificativa + avisos não lidos. */
function Atividades_apiVerificar(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    Atividades_verificarAtrasosTalvez_();
    var agora = Atividades_agora_();
    var minhas = Atividades_todas_().filter(function (a) { return a.RESPONSAVEL_ID === eu.id && Atividades_aberta_(a); });
    var pendentes = minhas.filter(function (a) { return Atividades_vencida_(a, agora); })
      .map(function (a) { return { ID: a.ID, TITULO: a.TITULO, PRAZO: a.PRAZO, PREVISAO_ATUAL: a.PREVISAO_ATUAL, CRIADO_POR_NOME: a.CRIADO_POR_NOME, MODULO_NOME: a.MODULO_NOME, QTD_JUSTIFICATIVAS: a.QTD_JUSTIFICATIVAS, PRIORIDADE: a.PRIORIDADE }; });
    var avisos = SGO_DATA.getAll(Atividades_abas_().AVISOS)
      .filter(function (v) { return String(v.DESTINATARIO_ID) === eu.id && !SGO_UTILS.safe(v.LIDO_EM); })
      .map(function (v) { return { ID: String(v.ID), ATIVIDADE_ID: String(v.ATIVIDADE_ID), TIPO: String(v.TIPO), TITULO: String(v.TITULO), TEXTO: String(v.TEXTO), DATA: Atividades_normData_(v.DATA, '00:00') }; })
      .slice(-20);
    var venceHoje = minhas.filter(function (a) { return !Atividades_vencida_(a, agora) && String(a.PREVISAO_ATUAL).slice(0, 10) === agora.slice(0, 10); })
      .map(function (a) { return { ID: a.ID, TITULO: a.TITULO, PREVISAO_ATUAL: a.PREVISAO_ATUAL }; });
    return { pendentes: pendentes, avisos: avisos, abertas: minhas.length, venceHoje: venceHoje, agora: agora, gestor: eu.gestor, motivosAtraso: ATV_MOTIVOS_ATRASO };
  });
}

function Atividades_apiMarcarAvisosLidos(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var ids = (payload && payload.ids) || [];
    if (!ids.length) return { marcados: 0 };
    return Atividades_comTrava_(function () {
      var aba = Atividades_abas_().AVISOS, agora = Atividades_agora_(), n = 0;
      SGO_DATA.getAll(aba).forEach(function (v) {
        if (ids.indexOf(String(v.ID)) >= 0 && String(v.DESTINATARIO_ID) === eu.id && !SGO_UTILS.safe(v.LIDO_EM)) { SGO_DATA.update(aba, v.ID, { LIDO_EM: agora }); n++; }
      });
      return { marcados: n };
    });
  });
}

/** Justificativa de atraso: motivo (mín. 15 letras) + nova previsão futura. Fica no histórico e avisa quem lançou. */
function Atividades_apiJustificar(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var p = payload || {};
    var motivo = Atividades_texto_(p.motivo, 2000);
    if (motivo.replace(/\s+/g, ' ').length < 15) throw new Error('Não foi possível registrar a justificativa: o motivo está curto demais (mínimo 15 letras). Explique o que atrasou a atividade e registre de novo.');
    var nova = Atividades_normData_(p.novaPrevisao, '18:00');
    if (!nova) throw new Error('Não foi possível registrar a justificativa: a nova previsão não foi informada. Preencha data e hora da nova previsão de entrega.');
    var categoria = String(p.categoria || '').trim();
    if (ATV_MOTIVOS_ATRASO.indexOf(categoria) < 0) throw new Error('Não foi possível registrar a justificativa: escolha o motivo do atraso na lista (se nenhum servir, escolha "Outro motivo") e registre de novo.');
    return Atividades_comTrava_(function () {
      var agora = Atividades_agora_();
      if (nova <= agora) throw new Error('Não foi possível registrar a justificativa: a nova previsão (' + Atividades_dataBr_(nova) + ') já passou. Escolha uma data e hora depois de agora.');
      var a = Atividades_obter_(p.id);
      if (a.RESPONSAVEL_ID !== eu.id) throw new Error('Não foi possível registrar a justificativa: só o responsável pela atividade justifica o atraso.');
      if (!Atividades_vencida_(a, agora)) return { item: a, message: 'Esta atividade não está mais atrasada; nada a justificar.' };
      var anterior = a.PREVISAO_ATUAL;
      Atividades_gravar_(a.ID, { PREVISAO_ATUAL: nova, QTD_JUSTIFICATIVAS: (a.QTD_JUSTIFICATIVAS || 0) + 1 });
      Atividades_registrarHist_(eu, a.ID, 'JUSTIFICATIVA', { texto: motivo, previsaoAnterior: anterior, previsaoNova: nova, categoria: categoria });
      if (a.CRIADO_POR_ID && a.CRIADO_POR_ID !== eu.id) {
        Atividades_avisar_(a.CRIADO_POR_ID, a.ID, 'JUSTIFICATIVA', 'Justificativa de atraso',
          eu.nome + ' justificou o atraso de "' + a.TITULO + '" (' + categoria + '): ' + motivo + ' Previsão: ' + Atividades_dataBr_(anterior) + ' para ' + Atividades_dataBr_(nova) + '.', { email: true });
      }
      return { item: Atividades_paraTela_(eu, Atividades_obter_(a.ID)), message: 'Justificativa registrada. Nova previsão: ' + Atividades_dataBr_(nova) + '.' };
    });
  });
}

/**
 * Atividades da equipe (19/10/2026: aberta a todo perfil interno, não só à gestão).
 * Cada pessoa recebe as atividades que pode ver (Atividades_podeVer_), cada uma dizendo se ela pode
 * alterar; o painel Agora, os indicadores e a carga por pessoa saem dessas mesmas atividades.
 * Texto das justificativas: só das atividades em que a pessoa é envolvida (ou todas, para a gestão);
 * os números por motivo valem para todos.
 */
function Atividades_apiPainelEquipe(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    var agora = Atividades_agora_(), hoje = agora.slice(0, 10);
    var limite30 = Atividades_menosDias_(30);
    var em7 = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), ATV_FUSO, "yyyy-MM-dd'T'HH:mm");
    var todas = Atividades_todas_().filter(function (a) { return Atividades_podeVer_(eu, a); });
    var usuarios = Atividades_usuariosAtivos_();

    var abertas = todas.filter(Atividades_aberta_);
    var vencidas = abertas.filter(function (a) { return Atividades_vencida_(a, agora); });
    var concl30 = todas.filter(function (a) { return a.SITUACAO === 'Concluída' && a.CONCLUIDA_EM && a.CONCLUIDA_EM >= limite30; });
    var noPrazo = concl30.filter(function (a) { return a.PRAZO && a.CONCLUIDA_EM <= a.PRAZO; });

    var pesoPri = { Urgente: 3, Alta: 2, Normal: 1, Baixa: 1 };
    var agoraPainel = usuarios.map(function (u) {
      var minhas = abertas.filter(function (a) { return a.RESPONSAVEL_ID === u.id; });
      var atual = minhas.filter(function (a) { return a.AGORA_DESDE; })[0] || null;
      return {
        id: u.id, nome: u.nome, perfil: u.perfil, abertas: minhas.length,
        vencidas: minhas.filter(function (a) { return Atividades_vencida_(a, agora); }).length,
        venceHoje: minhas.filter(function (a) { return !Atividades_vencida_(a, agora) && String(a.PREVISAO_ATUAL).slice(0, 10) === hoje; }).length,
        prox7: minhas.filter(function (a) { return a.PREVISAO_ATUAL >= agora && a.PREVISAO_ATUAL <= em7; }).length,
        aguardando: minhas.filter(function (a) { return a.SITUACAO === 'Aguardando'; }).length,
        carga: minhas.reduce(function (s, a) { return s + (pesoPri[a.PRIORIDADE] || 1); }, 0),
        atual: atual ? { ID: atual.ID, TITULO: atual.TITULO, AGORA_DESDE: atual.AGORA_DESDE, MODULO_NOME: atual.MODULO_NOME, CLIENTE_NOME: atual.CLIENTE_NOME } : null
      };
    }).filter(function (p) { return p.abertas > 0 || p.atual; });

    var porId = {};
    todas.forEach(function (a) { porId[a.ID] = a; });
    var justTodas = SGO_DATA.getAll(Atividades_abas_().HISTORICO)
      .filter(function (h) { return String(h.TIPO) === 'JUSTIFICATIVA' && porId[String(h.ATIVIDADE_ID)]; })
      .map(Atividades_limparHist_)
      .sort(Atividades_ordemHistDesc_);
    var porMotivo = {};
    justTodas.forEach(function (h) {
      if (h.DATA < limite30) return;
      var k = h.CATEGORIA || 'Sem motivo escolhido (anterior a 19/10/2026)';
      porMotivo[k] = (porMotivo[k] || 0) + 1;
    });
    var justificativas = justTodas
      .filter(function (h) { return Atividades_veJustificativa_(eu, porId[h.ATIVIDADE_ID]); })
      .slice(0, 30)
      .map(function (h) { var a = porId[h.ATIVIDADE_ID] || {}; h.TITULO = a.TITULO || ''; h.RESPONSAVEL_NOME = a.RESPONSAVEL_NOME || h.USUARIO_NOME; h.SITUACAO = a.SITUACAO || ''; return h; });

    var porModulo = {};
    abertas.forEach(function (a) {
      var k = a.MODULO || '-';
      var m = porModulo[k] = porModulo[k] || { modulo: k, nome: a.MODULO_NOME || (a.MODULO ? a.MODULO : 'Sem módulo'), abertas: 0, vencidas: 0 };
      m.abertas++; if (Atividades_vencida_(a, agora)) m.vencidas++;
    });
    var porSistema = { 'SGO+': 0, COMMAND: 0 };
    abertas.forEach(function (a) { porSistema[a.SISTEMA_ORIGEM === 'COMMAND' ? 'COMMAND' : 'SGO+']++; });

    return {
      agora: agora, eu: { id: eu.id, gestor: eu.gestor, configuraAvisos: eu.perfil === 'ADMIN' || eu.perfil === 'DIRETORIA' },
      itens: todas.filter(function (a) { return a.SITUACAO !== 'Cancelada'; }).map(function (a) { return Atividades_paraTela_(eu, a); }),
      usuarios: usuarios.map(function (u) { return { id: u.id, nome: u.nome }; }), painelAgora: agoraPainel,
      indicadores: {
        abertas: abertas.length, vencidas: vencidas.length, concluidas30: concl30.length, noPrazo30: noPrazo.length,
        percNoPrazo30: concl30.length ? Math.round(noPrazo.length * 1000 / concl30.length) / 10 : null,
        aguardando: abertas.filter(function (a) { return a.SITUACAO === 'Aguardando'; }).length,
        justificativas30: Object.keys(porMotivo).reduce(function (s, k) { return s + porMotivo[k]; }, 0),
        porMotivo: Object.keys(porMotivo).map(function (k) { return { motivo: k, qtd: porMotivo[k] }; }).sort(function (a, b) { return b.qtd - a.qtd; }),
        porModulo: Object.keys(porModulo).map(function (k) { return porModulo[k]; }).sort(function (a, b) { return b.abertas - a.abertas; }),
        porSistema: porSistema
      },
      justificativas: justificativas
    };
  });
}

/** Plano de ação do Programa de conduta (5W2H + PDCA) de que a atividade faz parte, para o detalhe. Só leitura. */
function Atividades_planoDaAtividade_(a) {
  if (!a || a.MODULO !== 'conduta') return null;
  try {
    var aba = (typeof CNDQ_SHEETS !== 'undefined' && CNDQ_SHEETS.PLANO) || 'qual_plano_acao';
    var achado = null;
    SGO_DATA.getAll(aba).forEach(function (p) {
      if (achado) return;
      var ids = [];
      try { ids = JSON.parse(String(p.ATIVIDADES_JSON || '[]')); } catch (e) { ids = []; }
      if (Array.isArray(ids) && ids.map(String).indexOf(String(a.ID)) >= 0) achado = p;
    });
    if (!achado) return null;
    var fases = typeof CNDQ_FASES !== 'undefined' ? CNDQ_FASES : {};
    var fase = SGO_UTILS.safeUpper(achado.FASE);
    return { CODIGO: SGO_UTILS.safe(achado.CODIGO), TITULO: SGO_UTILS.safe(achado.TITULO), FASE: fase, FASE_NOME: fases[fase] || fase, CICLO: Number(achado.CICLO) || 1 };
  } catch (e) { return null; }
}

// ------------------------------------------------------------
// PONTE COMMAND -> SGO+ (SGO_PonteCommand.js, ações "atividades.*")
// ------------------------------------------------------------
/**
 * O COMMAND chama em nome do usuário do SGO+ ligado à conta (dados.sgoUsuarioId) e as MESMAS funções
 * das telas do SGO+ respondem, com as mesmas regras de quem vê e quem altera (o perfil vale o do SGO+).
 * A assinatura (HMAC) já foi conferida por PonteCmd_tratar_. dados = { sgoUsuarioId, payload }.
 * Resposta: a mesma da tela; erro vem com ok:false, message e erro (texto para o operador).
 */
var ATV_PONTE_ACOES = {
  'atividades.opcoes': function (t, p) { return Atividades_apiOpcoes(t, p); },
  'atividades.unidades': function (t, p) { return Atividades_apiUnidades(t, p); },
  'atividades.minhas': function (t, p) { return Atividades_apiListarMinhas(t, p); },
  'atividades.modulo': function (t, p) { return Atividades_apiListarModulo(t, p); },
  'atividades.detalhe': function (t, p) { return Atividades_apiDetalhe(t, p); },
  'atividades.criar': function (t, p) { return Atividades_apiCriar(t, p); },
  'atividades.editar': function (t, p) { return Atividades_apiEditar(t, p); },
  'atividades.situacao': function (t, p) { return Atividades_apiMudarSituacao(t, p); },
  'atividades.comentar': function (t, p) { return Atividades_apiComentar(t, p); },
  'atividades.percentual': function (t, p) { return Atividades_apiPercentual(t, p); },
  'atividades.agora': function (t, p) { return Atividades_apiFazendoAgora(t, p); },
  'atividades.verificar': function (t, p) { return Atividades_apiVerificar(t, p); },
  'atividades.lidos': function (t, p) { return Atividades_apiMarcarAvisosLidos(t, p); },
  'atividades.justificar': function (t, p) { return Atividades_apiJustificar(t, p); },
  'atividades.equipe': function (t, p) { return Atividades_apiPainelEquipe(t, p); }
};

function Atividades_ponte_(acao, dados) {
  var fn = Object.prototype.hasOwnProperty.call(ATV_PONTE_ACOES, acao) ? ATV_PONTE_ACOES[acao] : null;
  if (!fn) return { ok: false, erro: 'Ação de atividades desconhecida.', message: 'Ação de atividades desconhecida.' };
  var d = dados || {};
  var eu;
  try { eu = Atividades_euDoUsuario_(d.sgoUsuarioId, 'COMMAND'); }
  catch (e) { var m = String((e && e.message) || e); return { ok: false, erro: m, message: m }; }
  var anterior = ATV_PONTE_CTX;
  ATV_PONTE_CTX = { token: 'PONTE-' + Utilities.getUuid(), eu: eu };
  var r;
  try { r = fn(ATV_PONTE_CTX.token, d.payload || {}); }
  finally { ATV_PONTE_CTX = anterior; }
  if (r && r.ok === false && !r.erro) r.erro = r.message;
  return r;
}
