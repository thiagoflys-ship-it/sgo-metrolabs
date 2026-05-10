const SGO_INVENTARIO = (() => {
  const SHEET_EQP  = SGO_CFG.SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_CLI  = SGO_CFG.SHEETS.CAD_CLIENTES;
  const SHEET_UNI  = SGO_CFG.SHEETS.CAD_UNIDADES;
  const SHEET_DOC  = SGO_CFG.SHEETS.DOC_DOCUMENTOS;
  const SHEET_REG  = SGO_CFG.SHEETS.REG_TECNICO;
  const SHEET_PECAS = SGO_CFG.SHEETS.CAD_PECAS;
  const SHEET_OS = SGO_CFG.SHEETS.OS_ORDENS;
  const SHEET_MATERIAIS = SGO_CFG.SHEETS.OS_MATERIAIS;
  const STATUS_ATIVO = SGO_CFG.STATUS.ATIVO;

  const TIPOS_REG = ["CALIBRACAO","QUALIFICACAO","ENSAIO_ELETRICO","MANUTENCAO_PREVENTIVA","MANUTENCAO_CORRETIVA","INSPECAO_SEGURANCA"];

  // =========================
  // DATA PARSE HELPERS
  // =========================
  function parseData_(venc) {
    if (!venc) return null;
    const s = String(venc).trim();
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

  function formatarDataBR_(venc) {
    const d = parseData_(venc);
    if (!d) return "";
    const dia  = String(d.getDate()).padStart(2, "0");
    const mes  = String(d.getMonth() + 1).padStart(2, "0");
    const ano  = d.getFullYear();
    return dia + "/" + mes + "/" + ano;
  }

  function calcStatusReg_(reg) {
    if (!reg) return { status: "SEM_REG", label: "Sem registro", vencimento: null, diasRestantes: null };
    const venc = reg.DATA_VALIDADE;
    if (!venc) return { status: "SEM_VENCIMENTO", label: "Sem validade", vencimento: null, diasRestantes: null,
      dataRealizado: reg.DATA_REALIZADO, numeroCertificado: reg.NUMERO_CERTIFICADO };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataV = parseData_(venc);
    if (!dataV) return { status: "SEM_VENCIMENTO", label: "Data inválida", vencimento: null, diasRestantes: null };
    const dias = Math.ceil((dataV - hoje) / 86400000);
    const dtBR = formatarDataBR_(venc);
    let status, label;
    if (dias < 0)        { status = "VENCIDO";   label = "Vencido em " + dtBR; }
    else if (dias === 0) { status = "VENCIDO";   label = "Vence hoje!"; }
    else if (dias <= 30) { status = "VENCENDO";  label = "Vence em " + dias + "d (" + dtBR + ")"; }
    else                 { status = "OK";         label = "OK até " + dtBR; }
    return { status, label, vencimento: venc, diasRestantes: dias,
      dataRealizado: reg.DATA_REALIZADO, numeroCertificado: reg.NUMERO_CERTIFICADO };
  }

  function calcStatusDoc_(doc) {
    if (!doc) return { status: "SEM_DOC", label: "Sem documento", vencimento: null, diasRestantes: null };

    const link  = SGO_UTILS.safe(doc.LINK_ARQUIVO);
    const nome  = SGO_UTILS.safe(doc.NOME_ARQUIVO);
    const venc  = doc.DATA_VENCIMENTO;

    if (!venc) return { status: "SEM_VENCIMENTO", label: "Sem data de vencimento", vencimento: null, diasRestantes: null, link, nome };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = parseData_(venc);
    if (!dataVenc) return { status: "SEM_VENCIMENTO", label: "Data inválida", vencimento: null, diasRestantes: null, link, nome };

    const diasRestantes = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));
    const dtBR = formatarDataBR_(venc);

    let status, label;
    if (diasRestantes < 0) {
      status = "VENCIDO";
      label  = "Vencido em " + dtBR;
    } else if (diasRestantes === 0) {
      status = "VENCIDO";
      label  = "Vence hoje!";
    } else if (diasRestantes <= 30) {
      status = "VENCENDO";
      label  = "Vence em " + diasRestantes + "d (" + dtBR + ")";
    } else {
      status = "OK";
      label  = "OK até " + dtBR;
    }

    return { status, label, vencimento: venc, diasRestantes, link, nome };
  }

  function melhorDoc_(docs) {
    if (!docs || !docs.length) return null;
    return docs.sort((a, b) => {
      const da = parseData_(a.DATA_VENCIMENTO);
      const db = parseData_(b.DATA_VENCIMENTO);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    })[0];
  }

  function safeAll_(sheet, dbKey) {
    try {
      return SGO_DATA.getAll(sheet, dbKey);
    } catch (e) {
      return [];
    }
  }

  function calcStatusPecas_(pecas) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let total = 0;
    let criticas = 0;
    let vencidas = 0;
    let vencendo = 0;

    (pecas || []).forEach(function(p) {
      total++;
      if (SGO_UTILS.safeUpper(p.APLICA_CALIBRACAO) !== "S") return;
      criticas++;
      const data = parseData_(p.DATA_PROXIMA_CAL);
      if (!data) return;
      const dias = Math.ceil((data - hoje) / 86400000);
      if (dias < 0) vencidas++;
      else if (dias <= 30) vencendo++;
    });

    let status = "OK";
    let label = total + " peca(s)";
    if (vencidas > 0) {
      status = "VENCIDO";
      label = vencidas + " vencida(s)";
    } else if (vencendo > 0) {
      status = "VENCENDO";
      label = vencendo + " vencendo";
    } else if (criticas > 0) {
      label = criticas + " critica(s) OK";
    }

    return { total: total, criticas: criticas, vencidas: vencidas, vencendo: vencendo, status: status, label: label };
  }

  function isOSAtiva_(os) {
    const st = SGO_UTILS.safeUpper(os && os.STATUS);
    return ["CONCLUIDA", "APROVADA", "FATURADA", "CANCELADA"].indexOf(st) < 0;
  }

  // =========================
  // GERADOR PRINCIPAL
  // =========================
  function gerarInventario(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    filtros = filtros || {};

    let equipamentos = SGO_DATA.getAll(SHEET_EQP);
    const clientes   = SGO_DATA.getAll(SHEET_CLI);
    const unidades   = SGO_DATA.getAll(SHEET_UNI);
    const documentos = SGO_DATA.getAll(SHEET_DOC);
    let registrosTec = [];
    try { registrosTec = SGO_DATA.getAll(SHEET_REG); } catch(e) {}
    const pecas = safeAll_(SHEET_PECAS);
    const ordens = safeAll_(SHEET_OS, "OS");
    const materiais = safeAll_(SHEET_MATERIAIS, "OS");

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const cId = SGO_UTILS.safe(sessao.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === cId);
    }

    if (filtros.clienteId) {
      const f = SGO_UTILS.safe(filtros.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === f);
    }
    if (filtros.unidadeId) {
      const f = SGO_UTILS.safe(filtros.unidadeId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.UNIDADE_ID) === f);
    }
    if (filtros.tipoPosse) {
      const f = SGO_UTILS.safeUpper(filtros.tipoPosse);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safeUpper(e.TIPO_POSSE) === f);
    }
    if (filtros.status) {
      const f = SGO_UTILS.safeUpper(filtros.status);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safeUpper(e.STATUS) === f);
    }

    const mapaClientes = {};
    clientes.forEach(c => { mapaClientes[SGO_UTILS.safe(c.ID)] = c; });
    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[SGO_UTILS.safe(u.ID)] = u; });

    // Mapeia documentos ativos por equipamento
    const mapaDocsEquip = {};
    documentos.forEach(d => {
      if (SGO_UTILS.safeUpper(d.STATUS) !== STATUS_ATIVO) return;
      const eId = SGO_UTILS.safe(d.EQUIPAMENTO_ID);
      if (!eId) return;
      if (!mapaDocsEquip[eId]) mapaDocsEquip[eId] = [];
      mapaDocsEquip[eId].push(d);
    });

    // Mapeia registros técnicos ativos por equipamento — pega o mais recente de cada tipo
    const mapaRegTec = {};
    registrosTec.forEach(r => {
      if (SGO_UTILS.safeUpper(r.STATUS) !== STATUS_ATIVO) return;
      const eId  = SGO_UTILS.safe(r.EQUIPAMENTO_ID);
      const tipo = SGO_UTILS.safeUpper(r.TIPO_SERVICO);
      if (!eId || !tipo) return;
      if (!mapaRegTec[eId]) mapaRegTec[eId] = {};
      const atual = mapaRegTec[eId][tipo];
      if (!atual || (r.DATA_REALIZADO || "") > (atual.DATA_REALIZADO || "")) {
        mapaRegTec[eId][tipo] = r;
      }
    });

    const mapaPecas = {};
    pecas.forEach(p => {
      const eId = SGO_UTILS.safe(p.EQUIPAMENTO_ID);
      if (!eId) return;
      if (!mapaPecas[eId]) mapaPecas[eId] = [];
      mapaPecas[eId].push(p);
    });

    const mapaOSAtivas = {};
    const mapaCustosOS = {};
    const mapaCustoTotalOS = {};
    const mapaEquipPorOS = {};
    ordens.forEach(o => {
      const eId = SGO_UTILS.safe(o.EQUIPAMENTO_ID);
      if (!eId) return;
      mapaEquipPorOS[SGO_UTILS.safe(o.ID)] = eId;
      if (isOSAtiva_(o)) {
        if (!mapaOSAtivas[eId]) mapaOSAtivas[eId] = [];
        mapaOSAtivas[eId].push(o);
      }
      const custoTotal = SGO_UTILS.toNumber(o.CUSTO_TOTAL, 0);
      mapaCustoTotalOS[SGO_UTILS.safe(o.ID)] = custoTotal;
      mapaCustosOS[eId] = (mapaCustosOS[eId] || 0) + (
        custoTotal > 0
          ? custoTotal
          : SGO_UTILS.toNumber(o.CUSTO_PECAS, 0)
            + SGO_UTILS.toNumber(o.CUSTO_HORA, 0)
            + SGO_UTILS.toNumber(o.CUSTO_DESLOCAMENTO, 0)
      );
    });

    materiais.forEach(m => {
      const osId = SGO_UTILS.safe(m.OS_ID);
      if (mapaCustoTotalOS[osId] > 0) return;
      const eId = mapaEquipPorOS[osId] || "";
      if (!eId) return;
      mapaCustosOS[eId] = (mapaCustosOS[eId] || 0) + SGO_UTILS.toNumber(m.CUSTO_TOTAL, 0);
    });

    const itens = equipamentos.map((e) => {
      const cliente = mapaClientes[SGO_UTILS.safe(e.CLIENTE_ID)] || {};
      const unidade = mapaUnidades[SGO_UTILS.safe(e.UNIDADE_ID)] || {};
      const docsEquip = mapaDocsEquip[SGO_UTILS.safe(e.ID)] || [];
      const regEquip  = mapaRegTec[SGO_UTILS.safe(e.ID)] || {};
      const pecasEquip = mapaPecas[SGO_UTILS.safe(e.ID)] || [];
      const osAtivas = mapaOSAtivas[SGO_UTILS.safe(e.ID)] || [];

      const docsCal  = docsEquip.filter(d => SGO_UTILS.safeLower(d.TIPO_DOCUMENTO || "").includes("calibra"));
      const docsQual = docsEquip.filter(d => SGO_UTILS.safeLower(d.TIPO_DOCUMENTO || "").includes("qualifica"));

      // Registros técnicos por tipo
      const regStatus = {};
      TIPOS_REG.forEach(t => { regStatus[t] = calcStatusReg_(regEquip[t] || null); });

      return {
        ID:             SGO_UTILS.safe(e.ID),
        TAG:            SGO_UTILS.safe(e.TAG),
        TIPO:           SGO_UTILS.safe(e.TIPO),
        FABRICANTE:     SGO_UTILS.safe(e.FABRICANTE),
        MODELO:         SGO_UTILS.safe(e.MODELO),
        SERIE:          SGO_UTILS.safe(e.SERIE),
        SETOR:          SGO_UTILS.safe(e.SETOR),
        STATUS:         SGO_UTILS.safe(e.STATUS),
        TIPO_POSSE:     SGO_UTILS.safe(e.TIPO_POSSE),
        PROPRIETARIO:   SGO_UTILS.safe(e.PROPRIETARIO),
        RISCO:          SGO_UTILS.safe(e.RISCO),
        CLASSE_ANVISA:  SGO_UTILS.safe(e.CLASSE_ANVISA),
        CLIENTE_ID:     SGO_UTILS.safe(e.CLIENTE_ID),
        CLIENTE_NOME:   SGO_UTILS.safe(cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || ""),
        UNIDADE_ID:     SGO_UTILS.safe(e.UNIDADE_ID),
        UNIDADE_NOME:   SGO_UTILS.safe(unidade.NOME_UNIDADE || ""),
        UNIDADE_CIDADE: SGO_UTILS.safe(unidade.CIDADE || ""),
        UNIDADE_UF:     SGO_UTILS.safe(unidade.UF || ""),
        CALIBRACAO:     calcStatusDoc_(melhorDoc_(docsCal)),
        QUALIFICACAO:   calcStatusDoc_(melhorDoc_(docsQual)),
        REG_TECNICO:    regStatus,
        PECAS_STATUS:    calcStatusPecas_(pecasEquip),
        OS_ATIVA:        osAtivas.length > 0 ? {
          total: osAtivas.length,
          numero: SGO_UTILS.safe(osAtivas[0].NUMERO_OS),
          status: SGO_UTILS.safe(osAtivas[0].STATUS),
          tipo: SGO_UTILS.safe(osAtivas[0].TIPO_OS)
        } : { total: 0, numero: "", status: "", tipo: "" },
        CUSTO_ACUMULADO: mapaCustosOS[SGO_UTILS.safe(e.ID)] || 0,
        TOTAL_DOCS:     docsEquip.length
      };
    });

    itens.sort((a, b) => a.TAG.localeCompare(b.TAG));
    itens.forEach((item, idx) => { item.IDX = idx + 1; });

    // Calcular indicadores e resolver info de filtro ANTES de usar nas próximas etapas
    const total     = itens.length;
    const calibOk   = itens.filter(i => i.CALIBRACAO.status  === "OK").length;
    const qualOk    = itens.filter(i => i.QUALIFICACAO.status === "OK").length;
    const vencendo  = itens.filter(i => i.CALIBRACAO.status  === "VENCENDO" || i.QUALIFICACAO.status === "VENCENDO").length;
    const vencidos  = itens.filter(i => i.CALIBRACAO.status  === "VENCIDO"  || i.QUALIFICACAO.status === "VENCIDO").length;
    const semDoc    = itens.filter(i => i.CALIBRACAO.status  === "SEM_DOC"  && i.QUALIFICACAO.status === "SEM_DOC").length;
    const proprios  = itens.filter(i => SGO_UTILS.safeUpper(i.TIPO_POSSE) === "PROPRIO").length;
    const locados   = itens.filter(i => SGO_UTILS.safeUpper(i.TIPO_POSSE) === "LOCADO").length;
    const comodatos = itens.filter(i => SGO_UTILS.safeUpper(i.TIPO_POSSE) === "COMODATO").length;
    const terceiros = itens.filter(i => SGO_UTILS.safeUpper(i.TIPO_POSSE) === "TERCEIRO").length;
    const osAtivaTotal = itens.filter(i => i.OS_ATIVA && i.OS_ATIVA.total > 0).length;
    const pecasVencidas = itens.filter(i => i.PECAS_STATUS && i.PECAS_STATUS.vencidas > 0).length;
    const pecasVencendo = itens.filter(i => i.PECAS_STATUS && i.PECAS_STATUS.vencendo > 0).length;
    const custoAcumulado = itens.reduce((s, i) => s + SGO_UTILS.toNumber(i.CUSTO_ACUMULADO, 0), 0);

    const clienteRaw  = filtros.clienteId ? (mapaClientes[SGO_UTILS.safe(filtros.clienteId)] || null) : null;
    const clienteInfo = clienteRaw ? {
      ID:           SGO_UTILS.safe(clienteRaw.ID),
      RAZAO_SOCIAL: SGO_UTILS.safe(clienteRaw.RAZAO_SOCIAL),
      NOME_FANTASIA:SGO_UTILS.safe(clienteRaw.NOME_FANTASIA),
      CNPJ:         SGO_UTILS.safe(clienteRaw.CNPJ),
      ENDERECO:     SGO_UTILS.safe(clienteRaw.ENDERECO),
      EMAIL:        SGO_UTILS.safe(clienteRaw.EMAIL),
      TELEFONE:     SGO_UTILS.safe(clienteRaw.TELEFONE),
      CONTATO:      SGO_UTILS.safe(clienteRaw.CONTATO)
    } : null;
    const unidadeInfo = filtros.unidadeId ? (mapaUnidades[SGO_UTILS.safe(filtros.unidadeId)] || null) : null;

    // Gera token de autenticidade e registra na aba DOC_TOKENS
    let tokenValidacao = "";
    let urlValidacao   = "";
    let qrUrl          = "";
    try {
      tokenValidacao = SGO_UTILS.uuid().replace(/-/g, "").substring(0, 20).toUpperCase();
      const nomeCliente = clienteInfo
        ? SGO_UTILS.safe(clienteInfo.NOME_FANTASIA || clienteInfo.RAZAO_SOCIAL || "")
        : "Todos os clientes";
      const cnpjCliente = clienteInfo ? SGO_UTILS.safe(clienteInfo.CNPJ || "") : "";
      const regResult = SGO_VALIDACAO.registrarInventario(tokenValidacao, {
        cliente:           nomeCliente,
        cnpj:              cnpjCliente,
        razaoSocial:       clienteInfo ? SGO_UTILS.safe(clienteInfo.RAZAO_SOCIAL)  : "",
        endereco:          clienteInfo ? SGO_UTILS.safe(clienteInfo.ENDERECO)      : "",
        telefone:          clienteInfo ? SGO_UTILS.safe(clienteInfo.TELEFONE)      : "",
        email:             clienteInfo ? SGO_UTILS.safe(clienteInfo.EMAIL)         : "",
        contato:           clienteInfo ? SGO_UTILS.safe(clienteInfo.CONTATO)       : "",
        totalEquipamentos: total,
        geradoPor:         SGO_UTILS.safe(sessao.nome || sessao.usuario),
        geradoEm:          SGO_UTILS.nowIso()
      });
      if (regResult && regResult.ok) {
        urlValidacao = regResult.urlValidacao || "";
        qrUrl        = regResult.qrUrl        || "";
      }
    } catch(e) {
      // Falha no registro do token não bloqueia a geração do inventário
    }

    SGO_DATA.log("INVENTARIO_GERAR", sessao.usuario, "Inventário gerado. Total=" + total + " Token=" + tokenValidacao, "INVENTARIO");

    return {
      success: true,
      geradoEm:       SGO_UTILS.nowIso(),
      geradoPor:      SGO_UTILS.safe(sessao.nome || sessao.usuario),
      tokenValidacao,
      urlValidacao,
      qrUrl,
      clienteInfo,
      unidadeInfo,
      indicadores: {
        total,
        calibOk,       calibPct:  total > 0 ? Math.round((calibOk  / total) * 100) : 0,
        qualOk,        qualPct:   total > 0 ? Math.round((qualOk   / total) * 100) : 0,
        vencendo,
        vencidos,
        semDoc,
        proprios, locados, comodatos, terceiros,
        osAtivaTotal,
        pecasVencidas,
        pecasVencendo,
        custoAcumulado
      },
      itens,
      filtros
    };
  }

  // =========================
  // HELPERS DE LISTAGEM
  // =========================
  function listarClientesAtivos(sessionId) {
    exigirSessao(sessionId);
    const itens = SGO_DATA.getAll(SHEET_CLI)
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === STATUS_ATIVO)
      .map(c => ({ ID: SGO_UTILS.safe(c.ID), NOME: SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL) }))
      .sort((a, b) => a.NOME.localeCompare(b.NOME));
    return { success: true, items: itens };
  }

  function listarUnidadesAtivasPorCliente(sessionId, clienteId) {
    exigirSessao(sessionId);
    const itens = SGO_DATA.getAll(SHEET_UNI)
      .filter(u => SGO_UTILS.safeUpper(u.STATUS) === STATUS_ATIVO && SGO_UTILS.safe(u.CLIENTE_ID) === SGO_UTILS.safe(clienteId))
      .map(u => ({ ID: SGO_UTILS.safe(u.ID), NOME_UNIDADE: SGO_UTILS.safe(u.NOME_UNIDADE) }))
      .sort((a, b) => a.NOME_UNIDADE.localeCompare(b.NOME_UNIDADE));
    return { success: true, items: itens };
  }

  return { gerarInventario, listarClientesAtivos, listarUnidadesAtivasPorCliente };
})();

/* =========================
   WRAPPERS BLINDADOS
========================= */
function inventarioGerar(sessionId, filtros) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.gerarInventario(sessionId, filtros))); }
  catch(e) { return { success: false, message: "Erro ao gerar inventário: " + e.message }; }
}
function inventarioListarClientesAtivos(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarClientesAtivos(sessionId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function inventarioListarUnidadesAtivasPorCliente(sessionId, clienteId) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarUnidadesAtivasPorCliente(sessionId, clienteId))); }
  catch(e) { return { success: false, message: e.message }; }
}
