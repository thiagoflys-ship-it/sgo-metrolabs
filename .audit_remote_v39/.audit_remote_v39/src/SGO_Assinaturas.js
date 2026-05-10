const SGO_ASSINATURAS = (() => {
  const SHEET = SGO_CFG.SHEETS.SYS_ASSINATURAS;
  const DB_OS = "OS";
  const SHEET_OS = SGO_CFG.SHEETS.OS_ORDENS;

  function salvar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const osId = SGO_UTILS.safe(payload.OS_ID);
    if (!osId) return { success: false, message: "OS nao informada." };

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
      LINK_DRIVE: linkDrive || SGO_UTILS.safe(payload.LINK_DRIVE),
      IP_DISPOSITIVO: SGO_UTILS.safe(payload.IP_DISPOSITIVO),
      USER_AGENT: SGO_UTILS.safe(payload.USER_AGENT),
      ASSINADO_EM: SGO_UTILS.nowIso()
    });

    SGO_DATA.insert(SHEET, dados);

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
    const items = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId));
    return { success: true, items: items };
  }

  return { salvar, listarPorOS };
})();

function assinaturasSalvar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ASSINATURAS.salvar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function assinaturasListarPorOS(sessionId, osId) { try { return JSON.parse(JSON.stringify(SGO_ASSINATURAS.listarPorOS(sessionId, osId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
