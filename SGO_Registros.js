const SGO_REGISTROS = (() => {
  const SHEET = sgoGetCfgSafe_().SHEETS.REG_TECNICO;
  const SHEET_EQP = sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_CLI = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;

  const TIPOS_SERVICO = [
    "CALIBRACAO",
    "QUALIFICACAO",
    "ENSAIO_ELETRICO",
    "MANUTENCAO_PREVENTIVA",
    "MANUTENCAO_CORRETIVA",
    "INSPECAO_SEGURANCA"
  ];

  function _parseDateSafe(v) {
    if (!v) return null;
    const s = String(v).trim().substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  function _statusVencimento(dataValidade) {
    if (!dataValidade) return "SEM_VENCIMENTO";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias = Math.ceil((dataValidade - hoje) / 86400000);
    if (dias < 0) return "VENCIDO";
    if (dias <= 30) return "VENCENDO";
    return "OK";
  }

  function _validarAcesso(sessao, registro) {
    if (!sessao || !registro) return false;
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE") return true;
    return SGO_UTILS.safe(registro.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId);
  }

  // ── LISTAR por equipamento ────────────────────────────────────────────────
  function listar(sessionId, equipamentoId) {
    const sessao = exigirSessao(sessionId);
    const eqpId = SGO_UTILS.safe(equipamentoId);

    const todos = SGO_DATA.getAll(SHEET).filter(r =>
      SGO_UTILS.safe(r.EQUIPAMENTO_ID) === eqpId &&
      SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO
    );

    const registros = todos
      .filter(r => _validarAcesso(sessao, r))
      .map(r => {
        const dataV = _parseDateSafe(r.DATA_VALIDADE);
        return Object.assign({}, r, {
          STATUS_VENCIMENTO: _statusVencimento(dataV)
        });
      })
      .sort((a, b) => {
        if (a.TIPO_SERVICO < b.TIPO_SERVICO) return -1;
        if (a.TIPO_SERVICO > b.TIPO_SERVICO) return 1;
        const da = a.DATA_REALIZADO || "";
        const db = b.DATA_REALIZADO || "";
        return db.localeCompare(da);
      });

    return { success: true, items: registros };
  }

  // ── RESUMO por equipamento (último de cada tipo) ──────────────────────────
  function resumoEquipamento(sessionId, equipamentoId) {
    const sessao = exigirSessao(sessionId);
    const eqpId = SGO_UTILS.safe(equipamentoId);

    const todos = SGO_DATA.getAll(SHEET).filter(r =>
      SGO_UTILS.safe(r.EQUIPAMENTO_ID) === eqpId &&
      SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO &&
      _validarAcesso(sessao, r)
    );

    const mapa = {};
    TIPOS_SERVICO.forEach(t => { mapa[t] = null; });

    todos.forEach(r => {
      const tipo = SGO_UTILS.safeUpper(r.TIPO_SERVICO);
      if (!mapa[tipo]) {
        mapa[tipo] = r;
      } else {
        const dataAtual = r.DATA_REALIZADO || "";
        const dataExist = mapa[tipo].DATA_REALIZADO || "";
        if (dataAtual > dataExist) mapa[tipo] = r;
      }
    });

    const resultado = {};
    Object.keys(mapa).forEach(tipo => {
      const reg = mapa[tipo];
      const dataV = reg ? _parseDateSafe(reg.DATA_VALIDADE) : null;
      resultado[tipo] = {
        existe: !!reg,
        ultimaData: reg ? reg.DATA_REALIZADO : null,
        validade: reg ? reg.DATA_VALIDADE : null,
        statusVencimento: _statusVencimento(dataV),
        numeroCertificado: reg ? reg.NUMERO_CERTIFICADO : null
      };
    });

    return { success: true, resumo: resultado };
  }

  // ── LISTAR VENCIMENTOS (dashboard / alertas) ──────────────────────────────
  function listarVencimentos(sessionId) {
    const sessao = exigirSessao(sessionId);
    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const idClienteReal = isCliente ? SGO_UTILS.safe(sessao.clienteId) : "";

    const equipamentos = SGO_DATA.getAll(SHEET_EQP);
    const mapaEqp = {};
    equipamentos.forEach(e => { mapaEqp[SGO_UTILS.safe(e.ID)] = e; });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diasAviso = (sgoGetCfgSafe_().ALERTAS && sgoGetCfgSafe_().ALERTAS.DIAS_ANTECEDENCIA_PADRAO) || 30;

    const registros = SGO_DATA.getAll(SHEET).filter(r =>
      SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO
    );

    const alertas = [];
    registros.forEach(r => {
      if (isCliente && SGO_UTILS.safe(r.CLIENTE_ID) !== idClienteReal) return;
      if (!r.DATA_VALIDADE) return;

      const dataV = _parseDateSafe(r.DATA_VALIDADE);
      if (!dataV) return;
      const dias = Math.ceil((dataV - hoje) / 86400000);
      if (dias > diasAviso) return;

      const eqp = mapaEqp[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
      alertas.push({
        registroId: SGO_UTILS.safe(r.ID),
        equipamentoId: SGO_UTILS.safe(r.EQUIPAMENTO_ID),
        equipamentoTag: SGO_UTILS.safe(eqp.TAG) || "—",
        equipamentoTipo: SGO_UTILS.safe(eqp.TIPO) || "—",
        tipoServico: SGO_UTILS.safe(r.TIPO_SERVICO),
        dataValidade: SGO_UTILS.safe(r.DATA_VALIDADE),
        dias: dias,
        statusVencimento: dias < 0 ? "VENCIDO" : "VENCENDO",
        clienteId: SGO_UTILS.safe(r.CLIENTE_ID)
      });
    });

    alertas.sort((a, b) => a.dias - b.dias);
    return { success: true, items: alertas };
  }

  // ── CRIAR ─────────────────────────────────────────────────────────────────
  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    const dados = normalizarPayload_(payload);
    if (!dados.EQUIPAMENTO_ID) return { success: false, message: "Equipamento não informado." };
    if (!dados.TIPO_SERVICO) return { success: false, message: "Tipo de serviço não informado." };
    if (!dados.DATA_REALIZADO) return { success: false, message: "Data de realização obrigatória." };

    const eqp = SGO_DATA.getById(SHEET_EQP, dados.EQUIPAMENTO_ID);
    if (!eqp) return { success: false, message: "Equipamento não encontrado." };

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET,
      SGO_DATA.gerarRegistroBase({
        EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
        CLIENTE_ID: SGO_UTILS.safe(eqp.CLIENTE_ID),
        UNIDADE_ID: SGO_UTILS.safe(eqp.UNIDADE_ID),
        TIPO_SERVICO: dados.TIPO_SERVICO,
        DATA_REALIZADO: dados.DATA_REALIZADO,
        DATA_VALIDADE: dados.DATA_VALIDADE,
        NUMERO_CERTIFICADO: dados.NUMERO_CERTIFICADO,
        EMPRESA_RESPONSAVEL: dados.EMPRESA_RESPONSAVEL,
        TECNICO: dados.TECNICO,
        RESULTADO: dados.RESULTADO,
        OBSERVACOES: dados.OBSERVACOES,
        LINK_DOCUMENTO: dados.LINK_DOCUMENTO,
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET, registro);
    SGO_DATA.log("REG_TECNICO_CRIAR", sessao.usuario,
      "Registro criado: " + dados.TIPO_SERVICO + " | Eqp=" + dados.EQUIPAMENTO_ID, "REG_TECNICO");

    return { success: true, message: "Registro criado com sucesso." };
  }

  // ── ATUALIZAR ─────────────────────────────────────────────────────────────
  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado." };
    }

    const regId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET, regId);
    if (!atual) return { success: false, message: "Registro não encontrado." };

    const dados = normalizarPayload_(payload);

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET, {
      ID: regId,
      EQUIPAMENTO_ID: atual.EQUIPAMENTO_ID,
      CLIENTE_ID: atual.CLIENTE_ID,
      UNIDADE_ID: atual.UNIDADE_ID,
      TIPO_SERVICO: dados.TIPO_SERVICO || atual.TIPO_SERVICO,
      DATA_REALIZADO: dados.DATA_REALIZADO,
      DATA_VALIDADE: dados.DATA_VALIDADE,
      NUMERO_CERTIFICADO: dados.NUMERO_CERTIFICADO,
      EMPRESA_RESPONSAVEL: dados.EMPRESA_RESPONSAVEL,
      TECNICO: dados.TECNICO,
      RESULTADO: dados.RESULTADO,
      OBSERVACOES: dados.OBSERVACOES,
      LINK_DOCUMENTO: dados.LINK_DOCUMENTO,
      STATUS: atual.STATUS,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET, regId, novosDados);
    if (ok) SGO_DATA.log("REG_TECNICO_ATUALIZAR", sessao.usuario, "Registro atualizado ID=" + regId, "REG_TECNICO");

    return ok
      ? { success: true, message: "Atualizado com sucesso." }
      : { success: false, message: "Erro ao atualizar." };
  }

  // ── EXCLUIR ───────────────────────────────────────────────────────────────
  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!isAdminSession(sessionId)) return { success: false, message: "Acesso negado." };

    SGO_DATA.remove(SHEET, SGO_UTILS.safe(id));
    SGO_DATA.log("REG_TECNICO_EXCLUIR", sessao.usuario, "Registro excluído ID=" + id, "REG_TECNICO");
    return { success: true };
  }

  // ── STATS DASHBOARD ───────────────────────────────────────────────────────
  function obterStatsDashboard(sessionId) {
    try {
      const sessao = exigirSessao(sessionId);
      const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
      const idClienteReal = isCliente ? SGO_UTILS.safe(sessao.clienteId) : "";

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const diasAviso = (sgoGetCfgSafe_().ALERTAS && sgoGetCfgSafe_().ALERTAS.DIAS_ANTECEDENCIA_PADRAO) || 30;

      const registros = SGO_DATA.getAll(SHEET).filter(r =>
        SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO &&
        (!isCliente || SGO_UTILS.safe(r.CLIENTE_ID) === idClienteReal)
      );

      let ok = 0, vencendo = 0, vencidos = 0, semValidade = 0;
      const porTipo = {};
      TIPOS_SERVICO.forEach(t => { porTipo[t] = { ok: 0, vencendo: 0, vencidos: 0 }; });

      registros.forEach(r => {
        const tipo = SGO_UTILS.safeUpper(r.TIPO_SERVICO);
        const dataV = _parseDateSafe(r.DATA_VALIDADE);
        if (!dataV) { semValidade++; return; }
        const dias = Math.ceil((dataV - hoje) / 86400000);
        const bucket = porTipo[tipo] || { ok: 0, vencendo: 0, vencidos: 0 };
        if (dias < 0) { vencidos++; bucket.vencidos++; }
        else if (dias <= diasAviso) { vencendo++; bucket.vencendo++; }
        else { ok++; bucket.ok++; }
        if (!porTipo[tipo]) porTipo[tipo] = bucket;
      });

      return {
        success: true,
        total: registros.length,
        ok, vencendo, vencidos, semValidade,
        porTipo
      };
    } catch(e) {
      return { success: false, message: e.message };
    }
  }

  // ── PRONTUÁRIO COMPLETO do equipamento ───────────────────────────────────
  function prontuario(sessionId, equipamentoId) {
    const sessao = exigirSessao(sessionId);
    const eqpId  = SGO_UTILS.safe(equipamentoId);

    const eqp = SGO_DATA.getById(SHEET_EQP, eqpId);
    if (!eqp) return { success: false, message: "Equipamento não encontrado." };
    if (!_validarAcesso(sessao, { CLIENTE_ID: eqp.CLIENTE_ID })) {
      return { success: false, message: "Acesso negado." };
    }

    let cliente = {};
    try { cliente = SGO_DATA.getById(SHEET_CLI, SGO_UTILS.safe(eqp.CLIENTE_ID)) || {}; } catch(e) {}

    let unidade = {};
    try { unidade = SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, SGO_UTILS.safe(eqp.UNIDADE_ID)) || {}; } catch(e) {}

    const historico = SGO_DATA.getAll(SHEET)
      .filter(r =>
        SGO_UTILS.safe(r.EQUIPAMENTO_ID) === eqpId &&
        SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO
      )
      .map(r => {
        const dataV = _parseDateSafe(r.DATA_VALIDADE);
        return Object.assign({}, r, { STATUS_VENCIMENTO: _statusVencimento(dataV) });
      })
      .sort((a, b) => {
        if (a.TIPO_SERVICO !== b.TIPO_SERVICO) return a.TIPO_SERVICO < b.TIPO_SERVICO ? -1 : 1;
        return (b.DATA_REALIZADO || "").localeCompare(a.DATA_REALIZADO || "");
      });

    const resumo = {};
    TIPOS_SERVICO.forEach(t => { resumo[t] = null; });
    historico.forEach(r => {
      const t = SGO_UTILS.safeUpper(r.TIPO_SERVICO);
      if (!resumo[t] || r.DATA_REALIZADO > (resumo[t].DATA_REALIZADO || "")) resumo[t] = r;
    });

    return {
      success:     true,
      equipamento: eqp,
      cliente:     cliente,
      unidade:     unidade,
      historico:   historico,
      resumo:      resumo,
      geradoEm:    SGO_UTILS.nowIso(),
      geradoPor:   SGO_UTILS.safe(sessao.nome || sessao.usuario)
    };
  }

  // ── NORMALIZAR PAYLOAD ────────────────────────────────────────────────────
  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      TIPO_SERVICO: SGO_UTILS.safeUpper(payload.TIPO_SERVICO),
      DATA_REALIZADO: SGO_UTILS.safe(payload.DATA_REALIZADO),
      DATA_VALIDADE: SGO_UTILS.safe(payload.DATA_VALIDADE),
      NUMERO_CERTIFICADO: SGO_UTILS.safe(payload.NUMERO_CERTIFICADO),
      EMPRESA_RESPONSAVEL: SGO_UTILS.safe(payload.EMPRESA_RESPONSAVEL),
      TECNICO: SGO_UTILS.safe(payload.TECNICO),
      RESULTADO: SGO_UTILS.safeUpper(payload.RESULTADO),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      LINK_DOCUMENTO: SGO_UTILS.safe(payload.LINK_DOCUMENTO)
    };
  }

  // ── RELATÓRIO DE CONFORMIDADE ─────────────────────────────────────────────
  function gerarRelatorioConformidade(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    filtros = filtros || {};
    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const clienteIdFiltro = isCliente
      ? SGO_UTILS.safe(sessao.clienteId)
      : SGO_UTILS.safe(filtros.clienteId) || "";

    // Carregar dados base
    const todosEquip = SGO_DATA.getAll(SHEET_EQP).filter(function(e) {
      return SGO_UTILS.safeUpper(e.STATUS) === STATUS_ATIVO &&
             (!clienteIdFiltro || SGO_UTILS.safe(e.CLIENTE_ID) === clienteIdFiltro);
    });

    let mapaClientes = {};
    try {
      SGO_DATA.getAll(SHEET_CLI).forEach(function(c) {
        mapaClientes[SGO_UTILS.safe(c.ID)] = c;
      });
    } catch(e) {}

    // Última ocorrência de cada tipo por equipamento
    const mapaUltimo = {};
    SGO_DATA.getAll(SHEET)
      .filter(function(r) { return SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO; })
      .forEach(function(r) {
        const eqpId = SGO_UTILS.safe(r.EQUIPAMENTO_ID);
        const tipo  = SGO_UTILS.safeUpper(r.TIPO_SERVICO);
        if (!mapaUltimo[eqpId]) mapaUltimo[eqpId] = {};
        const atual = mapaUltimo[eqpId][tipo];
        if (!atual || r.DATA_REALIZADO > (atual.DATA_REALIZADO || "")) {
          const dataV = _parseDateSafe(r.DATA_VALIDADE);
          mapaUltimo[eqpId][tipo] = Object.assign({}, r, { STATUS_VENCIMENTO: _statusVencimento(dataV) });
        }
      });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Construir itens de equipamentos com status por tipo
    const itens = todosEquip.map(function(eqp) {
      const eqpId = SGO_UTILS.safe(eqp.ID);
      const cli   = mapaClientes[SGO_UTILS.safe(eqp.CLIENTE_ID)] || {};
      const porTipo = {};
      TIPOS_SERVICO.forEach(function(t) {
        const reg = mapaUltimo[eqpId] && mapaUltimo[eqpId][t];
        porTipo[t] = reg ? reg.STATUS_VENCIMENTO : "SEM_REG";
      });
      return {
        id:           eqpId,
        tag:          SGO_UTILS.safe(eqp.TAG),
        tipo:         SGO_UTILS.safe(eqp.TIPO),
        fabricante:   SGO_UTILS.safe(eqp.FABRICANTE),
        clienteId:    SGO_UTILS.safe(eqp.CLIENTE_ID),
        clienteNome:  SGO_UTILS.safe(cli.NOME_FANTASIA || cli.RAZAO_SOCIAL),
        porTipo:      porTipo,
        risco:        SGO_UTILS.safe(eqp.RISCO),
        classeAnvisa: SGO_UTILS.safe(eqp.CLASSE_ANVISA)
      };
    });

    // Agregar por cliente
    const porClienteMap = {};
    itens.forEach(function(item) {
      const cid = item.clienteId || "__SEM_CLIENTE__";
      if (!porClienteMap[cid]) {
        porClienteMap[cid] = {
          clienteId:   cid,
          clienteNome: item.clienteNome || "Sem cliente",
          totalEqp:    0,
          porTipo:     {}
        };
        TIPOS_SERVICO.forEach(function(t) {
          porClienteMap[cid].porTipo[t] = { ok: 0, vencendo: 0, vencido: 0, semReg: 0, total: 0 };
        });
      }
      const entry = porClienteMap[cid];
      entry.totalEqp++;
      TIPOS_SERVICO.forEach(function(t) {
        const sv = item.porTipo[t];
        const bucket = entry.porTipo[t];
        bucket.total++;
        if (sv === "OK")       bucket.ok++;
        else if (sv === "VENCENDO") bucket.vencendo++;
        else if (sv === "VENCIDO")  bucket.vencido++;
        else                        bucket.semReg++;
      });
    });

    // Totais gerais
    const totaisGerais = { totalEqp: itens.length, porTipo: {} };
    TIPOS_SERVICO.forEach(function(t) {
      totaisGerais.porTipo[t] = { ok: 0, vencendo: 0, vencido: 0, semReg: 0, total: itens.length };
    });
    itens.forEach(function(item) {
      TIPOS_SERVICO.forEach(function(t) {
        const sv = item.porTipo[t];
        const bucket = totaisGerais.porTipo[t];
        if (sv === "OK")       bucket.ok++;
        else if (sv === "VENCENDO") bucket.vencendo++;
        else if (sv === "VENCIDO")  bucket.vencido++;
        else                        bucket.semReg++;
      });
    });

    return {
      success:     true,
      itens:       itens,
      porCliente:  Object.values(porClienteMap),
      totaisGerais: totaisGerais,
      tipos:       TIPOS_SERVICO,
      geradoEm:    SGO_UTILS.nowIso()
    };
  }

  return {
    listar, resumoEquipamento, listarVencimentos,
    criar, atualizar, excluir,
    obterStatsDashboard, prontuario, gerarRelatorioConformidade,
    TIPOS_SERVICO
  };
})();

/* =========================
   WRAPPERS PÚBLICOS
========================= */
function registrosListar(sessionId, equipamentoId) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.listar(sessionId, equipamentoId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosResumoEquipamento(sessionId, equipamentoId) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.resumoEquipamento(sessionId, equipamentoId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosListarVencimentos(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.listarVencimentos(sessionId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosCriar(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.criar(sessionId, payload))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosAtualizar(sessionId, id, payload) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.atualizar(sessionId, id, payload))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosExcluir(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.excluir(sessionId, id))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosObterStats(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.obterStatsDashboard(sessionId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosProntuario(sessionId, equipamentoId) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.prontuario(sessionId, equipamentoId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function registrosRelatorioConformidade(sessionId, filtros) {
  try { return JSON.parse(JSON.stringify(SGO_REGISTROS.gerarRelatorioConformidade(sessionId, filtros || {}))); }
  catch(e) { return { success: false, message: e.message }; }
}
