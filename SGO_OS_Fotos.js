// Caminho: Backend/SGO_OS_FOTOS.js

const SGO_OS_FOTOS = (() => {
  const DB_OS = "OS";
  const SHEET = sgoGetCfgSafe_().SHEETS.OS_FOTOS;
  const SHEET_OS = sgoGetCfgSafe_().SHEETS.OS_ORDENS;
  const SHEET_CHECK_RESP = sgoGetCfgSafe_().SHEETS.OS_CHECKLIST_RESPOSTAS;
  const STATUS_ATIVA = "ATIVA";
  const STATUS_REMOVIDA_EXECUCAO = "REMOVIDA_EXECUCAO";
  const STATUS_REMOVIDA_ADMIN = "REMOVIDA_ADMIN";

  function garantirColunasGovernanca_() {
    const sheet = SGO_DATA.getSheet(SHEET, DB_OS);
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => SGO_UTILS.safe(h));
    const extras = ["STATUS", "REMOVIDA_POR", "REMOVIDA_EM", "MOTIVO_REMOCAO"];
    const faltantes = extras.filter(h => headers.indexOf(h) < 0);
    
    if (!faltantes.length) return;
    
    sheet.getRange(1, lastCol + 1, 1, faltantes.length).setValues([faltantes]);
    SGO_DATA.clearCache();
  }

  function fotoAtiva_(item) {
    const st = SGO_UTILS.safeUpper(item && item.STATUS);
    return !st || st === STATUS_ATIVA || st === "ATIVO";
  }

  function statusPermiteEdicaoExecucao_(os) {
    const st = SGO_UTILS.safeUpper(os && os.STATUS);
    return ["ABERTA", "AGENDADA", "EM_EXECUCAO"].indexOf(st) >= 0;
  }

  function perfilAdmin_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    return perfil === "ADMIN" || perfil === "DIRETORIA" || perfil === "GESTOR";
  }

  function tecnicoVinculadoSessao_(os, sessao) {
    const userId = SGO_UTILS.safe(sessao && sessao.userId);
    if (!os || !userId) return false;
    if (SGO_UTILS.safe(os.TECNICO_USUARIO_ID) === userId) return true;
    if (SGO_UTILS.safe(os.TECNICO_ID) === userId) return true;
    
    try {
      const tecnico = SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_TECNICOS, os.TECNICO_ID);
      return !!(tecnico && SGO_UTILS.safe(tecnico.USUARIO_ID) === userId);
    } catch (e) {
      return false;
    }
  }

  function podeEditarFoto_(sessao, os) {
    const perfil = SGO_UTILS.safeUpper(sessao && sessao.perfil);
    if (perfil === "CLIENTE") return false;
    if (perfilAdmin_(sessao)) return true;
    
    if (statusPermiteEdicaoExecucao_(os)) {
      return perfil === "TECNICO" ? tecnicoVinculadoSessao_(os, sessao) : perfil === "METROLOGIA";
    }
    return false;
  }

  function listar(sessionId, osId) {
    garantirColunasGovernanca_();
    exigirSessao(sessionId);
    
    const items = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId), DB_OS)
      .filter(fotoAtiva_)
      .sort((a, b) => SGO_UTILS.safe(b.UPLOAD_EM || b.ENVIADO_EM).localeCompare(SGO_UTILS.safe(a.UPLOAD_EM || a.ENVIADO_EM)));
      
    return { success: true, items: items };
  }

  function registrar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
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
      ENVIADO_EM: SGO_UTILS.nowIso(),
      STATUS: STATUS_ATIVA
    };
    
    if (!dados.OS_ID) return { success: false, message: "OS nao informada." };
    
    const os = SGO_DATA.getById(SHEET_OS, dados.OS_ID, DB_OS);
    if (!podeEditarFoto_(sessao, os)) {
      return { success: false, message: "Acesso negado para registrar evidencia nesta OS." };
    }
    if (!dados.LINK_DRIVE && !dados.FILE_ID) {
      return { success: false, message: "Informe o link Drive ou File ID da evidencia." };
    }
    
    SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    SGO_DATA.log("OS_ADICIONAR_FOTO", sessao.usuario, `Evidencia registrada para OS=${dados.OS_ID}`, "OS");
    
    return { success: true, message: "Foto/evidencia registrada." };
  }

  function uploadBase64(sessionId, osId, payload) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
    payload = payload || {};
    
    const osIdSafe = SGO_UTILS.safe(osId || payload.OS_ID);
    if (!osIdSafe) return { success: false, message: "OS nao informada." };
    
    const os = SGO_DATA.getById(SHEET_OS, osIdSafe, DB_OS);
    if (!podeEditarFoto_(sessao, os)) {
      return { success: false, message: "Acesso negado para enviar evidencia nesta OS." };
    }

    const base64 = SGO_UTILS.safe(payload.BASE64_DATA);
    if (!base64) return { success: false, message: "Dados da foto nao informados." };
    
    const mimeType = SGO_UTILS.safe(payload.MIME_TYPE) || "image/jpeg";
    const ext = mimeType.includes("png") ? ".png" : mimeType.includes("gif") ? ".gif" : ".jpg";
    const nome = SGO_UTILS.safe(payload.NOME_ARQUIVO) || `foto_${osIdSafe}_${new Date().getTime()}${ext}`;
    
    let fileId = "", linkDrive = "";
    try {
      const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nome);
      const folderId = sgoGetCfgSafe_().DRIVE.FOLDER_OS;
      const file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
      
      fileId = file.getId();
      linkDrive = file.getUrl();
      try { 
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (_) {}
    } catch (e) {
      return { success: false, message: `Erro ao salvar foto no Drive: ${e.message}` };
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
      ENVIADO_EM: SGO_UTILS.nowIso(),
      STATUS: STATUS_ATIVA
    };
    
    const resultado = SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    SGO_DATA.log("OS_FOTO_UPLOAD", sessao.usuario, `Foto enviada para OS=${osIdSafe} file=${fileId}`, "OS");
    
    return { 
      success: true, 
      message: "Foto enviada com sucesso.", 
      item: { ID: (resultado || dados).ID, FILE_ID: fileId, LINK_DRIVE: linkDrive, NOME_ARQUIVO: nome } 
    };
  }

  function remover(sessionId, id, motivo) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
    
    const fotoId = SGO_UTILS.safe(id);
    const foto = SGO_DATA.getById(SHEET, fotoId, DB_OS);
    if (!foto) return { success: false, message: "Foto/evidencia nao encontrada." };
    if (!fotoAtiva_(foto)) return { success: true, message: "Foto/evidencia ja estava removida." };
    
    const osId = SGO_UTILS.safe(foto.OS_ID);
    const os = osId ? SGO_DATA.getById(SHEET_OS, osId, DB_OS) : null;
    if (!podeEditarFoto_(sessao, os)) return { success: false, message: "Acesso negado para remover esta evidencia." };
    if (!statusPermiteEdicaoExecucao_(os) && !SGO_UTILS.safe(motivo)) {
      return { success: false, message: "Informe o motivo da remocao." };
    }
    
    const agora = SGO_UTILS.nowIso();
    const status = statusPermiteEdicaoExecucao_(os) ? STATUS_REMOVIDA_EXECUCAO : STATUS_REMOVIDA_ADMIN;
    
    const ok = SGO_DATA.update(SHEET, fotoId, {
      STATUS: status,
      REMOVIDA_POR: sessao.usuario,
      REMOVIDA_EM: agora,
      MOTIVO_REMOCAO: SGO_UTILS.safe(motivo || "Correcao durante execucao")
    }, DB_OS);
    
    if (!ok) return { success: false, message: "Erro ao remover evidencia." };
    
    const perguntaId = SGO_UTILS.safe(foto.PERGUNTA_ID);
    if (perguntaId) {
      const resp = SGO_DATA.findOne(SHEET_CHECK_RESP, { OS_ID: osId, PERGUNTA_ID: perguntaId }, DB_OS) ||
                   SGO_DATA.findOne(SHEET_CHECK_RESP, { OS_ID: osId, TEMPLATE_ID: perguntaId }, DB_OS);
      if (resp) {
        const limpaRespostaFoto = SGO_UTILS.safeUpper(resp.TIPO_RESPOSTA) === "FOTO";
        SGO_DATA.update(SHEET_CHECK_RESP, resp.ID, {
          EVIDENCIA_LINK: "",
          RESPOSTA: limpaRespostaFoto ? "" : SGO_UTILS.safe(resp.RESPOSTA),
          ATUALIZADO_EM: agora
        }, DB_OS);
      }
    }
    
    const logAction = status === STATUS_REMOVIDA_ADMIN ? "OS_FOTO_REMOVER_ADMIN" : "OS_FOTO_REMOVER_EXECUCAO";
    SGO_DATA.log(logAction, sessao.usuario, `Foto removida: ${fotoId} OS=${osId} motivo=${SGO_UTILS.safe(motivo)}`, "OS");
    
    return { success: true, message: "Foto/evidencia removida." };
  }

  function atualizarMeta(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    garantirColunasGovernanca_();
    payload = payload || {};
    
    const fotoId = SGO_UTILS.safe(id);
    const foto = SGO_DATA.getById(SHEET, fotoId, DB_OS);
    if (!foto) return { success: false, message: "Foto/evidencia nao encontrada." };
    if (!fotoAtiva_(foto)) return { success: false, message: "Foto/evidencia removida nao pode ser editada." };
    
    const osId = SGO_UTILS.safe(foto.OS_ID);
    const os = osId ? SGO_DATA.getById(SHEET_OS, osId, DB_OS) : null;
    if (!podeEditarFoto_(sessao, os)) return { success: false, message: "Acesso negado para editar esta evidencia." };
    if (!statusPermiteEdicaoExecucao_(os) && !SGO_UTILS.safe(payload.MOTIVO)) {
      return { success: false, message: "Informe o motivo da alteracao." };
    }
    
    const tipo = SGO_UTILS.safeUpper(payload.TIPO_FOTO || payload.MOMENTO || foto.TIPO_FOTO || foto.MOMENTO || "OUTRO");
    
    const ok = SGO_DATA.update(SHEET, fotoId, {
      TIPO_FOTO: tipo,
      MOMENTO: tipo,
      OBSERVACAO: SGO_UTILS.safe(payload.OBSERVACAO),
      ATUALIZADO_EM: SGO_UTILS.nowIso()
    }, DB_OS);
    
    if (!ok) return { success: false, message: "Erro ao atualizar evidencia." };
    
    const logAction = statusPermiteEdicaoExecucao_(os) ? "OS_FOTO_EDITAR_EXECUCAO" : "OS_FOTO_EDITAR_ADMIN";
    SGO_DATA.log(logAction, sessao.usuario, `Foto atualizada: ${fotoId} OS=${osId}`, "OS");
    
    return { success: true, message: "Foto/evidencia atualizada." };
  }

  return { listar, registrar, uploadBase64, remover, atualizarMeta };
})();

function osFotosListar(sessionId, osId) { 
  try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.listar(sessionId, osId))); } 
  catch(e) { return { success: false, message: `Erro: ${e.message}` }; } 
}

function osFotosRegistrar(sessionId, payload) { 
  try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.registrar(sessionId, payload))); } 
  catch(e) { return { success: false, message: `Erro: ${e.message}` }; } 
}

function osFotoUploadBase64(sessionId, osId, payload) { 
  try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.uploadBase64(sessionId, osId, payload))); } 
  catch(e) { return { success: false, message: `Erro: ${e.message}` }; } 
}

function osFotosRemover(sessionId, id, motivo) { 
  try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.remover(sessionId, id, motivo))); } 
  catch(e) { return { success: false, message: `Erro: ${e.message}` }; } 
}

function osFotosAtualizarMeta(sessionId, id, payload) { 
  try { return JSON.parse(JSON.stringify(SGO_OS_FOTOS.atualizarMeta(sessionId, id, payload))); } 
  catch(e) { return { success: false, message: `Erro: ${e.message}` }; } 
}