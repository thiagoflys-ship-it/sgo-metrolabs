const SGO_TECNICOS = (() => {
  const SHEET_NAME = "CAD_TECNICOS";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

  function ehTecnicoDaPropriaSessao_(sessao, registro) {
    return SGO_UTILS.safe(registro.USUARIO_ID) === SGO_UTILS.safe(sessao.userId);
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let registros = SGO_DATA.getAll(SHEET_NAME);

    // Técnico só enxerga o próprio cadastro; ADMIN/GESTOR/DIRETORIA veem todos.
    if (!isAdminSession(sessionId) && SGO_UTILS.safeUpper(sessao.perfil) === "TECNICO") {
      registros = registros.filter(function (r) {
        return ehTecnicoDaPropriaSessao_(sessao, r);
      });
    }

    const itens = registros.slice().sort((a, b) => {
      const sa = SGO_UTILS.safeUpper(a.STATUS);
      const sb = SGO_UTILS.safeUpper(b.STATUS);

      if (sa === sb) {
        return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME));
      }

      if (sa === STATUS_ATIVO) return -1;
      if (sb === STATUS_ATIVO) return 1;
      return 0;
    });

    return { success: true, items: itens, total: itens.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const tecnicoId = SGO_UTILS.safe(id);

    if (!tecnicoId) {
      return { success: false, message: "ID do técnico não informado." };
    }

    const registro = SGO_DATA.getById(SHEET_NAME, tecnicoId);
    if (!registro) {
      return { success: false, message: "Técnico não encontrado." };
    }

    if (!isAdminSession(sessionId) && !ehTecnicoDaPropriaSessao_(sessao, registro)) {
      return { success: false, message: "Acesso negado: você só pode visualizar o seu próprio cadastro." };
    }

    return { success: true, item: registro };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);

    if (!isAdminSession(sessionId)) {
      return { success: false, message: "Acesso negado: apenas ADMIN/GESTOR podem cadastrar técnicos." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados);
    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (existeTecnicoParaUsuario_(dados.USUARIO_ID, "")) {
      return { success: false, message: "Este usuário já possui um cadastro de técnico." };
    }

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        USUARIO_ID: dados.USUARIO_ID,
        NOME: dados.NOME,
        ESPECIALIDADE: dados.ESPECIALIDADE,
        TELEFONE: dados.TELEFONE,
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    SGO_DATA.log("TECNICOS_CRIAR", sessao.usuario, "Técnico criado: " + registro.NOME, "TECNICOS");

    return { success: true, message: "Técnico cadastrado com sucesso." };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);

    if (!isAdminSession(sessionId)) {
      return { success: false, message: "Acesso negado: apenas ADMIN/GESTOR podem editar técnicos." };
    }

    const tecnicoId = SGO_UTILS.safe(id);
    if (!tecnicoId) {
      return { success: false, message: "ID do técnico não informado." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, tecnicoId);
    if (!atual) {
      return { success: false, message: "Técnico não encontrado." };
    }

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados);
    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (existeTecnicoParaUsuario_(dados.USUARIO_ID, tecnicoId)) {
      return { success: false, message: "Já existe outro técnico vinculado a este usuário." };
    }

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: tecnicoId,
      USUARIO_ID: dados.USUARIO_ID,
      NOME: dados.NOME,
      ESPECIALIDADE: dados.ESPECIALIDADE,
      TELEFONE: dados.TELEFONE,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET_NAME, tecnicoId, novosDados);
    if (!ok) {
      return { success: false, message: "Não foi possível atualizar o técnico." };
    }

    SGO_DATA.log("TECNICOS_ATUALIZAR", sessao.usuario, "Técnico atualizado ID=" + tecnicoId, "TECNICOS");
    return { success: true, message: "Técnico atualizado com sucesso." };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (!isAdminSession(sessionId)) {
      return { success: false, message: "Acesso negado: apenas ADMIN/GESTOR podem inativar técnicos." };
    }

    const tecnicoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, tecnicoId);
    if (!atual) {
      return { success: false, message: "Técnico não encontrado." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, tecnicoId, { STATUS: STATUS_INATIVO });
    if (!ok) {
      return { success: false, message: "Não foi possível inativar o técnico." };
    }

    SGO_DATA.log("TECNICOS_INATIVAR", sessao.usuario, "Técnico inativado ID=" + tecnicoId, "TECNICOS");
    return { success: true, message: "Técnico inativado com sucesso." };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (!isAdminSession(sessionId)) {
      return { success: false, message: "Acesso negado: apenas ADMIN/GESTOR podem reativar técnicos." };
    }

    const tecnicoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, tecnicoId);
    if (!atual) {
      return { success: false, message: "Técnico não encontrado." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, tecnicoId, { STATUS: STATUS_ATIVO });
    if (!ok) {
      return { success: false, message: "Não foi possível reativar o técnico." };
    }

    SGO_DATA.log("TECNICOS_REATIVAR", sessao.usuario, "Técnico reativado ID=" + tecnicoId, "TECNICOS");
    return { success: true, message: "Técnico reativado com sucesso." };
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);

    if (!isAdminSession(sessionId)) {
      SGO_DATA.log("TENTATIVA_EXCLUSAO", sessao.usuario, "Tentativa não autorizada de excluir técnico ID=" + id, "TECNICOS");
      return { success: false, message: "Acesso negado: apenas ADMIN/GESTOR podem excluir técnicos." };
    }

    const tecnicoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, tecnicoId);
    if (!atual) {
      return { success: false, message: "Técnico não encontrado." };
    }

    const emUso = SGO_DATA.getManyByField(SGO_CFG.SHEETS.OS_ORDENS, "TECNICO_ID", tecnicoId).length > 0;
    if (emUso) {
      return { success: false, message: "Não é possível excluir: existem Ordens de Serviço vinculadas a este técnico. Inative-o em vez de excluir." };
    }

    const ok = SGO_DATA.remove(SHEET_NAME, tecnicoId);
    if (!ok) {
      return { success: false, message: "Não foi possível excluir o técnico." };
    }

    SGO_DATA.log("TECNICOS_EXCLUIR", sessao.usuario, "Técnico excluído ID=" + tecnicoId, "TECNICOS");
    return { success: true, message: "Técnico excluído com sucesso." };
  }

  function pesquisar(sessionId, termo) {
    const sessao = exigirSessao(sessionId);
    const q = SGO_UTILS.safeLower(termo);
    let registros = SGO_DATA.getAll(SHEET_NAME);

    if (!isAdminSession(sessionId) && SGO_UTILS.safeUpper(sessao.perfil) === "TECNICO") {
      registros = registros.filter(function (r) {
        return ehTecnicoDaPropriaSessao_(sessao, r);
      });
    }

    if (!q) {
      return { success: true, items: registros, total: registros.length };
    }

    const filtrados = registros.filter(function (r) {
      return [r.NOME, r.ESPECIALIDADE, r.TELEFONE, r.STATUS].some(function (v) {
        return SGO_UTILS.safeLower(v).includes(q);
      });
    });

    return { success: true, items: filtrados, total: filtrados.length };
  }

  // Combo auxiliar: usuários com PERFIL=TECNICO que ainda não têm cadastro de técnico.
  function usuariosTecnicosDisponiveis(sessionId) {
    exigirSessao(sessionId);
    if (!isAdminSession(sessionId)) {
      return { success: false, message: "Acesso negado." };
    }

    const usuarios = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
      return SGO_UTILS.safeUpper(u.PERFIL) === "TECNICO" && SGO_UTILS.safeUpper(u.STATUS) === STATUS_ATIVO;
    });

    const jaVinculados = SGO_DATA.getAll(SHEET_NAME).map(function (t) {
      return SGO_UTILS.safe(t.USUARIO_ID);
    });

    const disponiveis = usuarios.filter(function (u) {
      return jaVinculados.indexOf(SGO_UTILS.safe(u.ID)) === -1;
    });

    return { success: true, items: disponiveis };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      USUARIO_ID: SGO_UTILS.safe(payload.USUARIO_ID),
      NOME: SGO_UTILS.safeUpper(payload.NOME),
      ESPECIALIDADE: SGO_UTILS.safeUpper(payload.ESPECIALIDADE),
      TELEFONE: SGO_UTILS.onlyDigits(payload.TELEFONE)
    };
  }

  function validarPayload_(dados) {
    const erros = [];

    if (!dados.USUARIO_ID) {
      erros.push("Selecione o usuário vinculado a este técnico.");
    } else {
      const usuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, dados.USUARIO_ID);
      if (!usuario) {
        erros.push("Usuário vinculado não encontrado.");
      } else if (SGO_UTILS.safeUpper(usuario.PERFIL) !== "TECNICO") {
        erros.push("O usuário selecionado precisa ter perfil TECNICO.");
      }
    }

    if (!dados.NOME) {
      erros.push("Nome do técnico é obrigatório.");
    }

    return erros;
  }

  function existeTecnicoParaUsuario_(usuarioId, idIgnorado) {
    const alvo = SGO_UTILS.safe(usuarioId);
    if (!alvo) return false;

    const registros = SGO_DATA.getAll(SHEET_NAME);
    return registros.some(function (r) {
      return SGO_UTILS.safe(r.USUARIO_ID) === alvo && SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado);
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
    usuariosTecnicosDisponiveis
  };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function tecnicosListar(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.listar(sessionId))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosObter(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.obter(sessionId, id))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosCriar(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.criar(sessionId, payload))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosAtualizar(sessionId, id, payload) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.atualizar(sessionId, id, payload))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosInativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.inativar(sessionId, id))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosReativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.reativar(sessionId, id))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosExcluir(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.excluir(sessionId, id))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosPesquisar(sessionId, termo) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.pesquisar(sessionId, termo))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
function tecnicosUsuariosDisponiveis(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.usuariosTecnicosDisponiveis(sessionId))); } catch (e) { return { success: false, message: "Erro servidor: " + e.message }; }
}
