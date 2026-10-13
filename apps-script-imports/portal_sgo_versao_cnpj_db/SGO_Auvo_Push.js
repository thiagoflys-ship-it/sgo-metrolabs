/****************************************************
 * SGO_Auvo_Push.js
 * INTEGRAÇÃO AUVO — SGO+ -> Auvo (envio de cadastro pendente)
 *
 * Pedido do usuário 2026-08-27: garantir que o que já existe no SGO+
 * (Cliente/Unidade/Equipamento) também exista no Auvo, sem depender de
 * coincidência. Cliente/Técnico já sincronizam sozinhos quando
 * participam de um documento gerado nos 4 módulos com Tarefa automática
 * (Auvo_sincronizarCliente_/Auvo_sincronizarTecnico_, SGO_Auvo_Main.js)
 * — aqui cobre o que sobra: Unidade (nunca sincronizava nessa direção)
 * e Equipamento (idem).
 *
 * Cada Unidade do SGO+ vira 1 Customer próprio no Auvo — mesmo modelo
 * que a sincronização reversa já usa (1 Customer do Auvo = 1 Unidade
 * do Portal). Equipamento é vinculado ao Customer da sua Unidade (ou,
 * na falta dela, ao Customer do Cliente).
 *
 * Reaproveita Auvo_obterMapeamento_/Auvo_gravarMapeamento_ (mesma aba
 * AUVO_SYNC usada pela direção reversa) — nunca duplica: se a
 * sincronização reversa já mapeou aquele registro, esta direção só
 * atualiza (PATCH), nunca cria de novo.
 *
 * Documento (certificado/laudo em PDF) NÃO tem uma tabela própria no
 * Auvo — decisão do usuário 2026-08-27: só os documentos gerados a
 * partir de agora entram automaticamente (via Auvo_criarTarefa_,
 * externalUrl já manda o link do PDF); histórico antigo fica só no
 * SGO+ mesmo, sem backfill retroativo.
 ****************************************************/

var AUVO_PUSH_CFG = {
  BATCH_SIZE_EQUIPAMENTOS: 50,
  CHECKPOINT_KEY: 'AUVO_PUSH_EQUIP_CHECKPOINT'
};

// ------------------------------------------------------------
// UNIDADE — cada Unidade do Portal vira 1 Customer no Auvo.
// ------------------------------------------------------------
function Auvo_montarPayloadUnidadeParaAuvo_(unidade) {
  var telefone = SGO_UTILS.safe(unidade.TELEFONE);
  return {
    externalId: SGO_UTILS.safe(unidade.ID),
    name: SGO_UTILS.safe(unidade.NOME_UNIDADE),
    cpfCnpj: Auvo_normalizarCnpjCpfParaEnvio_(unidade.CNPJ_UNIDADE),
    phoneNumber: telefone ? [telefone] : [],
    address: SGO_UTILS.safe(unidade.ENDERECO)
  };
}

function Auvo_sincronizarUnidade_(unidadeId) {
  Auvo_bootstrap_();
  var unidade = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, unidadeId);
  if (!unidade) throw new Error('Unidade não encontrada: ' + unidadeId);

  var mapeamento = Auvo_obterMapeamento_('UNIDADE', unidadeId);
  var payload = Auvo_montarPayloadUnidadeParaAuvo_(unidade);

  try {
    if (mapeamento && mapeamento.AUVO_ID) {
      Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.CUSTOMERS + '/' + mapeamento.AUVO_ID, payload);
      Auvo_gravarMapeamento_('UNIDADE', unidadeId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: 'atualizado' };
    }

    var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.CUSTOMERS, payload);
    var auvoId = Auvo_extrairId_(resp);
    if (!auvoId) throw new Error('Auvo não retornou um ID pra unidade criada.');
    Auvo_gravarMapeamento_('UNIDADE', unidadeId, auvoId, AUVO_CFG.STATUS.OK, '');
    return { ok: true, auvoId: auvoId, acao: 'criado' };
  } catch (e) {
    Auvo_gravarMapeamento_('UNIDADE', unidadeId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

// ------------------------------------------------------------
// EQUIPAMENTO — vinculado ao Customer da Unidade (ou do Cliente, se o
// equipamento não tiver Unidade). Sincroniza a Unidade/Cliente na hora
// se ainda não tiver sido (mesmo "lazy sync" já usado em Auvo_criarTarefa_).
// ------------------------------------------------------------
function Auvo_montarPayloadEquipamentoParaAuvo_(equip, customerAuvoId, identifierOverride) {
  var specs = [];
  if (equip.FABRICANTE) specs.push({ name: 'FABRICANTE', specification: SGO_UTILS.safe(equip.FABRICANTE) });
  if (equip.MODELO) specs.push({ name: 'MODELO', specification: SGO_UTILS.safe(equip.MODELO) });
  if (equip.SERIE) specs.push({ name: 'SÉRIE', specification: SGO_UTILS.safe(equip.SERIE) });
  return {
    externalId: SGO_UTILS.safe(equip.ID),
    name: SGO_UTILS.safe(equip.TIPO) || 'Equipamento',
    identifier: identifierOverride || SGO_UTILS.safe(equip.TAG),
    associatedCustomerId: customerAuvoId,
    active: SGO_UTILS.safeUpper(equip.STATUS) !== SGO_CFG.STATUS.INATIVO,
    equipmentSpecifications: specs
  };
}

// TAG sozinha (ex. "AUT-01") é convenção interna do Portal — repete de
// propósito entre clientes diferentes. Achado real 2026-08-28: o Auvo exige
// "identifier" único em TODA a base (não só por Customer, como a modelagem
// original supunha), então TAG repetida entre clientes colide de verdade.
// Padrão definido pelo usuário: desambiguar com TAG + número de série (único
// fisicamente); sem série cadastrada, cai pros 6 primeiros caracteres do ID
// interno do Portal (determinístico — mesma saída sempre pro mesmo
// equipamento, não gera duplicata numa 2ª tentativa).
function Auvo_identifierDesambiguado_(equip) {
  var sufixo = equip.SERIE ? SGO_UTILS.safe(equip.SERIE) : String(equip.ID || '').slice(0, 6);
  return SGO_UTILS.safe(equip.TAG) + '/' + sufixo;
}

// Índice de equipamentos que JÁ EXISTEM no Auvo (por Customer +
// identifier + name) — achado real 2026-08-28: tentar criar direto sem
// checar antes colide com equipamento que os técnicos já cadastraram
// no Auvo por fora desta integração (erro "Item can not duplicate" /
// "combination of name and identifier already exists"). TAG genérica
// tipo "AUT-01" é comum entre clientes diferentes, mas o Auvo valida
// unicidade por Customer — daí o índice também ser por Customer.
function Auvo_chaveEquipamentoAuvo_(customerAuvoId, identifier, name) {
  return String(customerAuvoId) + '::' + SGO_UTILS.safeUpper(identifier) + '::' + SGO_UTILS.safeUpper(name);
}

// Baixar TODOS os equipamentos do Auvo pra montar o índice é caro (achado
// real: ~230s pra ~1300 itens — a API do Auvo não aceita filtro por Customer
// em /equipments, testado ao vivo em 2026-08-28) — inviável repetir a cada
// lote de 50. Cacheado em pedaços (CacheService tem limite de ~100KB por
// chave) por 6h (máximo do serviço); expira sozinho, sem endpoint de limpeza.
var AUVO_IDX_EQUIP_CACHE_PREFIX = 'AUVO_IDX_EQUIP_';
var AUVO_IDX_EQUIP_CACHE_TTL = 21600;
var AUVO_IDX_EQUIP_CHUNK = 300;

function Auvo_lerIndiceEquipamentosCache_() {
  var cache = CacheService.getScriptCache();
  var qtdChunksRaw = cache.get(AUVO_IDX_EQUIP_CACHE_PREFIX + 'qtd');
  if (!qtdChunksRaw) return null;
  var qtdChunks = Number(qtdChunksRaw);
  var indice = {};
  for (var i = 0; i < qtdChunks; i++) {
    var chunkRaw = cache.get(AUVO_IDX_EQUIP_CACHE_PREFIX + i);
    if (!chunkRaw) return null; // cache parcialmente expirado — reconstrói tudo
    JSON.parse(chunkRaw).forEach(function(par) { indice[par[0]] = par[1]; });
  }
  return indice;
}

function Auvo_gravarIndiceEquipamentosCache_(indice) {
  var cache = CacheService.getScriptCache();
  var pares = Object.keys(indice).map(function(k) { return [k, indice[k]]; });
  var chunks = [];
  for (var i = 0; i < pares.length; i += AUVO_IDX_EQUIP_CHUNK) chunks.push(pares.slice(i, i + AUVO_IDX_EQUIP_CHUNK));
  var payloadCache = {};
  chunks.forEach(function(chunk, i) { payloadCache[AUVO_IDX_EQUIP_CACHE_PREFIX + i] = JSON.stringify(chunk); });
  payloadCache[AUVO_IDX_EQUIP_CACHE_PREFIX + 'qtd'] = String(chunks.length);
  cache.putAll(payloadCache, AUVO_IDX_EQUIP_CACHE_TTL);
}

function Auvo_construirIndiceEquipamentosAuvoExistentes_(forcarRebuild) {
  if (!forcarRebuild) {
    var doCache = Auvo_lerIndiceEquipamentosCache_();
    if (doCache) return doCache;
  }
  var todos = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.EQUIPMENTS);
  var indice = {};
  todos.forEach(function(eq) {
    indice[Auvo_chaveEquipamentoAuvo_(eq.associatedCustomerId, eq.identifier, eq.name)] = eq.id;
  });
  Auvo_gravarIndiceEquipamentosCache_(indice);
  return indice;
}

function Auvo_resolverCustomerIdParaEquipamento_(equip) {
  if (equip.UNIDADE_ID) {
    var mapUnidade = Auvo_obterMapeamento_('UNIDADE', equip.UNIDADE_ID);
    if (mapUnidade && mapUnidade.AUVO_ID) return mapUnidade.AUVO_ID;
    var r = Auvo_sincronizarUnidade_(equip.UNIDADE_ID);
    return r.auvoId;
  }
  if (equip.CLIENTE_ID) {
    var mapCliente = Auvo_obterMapeamento_('CLIENTE', equip.CLIENTE_ID);
    if (mapCliente && mapCliente.AUVO_ID) return mapCliente.AUVO_ID;
    var r2 = Auvo_sincronizarCliente_(equip.CLIENTE_ID);
    return r2.auvoId;
  }
  return null;
}

function Auvo_sincronizarEquipamento_(equipId, indiceExistentes) {
  Auvo_bootstrap_();
  var equip = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, equipId);
  if (!equip) throw new Error('Equipamento não encontrado: ' + equipId);

  var mapeamento = Auvo_obterMapeamento_('EQUIPAMENTO', equipId);

  var customerAuvoId;
  try {
    customerAuvoId = Auvo_resolverCustomerIdParaEquipamento_(equip);
  } catch (e) {
    Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, 'Falha ao sincronizar Cliente/Unidade pai: ' + e.message);
    return { ok: false, acao: 'erro_cliente_pai', erro: e.message };
  }
  if (!customerAuvoId) {
    Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, 'Equipamento sem Cliente/Unidade vinculado — não é possível enviar ao Auvo sem um Customer pai.');
    return { ok: false, acao: 'sem_cliente_vinculado' };
  }

  // Chave por Customer+identifier+name — mesma combinação que o Auvo valida
  // como única. Usada tanto pra achar equipamento já existente (cadastrado
  // manualmente por fora) quanto pra registrar, na hora, o que este próprio
  // lote acabou de criar (a TAG genérica tipo "AUT-01"/"N/A" se repete entre
  // vários equipamentos do MESMO cliente — sem isso o 2º item do lote colide
  // com o 1º que o próprio lote já criou, já que o índice só é montado 1x
  // no início do lote).
  var chave = Auvo_chaveEquipamentoAuvo_(customerAuvoId, equip.TAG, equip.TIPO || 'Equipamento');

  // Sem mapeamento local ainda: antes de criar, checa se esse equipamento já
  // existe no Auvo por fora desta integração (técnico cadastrou manualmente).
  // Sem isso o POST colide (Customer+identifier+name já usados no Auvo).
  var vinculadoPorIndice = false;
  if (!(mapeamento && mapeamento.AUVO_ID) && indiceExistentes) {
    var idExistente = indiceExistentes[chave];
    if (idExistente) { mapeamento = { AUVO_ID: idExistente }; vinculadoPorIndice = true; }
  }

  var payload = Auvo_montarPayloadEquipamentoParaAuvo_(equip, customerAuvoId);

  try {
    if (mapeamento && mapeamento.AUVO_ID) {
      Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '/' + mapeamento.AUVO_ID, payload);
      Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      if (indiceExistentes) indiceExistentes[chave] = mapeamento.AUVO_ID;
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: vinculadoPorIndice ? 'vinculado' : 'atualizado' };
    }

    var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.EQUIPMENTS, payload);
    var auvoId = Auvo_extrairId_(resp);
    if (!auvoId) throw new Error('Auvo não retornou um ID pro equipamento criado.');
    Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, auvoId, AUVO_CFG.STATUS.OK, '');
    if (indiceExistentes) indiceExistentes[chave] = auvoId;
    return { ok: true, auvoId: auvoId, acao: 'criado' };
  } catch (e) {
    // Plano B: colisão de duplicidade mas o item não estava no índice —
    // achado real 2026-08-28: existem equipamentos no Auvo que nunca aparecem
    // na listagem paginada de /equipments (nem com filtro de Customer, que a
    // API ignora), mas SÃO encontrados via `?paramFilter={"identifier":...}`
    // (funciona tipo "contains", confirmado ao vivo). Só tenta essa busca
    // extra quando o erro é claramente de duplicidade — não vale o custo
    // pra qualquer erro.
    if (/duplicat|already exists/i.test(e.message)) {
      try {
        var achados = Auvo_buscarEquipamentosPorIdentifierExato_(equip.TAG);
        var doMesmoCliente = achados.filter(function(eq) { return String(eq.associatedCustomerId) === String(customerAuvoId); })[0];
        if (doMesmoCliente) {
          // mesmo cliente já tem esse identifier (cadastro manual por fora,
          // ou "fantasma" que não aparece na listagem completa) — vincula.
          Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '/' + doMesmoCliente.id, payload);
          Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, doMesmoCliente.id, AUVO_CFG.STATUS.OK, '');
          if (indiceExistentes) indiceExistentes[chave] = doMesmoCliente.id;
          return { ok: true, auvoId: doMesmoCliente.id, acao: 'vinculado' };
        }
        if (achados.length) {
          // identifier já usado por OUTRO cliente — colisão real (identifier
          // é único globalmente no Auvo). Desambigua com TAG+SÉRIE e cria.
          var identifierUnico = Auvo_identifierDesambiguado_(equip);
          var payloadUnico = Auvo_montarPayloadEquipamentoParaAuvo_(equip, customerAuvoId, identifierUnico);
          var respRetry = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.EQUIPMENTS, payloadUnico);
          var auvoIdRetry = Auvo_extrairId_(respRetry);
          if (!auvoIdRetry) throw new Error('Auvo não retornou um ID pro equipamento criado (identifier desambiguado).');
          Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, auvoIdRetry, AUVO_CFG.STATUS.OK,
            'identifier desambiguado pra "' + identifierUnico + '" — TAG "' + equip.TAG + '" já usada por outro cliente no Auvo');
          return { ok: true, auvoId: auvoIdRetry, acao: 'criado_desambiguado' };
        }
      } catch (e2) {
        // busca/retry de reforço falhou — segue com o erro original abaixo
      }
    }
    Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

// Busca direcionada por identifier exato (usa `paramFilter`, que a API do
// Auvo aceita pra /equipments mesmo sem estar na doc — comportamento parece
// "contains", não igualdade exata, por isso filtra de novo no cliente antes
// de aceitar cada resultado). Devolve TODOS os matches, de qualquer Customer
// — quem chama decide se é o mesmo cliente (vincula) ou outro (desambigua).
function Auvo_buscarEquipamentosPorIdentifierExato_(identifier) {
  var qs = 'paramFilter=' + encodeURIComponent(JSON.stringify({ identifier: identifier }));
  var achados = [];
  for (var pagina = 1; pagina <= 5; pagina++) {
    var resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '?page=' + pagina + '&pageSize=' + AUVO_CFG.PAGE_SIZE_MAX + '&' + qs, null);
    var lote = (resp.result && resp.result.entityList) || [];
    lote.forEach(function(eq) {
      if (SGO_UTILS.safeUpper(eq.identifier) === SGO_UTILS.safeUpper(identifier)) achados.push(eq);
    });
    var paginacao = resp.result && resp.result.pagedSearchReturnData;
    var total = paginacao ? paginacao.totalItems : lote.length;
    if (lote.length === 0 || pagina * AUVO_CFG.PAGE_SIZE_MAX >= total) break;
  }
  return achados;
}

// ------------------------------------------------------------
// SIMULAÇÃO (dry-run) — nunca grava nada, só conta.
// ------------------------------------------------------------
function Auvo_simularEnvioCadastro_() {
  Auvo_bootstrap_();
  var unidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function(u) { return SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO; });
  var equipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function(e) { return SGO_UTILS.safeUpper(e.STATUS) === SGO_CFG.STATUS.ATIVO; });

  var unidadesPendentes = unidades.filter(function(u) { var m = Auvo_obterMapeamento_('UNIDADE', u.ID); return !(m && m.AUVO_ID); });
  var equipamentosPendentes = equipamentos.filter(function(e) { var m = Auvo_obterMapeamento_('EQUIPAMENTO', e.ID); return !(m && m.AUVO_ID); });
  var equipSemVinculo = equipamentosPendentes.filter(function(e) { return !e.UNIDADE_ID && !e.CLIENTE_ID; });

  return {
    unidades: { total: unidades.length, pendentes: unidadesPendentes.length },
    equipamentos: { total: equipamentos.length, pendentes: equipamentosPendentes.length, semVinculo: equipSemVinculo.length },
    amostraUnidades: unidadesPendentes.slice(0, 8).map(function(u) { return { id: u.ID, nome: u.NOME_UNIDADE, cnpj: u.CNPJ_UNIDADE }; }),
    amostraEquipamentos: equipamentosPendentes.slice(0, 8).map(function(e) { return { id: e.ID, tipo: e.TIPO, tag: e.TAG }; })
  };
}

// ------------------------------------------------------------
// EXECUÇÃO REAL — Unidades primeiro (poucas, 1 chamada só), depois
// Equipamentos em lotes retomáveis (cada item é 1 chamada HTTP ao
// Auvo, mais lento que o bulk reverso — por isso lote menor).
// ------------------------------------------------------------
function Auvo_executarEnvioUnidadesPendentes_() {
  Auvo_bootstrap_();
  var unidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function(u) { return SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO; });
  var pendentes = unidades.filter(function(u) { var m = Auvo_obterMapeamento_('UNIDADE', u.ID); return !(m && m.AUVO_ID); });

  var criadas = 0, erros = [];
  pendentes.forEach(function(u) {
    try {
      var r = Auvo_sincronizarUnidade_(u.ID);
      if (r.ok) criadas++;
    } catch (e) {
      erros.push('Unidade ' + u.NOME_UNIDADE + ': ' + e.message);
    }
  });

  return { total: pendentes.length, sincronizadas: criadas, erros: erros };
}

function Auvo_lerCheckpointPush_() {
  var raw = PropertiesService.getScriptProperties().getProperty(AUVO_PUSH_CFG.CHECKPOINT_KEY);
  if (!raw) return { indice: 0 };
  try { return JSON.parse(raw); } catch (e) { return { indice: 0 }; }
}

function Auvo_gravarCheckpointPush_(cp) {
  PropertiesService.getScriptProperties().setProperty(AUVO_PUSH_CFG.CHECKPOINT_KEY, JSON.stringify(cp));
}

function Auvo_limparCheckpointPush_() {
  PropertiesService.getScriptProperties().deleteProperty(AUVO_PUSH_CFG.CHECKPOINT_KEY);
}

// Percorre a lista TOTAL e estável de equipamentos ativos (não uma
// lista de "pendentes" recalculada a cada lote — essa encolheria
// conforme processa e desalinharia o índice do checkpoint entre
// chamadas, pulando ou reprocessando item). Quem já está mapeado é
// só contado e pulado dentro do loop.
function Auvo_executarLoteEquipamentosPush_() {
  Auvo_bootstrap_();
  var equipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function(e) { return SGO_UTILS.safeUpper(e.STATUS) === SGO_CFG.STATUS.ATIVO; });

  var cp = Auvo_lerCheckpointPush_();
  var inicio = cp.indice || 0;
  var fim = Math.min(inicio + AUVO_PUSH_CFG.BATCH_SIZE_EQUIPAMENTOS, equipamentos.length);

  var indiceExistentes = Auvo_construirIndiceEquipamentosAuvoExistentes_();

  var criados = 0, atualizados = 0, vinculados = 0, desambiguados = 0, jaMapeados = 0, semVinculo = 0, erros = [];
  for (var i = inicio; i < fim; i++) {
    var eq = equipamentos[i];
    var mapeamento = Auvo_obterMapeamento_('EQUIPAMENTO', eq.ID);
    if (mapeamento && mapeamento.AUVO_ID) { jaMapeados++; continue; }
    try {
      var r = Auvo_sincronizarEquipamento_(eq.ID, indiceExistentes);
      if (!r.ok) { semVinculo++; continue; }
      if (r.acao === 'criado') criados++;
      else if (r.acao === 'vinculado') vinculados++;
      else if (r.acao === 'criado_desambiguado') desambiguados++;
      else atualizados++;
    } catch (e) {
      erros.push('Equipamento ' + (eq.TAG || eq.ID) + ': ' + e.message);
    }
  }

  var concluido = fim >= equipamentos.length;
  if (concluido) Auvo_limparCheckpointPush_();
  else Auvo_gravarCheckpointPush_({ indice: fim });

  return {
    totalAtivos: equipamentos.length, processadosNesteLote: fim - inicio,
    indiceAtual: fim, concluido: concluido,
    criados: criados, atualizados: atualizados, vinculados: vinculados, desambiguados: desambiguados, jaMapeados: jaMapeados, semVinculo: semVinculo, erros: erros
  };
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL (todas atrás de admin)
// ------------------------------------------------------------
function Auvo_apiSimularEnvioCadastro(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_simularEnvioCadastro_());
}

function Auvo_apiEnviarUnidadesPendentes(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_executarEnvioUnidadesPendentes_());
}

function Auvo_apiIniciarEnvioEquipamentos(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_limparCheckpointPush_();
  return Object.assign({ ok: true }, Auvo_executarLoteEquipamentosPush_());
}

function Auvo_apiContinuarEnvioEquipamentos(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_executarLoteEquipamentosPush_());
}
