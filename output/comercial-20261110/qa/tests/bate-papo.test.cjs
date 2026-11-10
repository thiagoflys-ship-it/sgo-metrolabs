// Bate-papo -> WhatsApp no SGO+ (20/10/2026): ida pela ponte (SGO_ComunicacaoWhatsapp.js) com o notificador REAL
// (SGO_Notificar.js), o expediente REAL (SGO_Expediente.js) e o núcleo da Comunicação (Comunicacao.js). Nenhuma mensagem
// sai: UrlFetchApp e MailApp são simulados. Dados fictícios. (Volta pelo webhook: testes do COMMAND, t_..._bate_papo.js.)
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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

function cenario(opcoes) {
  const o = opcoes || {};
  const props = Object.assign({ COM_DB_ID: 'COMDB', ZAPI_INSTANCIA: 'inst-teste', ZAPI_TOKEN: 'tok-teste', ZAPI_CLIENT_TOKEN: 'cli-teste' }, o.props || {});
  const cache = {}, fetches = [], emails = [];
  const com = planilha('COMDB'), sgo = planilha('SGODB');
  const cad = sgo.insertSheet('CAD_USUARIOS');
  cad._rows.push(['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'CRIADO_EM', 'CLIENTE_ID', 'AREA', 'CELULAR', 'VINCULO_TRABALHO', 'EMAIL']);
  const usuarios = [
    { ID: 'u-ana', USUARIO: 'ana.t', NOME: 'Ana Teste', PERFIL: 'TECNICO', STATUS: 'ATIVO', AREA: 'TECNICA', CELULAR: '5562900000001', VINCULO_TRABALHO: 'CLT', EMAIL: 'ana@teste.invalid' },
    { ID: 'u-bia', USUARIO: 'bia.t', NOME: 'Bia Teste', PERFIL: 'TECNICO', STATUS: 'ATIVO', AREA: 'TECNICA', CELULAR: '5562900000002', VINCULO_TRABALHO: 'PJ', EMAIL: 'bia@teste.invalid' },
    { ID: 'u-gil', USUARIO: 'gil.t', NOME: 'Gil Gestor', PERFIL: 'GESTOR', STATUS: 'ATIVO', AREA: 'DIRETORIA', CELULAR: '5562900000004', VINCULO_TRABALHO: 'CLT', EMAIL: 'gil@teste.invalid' }
  ];
  usuarios.forEach((u) => cad._rows.push([u.ID, u.USUARIO, 'h', u.NOME, u.PERFIL, u.STATUS, '2026-01-01', '', u.AREA, u.CELULAR, u.VINCULO_TRABALHO, u.EMAIL]));
  const tabelas = { CAD_USUARIOS: usuarios, NTF_ENVIOS: [] };
  const sessoes = {};
  usuarios.forEach((u) => { sessoes['S-' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, status: 'ATIVO' }; });
  const s = {
    console: { log() {}, error() {} },
    Utilities: criarUtilities({ sleep() {}, computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v)).digest()) }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    SpreadsheetApp: { openById: (id) => { if (id === 'COMDB') return com; if (id === 'SGODB') return sgo; throw new Error('nf'); } },
    DriveApp: { getFilesByName: () => ({ hasNext: () => false }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (x) => emails.push(x) },
    UrlFetchApp: { fetch: (url, op) => { fetches.push({ url, corpo: JSON.parse(op.payload) }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(/z-api/.test(url) ? { zaapId: 'zz', messageId: 'Z-' + fetches.length } : { messages: [{ id: 'wamid.M' + fetches.length }] }) }; } },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.teste' }), getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create() {} }) }), everyMinutes: () => ({ create() {} }) }) }) },
    validarSessao: (sid) => (sessoes[sid] ? { valid: true, data: sessoes[sid] } : { valid: false }),
    CertCal_garantirTabela_() {}, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    Atividades_avisosCfg_: () => ({ vinculosWhatsapp: ['CLT'] })
  };
  vm.createContext(s);
  vm.runInContext(ler('SGO_Utilis.js').replace('const SGO_UTILS =', 'var SGO_UTILS ='), s);
  vm.runInContext("var SGO_CFG = { DB_ID: 'SGODB', SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', NTF_ENVIOS: 'NTF_ENVIOS' } };", s);
  s.SGO_DATA = { getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)), insertMany: (t, l) => { (tabelas[t] = tabelas[t] || []).push(...l); } };
  ['SGO_Notificar.js', 'SGO_Expediente.js', 'Comunicacao.js', 'SGO_ComunicacaoAdaptador.js', 'SGO_ComunicacaoWhatsapp.js'].forEach((f) => vm.runInContext(ler(f), s, { filename: f }));
  const api = (us, acao, d) => { s.COM_MEMO_ = {}; return s.comApi('S-' + us, acao, d || {}); };
  return { s, api, com, fetches, emails, tabelas, props, cache, ligar: () => { s.COM_MEMO_ = {}; const ss = s.comBanco_(false); s.comConfigGravar_('wa_ligado', 'SIM'); s.comConfigGravar_('wa_ausente_min', '5'); return ss; } };
}

// próxima terça e próximo domingo (a pelo menos 2 dias), 10:00 em São Paulo (13:00 UTC): sempre depois de tudo que o teste grava
// com a hora real (presença, criação das pessoas). Terça não cai em feriado nacional fixo nem móvel neste uso.
function proximo(diaSemana) { const d = new Date(Date.now() + 2 * 86400000); d.setUTCHours(13, 0, 0, 0); while (d.getUTCDay() !== diaSemana) d.setUTCDate(d.getUTCDate() + 1); return d.getTime(); }
const TERCA_10H = proximo(2);
const DOMINGO = proximo(0);

function preparar(c) {
  ['ana.t', 'bia.t', 'gil.t'].forEach((u) => c.api(u, 'iniciar', { visivel: false }));
  c.ligar();
  const pessoa = (login) => { c.s.COM_MEMO_ = {}; return c.s.comPessoas_(c.s.comBanco_(false)).find((p) => p.sgo_login === login).pessoa_id; };
  return { ana: pessoa('ana.t'), bia: pessoa('bia.t'), gil: pessoa('gil.t') };
}
// a mensagem fica "antiga" para a rodada: o teste roda a rodada numa hora fixa e grava a mensagem 10 min antes
function mensagemAntiga(c, de, para, texto, ms) {
  const conv = c.api(de, 'abrirDireta', { pessoa_id: para }).conversa.conversa_id;
  const r = c.api(de, 'enviar', { conversa_id: conv, texto });
  const sh = c.com.getSheetByName('COM_MENSAGENS'), linha = sh._rows.find((l) => String(l[0]).replace(/^'/, '') === r.mensagem.msg_id);
  linha[6] = "'" + new Date(ms - 10 * 60000).toISOString();
  return conv;
}

test('modelo novo da Meta segue as regras e entra na lista de cadastro', () => {
  const c = cenario();
  const def = c.s.NTF_MODELOS_META.sgo_bate_papo_mensagem;
  assert.ok(def, 'modelo existe');
  assert.equal(c.s.Notificar_validarModeloMeta_('sgo_bate_papo_mensagem', def).join('; '), '');
  const corpo = c.s.Notificar_corpoCadastroMeta_('sgo_bate_papo_mensagem');
  assert.equal(corpo.category, 'UTILITY');
  assert.equal(corpo.language, 'pt_BR');
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(def.texto), 'sem emoji');
});

test('ida pela Z-API: texto livre, id da mensagem guardado, fora do expediente nada sai', () => {
  const c = cenario();
  const p = preparar(c);
  mensagemAntiga(c, 'gil.t', p.ana, 'Ana, o laudo saiu?', DOMINGO);
  let r = c.s.SGO_comWhatsappExec_(DOMINGO);
  assert.equal(c.fetches.length, 0, 'domingo: nada');
  assert.match(r.motivo, /fora do expediente/);
  mensagemAntiga(c, 'gil.t', p.ana, 'Ana, o laudo saiu?', TERCA_10H);
  r = c.s.SGO_comWhatsappExec_(TERCA_10H);
  assert.equal(r.enviados, 1, JSON.stringify(r));
  assert.equal(c.fetches.length, 1);
  assert.match(c.fetches[0].url, /z-api\.io\/instances\/inst-teste\/token\/tok-teste\/send-text$/);
  assert.equal(c.fetches[0].corpo.phone, '5562900000001');
  assert.match(c.fetches[0].corpo.message, /Mensagem de Gil Gestor:/);
  assert.match(c.fetches[0].corpo.message, /responda esta mensagem ou abra o SGO\+: https:\/\/sgo\.teste/);
  const trilha = c.com.getSheetByName('COM_WHATSAPP')._rows.slice(1).map((l) => l.map((x) => String(x).replace(/^'/, '')));
  assert.ok(trilha.some((l) => l[1] === 'SAIDA' && l[6] === 'Z-1' && l[9] === 'OK'), 'id da Z-API guardado para a volta');
  assert.ok(c.tabelas.NTF_ENVIOS.some((n) => n.ORIGEM === 'BATE_PAPO' && n.SITUACAO === 'OK' && n.CANAL === 'whatsapp'), 'registrado em NTF_ENVIOS');
  assert.ok(!JSON.stringify(trilha).includes('5562900000001'), 'celular nunca na Comunicação');
});

test('PJ recebe por e-mail; Meta sem modelo aprovado vai por e-mail; com modelo usa sgo_bate_papo_mensagem', () => {
  const c = cenario({ props: { COM_WA_MODELO_APROVADO: 'NAO' } });
  const p = preparar(c);
  mensagemAntiga(c, 'gil.t', p.bia, 'Bia, preciso do orçamento', TERCA_10H);
  c.s.SGO_comWhatsappExec_(TERCA_10H);
  assert.equal(c.fetches.length, 0, 'PJ: sem WhatsApp');
  assert.equal(c.emails.length, 1);
  assert.equal(c.emails[0].to, 'bia@teste.invalid');
  // provedor Meta
  c.props.WHATSAPP_PROVEDOR = 'meta'; c.props.META_WA_TOKEN = 'tk'; c.props.META_WA_PHONE_ID = '123';
  mensagemAntiga(c, 'gil.t', p.ana, 'Ana, uma pergunta', TERCA_10H);
  c.s.SGO_comWhatsappExec_(TERCA_10H);
  assert.equal(c.fetches.length, 0, 'modelo não aprovado: e-mail');
  assert.equal(c.emails.length, 2);
  c.props.COM_WA_MODELO_APROVADO = 'SIM';
  mensagemAntiga(c, 'bia.t', p.gil, 'Gil, conferi', TERCA_10H);
  c.s.SGO_comWhatsappExec_(TERCA_10H);
  assert.equal(c.fetches.length, 1);
  assert.equal(c.fetches[0].corpo.template.name, 'sgo_bate_papo_mensagem');
  assert.equal(c.fetches[0].corpo.template.components[0].parameters.length, 4);
  assert.equal(c.fetches[0].corpo.template.components[0].parameters[0].text, 'Gil');
});

test('ponte desligada não envia nada', () => {
  const c = cenario();
  const p = preparar(c);
  c.s.comConfigGravar_('wa_ligado', 'NAO');
  mensagemAntiga(c, 'gil.t', p.ana, 'Ana?', TERCA_10H);
  const r = c.s.SGO_comWhatsappExec_(TERCA_10H);
  assert.equal(c.fetches.length + c.emails.length, 0);
  assert.match(r.motivo, /desligada/);
});

test('a área vem do cadastro (CAD_USUARIOS.AREA) e não do perfil', () => {
  const c = cenario();
  const r = c.api('ana.t', 'iniciar');
  assert.equal(r.eu.area, 'TECNICA');
  assert.equal(r.eu.setor, 'Técnico', 'o setor antigo continua sendo o perfil');
  const g = c.api('gil.t', 'iniciar');
  assert.equal(g.eu.area, 'DIRETORIA');
});
