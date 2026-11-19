ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Core.html'
PARES = [
("""          iniciarMonitorOciosidade_();
          iniciarPollingAuvo_();
          iniciarPollingFrota_();""",
 """          iniciarMonitorOciosidade_();
          iniciarPollingFrota_();"""),
("""        iniciarMonitorOciosidade_();
        iniciarPollingAuvo_();
        iniciarPollingFrota_();""",
 """        iniciarMonitorOciosidade_();
        iniciarPollingFrota_();"""),
("  // Continuam fora: documentos técnicos, arquivo de documentos, inventário, Comercial (valores de venda), Integração Auvo,",
 "  // Continuam fora: documentos técnicos, arquivo de documentos, inventário, Comercial (valores de venda), Histórico do Auvo,"),
("""    // Mesma regra para Integração Auvo e Painel de qualidade (Auvo_exigirAdmin_ / Qualidade_exigirGestor_
    // usam isAdminPerfilAuth_: ADMIN, DIRETORIA, GESTOR).
    const perfilMenu = String(USER_CONTEXT.perfil || "").toUpperCase();
    const ehGestaoMenu = (perfilMenu === "ADMIN" || perfilMenu === "GESTOR" || perfilMenu === "DIRETORIA");
    ['#menu .menu-btn[data-mod="auvo"]', '#menu .menu-btn[data-mod="qualidade"]'].forEach(function (sel) {
      const el = document.querySelector(sel);
      if (el) el.style.display = ehGestaoMenu ? "" : "none";
    });""",
 """    // Mesma regra para o Painel de qualidade (Qualidade_exigirGestor_ usa isAdminPerfilAuth_: ADMIN, DIRETORIA, GESTOR).
    // 18/11/2026: Auvo descontinuado pelo dono; "Integração Auvo" saiu. O "Histórico do Auvo" (somente consulta) é só do
    // Administrador e da Diretoria (AuvoAcervo_perfilPode_ no servidor).
    const perfilMenu = String(USER_CONTEXT.perfil || "").toUpperCase();
    const ehGestaoMenu = (perfilMenu === "ADMIN" || perfilMenu === "GESTOR" || perfilMenu === "DIRETORIA");
    const btnQualidade = document.querySelector('#menu .menu-btn[data-mod="qualidade"]');
    if (btnQualidade) btnQualidade.style.display = ehGestaoMenu ? "" : "none";
    const btnHistAuvo = document.querySelector('#menu .menu-btn[data-mod="auvo_historico"]');
    if (btnHistAuvo) btnHistAuvo.style.display = (perfilMenu === "ADMIN" || perfilMenu === "DIRETORIA") ? "" : "none";"""),
("    // (Auvo, Qualidade, Conduta e NR-13 deixavam \"Início\" aceso). Atalhos (Padrões, Usuários, Vínculos)",
 "    // (Qualidade, Conduta e NR-13 deixavam \"Início\" aceso). Atalhos (Padrões, Usuários, Vínculos)"),
("""    if (mod === "auvo") {
      renderMotorModulo_("Integração Auvo", "auvo");
      return;
    }""",
 """    // 18/11/2026: Auvo descontinuado pelo dono. Link antigo para "auvo" (aviso, item de caixa guardado) cai no histórico,
    // que explica a retirada para quem não é Administrador nem Diretoria (JS_Auvo.html).
    if (mod === "auvo" || mod === "auvo_historico") {
      renderMotorModulo_("Histórico do Auvo", "auvo_historico");
      return;
    }"""),
("""                <div class="dashc-stat-label">Atendimentos abertos (Auvo)</div>""",
 """                <div class="dashc-stat-label">Atendimentos abertos</div>"""),
("""              <a class="dashc-vermais" onclick="abrir('auvo')">Ver todos</a>""",
 """              <a class="dashc-vermais" onclick="abrir('assistencia_os')">Ver todos</a>"""),
("""    // ---- Atendimentos Auvo (só aparece se o backend liberou pro perfil) ----
    preencherAuvoResumoDashboard_(res.auvoResumo);""",
 """    // ---- Atendimentos da Assistência (só aparece se o backend liberou pro perfil; só O.S. do SGO+ desde 18/11/2026) ----
    preencherAtendimentosResumoDashboard_(res.atendimentosResumo);"""),
("""  function preencherAuvoResumoDashboard_(auvo) {""", """  function preencherAtendimentosResumoDashboard_(auvo) {"""),
("""            const clickable = a.auvoTaskId ? ' style="cursor:pointer" onclick="Auvo_abrirModalOS_(\\'' + String(a.auvoTaskId).replace(/'/g, "") + '\\')" title="Ver O.S. completa"' : "";
            return "<tr" + clickable + "><td>""",
 """            return "<tr><td>"""),
("""    // barras: atendimentos por técnico (Auvo)
    const elTecnicos = document.getElementById("dashcGraficoTecnicos");
    if (elTecnicos && res.auvoResumo) {
      if (DASHC_TECNICOS) { DASHC_TECNICOS.destroy(); DASHC_TECNICOS = null; }
      const ranking = res.auvoResumo.rankingTecnicos || [];""",
 """    // barras: atendimentos por técnico (O.S. da Assistência do SGO+)
    const elTecnicos = document.getElementById("dashcGraficoTecnicos");
    if (elTecnicos && res.atendimentosResumo) {
      if (DASHC_TECNICOS) { DASHC_TECNICOS.destroy(); DASHC_TECNICOS = null; }
      const ranking = res.atendimentosResumo.rankingTecnicos || [];"""),
("""      auvo: "Integração Auvo",
      planejamento_cme""", """      auvo_historico: "Histórico do Auvo",
      planejamento_cme"""),
('__RE__', r"  // ==========================================\n  // NOTIFICAÇÃO DE ATENDIMENTO \(Auvo\).*?\n  function verificarEventosAuvo_\(\) \{.*?\n  }\n\n",
 r"", 1),
('__RE__', r"  function exibirToastAuvo_\(evento\) \{.*?\n  }\n\n  function tocarNotificacaoAuvo_\(\) \{.*?\n  }\n\n",
 r"", 1),
("""  // FROTA — polling de retirada/devolução de veículo (toast/som), mesmo
  // padrão do Auvo acima (2026-08-28, pedido do usuário: "quero acompanhar
  // o uso e devolução do carro" igual já fazemos pra O.S. do Auvo).""",
 """  // FROTA — polling de retirada/devolução de veículo (toast/som)
  // (2026-08-28, pedido do usuário: "quero acompanhar o uso e devolução do carro")."""),
("    // Mesmo motivo do iniciarPollingAuvo_ — desligado no celular pra todo mundo.",
 "    // Monitoramento proativo é recurso do computador: desligado no celular pra todo mundo."),
("""  // botão de bônus "Abrir no Auvo" (taskUrl, o próprio Auvo já manda
  // pronto). Compartilhado entre dashboard e ficha de Equipamento.""",
 """  // pronto). Usado no histórico da ficha do Equipamento (tarefas antigas do
  // Auvo, somente consulta desde 18/11/2026: sem link para o Auvo)."""),
("""          (os.taskUrl ? '<a href="' + escapeHtml_(os.taskUrl) + '" target="_blank" rel="noopener" class="btn-secondary">Abrir no Auvo</a>' : '') +
""", ""),
("""    auvo: "fa-screwdriver-wrench", atividades: "fa-list-check",""", """    atividades: "fa-list-check","""),
("""    } else if (tipoMotor === "auvo") {
      urlTemplate = "";
      urlRelatorio = MOTORES.AUVO || "";""",
 """    } else if (tipoMotor === "auvo_historico") {
      urlTemplate = "";
      urlRelatorio = MOTORES.AUVO || "";"""),
("""    // INTEGRAÇÃO AUVO — mesmo padrão nativo dos demais módulos. Ver
    // JS_Auvo.html / SGO_Auvo_*.js. Acesso restrito a Gestor/Admin (o
    // próprio servidor recusa as chamadas pra quem não for).
    if (tipoMotor === "auvo") {""",
 """    // HISTÓRICO DO AUVO (18/11/2026: Auvo descontinuado pelo dono) — somente consulta, só Administrador e Diretoria.
    // Ver JS_Auvo.html / SGO_AuvoAcervo*.js (o próprio servidor recusa as chamadas pra quem não for).
    if (tipoMotor === "auvo_historico") {"""),
("""              <p class="content-subtitle">Sincronização de clientes, técnicos e tarefas com o Auvo.</p>""",
 """              <p class="content-subtitle">Sistema descontinuado em 18/11/2026 — somente consulta.</p>"""),
("""              <p class="content-subtitle">Avaliação de técnico/condutor, veículo mais usado, documentação e pendências — Auvo e Frota.</p>""",
 """              <p class="content-subtitle">Avaliação de técnico/condutor, veículo mais usado, documentação e pendências — Assistência técnica e Frota.</p>"""),
]
