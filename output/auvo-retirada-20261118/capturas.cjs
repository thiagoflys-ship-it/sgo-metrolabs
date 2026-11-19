// Capturas da retirada do Auvo (18/11/2026): Início com as pendências e o menu, em 1366 e 390 px, com o SGO+ de verdade (Index.html e
// os includes do legado em DEST) e o servidor simulado do ambiente de teste da Assistência, semeado com tarefas e pendências antigas
// do Auvo (para mostrar que nada do Auvo aparece). Também abre o "Histórico do Auvo" do Administrador. Só dados de teste.
// Uso: DEST=output/financeiro-20261116/cand31 node --require ./output/lote-20261111n/fontes.cjs output/auvo-retirada-20261118/capturas.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const AST = require('../../tests/_assistencia_ambiente.cjs');
const { abrirPortal, menuVisivel, rolagemLateral } = require('../../tests/_portal_cliente_navegador.cjs');
const { chromium } = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const SAIDA = path.join(__dirname, 'capturas');
fs.mkdirSync(SAIDA, { recursive: true });

const TAREFAS = [
  { ID: 't1', AUVO_TASK_ID: '9001', CLIENTE_ID_SGO: '', CLIENTE_NOME_AUVO: 'Hospital sem vínculo', TECNICO_ID_SGO: '', TECNICO_NOME_AUVO: 'TÉCNICO AUVO', TIPO_TAREFA: 'Preventiva',
    DATA_TAREFA: '2026-10-12T08:00:00', FINALIZADA: 'NAO', CHECKIN_EM: '2026-10-12T08:10:00', CHECKOUT_EM: '', EQUIPAMENTOS_ID_SGO: '' },
  { ID: 't2', AUVO_TASK_ID: '9002', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME_AUVO: 'TIAGO', TIPO_TAREFA: 'Corretiva',
    DATA_TAREFA: '2026-10-16T08:00:00', FINALIZADA: 'SIM', CHECKIN_EM: '2026-10-16T08:00:00', CHECKOUT_EM: '', RELATO_SERVICO: '', QTD_FOTOS: 0, EQUIPAMENTOS_ID_SGO: 'eq1', TASK_URL: 'https://app.auvo.exemplo/9002' }];
const PEND = [{ ID: 'p1', AUVO_TASK_ID: '9001', TASK_DATE: '2026-10-12T08:00:00', DIAS_ABERTA: 7, TEM_EVIDENCIA: 'NAO', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME: 'TIAGO',
  CLIENTE_NOME: 'Hospital sem vínculo', TASK_URL: 'https://app.auvo.exemplo/9001', ULTIMA_SINCRONIZACAO: '2026-10-13T05:00:00' }];

(async () => {
  const extras = ['SGO_Inicio.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Principal.js', 'SGO_Ajuda_Auvo.js', 'SGO_Auvo_Config.js', 'SGO_Auvo_Retirada.js', 'SGO_AuvoAcervo.js', 'SGO_AuvoAcervo_Tela.js'];
  const a = AST.ambiente({ extras, tabelas: { AUVO_TAREFAS: TAREFAS, AUVO_PENDENCIAS: PEND,
    AUVO_ACERVO_TAREFAS: [{ ID: 'ac1', AUVO_TASK_ID: '7001', DATA_TAREFA: '2025-05-02', TIPO_TAREFA: 'Preventiva', CLIENTE_NOME: 'Hospital Teste Alfa', TECNICO_NOME: 'Técnico antigo', FINALIZADA: 'SIM', JSON_VERSAO: 1, JSON_TAMANHO: 2048 }],
    AUVO_ACERVO_ARQUIVOS: [] } });
  a.props.AUVO_ACERVO_ESTADO = JSON.stringify({ modo: 'COPIA', situacao: 'CONCLUIDO', fase: 'FIM', inicio: '2022-01', fim: '2026-10', iniciadoEm: '2026-10-21T10:00:00', concluidoEm: '2026-10-25T18:00:00',
    tarefas: { lidas: 1, novas: 1, novaVersao: 0 }, arquivos: { esperados: 0, copiados: 0, pendentes: 0, falhas: 0, bytes: 0 } });
  a.props.AUVO_ACERVO_RELATORIO = JSON.stringify({ geradoEm: '2026-10-25T18:00:00', conclusao: 'ZERO_FALTAS', tarefas: { auvo: 1, noAcervo: 1, faltando: 0 }, arquivos: { esperados: 0, copiados: 0, falhas: 0, bytes: 0, conferencia: { ok: 0 } } });
  const browser = await chromium.launch({ headless: true });
  const relato = [];
  try {
    for (const [sid, quem] of [['s_admin', 'administrador'], ['s_gil', 'gestor'], ['s_tiago', 'tecnico']]) {
      for (const largura of [1366, 390]) {
        const { page, erros } = await abrirPortal(browser, a, sid, { largura, espera: 3500 });
        const menu = await menuVisivel(page);
        const textoInicio = await page.evaluate(() => (document.getElementById('conteudo') || document.body).innerText);
        relato.push({ quem, largura, menuAuvo: menu.filter((m) => /auvo/i.test(m)), inicioCitaAuvo: /Auvo/.test(textoInicio), rolagemLateral: await rolagemLateral(page), erros: erros.slice(0, 5) });
        await page.screenshot({ path: path.join(SAIDA, largura + '-inicio-pendencias-' + quem + '.png'), fullPage: largura < 800 });
        // menu aberto (no celular, o menu fica atrás do botão)
        if (largura < 800) {
          await page.evaluate(() => { const b = document.querySelector('.mobile-menu-btn, #btnMenuMobile, [data-acao="menu"], .sidebar-toggle'); if (b) b.click(); else { const m = document.getElementById('menu'); if (m) { m.classList.add('aberto', 'open'); m.style.transform = 'none'; m.style.left = '0'; } } });
          await page.waitForTimeout(600);
        }
        await page.evaluate(() => { document.querySelectorAll('.menu-grupo').forEach((g) => { g.classList.remove('recolhido', 'fechado'); const c = g.querySelector('.menu-grupo-cab'); if (c) c.setAttribute('aria-expanded', 'true'); const it = g.querySelector('.menu-grupo-itens'); if (it) it.style.display = ''; }); const o = document.getElementById('menu-secao-operacao'); const cab = o && o.querySelector('.menu-grupo-cab'); if (cab && typeof Menu_alternarGrupo_ === 'function' && !(o.querySelector('.menu-grupo-itens') || {}).offsetHeight) Menu_alternarGrupo_('operacao'); if (o) o.scrollIntoView(); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SAIDA, largura + (largura < 800 ? '-inicio-atalhos-' : '-menu-operacao-de-campo-') + quem + '.png'), fullPage: largura < 800 });
        if (quem === 'administrador') {
          await page.evaluate(() => { try { MOTORES = Object.assign({}, MOTORES, { AUVO: 'nativo' }); } catch (e) {} if (typeof abrir === 'function') abrir('auvo_historico'); });
          await page.waitForTimeout(1500);
          relato.push({ quem, largura, historico: (await page.evaluate(() => (document.getElementById('acvCard') || {}).innerText || '')).slice(0, 200) });
          await page.screenshot({ path: path.join(SAIDA, largura + '-historico-do-auvo-administrador.png'), fullPage: largura < 800 });
        }
        if (quem === 'gestor') {
          await page.evaluate(() => { try { MOTORES = Object.assign({}, MOTORES, { AUVO: 'nativo' }); } catch (e) {} if (typeof abrir === 'function') abrir('auvo'); });
          await page.waitForTimeout(800);
          relato.push({ quem, largura, linkAntigoAuvo: (await page.evaluate(() => (document.getElementById('tplAuvoContainer') || {}).innerText || '')).slice(0, 200) });
          await page.screenshot({ path: path.join(SAIDA, largura + '-link-antigo-auvo-gestor.png'), fullPage: false });
        }
        await page.close();
      }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(SAIDA, 'relato.json'), JSON.stringify(relato, null, 2));
  console.log(JSON.stringify(relato, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
