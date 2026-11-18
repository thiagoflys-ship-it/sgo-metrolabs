// 18/11/2026 — Portal do cliente, ETAPA 6 (troca definitiva), no navegador: o SGO+ de verdade (Index.html com os includes do legado) e o
// servidor simulado ACEITANDO SÓ A LISTA FECHADA MÍNIMA (PortalCliente_api + o básico da sessão), como na produção com a recusa ligada e
// "Lista usada = Mínima". Prova que: o menu do cliente tem só as telas do Portal; cada item antigo (Início, Unidades, Equipamentos,
// Arquivo de documentos, Meus chamados, Relatórios de ciclo) abre a tela nova que o substitui; o prontuário por pastas (PGT/POP, pedido da
// Priscilla), a ajuda e os relatórios de ciclo funcionam pela entrada do Portal; nenhuma função fora da lista mínima é chamada; sem erro de
// JavaScript e sem rolagem lateral a 1366, 390 e 320 px. A equipe continua com o menu dela e vê o painel "Pronto para ligar?". Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/portal-cliente-etapa6-navegador-20261118.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('./_portal_cliente_navegador.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

const TELAS_GESTOR = ['portal_cliente_inicio', 'portal_cliente_conta', 'portal_cliente_chamados', 'portal_cliente_documentos', 'portal_cliente_equipamentos', 'portal_cliente_vencimentos', 'portal_cliente_indicadores', 'portal_cliente_ciclos'];
/** Tabela "antes -> depois": cada item antigo do menu do cliente e a tela do Portal que passa a abrir (com a aba). */
const TROCA = [
  ['dashboard', 'portal_cliente_inicio', null], ['assistencia_portal', 'portal_cliente_chamados', null], ['unidades', 'portal_cliente_equipamentos', 'unidades'],
  ['equipamentos', 'portal_cliente_equipamentos', 'equipamentos'], ['documentos', 'portal_cliente_documentos', 'pastas'], ['lavadora_ciclos', 'portal_cliente_ciclos', null],
  ['comercial', 'portal_cliente_inicio', null], ['certificado_calibracao', 'portal_cliente_inicio', null]];
const abaAtual = (page) => page.evaluate(() => { const b = document.querySelector('#pclAbas .vg-aba.is-atual'); return b ? b.getAttribute('data-dc-aba') || b.getAttribute('data-ch-aba') : ''; });

test('etapa 6 no navegador: cliente só com a lista mínima — menu do Portal, telas antigas trocadas sem perda, pastas, ajuda e ciclos pela entrada do Portal', { skip: !chromium && 'Playwright indisponível', timeout: 600000 }, async () => {
  const a = N.ambiente();
  const minima = N.listaMinima(a);
  assert.ok(minima.indexOf('PortalCliente_api') >= 0 && minima.indexOf('Assistencia_api') < 0 && minima.indexOf('documentosPastas') < 0, 'a lista mínima é a entrada do Portal e o básico');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const p = await N.abrirPortal(browser, a, 's_cliente.alfa', { largura, servir: (fn) => minima.indexOf(fn) >= 0 });
      const pg = p.page;
      // menu: só o Portal
      const menu = await N.menuVisivel(pg);
      assert.deepEqual(menu.slice().sort(), TELAS_GESTOR.slice().sort(), largura + ': menu do Gestor do cliente');
      // a tela de entrada é o Início do Portal (no celular também)
      assert.equal(await pg.evaluate(() => window.SGO_MODULO_ATUAL), 'portal_cliente_inicio', largura + ': entrada');
      await pg.waitForSelector('.pclini-cartao', { timeout: 8000 });
      assert.equal(await pg.locator('.pclini-cartao').count(), 4, 'quatro cartões');
      assert.match(await pg.locator('#pclIniTela').innerText(), /O que precisa de você[\s\S]*SOL-2026-0002/, 'o complemento pedido aparece em "O que precisa de você"');
      // cada item antigo abre a tela nova (antes -> depois)
      for (const [antigo, novo, aba] of TROCA) {
        await pg.evaluate((m) => abrir(m), antigo); await pg.waitForTimeout(900);
        assert.equal(await pg.evaluate(() => window.SGO_MODULO_ATUAL), novo, largura + ': ' + antigo + ' -> ' + novo);
        if (aba) assert.equal(await abaAtual(pg), aba, largura + ': ' + antigo + ' abre a aba ' + aba);
      }
      // prontuário por pastas (o antigo Arquivo de documentos, com PGT e POP), pela entrada do Portal
      await pg.evaluate(() => abrir('documentos')); await pg.waitForSelector('#pclDocPastas .dpst-pasta, #pclDocPastas .dpst-faixa', { timeout: 8000 });
      const pastas = await pg.locator('#pclDocPastas').innerText();
      assert.match(pastas, /PGT e POP/, 'pasta PGT e POP');
      assert.doesNotMatch(pastas, /Não foi possível/, 'as pastas carregam');
      assert.ok(p.chamadas.indexOf('PortalCliente_api:legado/documentosPastas') >= 0);
      // unidades da empresa e as pastas da unidade
      await pg.evaluate(() => abrir('unidades')); await pg.waitForSelector('[data-dc="unDocs"]', { timeout: 8000 });
      assert.match(await pg.locator('#pclCorpo').innerText(), /Unidade Centro[\s\S]*Unidade Filial/);
      assert.doesNotMatch(await pg.locator('#pclCorpo').innerText(), /Pessoa interna teste|Rui Responsável/, 'sem o responsável interno da unidade');
      // ficha do equipamento com o prontuário por pastas
      await pg.evaluate(() => { PCLD.irEq = 'eq1'; abrir('portal_cliente_equipamentos'); }); await pg.waitForSelector('[data-dc="eqPastas"]', { timeout: 8000 });
      await pg.click('[data-dc="eqPastas"]'); await pg.waitForSelector('#pclEqPastas .dpst-pasta, #pclEqPastas .dpst-faixa', { timeout: 8000 });
      assert.doesNotMatch(await pg.locator('#pclEqPastas').innerText(), /Não foi possível/);
      // relatórios de ciclo dentro do Portal
      await pg.evaluate(() => abrir('lavadora_ciclos')); await pg.waitForTimeout(1200);
      assert.match(await pg.locator('#conteudo').innerText(), /Relatórios de ciclo da lavadora/);
      assert.ok(p.chamadas.indexOf('PortalCliente_api:legado/LavCiclo_api') >= 0);
      // ajuda da tela pela entrada do Portal
      await pg.evaluate(() => abrir('portal_cliente_documentos')); await pg.waitForTimeout(700);
      await pg.evaluate(() => Ajuda_abrir_()); await pg.waitForTimeout(1000);
      assert.match(await pg.locator('#ajudaPainel').innerText(), /Por pastas \(prontuário\)/, 'ajuda da tela, com a aba nova');
      assert.ok(p.chamadas.indexOf('PortalCliente_api:legado/SGO_Ajuda_apiTela') >= 0);
      await pg.evaluate(() => Ajuda_fechar_());
      // nenhuma função fora da lista mínima
      const fora = Array.from(new Set(p.chamadas.map((c) => c.split(':')[0]))).filter((fn) => minima.indexOf(fn) < 0);
      assert.deepEqual(fora, [], largura + ': funções fora da lista mínima: ' + fora.join(', '));
      assert.deepEqual(p.erros, [], largura + ': erros de JavaScript');
      // sem rolagem lateral no Início e em Documentos
      for (const m of ['portal_cliente_inicio', 'portal_cliente_documentos', 'portal_cliente_equipamentos']) {
        await pg.evaluate((mm) => abrir(mm), m); await pg.waitForTimeout(900);
        assert.ok(await N.rolagemLateral(pg) <= 1, largura + ': rolagem lateral em ' + m);
      }
      await pg.close();
    }
    // Consulta: sem Indicadores e sem "Abrir chamado"; Solicitante: Indicadores, só a unidade dele
    const c = await N.abrirPortal(browser, a, 's_celia.alfa', { servir: (fn) => minima.indexOf(fn) >= 0 });
    assert.deepEqual((await N.menuVisivel(c.page)).sort(), TELAS_GESTOR.filter((m) => m !== 'portal_cliente_indicadores').sort(), 'menu da Consulta');
    await c.page.waitForSelector('.pclini-atalhos', { timeout: 8000 });
    assert.equal(await c.page.locator('[data-ini="abrir"]').count(), 0, 'a Consulta não tem "Abrir chamado"');
    assert.deepEqual(c.erros, []);
    await c.page.close();
    // equipe: o menu interno não muda, nenhuma tela é trocada, e a aba Segurança mostra "Pronto para ligar?"
    const d = await N.abrirPortal(browser, a, 's_dora', {});
    await d.page.evaluate(() => abrir('unidades')); await d.page.waitForTimeout(800);
    assert.equal(await d.page.evaluate(() => window.SGO_MODULO_ATUAL), 'unidades', 'a equipe continua com Cadastros > Unidades');
    await d.page.evaluate(() => abrir('portal_cliente_contratos')); await d.page.waitForTimeout(1200);
    await d.page.evaluate(() => PclT_irAba_('seguranca'));
    await d.page.waitForTimeout(1200);
    const seg = await d.page.locator('#pclCorpo').innerText();
    assert.match(seg, /Pronto para ligar\?/); assert.match(seg, /Trava do legado/); assert.match(seg, /Passo a passo para ligar/);
    assert.deepEqual(d.erros, []);
    await d.page.close();
  } finally { await browser.close(); }
});
