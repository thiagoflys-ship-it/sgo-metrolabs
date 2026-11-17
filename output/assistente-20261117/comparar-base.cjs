// Compara a base de produção (candH/SGO_AssistenteManuais.js) com a base que docs/ gera hoje.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const g = require("../../_tools/gerar_base_assistente.cjs");
const RAIZ = path.join(__dirname, "../..");
const prodArq = process.argv[2] || path.join(RAIZ, "output/financeiro-20261116/candH/SGO_AssistenteManuais.js");
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(prodArq, "utf8") + "\nthis.B=SGO_ASSIST_MANUAIS;", ctx);
const prod = ctx.B;
const novo = JSON.parse(g.gerar(path.join(RAIZ, "docs")).js.replace(/^[\s\S]*?var SGO_ASSIST_MANUAIS = /, "").replace(/;\s*$/, ""));
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const out = { versaoProd: prod.versao, versaoDocs: novo.versao, soProd: [], soDocs: [], difer: [] };
const porArq = (b) => Object.fromEntries(b.manuais.map((m) => [m.arquivo, m]));
const P = porArq(prod), N = porArq(novo);
for (const a of Object.keys(P)) if (!N[a]) out.soProd.push(a);
for (const a of Object.keys(N)) if (!P[a]) out.soDocs.push(a);
for (const a of Object.keys(P)) {
  if (!N[a]) continue;
  const tp = P[a].secoes.map((s) => s.titulo + "\n" + s.texto).join("\n\n"), tn = N[a].secoes.map((s) => s.titulo + "\n" + s.texto).join("\n\n");
  if (tp === tn && JSON.stringify(P[a].perfis) === JSON.stringify(N[a].perfis) && P[a].tela === N[a].tela && P[a].titulo === N[a].titulo) continue;
  const textoNovo = norm(tn);
  // parágrafos da produção que não aparecem no docs (normalizados)
  const faltam = [];
  P[a].secoes.forEach((s) => s.texto.split(/\n+/).forEach((p) => { const n = norm(p); if (n.length > 25 && !textoNovo.includes(n)) faltam.push({ secao: s.titulo, par: p }); }));
  const titulosN = new Set(N[a].secoes.map((s) => norm(s.titulo).replace(/ parte \d+$/, "")));
  const secoesSoProd = [...new Set(P[a].secoes.map((s) => s.titulo.replace(/ \(parte \d+\)$/, "")).filter((t) => !titulosN.has(norm(t))))];
  out.difer.push({ arquivo: a, secoesProd: P[a].secoes.length, secoesDocs: N[a].secoes.length, meta: { tela: [P[a].tela, N[a].tela], perfis: [P[a].perfis, N[a].perfis], titulo: [P[a].titulo, N[a].titulo] }, secoesSoProd, paragrafosSoProd: faltam });
}
fs.writeFileSync(path.join(__dirname, "comparacao-base.json"), JSON.stringify(out, null, 1));
console.log("prod", prod.versao, prod.manuais.length, "docs", novo.versao, novo.manuais.length, "soProd", out.soProd, "soDocs", out.soDocs);
out.difer.forEach((d) => console.log(d.arquivo, "secoes", d.secoesProd, "->", d.secoesDocs, "| seções só prod:", d.secoesSoProd.length, "| parágrafos só prod:", d.paragrafosSoProd.length, JSON.stringify(d.meta.tela[0] !== d.meta.tela[1] || JSON.stringify(d.meta.perfis[0]) !== JSON.stringify(d.meta.perfis[1]) ? d.meta : "")));
