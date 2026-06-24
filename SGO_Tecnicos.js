/* ============================================================
   SGO_TECNICOS — Gestão de Técnicos de Campo
   Metrolabs SGO+ v2.0
   ============================================================ */
const SGO_TECNICOS = (() => {

  const SHEET    = sgoGetCfgSafe_().SHEETS.CAD_TECNICOS;
  const DB       = sgoGetCfgSafe_().DB_KEYS.PRINCIPAL;
  const DB_OS    = sgoGetCfgSafe_().DB_KEYS.OS;

  const ESPECIALIDADES_VALIDAS = [
    "AUTOCLAVE", "LAVADORA", "CALIBRACAO", "QUALIFICACAO",
    "ENSAIO_ELETRICO", "MANUTENCAO", "INSTALACAO",
    "CADEIA_FRIA", "VISTORIA", "ORCAMENTO"
  ];

  // ─── PERMISSÃO ────────────────────────────────────────────
  function _perm_(sessao, escrita) {
    const p = SGO_UTILS.safeUpper(sessao.perfil);
    if (escrita && !["ADMIN", "GESTOR", "DIRETORIA"].includes(p)) {
      throw new Error("Sem permissão para esta operação.");
    }
  }

  // ─── ENRIQUECIMENTO COM STATS ─────────────────────────────
  function _stats_(tecId) {
    const resultado = { totalMissoes: 0, concluidas: 0, horasApontadas: 0 };
    try {
      const missoes = SGO_DATA.getManyByField(
        sgoGetCfgSafe_().SHEETS.AGD_MISSOES, "TECNICO_ID", tecId, DB_OS
      );
      resultado.totalMissoes  = missoes.length;
      resultado.concluidas    = missoes.filter(m => SGO_UTILS.safeUpper(m.STATUS) === "CONCLUIDA").length;
      resultado.horasApontadas = missoes.reduce(function(acc, m) {
        return acc + SGO_UTILS.toNumber(m.HORAS_APONTADAS);
      }, 0);
    } catch (_) { /* banco OS pode não estar configurado ainda */ }
    return resultado;
  }

  // ─── VALIDAÇÃO CPF ────────────────────────────────────────
  function _validarCpf_(cpf) {
    const c = SGO_UTILS.onlyDigits(cpf || "");
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
    let r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(c[9])) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
    r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === parseInt(c[10]);
  }

  // ─── VALIDAÇÃO DE DADOS ───────────────────────────────────
  function _validar_(dados, idExistente) {
    const nome = SGO_UTILS.safe(dados.NOME);
    if (!nome) throw new Error("Nome do técnico é obrigatório.");
    if (nome.length < 3) throw new Error("Nome deve ter ao menos 3 caracteres.");

    const cpf = SGO_UTILS.onlyDigits(dados.CPF || "");
    if (cpf && !_validarCpf_(cpf)) throw new Error("CPF inválido: " + dados.CPF);

    if (cpf) {
      const dup = SGO_DATA.findOne(SHEET, { CPF: cpf }, DB);
      if (dup && SGO_UTILS.safe(dup.ID) !== SGO_UTILS.safe(idExistente)) {
        throw new Error("CPF já cadastrado para outro técnico.");
      }
    }

    const email = SGO_UTILS.safeLower(dados.EMAIL || "");
    if (email && !SGO_UTILS.isEmail(email)) throw new Error("E-mail inválido.");

    const specs = SGO_UTILS.safe(dados.ESPECIALIDADES);
    if (specs) {
      const lista = specs.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
      const invalidas = lista.filter(e => !ESPECIALIDADES_VALIDAS.includes(e));
      if (invalidas.length > 0) {
        throw new Error("Especialidade(s) inválida(s): " + invalidas.join(", "));
      }
    }

    const custo = dados.CUSTO_HORA !== undefined && dados.CUSTO_HORA !== ""
      ? SGO_UTILS.toNumber(dados.CUSTO_HORA)
      : null;
    if (custo !== null && custo < 0) throw new Error("Custo/hora não pode ser negativo.");
  }

  // ─── MONTAR REGISTRO ──────────────────────────────────────
  function _montar_(dados) {
    return {
      USUARIO_ID:          SGO_UTILS.safe(dados.USUARIO_ID),
      NOME:                SGO_UTILS.safe(dados.NOME).toUpperCase(),
      CPF:                 SGO_UTILS.onlyDigits(dados.CPF || ""),
      EMAIL:               SGO_UTILS.safeLower(dados.EMAIL || ""),
      TELEFONE:            SGO_UTILS.safe(dados.TELEFONE),
      CREA_CRT:            SGO_UTILS.safe(dados.CREA_CRT).toUpperCase(),
      NUMERO_CREA:         SGO_UTILS.safe(dados.NUMERO_CREA),
      UF_CREA:             SGO_UTILS.safeUpper(dados.UF_CREA || "").substring(0, 2),
      DATA_VENCIMENTO_CREA: SGO_UTILS.safe(dados.DATA_VENCIMENTO_CREA),
      CNH:                 SGO_UTILS.safe(dados.CNH),
      CATEGORIA_CNH:       SGO_UTILS.safeUpper(dados.CATEGORIA_CNH || ""),
      VENCIMENTO_CNH:      SGO_UTILS.safe(dados.VENCIMENTO_CNH),
      ESPECIALIDADES:      _normalizarSpecs_(dados.ESPECIALIDADES),
      CUSTO_HORA:          SGO_UTILS.toNumber(dados.CUSTO_HORA || 0),
      DISPONIBILIDADE:     SGO_UTILS.safeUpper(dados.DISPONIBILIDADE || "DISPONIVEL"),
      DATA_ADMISSAO:       SGO_UTILS.safe(dados.DATA_ADMISSAO),
      ENDERECO:            SGO_UTILS.safe(dados.ENDERECO),
      CIDADE:              SGO_UTILS.safe(dados.CIDADE),
      UF:                  SGO_UTILS.safeUpper(dados.UF || "").substring(0, 2),
      OBSERVACOES:         SGO_UTILS.safe(dados.OBSERVACOES)
    };
  }

  function _normalizarSpecs_(raw) {
    if (!raw) return "";
    if (Array.isArray(raw)) return raw.map(s => s.trim().toUpperCase()).filter(Boolean).join(",");
    return String(raw).toUpperCase().split(",").map(s => s.trim()).filter(Boolean).join(",");
  }

  // ─── ENRIQUECER COM DADOS DO USUÁRIO E STATS ──────────────
  function _enriquecer_(t, incluirStats) {
    const r = SGO_UTILS.clone(t);
    r._specs_lista = SGO_UTILS.safe(t.ESPECIALIDADES)
      ? t.ESPECIALIDADES.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    if (incluirStats) {
      const stats = _stats_(t.ID);
      r._total_missoes   = stats.totalMissoes;
      r._concluidas      = stats.concluidas;
      r._horas_apontadas = stats.horasApontadas;
      r._produtividade_pct = stats.totalMissoes > 0
        ? Math.round((stats.concluidas / stats.totalMissoes) * 100)
        : 0;
    }

    // Status de documentos críticos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    r._crea_status = _statusDoc_(t.DATA_VENCIMENTO_CREA, hoje);
    r._cnh_status  = _statusDoc_(t.VENCIMENTO_CNH, hoje);

    return r;
  }

  function _statusDoc_(dataStr, hoje) {
    if (!dataStr) return "SEM_DATA";
    const d = new Date(String(dataStr).substring(0, 10) + "T00:00:00");
    if (isNaN(d.getTime())) return "SEM_DATA";
    const dias = Math.ceil((d - hoje) / 86400000);
    if (dias < 0)  return "VENCIDO";
    if (dias <= 30) return "VENCENDO";
    return "OK";
  }

  // ─── LISTAR ───────────────────────────────────────────────
  function listar(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, false);

    const todos = SGO_DATA.getAll(SHEET, DB);
    const f     = filtros || {};

    return todos.filter(function(t) {
      if (f.status && SGO_UTILS.safeUpper(t.STATUS) !== SGO_UTILS.safeUpper(f.status)) return false;
      if (f.especialidade) {
        const specs = SGO_UTILS.safeUpper(t.ESPECIALIDADES || "");
        if (!specs.split(",").map(s => s.trim()).includes(f.especialidade.toUpperCase())) return false;
      }
      if (f.disponibilidade && SGO_UTILS.safeUpper(t.DISPONIBILIDADE) !== SGO_UTILS.safeUpper(f.disponibilidade)) return false;
      if (f.termo) {
        const q = f.termo.toLowerCase();
        const campos = [t.NOME, t.EMAIL, t.NUMERO_CREA, t.CREA_CRT, t.CPF, t.ESPECIALIDADES]
          .map(v => SGO_UTILS.safe(v).toLowerCase());
        if (!campos.some(c => c.includes(q))) return false;
      }
      return true;
    }).map(t => _enriquecer_(t, false));
  }

  // ─── OBTER ÚNICO (com stats completas) ───────────────────
  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, false);

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado: " + id);
    return _enriquecer_(tec, true);
  }

  // ─── CRIAR ────────────────────────────────────────────────
  function criar(sessionId, dados) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    _validar_(dados, null);

    const base   = SGO_DATA.gerarRegistroBase();
    const campos = _montar_(dados);
    campos.STATUS = sgoGetCfgSafe_().STATUS.ATIVO;

    const registro = Object.assign({}, base, campos);
    SGO_DATA.insert(SHEET, registro, DB);

    SGO_DATA.log(
      sessao.usuario,
      "CRIAR_TECNICO",
      "TECNICOS",
      "Técnico criado: " + campos.NOME + " | ID: " + base.ID
    );

    return { success: true, id: base.ID, nome: campos.NOME };
  }

  // ─── ATUALIZAR ────────────────────────────────────────────
  function atualizar(sessionId, id, dados) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    const existente = SGO_DATA.getById(SHEET, id, DB);
    if (!existente) throw new Error("Técnico não encontrado: " + id);

    _validar_(dados, id);

    const campos = _montar_(dados);
    SGO_DATA.update(SHEET, id, campos, DB);

    SGO_DATA.log(
      sessao.usuario,
      "ATUALIZAR_TECNICO",
      "TECNICOS",
      "Técnico atualizado: " + campos.NOME + " | ID: " + id
    );

    return { success: true, id: id };
  }

  // ─── INATIVAR / REATIVAR ──────────────────────────────────
  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado.");

    // Verifica se há missão ativa vinculada
    try {
      const missoes = SGO_DATA.getManyByField(
        sgoGetCfgSafe_().SHEETS.AGD_MISSOES, "TECNICO_ID", id, DB_OS
      );
      const ativas = missoes.filter(function(m) {
        const st = SGO_UTILS.safeUpper(m.STATUS);
        return ["AGENDADA", "EM_DESLOCAMENTO", "EM_EXECUCAO"].includes(st);
      });
      if (ativas.length > 0) {
        throw new Error(
          "Técnico possui " + ativas.length + " missão(ões) ativa(s). " +
          "Conclua ou cancele antes de inativar."
        );
      }
    } catch (e) {
      if (e.message.indexOf("missão") >= 0) throw e;
    }

    SGO_DATA.update(SHEET, id, { STATUS: sgoGetCfgSafe_().STATUS.INATIVO }, DB);
    SGO_DATA.log(sessao.usuario, "INATIVAR_TECNICO", "TECNICOS", "Técnico inativado: " + SGO_UTILS.safe(tec.NOME));
    return { success: true };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado.");

    SGO_DATA.update(SHEET, id, {
      STATUS: sgoGetCfgSafe_().STATUS.ATIVO,
      DISPONIBILIDADE: "DISPONIVEL"
    }, DB);
    SGO_DATA.log(sessao.usuario, "REATIVAR_TECNICO", "TECNICOS", "Técnico reativado: " + SGO_UTILS.safe(tec.NOME));
    return { success: true };
  }

  // ─── PESQUISAR ────────────────────────────────────────────
  function pesquisar(sessionId, termo) {
    return listar(sessionId, { termo: termo });
  }

  // ─── LISTAR ATIVOS (para dropdowns) ───────────────────────
  function listarAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, false);

    return SGO_DATA.getAll(SHEET, DB)
      .filter(t => SGO_UTILS.safeUpper(t.STATUS) === sgoGetCfgSafe_().STATUS.ATIVO)
      .map(function(t) {
        const nome = SGO_UTILS.safe(t.NOME);
        const especialidades = SGO_UTILS.safe(t.ESPECIALIDADES);
        const disponibilidade = SGO_UTILS.safeUpper(t.DISPONIBILIDADE);
        return {
          ID:            SGO_UTILS.safe(t.ID),
          USUARIO_ID:    SGO_UTILS.safe(t.USUARIO_ID),
          NOME:          nome,
          LABEL:         [nome, disponibilidade, especialidades].filter(Boolean).join(" | "),
          ESPECIALIDADES: especialidades,
          DISPONIBILIDADE: disponibilidade,
          CUSTO_HORA:    SGO_UTILS.toNumber(t.CUSTO_HORA)
        };
      });
  }

  // ─── LISTAR ESPECIALIDADES VÁLIDAS ────────────────────────
  function listarEspecialidades() {
    return ESPECIALIDADES_VALIDAS.slice();
  }

  // ─── ATUALIZAR DISPONIBILIDADE ────────────────────────────
  function atualizarDisponibilidade(sessionId, id, disponibilidade) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    const validas = ["DISPONIVEL", "EM_CAMPO", "FERIAS", "AFASTADO", "INDISPONIVEL"];
    if (!validas.includes(SGO_UTILS.safeUpper(disponibilidade))) {
      throw new Error("Disponibilidade inválida: " + disponibilidade);
    }

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado.");

    SGO_DATA.update(SHEET, id, {
      DISPONIBILIDADE: SGO_UTILS.safeUpper(disponibilidade)
    }, DB);

    return { success: true };
  }

  // ─── VINCULAR USUÁRIO DO SISTEMA ──────────────────────────
  function vincularUsuario(sessionId, id, usuarioId) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, true);

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado.");

    if (usuarioId) {
      const usuario = SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_USUARIOS, usuarioId, DB);
      if (!usuario) throw new Error("Usuário não encontrado.");
      if (SGO_UTILS.safeUpper(usuario.PERFIL) !== "TECNICO") {
        throw new Error("Usuário selecionado não tem perfil TECNICO.");
      }
      const dupVinculo = SGO_DATA.findOne(SHEET, { USUARIO_ID: usuarioId }, DB);
      if (dupVinculo && SGO_UTILS.safe(dupVinculo.ID) !== id) {
        throw new Error("Este usuário já está vinculado a outro técnico.");
      }
    }

    SGO_DATA.update(SHEET, id, { USUARIO_ID: SGO_UTILS.safe(usuarioId) }, DB);
    SGO_DATA.log(sessao.usuario, "VINCULAR_USUARIO_TECNICO", "TECNICOS",
      "Técnico " + id + " vinculado ao usuário " + usuarioId);
    return { success: true };
  }

  // ─── MISSÕES DO TÉCNICO (histórico) ───────────────────────
  function obterMissoes(sessionId, id, limite) {
    const sessao = exigirSessao(sessionId);
    _perm_(sessao, false);

    const tec = SGO_DATA.getById(SHEET, id, DB);
    if (!tec) throw new Error("Técnico não encontrado.");

    try {
      const missoes = SGO_DATA.getManyByField(
        sgoGetCfgSafe_().SHEETS.AGD_MISSOES, "TECNICO_ID", id, DB_OS
      );
      const lim = parseInt(limite) || 50;
      return missoes
        .sort((a, b) => String(b.DATA_AGENDADA).localeCompare(String(a.DATA_AGENDADA)))
        .slice(0, lim);
    } catch (_) {
      return [];
    }
  }

  // ─── EXPÕE ────────────────────────────────────────────────
  return {
    listar, obter, criar, atualizar,
    inativar, reativar, pesquisar,
    listarAtivos, listarEspecialidades,
    atualizarDisponibilidade, vincularUsuario, obterMissoes
  };

})();

/* ============================================================
   WRAPPERS PÚBLICOS — google.script.run
   ============================================================ */
function tecnicosListar(sessionId, filtros) {
  try { return JSON.parse(JSON.stringify({ success: true, items: SGO_TECNICOS.listar(sessionId, filtros || {}) })); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosObter(sessionId, id) {
  try { return JSON.parse(JSON.stringify({ success: true, item: SGO_TECNICOS.obter(sessionId, id) })); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosCriar(sessionId, dados) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.criar(sessionId, dados))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosAtualizar(sessionId, id, dados) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.atualizar(sessionId, id, dados))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosInativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.inativar(sessionId, id))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosReativar(sessionId, id) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.reativar(sessionId, id))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosPesquisar(sessionId, termo) {
  try { return JSON.parse(JSON.stringify({ success: true, items: SGO_TECNICOS.pesquisar(sessionId, termo) })); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosListarAtivos(sessionId) {
  try { return JSON.parse(JSON.stringify({ success: true, items: SGO_TECNICOS.listarAtivos(sessionId) })); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosAtualizarDisponibilidade(sessionId, id, disponibilidade) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.atualizarDisponibilidade(sessionId, id, disponibilidade))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosVincularUsuario(sessionId, id, usuarioId) {
  try { return JSON.parse(JSON.stringify(SGO_TECNICOS.vincularUsuario(sessionId, id, usuarioId))); }
  catch (e) { return { success: false, message: e.message }; }
}

function tecnicosObterMissoes(sessionId, id, limite) {
  try { return JSON.parse(JSON.stringify({ success: true, items: SGO_TECNICOS.obterMissoes(sessionId, id, limite) })); }
  catch (e) { return { success: false, message: e.message }; }
}
