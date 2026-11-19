// Captura da tela /_sgo/segredos nova (servidor/novo/segredos.js) com o servidor simulado: só nomes, nenhum valor. Uso: node capturas-segredos.cjs
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
(async () => {
  const js = fs.readFileSync(path.join(__dirname, 'servidor/novo/segredos.js'), 'utf8');
  const tmp = path.join(require('os').tmpdir(), 'seg-cap-' + Date.now() + '.mjs');
  fs.writeFileSync(tmp, js.replace(/^import .*$/m, 'const gravarProp = async () => {};'));
  const m = await import('file:///' + tmp.split(path.sep).join('/'));
  let html = ''; m.rotasSegredos({ get: (_u, f) => { f(null, { type: () => ({ header: () => ({ send: (p) => { html = p; } }) }) }); }, post: () => {} }, null, null);
  const config = { OMIE_APP_KEY: '18/11/2026 10:00', OMIE_APP_SECRET: '18/11/2026 10:00', GEMINI_API_KEY: '10/11/2026 09:00', SMTP_SENHA: '01/11/2026 08:00' };
  const itens = m.SEGREDOS.map((s) => Object.assign({}, s, { configurado: !!config[s.chave], em: config[s.chave] || '' }));
  const b = await chromium.launch(); const erros = [];
  for (const [larg, hash, nome] of [[1366, '', 'todas'], [1366, '#sicredi', 'sicredi'], [390, '#bancos', 'bancos']]) {
    const p = await b.newPage({ viewport: { width: larg, height: 900 } }); p.on('pageerror', (e) => erros.push(e.message));
    await p.route('**/*', (r) => r.request().method() === 'POST' ? r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, itens }) }) : r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await p.goto('http://seg.ensaio.test/_sgo/segredos' + hash); await p.waitForSelector('details.grupo');
    if (hash === '#sicredi') await p.evaluate(() => document.querySelectorAll('details.grupo').forEach((d) => { d.open = true; }));
    const lat = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await p.screenshot({ path: path.join(__dirname, 'capturas', larg + '-10-chaves-' + nome + '.png'), fullPage: hash === '#sicredi' ? false : true });
    console.log(nome, 'grupos', await p.locator('details.grupo').count(), 'textarea', await p.locator('textarea').count(), 'pfx', await p.locator('input[data-tipo=pfx]').count(), 'semRolagem', lat);
    await p.close();
  }
  await b.close(); fs.unlinkSync(tmp); console.log('erros', JSON.stringify(erros));
})();
