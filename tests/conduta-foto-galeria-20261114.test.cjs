// Conduta — ocorrência no celular com foto da câmera OU da galeria (14/11/2026, dono: "em escolher imagem só abre a câmera").
// Página completa (Index.html com os include() resolvidos), 390 e 320 px: dois botões ("Tirar foto" com câmera, "Escolher da galeria" sem
// câmera); a foto da galeria vai no envio (apiUploadFoto + apiRegistrarOcorrencia com a fotoUrl); escolher uma limpa a outra.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/conduta-foto-galeria-20261114.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/conduta-foto-20261114/capturas');
// PNG 1x1 válido
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

test('ocorrência no celular: câmera e galeria, e a foto da galeria vai no registro', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320]) {
      const page = await browser.newPage({ viewport: { width: largura, height: 844 }, isMobile: true, hasTouch: true });
      const erros = [], chamadas = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { chamadas.push({ dialogo: d.message() }); d.accept().catch(() => {}); }); // o aviso pode chegar com a página já fechada
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        chamadas.push({ fn, args: JSON.parse(JSON.stringify(args)) });
        if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: { sessionId: 's1', email: 'teste@exemplo.com', nome: 'Teste', perfil: 'TECNICO' } } };
        if (fn === 'Conduta_apiDispatch') {
          const p = args[0] || {};
          if (p.fn === 'apiUploadFoto') return { ok: true, valor: { success: true, url: 'foto://ok' } };
          if (p.fn === 'apiRegistrarOcorrencia') return { ok: true, valor: { success: true, message: 'Ocorrência registrada.' } };
          return { ok: true, valor: { success: true } };
        }
        return { ok: true, valor: null };
      });
      await page.addInitScript(() => {
        try { sessionStorage.setItem('SGO_SESSION', 's1'); } catch (e) {}
        const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof renderMobileCondutaFormOcorrencia_ === 'function');
      // listas do formulário sem servidor: um colega e um tipo
      await page.evaluate(() => {
        mobileCondutaCarregarListasBase_ = function (cb) { cb(); };
        mobileCondutaOptionsColegas_ = function () { return '<option value="c1">Colega Teste</option>'; };
        mobileCondutaOptionsCatalogo_ = function () { return '<option value="T1">Tipo teste</option>'; };
        let c = document.getElementById('conteudo');
        if (!c) { c = document.createElement('div'); c.id = 'conteudo'; document.body.appendChild(c); }
        renderMobileCondutaFormOcorrencia_();
      });
      await page.locator('#mob_cond_foto_gal').waitFor({ state: 'attached' });
      // dois campos: câmera com capture, galeria sem capture
      assert.equal(await page.locator('#mob_cond_foto').getAttribute('capture'), 'environment');
      assert.equal(await page.locator('#mob_cond_foto_gal').getAttribute('capture'), null);
      // botões visíveis com os nomes (o portal troca o seletor nativo por botão com data-rotulo)
      await page.waitForFunction(() => document.querySelectorAll('.sgo-arquivo-btn').length >= 2);
      const rotulos = await page.locator('.sgo-arquivo-btn').allInnerTexts();
      assert.ok(rotulos.includes('Tirar foto') && rotulos.includes('Escolher da galeria'), rotulos.join(' | '));
      for (const r of ['Tirar foto', 'Escolher da galeria']) assert.ok((await page.locator('.sgo-arquivo-btn', { hasText: r }).boundingBox()).height >= 40, r + ' com toque grande');
      // escolhe pela câmera, depois pela galeria: a câmera é limpa e a prévia aparece
      await page.setInputFiles('#mob_cond_foto', { name: 'camera.png', mimeType: 'image/png', buffer: PNG });
      await page.setInputFiles('#mob_cond_foto_gal', { name: 'galeria.png', mimeType: 'image/png', buffer: PNG });
      assert.equal(await page.locator('#mob_cond_foto').evaluate((i) => i.files.length), 0, 'escolher da galeria limpa a câmera');
      assert.equal(await page.locator('#mob_cond_foto').evaluate((i) => i.closest('.sgo-arquivo').querySelector('.sgo-arquivo-nome').textContent), 'Nenhum arquivo escolhido', 'o nome da câmera some');
      await page.locator('#mob_cond_foto_preview img').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral');
      await page.screenshot({ path: path.join(saida, largura + '-ocorrencia-foto.png'), fullPage: true });
      // registra: a foto da galeria é enviada e a ocorrência leva a fotoUrl
      await page.fill('#mob_cond_descricao', 'Bancada sem identificação do equipamento em uso.');
      await page.evaluate(() => mobileCondutaSalvarOcorrencia_());
      await page.waitForFunction(() => true);
      for (let i = 0; i < 400 && !chamadas.some((c) => c.fn === 'Conduta_apiDispatch' && c.args[0].fn === 'apiRegistrarOcorrencia'); i++) await page.waitForTimeout(50);
      const up = chamadas.find((c) => c.fn === 'Conduta_apiDispatch' && c.args[0].fn === 'apiUploadFoto');
      const reg = chamadas.find((c) => c.fn === 'Conduta_apiDispatch' && c.args[0].fn === 'apiRegistrarOcorrencia');
      assert.ok(up && up.args[0].payload.base64, 'a foto da galeria foi enviada');
      assert.ok(reg, 'ocorrência registrada');
      assert.equal(reg.args[0].payload.fotoUrl, 'foto://ok');
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
