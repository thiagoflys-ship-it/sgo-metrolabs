ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Main.js'
PARES = [
("""    // ---- Atendimentos Auvo (só Gestor/Admin/Diretoria — dado operacional interno) ----
    const auvoResumo = isAdminPerfilAuth_(sessao.perfil) ? montarAuvoResumoDashboard_() : null;""",
 """    // ---- Atendimentos da Assistência (só Gestor/Admin/Diretoria — dado operacional interno) ----
    // 18/11/2026: Auvo descontinuado pelo dono; o bloco mostra só as O.S. do SGO+ (SGO_Assistencia_Fonte.js).
    const atendimentosResumo = isAdminPerfilAuth_(sessao.perfil) ? montarAtendimentosResumoDashboard_() : null;"""),
("""      auvoResumo: auvoResumo
    };""", """      atendimentosResumo: atendimentosResumo
    };"""),
("""// ---------------------------------------------------------------
// ATENDIMENTOS AUVO (AUVO_TAREFAS) — bloco do dashboard principal.
// Fica aqui (não em SGO_Auvo_*.js) porque é só leitura, específico do
// dashboard, e roda dentro de obterDashboardDetalhado — nada aqui
// escreve na planilha.
// ---------------------------------------------------------------
function montarAuvoResumoDashboard_() {""",
 """// ---------------------------------------------------------------
// ATENDIMENTOS DA ASSISTÊNCIA — bloco do dashboard principal.
// Só leitura, específico do dashboard, roda dentro de
// obterDashboardDetalhado — nada aqui escreve na planilha.
// 18/11/2026: Auvo descontinuado pelo dono; só as O.S. do SGO+ (a fonte
// única, sem origem, já devolve só o SGO+).
// ---------------------------------------------------------------
function montarAtendimentosResumoDashboard_() {"""),
("""  // 21/10/2026: fonte única de atendimentos (Auvo + O.S. da Assistência do SGO+, SGO_Assistencia_Fonte.js)
  var fonteUnica = typeof SGO_Atendimentos_linhas_ === "function";
  if (fonteUnica && typeof SGO_Atendimentos_existe_ === "function") existe = SGO_Atendimentos_existe_();
  else { try { SGO_DATA.getSheet(aba); existe = true; } catch (e) { existe = false; } }
  if (!existe) return null;

  var tarefas = fonteUnica ? SGO_Atendimentos_linhas_() : SGO_DATA.getAll(aba);""",
 """  var fonteUnica = typeof SGO_Atendimentos_linhas_ === "function";
  if (fonteUnica && typeof SGO_Atendimentos_existe_ === "function") existe = SGO_Atendimentos_existe_();
  if (!fonteUnica || !existe) return null;

  var tarefas = SGO_Atendimentos_linhas_({ origem: "SGO" });"""),
("""        finalizada: SGO_UTILS.safeUpper(t.FINALIZADA) === "SIM",
        auvoTaskId: t.AUVO_TASK_ID
      };""",
 """        finalizada: SGO_UTILS.safeUpper(t.FINALIZADA) === "SIM",
        numero: t.AUVO_TASK_ID
      };"""),
]
