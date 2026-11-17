// Confere a união: todo parágrafo da base de produção está na base nova, salvo os "superados" (listados com o motivo),
// e todo parágrafo que docs/ gerava antes deste trabalho continua na base nova, salvo os substituídos por um que o contém.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const RAIZ = path.join(__dirname, "../..");
const g = require(path.join(RAIZ, "_tools/gerar_base_assistente.cjs"));
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const ler = (f) => { const c = {}; vm.createContext(c); vm.runInContext(fs.readFileSync(f, "utf8") + "\nthis.B=SGO_ASSIST_MANUAIS;", c); return c.B; };
const prod = ler(path.join(__dirname, "SGO_AssistenteManuais.producao.js"));
const nova = ler(path.join(RAIZ, "output/financeiro-20261116/candH/SGO_AssistenteManuais.js"));
const antes = JSON.parse(g.gerar(path.join(__dirname, "docs-antes")).js.replace(/^[\s\S]*?var SGO_ASSIST_MANUAIS = /, "").replace(/;\s*$/, ""));
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, "recuperacao-trechos.json"), "utf8"));
const superados = new Set(); rec.manuais.forEach((m) => (m.superados || []).forEach((s) => superados.add(m.arquivo + "|" + norm(s.par))));
const substituidos = new Set(); rec.manuais.forEach((m) => (m.acoes || []).forEach((a) => { if (a.antes) substituidos.add(m.arquivo + "|" + norm(a.antes)); }));
// Parágrafos reescritos de propósito neste trabalho (manual do próprio assistente, atualizado com as novidades de 17/11/2026)
const REESCRITOS = new Set([
  "Atualizado em 20/10/2026. O mesmo assistente aparece no SGO+ e no COMMAND. Cada sistema responde com a ajuda e os manuais dele.",
  "6. Confira a fonte no fim da resposta, por exemplo \"Ajuda da tela Reservas de veículo\".",
  "Se a informação não está nesses textos, o assistente diz que não encontrou e oferece \"Falar com o administrador\". Ele nunca inventa tela, botão ou regra."
].map((t) => "MANUAL_ASSISTENTE_DUVIDAS.md|" + norm(t)));
REESCRITOS.forEach((k) => substituidos.add(k));
const textoDe = (b, arq) => { const m = b.manuais.find((x) => x.arquivo === arq); return m ? norm(m.secoes.map((s) => s.texto).join(" ")) : ""; };
// Partes divididas: compara frase a frase (o gerador pode cortar o parágrafo em pedaços de seções diferentes)
const frases = (t) => t.split(/\n+/).flatMap((p) => p.split(/(?<=[.;:])\s+/)).map(norm).filter((x) => x.length > 25);
let faltaProd = [], faltaDocs = [];
for (const m of prod.manuais) {
  const tn = textoDe(nova, m.arquivo);
  for (const s of m.secoes) for (const p of s.texto.split(/\n+/)) {
    const n = norm(p); if (n.length <= 25 || tn.includes(n)) continue;
    if (frases(p).every((f) => tn.includes(f))) continue;
    if ([...superados].some((k) => k.startsWith(m.arquivo + "|") && (k.includes(n) || n.includes(k.split("|")[1])))) continue;
    if (REESCRITOS.has(m.arquivo + "|" + n)) continue;
    faltaProd.push({ arquivo: m.arquivo, secao: s.titulo, par: p.slice(0, 200) });
  }
}
for (const m of antes.manuais) {
  const tn = textoDe(nova, m.arquivo);
  for (const s of m.secoes) for (const p of s.texto.split(/\n+/)) {
    const n = norm(p); if (n.length <= 25 || tn.includes(n) || frases(p).every((f) => tn.includes(f))) continue;
    if (substituidos.has(m.arquivo + "|" + n)) continue;
    faltaDocs.push({ arquivo: m.arquivo, secao: s.titulo, par: p.slice(0, 200) });
  }
}
const r = { versaoProducao: prod.versao, versaoNova: nova.versao, manuaisProducao: prod.manuais.length, manuaisNova: nova.manuais.length, superados: superados.size, substituidos: substituidos.size, faltaProd, faltaDocs };
fs.writeFileSync(path.join(__dirname, "conferencia-uniao.json"), JSON.stringify(r, null, 1));
console.log(JSON.stringify({ ...r, faltaProd: r.faltaProd.length, faltaDocs: r.faltaDocs.length }));
if (faltaProd.length) console.log(faltaProd.slice(0, 10));
if (faltaDocs.length) console.log(faltaDocs.slice(0, 10));
