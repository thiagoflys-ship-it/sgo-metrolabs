// Depósito de viagem (E1, 11/11/2026) no navegador, na PÁGINA COMPLETA (Index.html com todos os include() resolvidos, como o
// servidor monta). O google.script.run da página fala com o ambiente de teste (tests/_viagem_ambiente.cjs): getSessaoAtual devolve
// a sessão escolhida e Viagem_api / Poderes_api rodam o código real; as outras funções respondem "indisponível no ensaio".
// Sem rede (fontes e ícones externos bloqueados). Fluxo real pela tela: gestor monta e envia, Matheus aprova, Financeiro registra
// a carga; 1366 px e 390 px, sem erro de JavaScript e sem rolagem lateral. 11/11/2026: Comece por aqui, Kanban, Gantt, relatórios A4 (abrir e baixar), conferência
// guiada dos centros e aprovadores por caixas de marcar. E2 (11/11/2026): prestação de contas pela tela (lançar com a leitura do
// comprovante, conferir, glosar, acertar o saldo, ciência com o A4 de fechamento e a trava), 390 e 1366 px.
// Capturas em output/deposito-viagem-e2/capturas.
// Uso: DEST=<legado> node --require output/deposito-viagem-20261111/fontes.cjs tests/deposito-viagem-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const { ambiente, PASTA } = require('./_viagem_ambiente.cjs');

const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/deposito-viagem-e2/capturas');
fs.mkdirSync(saida, { recursive: true });
function paginaCompleta() { return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')); }
const HTML = paginaCompleta();

async function abrir(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo do navegador aberto: ' + d.type() + ' ' + d.message()); d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (fn === 'Viagem_api' || fn === 'Poderes_api') return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) };
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
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-deposito_viagem'); return b && b.style.display === ''; }, null, { timeout: 10000 });
  return { page, erros };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function foto(page, nome) { await page.screenshot({ path: path.join(saida, nome + '.png'), fullPage: true }); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const a = ambiente();
  try {
    // 1. gestor no computador: monta pela tela, anexa o orçamento do hotel, salva e envia
    {
      const { page, erros } = await abrir(browser, a, 'gil', 1366);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('button', { name: 'Nova solicitação' }).click();
      await page.locator('#vgCentro').waitFor();
      const centro = await page.locator('#vgCentro option', { hasText: 'GO-TECNICA' }).getAttribute('value');
      await page.selectOption('#vgCentro', centro);
      await page.selectOption('#vgVinc', 'CLIENTE');
      await page.locator('#vgCli').waitFor();
      await page.selectOption('#vgCli', 'c1');
      await page.fill('#vgObj', 'Qualificação térmica das autoclaves do Hospital Teste Alfa');
      await page.fill('#vgCidade', 'Rio Verde');
      await page.selectOption('#vgUf', 'GO');
      await page.fill('#vgSaida', '2026-10-26T07:00'); await page.locator('#vgSaida').dispatchEvent('change');
      await page.fill('#vgChegada', '2026-10-29T18:00'); await page.locator('#vgChegada').dispatchEvent('change');
      assert.match(await page.locator('#vgDur').innerText(), /4 dias \(3 noites\)/);
      for (const id of ['u_tec', 'u_tec2']) { await page.selectOption('#vgPes', id); await page.getByRole('button', { name: 'Incluir na equipe' }).click(); }
      await page.selectOption('#vgVeicTipo', 'FROTA');
      await page.selectOption('#vgVeic', 'v1');
      await page.fill('#vgRot', 'Goiânia > Rio Verde (carro da Frota); Rio Verde > Goiânia (carro da Frota)');
      const linha = async (cat, valores) => {
        await page.locator('#vgCat_' + cat + ' button', { hasText: 'Adicionar a linha' }).click();
        const ins = page.locator('#vgCat_' + cat + ' .vg-linhaorc input[type="text"]');
        for (let i = 0; i < valores.length; i++) await ins.nth(i).fill(valores[i]);
      };
      await linha('HOSPEDAGEM', ['2', '3', '250,00', 'Hotel Centro, Rio Verde']);
      await linha('ALIMENTACAO', ['2', '4', '100,00']);
      await linha('COMBUSTIVEL', ['600', '10', '6,00']);
      for (const [cat, mot] of [['PEDAGIO', 'carro da Frota com tag'], ['ESTACIONAMENTO', 'hotel com estacionamento'], ['PASSAGENS', 'viagem de carro'], ['TRANSPORTE_LOCAL', 'carro da Frota no destino']]) {
        await page.locator('#vgCat_' + cat + ' .vg-na input[type="checkbox"]').check();
        await page.locator('#vgCat_' + cat + ' .vg-na input[type="text"]').fill(mot);
      }
      assert.equal(await page.locator('#vgTotal').innerText(), 'R$ 2.660,00');
      assert.equal(await page.locator('#vgForm input[id*="otal"], #vgForm input[name*="otal"]').count(), 0, 'nenhum campo de total para digitar');
      checks.push('formulário: total R$ 2.660,00 calculado pela soma, sem campo de total');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-formulario');
      // anexar no hotel: salva o rascunho e anexa
      await page.locator('#vgCat_HOSPEDAGEM input[type="file"]').setInputFiles({ name: 'orcamento-hotel.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 orcamento do hotel') });
      await page.locator('#vgMsg', { hasText: 'Anexo incluído em Hospedagem' }).waitFor();
      assert.equal(await page.locator('#vgCat_HOSPEDAGEM .vg-anexos a').count(), 1);
      checks.push('anexo pela tela: rascunho salvo e orçamento do hotel anexado na linha');
      await page.getByRole('button', { name: 'Salvar rascunho' }).click();
      await page.locator('#vgMsg', { hasText: 'Rascunho gravado' }).waitFor();
      assert.equal(await page.locator('.vg-faixa', { hasText: 'O que falta para enviar' }).count(), 0, 'nada faltando');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-detalhe-rascunho');
      // o A4 abre em aba nova no computador
      const [pop] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Ver o relatório A4' }).click()]);
      await pop.waitForFunction(() => document.body && /Solicitação de depósito de viagem/.test(document.body.innerText), null, { timeout: 10000 });
      assert.match(await pop.content(), /2 quartos × 3 noites × R\$ 250,00/);
      await pop.screenshot({ path: path.join(saida, '1366-relatorio-a4-previa.png'), fullPage: true }); await pop.close();
      await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
      await page.locator('#vgMsg', { hasText: 'enviada para aprovação de MATHEUS GERENTE TESTE' }).waitFor();
      assert.equal(await page.locator('.vg-selo.s-AGUARDANDO_APROVACAO').count(), 1);
      await foto(page, '1366-detalhe-enviada');
      assert.deepEqual(erros, []);
      checks.push('gestor: enviou pela tela; GS05 para o Matheus (' + (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS05').map((l) => l.USUARIO_ID + '/' + l.SITUACAO).join(', ') + ')');
      await page.close();
    }
    const id = a.tabelas.VIA_SOLICITACOES[0].ID;
    // 2. Matheus no celular (390 px): Aguardando minha decisão, fundamentação obrigatória na tela, aprova
    {
      const { page, erros } = await abrir(browser, a, 'matheusgodoi', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: /Aguardando minha decisão/ }).click();
      await page.locator('.vg-cartao').first().waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-aguardando-decisao');
      await page.locator('.vg-cartao').first().click();
      await page.getByRole('button', { name: 'Aprovar' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-detalhe-decidir');
      await page.getByRole('button', { name: 'Aprovar' }).click();
      await page.locator('#vgMsg', { hasText: 'Escreva a fundamentação' }).waitFor();
      await page.fill('#vgFund', 'Valores dentro do praticado em Rio Verde');
      await page.getByRole('button', { name: 'Aprovar' }).click();
      await page.locator('#vgMsg', { hasText: 'aprovada' }).waitFor();
      assert.equal(a.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'APROVADA');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-aprovada');
      assert.deepEqual(erros, []);
      checks.push('Matheus (390 px): fundamentação exigida na própria tela, aprovou; sem rolagem lateral');
      await page.close();
    }
    // 3. Gestor tenta pelo celular e vê o motivo do que não pode (nunca no limbo)
    {
      const { page, erros } = await abrir(browser, a, 'tiago', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.locator('.vg-faixa', { hasText: 'Quem monta a solicitação é o gestor da área' }).waitFor();
      await page.locator('.vg-cartao').first().click();
      await page.locator('h3', { hasText: 'O que você pode fazer agora' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-tecnico-viagem');
      assert.deepEqual(erros, []);
      checks.push('técnico (390 px): vê a viagem em que está, sem botão de montar, com o motivo');
      await page.close();
    }
    // 4. Financeiro registra a carga com o comprovante (1366 px)
    {
      const { page, erros } = await abrir(browser, a, 'wanessa', 1366);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: /Carga no cartão/ }).click();
      await page.locator('.vg-cartao').first().click();
      await page.locator('#vgCgData').waitFor();
      await page.fill('#vgCgData', '2026-10-19');
      await page.locator('#vgCgArq').setInputFiles({ name: 'comprovante-caju.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
      await page.fill('#vgCgValor', '3.000,00');
      await page.getByRole('button', { name: 'Registrar a carga' }).click();
      await page.locator('#vgMsg', { hasText: 'passa do que falta carregar' }).waitFor();
      await page.fill('#vgCgValor', '2.660,00');
      await page.getByRole('button', { name: 'Registrar a carga' }).click();
      await page.locator('#vgMsg', { hasText: 'Carga de R$ 2.660,00 registrada' }).waitFor();
      assert.equal(a.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'CARGA_FEITA');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-carga-registrada');
      await page.getByRole('tab', { name: 'Política de viagem' }).click();
      await page.locator('h3', { hasText: 'Política de viagem em vigor' }).waitFor();
      await foto(page, '1366-politica');
      await page.getByRole('tab', { name: 'Centros de custo' }).click();
      await page.locator('td', { hasText: 'GO-TECNICA' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-centros');
      assert.deepEqual(erros, []);
      checks.push('Financeiro: recusa acima do aprovado na tela; carga registrada com comprovante; política e centros abrem');
      await page.close();
    }
    // 5. Diretoria no celular: política (formulário de tetos) sem rolagem lateral
    {
      const { page, erros } = await abrir(browser, a, 'dora', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: 'Política de viagem' }).click();
      await page.locator('#vgPolLim').waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-politica-diretoria');
      await page.getByRole('tab', { name: 'Todas' }).click();
      await page.locator('.vg-cartao').first().click();
      await page.locator('h3', { hasText: 'Orçamento discriminado' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-detalhe-diretoria');
      assert.deepEqual(erros, []);
      checks.push('Diretoria (390 px): política com os tetos vazios e a solicitação completa, sem rolagem lateral');
      await page.close();
    }
    // 6. organização (11/11/2026): Comece por aqui, Kanban, Gantt, relatórios A4 e conferência guiada, pelo Financeiro (1366 e 390 px)
    for (const largura of [1366, 390]) {
      const { page, erros } = await abrir(browser, a, 'wanessa', largura);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.locator('.vg-guia-faixa').waitFor();
      await page.locator('.vg-guia-faixa').getByRole('button', { name: 'Comece por aqui' }).click();
      await page.locator('.vg-papel.is-meu h4', { hasText: 'Financeiro' }).waitFor();
      assert.equal(await page.locator('.vg-guia-faixa').count(), 0, 'a faixa some depois de abrir o guia');
      assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-comece-por-aqui');
      await page.getByRole('tab', { name: 'Kanban' }).click();
      await page.locator('.atv-kcard').first().waitFor();
      assert.ok(await page.locator('.atv-kcol-cab', { hasText: 'Carga feita' }).count() >= 1);
      assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-kanban');
      await page.getByRole('tab', { name: 'Gantt' }).click();
      await page.locator('.atv-gantt-wrap svg').waitFor();
      assert.ok(await page.locator('.atv-gantt-wrap svg text', { hasText: 'TIAGO TECNICO TESTE' }).count() + await page.locator('.atv-gantt-wrap svg text', { hasText: 'TIAGO TECNICO' }).count() >= 1);
      assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-gantt');
      await page.locator('.atv-gantt-wrap g[data-pna-id] rect').first().click();
      await page.locator('h3', { hasText: 'O que você pode fazer agora' }).waitFor();
      await page.getByRole('tab', { name: 'Relatórios A4' }).click();
      await page.locator('#vgRelDe').waitFor();
      await page.fill('#vgRelDe', '2026-10-01'); await page.fill('#vgRelAte', '2026-11-30');
      assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-relatorios');
      if (largura === 1366) {
        const [pop] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Gerar e abrir o A4' }).click()]);
        await pop.waitForFunction(() => /Viagens do período por centro de custo/.test(document.body.innerText) && /GO-TECNICA/.test(document.body.innerText), null, { timeout: 10000 });
        await pop.screenshot({ path: path.join(saida, '1366-relatorio-periodo-a4.png'), fullPage: true });
        await pop.close();
      } else {
        // no celular o A4 abre no visualizador do SGO+ (iframe com Voltar e Imprimir), não numa aba nova
        await page.getByRole('button', { name: 'Gerar e abrir o A4' }).click();
        await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some((f) => { try { return /Viagens do período por centro de custo/.test(f.contentDocument.body.innerText); } catch (e) { return false; } }), null, { timeout: 10000 });
        await foto(page, '390-relatorio-periodo-visualizador');
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('iframe')).some((f) => f.offsetParent !== null && /Viagens do período/.test((f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerText) || '')), null, { timeout: 10000 });
      }
      const [down] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar o arquivo (.html)' }).click()]);
      assert.match(down.suggestedFilename(), /^Deposito-de-viagem_periodo_2026-10-01_a_2026-11-30\.html$/);
      await page.getByRole('tab', { name: 'Centros de custo' }).click();
      await page.getByRole('button', { name: /conferência guiada/ }).first().click();
      await page.locator('#vgGuiCaju').waitFor();
      const cod = (await page.locator('.vg-guiado .vg-cc-cod').innerText()).trim();
      await page.fill('#vgGuiCaju', 'CAJU-' + cod);
      await page.getByRole('button', { name: 'Está certo: marcar como conferido' }).click();
      await page.locator('#vgMsg', { hasText: cod + ' marcado como conferido' }).waitFor();
      await page.locator('.vg-guiado', { hasText: 'centro 2 de 22' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, largura + '-centros-conferencia-guiada');
      assert.deepEqual(erros, []);
      checks.push('Financeiro (' + largura + ' px): Comece por aqui com "seu papel", Kanban, Gantt (abre a solicitação), relatório A4 aberto e baixado, conferência guiada marcou ' + cod);
      await page.close();
    }
    // 7. Diretoria no celular: aprovadores por caixas de marcar, busca, escolhidos no alto; tetos só de hotel e alimentação
    {
      const { page, erros } = await abrir(browser, a, 'dora', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: 'Política de viagem' }).click();
      await page.locator('#vgPolBusca').waitFor();
      assert.equal(await page.locator('select[multiple]').count(), 0, 'sem seleção múltipla');
      assert.equal(await page.locator('[data-teto]').count(), 2, 'só hospedagem e alimentação');
      await page.fill('#vgPolBusca', 'gil');
      await page.locator('#vgPolLista label', { hasText: 'GIL GESTOR TECNICO TESTE' }).locator('input').check();
      await page.locator('.vg-escolhido', { hasText: 'GIL GESTOR TECNICO TESTE' }).waitFor();
      assert.equal(await page.locator('.vg-escolhido').count(), 2);
      await page.locator('.vg-escolhido', { hasText: 'GIL GESTOR TECNICO TESTE' }).getByRole('button').click();
      assert.equal(await page.locator('.vg-escolhido').count(), 1);
      await page.fill('[data-teto="HOSPEDAGEM"]', '150,00'); await page.fill('[data-teto="ALIMENTACAO"]', '100,00');
      await page.fill('#vgPolMot', 'Tetos de hotel e alimentação decididos pelo dono');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-politica-aprovadores');
      await page.getByRole('button', { name: 'Gravar nova versão' }).click();
      await page.locator('#vgMsg', { hasText: 'Política gravada (versão 1)' }).waitFor();
      const v = JSON.parse(a.tabelas.VIA_POLITICA[a.tabelas.VIA_POLITICA.length - 1].VALOR_JSON);
      assert.deepEqual(v.aprovadores, ['u_mat']); assert.equal(v.tetos.HOSPEDAGEM, 150); assert.equal(v.tetos.ALIMENTACAO, 100); assert.equal(v.tetos.COMBUSTIVEL, null);
      assert.deepEqual(erros, []);
      checks.push('Diretoria (390 px): aprovador escolhido por caixa de marcar com busca e tirado pelo ×; tetos 150/100 gravados (versão 1); sem seleção múltipla');
      await page.close();
    }
    // 8. ETAPA 2 (11/11/2026): prestação de contas pela tela. A viagem termina (relógio em 30/10); o Tiago lança os gastos no
    // celular com a leitura do comprovante (IA simulada), o formulário não se perde, envia; a Wanessa confere (aceita e glosa),
    // conclui e registra a devolução no Caju no computador; o Matheus abre o A4 de fechamento e dá ciência. 390 e 1366 px.
    a.mudar('2026-10-30T10:00:00-03:00');
    a.props.GEMINI_API_KEY = 'chave-de-ensaio';
    const fetchOrig = a.ctx.UrlFetchApp.fetch;
    a.ctx.UrlFetchApp.fetch = (url, op) => /generativelanguage/.test(url)
      ? { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ valor: 1500, data: '27/10/2026', estabelecimento: 'Hotel Centro Rio Verde', cnpj: '12345678000190', tipo: 'hotel', legivel: true }) }] } }] }) }
      : fetchOrig(url, op);
    const png = (n) => ({ name: n, mimeType: 'image/png', buffer: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from(n + Math.random())]) });
    {
      const { page, erros } = await abrir(browser, a, 'tiago', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.locator('.vg-agora', { hasText: 'prestação de contas para você fazer' }).waitFor();
      await page.getByRole('tab', { name: /Prestar contas/ }).click();
      await page.locator('.vg-cartao').first().click();
      await page.locator('#vgGsArq').waitFor();
      assert.ok(await page.locator('.vg-faixa', { hasText: 'preste contas até' }).count() >= 1, 'próximo passo com o prazo');
      // 1º gasto: comprovante + leitura automática (preenche só o que está vazio)
      await page.fill('#vgGsEstab', 'Hotel Centro');
      await page.locator('#vgGsArq').setInputFiles(png('hotel.png'));
      await page.getByRole('button', { name: /Ler o comprovante/ }).click();
      await page.locator('#vgGsIa .vg-ia', { hasText: 'Preenchido' }).waitFor();
      assert.equal(await page.inputValue('#vgGsValor'), '1.500,00');
      assert.equal(await page.inputValue('#vgGsData'), '2026-10-27');
      assert.equal(await page.inputValue('#vgGsEstab'), 'Hotel Centro', 'a leitura não troca o que a pessoa digitou');
      assert.match(await page.inputValue('#vgGsCat'), /^HOSPEDAGEM\|/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-prestacao-leitura-comprovante');
      // sair com o gasto preenchido pergunta antes (nada se perde)
      await page.getByRole('tab', { name: 'Kanban' }).click();
      await page.locator('#fsPergunta', { hasText: 'Descartar o gasto que você está lançando?' }).waitFor();
      await page.locator('#fsPergunta button', { hasText: 'Continuar lançando' }).click();
      assert.equal(await page.inputValue('#vgGsValor'), '1.500,00', 'o que foi digitado continua');
      // 11/11/2026 (pedido do dono): sem dizer para que foi, a tela recusa na hora (nada vai ao servidor)
      await page.getByRole('button', { name: 'Lançar o gasto' }).click();
      await page.locator('#vgMsg', { hasText: 'Escreva para que foi o gasto' }).waitFor();
      await page.fill('#vgGsDesc', 'hospedagem da equipe no atendimento do Hospital Teste Alfa');
      await page.getByRole('button', { name: 'Lançar o gasto' }).click();
      await page.locator('#vgMsg', { hasText: 'Gasto nº 1 lançado' }).waitFor();
      // 2º gasto, sem leitura: alimentação
      await page.locator('#vgGsArq').setInputFiles(png('restaurante.png'));
      const opAlim = await page.locator('#vgGsCat option', { hasText: 'Alimentação' }).first().getAttribute('value');
      await page.selectOption('#vgGsCat', opAlim);
      await page.fill('#vgGsData', '2026-10-28'); await page.fill('#vgGsValor', '700,00'); await page.fill('#vgGsEstab', 'Restaurante Sabor');
      await page.fill('#vgGsDesc', 'almoço e jantar da equipe no atendimento');
      await page.getByRole('button', { name: 'Lançar o gasto' }).click();
      await page.locator('#vgMsg', { hasText: 'Gasto nº 2 lançado' }).waitFor();
      assert.equal(await page.locator('.vg-item').count(), 2);
      assert.match(await page.locator('.vg-conta', { hasText: 'Sobra a devolver' }).innerText(), /R\$ 460,00/);
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-prestacao-gastos-lancados');
      await page.getByRole('button', { name: 'Enviar a prestação ao Financeiro' }).click();
      await page.locator('#fsPergunta button', { hasText: 'Enviar' }).first().click();
      await page.locator('#vgMsg', { hasText: 'Prestação de contas enviada ao Financeiro' }).waitFor();
      assert.equal(a.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'PRESTACAO_ENVIADA');
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-prestacao-enviada');
      assert.deepEqual(erros, []);
      checks.push('Tiago (390 px): leitura do comprovante preencheu só os campos vazios; sair pediu confirmação sem perder o digitado; 2 gastos lançados; enviou');
      await page.close();
    }
    for (const largura of [1366, 390]) {
      const { page, erros } = await abrir(browser, a, 'wanessa', largura);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: /Conferir prestações/ }).click();
      if (largura === 390) { await page.locator('.vg-vazio, .vg-cartao').first().waitFor(); assert.ok(await semRolagemLateral(page)); await foto(page, '390-conferir-prestacoes-lista'); assert.deepEqual(erros, []); await page.close(); continue; }
      await page.locator('.vg-cartao').first().waitFor();
      await foto(page, '1366-conferir-prestacoes-lista');
      await page.locator('.vg-cartao').first().click();
      await page.locator('.vg-item').first().waitFor();
      assert.ok(await page.locator('.vg-item', { hasText: 'Bate com a leitura automática' }).count() >= 1);
      await page.locator('.vg-item').nth(0).getByRole('button', { name: 'Aceitar' }).click();
      await page.locator('#vgMsg', { hasText: 'Gasto nº 1 aceito' }).waitFor();
      await page.locator('.vg-item').nth(1).getByRole('button', { name: 'Glosar' }).click();
      const it2 = await page.locator('.vg-item').nth(1).getAttribute('id');
      await page.fill('#vgGlV_' + it2.slice(5), '100,00');
      await page.fill('#vgGlM_' + it2.slice(5), 'Bebida alcoólica não é reembolsável');
      await page.getByRole('button', { name: 'Confirmar a glosa' }).click();
      await page.locator('#vgMsg', { hasText: 'Gasto nº 2 glosado em R$ 100,00' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-conferencia-itens');
      await page.getByRole('button', { name: 'Concluir a conferência' }).click();
      await page.locator('#fsPergunta button', { hasText: 'Concluir' }).click();
      await page.locator('#vgMsg', { hasText: 'a devolver R$ 560,00' }).waitFor();
      await page.locator('#vgAcArq').setInputFiles(png('recolhimento-caju.png'));
      assert.equal(await page.inputValue('#vgAcValor'), '560,00');
      await page.fill('#vgAcData', '2026-10-30'); // o relógio do ensaio está em 30/10; a tela sugere o dia de hoje do computador
      await foto(page, '1366-acerto-do-saldo');
      await page.getByRole('button', { name: 'Registrar o acerto' }).click();
      await page.locator('#vgMsg', { hasText: 'Devolução de R$ 560,00 registrada' }).waitFor();
      assert.equal(a.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'AGUARDANDO_CIENCIA');
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-aguardando-ciencia');
      await page.getByRole('tab', { name: 'Kanban' }).click();
      await page.locator('.atv-kcol-cab', { hasText: 'Acerto e ciência' }).waitFor();
      await page.locator('.atv-kcol-cab', { hasText: 'Prestação de contas pendente' }).scrollIntoViewIfNeeded(); // a coluna da etapa 2 à vista na captura
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-kanban-etapa2');
      assert.deepEqual(erros, []);
      checks.push('Wanessa (1366 px): aceitou, glosou R$ 100,00 com motivo, concluiu (a devolver R$ 560,00), registrou o recolhimento no Caju com comprovante; Kanban com "Acerto e ciência"; 390 px sem rolagem lateral');
      await page.close();
    }
    for (const largura of [1366, 390]) {
      const { page, erros } = await abrir(browser, a, 'matheusgodoi', largura);
      await page.evaluate(() => abrir('deposito_viagem'));
      await page.getByRole('tab', { name: /Aguardando minha decisão/ }).click();
      if (largura === 390) {
        await page.locator('.vg-vazio, .vg-cartao').first().waitFor();
        if (await page.locator('.vg-cartao').count()) { await page.locator('.vg-cartao').first().click(); await page.locator('#vgPrest').waitFor(); }
        else { await page.getByRole('tab', { name: 'Todas' }).click(); await page.locator('.vg-cartao').first().click(); await page.locator('#vgPrest').waitFor(); }
        assert.ok(await semRolagemLateral(page)); await foto(page, '390-encerrada-prestacao');
        assert.deepEqual(erros, []); await page.close(); continue;
      }
      await page.locator('.vg-cartao').first().click();
      await page.getByRole('button', { name: 'Dar ciência' }).waitFor();
      const [pop] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Ver o A4 de fechamento' }).first().click()]);
      await pop.waitForFunction(() => /Prestação de contas e fechamento da viagem/.test(document.body.innerText) && /Por categoria/.test(document.body.innerText), null, { timeout: 10000 });
      await pop.screenshot({ path: path.join(saida, '1366-a4-fechamento-previa.png'), fullPage: true }); await pop.close();
      await page.fill('#vgCiCom', 'Ciente. Atenção às bebidas nas próximas viagens.');
      await page.getByRole('button', { name: 'Dar ciência' }).click();
      await page.locator('#vgMsg', { hasText: 'está encerrada' }).waitFor();
      assert.equal(a.tabelas.VIA_SOLICITACOES[0].SITUACAO, 'ENCERRADA');
      const [pop2] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Ver o A4 de fechamento' }).first().click()]);
      await pop2.waitForFunction(() => /Contas fechadas/.test(document.body.innerText), null, { timeout: 10000 });
      await pop2.screenshot({ path: path.join(saida, '1366-a4-fechamento-encerrada.png'), fullPage: true }); await pop2.close();
      assert.ok(await semRolagemLateral(page)); await foto(page, '1366-encerrada');
      assert.deepEqual(erros, []);
      checks.push('Matheus (1366 px): abriu o A4 de fechamento (prévia), deu ciência com comentário; A4 encerrado; 390 px sem rolagem lateral');
      await page.close();
    }
    // 9. trava: com o Tiago devendo outra prestação, a nova solicitação mostra o motivo e o que fazer (390 px)
    {
      const t = a.ctx;
      const s2 = JSON.parse(JSON.stringify(a.ctx.Viagem_api('s_gil', 'salvar', require('./_viagem_ambiente.cjs').solicitacaoBase(a, { saidaEm: '2026-11-02T07:00', chegadaEm: '2026-11-02T18:00', equipe: [{ id: 'u_tec', funcao: 'TECNICO' }], responsavelId: 'u_tec', linhas: [{ id: 'Lalim', categoria: 'ALIMENTACAO', q1: 1, q2: 1, unitario: '80,00' }], naoSeAplica: { HOSPEDAGEM: 'volta no mesmo dia', COMBUSTIVEL: 'cartão da Frota', PEDAGIO: 'tag da Frota', ESTACIONAMENTO: 'não precisa', PASSAGENS: 'de carro', TRANSPORTE_LOCAL: 'carro da Frota' } }))));
      assert.ok(s2.ok, s2.message);
      a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s2.solicitacao.id).SITUACAO = 'CARGA_FEITA';
      Object.assign(a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === s2.solicitacao.id), { CARREGADO_TOTAL: 80, APROVACAO_VALIDA: 'SIM', APROVADO_TOTAL: 80, PRESTACAO_PRAZO: '2026-11-05' });
      a.mudar('2026-11-09T10:00:00-03:00');
      const { page, erros } = await abrir(browser, a, 'gil', 390);
      await page.evaluate(() => abrir('deposito_viagem'));
      const s3 = JSON.parse(JSON.stringify(t.Viagem_api('s_gil', 'salvar', require('./_viagem_ambiente.cjs').solicitacaoBase(a, { saidaEm: '2026-11-23T07:00', chegadaEm: '2026-11-24T18:00' }))));
      await page.evaluate((id) => Viagem_irPara_({ id }), s3.solicitacao.id);
      await page.locator('.vg-faixa', { hasText: 'tem prestação de contas vencida' }).waitFor();
      assert.ok(await semRolagemLateral(page)); await foto(page, '390-trava-prestacao-vencida');
      assert.deepEqual(erros, []);
      checks.push('trava (390 px): nova solicitação com o Tiago devendo prestação mostra "O que falta" com o motivo e o que fazer');
      await page.close();
    }
    fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify({ situacao: 'PASS', checks, solicitacao: id, emails: a.emails.map((m) => m.to + ' :: ' + m.subject), ambiente: 'sintético, sem rede' }, null, 2));
    console.log('Depósito de viagem no navegador: PASS\n- ' + checks.join('\n- '));
  } catch (e) {
    fs.writeFileSync(path.join(saida, 'falha.json'), JSON.stringify({ erro: String(e && e.stack || e), checks }, null, 2));
    console.error(e); process.exitCode = 1;
  } finally { await browser.close(); }
})();
