/****************************************************
 * SGO_AuvoAcervo.js
 * ACERVO DO AUVO — etapa 0 da Assistência técnica (aprovada pelo dono em 21/10/2026)
 *
 * Copia para o servidor do SGO+ tudo o que existe no Auvo, antes de a
 * empresa deixar de usá-lo: o registro completo de cada tarefa (JSON da
 * API, sem cortes), as fotos, as assinaturas e os anexos, e as listas de
 * apoio (usuários, tipos de tarefa, questionários, clientes, equipamentos,
 * equipes). Projeto: docs/PROJETO_ASSISTENCIA_TECNICA_NO_SGO_20261021.md;
 * passo a passo: docs/ACERVO_AUVO.md.
 *
 * Regras:
 *  - Só leitura no Auvo: toda chamada à API é GET (o login do token é o
 *    único POST, feito por Auvo_obterToken_ de SGO_Auvo_Main.js).
 *  - Não mexe nos dados atuais do SGO+ (AUVO_TAREFAS, AUVO_SYNC, cadastros):
 *    o acervo vive em abas próprias (AUVO_ACERVO_*) e na pasta "Acervo Auvo".
 *  - Nunca apaga nem sobrescreve: tarefa que mudou no Auvo ganha uma versão
 *    nova (a anterior fica); arquivo com o mesmo nome e conteúdo diferente
 *    ganha um nome novo.
 *  - Idempotente e retomável: lotes curtos (cabem no limite de tempo), com
 *    marcador de progresso em AUVO_ACERVO_ESTADO; rodar de novo não baixa o
 *    que já foi copiado (confere pela impressão digital sha256).
 *  - Só Administrador e Diretoria veem e operam o acervo. Os arquivos ficam
 *    com compartilhamento privado.
 *
 * Modos:
 *  - CONTAGEM: percorre todas as tarefas, conta por ano/tipo, questionários,
 *    respostas com imagem, assinaturas e anexos, e estima o espaço pelas
 *    imagens de uma amostra (HEAD/Content-Length). Não baixa nada.
 *  - COPIA: CATALOGOS -> TAREFAS -> VERIFICAR (segunda passada) -> ARQUIVOS
 *    -> CONFERENCIA (relê cada arquivo e confere o sha256) -> CONCLUIDO.
 ****************************************************/

var AUVO_ACERVO_CFG = {
  ABA_TAREFAS: 'AUVO_ACERVO_TAREFAS',
  ABA_JSON: 'AUVO_ACERVO_JSON',
  ABA_ARQUIVOS: 'AUVO_ACERVO_ARQUIVOS',
  PROP_ESTADO: 'AUVO_ACERVO_ESTADO',
  PROP_CONTAGEM: 'AUVO_ACERVO_CONTAGEM',
  PROP_RELATORIO: 'AUVO_ACERVO_RELATORIO',
  PROP_PEDIDO: 'AUVO_ACERVO_PEDIDO',
  PROP_TRAVA: 'AUVO_ACERVO_EXECUTANDO',
  PROP_PASTA: 'AUVO_ACERVO_FOLDER_ID',
  NOME_PASTA: 'Acervo Auvo',
  PASTA_CATALOGOS: '_listas_de_apoio',
  PASTA_RELATORIOS: '_relatorios',
  INICIO_PADRAO: '2022-01',
  MESES_A_FRENTE: 1,
  PAGE_SIZE: 100,
  MAX_PAGINAS_MES: 1000,
  MAX_PAGINAS_LISTA: 300,
  // o servidor encerra a chamada em 300 s (LIMITE_SEGUNDOS); o Apps Script em 360 s
  // 22/10/2026: lote mais curto e folga que cobre um download inteiro (o servidor corta cada busca em 60 s);
  // antes um grupo lento passava dos 300 s, o lote morria sem gravar e o vigia voltava ao mesmo arquivo.
  ORCAMENTO_MS: 180000,
  FOLGA_PAGINA_MS: 60000,
  FOLGA_GRUPO_MS: 90000,
  // tempo máximo de uma busca no servidor (servicos/atendente.ts › buscar, 60 s) mais a margem de gravação
  DOWNLOAD_MAX_MS: 65000,
  // tentativa que começou e não terminou (o lote morreu no meio) N vezes: o arquivo vira FALHA e a cópia segue
  MAX_INICIOS_SEM_FIM: 2,
  // limites por lote além do tempo (22/10/2026, memória): quantidade e bytes baixados; teto de bytes do grupo
  // em paralelo; arquivo acima de MAX_MB_ARQUIVO não é baixado (sobe pela propriedade AUVO_ACERVO_MAX_MB)
  LIMITE_ARQUIVOS_LOTE: 400,
  LIMITE_BYTES_LOTE: 250 * 1024 * 1024,
  LIMITE_BYTES_GRUPO: 24 * 1024 * 1024,
  LIMITE_CONFERENCIA_LOTE: 3000,
  MAX_MB_ARQUIVO: 40,
  PROP_MAX_MB: 'AUVO_ACERVO_MAX_MB',
  // o JSON completo fica sempre em tarefa_<id>.json (sha256 na aba de tarefas). Gravar também em trechos na
  // aba AUVO_ACERVO_JSON obriga o servidor a carregar a aba inteira a cada lote; desligado desde 22/10/2026
  // (os trechos já gravados continuam lá).
  GRAVAR_JSON_NA_ABA: false,
  // um pouco acima do limite do servidor (300 s): lote encerrado à força libera a trava logo
  TRAVA_VENCE_MS: 330 * 1000,
  INTERVALO_MIN_MS: 250,
  MAX_TENTATIVAS_API: 6,
  ESPERA_MAX_MS: 60000,
  DOWNLOAD_PARALELO: 6,
  MAX_TENTATIVAS_ARQUIVO: 3,
  ESPERA_REPETIR_MS: 2 * 60 * 1000,
  MAX_RENOVAR_POR_LOTE: 20,
  AMOSTRA_MAX: 300,
  AMOSTRA_POR_TAREFA: 3,
  AMOSTRA_PASSO: 5,
  TRECHO_JSON: 40000,
  CONTINUAR_APOS_MS: 30000,
  VIGIA_APOS_MS: 6 * 60 * 1000,
  MAX_LOTES_COM_ERRO: 5,
  GATILHO: 'AuvoAcervo_loteGatilho',
  PERFIS: ['ADMIN', 'DIRETORIA'],
  LISTAS_APOIO: [
    { nome: 'usuarios', caminho: '/users' },
    { nome: 'tipos_de_tarefa', caminho: '/taskTypes' },
    { nome: 'questionarios', caminho: '/questionnaires' },
    { nome: 'clientes', caminho: '/customers' },
    { nome: 'equipamentos', caminho: '/equipments' },
    { nome: 'equipes', caminho: '/teams' }
  ]
};

var AUVO_ACERVO_COLS = {
  TAREFAS: ['ID', 'AUVO_TASK_ID', 'MES_CONSULTA', 'ANO', 'DATA_TAREFA', 'TIPO_TAREFA', 'CLIENTE_AUVO_ID', 'CLIENTE_NOME',
    'TECNICO_NOME', 'FINALIZADA', 'QTD_QUESTIONARIOS', 'QTD_ARQUIVOS', 'JSON_SHA256', 'JSON_TAMANHO', 'JSON_VERSAO',
    'JSON_ARQUIVO_ID', 'PASTA_ID', 'CONFERENCIA', 'CONFERIDO_EM', 'LIDA_EM', 'ATUALIZADA_EM', 'CRIADO_EM'],
  JSON: ['ID', 'AUVO_TASK_ID', 'VERSAO', 'PARTE', 'TOTAL_PARTES', 'SHA256', 'TRECHO', 'CRIADO_EM'],
  ARQUIVOS: ['ID', 'CHAVE', 'AUVO_TASK_ID', 'ANO', 'TIPO', 'ORIGEM', 'PERGUNTA', 'URL_ORIGINAL', 'URL_ANTERIOR',
    'NOME_ARQUIVO', 'TAMANHO', 'CONTENT_TYPE', 'SHA256', 'ARQUIVO_ID', 'SITUACAO', 'TENTATIVAS', 'MOTIVO', 'RETENTAVEL',
    'ULTIMA_TENTATIVA_EM', 'COPIADO_EM', 'CONFERENCIA', 'CONFERIDO_EM', 'CRIADO_EM', 'ANDAMENTO_EM', 'INICIOS_SEM_FIM', 'TAMANHO_AUVO']
};

var AUVO_ACERVO_FASES_COPIA = ['CATALOGOS', 'TAREFAS', 'VERIFICAR', 'ARQUIVOS', 'CONFERENCIA', 'FIM'];
var AUVO_ACERVO_FASES_CONTAGEM = ['CATALOGOS', 'TAREFAS', 'FIM'];

// relógio da última chamada à API do Auvo nesta execução (ritmo das requisições)
var AUVO_ACERVO_ULTIMA_CHAMADA_ = 0;

/* ============================================================
 * Utilidades
 * ============================================================ */
function AuvoAcervo_agora_() { return new Date().getTime(); }
function AuvoAcervo_iso_() { return new Date().toISOString(); }

function AuvoAcervo_hex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    s += (b < 16 ? '0' : '') + b.toString(16);
  }
  return s;
}

/** sha256 em hexadecimal de um texto (UTF-8) ou de bytes. */
function AuvoAcervo_sha256_(dados) {
  var alg = Utilities.DigestAlgorithm.SHA_256;
  if (typeof dados === 'string') {
    var cs = (Utilities.Charset && Utilities.Charset.UTF_8) || 'UTF-8';
    return AuvoAcervo_hex_(Utilities.computeDigest(alg, dados, cs));
  }
  return AuvoAcervo_hex_(Utilities.computeDigest(alg, dados));
}

function AuvoAcervo_normalizar_(t) {
  return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function AuvoAcervo_txt_(v) { return v === null || v === undefined ? '' : String(v); }

function AuvoAcervo_mesAtual_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM');
}

function AuvoAcervo_mesValido_(m) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || '')); }

function AuvoAcervo_somarMeses_(mes, n) {
  var a = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7)) - 1 + n;
  a += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return a + '-' + (m < 9 ? '0' : '') + (m + 1);
}

function AuvoAcervo_ultimoDia_(mes) {
  return new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
}

function AuvoAcervo_host_(url) {
  var m = /^https?:\/\/([^\/:?#]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : '';
}

/** O token do Auvo só vai para endereços do próprio Auvo (nunca para terceiros). */
function AuvoAcervo_hostDoAuvo_(url) {
  var h = AuvoAcervo_host_(url);
  return h === 'auvo.com.br' || /\.auvo\.com\.br$/.test(h);
}

function AuvoAcervo_cabecalho_(resp, nome) {
  var h = {};
  try { h = resp.getAllHeaders ? resp.getAllHeaders() : resp.getHeaders(); } catch (e) { try { h = resp.getHeaders(); } catch (e2) { h = {}; } }
  var alvo = String(nome).toLowerCase();
  for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k) && String(k).toLowerCase() === alvo) {
    var v = h[k];
    return Array.isArray(v) ? String(v[0]) : String(v);
  }
  return '';
}

/** Endereço sem a parte de assinatura/consulta, para mostrar na tela e no relatório. */
function AuvoAcervo_urlCurta_(url) {
  var u = String(url || '').split('?')[0];
  return u.length > 120 ? u.slice(0, 60) + '...' + u.slice(-50) : u;
}

/* ============================================================
 * Estado, pedido de pausa e trava (propriedades do script)
 * ============================================================ */
function AuvoAcervo_props_() { return PropertiesService.getScriptProperties(); }

function AuvoAcervo_lerJson_(chave, padrao) {
  try {
    var raw = AuvoAcervo_props_().getProperty(chave);
    return raw ? JSON.parse(raw) : padrao;
  } catch (e) { return padrao; }
}

function AuvoAcervo_gravarJson_(chave, valor) {
  AuvoAcervo_props_().setProperty(chave, JSON.stringify(valor));
}

function AuvoAcervo_lerEstado_() {
  return AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_ESTADO, null) || { situacao: 'PARADO' };
}

function AuvoAcervo_gravarEstado_(est) {
  est.atualizadoEm = AuvoAcervo_iso_();
  AuvoAcervo_gravarJson_(AUVO_ACERVO_CFG.PROP_ESTADO, est);
}

function AuvoAcervo_pegarTrava_() {
  var lock = null;
  try { lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return null; } catch (e) { lock = null; }
  try {
    var atual = AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_TRAVA, null);
    if (atual && atual.em && (AuvoAcervo_agora_() - Number(atual.em)) < AUVO_ACERVO_CFG.TRAVA_VENCE_MS) return null;
    var minha = { dono: Utilities.getUuid(), em: AuvoAcervo_agora_() };
    AuvoAcervo_gravarJson_(AUVO_ACERVO_CFG.PROP_TRAVA, minha);
    return minha.dono;
  } finally {
    try { if (lock) lock.releaseLock(); } catch (e) {}
  }
}

function AuvoAcervo_soltarTrava_(dono) {
  var atual = AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_TRAVA, null);
  if (atual && atual.dono === dono) AuvoAcervo_props_().deleteProperty(AUVO_ACERVO_CFG.PROP_TRAVA);
}

function AuvoAcervo_travaOcupada_() {
  var atual = AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_TRAVA, null);
  return !!(atual && atual.em && (AuvoAcervo_agora_() - Number(atual.em)) < AUVO_ACERVO_CFG.TRAVA_VENCE_MS);
}

function AuvoAcervo_pedidoPausa_() {
  return AuvoAcervo_props_().getProperty(AUVO_ACERVO_CFG.PROP_PEDIDO) === 'PAUSAR';
}

/* ============================================================
 * Gatilhos (lotes seguidos até terminar)
 * ============================================================ */
function AuvoAcervo_removerGatilhos_() {
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === AUVO_ACERVO_CFG.GATILHO) ScriptApp.deleteTrigger(t);
    });
  } catch (e) {}
}

function AuvoAcervo_agendar_(ms) {
  AuvoAcervo_removerGatilhos_();
  ScriptApp.newTrigger(AUVO_ACERVO_CFG.GATILHO).timeBased().after(Math.max(1000, ms)).create();
}

/* ============================================================
 * Abas do acervo (planilha do SGO+ no Google; tabela no servidor)
 * ============================================================ */
function AuvoAcervo_aba_(nome, cab) {
  var ss = SGO_DATA.getDB();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, cab.length).setValues([cab]);
    // texto continua texto (sha256 e números da tarefa não viram número nem data)
    try { sh.getRange(1, 1, sh.getMaxRows(), cab.length).setNumberFormat('@'); } catch (e) {}
    try { sh.setFrozenRows(1); } catch (e) {}
    return sh;
  }
  var lc = Math.max(1, sh.getLastColumn());
  var atuais = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
  cab.forEach(function (c) {
    if (atuais.indexOf(c) === -1) { atuais.push(c); sh.getRange(1, atuais.length).setValue(c); }
  });
  return sh;
}

/** Lê a aba inteira: { sh, cab, linhas, indice(campoChave) }. */
function AuvoAcervo_tabela_(nome, cab, campoChave) {
  var sh = AuvoAcervo_aba_(nome, cab);
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var cabs = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var t = { sh: sh, cab: cabs, linhas: [], indice: {}, proxima: Math.max(2, lr + 1), chave: campoChave || '' };
  if (lr >= 2) {
    var vals = sh.getRange(2, 1, lr - 1, lc).getValues();
    for (var i = 0; i < vals.length; i++) {
      var o = { _linha: i + 2 };
      for (var j = 0; j < cabs.length; j++) o[cabs[j]] = vals[i][j];
      t.linhas.push(o);
      if (campoChave && o[campoChave] !== '' && o[campoChave] !== null) t.indice[String(o[campoChave])] = o;
    }
  }
  return t;
}

function AuvoAcervo_linhaValores_(t, o) {
  return t.cab.map(function (h) { var v = o[h]; return v === undefined || v === null ? '' : v; });
}

function AuvoAcervo_inserir_(t, objs) {
  if (!objs.length) return;
  var rows = objs.map(function (o) {
    if (!o.ID) o.ID = Utilities.getUuid();
    if (!o.CRIADO_EM) o.CRIADO_EM = AuvoAcervo_iso_();
    return AuvoAcervo_linhaValores_(t, o);
  });
  t.sh.getRange(t.proxima, 1, rows.length, t.cab.length).setValues(rows);
  objs.forEach(function (o, i) {
    o._linha = t.proxima + i;
    t.linhas.push(o);
    if (t.chave) t.indice[String(o[t.chave])] = o;
  });
  t.proxima += rows.length;
}

/** Acrescenta linhas sem ler a aba (aba de trechos do JSON, que só cresce). */
function AuvoAcervo_acrescentar_(nome, cab, objs) {
  if (!objs.length) return;
  var sh = AuvoAcervo_aba_(nome, cab);
  var lc = sh.getLastColumn();
  var cabs = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var rows = objs.map(function (o) {
    if (!o.ID) o.ID = Utilities.getUuid();
    if (!o.CRIADO_EM) o.CRIADO_EM = AuvoAcervo_iso_();
    return cabs.map(function (h) { var v = o[h]; return v === undefined || v === null ? '' : v; });
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, cabs.length).setValues(rows);
}

function AuvoAcervo_gravarLinha_(t, o) {
  t.sh.getRange(o._linha, 1, 1, t.cab.length).setValues([AuvoAcervo_linhaValores_(t, o)]);
}

/* ============================================================
 * Pastas e arquivos (DriveApp; no servidor, disco + banco)
 * ============================================================ */
function AuvoAcervo_pastaFilha_(pai, nome) {
  var it = pai.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai.createFolder(nome);
}

function AuvoAcervo_pastaRaiz_() {
  var props = AuvoAcervo_props_();
  var id = props.getProperty(AUVO_ACERVO_CFG.PROP_PASTA);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var pasta = AuvoAcervo_pastaFilha_(DriveApp.getRootFolder(), AUVO_ACERVO_CFG.NOME_PASTA);
  props.setProperty(AUVO_ACERVO_CFG.PROP_PASTA, pasta.getId());
  return pasta;
}

/*
 * 22/10/2026 (memória): blob.getBytes() no servidor vira uma lista de números (8 bytes por byte do arquivo) e
 * Utilities.newBlob(lista) copia de novo; com 6 fotos grandes por grupo o processo estourava a memória.
 * No servidor o blob guarda os bytes em _bytes (Uint8Array): o sha256 e o tamanho saem dali sem cópia, e o
 * próprio blob da resposta é gravado. No Google (sem _bytes) segue pelo getBytes().
 */
function AuvoAcervo_shaBlob_(blob) {
  var alvo = blob && blob._bytes ? blob : blob.getBytes();
  return AuvoAcervo_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, alvo));
}

function AuvoAcervo_tamanhoBlob_(blob) {
  if (blob && blob._bytes && typeof blob._bytes.length === 'number') return blob._bytes.length;
  var b = blob.getBytes();
  return b ? b.length : 0;
}

function AuvoAcervo_privado_(arquivo) {
  try { arquivo.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
  return arquivo;
}

/**
 * Grava um arquivo sem nunca sobrescrever: se já existe um arquivo com o mesmo nome e o
 * mesmo sha256, reaproveita (rodada anterior interrompida); se o conteúdo é outro, grava
 * com um nome novo ("_v2", "_v3"...). Devolve { arquivo, nome, reaproveitado }.
 */
function AuvoAcervo_gravarArquivo_(pasta, nome, blob, sha) {
  var ponto = nome.lastIndexOf('.');
  var base = ponto > 0 ? nome.slice(0, ponto) : nome, ext = ponto > 0 ? nome.slice(ponto) : '';
  for (var v = 1; v <= 50; v++) {
    var candidato = v === 1 ? nome : base + '_v' + v + ext;
    var it = pasta.getFilesByName(candidato);
    var igual = null, ocupado = false;
    while (it.hasNext()) {
      var f = it.next();
      if (f.isTrashed && f.isTrashed()) continue;
      ocupado = true;
      try { if (AuvoAcervo_shaBlob_(f.getBlob()) === sha) { igual = f; break; } } catch (e) {}
    }
    if (igual) return { arquivo: igual, nome: candidato, reaproveitado: true };
    if (!ocupado) {
      blob.setName(candidato);
      return { arquivo: AuvoAcervo_privado_(pasta.createFile(blob)), nome: candidato, reaproveitado: false };
    }
  }
  throw new Error('Há versões demais do arquivo ' + nome + ' na pasta da tarefa.');
}

/* ============================================================
 * API do Auvo — SÓ LEITURA (GET)
 * ============================================================ */
function AuvoAcervo_ritmo_() {
  var falta = AUVO_ACERVO_ULTIMA_CHAMADA_ + AUVO_ACERVO_CFG.INTERVALO_MIN_MS - AuvoAcervo_agora_();
  if (falta > 0) Utilities.sleep(falta);
  AUVO_ACERVO_ULTIMA_CHAMADA_ = AuvoAcervo_agora_();
}

/**
 * GET na API do Auvo com o token da integração. Repete em 429 (respeita Retry-After),
 * 5xx e falha de rede; renova o token uma vez em 401/403. 404 devolve { __naoExiste: true }.
 */
function AuvoAcervo_getAuvo_(caminho, prazo) {
  if (!/^\/[A-Za-z]/.test(String(caminho || ''))) throw new Error('Caminho inválido para a API do Auvo: ' + caminho);
  var reautenticou = false, ultimo = '';
  for (var t = 1; t <= AUVO_ACERVO_CFG.MAX_TENTATIVAS_API; t++) {
    AuvoAcervo_ritmo_();
    var token = Auvo_obterToken_();
    var resp = null, cod = 0;
    try {
      resp = UrlFetchApp.fetch(AUVO_CFG.BASE_URL + caminho, {
        method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token }
      });
      cod = resp.getResponseCode();
    } catch (eRede) {
      ultimo = 'falha de rede: ' + (eRede && eRede.message ? eRede.message : eRede);
      cod = 0;
    }
    if (cod >= 200 && cod < 300) {
      var texto = resp.getContentText() || '{}';
      try { return JSON.parse(texto); } catch (eJson) { throw new Error('O Auvo respondeu num formato que não é JSON (' + caminho.split('?')[0] + ').'); }
    }
    if ((cod === 401 || cod === 403) && !reautenticou) { reautenticou = true; Auvo_invalidarTokenCache_(); continue; }
    if (cod === 404) return { __naoExiste: true };
    if (cod === 0 || cod === 408 || cod === 429 || cod >= 500) {
      if (cod) ultimo = 'HTTP ' + cod;
      var espera = Math.min(AUVO_ACERVO_CFG.ESPERA_MAX_MS, 2000 * Math.pow(2, t - 1));
      var ra = resp ? Number(AuvoAcervo_cabecalho_(resp, 'Retry-After')) : NaN;
      if (isFinite(ra) && ra > 0) espera = Math.min(AUVO_ACERVO_CFG.ESPERA_MAX_MS, ra * 1000);
      // com prazo (renovar endereço durante a cópia de arquivos): não espera além do que cabe no lote
      if (prazo && AuvoAcervo_agora_() + espera > prazo) break;
      if (t < AUVO_ACERVO_CFG.MAX_TENTATIVAS_API) Utilities.sleep(espera);
      continue;
    }
    var corpo = {};
    try { corpo = JSON.parse(resp.getContentText()); } catch (e2) {}
    throw new Error(Auvo_interpretarErro_(cod, corpo));
  }
  throw new Error('O Auvo não respondeu depois de ' + AUVO_ACERVO_CFG.MAX_TENTATIVAS_API + ' tentativas (' + ultimo + '). A cópia tenta de novo sozinha na próxima rodada.');
}

function AuvoAcervo_listaDe_(resp) {
  if (!resp || resp.__naoExiste) return [];
  var r = resp.result !== undefined ? resp.result : resp;
  if (Array.isArray(r)) return r;
  if (r && Array.isArray(r.entityList)) return r.entityList;
  return [];
}

function AuvoAcervo_totalDe_(resp) {
  var r = resp && resp.result;
  var p = r && r.pagedSearchReturnData;
  return p && p.totalItems !== undefined && p.totalItems !== null && isFinite(Number(p.totalItems)) ? Number(p.totalItems) : null;
}

/** Uma página das tarefas de um mês (filtro por data da tarefa, do dia 1 ao último dia). */
function AuvoAcervo_paginaTarefas_(mes, pagina) {
  var filtro = JSON.stringify({ startDate: mes + '-01', endDate: mes + '-' + AuvoAcervo_ultimoDia_(mes) });
  var resp = AuvoAcervo_getAuvo_(AUVO_CFG.ENDPOINTS.TASKS + '?page=' + pagina + '&pageSize=' + AUVO_ACERVO_CFG.PAGE_SIZE +
    '&paramFilter=' + encodeURIComponent(filtro));
  return { lista: AuvoAcervo_listaDe_(resp), total: resp && resp.__naoExiste ? 0 : AuvoAcervo_totalDe_(resp), naoExiste: !!(resp && resp.__naoExiste) };
}

/* ============================================================
 * O que há para baixar em cada tarefa
 * ============================================================ */
var AUVO_ACERVO_URL_RE = /https?:\/\/[^\s,;"'<>]+/g;
var AUVO_ACERVO_EXT_ARQUIVO = /\.(jpe?g|png|gif|webp|bmp|heic|heif|tiff?|pdf|mp4|mov|m4a|mp3|ogg|wav|docx?|xlsx?|zip)(\?|#|$)/i;
var AUVO_ACERVO_CHAVE_ARQUIVO = /url|foto|photo|image|imagem|picture|signature|assinatura|attach|anexo|file|arquivo|document/i;

/**
 * Lista os arquivos de uma tarefa: fotos e assinaturas das respostas dos questionários,
 * assinatura da tarefa, anexos e qualquer outro endereço com cara de arquivo. Endereços
 * que não parecem arquivo (páginas) entram como LINK: ficam registrados, sem baixar.
 * taskUrl (o link da tarefa no site do Auvo) não é arquivo.
 */
function AuvoAcervo_extrairArquivos_(tarefa) {
  var achados = [], vistos = {};
  function add(url, tipo, origem, pergunta) {
    url = String(url || '').trim();
    if (!/^https?:\/\//i.test(url) || vistos[url]) return;
    vistos[url] = true;
    achados.push({ url: url, tipo: tipo, origem: origem, pergunta: pergunta || '' });
  }
  (Array.isArray(tarefa.questionnaires) ? tarefa.questionnaires : []).forEach(function (q, qi) {
    (q && Array.isArray(q.answers) ? q.answers : []).forEach(function (a, ai) {
      if (!a || typeof a.reply !== 'string') return;
      var urls = a.reply.match(AUVO_ACERVO_URL_RE) || [];
      var desc = AuvoAcervo_normalizar_(a.questionDescription);
      var tipo = desc.indexOf('ASSINATURA') !== -1 ? 'ASSINATURA_QUESTIONARIO' : 'FOTO';
      urls.forEach(function (u, k) {
        add(u, tipo, 'questionnaires[' + qi + '].answers[' + ai + '].reply' + (k ? '#' + k : ''), AuvoAcervo_txt_(a.questionDescription).slice(0, 200));
      });
    });
  });
  if (typeof tarefa.signatureUrl === 'string') add(tarefa.signatureUrl, 'ASSINATURA_TAREFA', 'signatureUrl', '');
  (function varrer(v, caminho, chave) {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') {
      if (!/^https?:\/\//i.test(v) || caminho === 'taskUrl') return;
      var ehArquivo = AUVO_ACERVO_EXT_ARQUIVO.test(v) || AUVO_ACERVO_CHAVE_ARQUIVO.test(caminho);
      add(v, ehArquivo ? 'ANEXO' : 'LINK', caminho, '');
      return;
    }
    if (Array.isArray(v)) { v.forEach(function (x, i) { varrer(x, caminho + '[' + i + ']', chave); }); return; }
    if (typeof v === 'object') {
      Object.keys(v).forEach(function (k) { varrer(v[k], caminho ? caminho + '.' + k : k, k); });
    }
  })(tarefa, '', '');
  return achados;
}

/** Valor de um caminho como "questionnaires[0].answers[3].reply#1" dentro da tarefa. */
function AuvoAcervo_valorNoCaminho_(obj, origem) {
  var partes = String(origem || '').split('#');
  var idx = partes[1] ? Number(partes[1]) : 0;
  var v = obj;
  var passos = partes[0].replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  for (var i = 0; i < passos.length; i++) { if (v === null || v === undefined) return ''; v = v[passos[i]]; }
  if (typeof v !== 'string') return '';
  var urls = v.match(AUVO_ACERVO_URL_RE) || [];
  return urls[idx] || '';
}

function AuvoAcervo_anoDaTarefa_(tarefa, mesConsulta) {
  var d = String(tarefa.taskDate || tarefa.creationDate || '');
  return /^\d{4}/.test(d) ? d.slice(0, 4) : String(mesConsulta || '').slice(0, 4) || 'sem_data';
}

function AuvoAcervo_idTarefa_(tarefa) {
  var id = tarefa && (tarefa.taskID !== undefined ? tarefa.taskID : tarefa.id);
  return id === undefined || id === null ? '' : String(id);
}

/* ============================================================
 * Início de uma contagem ou de uma cópia
 * ============================================================ */
function AuvoAcervo_novoEstado_(modo, inicio, usuario) {
  var fim = AuvoAcervo_somarMeses_(AuvoAcervo_mesAtual_(), AUVO_ACERVO_CFG.MESES_A_FRENTE);
  var est = {
    modo: modo, situacao: 'RODANDO', fase: 'CATALOGOS',
    inicio: inicio, fim: fim, cursor: { mes: inicio, pagina: 1 }, catalogoIndice: 0,
    meses: {}, iniciadoEm: AuvoAcervo_iso_(), iniciadoPor: usuario || '', rodadas: 0, lotesComErro: 0,
    ultimoErro: '', tarefas: { lidas: 0, novas: 0, novaVersao: 0, semMudanca: 0, semId: 0 },
    arquivos: { registrados: 0 }, catalogos: [], conferenciaCursor: 0, mesesSemResposta: 0
  };
  if (modo === 'CONTAGEM') {
    est.contagem = {
      tarefas: 0, porAno: {}, porTipo: {}, questionarios: {}, respostas: 0, respostasComImagem: 0,
      assinaturasQuestionario: 0, assinaturasTarefa: 0, anexos: 0, links: 0, arquivos: 0,
      tarefasComArquivo: 0, jsonBytes: 0, maiorJson: 0, hosts: {},
      amostra: { n: 0, bytes: 0, semTamanho: 0, falhas: 0 }, catalogos: {}
    };
  }
  return est;
}

function AuvoAcervo_iniciar_(modo, payload, sessao) {
  var atual = AuvoAcervo_lerEstado_();
  if (atual.situacao === 'RODANDO') {
    throw new Error('Já existe uma ' + (atual.modo === 'CONTAGEM' ? 'contagem' : 'cópia') + ' em andamento. Toque em "Pausar" e espere a situação mudar para "Pausada" antes de começar outra.');
  }
  var inicio = String((payload && payload.inicio) || AUVO_ACERVO_CFG.INICIO_PADRAO).slice(0, 7);
  if (!AuvoAcervo_mesValido_(inicio)) throw new Error('Mês inicial inválido: use o formato ano-mês (ex.: 2022-01).');
  if (inicio > AuvoAcervo_mesAtual_()) throw new Error('O mês inicial está no futuro. Escolha um mês até o atual.');
  // confere a conexão antes de agendar (sem chave gravada, para aqui com a mensagem do Auvo)
  Auvo_obterToken_();
  var est = AuvoAcervo_novoEstado_(modo, inicio, sessao && (sessao.nome || sessao.usuario));
  if (modo === 'COPIA') {
    AuvoAcervo_aba_(AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS);
    if (AUVO_ACERVO_CFG.GRAVAR_JSON_NA_ABA) AuvoAcervo_aba_(AUVO_ACERVO_CFG.ABA_JSON, AUVO_ACERVO_COLS.JSON);
    AuvoAcervo_aba_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS);
    AuvoAcervo_pastaRaiz_();
  }
  AuvoAcervo_props_().deleteProperty(AUVO_ACERVO_CFG.PROP_PEDIDO);
  AuvoAcervo_gravarEstado_(est);
  AuvoAcervo_log_(sessao, modo === 'CONTAGEM' ? 'ACERVO_AUVO_CONTAGEM' : 'ACERVO_AUVO_COPIA', 'Início em ' + inicio);
  AuvoAcervo_agendar_(5000);
  return AuvoAcervo_status_();
}

function AuvoAcervo_log_(sessao, acao, detalhe) {
  try { SGO_DATA.log(acao, (sessao && (sessao.usuario || sessao.nome)) || 'SISTEMA', detalhe, 'AUVO'); } catch (e) {}
}

/* ============================================================
 * Lote (chamado pelo gatilho; também pode ser rodado à mão no servidor)
 * ============================================================ */
function AuvoAcervo_loteGatilho(e) {
  return AuvoAcervo_rodarLote_();
}

function AuvoAcervo_rodarLote_(opcoes) {
  opcoes = opcoes || {};
  var est = AuvoAcervo_lerEstado_();
  if (est.situacao !== 'RODANDO') { AuvoAcervo_removerGatilhos_(); return { ok: true, parado: true, situacao: est.situacao }; }
  var dono = AuvoAcervo_pegarTrava_();
  if (!dono) return { ok: false, ocupado: true, message: 'Outro lote do acervo está rodando agora.' };
  var ctx = {
    t0: AuvoAcervo_agora_(), orcamento: opcoes.orcamentoMs || AUVO_ACERVO_CFG.ORCAMENTO_MS, est: est,
    renovados: 0, resumo: { passos: 0 }
  };
  ctx.restante = function () { return ctx.t0 + ctx.orcamento - AuvoAcervo_agora_(); };
  try {
    // vigia: se este lote for interrompido à força, outro começa sozinho depois
    AuvoAcervo_agendar_(AUVO_ACERVO_CFG.VIGIA_APOS_MS);
    est.rodadas = (est.rodadas || 0) + 1;
    var fases = est.modo === 'CONTAGEM' ? AUVO_ACERVO_FASES_CONTAGEM : AUVO_ACERVO_FASES_COPIA;
    while (est.fase !== 'FIM' && est.situacao === 'RODANDO') {
      if (AuvoAcervo_pedidoPausa_()) { est.situacao = 'PAUSADO'; break; }
      var r = AuvoAcervo_passo_(ctx);
      ctx.resumo.passos++;
      AuvoAcervo_gravarEstado_(est);
      if (r === 'FASE_CONCLUIDA') { est.fase = fases[fases.indexOf(est.fase) + 1] || 'FIM'; AuvoAcervo_gravarEstado_(est); continue; }
      if (r === 'SEM_TEMPO' || r === 'AGUARDAR') break;
    }
    if (est.fase === 'FIM' && est.situacao === 'RODANDO') AuvoAcervo_concluir_(ctx);
    est.lotesComErro = 0;
    est.ultimoErro = '';
  } catch (e) {
    est.lotesComErro = (est.lotesComErro || 0) + 1;
    est.ultimoErro = (e && e.message ? e.message : String(e)) + ' (fase ' + est.fase + ', ' + AuvoAcervo_iso_() + ')';
    if (est.lotesComErro >= AUVO_ACERVO_CFG.MAX_LOTES_COM_ERRO) est.situacao = 'ERRO';
  } finally {
    if (AuvoAcervo_pedidoPausa_() && est.situacao === 'RODANDO') est.situacao = 'PAUSADO';
    if (est.situacao !== 'RODANDO') AuvoAcervo_props_().deleteProperty(AUVO_ACERVO_CFG.PROP_PEDIDO);
    est.ultimaRodada = { em: AuvoAcervo_iso_(), ms: AuvoAcervo_agora_() - ctx.t0, passos: ctx.resumo.passos, fase: est.fase };
    AuvoAcervo_gravarEstado_(est);
    if (est.situacao === 'RODANDO') AuvoAcervo_agendar_(AUVO_ACERVO_CFG.CONTINUAR_APOS_MS);
    else AuvoAcervo_removerGatilhos_();
    AuvoAcervo_soltarTrava_(dono);
  }
  return { ok: true, situacao: est.situacao, fase: est.fase, ultimoErro: est.ultimoErro || '' };
}

/** Um passo da fase atual. Devolve 'CONTINUAR', 'FASE_CONCLUIDA', 'SEM_TEMPO' ou 'AGUARDAR'. */
function AuvoAcervo_passo_(ctx) {
  var f = ctx.est.fase;
  if (f === 'CATALOGOS') return AuvoAcervo_passoCatalogo_(ctx);
  if (f === 'TAREFAS' || f === 'VERIFICAR') return AuvoAcervo_passoTarefas_(ctx);
  if (f === 'ARQUIVOS') return AuvoAcervo_passoArquivos_(ctx);
  if (f === 'CONFERENCIA') return AuvoAcervo_passoConferencia_(ctx);
  return 'FASE_CONCLUIDA';
}

/* ---------------- Listas de apoio ---------------- */
function AuvoAcervo_passoCatalogo_(ctx) {
  var est = ctx.est;
  var lista = AUVO_ACERVO_CFG.LISTAS_APOIO;
  if (est.catalogoIndice >= lista.length) return 'FASE_CONCLUIDA';
  if (ctx.restante() < AUVO_ACERVO_CFG.FOLGA_PAGINA_MS) return 'SEM_TEMPO';
  var item = lista[est.catalogoIndice];
  if (est.modo === 'CONTAGEM') {
    var r = AuvoAcervo_getAuvo_(item.caminho + '?page=1&pageSize=1');
    est.contagem.catalogos[item.nome] = r.__naoExiste ? 'não disponível na API' : (AuvoAcervo_totalDe_(r) !== null ? AuvoAcervo_totalDe_(r) : 'sem total informado');
  } else {
    var itens = [], pagina = 1, naoExiste = false, total = null;
    while (pagina <= AUVO_ACERVO_CFG.MAX_PAGINAS_LISTA) {
      var resp = AuvoAcervo_getAuvo_(item.caminho + '?page=' + pagina + '&pageSize=' + AUVO_ACERVO_CFG.PAGE_SIZE);
      if (resp.__naoExiste) { naoExiste = pagina === 1; break; }
      var lote = AuvoAcervo_listaDe_(resp);
      total = AuvoAcervo_totalDe_(resp);
      itens = itens.concat(lote);
      if (!lote.length || lote.length < AUVO_ACERVO_CFG.PAGE_SIZE || (total !== null && itens.length >= total)) break;
      pagina++;
    }
    var reg = { nome: item.nome, caminho: item.caminho, itens: itens.length, totalAuvo: total, em: AuvoAcervo_iso_() };
    if (naoExiste) reg.situacao = 'NAO_DISPONIVEL';
    else {
      // sem a hora da leitura no conteúdo: a mesma lista no mesmo dia não gera outro arquivo
      var json = JSON.stringify({ origem: AUVO_CFG.BASE_URL + item.caminho, totalAuvo: total, itens: itens });
      reg.sha256 = AuvoAcervo_sha256_(json);
      var pasta = AuvoAcervo_pastaFilha_(AuvoAcervo_pastaRaiz_(), AUVO_ACERVO_CFG.PASTA_CATALOGOS);
      var nome = item.nome + '_' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd') + '.json';
      var g = AuvoAcervo_gravarArquivo_(pasta, nome, Utilities.newBlob(json, 'application/json', nome), reg.sha256);
      reg.arquivoId = g.arquivo.getId();
      reg.arquivoNome = g.nome;
      reg.situacao = 'COPIADO';
    }
    est.catalogos = (est.catalogos || []).filter(function (c) { return c.nome !== item.nome; }).concat([reg]);
  }
  est.catalogoIndice++;
  return 'CONTINUAR';
}

/* ---------------- Tarefas (contagem e cópia) ---------------- */
function AuvoAcervo_passoTarefas_(ctx) {
  var est = ctx.est;
  var c = est.cursor;
  if (!c || !c.mes || c.mes > est.fim) return AuvoAcervo_fimDaVarredura_(ctx);
  if (ctx.restante() < AUVO_ACERVO_CFG.FOLGA_PAGINA_MS) return 'SEM_TEMPO';
  var pg = AuvoAcervo_paginaTarefas_(c.mes, c.pagina);
  if (pg.naoExiste) est.mesesSemResposta = (est.mesesSemResposta || 0) + 1;
  var m = est.meses[c.mes] || (est.meses[c.mes] = { auvo: 0, lidas: 0 });
  if (c.pagina === 1) { m.auvo = pg.total !== null ? pg.total : 0; m.lidas = 0; m.semTotal = pg.total === null; }
  if (pg.total === null) m.auvo = Math.max(m.auvo, m.lidas + pg.lista.length);
  if (est.modo === 'CONTAGEM') AuvoAcervo_contarPagina_(ctx, pg.lista, c.mes);
  else AuvoAcervo_copiarPagina_(ctx, pg.lista, c.mes);
  m.lidas += pg.lista.length;
  var acabouMes = !pg.lista.length || pg.lista.length < AUVO_ACERVO_CFG.PAGE_SIZE ||
    (pg.total !== null && c.pagina * AUVO_ACERVO_CFG.PAGE_SIZE >= pg.total) || c.pagina >= AUVO_ACERVO_CFG.MAX_PAGINAS_MES;
  if (acabouMes) est.cursor = { mes: AuvoAcervo_somarMeses_(c.mes, 1), pagina: 1 };
  else est.cursor = { mes: c.mes, pagina: c.pagina + 1 };
  return 'CONTINUAR';
}

function AuvoAcervo_fimDaVarredura_(ctx) {
  var est = ctx.est;
  // a cópia faz uma segunda passada (VERIFICAR) para pegar tarefa que entrou ou mudou durante a primeira
  est.cursor = { mes: est.inicio, pagina: 1 };
  if (est.modo === 'COPIA' && est.fase === 'TAREFAS') {
    est.primeiraPassada = est.tarefas;
    est.tarefas = { lidas: 0, novas: 0, novaVersao: 0, semMudanca: 0, semId: 0 };
  }
  return 'FASE_CONCLUIDA';
}

function AuvoAcervo_contarPagina_(ctx, lista, mes) {
  var k = ctx.est.contagem;
  var amostra = [];
  lista.forEach(function (tarefa) {
    var id = AuvoAcervo_idTarefa_(tarefa);
    if (!id) { ctx.est.tarefas.semId++; return; }
    k.tarefas++;
    ctx.est.tarefas.lidas++;
    var ano = AuvoAcervo_anoDaTarefa_(tarefa, mes);
    k.porAno[ano] = (k.porAno[ano] || 0) + 1;
    var tipo = AuvoAcervo_txt_(tarefa.taskTypeDescription) || ('Tipo ' + AuvoAcervo_txt_(tarefa.taskType || 'sem tipo'));
    k.porTipo[tipo] = (k.porTipo[tipo] || 0) + 1;
    var json = JSON.stringify(tarefa);
    k.jsonBytes += json.length;
    k.maiorJson = Math.max(k.maiorJson, json.length);
    (Array.isArray(tarefa.questionnaires) ? tarefa.questionnaires : []).forEach(function (q) {
      var qid = AuvoAcervo_txt_(q && (q.questionnaireId !== undefined ? q.questionnaireId : q.id)) || AuvoAcervo_txt_(q && q.questionnaireDescription) || '?';
      var reg = k.questionarios[qid] || (k.questionarios[qid] = { nome: AuvoAcervo_txt_(q && (q.questionnaireDescription || q.description)).slice(0, 80), tarefas: 0 });
      reg.tarefas++;
      k.respostas += (q && Array.isArray(q.answers) ? q.answers.length : 0);
    });
    var arqs = AuvoAcervo_extrairArquivos_(tarefa);
    var temArquivo = false, respostasImg = {};
    arqs.forEach(function (a) {
      if (a.tipo === 'LINK') { k.links++; return; }
      temArquivo = true;
      k.arquivos++;
      if (a.tipo === 'ASSINATURA_TAREFA') k.assinaturasTarefa++;
      else if (a.tipo === 'ASSINATURA_QUESTIONARIO') k.assinaturasQuestionario++;
      else if (a.tipo === 'ANEXO') k.anexos++;
      if (a.tipo === 'FOTO') respostasImg[a.origem.split('#')[0]] = true;
      var h = AuvoAcervo_host_(a.url);
      k.hosts[h] = (k.hosts[h] || 0) + 1;
    });
    k.respostasComImagem += Object.keys(respostasImg).length;
    if (temArquivo) k.tarefasComArquivo++;
    if (k.amostra.n + amostra.length < AUVO_ACERVO_CFG.AMOSTRA_MAX && (k.tarefas % AUVO_ACERVO_CFG.AMOSTRA_PASSO) === 1) {
      arqs.filter(function (a) { return a.tipo !== 'LINK'; }).slice(0, AUVO_ACERVO_CFG.AMOSTRA_POR_TAREFA).forEach(function (a) { amostra.push(a.url); });
    }
  });
  if (amostra.length) AuvoAcervo_medirAmostra_(k.amostra, amostra);
}

/** Tamanho de uma amostra de imagens: HEAD (Content-Length); sem o cabeçalho, GET e conta os bytes. */
function AuvoAcervo_medirAmostra_(am, urls) {
  for (var i = 0; i < urls.length; i += AUVO_ACERVO_CFG.DOWNLOAD_PARALELO) {
    var grupo = urls.slice(i, i + AUVO_ACERVO_CFG.DOWNLOAD_PARALELO);
    var resps = AuvoAcervo_buscarVarios_(grupo.map(function (u) { return { url: u, metodo: 'head' }; }));
    resps.forEach(function (r, j) {
      if (!r.resp || r.cod < 200 || r.cod >= 300) {
        var g = AuvoAcervo_buscarVarios_([{ url: grupo[j], metodo: 'get' }])[0];
        if (g.resp && g.cod >= 200 && g.cod < 300) { am.n++; am.bytes += AuvoAcervo_tamanhoBlob_(g.resp.getBlob()); }
        else am.falhas++;
        return;
      }
      var len = Number(AuvoAcervo_cabecalho_(r.resp, 'Content-Length'));
      if (isFinite(len) && len > 0) { am.n++; am.bytes += len; return; }
      var g2 = AuvoAcervo_buscarVarios_([{ url: grupo[j], metodo: 'get' }])[0];
      if (g2.resp && g2.cod >= 200 && g2.cod < 300) { am.n++; am.bytes += AuvoAcervo_tamanhoBlob_(g2.resp.getBlob()); }
      else am.semTamanho++;
    });
  }
}

/** Busca vários endereços de arquivo em paralelo (só GET/HEAD). Nunca lança: devolve { resp, cod, erro }. */
function AuvoAcervo_buscarVarios_(pedidos, prazo) {
  var token = null;
  var reqs = pedidos.map(function (p) {
    var r = { url: p.url, method: p.metodo === 'head' ? 'head' : 'get', muteHttpExceptions: true, followRedirects: true };
    if (AuvoAcervo_hostDoAuvo_(p.url)) {
      if (token === null) { try { token = Auvo_obterToken_(); } catch (e) { token = ''; } }
      if (token) r.headers = { Authorization: 'Bearer ' + token };
    }
    return r;
  });
  var saida;
  try {
    var resps = UrlFetchApp.fetchAll(reqs);
    saida = [];
    for (var i = 0; i < reqs.length; i++) saida.push({ resp: resps[i], cod: resps[i].getResponseCode(), erro: '' });
  } catch (eTodos) {
    // um da lista falhou (ou estourou o tempo): busca um a um, só enquanto couber no lote
    saida = reqs.map(function (r) {
      if (prazo && AuvoAcervo_agora_() + AUVO_ACERVO_CFG.DOWNLOAD_MAX_MS > prazo) return { resp: null, cod: -1, erro: 'adiado para o próximo lote' };
      try {
        var x = UrlFetchApp.fetch(r.url, r);
        return { resp: x, cod: x.getResponseCode(), erro: '' };
      } catch (e) {
        return { resp: null, cod: 0, erro: 'falha de rede: ' + (e && e.message ? e.message : e) };
      }
    });
  }
  return saida;
}

/** Cópia: grava o registro completo de cada tarefa da página e registra os arquivos a baixar. */
function AuvoAcervo_copiarPagina_(ctx, lista, mes) {
  if (!ctx.tTarefas) ctx.tTarefas = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS, 'AUVO_TASK_ID');
  if (!ctx.tArquivos) ctx.tArquivos = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'CHAVE');
  var est = ctx.est, tT = ctx.tTarefas, tA = ctx.tArquivos;
  var novasTarefas = [], atualizar = [], partes = [], novosArquivos = [], arquivosAtualizados = [], vistosNaPagina = {};
  var agora = AuvoAcervo_iso_();
  lista.forEach(function (tarefa) {
    var id = AuvoAcervo_idTarefa_(tarefa);
    if (!id) { est.tarefas.semId++; return; }
    if (vistosNaPagina[id]) return;
    vistosNaPagina[id] = true;
    est.tarefas.lidas++;
    var json = JSON.stringify(tarefa);
    var sha = AuvoAcervo_sha256_(json);
    var linha = tT.indice[id];
    if (linha && String(linha.JSON_SHA256) === sha) {
      est.tarefas.semMudanca++;
      if (String(linha.MES_CONSULTA) !== mes) { linha.MES_CONSULTA = mes; AuvoAcervo_gravarLinha_(tT, linha); }
      return;
    }
    var versao = linha ? (Number(linha.JSON_VERSAO) || 1) + 1 : 1;
    var ano = AuvoAcervo_anoDaTarefa_(tarefa, mes);
    if (!ctx.pastasAno) ctx.pastasAno = {};
    if (!ctx.pastasAno[ano]) ctx.pastasAno[ano] = AuvoAcervo_pastaFilha_(AuvoAcervo_pastaRaiz_(), ano);
    var pasta = null;
    if (linha && linha.PASTA_ID) { try { pasta = DriveApp.getFolderById(String(linha.PASTA_ID)); } catch (e) { pasta = null; } }
    if (!pasta) pasta = AuvoAcervo_pastaFilha_(ctx.pastasAno[ano], id);
    var nomeJson = 'tarefa_' + id + (versao > 1 ? '_versao' + versao : '') + '.json';
    var g = AuvoAcervo_gravarArquivo_(pasta, nomeJson, Utilities.newBlob(json, 'application/json', nomeJson), sha);
    var total = Math.max(1, Math.ceil(json.length / AUVO_ACERVO_CFG.TRECHO_JSON));
    for (var p = 0; AUVO_ACERVO_CFG.GRAVAR_JSON_NA_ABA && p < total; p++) {
      partes.push({ AUVO_TASK_ID: id, VERSAO: versao, PARTE: p + 1, TOTAL_PARTES: total, SHA256: sha,
        TRECHO: json.slice(p * AUVO_ACERVO_CFG.TRECHO_JSON, (p + 1) * AUVO_ACERVO_CFG.TRECHO_JSON) });
    }
    var arqs = AuvoAcervo_extrairArquivos_(tarefa);
    var dados = {
      AUVO_TASK_ID: id, MES_CONSULTA: mes, ANO: ano, DATA_TAREFA: AuvoAcervo_txt_(tarefa.taskDate),
      TIPO_TAREFA: AuvoAcervo_txt_(tarefa.taskTypeDescription), CLIENTE_AUVO_ID: AuvoAcervo_txt_(tarefa.customerId),
      CLIENTE_NOME: AuvoAcervo_txt_(tarefa.customerDescription), TECNICO_NOME: AuvoAcervo_txt_(tarefa.userToName),
      FINALIZADA: tarefa.finished ? 'SIM' : 'NAO',
      QTD_QUESTIONARIOS: Array.isArray(tarefa.questionnaires) ? tarefa.questionnaires.length : 0,
      QTD_ARQUIVOS: arqs.filter(function (a) { return a.tipo !== 'LINK'; }).length,
      JSON_SHA256: sha, JSON_TAMANHO: json.length, JSON_VERSAO: versao, JSON_ARQUIVO_ID: g.arquivo.getId(),
      PASTA_ID: pasta.getId(), CONFERENCIA: '', CONFERIDO_EM: '', ATUALIZADA_EM: agora
    };
    if (linha) {
      // a versão anterior do JSON continua na aba de trechos e na pasta; aqui só aponta para a atual
      atualizar.push({ linha: linha, dados: dados });
      est.tarefas.novaVersao++;
    } else {
      dados.LIDA_EM = agora;
      novasTarefas.push(dados);
      est.tarefas.novas++;
    }
    arqs.forEach(function (a) {
      var chave = id + '|' + a.origem;
      var existente = tA.indice[chave];
      if (existente) {
        if (String(existente.URL_ORIGINAL) === a.url) return;
        if (String(existente.SITUACAO) !== 'COPIADO') {
          // ainda não baixado: passa a usar o endereço novo (o anterior fica registrado)
          existente.URL_ANTERIOR = existente.URL_ORIGINAL;
          existente.URL_ORIGINAL = a.url;
          arquivosAtualizados.push(existente);
          return;
        }
        chave = id + '|' + a.origem + '|versao' + versao;
        if (tA.indice[chave]) return;
      }
      var reg = {
        CHAVE: chave, AUVO_TASK_ID: id, ANO: ano, TIPO: a.tipo, ORIGEM: a.origem, PERGUNTA: a.pergunta,
        URL_ORIGINAL: a.url, SITUACAO: a.tipo === 'LINK' ? 'LINK' : 'PENDENTE', TENTATIVAS: 0
      };
      novosArquivos.push(reg);
      tA.indice[chave] = reg;
      est.arquivos.registrados++;
    });
  });
  // ordem de gravação: trechos do JSON, arquivos e, por último, a linha da tarefa (o "feito").
  // Se o lote parar no meio, a tarefa sem linha é refeita na próxima rodada sem duplicar arquivo.
  if (AUVO_ACERVO_CFG.GRAVAR_JSON_NA_ABA) AuvoAcervo_acrescentar_(AUVO_ACERVO_CFG.ABA_JSON, AUVO_ACERVO_COLS.JSON, partes);
  AuvoAcervo_inserir_(tA, novosArquivos);
  arquivosAtualizados.forEach(function (r) { AuvoAcervo_gravarLinha_(tA, r); });
  AuvoAcervo_inserir_(tT, novasTarefas);
  atualizar.forEach(function (u) {
    Object.keys(u.dados).forEach(function (k) { u.linha[k] = u.dados[k]; });
    AuvoAcervo_gravarLinha_(tT, u.linha);
  });
}

/* ---------------- Arquivos (fotos, assinaturas, anexos) ---------------- */
var AUVO_ACERVO_EXT_POR_TIPO = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp',
  'image/heic': 'heic', 'image/heif': 'heif', 'image/tiff': 'tif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'application/zip': 'zip'
};

function AuvoAcervo_extensao_(contentType, url) {
  var t = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (AUVO_ACERVO_EXT_POR_TIPO[t]) return AUVO_ACERVO_EXT_POR_TIPO[t];
  var m = /\.([a-z0-9]{2,5})(\?|#|$)/i.exec(String(url || '').split('?')[0]);
  return m ? m[1].toLowerCase() : 'bin';
}

function AuvoAcervo_nomeArquivo_(reg, ext) {
  var curto = { FOTO: 'foto', ASSINATURA_QUESTIONARIO: 'assinatura_questionario', ASSINATURA_TAREFA: 'assinatura_tarefa', ANEXO: 'anexo' }[reg.TIPO] || 'arquivo';
  var origem = String(reg.ORIGEM || '')
    .replace(/questionnaires\[(\d+)\]\.answers\[(\d+)\]\.reply/, function (_, q, a) { return 'q' + (Number(q) + 1) + '_r' + (Number(a) + 1); })
    .replace(/#(\d+)/, function (_, n) { return '_' + (Number(n) + 1); })
    .replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  var sufixo = /\|versao(\d+)$/.exec(String(reg.CHAVE || ''));
  return reg.AUVO_TASK_ID + '_' + curto + (origem && reg.TIPO !== 'ASSINATURA_TAREFA' ? '_' + origem : '') + (sufixo ? '_versao' + sufixo[1] : '') + '.' + ext;
}

function AuvoAcervo_retentavelHttp_(cod) {
  return cod === 0 || cod === 401 || cod === 403 || cod === 408 || cod === 425 || cod === 429 || cod >= 500;
}

/** Endereço vencido (401/403): relê a tarefa no Auvo e usa o endereço atual do mesmo ponto. */
function AuvoAcervo_renovarEndereco_(ctx, reg, prazo) {
  if (ctx.renovados >= AUVO_ACERVO_CFG.MAX_RENOVAR_POR_LOTE) return;
  ctx.renovados++;
  try {
    var r = AuvoAcervo_getAuvo_(AUVO_CFG.ENDPOINTS.TASKS + '/' + encodeURIComponent(String(reg.AUVO_TASK_ID)), prazo || 0);
    if (r.__naoExiste) return;
    var tarefa = r.result && !Array.isArray(r.result) ? r.result : r;
    var novo = reg.ORIGEM === 'signatureUrl' ? AuvoAcervo_txt_(tarefa.signatureUrl) : AuvoAcervo_valorNoCaminho_(tarefa, reg.ORIGEM);
    if (novo && novo !== String(reg.URL_ORIGINAL)) { reg.URL_ANTERIOR = reg.URL_ORIGINAL; reg.URL_ORIGINAL = novo; }
  } catch (e) { /* segue com o endereço que já tem */ }
}

/*
 * 22/10/2026 — cópia dos arquivos sem acumular memória (o lote derrubava o servidor: "heap out of memory").
 *  - A aba de arquivos é lida uma vez por lote e só as linhas da fila do lote viram objeto; as outras só contam.
 *  - Antes de baixar, HEAD diz o tamanho: arquivo acima do limite não é baixado (FALHA com o motivo; o limite
 *    sobe pela propriedade AUVO_ACERVO_MAX_MB); o grupo em paralelo respeita um teto de bytes; tamanho
 *    desconhecido vai sozinho.
 *  - O lote para por tempo, por quantidade de arquivos e por bytes baixados (o próximo lote começa limpo).
 *  - Cada arquivo é marcado (ANDAMENTO_EM) antes de baixar e gravado assim que termina; tentativa que não
 *    terminou duas vezes vira FALHA "download não concluiu" e a cópia segue.
 */
function AuvoAcervo_maxBytesArquivo_() {
  var mb = Number(AuvoAcervo_props_().getProperty(AUVO_ACERVO_CFG.PROP_MAX_MB));
  return (isFinite(mb) && mb > 0 ? mb : AUVO_ACERVO_CFG.MAX_MB_ARQUIVO) * 1024 * 1024;
}

function AuvoAcervo_contaDe_(s) {
  return s === 'COPIADO' ? 'copiados' : s === 'FALHA' ? 'falhas' : s === 'LINK' ? 'links' : 'pendentes';
}

/** Muda a situação de um arquivo mantendo a contagem do lote em dia. */
function AuvoAcervo_mudarSituacao_(ctx, reg, nova) {
  var antes = String(reg.SITUACAO || 'PENDENTE');
  if (antes !== nova && ctx.k) { ctx.k[AuvoAcervo_contaDe_(antes)]--; ctx.k[AuvoAcervo_contaDe_(nova)]++; }
  reg.SITUACAO = nova;
}

function AuvoAcervo_cabecalhoAba_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
}

/** Lê a aba de arquivos uma vez: contagem por situação e a fila do lote (no máximo LIMITE_ARQUIVOS_LOTE objetos). */
function AuvoAcervo_lerFilaArquivos_(ctx) {
  var C = AUVO_ACERVO_CFG;
  var sh = AuvoAcervo_aba_(C.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS);
  var cab = AuvoAcervo_cabecalhoAba_(sh), col = {};
  cab.forEach(function (h, i) { col[h] = i; });
  var k = { esperados: 0, copiados: 0, pendentes: 0, falhas: 0, links: 0, bytes: 0 };
  var fila = [], aguardando = 0, agora = AuvoAcervo_agora_();
  var lr = sh.getLastRow();
  if (lr >= 2) {
    var vals = sh.getRange(2, 1, lr - 1, cab.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i], s = String(v[col.SITUACAO]);
      if (s === 'LINK') { k.links++; continue; }
      k.esperados++;
      k[AuvoAcervo_contaDe_(s)]++;
      if (s === 'COPIADO') { k.bytes += Number(v[col.TAMANHO] || 0); continue; }
      var entra = s === 'PENDENTE' || s === '';
      if (s === 'FALHA' && String(v[col.RETENTAVEL]) === 'SIM' && Number(v[col.TENTATIVAS] || 0) < C.MAX_TENTATIVAS_ARQUIVO) {
        var ult = Date.parse(String(v[col.ULTIMA_TENTATIVA_EM] || '')) || 0;
        if (agora - ult >= C.ESPERA_REPETIR_MS) entra = true; else aguardando++;
      }
      if (!entra || fila.length >= C.LIMITE_ARQUIVOS_LOTE) continue;
      var o = { _linha: i + 2 };
      for (var j = 0; j < cab.length; j++) o[cab[j]] = v[j];
      fila.push(o);
    }
    vals = null;
  }
  ctx.tA = { sh: sh, cab: cab, linhas: [], indice: {}, chave: '' };
  ctx.k = k;
  var normais = [], sozinhos = [];
  fila.forEach(function (r) {
    var interrompido = !!r.ANDAMENTO_EM;
    if (!AuvoAcervo_tratarInterrompido_(ctx, r)) return;
    if (interrompido || Number(r.INICIOS_SEM_FIM || 0) > 0) { r._sozinho = true; sozinhos.push(r); } else normais.push(r);
  });
  ctx.filaArquivos = normais.concat(sozinhos);
  ctx.aguardando = aguardando;
  ctx.filaLidas = (ctx.filaLidas || 0) + 1;
}

/** Só AUVO_TASK_ID -> PASTA_ID da aba de tarefas (sem montar objetos das linhas). */
function AuvoAcervo_pastasTarefas_(ctx) {
  if (ctx.pastasTarefa) return ctx.pastasTarefa;
  var sh = AuvoAcervo_aba_(AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS);
  var cab = AuvoAcervo_cabecalhoAba_(sh), iId = cab.indexOf('AUVO_TASK_ID'), iP = cab.indexOf('PASTA_ID');
  var mapa = {}, lr = sh.getLastRow();
  if (lr >= 2) {
    var vals = sh.getRange(2, 1, lr - 1, cab.length).getValues();
    for (var i = 0; i < vals.length; i++) mapa[String(vals[i][iId])] = String(vals[i][iP] || '');
  }
  ctx.pastasTarefa = mapa;
  return mapa;
}

/**
 * Tentativa que começou e não terminou (ANDAMENTO_EM preenchido: o lote foi encerrado no meio do download).
 * Conta mais uma; no limite vira FALHA "download não concluiu" e sai da fila; antes disso vai sozinha, no fim
 * da fila, para não levar junto os outros arquivos do grupo. Devolve true se o arquivo continua na fila.
 */
function AuvoAcervo_tratarInterrompido_(ctx, reg) {
  if (!reg.ANDAMENTO_EM) return true;
  reg.INICIOS_SEM_FIM = Number(reg.INICIOS_SEM_FIM || 0) + 1;
  reg.ULTIMA_TENTATIVA_EM = String(reg.ANDAMENTO_EM);
  reg.ANDAMENTO_EM = '';
  if (reg.INICIOS_SEM_FIM >= AUVO_ACERVO_CFG.MAX_INICIOS_SEM_FIM) {
    AuvoAcervo_mudarSituacao_(ctx, reg, 'FALHA');
    reg.RETENTAVEL = 'NAO';
    reg.MOTIVO = 'download não concluiu (o lote foi encerrado ' + reg.INICIOS_SEM_FIM + ' vezes durante a cópia deste arquivo)';
    AuvoAcervo_gravarLinha_(ctx.tA, reg);
    return false;
  }
  AuvoAcervo_gravarLinha_(ctx.tA, reg);
  return true;
}

function AuvoAcervo_publicarContagem_(ctx) {
  if (!ctx.k) return;
  var k = ctx.k;
  ctx.est.arquivos = { esperados: k.esperados, copiados: k.copiados, pendentes: k.pendentes, falhas: k.falhas, links: k.links,
    bytes: k.bytes, registrados: (ctx.est.arquivos && ctx.est.arquivos.registrados) || 0 };
}

function AuvoAcervo_mb_(b) { return Math.round(Number(b || 0) / 104857.6) / 10; }

function AuvoAcervo_falhaGrande_(ctx, reg, bytes, max) {
  AuvoAcervo_mudarSituacao_(ctx, reg, 'FALHA');
  reg.RETENTAVEL = 'NAO';
  reg.MOTIVO = 'arquivo grande (' + String(AuvoAcervo_mb_(bytes)).replace('.', ',') + ' MB), acima do limite de ' +
    String(AuvoAcervo_mb_(max)).replace('.', ',') + ' MB por arquivo: não baixado (ver docs/ACERVO_AUVO.md)';
  reg.ULTIMA_TENTATIVA_EM = AuvoAcervo_iso_();
  reg.ANDAMENTO_EM = '';
  AuvoAcervo_gravarLinha_(ctx.tA, reg);
}

function AuvoAcervo_passoArquivos_(ctx) {
  var C = AUVO_ACERVO_CFG;
  if (!ctx.arquivosLote) { ctx.arquivosLote = 0; ctx.bytesLote = 0; }
  if (ctx.arquivosLote >= C.LIMITE_ARQUIVOS_LOTE || ctx.bytesLote >= C.LIMITE_BYTES_LOTE) { AuvoAcervo_publicarContagem_(ctx); return 'SEM_TEMPO'; }
  if (!ctx.filaArquivos || !ctx.filaArquivos.length) {
    // fila vazia: relê (as falhas deste lote voltam depois da espera, até o limite de tentativas)
    if (ctx.filaLidas >= 2) { AuvoAcervo_publicarContagem_(ctx); return 'SEM_TEMPO'; }
    AuvoAcervo_lerFilaArquivos_(ctx);
    if (!ctx.filaArquivos.length) {
      AuvoAcervo_publicarContagem_(ctx);
      return ctx.aguardando ? 'AGUARDAR' : 'FASE_CONCLUIDA';
    }
  }
  if (ctx.restante() < C.FOLGA_GRUPO_MS) { AuvoAcervo_publicarContagem_(ctx); return 'SEM_TEMPO'; }
  var prazo = ctx.t0 + ctx.orcamento, maxArq = AuvoAcervo_maxBytesArquivo_();
  var grupo = [];
  if (ctx.filaArquivos[0]._sozinho) grupo = ctx.filaArquivos.splice(0, 1);
  else while (grupo.length < C.DOWNLOAD_PARALELO && ctx.filaArquivos.length && !ctx.filaArquivos[0]._sozinho) grupo.push(ctx.filaArquivos.shift());

  // tamanho antes de baixar (HEAD); o resultado fica na linha para não perguntar de novo
  var semTam = grupo.filter(function (r) { return !(Number(r.TAMANHO_AUVO) > 0) && !r._headFeito; });
  if (semTam.length) {
    var hs = AuvoAcervo_buscarVarios_(semTam.map(function (r) { return { url: String(r.URL_ORIGINAL), metodo: 'head' }; }), prazo);
    semTam.forEach(function (r, i) {
      r._headFeito = true;
      var h = hs[i];
      if (h && h.resp && h.cod >= 200 && h.cod < 300) {
        var len = Number(AuvoAcervo_cabecalho_(h.resp, 'Content-Length'));
        if (isFinite(len) && len > 0) r.TAMANHO_AUVO = len;
      }
      hs[i] = null;
    });
    hs = null;
  }
  grupo = grupo.filter(function (r) {
    if (Number(r.TAMANHO_AUVO) > maxArq) { AuvoAcervo_falhaGrande_(ctx, r, Number(r.TAMANHO_AUVO), maxArq); return false; }
    return true;
  });
  // tamanho desconhecido num grupo de vários: vai sozinho depois
  if (grupo.length > 1) {
    var desconhecidos = grupo.filter(function (r) { return !(Number(r.TAMANHO_AUVO) > 0); });
    if (desconhecidos.length) {
      desconhecidos.forEach(function (r) { r._sozinho = true; ctx.filaArquivos.push(r); });
      grupo = grupo.filter(function (r) { return Number(r.TAMANHO_AUVO) > 0; });
    }
  }
  // teto de bytes do grupo em paralelo (o que não cabe volta para a frente da fila)
  var soma = 0, cabem = [], sobra = [];
  grupo.forEach(function (r) {
    var t = Number(r.TAMANHO_AUVO) || 0;
    if (!cabem.length || soma + t <= C.LIMITE_BYTES_GRUPO) { cabem.push(r); soma += t; } else sobra.push(r);
  });
  if (sobra.length) ctx.filaArquivos = sobra.concat(ctx.filaArquivos);
  grupo = cabem;
  if (!grupo.length) { AuvoAcervo_publicarContagem_(ctx); return 'CONTINUAR'; }

  grupo.forEach(function (reg) {
    if (/HTTP 40[13]/.test(String(reg.MOTIVO || '')) && ctx.restante() > C.FOLGA_GRUPO_MS) AuvoAcervo_renovarEndereco_(ctx, reg, prazo - C.FOLGA_GRUPO_MS);
  });
  // marca a tentativa ANTES de baixar: se o lote for encerrado no meio, a próxima rodada sabe qual arquivo travou
  var inicio = AuvoAcervo_iso_();
  grupo.forEach(function (reg) {
    reg.ANDAMENTO_EM = inicio;
    reg.TENTATIVAS = Number(reg.TENTATIVAS || 0) + 1;
    AuvoAcervo_gravarLinha_(ctx.tA, reg);
  });
  ctx.arquivosLote += grupo.length;
  var resps = AuvoAcervo_buscarVarios_(grupo.map(function (r) { return { url: String(r.URL_ORIGINAL), metodo: 'get' }; }), prazo);
  var agora = AuvoAcervo_iso_();
  var pastas = AuvoAcervo_pastasTarefas_(ctx);
  grupo.forEach(function (reg, i) {
    var r = resps[i];
    resps[i] = null;
    reg.ANDAMENTO_EM = '';
    if (r.cod === -1) {
      // não coube neste lote: volta para a fila como estava
      reg.TENTATIVAS = Math.max(0, Number(reg.TENTATIVAS || 0) - 1);
      AuvoAcervo_gravarLinha_(ctx.tA, reg);
      return;
    }
    reg.ULTIMA_TENTATIVA_EM = agora;
    var falha = function (motivo, retentavel) {
      AuvoAcervo_mudarSituacao_(ctx, reg, 'FALHA');
      reg.MOTIVO = motivo; reg.RETENTAVEL = retentavel ? 'SIM' : 'NAO';
      AuvoAcervo_gravarLinha_(ctx.tA, reg);
    };
    var blob = null;
    try {
      if (!r.resp) return falha(r.erro || 'falha de rede', true);
      if (r.cod < 200 || r.cod >= 300) return falha('HTTP ' + r.cod + (r.cod === 404 || r.cod === 410 ? ' (o Auvo não tem mais este arquivo)' : ''), AuvoAcervo_retentavelHttp_(r.cod));
      blob = r.resp.getBlob();
      var tipo = String(blob.getContentType() || AuvoAcervo_cabecalho_(r.resp, 'Content-Type') || '').split(';')[0].trim().toLowerCase();
      r = null;
      var tam = AuvoAcervo_tamanhoBlob_(blob);
      ctx.bytesLote += tam;
      if (!tam) return falha('arquivo vazio', true);
      if (/^text\/html/.test(tipo)) return falha('o endereço devolveu uma página da internet, não um arquivo', false);
      if (tam > maxArq) { AuvoAcervo_falhaGrande_(ctx, reg, tam, maxArq); return; }
      var sha = AuvoAcervo_shaBlob_(blob);
      var pastaId = pastas[String(reg.AUVO_TASK_ID)];
      if (!pastaId) return falha('tarefa sem pasta no acervo (rode a cópia de novo)', true);
      var pasta = DriveApp.getFolderById(pastaId);
      var nome = AuvoAcervo_nomeArquivo_(reg, AuvoAcervo_extensao_(tipo, reg.URL_ORIGINAL));
      if (!tipo) { try { blob.setContentType('application/octet-stream'); } catch (eT) {} }
      var g = AuvoAcervo_gravarArquivo_(pasta, nome, blob, sha);
      AuvoAcervo_mudarSituacao_(ctx, reg, 'COPIADO');
      reg.MOTIVO = ''; reg.RETENTAVEL = '';
      reg.NOME_ARQUIVO = g.nome; reg.TAMANHO = tam; reg.CONTENT_TYPE = tipo; reg.SHA256 = sha;
      reg.ARQUIVO_ID = g.arquivo.getId(); reg.COPIADO_EM = agora;
      ctx.k.bytes += tam;
      AuvoAcervo_gravarLinha_(ctx.tA, reg);
    } catch (e) {
      falha('erro ao gravar: ' + (e && e.message ? e.message : e), true);
    } finally {
      blob = null;
    }
  });
  resps = null;
  // números da tela atualizados a cada grupo (o estado é gravado depois de cada passo)
  AuvoAcervo_publicarContagem_(ctx);
  return 'CONTINUAR';
}

/* ---------------- Conferência (relê e confere o sha256) ---------------- */
/**
 * Lista leve do que conferir: [aba, linha, id do arquivo, sha256] — arquivos copiados e depois o JSON das
 * tarefas. Sem objetos por linha; a ordem não muda durante a conferência, então o cursor é um índice.
 */
function AuvoAcervo_filaConferencia_() {
  var fila = [];
  [[AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'ARQUIVO_ID', 'SHA256', true],
   [AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS, 'JSON_ARQUIVO_ID', 'JSON_SHA256', false]].forEach(function (d) {
    var sh = AuvoAcervo_aba_(d[0], d[1]);
    var cab = AuvoAcervo_cabecalhoAba_(sh), iId = cab.indexOf(d[2]), iSha = cab.indexOf(d[3]), iSit = cab.indexOf('SITUACAO');
    var iConf = cab.indexOf('CONFERENCIA'), iEm = cab.indexOf('CONFERIDO_EM');
    var lr = sh.getLastRow();
    if (lr < 2) return;
    var vals = sh.getRange(2, 1, lr - 1, cab.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (d[4] && String(vals[i][iSit]) !== 'COPIADO') continue;
      if (!vals[i][iId]) continue;
      fila.push({ sh: sh, linha: i + 2, id: String(vals[i][iId]), sha: String(vals[i][iSha]), iConf: iConf, iEm: iEm });
    }
    vals = null;
  });
  return fila;
}

function AuvoAcervo_passoConferencia_(ctx) {
  var C = AUVO_ACERVO_CFG, est = ctx.est;
  if (!ctx.filaConf) ctx.filaConf = AuvoAcervo_filaConferencia_();
  var fila = ctx.filaConf;
  var i = Number(est.conferenciaCursor || 0);
  var agora = AuvoAcervo_iso_(), n = 0;
  if (!ctx.confBytes) { ctx.confBytes = 0; ctx.confLote = 0; }
  while (i < fila.length) {
    if (ctx.restante() < C.FOLGA_GRUPO_MS || ctx.confBytes >= C.LIMITE_BYTES_LOTE || ctx.confLote >= C.LIMITE_CONFERENCIA_LOTE) { est.conferenciaCursor = i; return 'SEM_TEMPO'; }
    // grava o cursor a cada 200 arquivos (o estado é gravado depois de cada passo)
    if (n >= 200) { est.conferenciaCursor = i; return 'CONTINUAR'; }
    var item = fila[i], resultado, blob = null;
    try {
      blob = DriveApp.getFileById(item.id).getBlob();
      ctx.confBytes += AuvoAcervo_tamanhoBlob_(blob);
      resultado = AuvoAcervo_shaBlob_(blob) === item.sha ? 'OK' : 'DIVERGENTE';
    } catch (e) { resultado = 'ARQUIVO_NAO_ENCONTRADO'; }
    blob = null;
    if (item.iEm === item.iConf + 1) item.sh.getRange(item.linha, item.iConf + 1, 1, 2).setValues([[resultado, agora]]);
    else { item.sh.getRange(item.linha, item.iConf + 1).setValue(resultado); item.sh.getRange(item.linha, item.iEm + 1).setValue(agora); }
    fila[i] = null;
    i++; n++; ctx.confLote++;
  }
  est.conferenciaCursor = 0;
  ctx.filaConf = null;
  return 'FASE_CONCLUIDA';
}

/* ---------------- Fim: relatório da contagem ou da conferência ---------------- */
function AuvoAcervo_concluir_(ctx) {
  var est = ctx.est;
  var pastaRel = null;
  var rel;
  if (est.modo === 'CONTAGEM') {
    rel = AuvoAcervo_relatorioContagem_(est);
    AuvoAcervo_gravarJson_(AUVO_ACERVO_CFG.PROP_CONTAGEM, rel);
  } else {
    rel = AuvoAcervo_relatorioConferencia_(est);
    AuvoAcervo_gravarJson_(AUVO_ACERVO_CFG.PROP_RELATORIO, rel);
  }
  try {
    pastaRel = AuvoAcervo_pastaFilha_(AuvoAcervo_pastaRaiz_(), AUVO_ACERVO_CFG.PASTA_RELATORIOS);
    var nome = (est.modo === 'CONTAGEM' ? 'contagem_' : 'conferencia_') + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss') + '.json';
    var texto = JSON.stringify(rel, null, 2);
    AuvoAcervo_gravarArquivo_(pastaRel, nome, Utilities.newBlob(texto, 'application/json', nome), AuvoAcervo_sha256_(texto));
  } catch (e) { /* o relatório fica na propriedade mesmo sem o arquivo */ }
  est.situacao = 'CONCLUIDO';
  est.concluidoEm = AuvoAcervo_iso_();
}

function AuvoAcervo_porMes_(est, acervoPorMes) {
  return Object.keys(est.meses || {}).sort().map(function (m) {
    var a = est.meses[m];
    var linha = { mes: m, auvo: a.auvo, lidas: a.lidas };
    if (acervoPorMes) { linha.acervo = acervoPorMes[m] || 0; linha.diferenca = a.auvo - linha.acervo; }
    return linha;
  });
}

function AuvoAcervo_relatorioContagem_(est) {
  var k = est.contagem;
  var media = k.amostra.n ? k.amostra.bytes / k.amostra.n : 0;
  var estimativa = Math.round(media * k.arquivos);
  // tempo: cada arquivo ~ (tamanho médio a 2 MB/s + 0,4 s de ida e volta), em paralelo, mais as páginas e o registro das tarefas
  var segArquivos = k.arquivos * (media / (2 * 1024 * 1024) + 0.4) / AUVO_ACERVO_CFG.DOWNLOAD_PARALELO;
  var segTarefas = k.tarefas * 0.15 + Object.keys(est.meses).length * 2 * 2;
  return {
    geradoEm: AuvoAcervo_iso_(), periodo: { inicio: est.inicio, fim: est.fim },
    tarefas: k.tarefas, tarefasSemId: est.tarefas.semId, porAno: k.porAno, porTipo: k.porTipo,
    tiposDeTarefa: Object.keys(k.porTipo).length, questionarios: k.questionarios, qtdQuestionarios: Object.keys(k.questionarios).length,
    respostas: k.respostas, respostasComImagem: k.respostasComImagem,
    assinaturasQuestionario: k.assinaturasQuestionario, assinaturasTarefa: k.assinaturasTarefa, anexos: k.anexos,
    arquivos: k.arquivos, links: k.links, tarefasComArquivo: k.tarefasComArquivo, enderecosPorServidor: k.hosts,
    jsonBytes: k.jsonBytes, maiorJson: k.maiorJson, listasDeApoio: k.catalogos,
    amostra: { imagensMedidas: k.amostra.n, semTamanho: k.amostra.semTamanho, falhas: k.amostra.falhas, bytes: k.amostra.bytes, tamanhoMedio: Math.round(media) },
    estimativaBytes: estimativa, estimativaComJsonBytes: estimativa + k.jsonBytes * 2,
    estimativaMinutosCopia: Math.ceil((segArquivos + segTarefas) * 1.3 / 60),
    porMes: AuvoAcervo_porMes_(est, null), mesesSemResposta: est.mesesSemResposta || 0
  };
}

function AuvoAcervo_relatorioConferencia_(est) {
  var tT = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS, 'AUVO_TASK_ID');
  var tA = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'CHAVE');
  var porMes = {};
  var jsonConf = { ok: 0, divergentes: 0, naoEncontrados: 0 };
  tT.linhas.forEach(function (r) {
    porMes[String(r.MES_CONSULTA)] = (porMes[String(r.MES_CONSULTA)] || 0) + 1;
    var c = String(r.CONFERENCIA);
    if (c === 'OK') jsonConf.ok++; else if (c === 'DIVERGENTE') jsonConf.divergentes++; else if (c === 'ARQUIVO_NAO_ENCONTRADO') jsonConf.naoEncontrados++;
  });
  var a = { esperados: 0, copiados: 0, pendentes: 0, falhas: 0, links: 0, bytes: 0, porTipo: {}, falhasPorMotivo: {},
    conferencia: { ok: 0, divergentes: 0, naoEncontrados: 0, naoConferidos: 0 } };
  tA.linhas.forEach(function (r) {
    var s = String(r.SITUACAO), tipo = String(r.TIPO);
    if (s === 'LINK') { a.links++; return; }
    a.esperados++;
    var pt = a.porTipo[tipo] || (a.porTipo[tipo] = { esperados: 0, copiados: 0, falhas: 0, pendentes: 0 });
    pt.esperados++;
    if (s === 'COPIADO') {
      a.copiados++; pt.copiados++; a.bytes += Number(r.TAMANHO || 0);
      var c = String(r.CONFERENCIA);
      if (c === 'OK') a.conferencia.ok++; else if (c === 'DIVERGENTE') a.conferencia.divergentes++;
      else if (c === 'ARQUIVO_NAO_ENCONTRADO') a.conferencia.naoEncontrados++; else a.conferencia.naoConferidos++;
    } else if (s === 'FALHA') {
      a.falhas++; pt.falhas++;
      var mot = String(r.MOTIVO || 'sem motivo').replace(/:.*$/, '').slice(0, 80);
      a.falhasPorMotivo[mot] = (a.falhasPorMotivo[mot] || 0) + 1;
    } else { a.pendentes++; pt.pendentes++; }
  });
  var meses = AuvoAcervo_porMes_(est, porMes);
  var faltando = meses.reduce(function (s, m) { return s + Math.max(0, m.diferenca); }, 0);
  var totalAuvo = meses.reduce(function (s, m) { return s + m.auvo; }, 0);
  var zero = faltando === 0 && a.falhas === 0 && a.pendentes === 0 && a.conferencia.divergentes === 0 &&
    a.conferencia.naoEncontrados === 0 && jsonConf.divergentes === 0 && jsonConf.naoEncontrados === 0;
  return {
    geradoEm: AuvoAcervo_iso_(), periodo: { inicio: est.inicio, fim: est.fim },
    tarefas: { auvo: totalAuvo, noAcervo: tT.linhas.length, faltando: faltando, conferenciaJson: jsonConf },
    arquivos: a, listasDeApoio: (est.catalogos || []).map(function (c) { return { nome: c.nome, itens: c.itens, situacao: c.situacao }; }),
    porMes: meses, mesesSemResposta: est.mesesSemResposta || 0,
    conclusao: zero ? 'ZERO_FALTAS' : 'COM_FALTAS'
  };
}

/* ============================================================
 * Ações da tela
 * ============================================================ */
function AuvoAcervo_status_() {
  var est = AuvoAcervo_lerEstado_();
  var copia = est;
  return {
    ok: true,
    estado: {
      modo: est.modo || '', situacao: est.situacao || 'PARADO', fase: est.fase || '', inicio: est.inicio || '', fim: est.fim || '',
      cursor: est.cursor || null, tarefas: est.tarefas || null, arquivos: est.arquivos || null, catalogos: (est.catalogos || []).map(function (c) {
        return { nome: c.nome, itens: c.itens, situacao: c.situacao };
      }),
      meses: AuvoAcervo_porMes_(copia, null), iniciadoEm: est.iniciadoEm || '', iniciadoPor: est.iniciadoPor || '',
      atualizadoEm: est.atualizadoEm || '', concluidoEm: est.concluidoEm || '', rodadas: est.rodadas || 0,
      ultimoErro: est.ultimoErro || '', lotesComErro: est.lotesComErro || 0, ultimaRodada: est.ultimaRodada || null,
      pausaPedida: AuvoAcervo_pedidoPausa_(), loteRodando: AuvoAcervo_travaOcupada_(),
      contagemParcial: est.modo === 'CONTAGEM' && est.contagem ? { tarefas: est.contagem.tarefas, arquivos: est.contagem.arquivos } : null
    },
    contagem: AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_CONTAGEM, null),
    relatorio: AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_RELATORIO, null)
  };
}

function AuvoAcervo_apiStatus(sessao) { return AuvoAcervo_status_(); }
function AuvoAcervo_apiIniciarContagem(sessao, payload) { return AuvoAcervo_iniciar_('CONTAGEM', payload, sessao); }
function AuvoAcervo_apiIniciarCopia(sessao, payload) { return AuvoAcervo_iniciar_('COPIA', payload, sessao); }

function AuvoAcervo_apiPausar(sessao) {
  var est = AuvoAcervo_lerEstado_();
  if (est.situacao !== 'RODANDO') return AuvoAcervo_status_();
  if (AuvoAcervo_travaOcupada_()) {
    // o lote em andamento termina o passo atual, grava o progresso e para
    AuvoAcervo_props_().setProperty(AUVO_ACERVO_CFG.PROP_PEDIDO, 'PAUSAR');
  } else {
    est.situacao = 'PAUSADO';
    AuvoAcervo_gravarEstado_(est);
    AuvoAcervo_removerGatilhos_();
  }
  AuvoAcervo_log_(sessao, 'ACERVO_AUVO_PAUSA', 'Fase ' + est.fase);
  return AuvoAcervo_status_();
}

function AuvoAcervo_apiContinuar(sessao) {
  var est = AuvoAcervo_lerEstado_();
  if (!est.modo) throw new Error('Nenhuma contagem ou cópia foi iniciada ainda. Toque em "Contar o acervo" ou em "Iniciar cópia".');
  if (est.situacao === 'CONCLUIDO') throw new Error('Esta ' + (est.modo === 'CONTAGEM' ? 'contagem' : 'cópia') + ' já terminou. Para buscar o que entrou no Auvo depois, toque em "Iniciar cópia" de novo: o que já foi copiado não é baixado outra vez.');
  AuvoAcervo_props_().deleteProperty(AUVO_ACERVO_CFG.PROP_PEDIDO);
  est.situacao = 'RODANDO';
  est.lotesComErro = 0;
  AuvoAcervo_gravarEstado_(est);
  AuvoAcervo_log_(sessao, 'ACERVO_AUVO_CONTINUAR', 'Fase ' + est.fase);
  AuvoAcervo_agendar_(5000);
  return AuvoAcervo_status_();
}

/** Devolve as falhas para a fila (todas, inclusive as que não se repetem sozinhas) e retoma na fase de arquivos. */
function AuvoAcervo_apiTentarDeNovo(sessao) {
  var est = AuvoAcervo_lerEstado_();
  if (est.modo !== 'COPIA') throw new Error('Ainda não há cópia do acervo. Toque em "Iniciar cópia" primeiro.');
  if (est.situacao === 'RODANDO') throw new Error('A cópia está rodando. Espere terminar ou toque em "Pausar" antes de tentar de novo as falhas.');
  var tA = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'CHAVE');
  var n = 0;
  tA.linhas.forEach(function (r) {
    if (String(r.SITUACAO) !== 'FALHA') return;
    r.SITUACAO = 'PENDENTE';
    r.MOTIVO = 'nova tentativa pedida (antes: ' + String(r.MOTIVO || '').slice(0, 120) + ')';
    AuvoAcervo_gravarLinha_(tA, r);
    n++;
  });
  est.fase = 'ARQUIVOS';
  est.situacao = 'RODANDO';
  est.lotesComErro = 0;
  est.conferenciaCursor = 0;
  delete est.concluidoEm;
  AuvoAcervo_gravarEstado_(est);
  AuvoAcervo_log_(sessao, 'ACERVO_AUVO_REPETIR', n + ' arquivo(s) de volta para a fila');
  AuvoAcervo_agendar_(5000);
  var st = AuvoAcervo_status_();
  st.devolvidos = n;
  return st;
}

function AuvoAcervo_apiConferir(sessao) {
  var est = AuvoAcervo_lerEstado_();
  if (est.modo !== 'COPIA') throw new Error('Ainda não há cópia do acervo para conferir. Toque em "Iniciar cópia" primeiro.');
  if (est.situacao === 'RODANDO') throw new Error('A cópia está rodando; a conferência já faz parte dela e roda no fim.');
  est.fase = 'CONFERENCIA';
  est.situacao = 'RODANDO';
  est.conferenciaCursor = 0;
  est.lotesComErro = 0;
  delete est.concluidoEm;
  AuvoAcervo_gravarEstado_(est);
  AuvoAcervo_log_(sessao, 'ACERVO_AUVO_CONFERIR', '');
  AuvoAcervo_agendar_(5000);
  return AuvoAcervo_status_();
}

function AuvoAcervo_apiListarFalhas(sessao, payload) {
  var limite = Math.min(500, Math.max(1, Number((payload && payload.limite) || 200)));
  var tA = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'CHAVE');
  var falhas = tA.linhas.filter(function (r) { return String(r.SITUACAO) === 'FALHA'; });
  return {
    ok: true, total: falhas.length,
    itens: falhas.slice(0, limite).map(function (r) {
      return { tarefa: String(r.AUVO_TASK_ID), tipo: String(r.TIPO), pergunta: String(r.PERGUNTA || ''), motivo: String(r.MOTIVO || ''),
        tentativas: Number(r.TENTATIVAS || 0), repeteSozinho: String(r.RETENTAVEL) === 'SIM', endereco: AuvoAcervo_urlCurta_(r.URL_ORIGINAL),
        ultimaTentativa: String(r.ULTIMA_TENTATIVA_EM || '') };
    })
  };
}

function AuvoAcervo_apiConsultarTarefa(sessao, payload) {
  var id = String((payload && payload.taskId) || '').replace(/\D/g, '');
  if (!id) throw new Error('Informe o número da tarefa no Auvo (só números).');
  var tT = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_TAREFAS, AUVO_ACERVO_COLS.TAREFAS, 'AUVO_TASK_ID');
  var t = tT.indice[id];
  if (!t) return { ok: true, achou: false, taskId: id };
  var tA = AuvoAcervo_tabela_(AUVO_ACERVO_CFG.ABA_ARQUIVOS, AUVO_ACERVO_COLS.ARQUIVOS, 'CHAVE');
  var arquivos = tA.linhas.filter(function (r) { return String(r.AUVO_TASK_ID) === id; }).map(function (r) {
    var link = '';
    if (r.ARQUIVO_ID) { try { link = DriveApp.getFileById(String(r.ARQUIVO_ID)).getUrl(); } catch (e) {} }
    return { tipo: String(r.TIPO), pergunta: String(r.PERGUNTA || ''), situacao: String(r.SITUACAO), nome: String(r.NOME_ARQUIVO || ''),
      tamanho: Number(r.TAMANHO || 0), sha256: String(r.SHA256 || ''), conferencia: String(r.CONFERENCIA || ''), motivo: String(r.MOTIVO || ''),
      link: link, endereco: AuvoAcervo_urlCurta_(r.URL_ORIGINAL) };
  });
  var jsonLink = '', previa = '';
  if (t.JSON_ARQUIVO_ID) {
    try {
      var f = DriveApp.getFileById(String(t.JSON_ARQUIVO_ID));
      jsonLink = f.getUrl();
      previa = f.getBlob().getDataAsString('UTF-8').slice(0, 20000);
    } catch (e) {}
  }
  return {
    ok: true, achou: true, taskId: id,
    tarefa: { data: String(t.DATA_TAREFA || ''), tipo: String(t.TIPO_TAREFA || ''), cliente: String(t.CLIENTE_NOME || ''),
      tecnico: String(t.TECNICO_NOME || ''), finalizada: String(t.FINALIZADA || ''), versao: Number(t.JSON_VERSAO || 1),
      sha256: String(t.JSON_SHA256 || ''), tamanho: Number(t.JSON_TAMANHO || 0), conferencia: String(t.CONFERENCIA || ''),
      lidaEm: String(t.LIDA_EM || ''), atualizadaEm: String(t.ATUALIZADA_EM || '') },
    jsonLink: jsonLink, jsonPrevia: previa, arquivos: arquivos
  };
}

/* ============================================================
 * Chamadas do navegador (só Administrador e Diretoria)
 * ============================================================ */
function AuvoAcervo_perfilPode_(perfil) {
  return AUVO_ACERVO_CFG.PERFIS.indexOf(String(perfil || '').toUpperCase()) !== -1;
}

function AuvoAcervo_apiDispatch(req) {
  req = req || {};
  var sessao = exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  if (fn === 'apiPodeVer') return { ok: true, pode: AuvoAcervo_perfilPode_(sessao && sessao.perfil) };
  if (!AuvoAcervo_perfilPode_(sessao && sessao.perfil)) {
    throw new Error('O acervo do Auvo é só do Administrador e da Diretoria. Peça a um deles para abrir esta parte da tela.');
  }
  var allow = {
    apiStatus: AuvoAcervo_apiStatus,
    apiIniciarContagem: AuvoAcervo_apiIniciarContagem,
    apiIniciarCopia: AuvoAcervo_apiIniciarCopia,
    apiPausar: AuvoAcervo_apiPausar,
    apiContinuar: AuvoAcervo_apiContinuar,
    apiTentarDeNovo: AuvoAcervo_apiTentarDeNovo,
    apiConferir: AuvoAcervo_apiConferir,
    apiListarFalhas: AuvoAcervo_apiListarFalhas,
    apiConsultarTarefa: AuvoAcervo_apiConsultarTarefa
  };
  if (!allow[fn]) throw new Error('Função não permitida ou não encontrada: ' + fn);
  return allow[fn](sessao, req.payload || {});
}

/** Conteúdo da parte "Acervo do Auvo" da tela Integração Auvo (vazio para quem não pode ver). */
function AuvoAcervo_obterConteudo(sessionId) {
  var sessao = exigirSessao(String(sessionId || ''));
  if (!AuvoAcervo_perfilPode_(sessao && sessao.perfil)) return '';
  return typeof AUVO_ACERVO_CONTEUDO === 'string' ? AUVO_ACERVO_CONTEUDO : '';
}
