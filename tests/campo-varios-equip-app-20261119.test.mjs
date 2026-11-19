// SGO+ Campo (19/11/2026, pedido do dono, técnico em campo): vários equipamentos na MESMA O.S. O aplicativo REAL (pasta CAMPO,
// padrão output/campo-varios-equip-20261119/novo) roda no Chromium do Playwright em emulação de celular (390 px), servido como no
// servidor (/campo/ com a CSP de produção) e com um /api/run falso em memória. Fluxo: lista "Equipamentos atendidos nesta visita",
// acrescentar da lista da unidade (filtro), conferir a série, relato próprio (com os mínimos e o resultado), foto própria, cadastrar
// equipamento sem série nem TAG, Concluí bloqueado dizendo o que falta e em qual equipamento, tirar o acrescentado por engano e
// concluir. Só dados de teste. Capturas: CAPTURAS (padrão output/campo-varios-equip-20261119/capturas).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.CAMPO || path.join(aqui, "../output/campo-varios-equip-20261119/novo");
const capturas = process.env.CAPTURAS || path.join(aqui, "../output/campo-varios-equip-20261119/capturas");
fs.mkdirSync(capturas, { recursive: true });
const requerer = createRequire(process.env.PLAYWRIGHT_DE || "c:/Users/venda/projetos/sgo_servidor/package.json");
const { chromium } = requerer("playwright");

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp" };
const agoraLocal = (ms = 0) => { const d = new Date(Date.now() + ms), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

const RELATO_OS = { condicaoEncontrada: "Autoclave parada sem aquecer a câmara", servicoRealizado: "Troca da resistência da câmara e reaperto dos bornes", testeFuncional: "Três ciclos completos sem erro",
  testeResultado: "APROVADO", resultadoFinal: "LIBERADO", serieConfirmada: "S-1", identificadoPor: "SERIE" };
function osTeste() {
  return { id: "os-1", numero: "OS-TESTE-0038", situacao: "EM_EXECUCAO", situacaoNome: "Em execução", agendadoPara: agoraLocal(-3600e3), duracaoMin: 90,
    tipo: { codigo: "MANUTENCAO_CORRETIVA", nome: "Manutenção corretiva", grupo: "TECNICO", exige: { relato: true, assinatura: true, fotosMin: 0, qrOuSerie: false, assinaturaColaborador: true,
      relatoCampos: ["servicoRealizado", "condicaoEncontrada", "testeFuncional"], resultado: true, qualidade: { condicaoEncontrada: 3, causa: 0, servicoRealizado: 4, testeMotivo: 3, resultadoDetalhe: 3 } } },
    cliente: { id: "c1", nome: "HOSPITAL TESTE" }, unidade: { id: "un1", nome: "UNIDADE TESTE" }, equipamento: { id: "eq1", tipo: "AUTOCLAVE TESTE", serie: "S-1", tag: "AUT-1" },
    checklist: { nome: "", perguntas: [] }, variosEquipamentos: true,
    equipamentosUnidade: [{ id: "eq2", tipo: "LAVADORA TESTE", modelo: "L2", serie: "S-200", tag: "LV-02", setor: "CME" }, { id: "eq5", tipo: "ESTUFA TESTE", modelo: "E5", serie: "S-500", tag: "ES-05", setor: "Laboratório" }],
    registrado: { saiuEm: agoraLocal(-1800e3), chegouEm: agoraLocal(-1700e3), respostas: {}, fotos: [], pecas: [], relato: RELATO_OS,
      assinatura: { nome: "Rui Responsável Teste", em: agoraLocal(-600e3) }, assinaturaColaborador: { nome: "Tecnico Teste da Silva", em: agoraLocal(-500e3) } },
    pendencias: [], envio: null };
}

function subirServidor() {
  const api = { eventos: [], fotos: [], cadastros: [], os: [] };
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
        else if (fn === "Ast_appCadastrar") { api.cadastros.push(args[1]); valor = { ok: true, id: "eq-real-" + api.cadastros.length, existente: false, message: "Cadastrado." }; }
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
  android: { userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true },
  iphone: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
let navegador, servidor, fotoJpeg;
test.before(async () => {
  navegador = await chromium.launch();
  servidor = await subirServidor();
  const p = await navegador.newPage();
  const b64 = await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 1600; c.height = 1200; const g = c.getContext("2d"); for (let i = 0; i < 80; i++) { g.fillStyle = `hsl(${(i * 37) % 360} 60% 50%)`; g.fillRect((i * 131) % 1600, (i * 71) % 1200, 300, 200); } return c.toDataURL("image/jpeg", 0.9).split(",")[1]; });
  fotoJpeg = Buffer.from(b64, "base64");
  await p.close();
});
test.after(async () => { await navegador.close(); servidor.srv.close(); });

const esperar = (cond, ms = 15000) => new Promise((ok, falha) => { const t0 = Date.now(); const v = () => { if (cond()) ok(); else if (Date.now() - t0 > ms) falha(new Error("tempo esgotado")); else setTimeout(v, 100); }; v(); });
const recadoTem = (page, rx) => page.waitForFunction((src) => { const r = document.getElementById("recado"); return r && !r.hidden && new RegExp(src).test(r.textContent); }, rx.source, { timeout: 15000 });

for (const aparelho of ["android", "iphone"]) {
  test(`${aparelho}: acrescentar equipamentos na mesma O.S., relato e foto de cada um, Concluí só com todos completos`, async () => {
    servidor.api.os = [osTeste()]; servidor.api.eventos.length = 0; servidor.api.fotos.length = 0; servidor.api.cadastros.length = 0;
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], serviceWorkers: "block", locale: "pt-BR" });
    await ctx.addInitScript(() => { if (!localStorage.getItem("SGO_CAMPO_SESSAO")) localStorage.setItem("SGO_CAMPO_SESSAO", JSON.stringify({ sessionId: "sessao-teste-1", usuario: "tecnico.teste", nome: "TECNICO TESTE DA SILVA", renovadaEm: Date.now() })); });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    const cap = (n) => page.screenshot({ path: path.join(capturas, `${aparelho}-${n}.png`), fullPage: true });
    const ir = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(250); };
    try {
      await page.goto(servidor.base + "/campo/#/dia");
      await page.waitForFunction(() => /HOSPITAL TESTE/.test(document.body.innerText), null, { timeout: 15000 });
      await ir("#/os/os-1");
      await page.getByRole("button", { name: /Equipamentos atendidos nesta visita/ }).click();
      await page.getByRole("button", { name: "+ Acrescentar equipamento" }).waitFor();
      assert.match(await page.innerText("#tela"), /AUTOCLAVE TESTE/, "o equipamento da O.S. é o 1º");
      await cap("1-lista-equipamentos");
      // acrescentar da lista da unidade, com filtro
      await page.getByRole("button", { name: "+ Acrescentar equipamento" }).click();
      await page.locator("#eqFiltro").fill("LV-02");
      await page.waitForTimeout(200);
      assert.equal(await page.locator("[data-acao=equipEscolher]").count(), 1, "o filtro deixa só a lavadora");
      await cap("2-acrescentar-lista-da-unidade");
      await page.locator("[data-acao=equipEscolher]").click();
      await recadoTem(page, /Equipamento acrescentado/);
      await esperar(() => servidor.api.eventos.some((e) => e.tipo === "EQUIPAMENTO" && e.dados.equipamentoId === "eq2"));
      const chave = servidor.api.eventos.find((e) => e.tipo === "EQUIPAMENTO").dados.chave;
      assert.match(chave, /^[A-Za-z0-9_.:-]{4,80}$/);
      // conferir a série
      await page.getByRole("button", { name: "A série da etiqueta é S-200" }).click();
      await recadoTem(page, /conferido/);
      // relato do 2º equipamento: mínimos e resultado
      await page.getByRole("button", { name: /relato deste equipamento/ }).click();
      await page.locator("#r_servicoRealizado").waitFor();
      assert.match(await page.innerText("#tela"), /Relato só deste equipamento/);
      await page.locator("#r_condicaoEncontrada").fill("Lavadora com vazamento na porta");
      await page.locator("#r_servicoRealizado").fill("Troca da vedação da porta da lavadora");
      await page.locator("#r_testeFuncional").fill("Ciclo completo sem vazamento");
      await page.locator("[data-acao=relatoOpcao][data-k=testeResultado][data-v=APROVADO]").click();
      await page.locator("[data-acao=relatoOpcao][data-k=resultadoFinal][data-v=LIBERADO]").click();
      await cap("3-relato-do-2o-equipamento");
      await page.getByRole("button", { name: "Guardar relato" }).click();
      await recadoTem(page, /Relato do equipamento guardado/);
      // foto do 2º equipamento
      const [esc] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Tirar foto" }).click()]);
      await esc.setFiles({ name: "IMG_0101.jpg", mimeType: "image/jpeg", buffer: fotoJpeg });
      await page.getByRole("button", { name: "Guardar foto" }).waitFor({ timeout: 20000 });
      assert.match(await page.locator("#fLegenda").inputValue(), /LAVADORA TESTE/, "a legenda já vem com o equipamento");
      await page.getByRole("button", { name: "Guardar foto" }).click();
      await recadoTem(page, /Foto guardada/);
      await esperar(() => servidor.api.fotos.length === 1);
      assert.equal(servidor.api.fotos[0].perguntaId, "equip:" + chave);
      await page.waitForTimeout(300);
      assert.match(await page.innerText("#tela"), /Este equipamento está completo/);
      await cap("4-equipamento-2-completo");
      await esperar(() => servidor.api.eventos.some((e) => e.tipo === "EQUIPAMENTO" && e.dados.servicoRealizado === "Troca da vedação da porta da lavadora" && e.dados.resultadoFinal === "LIBERADO" && e.dados.serieConfirmada === "S-200"));
      // cadastrar um equipamento sem série nem TAG
      await ir("#/os/os-1/equipamentos");
      await page.getByRole("button", { name: "+ Acrescentar equipamento" }).click();
      await page.getByRole("button", { name: /cadastrar o equipamento/ }).click();
      await page.locator("#eqnTipo").fill("Seladora teste");
      await cap("5-cadastrar-equipamento");
      await page.getByRole("button", { name: "Cadastrar e acrescentar à O.S." }).click();
      await recadoTem(page, /Equipamento acrescentado/);
      await page.getByRole("button", { name: "O equipamento não tem série nem TAG" }).click();
      await recadoTem(page, /não tem série nem TAG/);
      await esperar(() => servidor.api.cadastros.length === 1);
      assert.equal(servidor.api.cadastros[0].dados.tipo, "Seladora teste"); assert.equal(servidor.api.cadastros[0].dados.clienteId, "c1"); assert.equal(servidor.api.cadastros[0].dados.unidadeId, "un1");
      // Concluí: bloqueado dizendo o que falta e em qual equipamento
      await ir("#/os/os-1/concluir");
      const txt = await page.innerText("#tela");
      assert.match(txt, /Equipamento 3 \(Seladora teste\): no relato, o serviço realizado/);
      assert.match(txt, /Equipamento 3 \(Seladora teste\): Pelo menos 1 foto deste equipamento/);
      assert.doesNotMatch(txt, /Equipamento 2/, "o 2º está completo");
      await cap("6-conclusao-falta-no-equipamento-3");
      await page.getByRole("button", { name: "Concluí" }).click({ force: true });
      await recadoTem(page, /Ainda falta/);
      assert.ok(!servidor.api.eventos.some((e) => e.tipo === "CONCLUI"));
      // tirar o 3º (engano) e concluir
      await ir("#/os/os-1/equipamentos");
      await page.locator(".lista-equip [data-acao=abrirEquip]").nth(1).click();
      await page.locator("details.excluir-os summary").click();
      await page.locator("#eqxMotivo").fill("Acrescentei por engano, era outro setor");
      await page.getByRole("button", { name: "Tirar este equipamento" }).click();
      await page.locator("#janela").getByRole("button", { name: "Tirar" }).click();
      await recadoTem(page, /tirado da O\.S\./);
      await ir("#/os/os-1/concluir");
      assert.match(await page.innerText("#tela"), /2 equipamentos nesta visita/);
      await cap("7-conclusao-pronta");
      await page.getByRole("button", { name: "Concluí" }).click();
      await page.locator("#janela").getByRole("button", { name: "Registrar sem localização" }).click();
      await esperar(() => servidor.api.eventos.some((e) => e.tipo === "CONCLUI"), 20000);
      assert.ok(servidor.api.eventos.some((e) => e.tipo === "EQUIPAMENTO" && e.dados.remover === true));
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });
}
