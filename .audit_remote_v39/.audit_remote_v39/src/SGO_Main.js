function include(file) {
  try {
    return HtmlService.createHtmlOutputFromFile(file).getContent();
  } catch (err) {
    throw new Error("Falha ao incluir arquivo HTML: " + file + " | " + err.message);
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};

    // Rota pública de validação documental — ?validar=TOKEN
    if (params.validar) {
      const codigo   = String(params.validar).trim();
      const template = HtmlService.createTemplateFromFile("Validacao_Documento");
      template.APP_NOME          = SGO_CFG.APP_NAME || "METROLABS SGO+";
      template.CODIGO_VALIDACAO  = codigo;
      return template
        .evaluate()
        .setTitle("Validação de Documento — " + (SGO_CFG.APP_NAME || "METROLABS SGO+"))
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag("viewport", "width=device-width, initial-scale=1");
    }

    if (params.os) {
      return renderPublicRouteV2_("Acompanhamento de OS", "OS", params.os);
    }

    if (params.qr) {
      return renderPublicRouteV2_("Ficha publica por QR", "QR", params.qr);
    }

    if (params.missao) {
      return renderPublicRouteV2_("Acompanhamento de Missao", "MISSAO", params.missao);
    }

    const template = HtmlService.createTemplateFromFile("Index");
    return template
      .evaluate()
      .setTitle(SGO_CFG.APP_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return HtmlService
      .createHtmlOutput(
        '<h2>Erro ao carregar o sistema</h2>' +
        '<p>' + String(err && err.message ? err.message : err) + '</p>'
      )
      .setTitle("Erro - METROLABS SGO+");
  }
}

function renderPublicRouteV2_(titulo, tipo, valor) {
  const tipoSeguro = String(tipo || "").toUpperCase();
  if (tipoSeguro === "QR") return renderPublicQRV2_(valor);
  if (tipoSeguro === "OS") return renderPublicOSV2_(valor);
  if (tipoSeguro === "MISSAO") return renderPublicMissaoV2_(valor);

  const appName = SGO_CFG.APP_NAME || "METROLABS SGO+";
  const safeTitulo = escapeHtmlSGO_(titulo);
  const safeTipo = escapeHtmlSGO_(tipo);
  const safeValor = escapeHtmlSGO_(String(valor || "").trim());

  const html =
    '<!doctype html>' +
    '<html><head><base target="_top">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' +
    'body{margin:0;font-family:Arial,sans-serif;background:#f6f8fb;color:#172033;}' +
    '.wrap{max-width:760px;margin:0 auto;padding:40px 20px;}' +
    '.box{background:#fff;border:1px solid #dde3ee;border-radius:8px;padding:24px;box-shadow:0 8px 24px rgba(15,23,42,.08);}' +
    'h1{margin:0 0 10px;font-size:24px;line-height:1.25;}' +
    'p{margin:8px 0;color:#475569;line-height:1.5;}' +
    '.token{margin-top:16px;padding:12px;background:#eef2f7;border-radius:6px;font-family:Consolas,monospace;word-break:break-all;color:#0f172a;}' +
    '</style></head><body>' +
    '<main class="wrap"><section class="box">' +
    '<h1>' + safeTitulo + '</h1>' +
    '<p>' + escapeHtmlSGO_(appName) + ' recebeu uma rota publica do tipo ' + safeTipo + '.</p>' +
    '<p>O modulo completo sera conectado nos proximos blocos da versao 2.0.</p>' +
    '<div class="token">' + safeValor + '</div>' +
    '</section></main>' +
    '</body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(safeTitulo + " - " + appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function renderPublicQRV2_(codigo) {
  const appName = SGO_CFG.APP_NAME || "METROLABS SGO+";
  const res = (typeof SGO_RASTREABILIDADE !== "undefined")
    ? SGO_RASTREABILIDADE.consultarPublico(codigo)
    : { success: false, message: "Modulo de rastreabilidade indisponivel." };

  let body = "";
  if (!res || !res.success) {
    body = publicStatusBox_("Codigo nao localizado", res && res.message ? res.message : "Nao foi possivel localizar rastreabilidade para este QR.", "erro");
  } else if (res.tipo === "LOTE") {
    const item = res.item || {};
    const lote = res.lote || {};
    const fornecedor = res.fornecedor || {};
    body =
      publicStatusBox_("Lote rastreado com sucesso", "Origem, fornecedor, saldo e uso em OS localizados no SGO+.", "ok") +
      publicGrid_([
        ["Item", item.DESCRICAO || item.CODIGO_INTERNO],
        ["Referencia", item.REFERENCIA],
        ["Fabricante", item.FABRICANTE],
        ["Lote", lote.NUMERO_LOTE],
        ["Serie", lote.NUMERO_SERIE],
        ["Validade", lote.DATA_VALIDADE],
        ["Saldo atual", lote.QUANTIDADE_ATUAL],
        ["Fornecedor", fornecedor.RAZAO_SOCIAL || fornecedor.NOME_FANTASIA],
        ["CNPJ fornecedor", fornecedor.CNPJ],
        ["Status lote", lote.STATUS]
      ]) +
      publicSaidasHtml_(res.saidas || []);
  } else if (res.tipo === "PECA_INSTALADA") {
    const p = res.peca || {};
    const f = res.fornecedor || {};
    body =
      publicStatusBox_("Peca instalada rastreada", "Historico tecnico vinculado ao equipamento localizado.", "ok") +
      publicGrid_([
        ["Peca", p.NOME],
        ["Referencia", p.REFERENCIA],
        ["Serie", p.NUMERO_SERIE],
        ["Equipamento", p.EQUIPAMENTO_ID],
        ["OS instalacao", p.INSTALADA_OS_ID],
        ["Tecnico instalador", p.INSTALADA_POR],
        ["Fornecedor", f.RAZAO_SOCIAL || f.NOME_FANTASIA],
        ["Status", p.STATUS]
      ]);
  } else if (res.tipo === "OS") {
    body = publicStatusBox_("OS rastreada", "Materiais e pecas consumidos nesta OS foram localizados.", "ok") + publicOSResumoHtml_(res.os, res.materiais || []);
  } else {
    body = publicStatusBox_("Registro localizado", "Codigo reconhecido pelo sistema.", "ok") + "<pre>" + escapeHtmlSGO_(JSON.stringify(res, null, 2)) + "</pre>";
  }

  return HtmlService
    .createHtmlOutput(publicPageHtml_("Rastreabilidade por QR", appName, body, codigo))
    .setTitle("Rastreabilidade - " + appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function renderPublicOSV2_(osId) {
  let os = null;
  try { os = SGO_DATA.getById(SGO_CFG.SHEETS.OS_ORDENS, osId, "OS"); } catch (e) {}
  const body = os
    ? publicStatusBox_("Ordem de Servico localizada", "Acompanhamento publico da OS.", "ok") + publicGrid_([
        ["Numero", os.NUMERO_OS],
        ["Tipo", os.TIPO_OS],
        ["Prioridade", os.PRIORIDADE],
        ["Status", os.STATUS],
        ["Abertura", os.DATA_ABERTURA],
        ["Agendada", os.DATA_AGENDADA],
        ["Conclusao", os.DATA_CONCLUSAO],
        ["Equipamento", os.EQUIPAMENTO_ID]
      ])
    : publicStatusBox_("OS nao localizada", "Confira o codigo informado.", "erro");

  return HtmlService.createHtmlOutput(publicPageHtml_("Acompanhamento de OS", SGO_CFG.APP_NAME, body, osId))
    .setTitle("OS - " + SGO_CFG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function renderPublicMissaoV2_(missaoId) {
  let missao = null;
  try { missao = SGO_DATA.getById(SGO_CFG.SHEETS.AGD_MISSOES, missaoId, "OS"); } catch (e) {}
  const body = missao
    ? publicStatusBox_("Missao localizada", "Acompanhamento publico da missao tecnica.", "ok") + publicGrid_([
        ["Titulo", missao.TITULO],
        ["Status", missao.STATUS],
        ["Data agendada", missao.DATA_AGENDADA],
        ["Tecnico", missao.TECNICO_ID],
        ["OS", missao.OS_ID],
        ["Check-in", missao.CHECKIN_EM],
        ["Check-out", missao.CHECKOUT_EM]
      ])
    : publicStatusBox_("Missao nao localizada", "Confira o codigo informado.", "erro");

  return HtmlService.createHtmlOutput(publicPageHtml_("Acompanhamento de Missao", SGO_CFG.APP_NAME, body, missaoId))
    .setTitle("Missao - " + SGO_CFG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function publicPageHtml_(titulo, appName, body, codigo) {
  return '<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:0;font-family:Arial,sans-serif;background:#f5f7fb;color:#172033}.wrap{max-width:980px;margin:0 auto;padding:28px 16px}.hero{background:#fff;border:1px solid #dfe6ee;border-top:5px solid #0b7a3e;border-radius:10px;box-shadow:0 12px 30px rgba(15,23,42,.08);overflow:hidden}.head{padding:24px 28px;background:#f8fafc;border-bottom:1px solid #e5ecf5}.head h1{margin:0;color:#0b3b78;font-size:24px}.head p{margin:8px 0 0;color:#667085}.content{padding:24px 28px}.status{border-radius:10px;padding:16px 18px;margin-bottom:18px;border:1px solid #bfe7cf;background:#e9f7ef;color:#14532d}.status.erro{background:#fff1f0;border-color:#fda29b;color:#7a271a}.status h2{font-size:17px;margin:0 0 5px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.info{background:#f8fafc;border:1px solid #dfe6ee;border-radius:8px;padding:12px}.label{font-size:10px;text-transform:uppercase;font-weight:800;color:#667085;margin-bottom:6px}.value{font-size:14px;font-weight:700;word-break:break-word}.token{margin-top:16px;font-family:Consolas,monospace;background:#edf2f7;padding:10px;border-radius:8px;word-break:break-all}.table{width:100%;border-collapse:collapse;margin-top:16px}.table th,.table td{border-bottom:1px solid #dfe6ee;text-align:left;padding:9px;font-size:13px}.table th{font-size:10px;text-transform:uppercase;color:#667085}@media(max-width:700px){.grid{grid-template-columns:1fr}.head,.content{padding:18px}}</style></head><body>' +
    '<main class="wrap"><section class="hero"><header class="head"><h1>' + escapeHtmlSGO_(titulo) + '</h1><p>' + escapeHtmlSGO_(appName || "METROLABS SGO+") + ' - consulta publica auditavel.</p></header><section class="content">' +
    body + '<div class="token">' + escapeHtmlSGO_(codigo || "") + '</div></section></section></main></body></html>';
}

function publicStatusBox_(titulo, texto, tipo) {
  return '<div class="status ' + (tipo === "erro" ? "erro" : "") + '"><h2>' + escapeHtmlSGO_(titulo) + '</h2><div>' + escapeHtmlSGO_(texto) + '</div></div>';
}

function publicGrid_(linhas) {
  return '<div class="grid">' + (linhas || []).map(function(l) {
    return '<div class="info"><div class="label">' + escapeHtmlSGO_(l[0]) + '</div><div class="value">' + escapeHtmlSGO_(l[1] || "--") + '</div></div>';
  }).join("") + '</div>';
}

function publicSaidasHtml_(saidas) {
  if (!saidas || !saidas.length) return '<p>Nenhuma saida registrada para este lote.</p>';
  return '<table class="table"><thead><tr><th>OS</th><th>Equipamento</th><th>Peca</th><th>Qtd.</th><th>Tecnico</th><th>Data</th></tr></thead><tbody>' +
    saidas.map(function(s) {
      return '<tr><td>' + escapeHtmlSGO_((s.os && s.os.NUMERO_OS) || s.OS_ID) + '</td><td>' + escapeHtmlSGO_(s.EQUIPAMENTO_ID || (s.os && s.os.EQUIPAMENTO_ID)) + '</td><td>' + escapeHtmlSGO_(s.PECA_INSTALADA_ID || "") + '</td><td>' + escapeHtmlSGO_(s.QUANTIDADE) + '</td><td>' + escapeHtmlSGO_(s.TECNICO_ID || (s.os && s.os.TECNICO_ID)) + '</td><td>' + escapeHtmlSGO_(s.DATA_SAIDA || "") + '</td></tr>';
    }).join("") + '</tbody></table>';
}

function publicOSResumoHtml_(os, materiais) {
  return publicGrid_([
    ["Numero", os && os.NUMERO_OS],
    ["Status", os && os.STATUS],
    ["Tipo", os && os.TIPO_OS],
    ["Equipamento", os && os.EQUIPAMENTO_ID]
  ]) + publicSaidasHtml_(materiais);
}

function escapeHtmlSGO_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    status: SGO_CFG.STATUS || {}, // <- Adicionado para o frontend conhecer os status (PENDENTE, BLOQUEADO, etc)
    modulos: SGO_CFG.MODULOS || {},
    os: SGO_CFG.OS || {},
    missoes: SGO_CFG.MISSOES || {},
    frota: SGO_CFG.FROTA || {}
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

    // ── Status dos documentos ──────────────────────────────────────────
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    function parseDateDash_(v) {
      if (!v) return null;
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s.substring(0, 10) + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const p = s.split("/");
        const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    let docsOk = 0, docsVencendo = 0, docsVencidos = 0, docsSemVenc = 0;
    ativosDocumentos.forEach(function(d) {
      const dataV = parseDateDash_(d.DATA_VENCIMENTO);
      if (!dataV) { docsSemVenc++; return; }
      const dias = Math.ceil((dataV - hoje) / (1000 * 60 * 60 * 24));
      if (dias < 0) docsVencidos++;
      else if (dias <= 30) docsVencendo++;
      else docsOk++;
    });

    const totalComVenc = docsOk + docsVencendo + docsVencidos;
    const docOkPct  = totalComVenc > 0 ? Math.round((docsOk / totalComVenc) * 100) : 0;
    const docSaudePct = ativosDocumentos.length > 0
      ? Math.round(((docsOk + docsVencendo) / ativosDocumentos.length) * 100)
      : 0;

    // ── Equipamentos com doc vinculado ─────────────────────────────────
    const eqpComDoc = new Set(
      ativosDocumentos.map(d => SGO_UTILS.safe(d.EQUIPAMENTO_ID)).filter(Boolean)
    ).size;
    const eqpComDocPct = ativosEquipamentos.length > 0
      ? Math.round((eqpComDoc / ativosEquipamentos.length) * 100)
      : 0;

    // ── Distribuição por tipo de posse ─────────────────────────────────
    const posse = { proprio: 0, locado: 0, comodato: 0, terceiro: 0 };
    ativosEquipamentos.forEach(function(e) {
      const p = SGO_UTILS.safeUpper(e.TIPO_POSSE || "");
      if (p === "PROPRIO")   posse.proprio++;
      else if (p === "LOCADO")    posse.locado++;
      else if (p === "COMODATO")  posse.comodato++;
      else if (p === "TERCEIRO")  posse.terceiro++;
    });

    // ── Top 5 clientes por equipamentos ───────────────────────────────
    const mapaCliNomes = {};
    ativosClientes.forEach(c => {
      mapaCliNomes[SGO_UTILS.safe(c.ID)] = SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL || "");
    });
    const eqpPorCli = {};
    ativosEquipamentos.forEach(e => {
      const cId = SGO_UTILS.safe(e.CLIENTE_ID);
      if (!cId) return;
      eqpPorCli[cId] = (eqpPorCli[cId] || 0) + 1;
    });
    const topClientes = Object.keys(eqpPorCli)
      .map(id => ({ nome: mapaCliNomes[id] || "—", total: eqpPorCli[id] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // ── Estatísticas de Registros Técnicos ────────────────────────────────
    let regTecStats = { total: 0, ok: 0, vencendo: 0, vencidos: 0, semValidade: 0 };
    try {
      const todosRegistros = SGO_DATA.getAll(SGO_CFG.SHEETS.REG_TECNICO);
      const regAtivos = todosRegistros.filter(r =>
        SGO_UTILS.safeUpper(r.STATUS) === SGO_CFG.STATUS.ATIVO &&
        (!isCliente || SGO_UTILS.safe(r.CLIENTE_ID) === idClienteReal)
      );
      regTecStats.total = regAtivos.length;
      regAtivos.forEach(function(r) {
        if (!r.DATA_VALIDADE) { regTecStats.semValidade++; return; }
        const s = String(r.DATA_VALIDADE).trim().substring(0, 10);
        const d = new Date(s + "T00:00:00");
        if (isNaN(d.getTime())) { regTecStats.semValidade++; return; }
        d.setHours(0, 0, 0, 0);
        const dias = Math.ceil((d - hoje) / 86400000);
        if (dias < 0) regTecStats.vencidos++;
        else if (dias <= 30) regTecStats.vencendo++;
        else regTecStats.ok++;
      });
    } catch(e) { /* aba pode não existir em instalação antiga */ }

    return {
      success: true,
      totais: {
        clientes:     ativosClientes.length,
        unidades:     ativosUnidades.length,
        equipamentos: ativosEquipamentos.length,
        documentos:   ativosDocumentos.length
      },
      documentos: {
        ok:            docsOk,
        vencendo:      docsVencendo,
        vencidos:      docsVencidos,
        semVencimento: docsSemVenc,
        okPct:         docOkPct,
        saudePct:      docSaudePct
      },
      registrosTecnicos: regTecStats,
      eqpComDocPct,
      posse,
      topClientes
    };

  } catch (e) {
    return { success: false, message: "Erro ao buscar totais: " + e.message };
  }
}
