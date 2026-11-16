// Desempenho da gestão e Caixa de decisões no navegador, na PÁGINA COMPLETA (Index.html com todos os include() resolvidos, como o
// servidor monta), com volume realista de dados fictícios (tests/_gestao_desempenho_ambiente.cjs: 300 O.S. antigas do Auvo,
// 60 sem vínculo de técnico, O.S. recentes, atividades atrasadas e sugestões de ocorrência em sigilo). O google.script.run da
// página fala com o ambiente de teste: getSessaoAtual devolve a sessão escolhida e as funções da gestão rodam o código real.
// Sem rede. 1366 px e 390 px, sem erro de JavaScript, sem alert/confirm/prompt e sem rolagem lateral; mede o tempo de carga.
// FASE=antes: só as capturas da tela antiga (base de produção). FASE=depois (padrão): capturas e conferências da tela nova.
// Uso: DEST=<legado> FASE=depois node --require output/desempenho-gestao/fontes.cjs tests/gestao-desempenho-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambienteVolume, PASTA } = require('./_gestao_desempenho_ambiente.cjs');

const FASE = process.env.FASE || 'depois';
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/desempenho-gestao/capturas');
fs.mkdirSync(saida, { recursive: true });
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
const LIBERADAS = /^(Gestao_|SGO_Pendencias_|Atividades_api)/;

async function abrirPagina(browser, a, login, largura, tempos) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo do navegador aberto: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (LIBERADAS.test(fn) && typeof a.ctx[fn] === 'function') {
      const t0 = Date.now();
      const v = JSON.parse(JSON.stringify(a.ctx[fn](...args)));
      if (tempos) tempos.push({ fn, ms: Date.now() - t0, kb: Math.round(JSON.stringify(v).length / 1024) });
      return { ok: true, valor: v };
    }
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
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) { await page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true }); }
async function tela(page, mod, seletorPronto) {
  const t0 = Date.now();
  await page.evaluate((m) => abrir(m), mod);
  await page.waitForSelector(seletorPronto, { timeout: 20000 });
  return Date.now() - t0;
}

async function depois(browser, relatorio) {
  const a = ambienteVolume();
  const conferir = (nome, ok) => { relatorio.conferencias.push({ nome, ok: !!ok }); assert.ok(ok, nome); };
  const altura = (page) => page.evaluate(() => document.documentElement.scrollHeight);
  // 1. Diretoria no computador: Desempenho
  {
    const { page, erros } = await abrirPagina(browser, a, 'dora', 1366, relatorio.chamadas);
    relatorio.cargas.push({ tela: 'desempenho', largura: 1366, ms: await tela(page, 'gestao_desempenho', '.gd-resumo') });
    const txt = await page.locator('#gdDesCorpo').innerText();
    conferir('visão geral sem o texto corrido "Chegaram à Diretoria:"', !/Chegaram à Diretoria:/.test(txt));
    conferir('visão geral sem títulos de O.S. soltos', !/O\.S\. nº 523/.test(txt));
    conferir('saneamento separado com a contagem (300 O.S. antigas)', /300 O\.S\. do Auvo chegaram/.test(txt));
    conferir('tabela de gestores com taxa de resolução', /Taxa de resolução/i.test(txt) && /MATHEUS GESTOR TECNICO TESTE/.test(txt));
    conferir('sem rolagem lateral (desempenho, 1366)', await semRolagemLateral(page));
    await foto(page, 'depois-desempenho-visao-1366');
    await page.getByRole('button', { name: 'Gestores', exact: true }).click();
    await page.locator('details.gd-gestor').first().waitFor();
    const gtxt = await page.locator('#gdDesCorpo').innerText();
    conferir('detalhe do gestor agrupado por tipo', /Chegaram à Diretoria no mês \(\d+\)/.test(gtxt) && !/Chegaram à Diretoria:/.test(gtxt));
    await foto(page, 'depois-desempenho-gestores-1366');
    await page.getByRole('button', { name: 'Abertos agora' }).click();
    await page.locator('details.gd-grupo').first().waitFor();
    await page.locator('details.gd-grupo summary').first().click();
    const atxt = await page.locator('#gdDesCorpo').innerText();
    conferir('abertos agrupados: decisões, saneamento e cadastro', /Decisões abertas \(\d+\)/.test(atxt) && /Saneamento: O\.S\. do Auvo abertas há mais de 30 dias \(300\)/.test(atxt) && /Cadastro: O\.S\. sem vínculo/.test(atxt));
    conferir('sugestões de ocorrência só em contagem (sigilo)', !/Avaria na devolução do veículo PQB4394/.test(await page.locator('#gdDesCorpo').innerHTML()));
    await foto(page, 'depois-desempenho-abertos-1366');
    // filtro por área recalcula pelo servidor
    await page.selectOption('#gdDesArea', 'ADMINISTRATIVO');
    await page.waitForFunction(() => GD.painel && GD.painel.filtros.area === 'ADMINISTRATIVO');
    conferir('filtro de área aplicado', (await page.evaluate(() => GD.painel.totais.saneamento)) === 0);
    await page.selectOption('#gdDesArea', '');
    await page.waitForFunction(() => GD.painel && GD.painel.filtros.area === '');
    // 2. Caixa de decisões
    relatorio.cargas.push({ tela: 'caixa', largura: 1366, ms: await tela(page, 'gestao_decisoes', '#gdKpis .gd-kpi') });
    await page.evaluate(() => Gestao_trocarAba_('todas'));
    await page.waitForFunction(() => GD.dados && GD.dados.filtro === 'todas' && document.querySelector('.gd-grupo'));
    const ctxt = await page.locator('.module-shell').innerText();
    conferir('caixa: números só das decisões (61) e bloco de saneamento', /Aguardando decisão/.test(ctxt) && /Saneamento \(fora da avaliação\)/.test(ctxt) && (await page.locator('#gdKpis .gd-kpi .v').first().innerText()) === '61');
    const h = await altura(page);
    relatorio.alturaCaixa1366 = h;
    conferir('caixa com altura legível (antes: 78 mil px)', h < 4000);
    await foto(page, 'depois-caixa-grupos-1366');
    // abrir um grupo, começar uma providência e tentar trocar o filtro: a troca é recusada e o texto fica
    await page.locator('details.gd-grupo summary').first().click();
    await page.locator('details.gd-grupo[open] .gd-card').first().waitFor();
    await page.locator('details.gd-grupo[open] .gd-card button', { hasText: 'Registrar providência' }).first().click();
    await page.locator('.gd-form textarea').first().fill('Liguei para o técnico; ele finaliza hoje');
    await page.selectOption('#gdFPrazo', 'vencido');
    await page.locator('#gdFiltrosSt .gd-msg').waitFor();
    conferir('troca de filtro não apaga providência em digitação', (await page.locator('.gd-form textarea').first().inputValue()) === 'Liguei para o técnico; ele finaliza hoje');
    await foto(page, 'depois-caixa-providencia-protegida-1366');
    await page.locator('.gd-form button', { hasText: 'Cancelar' }).first().click();
    await page.locator('.gd-seg button', { hasText: 'Kanban' }).click();
    await page.locator('.gd-kanban').waitFor();
    await foto(page, 'depois-caixa-kanban-1366');
    await page.locator('.gd-seg button', { hasText: 'Grupos' }).click();
    // 3. Saneamento: filtrar a época mais antiga, marcar todas, motivo, confirmar na tela
    await page.getByRole('button', { name: /Ver e sanear/ }).click();
    await page.locator('#gdSanLista').waitFor();
    await foto(page, 'depois-saneamento-1366');
    const ep = await page.locator('#gdSanEp option').nth(1).getAttribute('value');
    await page.selectOption('#gdSanEp', ep);
    const nEp = await page.evaluate(() => Gestao_sanFiltradas_().length);
    await page.locator('#gdSanTodas').check();
    await page.fill('#gdSanMotivo', 'Atendimentos de dezembro de 2025 já faturados; O.S. ficaram sem finalizar no Auvo');
    await page.getByRole('button', { name: 'Marcar como encerradas fora do SGO+' }).click();
    await page.locator('#gdSanSt_ENCERRADA_FORA .gd-msg.aviso').waitFor();
    await foto(page, 'depois-saneamento-confirmar-1366');
    await page.locator('#gdSanOk_ENCERRADA_FORA').click();
    await page.getByText(/como "encerrada fora do sgo\+"/).first().waitFor();
    const ativos = (a.tabelas.GES_SANEAMENTO || []).filter((r) => !r.DESFEITO_EM).length;
    conferir('saneamento gravado um a um, sem apagar (' + nEp + ' O.S.)', nEp > 0 && ativos === nEp && a.tabelas.GES_DECISOES.filter((r) => r.SITUACAO === 'SANEADA').length === nEp && a.tabelas.AUVO_PENDENCIAS.length === 343);
    await foto(page, 'depois-saneamento-feito-1366');
    relatorio.saneadasNoEnsaio = nEp;
    conferir('sem rolagem lateral (saneamento, 1366)', await semRolagemLateral(page));
    if (erros.length) console.error(erros);
    conferir('sem erro de JavaScript e sem janela do navegador (1366)', erros.length === 0);
    await page.close();
  }
  // 4. Celular (390 px): Diretoria
  {
    const { page, erros } = await abrirPagina(browser, a, 'dora', 390, relatorio.chamadas);
    relatorio.cargas.push({ tela: 'desempenho', largura: 390, ms: await tela(page, 'gestao_desempenho', '.gd-resumo') });
    conferir('sem rolagem lateral (desempenho, 390)', await semRolagemLateral(page));
    await foto(page, 'depois-desempenho-visao-390');
    await page.getByRole('button', { name: 'Gestores', exact: true }).click();
    await page.locator('details.gd-gestor').first().waitFor();
    conferir('sem rolagem lateral (gestores, 390)', await semRolagemLateral(page));
    await foto(page, 'depois-desempenho-gestores-390');
    relatorio.cargas.push({ tela: 'caixa', largura: 390, ms: await tela(page, 'gestao_decisoes', '#gdKpis .gd-kpi') });
    await page.evaluate(() => Gestao_trocarAba_('todas'));
    await page.waitForFunction(() => GD.dados && GD.dados.filtro === 'todas' && document.querySelector('.gd-grupo'));
    conferir('sem rolagem lateral (caixa, 390)', await semRolagemLateral(page));
    relatorio.alturaCaixa390 = await altura(page);
    await foto(page, 'depois-caixa-grupos-390');
    await page.locator('details.gd-grupo summary').first().click();
    await page.locator('details.gd-grupo[open] .gd-card').first().waitFor();
    await foto(page, 'depois-caixa-grupo-aberto-390');
    await page.getByRole('button', { name: /Ver e sanear/ }).click();
    await page.locator('#gdSanLista').waitFor();
    conferir('sem rolagem lateral (saneamento, 390)', await semRolagemLateral(page));
    await foto(page, 'depois-saneamento-390');
    if (erros.length) console.error(erros);
    conferir('sem erro de JavaScript e sem janela do navegador (390)', erros.length === 0);
    await page.close();
  }
  // 5. Gestor (Matheus) no celular: só os números dele
  {
    const { page, erros } = await abrirPagina(browser, a, 'matheus', 390, relatorio.chamadas);
    await tela(page, 'gestao_desempenho', '.gd-resumo');
    const txt = await page.locator('#gdDesCorpo').innerText();
    conferir('gestor vê só a própria linha', /MATHEUS GESTOR TECNICO TESTE/.test(txt) && !/BRUNA GESTORA/.test(txt) && !/GIL GESTOR/.test(txt));
    await foto(page, 'depois-desempenho-gestor-390');
    conferir('sem erro de JavaScript (gestor)', erros.length === 0);
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const relatorio = { fase: FASE, cargas: [], chamadas: [], conferencias: [] };
  try {
    if (FASE === 'antes') {
      const a = ambienteVolume();
      for (const largura of [1366, 390]) {
        const { page, erros } = await abrirPagina(browser, a, 'dora', largura, relatorio.chamadas);
        relatorio.cargas.push({ tela: 'desempenho', largura, ms: await tela(page, 'gestao_desempenho', '.gd-gestor') });
        await foto(page, 'antes-desempenho-' + largura);
        relatorio.cargas.push({ tela: 'caixa', largura, ms: await tela(page, 'gestao_decisoes', '.gd-card') });
        await page.evaluate(() => Gestao_trocarAba_('todas'));
        await page.waitForTimeout(300);
        await foto(page, 'antes-caixa-' + largura);
        relatorio.conferencias.push({ largura, semRolagemLateral: await semRolagemLateral(page), erros });
        await page.close();
      }
      fs.writeFileSync(path.join(saida, 'antes.json'), JSON.stringify(relatorio, null, 2));
      console.log('Capturas de antes: OK'); console.log(JSON.stringify(relatorio.cargas));
      return;
    }
    await depois(browser, relatorio);
    fs.writeFileSync(path.join(saida, 'depois.json'), JSON.stringify(relatorio, null, 2));
    console.log('Navegador PASS'); console.log(JSON.stringify(relatorio.cargas));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
