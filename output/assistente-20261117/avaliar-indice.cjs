// Avalia o reconhecimento: cada mensagem do índice, colada com valores no lugar de "…", volta como a primeira candidata?
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const pasta = path.resolve(process.argv[2]);
const ctx = vm.createContext({ console, Date, JSON, Math, Object, Array, String, Number, RegExp });
for (const f of ["SGO_AssistenteNucleo.js", "SGO_AssistenteErros.js"]) vm.runInContext(fs.readFileSync(path.join(pasta, f), "utf8"), ctx);
const fontes = [];
for (const f of fs.readdirSync(pasta).sort()) {
  const txt = fs.readFileSync(path.join(pasta, f), "utf8");
  if (f.endsWith(".js")) { const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm, pos = []; let m; while ((m = re.exec(txt))) pos.push({ nome: m[1], i: m.index }); pos.forEach((p, k) => fontes.push({ nome: p.nome, fonte: txt.slice(p.i, k + 1 < pos.length ? pos[k + 1].i : txt.length), tela: false })); }
  else if (/^JS_.*\.html$/.test(f)) fontes.push({ nome: f.replace(/\.html$/, ""), fonte: txt, tela: true });
}
ctx.__f = fontes;
const ind = vm.runInContext("SGO_AssistErr_indice_({ fontes: __f })", ctx);
let ok = 0, empate = 0, errado = 0, nada = 0, forte = 0; const exemplosErrados = [];
ind.msgs.forEach((m) => {
  const texto = m.texto.replace(/…/g, "XPTO-123");
  const c = ctx.SGO_AssistErr_casar_(ind, texto, {});
  if (!c.length) { nada++; return; }
  const b = c[0];
  if (b.cobreMsg >= 0.6 && b.cobreTotal >= 0.45 && b.seguidas >= 2 && b.nCauda >= 1) forte++;
  if (b.msg.texto === m.texto) ok++;
  else if (c.some((x) => x.msg.texto === m.texto && x.nota >= b.nota - 0.03)) empate++;
  else { errado++; if (exemplosErrados.length < 8) exemplosErrados.push({ msg: m.texto.slice(0, 120), achou: b.msg.texto.slice(0, 120) }); }
});
const r = { total: ind.N, primeiraCerta: ok, empateComACerta: empate, outra: errado, semCandidata: nada, reconhecidaComoColada: forte };
console.log(JSON.stringify(r)); console.log(exemplosErrados);
fs.writeFileSync(path.join(__dirname, "avaliacao-indice.json"), JSON.stringify({ ...r, exemplosErrados }, null, 1));
