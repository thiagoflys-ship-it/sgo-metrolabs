// Caminho: Backend/SGO_OS.js

const SGO_OS = (() => {
  const DB_OS = "OS";
  const SHEET = SGO_CFG.SHEETS.OS_ORDENS;
  const SHEET_CLI = SGO_CFG.SHEETS.CAD_CLIENTES;
  const SHEET_UNI = SGO_CFG.SHEETS.CAD_UNIDADES;
  const SHEET_EQP = SGO_CFG.SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_PECAS = SGO_CFG.SHEETS.CAD_PECAS;
  const SHEET_CONTRATOS = SGO_CFG.SHEETS.CAD_CONTRATOS;
  const SHEET_USUARIOS = SGO_CFG.SHEETS.CAD_USUARIOS;
  const SHEET_TECNICOS = SGO_CFG.SHEETS.CAD_TECNICOS;
  const SHEET_MISSOES = SGO_CFG.SHEETS.AGD_MISSOES;
  const SHEET_CHECK_TPL = SGO_CFG.SHEETS.OS_CHECKLIST_TEMPLATE;
  const SHEET_CHECK_RESP = SGO_CFG.SHEETS.OS_CHECKLIST_RESPOSTAS;
  const SHEET_FOTOS = SGO_CFG.SHEETS.OS_FOTOS;
  const SHEET_MATERIAIS = SGO_CFG.SHEETS.OS_MATERIAIS;
  const SHEET_ASSINATURAS = SGO_CFG.SHEETS.SYS_ASSINATURAS;

  function podeCriar_(sessao) {
    const p = perfil_(sessao);
    return ["ADMIN", "GESTOR", "METROLOGIA", "COMERCIAL", "CLIENTE"].indexOf(p) >= 0;
  }

  function podeEditar_(sessao, os) {
    const p = perfil_(sessao);
    if (status_(os) === SGO_CFG.OS.STATUS.APROVADA) return false;
    return ["ADMIN", "GESTOR", "METROLOGIA", "COMERCIAL"].indexOf(p) >= 0;
  }

  function podeExecutar_(sessao, os) {
    const p = perfil_(sessao);
    if (["ADMIN", "GESTOR", "METROLOGIA"].indexOf(p) >= 0) return true;
    if (p === "TECNICO") return tecnicoVinculadoSessao_(os, sessao);
    return false;
  }

  function podeAprovar_(sessao) {
    const p = perfil_(sessao);
    return ["ADMIN", "DIRETORIA", "GESTOR", "METROLOGIA"].indexOf(p) >= 0;
  }

  function podeGerarDocumento_(sessao) {
    const p = perfil_(sessao);
    return ["ADMIN", "DIRETORIA", "GESTOR", "METROLOGIA", "TECNICO"].indexOf(p) >= 0;
  }

  function podeCancelar_(sessao) {
    const p = perfil_(sessao);
    return ["ADMIN", "GESTOR", "DIRETORIA"].indexOf(p) >= 0;
  }

  function validarAcesso_(sessao, os) {
    if (!sessao || !os) return false;
    const p = perfil_(sessao);
    if (p === "CLIENTE") return SGO_UTILS.safe(os.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId);
    if (p === "TECNICO") return tecnicoVinculadoSessao_(os, sessao);
    if (p === "FINANCEIRO") return [SGO_CFG.OS.STATUS.APROVADA, SGO_CFG.OS.STATUS.FATURADA].indexOf(status_(os)) >= 0;
    return true;
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    let itens = safeGetAllDb_(SHEET, DB_OS);

    const p = perfil_(sessao);
    if (p === "CLIENTE") {
      itens = itens.filter(o => SGO_UTILS.safe(o.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId));
    } else if (p === "TECNICO") {
      itens = itens.filter(o => tecnicoVinculadoSessao_(o, sessao));
    } else if (p === "FINANCEIRO") {
      itens = itens.filter(o => [SGO_CFG.OS.STATUS.APROVADA, SGO_CFG.OS.STATUS.FATURADA].indexOf(status_(o)) >= 0);
    }

    const mapas = getMapas_();
    const saida = itens.map(o => sanitizarParaPerfil_(enriquecer_(o, mapas), sessao))
      .sort((a, b) => SGO_UTILS.safe(b.DATA_ABERTURA).localeCompare(SGO_UTILS.safe(a.DATA_ABERTURA)));

    return { success: true, items: saida, total: saida.length };
  }

  function pesquisar(sessionId, termo) {
    const base = listar(sessionId).items;
    const q = SGO_UTILS.safeLower(termo);
    if (!q) return { success: true, items: base, total: base.length };
    const items = base.filter(o => [
      o.NUMERO_OS, o.TIPO_OS, o.PRIORIDADE, o.STATUS, o.CLIENTE_NOME,
      o.UNIDADE_NOME, o.EQUIPAMENTO_TAG, o.RELATO_CLIENTE, o.TECNICO_NOME,
      o.TECNICO_ID, o.TOKEN_VALIDACAO
    ].some(v => SGO_UTILS.safeLower(v).indexOf(q) >= 0));
    return { success: true, items: items, total: items.length };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!validarAcesso_(sessao, os)) return { success: false, message: "Acesso negado." };
    return { success: true, item: sanitizarParaPerfil_(enriquecer_(os, getMapas_()), sessao) };
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeCriar_(sessao)) return { success: false, message: "Acesso negado." };

    const dados = normalizarPayload_(payload);
    if (perfil_(sessao) === "CLIENTE") dados.CLIENTE_ID = SGO_UTILS.safe(sessao.clienteId);

    if (!dados.CLIENTE_ID) return { success: false, message: "Informe o cliente." };
    if (!dados.TIPO_OS) return { success: false, message: "Informe o tipo da OS." };
    if (!dados.PRIORIDADE) dados.PRIORIDADE = "NORMAL";
    if (!dados.RELATO_CLIENTE) return { success: false, message: "Informe o relato do cliente ou descricao da solicitacao." };

    const agora = SGO_UTILS.nowIso();
    const slaHoras = dados.SLA_HORAS || getSlaDefault_(dados.TIPO_OS);
    const registro = SGO_DATA.insert(SHEET, Object.assign({}, dados, {
      NUMERO_OS: gerarNumeroOS_(),
      SLA_HORAS: slaHoras,
      SLA_PRAZO: calcularPrazoSla_(agora, slaHoras),
      STATUS: SGO_CFG.OS.STATUS.ABERTA,
      STATUS_FATURAMENTO: SGO_CFG.OS.STATUS_FATURAMENTO.NAO_LIBERADO,
      FATURAMENTO_STATUS: SGO_CFG.OS.STATUS_FATURAMENTO.NAO_LIBERADO,
      DATA_ABERTURA: agora,
      CRIADO_POR: sessao.usuario,
      CRIADO_EM: agora,
      ATUALIZADO_EM: agora
    }), DB_OS);

    let missao = null;
    if (dados.TECNICO_ID || dados.DATA_AGENDADA) {
      missao = atribuirTecnicoInterno_(sessao, registro, {
        TECNICO_ID: dados.TECNICO_ID,
        DATA_AGENDADA: dados.DATA_AGENDADA,
        MISSAO_TECNICA: dados.MISSAO_TECNICA
      });
    }

    SGO_DATA.log("OS_CRIAR", sessao.usuario, "OS criada: " + registro.NUMERO_OS, "OS");
    return {
      success: true,
      message: missao ? "OS criada e missao vinculada." : "OS criada com sucesso.",
      warning: missao && !missao.TECNICO_USUARIO_ID ? "Tecnico sem usuario vinculado. Vincule um usuario para liberar visualizacao pelo perfil TECNICO." : "",
      item: Object.assign({}, registro, missao ? { MISSAO_ID: missao.ID, STATUS: SGO_CFG.OS.STATUS.AGENDADA } : {})
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const osId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET, osId, DB_OS);
    if (!atual) return { success: false, message: "OS nao encontrada." };
    if (!podeEditar_(sessao, atual)) return { success: false, message: "OS aprovada ou acesso negado." };
    if (assinaturaAtivaBloqueiaRelato_(atual, payload)) {
      return bloqueioAssinaturaRelato_(sessao);
    }

    const dados = normalizarPayload_(payload);
    const update = Object.assign({}, dados, {
      NUMERO_OS: atual.NUMERO_OS,
      STATUS: dados.STATUS || atual.STATUS || SGO_CFG.OS.STATUS.ABERTA,
      STATUS_FATURAMENTO: atual.STATUS_FATURAMENTO,
      FATURAMENTO_STATUS: atual.FATURAMENTO_STATUS || atual.STATUS_FATURAMENTO,
      DATA_ABERTURA: atual.DATA_ABERTURA,
      CRIADO_POR: atual.CRIADO_POR,
      CRIADO_EM: atual.CRIADO_EM,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    });

    const ok = SGO_DATA.update(SHEET, osId, update, DB_OS);
    if (!ok) return { success: false, message: "Erro ao atualizar OS." };

    const precisaMissao = dados.TECNICO_ID || dados.DATA_AGENDADA;
    if (precisaMissao) {
      atribuirTecnicoInterno_(sessao, Object.assign({}, atual, update, { ID: osId }), dados);
    }

    SGO_DATA.log("OS_ATUALIZAR", sessao.usuario, "OS atualizada: " + osId, "OS");
    return { success: true, message: "OS atualizada com sucesso." };
  }

  function cancelar(sessionId, id, motivo) {
    const sessao = exigirSessao(sessionId);
    if (!podeCancelar_(sessao)) return { success: false, message: "Acesso negado." };
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!SGO_UTILS.safe(motivo)) return { success: false, message: "Informe o motivo do cancelamento." };
    if (status_(os) === SGO_CFG.OS.STATUS.APROVADA || status_(os) === SGO_CFG.OS.STATUS.FATURADA) {
      return { success: false, message: "OS aprovada/faturada nao pode ser cancelada sem reversao administrativa." };
    }
    const ok = SGO_DATA.update(SHEET, os.ID, {
      STATUS: SGO_CFG.OS.STATUS.CANCELADA,
      MOTIVO_CANCELAMENTO: SGO_UTILS.safe(motivo),
      CANCELADO_POR: sessao.usuario,
      CANCELADO_EM: SGO_UTILS.nowIso(),
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }, DB_OS);
    if (ok && os.MISSAO_ID) {
      SGO_DATA.update(SHEET_MISSOES, os.MISSAO_ID, { STATUS: SGO_CFG.MISSOES.STATUS.CANCELADA }, DB_OS);
    }
    SGO_DATA.log("OS_CANCELAR", sessao.usuario, "OS cancelada: " + os.ID, "OS");
    return ok ? { success: true, message: "OS cancelada." } : { success: false, message: "Erro ao cancelar OS." };
  }

  function atribuirTecnico(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeEditar_(sessao, os)) return { success: false, message: "Acesso negado." };
    const missao = atribuirTecnicoInterno_(sessao, os, payload || {});
    SGO_DATA.log("OS_AGENDAR", sessao.usuario, "OS agendada: " + os.ID + " missao=" + missao.ID, "OS");
    return {
      success: true,
      message: "Tecnico e missao vinculados.",
      warning: !missao.TECNICO_USUARIO_ID ? "Tecnico sem usuario vinculado. Vincule um usuario para liberar visualizacao pelo perfil TECNICO." : "",
      item: missao
    };
  }

  function iniciarExecucao(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeExecutar_(sessao, os)) return { success: false, message: "Acesso negado." };

    const agora = SGO_UTILS.nowIso();
    const ok = SGO_DATA.update(SHEET, os.ID, {
      STATUS: SGO_CFG.OS.STATUS.EM_EXECUCAO,
      DATA_INICIO: os.DATA_INICIO || agora,
      ATUALIZADO_EM: agora
    }, DB_OS);
    if (ok && os.MISSAO_ID) {
      SGO_DATA.update(SHEET_MISSOES, os.MISSAO_ID, { STATUS: SGO_CFG.MISSOES.STATUS.EM_EXECUCAO, CHECKIN_EM: os.DATA_INICIO || agora }, DB_OS);
    }
    SGO_DATA.log("OS_INICIAR", sessao.usuario, "Execucao iniciada: " + os.ID, "OS");
    return ok ? { success: true, message: "OS marcada em execucao." } : { success: false, message: "Erro ao iniciar execucao." };
  }

  function registrarCheckin(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeExecutar_(sessao, os)) return { success: false, message: "Acesso negado." };
    const agora = SGO_UTILS.nowIso();
    const lat = SGO_UTILS.safe(payload && payload.LAT);
    const lng = SGO_UTILS.safe(payload && payload.LNG);
    const endereco = SGO_UTILS.safe(payload && payload.ENDERECO);
    const ok = SGO_DATA.update(SHEET, os.ID, {
      STATUS: SGO_CFG.OS.STATUS.EM_EXECUCAO,
      DATA_INICIO: os.DATA_INICIO || agora,
      CHECKIN_EM: os.CHECKIN_EM || agora,
      CHECKIN_LAT: lat,
      CHECKIN_LNG: lng,
      CHECKIN_ENDERECO: endereco,
      ATUALIZADO_EM: agora
    }, DB_OS);
    if (ok && os.MISSAO_ID) {
      SGO_DATA.update(SHEET_MISSOES, os.MISSAO_ID, {
        STATUS: SGO_CFG.MISSOES.STATUS.EM_EXECUCAO,
        CHECKIN_EM: agora,
        CHECKIN_LAT: lat,
        CHECKIN_LNG: lng,
        CHECKIN_ENDERECO: endereco
      }, DB_OS);
    }
    return ok ? { success: true, message: "Check-in registrado." } : { success: false, message: "Erro ao registrar check-in." };
  }

  function registrarCheckout(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeExecutar_(sessao, os)) return { success: false, message: "Acesso negado." };
    const agora = SGO_UTILS.nowIso();
    const ok = os.MISSAO_ID ? SGO_DATA.update(SHEET_MISSOES, os.MISSAO_ID, {
      CHECKOUT_EM: agora,
      CHECKOUT_LAT: SGO_UTILS.safe(payload && payload.LAT),
      CHECKOUT_LNG: SGO_UTILS.safe(payload && payload.LNG),
      CHECKOUT_ENDERECO: SGO_UTILS.safe(payload && payload.ENDERECO)
    }, DB_OS) : true;
    return ok ? { success: true, message: "Check-out registrado." } : { success: false, message: "Erro ao registrar check-out." };
  }

  function salvarRegistroTecnico(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeEditarExecucaoOperacional_(sessao, os)) return { success: false, message: "Acesso negado para editar execucao desta OS." };
    if (assinaturaAtivaBloqueiaRelato_(os, payload)) {
      return bloqueioAssinaturaRelato_(sessao);
    }
    if (!osStatusPermiteEdicaoExecucao_(os) && registroTecnicoMudou_(os, payload) && !SGO_UTILS.safe(payload && payload.MOTIVO_ALTERACAO)) {
      return { success: false, code: "MOTIVO_OBRIGATORIO", message: "Informe o motivo para alterar registro tecnico de OS ja concluida." };
    }

    const update = {
      ENCERRAMENTO_TECNICO: SGO_UTILS.safe(payload && (payload.ENCERRAMENTO_TECNICO || payload.RELATO_TECNICO)),
      RELATO_TECNICO: SGO_UTILS.safe(payload && (payload.RELATO_TECNICO || payload.ENCERRAMENTO_TECNICO)),
      RESULTADO_ATENDIMENTO: SGO_UTILS.safeUpper(payload && payload.RESULTADO_ATENDIMENTO),
      CONDICAO_ENCONTRADA: SGO_UTILS.safe(payload && payload.CONDICAO_ENCONTRADA),
      SERVICO_EXECUTADO: SGO_UTILS.safe(payload && payload.SERVICO_EXECUTADO),
      DIAGNOSTICO_FINAL: SGO_UTILS.safe(payload && payload.DIAGNOSTICO_FINAL),
      CAUSA_PROVAVEL: SGO_UTILS.safe(payload && payload.CAUSA_PROVAVEL),
      RECOMENDACAO: SGO_UTILS.safe(payload && payload.RECOMENDACAO),
      PENDENCIAS: SGO_UTILS.safe(payload && payload.PENDENCIAS),
      NECESSITA_RETORNO: payload && payload.NECESSITA_RETORNO ? "S" : "N",
      NECESSITA_ORCAMENTO: payload && payload.NECESSITA_ORCAMENTO ? "S" : "N",
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    };
    const ok = SGO_DATA.update(SHEET, os.ID, update, DB_OS);
    SGO_DATA.log("OS_SALVAR_REGISTRO_TECNICO", sessao.usuario, "Registro tecnico salvo: " + os.ID + " motivo=" + SGO_UTILS.safe(payload && payload.MOTIVO_ALTERACAO), "OS");
    return ok ? { success: true, message: "Registro tecnico salvo." } : { success: false, message: "Erro ao salvar registro tecnico." };
  }

  function validarConclusao(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada.", pendencias: ["OS nao encontrada."] };
    if (!podeExecutar_(sessao, os)) return { success: false, message: "Acesso negado.", pendencias: ["Acesso negado."] };
    const validacao = validarConclusaoInterna_(os);
    return {
      success: validacao.ok,
      ok: validacao.ok,
      message: validacao.ok ? "OS apta para conclusao tecnica." : "Existem pendencias para concluir a OS.",
      pendencias: validacao.pendencias
    };
  }

  function concluirTecnica(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeExecutar_(sessao, os)) return { success: false, message: "Acesso negado." };

    if (payload && (payload.ENCERRAMENTO_TECNICO || payload.DIAGNOSTICO_FINAL)) {
      const salvar = salvarRegistroTecnico(sessionId, os.ID, payload);
      if (!salvar.success) return salvar;
    }

    const atualizada = SGO_DATA.getById(SHEET, os.ID, DB_OS) || os;
    const validacao = validarConclusaoInterna_(atualizada);
    if (!validacao.ok) {
      return { success: false, message: "Nao foi possivel concluir a OS.", pendencias: validacao.pendencias };
    }

    const agora = SGO_UTILS.nowIso();
    const novoStatus = SGO_CFG.OS.STATUS.CONCLUIDA_TECNICAMENTE || SGO_CFG.OS.STATUS.CONCLUIDA;
    const ok = SGO_DATA.update(SHEET, os.ID, {
      STATUS: novoStatus,
      DATA_CONCLUSAO: atualizada.DATA_CONCLUSAO || agora,
      CHECKLIST_OK: "S",
      EVIDENCIAS_OK: "S",
      ATUALIZADO_EM: agora
    }, DB_OS);
    if (ok && atualizada.MISSAO_ID) {
      SGO_DATA.update(SHEET_MISSOES, atualizada.MISSAO_ID, {
        STATUS: SGO_CFG.MISSOES.STATUS.CONCLUIDA,
        CHECKOUT_EM: agora,
        CONCLUSAO_TECNICA: atualizada.ENCERRAMENTO_TECNICO
      }, DB_OS);
    }

    registrarHistoricoEquipamento_(atualizada, { statusTecnico: novoStatus });
    SGO_DATA.log("OS_CONCLUIR_TECNICA", sessao.usuario, "OS concluida tecnicamente: " + os.ID, "OS");
    return ok ? { success: true, message: "OS concluída tecnicamente." } : { success: false, message: "Erro ao concluir OS." };
  }

  function alterarStatus(sessionId, id, status) {
    const novoStatus = SGO_UTILS.safeUpper(status);
    if (novoStatus === SGO_CFG.OS.STATUS.EM_EXECUCAO) return iniciarExecucao(sessionId, id);
    if (novoStatus === SGO_CFG.OS.STATUS.CONCLUIDA || novoStatus === (SGO_CFG.OS.STATUS.CONCLUIDA_TECNICAMENTE || "")) {
      return concluirTecnica(sessionId, id, {});
    }

    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!podeEditar_(sessao, os) && !podeAprovar_(sessao)) return { success: false, message: "Acesso negado." };
    if (status_(os) === SGO_CFG.OS.STATUS.APROVADA) return { success: false, message: "OS aprovada nao pode ter status alterado por fluxo simples." };

    const update = { STATUS: novoStatus, ATUALIZADO_EM: SGO_UTILS.nowIso() };
    if (novoStatus === SGO_CFG.OS.STATUS.AGUARDANDO_ASSINATURA && !os.DATA_CONCLUSAO) update.DATA_CONCLUSAO = SGO_UTILS.nowIso();
    const ok = SGO_DATA.update(SHEET, os.ID, update, DB_OS);
    return ok ? { success: true, message: "Status atualizado." } : { success: false, message: "Erro ao alterar status." };
  }

  function aprovar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!podeAprovar_(sessao)) return { success: false, message: "Acesso negado." };
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (status_(os) === SGO_CFG.OS.STATUS.CANCELADA) return { success: false, message: "OS cancelada nao pode ser aprovada." };

    const statusAtual = status_(os);
    const statusConcluida = SGO_CFG.OS.STATUS.CONCLUIDA_TECNICAMENTE || SGO_CFG.OS.STATUS.CONCLUIDA;
    if ([statusConcluida, SGO_CFG.OS.STATUS.CONCLUIDA, SGO_CFG.OS.STATUS.APROVADA].indexOf(statusAtual) < 0) {
      return { success: false, message: "A OS precisa estar concluida tecnicamente antes da aprovacao administrativa." };
    }
    const validacao = validarConclusaoInterna_(os);
    if (statusAtual !== SGO_CFG.OS.STATUS.APROVADA && statusAtual !== SGO_CFG.OS.STATUS.FATURADA && !validacao.ok) {
      return { success: false, message: "OS ainda nao esta apta para aprovacao.", pendencias: validacao.pendencias };
    }

    const agora = SGO_UTILS.nowIso();
    const ok = SGO_DATA.update(SHEET, os.ID, {
      STATUS: SGO_CFG.OS.STATUS.APROVADA,
      STATUS_FATURAMENTO: SGO_CFG.OS.STATUS_FATURAMENTO.LIBERADO,
      FATURAMENTO_STATUS: SGO_CFG.OS.STATUS_FATURAMENTO.LIBERADO,
      APROVACAO_ADMIN: "APROVADA",
      APROVADOR_ID: sessao.userId,
      DATA_APROVACAO: agora,
      APROVADO_POR: sessao.usuario || sessao.userId,
      APROVADO_EM: agora,
      ATUALIZADO_EM: agora
    }, DB_OS);
    if (ok) {
      registrarHistoricoEquipamento_(Object.assign({}, os, { STATUS: SGO_CFG.OS.STATUS.APROVADA }), { statusTecnico: SGO_CFG.OS.STATUS.APROVADA });
      SGO_DATA.log("OS_APROVAR", sessao.usuario, "OS aprovada: " + os.ID, "OS");
    }
    return ok ? { success: true, message: "OS aprovada e liberada para faturamento." } : { success: false, message: "Erro ao aprovar OS." };
  }

  function gerarDocumento(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!podeGerarDocumento_(sessao)) return { success: false, message: "Acesso negado." };
    if (typeof SGO_DOCUMENT_FACTORY === "undefined" || !SGO_DOCUMENT_FACTORY.gerarDocumento) {
      return { success: false, message: "DocumentFactory nao esta disponivel." };
    }
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!validarAcesso_(sessao, os)) return { success: false, message: "Acesso negado." };
    const pacote = montarPacoteDocumento_(os, sessao);
    pacote.templateDocumental = "OS_TECNICA_PREMIUM_V3";
    const numero = os.NUMERO_OS || os.ID;
    const doc = SGO_DOCUMENT_FACTORY.gerarDocumento(sessionId, {
      TIPO_DOCUMENTO: "OS_TECNICA",
      TITULO: "Ordem de Servico Tecnica - " + numero,
      MODULO_ORIGEM: "OS",
      ENTIDADE_ID: os.ID,
      CLIENTE_ID: os.CLIENTE_ID,
      UNIDADE_ID: os.UNIDADE_ID,
      EQUIPAMENTO_ID: os.EQUIPAMENTO_ID,
      OS_ID: os.ID,
      PECA_ID: os.PECA_ID,
      DADOS: pacote,
      NOME_ARQUIVO: "SGO_OS_TECNICA_PREMIUM_V3_" + sanitizarNomeArquivo_(numero) + "_" + new Date().getTime() + ".pdf",
      VALIDADE: "",
      VISIBILIDADE: "PUBLICO_VALIDACAO"
    });

    if (!doc || !doc.success) return doc || { success: false, message: "Erro ao gerar documento." };

    SGO_DATA.update(SHEET, os.ID, {
      DOCUMENTO_ID: doc.documentoId,
      TOKEN_VALIDACAO: doc.tokenValidacao,
      PDF_URL: doc.pdfUrl,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }, DB_OS);
    registrarHistoricoEquipamento_(Object.assign({}, os, {
      DOCUMENTO_ID: doc.documentoId,
      TOKEN_VALIDACAO: doc.tokenValidacao,
      PDF_URL: doc.pdfUrl
    }), { documentoId: doc.documentoId, statusTecnico: "DOCUMENTO_GERADO" });
    SGO_DATA.log("OS_GERAR_DOCUMENTO", sessao.usuario, "Documento da OS gerado: " + os.ID + " token=" + doc.tokenValidacao, "OS");

    return Object.assign({}, doc, {
      message: "Documento oficial da OS gerado.",
      pacote: sanitizarPacoteParaPerfil_(pacote, sessao)
    });
  }

  function obterPacoteDocumento(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    const os = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    if (!validarAcesso_(sessao, os)) return { success: false, message: "Acesso negado." };
    return { success: true, item: sanitizarPacoteParaPerfil_(montarPacoteDocumento_(os, sessao), sessao) };
  }

  function listarOpcoes(sessionId) {
    const sessao = exigirSessao(sessionId);
    let clientes = SGO_DATA.getAll(SHEET_CLI);
    if (perfil_(sessao) === "CLIENTE") {
      clientes = clientes.filter(c => SGO_UTILS.safe(c.ID) === SGO_UTILS.safe(sessao.clienteId));
    }
    return {
      success: true,
      tipos: SGO_CFG.OS.TIPOS || [],
      prioridades: SGO_CFG.OS.PRIORIDADES || [],
      status: SGO_CFG.OS.STATUS || {},
      clientes: clientes.map(c => ({ ID: c.ID, NOME: c.NOME_FANTASIA || c.RAZAO_SOCIAL || "" })),
      unidades: SGO_DATA.getAll(SHEET_UNI).map(u => ({ ID: u.ID, CLIENTE_ID: u.CLIENTE_ID, NOME: u.NOME_UNIDADE || "" })),
      equipamentos: SGO_DATA.getAll(SHEET_EQP).map(e => ({ ID: e.ID, CLIENTE_ID: e.CLIENTE_ID, UNIDADE_ID: e.UNIDADE_ID, TIPO: e.TIPO || "", TAG: e.TAG || "", FABRICANTE: e.FABRICANTE || "", MODELO: e.MODELO || "", SERIE: e.SERIE || "", SETOR: e.SETOR || "", LABEL: [e.TAG, e.TIPO, e.MODELO, e.SERIE].filter(Boolean).join(" - ") })),
      pecas: safeGetAll_(SHEET_PECAS).map(p => ({ ID: p.ID, EQUIPAMENTO_ID: p.EQUIPAMENTO_ID, LABEL: [p.NOME, p.REFERENCIA, p.NUMERO_SERIE].filter(Boolean).join(" - ") })),
      contratos: safeGetAll_(SHEET_CONTRATOS).map(c => ({ ID: c.ID, CLIENTE_ID: c.CLIENTE_ID, LABEL: [c.NUMERO_CONTRATO, c.TIPO_CONTRATO].filter(Boolean).join(" - ") })),
      tecnicos: listarTecnicos_()
    };
  }

  function buscarUnidadesProximas(sessionId, lat, lng, raioKm) {
    const sessao = exigirSessao(sessionId);
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!isFinite(latitude) || !isFinite(longitude)) return { success: false, message: "Coordenadas invalidas." };
    let clientes = SGO_DATA.getAll(SHEET_CLI);
    if (perfil_(sessao) === "CLIENTE") clientes = clientes.filter(c => SGO_UTILS.safe(c.ID) === SGO_UTILS.safe(sessao.clienteId));
    const mapaClientes = montarMapa_(clientes);
    const limite = Number(raioKm || 2);
    const unidades = SGO_DATA.getAll(SHEET_UNI).map(function(u) {
      const uLat = Number(u.LATITUDE || u.LAT || u.GPS_LAT || u.CHECKIN_LAT);
      const uLng = Number(u.LONGITUDE || u.LNG || u.GPS_LNG || u.CHECKIN_LNG);
      if (!isFinite(uLat) || !isFinite(uLng)) return null;
      const dist = distanciaKm_(latitude, longitude, uLat, uLng);
      return Object.assign({}, u, {
        CLIENTE_NOME: mapaClientes[SGO_UTILS.safe(u.CLIENTE_ID)] ? (mapaClientes[SGO_UTILS.safe(u.CLIENTE_ID)].NOME_FANTASIA || mapaClientes[SGO_UTILS.safe(u.CLIENTE_ID)].RAZAO_SOCIAL || "") : "",
        DISTANCIA_KM: Math.round(dist * 100) / 100
      });
    }).filter(Boolean).filter(function(u) {
      return mapaClientes[SGO_UTILS.safe(u.CLIENTE_ID)] && u.DISTANCIA_KM <= limite;
    }).sort(function(a, b) { return a.DISTANCIA_KM - b.DISTANCIA_KM; });
    return { success: true, items: unidades.slice(0, 10), total: unidades.length };
  }

  function atribuirTecnicoInterno_(sessao, os, payload) {
    payload = payload || {};
    const tecnicoId = SGO_UTILS.safe(payload.TECNICO_ID || os.TECNICO_ID);
    if (!tecnicoId) throw new Error("Informe o tecnico para agendar a OS.");
    const tecnico = obterTecnico_(tecnicoId);
    const tecnicoUsuarioId = SGO_UTILS.safe(payload.TECNICO_USUARIO_ID || (tecnico && tecnico.USUARIO_ID) || os.TECNICO_USUARIO_ID);

    const dataAgendada = SGO_UTILS.safe(payload.DATA_AGENDADA || os.DATA_AGENDADA);
    const missaoTecnica = SGO_UTILS.safe(payload.MISSAO_TECNICA || os.MISSAO_TECNICA || os.RELATO_CLIENTE);
    const numero = os.NUMERO_OS || os.ID;
    const dataPartes = separarDataHora_(dataAgendada);
    const atual = os.MISSAO_ID ? SGO_DATA.getById(SHEET_MISSOES, os.MISSAO_ID, DB_OS) : null;
    const dadosMissao = {
      OS_ID: os.ID,
      TECNICO_ID: tecnicoId,
      TECNICO_USUARIO_ID: tecnicoUsuarioId,
      TITULO: "Missao tecnica " + numero,
      DESCRICAO: missaoTecnica,
      DATA_AGENDADA: dataAgendada,
      DATA: dataPartes.data,
      HORA_INICIO_PREV: dataPartes.hora,
      HORA_INICIO_PREVISTA: dataPartes.hora,
      HORA_FIM_PREV: SGO_UTILS.safe(payload.HORA_FIM_PREV || payload.HORA_FIM_PREVISTA || ""),
      HORA_FIM_PREVISTA: SGO_UTILS.safe(payload.HORA_FIM_PREV || payload.HORA_FIM_PREVISTA || ""),
      SLA_HORAS: os.SLA_HORAS || getSlaDefault_(os.TIPO_OS),
      STATUS: SGO_CFG.MISSOES.STATUS.AGENDADA,
      HORAS_PREVISTAS: SGO_UTILS.safe(payload.HORAS_PREVISTAS || ""),
      VEICULO_ID: SGO_UTILS.safe(payload.VEICULO_ID || os.VEICULO_ID),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES || ""),
      CRIADO_POR: sessao.usuario
    };

    let missao;
    if (atual) {
      SGO_DATA.update(SHEET_MISSOES, atual.ID, dadosMissao, DB_OS);
      missao = Object.assign({}, atual, dadosMissao);
    } else {
      missao = SGO_DATA.insert(SHEET_MISSOES, SGO_DATA.gerarRegistroBase(dadosMissao), DB_OS);
    }

    SGO_DATA.update(SHEET, os.ID, {
      TECNICO_ID: tecnicoId,
      TECNICO_USUARIO_ID: tecnicoUsuarioId,
      MISSAO_ID: missao.ID,
      DATA_AGENDADA: dataAgendada,
      MISSAO_TECNICA: missaoTecnica,
      STATUS: SGO_CFG.OS.STATUS.AGENDADA,
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }, DB_OS);

    return missao;
  }

  function validarConclusaoInterna_(os) {
    const pendencias = [];
    const temRelato = SGO_UTILS.safe(os.RELATO_TECNICO) || SGO_UTILS.safe(os.ENCERRAMENTO_TECNICO) || SGO_UTILS.safe(os.SERVICO_EXECUTADO);
    if (!temRelato) pendencias.push("Informe o relato tecnico do atendimento.");

    if (typeof SGO_OS_CHECKLIST !== "undefined" && SGO_OS_CHECKLIST.validarObrigatoriosInterno) {
      const validChecklist = SGO_OS_CHECKLIST.validarObrigatoriosInterno(enriquecer_(os, getMapas_()));
      (validChecklist.pendencias || []).forEach(function(p) { pendencias.push(p); });
    } else {
      const templates = safeGetAllDb_(SHEET_CHECK_TPL, DB_OS)
        .filter(t => SGO_UTILS.safeUpper(t.TIPO_OS) === SGO_UTILS.safeUpper(os.TIPO_OS))
        .filter(t => SGO_UTILS.safeUpper(t.ATIVO || "S") !== "N");
      const respostas = safeGetMany_(SHEET_CHECK_RESP, "OS_ID", os.ID, DB_OS);
      const obrigatorios = templates.filter(t => SGO_UTILS.safeUpper(t.OBRIGATORIO) === "S" || SGO_UTILS.toBoolean(t.OBRIGATORIO));
      obrigatorios.forEach(function(t) {
        const resp = respostas.find(r => SGO_UTILS.safe(r.TEMPLATE_ID) === SGO_UTILS.safe(t.ID));
        if (!resp || !SGO_UTILS.safe(resp.RESPOSTA)) pendencias.push("Checklist obrigatorio pendente: " + (t.PERGUNTA || t.ITEM || t.DESCRICAO || t.ID));
      });
    }

    if (tipoExigeEvidencia_(os.TIPO_OS)) {
      const fotos = safeGetMany_(SHEET_FOTOS, "OS_ID", os.ID, DB_OS).filter(fotoAtiva_);
      if (!fotos.length) pendencias.push("Registre ao menos uma evidencia/foto da execucao.");
    }

    if (tipoExigeAssinatura_(os.TIPO_OS)) {
      const assinaturas = assinaturasAtivasPorOS_(os.ID);
      if (!assinaturas.length) pendencias.push("Colete a assinatura do cliente/responsavel.");
    }

    return { ok: pendencias.length === 0, pendencias: pendencias };
  }

  function assinaturaAtiva_(item) {
    const st = SGO_UTILS.safeUpper(item && item.STATUS);
    return !st || st === "ATIVA" || st === "ATIVO";
  }

  function fotoAtiva_(item) {
    const st = SGO_UTILS.safeUpper(item && item.STATUS);
    return !st || st === "ATIVA" || st === "ATIVO";
  }

  function assinaturasAtivasPorOS_(osId) {
    return safeGetMany_(SHEET_ASSINATURAS, "OS_ID", osId, DB_OS).filter(assinaturaAtiva_);
  }

  function assinaturaAtivaBloqueiaRelato_(os, payload) {
    if (!payload) return false;
    if (osStatusPermiteEdicaoExecucao_(os)) return false;
    const novo = SGO_UTILS.safe(payload.ENCERRAMENTO_TECNICO || payload.RELATO_TECNICO || payload.SERVICO_EXECUTADO);
    if (!novo) return false;
    const atual = SGO_UTILS.safe(os.ENCERRAMENTO_TECNICO || os.RELATO_TECNICO || os.SERVICO_EXECUTADO);
    if (novo === atual) return false;
    if (SGO_UTILS.safe(os.ASSINATURA_ID)) return true;
    return assinaturasAtivasPorOS_(os.ID).length > 0;
  }

  function osStatusPermiteEdicaoExecucao_(os) {
    const st = SGO_UTILS.safeUpper(os && os.STATUS);
    return ["ABERTA", "AGENDADA", "EM_EXECUCAO"].indexOf(st) >= 0;
  }

  function perfilAdminOperacional_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return perfil === "ADMIN" || perfil === "DIRETORIA" || perfil === "GESTOR";
  }

  function podeEditarExecucaoOperacional_(sessao, os) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    if (perfil === "CLIENTE") return false;
    if (perfilAdminOperacional_(sessao)) return true;
    if (osStatusPermiteEdicaoExecucao_(os)) {
      if (perfil === "TECNICO") return tecnicoVinculadoSessao_(os, sessao);
      return perfil === "METROLOGIA";
    }
    return false;
  }

  function registroTecnicoMudou_(os, payload) {
    payload = payload || {};
    const campos = [
      ["RELATO_TECNICO", payload.RELATO_TECNICO || payload.ENCERRAMENTO_TECNICO],
      ["ENCERRAMENTO_TECNICO", payload.ENCERRAMENTO_TECNICO || payload.RELATO_TECNICO],
      ["SERVICO_EXECUTADO", payload.SERVICO_EXECUTADO],
      ["RESULTADO_ATENDIMENTO", SGO_UTILS.safeUpper(payload.RESULTADO_ATENDIMENTO)],
      ["NECESSITA_RETORNO", payload.NECESSITA_RETORNO ? "S" : "N"],
      ["NECESSITA_ORCAMENTO", payload.NECESSITA_ORCAMENTO ? "S" : "N"]
    ];
    return campos.some(function(par) {
      return SGO_UTILS.safe(os && os[par[0]]) !== SGO_UTILS.safe(par[1]);
    });
  }

  function bloqueioAssinaturaRelato_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    const admin = perfil === "ADMIN" || perfil === "DIRETORIA" || perfil === "GESTOR";
    return {
      success: false,
      code: "ASSINATURA_BLOQUEIA_RELATO",
      canAdminResolve: admin,
      message: admin
        ? "Assinatura existente bloqueia edicao do encerramento tecnico. Remova/inative a assinatura com motivo e colete nova assinatura apos alterar."
        : "Assinatura existente bloqueia edicao do encerramento tecnico. Solicite a um ADMIN/GESTOR a remocao da assinatura para reabrir o relato."
    };
  }

  function montarPacoteDocumento_(os, sessao) {
    const mapas = getMapas_();
    const osCompleta = enriquecer_(os, mapas);
    const checklist = safeGetMany_(SHEET_CHECK_RESP, "OS_ID", os.ID, DB_OS);
    const fotos = safeGetMany_(SHEET_FOTOS, "OS_ID", os.ID, DB_OS).filter(fotoAtiva_);
    const materiais = safeGetMany_(SHEET_MATERIAIS, "OS_ID", os.ID, DB_OS);
    const assinaturas = assinaturasAtivasPorOS_(os.ID);
    const missao = os.MISSAO_ID ? SGO_DATA.getById(SHEET_MISSOES, os.MISSAO_ID, DB_OS) : null;
    const tecnico = obterTecnico_(os.TECNICO_ID) || obterUsuario_(os.TECNICO_USUARIO_ID || os.TECNICO_ID);

    return {
      os: osCompleta,
      cliente: mapas.clientes[SGO_UTILS.safe(os.CLIENTE_ID)] || null,
      unidade: mapas.unidades[SGO_UTILS.safe(os.UNIDADE_ID)] || null,
      equipamento: mapas.equipamentos[SGO_UTILS.safe(os.EQUIPAMENTO_ID)] || null,
      peca: mapas.pecas[SGO_UTILS.safe(os.PECA_ID)] || null,
      contrato: mapas.contratos[SGO_UTILS.safe(os.CONTRATO_ID)] || null,
      tecnico: tecnico,
      missao: missao,
      checklist: checklist,
      fotos: fotos,
      materiais: materiais,
      assinaturas: assinaturas,
      assinatura: assinaturas.length ? assinaturas[assinaturas.length - 1] : null,
      custos: {
        CUSTO_PECAS: os.CUSTO_PECAS,
        CUSTO_HORA: os.CUSTO_HORA,
        CUSTO_DESLOCAMENTO: os.CUSTO_DESLOCAMENTO,
        CUSTO_TOTAL: os.CUSTO_TOTAL
      },
      historico: [],
      emitidoPorPerfil: perfil_(sessao)
    };
  }

  function tipoDocStatus_(statusOs) {
    const s = SGO_UTILS.safeUpper(statusOs);
    if (["APROVADA", "FATURADA"].indexOf(s) >= 0) return { label: "DOCUMENTO OFICIAL", cor: "#065f46", bg: "#d1fae5", watermark: false };
    if (["CONCLUIDA_TECNICAMENTE", "EM_APROVACAO"].indexOf(s) >= 0) return { label: "ATENDIMENTO CONCLUIDO", cor: "#065f46", bg: "#d1fae5", watermark: false };
    return { label: "ORDEM DE SERVICO TECNICA", cor: "#0b3b78", bg: "#eff6ff", watermark: false };
  }

  function montarHtmlOS_(pacote, sessao) {
    const os = pacote.os || {};
    const cli = pacote.cliente || {};
    const uni = pacote.unidade || {};
    const eqp = pacote.equipamento || {};
    const peca = pacote.peca || {};
    const contrato = pacote.contrato || {};
    const tec = pacote.tecnico || {};
    const missao = pacote.missao || {};
    const mostrarCustos = perfil_(sessao) !== "CLIENTE";
    const assinatura = pacote.assinatura || {};
    const tecnicoNome = tec.NOME || tec.USUARIO || os.TECNICO_NOME || os.TECNICO_ID;
    const clienteNome = cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || os.CLIENTE_NOME || os.CLIENTE_ID;
    const unidadeNome = uni.NOME_UNIDADE || os.UNIDADE_NOME || os.UNIDADE_ID;
    const equipamentoNome = [eqp.TAG, eqp.TIPO, eqp.FABRICANTE, eqp.MODELO].filter(Boolean).join(" - ") || os.EQUIPAMENTO_ID;
    const contratoNome = [contrato.NUMERO_CONTRATO, contrato.TIPO_CONTRATO].filter(Boolean).join(" - ") || os.CONTRATO_ID;
    const tipoDoc = tipoDocStatus_(os.STATUS);
    const watermarkStyle = tipoDoc.watermark
      ? 'body::after{content:"' + tipoDoc.label + '";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;font-weight:900;color:rgba(0,0,0,.04);pointer-events:none;white-space:nowrap;z-index:9999;}'
      : "";

    return (watermarkStyle ? '<style>' + watermarkStyle + '</style>' : '') +
    '<main class="df-doc">' +
    '<div style="background:' + tipoDoc.bg + ';color:' + tipoDoc.cor + ';padding:8px 16px;border-radius:6px;font-size:12px;font-weight:800;text-align:center;letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px;">' + esc_(tipoDoc.label) + '</div>' +
      '<section class="df-cover">' +
        '<div>' +
          '<div class="df-brand">METROLABS</div>' +
          '<div class="df-brand-sub">SGO+ Engenharia Clinica | Documento tecnico controlado</div>' +
          '<div class="df-title">Ordem de Servico Tecnica</div>' +
          '<div class="df-subtitle">Relatorio executivo de atendimento, rastreabilidade e evidencias tecnicas</div>' +
          '<div class="df-cover-meta">' +
            metaCard_("Numero da O.S", os.NUMERO_OS || os.ID) +
            metaCard_("Status", badgeStatusDoc_(os.STATUS)) +
            metaCard_("Tipo", os.TIPO_OS) +
            metaCard_("Prioridade", os.PRIORIDADE) +
            metaCard_("Emissao", "{{DATA_EMISSAO}}") +
            metaCard_("Gerado por", "{{GERADO_POR}}") +
            metaCard_("Codigo documental", "{{CODIGO_DOCUMENTAL}}") +
            metaCard_("Token", "{{TOKEN_VALIDACAO}}") +
          '</div>' +
        '</div>' +
        '<div class="df-qrbox">' +
          '<img src="{{QRCODE_DATA_URL}}" alt="QR Code">' +
          '<div class="df-token">{{TOKEN_VALIDACAO}}</div>' +
          '<div class="df-meta-k" style="margin-top:4px;">Validacao digital</div>' +
        '</div>' +
      '</section>' +

      dfSection_("Resumo executivo", '<div class="df-summary">' +
        metaCard_("Cliente", clienteNome) +
        metaCard_("Unidade", unidadeNome) +
        metaCard_("Setor", eqp.SETOR || os.SETOR) +
        metaCard_("Equipamento", equipamentoNome) +
        metaCard_("TAG", eqp.TAG || os.EQUIPAMENTO_TAG) +
        metaCard_("Fabricante / Modelo", [eqp.FABRICANTE, eqp.MODELO].filter(Boolean).join(" / ")) +
        metaCard_("Serie", eqp.SERIE || os.EQUIPAMENTO_SERIE) +
        metaCard_("Contrato", contratoNome) +
        metaCard_("SLA", formatarDataDoc_(os.SLA_PRAZO)) +
        metaCard_("Tecnico", tecnicoNome) +
        metaCard_("Abertura", formatarDataDoc_(os.DATA_ABERTURA)) +
        metaCard_("Agendamento", formatarDataDoc_(os.DATA_AGENDADA)) +
      '</div>') +

      dfSection_("Relato e Execu&ccedil;&atilde;o T&eacute;cnica",
        '<div class="df-summary" style="grid-template-columns:1fr 1fr; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">' +
          noteCard_("Demanda do cliente", os.RELATO_CLIENTE) +
          noteCard_("Miss&atilde;o t&eacute;cnica", os.MISSAO_TECNICA) +
        '</div>' +
        tabelaDoc_([
          ["In&iacute;cio", formatarDataDoc_(os.DATA_INICIO || missao.CHECKIN_EM), "Fim", formatarDataDoc_(os.DATA_CONCLUSAO || missao.CHECKOUT_EM)],
          ["Tecnico", tecnicoNome, "Status final", os.STATUS],
          ["Encerramento t&eacute;cnico", os.ENCERRAMENTO_TECNICO, "Diagn&oacute;stico final", os.DIAGNOSTICO_FINAL],
          ["Necessita retorno?", os.NECESSITA_RETORNO === "S" ? "SIM" : "NÃO", "Necessita or&ccedil;amento?", os.NECESSITA_ORCAMENTO === "S" ? "SIM" : "NÃO"]
        ])
      ) +

      dfSection_("Checklist", tabelaChecklistDoc_(pacote.checklist)) +
      dfSection_("Materiais e pe&ccedil;as", tabelaMateriaisDoc_(pacote.materiais, mostrarCustos)) +
      dfSection_("Evidencias", tabelaEvidenciasDoc_(pacote.fotos)) +
      dfSection_("Assinaturas", '<div class="df-sign">' +
        tabelaDoc_([
          ["Assinado por", assinatura.ASSINADO_POR || os.ASSINADO_POR, "Cargo", assinatura.CARGO],
          ["Assinado em", formatarDataDoc_(assinatura.ASSINADO_EM || os.ASSINADO_EM), "Status", os.STATUS]
        ]) +
        blocoAssinaturaDoc_(assinatura) +
      '</div>') +

      (mostrarCustos ? dfSection_("Custos internos", '<div class="df-summary">' +
        metaCard_("Pecas", os.CUSTO_PECAS) +
        metaCard_("Hora tecnica", os.CUSTO_HORA) +
        metaCard_("Deslocamento", os.CUSTO_DESLOCAMENTO) +
        metaCard_("Total", os.CUSTO_TOTAL) +
      '</div>') : "") +

      '<footer class="df-footer">' +
        '<div>' +
          '<strong>Rastreabilidade digital METROLABS SGO+</strong><br>' +
          'Hash SHA256: <span class="mono">{{HASH_SHA256}}</span><br>' +
          'Token: <span class="mono">{{TOKEN_VALIDACAO}}</span><br>' +
          'Validacao: <span class="mono">{{URL_VALIDACAO}}</span>' +
        '</div>' +
        '<div style="text-align:center;"><img src="{{QRCODE_DATA_URL}}" alt="QR Code"><div class="df-meta-k">Validar</div></div>' +
      '</footer>' +
    '</main>';
  }

  function registrarHistoricoEquipamento_(os, meta) {
    if (!os || !os.EQUIPAMENTO_ID) return;
    try {
      const sheet = SGO_CFG.SHEETS.REG_TECNICO;
      const registro = {
        EQUIPAMENTO_ID: os.EQUIPAMENTO_ID,
        CLIENTE_ID: os.CLIENTE_ID,
        UNIDADE_ID: os.UNIDADE_ID,
        OS_ID: os.ID,
        TIPO_SERVICO: os.TIPO_OS,
        DATA_SERVICO: os.DATA_CONCLUSAO || SGO_UTILS.nowIso(),
        RESPONSAVEL_TECNICO: os.TECNICO_ID,
        DESCRICAO: "OS " + (os.NUMERO_OS || os.ID) + " - " + (meta && meta.statusTecnico ? meta.statusTecnico : os.STATUS),
        DOCUMENTO_ID: (meta && meta.documentoId) || os.DOCUMENTO_ID || "",
        STATUS: "REGISTRADO",
        CRIADO_EM: SGO_UTILS.nowIso()
      };
      SGO_DATA.insert(sheet, registro);
    } catch (e) {
      SGO_DATA.log("OS_HISTORICO_EQP_FALHA", "", "Nao foi possivel registrar historico da OS " + os.ID + ": " + e.message, "OS");
    }
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      TIPO_OS: SGO_UTILS.safeUpper(payload.TIPO_OS),
      PRIORIDADE: SGO_UTILS.safeUpper(payload.PRIORIDADE || "NORMAL"),
      SLA_HORAS: SGO_UTILS.safe(payload.SLA_HORAS),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS),
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(payload.UNIDADE_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      PECA_ID: SGO_UTILS.safe(payload.PECA_ID),
      CONTRATO_ID: SGO_UTILS.safe(payload.CONTRATO_ID),
      RELATO_CLIENTE: SGO_UTILS.safe(payload.RELATO_CLIENTE || payload.DESCRICAO),
      MISSAO_TECNICA: SGO_UTILS.safe(payload.MISSAO_TECNICA || payload.ORIENTACAO_TECNICA),
      ORIENTACAO_TECNICA: SGO_UTILS.safe(payload.ORIENTACAO_TECNICA || payload.MISSAO_TECNICA),
      RESPONSAVEL_ID: SGO_UTILS.safe(payload.RESPONSAVEL_ID),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID),
      TECNICO_USUARIO_ID: SGO_UTILS.safe(payload.TECNICO_USUARIO_ID),
      MISSAO_ID: SGO_UTILS.safe(payload.MISSAO_ID),
      VEICULO_ID: SGO_UTILS.safe(payload.VEICULO_ID),
      DATA_AGENDADA: SGO_UTILS.safe(payload.DATA_AGENDADA),
      DATA_INICIO: SGO_UTILS.safe(payload.DATA_INICIO),
      DATA_CONCLUSAO: SGO_UTILS.safe(payload.DATA_CONCLUSAO),
      LOCAL_ATENDIMENTO: SGO_UTILS.safe(payload.LOCAL_ATENDIMENTO),
      CHECKIN_LAT: SGO_UTILS.safe(payload.CHECKIN_LAT),
      CHECKIN_LNG: SGO_UTILS.safe(payload.CHECKIN_LNG),
      CHECKIN_ENDERECO: SGO_UTILS.safe(payload.CHECKIN_ENDERECO),
      CONDICAO_ENCONTRADA: SGO_UTILS.safe(payload.CONDICAO_ENCONTRADA),
      SERVICO_EXECUTADO: SGO_UTILS.safe(payload.SERVICO_EXECUTADO),
      ENCERRAMENTO_TECNICO: SGO_UTILS.safe(payload.ENCERRAMENTO_TECNICO || payload.RELATO_TECNICO),
      RELATO_TECNICO: SGO_UTILS.safe(payload.RELATO_TECNICO || payload.ENCERRAMENTO_TECNICO),
      RESULTADO_ATENDIMENTO: SGO_UTILS.safeUpper(payload.RESULTADO_ATENDIMENTO),
      DIAGNOSTICO_FINAL: SGO_UTILS.safe(payload.DIAGNOSTICO_FINAL),
      CAUSA_PROVAVEL: SGO_UTILS.safe(payload.CAUSA_PROVAVEL),
      RECOMENDACAO: SGO_UTILS.safe(payload.RECOMENDACAO),
      PENDENCIAS: SGO_UTILS.safe(payload.PENDENCIAS),
      NECESSITA_RETORNO: payload.NECESSITA_RETORNO ? "S" : "N",
      NECESSITA_ORCAMENTO: payload.NECESSITA_ORCAMENTO ? "S" : "N",
      QUESTIONARIO_MODELO_ID: SGO_UTILS.safe(payload.QUESTIONARIO_MODELO_ID),
      CHECKIN_EM: SGO_UTILS.safe(payload.CHECKIN_EM),
      CHECKOUT_EM: SGO_UTILS.safe(payload.CHECKOUT_EM),
      CHECKOUT_LAT: SGO_UTILS.safe(payload.CHECKOUT_LAT),
      CHECKOUT_LNG: SGO_UTILS.safe(payload.CHECKOUT_LNG),
      CUSTO_PECAS: SGO_UTILS.safe(payload.CUSTO_PECAS),
      CUSTO_HORA: SGO_UTILS.safe(payload.CUSTO_HORA),
      CUSTO_DESLOCAMENTO: SGO_UTILS.safe(payload.CUSTO_DESLOCAMENTO),
      CUSTO_TOTAL: SGO_UTILS.safe(payload.CUSTO_TOTAL),
      NUMERO_NF: SGO_UTILS.safe(payload.NUMERO_NF),
      OBSERVACOES_FATURAMENTO: SGO_UTILS.safe(payload.OBSERVACOES_FATURAMENTO)
    };
  }

  function getMapas_() {
    return {
      clientes: montarMapa_(SGO_DATA.getAll(SHEET_CLI)),
      unidades: montarMapa_(SGO_DATA.getAll(SHEET_UNI)),
      equipamentos: montarMapa_(SGO_DATA.getAll(SHEET_EQP)),
      pecas: montarMapa_(safeGetAll_(SHEET_PECAS)),
      contratos: montarMapa_(safeGetAll_(SHEET_CONTRATOS)),
      tecnicos: montarMapa_(safeGetAll_(SHEET_TECNICOS)),
      usuarios: montarMapa_(safeGetAll_(SHEET_USUARIOS))
    };
  }

  function enriquecer_(o, mapas) {
    const cli = mapas.clientes[SGO_UTILS.safe(o.CLIENTE_ID)] || {};
    const uni = mapas.unidades[SGO_UTILS.safe(o.UNIDADE_ID)] || {};
    const eqp = mapas.equipamentos[SGO_UTILS.safe(o.EQUIPAMENTO_ID)] || {};
    const peca = mapas.pecas[SGO_UTILS.safe(o.PECA_ID)] || {};
    const contrato = mapas.contratos[SGO_UTILS.safe(o.CONTRATO_ID)] || {};
    const tecnico = mapas.tecnicos[SGO_UTILS.safe(o.TECNICO_ID)] || {};
    const usuarioTecnico = mapas.usuarios[SGO_UTILS.safe(o.TECNICO_USUARIO_ID || o.TECNICO_ID)] || {};
    return Object.assign({}, o, {
      CLIENTE_NOME: cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "",
      UNIDADE_NOME: uni.NOME_UNIDADE || "",
      EQUIPAMENTO_TAG: eqp.TAG || "",
      EQUIPAMENTO_TIPO: eqp.TIPO || "",
      EQUIPAMENTO_MODELO: eqp.MODELO || "",
      EQUIPAMENTO_SERIE: eqp.SERIE || "",
      PECA_NOME: peca.NOME || "",
      CONTRATO_NUMERO: contrato.NUMERO_CONTRATO || "",
      TECNICO_NOME: tecnico.NOME || usuarioTecnico.NOME || usuarioTecnico.USUARIO || "",
      TECNICO_LABEL: montarLabelTecnico_(tecnico) || usuarioTecnico.NOME || usuarioTecnico.USUARIO || ""
    });
  }

  function listarTecnicos_() {
    const tecnicos = safeGetAll_(SHEET_TECNICOS)
      .filter(t => !t.STATUS || SGO_UTILS.safeUpper(t.STATUS) === SGO_CFG.STATUS.ATIVO)
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
      .filter(u => !u.STATUS || SGO_UTILS.safeUpper(u.STATUS) === SGO_CFG.STATUS.ATIVO)
      .map(u => ({ ID: u.ID, USUARIO_ID: u.ID, NOME: u.NOME || u.USUARIO || u.EMAIL || u.ID, LABEL: [u.NOME || u.USUARIO || u.EMAIL || u.ID, "USUARIO LEGADO"].filter(Boolean).join(" | "), DISPONIBILIDADE: "", ESPECIALIDADES: "" }));
  }

  function obterTecnico_(id) {
    const tid = SGO_UTILS.safe(id);
    if (!tid) return null;
    return safeGetAll_(SHEET_TECNICOS).find(t => SGO_UTILS.safe(t.ID) === tid) || null;
  }

  function obterUsuario_(id) {
    const uid = SGO_UTILS.safe(id);
    if (!uid) return null;
    return safeGetAll_(SHEET_USUARIOS).find(u => SGO_UTILS.safe(u.ID) === uid) || null;
  }

  function tecnicoVinculadoSessao_(os, sessao) {
    const userId = SGO_UTILS.safe(sessao && sessao.userId);
    if (!os || !userId) return false;
    if (SGO_UTILS.safe(os.TECNICO_USUARIO_ID) === userId) return true;
    if (SGO_UTILS.safe(os.TECNICO_ID) === userId) return true;
    const tecnico = obterTecnico_(os.TECNICO_ID);
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

  function safeGetAllDb_(sheet, dbKey) {
    try { return SGO_DATA.getAll(sheet, dbKey); } catch (e) { return []; }
  }

  function safeGetMany_(sheet, campo, valor, dbKey) {
    try { return SGO_DATA.getManyByField(sheet, campo, valor, dbKey); } catch (e) { return []; }
  }

  function safeGetManyPrincipal_(sheet, campo, valor) {
    try { return SGO_DATA.getManyByField(sheet, campo, valor); } catch (e) { return []; }
  }

  function montarMapa_(lista) {
    const mapa = {};
    (lista || []).forEach(i => mapa[SGO_UTILS.safe(i.ID)] = i);
    return mapa;
  }

  function gerarNumeroOS_() {
    const ano = new Date().getFullYear();
    const totalAno = safeGetAllDb_(SHEET, DB_OS).filter(o => SGO_UTILS.safe(o.NUMERO_OS).indexOf("OS-" + ano + "-") === 0).length + 1;
    return "OS-" + ano + "-" + String(totalAno).padStart(5, "0");
  }

  function getSlaDefault_(tipo) {
    const mapa = (SGO_CFG.OS && SGO_CFG.OS.SLA_DEFAULTS_HORAS) || {};
    return mapa[SGO_UTILS.safeUpper(tipo)] || 24;
  }

  function calcularPrazoSla_(iso, horas) {
    const d = new Date(iso);
    d.setHours(d.getHours() + Number(horas || 24));
    return d.toISOString();
  }

  function distanciaKm_(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function tipoExigeEvidencia_(tipo) {
    return ["ORCAMENTO"].indexOf(SGO_UTILS.safeUpper(tipo)) < 0;
  }

  function tipoExigeAssinatura_(tipo) {
    return ["ORCAMENTO"].indexOf(SGO_UTILS.safeUpper(tipo)) < 0;
  }

  function perfil_(sessao) {
    return SGO_UTILS.safeUpper(sessao && sessao.perfil);
  }

  function status_(os) {
    return SGO_UTILS.safeUpper(os && os.STATUS);
  }

  function sanitizarParaPerfil_(item, sessao) {
    const out = Object.assign({}, item || {});
    if (perfil_(sessao) === "CLIENTE") {
      ["CUSTO_PECAS", "CUSTO_HORA", "CUSTO_DESLOCAMENTO", "CUSTO_TOTAL", "OBSERVACOES_FATURAMENTO", "NUMERO_NF"].forEach(k => delete out[k]);
    }
    return out;
  }

  function sanitizarPacoteParaPerfil_(pacote, sessao) {
    const out = SGO_UTILS.clone(pacote);
    if (perfil_(sessao) === "CLIENTE") {
      delete out.custos;
      if (out.os) {
        ["CUSTO_PECAS", "CUSTO_HORA", "CUSTO_DESLOCAMENTO", "CUSTO_TOTAL", "OBSERVACOES_FATURAMENTO", "NUMERO_NF"].forEach(k => delete out.os[k]);
      }
    }
    return out;
  }

  function separarDataHora_(valor) {
    const v = SGO_UTILS.safe(valor);
    if (!v) return { data: "", hora: "" };
    return { data: v.substring(0, 10), hora: v.length >= 16 ? v.substring(11, 16) : "" };
  }

  function dfSection_(titulo, corpo) {
    return '<section class="df-section"><h2 class="df-section-title">' + esc_(titulo) + '</h2>' + corpo + '</section>';
  }

  function metaCard_(label, value) {
    return '<div class="df-card"><div class="df-meta-k">' + esc_(label) + '</div><div class="df-meta-v">' + (value && String(value).indexOf("<span") === 0 ? value : esc_(value || "--")) + '</div></div>';
  }

  function noteCard_(label, value) {
    return '<div><div class="df-meta-k" style="margin-bottom:4px;">' + esc_(label) + '</div><div class="df-note">' + esc_(value || "--") + '</div></div>';
  }

  function tabelaDoc_(linhas) {
    return '<table class="df-table"><tbody>' + (linhas || []).map(function(l) {
      return '<tr><th>' + esc_(l[0]) + '</th><td>' + esc_(l[1] || "--") + '</td><th>' + esc_(l[2] || "") + '</th><td>' + esc_(l[3] || "--") + '</td></tr>';
    }).join("") + '</tbody></table>';
  }

  function tabelaChecklistDoc_(items) {
    if (!items || !items.length) return '<div class="df-note">Nenhum checklist respondido.</div>';
    const secoes = {};
    items.forEach(function(i) {
      const sec = SGO_UTILS.safe(i.SECAO) || "Geral";
      if (!secoes[sec]) secoes[sec] = [];
      secoes[sec].push(i);
    });
    return Object.keys(secoes).map(function(sec) {
      const rows = secoes[sec].map(function(i) {
        const resposta = SGO_UTILS.safe(i.RESPOSTA) || "--";
        const cor = resposta === "OK" ? "#065f46" : resposta === "NAO_OK" ? "#7f1d1d" : "#374151";
        return '<tr><td>' + esc_(i.PERGUNTA || i.ITEM || i.TEMPLATE_ID) + '</td>' +
          '<td style="text-align:center;">' + esc_(i.OBRIGATORIO || "--") + '</td>' +
          '<td style="font-weight:700;color:' + cor + ';">' + esc_(resposta) + '</td>' +
          '<td>' + esc_(i.OBSERVACAO || "--") + '</td></tr>';
      }).join("");
      return '<tr><th colspan="4" style="background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;">' + esc_(sec) + '</th></tr>' + rows;
    }).join("").replace(/^/, '<table class="df-table"><thead><tr><th>Item</th><th>Obrig.</th><th>Resposta</th><th>Observacao</th></tr></thead><tbody>').concat('</tbody></table>');
  }

  function tabelaMateriaisDoc_(items, mostrarCustos) {
    if (!items || !items.length) return '<div class="df-note">Nenhum material registrado.</div>';
    return '<table class="df-table"><thead><tr><th>Descricao</th><th>Referencia</th><th>Lote/Serie</th><th>Qtd</th>' + (mostrarCustos ? '<th>Custo</th>' : '') + '<th>Fornecedor</th></tr></thead><tbody>' +
      items.map(i => '<tr><td>' + esc_(i.DESCRICAO || "--") + '</td><td>' + esc_(i.REFERENCIA || "--") + '</td><td>' + esc_(i.NUMERO_SERIE || i.LOTE || "--") + '</td><td>' + esc_(i.QUANTIDADE || "--") + '</td>' + (mostrarCustos ? '<td>' + esc_(i.CUSTO_TOTAL || "--") + '</td>' : '') + '<td>' + esc_(i.FORNECEDOR || i.FORNECEDOR_ID || "--") + '</td></tr>').join("") +
      '</tbody></table>';
  }

  function tabelaEvidenciasDoc_(items) {
    if (!items || !items.length) return '<div class="df-note">Nenhuma evidencia registrada.</div>';
    return '<table class="df-table"><thead><tr><th>Momento</th><th>Nome</th><th>Link Drive</th><th>Observacao</th></tr></thead><tbody>' +
      items.map(i => '<tr><td>' + esc_(i.MOMENTO || "GERAL") + '</td><td>' + esc_(i.NOME_ARQUIVO || "--") + '</td><td>' + esc_(i.LINK_DRIVE || "--") + '</td><td>' + esc_(i.OBSERVACAO || "--") + '</td></tr>').join("") +
      '</tbody></table>';
  }

  function blocoAssinaturaDoc_(assinatura) {
    const dataUrl = SGO_UTILS.safe(assinatura && assinatura.ASSINATURA_DATA_URL);
    const link = SGO_UTILS.safe(assinatura && assinatura.LINK_DRIVE);
    let conteudo = '<div class="df-meta-k">Assinatura digital</div><div style="margin-top:22px;color:#98a2b3;">Sem imagem de assinatura.</div>';
    if (dataUrl.indexOf("data:image/") === 0) {
      conteudo = '<div class="df-meta-k">Assinatura digital</div><img src="' + escAttr_(dataUrl) + '" alt="Assinatura">';
    } else if (link) {
      conteudo = '<div class="df-meta-k">Assinatura digital</div><div style="margin-top:18px;">' + esc_(link) + '</div>';
    }
    return '<div class="df-sign-img">' + conteudo + '</div>';
  }

  function badgeStatusDoc_(status) {
    const s = SGO_UTILS.safeUpper(status);
    let cls = "df-badge";
    if (["APROVADA", "CONCLUIDA_TECNICAMENTE", "FATURADA"].indexOf(s) >= 0) cls += " df-badge-ok";
    else if (["CANCELADA", "REJEITADA"].indexOf(s) >= 0) cls += " df-badge-danger";
    else cls += " df-badge-warn";
    return '<span class="' + cls + '">' + esc_(s || "--") + '</span>';
  }

  function esc_(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escAttr_(valor) {
    return esc_(valor).replace(/`/g, "&#96;");
  }

  function formatarDataDoc_(iso) {
    return SGO_UTILS.formatDateBR(iso) || SGO_UTILS.safe(iso);
  }

  function iniciarAtendimento(sessionId, id, lat, lng) {
    return registrarCheckin(sessionId, id, {
      LAT: lat || "",
      LNG: lng || "",
      ENDERECO: ""
    });
  }

  function sanitizarNomeArquivo_(nome) {
    return SGO_UTILS.safe(nome || "OS")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 120);
  }

  return {
    listar, pesquisar, obter, criar, atualizar, cancelar, atribuirTecnico,
    iniciarExecucao, iniciarAtendimento, registrarCheckin, registrarCheckout, salvarRegistroTecnico,
    validarConclusao, concluirTecnica, alterarStatus, aprovar, gerarDocumento,
    obterPacoteDocumento, listarOpcoes, buscarUnidadesProximas
  };
})();

function osListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_OS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_OS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osCancelar(sessionId, id, motivo) { try { return JSON.parse(JSON.stringify(SGO_OS.cancelar(sessionId, id, motivo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osAtribuirTecnico(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.atribuirTecnico(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osIniciarExecucao(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.iniciarExecucao(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osRegistrarCheckin(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.registrarCheckin(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osRegistrarCheckout(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.registrarCheckout(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osSalvarRegistroTecnico(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.salvarRegistroTecnico(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osValidarConclusao(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.validarConclusao(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message, pendencias: [e.message] }; } }
function osConcluirTecnica(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_OS.concluirTecnica(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osAlterarStatus(sessionId, id, status) { try { return JSON.parse(JSON.stringify(SGO_OS.alterarStatus(sessionId, id, status))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osAprovar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.aprovar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osGerarDocumento(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.gerarDocumento(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osObterPacoteDocumento(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS.obterPacoteDocumento(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osListarOpcoes(sessionId) { try { return JSON.parse(JSON.stringify(SGO_OS.listarOpcoes(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osBuscarUnidadesProximas(sessionId, lat, lng, raioKm) { try { return JSON.parse(JSON.stringify(SGO_OS.buscarUnidadesProximas(sessionId, lat, lng, raioKm))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osIniciarAtendimento(sessionId, id, lat, lng) { try { return JSON.parse(JSON.stringify(SGO_OS.iniciarAtendimento(sessionId, id, lat, lng))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }