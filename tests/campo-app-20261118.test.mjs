// SGO+ Campo (18/11/2026, técnicos em campo): foto pela câmera e pela galeria, assinatura em tela cheia e correção depois de errar
// (Desfazer conclusão, Pedir correção, O.S. reaberta pela gestão). O aplicativo REAL (pasta CAMPO, padrão output/campo-20261118/novo)
// roda no Chromium do Playwright, em emulação de iPhone e de Android com 390 px, servido como no servidor (/campo/ com a CSP e o
// Permissions-Policy de servicos/campo.ts) e com um /api/run falso em memória. Só dados de teste. Capturas: CAPTURAS (padrão
// output/campo-20261118/capturas).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.CAMPO || path.join(aqui, "../output/campo-20261118/novo");
const capturas = process.env.CAPTURAS || path.join(aqui, "../output/campo-20261118/capturas");
fs.mkdirSync(capturas, { recursive: true });
const requerer = createRequire(process.env.PLAYWRIGHT_DE || "c:/Users/venda/projetos/sgo_servidor/package.json");
const { chromium } = requerer("playwright");

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp" };
const agoraLocal = (ms = 0) => { const d = new Date(Date.now() + ms), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

function osTeste(id, numero, situacao, registrado) {
  return { id, numero, situacao, situacaoNome: situacao, agendadoPara: agoraLocal(-3600e3), duracaoMin: 90,
    tipo: { codigo: "MANUTENCAO_PREVENTIVA", nome: "Manutenção preventiva", grupo: "TECNICO", exige: { relato: false, assinatura: true, fotosMin: 1, qrOuSerie: false, assinaturaColaborador: true, relatoCampos: [] } },
    cliente: { nome: "HOSPITAL TESTE" }, unidade: { nome: "UNIDADE TESTE" }, equipamento: { tipo: "AUTOCLAVE TESTE", serie: "S-1", tag: "AUT-1" },
    checklist: { nome: "Checklist teste", perguntas: [{ id: "q_foto", texto: "Fotos do equipamento", tipo: "FOTO", obrigatoria: true, fotosMin: 1 }] },
    registrado: { saiuEm: agoraLocal(-1800e3), chegouEm: agoraLocal(-1700e3), respostas: {}, fotos: [], pecas: [], relato: {}, ...registrado },
    pendencias: [], envio: null };
}

/** Servidor do teste: o aplicativo como o servidor entrega (/campo/) e um /api/run em memória. */
function subirServidor() {
  const api = { eventos: [], fotos: [], os: [] };
  const arquivos = new Map(fs.readdirSync(pasta).filter((n) => TIPOS[path.extname(n)]).map((n) => [n, fs.readFileSync(path.join(pasta, n))]));
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/api/run") {
      let corpo = "";
      req.on("data", (c) => { corpo += c; });
      req.on("end", () => {
        const { fn, args } = JSON.parse(corpo || "{}");
        let valor;
        if (fn === "validarSessao") valor = { valid: true, data: { usuario: "tecnico.teste", nome: "TECNICO TESTE DA SILVA", perfil: "TECNICO" } };
        else if (fn === "Ast_appMeuDia") valor = { ok: true, versaoContrato: 2, dia: agoraLocal().slice(0, 10), os: api.os, regras: { fotoMaxBytes: 2000000 } };
        else if (fn === "Ast_appSincronizar") { const evs = args[1].eventos || []; api.eventos.push(...evs); valor = { ok: true, aceitos: evs.map((e) => ({ idLocal: e.idLocal, tipo: e.tipo, osId: e.osId })), recusados: [], os: [] }; }
        else if (fn === "Ast_appEnviarFoto") { api.fotos.push(args[1]); valor = { ok: true, idLocal: args[1].idLocal, duplicado: false, foto: { id: "F" + api.fotos.length } }; }
        else valor = { ok: true };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, valor }));
      });
      return;
    }
    let nome = url.pathname.replace(/^\/campo\/?/, "");
    if (!nome || !arquivos.has(nome)) nome = /^[a-z-]*$/i.test(nome) ? "index.html" : nome;
    const a = arquivos.get(nome);
    if (!a) { res.writeHead(404); res.end(); return; }
    let corpo = a;
    if (nome === "index.html") corpo = Buffer.from(a.toString("utf8").replace(/__VERSAO__/g, "teste"));
    if (nome === "sw.js") corpo = Buffer.from(a.toString("utf8").replace("__VERSAO__", "teste").replace("__ARQUIVOS__", "[]"));
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(nome)], "Content-Security-Policy": CSP, "Permissions-Policy": "geolocation=(self), camera=(self), microphone=()", "Cache-Control": "no-cache" });
    res.end(corpo);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ srv, api, base: "http://127.0.0.1:" + srv.address().port })));
}

const APARELHOS = {
  iphone: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  android: { userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true },
};

let navegador, servidor, fotoJpeg;
test.before(async () => {
  navegador = await chromium.launch();
  servidor = await subirServidor();
  // foto de celular de verdade em tamanho (4000 × 3000, ~1 MB): o app precisa reduzir
  const p = await navegador.newPage();
  const b64 = await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 4000; c.height = 3000; const g = c.getContext("2d"); for (let i = 0; i < 300; i++) { g.fillStyle = `hsl(${(i * 37) % 360} 60% 50%)`; g.fillRect((i * 131) % 4000, (i * 71) % 3000, 400, 300); } return c.toDataURL("image/jpeg", 0.92).split(",")[1]; });
  fotoJpeg = Buffer.from(b64, "base64");
  await p.close();
});
test.after(async () => { await navegador.close(); servidor.srv.close(); });

async function abrir(aparelho, hash, osLista) {
  servidor.api.os = osLista;
  const ctx = await navegador.newContext({ ...APARELHOS[aparelho], serviceWorkers: "block", locale: "pt-BR" });
  await ctx.addInitScript(() => { if (!localStorage.getItem("SGO_CAMPO_SESSAO")) localStorage.setItem("SGO_CAMPO_SESSAO", JSON.stringify({ sessionId: "sessao-teste-1", usuario: "tecnico.teste", nome: "TECNICO TESTE DA SILVA", renovadaEm: Date.now() })); });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await page.goto(servidor.base + "/campo/#/dia");
  try { await page.waitForFunction(() => /HOSPITAL TESTE/.test(document.body.innerText), null, { timeout: 15000 }); }
  catch (e) { throw new Error("o app não mostrou as O.S.: " + (await page.innerText("body")).slice(0, 600) + " | erros: " + erros.join(" ; ")); }
  if (hash) { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(300); }
  return { ctx, page, erros };
}
const recadoTem = (page, rx) => page.waitForFunction((src) => { const r = document.getElementById("recado"); return r && !r.hidden && new RegExp(src).test(r.textContent); }, rx.source, { timeout: 15000 });
const esperar = (cond, ms = 15000) => new Promise((ok, falha) => { const t0 = Date.now(); const v = () => { if (cond()) ok(); else if (Date.now() - t0 > ms) falha(new Error("tempo esgotado")); else setTimeout(v, 100); }; v(); });

for (const aparelho of ["iphone", "android"]) {
  test(`${aparelho}: foto pela câmera e pela galeria chega ao servidor; entradas não ficam "hidden"; HEIC e foto perdida têm mensagem`, async () => {
    const { ctx, page, erros } = await abrir(aparelho, "#/os/os-1/checklist", [osTeste("os-1", "OS-TESTE-0001", "EM_EXECUCAO", {})]);
    try {
      // entradas de arquivo: fora da vista, mas não display:none (iPhone)
      const est = await page.evaluate(() => ["arqCamera", "arqGaleria"].map((id) => { const e = document.getElementById(id); return { hidden: e.hidden, display: getComputedStyle(e).display, capture: e.getAttribute("capture"), multiple: e.multiple }; }));
      assert.deepEqual(est.map((e) => [e.hidden, e.display !== "none"]), [[false, true], [false, true]]);
      assert.equal(est[0].capture, "environment"); assert.equal(est[1].multiple, true);
      // câmera
      const fotosAntes = servidor.api.fotos.length;
      let [esc] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Tirar foto" }).click()]);
      assert.equal(esc.isMultiple(), false);
      assert.ok(await page.evaluate(() => !!localStorage.getItem("SGO_CAMPO_FOTO_ABERTA")), "anota antes de abrir a câmera");
      await esc.setFiles({ name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: fotoJpeg });
      await page.getByRole("button", { name: "Guardar foto" }).waitFor({ timeout: 20000 });
      await page.screenshot({ path: path.join(capturas, `${aparelho}-foto-1-previa.png`) });
      await page.getByRole("button", { name: "Guardar foto" }).click();
      await recadoTem(page, /Foto guardada/);
      await esperar(() => servidor.api.fotos.length === fotosAntes + 1);
      const f1 = servidor.api.fotos.at(-1);
      assert.equal(f1.osId, "os-1"); assert.equal(f1.perguntaId, "q_foto");
      assert.ok(f1.base64.length > 20000 && f1.base64.length < 2000000 * 4 / 3, "foto reduzida: " + f1.base64.length);
      assert.equal(await page.evaluate(() => localStorage.getItem("SGO_CAMPO_FOTO_ABERTA")), null, "anotação apagada depois da foto");
      // galeria (três de uma vez)
      [esc] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Escolher do celular/ }).click()]);
      assert.equal(esc.isMultiple(), true);
      await esc.setFiles([1, 2, 3].map((i) => ({ name: `galeria-${i}.jpg`, mimeType: "image/jpeg", buffer: fotoJpeg })));
      await recadoTem(page, /3 fotos guardadas/);
      await esperar(() => servidor.api.fotos.length === fotosAntes + 4);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(capturas, `${aparelho}-foto-2-galeria.png`), fullPage: true });
      // HEIC que o navegador não abre: diz o porquê e o que fazer
      [esc] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Escolher do celular/ }).click()]);
      await esc.setFiles({ name: "IMG_0002.HEIC", mimeType: "image/heic", buffer: Buffer.from("nao-e-imagem-de-verdade".repeat(50)) });
      await recadoTem(page, /HEIC/);
      await page.screenshot({ path: path.join(capturas, `${aparelho}-foto-3-heic-mensagem.png`) });
      // o celular fechou o app com a câmera aberta: ao voltar, a explicação (nunca silêncio)
      await page.evaluate(() => localStorage.setItem("SGO_CAMPO_FOTO_ABERTA", JSON.stringify({ osId: "os-1", perguntaId: "q_foto", galeria: false, rota: "#/os/os-1/checklist", em: Date.now() })));
      await page.reload();
      await page.getByText("A foto não chegou ao app").waitFor({ timeout: 15000 });
      await page.screenshot({ path: path.join(capturas, `${aparelho}-foto-4-app-fechado-pela-camera.png`) });
      await page.getByRole("button", { name: "Entendi" }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem("SGO_CAMPO_FOTO_ABERTA")), null);
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });

  test(`${aparelho}: assinatura em tela cheia (cliente e técnico), quadro maior, horizontal sem perder o traço, imagem no limite`, async () => {
    const { ctx, page, erros } = await abrir(aparelho, "#/os/os-1/assinatura", [osTeste("os-1", "OS-TESTE-0001", "EM_EXECUCAO", {})]);
    try {
      const alt = await page.evaluate(() => document.getElementById("quadro").getBoundingClientRect().height);
      assert.ok(alt >= 300, "quadro proporcional à tela (42% da altura): " + alt);
      await page.fill("#aNome", "Maria Teste Souza");
      await page.getByRole("button", { name: "Assinar em tela cheia" }).click();
      const cheia = page.locator(".assinar-cheia");
      await cheia.waitFor();
      const caixa = await page.evaluate(() => { const r = document.querySelector(".assinar-cheia .ac-quadro").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      assert.ok(caixa.w >= 360 && caixa.h >= 500, "ocupa a tela: " + JSON.stringify(caixa));
      assert.match(await cheia.innerText(), /Assinatura de Maria Teste Souza/);
      const assinar = async (cx) => { await page.mouse.move(cx.x + cx.w * 0.15, cx.y + cx.h * 0.6); await page.mouse.down(); for (let i = 1; i <= 30; i++) await page.mouse.move(cx.x + cx.w * (0.15 + i * 0.022), cx.y + cx.h * (0.6 + Math.sin(i / 3) * 0.08)); await page.mouse.up(); };
      // confirmar sem assinar: avisa
      await cheia.getByRole("button", { name: "Confirmar" }).click();
      await recadoTem(page, /Assine no quadro/);
      await assinar(caixa);
      await page.screenshot({ path: path.join(capturas, `${aparelho}-assinatura-1-tela-cheia-em-pe.png`) });
      // vira o celular: o traço continua
      // (no Chromium de teste a tela cheia de verdade impede mudar o tamanho da janela: sai dela antes de "girar")
      await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : null));
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(500);
      const tinta = await page.evaluate(() => { const c = document.querySelector(".assinar-cheia .ac-quadro"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 128) n++; return n; });
      assert.ok(tinta > 50, "assinatura mantida ao girar: " + tinta);
      assert.equal(await page.evaluate(() => document.getElementById("acDica").hidden), true, "deitado: a dica de virar some");
      await page.screenshot({ path: path.join(capturas, `${aparelho}-assinatura-2-tela-cheia-deitado.png`) });
      await cheia.getByRole("button", { name: "Confirmar" }).click();
      await cheia.waitFor({ state: "detached" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(capturas, `${aparelho}-assinatura-3-no-quadro.png`) });
      const n0 = servidor.api.eventos.length;
      await page.getByRole("button", { name: "Guardar assinatura" }).click();
      await esperar(() => servidor.api.eventos.slice(n0).some((e) => e.tipo === "ASSINATURA"));
      const ev = servidor.api.eventos.slice(n0).find((e) => e.tipo === "ASSINATURA");
      assert.equal(ev.dados.nome, "Maria Teste Souza");
      assert.ok(ev.dados.imagem.length >= 800 && ev.dados.imagem.length <= 200000, "imagem no limite: " + ev.dados.imagem.length);
      assert.match(ev.dados.imagem, /^data:image\/png;base64,/);
      // técnico (colaborador): o mesmo botão, com o nome dele
      await page.evaluate(() => { location.hash = "#/os/os-1/colaborador"; });
      await page.getByRole("button", { name: "Assinar em tela cheia" }).click();
      await page.locator(".assinar-cheia").waitFor();
      assert.match(await page.locator(".assinar-cheia").innerText(), /Assinatura de TECNICO TESTE DA SILVA/);
      const cx2 = await page.evaluate(() => { const r = document.querySelector(".assinar-cheia .ac-quadro").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await assinar(cx2);
      await page.locator(".assinar-cheia").getByRole("button", { name: "Confirmar" }).click();
      const n1 = servidor.api.eventos.length;
      await page.getByRole("button", { name: "Guardar minha assinatura" }).click();
      await esperar(() => servidor.api.eventos.slice(n1).some((e) => e.tipo === "ASSINATURA" && e.dados.papel === "COLABORADOR"));
      // Cancelar fecha sem mexer no quadro
      await page.evaluate(() => { location.hash = "#/os/os-1"; });
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });

  test(`${aparelho}: Desfazer conclusão (com motivo) libera a foto; encerrada pede correção; reaberta pela gestão volta a aceitar`, async () => {
    const lista = [osTeste("os-1", "OS-TESTE-0001", "DOC_PENDENTE", { concluiuEm: agoraLocal(-600e3) }), osTeste("os-2", "OS-TESTE-0002", "ENCERRADA", { concluiuEm: agoraLocal(-900e3) })];
    const { ctx, page, erros } = await abrir(aparelho, "#/os/os-1", lista);
    try {
      // concluída (documentação pendente no servidor): Desfazer
      await page.getByRole("button", { name: "Desfazer conclusão para corrigir" }).waitFor();
      await page.screenshot({ path: path.join(capturas, `${aparelho}-correcao-1-desfazer.png`), fullPage: true });
      await page.getByRole("button", { name: "Desfazer conclusão para corrigir" }).click();
      await page.fill("#jMotivo", "curto");
      await page.locator("#janela").getByRole("button", { name: "Desfazer conclusão" }).click();
      await page.getByText("pelo menos 10 letras: o que está errado").waitFor();
      await page.fill("#jMotivo", "Faltou a foto da plaqueta do equipamento");
      await page.screenshot({ path: path.join(capturas, `${aparelho}-correcao-2-motivo.png`) });
      const n0 = servidor.api.eventos.length;
      await page.locator("#janela").getByRole("button", { name: "Desfazer conclusão" }).click();
      await recadoTem(page, /Conclusão desfeita/);
      await esperar(() => servidor.api.eventos.slice(n0).some((e) => e.tipo === "DESFAZ_CONCLUSAO"));
      assert.equal(servidor.api.eventos.slice(n0).find((e) => e.tipo === "DESFAZ_CONCLUSAO").dados.motivo, "Faltou a foto da plaqueta do equipamento");
      await page.evaluate(() => { location.hash = "#/os/os-1/checklist"; });
      const [esc] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Tirar foto" }).click()]);
      await esc.setFiles({ name: "plaqueta.jpg", mimeType: "image/jpeg", buffer: fotoJpeg });
      await page.getByRole("button", { name: "Guardar foto" }).click();
      await recadoTem(page, /Foto guardada/);
      // a agenda atualizada (servidor ainda com a conclusão antiga) não traz a conclusão desfeita de volta
      await page.evaluate(() => { location.hash = "#/dia"; });
      await page.getByRole("button", { name: /Atualizar agenda/ }).click();
      await recadoTem(page, /Agenda atualizada/);
      await page.evaluate(() => { location.hash = "#/os/os-1"; });
      assert.equal(await page.getByRole("button", { name: "Desfazer conclusão para corrigir" }).count(), 0);
      // encerrada: Pedir correção
      await page.evaluate(() => { location.hash = "#/os/os-2"; });
      await page.getByRole("button", { name: "Pedir correção" }).waitFor();
      await page.getByRole("button", { name: "Pedir correção" }).click();
      await page.fill("#jMotivo", "Mandei a foto errada do equipamento");
      const n1 = servidor.api.eventos.length;
      await page.locator("#janela").getByRole("button", { name: "Pedir correção" }).click();
      await page.getByText("Correção pedida").waitFor();
      await esperar(() => servidor.api.eventos.slice(n1).some((e) => e.tipo === "PEDIR_CORRECAO" && e.osId === "os-2"));
      await page.screenshot({ path: path.join(capturas, `${aparelho}-correcao-3-pedido.png`), fullPage: true });
      // a gestão reabre no SGO+: o Meu dia traz a reabertura e a O.S. volta a aceitar foto
      servidor.api.os = [lista[0], osTeste("os-2", "OS-TESTE-0002", "EM_EXECUCAO", { concluiuEm: "", reaberta: { em: agoraLocal(), por: "GESTOR TESTE", motivo: "Trocar a foto do equipamento" } })];
      await page.evaluate(() => { location.hash = "#/dia"; });
      await page.getByRole("button", { name: /Atualizar agenda/ }).click();
      await recadoTem(page, /Agenda atualizada/);
      await page.evaluate(() => { location.hash = "#/os/os-2"; });
      await page.getByText("Reaberta para correção").waitFor();
      await page.screenshot({ path: path.join(capturas, `${aparelho}-correcao-4-reaberta.png`), fullPage: true });
      assert.equal(await page.getByRole("button", { name: "Pedir correção" }).count(), 0);
      await page.evaluate(() => { location.hash = "#/os/os-2/checklist"; });
      const f0 = servidor.api.fotos.length;
      const [esc2] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Tirar foto" }).click()]);
      await esc2.setFiles({ name: "nova.jpg", mimeType: "image/jpeg", buffer: fotoJpeg });
      await page.getByRole("button", { name: "Guardar foto" }).click();
      await esperar(() => servidor.api.fotos.length === f0 + 1 && servidor.api.fotos.at(-1).osId === "os-2");
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });
}
