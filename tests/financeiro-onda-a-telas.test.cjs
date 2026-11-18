// Onda A do Financeiro (18/11/2026): as três abas novas (Contas fixas, Fechamento do mês, Trilha das operações) e o que mudou em
// Lançamentos e baixas e na Agenda financeira, na página completa do SGO+ a 1366, 390 e 320 px: sem erro de JavaScript, sem rolagem
// lateral, guia "Como fazer nesta aba" e explicação embaixo de cada campo. Grava as capturas em output/financeiro-20261118-onda-a/capturas.
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_a.cjs); nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { montarA, baixaConfirmada, abrirPagina, semRolagem } = require('./_financeiro_onda_a.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_ONDA_A || path.join(__dirname, '../output/financeiro-20261118-onda-a/capturas');

const ALUGUEL = { descricao: 'Aluguel da sede', fornecedorId: '90', fornecedorNome: 'Posto Noventa Fictício', categoria: '2.10', categoriaNome: 'Serviços de terceiros', contaId: '5', contaNome: 'Banco simulado', dia: '20', valorTipo: 'FIXO', valor: '2.500,00', inicio: '2026-11' };
const ENERGIA = { descricao: 'Energia do escritório', fornecedorId: '91', fornecedorNome: 'Terceiros Noventa e Um', categoria: '2.03', categoriaNome: 'Combustível', contaId: '5', contaNome: 'Banco simulado', dia: '31', valorTipo: 'VARIAVEL', inicio: '2026-11' };

/** Cenário simulado: duas contas fixas, uma baixa estornável, um pedido de estorno aguardando e o checklist de outubro aberto. */
function cenario() {
  const a = montarA({ foto: true, agora: '2026-11-16T10:00:00-03:00' });
  assert.equal(a.F('OmieFix_apiSalvar', 'wanessa', ALUGUEL).ok, true);
  assert.equal(a.F('OmieFix_apiSalvar', 'wanessa', ENERGIA).ok, true);
  const b1 = baixaConfirmada(a, 400); baixaConfirmada(a, 250);
  assert.equal(a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: b1.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: 'baixa lançada no título errado; o pagamento era de outra nota' }).ok, true);
  assert.equal(a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-10' }).ok, true);
  const it = a.tabelas.FIN_FECHAMENTO_ITENS;
  a.F('OmieFech_apiMarcar', 'wanessa', { itemId: it[0].ID, acao: 'FEITO', obs: 'conciliadas as 3 contas correntes' });
  a.F('OmieFech_apiMarcar', 'wanessa', { itemId: it[1].ID, acao: 'FEITO' });
  return a;
}
const semDica = (page, sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s + ' input, ' + s + ' select, ' + s + ' textarea')).filter((el) => {
  if (el.type === 'hidden' || el.type === 'checkbox' || el.offsetParent === null) return false;
  if ((el.getAttribute('aria-describedby') || '').trim()) return false;
  const b = el.closest('.omie-barra, .cadx-faixa');
  return !(b && b.nextElementSibling && b.nextElementSibling.classList.contains('omie-dica-barra'));
}).map((el) => el.name || el.id), sel);
const guia = (page, aba) => page.evaluate((x) => { const g = document.querySelector('#omieCorpo [data-omie-guia]'); return !!g && g.getAttribute('data-omie-guia') === x && g.open && g.querySelectorAll('li').length >= 3; }, aba);
const justificado = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).textAlign === 'justify'; }, sel);

test('Onda A: Contas fixas, Fechamento do mês e Trilha das operações na página completa (1366, 390 e 320 px), com guia, explicação de cada campo e capturas', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const a = cenario();
      const cap = (nome, cheia) => (largura === 320 ? Promise.resolve() : page.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: cheia !== false }));
      const { page, erros } = await abrirPagina(browser, a, largura, 'wanessa');
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
      const abas = await page.evaluate(() => OMIE_ABAS.map((x) => x[0]));
      for (const x of ['fixas', 'fechamento', 'trilha']) assert.ok(abas.includes(x), 'aba ' + x);

      // ---------------- Contas fixas
      await page.evaluate(() => OmieTela_abrir_('fixas'));
      await page.locator('.fin-fix-oc').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'fixas'), 'guia Como fazer nesta aba');
      assert.ok(await justificado(page, '.fin-fix-intro'), 'texto justificado');
      const txtFix = await page.locator('#omieCorpo').innerText();
      assert.match(txtFix, /Aluguel da sede[\s\S]*R\$ 2\.500,00 · vencimento 20\/11\/2026 \(vence em 4 dia\(s\)\)/);
      assert.match(txtFix, /Energia do escritório[\s\S]*Valor varia: informe no lançamento/);
      assert.ok(await semRolagem(page), 'contas fixas: rolagem lateral em ' + largura);
      await cap('contas-fixas');
      // formulário de cadastro: todo campo com explicação
      await page.locator('#finFixNova').click();
      await page.locator('#omieFixForm').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('#omieOps_categorias option').length > 1, null, { timeout: 10000 });
      await page.waitForTimeout(300);
      assert.deepEqual(await semDica(page, '#omieFixForm'), [], 'cadastro da conta fixa: todo campo com explicação');
      const dicasForm = await page.evaluate(() => Array.from(document.querySelectorAll('#omieFixForm .omie-dica')).map((d) => d.textContent).join('\n'));
      assert.match(dicasForm, /Fornecedor no Omie: a quem a conta é paga/); assert.match(dicasForm, /Categoria de despesa: em que linha/); assert.match(dicasForm, /Valor varia — confirmar no mês/);
      assert.ok(await semRolagem(page), 'formulário: rolagem lateral em ' + largura);
      await page.locator('#omieFixForm').scrollIntoViewIfNeeded();
      await cap('contas-fixas-cadastro', false);
      // dispensar: campo de motivo com explicação
      await page.locator('[data-fix-acao="DISPENSAR"]').first().click();
      await page.waitForTimeout(200);
      assert.deepEqual(await semDica(page, '.fin-fix-oc-form'), [], 'motivo com explicação');
      await page.locator('.fin-fix-oc-form button', { hasText: 'Cancelar' }).first().click();
      // "Preparar lançamento": Lançamentos e baixas com o formulário preenchido e a faixa da conta fixa
      await page.locator('[data-fix-preparar]').first().click();
      await page.locator('#omieOpsForm').waitFor({ timeout: 10000 });
      await page.waitForTimeout(500);
      const form = await page.evaluate(() => { const f = document.getElementById('omieOpsForm'); const v = (n) => (f.querySelector('[name="' + n + '"]') || {}).value; return [v('valor'), v('vencimento'), v('documento'), v('referencia'), v('pessoaId'), OMIE_OPS_UI.tipo]; });
      assert.deepEqual(form.slice(0, 2), ['2500', '2026-11-20']); assert.match(form[2], /^FX202611-/); assert.match(form[3], /^FIX-.+-202611$/); assert.deepEqual(form.slice(4), ['90', 'pagar']);
      assert.match(await page.locator('#omieOpsEditor').innerText(), /Conta fixa: Aluguel da sede \(11\/2026\)[\s\S]*Nada|Conta fixa: Aluguel da sede \(11\/2026\)/);
      await page.locator('#omieFixFaixa .vg-faixa').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#omieFixFaixa').innerText(), /1 conta fixa para lançar/);
      assert.ok(await semRolagem(page), 'lançamento preparado: rolagem lateral em ' + largura);
      await cap('lancamento-preparado-conta-fixa');
      assert.equal(a.escritas().filter((x) => x.call === 'IncluirContaPagar').length, 0, 'nada foi ao Omie sem confirmar');

      // ---------------- Fechamento do mês (Wanessa)
      await page.evaluate(() => OmieTela_abrir_('fechamento'));
      await page.locator('.fin-fech-item').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'fechamento'), 'guia do fechamento');
      const txtFech = await page.locator('#omieCorpo').innerText();
      assert.match(txtFech, /Fechamento de outubro de 2026: aberto/); assert.match(txtFech, /2 de 6 itens resolvidos/);
      assert.match(txtFech, /Feito por WANESSA FINANCEIRO TESTE em 16\/11\/2026 10:00\. Observação: conciliadas as 3 contas correntes/);
      assert.ok(!/Dispensar neste mês/.test(txtFech), 'o Financeiro não vê o botão de dispensar');
      assert.deepEqual(await semDica(page, '#omieCorpo .cadx-faixa'), [], 'barra do fechamento com a linha de explicação');
      await page.locator('[data-fech-acao="FEITO"]').first().click();
      await page.waitForTimeout(200);
      assert.deepEqual(await semDica(page, '.fin-fech-form'), [], 'observação com explicação');
      assert.ok(await semRolagem(page), 'fechamento: rolagem lateral em ' + largura);
      await cap('fechamento-do-mes');

      // ---------------- Trilha das operações (Wanessa pede)
      await page.evaluate(() => OmieTela_abrir_('trilha'));
      await page.locator('.fin-tri-lista').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'trilha'), 'guia da trilha');
      const txtTri = await page.locator('#omieCorpo').innerText();
      assert.match(txtTri, /Baixa \(pagamento ou recebimento\) · a receber/); assert.match(txtTri, /Estorno de baixa · título NF-001 \(a receber\)[\s\S]*Aguardando a decisão/);
      assert.match(txtTri, /Você fez este pedido: o dono do sistema ou a Diretoria decide/);
      assert.deepEqual(await semDica(page, '#omieCorpo .cadx-faixa'), [], 'filtros da trilha com a linha de explicação');
      assert.equal(await page.locator('[data-tri-op][data-tri-tipo="ESTORNO_BAIXA"]').count(), 1, 'só a baixa sem pedido aberto pode ser pedida');
      await page.locator('[data-tri-op][data-tri-tipo="ESTORNO_BAIXA"]').click();
      await page.locator('.fin-tri-pedido').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.match(await page.locator('.fin-tri-pedido').innerText(), /Prévia do estorno da baixa[\s\S]*R\$ 250,00 em 16\/11\/2026/);
      assert.deepEqual(await semDica(page, '.fin-tri-pedido'), [], 'motivo do pedido com explicação');
      assert.ok(await semRolagem(page), 'trilha: rolagem lateral em ' + largura);
      await cap('trilha-pedido-estorno');
      assert.deepEqual(erros, [], 'erros de JavaScript (Wanessa) em ' + largura);
      await page.close();

      // ---------------- Diretoria: confirma o estorno e vê a lista do fechamento
      const d = await abrirPagina(browser, a, largura, 'dora');
      const pg = d.page;
      await pg.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await pg.evaluate(() => abrir('omie'));
      await pg.locator('#omieCorpo').waitFor({ timeout: 10000 });
      await pg.evaluate(() => OmieTela_abrir_('trilha'));
      await pg.locator('[data-tri="confirmar"]').waitFor({ timeout: 10000 });
      await pg.waitForTimeout(300);
      assert.deepEqual(await semDica(pg, '.fin-tri-ped'), [], 'motivo da decisão com explicação');
      assert.ok(await semRolagem(pg), 'trilha (Diretoria): rolagem lateral em ' + largura);
      if (largura !== 320) await pg.screenshot({ path: path.join(saida, largura + '-trilha-diretoria-decide.png'), fullPage: true });
      await pg.locator('[data-tri="confirmar"]').click();
      await pg.waitForFunction(() => /Estorno de baixa feito no Omie/.test((document.getElementById('finTriAviso') || {}).textContent || ''), null, { timeout: 10000 });
      assert.deepEqual(a.escritas().filter((x) => x.call === 'CancelarRecebimento').map((x) => x.param), [{ codigo_baixa: 7001 }]);
      await pg.waitForTimeout(300);
      assert.match(await pg.locator('#omieCorpo').innerText(), /Estornada em 16\/11\/2026 10:00 \(DORA DIRETORA TESTE\)/);
      await pg.evaluate(() => OmieTela_abrir_('fechamento'));
      await pg.locator('.fin-fech-item').first().waitFor({ timeout: 10000 });
      await pg.evaluate(() => { const e = document.getElementById('finFechEditar'); if (e) e.open = true; });
      await pg.waitForTimeout(300);
      assert.ok(/Dispensar neste mês/.test(await pg.locator('#omieCorpo').innerText()), 'a Diretoria pode dispensar');
      assert.deepEqual(await semDica(pg, '#finFechEditar'), [], 'edição da lista: todo campo com explicação');
      assert.ok(await semRolagem(pg), 'fechamento (Diretoria): rolagem lateral em ' + largura);
      if (largura !== 320) await pg.screenshot({ path: path.join(saida, largura + '-fechamento-diretoria-lista.png'), fullPage: true });
      // Agenda financeira com as contas fixas
      await pg.evaluate(() => OmieTela_abrir_('agenda'));
      await pg.locator('.fin-ag-svg').waitFor({ timeout: 10000 });
      await pg.waitForTimeout(300);
      assert.match(await pg.locator('#omieCorpo').innerText(), /Contas fixas a pagar ainda não lançadas no Omie[\s\S]*conta\(s\) fixa\(s\)/);
      assert.ok(await semRolagem(pg), 'agenda: rolagem lateral em ' + largura);
      if (largura === 1366) await pg.screenshot({ path: path.join(saida, largura + '-agenda-com-contas-fixas.png'), fullPage: true });
      assert.deepEqual(d.erros, [], 'erros de JavaScript (Diretoria) em ' + largura);
      await pg.close();
    }
  } finally { await browser.close(); }
});

test('Onda A: conta fora da lista de sigilo não vê as abas nem os dados', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = cenario();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 1366, 'gil');
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => { const b = document.getElementById('menu-btn-omie'); return !!b && b.style.display !== 'none'; }), false, 'menu do Painel financeiro escondido');
    for (const fn of ['OmieFix_apiTela', 'OmieFech_apiTela', 'OmieTri_apiLista']) {
      const r = await page.evaluate((f) => new Promise((ok) => google.script.run.withSuccessHandler(ok)[f](SGO_getSessionId(), {})), fn);
      assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
    assert.deepEqual(erros, []);
  } finally { await browser.close(); }
});
