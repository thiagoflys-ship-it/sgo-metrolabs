// Legendas, exemplos e cenários da viagem na proposta (13/11/2026, etapa 3 de 3). Pedido do dono: "não tem legenda; se tem que preencher
// algo, como calcular, que valor informar? [...] deixar legenda, exemplos, criar cenários". Nada muda regra de conta: as legendas leem a
// política em vigor e o "Aplicar um cenário pronto" só preenche a tela e chama o mesmo "Calcular" (o servidor calcula).
// 1) Os seis cenários do guia pelo motor real (números do guia, da ajuda e do manual). 2) O servidor do Comercial é o mesmo da base
// (nenhuma mudança no total calculado). 3) No navegador, na PÁGINA COMPLETA (Index.html com os include() resolvidos): legendas com os
// valores da política, "Como o custo entra no preço" com o exemplo da PROP-2026-0071, cenários c, f, e e a trava do km; 1366, 390 e
// 320 px sem rolagem lateral, toque de 44 px, sem erro de JavaScript nem diálogo do navegador. Capturas em output/comercial-legendas-20261113/capturas.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/comercial-legendas-20261113.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const BASE = path.join(__dirname, '../output/comercial-legendas-20261113/base');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/comercial-legendas-20261113/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };

function amb0() {
  const a = ambiente();
  a.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  a.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return a;
}
const SEM_PED = { valor: '', nsa: true, motivo: 'Sem pedágio no trajeto' };
// Os seis cenários do guia (distâncias da tabela do Programa de conduta; Rio -> Angra da PROP-2026-0071; passagem ilustrativa no avião)
const CENARIOS = {
  a: { un: 'GO', custo: 285, item: 340, v: { tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Goiânia/GO', destino: 'Anápolis/GO', kmTrecho: '57', kmFonte: 'REFERENCIA_CONDUTA', viagens: 1, osPrevistas: 1, dias: 1, noites: 0, linhas: { PEDAGIO: SEM_PED } } },
  b: { un: 'GO', custo: 1225, item: 1430, v: { tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Goiânia/GO', destino: 'Luziânia/GO', kmTrecho: '175', kmFonte: 'REFERENCIA_CONDUTA', viagens: 1, osPrevistas: 1, dias: 2, noites: 1, linhas: { PEDAGIO: SEM_PED } } },
  c: { un: 'GO', custo: 4402.5, item: 5140, v: { tecnicos: 2, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Goiânia/GO', destino: 'Rio Verde/GO', kmTrecho: '228', kmFonte: 'REFERENCIA_CONDUTA', viagens: 1, osPrevistas: 1, dias: 3, noites: 2, linhas: { PEDAGIO: SEM_PED } } },
  d: { un: 'GO', custo: 8480, item: 9890, v: { tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Goiânia/GO', destino: 'Brasília/DF', kmTrecho: '209', kmFonte: 'REFERENCIA_CONDUTA', viagens: 4, osPrevistas: 4, dias: 1, noites: 0, linhas: { PEDAGIO: SEM_PED } } },
  e: { un: 'RJ', custo: 1284, item: 1500, v: { tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', kmTrecho: '139', kmFonte: 'BANCO_ROTAS', viagens: 1, osPrevistas: 1, dias: 2, noites: 1, linhas: { PEDAGIO: { valor: '50' } } } },
  f: { un: 'GO', custo: 3075, item: 3590, v: { tecnicos: 1, engenheiros: 0, transporte: 'AVIAO', origem: 'Goiânia/GO', destino: 'São Paulo/SP', kmTrecho: '926', kmFonte: 'REFERENCIA_CONDUTA', viagens: 1, osPrevistas: 1, dias: 3, noites: 2,
    linhas: { KM: { nsa: true, motivo: 'Viagem de avião: sem km rodado do veículo da empresa' }, PEDAGIO: SEM_PED, COMBUSTIVEL: { valor: '1500' }, HORAS: { horas: '6' } } } }
};

test('1. os seis cenários do guia, pelo motor real: custo, item na proposta e checklist completo', () => {
  const a = amb0();
  const base = a.ctx.ComPr_politica_();
  for (const [k, c] of Object.entries(CENARIOS)) {
    const pol = a.ctx.ComPr_polUnidade_(base, c.un);
    const n = a.ctx.ComPr_normalizar_({ unidade: c.un, viagem: Object.assign({ ha: 'SIM' }, c.v) }, null, pol, {});
    const r = a.ctx.ComPr_calcularViagem_(n, pol);
    assert.equal(r.custo, c.custo, 'cenário ' + k);
    assert.equal(a.ctx.ComPr_precoRepasse_(r.custo, pol), c.item, 'cenário ' + k + ' (item)');
    assert.equal(a.ctx.ComPr_checklist_(n, 'SERVICOS', pol).ok, true, 'cenário ' + k + ' (checklist)');
  }
  // o guia, a ajuda e o manual trazem os mesmos números (só no candidato)
  // 13/11/2026 (noite): guia refeito sem diária (decisão do dono); o exemplo da PROP-2026-0071 passa a ser 4.434 / 5.180 / 26.580
  const guia = path.join(__dirname, '../output/comercial-diaria-20261113/GUIA_EQUIPE_VIAGEM_NA_PROPOSTA.md');
  const ajuda = ler('SGO_Ajuda_Comercial.js');
  assert.match(ajuda, /Cenários da viagem com a conta completa \(13\/11\/2026\)/, 'ajuda com os cenários');
  const txt = fs.existsSync(guia) ? fs.readFileSync(guia, 'utf8') : '';
  for (const n of ['R$ 285,00', 'R$ 340,00', 'R$ 1.225,00', 'R$ 1.430,00', 'R$ 4.402,50', 'R$ 5.140,00', 'R$ 8.480,00', 'R$ 9.890,00', 'R$ 1.284,00', 'R$ 1.500,00', 'R$ 3.075,00', 'R$ 3.590,00', 'R$ 4.434,00', 'R$ 5.180,00', 'R$ 26.580,00']) {
    assert.ok(txt.includes(n), 'guia: ' + n);
  }
  for (const n of ['R$ 285,00', 'R$ 4.402,50', 'R$ 9.890,00', 'R$ 3.590,00', 'R$ 5.180,00']) assert.ok(ajuda.includes(n), 'ajuda: ' + n);
});

test('2. nenhuma regra de conta mudou: os arquivos do servidor do Comercial são os da base (produção)', () => {
  if (path.resolve(process.env.DEST || '') === path.resolve(BASE)) return;
  const arquivos = fs.readdirSync(BASE).filter((f) => /^SGO_Comercial_.*\.js$/.test(f));
  assert.ok(arquivos.length > 10);
  // 13/11/2026 (noite): SGO_Comercial_Precificacao.js mudou só na diária (a empresa não paga): coberto por comercial-diaria-20261113
  for (const f of arquivos.filter((x) => x !== 'SGO_Comercial_Precificacao.js')) assert.equal(ler(f), fs.readFileSync(path.join(BASE, f), 'utf8'), f + ' mudou');
});

// ---------------------------------------------------------------- navegador (página completa)
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
// a versão das telas (SGO_VersaoTelas.js, 12/11/2026) é um scriptlet que o servidor resolve; aqui vira texto vazio, como sem a função
const HTML = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');

function proposta(a, viagem, unidade) {
  const { oportunidade } = oportunidadeDeTeste(a);
  const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(a.api('s_vera', 'salvarProposta', { id, escopo: 'Qualificação térmica com relatório ao final.', condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' },
    itens: [{ descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00' }, { descricao: 'Qualificação de termodesinfectora', quantidade: 1, unidade: 'un.', precoUnitario: '3.800,00' }],
    deslocamento: { unidade: unidade || 'GO', viagem: Object.assign({ ha: 'SIM' }, viagem), repasse: 'ITEM' } }));
  return id;
}
const reg = (a, id) => a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const telaD = (a, id) => ok(a.api('s_vera', 'proposta', { id })).proposta.deslocamento;

async function abrir(browser, a, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo do navegador: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  const html = HTML();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes.s_vera; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_vera' }, s) } }; }
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
  return { page, erros };
}
async function abrirViagem(page, id) {
  await page.evaluate(() => abrir('comercial_propostas'));
  await page.waitForFunction(() => typeof CM !== 'undefined' && CM.ini, null, { timeout: 10000 });
  await page.evaluate((x) => Comercial_abrirProposta_(x), id);
  await page.locator('#cmGavetaCorpo .cm-acoes').first().waitFor({ timeout: 10000 });
  await page.locator('#cmEditor [data-passo="2"]').click();
  await page.locator('#cmCustos').waitFor();
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) {
  fs.mkdirSync(saida, { recursive: true });
  const altura = await page.evaluate(() => { const c = document.getElementById('cmGavetaCorpo'); return c ? c.scrollHeight + 120 : 900; });
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(altura, vp.height), 12000) });
  await page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true });
  await page.setViewportSize(vp);
}
async function calculou(page, a, id, antes) {
  for (let i = 0; i < 100; i++) { if (reg(a, id).DESLOCAMENTO_JSON !== antes) break; await page.waitForTimeout(50); }
  await page.locator('#cmCustos').waitFor();
}
async function confereKm(page) {
  // km digitado: a tela pede a conferência ("Você informou ... Confere?")
  const bt = page.locator('[data-km="ok"]');
  try { await bt.waitFor({ timeout: 1500 }); await bt.click(); } catch (e) { /* km de outra fonte: não pergunta */ }
}

test('3. página completa: legendas com os valores da política, repasse com a PROP-2026-0071, cenários e celular', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  try {
    const a = amb0();
    // proposta "Rio Verde, 2 técnicos" já calculada à mão: o total e o custo não podem mudar só por abrir a tela e calcular
    const idC = proposta(a, CENARIOS.c.v);
    const antes = { total: reg(a, idC).TOTAL, custo: telaD(a, idC).calculo.custo, item: telaD(a, idC).precoRepasse };
    assert.equal(antes.custo, 4402.5); assert.equal(antes.item, 5140);
    {
      const { page, erros } = await abrir(browser, a, 1366);
      await abrirViagem(page, idC);
      if (!(await page.locator('#cmCvDet').evaluate((d) => d.open))) await page.locator('#cmCvDet > summary').click();
      const legs = await page.locator('#cmCustos [data-leg]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-leg')));
      for (const k of ['TRANSPORTE', 'VIAGENS', 'KM', 'PEDAGIO', 'ALIMENTACAO', 'DIARIA', 'HOSPEDAGEM', 'CONDUTA', 'COMBUSTIVEL', 'HORAS', 'OUTROS', 'REPASSE']) assert.ok(legs.includes(k), 'legenda ' + k + ' na página (' + legs.join(',') + ')');
      // resumo à vista e os valores da política em vigor
      const resumo = (k) => page.locator('#cmCustos [data-leg="' + k + '"] > summary').innerText();
      assert.match(await resumo('KM'), /Km rodado = valor por km da regra do estado de origem × km de ida e volta/);
      assert.match(await resumo('CONDUTA'), /R\$ 300,00 × executantes × missões \(O\.S\.\), a partir de 200 km da sede/);
      const todo = await page.locator('#cmCustos [data-leg]').evaluateAll((xs) => xs.map((x) => x.textContent).join('\n'));
      for (const t of ['padrão R$ 2,50 (GO e estados sem valor próprio); RJ R$ 3,00', 'padrão R$ 150,00 (GO e estados sem valor próprio); RJ R$ 200,00', 'padrão R$ 100,00',
        'técnico R$ 112,50 e engenheiro R$ 165,00 por hora', '÷ 70 km/h', 'até 60 km de trecho', '139 km × 2 = 278 km × R$ 3,00 = R$ 834,00',
        '456 km ÷ 70 = 6,5 h × 2 técnicos × R$ 112,50 = R$ 1.462,50', 'R$ 4.434,00 ÷ (1 − 14,25%) = R$ 5.170,85, arredondado para R$ 5.180,00', 'total de R$ 26.580,00 nos dois modos',
        'quando a licitação ou o cliente exige preço fechado por serviço', 'Use quando o cliente aceita ver a viagem', 'o km rodado já cobre o combustível']) assert.ok(todo.includes(t), 'texto da legenda: ' + t);
      // tocar abre o "como preencher"
      await page.locator('#cmCustos [data-leg="KM"] > summary').click();
      assert.equal(await page.locator('#cmCustos [data-leg="KM"]').evaluate((d) => d.open), true);
      assert.ok(await page.locator('#cmCustos [data-leg="KM"] dt', { hasText: 'Não se aplica' }).isVisible());
      await page.locator('#cmCustos [data-leg="REPASSE"] > summary').click();
      await foto(page, '1366-legendas-rio-verde');
      // calcular sem mudar nada: mesmo custo, mesmo item, mesmo total
      const ds = reg(a, idC).DESLOCAMENTO_JSON;
      await page.locator('#cmCvCalc').click();
      await calculou(page, a, idC, ds);
      await page.waitForTimeout(300);
      assert.equal(telaD(a, idC).calculo.custo, antes.custo); assert.equal(telaD(a, idC).precoRepasse, antes.item); assert.equal(reg(a, idC).TOTAL, antes.total);
      // cenário c pela tela: o mesmo resultado da conta à mão
      await page.locator('#cmCvCen').click();
      await page.locator('.atv-modal', { hasText: 'Aplicar um cenário pronto' }).waitFor();
      await page.locator('.cm-cen', { hasText: 'c) 2 técnicos' }).click();
      assert.equal(await page.locator('#cmCenTec').inputValue(), '2'); assert.equal(await page.locator('#cmCenNoi').inputValue(), '2');
      await foto(page, '1366-cenarios-janela');
      const ds2 = reg(a, idC).DESLOCAMENTO_JSON;
      await page.locator('[data-cen="aplicar"]').click();
      await calculou(page, a, idC, ds2);
      await page.locator('#cmCvCenMsg', { hasText: 'Cenário aplicado: c) 2 técnicos' }).waitFor();
      assert.equal(telaD(a, idC).calculo.custo, 4402.5); assert.equal(telaD(a, idC).precoRepasse, 5140); assert.equal(reg(a, idC).TOTAL, antes.total);
      assert.ok(await semRolagemLateral(page)); assert.deepEqual(erros, []);
      await foto(page, '1366-cenario-c-aplicado');
      await page.close();
      checks.push('1366: 12 legendas com os valores da política; repasse com a PROP-2026-0071; calcular sem mudança mantém custo R$ 4.402,50, item R$ 5.140,00 e o total; cenário c pela tela = conta à mão');
    }
    // celular 390: cenário f (avião) com passagem e horas; trava do km sem km; cenário e (troca a origem)
    {
      const idF = proposta(a, { tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Goiânia/GO', destino: 'São Paulo/SP', kmTrecho: '926', kmFonte: 'REFERENCIA_CONDUTA', viagens: 1, osPrevistas: 1, dias: 1, noites: 0, linhas: { PEDAGIO: SEM_PED } });
      const { page, erros } = await abrir(browser, a, 390);
      await abrirViagem(page, idF);
      await page.locator('#cmCvCen').click();
      await page.locator('.cm-cen', { hasText: 'f) Transporte aéreo' }).click();
      assert.ok(await page.locator('#cmCenPass').isVisible());
      await page.fill('#cmCenPass', '1500'); await page.fill('#cmCenHoras', '6');
      assert.ok(await semRolagemLateral(page));
      await foto(page, '390-cenario-f-janela');
      const ds = reg(a, idF).DESLOCAMENTO_JSON;
      await page.locator('[data-cen="aplicar"]').click();
      await calculou(page, a, idF, ds);
      await page.waitForTimeout(300);
      const dF = telaD(a, idF), v = dF.dados.viagem;
      assert.equal(v.transporte, 'AVIAO'); assert.equal(v.dias, 3); assert.equal(v.noites, 2); assert.equal(v.linhas.KM.nsa, true); assert.equal(v.linhas.COMBUSTIVEL.valor, 1500); assert.equal(v.linhas.HORAS.horas, 6);
      assert.equal(dF.calculo.custo, CENARIOS.f.custo); assert.equal(dF.precoRepasse, CENARIOS.f.item); assert.equal(dF.checklist.ok, true, JSON.stringify(dF.checklist.faltas));
      if (!(await page.locator('#cmCvDet').evaluate((d) => d.open))) await page.locator('#cmCvDet > summary').click();
      await page.locator('#cmCustos [data-leg="TRANSPORTE"] > summary').click();
      assert.ok(await semRolagemLateral(page));
      // toque de 44 px nas legendas e no botão
      const alturas = await page.locator('#cmCustos .cm-leg-det > summary, #cmCvCen').evaluateAll((xs) => xs.map((x) => x.getBoundingClientRect().height));
      assert.ok(alturas.length >= 12 && alturas.every((h) => h >= 43.5), 'toque de 44 px: ' + alturas.join(','));
      await foto(page, '390-cenario-f-aplicado');
      // sem km: a trava diz o quê, por quê e o que fazer
      await page.fill('#cmCvKm', '');
      await page.locator('#cmCvCen').click();
      await page.locator('.cm-cen', { hasText: 'a) Cidade próxima' }).click();
      await page.locator('[data-cen="aplicar"]').click();
      await page.locator('#cmCenMsg .cm-faixa.erro', { hasText: 'Falta o km do trecho' }).waitFor();
      assert.match(await page.locator('#cmCenMsg').innerText(), /O cenário usa o destino e o km da tela para calcular. Feche esta janela, informe a cidade de destino, toque em "Calcular km e pedágio"/);
      await page.locator('[data-cen="fechar"]').click();
      // cenário e: a origem passa para a sede do Rio; o km de outra origem é apagado e a conta espera o km novo
      await page.fill('#cmCvKm', '926');
      await page.locator('#cmCvCen').click();
      await page.locator('.cm-cen', { hasText: 'e) Rio de Janeiro' }).click();
      const ds3 = reg(a, idF).DESLOCAMENTO_JSON;
      await page.locator('[data-cen="aplicar"]').click();
      await page.locator('#cmCvFonte .cm-faixa', { hasText: 'aplicado na tela, ainda sem calcular' }).waitFor();
      assert.equal(await page.locator('#cmCvOri').inputValue(), 'Rio de Janeiro/RJ'); assert.equal(await page.locator('#cmCvKm').inputValue(), '');
      assert.equal(reg(a, idF).DESLOCAMENTO_JSON, ds3, 'não salvou sem o km novo');
      await page.fill('#cmCvDest', 'Angra dos Reis/RJ'); await page.fill('#cmCvKm', '139'); await page.fill('#cmCvPed', '50');
      await page.locator('#cmCvCalc').click();
      await confereKm(page);
      await calculou(page, a, idF, ds3);
      await page.waitForTimeout(300);
      const dE = telaD(a, idF);
      assert.equal(dE.unidade, 'RJ'); assert.equal(dE.calculo.custo, CENARIOS.e.custo); assert.equal(dE.precoRepasse, CENARIOS.e.item);
      assert.ok(await semRolagemLateral(page)); assert.deepEqual(erros, []);
      await foto(page, '390-cenario-e-rio');
      await page.close();
      checks.push('390: cenário f (avião) = R$ 3.075,00 / item R$ 3.590,00 com checklist completo; trava "Falta o km do trecho"; cenário e troca para a filial do Rio e espera o km (R$ 1.284,00 / R$ 1.500,00); 44 px; sem rolagem lateral');
    }
    // 320 px: legendas abertas e a janela de cenários cabem na tela
    {
      const { page, erros } = await abrir(browser, a, 320);
      await abrirViagem(page, idC);
      if (!(await page.locator('#cmCvDet').evaluate((d) => d.open))) await page.locator('#cmCvDet > summary').click();
      for (const k of ['VIAGENS', 'HORAS', 'REPASSE']) await page.locator('#cmCustos [data-leg="' + k + '"] > summary').click();
      assert.ok(await semRolagemLateral(page), 'legendas abertas em 320 px');
      await foto(page, '320-legendas-abertas');
      await page.locator('#cmCvCen').click();
      await page.locator('.cm-cen', { hasText: 'd) Contrato' }).click();
      assert.equal(await page.locator('#cmCenVg').inputValue(), '4'); assert.equal(await page.locator('#cmCenOs').inputValue(), '4');
      assert.ok(await semRolagemLateral(page), 'janela de cenários em 320 px');
      const largura = await page.locator('.atv-modal').evaluate((m) => m.getBoundingClientRect().right);
      assert.ok(largura <= 320.5, 'janela dentro da tela: ' + largura);
      await page.screenshot({ path: path.join(saida, '320-cenarios-janela.png') });
      assert.deepEqual(erros, []);
      await page.close();
      checks.push('320: legendas abertas e janela de cenários sem rolagem lateral');
    }
    console.log(JSON.stringify({ estado: 'PASS', checks }, null, 1));
  } finally { await browser.close(); }
});
