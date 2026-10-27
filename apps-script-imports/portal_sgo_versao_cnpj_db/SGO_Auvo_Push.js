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
      var rp = Auvo_patchCustomer_(mapeamento.AUVO_ID, payload);
      Auvo_gravarMapeamento_('UNIDADE', unidadeId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: 'atualizado', mensagem: Auvo_mensagemCustomer_('unidade', 'atualizado', mapeamento.AUVO_ID, rp) };
    }
    // 27/10/2026: antes de criar, procura no Auvo (código do SGO+ e CNPJ) — mesmo
    // reconhecimento do cliente (Auvo_ligarOuCriarCustomer_, SGO_Auvo_Main.js).
    return Auvo_ligarOuCriarCustomer_('UNIDADE', unidadeId, payload);
  } catch (e) {
    Auvo_gravarMapeamento_('UNIDADE', unidadeId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

// ------------------------------------------------------------
// EQUIPAMENTO SEM TAG (27/10/2026)
// TAG "N/P", "NP", "N/A", "-", "S/N", "SEM TAG", vazio etc. não identifica nada:
// centenas de equipamentos diferentes têm a mesma "TAG". Nunca é usada como
// identificador no Auvo nem para dizer que dois equipamentos são o mesmo.
// Sem TAG válida, o equipamento vai ao Auvo com o nome do tipo e o
// identificador "Série <nº de série>"; sem série, "Patrimônio <nº>"; sem
// nenhum dos dois, "SGO-<8 primeiros caracteres do código do SGO+>" (sempre o
// mesmo para o mesmo equipamento, então uma 2ª tentativa não duplica).
// ------------------------------------------------------------
var AUVO_SEM_IDENTIFICACAO_RE = /^(NP|NA|ND|NI|NT|SN|SNO|SNUM|STAG|SID|TAG|ID|SEMTAG|SEMID|SEMIDENTIFICACAO|SEMNUMERO|SEMSERIE|SEMPATRIMONIO|SEMPLACA|NAOPOSSUI|NAOTEM|NAOINFORMADO|NAOIDENTIFICADO|NAOCONSTA|NAOSEAPLICA|NENHUM|NENHUMA|NULL|NULO|UNDEFINED|INEXISTENTE|0+|X+|\?+|\*+)$/;

function Auvo_identificadorValido_(valor) {
  var original = SGO_UTILS.safe(valor);
  if (!original) return '';
  var compacto = SGO_UTILS.safeUpper(original).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s.\-_\/\\,;:'"()#º°]/g, '');
  if (!compacto || AUVO_SEM_IDENTIFICACAO_RE.test(compacto)) return '';
  return original;
}

function Auvo_identificadorEquipamento_(equip) {
  var tag = Auvo_identificadorValido_(equip.TAG);
  if (tag) return { identifier: tag, base: 'TAG', semTag: false };
  var serie = Auvo_identificadorValido_(equip.SERIE);
  if (serie) return { identifier: 'Série ' + serie, base: 'SERIE', semTag: true };
  var patrimonio = Auvo_identificadorValido_(equip.PATRIMONIO);
  if (patrimonio) return { identifier: 'Patrimônio ' + patrimonio, base: 'PATRIMONIO', semTag: true };
  return { identifier: 'SGO-' + String(equip.ID || '').replace(/-/g, '').slice(0, 8).toUpperCase(), base: 'CODIGO', semTag: true };
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
  if (Auvo_identificadorValido_(equip.SERIE)) specs.push({ name: 'SÉRIE', specification: SGO_UTILS.safe(equip.SERIE) });
  if (Auvo_identificadorValido_(equip.PATRIMONIO)) specs.push({ name: 'PATRIMÔNIO', specification: SGO_UTILS.safe(equip.PATRIMONIO) });
  return {
    externalId: SGO_UTILS.safe(equip.ID),
    name: SGO_UTILS.safe(equip.TIPO) || 'Equipamento',
    identifier: identifierOverride || Auvo_identificadorEquipamento_(equip).identifier,
    associatedCustomerId: customerAuvoId,
    active: SGO_UTILS.safeUpper(equip.STATUS) !== SGO_CFG.STATUS.INATIVO,
    equipmentSpecifications: specs
  };
}

// Identifier repetido em outro cliente do Auvo (o Auvo exige identifier único em toda a base —
// achado real 2026-08-28). Desambigua com o nº de série; sem série válida (ou quando o
// identificador já é a série), com os 6 primeiros caracteres do código do SGO+ (determinístico).
function Auvo_identifierDesambiguado_(equip) {
  var ident = Auvo_identificadorEquipamento_(equip);
  var serie = Auvo_identificadorValido_(equip.SERIE);
  var sufixo = (serie && ident.base === 'TAG') ? serie : String(equip.ID || '').slice(0, 6);
  return ident.identifier + '/' + sufixo;
}

// ------------------------------------------------------------
// ÍNDICE DOS EQUIPAMENTOS QUE JÁ EXISTEM NO AUVO
// Achado real 2026-08-28: criar sem conferir antes colide com equipamento que
// os técnicos já cadastraram no Auvo por fora. 27/10/2026: o índice passa a
// reconhecer por (1) código do SGO+ (externalId), (2) cliente + TAG válida +
// tipo, (3) cliente + TAG válida (quando só há um com ela), (4) cliente + nº de
// série válido (quando só há um com ele). TAG "N/P" e afins nunca entram.
// Também guarda em qual cliente do Auvo cada equipamento está, para achar
// equipamento já ligado mas pendurado num cliente repetido (ex.: IMED).
// ------------------------------------------------------------
var AUVO_IDX_EQUIP_CACHE_PREFIX = 'AUVO_IDX_EQ2_';
var AUVO_IDX_EQUIP_CACHE_TTL = 21600;
var AUVO_IDX_EQUIP_CHUNK_CHARS = 90000;
var AUVO_AMBIGUO = '__AMBIGUO__';

function Auvo_chaveEquipamentoAuvo_(customerAuvoId, identifier, name) {
  return String(customerAuvoId) + '::' + Auvo_normalizarTexto_(identifier) + '::' + Auvo_normalizarTexto_(Auvo_extrairTipoEquipamento_(name));
}

function Auvo_indiceEquipamentosVazio_() {
  return { porChave: {}, porTag: {}, porSerie: {}, porExterno: {}, clienteDoEquip: {} };
}

function Auvo_marcarUnico_(mapa, chave, id) {
  if (!mapa[chave]) mapa[chave] = id;
  else if (mapa[chave] !== id) mapa[chave] = AUVO_AMBIGUO;
}

function Auvo_indexarEquipamentoAuvo_(indice, eq) {
  if (!eq || eq.id === undefined || eq.id === null) return;
  var id = String(eq.id);
  var cust = SGO_UTILS.safe(eq.associatedCustomerId);
  indice.clienteDoEquip[id] = cust;
  var ext = SGO_UTILS.safe(eq.externalId);
  if (ext) indice.porExterno[ext] = id;
  var ident = Auvo_identificadorValido_(eq.identifier);
  if (ident) {
    indice.porChave[Auvo_chaveEquipamentoAuvo_(cust, ident, eq.name)] = id;
    Auvo_marcarUnico_(indice.porTag, cust + '::' + Auvo_normalizarTexto_(ident), id);
  }
  var serie = Auvo_identificadorValido_(Auvo_extrairEspecificacao_(eq, 'SÉRIE') || Auvo_extrairEspecificacao_(eq, 'SERIE'));
  if (serie) Auvo_marcarUnico_(indice.porSerie, cust + '::' + Auvo_normalizarTexto_(serie), id);
}

function Auvo_registrarNoIndice_(indice, auvoId, payload) {
  if (!indice || !auvoId) return;
  Auvo_indexarEquipamentoAuvo_(indice, {
    id: auvoId, associatedCustomerId: payload.associatedCustomerId, externalId: payload.externalId,
    identifier: payload.identifier, name: payload.name, equipmentSpecifications: payload.equipmentSpecifications
  });
}

// Puro (testável): o equipamento do SGO+ já existe no Auvo? Devolve { id, por } ou null.
function Auvo_acharEquipamentoNoAuvo_(indice, equip, customerAuvoId) {
  if (!indice) return null;
  var porCodigo = indice.porExterno[SGO_UTILS.safe(equip.ID)];
  if (porCodigo) return { id: porCodigo, por: 'codigo' };
  if (!customerAuvoId) return null;
  var cust = String(customerAuvoId);
  var tipo = SGO_UTILS.safe(equip.TIPO) || 'Equipamento';
  var tag = Auvo_identificadorValido_(equip.TAG);
  var ident = Auvo_identificadorEquipamento_(equip).identifier;
  var porChave = (tag && indice.porChave[Auvo_chaveEquipamentoAuvo_(cust, tag, tipo)]) || indice.porChave[Auvo_chaveEquipamentoAuvo_(cust, ident, tipo)];
  if (porChave) return { id: porChave, por: 'tag' };
  if (tag) {
    var porTag = indice.porTag[cust + '::' + Auvo_normalizarTexto_(tag)];
    if (porTag && porTag !== AUVO_AMBIGUO) return { id: porTag, por: 'tag' };
  }
  var serie = Auvo_identificadorValido_(equip.SERIE);
  if (serie) {
    var porSerie = indice.porSerie[cust + '::' + Auvo_normalizarTexto_(serie)];
    if (porSerie && porSerie !== AUVO_AMBIGUO) return { id: porSerie, por: 'serie' };
    // equipamento cadastrado no Auvo com a série no campo identificador
    var serieNoIdent = indice.porTag[cust + '::' + Auvo_normalizarTexto_(serie)];
    if (serieNoIdent && serieNoIdent !== AUVO_AMBIGUO) return { id: serieNoIdent, por: 'serie' };
  }
  return null;
}

// Baixar TODOS os equipamentos do Auvo é caro (~230s para ~1300 itens, a API
// não filtra /equipments por cliente — testado em 2026-08-28). Cacheado em
// pedaços (limite de ~100KB por chave) por 6h; expira sozinho.
function Auvo_lerIndiceEquipamentosCache_() {
  try {
    var cache = CacheService.getScriptCache();
    var qtdRaw = cache.get(AUVO_IDX_EQUIP_CACHE_PREFIX + 'qtd');
    if (!qtdRaw) return null;
    var partes = [];
    for (var i = 0; i < Number(qtdRaw); i++) {
      var p = cache.get(AUVO_IDX_EQUIP_CACHE_PREFIX + i);
      if (p === null || p === undefined) return null; // cache parcialmente expirado — reconstrói tudo
      partes.push(p);
    }
    var indice = JSON.parse(partes.join(''));
    return (indice && indice.porExterno && indice.clienteDoEquip) ? indice : null;
  } catch (e) {
    return null;
  }
}

function Auvo_gravarIndiceEquipamentosCache_(indice) {
  try {
    var texto = JSON.stringify(indice);
    var payloadCache = {}, n = 0;
    for (var i = 0; i < texto.length; i += AUVO_IDX_EQUIP_CHUNK_CHARS) {
      payloadCache[AUVO_IDX_EQUIP_CACHE_PREFIX + n] = texto.slice(i, i + AUVO_IDX_EQUIP_CHUNK_CHARS);
      n++;
    }
    payloadCache[AUVO_IDX_EQUIP_CACHE_PREFIX + 'qtd'] = String(n);
    CacheService.getScriptCache().putAll(payloadCache, AUVO_IDX_EQUIP_CACHE_TTL);
  } catch (e) {
    // sem cache o envio continua certo, só mais lento
  }
}

function Auvo_construirIndiceEquipamentosAuvoExistentes_(forcarRebuild) {
  if (!forcarRebuild) {
    var doCache = Auvo_lerIndiceEquipamentosCache_();
    if (doCache) return doCache;
  }
  var indice = Auvo_indiceEquipamentosVazio_();
  Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.EQUIPMENTS).forEach(function(eq) { Auvo_indexarEquipamentoAuvo_(indice, eq); });
  Auvo_gravarIndiceEquipamentosCache_(indice);
  return indice;
}

// Cliente do Auvo onde o equipamento DEVE ficar, sem gravar nada (para a simulação e para achar
// equipamento pendurado num cliente repetido). Unidade ligada vale primeiro; sem unidade, o cliente.
// Usa Auvo_obterMapeamento_ (ou o índice em memória), que prefere o cliente original do Auvo.
function Auvo_customerPrevistoParaEquipamento_(equip, mapas) {
  var obter = mapas ? mapas.obter : Auvo_obterMapeamento_;
  if (equip.UNIDADE_ID) {
    var mu = obter('UNIDADE', equip.UNIDADE_ID);
    return (mu && SGO_UTILS.safe(mu.AUVO_ID)) || '';
  }
  if (equip.CLIENTE_ID) {
    var mc = obter('CLIENTE', equip.CLIENTE_ID);
    return (mc && SGO_UTILS.safe(mc.AUVO_ID)) || '';
  }
  return '';
}

function Auvo_resolverCustomerIdParaEquipamento_(equip) {
  var previsto = Auvo_customerPrevistoParaEquipamento_(equip);
  if (previsto) return previsto;
  if (equip.UNIDADE_ID) return Auvo_sincronizarUnidade_(equip.UNIDADE_ID).auvoId;
  if (equip.CLIENTE_ID) return Auvo_sincronizarCliente_(equip.CLIENTE_ID).auvoId;
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

  // Sem ligação ainda: antes de criar, confere se já existe no Auvo (código do SGO+,
  // TAG válida ou nº de série no mesmo cliente). Achou: liga e atualiza, não cria.
  var vinculadoPorIndice = false;
  if (!(mapeamento && mapeamento.AUVO_ID) && indiceExistentes) {
    var achado = Auvo_acharEquipamentoNoAuvo_(indiceExistentes, equip, customerAuvoId);
    if (achado) { mapeamento = { AUVO_ID: achado.id }; vinculadoPorIndice = true; }
  }

  var payload = Auvo_montarPayloadEquipamentoParaAuvo_(equip, customerAuvoId);

  try {
    if (mapeamento && mapeamento.AUVO_ID) {
      var clienteAntes = indiceExistentes ? indiceExistentes.clienteDoEquip[String(mapeamento.AUVO_ID)] : '';
      // sem TAG no SGO+: o identificador que já está no Auvo (ex.: TAG anotada pelo técnico) é mantido
      var envio = payload;
      if (!Auvo_identificadorValido_(equip.TAG)) { envio = Object.assign({}, payload); delete envio.identifier; }
      Auvo_patchEquipamento_(mapeamento.AUVO_ID, envio);
      Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      Auvo_registrarNoIndice_(indiceExistentes, mapeamento.AUVO_ID, payload);
      return {
        ok: true, auvoId: mapeamento.AUVO_ID, acao: vinculadoPorIndice ? 'vinculado' : 'atualizado',
        movidoDe: (clienteAntes && String(clienteAntes) !== String(customerAuvoId)) ? clienteAntes : ''
      };
    }

    var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.EQUIPMENTS, payload);
    var auvoId = Auvo_extrairId_(resp);
    if (!auvoId) throw new Error('Auvo não retornou um ID pro equipamento criado.');
    Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, auvoId, AUVO_CFG.STATUS.OK, '');
    Auvo_registrarNoIndice_(indiceExistentes, auvoId, payload);
    return { ok: true, auvoId: auvoId, acao: 'criado' };
  } catch (e) {
    // Plano B: o Auvo diz que já existe, mas o índice não tinha — achado real 2026-08-28:
    // há equipamentos que nunca aparecem na listagem de /equipments, mas SÃO encontrados
    // via `?paramFilter={"identifier":...}`. Só busca pelo identificador que foi enviado
    // (nunca por TAG "N/P" e afins).
    if (Auvo_ehErroJaExiste_(e.message)) {
      try {
        var achados = Auvo_buscarEquipamentosPorIdentifierExato_(payload.identifier);
        var porCodigo = achados.filter(function(eq) { return SGO_UTILS.safe(eq.externalId) === SGO_UTILS.safe(equip.ID); })[0];
        var doMesmoCliente = porCodigo || achados.filter(function(eq) { return String(eq.associatedCustomerId) === String(customerAuvoId); })[0];
        if (doMesmoCliente) {
          Auvo_patchEquipamento_(doMesmoCliente.id, payload);
          Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, doMesmoCliente.id, AUVO_CFG.STATUS.OK, '');
          Auvo_registrarNoIndice_(indiceExistentes, doMesmoCliente.id, payload);
          return { ok: true, auvoId: doMesmoCliente.id, acao: 'vinculado' };
        }
        if (achados.length) {
          // identifier já usado por OUTRO cliente (o Auvo exige identifier único na base toda)
          var identifierUnico = Auvo_identifierDesambiguado_(equip);
          var payloadUnico = Auvo_montarPayloadEquipamentoParaAuvo_(equip, customerAuvoId, identifierUnico);
          var respRetry = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.EQUIPMENTS, payloadUnico);
          var auvoIdRetry = Auvo_extrairId_(respRetry);
          if (!auvoIdRetry) throw new Error('Auvo não retornou um ID pro equipamento criado (identifier desambiguado).');
          Auvo_gravarMapeamento_('EQUIPAMENTO', equipId, auvoIdRetry, AUVO_CFG.STATUS.OK,
            'identifier desambiguado pra "' + identifierUnico + '" — "' + payload.identifier + '" já usado por outro cliente no Auvo');
          Auvo_registrarNoIndice_(indiceExistentes, auvoIdRetry, payloadUnico);
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

// PATCH de equipamento; se o Auvo recusar só porque o código do SGO+ já está em outro
// equipamento lá (repetido antigo), repete sem o externalId (o vínculo é a aba AUVO_SYNC).
function Auvo_patchEquipamento_(auvoId, payload) {
  try {
    Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '/' + auvoId, payload);
  } catch (e) {
    if (!Auvo_ehErroExternalIdJaExiste_(e.message)) throw e;
    var semExt = Object.assign({}, payload);
    delete semExt.externalId;
    Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.EQUIPMENTS + '/' + auvoId, semExt);
  }
}

// Busca direcionada por identifier exato (usa `paramFilter`, que a API do
// Auvo aceita pra /equipments mesmo sem estar na doc — comportamento parece
// "contains", não igualdade exata, por isso filtra de novo no cliente antes
// de aceitar cada resultado). Devolve TODOS os matches, de qualquer Customer.
function Auvo_buscarEquipamentosPorIdentifierExato_(identifier) {
  if (!Auvo_identificadorValido_(identifier)) return [];
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
// FILTRO DO ENVIO (27/10/2026, pergunta do gestor): todos, um cliente, ou uma
// unidade desse cliente. Vale para a simulação e para o envio.
// ------------------------------------------------------------
function Auvo_normalizarFiltroEnvio_(payload) {
  payload = payload || {};
  var clienteId = SGO_UTILS.safe(payload.clienteId);
  var unidadeId = SGO_UTILS.safe(payload.unidadeId);
  if (!clienteId && !unidadeId) return { clienteId: '', unidadeId: '', unidades: [], rotulo: 'todos os clientes' };
  var unidade = unidadeId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, unidadeId) : null;
  if (unidadeId && !unidade) throw new Error('Unidade escolhida não encontrada no SGO+. Por quê: ela pode ter sido excluída ou juntada a outra. O que fazer: toque em "Simular" de novo e escolha na lista.');
  if (unidade && !clienteId) clienteId = SGO_UTILS.safe(unidade.CLIENTE_ID);
  var cliente = clienteId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, clienteId) : null;
  if (!cliente) throw new Error('Cliente escolhido não encontrado no SGO+. Por quê: ele pode ter sido excluído ou juntado a outro. O que fazer: toque em "Simular" de novo e escolha na lista.');
  if (unidade && SGO_UTILS.safe(unidade.CLIENTE_ID) !== clienteId) throw new Error('A unidade escolhida não pertence a este cliente. O que fazer: escolha o cliente primeiro e depois uma unidade dele.');
  var nomeCliente = SGO_UTILS.safe(cliente.NOME_FANTASIA) || SGO_UTILS.safe(cliente.RAZAO_SOCIAL);
  // unidades do cliente: equipamento só com a unidade preenchida também entra no envio do cliente
  var unidades = unidadeId ? [] : SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES)
    .filter(function(u) { return SGO_UTILS.safe(u.CLIENTE_ID) === clienteId; })
    .map(function(u) { return SGO_UTILS.safe(u.ID); });
  return {
    clienteId: clienteId, unidadeId: unidadeId, unidades: unidades,
    rotulo: nomeCliente + (unidade ? ' › ' + SGO_UTILS.safe(unidade.NOME_UNIDADE) : '')
  };
}

function Auvo_equipNoFiltro_(e, filtro) {
  if (!filtro || (!filtro.clienteId && !filtro.unidadeId)) return true;
  if (filtro.unidadeId) return SGO_UTILS.safe(e.UNIDADE_ID) === filtro.unidadeId;
  if (SGO_UTILS.safe(e.CLIENTE_ID) === filtro.clienteId) return true;
  return !SGO_UTILS.safe(e.CLIENTE_ID) && !!e.UNIDADE_ID && (filtro.unidades || []).indexOf(SGO_UTILS.safe(e.UNIDADE_ID)) !== -1;
}

function Auvo_unidadeNoFiltro_(u, filtro) {
  if (!filtro || (!filtro.clienteId && !filtro.unidadeId)) return true;
  if (filtro.unidadeId) return SGO_UTILS.safe(u.ID) === filtro.unidadeId;
  return SGO_UTILS.safe(u.CLIENTE_ID) === filtro.clienteId;
}

function Auvo_ativos_(tabela) {
  return SGO_DATA.getAll(SGO_CFG.SHEETS[tabela]).filter(function(r) { return SGO_UTILS.safeUpper(r.STATUS) === SGO_CFG.STATUS.ATIVO; });
}

// ------------------------------------------------------------
// SIMULAÇÃO (dry-run) — nunca grava nada. Só LÊ o Auvo (lista de
// equipamentos, guardada por 6h) para dizer o que seria criado, ligado a
// um existente ou atualizado.
// ------------------------------------------------------------
function Auvo_simularEnvioCadastro_(payload) {
  Auvo_bootstrap_();
  var filtro = Auvo_normalizarFiltroEnvio_(payload);
  var mapas = Auvo_indiceMapeamentosPorEntidade_();
  var unidadesTodas = Auvo_ativos_('CAD_UNIDADES');
  var clientesPorId = {}, unidadesPorId = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function(c) { clientesPorId[SGO_UTILS.safe(c.ID)] = c; });
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function(u) { unidadesPorId[SGO_UTILS.safe(u.ID)] = u; });
  var nomeCliente = function(id) { var c = clientesPorId[SGO_UTILS.safe(id)]; return c ? (SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL)) : ''; };
  var nomeUnidade = function(id) { var u = unidadesPorId[SGO_UTILS.safe(id)]; return u ? SGO_UTILS.safe(u.NOME_UNIDADE) : ''; };

  var unidades = unidadesTodas.filter(function(u) { return Auvo_unidadeNoFiltro_(u, filtro); });
  var unidadesPendentes = unidades.filter(function(u) { var m = mapas.obter('UNIDADE', u.ID); return !(m && m.AUVO_ID); });

  var indice = null, avisoAuvo = '';
  try { indice = Auvo_construirIndiceEquipamentosAuvoExistentes_(); }
  catch (e) {
    avisoAuvo = 'Não foi possível consultar o Auvo agora (' + e.message + '). Por quê: sem a lista do Auvo, a prévia não sabe quais equipamentos já existem lá. ' +
      'O que fazer: pode enviar mesmo assim (o envio confere item por item antes de criar) ou simular de novo daqui a pouco.';
  }

  var equipTodos = Auvo_ativos_('CAD_EQUIPAMENTOS');
  var eq = { total: 0, pendentes: 0, criar: 0, ligar: 0, atualizar: 0, aConferir: 0, semTag: 0, semVinculo: 0 };
  var grupos = {}, clientesResumo = {}, amostra = [];

  equipTodos.forEach(function(e) {
    var cid = SGO_UTILS.safe(e.CLIENTE_ID) || (e.UNIDADE_ID && unidadesPorId[SGO_UTILS.safe(e.UNIDADE_ID)] ? SGO_UTILS.safe(unidadesPorId[SGO_UTILS.safe(e.UNIDADE_ID)].CLIENTE_ID) : '');
    var m = mapas.obter('EQUIPAMENTO', e.ID);
    var ligado = !!(m && m.AUVO_ID);
    var previsto = Auvo_customerPrevistoParaEquipamento_(e, mapas);
    var acao = '';
    if (ligado) {
      var noAuvo = indice ? indice.clienteDoEquip[SGO_UTILS.safe(m.AUVO_ID)] : '';
      if (noAuvo && previsto && String(noAuvo) !== String(previsto)) acao = 'atualizar';
    } else if (!e.UNIDADE_ID && !e.CLIENTE_ID) {
      acao = 'semVinculo';
    } else if (!indice) {
      acao = 'aConferir';
    } else {
      acao = Auvo_acharEquipamentoNoAuvo_(indice, e, previsto) ? 'ligar' : 'criar';
    }
    // lista de clientes para o filtro: sempre sobre a base toda
    if (acao) {
      var rc = clientesResumo[cid] = clientesResumo[cid] || { id: cid, nome: nomeCliente(cid) || '(sem cliente)', pendentes: 0, atualizar: 0 };
      if (acao === 'atualizar') rc.atualizar++; else rc.pendentes++;
    }
    if (!Auvo_equipNoFiltro_(e, filtro)) return;
    eq.total++;
    if (!acao) return;
    var semTag = !Auvo_identificadorValido_(e.TAG);
    if (acao !== 'atualizar') { eq.pendentes++; if (semTag) eq.semTag++; }
    eq[acao]++;
    var kg = cid + '|' + SGO_UTILS.safe(e.UNIDADE_ID);
    var g = grupos[kg] = grupos[kg] || {
      clienteId: cid, cliente: nomeCliente(cid) || '(sem cliente)', unidadeId: SGO_UTILS.safe(e.UNIDADE_ID),
      unidade: e.UNIDADE_ID ? (nomeUnidade(e.UNIDADE_ID) || '(unidade não encontrada)') : '(sem unidade)',
      pendentes: 0, criar: 0, ligar: 0, atualizar: 0, aConferir: 0, semTag: 0, semVinculo: 0
    };
    if (acao !== 'atualizar') { g.pendentes++; if (semTag) g.semTag++; }
    g[acao]++;
    if (amostra.length < 10) {
      amostra.push({ id: e.ID, tipo: e.TIPO, tag: semTag ? '' : SGO_UTILS.safe(e.TAG), semTag: semTag,
        identificador: Auvo_identificadorEquipamento_(e).identifier, cliente: g.cliente, unidade: g.unidade, acao: acao });
    }
  });

  var ordena = function(a, b) { return (b.pendentes + b.atualizar) - (a.pendentes + a.atualizar) || String(a.cliente || a.nome).localeCompare(String(b.cliente || b.nome)); };
  return {
    filtro: filtro,
    unidades: { total: unidades.length, pendentes: unidadesPendentes.length },
    equipamentos: eq,
    avisoAuvo: avisoAuvo,
    grupos: Object.keys(grupos).map(function(k) { return grupos[k]; }).sort(ordena).slice(0, 300),
    clientes: Object.keys(clientesResumo).map(function(k) { return clientesResumo[k]; }).filter(function(c) { return c.id; }).sort(function(a, b) { return String(a.nome).localeCompare(String(b.nome)); }),
    unidadesDoCliente: filtro.clienteId ? unidadesTodas.filter(function(u) { return SGO_UTILS.safe(u.CLIENTE_ID) === filtro.clienteId; })
      .map(function(u) { return { id: u.ID, nome: SGO_UTILS.safe(u.NOME_UNIDADE) }; }).sort(function(a, b) { return a.nome.localeCompare(b.nome); }) : [],
    amostraUnidades: unidadesPendentes.slice(0, 8).map(function(u) { return { id: u.ID, nome: u.NOME_UNIDADE, cnpj: u.CNPJ_UNIDADE }; }),
    amostraEquipamentos: amostra
  };
}

// ------------------------------------------------------------
// EXECUÇÃO REAL — Unidades primeiro (poucas), depois Equipamentos em lotes
// retomáveis (cada item é 1 chamada HTTP ao Auvo).
// ------------------------------------------------------------
function Auvo_executarEnvioUnidadesPendentes_(payload) {
  Auvo_bootstrap_();
  var filtro = Auvo_normalizarFiltroEnvio_(payload);
  var unidades = Auvo_ativos_('CAD_UNIDADES').filter(function(u) { return Auvo_unidadeNoFiltro_(u, filtro); });
  var pendentes = unidades.filter(function(u) { var m = Auvo_obterMapeamento_('UNIDADE', u.ID); return !(m && m.AUVO_ID); });

  var sincronizadas = 0, criadas = 0, ligadas = 0, erros = [];
  pendentes.forEach(function(u) {
    try {
      var r = Auvo_sincronizarUnidade_(u.ID);
      if (r.ok) { sincronizadas++; if (r.acao === 'ligado') ligadas++; else if (r.acao === 'criado') criadas++; }
    } catch (e) {
      erros.push('Unidade ' + u.NOME_UNIDADE + ': ' + e.message);
    }
  });

  return { total: pendentes.length, sincronizadas: sincronizadas, criadas: criadas, ligadas: ligadas, erros: erros, filtro: filtro };
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

// Percorre a lista TOTAL e estável de equipamentos ativos do escopo escolhido
// (não uma lista de "pendentes" recalculada a cada lote — essa encolheria
// conforme processa e desalinharia o checkpoint). O escopo (todos / um
// cliente / uma unidade) fica guardado no checkpoint. Já ligado: só é
// atualizado se estiver pendurado em outro cliente do Auvo (ex.: cliente
// repetido do IMED); senão é só contado.
function Auvo_executarLoteEquipamentosPush_() {
  Auvo_bootstrap_();
  var cp = Auvo_lerCheckpointPush_();
  var filtro = cp.filtro || { clienteId: '', unidadeId: '', rotulo: 'todos os clientes' };
  var equipamentos = Auvo_ativos_('CAD_EQUIPAMENTOS').filter(function(e) { return Auvo_equipNoFiltro_(e, filtro); });

  var inicio = cp.indice || 0;
  var fim = Math.min(inicio + AUVO_PUSH_CFG.BATCH_SIZE_EQUIPAMENTOS, equipamentos.length);

  var indiceExistentes = Auvo_construirIndiceEquipamentosAuvoExistentes_();

  var criados = 0, atualizados = 0, vinculados = 0, desambiguados = 0, jaMapeados = 0, semVinculo = 0, semTag = 0, erros = [];
  for (var i = inicio; i < fim; i++) {
    var eq = equipamentos[i];
    var mapeamento = Auvo_obterMapeamento_('EQUIPAMENTO', eq.ID);
    if (mapeamento && mapeamento.AUVO_ID) {
      var noAuvo = indiceExistentes.clienteDoEquip[SGO_UTILS.safe(mapeamento.AUVO_ID)];
      var previsto = Auvo_customerPrevistoParaEquipamento_(eq);
      if (!(noAuvo && previsto && String(noAuvo) !== String(previsto))) { jaMapeados++; continue; }
    }
    try {
      var r = Auvo_sincronizarEquipamento_(eq.ID, indiceExistentes);
      if (!r.ok) { semVinculo++; continue; }
      if (!Auvo_identificadorValido_(eq.TAG)) semTag++;
      if (r.acao === 'criado') criados++;
      else if (r.acao === 'vinculado') vinculados++;
      else if (r.acao === 'criado_desambiguado') desambiguados++;
      else atualizados++;
    } catch (e) {
      erros.push('Equipamento ' + (Auvo_identificadorValido_(eq.TAG) || eq.TIPO || eq.ID) + ': ' + e.message);
    }
  }
  Auvo_gravarIndiceEquipamentosCache_(indiceExistentes);

  var concluido = fim >= equipamentos.length;
  if (concluido) Auvo_limparCheckpointPush_();
  else Auvo_gravarCheckpointPush_({ indice: fim, filtro: filtro });

  return {
    totalAtivos: equipamentos.length, processadosNesteLote: fim - inicio,
    indiceAtual: fim, concluido: concluido, filtro: filtro,
    criados: criados, atualizados: atualizados, vinculados: vinculados, desambiguados: desambiguados,
    jaMapeados: jaMapeados, semVinculo: semVinculo, semTag: semTag, erros: erros
  };
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL (gestão)
// payload: { clienteId?, unidadeId? } — vazio = todos os clientes.
// ------------------------------------------------------------
function Auvo_apiSimularEnvioCadastro(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_simularEnvioCadastro_(payload));
}

function Auvo_apiEnviarUnidadesPendentes(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_executarEnvioUnidadesPendentes_(payload));
}

function Auvo_apiIniciarEnvioEquipamentos(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var filtro = Auvo_normalizarFiltroEnvio_(payload);
  Auvo_limparCheckpointPush_();
  Auvo_gravarCheckpointPush_({ indice: 0, filtro: filtro });
  return Object.assign({ ok: true }, Auvo_executarLoteEquipamentosPush_());
}

function Auvo_apiContinuarEnvioEquipamentos(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  return Object.assign({ ok: true }, Auvo_executarLoteEquipamentosPush_());
}
