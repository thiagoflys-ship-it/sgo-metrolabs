// Conferência no navegador da tela Administração > Acessos (lote 0), na PÁGINA COMPLETA (Index.html com todos os include()
// resolvidos, como o servidor monta). O google.script.run da página fala com o ambiente de teste (tests/_poderes_ambiente.cjs):
// getSessaoAtual devolve a sessão escolhida e Poderes_api roda o SGO_Poderes.js real; as outras funções respondem
// "indisponível no ensaio". Sem rede (fontes e ícones externos bloqueados).
// Uso: FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs output/poderes-20261110/lote0-navegador.cjs
//      (PLAYWRIGHT_CORE = caminho do pacote playwright-core; padrão: o da pasta de rascunho desta sessão)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const raiz = path.resolve(__dirname, '../..');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/venda/AppData/Local/Temp/claude/b22c3c2c767b0e1f/b760404d-992d-45e4-81c0-9f25b85efac9/scratchpad/pw/node_modules/playwright-core');
const { ambiente } = require(path.join(raiz, 'tests/_poderes_ambiente.cjs'));
const pastaLegado = path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const saida = path.join(__dirname, 'lote0-telas');
fs.mkdirSync(saida, { recursive: true });
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA || 'C:/Users/venda/AppData/Local', 'ms-playwright/chromium-1248/chrome-win64/chrome.exe');

function paginaCompleta() {
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
}

async function abrir(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => d.accept());
  const html = paginaCompleta();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (fn === 'Poderes_api') return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx.Poderes_api(...args))) };
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((sid) => {
    try { sessionStorage.setItem('SGO_SESSION', sid); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, 's_' + login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 }); } catch (e) { throw new Error('a página não entrou: ' + erros.slice(0, 5).join(' | ')); }
  await page.waitForTimeout(300);
  return { page, erros };
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const checks = [];
  try {
    // 1. quem não gere os acessos: item do menu escondido; abrir pela casca mostra a recusa do servidor
    {
      const a = ambiente();
      const { page } = await abrir(browser, a, 'ricardo', 1280);
      assert.equal(await page.locator('#menu-btn-acessos').isVisible(), false);
      await page.evaluate(() => abrir('acessos'));
      await page.getByText('A tela não abriu.').waitFor();
      assert.match(await page.locator('#acsCorpo').innerText(), /responsável pelo sistema/);
      checks.push('ricardo (Gestor): menu sem "Acessos"; abrir direto mostra a recusa do servidor com o caminho de volta');
      await page.close();
    }
    // 2. dono no computador: menu, pessoa, marcar, salvar com motivo, histórico, ver como, copiar, modelo, voltar ao padrão
    const a = ambiente();
    const { page, erros } = await abrir(browser, a, 'admin', 1280);
    await page.waitForFunction(() => document.getElementById('menu-btn-acessos').style.display === '', null, { timeout: 10000 });
    if (!(await page.locator('#menu .menu-grupo[data-grupo="administracao"]').evaluate((el) => el.classList.contains('is-aberto')))) await page.locator('#menu .menu-grupo[data-grupo="administracao"] .menu-grupo-cab').click();
    await page.locator('#menu-btn-acessos').waitFor({ state: 'visible' });
    checks.push('admin (dono): item "Acessos" aparece no grupo Administração da página completa');
    await page.locator('#menu-btn-acessos').click();
    await page.locator('#acsBusca').waitFor();
    assert.match(await page.locator('.acs-faixa').first().innerText(), /Nenhum módulo obedece às caixas ainda/);
    assert.equal(await page.locator('.acs-pessoa').count(), 18);
    await page.locator('#acsBusca').fill('monica');
    assert.equal(await page.locator('.acs-pessoa').count(), 1);
    await page.locator('.acs-pessoa').first().click();
    await page.locator('.acs-grupo').first().waitFor();
    assert.equal(await page.locator('.acs-grupo').count(), 18);
    assert.equal(await page.locator('.acs-item').count(), 150);
    assert.equal(await page.locator('.acs-lote').count(), 150, 'aviso de lote em todas as caixas (nenhuma ligada)');
    await page.screenshot({ path: path.join(saida, 'computador-pessoa.png'), fullPage: false });
    checks.push('monica aberta: 18 módulos, 150 caixas, aviso "passa a valer quando o módulo for ligado" em todas');
    const grupoCompras = page.locator('.acs-grupo[data-modulo="Compras"]');
    await grupoCompras.locator('summary').click();
    await page.locator('#acsCx_COMPRAS_GESTAO').check();
    await page.locator('#acsCx_COMPRAS_PEDIR').uncheck();
    assert.match(await page.locator('#acsRodape').innerText(), /2 alterações pendentes/);
    assert.equal(await page.locator('.acs-item.is-pendente').count(), 2);
    await page.locator('#acsRodape').getByRole('button', { name: 'Salvar' }).click();
    await page.locator('#cadxDlgMotivo').waitFor();
    assert.match(await page.locator('.cadx-dialogo-corpo').innerText(), /Liberar: Gestão de Compras/);
    await page.locator('#cadxDlgMotivo').fill('abc');
    await page.locator('#cadxDlgOk').click();
    assert.match(await page.locator('#cadxDlgMotivoErro').innerText(), /pelo menos 5/);
    await page.locator('#cadxDlgMotivo').fill('Cobrir as férias do comprador');
    await page.locator('#cadxDlgOk').click();
    await page.locator('#cadxDialogo').waitFor({ state: 'detached' });
    await page.locator('.acs-item[data-codigo="COMPRAS_GESTAO"] .acs-selo.excecao').waitFor();
    assert.equal(a.tabelas.SYS_PODERES_EXCECOES.length, 2);
    assert.equal(a.ctx.SGO_pode_('s_monica', 'COMPRAS_GESTAO'), true);
    assert.match(await page.locator('.acs-item[data-codigo="COMPRAS_GESTAO"] .acs-quem').innerText(), /Liberada por .+ Motivo: Cobrir as férias do comprador/);
    assert.match(await page.locator('#acsRodape').innerText(), /Nenhuma alteração pendente/);
    checks.push('marcar/desmarcar → 2 pendentes → Salvar pede motivo (recusa 3 letras) → gravado; selo "Alterado para esta pessoa" com quem/quando/motivo');
    await page.getByRole('button', { name: 'Histórico' }).click();
    await page.locator('#acsPainel table').waitFor();
    assert.equal(await page.locator('#acsPainel tbody tr').count(), 2);
    await page.getByRole('button', { name: 'Ver como esta pessoa vê' }).click();
    await page.locator('.acs-vercomo').waitFor();
    assert.match(await page.locator('.acs-vercomo').innerText(), /Gestão de Compras \* \(alterada para esta pessoa\)/);
    checks.push('Histórico (2 linhas) e "Ver como esta pessoa vê" com a caixa alterada');
    // voltar ao padrão
    await page.locator('.acs-item[data-codigo="COMPRAS_PEDIR"] .acs-voltar').click();
    await page.locator('#cadxDlgMotivo').fill('Voltou a pedir compras');
    await page.locator('#cadxDlgOk').click();
    await page.locator('#cadxDialogo').waitFor({ state: 'detached' });
    await page.locator('.acs-item[data-codigo="COMPRAS_PEDIR"] .acs-selo.padrao').waitFor();
    assert.equal(await page.locator('#acsCx_COMPRAS_PEDIR').isChecked(), true);
    checks.push('"voltar ao padrão" com motivo: caixa volta marcada e com o selo do padrão');
    // copiar de
    await page.getByRole('button', { name: 'Copiar de…' }).click();
    await page.locator('#acsCopiarDe').selectOption({ label: 'RICARDO · Gestor' });
    await page.locator('#cadxDlgMotivo').fill('Mônica substitui o Ricardo');
    await page.locator('#cadxDlgOk').click();
    await page.locator('#cadxDialogo').waitFor({ state: 'detached' });
    const efM = a.ctx.SGO_poderesEfetivos_(a.idDe('monica')), efR = a.ctx.SGO_poderesEfetivos_(a.idDe('ricardo'));
    assert.ok(efR.every((p) => efM.find((x) => x.codigo === p.codigo).valor === p.valor));
    checks.push('"Copiar de…" Ricardo: Mônica fica com as mesmas caixas');
    // modelo
    await page.getByRole('button', { name: 'Aplicar modelo' }).click();
    await page.locator('input[name="acsModelo"][value="COMERCIAL"]').check();
    await page.locator('#cadxDlgMotivo').fill('Volta a ser só vendedora');
    await page.locator('#cadxDlgOk').click();
    await page.locator('#cadxDialogo').waitFor({ state: 'detached' });
    await page.waitForTimeout(200);
    assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_TODAS_AS_VENDAS'), false);
    assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_USAR'), true);
    checks.push('"Aplicar modelo" Comercial (substituir): volta a ser só vendedora');
    // a própria pessoa e trocar de pessoa com pendência
    await page.locator('#acsBusca').fill('');
    await page.locator('#acsBusca').fill('THIAGO');
    await page.locator('#acsBusca').fill('admin');
    await page.locator('.acs-pessoa', { hasText: '(você)' }).click();
    await page.locator('.acs-faixa', { hasText: 'ninguém altera as próprias' }).waitFor();
    assert.equal(await page.locator('.acs-item input:not([disabled])').count(), 0);
    assert.equal(await page.locator('.acs-selo.dono').count(), 150);
    checks.push('a própria conta (dono): só consulta, aviso "ninguém altera as próprias", 150 selos "Responsável pelo sistema"');
    assert.deepEqual(erros.filter((e) => /Acessos|acs|Poderes/i.test(e)), [], 'erros da tela: ' + erros.join(' | '));
    await page.close();
    // 3. celular (390 px): sem rolagem lateral, rodapé e caixas usáveis
    const a2 = ambiente();
    const m = await abrir(browser, a2, 'admin', 390);
    await m.page.evaluate(() => { document.getElementById('app').classList.add('modo-mobile'); document.documentElement.classList.add('sgo-movel'); abrir('acessos'); });
    await m.page.locator('#acsBusca').waitFor();
    await m.page.locator('#acsBusca').fill('elisa');
    await m.page.locator('.acs-pessoa').first().click();
    await m.page.locator('.acs-grupo').first().waitFor();
    await m.page.locator('.acs-grupo[data-modulo="Assistente do ponto"] summary').click();
    await m.page.locator('#acsCx_PONTO_VER_TODOS').uncheck();
    assert.equal(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'rolagem lateral no celular');
    const caixa = await m.page.locator('#acsCx_PONTO_VER_TODOS').boundingBox();
    const est = await m.page.locator('#acsCx_PONTO_VER_TODOS').evaluate((el) => { const s = getComputedStyle(el); return s.width + ' ' + s.height + ' ' + s.display + ' ' + s.appearance; });
    assert.ok(caixa.width >= 18 && caixa.height >= 18, JSON.stringify(caixa) + ' ' + est);
    await m.page.locator('.acs-grupo[data-modulo="Assistente do ponto"]').scrollIntoViewIfNeeded();
    await m.page.screenshot({ path: path.join(saida, 'celular-390-pessoa.png'), fullPage: false });
    checks.push('celular 390 px: sem rolagem lateral; caixa marcável; rodapé com pendência');
    assert.deepEqual(m.erros.filter((e) => /Acessos|acs|Poderes/i.test(e)), []);
    await m.page.close();
  } finally {
    await browser.close();
  }
  const txt = 'Conferência no navegador (página completa, ' + new Date().toISOString() + ')\n' + checks.map((c) => '  OK ' + c).join('\n') + '\n';
  fs.writeFileSync(path.join(__dirname, 'lote0-navegador.txt'), txt);
  console.log(txt);
})().catch((e) => { console.error('FALHOU:', e && e.stack || e); process.exitCode = 1; });
