const SGO_QRCODE = (() => {
  const URL_BASE_API = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=";

  /**
   * Função interna para navegar ou criar a estrutura de pastas no Drive
   */
  function obterOuCriarPasta_(pastaPai, nomePasta) {
    const nomeLimpo = String(nomePasta || "").replace(/[\\/:*?"<>|]/g, "_");
    const pastas = pastaPai.getFoldersByName(nomeLimpo);
    if (pastas.hasNext()) return pastas.next();
    return pastaPai.createFolder(nomeLimpo);
  }

  /**
   * Monta a URL base do WebApp com fallback seguro
   */
  function obterBaseWebApp_() {
    try {
      if (typeof SGO_CFG !== "undefined" && SGO_CFG && SGO_CFG.WEBAPP_URL) {
        const urlCfg = SGO_UTILS.safe(SGO_CFG.WEBAPP_URL);
        if (urlCfg) return urlCfg;
      }
    } catch (e) {}

    try {
      const prop = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL");
      if (prop) return String(prop);
    } catch (e) {}

    try {
      const runtimeUrl = ScriptApp.getService().getUrl();
      if (runtimeUrl) return runtimeUrl;
    } catch (e) {}

    throw new Error("URL do WebApp não encontrada. Publique o script como WebApp e salve a URL gerada nas Propriedades de Script como 'SGO_WEBAPP_URL'.");
  }

  /**
   * Monta a URL segura do sistema para acesso via QR
   */
  function montarUrlSeguraEquipamento_(equipamentoId) {
    const base = obterBaseWebApp_();
    const separador = base.indexOf("?") >= 0 ? "&" : "?";
    return base + separador + "equipamento=" + encodeURIComponent(SGO_UTILS.safe(equipamentoId));
  }

  /**
   * Garante a existência da pasta do equipamento e retorna a URL
   */
  function obterLinkPastaEquipamento_(eqp) {
    // Alinhado com a nomenclatura nova do Drive em SGO_Config.gs
    const rootId = SGO_CFG.DRIVE && SGO_CFG.DRIVE.FOLDER_DOCUMENTOS 
                 ? SGO_CFG.DRIVE.FOLDER_DOCUMENTOS 
                 : PropertiesService.getScriptProperties().getProperty("FOLDER_DOCUMENTOS");
                 
    if (!rootId) {
      throw new Error("Estrutura de pastas não configurada. Execute a função setupDrive() no script SGO_DriverSetup.gs.");
    }

    const root = DriveApp.getFolderById(rootId);

    // 1. Acessa/Cria Pasta do Cliente
    const nomeCliente = SGO_UTILS.safe(eqp.CLIENTE_NOME) || "Cliente Indefinido";
    const pastaCliente = obterOuCriarPasta_(root, nomeCliente);

    // 2. Acessa/Cria Pasta da Unidade
    const nomeUnidade = SGO_UTILS.safe(eqp.UNIDADE_NOME) || "Unidade Indefinida";
    const pastaUnidade = obterOuCriarPasta_(pastaCliente, nomeUnidade);

    // 3. Acessa/Cria Pasta do Equipamento
    const nomeEquip = (SGO_UTILS.safe(eqp.TAG) || "SEM TAG") + " - " + (SGO_UTILS.safe(eqp.TIPO) || "SEM TIPO");
    const pastaEquip = obterOuCriarPasta_(pastaUnidade, nomeEquip);

    // 4. Garante as subpastas da NBR 15943
    const categorias = [
      "1. Relatorios de Manutencao",
      "2. Certificados de Calibracao",
      "3. Relatorios de Qualificacao",
      "4. Ordens de Servico",
      "5. Contratos"
    ];
    categorias.forEach(cat => obterOuCriarPasta_(pastaEquip, cat));

    // ====================================================================
    // 🔒 LIBERAÇÃO CIRÚRGICA: Define a pasta do equipamento como visualizável
    // Apenas quem tem o link gerado pelo QR Code consegue ler os PDFs.
    // ====================================================================
    try {
      pastaEquip.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {
      Logger.log("Aviso: Falha ao tentar liberar link da pasta. " + e.message);
    }

    return pastaEquip.getUrl();
  }

  /**
   * Gera QR Code para acesso SEGURO ao equipamento via sistema
   * O QR não aponta mais direto para o Drive; ele aponta para o WebApp.
   */
  function gerarUrlEquipamento(sessionId, equipamentoId) {
    const sessao = exigirSessao(sessionId);
    const equipId = SGO_UTILS.safe(equipamentoId);

    if (!equipId) {
      return { success: false, message: "ID do equipamento não informado." };
    }

    // Busca dados completos do equipamento respeitando as travas atuais do módulo SGO_Equipamentos
    const resEquip = SGO_EQUIPAMENTOS.obter(sessionId, equipId);

    if (!resEquip || !resEquip.success || !resEquip.item) {
      return { success: false, message: "Equipamento não encontrado ou sem permissão de acesso." };
    }

    const eqp = resEquip.item;

    // URL do sistema com parâmetro do equipamento
    const linkSeguroSistema = montarUrlSeguraEquipamento_(equipId);

    // QR aponta para o sistema
    const qrUrl = URL_BASE_API + encodeURIComponent(linkSeguroSistema);

    // Log alinhado
    SGO_DATA.log("QRCODE_GERADO", sessao.usuario, "QR Code seguro gerado para TAG: " + SGO_UTILS.safe(eqp.TAG), "QRCODE");

    return {
      success: true,
      qrUrl: qrUrl,
      linkSeguro: linkSeguroSistema,
      equipamento: eqp
    };
  }

  /**
   * Acesso via QR com validação de sessão e pertencimento
   * Só cliente dono ou admin/gestor podem abrir
   */
  function acessarViaQR(sessionId, equipamentoId) {
    const sessao = exigirSessao(sessionId);
    const equipId = SGO_UTILS.safe(equipamentoId);

    if (!equipId) {
      return { success: false, message: "ID do equipamento não informado." };
    }

    // Usa a própria camada blindada do módulo de equipamentos para buscar o item
    const resEquip = SGO_EQUIPAMENTOS.obter(sessionId, equipId);

    if (!resEquip || !resEquip.success || !resEquip.item) {
      return { success: false, message: "Equipamento não encontrado ou sem permissão de acesso." };
    }

    const eqp = resEquip.item;
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    const isStaffAutorizado = perfil === "ADMIN" || perfil === "DIRETORIA" || perfil === "GESTOR" || perfil === "TECNICO";

    // Segunda blindagem de segurança para garantir o "Isolamento de Dados"
    if (!isStaffAutorizado && perfil === "CLIENTE") {
      
      // OTIMIZAÇÃO: Busca o clienteId direto da sessão, sem gastar cota do banco de dados (SGO_DATA)
      const clienteIdUsuario = SGO_UTILS.safe(sessao.clienteId); 
      const clienteIdEquip = SGO_UTILS.safe(eqp.CLIENTE_ID);

      if (!clienteIdUsuario || clienteIdUsuario !== clienteIdEquip) {
        SGO_DATA.log("QRCODE_NEGADO", sessao.usuario, "Tentativa de acesso não autorizada via QR na TAG: " + SGO_UTILS.safe(eqp.TAG), "QRCODE");
        return { success: false, message: "Acesso negado: este equipamento não pertence à sua conta." };
      }
    }

    // Se ele não é Staff Autorizado e não é CLIENTE, ele não tem como ver (ex: Perfil Comercial/Financeiro tentando ler QR Code).
    if (!isStaffAutorizado && perfil !== "CLIENTE") {
      return { success: false, message: "Acesso negado: seu perfil não possui permissão para consultar prontuários de equipamentos via QR." };
    }

    // Gera/Busca a pasta raiz desse equipamento no Google Drive
    const linkPasta = obterLinkPastaEquipamento_(eqp);

    SGO_DATA.log("QRCODE_ACESSO", sessao.usuario, "Acesso via QR liberado para TAG: " + SGO_UTILS.safe(eqp.TAG), "QRCODE");

    return {
      success: true,
      redirectUrl: linkPasta,
      equipamento: eqp
    };
  }

  return {
    gerarUrlEquipamento,
    acessarViaQR
  };
})();

/* =========================
   WRAPPERS BLINDADOS (TRY/CATCH)
========================= */

function qrcodeGerarParaEquipamento(sessionId, equipamentoId) {
  try {
    return JSON.parse(JSON.stringify(SGO_QRCODE.gerarUrlEquipamento(sessionId, equipamentoId)));
  } catch(e) {
    return { success: false, message: "Erro servidor (QR Code): " + e.message };
  }
}

function qrcodeAcessar(sessionId, equipamentoId) {
  try {
    return JSON.parse(JSON.stringify(SGO_QRCODE.acessarViaQR(sessionId, equipamentoId)));
  } catch(e) {
    return { success: false, message: "Erro servidor (Acesso QR): " + e.message };
  }
}