const SGO_OS_CHECKLIST = (() => {
  const DB_OS = "OS";
  const MODELOS = SGO_CFG.SHEETS.OS_CHECKLIST_MODELOS || "OS_CHECKLIST_MODELOS";
  const PERGUNTAS = SGO_CFG.SHEETS.OS_CHECKLIST_PERGUNTAS || "OS_CHECKLIST_PERGUNTAS";
  const RESP = SGO_CFG.SHEETS.OS_CHECKLIST_RESPOSTAS;
  const TPL_LEGADO = SGO_CFG.SHEETS.OS_CHECKLIST_TEMPLATE;
  const SHEET_OS = SGO_CFG.SHEETS.OS_ORDENS;

  const TIPOS_RESPOSTA = [
    "TEXTO_CURTO", "TEXTO_LONGO", "SIM_NAO", "CONFORME_NAO_CONFORME_NA",
    "MULTIPLA_ESCOLHA", "SELECAO_UNICA", "NUMERO", "DATA", "HORA",
    "FOTO", "MEDICAO", "ASSINATURA"
  ];

  function podeConfigurar_(sessao) {
    return ["ADMIN", "GESTOR", "METROLOGIA"].indexOf(SGO_UTILS.safeUpper(sessao && sessao.perfil)) >= 0;
  }

  function perfilAdminOperacional_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return perfil === "ADMIN" || perfil === "DIRETORIA" || perfil === "GESTOR";
  }

  function statusPermiteEdicaoExecucao_(os) {
    const st = SGO_UTILS.safeUpper(os && os.STATUS);
    return ["ABERTA", "AGENDADA", "EM_EXECUCAO"].indexOf(st) >= 0;
  }

  function tecnicoVinculadoSessao_(os, sessao) {
    const userId = SGO_UTILS.safe(sessao && sessao.userId);
    if (!os || !userId) return false;
    if (SGO_UTILS.safe(os.TECNICO_USUARIO_ID) === userId) return true;
    if (SGO_UTILS.safe(os.TECNICO_ID) === userId) return true;
    try {
      const tecnico = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_TECNICOS, os.TECNICO_ID);
      return !!(tecnico && SGO_UTILS.safe(tecnico.USUARIO_ID) === userId);
    } catch (e) {
      return false;
    }
  }

  function podeEditarExecucao_(sessao, os) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    if (perfil === "CLIENTE") return false;
    if (perfilAdminOperacional_(sessao)) return true;
    if (statusPermiteEdicaoExecucao_(os)) {
      return perfil === "TECNICO" ? tecnicoVinculadoSessao_(os, sessao) : perfil === "METROLOGIA";
    }
    return false;
  }

  function listarModelos(sessionId, filtros) {
    exigirSessao(sessionId);
    filtros = filtros || {};
    let items = safeAll_(MODELOS).filter(function(m) {
      if (filtros.TIPO_OS && SGO_UTILS.safeUpper(m.TIPO_OS) !== SGO_UTILS.safeUpper(filtros.TIPO_OS)) return false;
      if (filtros.TIPO_EQUIPAMENTO && SGO_UTILS.safeUpper(m.TIPO_EQUIPAMENTO) !== SGO_UTILS.safeUpper(filtros.TIPO_EQUIPAMENTO)) return false;
      return true;
    });
    items = items.sort(function(a, b) {
      return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME)) ||
        Number(b.VERSAO || 0) - Number(a.VERSAO || 0);
    });
    const todasPerguntas = safeAll_(PERGUNTAS).filter(function(p) {
      return SGO_UTILS.safeUpper(p.STATUS || "ATIVO") === "ATIVO";
    });
    items = items.map(function(m) {
      return Object.assign({}, m, {
        TOTAL_PERGUNTAS: todasPerguntas.filter(function(p) {
          return SGO_UTILS.safe(p.MODELO_ID) === SGO_UTILS.safe(m.ID);
        }).length
      });
    });
    return { success: true, items: items, tiposResposta: TIPOS_RESPOSTA };
  }

  function criarModelo(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarModelo_(payload);
    if (!dados.NOME) return { success: false, message: "Informe o nome do modelo." };
    if (!dados.TIPO_OS) return { success: false, message: "Informe o tipo de OS." };
    if (!dados.TIPO_EQUIPAMENTO) return { success: false, message: "Informe o tipo de equipamento." };
    const agora = SGO_UTILS.nowIso();
    const registro = SGO_DATA.insert(MODELOS, SGO_DATA.gerarRegistroBase(Object.assign({}, dados, {
      STATUS: dados.STATUS || "ATIVO",
      VERSAO: dados.VERSAO || "1",
      CRIADO_POR: sessao.usuario || sessao.userId || "",
      ATUALIZADO_EM: agora
    })), DB_OS);
    SGO_DATA.log("OS_CHECKLIST_MODELO_CRIAR", sessao.usuario, "Modelo criado: " + registro.ID, "OS");
    return { success: true, message: "Modelo criado.", item: registro };
  }

  function atualizarModelo(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const modelo = SGO_DATA.getById(MODELOS, SGO_UTILS.safe(id), DB_OS);
    if (!modelo) return { success: false, message: "Modelo nao encontrado." };
    const dados = normalizarModelo_(payload);
    dados.ATUALIZADO_EM = SGO_UTILS.nowIso();
    SGO_DATA.update(MODELOS, modelo.ID, dados, DB_OS);
    return { success: true, message: "Modelo atualizado." };
  }

  function inativarModelo(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const ok = SGO_DATA.update(MODELOS, SGO_UTILS.safe(id), {
      STATUS: "INATIVO",
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }, DB_OS);
    return ok ? { success: true, message: "Modelo inativado." } : { success: false, message: "Modelo nao encontrado." };
  }

  function clonarModelo(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const modelo = SGO_DATA.getById(MODELOS, SGO_UTILS.safe(id), DB_OS);
    if (!modelo) return { success: false, message: "Modelo nao encontrado." };
    const novo = criarModelo(sessionId, Object.assign({}, modelo, {
      ID: "",
      NOME: (modelo.NOME || "Modelo") + " - copia",
      VERSAO: String(Number(modelo.VERSAO || 1) + 1),
      STATUS: "INATIVO"
    }));
    if (!novo.success) return novo;
    safeMany_(PERGUNTAS, "MODELO_ID", modelo.ID).forEach(function(p) {
      criarPergunta(sessionId, Object.assign({}, p, { ID: "", MODELO_ID: novo.item.ID }));
    });
    return { success: true, message: "Modelo clonado.", item: novo.item };
  }

  function criarPergunta(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarPergunta_(payload);
    if (!dados.MODELO_ID) return { success: false, message: "Informe o modelo." };
    if (!dados.PERGUNTA) return { success: false, message: "Informe a pergunta." };
    if (TIPOS_RESPOSTA.indexOf(dados.TIPO_RESPOSTA) < 0) return { success: false, message: "Tipo de resposta invalido." };
    const registro = SGO_DATA.insert(PERGUNTAS, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    return { success: true, message: "Pergunta criada.", item: registro };
  }

  function atualizarPergunta(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const dados = normalizarPergunta_(payload);
    const ok = SGO_DATA.update(PERGUNTAS, SGO_UTILS.safe(id), dados, DB_OS);
    return ok ? { success: true, message: "Pergunta atualizada." } : { success: false, message: "Pergunta nao encontrada." };
  }

  function excluirPergunta(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const ok = SGO_DATA.remove(PERGUNTAS, SGO_UTILS.safe(id), DB_OS);
    return ok ? { success: true, message: "Pergunta excluida." } : { success: false, message: "Pergunta nao encontrada." };
  }

  function obterModeloCompleto(sessionId, id) {
    exigirSessao(sessionId);
    const modelo = SGO_DATA.getById(MODELOS, SGO_UTILS.safe(id), DB_OS);
    if (!modelo) return { success: false, message: "Modelo nao encontrado." };
    return { success: true, item: completarModelo_(modelo) };
  }

  function modeloPorTipoOSTipoEquipamento(sessionId, tipoOs, tipoEquipamento) {
    exigirSessao(sessionId);
    const modelo = escolherModelo_(tipoOs, tipoEquipamento);
    if (!modelo) {
      return { success: false, message: "Nao existe questionario configurado para este tipo de OS/equipamento.", item: null };
    }
    return { success: true, item: completarModelo_(modelo) };
  }

  function salvarRespostas(sessionId, payloadOuOsId, respostasTalvez) {
    const sessao = exigirSessao(sessionId);
    const payload = Array.isArray(respostasTalvez)
      ? { OS_ID: payloadOuOsId, RESPOSTAS: respostasTalvez }
      : (payloadOuOsId || {});
    const osId = SGO_UTILS.safe(payload.OS_ID);
    if (!osId) return { success: false, message: "OS nao informada." };
    const os = SGO_DATA.getById(SHEET_OS, osId, DB_OS);
    if (!podeEditarExecucao_(sessao, os)) return { success: false, message: "Acesso negado para editar questionario desta OS." };
    if (!statusPermiteEdicaoExecucao_(os) && !SGO_UTILS.safe(payload.MOTIVO_ALTERACAO)) {
      return { success: false, code: "MOTIVO_OBRIGATORIO", message: "Informe o motivo para alterar questionario de OS ja concluida." };
    }
    const missaoId = SGO_UTILS.safe(payload.MISSAO_ID);
    const modeloId = SGO_UTILS.safe(payload.MODELO_ID);

    (payload.RESPOSTAS || []).forEach(function(r) {
      const perguntaId = SGO_UTILS.safe(r.PERGUNTA_ID || r.TEMPLATE_ID);
      const dados = {
        OS_ID: osId,
        MISSAO_ID: SGO_UTILS.safe(r.MISSAO_ID || missaoId),
        MODELO_ID: SGO_UTILS.safe(r.MODELO_ID || modeloId),
        PERGUNTA_ID: perguntaId,
        TEMPLATE_ID: perguntaId,
        SECAO: SGO_UTILS.safe(r.SECAO),
        ITEM: SGO_UTILS.safe(r.ITEM || r.PERGUNTA),
        PERGUNTA: SGO_UTILS.safe(r.PERGUNTA || r.ITEM),
        TIPO_RESPOSTA: SGO_UTILS.safeUpper(r.TIPO_RESPOSTA),
        OBRIGATORIO: sn_(r.OBRIGATORIO),
        RESPOSTA: SGO_UTILS.safe(r.RESPOSTA),
        OBSERVACAO: SGO_UTILS.safe(r.OBSERVACAO),
        EVIDENCIA_LINK: SGO_UTILS.safe(r.EVIDENCIA_LINK),
        STATUS_CONFORMIDADE: statusConformidade_(r),
        RESPONDIDO_POR: sessao.usuario || sessao.userId || "",
        RESPONDIDO_EM: SGO_UTILS.nowIso()
      };
      const existente = perguntaId
        ? SGO_DATA.findOne(RESP, { OS_ID: osId, PERGUNTA_ID: perguntaId }, DB_OS) || SGO_DATA.findOne(RESP, { OS_ID: osId, TEMPLATE_ID: perguntaId }, DB_OS)
        : null;
      if (existente) SGO_DATA.update(RESP, existente.ID, dados, DB_OS);
      else SGO_DATA.insert(RESP, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    });
    SGO_DATA.log("OS_CHECKLIST_RESPOSTAS_SALVAR", sessao.usuario, "Respostas salvas para OS=" + osId + " motivo=" + SGO_UTILS.safe(payload.MOTIVO_ALTERACAO), "OS");
    return { success: true, message: "Questionario salvo." };
  }

  function listarRespostasPorOS(sessionId, osId) {
    exigirSessao(sessionId);
    return { success: true, items: safeMany_(RESP, "OS_ID", SGO_UTILS.safe(osId)) };
  }

  function validarObrigatorios(sessionId, osId) {
    exigirSessao(sessionId);
    return validarObrigatoriosInterno(osId);
  }

  function validarObrigatoriosInterno(osOuId) {
    const os = typeof osOuId === "object" ? osOuId : SGO_DATA.getById(SGO_CFG.SHEETS.OS_ORDENS, SGO_UTILS.safe(osOuId), DB_OS);
    const pendencias = [];
    if (!os) return { ok: false, pendencias: ["OS nao encontrada."] };
    const modelo = escolherModelo_(os.TIPO_OS, os.EQUIPAMENTO_TIPO || tipoEquipamentoPorId_(os.EQUIPAMENTO_ID));
    if (!modelo) {
      return { ok: true, pendencias: pendencias, modelo: null };
    }
    const perguntas = perguntasModelo_(modelo.ID);
    const respostas = safeMany_(RESP, "OS_ID", os.ID);

    perguntas.forEach(function(p) {
      const resp = respostas.find(function(r) {
        return SGO_UTILS.safe(r.PERGUNTA_ID || r.TEMPLATE_ID) === SGO_UTILS.safe(p.ID);
      });
      const label = p.PERGUNTA || p.ID;
      const valor = resp && SGO_UTILS.safe(resp.RESPOSTA);
      const obs = resp && SGO_UTILS.safe(resp.OBSERVACAO);
      const foto = resp && SGO_UTILS.safe(resp.EVIDENCIA_LINK);
      const naoOk = respostaNaoConforme_(valor);
      if (snBool_(p.OBRIGATORIO) && !valor) pendencias.push("Pergunta obrigatoria sem resposta: " + label);
      if (snBool_(p.EXIGE_FOTO_SE_NAO_OK) && naoOk) {
        if (!foto) pendencias.push("Pergunta exige foto/evidencia: " + label);
      }
      if (snBool_(p.EXIGE_OBSERVACAO_SE_NAO_OK) && naoOk && !obs) {
        pendencias.push("Nao conformidade exige observacao: " + label);
      }
      if ((snBool_(p.BLOQUEIA_CONCLUSAO) || snBool_(modelo.BLOQUEIA_SE_NAO_CONFORME)) && naoOk) {
        pendencias.push("Nao conformidade bloqueante: " + label);
      }
    });

    if (snBool_(modelo.EXIGE_FOTO)) {
      const fotos = SGO_DATA.getManyByField(SGO_CFG.SHEETS.OS_FOTOS, "OS_ID", os.ID, DB_OS)
        .filter(function(f) {
          const st = SGO_UTILS.safeUpper(f.STATUS);
          return !st || st === "ATIVA" || st === "ATIVO";
        });
      if (!fotos.length) pendencias.push("Modelo exige foto geral da OS.");
    }

    if (snBool_(modelo.EXIGE_ASSINATURA)) {
      const assinaturas = SGO_DATA.getManyByField(SGO_CFG.SHEETS.SYS_ASSINATURAS, "OS_ID", os.ID)
        .filter(function(a) {
          const st = SGO_UTILS.safeUpper(a.STATUS);
          return !st || st === "ATIVA" || st === "ATIVO";
        });
      if (!assinaturas.length) pendencias.push("Modelo exige assinatura do responsavel.");
    }

    if (snBool_(modelo.EXIGE_GPS)) {
      const temCheckin = SGO_UTILS.safe(os.CHECKIN_LAT) && SGO_UTILS.safe(os.CHECKIN_LNG);
      const temCheckout = SGO_UTILS.safe(os.CHECKOUT_LAT) && SGO_UTILS.safe(os.CHECKOUT_LNG);
      if (!temCheckin && !temCheckout) pendencias.push("Modelo exige registro de localizacao (GPS).");
    }

    return { ok: pendencias.length === 0, pendencias: pendencias, modelo: completarModelo_(modelo) };
  }

  function listarTemplates(sessionId, tipoOs) {
    const res = listarModelos(sessionId, { TIPO_OS: tipoOs });
    if (res.items.length) {
      const modelo = completarModelo_(res.items[0]);
      return { success: true, items: modelo.perguntas.map(perguntaParaTemplate_) };
    }
    return listarTemplatesLegados_(sessionId, tipoOs);
  }

  function salvarTemplate(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    if (!podeConfigurar_(sessao)) return { success: false, message: "Acesso negado." };
    const p = payload || {};
    if (p.MODELO_ID) return criarPergunta(sessionId, p);
    const modelo = criarModelo(sessionId, {
      NOME: p.NOME || p.ITEM || p.PERGUNTA,
      TIPO_OS: p.TIPO_OS,
      TIPO_EQUIPAMENTO: p.TIPO_EQUIPAMENTO || "GERAL",
      DESCRICAO: p.DESCRICAO,
      STATUS: p.ATIVO === "N" ? "INATIVO" : "ATIVO"
    });
    if (!modelo.success) return modelo;
    if (p.PERGUNTA || p.ITEM) criarPergunta(sessionId, Object.assign({}, p, { MODELO_ID: modelo.item.ID }));
    return modelo;
  }

  function escolherModelo_(tipoOs, tipoEquipamento) {
    const tipo = SGO_UTILS.safeUpper(tipoOs);
    const eqp = SGO_UTILS.safeUpper(tipoEquipamento || "GERAL");
    const ativos = safeAll_(MODELOS).filter(function(m) {
      return SGO_UTILS.safeUpper(m.STATUS || "ATIVO") === "ATIVO" &&
        SGO_UTILS.safeUpper(m.TIPO_OS) === tipo;
    });
    const matches = ativos.filter(function(m) { return SGO_UTILS.safeUpper(m.TIPO_EQUIPAMENTO) === eqp; });
    const geral = ativos.filter(function(m) { return ["GERAL", "EQUIPAMENTO", "OUTRO", ""].indexOf(SGO_UTILS.safeUpper(m.TIPO_EQUIPAMENTO)) >= 0; });
    return (matches.length ? matches : geral).sort(function(a, b) {
      return Number(b.VERSAO || 0) - Number(a.VERSAO || 0);
    })[0] || null;
  }

  function completarModelo_(modelo) {
    return Object.assign({}, modelo, { perguntas: perguntasModelo_(modelo.ID) });
  }

  function perguntasModelo_(modeloId) {
    return safeMany_(PERGUNTAS, "MODELO_ID", modeloId)
      .filter(function(p) { return SGO_UTILS.safeUpper(p.STATUS || "ATIVO") === "ATIVO"; })
      .sort(function(a, b) { return Number(a.ORDEM || 0) - Number(b.ORDEM || 0); });
  }

  function tipoEquipamentoPorId_(equipamentoId) {
    const id = SGO_UTILS.safe(equipamentoId);
    if (!id) return "";
    try {
      const eqp = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, id);
      return eqp ? SGO_UTILS.safe(eqp.TIPO) : "";
    } catch (e) {
      return "";
    }
  }

  function listarTemplatesLegados_(sessionId, tipoOs) {
    exigirSessao(sessionId);
    let itens = safeAll_(TPL_LEGADO);
    if (tipoOs) itens = itens.filter(i => SGO_UTILS.safeUpper(i.TIPO_OS) === SGO_UTILS.safeUpper(tipoOs));
    itens = itens.filter(i => SGO_UTILS.safeUpper(i.ATIVO || "S") !== "N")
      .sort((a, b) => Number(a.ORDEM || 0) - Number(b.ORDEM || 0));
    return { success: true, items: itens };
  }

  function normalizarModelo_(payload) {
    payload = payload || {};
    return {
      NOME: SGO_UTILS.safe(payload.NOME),
      TIPO_OS: SGO_UTILS.safeUpper(payload.TIPO_OS),
      TIPO_EQUIPAMENTO: SGO_UTILS.safeUpper(payload.TIPO_EQUIPAMENTO || "GERAL"),
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO),
      VERSAO: SGO_UTILS.safe(payload.VERSAO || "1"),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "ATIVO"),
      EXIGE_FOTO: sn_(payload.EXIGE_FOTO),
      EXIGE_ASSINATURA: sn_(payload.EXIGE_ASSINATURA),
      EXIGE_KM: sn_(payload.EXIGE_KM),
      EXIGE_MATERIAIS: sn_(payload.EXIGE_MATERIAIS),
      EXIGE_GPS: sn_(payload.EXIGE_GPS),
      BLOQUEIA_SE_NAO_CONFORME: sn_(payload.BLOQUEIA_SE_NAO_CONFORME),
      PERMITE_CONCLUIR_SEM_QUESTIONARIO: sn_(payload.PERMITE_CONCLUIR_SEM_QUESTIONARIO)
    };
  }

  function normalizarPergunta_(payload) {
    payload = payload || {};
    return {
      MODELO_ID: SGO_UTILS.safe(payload.MODELO_ID),
      SECAO: SGO_UTILS.safe(payload.SECAO || "Geral"),
      ORDEM: SGO_UTILS.safe(payload.ORDEM || "1"),
      PERGUNTA: SGO_UTILS.safe(payload.PERGUNTA || payload.ITEM),
      TIPO_RESPOSTA: SGO_UTILS.safeUpper(payload.TIPO_RESPOSTA || "SIM_NAO"),
      OPCOES: SGO_UTILS.safe(payload.OPCOES),
      OBRIGATORIO: sn_(payload.OBRIGATORIO),
      EXIGE_OBSERVACAO_SE_NAO_OK: sn_(payload.EXIGE_OBSERVACAO_SE_NAO_OK),
      EXIGE_FOTO_SE_NAO_OK: sn_(payload.EXIGE_FOTO_SE_NAO_OK),
      EXIGE_FOTO: sn_(payload.EXIGE_FOTO),
      BLOQUEIA_CONCLUSAO: sn_(payload.BLOQUEIA_CONCLUSAO),
      PERMITE_NA: sn_(payload.PERMITE_NA),
      PESO: SGO_UTILS.safe(payload.PESO || "0"),
      AJUDA: SGO_UTILS.safe(payload.AJUDA),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "ATIVO")
    };
  }

  function perguntaParaTemplate_(p) {
    return Object.assign({}, p, {
      TEMPLATE_ID: p.ID,
      ITEM: p.PERGUNTA,
      ATIVO: p.STATUS === "INATIVO" ? "N" : "S"
    });
  }

  function statusConformidade_(r) {
    return respostaNaoConforme_(r.RESPOSTA) ? "NAO_CONFORME" : (SGO_UTILS.safe(r.RESPOSTA) ? "CONFORME" : "PENDENTE");
  }

  function respostaNaoConforme_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    return ["NAO", "N", "NAO_OK", "NAO_CONFORME", "NC", "REPROVADO", "FALHA", "FORA_DO_PADRAO"].indexOf(v) >= 0 ||
      v === "NÃO" || v === "NÃO_CONFORME";
  }

  function sn_(valor) {
    return snBool_(valor) ? "S" : "N";
  }

  function snBool_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    return valor === true || v === "S" || v === "SIM" || v === "TRUE" || v === "1";
  }

  function safeAll_(sheet) {
    try { return SGO_DATA.getAll(sheet, DB_OS); } catch (e) { return []; }
  }

  function safeMany_(sheet, campo, valor) {
    try { return SGO_DATA.getManyByField(sheet, campo, SGO_UTILS.safe(valor), DB_OS); } catch (e) { return []; }
  }

  return {
    listarModelos, criarModelo, atualizarModelo, inativarModelo, clonarModelo,
    criarPergunta, atualizarPergunta, excluirPergunta, obterModeloCompleto,
    modeloPorTipoOSTipoEquipamento, salvarRespostas, listarRespostasPorOS,
    validarObrigatorios, validarObrigatoriosInterno,
    listarTemplates, salvarTemplate
  };
})();
