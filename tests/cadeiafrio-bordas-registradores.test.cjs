// Um arquivo por sensor: registradores ligados/desligados com instantes de diferença (caso real de 27/10/2026:
// DTL-11 parou às 13:14:20, os outros às 13:15:23 e 13:15:46). A última linha da referência não é "leitura
// faltando"; sai da linha do tempo (até duas por ponta). Diferenças maiores e buracos no meio continuam acusados.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ARQ = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db', 'SGO_CadeiaFrioRel_Parser.js');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(ARQ, 'utf8'), ctx);
const mesclar = ctx.CadeiaFrioRel_cfMesclarSeriesPorSensor_;

function serie(inicioIso, segDesvio, n) {
  const t0 = new Date(inicioIso).getTime() + segDesvio * 1000;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(t0 + i * 60000);
    return { tempoStr: d.toISOString(), tempoDate: d, temperaturas: [5 + (i % 3) * 0.1] };
  });
}
const nulos = (l, s) => l.filter(x => x.temperaturas[s] === null).length;

test('sensor desligado um minuto antes: a última linha sai e nenhuma leitura fica faltando', () => {
  const s1 = serie('2026-10-26T14:55:00Z', 23, 1521);
  const s2 = serie('2026-10-26T14:55:00Z', 46, 1521);
  const s3 = serie('2026-10-26T14:55:00Z', 20, 1520);
  const r = mesclar([s1, s2, s3]);
  assert.strictEqual(r.length, 1520);
  assert.deepStrictEqual([0, 1, 2].map(s => nulos(r, s)), [0, 0, 0]);
  assert.strictEqual(r._mesclagem.bordas.fim, 1);
  assert.strictEqual(r._mesclagem.bordas.fimTempos[0], s1[1520].tempoStr);
});

test('sensor que começa dois minutos depois: as duas primeiras linhas saem', () => {
  const s1 = serie('2026-10-26T14:55:00Z', 23, 100);
  const s2 = serie('2026-10-26T14:57:00Z', 46, 98);
  const r = mesclar([s1, s2]);
  assert.strictEqual(r._mesclagem.bordas.inicio, 2);
  assert.deepStrictEqual([0, 1].map(s => nulos(r, s)), [0, 0]);
});

test('sensor que para dez minutos antes continua com leituras faltando (a trava decide)', () => {
  const s1 = serie('2026-10-26T14:55:00Z', 23, 100);
  const s2 = serie('2026-10-26T14:55:00Z', 20, 90);
  const r = mesclar([s1, s2]);
  assert.strictEqual(r.length, 100);
  assert.strictEqual(r._mesclagem.bordas.fim, 0);
  assert.strictEqual(nulos(r, 1), 10);
});

test('buraco no meio não é borda: continua acusado', () => {
  const s1 = serie('2026-10-26T14:55:00Z', 23, 100);
  const s2 = serie('2026-10-26T14:55:00Z', 20, 100).filter((_, i) => i !== 50);
  const r = mesclar([s1, s2]);
  assert.strictEqual(r.length, 100);
  assert.strictEqual(nulos(r, 1), 1);
});
