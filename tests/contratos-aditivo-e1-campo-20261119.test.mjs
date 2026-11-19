// 19/11/2026 — SGO+ Campo (app do técnico): "Em viagem: pedir aditivo de recarga" (etapa E1b do estudo de contratos e aditivo).
// O aplicativo REAL (pasta CAMPO, padrão output/contratos-aditivo-20261119/e1/campo/novo) roda no Chromium em emulação de iPhone e
// Android (390 px), servido como no servidor (/campo/ com a CSP de produção). O /api/run responde Viagem_api com o código REAL do
// legado (DEST, ambiente de teste tests/_caju_ambiente.cjs); a sessão do app é a do técnico Tiago. Nada sai (WhatsApp, e-mail simulados).
// Capturas: CAPTURAS (padrão output/contratos-aditivo-20261119/e1/capturas).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.CAMPO || path.join(aqui, "../output/contratos-aditivo-20261119/e1/campo/novo");
const capturas = process.env.CAPTURAS || path.join(aqui, "../output/contratos-aditivo-20261119/e1/capturas");
fs.mkdirSync(capturas, { recursive: true });
const requerer = createRequire(process.env.PLAYWRIGHT_DE || "c:/Users/venda/projetos/sgo_servidor/package.json");
const { chromium } = requerer("playwright");
const req = createRequire(import.meta.url);
if (!process.env.DEST) process.env.DEST = path.join(aqui, "../output/financeiro-20261116/cand37");
req("../output/lote-20261111n/fontes.cjs");
const { ambienteCaju } = req("./_caju_ambiente.cjs");

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp" };
const APARELHOS = {
  iphone: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  android: { userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true },
};

function subir(a) {
  const arquivos = new Map(fs.readdirSync(pasta).filter((n) => TIPOS[path.extname(n)]).map((n) => [n, fs.readFileSync(path.join(pasta, n))]));
  const srv = http.createServer((rq, res) => {
    const url = new URL(rq.url, "http://x");
    if (rq.method === "POST" && url.pathname === "/api/run") {
      let corpo = "";
      rq.on("data", (c) => { corpo += c; });
      rq.on("end", () => {
        const { fn, args } = JSON.parse(corpo || "{}");
        let valor;
        if (fn === "validarSessao") valor = { valid: true, data: { usuario: "tiago", nome: "TIAGO TECNICO TESTE", perfil: "TECNICO" } };
        else if (fn === "Ast_appMeuDia") valor = { ok: true, versaoContrato: 2, dia: "2026-10-27", os: [], regras: { fotoMaxBytes: 2000000 } };
        else if (fn === "Viagem_api") valor = JSON.parse(JSON.stringify(a.ctx.Viagem_api("s_tiago", args[1], args[2])));
        else valor = { ok: true };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, valor }));
      });
      return;
    }
    let nome = url.pathname.replace(/^\/campo\/?/, "");
    if (!nome || !arquivos.has(nome)) nome = /^[a-z-]*$/i.test(nome) ? "index.html" : nome;
    const arq = arquivos.get(nome);
    if (!arq) { res.writeHead(404); res.end(); return; }
    let c = arq;
    if (nome === "index.html") c = Buffer.from(arq.toString("utf8").replace(/__VERSAO__/g, "teste"));
    if (nome === "sw.js") c = Buffer.from(arq.toString("utf8").replace("__VERSAO__", "teste").replace("__ARQUIVOS__", "[]"));
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(nome)], "Content-Security-Policy": CSP, "Cache-Control": "no-cache" });
    res.end(c);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ srv, base: "http://127.0.0.1:" + srv.address().port })));
}

let navegador;
test.before(async () => { navegador = await chromium.launch(); });
test.after(async () => { await navegador.close(); });

for (const aparelho of ["iphone", "android"]) {
  test(`${aparelho}: no Meu dia, "Em viagem: pedir aditivo de recarga" abre o pedido, recusa com o motivo na tela, envia aos sócios e mostra o andamento`, async () => {
    const a = ambienteCaju({ credenciais: false });
    const s = a.aprovada();
    a.ok(a.v("wanessa", "registrarCarga", { id: s.id, valor: "2.660,00", data: "2026-10-19", comprovante: a.pdf("c.pdf") }));
    a.mudar("2026-10-27T21:00:00-03:00");
    const { srv, base } = await subir(a);
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], serviceWorkers: "block", locale: "pt-BR" });
    await ctx.addInitScript(() => { localStorage.setItem("SGO_CAMPO_SESSAO", JSON.stringify({ sessionId: "sessao-teste-1", usuario: "tiago", nome: "TIAGO TECNICO TESTE", renovadaEm: Date.now() })); });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    try {
      await page.goto(base + "/campo/#/dia");
      await page.getByRole("button", { name: "Em viagem: pedir aditivo de recarga" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Em viagem: pedir aditivo de recarga" }).click();
      await page.locator("#fAditivo").waitFor({ timeout: 15000 });
      await page.screenshot({ path: path.join(capturas, `campo-${aparelho}-aditivo-1-pedido.png`), fullPage: true });
      await page.selectOption("#adCat", "PECA");
      await page.fill("#adValor", "350,00");
      await page.fill("#adJust", "curto");
      await page.locator('input[name="adUrg"][value="PARADO"]').check();
      await page.getByRole("button", { name: "Enviar aos sócios" }).click();
      await page.locator("#adErro", { hasText: "para que é o dinheiro" }).waitFor({ timeout: 15000 });
      assert.equal(await page.inputValue("#adValor"), "350,00", "o que foi escrito continua na tela");
      await page.screenshot({ path: path.join(capturas, `campo-${aparelho}-aditivo-2-recusa.png`), fullPage: true });
      await page.fill("#adJust", "Usinagem do eixo da bomba da autoclave, peça quebrada na desmontagem; sem ela o equipamento não volta a operar.");
      await page.getByRole("button", { name: "Enviar aos sócios" }).click();
      await page.locator(".aviso.ok", { hasText: "enviado às 21:00" }).waitFor({ timeout: 15000 });
      await page.locator(".cartao-adt", { hasText: "Aguardando os sócios" }).waitFor();
      assert.equal(a.tabelas.CJU_ADITIVOS.length, 1);
      assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, "AGUARDANDO");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "sem rolagem lateral");
      await page.screenshot({ path: path.join(capturas, `campo-${aparelho}-aditivo-3-enviado.png`), fullPage: true });
      // os sócios pedem informação: o técnico responde pelo app
      a.ok(a.v("dora", "aditivoDecidir", { id: a.tabelas.CJU_ADITIVOS[0].ID, decisao: "INFO", fundamentacao: "Mande o orçamento da oficina" }));
      await page.getByRole("button", { name: "Atualizar" }).click();
      await page.getByRole("button", { name: "Responder aos sócios" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Responder aos sócios" }).click();
      await page.fill("#jMotivo", "O orçamento da oficina é de R$ 350,00, foto enviada pelo SGO+");
      await page.locator('#janela [data-j="ok"]').click();
      await page.locator(".aviso.ok", { hasText: "voltou para os sócios" }).waitFor({ timeout: 15000 });
      assert.equal(a.tabelas.CJU_ADITIVOS[0].SITUACAO, "AGUARDANDO");
      await page.screenshot({ path: path.join(capturas, `campo-${aparelho}-aditivo-4-respondido.png`), fullPage: true });
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); srv.close(); }
  });
}
