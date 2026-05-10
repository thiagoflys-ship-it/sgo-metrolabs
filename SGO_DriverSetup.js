function configurarPastasSGO() {
  return configurarPastasSGOV2();
}

function configurarPastasSGOV2() {
  try {
    const rootName = (typeof SGO_CFG !== "undefined" && SGO_CFG.SISTEMA && SGO_CFG.SISTEMA.NOME_EXIBICAO)
                     ? SGO_CFG.SISTEMA.NOME_EXIBICAO + " - ARQUIVOS"
                     : "METROLABS_SGO_BASE";

    let folders = DriveApp.getFoldersByName(rootName);
    let rootFolder;

    if (folders.hasNext()) {
      rootFolder = folders.next();
      Logger.log("Pasta raiz ja existe: " + rootName);
    } else {
      rootFolder = DriveApp.createFolder(rootName);
      Logger.log("Pasta raiz criada: " + rootName);
    }

    rootFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

    const pastaDocumentos = obterOuCriarSubpasta_(rootFolder, "1. Documentos (NBR 15943)");
    const pastaQRCodes = obterOuCriarSubpasta_(rootFolder, "2. QR Codes Gerados");
    const pastaRelatorios = obterOuCriarSubpasta_(rootFolder, "3. Relatorios de Engenharia");
    const pastasV2 = criarPastasEstruturaisSGOV2_(rootFolder);

    const props = PropertiesService.getScriptProperties();
    props.setProperty("FOLDER_BASE", rootFolder.getId());
    props.setProperty("FOLDER_DOCUMENTOS", pastaDocumentos.getId());
    props.setProperty("FOLDER_QRCODES", pastaQRCodes.getId());
    props.setProperty("FOLDER_RELATORIOS", pastaRelatorios.getId());
    props.setProperty("FOLDER_CLIENTES", pastasV2.clientes.getId());
    props.setProperty("FOLDER_OS", pastasV2.os.getId());
    props.setProperty("FOLDER_MISSOES", pastasV2.missoes.getId());
    props.setProperty("FOLDER_FROTA", pastasV2.frota.getId());
    props.setProperty("FOLDER_PECAS", pastasV2.pecas.getId());
    props.setProperty("FOLDER_FORNECEDORES", pastasV2.fornecedores.getId());
    props.setProperty("FOLDER_ESTOQUE", pastasV2.estoque.getId());
    props.setProperty("FOLDER_ETIQUETAS", pastasV2.etiquetas.getId());

    Logger.log("========================================");
    Logger.log("SETUP DO DRIVE V2 CONCLUIDO COM SUCESSO!");
    Logger.log("ID BASE: " + rootFolder.getId());
    Logger.log("ID DOCUMENTOS: " + pastaDocumentos.getId());
    Logger.log("ID OS: " + pastasV2.os.getId());
    Logger.log("========================================");

    return {
      success: true,
      message: "Estrutura mestre v2 criada e configurada com acesso restrito.",
      rootId: rootFolder.getId()
    };

  } catch (e) {
    Logger.log("ERRO NO SETUP DO DRIVE V2: " + e.message);
    return {
      success: false,
      message: "Erro ao configurar pastas v2: " + e.message
    };
  }
}

function obterOuCriarSubpasta_(pastaPai, nomePasta) {
  const pastas = pastaPai.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return pastaPai.createFolder(nomePasta);
}

function criarPastasEstruturaisSGOV2_(rootFolder) {
  const clientes = obterOuCriarSubpasta_(rootFolder, "Clientes");
  const os = obterOuCriarSubpasta_(rootFolder, "OS");
  const missoes = obterOuCriarSubpasta_(rootFolder, "Missoes");
  const frota = obterOuCriarSubpasta_(rootFolder, "Frota");
  const pecas = obterOuCriarSubpasta_(rootFolder, "Pecas");
  const fornecedores = obterOuCriarSubpasta_(rootFolder, "Fornecedores");
  const estoque = obterOuCriarSubpasta_(rootFolder, "Estoque");
  const etiquetas = obterOuCriarSubpasta_(rootFolder, "Etiquetas");

  obterOuCriarSubpasta_(os, "Fotos_Antes");
  obterOuCriarSubpasta_(os, "Fotos_Durante");
  obterOuCriarSubpasta_(os, "Fotos_Depois");
  obterOuCriarSubpasta_(os, "Anexos");
  obterOuCriarSubpasta_(os, "Assinatura");

  obterOuCriarSubpasta_(missoes, "Evidencias");
  obterOuCriarSubpasta_(frota, "Vistorias");
  obterOuCriarSubpasta_(frota, "Manutencao");
  obterOuCriarSubpasta_(frota, "Documentos");
  obterOuCriarSubpasta_(pecas, "Certificados");
  obterOuCriarSubpasta_(fornecedores, "Documentos_Legais");
  obterOuCriarSubpasta_(fornecedores, "Qualificacao");
  obterOuCriarSubpasta_(estoque, "Notas_Fiscais");
  obterOuCriarSubpasta_(estoque, "Lotes");
  obterOuCriarSubpasta_(etiquetas, "PDF");

  return {
    clientes: clientes,
    os: os,
    missoes: missoes,
    frota: frota,
    pecas: pecas,
    fornecedores: fornecedores,
    estoque: estoque,
    etiquetas: etiquetas
  };
}

function liberarAcessoPublicoPasta_(folderId) {
  try {
    const pasta = DriveApp.getFolderById(folderId);
    pasta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) {
    Logger.log("Erro ao liberar acesso da pasta: " + e.message);
    return false;
  }
}
