// Segurança do acesso (31/10/2026, pedido do dono): troca de senha obrigatória, código no celular (segundo fator),
// aparelho confiado, recuperação e reserva por e-mail. SGO_Auth.js + SGO_SegurancaAcesso.js num vm com planilha,
// cache, propriedades, e-mail e WhatsApp simulados. A trava do servidor (403 antes do legado) está no sgo_servidor
// (testes/segurancaAcesso.test.ts).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarUtilities } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const COLS = ['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'CRIADO_EM', 'CLIENTE_ID', 'EMAIL', 'CELULAR', 'REPRESENTADA_ID', 'REPRESENTACAO_PAPEL'];
const sinal = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const semSinal = (arr) => Buffer.from(Array.from(arr, (b) => b & 255));

function cripto() {
  return {
    pbkdf2Hex: (s, sal, it) => crypto.pbkdf2Sync(String(s), Buffer.from(sal, 'hex'), it, 32, 'sha256').toString('hex'),
    aleatorioHex: (n) => crypto.randomBytes(n).toString('hex'),
    sha256Hex: (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex'),
    igual: (a, b) => String(a) === String(b)
  };
}

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const abas = new Map();
  const novaAba = (nome, cab) => { abas.set(nome, { cab: cab.slice(), linhas: [] }); return abas.get(nome); };
  const usuarios = novaAba('CAD_USUARIOS', COLS);
  novaAba('SYS_LOGS', ['ID', 'DATA', 'USUARIO', 'ACAO', 'MODULO', 'DETALHE']);
  novaAba('REP_REPRESENTADAS', ['ID', 'NOME', 'SITUACAO']).linhas.push(['rep1', 'BRASMEDICAL', 'ATIVA']);
  const largura = (a) => a.cab.length;
  function folha(nome) {
    const a = abas.get(nome);
    if (!a) return null;
    const celula = (r, c) => (r === 1 ? a.cab[c - 1] : (a.linhas[r - 2] || [])[c - 1]);
    const intervalo = (r, c, nr, nc) => ({
      getValues: () => Array.from({ length: nr || 1 }, (_, i) => Array.from({ length: nc || 1 }, (_, j) => { const v = celula(r + i, c + j); return v === undefined ? '' : v; })),
      setValue: (v) => { if (r === 1) a.cab[c - 1] = v; else { const l = a.linhas[r - 2]; while (l.length < c) l.push(''); l[c - 1] = v; } },
      setValues: (vals) => vals.forEach((linha, i) => linha.forEach((v, j) => { const rr = r + i; if (rr === 1) a.cab[c + j - 1] = v; else { while (a.linhas.length < rr - 1) a.linhas.push([]); const l = a.linhas[rr - 2]; while (l.length < c + j) l.push(''); l[c + j - 1] = v; } }))
    });
    return {
      getName: () => nome,
      getDataRange: () => intervalo(1, 1, a.linhas.length + 1, largura(a)),
      getRange: (r, c, nr, nc) => intervalo(r, c, nr, nc),
      getLastRow: () => a.linhas.length + 1,
      getLastColumn: () => largura(a),
      appendRow: (l) => { a.linhas.push(l.slice()); }
    };
  }
  const props = new Map(), cache = new Map(), emails = [], fetches = [];
  let respostaMeta = opcoes.respostaMeta || { codigo: 200, corpo: { messages: [{ id: 'wamid.1' }] } };
  const paraObj = (a, l) => { const o = {}; a.cab.forEach((h, i) => { o[h] = l[i] === undefined ? '' : l[i]; }); return o; };
  const ctx = {
    console, JSON,
    SGO_CFG: { DB_ID: 'db', SESSION_TTL: 21600, STATUS: { ATIVO: 'ATIVO' }, SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', SYS_LOGS: 'SYS_LOGS' },
      PROFILES: ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH', 'CLIENTE', 'REPRESENTADA'] },
    SGO_UTILS: {
      safe: (x) => String(x === null || x === undefined ? '' : x).trim(), safeUpper: (x) => String(x === null || x === undefined ? '' : x).trim().toUpperCase(),
      safeLower: (x) => String(x === null || x === undefined ? '' : x).trim().toLowerCase(), uuid: () => crypto.randomUUID(), nowIso: () => new Date().toISOString()
    },
    SpreadsheetApp: { openById: () => ({ getSheetByName: folha }) },
    SGO_DATA: {
      _headersCache: {}, _headerMapCache: {},
      getSheet: (n) => { const f = folha(n); if (!f) throw new Error('Aba não encontrada: ' + n); return f; },
      getAll: (n) => { const a = abas.get(n); return a ? a.linhas.map((l) => paraObj(a, l)) : []; },
      getById: (n, id) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); return l ? paraObj(a, l) : null; },
      update: (n, id, obj) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); if (!l) return false; Object.keys(obj).forEach((k) => { const i = a.cab.indexOf(k); if (i >= 0) { while (l.length <= i) l.push(''); l[i] = obj[k]; } }); return true; },
      log: () => true
    },
    CertCal_garantirColuna_: (n, c) => { const a = abas.get(n); if (a && a.cab.indexOf(c) < 0) a.cab.push(c); },
    CertCal_garantirTabela_: (n, cols) => { if (!abas.has(n)) novaAba(n, cols); },
    CertCal_forcarColunaTexto_: () => {},
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: (k) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: criarUtilities({
      computeDigest: (_alg, t) => sinal(crypto.createHash('sha256').update(String(t), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => sinal(crypto.createHmac('sha256', semSinal(k)).update(semSinal(v)).digest()),
      newBlob: (t) => ({ getBytes: () => sinal(Buffer.from(String(t), 'utf8')) }),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
    }),
    MailApp: { sendEmail: (o) => { if (opcoes.emailFalha) throw new Error('SMTP fora'); emails.push(o); } },
    UrlFetchApp: { fetch: (url, op) => { fetches.push({ url, op, corpo: JSON.parse(op.payload || 'null') }); return { getResponseCode: () => respostaMeta.codigo, getContentText: () => JSON.stringify(respostaMeta.corpo) }; } },
    Chaves_ehDonoUsuario_: (u) => String(u || '').toLowerCase() === 'admin'
  };
  if (opcoes.cripto !== false) ctx.SGO_CRIPTO = cripto();
  vm.createContext(ctx);
  for (const f of ['SGO_Auth.js', 'SGO_SegurancaAcesso.js']) vm.runInContext(fs.readFileSync(path.join(BASE, f), 'utf8'), ctx, { filename: f });
  const add = (o) => { const l = COLS.map((c) => (o[c] === undefined ? '' : o[c])); usuarios.linhas.push(l); return o; };
  const cad = (id) => ctx.SGO_DATA.getById('CAD_USUARIOS', id);
  const ultimoCodigo = () => { const e = emails[emails.length - 1]; const m = /é (\d{6})\./.exec(e.body); return m && m[1]; };
  const codigoMeta = () => fetches[fetches.length - 1].corpo.template.components[0].parameters[0].text;
  const config = (modo, perfis) => props.set('SEGA_CONFIG', JSON.stringify({ modo, perfis: perfis || [] }));
  const desafio = (id) => JSON.parse(cache.get('SEGA_DSF_' + id));
  const mexerDesafio = (id, f) => { const d = desafio(id); f(d); cache.set('SEGA_DSF_' + id, JSON.stringify(d)); };
  const velharSessao = (sid) => { const d = JSON.parse(props.get('SGO_SESSION_' + sid)); d.conferidoEm = '2000-01-01T00:00:00Z'; props.set('SGO_SESSION_' + sid, JSON.stringify(d)); cache.delete(sid); };
  const registro = () => (abas.get('SYS_SEGURANCA_ACESSO') || { linhas: [] }).linhas;
  const sessoes = () => [...props.keys()].filter((k) => k.startsWith('SGO_SESSION_'));
  return { ctx, abas, props, cache, emails, fetches, add, cad, ultimoCodigo, codigoMeta, config, desafio, mexerDesafio, velharSessao, registro, sessoes, setMeta: (r) => { respostaMeta = r; } };
}

const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', aparelho: '' };
const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'THIAGO SOUZA', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@metrolabs.com.br', CELULAR: '5562999991294' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO PEREIRA', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@metrolabs.com.br', CELULAR: '' };

test('hash forte: texto plano e SHA-256 antigo entram e viram PBKDF2 no 1º login; cálculo em JavaScript confere com o nativo', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN));
  a.add(Object.assign({}, TEC, { SENHA: a.ctx.SENHA_HASH_PREFIX_AUTH + 'abcd1234abcd1234$' + crypto.createHash('sha256').update('abcd1234abcd1234Joao!2026').digest('hex') }));
  const r1 = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX);
  assert.equal(r1.success, true);
  assert.match(a.cad('u-admin').SENHA, /^pbkdf2_sha256\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).success, true);
  assert.match(a.cad('u-tec').SENHA, /^pbkdf2_sha256\$/);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'errada', CTX).success, false);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).success, true, 'continua entrando depois da migração');
  // reserva em JavaScript (sem SGO_CRIPTO) confere o mesmo hash
  const sal = '00112233445566778899aabbccddeeff';
  const nativo = crypto.pbkdf2Sync('Senha123x', Buffer.from(sal, 'hex'), 50, 32, 'sha256').toString('hex');
  const b = ambiente({ cripto: false });
  assert.equal(b.ctx.pbkdf2JsAuth_('Senha123x', sal, 50), nativo);
  assert.equal(b.ctx.verificarSenhaAuth_('Senha123x', 'pbkdf2_sha256$50$' + sal + '$' + nativo), true);
  assert.equal(b.ctx.verificarSenhaAuth_('Senha124x', 'pbkdf2_sha256$50$' + sal + '$' + nativo), false);
  assert.match(b.ctx.gerarHashSenhaAuth_('x'), /^sha256\$/, 'sem o servidor, as senhas novas ficam no formato anterior (nada quebra)');
});

test('troca obrigatória: a sessão nasce pendente e nada aceita antes da troca; regras da senha; depois tudo funciona', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC, { PRECISA_TROCAR_SENHA: 'SIM' }));
  a.ctx.SegAcesso_garantirEstrutura_();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-tec', { PRECISA_TROCAR_SENHA: 'SIM' });
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  assert.equal(r.success, true);
  assert.equal(r.etapa, 'TROCAR_SENHA');
  const sid = r.sessionId;
  const v = a.ctx.validarSessao(sid);
  assert.equal(v.valid, false);
  assert.equal(v.pendente, 'TROCA_SENHA');
  assert.throws(() => a.ctx.exigirSessao(sid), /crie a sua nova senha/);
  assert.equal(a.ctx.isAdminSession(sid), false);
  const g = a.ctx.getSessaoAtual(sid);
  assert.equal(g.success, false); assert.equal(g.pendente, 'TROCA_SENHA');
  const tentar = (nova, conf) => a.ctx.trocarSenhaAcesso(sid, { nova, confirmacao: conf === undefined ? nova : conf }, CTX);
  assert.match(tentar('Ab1').message, /pelo menos 8 caracteres/);
  assert.match(tentar('somenteletras').message, /letras e números/);
  assert.match(tentar('Casa2026verde', 'Casa2026verdi').message, /confirmação não é igual/);
  assert.match(tentar('Joao!2026').message, /diferente da atual/);
  assert.match(tentar('12345678a').message, /fácil de adivinhar/);
  assert.match(tentar('senha2026').message, /fácil de adivinhar/);
  assert.match(tentar('joao2026xy').message, /fácil de adivinhar/, 'login');
  assert.match(tentar('Pereira2026').message, /fácil de adivinhar/, 'nome');
  assert.match(tentar('Metrolabs2026').message, /fácil de adivinhar/, 'empresa');
  assert.match(tentar(' Casa2026verde').message, /espaço/);
  assert.equal(a.ctx.validarSessao(sid).valid, false, 'continua pendente depois das recusas');
  const ok = tentar('Casa2026verde');
  assert.equal(ok.success, true, ok.message);
  assert.equal(ok.limparAparelho, true);
  const c = a.cad('u-tec');
  assert.equal(c.PRECISA_TROCAR_SENHA, '');
  assert.equal(c.SEGURANCA_VERSAO, '1');
  assert.match(c.SENHA, /^pbkdf2_sha256\$/);
  assert.equal(a.ctx.validarSessao(sid).valid, true, 'a mesma sessão segue, sem pendência');
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).success, false, 'senha antiga não entra mais');
  const novo = a.ctx.login('joao@metrolabs.com.br', 'Casa2026verde', CTX);
  assert.equal(novo.success, true); assert.equal(novo.etapa, undefined);
  // nada de senha no registro de segurança
  const txt = JSON.stringify(a.registro());
  assert.ok(!/Casa2026verde|Joao!2026/.test(txt));
  assert.ok(a.registro().some((l) => l[2] === 'SENHA_TROCADA'));
});

test('troca exigida com a pessoa já dentro: em até 5 min a sessão fica pendente e pede a senha atual; a troca derruba as outras sessões', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  const s1 = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).sessionId;
  const s2 = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).sessionId;
  assert.equal(a.ctx.validarSessao(s1).valid, true);
  a.ctx.SegAcesso_garantirEstrutura_();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-tec', { PRECISA_TROCAR_SENHA: 'SIM' });
  assert.equal(a.ctx.validarSessao(s1).valid, true, 'ainda dentro dos 5 minutos');
  a.velharSessao(s1);
  const v = a.ctx.validarSessao(s1);
  assert.equal(v.pendente, 'TROCA_SENHA'); assert.equal(v.pendenteInfo.pedirAtual, true);
  assert.match(a.ctx.trocarSenhaAcesso(s1, { nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX).message, /senha atual não confere/);
  assert.match(a.ctx.trocarSenhaAcesso(s1, { senhaAtual: 'x', nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX).message, /Restam 3/);
  const ok = a.ctx.trocarSenhaAcesso(s1, { senhaAtual: 'Joao!2026', nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX);
  assert.equal(ok.success, true, ok.message);
  assert.equal(a.ctx.validarSessao(s1).valid, true);
  a.velharSessao(s2);
  const v2 = a.ctx.validarSessao(s2);
  assert.equal(v2.valid, false); assert.match(v2.message, /senha foi trocada/);
});

test('código por e-mail: sem sessão antes do código; 6 dígitos, uso único, 5 tentativas, validade de 10 minutos', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.config('EMAIL');
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  assert.equal(r.success, true); assert.equal(r.etapa, 'CODIGO'); assert.equal(r.sessionId, undefined);
  assert.equal(a.sessoes().length, 0, 'nenhuma sessão criada antes do código');
  assert.equal(r.canal, 'EMAIL'); assert.match(r.destino, /^e-mail j•••o@metrolabs\.com\.br$/);
  assert.match(r.message, /10 minutos/);
  assert.equal(r.tentativasRestantes, 5); assert.equal(r.reenviosRestantes, 3); assert.ok(r.reenviarEmS >= 59);
  const codigo = a.ultimoCodigo();
  assert.match(codigo, /^\d{6}$/);
  assert.equal(a.emails[0].subject.indexOf(codigo), -1, 'o código não vai no assunto');
  assert.ok(!JSON.stringify(a.desafio(r.desafio)).includes(codigo), 'o código não fica guardado, só o resumo');
  const errado = codigo === '000000' ? '111111' : '000000';
  const e1 = a.ctx.verificarCodigoAcesso(r.desafio, errado, false, CTX);
  assert.equal(e1.success, false); assert.equal(e1.etapa, 'CODIGO'); assert.match(e1.message, /Restam 4/);
  const ok = a.ctx.verificarCodigoAcesso(r.desafio, codigo, false, CTX);
  assert.equal(ok.success, true); assert.match(ok.sessionId, /^SESS_/);
  assert.equal(ok.aparelhoToken, undefined);
  assert.equal(a.ctx.validarSessao(ok.sessionId).valid, true);
  const deNovo = a.ctx.verificarCodigoAcesso(r.desafio, codigo, false, CTX);
  assert.equal(deNovo.success, false); assert.equal(deNovo.etapa, 'LOGIN', 'uso único');
  // 5 tentativas
  const r2 = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  let ult;
  for (let i = 0; i < 5; i++) ult = a.ctx.verificarCodigoAcesso(r2.desafio, a.ultimoCodigo() === '000000' ? '111111' : '000000', false, CTX);
  assert.equal(ult.etapa, 'LOGIN'); assert.match(ult.message, /5 vezes/);
  assert.equal(a.ctx.verificarCodigoAcesso(r2.desafio, a.ultimoCodigo(), false, CTX).success, false, 'depois de 5 erros nem o certo entra');
  // validade
  const r3 = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  const c3 = a.ultimoCodigo();
  a.mexerDesafio(r3.desafio, (d) => { d.expiraMs = Date.now() - 1000; });
  const venc = a.ctx.verificarCodigoAcesso(r3.desafio, c3, false, CTX);
  assert.equal(venc.success, false); assert.equal(venc.vencido, true); assert.match(venc.message, /venceu/);
  // registro sem o código
  const txt = JSON.stringify(a.registro());
  assert.ok(!txt.includes(codigo) && !txt.includes(c3));
  for (const ev of ['CODIGO_ENVIADO', 'CODIGO_ERRADO', 'CODIGO_OK', 'CODIGO_BLOQUEADO', 'CODIGO_VENCIDO']) assert.ok(a.registro().some((l) => l[2] === ev), ev);
});

test('reenvio: só depois de 60 s, no máximo 3 por login; o código anterior deixa de valer; opção de e-mail', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN));
  a.config('WHATSAPP');
  a.props.set('META_WA_TOKEN', 'TOKENSECRETO123'); a.props.set('META_WA_PHONE_ID', '1409597008899044');
  const r = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX);
  assert.equal(r.canal, 'WHATSAPP'); assert.equal(r.destino, 'WhatsApp terminado em 94'); assert.equal(r.podeEmail, true);
  const cod1 = a.codigoMeta();
  const cedo = a.ctx.reenviarCodigoAcesso(r.desafio, {}, CTX);
  assert.equal(cedo.success, false); assert.match(cedo.message, /Aguarde \d+ segundos/);
  for (let i = 1; i <= 3; i++) {
    a.mexerDesafio(r.desafio, (d) => { d.ultimoEnvioMs = Date.now() - 61000; });
    const rr = a.ctx.reenviarCodigoAcesso(r.desafio, i === 3 ? { canal: 'EMAIL' } : {}, CTX);
    assert.equal(rr.success, true, rr.message); assert.equal(rr.reenviosRestantes, 3 - i);
    if (i === 3) { assert.equal(rr.canal, 'EMAIL'); assert.equal(rr.podeEmail, false); }
  }
  a.mexerDesafio(r.desafio, (d) => { d.ultimoEnvioMs = Date.now() - 61000; });
  assert.match(a.ctx.reenviarCodigoAcesso(r.desafio, {}, CTX).message, /3 códigos novos/);
  assert.equal(a.ctx.verificarCodigoAcesso(r.desafio, cod1, false, CTX).success, false, 'o primeiro código não vale mais');
  assert.equal(a.ctx.verificarCodigoAcesso(r.desafio, a.ultimoCodigo(), false, CTX).success, true);
});

test('WhatsApp oficial: modelo de autenticação com botão de copiar; falhou ou sem celular = e-mail; sem chave = e-mail', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN)); a.add(Object.assign({}, TEC));
  a.config('WHATSAPP');
  // sem chave da Meta: e-mail, sem quebrar
  const semChave = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX);
  assert.equal(semChave.canal, 'EMAIL'); assert.match(semChave.message, /WhatsApp não funcionou/);
  assert.equal(a.fetches.length, 0);
  a.props.set('META_WA_TOKEN', 'TOKENSECRETO123'); a.props.set('META_WA_PHONE_ID', '1409597008899044');
  const r = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX);
  assert.equal(r.canal, 'WHATSAPP');
  const f = a.fetches[a.fetches.length - 1];
  assert.match(f.url, /graph\.facebook\.com\/v[\d.]+\/1409597008899044\/messages$/);
  assert.equal(f.corpo.template.name, 'sgo_codigo_acesso');
  assert.equal(f.corpo.template.language.code, 'pt_BR');
  assert.equal(f.corpo.to, '5562999991294');
  const comps = f.corpo.template.components;
  assert.equal(comps[1].type, 'button'); assert.equal(comps[1].sub_type, 'url');
  assert.equal(comps[1].parameters[0].text, comps[0].parameters[0].text);
  // a Meta recusa: reserva por e-mail, e o motivo não traz o token
  a.setMeta({ codigo: 400, corpo: { error: { code: 132001, message: 'Template does not exist TOKENSECRETO123' } } });
  const r2 = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX);
  assert.equal(r2.canal, 'EMAIL'); assert.match(r2.message, /WhatsApp não funcionou/);
  assert.ok(!JSON.stringify(a.registro()).includes('TOKENSECRETO123'));
  // técnico sem celular: e-mail direto
  a.setMeta({ codigo: 200, corpo: { messages: [{ id: 'w' }] } });
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).canal, 'EMAIL');
  // modelo com situação conhecida e não aprovada: nem tenta a Meta
  a.props.set('SEGA_MODELO_SITUACAO', JSON.stringify({ status: 'PENDING' }));
  const n = a.fetches.length;
  assert.equal(a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).canal, 'EMAIL');
  assert.equal(a.fetches.length, n);
});

test('sem celular e sem e-mail (ou e-mail fora): não entra e a tela diz o que fazer', () => {
  const a = ambiente({ emailFalha: true });
  a.add(Object.assign({}, TEC));
  a.config('EMAIL');
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  assert.equal(r.success, true); assert.equal(r.etapa, 'SEM_ENVIO'); assert.equal(r.sessionId, undefined);
  assert.match(r.message, /administrador/); assert.match(r.message, /Administração > Usuários/);
});

test('aparelho confiado por 30 dias: sem código naquele aparelho; a troca de senha derruba todos os aparelhos', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.config('EMAIL');
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  const ok = a.ctx.verificarCodigoAcesso(r.desafio, a.ultimoCodigo(), true, CTX);
  assert.match(ok.aparelhoToken, /^[0-9a-f]{64}$/);
  const guardado = [...a.props.entries()].find(([k]) => k.startsWith('SEGA_APR_'));
  assert.ok(guardado && !guardado[1].includes(ok.aparelhoToken) && !guardado[0].includes(ok.aparelhoToken), 'só o resumo do token fica guardado');
  const comAparelho = Object.assign({}, CTX, { aparelho: ok.aparelhoToken });
  const direto = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', comAparelho);
  assert.equal(direto.etapa, undefined); assert.match(direto.sessionId, /^SESS_/);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', Object.assign({}, CTX, { aparelho: 'f'.repeat(64) })).etapa, 'CODIGO', 'token desconhecido pede código');
  // troca de senha em outra sessão (sem este aparelho): o aparelho confiado cai
  const troca = a.ctx.trocarSenhaAcesso(direto.sessionId, { senhaAtual: 'Joao!2026', nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX);
  assert.equal(troca.success, true, troca.message);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Casa2026verde', comAparelho).etapa, 'CODIGO');
});

test('aparelho confiado no mesmo login da troca obrigatória continua valendo depois da troca', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.ctx.SegAcesso_garantirEstrutura_();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-tec', { PRECISA_TROCAR_SENHA: 'SIM' });
  a.config('EMAIL');
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  const ok = a.ctx.verificarCodigoAcesso(r.desafio, a.ultimoCodigo(), true, CTX);
  assert.equal(ok.etapa, 'TROCAR_SENHA');
  const t = a.ctx.trocarSenhaAcesso(ok.sessionId, { nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX);
  assert.equal(t.success, true, t.message); assert.equal(t.limparAparelho, undefined);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Casa2026verde', Object.assign({}, CTX, { aparelho: ok.aparelhoToken })).etapa, undefined);
});

test('perfis: o código vale só para os perfis escolhidos; Cliente e Representada passam pelo mesmo fluxo', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN)); a.add(Object.assign({}, TEC));
  a.add({ ID: 'u-cli', USUARIO: 'hospital', SENHA: 'Cliente2026', NOME: 'MARIA CLIENTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: 'maria@hospital.com.br' });
  a.add({ ID: 'u-rep', USUARIO: 'ana.rep', SENHA: 'Repres2026', NOME: 'ANA REP', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@brasmedical.com.br', REPRESENTADA_ID: 'rep1', REPRESENTACAO_PAPEL: 'ATENDENTE' });
  a.config('EMAIL', ['TECNICO']);
  assert.equal(a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).etapa, undefined);
  assert.equal(a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX).etapa, 'CODIGO');
  a.config('EMAIL', []);
  for (const [login, senha, perfil] of [['maria@hospital.com.br', 'Cliente2026', 'CLIENTE'], ['ana@brasmedical.com.br', 'Repres2026', 'REPRESENTADA']]) {
    const r = a.ctx.login(login, senha, CTX);
    assert.equal(r.etapa, 'CODIGO', login);
    const ok = a.ctx.verificarCodigoAcesso(r.desafio, a.ultimoCodigo(), false, CTX);
    assert.equal(ok.success, true, login); assert.equal(ok.user.perfil, perfil);
    if (perfil === 'REPRESENTADA') { assert.equal(ok.user.representadaId, 'rep1'); assert.throws(() => a.ctx.exigirSessao(ok.sessionId), /representada/); }
    else assert.equal(a.ctx.exigirSessao(ok.sessionId).clienteId, 'c1');
  }
  // troca obrigatória também para cliente e representada
  a.config('DESLIGADO');
  a.ctx.SegAcesso_exigirTrocaTodos_('teste de troca geral', 'admin');
  for (const [login, senha] of [['maria@hospital.com.br', 'Cliente2026'], ['ana@brasmedical.com.br', 'Repres2026']]) {
    const r = a.ctx.login(login, senha, CTX);
    assert.equal(r.etapa, 'TROCAR_SENHA', login);
    assert.equal(a.ctx.trocarSenhaAcesso(r.sessionId, { nova: 'Outra2026xyz', confirmacao: 'Outra2026xyz' }, CTX).success, true, login);
  }
});

test('exigir troca de todos: marca as contas ativas, pula inativas e a conta técnica do Auvo; só o Administrador aciona pela tela', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN)); a.add(Object.assign({}, TEC));
  a.add({ ID: 'u-ina', USUARIO: 'antigo', SENHA: 'x', NOME: 'ANTIGO', PERFIL: 'TECNICO', STATUS: 'INATIVO', EMAIL: 'a@b.com' });
  a.add({ ID: 'u-auvo', USUARIO: 'auvo', SENHA: 'x', NOME: 'AUVO', PERFIL: 'AUVO_SYNC', STATUS: 'ATIVO' });
  a.add({ ID: 'u-ges', USUARIO: 'gestor', SENHA: 'Gestor2026', NOME: 'GESTORA', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'g@m.com' });
  const sGes = a.ctx.login('g@m.com', 'Gestor2026', CTX).sessionId;
  const negado = a.ctx.SegAcesso_api(sGes, 'exigirTrocaTodos', { motivo: 'teste geral', confirmar: true });
  assert.equal(negado.ok, false); assert.match(negado.message, /só o Administrador/);
  const painelGestor = a.ctx.SegAcesso_api(sGes, 'painel', {});
  assert.equal(painelGestor.ok, true, painelGestor.message); assert.equal(painelGestor.podeAlterar, false);
  const sAdm = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).sessionId;
  assert.match(a.ctx.SegAcesso_api(sAdm, 'exigirTrocaTodos', { motivo: 'x', confirmar: true }).message, /motivo/);
  const r = a.ctx.SegAcesso_api(sAdm, 'exigirTrocaTodos', { motivo: 'proteção contra invasões', confirmar: true });
  assert.equal(r.ok, true, r.message); assert.equal(r.resultado.total, 3);
  assert.equal(a.cad('u-admin').PRECISA_TROCAR_SENHA, 'SIM'); assert.equal(a.cad('u-tec').PRECISA_TROCAR_SENHA, 'SIM'); assert.equal(a.cad('u-ges').PRECISA_TROCAR_SENHA, 'SIM');
  assert.equal(a.cad('u-ina').PRECISA_TROCAR_SENHA, ''); assert.equal(a.cad('u-auvo').PRECISA_TROCAR_SENHA, '');
  assert.ok(a.registro().some((l) => l[2] === 'TROCA_EXIGIDA_TODOS' && /proteção contra invasões/.test(l[8]) && /THIAGO SOUZA/.test(l[9])));
  // a tela não recebe Date nem a senha
  const p = a.ctx.SegAcesso_api(sAdm, 'painel', {});
  assert.equal(p.ok, true);
  assert.ok(!/SENHA"|pbkdf2|Velha2026x/.test(JSON.stringify(p)));
});

test('recuperação: Administrador zera o segundo fator (24 h sem código) e exige nova senha com motivo; script do servidor recupera o dono', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN)); a.add(Object.assign({}, TEC));
  const sAdm = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).sessionId;
  a.config('EMAIL');
  const r = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', CTX);
  const ok = a.ctx.verificarCodigoAcesso(r.desafio, a.ultimoCodigo(), true, CTX);
  assert.match(a.ctx.SegAcesso_api(sAdm, 'zerarSegundoFator', { usuarioId: 'u-tec' }).message, /motivo/);
  const z = a.ctx.SegAcesso_api(sAdm, 'zerarSegundoFator', { usuarioId: 'u-tec', motivo: 'perdeu o celular' });
  assert.equal(z.ok, true, z.message);
  assert.equal(a.cad('u-tec').SEGURANCA_VERSAO, '1');
  a.velharSessao(ok.sessionId);
  assert.equal(a.ctx.validarSessao(ok.sessionId).valid, false, 'sessões dele caem');
  const semCodigo = a.ctx.login('joao@metrolabs.com.br', 'Joao!2026', Object.assign({}, CTX, { aparelho: ok.aparelhoToken }));
  assert.equal(semCodigo.etapa, undefined, 'entra sem código nas 24 h da liberação');
  assert.ok(a.registro().some((l) => l[2] === 'CODIGO_DISPENSADO' && /Liberação temporária/.test(l[8])));
  const e = a.ctx.SegAcesso_api(sAdm, 'exigirTrocaUsuario', { usuarioId: 'u-tec', motivo: 'suspeita de senha vazada' });
  assert.equal(e.ok, true); assert.equal(a.cad('u-tec').PRECISA_TROCAR_SENHA, 'SIM');
  assert.ok(a.registro().some((l) => l[2] === 'SEGUNDO_FATOR_ZERADO' && /perdeu o celular/.test(l[8])));
  // o dono trancado: o script do servidor zera, gera senha provisória e desliga o código
  const rec = a.ctx.SegAcesso_recuperarAcesso_('admin', { senhaProvisoria: true, desligarCodigo: true, motivo: 'dono sem acesso ao celular' });
  assert.equal(rec.ok, true); assert.match(rec.senhaProvisoria, /^[A-Za-z0-9]{12}$/);
  assert.equal(a.ctx.SegAcesso_config_().modo, 'DESLIGADO');
  assert.equal(a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).success, false, 'senha antiga não entra');
  const l = a.ctx.login('dono@metrolabs.com.br', rec.senhaProvisoria, CTX);
  assert.equal(l.etapa, 'TROCAR_SENHA');
  assert.ok(!JSON.stringify(a.registro()).includes(rec.senhaProvisoria), 'a senha provisória não vai para o registro');
  assert.equal(a.ctx.SegAcesso_validarNovaSenha_(rec.senhaProvisoria, rec.senhaProvisoria, null).length, 0, 'a provisória passa nas regras');
});

test('configuração: só o Administrador grava; valores inválidos recusados; registro filtra por pessoa e evento', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN));
  a.add({ ID: 'u-dir', USUARIO: 'diretora', SENHA: 'Diretora2026', NOME: 'DIRETORA', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'd@m.com' });
  const sDir = a.ctx.login('d@m.com', 'Diretora2026', CTX).sessionId;
  assert.equal(a.ctx.SegAcesso_api(sDir, 'gravarConfig', { modo: 'EMAIL' }).ok, false);
  const sAdm = a.ctx.login('dono@metrolabs.com.br', 'Velha2026x', CTX).sessionId;
  assert.equal(a.ctx.SegAcesso_api(sAdm, 'gravarConfig', { modo: 'SMS' }).ok, false);
  const g = a.ctx.SegAcesso_api(sAdm, 'gravarConfig', { modo: 'EMAIL', perfis: ['TECNICO', 'INEXISTENTE'] });
  assert.equal(g.ok, true); assert.deepEqual(Array.from(g.config.perfis), ['TECNICO']);
  a.ctx.login('dono@metrolabs.com.br', 'errada', CTX);
  const reg = a.ctx.SegAcesso_api(sAdm, 'registro', { dias: 1, usuario: 'dono@metrolabs', evento: 'LOGIN_FALHA' });
  assert.equal(reg.ok, true); assert.ok(reg.registro.length >= 1);
  assert.ok(reg.registro.every((l) => l.evento === 'LOGIN_FALHA' && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(l.quando) && l.ip === '200.1.2.3' && /Android/.test(l.aparelho)));
  const cliente = ambiente();
  cliente.add({ ID: 'u-cli', USUARIO: 'hospital', SENHA: 'Cliente2026', NOME: 'MARIA', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: 'm@h.com' });
  const sCli = cliente.ctx.login('maria@hospital.com.br', 'Cliente2026', CTX).sessionId;
  assert.equal(cliente.ctx.SegAcesso_api(sCli, 'painel', {}).ok, false, 'cliente não abre a tela da gestão');
});
