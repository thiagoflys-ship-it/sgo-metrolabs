const SGO_OS_FOTOS = (() => {
  const DB_OS = "OS";
  const SHEET = SGO_CFG.SHEETS.OS_FOTOS;

  function listar(sessionId, osId) {
    exigirSessao(sessionId);
    const items = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId), DB_OS)
      .sort((a, b) => SGO_UTILS.safe(b.UPLOAD_EM || b.ENVIADO_EM).localeCompare(SGO_UTILS.safe(a.UPLOAD_EM || a.ENVIADO_EM)));
    return { success: true, items: items };
  }

  function registrar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const dados = {
      OS_ID: SGO_UTILS.safe(payload.OS_ID),
      MISSAO_ID: SGO_UTILS.safe(payload.MISSAO_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      PERGUNTA_ID: SGO_UTILS.safe(payload.PERGUNTA_ID),
      TIPO_FOTO: SGO_UTILS.safe(payload.TIPO_FOTO || payload.MOMENTO || "OUTRO"),
      MOMENTO: SGO_UTILS.safeUpper(payload.MOMENTO || payload.TIPO_FOTO || "OUTRO"),
      NOME_ARQUIVO: SGO_UTILS.safe(payload.NOME_ARQUIVO),
      LINK_DRIVE: SGO_UTILS.safe(payload.LINK_DRIVE),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      MIME_TYPE: SGO_UTILS.safe(payload.MIME_TYPE),
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: SGO_UTILS.nowIso(),
      ENVIADO_POR: sessao.usuario,
      ENVIADO_EM: SGO_UTILS.nowIso()
    };
    if (!dados.OS_ID) return { success: false, message: "OS nao informada." };
    if (!dados.LINK_DRIVE && !dados.FILE_ID) return { success: false, message: "Informe o link Drive ou File ID da evidencia." };
    SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    SGO_DATA.log("OS_ADICIONAR_FOTO", sessao.usuario, "Evidencia registrada para OS=" + dados.OS_ID, "OS");
    return { success: true, message: "Foto/evidencia registrada." };
  }

  function uploadBase64(sessionId, osId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const osIdSafe = SGO_UTILS.safe(osId || payload.OS_ID);
    if (!osIdSafe) return { success: false, message: "OS nao informada." };

    const base64 = SGO_UTILS.safe(payload.BASE64_DATA);
    if (!base64) return { success: false, message: "Dados da foto nao informados." };

    const mimeType = SGO_UTILS.safe(payload.MIME_TYPE) || "image/jpeg";
    const ext = mimeType.includes("png") ? ".png" : mimeType.includes("gif") ? ".gif" : ".jpg";
    const nome = SGO_UTILS.safe(payload.NOME_ARQUIVO) || ("foto_" + osIdSafe + "_" + new Date().getTime() + ext);

    let fileId = "", linkDrive = "";
    try {
      const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nome);
      const folderId = SGO_CFG.DRIVE.FOLDER_OS;
      const file = folderId
        ? DriveApp.getFolderById(folderId).createFile(blob)
        : DriveApp.createFile(blob);
      fileId = file.getId();
      linkDrive = file.getUrl();
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
    } catch (e) {
      return { success: false, message: "Erro ao salvar foto no Drive: " + e.message };
    }

    const dados = {
      OS_ID: osIdSafe,
      MISSAO_ID: SGO_UTILS.safe(payload.MISSAO_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      PERGUNTA_ID: SGO_UTILS.safe(payload.PERGUNTA_ID),
      TIPO_FOTO: SGO_UTILS.safe(payload.TIPO_FOTO || "OUTRO"),
      MOMENTO: SGO_UTILS.safeUpper(payload.TIPO_FOTO || "OUTRO"),
      NOME_ARQUIVO: nome,
      FILE_ID: fileId,
      LINK_DRIVE: linkDrive,
      MIME_TYPE: mimeType,
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      UPLOAD_POR: sessao.usuario,
      UPLOAD_EM: SGO_UTILS.nowIso(),
      ENVIADO_POR: sessao.usuario,
      ENVIADO_EM: SGO_UTILS.nowIso()
    };
    const resultado = SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    SGO_DATA.log("OS_FOTO_UPLOAD", sessao.usuario, "Foto enviada para OS=" + osIdSafe + " file=" + fileId, "OS");
    return { success: true, message: "Foto enviada com sucesso.", item: { ID: (resultado || dados).ID, FILE_ID: fileId, LINK_DRIVE: linkDrive, NOME_ARQUIVO: nome } };
  }

  function remover(sessionId, id) {
    exigirSessao(sessionId);
    const ok = SGO_DATA.remove(SHEET, SGO_UTILS.safe(id), DB_OS);
    return ok ? { success: true } : { success: false, message: "Registro nao encontrado." };
  }

  return { listar, registrar, uploadBase64, remover };
})();

function osFotosListar(sessionId, osId) { try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.listar(sessionId, osId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osFotosRegistrar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.registrar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osFotoUploadBase64(sessionId, osId, payload) { try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.uploadBase64(sessionId, osId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osFotosRemover(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.remover(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
