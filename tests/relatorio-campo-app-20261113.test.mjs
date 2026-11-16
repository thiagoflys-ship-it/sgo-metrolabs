// SGO+ Campo, relato de excelência (13/11/2026): app.js, fila.js e regras.js reais (app.js sem a inicialização, num contexto isolado
// com navegador e banco do aparelho simulados, como em pente-assistencia-campo-20261112.test.mjs). Pasta do app: variável CAMPO
// (padrão: a candidata output/relatorio-campo-20261113/cand/src/publico/campo). Só dados de teste.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL, fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pasta = process.env.CAMPO || path.join(aqui, "../output/relatorio-campo-20261113/cand/src/publico/campo");
const R = await import(pathToFileURL(path.join(pasta, "regras.js")).href);
const F = await import(pathToFileURL(path.join(pasta, "fila.js")).href);

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
  const banco = { listarFila: async (u) => [...lojas.fila.values()].filter((i) => i.usuario === u).map((i) => ({ ...i })), salvarItem: async (i) => { lojas.fila.set(i.idLocal, { ...i }); }, liberarFoto: async (id) => { lojas.fotos.delete(id); } };
  return { lojas, B, banco };
}
function carregarApp(db) {
  let src = fs.readFileSync(path.join(pasta, "app.js"), "utf8").replace(/^import .*$/gm, "").replace(/^iniciar\(\)\.catch[\s\S]*$/m, "");
  src += "\nthis.__t = { E, telaRelato, telaPecas, registrarRelato, guardarRelato, revisarTexto, acoes, execDe, lerCamposRelato };";
  const recados = [], chamadas = [];
  const el = () => ({ hidden: true, textContent: "", innerHTML: "", value: "", style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, focus() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [] });
  const ctx = { R, B: db.B, criarFila: (o) => F.criarFila({ ...o, banco: db.banco }), ErroRede: F.ErroRede, ehSessaoExpirada: F.ehSessaoExpirada, novoIdLocal: F.novoIdLocal, console,
    navigator: { onLine: true }, window: { addEventListener() {} },
    // a tela do relato não está aberta: getElementById devolve null para os campos dele (vale o rascunho)
    document: { documentElement: { dataset: {} }, getElementById: (id) => (/^r_/.test(id) ? null : el()), querySelector: () => el(), querySelectorAll: () => [], addEventListener() {} },
    self: {}, localStorage: { getItem: () => null, setItem() {} }, location: { hash: "" }, setTimeout: () => 0, clearTimeout() {}, Date, URL, Map, Set, Promise, JSON, Math, String, Number, Array, Object, RegExp, isNaN, crypto: globalThis.crypto };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ctx.__recados = recados; ctx.__chamadas = chamadas;
  vm.runInContext("recado = (t) => __recados.push(String(t)); render = () => {}; redesenharSozinho = () => {}; seguirDepoisDe = () => {};", ctx);
  ctx.__t.E.sessao = { usuario: "tiago", nome: "TIAGO TECNICO TESTE", sessionId: "s_tiago" };
  return ctx;
}
const EXIGE = { relato: true, assinatura: true, fotosMin: 0, relatoCampos: ["servicoRealizado", "condicaoEncontrada", "testeFuncional"], resultado: true,
  qualidade: { condicaoEncontrada: 4, causa: 3, servicoRealizado: 5, testeMotivo: 5, resultadoDetalhe: 4 } };
const osCorretiva = (exige) => R.normalizarOs({ id: "os-1", numero: "OS-2026-0001", situacao: "NO_LOCAL", tipo: { codigo: "MANUTENCAO_CORRETIVA", nome: "Manutenção corretiva", grupo: "TECNICO", exige: exige || EXIGE }, cliente: { nome: "Hospital Teste" } }, 0);

test("Meu dia: o aparelho lê o resultado e os mínimos que o servidor pede; servidor antigo (sem eles) segue como antes", () => {
  const o = osCorretiva();
  assert.equal(o.exigencias.resultado, true);
  assert.equal(o.exigencias.qualidade.causa, 3);
  const antigo = osCorretiva({ relato: true, relatoCampos: ["servicoRealizado"] });
  assert.equal(antigo.exigencias.resultado, false); assert.equal(antigo.exigencias.qualidade, null);
  assert.deepEqual(R.faltasDoResultado(antigo, { condicaoEncontrada: "Parada" }), []);
  const t = R.normalizarTipo({ codigo: "MANUTENCAO_CORRETIVA", nome: "Manutenção corretiva", exige: EXIGE });
  assert.equal(R.osProvisoria({ idLocal: "nova-01", tipo: t, em: "2026-11-12T10:00:00Z" }).exigencias.resultado, true, "O.S. aberta sem sinal também pede o resultado");
});

test("o que falta no relato diz o quê e como (mesmas regras do servidor); liberado sem teste aprovado é apontado", () => {
  const o = osCorretiva();
  let f = R.faltasDoResultado(o, { condicaoEncontrada: "Parada", causa: "Resistência", servicoRealizado: "Substituição das 3 resistências" });
  assert.match(f.join(" | "), /condição encontrada mais completo \(1 palavra; mínimo 4\): como o equipamento estava/);
  assert.match(f.join(" | "), /causa ou o diagnóstico mais completo \(1 palavra; mínimo 3\)/);
  assert.match(f.join(" | "), /serviço realizado mais completo \(4 palavras; mínimo 5\)/);
  assert.match(f.join(" | "), /resultado do teste funcional/);
  assert.match(f.join(" | "), /situação do equipamento ao final/);
  f = R.faltasDoResultado(o, { condicaoEncontrada: "Autoclave parada sem aquecer", causa: "Resistências queimadas no gerador", servicoRealizado: "Troca das três resistências do gerador",
    testeResultado: "NAO_REALIZADO", testeFuncional: "Sem energia estável no hospital", resultadoFinal: "LIBERADO" });
  assert.deepEqual(f.length, 1);
  assert.match(f[0], /está como "liberado para uso", mas o teste não foi feito/);
  f = R.faltasDoResultado(o, { condicaoEncontrada: "Autoclave parada sem aquecer", causa: "Resistências queimadas no gerador", servicoRealizado: "Troca das três resistências do gerador",
    testeResultado: "APROVADO", testeFuncional: "Ciclo completo sem falha", resultadoFinal: "LIBERADO" });
  assert.deepEqual(f, []);
  // a lista entra no passo "relato" (selo "Falta" e Concluí)
  const x = { ...R.execucaoVazia("tiago", "os-1"), chegada: { em: "x" }, relato: { condicaoEncontrada: "Parada" } };
  assert.ok(R.faltasDoPasso(o, x, "relato").some((m) => /resultado do teste funcional/.test(m)));
});

test("tela do relato: exemplo em cada campo, botões do resultado, medições, o que falta e o botão de revisão", () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = osCorretiva(); E.os.set(o.osId, o);
  const x = ctx.__t.execDe(o.osId); x.chegada = { em: "2026-11-12T10:00:00Z" };
  x.relato = { em: "", rascunho: { resultadoFinal: "NAO_LIBERADO", medicoes: [{ grandeza: "Tensão entre fases", valor: "221", unidade: "V", obs: "L1-L2" }] } };
  const h = ctx.__t.telaRelato(o);
  assert.match(h, /placeholder="Ex\.: Autoclave parada, sem aquecer\./);
  assert.match(h, /Resultado do teste funcional <span class="obrig">\(obrigatório\)<\/span>/);
  assert.match(h, /data-acao="relatoOpcao"[^>]*data-k="resultadoFinal" data-v="NAO_LIBERADO"/);
  assert.match(h, /aria-pressed="true" data-acao="relatoOpcao" data-os="os-1" data-k="resultadoFinal" data-v="NAO_LIBERADO"/);
  assert.match(h, /O que falta para liberar <span class="obrig">/, "não liberado pede o que falta");
  assert.match(h, /value="Tensão entre fases"/); assert.match(h, /list="unidadesMedicao"/);
  assert.match(h, /Para o relato ficar completo:/);
  assert.match(h, /Revisar o português \(precisa de internet\)/);
  assert.match(h, /Causa ou diagnóstico <span class="obrig">\(obrigatório\)<\/span>/, "causa obrigatória na corretiva");
  ctx.navigator.onLine = false;
  assert.doesNotMatch(ctx.__t.telaRelato(o), /Revisar o português/, "sem sinal o botão não aparece");
});

test("guardar o relato: resultado, pendência e medições vão no RELATO pela fila (sem sinal também); linha vazia sai", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = osCorretiva(); E.os.set(o.osId, o);
  ctx.navigator.onLine = false;
  const x = ctx.__t.execDe(o.osId); x.chegada = { em: "2026-11-12T10:00:00Z" };
  x.relato = { em: "", rascunho: { condicaoEncontrada: "Autoclave parada sem aquecer", testeResultado: "NAO_REALIZADO", resultadoFinal: "NAO_LIBERADO", resultadoDetalhe: "Aguardando correção da rede elétrica",
    medicoes: [{ grandeza: "Corrente", valor: "18,4", unidade: "A", obs: "Fase L1" }, { grandeza: "", valor: "", unidade: "", obs: "" }] } };
  await ctx.__t.guardarRelato(o.osId, false);
  const item = [...db.lojas.fila.values()].find((i) => i.tipo === "RELATO");
  assert.ok(item, "na fila do aparelho");
  assert.equal(item.dados.testeResultado, "NAO_REALIZADO");
  assert.equal(item.dados.resultadoFinal, "NAO_LIBERADO");
  assert.equal(item.dados.resultadoDetalhe, "Aguardando correção da rede elétrica");
  assert.deepEqual(JSON.parse(JSON.stringify(item.dados.medicoes)), [{ grandeza: "Corrente", valor: "18,4", unidade: "A", obs: "Fase L1" }]);
  assert.equal(x.relato.rascunho, undefined, "rascunho limpo depois de guardar");
  // troca de celular: o que já subiu volta (resultado e medições)
  const y = R.execucaoVazia("tiago", "os-1");
  const o2 = R.normalizarOs({ id: "os-1", numero: "OS-2026-0001", situacao: "EM_EXECUCAO", tipo: { codigo: "MANUTENCAO_CORRETIVA", exige: EXIGE },
    registrado: { relato: { testeResultado: "APROVADO", resultadoFinal: "LIBERADO", medicoes: [{ grandeza: "Tensão", valor: "220", unidade: "V" }] } } }, 0);
  assert.equal(R.mesclarRegistrado(y, o2), true);
  assert.equal(y.relato.resultadoFinal, "LIBERADO"); assert.equal(y.relato.medicoes[0].valor, "220");
});

test("revisar o português: o texto revisado só entra no campo quando o técnico toca em Usar; sem a IA, recado e nada muda", async () => {
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = osCorretiva(); E.os.set(o.osId, o);
  const x = ctx.__t.execDe(o.osId); x.chegada = { em: "x" };
  x.relato = { em: "", rascunho: { condicaoEncontrada: "autoclave parada nao esquenta", causa: "resistencia queimada" } };
  vm.runInContext("chamar = async (fn, args) => { __chamadas.push([fn, args[1]]); return { semIa: false, revisado: { condicaoEncontrada: 'Autoclave parada, sem aquecimento.' }, message: 'Revisão pronta em 1 campo.' }; }", ctx);
  await ctx.__t.revisarTexto(o.osId);
  assert.equal(ctx.__chamadas[0][0], "Ast_appRevisarTexto");
  assert.equal(ctx.__chamadas[0][1].campos.causa, "resistencia queimada");
  assert.equal(x.relato.rascunho.condicaoEncontrada, "autoclave parada nao esquenta", "nada muda sozinho");
  assert.match(ctx.__t.telaRelato(o), /Autoclave parada, sem aquecimento\.[\s\S]*Usar este texto/);
  await ctx.__t.acoes.usarRevisao({ dataset: { os: o.osId, k: "condicaoEncontrada" } });
  assert.equal(x.relato.rascunho.condicaoEncontrada, "Autoclave parada, sem aquecimento.");
  assert.equal(E.revisao, null);
  vm.runInContext("chamar = async () => ({ semIa: true, revisado: {}, message: 'A revisão automática não está ligada neste servidor.' });", ctx);
  await ctx.__t.revisarTexto(o.osId);
  assert.match(ctx.__recados.pop(), /não está ligada/);
});

test("peça: dica da especificação ('7kv') sem mudar o que foi escrito; unidades sugeridas", () => {
  assert.match(R.dicaPeca("Resistência 7kv"), /Confira a especificação "7kv".*7 kV.*kV é tensão.*kW é potência/);
  assert.equal(R.dicaPeca("Resistência 7 kW 220 V"), "");
  assert.equal(R.dicaPeca("Vedação da porta"), "");
  const db = bancoFalso(), ctx = carregarApp(db), { E } = ctx.__t;
  const o = osCorretiva(); E.os.set(o.osId, o);
  const h = ctx.__t.telaPecas(o);
  assert.match(h, /list="unidadesPeca"/); assert.match(h, /<option value="conj\.">/); assert.match(h, /placeholder="Ex\.: Resistência 7 kW 220 V"/);
});
