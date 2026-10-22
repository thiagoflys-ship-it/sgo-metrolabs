// Ambiente de teste do controle de revisão dos documentos (SGO_DocRevisao.js): carrega o núcleo e, quando pedido,
// os servidores dos geradores num contexto isolado com simulacros do Apps Script (Drive em memória, propriedades,
// sessão). Sem banco: o registro DOC_REVISOES fica na memória do próprio núcleo. Só dados de teste.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarSession, criarUtilities } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
function ler(nome) { return fs.readFileSync(path.join(BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

function criarDrive() {
  const arquivos = {}, pastas = {};
  let seq = 0;
  function blob(conteudo, mime, nome) {
    let n = nome, b = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(String(conteudo == null ? '' : conteudo), 'utf8');
    return {
      _bytes: b, getBytes: () => Array.from(b), getDataAsString: () => b.toString('utf8'), getContentType: () => mime,
      getName: () => n, setName(x) { n = x; return this; }, setDataFromString(s) { b = Buffer.from(String(s), 'utf8'); this._bytes = b; return this; },
      setContentType(m) { mime = m; return this; }
    };
  }
  function objArq(a) {
    return {
      getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getBlob: () => blob(a.bytes, a.mime, a.nome),
      getDescription: () => a.descricao || '', setDescription(d) { a.descricao = String(d); return this; }, setSharing() { return this; },
      getDateCreated: () => new Date(), getMimeType: () => a.mime
    };
  }
  function objPasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id, setSharing() { return this; }, setDescription(d) { p.descricao = d; return this; }, getDescription: () => p.descricao || '',
      createFile(b, conteudo, mime) {
        const bb = typeof b === 'string' ? blob(conteudo, mime || 'text/html', b) : b;
        const id = 'arq' + (++seq);
        arquivos[id] = { id, nome: bb.getName(), mime: bb.getContentType(), bytes: Buffer.from(bb._bytes || bb.getBytes()), pasta: p.id };
        return objArq(arquivos[id]);
      },
      createFolder(nome) { const id = 'pasta' + (++seq); pastas[id] = { id, nome, pai: p.id }; return objPasta(pastas[id]); },
      getFoldersByName(nome) { const l = Object.values(pastas).filter(x => x.pai === p.id && x.nome === nome); let i = 0; return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) }; },
      getFolders() { const l = Object.values(pastas).filter(x => x.pai === p.id); let i = 0; return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) }; },
      getFilesByType() { const l = Object.values(arquivos).filter(x => x.pasta === p.id); let i = 0; return { hasNext: () => i < l.length, next: () => objArq(l[i++]) }; }
    };
  }
  pastas.raiz = { id: 'raiz', nome: 'raiz', pai: null };
  const DriveApp = {
    Access: { PRIVATE: 'PRIVATE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { NONE: 'NONE', VIEW: 'VIEW' },
    getRootFolder: () => objPasta(pastas.raiz),
    getFolderById: id => { if (!pastas[id]) throw new Error('pasta inexistente'); return objPasta(pastas[id]); },
    getFileById: id => { if (!arquivos[id]) throw new Error('arquivo inexistente'); return objArq(arquivos[id]); }
  };
  return { DriveApp, arquivos, pastas, blob };
}

/** arquivosExtras: servidores dos geradores carregados depois do núcleo; extra: código JS de simulacros. */
function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const props = {};
  const drive = criarDrive();
  const sessoes = {
    tec: { perfil: 'TECNICO', nome: 'Técnico Teste', usuario: 'tec' },
    rt: { perfil: 'GESTOR', nome: 'Responsável Teste', usuario: 'rt' },
    cli: { perfil: 'CLIENTE', nome: 'Cliente Teste', usuario: 'cli' }
  };
  const ctx = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, parseFloat, isNaN, Buffer,
    Session: criarSession('America/Sao_Paulo'),
    Utilities: Object.assign(criarUtilities(), {
      getUuid: () => crypto.randomUUID(),
      newBlob: (c, m, n) => drive.blob(c, m, n)
    }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    DriveApp: drive.DriveApp,
    MimeType: { HTML: 'text/html', PDF: 'application/pdf', JSON: 'application/json' },
    exigirSessao: sid => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada.'); return sessoes[sid]; }
  };
  vm.createContext(ctx);
  ctx.run = codigo => vm.runInContext(codigo, ctx);
  ctx.run(ler('SGO_DocRevisao.js'));
  for (const f of opcoes.arquivos || []) ctx.run(ler(f));
  if (opcoes.extra) ctx.run(opcoes.extra);
  return { ctx, drive, props, run: ctx.run, fn: nome => ctx[nome] || vm.runInContext(nome, ctx), api: (sid, fn, payload) => JSON.parse(JSON.stringify(vm.runInContext('DocRev_api', ctx)({ sessionId: sid, fn, payload: payload || {} }))) };
}

module.exports = { criarAmbiente, ler, BASE };
