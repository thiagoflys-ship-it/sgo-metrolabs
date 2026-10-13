function include(file) {
  try {
    return HtmlService.createHtmlOutputFromFile(file).getContent();
  } catch (err) {
    throw new Error("Falha ao incluir arquivo HTML: " + file + " | " + err.message);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.diagAuvo === 'x7k2m9' && e.parameter.acao === 'diagPerfFrotaMinimo') {
    // Versao minima de proposito -- a versao anterior (mais completa)
    // travou/deu timeout na pratica, o que ja e' um dado real: alguma
    // operacao contra essa planilha esta demorando MUITO. Testa 1 coisa
    // de cada vez, comecando pela mais basica possivel, pra achar onde
    // exatamente comeca a travar.
    try {
      var t0 = Date.now();
      var ssRef = SpreadsheetApp.openById(SGO_CFG.DB_ID);
      var abrirMs = Date.now() - t0;

      t0 = Date.now();
      var qtdAbas = ssRef.getSheets().length;
      var listarAbasMs = Date.now() - t0;

      return ContentService.createTextOutput(JSON.stringify({
        ok: true, abrirPlanilha_ms: abrirMs, listarAbas_ms: listarAbasMs, qtdAbasTotal: qtdAbas
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    } catch (errDiag) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(errDiag && errDiag.stack || errDiag) }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e && e.parameter && e.parameter.diagAuvo === 'x7k2m9' && e.parameter.acao === 'diagTamanhoAbas') {
    // So metadados (getLastRow/getLastColumn) -- NUNCA le o conteudo
    // das celulas, entao e' rapido mesmo se alguma aba tiver crescido
    // muito. Serve pra achar qual aba (de qualquer modulo, nao so
    // Frota) esta anormalmente grande.
    try {
      var ss2 = SpreadsheetApp.openById(SGO_CFG.DB_ID);
      var abas2 = ss2.getSheets().map(function (s) {
        return { nome: s.getName(), linhas: s.getLastRow(), colunas: s.getLastColumn(), celulasAprox: s.getLastRow() * s.getLastColumn() };
      }).sort(function (a, b) { return b.celulasAprox - a.celulasAprox; });
      return ContentService.createTextOutput(JSON.stringify({ ok: true, abas: abas2 }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    } catch (errDiag) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(errDiag && errDiag.stack || errDiag) }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e && e.parameter && e.parameter.diagAuvo === 'x7k2m9' && e.parameter.acao === 'lerLogsDiag') {
    // Le os logs gravados pelo diagBootstrapDetalhado -- funciona mesmo
    // que a chamada anterior tenha travado/dado timeout sem resposta,
    // porque cada log e' gravado NA HORA, nao no final.
    try {
      var logs = SGO_DATA.getAll(SGO_CFG.SHEETS.SYS_LOGS)
        .filter(function (l) { return String(l.MODULO || l.modulo || '').indexOf('DIAG') !== -1 || String(l.ACAO || l.acao || '').indexOf('DIAG_BOOTSTRAP') !== -1; })
        .slice(-60);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, qtd: logs.length, logs: logs }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    } catch (errDiag) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(errDiag && errDiag.stack || errDiag) }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e && e.parameter && e.parameter.diagAuvo === 'x7k2m9' && e.parameter.acao === 'diagBootstrapDetalhado') {
    // Repete EXATAMENTE as chamadas de Frota_bootstrap_(), uma por uma,
    // cronometrando cada uma -- pra achar qual das ~26 operacoes e' a
    // lenta. Corta com 45s de orcamento acumulado (retorna o que ja
    // mediu) pra nunca dar timeout sem resposta nenhuma de novo.
    var resultados = [];
    var acumulado = 0;
    var ORCAMENTO_MS = 45000;

    function medir(rotulo, fn) {
      if (acumulado > ORCAMENTO_MS) { resultados.push({ rotulo: rotulo, pulado: true }); return; }
      // loga ANTES de rodar -- se essa chamada travar/der timeout na
      // planilha inteira, esse log "INICIO" sem "FIM" correspondente
      // aponta exatamente qual operacao estava em andamento na hora.
      try { SGO_DATA.log('DIAG_BOOTSTRAP_INICIO', 'diagnostico', rotulo, 'DIAG'); } catch (eLog1) {}
      var inicio = Date.now();
      var erro = null;
      try { fn(); } catch (err) { erro = String(err && err.message || err); }
      var ms = Date.now() - inicio;
      acumulado += ms;
      resultados.push({ rotulo: rotulo, ms: ms, erro: erro });
      try { SGO_DATA.log('DIAG_BOOTSTRAP_FIM', 'diagnostico', rotulo + ': ' + ms + 'ms' + (erro ? ' ERRO=' + erro : ''), 'DIAG'); } catch (eLog2) {}
    }

    medir('garantirTabela_CAD_VEICULOS', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.CAD_VEICULOS, ['ID', 'PLACA', 'MODELO', 'MARCA', 'ANO', 'COR', 'KM_ATUAL', 'STATUS', 'CRIADO_EM']);
    });
    medir('garantirTabela_CAD_CONDUTORES', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.CAD_CONDUTORES, ['ID', 'NOME', 'CNH', 'CNH_VALIDADE', 'TELEFONE', 'STATUS', 'CRIADO_EM']);
    });
    medir('garantirColuna_CONDUTORES_USUARIO_ID', function () { CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'USUARIO_ID'); });
    medir('garantirColuna_CONDUTORES_CNH_LINK', function () { CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'CNH_ARQUIVO_LINK'); });
    medir('garantirTabela_REG_FROTA_MOVIMENTACAO', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, [
        'ID', 'VEICULO_ID', 'CONDUTOR_ID', 'DATA_SAIDA', 'HORA_SAIDA', 'KM_SAIDA', 'CHECKLIST_SAIDA_JSON', 'FOTOS_SAIDA_JSON',
        'FINALIDADE', 'DATA_CHEGADA', 'HORA_CHEGADA', 'KM_CHEGADA', 'CHECKLIST_CHEGADA_JSON', 'FOTOS_CHEGADA_JSON',
        'OBSERVACOES', 'STATUS', 'CRIADO_EM'
      ]);
    });
    medir('garantirTabela_REG_FROTA_MANUTENCAO', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, ['ID', 'VEICULO_ID', 'TIPO', 'DATA', 'KM', 'DESCRICAO', 'CUSTO', 'OFICINA', 'PROXIMA_KM', 'PROXIMA_DATA', 'CRIADO_EM']);
    });
    medir('garantirTabela_REG_FROTA_DESPESA', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_DESPESA, ['ID', 'VEICULO_ID', 'TIPO', 'DATA', 'VALOR', 'DESCRICAO', 'CRIADO_EM']);
    });
    medir('garantirTabela_REG_FROTA_PARADA', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_PARADA, ['ID', 'VEICULO_ID', 'DATA_INICIO', 'DATA_FIM', 'MOTIVO', 'DESCRICAO', 'CRIADO_EM']);
    });
    medir('garantirTabela_REG_FROTA_DOCUMENTO', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, ['ID', 'VEICULO_ID', 'TIPO_DOCUMENTO', 'NOME_ARQUIVO', 'LINK', 'VALIDADE', 'OBSERVACOES', 'CRIADO_EM']);
    });
    medir('garantirTabela_REG_FROTA_MULTA', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_MULTA, [
        'ID', 'VEICULO_ID', 'DATA_INFRACAO', 'HORA_INFRACAO', 'LOCAL', 'DESCRICAO', 'VALOR', 'PONTOS',
        'ORGAO_AUTUADOR', 'NUMERO_AIT', 'VENCIMENTO', 'LINK_DOCUMENTO',
        'CONDUTOR_ID', 'MOVIMENTACAO_ID', 'STATUS_CRUZAMENTO', 'STATUS', 'OBSERVACOES', 'CRIADO_EM'
      ]);
    });
    medir('garantirTabela_REG_FROTA_ABASTECIMENTO', function () {
      CertCal_garantirTabela_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, ['ID', 'VEICULO_ID', 'CONDUTOR_ID', 'DATA', 'KM', 'TIPO_COMBUSTIVEL', 'LITROS', 'VALOR', 'POSTO', 'COMPROVANTE_LINK', 'CRIADO_EM']);
    });
    medir('forcarColunaTexto_MOV_DATA_SAIDA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DATA_SAIDA'); });
    medir('forcarColunaTexto_MOV_HORA_SAIDA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'HORA_SAIDA'); });
    medir('forcarColunaTexto_MOV_DATA_CHEGADA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DATA_CHEGADA'); });
    medir('forcarColunaTexto_MOV_HORA_CHEGADA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'HORA_CHEGADA'); });
    medir('forcarColunaTexto_MANUT_DATA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, 'DATA'); });
    medir('forcarColunaTexto_MANUT_PROXIMA_DATA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO, 'PROXIMA_DATA'); });
    medir('forcarColunaTexto_DESPESA_DATA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_DESPESA, 'DATA'); });
    medir('forcarColunaTexto_PARADA_DATA_INICIO', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_PARADA, 'DATA_INICIO'); });
    medir('forcarColunaTexto_PARADA_DATA_FIM', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_PARADA, 'DATA_FIM'); });
    medir('forcarColunaTexto_CONDUTORES_CNH_VALIDADE', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.CAD_CONDUTORES, 'CNH_VALIDADE'); });
    medir('forcarColunaTexto_DOCUMENTO_VALIDADE', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO, 'VALIDADE'); });
    medir('forcarColunaTexto_MULTA_DATA_INFRACAO', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MULTA, 'DATA_INFRACAO'); });
    medir('forcarColunaTexto_MULTA_VENCIMENTO', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MULTA, 'VENCIMENTO'); });
    medir('forcarColunaTexto_ABASTECIMENTO_DATA', function () { CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO, 'DATA'); });
    medir('garantirColuna_MOV_FINALIZADO_EM', function () { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'FINALIZADO_EM'); });

    return ContentService.createTextOutput(JSON.stringify({
      ok: true, totalAcumulado_ms: acumulado, orcamentoEstourado: acumulado > ORCAMENTO_MS, resultados: resultados
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

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
   DASHBOARD BACKEND - DADOS E ESTATÍSTICAS COM TRAVA DE CLIENTE
   ========================================================================= */
function obterTotaisDashboard(sessionId) {
  try {
    const sessao = exigirSessao(sessionId);
    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    
    // OTIMIZAÇÃO EXTREMA DE LEITURA
    // Como implementamos o salvamento do clienteId na sessão no SGO_Auth.gs, 
    // eliminamos a necessidade de fazer uma requisição extra à tabela CAD_USUARIOS toda vez que o painel atualiza.
    const idClienteReal = SGO_UTILS.safe(sessao.clienteId);

    // Trava de Segurança Extra: Se for perfil CLIENTE mas não tiver ID atrelado, bloqueia os dados vazando
    if (isCliente && !idClienteReal) {
      return {
        success: true,
        totais: { clientes: 0, unidades: 0, equipamentos: 0, documentos: 0 }
      };
    }

    // Busca todas as bases
    const todosClientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES);
    const todasUnidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES);
    const todosEquipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
    const todosDocumentos = SGO_DATA.getAll(SGO_CFG.SHEETS.DOC_DOCUMENTOS);

    // Filtra apenas os registros ATIVOS
    let ativosClientes = todosClientes.filter(c => SGO_UTILS.safeUpper(c.STATUS) === SGO_CFG.STATUS.ATIVO);
    let ativosUnidades = todasUnidades.filter(u => SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO);
    let ativosEquipamentos = todosEquipamentos.filter(e => SGO_UTILS.safeUpper(e.STATUS) === SGO_CFG.STATUS.ATIVO);
    let ativosDocumentos = todosDocumentos.filter(d => SGO_UTILS.safeUpper(d.STATUS) === SGO_CFG.STATUS.ATIVO);

    // Aplica Trava de Cliente (Isolamento de Dados)
    if (isCliente) {
      ativosClientes = ativosClientes.filter(c => SGO_UTILS.safe(c.ID) === idClienteReal);
      ativosUnidades = ativosUnidades.filter(u => SGO_UTILS.safe(u.CLIENTE_ID) === idClienteReal);
      ativosEquipamentos = ativosEquipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === idClienteReal);
      ativosDocumentos = ativosDocumentos.filter(d => SGO_UTILS.safe(d.CLIENTE_ID) === idClienteReal);
    }

    return {
      success: true,
      totais: {
        clientes: ativosClientes.length,
        unidades: ativosUnidades.length,
        equipamentos: ativosEquipamentos.length,
        documentos: ativosDocumentos.length
      }
    };

  } catch (e) {
    return { success: false, message: "Erro ao buscar totais: " + e.message };
  }
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
      const d = (v instanceof Date) ? v : new Date(String(v));
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
    const docsAVencer = documentos
      .map(function (d) {
        const venc = parseData_(d.DATA_VENCIMENTO);
        return venc ? { doc: d, venc: venc } : null;
      })
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