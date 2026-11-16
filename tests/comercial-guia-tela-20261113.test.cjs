// Comercial — guia da viagem dentro da tela (13/11/2026, dono: "a aba embaixo com o texto do que significa e o que tem que fazer").
// No fim do bloco da viagem: aba com passo a passo, cada linha (o que significa, conta, o que fazer, exemplo) e erros comuns.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/comercial-guia-tela-20261113.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };

test('aba "Guia da viagem" no fim do bloco, com cada linha, o que fazer e os erros comuns', () => {
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
  const tela = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v),
    document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), tela);
  const amb = ambiente({ custoAvulso: 0.3 });
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const cx = tela.Comercial_editorCustos_(ok(amb.api('s_vera', 'proposta', { id: np.proposta.id })).proposta);
  const i = cx.indexOf('id="cmCvGuia"');
  assert.ok(i > 0, 'a aba existe');
  assert.ok(i > cx.indexOf('id="cmCvCalc"'), 'fica embaixo, depois do botão Calcular');
  assert.ok(i > cx.indexOf('id="cmCvDet"'), 'fica fora da conta linha por linha');
  const guia = cx.slice(i);
  assert.match(guia, /Guia da viagem: o que significa cada linha e o que fazer/);
  for (const c of ['TRANSPORTE', 'VIAGENS', 'KM', 'PEDAGIO', 'ALIMENTACAO', 'HOSPEDAGEM', 'DIARIA', 'CONDUTA', 'HORAS', 'COMBUSTIVEL', 'OUTROS'])
    assert.match(guia, new RegExp('data-gv="' + c + '"'), c);
  assert.equal((guia.match(/O que significa:/g) || []).length, 11);
  assert.equal((guia.match(/O que fazer:/g) || []).length, 11);
  assert.match(guia, /Passo a passo/); assert.match(guia, /Erros comuns e como acertar/);
  assert.match(guia, /não paga diária a colaboradores/);
  assert.match(guia, /hoje a empresa não usa/);
  assert.match(guia, /R\$\s?\d/, 'valores da política em vigor');
  assert.doesNotMatch(guia, /undefined|NaN/);
  const ajuda = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Guia da viagem: o que significa cada linha e o que fazer/);
});

// Página completa (Index.html com os include() resolvidos), 1366, 390 e 320 px: a aba fica no fim, abre ao toque, sem rolagem lateral
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/comercial-guia-tela-20261113/capturas');
test('página completa: a aba do guia abre embaixo, no computador e no celular', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const a = ambiente();
  a.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  a.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  const { oportunidade } = oportunidadeDeTeste(a);
  const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(a.api('s_vera', 'salvarProposta', { id, escopo: 'Qualificação térmica com relatório ao final.', condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' },
    itens: [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 1, unidade: 'un.', precoUnitario: '4.500,00' }],
    deslocamento: { unidade: 'GO', viagem: { ha: 'SIM', tecnicos: 1, destino: 'Luziânia/GO', kmTrecho: '175', kmConfirmado: true, dias: 2, noites: 1, viagens: 1 }, repasse: 'ITEM' } }));
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('diálogo: ' + d.message()); d.dismiss(); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_vera' }, a.sessoes.s_vera) } };
        if (fn === 'Comercial_api') return { ok: true, valor: JSON.parse(JSON.stringify(a.api(args[0], args[1], args[2]))) };
        return { ok: false, erro: 'indisponível no ensaio: ' + fn };
      });
      await page.addInitScript(() => {
        try { sessionStorage.setItem('SGO_SESSION', 's_vera'); } catch (e) {}
        const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
      await page.evaluate(() => abrir('comercial_propostas'));
      await page.waitForFunction(() => typeof CM !== 'undefined' && CM.ini, null, { timeout: 10000 });
      await page.evaluate((x) => Comercial_abrirProposta_(x), id);
      await page.locator('#cmGavetaCorpo .cm-acoes').first().waitFor({ timeout: 10000 });
      await page.locator('#cmEditor [data-passo="2"]').click();
      await page.locator('#cmCvGuia').waitFor();
      assert.equal(await page.locator('#cmCvGuia').evaluate((d) => d.open), false, 'começa fechada');
      const ordem = await page.evaluate(() => { const g = document.getElementById('cmCvGuia'), c = document.getElementById('cmCvCalc'); return !!(c.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING); });
      assert.ok(ordem, 'embaixo do botão Calcular');
      const sum = page.locator('#cmCvGuia > summary');
      assert.ok((await sum.boundingBox()).height >= 44, 'toque de 44 px');
      await sum.scrollIntoViewIfNeeded(); await sum.click();
      assert.equal(await page.locator('#cmCvGuia').evaluate((d) => d.open), true);
      assert.equal(await page.locator('#cmCvGuia [data-gv]').count(), 11);
      const txt = await page.locator('#cmCvGuia').innerText();
      assert.match(txt, /O que significa:/); assert.match(txt, /O que fazer:/); assert.match(txt, /R\$ 2,50/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral em ' + largura);
      await page.locator('#cmCvGuia').screenshot({ path: path.join(saida, largura + '-guia-aberto.png') });
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
