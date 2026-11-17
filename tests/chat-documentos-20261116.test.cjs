// 16/11/2026 — Bate-papo aceita documentos (PDF, Word .docx, Excel .xlsx). A Bruna tentou mandar um PDF e recebeu "o bate-papo só
// aceita imagens". Núcleo REAL (Comunicacao.js), adaptador REAL (SGO_ComunicacaoAdaptador.js) e a API (SGO_ComunicacaoImagens.js);
// planilha e "Drive" simulados (o mesmo ambiente de bate-papo-imagens.test.cjs). Confere: PDF aceito e baixado só por quem participa
// da conversa; arquivo RESTRITO e sem ID exposto; tipo pelo conteúdo; macro e formato não aceito recusados com a mensagem nova;
// limite de 5 MB; documentos continuam com as imagens desligadas; o balão (ComunicacaoWidget.html) com a recusa nova.
// Só dados de teste. Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/chat-documentos-20261116.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
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


const LEG = 'Proposta revisada do cliente, confira os valores';
const dataUrl = (buf, tipo) => 'data:' + (tipo || 'application/pdf') + ';base64,' + buf.toString('base64');
const pdf = (n) => { const b = Buffer.alloc(n || 3000, 0x20); Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n').copy(b); Buffer.from('%%EOF').copy(b, b.length - 5); return b; };
/** ZIP mínimo (cabeçalho local + nome do arquivo interno), como .docx/.xlsx: o nome fica sem compressão. */
const zip = (...nomes) => Buffer.concat(nomes.map((n) => { const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(Buffer.byteLength(n), 26); return Buffer.concat([h, Buffer.from(n), Buffer.alloc(40, 1)]); }));
const NOME_BRUNA = 'C:\\fakepath\\Resistências de imersão 220 V — Metrolab’s.pdf';

test('PDF aceito: mensagem "Documento: nome — explicação", arquivo RESTRITO, ID do arquivo nunca sai, só quem participa baixa', () => {
  const { c, conv } = prontoParaEnviar();
  const est = c.img('ana.t', 'estado');
  assert.deepEqual(Array.from(est.documentos.extensoes), ['pdf', 'docx', 'xlsx']); assert.equal(est.documentos.maxMB, 5);
  const original = pdf(5000);
  const r = c.img('ana.t', 'enviarDocumento', { conversa_id: conv, legenda: '  ' + LEG + '  ', documento: dataUrl(original), nome: NOME_BRUNA });
  assert.equal(r.ok, true, JSON.stringify(r));
  const m = r.mensagem;
  assert.equal(m.ref_tipo, 'COM_DOCUMENTO'); assert.equal(m.ref_sistema, ''); assert.equal(m.link, '');
  assert.equal(m.texto, 'Documento: Resistências de imersão 220 V — Metrolab’s.pdf — ' + LEG);
  assert.equal(r.documento.nome, 'Resistências de imersão 220 V — Metrolab’s.pdf', 'sem o caminho do aparelho');
  assert.equal(c.drive.arquivos.length, 1);
  const arq = c.drive.arquivos[0];
  assert.equal(arq.nome, 'COMDOC_' + m.ref_id); assert.equal(arq.compartilhamento, 'RESTRITO:SISTEMA'); assert.equal(arq.tipo, 'application/pdf');
  const meta = JSON.parse(arq.descricao);
  assert.equal(meta.conversa_id, conv); assert.equal(meta.doc_id, m.ref_id); assert.equal(meta.ext, 'pdf');
  // Bia (da conversa) baixa o mesmo conteúdo, com o nome
  const b = c.img('bia.t', 'documento', { id: m.ref_id });
  assert.equal(b.ok, true, JSON.stringify(b).slice(0, 300));
  assert.equal(b.documento.nome, 'Resistências de imersão 220 V — Metrolab’s.pdf'); assert.equal(b.documento.tipo, 'application/pdf');
  assert.ok(Buffer.from(b.documento.data.split(',')[1], 'base64').equals(original), 'mesmo conteúdo');
  const tudo = JSON.stringify(r) + JSON.stringify(b).slice(0, 400) + JSON.stringify(c.com._abas.COM_MENSAGENS._rows);
  assert.ok(!/segredo/.test(tudo), 'o ID do arquivo não vai para a mensagem nem para o navegador');
  // Gil (gestão) não participa da conversa direta: não baixa
  const fora = c.img('gil.t', 'documento', { id: m.ref_id });
  assert.equal(fora.ok, false); assert.match(fora.erro, /não participa da conversa deste documento\. O que fazer: /);
  // forjar a mensagem em outra conversa não abre o documento (a permissão vem da conversa gravada no arquivo)
  const g = c.api('gil.t', 'criarGrupo', { titulo: 'Teste', membros: [c.pessoa('dora.t')] }).conversa.conversa_id;
  c.api('gil.t', 'enviar', { conversa_id: g, texto: 'Documento: x.pdf — veja', ref: { tipo: 'COM_DOCUMENTO', id: m.ref_id } });
  assert.match(c.img('dora.t', 'documento', { id: m.ref_id }).erro, /não participa/);
  // quem sai do grupo deixa de baixar
  const g2 = c.api('ana.t', 'criarGrupo', { titulo: 'Campo', membros: [c.pessoa('bia.t')] }).conversa.conversa_id;
  const id2 = c.img('ana.t', 'enviarDocumento', { conversa_id: g2, legenda: 'Checklist da visita para preencher', documento: dataUrl(pdf()), nome: 'checklist.pdf' }).mensagem.ref_id;
  assert.equal(c.img('bia.t', 'documento', { id: id2 }).ok, true);
  c.api('bia.t', 'sairGrupo', { conversa_id: g2 });
  assert.equal(c.img('bia.t', 'documento', { id: id2 }).ok, false);
  assert.equal(c.s.comImagemApi('S-ninguem', 'documento', { id: id2 }).erro, 'SESSAO');
  // Gil não envia na conversa das duas
  assert.match(c.img('gil.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: dataUrl(pdf()), nome: 'a.pdf' }).erro, /Conversa não encontrada/);
});

test('tipo pelo conteúdo: DOCX e XLSX aceitos; macro, .doc antigo, texto e acima de 5 MB recusados com o quê, por quê e o que fazer', () => {
  const { c, conv } = prontoParaEnviar();
  const env = (buf, nome, tipo) => c.img('ana.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: dataUrl(buf, tipo), nome });
  let r = env(zip('[Content_Types].xml', 'word/document.xml'), 'Relatório.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(r.ok, true, JSON.stringify(r)); assert.match(r.mensagem.texto, /^Documento: Relatório\.docx — /);
  r = env(zip('[Content_Types].xml', 'xl/workbook.xml'), 'planilha de custos', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.documento.nome, 'planilha de custos.xlsx', 'extensão vem do conteúdo');
  r = env(pdf(), 'enganado.docx');
  assert.equal(r.documento.nome, 'enganado.pdf', 'PDF com nome .docx: vale o conteúdo');
  const antes = c.drive.arquivos.length;
  r = env(zip('[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin'), 'macro.docm');
  assert.equal(r.ok, false); assert.match(r.erro, /tem macro .*Por quê: .*O que fazer: /);
  r = env(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0, 0, 0, 0, 0, 0, 0, 0]), 'antigo.doc', 'application/msword');
  assert.equal(r.ok, false);
  assert.match(r.erro, /«antigo\.doc» não é um formato aceito\. Por quê: Formatos aceitos no bate-papo: imagens PNG, JPG, WEBP ou HEIC e documentos PDF, Word \(\.docx\) ou Excel \(\.xlsx\), de até 5 MB\. O que fazer: salve o arquivo em PDF/);
  r = env(Buffer.from('apenas texto'), 'nota.txt', 'text/plain');
  assert.match(r.erro, /não é um formato aceito/);
  r = env(pdf(5 * 1048576 + 10), 'grande.pdf');
  assert.match(r.erro, /o limite é 5 MB\. Por quê: .*O que fazer: /);
  r = c.img('ana.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: '%%%', nome: 'x.pdf' });
  assert.match(r.erro, /não chegou inteiro/);
  r = c.img('ana.t', 'enviarDocumento', { conversa_id: conv, legenda: 'segue', documento: dataUrl(pdf()), nome: 'x.pdf' });
  assert.match(r.erro, /Escreva a explicação do documento \(pelo menos 10 caracteres\)\. Por quê: .*O que fazer: /);
  assert.equal(c.drive.arquivos.length, antes, 'nada gravado nas recusas');
});

test('documentos continuam com as imagens desligadas; limite por hora', () => {
  const { c, conv } = prontoParaEnviar();
  assert.equal(c.img('dora.t', 'configurar', { ligado: false, motivo: 'Prints de conversa sem contexto' }).ok, true);
  assert.equal(c.img('bia.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: dataUrl(pdf()), nome: 'p.pdf' }).ok, true);
  c.s.COM_DOC_LIM.porHora = 2;
  assert.equal(c.img('bia.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: dataUrl(pdf()), nome: 'p.pdf' }).ok, true);
  const t = c.img('bia.t', 'enviarDocumento', { conversa_id: conv, legenda: LEG, documento: dataUrl(pdf()), nome: 'p.pdf' });
  assert.equal(t.ok, false); assert.match(t.erro, /2 documentos na última hora/);
});

test('balão: aceita PDF/Word/Excel no anexar, recusa com a mensagem nova, baixa pelo cartão do documento; manual', () => {
  const w = ler('ComunicacaoWidget.html');
  assert.doesNotMatch(w, /o bate-papo só aceita imagens/, 'a recusa antiga saiu');
  assert.match(w, /Formatos aceitos no bate-papo: imagens PNG, JPG, WEBP ou HEIC e documentos PDF, Word \(\.docx\) ou Excel \(\.xlsx\), de até 5 MB\./);
  assert.match(w, /application\/pdf,\.pdf,\.docx,\.xlsx/);
  assert.match(w, /apiImg\("enviarDocumento"/); assert.match(w, /apiImg\("documento"/);
  assert.match(w, /\[data-doc\]/); assert.match(w, /function ehDocumento\(m\) \{ return IMG && /, 'só onde o sistema liga (SGO+)');
  assert.match(w, /<h3>Enviar documento \(PDF, Word ou Excel\)<\/h3>/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_BATE_PAPO.md'), 'utf8');
  assert.match(man, /## 2B\. Enviar documento: PDF, Word ou Excel/);
  // a recusa do balão de verdade: as funções do balão isoladas, com um arquivo .zip
  const corpo = w.slice(w.indexOf('var IMG_TIPO = "COM_IMAGEM"'), w.indexOf('function reduzirImagem('));
  const ctx = vm.createContext({ ST: { img: { estado: null } }, IMG: true, h: (x) => String(x) });
  vm.runInContext(corpo, ctx);
  let msg = '';
  ctx.prepararImagem({ name: 'fotos.zip', type: 'application/zip', size: 100 }, {}, () => {}, (x) => { msg = x; });
  assert.match(msg, /^O arquivo «fotos\.zip» não é um formato aceito\. Por quê: Formatos aceitos no bate-papo: .* O que fazer: salve o arquivo em PDF/);
  assert.equal(ctx.ehArquivoDoc({ name: 'Proposta.PDF', type: '' }), true);
  assert.equal(ctx.ehArquivoDoc({ name: 'x.xlsx', type: '' }), true);
  assert.equal(ctx.ehArquivoDoc({ name: 'x.doc', type: 'application/msword' }), false);
  const pt = ctx.partesDoc({ texto: 'Documento: Resistências de imersão 220 V — Metrolab’s.pdf — Segue a ficha técnica — confira' });
  assert.equal(pt.nome, 'Resistências de imersão 220 V — Metrolab’s.pdf'); assert.equal(pt.leg, 'Segue a ficha técnica — confira');
  assert.match(ctx.documentoHtml({ ref_id: 'abc', texto: 'Documento: proposta.pdf — Confira os valores' }), /data-doc='abc'.*proposta\.pdf.*Toque para baixar/);
});
