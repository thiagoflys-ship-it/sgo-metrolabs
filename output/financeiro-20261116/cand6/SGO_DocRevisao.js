/****************************************************
 * SGO_DocRevisao — corrigir um documento já gerado e emitir a revisão (21/10/2026)
 *
 * Pedido da equipe: "depois que gerou, não podemos editar algo e gerar novamente?".
 * Comum a todos os geradores de documento técnico. Cada gerador:
 *  1. antes de montar o documento chama SGO_DocRev_preparar_(modulo, payload, sessao):
 *     - sem pedido de revisão: documento novo (o gerador numera como sempre);
 *     - payload._docRev.modo = 'CORRIGIR': mesmo número, revisão seguinte (Rev. 01, 02...),
 *       motivo obrigatório (ao menos 10 caracteres), histórico de revisões para o documento;
 *     - payload._docRev.modo = 'BASE': documento novo (número novo) com os dados de outro.
 *  2. coloca o bloco de revisão no HTML (SGO_DocRev_injetarHtml_) e a revisão no nome do
 *     arquivo (SGO_DocRev_nomeArquivo_);
 *  3. depois de salvar chama SGO_DocRev_registrar_(...): uma linha na aba DOC_REVISOES com os
 *     dados usados (formulário, equipamento, padrões, leituras importadas); a revisão anterior
 *     do mesmo número passa a SUBSTITUIDO ("substituída pela Rev. NN"), continua na pasta e
 *     nunca é apagada nem sobrescrita (o arquivo antigo só ganha a anotação na descrição).
 *
 * Dados grandes (leituras de registrador, planilhas importadas) não ficam em célula: acima de
 * 40.000 caracteres vão para um arquivo JSON numa pasta privada do Drive, e a célula guarda só
 * o identificador. A lista lê só as colunas de controle (a coluna dos dados fica de fora).
 *
 * Tela: JS_DocRevisao.html (SGO_DocRev no navegador). Chamada única do navegador: DocRev_api.
 * Nenhuma função devolve objeto Date: só textos.
 ****************************************************/

var SGO_DOCREV_ABA = 'DOC_REVISOES';
// PAYLOAD_JSON fica sempre por último: a lista lê as colunas anteriores e nunca carrega os dados.
var SGO_DOCREV_CAMPOS = ['ID', 'MODULO', 'NUMERO', 'REVISAO', 'STATUS', 'SUBSTITUIDA_POR', 'MOTIVO', 'ORIGEM_ID',
  'EMITIDO_POR', 'EMITIDO_LOGIN', 'EMITIDO_EM', 'TITULO', 'CLIENTE', 'CNPJ', 'TAG', 'EQUIPAMENTO_ID',
  'PDF_ID', 'HTML_ID', 'PDF_URL', 'HTML_URL', 'APROVACAO', 'DADOS_ARQUIVO_ID', 'DADOS_TAMANHO', 'ATUALIZADO_EM', 'PAYLOAD_JSON'];
var SGO_DOCREV_LIMITE_CELULA = 40000;
var SGO_DOCREV_MOTIVO_MIN = 10;
var SGO_DOCREV_PROP_PASTA = 'DOCREV_PASTA_DADOS_ID';
var SGO_DOCREV_MEMORIA_ = null; // só nos testes (sem banco)
var SGO_DOCREV_ARQUIVOS_MEMORIA_ = null; // só nos testes (sem Drive)

/* Nome do gerador como aparece nas mensagens. Gerador novo: acrescente aqui. */
var SGO_DOCREV_MODULOS = {
  AUTOCLAVE: 'Relatório de ensaio da autoclave', AUTOCLAVE_DADOS: 'Planilha de dados da autoclave',
  LAVADORA: 'Relatório de ensaio da lavadora', LAVADORA_DADOS: 'Planilha de dados da lavadora',
  ESTUFA: 'Relatório de ensaio de estufa, banho-maria ou secadora', ESTUFA_DADOS: 'Planilha de dados de estufa, banho-maria ou secadora',
  CADEIA_FRIO: 'Relatório de ensaio da cadeia de frio', CADEIA_FRIO_DADOS: 'Planilha de dados da cadeia de frio',
  BAIXA_TEMPERATURA: 'Relatório de qualificação de baixa temperatura',
  RELATORIO_CALIBRACAO: 'Relatório de calibração',
  DECLARACAO_EXECUCAO: 'Declaração de execução de serviço',
  DECLARACAO_QIQO: 'Relatório de qualificação QI/QO/QD',
  CERTIFICADO_CALIBRACAO: 'Certificado de calibração',
  NR13: 'Laudo NR-13',
  PLANEJAMENTO_CME: 'Planejamento de CME',
  PGT_POP: 'PGT/POP',
  REGISTROS_OPERACIONAIS: 'Registros operacionais',
  CRONOGRAMA_EXECUCAO: 'Cronograma de execução',
  // 22/10/2026: relatório da O.S. da Assistência técnica (revisão com motivo pela gestão, "Abrir para corrigir" na ficha da O.S.)
  ORDEM_SERVICO: 'Relatório de atendimento técnico (O.S.)'
};

/* ============================================================
 * Utilitários
 * ============================================================ */

function SGO_DocRev_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function SGO_DocRev_agora_() {
  try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'); } catch (e) { return new Date().toISOString(); }
}

/** Revisão em dois dígitos: 0 → "Rev. 00", 3 → "Rev. 03". */
function SGO_DocRev_rotulo_(rev) {
  var n = Math.max(0, parseInt(rev, 10) || 0);
  return 'Rev. ' + (n < 10 ? '0' + n : String(n));
}

/** Acrescenta a revisão ao nome do arquivo: "Relatório X - Rev. 01" (troca uma revisão já presente no fim). */
function SGO_DocRev_nomeArquivo_(nomeBase, rev) {
  var base = SGO_DocRev_s_(nomeBase).replace(/\.(pdf|html?)$/i, '').replace(/\s*-?\s*Rev\.?\s*\d{1,3}$/i, '');
  return base + ' - ' + SGO_DocRev_rotulo_(rev);
}

function SGO_DocRev_nomeModulo_(modulo) { return SGO_DOCREV_MODULOS[modulo] || 'Documento'; }

function SGO_DocRev_esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function SGO_DocRev_nomeSessao_(sessao) {
  return SGO_DocRev_s_(sessao && (sessao.nome || sessao.usuario || sessao.login));
}

/* ============================================================
 * Aba DOC_REVISOES (ou memória, nos testes)
 * ============================================================ */

function SGO_DocRev_aba_() {
  if (typeof SGO_DATA === 'undefined' || !SGO_DATA || typeof SGO_DATA.getDB !== 'function') return null;
  var ss = SGO_DATA.getDB();
  if (!ss || typeof ss.getSheetByName !== 'function') return null;
  var aba = ss.getSheetByName(SGO_DOCREV_ABA);
  if (!aba && typeof ss.insertSheet === 'function') {
    aba = ss.insertSheet(SGO_DOCREV_ABA);
    aba.getRange(1, 1, 1, SGO_DOCREV_CAMPOS.length).setValues([SGO_DOCREV_CAMPOS]);
  }
  // Banco simplificado dos testes de outros módulos (sem as operações de aba): usa a memória.
  if (!aba || typeof aba.getLastRow !== 'function' || typeof aba.appendRow !== 'function') return null;
  return aba;
}

function SGO_DocRev_cabecalho_(aba) {
  return aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
}

/** Linhas de controle (sem a coluna dos dados). Cada uma com _linha. */
function SGO_DocRev_lerControle_() {
  var aba = SGO_DocRev_aba_();
  if (!aba) {
    SGO_DOCREV_MEMORIA_ = SGO_DOCREV_MEMORIA_ || [];
    return SGO_DOCREV_MEMORIA_.map(function (r, i) { var o = { _linha: i }; Object.keys(r).forEach(function (k) { if (k !== 'PAYLOAD_JSON') o[k] = r[k]; }); return o; });
  }
  var ult = aba.getLastRow();
  if (ult < 2) return [];
  var cab = SGO_DocRev_cabecalho_(aba);
  var colDados = cab.indexOf('PAYLOAD_JSON');
  var largura = colDados >= 0 ? colDados : cab.length; // colunas antes dos dados
  if (largura <= 0) return [];
  return aba.getRange(2, 1, ult - 1, largura).getValues().map(function (l, i) {
    var o = { _linha: i + 2 };
    for (var k = 0; k < largura; k++) o[cab[k]] = l[k] === null || l[k] === undefined ? '' : String(l[k]);
    return o;
  });
}

function SGO_DocRev_obter_(id) {
  id = SGO_DocRev_s_(id);
  if (!id) return null;
  return SGO_DocRev_lerControle_().filter(function (r) { return r.ID === id; })[0] || null;
}

/** Texto da coluna de dados de uma linha (só dela). */
function SGO_DocRev_lerDadosLinha_(reg) {
  var aba = SGO_DocRev_aba_();
  if (!aba) return SGO_DocRev_s_((SGO_DOCREV_MEMORIA_[reg._linha] || {}).PAYLOAD_JSON);
  var cab = SGO_DocRev_cabecalho_(aba);
  var col = cab.indexOf('PAYLOAD_JSON');
  if (col < 0) return '';
  return SGO_DocRev_s_(aba.getRange(reg._linha, col + 1).getValue());
}

function SGO_DocRev_atualizar_(reg, campos) {
  campos = Object.assign({}, campos, { ATUALIZADO_EM: SGO_DocRev_agora_() });
  var aba = SGO_DocRev_aba_();
  if (!aba) { var r = SGO_DOCREV_MEMORIA_[reg._linha]; Object.keys(campos).forEach(function (k) { r[k] = String(campos[k]); }); return; }
  var cab = SGO_DocRev_cabecalho_(aba);
  Object.keys(campos).forEach(function (k) {
    var col = cab.indexOf(k);
    if (col >= 0) aba.getRange(reg._linha, col + 1).setValue(String(campos[k]));
  });
}

function SGO_DocRev_inserir_(reg) {
  var aba = SGO_DocRev_aba_();
  if (!aba) { SGO_DOCREV_MEMORIA_ = SGO_DOCREV_MEMORIA_ || []; SGO_DOCREV_MEMORIA_.push(reg); return; }
  var cab = SGO_DocRev_cabecalho_(aba);
  aba.appendRow(cab.map(function (c) { return reg[c] === undefined ? '' : reg[c]; }));
}

/* ============================================================
 * Dados guardados (célula ou arquivo privado no Drive)
 * ============================================================ */

function SGO_DocRev_pastaDados_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SGO_DOCREV_PROP_PASTA);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* pasta removida: cria outra */ } }
  var pasta = DriveApp.getRootFolder().createFolder('SGO+ Dados dos documentos emitidos (privado)');
  try { pasta.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e2) {}
  props.setProperty(SGO_DOCREV_PROP_PASTA, pasta.getId());
  return pasta;
}

function SGO_DocRev_temDrive_() {
  return typeof DriveApp !== 'undefined' && !!DriveApp && typeof DriveApp.getRootFolder === 'function' && typeof Utilities !== 'undefined' && typeof Utilities.newBlob === 'function';
}

/** Grava um JSON na pasta privada dos dados e devolve o identificador do arquivo. */
function SGO_DocRev_criarArquivoDados_(nome, json) {
  if (!SGO_DocRev_temDrive_()) {
    SGO_DOCREV_ARQUIVOS_MEMORIA_ = SGO_DOCREV_ARQUIVOS_MEMORIA_ || {};
    var idMem = 'dados-' + (Object.keys(SGO_DOCREV_ARQUIVOS_MEMORIA_).length + 1);
    SGO_DOCREV_ARQUIVOS_MEMORIA_[idMem] = json;
    return idMem;
  }
  var arq = SGO_DocRev_pastaDados_().createFile(Utilities.newBlob(json, 'application/json', nome));
  try { arq.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
  return arq.getId();
}

function SGO_DocRev_lerArquivoDados_(id) {
  id = String(id || '');
  if (SGO_DOCREV_ARQUIVOS_MEMORIA_ && SGO_DOCREV_ARQUIVOS_MEMORIA_[id]) return JSON.parse(SGO_DOCREV_ARQUIVOS_MEMORIA_[id]);
  return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'));
}

function SGO_DocRev_nomeDados_(modulo, numero, rev) {
  return SGO_DocRev_s_(modulo) + ' ' + (SGO_DocRev_s_(numero) || 'sem numero').replace(/[\/\\:*?"<>|]/g, '-') + ' ' + SGO_DocRev_rotulo_(rev) + ' - dados.json';
}

/** { celula, arquivoId, tamanho } — grava em arquivo quando passa do limite da célula. */
function SGO_DocRev_guardarDados_(modulo, numero, rev, dados) {
  var json = JSON.stringify(dados || {});
  if (json.length <= SGO_DOCREV_LIMITE_CELULA) return { celula: json, arquivoId: '', tamanho: json.length };
  var id = SGO_DocRev_criarArquivoDados_(SGO_DocRev_nomeDados_(modulo, numero, rev), json);
  return { celula: JSON.stringify({ arquivo: id }), arquivoId: id, tamanho: json.length };
}

/** Dados guardados de uma linha, ou null quando não há (documento anterior ao registro). */
function SGO_DocRev_lerDados_(reg) {
  var bruto = SGO_DocRev_lerDadosLinha_(reg);
  if (!bruto) return null;
  var o = JSON.parse(bruto);
  if (o && o.arquivo && !o.payload) return SGO_DocRev_lerArquivoDados_(o.arquivo);
  return o;
}

/* ============================================================
 * Geradores em duas etapas (montar o HTML e depois salvar)
 * ============================================================
 * Na montagem os dados vão para um arquivo privado e o HTML leva só o identificador numa
 * <meta name="sgo-docrev-dados">; no salvar a meta sai do HTML (o arquivo do cliente não leva
 * nada interno) e a emissão é registrada com esse arquivo de dados.
 */
function SGO_DocRev_guardarPendente_(modulo, rev, payload) {
  rev = rev || {};
  var guardar = {
    v: 1, modulo: modulo, payload: SGO_DocRev_limparPayload_(payload), form: rev.form || ((payload && payload._docRev) || {}).form || null,
    rev: { modo: rev.modo || '', origemId: rev.origemId || '', motivo: rev.motivo || '', numero: rev.numero || '', revisao: parseInt(rev.revisao, 10) || 0, ehRevisao: !!rev.ehRevisao }
  };
  return SGO_DocRev_criarArquivoDados_(SGO_DocRev_nomeDados_(modulo, rev.numero, rev.revisao), JSON.stringify(guardar));
}

/** Meta com o identificador dos dados (vai no <head> do HTML da montagem). */
function SGO_DocRev_metaPendente_(id) {
  return id ? '<meta name="sgo-docrev-dados" content="' + SGO_DocRev_esc_(id) + '">' : '';
}

/** Coloca a meta no HTML (no <head> ou no começo). */
function SGO_DocRev_marcarHtml_(html, id) {
  var meta = SGO_DocRev_metaPendente_(id);
  var h = String(html || '');
  if (!meta) return h;
  if (/<head[^>]*>/i.test(h)) return h.replace(/<head[^>]*>/i, function (m) { return m + meta; });
  return meta + h;
}

/** { id, html } — tira a meta do HTML (o que vai para a pasta do cliente). */
function SGO_DocRev_extrairPendente_(html) {
  var h = String(html || '');
  var m = h.match(/<meta name="sgo-docrev-dados" content="([^"]*)">/);
  if (!m) return { id: '', html: h };
  return { id: m[1], html: h.replace(m[0], '') };
}

/**
 * Registra a emissão de um gerador em duas etapas. info como em SGO_DocRev_registrar_ (numero, pdfId...).
 * Sem marca no HTML (tela antiga em cache), devolve aviso e não registra. Nunca lança.
 */
function SGO_DocRev_registrarPendente_(modulo, idDados, info, sessao) {
  if (!idDados) return { ok: false, id: '', aviso: 'O documento foi salvo, mas sem os dados para corrigir depois (a tela estava desatualizada). Atualize a página (F5) antes de gerar o próximo.' };
  var guardado;
  try { guardado = SGO_DocRev_lerArquivoDados_(idDados); } catch (e) {
    return { ok: false, id: '', aviso: 'O documento foi salvo, mas os dados para corrigir depois não foram encontrados. Para corrigir este documento mais tarde será preciso preencher o formulário de novo.' };
  }
  if (guardado.modulo && guardado.modulo !== modulo) return { ok: false, id: '', aviso: 'O documento foi salvo, mas os dados guardados são de outro gerador; ele não poderá ser aberto para corrigir.' };
  var r = guardado.rev || {};
  var rev = { modo: r.modo, origemId: r.origemId, motivo: r.motivo, numero: r.numero, revisao: r.revisao, ehRevisao: !!r.ehRevisao, form: guardado.form };
  var pl = guardado.payload || {};
  var base = { equipamentoId: SGO_DocRev_s_(pl.equipamentoId), cliente: SGO_DocRev_s_(typeof pl.cliente === 'string' ? pl.cliente : ''), cnpj: SGO_DocRev_s_(typeof pl.cnpj === 'string' ? pl.cnpj : '') };
  Object.keys(info || {}).forEach(function (k) { if (info[k] !== undefined && info[k] !== null && info[k] !== '') base[k] = info[k]; });
  return SGO_DocRev_registrar_(modulo, rev, Object.assign(base, { payload: pl, dadosArquivoId: idDados, dadosTamanho: JSON.stringify(guardado).length }), sessao);
}

/* ============================================================
 * Revisões de um número
 * ============================================================ */

function SGO_DocRev_doNumero_(modulo, numero) {
  var n = SGO_DocRev_s_(numero);
  if (!n) return [];
  return SGO_DocRev_lerControle_().filter(function (r) { return r.MODULO === modulo && r.NUMERO === n; })
    .sort(function (a, b) { return (parseInt(a.REVISAO, 10) || 0) - (parseInt(b.REVISAO, 10) || 0); });
}

/** Próxima revisão: maior revisão registrada + 1 (nunca menor que a mínima informada pelo gerador). */
function SGO_DocRev_proximaRevisao_(modulo, numero, minima) {
  var lista = SGO_DocRev_doNumero_(modulo, numero);
  var maior = lista.length ? Math.max.apply(null, lista.map(function (r) { return parseInt(r.REVISAO, 10) || 0; })) : -1;
  return Math.max(Math.max(0, parseInt(minima, 10) || 0), maior + 1);
}

/** Histórico para o documento: [{ revisao, rotulo, em, por, motivo }], em ordem de revisão. */
function SGO_DocRev_historico_(modulo, numero) {
  return SGO_DocRev_doNumero_(modulo, numero).map(function (r) {
    return { revisao: parseInt(r.REVISAO, 10) || 0, rotulo: SGO_DocRev_rotulo_(r.REVISAO), em: SGO_DocRev_s_(r.EMITIDO_EM).slice(0, 10), por: r.EMITIDO_POR, motivo: r.MOTIVO || (parseInt(r.REVISAO, 10) ? '' : 'Emissão inicial') };
  });
}

/* ============================================================
 * Usado pelos geradores
 * ============================================================ */

/**
 * Lê o pedido de revisão que veio da tela (payload._docRev) e devolve o que o gerador precisa:
 * { modo: ''|'CORRIGIR'|'BASE', numero, revisao, rotulo, motivo, origemId, historico, form, ehRevisao }.
 * CORRIGIR: número da origem, revisão seguinte, motivo obrigatório. Lança erro com o que fazer.
 * opcoes.revisaoMinima: revisão mínima do próprio gerador (registro antigo dele).
 */
function SGO_DocRev_preparar_(modulo, payload, sessao, opcoes) {
  opcoes = opcoes || {};
  var pedido = (payload && payload._docRev) || {};
  var modo = SGO_DocRev_s_(pedido.modo).toUpperCase();
  var base = { modo: '', numero: '', revisao: 0, rotulo: SGO_DocRev_rotulo_(0), motivo: '', origemId: '', historico: [], form: pedido.form || null, ehRevisao: false, emitidoPor: SGO_DocRev_nomeSessao_(sessao), em: SGO_DocRev_agora_().slice(0, 10) };
  if (modo === 'BASE') return Object.assign(base, { modo: 'BASE', origemId: SGO_DocRev_s_(pedido.origemId) });
  if (modo !== 'CORRIGIR') return base;
  var origem = SGO_DocRev_obter_(pedido.origemId);
  if (!origem || origem.MODULO !== modulo) throw new Error('O documento que você abriu para corrigir não foi encontrado neste gerador. Atualize a lista de documentos gerados e clique de novo em "Abrir para corrigir"');
  var motivo = SGO_DocRev_s_(pedido.motivo);
  if (motivo.length < SGO_DOCREV_MOTIVO_MIN) throw new Error('Escreva o motivo da revisão (ao menos ' + SGO_DOCREV_MOTIVO_MIN + ' caracteres) no quadro "Correção do documento ' + origem.NUMERO + '", no alto do formulário. Ele aparece no histórico de revisões do documento');
  var revisao = SGO_DocRev_proximaRevisao_(modulo, origem.NUMERO, opcoes.revisaoMinima);
  var historico = SGO_DocRev_historico_(modulo, origem.NUMERO);
  historico.push({ revisao: revisao, rotulo: SGO_DocRev_rotulo_(revisao), em: base.em, por: base.emitidoPor, motivo: motivo });
  return Object.assign(base, { modo: 'CORRIGIR', numero: origem.NUMERO, revisao: revisao, rotulo: SGO_DocRev_rotulo_(revisao), motivo: motivo, origemId: origem.ID, historico: historico, ehRevisao: true });
}

/**
 * Documento novo com número digitado que já existe no registro deste gerador: recusa e explica o caminho
 * (corrigir é pela lista, com motivo; documento novo leva outro número).
 */
function SGO_DocRev_conferirNumeroNovo_(modulo, numero) {
  var n = SGO_DocRev_s_(numero);
  if (!n) return;
  var ja = SGO_DocRev_doNumero_(modulo, n);
  if (!ja.length) return;
  var ult = ja[ja.length - 1];
  throw new Error('O número ' + n + ' já é de um documento gerado (' + SGO_DocRev_rotulo_(ult.REVISAO) + ', ' + SGO_DocRev_s_(ult.EMITIDO_EM).slice(0, 10) + '). Para corrigir aquele documento, use "Abrir para corrigir" na lista "Documentos gerados", no fim desta tela (sai a revisão seguinte, com o motivo). Para um documento novo, apague o número ou use outro');
}

/** Número automático que já existe no registro (dois documentos no mesmo minuto): acrescenta -2, -3... */
function SGO_DocRev_numeroLivre_(modulo, numero) {
  var n = SGO_DocRev_s_(numero);
  if (!n) return n;
  var usados = {};
  try { SGO_DocRev_lerControle_().forEach(function (r) { if (r.MODULO === modulo) usados[r.NUMERO] = true; }); } catch (e) { return n; }
  if (!usados[n]) return n;
  for (var i = 2; i < 1000; i++) { if (!usados[n + '-' + i]) return n + '-' + i; }
  return n;
}

function SGO_DocRev_sessao_(sessionId) {
  try { return typeof exigirSessao === 'function' ? exigirSessao(sessionId) : {}; } catch (e) { return {}; }
}

/**
 * Montagem (geradores em duas etapas ou de uma etapa): lê o pedido da tela e confere o número.
 * numeroDigitado: o número que veio do formulário (vazio = automático). Devolve o rev de SGO_DocRev_preparar_.
 */
function SGO_DocRev_montar_(modulo, payload, sessionIdOuSessao, numeroDigitado, opcoes) {
  var sessao = typeof sessionIdOuSessao === 'object' && sessionIdOuSessao ? sessionIdOuSessao : SGO_DocRev_sessao_(sessionIdOuSessao);
  var rev = SGO_DocRev_preparar_(modulo, payload, sessao, opcoes);
  if (!rev.ehRevisao && !(opcoes && opcoes.permitirNumeroRepetido)) SGO_DocRev_conferirNumeroNovo_(modulo, numeroDigitado);
  return rev;
}

/**
 * Fim da montagem de um gerador em duas etapas: põe o histórico de revisões no HTML, guarda os dados
 * num arquivo privado e marca o HTML com o identificador (a marca sai no salvar). Nunca lança.
 */
// opcoes.semHistorico: o gerador já pôs o histórico no HTML (antes da paginação, por exemplo).
function SGO_DocRev_finalizarMontagem_(modulo, rev, payload, html, numero, opcoes) {
  rev = rev || {};
  if (!rev.numero) rev.numero = SGO_DocRev_s_(numero);
  var h = opcoes && opcoes.semHistorico ? String(html || '') : SGO_DocRev_injetarHtml_(html, rev);
  try { h = SGO_DocRev_marcarHtml_(h, SGO_DocRev_guardarPendente_(modulo, rev, payload)); } catch (e) { /* sem os dados guardados o documento sai igual; o salvar avisa */ }
  return h;
}

/** Salvar (duas etapas), antes de gravar: { html sem a marca, id, rev (ou null) }. */
function SGO_DocRev_abrirSalvamento_(html) {
  var p = SGO_DocRev_extrairPendente_(html);
  var rev = null;
  if (p.id) { try { rev = (SGO_DocRev_lerArquivoDados_(p.id) || {}).rev || null; } catch (e) { rev = null; } }
  return { html: p.html, id: p.id, rev: rev };
}

/** Pedaço do nome do arquivo com a revisão ("RCL-2026 Rev. 01"); sem registro, só o número. */
function SGO_DocRev_numeroComRevisao_(numero, rev) {
  var n = SGO_DocRev_s_(numero);
  if (!rev) return n;
  return (n ? n + ' ' : '') + SGO_DocRev_rotulo_(rev.revisao);
}

/**
 * Dados guardados do documento de origem (correção ou cópia), ou null. Para o gerador reaproveitar o que
 * a tela não consegue devolver (leituras já feitas pela IA, por exemplo). Nunca lança.
 */
function SGO_DocRev_payloadOrigem_(rev) {
  try {
    if (!rev || !rev.origemId) return null;
    var reg = SGO_DocRev_obter_(rev.origemId);
    if (!reg) return null;
    var d = SGO_DocRev_lerDados_(reg);
    return d && d.payload ? d.payload : null;
  } catch (e) { return null; }
}

/**
 * Relatórios de qualificação com aprovação (QUALIF_EMISSOES, módulos *_OFICIAL): "Usar como base" devolve os dados de um
 * relatório emitido para um relatório novo — sem número (atribuído no envio), sem motivo de revisão e sem o rascunho
 * conferido (o texto é gerado de novo). c = { reg, payload } do carregar_ do módulo.
 */
function SGO_DocRev_qeComoBase_(c) {
  var st = SGO_DocRev_s_(c && c.reg && c.reg.STATUS);
  if (st !== 'EMITIDO' && st !== 'SUBSTITUIDO') throw new Error('Só um relatório emitido pode ser usado como base (situação: ' + (st || 'desconhecida') + '). Para um envio devolvido, use "Abrir para corrigir"');
  var d = Object.assign({}, c.payload || {}, { numero: '', motivoRevisao: '', assinaturaContexto: '' });
  return {
    ok: true, dados: d, modo: 'BASE',
    mensagem: 'Dados do relatório ' + SGO_DocRev_s_(c.reg.NUMERO) + ' copiados para um relatório novo (número novo no envio para aprovação; o de origem não muda). Confira as etapas, as datas e os relatórios de ensaio marcados, que são do serviço anterior, gere o rascunho e envie.'
  };
}

/* ============================================================
 * Relatórios de ensaio e planilhas de dados com aprovação (QUALIF_EMISSOES: AUTOCLAVE, LAVADORA, ESTUFA,
 * CADEIA_FRIO e os *_DADOS). Esses geradores já numeram e revisam pelo registro de emissões (mesmo número =
 * revisão seguinte). Aqui entram, sem mexer em cada gerador:
 *  - SGO_DocRev_ensaioAntes_ (chamado por SGO_DocSalvar_finalizarCertificado_): histórico de revisões no documento
 *    quando a emissão é revisão, com o motivo pedido na tela;
 *  - SGO_DocRev_qeEmitido_ (chamado por SGO_QE_marcarSubstituidas_, logo depois de a emissão ser gravada): registro
 *    da emissão com os dados usados, para "Abrir para corrigir" e "Usar como base".
 * ============================================================ */

var SGO_DOCREV_ENSAIO_PENDENTE_ = null; // dados da emissão em andamento (mesma execução)

/** Rótulo do arquivo → módulo do registro de emissões (null quando não é relatório de ensaio nem planilha de dados). */
function SGO_DocRev_moduloDoRotulo_(rotulo) {
  var r = SGO_DocRev_s_(rotulo);
  var mapa = [
    [/^Relatório de ensaio Autoclave/, 'AUTOCLAVE'], [/^Planilha de dados Autoclave/, 'AUTOCLAVE_DADOS'],
    [/^Relatório de ensaio (Termodesinfectora|Lavadora)/, 'LAVADORA'], [/^Planilha de dados (Termodesinfectora|Lavadora)/, 'LAVADORA_DADOS'],
    [/^Relatório de ensaio Estufa/, 'ESTUFA'], [/^Planilha de dados Estufa/, 'ESTUFA_DADOS'],
    [/^Relatório de ensaio Cadeia de Frio/, 'CADEIA_FRIO'], [/^Planilha de dados Cadeia de Frio/, 'CADEIA_FRIO_DADOS']
  ];
  for (var i = 0; i < mapa.length; i++) if (mapa[i][0].test(r)) return mapa[i][1];
  return null;
}

/**
 * Antes de gravar o documento de um relatório de ensaio ou planilha de dados: guarda os dados da emissão e, quando é
 * revisão (rótulo com " rev N"), põe o histórico de revisões no HTML. Devolve o HTML. Nunca lança.
 */
function SGO_DocRev_ensaioAntes_(html, rotulo, payload) {
  try {
    payload = payload || {};
    var modulo = SGO_DocRev_moduloDoRotulo_(rotulo);
    if (!modulo || payload.modoRelatorioSimulado) return html;
    var numero = SGO_DocRev_s_(payload.certNumero);
    var m = / rev (\d+)$/.exec(SGO_DocRev_s_(rotulo));
    var revisao = m ? parseInt(m[1], 10) || 0 : 0;
    var pedido = payload._docRev || {};
    SGO_DOCREV_ENSAIO_PENDENTE_ = { modulo: modulo, numero: numero, payload: payload };
    if (!revisao || !numero) return html;
    var motivo = SGO_DocRev_s_(pedido.modo).toUpperCase() === 'CORRIGIR' ? SGO_DocRev_s_(pedido.motivo) : '';
    var hist = SGO_DocRev_historico_(modulo, numero).filter(function (h) { return h.revisao < revisao; });
    hist.push({ revisao: revisao, rotulo: SGO_DocRev_rotulo_(revisao), em: SGO_DocRev_agora_().slice(0, 10), por: 'conforme a aprovação deste documento', motivo: motivo || 'Reemissão com o mesmo número' });
    return SGO_DocRev_injetarHtml_(html, { ehRevisao: true, numero: numero, rotulo: SGO_DocRev_rotulo_(revisao), historico: hist });
  } catch (e) { return html; }
}

/** Logo depois de uma emissão ser gravada no registro de emissões: registra a emissão aqui também. Nunca lança. */
function SGO_DocRev_qeEmitido_(modulo, numero, idAtual) {
  try {
    if (!/^(AUTOCLAVE|LAVADORA|ESTUFA|CADEIA_FRIO)(_DADOS)?$/.test(String(modulo || ''))) return;
    if (typeof SGO_QE_obter_ !== 'function') return;
    var reg = SGO_QE_obter_(idAtual);
    if (!reg || reg.STATUS !== 'EMITIDO') return;
    var pend = SGO_DOCREV_ENSAIO_PENDENTE_;
    SGO_DOCREV_ENSAIO_PENDENTE_ = null;
    var payload = pend && pend.modulo === modulo && pend.numero === SGO_DocRev_s_(numero) ? pend.payload : null;
    if (!payload) { try { payload = JSON.parse(reg.PAYLOAD_JSON || '{}'); } catch (eP) { payload = {}; } }
    var pedido = (payload && payload._docRev) || {};
    var revisao = parseInt(reg.REVISAO, 10) || 0;
    var corrigir = SGO_DocRev_s_(pedido.modo).toUpperCase() === 'CORRIGIR' && revisao > 0;
    var rev = {
      modo: corrigir ? 'CORRIGIR' : SGO_DocRev_s_(pedido.modo).toUpperCase() === 'BASE' ? 'BASE' : '', numero: SGO_DocRev_s_(numero), revisao: revisao,
      motivo: corrigir ? SGO_DocRev_s_(pedido.motivo) : (revisao > 0 ? 'Reemissão com o mesmo número' : ''), origemId: SGO_DocRev_s_(pedido.origemId),
      form: pedido.form || null, ehRevisao: revisao > 0
    };
    // Dados grandes (fotos, leituras coladas) vão para arquivo privado no registrar_.
    SGO_DocRev_registrar_(modulo, rev, {
      numero: numero, revisao: revisao, payload: payload, titulo: /_DADOS$/.test(modulo) ? 'Planilha de dados' : 'Relatório de ensaio',
      cliente: reg.CLIENTE, cnpj: reg.CNPJ, tag: reg.TAG, equipamentoId: reg.EQUIPAMENTO_ID, pdfId: reg.PDF_ID, htmlId: reg.HTML_ID, pdfUrl: SGO_DocRev_urlArquivo_(reg.PDF_ID), htmlUrl: SGO_DocRev_urlArquivo_(reg.HTML_ID),
      aprovacao: reg.APROVADO_POR ? 'Aprovado por ' + reg.APROVADO_POR + ' em ' + SGO_DocRev_s_(reg.APROVADO_EM).slice(0, 16) : ''
    }, { nome: reg.APROVADO_POR || reg.ENVIADO_POR || '', usuario: reg.APROVADO_LOGIN || '' });
  } catch (e) { /* a emissão já foi gravada no registro de emissões; a correção pela lista fica indisponível só para ela */ }
}

/** Payload sem o pedido de revisão (o que fica guardado e o que o gerador usa). */
function SGO_DocRev_limparPayload_(payload) {
  var p = Object.assign({}, payload || {});
  delete p._docRev;
  // senhas (modo personalizado, simulação) nunca ficam guardadas
  Object.keys(p).forEach(function (k) { if (/senha/i.test(k)) delete p[k]; });
  return p;
}

/** Bloco "Revisão do documento" (identificação + tabela curta do histórico). Vazio na emissão inicial. */
function SGO_DocRev_blocoHtml_(rev) {
  if (!rev || !rev.ehRevisao) return '';
  var linhas = (rev.historico || []).map(function (h) {
    return '<tr><td style="border:.5pt solid #9aa5b1;padding:1mm 2mm;white-space:nowrap">' + SGO_DocRev_esc_(h.rotulo) + '</td>' +
      '<td style="border:.5pt solid #9aa5b1;padding:1mm 2mm;white-space:nowrap">' + SGO_DocRev_esc_(h.em) + '</td>' +
      '<td style="border:.5pt solid #9aa5b1;padding:1mm 2mm">' + SGO_DocRev_esc_(h.motivo || '—') + '</td>' +
      '<td style="border:.5pt solid #9aa5b1;padding:1mm 2mm">' + SGO_DocRev_esc_(h.por || '—') + '</td></tr>';
  }).join('');
  return '<section class="sgo-docrev" style="margin:6mm 0 2mm;font-size:8.5pt;break-inside:avoid;page-break-inside:avoid">' +
    '<p style="margin:0 0 1.5mm;font-weight:700;text-align:left">Histórico de revisões — documento ' + SGO_DocRev_esc_(rev.numero) + ', ' + SGO_DocRev_esc_(rev.rotulo) + '</p>' +
    '<p style="margin:0 0 1.5mm;text-align:left">Esta revisão substitui as anteriores do mesmo número, que permanecem arquivadas.</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:8.5pt"><thead><tr>' +
    '<th style="border:.5pt solid #9aa5b1;padding:1mm 2mm;text-align:left;background:#eef2f6">Revisão</th>' +
    '<th style="border:.5pt solid #9aa5b1;padding:1mm 2mm;text-align:left;background:#eef2f6">Data</th>' +
    '<th style="border:.5pt solid #9aa5b1;padding:1mm 2mm;text-align:left;background:#eef2f6">Motivo</th>' +
    '<th style="border:.5pt solid #9aa5b1;padding:1mm 2mm;text-align:left;background:#eef2f6">Responsável</th>' +
    '</tr></thead><tbody>' + linhas + '</tbody></table></section>';
}

/**
 * Coloca o bloco de revisão no HTML do documento: no marcador <!--SGO_DOCREV--> quando o modelo
 * tiver um; senão antes do fim do último </main>, ou antes de </body>. Na emissão inicial não muda nada.
 */
function SGO_DocRev_injetarHtml_(html, rev) {
  var bloco = SGO_DocRev_blocoHtml_(rev);
  var h = String(html || '');
  if (!bloco) return h;
  if (h.indexOf('<!--SGO_DOCREV-->') >= 0) return h.replace('<!--SGO_DOCREV-->', bloco);
  var iMain = h.lastIndexOf('</main>');
  if (iMain >= 0) return h.slice(0, iMain) + bloco + h.slice(iMain);
  var iBody = h.search(/<\/body>/i);
  if (iBody >= 0) return h.slice(0, iBody) + bloco + h.slice(iBody);
  return h + bloco;
}

/** Anota no arquivo antigo (descrição) que ele foi substituído. Nunca lança. */
function SGO_DocRev_anotarArquivo_(id, texto) {
  if (!SGO_DocRev_s_(id) || typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') return;
  try {
    var arq = DriveApp.getFileById(id);
    var antes = '';
    try { antes = SGO_DocRev_s_(arq.getDescription()); } catch (e0) {}
    arq.setDescription((antes ? antes + '\n' : '') + texto);
  } catch (e) { /* arquivo sem acesso: a marcação fica só no registro */ }
}

/**
 * Registra a emissão (depois de salvar os arquivos). info:
 *  { numero, payload (o que veio da tela), titulo, cliente, cnpj, tag, equipamentoId, pdfId, htmlId, pdfUrl, htmlUrl, aprovacao }
 * Marca as revisões anteriores do mesmo número como substituídas. Nunca apaga nada.
 * Devolve { ok, id, revisao, rotulo, aviso }; não lança (o documento já foi salvo).
 */
function SGO_DocRev_registrar_(modulo, rev, info, sessao) {
  rev = rev || {};
  info = info || {};
  var lock = null;
  try {
    var numero = SGO_DocRev_s_(info.numero || rev.numero);
    if (!numero) throw new Error('documento sem número');
    try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (eL) { lock = null; }
    // info.revisao: o gerador já tem controle de revisão próprio (vale a dele); senão, a próxima do registro.
    var revisao = info.revisao !== undefined && info.revisao !== null && info.revisao !== '' ? Math.max(0, parseInt(info.revisao, 10) || 0)
      : (rev.ehRevisao ? Math.max(parseInt(rev.revisao, 10) || 0, SGO_DocRev_proximaRevisao_(modulo, numero, 0)) : SGO_DocRev_proximaRevisao_(modulo, numero, rev.revisao));
    var dados;
    if (info.dadosArquivoId) {
      dados = { celula: JSON.stringify({ arquivo: info.dadosArquivoId }), arquivoId: info.dadosArquivoId, tamanho: info.dadosTamanho || 1 };
    } else {
      var form = rev.form || ((info.payload && info.payload._docRev) || {}).form || null;
      dados = SGO_DocRev_guardarDados_(modulo, numero, revisao, { v: 1, payload: SGO_DocRev_limparPayload_(info.payload), form: form });
    }
    var id = 'DR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    var agora = SGO_DocRev_agora_();
    var anteriores = SGO_DocRev_doNumero_(modulo, numero).filter(function (r) { return r.STATUS === 'EMITIDO'; });
    SGO_DocRev_inserir_({
      ID: id, MODULO: modulo, NUMERO: numero, REVISAO: String(revisao), STATUS: 'EMITIDO', SUBSTITUIDA_POR: '', MOTIVO: rev.ehRevisao ? rev.motivo : '',
      ORIGEM_ID: rev.origemId || '', EMITIDO_POR: SGO_DocRev_nomeSessao_(sessao), EMITIDO_LOGIN: SGO_DocRev_s_(sessao && sessao.usuario), EMITIDO_EM: agora,
      TITULO: SGO_DocRev_s_(info.titulo), CLIENTE: SGO_DocRev_s_(info.cliente), CNPJ: SGO_DocRev_s_(info.cnpj), TAG: SGO_DocRev_s_(info.tag), EQUIPAMENTO_ID: SGO_DocRev_s_(info.equipamentoId),
      PDF_ID: SGO_DocRev_s_(info.pdfId), HTML_ID: SGO_DocRev_s_(info.htmlId), PDF_URL: SGO_DocRev_s_(info.pdfUrl), HTML_URL: SGO_DocRev_s_(info.htmlUrl), APROVACAO: SGO_DocRev_s_(info.aprovacao),
      DADOS_ARQUIVO_ID: dados.arquivoId, DADOS_TAMANHO: String(dados.tamanho), ATUALIZADO_EM: agora, PAYLOAD_JSON: dados.celula
    });
    var rot = SGO_DocRev_rotulo_(revisao);
    anteriores.forEach(function (r) {
      SGO_DocRev_atualizar_(r, { STATUS: 'SUBSTITUIDO', SUBSTITUIDA_POR: String(revisao) });
      var nota = 'Substituído pela ' + rot + ' em ' + agora.slice(0, 16) + (rev.motivo ? '. Motivo: ' + rev.motivo : '') + '.';
      SGO_DocRev_anotarArquivo_(r.PDF_ID, nota);
      SGO_DocRev_anotarArquivo_(r.HTML_ID, nota);
    });
    try { if (typeof SGO_DATA !== 'undefined' && SGO_DATA && SGO_DATA.log) SGO_DATA.log('DOCUMENTO_' + (rev.ehRevisao ? 'REVISADO' : 'EMITIDO'), SGO_DocRev_nomeSessao_(sessao), SGO_DocRev_nomeModulo_(modulo) + ' ' + numero + ' ' + rot + (rev.ehRevisao ? ' (motivo: ' + rev.motivo + ')' : '') + '.', 'DOCUMENTOS'); } catch (eLog) {}
    return { ok: true, id: id, revisao: revisao, rotulo: rot, aviso: '' };
  } catch (e) {
    return { ok: false, id: '', revisao: parseInt(rev.revisao, 10) || 0, rotulo: SGO_DocRev_rotulo_(rev.revisao), aviso: 'O documento foi gerado e salvo, mas os dados para corrigir depois não foram guardados (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '). Para corrigir este documento mais tarde será preciso preencher o formulário de novo; avise o administrador se repetir.' };
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/**
 * Documento antigo (gerado antes do registro, sem dados guardados): cria a linha da revisão existente
 * para que a correção saia como revisão do mesmo número. Usado pelos geradores que listam documentos
 * a partir da pasta ou do próprio registro. Devolve o ID (o mesmo, se já registrado pelo arquivo).
 */
function SGO_DocRev_registrarAntigo_(modulo, info, sessao) {
  info = info || {};
  var numero = SGO_DocRev_s_(info.numero);
  if (!numero) throw new Error('Este documento antigo não tem número identificável. Use "Usar como base" não está disponível para ele; gere um documento novo pelo formulário');
  var doModulo = SGO_DocRev_lerControle_().filter(function (r) { return r.MODULO === modulo; });
  var peloArquivo = info.pdfId ? doModulo.filter(function (r) { return r.PDF_ID === info.pdfId; })[0] : null;
  if (peloArquivo) return peloArquivo.ID;
  // O número já tem registro (revisão feita depois): vale a revisão vigente.
  var doNumero = doModulo.filter(function (r) { return r.NUMERO === numero; })
    .sort(function (a, b) { return (parseInt(b.REVISAO, 10) || 0) - (parseInt(a.REVISAO, 10) || 0); });
  var vigente = doNumero.filter(function (r) { return r.STATUS === 'EMITIDO'; })[0] || doNumero[0];
  if (vigente) return vigente.ID;
  var id = 'DR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var revAntiga = Math.max(0, parseInt(info.revisao, 10) || 0);
  // Dados recuperados do registro do próprio gerador (grandes vão para arquivo); faltam = o que a tela vai pedir.
  var dadosAntigos = info.payload ? SGO_DocRev_guardarDados_(modulo, numero, revAntiga, { v: 1, payload: info.payload, form: null, parcial: true, faltam: info.faltam || [] }) : null;
  SGO_DocRev_inserir_({
    ID: id, MODULO: modulo, NUMERO: numero, REVISAO: String(revAntiga), STATUS: 'EMITIDO', SUBSTITUIDA_POR: '', MOTIVO: '',
    ORIGEM_ID: '', EMITIDO_POR: SGO_DocRev_s_(info.emitidoPor) || 'Registro anterior', EMITIDO_LOGIN: '', EMITIDO_EM: SGO_DocRev_s_(info.emitidoEm) || SGO_DocRev_agora_(),
    TITULO: SGO_DocRev_s_(info.titulo), CLIENTE: SGO_DocRev_s_(info.cliente), CNPJ: SGO_DocRev_s_(info.cnpj), TAG: SGO_DocRev_s_(info.tag), EQUIPAMENTO_ID: SGO_DocRev_s_(info.equipamentoId),
    PDF_ID: SGO_DocRev_s_(info.pdfId), HTML_ID: SGO_DocRev_s_(info.htmlId), PDF_URL: SGO_DocRev_s_(info.pdfUrl), HTML_URL: SGO_DocRev_s_(info.htmlUrl), APROVACAO: '',
    DADOS_ARQUIVO_ID: dadosAntigos ? dadosAntigos.arquivoId : '', DADOS_TAMANHO: dadosAntigos ? String(dadosAntigos.tamanho) : '0', ATUALIZADO_EM: SGO_DocRev_agora_(),
    PAYLOAD_JSON: dadosAntigos ? dadosAntigos.celula : ''
  });
  return id;
}

/* ============================================================
 * Para a tela (DocRev_api)
 * ============================================================ */

/** Endereço do arquivo pelo identificador (registro antigo sem o endereço). Nunca lança. */
function SGO_DocRev_urlArquivo_(id) {
  id = SGO_DocRev_s_(id);
  if (!id || typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') return '';
  try { return DriveApp.getFileById(id).getUrl(); } catch (e) { return ''; }
}

function SGO_DocRev_itemTela_(r, todas) {
  var rev = parseInt(r.REVISAO, 10) || 0;
  var temDados = !!(SGO_DocRev_s_(r.DADOS_TAMANHO) && SGO_DocRev_s_(r.DADOS_TAMANHO) !== '0');
  return {
    id: r.ID, modulo: r.MODULO, numero: r.NUMERO, revisao: rev, rotulo: SGO_DocRev_rotulo_(rev), status: r.STATUS,
    vigente: r.STATUS === 'EMITIDO', substituidaPor: r.SUBSTITUIDA_POR ? SGO_DocRev_rotulo_(r.SUBSTITUIDA_POR) : '',
    motivo: r.MOTIVO, emitidoPor: r.EMITIDO_POR, emitidoEm: SGO_DocRev_s_(r.EMITIDO_EM).slice(0, 16), titulo: r.TITULO, cliente: r.CLIENTE, cnpj: r.CNPJ, tag: r.TAG,
    equipamentoId: r.EQUIPAMENTO_ID, pdfId: r.PDF_ID, htmlId: r.HTML_ID, pdfUrl: r.PDF_URL || SGO_DocRev_urlArquivo_(r.PDF_ID),
    htmlUrl: r.HTML_URL || SGO_DocRev_urlArquivo_(r.HTML_ID), temDados: temDados
  };
}

function SGO_DocRev_apiListar_(p) {
  var modulos = [].concat(p.modulo || p.modulos || []).map(String);
  if (!modulos.length) throw new Error('Gerador não informado. Atualize a página (F5)');
  var termo = SGO_DocRev_s_(p.termo).toLowerCase();
  var eq = SGO_DocRev_s_(p.equipamentoId), cnpj = SGO_DocRev_s_(p.cnpj).replace(/\D/g, ''), numero = SGO_DocRev_s_(p.numero);
  var todas = SGO_DocRev_lerControle_().filter(function (r) { return modulos.indexOf(r.MODULO) >= 0; });
  var lista = todas.filter(function (r) {
    if (eq && r.EQUIPAMENTO_ID !== eq) return false;
    if (cnpj && SGO_DocRev_s_(r.CNPJ).replace(/\D/g, '') !== cnpj) return false;
    if (numero && r.NUMERO !== numero) return false;
    if (termo && [r.NUMERO, r.TITULO, r.CLIENTE, r.TAG, r.CNPJ].join(' ').toLowerCase().indexOf(termo) < 0) return false;
    return true;
  });
  lista.sort(function (a, b) {
    // mais recente primeiro (EMITIDO_EM dd/MM/yyyy HH:mm:ss)
    function chave(x) { var m = SGO_DocRev_s_(x.EMITIDO_EM).match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2}:\d{2})?/); return m ? m[3] + m[2] + m[1] + (m[4] || '') : SGO_DocRev_s_(x.EMITIDO_EM); }
    return chave(b).localeCompare(chave(a));
  });
  var limite = Math.min(Math.max(parseInt(p.limite, 10) || 60, 1), 300);
  return { ok: true, itens: lista.slice(0, limite).map(function (r) { return SGO_DocRev_itemTela_(r, todas); }), total: lista.length };
}

/**
 * Abre um documento gerado. modo CORRIGIR (mesmo número, próxima revisão) ou BASE (documento novo).
 * Devolve { ok, modo, payload, form, info: { numero, rotuloOrigem, proximaRevisao, rotuloProxima, vigente, aviso, semDados } }.
 */
function SGO_DocRev_apiAbrir_(p) {
  var reg = SGO_DocRev_obter_(p.id);
  if (!reg) throw new Error('Documento não encontrado no registro. Atualize a lista de documentos gerados e tente de novo');
  var modo = SGO_DocRev_s_(p.modo).toUpperCase() === 'BASE' ? 'BASE' : 'CORRIGIR';
  var dados = null, aviso = '';
  try { dados = SGO_DocRev_lerDados_(reg); } catch (e) {
    dados = null;
    aviso = 'Os dados guardados deste documento não puderam ser lidos (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + ').';
  }
  var semDados = !dados || !dados.payload;
  var lista = SGO_DocRev_doNumero_(reg.MODULO, reg.NUMERO);
  var vigente = lista.filter(function (r) { return r.STATUS === 'EMITIDO'; }).pop() || reg;
  var proxima = SGO_DocRev_proximaRevisao_(reg.MODULO, reg.NUMERO, 0);
  if (modo === 'CORRIGIR' && reg.STATUS === 'SUBSTITUIDO') {
    aviso = (aviso ? aviso + ' ' : '') + 'Você abriu a ' + SGO_DocRev_rotulo_(reg.REVISAO) + ', que já foi substituída pela ' + SGO_DocRev_rotulo_(reg.SUBSTITUIDA_POR) + '. A correção sai como ' + SGO_DocRev_rotulo_(proxima) + ' a partir dos dados desta revisão; se a intenção era corrigir a revisão vigente (' + SGO_DocRev_rotulo_(vigente.REVISAO) + '), feche este quadro e abra a vigente.';
  }
  if (semDados) {
    aviso = (aviso ? aviso + ' ' : '') + (dados && dados.parcial ? '' : 'Este documento foi gerado antes de o sistema guardar os dados do formulário (21/10/2026). ') +
      'O formulário abre só com o que foi possível recuperar; preencha o que estiver vazio e gere: ' + (modo === 'CORRIGIR' ? 'sai a ' + SGO_DocRev_rotulo_(proxima) + ' do mesmo número.' : 'sai um documento novo.');
  } else if (dados.faltam && dados.faltam.length) {
    aviso = (aviso ? aviso + ' ' : '') + 'Este documento foi gerado antes de 21/10/2026: o formulário foi remontado com os dados guardados no registro dele. Falta só preencher: ' + dados.faltam.join('; ') + '.';
  }
  var payload = (dados && dados.payload) || {};
  return {
    ok: true, id: reg.ID, modo: modo, modulo: reg.MODULO, payload: payload, form: (dados && dados.form) || null,
    info: {
      numero: reg.NUMERO, rotuloOrigem: SGO_DocRev_rotulo_(reg.REVISAO), proximaRevisao: proxima, rotuloProxima: SGO_DocRev_rotulo_(proxima),
      vigente: reg.STATUS === 'EMITIDO', titulo: reg.TITULO, cliente: reg.CLIENTE, tag: reg.TAG, aviso: aviso, semDados: semDados,
      historico: SGO_DocRev_historico_(reg.MODULO, reg.NUMERO)
    }
  };
}

/** Chamada única do navegador: { sessionId, fn: 'listar'|'abrir'|'historico', payload }. */
function DocRev_api(req) {
  try {
    req = req || {};
    var sessao = exigirSessao(String(req.sessionId || ''));
    if (String((sessao && sessao.perfil) || '').toUpperCase() === 'CLIENTE') throw new Error('A correção de documentos é feita pela equipe da empresa');
    var p = req.payload || {};
    var fn = String(req.fn || '');
    var r;
    if (fn === 'listar') r = SGO_DocRev_apiListar_(p);
    else if (fn === 'abrir') r = SGO_DocRev_apiAbrir_(p);
    else if (fn === 'historico') r = { ok: true, itens: SGO_DocRev_historico_(String(p.modulo || ''), p.numero) };
    else throw new Error('Operação desconhecida: ' + fn + '. Atualize a página (F5)');
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    return { ok: false, erro: String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '.' };
  }
}
