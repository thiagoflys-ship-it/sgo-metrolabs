#!/usr/bin/env node
// 17/11/2026 — Base do assistente "Tire sua dúvida" pela UNIÃO: docs/ atualizado + o que só existe na base de produção.
//
// A base em produção (SGO_AssistenteManuais.js, versão 0a0b5125a2fe, copiada na candH) foi gerada de manuais que não estão
// no repositório. Este script:
//   1. remonta as seções da produção (junta as "(parte N)" que o gerador dividiu);
//   2. acha os parágrafos da produção que não aparecem no texto que docs/ gera hoje;
//   3. confere no git (todas as ramificações) se o parágrafo já existiu em alguma versão do manual:
//        - existiu  -> o docs/ o trocou de propósito (texto antigo): NÃO volta (fica listado no relatório);
//        - nunca existiu -> trecho só da produção: volta para o manual em docs/, com a marca de origem (comentário HTML,
//          que o gerador ignora);
//   4. regra de colocação (sem inventar texto: só o parágrafo da produção, como está na base):
//        - seção que o docs/ não tem: entra a seção inteira (título da produção), logo depois da seção vizinha;
//        - seção que o docs/ tem e o parágrafo da produção CONTÉM o parágrafo parecido do docs/ (todas as palavras do docs/
//          estão nele): o da produção substitui o do docs/ (nada se perde, e o da produção é o mais completo);
//        - demais casos: o parágrafo da produção entra no fim da seção do docs/ (nada é apagado).
// Uso: node recuperar-trechos-producao.cjs [--aplicar]      (sem --aplicar só lista; com --aplicar grava em docs/)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const RAIZ = path.join(__dirname, "../..");
const g = require(path.join(RAIZ, "_tools/gerar_base_assistente.cjs"));
const PROD = path.join(RAIZ, "output/financeiro-20261116/candH/SGO_AssistenteManuais.js");
const APLICAR = process.argv.includes("--aplicar");
const MARCA = "<!-- recuperado da base do assistente em produção (versão 0a0b5125a2fe) em 17/11/2026: texto publicado que não estava em docs/ -->";

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const tok = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
const semParte = (t) => String(t).replace(/ \(parte \d+\)$/, "");
const git = (a) => cp.execSync("git " + a, { cwd: RAIZ, encoding: "utf8", maxBuffer: 1 << 28 });

function lerProd() {
  const ctx = {}; vm.createContext(ctx);
  // o arquivo de produção já está ANTES da regeneração: lido daqui, nunca do arquivo regerado
  const fonte = fs.existsSync(path.join(__dirname, "SGO_AssistenteManuais.producao.js")) ? path.join(__dirname, "SGO_AssistenteManuais.producao.js") : PROD;
  vm.runInContext(fs.readFileSync(fonte, "utf8") + "\nthis.B=SGO_ASSIST_MANUAIS;", ctx);
  return ctx.B;
}
/** Seções remontadas: [{ titulo, paragrafos: [] }] (partes coladas; parte que começa em minúscula continua o parágrafo). */
function remontar(secoes) {
  const out = [];
  for (const s of secoes) {
    const t = semParte(s.titulo);
    let alvo = out.length && out[out.length - 1].titulo === t && /\(parte \d+\)$/.test(s.titulo) ? out[out.length - 1] : null;
    const pars = s.texto.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    if (!alvo) { out.push({ titulo: t, paragrafos: pars }); continue; }
    if (pars.length && /^[a-zà-ú]/.test(pars[0]) && alvo.paragrafos.length) { alvo.paragrafos[alvo.paragrafos.length - 1] += " " + pars.shift(); }
    alvo.paragrafos.push(...pars);
  }
  return out;
}
function tituloHeading(l) { const m = /^(#{2,6})\s+(.+?)\s*$/.exec(l); return m ? { nivel: m[1].length === 2 ? 2 : 3, titulo: m[2].trim().replace(/^\d+(\.\d+)*\.?\s+/, "") } : null; }
/** Blocos do md: [{ chave, titulo, nivel, ini (linha do título), fim (exclusivo) }], com a chave igual à do gerador. */
function blocos(linhas) {
  const bl = []; let h2 = "";
  linhas.forEach((l, i) => {
    const h = tituloHeading(l); if (!h) return;
    if (h.nivel === 2) h2 = h.titulo;
    const chave = h.nivel === 2 ? h.titulo : (h2 ? h2 + " > " + h.titulo : h.titulo);
    bl.push({ chave: norm(g.limparMd(chave)), nivel: h.nivel, ini: i, h2: norm(g.limparMd(h2)) });
  });
  bl.forEach((b, k) => { b.fim = k + 1 < bl.length ? bl[k + 1].ini : linhas.length; });
  // fim do bloco de nível 2 = antes do próximo título de nível 2
  bl.forEach((b, k) => { if (b.nivel !== 2) return; let j = k + 1; while (j < bl.length && bl[j].nivel !== 2) j++; b.fimH2 = j < bl.length ? bl[j].ini : linhas.length; });
  return bl;
}

function main() {
  const prod = lerProd();
  const log = { aplicado: APLICAR, manuais: [] };
  for (const m of prod.manuais) {
    const arq = path.join(RAIZ, "docs", m.arquivo);
    if (!fs.existsSync(arq)) { log.manuais.push({ arquivo: m.arquivo, erro: "manual não existe em docs/" }); continue; }
    const bruto = fs.readFileSync(arq, "utf8");
    const textoDe = (secs) => norm(remontar(secs).map((x) => x.titulo + " " + x.paragrafos.join(" ")).join(" "));
    const docsTexto = textoDe(g.lerManual(m.arquivo, bruto).secoes);
    const secoes = remontar(m.secoes);
    const faltam = [];
    secoes.forEach((s, si) => s.paragrafos.forEach((p) => { const n = norm(p); if (n.length > 25 && !docsTexto.includes(n)) faltam.push({ si, secao: s.titulo, par: p }); }));
    if (!faltam.length) continue;
    let hist = "";
    for (const c of git(`log --all --format=%H -- docs/${m.arquivo}`).split("\n").filter(Boolean)) {
      try { hist += "\n" + norm(g.lerManual(m.arquivo, git(`show ${c}:docs/${m.arquivo}`)).secoes.map((s) => s.titulo + " " + s.texto).join(" ")); } catch (e) { /* arquivo ausente nesse commit */ }
    }
    const reg = { arquivo: m.arquivo, superados: [], acoes: [] };
    const recuperar = faltam.filter((f) => { if (hist.includes(norm(f.par))) { reg.superados.push({ secao: f.secao, par: f.par }); return false; } return true; });
    // aplica no texto (linhas), preservando o fim de linha do arquivo
    const crlf = (bruto.match(/\r\n/g) || []).length, lf = (bruto.match(/(^|[^\r])\n/g) || []).length;
    const EOL = crlf >= lf ? "\r\n" : "\n";
    const linhas = bruto.split(/\r?\n/);
    const eolsOrig = bruto.match(/\r?\n/g) || [];
    // trabalhamos com uma lista de { texto, eol } para não mexer no fim de linha das linhas existentes
    let L = linhas.map((t, i) => ({ t, eol: i < eolsOrig.length ? eolsOrig[i] : "" }));
    const inserirEm = (pos, novas) => { L.splice(pos, 0, ...novas.map((t) => ({ t, eol: EOL }))); };
    // agrupa por seção, na ordem da produção
    const porSecao = new Map();
    recuperar.forEach((f) => { if (!porSecao.has(f.si)) porSecao.set(f.si, []); porSecao.get(f.si).push(f); });
    for (const [si, lista] of porSecao) {
      const s = secoes[si];
      const bl = blocos(L.map((x) => x.t));
      const chave = norm(s.titulo);
      const b = bl.find((x) => x.chave === chave);
      if (b) {
        for (const f of lista) {
          const bl2 = blocos(L.map((x) => x.t)); const b2 = bl2.find((x) => x.chave === chave);
          // todas as palavras do parágrafo da produção já estão na seção do docs/: não há informação nova (redação antiga cortada)
          const palSecao = tok(L.slice(b2.ini, b2.fim).map((x) => g.limparMd(x.t)).join(" "));
          const novasPal = [...tok(f.par)].filter((w) => !palSecao.has(w));
          if (novasPal.length === 0) { reg.superados.push({ secao: f.secao, par: f.par, motivo: "todas as palavras já estão na seção do docs/" }); continue; }
          // parágrafo mais parecido dentro do bloco
          const a = tok(f.par); let best = -1, bj = 0;
          for (let i = b2.ini + 1; i < b2.fim; i++) {
            const c = g.limparMd(L[i].t); if (norm(c).length < 20) continue;
            const bb = tok(c); let n = 0; a.forEach((w) => { if (bb.has(w)) n++; });
            const j = n / (a.size + bb.size - n || 1); if (j > bj) { bj = j; best = i; }
          }
          const contem = best >= 0 && bj >= 0.4 && [...tok(g.limparMd(L[best].t))].every((w) => a.has(w));
          if (contem) {
            reg.acoes.push({ tipo: "substituiu (o da produção contém o do docs/)", secao: s.titulo, antes: g.limparMd(L[best].t), depois: f.par });
            const prefixo = /^\s*(\d+\.\s+|[-*+]\s+)/.exec(L[best].t);
            const novo = (prefixo && !/^\s*(\d+\.\s+|[-*+]\s+)/.test(f.par) ? prefixo[0] : "") + f.par;
            L[best].t = novo; inserirEm(best, [MARCA]);
          } else {
            let fim = b2.fim; while (fim > b2.ini + 1 && !L[fim - 1].t.trim()) fim--;
            reg.acoes.push({ tipo: "acrescentou no fim da seção", secao: s.titulo, depois: f.par, parecidoNoDocs: best >= 0 ? +bj.toFixed(2) : 0 });
            inserirEm(fim, ["", MARCA, f.par]);
          }
        }
      } else {
        // seção nova: título da produção. "A > B" vira ### B dentro de ## A (se A existe); senão ## título
        const partes = s.titulo.split(" > ");
        let pos, cab;
        const h2 = partes.length > 1 ? bl.find((x) => x.nivel === 2 && x.chave === norm(partes[0])) : null;
        if (h2) { pos = h2.fimH2; cab = "### " + partes.slice(1).join(" > "); }
        else {
          cab = "## " + s.titulo;
          // depois da seção anterior da produção que existe no docs/ (fim do bloco de nível 2 dela)
          pos = L.length;
          for (let k = si - 1; k >= 0; k--) {
            const ant = bl.find((x) => x.chave === norm(secoes[k].titulo) || x.chave === norm(secoes[k].titulo.split(" > ")[0]));
            if (ant) { const top = ant.nivel === 2 ? ant : bl.filter((x) => x.nivel === 2 && x.ini <= ant.ini).pop(); pos = top ? top.fimH2 : ant.fim; break; }
          }
          if (pos === L.length) { // nenhuma vizinha: antes da primeira seção de nível 2 depois da introdução, ou no fim
            const primeira = si === 0 ? bl.find((x) => x.nivel === 2) : null; if (primeira) pos = primeira.ini;
          }
        }
        while (pos > 0 && !L[pos - 1].t.trim()) pos--;
        const novas = ["", cab, "", MARCA];
        lista.forEach((f, i) => { if (i) novas.push(""); novas.push(f.par); });
        // última linha do arquivo sem fim de linha: garante a quebra antes de inserir no fim
        if (pos === L.length && L.length && L[L.length - 1].eol === "") L[L.length - 1].eol = EOL;
        inserirEm(pos, novas);
        reg.acoes.push({ tipo: "seção nova", secao: s.titulo, cabecalho: cab, paragrafos: lista.map((f) => f.par) });
      }
    }
    // se a última linha nova ficou no fim do arquivo, segue o padrão do arquivo (sem quebra final se não tinha)
    const saida = L.map((x, i) => x.t + (i < L.length - 1 ? (x.eol || EOL) : x.eol)).join("");
    reg.recuperados = reg.acoes.reduce((n, a) => n + (a.paragrafos ? a.paragrafos.length : 1), 0);
    reg.eol = EOL === "\r\n" ? "CRLF" : "LF";
    if (APLICAR) fs.writeFileSync(arq, saida);
    log.manuais.push(reg);
  }
  fs.writeFileSync(path.join(__dirname, "recuperacao-trechos.json"), JSON.stringify(log, null, 1));
  log.manuais.forEach((r) => console.log(r.arquivo, "recuperados:", r.recuperados, "superados pelo docs/:", (r.superados || []).length, "ações:", (r.acoes || []).map((a) => a.tipo.split(" ")[0]).join(",")));
}
main();
