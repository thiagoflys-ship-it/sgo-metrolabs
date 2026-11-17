// Para cada parágrafo que só está na base de produção: ele já existiu em alguma versão do manual no git (todas as ramificações)?
// Se existiu, o docs/ o mudou de propósito (texto antigo, não recuperar). Se nunca existiu, é trecho só da produção (recuperar).
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const g = require("../../_tools/gerar_base_assistente.cjs");
const RAIZ = path.join(__dirname, "../..");
const cmp = JSON.parse(fs.readFileSync(path.join(__dirname, "comparacao-base.json"), "utf8"));
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const git = (a) => cp.execSync("git " + a, { cwd: RAIZ, encoding: "utf8", maxBuffer: 1 << 28 });
const res = [];
for (const d of cmp.difer) {
  if (!d.paragrafosSoProd.length) continue;
  let hist = "";
  const commits = git(`log --all --format=%H -- docs/${d.arquivo}`).split("\n").filter(Boolean);
  for (const c of commits) {
    let t = ""; try { t = git(`show ${c}:docs/${d.arquivo}`); } catch (e) { continue; }
    hist += "\n" + norm(g.lerManual(d.arquivo, t).secoes.map((s) => s.titulo + " " + s.texto).join(" "));
  }
  for (const p of d.paragrafosSoProd) {
    const n = norm(p.par);
    res.push({ arquivo: d.arquivo, secao: p.secao, noGit: hist.includes(n), commits: commits.length, par: p.par });
  }
}
fs.writeFileSync(path.join(__dirname, "paragrafos-so-producao.json"), JSON.stringify(res, null, 1));
const resumo = {};
res.forEach((r) => { const k = r.arquivo; resumo[k] = resumo[k] || { noGit: 0, nunca: 0 }; resumo[k][r.noGit ? "noGit" : "nunca"]++; });
console.log(resumo);
