// 18/11/2026 (pacote 3, item 10): ambiente do bate-papo com o núcleo REAL (Comunicacao.js, adaptador e imagens), planilha e Drive
// simulados. Cópia fiel do ambiente de chat-documentos-20261116.test.cjs (que não muda), para os testes do pacote 3. Só dados de teste.
'use strict';
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { criarUtilities } = require('./_simulacros_gas.cjs');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8').replace(/\r\n/g, '\n');

function planilha(id) {
  const abas = {};
  const aba = (nome) => {
    const rows = [];
    const sh = {
      _rows: rows, getName: () => nome,
      getLastRow: () => { let n = rows.length; while (n > 0 && (!rows[n - 1] || rows[n - 1].every((v) => v === '' || v === undefined))) n--; return n; },
      getLastColumn: () => (rows[0] || []).length,
      getRange(r0, c0, nr, nc) {
        nr = nr || 1; nc = nc || 1;
        const api = {
          setValues(v) { for (let i = 0; i < nr; i++) { rows[r0 - 1 + i] = rows[r0 - 1 + i] || []; for (let j = 0; j < nc; j++) rows[r0 - 1 + i][c0 - 1 + j] = v[i][j]; } return api; },
          getValues() { const o = []; for (let i = 0; i < nr; i++) { const rr = rows[r0 - 1 + i] || []; o.push(Array.from({ length: nc }, (_, j) => { const x = rr[c0 - 1 + j]; return x === undefined ? '' : (typeof x === 'string' && x[0] === "'" ? x.slice(1) : x); })); } return o; },
          setFontWeight: () => api
        };
        return api;
      },
      appendRow(v) { rows[sh.getLastRow()] = v.slice(); },
      setFrozenRows() {}
    };
    abas[nome] = sh;
    return sh;
  };
  return { getId: () => id, getSheetByName: (n) => abas[n] || null, insertSheet: (n) => aba(n), getSheets: () => Object.values(abas), _abas: abas };
}

function driveFalso() {
  const pastas = {}, arquivos = [];
  let n = 0;
  const arq = (o) => ({
    getId: () => o.id, getName: () => o.nome, getMimeType: () => o.tipo, isTrashed: () => false,
    setSharing: (a, p) => { o.compartilhamento = a + ':' + p; }, setDescription: (d) => { o.descricao = d; }, getDescription: () => o.descricao,
    getUrl: () => { throw new Error('getUrl não pode ser usado nas imagens do bate-papo'); },
    getBlob: () => ({ getBytes: () => o.bytes.map((b) => (b > 127 ? b - 256 : b)) })
  });
  const pasta = (p) => ({
    getId: () => p.id, isTrashed: () => false, setDescription() {},
    createFile: (blob) => { const o = { id: 'ARQ-' + (++n) + '-segredo', nome: blob.nome, tipo: blob.tipo, bytes: blob.bytes, pasta: p.id }; arquivos.push(o); return arq(o); },
    getFilesByName: (nome) => { const l = arquivos.filter((a) => a.pasta === p.id && a.nome === nome); let i = 0; return { hasNext: () => i < l.length, next: () => arq(l[i++]) }; }
  });
  return {
    arquivos, pastas,
    api: {
      createFolder: (nome) => { const p = { id: 'PASTA-' + (++n), nome }; pastas[p.id] = p; return pasta(p); },
      getFolderById: (id) => { if (!pastas[id]) throw new Error('nf'); return pasta(pastas[id]); },
      getFilesByName: () => ({ hasNext: () => false }),
      Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' }
    }
  };
}

/** JPEG mínimo (cabeçalho com SOF0 de w × h) com "tamanho" bytes, em data: base64. */
function jpeg(w, h, tamanho) {
  const b = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01];
  while (b.length < (tamanho || 2000) - 2) b.push(0x55);
  b.push(0xFF, 0xD9);
  return 'data:image/jpeg;base64,' + Buffer.from(b).toString('base64');
}

function cenario() {
  const props = { COM_DB_ID: 'COMDB' }, cache = {};
  const com = planilha('COMDB'), sgo = planilha('SGODB'), drive = driveFalso();
  const cad = sgo.insertSheet('CAD_USUARIOS');
  cad._rows.push(['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'CRIADO_EM', 'CLIENTE_ID', 'AREA']);
  const usuarios = [
    { ID: 'u-ana', USUARIO: 'ana.t', NOME: 'Ana Teste', PERFIL: 'TECNICO', AREA: 'TECNICA' },
    { ID: 'u-bia', USUARIO: 'bia.t', NOME: 'Bia Teste', PERFIL: 'TECNICO', AREA: 'TECNICA' },
    { ID: 'u-gil', USUARIO: 'gil.t', NOME: 'Gil Gestor', PERFIL: 'GESTOR', AREA: 'DIRETORIA' },
    { ID: 'u-dora', USUARIO: 'dora.t', NOME: 'Dora Diretora', PERFIL: 'DIRETORIA', AREA: 'DIRETORIA' },
    { ID: 'u-adm', USUARIO: 'adm.t', NOME: 'Adm Sistema', PERFIL: 'ADMIN', AREA: 'DIRETORIA' }
  ];
  usuarios.forEach((u) => cad._rows.push([u.ID, u.USUARIO, 'h', u.NOME, u.PERFIL, 'ATIVO', '2026-01-01', '', u.AREA]));
  const sessoes = {};
  usuarios.forEach((u) => { sessoes['S-' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, status: 'ATIVO' }; });
  const s = {
    console: { log() {}, error() {} },
    Utilities: criarUtilities({
      base64Decode: (t) => Array.from(Buffer.from(String(t), 'base64'), (b) => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, tipo, nome) => ({ bytes: Array.from(bytes, (b) => b & 255), tipo, nome })
    }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    SpreadsheetApp: { openById: (id) => { if (id === 'COMDB') return com; if (id === 'SGODB') return sgo; throw new Error('nf'); } },
    DriveApp: drive.api,
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.teste' }) },
    validarSessao: (sid) => (sessoes[sid] ? { valid: true, data: sessoes[sid] } : { valid: false })
  };
  vm.createContext(s);
  vm.runInContext("var SGO_CFG = { DB_ID: 'SGODB', SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } };", s);
  ['Comunicacao.js', 'SGO_ComunicacaoAdaptador.js', 'SGO_ComunicacaoImagens.js'].forEach((f) => vm.runInContext(ler(f), s, { filename: f }));
  const api = (us, acao, d) => s.comApi('S-' + us, acao, d || {});
  const img = (us, acao, d) => s.comImagemApi('S-' + us, acao, d || {});
  usuarios.forEach((u) => api(u.USUARIO, 'iniciar', { visivel: false }));
  const pessoa = (login) => { s.COM_MEMO_ = {}; return s.comPessoas_(s.comBanco_(false)).find((p) => p.sgo_login === login).pessoa_id; };
  return { s, api, img, com, drive, props, pessoa };
}

function prontoParaEnviar() {
  const c = cenario();
  // o banco da Comunicação é do COMMAND: aqui ele já existe (abas criadas como no primeiro acesso)
  const conv = c.api('ana.t', 'abrirDireta', { pessoa_id: c.pessoa('bia.t') }).conversa.conversa_id;
  return { c, conv };
}

module.exports = { cenario, planilha, driveFalso };
