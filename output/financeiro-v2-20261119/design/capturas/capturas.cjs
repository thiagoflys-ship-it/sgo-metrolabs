// Capturas do protótipo do Financeiro v2 (19/11/2026), 1366 e 390 px, página inteira.
// Abre prototipo/index.html direto do disco (sem servidor). Dados fictícios.
// Uso: node output/financeiro-v2-20261119/design/capturas/capturas.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const SAIDA = __dirname;
const URL_BASE = 'file:///' + path.resolve(__dirname, '../prototipo/index.html').replace(/\\/g, '/');

const TELAS = [
  ['01-painel-diretoria', 'painel?papel=DONO&aba=diretoria'],
  ['02-painel-meu-dia', 'painel?papel=WANESSA&aba=dia'],
  ['03-aprovacoes-charles', 'aprovacoes?papel=CHARLES'],
  ['04-aprovacoes-wanessa', 'aprovacoes?papel=WANESSA'],
  ['05-contas-a-receber', 'receber?papel=WANESSA'],
  ['06-contas-a-pagar', 'pagar?papel=WANESSA'],
  ['07-conciliacao', 'conciliacao?papel=WANESSA'],
  ['08-cobranca', 'cobranca?papel=WANESSA'],
  ['09-bancos-e-saldos', 'bancos?papel=WANESSA'],
  ['10-transferencias', 'transferencias?papel=WANESSA'],
  ['11-notas-fiscais', 'notas?papel=WANESSA'],
  ['12-fornecedores-e-clientes', 'cadastros?papel=WANESSA'],
  ['13-impostos-e-guias', 'impostos?papel=WANESSA'],
  ['14-caju', 'caju?papel=WANESSA'],
  ['15-orcamento', 'orcamento?papel=DONO'],
  ['16-fechamento', 'fechamento?papel=DONO'],
  ['17-relatorios', 'relatorios?papel=DONO'],
  ['18-empresas-e-bancos', 'empresas?papel=DONO'],
  ['19-trilha', 'trilha?papel=DONO'],
  ['20-componentes-e-estados', 'componentes?papel=WANESSA'],
  ['21-sem-acesso', 'sem-acesso?papel=WANESSA'],
  ['22-janela-confirmar-aprovacao', 'aprovacoes?papel=CHARLES&janela=confirmar'],
  ['23-janela-nova-conta-a-pagar', 'pagar?papel=WANESSA&janela=nova-pagar'],
  ['24-painel-so-matriz', 'painel?papel=DONO&aba=diretoria&emp=MATRIZ']
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const relato = [];
  try {
    for (const largura of [1366, 390]) {
      const ctx = await browser.newContext({ viewport: { width: largura, height: largura < 800 ? 844 : 768 }, deviceScaleFactor: largura < 800 ? 2 : 1, locale: 'pt-BR' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', (e) => erros.push(String(e.message || e)));
      page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
      for (const [nome, hash] of TELAS) {
        const antes = erros.length;
        await page.goto(URL_BASE + '#' + hash, { waitUntil: 'networkidle' });
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        const lateral = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        const janela = /janela=/.test(hash);
        await page.screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png'), fullPage: !janela });
        relato.push({ largura, nome, rolagemLateral: lateral, erros: erros.slice(antes) });
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(SAIDA, 'relato.json'), JSON.stringify(relato, null, 2));
  const ruins = relato.filter((r) => r.erros.length || r.rolagemLateral);
  console.log(relato.length + ' capturas; com problema: ' + ruins.length);
  ruins.forEach((r) => console.log(JSON.stringify(r)));
})().catch((e) => { console.error(e); process.exit(1); });
