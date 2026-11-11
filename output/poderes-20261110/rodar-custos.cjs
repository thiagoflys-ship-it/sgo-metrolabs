// Roda tests/comercial*.test.cjs e poderes-lote0.test.cjs (e o de brechas de preço, se existir) numa fase e grava o placar.
// Uso: node output/poderes-20261110/rodar-comercial.cjs <fase> <arquivo-saida>
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const raiz = path.resolve(__dirname, '../..');
const fase = process.argv[2] || 'candidato', saida = process.argv[3];
const arquivos = fs.readdirSync(path.join(raiz, 'tests')).filter((f) => /^(comercial.*|compras.*|poderes-lote0)\.test\.cjs$/.test(f)).sort();
const linhas = []; let tp = 0, tf = 0;
for (const f of arquivos) {
  const r = spawnSync(process.execPath, ['--require', './output/poderes-20261110/fontes-locais.cjs', '--test', '--test-reporter=tap', 'tests/' + f],
    { cwd: raiz, env: Object.assign({}, process.env, { FASE: fase }), encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = Number((/^# pass (\d+)/m.exec(out) || [])[1] || 0), fail = Number((/^# fail (\d+)/m.exec(out) || [])[1] || 0);
  const falhas = [...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1].trim());
  tp += pass; tf += fail;
  linhas.push(f + '\tsaida=' + r.status + '\tpass=' + pass + '\tfail=' + fail + (falhas.length ? '\tFALHAS: ' + falhas.join(' | ') : ''));
}
const cab = 'FASE=' + fase + ' em ' + new Date().toISOString() + '\narquivos=' + arquivos.length + ' pass=' + tp + ' fail=' + tf + '\n';
fs.writeFileSync(saida, cab + linhas.join('\n') + '\n');
console.log(cab + linhas.join('\n'));
