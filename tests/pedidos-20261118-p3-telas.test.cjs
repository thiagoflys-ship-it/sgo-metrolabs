'use strict';
// 18/11/2026 (pacote 3, item 9) — telas: Início com as prioridades do dia e a lista "Ver todas as pendências", e a ficha do chamado com a
// faixa "Visita reagendada", a 1366 e a 390 px, na página completa do SGO+ (Index.html com os include() resolvidos), código REAL da
// Assistência e da central de pendências, dados fictícios. Cenário: um chamado com o prazo estourado já REAGENDADO para quinta e um
// chamado P1 sem agenda, com o prazo estourado.
// ROTULO=antes (rodado contra a cópia de antes, cand27) guarda as capturas "antes-*" e confere que o reagendado ainda aparecia; o padrão
// (depois) confere que ele saiu do alerta e que o outro continua. Confere também: sem erro de JavaScript e sem rolagem lateral.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, abrirChamado, triarVisita, agendar } = require('./_assistencia_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const saida = process.env.CAPTURAS_P3 || path.join(__dirname, '../output/pedidos-20261118/p3/capturas');
const ROTULO = process.env.ROTULO === 'antes' ? 'antes' : 'depois';
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const htmlCompleto = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

function cenario() {
  const amb = ambiente({ extras: ['SGO_Inicio.js'] });
  const reag = abrirChamado(amb, { sintoma: 'Autoclave não completa o ciclo e apita no final' });    // P2: prazo terça 20/10 10h
  triarVisita(amb, reag.id);
  ok(agendar(amb, reag.id, '2026-10-20T09:00'));
  const p1 = abrirChamado(amb, { prioridade: 'P1', equipamentoId: 'eq2', sintoma: 'Lavadora parada com alarme de temperatura' });   // P1: 4 h úteis
  amb.mudar('2026-10-20T10:30:00-03:00');
  ok(agendar(amb, reag.id, '2026-10-22T14:00', { motivo: 'Cliente pediu outro dia: setor fechado para reforma' }));
  amb.mudar('2026-10-20T11:00:00-03:00');
  return { amb, reag, p1 };
}

async function abrirPagina(browser, amb, largura) {
  const celular = largura < 500;
  const page = await browser.newPage(Object.assign({ viewport: { width: largura, height: celular ? 844 : 900 } }, celular ? { isMobile: true, hasTouch: true } : {}));
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_gil' }, amb.sessoes.s_gil) } };
    let v;
    if (fn === 'Inicio_apiPendencias' || fn === 'SGO_Pendencias_apiListar') v = amb.ctx[fn].apply(null, args);
    else if (fn === 'Assistencia_api') v = amb.api(args[0], args[1], args[2]);
    if (v === undefined) return { ok: false, erro: 'indisponível no ensaio: ' + fn };
    return { ok: true, valor: JSON.parse(JSON.stringify(v)) };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_gil'); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}

test('Início e ficha do chamado (' + ROTULO + ') a 1366 e 390 px: chamado reagendado ' + (ROTULO === 'antes' ? 'ainda aparece' : 'fora') + ' do alerta de prazo',
  { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      const { amb, reag, p1 } = cenario();
      const prazos = amb.ctx.Inicio_apiPendencias('s_gil').pendencias.filter((i) => i.tipo === 'ast_sla');
      const ids = prazos.map((i) => i.id).sort();
      if (ROTULO === 'antes') assert.deepEqual(ids, ['AST:SLA:' + p1.id, 'AST:SLA:' + reag.id].sort(), 'antes: o reagendado continuava no alerta');
      else assert.deepEqual(ids, ['AST:SLA:' + p1.id], 'depois: só o chamado sem agenda');
      const { page, erros } = await abrirPagina(browser, amb, largura);
      await page.locator('#inicioFaixa .inicio-pend').first().waitFor({ timeout: 20000 });
      await page.screenshot({ path: path.join(saida, ROTULO + '-' + largura + '-inicio-prioridades.png') });
      await page.evaluate(() => Inicio_abrirTodas_('ast_sla'));
      await page.locator('#inicioTodasPainel').waitFor({ timeout: 10000 });
      const texto = await page.locator('#inicioTodasPainel').innerText();
      assert.match(texto, /Prazo estourado: chamado/);
      assert.equal(/Cliente pediu outro dia|CH-2026-0001/.test(texto), ROTULO === 'antes', 'o chamado reagendado (CH-2026-0001) ' + (ROTULO === 'antes' ? 'aparecia' : 'não aparece'));
      assert.ok(await semRolagem(page), 'Início sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, ROTULO + '-' + largura + '-inicio-prazos.png') });
      await page.evaluate(() => Inicio_fecharTodas_());
      if (ROTULO === 'depois') {
        await page.evaluate(() => abrir('assistencia'));
        await page.waitForFunction(() => typeof At_abrirChamado_ === 'function' && typeof AT !== 'undefined' && AT.ini, null, { timeout: 15000 }).catch(() => {});
        await page.evaluate((id) => At_abrirChamado_(id), reag.id);
        const faixa = page.locator('.at-faixa.aviso', { hasText: 'Visita reagendada para 22/10/2026 14:00' });
        await faixa.waitFor({ timeout: 15000 });
        assert.match(await faixa.innerText(), /Prazo estourado em 20\/10\/2026 10:00\. O prazo do contrato continua registrado no histórico e nos indicadores/);
        await faixa.scrollIntoViewIfNeeded();
        assert.ok(await semRolagem(page), 'ficha sem rolagem lateral em ' + largura);
        await page.screenshot({ path: path.join(saida, 'depois-' + largura + '-ficha-visita-reagendada.png') });
      }
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
