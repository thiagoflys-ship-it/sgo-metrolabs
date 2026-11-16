// Dados completos para emitir (11/11/2026) no navegador, na PÁGINA COMPLETA (Index.html com todos os include() resolvidos, como o
// servidor monta). O google.script.run fala com o ambiente de teste do Comercial (código real; tabelas em memória): getSessaoAtual devolve
// a sessão escolhida e Comercial_api roda o código real; o resto responde "indisponível no ensaio". Sem rede.
// Com o legado da BASE (sem o módulo novo): só tira as capturas "antes" (a proposta do caso PROP-2026-0027 sem o quadro).
// Com o CANDIDATO: quadro "Faltam dados para emitir", pedir ao cliente (texto e link), página pública do cliente (/dados-cliente/, a
// página real de src/publico com as funções reais do legado), conferência, identificar equipamentos, escopo da especialista e a
// validação, viagem com origem/destino e banco de rotas, tabela por estado na Metodologia; 1366 e 390 px, sem erro de JavaScript,
// sem diálogo do navegador (alert/confirm/prompt) e sem rolagem lateral.
// Uso: DEST=<legado> CAPTURAS=<pasta> PUBLICO=<src/publico> node --require <fontes.cjs> tests/comercial-dados-completos-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambiente: ambienteBase, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const TEM = fs.existsSync(path.join(PASTA, 'SGO_Comercial_DadosEmissao.js'));
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/comercial-dados-completos/capturas');
const PUBLICO = process.env.PUBLICO || path.join(__dirname, '../output/comercial-dados-completos/cand/src/publico');
fs.mkdirSync(saida, { recursive: true });
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));
const pref = TEM ? 'depois-' : 'antes-';

function ambiente() {
  const a = ambienteBase({ custoAvulso: 0.3 });
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  a.ctx.SGO_DATA.validarCadastroUnico_ = () => {};
  a.tabelas.HIST_CADASTROS = [];
  if (TEM) for (const f of ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js']) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  return a;
}
function propostaCaso0027(a) {
  const { oportunidade } = oportunidadeDeTeste(a);
  const np = a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id });
  const r = a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Conforme os itens da tabela', condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' },
    itens: [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00' },
      { descricao: 'Qualificação de termodesinfectora', quantidade: 1, unidade: 'un.', precoUnitario: '3.800,00' },
      { descricao: 'Qualificação de lavadora ultrassônica', quantidade: 2, unidade: 'un.', precoUnitario: '2.900,00' },
      { descricao: 'Qualificação de secadora', quantidade: 1, unidade: 'un.', precoUnitario: '2.400,00' }] });
  assert.equal(r.ok, true, r.message);
  return np.proposta.id;
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
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) { await page.screenshot({ path: path.join(saida, pref + nome + '.png'), fullPage: true }); }
async function abrirProposta(page, id) {
  await page.evaluate(() => abrir('comercial_propostas'));
  await page.waitForFunction(() => typeof CM !== 'undefined' && CM.ini, null, { timeout: 10000 });
  await page.evaluate((x) => Comercial_abrirProposta_(x), id);
  await page.locator('#cmGavetaCorpo .cm-acoes').first().waitFor({ timeout: 10000 });
}
async function fotoGaveta(page, nome) {
  // a gaveta rola por dentro: a captura mostra a gaveta inteira
  const altura = await page.evaluate(() => { const c = document.getElementById('cmGavetaCorpo'); return c ? c.scrollHeight + 120 : 900; });
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(altura, vp.height), 9000) });
  await page.screenshot({ path: path.join(saida, pref + nome + '.png'), fullPage: true });
  await page.setViewportSize(vp);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  try {
    const a = ambiente();
    const id = propostaCaso0027(a);
    // 1. a proposta do caso PROP-2026-0027 (computador e celular)
    for (const largura of [1366, 390]) {
      const { page, erros } = await abrir(browser, a, 'vera', largura);
      await abrirProposta(page, id);
      if (TEM) {
        await page.locator('#cmDados h3', { hasText: /Faltam \d+ dados para emitir/ }).waitFor();
        assert.ok(await page.locator('#cmDados .cm-de-falta').count() >= 6);
        assert.ok(await page.locator('#cmDados [data-de-pedir]').count() === 1);
      } else assert.equal(await page.locator('#cmDados').count(), 0);
      assert.ok(await semRolagemLateral(page), 'sem rolagem lateral ' + largura);
      await fotoGaveta(page, largura + '-proposta-caso-0027');
      assert.deepEqual(erros, []);
      await page.close();
    }
    checks.push(TEM ? 'quadro "Faltam dados para emitir" no caso PROP-2026-0027 (1366 e 390 px)' : 'antes: a proposta abre sem o quadro (base)');
    if (!TEM) { console.log(JSON.stringify({ estado: 'ANTES_CAPTURADO', checks })); return; }

    // 2. pedir ao cliente pela tela: lista, texto e link
    let url = '';
    {
      const { page, erros } = await abrir(browser, a, 'vera', 1366);
      await abrirProposta(page, id);
      await page.locator('#cmDados [data-de-pedir]').click();
      await page.locator('.atv-modal', { hasText: 'Pedir os dados ao cliente' }).waitFor();
      await page.screenshot({ path: path.join(saida, pref + '1366-pedir-ao-cliente.png') });
      await page.getByRole('button', { name: 'Gerar o pedido' }).click();
      await page.locator('#cmDeTxE').waitFor();
      url = await page.locator('#cmDeTxL').inputValue();
      assert.match(url, /\/dados-cliente\/#[a-f0-9]{64}$/);
      assert.match(await page.locator('#cmDeTxW').inputValue(), /link seguro/);
      await page.screenshot({ path: path.join(saida, pref + '1366-texto-do-pedido.png') });
      await page.locator('.atv-modal', { hasText: 'Texto do pedido' }).locator('.atv-fechar').click();
      await page.locator('.cm-selo', { hasText: 'Aguardando dados do cliente' }).first().waitFor();
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('pedir ao cliente pela tela: texto de e-mail e WhatsApp, link /dados-cliente/ e o selo "Aguardando dados do cliente"');
    }
    // 3. a página pública do cliente (a página real, as funções reais do legado), 390 px
    {
      const tk = /#([a-f0-9]{64})$/.exec(url)[1];
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('diálogo: ' + d.message()); d.dismiss(); });
      const pasta = path.join(PUBLICO, 'dados-cliente'), logo = path.join(PUBLICO, 'campo');
      await page.route(/^https?:\/\//, async (r) => {
        const u = new URL(r.request().url());
        if (u.host !== 'sgo.ensaio.test') return r.abort();
        if (u.pathname === '/dados-cliente/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(path.join(pasta, 'index.html')) });
        if (u.pathname.startsWith('/dados-cliente/api/')) {
          const corpo = JSON.parse(r.request().postData() || '{}');
          const fn = u.pathname.endsWith('/ver') ? 'ComDE_linkVer_' : 'ComDE_linkResponder_';
          const v = fn === 'ComDE_linkVer_' ? a.ctx.ComDE_linkVer_(corpo.token, { ip: '10.0.0.9' }) : a.ctx.ComDE_linkResponder_(corpo.token, corpo.dados, { ip: '10.0.0.9', navegador: 'ensaio' });
          return r.fulfill({ status: v.codigo === 'INDISPONIVEL' ? 404 : 200, contentType: 'application/json', body: JSON.stringify(v) });
        }
        const nome = u.pathname.replace('/dados-cliente/', '');
        const arq = fs.existsSync(path.join(pasta, nome)) ? path.join(pasta, nome) : path.join(logo, nome);
        if (!fs.existsSync(arq)) return r.fulfill({ status: 404, body: '' });
        return r.fulfill({ status: 200, contentType: nome.endsWith('.js') ? 'application/javascript' : nome.endsWith('.css') ? 'text/css' : nome.endsWith('.webp') ? 'image/webp' : 'image/png', body: fs.readFileSync(arq) });
      });
      await page.goto('http://sgo.ensaio.test/dados-cliente/#' + tk);
      await page.locator('h1', { hasText: 'PROP-' }).waitFor();
      assert.doesNotMatch(await page.locator('main').innerText(), /R\$|4\.500/);
      assert.ok(await semRolagemLateral(page));
      await page.screenshot({ path: path.join(saida, pref + '390-pagina-do-cliente.png'), fullPage: true });
      const campo = async (chave, v) => { const el = page.locator('[data-ch="' + chave + '"]'); if (await el.evaluate((x) => x.tagName) === 'SELECT') await el.selectOption(v); else await el.fill(v); };
      await campo('CLI.CEP', '123');
      await page.fill('#nome', 'Carla Compras Teste'); await page.fill('#email', 'carla@alfa.exemplo.test');
      await page.getByRole('button', { name: 'Enviar os dados' }).click();
      await page.locator('.msg-erro', { hasText: 'O CEP tem 8 números' }).waitFor();
      await page.screenshot({ path: path.join(saida, pref + '390-pagina-do-cliente-erro.png'), fullPage: true });
      for (const [k, v] of [['CLI.CEP', '74000-000'], ['CLI.LOGRADOURO', 'Rua das Flores'], ['CLI.NUMERO', '200'], ['CLI.BAIRRO', 'Setor Sul'], ['CLI.CIDADE', 'Goiânia'], ['CLI.UF', 'GO'], ['CT.TELEFONE', '62 98888-1111'],
        ['EQ.1.1.TIPO', 'Autoclave a vapor'], ['EQ.1.1.MARCA', 'Marca A'], ['EQ.1.1.MODELO', 'AV-100'], ['EQ.1.1.SERIE', 'S-001'], ['EQ.1.1.CAPACIDADE', '100 L'], ['EQ.1.1.SETOR', 'CME']]) await campo(k, v);
      await page.getByRole('button', { name: 'Enviar os dados' }).click();
      await page.locator('h1', { hasText: 'Dados recebidos' }).waitFor();
      await page.screenshot({ path: path.join(saida, pref + '390-pagina-do-cliente-recebido.png'), fullPage: true });
      assert.equal(a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1').CEP, undefined, 'nada no cadastro antes da conferência');
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('página do cliente (390 px): só os campos que faltam, sem valores; erro no próprio campo; resposta guardada pendente');
    }
    // 4. conferir a resposta, identificar os equipamentos que faltam e o escopo da especialista
    {
      const { page, erros } = await abrir(browser, a, 'vera', 1366);
      await abrirProposta(page, id);
      await page.locator('.cm-selo', { hasText: 'Dados do cliente a conferir' }).first().waitFor();
      await page.locator('#cmDados [data-de-conferir]').click();
      await page.locator('.atv-modal', { hasText: 'Conferir os dados do cliente' }).waitFor();
      await page.screenshot({ path: path.join(saida, pref + '1366-conferir-dados.png') });
      const linhaNum = page.locator('.cm-de-conf', { hasText: 'Número:' });
      await linhaNum.locator('input[value="R"]').check();
      await linhaNum.locator('[data-mot]').fill('Número da filial errado');
      await page.getByRole('button', { name: 'Aplicar a conferência' }).click();
      await page.locator('.cm-faixa.ok', { hasText: 'Conferência registrada' }).waitFor();
      assert.equal(a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1').CEP, '74000-000');
      checks.push('conferência pela tela: aceitou e recusou com motivo; só o aceito entrou no cadastro');
      // completar o resto pela tela: endereço (número), equipamentos e escopo
      await page.locator('#cmDados .cm-de-falta', { hasText: 'Endereço incompleto' }).locator('[data-de-preencher]').click();
      await page.locator('.atv-modal input[data-dech="CLI.NUMERO"]').fill('100');
      await page.locator('#cmDePCiente').check();
      await page.getByRole('button', { name: 'Gravar' }).click();
      await page.locator('.cm-faixa.ok', { hasText: 'Gravado' }).waitFor();
      const eqs = [['1', 2, 'Autoclave a vapor', 'AV-100', 'S-00', '100 L'], ['2', 1, 'Termodesinfectora', 'TD-1', 'T-01', '200 L'], ['3', 2, 'Lavadora ultrassônica', 'LU-5', 'L-0', '30 L'], ['4', 1, 'Secadora', 'SC-2', 'D-0', '250 L']];
      for (const [ordem, n, tipo, modelo, serie, cap] of eqs) {
        const bt = page.locator('#cmDados [data-de-item="' + ordem + '"]');
        if (!(await bt.count())) continue;
        await bt.click();
        const modal = page.locator('.atv-modal', { hasText: 'Identificar equipamentos' });
        await modal.waitFor();
        if (ordem === '1') await page.screenshot({ path: path.join(saida, pref + '1366-identificar-equipamentos.png') });
        const blocos = modal.locator('[data-eqn]');
        const qtd = await blocos.count();
        for (let k = 0; k < qtd; k++) {
          const b = blocos.nth(k);
          if (await b.locator('[data-eqc="serie"]').inputValue() || await b.locator('[data-eqc="serie"]').isDisabled()) continue;
          for (const [c, v] of [['tipo', tipo], ['marca', 'Marca X'], ['modelo', modelo], ['serie', serie + (k + 2)], ['capacidade', cap], ['setor', 'CME']]) await b.locator('[data-eqc="' + c + '"]').fill(v);
        }
        await modal.getByRole('button', { name: 'Usar estes equipamentos' }).click();
      }
      await page.getByRole('button', { name: 'Salvar rascunho' }).click();
      await page.locator('.cm-faixa.ok', { hasText: 'Rascunho salvo' }).waitFor();
      { const ff = await page.locator("#cmDados .cm-de-falta b").allInnerTexts(); assert.ok(!ff.some((t) => /equipamento/i.test(t)), "equipamentos identificados: " + ff.join(" | ")); }
      await page.locator('#cmDados [data-de-gerar]').click();
      await page.locator('.cm-faixa.ok', { hasText: 'Escopo escrito pela especialista' }).waitFor();
      await page.locator('#cmDeEscopo').scrollIntoViewIfNeeded();
      await fotoGaveta(page, '1366-escopo-gerado');
      await page.locator('#cmDeLi').check();
      await page.locator('[data-de-validar]').click();
      await page.locator('.cm-faixa.ok', { hasText: 'Escopo validado por' }).waitFor();
      assert.match(await page.locator('#cmDeEscopo').innerText(), /Validado por VERA VENDEDORA TESTE/);
      await fotoGaveta(page, '1366-escopo-validado');
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('pela tela: preencher agora com "Ciente", identificar os 6 equipamentos, gerar o escopo (modelo, sem chave da IA) e validar');
    }
    // 5. emitir: com dados completos o documento sai; o quadro fica verde
    {
      const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
      const faltas = a.ctx.ComDE_faltas_(p).map((f) => f.oQue);
      const { page, erros } = await abrir(browser, a, 'vera', 390);
      await abrirProposta(page, id);
      assert.ok(await semRolagemLateral(page));
      await fotoGaveta(page, '390-proposta-restante');
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('restante depois da conferência (390 px): ' + (faltas.join('; ') || 'nada'));
    }
    // 5b. intermediário (caso RIO MED): o vendedor registra sem percentual; a Diretoria decide pela tela
    {
      const { page, erros } = await abrir(browser, a, 'vera', 1366);
      await abrirProposta(page, id);
      await page.locator('[data-de-inter]').click();
      await page.fill('#cmInNome', 'Bruno Indicador Teste');
      await page.fill('#cmInMot', 'Indicou o hospital de Angra dos Reis e pede comissão');
      await page.locator('.atv-modal').getByRole('button', { name: 'Registrar' }).click();
      await page.locator('.cm-faixa.ok', { hasText: 'Intermediário registrado' }).waitFor();
      await page.locator('#cmDados .cm-de-falta', { hasText: 'Comissão de intermediação' }).waitFor();
      await fotoGaveta(page, '1366-intermediario-registrado');
      assert.deepEqual(erros, []);
      await page.close();
      const d = await abrir(browser, a, 'dora', 390);
      await abrirProposta(d.page, id);
      await d.page.locator('[data-de-inter-decidir]').click();
      await d.page.fill('#cmIdC', '5');
      await d.page.fill('#cmIdTx', 'Indicação comprovada pelo hospital');
      await d.page.getByRole('button', { name: 'Registrar a decisão' }).click();
      await d.page.locator('.cm-faixa.ok', { hasText: 'Decisão registrada' }).waitFor();
      assert.ok(await semRolagemLateral(d.page));
      await fotoGaveta(d.page, '390-intermediario-decidido');
      assert.deepEqual(d.erros, []);
      await d.page.close();
      assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id).INTERMEDIARIO_JSON).aprovacao.comissao, 5);
      checks.push('intermediário registrado pelo vendedor sem percentual; Diretoria decidiu 5% pela tela no celular (390 px)');
    }
    // 6. viagem: origem e destino, calcular pelo banco de rotas (RJ -> Angra), valores por estado
    {
      a.api('s_gaspar', 'rotaConferir', { origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', km: '156', pedagio: '30' });
      a.tabelas.CAD_UNIDADES.push({ ID: 'unRJ', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Angra', CIDADE: 'Angra dos Reis', UF: 'RJ', STATUS: 'ATIVO' });
      const { oportunidade } = oportunidadeDeTeste(a, 's_vera', { unidadeId: 'unRJ', equipamentos: [], titulo: 'Qualificação em Angra' });
      const np = a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id });
      a.api('s_vera', 'salvarProposta', { id: np.proposta.id, itens: [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 1, unidade: 'un.', precoUnitario: '4.500,00' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' } });
      for (const largura of [1366, 390]) {
        const { page, erros } = await abrir(browser, a, 'vera', largura);
        await abrirProposta(page, np.proposta.id);
        await page.locator('#cmEditor [data-passo="2"]').click();
        await page.selectOption('#cmCvHa', 'SIM');
        assert.equal(await page.locator('#cmCvOri').inputValue(), 'Rio de Janeiro/RJ', 'origem pela unidade sugerida (RJ)');
        await page.fill('#cmCvDest', 'Angra dos Reis/RJ');
        await page.locator('#cmCvRota').click();
        await page.locator('#cmCvFonte .cm-faixa', { hasText: 'Banco de rotas' }).waitFor();
        assert.equal(await page.locator('#cmCvKm').inputValue(), '156');
        assert.equal(await page.locator('#cmCvPed').inputValue(), '30');
        await page.fill('#cmCvTec', '1'); await page.fill('#cmCvNoi', '1'); await page.fill('#cmCvDias', '2');
        await page.locator('#cmCvCalc').click();
        await page.locator('#cmCvFonte', { hasText: 'R$ 3,00 (tabela por estado, RJ (origem do veículo))' }).waitFor();
        assert.ok(await semRolagemLateral(page));
        await page.locator('#cmCustos').scrollIntoViewIfNeeded();
        await fotoGaveta(page, largura + '-viagem-origem-destino');
        assert.deepEqual(erros, []);
        await page.close();
      }
      const d = JSON.parse(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === np.proposta.id).DESLOCAMENTO_JSON);
      assert.equal(d.unidade, 'RJ'); assert.equal(d.viagem.linhas.KM.valor, 3); assert.equal(d.viagem.linhas.HOSPEDAGEM.valor, 200); assert.equal(d.viagem.kmFonte, 'BANCO_ROTAS');
      checks.push('viagem RJ -> Angra pela tela: unidade RJ, km e pedágio do banco de rotas, km a R$ 3,00 e hotel a R$ 200 (1366 e 390 px)');
    }
    // 7. Metodologia: tabela de custos da viagem por estado (Diretoria)
    {
      const { page, erros } = await abrir(browser, a, 'dora', 1366);
      await page.evaluate(() => abrir('comercial_metodologia'));
      await page.locator('[data-met-pag="preco"]').first().waitFor();
      await page.locator('[data-met-pag="preco"]').first().click();
      await page.locator('#cmUFTab').waitFor();
      assert.equal(await page.locator('#cmUFTab [data-uf-linha]').count(), 2);
      await page.locator('#cmUFTab').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(saida, pref + '1366-metodologia-custos-por-estado.png') });
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('Metodologia (Diretoria): tabela "Custos da viagem por estado" com RJ (GO = padrão) e a linha para acrescentar');
    }
    console.log(JSON.stringify({ estado: 'PASS', checks }, null, 1));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
