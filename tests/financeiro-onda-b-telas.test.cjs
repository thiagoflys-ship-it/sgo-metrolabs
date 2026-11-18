// Onda B do Financeiro (B2, B3, B4 e o achado M8), 18/11/2026, na página completa do SGO+ a 1366, 390 e 320 px: aba "Compras e Caju no
// Omie", o lançamento preparado em Lançamentos e baixas (com a busca do fornecedor pelo CNPJ) e a prévia, as Regras do Financeiro e a
// Conciliação das faturas de Compras com os estornos. Confere: sem erro de JavaScript, sem rolagem lateral, guia "Como fazer nesta aba",
// explicação embaixo de cada campo e texto justificado; quem está fora da lista de sigilo não vê nada. Capturas em
// output/financeiro-20261118-onda-b/capturas (1366 e 390). Código REAL do SGO+ com o OMIE SIMULADO; nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { montarOndaB, semRolagem } = require('./_financeiro_onda_b.cjs');
const S = require('./_financeiro_simulado.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_ONDA_B || path.join(__dirname, '../output/financeiro-20261118-onda-b/capturas');

/** Cenário: fatura e uma compra lançadas, a fatura com valor diferente no Omie; fatura de dezembro com estornos em Compras. */
function cenario() {
  const a = montarOndaB();
  for (const ref of ['FAT-4321-202611', 'CMP-REQ-2026-0101-1']) assert.equal(a.lancar(ref).confirmar.ok, true, ref);
  a.contasPagar[0].valor_documento = 1300;
  assert.equal(a.F('OmieEsp_apiConferir', 'wanessa', {}).ok, true);
  const t = a.tabelas;
  t.CMP_REQUISICOES.push({ ID: 'ra', NUMERO: 'REQ-2026-0120', TITULO: 'Vedação da porta', VINCULO_TIPO: 'CLIENTE', CLIENTE_NOME: 'Hospital Teste Alfa', COMPRADO_POR_ID: 'u_tec', COMPRADO_POR_NOME: 'TIAGO TECNICO TESTE' },
    { ID: 'rb', NUMERO: 'REQ-2026-0121', TITULO: 'Papel para a impressora', VINCULO_TIPO: 'INTERNO', COMPRADO_POR_ID: 'u_tec', COMPRADO_POR_NOME: 'TIAGO TECNICO TESTE' });
  t.CMP_PARCELAS.push({ ID: 'xa', PEDIDO_ID: '', REQUISICAO_ID: 'ra', REQUISICAO_NUMERO: 'REQ-2026-0120', FORMA: 'CARTAO_CREDITO', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', PARCELA: 1, PARCELAS: 1, VALOR: 300, DATA_COMPRA: '2026-11-04', COMPETENCIA: '2026-12', VENCIMENTO: '2026-12-10', SITUACAO: 'CONCILIADA', EXTRATO_ID: 'e1', ESTORNO_EXTRATO_ID: 'e2', ESTORNO_VALOR: 300 },
    { ID: 'xb', PEDIDO_ID: '', REQUISICAO_ID: 'rb', REQUISICAO_NUMERO: 'REQ-2026-0121', FORMA: 'CARTAO_CREDITO', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', PARCELA: 1, PARCELAS: 1, VALOR: 25, DATA_COMPRA: '2026-11-05', COMPETENCIA: '2026-12', VENCIMENTO: '2026-12-10', SITUACAO: 'A_CONCILIAR' });
  t.CMP_EXTRATO = [
    { ID: 'e1', FATURA_ID: 'ft2', LINHA: 2, DATA: '2026-11-04', DESCRICAO: 'LOJA DE PECAS TESTE', VALOR: 300, CARTAO_FINAL: '4321', PARCELA_ID: 'xa', SITUACAO: 'CONCILIADA', MOTIVO: 'Casamento automático (valor, data e parcela).' },
    { ID: 'e2', FATURA_ID: 'ft2', LINHA: 3, DATA: '2026-11-06', DESCRICAO: 'ESTORNO LOJA DE PECAS TESTE', VALOR: -300, CARTAO_FINAL: '4321', PARCELA_ID: 'xa', ORIGEM_EXTRATO_ID: 'e1', SITUACAO: 'ESTORNO', MOTIVO: 'Casamento automático do estorno (mesmo cartão, mesmo valor e descrição parecida).' },
    { ID: 'e3', FATURA_ID: 'ft2', LINHA: 4, DATA: '2026-11-07', DESCRICAO: 'CREDITO AJUSTE ANUIDADE', VALOR: -25, CARTAO_FINAL: '4321', PARCELA_ID: '', ORIGEM_EXTRATO_ID: '', SITUACAO: 'ESTORNO_SEM_ORIGEM', MOTIVO: '' }];
  t.CMP_IMPORTACOES = [];
  a.limparCache();
  return a;
}
async function abrirPagina(browser, a, largura, login) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (/^(Omie|Fin_api|FinCob_api|FinAg_api|FinRel_api|FinIa_api|Compras_api|Poderes_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
const semDica = (page, sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s + ' input, ' + s + ' select, ' + s + ' textarea')).filter((el) => {
  if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'file' || el.offsetParent === null) return false;
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

test('Compras e Caju no Omie, lançamento preparado, Regras do Financeiro e estornos em Compras (1366, 390 e 320 px), com capturas', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const a = cenario();
      const { page, erros } = await abrirPagina(browser, a, largura, 'wanessa');
      const cap = (p, nome) => (largura === 320 ? Promise.resolve() : p.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: true }));
      await abrirPainel(page);
      assert.ok((await page.evaluate(() => OMIE_ABAS.map((x) => x[0]))).includes('espelho'));

      // ---------------- aba nova
      await page.evaluate(() => OmieTela_abrir_('espelho'));
      await page.locator('.fin-esp-item').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.ok(await guia(page, 'espelho'), 'guia Como fazer nesta aba');
      assert.ok(await justificado(page, '.fin-esp-intro'), 'texto justificado');
      const txt = await page.locator('#omieCorpo').innerText();
      assert.match(txt, /Diferenças com o Omie[\s\S]*No Omie o título \d+ está com R\$ 1\.300,00; no SGO\+ o valor é R\$ 1\.234,50/);
      assert.match(txt, /Para lançar[\s\S]*Taxa do Caju · viagem VG-2026-0007[\s\S]*REQ-2026-0104 · Mangueira de silicone/, 'em ordem de vencimento');
      assert.match(txt, /Lançados no Omie[\s\S]*REQ-2026-0101/);
      assert.match(txt, /A lista começa em 11\/2026/);
      await page.locator('.fin-esp-det summary').click();
      assert.match(await page.locator('.fin-esp-det').innerText(), /ainda não conferida pelo Financeiro/);
      assert.deepEqual(await semDica(page, '#omieCorpo'), [], 'aba: todo campo com explicação');
      assert.ok(await semRolagem(page), 'aba: rolagem lateral em ' + largura);
      await cap(page, 'compras-caju-no-omie');
      // formulário de "Já lancei direto no Omie" com explicação
      await page.locator('[data-esp-acao="LANCADO_DIRETO"]').first().click();
      await page.waitForTimeout(200);
      assert.deepEqual(await semDica(page, '.fin-esp-form'), [], 'motivo e número do título com explicação');
      await page.locator('.fin-esp-form button', { hasText: 'Cancelar' }).first().click();

      // ---------------- preparar: abre Lançamentos e baixas preenchido, com a busca pelo CNPJ
      const ch = await page.evaluate(() => FIN_ESP_TELA.dados.paraLancar.find((x) => x.referencia === 'CMP-REQ-2026-0104-1').chave);
      await page.locator('[data-esp-preparar="' + ch + '"]').click();
      await page.locator('#omieOpsForm').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('#omieOps_categorias option').length > 1 && document.querySelectorAll('#omieOps_contas option').length > 1, null, { timeout: 10000 });
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => [OMIE_OPS_UI.acao, OMIE_OPS_UI.tipo].join('|')), 'criar|pagar');
      const form = await page.evaluate(() => { const f = document.getElementById('omieOpsForm'), v = (n) => (f.querySelector('[name="' + n + '"]') || {}).value; return [v('documento'), v('valor'), v('vencimento'), v('referencia'), v('pessoaId')]; });
      assert.deepEqual(form, ['REQ-2026-0104', '210', '2026-11-30', 'CMP-REQ-2026-0104-1', '55'], 'fornecedor lembrado do lançamento anterior do mesmo CNPJ');
      assert.match(await page.locator('.fin-esp-aviso-lanc').innerText(), /Compra: REQ-2026-0104 · Mangueira de silicone[\s\S]*referência única CMP-REQ-2026-0104-1/);
      assert.deepEqual(await semDica(page, '#omieOpsForm'), [], 'novo lançamento: todo campo com explicação');
      assert.ok(await semRolagem(page), 'lançamento preparado: rolagem lateral em ' + largura);
      await page.locator('#omieOpsEditor').scrollIntoViewIfNeeded();
      await cap(page, 'compras-caju-lancamento-preparado');
      await page.evaluate(() => { const f = document.getElementById('omieOpsForm'); f.querySelector('[name="categoria"]').value = '2.10'; f.querySelector('[name="contaId"]').value = '5'; });
      await page.locator('#omieOpsPrever').click();
      await page.locator('.omie-previa-caixa').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      assert.match(await page.locator('#omieOpsPrevia').innerText(), /Origem no SGO\+[\s\S]*REQ-2026-0104 · Mangueira de silicone · R\$ 210,00/);
      assert.ok(await semRolagem(page), 'prévia: rolagem lateral em ' + largura);
      await cap(page, 'compras-caju-previa');
      assert.equal(a.inclusoes().length, 2, 'a prévia não grava no Omie');
      // carga do Caju sem fornecedor lembrado: a busca no Omie já roda com "Caju"
      await page.evaluate(() => OmieTela_abrir_('espelho'));
      await page.locator('.fin-esp-item').first().waitFor({ timeout: 10000 });
      const chc = await page.evaluate(() => FIN_ESP_TELA.dados.paraLancar.find((x) => x.referencia === 'CJU-V-c1').chave);
      await page.locator('[data-esp-preparar="' + chc + '"]').click();
      await page.locator('#omieCadResultado li').first().waitFor({ timeout: 10000 });
      assert.match(await page.locator('#omieCadResultado').innerText(), /CAJU BENEFICIOS FICTICIA SA/);
      assert.match(await page.locator('.fin-esp-aviso-lanc').innerText(), /Carga Caju de viagem: Viagem VG-2026-0007[\s\S]*já foi paga ao Caju em 14\/11\/2026/);
      assert.ok(await semRolagem(page), 'carga do Caju: rolagem lateral em ' + largura);
      await page.locator('#omieOpsEditor').scrollIntoViewIfNeeded();
      await cap(page, 'compras-caju-carga-caju-preparada');
      // faixa de Lançamentos e baixas
      await page.evaluate(() => OmieTela_abrir_('lancamentos'));
      await page.locator('#omieEspFaixa .vg-faixa').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#omieEspFaixa').innerText(), /Compras e Caju: \d+ itens para lançar, \d+ já no vencimento; 1 diferença com o Omie/);

      // ---------------- Regras do Financeiro: de-para com os tipos novos e a configuração
      await page.evaluate(() => OmieTela_abrir_('regras'));
      await page.locator('#omieRegraTipo').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      const tipos = await page.evaluate(() => Array.from(document.querySelectorAll('#omieRegraTipo option')).map((o) => o.textContent).join('|'));
      assert.match(tipos, /Compra para cliente, atendimento ou chamado \(conta a pagar\)[\s\S]*Fatura do cartão da empresa[\s\S]*Taxa de serviço do Caju/);
      assert.match(await page.locator('#omieCorpo').innerText(), /Compras e Caju no Omie: departamento[\s\S]*Não envia departamento \(padrão; a estrutura de centros de custo depende do contador\)[\s\S]*início da lista[\s\S]*A partir de 11\/2026/);
      assert.ok(await semRolagem(page), 'regras: rolagem lateral em ' + largura);
      await cap(page, 'regras-financeiro-depara-onda-b');

      // ---------------- Compras > Conciliação das faturas: estornos (M8)
      await page.evaluate(() => abrir('compras_conciliacao'));
      await page.locator('#cfFinal').waitFor({ timeout: 10000 });
      await page.evaluate(() => { const m = document.getElementById('cfMes'); m.value = '2026-12'; m.dispatchEvent(new Event('change')); });
      await page.waitForTimeout(300);
      await page.evaluate(() => { const s = document.getElementById('cfFinal'); s.value = '4321'; s.dispatchEvent(new Event('change')); });
      await page.locator('#cfCorpo table').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      const tc = await page.locator('#cfCorpo').innerText();
      assert.match(tc, /ESTORNO LOJA DE PECAS TESTE[\s\S]*Estorno casado com a compra/);
      assert.match(tc, /CREDITO AJUSTE ANUIDADE[\s\S]*Estorno sem a compra de origem[\s\S]*Casar com a compra/);
      assert.match(tc, /Estornada na fatura \(R\$ 300,00\)/);
      assert.match(tc, /1 estorno\(s\) sem a compra de origem/);
      assert.ok(await semRolagem(page), 'conciliação: rolagem lateral em ' + largura);
      await cap(page, 'compras-conciliacao-estornos');
      // casar o estorno pela janela: a compra de valor mais perto vem primeiro
      await page.locator('[data-cfa="casar"][data-ext="e3"]').click();
      await page.locator('#cfParc').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cfParc option').first().innerText(), /REQ-2026-0121 · 1\/1 · R\$ 25,00/);
      await page.fill('#cfMot', 'Ajuste de anuidade devolvido junto com a compra de papel');
      await cap(page, 'compras-conciliacao-casar-estorno');
      await page.locator('.cp-modal [data-ok], [data-ok]').last().click();
      await page.waitForFunction(() => !document.getElementById('cfParc'), null, { timeout: 10000 });
      await page.waitForTimeout(400);
      assert.equal(a.tabelas.CMP_EXTRATO.find((x) => x.ID === 'e3').SITUACAO, 'ESTORNO');
      const errosSemAlerta = erros.filter((e) => !/^janela do navegador: Estorno casado com a compra REQ-2026-0121/.test(e));
      assert.deepEqual(errosSemAlerta, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('Compras e Caju no Omie: conta fora da lista de sigilo não vê a aba nem os dados', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = cenario();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 1366, 'gil');
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => { const b = document.getElementById('menu-btn-omie'); return !!b && b.style.display !== 'none'; }), false, 'menu do Painel financeiro escondido');
    for (const fn of ['OmieEsp_apiTela', 'OmieEsp_apiPreparar', 'OmieEsp_apiItem', 'OmieEsp_apiConferir', 'OmieEsp_apiResumo']) {
      const r = await page.evaluate((f) => new Promise((ok) => google.script.run.withSuccessHandler(ok)[f](SGO_getSessionId(), { chave: 'COMPRA|x1|' })), fn);
      assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
    assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmieEsp_apiTela' && x.RESULTADO === 'NEGADO'));
    assert.deepEqual(erros, []);
  } finally { await browser.close(); }
});
