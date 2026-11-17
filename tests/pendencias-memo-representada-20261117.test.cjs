'use strict';
// 17/11/2026: a central de pendências memoriza SGO_DATA.getAll por cálculo. CAD_USUARIOS tem duas leituras (com e sem as
// contas de representada). A memória guardava só a primeira e o aviso "A Brasmedical não recebe avisos: nenhuma conta ativa"
// aparecia com a conta de administrador ativa.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

test('memória da central: CAD_USUARIOS com as contas de representada não reaproveita a leitura sem elas', () => {
  const linhas = [{ ID: 'u1', PERFIL: 'ADMIN' }, { ID: 'r1', PERFIL: 'REPRESENTADA', REPRESENTADA_ID: 'bras' }];
  let leituras = 0;
  const ctx = vm.createContext({ SGO_DATA_REP_VISIVEL: false });
  ctx.SGO_DATA = { getAll(nome) { leituras++; return nome === 'CAD_USUARIOS' && ctx.SGO_DATA_REP_VISIVEL !== true ? linhas.filter((u) => u.PERFIL !== 'REPRESENTADA') : linhas.slice(); } };
  const fonte = fs.readFileSync(path.join(pasta, 'SGO_Alertas_Central.js'), 'utf8');
  const fn = fonte.match(/function Pend_comMemoria_\(fn\) \{[\s\S]*?\n\}/)[0];
  vm.runInContext(fn, ctx);
  const r = vm.runInContext(`Pend_comMemoria_(function () {
    var sem = SGO_DATA.getAll('CAD_USUARIOS').length;
    SGO_DATA_REP_VISIVEL = true; var com = SGO_DATA.getAll('CAD_USUARIOS').length; SGO_DATA_REP_VISIVEL = false;
    var sem2 = SGO_DATA.getAll('CAD_USUARIOS').length;
    SGO_DATA_REP_VISIVEL = true; var com2 = SGO_DATA.getAll('CAD_USUARIOS').length; SGO_DATA_REP_VISIVEL = false;
    return [sem, com, sem2, com2];
  })`, ctx);
  assert.deepEqual(Array.from(r), [1, 2, 1, 2]);
  assert.equal(leituras, 2, 'cada leitura uma vez só');
});
