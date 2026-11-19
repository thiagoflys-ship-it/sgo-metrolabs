// 19/11/2026 — telas da etapa E1 (estudo output/contratos-aditivo-20261119/ESTUDO.md) no navegador, na PÁGINA COMPLETA do SGO+
// (Index.html com os include() resolvidos, como o servidor monta). O google.script.run fala com os ambientes de teste: Viagem_api
// (aditivo de recarga) e Compras_api (compra de contrato) rodam o código REAL; nada sai (WhatsApp, e-mail e Caju simulados).
// Fluxos: técnico pede o aditivo pelo celular (390 px); sócio aprova (1366 e 390 px); viagem com o bloco dos aditivos; informar
// compra de contrato (1366 e 390 px) e corrigir o vínculo. Sem erro de JavaScript, sem diálogo do navegador e sem rolagem lateral.
// Capturas: CAPTURAS_E1 (padrão output/contratos-aditivo-20261119/e1/capturas).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium = null;
try { ({ chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright')); } catch (e) { chromium = null; }
const { ambienteCaju, PASTA } = require('./_caju_ambiente.cjs');
const C = require('./_compras_ambiente.cjs');

const saida = process.env.CAPTURAS_E1 || path.join(__dirname, '../output/contratos-aditivo-20261119/e1/capturas');
fs.mkdirSync(saida, { recursive: true });
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');

async function abrir(browser, ctx, sessoes, login, largura, menu) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo do navegador aberto: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (typeof ctx[fn] === 'function' && /^(Viagem_api|Poderes_api|Compras_api)$/.test(fn)) return { ok: true, valor: JSON.parse(JSON.stringify(ctx[fn](...args))) };
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
  if (menu) await page.waitForFunction((m) => { const b = document.getElementById(m); return b && b.style.display === ''; }, menu, { timeout: 10000 });
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const foto = (page, nome) => page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true });

let browser = null;
test.before(async () => { if (chromium) browser = await chromium.launch({ headless: true }); });
test.after(async () => { if (browser) await browser.close(); });

test('E1b telas: técnico pede o aditivo no celular; sócio aprova no computador e no celular; a viagem mostra o aditivo', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = ambienteCaju({ credenciais: false });
  const s = a.aprovada();
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: a.pdf('carga.pdf') }));
  a.mudar('2026-10-27T21:00:00-03:00');
  // 1. técnico (390 px): aba Aditivos de recarga, formulário, recusa na própria tela e envio
  {
    const { page, erros } = await abrir(browser, a.ctx, a.sessoes, 'tiago', 390, 'menu-btn-deposito_viagem');
    await page.evaluate(() => abrir('deposito_viagem'));
    await page.getByRole('tab', { name: /Aditivos de recarga/ }).click();
    await page.locator('#vgAdtPedir').waitFor();
    assert.ok(await semRolagemLateral(page)); await foto(page, '390-tecnico-pedir-aditivo');
    await page.selectOption('#vgAdCat', 'PECA');
    await page.fill('#vgAdValor', '350,00');
    await page.fill('#vgAdJust', 'curto');
    await page.locator('input[name="vgAdUrg"][value="PARADO"]').check();
    await page.getByRole('button', { name: 'Enviar aos sócios' }).click();
    await page.locator('#vgMsg', { hasText: 'para que é o dinheiro' }).waitFor();
    await page.fill('#vgAdJust', 'Usinagem do eixo da bomba da autoclave, peça quebrada na desmontagem; sem ela o equipamento não volta a operar.');
    await page.getByRole('button', { name: 'Enviar aos sócios' }).click();
    await page.locator('#vgMsg', { hasText: 'enviado às 21:00' }).waitFor();
    await page.locator('.vg-adt', { hasText: 'Aguardando os sócios' }).waitFor();
    assert.equal(a.tabelas.CJU_ADITIVOS.length, 1);
    assert.ok(await semRolagemLateral(page)); await foto(page, '390-tecnico-aditivo-enviado');
    assert.deepEqual(erros, []);
    await page.close();
  }
  // 2. sócio (1366 px): para você agora, aditivo esperando a decisão, aprova
  {
    const { page, erros } = await abrir(browser, a.ctx, a.sessoes, 'admin', 1366, 'menu-btn-deposito_viagem');
    await page.evaluate(() => abrir('deposito_viagem'));
    await page.getByRole('tab', { name: /Aditivos de recarga/ }).click();
    await page.locator('h3', { hasText: 'Esperando a sua decisão' }).waitFor();
    assert.ok(await semRolagemLateral(page)); await foto(page, '1366-socio-aditivo-decidir');
    await page.locator('.vg-adt button', { hasText: /^Aprovar$/ }).click();
    await page.locator('.vg-adt-form textarea').fill('Peça necessária para devolver a autoclave ao cliente');
    await foto(page, '1366-socio-aditivo-aprovar-form');
    await page.locator('.vg-adt-form button', { hasText: /^Aprovar/ }).click();
    await page.locator('#vgMsg', { hasText: 'aprovado (R$ 350,00)' }).waitFor();
    assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, 'APROVADO');
    assert.ok(await semRolagemLateral(page)); await foto(page, '1366-socio-aditivo-aprovado');
    assert.deepEqual(erros, []);
    await page.close();
  }
  // 3. Financeiro (1366 px): a viagem mostra o bloco dos aditivos e o teto da carga
  {
    const { page, erros } = await abrir(browser, a.ctx, a.sessoes, 'wanessa', 1366, 'menu-btn-deposito_viagem');
    await page.evaluate((id) => Viagem_irPara_({ id }), s.id);
    await page.locator('h3', { hasText: /Aditivos de recarga \(1\)/ }).waitFor();
    assert.match(await page.locator('#vgCorpo').innerText(), /Teto da carga do cartão[\s\S]*R\$ 3\.010,00/);
    await foto(page, '1366-viagem-com-aditivo');
    assert.deepEqual(erros, []);
    await page.close();
  }
  // 4. outro aditivo, decidido pela Diretoria no celular (390 px)
  a.ok(a.v('tiago', 'aditivoPedir', { viagemId: s.id, categoria: 'HOSPEDAGEM_EXTRA', valor: '280,00', urgencia: 'PARADO', justificativa: 'Mais uma diária: a peça usinada só fica pronta amanhã cedo.' }));
  {
    const { page, erros } = await abrir(browser, a.ctx, a.sessoes, 'dora', 390, 'menu-btn-deposito_viagem');
    await page.evaluate(() => abrir('deposito_viagem'));
    await page.getByRole('tab', { name: /Aditivos de recarga/ }).click();
    await page.locator('h3', { hasText: 'Esperando a sua decisão' }).waitFor();
    assert.ok(await semRolagemLateral(page)); await foto(page, '390-socio-aditivo-decidir');
    await page.locator('.vg-adt', { hasText: 'Hospedagem extra' }).locator('button', { hasText: /^Aprovar$/ }).click();
    await page.locator('.vg-adt-form button', { hasText: /^Aprovar/ }).click();
    await page.locator('#vgMsg', { hasText: 'aprovado (R$ 280,00)' }).waitFor();
    assert.ok(await semRolagemLateral(page)); await foto(page, '390-socio-aditivo-aprovado');
    assert.deepEqual(erros, []);
    await page.close();
  }
});

test('E1a telas: informar compra de contrato (1366 e 390 px) e corrigir o vínculo', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const amb = C.ambiente(); C.regrasDeTeste(amb);
  for (const largura of [1366, 390]) {
    const { page, erros } = await abrir(browser, amb.ctx, amb.sessoes, 'tiago', largura, null);
    await page.evaluate(() => abrir('compras_informar'));
    await page.locator('input[name="ciVinc"][value="CONTRATO"]').waitFor();
    await page.locator('input[name="ciVinc"][value="CONTRATO"]').check();
    await page.locator('#ciCtrTipo').waitFor();
    await page.fill('#ciCliBusca', 'Alfa');
    await page.locator('#ciCliRes [data-cli="c1"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#ciUni option').length > 1);
    await page.selectOption('#ciUni', 'un1');
    await page.selectOption('#ciCtrTipo', 'FORNECIMENTO');
    await page.fill('#ciCtrRef', 'Contrato de insumos Alfa 2026');
    await page.selectOption('#ciCtrNat', 'REPOSICAO');
    await page.fill('#ciCtrJust', 'Repor itens enviados errados ao cliente, erro na separação do pedido');
    await page.fill('#ciFin', 'Reposição de insumos do contrato do cliente');
    await page.locator('#ciItens input[data-c="descricao"]').first().fill('Indicador biológico');
    await page.fill('#ciForn', 'Distribuidora Teste');
    await page.fill('#ciValor', '120,00');
    assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-informar-compra-contrato');
    assert.deepEqual(erros, []);
    await page.close();
  }
  // corrigir o vínculo de uma compra informada como uso interno (caso da REQ-2026-0017)
  const B64 = (t) => Buffer.from(t).toString('base64');
  const r = amb.api('s_tiago', 'informar', { finalidade: 'Para o cliente, repor itens enviados errados', vinculo: { tipo: 'INTERNO', centroCusto: 'Administrativo', motivoInterno: 'Para o cliente, repor itens enviados errados' },
    itens: [{ descricao: 'Indicador biológico', quantidade: 2, unidade: 'cx.' }], fornecedorNome: 'Distribuidora Teste', valor: '120,00', formaPagamento: 'CARTAO_CREDITO', cartaoFinal: '4321', parcelas: 1,
    dataCompra: '2026-10-19', comprovante: { nome: 'c.jpg', tipo: 'image/jpeg', base64: B64('comprovante tela') }, nfNumero: '9', recebido: true });
  assert.equal(r.ok, true, r.message);
  const id = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r.numero).ID;
  for (const largura of [1366, 390]) {
    const { page, erros } = await abrir(browser, amb.ctx, amb.sessoes, 'fabio', largura, null);
    await page.evaluate((x) => { abrir('compras_fila'); setTimeout(() => Compras_abrirFicha_(x), 300); }, id);
    await page.locator('button', { hasText: 'Corrigir o vínculo' }).waitFor({ timeout: 15000 });
    await page.locator('button', { hasText: 'Corrigir o vínculo' }).click();
    await page.locator('input[name="cvVinc"][value="CONTRATO"]').check();
    await page.locator('#cvCtrTipo').waitFor();
    await page.fill('#cvCliBusca', 'Alfa');
    await page.locator('#cvCliRes [data-cli="c1"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#cvUni option').length > 1);
    await page.selectOption('#cvUni', 'un1');
    await page.selectOption('#cvCtrTipo', 'FORNECIMENTO');
    await page.fill('#cvCtrRef', 'Contrato de insumos Alfa 2026');
    await page.selectOption('#cvCtrNat', 'REPOSICAO');
    await page.fill('#cvCtrJust', 'Repor itens enviados errados ao cliente, erro na separação do pedido');
    await page.fill('#cvMotivo', 'Reposição do contrato de insumos, informada antes como uso interno');
    await foto(page, largura + '-corrigir-vinculo');
    if (largura === 1366) {
      await page.locator('#cvGravar').click();
      await page.locator('#cpFichaMsg', { hasText: 'corrigido' }).waitFor();
      assert.equal(amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === id).VINCULO_TIPO, 'CONTRATO');
      await foto(page, largura + '-vinculo-corrigido');
    }
    assert.ok(await semRolagemLateral(page));
    assert.deepEqual(erros, []);
    await page.close();
  }
});
