// Módulo Representação (29/10/2026): o perfil REPRESENTADA entra pelo login normal do SGO+, ligado a uma representada
// ativa, e só usa o módulo. Código real de SGO_Auth.js, SGO_Data.js, SGO_Usuarios.js e SGO_ComunicacaoAdaptador.js com
// planilha em memória. Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function ambiente() {
  const abas = {
    CAD_USUARIOS: [['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'EMAIL', 'CLIENTE_ID', 'REPRESENTADA_ID', 'REPRESENTACAO_PAPEL'],
      ['u1', 'gil', 'senha123', 'GIL GESTOR', 'GESTOR', 'ATIVO', 'gil@exemplo.test', '', '', ''],
      ['r1', 'ana.rep', 'senha123', 'ANA REPRESENTADA', 'REPRESENTADA', 'ATIVO', 'ana@rep.exemplo.test', '', 'repA', 'ATENDENTE'],
      ['r2', 'sem.rep', 'senha123', 'SEM EMPRESA', 'REPRESENTADA', 'ATIVO', 'sem@rep.exemplo.test', '', '', 'LEITURA'],
      ['r3', 'ina.rep', 'senha123', 'EMPRESA INATIVA', 'REPRESENTADA', 'ATIVO', 'ina@rep.exemplo.test', '', 'repI', 'ADMIN']],
    REP_REPRESENTADAS: [['ID', 'NOME', 'SITUACAO'], ['repA', 'REPRESENTADA ALFA TESTE', 'ATIVA'], ['repI', 'REPRESENTADA INATIVA TESTE', 'INATIVA']],
    SYS_LOGS: [['ID', 'DATA', 'USUARIO', 'PERFIL', 'ACAO', 'DETALHE']]
  };
  const folha = (nome) => ({
    getLastRow: () => abas[nome].length, getLastColumn: () => abas[nome][0].length,
    getRange: (r, c, nr, nc) => ({ getValues: () => abas[nome].slice(r - 1, r - 1 + (nr || 1)).map((l) => l.slice(c - 1, c - 1 + (nc || 1))), setValue: (v) => { abas[nome][r - 1][c - 1] = v; } }),
    getDataRange: () => ({ getValues: () => abas[nome].map((l) => l.slice()) }),
    appendRow: (l) => abas[nome].push(l)
  });
  const props = {}, cache = {};
  const ctx = vm.createContext({
    console, JSON, Date, Math, Object, Array, String, Number, RegExp, Error,
    SGO_CFG: { DB_ID: 'db', SESSION_TTL: 21600, STATUS: { ATIVO: 'ATIVO' }, SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', SYS_LOGS: 'SYS_LOGS' }, PROFILES: ['ADMIN', 'GESTOR', 'CLIENTE', 'REPRESENTADA'] },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (abas[n] ? folha(n) : null) }), flush() {} },
    Utilities: { getUuid: () => crypto.randomUUID(), computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t)).digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 } },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false }) }
  });
  vm.runInContext(fs.readFileSync(path.join(pasta, 'SGO_Utilis.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(pasta, 'SGO_Data.js'), 'utf8'), ctx);
  // a planilha em memória entra pelo getSheet real do SGO_DATA
  vm.runInContext('SGO_DATA.getSheet = function (n) { return __folha(n); };', Object.assign(ctx, { __folha: (n) => { if (!abas[n]) throw new Error('Aba não encontrada: ' + n); return folha(n); } }));
  for (const f of ['SGO_Auth.js', 'SGO_ComunicacaoAdaptador.js']) vm.runInContext(fs.readFileSync(path.join(pasta, f), 'utf8'), ctx, { filename: f });
  return { ctx, abas, props };
}

test('login: a conta REPRESENTADA entra só ligada a uma representada ativa e a sessão leva a representada e o papel', () => {
  const a = ambiente();
  const r = a.ctx.login('ana@rep.exemplo.test', 'senha123');
  assert.equal(r.success, true); assert.equal(r.user.perfil, 'REPRESENTADA'); assert.equal(r.user.representadaId, 'repA'); assert.equal(r.user.representacaoPapel, 'ATENDENTE');
  const sem = a.ctx.login('sem@rep.exemplo.test', 'senha123');
  assert.equal(sem.success, false); assert.match(sem.message, /não está ligado a nenhuma empresa/);
  const ina = a.ctx.login('ina@rep.exemplo.test', 'senha123');
  assert.equal(ina.success, false); assert.match(ina.message, /suspenso pela Metrolabs/);
  assert.equal(a.ctx.login('gil@exemplo.test', 'senha123').success, true);
});

test('exigirSessao recusa a sessão REPRESENTADA fora da entrada do módulo; isAdminSession é falso; validarSessao segue valendo (identidade)', () => {
  const a = ambiente();
  const sid = a.ctx.login('ana@rep.exemplo.test', 'senha123').sessionId;
  assert.equal(a.ctx.validarSessao(sid).valid, true);
  assert.throws(() => a.ctx.exigirSessao(sid), /só o módulo Representação/);
  assert.equal(a.ctx.isAdminSession(sid), false);
  vm.runInContext('var SGO_REP_MODULO = true;', a.ctx);
  assert.equal(a.ctx.exigirSessao(sid).representadaId, 'repA');
  vm.runInContext('SGO_REP_MODULO = false;', a.ctx);
  assert.throws(() => a.ctx.exigirSessao(sid), /Acesso negado/);
  const sg = a.ctx.login('gil@exemplo.test', 'senha123').sessionId;
  assert.equal(a.ctx.exigirSessao(sg).perfil, 'GESTOR'); // o resto da equipe não muda
});

test('SGO_DATA.getAll("CAD_USUARIOS") esconde as contas REPRESENTADA do resto do SGO+, salvo com a marca de Usuários e do módulo', () => {
  const a = ambiente();
  assert.equal(JSON.stringify(vm.runInContext(`SGO_DATA.getAll('CAD_USUARIOS')`, a.ctx).map((u) => u.ID)), JSON.stringify(['u1']));
  assert.equal(vm.runInContext(`SGO_DATA.getById('CAD_USUARIOS', 'r1')`, a.ctx), null);
  vm.runInContext('var SGO_DATA_REP_VISIVEL = true;', a.ctx);
  assert.equal(JSON.stringify(vm.runInContext(`SGO_DATA.getAll('CAD_USUARIOS')`, a.ctx).map((u) => u.ID)), JSON.stringify(['u1', 'r1', 'r2', 'r3']));
  vm.runInContext('SGO_DATA_REP_VISIVEL = false;', a.ctx);
  assert.equal(vm.runInContext(`SGO_DATA.getAll('REP_REPRESENTADAS')`, a.ctx).length, 2); // outras abas não mudam
  // bate-papo interno: representada fica de fora como o cliente
  assert.equal(a.ctx.sgoComEhCliente_('REPRESENTADA', ''), true);
  assert.equal(a.ctx.sgoComEhCliente_('GESTOR', ''), false);
});

test('fontes: perfil REPRESENTADA cadastrado em Usuários com representada e papel; Assistência nunca o trata como interno', () => {
  const cfg = fs.readFileSync(path.join(pasta, 'SGO_Config.js'), 'utf8');
  assert.match(cfg, /"REPRESENTADA"\s*\n\s*\]/);
  const usu = fs.readFileSync(path.join(pasta, 'SGO_Usuarios.js'), 'utf8');
  assert.match(usu, /Escolha a representada \(empresa\) desta conta/);
  assert.match(usu, /Escolha o papel na representada/);
  assert.ok((usu.match(/SGO_DATA_REP_VISIVEL = true; try/g) || []).length >= 9);
  const core = fs.readFileSync(path.join(pasta, 'JS_Core.html'), 'utf8');
  assert.match(core, /SGO_TELAS_REPRESENTADA = \["representacao"\]/);
  assert.equal((core.match(/if \(SGO_ehRepresentada_\(\)\) \{ SGO_iniciarRepresentada_\(\); return; \}/g) || []).length, 2); // login e auto login
  const idx = fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8');
  assert.match(idx, /include\('JS_Representacao'\)/); assert.match(idx, /id="menu-secao-representacao"/);
});
