// Integração Auvo (27/10/2026, decisão do dono): O.S. aberta no Auvo há mais de 1 ano sai das pendências de
// fechamento (lista da tela, relatório e central de pendências). No Auvo nada é apagado.
// Código real de SGO_Auvo_Pendencias.js num contexto isolado; o resto é simulado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');

function ambiente(linhas) {
  const ctx = vm.createContext({
    SGO_UTILS: { safe: (v) => (v === null || v === undefined ? '' : String(v)) },
    SGO_CFG: { SHEETS: { AUVO_PENDENCIAS: 'AUVO_PENDENCIAS' } },
    SGO_DATA: { getAll: () => linhas.map((l) => Object.assign({}, l)) },
    CertCal_garantirTabela_: () => {},
    Auvo_exigirAdmin_: () => {},
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) }
  });
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Auvo_Pendencias.js'), 'utf8'), ctx);
  return ctx;
}

const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString();

test('a busca no Auvo olha só o último ano', () => {
  const ctx = ambiente([]);
  assert.equal(vm.runInContext('AUVO_PEND_CFG.JANELA_DIAS', ctx), 365);
});

test('a lista da tela esconde a O.S. aberta há mais de 1 ano, mesmo antes da próxima atualização', () => {
  const ctx = ambiente([
    { AUVO_TASK_ID: 'nova', TASK_DATE: diasAtras(30), DIAS_ABERTA: 30, TEM_EVIDENCIA: 'SIM' },
    { AUVO_TASK_ID: 'quase', TASK_DATE: diasAtras(364), DIAS_ABERTA: 364, TEM_EVIDENCIA: 'NAO' },
    { AUVO_TASK_ID: 'velha', TASK_DATE: diasAtras(901), DIAS_ABERTA: 901, TEM_EVIDENCIA: 'SIM' },
    { AUVO_TASK_ID: 'sem-data', TASK_DATE: '', DIAS_ABERTA: '', TEM_EVIDENCIA: 'NAO' }
  ]);
  const r = ctx.Auvo_apiListarPendencias('s');
  assert.deepEqual(r.items.map((i) => i.AUVO_TASK_ID).sort(), ['nova', 'quase', 'sem-data']);
  assert.equal(r.total, 3);
  assert.equal(r.comEvidencia, 1);
});

test('relatório e central de pendências usam o mesmo corte', () => {
  for (const f of ['SGO_Auvo_Relatorio.js', 'SGO_Alertas_Central.js']) {
    assert.match(fs.readFileSync(path.join(base, f), 'utf8'), /Auvo_pendDentroDaJanela_\(p\)/, f);
  }
});
