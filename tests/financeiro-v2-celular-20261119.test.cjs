// Financeiro v2 no celular (19/11/2026, noite): as fotos do iPhone do dono mostraram tabelas com a 1ª coluna de uma letra (texto em pé),
// valores sobrepostos ("R$ 1.018.8R$7230.375,00"), contas de Empresas e bancos com o nome do banco letra por letra e o rótulo
// "Vencimento de" espremido ao lado do campo. O teste da etapa (a) só conferia a rolagem lateral da página, e a captura inteira em
// escala 3 sai em branco nas páginas longas; ninguém via o defeito.
// Aqui o SGO+ de verdade abre como um iPhone (390 x 844 e 320 x 844, escala 3, toque, Safari) no MODO CELULAR do app (#app.modo-mobile),
// com valores grandes, e o detector (tests/_financeiro_v2_celular.cjs) falha se: um texto de 4+ letras ficar com menos de 60 px e quebrado
// em linhas, ou quebrado em mais linhas do que tem palavras; dois textos (ou texto e controle) se cruzarem na parte visível; a página
// rolar para o lado; ou um botão passar da tela. Falha na cand38 (produção de 19/11) e passa na cand39.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('./_financeiro_v2_celular.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = C.S.PASTA;
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');

/** Abre a página (e a aba) e devolve o que o detector achou, com o nome para a mensagem. */
async function conferir(page, mod, aba) {
  await page.evaluate((m) => abrir(m), mod);
  await C.assentar(page, 3000);
  if (aba) { await page.evaluate((x) => { const b = document.querySelector('#omieTela [data-omie-aba="' + x + '"]'); if (b) b.click(); }, aba); await C.assentar(page, 4000); }
  await page.waitForTimeout(400);
  const r = await page.evaluate(C.detectar);
  return { nome: mod + (aba ? '/' + aba : ''), r };
}
const resumo = (x) => x.nome + ': ' + JSON.stringify({ estreito: x.r.estreito.slice(0, 3), sobreposto: x.r.sobreposto.slice(0, 3), rolagemPagina: x.r.rolagemPagina, cortado: x.r.cortado.slice(0, 3) });

test('estrutura: regra do celular só dentro do Financeiro, uma por tipo de tabela, sem partir palavra em letras', () => {
  const comp = ler('JS_Financeiro_V2_Componentes.html');
  const bloco = comp.slice(comp.lastIndexOf('/*', comp.indexOf('19/11/2026 (noite): Financeiro no celular')));
  assert.ok(bloco.length > 1000, 'bloco do celular presente');
  const regras = bloco.split('</style>')[0].replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((x) => x.trim()).filter((x) => x.includes('{'));
  for (const r of regras) assert.match(r.split('{')[0], /^#app\.modo-mobile #omieTela\b/, 'toda regra nova vale só no modo celular e dentro do Financeiro: ' + r.slice(0, 80));
  assert.doesNotMatch(bloco.split('</style>')[0].replace(/\/\*[\s\S]*?\*\//g, ''), /overflow-wrap:\s*anywhere|word-break:\s*break-all/, 'nada de partir palavra em letras');
  // o cartão compacto não pega mais as tabelas de números
  assert.doesNotMatch(comp, /^\s*\.fv-tab-wrap \.cm-tabela tbody tr \{ display: grid !important/m);
  assert.match(comp, /\.fv-tab-wrap\.fv-cartoes \.cm-tabela tbody tr \{ display: grid !important/);
  // números continuam tabela (DRE e "Ver em tabela"); listas de Empresas e bancos são cartões
  assert.match(ler('JS_Financeiro_V2_Painel.html'), /<div class="fv-tab-wrap fv-rolar"><table class="cm-tabela"><thead><tr><th>Linha<\/th>/);
  assert.match(comp, /<details class="fv-graf-tab"><summary>Ver em tabela<\/summary><div class="fv-tab-wrap fv-rolar">/);
  const emp = ler('JS_Financeiro_V2_Empresas.html');
  assert.equal((emp.match(/fv-tab-wrap fv-cartoes/g) || []).length, 3, 'contas, regras e histórico em cartão');
  assert.doesNotMatch(emp, /fv-rolar/);
});

test('celular de verdade (iPhone, modo celular do SGO+): painel, empresas, aprovações e as 17 páginas sem texto em pé, sem sobreposição e sem rolagem lateral', { skip: !chromium && 'Playwright indisponível', timeout: 600000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  const achados = [];
  try {
    for (const largura of [390, 320]) {
      const a = C.ambiente();
      const { page, ctx, erros, modoCelular } = await C.abrirCelular(browser, a, largura, 'admin');
      assert.equal(modoCelular, true, 'modo celular do SGO+ em ' + largura);
      // as telas das fotos do dono, com as tabelas "Ver em tabela" abertas
      const alvo = largura === 390
        ? (await page.evaluate(() => FIN_V2_PAGINAS.map((p) => p[0]))).map((m) => [m, null]).concat([['fin_aprovacoes', 'pagamentos'], ['fin_pagar', 'lancamentos'], ['fin_trilha', 'sigilo'], ['fin_painel', 'v2_dia']])
        : [['fin_painel', null], ['fin_empresas', null], ['fin_aprovacoes', 'pagamentos'], ['fin_bancos', null]];
      for (const [m, aba] of alvo) {
        const x = await conferir(page, m, aba);
        if (C.total(x.r)) achados.push(largura + ' px ' + resumo(x));
      }
      // o Painel mostra a DRE como tabela que rola dentro da caixa, com a 1ª coluna legível
      await page.evaluate(() => abrir('fin_painel')); await C.assentar(page, 3000);
      await page.evaluate(() => document.querySelector('#omieTela [data-omie-aba="v2_diretoria"]').click()); await C.assentar(page, 4000);
      const dre = await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('#fvPainel .fv-rolar table')).find((x) => /Linha/.test(x.tHead ? x.tHead.textContent : ''));
        if (!t) return null;
        const td = t.tBodies[0].rows[0].cells[0], wrap = t.parentElement;
        return { disp: getComputedStyle(t.tBodies[0].rows[0]).display, col1: Math.round(td.getBoundingClientRect().width), rola: wrap.scrollWidth > wrap.clientWidth, cabeEmTela: wrap.getBoundingClientRect().right <= innerWidth + 1 };
      });
      assert.ok(dre, 'DRE no painel');
      assert.equal(dre.disp, 'table-row', 'DRE continua tabela');
      assert.ok(dre.col1 >= 120, '1ª coluna da DRE com pelo menos 120 px (' + dre.col1 + ')');
      assert.ok(dre.cabeEmTela, 'a caixa da DRE cabe na tela (a rolagem é dentro dela)');
      // o rótulo do período fica em cima do campo
      await page.evaluate(() => abrir('fin_aprovacoes')); await C.assentar(page, 4000);
      const rot = await page.evaluate(() => { const i = document.querySelector('#omieTela input[id$="De"][placeholder="dd/mm/aaaa"]'); if (!i) return null; const l = i.closest('label'); return { dir: getComputedStyle(l).flexDirection, larg: Math.round(l.getBoundingClientRect().width) }; });
      assert.ok(rot, 'campo "Vencimento de" na Aprovação de pagamentos');
      assert.equal(rot.dir, 'column', 'rótulo em cima do campo');
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await ctx.close();
    }
  } finally { await browser.close(); }
  assert.deepEqual(achados, [], 'defeitos visuais no celular:\n' + achados.join('\n'));
});

test('computador (1366 px) continua igual: tabelas de números e de contas como tabela, sem rolagem lateral', { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const a = C.ambiente();
    const { page, ctx, erros, modoCelular } = await C.abrirCelular(browser, a, 1366, 'admin');
    assert.equal(modoCelular, false);
    const achados = [];
    for (const m of ['fin_painel', 'fin_empresas', 'fin_aprovacoes']) { const x = await conferir(page, m, null); if (C.total(x.r)) achados.push(resumo(x)); }
    assert.deepEqual(achados, []);
    await page.evaluate(() => abrir('fin_empresas')); await C.assentar(page, 4000);
    const disp = await page.evaluate(() => { const t = document.querySelector('#fvEmp .fv-contas-tab table'); return t ? [getComputedStyle(t).display, getComputedStyle(t.tHead).display, getComputedStyle(t.tBodies[0].rows[0]).display] : null; });
    assert.deepEqual(disp, ['table', 'table-header-group', 'table-row'], 'contas como tabela no computador');
    assert.deepEqual(erros, []);
    await ctx.close();
  } finally { await browser.close(); }
});
