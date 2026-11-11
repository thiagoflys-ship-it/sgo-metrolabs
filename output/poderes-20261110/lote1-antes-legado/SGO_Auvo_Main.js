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
  return Auvo_escolherMapeamento_(achados);
}

// 27/10/2026 (IMED - URUAÇU, "External id already exists"): com várias linhas para o mesmo
// cadastro, a primeira da lista podia ser uma linha de erro SEM número do Auvo (gravada por
// uma tentativa anterior que falhou). O SGO+ achava que o cadastro "nunca foi enviado" e
// tentava CRIAR de novo no Auvo. Linha sem número do Auvo só vale quando não há outra.
function Auvo_escolherMapeamento_(achados) {
  achados = achados || [];
  var comId = achados.filter(function(m) { return SGO_UTILS.safe(m.AUVO_ID); });
  var doAuvo = comId.filter(function(m) { return /:AUVOID:/.test(String(m.CHAVE || '')); });
  return (doAuvo.length === 1 ? doAuvo[0] : (comId[0] || achados[0])) || null;
}

// Índice em memória de AUVO_SYNC por "TIPO:ENTIDADE_ID", com a mesma escolha de
// Auvo_obterMapeamento_ — para quem consulta centenas de cadastros de uma vez
// (simulação e envio de equipamentos) sem reler a aba a cada item.
function Auvo_indiceMapeamentosPorEntidade_() {
  var grupos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function(m) {
    var k = SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) + ':' + SGO_UTILS.safe(m.ENTIDADE_ID);
    (grupos[k] = grupos[k] || []).push(m);
  });
  var indice = {};
  Object.keys(grupos).forEach(function(k) { indice[k] = Auvo_escolherMapeamento_(grupos[k]); });
  return {
    obter: function(tipo, entidadeId) { return indice[SGO_UTILS.safeUpper(tipo) + ':' + SGO_UTILS.safe(entidadeId)] || null; },
    linhas: function() { return [].concat.apply([], Object.keys(grupos).map(function(k) { return grupos[k]; })); }
  };
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
      var rp = Auvo_patchCustomer_(mapeamento.AUVO_ID, payload);
      Auvo_gravarMapeamento_('CLIENTE', clienteId, mapeamento.AUVO_ID, AUVO_CFG.STATUS.OK, '');
      return { ok: true, auvoId: mapeamento.AUVO_ID, acao: 'atualizado', mensagem: Auvo_mensagemCustomer_('cliente', 'atualizado', mapeamento.AUVO_ID, rp) };
    }
    return Auvo_ligarOuCriarCustomer_('CLIENTE', clienteId, payload);
  } catch (e) {
    Auvo_gravarMapeamento_('CLIENTE', clienteId, mapeamento && mapeamento.AUVO_ID, AUVO_CFG.STATUS.ERRO, e.message);
    throw e;
  }
}

// ------------------------------------------------------------
// RECONHECER CLIENTE / UNIDADE QUE JÁ EXISTE NO AUVO (27/10/2026)
//
// Caso real: o gestor sincronizou IMED - URUAÇU e o Auvo respondeu
// "ExternalId: External id already exists" (HTTP 400). O SGO+ não tinha
// ligação com número do Auvo para o cadastro e ia direto ao POST (criar),
// mas o Auvo já tinha um cliente carregando o código do SGO+ (externalId).
// Regra agora, para Cliente e Unidade (cada Unidade é um cliente no Auvo):
//  1. Antes de criar, procura no Auvo pelo código do SGO+ (externalId) e
//     pelo CNPJ completo. Achou: liga (AUVO_SYNC) e atualiza, sem criar.
//  2. Com mais de um no Auvo, vale o original: o que já estava ligado a este
//     cadastro pela importação do Auvo; senão o ativo mais antigo (menor número).
//  3. Se o POST ainda assim voltar "already exists", varre a lista completa
//     de clientes do Auvo e faz o mesmo. Nunca cria cliente repetido.
//  4. Cliente do Auvo ligado no SGO+ a OUTRO cadastro não é tomado: para,
//     dizendo o quê, por quê e o que fazer. Nada é apagado no Auvo.
// ------------------------------------------------------------
function Auvo_ehErroJaExiste_(msg) {
  return /already exist|duplicat|j[aá] existe/i.test(String(msg || ''));
}

function Auvo_ehErroExternalIdJaExiste_(msg) {
  return /external\s*id/i.test(String(msg || '')) && Auvo_ehErroJaExiste_(msg);
}

// PATCH de Cliente/Unidade. Se o Auvo recusar só porque o código do SGO+ (externalId) já está em
// outro cliente lá (um repetido antigo), repete sem mexer no externalId: o vínculo de verdade é a
// aba AUVO_SYNC, e os demais dados chegam do mesmo jeito.
function Auvo_patchCustomer_(auvoId, payload) {
  try {
    Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.CUSTOMERS + '/' + auvoId, payload);
    return { semExternalId: false };
  } catch (e) {
    if (!Auvo_ehErroExternalIdJaExiste_(e.message) || !payload || !('externalId' in payload)) throw e;
    var semExt = Object.assign({}, payload);
    delete semExt.externalId;
    Auvo_apiFetch_('patch', AUVO_CFG.ENDPOINTS.CUSTOMERS + '/' + auvoId, semExt);
    return { semExternalId: true };
  }
}

function Auvo_cpfCnpjComparavel_(v) {
  var d = SGO_UTILS.onlyDigits(v);
  if (!d) return '';
  if (d.length === 11) return d;
  return Auvo_normalizarCnpjCpfParaEnvio_(d);
}

// Busca direcionada em /customers com paramFilter. Não confia no filtro do Auvo (pode ser
// "contém" ou ser ignorado): confere de novo, campo a campo, antes de aceitar cada um.
function Auvo_buscarCustomersFiltrados_(filtro, confere) {
  var qs = 'paramFilter=' + encodeURIComponent(JSON.stringify(filtro));
  var achados = [];
  for (var pagina = 1; pagina <= 3; pagina++) {
    var resp = Auvo_apiFetch_('get', AUVO_CFG.ENDPOINTS.CUSTOMERS + '?page=' + pagina + '&pageSize=' + AUVO_CFG.PAGE_SIZE_MAX + '&' + qs, null);
    var lote = (resp && resp.result && resp.result.entityList) || [];
    lote.forEach(function(c) { if (confere(c)) achados.push(c); });
    var paginacao = resp && resp.result && resp.result.pagedSearchReturnData;
    var total = paginacao ? paginacao.totalItems : lote.length;
    if (lote.length === 0 || pagina * AUVO_CFG.PAGE_SIZE_MAX >= total) break;
  }
  return achados;
}

function Auvo_procurarCustomerExistente_(tipo, entidadeId, payload, varreduraCompleta) {
  var ext = SGO_UTILS.safe(payload && payload.externalId);
  var doc = Auvo_cpfCnpjComparavel_(payload && payload.cpfCnpj);
  if (doc && doc.length !== 11 && doc.length !== 14) doc = '';
  var confere = function(c) {
    return !!c && ((ext && SGO_UTILS.safe(c.externalId) === ext) || (doc && Auvo_cpfCnpjComparavel_(c.cpfCnpj) === doc));
  };
  var lista;
  if (varreduraCompleta) {
    lista = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.CUSTOMERS).filter(confere);
  } else {
    lista = ext ? Auvo_buscarCustomersFiltrados_({ externalId: ext }, confere) : [];
    if (doc) lista = lista.concat(Auvo_buscarCustomersFiltrados_({ cpfCnpj: doc }, confere));
    // o Auvo pode guardar o CNPJ com pontuação; o filtro dele compara texto
    if (doc.length === 14 && !lista.some(function(c) { return Auvo_cpfCnpjComparavel_(c.cpfCnpj) === doc; })) {
      var formatado = doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      lista = lista.concat(Auvo_buscarCustomersFiltrados_({ cpfCnpj: formatado }, confere));
    }
  }
  var vistos = {};
  lista = lista.filter(function(c) { var k = String(c.id); if (vistos[k]) return false; vistos[k] = 1; return true; });
  return Auvo_escolherCustomerExistente_(tipo, entidadeId, lista, ext, SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_SYNC));
}

// Puro (testável): decide qual cliente do Auvo adotar entre os encontrados.
function Auvo_escolherCustomerExistente_(tipo, entidadeId, lista, ext, linhasSync) {
  var tipoU = SGO_UTILS.safeUpper(tipo);
  var alvo = SGO_UTILS.safe(entidadeId);
  var donos = {}, originalDeste = {};
  (linhasSync || []).forEach(function(m) {
    if (SGO_UTILS.safeUpper(m.ENTIDADE_TIPO) !== tipoU || !SGO_UTILS.safe(m.AUVO_ID)) return;
    if (SGO_UTILS.safeUpper(m.STATUS) === 'CADASTRO_EXCLUIDO') return;
    var a = SGO_UTILS.safe(m.AUVO_ID), dono = SGO_UTILS.safe(m.ENTIDADE_ID);
    (donos[a] = donos[a] || {})[dono] = 1;
    if (dono === alvo && /:AUVOID:/.test(String(m.CHAVE || ''))) originalDeste[a] = 1;
  });
  lista = lista || [];
  if (!lista.length) return { customer: null };
  var deOutro = function(c) { var d = donos[String(c.id)]; return !!d && Object.keys(d).some(function(x) { return x !== alvo; }); };
  var livres = lista.filter(function(c) { return !deOutro(c); });
  if (!livres.length) {
    var c0 = lista[0];
    var outros = Object.keys(donos[String(c0.id)] || {}).filter(function(x) { return x !== alvo; });
    return {
      customer: null,
      bloqueio: 'Não enviado ao Auvo: o Auvo já tem este cadastro (cliente nº ' + c0.id + (c0.description ? ', "' + SGO_UTILS.safe(c0.description) + '"' : '') +
        '), mas no SGO+ ele está ligado a outro ' + (tipoU === 'UNIDADE' ? 'unidade' : 'cliente') + ' (código ' + outros.join(', ') + '). ' +
        'Por quê: criar outro no Auvo duplicaria o cliente, e tomar o de outro cadastro trocaria os atendimentos de lugar. ' +
        'O que fazer: abra "Vínculos" no menu e confira se estes dois cadastros do SGO+ são o mesmo local (junte-os) ou não; depois toque em "Sincronizar" de novo. ' +
        'Nada foi gravado no Auvo.'
    };
  }
  var num = function(c) { var n = Number(c.id); return isNaN(n) ? Infinity : n; };
  livres.sort(function(a, b) {
    var oa = originalDeste[String(a.id)] ? 0 : 1, ob = originalDeste[String(b.id)] ? 0 : 1;
    if (oa !== ob) return oa - ob;
    var aa = a.active === false ? 1 : 0, ab = b.active === false ? 1 : 0;
    if (aa !== ab) return aa - ab;
    return num(a) - num(b);
  });
  var escolhido = livres[0];
  var donoExt = ext ? lista.filter(function(c) { return SGO_UTILS.safe(c.externalId) === ext; })[0] : null;
  var extEscolhido = SGO_UTILS.safe(escolhido.externalId);
  return {
    customer: escolhido,
    // só grava o código do SGO+ no escolhido se ele estiver livre lá (sem código ou já com o nosso)
    manterExternalId: !extEscolhido || extEscolhido === ext ? !(donoExt && String(donoExt.id) !== String(escolhido.id)) : false,
    externalIdEmOutro: donoExt && String(donoExt.id) !== String(escolhido.id) ? String(donoExt.id) : '',
    repetidos: livres.slice(1).map(function(c) { return String(c.id); })
  };
}

function Auvo_adotarCustomer_(tipo, entidadeId, payload, achado) {
  var auvoId = String(achado.customer.id);
  var envio = Object.assign({}, payload);
  if (!achado.manterExternalId) delete envio.externalId;
  var rp = Auvo_patchCustomer_(auvoId, envio);
  Auvo_gravarMapeamento_(tipo, entidadeId, auvoId, AUVO_CFG.STATUS.OK, '');
  return {
    ok: true, auvoId: auvoId, acao: 'ligado',
    externalIdEmOutro: achado.externalIdEmOutro || '', repetidos: achado.repetidos || [],
    mensagem: Auvo_mensagemCustomer_(SGO_UTILS.safeUpper(tipo) === 'UNIDADE' ? 'unidade' : 'cliente', 'ligado', auvoId, rp, achado)
  };
}

function Auvo_mensagemCustomer_(rotulo, acao, auvoId, rp, achado) {
  var msg;
  if (acao === 'ligado') msg = 'O ' + rotulo + ' já existia no Auvo (nº ' + auvoId + '). O SGO+ ligou este cadastro a ele e enviou a correção. Nada foi criado em duplicidade.';
  else if (acao === 'criado') msg = 'O ' + rotulo + ' não existia no Auvo e foi criado lá (nº ' + auvoId + ').';
  else msg = 'Correção enviada ao Auvo (' + rotulo + ' nº ' + auvoId + ').';
  var repetidos = [];
  if (achado && achado.externalIdEmOutro) repetidos.push(achado.externalIdEmOutro);
  (achado && achado.repetidos || []).forEach(function(r) { if (repetidos.indexOf(r) === -1) repetidos.push(r); });
  if (repetidos.length) {
    msg += ' Atenção: o Auvo tem outro(s) cadastro(s) repetido(s) deste ' + rotulo + ' (nº ' + repetidos.join(', ') + '). ' +
      'O SGO+ usa só o nº ' + auvoId + '; os repetidos podem ser desativados no Auvo por quem administra o Auvo (o SGO+ não apaga nada).';
  } else if (rp && rp.semExternalId) {
    msg += ' O código do SGO+ continua guardado em outro cliente do Auvo (repetido); o SGO+ usa só o nº ' + auvoId + '.';
  }
  return msg;
}

function Auvo_ligarOuCriarCustomer_(tipo, entidadeId, payload) {
  var rotulo = SGO_UTILS.safeUpper(tipo) === 'UNIDADE' ? 'unidade' : 'cliente';
  var achado = Auvo_procurarCustomerExistente_(tipo, entidadeId, payload, false);
  if (achado.bloqueio) throw new Error(achado.bloqueio);
  if (achado.customer) return Auvo_adotarCustomer_(tipo, entidadeId, payload, achado);

  var resp;
  try {
    resp = Auvo_apiFetch_('post', AUVO_CFG.ENDPOINTS.CUSTOMERS, payload);
  } catch (e) {
    if (!Auvo_ehErroJaExiste_(e.message)) throw e;
    // a busca direcionada não achou, mas o Auvo diz que já existe: varre a lista completa
    var achado2 = Auvo_procurarCustomerExistente_(tipo, entidadeId, payload, true);
    if (achado2.bloqueio) throw new Error(achado2.bloqueio);
    if (achado2.customer) return Auvo_adotarCustomer_(tipo, entidadeId, payload, achado2);
    throw new Error('Não enviado ao Auvo: o Auvo respondeu que este ' + rotulo + ' já existe lá ("' + e.message + '"), ' +
      'mas não foi possível achar qual é pelo código do SGO+ (' + SGO_UTILS.safe(payload.externalId) + ') nem pelo CNPJ. ' +
      'Por quê: para não criar um cliente repetido, o SGO+ não cria nada sem saber qual é o cadastro de lá. ' +
      'O que fazer: no Auvo, procure o cliente pelo nome ou CNPJ e anote o "código interno" e o "código externo"; ' +
      'passe os dois ao Administrador do SGO+, que faz a ligação. Nada foi gravado no Auvo.');
  }
  var auvoId = Auvo_extrairId_(resp);
  if (!auvoId) throw new Error('Auvo não retornou um ID pro ' + rotulo + ' criado.');
  Auvo_gravarMapeamento_(tipo, entidadeId, auvoId, AUVO_CFG.STATUS.OK, '');
  return { ok: true, auvoId: auvoId, acao: 'criado', mensagem: Auvo_mensagemCustomer_(rotulo, 'criado', auvoId) };
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
  // 26/10/2026 (pedido do dono): enviar ao Auvo a correção de UM cliente (buscar e sincronizar) e o
  // cadastro pendente (simular antes; só o que falta lá) também é da gestão, para o Gestor não
  // depender do Administrador depois de corrigir um cadastro. Lote, importação e auditoria seguem só do Administrador.
  var soAdmin = {
    apiListarClientesParaSync: 1, apiListarUsuariosParaSync: 1, apiDefinirEmailUsuario: 1,
    apiSincronizarTecnico: 1, apiSincronizarTodosClientes: 1, apiSincronizarTodosTecnicos: 1,
    apiBuscarTecnicoParaSync: 1,
    apiSimularSincronizacaoReversa: 1, apiIniciarSincronizacaoReversa: 1, apiContinuarSincronizacaoReversa: 1,
    apiStatusSincronizacaoReversa: 1, apiAtivarSincronizacaoDiaria: 1, apiAuditarNomesParecidos: 1
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
