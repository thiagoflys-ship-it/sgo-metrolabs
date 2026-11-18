// Pacote 2 de 18/11/2026 (Comercial) — as telas na página completa do SGO+ (Index.html com os include() resolvidos), a 1366 e 390 px:
//  - orçamento típico de 10 itens de calibração pelo "Do catálogo" (vários de uma vez, com a quantidade e os mais usados), o tipo de
//    equipamento no item e o quadro "Equipamentos identificados na execução" (item 6 e 8);
//  - rascunho guardado no aparelho (alteração não salva oferece recuperar);
//  - "Nova proposta" da oportunidade (em branco ou copiando uma anterior) e "Duplicar proposta" (item 8);
//  - contato repetido: recusa com "Usar o contato existente", aviso na oportunidade, prévia e unificação, Painel da gestão (item 7);
//  - proposta guiada com a linha "Sem vincular equipamentos" e a Metodologia com a opção do vínculo (item 6).
// Confere: sem erro de JavaScript, sem rolagem lateral, texto justificado. Capturas em output/pedidos-20261118/p2/capturas (ou CAPTURAS_P2).
// Código REAL do SGO+ com dados fictícios; nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const COM = require('./_comercial_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const saida = process.env.CAPTURAS_P2 || path.join(__dirname, '../output/pedidos-20261118/p2/capturas');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const htmlCompleto = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const justificado = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).textAlign === 'justify'; }, sel);
const EXTRAS = ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js', 'SGO_Comercial_Assistente.js'];

async function abrirPagina(browser, largura, login, sessao, rota) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, sessao) } };
    const v = rota(fn, args);
    return v === undefined ? { ok: false, erro: 'indisponível no ensaio: ' + fn } : { ok: true, valor: JSON.parse(JSON.stringify(v)) };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
const cap = (page, largura, nome) => page.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: true });
const ct = (id, nome, extra) => Object.assign({ ID: id, CLIENTE_ID: 'c1', UNIDADE_ID: '', NOME: nome, CARGO: '', PAPEL: '', EMAIL: '', CELULAR: '', TELEFONE: '', PRINCIPAL: '', ORIGEM: 'MANUAL', OBS: '', STATUS: 'ATIVO', CRIADO_EM: '2026-10-01T10:00' }, extra || {});
const INSTRUMENTOS = ['termômetro digital', 'termômetro de vidro', 'termo-higrômetro', 'manômetro analógico', 'manovacuômetro', 'pirômetro infravermelho', 'cronômetro', 'paquímetro', 'balança de precisão', 'pipeta automática', 'tacômetro', 'datalogger de temperatura'];

function cenario() {
  const a = COM.ambiente({ custoAvulso: 0.3, tabelas: {
    CAD_CONTATOS: [ct('k1', 'DOUGLAS TAVARES', { EMAIL: 'douglas@alfa.exemplo.test', CELULAR: '21981150000', ORIGEM: 'MIGRADO_CLIENTE', PRINCIPAL: 'SIM' }), ct('k2', 'Douglas Tavares', { CELULAR: '21981150000', CARGO: 'Engenheiro clínico', ORIGEM: 'MIGRADO_UNIDADE', UNIDADE_ID: 'un1' }),
      ct('k4', 'HERNRIQUE SANTOS', { CELULAR: '21967790000' }), ct('k5', 'HENRIQUE SANTOS', { CELULAR: '21967790000', EMAIL: 'henrique@alfa.exemplo.test', CARGO: 'Coordenador da CME' })]
  } });
  const D = a.ctx.SGO_DATA;
  D.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  D.validarCadastroUnico_ = () => {};
  a.tabelas.HIST_CADASTROS = [];
  for (const f of EXTRAS) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  INSTRUMENTOS.forEach((n, k) => ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-T' + String(k + 1).padStart(2, '0'), nome: 'Calibração de ' + n, tipo: 'SERVICO', preco: String(150 + k * 10) + ',00', custo: String(50 + k * 3) + ',00' })));
  return a;
}

test('telas do Pacote 2 do Comercial a 1366 e 390 px: orçamento de 10 itens, equipamento opcional, duplicar, contatos repetidos', { skip: !chromium, timeout: 600000 }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  const medidas = {};
  try {
    for (const largura of [1366, 390]) {
      const a = cenario();
      const rota = (fn, args) => (fn === 'Comercial_api' ? a.api(args[0], args[1], args[2]) : undefined);
      const { oportunidade } = COM.oportunidadeDeTeste(a);
      // uma proposta anterior do cliente (para "Copiar" e para os "mais usados")
      const ant = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
      const pid = (c) => a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === c).ID;
      ok(a.api('s_vera', 'salvarProposta', { id: ant, deslocamento: COM.SEM_VIAGEM, condicoes: { pagamento: 'Boleto em 28 dias após a nota', prazoExecucao: 'Conforme a faixa', garantia: '90 dias', frete: 'Por conta da Metrolabs' },
        itens: [{ produtoId: pid('CAL-T01'), descricao: 'Calibração de termômetro digital', quantidade: 12, precoUnitario: '150,00' }, { produtoId: pid('CAL-T04'), descricao: 'Calibração de manômetro analógico', quantidade: 4, precoUnitario: '180,00' }] }));
      a.tabelas.COM_PROPOSTAS.find((p) => p.ID === ant).SITUACAO = 'ENVIADA';
      a.tabelas.COM_OPORTUNIDADES.find((o) => o.ID === oportunidade.id).SITUACAO = 'ABERTA';

      // ---------------- 1. Nova proposta (oportunidade): em branco ou copiando; depois 10 itens pelo "Do catálogo"
      let { page, erros } = await abrirPagina(browser, largura, 'vera', a.sessoes.s_vera, rota);
      await page.evaluate(() => abrir('comercial_oportunidades'));
      await page.waitForTimeout(500);
      await page.evaluate((x) => Comercial_abrirOportunidade_(x), oportunidade.id);
      await page.locator('#cmGavetaCorpo [data-acao="proposta"]').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cmGavetaCorpo').innerText(), /Este cliente tem 2 grupos de contatos repetidos/);
      await page.locator('#cmGavetaCorpo .cm-rep-grupo').scrollIntoViewIfNeeded();
      assert.ok(await justificado(page, '#cmGavetaCorpo .cm-rep-grupo'), 'aviso justificado');
      await cap(page, largura, 'oportunidade-contatos-repetidos');
      await page.locator('#cmGavetaCorpo [data-acao="proposta"]').click();
      await page.locator('[data-npc]').first().waitFor({ timeout: 10000 });
      assert.match(await page.locator('.atv-modal').innerText(), /PROP-2026-0001 rev\.00[\s\S]*12 × Calibração de termômetro digital/);
      assert.ok(await semRolagem(page), 'nova proposta: rolagem lateral em ' + largura);
      await cap(page, largura, 'nova-proposta-em-branco-ou-copiar');
      await page.locator('[data-np="branco"]').click();
      await page.locator('#cmAddCat').waitFor({ timeout: 10000 });
      const idNova = await page.evaluate(() => CM.passoProp || (document.querySelector('#cmGaveta h3') || {}).textContent);
      const prop = a.tabelas.COM_PROPOSTAS.filter((p) => p.ID !== ant).slice(-1)[0];
      assert.equal(JSON.parse(prop.CONDICOES_JSON).pagamento, 'Boleto em 28 dias após a nota', 'condições da última proposta do cliente');
      // "Do catálogo": 10 itens marcados, com a quantidade
      await page.locator('#cmAddCat').click();
      await page.locator('#cmEscRes [data-esc-id]').first().waitFor({ timeout: 10000 });
      await page.locator('#cmEscFreq [data-esc-id]').first().waitFor({ timeout: 10000 });
      const linhas = page.locator('#cmEscRes [data-esc-id]');
      assert.equal(await linhas.count(), 12);
      let cliques = 1; // abrir "Do catálogo"
      for (let k = 0; k < 10; k++) { await linhas.nth(k).locator('[data-esc-ck]').check(); cliques++; if (k < 3) { await linhas.nth(k).locator('[data-esc-q]').fill(String(k + 2)); cliques++; } }
      assert.match(await page.locator('.atv-modal [data-x="ok"]').innerText(), /Acrescentar 10 itens/);
      assert.ok(await semRolagem(page), 'catálogo: rolagem lateral em ' + largura);
      await cap(page, largura, 'catalogo-varios-itens');
      await page.locator('.atv-modal [data-x="ok"]').click(); cliques++;
      assert.equal(await page.evaluate(() => CM.itens.length), 10);
      assert.equal(Number(await page.evaluate(() => CM.itens[0].quantidade)), 2);
      await page.locator('#cmItens [data-i="0"] [data-f="tipoEquipamento"]').waitFor();
      assert.match(await page.locator('#cmItens [data-i="0"]').innerText(), /Nenhum vinculado: opcional na calibração e na qualificação/);
      await page.locator('#cmGavetaCorpo [data-acao="salvar"]').click(); cliques++;
      await page.waitForTimeout(800);
      const salvo = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === prop.ID);
      assert.equal(JSON.parse(salvo.ITENS_JSON).filter((i) => !i.auto).length, 10, '10 itens gravados');
      medidas.cliquesDezItens = cliques;
      await page.locator('#cmItens').scrollIntoViewIfNeeded();
      assert.ok(await semRolagem(page), 'editor: rolagem lateral em ' + largura);
      await cap(page, largura, 'proposta-10-itens-tipo-equipamento');
      // quadro "Equipamentos identificados na execução"
      await page.locator('#cmDados').scrollIntoViewIfNeeded();
      assert.match(await page.locator('#cmDados').innerText(), /Equipamentos identificados na execução[\s\S]*item 1, balança de precisão: 2 a identificar/);
      await cap(page, largura, 'proposta-equipamentos-na-execucao');
      // rascunho guardado no aparelho: mudar a quantidade sem salvar e reabrir
      await page.locator('#cmItens [data-i="1"] [data-f="quantidade"]').fill('7');
      await page.waitForTimeout(1800);
      await page.evaluate((x) => Comercial_abrirProposta_(x), prop.ID);
      await page.locator('[data-rl="rec"]').waitFor({ timeout: 10000 });
      assert.match(await page.locator('[data-rl="rec"]').locator('xpath=../..').innerText(), /alterações desta proposta feitas neste aparelho/);
      await page.locator('[data-rl="rec"]').scrollIntoViewIfNeeded();
      await cap(page, largura, 'rascunho-guardado-no-aparelho');
      await page.locator('[data-rl="rec"]').click();
      await page.waitForTimeout(800);
      assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === prop.ID).ITENS_JSON).filter((i) => !i.auto)[1].quantidade, 7, 'recuperado e salvo');
      // duplicar a proposta anterior
      await page.evaluate((x) => Comercial_abrirProposta_(x), ant);
      await page.locator('#cmGavetaCorpo [data-acao="duplicar"]').waitFor({ timeout: 10000 });
      await page.locator('#cmGavetaCorpo [data-acao="duplicar"]').click();
      await page.locator('.atv-modal [data-x="ok"]').waitFor();
      assert.ok(await justificado(page, '.atv-modal .cm-txt'));
      await cap(page, largura, 'duplicar-proposta');
      await page.locator('.atv-modal [data-x="ok"]').click();
      await page.locator('#cmGavetaCorpo .cm-faixa.ok').first().waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cmGavetaCorpo .cm-faixa.ok').first().innerText(), /criada em rascunho a partir da PROP-2026-0001/);
      // contato repetido no cadastro: recusa com o existente e "Usar o contato existente"
      await page.evaluate((x) => Comercial_abrirOportunidade_(x), oportunidade.id);
      await page.locator('#cmGavetaCorpo [data-acao="novoContato"]').waitFor({ timeout: 10000 });
      await page.locator('#cmGavetaCorpo [data-acao="novoContato"]').click();
      await page.locator('#cmCtNome').fill('Henrique  Santos'); await page.locator('#cmCtEmail').fill('henrique.novo@alfa.exemplo.test');
      await page.locator('.atv-modal [data-x="ok"]').click();
      await page.locator('[data-usar-existente]').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cmCtMsg').innerText(), /já tem o contato HENRIQUE SANTOS[\s\S]*Coordenador da CME/);
      assert.ok(await semRolagem(page), 'contato: rolagem lateral em ' + largura);
      await cap(page, largura, 'contato-repetido-recusado');
      await page.locator('[data-usar-existente]').click();
      await page.waitForTimeout(700);
      assert.equal(a.tabelas.CAD_CONTATOS.filter((c) => /^HE.*SANTOS$/i.test(c.NOME)).length, 2, 'nada novo gravado');
      assert.deepEqual(erros, [], 'erros de JavaScript (vendedora) em ' + largura);
      await page.close();

      // ---------------- 2. gestão: unificar pela oportunidade e o Painel
      ({ page, erros } = await abrirPagina(browser, largura, 'gaspar', a.sessoes.s_gaspar, rota));
      await page.evaluate(() => abrir('comercial_oportunidades'));
      await page.waitForTimeout(500);
      await page.evaluate((x) => Comercial_abrirOportunidade_(x), oportunidade.id);
      await page.locator('[data-rep-grupo="0"]').waitFor({ timeout: 10000 });
      await page.locator('[data-rep-grupo="0"]').click();
      await page.locator('#cmUniPrevia .cm-det').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cmUniPrevia').innerText(), /Como fica/);
      await page.locator('#cmUniMot').fill('Mesma pessoa cadastrada pelo cliente e pela unidade');
      assert.ok(await semRolagem(page), 'unificar: rolagem lateral em ' + largura);
      await cap(page, largura, 'unificar-contatos-previa');
      await page.locator('.atv-modal [data-x="ok"]').click();
      await page.waitForTimeout(900);
      assert.equal(a.tabelas.CAD_CONTATOS.filter((c) => c.JUNTADO_COM_ID).length, 1, 'um contato unificado');
      await page.evaluate(() => abrir('comercial_painel'));
      await page.locator('#cmPainelContatos .cm-caixa').waitFor({ timeout: 15000 });
      assert.match(await page.locator('#cmPainelContatos').innerText(), /Unificar contatos duplicados[\s\S]*1 grupo de contatos repetidos/);
      await page.locator('#cmPainelContatos').scrollIntoViewIfNeeded();
      assert.ok(await justificado(page, '#cmPainelContatos .cm-txt'));
      assert.ok(await semRolagem(page), 'painel: rolagem lateral em ' + largura);
      await cap(page, largura, 'painel-unificar-contatos');
      assert.deepEqual(erros, [], 'erros de JavaScript (gestão) em ' + largura);
      await page.close();

      // ---------------- 3. proposta guiada (passo 4, sem vincular) e Metodologia (Diretoria)
      ({ page, erros } = await abrirPagina(browser, largura, 'vera', a.sessoes.s_vera, rota));
      await page.evaluate(() => abrir('comercial'));
      await page.waitForTimeout(500);
      await page.evaluate(() => { Comercial_guia_(); CM.guia.cliente = { id: 'c1', nome: 'Hospital Teste Alfa' }; CM.guia.unidadeId = 'un1'; CM.guia.uni = { contatos: [], equipamentos: [], repetidos: [] }; CM.guia.maxPasso = 4; CM.guia.linhas = [{ chave: 'L1', tipo: 'termômetro digital', quantidade: 12, servico: 'CALIBRACAO' }]; Comercial_guiaIr_(4); });
      await page.locator('#cmGLinMais').waitFor({ timeout: 10000 });
      await page.locator('#cmGLinMais').click();
      await page.locator('[data-glin="1"] [data-gl="tipo"]').fill('manômetro analógico');
      await page.locator('[data-glin="1"] [data-gl="quantidade"]').fill('6');
      await page.locator('[data-glin="0"]').scrollIntoViewIfNeeded();
      assert.ok(await semRolagem(page), 'guiada: rolagem lateral em ' + largura);
      await cap(page, largura, 'guiada-sem-vincular-equipamentos');
      await page.locator('#cmGProx').click();
      await page.locator('[data-gsv="L1"]').waitFor({ timeout: 10000 });
      assert.match(await page.locator('#cmGuia').innerText(), /12 × termômetro digital \(sem vincular\)[\s\S]*6 × manômetro analógico \(sem vincular\)/);
      await cap(page, largura, 'guiada-servicos-das-linhas');
      assert.deepEqual(erros, [], 'erros de JavaScript (guiada) em ' + largura);
      await page.close();
      ({ page, erros } = await abrirPagina(browser, largura, 'dora', a.sessoes.s_dora, rota));
      await page.evaluate(() => abrir('comercial_metodologia'));
      await page.locator('#cmEqOpc details').waitFor({ timeout: 10000 });
      await page.locator('#cmEqOpc summary').click();
      await page.locator('#cmEqOpcSel').waitFor({ timeout: 5000 });
      assert.match(await page.locator('#cmEqOpc').innerText(), /vínculo opcional/);
      assert.ok(await justificado(page, '#cmEqOpc .cm-txt'));
      await page.locator('#cmEqOpc').scrollIntoViewIfNeeded();
      assert.ok(await semRolagem(page), 'metodologia: rolagem lateral em ' + largura);
      await cap(page, largura, 'metodologia-equipamento-opcional');
      assert.deepEqual(erros, [], 'erros de JavaScript (metodologia) em ' + largura);
      await page.close();
      if (largura === 1366) fs.writeFileSync(path.join(saida, 'medidas.json'), JSON.stringify(medidas, null, 1));
      void idNova;
    }
  } finally { await browser.close(); }
});
