// Ambiente da tela Usuários e do login (SGO_Auth.js + SGO_SegurancaAcesso.js + SGO_Usuarios.js) num vm, com planilha, cache,
// propriedades e e-mail simulados. Mesmo ambiente de login-email.test.cjs (copiado), usado por usuarios-excluir-vinculo.test.cjs.
// Só dados de teste.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarUtilities } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const COLS = ['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'CRIADO_EM', 'CLIENTE_ID', 'EMAIL', 'CELULAR', 'REPRESENTADA_ID', 'REPRESENTACAO_PAPEL'];
const sinal = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const semSinal = (arr) => Buffer.from(Array.from(arr, (b) => b & 255));

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const abas = new Map();
  const novaAba = (nome, cab) => { abas.set(nome, { cab: cab.slice(), linhas: [] }); return abas.get(nome); };
  const usuarios = novaAba('CAD_USUARIOS', COLS);
  novaAba('SYS_LOGS', ['ID', 'DATA', 'USUARIO', 'ACAO', 'MODULO', 'DETALHE']);
  novaAba('REP_REPRESENTADAS', ['ID', 'NOME', 'SITUACAO']).linhas.push(['rep1', 'REPRESENTADA TESTE', 'ATIVA']);
  novaAba('CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'STATUS']).linhas.push(['c1', 'HOSPITAL TESTE', 'ATIVO']);
  function folha(nome) {
    const a = abas.get(nome);
    if (!a) return null;
    const celula = (r, c) => (r === 1 ? a.cab[c - 1] : (a.linhas[r - 2] || [])[c - 1]);
    const intervalo = (r, c, nr, nc) => ({
      getValues: () => Array.from({ length: nr || 1 }, (_, i) => Array.from({ length: nc || 1 }, (_, j) => { const v = celula(r + i, c + j); return v === undefined ? '' : v; })),
      setValue: (v) => { if (r === 1) a.cab[c - 1] = v; else { const l = a.linhas[r - 2]; while (l.length < c) l.push(''); l[c - 1] = v; } },
      setValues: (vals) => vals.forEach((linha, i) => linha.forEach((v, j) => { const rr = r + i; const l = a.linhas[rr - 2]; while (l.length < c + j) l.push(''); l[c + j - 1] = v; }))
    });
    return {
      getName: () => nome, getDataRange: () => intervalo(1, 1, a.linhas.length + 1, a.cab.length), getRange: (r, c, nr, nc) => intervalo(r, c, nr, nc),
      getLastRow: () => a.linhas.length + 1, getLastColumn: () => a.cab.length, appendRow: (l) => { a.linhas.push(l.slice()); }
    };
  }
  const props = new Map(), cache = new Map(), emails = [], fetches = [];
  const paraObj = (a, l) => { const o = {}; a.cab.forEach((h, i) => { o[h] = l[i] === undefined ? '' : l[i]; }); return o; };
  const ctx = {
    console, JSON,
    SGO_CFG: { DB_ID: 'db', SESSION_TTL: 21600, STATUS: { ATIVO: 'ATIVO' }, SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', SYS_LOGS: 'SYS_LOGS', CAD_CLIENTES: 'CAD_CLIENTES' },
      PROFILES: ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH', 'CLIENTE', 'REPRESENTADA'] },
    SGO_UTILS: {
      safe: (x) => String(x === null || x === undefined ? '' : x).trim(), safeUpper: (x) => String(x === null || x === undefined ? '' : x).trim().toUpperCase(),
      safeLower: (x) => String(x === null || x === undefined ? '' : x).trim().toLowerCase(), uuid: () => crypto.randomUUID(), nowIso: () => new Date().toISOString()
    },
    SpreadsheetApp: { openById: () => ({ getSheetByName: folha }) },
    SGO_DATA: {
      _headersCache: {}, _headerMapCache: {},
      getSheet: (n) => folha(n),
      // a conferência dos vínculos da conta (Usuários > Excluir) varre todas as abas da base
      getDB: () => ({ getSheets: () => [...abas.keys()].map(folha), getSheetByName: folha }),
      getAll: (n) => { const a = abas.get(n); return a ? a.linhas.map((l) => paraObj(a, l)) : []; },
      getById: (n, id) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); return l ? paraObj(a, l) : null; },
      update: (n, id, obj) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); if (!l) return false; Object.keys(obj).forEach((k) => { let i = a.cab.indexOf(k); if (i < 0) { a.cab.push(k); i = a.cab.length - 1; } while (l.length <= i) l.push(''); l[i] = obj[k]; }); return true; },
      insert: (n, obj) => { const a = abas.get(n); Object.keys(obj).forEach((k) => { if (a.cab.indexOf(k) < 0) a.cab.push(k); }); a.linhas.push(a.cab.map((h) => (obj[h] === undefined ? '' : obj[h]))); return obj; },
      remove: (n, id) => { const a = abas.get(n); const i = a.linhas.findIndex((x) => String(x[0]) === String(id)); if (i < 0) return false; a.linhas.splice(i, 1); return true; },
      normalizarObjetoParaSheet: (_n, o) => o,
      gerarRegistroBase: (o) => Object.assign({ ID: 'u-' + crypto.randomUUID().slice(0, 8), CRIADO_EM: new Date().toISOString() }, o),
      mesclarCampos_: (atual, normal, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? normal[c] : (atual && atual[c] !== undefined && atual[c] !== null ? atual[c] : ''); }); return s; },
      log: () => true
    },
    SGO_textoFalhaOperador_: (acao, e) => 'Não foi possível ' + acao + ': ' + String((e && e.message) || e),
    CertCal_garantirColuna_: (n, c) => { const a = abas.get(n); if (a && a.cab.indexOf(c) < 0) a.cab.push(c); },
    CertCal_garantirTabela_: (n, cols) => { if (!abas.has(n)) novaAba(n, cols); },
    CertCal_forcarColunaTexto_: () => {},
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: (k) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k), getProperties: () => Object.fromEntries(props) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getService: () => ({ getUrl: () => opcoes.url === undefined ? 'https://sgo.metrolabs.com.br' : opcoes.url }) },
    Utilities: criarUtilities({
      computeDigest: (_alg, t) => sinal(crypto.createHash('sha256').update(String(t), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => sinal(crypto.createHmac('sha256', semSinal(k)).update(semSinal(v)).digest()),
      newBlob: (t) => ({ getBytes: () => sinal(Buffer.from(String(t), 'utf8')) }),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
    }),
    MailApp: { sendEmail: (o) => { emails.push(o); } },
    UrlFetchApp: { fetch: (url, op) => { fetches.push({ url, corpo: JSON.parse(op.payload || 'null') }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.1' }] }) }; } },
    Chaves_ehDonoUsuario_: (u) => String(u || '').toLowerCase() === 'admin',
    SGO_CRIPTO: {
      pbkdf2Hex: (s, sal, it) => crypto.pbkdf2Sync(String(s), Buffer.from(sal, 'hex'), Math.min(it, 1000), 32, 'sha256').toString('hex'),
      aleatorioHex: (n) => crypto.randomBytes(n).toString('hex'),
      sha256Hex: (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex'),
      igual: (a, b) => String(a) === String(b)
    }
  };
  vm.createContext(ctx);
  for (const f of ['SGO_Auth.js', 'SGO_SegurancaAcesso.js', 'SGO_Usuarios.js']) vm.runInContext(fs.readFileSync(path.join(BASE, f), 'utf8'), ctx, { filename: f });
  const add = (o) => { usuarios.linhas.push(COLS.map((c) => (o[c] === undefined ? '' : o[c]))); return o; };
  const cad = (id) => ctx.SGO_DATA.getById('CAD_USUARIOS', id);
  const registro = () => (abas.get('SYS_SEGURANCA_ACESSO') || { linhas: [] }).linhas;
  const sessoes = () => [...props.keys()].filter((k) => k.startsWith('SGO_SESSION_'));
  const linkDe = (e) => { const m = /#redefinir=([0-9a-f]{64})/.exec(e.body); return m && m[1]; };
  const ultimoLink = () => { const e = emails.filter((x) => /senha nova/i.test(x.subject)).pop(); return e ? linkDe(e) : null; };
  const config = (modo, perfis) => {
    props.set('SEGA_CONFIG', JSON.stringify({ modo, perfis: perfis || [] }));
    props.set('META_WA_TOKEN', 'texto-ficticio-do-teste'); props.set('META_WA_PHONE_ID', '100000000000000');
  };
  const codigoMeta = () => fetches[fetches.length - 1].corpo.template.components[0].parameters[0].text;
  return { ctx, abas, props, cache, emails, fetches, add, cad, registro, sessoes, linkDe, ultimoLink, config, codigoMeta };
}

module.exports = { ambiente };
