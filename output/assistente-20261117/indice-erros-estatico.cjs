// Monta o índice de mensagens a partir dos arquivos (como o servidor faz com as funções carregadas) e grava um retrato em JSON.
// Uso: node indice-erros-estatico.cjs <pasta-legado> [saida.json]
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const pasta = path.resolve(process.argv[2]);
const ctx = vm.createContext({ console, Date, JSON, Math, Object, Array, String, Number, RegExp });
for (const f of ["SGO_AssistenteNucleo.js", "SGO_AssistenteErros.js"]) vm.runInContext(fs.readFileSync(path.join(pasta, f), "utf8"), ctx, { filename: f });
const fontes = [];
for (const f of fs.readdirSync(pasta).sort()) {
  const txt = fs.readFileSync(path.join(pasta, f), "utf8");
  if (f.endsWith(".js")) {
    const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm; const pos = []; let m;
    while ((m = re.exec(txt))) pos.push({ nome: m[1], i: m.index });
    pos.forEach((p, k) => fontes.push({ nome: p.nome, fonte: txt.slice(p.i, k + 1 < pos.length ? pos[k + 1].i : txt.length), tela: false }));
  } else if (/^JS_.*\.html$/.test(f)) fontes.push({ nome: f.replace(/\.html$/, ""), fonte: txt, tela: true });
}
ctx.__fontes = fontes.filter((x) => !ctx.SGO_ASSIST_ERRO_IGNORAR.test(x.nome));
const ind = vm.runInContext("SGO_AssistErr_indice_({ fontes: __fontes })", ctx);
const msgs = ind.msgs.map((m) => ({ id: m.id, tela: m.tela, funcao: m.funcao, origem: m.origem, fin: m.fin, adm: m.adm, texto: m.texto }));
const porTela = {}; msgs.forEach((m) => { porTela[m.tela || "(sem tela)"] = (porTela[m.tela || "(sem tela)"] || 0) + 1; });
const out = { geradoEm: new Date().toISOString(), pasta, total: msgs.length, financeiro: msgs.filter((m) => m.fin).length, administracao: msgs.filter((m) => m.adm).length, porTela, msgs };
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ total: out.total, financeiro: out.financeiro, administracao: out.administracao, semTela: porTela["(sem tela)"] }));
