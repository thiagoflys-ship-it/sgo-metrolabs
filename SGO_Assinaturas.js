const SGO_ASSINATURAS = (() => {
  const SHEET = SGO_CFG.SHEETS.SYS_ASSINATURAS;
  const DB_OS = "OS";
  const SHEET_OS = SGO_CFG.SHEETS.OS_ORDENS;
  const STATUS_ATIVA = "ATIVA";
  const STATUS_REMOVIDA_ADMIN = "REMOVIDA_ADMIN";
  const STATUS_REMOVIDA_EXECUCAO = "REMOVIDA_EXECUCAO";

  function colunasAssinaturas_() {
    return [
      "ID", "OS_ID", "TIPO", "TIPO_ASSINATURA", "ASSINADO_POR", "CARGO",
      "ASSINADO_EM", "ASSINATURA_FILE_ID", "ASSINATURA_LINK", "LINK_DRIVE",
      "ASSINATURA_DATA_URL", "USER_AGENT", "IP_DISPOSITIVO", "STATUS",
      "CRIADO_POR", "CRIADO_EM", "REMOVIDA_POR", "REMOVIDA_EM",
      "MOTIVO_REMOCAO", "REABERTURA_RELATO_EM"
    ];
  }

  function garantirAbaAssinaturasOS_() {
    const ss = SGO_DATA.getDB(DB_OS);
    let sheet = ss.getSheetByName(SHEET);
    const headersObrigatorios = colunasAssinaturas_();
    if (!sheet) {
      sheet = ss.insertSheet(SHEET);
      sheet.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
      SGO_DATA.clearCache();
      try {
        SGO_DATA.log("SYS_ASSINATURAS_CRIAR_ABA_OS", "SISTEMA", "Aba SYS_ASSINATURAS criada no banco OS.", "OS");
      } catch (e) {
        Logger.log("Aba SYS_ASSINATURAS criada no banco OS; log indisponivel: " + e.message);
      }
      return sheet;
    }

    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) {
      sheet.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
      SGO_DATA.clearCache();
      return sheet;
    }
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });
    const faltantes = headersObrigatorios.filter(function(h) { return headers.indexOf(h) < 0; });
    if (!faltantes.length) return sheet;
    sheet.getRange(1, lastCol + 1, 1, faltantes.length).setValues([faltantes]);
    SGO_DATA.clearCache();
    try {
      SGO_DATA.log("SYS_ASSINATURAS_GARANTIR_COLUNAS_OS", "SISTEMA", "Colunas adicionadas no banco OS: " + faltantes.join(", "), "OS");
    } catch (e) {
      Logger.log("Colunas SYS_ASSINATURAS adicionadas; log indisponivel: " + e.message);
    }
    return sheet;
  }

  function garantirColunasGovernanca_() {
    return garantirAbaAssinaturasOS_();
  }

  function podeGerenciarAssinatura_(sessao) {
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

  function podeRemoverAssinatura_(sessao, os) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    if (perfil === "CLIENTE") return false;
    if (podeGerenciarAssinatura_(sessao)) return true;
    if (statusPermiteEdicaoExecucao_(os)) {
      return perfil === "TECNICO" ? tecnicoVinculadoSessao_(os, sessao) : perfil === "METROLOGIA";
    }
    return false;
  }

  function assinaturaAtiva_(item) {
    const st = SGO_UTILS.safeUpper(item && item.STATUS);
    return !st || st === STATUS_ATIVA || st === "ATIVO";
  }

  function salvar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
    payload = payload || {};
    const osId = SGO_UTILS.safe(payload.OS_ID);
    if (!osId) return { success: false, message: "OS nao informada." };
    const os = SGO_DATA.getById(SHEET_OS, osId, DB_OS);
    if (!podeRemoverAssinatura_(sessao, os)) {
      return { success: false, message: "Acesso negado para assinar esta OS." };
    }

    const tipoAss = SGO_UTILS.safeUpper(payload.TIPO_ASSINATURA || payload.TIPO || "CLIENTE");

    let fileId = "", linkDrive = "";
    const dataUrl = SGO_UTILS.safe(payload.ASSINATURA_DATA_URL);
    if (dataUrl && dataUrl.startsWith("data:")) {
      try {
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
        const blob = Utilities.newBlob(
          Utilities.base64Decode(base64),
          "image/png",
          "assinatura_" + tipoAss + "_" + osId + "_" + new Date().getTime() + ".png"
        );
        const folderId = SGO_CFG.DRIVE.FOLDER_OS;
        const file = folderId
          ? DriveApp.getFolderById(folderId).createFile(blob)
          : DriveApp.createFile(blob);
        fileId = file.getId();
        linkDrive = file.getUrl();
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
      } catch (e) {
        Logger.log("Assinatura Drive upload falhou: " + e.message);
      }
    }

    const dados = SGO_DATA.gerarRegistroBase({
      OS_ID: osId,
      TIPO: tipoAss,
      TIPO_ASSINATURA: tipoAss,
      ASSINADO_POR: SGO_UTILS.safe(payload.ASSINADO_POR),
      CARGO: SGO_UTILS.safe(payload.CARGO),
      ASSINATURA_DATA_URL: fileId ? "" : dataUrl,
      ASSINATURA_FILE_ID: fileId,
      ASSINATURA_LINK: linkDrive || SGO_UTILS.safe(payload.ASSINATURA_LINK || payload.LINK_DRIVE),
      LINK_DRIVE: linkDrive || SGO_UTILS.safe(payload.LINK_DRIVE),
      IP_DISPOSITIVO: SGO_UTILS.safe(payload.IP_DISPOSITIVO),
      USER_AGENT: SGO_UTILS.safe(payload.USER_AGENT),
      ASSINADO_EM: SGO_UTILS.nowIso(),
      CRIADO_POR: sessao.usuario || sessao.userId || "",
      STATUS: STATUS_ATIVA
    });

    SGO_DATA.insert(SHEET, dados, DB_OS);

    if (tipoAss !== "TECNICO") {
      SGO_DATA.update(SHEET_OS, osId, {
        ASSINATURA_ID: dados.ID,
        ASSINATURA_FILE_ID: fileId || "",
        ASSINATURA_LINK: linkDrive || "",
        ASSINADO_EM: dados.ASSINADO_EM,
        ASSINADO_POR: dados.ASSINADO_POR
      }, DB_OS);
    }

    SGO_DATA.log("OS_ASSINAR", sessao.usuario, "Assinatura " + tipoAss + " salva para OS=" + osId, "OS");
    return { success: true, message: "Assinatura salva.", item: dados };
  }

  function listarPorOS(sessionId, osId) {
    exigirSessao(sessionId);
    garantirColunasGovernanca_();
    const items = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId), DB_OS)
      .filter(assinaturaAtiva_);
    return { success: true, items: items };
  }

  function removerAdmin(sessionId, assinaturaId, motivo) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
    const id = SGO_UTILS.safe(assinaturaId);
    const assinatura = SGO_DATA.getById(SHEET, id, DB_OS);
    if (!assinatura) return { success: false, message: "Assinatura nao encontrada." };
    if (!assinaturaAtiva_(assinatura)) return { success: true, message: "Assinatura ja estava removida." };
    const osId = SGO_UTILS.safe(assinatura.OS_ID);
    const os = osId ? SGO_DATA.getById(SHEET_OS, osId, DB_OS) : null;
    if (!podeRemoverAssinatura_(sessao, os)) {
      return { success: false, message: "Acesso negado para remover assinatura." };
    }
    if (!statusPermiteEdicaoExecucao_(os) && !SGO_UTILS.safe(motivo)) {
      return { success: false, message: "Informe o motivo da remocao." };
    }

    const agora = SGO_UTILS.nowIso();
    const statusRemocao = statusPermiteEdicaoExecucao_(os) ? STATUS_REMOVIDA_EXECUCAO : STATUS_REMOVIDA_ADMIN;
    const ok = SGO_DATA.update(SHEET, id, {
      STATUS: statusRemocao,
      REMOVIDA_POR: sessao.usuario,
      REMOVIDA_EM: agora,
      MOTIVO_REMOCAO: SGO_UTILS.safe(motivo || "Correcao durante execucao"),
      REABERTURA_RELATO_EM: agora
    }, DB_OS);
    if (!ok) return { success: false, message: "Erro ao remover assinatura." };

    if (os && SGO_UTILS.safe(os.ASSINATURA_ID) === id) {
      SGO_DATA.update(SHEET_OS, osId, {
        ASSINATURA_ID: "",
        ASSINATURA_FILE_ID: "",
        ASSINATURA_LINK: "",
        ASSINADO_EM: "",
        ASSINADO_POR: "",
        ATUALIZADO_EM: agora
      }, DB_OS);
    }

    const tipoAss = SGO_UTILS.safeUpper(assinatura.TIPO_ASSINATURA || assinatura.TIPO || "");
    SGO_DATA.log(statusRemocao === STATUS_REMOVIDA_ADMIN ? "OS_ASSINATURA_REMOVER_ADMIN" : "OS_ASSINATURA_REMOVER_EXECUCAO", sessao.usuario, "Assinatura removida: " + id + " OS=" + osId + " tipo=" + tipoAss + " motivo=" + SGO_UTILS.safe(motivo), "OS");
    return { success: true, message: "Assinatura removida. Recolha nova assinatura antes de concluir." };
  }

  return { salvar, listarPorOS, removerAdmin, assinaturaAtiva: assinaturaAtiva_ };
})();

function assinaturasSalvar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ASSINATURAS.salvar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function assinaturasListarPorOS(sessionId, osId) { try { return JSON.parse(JSON.stringify(SGO_ASSINATURAS.listarPorOS(sessionId, osId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function assinaturasRemoverAdmin(sessionId, assinaturaId, motivo) { try { return JSON.parse(JSON.stringify(SGO_ASSINATURAS.removerAdmin(sessionId, assinaturaId, motivo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }