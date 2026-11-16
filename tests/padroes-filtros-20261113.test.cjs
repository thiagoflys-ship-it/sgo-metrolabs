// Relato de 13/11/2026: "Os filtros do módulo de padrões não estão funcionando em sua totalidade." Na tela, Situação =
// "Ativos", Local = "Todos os locais", Ordenar = "Local": os números do resumo diziam 111 ativos, mas a contagem dizia
// "36 padrões no filtro: vencidos" e a lista mostrava só vencidos. Causa: dois padrões ATIVOS com a TAG gravada como
// NÚMERO na planilha (260101580 e 260553499); a lista comparava TAG com localeCompare e parava no meio do desenho.
// Este teste cobre a revisão inteira do módulo: TAG e outros textos numéricos, todas as combinações de filtro e
// ordenação (contagem, números do resumo, campos e lista coerentes), datas em vários formatos e fuso de São Paulo,
// e a garantia de que padrão vencido ou com data inválida não entra em certificado.
// Funções reais do servidor (SGO_CertCal_Main.js, SGO_Padroes.js, SGO_Padroes_Documentos.js,
// SGO_CertCal_GestaoRelatorios.js) sobre planilhas em memória e a tela completa (CertCal_obterConteudoModulo) num
// Chromium. Só dados fictícios. Sem rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const gas = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8');
const SITE = 'https://sgo.exemplo.test';
let chromium = null;
try { chromium = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

/* ---------- datas relativas a hoje em São Paulo ---------- */
const DIA = 864e5;
const pad = n => String(n).padStart(2, '0');
function hojeSP() { const p = gas.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd').split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
const dt = off => new Date(hojeSP() + off * DIA);
const br = off => { const d = dt(off); return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const brCurto = off => { const d = dt(off); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
const iso = off => dt(off).toISOString().slice(0, 10);
const serial = off => Math.round((hojeSP() + off * DIA - Date.UTC(1899, 11, 30)) / DIA);

/* ---------- acervo fictício: cada caso de borda da auditoria ---------- */
// st = situação esperada (classificação do servidor).
const ACERVO = [
  { ID: 'n1', TAG: 260101580, DESCRICAO: 'TACOMETRO DIGITAL', VALIDADE: br(-10), STATUS: 'ATIVO', CERT: 2024001, pdf: true, x: { LOCALIZACAO: 'Laboratório', GRANDEZA: 'Rotação' }, st: 'VENCIDO' },
  { ID: 7, TAG: 260553499, DESCRICAO: 'TERMOMETRODIGITAL', VALIDADE: iso(200), STATUS: 'ATIVO', CERT: 'T-77', pdf: false, x: { LOCALIZACAO: 'CME', GRANDEZA: 'Temperatura' }, st: 'OK' },
  { ID: 'g1', TAG: 'REG-001 (CANAL1)', DESCRICAO: 'Registrador - canal 1', VALIDADE: br(100), STATUS: 'ATIVO', CERT: 'C-1', pdf: true, x: { LOCALIZACAO: 'CME', GRANDEZA: 'Temperatura' }, st: 'OK' },
  { ID: 'g2', TAG: 'REG-001 (CANAL2)', DESCRICAO: 'Registrador - canal 2', VALIDADE: br(20), STATUS: 'ATIVO', CERT: 'C-1', pdf: true, x: { LOCALIZACAO: 'CME', GRANDEZA: 'Temperatura' }, st: 'VENCENDO' },
  { ID: 'g3', TAG: 'REG-001 (CANAL3)', DESCRICAO: 'Registrador - canal 3', VALIDADE: br(100), STATUS: 'ATIVO', CERT: 'C-1', pdf: true, x: { LOCALIZACAO: 'CME', GRANDEZA: 'Temperatura' }, st: 'OK' },
  { ID: 'h0', TAG: 'VH-01', DESCRICAO: 'Manômetro que vence hoje', VALIDADE: br(0), STATUS: 'ATIVO', CERT: 'M-1', pdf: true, x: { LOCALIZACAO: 'Laboratório', GRANDEZA: 'Pressão' }, st: 'VENCIDO' },
  { ID: 'h1', TAG: 'VA-01', DESCRICAO: 'Vence amanhã', VALIDADE: br(1), STATUS: 'ATIVO', CERT: 'A-1', pdf: true, x: { LOCALIZACAO: 'Laboratório', GRANDEZA: 'Pressão' }, st: 'VENCENDO' },
  { ID: 'h30', TAG: 'V30-01', DESCRICAO: 'Vence em 30 dias', VALIDADE: br(30), STATUS: 'ATIVO', CERT: 'B-1', pdf: false, x: {}, st: 'VENCENDO' },
  { ID: 'h31', TAG: 'V31-01', DESCRICAO: 'Vence em 31 dias', VALIDADE: br(31), STATUS: 'ATIVO', CERT: 'B-2', pdf: false, x: {}, st: 'OK' },
  { ID: 'sv', TAG: 'SV-01', DESCRICAO: 'Sem validade', VALIDADE: '', STATUS: 'ATIVO', CERT: '', pdf: false, x: {}, st: 'SEM_VALIDADE' },
  { ID: 'inv', TAG: 'INV-01', DESCRICAO: 'Data impossível', VALIDADE: '31/02/2026', STATUS: 'ATIVO', CERT: 'I-1', pdf: true, x: { LOCALIZACAO: 'CME' }, st: 'VALIDADE_INVALIDA' },
  { ID: 'ser', TAG: 'SER-01', DESCRICAO: 'Validade como número da planilha', VALIDADE: serial(60), STATUS: 'ATIVO', CERT: 'S-1', pdf: true, x: { GRANDEZA: 'Temperatura' }, st: 'OK' },
  { ID: 'curta', TAG: 'CUR-01', DESCRICAO: 'Validade d/m/aaaa', VALIDADE: brCurto(45), STATUS: 'ATIVO', CERT: 'D-1', pdf: true, x: { LOCALIZACAO: 'Laboratório' }, st: 'OK' },
  { ID: 'inat', TAG: 'INAT-01', DESCRICAO: 'Inativo e vencido', VALIDADE: br(-400), STATUS: 'INATIVO', CERT: 'X-1', pdf: false, x: { LOCALIZACAO: 'CME', GRANDEZA: 'Temperatura' }, st: 'VENCIDO' },
  { ID: 'low', TAG: 'LOW-01', DESCRICAO: 12345, VALIDADE: br(90), STATUS: ' ativo ', CERT: 'L-1', pdf: true, x: { SERIE: 98765, MARCA: 'Ômega' }, st: 'OK' },
  { ID: 'z', TAG: 'ZZ-9', DESCRICAO: 'Termômetro de bulbo', VALIDADE: br(-1), STATUS: 'ATIVO', CERT: 'Z-1', pdf: false, x: { LOCALIZACAO: 'Laboratório', GRANDEZA: 'Temperatura' }, st: 'VENCIDO' },
];

/** Ambiente com as funções reais do módulo e planilhas, arquivos e IA em memória (mesmo modelo de padroes-certificado-novo). */
function ambiente(opcoes) {
  opcoes = opcoes || {};
  const H = {
    CAD_PADROES: ['ID', 'TAG', 'DESCRICAO', 'INCERTEZA_U95', 'FATOR_K', 'VEFF', 'CERTIFICADO_NUMERO', 'VALIDADE', 'LINK_CERTIFICADO_PDF', 'STATUS', 'CRIADO_EM'],
    PADROES_CONTROLE_DOCUMENTAL: ['ID', 'DADOS_JSON', 'REVISAO', 'ATUALIZADO_EM', 'ATUALIZADO_POR'],
    CAD_TECNICOS: ['ID', 'NOME', 'STATUS', 'USUARIO_ID'],
  };
  const T = { CAD_PADROES: [], PADROES_CONTROLE_DOCUMENTAL: [], CAD_TECNICOS: [] };
  const arquivos = {};
  const pastas = new Set();
  const novoArquivo = (nome, tipo, bytes, pasta) => { const id = 'arq' + crypto.randomBytes(8).toString('hex'); arquivos[id] = { id, nome, tipo, bytes: Buffer.from(bytes), pasta }; return arquivo(id); };
  const arquivo = id => { const a = arquivos[id]; if (!a) throw new Error('Arquivo não encontrado: ' + id);
    return { getId: () => id, getName: () => a.nome, getMimeType: () => a.tipo, getSize: () => a.bytes.length, getUrl: () => SITE + '/arquivos/' + id,
      getDateCreated: () => new Date(), setSharing() {}, getBlob: () => ({ getBytes: () => Array.from(a.bytes, b => (b > 127 ? b - 256 : b)), getContentType: () => a.tipo }) }; };
  const pasta = nome => ({ nome, getId: () => nome, getFoldersByName: n => { const f = pastas.has(nome + '/' + n); return { hasNext: () => f, next: () => pasta(nome + '/' + n) }; },
    createFolder: n => { pastas.add(nome + '/' + n); return pasta(nome + '/' + n); },
    createFile: blob => novoArquivo(blob.nome, blob.tipo, blob.bytes, nome),
    getFiles: () => { const l = Object.values(arquivos).filter(a => a.pasta === nome).map(a => arquivo(a.id)); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; } });
  const sessoes = {
    's-bento': { perfil: 'TECNICO', area: 'METROLOGIA', usuario: 'tecnico.metrologia', userId: 'u-tec' },
    's-comercial': { perfil: 'COMERCIAL', usuario: 'vendas', userId: 'u-com' },
    's-cliente': { perfil: 'CLIENTE', usuario: 'cliente', userId: 'u-cli' },
  };
  const c = {
    console, Session: gas.criarSession(),
    Utilities: gas.criarUtilities({
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (alg, v) => Array.from(crypto.createHash('sha256').update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(Array.from(v, b => b & 255))).digest()),
      base64EncodeWebSafe: b => Buffer.from(Array.from(b, x => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64Decode: s => Array.from(Buffer.from(s, 'base64'), b => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, tipo, nome) => ({ bytes: Buffer.from(Array.from(bytes, b => b & 255)), tipo, nome }),
    }),
    SGO_CFG: { DB_ID: 'db1', SHEETS: { CAD_PADROES: 'CAD_PADROES', CAD_TECNICOS: 'CAD_TECNICOS', CERT_CALIBRACAO: 'CERT_CALIBRACAO' }, SISTEMA: { TIMEZONE: 'America/Sao_Paulo' } },
    SGO_UTILS: { safe: v => (v == null ? '' : String(v).trim()), safeUpper: v => (v == null ? '' : String(v).trim()).toUpperCase() },
    exigirSessao: sid => { const s = sessoes[sid]; if (!s) throw new Error('Sessão inválida.'); return s; },
    isAdminSession: sid => sid === 's-admin',
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    DriveApp: { getFileById: id => arquivo(id), getFolderById: id => pasta(id), Access: { ANYONE_WITH_LINK: 'A' }, Permission: { VIEW: 'V' } },
    UrlFetchApp: { fetch: () => { throw new Error('sem rede no teste'); } },
    Sheets: { Spreadsheets: {
      get: () => ({ sheets: Object.keys(T).map(t => ({ properties: { title: t } })) }),
      // Igual ao UNFORMATTED_VALUE: número gravado na planilha volta como número.
      Values: { batchGet: (db, o) => ({ valueRanges: o.ranges.map(r => { const n = r.replace(/^'|'$/g, ''); return { values: [H[n]].concat(T[n].map(l => H[n].map(h => (l[h] == null ? '' : l[h])))) }; }) }) },
      batchUpdate: (req) => { req.requests.forEach(q => { if (!q.updateCells) return; const st = q.updateCells.start; const n = st.sheetId; let l = T[n][st.rowIndex - 1]; if (!l) { l = {}; T[n][st.rowIndex - 1] = l; }
        l[H[n][st.columnIndex]] = q.updateCells.rows[0].values[0].userEnteredValue.stringValue; }); },
    } },
  };
  c.SGO_DATA = {
    getAll: n => (T[n] || []).filter(Boolean).map(r => Object.assign({}, r)),
    getById: (n, id) => { const r = (T[n] || []).find(x => x && String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
    findIndexById: (n, id) => { const i = (T[n] || []).findIndex(x => x && String(x.ID) === String(id)); return i < 0 ? -1 : i + 2; },
    getHeaders: n => H[n].slice(),
    getSheet: n => ({ getSheetId: () => n, getMaxRows: () => 1000, getLastRow: () => T[n].length + 1, insertRowsAfter() {}, getRange: () => ({ setNumberFormat() {} }) }),
    getDB: () => ({ getId: () => 'db1', getSheetByName: () => null }),
    update: (n, id, o) => { const r = T[n].find(x => x && String(x.ID) === String(id)); if (!r) return false; Object.assign(r, o); return true; },
    insert: (n, o) => { T[n].push(Object.assign({}, o)); },
    normalizarObjetoParaSheet: (n, o) => o,
    gerarRegistroBase: o => Object.assign({ ID: 'p' + (T.CAD_PADROES.length + 1), CRIADO_EM: '2026-01-01' }, o),
    log() {},
  };
  if (opcoes.Date) c.Date = opcoes.Date;
  vm.createContext(c);
  for (const f of ['SGO_CertCal_Config.js', 'SGO_CertCal_Calculo.js', 'SGO_CertCal_Main.js', 'SGO_Padroes.js', 'SGO_Padroes_Documentos.js', 'SGO_CertCal_GestaoRelatorios.js']) vm.runInContext(ler(f), c, { filename: f });
  const nomes = new Set((ler('SGO_CertCal_Main.js').match(/:(CertCal_api\w+)/g) || []).map(x => x.slice(1)));
  nomes.forEach(n => { if (typeof c[n] !== 'function') c[n] = () => { throw new Error('fora do teste: ' + n); }; });
  vm.runInContext('CertCal_bootstrap_=function(){};PadDoc_bootstrap_=function(){};CertCal_obterPastaDocumentos_=function(){return DriveApp.getFolderById("raiz");};', c);
  for (const p of (opcoes.acervo || ACERVO)) {
    const link = p.pdf ? novoArquivo('cert-' + p.ID + '.pdf', 'application/pdf', Buffer.from('%PDF-1.4\n%%EOF\n'), 'raiz').getUrl() : '';
    T.CAD_PADROES.push({ ID: p.ID, TAG: p.TAG, DESCRICAO: p.DESCRICAO, INCERTEZA_U95: '0,5', FATOR_K: 2, VEFF: 0, CERTIFICADO_NUMERO: p.CERT, VALIDADE: p.VALIDADE, LINK_CERTIFICADO_PDF: link, STATUS: p.STATUS, CRIADO_EM: '2026-01-01' });
    if (p.x && Object.keys(p.x).length) T.PADROES_CONTROLE_DOCUMENTAL.push({ ID: String(p.ID), REVISAO: 'r0', DADOS_JSON: JSON.stringify(Object.assign({}, p.x, p.extra || {})) });
  }
  const api = (sid, fn, payload) => c.CertCal_apiDispatch({ sessionId: sid, fn, payload: payload || {} });
  return { c, T, api };
}

/* ---------- oráculo independente da tela ---------- */
const SEV = { VENCIDO: 0, VALIDADE_INVALIDA: 0, SEM_VALIDADE: 1, VENCENDO: 2, OK: 3 };
const semAcento = s => String(s == null ? '' : s).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const dataNum = v => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || '')); return m ? Number(m[3] + m[2] + m[1]) : 99999999; };
function modelo() {
  return ACERVO.map(p => {
    const ativo = String(p.STATUS).trim().toUpperCase() === 'ATIVO';
    let validade = String(p.VALIDADE);
    if (typeof p.VALIDADE === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + p.VALIDADE * DIA); validade = pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(validade)) { const [a, m, d] = validade.split('-'); validade = d + '/' + m + '/' + a; }
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(validade) && p.st !== 'VALIDADE_INVALIDA') { const [d, m, a] = validade.split('/'); validade = pad(d) + '/' + pad(m) + '/' + a; }
    return { id: String(p.ID), tag: String(p.TAG), desc: String(p.DESCRICAO), ativo, st: p.st, link: !!p.pdf, local: String(p.x.LOCALIZACAO || ''), grandeza: String(p.x.GRANDEZA || ''),
      texto: [p.TAG, p.DESCRICAO, p.x.SERIE || '', p.x.MARCA || '', '', p.CERT].join(' '), validade, sev: ativo ? SEV[p.st] : 4 };
  });
}
function passaSit(x, f) {
  if (f === 'TODOS') return true; if (f === 'INATIVO') return !x.ativo; if (!x.ativo) return false;
  if (f === 'VENCIDO') return x.st === 'VENCIDO' || x.st === 'VALIDADE_INVALIDA';
  if (['VENCENDO', 'OK', 'SEM_VALIDADE'].includes(f)) return x.st === f;
  if (f === 'SEM_PDF') return !x.link; return true;
}
function passaOutros(x, k) {
  if (k.local && (k.local === '__SEM__' ? x.local : x.local !== k.local)) return false;
  if (k.grandeza && (k.grandeza === '__SEM__' ? x.grandeza : x.grandeza !== k.grandeza)) return false;
  const q = semAcento(k.busca); return !q || semAcento(x.texto).indexOf(q) >= 0;
}
const cmpTag = (a, b) => a.localeCompare(b, 'pt-BR', { numeric: true });
function ordenar(l, ordem) {
  return l.slice().sort((a, b) => {
    if (ordem === 'TAG') return cmpTag(a.tag, b.tag);
    if (ordem === 'VALIDADE') return (dataNum(a.validade) - dataNum(b.validade)) || cmpTag(a.tag, b.tag);
    if (ordem === 'LOCAL') return ((a.local ? 0 : 1) - (b.local ? 0 : 1)) || a.local.localeCompare(b.local, 'pt-BR') || cmpTag(a.tag, b.tag);
    return (a.sev - b.sev) || (dataNum(a.validade) - dataNum(b.validade)) || cmpTag(a.tag, b.tag);
  });
}

/* ---------- tela completa num Chromium ---------- */
function pagina(perfil) {
  const ctx = { HtmlService: { createHtmlOutputFromFile: n => ({ getContent: () => ler(n + '.html') }) } };
  vm.runInNewContext(ler('SGO_CertCal_ConteudoModulo.js'), ctx);
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="tplCertCalContainer"></div>' +
    '<script>window.CERTCAL_VISAO="padroes";var USER_CONTEXT={perfil:' + JSON.stringify(perfil || 'TECNICO') + '};' +
    'function SGO_getSessionId(){return "s-bento";}var google={script:{get run(){var h={};var o={withSuccessHandler:function(f){h.ok=f;return o;},withFailureHandler:function(f){h.er=f;return o;},' +
    'CertCal_apiDispatch:function(req){setTimeout(function(){window.__apiNode(req.fn,req.payload).then(function(r){if(r&&r.__erro)h.er(new Error(r.__erro));else h.ok(r);},function(e){h.er(e);});},2);}};return o;}}};</script>' +
    ctx.CertCal_obterConteudoModulo() + '<script>tplCertCal_renderReal_();</script></body></html>';
}
async function abrirTela(A, opcoes) {
  opcoes = opcoes || {};
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: opcoes.viewport || { width: 1400, height: 900 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  p.on('dialog', d => d.accept());
  await p.exposeFunction('__apiNode', (fn, payload) => { try { return JSON.parse(JSON.stringify(A.api('s-bento', fn, payload))); } catch (e) { return { __erro: e.message }; } });
  await p.setContent(pagina(opcoes.perfil || 'TECNICO'));
  try { await p.waitForFunction(() => document.querySelector('#pdr[data-pdr-pronto]') && !PD.busy, null, { timeout: 15000 }); }
  catch (e) { const st = await p.evaluate(() => (document.getElementById('pd-status') || {}).textContent).catch(() => ''); await b.close(); throw new Error('A tela não carregou: ' + st + ' ' + erros.join(' | ')); }
  return { b, p, erros };
}
const ocioso = p => p.waitForFunction(() => !PD.busy, null, { timeout: 15000 });
/** Estado visível: contagem, números do resumo, faixa, campos e linhas da lista. */
const LER_TELA = () => {
  const num = {}; document.querySelectorAll('#pdr-resumo .bc-resumo-item').forEach(b => { num[b.getAttribute('data-valor')] = Number(b.querySelector('.bc-resumo-num').textContent.replace(/\./g, '')); });
  const linhas = [...document.querySelectorAll('#pdr-lista tbody > tr.pdr-linha')].map(t => t.getAttribute('data-id'));
  const grupos = [...document.querySelectorAll('#pdr-lista tbody > tr.pdr-grupo')].map(t => (t.querySelector('input[data-pdr-sel]').getAttribute('data-pdr-sel') || '').split(','));
  const cartoes = document.querySelectorAll('#pdr-lista .pdr-cartoes > .pdr-cartao').length;
  return { contagem: document.getElementById('pdr-contagem').textContent, num, faixa: document.getElementById('pdr-faixa').textContent, linhas, grupos, cartoes,
    campos: { filtro: document.getElementById('pdr-situacao').value, local: document.getElementById('pdr-local').value, grandeza: document.getElementById('pdr-grandeza').value, ordem: document.getElementById('pdr-ordem').value, agrupar: document.getElementById('pdr-agrupar').checked },
    limpar: !document.getElementById('pdr-limpar').hidden, vazio: !!document.querySelector('#pdr-lista .bc-vazio'), falha: !!document.querySelector('#pdr-lista .pdr-falha') };
};
const SITUACOES = ['ATIVOS', 'VENCIDO', 'VENCENDO', 'OK', 'SEM_VALIDADE', 'SEM_PDF', 'INATIVO', 'TODOS'];
const ORDENS = ['SITUACAO', 'VALIDADE', 'TAG', 'LOCAL'];

/** Confere uma leitura da tela contra o oráculo; devolve a lista de divergências. */
function conferir(k, tela) {
  const M = modelo(), rec = M.filter(x => passaOutros(x, k)), vis = rec.filter(x => passaSit(x, k.filtro));
  const d = [];
  const n = Number((/^(\d+) padr/.exec(tela.contagem) || [])[1]);
  if (tela.falha) d.push('lista não montada');
  if (n !== vis.length && !(vis.length === 0 && /^0 padr/.test(tela.contagem))) d.push('contagem "' + tela.contagem + '" esperado ' + vis.length);
  for (const f of Object.keys(tela.num)) { const esp = rec.filter(x => passaSit(x, f)).length; if (tela.num[f] !== esp) d.push('número ' + f + '=' + tela.num[f] + ' esperado ' + esp); }
  if (tela.num[k.filtro] !== undefined && tela.num[k.filtro] !== vis.length) d.push('número do filtro ativo difere da lista');
  if (tela.campos.filtro !== k.filtro || tela.campos.local !== k.local || tela.campos.grandeza !== k.grandeza || tela.campos.ordem !== k.ordem || tela.campos.agrupar !== k.agrupar) d.push('campos ' + JSON.stringify(tela.campos));
  const filtrado = k.filtro !== 'ATIVOS' || !!k.local || !!k.grandeza || !!k.busca;
  if (tela.limpar !== filtrado) d.push('Limpar filtros visível=' + tela.limpar);
  if (filtrado !== /no filtro:/.test(tela.contagem)) d.push('descrição do filtro na contagem');
  const venc = rec.filter(x => passaSit(x, 'VENCIDO')).length;
  if (venc && k.filtro !== 'VENCIDO' && tela.faixa.indexOf(String(venc)) < 0) d.push('faixa sem o número de vencidos ' + venc + ': ' + tela.faixa);
  if (!vis.length) { if (!tela.vazio) d.push('lista deveria estar vazia'); return d; }
  if (!k.agrupar) {
    const esp = ordenar(vis, k.ordem).map(x => x.id);
    if (JSON.stringify(tela.linhas) !== JSON.stringify(esp)) d.push('lista ' + JSON.stringify(tela.linhas) + ' esperado ' + JSON.stringify(esp));
  } else {
    const ids = tela.linhas.concat(...tela.grupos).sort(), esp = vis.map(x => x.id).sort();
    if (JSON.stringify(ids) !== JSON.stringify(esp)) d.push('itens agrupados ' + JSON.stringify(ids) + ' esperado ' + JSON.stringify(esp));
  }
  return d;
}

/* =================== servidor =================== */

test('servidor: TAG, descrição, certificado, ID e situação saem como texto; situação correta para cada caso de borda', () => {
  const A = ambiente();
  const r = A.api('s-bento', 'apiListarControlePadroes');
  const porId = Object.fromEntries(r.items.map(i => [i.ID, i]));
  const cad = Object.fromEntries(r.padroes.map(i => [i.ID, i]));
  assert.equal(porId.n1.TAG, '260101580'); assert.equal(typeof porId['7'].TAG, 'string'); assert.equal(porId['7'].TAG, '260553499');
  assert.equal(cad.n1.TAG, '260101580'); assert.equal(cad.n1.CERTIFICADO_NUMERO, '2024001'); assert.equal(cad.low.DESCRICAO, '12345');
  assert.equal(porId.low.SERIE, '98765', 'série numérica vira texto para a busca');
  assert.equal(cad.low.STATUS, 'ATIVO', '" ativo " é ativo, como no servidor da emissão');
  for (const p of ACERVO) assert.equal(cad[String(p.ID)].statusValidade, p.st, p.ID + ' (' + p.VALIDADE + ')');
  assert.equal(cad.h0.statusValidadeLabel, 'Vence hoje');
  assert.equal(cad.ser.VALIDADE, br(60), 'número da planilha vira dd/mm/aaaa');
  assert.equal(cad.curta.VALIDADE, br(45));
  assert.equal(cad['7'].VALIDADE, br(200));
  // A tela antiga e a escolha de padrões da emissão também recebem texto.
  const at = A.api('s-bento', 'apiListarPadroesAtivos').items;
  assert.ok(at.every(p => typeof p.TAG === 'string' && typeof p.ID === 'string'));
  assert.ok(!at.some(p => p.ID === 'inat'), 'inativo fora da escolha dos ensaios');
});

test('servidor: "Conferido pela equipe" vale para certificado gravado como número na planilha', () => {
  const A = ambiente();
  const link = A.T.CAD_PADROES.find(p => p.ID === 'n1').LINK_CERTIFICADO_PDF;
  A.T.PADROES_CONTROLE_DOCUMENTAL.find(p => p.ID === 'n1').DADOS_JSON = JSON.stringify({ LOCALIZACAO: 'Laboratório', FONTE_CERTIFICADO: link, FONTE_NUMERO: '2024001', CONFERIDO_EM: '2026-11-01T10:00:00Z' });
  const it = A.api('s-bento', 'apiListarControlePadroes').items.find(i => i.ID === 'n1');
  assert.equal(it.conferido, true);
});

test('servidor: datas em dd/mm/aaaa, d/m/aaaa, ISO, ISO com hora, número da planilha e Date; datas inválidas ficam "Data inválida"', () => {
  const { c } = ambiente({ acervo: [] });
  const cl = v => c.CertCal_classificarValidadePadrao_(v).status;
  assert.equal(cl(br(10)), 'VENCENDO');
  assert.equal(cl(brCurto(40)), 'OK');
  assert.equal(cl(iso(40)), 'OK');
  assert.equal(cl(iso(-3) + 'T03:00:00.000Z'), 'VENCIDO');
  assert.equal(cl(serial(-2)), 'VENCIDO');
  assert.equal(cl(serial(0)), 'VENCIDO');
  assert.equal(cl(new Date(hojeSP() + 50 * DIA + 15 * 3600e3)), 'OK');
  assert.equal(cl(''), 'SEM_VALIDADE'); assert.equal(cl(null), 'SEM_VALIDADE');
  for (const v of ['31/02/2026', '2026-13-01', 'abc', 20271231, '31/12/27', '00/01/2027']) assert.equal(cl(v), 'VALIDADE_INVALIDA', String(v));
  assert.equal(c.CertCal_classificarValidadePadrao_(br(0)).label, 'Vence hoje');
});

test('servidor: fuso de São Paulo: às 22h30 de 13/11 (01h30 UTC de 14/11) "hoje" ainda é 13/11', () => {
  const FIXO = Date.UTC(2026, 10, 14, 1, 30);
  class DataFixa extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXO); } static now() { return FIXO; } }
  const { c } = ambiente({ acervo: [], Date: DataFixa });
  const v = s => c.CertCal_classificarValidadePadrao_(s);
  assert.deepEqual([v('13/11/2026').status, v('13/11/2026').diasRestantes], ['VENCIDO', 0], 'vence hoje (em São Paulo)');
  assert.deepEqual([v('14/11/2026').status, v('14/11/2026').diasRestantes], ['VENCENDO', 1]);
  assert.deepEqual([v('12/11/2026').status, v('12/11/2026').diasRestantes], ['VENCIDO', -1]);
});

test('certificado: padrão vencido ou com data inválida nunca entra; inativo nem aparece; data da calibração é a referência', () => {
  const A = ambiente();
  const c = A.c;
  const mapa = c.CertCal_mapaPadroesAtivos_('s-bento');
  assert.ok(!mapa.inat, 'inativo fora do mapa da emissão');
  assert.ok(mapa.low, 'STATUS " ativo " entra como ativo');
  const bloco = ids => [{ titulo: 'Temperatura', unidade: '°C', resolucao: '0,1', padroesIds: ids, pontos: [{ nominal: '10', leituras: ['10,1', '10,0', '10,1'] }] }];
  const emitir = (ids, data) => { const blocos = c.CertCal_calcularBlocos_(bloco(ids), mapa); c.CertCal_exigirPadroesValidosNaData_(blocos, data); return blocos; };
  assert.throws(() => emitir(['n1'], br(0)), /260101580.*vencido na data da calibração.*Novo certificado/s, 'TAG numérica vencida é recusada com a TAG na mensagem');
  assert.throws(() => emitir(['z'], br(0)), /ZZ-9.*vencido/);
  assert.throws(() => emitir(['inv'], br(0)), /INV-01.*data de validade inválida/);
  assert.throws(() => emitir(['g1', 'n1'], br(0)), /260101580/, 'um vencido no meio de vigentes também barra');
  assert.throws(() => c.CertCal_calcularBlocos_(bloco(['inat']), mapa), /não encontrado/, 'inativo não é aceito nem pelo ID');
  // Vigentes, inclusive com validade em número da planilha, ISO e d/m/aaaa.
  const ok = emitir(['g1', 'ser', '7', 'curta'], br(0));
  assert.deepEqual(ok[0].padroesUsados.map(p => p.tag), ['REG-001 (CANAL1)', 'SER-01', '260553499', 'CUR-01'], 'TAG sai como texto no certificado');
  assert.equal(ok[0].padroesUsados[1].validade, br(60));
  // Calibração feita quando o padrão ainda valia (certificado com data anterior): é rastreável e é aceita.
  assert.doesNotThrow(() => emitir(['n1'], br(-20)));
  assert.throws(() => emitir(['n1'], br(-9)), /vencido/);
  // A emissão chama a conferência (ordem do fluxo real).
  assert.match(ler('SGO_CertCal_Main.js'), /var blocos=CertCal_calcularBlocos_\(payload\.blocos,mapaPadroes\);[\s\S]{0,600}CertCal_exigirPadroesValidosNaData_\(blocos,dataCalibracao\)/);
  assert.match(ler('SGO_CertCal_Main.js'), /function CertCal_apiGerarCertificado[\s\S]{0,400}CertCal_mapaPadroesAtivos_\(sessionId\)[\s\S]{0,200}CertCal_montarContexto_/);
});

test('servidor: reativar ou anexar PDF com data inválida no cadastro diz onde corrigir', () => {
  const A = ambiente();
  A.T.CAD_PADROES.push({ ID: 'ri', TAG: 'RI-01', DESCRICAO: 'Inativo com data errada', INCERTEZA_U95: '0,5', FATOR_K: 2, VEFF: 0, CERTIFICADO_NUMERO: 'R', VALIDADE: '31/02/2026', LINK_CERTIFICADO_PDF: '', STATUS: 'INATIVO' });
  assert.throws(() => A.api('s-bento', 'apiReativarPadrao', { padraoId: 'ri' }), /Data inexistente.*Cadastro e validade/s);
  assert.throws(() => A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'inv', certificadoBase64: Buffer.from('%PDF-1.4').toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'a.pdf' }), /não foi anexado.*Data inexistente.*Cadastro e validade/s);
  assert.throws(() => A.api('s-cliente', 'apiAnexarCertificadoPadrao', { padraoId: 'inv', certificadoBase64: 'eA==' }), /Acesso negado\.$/);
});

test('relatório de renovação: TAG numérica, validade em número da planilha e U95 com vírgula', () => {
  const A = ambiente();
  const ctx = A.c.CertCalGest_contextoPadroes_();
  const n1 = ctx.itens.find(i => i.id === 'n1'), ser = ctx.itens.find(i => i.id === 'ser');
  assert.equal(n1.tag, '260101580'); assert.equal(n1.situacao, 'VENCIDO');
  assert.equal(ser.validade, br(60));
  assert.ok(!ctx.itens.some(i => i.erros.indexOf('U95 ausente ou inválida') >= 0), 'U95 "0,5" é válida');
  assert.ok(!ctx.itens.some(i => i.id === 'inat'));
});

/* =================== tela =================== */

test('tela: relato de 13/11 — Vencidos e depois Ativos, ordenado por Local: contagem, números e lista coerentes, sem erro', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.selectOption('#pdr-ordem', 'LOCAL');
    await p.selectOption('#pdr-situacao', 'VENCIDO');
    let t = await p.evaluate(LER_TELA);
    assert.deepEqual(conferir({ filtro: 'VENCIDO', local: '', grandeza: '', busca: '', ordem: 'LOCAL', agrupar: true }, t), []);
    await p.selectOption('#pdr-situacao', 'ATIVOS');
    t = await p.evaluate(LER_TELA);
    assert.deepEqual(conferir({ filtro: 'ATIVOS', local: '', grandeza: '', busca: '', ordem: 'LOCAL', agrupar: true }, t), []);
    assert.doesNotMatch(t.contagem, /vencidos/, 'antes ficava "36 padrões no filtro: vencidos"');
    assert.match(t.contagem, /^15 padrões em 13 linhas$/);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: todas as combinações de Situação × Local × Grandeza × busca × Ordenar × Agrupar ficam coerentes', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  try {
    // Opções dos campos vêm dos dados (inclui "Sem localização" e "Não informada").
    assert.deepEqual(await p.$$eval('#pdr-local option', o => o.map(x => x.value)), ['', 'CME', 'Laboratório', '__SEM__']);
    assert.deepEqual(await p.$$eval('#pdr-grandeza option', o => o.map(x => x.value)), ['', 'Pressão', 'Rotação', 'Temperatura', '__SEM__']);
    const combos = [];
    for (const filtro of SITUACOES) for (const local of ['', 'Laboratório', 'CME', '__SEM__']) for (const grandeza of ['', 'Temperatura', '__SEM__'])
      for (const busca of ['', 'reg-001', 'termometro', '98765']) for (const ordem of ORDENS) for (const agrupar of [false, true]) combos.push({ filtro, local, grandeza, busca, ordem, agrupar });
    const telas = await p.evaluate(({ combos, ler }) => {
      const lerTela = new Function('return (' + ler + ')()');
      return combos.map(k => { PDR.filtro = k.filtro; PDR.local = k.local; PDR.grandeza = k.grandeza; PDR.busca = k.busca; PDR.ordem = k.ordem; PDR.agrupar = k.agrupar; pdList(); return lerTela(); });
    }, { combos, ler: LER_TELA.toString() });
    const falhas = [];
    combos.forEach((k, i) => { const d = conferir(k, telas[i]); if (d.length) falhas.push(JSON.stringify(k) + ' → ' + d.join('; ')); });
    assert.equal(combos.length, 3072);
    assert.deepEqual(falhas.slice(0, 8), [], falhas.length + ' combinações incoerentes');
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: números do resumo, "Ver vencidos", Limpar filtros, Atualizar, Agrupar e busca sem acento pelos controles reais', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  const k0 = { filtro: 'ATIVOS', local: '', grandeza: '', busca: '', ordem: 'SITUACAO', agrupar: true };
  const ver = async (k, msg) => assert.deepEqual(conferir(k, await p.evaluate(LER_TELA)), [], msg);
  try {
    await ver(k0, 'abertura');
    // Toque no número "Vencidos": a lista mostra exatamente o número tocado.
    const nVenc = await p.$eval('.bc-resumo-item[data-valor="VENCIDO"] .bc-resumo-num', e => Number(e.textContent));
    await p.click('.bc-resumo-item[data-valor="VENCIDO"]');
    await ver(Object.assign({}, k0, { filtro: 'VENCIDO' }), 'número Vencidos');
    assert.match(await p.textContent('#pdr-contagem'), new RegExp('^' + nVenc + ' padr'));
    await p.click('.bc-resumo-item[data-valor="VENCIDO"]');
    await ver(k0, 'tocar de novo volta a Ativos');
    // Local escolhido: os números passam a ser do local; "Ver vencidos" mostra o mesmo número da faixa.
    await p.selectOption('#pdr-local', 'CME');
    await ver(Object.assign({}, k0, { local: 'CME' }), 'local CME');
    assert.match(await p.textContent('#pdr-faixa'), /1 padrão vencido ou com data inválida neste filtro \(4 no total\)/);
    await p.click('#pdr-faixa [data-valor="VENCIDO"]');
    await ver(Object.assign({}, k0, { local: 'CME', filtro: 'VENCIDO' }), 'Ver vencidos no local');
    // Atualizar mantém filtros e coerência.
    await p.click('[data-pdr="recarregar"]'); await ocioso(p);
    await ver(Object.assign({}, k0, { local: 'CME', filtro: 'VENCIDO' }), 'depois de Atualizar');
    await p.click('#pdr-limpar');
    await ver(k0, 'Limpar filtros');
    // Busca sem acento acha "Termômetro"; série numérica acha pelo número.
    await p.fill('#pdr-busca', 'termometro'); await p.waitForTimeout(250);
    await ver(Object.assign({}, k0, { busca: 'termometro' }), 'busca sem acento');
    assert.ok((await p.textContent('#pdr-lista')).includes('ZZ-9'));
    await p.fill('#pdr-busca', '98765'); await p.waitForTimeout(250);
    await ver(Object.assign({}, k0, { busca: '98765' }), 'busca por série numérica');
    await p.fill('#pdr-busca', ''); await p.waitForTimeout(250);
    await p.uncheck('#pdr-agrupar');
    await ver(Object.assign({}, k0, { agrupar: false }), 'sem agrupar');
    for (const o of ORDENS) { await p.selectOption('#pdr-ordem', o); await ver(Object.assign({}, k0, { agrupar: false, ordem: o }), 'ordem ' + o); }
    // TAG numérica abre o painel (ID numérico na planilha também).
    await p.click('#pdr-lista .pdr-tag:text-is("260553499")');
    assert.equal(await p.textContent('#pdr-painel-titulo'), '260553499');
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: falha no desenho não deixa a tela meio atualizada e diz o que fazer; Atualizar volta ao normal', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => { window.__orig = pdrLinhaTabela_; window.pdrLinhaTabela_ = function () { throw new Error('falha simulada no desenho'); }; });
    await p.selectOption('#pdr-situacao', 'VENCIDO');
    const t = await p.evaluate(LER_TELA);
    assert.equal(t.falha, true);
    assert.match(await p.textContent('#pdr-lista'), /Não foi possível montar a lista.*falha simulada.*Nenhum dado foi alterado.*Atualizar lista.*Limpar filtros/s);
    assert.equal(t.contagem, 'Lista não montada: veja o aviso abaixo.');
    assert.deepEqual(t.num, {}, 'números antigos não ficam na tela');
    await p.evaluate(() => { window.pdrLinhaTabela_ = window.__orig; });
    await p.click('#pdr-lista [data-pdr="recarregar"]'); await ocioso(p);
    assert.deepEqual(conferir({ filtro: 'VENCIDO', local: '', grandeza: '', busca: '', ordem: 'SITUACAO', agrupar: true }, await p.evaluate(LER_TELA)), []);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: Novo certificado reconhece o mesmo certificado mesmo gravado como número', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirPainel_('n1', 'renovar'));
    await p.fill('#pdr-r-cert', '2024001');
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /Número e validade iguais aos do certificado atual/);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

for (const largura of [320, 360, 390]) {
  test('celular ' + largura + ' px: nada cortado na lista, filtros e painel; toques com 44 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
    const A = ambiente();
    const { b, p, erros } = await abrirTela(A, { viewport: { width: largura, height: 780 } });
    try {
      const medir = () => p.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const alvos = [...document.querySelectorAll('#pdr button, #pdr select, #pdr input[type=search], #pdr label.pdr-check, #pdr .pdr-link, #pdr-painel:not([hidden]) button, #pdr-painel:not([hidden]) input[type=text], #pdr-faixa button')].filter(vis);
        const baixos = alvos.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
        const largos = [...document.querySelectorAll('#pdr *, #pdr-painel:not([hidden]) *')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && !e.closest('.pdr-rolar,.pdr-lista table,.bc-painel-abas'); }).map(e => e.className || e.tagName);
        return { rolagem: document.documentElement.scrollWidth - innerWidth, baixos, largos: [...new Set(largos)].slice(0, 6) };
      });
      assert.ok(await p.$('#pdr-lista .pdr-cartoes'), 'cartões no celular');
      let m = await medir();
      assert.equal(m.rolagem <= 0, true, 'rolagem lateral de ' + m.rolagem + ' px');
      assert.deepEqual(m.largos, []); assert.deepEqual(m.baixos, []);
      await p.click('[data-pdr="filtros"]');
      await p.selectOption('#pdr-local', 'CME');
      m = await medir();
      assert.equal(m.rolagem <= 0, true); assert.deepEqual(m.largos, []); assert.deepEqual(m.baixos, []);
      assert.deepEqual(conferir({ filtro: 'ATIVOS', local: 'CME', grandeza: '', busca: '', ordem: 'SITUACAO', agrupar: true }, await p.evaluate(LER_TELA)).filter(x => !/^lista|itens agrupados/.test(x)), []);
      await p.click('#pdr-lista .pdr-cartao .pdr-tag:text-is("260553499")');
      m = await medir();
      assert.equal(m.rolagem <= 0, true); assert.deepEqual(m.largos, []); assert.deepEqual(m.baixos, []);
      // Aba Inventário e orçamento e barra de abas da página.
      await p.evaluate(() => { PDR.painel = null; pdrFecharPainel_(); pdTrocarAba_('docs'); });
      const docs = await p.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const alvos = [...document.querySelectorAll('#pd-docs button, #pd-docs input, #pd-abas .pd-abas-barra button')].filter(vis);
        return { rolagem: document.documentElement.scrollWidth - innerWidth, baixos: alvos.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)),
          largos: [...document.querySelectorAll('#pd-docs *')].filter(vis).filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.id || e.className || e.tagName) };
      });
      assert.equal(docs.rolagem <= 0, true, 'rolagem lateral na aba de documentos'); assert.deepEqual(docs.largos, []); assert.deepEqual(docs.baixos, []);
      assert.deepEqual(erros, []);
    } finally { await b.close(); }
  });
}
