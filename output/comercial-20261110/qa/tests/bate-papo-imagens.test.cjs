// Bate-papo: envio de imagens no SGO+ (decisão do dono, 27/10/2026). Núcleo REAL (Comunicacao.js), adaptador REAL
// (SGO_ComunicacaoAdaptador.js) e a API das imagens (SGO_ComunicacaoImagens.js); planilha e "Drive" simulados.
// Confere: explicação obrigatória, conteúdo conferido pelo próprio arquivo, arquivo RESTRITO e sem ID exposto, só quem
// participa da conversa vê, chave da Diretoria/Administrador com motivo, quem e quando, e o texto do aviso aprovado.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { criarUtilities } = require('./_simulacros_gas.cjs');

const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8').replace(/\r\n/g, '\n');

const AVISO = 'Imagens devem servir para ilustrar o assunto, sempre acompanhadas de uma explicação escrita. O envio de prints de conversas ou de mensagens sem contexto, que dificultem o entendimento, não é permitido. O uso inadequado poderá levar à desativação deste recurso para todos.';

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

test('o aviso é exatamente o texto aprovado pelo dono e o widget só liga as imagens no SGO+', () => {
  const c = cenario();
  assert.equal(c.s.COM_IMG_AVISO, AVISO);
  const est = c.img('ana.t', 'estado');
  assert.equal(est.ok, true);
  assert.equal(est.ligado, true, 'ligado por padrão');
  assert.equal(est.aviso, AVISO);
  assert.equal(est.pode_configurar, false);
  assert.equal(est.limites.legendaMin, 10);
  assert.ok(!('historico' in est), 'histórico só para quem configura');
  const idx = ler('Index.html'), w = ler('ComunicacaoWidget.html');
  assert.match(idx, /window\.COM_CFG = \{ sistema: "SGO", outro: "COMMAND", imagens: true,/);
  assert.match(w, /var IMG = !!CFG\.imagens;/, 'sem COM_CFG.imagens (COMMAND) o balão fica como antes');
  assert.match(w, /comImagemApi/);
  assert.ok(!/getUrl\(|getDownloadUrl\(|ANYONE/.test(ler('SGO_ComunicacaoImagens.js')), 'nenhum link de arquivo nem compartilhamento público');
});

test('envio: explicação obrigatória, mensagem "Imagem: ...", arquivo RESTRITO e o ID do arquivo nunca sai', () => {
  const { c, conv } = prontoParaEnviar();
  let r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: 'olha', imagem: jpeg(800, 600) });
  assert.equal(r.ok, false);
  assert.match(r.erro, /pelo menos 10 caracteres/);
  assert.match(r.erro, /O que fazer/);
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: '1234567890123', imagem: jpeg(800, 600) });
  assert.equal(r.ok, false, 'só números não é explicação');
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: '  Painel do autoclave com o alarme de porta aberta  ', imagem: jpeg(800, 600), miniatura: jpeg(240, 180, 500) });
  assert.equal(r.ok, true, JSON.stringify(r));
  const m = r.mensagem;
  assert.equal(m.texto, 'Imagem: Painel do autoclave com o alarme de porta aberta');
  assert.equal(m.ref_tipo, 'COM_IMAGEM');
  assert.equal(m.ref_sistema, '', 'sem link "abrir no ..."');
  assert.match(m.ref_id, /^[0-9a-f-]{36}$/);
  assert.equal(m.link, '');
  assert.equal(c.drive.arquivos.length, 2, 'imagem e miniatura');
  c.drive.arquivos.forEach((a) => {
    assert.equal(a.compartilhamento, 'RESTRITO:SISTEMA', 'o servidor não entrega por link');
    const meta = JSON.parse(a.descricao);
    assert.equal(meta.conversa_id, conv);
    assert.equal(meta.img_id, m.ref_id);
  });
  assert.deepEqual(c.drive.arquivos.map((a) => a.nome).sort(), ['COMIMG_' + m.ref_id, 'COMIMG_' + m.ref_id + '_mini']);
  const tudo = JSON.stringify(r) + JSON.stringify(c.com._abas.COM_MENSAGENS._rows) + JSON.stringify(c.img('bia.t', 'miniaturas', { ids: [m.ref_id] }));
  assert.ok(!/segredo/.test(tudo), 'o ID do arquivo não vai para a mensagem nem para o navegador');
  // a mensagem é como as outras: aparece para a outra pessoa nas novidades, com o texto que vai no aviso pelo WhatsApp
  const conversa = c.api('bia.t', 'conversa', { conversa_id: conv });
  assert.equal(conversa.mensagens.at(-1).texto, 'Imagem: Painel do autoclave com o alarme de porta aberta');
});

test('conteúdo conferido pelo próprio arquivo: formato, tamanho e lado', () => {
  const { c, conv } = prontoParaEnviar();
  const leg = 'Print da tela de cadastro com o erro';
  let r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: leg, imagem: 'data:image/jpeg;base64,' + Buffer.from('<html>não é imagem</html>').toString('base64') });
  assert.match(r.erro, /não é PNG, JPG nem WEBP/);
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: leg, imagem: jpeg(800, 600, 800 * 1024) });
  assert.match(r.erro, /o limite é 700 KB/);
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: leg, imagem: jpeg(4000, 3000) });
  assert.match(r.erro, /1600 px/);
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: leg, imagem: '%%%' });
  assert.match(r.erro, /não chegou inteira/);
  // PNG também é aceito (o tipo vem do conteúdo)
  const png = Buffer.alloc(64); Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(png); png.writeUInt32BE(640, 16); png.writeUInt32BE(480, 20);
  r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: leg, imagem: 'data:image/png;base64,' + png.toString('base64') });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(c.drive.arquivos.at(-1).tipo, 'image/png');
  assert.equal(c.drive.arquivos.length, 1, 'nada gravado nas recusas');
});

test('só quem participa da conversa vê; mensagem forjada em outra conversa não abre a imagem', () => {
  const { c, conv } = prontoParaEnviar();
  const r = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: 'Foto da etiqueta do equipamento', imagem: jpeg(1200, 900), miniatura: jpeg(320, 240, 400) });
  const id = r.mensagem.ref_id;
  const vista = c.img('bia.t', 'imagem', { id });
  assert.equal(vista.ok, true);
  assert.match(vista.imagem.data, /^data:image\/jpeg;base64,/);
  assert.equal(vista.imagem.w, 1200);
  const mini = c.img('bia.t', 'miniaturas', { ids: [id, 'nao-e-id'] });
  assert.match(mini.miniaturas[id].data, /^data:image\/jpeg;base64,/);
  assert.ok(mini.miniaturas['nao-e-id'].erro);
  // Gil (gestão) não está na conversa direta das duas
  const fora = c.img('gil.t', 'imagem', { id });
  assert.equal(fora.ok, false);
  assert.match(fora.erro, /não participa da conversa/);
  assert.match(c.img('gil.t', 'miniaturas', { ids: [id] }).miniaturas[id].erro, /não participa/);
  // Gil não consegue enviar imagem na conversa das duas
  assert.match(c.img('gil.t', 'enviar', { conversa_id: conv, legenda: 'Tentando entrar na conversa', imagem: jpeg(10, 10) }).erro, /Conversa não encontrada/);
  // forjar: Gil cria um grupo com a Dora e manda uma mensagem comum apontando para a imagem
  const g = c.api('gil.t', 'criarGrupo', { titulo: 'Teste', membros: [c.pessoa('dora.t')] }).conversa.conversa_id;
  const forjada = c.api('gil.t', 'enviar', { conversa_id: g, texto: 'Imagem: veja', ref: { tipo: 'COM_IMAGEM', id } }).mensagem;
  assert.equal(forjada.ref_sistema, 'SGO', 'mensagem comum sempre tem ref_sistema: o balão não a trata como imagem');
  assert.match(c.img('dora.t', 'imagem', { id }).erro, /não participa/, 'a permissão vem da conversa gravada na imagem');
  // quem sai do grupo deixa de ver
  const g2 = c.api('ana.t', 'criarGrupo', { titulo: 'Campo', membros: [c.pessoa('bia.t')] }).conversa.conversa_id;
  const id2 = c.img('ana.t', 'enviar', { conversa_id: g2, legenda: 'Foto do painel no cliente @Bia', imagem: jpeg(640, 480) }).mensagem.ref_id;
  assert.equal(c.img('bia.t', 'imagem', { id: id2 }).ok, true);
  c.api('bia.t', 'sairGrupo', { conversa_id: g2 });
  assert.equal(c.img('bia.t', 'imagem', { id: id2 }).ok, false);
  // sessão inválida
  assert.equal(c.s.comImagemApi('S-ninguem', 'imagem', { id }).erro, 'SESSAO');
});

test('Diretoria e Administrador desligam para todos com motivo, quem e quando; imagens antigas continuam visíveis', () => {
  const { c, conv } = prontoParaEnviar();
  const id = c.img('ana.t', 'enviar', { conversa_id: conv, legenda: 'Foto antes de desligar', imagem: jpeg(640, 480) }).mensagem.ref_id;
  assert.match(c.img('ana.t', 'configurar', { ligado: false, motivo: 'Uso inadequado repetido' }).erro, /Só a Diretoria e o Administrador/);
  assert.match(c.img('gil.t', 'configurar', { ligado: false, motivo: 'Uso inadequado repetido' }).erro, /Só a Diretoria e o Administrador/, 'Gestor não');
  assert.equal(c.img('dora.t', 'estado').pode_configurar, true);
  assert.equal(c.img('adm.t', 'estado').pode_configurar, true);
  assert.match(c.img('dora.t', 'configurar', { ligado: false, motivo: 'curto' }).erro, /motivo para desligar/);
  const r = c.img('dora.t', 'configurar', { ligado: false, motivo: 'Prints de conversa sem contexto' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.ligado, false);
  assert.equal(r.alterado_por, 'Dora Diretora');
  assert.match(r.alterado_em, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(r.historico[0].motivo, 'Prints de conversa sem contexto');
  const e = c.img('bia.t', 'enviar', { conversa_id: conv, legenda: 'Foto depois de desligar', imagem: jpeg(640, 480) });
  assert.equal(e.ok, false);
  assert.match(e.erro, /desligado para todos desde .* por Dora Diretora\. Motivo: Prints de conversa sem contexto\. O que fazer/);
  assert.equal(c.img('bia.t', 'imagem', { id }).ok, true, 'as já enviadas continuam visíveis');
  assert.equal(c.img('bia.t', 'estado').ligado, false);
  const lig = c.img('adm.t', 'configurar', { ligado: true, motivo: '' });
  assert.equal(lig.ligado, true);
  assert.equal(lig.historico.length, 2);
  assert.equal(lig.historico[0].por, 'Adm Sistema');
  assert.equal(c.img('bia.t', 'enviar', { conversa_id: conv, legenda: 'Foto depois de religar', imagem: jpeg(640, 480) }).ok, true);
});

test('limite de imagens por pessoa por hora', () => {
  const { c, conv } = prontoParaEnviar();
  c.s.COM_IMG_LIM.porHora = 2;
  const env = () => c.img('ana.t', 'enviar', { conversa_id: conv, legenda: 'Foto do equipamento na bancada', imagem: jpeg(320, 240) });
  assert.equal(env().ok, true);
  assert.equal(env().ok, true);
  const r = env();
  assert.equal(r.ok, false);
  assert.match(r.erro, /2 imagens na última hora/);
});
