function include(file) {
  try {
    return HtmlService.createHtmlOutputFromFile(file).getContent();
  } catch (err) {
    throw new Error("Falha ao incluir arquivo HTML: " + file + " | " + err.message);
  }
}

function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile("Index");

    return template
      .evaluate()
      .setTitle(SGO_CFG.APP_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // <- Inserido para garantir responsividade em smartphones
  } catch (err) {
    return HtmlService
      .createHtmlOutput(
        '<h2>Erro ao carregar o sistema</h2>' +
        '<p>' + String(err && err.message ? err.message : err) + '</p>'
      )
      .setTitle("Erro - METROLABS SGO+");
  }
}

/**
 * Funções de rotina (gatilho de tempo, editor) que não recebem sessão ficam
 * visíveis para o navegador porque o nome não termina em "_". Esta conferência
 * recusa a chamada vinda da internet: no gatilho e no editor há usuário ativo
 * (o dono / o e-mail do sistema); no navegador, não (getActiveUser vazio).
 */
function SGO_execucaoInterna_() {
  try { return !!String(Session.getActiveUser().getEmail() || "").trim(); } catch (e) { return false; }
}

function getPublicConfig() {
  return {
    appName: SGO_CFG.APP_NAME,
    version: SGO_CFG.VERSION,
    logo: SGO_CFG.LOGO_URL,
    motores: SGO_CFG.MOTORES || {},
    idleSecondsDefault: (SGO_CFG.OCIOSIDADE && SGO_CFG.OCIOSIDADE.TEMPO_LIMITE_SEGUNDOS) || 300,
    idleSoundDefault: (SGO_CFG.OCIOSIDADE && SGO_CFG.OCIOSIDADE.SOM_ATIVO_PADRAO) !== false,
    mensagensMotivacionais: (SGO_CFG.MENSAGENS_MOTIVACIONAIS || []).slice(),
    profiles: SGO_CFG.PROFILES || [],
    sistema: SGO_CFG.SISTEMA || {},
    status: SGO_CFG.STATUS || {} // <- Adicionado para o frontend conhecer os status (PENDENTE, BLOQUEADO, etc)
  };
}

/* =========================================================================
   DASHBOARD DETALHADO (tema Consultório) - listas, séries e contagens
   para os widgets: clientes recentes, rosca de equipamentos, barras de
   documentos por mês, documentos a vencer e últimos documentos.
   ========================================================================= */
function obterDashboardDetalhado(sessionId) {
  try {
    const sessao = exigirSessao(sessionId);
    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const idClienteReal = SGO_UTILS.safe(sessao.clienteId);

    if (isCliente && !idClienteReal) {
      return { success: true, vazio: true };
    }

    const ATIVO = SGO_CFG.STATUS.ATIVO;
    let clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES)
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === ATIVO);
    let unidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES)
      .filter(u => SGO_UTILS.safeUpper(u.STATUS) === ATIVO);
    let equipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)
      .filter(e => SGO_UTILS.safeUpper(e.STATUS) === ATIVO);
    let documentos = SGO_DATA.getAll(SGO_CFG.SHEETS.DOC_DOCUMENTOS)
      .filter(d => SGO_UTILS.safeUpper(d.STATUS) === ATIVO);

    // Trava do Portal do Cliente (isolamento de dados)
    if (isCliente) {
      clientes = clientes.filter(c => SGO_UTILS.safe(c.ID) === idClienteReal);
      unidades = unidades.filter(u => SGO_UTILS.safe(u.CLIENTE_ID) === idClienteReal);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === idClienteReal);
      documentos = documentos.filter(d => SGO_UTILS.safe(d.CLIENTE_ID) === idClienteReal);
    }

    const parseData_ = function (v) {
      if (!v) return null;
      if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
      const s = String(v).trim();
      // "aaaa-mm-dd" e "dd/mm/aaaa" como dia local (new Date("aaaa-mm-dd") é UTC
      // e "dd/mm/aaaa" nem é lido — esses vencimentos sumiam do painel).
      let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      const d = new Date(s);
      return (d && !isNaN(d.getTime())) ? d : null;
    };

    // ---- Clientes recentes (5 últimos) ----
    const clientesRecentes = clientes
      .slice()
      .sort(function (a, b) {
        return (parseData_(b.CRIADO_EM) || 0) - (parseData_(a.CRIADO_EM) || 0);
      })
      .slice(0, 5)
      .map(function (c) {
        return {
          nome: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL) || "(sem nome)",
          criadoEm: SGO_UTILS.safe(c.CRIADO_EM)
        };
      });

    // ---- Equipamentos por tipo (rosca; top 5 + Outros) ----
    const porTipoMap = {};
    equipamentos.forEach(function (e) {
      const t = SGO_UTILS.safe(e.TIPO) || "Não informado";
      porTipoMap[t] = (porTipoMap[t] || 0) + 1;
    });
    const tiposOrdenados = Object.keys(porTipoMap)
      .map(function (k) { return { tipo: k, qtd: porTipoMap[k] }; })
      .sort(function (a, b) { return b.qtd - a.qtd; });
    const equipamentosPorTipo = tiposOrdenados.slice(0, 5);
    const outros = tiposOrdenados.slice(5).reduce(function (s, x) { return s + x.qtd; }, 0);
    if (outros > 0) equipamentosPorTipo.push({ tipo: "Outros", qtd: outros });

    // ---- Documentos por mês (últimos 12 meses) ----
    const agora = new Date();
    const meses = [];
    const chaves = {};
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const chave = ref.getFullYear() + "-" + ("0" + (ref.getMonth() + 1)).slice(-2);
      chaves[chave] = meses.length;
      meses.push({
        rotulo: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][ref.getMonth()],
        qtd: 0
      });
    }
    documentos.forEach(function (d) {
      const dt = parseData_(d.CRIADO_EM) || parseData_(d.DATA_EMISSAO);
      if (!dt) return;
      const chave = dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2);
      if (chave in chaves) meses[chaves[chave]].qtd++;
    });

    // ---- Documentos a vencer (vencidos ou nos próximos 60 dias) ----
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const limite = new Date(hoje.getTime() + 60 * 24 * 3600 * 1000);
    // mesma regra da central de pendências: por equipamento e tipo vale o vencimento mais recente (renovado substitui)
    const ultimoPorChave = {};
    documentos.forEach(function (d) {
      if (SGO_UTILS.safeUpper(d.STATUS || "ATIVO") !== "ATIVO") return;
      const venc = parseData_(d.DATA_VENCIMENTO);
      if (!venc) return;
      const eq = SGO_UTILS.safe(d.EQUIPAMENTO_ID);
      const tipo = SGO_UTILS.safe(d.TIPO_DOCUMENTO).replace(/^\d+\.\s*/, "").toLowerCase().replace(/\s+/g, " ");
      const chave = eq ? eq + "|" + tipo : "ID:" + SGO_UTILS.safe(d.ID);
      if (!ultimoPorChave[chave] || venc > ultimoPorChave[chave].venc) ultimoPorChave[chave] = { doc: d, venc: venc };
    });
    const docsAVencer = Object.keys(ultimoPorChave)
      .map(function (k) { return ultimoPorChave[k]; })
      .filter(function (x) { return x && x.venc <= limite; })
      .sort(function (a, b) { return a.venc - b.venc; })
      .slice(0, 6)
      .map(function (x) {
        const dias = Math.round((x.venc - hoje) / (24 * 3600 * 1000));
        return {
          data: Utilities.formatDate(x.venc, "America/Sao_Paulo", "dd/MM"),
          descricao: (SGO_UTILS.safe(x.doc.TIPO_DOCUMENTO) || "Documento") +
            (SGO_UTILS.safe(x.doc.NOME_ARQUIVO) ? " — " + SGO_UTILS.safe(x.doc.NOME_ARQUIVO) : ""),
          dias: dias,
          vencido: dias < 0
        };
      });

    const vencendo30 = documentos.filter(function (d) {
      const venc = parseData_(d.DATA_VENCIMENTO);
      if (!venc) return false;
      const dias = Math.round((venc - hoje) / (24 * 3600 * 1000));
      return dias <= 30;
    }).length;

    // ---- Últimos documentos gerados ----
    const ultimosDocumentos = documentos
      .slice()
      .sort(function (a, b) {
        return (parseData_(b.CRIADO_EM) || 0) - (parseData_(a.CRIADO_EM) || 0);
      })
      .slice(0, 6)
      .map(function (d) {
        const dt = parseData_(d.CRIADO_EM);
        return {
          data: dt ? Utilities.formatDate(dt, "America/Sao_Paulo", "dd/MM") : "--/--",
          descricao: (SGO_UTILS.safe(d.TIPO_DOCUMENTO) || "Documento") +
            (SGO_UTILS.safe(d.NOME_ARQUIVO) ? " — " + SGO_UTILS.safe(d.NOME_ARQUIVO) : ""),
          link: SGO_UTILS.safe(d.LINK_ARQUIVO)
        };
      });

    // ---- Atendimentos Auvo (só Gestor/Admin/Diretoria — dado operacional interno) ----
    const auvoResumo = isAdminPerfilAuth_(sessao.perfil) ? montarAuvoResumoDashboard_() : null;

    return {
      success: true,
      totais: {
        clientes: clientes.length,
        unidades: unidades.length,
        equipamentos: equipamentos.length,
        documentos: documentos.length
      },
      clientesRecentes: clientesRecentes,
      equipamentosPorTipo: equipamentosPorTipo,
      documentosPorMes: meses,
      docsAVencer: docsAVencer,
      ultimosDocumentos: ultimosDocumentos,
      vencendo30: vencendo30,
      auvoResumo: auvoResumo
    };

  } catch (e) {
    return { success: false, message: "Erro ao montar dashboard: " + e.message };
  }
}

// ---------------------------------------------------------------
// ATENDIMENTOS AUVO (AUVO_TAREFAS) — bloco do dashboard principal.
// Fica aqui (não em SGO_Auvo_*.js) porque é só leitura, específico do
// dashboard, e roda dentro de obterDashboardDetalhado — nada aqui
// escreve na planilha.
// ---------------------------------------------------------------
function montarAuvoResumoDashboard_() {
  var sheets = SGO_CFG.SHEETS;
  var aba = sheets.AUVO_TAREFAS;
  var existe = false;
  try { SGO_DATA.getSheet(aba); existe = true; } catch (e) { existe = false; }
  if (!existe) return null;

  var tarefas = SGO_DATA.getAll(aba);
  if (!tarefas.length) {
    return { total: 0, abertas: 0, concluidas30d: 0, ultimosAtendimentos: [], rankingTecnicos: [], qualidade: null };
  }

  var indiceClientes = {};
  SGO_DATA.getAll(sheets.CAD_CLIENTES).forEach(function (c) { indiceClientes[c.ID] = c; });
  var indiceUsuarios = {};
  SGO_DATA.getAll(sheets.CAD_USUARIOS).forEach(function (u) { indiceUsuarios[u.ID] = u; });

  var nomeCliente_ = function (t) {
    var c = indiceClientes[t.CLIENTE_ID_SGO];
    if (c) return SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
    if (SGO_UTILS.safe(t.CLIENTE_NOME_AUVO)) return SGO_UTILS.safe(t.CLIENTE_NOME_AUVO);
    return t.CLIENTE_AUVO_ID ? ("Cliente Auvo #" + t.CLIENTE_AUVO_ID) : "Cliente não identificado";
  };
  var nomeTecnico_ = function (t) {
    var u = indiceUsuarios[t.TECNICO_ID_SGO];
    if (u) return SGO_UTILS.safe(u.NOME);
    if (SGO_UTILS.safe(t.TECNICO_NOME_AUVO)) return SGO_UTILS.safe(t.TECNICO_NOME_AUVO);
    return t.TECNICO_AUVO_ID ? ("Técnico Auvo #" + t.TECNICO_AUVO_ID) : "Técnico não identificado";
  };
  var parseData_ = function (v) {
    if (!v) return null;
    var d = (v instanceof Date) ? v : new Date(String(v));
    return (d && !isNaN(d.getTime())) ? d : null;
  };

  var agora = new Date();
  var ha30dias = new Date(agora.getTime() - 30 * 24 * 3600 * 1000);

  var abertas = 0, concluidas30d = 0;
  var contagemPorTecnico = {}; // chave: TECNICO_ID_SGO || TECNICO_AUVO_ID
  var comRelato = 0, semRelato = 0, finalizadasSemCheckout = 0;

  tarefas.forEach(function (t) {
    var finalizada = SGO_UTILS.safeUpper(t.FINALIZADA) === "SIM";
    if (!finalizada) abertas++;
    var dt = parseData_(t.DATA_TAREFA);
    if (finalizada && dt && dt >= ha30dias) concluidas30d++;

    var chaveTecnico = t.TECNICO_ID_SGO || (t.TECNICO_AUVO_ID ? ("auvo:" + t.TECNICO_AUVO_ID) : null);
    if (chaveTecnico) {
      if (!contagemPorTecnico[chaveTecnico]) contagemPorTecnico[chaveTecnico] = { nome: nomeTecnico_(t), qtd: 0 };
      contagemPorTecnico[chaveTecnico].qtd++;
    }

    if (SGO_UTILS.safe(t.RELATO_SERVICO)) comRelato++; else semRelato++;
    if (finalizada && !SGO_UTILS.safe(t.CHECKOUT_EM)) finalizadasSemCheckout++;
  });

  var rankingArr = Object.keys(contagemPorTecnico).map(function (k) { return contagemPorTecnico[k]; });
  rankingArr.sort(function (a, b) { return b.qtd - a.qtd; });
  var mediaTecnico = rankingArr.length ? (tarefas.length / rankingArr.length) : 0;
  var rankingTecnicos = rankingArr.slice(0, 6).map(function (r) {
    return { nome: r.nome, qtd: r.qtd, acimaDaMedia: r.qtd > mediaTecnico };
  });

  var ultimosAtendimentos = tarefas
    .slice()
    .sort(function (a, b) { return (parseData_(b.DATA_TAREFA) || 0) - (parseData_(a.DATA_TAREFA) || 0); })
    .slice(0, 8)
    .map(function (t) {
      var dt = parseData_(t.DATA_TAREFA);
      return {
        data: dt ? Utilities.formatDate(dt, "America/Sao_Paulo", "dd/MM HH:mm") : "--/--",
        cliente: nomeCliente_(t),
        tecnico: nomeTecnico_(t),
        tipo: SGO_UTILS.safe(t.TIPO_TAREFA) || "Atendimento",
        finalizada: SGO_UTILS.safeUpper(t.FINALIZADA) === "SIM",
        auvoTaskId: t.AUVO_TASK_ID
      };
    });

  return {
    total: tarefas.length,
    abertas: abertas,
    concluidas30d: concluidas30d,
    ultimosAtendimentos: ultimosAtendimentos,
    rankingTecnicos: rankingTecnicos,
    mediaTecnico: Math.round(mediaTecnico * 10) / 10,
    qualidade: {
      pctComRelato: Math.round((comRelato / tarefas.length) * 100),
      pctSemRelato: Math.round((semRelato / tarefas.length) * 100),
      finalizadasSemCheckout: finalizadasSemCheckout
    }
  };
}