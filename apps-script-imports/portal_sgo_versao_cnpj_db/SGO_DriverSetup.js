function configurarPastasSGO() {
  try {
    // Busca o nome do sistema no arquivo de configuração ou usa um padrão
    const rootName = (typeof SGO_CFG !== "undefined" && SGO_CFG.SISTEMA && SGO_CFG.SISTEMA.NOME_EXIBICAO)
                     ? SGO_CFG.SISTEMA.NOME_EXIBICAO + " - ARQUIVOS"
                     : "METROLABS_SGO_BASE";

    let folders = DriveApp.getFoldersByName(rootName);
    let rootFolder;

    // 1. Cria ou recupera a pasta raiz do sistema no Google Drive
    if (folders.hasNext()) {
      rootFolder = folders.next();
      Logger.log("Pasta raiz já existe: " + rootName);
    } else {
      rootFolder = DriveApp.createFolder(rootName);
      Logger.log("Pasta raiz criada: " + rootName);
    }

    // ======================================================
    // TRAVA DE SEGURANÇA: Garante que a raiz seja RESTRITA
    // Bloqueia a navegação reversa para proteger outros clientes
    // ======================================================
    rootFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

    // 2. Cria as subpastas essenciais para a operação e organização
    const pastaDocumentos = obterOuCriarSubpasta_(rootFolder, "1. Documentos (NBR 15943)");
    const pastaQRCodes = obterOuCriarSubpasta_(rootFolder, "2. QR Codes Gerados");
    const pastaRelatorios = obterOuCriarSubpasta_(rootFolder, "3. Relatórios de Engenharia");

    // 3. Salva os IDs na memória invisível (PropertiesService) alinhado com o SGO_Config.gs
    const props = PropertiesService.getScriptProperties();
    props.setProperty("FOLDER_BASE", rootFolder.getId());
    props.setProperty("FOLDER_DOCUMENTOS", pastaDocumentos.getId());
    props.setProperty("FOLDER_QRCODES", pastaQRCodes.getId());
    props.setProperty("FOLDER_RELATORIOS", pastaRelatorios.getId());

    Logger.log("========================================");
    Logger.log("SETUP DO DRIVE CONCLUÍDO COM SUCESSO!");
    Logger.log("ID BASE: " + rootFolder.getId());
    Logger.log("ID DOCUMENTOS: " + pastaDocumentos.getId());
    Logger.log("========================================");

    return {
      success: true,
      message: "Estrutura Mestre criada e configurada com segurança (Acesso Restrito).",
      rootId: rootFolder.getId()
    };

  } catch (e) {
    Logger.log("ERRO NO SETUP DO DRIVE: " + e.message);
    return {
      success: false,
      message: "Erro ao configurar pastas: " + e.message
    };
  }
}

/**
 * Função auxiliar interna para não duplicar código de criação de pasta
 */
function obterOuCriarSubpasta_(pastaPai, nomePasta) {
  const pastas = pastaPai.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return pastaPai.createFolder(nomePasta);
}

// ======================================================
// NOVA FUNÇÃO: LIBERAR ACESSO INDIVIDUAL DO EQUIPAMENTO
// Será chamada pelos outros módulos para liberar apenas 1 pasta
// ======================================================
function liberarAcessoPublicoPasta_(folderId) {
  try {
    const pasta = DriveApp.getFolderById(folderId);
    // Define que qualquer pessoa com o link pode VER apenas esta pasta específica
    pasta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) {
    Logger.log("Erro ao liberar acesso da pasta: " + e.message);
    return false;
  }
}