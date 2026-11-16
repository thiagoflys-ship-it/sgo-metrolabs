// Roda toda a suíte tests/*.test.cjs numa fase (FASE=producao | candidato) e grava o placar por arquivo.
// Uso: node output/poderes-20261110/rodar-suite.cjs <fase> <arquivo-saida>
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const raiz = path.resolve(__dirname, '../..');
const fase = process.argv[2] || 'candidato', saida = process.argv[3];
const arquivos = fs.readdirSync(path.join(raiz, 'tests')).filter((f) => f.endsWith('.test.cjs') && f !== 'poderes-lote6.test.cjs').sort();
const linhas = [];
let tp = 0, tf = 0, arqFalha = 0;
for (const f of arquivos) {
  const r = spawnSync(process.execPath, ['--require', './output/poderes-20261110/fontes-antes-lote6.cjs', '--test', '--test-reporter=tap', 'tests/' + f],
    { cwd: raiz, env: Object.assign({}, process.env, { FASE: fase }), encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = Number((/^# pass (\d+)/m.exec(out) || [])[1] || 0), fail = Number((/^# fail (\d+)/m.exec(out) || [])[1] || 0);
  const falhas = [...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1].trim());
  tp += pass; tf += fail; if (r.status !== 0) arqFalha++;
  linhas.push(f + '\tsaida=' + r.status + '\tpass=' + pass + '\tfail=' + fail + (falhas.length ? '\tFALHAS: ' + falhas.join(' | ') : ''));
}
const cab = 'FASE=' + fase + ' em ' + new Date().toISOString() + '\narquivos=' + arquivos.length + ' arquivos_com_saida_nao_zero=' + arqFalha + ' pass=' + tp + ' fail=' + tf + '\n';
fs.writeFileSync(saida, cab + linhas.join('\n') + '\n');
console.log(cab);
