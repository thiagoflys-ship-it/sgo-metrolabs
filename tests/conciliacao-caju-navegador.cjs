// Conciliação Caju (11/11/2026) no navegador, na PÁGINA COMPLETA (Index.html com todos os include() resolvidos, como o servidor
// monta). O google.script.run da página fala com o ambiente de teste (tests/_caju_ambiente.cjs: código real do SGO+ e o Caju
// SIMULADO); nada sai para a rede. Fluxo pela tela: a Wanessa vincula o colaborador pelo CPF, faz a carga pelo Caju (saldo
// insuficiente -> PIX -> creditado), importa o extrato CSV com a prévia, trata a divergência com motivo, vê o Kanban, a linha do
// tempo e a viagem, fecha o período com ressalva e abre os relatórios A4 (individual e geral); a Diretoria no celular acompanha; o
// técnico gera o próprio relatório individual no Depósito de viagem. 1366 e 390 px, sem erro de JavaScript, sem janela do navegador
// (alert/confirm/prompt) e sem rolagem lateral. Capturas em output/conciliacao-caju/capturas.
// Uso: DEST=<legado> node --require output/conciliacao-caju/fontes.cjs tests/conciliacao-caju-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambienteCaju, CPF, PASTA } = require('./_caju_ambiente.cjs');

const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/conciliacao-caju/capturas');
fs.mkdirSync(saida, { recursive: true });
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
const API = ['Viagem_api', 'Poderes_api', 'CajuConc_api'];

async function abrirPagina(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador aberta: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (API.includes(fn)) { a.rodar('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;'); return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) }; }
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
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-deposito_viagem'); return b && b.style.display === ''; }, null, { timeout: 10000 });
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) { await page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true }); }
async function msg(page, texto) { await page.locator('#cjMsg, #vgMsg', { hasText: texto }).first().waitFor({ timeout: 10000 }); }
async function pop(page, clique, nome, re) {
  const [p] = await Promise.all([page.waitForEvent('popup'), clique()]);
  await p.waitForFunction((r) => document.body && new RegExp(r).test(document.body.innerText), re, { timeout: 10000 });
  await p.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true }); await p.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const a = ambienteCaju();
  a.sim.empregado(CPF.tiago, 'TIAGO TECNICO TESTE', { email: 'tiago@exemplo.test' });
  a.sim.empregado(CPF.paulo, 'PAULO TECNICO TESTE', { email: 'paulo@exemplo.test' });
  try {
    // 1. Wanessa no computador: menu Financeiro, Comece por aqui, vincula o Tiago pelo CPF
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-conciliacao_caju'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      assert.equal(await page.locator('#menu-secao-financeiro').isVisible(), true);
      await page.evaluate(() => abrir('conciliacao_caju'));
      await page.locator('.vg-bloco', { hasText: 'Primeira vez (Wanessa)' }).waitFor();
      assert.match(await page.locator('#cjAmb').innerText(), /Produção \(conta real da Metrolabs\)/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-01-comece-por-aqui');
      await page.getByRole('tab', { name: 'Colaboradores' }).click();
      await page.getByRole('button', { name: 'Atualizar a lista do Caju' }).click();
      await msg(page, 'Lista do Caju lida: 2 colaboradores');
      await page.fill('#cjCpf_u_tec', '529.982.247-25');
      await page.locator('[data-cj="colVincular"][data-id="u_tec"]').click();
      await msg(page, 'TIAGO TECNICO TESTE vinculado ao Caju');
      await page.locator('[data-cj="colSugestao"][data-id="u_tec2"]').first().click();
      await msg(page, 'PAULO TECNICO TESTE vinculado');
      assert.ok(!(await page.content()).includes(CPF.tiago), 'CPF nunca inteiro na tela');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-02-colaboradores');
      assert.deepEqual(erros, []); checks.push('colaboradores: lista lida, vínculo pelo CPF digitado e pela sugestão do nome; CPF sempre mascarado');
      await page.close();
    }
    // solicitação aprovada (gestor e aprovador já testados no Depósito de viagem); saldo da conta Caju baixo
    const s = a.aprovada();
    a.sim.saldo = 100;
    // 2. Wanessa faz a carga pelo Caju na tela do Depósito de viagem: saldo insuficiente -> PIX -> creditado
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: /Carga no cartão/ }).click();
      await page.locator('.vg-cartao').first().click();
      await page.locator('h4', { hasText: 'Fazer a carga pelo Caju' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-03-viagem-carga-pelo-caju');
      await page.getByRole('button', { name: 'Fazer a carga pelo Caju' }).click();
      await msg(page, 'Escolha a categoria do crédito');
      await page.selectOption('#vgCjCat', 'FLEXIBLE');
      await page.getByRole('button', { name: 'Fazer a carga pelo Caju' }).click();
      await page.locator('#fsPergunta', { hasText: 'Fazer a carga de R$ 2.660,00 pelo Caju?' }).waitFor();
      await page.locator('#fsPergunta button', { hasText: 'Fazer a carga' }).click();
      await msg(page, 'NÃO foi pago');
      await page.locator('.vg-item-sit', { hasText: 'Saldo insuficiente na conta Caju' }).waitFor();
      await foto(page, '1366-04-saldo-insuficiente');
      await page.getByRole('button', { name: 'Pagar por PIX' }).click();
      await msg(page, 'PIX gerado');
      assert.match(await page.locator('textarea[id^="vgCjPix_"]').inputValue(), /^00020126/);
      await foto(page, '1366-05-pix');
      a.sim.pagarPix(Object.keys(a.sim.pedidos)[0]); a.sim.avancar(5);
      await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
      await msg(page, 'Creditado no cartão Caju de TIAGO TECNICO TESTE');
      await page.locator('.vg-selo.s-CARGA_FEITA').first().waitFor();
      assert.match(await page.locator('.vg-det', { hasText: 'Cargas no cartão Caju' }).innerText(), /Pedido de crédito Caju nº ord-/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-06-creditado');
      assert.deepEqual(erros, []); checks.push('carga pelo Caju na tela: categoria na primeira vez, confirmação, saldo insuficiente, PIX com o código, creditado e carga registrada');
      await page.close();
    }
    // prestação de contas do Tiago (pelo servidor: a tela da prestação já é testada no Depósito de viagem)
    a.mudar('2026-10-30T10:00:00-03:00');
    const g = (x) => a.ok(a.v('tiago', 'lancarGasto', Object.assign({ id: s.id, data: '2026-10-27', pagoCom: 'CAJU', arquivo: a.pdf('c' + Math.random() + '.pdf') }, x)));
    g({ categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', data: '2026-10-29', valor: '1.500,00', estabelecimento: 'Hotel Centro Rio Verde', descricao: 'hospedagem da equipe no atendimento do Hospital Teste Alfa' });
    g({ categoria: 'ALIMENTACAO', valor: '187,50', estabelecimento: 'Restaurante Sabor', descricao: 'almoço da equipe no atendimento do Hospital Teste Alfa' });
    const csv = ['Extrato de despesas', 'Data;Colaborador;CPF;Estabelecimento;Tipo;Valor;Centro de custo;ID da transação',
      '19/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';Caju;Carga de saldo;2.660,00;GO-TECNICA;c1',
      '29/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';HOTEL CENTRO RIO VERDE;Compra;-1.500,00;GO-TECNICA;c2',
      '27/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';RESTAURANTE SABOR;Compra;-197,50;GO-TECNICA;c3',
      '28/10/2026;TIAGO TECNICO TESTE;' + CPF.tiago + ';LOJA DE CONVENIENCIA;Compra;-42,00;GO-TECNICA;c4'].join('\r\n');
    // 3. Wanessa: importa o extrato com a prévia, trata a divergência, vê a viagem, o Kanban e a linha do tempo, fecha e gera os A4
    {
      const { page, erros } = await abrirPagina(browser, a, 'wanessa', 1366);
      await page.evaluate(() => abrir('conciliacao_caju'));
      await page.getByRole('tab', { name: 'Importar extrato' }).click();
      await page.locator('#cjArq').setInputFiles({ name: 'extrato-caju-outubro.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
      await page.locator('#cjPrevia', { hasText: 'Confira a prévia' }).waitFor();
      assert.equal(await page.inputValue('#cjMap_valor'), '5'); assert.equal(await page.inputValue('#cjMap_data'), '0');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-07-extrato-previa');
      await page.getByRole('button', { name: 'Importar estas linhas' }).click();
      await page.locator('#fsPergunta button', { hasText: 'Importar' }).click();
      await msg(page, 'Extrato importado: 4 linhas novas');
      await foto(page, '1366-08-extrato-importado');
      await page.getByRole('tab', { name: /Divergências/ }).click();
      await page.locator('.vg-item', { hasText: 'Valor do cartão diferente do comprovante' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-09-divergencias');
      const vd = page.locator('.vg-item', { hasText: 'Valor do cartão diferente do comprovante' });
      await vd.getByRole('button', { name: 'Resolver (com motivo)' }).click();
      await vd.locator('select[id^="cjRes_"]').selectOption('JUSTIFICADA');
      await vd.locator('textarea[id^="cjMot_"]').fill('gorjeta de dez reais paga à parte, aceita');
      await vd.getByRole('button', { name: 'Confirmar' }).click();
      await msg(page, 'Divergência resolvida');
      const sc = page.locator('.vg-item', { hasText: 'Gasto no cartão sem comprovante' });
      await sc.getByRole('button', { name: /Avisar TIAGO/ }).click();
      await msg(page, 'foi avisado');
      await page.locator('.vg-item', { hasText: 'Gasto no cartão sem comprovante' }).getByRole('button', { name: 'Ver a viagem' }).click();
      await page.locator('h3', { hasText: 'Gastos da prestação' }).waitFor();
      assert.match(await page.locator('#cjCorpo').innerText(), /Para que foi: almoço da equipe/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-10-viagem-conciliacao');
      await page.getByRole('tab', { name: 'Painel e Kanban' }).click();
      await page.locator('.atv-kcol-cab', { hasText: 'Com divergência' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-11-kanban');
      await page.getByRole('tab', { name: 'Linha do tempo' }).click();
      await page.locator('#cjPainelCorpo').waitFor();
      await foto(page, '1366-12-linha-do-tempo');
      await page.getByRole('tab', { name: 'Créditos' }).click();
      await page.locator('h3', { hasText: 'Aprovado × carregado × conferido no extrato' }).waitFor();
      assert.match(await page.locator('#cjCorpo').innerText(), /conferido no extrato/);
      await foto(page, '1366-13-creditos');
      await page.getByRole('tab', { name: 'Fechamento' }).click();
      await page.fill('#cjFDe', '2026-10-01'); await page.fill('#cjFAte', '2026-10-31'); await page.fill('#cjFCc', 'GO-TECNICA');
      await page.getByRole('button', { name: 'Ver a prévia' }).click();
      await page.locator('#cjFPrev', { hasText: 'Pendências' }).waitFor();
      await page.fill('#cjFRess', 'gasto da loja de conveniência cobrado do técnico, comprovante pedido');
      await foto(page, '1366-14-fechamento-previa');
      await page.getByRole('button', { name: 'Fechar o período' }).click();
      await page.locator('#fsPergunta button', { hasText: 'Fechar' }).first().click();
      await msg(page, 'Período fechado: FCJ-2026-0001 (com ressalva)');
      await pop(page, () => page.getByRole('button', { name: 'Abrir o A4' }).first().click(), '1366-15-a4-fechamento', 'Fechamento da conciliação do cartão Caju');
      await page.getByRole('tab', { name: 'Relatórios A4' }).click();
      await page.fill('#cjRDe', '2026-10-01'); await page.fill('#cjRAte', '2026-10-31');
      await page.locator('#cjRPes option[value="u_tec"]').waitFor({ state: 'attached' });
      await page.selectOption('#cjRPes', 'u_tec');
      await foto(page, '1366-16-relatorios');
      await pop(page, () => page.getByRole('button', { name: 'Gerar e abrir o A4' }).click(), '1366-17-a4-individual', 'Gastos com comprovante e para que foi');
      await page.locator('input[name="cjRelTipo"][value="GERAL"]').check();
      await page.fill('#cjRDe', '2026-10-01'); await page.fill('#cjRAte', '2026-10-31');
      await pop(page, () => page.getByRole('button', { name: 'Gerar e abrir o A4' }).click(), '1366-18-a4-geral', 'Por centro de custo');
      const [down] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar o arquivo (.html)' }).click()]);
      assert.match(down.suggestedFilename(), /^Relatorio_geral_viagens_2026-10-01_2026-10-31\.html$/);
      await page.getByRole('tab', { name: 'Configuração' }).click();
      await page.getByRole('button', { name: 'Testar a conexão' }).click();
      await msg(page, 'Conexão com o Caju funcionando');
      await page.getByRole('button', { name: 'Ver o registro das chamadas' }).click();
      await page.locator('#cjChamadas', { hasText: 'Registro das chamadas ao Caju' }).waitFor();
      assert.ok(!(await page.locator('#cjChamadas').innerText()).includes('segredo-super-secreto'));
      await foto(page, '1366-19-configuracao');
      assert.deepEqual(erros, []); checks.push('extrato com prévia e mapeamento, divergência resolvida com motivo, aviso ao dono, viagem, Kanban, linha do tempo, créditos, fechamento com ressalva e A4 (fechamento, individual, geral e download)');
      await page.close();
    }
    // 4. Diretoria no celular (390 px): acompanha o painel e as divergências, sem botões de ação
    {
      const { page, erros } = await abrirPagina(browser, a, 'dora', 390);
      await page.evaluate(() => abrir('conciliacao_caju'));
      await page.getByRole('tab', { name: 'Painel e Kanban' }).click();
      await page.locator('.cj-cards').first().waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-01-diretoria-painel');
      await page.getByRole('tab', { name: /Divergências/ }).click();
      await page.locator('.vg-faixa', { hasText: 'Para que serve' }).waitFor();
      assert.equal(await page.locator('[data-cj="divResolver"]').count(), 0, 'a Diretoria vê, não resolve');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-02-diretoria-divergencias');
      await page.getByRole('tab', { name: 'Relatórios A4' }).click();
      await page.locator('.vg-tipos').waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-03-diretoria-relatorios');
      assert.deepEqual(erros, []); checks.push('Diretoria no celular: painel, divergências (sem ações) e relatórios, sem rolagem lateral');
      await page.close();
    }
    // 5. Técnico no celular: não vê o módulo; gera o próprio relatório individual no Depósito de viagem
    {
      const { page, erros } = await abrirPagina(browser, a, 'tiago', 390);
      assert.equal(await page.locator('#menu-btn-conciliacao_caju').isVisible(), false);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: 'Relatórios A4' }).click();
      await page.locator('input[name="vgRelTipo"][value="INDIVIDUAL"]').check();
      await page.locator('.vg-campo', { hasText: 'o seu relatório' }).waitFor();
      assert.equal(await page.locator('input[name="vgRelTipo"][value="GERAL"]').count(), 0, 'o geral é do Financeiro e da Diretoria');
      await page.fill('#vgRelDe', '2026-10-01'); await page.fill('#vgRelAte', '2026-10-31');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-04-tecnico-relatorio-individual');
      // no celular o A4 abre no visualizador do SGO+ (iframe com Voltar e Imprimir), não numa aba nova
      await page.getByRole('button', { name: 'Gerar e abrir o A4' }).click();
      await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some((f) => { try { return /Relatório individual de viagens/.test(f.contentDocument.body.innerText) && /almoço da equipe/.test(f.contentDocument.body.innerText); } catch (e) { return false; } }), null, { timeout: 10000 });
      await foto(page, '390-05-a4-individual-no-visualizador');
      assert.deepEqual(erros, []); checks.push('técnico: sem o módulo no menu; gera o próprio relatório individual no Depósito de viagem (390 px)');
      await page.close();
    }
    console.log('NAVEGADOR CONCILIAÇÃO CAJU: PASS\n- ' + checks.join('\n- '));
  } catch (e) {
    console.error('NAVEGADOR CONCILIAÇÃO CAJU: FALHOU\n' + (e && e.stack || e));
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
