// Conferência no navegador (11/11/2026) do custo com cotação e do preço sugerido, na PÁGINA COMPLETA (Index.html com todos os include()
// resolvidos, como o servidor monta). O google.script.run fala com o ambiente de teste do Comercial (tests/_comercial_ambiente.cjs, opção
// cotacaoReal): getSessaoAtual devolve a sessão escolhida e Comercial_api roda o código real; as outras funções respondem "indisponível".
// Sem rede. Uso: FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs output/poderes-20261110/custos-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const raiz = path.resolve(__dirname, '../..');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/venda/AppData/Local/Temp/claude/b22c3c2c767b0e1f/b760404d-992d-45e4-81c0-9f25b85efac9/scratchpad/pw/node_modules/playwright-core');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require(path.join(raiz, 'tests/_comercial_ambiente.cjs'));
const pastaLegado = path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const saida = path.join(__dirname, 'custos-telas');
fs.mkdirSync(saida, { recursive: true });
const exe = process.env.CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PDF = { nome: 'cotacao.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 cotacao').toString('base64') };

function paginaCompleta() { return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')); }

function dados() {
  const a = ambiente({ cotacaoReal: true });
  a.tabelas.COM_PRODUTOS = [
    { ID: 'prod_frag', CODIGO: 'FRAG-01', NOME: 'Fragmentadora de papel de teste', TIPO: 'PRODUTO', CATEGORIA: 'Equipamentos', UNIDADE_MEDIDA: 'un.', PRECO: 18000, CUSTO: '', ATIVO: 'SIM', CRIADO_EM: '2026-10-01T10:00:00.000Z' },
    { ID: 'prod_leg', CODIGO: 'VAL-02', NOME: 'Válvula de segurança de teste', TIPO: 'PRODUTO', CATEGORIA: 'Peças', UNIDADE_MEDIDA: 'un.', PRECO: 1650, CUSTO: 600, ATIVO: 'SIM', CRIADO_EM: '2026-10-01T10:00:00.000Z' }];
  const r = a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: { fornecedor: 'Distribuidora Teste Ltda', data: '2026-10-15', validade: '2026-11-30', arquivo: PDF } });
  assert.equal(r.ok, true, r.message);
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id });
  const s = a.api('s_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: SEM_VIAGEM, escopo: 'Fornecimento para a CME do cliente de teste.', contatoId: contato.id, condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em 30 dias' },
    itens: [{ produtoId: 'prod_frag', descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: '18.000,00' }, { produtoId: 'prod_leg', descricao: 'Válvula de segurança de teste', quantidade: 2, precoUnitario: '1.650,00' }] });
  assert.equal(s.ok, true, s.message);
  return { a, propId: np.proposta.id };
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
    if (fn === 'Comercial_api') return { ok: true, valor: JSON.parse(JSON.stringify(a.api(args[0], args[1], args[2]))) };
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
  await page.waitForTimeout(400);
  return { page, erros };
}
const semRolagem = async (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const checks = [];
  try {
    for (const largura of [1280, 390]) {
      // gestão: catálogo -> Custos a atualizar -> Atualizar custo
      {
        const { a } = dados();
        const { page, erros } = await abrir(browser, a, 'gaspar', largura);
        await page.evaluate(() => abrir('comercial_catalogo'));
        await page.locator('#cmCustosAtu').waitFor({ timeout: 15000 });
        await page.locator('#cmCat table').waitFor();
        assert.match(await page.locator('#cmCatInfo').innerText(), /custo a atualizar/);
        await page.screenshot({ path: path.join(saida, 'catalogo-' + largura + '.png'), fullPage: false });
        await page.locator('#cmCustosAtu').click();
        await page.locator('#cmCuLista table').waitFor({ timeout: 15000 });
        const txt = await page.locator('#cmCuLista').innerText();
        assert.match(txt, /VAL-02/); assert.match(txt, /Custo sem cotação/);
        assert.ok(await semRolagem(page), 'painel sem rolagem lateral em ' + largura);
        await page.screenshot({ path: path.join(saida, 'painel-custos-' + largura + '.png'), fullPage: false });
        await page.locator('#cmCuLista [data-cuat]').first().click();
        await page.locator('#cmCuArq').waitFor({ timeout: 15000 });
        assert.ok(await semRolagem(page), 'janela do custo sem rolagem lateral em ' + largura);
        // gravar sem anexo: a recusa aparece na janela, com o que fazer
        await page.locator('#cmCuValor').fill('650,00');
        await page.getByRole('button', { name: 'Gravar o custo' }).click();
        await page.locator('#cmCuMsg .cm-faixa').waitFor({ timeout: 15000 });
        assert.match(await page.locator('#cmCuMsg').innerText(), /anexe a cotação/);
        await page.screenshot({ path: path.join(saida, 'atualizar-custo-' + largura + '.png'), fullPage: false });
        assert.deepEqual(erros, [], 'sem erro de script');
        checks.push(largura + ' px, gestão: catálogo avisa os custos a atualizar; painel lista o item sem cotação; "Atualizar custo" recusa sem anexo com o que fazer; sem rolagem lateral');
        await page.close();
      }
      // vendedora: proposta, passo 4 com o guia de preço e "Ajustar para o mínimo"
      {
        const { a, propId } = dados();
        const { page, erros } = await abrir(browser, a, 'vera', largura);
        await page.evaluate(() => abrir('comercial_propostas'));
        await page.waitForTimeout(500);
        await page.evaluate((id) => Comercial_abrirProposta_(id), propId);
        await page.locator('[data-passo="4"]').first().waitFor({ timeout: 15000 });
        await page.locator('[data-passo="4"]').first().click();
        await page.locator('#cmGuia').waitFor({ timeout: 15000 });
        const g = await page.locator('#cmGuia').innerText();
        assert.match(g, /R\$ 21\.467,00/); assert.match(g, /abaixo do preço mínimo/); assert.ok(!/custo R\$/.test(g), 'vendedora não vê custo');
        for (const nome of ['Usar preço sugerido', 'Ajustar para o mínimo', 'Manter meu preço e pedir autorização', 'Pedir atualização do custo: VAL-02']) assert.ok(await page.getByRole('button', { name: new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).count(), 'botão ' + nome);
        assert.ok(await semRolagem(page), 'guia sem rolagem lateral em ' + largura);
        await page.locator('#cmGuia').screenshot({ path: path.join(saida, 'guia-preco-' + largura + '.png') });
        await page.getByRole('button', { name: /Pedir atualização do custo: VAL-02/ }).click();
        await page.locator('#cmGuiaMsg .cm-faixa').waitFor({ timeout: 15000 });
        assert.match(await page.locator('#cmGuiaMsg').innerText(), /Pedido enviado/);
        await page.getByRole('button', { name: /Ajustar para o mínimo/ }).click();
        await page.getByText(/Preço mínimo aplicado/).first().waitFor({ timeout: 15000 });
        assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === propId).ITENS_JSON)[0].precoUnitario, 21467);
        await page.screenshot({ path: path.join(saida, 'apos-minimo-' + largura + '.png'), fullPage: false });
        assert.deepEqual(erros, [], 'sem erro de script');
        checks.push(largura + ' px, vendedora: passo 4 mostra mínimo e sugerido sem o custo, as quatro opções; "Pedir atualização do custo" avisa; "Ajustar para o mínimo" grava R$ 21.467,00; sem rolagem lateral');
        await page.close();
      }
    }
    fs.writeFileSync(path.join(__dirname, 'custos-navegador.txt'), 'Conferência no navegador (página completa, ' + new Date().toISOString() + ', Chrome headless)\n' + checks.map((c) => '- ' + c).join('\n') + '\nTelas: output/poderes-20261110/custos-telas/\n');
    console.log('NAVEGADOR OK\n' + checks.join('\n'));
  } finally { await browser.close(); }
})().catch((e) => { console.error('FALHOU: ' + (e && e.stack || e)); process.exitCode = 1; });
