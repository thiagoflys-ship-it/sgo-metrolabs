/* =====================================================================
   FINANCEIRO v2 — componentes reutilizáveis (HTML + JS puro, padrão do legado)
   No legado: JS_Financeiro_V2_Componentes.html (funções Fin_*). Cada função
   devolve HTML em texto (como Comercial_cabecalho_ e Com_opcoes_) e, quando
   precisa de clique, um "ligar" separado que recebe o elemento já desenhado.
   ===================================================================== */
var FV = { emp: "TODAS", papel: "WANESSA", pagina: "painel", periodo: "mes", abaPainel: null };
try { var _e = localStorage.getItem("fv_emp"); if (_e) FV.emp = _e; } catch (e) {}

var FV_EMP_NOME = { TODAS: "Todas (consolidado)", MATRIZ: "Matriz", FILIAL: "Filial", PRESTADORA: "Prestadora" };
var FV_PAPEL_NOME = { DONO: "Dono (administrador)", CHARLES: "Charles", WANESSA: "Wanessa" };

function Fin_esc_(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function Fin_$_(id) { return document.getElementById(id); }

/* ---------- números e datas em pt-BR ---------- */
var FV_FMT_MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
var FV_FMT_NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
/** R$ 1.234,56 (o espaço depois de R$ fica inseparável, igual ao Intl). */
function Fin_moeda_(v) { return FV_FMT_MOEDA.format(Number(v) || 0); }
/** Para eixos e cartões estreitos: R$ 412 mil · R$ 1,2 mi. Nunca em tabela (lá vai o valor inteiro). */
function Fin_moedaCurta_(v) {
  var a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e6) return s + "R$ " + FV_FMT_NUM.format(a / 1e6) + " mi";
  if (a >= 1e3) return s + "R$ " + Math.round(a / 1e3).toLocaleString("pt-BR") + " mil";
  return s + "R$ " + Math.round(a);
}
function Fin_pct_(v, casas) { return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas == null ? 1 : casas }) + " %"; }
function Fin_data_(d) { if (!d) return "—"; return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }
function Fin_dataLonga_(d) { return Fin_data_(d) + "/" + d.getFullYear(); }
var FV_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function Fin_diaSemana_(d) { return FV_SEMANA[d.getDay()]; }
function Fin_difDias_(d) { var h = new Date(FV_HOJE); h.setHours(0, 0, 0, 0); return Math.round((d - h) / 864e5); }
function Fin_soma_(l, k) { return l.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); }

/* ---------- empresa ---------- */
/** Filtra pela empresa escolhida no topo (Todas = tudo). */
function Fin_daEmpresa_(lista) { return FV.emp === "TODAS" ? lista : lista.filter(function (x) { return x.emp === FV.emp; }); }
function Fin_emp_(id) { var c = String(id || "").toLowerCase(); return '<span class="fv-emp ' + c + '">' + Fin_esc_(FV_EMP_NOME[id] || id) + "</span>"; }

/** Seletor de empresa: segmentado no computador, lista no celular. A escolha fica no aparelho. */
function Fin_seletorEmpresa_() {
  var ops = ["TODAS", "MATRIZ", "FILIAL", "PRESTADORA"];
  return '<div class="fv-empresas" role="group" aria-label="Empresa">' + ops.map(function (o) {
    return '<button type="button" data-fv-emp="' + o + '" aria-pressed="' + (FV.emp === o) + '"><span class="fv-pt ' + o.toLowerCase() + '" aria-hidden="true"></span>' + (o === "TODAS" ? "Todas" : FV_EMP_NOME[o]) + "</button>";
  }).join("") + '</div><div class="fv-empresas-sel"><label class="sr-only" for="fvEmpSel">Empresa</label><select id="fvEmpSel">' + ops.map(function (o) {
    return '<option value="' + o + '"' + (FV.emp === o ? " selected" : "") + ">" + (o === "TODAS" ? "Empresa: todas (consolidado)" : "Empresa: " + FV_EMP_NOME[o]) + "</option>";
  }).join("") + "</select></div>";
}
function Fin_ligarSeletorEmpresa_(raiz, aoMudar) {
  var muda = function (v) { FV.emp = v; try { localStorage.setItem("fv_emp", v); } catch (e) {} aoMudar(v); };
  raiz.querySelectorAll("[data-fv-emp]").forEach(function (b) { b.onclick = function () { muda(b.getAttribute("data-fv-emp")); }; });
  var s = raiz.querySelector("#fvEmpSel"); if (s) s.onchange = function () { muda(s.value); };
}

/** Seletor de período (botões) — personalizado abre os dois campos de data. */
function Fin_seletorPeriodo_(atual, opcoes) {
  opcoes = opcoes || [["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["90", "90 dias"], ["outro", "Outro…"]];
  return '<div class="fv-periodo" role="group" aria-label="Período">' + opcoes.map(function (o) {
    return '<button type="button" data-fv-per="' + o[0] + '" aria-pressed="' + (atual === o[0]) + '">' + o[1] + "</button>";
  }).join("") + "</div>";
}

/** Barra fixa do módulo: empresa + período + "atualizado às". */
function Fin_barra_(opc) {
  opc = opc || {};
  return '<div class="fv-barra"><div class="fv-barra-esq">' + Fin_seletorEmpresa_() + (opc.periodo ? Fin_seletorPeriodo_(FV.periodo) : "") + "</div>" +
    '<div class="fv-barra-dir"><span class="fv-atualizado"><i class="fas fa-rotate" aria-hidden="true"></i>' + Fin_esc_(opc.atualizado || "Bancos às 10:30 · Omie às 10:41") + '</span><span class="fv-ficticio" title="Protótipo: nada aqui é real"><i class="fas fa-flask" aria-hidden="true"></i>Dados fictícios</span></div></div>';
}

/* ---------- cabeçalho de página (igual Comercial_cabecalho_) ---------- */
function Fin_cabecalho_(titulo, sub, botoes) {
  return '<div class="module-header"><div class="module-header-left"><h2 class="content-title">' + Fin_esc_(titulo) + '</h2><p class="content-subtitle fv-just">' + Fin_esc_(sub) + "</p></div>" +
    '<div class="module-header-right" style="display:flex;gap:8px;flex-wrap:wrap">' + (botoes || "") + "</div></div>";
}
function Fin_btn_(texto, icone, classe, attrs) { return '<button type="button" class="' + (classe || "btn-secondary") + '" ' + (attrs || "") + ">" + (icone ? '<i class="fas ' + icone + '" aria-hidden="true"></i>&nbsp;' : "") + Fin_esc_(texto) + "</button>"; }

/* ---------- cartão de indicador ---------- */
/**
 * Fin_kpi_({ rotulo, valor, detalhe, sit: ok|aviso|critico|neutro, trio: [[rot, val]...], ir: "pagina", icone })
 * O cartão é um botão: abre a lista que originou o número (regra da especificação, 8).
 * A situação nunca vem só pela cor: tem ícone e o texto do detalhe.
 */
function Fin_kpi_(k) {
  var ic = k.sit === "critico" ? "fa-circle-exclamation" : k.sit === "aviso" ? "fa-triangle-exclamation" : k.sit === "ok" ? "fa-circle-check" : "";
  return '<button type="button" class="fv-kpi ' + (k.sit || "") + '"' + (k.ir ? ' data-fv-ir="' + k.ir + '"' : "") + ">" +
    '<span class="r"><span>' + Fin_esc_(k.rotulo) + "</span>" + (ic ? '<i class="fas ' + ic + " ic-sit " + k.sit + '" aria-label="' + (k.sit === "critico" ? "crítico" : k.sit === "aviso" ? "atenção" : "em dia") + '"></i>' : "") + "</span>" +
    (k.valor != null ? '<span class="v">' + Fin_esc_(k.valor) + "</span>" : "") +
    (k.trio ? '<span class="fv-trio">' + k.trio.map(function (t) { return "<div><span>" + Fin_esc_(t[0]) + "</span><b>" + Fin_esc_(t[1]) + "</b></div>"; }).join("") + "</span>" : "") +
    (k.detalhe ? '<span class="d">' + k.detalhe + "</span>" : "") + "</button>";
}

/* ---------- selos ---------- */
function Fin_selo_(texto, cor) { return '<span class="cm-selo ' + (cor || "cinza") + '">' + Fin_esc_(texto) + "</span>"; }
var FV_COR_SIT = {
  "A vencer": "azul", "Vencido": "vermelho", "Recebido": "verde", "Pago": "verde", "Aprovado": "verde", "Aguardando aprovação": "laranja", "A enviar": "cinza", "Recusado": "vermelho",
  "Registrado": "azul", "Liquidado": "verde", "A emitir": "laranja", "Erro no banco": "vermelho", "Autorizada": "verde", "Cancelada": "cinza", "Com título": "verde", "Sem título": "laranja",
  "Enviada": "verde", "Não enviada": "laranja", "Falta guia": "vermelho", "Lançada": "azul", "Paga": "verde", "Aprovada · sai 09:00": "verde", "Crédito liberado": "verde", "OK": "verde", "A conferir": "laranja",
  "Concluída": "verde", "Concluída (já feita no banco)": "verde", "Chave conferida": "verde", "Linha digitável conferida": "verde", "Conta conferida": "verde", "Sem dados de pagamento": "vermelho", "Débito na conta": "cinza"
};
function Fin_seloSit_(t) { return Fin_selo_(t, FV_COR_SIT[t] || "cinza"); }

/** Estado do conector de um banco: ligado | falta | manual | erro | homolog */
function Fin_conector_(estado, extra) {
  var t = { ligado: "Ligado", falta: "Falta credencial", manual: "Sem API · arquivo OFX", erro: "Erro na última leitura", homolog: "Homologação" }[estado] || estado;
  return '<span class="fv-con ' + estado + '" title="' + Fin_esc_(extra || "") + '">' + Fin_esc_(t) + "</span>";
}

/* ---------- linha do tempo de aprovação/pagamento ---------- */
var FV_ETAPAS_PAG = [["Lançado", "Wanessa"], ["Dados conferidos", "automático"], ["Aprovação", "dono ou Charles"], ["Lote 09:00", "banco"], ["Pago e baixado", "Omie"]];
/** etapas: [[título, quem]], atual: índice da etapa em andamento, erro: índice com erro (opcional) */
function Fin_tempo_(etapas, atual, erro, notas) {
  return '<ol class="fv-tempo" aria-label="Andamento">' + etapas.map(function (e, i) {
    var c = erro === i ? "erro" : i < atual ? "feito" : i === atual ? "agora" : "";
    return '<li class="' + c + '">' + Fin_esc_(e[0]) + "<small>" + Fin_esc_((notas && notas[i]) || e[1]) + "</small></li>";
  }).join("") + "</ol>";
}

/* ---------- faixas, travas e estados ---------- */
function Fin_faixa_(tipo, html) { return '<div class="cm-faixa ' + (tipo || "") + '">' + html + "</div>"; }
/** Toda trava diz o quê, por quê e o que fazer (regra do dono "operador nunca no limbo"). */
function Fin_trava_(oque, porque, fazer, erro) {
  return '<div class="fv-trava' + (erro ? " erro" : "") + '" role="alert"><dl><dt>O que houve</dt><dd>' + oque + "</dd><dt>Por quê</dt><dd>" + porque + "</dd><dt>O que fazer</dt><dd>" + fazer + "</dd></dl></div>";
}
/** tipo: vazio | carregando | erro | credencial | permissao */
function Fin_estado_(tipo, titulo, texto, acoes) {
  if (tipo === "carregando") return '<div class="fv-esqueleto" aria-busy="true" aria-label="' + Fin_esc_(titulo || "Carregando") + '"><i style="width:40%"></i><i class="alto"></i><i></i><i style="width:75%"></i><i style="width:60%"></i></div>';
  var ic = { vazio: "fa-inbox", erro: "fa-plug-circle-xmark", credencial: "fa-key", permissao: "fa-lock" }[tipo] || "fa-circle-info";
  return '<div class="fv-estado ' + tipo + '" role="' + (tipo === "erro" ? "alert" : "status") + '"><span class="ic"><i class="fas ' + ic + '" aria-hidden="true"></i></span><h4>' + Fin_esc_(titulo) + "</h4><p>" + texto + "</p>" + (acoes ? '<div class="cm-acoes">' + acoes + "</div>" : "") + "</div>";
}

/* ---------- caixa com cabeçalho ---------- */
function Fin_caixa_(titulo, sub, corpo, link, classe) {
  return '<section class="fv-caixa ' + (classe || "") + '"><div class="fv-caixa-cab"><h3>' + Fin_esc_(titulo) + (sub ? '<span class="s">' + sub + "</span>" : "") + "</h3>" + (link ? '<button type="button" class="fv-link" data-fv-ir="' + link[1] + '">' + Fin_esc_(link[0]) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></button>' : "") + "</div>" + corpo + "</section>";
}

/* ---------- janela (igual Com_modal_, classes atv-* do legado) ---------- */
function Fin_modal_(titulo, corpo, rodape, largura) {
  var ov = document.createElement("div");
  ov.className = "atv-overlay";
  ov.innerHTML = '<div class="atv-modal" role="dialog" aria-modal="true" aria-label="' + Fin_esc_(titulo) + '" style="max-width:' + (largura || 640) + 'px"><div class="atv-modal-cab"><h3>' + Fin_esc_(titulo) + '</h3><button type="button" class="atv-fechar" aria-label="Fechar">&times;</button></div>' +
    '<div class="atv-modal-corpo">' + corpo + "</div>" + (rodape ? '<div class="atv-modal-rod empilha">' + rodape + "</div>" : "") + "</div>";
  ov.querySelector(".atv-fechar").onclick = function () { ov.remove(); };
  ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  var f = ov.querySelector("button, input, select"); if (f) f.focus();
  return ov;
}

/* ---------- tabela com filtro por coluna, agrupamento, totais e CSV ---------- */
/**
 * Fin_tabela_(alvo, cfg)
 * cfg.colunas: [{ k, t, n: true (número), fmt: fn(valor, linha) → HTML, soma: true, filtro: true (padrão), larg,
 *                 mob: "titulo" | "valor" | "oculto" (como a coluna aparece no cartão do celular) }]
 * cfg.linhas: array de objetos
 * cfg.grupos: [{ k, t }] opções de "Agrupar por"
 * cfg.selecao: true → caixa de seleção por linha e barra de lote (cfg.lote: fn(lista) → HTML)
 * cfg.acoes: fn(linha) → HTML dos botões da linha
 * cfg.csv: nome do arquivo
 * cfg.vazio: HTML do estado vazio
 * A tabela guarda filtros e ordem em cfg._st; redesenhar só o corpo (nunca o formulário em edição).
 */
function Fin_tabela_(alvo, cfg) {
  var st = cfg._st || (cfg._st = { ord: null, dir: 1, filtros: {}, grupo: "", busca: "", sel: {}, limite: cfg.porPagina || 25 });
  var cols = cfg.colunas;
  function texto(c, l) { var v = l[c.k]; return v instanceof Date ? Fin_data_(v) : String(v == null ? "" : v); }
  function filtradas() {
    var b = st.busca.toLowerCase();
    return cfg.linhas.filter(function (l) {
      if (b && !cols.some(function (c) { return texto(c, l).toLowerCase().indexOf(b) >= 0; })) return false;
      return cols.every(function (c) { var f = st.filtros[c.k]; return !f || texto(c, l).toLowerCase().indexOf(f.toLowerCase()) >= 0; });
    }).sort(function (a, b2) {
      if (!st.ord) return 0;
      var x = a[st.ord], y = b2[st.ord]; x = x instanceof Date ? +x : x; y = y instanceof Date ? +y : y;
      return (x > y ? 1 : x < y ? -1 : 0) * st.dir;
    });
  }
  function celula(c, l) {
    var v = l[c.k];
    var h = c.fmt ? c.fmt(v, l) : c.n ? '<span class="fv-num">' + Fin_esc_(Fin_moeda_(v)) + "</span>" : v instanceof Date ? Fin_esc_(Fin_data_(v)) : Fin_esc_(v);
    var cl = (c.n ? "n" : "") + (c.mob ? " m-" + c.mob : "");
    return "<td" + (cl ? ' class="' + cl + '"' : "") + ' data-r="' + Fin_esc_(c.t) + '">' + h + "</td>";
  }
  function corpo(lin) {
    var nc = cols.length + (cfg.selecao ? 1 : 0) + (cfg.acoes ? 1 : 0);
    if (!lin.length) return '<tr><td colspan="' + nc + '">' + (cfg.vazio || Fin_estado_("vazio", "Nada com estes filtros", "Limpe os filtros das colunas ou escolha outra empresa no topo.")) + "</td></tr>";
    var linha = function (l) {
      return "<tr>" + (cfg.selecao ? '<td class="m-sel" data-r="Selecionar"><input type="checkbox" aria-label="Selecionar ' + Fin_esc_(l.id || "") + '" data-fv-sel="' + Fin_esc_(l.id) + '"' + (st.sel[l.id] ? " checked" : "") + "></td>" : "") +
        cols.map(function (c) { return celula(c, l); }).join("") + (cfg.acoes ? '<td class="m-acoes" data-r="Ações"><div class="acoes">' + cfg.acoes(l) + "</div></td>" : "") + "</tr>";
    };
    if (!st.grupo) return lin.slice(0, st.limite).map(linha).join("") + (lin.length > st.limite ? '<tr><td colspan="' + nc + '" style="text-align:center"><button type="button" class="btn-secondary" data-fv-mais>Mostrar mais ' + Math.min(cfg.porPagina || 25, lin.length - st.limite) + ' de ' + (lin.length - st.limite) + ' restantes</button></td></tr>' : "");
    var grupos = {}, ordem = [];
    lin.forEach(function (l) { var g = texto({ k: st.grupo }, l) || "(sem)"; if (!grupos[g]) { grupos[g] = []; ordem.push(g); } grupos[g].push(l); });
    var somaCol = cols.filter(function (c) { return c.soma; })[0];
    return ordem.map(function (g) {
      return '<tr class="fv-grupo"><td colspan="' + nc + '">' + Fin_esc_(g) + " · " + grupos[g].length + (grupos[g].length === 1 ? " item" : " itens") + (somaCol ? " · " + Fin_moeda_(Fin_soma_(grupos[g], somaCol.k)) : "") + "</td></tr>" + grupos[g].map(linha).join("");
    }).join("");
  }
  function rodape(lin) {
    if (!cols.some(function (c) { return c.soma; })) return "";
    return "<tfoot><tr>" + (cfg.selecao ? "<td></td>" : "") + cols.map(function (c, i) {
      return c.soma ? '<td class="n" data-r="Total ' + Fin_esc_(c.t) + '"><span class="fv-num">' + Fin_moeda_(Fin_soma_(lin, c.k)) + "</span></td>" : i === 0 ? "<td>Total (" + lin.length + ")</td>" : "<td></td>";
    }).join("") + (cfg.acoes ? "<td></td>" : "") + "</tr></tfoot>";
  }
  function desenhar() {
    var lin = filtradas();
    alvo.querySelector("tbody").innerHTML = corpo(lin);
    var tf = alvo.querySelector("tfoot"); if (tf) tf.outerHTML = rodape(lin) || "<tfoot></tfoot>";
    alvo.querySelector(".fv-tab-cont").textContent = lin.length + " de " + cfg.linhas.length + (cfg.linhas.length === 1 ? " linha" : " linhas");
    var mais = alvo.querySelector("[data-fv-mais]"); if (mais) mais.onclick = function () { st.limite += cfg.porPagina || 25; desenhar(); };
    ligarSel(lin);
  }
  function ligarSel(lin) {
    if (!cfg.selecao) return;
    alvo.querySelectorAll("[data-fv-sel]").forEach(function (c) { c.onchange = function () { st.sel[c.getAttribute("data-fv-sel")] = c.checked; lote(); }; });
    lote();
  }
  function lote() {
    var box = alvo.querySelector(".fv-lote-box"); if (!box) return;
    var escolhidas = cfg.linhas.filter(function (l) { return st.sel[l.id]; });
    box.innerHTML = escolhidas.length && cfg.lote ? cfg.lote(escolhidas) : "";
  }
  alvo.innerHTML = '<div class="fv-tab-ferr"><div class="esq"><div><label for="' + cfg.id + 'Busca">Procurar</label><input type="search" id="' + cfg.id + 'Busca" placeholder="Nome, documento, valor…" value="' + Fin_esc_(st.busca) + '"></div>' +
    (cfg.grupos ? '<div><label for="' + cfg.id + 'Grupo">Agrupar por</label><select id="' + cfg.id + 'Grupo"><option value="">Sem agrupar</option>' + cfg.grupos.map(function (g) { return '<option value="' + g.k + '"' + (st.grupo === g.k ? " selected" : "") + ">" + Fin_esc_(g.t) + "</option>"; }).join("") + "</select></div>" : "") +
    (cfg.extraFiltros || "") + '</div><div class="dir">' + (cfg.csv ? '<button type="button" class="btn-secondary" data-fv-csv><i class="fas fa-file-csv" aria-hidden="true"></i>&nbsp;CSV</button>' : "") + (cfg.botoes || "") + "</div></div>" +
    '<div class="fv-tab-wrap"><table class="cm-tabela"><thead><tr>' + (cfg.selecao ? '<th style="width:34px"><span class="sr-only">Selecionar</span></th>' : "") +
    cols.map(function (c) { return "<th" + (c.n ? ' class="n"' : "") + (c.larg ? ' style="width:' + c.larg + '"' : "") + '><button type="button" class="ord" data-fv-ord="' + c.k + '">' + Fin_esc_(c.t) + ' <i class="fas fa-sort" aria-hidden="true" style="opacity:.35"></i></button></th>'; }).join("") +
    (cfg.acoes ? "<th>Ações</th>" : "") + '</tr><tr class="fv-filtro">' + (cfg.selecao ? "<th></th>" : "") +
    cols.map(function (c) { return "<th>" + (c.filtro === false ? "" : '<input type="text" aria-label="Filtrar ' + Fin_esc_(c.t) + '" data-fv-fil="' + c.k + '" placeholder="filtrar">') + "</th>"; }).join("") + (cfg.acoes ? "<th></th>" : "") +
    "</tr></thead><tbody></tbody><tfoot></tfoot></table></div>" +
    '<div class="fv-tab-rod"><span class="fv-tab-cont"></span><span>' + (cfg.rodape || "Toque no título da coluna para ordenar.") + '</span></div><div class="fv-lote-box"></div>';
  alvo.querySelector("#" + cfg.id + "Busca").oninput = function () { st.busca = this.value; desenhar(); };
  var g = alvo.querySelector("#" + cfg.id + "Grupo"); if (g) g.onchange = function () { st.grupo = this.value; desenhar(); };
  alvo.querySelectorAll("[data-fv-fil]").forEach(function (i) { i.oninput = function () { st.filtros[i.getAttribute("data-fv-fil")] = i.value; desenhar(); }; });
  alvo.querySelectorAll("[data-fv-ord]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-fv-ord"); st.dir = st.ord === k ? -st.dir : 1; st.ord = k; desenhar(); }; });
  var bc = alvo.querySelector("[data-fv-csv]"); if (bc) bc.onclick = function () { Fin_csv_(cfg.csv, cols, filtradas()); };
  desenhar();
}

/** CSV com ponto e vírgula e vírgula decimal (abre direto no Excel em português). */
function Fin_csv_(nome, cols, linhas) {
  var q = function (s) { s = String(s == null ? "" : s); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  var txt = "﻿" + cols.map(function (c) { return q(c.t); }).join(";") + "\n" + linhas.map(function (l) {
    return cols.map(function (c) { var v = l[c.k]; return q(v instanceof Date ? Fin_dataLonga_(v) : c.n ? Number(v).toFixed(2).replace(".", ",") : v); }).join(";");
  }).join("\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = nome + ".csv"; a.click();
}

/** Marca d'água: igual a JS_Financeiro_Marca (nome · login · data e hora · SIGILOSO). */
function Fin_marca_(texto) {
  var l = Math.max(440, Math.round(texto.length * 8.6) + 80), a = Math.round(l * 0.5) + 40, cx = Math.round(l / 2), cy = Math.round(a / 2);
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + l + "' height='" + a + "'><text x='" + cx + "' y='" + (cy + 5) + "' text-anchor='middle' transform='rotate(-24 " + cx + " " + cy + ")' font-family='Arial, sans-serif' font-size='15' font-weight='600' fill='#1f2937'>" + Fin_esc_(texto) + "</text></svg>";
  return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
}
