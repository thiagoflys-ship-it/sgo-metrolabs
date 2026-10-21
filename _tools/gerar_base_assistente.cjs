#!/usr/bin/env node
// Gera a base dos manuais do assistente "Tire sua dúvida" do SGO+ (SGO_AssistenteManuais.js) a partir de docs/MANUAL_*.md.
// A ajuda das telas (SGO_Ajuda_*.js) e o catálogo do menu (Index.html) o assistente lê na hora; os manuais ficam fora do
// projeto do Apps Script, por isso são transformados em dados aqui. Saída determinística (sem data): o mesmo conteúdo dá o
// mesmo arquivo, e o teste tests/assistente-duvidas.test.cjs falha se um manual mudou e a base não foi gerada de novo.
//
// Uso:  node _tools/gerar_base_assistente.cjs                       (grava apps-script-imports/portal_sgo_versao_cnpj_db/SGO_AssistenteManuais.js)
//       node _tools/gerar_base_assistente.cjs --docs <pasta> --saida <arquivo>   (usado pela importação do servidor)
//       node _tools/gerar_base_assistente.cjs --conferir           (sai com erro se o arquivo gravado estiver desatualizado)
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const RAIZ = path.join(__dirname, "..");
const PADRAO_DOCS = path.join(RAIZ, "docs");
const PADRAO_SAIDA = path.join(RAIZ, "apps-script-imports", "portal_sgo_versao_cnpj_db", "SGO_AssistenteManuais.js");

/** Cada manual: a tela (chave do menu) a que pertence e, quando o manual é só da gestão, os perfis que o leem. */
const MAPA = {
  "MANUAL_ASSISTENTE_DUVIDAS.md": { tela: "assistente_duvidas" },
  "MANUAL_BATE_PAPO.md": { tela: "bate_papo" },
  "MANUAL_CLIENTES_UNIDADES_VINCULOS.md": { tela: "vinculos" },
  "MANUAL_CONDUTA_COLABORADOR.md": { tela: "conduta" },
  "MANUAL_CONDUTA_FISCAL.md": { tela: "conduta", perfis: ["ADMIN", "GESTOR", "DIRETORIA", "RH"] },
  "MANUAL_ENVIAR_DOCUMENTO.md": { tela: "enviar_documento" },
  "MANUAL_MODULO_BAIXA_TEMPERATURA.md": { tela: "baixa_temperatura" },
  "MANUAL_MODULO_AUTOCLAVE.md": { tela: "autoclave" },
  "MANUAL_MODULO_CADEIA_FRIO.md": { tela: "cadeia_frio" },
  "MANUAL_MODULO_COMERCIAL.md": { tela: "comercial", perfis: ["ADMIN", "GESTOR", "DIRETORIA", "COMERCIAL", "FINANCEIRO"] },
  "MANUAL_MODULO_CERTIFICADO_CALIBRACAO.md": { tela: "certificado_calibracao" },
  "MANUAL_MODULO_CRONOGRAMA_EXECUCAO.md": { tela: "cronograma_execucao" },
  "MANUAL_MODULO_DECLARACAO_EXECUCAO.md": { tela: "declaracao_exec" },
  "MANUAL_MODULO_EMAIL.md": { tela: "email" },
  "MANUAL_MODULO_ESTUFA_BANHOMARIA.md": { tela: "estufa_banhomaria" },
  "MANUAL_MODULO_FROTA.md": { tela: "frota" },
  "MANUAL_MODULO_GESTAO_DECISOES.md": { tela: "gestao_decisoes", perfis: ["ADMIN", "GESTOR", "DIRETORIA"] },
  "MANUAL_MODULO_INVENTARIO_EQUIPAMENTOS.md": { tela: "inventario" },
  "MANUAL_MODULO_PGT_POP.md": { tela: "pgt_pop" },
  "MANUAL_MODULO_PLANEJAMENTO_CME.md": { tela: "planejamento_cme" },
  "MANUAL_MODULO_PONTO.md": { tela: "ponto" },
  "MANUAL_MODULO_REGISTROS_OPERACIONAIS.md": { tela: "reg_op" },
  "MANUAL_MODULO_RELATORIO_CALIBRACAO.md": { tela: "relatorio_calibracao" },
  "MANUAL_MODULO_RELATORIO_QUALIFICACAO_QIQOQD.md": { tela: "declaracao_qiqo" }
};
/** Manuais que não são deste SGO+ (cartão financeiro do sistema antigo). */
const IGNORAR = ["MANUAL_FINANCEIRO_FLASH_USO_OPERACIONAL.md", "MANUAL_USO_FIN_FLASH_V2.md"];
const MAX_SECAO = 1800;

function limparMd(t) {
  return String(t)
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:])/g, "$1$2")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, "")
    .replace(/^\s*\|(.*)\|\s*$/gm, (m, c) => c.split("|").map((x) => x.trim()).filter(Boolean).join(" | "))
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*(\d+)\.\s+/gm, "$1. ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dividir(texto) {
  if (texto.length <= MAX_SECAO) return [texto];
  const partes = [], paras = texto.split(/\n\n+/);
  let atual = "";
  for (const p of paras) {
    if (atual && (atual + "\n\n" + p).length > MAX_SECAO) { partes.push(atual); atual = ""; }
    if (p.length > MAX_SECAO) {
      const frases = p.split(/(?<=[.;:])\s+/);
      for (const f of frases) { if (atual && (atual + " " + f).length > MAX_SECAO) { partes.push(atual); atual = ""; } atual = atual ? atual + " " + f : f; }
    } else atual = atual ? atual + "\n\n" + p : p;
  }
  if (atual) partes.push(atual);
  return partes;
}

function lerManual(arquivo, conteudo) {
  const linhas = conteudo.replace(/\r\n/g, "\n").split("\n");
  let titulo = arquivo.replace(/\.md$/, "");
  const secoes = [];
  let h2 = "", h3 = "", buf = [];
  const fechar = () => {
    const texto = limparMd(buf.join("\n"));
    buf = [];
    if (!texto) return;
    const t = h3 ? (h2 ? h2 + " > " + h3 : h3) : (h2 || "Introdução");
    const partes = dividir(texto);
    partes.forEach((p, i) => secoes.push({ titulo: limparMd(t) + (partes.length > 1 ? " (parte " + (i + 1) + ")" : ""), texto: p }));
  };
  for (const l of linhas) {
    let m;
    if ((m = /^#\s+(.+)$/.exec(l)) && !secoes.length && !h2) { titulo = limparMd(m[1]); continue; }
    if ((m = /^##\s+(.+)$/.exec(l))) { fechar(); h2 = m[1].trim().replace(/^\d+(\.\d+)*\.?\s+/, ""); h3 = ""; continue; }
    if ((m = /^#{3,6}\s+(.+)$/.exec(l))) { fechar(); h3 = m[1].trim().replace(/^\d+(\.\d+)*\.?\s+/, ""); continue; }
    buf.push(l);
  }
  fechar();
  return { titulo, secoes };
}

function gerar(pastaDocs) {
  const arquivos = fs.readdirSync(pastaDocs).filter((f) => /^MANUAL_.*\.md$/.test(f)).sort();
  const semMapa = arquivos.filter((f) => !MAPA[f] && !IGNORAR.includes(f));
  const manuais = [];
  for (const f of arquivos) {
    if (!MAPA[f]) continue;
    const m = lerManual(f, fs.readFileSync(path.join(pastaDocs, f), "utf8").replace(/\r\n/g, "\n"));
    manuais.push({ arquivo: f, titulo: m.titulo, tela: MAPA[f].tela, perfis: MAPA[f].perfis || null, secoes: m.secoes });
  }
  const json = JSON.stringify(manuais);
  const versao = crypto.createHash("sha1").update(json).digest("hex").slice(0, 12);
  const js = "/**\n * Base dos manuais do assistente \"Tire sua dúvida\" (docs/MANUAL_*.md transformados em dados).\n" +
    " * ARQUIVO GERADO por _tools/gerar_base_assistente.cjs: não edite à mão. Para mudar, edite o manual e gere de novo\n" +
    " * (a importação do servidor gera sozinha a cada publicação; o teste tests/assistente-duvidas.test.cjs confere).\n */\n" +
    "var SGO_ASSIST_MANUAIS = " + JSON.stringify({ versao, manuais }, null, 1) + ";\n";
  return { js, versao, semMapa, total: manuais.length, secoes: manuais.reduce((n, m) => n + m.secoes.length, 0) };
}

module.exports = { gerar, MAPA, IGNORAR, lerManual, limparMd };

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
  const docs = arg("--docs") || PADRAO_DOCS, saida = arg("--saida") || PADRAO_SAIDA;
  const r = gerar(docs);
  if (r.semMapa.length) console.warn("Manuais sem tela no mapa (não entram na base; acrescente em MAPA ou IGNORAR): " + r.semMapa.join(", "));
  if (process.argv.includes("--conferir")) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, "utf8").replace(/\r\n/g, "\n") : "";
    if (atual !== r.js) { console.error("SGO_AssistenteManuais.js desatualizado: rode node _tools/gerar_base_assistente.cjs"); process.exit(1); }
    console.log("base dos manuais em dia (" + r.versao + ")");
  } else {
    fs.writeFileSync(saida, r.js);
    console.log("base dos manuais gravada: " + r.total + " manuais, " + r.secoes + " seções, versão " + r.versao + " -> " + saida);
  }
}
