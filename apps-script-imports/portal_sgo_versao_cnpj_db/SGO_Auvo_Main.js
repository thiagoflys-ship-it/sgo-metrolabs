/****************************************************
 * SGO_Auvo_Main.js
 * INTEGRAÇÃO AUVO — SGO -> Auvo
 *
 * Envia Clientes, Técnicos (a partir de CAD_USUARIOS) e Tarefas (um
 * documento oficial emitido pelo Portal) pro Auvo. Mão única: nada volta
 * do Auvo pro Portal. Aba própria AUVO_SYNC guarda o mapeamento
 * ENTIDADE_ID (SGO) <-> AUVO_ID, sem sujar CAD_CLIENTES/CAD_USUARIOS com
 * colunas específicas desta integração (mesmo princípio já usado no
 * módulo NR13 pra CAD_EQUIPAMENTOS).
 *
 * Falha do Auvo NUNCA derruba o fluxo principal do Portal — toda chamada
 * que dispara uma sincronização a partir de outro módulo (Tarefa ao
 * emitir um documento) é sempre envolvida em try/catch pelo lado
 * chamador.
 ****************************************************/

// ------------------------------------------------------------
// BOOTSTRAP
// ------------------------------------------------------------
function Auvo_bootstrap_() {
  CertCal_garantirTabela_(SGO_CFG.SHEETS.AUVO_SYNC, [
    'ID', 'CHAVE', 'ENTIDADE_TIPO', 'ENTIDADE_ID', 'AUVO_ID', 'STATUS',
    'ULTIMA_SINCRONIZACAO', 'ULTIMO_ERRO', 'CRIADO_EM'
  ]);
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_USUARIOS, 'EMAIL');
  // ORIGEM rastreia se o registro veio da sincronização reversa Auvo -> Portal
  // (SGO_Auvo_Reverso.js) ou foi cadastrado manualmente (padrão MANUAL).
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_CLIENTES, 'ORIGEM');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_UNIDADES, 'ORIGEM');
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, 'ORIGEM');
}

function Auvo_exigirAdmin_(sessionId) {
  if (!isAdminSession(sessionId)) {
    throw new Error('Acesso restrito à gestão (Administrador, Gestor ou Diretoria) — a integração com o Auvo não está disponível para o seu perfil.');
  }
}

// ------------------------------------------------------------
// AUTENTICAÇÃO — cache-aside (CacheService + PropertiesService), mesmo
// desenho de SGO_Auth.js (salvarSessaoAuth_/lerSessaoAuth_), adaptado
// pro token do Auvo (~30min, sem refresh token — reautentica do zero).
// ------------------------------------------------------------
function Auvo_obterToken_() {
  var cache = Auvo_lerTokenCache_();
  if (cache && cache.token && !Auvo_tokenExpirado_(cache)) return cache.token;
  return Auvo_autenticar_();
}

function Auvo_lerTokenCache_() {
  try {
    var raw = CacheService.getScriptCache().get('AUVO_TOKEN');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // segue para fallback
  }

  try {
    var rawProp = PropertiesService.getScriptProperties().getProperty('AUVO_TOKEN_CACHE');
    if (!rawProp) return null;
    var data = JSON.parse(rawProp);
    if (!Auvo_tokenExpirado_(data)) {
      try { CacheService.getScriptCache().put('AUVO_TOKEN', rawProp, AUVO_CFG.TOKEN_TTL_SEGUNDOS); } catch (e2) {}
    }
    return data;
  } catch (e) {
    return null;
  }
}

function Auvo_salvarTokenCache_(token, expiresAtIso) {
  var raw = JSON.stringify({ token: token, expiresAt: expiresAtIso });
  try { CacheService.getScriptCache().put('AUVO_TOKEN', raw, AUVO_CFG.TOKEN_TTL_SEGUNDOS); } catch (e) {}
  try { PropertiesService.getScriptProperties().setProperty('AUVO_TOKEN_CACHE', raw); } catch (e) {}
}

function Auvo_invalidarTokenCache_() {
  try { CacheService.getScriptCache().remove('AUVO_TOKEN'); } catch (e) {}
  try { PropertiesService.getScriptProperties().deleteProperty('AUVO_TOKEN_CACHE'); } catch (e) {}
}

function Auvo_tokenExpirado_(data) {
  if (!data || !data.expiresAt) return true;
  var exp = new Date(data.expiresAt);
  if (isNaN(exp.getTime())) return true;
  return exp.getTime() < new Date().getTime();
}

function Auvo_autenticar_() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('AUVO_API_KEY') || '';
  var apiToken = props.getProperty('AUVO_API_TOKEN') || '';

  if (!apiKey || !apiToken) {
    throw new Error('Credenciais do Auvo não configuradas. O administrador cadastra as chaves em Chaves e senhas, no menu do SGO+ (grupo Auvo): ' +
      'AUVO_API_KEY e AUVO_API_TOKEN (gerados no Auvo em Menu > Integração).');
  }

  var resp = UrlFetchApp.fetch(AUVO_CFG.BASE_URL + AUVO_CFG.ENDPOINTS.LOGIN, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    payload: JSON.stringify({ apiKey: apiKey, apiToken: apiToken })
  });

  var codigo = resp.getResponseCode();
  var corpo = {};
  try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

  if (codigo !== 200) {
    throw new Error(Auvo_interpretarErro_(codigo, corpo));
  }

  var token = Auvo_extrairToken_(corpo);
  if (!token) {
    var msgAuvo = (corpo.result && corpo.result.message) || corpo.message || '';
    if (msgAuvo) {
      throw new Error('Auvo recusou o login: ' + msgAuvo);
    }
    throw new Error('Login no Auvo retornou HTTP 200 mas sem token reconhecível na resposta: ' +
      String(resp.getContentText()).slice(0, 300));
  }

  var expiresAt = new Date(new Date().getTime() + AUVO_CFG.TOKEN_TTL_SEGUNDOS * 1000).toISOString();
  Auvo_salvarTokenCache_(token, expiresAt);
  return token;
}

function Auvo_extrairToken_(corpo) {
  if (!corpo) return '';
  var candidatos = [
    corpo.accessToken,
    corpo.token,
    corpo.access_token,
    corpo.result && corpo.result.accessToken,
    corpo.result && corpo.result.token,
    corpo.data && corpo.data.accessToken
  ];
  for (var i = 0; i < candidatos.length; i++) {
    if (candidatos[i]) return String(candidatos[i]);
  }
  return '';
}

function Auvo_extrairMensagemErro_(corpo) {
  if (!corpo || typeof corpo !== 'object') return '';
  // Erro de validação (ex.: duplicidade de Identifier/Name) vem como array de
  // { message, target, errorCode, errors: [...] } — achado real 2026-08-28.
  if (Array.isArray(corpo)) {
    return corpo.map(function(item) {
      var detalhe = (item && item.errors && item.errors.length) ? item.errors.join(', ') : (item && item.message);
      return (item && item.target ? (item.target + ': ') : '') + detalhe;
    }).join(' | ');
  }
  if (corpo.message) return String(corpo.message);
  if (corpo.error) {
    if (typeof corpo.error === 'string') return corpo.error;
    if (corpo.error.message) return String(corpo.error.message);
  }
  // Auvo às vezes devolve erro de validação por campo: { "campo": ["msg1","msg2"], ... }
  var partes = [];
  Object.keys(corpo).forEach(function(k) {
    var v = corpo[k];
    if (Array.isArray(v)) {
      v.forEach(function(item) { partes.push(k + ': ' + item); });
    } else if (typeof v === 'string') {
      partes.push(k + ': ' + v);
    }
  });
  return partes.join(' | ');
}

function Auvo_interpretarErro_(codigo, corpo) {
  var msgApi = Auvo_extrairMensagemErro_(corpo) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Credenciais do Auvo inválidas (HTTP ' + codigo + '). Confira AUVO_API_KEY/AUVO_API_TOKEN em Chaves e senhas, no menu do SGO+.';
  if (codigo === 429) return 'Limite de requisições do Auvo atingido (HTTP 429). Aguarde e tente novamente.';
  if (codigo >= 500) return 'Auvo temporariamente indisponível (HTTP ' + codigo + ').';
  return 'Erro na API do Auvo (HTTP ' + codigo + '): ' + msgApi;
}

function Auvo_retentavel_(codigo) {
  return codigo === 500 || codigo === 502 || codigo === 503;
}

// ------------------------------------------------------------
// WRAPPER GENÉRICO DE CHAMADA — reautentica 1x em 401/403, retry com
// backoff em 429/5xx.
// ------------------------------------------------------------
// PATCH da API do Auvo exige JSON Patch (RFC 6902, array de {op,path,value})
// — objeto simples devolve 400 "The JSON patch document was malformed and
// could not be parsed" (confirmado ao vivo em 2026-08-28 no Equipamento;
// mesmo backend .NET, mesmo formato exigido pra Cliente/Técnico/Unidade).
function Auvo_montarJsonPatch_(objetoPlano) {
  return Object.keys(objetoPlano).map(function(k) {
    return { op: 'replace', path: '/' + k, value: objetoPlano[k] };
  });
}

function Auvo_apiFetch_(method, path, body) {
  var jaReautenticou = false;
  var corpoEnvio = (method === 'patch' && body && !Array.isArray(body)) ? Auvo_montarJsonPatch_(body) : body;

  for (var tentativa = 1; tentativa <= AUVO_CFG.MAX_TENTATIVAS; tentativa++) {
    var token = Auvo_obterToken_();
    var options = {
      method: method,
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token }
    };
    if (corpoEnvio !== undefined && corpoEnvio !== null) options.payload = JSON.stringify(corpoEnvio);

    var resp = UrlFetchApp.fetch(AUVO_CFG.BASE_URL + path, options);
    var codigo = resp.getResponseCode();
    var corpo = {};
    try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

    if (codigo >= 200 && codigo < 300) return corpo;

    if ((codigo === 401 || codigo === 403) && !jaReautenticou) {
      jaReautenticou = true;
      Auvo_invalidarTokenCache_();
      continue;
    }

    if (Auvo_retentavel_(codigo) && tentativa < AUVO_CFG.MAX_TENTATIVAS) {
      Utilities.sleep(AUVO_CFG.DELAYS_MS[tentativa - 1] || 1600);
      continue;
    }

    throw new Error(Auvo_interpretarErro_(codigo, corpo));
  }

  throw new Error('Falha ao comunicar com o Auvo após ' + AUVO_CFG.MAX_TENTATIVAS + ' tentativas.');
}

function Auvo_extrairId_(resp) {
  if (!resp) return '';
  var candidatos = [
    resp.id,
    resp.result && resp.result.id,
    resp.entities && resp.entities[0] && resp.entities[0].id,
    resp.data && resp.data.id
  ];
  for (var i = 0; i < candidatos.length; i++) {
    if (candidatos[i] !== undefined && candidatos[i] !== null && candidatos[i] !== '') return String(candidatos[i]);
  }
  return '';
}

// ------------------------------------------------------------
// MAPEAMENTO SGO <-> AUVO (aba AUVO_SYNC)
// ------------------------------------------------------------
function Auvo_chaveSync_(tipo, entidadeId) {
  return tipo + ':' + entidadeId;
}

// Busca por ENTIDADE_TIPO+ENTIDADE_ID direto (não pela coluna CHAVE) —
// achado real 2026-08-27: a sincronização reversa (SGO_Auvo_Reverso.js)
// grava CHAVE num formato diferente (tipo:AUVOID:auvoId, indexada por
// AUVO_ID) do que esta direção usa (tipo:entidadeId). Buscar só por
// CHAVE nunca achava o mapeamento de um registro que veio da direção
// reversa — resultado real: 4 clientes que já existiam no Auvo (vindos
// da importação reversa) ganharam um Customer DUPLICADO toda vez que
// geraram um documento, porque o sistema achava que "nunca tinham sido
// sincronizados". Buscar pelos campos em vez da CHAVE funciona pras
// linhas de QUALQUER direção, já que ambas preenchem ENTIDADE_TIPO/
// ENTIDADE_ID corretamente — só o formato da CHAVE em si diverge.
function Auvo_obterMapeamento_(tipo, entidadeId) {
  var tipoU = SGO_UTILS.safeUpper(tipo);
  var alvo = SGO_UTILS.safe(entidadeId);
  if (!alvo) return null;
  var achados = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).filter(function(m) {
    return SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) === tipoU && SGO_UTILS.safe(m.ENTIDADE_ID) === alvo;
  });
  // 2026-10-15: um cadastro pode ficar com 2 ligações (o cliente que já existia no Auvo,
  // trazido pela sincronização reversa — CHAVE "tipo:AUVOID:n" — e o que o SGO+ criou
  // antes de achar o original). Vale o original do Auvo: é nele que os técnicos abrem as
  // tarefas. Antes valia o primeiro da lista, e as tarefas do SGO+ iam para o repetido.
  // Só quando há UM original: vários originais ligados ao mesmo cadastro = cadastro ainda
  // desorganizado (ex.: filiais penduradas num cliente só) — aí fica o comportamento antigo
  // até o gestor organizar no painel de Vínculos.
  var doAuvo = achados.filter(function(m) { return /:AUVOID:/.test(String(m.CHAVE || '')) && SGO_UTILS.safe(m.AUVO_ID); });
  return (doAuvo.length === 1 ? doAuvo[0] : achados[0]) || null;
}

// Atualiza o mesmo registro que Auvo_obterMapeamento_ acharia (qualquer
// direção) em vez de sempre gravar por CHAVE no formato desta direção
// — evita criar uma 2ª linha em AUVO_SYNC pro mesmo registro quando ele
// já tinha sido mapeado pela sincronização reversa.
function Auvo_gravarMapeamento_(tipo, entidadeId, auvoId, status, erro) {
  var existente = Auvo_obterMapeamento_(tipo, entidadeId);
  var chave = existente ? existente.CHAVE : Auvo_chaveSync_(tipo, entidadeId);
  SGO_DATA.upsertByField(SGO_CFG.SHEETS.AUVO_SYNC, 'CHAVE', chave, {
    ENTIDADE_TIPO: tipo,
    ENTIDADE_ID: entidadeId,
    AUVO_ID: auvoId || '',
    STATUS: status,
    ULTIMA_SINCRONIZACAO: SGO_UTILS.nowIso(),
    ULTIMO_ERRO: erro || ''
  });
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO — CLIENTES
// ------------------------------------------------------------
// CNPJ às vezes fica gravado como NUMBER na planilha (não texto) —
// Sheets não preserva zero à esquerda em número, então um CNPJ real de
// 14 dígitos vira 13 (achado real 2026-08-27: "HOSPITAL UNIMED" tinha
// CNPJ_UNIDADE=1476619000210, 13 dígitos, rejeitado pelo Auvo com
// "Invalid CPF/CNPJ"). Cliente/Unidade aqui é sempre empresa (CNPJ, 14
// dígitos) — completa com zero à esquerda até bater 14 antes de mandar
// pro Auvo, sem tocar o dado guardado no Portal.
function Auvo_normalizarCnpjCpfParaEnvio_(bruto) {
  var digitos = SGO_UTILS.onlyDigits(bruto);
  if (!digitos) return '';
  return digitos.length < 14 ? digitos.padStart(14, '0') : digitos;
}

function Auvo_montarPayloadCliente_(cliente) {
  var email = SGO_UTILS.safe(cliente.EMAIL);
  var telefone = SGO_UTILS.safe(cliente.TELEFONE);
  return {
    externalId: SGO_UTILS.safe(cliente.ID),
    name: SGO_UTILS.safe(cliente.NOME_FANTASIA) || SGO_UTILS.safe(cliente.RAZAO_SOCIAL),
    cpfCnpj: Auvo_normalizarCnpjCpfParaEnvio_(cliente.CNPJ),
    email: email ? [email] : [],
    phoneNumber: telefone ? [telefone] : [],
    address: SGO_UTILS.safe(cliente.ENDERECO)
  };
}

function Auvo_sincronizarCliente_(clienteId) {
  Auvo_bootstrap_();
  var cliente = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, clienteId);
  if (!cliente) throw new Error('Cliente não encontrado: ' + clienteId);

  var mapeamento = Auvo_obterMapeamento_('CLIENTE', clienteId);
  var payload = Auvo_montarPayloadCliente_(cliente);

  try {
    if (mapeamento && mapeamento.AUVO_ID) {
      Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.CUSTOMERS + '/' + mapeamento.AUVO_ID, payload);
      Auvo_gravarMapeamento_('CLIENTE', clienteId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: 'atualizado' };
    }

    var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.CUSTOMERS, payload);
    var auvoId = Auvo_extrairId_(resp);
    if (!auvoId) throw new Error('Auvo não retornou um ID pro cliente criado.');
    Auvo_gravarMapeamento_('CLIENTE', clienteId, auvoId, AUVO_CFG.STATUS.OK, '');
    return { ok: true, auvoId: auvoId, acao: 'criado' };
  } catch (e) {
    Auvo_gravarMapeamento_('CLIENTE', clienteId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

/**
 * Alguns módulos (ex.: Registros Operacionais) não vinculam o "cliente"
 * digitado na tela a um ID real de CAD_CLIENTES — só guardam CNPJ/razão
 * social soltos, consultados direto de uma API pública. Pra esses casos,
 * resolve por CNPJ em vez de assumir um ID que não existe. Retorna null
 * se não achar (não cria cliente novo só pra viabilizar a Tarefa).
 */
function Auvo_resolverClientePorCnpj_(cnpj) {
  var alvo = String(cnpj || '').replace(/\D/g, '');
  if (!alvo) return null;
  var achado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function(c) {
    return String(c.CNPJ || '').replace(/\D/g, '') === alvo;
  })[0];
  return achado || null;
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO — TÉCNICOS (a partir de CAD_USUARIOS)
// ------------------------------------------------------------
function Auvo_mapearUserType_(perfil) {
  var p = SGO_UTILS.safeUpper(perfil);
  if (p === 'ADMIN') return 3;
  if (p === 'GESTOR') return 2;
  return 1; // TECNICO, METROLOGIA e demais perfis viram "User" comum no Auvo
}

// O Auvo exige senha na criação do usuário (POST), mas não há endpoint pra
// alterá-la depois (nem faz sentido — o técnico não usa login do Auvo pelo
// Portal). Gera uma senha aleatória só pra satisfazer a API.
function Auvo_gerarSenhaAleatoria_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12) + 'Aa1!';
}

// POST /users exige login/senha/cultura/tipo (campos obrigatórios só na
// criação). PATCH /users/{id} não aceita/precisa desses campos.
function Auvo_montarPayloadTecnicoCriacao_(usuario) {
  return {
    externalId: SGO_UTILS.safe(usuario.ID),
    name: SGO_UTILS.safe(usuario.NOME),
    culture: 'pt-BR',
    userType: Auvo_mapearUserType_(usuario.PERFIL),
    password: Auvo_gerarSenhaAleatoria_(),
    login: SGO_UTILS.safe(usuario.USUARIO),
    email: SGO_UTILS.safe(usuario.EMAIL),
    jobPosition: SGO_UTILS.safe(usuario.PERFIL)
  };
}

function Auvo_montarPayloadTecnicoAtualizacao_(usuario) {
  return {
    name: SGO_UTILS.safe(usuario.NOME),
    email: SGO_UTILS.safe(usuario.EMAIL),
    jobPosition: SGO_UTILS.safe(usuario.PERFIL)
  };
}

function Auvo_sincronizarTecnico_(usuarioId) {
  Auvo_bootstrap_();
  var usuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId);
  if (!usuario) throw new Error('Usuário não encontrado: ' + usuarioId);

  var mapeamento = Auvo_obterMapeamento_('TECNICO', usuarioId);

  try {
    if (!SGO_UTILS.safe(usuario.EMAIL)) {
      throw new Error('Usuário "' + usuario.NOME + '" não tem e-mail cadastrado — obrigatório pro Auvo. ' +
        'Preencha o e-mail na tela de Integração Auvo antes de sincronizar.');
    }

    if (mapeamento && mapeamento.AUVO_ID) {
      var payloadAtualizacao = Auvo_montarPayloadTecnicoAtualizacao_(usuario);
      Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.USERS + '/' + mapeamento.AUVO_ID, payloadAtualizacao);
      Auvo_gravarMapeamento_('TECNICO', usuarioId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: 'atualizado' };
    }

    var payloadCriacao = Auvo_montarPayloadTecnicoCriacao_(usuario);
    var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.USERS, payloadCriacao);
    var auvoId = Auvo_extrairId_(resp);
    if (!auvoId) throw new Error('Auvo não retornou um ID pro técnico criado.');
    Auvo_gravarMapeamento_('TECNICO', usuarioId, auvoId, AUVO_CFG.STATUS.OK, '');
    return { ok: true, auvoId: auvoId, acao: 'criado' };
  } catch (e) {
    Auvo_gravarMapeamento_('TECNICO', usuarioId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

// ------------------------------------------------------------
// TAREFAS — criadas pelos hooks dos módulos que emitem documento oficial
// (CertCal, NR13, RegOp, PgtPop). Sincroniza cliente/técnico na hora
// ("lazy sync") se ainda não tiverem sido sincronizados antes.
// ------------------------------------------------------------
function Auvo_criarTarefa_(dados) {
  Auvo_bootstrap_();
  dados = dados || {};

  var clienteId = SGO_UTILS.safe(dados.clienteId);
  var usuarioId = SGO_UTILS.safe(dados.usuarioId);

  var mapCliente = clienteId ? Auvo_obterMapeamento_('CLIENTE', clienteId) : null;
  if (clienteId && (!mapCliente || !mapCliente.AUVO_ID)) {
    Auvo_sincronizarCliente_(clienteId);
    mapCliente = Auvo_obterMapeamento_('CLIENTE', clienteId);
  }

  var mapTecnico = usuarioId ? Auvo_obterMapeamento_('TECNICO', usuarioId) : null;
  if (usuarioId && (!mapTecnico || !mapTecnico.AUVO_ID)) {
    try {
      Auvo_sincronizarTecnico_(usuarioId);
      mapTecnico = Auvo_obterMapeamento_('TECNICO', usuarioId);
    } catch (e) {
      // ex.: usuário sem e-mail cadastrado — a Tarefa segue sem técnico
      // vinculado em vez de falhar por completo
      mapTecnico = null;
    }
  }

  var payload = {
    externalId: SGO_UTILS.safe(dados.documentoId),
    title: SGO_UTILS.safe(dados.titulo),
    description: SGO_UTILS.safe(dados.descricao),
    customerId: mapCliente ? mapCliente.AUVO_ID : undefined,
    userId: mapTecnico ? mapTecnico.AUVO_ID : undefined,
    taskDate: SGO_UTILS.safe(dados.data) || SGO_UTILS.nowIso(),
    externalUrl: SGO_UTILS.safe(dados.linkPdf)
  };

  var resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.TASKS, payload);
  var auvoId = Auvo_extrairId_(resp);
  if (dados.documentoId) {
    Auvo_gravarMapeamento_('TAREFA', dados.documentoId, auvoId, AUVO_CFG.STATUS.OK, '');
  }
  return { ok: true, auvoId: auvoId };
}

// ------------------------------------------------------------
// FUNÇÕES EXPOSTAS AO PAINEL "INTEGRAÇÃO AUVO" (todas atrás de admin)
// ------------------------------------------------------------
function Auvo_apiPing() {
  return { ok: true, appTitle: AUVO_CFG.APP_TITLE };
}

function Auvo_apiTestarConexao(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_invalidarTokenCache_();
  Auvo_autenticar_();
  return { ok: true, message: 'Conexão com o Auvo estabelecida com sucesso.' };
}

function Auvo_apiListarStatusSincronizacao(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  return { ok: true, items: SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC) };
}

function Auvo_apiListarClientesParaSync(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();

  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function(m) {
    if (SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) === 'CLIENTE') mapa[SGO_UTILS.safe(m.ENTIDADE_ID)] = m;
  });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES)
    .filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) === SGO_CFG.STATUS.ATIVO; })
    .map(function(c) {
      var m = mapa[SGO_UTILS.safe(c.ID)];
      return {
        id: c.ID,
        nome: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL),
        cnpj: c.CNPJ,
        status: m ? m.STATUS : AUVO_CFG.STATUS.PENDENTE,
        ultimoErro: m ? m.ULTIMO_ERRO : ''
      };
    });

  return { ok: true, items: itens };
}

// Busca (não lista tudo) — usada pela tela em vez de renderizar a base
// inteira de clientes, que só cresce e vira uma tabela imprestável.
function Auvo_apiBuscarClienteParaSync(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  var termo = SGO_UTILS.safeUpper((payload || {}).termo).trim();
  if (termo.length < 2) return { ok: true, items: [] };
  var termoDigits = SGO_UTILS.onlyDigits(termo);

  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function(m) {
    if (SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) === 'CLIENTE') mapa[SGO_UTILS.safe(m.ENTIDADE_ID)] = m;
  });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES)
    .filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) === SGO_CFG.STATUS.ATIVO; })
    .filter(function(c) {
      var nome = SGO_UTILS.safeUpper(SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL));
      var cnpjDigits = SGO_UTILS.onlyDigits(c.CNPJ);
      return nome.indexOf(termo) !== -1 || (termoDigits && cnpjDigits.indexOf(termoDigits) !== -1);
    })
    .slice(0, 20)
    .map(function(c) {
      var m = mapa[SGO_UTILS.safe(c.ID)];
      return {
        id: c.ID,
        nome: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL),
        cnpj: c.CNPJ,
        status: m ? m.STATUS : AUVO_CFG.STATUS.PENDENTE,
        ultimoErro: m ? m.ULTIMO_ERRO : ''
      };
    });

  return { ok: true, items: itens };
}

function Auvo_apiBuscarTecnicoParaSync(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();
  var termo = SGO_UTILS.safeUpper((payload || {}).termo).trim();
  if (termo.length < 2) return { ok: true, items: [] };

  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function(m) {
    if (SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) === 'TECNICO') mapa[SGO_UTILS.safe(m.ENTIDADE_ID)] = m;
  });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function(u) {
      return SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO &&
        AUVO_CFG.PERFIS_TECNICOS.indexOf(SGO_UTILS.safeUpper(u.PERFIL)) !== -1;
    })
    .filter(function(u) { return SGO_UTILS.safeUpper(u.NOME).indexOf(termo) !== -1; })
    .slice(0, 20)
    .map(function(u) {
      var m = mapa[SGO_UTILS.safe(u.ID)];
      return {
        id: u.ID,
        nome: u.NOME,
        perfil: u.PERFIL,
        email: SGO_UTILS.safe(u.EMAIL),
        status: m ? m.STATUS : AUVO_CFG.STATUS.PENDENTE,
        ultimoErro: m ? m.ULTIMO_ERRO : ''
      };
    });

  return { ok: true, items: itens };
}

function Auvo_apiListarUsuariosParaSync(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_bootstrap_();

  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function(m) {
    if (SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) === 'TECNICO') mapa[SGO_UTILS.safe(m.ENTIDADE_ID)] = m;
  });

  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function(u) {
      return SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO &&
        AUVO_CFG.PERFIS_TECNICOS.indexOf(SGO_UTILS.safeUpper(u.PERFIL)) !== -1;
    })
    .map(function(u) {
      var m = mapa[SGO_UTILS.safe(u.ID)];
      return {
        id: u.ID,
        nome: u.NOME,
        perfil: u.PERFIL,
        email: SGO_UTILS.safe(u.EMAIL),
        status: m ? m.STATUS : AUVO_CFG.STATUS.PENDENTE,
        ultimoErro: m ? m.ULTIMO_ERRO : ''
      };
    });

  return { ok: true, items: itens };
}

function Auvo_apiDefinirEmailUsuario(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  payload = payload || {};
  var usuarioId = SGO_UTILS.safe(payload.usuarioId);
  var email = SGO_UTILS.safe(payload.email).trim();

  if (!usuarioId) throw new Error('Usuário não informado.');
  if (!email || email.indexOf('@') === -1) throw new Error('E-mail inválido.');

  Auvo_bootstrap_();
  var ok = SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId, { EMAIL: email });
  if (!ok) throw new Error('Não foi possível salvar o e-mail.');
  return { ok: true };
}

function Auvo_apiSincronizarCliente(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var clienteId = SGO_UTILS.safe((payload || {}).clienteId);
  if (!clienteId) throw new Error('Cliente não informado.');
  return Auvo_sincronizarCliente_(clienteId);
}

function Auvo_apiSincronizarTecnico(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var usuarioId = SGO_UTILS.safe((payload || {}).usuarioId);
  if (!usuarioId) throw new Error('Usuário não informado.');
  return Auvo_sincronizarTecnico_(usuarioId);
}

function Auvo_apiSincronizarTodosClientes(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  var clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES)
    .filter(function(c) { return SGO_UTILS.safeUpper(c.STATUS) === SGO_CFG.STATUS.ATIVO; });

  var sucesso = 0, erro = 0, erros = [];
  clientes.forEach(function(c) {
    try {
      Auvo_sincronizarCliente_(c.ID);
      sucesso++;
    } catch (e) {
      erro++;
      erros.push(SGO_UTILS.safe(c.RAZAO_SOCIAL) + ': ' + e.message);
    }
  });

  return { ok: true, sucesso: sucesso, erro: erro, erros: erros };
}

function Auvo_apiSincronizarTodosTecnicos(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  var usuarios = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function(u) {
      return SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO &&
        AUVO_CFG.PERFIS_TECNICOS.indexOf(SGO_UTILS.safeUpper(u.PERFIL)) !== -1;
    });

  var sucesso = 0, erro = 0, erros = [];
  usuarios.forEach(function(u) {
    try {
      Auvo_sincronizarTecnico_(u.ID);
      sucesso++;
    } catch (e) {
      erro++;
      erros.push(u.NOME + ': ' + e.message);
    }
  });

  return { ok: true, sucesso: sucesso, erro: erro, erros: erros };
}

// ------------------------------------------------------------
// DISPATCH
// ------------------------------------------------------------
function Auvo_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiPing: Auvo_apiPing,
    apiTestarConexao: Auvo_apiTestarConexao,
    apiListarStatusSincronizacao: Auvo_apiListarStatusSincronizacao,
    apiListarClientesParaSync: Auvo_apiListarClientesParaSync,
    apiListarUsuariosParaSync: Auvo_apiListarUsuariosParaSync,
    apiDefinirEmailUsuario: Auvo_apiDefinirEmailUsuario,
    apiSincronizarCliente: Auvo_apiSincronizarCliente,
    apiSincronizarTecnico: Auvo_apiSincronizarTecnico,
    apiSincronizarTodosClientes: Auvo_apiSincronizarTodosClientes,
    apiSincronizarTodosTecnicos: Auvo_apiSincronizarTodosTecnicos,
    apiSimularSincronizacaoReversa: Auvo_apiSimularSincronizacaoReversa,
    apiIniciarSincronizacaoReversa: Auvo_apiIniciarSincronizacaoReversa,
    apiContinuarSincronizacaoReversa: Auvo_apiContinuarSincronizacaoReversa,
    apiStatusSincronizacaoReversa: Auvo_apiStatusSincronizacaoReversa,
    apiAtivarSincronizacaoDiaria: Auvo_apiAtivarSincronizacaoDiaria,
    apiAuditarNomesParecidos: Auvo_apiAuditarNomesParecidos,
    apiRodarSincronizacaoIncremental: Auvo_apiRodarSincronizacaoIncremental,
    apiAtivarSincronizacaoIncremental: Auvo_apiAtivarSincronizacaoIncremental,
    apiStatusSincronizacaoIncremental: Auvo_apiStatusSincronizacaoIncremental,
    apiVerificarNovosEventos: Auvo_apiVerificarNovosEventos,
    apiGerarRelatorio: Auvo_apiGerarRelatorio,
    apiListarColaboradoresRelatorio: Auvo_apiListarColaboradoresRelatorio,
    apiDesativarSincronizacaoIncremental: Auvo_apiDesativarSincronizacaoIncremental,
    apiBuscarClienteParaSync: Auvo_apiBuscarClienteParaSync,
    apiBuscarTecnicoParaSync: Auvo_apiBuscarTecnicoParaSync,
    apiObterOS: Auvo_apiObterOS,
    apiSimularEnvioCadastro: Auvo_apiSimularEnvioCadastro,
    apiEnviarUnidadesPendentes: Auvo_apiEnviarUnidadesPendentes,
    apiIniciarEnvioEquipamentos: Auvo_apiIniciarEnvioEquipamentos,
    apiContinuarEnvioEquipamentos: Auvo_apiContinuarEnvioEquipamentos,
    apiListarPendencias: Auvo_apiListarPendencias,
    apiAtualizarPendenciasAgora: Auvo_apiAtualizarPendenciasAgora,
    apiAtivarSincronizacaoDiariaPendencias: Auvo_apiAtivarSincronizacaoDiariaPendencias,
    apiDesativarSincronizacaoDiariaPendencias: Auvo_apiDesativarSincronizacaoDiariaPendencias,
    apiStatusSincronizacaoDiariaPendencias: Auvo_apiStatusSincronizacaoDiariaPendencias
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  // Fase 2 (16/10): as ferramentas de implantação (envio em lote, importação completa, auditoria
  // e envio de cadastro pendente) gravam muito no Auvo ou no SGO+ de uma vez: só o Administrador.
  // O uso diário (conexão, sincronização automática, pendências e relatório) continua para a gestão.
  var soAdmin = {
    apiListarClientesParaSync: 1, apiListarUsuariosParaSync: 1, apiDefinirEmailUsuario: 1,
    apiSincronizarCliente: 1, apiSincronizarTecnico: 1, apiSincronizarTodosClientes: 1, apiSincronizarTodosTecnicos: 1,
    apiBuscarClienteParaSync: 1, apiBuscarTecnicoParaSync: 1,
    apiSimularSincronizacaoReversa: 1, apiIniciarSincronizacaoReversa: 1, apiContinuarSincronizacaoReversa: 1,
    apiStatusSincronizacaoReversa: 1, apiAtivarSincronizacaoDiaria: 1, apiAuditarNomesParecidos: 1,
    apiSimularEnvioCadastro: 1, apiEnviarUnidadesPendentes: 1, apiIniciarEnvioEquipamentos: 1, apiContinuarEnvioEquipamentos: 1
  };
  if (soAdmin[fn]) {
    var sessaoAuvo = validarSessao(String(req.sessionId || ''));
    var perfilAuvo = String((sessaoAuvo && sessaoAuvo.data && sessaoAuvo.data.perfil) || '').toUpperCase();
    if (perfilAuvo !== 'ADMIN') {
      throw new Error('Esta ferramenta de implantação do Auvo é exclusiva do Administrador. Peça a ele para executá-la (Integração Auvo › Ferramentas de implantação).');
    }
  }

  return allow[fn](req.sessionId, payload);
}

function Auvo_obterConteudoModulo() {
  return AUVO_CONTEUDO_MODULO;
}
