const SGO_UNIDADES = (() => {
  const SHEET_NAME = SGO_CFG.SHEETS.CAD_UNIDADES;
  const SHEET_CLIENTES = SGO_CFG.SHEETS.CAD_CLIENTES;
  const STATUS_ATIVO = SGO_CFG.STATUS.ATIVO;
  const STATUS_INATIVO = SGO_CFG.STATUS.INATIVO;

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let unidades = SGO_DATA.getAll(SHEET_NAME);
    const clientes = SGO_DATA.getAll(SHEET_CLIENTES);

    // Trava de Segurança Definitiva: Retorna apenas as unidades pertencentes a ele (Otimizado)
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      unidades = unidades.filter(function (u) {
        return SGO_UTILS.safe(u.CLIENTE_ID) === idClienteReal;
      });
    }

    const mapaClientes = montarMapaClientes_(clientes);

    const itens = unidades
      .map(function (u) {
        return enriquecerUnidade_(u, mapaClientes);
      })
      .sort(function (a, b) {
        const sa = SGO_UTILS.safeUpper(a.STATUS);
        const sb = SGO_UTILS.safeUpper(b.STATUS);

        if (sa === sb) {
          const nomeA = SGO_UTILS.safe(a.NOME_UNIDADE);
          const nomeB = SGO_UTILS.safe(b.NOME_UNIDADE);
          return nomeA.localeCompare(nomeB);
        }

        if (sa === STATUS_ATIVO) return -1;
        if (sb === STATUS_ATIVO) return 1;
        return 0;
      });

    SGO_DATA.log("UNIDADES_LISTAR", sessao.usuario, "Listagem de unidades executada.", "UNIDADES");

    return {
      success: true,
      items: itens,
      total: itens.length
    };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const unidadeId = String(id || "").trim();

    if (!unidadeId) {
      return { success: false, message: "ID da unidade não informado." };
    }

    const unidade = SGO_DATA.getById(SHEET_NAME, unidadeId);

    if (!unidade) {
      return { success: false, message: "Unidade não encontrada." };
    }

    // Trava de Segurança
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      if (SGO_UTILS.safe(unidade.CLIENTE_ID) !== idClienteReal) {
        SGO_DATA.log("ACESSO_NEGADO", sessao.usuario, "Tentou visualizar unidade de outro cliente ID=" + unidadeId, "UNIDADES");
        return { success: false, message: "Acesso negado: Esta unidade não pertence à sua empresa." };
      }
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, unidade.CLIENTE_ID);

    const item = Object.assign({}, unidade, {
      CLIENTE_NOME: cliente ? (cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || "") : ""
    });
    
    if (item.CRIADO_EM && typeof item.CRIADO_EM.toISOString === "function") {
      item.CRIADO_EM = item.CRIADO_EM.toISOString();
    }

    return {
      success: true,
      item: item
    };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a criação de registros." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, dados.CLIENTE_ID);
    if (!cliente) {
      return { success: false, message: "Cliente vinculado não encontrado." };
    }

    if (SGO_UTILS.safeUpper(cliente.STATUS) !== STATUS_ATIVO) {
      return { success: false, message: "Não é permitido cadastrar unidade para cliente inativo." };
    }

    if (existeCnpjDuplicado_(dados.CNPJ_UNIDADE, "")) {
      return { success: false, message: "Já existe unidade cadastrada com este CNPJ." };
    }

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        CLIENTE_ID: dados.CLIENTE_ID,
        NOME_UNIDADE: dados.NOME_UNIDADE,
        CNPJ_UNIDADE: dados.CNPJ_UNIDADE,
        ENDERECO: dados.ENDERECO,
        CIDADE: dados.CIDADE,
        UF: dados.UF,
        RESPONSAVEL: dados.RESPONSAVEL,
        TELEFONE: dados.TELEFONE,
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("UNIDADES_CRIAR", sessao.usuario, "Unidade criada: " + registro.NOME_UNIDADE, "UNIDADES");

    return {
      success: true,
      message: "Unidade cadastrada com sucesso."
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a edição de registros." };
    }

    const unidadeId = String(id || "").trim();

    if (!unidadeId) {
      return { success: false, message: "ID da unidade não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, unidadeId);
    if (!atual) {
      return { success: false, message: "Unidade não encontrada." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, dados.CLIENTE_ID);
    if (!cliente) {
      return { success: false, message: "Cliente vinculado não encontrado." };
    }

    if (SGO_UTILS.safeUpper(cliente.STATUS) !== STATUS_ATIVO) {
      return { success: false, message: "Não é permitido vincular unidade a cliente inativo." };
    }

    if (dados.CNPJ_UNIDADE && existeCnpjDuplicado_(dados.CNPJ_UNIDADE, unidadeId)) {
      return { success: false, message: "Já existe outra unidade cadastrada com este CNPJ." };
    }

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: unidadeId,
      CLIENTE_ID: dados.CLIENTE_ID,
      NOME_UNIDADE: dados.NOME_UNIDADE,
      CNPJ_UNIDADE: dados.CNPJ_UNIDADE,
      ENDERECO: dados.ENDERECO,
      CIDADE: dados.CIDADE,
      UF: dados.UF,
      RESPONSAVEL: dados.RESPONSAVEL,
      TELEFONE: dados.TELEFONE,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET_NAME, unidadeId, novosDados);

    if (!ok) {
      return { success: false, message: "Não foi possível atualizar a unidade." };
    }

    SGO_DATA.log("UNIDADES_ATUALIZAR", sessao.usuario, "Unidade atualizada ID=" + unidadeId, "UNIDADES");

    return {
      success: true,
      message: "Unidade atualizada com sucesso."
    };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite esta ação." };
    }

    const unidadeId = String(id || "").trim();

    if (!unidadeId) {
      return { success: false, message: "ID da unidade não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, unidadeId);
    if (!atual) {
      return { success: false, message: "Unidade não encontrada." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, unidadeId, {
      STATUS: STATUS_INATIVO
    });

    if (!ok) {
      return { success: false, message: "Não foi possível inativar a unidade." };
    }

    SGO_DATA.log("UNIDADES_INATIVAR", sessao.usuario, "Unidade inativada ID=" + unidadeId, "UNIDADES");

    return {
      success: true,
      message: "Unidade inativada com sucesso."
    };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite esta ação." };
    }

    const unidadeId = String(id || "").trim();

    if (!unidadeId) {
      return { success: false, message: "ID da unidade não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, unidadeId);
    if (!atual) {
      return { success: false, message: "Unidade não encontrada." };
    }

    const cliente = SGO_DATA.getById(SHEET_CLIENTES, atual.CLIENTE_ID);
    if (!cliente) {
      return { success: false, message: "Cliente vinculado não encontrado para esta unidade." };
    }

    if (SGO_UTILS.safeUpper(cliente.STATUS) !== STATUS_ATIVO) {
      return { success: false, message: "Não é permitido reativar unidade vinculada a cliente inativo." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, unidadeId, {
      STATUS: STATUS_ATIVO
    });

    if (!ok) {
      return { success: false, message: "Não foi possível reativar a unidade." };
    }

    SGO_DATA.log("UNIDADES_REATIVAR", sessao.usuario, "Unidade reativada ID=" + unidadeId, "UNIDADES");

    return {
      success: true,
      message: "Unidade reativada com sucesso."
    };
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      return { success: false, message: "Acesso negado: Seu perfil não permite a exclusão de registros." };
    }

    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir unidade ID=" + id, "UNIDADES");
      return { success: false, message: "Acesso negado: Apenas gestores podem excluir registros." };
    }

    const unidadeId = String(id || "").trim();

    if (!unidadeId) {
      return { success: false, message: "ID da unidade não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, unidadeId);
    if (!atual) {
      return { success: false, message: "Unidade não encontrada." };
    }

    const ok = SGO_DATA.remove(SHEET_NAME, unidadeId);

    if (!ok) {
      return { success: false, message: "Não foi possível excluir a unidade." };
    }

    SGO_DATA.log("UNIDADES_EXCLUIR", sessao.usuario, "Unidade excluída ID=" + unidadeId, "UNIDADES");

    return {
      success: true,
      message: "Unidade excluída com sucesso."
    };
  }

  function pesquisar(sessionId, termo) {
    const sessao = exigirSessao(sessionId);
    const q = String(termo || "").trim().toLowerCase();
    let unidades = SGO_DATA.getAll(SHEET_NAME);
    const clientes = SGO_DATA.getAll(SHEET_CLIENTES);

    // Trava de Segurança Definitiva
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      unidades = unidades.filter(function (u) {
        return SGO_UTILS.safe(u.CLIENTE_ID) === idClienteReal;
      });
    }

    const mapaClientes = montarMapaClientes_(clientes);

    const base = unidades.map(function (u) {
      return enriquecerUnidade_(u, mapaClientes);
    });

    if (!q) {
      return {
        success: true,
        items: base,
        total: base.length
      };
    }

    const filtrados = base.filter(function (r) {
      return [
        r.NOME_UNIDADE,
        r.CNPJ_UNIDADE,
        r.ENDERECO,
        r.CIDADE,
        r.UF,
        r.RESPONSAVEL,
        r.TELEFONE,
        r.STATUS,
        r.CLIENTE_NOME
      ].some(function (v) {
        return String(v || "").toLowerCase().includes(q);
      });
    });

    return {
      success: true,
      items: filtrados,
      total: filtrados.length
    };
  }

  function listarClientesAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    let clientes = SGO_DATA.getAll(SHEET_CLIENTES);

    // Trava de Segurança Definitiva
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const idClienteReal = SGO_UTILS.safe(sessao.clienteId);
      clientes = clientes.filter(function (c) {
        return SGO_UTILS.safe(c.ID) === idClienteReal;
      });
    }

    const itens = clientes
      .filter(function (c) {
        return SGO_UTILS.safeUpper(c.STATUS) === STATUS_ATIVO;
      })
      .map(function (c) {
        return {
          ID: SGO_UTILS.safe(c.ID),
          NOME: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL),
          RAZAO_SOCIAL: SGO_UTILS.safe(c.RAZAO_SOCIAL),
          NOME_FANTASIA: SGO_UTILS.safe(c.NOME_FANTASIA),
          CNPJ: SGO_UTILS.safe(c.CNPJ)
        };
      })
      .sort(function (a, b) {
        return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME));
      });

    return {
      success: true,
      items: itens,
      total: itens.length
    };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};

    return {
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      NOME_UNIDADE: SGO_UTILS.safeUpper(payload.NOME_UNIDADE),
      CNPJ_UNIDADE: SGO_UTILS.normalizeCnpj(payload.CNPJ_UNIDADE),
      ENDERECO: SGO_UTILS.safeUpper(payload.ENDERECO),
      CIDADE: SGO_UTILS.safeUpper(payload.CIDADE),
      UF: SGO_UTILS.safeUpper(payload.UF),
      RESPONSAVEL: SGO_UTILS.safeUpper(payload.RESPONSAVEL),
      TELEFONE: SGO_UTILS.onlyDigits(payload.TELEFONE)
    };
  }

  function validarPayload_(dados, parcial) {
    const erros = [];

    if (!parcial || dados.CLIENTE_ID !== "") {
      if (!dados.CLIENTE_ID) erros.push("Cliente é obrigatório.");
    }

    if (!parcial || dados.NOME_UNIDADE !== "") {
      if (!dados.NOME_UNIDADE) erros.push("Nome da unidade é obrigatório.");
    }

    // Usando validação matemática do UTILS
    if (dados.CNPJ_UNIDADE && !SGO_UTILS.isCnpj(dados.CNPJ_UNIDADE)) {
      erros.push("O CNPJ da unidade informado é inválido.");
    }

    if (dados.UF && dados.UF.length !== 2) {
      erros.push("UF deve conter 2 caracteres.");
    }

    return erros;
  }

  function enriquecerUnidade_(unidade, mapaClientes) {
    const clone = Object.assign({}, unidade);
    const cliente = mapaClientes[SGO_UTILS.safe(clone.CLIENTE_ID)] || null;

    clone.CLIENTE_NOME = cliente
      ? (SGO_UTILS.safe(cliente.NOME_FANTASIA) || SGO_UTILS.safe(cliente.RAZAO_SOCIAL))
      : "";

    return clone;
  }

  function montarMapaClientes_(clientes) {
    const mapa = {};

    (clientes || []).forEach(function (c) {
      mapa[SGO_UTILS.safe(c.ID)] = c;
    });

    return mapa;
  }

  function existeCnpjDuplicado_(cnpj, idIgnorado) {
    const alvo = SGO_UTILS.normalizeCnpj(cnpj);
    if (!alvo) return false;

    const registros = SGO_DATA.getAll(SHEET_NAME);

    return registros.some(function (r) {
      return (
        SGO_UTILS.normalizeCnpj(r.CNPJ_UNIDADE) === alvo &&
        String(r.ID || "").trim() !== String(idIgnorado || "").trim()
      );
    });
  }

  return {
    listar,
    obter,
    criar,
    atualizar,
    inativar,
    reativar,
    excluir,
    pesquisar,
    listarClientesAtivos
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function unidadesListar(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.listar(sessionId))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesObter(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesCriar(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesAtualizar(sessionId, id, payload) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesInativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesReativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesExcluir(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesPesquisar(sessionId, termo) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function unidadesListarClientesAtivos(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_UNIDADES.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: "Erro servidor: " + e.message }; }
}