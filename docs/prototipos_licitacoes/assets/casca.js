/* Casca do protótipo SGO+ Licitações (01/11/2026).
   Monta a mesma casca do Index.html real (barra superior, menu lateral agrupado, barra do topo do celular)
   em volta do conteúdo de cada página, com as MESMAS classes. No sistema real isso já existe: JS_Licitacoes.html
   só preenche #conteudo. Modo celular igual ao real: .app-shell.modo-mobile até 900 px de largura. */
(function () {
  var LIC_MENU = [
    { id: "hoje", url: "hoje.html", ic: "fa-gavel", nome: "Hoje em Licitações", badge: "3", mob: "Hoje" },
    { id: "oportunidades", url: "radar.html", ic: "fa-satellite-dish", nome: "Oportunidades", badge: "8", mob: "Oportunidades" },
    { id: "kanban", url: "kanban.html", ic: "fa-table-columns", nome: "Kanban", mob: "Kanban" },
    { id: "gantt", url: "gantt.html", ic: "fa-chart-gantt", nome: "Gantt", mob: "Gantt" },
    { id: "agenda", url: "agenda.html", ic: "fa-calendar-days", nome: "Agenda e prazos", mob: "Agenda" },
    { id: "disputas", url: "disputas.html", ic: "fa-arrow-trend-down", nome: "Disputas", mob: "Disputas" },
    { id: "habilitacao", url: "habilitacao.html", ic: "fa-file-shield", nome: "Habilitação e documentos", badge: "2", mob: "Habilitação" },
    { id: "precos", url: "tabela_precos.html", ic: "fa-tags", nome: "Tabela de preços", mob: "Preços" },
    { id: "config", url: "portais.html", ic: "fa-plug", nome: "Portais e configurações", mob: "Portais" }
  ];
  // grupos reais do menu (Index.html), fechados: só para a casca parecer a do sistema
  var GRUPOS = [
    ["qualificacao", "Qualificação e inspeção", 8], ["calibracao", "Calibração", 3], ["documentos", "Documentos técnicos", 3],
    ["planejamento", "Planejamento de serviços", 2], ["operacao", "Operação de campo", 2], ["comercial", "Comercial", 11]
  ];
  var GRUPOS_DEPOIS = [["compras", "Compras", 11], ["gestao", "Gestão", 4], ["cadastros", "Cadastros", 9], ["administracao", "Administração", 7]];

  function grupoFechado(g) {
    return '<div class="sidebar-section menu-grupo" data-grupo="' + g[0] + '"><button type="button" class="menu-grupo-cab" aria-expanded="false">' +
      '<span class="menu-grupo-nome">' + g[1] + '</span><span class="menu-grupo-qtd" aria-hidden="true">' + g[2] + '</span><i class="fas fa-chevron-down menu-grupo-seta" aria-hidden="true"></i></button>' +
      '<div class="menu-grupo-itens"></div></div>';
  }

  function montar() {
    var corpo = document.body;
    var tela = corpo.getAttribute("data-tela") || "";
    var titulo = corpo.getAttribute("data-titulo") || "Licitações";
    var conteudo = document.getElementById("licConteudo");
    var itensLic = LIC_MENU.map(function (m) {
      return '<a href="' + m.url + '" class="menu-btn' + (m.id === tela ? ' active' : '') + '" data-mod="licitacoes_' + m.id + '"' + (m.id === tela ? ' aria-current="page"' : '') +
        ' style="text-decoration:none"><span class="menu-btn-icon"><i class="fas ' + m.ic + '" aria-hidden="true"></i></span>' + m.nome +
        (m.badge ? '<span class="menu-badge is-visible" title="itens esperando ação">' + m.badge + '</span>' : '') + '</a>';
    }).join("");
    var app = document.createElement("div");
    app.id = "app"; app.className = "app-shell";
    app.innerHTML =
      '<header id="topo" class="topbar"><div class="topbar-left"><a class="topbar-logo-block" href="index.html" style="text-decoration:none"><div class="topbar-brand">' +
      '<div class="topbar-title">SGO<span class="topbar-title-plus">+</span></div><div class="topbar-subtitle">Metrolabs · Painel Operacional</div></div></a></div>' +
      '<div class="topbar-center"><button type="button" class="busca-gatilho" title="Busca rápida (Ctrl K)"><i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
      '<span class="busca-gatilho-texto">Buscar TAG, cliente, certificado ou tela</span><kbd class="busca-gatilho-tecla">Ctrl K</kbd></button></div>' +
      '<div class="topbar-right"><div class="topbar-info-block"><div class="relogio-texto">01/11/2026, 21:00:00</div></div><div class="user-action-block">' +
      '<div class="user-info">Charles · Diretoria</div><button type="button" class="btn-logout btn-trocar-senha"><i class="fas fa-key" aria-hidden="true"></i> Trocar senha</button>' +
      '<button type="button" class="btn-logout">Sair</button></div></div></header>' +
      '<div class="main-layout"><aside id="menu" class="sidebar" aria-label="Menu principal">' +
      '<div class="sidebar-section menu-grupo is-aberto" data-grupo="principal"><div class="menu-grupo-itens">' +
      '<button type="button" class="menu-btn"><span class="menu-btn-icon"><i class="fas fa-house" aria-hidden="true"></i></span>Início</button>' +
      '<button type="button" class="menu-btn"><span class="menu-btn-icon"><i class="fas fa-list-check" aria-hidden="true"></i></span>Minhas atividades</button>' +
      '<button type="button" class="menu-btn"><span class="menu-btn-icon"><i class="fas fa-bullhorn" aria-hidden="true"></i></span>Avisos</button></div></div>' +
      GRUPOS.map(grupoFechado).join("") +
      '<div class="sidebar-section menu-grupo is-aberto" data-grupo="licitacoes" id="menu-secao-licitacoes"><button type="button" class="menu-grupo-cab" aria-expanded="true">' +
      '<span class="menu-grupo-nome">Licitações</span><span class="menu-grupo-qtd" aria-hidden="true">9</span><i class="fas fa-chevron-down menu-grupo-seta" aria-hidden="true"></i></button>' +
      '<div class="menu-grupo-itens">' + itensLic + '</div></div>' +
      GRUPOS_DEPOIS.map(grupoFechado).join("") +
      '</aside><main class="content-area"><section id="conteudo" class="content-panel"></section></main></div>' +
      '<div class="mobile-topbar"><a href="' + (corpo.getAttribute("data-voltar") || "hoje.html") + '" class="mobile-topbar-btn mobile-topbar-voltar" aria-label="Voltar" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px"><i class="fas fa-arrow-left" aria-hidden="true"></i><span>Voltar</span></a>' +
      '<div class="mobile-topbar-titulo">' + titulo + '</div>' +
      '<button type="button" class="mobile-topbar-btn mobile-topbar-busca" aria-label="Buscar"><i class="fas fa-magnifying-glass" aria-hidden="true"></i></button>' +
      '<button type="button" class="mobile-topbar-btn mobile-topbar-ajuda" aria-label="Como usar esta tela"><i class="fas fa-circle-question" aria-hidden="true"></i><span>Ajuda</span></button>' +
      '<div class="mobile-conta"><button type="button" class="mobile-topbar-btn mobile-topbar-conta" aria-label="Conta"><i class="fas fa-ellipsis-vertical" aria-hidden="true"></i><span>Conta</span></button></div></div>' +
      '<div class="lic-redondos" aria-hidden="true"><span><i class="fas fa-comments"></i></span><span><i class="fas fa-circle-question"></i></span></div>';
    corpo.insertBefore(app, corpo.firstChild);
    var alvo = document.getElementById("conteudo");
    if (corpo.getAttribute("data-navmob") !== "0") {
      var nav = document.createElement("nav");
      nav.className = "cm-nav-mob lic-nav-mob"; nav.setAttribute("aria-label", "Telas de Licitações");
      nav.innerHTML = LIC_MENU.map(function (m) { return '<a href="' + m.url + '" class="cm-nav-mob-btn' + (m.id === tela ? ' ativo' : '') + '" style="display:inline-flex;align-items:center;text-decoration:none">' + m.mob + '</a>'; }).join("");
      alvo.appendChild(nav);
    }
    if (conteudo) alvo.appendChild(conteudo);
    var rod = document.querySelector(".lic-rodape");
    if (rod) { app.appendChild(rod); app.classList.add("tem-rodape"); }
    ajustarModo();
    window.addEventListener("resize", ajustarModo);
  }

  function ajustarModo() {
    var app = document.getElementById("app"); if (!app) return;
    var movel = window.innerWidth <= 900;
    app.classList.toggle("modo-mobile", movel);
    document.querySelectorAll(".lic-nav-mob").forEach(function (n) { n.style.display = movel ? "" : "none"; });
  }

  // ---------- janela (mesmas classes do sistema: atv-overlay / atv-modal) ----------
  var ultimoFoco = null;
  window.Lic = {
    modal: function (titulo, corpoHtml, rodapeHtml) {
      Lic.fechar();
      ultimoFoco = document.activeElement;
      var ov = document.createElement("div");
      ov.className = "atv-overlay"; ov.id = "licOverlay";
      ov.innerHTML = '<div class="atv-modal" role="dialog" aria-modal="true" aria-labelledby="licModalTit"><div class="atv-modal-cab"><h3 id="licModalTit">' + titulo + '</h3>' +
        '<button type="button" class="atv-fechar" aria-label="Fechar" onclick="Lic.fechar()">&times;</button></div><div class="atv-modal-corpo">' + corpoHtml + '</div>' +
        '<div class="atv-modal-rod empilha">' + (rodapeHtml || '<button type="button" class="btn-secondary" onclick="Lic.fechar()">Fechar</button>') + '</div></div>';
      ov.addEventListener("click", function (e) { if (e.target === ov) Lic.fechar(); });
      document.body.appendChild(ov);
      var f = ov.querySelector("textarea, select, input, .atv-modal-rod button"); if (f) f.focus();
    },
    fechar: function () { var o = document.getElementById("licOverlay"); if (o) o.remove(); if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} } },
    toast: function (msg, tipo) {
      var t = document.createElement("div"); t.className = "lic-toast " + (tipo || "ok"); t.setAttribute("role", tipo === "erro" ? "alert" : "status"); t.textContent = msg;
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800);
    },
    brl: function (v) { return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    pct: function (v) { return Number(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; },
    param: function (n) { try { return new URLSearchParams(location.search).get(n) || ""; } catch (e) { return ""; } }
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") Lic.fechar(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
