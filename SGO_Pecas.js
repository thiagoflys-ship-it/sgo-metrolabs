const SGO_PECAS = (() => {
  const SHEET = sgoGetCfgSafe_().SHEETS.CAD_PECAS;
  const SHEET_EQP = sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_CLI = sgoGetCfgSafe_().SHEETS.CAD_CLIENTES;
  const SHEET_UNI = sgoGetCfgSafe_().SHEETS.CAD_UNIDADES;
  const STATUS_ATIVO = sgoGetCfgSafe_().STATUS.ATIVO;
  const STATUS_INATIVO = sgoGetCfgSafe_().STATUS.INATIVO;

  function podeEditar_(sessao) {
    const p = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return ["ADMIN", "GESTOR", "METROLOGIA"].indexOf(p) >= 0;
  }

  function validarAcesso_(sessao, item) {
    if (!sessao || !item) return false;
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE") return true;
    return SGO_UTILS.safe(item.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId);
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let pecas = SGO_DATA.getAll(SHEET);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      pecas = pecas.filter(p => SGO_UTILS.safe(p.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId));
    }

    const mapas = getMapas_();
    const items = pecas
      .map(p => enriquecer_(p, mapas))
      .sort((a, b) => SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)));

    return { success: true, items: items, total: items.length };
  }

  function pesquisar(sessionId, termo) {
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    if (!q) return { success: true, items: base, total: base.length };

    const items = base.filter(function(p) {
      return [
        p.NOME, p.TIPO_PECA, p.FABRICANTE, p.MODELO, p.REFERENCIA,
        p.NUMERO_SERIE, p.LOTE, p.EQUIPAMENTO_TAG, p.CLIENTE_NOME, p.UNIDADE_NOME
      ].some(v => SGO_UTILS.safeLower(v).indexOf(q) >= 0);
    });

    return { success: true, items: items, total: items.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const item = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id));
    if (!item) return { success: false, message: "Peca nao encontrada." };
    if (!validarAcesso_(sessao, item)) return { success: false, message: "Acesso negado." };
    return { success: true, item: enriquecer_(item, getMapas_()) };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };

    const dados = normalizarPayload_(payload);
    const eqp = validarEquipamento_(dados.EQUIPAMENTO_ID);

    const registro = SGO_DATA.gerarRegistroBase(Object.assign({}, dados, {
      CLIENTE_ID: eqp.CLIENTE_ID,
      UNIDADE_ID: eqp.UNIDADE_ID,
      QR_TOKEN: dados.QR_TOKEN || SGO_UTILS.uuid(),
      STATUS: STATUS_ATIVO
    }));

    SGO_DATA.insert(SHEET, registro);
    SGO_DATA.log("PECAS_CRIAR", sessao.usuario, "Peca criada: " + registro.NOME, "PECAS");

    return { success: true, message: "Peca criada com sucesso.", item: registro };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };

    const pecaId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET, pecaId);
    if (!atual) return { success: false, message: "Peca nao encontrada." };

    const dados = normalizarPayload_(payload);
    const eqp = validarEquipamento_(dados.EQUIPAMENTO_ID);

    const ok = SGO_DATA.update(SHEET, pecaId, Object.assign({}, dados, {
      CLIENTE_ID: eqp.CLIENTE_ID,
      UNIDADE_ID: eqp.UNIDADE_ID,
      QR_TOKEN: atual.QR_TOKEN || SGO_UTILS.uuid(),
      STATUS: atual.STATUS || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    }));

    if (ok) SGO_DATA.log("PECAS_ATUALIZAR", sessao.usuario, "Peca atualizada ID=" + pecaId, "PECAS");
    return ok ? { success: true, message: "Peca atualizada com sucesso." } : { success: false, message: "Erro ao atualizar peca." };
  }

  function inativar(sessionId, id) {
    return alterarStatus_(sessionId, id, STATUS_INATIVO);
  }

  function reativar(sessionId, id) {
    return alterarStatus_(sessionId, id, STATUS_ATIVO);
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN") return { success: false, message: "Apenas ADMIN pode excluir pecas." };
    const ok = SGO_DATA.remove(SHEET, SGO_UTILS.safe(id));
    return ok ? { success: true } : { success: false, message: "Peca nao encontrada." };
  }

  function alterarStatus_(sessionId, id, status) {
    const sessao = exigirSessao(sessionId);
    if (!podeEditar_(sessao)) return { success: false, message: "Acesso negado." };
    const ok = SGO_DATA.update(SHEET, SGO_UTILS.safe(id), { STATUS: status });
    return ok ? { success: true } : { success: false, message: "Peca nao encontrada." };
  }

  function listarEquipamentosAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    let equipamentos = SGO_DATA.getAll(SHEET_EQP);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId));
    }
    const mapas = getMapas_();
    const items = equipamentos
      .filter(e => SGO_UTILS.safeUpper(e.STATUS) === STATUS_ATIVO)
      .map(e => {
        const cli = mapas.clientes[SGO_UTILS.safe(e.CLIENTE_ID)] || {};
        const uni = mapas.unidades[SGO_UTILS.safe(e.UNIDADE_ID)] || {};
        return {
          ID: SGO_UTILS.safe(e.ID),
          LABEL: [e.TAG, e.TIPO, cli.NOME_FANTASIA || cli.RAZAO_SOCIAL, uni.NOME_UNIDADE].filter(Boolean).join(" - "),
          CLIENTE_ID: SGO_UTILS.safe(e.CLIENTE_ID),
          UNIDADE_ID: SGO_UTILS.safe(e.UNIDADE_ID)
        };
      });
    return { success: true, items: items };
  }

  function validarEquipamento_(equipamentoId) {
    const eqp = SGO_DATA.getById(SHEET_EQP, SGO_UTILS.safe(equipamentoId));
    if (!eqp) throw new Error("Equipamento nao encontrado.");
    return eqp;
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      NOME: SGO_UTILS.safeUpper(payload.NOME),
      TIPO_PECA: SGO_UTILS.safeUpper(payload.TIPO_PECA),
      FABRICANTE: SGO_UTILS.safeUpper(payload.FABRICANTE),
      MODELO: SGO_UTILS.safeUpper(payload.MODELO),
      REFERENCIA: SGO_UTILS.safeUpper(payload.REFERENCIA),
      NUMERO_SERIE: SGO_UTILS.safeUpper(payload.NUMERO_SERIE),
      LOTE: SGO_UTILS.safeUpper(payload.LOTE),
      DATA_FABRICACAO: SGO_UTILS.safe(payload.DATA_FABRICACAO),
      DATA_INSTALACAO: SGO_UTILS.safe(payload.DATA_INSTALACAO),
      VIDA_UTIL_MESES: SGO_UTILS.safe(payload.VIDA_UTIL_MESES),
      APLICA_CALIBRACAO: payload.APLICA_CALIBRACAO ? "S" : "N",
      DATA_ULTIMA_CAL: SGO_UTILS.safe(payload.DATA_ULTIMA_CAL),
      DATA_PROXIMA_CAL: SGO_UTILS.safe(payload.DATA_PROXIMA_CAL),
      CERTIFICADO_NUMERO: SGO_UTILS.safeUpper(payload.CERTIFICADO_NUMERO),
      LINK_CERTIFICADO: SGO_UTILS.safe(payload.LINK_CERTIFICADO),
      QRCODE_LINK: SGO_UTILS.safe(payload.QRCODE_LINK)
    };
  }

  function getMapas_() {
    return {
      equipamentos: montarMapa_(SGO_DATA.getAll(SHEET_EQP)),
      clientes: montarMapa_(SGO_DATA.getAll(SHEET_CLI)),
      unidades: montarMapa_(SGO_DATA.getAll(SHEET_UNI))
    };
  }

  function enriquecer_(p, mapas) {
    const eqp = mapas.equipamentos[SGO_UTILS.safe(p.EQUIPAMENTO_ID)] || {};
    const cli = mapas.clientes[SGO_UTILS.safe(p.CLIENTE_ID)] || {};
    const uni = mapas.unidades[SGO_UTILS.safe(p.UNIDADE_ID)] || {};
    return Object.assign({}, p, {
      EQUIPAMENTO_TAG: eqp.TAG || "",
      EQUIPAMENTO_TIPO: eqp.TIPO || "",
      CLIENTE_NOME: cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "",
      UNIDADE_NOME: uni.NOME_UNIDADE || ""
    });
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(i => mapa[SGO_UTILS.safe(i.ID)] = i);
    return mapa;
  }

  return { listar, pesquisar, obter, criar, atualizar, inativar, reativar, excluir, listarEquipamentosAtivos };
})();

function pecasListar(sessionId) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasPesquisar(sessionId, termo) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasObter(sessionId, id) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasCriar(sessionId, payload) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasAtualizar(sessionId, id, payload) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasInativar(sessionId, id) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasReativar(sessionId, id) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasExcluir(sessionId, id) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function pecasListarEquipamentosAtivos(sessionId) { try { pilotoGuardBloqueado_("PECAS"); return JSON.parse(JSON.stringify(SGO_PECAS.listarEquipamentosAtivos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }

