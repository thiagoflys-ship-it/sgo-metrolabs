// Compara o placar arquivo a arquivo com a referência (nenhum arquivo pode piorar).
"use strict";
const fs = require("fs");
const ler = (f) => Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter((l) => /\.test\.cjs\t/.test(l)).map((l) => {
  const c = l.split("\t"); return [c[0], { pass: +c[2].split("=")[1], fail: +c[3].split("=")[1], falhas: (c[4] || "").replace(/^FALHAS: /, "") }];
}));
const ref = ler(process.argv[2]), nov = ler(process.argv[3]);
const linhas = [], piorou = [];
for (const f of [...new Set([...Object.keys(ref), ...Object.keys(nov)])].sort()) {
  const a = ref[f], b = nov[f];
  if (!a || !b || a.pass !== b.pass || a.fail !== b.fail) linhas.push([f, a ? a.pass + "/" + a.fail : "(novo)", b ? b.pass + "/" + b.fail : "(sumiu)", b && b.falhas ? b.falhas : ""].join(" | "));
  if (a && b && (b.fail > a.fail || b.pass < a.pass)) piorou.push(f);
  if (!b) piorou.push(f + " (sumiu)");
}
console.log(linhas.join("\n")); console.log("PIOROU:", piorou.length ? piorou.join(", ") : "nenhum");
