// Varredura do Financeiro v2 no celular (19/11/2026): abre as 17 páginas e cada aba (nova e antiga) que vive nelas, como dono (admin)
// e como Wanessa, em 390, 320 e 1366 px, no MODO CELULAR real do SGO+ (iPhone emulado: escala 3, toque, Safari), com valores grandes,
// roda o detector de defeito visual (tests/_financeiro_v2_celular.cjs) e grava capturas e o relato.
// Uso (na raiz do repositório): DEST=output/financeiro-20261116/cand39 node --require ./output/lote-20261111n/fontes.cjs \
//   output/financeiro-v2-celular-20261119/varredura.cjs <rotulo: antes|depois> [larguras, ex.: 390,320,1366] [capturas: sim|nao]
'use strict';
const fs = require('node:fs'), path = require('node:path');
const C = require('../../tests/_financeiro_v2_celular.cjs');
const { chromium } = require('C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const rot = process.argv[2] || 'antes';
const larguras = (process.argv[3] || '390,320,1366').split(',').map(Number);
const comCaptura = (process.argv[4] || 'sim') === 'sim';
const SAIDA = path.join(__dirname, 'capturas-' + rot);
const { spawnSync } = require('node:child_process');
/** Captura da página inteira em pedaços de 1500 px (a captura única passa do limite do Chromium em escala 3 e sai em branco). */
async function capturar(page, arq) {
  const H = await page.evaluate(() => document.documentElement.scrollHeight), W = await page.evaluate(() => document.documentElement.clientWidth);
  const partes = [];
  for (let y = 0; y < H; y += 1500) { const p = arq + '.parte' + partes.length + '.png'; await page.screenshot({ path: p, fullPage: true, clip: { x: 0, y, width: W, height: Math.min(1500, H - y) } }); partes.push(p); }
  const r = spawnSync('python', [path.join(__dirname, 'costurar.py'), arq].concat(partes), { encoding: 'utf8' });
  partes.forEach((p) => fs.unlinkSync(p));
  if (r.status !== 0) throw new Error('costura: ' + r.stderr);
}
fs.mkdirSync(SAIDA, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const relato = [];
  try {
    for (const largura of larguras) for (const login of ['admin', 'wanessa']) {
      const a = C.ambiente();
      const { page, ctx, erros } = await C.abrirCelular(browser, a, largura, login);
      const pags = await page.evaluate(() => FIN_V2_PAGINAS.map((p) => [p[0], p[1], (p[6] || []).map((x) => x[0])]));
      for (const [mod, titulo, abas] of pags) {
        if (process.env.SO && !process.env.SO.split(',').includes(mod)) continue;
        if (login === 'wanessa' && !['fin_painel', 'fin_empresas', 'fin_aprovacoes'].includes(mod)) continue; // Wanessa: as telas que mudam por papel
        for (let i = 0; i < Math.max(1, abas.length); i++) {
          const aba = abas[i];
          await page.evaluate((m) => abrir(m), mod);
          await C.assentar(page, 3000);
          if (aba && i > 0) { await page.evaluate((x) => { const b = document.querySelector('#omieTela [data-omie-aba="' + x + '"]'); if (b) b.click(); }, aba); await C.assentar(page, 4000); }
          await page.waitForTimeout(500);
          const r = await page.evaluate(C.detectar);
          const nomeArq = largura + '-' + login + '-' + mod + (aba ? '-' + aba : '') + '.png';
          relato.push({ largura, login, mod, titulo, aba: aba || '', defeitos: C.total(r), r });
          if (comCaptura && largura !== 1366) await capturar(page, path.join(SAIDA, nomeArq));
          else if (comCaptura && largura === 1366 && login === 'admin' && i === 0) await capturar(page, path.join(SAIDA, nomeArq));
          console.log(largura, login, mod, aba || '-', 'estreito', r.estreito.length, 'sobreposto', r.sobreposto.length, 'rolagem', r.rolagemPagina, 'cortado', r.cortado.length);
        }
      }
      relato.push({ largura, login, errosJs: erros });
      await ctx.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(__dirname, 'varredura-' + rot + '.json'), JSON.stringify(relato, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
