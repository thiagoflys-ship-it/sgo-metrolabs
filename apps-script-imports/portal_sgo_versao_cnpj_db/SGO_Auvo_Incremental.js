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
  MARGEM_HORAS: 6,
  // O.S. ainda aberta agendada nos últimos N dias é relida a cada rodada (ver Auvo_inicioJanelaComAbertas_)
  DIAS_REVISAR_ABERTAS: 7
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
  // Avisos de O.S. (2026-10-16): quando cada aviso foi disparado — 1 vez por evento.
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'AVISO_ABERTURA_EM');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.AUVO_TAREFAS, 'AVISO_FECHAMENTO_EM');
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

// 16/10/2026 (regra do dono: nunca sobrescrever sem merge): quando o vínculo
// não se resolve nesta rodada (cliente/técnico sem mapeamento, equipamento que
// falhou ao consultar no Auvo), o valor vazio não apaga o vínculo que a tarefa
// já tinha. Os demais campos vêm do Auvo, que é a fonte da tarefa.
var AUVO_TAREFA_CAMPOS_VINCULO = ['CLIENTE_ID_SGO', 'TECNICO_ID_SGO', 'EQUIPAMENTOS_ID_SGO'];

function Auvo_upsertTarefa_(dadosTarefa, existente) {
  var dados = Object.assign({}, dadosTarefa);
  if (existente === undefined) {
    existente = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS).filter(function(t) { return String(t.AUVO_TASK_ID) === String(dadosTarefa.AUVO_TASK_ID); })[0] || null;
  }
  if (existente) {
    AUVO_TAREFA_CAMPOS_VINCULO.forEach(function(campo) {
      if (!SGO_UTILS.safe(dados[campo]) && SGO_UTILS.safe(existente[campo])) delete dados[campo];
    });
  }
  SGO_DATA.upsertByField(SGO_CFG.SHEETS.AUVO_TAREFAS, 'AUVO_TASK_ID', dadosTarefa.AUVO_TASK_ID, dados);
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
  // 16/10/2026: o mesmo equipamento sem cadastro útil era consultado no Auvo
  // de novo a cada tarefa da rodada. Agora 1 consulta por rodada.
  var jaConsultados = indiceSync.__equipConsultados = indiceSync.__equipConsultados || {};
  var pendentes = equipmentsIdAuvo.filter(function(idAuvo) {
    var m = mapaEquip[String(idAuvo)];
    if (m && m.ENTIDADE_ID) { resolvidos.push(m.ENTIDADE_ID); return false; }
    if (jaConsultados[String(idAuvo)]) return false;
    jaConsultados[String(idAuvo)] = true;
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
  var tarefasLocais = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS);
  desde = Auvo_inicioJanelaComAbertas_(desde, agora, tarefasLocais);

  var tarefas = Auvo_buscarTarefasRecentes_(desde, agora);
  var indiceSync = Auvo_construirIndiceMapeamento_();
  var locaisPorId = {};
  tarefasLocais.forEach(function(t) { locaisPorId[String(t.AUVO_TASK_ID)] = t; });

  var processadas = 0, clientesNovos = 0, erros = [];
  var avisos = Auvo_avisosPreparar_(); // null = avisos desligados (AUVO_AVISOS_WHATSAPP != '1')
  tarefas.forEach(function(tarefa) {
    try {
      var clientesAntes = indiceSync['CLIENTE'] ? Object.keys(indiceSync['CLIENTE']).length : 0;
      var resolvido = Auvo_resolverClienteIncremental_(tarefa.customerId, indiceSync);
      var clientesDepois = indiceSync['CLIENTE'] ? Object.keys(indiceSync['CLIENTE']).length : 0;
      if (clientesDepois > clientesAntes) clientesNovos++;

      var tecnicoIdSgo = Auvo_resolverTecnicoIncremental_(tarefa.idUserTo, indiceSync);
      var equipamentosIdSgo = Auvo_resolverEquipamentosIncremental_(tarefa.equipmentsId, indiceSync);
      var dadosTarefa = Auvo_mapearTarefaAuvo_(tarefa, resolvido.clienteId, tecnicoIdSgo, equipamentosIdSgo);
      Auvo_upsertTarefa_(dadosTarefa, locaisPorId[String(dadosTarefa.AUVO_TASK_ID)] || null);
      processadas++;
      if (avisos) Auvo_avisosTarefa_(avisos, tarefa, dadosTarefa, resolvido); // nunca lança erro
    } catch (e) {
      erros.push('Tarefa #' + tarefa.taskID + ': ' + e.message);
    }
  });

  Auvo_gravarCheckpointIncremental_({ ultimaExecucao: SGO_UTILS.nowIso() });

  return {
    janelaDesde: Auvo_formatarDataAuvo_(desde), janelaAte: Auvo_formatarDataAuvo_(agora),
    totalTarefasEncontradas: tarefas.length, processadas: processadas, clientesNovos: clientesNovos, erros: erros,
    avisos: avisos ? avisos.contagem : null
  };
}

/**
 * 16/10/2026: o filtro de datas do Auvo é pela data agendada da tarefa. Com a
 * janela só das últimas horas, uma O.S. agendada para ontem e finalizada hoje
 * nunca era lida de novo — continuava "não finalizada" no SGO+ e o aviso de
 * conclusão não saía. A janela recua até a tarefa ainda aberta mais antiga
 * dos últimos AUVO_INC_CFG.DIAS_REVISAR_ABERTAS dias (as mais antigas ficam
 * com o painel de Pendências, que varre o histórico todo uma vez por dia).
 */
function Auvo_inicioJanelaComAbertas_(desde, agora, tarefasLocais) {
  var limite = new Date(agora.getTime() - AUVO_INC_CFG.DIAS_REVISAR_ABERTAS * 86400000);
  var inicio = desde;
  (tarefasLocais || []).forEach(function(t) {
    if (SGO_UTILS.safeUpper(t.FINALIZADA) === 'SIM') return;
    var norm = Auvo_avisosDataNorm_(t.DATA_TAREFA);
    if (!norm) return;
    var d = new Date(Number(norm.substring(0, 4)), Number(norm.substring(5, 7)) - 1, Number(norm.substring(8, 10)));
    if (isNaN(d.getTime()) || d > agora) return;
    if (d < limite) return; // mais antiga que isso fica com o painel de Pendências
    if (d < inicio) inicio = d;
  });
  return inicio;
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
// AVISOS DE O.S. POR WHATSAPP E E-MAIL (2026-10-16)
//
// Na sincronização incremental, cada Tarefa do Auvo pode gerar 2 eventos:
//  - ABERTURA: a tarefa aparece pela 1ª vez no SGO+ (não existia em AUVO_TAREFAS).
//  - FECHAMENTO: a tarefa está finalizada no Auvo (finished = true, mesma regra da
//    coluna FINALIZADA). Hora do evento = checkOutDate; sem check-out, a hora em que
//    o SGO+ viu a passagem de "não finalizada" para "finalizada".
// Destinatários de cada evento (SGO_notificar_, canais e-mail + WhatsApp; modelos
// da Meta sgo_chamado_aberto / sgo_chamado_concluido de NTF_MODELOS_META):
//  (a) técnico: TECNICO_ID_SGO (CAD_USUARIOS, vínculo Auvo userId -> usuário em
//      AUVO_SYNC tipo TECNICO). Celular: CAD_USUARIOS.CELULAR, depois Técnico.
//  (b) gestão: propriedade AUVO_AVISAR_GESTAO = lista de USUARIO (login) separados
//      por vírgula (ex.: "joao, maria"); vazia = todos os usuários ativos com perfil
//      GESTOR ou DIRETORIA.
//  (c) cliente: contato da unidade (CAD_UNIDADES.TELEFONE, RESPONSAVEL) e do cliente
//      (CAD_CLIENTES.TELEFONE, EMAIL, CONTATO); telefone da unidade tem preferência.
//      Sem cadastro ou sem contato: pula e registra o motivo em NTF_ENVIOS.
// Chaves (Chaves e senhas, grupo Auvo):
//  AUVO_AVISOS_WHATSAPP = '1' liga (padrão desligado; desligado não grava nada).
//  AUVO_AVISOS_DESDE = data de corte "aaaa-mm-ddThh:mm:ss" (Brasília), gravada pela
//      1ª sincronização com os avisos ligados. Evento anterior ao corte nunca avisa,
//      para não disparar o histórico (centenas de O.S. antigas).
// Uma vez por evento: AVISO_ABERTURA_EM / AVISO_FECHAMENTO_EM em AUVO_TAREFAS, gravado
// ANTES do envio (se a marcação falhar, não envia). Falha de aviso nunca derruba a
// sincronização: tudo em try/catch, com registro em NTF_ENVIOS (ORIGEM AUVO_OS).
// ------------------------------------------------------------
var AUVO_AVISOS_CFG = {
  CHAVE_LIGA: 'AUVO_AVISOS_WHATSAPP',
  CHAVE_DESDE: 'AUVO_AVISOS_DESDE',
  CHAVE_GESTAO: 'AUVO_AVISAR_GESTAO',
  PERFIS_GESTAO_PADRAO: ['GESTOR', 'DIRETORIA'],
  // tarefa vista pela 1ª vez com data agendada muito antiga = histórico, não abertura
  DIAS_HISTORICO_ABERTURA: 7,
  FUSO: 'America/Sao_Paulo',
  ORIGEM: 'AUVO_OS'
};

function Auvo_avisosAgora_() {
  return Utilities.formatDate(new Date(), AUVO_AVISOS_CFG.FUSO, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Data do Auvo/planilha -> "aaaa-mm-ddThh:mm:ss" em horário de Brasília; '' se não der para ler. */
function Auvo_avisosDataNorm_(v) {
  if (v === null || v === undefined || v === '') return '';
  var fmt = function (d) { return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, AUVO_AVISOS_CFG.FUSO, "yyyy-MM-dd'T'HH:mm:ss"); };
  if (Object.prototype.toString.call(v) === '[object Date]') return fmt(v);
  var s = String(v).trim(), m;
  // com fuso explícito (Z ou +hh:mm): converte para Brasília
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(s)) return fmt(new Date(s));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3] + 'T' + (m[4] || '00') + ':' + (m[5] || '00') + ':' + (m[6] || '00');
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1] + 'T' + (m[4] || '00') + ':' + (m[5] || '00') + ':' + (m[6] || '00');
  return '';
}

/** "2026-10-21T08:30:00" -> "21/10/2026 08:30" (sem hora quando 00:00:00). */
function Auvo_avisosDataBr_(norm) {
  var m = String(norm || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return '';
  var d = m[3] + '/' + m[2] + '/' + m[1];
  return (m[4] + m[5] + m[6] === '000000') ? d : d + ' ' + m[4] + ':' + m[5];
}

function Auvo_avisosRegistrarFalha_(refId, motivo) {
  try {
    Notificar_garantirAba_();
    SGO_DATA.insert(Notificar_aba_(), {
      QUANDO: Notificar_agora_(), USUARIO_ID: '', USUARIO_NOME: '', CANAL: 'whatsapp', DESTINO: '',
      ASSUNTO: 'Aviso de O.S. do Auvo', ORIGEM: AUVO_AVISOS_CFG.ORIGEM, REF_ID: String(refId || '').slice(0, 80),
      SITUACAO: 'ERRO', MOTIVO: String((motivo && motivo.message) || motivo || '').slice(0, 480)
    });
  } catch (e) { console.error('Aviso Auvo: não foi possível registrar a falha: ' + ((e && e.message) || e)); }
}

/**
 * Antes do laço da sincronização. null = avisos desligados (nada é gravado).
 * Grava a data de corte na 1ª execução com os avisos ligados.
 */
function Auvo_avisosPreparar_() {
  try {
    var props = PropertiesService.getScriptProperties();
    if (String(props.getProperty(AUVO_AVISOS_CFG.CHAVE_LIGA) || '').trim() !== '1') return null;
    var agora = Auvo_avisosAgora_();
    var desde = Auvo_avisosDataNorm_(props.getProperty(AUVO_AVISOS_CFG.CHAVE_DESDE));
    if (!desde) { desde = agora; props.setProperty(AUVO_AVISOS_CFG.CHAVE_DESDE, desde); }
    var anteriores = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function (t) {
      var id = String(t.AUVO_TASK_ID || '').trim();
      if (!id) return;
      anteriores[id] = {
        FINALIZADA: SGO_UTILS.safeUpper(t.FINALIZADA),
        AVISO_ABERTURA_EM: t.AVISO_ABERTURA_EM ? '1' : '',
        AVISO_FECHAMENTO_EM: t.AVISO_FECHAMENTO_EM ? '1' : ''
      };
    });
    return { desde: desde, agora: agora, anteriores: anteriores, ctx: null, contagem: { abertura: 0, fechamento: 0 } };
  } catch (e) {
    Auvo_avisosRegistrarFalha_('PREPARAR', 'Avisos de O.S. não preparados nesta sincronização: ' + ((e && e.message) || e));
    return null;
  }
}

/** Quais eventos da tarefa devem avisar agora: [{ tipo: 'abertura'|'fechamento', quando }]. */
function Auvo_avisosEventos_(av, tarefa, dados) {
  var ant = av.anteriores[String(dados.AUVO_TASK_ID)] || null;
  var eventos = [];
  var fechamentoAntigo = false;
  if (dados.FINALIZADA === 'SIM' && !(ant && ant.AVISO_FECHAMENTO_EM)) {
    var quandoFe = Auvo_avisosDataNorm_(tarefa.checkOutDate);
    if (!quandoFe) {
      if (ant && ant.FINALIZADA !== 'SIM') quandoFe = av.agora;      // passou a finalizada agora
      else if (!ant) quandoFe = Auvo_avisosDataNorm_(tarefa.taskDate); // 1ª vez já finalizada
    }
    if (quandoFe && quandoFe >= av.desde) eventos.push({ tipo: 'fechamento', quando: quandoFe });
    else fechamentoAntigo = true;
  }
  if (!ant && !fechamentoAntigo) {
    var agendada = Auvo_avisosDataNorm_(tarefa.taskDate);
    var limite = Auvo_avisosDataNorm_(new Date(new Date().getTime() - AUVO_AVISOS_CFG.DIAS_HISTORICO_ABERTURA * 86400000));
    if (!(agendada && agendada < av.desde && agendada < limite)) eventos.unshift({ tipo: 'abertura', quando: av.agora });
  }
  return eventos;
}

/** Usuários e gestão, carregados 1 vez por sincronização (só quando há evento). */
function Auvo_avisosContexto_(av) {
  if (av.ctx) return av.ctx;
  var usuarios = {};
  var todos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS);
  todos.forEach(function (u) { usuarios[String(u.ID || '')] = u; });
  var ativos = todos.filter(function (u) {
    return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && u.ID;
  });
  var lista = String(PropertiesService.getScriptProperties().getProperty(AUVO_AVISOS_CFG.CHAVE_GESTAO) || '')
    .split(/[,;\s]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
  var gestao = ativos.filter(function (u) {
    if (lista.length) return lista.indexOf(String(u.USUARIO || '').trim().toLowerCase()) >= 0;
    return AUVO_AVISOS_CFG.PERFIS_GESTAO_PADRAO.indexOf(SGO_UTILS.safeUpper(u.PERFIL)) >= 0;
  }).map(function (u) { return String(u.ID); });
  av.ctx = { usuarios: usuarios, gestao: gestao };
  return av.ctx;
}

function Auvo_avisosEnviar_(av, ev, dados, resolvido) {
  var ctx = Auvo_avisosContexto_(av);
  var cliente = resolvido && resolvido.clienteId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, resolvido.clienteId) : null;
  var unidade = resolvido && resolvido.unidadeId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, resolvido.unidadeId) : null;
  var nomeCliente = (cliente && (SGO_UTILS.safe(cliente.NOME_FANTASIA) || SGO_UTILS.safe(cliente.RAZAO_SOCIAL))) ||
    dados.CLIENTE_NOME_AUVO || (dados.CLIENTE_AUVO_ID ? 'Cliente Auvo #' + dados.CLIENTE_AUVO_ID : 'Cliente não identificado');
  var nomeUnidade = unidade ? SGO_UTILS.safe(unidade.NOME_UNIDADE) : '';
  if (nomeUnidade && nomeUnidade.toUpperCase() !== String(nomeCliente).toUpperCase()) nomeCliente += ' — ' + nomeUnidade;
  var tec = dados.TECNICO_ID_SGO ? ctx.usuarios[String(dados.TECNICO_ID_SGO)] : null;
  var nomeTecnico = (tec && SGO_UTILS.safe(tec.NOME)) || dados.TECNICO_NOME_AUVO || 'a definir';
  var numero = 'Nº ' + dados.AUVO_TASK_ID;
  var chamado = numero + (dados.TIPO_TAREFA ? ' — ' + dados.TIPO_TAREFA : '');
  var agendamento = Auvo_avisosDataBr_(Auvo_avisosDataNorm_(dados.DATA_TAREFA)) || 'data a definir';
  var abertura = ev.tipo === 'abertura';
  var titulo, texto, modelo;
  if (abertura) {
    titulo = 'Chamado técnico aberto: ' + numero + ' — ' + nomeCliente;
    texto = 'Chamado técnico aberto.\n\nCliente: ' + nomeCliente + '\nChamado: ' + chamado + '\nAgendamento: ' + agendamento +
      '\nTécnico: ' + nomeTecnico + (dados.ENDERECO ? '\nEndereço: ' + dados.ENDERECO : '');
    modelo = { nome: 'sgo_chamado_aberto', parametros: [nomeCliente, chamado, agendamento + ', técnico ' + nomeTecnico] };
  } else {
    var concluido = Auvo_avisosDataBr_(ev.quando) || Auvo_avisosDataBr_(av.agora);
    titulo = 'Chamado técnico concluído: ' + numero + ' — ' + nomeCliente;
    texto = 'Chamado técnico concluído.\n\nCliente: ' + nomeCliente + '\nChamado: ' + chamado + '\nConcluído em: ' + concluido +
      '\nTécnico: ' + nomeTecnico;
    modelo = { nome: 'sgo_chamado_concluido', parametros: [nomeCliente, chamado, concluido] };
  }
  var refId = String(dados.AUVO_TASK_ID) + ':' + (abertura ? 'ABERTURA' : 'FECHAMENTO');

  // (a) técnico + (b) gestão
  var internos = [];
  if (dados.TECNICO_ID_SGO) internos.push(String(dados.TECNICO_ID_SGO));
  ctx.gestao.forEach(function (id) { if (internos.indexOf(id) < 0) internos.push(id); });
  var semVinculo = dados.TECNICO_ID_SGO ? [] : [{
    id: 'TECNICO_AUVO:' + (dados.TECNICO_AUVO_ID || 'sem'), nome: dados.TECNICO_NOME_AUVO || 'Técnico do Auvo', cadastro: 'técnico',
    motivo: 'Técnico do Auvo ' + (dados.TECNICO_AUVO_ID ? '#' + dados.TECNICO_AUVO_ID + ' ' : '') +
      'sem vínculo com usuário do SGO+; vincule o usuário ao Auvo na Integração Auvo para ele receber os avisos.'
  }];
  SGO_notificar_({ usuarios: internos, contatos: semVinculo, titulo: titulo, texto: texto, canais: ['email', 'whatsapp'],
    modelo: modelo, origem: AUVO_AVISOS_CFG.ORIGEM, refId: refId });

  // (c) cliente — telefone da unidade primeiro; e-mail do cliente
  var telUnidade = unidade ? (unidade.WHATSAPP || unidade.CELULAR || unidade.TELEFONE) : '';
  var telCliente = cliente ? (cliente.WHATSAPP || cliente.CELULAR || cliente.TELEFONE) : '';
  var contatoCliente = {
    id: 'CLIENTE:' + ((cliente && cliente.ID) || ('AUVO_' + (dados.CLIENTE_AUVO_ID || 'sem'))),
    nome: (unidade && SGO_UTILS.safe(unidade.RESPONSAVEL)) || (cliente && SGO_UTILS.safe(cliente.CONTATO)) || nomeCliente,
    cadastro: unidade ? 'cliente/unidade' : 'cliente',
    email: (unidade && unidade.EMAIL) || (cliente && cliente.EMAIL) || '',
    telefone: Notificar_normalizarTelefone_(telUnidade) ? telUnidade : telCliente,
    motivo: cliente ? '' : 'Cliente do Auvo ' + (dados.CLIENTE_AUVO_ID ? '#' + dados.CLIENTE_AUVO_ID + ' ' : '') + 'sem cadastro vinculado no SGO+.'
  };
  SGO_notificar_({ contatos: [contatoCliente], titulo: titulo, texto: texto, canais: ['email', 'whatsapp'], semLink: true,
    modelo: modelo, origem: AUVO_AVISOS_CFG.ORIGEM, refId: refId });
}

/** Depois de gravar a tarefa: marca e avisa cada evento novo. Nunca lança erro. */
function Auvo_avisosTarefa_(av, tarefa, dados, resolvido) {
  var id = String(dados.AUVO_TASK_ID || '');
  try {
    var ant = av.anteriores[id] || { FINALIZADA: '', AVISO_ABERTURA_EM: '', AVISO_FECHAMENTO_EM: '' };
    var eventos = Auvo_avisosEventos_(av, tarefa, dados);
    var depois = { FINALIZADA: dados.FINALIZADA, AVISO_ABERTURA_EM: ant.AVISO_ABERTURA_EM, AVISO_FECHAMENTO_EM: ant.AVISO_FECHAMENTO_EM };
    eventos.forEach(function (ev) {
      var coluna = ev.tipo === 'abertura' ? 'AVISO_ABERTURA_EM' : 'AVISO_FECHAMENTO_EM';
      var refId = id + ':' + (ev.tipo === 'abertura' ? 'ABERTURA' : 'FECHAMENTO');
      try {
        var marca = {}; marca[coluna] = Auvo_avisosAgora_();
        SGO_DATA.updateByField(SGO_CFG.SHEETS.AUVO_TAREFAS, 'AUVO_TASK_ID', id, marca);
        depois[coluna] = '1';
      } catch (e) {
        Auvo_avisosRegistrarFalha_(refId, 'Aviso não enviado: não foi possível marcar a tarefa (' + ((e && e.message) || e) + ').');
        return;
      }
      try { Auvo_avisosEnviar_(av, ev, dados, resolvido); av.contagem[ev.tipo]++; }
      catch (e) { Auvo_avisosRegistrarFalha_(refId, 'Falha ao montar o aviso: ' + ((e && e.message) || e)); }
    });
    av.anteriores[id] = depois; // tarefa repetida na mesma janela não avisa de novo
  } catch (e) {
    Auvo_avisosRegistrarFalha_(id, 'Avisos da tarefa não processados: ' + ((e && e.message) || e));
  }
}

// ------------------------------------------------------------
// EVENTOS RECENTES — pro alerta sonoro/balão no dashboard. Olha
// CHECKIN_EM/CHECKOUT_EM de AUVO_TAREFAS mais recentes que `desdeIso`
// (checkpoint fica só no navegador de quem está com o Portal aberto,
// não precisa de tabela nova nem estado por usuário).
// ------------------------------------------------------------
function Auvo_apiVerificarNovosEventos(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_incBootstrap_(); // 16/10/2026: sem isso a consulta periódica falhava antes da 1ª sincronização
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
  Auvo_incBootstrap_();
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
  return { ok: true, message: 'Sincronização automática desativada. Você ainda pode sincronizar manualmente com "Sincronizar agora".' };
}
