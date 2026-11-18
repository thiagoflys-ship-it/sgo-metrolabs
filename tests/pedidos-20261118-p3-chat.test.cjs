'use strict';
// 18/11/2026 (pacote 3, item 10, pedido do Matheus): "a aba de bate-papo poderia ficar mais visível para, quando houver novas mensagens,
// ficar visível para não demorarmos a responder aos colegas". Confere: o botão do bate-papo no topo (computador e celular) fica destacado
// com o número de não lidas e o texto "N novas", pulsa quando o número sobe, o título da aba mostra "(n)", a notificação do navegador é
// opcional e vem desligada (só depois de a pessoa ligar e o navegador autorizar), o som de mensagem continua desligado por padrão e a
// ordem cronológica da conversa (09/11) continua. Núcleo REAL do bate-papo (Comunicacao.js) e página completa do SGO+ (Index.html).
// Só dados de teste; nada sai para a rede. Capturas em output/pedidos-20261118/p3/capturas (ou CAPTURAS_P3).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { cenario } = require('./_p3_chat_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const saida = process.env.CAPTURAS_P3 || path.join(__dirname, '../output/pedidos-20261118/p3/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');

test('topo: estado do botão do bate-papo (destaque, texto "N novas", pulso só quando o número sobe)', () => {
  const core = ler('JS_Core.html');
  const fonte = core.match(/window\.Topo_estadoChat_ = function \(n, antes\) \{[\s\S]*?\n  \};/)[0];
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(fonte, ctx);
  const e = (n, a) => JSON.parse(JSON.stringify(ctx.window.Topo_estadoChat_(n, a)));
  assert.deepEqual(e('', 0), { qtd: 0, destacar: false, chegou: false, texto: '', titulo: 'Bate-papo' });
  assert.deepEqual(e('1', 0), { qtd: 1, destacar: true, chegou: true, texto: ' · 1 nova', titulo: 'Bate-papo: 1 novidade não lida (mensagens, avisos e comunicados)' });
  assert.equal(e('3', 3).chegou, false, 'mesmo número: não pulsa de novo');
  assert.equal(e('2', 3).chegou, false, 'leu algumas: não pulsa');
  assert.equal(e('99+', 99).texto, ' · 99+ novas');
  assert.equal(e('99+', 99).chegou, true);
  // CSS do destaque e do pulso, com a alternativa sem animação
  const css = ler('UI_Estilos.html');
  assert.match(css, /#topoBtnChat\.topo-chat-novo, #mobileBtnChat\.topo-chat-novo \{[^}]*background: var\(--bc-danger-bg/);
  assert.match(css, /\.topo-chat-chegou \{ animation: topoChatPulso 1\.1s ease-out 3; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.topo-chat-chegou \{ animation: none;/);
  assert.match(ler('Index.html'), /id="topoBtnChat"[^>]*>.*Bate-papo<span class="topo-novas"><\/span> <span class="topo-qt" hidden><\/span><\/button>/);
});

test('balão: notificação do navegador desligada por padrão; som de mensagem continua desligado por padrão; ordem cronológica preservada', () => {
  const w = ler('ComunicacaoWidget.html');
  assert.match(w, /function notifLigada\(\) \{ return lsGet\("comw_notif"\) === "1" && notifSuportada\(\) && window\.Notification\.permission === "granted"; \}/);
  // a permissão só é pedida dentro de trocarNotif (quando a pessoa marca a caixa), nunca ao carregar
  const pedidos = w.split('requestPermission').length - 1;
  assert.equal(pedidos, 1);
  assert.ok(w.indexOf('requestPermission') > w.indexOf('function trocarNotif('), 'só na troca feita pela pessoa');
  assert.match(w, /function modoSom\(\) \{ return lsGet\("comw_som"\) \|\| "critica"; \}/, 'padrão: só avisos críticos tocam');
  assert.match(w, /critica: "só avisos críticos \(mensagens sem som\)"/);
  assert.match(w, /function ordenarMsgs\(lista\)/, 'ordem cronológica (09/11)');
  assert.match(w, /<h3>Mensagem nova<\/h3>/, 'ajuda do balão explica o destaque e as preferências');
  assert.doesNotMatch(w, /SGO_NAV/);
  // o RH360 tem cópia própria do balão: nada daqui foi para lá
  assert.ok(!fs.existsSync(path.join(PASTA, 'RH_ComunicacaoWidget.html')) || !/comw_notif/.test(ler('RH_ComunicacaoWidget.html')));
});

// ---------------- página completa ----------------
const htmlCompleto = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function abrirPagina(browser, c, largura) {
  const celular = largura < 500;
  const page = await browser.newPage(Object.assign({ viewport: { width: largura, height: celular ? 844 : 900 } }, celular ? { isMobile: true, hasTouch: true } : {}));
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: { sessionId: 's_ana', userId: 'u-ana', usuario: 'ana.t', nome: 'Ana Teste', perfil: 'TECNICO' } } };
    if (fn === 'comApi') return { ok: true, valor: JSON.parse(JSON.stringify(c.s.comApi('S-ana.t', args[1], args[2] || {}))) };
    if (fn === 'comImagemApi') return { ok: true, valor: JSON.parse(JSON.stringify(c.s.comImagemApi('S-ana.t', args[1], args[2] || {}))) };
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_ana'); } catch (e) {}
    // notificação do navegador simulada: guarda o que seria mostrado; a permissão começa "default" (nunca pedida)
    window.__notifs = [];
    window.Notification = function (t, o) { window.__notifs.push({ titulo: t, corpo: o && o.body }); this.close = function () {}; };
    window.Notification.permission = 'default';
    window.Notification.requestPermission = function (cb) { window.Notification.permission = 'granted'; if (cb) cb('granted'); return Promise.resolve('granted'); };
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}

test('página completa a 1366 e 390 px: não lidas em destaque no topo, "(n)" no título, pulso ao chegar, notificação só depois de ligar, conversa em ordem',
  { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      const c = cenario();
      const conv = c.api('bia.t', 'abrirDireta', { pessoa_id: c.pessoa('ana.t') }).conversa.conversa_id;
      c.api('bia.t', 'enviar', { conversa_id: conv, texto: 'Bom dia, Ana. O chamado da autoclave foi reagendado para quinta.' });
      c.api('bia.t', 'enviar', { conversa_id: conv, texto: 'Consegue confirmar com o cliente o horário das 14h?' });
      const { page, erros } = await abrirPagina(browser, c, largura);
      const id = largura < 500 ? '#mobileBtnChat' : '#topoBtnChat';
      await page.waitForFunction((s) => { const b = document.querySelector(s); return b && !b.hidden && b.classList.contains('topo-chat-novo'); }, id, { timeout: 20000 });
      assert.equal((await page.locator(id + ' .topo-qt').innerText()).trim(), '2');
      if (largura > 500) assert.equal((await page.locator('#topoBtnChat .topo-novas').innerText()).trim(), '· 2 novas');
      assert.match(await page.title(), /^\(2\) /, 'título da aba com o número');
      assert.match(await page.locator(id).getAttribute('aria-label'), /2 novidades não lidas/);
      assert.equal(await page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundColor, id), 'rgb(251, 235, 232)', 'fundo de destaque');
      assert.deepEqual(await page.evaluate(() => window.__notifs), [], 'sem notificação do navegador antes de a pessoa ligar');
      assert.equal(await page.evaluate(() => window.Notification.permission), 'default', 'a permissão não é pedida sozinha');
      await page.screenshot({ path: path.join(saida, largura + '-chat-topo-nao-lidas.png') });
      // chega mais uma: o número sobe e o botão pulsa
      c.api('bia.t', 'enviar', { conversa_id: conv, texto: 'Obrigada!' });
      await page.evaluate(() => window.ComunicacaoWidget.atualizar());
      await page.waitForFunction((s) => document.querySelector(s + ' .topo-qt').textContent.trim() === '3' && document.querySelector(s).classList.contains('topo-chat-chegou'), id, { timeout: 10000 });
      assert.match(await page.title(), /^\(3\) /);
      await page.screenshot({ path: path.join(saida, largura + '-chat-topo-chegou.png') });
      // abre o bate-papo: a conversa com as não lidas, na ordem em que foram enviadas
      await page.locator(id).click();
      await page.locator('.comw-painel:not([hidden]) .comw-item.comw-novo').first().waitFor({ timeout: 10000 });
      await page.screenshot({ path: path.join(saida, largura + '-chat-lista-nao-lidas.png') });
      await page.locator('.comw-item.comw-novo').first().click();
      await page.waitForFunction(() => document.querySelectorAll('.comw-msg').length >= 3, null, { timeout: 10000 });
      const textos = await page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.comw-msg .comw-txt'), (e) => e.textContent.trim()));
      assert.deepEqual(textos.slice(-3), ['Bom dia, Ana. O chamado da autoclave foi reagendado para quinta.', 'Consegue confirmar com o cliente o horário das 14h?', 'Obrigada!'], 'ordem cronológica');
      await page.waitForFunction((s) => !document.querySelector(s).classList.contains('topo-chat-novo'), id, { timeout: 10000 });
      assert.doesNotMatch(await page.title(), /^\(\d/, 'lidas: o número sai do título');
      // preferências: liga a notificação do navegador (pede a permissão só agora)
      await page.locator('.comw-painel button[data-acao="preferencias"]').click();
      await page.locator('#comw-notif').waitFor();
      assert.equal(await page.locator('#comw-notif').isChecked(), false, 'desligada por padrão');
      await page.screenshot({ path: path.join(saida, largura + '-chat-preferencias.png') });
      await page.locator('#comw-notif').check();
      await page.waitForFunction(() => { try { return localStorage.getItem('comw_notif') === '1'; } catch (e) { return false; } }, null, { timeout: 5000 });
      assert.match(await page.locator('.comw-painel .comw-resumo[role=status]').innerText(), /Notificação ligada neste aparelho/);
      // fecha o painel; nova mensagem: aparece a notificação do navegador (com o painel fechado)
      await page.keyboard.press('Escape');
      c.api('bia.t', 'enviar', { conversa_id: conv, texto: 'Confirmado com o cliente.' });
      await page.evaluate(() => window.ComunicacaoWidget.atualizar());
      await page.waitForFunction(() => window.__notifs.length > 0, null, { timeout: 10000 });
      const n = await page.evaluate(() => window.__notifs);
      assert.match(n[0].titulo, /Bia Teste/);
      assert.equal(n[0].corpo, 'Confirmado com o cliente.');
      assert.ok(await semRolagem(page), 'sem rolagem lateral em ' + largura);
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
