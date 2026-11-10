// Ambiente de teste do Relatório do ciclo da lavadora (31/10/2026): código real do SGO+ num contexto isolado, tabelas em
// memória, Drive em memória, relógio controlado e a IA simulada. Só dados de teste (nomes e CNPJs fictícios). Os arquivos
// .sgolav de tests/fixtures/lavciclo são arquivos reais do cartão da lavadora (sem dado pessoal: o operador é o perfil
// da máquina, "MANUTENÇÃO").
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const pastaFixtures = path.join(__dirname, 'fixtures/lavciclo');
const AGORA = Date.parse('2026-10-31T10:00:00-03:00');

const ARQUIVOS = ['SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_LavCiclo_Leitor.js', 'SGO_LavCiclo_Documento.js', 'SGO_LavCiclo_Main.js', 'SGO_Representacao_Documentos.js'];

function fixture(nome) { return fs.readFileSync(path.join(pastaFixtures, nome), 'latin1'); }

/** Monta um .sgolav a partir do texto (para os casos de arquivo alterado). codificacao: 'utf8' | 'latin1'. */
function montarSgolav(texto, codificacao) {
  const b = Buffer.from(texto, codificacao || 'utf8'), k = Buffer.from('METROLABS-SGOLAV-2026');
  for (let i = 0; i < b.length; i++) b[i] ^= k[i % k.length];
  return 'SGOLAV1\n' + b.toString('base64') + '\n';
}
/** Texto decodificado de um .sgolav (para alterar e montar de novo). */
function abrirSgolav(conteudo) {
  const l = conteudo.split(/\r?\n/), b = Buffer.from(l.slice(1).join(''), 'base64'), k = Buffer.from('METROLABS-SGOLAV-2026');
  for (let i = 0; i < b.length; i++) b[i] ^= k[i % k.length];
  return b.toString('utf8');
}

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || AGORA };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      { ID: 'u_dir', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test' },
      { ID: 'u_tec', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test' },
      { ID: 'u_met', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test' },
      { ID: 'u_com', NOME: 'VERA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test' },
      { ID: 'u_cli', NOME: 'MARIA CLIENTE ALFA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'maria@alfa.exemplo.test', CLIENTE_ID: 'c1' },
      { ID: 'u_cli2', NOME: 'BETO CLIENTE BETA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', CLIENTE_ID: 'c2' },
      { ID: 'u_semcli', NOME: 'CLIENTE SEM VINCULO TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'sem@exemplo.test', CLIENTE_ID: '' },
      { ID: 'u_rep', NOME: 'REPRESENTADA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'rep@exemplo.test' }
    ],
    CAD_CLIENTES: [
      { ID: 'c1', RAZAO_SOCIAL: 'HOSPITAL TESTE ALFA LTDA', NOME_FANTASIA: 'Hospital Teste Alfa', CNPJ: '11.222.333/0001-81', STATUS: 'ATIVO' },
      { ID: 'c2', RAZAO_SOCIAL: 'CLINICA TESTE BETA LTDA', NOME_FANTASIA: 'Clínica Teste Beta', CNPJ: '', STATUS: 'ATIVO' }
    ],
    CAD_UNIDADES: [{ ID: 'un1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Centro', ENDERECO: 'Rua de Teste, 100', CIDADE: 'Goiânia', UF: 'GO', STATUS: 'ATIVO' }],
    CAD_EQUIPAMENTOS: [
      { ID: 'eq1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Lavadora ultrassônica', FABRICANTE: 'FABRICANTE TESTE', MODELO: 'LUS-60', SERIE: 'LUS0001', TAG: 'LAV-01', PATRIMONIO: 'PAT-778', SETOR: 'CME', STATUS: 'ATIVO' },
      { ID: 'eq2', CLIENTE_ID: 'c2', UNIDADE_ID: '', TIPO: 'Lavadora ultrassônica', MODELO: '', SERIE: '', TAG: 'BETA-LAV', SETOR: '', STATUS: 'ATIVO' },
      { ID: 'eq3', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', MODELO: 'AC', SERIE: 'S1', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO' }
    ]
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const cache = {}, chamadasIa = [];
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.ID.slice(2)] = { userId: u.ID, usuario: u.ID, nome: u.NOME, perfil: u.PERFIL, clienteId: u.CLIENTE_ID || '' }; });
  const arquivos = {}, pastas = { raiz: { id: 'raiz', nome: 'raiz', arquivos: [] } };
  function objBlob(bytes, mime, nome) {
    let n = nome, b = bytes, m = mime;
    return {
      getBytes: () => Array.from(b), getDataAsString: (cs) => Buffer.from(b).toString(cs === 'ISO-8859-1' ? 'latin1' : 'utf8'), getContentType: () => m, getName: () => n,
      setName(x) { n = x; return this; }, setContentType(x) { m = x; return this; }, setDataFromString(t) { b = Buffer.from(String(t), 'utf8'); return this; },
      getAs: (tipo) => objBlob(Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page >> endobj\n%' + Buffer.from(b).length), tipo, String(n).replace(/\.html?$/i, '.pdf')),
      get _bytes() { return b; }
    };
  }
  function objArquivo(a) {
    return { getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getMimeType: () => a.mime, getBlob: () => objBlob(a.bytes, a.mime, a.nome), getSize: () => a.bytes.length,
      setSharing(x, y) { a.compartilhamento = String(x) + ':' + String(y); return this; }, setDescription() { return this; } };
  }
  function objPasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id,
      createFile(blob) { const id = 'arquivo' + String(++seq).padStart(6, '0'); arquivos[id] = { id, nome: blob.getName(), mime: blob.getContentType(), bytes: Buffer.from(blob._bytes || blob.getBytes()), pasta: p.id }; p.arquivos.push(id); return objArquivo(arquivos[id]); },
      createFolder(nome) { const id = 'pasta' + (++seq); pastas[id] = { id, nome, arquivos: [], pai: p.id }; return objPasta(pastas[id]); },
      getFoldersByName(nome) { const l = Object.values(pastas).filter((x) => x.pai === p.id && x.nome === nome); let i = 0; return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) }; },
      setDescription() { return this; }
    };
  }
  const ia = { resposta: o.respostaIa || null, falhar: !!o.falharIa };
  const utilities = criarUtilities({
    computeDigest: (alg, dados) => Array.from(crypto.createHash('sha256').update(typeof dados === 'string' ? Buffer.from(dados, 'utf8') : Buffer.from(Array.from(dados, (x) => x & 255))).digest()).map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')).map((b) => (b > 127 ? b - 256 : b)),
    newBlob: (bytes, mime, nome) => objBlob(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(Array.from(bytes || [], (b) => b & 255)), mime, nome)
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, Buffer,
    Utilities: utilities, Session: criarSession(),
    MimeType: { PDF: 'application/pdf', HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    DriveApp: { getFolderById: (id) => { if (!pastas[id]) throw new Error('pasta inexistente'); return objPasta(pastas[id]); }, getFileById: (id) => { if (!arquivos[id]) throw new Error('arquivo inexistente'); return objArquivo(arquivos[id]); }, getRootFolder: () => objPasta(pastas.raiz), Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' } },
    UrlFetchApp: { fetch: (url, op) => {
      chamadasIa.push({ url, corpo: JSON.parse((op && op.payload) || '{}') });
      if (ia.falhar) return { getResponseCode: () => 503, getContentText: () => '{"error":{"message":"indisponível"}}' };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: ia.resposta || '' }] } }] }) };
    } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    // a Representação só é carregada aqui para conferir o gancho da rota /arquivos
    Rep_memoLimpar_() {}, Ast_memoLimpar_() {}, RepD_registros_: () => [], Ast_eu_: (sid) => ({ clienteId: sessoes[sid].clienteId }), Rep_up_: (v) => String(v || '').toUpperCase(), Ast_s_: (v) => (v === null || v === undefined ? '' : String(v).trim())
  });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  const api = (sid, acao, dados) => ctx.LavCiclo_api(sid, acao, dados || {});
  return { ctx, tabelas, props, cache, api, arquivos, pastas, sessoes, chamadasIa, ia, relogio };
}

module.exports = { ambiente, fixture, montarSgolav, abrirSgolav, pastaFixtures };
