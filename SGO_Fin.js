// SGO_Fin.js — METROLABS SGO+
// Modulo: FIN — Cartao Flash, Prestacao de Contas e Conciliacao Inteligente
// Versao: FIN.2
// REGRA: nao executa nada automaticamente.

const SGO_FIN = (() => {
  const DB = "FIN";

  const ABAS = {
    CARTOES     : "FIN_CARTOES",
    RECARGAS    : "FIN_CARTOES_RECARGAS",
    LANCAMENTOS : "FIN_CARTOES_LANCAMENTOS",
    LOGS        : "FIN_CARTOES_LOGS"
  };

  const STATUS_CARTAO = {
    PENDENTE_ATIVACAO    : "PENDENTE_ATIVACAO",
    ATIVO                : "ATIVO",
    BLOQUEADO_TEMPORARIO : "BLOQUEADO_TEMPORARIO",
    CANCELADO            : "CANCELADO",
    VENCIDO              : "VENCIDO"
  };

  const STATUS_RECARGA = {
    PROCESSADA : "PROCESSADA",
    CANCELADA  : "CANCELADA",
    PENDENTE   : "PENDENTE"
  };

  const STATUS_PRESTACAO = {
    PENDENTE_COMPROVANTE   : "PENDENTE_COMPROVANTE",
    PENDENTE_JUSTIFICATIVA : "PENDENTE_JUSTIFICATIVA",
    ENVIADO                : "ENVIADO",
    APROVADO               : "APROVADO",
    REPROVADO              : "REPROVADO"
  };

  const PERFIS_CONSULTA = ["ADMIN", "DIRETORIA", "GESTOR", "FINANCEIRO", "TECNICO"];
  const PERFIS_OPERADOR = ["ADMIN", "DIRETORIA", "GESTOR", "FINANCEIRO"];
  const PERFIS_GESTOR   = ["ADMIN", "DIRETORIA", "GESTOR"];

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  function finOk_(dados) {
    return Object.assign({ ok: true, success: true }, dados || {});
  }

  function finErro_(mensagem, detalhes) {
    const r = { ok: false, success: false, message: mensagem || "Erro desconhecido." };
    if (detalhes !== undefined) r.detalhes = detalhes;
    return r;
  }

  function finSafeUpper_(v) {
    return String(v == null ? "" : v).trim().toUpperCase();
  }

  function finSafeText_(v) {
    return String(v == null ? "" : v).trim();
  }

  function finSafeNumber_(v) {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return isNaN(v) ? 0 : v;
    const n = Number(String(v).trim().replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function finNow_() {
    return new Date().toISOString();
  }

  function finUuid_() {
    return Utilities.getUuid();
  }

  function finGerarId_(prefixo) {
    return finSafeUpper_(prefixo) + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 12).toUpperCase();
  }

  function finSessao_(sessionId) {
    return exigirSessao(sessionId);
  }

  function finUsuario_(sessao) {
    return {
      id    : finSafeText_(sessao && (sessao.userId || sessao.id || sessao.usuarioId)),
      nome  : finSafeText_(sessao && (sessao.nome || sessao.usuario || sessao.email)),
      perfil: finSafeUpper_(sessao && sessao.perfil)
    };
  }

  function finPerfil_(sessao) {
    return finSafeUpper_(sessao && sessao.perfil);
  }

  function finPerfilConsulta_(sessao) {
    return PERFIS_CONSULTA.indexOf(finPerfil_(sessao)) >= 0;
  }

  function finPerfilOperador_(sessao) {
    return PERFIS_OPERADOR.indexOf(finPerfil_(sessao)) >= 0;
  }

  function finPerfilGestor_(sessao) {
    return PERFIS_GESTOR.indexOf(finPerfil_(sessao)) >= 0;
  }

  function finGarantirPerfil_(sessao, perfis, acao) {
    const p = finPerfil_(sessao);
    if (perfis.indexOf(p) < 0) {
      throw new Error(
        "Acesso negado: perfil " + p + " nao tem permissao para " + (acao || "esta acao") + "."
      );
    }
  }

  function finDbOk_() {
    const dbId = PropertiesService.getScriptProperties().getProperty("DB_FIN_ID");
    if (!dbId) {
      throw new Error(
        "Banco FIN nao configurado. Configure DB_FIN_ID antes de usar o modulo financeiro."
      );
    }
    return dbId;
  }

  function finAll_(aba) {
    finDbOk_();
    return SGO_DATA.getAll(aba, DB) || [];
  }

  function finGetById_(aba, id) {
    finDbOk_();
    return SGO_DATA.getById(aba, finSafeText_(id), DB) || null;
  }

  function finInsert_(aba, obj) {
    finDbOk_();
    return SGO_DATA.insert(aba, obj || {}, DB);
  }

  function finUpdate_(aba, id, patch) {
    finDbOk_();
    const ok = SGO_DATA.update(aba, finSafeText_(id), patch || {}, DB);
    if (!ok) throw new Error("Registro nao encontrado para atualizacao: " + id);
    return SGO_DATA.getById(aba, finSafeText_(id), DB);
  }

  function finLog_(sessao, acao, entidadeTipo, entidadeId, antes, depois, resultado, mensagem) {
    try {
      const u = finUsuario_(sessao || {});
      finInsert_(ABAS.LOGS, {
        ID            : finUuid_(),
        LOG_ID        : finGerarId_("LOG"),
        DATA_HORA     : finNow_(),
        USUARIO_ID    : u.id,
        USUARIO_NOME  : u.nome,
        PERFIL        : u.perfil,
        ACAO          : finSafeText_(acao),
        MODULO        : "FIN",
        ENTIDADE_TIPO : finSafeText_(entidadeTipo),
        ENTIDADE_ID   : finSafeText_(entidadeId),
        DADOS_ANTES   : antes  ? JSON.stringify(antes)  : "",
        DADOS_DEPOIS  : depois ? JSON.stringify(depois) : "",
        IP_DISPOSITIVO: "",
        USER_AGENT    : "",
        RESULTADO     : finSafeText_(resultado) || "OK",
        MENSAGEM      : finSafeText_(mensagem),
        CRIADO_EM     : finNow_()
      });
    } catch (e) {
      Logger.log("FIN_LOG_ERRO: " + e.message);
    }
  }

  function finAplicarRestricaoUsuario_(sessao, lista) {
    if (finPerfil_(sessao) !== "TECNICO") return lista;
    const u = finUsuario_(sessao);
    return lista.filter(function(r) {
      return finSafeText_(r.FUNCIONARIO_ID) === u.id;
    });
  }

  function finValidarCartaoPayload_(payload) {
    var erros = [];
    if (!payload) { erros.push("Payload nao informado."); return erros; }
    if (payload.NUMERO_CARTAO) {
      erros.push("Numero completo do cartao nao e permitido. Use apenas NUMERO_FINAL_4.");
    }
    if (!finSafeText_(payload.FUNCIONARIO_ID))   erros.push("FUNCIONARIO_ID e obrigatorio.");
    if (!finSafeText_(payload.FUNCIONARIO_NOME))  erros.push("FUNCIONARIO_NOME e obrigatorio.");
    if (!finSafeText_(payload.NUMERO_FINAL_4)) {
      erros.push("NUMERO_FINAL_4 e obrigatorio.");
    } else if (finSafeText_(payload.NUMERO_FINAL_4).replace(/\D/g, "").length !== 4) {
      erros.push("NUMERO_FINAL_4 deve conter exatamente 4 digitos.");
    }
    return erros;
  }

  function finValidarRecargaPayload_(payload) {
    var erros = [];
    if (!payload) { erros.push("Payload nao informado."); return erros; }
    if (!finSafeText_(payload.CARTAO_ID))        erros.push("CARTAO_ID e obrigatorio.");
    if (finSafeNumber_(payload.VALOR) <= 0)       erros.push("VALOR deve ser maior que zero.");
    if (!finSafeText_(payload.DATA_RECARGA))      erros.push("DATA_RECARGA e obrigatoria.");
    return erros;
  }

  function finValidarLancamentoPayload_(payload) {
    var erros = [];
    if (!payload) { erros.push("Payload nao informado."); return erros; }
    if (!finSafeText_(payload.CARTAO_ID))         erros.push("CARTAO_ID e obrigatorio.");
    if (finSafeNumber_(payload.VALOR) <= 0)        erros.push("VALOR deve ser maior que zero.");
    if (!finSafeText_(payload.DATA_GASTO))         erros.push("DATA_GASTO e obrigatoria.");
    if (!finSafeText_(payload.FINALIDADE || payload.DESCRICAO_GASTO)) {
      erros.push("FINALIDADE ou DESCRICAO_GASTO e obrigatorio.");
    }
    if (finSafeUpper_(payload.TEM_OS) !== "SIM" && !finSafeText_(payload.JUSTIFICATIVA_SEM_OS)) {
      erros.push("JUSTIFICATIVA_SEM_OS e obrigatoria quando TEM_OS nao for SIM.");
    }
    return erros;
  }

  // ============================================================
  // FUNCOES PUBLICAS — CONTEXTO
  // ============================================================

  function obterContexto(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter contexto FIN");
      const dbId = PropertiesService.getScriptProperties().getProperty("DB_FIN_ID");
      return finOk_({
        modulo       : "FIN",
        versao       : "FIN.2",
        descricao    : "Cartao Flash, Prestacao de Contas e Conciliacao Inteligente",
        dbConfigurado: !!dbId,
        abas         : Object.keys(ABAS).map(function(k) { return ABAS[k]; }),
        perfil       : finPerfil_(sessao),
        usuario      : finUsuario_(sessao)
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FUNCOES PUBLICAS — CARTOES
  // ============================================================

  function listarCartoes(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "listar cartoes");
      finDbOk_();
      const f = filtros || {};
      var lista = finAll_(ABAS.CARTOES);

      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        lista = lista.filter(function(r) { return finSafeText_(r.FUNCIONARIO_ID) === u.id; });
      }

      if (finSafeText_(f.status)) {
        lista = lista.filter(function(r) {
          return finSafeUpper_(r.STATUS_CARTAO) === finSafeUpper_(f.status);
        });
      }

      if (finSafeText_(f.funcionarioId)) {
        lista = lista.filter(function(r) {
          return finSafeText_(r.FUNCIONARIO_ID) === finSafeText_(f.funcionarioId);
        });
      }

      return finOk_({ items: lista, total: lista.length });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function obterCartao(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartao nao informado.");
      const item = finGetById_(ABAS.CARTOES, id);
      if (!item) return finErro_("Cartao nao encontrado.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar dados do seu proprio cartao.");
        }
      }
      return finOk_({ item: item });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function criarCartao(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "criar cartao");
      finDbOk_();
      const erros = finValidarCartaoPayload_(payload);
      if (erros.length) return finErro_(erros.join(" "));
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const cartaoId = finGerarId_("CAR");
      const registro = {
        ID                   : finUuid_(),
        CARTAO_ID            : cartaoId,
        IDENTIFICADOR_CARTAO : finSafeText_(payload.IDENTIFICADOR_CARTAO),
        NUMERO_FINAL_4       : finSafeText_(payload.NUMERO_FINAL_4).replace(/\D/g, ""),
        APELIDO_CARTAO       : finSafeText_(payload.APELIDO_CARTAO),
        OPERADORA            : finSafeText_(payload.OPERADORA),
        BANDEIRA             : finSafeText_(payload.BANDEIRA),
        TIPO_CARTAO          : finSafeText_(payload.TIPO_CARTAO),
        LIMITE_OPERACIONAL   : finSafeNumber_(payload.LIMITE_OPERACIONAL),
        LIMITE_TOTAL         : finSafeNumber_(payload.LIMITE_TOTAL),
        DATA_EMISSAO         : finSafeText_(payload.DATA_EMISSAO),
        DATA_VALIDADE_CARTAO : finSafeText_(payload.DATA_VALIDADE_CARTAO),
        FUNCIONARIO_ID       : finSafeText_(payload.FUNCIONARIO_ID),
        FUNCIONARIO_NOME     : finSafeText_(payload.FUNCIONARIO_NOME),
        FUNCIONARIO_EMAIL    : finSafeText_(payload.FUNCIONARIO_EMAIL),
        FUNCIONARIO_TELEFONE : finSafeText_(payload.FUNCIONARIO_TELEFONE),
        GESTOR_RESPONSAVEL_ID: finSafeText_(payload.GESTOR_RESPONSAVEL_ID),
        CENTRO_CUSTO         : finSafeText_(payload.CENTRO_CUSTO),
        FINALIDADE           : finSafeText_(payload.FINALIDADE),
        STATUS_CARTAO        : STATUS_CARTAO.PENDENTE_ATIVACAO,
        DATA_BLOQUEIO        : "",
        MOTIVO_BLOQUEIO      : "",
        BLOQUEADO_POR        : "",
        TERMO_ASSINADO       : "NAO",
        TERMO_ID             : "",
        OBSERVACOES          : finSafeText_(payload.OBSERVACOES),
        STATUS               : "ATIVO",
        CRIADO_EM            : agora,
        CRIADO_POR           : u.nome,
        ATUALIZADO_EM        : agora,
        ATUALIZADO_POR       : u.nome
      };
      finInsert_(ABAS.CARTOES, registro);
      finLog_(sessao, "CARTAO_CRIADO", "CARTAO", cartaoId, null, registro, "OK", "Cartao criado.");
      return finOk_({ message: "Cartao criado com sucesso.", id: registro.ID, cartaoId: cartaoId, item: registro });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function atualizarCartao(sessionId, id, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "atualizar cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartao nao informado.");
      if (!payload)           return finErro_("Payload nao informado.");
      if (payload.NUMERO_CARTAO) {
        return finErro_("Numero completo do cartao nao e permitido.");
      }
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartao nao encontrado.");
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const camposProibidos = ["ID", "CARTAO_ID", "NUMERO_CARTAO", "CRIADO_EM", "CRIADO_POR"];
      const patch = {};
      Object.keys(payload).forEach(function(k) {
        if (camposProibidos.indexOf(k) < 0) patch[k] = payload[k];
      });
      patch.ATUALIZADO_EM  = agora;
      patch.ATUALIZADO_POR = u.nome;
      const depois = finUpdate_(ABAS.CARTOES, antes.ID, patch);
      finLog_(sessao, "CARTAO_ATUALIZADO", "CARTAO", finSafeText_(antes.CARTAO_ID), antes, depois, "OK", "Cartao atualizado.");
      return finOk_({ message: "Cartao atualizado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function bloquearCartao(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "bloquear cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartao nao informado.");
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartao nao encontrado.");
      if (finSafeUpper_(antes.STATUS_CARTAO) === STATUS_CARTAO.BLOQUEADO_TEMPORARIO) {
        return finErro_("Cartao ja esta bloqueado.");
      }
      if (!finSafeText_(motivo)) return finErro_("Motivo do bloqueio e obrigatorio.");
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        STATUS_CARTAO  : STATUS_CARTAO.BLOQUEADO_TEMPORARIO,
        DATA_BLOQUEIO  : agora,
        MOTIVO_BLOQUEIO: finSafeText_(motivo) || "Sem motivo informado.",
        BLOQUEADO_POR  : u.nome,
        ATUALIZADO_EM  : agora,
        ATUALIZADO_POR : u.nome
      };
      const depois = finUpdate_(ABAS.CARTOES, antes.ID, patch);
      finLog_(sessao, "CARTAO_BLOQUEADO", "CARTAO", finSafeText_(antes.CARTAO_ID), antes, depois, "OK",
        "Cartao bloqueado: " + finSafeText_(motivo));
      return finOk_({ message: "Cartao bloqueado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function desbloquearCartao(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "desbloquear cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartao nao informado.");
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartao nao encontrado.");
      if (finSafeUpper_(antes.STATUS_CARTAO) !== STATUS_CARTAO.BLOQUEADO_TEMPORARIO) {
        return finErro_("Cartao nao esta bloqueado.");
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        STATUS_CARTAO  : STATUS_CARTAO.ATIVO,
        DATA_BLOQUEIO  : "",
        MOTIVO_BLOQUEIO: "",
        BLOQUEADO_POR  : "",
        ATUALIZADO_EM  : agora,
        ATUALIZADO_POR : u.nome
      };
      const depois = finUpdate_(ABAS.CARTOES, antes.ID, patch);
      finLog_(sessao, "CARTAO_DESBLOQUEADO", "CARTAO", finSafeText_(antes.CARTAO_ID), antes, depois, "OK", "Cartao desbloqueado.");
      return finOk_({ message: "Cartao desbloqueado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FUNCOES PUBLICAS — RECARGAS
  // ============================================================

  function listarRecargas(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "listar recargas");
      finDbOk_();
      const f = filtros || {};
      var lista = finAll_(ABAS.RECARGAS);
      lista = finAplicarRestricaoUsuario_(sessao, lista);
      if (finSafeText_(f.cartaoId)) {
        lista = lista.filter(function(r) {
          return finSafeText_(r.CARTAO_ID) === finSafeText_(f.cartaoId);
        });
      }
      if (finSafeText_(f.periodo)) {
        lista = lista.filter(function(r) {
          return finSafeText_(r.PERIODO_REFERENCIA) === finSafeText_(f.periodo);
        });
      }
      if (finSafeText_(f.status)) {
        lista = lista.filter(function(r) {
          return finSafeUpper_(r.STATUS) === finSafeUpper_(f.status);
        });
      }
      return finOk_({ items: lista, total: lista.length });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function obterRecarga(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter recarga");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID da recarga nao informado.");
      const item = finGetById_(ABAS.RECARGAS, id);
      if (!item) return finErro_("Recarga nao encontrada.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar recargas do seu proprio cartao.");
        }
      }
      return finOk_({ item: item });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function criarRecarga(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "criar recarga");
      finDbOk_();
      const erros = finValidarRecargaPayload_(payload);
      if (erros.length) return finErro_(erros.join(" "));
      const cartao = finGetById_(ABAS.CARTOES, payload.CARTAO_ID);
      if (!cartao) return finErro_("Cartao nao encontrado: " + payload.CARTAO_ID);
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const recargaId = finGerarId_("REC");
      const registro = {
        ID                       : finUuid_(),
        RECARGA_ID               : recargaId,
        CARTAO_ID                : finSafeText_(payload.CARTAO_ID),
        FUNCIONARIO_ID           : finSafeText_(cartao.FUNCIONARIO_ID),
        FUNCIONARIO_NOME         : finSafeText_(cartao.FUNCIONARIO_NOME),
        VALOR                    : finSafeNumber_(payload.VALOR),
        DATA_RECARGA             : finSafeText_(payload.DATA_RECARGA),
        PERIODO_REFERENCIA       : finSafeText_(payload.PERIODO_REFERENCIA),
        FORMA_RECARGA            : finSafeText_(payload.FORMA_RECARGA),
        NUMERO_TRANSFERENCIA     : finSafeText_(payload.NUMERO_TRANSFERENCIA),
        BANCO_ORIGEM             : finSafeText_(payload.BANCO_ORIGEM),
        COMPROVANTE_FILE_ID      : finSafeText_(payload.COMPROVANTE_FILE_ID),
        COMPROVANTE_LINK         : finSafeText_(payload.COMPROVANTE_LINK),
        RESPONSAVEL_FINANCEIRO_ID: u.id,
        RESPONSAVEL_NOME         : u.nome,
        AUTORIZADO_POR_ID        : finSafeText_(payload.AUTORIZADO_POR_ID),
        AUTORIZADO_POR_NOME      : finSafeText_(payload.AUTORIZADO_POR_NOME),
        OBSERVACOES              : finSafeText_(payload.OBSERVACOES),
        STATUS                   : STATUS_RECARGA.PROCESSADA,
        CRIADO_EM                : agora,
        CRIADO_POR               : u.nome,
        ATUALIZADO_EM            : agora,
        ATUALIZADO_POR           : u.nome
      };
      finInsert_(ABAS.RECARGAS, registro);
      finLog_(sessao, "RECARGA_CRIADA", "RECARGA", recargaId, null, registro, "OK",
        "Recarga de R$ " + registro.VALOR + " criada.");
      return finOk_({ message: "Recarga registrada com sucesso.", id: registro.ID, recargaId: recargaId, item: registro });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function cancelarRecarga(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "cancelar recarga");
      finDbOk_();
      if (!finSafeText_(id))     return finErro_("ID da recarga nao informado.");
      if (!finSafeText_(motivo)) return finErro_("Motivo do cancelamento e obrigatorio.");
      const antes = finGetById_(ABAS.RECARGAS, id);
      if (!antes) return finErro_("Recarga nao encontrada.");
      if (finSafeUpper_(antes.STATUS) === STATUS_RECARGA.CANCELADA) {
        return finErro_("Recarga ja esta cancelada.");
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const obsAtual = finSafeText_(antes.OBSERVACOES);
      const novaObs = obsAtual
        ? obsAtual + " | CANCELADO em " + agora + " por " + u.nome + ": " + finSafeText_(motivo)
        : "CANCELADO em " + agora + " por " + u.nome + ": " + finSafeText_(motivo);
      const patch = {
        STATUS        : STATUS_RECARGA.CANCELADA,
        OBSERVACOES   : novaObs,
        ATUALIZADO_EM : agora,
        ATUALIZADO_POR: u.nome
      };
      const depois = finUpdate_(ABAS.RECARGAS, antes.ID, patch);
      finLog_(sessao, "RECARGA_CANCELADA", "RECARGA", finSafeText_(antes.RECARGA_ID), antes, depois, "OK",
        "Recarga cancelada: " + finSafeText_(motivo));
      return finOk_({ message: "Recarga cancelada com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FUNCOES PUBLICAS — LANCAMENTOS
  // ============================================================

  function listarLancamentos(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "listar lancamentos");
      finDbOk_();
      const f = filtros || {};
      var lista = finAll_(ABAS.LANCAMENTOS);
      lista = finAplicarRestricaoUsuario_(sessao, lista);
      if (finSafeText_(f.cartaoId)) {
        lista = lista.filter(function(r) {
          return finSafeText_(r.CARTAO_ID) === finSafeText_(f.cartaoId);
        });
      }
      if (finSafeText_(f.funcionarioId)) {
        lista = lista.filter(function(r) {
          return finSafeText_(r.FUNCIONARIO_ID) === finSafeText_(f.funcionarioId);
        });
      }
      if (finSafeText_(f.status)) {
        lista = lista.filter(function(r) {
          return finSafeUpper_(r.STATUS_PRESTACAO) === finSafeUpper_(f.status);
        });
      }
      return finOk_({ items: lista, total: lista.length });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function obterLancamento(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter lancamento");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do lancamento nao informado.");
      const item = finGetById_(ABAS.LANCAMENTOS, id);
      if (!item) return finErro_("Lancamento nao encontrado.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar seus proprios lancamentos.");
        }
      }
      return finOk_({ item: item });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function criarLancamento(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "criar lancamento");
      finDbOk_();
      const erros = finValidarLancamentoPayload_(payload);
      if (erros.length) return finErro_(erros.join(" "));
      const u = finUsuario_(sessao);
      if (finPerfil_(sessao) === "TECNICO") {
        const funcId = finSafeText_(payload.FUNCIONARIO_ID);
        if (funcId && funcId !== u.id) {
          return finErro_("Acesso negado: voce so pode criar lancamentos para si mesmo.");
        }
      }
      const agora = finNow_();
      const lancamentoId = finGerarId_("LAN");
      const temComprovante = !!(
        finSafeText_(payload.COMPROVANTE_FILE_ID) || finSafeText_(payload.COMPROVANTE_LINK)
      );
      const comprovanteOk    = temComprovante ? "SIM" : "NAO";
      const statusPrestacao  = temComprovante
        ? STATUS_PRESTACAO.ENVIADO
        : STATUS_PRESTACAO.PENDENTE_COMPROVANTE;
      const registro = {
        ID                   : finUuid_(),
        LANCAMENTO_ID        : lancamentoId,
        CARTAO_ID            : finSafeText_(payload.CARTAO_ID),
        FUNCIONARIO_ID       : finSafeText_(payload.FUNCIONARIO_ID) || u.id,
        FUNCIONARIO_NOME     : finSafeText_(payload.FUNCIONARIO_NOME) || u.nome,
        DATA_GASTO           : finSafeText_(payload.DATA_GASTO),
        HORA_GASTO           : finSafeText_(payload.HORA_GASTO),
        VALOR                : finSafeNumber_(payload.VALOR),
        ESTABELECIMENTO      : finSafeText_(payload.ESTABELECIMENTO),
        CATEGORIA_GASTO      : finSafeText_(payload.CATEGORIA_GASTO),
        OS_ID                : finSafeText_(payload.OS_ID),
        OS_NUMERO            : finSafeText_(payload.OS_NUMERO),
        TEM_OS               : finSafeUpper_(payload.TEM_OS) === "SIM" ? "SIM" : "NAO",
        JUSTIFICATIVA_SEM_OS : finSafeText_(payload.JUSTIFICATIVA_SEM_OS),
        LATITUDE             : finSafeText_(payload.LATITUDE),
        LONGITUDE            : finSafeText_(payload.LONGITUDE),
        LOCALIZACAO_TEXTO    : finSafeText_(payload.LOCALIZACAO_TEXTO),
        ENDERECO_APROXIMADO  : finSafeText_(payload.ENDERECO_APROXIMADO),
        COMPROVANTE_OK       : comprovanteOk,
        COMPROVANTE_FILE_ID  : finSafeText_(payload.COMPROVANTE_FILE_ID),
        COMPROVANTE_LINK     : finSafeText_(payload.COMPROVANTE_LINK),
        TIPO_COMPROVANTE     : finSafeText_(payload.TIPO_COMPROVANTE),
        DESCRICAO_GASTO      : finSafeText_(payload.DESCRICAO_GASTO || payload.FINALIDADE),
        OBSERVACOES          : finSafeText_(payload.OBSERVACOES),
        STATUS_PRESTACAO     : statusPrestacao,
        DATA_APROVACAO       : "",
        APROVADO_POR         : "",
        MOTIVO_REJEICAO      : "",
        CONCILIADO           : "NAO",
        LANCAMENTO_EXTRATO_ID: "",
        DIVERGENCIA_TIPO     : "",
        DIVERGENCIA_VALOR    : "",
        STATUS               : "ATIVO",
        CRIADO_EM            : agora,
        CRIADO_POR           : u.nome,
        ATUALIZADO_EM        : agora,
        ATUALIZADO_POR       : u.nome
      };
      finInsert_(ABAS.LANCAMENTOS, registro);
      finLog_(sessao, "LANCAMENTO_CRIADO", "LANCAMENTO", lancamentoId, null, registro, "OK",
        "Lancamento de R$ " + registro.VALOR + " criado.");
      return finOk_({ message: "Lancamento registrado com sucesso.", id: registro.ID, lancamentoId: lancamentoId, item: registro });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function atualizarLancamento(sessionId, id, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "atualizar lancamento");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do lancamento nao informado.");
      if (!payload)           return finErro_("Payload nao informado.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lancamento nao encontrado.");
      const statusAtual = finSafeUpper_(antes.STATUS_PRESTACAO);
      const statusEditaveis = [
        STATUS_PRESTACAO.PENDENTE_COMPROVANTE,
        STATUS_PRESTACAO.PENDENTE_JUSTIFICATIVA,
        STATUS_PRESTACAO.ENVIADO
      ];
      const statusBloqueados = [STATUS_PRESTACAO.APROVADO, STATUS_PRESTACAO.REPROVADO];
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(antes.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode editar seus proprios lancamentos.");
        }
        if (statusEditaveis.indexOf(statusAtual) < 0) {
          return finErro_("Lancamento nao pode ser editado no status atual: " + statusAtual);
        }
      } else {
        finGarantirPerfil_(sessao, PERFIS_OPERADOR, "atualizar lancamento de terceiro");
        if (statusBloqueados.indexOf(statusAtual) >= 0) {
          return finErro_("Lancamento ja finalizado nao pode ser editado. Status: " + statusAtual);
        }
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const camposProibidos = ["ID", "LANCAMENTO_ID", "CRIADO_EM", "CRIADO_POR"];
      const patch = {};
      Object.keys(payload).forEach(function(k) {
        if (camposProibidos.indexOf(k) < 0) patch[k] = payload[k];
      });
      if (finSafeText_(payload.COMPROVANTE_FILE_ID) || finSafeText_(payload.COMPROVANTE_LINK)) {
        patch.COMPROVANTE_OK = "SIM";
        if (statusAtual === STATUS_PRESTACAO.PENDENTE_COMPROVANTE) {
          patch.STATUS_PRESTACAO = STATUS_PRESTACAO.ENVIADO;
        }
      }
      patch.ATUALIZADO_EM  = agora;
      patch.ATUALIZADO_POR = u.nome;
      const depois = finUpdate_(ABAS.LANCAMENTOS, antes.ID, patch);
      finLog_(sessao, "LANCAMENTO_ATUALIZADO", "LANCAMENTO", finSafeText_(antes.LANCAMENTO_ID), antes, depois, "OK",
        "Lancamento atualizado.");
      return finOk_({ message: "Lancamento atualizado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function aprovarLancamento(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "aprovar lancamento");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do lancamento nao informado.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lancamento nao encontrado.");
      const statusAtual = finSafeUpper_(antes.STATUS_PRESTACAO);
      if (statusAtual === STATUS_PRESTACAO.APROVADO) {
        return finErro_("Lancamento ja aprovado.");
      }
      if (statusAtual === STATUS_PRESTACAO.REPROVADO) {
        return finErro_("Lancamento reprovado nao pode ser aprovado diretamente. Edite e reenvie.");
      }
      if (statusAtual === STATUS_PRESTACAO.PENDENTE_COMPROVANTE) {
        return finErro_("Lancamento pendente de comprovante nao pode ser aprovado.");
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        STATUS_PRESTACAO: STATUS_PRESTACAO.APROVADO,
        DATA_APROVACAO  : agora,
        APROVADO_POR    : u.nome,
        MOTIVO_REJEICAO : "",
        ATUALIZADO_EM   : agora,
        ATUALIZADO_POR  : u.nome
      };
      const depois = finUpdate_(ABAS.LANCAMENTOS, antes.ID, patch);
      finLog_(sessao, "LANCAMENTO_APROVADO", "LANCAMENTO", finSafeText_(antes.LANCAMENTO_ID), antes, depois, "OK",
        "Lancamento aprovado por " + u.nome + ".");
      return finOk_({ message: "Lancamento aprovado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function rejeitarLancamento(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "rejeitar lancamento");
      finDbOk_();
      if (!finSafeText_(id))     return finErro_("ID do lancamento nao informado.");
      if (!finSafeText_(motivo)) return finErro_("Motivo da rejeicao e obrigatorio.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lancamento nao encontrado.");
      const statusAtual = finSafeUpper_(antes.STATUS_PRESTACAO);
      if (statusAtual === STATUS_PRESTACAO.REPROVADO) {
        return finErro_("Lancamento ja reprovado.");
      }
      if (statusAtual === STATUS_PRESTACAO.APROVADO) {
        return finErro_("Lancamento ja aprovado nao pode ser reprovado diretamente.");
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        STATUS_PRESTACAO: STATUS_PRESTACAO.REPROVADO,
        MOTIVO_REJEICAO : finSafeText_(motivo),
        DATA_APROVACAO  : "",
        APROVADO_POR    : "",
        ATUALIZADO_EM   : agora,
        ATUALIZADO_POR  : u.nome
      };
      const depois = finUpdate_(ABAS.LANCAMENTOS, antes.ID, patch);
      finLog_(sessao, "LANCAMENTO_REPROVADO", "LANCAMENTO", finSafeText_(antes.LANCAMENTO_ID), antes, depois, "OK",
        "Lancamento reprovado: " + finSafeText_(motivo));
      return finOk_({ message: "Lancamento reprovado.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FUNCOES PUBLICAS — DASHBOARD
  // ============================================================

  function obterDashboardBasico(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter dashboard financeiro");
      finDbOk_();
      const f = filtros || {};
      var cartoes     = finAll_(ABAS.CARTOES);
      var recargas    = finAll_(ABAS.RECARGAS);
      var lancamentos = finAll_(ABAS.LANCAMENTOS);

      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        cartoes     = cartoes.filter(function(r) { return finSafeText_(r.FUNCIONARIO_ID) === u.id; });
        recargas    = recargas.filter(function(r) { return finSafeText_(r.FUNCIONARIO_ID) === u.id; });
        lancamentos = lancamentos.filter(function(r) { return finSafeText_(r.FUNCIONARIO_ID) === u.id; });
      }

      if (finSafeText_(f.cartaoId)) {
        const cid = finSafeText_(f.cartaoId);
        recargas    = recargas.filter(function(r) { return finSafeText_(r.CARTAO_ID) === cid; });
        lancamentos = lancamentos.filter(function(r) { return finSafeText_(r.CARTAO_ID) === cid; });
      }

      const recargasAtivas = recargas.filter(function(r) {
        return finSafeUpper_(r.STATUS) !== STATUS_RECARGA.CANCELADA;
      });

      const valorRecargas = recargasAtivas.reduce(function(acc, r) {
        return acc + finSafeNumber_(r.VALOR);
      }, 0);

      const valorLancamentos = lancamentos.reduce(function(acc, l) {
        return acc + finSafeNumber_(l.VALOR);
      }, 0);

      function contarStatus(lista, campo, valor) {
        return lista.filter(function(r) { return finSafeUpper_(r[campo]) === valor; }).length;
      }

      return finOk_({
        totalCartoes              : cartoes.length,
        cartoesAtivos             : contarStatus(cartoes, "STATUS_CARTAO", STATUS_CARTAO.ATIVO),
        cartoesBloqueados         : contarStatus(cartoes, "STATUS_CARTAO", STATUS_CARTAO.BLOQUEADO_TEMPORARIO),
        cartoesAguardandoAtivacao : contarStatus(cartoes, "STATUS_CARTAO", STATUS_CARTAO.PENDENTE_ATIVACAO),
        totalRecargas             : recargasAtivas.length,
        valorRecargas             : valorRecargas,
        totalLancamentos          : lancamentos.length,
        valorLancamentos          : valorLancamentos,
        pendentesComprovante      : contarStatus(lancamentos, "STATUS_PRESTACAO", STATUS_PRESTACAO.PENDENTE_COMPROVANTE),
        pendentesJustificativa    : contarStatus(lancamentos, "STATUS_PRESTACAO", STATUS_PRESTACAO.PENDENTE_JUSTIFICATIVA),
        enviados                  : contarStatus(lancamentos, "STATUS_PRESTACAO", STATUS_PRESTACAO.ENVIADO),
        aprovados                 : contarStatus(lancamentos, "STATUS_PRESTACAO", STATUS_PRESTACAO.APROVADO),
        reprovados                : contarStatus(lancamentos, "STATUS_PRESTACAO", STATUS_PRESTACAO.REPROVADO),
        geradoEm                  : finNow_()
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // INTERFACE PUBLICA
  // ============================================================

  return {
    obterContexto,
    listarCartoes,
    obterCartao,
    criarCartao,
    atualizarCartao,
    bloquearCartao,
    desbloquearCartao,
    listarRecargas,
    obterRecarga,
    criarRecarga,
    cancelarRecarga,
    listarLancamentos,
    obterLancamento,
    criarLancamento,
    atualizarLancamento,
    aprovarLancamento,
    rejeitarLancamento,
    obterDashboardBasico
  };
})();

// ============================================================
// WRAPPERS GLOBAIS
// Definicoes apenas — nao executam automaticamente.
// ============================================================

function finObterContexto(sId)                   { return SGO_FIN.obterContexto(sId); }
function finListarCartoes(sId, filtros)           { return SGO_FIN.listarCartoes(sId, filtros); }
function finObterCartao(sId, id)                  { return SGO_FIN.obterCartao(sId, id); }
function finCriarCartao(sId, payload)             { return SGO_FIN.criarCartao(sId, payload); }
function finAtualizarCartao(sId, id, payload)     { return SGO_FIN.atualizarCartao(sId, id, payload); }
function finBloquearCartao(sId, id, motivo)       { return SGO_FIN.bloquearCartao(sId, id, motivo); }
function finDesbloquearCartao(sId, id)            { return SGO_FIN.desbloquearCartao(sId, id); }
function finListarRecargas(sId, filtros)          { return SGO_FIN.listarRecargas(sId, filtros); }
function finObterRecarga(sId, id)                 { return SGO_FIN.obterRecarga(sId, id); }
function finCriarRecarga(sId, payload)            { return SGO_FIN.criarRecarga(sId, payload); }
function finCancelarRecarga(sId, id, motivo)      { return SGO_FIN.cancelarRecarga(sId, id, motivo); }
function finListarLancamentos(sId, filtros)       { return SGO_FIN.listarLancamentos(sId, filtros); }
function finObterLancamento(sId, id)              { return SGO_FIN.obterLancamento(sId, id); }
function finCriarLancamento(sId, payload)         { return SGO_FIN.criarLancamento(sId, payload); }
function finAtualizarLancamento(sId, id, payload) { return SGO_FIN.atualizarLancamento(sId, id, payload); }
function finAprovarLancamento(sId, id)            { return SGO_FIN.aprovarLancamento(sId, id); }
function finRejeitarLancamento(sId, id, motivo)   { return SGO_FIN.rejeitarLancamento(sId, id, motivo); }
function finObterDashboardBasico(sId, filtros)    { return SGO_FIN.obterDashboardBasico(sId, filtros); }
