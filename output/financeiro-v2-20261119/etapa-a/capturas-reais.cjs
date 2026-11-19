// Capturas com DADOS REAIS (19/11/2026): a resposta do painel e de Empresas e bancos lida em produção, só leitura, num ensaio no
// contêiner (função de ensaio ZZ_FinV2_painel, apagada depois). A página é a do SGO+ (cand35) com o servidor simulado para o resto.
// Uso (na raiz do repositório): DEST=output/financeiro-20261116/cand35 REAL=<ensaio-real.json> node --require ./output/lote-20261111n/fontes.cjs output/financeiro-v2-20261119/etapa-a/capturas-reais.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = path.join(__dirname, '../../../tests/');
const { montarA } = require(T + '_financeiro_onda_a.cjs');
const S = require(T + '_financeiro_simulado.cjs');
const { chromium } = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const real = JSON.parse(fs.readFileSync(process.env.REAL, 'utf8'));
const saida = path.join(__dirname, 'capturas');
(async () => {
  const a = montarA({ foto: true, extras: ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Espelho.js', 'SGO_Financeiro_Contas.js', 'SGO_Financeiro_V2.js'] });
  const b = await chromium.launch(); const erros = [];
  for (const larg of [1366, 390]) for (const [login, visao, nome] of [['admin', 'fin_painel', 'real-01-painel-diretoria'], ['wanessa', 'fin_painel', 'real-02-painel-meu-dia'], ['admin', 'fin_empresas', 'real-03-empresas-e-bancos']]) {
    const page = await b.newPage({ viewport: { width: larg, height: larg < 500 ? 844 : 900 } });
    page.on('pageerror', (e) => erros.push(nome + ': ' + e.message));
    const HTML = S.htmlCompleto();
    await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
    await page.exposeFunction('qaRun', (fn, args) => {
      if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, a.sessoes['s_' + login]) } };
      if (fn === 'Fin_apiPainel') { const p = JSON.parse(JSON.stringify(real.painel)); p.papel = { diretoria: login === 'admin', nome: login === 'admin' ? 'DONO' : 'WANESSA' }; p.aprovacoes.podeDecidir = login === 'admin'; return { ok: true, valor: p }; }
      if (fn === 'Fin_apiEmpresas') { const e = JSON.parse(JSON.stringify(real.empresas)); e.podeEditar = login === 'admin'; return { ok: true, valor: e }; }
      if (/^Omie_apiIniciar$/.test(fn)) return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) };
      return { ok: false, erro: 'fora do ensaio: ' + fn };
    });
    await page.addInitScript((lg) => { try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); localStorage.clear(); } catch (e) {} const c = (ok, f) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (g) => c(g, f) : k === 'withFailureHandler' ? (g) => c(ok, g) : k === 'withUserObject' ? () => c(ok, f) : (...x) => { window.qaRun(String(k), x).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (f) f(new Error(r.erro)); }); } }); window.google = { script: { run: c(null, null) } }; }, login);
    await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { const x = document.getElementById('menu-btn-omie'); return x && x.style.display === ''; }, null, { timeout: 15000 });
    await page.evaluate((m) => abrir(m), visao);
    await page.waitForSelector(visao === 'fin_empresas' ? '#fvEmp .fv-emp-cartao' : '#fvPainel .fv-caixa', { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const c = document.getElementById('conteudo'); c.insertAdjacentHTML('afterbegin', '<div style="background:#1E4F7A;color:#fff;font:700 12px/1.6 sans-serif;padding:2px 10px;border-radius:4px;display:inline-block;margin:0 0 6px">DADOS REAIS · ensaio só leitura em produção, 19/11/2026 13:21</div>'); });
    const lat = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await page.screenshot({ path: path.join(saida, larg + '-' + nome + '.png'), fullPage: true });
    console.log(larg, nome, 'sem rolagem lateral:', lat);
    await page.close();
  }
  await b.close(); console.log('erros', JSON.stringify(erros));
})();
