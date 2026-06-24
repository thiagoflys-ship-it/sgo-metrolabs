const SGO_MISSOES = (() => {
  const DB_OS = "OS";
  const SHEET = sgoGetCfgSafe_().SHEETS.AGD_MISSOES;
  const SHEET_APONT = sgoGetCfgSafe_().SHEETS.AGD_APONTAMENTOS;
  const SHEET_OS = sgoGetCfgSafe_().SHEETS.OS_ORDENS;
  const SHEET_USUARIOS = sgoGetCfgSafe_().SHEETS.CAD_USUARIOS;
  const SHEET_TECNICOS = sgoGetCfgSafe_().SHEETS.CAD_TECNICOS;

  function podeGerenciar_(sessao) {
    const p = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return ["ADMIN", "GESTOR", "METROLOGIA"].indexOf(p) >= 0;
  }

  function validarAcesso_(sessao, missao) {
    if (!sessao || !missao) return false;
    const p = SGO_UTILS.safeUpper(sessao.perfil);
    if (p === "TECNICO") return tecnicoVinculadoSessao_(missao, sessao);
    return p !== "CLIENTE";
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let items = SGO_DATA.getAll(SHEET, DB_OS);
    if (SGO_UTILS.safeUpper(sessao.perfil) === "TECNICO") {
      items = items.filter(m => tecnicoVinculadoSessao_(m, sessao));
    }
    const mapas = getMapas_();
    items = items.map(m => enriquecer_(m, mapas))
      .sort((a, b) => SGO_UTILS.safe(a.DATA_AGENDADA).localeCompare(SGO_UTILS.safe(b.DATA_AGENDADA)));
    return { success: true, items: items, total: items.length };
  }

  function pesquisar(sessionId, termo) {
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    if (!q) return { success: true, items: base, total: base.length };
    const items = base.filter(m => [
      m.TITULO, m.DESCRICAO, m.STATUS, m.NUMERO_OS, m.TECNICO_NOME, m.CONCLUSAO_TECNICA
    ].some(v => SGO_UTILS.safeLower(v).indexOf(q) >= 0));
    return { success: true, items: items, total: items.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const missao = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!missao) return { success: false, message: "Missao nao encontrada." };
    if (!validarAcesso_(sessao, missao)) return { success: false, message: "Acesso negado." };
    return { success: true, item: enriquecer_(missao, getMapas_()) };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeGerenciar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarPayload_(payload);
    if (!dados.OS_ID || !dados.TECNICO_ID || !dados.TITULO) {
      return { success: false, message: "Informe OS, tecnico e titulo." };
    }
    const os = SGO_DATA.getById(SHEET_OS, dados.OS_ID, DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    const tecnico = obterTecnico_(dados.TECNICO_ID);
    if (tecnico && !dados.TECNICO_USUARIO_ID) dados.TECNICO_USUARIO_ID = SGO_UTILS.safe(tecnico.USUARIO_ID);

    const registro = SGO_DATA.gerarRegistroBase(Object.assign({}, dados, {
      STATUS: sgoGetCfgSafe_().MISSOES.STATUS.AGENDADA,
      CRIADO_POR: sessao.usuario
    }));
    SGO_DATA.insert(SHEET, registro, DB_OS);
    SGO_DATA.update(SHEET_OS, dados.OS_ID, {
      TECNICO_ID: dados.TECNICO_ID,
      TECNICO_USUARIO_ID: dados.TECNICO_USUARIO_ID,
      MISSAO_ID: registro.ID,
      DATA_AGENDADA: dados.DATA_AGENDADA,
      STATUS: sgoGetCfgSafe_().OS.STATUS.AGENDADA
    }, DB_OS);
    SGO_DATA.log("MISSAO_CRIAR", sessao.usuario, "Missao criada para OS=" + dados.OS_ID, "MISSOES");
    return {
      success: true,
      message: "Missao criada.",
      warning: !registro.TECNICO_USUARIO_ID ? "Tecnico sem usuario vinculado. Vincule um usuario para liberar visualizacao pelo perfil TECNICO." : "",
      item: registro
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const missaoId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET, missaoId, DB_OS);
    if (!atual) return { success: false, message: "Missao nao encontrada." };
    if (!podeGerenciar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarPayload_(payload);
    const tecnico = obterTecnico_(dados.TECNICO_ID);
    if (tecnico && !dados.TECNICO_USUARIO_ID) dados.TECNICO_USUARIO_ID = SGO_UTILS.safe(tecnico.USUARIO_ID);
    const ok = SGO_DATA.update(SHEET, missaoId, Object.assign({}, dados, {
      STATUS: atual.STATUS || sgoGetCfgSafe_().MISSOES.STATUS.AGENDADA,
      CHECKIN_EM: atual.CHECKIN_EM,
      CHECKIN_LAT: atual.CHECKIN_LAT,
      CHECKIN_LNG: atual.CHECKIN_LNG,
      CHECKIN_ENDERECO: atual.CHECKIN_ENDERECO,
      CHECKOUT_EM: atual.CHECKOUT_EM,
      CHECKOUT_LAT: atual.CHECKOUT_LAT,
      CHECKOUT_LNG: atual.CHECKOUT_LNG,
      CHECKOUT_ENDERECO: atual.CHECKOUT_ENDERECO,
      CRIADO_POR: atual.CRIADO_POR,
      CRIADO_EM: atual.CRIADO_EM
    }), DB_OS);
    if (ok && atual.OS_ID) {
      SGO_DATA.update(SHEET_OS, atual.OS_ID, {
        TECNICO_ID: dados.TECNICO_ID,
        TECNICO_USUARIO_ID: dados.TECNICO_USUARIO_ID,
        DATA_AGENDADA: dados.DATA_AGENDADA,
        MISSAO_ID: atual.ID,
        STATUS: sgoGetCfgSafe_().OS.STATUS.AGENDADA
      }, DB_OS);
    }
    return ok ? { success: true, message: "Missao atualizada." } : { success: false, message: "Erro ao atualizar missao." };
  }

  function checkin(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const missao = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!missao) return { success: false, message: "Missao nao encontrada." };
    if (!validarAcesso_(sessao, missao)) return { success: false, message: "Acesso negado." };
    payload = payload || {};
    const ok = SGO_DATA.update(SHEET, missao.ID, {
      STATUS: sgoGetCfgSafe_().MISSOES.STATUS.EM_EXECUCAO,
      CHECKIN_EM: SGO_UTILS.nowIso(),
      CHECKIN_LAT: SGO_UTILS.safe(payload.LAT),
      CHECKIN_LNG: SGO_UTILS.safe(payload.LNG),
      CHECKIN_ENDERECO: SGO_UTILS.safe(payload.ENDERECO),
      KM_SAIDA: SGO_UTILS.safe(payload.KM_SAIDA)
    }, DB_OS);
    if (missao.OS_ID) {
      SGO_DATA.update(SHEET_OS, missao.OS_ID, { STATUS: sgoGetCfgSafe_().OS.STATUS.EM_EXECUCAO, DATA_INICIO: SGO_UTILS.nowIso() }, DB_OS);
    }
    return ok ? { success: true, message: "Check-in realizado." } : { success: false, message: "Erro no check-in." };
  }

  function checkout(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const missao = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!missao) return { success: false, message: "Missao nao encontrada." };
    if (!validarAcesso_(sessao, missao)) return { success: false, message: "Acesso negado." };
    payload = payload || {};
    const ok = SGO_DATA.update(SHEET, missao.ID, {
      STATUS: sgoGetCfgSafe_().MISSOES.STATUS.CONCLUIDA,
      CHECKOUT_EM: SGO_UTILS.nowIso(),
      CHECKOUT_LAT: SGO_UTILS.safe(payload.LAT),
      CHECKOUT_LNG: SGO_UTILS.safe(payload.LNG),
      CHECKOUT_ENDERECO: SGO_UTILS.safe(payload.ENDERECO),
      KM_CHEGADA: SGO_UTILS.safe(payload.KM_CHEGADA),
      CONCLUSAO_TECNICA: SGO_UTILS.safe(payload.CONCLUSAO_TECNICA),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES)
    }, DB_OS);
    if (ok && missao.OS_ID) {
      SGO_DATA.update(SHEET_OS, missao.OS_ID, {
        MISSAO_ID: missao.ID,
        TECNICO_ID: missao.TECNICO_ID,
        STATUS: sgoGetCfgSafe_().OS.STATUS.AGUARDANDO_ASSINATURA || sgoGetCfgSafe_().OS.STATUS.EM_APROVACAO
      }, DB_OS);
    }
    return ok ? { success: true, message: "Check-out realizado." } : { success: false, message: "Erro no check-out." };
  }

  function apontarHoras(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const missao = SGO_DATA.getById(SHEET, SGO_UTILS.safe(payload.MISSAO_ID), DB_OS);
    if (!missao) return { success: false, message: "Missao nao encontrada." };
    if (!validarAcesso_(sessao, missao)) return { success: false, message: "Acesso negado." };
    const horas = calcularHoras_(payload.HORA_INICIO, payload.HORA_FIM);
    const dados = SGO_DATA.gerarRegistroBase({
      MISSAO_ID: missao.ID,
      OS_ID: missao.OS_ID,
      TECNICO_ID: missao.TECNICO_ID,
      DATA: SGO_UTILS.safe(payload.DATA),
      HORA_INICIO: SGO_UTILS.safe(payload.HORA_INICIO),
      HORA_FIM: SGO_UTILS.safe(payload.HORA_FIM),
      HORAS_TOTAL: horas,
      ATIVIDADE: SGO_UTILS.safe(payload.ATIVIDADE),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES)
    });
    SGO_DATA.insert(SHEET_APONT, dados, DB_OS);
    atualizarHorasMissao_(missao.ID);
    return { success: true, message: "Horas apontadas.", item: dados };
  }

  function listarApontamentos(sessionId, missaoId) {
    const sessao = exigirSessao(sessionId);
    const missao = SGO_DATA.getById(SHEET, SGO_UTILS.safe(missaoId), DB_OS);
    if (!missao) return { success: false, message: "Missao nao encontrada." };
    if (!validarAcesso_(sessao, missao)) return { success: false, message: "Acesso negado." };
    return { success: true, items: SGO_DATA.getManyByField(SHEET_APONT, "MISSAO_ID", missao.ID, DB_OS) };
  }

  function listarOpcoes(sessionId) {
    exigirSessao(sessionId);
    const os = SGO_DATA.getAll(SHEET_OS, DB_OS).map(o => ({
      ID: o.ID,
      LABEL: [o.NUMERO_OS, o.TIPO_OS, o.STATUS].filter(Boolean).join(" - ")
    }));
    const tecnicos = listarTecnicos_();
    return { success: true, os: os, tecnicos: tecnicos, status: sgoGetCfgSafe_().MISSOES.STATUS };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      OS_ID: SGO_UTILS.safe(payload.OS_ID),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID),
      TECNICO_USUARIO_ID: SGO_UTILS.safe(payload.TECNICO_USUARIO_ID),
      TITULO: SGO_UTILS.safe(payload.TITULO),
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO),
      DATA_AGENDADA: SGO_UTILS.safe(payload.DATA_AGENDADA),
      DATA: SGO_UTILS.safe(payload.DATA || payload.DATA_AGENDADA),
      HORA_INICIO_PREV: SGO_UTILS.safe(payload.HORA_INICIO_PREV),
      HORA_INICIO_PREVISTA: SGO_UTILS.safe(payload.HORA_INICIO_PREVISTA || payload.HORA_INICIO_PREV),
      HORA_FIM_PREV: SGO_UTILS.safe(payload.HORA_FIM_PREV),
      HORA_FIM_PREVISTA: SGO_UTILS.safe(payload.HORA_FIM_PREVISTA || payload.HORA_FIM_PREV),
      SLA_HORAS: SGO_UTILS.safe(payload.SLA_HORAS),
      HORAS_PREVISTAS: SGO_UTILS.safe(payload.HORAS_PREVISTAS),
      VEICULO_ID: SGO_UTILS.safe(payload.VEICULO_ID),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES)
    };
  }

  function atualizarHorasMissao_(missaoId) {
    const apontamentos = SGO_DATA.getManyByField(SHEET_APONT, "MISSAO_ID", missaoId, DB_OS);
    const total = apontamentos.reduce((s, a) => s + SGO_UTILS.toNumber(a.HORAS_TOTAL, 0), 0);
    SGO_DATA.update(SHEET, missaoId, { HORAS_APONTADAS: total }, DB_OS);
  }

  function calcularHoras_(inicio, fim) {
    const hi = SGO_UTILS.safe(inicio);
    const hf = SGO_UTILS.safe(fim);
    if (!hi || !hf || hi.indexOf(":") < 0 || hf.indexOf(":") < 0) return 0;
    const pi = hi.split(":").map(Number);
    const pf = hf.split(":").map(Number);
    let min = (pf[0] * 60 + pf[1]) - (pi[0] * 60 + pi[1]);
    if (min < 0) min += 24 * 60;
    return Math.round((min / 60) * 100) / 100;
  }

  function getMapas_() {
    const os = {};
    SGO_DATA.getAll(SHEET_OS, DB_OS).forEach(o => os[SGO_UTILS.safe(o.ID)] = o);
    const usuarios = {};
    SGO_DATA.getAll(SHEET_USUARIOS).forEach(u => usuarios[SGO_UTILS.safe(u.ID)] = u);
    const tecnicos = {};
    safeGetAll_(SHEET_TECNICOS).forEach(t => tecnicos[SGO_UTILS.safe(t.ID)] = t);
    return { os: os, usuarios: usuarios, tecnicos: tecnicos };
  }

  function enriquecer_(m, mapas) {
    const os = mapas.os[SGO_UTILS.safe(m.OS_ID)] || {};
    const tec = mapas.tecnicos[SGO_UTILS.safe(m.TECNICO_ID)] || {};
    const usuario = mapas.usuarios[SGO_UTILS.safe(m.TECNICO_USUARIO_ID || m.TECNICO_ID)] || {};
    return Object.assign({}, m, {
      NUMERO_OS: os.NUMERO_OS || "",
      TIPO_OS: os.TIPO_OS || "",
      TECNICO_NOME: tec.NOME || usuario.NOME || usuario.USUARIO || "",
      TECNICO_LABEL: montarLabelTecnico_(tec) || usuario.NOME || usuario.USUARIO || ""
    });
  }

  function listarTecnicos_() {
    const tecnicos = safeGetAll_(SHEET_TECNICOS)
      .filter(t => !t.STATUS || SGO_UTILS.safeUpper(t.STATUS) === sgoGetCfgSafe_().STATUS.ATIVO)
      .map(function(t) {
        const nome = SGO_UTILS.safe(t.NOME);
        const disponibilidade = SGO_UTILS.safeUpper(t.DISPONIBILIDADE);
        const especialidades = SGO_UTILS.safe(t.ESPECIALIDADES);
        return {
          ID: SGO_UTILS.safe(t.ID),
          USUARIO_ID: SGO_UTILS.safe(t.USUARIO_ID),
          NOME: nome,
          LABEL: [nome, disponibilidade, especialidades].filter(Boolean).join(" | "),
          DISPONIBILIDADE: disponibilidade,
          ESPECIALIDADES: especialidades
        };
      });
    if (tecnicos.length) return tecnicos;
    return safeGetAll_(SHEET_USUARIOS)
      .filter(u => ["TECNICO", "METROLOGIA"].indexOf(SGO_UTILS.safeUpper(u.PERFIL)) >= 0)
      .filter(u => !u.STATUS || SGO_UTILS.safeUpper(u.STATUS) === sgoGetCfgSafe_().STATUS.ATIVO)
      .map(u => ({ ID: u.ID, USUARIO_ID: u.ID, NOME: u.NOME || u.USUARIO || u.EMAIL || u.ID, LABEL: [u.NOME || u.USUARIO || u.EMAIL || u.ID, "USUARIO LEGADO"].filter(Boolean).join(" | "), DISPONIBILIDADE: "", ESPECIALIDADES: "" }));
  }

  function obterTecnico_(id) {
    const tid = SGO_UTILS.safe(id);
    if (!tid) return null;
    return safeGetAll_(SHEET_TECNICOS).find(t => SGO_UTILS.safe(t.ID) === tid) || null;
  }

  function tecnicoVinculadoSessao_(registro, sessao) {
    const userId = SGO_UTILS.safe(sessao && sessao.userId);
    if (!registro || !userId) return false;
    if (SGO_UTILS.safe(registro.TECNICO_USUARIO_ID) === userId) return true;
    if (SGO_UTILS.safe(registro.TECNICO_ID) === userId) return true;
    const tecnico = obterTecnico_(registro.TECNICO_ID);
    return !!(tecnico && SGO_UTILS.safe(tecnico.USUARIO_ID) === userId);
  }

  function montarLabelTecnico_(tecnico) {
    if (!tecnico || !tecnico.ID) return "";
    return [
      SGO_UTILS.safe(tecnico.NOME),
      SGO_UTILS.safeUpper(tecnico.DISPONIBILIDADE),
      SGO_UTILS.safe(tecnico.ESPECIALIDADES)
    ].filter(Boolean).join(" | ");
  }

  function safeGetAll_(sheet) {
    try { return SGO_DATA.getAll(sheet); } catch (e) { return []; }
  }

  return {
    listar, pesquisar, obter, criar, atualizar, checkin, checkout,
    apontarHoras, listarApontamentos, listarOpcoes
  };
})();

function missoesListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesCheckin(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.checkin(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesCheckout(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.checkout(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesApontarHoras(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.apontarHoras(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesListarApontamentos(sessionId, missaoId) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.listarApontamentos(sessionId, missaoId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function missoesListarOpcoes(sessionId) { try { return JSON.parse(JSON.stringify(SGO_MISSOES.listarOpcoes(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
