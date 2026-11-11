/**
 * SGO_QualifSimulacao.js — SIMULAÇÃO DIDÁTICA dos documentos de qualificação (11/11/2026, decisão do dono).
 *
 * No modo de dados reconstituídos (simulador com senha administrativa), os documentos podem ser gerados para
 * ensino e demonstração, inclusive o relatório completo de qualificação, a partir dos ensaios simulados.
 * Regras (obrigatórias):
 *  - marca d'água diagonal discreta "SIMULAÇÃO DIDÁTICA" em todas as páginas (position:fixed repete na
 *    impressão); sem faixa vermelha e sem outro texto de aviso (a faixa "aviso-simulado" é retirada);
 *  - numeração própria SIM-AAAA-NNNN (sequência própria; ensaio termina em -E e planilha de dados em -D),
 *    nunca a numeração oficial;
 *  - registro em aba própria (QUALIF_SIMULACOES), separada de QUALIF_EMISSOES: nunca entra na ficha do
 *    equipamento, no QR code, no Arquivo de documentos, na situação de qualificação, em "Enviar ao cliente",
 *    nas pendências nem conta como qualificação. O HTML fica numa pasta própria do Drive (fora das pastas
 *    dos clientes);
 *  - o relatório completo simulado só consolida ensaios simulados (nunca mistura com oficiais).
 * O caminho oficial não muda. Só é usado quando os dados vêm do simulador (modoEntrada SIMULADO_ADMIN, que
 * exige a senha administrativa em cada chamada).
 */

var SGO_QSIM_ABA = 'QUALIF_SIMULACOES';
var SGO_QSIM_CAMPOS = ['ID', 'MODULO', 'TIPO', 'NUMERO', 'CLIENTE', 'CNPJ', 'TAG', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'RESULTADO',
  'CRIADO_POR', 'CRIADO_EM', 'HTML_ID', 'RESUMO_JSON', 'ORIGEM_JSON'];
var SGO_QSIM_PROP_SEQ = 'SGO_QSIM_SEQ_';
var SGO_QSIM_PROP_PASTA = 'SGO_QSIM_PASTA_ID';
var SGO_QSIM_TEXTO = 'SIMULAÇÃO DIDÁTICA';
var SGO_QSIM_MEMORIA_ = null; // só nos testes (sem banco)

function SGO_QSIM_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/** Os dados vêm do simulador administrativo (senha conferida pelo módulo na análise)? */
function SGO_QSIM_ativo_(payload) {
  return SGO_QSIM_s_(payload && payload.modoEntrada).toUpperCase() === 'SIMULADO_ADMIN';
}

function SGO_QSIM_ehNumeroSimulacao_(numero) { return /^SIM-\d{4}-\d{4,}(-[ED])?$/.test(SGO_QSIM_s_(numero)); }

/* ---------------- Marca d'água ---------------- */

function SGO_QSIM_estiloMarca_() {
  return '<style id="sgo-sim-didatica-estilo">.sgo-sim-didatica{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);' +
    'font:700 21pt Arial,Helvetica,sans-serif;letter-spacing:.12em;color:rgba(190,30,30,.13);white-space:nowrap;pointer-events:none;user-select:none;z-index:2147483000;' +
    '-webkit-print-color-adjust:exact;print-color-adjust:exact}@media print{.sgo-sim-didatica{position:fixed}}</style>';
}

/**
 * Aplica a marca d'água num documento HTML completo: retira a faixa "aviso-simulado" (sem outro texto de aviso),
 * acrescenta o estilo no <head> e a marca logo depois de <body> e no início de cada página paginada (.pagina).
 */
function SGO_QSIM_marca_(html) {
  var h = String(html || '');
  if (h.indexOf('sgo-sim-didatica-estilo') >= 0) return h;
  h = h.replace(/<div class="aviso-simulado"[^>]*>[^<]*<\/div>/g, '').replace(/<div class="sgo-docsalvar-aviso"[^>]*>[^<]*<\/div>/g, '')
    .replace(/<style>@media print\{\.sgo-docsalvar-aviso\{display:none!important\}\}<\/style>/g, '');
  var marca = '<div class="sgo-sim-didatica" aria-hidden="true">' + SGO_QSIM_TEXTO + '</div>';
  if (/<\/head>/i.test(h)) h = h.replace(/<\/head>/i, SGO_QSIM_estiloMarca_() + '</head>');
  else h = SGO_QSIM_estiloMarca_() + h;
  if (/<body[^>]*>/i.test(h)) h = h.replace(/<body[^>]*>/i, function (m) { return m + marca; });
  else h = marca + h;
  return h;
}

/* ---------------- Registro (aba própria) ---------------- */

function SGO_QSIM_aba_() {
  if (typeof SGO_DATA === 'undefined' || !SGO_DATA.getDB) return null;
  var ss = SGO_DATA.getDB();
  var aba = ss.getSheetByName(SGO_QSIM_ABA);
  if (!aba) {
    aba = ss.insertSheet(SGO_QSIM_ABA);
    aba.getRange(1, 1, 1, SGO_QSIM_CAMPOS.length).setValues([SGO_QSIM_CAMPOS]);
  }
  return aba;
}

function SGO_QSIM_lerTudo_() {
  var aba = SGO_QSIM_aba_();
  if (!aba) { SGO_QSIM_MEMORIA_ = SGO_QSIM_MEMORIA_ || []; return SGO_QSIM_MEMORIA_.map(function (r) { return Object.assign({}, r); }); }
  var ult = aba.getLastRow();
  if (ult < 2) return [];
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  return aba.getRange(2, 1, ult - 1, cab.length).getValues().map(function (l) {
    var o = {};
    cab.forEach(function (c, i) { o[c] = l[i] instanceof Date ? l[i].toISOString() : (l[i] === null || l[i] === undefined ? '' : String(l[i])); });
    return o;
  });
}

function SGO_QSIM_registrar_(dados) {
  var reg = {};
  SGO_QSIM_CAMPOS.forEach(function (c) { reg[c] = dados[c] === undefined || dados[c] === null ? '' : String(dados[c]); });
  reg.ID = 'SIM' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  var aba = SGO_QSIM_aba_();
  if (!aba) { SGO_QSIM_MEMORIA_ = SGO_QSIM_MEMORIA_ || []; SGO_QSIM_MEMORIA_.push(reg); return reg.ID; }
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  aba.appendRow(cab.map(function (c) { return reg[c] === undefined ? '' : reg[c]; }));
  return reg.ID;
}

function SGO_QSIM_obter_(id) {
  var s = SGO_QSIM_s_(id);
  return SGO_QSIM_lerTudo_().filter(function (r) { return r.ID === s; })[0] || null;
}

/* ---------------- Numeração própria ---------------- */

/** SIM-AAAA-NNNN (+ sufixo -E ensaio, -D planilha de dados). Sequência própria, nunca a oficial. */
function SGO_QSIM_proximoNumero_(sufixo) {
  var ano = '';
  try { ano = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy'); } catch (e) { ano = String(new Date().getFullYear()); }
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var chave = SGO_QSIM_PROP_SEQ + ano;
    var n = (parseInt(props.getProperty(chave), 10) || 0) + 1;
    var usados = {};
    SGO_QSIM_lerTudo_().forEach(function (r) { usados[String(r.NUMERO).replace(/-[ED]$/, '')] = true; });
    while (usados['SIM-' + ano + '-' + ('000' + n).slice(-4)]) n++;
    props.setProperty(chave, String(n));
    return 'SIM-' + ano + '-' + ('000' + n).slice(-4) + (sufixo ? '-' + sufixo : '');
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/* ---------------- Pasta própria e gravação ---------------- */

function SGO_QSIM_pasta_() {
  var props = PropertiesService.getScriptProperties();
  var id = SGO_QSIM_s_(props.getProperty(SGO_QSIM_PROP_PASTA));
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var raiz = DriveApp.getRootFolder(), nome = 'SGO+ - Simulações didáticas (não entregar a clientes)';
  var it = raiz.getFoldersByName(nome);
  var pasta = it.hasNext() ? it.next() : raiz.createFolder(nome);
  props.setProperty(SGO_QSIM_PROP_PASTA, pasta.getId());
  return pasta;
}

function SGO_QSIM_nomeSessao_(sessao) { return SGO_QSIM_s_(sessao && (sessao.nome || sessao.usuario || sessao.login)); }

/**
 * Guarda um documento simulado: marca d'água, HTML na pasta própria e linha na aba QUALIF_SIMULACOES.
 * d: { modulo, tipo: ENSAIO|DADOS|QUALIFICACAO, numero, html, ident:{cliente,cnpj,tag,clienteId,unidadeId,equipamentoId}, resultado, resumo, origem, sessao }
 */
function SGO_QSIM_guardar_(d) {
  var html = SGO_QSIM_marca_(d.html);
  var ident = d.ident || {};
  var htmlId = '', htmlUrl = '';
  try {
    var arq = SGO_QSIM_pasta_().createFile('SIMULAÇÃO DIDÁTICA - ' + d.numero + ' - ' + ({ ENSAIO: 'Relatório de ensaio', DADOS: 'Planilha de dados', QUALIFICACAO: 'Relatório de qualificação' }[d.tipo] || d.tipo) + ' - ' + (SGO_QSIM_s_(ident.tag) || 'sem TAG') + '.html', html, 'text/html');
    htmlId = arq.getId(); htmlUrl = arq.getUrl();
  } catch (e) { htmlId = ''; }
  var agora = '';
  try { agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'); } catch (e2) { agora = new Date().toISOString(); }
  var id = SGO_QSIM_registrar_({
    MODULO: SGO_QSIM_s_(d.modulo).toUpperCase(), TIPO: d.tipo, NUMERO: d.numero, CLIENTE: ident.cliente, CNPJ: ident.cnpj, TAG: ident.tag,
    CLIENTE_ID: ident.clienteId, UNIDADE_ID: ident.unidadeId, EQUIPAMENTO_ID: ident.equipamentoId, RESULTADO: d.resultado,
    CRIADO_POR: SGO_QSIM_nomeSessao_(d.sessao), CRIADO_EM: agora, HTML_ID: htmlId,
    RESUMO_JSON: d.resumo ? JSON.stringify(d.resumo) : '', ORIGEM_JSON: d.origem ? JSON.stringify(d.origem) : ''
  });
  return { id: id, numero: d.numero, html: html, htmlId: htmlId, htmlUrl: htmlUrl,
    aviso: 'Simulação didática ' + d.numero + ' guardada na lista "Simulações didáticas" deste módulo. Ela não entra na ficha do equipamento, no QR code, no Arquivo de documentos nem conta como qualificação.' };
}

/* ---------------- Consulta (lista do módulo) ---------------- */

function SGO_QSIM_listar_(modulo, tipo) {
  var m = SGO_QSIM_s_(modulo).toUpperCase();
  return SGO_QSIM_lerTudo_().filter(function (r) { return r.MODULO === m && (!tipo || r.TIPO === tipo); })
    .map(function (r) { return { id: r.ID, tipo: r.TIPO, rotulo: { ENSAIO: 'Relatório de ensaio', DADOS: 'Planilha de dados', QUALIFICACAO: 'Relatório de qualificação' }[r.TIPO] || r.TIPO, numero: r.NUMERO, tag: r.TAG, cliente: r.CLIENTE, equipamentoId: r.EQUIPAMENTO_ID, resultado: r.RESULTADO, criadoPor: r.CRIADO_POR, criadoEm: r.CRIADO_EM, temArquivo: !!r.HTML_ID }; })
    .sort(function (a, b) { return String(b.numero).localeCompare(String(a.numero)); });
}

/** HTML de uma simulação do módulo (para reabrir/baixar). Sempre com a marca d'água. */
function SGO_QSIM_abrir_(modulo, id) {
  var r = SGO_QSIM_obter_(id);
  if (!r || r.MODULO !== SGO_QSIM_s_(modulo).toUpperCase()) throw new Error('Simulação não encontrada neste módulo. Atualize a lista.');
  var html = '';
  if (r.HTML_ID) { try { html = DriveApp.getFileById(r.HTML_ID).getBlob().getDataAsString('UTF-8'); } catch (e) { html = ''; } }
  if (!html) throw new Error('O arquivo da simulação ' + r.NUMERO + ' não foi encontrado na pasta de simulações. Gere a simulação de novo.');
  return { ok: true, numero: r.NUMERO, html: SGO_QSIM_marca_(html) };
}

/** Resumo de um ensaio simulado do módulo (para o relatório de qualificação simulado). */
function SGO_QSIM_ensaio_(modulo, id) {
  var r = SGO_QSIM_obter_(id);
  if (!r || r.MODULO !== SGO_QSIM_s_(modulo).toUpperCase() || r.TIPO !== 'ENSAIO') return null;
  var resumo = null;
  try { resumo = JSON.parse(r.RESUMO_JSON || 'null'); } catch (e) { resumo = null; }
  return { reg: r, resumo: resumo };
}

/* ---------------- Comum aos módulos (ensaio simulado e relatório completo simulado) ---------------- */

/**
 * Dados reconstituídos com senha (os módulos conferem a senha na análise; aqui ela é conferida de novo com o
 * validador do módulo antes de gastar número SIM). Usado nos pontos de emissão do relatório de ensaio e da planilha.
 */
function SGO_QSIM_doSimulador_(payload, validarSenha) {
  // Só o simulador administrativo (SIMULADO_ADMIN). Outros modos internos (ex.: estanqueidade reconstituída) seguem como antes.
  if (!SGO_QSIM_ativo_(payload)) return false;
  if (typeof validarSenha === 'function') validarSenha(payload.simulacaoSenha);
  return true;
}

/** Ensaio simulado do módulo para o relatório completo simulado → { ok, reg, resumo } ou { ok:false, trava }. */
function SGO_QSIM_ensaioQualif_(modulo, id, ident) {
  function trava(codigo, texto, fazer) { return { ok: false, trava: { codigo: codigo, texto: texto, comoCorrigir: fazer } }; }
  var s = SGO_QSIM_ensaio_(modulo, id);
  if (!s) return trava('SIM_NAO_ENCONTRADO', 'O relatório de ensaio simulado escolhido não foi encontrado (só entram relatórios de ensaio da simulação didática deste módulo).', 'Atualize a lista "Simulações didáticas" e marque de novo.');
  var eq = SGO_QSIM_s_(s.reg.EQUIPAMENTO_ID);
  if (eq && eq !== SGO_QSIM_s_(ident && ident.equipamentoId)) return trava('SIM_OUTRO_EQUIPAMENTO', 'A simulação ' + s.reg.NUMERO + ' foi feita para outro equipamento.', 'Desmarque esta simulação ou escolha o mesmo equipamento.');
  if (!s.resumo) return trava('SIM_SEM_RESUMO', 'A simulação ' + s.reg.NUMERO + ' não tem o resumo dos resultados.', 'Gere de novo o relatório de ensaio simulado.');
  return { ok: true, reg: s.reg, resumo: s.resumo };
}

/**
 * Relatório completo de qualificação SIMULADO (comum). m: { modulo, validarSenha(senha), montar(sessionId, p, opcoes),
 * textos(ctx), html(ctx, textos, o), ensaiosDoCtx(ctx) }. Texto padrão (sem IA), número SIM, marca d'água, só a
 * aba QUALIF_SIMULACOES: nada em QUALIF_EMISSOES, no Arquivo de documentos ou na situação do equipamento.
 */
function SGO_QSIM_gerarQualificacao_(m, p, sessao, sessionId) {
  p = p || {};
  m.validarSenha(p.simulacaoSenha);
  var ctx = m.montar(sessionId, p, { simulacao: true });
  if (ctx.emissaoBloqueada) return { ok: true, bloqueado: true, travas: ctx.travas };
  var textos = m.textos(ctx), numero = SGO_QSIM_proximoNumero_('');
  var html = m.html(ctx, textos, { numero: numero, revisao: '0', enviadoPor: SGO_QSIM_nomeSessao_(sessao) });
  if (typeof SGO_DocA4_prepararSumario_ === 'function') html = SGO_DocA4_prepararSumario_(html).html;
  var ens = (m.ensaiosDoCtx ? m.ensaiosDoCtx(ctx) : ctx.ensaios) || [];
  var g = SGO_QSIM_guardar_({ modulo: m.modulo, tipo: 'QUALIFICACAO', numero: numero, html: html, ident: ctx.identificacao, resultado: ctx.statusConsolidado, sessao: sessao,
    resumo: { status: ctx.statusConsolidado, validadeAte: ctx.validadeAte, etapas: ctx.etapas, ensaios: ens.map(function (x) { return { id: x.emissaoId, numero: x.numero, resultado: x.resultado }; }) } });
  return { ok: true, bloqueado: false, numero: numero, html: g.html, resultado: ctx.statusConsolidado, simulacaoId: g.id, mensagem: g.aviso };
}

/** Hook comum na emissão do relatório de ensaio / planilha simulados: guarda e ajusta a resposta. */
function SGO_QSIM_aposEmitir_(r, d) {
  var g = SGO_QSIM_guardar_(d);
  r.html = g.html; r.simulacaoDidatica = { id: g.id, numero: d.numero }; r.avisoSalvar = g.aviso;
  r.pdfId = ''; r.pdfUrl = ''; r.pastaUrl = ''; r.htmlId = ''; r.htmlUrl = ''; r.numero = d.numero;
  return r;
}
