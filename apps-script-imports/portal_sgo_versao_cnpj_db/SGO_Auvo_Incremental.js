/****************************************************
 * SGO_Auvo_Incremental.js
 * INTEGRAÇÃO AUVO — sincronização incremental diária (Tarefas)
 *
 * Fluxo padrão a partir de 2026-08-27: em vez de trazer o histórico
 * inteiro do Auvo de uma vez (caro — gerou lentidão real na API deles
 * no mesmo dia), o Portal pergunta todo dia "quais Tarefas aconteceram
 * recentemente?" e só importa Cliente sob demanda, quando aparece numa
 * Tarefa de verdade. Reaproveita a MESMA lógica segura de mesclagem já
 * testada em SGO_Auvo_Reverso.js (nunca sobrescreve dado manual).
 *
 * Equipamento: Task do Auvo referencia equipamento(s) por ID
 * (equipmentsId) — resolvido sob demanda igual Cliente, reaproveitando
 * a mesma escrita segura de SGO_Auvo_Reverso.js (nunca sobrescreve
 * dado manual). Só é criado se tiver dado útil (TAG/FABRICANTE/etc).
 ****************************************************/

var AUVO_INC_CFG = {
  CHECKPOINT_KEY: 'AUVO_INC_CHECKPOINT',
  // roda a cada 30min (Auvo_configurarTriggerIncremental_) — margem pequena
  // já basta pra pegar edição tardia de Tarefa já vista, sem reprocessar
  // uma janela grande toda vez.
  MARGEM_HORAS: 6
};

function Auvo_incBootstrap_() {
  CertCal_garantirTabela_(SGO_CFG.SHEETS.AUVO_TAREFAS, [
    'ID', 'AUVO_TASK_ID', 'CLIENTE_AUVO_ID', 'CLIENTE_ID_SGO', 'CLIENTE_NOME_AUVO', 'TECNICO_AUVO_ID', 'TECNICO_ID_SGO', 'TECNICO_NOME_AUVO',
    'TIPO_TAREFA', 'DATA_TAREFA', 'FINALIZADA', 'CHECKIN_EM', 'CHECKOUT_EM', 'PRIORIDADE',
    'RELATO_SERVICO', 'QTD_FOTOS', 'ULTIMA_SINCRONIZACAO', 'EQUIPAMENTOS_ID_SGO'
  ]);
  // migração leve pra AUVO_TAREFAS já existente antes desses 2 campos —
  // o próprio Task do Auvo já manda o nome (userToName/customerDescription),
  // sem precisar de mais nenhuma chamada à API pra mostrar nome de verdade
  // em vez de "Técnico Auvo #ID" no dashboard/relatório.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'CLIENTE_NOME_AUVO');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'TECNICO_NOME_AUVO');
  // Task do Auvo referencia equipamento(s) por ID (equipmentsId) — vínculo
  // pedido pelo usuário 2026-08-27, resolvido sob demanda igual Cliente.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'EQUIPAMENTOS_ID_SGO');
  // O.S. completa (pedido do usuário 2026-08-27: trazer o conteúdo real
  // do atendimento pro SGO+, não só um link) — orientação do técnico,
  // endereço, checklist completo (perguntas/respostas/fotos/assinatura)
  // e o link direto da tarefa no Auvo (taskUrl, o próprio Auvo já manda).
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'ORIENTACAO');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'ENDERECO');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'TASK_URL');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'QUESTIONARIO_JSON');
}

// ------------------------------------------------------------
// BUSCA DE TAREFAS — janela pequena (não pagina o histórico inteiro)
// ------------------------------------------------------------
function Auvo_formatarDataAuvo_(data) {
  return Utilities.formatDate(data, 'UTC', 'yyyy-MM-dd');
}

function Auvo_buscarTarefasRecentes_(desde, ate) {
  var filtro = JSON.stringify({ startDate: Auvo_formatarDataAuvo_(desde), endDate: Auvo_formatarDataAuvo_(ate) });
  var itens = [];
  var pagina = 1;
  var pageSize = AUVO_CFG.PAGE_SIZE_MAX;
  while (true) {
    var resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.TASKS + '?page=' + pagina + '&pageSize=' + pageSize +
      '&paramFilter=' + encodeURIComponent(filtro), null);
    var lote = (resp.result && resp.result.entityList) || [];
    itens = itens.concat(lote);
    var paginacao = resp.result && resp.result.pagedSearchReturnData;
    var total = paginacao ? paginacao.totalItems : itens.length;
    if (lote.length === 0 || itens.length >= total) break;
    pagina++;
    if (pagina > 100) break; // trava de segurança — janela pequena nunca deveria chegar aqui
  }
  return itens;
}

// ------------------------------------------------------------
// MAPEAMENTO — Task do Auvo -> linha de AUVO_TAREFAS
// ------------------------------------------------------------
function Auvo_extrairRelatoServico_(tarefa) {
  var textos = [];
  var fotos = 0;
  (tarefa.questionnaires || []).forEach(function(q) {
    (q.answers || []).forEach(function(a) {
      var desc = Auvo_normalizarTexto_(a.questionDescription);
      if (desc.indexOf('FOTO') !== -1) { fotos++; return; }
      if (desc.indexOf('ASSINATURA') !== -1) return;
      var reply = SGO_UTILS.safe(a.reply);
      if (reply && reply.indexOf('http') !== 0) textos.push(reply);
    });
  });
  return { relato: textos.join(' | ').slice(0, 2000), qtdFotos: fotos };
}

// Checklist completo (todas as perguntas/respostas do questionário, com
// tipo pra saber renderizar como texto/foto/assinatura) — pra montar a
// O.S. inteira dentro do SGO+, não só o relato de texto (que já ignora
// foto/assinatura de propósito, ver Auvo_extrairRelatoServico_ acima).
function Auvo_extrairQuestionarioCompleto_(tarefa) {
  var itens = [];
  (tarefa.questionnaires || []).forEach(function(q) {
    (q.answers || []).forEach(function(a) {
      var desc = Auvo_normalizarTexto_(a.questionDescription);
      var tipo = 'texto';
      if (desc.indexOf('FOTO') !== -1) tipo = 'foto';
      else if (desc.indexOf('ASSINATURA') !== -1) tipo = 'assinatura';
      itens.push({
        pergunta: SGO_UTILS.safe(a.questionDescription),
        resposta: SGO_UTILS.safe(a.reply),
        tipo: tipo
      });
    });
  });
  return itens;
}

function Auvo_mapearTarefaAuvo_(tarefa, clienteIdSgo, tecnicoIdSgo, equipamentosIdSgo) {
  var extraido = Auvo_extrairRelatoServico_(tarefa);
  return {
    AUVO_TASK_ID: String(tarefa.taskID),
    CLIENTE_AUVO_ID: String(tarefa.customerId || ''),
    CLIENTE_ID_SGO: clienteIdSgo || '',
    CLIENTE_NOME_AUVO: SGO_UTILS.safe(tarefa.customerDescription),
    TECNICO_AUVO_ID: String(tarefa.idUserTo || ''),
    TECNICO_ID_SGO: tecnicoIdSgo || '',
    TECNICO_NOME_AUVO: SGO_UTILS.safe(tarefa.userToName),
    TIPO_TAREFA: SGO_UTILS.safe(tarefa.taskTypeDescription),
    DATA_TAREFA: SGO_UTILS.safe(tarefa.taskDate),
    FINALIZADA: tarefa.finished ? 'SIM' : 'NAO',
    CHECKIN_EM: SGO_UTILS.safe(tarefa.checkInDate),
    CHECKOUT_EM: SGO_UTILS.safe(tarefa.checkOutDate),
    PRIORIDADE: SGO_UTILS.safe(tarefa.priority),
    RELATO_SERVICO: extraido.relato,
    QTD_FOTOS: extraido.qtdFotos,
    ULTIMA_SINCRONIZACAO: SGO_UTILS.nowIso(),
    EQUIPAMENTOS_ID_SGO: (equipamentosIdSgo || []).join(','),
    ORIENTACAO: SGO_UTILS.safe(tarefa.orientation),
    ENDERECO: SGO_UTILS.safe(tarefa.address),
    TASK_URL: SGO_UTILS.safe(tarefa.taskUrl),
    QUESTIONARIO_JSON: JSON.stringify(Auvo_extrairQuestionarioCompleto_(tarefa)).slice(0, 45000)
  };
}

function Auvo_upsertTarefa_(dadosTarefa) {
  SGO_DATA.upsertByField(SGO_CFG.SHEETS.AUVO_TAREFAS, 'AUVO_TASK_ID', dadosTarefa.AUVO_TASK_ID, dadosTarefa);
}

// ------------------------------------------------------------
// RESOLUÇÃO SOB DEMANDA — Cliente/Técnico de 1 Tarefa. Reaproveita a
// mesma função de escrita segura do bulk (Auvo_calcularEscritaGrupoCliente_),
// só que com um "grupo" sintético de 1 customer só.
// ------------------------------------------------------------
function Auvo_resolverTecnicoIncremental_(userIdAuvo, indiceSync) {
  if (!userIdAuvo) return null;
  var mapa = indiceSync['TECNICO'] || {};
  var m = mapa[String(userIdAuvo)];
  return m ? m.ENTIDADE_ID : null; // só existe se o técnico já foi linkado via SGO -> Auvo
}

function Auvo_resolverEquipamentosIncremental_(equipmentsIdAuvo, indiceSync) {
  if (!equipmentsIdAuvo || !equipmentsIdAuvo.length) return [];
  var mapaEquip = indiceSync['EQUIPAMENTO'] || {};
  var resolvidos = [];
  var pendentes = equipmentsIdAuvo.filter(function(idAuvo) {
    var m = mapaEquip[String(idAuvo)];
    if (m && m.ENTIDADE_ID) { resolvidos.push(m.ENTIDADE_ID); return false; }
    return true;
  });
  if (!pendentes.length) return resolvidos;

  var indiceUnidadesPorId = Auvo_construirIndicePorId_('CAD_UNIDADES');
  var indiceEquipPorTag = Auvo_construirIndiceEquipamentosPorTag_();
  var indiceEquipPorId = Auvo_construirIndicePorId_('CAD_EQUIPAMENTOS');

  pendentes.forEach(function(idAuvo) {
    var resp;
    try { resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '/' + idAuvo, null); } catch (e) { return; }
    var eq = resp && resp.result;
    if (!eq) return;

    var r = Auvo_calcularEscritaEquipamento_(eq, indiceSync, indiceUnidadesPorId, indiceEquipPorTag, indiceEquipPorId);
    if (r.acao === 'ignorado_sem_dado') return;

    var equipId = null;
    if (r.equipInsert) { SGO_DATA.insert(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, r.equipInsert); equipId = r.equipInsert.ID; }
    if (r.equipUpdate) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, r.equipUpdate.id, r.equipUpdate.dados); equipId = r.equipUpdate.id; }
    if (r.acao === 'protegido' && r.mapeamentoNovo) equipId = r.mapeamentoNovo.entidadeId;

    if (r.mapeamentoNovo) {
      SGO_DATA.insert(SGO_CFG.SHEETS.AUVO_SYNC, Auvo_montarLinhaAuvoSync_(r.mapeamentoNovo.tipo, r.mapeamentoNovo.entidadeId, r.mapeamentoNovo.auvoId));
      indiceSync[r.mapeamentoNovo.tipo] = indiceSync[r.mapeamentoNovo.tipo] || {};
      indiceSync[r.mapeamentoNovo.tipo][r.mapeamentoNovo.auvoId] = { ENTIDADE_ID: r.mapeamentoNovo.entidadeId };
    }
    if (equipId) resolvidos.push(equipId);
  });
  return resolvidos;
}

function Auvo_resolverClienteIncremental_(customerIdAuvo, indiceSync) {
  if (!customerIdAuvo) return { clienteId: null, unidadeId: null };

  var alvo = String(customerIdAuvo);
  var mCliente = (indiceSync['CLIENTE'] || {})[alvo];
  var mUnidade = (indiceSync['UNIDADE'] || {})[alvo];
  if (mCliente || mUnidade) {
    var unidadeId = mUnidade ? mUnidade.ENTIDADE_ID : null;
    var unidadeAtual = unidadeId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, unidadeId) : null;
    if (unidadeId && (!unidadeAtual || !unidadeAtual.CLIENTE_ID || SGO_UTILS.safeUpper(unidadeAtual.STATUS)!=='ATIVO')) throw new Error('Unidade Auvo com vínculo pendente ou inativo. Resolva no painel do gestor.');
    var clienteId = unidadeAtual ? unidadeAtual.CLIENTE_ID : (mCliente ? mCliente.ENTIDADE_ID : null);
    if (unidadeAtual && mCliente && String(mCliente.ENTIDADE_ID)!==String(clienteId)) throw new Error('Mapeamentos Auvo de cliente e unidade divergentes. Resolva no painel do gestor.');
    return { clienteId: clienteId || null, unidadeId: unidadeId };
  }

  // nunca visto antes — busca só ESSE customer no Auvo (chamada leve) e
  // importa com a mesma lógica segura do bulk (nunca sobrescreve manual)
  var resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.CUSTOMERS + '/' + customerIdAuvo, null);
  var customer = resp.result;
  if (!customer) return { clienteId: null, unidadeId: null };

  var raiz = Auvo_normalizarCnpjRaiz_(customer.cpfCnpj);
  var grupoSintetico = { cnpjRaiz: raiz, customers: [customer], multiplasUnidades: false, semCnpj: !raiz };

  var indiceClientesPorCnpj = Auvo_construirIndiceClientesPorCnpjRaiz_();
  var indiceClientesPorId = Auvo_construirIndicePorId_('CAD_CLIENTES');
  var indiceUnidadesPorId = Auvo_construirIndicePorId_('CAD_UNIDADES');
  var r = Auvo_calcularEscritaGrupoCliente_(grupoSintetico, indiceSync, indiceClientesPorCnpj, indiceClientesPorId, indiceUnidadesPorId);

  if (r.clienteInsert) SGO_DATA.insert(SGO_CFG.SHEETS.CAD_CLIENTES, r.clienteInsert);
  if (r.clienteUpdate) SGO_DATA.update(SGO_CFG.SHEETS.CAD_CLIENTES, r.clienteUpdate.id, r.clienteUpdate.dados);
  r.unidadesInsert.forEach(function(u) { SGO_DATA.insert(SGO_CFG.SHEETS.CAD_UNIDADES, u); });
  r.unidadesUpdate.forEach(function(u) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_UNIDADES, u.id, u.dados); });
  r.mapeamentosNovos.forEach(function(m) {
    SGO_DATA.insert(SGO_CFG.SHEETS.AUVO_SYNC, Auvo_montarLinhaAuvoSync_(m.tipo, m.entidadeId, m.auvoId));
    if (!indiceSync[m.tipo]) indiceSync[m.tipo] = {};
    indiceSync[m.tipo][m.auvoId] = { ENTIDADE_ID: m.entidadeId };
  });

  return { clienteId: r.clienteId, unidadeId: r.unidadesPorAuvoId[String(customer.id)] || null };
}

// ------------------------------------------------------------
// CHECKPOINT + EXECUÇÃO PRINCIPAL
// ------------------------------------------------------------
function Auvo_lerCheckpointIncremental_() {
  var raw = PropertiesService.getScriptProperties().getProperty(AUVO_INC_CFG.CHECKPOINT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function Auvo_gravarCheckpointIncremental_(cp) {
  PropertiesService.getScriptProperties().setProperty(AUVO_INC_CFG.CHECKPOINT_KEY, JSON.stringify(cp));
}

function Auvo_processarTarefasIncremental_() {
  Auvo_incBootstrap_();
  Auvo_bootstrap_();

  var agora = new Date();
  var checkpoint = Auvo_lerCheckpointIncremental_();
  var desde = checkpoint && checkpoint.ultimaExecucao ? new Date(checkpoint.ultimaExecucao) : new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  desde = new Date(desde.getTime() - AUVO_INC_CFG.MARGEM_HORAS * 60 * 60 * 1000);

  var tarefas = Auvo_buscarTarefasRecentes_(desde, agora);
  var indiceSync = Auvo_construirIndiceMapeamento_();

  var processadas = 0, clientesNovos = 0, erros = [];
  tarefas.forEach(function(tarefa) {
    try {
      var clientesAntes = indiceSync['CLIENTE'] ? Object.keys(indiceSync['CLIENTE']).length : 0;
      var resolvido = Auvo_resolverClienteIncremental_(tarefa.customerId, indiceSync);
      var clientesDepois = indiceSync['CLIENTE'] ? Object.keys(indiceSync['CLIENTE']).length : 0;
      if (clientesDepois > clientesAntes) clientesNovos++;

      var tecnicoIdSgo = Auvo_resolverTecnicoIncremental_(tarefa.idUserTo, indiceSync);
      var equipamentosIdSgo = Auvo_resolverEquipamentosIncremental_(tarefa.equipmentsId, indiceSync);
      var dadosTarefa = Auvo_mapearTarefaAuvo_(tarefa, resolvido.clienteId, tecnicoIdSgo, equipamentosIdSgo);
      Auvo_upsertTarefa_(dadosTarefa);
      processadas++;
    } catch (e) {
      erros.push('Tarefa #' + tarefa.taskID + ': ' + e.message);
    }
  });

  Auvo_gravarCheckpointIncremental_({ ultimaExecucao: SGO_UTILS.nowIso() });

  return {
    janelaDesde: Auvo_formatarDataAuvo_(desde), janelaAte: Auvo_formatarDataAuvo_(agora),
    totalTarefasEncontradas: tarefas.length, processadas: processadas, clientesNovos: clientesNovos, erros: erros
  };
}

function Auvo_estaSincronizacaoIncrementalAtiva_() {
  return ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'Auvo_dispararSincronizacaoIncremental_'; });
}

function Auvo_configurarTriggerIncremental_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_dispararSincronizacaoIncremental_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_dispararSincronizacaoIncremental_')
    .timeBased().everyMinutes(30).create();
}

function Auvo_dispararSincronizacaoIncremental_() {
  Auvo_processarTarefasIncremental_();
}

// ------------------------------------------------------------
// EVENTOS RECENTES — pro alerta sonoro/balão no dashboard. Olha
// CHECKIN_EM/CHECKOUT_EM de AUVO_TAREFAS mais recentes que `desdeIso`
// (checkpoint fica só no navegador de quem está com o Portal aberto,
// não precisa de tabela nova nem estado por usuário).
// ------------------------------------------------------------
function Auvo_apiVerificarNovosEventos(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var desdeIso = (payload || {}).desde;
  if (!desdeIso) return { ok: true, eventos: [] };
  var desde = new Date(desdeIso).getTime();
  if (isNaN(desde)) return { ok: true, eventos: [] };

  var indiceClientes = Auvo_construirIndicePorId_('CAD_CLIENTES');
  var eventos = [];
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function(t) {
    var nomeCliente = (indiceClientes[t.CLIENTE_ID_SGO] || {}).NOME_FANTASIA ||
      (indiceClientes[t.CLIENTE_ID_SGO] || {}).RAZAO_SOCIAL || 'Cliente não identificado';
    [
      { campo: 'CHECKIN_EM', tipo: 'inicio' },
      { campo: 'CHECKOUT_EM', tipo: 'fim' }
    ].forEach(function(marco) {
      var valor = t[marco.campo];
      if (!valor) return;
      var ts = new Date(valor).getTime();
      if (isNaN(ts) || ts <= desde) return;
      eventos.push({
        tipo: marco.tipo, auvoTaskId: t.AUVO_TASK_ID, cliente: nomeCliente,
        tipoTarefa: t.TIPO_TAREFA || '', em: valor
      });
    });
  });
  eventos.sort(function(a, b) { return new Date(a.em) - new Date(b.em); });
  return { ok: true, eventos: eventos, agora: SGO_UTILS.nowIso() };
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL (todas atrás de admin)
// ------------------------------------------------------------
// O.S. completa de 1 atendimento — pedido do usuário 2026-08-27 pra ver
// o conteúdo real do atendimento dentro do SGO+ (não só um link pra fora).
function Auvo_apiObterOS(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var auvoTaskId = (payload || {}).auvoTaskId;
  if (!auvoTaskId) return { ok: false, message: 'ID da tarefa não informado.' };

  var tarefa = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS).find(function(t) { return String(t.AUVO_TASK_ID) === String(auvoTaskId); });
  if (!tarefa) return { ok: false, message: 'Tarefa não encontrada.' };

  var cliente = tarefa.CLIENTE_ID_SGO ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, tarefa.CLIENTE_ID_SGO) : null;
  var nomeCliente = (cliente && (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL)) || tarefa.CLIENTE_NOME_AUVO ||
    (tarefa.CLIENTE_AUVO_ID ? 'Cliente Auvo #' + tarefa.CLIENTE_AUVO_ID : 'Cliente não identificado');

  var tecnico = tarefa.TECNICO_ID_SGO ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, tarefa.TECNICO_ID_SGO) : null;
  var nomeTecnico = (tecnico && tecnico.NOME) || tarefa.TECNICO_NOME_AUVO ||
    (tarefa.TECNICO_AUVO_ID ? 'Técnico Auvo #' + tarefa.TECNICO_AUVO_ID : 'Técnico não identificado');

  var questionario = [];
  try { questionario = JSON.parse(tarefa.QUESTIONARIO_JSON || '[]'); } catch (e) { questionario = []; }

  return {
    ok: true,
    os: {
      cliente: nomeCliente,
      tecnico: nomeTecnico,
      tipo: tarefa.TIPO_TAREFA,
      data: tarefa.DATA_TAREFA,
      finalizada: tarefa.FINALIZADA === 'SIM',
      checkin: tarefa.CHECKIN_EM,
      checkout: tarefa.CHECKOUT_EM,
      orientacao: tarefa.ORIENTACAO,
      endereco: tarefa.ENDERECO,
      relato: tarefa.RELATO_SERVICO,
      taskUrl: tarefa.TASK_URL,
      questionario: questionario
    }
  };
}

function Auvo_apiRodarSincronizacaoIncremental(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_processarTarefasIncremental_());
}

function Auvo_apiAtivarSincronizacaoIncremental(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_configurarTriggerIncremental_();
  return { ok: true, message: 'Sincronização automática de Tarefas agendada pra rodar a cada 30 minutos.' };
}

function Auvo_apiStatusSincronizacaoIncremental(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return { ok: true, checkpoint: Auvo_lerCheckpointIncremental_(), ativo: Auvo_estaSincronizacaoIncrementalAtiva_() };
}

function Auvo_apiDesativarSincronizacaoIncremental(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_dispararSincronizacaoIncremental_') ScriptApp.deleteTrigger(t);
  });
  return { ok: true, message: 'Sincronização automática desativada. Você ainda pode rodar manualmente com "Rodar agora".' };
}
