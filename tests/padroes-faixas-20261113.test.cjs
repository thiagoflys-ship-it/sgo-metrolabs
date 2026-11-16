// Pedido do dono (13/11/2026): "Quando mandamos calibrar um padrão, às vezes tem mais de uma faixa (0, 5, 10, 50 e 100 graus)
// e cada um tem seu erro, U95, Veff. No SGO hoje eu só consigo escolher um para cadastrar." Este teste cobre a tabela de pontos
// calibrados por padrão (CAD_PADROES.PONTOS_JSON) de ponta a ponta: cadastro antigo de 1 ponto (compatível), 5 pontos de 0 a
// 100 °C, 12 pontos, colar tabela do PDF/planilha, Novo certificado com histórico, escolha do ponto no certificado (exato,
// entre pontos, fora da faixa, outra unidade), correção pelo erro do padrão, certificado antigo inalterado (base x candidato),
// grupos TAG (canal), leitura por IA só como proposta e a tela no computador e no celular (320, 360 e 390 px).
// Funções reais do servidor (SGO_CertCal_Calculo/Main/Documento/Revisao, SGO_Padroes, SGO_Padroes_Pontos,
// SGO_Padroes_Documentos) sobre planilhas em memória e a tela completa (CertCal_obterConteudoModulo) num Chromium.
// Só dados fictícios. Sem rede: a IA é simulada.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const gas = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db'); // DEST (candidato ou base)
const PRODUCAO = path.resolve(__dirname, '../output/padroes-faixas-20261113/base');      // produção atual, sem mudança
const ler = (n, dir) => fs.readFileSync(path.join(dir || BASE, n), 'utf8');
const existe = (n, dir) => fs.existsSync(path.join(dir || BASE, n));
const SITE = 'https://sgo.exemplo.test';
const PDF = Buffer.from('%PDF-1.4\n% certificado de teste\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
let chromium = null;
try { chromium = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

/* ---------- acervo fictício ---------- */
const P5 = [ // 5 pontos de 0 a 100 °C: indicação, referência, erro, U95, k, νeff
  { nominal: '0', indicacao: '0,02', referencia: '0,00', erro: '0,02', u95: '0,05', k: '2,00', veff: '∞', unidade: '°C', grandeza: 'Temperatura' },
  { nominal: '5', indicacao: '5,01', referencia: '5,00', erro: '0,01', u95: '0,05', k: '2,00', veff: '∞', unidade: '°C', grandeza: 'Temperatura' },
  { nominal: '10', indicacao: '10,03', referencia: '10,00', erro: '0,03', u95: '0,06', k: '2,05', veff: '60', unidade: '°C', grandeza: 'Temperatura' },
  { nominal: '50', indicacao: '50,04', referencia: '50,00', erro: '0,04', u95: '0,08', k: '2,00', veff: '∞', unidade: '°C', grandeza: 'Temperatura' },
  { nominal: '100', indicacao: '100,06', referencia: '100,00', erro: '0,06', u95: '0,12', k: '2,00', veff: '∞', unidade: '°C', grandeza: 'Temperatura' },
];
// 12 pontos de -40 a 180 °C como sai de uma planilha (CSV com ;), com "Correção" no lugar do erro.
const TEXTO_12 = 'Ponto (°C);Indicação (°C);Correção (°C);Incerteza (°C);k;Veff\n' +
  [-40, -20, 0, 20, 37, 50, 70, 100, 121, 134, 150, 180].map((v, i) => [v, (v + 0.01 * (i + 1)).toFixed(2).replace('.', ','), (-0.01 * (i + 1)).toFixed(2).replace('.', ','), (0.05 + 0.01 * i).toFixed(2).replace('.', ','), i === 4 ? '2,13' : '2,00', i === 4 ? '25' : '∞'].join(';')).join('\n');

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const dir = opcoes.dir || BASE;
  const H = {
    CAD_PADROES: ['ID', 'TAG', 'DESCRICAO', 'INCERTEZA_U95', 'FATOR_K', 'VEFF', 'CERTIFICADO_NUMERO', 'VALIDADE', 'STATUS', 'CRIADO_EM', 'LINK_CERTIFICADO_PDF', 'PONTOS_JSON'],
    PADROES_CONTROLE_DOCUMENTAL: ['ID', 'DADOS_JSON', 'REVISAO', 'ATUALIZADO_EM', 'ATUALIZADO_POR'],
    CAD_TECNICOS: ['ID', 'NOME', 'STATUS', 'USUARIO_ID'],
    CERT_CALIBRACAO: ['ID', 'NUMERO_CERTIFICADO', 'CLIENTE_ID', 'EQUIPAMENTO_ID', 'TECNICO_ID', 'DADOS_JSON', 'STATUS'],
  };
  const T = { CAD_PADROES: [], PADROES_CONTROLE_DOCUMENTAL: [], CAD_TECNICOS: [], CERT_CALIBRACAO: [] };
  const arquivos = {}, pastas = new Set(), cache = {}, chamadasIa = [];
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
    SGO_CFG: { DB_ID: 'db1', SHEETS: { CAD_PADROES: 'CAD_PADROES', CAD_TECNICOS: 'CAD_TECNICOS', CERT_CALIBRACAO: 'CERT_CALIBRACAO', CAD_CLIENTES: 'CAD_CLIENTES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' }, SISTEMA: { TIMEZONE: 'America/Sao_Paulo' } },
    SGO_UTILS: { safe: v => String(v == null ? '' : v).trim(), safeUpper: v => String(v == null ? '' : v).trim().toUpperCase() },
    exigirSessao: sid => { const s = sessoes[sid]; if (!s) throw new Error('Sessão inválida.'); return s; },
    isAdminSession: () => false,
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'GEMINI_API_KEY' ? 'chave-teste' : null), setProperty() {} }) },
    DriveApp: { getFileById: id => arquivo(id), getFolderById: id => pasta(id), Access: { ANYONE_WITH_LINK: 'A' }, Permission: { VIEW: 'V' } },
    UrlFetchApp: { fetch: (url, o) => { const corpo = JSON.parse(o.payload); chamadasIa.push(corpo);
      const campos = Object.assign({ CERTIFICADO_NUMERO: 'RBC-2026-0500', VALIDADE: '30/09/2028', DATA_CALIBRACAO: '30/09/2026', LABORATORIO: 'Laboratório Fictício de Temperatura', SERIE: '' }, opcoes.ia || {});
      const resposta = { campos, paginas: '1 a 4', alertas: '' };
      if (opcoes.iaPontos) resposta.PONTOS_TABELA = opcoes.iaPontos;
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(resposta) }] } }] }) }; } },
    Sheets: { Spreadsheets: {
      get: () => ({ sheets: Object.keys(T).map(t => ({ properties: { title: t } })) }),
      Values: { batchGet: (db, o) => ({ valueRanges: o.ranges.map(r => { const n = r.replace(/^'|'$/g, ''); return { values: [H[n]].concat(T[n].map(l => H[n].map(h => (l[h] == null ? '' : l[h])))) }; }) }) },
      batchUpdate: (req) => { req.requests.forEach(q => { if (!q.updateCells) return; const st = q.updateCells.start; const n = st.sheetId; let l = T[n][st.rowIndex - 1]; if (!l) { l = {}; T[n][st.rowIndex - 1] = l; }
        const v = q.updateCells.rows[0].values[0].userEnteredValue; l[H[n][st.columnIndex]] = 'numberValue' in v ? v.numberValue : v.stringValue; }); },
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
  const arquivosServidor = ['SGO_CertCal_Config.js', 'SGO_CertCal_Calculo.js', 'SGO_CertCal_Main.js', 'SGO_Padroes_Pontos.js', 'SGO_Padroes.js', 'SGO_Padroes_Documentos.js', 'SGO_CertCal_Revisao.js'];
  for (const f of arquivosServidor) if (existe(f, dir)) vm.runInContext(ler(f, dir), c, { filename: f });
  const nomes = new Set((ler('SGO_CertCal_Main.js', dir).match(/:(CertCal_api\w+)/g) || []).map(x => x.slice(1)));
  nomes.forEach(n => { if (typeof c[n] !== 'function') c[n] = () => { throw new Error('fora do teste: ' + n); }; });
  vm.runInContext('CertCal_bootstrap_=function(){};PadDoc_bootstrap_=function(){};CertCal_obterPastaDocumentos_=function(){return DriveApp.getFolderById("raiz");};', c);
  const futuro = '31/12/2030';
  const pdf5 = novoArquivo('Certificado TP-100.pdf', 'application/pdf', PDF, 'raiz/Padroes de Referencia/TP-100').getId();
  // Legado: um valor só (U95 0,5 °C), como todos os cadastros de hoje.
  T.CAD_PADROES.push({ ID: 'leg', TAG: 'TL-01', DESCRICAO: 'Termômetro de valor único', INCERTEZA_U95: '0,5', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'L-1', VALIDADE: futuro, STATUS: 'ATIVO', LINK_CERTIFICADO_PDF: '' });
  // TP-100 começa no cadastro antigo; os testes gravam a tabela de 5 pontos pela API.
  T.CAD_PADROES.push({ ID: 'p5', TAG: 'TP-100', DESCRICAO: 'Termômetro padrão 0 a 100 °C', INCERTEZA_U95: '0,05', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'RBC-2025-0100', VALIDADE: futuro, STATUS: 'ATIVO', LINK_CERTIFICADO_PDF: SITE + '/arquivos/' + pdf5 });
  T.PADROES_CONTROLE_DOCUMENTAL.push({ ID: 'p5', REVISAO: 'r0', DADOS_JSON: JSON.stringify({ LOCALIZACAO: 'Laboratório', GRANDEZA: 'Temperatura', UNIDADE: '°C', LABORATORIO: 'Lab Antigo', DATA_CALIBRACAO: '01/10/2025',
    RESULTADOS_CERTIFICADO: 'Grandeza/canal | Referência | Indicação | Erro/correção | Incerteza | K | Veff | Unidade\nTemperatura | 0,00 | 0,02 | 0,02 | 0,05 | 2,00 | ∞ | °C\nTemperatura | 50,00 | 50,04 | 0,04 | 0,08 | 2,00 | ∞ | °C\nTemperatura | 100,00 | 100,06 | 0,06 | 0,12 | 2,00 | ∞ | °C' }) });
  // Grupo TAG (canal): termo-higrômetro com um cadastro por grandeza.
  T.CAD_PADROES.push({ ID: 'gT', TAG: 'THM-002 (T)', DESCRICAO: 'Termo-higrômetro - temperatura', INCERTEZA_U95: '0,3', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'C-77', VALIDADE: futuro, STATUS: 'ATIVO', LINK_CERTIFICADO_PDF: '' });
  T.CAD_PADROES.push({ ID: 'gU', TAG: 'THM-002 (U)', DESCRICAO: 'Termo-higrômetro - umidade', INCERTEZA_U95: '2', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'C-77', VALIDADE: futuro, STATUS: 'ATIVO', LINK_CERTIFICADO_PDF: '' });
  T.CAD_PADROES.push({ ID: 'venc', TAG: 'TV-09', DESCRICAO: 'Termômetro vencido', INCERTEZA_U95: '0,1', FATOR_K: '2', VEFF: '0', CERTIFICADO_NUMERO: 'V-9', VALIDADE: '01/01/2025', STATUS: 'ATIVO', LINK_CERTIFICADO_PDF: '' });
  const api = (sid, fn, payload) => c.CertCal_apiDispatch({ sessionId: sid, fn, payload: payload || {} });
  return { c, T, H, api, arquivos, chamadasIa, pdf5 };
}
const cad = (A, id) => A.T.CAD_PADROES.find(p => p.ID === id);
const atualizarComPontos = (A, id, pontos, extra) => { const p = cad(A, id);
  return A.api('s-bento', 'apiAtualizarPadrao', Object.assign({ padraoId: id, tag: p.TAG, descricao: p.DESCRICAO, certificadoNumero: p.CERTIFICADO_NUMERO, validade: p.VALIDADE, pontos }, extra || {})); };
const bloco = (ids, pontos, extra) => Object.assign({ titulo: 'Temperatura', unidade: '°C', resolucao: '0,01', padroesIds: ids, pontos: pontos.map(v => ({ nominal: String(v).replace('.', ','), leituras: [String(v + 0.1).replace('.', ','), String(v + 0.11).replace('.', ','), String(v + 0.12).replace('.', ',')] })) }, extra || {});
const previa = (A, blocos) => A.c.CertCal_apiCalcularPreview('s-bento', { blocos });
const js = x => JSON.parse(JSON.stringify(x)); // objetos criados no vm: compara pelo conteúdo
const padraoDaMemoria = r => r.memoriaCalculo.componentes.filter(x => /Certificado do padrão/.test(x.origem));

/* =================== núcleo: leitura e conferência da tabela =================== */

test('colar tabela: tabulação, ponto e vírgula, |, CSV com ponto decimal e espaços; títulos variados; "1.000"; ∞ da fonte Symbol', () => {
  const { c } = ambiente();
  const P = c.PadPontos;
  // Planilha (tabulação), com unidade nos títulos e células.
  let r = P.lerTexto('Ponto\tIndicação\tErro\tU95\tk\tνeff\n0\t0,02\t0,02\t0,05\t2,00\t∞\n50\t50,04\t0,04\t0,08 °C\t2,00\t∞');
  assert.equal(r.erro, ''); assert.equal(r.linhas.length, 2); assert.equal(r.linhas[1].u95, '0,08'); assert.equal(r.linhas[1].unidade, '°C');
  // Texto do PDF lido por IA (|), com antes/depois do ajuste e duas indicações (mA e °C): vale a coluna da unidade da incerteza e "após".
  r = P.lerTexto('VLI antes (°C) | VR antes (°C) | Erro antes (°C) | VMLI após (°C) | VR após (°C) | Tendência após (°C) | U (°C) | K | Veff\n102,34 | 99,91 | 2,43 | 100,07 | 99,91 | 0,16 | 0,43 | 2,00 | Infinito');
  assert.deepEqual(js(r.linhas[0]), { indicacao: '100,07', referencia: '99,91', erro: '0,16', u95: '0,43', k: '2,00', veff: '∞', unidade: '°C' });
  r = P.lerTexto('Referência (°C) | Indicação (mA) | Indicação (°C) | Tendência (°C) | U (°C) | K | Veff\n20,20 | 9,1370 | 19,26 | -0,94 | 0,60 | 2,00 | Infinito');
  assert.equal(r.linhas[0].indicacao, '19,26', 'indicação em °C, não em mA');
  // pt-BR: "1.000" é mil; "\uf0a5" é o ∞ copiado da fonte Symbol.
  r = P.lerTexto('VR UMP (rpm) | MM UST (rpm) | IM (rpm) | K | Veff\n1.000 | 1.000 | 1 | 2,00 | \uf0a5\n10,0 | 10,0 | 0,1 | 2,00 | 77');
  assert.equal(r.linhas[0].referencia, '1000'); assert.equal(P.validar(r.linhas).pontos[0].nominal, 1000); assert.equal(P.validar(r.linhas).pontos[0].veff, 0);
  // CSV de planilha em inglês (vírgula separa, ponto é decimal).
  r = P.lerTexto('Nominal,Reference,Error,U,k\n0,0.00,0.02,0.05,2\n50,50.00,0.04,0.08,2');
  assert.equal(r.erro, ''); assert.equal(P.validar(r.linhas).pontos[1].erro, 0.04);
  // Correção: erro = −correção.
  r = P.lerTexto(TEXTO_12);
  const v12 = P.validar(r.linhas);
  assert.deepEqual(js(v12.erros), []); assert.equal(v12.pontos.length, 12); assert.equal(v12.pontos[0].erro, 0.01, 'correção -0,01 vira erro +0,01');
  assert.equal(v12.pontos[4].k, 2.13); assert.equal(v12.pontos[4].veff, 25); assert.equal(v12.pontos[0].unidade, '°C');
  // Linha sem incerteza (ponto zero com "---") fica de fora, com aviso.
  r = P.lerTexto('Indicação (bar) | VR médio (bar) | Tendência (bar) | U (bar) | K | Veff\n0,0 | 0,0 | 0,0 | --- | --- | ---\n100,0 | 99,1 | 0,9 | 1,2 | 2,00 | Infinito');
  assert.equal(r.linhas.length, 1); assert.match(r.avisos.join(' '), /sem incerteza no certificado/);
  // Sem a linha de títulos não adivinha: diz o que fazer.
  assert.match(P.lerTexto('0;0,02;0,05;2\n50;50,04;0,08;2').erro, /linha de títulos.*leia de novo/);
  // Espaços com títulos de várias palavras: não dá para saber as colunas; diz como colar.
  assert.match(P.lerTexto('Valor de referência Indicação U95 k\n0 0,02 0,05 2').erro, /tabulação|ponto e vírgula/);
  assert.match(P.lerTexto('').erro, /cole a tabela/i);
});

test('conferência da tabela: o quê, por quê e o que fazer em cada problema; avisos de sinal do erro e pontos repetidos', () => {
  const { c } = ambiente();
  const P = c.PadPontos;
  const v = P.validar([{ nominal: '0', u95: 'abc', k: '2' }, { u95: '0,1', k: '2' }, { nominal: '50', u95: '0,1' }, { nominal: '60', de: '50', u95: '0,1', k: '2' }, { nominal: '70', u95: '0,1', k: '2', unidade: '%UR' }, { nominal: '80', u95: '0,1', k: '2', unidade: '°C' }]);
  assert.equal(v.pontos.length, 0, 'com erro nada é aceito');
  assert.match(v.erros.join('\n'), /Linha 1: U95 "abc" não é um número/);
  assert.match(v.erros.join('\n'), /Linha 2: informe o ponto \(ou a faixa De\/Até\)/);
  assert.match(v.erros.join('\n'), /Linha 3: falta o fator k/);
  assert.match(v.erros.join('\n'), /Linha 4: para uma faixa, informe De e Até/);
  assert.match(v.erros.join('\n'), /Linha 6: unidade "°C" diferente da linha 5.*THM-002 \(U\)/);
  const a = P.validar([{ nominal: '10', indicacao: '10,03', referencia: '10,00', erro: '-0,03', u95: '0,06', k: '2' }, { nominal: '10', u95: '0,07', k: '2', erro: '0,01' }]);
  assert.match(a.avisos.join('\n'), /erro = indicação − referência; correção = −erro/);
  assert.match(a.avisos.join('\n'), /mesmo ponto.*maior incerteza.*não aplica correção/);
  assert.equal(P.validar([]).erros.length, 1);
});

/* =================== 1 ponto (compatível com o cadastro antigo) =================== */

test('padrão de 1 ponto: o cadastro antigo vale como 1 ponto; salvar 1 ponto não cria tabela e o cálculo é idêntico ao da produção', () => {
  const A = ambiente(), B = ambiente({ dir: PRODUCAO });
  const info = A.c.PadPontos.ler(cad(A, 'leg'));
  assert.equal(info.legado, true); assert.equal(info.pontos.length, 1); assert.equal(info.pontos[0].u95, 0.5);
  // Mesmo ensaio, mesmos padrões de valor único: candidato e produção calculam exatamente igual (nenhum campo novo).
  const blocos = [bloco(['leg'], [20, 37, 121])];
  assert.deepEqual(JSON.parse(JSON.stringify(previa(A, blocos))), JSON.parse(JSON.stringify(previa(B, blocos))));
  // Gravar 1 linha só com U95/k/νeff não cria PONTOS_JSON (fica como era).
  atualizarComPontos(A, 'leg', [{ u95: '0,4', k: '2', veff: '' }]);
  assert.equal(cad(A, 'leg').INCERTEZA_U95, 0.4); assert.equal(cad(A, 'leg').FATOR_K, 2);
  assert.ok(!('PONTOS_JSON' in cad(A, 'leg')) || cad(A, 'leg').PONTOS_JSON === '', 'sem tabela gravada');
  // Ponto único com valor: vale para o bloco inteiro (como antes), com aviso na conferência.
  const v = A.c.PadPontos.validar([{ nominal: '121', u95: '0,2', k: '2', unidade: '°C' }]);
  assert.match(v.avisos.join(' '), /Ponto único: ele vale para todo o bloco/);
  assert.equal(A.c.PadPontos.escolher(v.pontos, 37, '°C').regra, 'UNICO');
});

/* =================== 5 pontos de 0 a 100 °C =================== */

test('5 pontos de 0 a 100 °C: grava a tabela ligada ao certificado; colunas antigas ficam com o ponto de maior incerteza', () => {
  const A = ambiente();
  const r = atualizarComPontos(A, 'p5', P5);
  assert.equal(r.ok, true);
  const p = cad(A, 'p5'), j = JSON.parse(p.PONTOS_JSON);
  assert.equal(j.certificado, 'RBC-2025-0100'); assert.equal(j.pontos.length, 5);
  assert.deepEqual(j.pontos[2], { grandeza: 'Temperatura', unidade: '°C', nominal: 10, indicacao: 10.03, referencia: 10, erro: 0.03, u95: 0.06, k: 2.05, veff: 60 });
  assert.equal(p.INCERTEZA_U95, 0.12); assert.equal(p.FATOR_K, 2); assert.equal(p.VEFF, 0);
  // A listagem da tela traz a tabela; o comercial só consulta e não grava.
  const lista = A.api('s-bento', 'apiListarControlePadroes');
  assert.ok(lista.padroes.find(x => x.ID === 'p5').PONTOS_JSON);
  assert.throws(() => A.api('s-comercial', 'apiAtualizarPadrao', { padraoId: 'p5', tag: 'TP-100', descricao: 'x', pontos: P5 }), /Comercial.*não pode/);
  // Tabela com problema: nada é salvo e a mensagem diz o quê e o que fazer.
  assert.throws(() => atualizarComPontos(A, 'p5', [P5[0], Object.assign({}, P5[1], { u95: '' })]), /tabela de pontos calibrados tem 1 problema.*Linha 2: falta a U95.*Corrija as linhas indicadas/);
  assert.equal(JSON.parse(cad(A, 'p5').PONTOS_JSON).pontos.length, 5);
  // Tela antiga (sem tabela) não troca U95 nem o número do certificado por fora da tabela.
  assert.throws(() => A.api('s-bento', 'apiAtualizarPadrao', { padraoId: 'p5', tag: 'TP-100', descricao: 'x', incertezaU95: '0,05', fatorK: '2', veff: '0', certificadoNumero: 'RBC-2025-0100', validade: '31/12/2030' }), /tem uma tabela de pontos calibrados.*Nada foi salvo.*Cadastro e validade/);
  assert.throws(() => A.api('s-bento', 'apiAtualizarPadrao', { padraoId: 'p5', tag: 'TP-100', descricao: 'x', incertezaU95: '0,12', fatorK: '2', veff: '0', certificadoNumero: 'OUTRO-1', validade: '31/12/2030' }), /Trocar o número do certificado sem conferir os pontos.*Novo certificado/);
  // Anexar PDF (regrava o cadastro com os mesmos valores) continua funcionando e preserva a tabela.
  A.api('s-bento', 'apiAnexarCertificadoPadrao', { padraoId: 'p5', certificadoBase64: PDF.toString('base64'), certificadoMimeType: 'application/pdf', certificadoNomeArquivo: 'novo.pdf' });
  assert.equal(JSON.parse(cad(A, 'p5').PONTOS_JSON).pontos.length, 5);
});

test('escolha do ponto no certificado: exato, entre pontos (maior incerteza), fora da faixa e outra unidade bloqueiam com mensagem clara', () => {
  const A = ambiente();
  atualizarComPontos(A, 'p5', P5);
  const res = previa(A, [bloco(['p5'], [50, 30, 7, 0, 100])]).blocos[0];
  const fonte = r => padraoDaMemoria(r)[0];
  const calc = (x, u, k, veff) => A.c.CertCalCalculo.calcularPonto(x, [x + 0.1, x + 0.11, x + 0.12], [{ codigo: 'TP-100', incertezaU95: u, fatorK: k, veff }], 0.01);
  // 50: ponto calibrado. U95 0,08 desse ponto.
  assert.equal(fonte(res.resultados[0]).incertezaExpandidaOrigem, 0.08);
  assert.deepEqual(js(res.resultados[0].pontosPadrao).map(p => [p.regra, p.ponto, p.incertezaU95]), [['EXATO', 'ponto 50\u00a0°C', 0.08]]);
  assert.equal(res.resultados[0].incertezaU95, calc(50, 0.08, 2, 0).incertezaU95);
  // 30: entre 10 (U 0,06 k 2,05 → u 0,0293) e 50 (U 0,08 k 2 → u 0,04): vale o 50.
  assert.equal(res.resultados[1].pontosPadrao[0].regra, 'ENTRE'); assert.equal(fonte(res.resultados[1]).incertezaExpandidaOrigem, 0.08);
  assert.match(res.resultados[1].pontosPadrao[0].ponto, /entre 10 e 50.*ponto 50/);
  // 7: entre 5 (u 0,025) e 10 (u 0,0293): vale o 10, com o k e o νeff do próprio ponto.
  assert.deepEqual([fonte(res.resultados[2]).incertezaExpandidaOrigem, fonte(res.resultados[2]).fatorKOrigem, fonte(res.resultados[2]).grausLiberdade], [0.06, 2.05, 60]);
  assert.equal(res.resultados[2].incertezaU95, calc(7, 0.06, 2.05, 60).incertezaU95);
  assert.equal(fonte(res.resultados[3]).incertezaExpandidaOrigem, 0.05);
  assert.equal(fonte(res.resultados[4]).incertezaExpandidaOrigem, 0.12);
  // Sem correção pedida: o valor de referência é o digitado (nenhum campo de correção).
  assert.equal(res.resultados[1].nominal, 30); assert.equal(res.resultados[1].referenciaLida, undefined);
  // Orçamento do bloco: padrão "por ponto", com a faixa de U95 usada.
  assert.deepEqual([res.fontesIncerteza[0].porPonto, res.fontesIncerteza[0].incertezaU95Min, res.fontesIncerteza[0].incertezaU95Max], [true, 0.05, 0.12]);
  assert.equal(res.padroesUsados[0].incertezaPorPonto, true); assert.match(res.padroesUsados[0].cobertura, /0 a 100\u00a0°C \(5 pontos\)/);
  // Fora da faixa calibrada: bloqueia e diz o quê, por quê e o que fazer.
  assert.throws(() => previa(A, [bloco(['p5'], [50, 121])]), e => /ponto 2 \(valor de referência 121\u00a0°C\): fora da faixa calibrada do padrão TP-100, que foi calibrado em 0 a 100\u00a0°C \(5 pontos\)\. Fora da faixa calibrada a rastreabilidade não está garantida.*O que fazer: confira o valor digitado.*Cadastro e validade.*calcule de novo/.test(e.message));
  assert.throws(() => previa(A, [bloco(['p5'], [-0.5])]), /fora da faixa calibrada/);
  // Outra unidade: não converte e não usa.
  assert.throws(() => previa(A, [bloco(['p5'], [50], { unidade: 'K' })]), /bloco está em K, mas os pontos calibrados do padrão TP-100 estão em °C.*não converte unidades/);
  // "ºC" e "° C" valem °C.
  assert.doesNotThrow(() => previa(A, [bloco(['p5'], [50], { unidade: 'ºC' })]));
});

test('correção pelo erro do padrão: interpolada entre pontos, exata no ponto; sem o erro bloqueia; a revisão volta com a leitura', () => {
  const A = ambiente();
  atualizarComPontos(A, 'p5', P5);
  const b = previa(A, [bloco(['p5', 'leg'], [50, 30], { corrigirPadraoId: 'p5' })]).blocos[0];
  // 50: erro 0,04 → referência 49,96. 30: erro interpolado 0,03 + 0,01×20/40 = 0,035 → 29,965.
  assert.deepEqual([b.resultados[0].referenciaLida, b.resultados[0].correcaoPadrao, b.resultados[0].nominal], [50, -0.04, 49.96]);
  assert.deepEqual([b.resultados[1].referenciaLida, b.resultados[1].correcaoPadrao, b.resultados[1].nominal], [30, -0.035, 29.965]);
  assert.equal(b.resultados[1].tendencia.toFixed(6), (30.11 - 29.965).toFixed(6));
  assert.equal(b.corrigirPadraoId, 'p5'); assert.equal(b.correcaoPadraoTag, 'TP-100');
  // O padrão de valor único do mesmo bloco continua entrando com a U95 dele (0,5) em todos os pontos.
  assert.ok(b.resultados.every(r => padraoDaMemoria(r).some(f => f.codigo === 'TL-01' && f.incertezaExpandidaOrigem === 0.5)));
  // Padrão sem erro cadastrado: a correção não é feita e a mensagem diz o que fazer.
  assert.throws(() => previa(A, [bloco(['leg'], [37], { corrigirPadraoId: 'leg' })]), /correção pelo erro do padrão TL-01 foi pedida, mas o certificado do padrão não traz o erro.*Não corrigir/);
  assert.throws(() => previa(A, [bloco(['leg'], [37], { corrigirPadraoId: 'p5' })]), /não está marcado neste bloco/);
  // Revisão de um certificado corrigido: o formulário volta com a LEITURA do padrão e a mesma escolha de correção.
  const ctx = { numeroCertificado: 'CC-1', cliente: { id: 'c1', razaoSocial: 'Cliente' }, equipamento: { id: 'e1', descricao: 'Estufa' }, blocos: [b], dataCalibracao: '10/11/2026' };
  A.T.CERT_CALIBRACAO.push({ ID: 'cert1', NUMERO_CERTIFICADO: 'CC-1', CLIENTE_ID: 'c1', EQUIPAMENTO_ID: 'e1', DADOS_JSON: JSON.stringify(ctx), STATUS: 'ATIVO' });
  let registrado = null;
  A.c.SGO_DocRev_registrarAntigo_ = (tipo, d) => { registrado = d; return 'rev1'; };
  A.c.CertCal_apiPrepararCorrecao('s-bento', { certificadoId: 'cert1' });
  assert.equal(registrado.payload.blocos[0].corrigirPadraoId, 'p5');
  assert.deepEqual(js(registrado.payload.blocos[0].pontos.map(p => p.nominal)), ['50', '30']);
});

/* =================== 12 pontos =================== */

test('12 pontos colados de planilha: gravados, conferidos e usados ponto a ponto; resumo é o de maior incerteza', () => {
  const A = ambiente();
  const linhas = A.c.PadPontos.lerTexto(TEXTO_12).linhas;
  assert.equal(linhas.length, 12);
  atualizarComPontos(A, 'leg', linhas);
  const p = cad(A, 'leg');
  assert.equal(JSON.parse(p.PONTOS_JSON).pontos.length, 12);
  assert.equal(p.INCERTEZA_U95, 0.16, 'maior U95 (180 °C)');
  const b = previa(A, [bloco(['leg'], [-40, 37, 121, 160, 180])]).blocos[0];
  assert.deepEqual(js(b.resultados.map(r => padraoDaMemoria(r)[0].incertezaExpandidaOrigem)), [0.05, 0.09, 0.13, 0.16, 0.16]);
  assert.deepEqual(js(b.resultados.map(r => r.pontosPadrao[0].regra)), ['EXATO', 'EXATO', 'EXATO', 'ENTRE', 'EXATO']);
  assert.equal(padraoDaMemoria(b.resultados[1])[0].fatorKOrigem, 2.13);
  assert.throws(() => previa(A, [bloco(['leg'], [200])]), /calibrado em -40 a 180\u00a0°C \(12 pontos\)/);
});

/* =================== Novo certificado (renovação) com histórico =================== */

test('Novo certificado: a tabela anterior vai para o histórico; tabela de outro certificado bloqueia o uso até conferir', () => {
  const A = ambiente({ iaPontos: P5.map(p => Object.assign({}, p, { u95: p.u95 === '0,12' ? '0,15' : p.u95 })) });
  atualizarComPontos(A, 'p5', P5);
  const item = () => A.api('s-bento', 'apiListarControlePadroes').items.find(x => x.ID === 'p5');
  // Leitura por IA: traz todos os pontos como PROPOSTA; nada é gravado.
  const antes = JSON.stringify(A.T);
  const ex = A.api('s-bento', 'apiExtrairControlePadrao', { padraoId: 'p5' });
  assert.equal(ex.pontos.length, 5); assert.equal(ex.pontos[4].u95, '0,15');
  assert.equal(JSON.stringify(A.T), antes, 'a leitura por IA não grava nada');
  assert.match(A.chamadasIa[0].contents[0].parts[0].text, /PONTOS_TABELA liste TODAS as linhas/);
  // Passo 1 (dados, número e validade): o anterior vai para o histórico, COM a tabela de pontos da época.
  const it = item();
  A.api('s-bento', 'apiSalvarControlePadrao', { padraoId: 'p5', revisao: it.revisao, campos: { CERTIFICADO_NUMERO: 'RBC-2026-0500', VALIDADE: '30/09/2028', DATA_CALIBRACAO: '30/09/2026', LABORATORIO: 'Lab Novo' }, conferido: false, token: ex.token });
  const hist = JSON.parse(A.T.PADROES_CONTROLE_DOCUMENTAL.find(r => r.ID === 'p5').DADOS_JSON).HISTORICO_CALIBRACOES;
  assert.equal(hist[0].numero, 'RBC-2025-0100'); assert.equal(hist[0].pontos.length, 5); assert.equal(hist[0].pontos[4].u95, 0.12);
  // Entre o passo 1 e o 2 a tabela é do certificado anterior: o padrão não entra em certificado e a mensagem diz o que fazer.
  assert.throws(() => previa(A, [bloco(['p5'], [50])]), /tabela de pontos calibrados é do certificado nº RBC-2025-0100, mas o certificado atual do padrão é o nº RBC-2026-0500.*Cadastro e validade/);
  // Passo 2: a tabela nova (U95 0,15 no 100 °C) passa a valer, ligada ao número novo.
  atualizarComPontos(A, 'p5', ex.pontos);
  assert.equal(JSON.parse(cad(A, 'p5').PONTOS_JSON).certificado, 'RBC-2026-0500');
  assert.equal(cad(A, 'p5').INCERTEZA_U95, 0.15);
  assert.equal(padraoDaMemoria(previa(A, [bloco(['p5'], [100])]).blocos[0].resultados[0])[0].incertezaExpandidaOrigem, 0.15);
  // Revisão do cadastro muda com a tabela (documentos gerados antes da mudança pedem nova prévia).
  assert.notEqual(item().revisao, it.revisao);
  // Histórico grande: as tabelas mais antigas saem primeiro, e número/validade/U95/PDF continuam.
  const d = { HISTORICO_CALIBRACOES: Array.from({ length: 30 }, (_, i) => ({ numero: 'N' + i, pontos: Array.from({ length: 40 }, () => ({ nominal: 1, u95: 0.1, k: 2, veff: 0, unidade: '°C', grandeza: 'Temperatura / sensor' })) })) };
  A.c.PadDoc_caberHistorico_(d, 44000);
  assert.ok(JSON.stringify(d).length <= 44000); assert.ok(d.HISTORICO_CALIBRACOES[0].pontos); assert.equal(d.HISTORICO_CALIBRACOES[29].pontosOmitidos, true);
});

/* =================== padrão vencido continua bloqueado =================== */

test('padrão vencido continua bloqueado mesmo com tabela de pontos; tabela ilegível também bloqueia', () => {
  const A = ambiente();
  atualizarComPontos(A, 'venc', P5);
  const blocos = A.c.CertCal_calcularBlocos_([bloco(['venc'], [50])], A.c.CertCal_mapaPadroesAtivos_('s-bento'));
  assert.throws(() => A.c.CertCal_exigirPadroesValidosNaData_(blocos, '10/11/2026'), /TV-09 estava vencido na data da calibração/);
  cad(A, 'p5').PONTOS_JSON = '{"versao":1,"pontos":[{"u95":';
  assert.throws(() => previa(A, [bloco(['p5'], [50])]), /Padrão TP-100: A tabela de pontos gravada está ilegível.*não pode ser usado até a tabela ser conferida/);
});

/* =================== certificado antigo inalterado =================== */

function sandboxDocumento(dir) {
  const s = {}; vm.createContext(s);
  for (const f of ['SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_RelTecIA.js', 'SGO_CertCal_Config.js', 'SGO_CertCal_Calculo.js', 'SGO_CertCal_Documento.js', 'SGO_CertCal_IA.js']) vm.runInContext(ler(f, dir), s);
  s.CadeiaFrioRel_CFCFG = { EMPRESA_EXECUTANTE: { nome: 'Empresa de teste', cnpj: '11.111.111/0001-11' }, LOGO_BASE64: null, ASSINATURAS_PADRAO: [{ nome: 'Responsável', cargo: 'Responsável técnico', registro: 'REG-1' }] };
  return s;
}
const contexto = blocos => ({ cliente: { id: 'c1', razaoSocial: 'Cliente de teste', cnpj: '00.000.000/0001-00' }, equipamento: { id: 'e1', descricao: 'Estufa', tag: 'EST-1' }, blocos, numeroCertificado: 'CC-2026-0001', dataCalibracao: '10/11/2026', dataEmissao: '11/11/2026', localCalibracao: 'LABORATORIO', proximaCalibracao: { solicitada: false }, condicoesAmbientais: '23 °C' });

test('certificado antigo inalterado: o snapshot de um certificado emitido gera o MESMO documento na produção e no candidato', () => {
  const B = ambiente({ dir: PRODUCAO });
  const ctx = contexto(previa(B, [bloco(['leg', 'gT'], [20, 37, 121])]).blocos);
  const snapshot = JSON.stringify(ctx);
  const htmlProducao = sandboxDocumento(PRODUCAO).CertCalDoc_montarDocumentoHtml_(JSON.parse(snapshot));
  const htmlCandidato = sandboxDocumento(BASE).CertCalDoc_montarDocumentoHtml_(JSON.parse(snapshot));
  assert.equal(htmlCandidato, htmlProducao);
  assert.ok(!/Pontos do certificado dos padrões/.test(htmlCandidato));
  // O relatório interpretativo (texto padrão) também não muda.
  const iaP = sandboxDocumento(PRODUCAO), iaC = sandboxDocumento(BASE);
  assert.deepEqual(js(iaC.CertCalIA_textoPadraoInterpretativo_(JSON.parse(snapshot))), js(iaP.CertCalIA_textoPadraoInterpretativo_(JSON.parse(snapshot))));
  // E o padrão ganhar tabela depois não muda o snapshot: ele guarda os números da época.
  const A = ambiente();
  atualizarComPontos(A, 'leg', P5);
  assert.equal(sandboxDocumento(BASE).CertCalDoc_montarDocumentoHtml_(JSON.parse(snapshot)), htmlProducao);
});

test('documento com padrão de vários pontos: mostra o ponto usado em cada medição, a regra, a faixa de U95 e a correção', () => {
  const A = ambiente();
  atualizarComPontos(A, 'p5', P5);
  const blocos = previa(A, [bloco(['p5'], [0, 30, 100], { corrigirPadraoId: 'p5' })]).blocos;
  const html = sandboxDocumento(BASE).CertCalDoc_montarDocumentoHtml_(contexto(blocos));
  assert.match(html, /Pontos do certificado dos padrões aplicados — Temperatura \(°C\)/);
  assert.match(html, /entre 10 e 50.*ponto 50.*\(entre dois pontos\)/);
  assert.match(html, /ponto 0\u00a0°C <span class="nota-regra">\(ponto calibrado\)<\/span>/);
  // Orçamento: U95 do ponto (Tabela 5, pontos aplicados) e incerteza-padrão por ponto (Tabela 4).
  assert.match(html, /U95 = 0,050 a 0,120 °C, do ponto calibrado aplicável \(Tabela 5\)<\/td><td class="txt">k do ponto<\/td><td class="txt">por ponto \(Tabela 4\)/);
  assert.match(html, /<b>Tabela 4<\/b> — Orçamento de incerteza — Temperatura: incerteza por ponto/);
  assert.match(html, /U95 aplicada: 0,05 a 0,12\u00a0°C<br>por ponto calibrado \(0 a 100\u00a0°C \(5 pontos\)\)/);
  assert.match(html, /Leitura do padrão<\/th><th>Correção/);
  assert.match(html, /corrigido pelo erro do padrão quando indicado/);
  // A numeração das tabelas citada no orçamento aponta para a tabela certa.
  const m = /U95 = 0,050 a 0,120 °C, do ponto calibrado aplicável \(Tabela (\d+)\)/.exec(html);
  assert.ok(new RegExp('<b>Tabela ' + m[1] + '</b> — Pontos do certificado dos padrões aplicados').test(html));
});

/* =================== grupos TAG (canal) =================== */

test('grupos TAG (canal): cada canal tem a sua tabela; canal de outra grandeza é recusado no bloco; TAG continua única', () => {
  const A = ambiente();
  atualizarComPontos(A, 'gT', [{ nominal: '15', u95: '0,3', k: '2', unidade: '°C' }, { nominal: '25', u95: '0,3', k: '2', unidade: '°C' }, { nominal: '35', u95: '0,4', k: '2', unidade: '°C' }]);
  atualizarComPontos(A, 'gU', [{ nominal: '30', u95: '2', k: '2', unidade: '%UR' }, { nominal: '50', u95: '2,5', k: '2', unidade: '%UR' }, { nominal: '70', u95: '3', k: '2', unidade: '%UR' }]);
  assert.throws(() => previa(A, [bloco(['gT'], [50], { titulo: 'Umidade', unidade: '%UR' })]), /bloco está em %UR, mas os pontos calibrados do padrão THM-002 \(T\) estão em °C.*marque o padrão \(ou o canal\) da grandeza certa/);
  const u = previa(A, [bloco(['gU'], [60], { titulo: 'Umidade', unidade: '%UR' })]).blocos[0];
  assert.equal(padraoDaMemoria(u.resultados[0])[0].incertezaExpandidaOrigem, 3);
  const t = previa(A, [bloco(['gT'], [25])]).blocos[0];
  assert.equal(padraoDaMemoria(t.resultados[0])[0].incertezaExpandidaOrigem, 0.3);
  // Linhas de grandezas diferentes no mesmo cadastro são recusadas, apontando o caminho do cadastro por canal.
  assert.throws(() => atualizarComPontos(A, 'gT', [{ nominal: '25', u95: '0,3', k: '2', unidade: '°C' }, { nominal: '50', u95: '2', k: '2', unidade: '%UR' }]), /um cadastro guarda uma grandeza só.*canal entre parênteses/i);
  assert.throws(() => A.api('s-bento', 'apiCriarPadrao', { tag: 'THM-002 (T)', descricao: 'dup', pontos: [{ u95: '1', k: '2' }] }), /Já existe um padrão com a TAG THM-002 \(T\)/);
});

/* =================== tela (computador e celular) =================== */

function pagina(perfil) {
  const ctx = { HtmlService: { createHtmlOutputFromFile: n => ({ getContent: () => ler(n + '.html') }) } };
  vm.createContext(ctx);
  vm.runInContext(ler('SGO_Padroes_Pontos.js'), ctx);
  vm.runInContext(ler('SGO_CertCal_ConteudoModulo.js'), ctx);
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="tplCertCalContainer"></div>' +
    '<script>window.CERTCAL_VISAO="padroes";var USER_CONTEXT={perfil:' + JSON.stringify(perfil || 'TECNICO') + '};window.__chamadas=[];' +
    'function SGO_getSessionId(){return "s-bento";}var google={script:{get run(){var h={};var o={withSuccessHandler:function(f){h.ok=f;return o;},withFailureHandler:function(f){h.er=f;return o;},' +
    'CertCal_apiDispatch:function(req){window.__chamadas.push(req);setTimeout(function(){window.__apiNode(req.fn,req.payload).then(function(r){if(r&&r.__erro)h.er(new Error(r.__erro));else h.ok(r);},function(e){h.er(e);});},2);}};return o;}}};</script>' +
    ctx.CertCal_obterConteudoModulo() + '<script>tplCertCal_renderReal_();</script></body></html>';
}
async function abrirTela(A, opcoes) {
  opcoes = opcoes || {};
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: opcoes.viewport || { width: 1400, height: 900 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  p.on('dialog', d => d.accept());
  await p.exposeFunction('__apiNode', (fn, payload) => { try { return JSON.parse(JSON.stringify(A.api('s-bento', fn, payload))); } catch (e) { return { __erro: e.message }; } });
  await p.setContent(pagina(opcoes.perfil));
  await p.waitForFunction(() => document.querySelector('#pdr[data-pdr-pronto]') && !PD.busy, null, { timeout: 15000 });
  return { b, p, erros };
}
const ocioso = p => p.waitForFunction(() => !PD.busy, null, { timeout: 15000 });

test('tela: Cadastro e validade com 5 pontos — adicionar, duplicar, remover, colar 12 linhas, conferir e salvar', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  atualizarComPontos(A, 'p5', P5);
  const { b, p, erros } = await abrirTela(A);
  try {
    assert.equal(await p.evaluate(() => typeof PadPontos), 'object', 'a tela recebe o mesmo código de pontos do servidor');
    await p.evaluate(() => pdrAbrirPainel_('p5', 'resumo'));
    const resumo = await p.textContent('#pdr-painel-corpo');
    assert.match(resumo, /Pontos calibrados \(5\)/); assert.match(resumo, /0,05 a 0,12 · 5 pontos/); assert.match(resumo, /0 a 100\u00a0°C \(5 pontos\)/);
    await p.click('#pdr-painel-abas [data-modo="cadastro"]');
    assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 5);
    assert.equal(await p.inputValue('#pdr-f-u95'), '0,05');
    await p.click('[data-pdr-p="pts-add"]');
    assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 6);
    assert.match(await p.textContent('#pdr-pts-conf-f'), /1 problema.*Linha 6: informe o ponto|Linha 6/s);
    await p.click('#pdr-pts-lista-f .pdr-pts-linha[data-linha="5"] [data-pdr-p="pts-del"]');
    await p.click('#pdr-pts-lista-f .pdr-pts-linha[data-linha="4"] [data-pdr-p="pts-dup"]');
    await p.fill('#pdr-pts-lista-f [data-pts-linha="5"][data-pts-campo="nominal"]', '150');
    await p.fill('#pdr-pts-lista-f [data-pts-linha="5"][data-pts-campo="indicacao"]', '');
    await p.fill('#pdr-pts-lista-f [data-pts-linha="5"][data-pts-campo="referencia"]', '');
    await p.fill('#pdr-pts-lista-f [data-pts-linha="5"][data-pts-campo="erro"]', '');
    await p.waitForTimeout(250);
    assert.match(await p.textContent('#pdr-pts-conf-f'), /0 a 150\u00a0°C \(6 pontos\)/);
    // Número inválido: não salva, diz a linha e o que fazer.
    await p.fill('#pdr-pts-lista-f [data-pts-linha="2"][data-pts-campo="u95"]', '0,0x6');
    await p.click('[data-pdr-p="salvar-cadastro"]');
    assert.match(await p.textContent('#pdr-painel-status'), /A tabela de pontos tem 1 problema\(s\), por isso nada foi salvo\. Linha 3: U95 "0,0x6" não é um número/);
    assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha.pdr-pts-erro').count(), 1);
    assert.equal(JSON.parse(cad(A, 'p5').PONTOS_JSON).pontos.length, 5, 'nada foi salvo');
    // Colar 12 linhas (planilha) substitui a tabela, depois de confirmar.
    await p.click('[data-pdr-p="pts-colar"]');
    await p.fill('#pdr-pts-texto-f', TEXTO_12);
    await p.click('[data-pdr-p="pts-ler-colado"]');
    assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 12);
    assert.match(await p.textContent('#pdr-pts-msg-f'), /12 ponto\(s\) trazidos da tabela colada\. Confira cada linha com o PDF/);
    await p.click('[data-pdr-p="salvar-cadastro"]'); await ocioso(p);
    const j = JSON.parse(cad(A, 'p5').PONTOS_JSON);
    assert.equal(j.pontos.length, 12); assert.equal(j.pontos[0].erro, 0.01);
    assert.match(await p.textContent('#pdr-painel-corpo'), /Pontos calibrados \(12\)/);
    // "Trazer da leitura já salva": usa o texto que a IA já tinha lido (Resultados do certificado).
    await p.click('#pdr-painel-abas [data-modo="cadastro"]');
    await p.click('[data-pdr-p="pts-salva"]');
    assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 3);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: Novo certificado com IA — todos os pontos para conferência, escolha do canal, histórico e nada gravado sem conferir', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const iaPontos = [].concat(
    P5.slice(0, 3).map(x => Object.assign({}, x, { grandeza: 'Temperatura / SENSOR T1' })),
    P5.slice(0, 3).map(x => Object.assign({}, x, { grandeza: 'Temperatura / SENSOR T2', u95: '0,09' })));
  const A = ambiente({ iaPontos });
  atualizarComPontos(A, 'p5', P5);
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirPainel_('p5', 'renovar'));
    await p.setInputFiles('#pdr-r-pdf', { name: 'novo.pdf', mimeType: 'application/pdf', buffer: PDF });
    await p.click('[data-pdr-p="renovar-anexar"]'); await ocioso(p);
    // Duas grandezas/canais: pergunta quais são deste cadastro.
    assert.ok(await p.isVisible('#pdr-pts-grupos-r'));
    assert.match(await p.textContent('#pdr-pts-grupos-r'), /2 grandezas ou canais.*SENSOR T1.*3 pontos.*SENSOR T2/s);
    const marcados = await p.$$eval('#pdr-pts-grupos-r input', l => l.map(i => i.checked));
    await p.$$eval('#pdr-pts-grupos-r input', l => l.forEach((i, k) => { i.checked = k === 1; }));
    await p.click('[data-pdr-p="pts-grupos-usar"]');
    assert.equal(await p.locator('#pdr-pts-lista-r .pdr-pts-linha').count(), 3);
    assert.equal(await p.inputValue('#pdr-pts-lista-r [data-pts-linha="0"][data-pts-campo="u95"]'), '0,09');
    assert.equal(marcados.length, 2);
    // Sem marcar a conferência, nada é salvo.
    await p.click('[data-pdr-p="renovar-salvar"]');
    assert.match(await p.textContent('#pdr-r-leitura'), /Marque "Conferi/);
    assert.equal(cad(A, 'p5').CERTIFICADO_NUMERO, 'RBC-2025-0100');
    await p.check('#pdr-r-conferido');
    await p.click('[data-pdr-p="renovar-salvar"]'); await ocioso(p);
    const c = cad(A, 'p5'), j = JSON.parse(c.PONTOS_JSON);
    assert.equal(c.CERTIFICADO_NUMERO, 'RBC-2026-0500'); assert.equal(j.certificado, 'RBC-2026-0500'); assert.equal(j.pontos.length, 3); assert.equal(c.INCERTEZA_U95, 0.09);
    const painel = await p.textContent('#pdr-painel');
    assert.match(painel, /Certificado novo de TP-100 salvo: nº RBC-2026-0500/);
    assert.match(painel, /Nº RBC-2025-0100.*tabela com 5 pontos/s);
    const fns = await p.evaluate(() => window.__chamadas.map(x => x.fn));
    assert.ok(fns.indexOf('apiSalvarControlePadrao') < fns.lastIndexOf('apiAtualizarPadrao'));
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: Novo certificado de padrão de valor único continua como antes (U95 0,5 → 0,3, sem criar tabela)', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente({ ia: { CERTIFICADO_NUMERO: 'L-2' } });
  const pdf = Object.keys(A.arquivos)[0];
  cad(A, 'leg').LINK_CERTIFICADO_PDF = SITE + '/arquivos/' + pdf;
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirPainel_('leg', 'renovar'));
    await p.click('[data-pdr-p="renovar-ler"]'); await ocioso(p);
    assert.equal(await p.inputValue('#pdr-r-u95'), '0,5', 'a IA não trouxe pontos: a incerteza fica como estava');
    assert.match(await p.textContent('#pdr-r-leitura'), /A IA não trouxe a tabela de pontos/);
    await p.fill('#pdr-r-u95', '0,3');
    await p.check('#pdr-r-conferido');
    await p.click('[data-pdr-p="renovar-salvar"]'); await ocioso(p);
    assert.equal(Number(cad(A, 'leg').INCERTEZA_U95), 0.3);
    assert.ok(!cad(A, 'leg').PONTOS_JSON, 'continua sem tabela');
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela: grupo TAG (canal) mostra "por ponto" no canal com tabela e o valor único no outro', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  atualizarComPontos(A, 'gT', [{ nominal: '15', u95: '0,3', k: '2', unidade: '°C' }, { nominal: '35', u95: '0,4', k: '2', unidade: '°C' }]);
  const { b, p, erros } = await abrirTela(A);
  try {
    await p.evaluate(() => pdrAbrirGrupo_('THM-002'));
    const t = await p.textContent('#pdr-painel-corpo');
    assert.match(t, /T\s*0,3 a 0,4 · 2 pontos\s*por ponto\s*por ponto/);
    assert.match(t, /U\s*2\s*2\s*∞/);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

test('tela de emissão: "Correção do valor de referência" lista só os padrões marcados e vai no cálculo', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const A = ambiente();
  atualizarComPontos(A, 'p5', P5);
  const { b, p, erros } = await abrirTela(A);
  try {
    const r = await p.evaluate(() => {
      certcalState.padroes = [{ ID: 'p5', TAG: 'TP-100', DESCRICAO: 'x' }, { ID: 'leg', TAG: 'TL-01', DESCRICAO: 'y' }];
      certcalState.blocos = [{ titulo: 'Temperatura', unidade: '°C', resolucao: '', padroesIds: [], pontos: [{ nominal: '30', leituras: ['30,1', '30,1', '30,1'] }] }];
      var host = document.getElementById('certcal-blocos-lista'); if (!host) { host = document.createElement('div'); host.id = 'certcal-blocos-lista'; document.body.appendChild(host); }
      tplCertCal_renderBlocos();
      var antes = document.getElementById('certcal-corr-0').options.length;
      tplCertCal_alternarPadraoBloco(0, 'p5', true);
      var depois = [].map.call(document.getElementById('certcal-corr-0').options, function (o) { return o.textContent; });
      var sel = document.getElementById('certcal-corr-0'); sel.value = 'p5'; sel.dispatchEvent(new Event('change'));
      var payload = JSON.parse(JSON.stringify(tplCertCal_montarBlocosPayload_()));
      tplCertCal_alternarPadraoBloco(0, 'p5', false);
      return { antes, depois, payload, apos: certcalState.blocos[0].corrigirPadraoId };
    });
    assert.equal(r.antes, 1); assert.deepEqual(r.depois, ['Não corrigir (o valor digitado é o de referência)', 'Corrigir pelo erro de TP-100']);
    assert.equal(r.payload[0].corrigirPadraoId, 'p5'); assert.equal(r.apos, '', 'desmarcar o padrão desfaz a correção');
    const prev = A.c.CertCal_apiCalcularPreview('s-bento', { blocos: r.payload });
    const html = await p.evaluate(b0 => tplCertCal_previaPontosPadrao_(b0), JSON.parse(JSON.stringify(prev.blocos[0])));
    assert.match(html, /leitura 30 \+ correção -0,035 = 29,965/); assert.match(html, /TP-100: entre 10 e 50/);
    assert.deepEqual(erros, []);
  } finally { await b.close(); }
});

for (const largura of [320, 360, 390]) {
  test('celular ' + largura + ' px: tabela de 12 pontos sem rolagem lateral; campos e botões com 44 px; colar funciona', { skip: !chromium && 'Playwright indisponível' }, async () => {
    const A = ambiente();
    atualizarComPontos(A, 'p5', A.c.PadPontos.lerTexto(TEXTO_12).linhas);
    const { b, p, erros } = await abrirTela(A, { viewport: { width: largura, height: 780 } });
    try {
      const medir = () => p.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const alvos = [...document.querySelectorAll('#pdr-painel:not([hidden]) button, #pdr-painel:not([hidden]) input[type=text], #pdr-painel:not([hidden]) textarea, #pdr-painel:not([hidden]) .pdr-pts-grupos label')].filter(vis);
        const baixos = alvos.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.getAttribute('data-pts-campo') || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
        const largos = [...document.querySelectorAll('#pdr-painel:not([hidden]) *')].filter(vis).filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.pdr-rolar,.bc-painel-abas')).map(e => e.className || e.tagName);
        return { rolagem: document.documentElement.scrollWidth - innerWidth, painel: (() => { const c = document.getElementById('pdr-painel-corpo'); return c.scrollWidth - c.clientWidth; })(), baixos: [...new Set(baixos)].slice(0, 8), largos: [...new Set(largos)].slice(0, 6) };
      });
      await p.evaluate(() => pdrAbrirPainel_('p5', 'resumo'));
      let m = await medir();
      assert.ok(m.rolagem <= 0 && m.painel <= 0, 'rolagem lateral ' + JSON.stringify(m)); assert.deepEqual(m.largos, []);
      await p.evaluate(() => pdrAbrirPainel_('p5', 'cadastro'));
      assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 12);
      m = await medir();
      assert.ok(m.rolagem <= 0 && m.painel <= 0, 'rolagem lateral ' + JSON.stringify(m)); assert.deepEqual(m.largos, []); assert.deepEqual(m.baixos, []);
      await p.click('[data-pdr-p="pts-extras"]');
      await p.click('[data-pdr-p="pts-colar"]');
      m = await medir();
      assert.ok(m.rolagem <= 0 && m.painel <= 0); assert.deepEqual(m.largos, []); assert.deepEqual(m.baixos, []);
      await p.fill('#pdr-pts-texto-f', 'Grandeza | Ponto | U95 | k | Unidade\nSENSOR 1 | 0 | 0,1 | 2 | °C\nSENSOR 1 | 50 | 0,2 | 2 | °C\nSENSOR 2 | 0 | 0,3 | 2 | °C');
      await p.click('[data-pdr-p="pts-ler-colado"]');
      m = await medir();
      assert.ok(m.rolagem <= 0 && m.painel <= 0); assert.deepEqual(m.baixos, []);
      await p.click('[data-pdr-p="pts-grupos-usar"]');
      assert.equal(await p.locator('#pdr-pts-lista-f .pdr-pts-linha').count(), 3, 'nenhum canal casa com o cadastro: as marcações vêm pela unidade (todas °C)');
      assert.deepEqual(erros, []);
    } finally { await b.close(); }
  });
}
