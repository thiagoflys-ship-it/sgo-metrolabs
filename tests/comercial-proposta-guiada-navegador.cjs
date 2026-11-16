// Proposta guiada (etapa 2, 11/11/2026) no navegador, na PÁGINA COMPLETA (Index.html com os include() resolvidos). google.script.run
// fala com o ambiente de teste do Comercial (código real; tabelas em memória; IA simulada; consulta de CNPJ simulada; nada sai).
// 1) Vendedora no computador: cola o e-mail do cliente, consulta o CNPJ novo, cadastra cliente, unidade de Angra, responsável técnico
//    (do e-mail), equipamento pela foto da plaqueta, escolhe o serviço com ciclos e carga, aceita a sugestão e o insumo e monta a proposta.
// 2) Celular (390 px): o mesmo cliente já existe; usa a unidade e o equipamento cadastrados. 3) Gestão junta contatos repetidos.
// Sem erro de JavaScript, sem alert/confirm/prompt, sem rolagem lateral. Capturas em output/comercial-etapa2/capturas.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambiente: ambienteBase } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const TEM = fs.existsSync(path.join(PASTA, 'SGO_Comercial_Assistente.js'));
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/comercial-etapa2/capturas');
fs.mkdirSync(saida, { recursive: true });
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
const pref = TEM ? 'depois-' : 'antes-';
const EMAIL = 'Bom dia! Somos o Hospital Municipal de Angra (CNPJ 11.444.777/0001-61). Precisamos qualificar a autoclave Marca A modelo AV-100 de 100 L da CME.\nContato: Marina Souza Teste, engenheira clínica, marina@angra.exemplo.test, (24) 99999-0000.';

function ambiente() {
  const ia = (prompt) => /plaqueta/.test(prompt) ? JSON.stringify({ tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-2024-001', capacidade: '100 L', anoFabricacao: '2021', legivel: true })
    : /Extraia deste e-mail/.test(prompt) ? JSON.stringify({ razaoSocial: 'Hospital Municipal de Angra', cnpj: '11.444.777/0001-61', contatos: [{ nome: 'Marina Souza Teste', cargo: 'engenheira clínica', email: 'marina@angra.exemplo.test', telefone: '(24) 99999-0000' }], equipamentos: [{ tipo: 'autoclave', marca: 'Marca A', modelo: 'AV-100', capacidade: '100 L', quantidade: 1 }], servicos: ['qualificar'] })
    : /opcoes/.test(prompt) ? JSON.stringify({ escolhas: [] }) : '';
  const a = ambienteBase({ custoAvulso: 0.3, ia, tabelas: { COM_PRODUTOS: [
    { ID: 'p1', CODIGO: 'QUA-001', NOME: 'Autoclave hospitalar a vapor — Pacote completo (QI, QO e QD)', TIPO: 'SERVICO', CATEGORIA: 'Qualificação', PRECO: 4870, CUSTO: 1500, CUSTO_COTACAO_ID: 'c', CUSTO_COTACAO_VALOR: 1500, CUSTO_VALIDO_ATE: '2099-12-31', UNIDADE_MEDIDA: 'equip.', ATIVO: 'SIM' },
    { ID: 'p4', CODIGO: 'INS-BD', NOME: 'Pacote de teste de Bowie-Dick', TIPO: 'PRODUTO', CATEGORIA: 'Insumos', PRECO: 45, CUSTO: 20, CUSTO_COTACAO_ID: 'c4', CUSTO_COTACAO_VALOR: 20, CUSTO_VALIDO_ATE: '2099-12-31', UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' }] } });
  const D = a.ctx.SGO_DATA;
  D.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  D.validarCadastroUnico_ = () => {}; D.normalizarObjetoParaSheet = (t, r) => r; D.gerarRegistroBase = (r) => Object.assign({ ID: 'eqn' + Math.random().toString(36).slice(2, 8) }, r);
  a.ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true, hasLock: () => true }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true, hasLock: () => true }) };
  a.tabelas.HIST_CADASTROS = []; a.tabelas.CAD_CONTATOS = [];
  if (TEM) for (const f of ['SGO_Vinculos.js', 'SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Equipamentos.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js', 'SGO_Comercial_Assistente.js']) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.ctx.SGO_CNPJ_consultarDados_ = (c) => { if (String(c).replace(/\D/g, '') === '11444777000161') return { razao_social: 'Hospital Municipal de Angra Teste', nome_fantasia: 'Hospital de Angra Teste', descricao_tipo_de_logradouro: 'Rua', logradouro: 'do Porto', numero: '50', bairro: 'Centro', municipio: 'Angra dos Reis', uf: 'RJ', cep: '23900000', ddd_telefone_1: '2433330000', email: '', descricao_situacao_cadastral: 'ATIVA', _fonte: 'teste' }; throw new Error('CNPJ não encontrado.'); };
  return a;
}

async function abrir(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo do navegador: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
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
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.evaluate(() => abrir('comercial_propostas'));
  await page.waitForFunction(() => typeof CM !== 'undefined' && CM.ini, null, { timeout: 10000 });
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) {
  const altura = await page.evaluate(() => { const c = document.getElementById('cmGavetaCorpo'); return c ? c.scrollHeight + 120 : 900; });
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(altura, vp.height), 9000) });
  await page.screenshot({ path: path.join(saida, pref + nome + '.png'), fullPage: true });
  await page.setViewportSize(vp);
}
const msg = (page, re) => page.locator('#cmGuiaMsg .cm-faixa', { hasText: re }).waitFor();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  try {
    const a = ambiente();
    if (!TEM) {
      const { page, erros } = await abrir(browser, a, 'vera', 1366);
      await page.locator('#cmProps').waitFor();
      await page.screenshot({ path: path.join(saida, pref + '1366-propostas.png'), fullPage: true });
      assert.equal(await page.locator('#cmPGuiada').count(), 0); assert.deepEqual(erros, []);
      console.log(JSON.stringify({ estado: 'ANTES_CAPTURADO' })); return;
    }
    // 1. computador: cliente novo, do e-mail ao montar
    {
      const { page, erros } = await abrir(browser, a, 'vera', 1366);
      await page.locator('#cmPGuiada').click();
      await page.locator('#cmGuia').waitFor();
      await page.locator('#cmGuia summary', { hasText: 'Colar o e-mail' }).click();
      await page.fill('#cmGTexto', EMAIL);
      await page.locator('#cmGLer').click();
      await page.locator('#cmGuia .cm-faixa.ok', { hasText: 'conferido com o texto' }).waitFor();
      assert.equal(await page.locator('#cmGCnpj').inputValue(), '11444777000161', 'CNPJ trazido do e-mail');
      await page.locator('#cmGProc').click();
      await page.locator('#cmGuia h3', { hasText: 'Cliente novo' }).waitFor();
      assert.equal(await page.locator('[data-gcf="CIDADE"]').inputValue(), 'ANGRA DOS REIS');
      await foto(page, '1366-passo1-cliente-novo');
      await page.fill('[data-gcf="EMAIL"]', 'financeiro@angra.exemplo.test'); await page.fill('[data-gcf="CONTATO"]', 'Marina Souza Teste');
      await page.locator('#cmGCliSalvar').click();
      await msg(page, /Ciente/);
      await page.locator('#cmGCliCiente').check(); await page.locator('#cmGCliSalvar').click();
      await msg(page, /Cliente cadastrado/);
      await page.locator('#cmGProx').click();
      await page.locator('#cmGuia summary', { hasText: 'Cadastrar a unidade de execução' }).waitFor();
      if (!(await page.locator('#cmGUnNome').isVisible())) await page.locator('#cmGuia summary', { hasText: 'Cadastrar a unidade de execução' }).click();
      await foto(page, '1366-passo2-unidade');
      await page.fill('#cmGUnNome', 'Hospital Municipal de Angra'); await page.fill('#cmGUnEnd', 'Rua do Porto, 50'); await page.fill('#cmGUnCid', 'Angra dos Reis'); await page.selectOption('#cmGUnUf', 'RJ');
      await page.locator('#cmGUnCiente').check(); await page.locator('#cmGUnSalvar').click();
      await msg(page, /Unidade de execução cadastrada/);
      await page.locator('label', { hasText: 'HOSPITAL MUNICIPAL DE ANGRA' }).locator('input[name="cmGUn"]').check();
      await page.locator('#cmGProx').click();
      await page.locator('#cmGTec').waitFor();
      await page.locator('#cmGuia summary', { hasText: 'Cadastrar um responsável' }).click();
      await page.locator('[data-glido="0"]').click();
      assert.equal(await page.locator('#cmGCtEmail').inputValue(), 'marina@angra.exemplo.test');
      await page.locator('#cmGCtSalvar').click();
      await msg(page, /Responsável técnico .* salvo/);
      await foto(page, '1366-passo3-responsaveis');
      await page.locator('#cmGProx').click();
      await page.locator('#cmGPlaq').setInputFiles({ name: 'plaqueta.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('ffd8ffe000104a464946', 'hex') });
      await msg(page, /Sugestão lida da plaqueta/);
      assert.equal(await page.locator('[data-geqf="SERIE"]').inputValue(), 'S-2024-001');
      await page.fill('[data-geqf="SETOR"]', 'CME');
      await foto(page, '1366-passo4-plaqueta-lida');
      await page.locator('#cmGEqSalvar').click();
      await msg(page, /Equipamento cadastrado/);
      await page.locator('#cmGProx').click();
      const box = page.locator('[data-gsv]').first();
      await box.locator('[data-gs="servico"]').selectOption('QUALIFICACAO');
      await box.locator('[data-gciclo="Bowie-Dick"]').click(); await box.locator('[data-gciclo="134 °C instrumental"]').click();
      await box.locator('[data-gs="carga"]').selectOption('COM_E_SEM');
      await page.locator('#cmGSugerir').click();
      await msg(page, /Sugestões do catálogo/);
      assert.match(await page.locator('[data-gesc] option:checked').innerText(), /QUA-001/);
      await page.locator('[data-gins="p4"]').check();
      await foto(page, '1366-passo5-servicos-insumos');
      await page.locator('#cmGProx').click();
      await page.selectOption('#cmGOri', { index: 1 });
      await page.fill('#cmGTit', 'Qualificação da autoclave da CME de Angra');
      await foto(page, '1366-passo6-resumo');
      await page.locator('#cmGMontar').click();
      await page.locator('#cmDados').waitFor({ timeout: 15000 });
      await foto(page, '1366-proposta-montada');
      const p = a.tabelas.COM_PROPOSTAS[a.tabelas.COM_PROPOSTAS.length - 1], itens = JSON.parse(p.ITENS_JSON);
      assert.equal(itens[0].produtoId, 'p1'); assert.deepEqual(itens[0].servico.ciclos, ['Bowie-Dick', '134 °C instrumental']); assert.equal(itens[0].equipamentos.length, 1); assert.equal(itens[1].produtoId, 'p4');
      const eq = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.SERIE === 'S-2024-001');
      assert.ok(eq && /plaqueta/.test(eq.OBS), 'cadastro único com a origem da leitura');
      assert.ok(await semRolagemLateral(page)); assert.deepEqual(erros, []);
      await page.close();
      checks.push('computador: e-mail lido, CNPJ consultado, cliente, unidade de Angra, responsável técnico do e-mail, equipamento pela plaqueta, serviço com ciclos e carga, sugestão QUA-001 + insumo, proposta montada');
    }
    // 2. celular: o mesmo cliente já existe
    {
      const { page, erros } = await abrir(browser, a, 'vera', 390);
      await page.locator('#cmPGuiada').click();
      await page.fill('#cmGCnpj', '11.444.777/0001-61'); await page.locator('#cmGProc').click();
      await page.locator('#cmGuia .cm-selo', { hasText: 'cadastro completo' }).waitFor();
      assert.ok(await semRolagemLateral(page));
      await foto(page, '390-passo1-cliente-existente');
      await page.locator('#cmGProx').click();
      await page.locator('label', { hasText: 'HOSPITAL MUNICIPAL DE ANGRA' }).locator('input[name="cmGUn"]').check();
      await page.locator('#cmGuia .cm-tabela').waitFor();
      await foto(page, '390-passo2-unidade-com-propostas');
      assert.ok(await semRolagemLateral(page)); assert.deepEqual(erros, []);
      await page.close();
      checks.push('celular (390 px): cliente existente reconhecido pelo CNPJ; a unidade mostra as propostas e os serviços ligados');
    }
    // 3. gestão: contatos repetidos (caso RIO MED) juntados no passo 3
    {
      a.tabelas.CAD_CONTATOS.push({ ID: 'b1', CLIENTE_ID: 'c1', NOME: 'BRUNO', EMAIL: '', STATUS: 'ATIVO' }, { ID: 'b2', CLIENTE_ID: 'c1', NOME: 'BRUNO SILVA', EMAIL: 'bruno@exemplo.test', STATUS: 'ATIVO' });
      const { page, erros } = await abrir(browser, a, 'gaspar', 1366);
      await page.locator('#cmPGuiada').click();
      await page.fill('#cmGBusca', 'alfa'); await page.locator('#cmGProc').click();
      await page.locator('[data-gcli="c1"]').click();
      await page.locator('#cmGuia h3', { hasText: 'Hospital Teste Alfa' }).waitFor();
      await page.locator('#cmGProx').click();
      await page.locator('input[name="cmGUn"][value="un1"]').check();
      await page.locator('#cmGuia .cm-tabela, #cmGuia .cm-txt').first().waitFor();
      await page.waitForTimeout(300);
      await page.locator('#cmGProx').click();
      await page.locator('[data-gjuntar="0"]').waitFor();
      await foto(page, '1366-passo3-contatos-repetidos');
      await page.locator('[data-gjuntar="0"]').click();
      await msg(page, /Contatos juntados/);
      assert.equal(a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'b1').JUNTADO_COM_ID, 'b2');
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('gestão: contatos repetidos (BRUNO sem e-mail e BRUNO SILVA) juntados pela tela; o sem e-mail saiu');
    }
    console.log(JSON.stringify({ estado: 'PASS', checks }, null, 1));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
