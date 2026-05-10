/* ============================================================
   METROLABS SGO+ — BACKEND DE VALIDAÇÃO DOCUMENTAL
   Arquivo: SGO_Validacao.js

   Registra tokens de documentos (inventários, relatórios) na
   aba DOC_TOKENS e oferece consulta pública via buscarDocumentoPorCodigo().

   A rota pública é: ?validar=TOKEN (tratada em SGO_Main.js).
   ============================================================ */

const SGO_VALIDACAO = (() => {
  const SHEET_NAME = "DOC_TOKENS";
  const QR_API     = "https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=";
  const HEADERS    = ["DATA","CODIGO","TIPO","CLIENTE","CNPJ","DESCRICAO","STATUS","URL_PDF","URL_VALIDACAO","GERADO_POR","EXTRA"];

  // ============================
  // INFRAESTRUTURA
  // ============================

  function obterBaseWebApp_() {
    try {
      const prop = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL");
      if (prop && String(prop).trim()) return String(prop).trim();
    } catch(e) {}
    try {
      const cfgUrl = SGO_CFG.WEBAPP_URL;
      if (cfgUrl && String(cfgUrl).trim()) return String(cfgUrl).trim();
    } catch(e) {}
    try {
      const runtimeUrl = ScriptApp.getService().getUrl();
      if (runtimeUrl) return runtimeUrl;
    } catch(e) {}
    return "";
  }

  function montarUrlValidacao_(codigo) {
    const base = obterBaseWebApp_();
    if (!base) return "";
    const sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "validar=" + encodeURIComponent(String(codigo).toUpperCase());
  }

  function obterSheet_() {
    const ss = SGO_DATA.getDB();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight("bold")
        .setBackground("#0b3b78")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  // ============================
  // REGISTRO
  // ============================

  function registrarInventario(codigo, metadados) {
    const m          = metadados || {};
    const codigoUp   = String(codigo).toUpperCase().trim();
    const urlValid   = montarUrlValidacao_(codigoUp);
    const descricao  = "Inventário de Equipamentos (" + (m.totalEquipamentos || 0) + " registros)";
    const extra      = JSON.stringify({
      totalEquipamentos: m.totalEquipamentos || 0,
      geradoEm:          m.geradoEm         || "",
      tipo:              "INVENTARIO",
      razaoSocial:       m.razaoSocial      || "",
      endereco:          m.endereco         || "",
      telefone:          m.telefone         || "",
      email:             m.email            || "",
      contato:           m.contato          || ""
    });

    obterSheet_().appendRow([
      new Date(),
      codigoUp,
      "INVENTARIO",
      m.cliente    || "",
      m.cnpj       || "",
      descricao,
      "VÁLIDO",
      "",
      urlValid,
      m.geradoPor  || "",
      extra
    ]);

    return {
      ok:             true,
      codigo:         codigoUp,
      urlValidacao:   urlValid,
      qrUrl:          urlValid ? QR_API + encodeURIComponent(urlValid) : ""
    };
  }

  // ============================
  // CONSULTA PÚBLICA (sem sessão)
  // ============================

  function buscarPorCodigo(codigo) {
    const codigoBusca = String(codigo || "").trim().toUpperCase();
    if (!codigoBusca) return { ok: false, mensagem: "Código de autenticação não informado." };

    try {
      const docAtual = buscarDocumentoControlado_(codigoBusca);
      if (docAtual) return docAtual;

      const sheet = obterSheet_();
      const dados = sheet.getDataRange().getValues();

      for (let i = 1; i < dados.length; i++) {
        const row = dados[i];
        const cod = String(row[1] || "").trim().toUpperCase();
        if (cod !== codigoBusca) continue;

        let dataEmissao = "--";
        try {
          dataEmissao = Utilities.formatDate(
            new Date(row[0]),
            Session.getScriptTimeZone(),
            "dd/MM/yyyy HH:mm"
          );
        } catch(e) {}

        let extra = {};
        try { extra = JSON.parse(String(row[10] || "{}")); } catch(e) {}

        const tipo = String(row[2] || "");
        return {
          ok:                true,
          codigoValidacao:   cod,
          documentoTipo:     tipo === "INVENTARIO" ? "Inventário de Equipamentos" : tipo,
          cliente:           String(row[3]  || ""),
          cnpj:              String(row[4]  || ""),
          equipamento:       String(row[5]  || ""),
          status:            String(row[6]  || "VÁLIDO"),
          urlPdf:            String(row[7]  || ""),
          urlValidacao:      String(row[8]  || ""),
          relatorioId:       String(row[9]  || ""),
          dataEmissao:       dataEmissao,
          razaoSocial:       extra.razaoSocial       || String(row[3] || ""),
          endereco:          extra.endereco          || "",
          telefone:          extra.telefone          || "",
          email:             extra.email             || "",
          contato:           extra.contato           || "",
          totalEquipamentos: extra.totalEquipamentos || 0,
          geradoEm:          extra.geradoEm          || "",
          extra:             extra
        };
      }
    } catch(e) {
      return { ok: false, mensagem: "Erro ao consultar: " + e.message };
    }

    return { ok: false, mensagem: "Código não localizado no histórico documental." };
  }

  function buscarDocumentoControlado_(codigoBusca) {
    try {
      const docs = SGO_DATA.getAll(SGO_CFG.SHEETS.DOC_DOCUMENTOS);
      const doc = docs.find(function(d) {
        return String(d.TOKEN_VALIDACAO || "").trim().toUpperCase() === codigoBusca;
      });
      if (!doc) return null;

      const cliente = doc.CLIENTE_ID ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, doc.CLIENTE_ID) : null;
      const unidade = doc.UNIDADE_ID ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, doc.UNIDADE_ID) : null;
      const equipamento = doc.EQUIPAMENTO_ID ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, doc.EQUIPAMENTO_ID) : null;

      return {
        ok: true,
        codigoValidacao: codigoBusca,
        documentoTipo: String(doc.TIPO_DOCUMENTO || "Documento Tecnico"),
        cliente: cliente ? String(cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || "") : "",
        cnpj: cliente ? String(cliente.CNPJ || "") : "",
        equipamento: equipamento ? String((equipamento.TAG || "") + " " + (equipamento.TIPO || "")) : "",
        status: String(doc.STATUS || "VALIDO"),
        urlPdf: String(doc.LINK_ARQUIVO || ""),
        urlValidacao: String(doc.URL_VALIDACAO || ""),
        relatorioId: String(doc.RESPONSAVEL_TECNICO || doc.OS_ID || doc.FILE_ID || ""),
        dataEmissao: formatarDataValidacao_(doc.DATA_EMISSAO || doc.CRIADO_EM),
        razaoSocial: cliente ? String(cliente.RAZAO_SOCIAL || cliente.NOME_FANTASIA || "") : "",
        endereco: unidade ? String(unidade.ENDERECO || "") : "",
        telefone: cliente ? String(cliente.TELEFONE || "") : "",
        email: cliente ? String(cliente.EMAIL || "") : "",
        contato: cliente ? String(cliente.CONTATO || "") : "",
        totalEquipamentos: equipamento ? 1 : 0,
        geradoEm: String(doc.CRIADO_EM || ""),
        hashSha256: String(doc.HASH_SHA256 || ""),
        extra: {
          documentoId: doc.ID,
          unidadeId: doc.UNIDADE_ID || "",
          equipamentoId: doc.EQUIPAMENTO_ID || "",
          pecaInstaladaId: doc.PECA_INSTALADA_ID || "",
          fornecedorId: doc.FORNECEDOR_ID || "",
          osId: doc.OS_ID || "",
          fileId: doc.FILE_ID || "",
          hashSha256: doc.HASH_SHA256 || ""
        }
      };
    } catch (e) {
      return null;
    }
  }

  function formatarDataValidacao_(valor) {
    if (!valor) return "--";
    try {
      return Utilities.formatDate(new Date(valor), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return String(valor || "");
    }
  }

  return { registrarInventario, buscarPorCodigo };
})();

/* ============================================================
   WRAPPERS PÚBLICOS
   buscarDocumentoPorCodigo é chamado pelo google.script.run
   da página Validacao_Documento.html — NÃO exige sessão.
   ============================================================ */

function buscarDocumentoPorCodigo(codigo) {
  try {
    return JSON.parse(JSON.stringify(SGO_VALIDACAO.buscarPorCodigo(codigo)));
  } catch(e) {
    return { ok: false, mensagem: "Erro ao consultar: " + e.message };
  }
}
