// Rota própria do vídeo da Representação (11/11/2026): POST /api/representacao/midia do servidor próprio (sgo_servidor,
// src/servicos/midiaRepresentacao.ts, compilado em dist/servicos/midiaRepresentacao.js) e a faixa de bytes (Range) do player.
// Fastify real com as dependências simuladas (sessão, legado, gravação). Roda quando DEST aponta para o legado de um pacote do
// servidor (o dist fica ao lado: <DEST>/../dist) e o Fastify do sgo_servidor está instalado; senão, fica de fora.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const dist = process.env.DEST ? path.join(process.env.DEST, '..', 'dist', 'servicos', 'midiaRepresentacao.js') : '';
const fastifyDir = path.join(__dirname, '..', '..', 'sgo_servidor', 'node_modules', 'fastify');
const pular = !dist || !fs.existsSync(dist) || !fs.existsSync(fastifyDir) ? 'sem o dist do servidor (DEST) ou sem o Fastify do sgo_servidor' : false;

async function montar(opc) {
  const m = await import(pathToFileURL(dist).href);
  const Fastify = require(fastifyDir);
  const app = Fastify({ logger: false, bodyLimit: 72 * 1024 * 1024 });
  const chamadas = [], gravados = [], descartados = [];
  m.rotasMidiaRepresentacao(app, {
    sessao: async (req) => (opc.sessao === undefined ? { id: 'sessao-ok' } : opc.sessao),
    executar: async (fn, args) => { chamadas.push({ fn, args }); return opc.legado(fn, args); },
    gravar: async (d) => { gravados.push(d); return { id: 'arq1' }; },
    descartar: async (id) => { descartados.push(id); },
    log: () => {},
  });
  await app.ready();
  return { app, m, chamadas, gravados, descartados };
}
const cab = (extra) => Object.assign({ 'content-type': 'video/mp4', 'x-sgo-midia': '1', 'x-midia-ref-tipo': 'CHAMADO', 'x-midia-ref-id': 'ch1', 'x-midia-nome': encodeURIComponent('vídeo do visor.mp4') }, extra || {});
const okLegado = (fn) => fn === 'Representacao_midiaPreparar_' ? { ok: true, valor: { ok: true, pastaId: 'pasta1', nome: 'vídeo do visor.mp4', refTipo: 'CHAMADO', refId: 'ch1' } }
  : { ok: true, valor: { ok: true, item: { id: 'a1' }, message: 'Vídeo anexado no chamado CH-2026-0001.' } };

test('rota do vídeo: grava o arquivo cru fora do worker e registra no legado, com a sessão do cookie', { skip: pular }, async () => {
  const k = await montar({ legado: okLegado });
  const corpo = Buffer.alloc(3 * 1024 * 1024, 7);
  const r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab({ 'x-midia-legenda': encodeURIComponent('Alarme E12') }), payload: corpo });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().ok, true);
  assert.equal(k.gravados.length, 1);
  assert.equal(Buffer.from(k.gravados[0].base64, 'base64').length, corpo.length);
  assert.equal(k.gravados[0].pasta_id, 'pasta1');
  const prep = k.chamadas[0], reg = k.chamadas[1];
  assert.equal(prep.fn, 'Representacao_midiaPreparar_');
  assert.equal(prep.args[0], 'sessao-ok');
  assert.equal(prep.args[1].bytes, corpo.length);
  assert.equal(prep.args[1].nome, 'vídeo do visor.mp4');
  assert.equal(prep.args[1].legenda, 'Alarme E12');
  assert.equal(reg.fn, 'Representacao_midiaRegistrar_');
  assert.equal(reg.args[1].arquivoId, 'arq1');
  assert.match(reg.args[1].sha256, /^[0-9a-f]{64}$/);
  await k.app.close();
});

test('rota do vídeo: recusa sem o cabeçalho da tela, sem sessão, com troca de senha pendente, formato errado e tamanho acima do limite', { skip: pular }, async () => {
  let k = await montar({ legado: okLegado });
  let r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab({ 'x-sgo-midia': '' }), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 400);
  r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab({ 'content-type': 'video/x-msvideo' }), payload: Buffer.alloc(10) });
  assert.ok([415].includes(r.statusCode), r.body);
  r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab({ 'content-length': String(101 * 1024 * 1024) }), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 413);
  assert.match(r.json().message, /limite é de 100 MB/);
  assert.equal(k.gravados.length, 0);
  await k.app.close();
  k = await montar({ legado: okLegado, sessao: null });
  r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab(), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 401);
  await k.app.close();
  k = await montar({ legado: okLegado, sessao: { id: 's', pendente: true } });
  r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab(), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 403);
  await k.app.close();
});

test('rota do vídeo: o legado recusa (escopo) -> nada gravado; o registro falha -> o arquivo vai para a lixeira', { skip: pular }, async () => {
  let k = await montar({ legado: (fn) => ({ ok: true, valor: { ok: false, status: 404, message: 'Não encontramos este registro na área da sua empresa.' } }) });
  let r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab(), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 404);
  assert.equal(k.gravados.length, 0);
  await k.app.close();
  k = await montar({ legado: (fn) => fn === 'Representacao_midiaPreparar_' ? okLegado(fn) : { ok: true, valor: { ok: false, status: 409, message: 'Não foi possível enviar: o chamado está encerrado.' } } });
  r = await k.app.inject({ method: 'POST', url: '/api/representacao/midia', headers: cab(), payload: Buffer.alloc(10) });
  assert.equal(r.statusCode, 409);
  assert.deepEqual(k.descartados, ['arq1']);
  await k.app.close();
});

test('faixa de bytes (Range) para o player de vídeo', { skip: pular }, async () => {
  const { faixaPedida } = await import(pathToFileURL(dist).href);
  assert.deepEqual(faixaPedida('bytes=0-', 1000), { ini: 0, fim: 999 });
  assert.deepEqual(faixaPedida('bytes=100-199', 1000), { ini: 100, fim: 199 });
  assert.deepEqual(faixaPedida('bytes=900-5000', 1000), { ini: 900, fim: 999 });
  assert.deepEqual(faixaPedida('bytes=-100', 1000), { ini: 900, fim: 999 });
  assert.equal(faixaPedida('bytes=1000-', 1000), 'fora');
  assert.equal(faixaPedida('', 1000), null);
  assert.equal(faixaPedida('bytes=0-1,5-9', 1000), null);
});
