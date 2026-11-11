// Roda os testes de qualificação (autoclave/lavadora/cadeiafrio/estufa/baixatemp/qualificacao/relatorios-qualificacao/seguranca/simulacao) numa fase.
// Uso: node output/poderes-20261110/rodar-qualif.cjs <fase> <arquivo-saida>
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const raiz = path.resolve(__dirname, '../..'); const preload = process.env.PRELOAD || './output/poderes-20261110/fontes-locais.cjs';
const fase = process.argv[2] || 'candidato', saida = process.argv[3];
const re = /^(autoclave|lavadora|cadeiafrio|estufa|baixatemp|qualificacao|relatorios-qualificacao|seguranca-acesso|qualif-)/;
const arquivos = fs.readdirSync(path.join(raiz, process.env.TESTS_DIR || 'tests')).filter((f) => f.endsWith('.test.cjs') && (process.env.TODOS === '1' || re.test(f))).sort();
const linhas = []; let tp = 0, tf = 0;
for (const f of arquivos) {
  const r = spawnSync(process.execPath, ['--require', preload, '--test', '--test-reporter=tap', (process.env.TESTS_DIR || 'tests') + '/' + f],
    { cwd: raiz, env: Object.assign({}, process.env, { FASE: fase }), encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = Number((/^# pass (\d+)/m.exec(out) || [])[1] || 0), fail = Number((/^# fail (\d+)/m.exec(out) || [])[1] || 0);
  const falhas = [...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1].trim());
  tp += pass; tf += fail;
  linhas.push(f + '\tsaida=' + r.status + '\tpass=' + pass + '\tfail=' + fail + (falhas.length ? '\tFALHAS: ' + falhas.join(' | ') : ''));
}
const cab = 'FASE=' + fase + ' em ' + new Date().toISOString() + '\narquivos=' + arquivos.length + ' pass=' + tp + ' fail=' + tf + '\n';
fs.writeFileSync(saida, cab + linhas.join('\n') + '\n'); console.log(cab);
