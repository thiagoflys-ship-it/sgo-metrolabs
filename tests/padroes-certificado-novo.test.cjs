// Relato do Bento (11/11/2026, perfil TECNICO, área METROLOGIA): anexava o certificado novo do padrão e a leitura por IA
// ficava bloqueada; os filtros "Todos os locais" e "Todos" não mostravam todos os padrões. Este teste percorre o caminho
// inteiro da renovação (anexar o PDF novo -> ler com IA -> conferir e salvar -> padrão vigente com o certificado anterior no
// histórico) com as funções reais do servidor (SGO_CertCal_Main.js, SGO_Padroes.js, SGO_Padroes_Documentos.js) sobre
// planilhas em memória, e a tela completa (CertCal_obterConteudoModulo, como o servidor entrega) num Chromium.
// Só dados fictícios. Sem rede: a IA é simulada.
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
const PDF = Buffer.from('%PDF-1.4\n% certificado de teste\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

/** Ambiente com as funções reais do módulo e planilhas, arquivos e IA em memória. */
function ambiente(opcoes) {
  opcoes = opcoes || {};
  const H = {
    CAD_PADROES: ['ID', 'TAG', 'DESCRICAO', 'INCERTEZA_U95', 'FATOR_K', 'VEFF', 'CERTIFICADO_NUMERO', 'VALIDADE', 'LINK_CERTIFICADO_PDF', 'STATUS', 'CRIADO_EM'],
    PADROES_CONTROLE_DOCUMENTAL: ['ID', 'DADOS_JSON', 'REVISAO', 'ATUALIZADO_EM', 'ATUALIZADO_POR'],
    CAD_TECNICOS: ['ID', 'NOME', 'STATUS', 'USUARIO_ID'],
  };
  const T = { CAD_PADROES: [], PADROES_CONTROLE_DOCUMENTAL: [], CAD_TECNICOS: [] };
  const arquivos = {};
  const novoArquivo = (nome, tipo, bytes, pasta) => { const id = 'arq' + crypto.randomBytes(12).toString('hex'); arquivos[id] = { id, nome, tipo, bytes: Buffer.from(bytes), pasta }; return arquivo(id); };
  const arquivo = id => { const a = arquivos[id]; if (!a) throw new Error('Arquivo não encontrado: ' + id);
    return { getId: () => id, getName: () => a.nome, getMimeType: () => a.tipo, getSize: () => a.bytes.length, getUrl: () => SITE + '/arquivos/' + id,
      getDateCreated: () => new Date(), setSharing() {}, getBlob: () => ({ getBytes: () => Array.from(a.bytes, b => (b > 127 ? b - 256 : b)), getContentType: () => a.tipo }) }; };
  const pasta = nome => ({ nome, getId: () => nome, getFoldersByName: n => { const f = Object.values(arquivos).some(a => (a.pasta || '').startsWith(nome + '/' + n)) || pastas.has(nome + '/' + n); return { hasNext: () => f, next: () => pasta(nome + '/' + n) }; },
    createFolder: n => { pastas.add(nome + '/' + n); return pasta(nome + '/' + n); },
    createFile: blob => novoArquivo(blob.nome, blob.tipo, blob.bytes, nome),
    getFiles: () => { const l = Object.values(arquivos).filter(a => a.pasta === nome).map(a => arquivo(a.id)); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; } });
  const pastas = new Set();
  const cache = {};
  const chamadasIa = [];
  const sessoes = {
    's-bento': { perfil: 'TECNICO', area: 'METROLOGIA', usuario: 'gabriel.bento', userId: 'u-bento' },
    's-comercial': { perfil: 'COMERCIAL', usuario: 'vendas', userId: 'u-com' },
    's-cliente': { perfil: 'CLIENTE', usuario: 'cliente', userId: 'u-cli' },
  };
  const c = {
    console, Session: gas.criarSession(),
    Utilities: gas.criarUtilities({
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (alg, v) => Array.from(crypto.createHash('sha256').update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(Array.from(v, b => b & 255))).digest()),
      base64EncodeWebSafe: b => Buffer.from(Array.from(b, x => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64Decode: s => Array.from(Buffer.from(s, 'base64'), b => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, tipo, nome) => ({ bytes: Buffer.from(Array.from(bytes, b => b & 255)), tipo, nome }),
    }),
    SGO_CFG: { DB_ID: 'db1', SHEETS: { CAD_PADROES: 'CAD_PADROES', CAD_TECNICOS: 'CAD_TECNICOS', CERT_CALIBRACAO: 'CERT_CALIBRACAO' }, SISTEMA: { TIMEZONE: 'America/Sao_Paulo' } },
    SGO_UTILS: { safe: v => String(v == null ? '' : v).trim(), safeUpper: v => String(v == null ? '' : v).trim().toUpperCase() },
    exigirSessao: sid => { const s = sessoes[sid]; if (!s) throw new Error('Sessão inválida.'); return s; },
    isAdminSession: () => false,
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'GEMINI_API_KEY' ? 'chave-teste' : null), setProperty() {} }) },
    DriveApp: { getFileById: id => arquivo(id), getFolderById: id => pasta(id), Access: { ANYONE_WITH_LINK: 'A' }, Permission: { VIEW: 'V' } },
    UrlFetchApp: { fetch: (url, o) => { const corpo = JSON.parse(o.payload); chamadasIa.push(corpo);
      const campos = Object.assign({ CERTIFICADO_NUMERO: 'RBC-2026-0999', VALIDADE: '30/09/2028', DATA_CALIBRACAO: '30/09/2026', LABORATORIO: 'Laboratório Fictício de Massa', SERIE: '', PONTOS: '20 kg', RESULTADOS_CERTIFICADO: 'Massa | Referência | Erro | U | k\n20 kg | 20 kg | +0,02 g | 0,30 g | 2,00' }, opcoes.ia || {});
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ campos, paginas: '1 a 3', alertas: '' }) }] } }] }) }; } },
    Sheets: { Spreadsheets: {
      get: () => ({ sheets: Object.keys(T).map(t => ({ properties: { title: t } })) }),
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
  vm.createContext(c);
  for (const f of ['SGO_CertCal_Calculo.js', 'SGO_CertCal_Main.js', 'SGO_Padroes.js', 'SGO_Padroes_Documentos.js']) vm.runInContext(ler(f), c, { filename: f });
  // Funções de outros arquivos citadas na lista de liberadas do despacho (não usadas aqui).
  const nomes = new Set((ler('SGO_CertCal_Main.js').match(/:(CertCal_api\w+)/g) || []).map(x => x.slice(1)));
  nomes.forEach(n => { if (typeof c[n] !== 'function') c[n] = () => { throw new Error('fora do teste: ' + n); }; });
  // Criação de abas e pasta raiz ficam fora do teste (planilhas em memória já existem).
  vm.runInContext('CertCal_bootstrap_=function(){};PadDoc_bootstrap_=function(){};CertCal_obterPastaDocumentos_=function(){return DriveApp.getFolderById("raiz");};', c);
  // Padrão do print do Bento, com o certificado anterior (Drive antigo, migrado) já conferido.
  const antigo = novoArquivo('Certificado PS-001.20 2024.pdf', 'application/pdf', PDF, 'raiz/Padroes de Referencia/PS-001.20').getId();
  T.CAD_PADROES.push({ ID: 'p1', TAG: 'PS-001.20', DESCRICAO: 'Peso de 20 kg - Classe M1 (Paralelepípedo)', INCERTEZA_U95: '0,5', FATOR_K: '2', VEFF: '0',
    CERTIFICADO_NUMERO: 'RBC-2024-0100', VALIDADE: opcoes.validade || '30/09/2025', LINK_CERTIFICADO_PDF: 'https://drive.google.com/file/d/' + antigo + '/view', STATUS: 'ATIVO', CRIADO_EM: '2024-10-01' });
  T.PADROES_CONTROLE_DOCUMENTAL.push({ ID: 'p1', REVISAO: 'r0', DADOS_JSON: JSON.stringify({ LOCALIZACAO: 'Rio de Janeiro', MODELO: 'Paralelepípedo', FAIXA: '20 kg', GRANDEZA: 'massa', UNIDADE: 'kg',
    LABORATORIO: 'TRESCAL', DATA_CALIBRACAO: '30/09/2024', FONTE_CERTIFICADO: 'https://drive.google.com/file/d/' + antigo + '/view', FONTE_NUMERO: 'RBC-2024-0100', CONFERIDO_EM: '2024-10-02T10:00:00Z' }) });
  T.CAD_PADROES.push({ ID: 'p2', TAG: 'PS-002', DESCRICAO: 'Peso de 10 kg', INCERTEZA_U95: '0,3', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'X-1', VALIDADE: '01/01/2030', LINK_CERTIFICADO_PDF: '', STATUS: 'ATIVO' });
  const api = (sid, fn, payload) => c.CertCal_apiDispatch({ sessionId: sid, fn, payload: payload || {} });
  return { c, T, arquivos, api, chamadasIa, antigo };
}

test('servidor: o PDF anexado no servidor próprio (/arquivos/<id>) é lido pela IA; antes recusava com "Anexe o PDF"', () => {
  const A = ambiente();
  assert.equal(A.c.PadDoc_idPdf_(SITE + '/arquivos/abcDEF_123-x'), 'abcDEF_123-x');
  assert.equal(A.c.PadDoc_idPdf_('/arquivos/abcDEF_123-x?baixar=1'), 'abcDEF_123-x');
  assert.equal(A.c.PadDoc_idPdf_('https://drive.google.com/file/d/abcDEF_123-x/view'), 'abcDEF_123-x');
  assert.equal(A.c.PadDoc_idPdf_('https://outro.site/qualquer'), '');
  const r = A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'Certificado RBC-2026-0999.pdf' });
  assert.match(r.link, /^https:\/\/sgo\.exemplo\.test\/arquivos\/arq[0-9a-f]+$/);
  assert.equal(A.T.CAD_PADROES[0].LINK_CERTIFICADO_PDF, r.link, 'o padrão aponta para o PDF novo');
  assert.ok(A.arquivos[A.antigo], 'o PDF anterior nunca é apagado');
  const ex = A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' });
  assert.equal(ex.campos.CERTIFICADO_NUMERO, 'RBC-2026-0999');
  assert.equal(ex.campos.VALIDADE, '30/09/2028');
  assert.ok(ex.token);
  const parte = A.chamadasIa[0].contents[0].parts[1];
  assert.equal(parte.inlineData.mimeType, 'application/pdf');
  assert.equal(Buffer.from(parte.inlineData.data, 'base64').toString(), PDF.toString(), 'a IA recebe o PDF novo');
});

test('servidor: mensagens da leitura dizem o que falta e o que fazer (sem PDF, não PDF, acima de 12 MB, arquivo sumido)', () => {
  const A = ambiente();
  assert.throws(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p2' }), /ainda não tem o PDF do certificado\. Use Novo certificado/);
  const img = Object.keys(A.arquivos)[0];
  A.arquivos[img].tipo = 'image/jpeg'; A.arquivos[img].nome = 'foto.jpg';
  assert.throws(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' }), /não é um PDF/);
  A.arquivos[img].tipo = 'application/octet-stream'; A.arquivos[img].nome = 'cert.PDF';
  assert.doesNotThrow(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' }), 'PDF gravado sem tipo, com nome .pdf, é aceito');
  A.arquivos[img].tipo = 'application/pdf'; A.arquivos[img].bytes = Buffer.alloc(12 * 1024 * 1024 + 1);
  assert.throws(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' }), /acima de 12 MB.*Reduza/);
  delete A.arquivos[img];
  assert.throws(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' }), /não foi encontrado no servidor/);
  A.T.CAD_PADROES[0].LINK_CERTIFICADO_PDF = 'https://outro.site/x.pdf';
  assert.throws(() => A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' }), /não é reconhecido/);
});

test('servidor: renovação completa pelo perfil do Bento: vigente, número e validade novos, calibração anterior no histórico', () => {
  const A = ambiente();
  assert.equal(A.c.CertCal_classificarValidadePadrao_(A.T.CAD_PADROES[0].VALIDADE).status, 'VENCIDO');
  A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'novo.pdf' });
  const ex = A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' });
  const item = A.c.PadDoc_item_('p1');
  const campos = {}; ['LOCALIZACAO', 'MARCA', 'MODELO', 'SERIE', 'FAIXA', 'GRANDEZA', 'UNIDADE', 'RESOLUCAO', 'LABORATORIO', 'DATA_CALIBRACAO', 'PONTOS', 'RESULTADOS_CERTIFICADO', 'METODO', 'RASTREABILIDADE', 'OBSERVACOES_TECNICAS'].forEach(k => { campos[k] = item[k] == null ? '' : String(item[k]); });
  Object.assign(campos, { CERTIFICADO_NUMERO: ex.campos.CERTIFICADO_NUMERO, VALIDADE: ex.campos.VALIDADE, DATA_CALIBRACAO: ex.campos.DATA_CALIBRACAO, LABORATORIO: ex.campos.LABORATORIO, RESULTADOS_CERTIFICADO: ex.campos.RESULTADOS_CERTIFICADO });
  const r = A.api('s-bento', 'apiSalvarControlePadrao', { padraoId: 'p1', revisao: item.revisao, campos, conferido: true, token: ex.token });
  assert.equal(r.item.CERTIFICADO_NUMERO, 'RBC-2026-0999');
  assert.equal(r.item.VALIDADE, '30/09/2028');
  assert.equal(r.item.conferido, true);
  assert.equal(r.item.LOCALIZACAO, 'Rio de Janeiro', 'localização e demais dados preservados');
  assert.equal(A.c.CertCal_classificarValidadePadrao_(A.T.CAD_PADROES[0].VALIDADE).status, 'OK', 'padrão volta a Vigente');
  const h = r.item.HISTORICO_CALIBRACOES;
  assert.equal(h.length, 1);
  assert.equal(h[0].numero, 'RBC-2024-0100');
  assert.equal(h[0].validade, '30/09/2025');
  assert.equal(h[0].dataCalibracao, '30/09/2024');
  assert.equal(h[0].laboratorio, 'TRESCAL');
  assert.equal(Number(String(h[0].u95).replace(',', '.')), 0.5);
  assert.match(h[0].pdf, new RegExp(A.antigo), 'o histórico guarda o PDF da calibração anterior, não o novo');
  assert.equal(h[0].substituidoPor, 'gabriel.bento');
  // U95 do certificado novo: alterado pelo operador, a IA não mexe.
  A.api('s-bento', 'apiAtualizarPadrao', { padraoId: 'p1', tag: 'PS-001.20', descricao: 'Peso de 20 kg - Classe M1 (Paralelepípedo)', incertezaU95: '0,3', fatorK: '2', veff: '0', certificadoNumero: 'RBC-2026-0999', validade: '30/09/2028' });
  assert.equal(Number(A.T.CAD_PADROES[0].INCERTEZA_U95), 0.3);
  const depois = A.c.PadDoc_item_('p1');
  assert.equal(depois.HISTORICO_CALIBRACOES.length, 1, 'o histórico sobrevive à edição do cadastro');
  assert.equal(depois.conferido, true);
  // Salvar de novo sem mudar número e validade não duplica o histórico.
  const r2 = A.api('s-bento', 'apiSalvarControlePadrao', { padraoId: 'p1', revisao: depois.revisao, campos: Object.assign({}, campos), conferido: false });
  assert.equal(r2.item.HISTORICO_CALIBRACOES.length, 1);
  // Próxima renovação empilha a anterior por cima.
  const r3 = A.api('s-bento', 'apiSalvarControlePadrao', { padraoId: 'p1', revisao: r2.item.revisao, campos: Object.assign({}, campos, { CERTIFICADO_NUMERO: 'RBC-2028-0001', VALIDADE: '30/09/2030' }), conferido: false });
  assert.deepEqual(Array.from(r3.item.HISTORICO_CALIBRACOES, x => x.numero), ['RBC-2026-0999', 'RBC-2024-0100']);
  assert.equal(r3.item.HISTORICO_CALIBRACOES[0].u95, '0.3');
});

test('servidor: leitura que expirou ou cadastro mudado no meio é recusado com instrução', () => {
  const A = ambiente();
  A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'novo.pdf' });
  const ex = A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p1' });
  const rev = A.c.PadDoc_item_('p1').revisao;
  A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'outro.pdf' });
  assert.throws(() => A.api('s-bento', 'apiSalvarControlePadrao', { padraoId: 'p1', revisao: rev, campos: { CERTIFICADO_NUMERO: 'N', VALIDADE: '30/09/2028' }, token: ex.token }), /mudou em outra tela/);
});

test('permissões: técnico da metrologia (Bento) renova; Comercial só consulta, mas vê a foto; Cliente não acessa', () => {
  const A = ambiente();
  assert.doesNotThrow(() => A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'novo.pdf' }));
  assert.throws(() => A.api('s-comercial', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: 'x' }), /consulta certificados e padrões/);
  assert.throws(() => A.api('s-comercial', 'apiSalvarControlePadrao', { padraoId: 'p1' }), /consulta certificados e padrões/);
  assert.deepEqual(JSON.parse(JSON.stringify(A.api('s-comercial', 'apiFotoControlePadrao', { padraoId: 'p1' }))), { ok: true, data: '' }, 'ver a foto é consulta');
  assert.throws(() => A.api('s-cliente', 'apiExtrairControlePadrao', { padraoId: 'p1' }), /exclusivo à equipe interna/);
  // A tela libera as abas de edição para TECNICO e esconde para Comercial.
  const ctx = { USER_CONTEXT: { perfil: 'TECNICO' } }; vm.createContext(ctx);
  vm.runInContext(ler('JS_Padroes_Documentos.html').replace(/<\/?script>/g, '').split('/* ---------- dados da lista ---------- */')[0], ctx);
  assert.equal(ctx.pdrPodeEditar_(), true);
  ctx.USER_CONTEXT.perfil = 'COMERCIAL'; assert.equal(ctx.pdrPodeEditar_(), false);
});

// ---------- tela completa no navegador ----------
let chromium = null;
try { chromium = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

function pagina(perfil) {
  const ctx = { HtmlService: { createHtmlOutputFromFile: n => ({ getContent: () => ler(n + '.html') }) } };
  vm.runInNewContext(ler('SGO_CertCal_ConteudoModulo.js'), ctx);
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><div id="tplCertCalContainer"></div>' +
    '<script>window.CERTCAL_VISAO="padroes";window.__api=function(fn,pl){return window.__apiNode(fn,pl);};var USER_CONTEXT={perfil:' + JSON.stringify(perfil || 'TECNICO') + '};window.__chamadas=[];' +
    'function SGO_getSessionId(){return "s-bento";}var google={script:{get run(){var h={};var o={withSuccessHandler:function(f){h.ok=f;return o;},withFailureHandler:function(f){h.er=f;return o;},' +
    'CertCal_apiDispatch:function(req){window.__chamadas.push({fn:req.fn,payload:req.payload});setTimeout(function(){window.__api(req.fn,req.payload).then(function(r){if(r&&r.__erro)h.er(new Error(r.__erro));else h.ok(r);},function(e){h.er(e);});},5);}};return o;}}};</script>' +
    ctx.CertCal_obterConteudoModulo() + '<script>tplCertCal_renderReal_();</script></body></html>';
}
async function abrirTela(A, opcoes) {
  opcoes = opcoes || {};
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: opcoes.viewport || { width: 1400, height: 900 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  p.on('dialog', d => d.accept());
  await p.exposeFunction('__apiNode', (fn, payload) => { try { return JSON.parse(JSON.stringify(A.api('s-bento', fn, payload))); } catch (e) { return { __erro: e.message }; } });
  await p.setContent(pagina('TECNICO'));
  try { await p.waitForFunction(() => document.querySelector('#pdr[data-pdr-pronto]') && !PD.busy, null, { timeout: 15000 }); }
  catch (e) { const st = await p.evaluate(() => (document.getElementById('pd-status') || {}).textContent).catch(() => ''); await b.close(); throw new Error('A tela não carregou: ' + st + ' ' + erros.join(' | ')); }
  return { b, p, erros };
}
const ocioso = p => p.waitForFunction(() => !PD.busy, null, { timeout: 15000 });
const tags = p => p.$$eval('#pdr-lista .pdr-tag', e => e.map(x => x.textContent.trim()));

test('tela: "Ler o certificado com IA" liga com o PDF do servidor próprio; sem PDF, aparece "Anexar PDF" e o motivo', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p1', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'novo.pdf' });
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirPainel_('p1', 'dados'));
    assert.equal(await p.$eval('[data-pd-action="extract"]', e => e.disabled), false, 'o botão do print do Bento agora liga');
    await p.click('[data-pd-action="extract"]'); await ocioso(p);
    assert.match(await p.textContent('#pd-extraction'), /RBC-2026-0999.*Novo certificado/s);
    await p.evaluate(() => { PDR.painel.sujo = false; pdrAbrirPainel_('p2', 'dados'); });
    assert.equal(await p.$eval('[data-pd-action="extract"]', e => e.disabled), true);
    assert.ok(await p.$('#pdr-painel-corpo [data-pdr-p="pdf"]'), 'botão Anexar PDF ao lado');
    // Anexar pela própria aba Dados redesenha a aba e liga o botão (antes ficava desligado até reabrir).
    await p.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([37, 80, 68, 70, 45])], 'cert.pdf', { type: '' })); const i = document.getElementById('pdr-arquivo'); i.setAttribute('data-id', 'p2'); i.files = dt.files; i.dispatchEvent(new Event('change')); });
    await ocioso(p);
    assert.equal(await p.$eval('[data-pd-action="extract"]', e => e.disabled), false);
    assert.equal(A.arquivos[A.T.CAD_PADROES[1].LINK_CERTIFICADO_PDF.split('/').pop()].tipo, 'application/pdf', 'PDF sem tipo do navegador é gravado como PDF');
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: Novo certificado anexa, lê com IA, confere e salva; o padrão volta a Vigente e o anterior aparece no histórico', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.click('.pdr-tag:text("PS-001.20")');
    assert.match(await p.textContent('#pdr-painel-corpo'), /Vencido.*Novo certificado/s);
    await p.click('#pdr-painel-abas [data-modo="renovar"]');
    // Sem escolher o PDF: diz o que fazer.
    await p.click('[data-pdr-p="renovar-anexar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /Escolha primeiro o PDF/);
    await p.setInputFiles('#pdr-r-pdf', { name: 'Certificado RBC-2026-0999.pdf', mimeType: 'application/pdf', buffer: PDF });
    await p.click('[data-pdr-p="renovar-anexar"]'); await ocioso(p);
    assert.equal(await p.inputValue('#pdr-r-cert'), 'RBC-2026-0999');
    assert.equal(await p.inputValue('#pdr-r-validade'), '30/09/2028');
    assert.equal(await p.inputValue('#pdr-r-datacal'), '30/09/2026');
    assert.equal(await p.inputValue('#pdr-r-lab'), 'Laboratório Fictício de Massa');
    assert.equal(await p.inputValue('#pdr-r-u95'), '0,5', 'a IA não troca a incerteza');
    assert.match(await p.textContent('#pdr-r-leitura'), /Leitura concluída/);
    // Sem a conferência marcada, não salva.
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /Marque "Conferi/);
    assert.equal(A.T.CAD_PADROES[0].CERTIFICADO_NUMERO, 'RBC-2024-0100');
    await p.fill('#pdr-r-u95', '0,3');
    await p.check('#pdr-r-conferido');
    await p.click('[data-pdr-p="renovar-salvar"]'); await ocioso(p);
    const cad = A.T.CAD_PADROES[0];
    assert.equal(cad.CERTIFICADO_NUMERO, 'RBC-2026-0999');
    assert.equal(cad.VALIDADE, '30/09/2028');
    assert.equal(Number(cad.INCERTEZA_U95), 0.3);
    const painel = await p.textContent('#pdr-painel');
    assert.match(painel, /Vigente/);
    assert.match(painel, /Certificado novo de PS-001\.20 salvo: nº RBC-2026-0999, validade 30\/09\/2028/);
    assert.match(painel, /Calibrações anteriores.*Nº RBC-2024-0100 · validade 30\/09\/2025 · calibrado em 30\/09\/2024 · TRESCAL · U95 0,5/s);
    assert.ok(await p.$('#pdr-painel a:text("PDF da época")'));
    const fns = await p.evaluate(() => window.__chamadas.map(c => c.fn));
    assert.ok(fns.indexOf('apiAnexarCertificadoPadrao') < fns.indexOf('apiExtrairControlePadrao') && fns.indexOf('apiExtrairControlePadrao') < fns.indexOf('apiSalvarControlePadrao') && fns.indexOf('apiSalvarControlePadrao') < fns.indexOf('apiAtualizarPadrao'));
    const salvo = await p.evaluate(() => window.__chamadas.find(c => c.fn === 'apiSalvarControlePadrao').payload);
    assert.equal(salvo.conferido, true); assert.ok(salvo.token); assert.equal(salvo.campos.LOCALIZACAO, 'Rio de Janeiro');
    const lista = await p.evaluate(() => PDR.lista.find(x => x.ID === 'p1').st);
    assert.equal(lista, 'OK');
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: validações da renovação (validade, data da calibração, mesmo certificado) e falha da IA não perde o PDF', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente({ ia: { CERTIFICADO_NUMERO: '', VALIDADE: '' } });
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirPainel_('p1', 'renovar'));
    await p.setInputFiles('#pdr-r-pdf', { name: 'novo.pdf', mimeType: 'application/pdf', buffer: PDF });
    await p.click('[data-pdr-p="renovar-anexar"]'); await ocioso(p);
    const msg = await p.textContent('#pdr-r-leitura');
    assert.match(msg, /não achou o número/); assert.match(msg, /não traz validade: informe/);
    await p.check('#pdr-r-conferido');
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /A validade \(30\/09\/2025\) precisa ser posterior à data da calibração \(30\/09\/2026\)/, 'validade antiga com a data da calibração nova');
    await p.fill('#pdr-r-datacal', '');
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /Número e validade iguais/);
    await p.fill('#pdr-r-cert', 'RBC-2026-0999'); await p.fill('#pdr-r-validade', '31/02/2028');
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /dd\/mm\/aaaa/);
    await p.fill('#pdr-r-validade', '01/09/2026'); await p.fill('#pdr-r-datacal', '30/09/2026');
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /posterior à data da calibração/);
    // Arquivo que não é PDF é recusado antes de enviar.
    await p.setInputFiles('#pdr-r-pdf', { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('xx') });
    await p.click('[data-pdr-p="renovar-anexar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /não é PDF/);
    // IA indisponível: o PDF fica anexado e a mensagem diz como seguir.
    A.c.UrlFetchApp.fetch = () => ({ getResponseCode: () => 503, getContentText: () => '' });
    await p.setInputFiles('#pdr-r-pdf', { name: 'novo2.pdf', mimeType: 'application/pdf', buffer: PDF });
    await p.click('[data-pdr-p="renovar-anexar"]'); await ocioso(p);
    assert.match(await p.textContent('#pdr-r-leitura'), /O PDF foi anexado, mas a leitura por IA não terminou: .*HTTP 503.*Ler de novo com IA/s);
    assert.ok(await p.$('[data-pdr-p="renovar-ler"]'));
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: filtros do relato do Bento: ao voltar à tela nenhum filtro fica escondido; "Todos os locais" e "Todos" mostram tudo', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  A.T.CAD_PADROES.push({ ID: 'p3', TAG: 'PS-003', DESCRICAO: 'Peso 5 kg', INCERTEZA_U95: '0,1', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'Y', VALIDADE: '01/01/2020', LINK_CERTIFICADO_PDF: '', STATUS: 'INATIVO' });
  A.T.PADROES_CONTROLE_DOCUMENTAL.push({ ID: 'p2', REVISAO: 'r', DADOS_JSON: JSON.stringify({ LOCALIZACAO: 'São Paulo' }) });
  const { b, p, erros } = await abrirTela(A);
  try {
    assert.deepEqual((await tags(p)).sort(), ['PS-001.20', 'PS-002']);
    await p.fill('#pdr-busca', 'PS-001'); await p.waitForTimeout(250);
    await p.click('.bc-resumo-item[data-valor="VENCIDO"]');
    assert.match(await p.textContent('#pdr-contagem'), /no filtro: vencidos · busca "PS-001"/);
    // Sai e volta à tela (o módulo não é recarregado: o estado em memória continua).
    await p.evaluate(() => tplCertCal_renderReal_()); await ocioso(p); await p.waitForTimeout(100);
    assert.equal(await p.inputValue('#pdr-busca'), '');
    assert.deepEqual((await tags(p)).sort(), ['PS-001.20', 'PS-002'], 'antes ficava só o vencido da busca antiga');
    await p.selectOption('#pdr-local', 'São Paulo');
    assert.deepEqual(await tags(p), ['PS-002']);
    await p.selectOption('#pdr-local', '');
    assert.deepEqual((await tags(p)).sort(), ['PS-001.20', 'PS-002']);
    await p.selectOption('#pdr-situacao', 'TODOS');
    assert.deepEqual((await tags(p)).sort(), ['PS-001.20', 'PS-002', 'PS-003']);
    assert.match(await p.textContent('#pdr-situacao option[value="TODOS"]'), /Todos \(ativos e inativos\)/);
    // Limpar filtros também volta os campos (antes o Local continuava mostrando o local escolhido).
    await p.selectOption('#pdr-local', 'São Paulo');
    await p.click('#pdr-limpar');
    assert.equal(await p.inputValue('#pdr-local'), '');
    assert.equal(await p.inputValue('#pdr-situacao'), 'ATIVOS');
    // Depois de salvar algo (lista recarregada), nenhum filtro antigo volta sozinho.
    await p.evaluate(() => pdRecarregarCadastros()); await p.waitForTimeout(200);
    assert.deepEqual((await tags(p)).sort(), ['PS-001.20', 'PS-002']);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('ajuda e manual: o caminho Novo certificado está descrito; o antigo "Editar" para renovar saiu', () => {
  const ctx = {}; vm.createContext(ctx);
  const aj = ler('SGO_Ajuda_Calibracao.js');
  assert.match(aj, /Novo certificado \(nova calibração\): renovar um padrão vencido ou a vencer/);
  assert.match(aj, /Anexar e ler com IA/);
  assert.match(aj, /Calibrações anteriores/);
  assert.match(aj, /\\"Ler o certificado com IA\\" está desligado/);
  assert.doesNotMatch(aj, /Atualizar a validade depois da recalibração/);
  const mctx = { HtmlService: { createHtmlOutputFromFile: () => ({ getContent: () => '<script></script>' }) } };
  vm.runInNewContext(ler('SGO_CertCal_ConteudoModulo.js'), mctx);
  const manual = mctx.CertCal_obterConteudoModulo();
  assert.match(manual, /Padrão que voltou da calibração:<\/strong> abra o padrão/);
  assert.doesNotMatch(manual, /certificado novo em Padrões de referência \(Editar\)/);
  assert.match(ler('SGO_CertCal_Main.js'), /Registre o certificado novo do padrão em Padrões de referência \(abra o padrão e use Novo certificado\)/);
});
