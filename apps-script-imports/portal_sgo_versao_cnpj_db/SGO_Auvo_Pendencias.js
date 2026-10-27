/****************************************************
 * SGO_Auvo_Pendencias.js
 * PENDÊNCIAS DE FECHAMENTO — O.S. abertas no Auvo
 *
 * Pedido do usuário 2026-08-31, depois do estudo que confirmou ao vivo que
 * NÃO dá pra fechar O.S. do Auvo por API (campo 'finished' é somente-leitura
 * — ver memória project_auvo_fechamento_os_20260831): já que fechar por
 * código está fora de cogitação, a forma de tornar isso gerenciável é uma
 * lista sempre atualizada do que está preso, com o técnico responsável, o
 * link direto pra resolver no Auvo, e um jeito de cobrar formalmente.
 *
 * AUVO_PENDENCIAS é FOTO DO MOMENTO, não histórico — regravada por completo
 * a cada rodada (por isso a coluna SINCRONIZACAO_ID: cada rodada marca suas
 * linhas com um ID próprio; ao concluir, tudo que não é da rodada atual é
 * removido). Diferente de AUVO_TAREFAS, que só espelha uma janela recente
 * deslizante (ver SGO_Auvo_Incremental.js) — aqui a varredura é ampla
 * (JANELA_DIAS) porque o objetivo é achar exatamente as antigas esquecidas.
 ****************************************************/

var AUVO_PEND_CFG = {
  // 27/10/2026, decisão do dono: O.S. aberta há mais de 1 ano não serve mais para cobrança e sai da
  // lista (antes 1095 dias). No Auvo nada é apagado; para voltar a ver as antigas, aumente este número.
  JANELA_DIAS: 365,
  PAGE_SIZE: 100,
  ORCAMENTO_MS: 4.5 * 60 * 1000, // Apps Script mata em 6min; para com folga e continua depois
  CHECKPOINT_KEY: 'AUVO_PEND_CHECKPOINT',
  ULTIMA_COMPLETA_KEY: 'AUVO_PEND_ULTIMA_COMPLETA'
};

function Auvo_pendBootstrap_() {
  CertCal_garantirTabela_(SGO_CFG.SHEETS.AUVO_PENDENCIAS, [
    'ID', 'AUVO_TASK_ID', 'TASK_TYPE_DESCRICAO', 'CLIENTE_NOME', 'TECNICO_AUVO_ID',
    'TECNICO_NOME', 'TECNICO_ID_SGO', 'TASK_DATE', 'DIAS_ABERTA', 'TEM_EVIDENCIA',
    'TASK_URL', 'SINCRONIZACAO_ID', 'ULTIMA_SINCRONIZACAO'
  ]);
}

// Mesmo critério já validado ao vivo no estudo de 2026-08-31: relatório
// preenchido OU questionário respondido OU check-in OU assinatura do
// cliente — separa "provavelmente foi feito, só não fechou" de "sem
// nenhum rastro, revisar antes de cobrar".
function Auvo_pendTemEvidencia_(tarefa) {
  var temQuestionario = (tarefa.questionnaires || []).some(function(q) {
    return (q.answers || []).length > 0;
  });
  return !!(tarefa.report) || temQuestionario || !!tarefa.checkInDate || !!tarefa.signatureUrl;
}

// Linha gravada ainda dentro da janela (conta pela data da tarefa, não pelo DIAS_ABERTA gravado, que fica
// parado até a próxima rodada). Sem data legível a linha fica: não dá para dizer que é antiga.
function Auvo_pendDentroDaJanela_(p, agora) {
  var d = new Date(SGO_UTILS.safe(p && p.TASK_DATE));
  if (isNaN(d.getTime())) return true;
  return ((agora || new Date()).getTime() - d.getTime()) / 86400000 <= AUVO_PEND_CFG.JANELA_DIAS;
}

function Auvo_pendResolverNomeTecnico_(tecnicoIdSgo, nomeAuvo, auvoId) {
  if (tecnicoIdSgo) {
    var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, tecnicoIdSgo);
    if (u && u.NOME) return u.NOME;
  }
  return SGO_UTILS.safe(nomeAuvo) || (auvoId ? 'Técnico Auvo #' + auvoId : 'Técnico não identificado');
}

// AUVO_SYNC não tem NENHUM mapeamento de TECNICO hoje (achado real de
// 2026-08-31: a sincronização SGO->Auvo de técnicos nunca foi rodada até o
// fim) — Auvo_resolverTecnicoIncremental_ sozinho sempre devolve null. Como
// fallback, casa por e-mail: usuário do Auvo (GET /users, ~8 registros, 1
// chamada barata) x CAD_USUARIOS.EMAIL. Resolve login de verdade pra quem
// já tem e-mail preenchido nos dois lados (Bruna/Erick/Matheus, confirmado
// ao vivo); quem não tem e-mail em algum dos dois lados fica sem vínculo,
// exatamente como já era documentado.
function Auvo_pendConstruirIndiceEmailAuvo_() {
  var usuarios = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.USERS);
  var porIdAuvo = {};
  usuarios.forEach(function(u) {
    if (u.userID && u.email) porIdAuvo[String(u.userID)] = String(u.email).toLowerCase().trim();
  });
  return porIdAuvo;
}

function Auvo_pendConstruirIndiceUsuarioPortalPorEmail_() {
  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u) {
    var email = SGO_UTILS.safe(u.EMAIL).toLowerCase().trim();
    if (email) mapa[email] = u.ID;
  });
  return mapa;
}

function Auvo_pendResolverTecnico_(idUserToAuvo, indiceSync, indiceEmailAuvo, indiceUsuarioPortalPorEmail) {
  var viaSync = Auvo_resolverTecnicoIncremental_(idUserToAuvo, indiceSync);
  if (viaSync) return viaSync;
  var emailAuvo = indiceEmailAuvo[String(idUserToAuvo)];
  if (!emailAuvo) return null;
  return indiceUsuarioPortalPorEmail[emailAuvo] || null;
}

function Auvo_pendLerCheckpoint_() {
  var raw = PropertiesService.getScriptProperties().getProperty(AUVO_PEND_CFG.CHECKPOINT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function Auvo_pendGravarCheckpoint_(cp) {
  PropertiesService.getScriptProperties().setProperty(AUVO_PEND_CFG.CHECKPOINT_KEY, JSON.stringify(cp));
}

function Auvo_pendLimparCheckpoint_() {
  PropertiesService.getScriptProperties().deleteProperty(AUVO_PEND_CFG.CHECKPOINT_KEY);
}

// Remove da tabela tudo que não pertence à rodada atual (rodadas antigas,
// completas ou interrompidas). Feito 1x só, no final de uma rodada completa.
function Auvo_pendRemoverLinhasAntigas_(sincronizacaoIdAtual) {
  var todas = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_PENDENCIAS);
  var manter = todas.filter(function(r) { return SGO_UTILS.safe(r.SINCRONIZACAO_ID) === sincronizacaoIdAtual; });
  if (manter.length === todas.length) return;
  var sheet = SGO_DATA.getSheet(SGO_CFG.SHEETS.AUVO_PENDENCIAS);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  if (manter.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.AUVO_PENDENCIAS, manter);
}

// Executa 1 lote (várias páginas do Auvo, dentro do orçamento de tempo).
// Cada página já resolvida é gravada direto na tabela real (tagueada com
// SINCRONIZACAO_ID) — não acumula tudo em memória entre execuções, porque
// PropertiesService/CacheService têm limite de tamanho pequeno demais pra
// ~300+ registros. Se terminar de varrer tudo, remove o que sobrou de
// rodadas antigas e limpa o checkpoint; se não couber no orçamento, salva
// a página onde parou e deixa a continuação por conta do trigger.
function Auvo_pendExecutarLote_() {
  Auvo_bootstrap_();
  Auvo_pendBootstrap_();
  var inicioExecucao = Date.now();

  var cp = Auvo_pendLerCheckpoint_();
  var pagina = (cp && cp.pagina) || 1;
  var sincronizacaoId = (cp && cp.sincronizacaoId) || Utilities.getUuid();

  var fim = new Date();
  var inicioJanela = new Date(fim.getTime() - AUVO_PEND_CFG.JANELA_DIAS * 24 * 3600 * 1000);
  var fmt = function(d) { return Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd'); };
  var filtro = JSON.stringify({ startDate: fmt(inicioJanela), endDate: fmt(fim) });

  var indiceSync = Auvo_construirIndiceMapeamento_();
  var indiceEmailAuvo = Auvo_pendConstruirIndiceEmailAuvo_();
  var indiceUsuarioPortalPorEmail = Auvo_pendConstruirIndiceUsuarioPortalPorEmail_();
  var concluiu = false;

  while (true) {
    if (Date.now() - inicioExecucao > AUVO_PEND_CFG.ORCAMENTO_MS) break;

    var resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.TASKS + '?page=' + pagina + '&pageSize=' + AUVO_PEND_CFG.PAGE_SIZE + '&paramFilter=' + encodeURIComponent(filtro), null);
    var lote = (resp.result && resp.result.entityList) || [];
    var pgi = resp.result && resp.result.pagedSearchReturnData;
    var total = pgi ? pgi.totalItems : (pagina * AUVO_PEND_CFG.PAGE_SIZE);

    var linhasPagina = [];
    lote.forEach(function(tarefa) {
      if (tarefa.finished) return;
      var tecnicoIdSgo = Auvo_pendResolverTecnico_(tarefa.idUserTo, indiceSync, indiceEmailAuvo, indiceUsuarioPortalPorEmail);
      var dataTarefa = tarefa.taskDate ? new Date(tarefa.taskDate) : null;
      var dias = (dataTarefa && !isNaN(dataTarefa.getTime())) ? Math.floor((fim.getTime() - dataTarefa.getTime()) / 86400000) : '';
      linhasPagina.push({
        AUVO_TASK_ID: String(tarefa.taskID),
        TASK_TYPE_DESCRICAO: SGO_UTILS.safe(tarefa.taskTypeDescription),
        CLIENTE_NOME: SGO_UTILS.safe(tarefa.customerDescription),
        TECNICO_AUVO_ID: String(tarefa.idUserTo || ''),
        TECNICO_NOME: Auvo_pendResolverNomeTecnico_(tecnicoIdSgo, tarefa.userToName, tarefa.idUserTo),
        TECNICO_ID_SGO: tecnicoIdSgo || '',
        TASK_DATE: SGO_UTILS.safe(tarefa.taskDate),
        DIAS_ABERTA: dias,
        TEM_EVIDENCIA: Auvo_pendTemEvidencia_(tarefa) ? 'SIM' : 'NAO',
        TASK_URL: SGO_UTILS.safe(tarefa.taskUrl),
        SINCRONIZACAO_ID: sincronizacaoId,
        ULTIMA_SINCRONIZACAO: SGO_UTILS.nowIso()
      });
    });
    if (linhasPagina.length) SGO_DATA.insertMany(SGO_CFG.SHEETS.AUVO_PENDENCIAS, linhasPagina);

    if (lote.length === 0 || pagina * AUVO_PEND_CFG.PAGE_SIZE >= total) { concluiu = true; break; }
    pagina++;
  }

  if (concluiu) {
    Auvo_pendRemoverLinhasAntigas_(sincronizacaoId);
    Auvo_pendLimparCheckpoint_();
    PropertiesService.getScriptProperties().setProperty(AUVO_PEND_CFG.ULTIMA_COMPLETA_KEY, SGO_UTILS.nowIso());
    if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); // Início e Painel de qualidade veem a lista nova
    return { concluido: true };
  }

  Auvo_pendGravarCheckpoint_({ pagina: pagina + 1, sincronizacaoId: sincronizacaoId });
  return { concluido: false, paginaAtual: pagina };
}

function Auvo_pendAgendarContinuacao_() {
  var jaExiste = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'Auvo_pendContinuarViaTrigger_';
  });
  if (jaExiste) return;
  ScriptApp.newTrigger('Auvo_pendContinuarViaTrigger_').timeBased().after(60 * 1000).create();
}

function Auvo_pendContinuarViaTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_pendContinuarViaTrigger_') ScriptApp.deleteTrigger(t);
  });
  var resultado = Auvo_pendExecutarLote_();
  if (!resultado.concluido) Auvo_pendAgendarContinuacao_();
}

// Sempre começa uma rodada nova do zero (não retoma um checkpoint velho
// parcial) — usado tanto pelo botão manual quanto pelo trigger diário.
function Auvo_pendIniciarAtualizacao_() {
  Auvo_pendLimparCheckpoint_();
  var resultado = Auvo_pendExecutarLote_();
  if (!resultado.concluido) Auvo_pendAgendarContinuacao_();
  return resultado;
}

function Auvo_pendConfigurarTriggerDiario_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_pendDispararDiario_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_pendDispararDiario_')
    .timeBased().atHour(5).everyDays(1).inTimezone('America/Sao_Paulo').create();
}

function Auvo_pendDispararDiario_() {
  Auvo_pendIniciarAtualizacao_();
}

function Auvo_pendTriggerDiarioAtivo_() {
  return ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'Auvo_pendDispararDiario_'; });
}

// ------------------------------------------------------------
// Ligar/desligar a atualização diária automática — precisa ser chamado a
// partir de uma sessão logada de verdade (google.script.run), nunca de um
// doGet anônimo: criar trigger via ScriptApp exige o consentimento de
// escopo já concedido nesta conta/projeto, e isso só é validado nesse
// caminho (mesmo padrão dos outros toggles do módulo Auvo).
// ------------------------------------------------------------
function Auvo_apiAtivarSincronizacaoDiariaPendencias(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_pendConfigurarTriggerDiario_();
  return { ok: true, ativo: Auvo_pendTriggerDiarioAtivo_() };
}

function Auvo_apiDesativarSincronizacaoDiariaPendencias(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_pendDispararDiario_') ScriptApp.deleteTrigger(t);
  });
  return { ok: true, ativo: false };
}

function Auvo_apiStatusSincronizacaoDiariaPendencias(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return { ok: true, ativo: Auvo_pendTriggerDiarioAtivo_() };
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL (Gestor/Administrador, mesma trava do resto
// do módulo Auvo — ver Auvo_exigirAdmin_).
// ------------------------------------------------------------
function Auvo_apiListarPendencias(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_pendBootstrap_();
  var agora = new Date();
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_PENDENCIAS).filter(function(p) { return Auvo_pendDentroDaJanela_(p, agora); });
  itens.sort(function(a, b) { return Number(b.DIAS_ABERTA || 0) - Number(a.DIAS_ABERTA || 0); });

  var contagemOcorrencias = (typeof Qualidade_contarOcorrenciasAbertasPorPessoa_ === 'function')
    ? Qualidade_contarOcorrenciasAbertasPorPessoa_() : {};
  itens.forEach(function(i) {
    i.OCORRENCIAS_ABERTAS = contagemOcorrencias[SGO_UTILS.safe(i.TECNICO_ID_SGO)] || 0;
  });

  var comEvidencia = itens.filter(function(i) { return i.TEM_EVIDENCIA === 'SIM'; }).length;
  return {
    ok: true,
    items: itens,
    total: itens.length,
    comEvidencia: comEvidencia,
    semEvidencia: itens.length - comEvidencia,
    ultimaAtualizacao: PropertiesService.getScriptProperties().getProperty(AUVO_PEND_CFG.ULTIMA_COMPLETA_KEY) || '',
    atualizando: !!Auvo_pendLerCheckpoint_()
  };
}

function Auvo_apiAtualizarPendenciasAgora(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  var resultado = Auvo_pendIniciarAtualizacao_();
  return { ok: true, concluido: resultado.concluido };
}
