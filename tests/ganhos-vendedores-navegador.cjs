// Ganhos dos vendedores (12/11/2026) no navegador, na PÁGINA COMPLETA (Index.html com todos os include() resolvidos, como o
// servidor monta). O google.script.run da página fala com o ambiente de teste (tests/_ganhos_ambiente.cjs: código real do SGO+);
// nada sai para a rede (a biblioteca de gráficos do CDN fica bloqueada: vale a troca pelas barras simples). Fluxo pela tela:
// a Wanessa cadastra o contrato da Vera pelo modelo da Mônica e lança dois recebimentos (busca da proposta); a Vera, no celular,
// vê o painel, pede a avaliação (regras, sem chave) e confere outubro; a Wanessa fecha (confirmação da casca); a Dora aprova;
// a Wanessa registra o pagamento; a Dora vê o comparativo. 1366 e 390 px, sem erro de JavaScript, sem janela do navegador
// (alert/confirm/prompt) e sem rolagem lateral. Capturas em output/ganhos-vendedores-20261112/capturas.
// Uso: DEST=<legado> node --require output/lote-20261111n/fontes.cjs tests/ganhos-vendedores-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambiente, PASTA } = require('./_ganhos_ambiente.cjs');

const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/ganhos-vendedores-20261112/capturas');
fs.mkdirSync(saida, { recursive: true });
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'))
  // o que sobra de template do servidor (ex.: SGO_VERSAO_TELAS_PAGINA em UI_Estilos.html) vira null, como sem a versão das telas
  .replace(/<\?!=[\s\S]*?\?>/g, 'null');
const API = ['GanhosVendedores_api'];

async function abrirPagina(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador aberta: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (API.includes(fn)) return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) };
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((sid) => {
    try { sessionStorage.setItem('SGO_SESSION', sid); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, 's_' + login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-ganhos_vendedores'); return b && b.style.display === ''; }, null, { timeout: 10000 });
  await page.evaluate(() => abrir('ganhos_vendedores'));
  await page.locator('#gvAbas .vg-aba').first().waitFor({ timeout: 10000 });
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) { await page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true }); }
async function msg(page, texto) { await page.locator('#gvMsg', { hasText: texto }).first().waitFor({ timeout: 10000 }); }
async function confirmar(page) { await page.locator('#fsPergunta button', { hasText: 'Confirmar' }).click(); }
async function mes(page, comp) { await page.fill('#gvComp', comp); await page.locator('#gvComp').dispatchEvent('change'); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const a = ambiente();
  try {
    // 1. Wanessa (Financeiro) no computador: contrato pelo modelo da Mônica e dois recebimentos de outubro
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      assert.equal(await page.locator('#menu-secao-ganhos').isVisible(), true);
      await page.getByRole('tab', { name: 'Contratos' }).click();
      await page.locator('[data-gv="modelo"]').click();
      await msg(page, 'Faixas do modelo preenchidas');
      assert.equal(await page.inputValue('#gvFxAte_0'), '30.000,00');
      assert.equal(await page.inputValue('#gvFxPct_3'), '5');
      await page.fill('#gvSimValor', '50.000,00'); await page.locator('#gvSimValor').dispatchEvent('change');
      assert.match(await page.locator('#gvSim').innerText(), /Faixa 2 \(3%\): comissão de R\$ 1\.500,00/);
      await page.selectOption('#gvCtVend', 'u_ven');
      await page.fill('#gvCtVig', '2026-01');
      await page.locator('[data-gv="gravarContrato"]').click();
      await msg(page, 'Contrato gravado para VERA VENDEDORA TESTE');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-01-contratos');
      await page.getByRole('tab', { name: 'Recebimentos' }).click();
      for (const [data, valor, doc] of [['2026-10-05', '20.000,00', 'NF 1001'], ['2026-10-20', '30.000,00', 'NF 1002']]) {
        await page.fill('#gvBusca', 'beta');
        await page.locator('[data-gv="buscarProp"]').click();
        await page.locator('[data-gv="escolherProp"]', { hasText: 'PROP-2026-0002' }).click();
        await page.locator('.vg-faixa', { hasText: 'Proposta escolhida' }).waitFor();
        await page.fill('#gvRecData', data); await page.fill('#gvRecValor', valor); await page.fill('#gvRecDoc', doc);
        await page.locator('[data-gv="lancar"]').click();
        await msg(page, 'Recebimento lançado: R$ ' + valor);
      }
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-02-recebimentos');
      assert.deepEqual(erros, []); checks.push('Financeiro: contrato pelo modelo da Mônica (simulador 50.000,00 -> 3% -> 1.500,00) e recebimentos pela busca da proposta');
      await page.close();
    }
    // 2. Vera (vendedora) no celular: painel, avaliação por regras e conferência de outubro
    {
      const { page, erros } = await abrirPagina(browser, a, 'vera', 390);
      assert.equal(await page.locator('#gvVend').count(), 0, 'vendedor não escolhe outro vendedor');
      await page.locator('.gv-card', { hasText: 'Comissão do mês' }).waitFor();
      assert.match(await page.locator('.gv-card', { hasText: 'Recebido no mês' }).innerText(), /R\$ 50\.000,00/);
      assert.match(await page.locator('.gv-card', { hasText: 'Comissão do mês' }).innerText(), /R\$ 1\.500,00/);
      assert.match(await page.locator('.gv-card', { hasText: 'Falta para a próxima faixa' }).innerText(), /R\$ 10\.000,01/);
      await page.locator('[data-gv="ia"]').click();
      await page.locator('#gvIa .gv-ia-txt').waitFor();
      assert.match(await page.locator('#gvIa').innerText(), /Análise pelas regras do sistema/);
      await page.locator('.gv-barras').waitFor({ timeout: 8000 });
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-01-painel-vendedora');
      await page.getByRole('tab', { name: /Fechamento do mês/ }).click();
      await page.locator('[data-gv="conferir"]').click();
      await msg(page, 'Conferência registrada');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-02-conferido');
      assert.deepEqual(erros, []); checks.push('Vendedora no celular: painel (50.000,00, 1.500,00, falta 10.000,01), avaliação por regras, gráfico de barras sem CDN e conferência');
      await page.close();
    }
    // 3. Wanessa fecha; Dora aprova; Wanessa paga; Dora vê o comparativo
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      await page.locator('#gvAgora button', { hasText: 'Fechar' }).first().click();
      await page.locator('[data-gv="fechar"]').click();
      await confirmar(page);
      await msg(page, 'Mês fechado');
      assert.match(await page.locator('#gvCorpo').innerText(), /cópia congelada no fechamento/);
      assert.deepEqual(erros, []); await page.close();
    }
    {
      const { page, erros } = await abrirPagina(browser, a, 'dora', 1366);
      await page.locator('#gvAgora button', { hasText: 'Aprovar' }).first().click();
      await page.locator('[data-gv="aprovar"]').click();
      await msg(page, 'Fechamento aprovado');
      await foto(page, '1366-03-aprovado');
      assert.deepEqual(erros, []); await page.close();
    }
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      await page.locator('#gvAgora button', { hasText: 'Pagar' }).first().click();
      assert.equal(await page.inputValue('#gvPagValor'), '1.500,00');
      await page.selectOption('#gvPagForma', 'PIX');
      await page.locator('[data-gv="pagar"]').click();
      await msg(page, 'Pagamento registrado');
      assert.match(await page.locator('.gv-passo', { hasText: '4. Financeiro paga' }).innerText(), /R\$ 1\.500,00/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-04-pago');
      assert.deepEqual(erros, []); await page.close();
    }
    {
      const { page, erros } = await abrirPagina(browser, a, 'dora', 390);
      await page.getByRole('tab', { name: 'Comparativo' }).click();
      await page.locator('#gvCorpo table').waitFor();
      assert.match(await page.locator('#gvCorpo').innerText(), /VERA VENDEDORA TESTE[\s\S]*R\$ 1\.500,00/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-03-comparativo');
      assert.deepEqual(erros, []); await page.close();
      checks.push('Fluxo pela tela: Financeiro fecha (confirmação da casca), Diretoria aprova, Financeiro paga 1.500,00 por PIX; comparativo no celular');
    }
    console.log('PASS ' + checks.length + ' cenários');
    checks.forEach((c) => console.log(' - ' + c));
  } catch (e) {
    console.error('FALHOU: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
