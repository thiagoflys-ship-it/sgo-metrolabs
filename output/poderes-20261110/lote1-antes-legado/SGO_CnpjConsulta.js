/****************************************************
 * CONSULTA ROBUSTA DE CNPJ (servidor) — 2026-10-14
 *
 * MESMO CÓDIGO em todos os projetos Apps Script do SGO+ (Portal e
 * standalones). Ao corrigir aqui, copie o arquivo inteiro para os outros
 * projetos (procure por "SGO_CNPJ_consultarDados_").
 *
 * Motivo: a consulta usava um único provedor público (BrasilAPI), que cai
 * ou devolve HTTP 500 com frequência — o usuário via "BrasilAPI retornou
 * HTTP 500 ao consultar CNPJ.. Preencha manualmente.".
 *
 * Ordem dos provedores (nomes só aqui, em comentário — nunca em texto
 * mostrado ao usuário):
 *   1. BrasilAPI           https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 *   2. ReceitaWS           https://receitaws.com.br/v1/cnpj/{cnpj}
 *        (responde 200 com status "ERROR" quando falha; limite 3/min)
 *   3. CNPJ.ws pública     https://publica.cnpj.ws/cnpj/{cnpj}
 *   4. Minha Receita       https://minhareceita.org/{cnpj}
 * Cada provedor ganha 1 nova tentativa curta em 429/5xx.
 *
 * SGO_CNPJ_consultarDados_(cnpj) devolve SEMPRE o formato da BrasilAPI
 * (razao_social, nome_fantasia, descricao_tipo_de_logradouro, logradouro,
 * numero, complemento, bairro, municipio, uf, cep, ddd_telefone_1,
 * ddd_telefone_2, email, descricao_situacao_cadastral, cnae_fiscal_descricao
 * ...), que é o formato que todos os chamadores já liam — assim cada módulo
 * mantém a própria montagem de endereço sem mudança.
 * Em falha lança Error com mensagem amigável (sem "HTTP 500").
 * Cache de 6 h por CNPJ (CacheService), só para consultas bem-sucedidas.
 ****************************************************/

var SGO_CNPJ_CACHE_SEGUNDOS = 21600;
var SGO_CNPJ_CACHE_PREFIXO = 'SGO_CNPJ_V1_';
var SGO_CNPJ_MSG_FORA_DO_AR = 'Os serviços de consulta de CNPJ estão fora do ar agora. Preencha manualmente ou tente em alguns minutos.';
var SGO_CNPJ_MSG_NAO_ENCONTRADO = 'CNPJ não encontrado. Confira o número ou preencha manualmente.';
var SGO_CNPJ_MSG_NAO_ENCONTRADO_PARCIAL = 'CNPJ não encontrado nas consultas que responderam (parte dos serviços está fora do ar agora). Confira o número, tente em alguns minutos ou preencha manualmente.';
var SGO_CNPJ_MSG_TAMANHO = 'Informe um CNPJ válido com 14 dígitos.';
var SGO_CNPJ_MSG_DIGITO = 'CNPJ inválido: os dígitos verificadores não conferem. Confira o número digitado.';

function SGO_CNPJ_somenteDigitos_(valor) {
  return String(valor == null ? '' : valor).replace(/\D/g, '');
}

function SGO_CNPJ_digitosValidos_(cnpj) {
  cnpj = SGO_CNPJ_somenteDigitos_(cnpj);
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  function dv(tamanho) {
    var pesos = tamanho === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var soma = 0;
    for (var i = 0; i < tamanho; i++) soma += Number(cnpj.charAt(i)) * pesos[i];
    var resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }
  return dv(12) === Number(cnpj.charAt(12)) && dv(13) === Number(cnpj.charAt(13));
}

/**
 * Valida o CNPJ e devolve só os dígitos; lança Error amigável se inválido.
 */
function SGO_CNPJ_validar_(cnpjEntrada) {
  var cnpj = SGO_CNPJ_somenteDigitos_(cnpjEntrada);
  if (cnpj.length !== 14) throw new Error(SGO_CNPJ_MSG_TAMANHO);
  if (!SGO_CNPJ_digitosValidos_(cnpj)) throw new Error(SGO_CNPJ_MSG_DIGITO);
  return cnpj;
}

/**
 * Consulta o CNPJ nas bases públicas (com reserva) e devolve os dados no
 * formato da BrasilAPI. Lança Error com mensagem pronta para o usuário.
 */
function SGO_CNPJ_consultarDados_(cnpjEntrada) {
  var cnpj = SGO_CNPJ_validar_(cnpjEntrada);

  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (eCache) { cache = null; }
  if (cache) {
    try {
      var guardado = cache.get(SGO_CNPJ_CACHE_PREFIXO + cnpj);
      if (guardado) {
        var doCache = JSON.parse(guardado);
        if (doCache && doCache.razao_social) return doCache;
      }
    } catch (eLeitura) { /* cache é só atalho; segue para a consulta */ }
  }

  var provedores = SGO_CNPJ_provedores_();
  var naoEncontrado = 0;
  var foraDoAr = 0;
  for (var i = 0; i < provedores.length; i++) {
    var r = SGO_CNPJ_tentarProvedor_(provedores[i], cnpj);
    if (r.ok) {
      var dados = r.dados;
      dados._fonte = provedores[i].id;
      if (cache) {
        try { cache.put(SGO_CNPJ_CACHE_PREFIXO + cnpj, JSON.stringify(dados), SGO_CNPJ_CACHE_SEGUNDOS); } catch (eGravar) { /* ignora */ }
      }
      return dados;
    }
    if (r.naoEncontrado) naoEncontrado++; else foraDoAr++;
    try { console.log('[CNPJ] provedor ' + provedores[i].id + ' falhou: ' + (r.motivo || '')); } catch (eLog) { /* ignora */ }
  }

  if (naoEncontrado > 0 && foraDoAr === 0) throw new Error(SGO_CNPJ_MSG_NAO_ENCONTRADO);
  if (naoEncontrado > 0) throw new Error(SGO_CNPJ_MSG_NAO_ENCONTRADO_PARCIAL);
  throw new Error(SGO_CNPJ_MSG_FORA_DO_AR);
}

/**
 * Ponto de entrada para o navegador (google.script.run). Nunca lança:
 * devolve { ok:true, dados } ou { ok:false, mensagem }.
 * No Portal exige sessão válida (exigirSessao); nos standalones, onde essa
 * função não existe, o primeiro argumento é ignorado.
 */
function SGO_apiConsultarCnpjDados(sessionId, cnpj) {
  try {
    if (typeof exigirSessao === 'function') exigirSessao(String(sessionId || ''));
    return { ok: true, dados: SGO_CNPJ_consultarDados_(cnpj) };
  } catch (e) {
    return { ok: false, mensagem: SGO_CNPJ_mensagemErro_(e) };
  }
}

function SGO_CNPJ_mensagemErro_(e) {
  var msg = String(e && e.message ? e.message : (e || '')).replace(/^Error:\s*/i, '').trim();
  return msg || SGO_CNPJ_MSG_FORA_DO_AR;
}

function SGO_CNPJ_provedores_() {
  return [
    { id: 'brasilapi', espera429Ms: 1200, espera5xxMs: 600,
      url: function (c) { return 'https://brasilapi.com.br/api/cnpj/v1/' + c; },
      normalizar: SGO_CNPJ_normBrasilApi_ },
    { id: 'receitaws', espera429Ms: 1500, espera5xxMs: 600,
      url: function (c) { return 'https://receitaws.com.br/v1/cnpj/' + c; },
      normalizar: SGO_CNPJ_normReceitaWs_ },
    { id: 'cnpjws', espera429Ms: 1500, espera5xxMs: 600,
      url: function (c) { return 'https://publica.cnpj.ws/cnpj/' + c; },
      normalizar: SGO_CNPJ_normCnpjWs_ },
    { id: 'minhareceita', espera429Ms: 1200, espera5xxMs: 600,
      url: function (c) { return 'https://minhareceita.org/' + c; },
      normalizar: SGO_CNPJ_normBrasilApi_ }
  ];
}

/**
 * Uma consulta a um provedor, com 1 nova tentativa curta em 429/5xx.
 * Devolve { ok:true, dados } | { naoEncontrado:true } | { foraDoAr:true }.
 */
function SGO_CNPJ_tentarProvedor_(prov, cnpj) {
  var motivo = '';
  for (var tentativa = 0; tentativa < 2; tentativa++) {
    var code = 0;
    var body = '';
    try {
      var res = UrlFetchApp.fetch(prov.url(cnpj), {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { Accept: 'application/json' }
      });
      code = res.getResponseCode();
      body = res.getContentText() || '';
    } catch (eRede) {
      // Falha de rede/tempo esgotado: não repete (poderia demorar demais),
      // passa direto para o próximo provedor.
      return { foraDoAr: true, motivo: 'rede: ' + (eRede && eRede.message ? eRede.message : eRede) };
    }

    if (code >= 200 && code < 300) {
      var json = null;
      try { json = JSON.parse(body); } catch (eJson) { json = null; }
      if (!json || typeof json !== 'object') return { foraDoAr: true, motivo: 'resposta não é JSON' };
      var avaliado = prov.normalizar(json, cnpj);
      if (avaliado.ok) return avaliado;
      if (avaliado.naoEncontrado) return { naoEncontrado: true, motivo: avaliado.motivo || 'não encontrado' };
      return { foraDoAr: true, motivo: avaliado.motivo || 'sem dados' };
    }
    if (code === 404) return { naoEncontrado: true, motivo: 'HTTP 404' };
    motivo = 'HTTP ' + code;
    if ((code === 429 || code >= 500) && tentativa === 0) {
      try { Utilities.sleep(code === 429 ? prov.espera429Ms : prov.espera5xxMs); } catch (eSleep) { /* ignora */ }
      continue;
    }
    break;
  }
  return { foraDoAr: true, motivo: motivo };
}

function SGO_CNPJ_txt_(v) {
  if (v == null) return '';
  return String(v).trim();
}

function SGO_CNPJ_canonico_(c, cnpj) {
  return {
    cnpj: SGO_CNPJ_somenteDigitos_(c.cnpj) || cnpj,
    razao_social: SGO_CNPJ_txt_(c.razao_social),
    nome_fantasia: SGO_CNPJ_txt_(c.nome_fantasia),
    descricao_tipo_de_logradouro: SGO_CNPJ_txt_(c.descricao_tipo_de_logradouro),
    logradouro: SGO_CNPJ_txt_(c.logradouro),
    numero: SGO_CNPJ_txt_(c.numero),
    complemento: SGO_CNPJ_txt_(c.complemento),
    bairro: SGO_CNPJ_txt_(c.bairro),
    municipio: SGO_CNPJ_txt_(c.municipio),
    uf: SGO_CNPJ_txt_(c.uf).toUpperCase(),
    cep: SGO_CNPJ_somenteDigitos_(c.cep),
    ddd_telefone_1: SGO_CNPJ_somenteDigitos_(c.ddd_telefone_1),
    ddd_telefone_2: SGO_CNPJ_somenteDigitos_(c.ddd_telefone_2),
    email: SGO_CNPJ_txt_(c.email).toLowerCase(),
    situacao_cadastral: c.situacao_cadastral == null ? '' : c.situacao_cadastral,
    descricao_situacao_cadastral: SGO_CNPJ_txt_(c.descricao_situacao_cadastral).toUpperCase(),
    cnae_fiscal: SGO_CNPJ_somenteDigitos_(c.cnae_fiscal),
    cnae_fiscal_descricao: SGO_CNPJ_txt_(c.cnae_fiscal_descricao),
    natureza_juridica: SGO_CNPJ_txt_(c.natureza_juridica),
    porte: SGO_CNPJ_txt_(c.porte),
    data_inicio_atividade: SGO_CNPJ_txt_(c.data_inicio_atividade)
  };
}

// BrasilAPI e Minha Receita usam o mesmo formato.
function SGO_CNPJ_normBrasilApi_(j, cnpj) {
  if (!j.razao_social) {
    var m = SGO_CNPJ_txt_(j.message || j.mensagem || '');
    if (/n[aã]o encontrad|not found|inv[aá]lid/i.test(m)) return { naoEncontrado: true, motivo: m };
    return { motivo: 'sem razão social' };
  }
  return { ok: true, dados: SGO_CNPJ_canonico_(j, cnpj) };
}

// ReceitaWS: 200 com status "ERROR" quando falha.
function SGO_CNPJ_normReceitaWs_(j, cnpj) {
  if (String(j.status || '').toUpperCase() === 'ERROR' || !j.nome) {
    var m = SGO_CNPJ_txt_(j.message);
    if (/inv[aá]lid|rejeitad|n[aã]o (foi )?encontrad|not found/i.test(m)) return { naoEncontrado: true, motivo: m };
    return { motivo: m || 'status ERROR' };
  }
  var tels = String(j.telefone || '').split('/');
  var ativ = (j.atividade_principal && j.atividade_principal[0]) || {};
  var abertura = SGO_CNPJ_txt_(j.abertura);
  var mData = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(abertura);
  return { ok: true, dados: SGO_CNPJ_canonico_({
    cnpj: j.cnpj,
    razao_social: j.nome,
    nome_fantasia: j.fantasia,
    descricao_tipo_de_logradouro: '',
    logradouro: j.logradouro,
    numero: j.numero,
    complemento: j.complemento,
    bairro: j.bairro,
    municipio: j.municipio,
    uf: j.uf,
    cep: j.cep,
    ddd_telefone_1: tels[0] || '',
    ddd_telefone_2: tels[1] || '',
    email: j.email,
    situacao_cadastral: j.situacao,
    descricao_situacao_cadastral: j.situacao,
    cnae_fiscal: ativ.code,
    cnae_fiscal_descricao: ativ.text,
    natureza_juridica: j.natureza_juridica,
    porte: j.porte,
    data_inicio_atividade: mData ? (mData[3] + '-' + mData[2] + '-' + mData[1]) : abertura
  }, cnpj) };
}

// CNPJ.ws pública: dados do endereço dentro de "estabelecimento".
function SGO_CNPJ_normCnpjWs_(j, cnpj) {
  if (!j.razao_social) return { motivo: SGO_CNPJ_txt_(j.titulo || j.detalhes) || 'sem razão social' };
  var e = j.estabelecimento || {};
  var ativ = e.atividade_principal || {};
  var tel1 = SGO_CNPJ_somenteDigitos_(e.ddd1) + SGO_CNPJ_somenteDigitos_(e.telefone1);
  var tel2 = SGO_CNPJ_somenteDigitos_(e.ddd2) + SGO_CNPJ_somenteDigitos_(e.telefone2);
  return { ok: true, dados: SGO_CNPJ_canonico_({
    cnpj: e.cnpj,
    razao_social: j.razao_social,
    nome_fantasia: e.nome_fantasia,
    descricao_tipo_de_logradouro: e.tipo_logradouro,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    municipio: (e.cidade && e.cidade.nome) || '',
    uf: (e.estado && e.estado.sigla) || '',
    cep: e.cep,
    ddd_telefone_1: tel1,
    ddd_telefone_2: tel2,
    email: e.email,
    situacao_cadastral: e.situacao_cadastral,
    descricao_situacao_cadastral: e.situacao_cadastral,
    cnae_fiscal: ativ.id || ativ.subclasse,
    cnae_fiscal_descricao: ativ.descricao,
    natureza_juridica: j.natureza_juridica && j.natureza_juridica.descricao,
    porte: j.porte && j.porte.descricao,
    data_inicio_atividade: e.data_inicio_atividade
  }, cnpj) };
}
