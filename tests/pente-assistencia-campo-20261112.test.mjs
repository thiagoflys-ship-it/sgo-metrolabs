// Pente fino do SGO+ Campo (12/11/2026): app.js, fila.js e regras.js reais (app.js sem a inicialização, num contexto isolado com
// navegador e banco do aparelho simulados). Pasta do app: variável CAMPO (padrão: a candidata do pente fino). Cada teste falha na
// base de produção (CAMPO=.../base/src/publico/campo) e passa na candidata. Só dados de teste.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL, fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.CAMPO || path.join(aqui, "../output/pente-assistencia-20261112/cand/src/publico/campo");
const R = await import(pathToFileURL(path.join(pasta, "regras.js")).href);
const F = await import(pathToFileURL(path.join(pasta, "fila.js")).href);

/** Banco do aparelho em memória: o mesmo armazenamento atende o app (B.*) e a fila (banco.*). */
function bancoFalso() {
  const lojas = { fila: new Map(), os: new Map(), exec: new Map(), fotos: new Map() };
  const chave = (loja, o) => (loja === "fila" ? o.idLocal : o.chave);
  const B = {
    porUsuario: async (loja, u) => [...lojas[loja].values()].filter((o) => o.usuario === u).map((o) => ({ ...o })),
    todos: async (loja) => [...lojas[loja].values()].map((o) => ({ ...o })),
    gravar: async (loja, o) => { lojas[loja].set(chave(loja, o), { ...o }); },
    apagar: async (loja, k) => { lojas[loja].delete(k); },
    cfg: { gravar: async () => {}, ler: async () => null },
  };
  const banco = {
    listarFila: async (u) => [...lojas.fila.values()].filter((i) => i.usuario === u).map((i) => ({ ...i })),
    salvarItem: async (i) => { lojas.fila.set(i.idLocal, { ...i }); },
    liberarFoto: async (id) => { lojas.fotos.delete(id); },
  };
  return { lojas, B, banco };
}
function carregarApp(db) {
  let src = fs.readFileSync(path.join(pasta, "app.js"), "utf8").replace(/^import .*$/gm, "").replace(/^iniciar\(\)\.catch[\s\S]*$/m, "");
  src += "\nthis.__t = { E, excluirOsCampo, salvarCadastro, registrarRelato, baixarDia, atualizarResumo };";
  const recados = [], chamadas = [];
  const campo = { value: "Abri em dobro por engano" };
  const el = () => ({ hidden: true, textContent: "", innerHTML: "", value: "", style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, focus() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [] });
  const ctx = { R, B: db.B, criarFila: (o) => F.criarFila({ ...o, banco: db.banco }), ErroRede: F.ErroRede, ehSessaoExpirada: F.ehSessaoExpirada, novoIdLocal: F.novoIdLocal, console,
    navigator: { onLine: true }, window: { addEventListener() {} },
    document: { documentElement: { dataset: {} }, getElementById: (id) => (id === "exMotivo" ? campo : el()), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {} },
    self: {}, localStorage: { getItem: () => null, setItem() {} }, location: { hash: "" }, setTimeout: () => 0, clearTimeout() {}, Date, URL, Map, Set, Promise, JSON, Math, String, Number, Array, Object, RegExp, isNaN, crypto: globalThis.crypto };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ctx.__recados = recados; ctx.__chamadas = chamadas;
  vm.runInContext("recado = (t) => __recados.push(String(t)); render = () => {}; redesenharSozinho = () => {};", ctx);
  ctx.__t.E.sessao = { usuario: "tiago", nome: "TIAGO TECNICO TESTE", sessionId: "s_tiago" };
  return ctx;
}
const item = (o) => ({ ordem: 1, usuario: "tiago", osId: "", em: "2026-11-12T10:00:00Z", dados: {}, juntar: "", estado: "pendente", tentado: false, tentativas: 0, rodada: 0, criadoEm: "2026-11-12T10:00:00Z", ultimoErro: "", corrigir: "", definitivo: false, enviadoEm: "", ...o });

test("fila: excluir a O.S. tira da fila também o que já foi tentado (forcar); sem forcar, o já tentado fica", async () => {
  const db = bancoFalso();
  const fila = F.criarFila({ banco: db.banco, api: {} });
  await db.banco.salvarItem(item({ idLocal: "nova-0001", tipo: "NOVA_OS", tentado: true }));
  await db.banco.salvarItem(item({ idLocal: "env-0001", tipo: "RELATO", estado: "enviado" }));
  assert.equal(await fila.desistir("tiago", "nova-0001"), false);
  assert.equal(db.lojas.fila.get("nova-0001").estado, "pendente");
  assert.equal(await fila.desistir("tiago", "nova-0001", true), true);
  assert.equal(db.lojas.fila.get("nova-0001").estado, "cancelado");
  await fila.desistir("tiago", "env-0001", true);
  assert.equal(db.lojas.fila.get("env-0001").estado, "enviado", "o que o servidor já aceitou não muda");
});

test("O.S. provisória com a abertura recusada pelo servidor: Excluir tira do aparelho sem perguntar ao servidor", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = R.osProvisoria({ idLocal: "nova-0002", tipo: R.normalizarTipo({ codigo: "MANUTENCAO_CORRETIVA", nome: "Manutenção corretiva" }), cliente: { nome: "Hospital Teste" }, unidade: { nome: "Centro" }, equipamento: { tipo: "Autoclave" }, sintoma: "não aquece", prioridade: "P3", prioridadeNome: "P3", em: "2026-11-12T10:00:00Z" });
  E.os.set(o.osId, o); await db.B.gravar("os", { chave: "tiago|" + o.osId, usuario: "tiago", osId: o.osId, dados: o });
  await db.banco.salvarItem(item({ idLocal: "nova-0002", tipo: "NOVA_OS", tentado: true, estado: "recusado", definitivo: true, ultimoErro: "o equipamento não foi encontrado" }));
  await db.banco.salvarItem(item({ idLocal: "rel-0002", tipo: "RELATO", osId: "nova-0002", estado: "recusado", definitivo: true }));
  vm.runInContext("chamar = async (fn) => { __chamadas.push(fn); return { ok: false, message: 'Não foi possível excluir: a O.S. não foi encontrada ou já foi excluída. Toque em Atualizar agenda' }; }", ctx);
  await ctx.__t.excluirOsCampo("nova-0002");
  assert.deepEqual(ctx.__chamadas, [], "não pergunta ao servidor");
  assert.ok(!E.os.has("nova-0002"), "sai do aparelho (antes ficava para sempre em Em aberto)");
  assert.equal(db.lojas.fila.get("rel-0002").estado, "cancelado");
});

test("excluir com itens guardados esperando envio diz para enviar antes (não fala em falta de sinal)", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = R.normalizarOs({ id: "os-3", numero: "OS-2026-0003", situacao: "AGENDADA", abertaEmCampo: true, podeExcluir: true, cliente: { nome: "Hospital" } }, 1);
  E.os.set(o.osId, o);
  await db.banco.salvarItem(item({ idLocal: "outro-0003", tipo: "RELATO", osId: "outra-os" }));
  await ctx.__t.atualizarResumo();
  vm.runInContext("chamar = async (fn) => { __chamadas.push(fn); return { ok: true }; }", ctx);
  await ctx.__t.excluirOsCampo("os-3");
  assert.deepEqual(ctx.__chamadas, []);
  assert.match(ctx.__recados.pop(), /precisa enviar o que está guardado \(1 item\(ns\)\)\. Toque em Enviar agora/);
});

test("depois da exclusão no servidor, o que era da O.S. sai da fila, inclusive o já tentado e recusado (não reabre a O.S.)", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = R.normalizarOs({ id: "os-4", numero: "OS-2026-0004", situacao: "AGENDADA", abertaEmCampo: true, podeExcluir: true, cliente: { nome: "Hospital" } }, 1);
  E.os.set(o.osId, o);
  await db.banco.salvarItem(item({ idLocal: "foto-0004", tipo: "FOTO", osId: "os-4", tentado: true, estado: "recusado", definitivo: false }));
  await ctx.__t.atualizarResumo();
  vm.runInContext("chamar = async (fn) => { __chamadas.push(fn); return { ok: true, message: 'O.S. OS-2026-0004 excluída' }; }", ctx);
  await ctx.__t.excluirOsCampo("os-4");
  assert.deepEqual(ctx.__chamadas, ["Ast_appExcluirOS"]);
  assert.equal(db.lojas.fila.get("foto-0004").estado, "cancelado", "sem 'Tentar de novo' para O.S. excluída");
});

test("cadastro de unidade de um cliente que só está no aparelho vai pela fila, não direto (antes: 'o cliente dela não foi encontrado')", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  E.resumo = { pendentes: 0 };
  E.novo = { cliente: { id: "cli-local-0005", nome: "Clínica Nova", novo: true, direto: false }, unidade: null, equipamento: null, form: {}, erros: {} };
  vm.runInContext("chamar = async (fn) => { __chamadas.push(fn); return { ok: false, message: 'Não foi possível cadastrar a unidade: o cliente dela não foi encontrado. Volte ao passo 1' }; }", ctx);
  const r = await ctx.__t.salvarCadastro("UNIDADE", { nome: "Sede", clienteId: "cli-local-0005" });
  assert.deepEqual(ctx.__chamadas, [], "não chama o servidor com o id provisório do cliente");
  assert.ok(!r.erro, "sem erro: " + r.erro);
  assert.equal(r.obj.direto, false);
  // cliente já no servidor: continua direto
  E.novo.cliente = { id: "c1", nome: "Hospital", novo: false, direto: true };
  vm.runInContext("chamar = async (fn) => { __chamadas.push(fn); return { ok: true, id: 'un9' }; }", ctx);
  const r2 = await ctx.__t.salvarCadastro("UNIDADE", { nome: "Sede", clienteId: "c1" });
  assert.equal(r2.obj.direto, true); assert.deepEqual(ctx.__chamadas, ["Ast_appCadastrar"]);
});

test("relato: campo apagado pelo técnico vai vazio (o servidor apaga); campo nunca preenchido não vai", async () => {
  const db = bancoFalso(), ctx = carregarApp(db);
  let enviado = null;
  ctx.__cap = (d) => { enviado = d; };
  vm.runInContext("registrar = async (osId, tipo, dados) => { __cap(dados); };", ctx);
  await ctx.__t.registrarRelato("os-6", { osId: "os-6", relato: { relato: "Trocado o sensor", causa: "" } });
  assert.equal(enviado.relato, "Trocado o sensor");
  assert.ok("causa" in enviado && enviado.causa === "", "a causa apagada vai vazia");
  assert.ok(!("recomendacoes" in enviado), "o que nunca foi preenchido não vai");
});

test("O.S. que saiu da agenda (cancelada, passada ou excluída) depois do Saí: marcada uma vez; sem nada pendente, sai na atualização seguinte", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = R.normalizarOs({ id: "os-7", numero: "OS-2026-0007", situacao: "EM_DESLOCAMENTO", cliente: { nome: "Hospital" } }, 1); o.dia = "2026-11-12";
  E.os.set(o.osId, o); await db.B.gravar("os", { chave: "tiago|os-7", usuario: "tiago", osId: "os-7", dia: o.dia, dados: o });
  E.exec.set("os-7", { ...R.execucaoVazia("tiago", "os-7"), saida: { em: "2026-11-12T09:00:00Z" } });
  E.porOs = new Map();
  vm.runInContext("chamar = async () => ({ ok: true, versaoContrato: 2, os: [], tipos: [], atividades: [] }); receberAtividades = async () => {};", ctx);
  await ctx.__t.baixarDia(false);
  assert.ok(db.lojas.os.get("tiago|os-7"), "primeira atualização: fica, marcada");
  assert.equal(db.lojas.os.get("tiago|os-7").dados.saiuDaAgenda, true);
  await ctx.__t.baixarDia(false);
  assert.ok(!db.lojas.os.get("tiago|os-7"), "segunda atualização, nada pendente: sai do aparelho (antes ficava para sempre)");
});

test("equipamento não identificado: a O.S. mostra a descrição da triagem (antes: 'Não informado')", () => {
  const o = R.normalizarOs({ id: "os-8", numero: "OS-2026-0008", situacao: "AGENDADA", equipamento: { id: "", tipo: "", descricao: "Seladora azul do expurgo" } }, 1);
  assert.equal(o.equipamento.nome, "Seladora azul do expurgo");
});
