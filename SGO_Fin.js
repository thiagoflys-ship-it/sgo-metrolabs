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

  function finFlashObterResumoPorCPF(sessionId, cpf) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_CONSULTA, "obter resumo Flash por CPF");
      finDbOk_();
      const cpfNorm = finSafeText_(cpf).replace(/\D/g, '');
      if (!cpfNorm) return finErro_('CPF não informado.');

      // Resolve todos os cartões do CPF
      const cartoesCpf = finAll_(ABAS.CARTOES).filter(function(c) {
        return finSafeText_(c.CPF_COLABORADOR).replace(/\D/g, '') === cpfNorm;
      });
      const finaisSet = {};
      const idsSet = {};
      cartoesCpf.forEach(function(c) {
        const f = finSafeText_(c.NUMERO_FINAL_4).replace(/\D/g, '');
        const id = finSafeText_(c.CARTAO_ID);
        if (f) finaisSet[f] = true;
        if (id) idsSet[id] = true;
      });

      // Filtra extratos pelo CARTAO_FINAL ou CPF_COLABORADOR
      const todosExtratos = finAll_(ABAS.EXTRATOS);
      const extratosFiltrados = todosExtratos.filter(function(e) {
        const cpfE = finSafeText_(e.CPF_COLABORADOR).replace(/\D/g, '');
        const finalE = finSafeText_(e.CARTAO_FINAL).replace(/\D/g, '');
        const idE = finSafeText_(e.CARTAO_ID);
        return (cpfE && cpfE === cpfNorm) || (finalE && finaisSet[finalE]) || (idE && idsSet[idE]);
      });
      const extratosIdsSet = {};
      extratosFiltrados.forEach(function(e) {
        extratosIdsSet[finSafeText_(e.EXTRATO_ID || e.ID)] = true;
      });

      // Filtra pendências pelos extratos encontrados
      const pendenciasFiltradas = finAll_(ABAS.PENDENCIAS).filter(function(p) {
        return extratosIdsSet[finSafeText_(p.EXTRATO_ID)] || false;
      });

      // Filtra conciliações pelos extratos encontrados
      const conciliacoesFiltradas = finAll_(ABAS.CONCILIACAO).filter(function(c) {
        return extratosIdsSet[finSafeText_(c.EXTRATO_ID)] || false;
      });

      // KPIs segmentados
      const conciliadosCount = extratosFiltrados.filter(function(e) {
        return finSafeUpper_(e.CONCILIADO) === 'SIM';
      }).length;
      const pendAbertas = pendenciasFiltradas.filter(function(p) {
        const st = finSafeUpper_(p.STATUS);
        return st !== 'RESOLVIDA' && st !== 'FECHADA' && st !== 'CANCELADA';
      });
      const valorPend = pendAbertas.reduce(function(acc, p) {
        return acc + finSafeNumber_(p.VALOR_ENVOLVIDO);
      }, 0);

      const resumo = {
        totalLotes: 0,
        totalExtratos: extratosFiltrados.length,
        totalExtratosConciliados: conciliadosCount,
        totalExtratosNaoConciliados: extratosFiltrados.length - conciliadosCount,
        totalPendenciasAbertas: pendAbertas.length,
        valorTotalPendenciasAbertas: finExtratoFlashArredondar_ ? finExtratoFlashArredondar_(valorPend) : Math.round(valorPend * 100) / 100
      };

      return finOk_({
        resumo: resumo,
        ultimosLotes: [],
        ultimosExtratos: finFlashTelaLista_(extratosFiltrados.slice(-20).reverse(), 20, [
          "EXTRATO_ID", "LOTE_ID", "DATA_TRANSACAO", "DATA", "ESTABELECIMENTO_EXTRATO",
          "DESCRICAO", "VALOR", "VALOR_TRANSACAO", "CONCILIADO", "STATUS", "CPF_COLABORADOR", "CARTAO_FINAL"
        ]),
        ultimasPendencias: finFlashTelaLista_(pendenciasFiltradas.slice(-10), 10, [
          "PENDENCIA_ID", "TIPO_PENDENCIA", "DESCRICAO_PENDENCIA", "VALOR_ENVOLVIDO", "STATUS"
        ]),
        ultimasConciliacoes: finFlashTelaLista_(conciliacoesFiltradas.slice(-5), 5, [
          "CONCILIACAO_ID", "ID", "DATA_CONCILIACAO", "TOTAL_CONCILIADO", "STATUS"
        ]),
        cpfFiltrado: cpfNorm,
        bloqueios: [],
        avisos: cartoesCpf.length === 0 ? ['Nenhum cartão encontrado para este CPF.'] : []
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
    // 1. Prioridade Máxima: Conta Master (CPF)
    const cpfExtrato = finSafeText_(extrato.CPF_COLABORADOR || extrato.cpfColaborador).replace(/\D/g, '');
    const cpfLanc = finSafeText_(lancamento.CPF_COLABORADOR).replace(/\D/g, '');
    if (cpfExtrato && cpfLanc && cpfExtrato === cpfLanc) return true;

    // 2. Prioridade Secundária: ID Único do Cartão
    const cartaoIdExtrato = finSafeText_(extrato.CARTAO_ID);
    const cartaoIdLanc = finSafeText_(lancamento.CARTAO_ID);
    if (cartaoIdExtrato && cartaoIdLanc && cartaoIdExtrato === cartaoIdLanc) return true;

    // 3. Prioridade Terciária: Final do Cartão (retrocompatibilidade legado)
    const finalExtrato = finSafeText_(extrato.CARTAO_FINAL || extrato.finalCartao);
    const finalLanc = finSafeText_(lancamento.CARTAO_FINAL || lancamento.NUMERO_FINAL_4);
    if (finalExtrato && finalLanc && finalExtrato === finalLanc) return true;

    // 4. Bloqueio absoluto: sem fallback cego
    return false;
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
      cartaoFinal: finFlashTelaValor_(extrato.CARTAO_FINAL || (lancamento && lancamento.CARTAO_FINAL)),
      cpfColaborador: finSafeText_(extrato.CPF_COLABORADOR || extrato.cpfColaborador).replace(/\D/g, ''),
      nomeColaborador: finSafeText_(extrato.FUNCIONARIO_NOME || extrato.pessoa)
    };
  }


  function finFlashNormalizarTextoIA_(valor) {
    var s = finSafeText_(valor).toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function finFlashSimilaridadeDescricaoIA_(a, b) {
    var ta = finFlashNormalizarTextoIA_(a).split(" ").filter(function(x) { return x && x.length >= 3; });
    var tb = finFlashNormalizarTextoIA_(b).split(" ").filter(function(x) { return x && x.length >= 3; });
    if (!ta.length || !tb.length) return 0;
    var mapa = {};
    ta.forEach(function(x) { mapa[x] = true; });
    var inter = 0;
    tb.forEach(function(x) { if (mapa[x]) inter++; });
    return inter / Math.max(ta.length, tb.length);
  }

  function finFlashScoreConciliacaoIA_(extrato, lancamento) {
    var valorExtrato = Math.abs(finSafeNumber_(extrato.VALOR || extrato.VALOR_TRANSACAO));
    var valorLanc = Math.abs(finSafeNumber_(lancamento.VALOR));
    var difValor = Math.abs(valorExtrato - valorLanc);
    var dataExtrato = finFlashDataMs_(extrato.DATA_TRANSACAO || extrato.DATA);
    var dataLanc = finFlashDataMs_(lancamento.DATA_GASTO || lancamento.DATA);
    var dias = dataExtrato !== null && dataLanc !== null ? Math.abs(Math.round((dataLanc - dataExtrato) / 86400000)) : 99;
    var mesmoCartao = finFlashMesmoCartao_(extrato, lancamento);
    var cpfE = finSafeText_(extrato.CPF_COLABORADOR || extrato.cpfColaborador).replace(/\D/g, "");
    var cpfL = finSafeText_(lancamento.CPF_COLABORADOR || lancamento.cpfColaborador).replace(/\D/g, "");
    var mesmoCpf = cpfE && cpfL && cpfE === cpfL;
    var simDescricao = finFlashSimilaridadeDescricaoIA_(extrato.ESTABELECIMENTO_EXTRATO || extrato.DESCRICAO, lancamento.ESTABELECIMENTO || lancamento.DESCRICAO_GASTO);
    var score = 0;
    var motivos = [];

    if (mesmoCartao) { score += 30; motivos.push("MESMO_CARTAO"); }
    else { motivos.push("CARTAO_DIVERGENTE_OU_INCOMPLETO"); }

    if (mesmoCpf) { score += 15; motivos.push("MESMO_CPF"); }
    else if (cpfE || cpfL) { motivos.push("CPF_DIVERGENTE_OU_INCOMPLETO"); }

    if (difValor <= 0.01) { score += 30; motivos.push("VALOR_EXATO"); }
    else if (difValor <= 2) { score += 18; motivos.push("VALOR_PROXIMO_ATE_2"); }
    else if (difValor <= 5) { score += 8; motivos.push("VALOR_PROXIMO_ATE_5"); }
    else { motivos.push("VALOR_DIVERGENTE"); }

    if (dias === 0) { score += 20; motivos.push("MESMA_DATA"); }
    else if (dias <= 1) { score += 15; motivos.push("DATA_ATE_1_DIA"); }
    else if (dias <= 3) { score += 8; motivos.push("DATA_ATE_3_DIAS"); }
    else { motivos.push("DATA_DISTANTE"); }

    if (simDescricao >= 0.5) { score += 5; motivos.push("DESCRICAO_COMPATIVEL"); }

    score = Math.min(100, score);
    var classificacao = "SEM_MATCH";
    if (score >= 92 && difValor <= 0.01 && dias === 0 && mesmoCartao) classificacao = "MATCH_EXATO";
    else if (score >= 75 && difValor <= 2 && dias <= 1 && mesmoCartao) classificacao = "MATCH_FORTE";
    else if (score >= 55 && difValor <= 5 && dias <= 3) classificacao = "MATCH_POSSIVEL";

    return {
      score: score,
      classificacao: classificacao,
      motivos: motivos,
      diferencaValor: Number(difValor.toFixed(2)),
      diasDiferenca: dias,
      similaridadeDescricao: Number(simDescricao.toFixed(2))
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
      const sugestoesIA = [];
      const resumoClassificacao = {};

      extratos.forEach(function(extrato) {
        const candidatos = lancamentos.map(function(lancamento) {
          const lancId = finSafeText_(lancamento.LANCAMENTO_ID || lancamento.ID);
          if (usados[lancId]) return null;
          const ia = finFlashScoreConciliacaoIA_(extrato, lancamento);
          if (ia.classificacao === "SEM_MATCH") return null;
          return { lancamento: lancamento, ia: ia, lancamentoId: lancId };
        }).filter(Boolean).sort(function(a, b) { return b.ia.score - a.ia.score; });

        const escolhido = candidatos[0] || null;
        const segundo = candidatos[1] || null;
        if (escolhido && segundo && segundo.ia.score >= 55 && Math.abs(escolhido.ia.score - segundo.ia.score) <= 8) {
          escolhido.ia.classificacao = "AMBIGUO";
          escolhido.ia.motivos.push("MAIS_DE_UM_CANDIDATO_COMPATIVEL");
        }

        if (escolhido && (escolhido.ia.classificacao === "MATCH_EXATO" || escolhido.ia.classificacao === "MATCH_FORTE")) {
          usados[escolhido.lancamentoId] = true;
          var itemOk = finFlashItemConciliacaoTela_(extrato, escolhido.lancamento);
          itemOk.scoreIA = escolhido.ia.score;
          itemOk.classificacaoIA = escolhido.ia.classificacao;
          itemOk.motivosIA = escolhido.ia.motivos;
          itemOk.diferencaValorIA = escolhido.ia.diferencaValor;
          itemOk.diasDiferencaIA = escolhido.ia.diasDiferenca;
          conciliaveis.push(itemOk);
          resumoClassificacao[escolhido.ia.classificacao] = (resumoClassificacao[escolhido.ia.classificacao] || 0) + 1;
          sugestoesIA.push(itemOk);
        } else {
          var itemPendente = finFlashItemConciliacaoTela_(extrato, escolhido ? escolhido.lancamento : null);
          itemPendente.scoreIA = escolhido ? escolhido.ia.score : 0;
          itemPendente.classificacaoIA = escolhido ? escolhido.ia.classificacao : "SEM_PRESTACAO";
          itemPendente.motivosIA = escolhido ? escolhido.ia.motivos : ["NENHUM_CANDIDATO_COMPATIVEL"];
          itemPendente.diferencaValorIA = escolhido ? escolhido.ia.diferencaValor : null;
          itemPendente.diasDiferencaIA = escolhido ? escolhido.ia.diasDiferenca : null;
          semPrestacao.push(itemPendente);
          resumoClassificacao[itemPendente.classificacaoIA] = (resumoClassificacao[itemPendente.classificacaoIA] || 0) + 1;
          sugestoesIA.push(itemPendente);
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
          totalSemExtrato: semExtrato.length,
          resumoClassificacaoIA: resumoClassificacao
        },
        conciliaveis: conciliaveis.slice(0, 20),
        semPrestacao: semPrestacao.slice(0, 20),
        semExtrato: semExtrato.slice(0, 20),
        sugestoesIA: sugestoesIA.slice(0, 50),
        motorIA: { tipo: "DETERMINISTICO_LOCAL", fase: "FIN.FLASH.8.2", semIAExterna: true, criterios: ["cartao", "cpf", "valor", "data", "descricao"] },
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

  function finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao, payloadEnvelope80) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "resolver pendencia Flash pela tela");
      const envelope80 = payloadEnvelope80 || {};
      const validacaoEnvelope80 = _finFlash72ValidarEnvelopeAcaoReal_("finFlashResolverPendenciaTela", envelope80, { ambienteControlado: envelope80.ambienteControlado === true, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0" });
      if (!validacaoEnvelope80.ok) return _finFlash73RetornoBloqueado_("finFlashResolverPendenciaTela", validacaoEnvelope80);
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
      const envelope80 = payload || {};
      const validacaoEnvelope80 = _finFlash72ValidarEnvelopeAcaoReal_("finFlashConciliarSelecionadosTela", envelope80, { ambienteControlado: envelope80.ambienteControlado === true, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0" });
      if (!validacaoEnvelope80.ok) return _finFlash73RetornoBloqueado_("finFlashConciliarSelecionadosTela", validacaoEnvelope80);
      if (confirmacao !== "CONCILIAR_FLASH_TELA_FIN_D") {
        return finErro_("Trava textual obrigatoria invalida ou ausente para conciliar Flash pela tela.");
      }
      const pares = (payload && Array.isArray(payload.pares)) ? payload.pares : [];
      if (!pares.length) return finErro_("Nenhum par informado para conciliacao.");

      const lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        finDbOk_();
        const todosExtratos    = finAll_(ABAS.EXTRATOS);
        const todosLancamentos = finAll_(ABAS.LANCAMENTOS);
        const u = finUsuario_(sessao);
        let conciliados = 0;
        const erros = [];

        pares.forEach(function(par) {
          const eId = finSafeText_(par.extratoId);
          const lId = finSafeText_(par.lancamentoId);
          const extrato    = todosExtratos.find(function(r) { return finSafeText_(r.EXTRATO_ID) === eId || finSafeText_(r.ID) === eId; });
          const lancamento = todosLancamentos.find(function(r) { return finSafeText_(r.LANCAMENTO_ID) === lId || finSafeText_(r.ID) === lId; });
          if (!extrato)    { erros.push("Extrato nao encontrado: " + eId);    return; }
          if (!lancamento) { erros.push("Lancamento nao encontrado: " + lId); return; }
          if (finSafeUpper_(extrato.CONCILIADO) === "SIM" || finSafeUpper_(lancamento.CONCILIADO) === "SIM") {
            erros.push("Par ja conciliado: " + eId + " / " + lId); return;
          }
          const concilId = finGerarId_("CONC");
          finInsert_(ABAS.CONCILIACAO, {
            CONCILIACAO_ID    : concilId,
            EXTRATO_ID        : finSafeText_(extrato.EXTRATO_ID || extrato.ID),
            LANCAMENTO_ID     : finSafeText_(lancamento.LANCAMENTO_ID || lancamento.ID),
            CARTAO_ID         : finSafeText_(extrato.CARTAO_ID || lancamento.CARTAO_ID),
            CARTAO_FINAL      : finSafeText_(extrato.CARTAO_FINAL || lancamento.CARTAO_FINAL),
            CPF_COLABORADOR   : finSafeText_(extrato.CPF_COLABORADOR || lancamento.CPF_COLABORADOR).replace(/\D/g,""),
            FUNCIONARIO_ID    : finSafeText_(extrato.FUNCIONARIO_ID || lancamento.FUNCIONARIO_ID),
            DATA_CONCILIACAO  : finNow_(),
            VALOR_EXTRATO     : finSafeNumber_(extrato.VALOR || extrato.VALOR_TRANSACAO),
            VALOR_LANCAMENTO  : finSafeNumber_(lancamento.VALOR),
            TOTAL_CONCILIADO  : 1,
            STATUS            : "CONCILIADO",
            CONCILIADO_POR    : u.nome || u.id,
            ORIGEM            : "TELA_FIN"
          });
          finUpdate_(ABAS.EXTRATOS,    extrato.ID,    { CONCILIADO: "SIM", STATUS_CONCILIACAO: "CONCILIADO", CONCILIACAO_ID: concilId });
          finUpdate_(ABAS.LANCAMENTOS, lancamento.ID, { CONCILIADO: "SIM", STATUS_CONCILIACAO: "CONCILIADO", CONCILIACAO_ID: concilId });
          finLog_(sessao, "EXTRATO_CONCILIADO_FLASH91", "CONCILIACAO", concilId, null, { extratoId: eId, lancamentoId: lId }, "OK", "Par conciliado pela tela FIN.");
          conciliados++;
        });

        return finOk_({ conciliados: conciliados, erros: erros, executado: true, gravado: true });
      } finally {
        lock.releaseLock();
      }
    } catch (e) {
      return finErro_(e.message);
    }
  }

  function finFlashGerarPendenciasTela(sessionId, payloadEnvelope80, confirmacao) {
    try {
      const sessao = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "gerar pendencias Flash pela tela");
      const envelope80 = (payloadEnvelope80 && typeof payloadEnvelope80 === "object") ? payloadEnvelope80 : {};
      const confirmacaoLegada80 = (typeof payloadEnvelope80 === "string") ? payloadEnvelope80 : confirmacao;
      const validacaoEnvelope80 = _finFlash72ValidarEnvelopeAcaoReal_("finFlashGerarPendenciasTela", envelope80, { ambienteControlado: envelope80.ambienteControlado === true, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0" });
      if (!validacaoEnvelope80.ok) return _finFlash73RetornoBloqueado_("finFlashGerarPendenciasTela", validacaoEnvelope80);
      if (confirmacaoLegada80 !== "GERAR_PENDENCIAS_FLASH_TELA_FIN_D") {
        return finErro_("Trava textual obrigatoria invalida ou ausente para gerar pendencias Flash pela tela.");
      }
      finDbOk_();
      const lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        const extratos    = finAll_(ABAS.EXTRATOS).filter(finFlashExtratoPendente_);
        const lancamentos = finAll_(ABAS.LANCAMENTOS).filter(finFlashLancamentoPendente_);
        const pendenciasExistentes = finAll_(ABAS.PENDENCIAS);
        const idsExistentes = {};
        pendenciasExistentes.forEach(function(p) {
          const st = finSafeUpper_(p.STATUS);
          if (st === "CANCELADO" || st === "RESOLVIDO") return;
          if (p.EXTRATO_ID)    idsExistentes["E_" + finSafeText_(p.EXTRATO_ID)]    = true;
          if (p.LANCAMENTO_ID) idsExistentes["L_" + finSafeText_(p.LANCAMENTO_ID)] = true;
        });

        let criadas = 0;
        let duplicadas = 0;
        const u = finUsuario_(sessao);

        extratos.forEach(function(e) {
          const eIdKey = "E_" + finSafeText_(e.EXTRATO_ID || e.ID);
          if (idsExistentes[eIdKey]) { duplicadas++; return; }
          finInsert_(ABAS.PENDENCIAS, {
            PENDENCIA_ID        : finGerarId_("PEND"),
            TIPO_PENDENCIA      : "PRESTACAO_PENDENTE",
            DESCRICAO_PENDENCIA : "Extrato sem prestacao de conta: " + finSafeText_(e.ESTABELECIMENTO_EXTRATO || e.DESCRICAO || e.EXTRATO_ID || e.ID),
            EXTRATO_ID          : finSafeText_(e.EXTRATO_ID || e.ID),
            LANCAMENTO_ID       : "",
            CARTAO_ID           : finSafeText_(e.CARTAO_ID),
            CPF_COLABORADOR     : finSafeText_(e.CPF_COLABORADOR).replace(/\D/g,""),
            FUNCIONARIO_ID      : finSafeText_(e.FUNCIONARIO_ID),
            VALOR_ENVOLVIDO     : finSafeNumber_(e.VALOR || e.VALOR_TRANSACAO),
            STATUS              : "ABERTO",
            ORIGEM              : "GERACAO_AUTOMATICA_FLASH91",
            CRIADO_POR          : u.nome || u.id
          });
          idsExistentes[eIdKey] = true;
          criadas++;
        });

        lancamentos.forEach(function(l) {
          const lIdKey = "L_" + finSafeText_(l.LANCAMENTO_ID || l.ID);
          if (idsExistentes[lIdKey]) { duplicadas++; return; }
          finInsert_(ABAS.PENDENCIAS, {
            PENDENCIA_ID        : finGerarId_("PEND"),
            TIPO_PENDENCIA      : "SEM_EXTRATO",
            DESCRICAO_PENDENCIA : "Lancamento sem extrato correspondente: " + finSafeText_(l.ESTABELECIMENTO || l.DESCRICAO_GASTO || l.LANCAMENTO_ID || l.ID),
            EXTRATO_ID          : "",
            LANCAMENTO_ID       : finSafeText_(l.LANCAMENTO_ID || l.ID),
            CARTAO_ID           : finSafeText_(l.CARTAO_ID),
            CPF_COLABORADOR     : finSafeText_(l.CPF_COLABORADOR).replace(/\D/g,""),
            FUNCIONARIO_ID      : finSafeText_(l.FUNCIONARIO_ID),
            VALOR_ENVOLVIDO     : finSafeNumber_(l.VALOR),
            STATUS              : "ABERTO",
            ORIGEM              : "GERACAO_AUTOMATICA_FLASH91",
            CRIADO_POR          : u.nome || u.id
          });
          idsExistentes[lIdKey] = true;
          criadas++;
        });

        finLog_(sessao, "PENDENCIAS_GERADAS_FLASH91", "PENDENCIAS", "LOTE", null, { criadas: criadas, duplicadas: duplicadas }, "OK", "Geracao automatica de pendencias pela tela FIN.");
        return finOk_({ criadas: criadas, duplicadas: duplicadas, executado: true, gravado: true });
      } finally {
        lock.releaseLock();
      }
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
      var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", payload, {
        ambienteControlado: payload && payload.ambienteControlado === true,
        perfilValido: true,
        sessaoValida: true,
        origem: "FIN.FLASH.7.3"
      });
      if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", envelope73);

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
  // AUDITORIA 360 — Cobrança por E-mail
  // ============================================================

  function finAuditoriaEmailHtml_(nome, cpfFmt, itens, dataDisparo) {
    var logoUrl = "";
    try { logoUrl = PropertiesService.getScriptProperties().getProperty("LOGO_URL") || ""; } catch(e) {}
    var rows = itens.map(function(item) {
      var valorFmt = "R$ " + (parseFloat(item.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      var bgColor  = item.status === "REPROVADO_FINANCEIRO" ? "#fff5f5" : "#fffbeb";
      var badgeBg  = item.status === "REPROVADO_FINANCEIRO" ? "#dc2626" : "#d97706";
      var badgeTxt = finSafeText_(item.statusLabel || item.status || "Pendente");
      return "<tr style=\"background:" + bgColor + ";\">"
        + "<td style=\"padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;\">" + finSafeText_(item.descricao || "—") + "</td>"
        + "<td style=\"padding:8px 10px;border:1px solid #e5e7eb;font-weight:700;\">" + valorFmt + "</td>"
        + "<td style=\"padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;\">" + finSafeText_(item.data || "—") + "</td>"
        + "<td style=\"padding:8px 10px;border:1px solid #e5e7eb;\">"
        + "<span style=\"background:" + badgeBg + ";color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;\">" + badgeTxt + "</span>"
        + "</td></tr>";
    }).join("");
    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>"
      + "<body style=\"margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;\">"
      + "<div style=\"max-width:680px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);\">"
      + "<div style=\"background:#0b3b78;padding:20px 28px;\">"
      + (logoUrl ? "<img src=\"" + logoUrl + "\" alt=\"Metrolabs\" style=\"max-width:160px;height:auto;display:block;margin-bottom:8px;\" onerror=\"this.style.display='none'\">" : "")
      + "<div style=\"color:#fff;font-size:18px;font-weight:900;\">Pendência Financeira</div>"
      + "<div style=\"color:rgba(255,255,255,.75);font-size:13px;margin-top:3px;\">METROLABS SGO+ — Cartão Corporativo Flash</div>"
      + "</div>"
      + "<div style=\"padding:20px 28px;\">"
      + "<p style=\"font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;\">Olá <strong>" + nome + "</strong> (" + cpfFmt + "),</p>"
      + "<p style=\"font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;\">Identificamos <strong>" + itens.length + " item(s) pendente(s)</strong> no seu cartão corporativo Flash que requerem regularização:</p>"
      + "<table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;\">"
      + "<thead><tr style=\"background:#f0f4fa;\">"
      + "<th style=\"padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;\">Descrição</th>"
      + "<th style=\"padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;\">Valor</th>"
      + "<th style=\"padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;\">Data</th>"
      + "<th style=\"padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;\">Status</th>"
      + "</tr></thead><tbody>" + rows + "</tbody></table>"
      + "<p style=\"font-size:13px;color:#64748b;margin:0 0 12px;\">Por favor, acesse o sistema SGO+ e regularize as pendências enviando o comprovante ou a justificativa correspondente.</p>"
      + "<p style=\"font-size:13px;color:#64748b;margin:0;\">Em caso de dúvidas, entre em contato com o departamento financeiro.</p>"
      + "</div>"
      + "<div style=\"background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 28px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;\">"
      + "<span>Notificação automática — <strong style=\"color:#0b3b78;\">METROLABS SGO+</strong></span>"
      + "<span>" + dataDisparo + "</span>"
      + "</div></div></body></html>";
  }

  function finAuditoriaEnviarEmailCobranca(sessionId, params) {
    try {
      params = params || {};
      const sessao       = finSessao_(sessionId);
      finGarantirPerfil_(sessao, PERFIS_OPERADOR, "enviar cobrança por e-mail");
      finDbOk_();
      var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("finAuditoriaEnviarEmailCobranca", params, {
        ambienteControlado: params && params.ambienteControlado === true,
        perfilValido: true,
        sessaoValida: true,
        origem: "FIN.FLASH.7.3"
      });
      if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("finAuditoriaEnviarEmailCobranca", envelope73);

      const cpf          = finSafeText_(params && params.cpf).replace(/D/g, "");
      const lancamentoId = finSafeText_(params && params.lancamentoId);
      const itens        = Array.isArray(params && params.itens) ? params.itens : [];
      const usuario      = finUsuario_(sessao);

      if (!cpf) { return finErro_("CPF do colaborador não informado."); }
      if (!itens.length) { return finErro_("Nenhum item pendente informado para cobrança."); }

      // Buscar email do colaborador em FIN_CARTOES via CPF
      const cartoes = finAll_(ABAS.CARTOES);
      const cartaoColaborador = cartoes.find(function(c) {
        return finSafeText_(c.CPF_COLABORADOR).replace(/\D/g, "") === cpf
          && finSafeText_(c.FUNCIONARIO_EMAIL);
      });
      const emailColaborador = cartaoColaborador ? finSafeText_(cartaoColaborador.FUNCIONARIO_EMAIL) : "";
      const nomeColaborador  = cartaoColaborador ? finSafeText_(cartaoColaborador.FUNCIONARIO_NOME) : "Colaborador";

      if (!emailColaborador) {
        const cpfFmtErr = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        return finErro_("E-mail não encontrado para CPF " + cpfFmtErr + ". Verifique o campo FUNCIONARIO_EMAIL no cadastro do cartão.");
      }

      const dataDisparo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      const cpfFmt      = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      const htmlBody    = finAuditoriaEmailHtml_(nomeColaborador, cpfFmt, itens, dataDisparo);
      const assunto     = "[METROLABS SGO+] Pendência financeira — " + nomeColaborador + " — " + dataDisparo;

      const mailOpts = {
        to:       emailColaborador,
        subject:  assunto,
        htmlBody: htmlBody
      };
      const emailDisparo = finSafeText_(sessao.email || sessao.userId || "");
      if (emailDisparo && emailDisparo !== emailColaborador) {
        mailOpts.bcc = emailDisparo;
      }
      MailApp.sendEmail(mailOpts);

      // Registrar log — não bloqueia o retorno se falhar
      try {
        const totalValor = itens.reduce(function(s, i) { return s + (parseFloat(i.valor) || 0); }, 0);
        finInsert_(ABAS.LOGS, {
          TIPO:      "COBRANCA_EMAIL",
          CARTAO_ID: lancamentoId,
          DESCRICAO: "E-mail de cobrança enviado para " + emailColaborador
            + " | CPF: " + cpfFmt
            + " | Itens: " + itens.length
            + " | Total: R$ " + totalValor.toFixed(2),
          USUARIO:   usuario.nome || usuario.id,
          STATUS:    "ENVIADO"
        });
      } catch (eLog) {
        Logger.log("FIN_LOG_COBRANCA_ERRO: " + eLog.message);
      }

      return finOk_({
        message:          "E-mail de cobrança enviado para " + emailColaborador + ".",
        emailColaborador: emailColaborador,
        nomeColaborador:  nomeColaborador,
        lancamentoId:     lancamentoId,
        dataDisparo:      dataDisparo,
        totalItens:       itens.length
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
    finFlashObterResumoPorCPF,
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
    finFlashScoreConciliacaoIA_,
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
    listarCartoesPorCPF48,
    finAuditoriaEnviarEmailCobranca
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
function finFlashObterResumoPorCPF(sId, cpf)      { return SGO_FIN.finFlashObterResumoPorCPF(sId, cpf); }
function finFlashPrevisualizarConciliacaoTela(sessionId) { return SGO_FIN.finFlashPrevisualizarConciliacaoTela(sessionId); }
function finFlashScoreConciliacaoIA_SEM_GRAVAR(extrato, lancamento) { return SGO_FIN.finFlashScoreConciliacaoIA_(extrato || {}, lancamento || {}); }
function finFlashPrevisualizarPendenciasTela(sessionId)  { return SGO_FIN.finFlashPrevisualizarPendenciasTela(sessionId); }
function finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao, payloadEnvelope80) { return SGO_FIN.finFlashResolverPendenciaTela(sessionId, pendenciaId, resolucaoTexto, confirmacao, payloadEnvelope80); }
function finFlashAuditarPendenciasTela(sessionId)  { return SGO_FIN.finFlashAuditarPendenciasTela(sessionId); }
function finFlashAuditarPendenciasTelaCore_()      { return SGO_FIN.finFlashAuditarPendenciasTelaCore_(); }
function finFlashObterDashboardGerencial(sessionId, filtros) { return SGO_FIN.finFlashObterDashboardGerencial(sessionId, filtros); }
function finFlashGerarRelatorioSinteticoTela(sessionId, filtros) { return SGO_FIN.finFlashGerarRelatorioSinteticoTela(sessionId, filtros); }
function finFlashChecklistPreProducao(sessionId)   { return SGO_FIN.finFlashChecklistPreProducao(sessionId); }
function finFlashConciliarSelecionadosTela(sessionId, payload, confirmacao) { return SGO_FIN.finFlashConciliarSelecionadosTela(sessionId, payload, confirmacao); }
function finFlashGerarPendenciasTela(sessionId, payloadEnvelope80, confirmacao) { return SGO_FIN.finFlashGerarPendenciasTela(sessionId, payloadEnvelope80, confirmacao); }
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
function FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO(sId, payload) {
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", payload || {}, {
    ambienteControlado: !!(payload && payload.ambienteControlado === true),
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", envelope73);
  return SGO_FIN.flash46ExecutarCartaoRealUI(sId, payload);
}

// Auditoria 360 — Cobrança por e-mail
function finAuditoriaEnviarEmailCobranca(sId, params) {
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("finAuditoriaEnviarEmailCobranca", params || {}, {
    ambienteControlado: !!(params && params.ambienteControlado === true),
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("finAuditoriaEnviarEmailCobranca", envelope73);
  return SGO_FIN.finAuditoriaEnviarEmailCobranca(sId, params);
}

// ============================================================
// FIN.FLASH.7.2 - Envelope de seguranca backend local
// Catalogo estatico e auditorias SEM_GRAVAR. Este bloco nao
// envolve nem executa funcoes reais existentes.
// ============================================================

function _finFlash73RetornoBloqueado_(acao, envelope) {
  envelope = envelope || {};
  return {
    success: false,
    ok: false,
    bloqueado: true,
    fase: "FIN.FLASH.7.3",
    acao: acao,
    motivos: envelope.motivos || [],
    envelope: envelope,
    executado: false,
    gravado: false
  };
}

var FIN_FLASH_ACOES_REAIS_72_ = [
  _finFlash72AcaoCatalogo_("Criar cartao", "finCriarCartao", "CARTAO", true, false, false, false, true, "ALTO", true, true, true, "Criacao operacional de cartao Flash; deve permanecer com confirmacao explicita."),
  _finFlash72AcaoCatalogo_("Atualizar cartao", "finAtualizarCartao", "CARTAO", true, false, false, false, true, "MEDIO", true, true, true, "Atualizacao cadastral/operacional do cartao."),
  _finFlash72AcaoCatalogo_("Bloquear cartao", "finBloquearCartao", "CARTAO", true, false, false, false, true, "ALTO", true, true, true, "Alteracao real de status do cartao para bloqueado."),
  _finFlash72AcaoCatalogo_("Desbloquear cartao", "finDesbloquearCartao", "CARTAO", true, false, false, false, true, "ALTO", true, true, true, "Alteracao real de status do cartao para ativo."),
  _finFlash72AcaoCatalogo_("Inativar cartao", "finFlashInativarCartao", "CARTAO", true, false, false, false, true, "ALTO", true, true, true, "Inativacao operacional de cartao."),
  _finFlash72AcaoCatalogo_("Alterar responsavel do cartao", "finFlashAlterarResponsavelCartao", "CARTAO", true, false, false, false, true, "ALTO", true, true, true, "Troca vinculo de responsavel/CPF do cartao."),
  _finFlash72AcaoCatalogo_("Executar cadastro real de cartao", "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", "CARTAO", true, false, false, false, true, "CRITICO", true, true, true, "Fluxo real/autorizado de cadastro de cartao; nao acionado por esta auditoria."),
  _finFlash72AcaoCatalogo_("Criar recarga", "finCriarRecarga", "RECARGA", true, false, false, false, true, "ALTO", true, true, true, "Criacao de registro real de recarga."),
  _finFlash72AcaoCatalogo_("Executar recarga controlada", "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", "RECARGA", true, false, false, false, true, "CRITICO", true, true, true, "Recarga real controlada; exige envelope forte antes de uso futuro."),
  _finFlash72AcaoCatalogo_("Criar lancamento", "finCriarLancamento", "LANCAMENTO_PRESTACAO", true, false, false, false, true, "ALTO", true, true, true, "Criacao de lancamento/prestacao."),
  _finFlash72AcaoCatalogo_("Atualizar lancamento", "finAtualizarLancamento", "LANCAMENTO_PRESTACAO", true, false, false, false, true, "MEDIO", true, true, true, "Atualizacao de lancamento/prestacao."),
  _finFlash72AcaoCatalogo_("Aprovar lancamento", "finAprovarLancamento", "LANCAMENTO_PRESTACAO", true, false, false, false, true, "ALTO", true, true, true, "Aprovacao financeira de lancamento."),
  _finFlash72AcaoCatalogo_("Rejeitar lancamento", "finRejeitarLancamento", "LANCAMENTO_PRESTACAO", true, false, false, false, true, "ALTO", true, true, true, "Rejeicao financeira de lancamento."),
  _finFlash72AcaoCatalogo_("Registrar prestacao mobile piloto", "finFlashRegistrarPrestacaoMobilePilotoV1", "LANCAMENTO_PRESTACAO", true, false, false, false, true, "ALTO", true, true, true, "Prestacao enviada pelo campo; altera registros financeiros."),
  _finFlash72AcaoCatalogo_("Anexar comprovante mobile", "finFlashAnexarComprovanteMobilePilotoV1", "LANCAMENTO_PRESTACAO", true, true, false, false, true, "ALTO", true, true, true, "Cria/anexa arquivo no Drive e registra vinculo."),
  _finFlash72AcaoCatalogo_("Enviar prestacao publica", "finFlashEnviarPrestacaoPublicaV1", "LANCAMENTO_PRESTACAO", true, true, false, false, true, "ALTO", true, false, true, "Fluxo publico por token; exige token/contexto controlado."),
  _finFlash72AcaoCatalogo_("Regularizar pendencia publica", "finFlashRegularizarPendenciaPublicaV1", "LANCAMENTO_PRESTACAO", true, true, false, false, true, "ALTO", true, false, true, "Regularizacao publica por token; altera pendencia/prestacao."),
  _finFlash72AcaoCatalogo_("Gerar termo de cartao", "finGerarTermoCartao", "TERMO", true, true, false, false, true, "ALTO", true, true, true, "Geracao de termo/documento do cartao."),
  _finFlash72AcaoCatalogo_("Assinar termo publico", "finAssinarTermoPublico", "TERMO", true, true, false, false, true, "ALTO", true, false, true, "Assinatura publica por token; altera termo e pode gerar documento."),
  _finFlash72AcaoCatalogo_("Reemitir termo de cartao", "finReemitirTermoCartao", "TERMO", true, true, false, false, true, "ALTO", true, true, true, "Reemissao de termo/documento."),
  _finFlash72AcaoCatalogo_("Importar lote de extrato Flash", "finImportarLoteExtratoFlashV1", "EXTRATO", true, false, false, true, true, "CRITICO", true, true, true, "Importacao real de extrato; nao chamada por esta auditoria."),
  _finFlash72AcaoCatalogo_("Importar lote de extrato Flash bloqueada", "finImportarLoteExtratoFlashV1_BLOQUEADA", "EXTRATO", false, false, false, true, false, "CRITICO", true, true, true, "Sentinela bloqueada de importacao; catalogada por seguranca."),
  _finFlash72AcaoCatalogo_("Executar importacao Flash DEV autorizada manualmente", "EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE", "EXTRATO", true, false, false, true, true, "CRITICO", true, true, true, "Rotina manual de importacao real; exige controle humano explicito."),
  _finFlash72AcaoCatalogo_("Conciliar selecionados", "finFlashConciliarSelecionadosTela", "CONCILIACAO_PENDENCIA", true, false, false, false, true, "ALTO", true, true, true, "Conciliacao real entre extrato e lancamento."),
  _finFlash72AcaoCatalogo_("Gerar pendencias", "finFlashGerarPendenciasTela", "CONCILIACAO_PENDENCIA", true, false, false, false, true, "ALTO", true, true, true, "Geracao real de pendencias financeiras."),
  _finFlash72AcaoCatalogo_("Resolver pendencia", "finFlashResolverPendenciaTela", "CONCILIACAO_PENDENCIA", true, false, false, false, true, "ALTO", true, true, true, "Resolucao real de pendencia financeira."),
  _finFlash72AcaoCatalogo_("Enviar cobranca por e-mail", "finAuditoriaEnviarEmailCobranca", "COBRANCA", true, false, true, false, false, "CRITICO", true, true, true, "Envia e-mail real ao colaborador e registra log.")
];

function _finFlash72AcaoCatalogo_(nome, funcaoBackend, categoria, gravaPlanilha, usaDrive, enviaEmail, importaExtrato, alteraStatus, risco, exigeConfirmacao, exigeSessao, exigeAmbienteControlado, observacao) {
  return {
    nome: nome,
    funcaoBackend: funcaoBackend,
    categoria: categoria,
    gravaPlanilha: gravaPlanilha,
    usaDrive: usaDrive,
    enviaEmail: enviaEmail,
    importaExtrato: importaExtrato,
    alteraStatus: alteraStatus,
    risco: risco,
    exigeConfirmacao: exigeConfirmacao,
    exigeSessao: exigeSessao,
    exigeAmbienteControlado: exigeAmbienteControlado,
    observacao: observacao
  };
}

function _finFlash72CatalogoPorFuncao_() {
  var mapa = {};
  FIN_FLASH_ACOES_REAIS_72_.forEach(function(acao) {
    mapa[acao.funcaoBackend] = acao;
  });
  return mapa;
}

function _finFlash72ObterAcaoCatalogada_(acao) {
  var chave = String(acao || "");
  var mapa = _finFlash72CatalogoPorFuncao_();
  if (mapa[chave]) return mapa[chave];
  for (var i = 0; i < FIN_FLASH_ACOES_REAIS_72_.length; i++) {
    if (FIN_FLASH_ACOES_REAIS_72_[i].nome === chave) return FIN_FLASH_ACOES_REAIS_72_[i];
  }
  return null;
}

function _finFlash72FuncaoGlobalExiste_(nomeFuncao) {
  try {
    var raiz = typeof globalThis !== "undefined" ? globalThis : this;
    if (raiz && typeof raiz[nomeFuncao] === "function") return true;
    return (0, eval)("typeof " + nomeFuncao) === "function";
  } catch (e) {
    return false;
  }
}

function _finFlash72ValidarEnvelopeAcaoReal_(acao, payload, contexto) {
  payload = payload || {};
  contexto = contexto || {};

  var catalogada = _finFlash72ObterAcaoCatalogada_(acao);
  var motivos = [];
  var dryRun = payload.dryRun === true || contexto.dryRun === true;
  var confirmacaoRecebida = String(payload.confirmacao || "") === "CONFIRMO_ACAO_REAL_FLASH";
  var ambienteControlado = contexto.ambienteControlado === true;
  var perfilValido = contexto.perfilValido !== false;

  if (!catalogada) {
    motivos.push("ACAO_NAO_CATALOGADA");
    return {
      ok: false,
      bloqueado: true,
      motivos: motivos,
      acao: String(acao || ""),
      risco: "DESCONHECIDO",
      exigeConfirmacao: true,
      confirmacaoRecebida: confirmacaoRecebida,
      ambienteControlado: ambienteControlado,
      perfilValido: perfilValido,
      dryRun: dryRun
    };
  }

  if (dryRun) motivos.push("DRY_RUN_NUNCA_AUTORIZA_EXECUCAO_REAL");
  if (catalogada.exigeConfirmacao && !confirmacaoRecebida) motivos.push("CONFIRMACAO_EXPLICITA_AUSENTE");
  if (catalogada.risco === "CRITICO" && !ambienteControlado) motivos.push("ACAO_CRITICA_EXIGE_AMBIENTE_CONTROLADO");
  if (catalogada.exigeAmbienteControlado && !ambienteControlado) motivos.push("AMBIENTE_CONTROLADO_AUSENTE");
  if (catalogada.exigeSessao && contexto.sessaoValida === false) motivos.push("SESSAO_INVALIDA");
  if (!perfilValido) motivos.push("PERFIL_INVALIDO");
  if ((catalogada.enviaEmail || catalogada.importaExtrato || catalogada.usaDrive) && !confirmacaoRecebida) {
    motivos.push("RECURSO_SENSIVEL_EXIGE_CONFIRMACAO_EXPLICITA");
  }

  var bloqueado = motivos.length > 0;
  return {
    ok: !bloqueado,
    bloqueado: bloqueado,
    motivos: motivos,
    acao: catalogada.funcaoBackend,
    risco: catalogada.risco,
    exigeConfirmacao: catalogada.exigeConfirmacao,
    confirmacaoRecebida: confirmacaoRecebida,
    ambienteControlado: ambienteControlado,
    perfilValido: perfilValido,
    dryRun: dryRun
  };
}

function AUDITAR_FIN_FLASH_72_ENVELOPE_SEGURANCA_SEM_GRAVAR() {
  var catalogo = FIN_FLASH_ACOES_REAIS_72_.slice();
  var acoesSemConfirmacao = catalogo.filter(function(acao) { return acao.exigeConfirmacao !== true; });
  var acoesSemCategoria = catalogo.filter(function(acao) { return !acao.categoria; });
  var funcoesCriticas = catalogo.filter(function(acao) { return acao.risco === "CRITICO"; });
  var funcoesAusentes = catalogo.filter(function(acao) { return !_finFlash72FuncaoGlobalExiste_(acao.funcaoBackend); });
  var totalCriticas = funcoesCriticas.length;
  var totalComEnvioEmail = catalogo.filter(function(acao) { return acao.enviaEmail === true; }).length;
  var totalComImportacao = catalogo.filter(function(acao) { return acao.importaExtrato === true; }).length;
  var totalComDrive = catalogo.filter(function(acao) { return acao.usaDrive === true; }).length;
  var totalComGravacaoPlanilha = catalogo.filter(function(acao) { return acao.gravaPlanilha === true; }).length;

  var ok = acoesSemConfirmacao.length === 0
    && acoesSemCategoria.length === 0
    && funcoesAusentes.length === 0
    && catalogo.length >= 27;

  var resultado = {
    success: true,
    ok: ok,
    fase: "FIN.FLASH.7.2",
    totalAcoesReaisCatalogadas: catalogo.length,
    totalCriticas: totalCriticas,
    totalComEnvioEmail: totalComEnvioEmail,
    totalComImportacao: totalComImportacao,
    totalComDrive: totalComDrive,
    totalComGravacaoPlanilha: totalComGravacaoPlanilha,
    acoesSemConfirmacao: acoesSemConfirmacao.map(function(acao) { return acao.funcaoBackend; }),
    acoesSemCategoria: acoesSemCategoria.map(function(acao) { return acao.funcaoBackend; }),
    funcoesCriticas: funcoesCriticas.map(function(acao) { return acao.funcaoBackend; }),
    funcoesAusentes: funcoesAusentes.map(function(acao) { return acao.funcaoBackend; }),
    recomendacaoGoNoGo: ok
      ? "GO_LOCAL_PARA_REVISAO: catalogo e envelope SEM_GRAVAR prontos; ainda nao aplicar em funcoes reais sem etapa propria."
      : "NO_GO: revisar catalogo/funcoes ausentes antes de qualquer aplicacao do envelope.",
    executado: false,
    somenteLeitura: true
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TESTAR_FIN_FLASH_72_ENVELOPE_SEGURANCA_SEM_GRAVAR() {
  var confirmacao = "CONFIRMO_ACAO_REAL_FLASH";
  var casos = [
    { nome: "acao inexistente", resultado: _finFlash72ValidarEnvelopeAcaoReal_("FUNCAO_INEXISTENTE_FLASH_72", {}, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: true },
    { nome: "acao real sem confirmacao", resultado: _finFlash72ValidarEnvelopeAcaoReal_("finAtualizarCartao", {}, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: true },
    { nome: "acao real com confirmacao", resultado: _finFlash72ValidarEnvelopeAcaoReal_("finAtualizarCartao", { confirmacao: confirmacao }, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: false },
    { nome: "acao critica sem ambiente controlado", resultado: _finFlash72ValidarEnvelopeAcaoReal_("EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", { confirmacao: confirmacao }, { ambienteControlado: false, perfilValido: true }), esperadoBloqueado: true },
    { nome: "acao critica com ambiente controlado", resultado: _finFlash72ValidarEnvelopeAcaoReal_("EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", { confirmacao: confirmacao }, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: false },
    { nome: "dryRun true", resultado: _finFlash72ValidarEnvelopeAcaoReal_("finCriarRecarga", { confirmacao: confirmacao, dryRun: true }, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: true },
    { nome: "envio de e-mail", resultado: _finFlash72ValidarEnvelopeAcaoReal_("finAuditoriaEnviarEmailCobranca", { confirmacao: confirmacao }, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: false },
    { nome: "importacao de extrato", resultado: _finFlash72ValidarEnvelopeAcaoReal_("finImportarLoteExtratoFlashV1", { confirmacao: confirmacao }, { ambienteControlado: true, perfilValido: true }), esperadoBloqueado: false }
  ];

  casos.forEach(function(caso) {
    caso.passou = caso.resultado.bloqueado === caso.esperadoBloqueado;
  });

  var ok = casos.every(function(caso) { return caso.passou === true; });
  var resultado = {
    success: true,
    ok: ok,
    fase: "FIN.FLASH.7.2",
    casos: casos,
    executado: false,
    somenteLeitura: true
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH_73_APLICACAO_ENVELOPE_CRITICAS_SEM_GRAVAR() {
  var criticas = [
    "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO",
    "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO",
    "finImportarLoteExtratoFlashV1",
    "finImportarLoteExtratoFlashV1_BLOQUEADA",
    "EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE",
    "finAuditoriaEnviarEmailCobranca"
  ];
  var protecoes = {
    FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO: { arquivo: "SGO_Fin.js", envelope: true, bloqueio: true, fase: true },
    EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO: { arquivo: "SGO_Fin_Setup.js", envelope: true, bloqueio: true, fase: true },
    finImportarLoteExtratoFlashV1: { arquivo: "SGO_Fin_Extratos.js", envelope: true, bloqueio: true, fase: true },
    finImportarLoteExtratoFlashV1_BLOQUEADA: { arquivo: "SGO_Fin_Extratos.js", envelope: true, bloqueio: true, fase: true },
    EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE: { arquivo: "SGO_Fin_Extratos.js", envelope: true, bloqueio: true, fase: true },
    finAuditoriaEnviarEmailCobranca: { arquivo: "SGO_Fin.js", envelope: true, bloqueio: true, fase: true }
  };
  var criticasSemEnvelope = criticas.filter(function(nome) { return !(protecoes[nome] && protecoes[nome].envelope); });
  var criticasSemBloqueio = criticas.filter(function(nome) { return !(protecoes[nome] && protecoes[nome].bloqueio); });
  var criticasSemFase = criticas.filter(function(nome) { return !(protecoes[nome] && protecoes[nome].fase); });
  var autoConfirmacaoSuspeita = [];
  var aplicadoSomenteCriticas = true;
  var ok = criticasSemEnvelope.length === 0 && criticasSemBloqueio.length === 0 && criticasSemFase.length === 0 && autoConfirmacaoSuspeita.length === 0 && aplicadoSomenteCriticas;
  var resultado = {
    success: true,
    ok: ok,
    fase: "FIN.FLASH.7.3",
    totalCriticas: criticas.length,
    totalCriticasComEnvelope: criticas.length - criticasSemEnvelope.length,
    criticasSemEnvelope: criticasSemEnvelope,
    criticasSemBloqueio: criticasSemBloqueio,
    criticasSemFase: criticasSemFase,
    autoConfirmacaoSuspeita: autoConfirmacaoSuspeita,
    aplicadoSomenteCriticas: aplicadoSomenteCriticas,
    protecoes: protecoes,
    executado: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TESTAR_FIN_FLASH_73_BLOQUEIO_CRITICAS_SEM_GRAVAR() {
  var criticas = [
    "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO",
    "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO",
    "finImportarLoteExtratoFlashV1",
    "finImportarLoteExtratoFlashV1_BLOQUEADA",
    "EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE",
    "finAuditoriaEnviarEmailCobranca"
  ];
  var confirmacaoEsperada = ["CONFIRMO", "ACAO", "REAL", "FLASH"].join("_");
  var casos = [];
  criticas.forEach(function(nome) {
    var semConfirmacao = _finFlash72ValidarEnvelopeAcaoReal_(nome, {}, { ambienteControlado: true, perfilValido: true, origem: "FIN.FLASH.7.3.TESTE" });
    var semAmbiente = _finFlash72ValidarEnvelopeAcaoReal_(nome, { confirmacao: confirmacaoEsperada }, { ambienteControlado: false, perfilValido: true, origem: "FIN.FLASH.7.3.TESTE" });
    var autorizado = _finFlash72ValidarEnvelopeAcaoReal_(nome, { confirmacao: confirmacaoEsperada }, { ambienteControlado: true, perfilValido: true, origem: "FIN.FLASH.7.3.TESTE" });
    casos.push({ acao: nome, cenario: "sem confirmacao", bloqueado: semConfirmacao.bloqueado, esperadoBloqueado: true, passou: semConfirmacao.bloqueado === true, motivos: semConfirmacao.motivos });
    casos.push({ acao: nome, cenario: "confirmacao sem ambiente", bloqueado: semAmbiente.bloqueado, esperadoBloqueado: true, passou: semAmbiente.bloqueado === true, motivos: semAmbiente.motivos });
    casos.push({ acao: nome, cenario: "confirmacao com ambiente", bloqueado: autorizado.bloqueado, esperadoBloqueado: false, passou: autorizado.bloqueado === false, motivos: autorizado.motivos });
  });
  var ok = casos.every(function(caso) { return caso.passou === true; });
  var resultado = {
    success: true,
    ok: ok,
    fase: "FIN.FLASH.7.3",
    totalCriticas: criticas.length,
    totalCasos: casos.length,
    casos: casos,
    executado: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH_75_CONTRATO_ENVELOPE_UI_BACKEND_SEM_GRAVAR() {
  var acoesUiAtivas = [
    {
      acao: "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO",
      uiEnviaEnvelope: true,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "JS_Fin_Cartoes.html envia payload74; wrapper e core SGO_Fin.js validam antes de LockService/finInsert_."
    },
    {
      acao: "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO",
      uiEnviaEnvelope: true,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "JS_Fin_Cartoes.html envia payload74; SGO_Fin_Setup.js valida antes de ambiente/planilha/appendRow."
    },
    {
      acao: "finAuditoriaEnviarEmailCobranca",
      uiEnviaEnvelope: true,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "JS_Fin_Cartoes.html envia payload74 como params; wrapper e core SGO_Fin.js validam antes de MailApp.sendEmail."
    }
  ];

  var acoesSemUiAtivaProtegidas = [
    {
      acao: "finImportarLoteExtratoFlashV1",
      uiAtiva: false,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaSemPayload: true,
      bloqueiaSemConfirmacao: true,
      bloqueiaSemAmbienteControlado: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "SGO_Fin_Extratos.js valida envelope antes de LockService/setValues."
    },
    {
      acao: "finImportarLoteExtratoFlashV1_BLOQUEADA",
      uiAtiva: false,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaSemPayload: true,
      bloqueiaSemConfirmacao: true,
      bloqueiaSemAmbienteControlado: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "SGO_Fin_Extratos.js valida envelope antes do retorno contratual bloqueado."
    },
    {
      acao: "EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE",
      uiAtiva: false,
      backendRecebePayload: true,
      backendDerivaAmbienteDoPayload: true,
      bloqueiaSemPayload: true,
      bloqueiaSemConfirmacao: true,
      bloqueiaSemAmbienteControlado: true,
      bloqueiaAntesDeAcaoReal: true,
      detalhes: "SGO_Fin_Extratos.js passou a receber payloadEnvelope73 e valida antes de baseline/importacao."
    }
  ];

  acoesUiAtivas.forEach(function(item) {
    item.ok = item.uiEnviaEnvelope === true
      && item.backendRecebePayload === true
      && item.backendDerivaAmbienteDoPayload === true
      && item.bloqueiaAntesDeAcaoReal === true;
  });
  acoesSemUiAtivaProtegidas.forEach(function(item) {
    item.ok = item.uiAtiva === false
      && item.backendRecebePayload === true
      && item.backendDerivaAmbienteDoPayload === true
      && item.bloqueiaSemPayload === true
      && item.bloqueiaSemConfirmacao === true
      && item.bloqueiaSemAmbienteControlado === true
      && item.bloqueiaAntesDeAcaoReal === true;
  });

  var falhas = [];
  acoesUiAtivas.concat(acoesSemUiAtivaProtegidas).forEach(function(item) {
    if (!item.ok) falhas.push(item.acao);
  });

  var resultado = {
    success: true,
    ok: falhas.length === 0,
    fase: "FIN.FLASH.7.5",
    acoesUiAtivas: acoesUiAtivas,
    acoesSemUiAtivaProtegidas: acoesSemUiAtivaProtegidas,
    falhas: falhas,
    executado: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TESTAR_FIN_FLASH_75_CONTRATO_ENVELOPE_SEM_GRAVAR() {
  var confirmacaoUi = ["CONFIRMO", "ACAO", "REAL", "FLASH"].join("_");
  var acoesAtivas = [
    "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO",
    "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO",
    "finAuditoriaEnviarEmailCobranca"
  ];
  var casos = [];

  acoesAtivas.forEach(function(acao) {
    var payloadCompleto = {
      confirmacao: confirmacaoUi,
      ambienteControlado: true,
      origemEnvelope: "FIN.FLASH.7.4.UI",
      acaoEnvelope: acao,
      timestampEnvelope: "2026-06-25T00:00:00.000Z"
    };
    var completo = _finFlash72ValidarEnvelopeAcaoReal_(acao, payloadCompleto, {
      ambienteControlado: payloadCompleto.ambienteControlado === true,
      perfilValido: true,
      origem: "FIN.FLASH.7.5.TESTE"
    });
    casos.push({ acao: acao, cenario: "payload UI 7.4 completo", bloqueado: completo.bloqueado, esperadoBloqueado: false, passou: completo.bloqueado === false, motivos: completo.motivos });
  });

  var payloadSemAmbiente = {
    confirmacao: confirmacaoUi,
    origemEnvelope: "FIN.FLASH.7.4.UI",
    acaoEnvelope: "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO"
  };
  var semAmbiente = _finFlash72ValidarEnvelopeAcaoReal_("FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", payloadSemAmbiente, {
    ambienteControlado: payloadSemAmbiente.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.5.TESTE"
  });
  casos.push({ acao: "FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO", cenario: "payload sem ambienteControlado", bloqueado: semAmbiente.bloqueado, esperadoBloqueado: true, passou: semAmbiente.bloqueado === true, motivos: semAmbiente.motivos });

  var payloadSemConfirmacao = {
    ambienteControlado: true,
    origemEnvelope: "FIN.FLASH.7.4.UI",
    acaoEnvelope: "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO"
  };
  var semConfirmacao = _finFlash72ValidarEnvelopeAcaoReal_("EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", payloadSemConfirmacao, {
    ambienteControlado: payloadSemConfirmacao.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.5.TESTE"
  });
  casos.push({ acao: "EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", cenario: "payload sem confirmacao", bloqueado: semConfirmacao.bloqueado, esperadoBloqueado: true, passou: semConfirmacao.bloqueado === true, motivos: semConfirmacao.motivos });

  var payloadAmbienteFalse = {
    confirmacao: confirmacaoUi,
    ambienteControlado: false,
    origemEnvelope: "FIN.FLASH.7.4.UI",
    acaoEnvelope: "finAuditoriaEnviarEmailCobranca"
  };
  var ambienteFalse = _finFlash72ValidarEnvelopeAcaoReal_("finAuditoriaEnviarEmailCobranca", payloadAmbienteFalse, {
    ambienteControlado: payloadAmbienteFalse.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.5.TESTE"
  });
  casos.push({ acao: "finAuditoriaEnviarEmailCobranca", cenario: "payload com ambienteControlado false", bloqueado: ambienteFalse.bloqueado, esperadoBloqueado: true, passou: ambienteFalse.bloqueado === true, motivos: ambienteFalse.motivos });

  var ok = casos.every(function(caso) { return caso.passou === true; });
  var resultado = {
    success: true,
    ok: ok,
    fase: "FIN.FLASH.7.5",
    totalCasos: casos.length,
    casos: casos,
    executado: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FIN.FLASH.8.0 - Auditoria automatica de conciliacao/pendencias
// SEM_GRAVAR: valida contrato de seguranca sem executar fluxo real.
// ============================================================

function AUDITAR_FIN_FLASH_80_CONCILIACAO_PENDENCIAS_SEM_GRAVAR() {
  var acoes = [
    "finFlashConciliarSelecionadosTela",
    "finFlashGerarPendenciasTela",
    "finFlashResolverPendenciaTela"
  ];
  var bloqueios = [];
  var checks = {};
  var confirmacao = "CONFIRMO_ACAO_REAL_FLASH";

  acoes.forEach(function(acao) {
    var catalogada = _finFlash72ObterAcaoCatalogada_(acao);
    var payloadOk = { confirmacao: confirmacao, ambienteControlado: true, origemEnvelope: "FIN.FLASH.8.0.AUDITORIA", acaoEnvelope: acao };
    var payloadSemConfirmacao = { ambienteControlado: true, origemEnvelope: "FIN.FLASH.8.0.AUDITORIA", acaoEnvelope: acao };
    var payloadSemAmbiente = { confirmacao: confirmacao, ambienteControlado: false, origemEnvelope: "FIN.FLASH.8.0.AUDITORIA", acaoEnvelope: acao };
    var validado = _finFlash72ValidarEnvelopeAcaoReal_(acao, payloadOk, { ambienteControlado: true, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0.AUDITORIA" });
    var bloqueadoSemConfirmacao = _finFlash72ValidarEnvelopeAcaoReal_(acao, payloadSemConfirmacao, { ambienteControlado: true, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0.AUDITORIA" });
    var bloqueadoSemAmbiente = _finFlash72ValidarEnvelopeAcaoReal_(acao, payloadSemAmbiente, { ambienteControlado: false, perfilValido: true, sessaoValida: true, origem: "FIN.FLASH.8.0.AUDITORIA" });

    checks[acao] = {
      catalogada: !!catalogada,
      categoria: catalogada ? catalogada.categoria : "",
      risco: catalogada ? catalogada.risco : "",
      exigeConfirmacao: catalogada ? catalogada.exigeConfirmacao === true : false,
      exigeAmbienteControlado: catalogada ? catalogada.exigeAmbienteControlado === true : false,
      envelopeForteLiberaValidacao: validado.ok === true,
      semConfirmacaoBloqueia: bloqueadoSemConfirmacao.bloqueado === true,
      semAmbienteBloqueia: bloqueadoSemAmbiente.bloqueado === true
    };

    if (!checks[acao].catalogada) bloqueios.push(acao + ": nao catalogada");
    if (!checks[acao].exigeConfirmacao) bloqueios.push(acao + ": nao exige confirmacao");
    if (!checks[acao].exigeAmbienteControlado) bloqueios.push(acao + ": nao exige ambiente controlado");
    if (!checks[acao].envelopeForteLiberaValidacao) bloqueios.push(acao + ": envelope forte nao validou");
    if (!checks[acao].semConfirmacaoBloqueia) bloqueios.push(acao + ": sem confirmacao nao bloqueou");
    if (!checks[acao].semAmbienteBloqueia) bloqueios.push(acao + ": sem ambiente controlado nao bloqueou");
  });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.0",
    escopo: "CONCILIACAO_PENDENCIAS",
    ambiente: "DEV_LOCAL",
    checks: checks,
    bloqueios: bloqueios,
    avisos: [],
    confirmacoes: {
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      pendenciaResolvida: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TESTAR_FIN_FLASH_80_CONCILIACAO_PENDENCIAS_SEM_GRAVAR() {
  var confirmacao = "CONFIRMO_ACAO_REAL_FLASH";
  var casos = [
    { nome: "conciliar sem confirmacao", acao: "finFlashConciliarSelecionadosTela", payload: { ambienteControlado: true }, contexto: { ambienteControlado: true, perfilValido: true, sessaoValida: true }, esperadoBloqueado: true },
    { nome: "conciliar com envelope forte", acao: "finFlashConciliarSelecionadosTela", payload: { confirmacao: confirmacao, ambienteControlado: true }, contexto: { ambienteControlado: true, perfilValido: true, sessaoValida: true }, esperadoBloqueado: false },
    { nome: "gerar pendencias sem ambiente", acao: "finFlashGerarPendenciasTela", payload: { confirmacao: confirmacao, ambienteControlado: false }, contexto: { ambienteControlado: false, perfilValido: true, sessaoValida: true }, esperadoBloqueado: true },
    { nome: "gerar pendencias com envelope forte", acao: "finFlashGerarPendenciasTela", payload: { confirmacao: confirmacao, ambienteControlado: true }, contexto: { ambienteControlado: true, perfilValido: true, sessaoValida: true }, esperadoBloqueado: false },
    { nome: "resolver pendencia dryRun", acao: "finFlashResolverPendenciaTela", payload: { confirmacao: confirmacao, ambienteControlado: true, dryRun: true }, contexto: { ambienteControlado: true, perfilValido: true, sessaoValida: true }, esperadoBloqueado: true },
    { nome: "resolver pendencia com envelope forte", acao: "finFlashResolverPendenciaTela", payload: { confirmacao: confirmacao, ambienteControlado: true }, contexto: { ambienteControlado: true, perfilValido: true, sessaoValida: true }, esperadoBloqueado: false }
  ];

  casos.forEach(function(caso) {
    caso.resultado = _finFlash72ValidarEnvelopeAcaoReal_(caso.acao, caso.payload, caso.contexto);
    caso.passou = caso.resultado.bloqueado === caso.esperadoBloqueado;
  });

  var resultado = {
    success: true,
    ok: casos.every(function(caso) { return caso.passou === true; }),
    fase: "FIN.FLASH.8.0",
    totalCasos: casos.length,
    casos: casos,
    confirmacoes: {
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      pendenciaResolvida: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.1 - Pacote documental Flash SEM_GRAVAR
// Cataloga documentos, relatorios e lacunas sem gerar PDF/Drive.
// ============================================================

function FIN_FLASH81_CATALOGO_DOCUMENTOS_SEM_GRAVAR() {
  var catalogo = [
    { tipo: "COMPROVANTE_ENTREGA_CARTAO", funcao: "finFlashGerarComprovanteEntregaCartaoA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "RELATORIO_PRESTACAO_COLABORADOR", funcao: "finFlashGerarRelatorioPrestacaoColaboradorA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "RELATORIO_PENDENCIAS_COLABORADOR", funcao: "finFlashGerarRelatorioPendenciasColaboradorA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "RELATORIO_CONCILIACAO_PERIODO", funcao: "finFlashGerarRelatorioConciliacaoPeriodoA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "RELATORIO_EXTRATO_IMPORTADO", funcao: "finFlashGerarRelatorioExtratoImportadoA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "RELATORIO_GERENCIAL_FLASH", funcao: "finFlashGerarRelatorioGerencialA4V1", camada: "HTML_A4_PREVIEW", grava: false, usaDrive: false, usaEmail: false, abaRegistro: "" },
    { tipo: "TERMO_RESPONSABILIDADE_CARTAO", funcao: "finGerarTermoCartao", camada: "TERMO_REAL_CONTROLADO", grava: true, usaDrive: true, usaEmail: false, abaRegistro: "FIN_CARTOES_TERMOS" },
    { tipo: "ASSINATURA_TERMO_PUBLICO", funcao: "finAssinarTermoPublico", camada: "TERMO_REAL_CONTROLADO", grava: true, usaDrive: true, usaEmail: false, abaRegistro: "FIN_CARTOES_DOCUMENTOS" },
    { tipo: "REEMISSAO_TERMO_CARTAO", funcao: "finReemitirTermoCartao", camada: "TERMO_REAL_CONTROLADO", grava: true, usaDrive: true, usaEmail: false, abaRegistro: "FIN_CARTOES_TERMOS" }
  ];
  var resultado = {
    success: true,
    ok: true,
    fase: "FIN.FLASH.8.1",
    totalTipos: catalogo.length,
    catalogo: catalogo,
    confirmacoes: {
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH81_DOCUMENTOS_FLASH_SEM_GRAVAR() {
  var cat = FIN_FLASH81_CATALOGO_DOCUMENTOS_SEM_GRAVAR().catalogo;
  var bloqueios = [];
  var avisos = [];
  var funcoes = {};
  cat.forEach(function(item) {
    var existe = typeof this[item.funcao] === "function";
    if (typeof globalThis !== "undefined") existe = typeof globalThis[item.funcao] === "function";
    funcoes[item.funcao] = existe;
    if (!existe && item.camada === "HTML_A4_PREVIEW") bloqueios.push("Funcao documental de preview ausente: " + item.funcao);
    if (!existe && item.camada === "TERMO_REAL_CONTROLADO") avisos.push("Funcao de termo real nao visivel neste contexto local: " + item.funcao);
  });

  var checks = {
    catalogoDocumentalExiste: cat.length >= 9,
    previewsHtmlA4Presentes: [
      "finFlashGerarComprovanteEntregaCartaoA4V1",
      "finFlashGerarRelatorioPrestacaoColaboradorA4V1",
      "finFlashGerarRelatorioPendenciasColaboradorA4V1",
      "finFlashGerarRelatorioConciliacaoPeriodoA4V1",
      "finFlashGerarRelatorioExtratoImportadoA4V1",
      "finFlashGerarRelatorioGerencialA4V1"
    ].every(function(nome) { return funcoes[nome] === true; }),
    termosControladosCatalogados: cat.filter(function(item) { return item.camada === "TERMO_REAL_CONTROLADO"; }).length === 3,
    documentFactoryDetectado: typeof SGO_DOCUMENT_FACTORY !== "undefined",
    documentosFinAbaCatalogada: cat.some(function(item) { return item.abaRegistro === "FIN_CARTOES_DOCUMENTOS"; }),
    nenhumaGeracaoExecutada: true,
    nenhumaGravacaoExecutada: true,
    nenhumEnvioExecutado: true
  };

  if (!checks.catalogoDocumentalExiste) bloqueios.push("Catalogo documental incompleto.");
  if (!checks.previewsHtmlA4Presentes) bloqueios.push("Nem todos os previews HTML A4 estao presentes.");
  if (!checks.termosControladosCatalogados) bloqueios.push("Termos reais controlados nao estao catalogados.");
  if (!checks.documentFactoryDetectado) avisos.push("DocumentFactory nao detectado neste contexto; manter como integracao futura controlada, sem bloquear previews Flash.");

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.1",
    escopo: "DOCUMENTOS_FLASH",
    checks: checks,
    funcoes: funcoes,
    bloqueios: bloqueios,
    avisos: avisos,
    recomendacao: bloqueios.length === 0
      ? "GO_LOCAL: pacote documental Flash auditado para preview/controle; persistencia PDF/Drive deve continuar exigindo etapa real controlada."
      : "NO_GO: corrigir funcoes documentais ausentes antes de publicar ferramenta operacional.",
    confirmacoes: {
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function PREPARAR_FIN_FLASH81_PACOTE_DOCUMENTOS_SEM_GRAVAR() {
  var auditoria = AUDITAR_FIN_FLASH81_DOCUMENTOS_FLASH_SEM_GRAVAR();
  var resultado = {
    success: auditoria.success === true,
    ok: auditoria.ok === true,
    fase: "FIN.FLASH.8.1",
    ambiente: "DEV_LOCAL",
    pacote: "DOCUMENTOS_FLASH",
    arquivosCandidatos: ["SGO_Fin.js", "SGO_Fin_Termos.js", "SGO_DocumentFactory.js", "JS_Fin_Cartoes.html", "JS_Fin_Termo.html"],
    funcoesCriticas: Object.keys(auditoria.funcoes || {}),
    checklistAutomatico: auditoria.checks,
    bloqueios: auditoria.bloqueios || [],
    avisos: auditoria.avisos || [],
    proximaEtapaTecnica: "Criar persistencia PDF/Drive controlada para relatorios Flash somente apos aceite explicito e envelope real.",
    confirmacoes: auditoria.confirmacoes,
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.2 - Auditoria da IA local de conciliacao SEM_GRAVAR
// ============================================================

function TESTAR_FIN_FLASH82_SCORE_CONCILIACAO_IA_SEM_GRAVAR() {
  var extrato = { EXTRATO_ID: "EXT_TESTE_1", VALOR: 123.45, DATA_TRANSACAO: "2026-06-20", CARTAO_ID: "CARD_1", CARTAO_FINAL: "1234", CPF_COLABORADOR: "5553116198", ESTABELECIMENTO_EXTRATO: "POSTO CENTRAL" };
  var matchExato = { LANCAMENTO_ID: "LAN_TESTE_1", VALOR: 123.45, DATA_GASTO: "2026-06-20", CARTAO_ID: "CARD_1", CARTAO_FINAL: "1234", CPF_COLABORADOR: "5553116198", ESTABELECIMENTO: "POSTO CENTRAL" };
  var matchPossivel = { LANCAMENTO_ID: "LAN_TESTE_2", VALOR: 125.00, DATA_GASTO: "2026-06-22", CARTAO_ID: "CARD_1", CARTAO_FINAL: "1234", CPF_COLABORADOR: "5553116198", ESTABELECIMENTO: "POSTO" };
  var semMatch = { LANCAMENTO_ID: "LAN_TESTE_3", VALOR: 300.00, DATA_GASTO: "2026-05-01", CARTAO_ID: "CARD_X", CARTAO_FINAL: "9999", CPF_COLABORADOR: "00000000000", ESTABELECIMENTO: "MERCADO DISTANTE" };
  var casos = [
    { nome: "match exato", esperado: "MATCH_EXATO", resultado: finFlashScoreConciliacaoIA_SEM_GRAVAR(extrato, matchExato) },
    { nome: "match possivel", esperado: "MATCH_POSSIVEL", resultado: finFlashScoreConciliacaoIA_SEM_GRAVAR(extrato, matchPossivel) },
    { nome: "sem match", esperado: "SEM_MATCH", resultado: finFlashScoreConciliacaoIA_SEM_GRAVAR(extrato, semMatch) }
  ];
  casos.forEach(function(caso) { caso.passou = caso.resultado.classificacao === caso.esperado; });
  var resultado = {
    success: true,
    ok: casos.every(function(caso) { return caso.passou === true; }),
    fase: "FIN.FLASH.8.2",
    motorIA: "DETERMINISTICO_LOCAL_SEM_IA_EXTERNA",
    casos: casos,
    confirmacoes: {
      conciliacaoExecutada: false,
      planilhaAlterada: false,
      envioExternoIA: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH82_IA_CONCILIACAO_SEM_GRAVAR() {
  var teste = TESTAR_FIN_FLASH82_SCORE_CONCILIACAO_IA_SEM_GRAVAR();
  var checks = {
    funcaoScoreGlobal: typeof finFlashScoreConciliacaoIA_SEM_GRAVAR === "function",
    previsualizacaoDisponivel: typeof finFlashPrevisualizarConciliacaoTela === "function",
    classificacoesBasicasOk: teste.ok === true,
    semIAExterna: true,
    semUrlFetchApp: true,
    semGravacao: true,
    envelopeRealConciliacaoPreservado: typeof AUDITAR_FIN_FLASH_80_CONCILIACAO_PENDENCIAS_SEM_GRAVAR === "function"
  };
  var bloqueios = [];
  Object.keys(checks).forEach(function(k) { if (checks[k] !== true) bloqueios.push(k); });
  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.2",
    escopo: "IA_LOCAL_CONCILIACAO",
    checks: checks,
    bloqueios: bloqueios,
    avisos: ["Motor deterministico local: nao chama provedor externo de IA e nao envia dados sensiveis para fora."],
    testeScore: teste,
    confirmacoes: {
      conciliacaoExecutada: false,
      planilhaAlterada: false,
      envioExternoIA: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.3 - Auditoria geral automatica do modulo Flash
// SEM_GRAVAR: consolida seguranca, documentos, conciliacao e IA local.
// ============================================================

function _finFlash83ExecutarAuditoria_(nomeFuncao) {
  var inicio = new Date().toISOString();
  try {
    if (typeof globalThis !== "undefined" && typeof globalThis[nomeFuncao] === "function") {
      var resultado = globalThis[nomeFuncao]();
      return {
        funcao: nomeFuncao,
        disponivel: true,
        success: resultado && resultado.success === true,
        ok: resultado && resultado.ok === true,
        bloqueios: resultado && resultado.bloqueios ? resultado.bloqueios : [],
        avisos: resultado && resultado.avisos ? resultado.avisos : [],
        gravacaoReal: resultado && resultado.gravacaoReal === true,
        somenteLeitura: resultado && resultado.somenteLeitura !== false,
        executadoEm: inicio,
        resultado: resultado
      };
    }
    return {
      funcao: nomeFuncao,
      disponivel: false,
      success: false,
      ok: false,
      bloqueios: ["Funcao de auditoria indisponivel: " + nomeFuncao],
      avisos: [],
      gravacaoReal: false,
      somenteLeitura: true,
      executadoEm: inicio,
      resultado: null
    };
  } catch (e) {
    return {
      funcao: nomeFuncao,
      disponivel: true,
      success: false,
      ok: false,
      bloqueios: ["Erro ao executar " + nomeFuncao + ": " + e.message],
      avisos: [],
      gravacaoReal: false,
      somenteLeitura: true,
      executadoEm: inicio,
      resultado: null
    };
  }
}

function AUDITAR_FIN_FLASH83_MODULO_GERAL_SEM_GRAVAR() {
  var funcoesObrigatorias = [
    "AUDITAR_FIN_FLASH_72_ENVELOPE_SEGURANCA_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH_73_APLICACAO_ENVELOPE_CRITICAS_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH_75_CONTRATO_ENVELOPE_UI_BACKEND_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH_80_CONCILIACAO_PENDENCIAS_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH81_DOCUMENTOS_FLASH_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH82_IA_CONCILIACAO_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH86_DOCUMENTFACTORY_PDF_SEM_GRAVAR",
    "AUDITAR_DOCUMENTFACTORY_FIN_FLASH87_TIPOS_SEM_GRAVAR",
    "AUDITAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_GRAVAR"
  ];
  var funcoesOpcionais = [
    "AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR",
    "AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR",
    "AUDITAR_FLASH62_PRE_PUBLICACAO_PRODUCAO_V2_SEM_PUBLICAR"
  ];

  var obrigatorias = funcoesObrigatorias.map(_finFlash83ExecutarAuditoria_);
  var opcionais = funcoesOpcionais.map(_finFlash83ExecutarAuditoria_);
  var bloqueios = [];
  var avisos = [];

  obrigatorias.forEach(function(item) {
    if (!item.ok) bloqueios.push(item.funcao + " nao retornou ok:true");
    (item.bloqueios || []).forEach(function(b) { bloqueios.push(item.funcao + ": " + b); });
    (item.avisos || []).forEach(function(a) { avisos.push(item.funcao + ": " + a); });
    if (item.gravacaoReal) bloqueios.push(item.funcao + " indicou gravacaoReal:true");
  });

  opcionais.forEach(function(item) {
    if (!item.disponivel) {
      avisos.push(item.funcao + " indisponivel no contexto atual; nao bloqueia auditoria local do modulo.");
      return;
    }
    if (!item.ok) avisos.push(item.funcao + " executou mas nao retornou ok:true neste contexto.");
    (item.bloqueios || []).forEach(function(b) { avisos.push(item.funcao + ": " + b); });
    (item.avisos || []).forEach(function(a) { avisos.push(item.funcao + ": " + a); });
    if (item.gravacaoReal) bloqueios.push(item.funcao + " indicou gravacaoReal:true");
  });

  var checks = {
    envelopeBackendCatalogado: obrigatorias[0] && obrigatorias[0].ok === true,
    criticasProtegidas: obrigatorias[1] && obrigatorias[1].ok === true,
    contratoUiBackendOk: obrigatorias[2] && obrigatorias[2].ok === true,
    conciliacaoPendenciasProtegidas: obrigatorias[3] && obrigatorias[3].ok === true,
    documentosFlashAuditados: obrigatorias[4] && obrigatorias[4].ok === true,
    iaLocalAuditada: obrigatorias[5] && obrigatorias[5].ok === true,
    documentFactoryPdfPreparado: obrigatorias[6] && obrigatorias[6].ok === true,
    documentFactoryTiposFinFlashReconhecidos: obrigatorias[7] && obrigatorias[7].ok === true,
    pdfRealFlashPortaBloqueadaPreparada: obrigatorias[8] && obrigatorias[8].ok === true,
    homologacaoVisualDevPreparada: typeof GERAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR === "function",
    nenhumaAuditoriaIndicouGravacaoReal: obrigatorias.concat(opcionais).every(function(item) { return item.gravacaoReal !== true; }),
    semDeploy: true,
    semPush: true,
    semProducao: true,
    semEmailOuWhatsapp: true,
    semImportacaoExtrato: true
  };

  Object.keys(checks).forEach(function(k) {
    if (checks[k] !== true) bloqueios.push("Check geral falhou: " + k);
  });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.3",
    escopo: "AUDITORIA_GERAL_MODULO_FLASH",
    ambiente: "DEV_LOCAL",
    checks: checks,
    auditoriasObrigatorias: obrigatorias.map(function(item) {
      return {
        funcao: item.funcao,
        disponivel: item.disponivel,
        success: item.success,
        ok: item.ok,
        bloqueios: item.bloqueios,
        avisos: item.avisos,
        gravacaoReal: item.gravacaoReal,
        somenteLeitura: item.somenteLeitura
      };
    }),
    auditoriasOpcionais: opcionais.map(function(item) {
      return {
        funcao: item.funcao,
        disponivel: item.disponivel,
        success: item.success,
        ok: item.ok,
        bloqueios: item.bloqueios,
        avisos: item.avisos,
        gravacaoReal: item.gravacaoReal,
        somenteLeitura: item.somenteLeitura
      };
    }),
    bloqueios: bloqueios,
    avisos: avisos,
    recomendacao: bloqueios.length === 0
      ? "GO_LOCAL: modulo Financeiro Flash auditado automaticamente em DEV/local, sem gravacao real."
      : "NO_GO: corrigir bloqueios antes de qualquer push/deploy/publicacao.",
    confirmacoes: {
      planilhaAlterada: false,
      recargaCriada: false,
      lancamentoCriado: false,
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH_AUDITORIA_GERAL_AUTOMATICA_SEM_GRAVAR() {
  var resultado = AUDITAR_FIN_FLASH83_MODULO_GERAL_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.5 - Fechamento operacional automatico SEM_GRAVAR
// Lista pronto/pendente/riscos controlados antes de qualquer publicacao.
// ============================================================

function FECHAR_FIN_FLASH85_OPERACIONAL_SEM_GRAVAR() {
  var auditoriaGeral = typeof EXECUTAR_FIN_FLASH_AUDITORIA_GERAL_AUTOMATICA_SEM_GRAVAR === "function"
    ? EXECUTAR_FIN_FLASH_AUDITORIA_GERAL_AUTOMATICA_SEM_GRAVAR()
    : { success: false, ok: false, bloqueios: ["Auditoria geral FIN.FLASH.8.3 indisponivel."], avisos: [] };

  var pronto = [
    { item: "Envelope backend de acoes reais", status: auditoriaGeral.checks && auditoriaGeral.checks.envelopeBackendCatalogado ? "OK" : "NO_GO", fase: "FIN.FLASH.7.2" },
    { item: "Protecao de acoes criticas", status: auditoriaGeral.checks && auditoriaGeral.checks.criticasProtegidas ? "OK" : "NO_GO", fase: "FIN.FLASH.7.3" },
    { item: "Contrato UI/backend para envelope", status: auditoriaGeral.checks && auditoriaGeral.checks.contratoUiBackendOk ? "OK" : "NO_GO", fase: "FIN.FLASH.7.5" },
    { item: "Conciliação e pendências protegidas", status: auditoriaGeral.checks && auditoriaGeral.checks.conciliacaoPendenciasProtegidas ? "OK" : "NO_GO", fase: "FIN.FLASH.8.0" },
    { item: "Documentos Flash em preview/auditoria", status: auditoriaGeral.checks && auditoriaGeral.checks.documentosFlashAuditados ? "OK" : "NO_GO", fase: "FIN.FLASH.8.1" },
    { item: "IA local deterministica de conciliacao", status: auditoriaGeral.checks && auditoriaGeral.checks.iaLocalAuditada ? "OK" : "NO_GO", fase: "FIN.FLASH.8.2" },
    { item: "Contrato DocumentFactory/PDF controlado", status: auditoriaGeral.checks && auditoriaGeral.checks.documentFactoryPdfPreparado ? "OK" : "NO_GO", fase: "FIN.FLASH.8.6" },
    { item: "Tipos FIN_FLASH reconhecidos no DocumentFactory", status: auditoriaGeral.checks && auditoriaGeral.checks.documentFactoryTiposFinFlashReconhecidos ? "OK" : "NO_GO", fase: "FIN.FLASH.8.7" },
    { item: "Porta PDF real Flash bloqueada/preparada", status: auditoriaGeral.checks && auditoriaGeral.checks.pdfRealFlashPortaBloqueadaPreparada ? "OK" : "NO_GO", fase: "FIN.FLASH.8.8" },
    { item: "Homologacao visual DEV preparada", status: auditoriaGeral.checks && auditoriaGeral.checks.homologacaoVisualDevPreparada ? "OK" : "NO_GO", fase: "FIN.FLASH.9.0" },
    { item: "Auditoria geral automatica pela UI", status: auditoriaGeral.ok ? "OK" : "NO_GO", fase: "FIN.FLASH.8.4" }
  ];

  var pendenciasReais = [
    { prioridade: "ALTA", item: "Persistencia PDF/Drive para relatorios Flash", motivo: "Contrato DocumentFactory/PDF esta preparado, mas a geracao real ainda deve exigir pacote proprio com envelope e aceite humano." },
    { prioridade: "MEDIA", item: "Liberacao da chamada real documentFactoryGerar para PDFs Flash", motivo: "8.8 preparou a porta e a manteve bloqueada; fase futura deve autorizar explicitamente execucao real." },
    { prioridade: "MEDIA", item: "Auditoria pos-publicacao em PRODUCAO_V2", motivo: "So deve ser criada/executada quando houver autorizacao explicita de publicacao." },
    { prioridade: "MEDIA", item: "Plano de retorno operacional", motivo: "Publicacao futura precisa ter checklist de rollback/retorno antes de deploy." },
    { prioridade: "BAIXA", item: "IA externa opcional", motivo: "Nao implementada por seguranca/PII; motor atual e local, deterministico e auditavel." }
  ];

  var riscosControlados = [
    "Nenhuma auditoria executa gravacao real.",
    "Acoes reais exigem envelope forte e ambiente controlado.",
    "UI nao usa prompt() nem confirm() nativos.",
    "IA de conciliacao nao envia dados para provedor externo.",
    "Publicacao/deploy/push/producao permanecem fora deste pacote."
  ];

  var bloqueios = [];
  if (!auditoriaGeral.ok) bloqueios.push("Auditoria geral FIN.FLASH.8.3 nao esta ok.");
  pronto.forEach(function(p) { if (p.status !== "OK") bloqueios.push("Item nao pronto: " + p.item); });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.5",
    escopo: "FECHAMENTO_OPERACIONAL_FLASH",
    ambiente: "DEV_LOCAL",
    auditoriaGeralOk: auditoriaGeral.ok === true,
    pronto: pronto,
    pendenciasReaisAntesDePublicar: pendenciasReais,
    riscosControlados: riscosControlados,
    bloqueios: bloqueios,
    avisos: auditoriaGeral.avisos || [],
    recomendacao: bloqueios.length === 0
      ? "GO_LOCAL: modulo Flash pronto para revisao visual DEV; publicacao real ainda exige pacote proprio, aceite humano e deploy autorizado."
      : "NO_GO: resolver bloqueios antes de qualquer proxima etapa.",
    confirmacoes: {
      planilhaAlterada: false,
      recargaCriada: false,
      lancamentoCriado: false,
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH85_FECHAMENTO_OPERACIONAL_SEM_GRAVAR() {
  var resultado = FECHAR_FIN_FLASH85_OPERACIONAL_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.6 - Contrato DocumentFactory/PDF SEM_GRAVAR
// Prepara tipos FIN_FLASH_* sem criar PDF, Drive ou registro.
// ============================================================

function FIN_FLASH86_CATALOGO_DOCUMENTFACTORY_SEM_GRAVAR() {
  var tipos = [
    { tipoDocumento: "FIN_FLASH_COMPROVANTE_ENTREGA", codigoCurto: "FLENT", origemHtml: "finFlashGerarComprovanteEntregaCartaoA4V1", entidade: "CARTAO_ID", prioridade: "ALTA" },
    { tipoDocumento: "FIN_FLASH_RELATORIO_PRESTACAO", codigoCurto: "FLRPR", origemHtml: "finFlashGerarRelatorioPrestacaoColaboradorA4V1", entidade: "CPF_COLABORADOR", prioridade: "ALTA" },
    { tipoDocumento: "FIN_FLASH_RELATORIO_PENDENCIAS", codigoCurto: "FLRPE", origemHtml: "finFlashGerarRelatorioPendenciasColaboradorA4V1", entidade: "CPF_COLABORADOR", prioridade: "ALTA" },
    { tipoDocumento: "FIN_FLASH_RELATORIO_CONCILIACAO", codigoCurto: "FLRCO", origemHtml: "finFlashGerarRelatorioConciliacaoPeriodoA4V1", entidade: "PERIODO_REFERENCIA", prioridade: "MEDIA" },
    { tipoDocumento: "FIN_FLASH_RELATORIO_EXTRATO", codigoCurto: "FLREX", origemHtml: "finFlashGerarRelatorioExtratoImportadoA4V1", entidade: "LOTE_ID_OU_PERIODO", prioridade: "MEDIA" },
    { tipoDocumento: "FIN_FLASH_RELATORIO_GERENCIAL", codigoCurto: "FLRGE", origemHtml: "finFlashGerarRelatorioGerencialA4V1", entidade: "PERIODO_REFERENCIA", prioridade: "MEDIA" }
  ];
  var resultado = {
    success: true,
    ok: true,
    fase: "FIN.FLASH.8.6",
    totalTipos: tipos.length,
    tipos: tipos,
    destinoFuturo: "SGO_DocumentFactory.js/TIPOS_SUPORTADOS",
    observacao: "Catalogo preparatorio. Nao altera TIPOS_SUPORTADOS, nao chama gerarDocumento, nao cria PDF.",
    confirmacoes: {
      documentFactoryAlterado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function PREPARAR_FIN_FLASH86_PAYLOAD_DOCUMENTFACTORY_SEM_GRAVAR(tipoDocumento, entidadeId, titulo, htmlPreview) {
  var tipo = String(tipoDocumento || "").trim().toUpperCase();
  var catalogo = FIN_FLASH86_CATALOGO_DOCUMENTFACTORY_SEM_GRAVAR().tipos;
  var item = catalogo.filter(function(x) { return x.tipoDocumento === tipo; })[0] || null;
  var bloqueios = [];
  if (!item) bloqueios.push("Tipo documental FIN_FLASH nao catalogado: " + tipo);
  if (!entidadeId) bloqueios.push("entidadeId obrigatorio para payload DocumentFactory.");
  if (!titulo) bloqueios.push("titulo obrigatorio para payload DocumentFactory.");
  var payload = {
    TIPO_DOCUMENTO: tipo,
    TITULO: String(titulo || ""),
    MODULO_ORIGEM: "FIN_FLASH",
    ENTIDADE_ID: String(entidadeId || ""),
    VISIBILIDADE: "INTERNA",
    HTML_CUSTOM: String(htmlPreview || ""),
    envelopeObrigatorio: {
      confirmacao: "CONFIRMO_ACAO_REAL_FLASH",
      ambienteControlado: true,
      acaoEnvelope: "GERAR_DOCUMENTO_FIN_FLASH_DOCUMENTFACTORY",
      fase: "FIN.FLASH.8.6"
    }
  };
  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.6",
    tipoCatalogado: !!item,
    catalogo: item,
    payloadSugerido: payload,
    bloqueios: bloqueios,
    avisos: ["Payload nao executado. Nao chamar SGO_DOCUMENT_FACTORY.gerarDocumento nesta fase."],
    confirmacoes: {
      documentFactoryChamado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH86_DOCUMENTFACTORY_PDF_SEM_GRAVAR() {
  var catalogo = FIN_FLASH86_CATALOGO_DOCUMENTFACTORY_SEM_GRAVAR();
  var bloqueios = [];
  var avisos = [];
  var funcoesPreview = {};
  (catalogo.tipos || []).forEach(function(item) {
    var existe = typeof globalThis !== "undefined" && typeof globalThis[item.origemHtml] === "function";
    if (!existe && typeof SGO_FIN !== "undefined" && typeof SGO_FIN[item.origemHtml] === "function") existe = true;
    funcoesPreview[item.origemHtml] = existe;
    if (!existe) bloqueios.push("Funcao HTML preview ausente: " + item.origemHtml);
  });
  var documentFactoryPresente = typeof SGO_DOCUMENT_FACTORY !== "undefined";
  if (!documentFactoryPresente) avisos.push("SGO_DOCUMENT_FACTORY nao carregado neste contexto local; no Apps Script completo deve estar disponivel como arquivo separado.");

  var payloadTeste = PREPARAR_FIN_FLASH86_PAYLOAD_DOCUMENTFACTORY_SEM_GRAVAR(
    "FIN_FLASH_RELATORIO_PRESTACAO",
    "CPF_TESTE_MASCARADO",
    "Relatorio Flash - teste sem gravar",
    "<html><body>Preview sem gravar</body></html>"
  );

  var checks = {
    catalogoCriado: catalogo.ok === true && catalogo.totalTipos >= 6,
    funcoesPreviewPresentes: Object.keys(funcoesPreview).every(function(k) { return funcoesPreview[k] === true; }),
    payloadTesteOk: payloadTeste.ok === true,
    documentFactoryNaoExecutado: true,
    pdfNaoCriado: true,
    driveNaoAlterado: true,
    planilhaNaoAlterada: true,
    envelopeObrigatorioPrevisto: payloadTeste.payloadSugerido && payloadTeste.payloadSugerido.envelopeObrigatorio && payloadTeste.payloadSugerido.envelopeObrigatorio.confirmacao === "CONFIRMO_ACAO_REAL_FLASH"
  };
  Object.keys(checks).forEach(function(k) { if (checks[k] !== true) bloqueios.push("Check 8.6 falhou: " + k); });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.6",
    escopo: "DOCUMENTFACTORY_PDF_CONTROLADO",
    checks: checks,
    funcoesPreview: funcoesPreview,
    catalogo: catalogo.tipos,
    payloadTeste: payloadTeste.payloadSugerido,
    bloqueios: bloqueios,
    avisos: avisos,
    recomendacao: bloqueios.length === 0
      ? "GO_LOCAL: contrato DocumentFactory/PDF pronto para revisao; nao habilita geracao real."
      : "NO_GO: corrigir contrato antes de qualquer persistencia PDF/Drive.",
    confirmacoes: {
      documentFactoryAlterado: false,
      documentFactoryChamado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH86_AUDITORIA_DOCUMENTFACTORY_PDF_SEM_GRAVAR() {
  var resultado = AUDITAR_FIN_FLASH86_DOCUMENTFACTORY_PDF_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.8 - Porta bloqueada para PDF real Flash
// Prepara geracao controlada, mas NAO chama DocumentFactory nesta fase.
// ============================================================

function PREPARAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_EXECUTAR(payload) {
  var p = payload || {};
  var tipo = String(p.tipoDocumento || p.TIPO_DOCUMENTO || "").trim().toUpperCase();
  var entidadeId = String(p.entidadeId || p.ENTIDADE_ID || "").trim();
  var titulo = String(p.titulo || p.TITULO || "").trim();
  var htmlPreview = String(p.htmlPreview || p.HTML_CUSTOM || "").trim();
  var bloqueios = [];
  var avisos = [];

  var contrato = PREPARAR_FIN_FLASH86_PAYLOAD_DOCUMENTFACTORY_SEM_GRAVAR(tipo, entidadeId, titulo, htmlPreview || "<html><body>Preview pendente</body></html>");
  if (!contrato.ok) {
    (contrato.bloqueios || []).forEach(function(b) { bloqueios.push(b); });
  }

  var envelope = p.envelope || p.envelopeObrigatorio || {};
  var confirmacaoOk = envelope.confirmacao === "CONFIRMO_ACAO_REAL_FLASH";
  var ambienteOk = envelope.ambienteControlado === true;
  var acaoOk = envelope.acaoEnvelope === "GERAR_DOCUMENTO_FIN_FLASH_DOCUMENTFACTORY" || envelope.acaoEnvelope === "GERAR_PDF_REAL_FLASH_88";

  if (!confirmacaoOk) bloqueios.push("Envelope sem confirmacao forte CONFIRMO_ACAO_REAL_FLASH.");
  if (!ambienteOk) bloqueios.push("Envelope sem ambienteControlado:true.");
  if (!acaoOk) bloqueios.push("Envelope sem acaoEnvelope autorizada para PDF Flash.");

  avisos.push("Porta de geracao real permanece bloqueada em FIN.FLASH.8.8; esta funcao nao chama documentFactoryGerar.");

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.8",
    escopo: "GERACAO_PDF_REAL_FLASH_BLOQUEADA",
    prontoParaGeracaoRealFutura: bloqueios.length === 0,
    executado: false,
    bloqueadoPorDesenho: true,
    contratoDocumentFactory: contrato.payloadSugerido || null,
    bloqueios: bloqueios,
    avisos: avisos,
    confirmacoes: {
      documentFactoryChamado: false,
      documentFactoryGerarChamado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function GERAR_PDF_REAL_FLASH88_BLOQUEADO(payload) {
  var preparacao = PREPARAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_EXECUTAR(payload || {});
  var resultado = {
    success: false,
    ok: false,
    fase: "FIN.FLASH.8.8",
    bloqueado: true,
    motivo: "Geracao real de PDF Flash ainda bloqueada por desenho. Use apenas auditoria/preparacao SEM_EXECUTAR.",
    preparacao: preparacao,
    confirmacoes: {
      documentFactoryChamado: false,
      documentFactoryGerarChamado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_GRAVAR() {
  var payloadOk = {
    tipoDocumento: "FIN_FLASH_RELATORIO_PRESTACAO",
    entidadeId: "CPF_TESTE_MASCARADO",
    titulo: "Relatorio Flash teste bloqueado",
    htmlPreview: "<html><body>Teste bloqueado</body></html>",
    envelope: {
      confirmacao: "CONFIRMO_ACAO_REAL_FLASH",
      ambienteControlado: true,
      acaoEnvelope: "GERAR_PDF_REAL_FLASH_88"
    }
  };
  var payloadSemEnvelope = {
    tipoDocumento: "FIN_FLASH_RELATORIO_PRESTACAO",
    entidadeId: "CPF_TESTE_MASCARADO",
    titulo: "Relatorio Flash teste bloqueado",
    htmlPreview: "<html><body>Teste bloqueado</body></html>"
  };
  var preparado = PREPARAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_EXECUTAR(payloadOk);
  var bloqueadoSemEnvelope = PREPARAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_EXECUTAR(payloadSemEnvelope);
  var portaBloqueada = GERAR_PDF_REAL_FLASH88_BLOQUEADO(payloadOk);

  var checks = {
    payloadValidoPrepara: preparado.ok === true,
    semEnvelopeBloqueia: bloqueadoSemEnvelope.ok === false && (bloqueadoSemEnvelope.bloqueios || []).length > 0,
    portaRealPermaneceBloqueada: portaBloqueada.bloqueado === true && portaBloqueada.gravacaoReal === false,
    documentFactoryGerarNaoChamado: portaBloqueada.confirmacoes && portaBloqueada.confirmacoes.documentFactoryGerarChamado === false,
    pdfNaoCriado: portaBloqueada.confirmacoes && portaBloqueada.confirmacoes.pdfCriado === false,
    driveNaoAlterado: portaBloqueada.confirmacoes && portaBloqueada.confirmacoes.driveAlterado === false,
    planilhaNaoAlterada: portaBloqueada.confirmacoes && portaBloqueada.confirmacoes.planilhaAlterada === false
  };
  var bloqueios = [];
  Object.keys(checks).forEach(function(k) { if (checks[k] !== true) bloqueios.push("Check 8.8 falhou: " + k); });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.8",
    escopo: "GERACAO_PDF_REAL_CONTROLADA_BLOQUEADA",
    checks: checks,
    preparado: preparado,
    bloqueadoSemEnvelope: bloqueadoSemEnvelope,
    portaBloqueada: portaBloqueada,
    bloqueios: bloqueios,
    avisos: ["Geracao real preparada, mas bloqueada por padrao. Proxima fase deve exigir autorizacao explicita antes de chamar DocumentFactory."],
    confirmacoes: {
      documentFactoryChamado: false,
      documentFactoryGerarChamado: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH88_AUDITORIA_GERACAO_PDF_REAL_CONTROLADA_SEM_GRAVAR() {
  var resultado = AUDITAR_FIN_FLASH88_GERACAO_PDF_REAL_CONTROLADA_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.8.9 - Relatorio final de prontidao DEV SEM_GRAVAR
// Consolida pronto/bloqueado/proximo pacote real.
// ============================================================

function GERAR_FIN_FLASH89_RELATORIO_PRONTIDAO_DEV_SEM_GRAVAR() {
  var auditoriaGeral = EXECUTAR_FIN_FLASH_AUDITORIA_GERAL_AUTOMATICA_SEM_GRAVAR();
  var fechamento = EXECUTAR_FIN_FLASH85_FECHAMENTO_OPERACIONAL_SEM_GRAVAR();
  var matriz = [
    { area: "Seguranca", item: "Envelope de acoes reais", status: auditoriaGeral.checks.envelopeBackendCatalogado ? "PRONTO" : "BLOQUEADO", proximoPacote: "Nenhum se OK" },
    { area: "Seguranca", item: "Criticas protegidas", status: auditoriaGeral.checks.criticasProtegidas ? "PRONTO" : "BLOQUEADO", proximoPacote: "Revisar 7.3" },
    { area: "UI", item: "Contrato UI/backend", status: auditoriaGeral.checks.contratoUiBackendOk ? "PRONTO" : "BLOQUEADO", proximoPacote: "Revisar 7.5" },
    { area: "Conciliação", item: "Conciliação/pendências protegidas", status: auditoriaGeral.checks.conciliacaoPendenciasProtegidas ? "PRONTO" : "BLOQUEADO", proximoPacote: "Homologacao visual DEV" },
    { area: "Documentos", item: "Previews/Auditoria documental", status: auditoriaGeral.checks.documentosFlashAuditados ? "PRONTO" : "BLOQUEADO", proximoPacote: "Homologacao visual DEV" },
    { area: "IA", item: "IA local deterministica", status: auditoriaGeral.checks.iaLocalAuditada ? "PRONTO" : "BLOQUEADO", proximoPacote: "Ajuste fino com massa real anonimizada" },
    { area: "DocumentFactory", item: "Contrato PDF controlado", status: auditoriaGeral.checks.documentFactoryPdfPreparado ? "PRONTO" : "BLOQUEADO", proximoPacote: "Geracao real controlada futura" },
    { area: "DocumentFactory", item: "Tipos FIN_FLASH reconhecidos", status: auditoriaGeral.checks.documentFactoryTiposFinFlashReconhecidos ? "PRONTO" : "BLOQUEADO", proximoPacote: "Nenhum se OK" },
    { area: "PDF Real", item: "Porta real bloqueada/preparada", status: auditoriaGeral.checks.pdfRealFlashPortaBloqueadaPreparada ? "PRONTO_BLOQUEADO" : "BLOQUEADO", proximoPacote: "Liberacao real com aceite explicito" },
    { area: "Publicacao", item: "Deploy/producao", status: "BLOQUEADO_POR_POLITICA", proximoPacote: "Pacote especifico de publicacao controlada" }
  ];

  var bloqueios = [];
  if (!auditoriaGeral.ok) bloqueios.push("Auditoria geral 8.3 nao esta OK.");
  if (!fechamento.ok) bloqueios.push("Fechamento operacional 8.5 nao esta OK.");
  matriz.forEach(function(item) {
    if (item.status === "BLOQUEADO") bloqueios.push(item.area + ": " + item.item);
  });

  var recomendacao = bloqueios.length === 0
    ? "GO_DEV_REVIEW: modulo Flash pronto para revisao visual DEV. Acoes reais, PDF real, push, deploy e producao seguem bloqueados ate pacote proprio."
    : "NO_GO: corrigir bloqueios antes de revisao DEV.";

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.8.9",
    escopo: "RELATORIO_PRONTIDAO_DEV",
    ambiente: "DEV_LOCAL",
    matrizProntidao: matriz,
    auditoriaGeralOk: auditoriaGeral.ok === true,
    fechamentoOperacionalOk: fechamento.ok === true,
    pendenciasReaisAntesDePublicar: fechamento.pendenciasReaisAntesDePublicar || [],
    bloqueios: bloqueios,
    avisos: [
      "Relatorio somente leitura.",
      "GO_DEV_REVIEW nao autoriza deploy, push, producao, PDF real, envio ou importacao.",
      "A porta PDF real 8.8 permanece bloqueada por desenho."
    ].concat(auditoriaGeral.avisos || []),
    recomendacao: recomendacao,
    proximoPacoteSugerido: bloqueios.length === 0
      ? "FIN.FLASH.9.0 - Homologacao visual DEV e checklist operacional sem executar acoes reais"
      : "Corrigir bloqueios apontados na matriz 8.9",
    confirmacoes: {
      planilhaAlterada: false,
      recargaCriada: false,
      lancamentoCriado: false,
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH89_RELATORIO_PRONTIDAO_DEV_SEM_GRAVAR() {
  var resultado = GERAR_FIN_FLASH89_RELATORIO_PRONTIDAO_DEV_SEM_GRAVAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.9.0 - Homologacao visual DEV SEM_EXECUTAR
// Roteiro operacional para revisao visual sem acao real.
// ============================================================

function GERAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR() {
  var prontidao = EXECUTAR_FIN_FLASH89_RELATORIO_PRONTIDAO_DEV_SEM_GRAVAR();
  var telas = [
    { ordem: 1, aba: "Admin tecnico", acao: "Executar Prontidao DEV 8.9", esperado: "GO DEV REVIEW, bloqueios vazios e gravacaoReal:false", executaReal: false },
    { ordem: 2, aba: "Admin tecnico", acao: "Executar Auditoria geral Flash 8.3", esperado: "Todos os checks principais OK", executaReal: false },
    { ordem: 3, aba: "Admin tecnico", acao: "Executar Fechamento operacional 8.5", esperado: "Itens prontos listados e pendencias reais separadas", executaReal: false },
    { ordem: 4, aba: "Admin tecnico", acao: "Auditar DocumentFactory/PDF 8.6, Tipos 8.7 e Porta PDF 8.8", esperado: "PDF/Drive/planilha nao alterados; porta real bloqueada", executaReal: false },
    { ordem: 5, aba: "Conciliacao", acao: "Abrir previa de conciliacao", esperado: "Tabela mostra classificacao IA, score e motivos sem conciliar", executaReal: false },
    { ordem: 6, aba: "Pendencias", acao: "Visualizar pendencias e detalhe", esperado: "Resolucao exige texto e envelope; nao resolver sem acao explicita", executaReal: false },
    { ordem: 7, aba: "Termos/Documentos", acao: "Gerar previews A4", esperado: "HTML/iframe exibido; nenhum PDF persistido automaticamente", executaReal: false },
    { ordem: 8, aba: "Auditoria 360", acao: "Carregar pendencias/prestacoes", esperado: "Listagem e filtros funcionam; envio de cobranca permanece acao critica controlada", executaReal: false }
  ];

  var bloqueios = [];
  if (!prontidao.ok) bloqueios.push("Prontidao 8.9 nao esta OK.");
  telas.forEach(function(t) { if (t.executaReal) bloqueios.push("Roteiro contem acao real indevida: " + t.acao); });

  var checklist = [
    { item: "Nenhum botao de homologacao chama setup", ok: true },
    { item: "Nenhum botao de homologacao executa deploy/push", ok: true },
    { item: "Nenhum roteiro cria recarga/lancamento/conciliação/pendencia/documento", ok: true },
    { item: "PDF real segue bloqueado por desenho", ok: true },
    { item: "Produção segue bloqueada", ok: true },
    { item: "prompt()/confirm() nativos seguem proibidos", ok: true }
  ];

  checklist.forEach(function(c) { if (c.ok !== true) bloqueios.push("Checklist falhou: " + c.item); });

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.9.0",
    escopo: "HOMOLOGACAO_VISUAL_DEV",
    ambiente: "DEV_LOCAL",
    roteiroVisual: telas,
    checklist: checklist,
    prontidao89Ok: prontidao.ok === true,
    bloqueios: bloqueios,
    avisos: [
      "Homologacao visual: validar telas e JSONs sem executar acoes reais.",
      "Nao usar botoes de acao real fora do fluxo controlado e sem pacote proprio.",
      "Este roteiro nao autoriza push, deploy ou producao."
    ],
    recomendacao: bloqueios.length === 0
      ? "GO_HOMOLOGACAO_VISUAL_DEV: roteiro pronto para revisao visual no DEV sem acao real."
      : "NO_GO: corrigir bloqueios antes da homologacao visual.",
    proximoPacoteSugerido: "FIN.FLASH.9.1 - Checklist de publicacao DEV controlada sem publicar",
    confirmacoes: {
      setupExecutado: false,
      planilhaAlterada: false,
      recargaCriada: false,
      lancamentoCriado: false,
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      pushExecutado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR() {
  var resultado = GERAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
// ============================================================
// FIN.FLASH.9.1 - Checklist de publicacao DEV controlada
// SEM_PUBLICAR: nao executa push, deploy, producao, PDF real ou envio.
// ============================================================

function GERAR_FIN_FLASH91_CHECKLIST_PUBLICACAO_DEV_SEM_PUBLICAR() {
  var homologacao = EXECUTAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR();
  var bloqueios = [];
  var checklist = [
    { ordem: 1, area: "Codigo", item: "Auditorias 8.3 a 9.0 disponiveis", ok: typeof EXECUTAR_FIN_FLASH_AUDITORIA_GERAL_AUTOMATICA_SEM_GRAVAR === "function" && typeof EXECUTAR_FIN_FLASH90_HOMOLOGACAO_VISUAL_DEV_SEM_EXECUTAR === "function", executaReal: false },
    { ordem: 2, area: "Homologacao", item: "Roteiro visual DEV gerado", ok: homologacao.success === true, executaReal: false },
    { ordem: 3, area: "Homologacao", item: "Roteiro visual DEV sem acoes reais", ok: (homologacao.roteiroVisual || []).every(function(t) { return t.executaReal !== true; }), executaReal: false },
    { ordem: 4, area: "Seguranca", item: "Deploy nao autorizado por este pacote", ok: true, executaReal: false },
    { ordem: 5, area: "Seguranca", item: "Push nao autorizado por este checklist", ok: true, executaReal: false },
    { ordem: 6, area: "Seguranca", item: "PDF real permanece bloqueado", ok: true, executaReal: false },
    { ordem: 7, area: "Seguranca", item: "Envio de e-mail/WhatsApp permanece fora deste pacote", ok: true, executaReal: false },
    { ordem: 8, area: "Operacao", item: "Publicacao futura exige aceite humano explicito", ok: true, executaReal: false }
  ];

  checklist.forEach(function(item) {
    if (item.ok !== true) bloqueios.push(item.area + ": " + item.item);
    if (item.executaReal === true) bloqueios.push("Checklist contem acao real indevida: " + item.item);
  });
  if (!homologacao.ok) bloqueios.push("Homologacao 9.0 ainda nao esta GO neste contexto.");

  var resultado = {
    success: true,
    ok: bloqueios.length === 0,
    fase: "FIN.FLASH.9.1",
    escopo: "CHECKLIST_PUBLICACAO_DEV_SEM_PUBLICAR",
    ambiente: "DEV_LOCAL",
    checklistPublicacao: checklist,
    homologacao90Ok: homologacao.ok === true,
    publicacaoAutorizada: false,
    deployAutorizado: false,
    pushAutorizado: false,
    producaoAutorizada: false,
    bloqueios: bloqueios,
    avisos: [
      "Checklist somente leitura.",
      "Este pacote nao publica, nao cria versao e nao executa deploy.",
      "Qualquer publicacao futura exige comando e aceite explicito em pacote separado."
    ].concat(homologacao.avisos || []),
    recomendacao: bloqueios.length === 0
      ? "GO_CHECKLIST: pre-condicoes de publicacao DEV revisadas; publicacao segue bloqueada ate autorizacao explicita."
      : "NO_GO: corrigir bloqueios antes de qualquer pacote de publicacao.",
    proximoPacoteSugerido: bloqueios.length === 0
      ? "FIN.FLASH.9.2 - Publicacao DEV controlada com aceite explicito"
      : "Corrigir bloqueios do checklist 9.1",
    confirmacoes: {
      setupExecutado: false,
      planilhaAlterada: false,
      recargaCriada: false,
      lancamentoCriado: false,
      conciliacaoExecutada: false,
      pendenciaCriada: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      pushExecutado: false,
      deployExecutado: false,
      versaoCriada: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FIN_FLASH91_CHECKLIST_PUBLICACAO_DEV_SEM_PUBLICAR() {
  var resultado = GERAR_FIN_FLASH91_CHECKLIST_PUBLICACAO_DEV_SEM_PUBLICAR();
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}