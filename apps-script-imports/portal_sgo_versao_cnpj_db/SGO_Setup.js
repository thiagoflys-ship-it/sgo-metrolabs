function setupSGO() {
  let ss;
  try {
    const dbId = SGO_CFG.DB_ID;
    if (!dbId) throw new Error("ID do Banco não configurado.");
    
    // Tenta abrir o banco existente para não ficar criando planilhas soltas
    ss = SpreadsheetApp.openById(dbId);
    Logger.log("Atualizando estrutura no banco de dados existente...");
  } catch(e) {
    // Cria o banco e IMEDIATAMENTE salva o ID nas configurações
    ss = SpreadsheetApp.create(SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB");
    SGO_CFG.DB_ID = ss.getId(); 
    Logger.log("Novo banco de dados criado. ID salvo com sucesso.");
  }

  const abas = [
    SGO_CFG.SHEETS.CFG_SISTEMA,
    SGO_CFG.SHEETS.CAD_USUARIOS,
    SGO_CFG.SHEETS.CAD_CLIENTES,
    SGO_CFG.SHEETS.CAD_UNIDADES,
    SGO_CFG.SHEETS.CAD_EQUIPAMENTOS,
    SGO_CFG.SHEETS.DOC_DOCUMENTOS,
    SGO_CFG.SHEETS.SYS_ALERTAS,
    SGO_CFG.SHEETS.SYS_LOGS,
    SGO_CFG.SHEETS.CAD_PADROES,
    SGO_CFG.SHEETS.CERT_CALIBRACAO
  ];

  // TRAVA: setupTabela() abaixo LIMPA cada aba. Numa base que já tem dados
  // (clientes, equipamentos, usuários além do admin...) isso apagaria a
  // produção. Só segue em banco novo/vazio.
  const comDados = abas.filter(function (nomeAba) {
    const sh = ss.getSheetByName(nomeAba);
    if (!sh) return false;
    const linhas = sh.getLastRow();
    if (nomeAba === SGO_CFG.SHEETS.CFG_SISTEMA || nomeAba === SGO_CFG.SHEETS.SYS_LOGS) return false;
    if (nomeAba === SGO_CFG.SHEETS.CAD_USUARIOS) return linhas > 2; // só o admin inicial
    return linhas > 1;
  });
  if (comDados.length) {
    throw new Error("setupSGO recusado: o banco já tem dados em " + comDados.join(", ") + ". Esta rotina apaga as abas e só serve para instalação nova. Nada foi alterado.");
  }

  // Garante a existência de todas as abas de forma mais segura
  const sheetsAtuais = ss.getSheets();
  abas.forEach((nomeAba, index) => {
    if (!ss.getSheetByName(nomeAba)) {
      // Se for a primeira execução, renomeia a "Página1" padrão do Google Sheets
      if (index === 0 && (sheetsAtuais[0].getName() === "Página1" || sheetsAtuais[0].getName() === "Sheet1")) {
        sheetsAtuais[0].setName(nomeAba);
      } else {
        ss.insertSheet(nomeAba);
      }
    }
  });

  // Função auxiliar interna para formatar os cabeçalhos das tabelas
  const setupTabela = (sheetName, cabecalhos) => {
    const sheet = ss.getSheetByName(sheetName);
    sheet.clear();
    sheet.appendRow(cabecalhos);
    
    // Formatação visual: Congela a primeira linha, deixa em negrito e com fundo cinza
    const headerRange = sheet.getRange(1, 1, 1, cabecalhos.length);
    headerRange.setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
    
    return sheet;
  };

  /* =========================
     CFG_SISTEMA
  ========================== */
  const cfg = setupTabela(SGO_CFG.SHEETS.CFG_SISTEMA, ["CHAVE", "VALOR"]);
  
  cfg.appendRow(["APP_NAME", SGO_CFG.APP_NAME]);
  cfg.appendRow(["VERSION", SGO_CFG.VERSION]);
  cfg.appendRow(["DB_ID", ss.getId()]);
  cfg.appendRow(["CRIADO_EM", SGO_UTILS.nowIso()]);
  cfg.appendRow(["LOGO_URL", SGO_CFG.LOGO_URL]);
  cfg.appendRow(["OCIOSIDADE_SEGUNDOS", SGO_CFG.OCIOSIDADE.TEMPO_LIMITE_SEGUNDOS]);
  cfg.appendRow(["OCIOSIDADE_SOM_PADRAO", SGO_CFG.OCIOSIDADE.SOM_ATIVO_PADRAO]);
  cfg.appendRow(["ALERTA_VISUAL_OCIOSIDADE", SGO_CFG.OCIOSIDADE.ALERTA_VISUAL]);
  cfg.appendRow(["ALERTA_DIAS_PADRAO", SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO]);
  cfg.appendRow(["MOSTRAR_ALERTAS_DASHBOARD", SGO_CFG.ALERTAS.MOSTRAR_NO_DASHBOARD]);
  cfg.appendRow(["MODO_DEBUG", SGO_CFG.SISTEMA.MODO_DEBUG]);
  cfg.appendRow(["NOME_EXIBICAO", SGO_CFG.SISTEMA.NOME_EXIBICAO]);

  // Dimensiona a coluna para leitura fácil
  cfg.setColumnWidth(1, 250);
  cfg.setColumnWidth(2, 400);

  /* =========================
     CAD_USUARIOS
  ========================== */
  const usuarios = setupTabela(SGO_CFG.SHEETS.CAD_USUARIOS, [
    "ID",
    "USUARIO",
    "SENHA", // Nota: Idealmente em produção usaremos hash, mas mantido conforme sua base
    "NOME",
    "PERFIL",
    "STATUS",
    "CRIADO_EM",
    "CLIENTE_ID" // <- Trava de segurança do Portal do Cliente
  ]);

  usuarios.appendRow([
    SGO_UTILS.uuid(),
    "admin",
    "123456",
    "Administrador",
    "ADMIN",
    SGO_CFG.STATUS.ATIVO,
    SGO_UTILS.nowIso(),
    ""
  ]);

  /* =========================
     CAD_CLIENTES
  ========================== */
  setupTabela(SGO_CFG.SHEETS.CAD_CLIENTES, [
    "ID",
    "RAZAO_SOCIAL",
    "NOME_FANTASIA",
    "CNPJ",
    "ENDERECO", // <- Adicionado para consistência de cadastro
    "CONTATO",
    "EMAIL",
    "TELEFONE",
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     CAD_UNIDADES
  ========================== */
  setupTabela(SGO_CFG.SHEETS.CAD_UNIDADES, [
    "ID",
    "CLIENTE_ID",
    "NOME_UNIDADE",
    "CNPJ_UNIDADE",
    "ENDERECO",
    "CIDADE",
    "UF",
    "RESPONSAVEL",
    "TELEFONE",
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     CAD_EQUIPAMENTOS
  ========================== */
  setupTabela(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, [
    "ID",
    "CLIENTE_ID",
    "UNIDADE_ID",
    "TIPO",
    "FABRICANTE",
    "MODELO",
    "SERIE",
    "TAG",
    "SETOR",
    "PATRIMONIO", // 21/10/2026: identificação que os documentos usam (SGO_EQP_CAMPOS_NOVOS)
    "ANO_FABRICACAO",
    "CAPACIDADE",
    "NUM_CAMARAS",
    "RESPONSAVEL_CLIENTE",
    "QRCODE_LINK", // <- Adicionado para integrar com SGO_QRCode.gs
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     DOC_DOCUMENTOS
  ========================== */
  setupTabela(SGO_CFG.SHEETS.DOC_DOCUMENTOS, [
    "ID",
    "CLIENTE_ID",
    "UNIDADE_ID",
    "EQUIPAMENTO_ID",
    "TIPO_DOCUMENTO",
    "NOME_ARQUIVO",
    "LINK_ARQUIVO",
    "DATA_EMISSAO",    // <- Adicionado para rastreabilidade
    "DATA_VENCIMENTO", // <- Campo ativado para o robô de alertas
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     CAD_PADROES (Certificado de Calibração — padrões de referência)
  ========================== */
  setupTabela(SGO_CFG.SHEETS.CAD_PADROES, [
    "ID",
    "TAG",
    "DESCRICAO",
    "INCERTEZA_U95",
    "FATOR_K",
    "VEFF",
    "CERTIFICADO_NUMERO",
    "VALIDADE",
    "LINK_CERTIFICADO_PDF",
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     CERT_CALIBRACAO (Certificado de Calibração — certificados emitidos)
  ========================== */
  setupTabela(SGO_CFG.SHEETS.CERT_CALIBRACAO, [
    "ID",
    "NUMERO_CERTIFICADO",
    "CLIENTE_ID",
    "EQUIPAMENTO_ID",
    "TECNICO_ID",
    "DATA_CALIBRACAO",
    "DATA_EMISSAO",
    "DATA_VALIDADE",
    "LOCAL_CALIBRACAO",
    "VEREDITO",
    "DADOS_JSON",
    "LINK_PDF_CERTIFICADO",
    "LINK_PDF_RELATORIO_INTERPRETATIVO",
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     SYS_ALERTAS
  ========================== */
  setupTabela(SGO_CFG.SHEETS.SYS_ALERTAS, [
    "ID",
    "TIPO",
    "REFERENCIA_ID",
    "DESCRICAO",
    "DATA_LIMITE",
    "STATUS",
    "CRIADO_EM"
  ]);

  /* =========================
     SYS_LOGS
  ========================== */
  setupTabela(SGO_CFG.SHEETS.SYS_LOGS, [
    "ID",
    "DATA_HORA",
    "USUARIO",
    "ACAO",
    "MODULO", // <- Adicionado para facilitar filtros no futuro (ex: filtragem só de logs de 'EQUIPAMENTOS')
    "DETALHES"
  ]);

  Logger.log("SGO CONFIGURADO: " + ss.getId());

  return {
    ok: true,
    dbId: ss.getId(),
    url: ss.getUrl()
  };
}