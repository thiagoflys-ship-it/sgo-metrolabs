const SGO_CONTRATOS = (() => {
  const SHEET = sgoGetCfgSafe_().SHEETS.CAD_CONTRATOS;
  const SHEET_EQP_REL = sgoGetCfgSafe_().SHEETS.CAD_CONTRATOS_EQP;
  const SHEET_CLI = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const SHEET_EQP = sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;
  const STATUS_INATIVO = sgoGetCfgSafe_().STATUS.INATIVO;

  function podeEditar_(sessao) {
    const p = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return ["ADMIN", "DIRETORIA", "GESTOR", "COMERCIAL", "FINANCEIRO"].indexOf(p) >= 0;
  }

  function validarAcesso_(sessao, contrato) {
    if (!sessao || !contrato) return false;
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE") return true;
    return SGO_UTILS.safe(contrato.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId);
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let contratos = SGO_DATA.getAll(SHEET);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      contratos = contratos.filter(c => SGO_UTILS.safe(c.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId));
    }

    const clientes = montarMapa_(SGO_DATA.getAll(SHEET_CLI));
    const rels = SGO_DATA.getAll(SHEET_EQP_REL);
    const totalPorContrato = {};
    rels.forEach(r => {
      const id = SGO_UTILS.safe(r.CONTRATO_ID);
      totalPorContrato[id] = (totalPorContrato[id] || 0) + 1;
    });

    const items = contratos.map(c => enriquecer_(c, clientes, totalPorContrato))
      .sort((a, b) => SGO_UTILS.safe(a.NUMERO_CONTRATO).localeCompare(SGO_UTILS.safe(b.NUMERO_CONTRATO)));

    return { success: true, items: items, total: items.length };
  }

  function pesquisar(sessionId, termo) {
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    if (!q) return { success: true, items: base, total: base.length };

    const items = base.filter(c => [
      c.NUMERO_CONTRATO, c.TIPO_CONTRATO, c.OBJETO, c.CLIENTE_NOME,
      c.RESPONSAVEL_CLIENTE, c.CONTATO_CLIENTE, c.STATUS
    ].some(v => SGO_UTILS.safeLower(v).indexOf(q) >= 0));

    return { success: true, items: items, total: items.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const contrato = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id));
    if (!contrato) return { success: false, message: "Contrato nao encontrado." };
    if (!validarAcesso_(sessao, contrato)) return { success: false, message: "Acesso negado." };

    const clientes = montarMapa_(SGO_DATA.getAll(SHEET_CLI));
    const rels = SGO_DATA.getManyByField(SHEET_EQP_REL, "CONTRATO_ID", contrato.ID);
    return {
      success: true,
      item: enriquecer_(contrato, clientes, { [contrato.ID]: rels.length }),
      equipamentos: rels
    };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };

    const dados = normalizarPayload_(payload);
    validarCliente_(dados.CLIENTE_ID);

    const registro = SGO_DATA.gerarRegistroBase(Object.assign({}, dados, { STATUS: STATUS_ATIVO }));
    SGO_DATA.insert(SHEET, registro);
    salvarEquipamentosCobertos_(registro.ID, dados.EQUIPAMENTOS || []);

    SGO_DATA.log("CONTRATOS_CRIAR", sessao.usuario, "Contrato criado: " + registro.NUMERO_CONTRATO, "CONTRATOS");
    return { success: true, message: "Contrato criado com sucesso.", item: registro };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };

    const contratoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET, contratoId);
    if (!atual) return { success: false, message: "Contrato nao encontrado." };

    const dados = normalizarPayload_(payload);
    validarCliente_(dados.CLIENTE_ID);

    const ok = SGO_DATA.update(SHEET, contratoId, Object.assign({}, dados, {
      STATUS: atual.STATUS || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    }));

    if (ok) {
      salvarEquipamentosCobertos_(contratoId, dados.EQUIPAMENTOS || []);
      SGO_DATA.log("CONTRATOS_ATUALIZAR", sessao.usuario, "Contrato atualizado ID=" + contratoId, "CONTRATOS");
    }

    return ok ? { success: true, message: "Contrato atualizado com sucesso." } : { success: false, message: "Erro ao atualizar contrato." };
  }

  function inativar(sessionId, id) {
    return alterarStatus_(sessionId, id, STATUS_INATIVO);
  }

  function reativar(sessionId, id) {
    return alterarStatus_(sessionId, id, STATUS_ATIVO);
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN") return { success: false, message: "Apenas ADMIN pode excluir contratos." };
    const contratoId = SGO_UTILS.safe(id);
    removerVinculos_(contratoId);
    const ok = SGO_DATA.remove(SHEET, contratoId);
    return ok ? { success: true } : { success: false, message: "Contrato nao encontrado." };
  }

  function alterarStatus_(sessionId, id, status) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };
    const ok = SGO_DATA.update(SHEET, SGO_UTILS.safe(id), { STATUS: status });
    return ok ? { success: true } : { success: false, message: "Contrato nao encontrado." };
  }

  function listarClientesAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    let clientes = SGO_DATA.getAll(SHEET_CLI);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      clientes = clientes.filter(c => SGO_UTILS.safe(c.ID) === SGO_UTILS.safe(sessao.clienteId));
    }
    const items = clientes
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === STATUS_ATIVO)
      .map(c => ({ ID: c.ID, NOME: c.NOME_FANTASIA || c.RAZAO_SOCIAL || "" }))
      .sort((a, b) => SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)));
    return { success: true, items: items };
  }

  function listarEquipamentosPorCliente(sessionId, clienteId) {
    const sessao = exigirSessao(sessionId);
    const cliId = SGO_UTILS.safe(clienteId);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE" && cliId !== SGO_UTILS.safe(sessao.clienteId)) {
      return { success: false, message: "Acesso negado." };
    }
    const items = SGO_DATA.getAll(SHEET_EQP)
      .filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === cliId && SGO_UTILS.safeUpper(e.STATUS) === STATUS_ATIVO)
      .map(e => ({ ID: e.ID, LABEL: [e.TAG, e.TIPO, e.MODELO].filter(Boolean).join(" - ") }))
      .sort((a, b) => SGO_UTILS.safe(a.LABEL).localeCompare(SGO_UTILS.safe(b.LABEL)));
    return { success: true, items: items };
  }

  function salvarEquipamentosCobertos_(contratoId, equipamentos) {
    removerVinculos_(contratoId);
    const rows = (equipamentos || [])
      .map(e => ({
        id: SGO_UTILS.safe(typeof e === "string" ? e : e.EQUIPAMENTO_ID),
        tipo: SGO_UTILS.safeUpper(typeof e === "string" ? "TOTAL" : (e.TIPO_COBERTURA || "TOTAL"))
      }))
      .filter(e => !!e.id)
      .map(e => SGO_DATA.gerarRegistroBase({
        CONTRATO_ID: contratoId,
        EQUIPAMENTO_ID: e.id,
        TIPO_COBERTURA: e.tipo || "TOTAL"
      }));
    if (rows.length) SGO_DATA.insertMany(SHEET_EQP_REL, rows);
  }

  function removerVinculos_(contratoId) {
    const rels = SGO_DATA.getAll(SHEET_EQP_REL);
    for (let i = rels.length - 1; i >= 0; i--) {
      if (SGO_UTILS.safe(rels[i].CONTRATO_ID) === SGO_UTILS.safe(contratoId)) {
        SGO_DATA.remove(SHEET_EQP_REL, rels[i].ID);
      }
    }
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      NUMERO_CONTRATO: SGO_UTILS.safeUpper(payload.NUMERO_CONTRATO),
      TIPO_CONTRATO: SGO_UTILS.safeUpper(payload.TIPO_CONTRATO),
      OBJETO: SGO_UTILS.safe(payload.OBJETO),
      DATA_INICIO: SGO_UTILS.safe(payload.DATA_INICIO),
      DATA_FIM: SGO_UTILS.safe(payload.DATA_FIM),
      DATA_RENOVACAO_ALERTA: SGO_UTILS.safe(payload.DATA_RENOVACAO_ALERTA),
      VALOR_MENSAL: SGO_UTILS.safe(payload.VALOR_MENSAL),
      VALOR_TOTAL: SGO_UTILS.safe(payload.VALOR_TOTAL),
      MOEDA: SGO_UTILS.safeUpper(payload.MOEDA || "BRL"),
      RESPONSAVEL_CLIENTE: SGO_UTILS.safe(payload.RESPONSAVEL_CLIENTE),
      CONTATO_CLIENTE: SGO_UTILS.safe(payload.CONTATO_CLIENTE),
      LINK_CONTRATO: SGO_UTILS.safe(payload.LINK_CONTRATO),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      EQUIPAMENTOS: Array.isArray(payload.EQUIPAMENTOS) ? payload.EQUIPAMENTOS : []
    };
  }

  function validarCliente_(clienteId) {
    if (!SGO_DATA.getById(SHEET_CLI, clienteId)) throw new Error("Cliente nao encontrado.");
  }

  function enriquecer_(c, mapaClientes, totalPorContrato) {
    const cli = mapaClientes[SGO_UTILS.safe(c.CLIENTE_ID)] || {};
    return Object.assign({}, c, {
      CLIENTE_NOME: cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "",
      EQUIPAMENTOS_COBERTOS: totalPorContrato[SGO_UTILS.safe(c.ID)] || 0
    });
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(i => mapa[SGO_UTILS.safe(i.ID)] = i);
    return mapa;
  }

  return { listar, pesquisar, obter, criar, atualizar, inativar, reativar, excluir, listarClientesAtivos, listarEquipamentosPorCliente };
})();

function contratosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosInativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosReativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosExcluir(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosListarClientesAtivos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function contratosListarEquipamentosPorCliente(sessionId, clienteId) { try { return JSON.parse(JSON.stringify(SGO_CONTRATOS.listarEquipamentosPorCliente(sessionId, clienteId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
