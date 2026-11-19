/* =====================================================================
   Casca do protótipo: menu, rotas (#pagina?papel=&emp=&aba=&janela=),
   modo celular (igual .app-shell.modo-mobile do legado) e marca d'água.
   No legado isso é abrir(mod) + JS_Core; aqui é só para navegar.
   ===================================================================== */
var FV_PAGINAS = [
  // [chave, título, ícone, grupo, função]
  ["painel", "Painel financeiro", "fa-chart-line", "dia", FinPainel_render_],
  ["aprovacoes", "Aprovações", "fa-check-double", "dia", FinPag_aprovacoes_],
  ["receber", "Contas a receber", "fa-hand-holding-dollar", "dia", FinPag_receber_],
  ["pagar", "Contas a pagar", "fa-money-bill-transfer", "dia", FinPag_pagar_],
  ["conciliacao", "Conciliação", "fa-scale-balanced", "dia", FinPag_conciliacao_],
  ["cobranca", "Cobrança (Pix e boleto)", "fa-barcode", "dia", FinPag_cobranca_],
  ["bancos", "Bancos e saldos", "fa-building-columns", "bancos", FinPag_bancos_],
  ["transferencias", "Transferências", "fa-right-left", "bancos", FinPag_transferencias_],
  ["notas", "Notas fiscais", "fa-file-invoice", "bancos", FinPag_notas_],
  ["cadastros", "Fornecedores e clientes", "fa-address-book", "bancos", FinPag_cadastros_],
  ["impostos", "Impostos e guias", "fa-landmark", "bancos", FinPag_impostos_],
  ["caju", "Caju", "fa-credit-card", "bancos", FinPag_caju_],
  ["orcamento", "Orçamento", "fa-bullseye", "gestao", FinPag_orcamento_],
  ["fechamento", "Fechamento do mês", "fa-lock", "gestao", FinPag_fechamento_],
  ["relatorios", "Relatórios", "fa-file-lines", "gestao", FinPag_relatorios_],
  ["empresas", "Empresas e bancos", "fa-sliders", "gestao", FinPag_empresas_],
  ["trilha", "Trilha", "fa-clock-rotate-left", "gestao", FinPag_trilha_],
  ["componentes", "Componentes e estados", "fa-shapes", "prot", FinPag_componentes_],
  ["sem-acesso", "Sem acesso (exemplo)", "fa-lock", "prot", FinPag_semAcesso_]
];
var FV_GRUPOS = [["dia", "Financeiro · dia a dia"], ["bancos", "Financeiro · bancos e documentos"], ["gestao", "Financeiro · gestão"], ["prot", "Protótipo"]];
var FV_CURTO = { painel: "Painel", aprovacoes: "Aprovações", receber: "Receber", pagar: "Pagar", conciliacao: "Conciliação", cobranca: "Cobrança", bancos: "Bancos", transferencias: "Transferir", notas: "Notas", cadastros: "Cadastros", impostos: "Impostos", caju: "Caju", orcamento: "Orçamento", fechamento: "Fechamento", relatorios: "Relatórios", empresas: "Empresas", trilha: "Trilha" };

function FvApp_menu_() {
  var outros = [["principal", "", [["fa-house", "Início"], ["fa-list-check", "Minhas atividades"], ["fa-bullhorn", "Avisos"]]], ["comercial", "Comercial", []], ["compras", "Compras e peças", []], ["operacao", "Operação de campo", []]];
  var h = outros.map(function (g) {
    return '<div class="sidebar-section menu-grupo' + (g[0] === "principal" ? " is-aberto" : "") + '" data-grupo="' + g[0] + '"><button type="button" class="menu-grupo-cab" aria-expanded="false"><span class="menu-grupo-nome">' + g[1] + '</span><span class="menu-grupo-qtd" aria-hidden="true">' + (g[2].length || 6) + '</span><i class="fas fa-chevron-down menu-grupo-seta" aria-hidden="true"></i></button><div class="menu-grupo-itens">' +
      g[2].map(function (b) { return '<button type="button" class="menu-btn" disabled style="opacity:.75"><span class="menu-btn-icon"><i class="fas ' + b[0] + '" aria-hidden="true"></i></span>' + b[1] + "</button>"; }).join("") + "</div></div>";
  }).join("");
  h += FV_GRUPOS.map(function (g) {
    var itens = FV_PAGINAS.filter(function (p) { return p[3] === g[0]; });
    return '<div class="sidebar-section menu-grupo is-aberto" data-grupo="fin-' + g[0] + '"><button type="button" class="menu-grupo-cab" aria-expanded="true"><span class="menu-grupo-nome">' + g[1] + '</span><span class="menu-grupo-qtd" aria-hidden="true"></span><i class="fas fa-chevron-down menu-grupo-seta" aria-hidden="true"></i></button><div class="menu-grupo-itens">' +
      itens.map(function (p) { return '<button type="button" class="menu-btn" data-fv-ir="' + p[0] + '"><span class="menu-btn-icon"><i class="fas ' + p[2] + '" aria-hidden="true"></i></span>' + p[1] + (p[0] === "aprovacoes" ? '<span class="menu-badge" style="display:inline-flex">8</span>' : p[0] === "conciliacao" ? '<span class="menu-badge" style="display:inline-flex">25</span>' : "") + "</button>"; }).join("") + "</div></div>";
  }).join("");
  return h;
}

function FvApp_lerHash_() {
  var h = (location.hash || "#painel").slice(1).split("?"), q = {};
  (h[1] || "").split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) q[kv[0]] = decodeURIComponent(kv[1] || ""); });
  return { pagina: h[0] || "painel", q: q };
}

function FvApp_render_() {
  var r = FvApp_lerHash_(), pag = FV_PAGINAS.filter(function (p) { return p[0] === r.pagina; })[0] || FV_PAGINAS[0];
  if (r.q.papel) FV.papel = r.q.papel;
  if (r.q.emp) FV.emp = r.q.emp;
  FV.abaPainel = r.q.aba || null;
  FV.pagina = pag[0];
  var app = Fin_$_("app"), mob = window.innerWidth <= 760;
  app.classList.toggle("modo-mobile", mob);
  document.querySelectorAll(".menu-btn[data-fv-ir]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-fv-ir") === pag[0]); });
  Fin_$_("mobileTopbarTitulo").textContent = pag[1];
  Fin_$_("userInfo").innerHTML = "<b>" + FV_PAPEL_NOME[FV.papel] + "</b> · Financeiro";
  Fin_$_("fvPapel").value = FV.papel;
  var conteudo = Fin_$_("conteudo"), alvo = conteudo;
  if (mob && pag[3] !== "prot") {
    conteudo.innerHTML = '<nav class="cm-nav-mob fv-nav-mob" aria-label="Seções do Financeiro">' + FV_PAGINAS.filter(function (p) { return p[3] !== "prot"; }).map(function (p) {
      return '<button type="button" class="cm-nav-mob-btn' + (p[0] === pag[0] ? " ativo" : "") + '" data-fv-ir="' + p[0] + '"' + (p[0] === pag[0] ? ' aria-current="page"' : "") + ">" + FV_CURTO[p[0]] + "</button>";
    }).join("") + '</nav><div id="fvCorpoMob"></div>';
    alvo = Fin_$_("fvCorpoMob");
    var at = conteudo.querySelector(".cm-nav-mob-btn.ativo"), barra = at && at.parentNode;
    if (barra) { var nb = barra.getBoundingClientRect(), ab = at.getBoundingClientRect(); barra.scrollLeft += (ab.left - nb.left) - (nb.width - ab.width) / 2; }
  }
  pag[4](alvo);
  Fin_ligarSeletorEmpresa_(alvo, function () { FvApp_render_(); });
  if (r.q.janela === "confirmar") FinJanela_confirmarPagamento_();
  if (r.q.janela === "nova-pagar") FinJanela_novaPagar_();
  var nomes = { DONO: "Dono · admin", CHARLES: "Charles · charles", WANESSA: "Wanessa · wanessa" };
  Fin_$_("fvMarca").style.backgroundImage = Fin_marca_(nomes[FV.papel] + " · 19/11/2026 10:42 · SIGILOSO · PROTÓTIPO FICTÍCIO");
  document.title = pag[1] + " · Financeiro · SGO+ (protótipo)";
}

document.addEventListener("click", function (e) {
  var ir = e.target.closest("[data-fv-ir]");
  if (ir) { e.preventDefault(); var q = FvApp_lerHash_().q; delete q.janela; delete q.aba; var qs = Object.keys(q).map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&"); location.hash = ir.getAttribute("data-fv-ir") + (qs ? "?" + qs : ""); window.scrollTo(0, 0); return; }
  var ac = e.target.closest("[data-fv-acao]");
  if (ac) { var a = ac.getAttribute("data-fv-acao"); if (a === "aprovar-lote" || a === "aprovar-um") FinJanela_confirmarPagamento_(); if (a === "nova-pagar") FinJanela_novaPagar_(); }
});
window.addEventListener("hashchange", FvApp_render_);
var FV_LARG = window.innerWidth;
window.addEventListener("resize", function () { if ((window.innerWidth <= 760) !== (FV_LARG <= 760)) { FV_LARG = window.innerWidth; FvApp_render_(); } });
document.addEventListener("DOMContentLoaded", function () {
  Fin_$_("menu").innerHTML = FvApp_menu_();
  Fin_$_("fvPapel").onchange = function () { var r = FvApp_lerHash_(); r.q.papel = this.value; delete r.q.aba; location.hash = r.pagina + "?" + Object.keys(r.q).map(function (k) { return k + "=" + encodeURIComponent(r.q[k]); }).join("&"); };
  FvApp_render_();
});
