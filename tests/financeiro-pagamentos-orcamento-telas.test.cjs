// B1 (aprovação de pagamentos), C3 (orçamento anual) e as pendências da onda 1 (parcelamento e lançamento avulso na conta corrente), na
// página completa do SGO+ a 1366, 390 e 320 px: sem erro de JavaScript, sem rolagem lateral, guia "Como fazer nesta aba", explicação
// embaixo de cada campo e texto justificado. Grava as capturas em output/financeiro-20261118-b1-c3/capturas (1366 e 390).
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs); nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { montarB1C3, abrirPagina, semRolagem } = require('./_financeiro_b1c3.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_B1C3 || path.join(__dirname, '../output/financeiro-20261118-b1-c3/capturas');

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CSV = 'codigo;descricao;' + MESES.join(';') + '\n2.03;Combustível;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;4.000,00;5.000,00\n2.10;Terceiros;;;;;;;;;;;3.000,00;\n';

/** Cenário simulado: lista enviada (101 aprovado; 102 e 105 aguardando), orçamento 2026 vigente com revisão aguardando, rascunho de 2027. */
function cenario() {
  const a = montarB1C3();
  assert.equal(a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [101, 102, 105], obs: 'fornecedor cobra multa a partir de amanhã' }).ok, true);
  const i101 = a.itensPag().find((x) => x.TITULO_OMIE === '101');
  assert.equal(a.F('OmiePag_apiDecidir', 'dora', { decisao: 'aprovar', itens: [i101.ID] }).ok, true);
  const n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'VAZIO' });
  a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: CSV });
  a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: n.id, motivo: 'orçamento inicial combinado com a Diretoria' });
  assert.equal(a.F('OmieOrc_apiDecidir', 'dora', { versaoId: n.id, decisao: 'aprovar' }).ok, true);
  assert.equal(a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-11', ler: true }).ok, true);
  const r = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'COPIA_VIGENTE' });
  a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: r.id, alteracoes: [{ codigo: '2.03', mes: 12, valor: '6.000,00' }] });
  assert.equal(a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: r.id, motivo: 'reajuste do combustível em dezembro' }).ok, true);
  assert.equal(a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2027, partida: 'COPIA_ANO_ANTERIOR' }).ok, true);
  a.limparCache();
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
const abrirPainel = async (page) => {
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
  await page.evaluate(() => abrir('omie'));
  await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
};

test('B1, C3, parcelamento e avulso na página completa (1366, 390 e 320 px), com guia, explicação de cada campo e capturas', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const a = cenario();
      const { page, erros } = await abrirPagina(browser, a, largura, 'wanessa');
      const cap = (p, nome, cheia) => (largura === 320 ? Promise.resolve() : p.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: cheia !== false }));
      await abrirPainel(page);
      const abas = await page.evaluate(() => OMIE_ABAS.map((x) => x[0]));
      for (const x of ['pagamentos', 'orcamento']) assert.ok(abas.includes(x), 'aba ' + x);

      // ---------------- Aprovação de pagamentos (Wanessa)
      await page.evaluate(() => OmieTela_abrir_('pagamentos'));
      await page.locator('.fin-pag-cand').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'pagamentos'), 'guia Como fazer nesta aba');
      assert.ok(await justificado(page, '.fin-pag-intro'), 'texto justificado');
      const txtPag = await page.locator('#omieCorpo').innerText();
      assert.match(txtPag, /Aguardando aprovação desde 16\/11\/2026 10:00 \(enviado por WANESSA FINANCEIRO TESTE\)\. Quem aprova: DORA DIRETORA TESTE ou DONO DO SISTEMA TESTE/);
      assert.match(txtPag, /Aprovados: liberados para pagar[\s\S]*Aprovado por DORA DIRETORA TESTE em 16\/11\/2026 10:00: liberado para pagar R\$ 1\.000,00/);
      assert.ok(!/Para a sua aprovação/.test(await page.locator('#finPagCorpo').innerText()), 'o Financeiro não vê a área de aprovação');
      assert.deepEqual(await semDica(page, '#omieCorpo'), [], 'aprovação de pagamentos: todo campo com explicação');
      assert.ok(await semRolagem(page), 'aprovação de pagamentos: rolagem lateral em ' + largura);
      await cap(page, 'aprovacao-pagamentos-financeiro');
      await page.locator('[data-pag-acao="retirar"]').first().click();
      await page.waitForTimeout(200);
      assert.deepEqual(await semDica(page, '.fin-pag-form'), [], 'motivo da retirada com explicação');
      await page.locator('.fin-pag-form button', { hasText: 'Cancelar' }).first().click();
      // "Registrar a baixa" do aprovado abre Lançamentos e baixas com a baixa do título 101
      await page.locator('[data-pag-baixa="101"]').click();
      await page.locator('#omieOpsForm').waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => [OMIE_OPS_UI.acao, OMIE_OPS_UI.tipo, OMIE_OPS_UI.id].join('|')), 'baixar|pagar|101');

      // ---------------- Lançamentos e baixas: situação da aprovação na lista, parcelamento e avulso
      await page.evaluate(() => { OMIE_OPS_UI.tipo = 'pagar'; OmieTela_abrir_('lancamentos'); });
      await page.locator('#omieOpsLista table').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      const txtLista = await page.locator('#omieOpsLista').innerText();
      assert.match(txtLista, /Aprovado por DORA DIRETORA TESTE/); assert.match(txtLista, /Aguardando aprovação desde 16\/11\/2026 10:00/);
      assert.ok(await semRolagem(page), 'lista a pagar: rolagem lateral em ' + largura);
      await cap(page, 'lancamentos-pagar-situacao-aprovacao');
      // novo lançamento parcelado
      await page.evaluate(() => OmieOps_form_('criar'));
      await page.locator('#omieOpsForm [name="parcelas"]').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('#omieOps_categorias option').length > 1 && document.querySelectorAll('#omieOps_contas option').length > 1, null, { timeout: 10000 });
      await page.waitForTimeout(300);
      assert.deepEqual(await semDica(page, '#omieOpsForm'), [], 'novo lançamento: todo campo com explicação (parcelas e intervalo inclusive)');
      const dicasParc = await page.evaluate(() => Array.from(document.querySelectorAll('#omieOpsForm .omie-dica')).map((d) => d.textContent).join('\n'));
      assert.match(dicasParc, /Parcelas: em quantas vezes[\s\S]*o "Valor do documento" é o total/); assert.match(dicasParc, /Intervalo entre as parcelas: mensal/);
      await page.evaluate(() => {
        const f = document.getElementById('omieOpsForm'), v = (n, x) => { const e = f.querySelector('[name="' + n + '"]'); e.value = x; };
        const pid = f.querySelector('[name="pessoaId"]'); if (pid) pid.value = '90';
        v('documento', 'NF-9'); v('valor', '1000'); v('vencimento', '2026-12-31'); v('categoria', '2.10'); v('contaId', '5'); v('referencia', 'REF-9'); v('parcelas', '3'); v('intervalo', 'MENSAL');
      });
      await page.locator('#omieOpsPrever').click();
      await page.locator('.omie-previa-caixa').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.match(await page.locator('#omieOpsPrevia').innerText(), /Parcela 001\/003[\s\S]*31\/12\/2026[\s\S]*R\$ 333,33[\s\S]*Parcela 003\/003[\s\S]*28\/02\/2027[\s\S]*R\$ 333,34/);
      assert.ok(await semRolagem(page), 'prévia parcelada: rolagem lateral em ' + largura);
      await page.locator('#omieOpsEditor').scrollIntoViewIfNeeded();
      await cap(page, 'lancamento-parcelado-previa');
      // lançamento avulso na conta corrente
      await page.locator('button', { hasText: 'Lançamento avulso na conta' }).click();
      await page.waitForFunction(() => document.querySelectorAll('#finLccConta option').length > 1 && document.querySelectorAll('#finLccCat option').length > 1, null, { timeout: 10000 });
      await page.waitForTimeout(300);
      assert.deepEqual(await semDica(page, '#omieOpsForm'), [], 'avulso: todo campo com explicação');
      const dicasLcc = await page.evaluate(() => Array.from(document.querySelectorAll('#omieOpsForm .omie-dica')).map((d) => d.textContent).join('\n'));
      assert.match(dicasLcc, /Tipo do lançamento: saída \(tarifa bancária, juros, IOF\)/); assert.match(dicasLcc, /Referência única: um código deste lançamento/);
      await page.evaluate(() => { const f = document.getElementById('omieOpsForm'); f.querySelector('[name="contaId"]').value = '5'; f.querySelector('[name="valor"]').value = '35.90'; f.querySelector('[name="categoria"]').value = '2.03'; f.querySelector('[name="observacao"]').value = 'tarifa do pacote de serviços'; });
      await page.locator('#omieOpsPrever').click();
      await page.locator('.omie-previa-caixa').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.match(await page.locator('#omieOpsPrevia').innerText(), /Saída da conta[\s\S]*R\$ 35,90[\s\S]*A confirmar na 1ª operação acompanhada/);
      // transferência mostra a conta de destino, com explicação
      await page.locator('button', { hasText: 'Revisar campos' }).click();
      await page.selectOption('#finLccTipo', 'TRANSFERENCIA');
      await page.waitForTimeout(300);
      assert.deepEqual(await semDica(page, '#omieOpsForm'), [], 'transferência: conta de destino com explicação');
      assert.ok(await semRolagem(page), 'avulso: rolagem lateral em ' + largura);
      await page.locator('#omieOpsEditor').scrollIntoViewIfNeeded();
      await cap(page, 'lancamento-avulso-conta-corrente');
      assert.equal(a.escritas().filter((x) => /Incluir/.test(x.call)).length, 0, 'nada foi ao Omie sem confirmar');

      // ---------------- Orçamento anual (Wanessa): rascunho de 2027 e acompanhamento de 11/2026
      await page.evaluate(() => { FIN_ORC_TELA.ano = 2027; FIN_ORC_TELA.mes = '2026-11'; OmieTela_abrir_('orcamento'); });
      await page.locator('.fin-orc-cel').first().waitFor({ timeout: 10000 });
      await page.locator('#finOrcAcomp table').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'orcamento'), 'guia do orçamento');
      assert.ok(await justificado(page, '.fin-orc-intro'), 'texto justificado');
      const txtOrc = await page.locator('#omieCorpo').innerText();
      assert.match(txtOrc, /Versão 1 de 2027 · Em preparação/); assert.match(txtOrc, /O Omie não recebe orçamento pela API/);
      assert.match(txtOrc, /Combustível\s+R\$\s4\.000,00\s+R\$\s5\.000,00\s+R\$\s1\.000,00\s+25 %/);
      assert.deepEqual(await semDica(page, '#omieCorpo'), [], 'orçamento: todo campo com explicação (as células apontam para a explicação da grade)');
      assert.ok(await semRolagem(page), 'orçamento: rolagem lateral em ' + largura);
      await cap(page, 'orcamento-rascunho-e-acompanhamento');
      // gravar uma célula mudada pela tela
      await page.locator('.fin-orc-cel[data-cod="2.03"][data-mes="1"]').fill('5.500,00');
      await page.locator('#finOrcGravar').click();
      await page.waitForFunction(() => /Rascunho gravado \(1 valor\(es\) mudado\(s\)\)/.test((document.getElementById('finOrcAviso') || {}).textContent || ''), null, { timeout: 10000 });
      assert.deepEqual(erros, [], 'erros de JavaScript (Wanessa) em ' + largura);
      await page.close();

      // ---------------- Diretoria: aprova a lista e decide a revisão do orçamento
      const d = await abrirPagina(browser, a, largura, 'dora');
      const pg = d.page;
      await abrirPainel(pg);
      assert.match(await pg.locator('#omieFaixaPagamentos').innerText(), /2 pagamento\(s\) aguardando a sua aprovação/);
      await pg.evaluate(() => OmieTela_abrir_('pagamentos'));
      await pg.locator('#finPagAprovarTodos').waitFor({ timeout: 10000 });
      await pg.waitForTimeout(300);
      assert.match(await pg.locator('#omieCorpo').innerText(), /Para a sua aprovação[\s\S]*2 pagamento\(s\) aguardando, total R\$ 2\.546,40/);
      await pg.locator('[data-pag-acao="adiar"]').first().click();
      await pg.waitForTimeout(200);
      assert.deepEqual(await semDica(pg, '.fin-pag-form'), [], 'adiar: data e motivo com explicação');
      assert.ok(await semRolagem(pg), 'aprovação (Diretoria): rolagem lateral em ' + largura);
      await cap(pg, 'aprovacao-pagamentos-diretoria');
      await pg.locator('.fin-pag-form button', { hasText: 'Cancelar' }).first().click();
      await pg.locator('#finPagAprovarTodos').click();
      await pg.waitForFunction(() => /2 pagamento\(s\) aprovado\(s\)/.test((document.getElementById('finPagAviso') || {}).textContent || ''), null, { timeout: 10000 });
      assert.equal(a.itensPag().filter((x) => x.SITUACAO === 'APROVADO').length, 3);
      await pg.evaluate(() => { FIN_ORC_TELA.ano = 2026; FIN_ORC_TELA.mes = '2026-11'; OmieTela_abrir_('orcamento'); });
      await pg.locator('#finOrcAprovar').waitFor({ timeout: 10000 });
      await pg.waitForTimeout(300);
      assert.match(await pg.locator('#omieCorpo').innerText(), /Versão 2 de 2026 · Aguardando aprovação[\s\S]*Aguardando aprovação desde 16\/11\/2026 10:00 \(enviada por WANESSA FINANCEIRO TESTE\)/);
      assert.deepEqual(await semDica(pg, '#omieCorpo'), [], 'decisão do orçamento: motivo com explicação');
      assert.ok(await semRolagem(pg), 'orçamento (Diretoria): rolagem lateral em ' + largura);
      await cap(pg, 'orcamento-diretoria-decide');
      await pg.locator('#finOrcAprovar').click();
      await pg.waitForFunction(() => /Versão 2 aprovada/.test((document.getElementById('finOrcAviso') || {}).textContent || ''), null, { timeout: 10000 });
      assert.deepEqual(d.erros, [], 'erros de JavaScript (Diretoria) em ' + largura);
      await pg.close();
    }
  } finally { await browser.close(); }
});

test('B1 e C3: conta fora da lista de sigilo não vê as abas nem os dados', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = cenario();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 1366, 'gil');
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => { const b = document.getElementById('menu-btn-omie'); return !!b && b.style.display !== 'none'; }), false, 'menu do Painel financeiro escondido');
    for (const fn of ['OmiePag_apiTela', 'OmiePag_apiDecidir', 'OmieOrc_apiTela', 'OmieOrc_apiAcompanhar', 'OmieLcc_apiCategorias']) {
      const r = await page.evaluate((f) => new Promise((ok) => google.script.run.withSuccessHandler(ok)[f](SGO_getSessionId(), { mes: '2026-11' })), fn);
      assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
    assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmiePag_apiTela' && x.RESULTADO === 'NEGADO'));
    assert.deepEqual(erros, []);
  } finally { await browser.close(); }
});
