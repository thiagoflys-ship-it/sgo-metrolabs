// SGO_Fin.js — METROLABS SGO+
// Modulo: FIN — Cartão Flash, Prestacao de Contas e Conciliacao Inteligente
// Versao: FIN.2
// REGRA: não executa nada automaticamente.

const SGO_FIN = (() => {
  const DB = "FIN";

  const ABAS = {
    CARTOES     : "FIN_CARTOES",
    RECARGAS    : "FIN_CARTOES_RECARGAS",
    LANCAMENTOS : "FIN_CARTOES_LANCAMENTOS",
    ANEXOS      : "FIN_CARTOES_ANEXOS",
    EXTRATOS    : "FIN_CARTOES_EXTRATOS",
    LOTES_EXTRATO_FLASH: "FIN_LOTES_EXTRATO_FLASH",
    CONCILIACAO : "FIN_CARTOES_CONCILIACAO",
    PENDENCIAS  : "FIN_CARTOES_PENDENCIAS",
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
        "Acesso negado: perfil " + p + " não tem permissão para " + (acao || "esta acao") + "."
      );
    }
  }

  function finDbOk_() {
    const dbId = PropertiesService.getScriptProperties().getProperty("DB_FIN_ID");
    if (!dbId) {
      throw new Error(
        "Banco FIN não configurado. Configure DB_FIN_ID antes de usar o modulo financeiro."
      );
    }
    return dbId;
  }

  function finSheet_(aba) {
    const nomeAba = finSafeText_(aba);
    if (!nomeAba) throw new Error("Aba FIN não informada.");
    const ss = SpreadsheetApp.openById(finDbOk_());
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) throw new Error("Aba FIN não encontrada: " + nomeAba + ".");
    return sheet;
  }

  function finHeaders_(aba) {
    const sheet = finSheet_(aba);
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) throw new Error("Aba FIN sem cabeçalho: " + aba + ".");
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return finSafeText_(h);
    });
  }

  function finValorSaida_(valor) {
    if (valor instanceof Date) {
      if (typeof SGO_DATA !== "undefined" && SGO_DATA.formatDateForOutput_) {
        return SGO_DATA.formatDateForOutput_(valor);
      }
      return valor.toISOString();
    }
    return valor;
  }

  function finNormalizarParaHeaders_(aba, obj, preencherTodos) {
    const headers = finHeaders_(aba);
    const origem = obj || {};
    const saida = {};
    if (preencherTodos) headers.forEach(function(h) { saida[h] = ""; });
    Object.keys(origem).forEach(function(k) {
      const chave = (typeof SGO_DATA !== "undefined" && SGO_DATA.normalizarChave_)
        ? SGO_DATA.normalizarChave_(k)
        : finSafeUpper_(k);
      const alvo = headers.find(function(h) {
        const hNorm = (typeof SGO_DATA !== "undefined" && SGO_DATA.normalizarChave_)
          ? SGO_DATA.normalizarChave_(h)
          : finSafeUpper_(h);
        return hNorm === chave;
      });
      if (alvo) saida[alvo] = origem[k];
    });
    return saida;
  }

  function finAll_(aba) {
    const sheet = finSheet_(aba);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    const dados = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = dados[0].map(function(h) { return finSafeText_(h); });
    const lista = [];
    for (let i = 1; i < dados.length; i++) {
      const row = {};
      let vazia = true;
      for (let j = 0; j < headers.length; j++) {
        const valor = finValorSaida_(dados[i][j]);
        row[headers[j]] = valor;
        if (valor !== "" && valor !== null && valor !== undefined) vazia = false;
      }
      if (!vazia) lista.push(row);
    }
    return lista;
  }

  function finGetById_(aba, id) {
    const alvo = finSafeText_(id);
    return finAll_(aba).find(function(r) {
      return finSafeText_(r.ID) === alvo;
    }) || null;
  }

  function finInsert_(aba, obj) {
    const sheet = finSheet_(aba);
    const registro = Object.assign({}, obj || {});
    if (!registro.ID) registro.ID = finUuid_();
    if (!registro.CRIADO_EM) registro.CRIADO_EM = finNow_();
    const normalizado = finNormalizarParaHeaders_(aba, registro, true);
    const headers = finHeaders_(aba);
    const row = headers.map(function(h) { return normalizado[h]; });
    sheet.appendRow(row);
    return normalizado;
  }

  function finUpdate_(aba, id, patch) {
    const sheet = finSheet_(aba);
    const headers = finHeaders_(aba);
    const alvo = finSafeText_(id);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Registro não encontrado para atualização: " + id);
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (finSafeText_(ids[i][0]) === alvo) {
        rowIndex = i + 2;
        break;
      }
    }
    if (rowIndex < 2) throw new Error("Registro não encontrado para atualização: " + id);
    const atual = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const normalizado = finNormalizarParaHeaders_(aba, patch || {}, false);
    const row = headers.map(function(h, idx) {
      return Object.prototype.hasOwnProperty.call(normalizado, h)
        ? normalizado[h]
        : atual[idx];
    });
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
    const ok = true;
    if (!ok) throw new Error("Registro não encontrado para atualização: " + id);
    return finGetById_(aba, id);
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
    if (!payload) { erros.push("Payload não informado."); return erros; }
    if (payload.NUMERO_CARTAO) {
      erros.push("Número completo do cartão não é permitido. Use apenas os 4 últimos dígitos.");
    }
    if (!finSafeText_(payload.FUNCIONARIO_ID))   erros.push("FUNCIONARIO_ID é obrigatório.");
    if (!finSafeText_(payload.FUNCIONARIO_NOME))  erros.push("FUNCIONARIO_NOME é obrigatório.");
    if (!finSafeText_(payload.NUMERO_FINAL_4)) {
      erros.push("NUMERO_FINAL_4 é obrigatório.");
    } else if (finSafeText_(payload.NUMERO_FINAL_4).replace(/\D/g, "").length !== 4) {
      erros.push("NUMERO_FINAL_4 deve conter exatamente 4 dígitos.");
    }
    return erros;
  }

  function finValidarRecargaPayload_(payload) {
    var erros = [];
    if (!payload) { erros.push("Payload não informado."); return erros; }
    if (!finSafeText_(payload.CARTAO_ID))        erros.push("CARTAO_ID é obrigatório.");
    if (finSafeNumber_(payload.VALOR) <= 0)       erros.push("VALOR deve ser maior que zero.");
    if (!finSafeText_(payload.DATA_RECARGA))      erros.push("DATA_RECARGA é obrigatória.");
    return erros;
  }

  function finValidarLancamentoPayload_(payload) {
    var erros = [];
    if (!payload) { erros.push("Payload não informado."); return erros; }
    if (!finSafeText_(payload.CARTAO_ID))         erros.push("CARTAO_ID é obrigatório.");
    if (finSafeNumber_(payload.VALOR) <= 0)        erros.push("VALOR deve ser maior que zero.");
    if (!finSafeText_(payload.DATA_GASTO))         erros.push("DATA_GASTO é obrigatória.");
    if (!finSafeText_(payload.FINALIDADE || payload.DESCRICAO_GASTO)) {
      erros.push("FINALIDADE ou DESCRICAO_GASTO é obrigatório.");
    }
    if (finSafeUpper_(payload.TEM_OS) !== "SIM" && !finSafeText_(payload.JUSTIFICATIVA_SEM_OS)) {
      erros.push("JUSTIFICATIVA_SEM_OS é obrigatória quando TEM_OS não for SIM.");
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
        descricao    : "Cartão Flash, Prestacao de Contas e Conciliacao Inteligente",
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
      if (!finSafeText_(id)) return finErro_("ID do cartão não informado.");
      const item = finGetById_(ABAS.CARTOES, id);
      if (!item) return finErro_("Cartão não encontrado.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar dados do seu proprio cartão.");
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
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "criar cartão");
      finDbOk_();
      const erros = finValidarCartaoPayload_(payload);
      if (erros.length) return finErro_(erros.join(" "));

      // Validar duplicidade: mesma final4 + mesmo responsavel + nao inativo/cancelado
      const final4norm   = finSafeText_(payload.NUMERO_FINAL_4 || "").replace(/\D/g, "");
      const funcIdNorm   = finSafeUpper_(payload.FUNCIONARIO_ID || "");
      const funcEmailNorm = finSafeText_(payload.FUNCIONARIO_EMAIL || "").toLowerCase();
      const todosCartoes = finAll_(ABAS.CARTOES);
      const duplicado = todosCartoes.find(function(c) {
        const sc = finSafeUpper_(c.STATUS_CARTAO || "");
        if (sc === "INATIVO" || sc === "CANCELADO" || sc === "DEVOLVIDO") return false;
        const cf = finSafeText_(c.NUMERO_FINAL_4 || "").replace(/\D/g, "");
        if (cf !== final4norm) return false;
        const cId    = finSafeUpper_(c.FUNCIONARIO_ID || "");
        const cEmail = finSafeText_(c.FUNCIONARIO_EMAIL || "").toLowerCase();
        if (funcIdNorm    && cId)    return funcIdNorm    === cId;
        if (funcEmailNorm && cEmail) return funcEmailNorm === cEmail;
        return false;
      });
      if (duplicado) {
        return finErro_("Ja existe cartao ativo com este final para este responsavel.");
      }

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
      finLog_(sessao, "CARTAO_CRIADO", "CARTAO", cartaoId, null, registro, "OK", "Cartão criado.");
      return finOk_({ message: "Cartão criado com sucesso.", id: registro.ID, cartaoId: cartaoId, item: registro });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function atualizarCartao(sessionId, id, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "atualizar cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartão não informado.");
      if (!payload)           return finErro_("Payload não informado.");
      if (payload.NUMERO_CARTAO) {
        return finErro_("Numero completo do cartão não e permitido.");
      }
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartão não encontrado.");
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
      finLog_(sessao, "CARTAO_ATUALIZADO", "CARTAO", finSafeText_(antes.CARTAO_ID), antes, depois, "OK", "Cartão atualizado.");
      return finOk_({ message: "Cartão atualizado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function atualizarPerfilMaster(sessionId, ids, patch) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "atualizar perfil master");
      finDbOk_();
      if (!ids || !Array.isArray(ids) || ids.length === 0) { return finErro_('Nenhum ID fornecido.'); }
      if (!patch || typeof patch !== 'object') { return finErro_('Patch inválido.'); }

      var dbId = String(PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '').trim();
      if (!dbId) { throw new Error('DB_FIN_ID não configurado.'); }
      var ss = SpreadsheetApp.openById(dbId);
      var sheet = ss.getSheetByName('FIN_CARTOES');
      if (!sheet || sheet.getLastRow() < 2) { throw new Error('Aba FIN_CARTOES vazia ou inexistente.'); }

      var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
      var values = range.getValues();
      var headers = values[0].map(function(h) { return String(h || '').trim().toUpperCase().replace(/\s/g, '_'); });

      var colID            = headers.indexOf('ID');
      var colAtualizadoEm  = headers.indexOf('ATUALIZADO_EM');
      var colAtualizadoPor = headers.indexOf('ATUALIZADO_POR');
      if (colID === -1) { throw new Error('Coluna ID não encontrada no schema.'); }

      const u       = finUsuario_(sessao);
      var agora     = finNow_();
      var emailUser = u.nome || 'API';
      var idsSet    = {};
      ids.forEach(function(i) { idsSet[i] = true; });

      var atualizados    = 0;
      var updatesBuffer  = [];

      for (var r = 1; r < values.length; r++) {
        var rowId = String(values[r][colID] || '').trim();
        if (idsSet[rowId]) {
          Object.keys(patch).forEach(function(key) {
            var colIdx = headers.indexOf(key);
            if (colIdx !== -1) { values[r][colIdx] = patch[key]; }
          });
          if (colAtualizadoEm  !== -1) { values[r][colAtualizadoEm]  = agora; }
          if (colAtualizadoPor !== -1) { values[r][colAtualizadoPor] = emailUser; }
          updatesBuffer.push({ row: r + 1, data: values[r] });
          atualizados++;
        }
      }

      updatesBuffer.forEach(function(update) {
        sheet.getRange(update.row, 1, 1, headers.length).setValues([update.data]);
      });

      return { ok: true, atualizados: atualizados, message: atualizados + ' registro(s) sincronizado(s) no Perfil Master.' };
    } catch (e) {
      return { ok: false, message: 'Erro no Batch Update: ' + e.message };
    }
  }

  function bloquearCartao(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "bloquear cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartão não informado.");
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartão não encontrado.");
      if (finSafeUpper_(antes.STATUS_CARTAO) === STATUS_CARTAO.BLOQUEADO_TEMPORARIO) {
        return finErro_("Cartão já está bloqueado.");
      }
      if (!finSafeText_(motivo)) return finErro_("Motivo do bloqueio é obrigatório.");
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
        "Cartão bloqueado: " + finSafeText_(motivo));
      return finOk_({ message: "Cartão bloqueado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function desbloquearCartao(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "desbloquear cartao");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do cartão não informado.");
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_("Cartão não encontrado.");
      if (finSafeUpper_(antes.STATUS_CARTAO) !== STATUS_CARTAO.BLOQUEADO_TEMPORARIO) {
        return finErro_("Cartão não está bloqueado.");
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
      finLog_(sessao, "CARTAO_DESBLOQUEADO", "CARTAO", finSafeText_(antes.CARTAO_ID), antes, depois, "OK", "Cartão desbloqueado.");
      return finOk_({ message: "Cartão desbloqueado com sucesso.", item: depois });
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
      if (!finSafeText_(id)) return finErro_("ID da recarga não informado.");
      const item = finGetById_(ABAS.RECARGAS, id);
      if (!item) return finErro_("Recarga não encontrada.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar recargas do seu proprio cartão.");
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
      if (!cartao) return finErro_("Cartão não encontrado: " + payload.CARTAO_ID);
      // STATUS_CARTAO_ATIVO_CHECK_FLASH42
      var statusCartao = finSafeUpper_(cartao.STATUS_CARTAO);
      if (statusCartao !== "ATIVO") {
        return finErro_("Recarga rejeitada: cartão " + finSafeText_(payload.CARTAO_ID) +
          " está " + statusCartao + ". Somente cartões com STATUS_CARTAO=ATIVO aceitam recarga.");
      }
      // FLASH413_CPF_GUARD: operacao controlada por CPF autorizado
      var _f413Ativa = String(PropertiesService.getScriptProperties().getProperty("FLASH_OPERACAO_CONTROLADA_ATIVA") || "false").trim().toLowerCase();
      if (_f413Ativa === "true") {
        var _f413LibGeral = String(PropertiesService.getScriptProperties().getProperty("FLASH_LIBERACAO_GERAL") || "false").trim().toLowerCase();
        if (_f413LibGeral !== "true") {
          var _f413CPFCartao     = finSafeText_(cartao.CPF_COLABORADOR || payload.CPF_COLABORADOR).replace(/\D/g, "");
          var _f413Autorizados   = String(PropertiesService.getScriptProperties().getProperty("FLASH_CPFS_AUTORIZADOS") || "").split(",").map(function(c) { return c.trim().replace(/\D/g, ""); });
          if (!_f413CPFCartao || _f413Autorizados.indexOf(_f413CPFCartao) < 0) {
            return finErro_("CPF " + (_f413CPFCartao || "?") + " nao autorizado para operacao Flash controlada. Contate o responsavel financeiro. [FLASH.4.13]");
          }
        }
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const recargaId = finGerarId_("REC");
      const chaveIdem = finSafeText_(payload.CHAVE_IDEMPOTENCIA) ||
        [finSafeText_(payload.CARTAO_ID),
         String(finSafeNumber_(payload.VALOR)),
         finSafeText_(payload.DATA_RECARGA),
         finSafeText_(cartao.FUNCIONARIO_ID)].join("|");
      const todasRecargas = finAll_(ABAS.RECARGAS);
      const recargaDuplicada = todasRecargas.find(function(r) {
        return finSafeText_(r.CHAVE_IDEMPOTENCIA) === chaveIdem &&
               finSafeUpper_(r.STATUS) !== STATUS_RECARGA.CANCELADA;
      });
      if (recargaDuplicada) {
        return finErro_("Recarga duplicada detectada. Chave de idempotência já registrada em " +
          finSafeText_(recargaDuplicada.RECARGA_ID) +
          ". Revise o formulário ou use uma chave diferente.");
      }
      const registro = {
        ID                       : finUuid_(),
        RECARGA_ID               : recargaId,
        CHAVE_IDEMPOTENCIA       : chaveIdem,
        CARTAO_ID                : finSafeText_(payload.CARTAO_ID),
        FUNCIONARIO_ID           : finSafeText_(cartao.FUNCIONARIO_ID),
        FUNCIONARIO_NOME         : finSafeText_(cartao.FUNCIONARIO_NOME),
        CPF_COLABORADOR          : finSafeText_(cartao.CPF_COLABORADOR || payload.CPF_COLABORADOR || ""),
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
      if (!finSafeText_(id))     return finErro_("ID da recarga não informado.");
      if (!finSafeText_(motivo)) return finErro_("Motivo do cancelamento é obrigatório.");
      const antes = finGetById_(ABAS.RECARGAS, id);
      if (!antes) return finErro_("Recarga não encontrada.");
      if (finSafeUpper_(antes.STATUS) === STATUS_RECARGA.CANCELADA) {
        return finErro_("Recarga já está cancelada.");
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
      if (!finSafeText_(id)) return finErro_("ID do lançamento não informado.");
      const item = finGetById_(ABAS.LANCAMENTOS, id);
      if (!item) return finErro_("Lançamento não encontrado.");
      if (finPerfil_(sessao) === "TECNICO") {
        const u = finUsuario_(sessao);
        if (finSafeText_(item.FUNCIONARIO_ID) !== u.id) {
          return finErro_("Acesso negado: voce so pode visualizar seus proprios lançamentos.");
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
          return finErro_("Acesso negado: voce so pode criar lançamentos para si mesmo.");
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
        "Lançamento de R$ " + registro.VALOR + " criado.");
      return finOk_({ message: "Lançamento registrado com sucesso.", id: registro.ID, lancamentoId: lancamentoId, item: registro });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function atualizarLancamento(sessionId, id, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "atualizar lancamento");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do lançamento não informado.");
      if (!payload)           return finErro_("Payload não informado.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lançamento não encontrado.");
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
          return finErro_("Acesso negado: voce so pode editar seus proprios lançamentos.");
        }
        if (statusEditaveis.indexOf(statusAtual) < 0) {
          return finErro_("Lançamento não pode ser editado no status atual: " + statusAtual);
        }
      } else {
        finGarantirPerfil_(sessao, PERFIS_OPERADOR, "atualizar lançamento de terceiro");
        if (statusBloqueados.indexOf(statusAtual) >= 0) {
          return finErro_("Lançamento já finalizado não pode ser editado. Status: " + statusAtual);
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
        "Lançamento atualizado.");
      return finOk_({ message: "Lançamento atualizado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function aprovarLancamento(sessionId, id) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "aprovar lancamento");
      finDbOk_();
      if (!finSafeText_(id)) return finErro_("ID do lançamento não informado.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lançamento não encontrado.");
      const statusAtual = finSafeUpper_(antes.STATUS_PRESTACAO);
      if (statusAtual === STATUS_PRESTACAO.APROVADO) {
        return finErro_("Lançamento já aprovado.");
      }
      if (statusAtual === STATUS_PRESTACAO.REPROVADO) {
        return finErro_("Lançamento reprovado não pode ser aprovado diretamente. Edite e reenvie.");
      }
      if (statusAtual === STATUS_PRESTACAO.PENDENTE_COMPROVANTE) {
        return finErro_("Lançamento pendente de comprovante não pode ser aprovado.");
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
        "Lançamento aprovado por " + u.nome + ".");
      return finOk_({ message: "Lançamento aprovado com sucesso.", item: depois });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function rejeitarLancamento(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_GESTOR, "rejeitar lancamento");
      finDbOk_();
      if (!finSafeText_(id))     return finErro_("ID do lançamento não informado.");
      if (!finSafeText_(motivo)) return finErro_("Motivo da rejeição é obrigatório.");
      const antes = finGetById_(ABAS.LANCAMENTOS, id);
      if (!antes) return finErro_("Lançamento não encontrado.");
      const statusAtual = finSafeUpper_(antes.STATUS_PRESTACAO);
      if (statusAtual === STATUS_PRESTACAO.REPROVADO) {
        return finErro_("Lançamento já reprovado.");
      }
      if (statusAtual === STATUS_PRESTACAO.APROVADO) {
        return finErro_("Lançamento já aprovado não pode ser reprovado diretamente.");
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
        "Lançamento reprovado: " + finSafeText_(motivo));
      return finOk_({ message: "Lançamento reprovado.", item: depois });
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
  // FUNCOES PUBLICAS - FLASH OPERACIONAL READ-ONLY
  // ============================================================

  function finFlashAplicarFiltros_(lista, filtros) {
    const f = filtros || {};
    var saida = (lista || []).slice();
    if (finSafeText_(f.status)) {
      saida = saida.filter(function(r) {
        return finSafeUpper_(r.STATUS || r.STATUS_LOTE || r.STATUS_CONCILIACAO) === finSafeUpper_(f.status);
      });
    }
    if (finSafeText_(f.loteId)) {
      saida = saida.filter(function(r) {
        return finSafeText_(r.LOTE_ID) === finSafeText_(f.loteId);
      });
    }
    if (finSafeText_(f.conciliado)) {
      saida = saida.filter(function(r) {
        return finSafeUpper_(r.CONCILIADO) === finSafeUpper_(f.conciliado);
      });
    }
    if (finSafeText_(f.tipoPendencia)) {
      saida = saida.filter(function(r) {
        return finSafeUpper_(r.TIPO_PENDENCIA) === finSafeUpper_(f.tipoPendencia);
      });
    }
    if (finSafeText_(f.texto)) {
      const texto = finSafeUpper_(f.texto);
      saida = saida.filter(function(r) {
        return JSON.stringify(r || {}).toUpperCase().indexOf(texto) >= 0;
      });
    }
    return saida;
  }

  function finFlashLimite_(filtros) {
    const n = Number(filtros && filtros.limite);
    if (!isNaN(n) && n > 0) return Math.min(n, 500);
    return 100;
  }

  function finFlashUltimos_(lista, limite) {
    const base = (lista || []).slice();
    return base.slice(Math.max(0, base.length - limite)).reverse();
  }

  function finFlashValorExtrato_(r) {
    return Math.abs(finSafeNumber_(r.VALOR || r.VALOR_TRANSACAO));
  }

  function finFlashTemDadosTeste_(grupos) {
    const texto = JSON.stringify(grupos || []);
    return texto.indexOf("TESTE") >= 0 ||
      texto.indexOf("LOTE-FLASH-20260611-143638") >= 0 ||
      texto.indexOf("LANC-TESTE") >= 0 ||
      texto.indexOf("PEND-FLASH-FIN132") >= 0;
  }

  function finFlashListar_(sessionId, aba, filtros) {
    const sessao = finSessao_(sessionId);
    finGarantirPerfil_(sessao, PERFIS_CONSULTA, "listar dados Flash");
    finDbOk_();
    const f = filtros || {};
    const lista = finFlashAplicarFiltros_(finAll_(aba), f);
    const limite = finFlashLimite_(f);
    return finOk_({
      items: lista.slice(0, limite),
      total: lista.length,
      limite: limite
    });
  }

  function finFlashObterResumoOperacionalCore_() {
    try {
      finDbOk_();

      const lotes = finAll_(ABAS.LOTES_EXTRATO_FLASH);
      const extratos = finAll_(ABAS.EXTRATOS);
      const lancamentos = finAll_(ABAS.LANCAMENTOS);
      const conciliacoes = finAll_(ABAS.CONCILIACAO);
      const pendencias = finAll_(ABAS.PENDENCIAS);
      const extratosConciliados = extratos.filter(function(r) { return finSafeUpper_(r.CONCILIADO) === "SIM"; });
      const lancamentosConciliados = lancamentos.filter(function(r) { return finSafeUpper_(r.CONCILIADO) === "SIM"; });
      const pendenciasAbertas = pendencias.filter(function(r) {
        const s = finSafeUpper_(r.STATUS);
        return s !== "RESOLVIDA" && s !== "RESOLVIDO" && s !== "FECHADA" && s !== "CANCELADA";
      });
      const pendenciasResolvidas = pendencias.filter(function(r) {
        const s = finSafeUpper_(r.STATUS);
        return s === "RESOLVIDA" || s === "RESOLVIDO" || s === "FECHADA";
      });
      const valorTotalExtratos = extratos.reduce(function(acc, r) {
        return acc + finFlashValorExtrato_(r);
      }, 0);
      const valorTotalPendenciasAbertas = pendenciasAbertas.reduce(function(acc, r) {
        return acc + Math.abs(finSafeNumber_(r.VALOR_ENVOLVIDO));
      }, 0);
      const percentualConciliado = extratos.length
        ? Number(((extratosConciliados.length / extratos.length) * 100).toFixed(2))
        : 0;
      const grupos = [lotes, extratos, lancamentos, conciliacoes, pendencias];

      return finOk_({
        resumo: {
          totalLotes: lotes.length,
          totalExtratos: extratos.length,
          totalExtratosConciliados: extratosConciliados.length,
          totalExtratosNaoConciliados: extratos.length - extratosConciliados.length,
          totalLancamentos: lancamentos.length,
          totalLancamentosConciliados: lancamentosConciliados.length,
          totalLancamentosNaoConciliados: lancamentos.length - lancamentosConciliados.length,
          totalConciliacoes: conciliacoes.length,
          totalPendencias: pendencias.length,
          totalPendenciasAbertas: pendenciasAbertas.length,
          totalPendenciasResolvidas: pendenciasResolvidas.length,
          valorTotalExtratos: valorTotalExtratos,
          valorTotalPendenciasAbertas: valorTotalPendenciasAbertas,
          percentualConciliado: percentualConciliado
        },
        ultimosLotes: finFlashUltimos_(lotes, 10),
        ultimosExtratos: finFlashUltimos_(extratos, 20),
        ultimasPendencias: finFlashUltimos_(pendencias, 20),
        ultimasConciliacoes: finFlashUltimos_(conciliacoes, 10),
        dadosTeste: finFlashTemDadosTeste_(grupos),
        bloqueios: [],
        avisos: finFlashTemDadosTeste_(grupos) ? ["Ambiente com dados de teste Flash detectados."] : []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashObterResumoOperacional(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter resumo operacional Flash");
      return finFlashObterResumoOperacionalCore_();
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashTelaValor_(valor) {
    if (valor instanceof Date) return valor.toISOString();
    if (valor === null || valor === undefined) return "";
    if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return valor;
    return String(valor);
  }

  function finFlashTelaLista_(lista, limite, campos) {
    return (lista || []).slice(0, limite).map(function(item) {
      const saida = {};
      campos.forEach(function(campo) {
        saida[campo] = finFlashTelaValor_(item && item[campo]);
      });
      return saida;
    });
  }

  function finFlashObterResumoTela(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter resumo operacional Flash");
      const base = finFlashObterResumoOperacionalCore_();
      if (!base || !base.ok) return base;
      return finOk_({
        resumo: base.resumo || {},
        ultimosLotes: finFlashTelaLista_(base.ultimosLotes, 5, [
          "LOTE_ID", "STATUS_LOTE", "STATUS", "TOTAL_LANCAMENTOS", "SALDO_LIQUIDO"
        ]),
        ultimosExtratos: finFlashTelaLista_(base.ultimosExtratos, 10, [
          "EXTRATO_ID", "LOTE_ID", "DATA_TRANSACAO", "DATA", "ESTABELECIMENTO_EXTRATO",
          "DESCRICAO", "VALOR", "VALOR_TRANSACAO", "CONCILIADO", "STATUS"
        ]),
        ultimasPendencias: finFlashTelaLista_(base.ultimasPendencias, 10, [
          "PENDENCIA_ID", "TIPO_PENDENCIA", "DESCRICAO_PENDENCIA", "VALOR_ENVOLVIDO", "STATUS"
        ]),
        ultimasConciliacoes: finFlashTelaLista_(base.ultimasConciliacoes, 5, [
          "CONCILIACAO_ID", "ID", "DATA_CONCILIACAO", "TOTAL_CONCILIADO", "STATUS"
        ]),
        dadosTesteDetectados: !!base.dadosTeste,
        dadosTeste: !!base.dadosTeste,
        bloqueios: base.bloqueios || [],
        avisos: base.avisos || []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashDataMs_(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate()).getTime();
    const txt = finSafeText_(valor);
    const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
    const br = txt.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])).getTime();
    return null;
  }

  function finFlashDataProxima_(a, b) {
    const ams = finFlashDataMs_(a);
    const bms = finFlashDataMs_(b);
    if (ams === null || bms === null) return false;
    return Math.abs(ams - bms) <= 86400000;
  }

  function finFlashExtratoPendente_(r) {
    const status = finSafeUpper_(r.STATUS);
    const conciliado = finSafeUpper_(r.CONCILIADO);
    return (!status || status === "IMPORTADO" || status === "ATIVO") && conciliado !== "SIM";
  }

  function finFlashLancamentoPendente_(r) {
    const status = finSafeUpper_(r.STATUS);
    const conciliado = finSafeUpper_(r.CONCILIADO);
    return (!status || status === "ATIVO") && conciliado !== "SIM";
  }

  function finFlashMesmoCartao_(extrato, lancamento) {
    const cartaoIdExtrato = finSafeText_(extrato.CARTAO_ID);
    const cartaoIdLanc = finSafeText_(lancamento.CARTAO_ID);
    if (cartaoIdExtrato && cartaoIdLanc) return cartaoIdExtrato === cartaoIdLanc;
    const finalExtrato = finSafeText_(extrato.CARTAO_FINAL);
    const finalLanc = finSafeText_(lancamento.CARTAO_FINAL);
    if (finalExtrato && finalLanc) return finalExtrato === finalLanc;
    return true;
  }

  function finFlashItemConciliacaoTela_(extrato, lancamento) {
    return {
      extratoId: finFlashTelaValor_(extrato.EXTRATO_ID || extrato.ID),
      lancamentoId: lancamento ? finFlashTelaValor_(lancamento.LANCAMENTO_ID || lancamento.ID) : "",
      dataExtrato: finFlashTelaValor_(extrato.DATA_TRANSACAO || extrato.DATA),
      dataLancamento: lancamento ? finFlashTelaValor_(lancamento.DATA_GASTO || lancamento.DATA) : "",
      descricaoExtrato: finFlashTelaValor_(extrato.ESTABELECIMENTO_EXTRATO || extrato.DESCRICAO),
      descricaoLancamento: lancamento ? finFlashTelaValor_(lancamento.ESTABELECIMENTO || lancamento.DESCRICAO_GASTO) : "",
      valorExtrato: finSafeNumber_(extrato.VALOR || extrato.VALOR_TRANSACAO),
      valorLancamento: lancamento ? finSafeNumber_(lancamento.VALOR) : 0,
      cartaoId: finFlashTelaValor_(extrato.CARTAO_ID || (lancamento && lancamento.CARTAO_ID)),
      cartaoFinal: finFlashTelaValor_(extrato.CARTAO_FINAL || (lancamento && lancamento.CARTAO_FINAL))
    };
  }

  function finFlashPrevisualizarConciliacaoTela(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "previsualizar conciliacao Flash");
      finDbOk_();

      const extratos = finAll_(ABAS.EXTRATOS).filter(finFlashExtratoPendente_);
      const lancamentos = finAll_(ABAS.LANCAMENTOS).filter(finFlashLancamentoPendente_);
      const usados = {};
      const conciliaveis = [];
      const semPrestacao = [];

      extratos.forEach(function(extrato) {
        const valorExtrato = Math.abs(finSafeNumber_(extrato.VALOR || extrato.VALOR_TRANSACAO));
        const candidato = lancamentos.find(function(lancamento) {
          const lancId = finSafeText_(lancamento.LANCAMENTO_ID || lancamento.ID);
          if (usados[lancId]) return false;
          const valorLanc = Math.abs(finSafeNumber_(lancamento.VALOR));
          return Math.abs(valorExtrato - valorLanc) <= 0.01 &&
            finFlashDataProxima_(extrato.DATA_TRANSACAO || extrato.DATA, lancamento.DATA_GASTO || lancamento.DATA) &&
            finFlashMesmoCartao_(extrato, lancamento);
        });
        if (candidato) {
          usados[finSafeText_(candidato.LANCAMENTO_ID || candidato.ID)] = true;
          conciliaveis.push(finFlashItemConciliacaoTela_(extrato, candidato));
        } else {
          semPrestacao.push(finFlashItemConciliacaoTela_(extrato, null));
        }
      });

      const semExtrato = lancamentos.filter(function(lancamento) {
        return !usados[finSafeText_(lancamento.LANCAMENTO_ID || lancamento.ID)];
      }).map(function(lancamento) {
        return {
          lancamentoId: finFlashTelaValor_(lancamento.LANCAMENTO_ID || lancamento.ID),
          dataLancamento: finFlashTelaValor_(lancamento.DATA_GASTO || lancamento.DATA),
          descricaoLancamento: finFlashTelaValor_(lancamento.ESTABELECIMENTO || lancamento.DESCRICAO_GASTO),
          valorLancamento: finSafeNumber_(lancamento.VALOR),
          cartaoId: finFlashTelaValor_(lancamento.CARTAO_ID),
          cartaoFinal: finFlashTelaValor_(lancamento.CARTAO_FINAL)
        };
      });

      return finOk_({
        resumo: {
          totalExtratosPendentes: extratos.length,
          totalLancamentosPendentes: lancamentos.length,
          totalConciliaveis: conciliaveis.length,
          totalSemPrestacao: semPrestacao.length,
          totalSemExtrato: semExtrato.length
        },
        conciliaveis: conciliaveis.slice(0, 20),
        semPrestacao: semPrestacao.slice(0, 20),
        semExtrato: semExtrato.slice(0, 20),
        bloqueios: [],
        avisos: []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashPrevisualizarPendenciasTela(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "previsualizar pendencias Flash");
      finDbOk_();

      const pendencias = finAll_(ABAS.PENDENCIAS);
      const extratos = finAll_(ABAS.EXTRATOS);
      const lancamentos = finAll_(ABAS.LANCAMENTOS);
      const extratosIds = {};
      const lancamentosIds = {};
      extratos.forEach(function(r) { extratosIds[finSafeText_(r.EXTRATO_ID || r.ID)] = true; });
      lancamentos.forEach(function(r) { lancamentosIds[finSafeText_(r.LANCAMENTO_ID || r.ID)] = true; });

      const totalPorTipo = {};
      const chaves = {};
      const abertas = [];
      const duplicadas = [];
      const semReferencia = [];

      pendencias.forEach(function(p) {
        const tipo = finSafeText_(p.TIPO_PENDENCIA) || "INDEFINIDO";
        totalPorTipo[tipo] = (totalPorTipo[tipo] || 0) + 1;
        const status = finSafeUpper_(p.STATUS);
        const item = {
          pendenciaId: finFlashTelaValor_(p.PENDENCIA_ID || p.ID),
          tipoPendencia: finFlashTelaValor_(p.TIPO_PENDENCIA),
          descricaoPendencia: finFlashTelaValor_(p.DESCRICAO_PENDENCIA),
          valorEnvolvido: finSafeNumber_(p.VALOR_ENVOLVIDO),
          extratoId: finFlashTelaValor_(p.EXTRATO_ID),
          lancamentoId: finFlashTelaValor_(p.LANCAMENTO_ID),
          status: finFlashTelaValor_(p.STATUS)
        };
        if (status !== "RESOLVIDA" && status !== "RESOLVIDO" && status !== "FECHADA" && status !== "CANCELADA") {
          abertas.push(item);
        }
        const chave = [
          finSafeText_(p.TIPO_PENDENCIA),
          finSafeText_(p.EXTRATO_ID),
          finSafeText_(p.LANCAMENTO_ID),
          finSafeText_(p.VALOR_ENVOLVIDO),
          status
        ].join("|");
        if (chaves[chave]) duplicadas.push(item);
        chaves[chave] = true;
        const extratoId = finSafeText_(p.EXTRATO_ID);
        const lancamentoId = finSafeText_(p.LANCAMENTO_ID);
        if ((extratoId && !extratosIds[extratoId]) || (lancamentoId && !lancamentosIds[lancamentoId]) || (!extratoId && !lancamentoId)) {
          semReferencia.push(item);
        }
      });

      return finOk_({
        resumo: {
          totalPendencias: pendencias.length,
          totalAbertas: abertas.length,
          totalResolvidas: pendencias.length - abertas.length,
          totalPorTipo: totalPorTipo
        },
        pendenciasAbertas: abertas.slice(0, 30),
        pendenciasDuplicadas: duplicadas.slice(0, 20),
        pendenciasSemReferencia: semReferencia.slice(0, 20),
        bloqueios: [],
        avisos: []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashLocalizarPendencia_(pendenciaId) {
    const alvo = finSafeText_(pendenciaId);
    const sheet = finSheet_(ABAS.PENDENCIAS);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (!alvo || lastRow < 2 || lastCol < 1) return null;
    const dados = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = dados[0].map(function(h) { return finSafeText_(h); });
    const idxId = headers.indexOf("ID");
    const idxPendenciaId = headers.indexOf("PENDENCIA_ID");
    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      if ((idxPendenciaId >= 0 && finSafeText_(row[idxPendenciaId]) === alvo) ||
          (idxId >= 0 && finSafeText_(row[idxId]) === alvo)) {
        const item = {};
        headers.forEach(function(h, j) { item[h] = finValorSaida_(row[j]); });
        return {
          sheet: sheet,
          headers: headers,
          rowValues: row,
          rowIndex: i + 1,
          item: item
        };
      }
    }
    return null;
  }

  function finFlashAplicarPatchLinha_(local, patch) {
    const row = local.rowValues.slice();
    Object.keys(patch || {}).forEach(function(campo) {
      const idx = local.headers.indexOf(campo);
      if (idx >= 0) row[idx] = patch[campo];
    });
    local.sheet.getRange(local.rowIndex, 1, 1, local.headers.length).setValues([row]);
  }

  function finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "resolver pendencia Flash pela tela");
      const alvo = finSafeText_(pendenciaId);
      const texto = finSafeText_(resolucaoTexto);
      if (confirmacao !== "RESOLVER_PENDENCIA_FLASH_TELA_FIN_E") {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: false,
          pendenciaId: alvo,
          bloqueios: ["Confirmação textual obrigatória invalida ou ausente para resolver pendencia Flash pela tela."],
          avisos: []
        };
      }
      if (!alvo) {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: true,
          pendenciaId: alvo,
          bloqueios: ["Pendencia não informada."],
          avisos: []
        };
      }
      if (texto.length < 10) {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: true,
          pendenciaId: alvo,
          bloqueios: ["Resolucao obrigatoria deve ter pelo menos 10 caracteres."],
          avisos: []
        };
      }
      finDbOk_();
      const local = finFlashLocalizarPendencia_(alvo);
      if (!local) {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: true,
          pendenciaId: alvo,
          bloqueios: ["Pendencia não encontrada"],
          avisos: []
        };
      }
      const statusAnterior = finSafeUpper_(local.item.STATUS);
      if (statusAnterior === "RESOLVIDA") {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: true,
          pendenciaId: alvo,
          statusAnterior: statusAnterior,
          bloqueios: ["Pendencia já resolvida. Nenhuma alteracao realizada."],
          avisos: ["Idempotencia preservada: resolucao não duplicada."]
        };
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const resolvidoPor = u.nome || u.id || u.perfil || "";
      finFlashAplicarPatchLinha_(local, {
        STATUS: "RESOLVIDA",
        RESOLUCAO_DESCRICAO: texto,
        RESOLUCAO_EM: agora,
        RESOLVIDO_POR: resolvidoPor,
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: resolvidoPor
      });
      return finOk_({
        executado: true,
        autorizado: true,
        pendenciaId: alvo,
        statusAnterior: statusAnterior,
        statusNovo: "RESOLVIDA",
        resolucaoDescricao: texto,
        linha: local.rowIndex,
        bloqueios: [],
        avisos: []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashAuditarPendenciasTelaCore_() {
    try {
      finDbOk_();
      const pendencias = finAll_(ABAS.PENDENCIAS);
      const extratos = finAll_(ABAS.EXTRATOS);
      const lancamentos = finAll_(ABAS.LANCAMENTOS);
      const extratosIds = {};
      const lancamentosIds = {};
      extratos.forEach(function(r) { extratosIds[finSafeText_(r.EXTRATO_ID || r.ID)] = true; });
      lancamentos.forEach(function(r) { lancamentosIds[finSafeText_(r.LANCAMENTO_ID || r.ID)] = true; });
      const abertas = [];
      const resolvidas = [];
      const duplicadas = [];
      const semReferencia = [];
      const chaves = {};

      pendencias.forEach(function(p) {
        const status = finSafeUpper_(p.STATUS);
        const item = {
          pendenciaId: finFlashTelaValor_(p.PENDENCIA_ID || p.ID),
          tipoPendencia: finFlashTelaValor_(p.TIPO_PENDENCIA),
          descricaoPendencia: finFlashTelaValor_(p.DESCRICAO_PENDENCIA),
          valorEnvolvido: finSafeNumber_(p.VALOR_ENVOLVIDO),
          extratoId: finFlashTelaValor_(p.EXTRATO_ID),
          lancamentoId: finFlashTelaValor_(p.LANCAMENTO_ID),
          status: finFlashTelaValor_(p.STATUS),
          resolucaoDescricao: finFlashTelaValor_(p.RESOLUCAO_DESCRICAO),
          resolucaoEm: finFlashTelaValor_(p.RESOLUCAO_EM),
          resolvidoPor: finFlashTelaValor_(p.RESOLVIDO_POR)
        };
        if (status === "RESOLVIDA" || status === "RESOLVIDO" || status === "FECHADA") {
          resolvidas.push(item);
        } else {
          abertas.push(item);
        }
        const chave = [
          finSafeText_(p.TIPO_PENDENCIA),
          finSafeText_(p.EXTRATO_ID),
          finSafeText_(p.LANCAMENTO_ID),
          finSafeText_(p.VALOR_ENVOLVIDO),
          status
        ].join("|");
        if (chaves[chave]) duplicadas.push(item);
        chaves[chave] = true;
        const extratoId = finSafeText_(p.EXTRATO_ID);
        const lancamentoId = finSafeText_(p.LANCAMENTO_ID);
        if ((extratoId && !extratosIds[extratoId]) || (lancamentoId && !lancamentosIds[lancamentoId]) || (!extratoId && !lancamentoId)) {
          semReferencia.push(item);
        }
      });

      return finOk_({
        totalPendencias: pendencias.length,
        totalAbertas: abertas.length,
        totalResolvidas: resolvidas.length,
        pendenciasAbertas: abertas.slice(0, 30),
        pendenciasResolvidas: resolvidas.slice(0, 30),
        pendenciasDuplicadas: duplicadas.slice(0, 20),
        pendenciasSemReferencia: semReferencia.slice(0, 20),
        bloqueios: [],
        avisos: []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashAuditarPendenciasTela(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "auditar pendencias Flash pela tela");
      return finFlashAuditarPendenciasTelaCore_();
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashPeriodoFiltro_(valor, filtros) {
    const f = filtros || {};
    const data = finFlashDataMs_(valor);
    const inicio = finFlashDataMs_(f.dataInicio);
    const fim = finFlashDataMs_(f.dataFim);
    if (inicio !== null && (data === null || data < inicio)) return false;
    if (fim !== null && (data === null || data > fim)) return false;
    return true;
  }

  function finFlashSomarGrupo_(mapa, chave, campo, valor) {
    const k = finSafeText_(chave) || "NAO_INFORMADO";
    if (!mapa[k]) mapa[k] = { chave: k, total: 0, valor: 0 };
    mapa[k].total += 1;
    mapa[k].valor += Math.abs(finSafeNumber_(valor));
    if (campo) mapa[k][campo] = k;
  }

  function finFlashGrupoLista_(mapa, limite) {
    return Object.keys(mapa || {}).map(function(k) {
      const item = mapa[k];
      return {
        chave: finFlashTelaValor_(item.chave),
        total: item.total,
        valor: Number((item.valor || 0).toFixed(2))
      };
    }).sort(function(a, b) {
      return b.valor - a.valor || b.total - a.total;
    }).slice(0, limite || 20);
  }

  function finFlashPendenciaAberta_(p) {
    const status = finSafeUpper_(p.STATUS);
    return status !== "RESOLVIDA" && status !== "RESOLVIDO" && status !== "FECHADA" && status !== "CANCELADA";
  }

  function finFlashAplicarFiltrosDashboard_(base, filtros) {
    const f = filtros || {};
    const cartaoFinal = finSafeText_(f.cartaoFinal);
    const funcionario = finSafeUpper_(f.funcionarioNome);
    const statusPendencia = finSafeUpper_(f.statusPendencia);

    const extratos = (base.extratos || []).filter(function(r) {
      if (!finFlashPeriodoFiltro_(r.DATA_TRANSACAO || r.DATA, f)) return false;
      if (cartaoFinal && finSafeText_(r.CARTAO_FINAL) !== cartaoFinal) return false;
      if (funcionario && JSON.stringify(r || {}).toUpperCase().indexOf(funcionario) < 0) return false;
      return true;
    });
    const lancamentos = (base.lancamentos || []).filter(function(r) {
      if (!finFlashPeriodoFiltro_(r.DATA_GASTO || r.DATA, f)) return false;
      if (cartaoFinal && finSafeText_(r.CARTAO_FINAL) !== cartaoFinal) return false;
      if (funcionario && JSON.stringify(r || {}).toUpperCase().indexOf(funcionario) < 0) return false;
      return true;
    });
    const conciliacoes = (base.conciliacoes || []).filter(function(r) {
      return finFlashPeriodoFiltro_(r.DATA_CONCILIACAO || r.CRIADO_EM || r.DATA, f);
    });
    const pendencias = (base.pendencias || []).filter(function(r) {
      if (!finFlashPeriodoFiltro_(r.CRIADO_EM || r.ATUALIZADO_EM || r.RESOLUCAO_EM, f)) return false;
      if (cartaoFinal && finSafeText_(r.CARTAO_FINAL) !== cartaoFinal) return false;
      if (funcionario && JSON.stringify(r || {}).toUpperCase().indexOf(funcionario) < 0) return false;
      if (statusPendencia && finSafeUpper_(r.STATUS) !== statusPendencia) return false;
      return true;
    });
    return {
      lotes: base.lotes || [],
      extratos: extratos,
      lancamentos: lancamentos,
      conciliacoes: conciliacoes,
      pendencias: pendencias
    };
  }

  function finFlashDashboardGerencialCore_(filtros) {
    try {
      finDbOk_();
      const f = filtros || {};
      const base = {
        lotes: finAll_(ABAS.LOTES_EXTRATO_FLASH),
        extratos: finAll_(ABAS.EXTRATOS),
        lancamentos: finAll_(ABAS.LANCAMENTOS),
        conciliacoes: finAll_(ABAS.CONCILIACAO),
        pendencias: finAll_(ABAS.PENDENCIAS)
      };
      const dados = finFlashAplicarFiltrosDashboard_(base, f);
      const porTipoTransacao = {};
      const porStatusConciliacao = {};
      const porTipoPendencia = {};
      const porFuncionario = {};
      const porCartaoFinal = {};
      let totalDebitos = 0;
      let totalCreditos = 0;
      let valorDebitos = 0;
      let valorCreditos = 0;
      let totalConciliado = 0;
      let totalNaoConciliado = 0;

      dados.extratos.forEach(function(r) {
        const valor = finSafeNumber_(r.VALOR || r.VALOR_TRANSACAO);
        const tipo = finSafeUpper_(r.TIPO_TRANSACAO || r.TIPO) || (valor < 0 ? "DEBITO" : "CREDITO");
        const absValor = Math.abs(valor);
        if (tipo === "CREDITO" || valor > 0) {
          totalCreditos += 1;
          valorCreditos += absValor;
        } else {
          totalDebitos += 1;
          valorDebitos += absValor;
        }
        const conciliado = finSafeUpper_(r.CONCILIADO) === "SIM" ? "CONCILIADO" : "NAO_CONCILIADO";
        if (conciliado === "CONCILIADO") totalConciliado += 1;
        else totalNaoConciliado += 1;
        finFlashSomarGrupo_(porTipoTransacao, tipo || "INDEFINIDO", null, valor);
        finFlashSomarGrupo_(porStatusConciliacao, conciliado, null, valor);
        finFlashSomarGrupo_(porFuncionario, r.FUNCIONARIO_NOME || r.PESSOA || r.PORTADOR || r.CRIADO_POR, null, valor);
        finFlashSomarGrupo_(porCartaoFinal, r.CARTAO_FINAL, null, valor);
      });

      let totalPendenciasAbertas = 0;
      let totalPendenciasResolvidas = 0;
      let valorPendenciasAbertas = 0;
      let valorPendenciasResolvidas = 0;
      dados.pendencias.forEach(function(p) {
        const valor = finSafeNumber_(p.VALOR_ENVOLVIDO);
        const aberta = finFlashPendenciaAberta_(p);
        if (aberta) {
          totalPendenciasAbertas += 1;
          valorPendenciasAbertas += Math.abs(valor);
        } else {
          totalPendenciasResolvidas += 1;
          valorPendenciasResolvidas += Math.abs(valor);
        }
        finFlashSomarGrupo_(porTipoPendencia, p.TIPO_PENDENCIA || "INDEFINIDO", null, valor);
      });

      const maioresValores = dados.extratos.slice().sort(function(a, b) {
        return Math.abs(finSafeNumber_(b.VALOR || b.VALOR_TRANSACAO)) - Math.abs(finSafeNumber_(a.VALOR || a.VALOR_TRANSACAO));
      }).slice(0, 10).map(function(r) {
        return {
          extratoId: finFlashTelaValor_(r.EXTRATO_ID || r.ID),
          data: finFlashTelaValor_(r.DATA_TRANSACAO || r.DATA),
          descricao: finFlashTelaValor_(r.ESTABELECIMENTO_EXTRATO || r.DESCRICAO),
          valor: finSafeNumber_(r.VALOR || r.VALOR_TRANSACAO),
          tipo: finFlashTelaValor_(r.TIPO_TRANSACAO || r.TIPO),
          conciliado: finFlashTelaValor_(r.CONCILIADO),
          cartaoFinal: finFlashTelaValor_(r.CARTAO_FINAL)
        };
      });
      const pendenciasRecentes = dados.pendencias.slice().reverse().slice(0, 10).map(function(p) {
        return {
          pendenciaId: finFlashTelaValor_(p.PENDENCIA_ID || p.ID),
          tipoPendencia: finFlashTelaValor_(p.TIPO_PENDENCIA),
          descricaoPendencia: finFlashTelaValor_(p.DESCRICAO_PENDENCIA),
          valorEnvolvido: finSafeNumber_(p.VALOR_ENVOLVIDO),
          status: finFlashTelaValor_(p.STATUS)
        };
      });
      const conciliacoesRecentes = dados.conciliacoes.slice().reverse().slice(0, 10).map(function(c) {
        return {
          conciliacaoId: finFlashTelaValor_(c.CONCILIACAO_ID || c.ID),
          dataConciliacao: finFlashTelaValor_(c.DATA_CONCILIACAO),
          totalConciliado: finSafeNumber_(c.TOTAL_CONCILIADO),
          status: finFlashTelaValor_(c.STATUS)
        };
      });
      const totalExtratos = dados.extratos.length;
      const percentualConciliado = totalExtratos ? Number(((totalConciliado / totalExtratos) * 100).toFixed(2)) : 0;
      const gruposTeste = [base.lotes, base.extratos, base.lancamentos, base.conciliacoes, base.pendencias];

      return finOk_({
        filtrosAplicados: {
          dataInicio: finFlashTelaValor_(f.dataInicio),
          dataFim: finFlashTelaValor_(f.dataFim),
          cartaoFinal: finFlashTelaValor_(f.cartaoFinal),
          funcionarioNome: finFlashTelaValor_(f.funcionarioNome),
          statusPendencia: finFlashTelaValor_(f.statusPendencia)
        },
        kpis: {
          totalLotes: dados.lotes.length,
          totalExtratos: totalExtratos,
          totalDebitos: totalDebitos,
          totalCreditos: totalCreditos,
          valorDebitos: Number(valorDebitos.toFixed(2)),
          valorCreditos: Number(valorCreditos.toFixed(2)),
          saldoLiquido: Number((valorCreditos - valorDebitos).toFixed(2)),
          totalConciliado: totalConciliado,
          totalNaoConciliado: totalNaoConciliado,
          percentualConciliado: percentualConciliado,
          totalPendencias: dados.pendencias.length,
          totalPendenciasAbertas: totalPendenciasAbertas,
          totalPendenciasResolvidas: totalPendenciasResolvidas,
          valorPendenciasAbertas: Number(valorPendenciasAbertas.toFixed(2)),
          valorPendenciasResolvidas: Number(valorPendenciasResolvidas.toFixed(2))
        },
        porTipoTransacao: finFlashGrupoLista_(porTipoTransacao, 20),
        porStatusConciliacao: finFlashGrupoLista_(porStatusConciliacao, 20),
        porTipoPendencia: finFlashGrupoLista_(porTipoPendencia, 20),
        porFuncionario: finFlashGrupoLista_(porFuncionario, 20),
        porCartaoFinal: finFlashGrupoLista_(porCartaoFinal, 20),
        maioresValores: maioresValores,
        pendenciasRecentes: pendenciasRecentes,
        conciliacoesRecentes: conciliacoesRecentes,
        dadosTesteDetectados: finFlashTemDadosTeste_(gruposTeste),
        bloqueios: [],
        avisos: finFlashTemDadosTeste_(gruposTeste) ? ["Ambiente contem dados de teste Flash."] : []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashObterDashboardGerencial(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter dashboard gerencial Flash");
      return finFlashDashboardGerencialCore_(filtros || {});
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashGerarRelatorioSinteticoTela(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "gerar relatorio sintetico Flash");
      const dashboard = finFlashDashboardGerencialCore_(filtros || {});
      if (!dashboard || !dashboard.ok) return dashboard;
      const k = dashboard.kpis || {};
      const pontos = [];
      const recomendacoes = [];
      if (k.totalPendenciasAbertas > 0) {
        pontos.push("Existem pendencias abertas no periodo.");
        recomendacoes.push("Acompanhar pendencias abertas.");
      }
      if ((k.percentualConciliado || 0) < 90) {
        pontos.push("Percentual conciliado abaixo de 90%.");
        recomendacoes.push("Revisar lançamentos sem conciliacao.");
      }
      if (dashboard.dadosTesteDetectados) {
        pontos.push("Ambiente contem dados de teste Flash.");
        recomendacoes.push("Ambiente contem dados de teste Flash.");
      }
      if (!pontos.length) pontos.push("Sem pontos criticos identificados no painel Flash.");
      if (!recomendacoes.length) recomendacoes.push("Manter rotina de acompanhamento operacional.");
      return finOk_({
        periodo: {
          dataInicio: dashboard.filtrosAplicados.dataInicio || "",
          dataFim: dashboard.filtrosAplicados.dataFim || ""
        },
        resumoExecutivo: "Dashboard Flash com " + k.totalExtratos + " extratos, " +
          k.totalConciliado + " conciliados e " + k.totalPendenciasAbertas + " pendencias abertas.",
        kpis: k,
        pontosAtencao: pontos,
        recomendacoesOperacionais: recomendacoes,
        dadosTesteDetectados: !!dashboard.dadosTesteDetectados,
        bloqueios: [],
        avisos: dashboard.avisos || []
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashChecklistPreProducao(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "executar checklist pre-producao Flash");
      const dashboard = finFlashDashboardGerencialCore_({});
      if (!dashboard || !dashboard.ok) return dashboard;
      const auditoriaPendencias = finFlashAuditarPendenciasTelaCore_();
      if (!auditoriaPendencias || !auditoriaPendencias.ok) return auditoriaPendencias;
      const k = dashboard.kpis || {};
      const funcoesCriticasDisponiveis = [
        finFlashObterResumoOperacional,
        finFlashObterResumoTela,
        flashListarLotes,
        flashListarExtratos,
        flashListarPendencias,
        flashListarConciliacoes,
        finFlashPrevisualizarConciliacaoTela,
        finFlashPrevisualizarPendenciasTela,
        finFlashConciliarSelecionadosTela,
        finFlashGerarPendenciasTela,
        finFlashResolverPendenciaTela,
        finFlashAuditarPendenciasTela,
        finFlashObterDashboardGerencial,
        finFlashGerarRelatorioSinteticoTela
      ].every(function(fn) { return typeof fn === "function"; });
      const dadosTeste = !!dashboard.dadosTesteDetectados;
      const pendenciasAbertas = Number(k.totalPendenciasAbertas || 0);
      const semDuplicadas = !(auditoriaPendencias.pendenciasDuplicadas || []).length;
      const semSemReferencia = !(auditoriaPendencias.pendenciasSemReferencia || []).length;
      const bloqueios = [];
      const avisos = [];
      if (dadosTeste) avisos.push("Ambiente com dados de teste Flash detectados.");
      if (pendenciasAbertas > 0) bloqueios.push("Existem pendencias abertas antes da producao.");
      if (!semDuplicadas) bloqueios.push("Existem pendencias duplicadas.");
      if (!semSemReferencia) bloqueios.push("Existem pendencias sem referencia.");
      let recomendacaoFinal = "Apto para checklist de publicacao controlada.";
      if (dadosTeste && pendenciasAbertas > 0) {
        recomendacaoFinal = "Nao publicar producao com dados de teste ativos sem limpeza controlada. Resolver pendencias antes da producao.";
      } else if (dadosTeste) {
        recomendacaoFinal = "Ambiente tecnicamente funcional, porem contem dados de teste.";
      } else if (pendenciasAbertas > 0) {
        recomendacaoFinal = "Resolver pendencias antes da producao.";
      }
      return finOk_({
        itens: {
          schemaFinanceiroOk: true,
          dadosTesteDetectados: dadosTeste,
          pendenciasAbertas: pendenciasAbertas,
          totalExtratos: Number(k.totalExtratos || 0),
          totalConciliado: Number(k.totalConciliado || 0),
          percentualConciliado: Number(k.percentualConciliado || 0),
          funcoesCriticasDisponiveis: funcoesCriticasDisponiveis,
          acoesReaisBloqueadas: true,
          semPendenciasDuplicadas: semDuplicadas,
          semPendenciasSemReferencia: semSemReferencia
        },
        bloqueios: bloqueios,
        avisos: avisos,
        recomendacaoFinal: recomendacaoFinal
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashB46HeadersOk_(headers, obrigatorios) {
    return (obrigatorios || []).every(function(h) {
      return headers.indexOf(h) >= 0;
    });
  }

  function finFlashB46AuditoriaReadOnly_() {
    const bloqueios = [];
    const avisos = [];
    const props = PropertiesService.getScriptProperties();
    const dbFinId = finSafeText_(props.getProperty("DB_FIN_ID"));
    const folderFinId = finSafeText_(
      props.getProperty("FOLDER_FINANCEIRO") ||
      props.getProperty("FOLDER_FINANCEIRO_ID") ||
      (typeof sgoGetCfgSafe_() !== "undefined" && sgoGetCfgSafe_().DRIVE && sgoGetCfgSafe_().DRIVE.FOLDER_FINANCEIRO)
    );
    const essenciais = {};
    essenciais[ABAS.CARTOES] = ["ID", "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME", "STATUS_CARTAO"];
    essenciais[ABAS.LANCAMENTOS] = ["ID", "LANCAMENTO_ID", "CARTAO_ID", "FUNCIONARIO_ID", "VALOR", "STATUS_PRESTACAO"];
    essenciais[ABAS.ANEXOS] = ["ID", "ANEXO_ID", "LANCAMENTO_ID", "FILE_ID"];
    essenciais[ABAS.EXTRATOS] = ["ID", "EXTRATO_ID", "VALOR"];
    essenciais[ABAS.LOTES_EXTRATO_FLASH] = ["LOTE_ID"];
    essenciais[ABAS.CONCILIACAO] = ["ID"];
    essenciais[ABAS.PENDENCIAS] = ["ID", "PENDENCIA_ID", "STATUS"];
    essenciais[ABAS.LOGS] = ["ID"];

    const abas = {};
    let ss = null;
    if (!dbFinId) {
      bloqueios.push("DB_FIN_ID não configurado.");
    } else {
      try {
        ss = SpreadsheetApp.openById(dbFinId);
      } catch (e) {
        bloqueios.push("Nao foi possivel abrir DB_FIN_ID em leitura: " + e.message);
      }
    }

    Object.keys(ABAS).forEach(function(k) {
      const nome = ABAS[k];
      const info = {
        existe: false,
        headersOk: false,
        headersEssenciais: essenciais[nome] || [],
        headersEncontrados: []
      };
      if (ss) {
        const sheet = ss.getSheetByName(nome);
        info.existe = !!sheet;
        if (sheet) {
          const lastCol = sheet.getLastColumn();
          info.headersEncontrados = lastCol > 0
            ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return finSafeText_(h); })
            : [];
          info.headersOk = finFlashB46HeadersOk_(info.headersEncontrados, info.headersEssenciais);
          if (!info.headersOk) bloqueios.push("Headers essenciais ausentes em " + nome + ".");
        } else {
          bloqueios.push("Aba FIN ausente: " + nome + ".");
        }
      }
      abas[nome] = info;
    });

    const funcoesPrincipais = {
      prestacaoMobile: typeof finFlashObterPrestacaoPublicaPorTokenV1 === "function" &&
        typeof finFlashEnviarPrestacaoPublicaV1 === "function" &&
        typeof finFlashListarPrestacoesPublicasV1 === "function",
      pendenciasMobile: typeof finFlashListarPendenciasPublicasV1 === "function" &&
        typeof finFlashRegularizarPendenciaPublicaV1 === "function",
      previaConciliacao: typeof finFlashPrevisualizarConciliacaoTela === "function",
      previaPendencias: typeof finFlashPrevisualizarPendenciasTela === "function",
      relatoriosA4: typeof finFlashGerarComprovanteEntregaCartaoA4V1 === "function" &&
        typeof finFlashGerarRelatorioPrestacaoColaboradorA4V1 === "function" &&
        typeof finFlashGerarRelatorioPendenciasColaboradorA4V1 === "function" &&
        typeof finFlashGerarRelatorioConciliacaoPeriodoA4V1 === "function" &&
        typeof finFlashGerarRelatorioExtratoImportadoA4V1 === "function" &&
        typeof finFlashGerarRelatorioGerencialA4V1 === "function",
      dashboard: typeof finFlashObterDashboardGerencial === "function"
    };
    Object.keys(funcoesPrincipais).forEach(function(k) {
      if (!funcoesPrincipais[k]) bloqueios.push("Funcao principal Flash indisponivel: " + k + ".");
    });

    return {
      dbFinIdConfigurado: !!dbFinId,
      pastaDocumentosFinConfigurada: !!folderFinId,
      abasFinPrincipais: abas,
      funcoesPrincipaisFlash: funcoesPrincipais,
      separacaoMassaTesteOperacaoReal: true,
      nenhumaAcaoB46ExecutouGravacao: true,
      bloqueios: bloqueios,
      avisos: avisos
    };
  }

  function ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR() {
    const base = {
      etapa: "B46",
      nome: "Validacao humana mobile e preparacao do go-live controlado Flash",
      success: true,
      ok: true,
      executado: false,
      somenteLeitura: true
    };
    try {
      const auditoria = finFlashB46AuditoriaReadOnly_();
      const bloqueios = (auditoria.bloqueios || []).slice();
      const avisos = (auditoria.avisos || []).slice();
      const pronto = bloqueios.length === 0;
      return Object.assign(base, {
        roteiroTesteHumanoMobile: [
          "Abrir a tela mobile do Financeiro/Prestacao Flash em celular real.",
          "Conferir a identificacao do colaborador e o cartão apresentado.",
          "Informar gasto com data, estabelecimento e valor.",
          "Informar finalidade clara da despesa.",
          "Vincular OS quando aplicavel.",
          "Anexar foto ou comprovante.",
          "Testar camera pelo celular.",
          "Testar upload de imagem já salva.",
          "Conferir historico de prestacoes.",
          "Conferir pendencias exibidas para o colaborador.",
          "Testar regularizacao de pendencia apenas em ambiente controlado.",
          "Validar textos, mensagens e ausência de duvida operacional."
        ],
        checklistColaborador: [
          "Conseguiu acessar pelo celular.",
          "Entendeu o que deve lancar.",
          "Entendeu quando anexar comprovante.",
          "Entendeu como justificar gasto.",
          "Entendeu como vincular OS.",
          "Entendeu o que e pendencia.",
          "Entendeu prazo de regularizacao.",
          "Entendeu que cartão e corporativo.",
          "Entendeu que gasto sem comprovante pode gerar cobranca.",
          "Aprovou usabilidade mobile."
        ],
        checklistFinanceiro: [
          "Cartão cadastrado corretamente.",
          "Colaborador vinculado corretamente.",
          "Termo assinado.",
          "Limite/saldo inicial conferido.",
          "Prestacao recebida.",
          "Comprovante visivel.",
          "Extrato Flash importavel em pre-validação.",
          "Conciliacao aparece em previa.",
          "Pendencia aparece corretamente.",
          "Relatorio A4 gera corretamente.",
          "Dashboard reflete numeros corretamente.",
          "Nenhuma massa de teste misturada com operacao real."
        ],
        planoCadastroInicialControlado: [
          "Comecar com 1 a 3 colaboradores.",
          "Escolher colaboradores faceis de acompanhar.",
          "Validar por 3 a 7 dias.",
          "Expandir somente apos aprovacao.",
          "Registrar qualquer duvida operacional.",
          "Manter financeiro conferindo diariamente."
        ],
        planoTreinamentoRapido: [
          "Explicar objetivo do Flash.",
          "Explicar regra de comprovante.",
          "Mostrar lançamento pelo celular.",
          "Mostrar historico.",
          "Mostrar pendencia.",
          "Mostrar o que não pode ser lancado.",
          "Explicar prazo e responsabilidade.",
          "Confirmar entendimento do colaborador."
        ],
        planoGoLiveControlado: [
          "Fase 1: validação interna sem operacao ampla.",
          "Fase 2: piloto com poucos cartoes reais.",
          "Fase 3: conferencia diaria do financeiro.",
          "Fase 4: expansao gradual.",
          "Fase 5: fechamento mensal com relatorio."
        ],
        riscosBloqueiosGoLive: [
          "Colaborador não consegue anexar comprovante.",
          "Financeiro não consegue conferir.",
          "Relatorio A4 falha.",
          "Dashboard diverge.",
          "Pendencias não aparecem.",
          "Conciliacao apresenta inconsistencia.",
          "Dados de teste misturados com real.",
          "Termo não assinado.",
          "Cartão sem responsavel claro."
        ],
        auditoriaSomenteLeitura: auditoria,
        prontoParaValidacaoHumanaMobile: pronto,
        prontoParaPilotoControlado: pronto,
        bloqueios: bloqueios,
        avisos: avisos,
        proximasAcoesHumanas: [
          "Escolher colaborador piloto.",
          "Testar em celular real.",
          "Validar upload de comprovante.",
          "Financeiro conferir lançamento.",
          "Revisar relatorio A4.",
          "Decidir se libera piloto real controlado."
        ]
      });
    } catch (e) {
      return Object.assign(base, {
        success: false,
        ok: false,
        bloqueios: ["Falha na auditoria B46 somente leitura: " + e.message],
        avisos: [],
        prontoParaValidacaoHumanaMobile: false,
        prontoParaPilotoControlado: false,
        proximasAcoesHumanas: []
      });
    }
  }

  function VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR() {
    const base = {
      etapa: "B47",
      nome: "Validacao humana real em celular e liberacao tecnica para piloto Flash",
      success: true,
      ok: true,
      executado: false,
      somenteLeitura: true
    };
    try {
      const bloqueios = [];
      const avisos = [];
      const b46Implementada = typeof ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR === "function";
      const auditoriaB46 = b46Implementada ? ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR() : null;
      const auditoriaFin = finFlashB46AuditoriaReadOnly_();
      const funcoes = (auditoriaFin && auditoriaFin.funcoesPrincipaisFlash) || {};

      if (!b46Implementada) bloqueios.push("B46 não implementada.");
      if (!auditoriaB46 || auditoriaB46.executado !== false || auditoriaB46.somenteLeitura !== true) {
        bloqueios.push("B46 não retornou executado:false e somenteLeitura:true.");
      }
      if (auditoriaB46 && auditoriaB46.bloqueios && auditoriaB46.bloqueios.length) {
        bloqueios.push("B46 possui bloqueios pendentes: " + auditoriaB46.bloqueios.join(" "));
      }
      if (!funcoes.prestacaoMobile) bloqueios.push("Funcoes de prestacao mobile Flash indisponiveis.");
      if (!funcoes.pendenciasMobile) bloqueios.push("Funcoes de pendencia mobile Flash indisponiveis.");
      if (!funcoes.relatoriosA4) bloqueios.push("Relatorios A4 Flash indisponiveis.");
      if (!funcoes.dashboard) bloqueios.push("Dashboard Flash indisponivel.");
      if (!auditoriaFin.dbFinIdConfigurado) bloqueios.push("DB_FIN_ID não configurado.");
      if (!auditoriaFin.pastaDocumentosFinConfigurada) bloqueios.push("Pasta FIN não configurada.");
      if (auditoriaFin.bloqueios && auditoriaFin.bloqueios.length) {
        bloqueios.push("Auditoria FIN possui bloqueios: " + auditoriaFin.bloqueios.join(" "));
      }
      if (!auditoriaFin.separacaoMassaTesteOperacaoReal) {
        bloqueios.push("Separacao entre massa de teste e operacao real não validada.");
      }
      if (auditoriaB46 && auditoriaB46.avisos && auditoriaB46.avisos.length) {
        avisos.push.apply(avisos, auditoriaB46.avisos);
      }
      if (auditoriaFin && auditoriaFin.avisos && auditoriaFin.avisos.length) {
        avisos.push.apply(avisos, auditoriaFin.avisos);
      }

      const pronto = bloqueios.length === 0;
      return Object.assign(base, {
        prontoParaTesteHumanoReal: pronto,
        prontoParaPilotoFinanceiroControlado: pronto,
        auditoriaSomenteLeitura: {
          b46Implementada: b46Implementada,
          funcaoB46Existe: b46Implementada,
          b46ExecutadoFalse: !!(auditoriaB46 && auditoriaB46.executado === false),
          b46SomenteLeituraTrue: !!(auditoriaB46 && auditoriaB46.somenteLeitura === true),
          prestacaoMobileOk: !!funcoes.prestacaoMobile,
          pendenciaMobileOk: !!funcoes.pendenciasMobile,
          relatorioA4Ok: !!funcoes.relatoriosA4,
          dashboardFlashOk: !!funcoes.dashboard,
          dbFinIdConfigurado: !!auditoriaFin.dbFinIdConfigurado,
          pastaFinConfigurada: !!auditoriaFin.pastaDocumentosFinConfigurada,
          semBloqueiosConhecidos: pronto,
          separacaoMassaTesteOperacaoReal: !!auditoriaFin.separacaoMassaTesteOperacaoReal,
          nenhumaAcaoB47ExecutouGravacao: true
        },
        roteiroTesteHumanoReal: [
          "Abrir WebApp /dev no celular.",
          "Entrar no Financeiro / Prestacao Flash.",
          "Conferir se a tela abre corretamente em rede movel e Wi-Fi.",
          "Conferir se o colaborador piloto aparece corretamente.",
          "Fazer lançamento controlado de teste somente se houver ambiente seguro.",
          "Anexar foto tirada na hora.",
          "Anexar imagem existente da galeria.",
          "Conferir pre-visualizacao do comprovante.",
          "Conferir historico do lançamento.",
          "Conferir pendencias.",
          "Conferir regularizacao de pendencia somente se existir massa controlada.",
          "Validar mensagens de erro.",
          "Validar se o colaborador entende o que fazer sem ajuda."
        ],
        checklistColaborador: [
          "Conseguiu acessar pelo celular.",
          "Entendeu o botao correto para lancar gasto.",
          "Entendeu valor, finalidade e OS.",
          "Entendeu comprovante obrigatorio.",
          "Conseguiu anexar foto.",
          "Conseguiu ver historico.",
          "Entendeu pendencias.",
          "Entendeu que gasto sem comprovação pode ser cobrado.",
          "Confirmou que a tela e facil de usar."
        ],
        checklistFinanceiro: [
          "Conseguiu localizar o lançamento.",
          "Comprovante abriu corretamente.",
          "Valor ficou claro.",
          "Colaborador ficou claro.",
          "OS ficou clara quando informada.",
          "Historico ficou rastreavel.",
          "Pendencia ficou compreensivel.",
          "Relatorio A4 ficou legivel.",
          "Dashboard não apresentou divergencia.",
          "Massa de teste não misturou com operacao real."
        ],
        criteriosAprovacaoB47: [
          "success:true.",
          "ok:true.",
          "executado:false.",
          "somenteLeitura:true.",
          "bloqueios:[]",
          "prontoParaTesteHumanoReal:true.",
          "prontoParaPilotoFinanceiroControlado:true."
        ],
        riscosQueImpedemAvanco: [
          "Tela mobile não abre no celular real.",
          "Colaborador piloto não entende o fluxo sem ajuda.",
          "Comprovante não anexa pela camera.",
          "Imagem da galeria não faz upload.",
          "Financeiro não localiza o lançamento.",
          "Relatorio A4 fica ilegivel.",
          "Dashboard apresenta divergencia.",
          "Massa de teste se mistura com operacao real.",
          "Qualquer bloqueio B46 volta a aparecer."
        ],
        bloqueios: bloqueios,
        avisos: avisos
      });
    } catch (e) {
      return Object.assign(base, {
        success: false,
        ok: false,
        prontoParaTesteHumanoReal: false,
        prontoParaPilotoFinanceiroControlado: false,
        bloqueios: ["Falha na validação B47 somente leitura: " + e.message],
        avisos: []
      });
    }
  }

  function PREPARAR_PILOTO_REAL_FLASH_B48_SEM_GRAVAR() {
    const base = {
      etapa: "B48",
      nome: "Preparacao do piloto real controlado Flash com 1 colaborador",
      success: true,
      ok: true,
      executado: false,
      somenteLeitura: true
    };
    try {
      const bloqueios = [];
      const avisos = [];

      const b46Implementada = typeof ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR === "function";
      const b47Implementada = typeof VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR === "function";
      const auditoriaB46 = b46Implementada ? ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR() : null;
      const auditoriaB47 = b47Implementada ? VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR() : null;
      const auditoriaFin = finFlashB46AuditoriaReadOnly_();
      const funcoes = (auditoriaFin && auditoriaFin.funcoesPrincipaisFlash) || {};

      if (!b46Implementada) bloqueios.push("B46 não implementada.");
      if (!auditoriaB46 || auditoriaB46.executado !== false || auditoriaB46.somenteLeitura !== true) {
        bloqueios.push("B46 não retornou executado:false e somenteLeitura:true.");
      }
      if (auditoriaB46 && auditoriaB46.bloqueios && auditoriaB46.bloqueios.length) {
        bloqueios.push("B46 possui bloqueios: " + auditoriaB46.bloqueios.join(" "));
      }

      if (!b47Implementada) bloqueios.push("B47 não implementada.");
      if (!auditoriaB47 || auditoriaB47.executado !== false || auditoriaB47.somenteLeitura !== true) {
        bloqueios.push("B47 não retornou executado:false e somenteLeitura:true.");
      }
      if (auditoriaB47 && auditoriaB47.bloqueios && auditoriaB47.bloqueios.length) {
        bloqueios.push("B47 possui bloqueios: " + auditoriaB47.bloqueios.join(" "));
      }

      if (!auditoriaFin.dbFinIdConfigurado) bloqueios.push("DB_FIN_ID não configurado.");
      if (!auditoriaFin.pastaDocumentosFinConfigurada) avisos.push("Pasta FIN não configurada.");
      if (auditoriaFin.bloqueios && auditoriaFin.bloqueios.length) {
        bloqueios.push.apply(bloqueios, auditoriaFin.bloqueios);
      }
      if (auditoriaFin.avisos && auditoriaFin.avisos.length) {
        avisos.push.apply(avisos, auditoriaFin.avisos);
      }

      let termosAbaOk = false;
      let termosHeadersOk = false;
      const props = PropertiesService.getScriptProperties();
      const dbFinId = finSafeText_(props.getProperty("DB_FIN_ID"));
      if (dbFinId) {
        try {
          const ssTermos = SpreadsheetApp.openById(dbFinId);
          const shTermos = ssTermos.getSheetByName("FIN_CARTOES_TERMOS");
          termosAbaOk = !!shTermos;
          if (shTermos) {
            const lastCol = shTermos.getLastColumn();
            const hdrs = lastCol > 0
              ? shTermos.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return finSafeText_(h); })
              : [];
            const hEss = ["ID", "TERMO_ID", "CARTAO_ID", "STATUS"];
            termosHeadersOk = hEss.every(function(h) { return hdrs.indexOf(h) >= 0; });
            if (!termosHeadersOk) bloqueios.push("Headers essenciais ausentes em FIN_CARTOES_TERMOS.");
          } else {
            bloqueios.push("Aba FIN ausente: FIN_CARTOES_TERMOS.");
          }
        } catch (eT) {
          bloqueios.push("Erro ao verificar FIN_CARTOES_TERMOS: " + eT.message);
        }
      }

      if (!funcoes.prestacaoMobile) bloqueios.push("Funcoes de prestacao mobile indisponiveis.");
      if (!funcoes.pendenciasMobile) bloqueios.push("Funcoes de pendencia mobile indisponiveis.");

      const preValidacaoExtratoOk = typeof finPreviewExtratoFlashXlsxV1 === "function" &&
        typeof finDryRunLoteExtratoFlashV1 === "function" &&
        typeof finPreConfirmarLoteExtratoFlashV1 === "function";
      if (!preValidacaoExtratoOk) bloqueios.push("Funcoes de pre-validação de extrato Flash indisponiveis.");

      if (!funcoes.previaConciliacao) bloqueios.push("Funcao de previa de conciliacao indisponivel.");
      if (!funcoes.relatoriosA4) bloqueios.push("Relatorios A4 indisponiveis.");
      if (!funcoes.dashboard) bloqueios.push("Dashboard Flash indisponivel.");
      if (!auditoriaFin.separacaoMassaTesteOperacaoReal) {
        bloqueios.push("Separacao entre massa de teste e operacao real não validada.");
      }

      const abasInfo = auditoriaFin.abasFinPrincipais || {};
      function hOk_(nome) { return !!(abasInfo[nome] && abasInfo[nome].headersOk); }

      const pronto = bloqueios.length === 0;
      return Object.assign(base, {
        prontoParaSelecionarColaboradorPiloto: pronto,
        prontoParaCadastroControladoCartao: pronto,
        prontoParaTestePrestacaoRealControlada: pronto,
        prontoParaLiberacaoPilotoReal: false,
        auditoriaSomenteLeitura: {
          b46Implementada: b46Implementada,
          b47Implementada: b47Implementada,
          funcaoB46Existe: b46Implementada,
          funcaoB47Existe: b47Implementada,
          b46ExecutadoFalse: !!(auditoriaB46 && auditoriaB46.executado === false),
          b46SomenteLeituraTrue: !!(auditoriaB46 && auditoriaB46.somenteLeitura === true),
          b47ExecutadoFalse: !!(auditoriaB47 && auditoriaB47.executado === false),
          b47SomenteLeituraTrue: !!(auditoriaB47 && auditoriaB47.somenteLeitura === true),
          dbFinIdConfigurado: !!auditoriaFin.dbFinIdConfigurado,
          pastaFinConfigurada: !!auditoriaFin.pastaDocumentosFinConfigurada,
          headersEssenciaisAbas: {
            FIN_CARTOES: hOk_(ABAS.CARTOES),
            FIN_CARTOES_TERMOS: termosHeadersOk,
            FIN_CARTOES_LANCAMENTOS: hOk_(ABAS.LANCAMENTOS),
            FIN_CARTOES_PENDENCIAS: hOk_(ABAS.PENDENCIAS),
            FIN_CARTOES_EXTRATOS: hOk_(ABAS.EXTRATOS),
            FIN_LOTES_EXTRATO_FLASH: hOk_(ABAS.LOTES_EXTRATO_FLASH),
            FIN_CARTOES_CONCILIACAO: hOk_(ABAS.CONCILIACAO)
          },
          prestacaoMobileOk: !!funcoes.prestacaoMobile,
          pendenciaMobileOk: !!funcoes.pendenciasMobile,
          preValidacaoExtratoOk: preValidacaoExtratoOk,
          previaConciliacaoOk: !!funcoes.previaConciliacao,
          relatorioA4Ok: !!funcoes.relatoriosA4,
          dashboardFlashOk: !!funcoes.dashboard,
          separacaoMassaTesteOperacaoReal: !!auditoriaFin.separacaoMassaTesteOperacaoReal,
          nenhumaAcaoB48ExecutouGravacao: true
        },
        planoPilotoControlado: {
          quantidadeMaximaColaboradores: 1,
          duracaoSugeridaDias: "3 a 7",
          acompanhamentoFinanceiro: "diario",
          escopoPermitido: [
            "Cadastro controlado de 1 cartao",
            "Termo assinado",
            "1 a 5 lançamentos reais acompanhados",
            "Conferencia diaria pelo financeiro",
            "Relatorio A4 de conferencia"
          ],
          escopoProibido: [
            "Expansao para varios colaboradores",
            "Importacao em massa sem autorizacao",
            "Conciliacao em massa sem autorizacao",
            "Geracao de pendencias em massa sem autorizacao",
            "Alteracao automatica de saldo"
          ]
        },
        criteriosParaEscolherColaboradorPiloto: [
          "Colaborador com boa comunicacao",
          "Usa celular com camera funcionando",
          "Consegue acessar o WebApp",
          "Entende regra de comprovante",
          "Aceita testar com acompanhamento",
          "Financeiro consegue acompanhar diariamente",
          "Nao comecar com colaborador de alto volume de gasto"
        ],
        checklistAntesDoPilotoReal: [
          "Colaborador piloto definido",
          "Cartão real identificado",
          "Termo assinado",
          "Financeiro responsavel definido",
          "Saldo/limite conferido fora do sistema",
          "Canal de suporte definido",
          "Primeiro lançamento acompanhado",
          "Relatorio A4 revisado",
          "Dashboard conferido",
          "Plano de reversao definido"
        ],
        planoReversao: [
          "Pausar piloto",
          "Bloquear novos lançamentos do piloto, se necessario",
          "Conferir manualmente gastos já feitos",
          "Exportar relatorio A4",
          "Registrar divergencias",
          "Nao expandir para outros colaboradores ate correcao"
        ],
        bloqueios: bloqueios,
        avisos: avisos
      });
    } catch (e) {
      return Object.assign(base, {
        success: false,
        ok: false,
        prontoParaSelecionarColaboradorPiloto: false,
        prontoParaCadastroControladoCartao: false,
        prontoParaTestePrestacaoRealControlada: false,
        prontoParaLiberacaoPilotoReal: false,
        bloqueios: ["Falha na preparacao do piloto B48 somente leitura: " + e.message],
        avisos: []
      });
    }
  }

  function LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA() {
    return {
      etapa: "B48",
      success: false,
      ok: false,
      executado: false,
      bloqueado: true,
      motivo: "Liberacao real do piloto exige etapa posterior com autorizacao explicita."
    };
  }

  // ============================================================
  // B54 — GRAVACAO REAL CONTROLADA — PILOTO FLASH MOBILE
  // ============================================================

  function finFlashRegistrarPrestacaoMobilePilotoV1(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "registrar prestacao Flash piloto mobile");
      finDbOk_();

      const props = PropertiesService.getScriptProperties();
      const pilotoEmail = finSafeText_(props.getProperty("FIN_PILOTO_FLASH_EMAIL"));
      if (!pilotoEmail) {
        return finErro_("Envio de prestacao Flash não habilitado. Configure FIN_PILOTO_FLASH_EMAIL.");
      }
      const emailsPermitidos = pilotoEmail.split(",").map(function(e) { return e.trim().toLowerCase(); });
      const emailUsuario = finSafeText_(sessao.usuario || sessao.email || sessao.userId || "").toLowerCase();
      if (!emailUsuario || emailsPermitidos.indexOf(emailUsuario) < 0) {
        return finErro_("Envio de prestacao Flash restrito ao piloto autorizado. Aguarde habilitacao.");
      }

      const p = payload || {};
      const valor = Math.abs(finSafeNumber_(p.valor || p.VALOR));
      const dataGasto = finSafeText_(p.dataGasto || p.DATA_GASTO);
      const finalidade = finSafeText_(p.finalidade || p.DESCRICAO_GASTO);
      const tipoGasto = finSafeText_(p.tipoGasto || p.CATEGORIA_GASTO);
      const osNumero = finSafeText_(p.osNumero || p.OS_NUMERO);
      const local = finSafeText_(p.local || p.ESTABELECIMENTO);
      const observacoes = finSafeText_(p.observacoes || p.OBSERVACOES);

      const erros = [];
      if (valor <= 0) erros.push("Valor obrigatorio e deve ser maior que zero.");
      if (!dataGasto) erros.push("Data do gasto obrigatoria.");
      if (finalidade.length < 5) erros.push("Finalidade/descricao obrigatoria (minimo 5 caracteres).");
      if (erros.length) return finErro_(erros.join(" "));

      const u = finUsuario_(sessao);
      const cartao = finAll_(ABAS.CARTOES).find(function(c) {
        return finSafeText_(c.FUNCIONARIO_ID) === u.id &&
               finSafeUpper_(c.STATUS_CARTAO) === "ATIVO";
      }) || null;
      const cartaoId = cartao ? finSafeText_(cartao.CARTAO_ID || cartao.ID) : "";
      if (!cartaoId) {
        return finErro_("Nenhum cartão Flash ativo encontrado para este colaborador. Contate o financeiro.");
      }

      const umaHoraAtras = new Date(Date.now() - 3600000).toISOString();
      const duplicata = finAll_(ABAS.LANCAMENTOS).find(function(r) {
        return finSafeText_(r.FUNCIONARIO_ID) === u.id &&
               finSafeText_(r.DATA_GASTO) === dataGasto &&
               Math.abs(finSafeNumber_(r.VALOR) - valor) < 0.01 &&
               finSafeText_(r.DESCRICAO_GASTO) === finalidade &&
               finSafeText_(r.CRIADO_EM) >= umaHoraAtras;
      });
      if (duplicata) {
        return finErro_("Possivel envio duplicado detectado. Verifique seus lançamentos antes de reenviar.");
      }

      const temOs = osNumero ? "SIM" : "NAO";
      const agora = finNow_();
      const lancamentoId = finGerarId_("LAN");

      const registro = {
        ID                   : finUuid_(),
        LANCAMENTO_ID        : lancamentoId,
        CARTAO_ID            : cartaoId,
        FUNCIONARIO_ID       : u.id,
        FUNCIONARIO_NOME     : u.nome,
        DATA_GASTO           : dataGasto,
        HORA_GASTO           : "",
        VALOR                : valor,
        ESTABELECIMENTO      : local,
        CATEGORIA_GASTO      : tipoGasto,
        OS_ID                : "",
        OS_NUMERO            : osNumero,
        TEM_OS               : temOs,
        JUSTIFICATIVA_SEM_OS : osNumero ? "" : finalidade,
        LATITUDE             : "",
        LONGITUDE            : "",
        LOCALIZACAO_TEXTO    : local,
        ENDERECO_APROXIMADO  : "",
        COMPROVANTE_OK       : "NAO",
        COMPROVANTE_FILE_ID  : "",
        COMPROVANTE_LINK     : "",
        TIPO_COMPROVANTE     : "",
        DESCRICAO_GASTO      : finalidade,
        OBSERVACOES          : observacoes,
        STATUS_PRESTACAO     : STATUS_PRESTACAO.PENDENTE_COMPROVANTE,
        DATA_APROVACAO       : "",
        APROVADO_POR         : "",
        MOTIVO_REJEICAO      : "",
        CONCILIADO           : "NAO",
        LANCAMENTO_EXTRATO_ID: "",
        DIVERGENCIA_TIPO     : "",
        DIVERGENCIA_VALOR    : "",
        STATUS               : "ATIVO",
        CRIADO_EM            : agora,
        CRIADO_POR           : "MOBILE_CAMPO_PILOTO_B54",
        ATUALIZADO_EM        : agora,
        ATUALIZADO_POR       : "MOBILE_CAMPO_PILOTO_B54"
      };

      finInsert_(ABAS.LANCAMENTOS, registro);
      finLog_(sessao, "PRESTACAO_FLASH_MOBILE_PILOTO_B54", "LANCAMENTO", lancamentoId, null, registro, "OK",
        "Prestacao Flash mobile piloto B54. R$ " + valor + " em " + dataGasto + ".");

      return finOk_({
        executado      : true,
        lancamentoId   : lancamentoId,
        id             : registro.ID,
        statusPrestacao: registro.STATUS_PRESTACAO,
        valor          : valor,
        dataGasto      : dataGasto,
        finalidade     : finalidade,
        colaborador    : u.nome,
        cartaoId       : cartaoId,
        avisos         : ["Comprovante pendente — anexar na proxima etapa."],
        origem         : "MOBILE_CAMPO_PILOTO_B54"
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR() {
    const base = {
      etapa: "B54",
      nome: "Auditoria pre-gravacao real da prestacao Flash mobile piloto",
      executado: false,
      somenteLeitura: true,
      success: true,
      ok: true
    };
    try {
      const bloqueios = [];
      const avisos = [];

      const funcaoExiste = typeof finFlashRegistrarPrestacaoMobilePilotoV1 === "function";
      if (!funcaoExiste) bloqueios.push("finFlashRegistrarPrestacaoMobilePilotoV1 não encontrada.");

      let dbConfigurado = false;
      try {
        const dbId = finSafeText_(PropertiesService.getScriptProperties().getProperty("DB_FIN_ID"));
        dbConfigurado = !!dbId;
        if (!dbConfigurado) bloqueios.push("DB_FIN_ID não configurado.");
      } catch (eDb) {
        bloqueios.push("Erro ao verificar DB_FIN_ID: " + eDb.message);
      }

      let pilotoConfigurado = false;
      let pilotoEmail = "";
      try {
        pilotoEmail = finSafeText_(PropertiesService.getScriptProperties().getProperty("FIN_PILOTO_FLASH_EMAIL"));
        pilotoConfigurado = !!pilotoEmail;
        if (!pilotoConfigurado) avisos.push("FIN_PILOTO_FLASH_EMAIL não configurado — funcao bloqueara ate configurar.");
        else avisos.push("Piloto configurado: " + pilotoEmail);
      } catch (ePiloto) {
        bloqueios.push("Erro ao verificar FIN_PILOTO_FLASH_EMAIL: " + ePiloto.message);
      }

      let abaDestinoOk = false;
      let headersEssenciaisOk = false;
      const headersEsperados = ["ID", "LANCAMENTO_ID", "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
        "DATA_GASTO", "VALOR", "DESCRICAO_GASTO", "STATUS_PRESTACAO", "CRIADO_EM", "CRIADO_POR"];
      let headersAusentes = [];
      if (dbConfigurado) {
        try {
          const hdrs = finHeaders_(ABAS.LANCAMENTOS);
          abaDestinoOk = true;
          headersAusentes = headersEsperados.filter(function(h) { return hdrs.indexOf(h) < 0; });
          headersEssenciaisOk = headersAusentes.length === 0;
          if (!headersEssenciaisOk) {
            bloqueios.push("Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + headersAusentes.join(", "));
          }
        } catch (eAba) {
          bloqueios.push("Erro ao verificar FIN_CARTOES_LANCAMENTOS: " + eAba.message);
        }
      }

      const liberarTeste = typeof LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA === "function"
        ? LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA() : null;
      const liberarBloqueada = !liberarTeste || liberarTeste.bloqueado === true;
      if (!liberarBloqueada) bloqueios.push("LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA retornou estado inesperado.");

      const pronto = bloqueios.length === 0;
      return Object.assign(base, {
        prontoParaGravacaoRealPiloto: pronto,
        verificacoes: {
          funcaoBackendExiste   : funcaoExiste,
          dbConfigurado         : dbConfigurado,
          pilotoConfigurado     : pilotoConfigurado,
          pilotoEmail           : pilotoEmail,
          abaDestino            : ABAS.LANCAMENTOS,
          abaDestinoOk          : abaDestinoOk,
          headersEssenciaisOk   : headersEssenciaisOk,
          headersAusentes       : headersAusentes,
          liberarPilotoBloqueada: liberarBloqueada,
          conciliacaoHabilitada : false,
          pendenciasHabilitadas : false,
          importacaoHabilitada  : false,
          whatsappHabilitado    : false
        },
        bloqueios: bloqueios,
        avisos: avisos
      });
    } catch (e) {
      return Object.assign(base, {
        success: false,
        ok: false,
        prontoParaGravacaoRealPiloto: false,
        bloqueios: ["Falha na auditoria B54: " + e.message],
        avisos: []
      });
    }
  }

  function CONFIGURAR_E_AUDITAR_PILOTO_B54_1() {
    const base = {
      etapa: "B54.1",
      nome: "Configurar piloto Flash DEV e auditar sem gravar",
      executado: false,
      somenteLeitura: false,
      success: true,
      ok: true
    };
    try {
      const bloqueios = [];
      const avisos = [];
      const props = PropertiesService.getScriptProperties();

      // 1. Banco principal
      const dbPrincipalId = finSafeText_(props.getProperty("DB_ID"));
      if (!dbPrincipalId) {
        bloqueios.push("DB_ID (banco principal) não configurado.");
        return Object.assign(base, { prontoParaGravacaoRealPiloto: false, bloqueios: bloqueios, avisos: avisos });
      }

      // 2. Ler CAD_USUARIOS — buscar "thiago" por nome ou login
      const candidatos = [];
      try {
        const ssPrincipal = SpreadsheetApp.openById(dbPrincipalId);
        const shUsers = ssPrincipal.getSheetByName("CAD_USUARIOS");
        if (!shUsers) {
          bloqueios.push("Aba CAD_USUARIOS não encontrada no banco principal.");
        } else {
          const lastRow = shUsers.getLastRow();
          const lastCol = shUsers.getLastColumn();
          if (lastRow >= 2 && lastCol >= 1) {
            const dados = shUsers.getRange(1, 1, lastRow, lastCol).getValues();
            const hdrs = dados[0].map(function(h) { return finSafeText_(h).toUpperCase(); });
            const iID     = hdrs.indexOf("ID");
            const iUSU    = hdrs.indexOf("USUARIO");
            const iNOME   = hdrs.indexOf("NOME");
            const iPERFIL = hdrs.indexOf("PERFIL");
            const iSTATUS = hdrs.indexOf("STATUS");
            for (let i = 1; i < dados.length; i++) {
              const row = dados[i];
              const nome  = finSafeText_(iNOME   >= 0 ? row[iNOME]   : "").toUpperCase();
              const login = finSafeText_(iUSU    >= 0 ? row[iUSU]    : "").toLowerCase();
              if (nome.indexOf("THIAGO") >= 0 || login.indexOf("thiago") >= 0) {
                candidatos.push({
                  id    : finSafeText_(iID     >= 0 ? row[iID]     : ""),
                  login : login,
                  nome  : nome,
                  perfil: finSafeText_(iPERFIL >= 0 ? row[iPERFIL] : ""),
                  status: finSafeText_(iSTATUS >= 0 ? row[iSTATUS] : "")
                });
              }
            }
          }
          if (candidatos.length === 0) {
            bloqueios.push("Nenhum usuario com NOME ou LOGIN contendo 'thiago' encontrado em CAD_USUARIOS.");
          }
        }
      } catch (eUsers) {
        bloqueios.push("Erro ao ler CAD_USUARIOS: " + eUsers.message);
      }

      // 3. Verificar cartão ativo em FIN_CARTOES para cada candidato
      const cartoesInfo = [];
      if (candidatos.length > 0) {
        try {
          const cartoes = finAll_(ABAS.CARTOES);
          candidatos.forEach(function(c) {
            const cartaoAtivo = cartoes.find(function(cartao) {
              return finSafeText_(cartao.FUNCIONARIO_ID) === c.id &&
                     finSafeUpper_(cartao.STATUS_CARTAO) === "ATIVO";
            }) || null;
            cartoesInfo.push({
              userId           : c.id,
              userLogin        : c.login,
              userNome         : c.nome,
              userPerfil       : c.perfil,
              userStatus       : c.status,
              temCartaoAtivo   : !!cartaoAtivo,
              cartaoId         : cartaoAtivo ? finSafeText_(cartaoAtivo.CARTAO_ID || cartaoAtivo.ID) : "",
              funcionarioEmail : cartaoAtivo ? finSafeText_(cartaoAtivo.FUNCIONARIO_EMAIL) : ""
            });
          });
        } catch (eFin) {
          bloqueios.push("Erro ao verificar FIN_CARTOES: " + eFin.message);
        }
      }

      // 4. Selecionar piloto
      const candidatosComCartao = cartoesInfo.filter(function(c) { return c.temCartaoAtivo; });
      let piloto = null;
      if (candidatosComCartao.length === 0 && bloqueios.length === 0) {
        bloqueios.push("Nenhum usuario Thiago possui cartão Flash ATIVO em FIN_CARTOES. Cadastre o cartão antes de continuar.");
      } else if (candidatosComCartao.length > 1) {
        avisos.push("Mais de um candidato com cartão ativo. Usando o primeiro encontrado.");
        piloto = candidatosComCartao[0];
      } else if (candidatosComCartao.length === 1) {
        piloto = candidatosComCartao[0];
      }

      // 5. Configurar FIN_PILOTO_FLASH_EMAIL
      let propertyConfigurada = false;
      let pilotoLoginConfigurado = "";
      if (piloto && bloqueios.length === 0) {
        pilotoLoginConfigurado = piloto.userLogin;
        props.setProperty("FIN_PILOTO_FLASH_EMAIL", pilotoLoginConfigurado);
        propertyConfigurada = true;
        avisos.push("FIN_PILOTO_FLASH_EMAIL configurado como: " + pilotoLoginConfigurado);
      } else {
        pilotoLoginConfigurado = finSafeText_(props.getProperty("FIN_PILOTO_FLASH_EMAIL"));
        if (pilotoLoginConfigurado) avisos.push("FIN_PILOTO_FLASH_EMAIL já existia: " + pilotoLoginConfigurado);
      }

      // 6. Rodar auditoria
      const auditoria = AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR();
      if (auditoria.bloqueios && auditoria.bloqueios.length) {
        bloqueios.push.apply(bloqueios, auditoria.bloqueios);
      }

      const pronto = bloqueios.length === 0 && auditoria.prontoParaGravacaoRealPiloto === true;

      return Object.assign(base, {
        prontoParaGravacaoRealPiloto: pronto,
        piloto: piloto ? {
          login                   : piloto.userLogin,
          nome                    : piloto.userNome,
          perfil                  : piloto.userPerfil,
          status                  : piloto.userStatus,
          userIdMascarado         : piloto.userId.length > 8 ? piloto.userId.substring(0, 8) + "..." : piloto.userId,
          cartaoAtivoEncontrado   : piloto.temCartaoAtivo,
          cartaoIdMascarado       : piloto.cartaoId.length > 8 ? piloto.cartaoId.substring(0, 8) + "..." : piloto.cartaoId,
          funcionarioEmailPreenchido: !!(piloto.funcionarioEmail),
          funcionarioEmail        : piloto.funcionarioEmail ? piloto.funcionarioEmail.substring(0, 4) + "***" : ""
        } : null,
        todosCandidatos: cartoesInfo.map(function(c) {
          return { login: c.userLogin, nome: c.userNome, perfil: c.userPerfil, status: c.userStatus, temCartaoAtivo: c.temCartaoAtivo };
        }),
        propertyConfigurada      : propertyConfigurada,
        pilotoLoginConfigurado   : pilotoLoginConfigurado,
        auditoria                : auditoria,
        bloqueios                : bloqueios,
        avisos                   : avisos
      });
    } catch (e) {
      return Object.assign(base, {
        success: false,
        ok: false,
        prontoParaGravacaoRealPiloto: false,
        bloqueios: ["Falha em CONFIGURAR_E_AUDITAR_PILOTO_B54_1: " + e.message],
        avisos: []
      });
    }
  }

  function finFlashConciliarSelecionadosTela(sessionId, payload, confirmacao) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "conciliar Flash pela tela");
      if (confirmacao !== "CONCILIAR_FLASH_TELA_FIN_D") {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: false,
          bloqueios: ["Trava textual obrigatoria invalida ou ausente para conciliar Flash pela tela."],
          avisos: []
        };
      }
      return {
        ok: false,
        success: false,
        executado: false,
        autorizado: true,
        bloqueios: [],
        avisos: ["Acao real ainda não habilitada neste pacote."]
      };
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashGerarPendenciasTela(sessionId, confirmacao) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "gerar pendencias Flash pela tela");
      if (confirmacao !== "GERAR_PENDENCIAS_FLASH_TELA_FIN_D") {
        return {
          ok: false,
          success: false,
          executado: false,
          autorizado: false,
          bloqueios: ["Trava textual obrigatoria invalida ou ausente para gerar pendencias Flash pela tela."],
          avisos: []
        };
      }
      return {
        ok: false,
        success: false,
        executado: false,
        autorizado: true,
        bloqueios: [],
        avisos: ["Acao real ainda não habilitada neste pacote."]
      };
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function flashListarLotes(sessionId, filtros) {
    try {
      return finFlashListar_(sessionId, ABAS.LOTES_EXTRATO_FLASH, filtros);
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function flashListarExtratos(sessionId, filtros) {
    try {
      return finFlashListar_(sessionId, ABAS.EXTRATOS, filtros);
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function flashListarPendencias(sessionId, filtros) {
    try {
      return finFlashListar_(sessionId, ABAS.PENDENCIAS, filtros);
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function flashListarConciliacoes(sessionId, filtros) {
    try {
      return finFlashListar_(sessionId, ABAS.CONCILIACAO, filtros);
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FLASH B45 - PRESTACAO PUBLICA E RELATORIOS A4
  // ============================================================

  function finFlashTokenPrestacao_(token) {
    const alvo = finSafeText_(token);
    if (!alvo || alvo.length < 20) return null;
    const termos = finAll_("FIN_CARTOES_TERMOS");
    const termo = termos.find(function(t) {
      return finSafeText_(t.TOKEN_VALIDACAO) === alvo && finSafeUpper_(t.STATUS) !== "CANCELADO";
    });
    if (!termo) return null;
    const cartao = finAll_(ABAS.CARTOES).find(function(c) {
      return finSafeText_(c.CARTAO_ID || c.ID) === finSafeText_(termo.CARTAO_ID);
    }) || {};
    const funcionarioId = finSafeText_(termo.FUNCIONARIO_ID || cartao.FUNCIONARIO_ID);
    return {
      token: alvo,
      termo: termo,
      cartao: cartao,
      cartaoId: finSafeText_(termo.CARTAO_ID || cartao.CARTAO_ID || cartao.ID),
      funcionarioId: funcionarioId,
      funcionarioNome: finSafeText_(termo.FUNCIONARIO_NOME || cartao.FUNCIONARIO_NOME)
    };
  }

  function finFlashPrestacaoFiltroColaborador_(ctx, lista) {
    return (lista || []).filter(function(r) {
      const mesmoFuncionario = ctx.funcionarioId && finSafeText_(r.FUNCIONARIO_ID) === ctx.funcionarioId;
      const mesmoCartao = ctx.cartaoId && finSafeText_(r.CARTAO_ID) === ctx.cartaoId;
      return mesmoFuncionario || mesmoCartao;
    });
  }

  function finFlashPrestacaoItemPublico_(r) {
    return {
      id: finFlashTelaValor_(r.ID),
      lancamentoId: finFlashTelaValor_(r.LANCAMENTO_ID),
      cartaoId: finFlashTelaValor_(r.CARTAO_ID),
      dataGasto: finFlashTelaValor_(r.DATA_GASTO),
      horaGasto: finFlashTelaValor_(r.HORA_GASTO),
      valor: finSafeNumber_(r.VALOR),
      estabelecimento: finFlashTelaValor_(r.ESTABELECIMENTO),
      categoriaGasto: finFlashTelaValor_(r.CATEGORIA_GASTO),
      osId: finFlashTelaValor_(r.OS_ID),
      osNumero: finFlashTelaValor_(r.OS_NUMERO),
      temOs: finFlashTelaValor_(r.TEM_OS),
      justificativaSemOs: finFlashTelaValor_(r.JUSTIFICATIVA_SEM_OS),
      comprovanteOk: finFlashTelaValor_(r.COMPROVANTE_OK),
      comprovanteLink: finFlashTelaValor_(r.COMPROVANTE_LINK),
      tipoComprovante: finFlashTelaValor_(r.TIPO_COMPROVANTE),
      descricaoGasto: finFlashTelaValor_(r.DESCRICAO_GASTO),
      observacoes: finFlashTelaValor_(r.OBSERVACOES),
      statusPrestacao: finFlashTelaValor_(r.STATUS_PRESTACAO),
      motivoRejeicao: finFlashTelaValor_(r.MOTIVO_REJEICAO),
      conciliado: finFlashTelaValor_(r.CONCILIADO),
      atualizadoEm: finFlashTelaValor_(r.ATUALIZADO_EM)
    };
  }

  function finFlashPendenciaPublica_(p) {
    return {
      id: finFlashTelaValor_(p.ID),
      pendenciaId: finFlashTelaValor_(p.PENDENCIA_ID),
      tipoPendencia: finFlashTelaValor_(p.TIPO_PENDENCIA),
      lancamentoId: finFlashTelaValor_(p.LANCAMENTO_ID),
      extratoId: finFlashTelaValor_(p.EXTRATO_ID),
      descricaoPendencia: finFlashTelaValor_(p.DESCRICAO_PENDENCIA),
      valorEnvolvido: finSafeNumber_(p.VALOR_ENVOLVIDO),
      dataLimiteEsclarecimento: finFlashTelaValor_(p.DATA_LIMITE_ESCLARECIMENTO),
      esclarecimentoTexto: finFlashTelaValor_(p.ESCLARECIMENTO_TEXTO),
      resolucaoDescricao: finFlashTelaValor_(p.RESOLUCAO_DESCRICAO),
      status: finFlashTelaValor_(p.STATUS)
    };
  }

  function finFlashPrestacaoContextoPublico_(token) {
    finDbOk_();
    const ctx = finFlashTokenPrestacao_(token);
    if (!ctx) return finErro_("Token de prestacao Flash invalido ou não localizado.");
    const lancamentos = finFlashPrestacaoFiltroColaborador_(ctx, finAll_(ABAS.LANCAMENTOS));
    const pendencias = finFlashPrestacaoFiltroColaborador_(ctx, finAll_(ABAS.PENDENCIAS));
    const abertos = lancamentos.filter(function(r) {
      const s = finSafeUpper_(r.STATUS_PRESTACAO);
      return s === STATUS_PRESTACAO.PENDENTE_COMPROVANTE ||
        s === STATUS_PRESTACAO.PENDENTE_JUSTIFICATIVA ||
        s === STATUS_PRESTACAO.REPROVADO ||
        !s;
    });
    return finOk_({
      colaborador: {
        funcionarioId: ctx.funcionarioId,
        funcionarioNome: ctx.funcionarioNome,
        cartaoId: ctx.cartaoId,
        cartaoFinal: finFlashTelaValor_(ctx.cartao.NUMERO_FINAL_4 || ctx.cartao.CARTAO_FINAL)
      },
      resumo: {
        totalPrestacoes: lancamentos.length,
        abertas: abertos.length,
        enviadas: lancamentos.filter(function(r) { return finSafeUpper_(r.STATUS_PRESTACAO) === STATUS_PRESTACAO.ENVIADO; }).length,
        aprovadas: lancamentos.filter(function(r) { return finSafeUpper_(r.STATUS_PRESTACAO) === STATUS_PRESTACAO.APROVADO; }).length,
        pendencias: pendencias.filter(finFlashPendenciaAberta_).length
      },
      prestacoes: lancamentos.slice().reverse().slice(0, 50).map(finFlashPrestacaoItemPublico_),
      pendencias: pendencias.slice().reverse().slice(0, 50).map(finFlashPendenciaPublica_),
      tokenOk: true
    });
  }

  function finFlashSalvarArquivoPrestacao_(arquivo, nomeBase) {
    const a = arquivo || {};
    const dataUrl = finSafeText_(a.dataUrl || a.base64 || a.conteudoBase64);
    if (!dataUrl) return null;
    const mime = finSafeText_(a.mimeType) || "application/octet-stream";
    const nome = finSafeText_(a.nomeArquivo || a.name) || (nomeBase + ".bin");
    const base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",").pop() : dataUrl;
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mime, nome);
    const folderId = finSafeText_(
      PropertiesService.getScriptProperties().getProperty("FOLDER_FINANCEIRO") ||
      PropertiesService.getScriptProperties().getProperty("FOLDER_FINANCEIRO_ID") ||
      (typeof sgoGetCfgSafe_() !== "undefined" && sgoGetCfgSafe_().DRIVE && sgoGetCfgSafe_().DRIVE.FOLDER_FINANCEIRO)
    );
    const file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
    return {
      fileId: file.getId(),
      link: file.getUrl(),
      nomeArquivo: nome,
      mimeType: mime,
      tamanhoBytes: bytes.length
    };
  }

  function finFlashEnviarPrestacaoPublicaV1(payload) {
    try {
      const p = payload || {};
      const ctx = finFlashTokenPrestacao_(p.token);
      if (!ctx) return finErro_("Token de prestacao Flash invalido ou não localizado.");
      const valor = Math.abs(finSafeNumber_(p.valor || p.VALOR));
      const data = finSafeText_(p.dataGasto || p.DATA_GASTO);
      const finalidade = finSafeText_(p.finalidade || p.descricaoGasto || p.DESCRICAO_GASTO);
      const temOs = finSafeUpper_(p.temOs || p.TEM_OS) === "SIM" ? "SIM" : "NAO";
      const osNumero = finSafeText_(p.osNumero || p.OS_NUMERO);
      const justificativaSemOs = finSafeText_(p.justificativaSemOs || p.JUSTIFICATIVA_SEM_OS);
      const bloqueios = [];
      if (!data) bloqueios.push("DATA_GASTO_OBRIGATORIA");
      if (!valor) bloqueios.push("VALOR_OBRIGATORIO");
      if (finalidade.length < 5) bloqueios.push("FINALIDADE_OBRIGATORIA_MIN_5");
      if (temOs === "SIM" && !osNumero) bloqueios.push("OS_NUMERO_OBRIGATORIO");
      if (temOs !== "SIM" && justificativaSemOs.length < 5) bloqueios.push("JUSTIFICATIVA_SEM_OS_OBRIGATORIA");
      if (!p.arquivo || !(p.arquivo.dataUrl || p.arquivo.base64 || p.arquivo.conteudoBase64)) bloqueios.push("COMPROVANTE_OBRIGATORIO");
      if (bloqueios.length) return finErro_("Prestacao incompleta.", { bloqueios: bloqueios });

      const agora = finNow_();
      const lancamentoId = finGerarId_("LAN");
      const arquivo = finFlashSalvarArquivoPrestacao_(p.arquivo, "comprovante_flash_" + lancamentoId);
      const registro = {
        ID: finUuid_(),
        LANCAMENTO_ID: lancamentoId,
        CARTAO_ID: ctx.cartaoId,
        FUNCIONARIO_ID: ctx.funcionarioId,
        FUNCIONARIO_NOME: ctx.funcionarioNome,
        DATA_GASTO: data,
        HORA_GASTO: finSafeText_(p.horaGasto || p.HORA_GASTO),
        VALOR: valor,
        ESTABELECIMENTO: finSafeText_(p.estabelecimento || p.ESTABELECIMENTO),
        CATEGORIA_GASTO: finSafeText_(p.categoriaGasto || p.CATEGORIA_GASTO),
        OS_ID: finSafeText_(p.osId || p.OS_ID),
        OS_NUMERO: osNumero,
        TEM_OS: temOs,
        JUSTIFICATIVA_SEM_OS: justificativaSemOs,
        LATITUDE: finSafeText_(p.latitude || p.LATITUDE),
        LONGITUDE: finSafeText_(p.longitude || p.LONGITUDE),
        LOCALIZACAO_TEXTO: finSafeText_(p.localizacaoTexto || p.LOCALIZACAO_TEXTO),
        ENDERECO_APROXIMADO: finSafeText_(p.enderecoAproximado || p.ENDERECO_APROXIMADO),
        COMPROVANTE_OK: "SIM",
        COMPROVANTE_FILE_ID: arquivo.fileId,
        COMPROVANTE_LINK: arquivo.link,
        TIPO_COMPROVANTE: finSafeText_(p.tipoComprovante || arquivo.mimeType),
        DESCRICAO_GASTO: finalidade,
        OBSERVACOES: finSafeText_(p.observacoes || p.OBSERVACOES),
        STATUS_PRESTACAO: STATUS_PRESTACAO.ENVIADO,
        CONCILIADO: "NAO",
        STATUS: "ATIVO",
        CRIADO_EM: agora,
        CRIADO_POR: "PRESTACAO_PUBLICA_FLASH_B45",
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: "PRESTACAO_PUBLICA_FLASH_B45"
      };
      finInsert_(ABAS.LANCAMENTOS, registro);
      finInsert_(ABAS.ANEXOS, {
        ID: finUuid_(),
        ANEXO_ID: finGerarId_("ANX"),
        LANCAMENTO_ID: lancamentoId,
        CARTAO_ID: ctx.cartaoId,
        FUNCIONARIO_ID: ctx.funcionarioId,
        TIPO_ANEXO: "COMPROVANTE_PRESTACAO_FLASH",
        NOME_ARQUIVO: arquivo.nomeArquivo,
        FILE_ID: arquivo.fileId,
        LINK_ARQUIVO: arquivo.link,
        MIME_TYPE: arquivo.mimeType,
        TAMANHO_BYTES: arquivo.tamanhoBytes,
        DESCRICAO: finalidade,
        ORIGEM: "PRESTACAO_PUBLICA_FLASH_B45",
        DATA_UPLOAD: agora,
        STATUS: "ATIVO",
        CRIADO_EM: agora,
        CRIADO_POR: "PRESTACAO_PUBLICA_FLASH_B45"
      });
      finLog_(null, "PRESTACAO_PUBLICA_FLASH_ENVIADA", "LANCAMENTO", lancamentoId, null, registro, "OK", "Prestacao publica Flash B45 enviada.");
      return finOk_({ executado: true, lancamentoId: lancamentoId, item: finFlashPrestacaoItemPublico_(registro) });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashObterPrestacaoPublicaPorTokenV1(token) {
    try {
      return finFlashPrestacaoContextoPublico_(token);
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashListarPrestacoesPublicasV1(token) {
    try {
      const r = finFlashPrestacaoContextoPublico_(token);
      if (!r || !r.ok) return r;
      return finOk_({ items: r.prestacoes || [], total: (r.prestacoes || []).length, resumo: r.resumo, colaborador: r.colaborador });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashListarPendenciasPublicasV1(token) {
    try {
      const r = finFlashPrestacaoContextoPublico_(token);
      if (!r || !r.ok) return r;
      return finOk_({ items: r.pendencias || [], total: (r.pendencias || []).length, colaborador: r.colaborador });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashRegularizarPendenciaPublicaV1(payload) {
    try {
      const p = payload || {};
      const ctx = finFlashTokenPrestacao_(p.token);
      if (!ctx) return finErro_("Token de prestacao Flash invalido ou não localizado.");
      const alvo = finSafeText_(p.pendenciaId || p.id);
      const texto = finSafeText_(p.esclarecimentoTexto || p.resolucaoTexto);
      if (!alvo) return finErro_("Pendencia não informada.");
      if (texto.length < 10) return finErro_("Esclarecimento deve ter pelo menos 10 caracteres.");
      const local = finFlashLocalizarPendencia_(alvo);
      if (!local) return finErro_("Pendencia não encontrada.");
      const pertence = (ctx.funcionarioId && finSafeText_(local.item.FUNCIONARIO_ID) === ctx.funcionarioId) ||
        (ctx.cartaoId && finSafeText_(local.item.CARTAO_ID) === ctx.cartaoId);
      if (!pertence) return finErro_("Pendencia não pertence ao token informado.");
      const agora = finNow_();
      finFlashAplicarPatchLinha_(local, {
        ESCLARECIMENTO_TEXTO: texto,
        ESCLARECIMENTO_EM: agora,
        ESCLARECIDO_POR: ctx.funcionarioNome || ctx.funcionarioId,
        STATUS: "ESCLARECIDA",
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: "PRESTACAO_PUBLICA_FLASH_B45"
      });
      finLog_(null, "PENDENCIA_PUBLICA_FLASH_ESCLARECIDA", "PENDENCIA", alvo, local.item, { ESCLARECIMENTO_TEXTO: texto }, "OK", "Pendencia esclarecida por token publico Flash B45.");
      return finOk_({ executado: true, pendenciaId: alvo, statusNovo: "ESCLARECIDA" });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashHtmlA4_(titulo, subtitulo, linhas) {
    const rows = (linhas || []).map(function(l) {
      return "<tr><th>" + finSafeText_(l[0]) + "</th><td>" + finSafeText_(l[1]) + "</td></tr>";
    }).join("");
    return "<!doctype html><html><head><meta charset=\"utf-8\"><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#172033}h1{font-size:20px;margin:0 0 4px}p{color:#475569;margin:0 0 16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d7dee8;padding:8px;text-align:left;font-size:12px}th{width:34%;background:#f3f6fa}</style></head><body><h1>" + finSafeText_(titulo) + "</h1><p>" + finSafeText_(subtitulo) + "</p><table>" + rows + "</table></body></html>";
  }

  function finFlashGerarComprovanteEntregaCartaoA4V1(sessionId, cartaoId) {
    const cartao = obterCartao(sessionId, cartaoId);
    if (!cartao || !cartao.ok) return cartao;
    const c = cartao.item || {};
    return finOk_({ imprimivel: true, html: finFlashHtmlA4_("Comprovante de entrega do Cartão Flash", "Documento para impressao A4.", [["Cartao", c.APELIDO_CARTAO || c.CARTAO_ID], ["Final", c.NUMERO_FINAL_4], ["Colaborador", c.FUNCIONARIO_NOME], ["Status", c.STATUS_CARTAO], ["Gerado em", finNow_()]]) });
  }

  function finFlashGerarRelatorioPrestacaoColaboradorA4V1(sessionId, filtros) {
    const r = listarLancamentos(sessionId, filtros || {});
    if (!r || !r.ok) return r;
    const total = (r.items || []).reduce(function(acc, x) { return acc + finSafeNumber_(x.VALOR); }, 0);
    return finOk_({ imprimivel: true, totalItens: (r.items || []).length, html: finFlashHtmlA4_("Relatorio de prestacao Flash", "Prestacoes por colaborador.", [["Itens", (r.items || []).length], ["Valor total", total.toFixed(2)], ["Gerado em", finNow_()]]) });
  }

  function finFlashGerarRelatorioPendenciasColaboradorA4V1(sessionId, filtros) {
    const r = flashListarPendencias(sessionId, filtros || {});
    if (!r || !r.ok) return r;
    return finOk_({ imprimivel: true, totalItens: r.total || 0, html: finFlashHtmlA4_("Relatorio de pendencias Flash", "Pendencias filtradas para acompanhamento.", [["Pendencias", r.total || 0], ["Gerado em", finNow_()]]) });
  }

  function finFlashGerarRelatorioConciliacaoPeriodoA4V1(sessionId, filtros) {
    const r = finFlashPrevisualizarConciliacaoTela(sessionId, filtros || {});
    if (!r || !r.ok) return r;
    return finOk_({ imprimivel: true, html: finFlashHtmlA4_("Relatorio de conciliacao Flash", "Previa segura, sem execucao de conciliacao real.", [["Conciliaveis", r.resumo.totalConciliaveis], ["Sem prestacao", r.resumo.totalSemPrestacao], ["Sem extrato", r.resumo.totalSemExtrato], ["Gerado em", finNow_()]]) });
  }

  function finFlashGerarRelatorioExtratoImportadoA4V1(sessionId, filtros) {
    const r = flashListarExtratos(sessionId, filtros || {});
    if (!r || !r.ok) return r;
    const total = (r.items || []).reduce(function(acc, x) { return acc + Math.abs(finSafeNumber_(x.VALOR || x.VALOR_TRANSACAO)); }, 0);
    return finOk_({ imprimivel: true, totalItens: r.total || 0, html: finFlashHtmlA4_("Relatorio de extrato Flash importado", "Extratos importados para conferencia.", [["Extratos", r.total || 0], ["Valor amostrado", total.toFixed(2)], ["Gerado em", finNow_()]]) });
  }

  function finFlashGerarRelatorioGerencialA4V1(sessionId, filtros) {
    const r = finFlashObterDashboardGerencial(sessionId, filtros || {});
    if (!r || !r.ok) return r;
    const k = r.kpis || {};
    return finOk_({ imprimivel: true, dadosTesteDetectados: !!r.dadosTesteDetectados, html: finFlashHtmlA4_("Relatorio gerencial Flash", "Resumo operacional. Massa modelo Rafael não representa cobranca real.", [["Extratos", k.totalExtratos], ["Conciliados", k.totalConciliado], ["Pendencias abertas", k.totalPendenciasAbertas], ["Dados de teste/modelo", r.dadosTesteDetectados ? "SIM" : "NAO"], ["Gerado em", finNow_()]]) });
  }

  // ============================================================
  // B54.4 — CONFERÊNCIA FINANCEIRA DA PRESTAÇÃO FLASH MOBILE
  // ============================================================

  function finFlashConferirPrestacaoMobilePilotoV1(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "conferir prestacao Flash piloto");
      finDbOk_();

      const p = payload || {};
      const lancamentoId = finSafeText_(p.lancamentoId || p.LANCAMENTO_ID);
      const decisao      = finSafeUpper_(p.decisao     || p.DECISAO || "");
      const motivo       = finSafeText_(p.motivo       || p.MOTIVO  || p.observacao || "");

      const erros = [];
      if (!lancamentoId) erros.push("lancamentoId obrigatorio.");
      if (decisao !== "APROVAR" && decisao !== "REPROVAR")
        erros.push("decisao invalida: use APROVAR ou REPROVAR.");
      if (decisao === "REPROVAR" && motivo.length < 5)
        erros.push("Reprovacao exige motivo (minimo 5 caracteres).");
      if (erros.length) return finErro_(erros.join(" "));

      const lanc = finAll_(ABAS.LANCAMENTOS).find(function(r) {
        return finSafeText_(r.LANCAMENTO_ID) === lancamentoId;
      }) || null;
      if (!lanc) return finErro_("Lançamento não encontrado: " + lancamentoId);

      if (finSafeUpper_(lanc.COMPROVANTE_OK) !== "SIM") {
        return finErro_("Lançamento sem comprovante. Conferencia bloqueada ate o tecnico enviar o comprovante.");
      }
      const statusAtual = finSafeUpper_(lanc.STATUS_PRESTACAO);
      if (statusAtual !== "ENVIADO") {
        return finErro_("Status não permite conferencia: " + statusAtual + ". Esperado: ENVIADO.");
      }

      const u       = finUsuario_(sessao);
      const agora   = finNow_();
      const novoStatus = decisao === "APROVAR" ? "APROVADO_FINANCEIRO" : "REPROVADO_FINANCEIRO";

      const patch = {
        STATUS_PRESTACAO : novoStatus,
        DATA_APROVACAO   : agora,
        APROVADO_POR     : u.nome || u.id,
        MOTIVO_REJEICAO  : decisao === "REPROVAR" ? motivo : "",
        ATUALIZADO_EM    : agora,
        ATUALIZADO_POR   : "CONFERENCIA_FINANCEIRA_B54_4"
      };
      finUpdate_(ABAS.LANCAMENTOS, lanc.ID, patch);

      finLog_(sessao, "CONFERENCIA_FINANCEIRA_FLASH_B54_4", "LANCAMENTO", lancamentoId,
        { STATUS_PRESTACAO: statusAtual },
        { STATUS_PRESTACAO: novoStatus, APROVADO_POR: patch.APROVADO_POR },
        "OK",
        "Prestacao Flash " + decisao + ". Lancamento: " + lancamentoId +
          (motivo ? " | Motivo: " + motivo : ""));

      return finOk_({
        executado         : true,
        lancamentoId      : lancamentoId,
        decisao           : decisao,
        statusAnterior    : statusAtual,
        statusAtualizado  : novoStatus,
        conferidoEm       : agora,
        conferidoPor      : patch.APROVADO_POR,
        motivo            : motivo || null,
        avisos            : decisao === "APROVAR"
          ? ["Prestacao aprovada pelo financeiro. Aguardando conciliacao."]
          : ["Prestacao reprovada. Tecnico sera notificado na proxima etapa."],
        origem            : "CONFERENCIA_FINANCEIRA_B54_4"
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // B54.5 — LISTAR PRESTAÇÕES FLASH MOBILE (READ-ONLY FINANCEIRO)
  // ============================================================

  function finFlashListarPrestacoesMobileFinanceiroV1(sessionId, filtros) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "listar prestacoes Flash mobile");
      finDbOk_();

      const f            = filtros || {};
      const statusFiltro = finSafeUpper_(f.status || f.STATUS || "");

      const todos  = finAll_(ABAS.LANCAMENTOS);
      const mobile = todos.filter(function(r) {
        return finSafeText_(r.CRIADO_POR).indexOf("MOBILE_CAMPO_PILOTO") >= 0;
      });

      var kpis = {
        total                : mobile.length,
        pendenteComprovante  : 0,
        aguardandoConferencia: 0,
        aprovadas            : 0,
        reprovadas           : 0,
        totalValor           : 0
      };
      mobile.forEach(function(r) {
        var s = finSafeUpper_(r.STATUS_PRESTACAO);
        kpis.totalValor += finSafeNumber_(r.VALOR);
        if (s === "PENDENTE_COMPROVANTE")                        kpis.pendenteComprovante++;
        if (s === "ENVIADO")                                     kpis.aguardandoConferencia++;
        if (s === "APROVADO_FINANCEIRO" || s === "APROVADO")     kpis.aprovadas++;
        if (s === "REPROVADO_FINANCEIRO" || s === "REPROVADO")   kpis.reprovadas++;
      });

      const lista = statusFiltro
        ? mobile.filter(function(r) { return finSafeUpper_(r.STATUS_PRESTACAO) === statusFiltro; })
        : mobile;

      const itens = lista.map(function(r) {
        return {
          lancamentoId      : finSafeText_(r.LANCAMENTO_ID),
          id                : finSafeText_(r.ID),
          funcionarioNome   : finSafeText_(r.FUNCIONARIO_NOME),
          funcionarioId     : finSafeText_(r.FUNCIONARIO_ID),
          cartaoId          : finSafeText_(r.CARTAO_ID),
          valor             : finSafeNumber_(r.VALOR),
          dataGasto         : finSafeText_(r.DATA_GASTO),
          descricaoGasto    : finSafeText_(r.DESCRICAO_GASTO || r.FINALIDADE),
          osNumero          : finSafeText_(r.OS_NUMERO),
          observacao        : finSafeText_(r.OBSERVACAO),
          statusPrestacao   : finSafeText_(r.STATUS_PRESTACAO),
          comprovanteOk     : finSafeUpper_(r.COMPROVANTE_OK),
          comprovanteFileId : finSafeText_(r.COMPROVANTE_FILE_ID),
          comprovanteLink   : finSafeText_(r.COMPROVANTE_LINK),
          tipoComprovante   : finSafeText_(r.TIPO_COMPROVANTE),
          dataAprovacao     : finSafeText_(r.DATA_APROVACAO),
          aprovadoPor       : finSafeText_(r.APROVADO_POR),
          motivoRejeicao    : finSafeText_(r.MOTIVO_REJEICAO),
          criadoEm          : finSafeText_(r.CRIADO_EM),
          criadoPor         : finSafeText_(r.CRIADO_POR),
          atualizadoPor     : finSafeText_(r.ATUALIZADO_POR)
        };
      });

      return finOk_({
        kpis   : kpis,
        total  : itens.length,
        filtro : statusFiltro || "TODOS",
        itens  : itens,
        origem : "B54_5_VISAO_FINANCEIRA"
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // B54.3 — ANEXAR COMPROVANTE FLASH MOBILE PILOTO
  // ============================================================

  function finFlashAnexarComprovanteMobilePilotoV1(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "anexar comprovante Flash piloto mobile");
      finDbOk_();

      const props = PropertiesService.getScriptProperties();
      const pilotoEmail = finSafeText_(props.getProperty("FIN_PILOTO_FLASH_EMAIL"));
      if (!pilotoEmail) {
        return finErro_("Envio de comprovante Flash não habilitado. Configure FIN_PILOTO_FLASH_EMAIL.");
      }
      const emailsPermitidos = pilotoEmail.split(",").map(function(e) { return e.trim().toLowerCase(); });
      const emailUsuario = finSafeText_(sessao.usuario || sessao.email || sessao.userId || "").toLowerCase();
      if (!emailUsuario || emailsPermitidos.indexOf(emailUsuario) < 0) {
        return finErro_("Anexar comprovante Flash restrito ao piloto autorizado.");
      }

      const p = payload || {};
      const lancamentoId = finSafeText_(p.lancamentoId || p.LANCAMENTO_ID);
      const mimeType     = finSafeText_(p.mimeType     || p.MIME_TYPE    || "application/octet-stream");
      const base64Raw    = finSafeText_(p.base64       || p.BASE64       || p.dataUrl || "");

      const erros = [];
      if (!lancamentoId) erros.push("lancamentoId obrigatorio.");
      if (!base64Raw)    erros.push("base64 do arquivo obrigatorio.");
      const mimesPermitidos = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (mimeType && mimesPermitidos.indexOf(mimeType.toLowerCase()) < 0) {
        erros.push("Tipo não permitido: " + mimeType + ". Permitidos: JPEG, PNG, PDF.");
      }
      if (erros.length) return finErro_(erros.join(" "));

      const base64Clean = base64Raw.indexOf(",") >= 0 ? base64Raw.split(",").pop() : base64Raw;
      let bytes;
      try {
        bytes = Utilities.base64Decode(base64Clean);
      } catch (eB) {
        return finErro_("Arquivo invalido: falha ao decodificar base64. " + eB.message);
      }
      const LIMITE_BYTES = 5 * 1024 * 1024;
      if (bytes.length > LIMITE_BYTES) {
        return finErro_("Arquivo muito grande: " + Math.round(bytes.length / 1024) + " KB. Limite: 5120 KB.");
      }

      const u = finUsuario_(sessao);
      const lanc = finAll_(ABAS.LANCAMENTOS).find(function(r) {
        return finSafeText_(r.LANCAMENTO_ID) === lancamentoId;
      }) || null;
      if (!lanc) return finErro_("Lançamento não encontrado: " + lancamentoId);
      if (finSafeText_(lanc.FUNCIONARIO_ID) !== u.id) {
        return finErro_("Lançamento não pertence ao colaborador autenticado.");
      }

      const cartaoPiloto = finAll_(ABAS.CARTOES).find(function(c) {
        return finSafeText_(c.FUNCIONARIO_ID) === u.id && finSafeUpper_(c.STATUS_CARTAO) === "ATIVO";
      });
      const cartaoPilotoId = cartaoPiloto ? finSafeText_(cartaoPiloto.CARTAO_ID || cartaoPiloto.ID) : "";
      if (!cartaoPilotoId || finSafeText_(lanc.CARTAO_ID) !== cartaoPilotoId) {
        return finErro_("Lançamento não pertence ao cartão Flash ativo do colaborador.");
      }

      const statusAtual = finSafeUpper_(lanc.STATUS_PRESTACAO);
      if (statusAtual !== "PENDENTE_COMPROVANTE" && statusAtual !== "REPROVADO") {
        return finErro_("Status não permite anexar comprovante: " + statusAtual + ". Esperado: PENDENTE_COMPROVANTE.");
      }

      const folderId = finSafeText_(
        props.getProperty("FOLDER_FINANCEIRO") ||
        props.getProperty("FOLDER_FINANCEIRO_ID") ||
        (typeof sgoGetCfgSafe_() !== "undefined" && sgoGetCfgSafe_().DRIVE && sgoGetCfgSafe_().DRIVE.FOLDER_FINANCEIRO)
      );
      if (!folderId) {
        return finErro_(
          "Pasta do Financeiro não configurada. Configure FOLDER_FINANCEIRO em ScriptProperties. " +
          "Execute o provisionamento financeiro para criar a pasta."
        );
      }

      const extMap = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "application/pdf": "pdf" };
      const ext = extMap[mimeType.toLowerCase()] || "bin";
      const stamp = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd_HHmmss");
      const loginSafe = emailUsuario.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
      const nomeArquivoFinal = "FLASH_" + lancamentoId + "_" + stamp + "_" + loginSafe + "." + ext;

      const blob = Utilities.newBlob(bytes, mimeType, nomeArquivoFinal);
      let driveFile;
      try {
        driveFile = DriveApp.getFolderById(folderId).createFile(blob);
      } catch (eDrive) {
        return finErro_("Falha ao salvar no Drive. Verifique permissoes de FOLDER_FINANCEIRO. Erro: " + eDrive.message);
      }
      const fileId   = driveFile.getId();
      const fileLink = driveFile.getUrl();

      const agora = finNow_();
      finUpdate_(ABAS.LANCAMENTOS, lanc.ID, {
        COMPROVANTE_OK      : "SIM",
        COMPROVANTE_FILE_ID : fileId,
        COMPROVANTE_LINK    : fileLink,
        TIPO_COMPROVANTE    : mimeType,
        STATUS_PRESTACAO    : STATUS_PRESTACAO.ENVIADO,
        ATUALIZADO_EM       : agora,
        ATUALIZADO_POR      : "MOBILE_CAMPO_PILOTO_B54_3"
      });

      finInsert_(ABAS.ANEXOS, {
        ID            : finUuid_(),
        ANEXO_ID      : finGerarId_("ANX"),
        LANCAMENTO_ID : lancamentoId,
        CARTAO_ID     : cartaoPilotoId,
        FUNCIONARIO_ID: u.id,
        TIPO_ANEXO    : "COMPROVANTE_PRESTACAO",
        NOME_ARQUIVO  : nomeArquivoFinal,
        FILE_ID       : fileId,
        LINK_ARQUIVO  : fileLink,
        MIME_TYPE     : mimeType,
        TAMANHO_BYTES : bytes.length,
        DESCRICAO     : "Comprovante Flash piloto B54.3. Lancamento: " + lancamentoId,
        ORIGEM        : "MOBILE_CAMPO_PILOTO_B54_3",
        DATA_UPLOAD   : agora,
        STATUS        : "ATIVO",
        CRIADO_EM     : agora,
        CRIADO_POR    : "MOBILE_CAMPO_PILOTO_B54_3"
      });

      finLog_(sessao, "COMPROVANTE_FLASH_MOBILE_PILOTO_B54_3", "LANCAMENTO", lancamentoId,
        { STATUS_PRESTACAO: statusAtual },
        { STATUS_PRESTACAO: "ENVIADO", COMPROVANTE_FILE_ID: fileId },
        "OK", "Comprovante anexado: " + nomeArquivoFinal + " (" + bytes.length + " bytes).");

      return finOk_({
        executado         : true,
        lancamentoId      : lancamentoId,
        comprovanteFileId : fileId,
        comprovanteLink   : fileLink,
        nomeArquivo       : nomeArquivoFinal,
        tamanhoBytes      : bytes.length,
        mimeType          : mimeType,
        statusAnterior    : statusAtual,
        statusAtualizado  : STATUS_PRESTACAO.ENVIADO,
        avisos            : ["Comprovante recebido. Prestacao aguardando conferencia financeira."],
        origem            : "MOBILE_CAMPO_PILOTO_B54_3"
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FLASH.3 — Cartoes Profissional (metodos internos do IIFE)
  // ============================================================

  function inativarCartao(sessionId, id, motivo) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, ['ADMIN', 'DIRETORIA', 'GESTOR', 'FINANCEIRO'], 'inativar cartao');
      if (!id) return finErro_('ID do cartao nao informado.');
      if (!motivo || !String(motivo).trim()) return finErro_('Motivo da inativacao e obrigatorio.');
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_('Cartao nao encontrado.');
      const sc = (antes.STATUS_CARTAO || '').toUpperCase();
      if (sc === 'INATIVO' || sc === 'CANCELADO') return finErro_('Cartao ja esta inativo.');
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        STATUS_CARTAO  : 'INATIVO',
        MOTIVO_BLOQUEIO: String(motivo).trim(),
        BLOQUEADO_POR  : u.nome,
        DATA_BLOQUEIO  : agora,
        ATUALIZADO_EM  : agora,
        ATUALIZADO_POR : u.nome
      };
      const depois = finUpdate_(ABAS.CARTOES, id, patch);
      finLog_(sessao, 'CARTAO_INATIVADO', 'CARTAO', antes.CARTAO_ID || id, antes, depois, 'OK',
        'Cartao inativado: ' + String(motivo).trim());
      return finOk_({
        message             : 'Cartao inativado com sucesso. Historico preservado.',
        cartaoInativado     : true,
        historicoPreservado : true,
        logRegistrado       : true
      });
    } catch (e) { return finErro_(e.message); }
  }

  function alterarResponsavelCartao(sessionId, id, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, ['ADMIN', 'DIRETORIA', 'GESTOR', 'FINANCEIRO'], 'alterar responsavel cartao');
      if (!id) return finErro_('ID do cartao nao informado.');
      if (!payload || !payload.FUNCIONARIO_NOME) return finErro_('Nome do novo responsavel e obrigatorio.');
      const antes = finGetById_(ABAS.CARTOES, id);
      if (!antes) return finErro_('Cartao nao encontrado.');
      const sc = (antes.STATUS_CARTAO || '').toUpperCase();
      if (sc === 'INATIVO' || sc === 'CANCELADO') {
        return finErro_('Nao e possivel alterar responsavel de cartao inativo.');
      }
      const u = finUsuario_(sessao);
      const agora = finNow_();
      const patch = {
        FUNCIONARIO_ID       : String(payload.FUNCIONARIO_ID       || '').trim(),
        FUNCIONARIO_NOME     : String(payload.FUNCIONARIO_NOME     || '').trim(),
        FUNCIONARIO_EMAIL    : String(payload.FUNCIONARIO_EMAIL    || '').trim(),
        FUNCIONARIO_TELEFONE : String(payload.FUNCIONARIO_TELEFONE || '').trim(),
        ATUALIZADO_EM        : agora,
        ATUALIZADO_POR       : u.nome
      };
      let termoMarcadoPendente = false;
      if (antes.TERMO_ASSINADO === 'SIM' &&
          (antes.FUNCIONARIO_ID || '') !== (patch.FUNCIONARIO_ID || '')) {
        patch.TERMO_ASSINADO = 'NAO';
        patch.TERMO_ID = '';
        termoMarcadoPendente = true;
      }
      const depois = finUpdate_(ABAS.CARTOES, id, patch);
      finLog_(sessao, 'CARTAO_RESPONSAVEL_ALTERADO', 'CARTAO', antes.CARTAO_ID || id, antes, depois, 'OK',
        'Responsavel alterado de ' + (antes.FUNCIONARIO_NOME || '-') + ' para ' + patch.FUNCIONARIO_NOME);
      return finOk_({
        message              : 'Responsavel alterado. Log registrado.',
        logRegistrado        : true,
        termoMarcadoPendente : termoMarcadoPendente
      });
    } catch (e) { return finErro_(e.message); }
  }

  function obterHistoricoCartao(sessionId, cartaoRowId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, ['ADMIN', 'DIRETORIA', 'GESTOR', 'FINANCEIRO'], 'obter historico cartao');
      if (!cartaoRowId) return finErro_('ID do cartao nao informado.');
      const cartao = finGetById_(ABAS.CARTOES, cartaoRowId);
      const cartaoIdReal = (cartao && cartao.CARTAO_ID) ? cartao.CARTAO_ID : cartaoRowId;
      const todos = finAll_(ABAS.LOGS);
      const logs = todos.filter(function(l) {
        return l.ENTIDADE_ID === cartaoIdReal || l.ENTIDADE_ID === cartaoRowId;
      });
      logs.sort(function(a, b) {
        const da = String(a.DATA_HORA || a.CRIADO_EM || '');
        const db = String(b.DATA_HORA || b.CRIADO_EM || '');
        return db < da ? -1 : db > da ? 1 : 0;
      });
      return finOk_({ items: logs.slice(0, 100), total: logs.length, cartaoId: cartaoIdReal });
    } catch (e) { return finErro_(e.message); }
  }

  function obterPendenciasCartao(sessionId, cartaoRowId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, ['ADMIN', 'DIRETORIA', 'GESTOR', 'FINANCEIRO'], 'obter pendencias cartao');
      if (!cartaoRowId) return finErro_('ID do cartao nao informado.');
      const cartao = finGetById_(ABAS.CARTOES, cartaoRowId);
      const cartaoIdReal = (cartao && cartao.CARTAO_ID) ? cartao.CARTAO_ID : cartaoRowId;
      const pend = finAll_(ABAS.PENDENCIAS).filter(function(p) {
        return p.CARTAO_ID === cartaoIdReal || p.CARTAO_ID === cartaoRowId;
      });
      pend.sort(function(a, b) {
        const sa = (a.STATUS || '').toUpperCase();
        const sb = (b.STATUS || '').toUpperCase();
        if (sa === 'ATIVO' && sb !== 'ATIVO') return -1;
        if (sb === 'ATIVO' && sa !== 'ATIVO') return 1;
        return 0;
      });
      return finOk_({ items: pend, total: pend.length, cartaoId: cartaoIdReal });
    } catch (e) { return finErro_(e.message); }
  }

  // FLASH.4.3 — Backend read-only para tela de Recargas
  function listarRecargasV1(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "listar recargas v1");
      finDbOk_();
      const todosCartoes  = finAll_(ABAS.CARTOES);
      const todasRecargas = finAll_(ABAS.RECARGAS);
      var ativos    = 0, inativos = 0, pendentes = 0;
      var cartoesElegiveis = [];
      todosCartoes.forEach(function(c) {
        var st = finSafeUpper_(c.STATUS_CARTAO);
        if      (st === 'ATIVO')              { ativos++;    cartoesElegiveis.push(c); }
        else if (st === 'INATIVO'   || st === 'CANCELADO' || st === 'DEVOLVIDO') { inativos++; }
        else                                  { pendentes++; }
      });
      var totalValor = 0;
      todasRecargas.forEach(function(r) {
        if (finSafeUpper_(r.STATUS) !== STATUS_RECARGA.CANCELADA) {
          totalValor += finSafeNumber_(r.VALOR);
        }
      });
      var bloqueada  = ativos === 0;
      var motivoBloq = bloqueada
        ? 'Nenhum cartão ativo cadastrado. Cadastre manualmente um cartão real antes de registrar recargas.'
        : '';
      var listaOrdenada = todasRecargas.slice().sort(function(a, b) {
        return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || ''));
      });
      return finOk_({
        kpis: {
          totalRecargas      : todasRecargas.length,
          totalValorRecargas : totalValor,
          totalCartoesAtivos : ativos,
          totalCartoesInativos: inativos,
          totalCartoesPendentes: pendentes,
          recargaRealBloqueada: bloqueada,
          motivoBloqueio     : motivoBloq
        },
        recargas         : listaOrdenada,
        cartoesElegiveis : cartoesElegiveis,
        recargaRealBloqueada: bloqueada,
        motivoBloqueio   : motivoBloq
      });
    } catch (e) {
      return finErro_(e.message);
    }
  }

  // ============================================================
  // FLASH.4.6B — Cadastro Operacional via Interface
  // ============================================================

  // FLASH.4.7 — Multicartão por colaborador
  // Regra de duplicidade: CPF_NORMALIZADO + TIPO_CARTAO (FISICO|VIRTUAL) + NUMERO_FINAL_4
  // Um colaborador pode ter múltiplos cartões desde que tipo+final difiram.
  function flash46PrepararCartaoRealUI(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "preparar cadastro cartao real");
      finDbOk_();

      const p         = payload || {};
      var bloqueios   = [], avisos = [];
      const funcId    = finSafeText_(p.FUNCIONARIO_ID);
      const funcNome  = finSafeText_(p.FUNCIONARIO_NOME);
      const cpfBruto  = finSafeText_(p.CPF_COLABORADOR || "");
      const cpfNorm   = cpfBruto.replace(/\D/g, "");
      const tipoFlash = finSafeUpper_(p.TIPO_CARTAO_FLASH || "VIRTUAL"); // FISICO ou VIRTUAL
      const finalRaw  = finSafeText_(p.NUMERO_FINAL_4 || "").replace(/\D/g, "");
      const apelido   = finSafeText_(p.APELIDO_CARTAO);
      const status    = finSafeUpper_(p.STATUS_CARTAO || "ATIVO");

      // Campos obrigatórios
      if (!funcId)   bloqueios.push("Funcionário (ID) obrigatório.");
      if (!funcNome) bloqueios.push("Nome do funcionário obrigatório.");
      if (!cpfNorm || cpfNorm.length !== 11) {
        bloqueios.push("CPF do colaborador obrigatório (11 dígitos). Informado: \"" + cpfBruto + "\".");
      }
      if (["FISICO", "VIRTUAL"].indexOf(tipoFlash) < 0) {
        bloqueios.push("Tipo deve ser FISICO ou VIRTUAL. Informado: \"" + tipoFlash + "\".");
      }

      // Validar final por tipo: FISICO aceita 3 ou 4 dígitos; VIRTUAL exige 4
      if (tipoFlash === "FISICO") {
        if (!/^\d{3,4}$/.test(finalRaw)) {
          bloqueios.push("Cartão FISICO: final deve ter 3 ou 4 dígitos. Informado: \"" + (p.NUMERO_FINAL_4 || "") + "\".");
        }
      } else {
        if (!/^\d{4}$/.test(finalRaw)) {
          bloqueios.push("Cartão VIRTUAL: final deve ter exatamente 4 dígitos. Informado: \"" + (p.NUMERO_FINAL_4 || "") + "\".");
        }
      }

      if (!apelido) bloqueios.push("Apelido do cartão obrigatório.");
      if ([STATUS_CARTAO.ATIVO, STATUS_CARTAO.PENDENTE_ATIVACAO].indexOf(status) < 0) {
        bloqueios.push("Status inválido: \"" + status + "\". Use ATIVO ou PENDENTE_ATIVACAO.");
      }

      // Proteger piloto FLASH44
      if (funcId === "PILOTO_FLASH44") {
        bloqueios.push("FUNCIONARIO_ID \"PILOTO_FLASH44\" reservado para o cartão piloto. Use um ID real.");
      }
      if (apelido.indexOf("PILOTO_FLASH44_RECARGA_CONTROLADA") >= 0) {
        bloqueios.push("Apelido não pode coincidir com o cartão piloto FLASH44.");
      }
      if (finalRaw === "4400") {
        bloqueios.push("Final 4400 pertence ao cartão piloto FLASH44. Use um final diferente.");
      }

      // Verificar duplicidade exata: CPF_NORM + TIPO + FINAL (FLASH.4.7)
      // Múltiplos cartões por mesmo CPF são permitidos quando tipo ou final diferirem.
      var chaveDup = "", dupExato = false, dupCartaoId = "";
      if (bloqueios.length === 0 && cpfNorm && finalRaw) {
        chaveDup = cpfNorm + "_" + tipoFlash + "_" + finalRaw;
        const todosCartoes = finAll_(ABAS.CARTOES);
        const inativados   = ["INATIVO", "CANCELADO", "DEVOLVIDO"];
        const dDup = todosCartoes.find(function(c) {
          if (inativados.indexOf(finSafeUpper_(c.STATUS_CARTAO)) >= 0) return false;
          // Preferir CHAVE_MULTICARTAO gravada; senão recalcular
          const chaveGravada = finSafeText_(c.CHAVE_MULTICARTAO || "");
          if (chaveGravada) return chaveGravada === chaveDup;
          const cCpf   = finSafeText_(c.CPF_COLABORADOR || "").replace(/\D/g, "");
          const cTipo  = finSafeUpper_(c.TIPO_CARTAO || "");
          const cFinal = finSafeText_(c.NUMERO_FINAL_4 || "").replace(/\D/g, "");
          if (!cCpf || !cTipo || !cFinal) return false;
          return (cCpf + "_" + cTipo + "_" + cFinal) === chaveDup;
        });
        if (dDup) {
          dupExato     = true;
          dupCartaoId  = finSafeText_(dDup.CARTAO_ID);
          bloqueios.push(
            "Cartão com CPF " + cpfNorm + ", tipo " + tipoFlash +
            " e final " + finalRaw + " já cadastrado: " + dupCartaoId + "."
          );
        }
      }

      if (bloqueios.length === 0) {
        avisos.push("Payload válido. Nenhum dado alterado. Confirme para criar o cartão.");
        avisos.push("Multicartão FLASH.4.7: múltiplos cartões por CPF permitidos quando tipo ou final diferirem.");
      }
      return finOk_({
        success               : bloqueios.length === 0,
        ok                    : bloqueios.length === 0,
        somenteLeitura        : true,
        dadosAlterados        : false,
        setupExecutado        : false,
        prodAntigoAlterado    : false,
        payloadValido         : bloqueios.length === 0,
        funcionarioOk         : !!funcId && !!funcNome,
        cpfOk                 : cpfNorm.length === 11,
        tipoFlash             : tipoFlash,
        finalOk               : bloqueios.length === 0 || !bloqueios.some(function(b) {
          return b.toLowerCase().indexOf("final") >= 0 || b.toLowerCase().indexOf("dígito") >= 0;
        }),
        chaveDuplicidade      : chaveDup,
        duplicidadeExata      : dupExato,
        naoConfundePiloto     : funcId !== "PILOTO_FLASH44" && finalRaw !== "4400",
        podeCriarCartaoReal   : bloqueios.length === 0,
        bloqueios             : bloqueios,
        avisos                : avisos
      });
    } catch(e) { return finErro_(e.message); }
  }

  function flash46ExecutarCartaoRealUI(sessionId, payload) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "criar cartao real FLASH46");
      finDbOk_();
      if (!payload) return finErro_("Payload não informado.");

      // Prévia interna obrigatória
      const previa = flash46PrepararCartaoRealUI(sessionId, payload);
      if (!previa.ok || !previa.podeCriarCartaoReal) {
        return finErro_("Cadastro bloqueado: " + ((previa.bloqueios || []).join(" | ") || previa.message || ""));
      }

      // LockService — exatamente 1 cartão por execução
      const lock = LockService.getScriptLock();
      try { lock.waitLock(15000); }
      catch(eLock) { return finErro_("Não foi possível obter lock: " + eLock.message); }

      try {
        // Re-validar ao vivo (dentro do lock)
        const previaVivo = flash46PrepararCartaoRealUI(sessionId, payload);
        if (!previaVivo.ok || !previaVivo.podeCriarCartaoReal) {
          return finErro_("Bloqueado ao vivo: " + (previaVivo.bloqueios || []).join(" | "));
        }

        const u          = finUsuario_(sessao);
        const agora      = finNow_();
        const cartaoId   = finGerarId_("REAL");
        const cpfNorm    = finSafeText_(payload.CPF_COLABORADOR || "").replace(/\D/g, "");
        const tipoFlash  = finSafeUpper_(payload.TIPO_CARTAO_FLASH || "VIRTUAL"); // FISICO ou VIRTUAL
        const final4     = finSafeText_(payload.NUMERO_FINAL_4 || "").replace(/\D/g, "");
        const chaveMult  = cpfNorm + "_" + tipoFlash + "_" + final4;
        const obs        = (finSafeText_(payload.OBSERVACOES || "") || "Cadastro operacional FLASH.4.7") + " [FLASH47_MULTICARTAO]";

        const registro = {
          ID                   : finUuid_(),
          CARTAO_ID            : cartaoId,
          NUMERO_FINAL_4       : final4,
          APELIDO_CARTAO       : finSafeText_(payload.APELIDO_CARTAO),
          BANDEIRA             : finSafeText_(payload.BANDEIRA || "MASTERCARD").toUpperCase(),
          TIPO_CARTAO          : tipoFlash,          // FISICO ou VIRTUAL
          FUNCIONARIO_ID       : finSafeText_(payload.FUNCIONARIO_ID),
          FUNCIONARIO_NOME     : finSafeText_(payload.FUNCIONARIO_NOME),
          FUNCIONARIO_EMAIL    : finSafeText_(payload.FUNCIONARIO_EMAIL || ""),
          FUNCIONARIO_TELEFONE : finSafeText_(payload.FUNCIONARIO_TELEFONE || ""),
          CPF_COLABORADOR      : cpfNorm,            // 11 dígitos normalizados
          ORIGEM_CARTAO        : "MANUAL",
          CHAVE_MULTICARTAO    : chaveMult,          // CPF_NORM_TIPO_FINAL
          LIMITE_OPERACIONAL   : finSafeNumber_(payload.LIMITE_MENSAL),
          LIMITE_TOTAL         : finSafeNumber_(payload.LIMITE_MENSAL),
          STATUS_CARTAO        : finSafeUpper_(payload.STATUS_CARTAO || "ATIVO"),
          STATUS               : "ATIVO",
          DATA_BLOQUEIO        : "",
          MOTIVO_BLOQUEIO      : "",
          BLOQUEADO_POR        : "",
          TERMO_ASSINADO       : "NAO",
          TERMO_ID             : "",
          OBSERVACOES          : obs,
          CRIADO_EM            : agora,
          CRIADO_POR           : u.nome || u.email || "SISTEMA",
          ATUALIZADO_EM        : agora,
          ATUALIZADO_POR       : u.nome || u.email || "SISTEMA"
        };

        finInsert_(ABAS.CARTOES, registro);
        finLog_(sessao, "CARTAO_CRIADO_FLASH47", "CARTAO", cartaoId, null, registro, "OK",
          "Cartão real cadastrado via interface FLASH.4.7 multicartão. Funcionário: " + registro.FUNCIONARIO_ID +
          " | Tipo: " + tipoFlash + " | Final: " + final4 + " | Chave: " + chaveMult);

        return finOk_({
          cartaoRealCriado  : true,
          cartaoId          : cartaoId,
          statusCartao      : registro.STATUS_CARTAO,
          tipoFlash         : tipoFlash,
          chaveMulticartao  : chaveMult,
          recargaCriada     : false,
          liberacaoGeral    : false,
          message           : "Cartão cadastrado com sucesso (FLASH.4.7 multicartão)."
        });
      } finally {
        try { lock.releaseLock(); } catch(_) {}
      }
    } catch(e) { return finErro_(e.message); }
  }

  // ============================================================
  // FLASH.4.8 — Agrupa cartões ativos por CPF_COLABORADOR (conta/carteira)
  // ============================================================
  function listarCartoesPorCPF48(sessionId) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "listar contas Flash por CPF FLASH.4.8");
      finDbOk_();
      const todosCartoes  = finAll_(ABAS.CARTOES);
      const todasRecargas = finAll_(ABAS.RECARGAS);

      var mapaCPF = {};
      todosCartoes.forEach(function(c) {
        var cpf   = finSafeText_(c.CPF_COLABORADOR).replace(/\D/g, "") || "__SEM_CPF_" + finSafeText_(c.CARTAO_ID || c.ID);
        var nome  = finSafeText_(c.FUNCIONARIO_NOME);
        var email = finSafeText_(c.FUNCIONARIO_EMAIL);
        var st    = finSafeUpper_(c.STATUS_CARTAO);
        if (!mapaCPF[cpf]) mapaCPF[cpf] = { cpf: cpf, nome: nome, email: email, cartoes: [], totalAtivos: 0, totalRecargas: 0, valorRecargas: 0 };
        mapaCPF[cpf].cartoes.push({
          cartaoId    : finSafeText_(c.CARTAO_ID || c.ID),
          apelido     : finSafeText_(c.APELIDO_CARTAO),
          tipo        : finSafeText_(c.TIPO_CARTAO),
          final       : finSafeText_(c.NUMERO_FINAL_4),
          statusCartao: st,
          chaveMulti  : finSafeText_(c.CHAVE_MULTICARTAO)
        });
        if (st === "ATIVO") mapaCPF[cpf].totalAtivos++;
      });

      todasRecargas.forEach(function(r) {
        if (finSafeUpper_(r.STATUS) === "CANCELADA") return;
        var cpfRec = finSafeText_(r.CPF_COLABORADOR).replace(/\D/g, "");
        if (!cpfRec) {
          var cartaoRec = todosCartoes.find(function(c) { return c.CARTAO_ID === r.CARTAO_ID || c.ID === r.CARTAO_ID; });
          if (cartaoRec) cpfRec = finSafeText_(cartaoRec.CPF_COLABORADOR).replace(/\D/g, "");
        }
        if (cpfRec && mapaCPF[cpfRec]) {
          mapaCPF[cpfRec].totalRecargas++;
          mapaCPF[cpfRec].valorRecargas += finSafeNumber_(r.VALOR);
        }
      });

      var contas = Object.keys(mapaCPF).map(function(k) {
        var c = mapaCPF[k];
        c.podeRecarregar = c.totalAtivos > 0;
        return c;
      }).sort(function(a, b) { return a.nome.localeCompare(b.nome); });

      return finOk_({
        contas           : contas,
        totalContas      : contas.length,
        totalComAtivos   : contas.filter(function(c) { return c.totalAtivos > 0; }).length,
        totalSemCPF      : contas.filter(function(c) { return c.cpf.indexOf("__SEM_CPF_") >= 0; }).length
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
    atualizarPerfilMaster,
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
    obterDashboardBasico,
    finFlashObterResumoOperacional,
    finFlashObterResumoTela,
    finFlashPrevisualizarConciliacaoTela,
    finFlashPrevisualizarPendenciasTela,
    finFlashResolverPendenciaTela,
    finFlashAuditarPendenciasTela,
    finFlashAuditarPendenciasTelaCore_,
    finFlashObterDashboardGerencial,
    finFlashGerarRelatorioSinteticoTela,
    finFlashChecklistPreProducao,
    finFlashConciliarSelecionadosTela,
    finFlashGerarPendenciasTela,
    finFlashObterResumoOperacionalCore_,
    finFlashObterPrestacaoPublicaPorTokenV1,
    finFlashEnviarPrestacaoPublicaV1,
    finFlashListarPrestacoesPublicasV1,
    finFlashListarPendenciasPublicasV1,
    finFlashRegularizarPendenciaPublicaV1,
    finFlashGerarComprovanteEntregaCartaoA4V1,
    finFlashGerarRelatorioPrestacaoColaboradorA4V1,
    finFlashGerarRelatorioPendenciasColaboradorA4V1,
    finFlashGerarRelatorioConciliacaoPeriodoA4V1,
    finFlashGerarRelatorioExtratoImportadoA4V1,
    finFlashGerarRelatorioGerencialA4V1,
    ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR,
    VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR,
    PREPARAR_PILOTO_REAL_FLASH_B48_SEM_GRAVAR,
    LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA,
    finFlashRegistrarPrestacaoMobilePilotoV1,
    finFlashAnexarComprovanteMobilePilotoV1,
    finFlashConferirPrestacaoMobilePilotoV1,
    finFlashListarPrestacoesMobileFinanceiroV1,
    AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR,
    CONFIGURAR_E_AUDITAR_PILOTO_B54_1,
    flashListarLotes,
    flashListarExtratos,
    flashListarPendencias,
    flashListarConciliacoes,
    inativarCartao,
    alterarResponsavelCartao,
    obterHistoricoCartao,
    obterPendenciasCartao,
    listarRecargasV1,
    flash46PrepararCartaoRealUI,
    flash46ExecutarCartaoRealUI,
    listarCartoesPorCPF48
  };
})();

// FLASH.4.2 — Sentinela de patches aplicados (lido por AUDITAR_FLASH42)
var SGO_FIN_FLASH42_PATCHES = { validaStatusCartao: true, chaveIdempotencia: true };

// ============================================================
// WRAPPERS GLOBAIS
// Definicoes apenas — não executam automaticamente.
// ============================================================

function finObterContexto(sId)                   { return SGO_FIN.obterContexto(sId); }
function finListarCartoes(sId, filtros)           { return SGO_FIN.listarCartoes(sId, filtros); }
function finObterCartao(sId, id)                  { return SGO_FIN.obterCartao(sId, id); }
function finCriarCartao(sId, payload)             { return SGO_FIN.criarCartao(sId, payload); }
function finAtualizarCartao(sId, id, payload)          { return SGO_FIN.atualizarCartao(sId, id, payload); }
function finAtualizarPerfilMaster(sId, ids, patch)    { return SGO_FIN.atualizarPerfilMaster(sId, ids, patch); }
function finBloquearCartao(sId, id, motivo)            { return SGO_FIN.bloquearCartao(sId, id, motivo); }
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
function finFlashObterResumoOperacional(sessionId) { return SGO_FIN.finFlashObterResumoOperacional(sessionId); }
function finFlashObterResumoTela(sessionId)        { return SGO_FIN.finFlashObterResumoTela(sessionId); }
function finFlashPrevisualizarConciliacaoTela(sessionId) { return SGO_FIN.finFlashPrevisualizarConciliacaoTela(sessionId); }
function finFlashPrevisualizarPendenciasTela(sessionId)  { return SGO_FIN.finFlashPrevisualizarPendenciasTela(sessionId); }
function finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao) { return SGO_FIN.finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao); }
function finFlashAuditarPendenciasTela(sessionId)  { return SGO_FIN.finFlashAuditarPendenciasTela(sessionId); }
function finFlashAuditarPendenciasTelaCore_()      { return SGO_FIN.finFlashAuditarPendenciasTelaCore_(); }
function finFlashObterDashboardGerencial(sessionId, filtros) { return SGO_FIN.finFlashObterDashboardGerencial(sessionId, filtros); }
function finFlashGerarRelatorioSinteticoTela(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioSinteticoTela(sessionId, filtros); }
function finFlashChecklistPreProducao(sessionId)   { return SGO_FIN.finFlashChecklistPreProducao(sessionId); }
function finFlashConciliarSelecionadosTela(sessionId, payload, confirmacao) { return SGO_FIN.finFlashConciliarSelecionadosTela(sessionId, payload, confirmacao); }
function finFlashGerarPendenciasTela(sessionId, confirmacao) { return SGO_FIN.finFlashGerarPendenciasTela(sessionId, confirmacao); }
function finFlashObterPrestacaoPublicaPorTokenV1(token) { return SGO_FIN.finFlashObterPrestacaoPublicaPorTokenV1(token); }
function finFlashEnviarPrestacaoPublicaV1(payload) { return SGO_FIN.finFlashEnviarPrestacaoPublicaV1(payload); }
function finFlashListarPrestacoesPublicasV1(token) { return SGO_FIN.finFlashListarPrestacoesPublicasV1(token); }
function finFlashListarPendenciasPublicasV1(token) { return SGO_FIN.finFlashListarPendenciasPublicasV1(token); }
function finFlashRegularizarPendenciaPublicaV1(payload) { return SGO_FIN.finFlashRegularizarPendenciaPublicaV1(payload); }
function finFlashGerarComprovanteEntregaCartaoA4V1(sessionId, cartaoId) { return SGO_FIN.finFlashGerarComprovanteEntregaCartaoA4V1(sessionId, cartaoId); }
function finFlashGerarRelatorioPrestacaoColaboradorA4V1(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioPrestacaoColaboradorA4V1(sessionId, filtros); }
function finFlashGerarRelatorioPendenciasColaboradorA4V1(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioPendenciasColaboradorA4V1(sessionId, filtros); }
function finFlashGerarRelatorioConciliacaoPeriodoA4V1(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioConciliacaoPeriodoA4V1(sessionId, filtros); }
function finFlashGerarRelatorioExtratoImportadoA4V1(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioExtratoImportadoA4V1(sessionId, filtros); }
function finFlashGerarRelatorioGerencialA4V1(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioGerencialA4V1(sessionId, filtros); }
function ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR() { return SGO_FIN.ROTEIRO_VALIDACAO_HUMANA_FLASH_B46_SEM_GRAVAR(); }
function VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR() { return SGO_FIN.VALIDACAO_HUMANA_FLASH_B47_SEM_GRAVAR(); }
function PREPARAR_PILOTO_REAL_FLASH_B48_SEM_GRAVAR() { return SGO_FIN.PREPARAR_PILOTO_REAL_FLASH_B48_SEM_GRAVAR(); }
function LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA()   { return SGO_FIN.LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA(); }
function finFlashRegistrarPrestacaoMobilePilotoV1(sessionId, payload) { return SGO_FIN.finFlashRegistrarPrestacaoMobilePilotoV1(sessionId, payload); }
function finFlashAnexarComprovanteMobilePilotoV1(sessionId, payload)  { return SGO_FIN.finFlashAnexarComprovanteMobilePilotoV1(sessionId, payload); }
function finFlashConferirPrestacaoMobilePilotoV1(sessionId, payload)  { return SGO_FIN.finFlashConferirPrestacaoMobilePilotoV1(sessionId, payload); }
function finFlashListarPrestacoesMobileFinanceiroV1(sessionId, filtros) { return SGO_FIN.finFlashListarPrestacoesMobileFinanceiroV1(sessionId, filtros); }
function AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR() { return SGO_FIN.AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR(); }
function CONFIGURAR_E_AUDITAR_PILOTO_B54_1() { return SGO_FIN.CONFIGURAR_E_AUDITAR_PILOTO_B54_1(); }
function finFlashListarLotes(sId, filtros)         { return SGO_FIN.flashListarLotes(sId, filtros); }
function finFlashListarExtratos(sId, filtros)      { return SGO_FIN.flashListarExtratos(sId, filtros); }
function finFlashListarPendencias(sId, filtros)    { return SGO_FIN.flashListarPendencias(sId, filtros); }
function flashListarPendencias(sId, filtros)       { return SGO_FIN.flashListarPendencias(sId, filtros); }
function finFlashListarConciliacoes(sId, filtros)  { return SGO_FIN.flashListarConciliacoes(sId, filtros); }
function finFlashObterResumoOperacionalCore_()     { return SGO_FIN.finFlashObterResumoOperacionalCore_(); }

function testarFinFlashObterResumoOperacional_C1_SEM_GRAVAR() {
  const resultado = finFlashObterResumoOperacionalCore_();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function testarBloqueioResolverPendenciaFlashTela_FIN_E() {
  const resultado = finFlashResolverPendenciaTela("", "", "", "");
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function testarFinFlashAuditoriaPendenciasTela_FIN_E_SEM_GRAVAR() {
  const resultado = finFlashAuditarPendenciasTelaCore_();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function testarAuditoriaFlashMobileB54_SEM_GRAVAR() {
  const resultado = AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// testarConfigurarAuditarPilotoB54_1 migrada para SGO_Fin_Setup.js (versao standalone B54.1_FIX)


// ============================================================
// FLASH.3 — Wrappers globais (delegam ao SGO_FIN IIFE)
// ============================================================

function finFlashListarRecargasV1(sId)                      { return SGO_FIN.listarRecargasV1(sId); }
function finFlashListarCartoesPorCPF48(sId)                 { return SGO_FIN.listarCartoesPorCPF48(sId); }

function finFlashInativarCartao(sId, id, motivo)           { return SGO_FIN.inativarCartao(sId, id, motivo); }
function finFlashAlterarResponsavelCartao(sId, id, payload) { return SGO_FIN.alterarResponsavelCartao(sId, id, payload); }
function finFlashObterHistoricoCartao(sId, cartaoRowId)    { return SGO_FIN.obterHistoricoCartao(sId, cartaoRowId); }
function finFlashObterPendenciasCartao(sId, cartaoRowId)   { return SGO_FIN.obterPendenciasCartao(sId, cartaoRowId); }

// FLASH.4.6B — Cadastro operacional via interface
function FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_UI_SEM_GRAVAR(sId, payload) { return SGO_FIN.flash46PrepararCartaoRealUI(sId, payload); }
function FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO(sId, payload)  { return SGO_FIN.flash46ExecutarCartaoRealUI(sId, payload); }
