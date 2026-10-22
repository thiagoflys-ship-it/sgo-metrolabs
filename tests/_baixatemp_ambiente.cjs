// Ambiente de teste do módulo Esterilização a baixa temperatura (21/10/2026): carrega os arquivos reais do módulo
// num contexto isolado, com simulacros dos serviços do Apps Script (planilha em memória, pastas e arquivos em memória,
// Utilities, Properties, Lock e Cache). Só dados de teste.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ARQUIVOS_MODULO = ['SGO_Utilis.js', 'SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_DocRevisao.js', 'SGO_QualIA_Verificador.js', 'SGO_BaixaTemp_Config.js', 'SGO_BaixaTemp_Parser.js',
  'SGO_BaixaTemp_Motor.js', 'SGO_BaixaTemp_IA.js', 'SGO_BaixaTemp_Documento.js', 'SGO_BaixaTemp_Main.js', 'SGO_BaixaTemp_Tela.js', 'SGO_Ajuda_BaixaTemp.js'];

function ler(nome) { return fs.readFileSync(path.join(BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

function criarBlob(bytes, tipo, nome) {
  let buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || '');
  const b = {
    _buf: buf, _tipo: tipo || 'application/octet-stream', _nome: nome || 'arquivo',
    getDataAsString: (cs) => b._buf.toString(/iso-8859-1/i.test(cs || '') ? 'latin1' : 'utf8'),
    setDataFromString: (s) => { b._buf = Buffer.from(String(s), 'utf8'); return b; },
    getBytes: () => Array.from(b._buf, (x) => (x > 127 ? x - 256 : x)),
    getContentType: () => b._tipo, setContentType: (t) => { b._tipo = t; return b; },
    getName: () => b._nome, setName: (n) => { b._nome = n; return b; },
    getAs: (t) => criarBlob(Buffer.from('%PDF-1.4 teste ' + b._buf.length), t, b._nome.replace(/\.html?$/, '') + '.pdf'),
    getBlob: () => b
  };
  return b;
}

function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const abas = {};
  const arquivos = {};
  const pastas = { raiz: { id: 'raiz', nome: 'Raiz', filhos: [], descricao: '' } };
  let seq = 0;
  const props = {};
  const cache = {};
  const logs = [];

  function arquivo(a) {
    return {
      getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getMimeType: () => a.tipo,
      getBlob: () => criarBlob(a.buf, a.tipo, a.nome), setContent: (s) => { a.buf = Buffer.from(String(s)); },
      getParents: () => { let i = 0; const p = pastas[a.pasta]; return { hasNext: () => i === 0 && !!p, next: () => { i++; return pasta(p); } }; },
      setSharing: () => {}
    };
  }
  function iterador(l) { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }
  function pasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id,
      setDescription: (d) => { p.descricao = d; },
      createFolder: (nome) => { const id = 'pasta' + (++seq); pastas[id] = { id, nome, filhos: [], pai: p.id, descricao: '' }; return pasta(pastas[id]); },
      getFoldersByName: (nome) => iterador(Object.values(pastas).filter((x) => x.pai === p.id && x.nome === nome).map(pasta)),
      createFile: (blobOuNome, conteudo, tipo) => {
        const blob = typeof blobOuNome === 'string' ? criarBlob(Buffer.from(String(conteudo || '')), tipo, blobOuNome) : blobOuNome;
        const id = 'arq' + String(++seq).padStart(6, '0');
        arquivos[id] = { id, nome: blob.getName(), tipo: blob.getContentType(), buf: Buffer.from(blob._buf), pasta: p.id };
        return arquivo(arquivos[id]);
      },
      getFiles: () => iterador(Object.values(arquivos).filter((a) => a.pasta === p.id).map(arquivo))
    };
  }
  const DriveApp = {
    getRootFolder: () => pasta(pastas.raiz),
    getFolderById: (id) => { if (!pastas[id]) throw new Error('Não foi possível encontrar a pasta com o ID ' + id); return pasta(pastas[id]); },
    getFileById: (id) => { if (!arquivos[id]) throw new Error('Arquivo não encontrado: ' + id); return arquivo(arquivos[id]); },
    Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 }
  };

  // Planilha em memória com a mesma interface usada pelo SGO_DATA do teste
  const SGO_DATA = {
    _headersCache: {}, _headerMapCache: {},
    getDB: () => ({
      getSheetByName: (n) => (abas[n] ? folha(n) : null),
      insertSheet: (n) => { abas[n] = { cab: [], linhas: [] }; return folha(n); }
    }),
    getAll: (n) => (abas[n] ? abas[n].linhas.map((l) => Object.assign({}, l)) : []),
    getById: (n, id) => { const l = abas[n] && abas[n].linhas.find((x) => String(x.ID) === String(id)); return l ? Object.assign({}, l) : null; },
    insert: (n, o) => { if (!abas[n]) abas[n] = { cab: Object.keys(o), linhas: [] }; o = Object.assign({}, o); if (!o.ID) o.ID = 'id' + (++seq); if (!o.CRIADO_EM) o.CRIADO_EM = new Date().toISOString(); abas[n].linhas.push(o); return o; },
    update: (n, id, d) => { const l = abas[n] && abas[n].linhas.find((x) => String(x.ID) === String(id)); if (!l) return false; Object.assign(l, d); return true; },
    gerarRegistroBase: (extra) => Object.assign({ ID: 'reg' + (++seq), CRIADO_EM: new Date().toISOString() }, extra || {}),
    normalizarObjetoParaSheet: (n, o) => Object.assign({}, o),
    log: (...a) => logs.push(a)
  };
  function folha(n) {
    return {
      appendRow: (r) => { abas[n].cab = r.slice(); },
      getLastColumn: () => abas[n].cab.length,
      getRange: (r, c, nr, nc) => ({
        getValues: () => [abas[n].cab.slice(c - 1, c - 1 + (nc || 1))],
        setValue: (v) => { abas[n].cab[c - 1] = v; },
        setFontWeight: () => ({ setBackground: () => {} })
      }),
      setFrozenRows: () => {}
    };
  }

  const ctx = {
    console, Buffer: undefined,
    Utilities: criarUtilities({
      newBlob: (dados, tipo, nome) => criarBlob(typeof dados === 'string' ? Buffer.from(dados) : Buffer.from(Array.from(dados || [], (x) => x & 255)), tipo, nome),
      base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64'), (x) => (x > 127 ? x - 256 : x)),
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(String(s), 'utf8').digest(), (x) => (x > 127 ? x - 256 : x)),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }
    }),
    Session: criarSession(),
    MimeType: { HTML: 'text/html', PDF: 'application/pdf', PLAIN_TEXT: 'text/plain', CSV: 'text/csv', GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {}, hasLock: () => false }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'http://localhost/exec' }) },
    DriveApp, SGO_DATA,
    SGO_CFG: { SHEETS: { CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS', CAD_PADROES: 'CAD_PADROES', DOC_DOCUMENTOS: 'DOC_DOCUMENTOS' }, STATUS: { ATIVO: 'ATIVO' } }
  };
  vm.createContext(ctx);
  for (const f of ARQUIVOS_MODULO) vm.runInContext(ler(f), ctx, { filename: f });
  vm.runInContext([
    'var SESSOES_TESTE = { tec: { userId: "u_tec", perfil: "TECNICO", nome: "TECNICO DE TESTE", usuario: "tec" }, rt: { userId: "u_rt", perfil: "GESTOR", nome: "RESPONSAVEL DE TESTE", usuario: "rt" }, rt2: { userId: "u_tec", perfil: "GESTOR", nome: "TECNICO DE TESTE", usuario: "tec2" }, com: { userId: "u_com", perfil: "COMERCIAL", nome: "COMERCIAL DE TESTE" }, cli: { userId: "u_cli", perfil: "CLIENTE" } };',
    'function exigirSessao(sid) { var s = SESSOES_TESTE[sid]; if (!s) throw new Error("Sessão inválida"); return s; }',
    'var DOCS_REGISTRADOS = [];',
    'var SGO_DOCUMENTOS = { registrarDocumentoExistente: function (sid, p) { DOCS_REGISTRADOS.push(p); return { success: true }; } };',
    'var SGO_VINCULOS = { relation: function () { return {}; } };',
    'var SGO_CLIENTES = { pesquisar: function () { return { success: true, items: SGO_DATA.getAll("CAD_CLIENTES") }; } };',
    'var SGO_EQUIPAMENTOS = { listarUnidadesAtivasPorCliente: function (s, c) { return { items: SGO_DATA.getAll("CAD_UNIDADES").filter(function (u) { return u.CLIENTE_ID === c; }) }; } };',
    'var CadeiaFrioRel_CFCFG = { EMPRESA_EXECUTANTE: { nome: "EMPRESA EXECUTANTE DE TESTE", cnpj: "00.000.000/0001-00" }, ASSINATURAS_PADRAO: [{ nome: "RESPONSAVEL TECNICO DE TESTE", cargo: "Engenheiro responsável técnico", registro: "CREA TESTE 0000", imagemSvg: "<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\'></svg>" }] };',
    // PDF e paginação reais ficam para o ensaio no servidor (Chromium); aqui o PDF é simulado.
    'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
    'function SGO_DocA4_chamarGemini_(prompt, op) { if (typeof IA_TESTE !== "function") throw new Error("a chave da IA (GEMINI_API_KEY) não está cadastrada"); return IA_TESTE(prompt, op); }'
  ].join('\n'), ctx);
  if (opcoes.extra) vm.runInContext(opcoes.extra, ctx);
  // cadastro de teste
  SGO_DATA.insert('CAD_CLIENTES', { ID: 'cli1', RAZAO_SOCIAL: 'HOSPITAL TESTE LTDA', NOME_FANTASIA: 'HOSPITAL TESTE', CNPJ: '11222333000181', ENDERECO: 'Rua de Teste, 1', STATUS: 'ATIVO' });
  SGO_DATA.insert('CAD_UNIDADES', { ID: 'uni1', CLIENTE_ID: 'cli1', NOME_UNIDADE: 'CME TESTE', ENDERECO: 'Rua de Teste, 1', STATUS: 'ATIVO' });
  SGO_DATA.insert('CAD_EQUIPAMENTOS', { ID: 'eq1', CLIENTE_ID: 'cli1', UNIDADE_ID: 'uni1', TIPO: 'ESTERILIZADOR BAIXA TEMPERATURA', FABRICANTE: 'MARCAFICTICIA', MODELO: 'MODELOXYZ', SERIE: 'SN-TESTE-1', TAG: 'EST-T01', SETOR: 'CME', STATUS: 'ATIVO' });
  return {
    ctx, abas, arquivos, pastas, props, logs,
    run: (codigo) => vm.runInContext(codigo, ctx),
    arquivoTexto: (nome, texto) => pasta(pastas.raiz).createFile(nome, texto, 'text/csv').getId(),
    api: (sid, fn, payload) => JSON.parse(JSON.stringify(ctx.BaixaTemp_apiDispatch({ sessionId: sid, fn, payload: payload || {} })))
  };
}

/* ============================================================ geradores de dados de teste */

function dd(n) { return String(n).padStart(2, '0'); }
function horaTxt(ms) { const d = new Date(ms); return dd(d.getUTCHours()) + ':' + dd(d.getUTCMinutes()) + ':' + dd(d.getUTCSeconds()); }
function dataTxt(ms) { const d = new Date(ms); return dd(d.getUTCDate()) + '/' + dd(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); }
function v(x, c) { return Number(x).toFixed(c === undefined ? 2 : c).replace('.', ','); }

/**
 * Ciclo de peróxido de hidrogênio sintético, intervalo de 30 s a partir de 20/10/2026 10:00:00:
 *  i 0-3 pressão ambiente (1013); 4-9 descida; 10-13 vácuo 0,5 mbar;
 *  4 pulsos de 8 leituras (6 a 15 mbar + 2 em vácuo 0,6 mbar) em i 14-45; 46-49 vácuo final 0,4; 50+ ventilação.
 *  Temperaturas: base −5 °C fora de 10-49; nos sensores, base 50,00 / 50,50 / 49,60 (+ ajuste opcional).
 * Janela esperada: i 14 (10:07:00) a i 44 (10:22:00) = 15,00 min; 4 pulsos; pressão mínima 0,40 mbar.
 */
function cicloPeroxido(opcoes) {
  opcoes = opcoes || {};
  const t0 = Date.UTC(2026, 9, opcoes.dia || 20, 10, 0, 0);
  const bases = opcoes.bases || [50, 50.5, 49.6];
  const pulsos = opcoes.pulsos || 4;
  const n = 14 + pulsos * 8 + 4 + 6;
  const linhas = [['Data', 'Hora'].concat(bases.map((_, k) => 'T' + (k + 1) + ' (°C)')).concat(['Pressão (mbar)']).join(';')];
  for (let i = 0; i < n; i++) {
    let p;
    if (i < 4) p = 1013; else if (i < 10) p = 1013 - (i - 3) * 168; else if (i < 14) p = 0.5;
    else if (i < 14 + pulsos * 8) { const k = (i - 14) % 8; p = k < 6 ? 15 : 0.6; }
    else if (i < 14 + pulsos * 8 + 4) p = 0.4; else p = 1013;
    const quente = i >= 10 && i < 14 + pulsos * 8 + 4;
    const temps = bases.map((b, k) => v(b + (quente ? 0 : -5) + (opcoes.ajuste ? opcoes.ajuste(i, k) : 0)));
    linhas.push([dataTxt(t0 + i * 30000), horaTxt(t0 + i * 30000)].concat(temps).concat([v(p)]).join(';'));
  }
  return linhas.join('\n');
}

/**
 * Ciclo VBTF sintético: intervalo de 60 s, 08:00:00; aquecimento 0-4 (40 °C), patamar 5-64 (60 °C nas bases),
 * resfriamento 65-69 (45 °C). Pressão: vácuo 50 mbar com 6 pulsos de 200 mbar dentro do patamar.
 * Janela por temperatura com programada 60 e tolerância inferior 2 (limite 58): i 5 a 64 = 59,00 min.
 */
function cicloFormaldeido(opcoes) {
  opcoes = opcoes || {};
  const t0 = Date.UTC(2026, 9, opcoes.dia || 21, 8, 0, 0);
  const bases = opcoes.bases || [60.2, 60.8, 59.7, 60.4];
  const linhas = [['Data/Hora'].concat(bases.map((_, k) => 'ST-' + dd(k + 1))).concat(['Pressão kPa']).join(';')];
  for (let i = 0; i < 70; i++) {
    const plat = i >= 5 && i < 65;
    let pk;
    if (i < 3) pk = 101.3; else if (i < 5) pk = 5; else if (plat) { const k = (i - 5) % 10; pk = k >= 2 && k < 5 ? 20 : 5; } else if (i < 68) pk = 5; else pk = 101.3;
    const temps = bases.map((b, k) => v((plat ? b : (i < 5 ? 40 : 45)) + (opcoes.ajuste ? opcoes.ajuste(i, k) : 0)));
    linhas.push([dataTxt(t0 + i * 60000) + ' ' + horaTxt(t0 + i * 60000)].concat(temps).concat([v(pk, 1)]).join(';'));
  }
  return linhas.join('\n');
}

module.exports = { criarAmbiente, cicloPeroxido, cicloFormaldeido, criarBlob, BASE };
