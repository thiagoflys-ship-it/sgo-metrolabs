/*
 * Orçamento para o cliente responder (Metrolabs, SGO+). Sem login: o token vem no fragmento do endereço (#...), que o
 * navegador nunca manda ao servidor; a página manda o token no corpo das chamadas /orcamento/api/*.
 * Aprovar (nome, cargo, CPF opcional, e-mail, "li e concordo", assinatura), pedir ajuste ou recusar (texto). Resposta única.
 */
const $ = (id) => document.getElementById(id);
const tela = $("tela");
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const token = (location.hash || "").replace(/^#(t=)?/, "").trim().toLowerCase();
let ORC = null, escolha = "", quadro = null, enviando = false;
// 10/11/2026: a mesma página atende a proposta comercial (/assinar-proposta/); ali os textos falam de proposta, não de orçamento
const COMERCIAL = /^\/assinar-proposta\//.test(location.pathname);
const DOC = COMERCIAL ? { o: "a proposta", de: "da proposta" } : { o: "o orçamento", de: "do orçamento" };
if (COMERCIAL) {
  const t = document.querySelector(".topo-tit"); if (t) t.textContent = "Comercial";
  const r = document.querySelector(".rodape p"); if (r) r.textContent = "Página segura da Metrolabs. Quem tiver este link vê a proposta e pode assiná-la. Encaminhe apenas a quem for assinar pela sua instituição.";
}

async function api(caminho, corpo) {
  try {
    const r = await fetch("./api/" + caminho, { method: "POST", headers: { "content-type": "application/json" }, credentials: "omit", cache: "no-store", body: JSON.stringify(corpo) });
    if (caminho === "pdf" && r.ok) return { ok: true, blob: await r.blob(), nome: nomeArquivo(r.headers.get("content-disposition")) };
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    return j || { ok: false, codigo: "ERRO", message: "O servidor não respondeu como esperado. Tente de novo em alguns minutos." };
  } catch (e) {
    return { ok: false, codigo: "REDE", message: "Sem conexão com a internet agora. Confira o sinal e tente de novo; nada foi registrado." };
  }
}
function nomeArquivo(cd) { const m = /filename\*=UTF-8''([^;]+)/i.exec(cd || ""); try { return m ? decodeURIComponent(m[1]) : "orcamento.pdf"; } catch (e) { return "orcamento.pdf"; } }
function contatoHtml(c) {
  if (!c) return "";
  const partes = [];
  if (c.telefone) partes.push(`Telefone: <a href="tel:${esc(String(c.telefone).replace(/[^\d+]/g, ""))}">${esc(c.telefone)}</a>`);
  if (c.email) partes.push(`E-mail: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
  if (c.site) partes.push(`Site: ${esc(c.site)}`);
  return `<p class="contato">${partes.length ? (COMERCIAL && c.nome ? "Fale com " + esc(c.nome) + ", da Metrolabs. " : "Fale com a Metrolabs. ") + partes.join(" · ") : "Fale com a Metrolabs pelo mesmo contato que enviou " + DOC.o + " (responda o e-mail)."}</p>`;
}
function mostrar(html) { tela.innerHTML = html; tela.focus({ preventScroll: true }); window.scrollTo(0, 0); }

function telaIndisponivel(r) {
  document.title = "Link indisponível | Metrolabs";
  const msg = COMERCIAL ? "Este link de proposta não está disponível. Ele pode ter sido trocado por um envio mais novo, a proposta pode ter vencido antes da assinatura ou o link está incompleto (abra o link inteiro, direto do e-mail). Para receber um link novo, fale com o seu contato comercial na Metrolabs."
    : (r.message || "Este link de orçamento não está disponível.");
  mostrar(`<div class="cartao"><h1>Link indisponível</h1><div class="aviso alerta"><p>${esc(msg)}</p></div>${contatoHtml(r.contato)}</div>`);
}
function telaErro(r) {
  mostrar(`<div class="cartao"><h1>Não foi possível abrir</h1><div class="aviso erro"><p>${esc(r.message)}</p></div><button type="button" class="bt primario" id="btDeNovo">Tentar de novo</button>${contatoHtml(r.contato)}</div>`);
  $("btDeNovo").onclick = carregar;
}

function blocoOrcamento(o) {
  const itens = o.itens.map((i) => `<li class="item"><span class="desc">${esc(i.descricao)}</span><span class="tot">${esc(i.totalTxt)}</span>
    <span class="sub">${esc(i.tipo)} · ${esc(i.quantidadeTxt)} × ${esc(i.unitarioTxt)}${i.codigo ? " · código " + esc(i.codigo) : ""}</span></li>`).join("");
  return `<div class="cartao">
      <p class="fraco pequeno">${o.comercial ? "Proposta comercial" : "Orçamento de assistência técnica"}</p>
      <h1>${esc(o.numero)}${o.revisao ? " · revisão " + esc(o.revisao) : ""}</h1>
      <dl class="dados">
        ${o.comercial ? "" : `<div><dt>Chamado</dt><dd>${esc(o.chamadoNumero)}</dd></div>`}
        <div><dt>Emitido em</dt><dd>${esc(o.emitidoEm)}</dd></div>
        <div class="largo"><dt>Cliente</dt><dd>${esc(o.cliente)}</dd></div>
        ${o.unidade ? `<div class="largo"><dt>Unidade</dt><dd>${esc(o.unidade)}</dd></div>` : ""}
        ${o.equipamento ? `<div class="largo"><dt>Equipamento</dt><dd>${esc(o.equipamento)}</dd></div>` : ""}
        ${o.problema ? `<div class="largo"><dt>Problema relatado</dt><dd>${esc(o.problema)}</dd></div>` : ""}
      </dl>
    </div>
    <div class="cartao">
      <h2>Itens</h2>
      <ul class="itens">${itens}</ul>
      <div class="total"><span>Total</span><span>${esc(o.totalTxt)}</span></div>
    </div>
    <div class="cartao">
      <h2>Condições</h2>
      <dl class="dados"><div><dt>Validade ${DOC.de}</dt><dd>${esc(o.validade)}${o.vencido ? ' <span class="selo alerta">vencido</span>' : ""}</dd></div></dl>
      ${o.condicoes ? `<p class="condicoes">${esc(o.condicoes)}</p>` : ""}
      ${o.temPdf ? `<button type="button" class="bt" id="btPdf">${textoPdf(o)}</button><div id="pdfMsg"></div>` : ""}
    </div>`;
}

function textoPdf(o) { return COMERCIAL ? (o && o.estado === "RESPONDIDO" ? "Baixar a proposta assinada em PDF" : "Baixar a proposta em PDF") : "Baixar o orçamento em PDF"; }
function telaOrcamento(o) {
  ORC = o;
  document.title = `${COMERCIAL || o.comercial ? "Proposta" : "Orçamento"} ${o.numero} | Metrolabs`;
  let topo = "";
  if (o.estado === "RESPONDIDO" && o.comercial) {
    const r = o.resposta || {};
    topo = `<div class="aviso ok"><p><strong>Proposta assinada em ${esc(r.em)} por ${esc(r.por)}</strong>.</p><p>A proposta com as assinaturas da Metrolabs e do cliente está disponível no botão "Baixar a proposta assinada em PDF", abaixo, e a confirmação foi enviada por e-mail. Ela não aceita outra assinatura; se precisar mudar algo, fale com o seu contato comercial na Metrolabs.</p></div>`;
  } else if (o.estado === "RESPONDIDO") {
    const r = o.resposta || {};
    topo = `<div class="aviso ${r.decisao === "APROVADO" ? "ok" : "alerta"}"><p><strong>Respondido em ${esc(r.em)} por ${esc(r.por)}</strong> (${esc(r.decisaoNome)}, ${esc(r.canal)}).</p><p>Este orçamento não aceita outra resposta. Se precisar mudar algo, fale com a Metrolabs.</p></div>`;
  } else if (o.estado === "VENCIDO") {
    topo = `<div class="aviso alerta"><p><strong>Este orçamento venceu em ${esc(o.validade)}.</strong> Ele não pode mais ser aprovado. Para seguir, peça uma revisão à Metrolabs.</p></div>`;
  }
  const responder = o.estado === "ABERTO" ? `<div class="cartao" id="resposta">
      <h2>Sua resposta</h2>
      <p class="fraco pequeno">${o.comercial ? "A assinatura fica registrada com data e hora e não pode ser trocada depois." : "A resposta fica registrada com data e hora e não pode ser trocada depois."}</p>
      <div class="escolha" role="group" aria-label="${o.comercial ? "Assinatura da proposta" : "Resposta ao orçamento"}">
        <button type="button" class="bt primario" data-escolha="APROVADO" aria-pressed="false">${o.comercial ? "Assinar proposta" : "Aprovar"}</button>
        ${o.comercial ? "" : `<button type="button" class="bt" data-escolha="AJUSTE" aria-pressed="false">Pedir ajuste</button>
        <button type="button" class="bt perigo" data-escolha="RECUSADO" aria-pressed="false">Recusar</button>`}
      </div>
      <form id="form" novalidate hidden></form>
    </div>` : `<div class="cartao">${contatoHtml(o.contato)}</div>`;
  mostrar(topo + blocoOrcamento(o) + responder);
  ligarPdf();
  document.querySelectorAll("[data-escolha]").forEach((b) => { b.onclick = () => abrirForm(b.dataset.escolha); });
}

function ligarPdf() {
  const b = $("btPdf");
  if (!b) return;
  b.onclick = async () => {
    b.disabled = true; b.textContent = "Baixando…";
    const r = await api("pdf", { token });
    b.disabled = false; b.textContent = textoPdf(ORC);
    if (!r.ok || !r.blob) { $("pdfMsg").innerHTML = `<div class="aviso erro"><p>${esc(r.message || "Não foi possível baixar o PDF agora.")}</p></div>`; return; }
    const url = URL.createObjectURL(r.blob), a = document.createElement("a");
    a.href = url; a.download = r.nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
}

function campo(id, rotulo, html, ajuda) { return `<div class="campo" id="c_${id}"><label for="${id}">${esc(rotulo)}</label>${html}${ajuda ? `<p class="ajuda">${esc(ajuda)}</p>` : ""}<p class="msg-erro" id="e_${id}" hidden></p></div>`; }
function abrirForm(dec) {
  escolha = dec;
  document.querySelectorAll("[data-escolha]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.escolha === dec)));
  const f = $("form"), apr = dec === "APROVADO";
  f.hidden = false;
  f.innerHTML = (apr ? `<p class="fraco pequeno">Total ${esc(ORC.totalTxt)} · validade ${esc(ORC.validade)}.</p>` : "") +
    campo("nome", "Nome completo", `<input id="nome" autocomplete="name" maxlength="120">`) +
    (apr ? campo("cargo", "Cargo ou função", `<input id="cargo" autocomplete="organization-title" maxlength="80">`, "Ex.: gerente de enfermagem, engenheiro clínico, diretor administrativo.") +
      campo("documento", "CPF (opcional)", `<input id="documento" inputmode="numeric" autocomplete="off" maxlength="14">`) : "") +
    campo("email", "E-mail", `<input id="email" type="email" autocomplete="email" inputmode="email" maxlength="160">`, ORC.comercial ? "A confirmação, com a proposta assinada em PDF, vai para este e-mail." : "A confirmação da resposta vai para este e-mail.") +
    (apr ? `<div class="campo" id="c_assinatura"><label for="quadro">Assinatura</label><canvas id="quadro" class="quadro" aria-label="Quadro de assinatura: assine com o dedo ou o mouse"></canvas>
        <div class="linha-acao"><button type="button" class="link-bt" id="btLimpar">Limpar a assinatura</button></div><p class="msg-erro" id="e_assinatura" hidden></p></div>
      <label class="concordo" id="c_concordo"><input type="checkbox" id="concordo"> <span>Li ${ORC.comercial ? "a proposta" : "o orçamento"} ${esc(ORC.numero)} e concordo com os itens, os valores e as condições.</span></label><p class="msg-erro" id="e_concordo" hidden></p>`
      : campo("texto", dec === "AJUSTE" ? "O que precisa mudar no orçamento" : "Motivo da recusa", `<textarea id="texto" maxlength="1500"></textarea>`,
        dec === "AJUSTE" ? "A Metrolabs revisa e envia uma nova versão." : "Ajuda a Metrolabs a propor outra solução.")) +
    `<div id="formMsg"></div><button type="submit" class="bt primario" id="btEnviar">${textoEnviar(dec)}</button>`;
  f.onsubmit = (e) => { e.preventDefault(); enviar(); };
  f.querySelectorAll("input, textarea").forEach((i) => i.addEventListener("input", () => limparErro(i.id)));
  if (apr) { montarQuadro(); $("btLimpar").onclick = () => { quadro.ajustar(); limparErro("assinatura"); }; }
  f.scrollIntoView({ behavior: "smooth", block: "start" });
}
function textoEnviar(dec) { return dec === "APROVADO" ? (ORC && ORC.comercial ? "Assinar a proposta" : "Aprovar o orçamento") : dec === "AJUSTE" ? "Enviar o pedido de ajuste" : "Recusar o orçamento"; }
function erro(id, msg) {
  const e = $("e_" + id), c = $("c_" + id);
  if (e) { e.textContent = msg; e.hidden = false; }
  if (c) c.classList.add("erro");
  const alvo = $(id === "assinatura" ? "quadro" : id);
  if (alvo && alvo.focus) alvo.focus();
  if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
}
function limparErro(id) { const e = $("e_" + id), c = $("c_" + id); if (e) e.hidden = true; if (c) c.classList.remove("erro"); }

function cpfValido(v) {
  const d = String(v).replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
/** Mesmas regras do servidor (o servidor confere de novo). */
function conferir(d) {
  const nome = d.nome.replace(/\s+/g, " ").trim();
  if (nome.length < 5 || nome.split(" ").length < 2) return ["nome", "Informe o nome completo (nome e sobrenome)."];
  if (d.decisao === "APROVADO" && d.cargo.trim().length < 2) return ["cargo", "Informe o seu cargo ou função."];
  if (d.decisao === "APROVADO" && d.documento.trim() && !cpfValido(d.documento)) return ["documento", "O CPF não confere. Corrija os números ou deixe em branco (é opcional)."];
  if (!/^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+\.[a-z]{2,}$/i.test(d.email.trim())) return ["email", "Informe um e-mail completo (nome@empresa.com.br)."];
  if (d.decisao === "APROVADO" && !d.assinatura) return ["assinatura", "Assine no quadro com o dedo ou o mouse."];
  if (d.decisao === "APROVADO" && !d.concordo) return ["concordo", ORC && ORC.comercial ? 'Marque "Li e concordo" para assinar.' : 'Marque "Li e concordo" para aprovar.'];
  if (d.decisao !== "APROVADO" && d.texto.trim().length < 5) return ["texto", d.decisao === "RECUSADO" ? "Escreva o motivo da recusa." : "Escreva o ajuste que você precisa."];
  return null;
}
async function enviar() {
  if (enviando) return;
  const apr = escolha === "APROVADO";
  const d = { decisao: escolha, nome: $("nome").value, email: $("email").value, cargo: apr ? $("cargo").value : "", documento: apr ? $("documento").value : "",
    texto: apr ? "" : $("texto").value, concordo: apr ? $("concordo").checked : false, assinatura: apr && quadro && quadro.tracos > 0 ? imagemDoQuadro() : "" };
  const falta = conferir(d);
  if (falta) { erro(falta[0], falta[1]); return; }
  enviando = true;
  const b = $("btEnviar"); b.disabled = true; b.textContent = "Registrando…";
  $("formMsg").innerHTML = "";
  const r = await api("responder", { token, dados: d });
  enviando = false; b.disabled = false; b.textContent = textoEnviar(escolha);
  if (r.ok) return ORC.comercial ? telaOrcamento(r.orcamento) : telaFeito(r);
  if (r.codigo === "ENTRADA" && r.campo && $("e_" + r.campo)) return erro(r.campo, r.message);
  if (r.codigo === "INDISPONIVEL") return telaIndisponivel(r);
  if ((r.codigo === "RESPONDIDO" || r.codigo === "VENCIDO") && r.orcamento) { telaOrcamento(r.orcamento); return; }
  $("formMsg").innerHTML = `<div class="aviso erro"><p>${esc(r.message || "Não foi possível registrar agora. Nada foi registrado; tente de novo.")}</p></div>${r.contato ? contatoHtml(r.contato) : ""}`;
}
function telaFeito(r) {
  const o = r.orcamento || ORC, dec = (o.resposta || {}).decisao || escolha;
  const tit = dec === "APROVADO" ? "Aprovação registrada" : dec === "AJUSTE" ? "Pedido de ajuste registrado" : "Recusa registrada";
  document.title = tit + " | Metrolabs";
  mostrar(`<div class="cartao feito"><h1>${tit}</h1><div class="aviso ok"><p>${esc(r.message)}</p></div>
    <dl class="dados"><div><dt>Orçamento</dt><dd>${esc(o.numero)}${o.revisao ? " · revisão " + esc(o.revisao) : ""}</dd></div><div><dt>Registrado em</dt><dd>${esc(r.em)}</dd></div>
    <div class="largo"><dt>Protocolo</dt><dd class="protocolo">${esc(r.protocolo)}</dd></div></dl>
    <p class="fraco pequeno">Guarde o e-mail de confirmação${dec === "APROVADO" ? ", que traz o comprovante de aprovação em PDF" : ""}. Pode fechar esta página.</p>
    ${contatoHtml(o.contato)}</div>` + blocoOrcamento(o));
  ligarPdf();
}

/* ---------------- quadro de assinatura (o mesmo do SGO+ Campo) ---------------- */
function montarQuadro() {
  const c = $("quadro");
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const ajustar = () => { const r = c.getBoundingClientRect(); c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.lineWidth = 2.6 * dpr; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#000"; if (quadro) quadro.tracos = 0; };
  quadro = { c, tracos: 0, ajustar };
  ajustar();
  let ultimo = null;
  const ponto = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
  c.addEventListener("pointerdown", (e) => { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) { /* segue */ } ultimo = ponto(e); const g = c.getContext("2d"); g.beginPath(); g.arc(ultimo.x, ultimo.y, 1.2 * dpr, 0, Math.PI * 2); g.fillStyle = "#000"; g.fill(); quadro.tracos++; limparErro("assinatura"); });
  c.addEventListener("pointermove", (e) => { if (!ultimo) return; e.preventDefault(); const p = ponto(e), g = c.getContext("2d"); g.beginPath(); g.moveTo(ultimo.x, ultimo.y); g.lineTo(p.x, p.y); g.stroke(); ultimo = p; quadro.tracos++; });
  const fim = () => { ultimo = null; };
  c.addEventListener("pointerup", fim); c.addEventListener("pointercancel", fim); c.addEventListener("pointerleave", fim);
}
/** PNG da assinatura até 200.000 caracteres (o limite do servidor). */
function imagemDoQuadro() {
  const c = quadro.c;
  for (const larg of [600, 420, 300]) {
    const k = Math.min(1, larg / c.width), s = document.createElement("canvas");
    s.width = Math.round(c.width * k); s.height = Math.round(c.height * k);
    const g = s.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, s.width, s.height); g.drawImage(c, 0, 0, s.width, s.height);
    const url = s.toDataURL("image/png");
    if (url.length <= 200000) return url;
  }
  return "";
}

async function carregar() {
  if (COMERCIAL) document.title = "Proposta | Metrolabs";
  if (!/^[a-f0-9]{64}$/.test(token)) return telaIndisponivel({ message: "Este link de orçamento está incompleto. Abra o link inteiro, direto do e-mail (no celular, toque no link em vez de copiar um pedaço). Se continuar, fale com a Metrolabs." });
  const r = await api("ver", { token });
  if (r.ok && r.orcamento) return telaOrcamento(r.orcamento);
  if (r.codigo === "INDISPONIVEL" || r.codigo === "LIMITE") return telaIndisponivel(r);
  return telaErro(r);
}
window.addEventListener("hashchange", () => location.reload());
carregar();
