// Caminho: Backend/SGO_DocumentFactory.js

const SGO_DOCUMENT_FACTORY = (() => {
  const SHEET = sgoGetCfgSafe_().SHEETS.DOC_DOCUMENTOS;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=";

  const TIPOS_SUPORTADOS = {
    OS_TECNICA: "OS",
    FROTA_RETIRADA: "FRTRET",
    FROTA_DEVOLUCAO: "FRTDEV",
    FROTA_ABASTECIMENTO: "FRTABA",
    FROTA_MANUTENCAO: "FRTMAN",
    FROTA_RELATORIO_VEICULO: "FRTRV",
    FROTA_RELATORIO_GERAL: "FRTRG",
    FROTA_TERMO_MULTA: "FRTTM",
    ESTOQUE_ENTRADA: "ESTENT",
    ESTOQUE_SAIDA: "ESTSAI",
    FORNECEDOR_QUALIFICACAO: "FORN",
    INVENTARIO_TECNICO: "INV",
    RASTREABILIDADE_COMPLETA: "RAST",
    CONTRATO: "CONT",
    EQUIPAMENTO_FICHA: "EQP",
    PECA_FICHA: "PECA",
    RELATORIO_CONFORMIDADE: "CONF",
    EQUIPAMENTO_FICHA_TESTE: "TESTE",
    FIN_FLASH_COMPROVANTE_ENTREGA: "FLENT",
    FIN_FLASH_RELATORIO_PRESTACAO: "FLRPR",
    FIN_FLASH_RELATORIO_PENDENCIAS: "FLRPE",
    FIN_FLASH_RELATORIO_CONCILIACAO: "FLRCO",
    FIN_FLASH_RELATORIO_EXTRATO: "FLREX",
    FIN_FLASH_RELATORIO_GERENCIAL: "FLRGE"
  };

  const COLUNAS_DOCUMENTOS = [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "OS_ID", "PECA_ID",
    "PECA_INSTALADA_ID", "FORNECEDOR_ID", "VEICULO_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO",
    "TITULO", "NOME_ARQUIVO", "LINK_ARQUIVO", "FILE_ID", "DATA_EMISSAO",
    "DATA_VENCIMENTO", "STATUS", "HASH_SHA256", "TOKEN_VALIDACAO",
    "URL_VALIDACAO", "QRCODE_LINK", "QR_CODE_LINK", "MODULO_ORIGEM", "ENTIDADE_ID",
    "VISIBILIDADE", "PERIODO_INICIAL", "PERIODO_FINAL", "PERIODO_LABEL",
    "RESPONSAVEL_TECNICO", "CREA_CRT", "CRIADO_POR", "CRIADO_EM"
  ];

  function gerarDocumento(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    const dados = normalizarPayload_(payload || {});
    validarPayload_(dados);
    validarPermissao_(sessao, dados);
    garantirColunasDocumentos_();

    const emitidoEm = SGO_UTILS.nowIso();
    const codigo = gerarCodigoDocumental_(dados.TIPO_DOCUMENTO);
    const token = gerarTokenValidacao_(dados.TIPO_DOCUMENTO, emitidoEm);
    const validacaoUrl = montarUrlValidacao_(token);
    const qrCodeUrl = validacaoUrl ? QR_API + encodeURIComponent(validacaoUrl) : "";
    const qrCodeDataUrl = gerarQrCodeDataUrl_(validacaoUrl);
    const contexto = montarContexto_(dados);
    const hash = gerarHashDocumento_(dados, emitidoEm, sessao, codigo);
    const nomeArquivo = montarNomeArquivo_(dados, codigo, emitidoEm);
    const html = montarHtmlDocumentoPadrao_(dados, contexto, {
      codigo: codigo,
      token: token,
      hash: hash,
      emitidoEm: emitidoEm,
      usuario: sessao.nome || sessao.usuario || sessao.userId || "",
      validacaoUrl: validacaoUrl,
      qrCodeUrl: qrCodeUrl,
      qrCodeDataUrl: qrCodeDataUrl
    });
    const pdf = salvarPdfNoDrive_(html, nomeArquivo, dados);
    const downloadUrl = "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(pdf.fileId);
    const registro = SGO_DATA.insert(SHEET, {
      CLIENTE_ID: dados.CLIENTE_ID,
      UNIDADE_ID: dados.UNIDADE_ID,
      EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
      OS_ID: dados.OS_ID,
      PECA_ID: dados.PECA_ID,
      FORNECEDOR_ID: dados.FORNECEDOR_ID,
      VEICULO_ID: dados.VEICULO_ID,
      PERIODO_INICIAL: dados.PERIODO_INICIAL,
      PERIODO_FINAL: dados.PERIODO_FINAL,
      PERIODO_LABEL: dados.PERIODO_LABEL,
      TIPO_DOCUMENTO: dados.TIPO_DOCUMENTO,
      NUMERO_DOCUMENTO: codigo,
      TITULO: dados.TITULO,
      NOME_ARQUIVO: nomeArquivo,
      LINK_ARQUIVO: pdf.url,
      FILE_ID: pdf.fileId,
      DATA_EMISSAO: emitidoEm,
      DATA_VENCIMENTO: dados.VALIDADE,
      STATUS: "VALIDO",
      HASH_SHA256: hash,
      TOKEN_VALIDACAO: token,
      URL_VALIDACAO: validacaoUrl,
      QRCODE_LINK: qrCodeUrl,
      QR_CODE_LINK: qrCodeUrl,
      MODULO_ORIGEM: dados.MODULO_ORIGEM,
      ENTIDADE_ID: dados.ENTIDADE_ID,
      VISIBILIDADE: dados.VISIBILIDADE,
      CRIADO_POR: sessao.userId || sessao.usuario || "",
      CRIADO_EM: emitidoEm
    });
    SGO_DATA.log(
      "DOCUMENTO_GERADO",
      sessao.usuario || sessao.userId || "",
      "Documento gerado: " + token,
      "DOCUMENT_FACTORY"
    );
    const whatsappTexto = montarTextoWhatsapp_(dados, token, validacaoUrl, pdf.url);
    const email = montarEmail_(dados, pdf.fileId, validacaoUrl, pdf.url);
    return {
      success: true,
      documentoId: registro.ID,
      tokenValidacao: token,
      hash: hash,
      pdfFileId: pdf.fileId,
      pdfUrl: pdf.url,
      downloadUrl: downloadUrl,
      validacaoUrl: validacaoUrl,
      qrCodeUrl: qrCodeUrl,
      qrCodeDataUrl: qrCodeDataUrl,
      periodoInicial: dados.PERIODO_INICIAL,
      periodoFinal: dados.PERIODO_FINAL,
      periodoLabel: dados.PERIODO_LABEL,
      templateDocumental: dados.TIPO_DOCUMENTO === "OS_TECNICA" ?
      "OS_TECNICA_PREMIUM_V3" : "",
      whatsappTexto: whatsappTexto,
      email: email
    };
  }

  function obterDocumentoPorToken(token) {
    const tokenBusca = SGO_UTILS.safeUpper(token);
    if (!tokenBusca) return null;
    try {
      return SGO_DATA.getByField(SHEET, "TOKEN_VALIDACAO", tokenBusca);
    } catch (e) {
      return null;
    }
  }

  function normalizarPayload_(payload) {
    return {
      TIPO_DOCUMENTO: SGO_UTILS.safeUpper(payload.TIPO_DOCUMENTO),
      TITULO: SGO_UTILS.safe(payload.TITULO),
      MODULO_ORIGEM: SGO_UTILS.safeUpper(payload.MODULO_ORIGEM || "DOCUMENT_FACTORY"),
      ENTIDADE_ID: SGO_UTILS.safe(payload.ENTIDADE_ID),
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(payload.UNIDADE_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      OS_ID: SGO_UTILS.safe(payload.OS_ID),
      PECA_ID: SGO_UTILS.safe(payload.PECA_ID),
      FORNECEDOR_ID: SGO_UTILS.safe(payload.FORNECEDOR_ID),
      VEICULO_ID: SGO_UTILS.safe(payload.VEICULO_ID),
      PERIODO_INICIAL: SGO_UTILS.safe(payload.PERIODO_INICIAL),
      PERIODO_FINAL: SGO_UTILS.safe(payload.PERIODO_FINAL),
      PERIODO_LABEL: SGO_UTILS.safe(payload.PERIODO_LABEL),
      DADOS: payload.DADOS && typeof payload.DADOS === "object" ? payload.DADOS : {},
      HTML_CUSTOM: SGO_UTILS.safeUpper(payload.TIPO_DOCUMENTO) === "OS_TECNICA" ?
      "" : SGO_UTILS.safe(payload.HTML_CUSTOM),
      NOME_ARQUIVO: SGO_UTILS.safe(payload.NOME_ARQUIVO),
      VALIDADE: SGO_UTILS.safe(payload.VALIDADE),
      VISIBILIDADE: SGO_UTILS.safeUpper(payload.VISIBILIDADE || "PUBLICO_VALIDACAO")
    };
  }

  function validarPayload_(dados) {
    if (!dados.TIPO_DOCUMENTO) throw new Error("TIPO_DOCUMENTO e obrigatorio.");
    if (!TIPOS_SUPORTADOS[dados.TIPO_DOCUMENTO]) {
      throw new Error("Tipo documental nao suportado pelo DocumentFactory: " + dados.TIPO_DOCUMENTO);
    }
    if (!dados.TITULO) throw new Error("TITULO e obrigatorio.");
    if (!dados.MODULO_ORIGEM) throw new Error("MODULO_ORIGEM e obrigatorio.");
  }

  function validarPermissao_(sessao, dados) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    const tipo = dados.TIPO_DOCUMENTO;
    if (perfil === "CLIENTE") {
      throw new Error("Perfil CLIENTE nao pode gerar documentos pelo motor central nesta etapa.");
    }

    if (["ADMIN", "GESTOR", "DIRETORIA"].indexOf(perfil) >= 0) return;
    if (perfil === "METROLOGIA") {
      if ([
        "OS_TECNICA", "INVENTARIO_TECNICO", "RASTREABILIDADE_COMPLETA",
        "EQUIPAMENTO_FICHA", "PECA_FICHA", "RELATORIO_CONFORMIDADE",
        "EQUIPAMENTO_FICHA_TESTE"
      ].indexOf(tipo) >= 0) return;
    }

    if (perfil === "TECNICO") {
      if (["OS_TECNICA", "EQUIPAMENTO_FICHA", "PECA_FICHA", "RASTREABILIDADE_COMPLETA"].indexOf(tipo) >= 0) return;
    }

    if (perfil === "FINANCEIRO") {
      if (["CONTRATO"].indexOf(tipo) >= 0) return;
    }

    throw new Error("Perfil sem permissao para gerar este tipo documental: " + perfil + " / " + tipo);
  }

  function garantirColunasDocumentos_() {
    const ss = SGO_DATA.getDB();
    let sheet = ss.getSheetByName(SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET);
      sheet.appendRow(COLUNAS_DOCUMENTOS);
      sheet.getRange(1, 1, 1, COLUNAS_DOCUMENTOS.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
      if (SGO_DATA.clearCache) SGO_DATA.clearCache();
      return;
    }

    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.appendRow(COLUNAS_DOCUMENTOS);
      sheet.getRange(1, 1, 1, COLUNAS_DOCUMENTOS.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
      if (SGO_DATA.clearCache) SGO_DATA.clearCache();
      return;
    }

    const atuais = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });
    const faltantes = COLUNAS_DOCUMENTOS.filter(function(h) {
      return atuais.indexOf(h) < 0;
    });
    if (faltantes.length) {
      sheet.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
      sheet.getRange(1, 1, 1, atuais.length + faltantes.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
      if (SGO_DATA.clearCache) SGO_DATA.clearCache();
    }
  }

  function montarContexto_(dados) {
    return {
      cliente: obterSeguro_(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES, dados.CLIENTE_ID),
      unidade: obterSeguro_(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, dados.UNIDADE_ID),
      equipamento: obterSeguro_(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS, dados.EQUIPAMENTO_ID),
      peca: obterSeguro_(sgoGetCfgSafe_().SHEETS.CAD_PECAS, dados.PECA_ID),
      fornecedor: obterSeguro_(sgoGetCfgSafe_().SHEETS.CAD_FORNECEDORES, dados.FORNECEDOR_ID, "ESTOQUE"),
      veiculo: obterSeguro_(sgoGetCfgSafe_().SHEETS.FRT_VEICULOS, dados.VEICULO_ID, "FROTA"),
      os: obterSeguro_(sgoGetCfgSafe_().SHEETS.OS_ORDENS, dados.OS_ID, "OS")
    };
  }

  function obterSeguro_(sheet, id, dbKey) {
    const safeId = SGO_UTILS.safe(id);
    if (!safeId || !sheet) return null;
    try {
      return SGO_DATA.getById(sheet, safeId, dbKey);
    } catch (e) {
      return null;
    }
  }

  function montarHtmlDocumentoPadrao_(dados, contexto, meta) {
    if (dados.TIPO_DOCUMENTO === "OS_TECNICA") {
      const pacoteOS = montarPacoteOSTecnicaV3_(dados, contexto);
      return "<!doctype html><html><head><meta charset=\"UTF-8\"><style>" +
        getDocumentoCss_() + getOSTecnicaCss_() +
        "</style></head><body>" +
        montarHtmlOSTecnicaPremiumV3_(pacoteOS, meta) +
        "</body></html>";
    }
    if (isDocumentoFrota_(dados.TIPO_DOCUMENTO) && dados.HTML_CUSTOM) {
      return montarHtmlFrotaCustom_(dados, meta);
    }
    const custom = dados.HTML_CUSTOM ? aplicarMetaNoHtml_(dados.HTML_CUSTOM, meta) : "";
    if (custom && custom.indexOf('class="df-doc"') >= 0) {
      return '<!doctype html><html><head><meta charset="UTF-8"><style>' + getDocumentoCss_() + '</style></head><body>' + custom + '</body></html>';
    }
    const corpo = custom || montarCorpoPadrao_(dados.DADOS);
    const clienteNome = contexto.cliente ?
    (contexto.cliente.NOME_FANTASIA || contexto.cliente.RAZAO_SOCIAL || "") : "";
    const unidadeNome = contexto.unidade ? (contexto.unidade.NOME_UNIDADE || contexto.unidade.NOME || "") : "";
    const eqpNome = contexto.equipamento ? [contexto.equipamento.TAG, contexto.equipamento.TIPO, contexto.equipamento.MODELO].filter(Boolean).join(" - ") : "";
    const qrSrc = meta.qrCodeDataUrl || meta.qrCodeUrl;
    return '<!doctype html><html><head><meta charset="UTF-8">' +
      '<style>' +
      getDocumentoCss_() +
      '</style></head><body><main class="page">' +
      '<header class="header"><div><div class="logo">METROLABS</div><div class="subtitle">SGO+ Engenharia Clinica</div></div><div class="title"><h1>' + esc_(dados.TITULO) + '</h1><p>' + esc_(dados.TIPO_DOCUMENTO) + ' &middot; <span class="seal">Documento controlado</span></p></div></header>' +
      '<div class="grid">' +
      blocoInfo_("Codigo documental", meta.codigo) +
      blocoInfo_("Data de emissao", formatarData_(meta.emitidoEm)) +
      blocoInfo_("Emitido por", meta.usuario) +
      blocoInfo_("Modulo de origem", dados.MODULO_ORIGEM) +
      blocoInfo_("Cliente", clienteNome || dados.CLIENTE_ID) +
      blocoInfo_("Unidade", unidadeNome || dados.UNIDADE_ID) +
      blocoInfo_("Equipamento", eqpNome || dados.EQUIPAMENTO_ID) +
      blocoInfo_("Entidade vinculada", dados.ENTIDADE_ID || dados.OS_ID || dados.PECA_ID || dados.FORNECEDOR_ID || dados.VEICULO_ID) +
      '</div>' +
      '<div class="section-title">Conteudo do documento</div><section class="body">' + corpo + '</section>' +
      '<div class="section-title">Rastreabilidade e validacao</div><section class="trace"><div class="grid" style="grid-template-columns:1fr">' +
      blocoInfo_("Token de validacao", meta.token, true) +
      blocoInfo_("Hash SHA256", meta.hash, true) +
      blocoInfo_("URL publica de validacao", meta.validacaoUrl, true) +
      '</div><div class="qr"><img src="' + escAttr_(qrSrc) + '" alt="QR Code"><div class="label">Validacao digital</div></div></section>' +
      '<footer class="footer">Este documento foi emitido pelo METROLABS SGO+ com token unico, hash SHA256 e QR Code de validacao publica. Token: <span class="mono">' + esc_(meta.token) + '</span><br>Hash: <span class="mono">' + esc_(meta.hash) + '</span><br>Validacao: <span class="mono">' + esc_(meta.validacaoUrl) + '</span></footer>' +
      '</main></body></html>';
  }

  function isDocumentoFrota_(tipo) {
    const tipoUp = SGO_UTILS.safeUpper(tipo);
    return tipoUp.indexOf("FROTA_") === 0 || [
      "FROTA_RELATORIO_VEICULO",
      "FROTA_RELATORIO_GERAL",
      "FROTA_TERMO_MULTA"
    ].indexOf(tipoUp) >= 0;
  }

  function montarHtmlFrotaCustom_(dados, meta) {
    const metaFrota = Object.assign({}, meta, {
      logoMetrolabsHtml: logoMetrolabsHtml_()
    });
    const custom = aplicarMetaNoHtml_(dados.HTML_CUSTOM, metaFrota);
    return '<!doctype html><html><head><meta charset="UTF-8"><style>' +
      getDocumentoCss_() +
      '</style></head><body>' + custom + '</body></html>';
  }

  function aplicarMetaNoHtml_(html, meta) {
    return String(html || "")
      .replace(/\{\{CODIGO_DOCUMENTAL\}\}/g, esc_(meta.codigo || ""))
      .replace(/\{\{TOKEN_VALIDACAO\}\}/g, esc_(meta.token || ""))
      .replace(/\{\{HASH_SHA256\}\}/g, esc_(meta.hash || ""))
      .replace(/\{\{URL_VALIDACAO\}\}/g, esc_(meta.validacaoUrl || ""))
      .replace(/\{\{QRCODE_DATA_URL\}\}/g, escAttr_(meta.qrCodeDataUrl || meta.qrCodeUrl || ""))
      .replace(/\{\{QRCODE_URL\}\}/g, escAttr_(meta.qrCodeUrl || ""))
      .replace(/\{\{LOGO_METROLABS_HTML\}\}/g, meta.logoMetrolabsHtml || logoMetrolabsHtml_())
      .replace(/\{\{DATA_EMISSAO\}\}/g, esc_(formatarData_(meta.emitidoEm)))
      .replace(/\{\{GERADO_POR\}\}/g, esc_(meta.usuario || ""));
  }

  function logoMetrolabsHtml_() {
    try {
      const fileId = SGO_UTILS.safe(sgoGetCfgSafe_().LOGO_FILE_ID);
      if (fileId) {
        const dataUrl = imagemDriveDataUrl_(fileId);
        if (dataUrl) return '<img src="' + escAttr_(dataUrl) + '" alt="Metrolabs">';
      }
    } catch (e) {}
    try {
      const logoUrl = SGO_UTILS.safe(sgoGetCfgSafe_().LOGO_URL);
      if (logoUrl) return '<img src="' + escAttr_(logoUrl) + '" alt="Metrolabs">';
    } catch (e2) {}
    return '<div class="frota-pdf-logo-fallback">METROLABS</div>';
  }

  function montarPacoteOSTecnicaV3_(dados, contexto) {
    const pacote = dados.DADOS && typeof dados.DADOS === "object" ? dados.DADOS : {};
    return Object.assign({}, pacote, {
      os: pacote.os || contexto.os || {
        ID: dados.OS_ID,
        CLIENTE_ID: dados.CLIENTE_ID,
        UNIDADE_ID: dados.UNIDADE_ID,
        EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
        PECA_ID: dados.PECA_ID,
        STATUS: "",
        NUMERO_OS: dados.ENTIDADE_ID || dados.OS_ID
      },
      cliente: pacote.cliente || contexto.cliente || null,
      unidade: pacote.unidade || contexto.unidade || null,
      equipamento: pacote.equipamento || contexto.equipamento || null,
      peca: pacote.peca || contexto.peca || null,
      fornecedor: pacote.fornecedor || contexto.fornecedor || null,
      veiculo: pacote.veiculo || contexto.veiculo || null,
      checklist: pacote.checklist || [],
      materiais: pacote.materiais || [],
      fotos: pacote.fotos || [],
      assinaturas: pacote.assinaturas || (pacote.assinatura ? [pacote.assinatura] : []),
      custos: pacote.custos || {},
      templateDocumental: "OS_TECNICA_PREMIUM_V3"
    });
  }

  function getDocumentoCss_() {
    return '@page{size:A4;margin:14mm 14mm 16mm}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#fff;font-size:11px}.page{width:100%}.header{display:grid;grid-template-columns:160px 1fr;gap:18px;align-items:center;border-bottom:4px solid #0b7a3e;padding-bottom:14px;margin-bottom:18px}.logo{font-size:24px;font-weight:900;color:#0b3b78;letter-spacing:.02em}.subtitle{font-size:10px;color:#667085;text-transform:uppercase;font-weight:800;letter-spacing:.06em}.title{text-align:right}.title h1{margin:0;color:#0b3b78;font-size:22px;line-height:1.2}.title p{margin:6px 0 0;color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.info{border:1px solid #dfe6ee;background:#f8fafc;border-radius:6px;padding:9px}.label{font-size:8px;color:#667085;text-transform:uppercase;font-weight:800;margin-bottom:4px;letter-spacing:.04em}.value{font-size:11px;font-weight:700;word-break:break-word}.section-title{background:#0b3b78;color:#fff;font-weight:900;font-size:9px;text-transform:uppercase;letter-spacing:.05em;padding:6px 9px;border-radius:4px;margin:16px 0 8px}.body{border:1px solid #dfe6ee;border-radius:8px;padding:14px;line-height:1.55}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{border-bottom:1px solid #dfe6ee;text-align:left;padding:7px;vertical-align:top}.data-table th{width:32%;font-size:9px;text-transform:uppercase;color:#667085}.trace{display:grid;grid-template-columns:1fr 120px;gap:14px;align-items:start}.qr{border:1px solid #dfe6ee;border-radius:8px;padding:8px;text-align:center}.qr img{width:104px;height:104px}.footer{border-top:1px solid #dfe6ee;margin-top:18px;padding-top:10px;color:#667085;font-size:9px;line-height:1.5}.mono{font-family:Consolas,Monaco,monospace;word-break:break-all}.seal{display:inline-block;border:2px solid #0b7a3e;color:#0b7a3e;border-radius:999px;padding:5px 10px;font-weight:900;font-size:9px;text-transform:uppercase}' +
      '.df-doc{background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:10px;line-height:1.45}.df-cover{border-bottom:4px solid #007b3e;padding-bottom:14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 118px;gap:18px;align-items:start}.df-brand{font-size:20px;font-weight:900;color:#007b3e;letter-spacing:.04em}.df-brand-sub{font-size:8px;color:#667085;text-transform:uppercase;font-weight:800;letter-spacing:.08em}.df-title{font-size:24px;font-weight:900;color:#0b3b78;margin:18px 0 3px;text-transform:uppercase;letter-spacing:.03em}.df-subtitle{font-size:10px;color:#475467;font-weight:700}.df-cover-meta{margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.df-meta{border:1px solid #dfe6ee;background:#f8fafc;border-radius:6px;padding:7px}.df-meta-k{font-size:7px;color:#667085;text-transform:uppercase;font-weight:900;letter-spacing:.06em}.df-meta-v{font-size:10px;color:#111827;font-weight:800;margin-top:2px;word-break:break-word}.df-qrbox{border:1px solid #dfe6ee;border-radius:8px;padding:8px;text-align:center;background:#fff}.df-qrbox img{width:96px;height:96px;display:block;margin:0 auto}.df-token{font-family:Consolas,Monaco,monospace;font-size:7px;color:#0b3b78;word-break:break-all;margin-top:5px;font-weight:800}.df-section{margin:14px 0 0}.df-section-title{font-size:8px;font-weight:900;color:#0b3b78;text-transform:uppercase;letter-spacing:.08em;border-left:4px solid #007b3e;padding-left:7px;margin:0 0 7px}.df-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.df-card{border:1px solid #dfe6ee;border-radius:6px;background:#f8fafc;padding:7px}.df-table{width:100%;border-collapse:collapse;font-size:9px}.df-table th{background:#0b3b78;color:#fff;text-align:left;padding:6px;font-size:7px;text-transform:uppercase;letter-spacing:.04em}.df-table td{border-bottom:1px solid #e5e7eb;padding:6px;vertical-align:top}.df-table tbody tr:nth-child(even) td{background:#f9fafb}.df-note{border:1px solid #dfe6ee;border-radius:6px;padding:9px;background:#fff;white-space:pre-line}.df-sign{display:grid;grid-template-columns:1.2fr 1fr;gap:10px;align-items:start}.df-sign-img{border:1px solid #dfe6ee;border-radius:6px;min-height:70px;text-align:center;padding:6px}.df-sign-img img{max-width:100%;max-height:92px}.df-footer{margin-top:16px;border-top:1px solid #dfe6ee;padding-top:8px;display:grid;grid-template-columns:1fr 78px;gap:12px;color:#667085;font-size:8px;page-break-inside:avoid}.df-footer img{width:70px;height:70px}.df-badge{display:inline-block;padding:2px 7px;border-radius:999px;background:#e1effe;color:#0b3b78;font-size:7px;font-weight:900;text-transform:uppercase}.df-badge-ok{background:#d1fae5;color:#065f46}.df-badge-warn{background:#fef3c7;color:#92400e}.df-badge-danger{background:#fee2e2;color:#991b1b}.df-break{page-break-before:always}';
  }

  // >>> EXTRAÇÃO INTELIGENTE DE ID DO DRIVE <<<
  function extractDriveFileId_(urlOrId) {
    if (!urlOrId) return null;
    if (urlOrId.length >= 25 && urlOrId.indexOf("/") < 0 && urlOrId.indexOf("=") < 0) return urlOrId;
    var match = urlOrId.match(/(?:id=|d\/)([-\w]{25,})/);
    return match ? match[1] : null;
  }

  function imagemDriveDataUrl_(fileIdOrUrl) {
    const id = extractDriveFileId_(fileIdOrUrl);
    if (!id) return "";
    try {
      const blob = DriveApp.getFileById(id).getBlob();
      const contentType = blob.getContentType() || "image/jpeg";
      if (contentType.indexOf("image/") !== 0) return "";
      return "data:" + contentType + ";base64," + Utilities.base64Encode(blob.getBytes());
    } catch (e) {
      Logger.log("Falha ao carregar imagem Drive no PDF: " + id + " - " + e.message);
      return "";
    }
  }

  function gerarQrCodeDataUrl_(validacaoUrl) {
    if (!validacaoUrl) return "";
    try {
      const resp = UrlFetchApp.fetch(QR_API + encodeURIComponent(validacaoUrl), {
        muteHttpExceptions: true,
        followRedirects: true
      });
      if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) return "";
      return "data:image/png;base64," + Utilities.base64Encode(resp.getBlob().getBytes());
    } catch (e) {
      Logger.log("Falha ao gerar QR inline: " + e.message);
      return "";
    }
  }

  function blocoInfo_(label, value, mono) {
    return '<div class="info"><div class="label">' + esc_(label) + '</div><div class="value' + (mono ? " mono" : "") + '">' + esc_(value || "--") + '</div></div>';
  }

  function montarCorpoPadrao_(obj) {
    const linhas = flattenObject_(obj || {}, "");
    if (!linhas.length) {
      return "<p>Documento técnico emitido pelo METROLABS SGO+ sem dados adicionais informados.</p>";
    }
    return '<table class="data-table"><tbody>' + linhas.map(function(l) {
      return '<tr><th>' + esc_(l.label) + '</th><td>' + esc_(l.value) + '</td></tr>';
    }).join("") + '</tbody></table>';
  }

  function flattenObject_(obj, prefixo) {
    const saida = [];
    Object.keys(obj || {}).forEach(function(k) {
      const valor = obj[k];
      const label = prefixo ? prefixo + "." + k : k;
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        saida.push.apply(saida, flattenObject_(valor, label));
      } else {
        saida.push({ label: label, value: Array.isArray(valor) ? valor.join(", ") : String(valor === undefined || valor === null ? "" : valor) });
      }
    });
    return saida;
  }

  function salvarPdfNoDrive_(html, nomeArquivo, dados) {
    const folder = obterPastaDestino_(dados);
    const blobHtml = Utilities.newBlob(html, "text/html", nomeArquivo.replace(/\.pdf$/i, ".html"));
    const pdfBlob = blobHtml.getAs(MimeType.PDF).setName(nomeArquivo);
    const file = folder.createFile(pdfBlob);
    if (dados.VISIBILIDADE !== "PRIVADO") {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Não foi possível compartilhar PDF DocumentFactory: " + e.message);
      }
    }

    return {
      fileId: file.getId(),
      url: file.getUrl()
    };
  }

  function obterPastaDestino_(dados) {
    const drive = sgoGetCfgSafe_().DRIVE || {};
    const modulo = SGO_UTILS.safeUpper(dados.MODULO_ORIGEM);
    let folderId = "";
    if (modulo === "OS") folderId = drive.FOLDER_OS;
    else if (modulo === "FROTA") folderId = drive.FOLDER_FROTA;
    else if (modulo === "ESTOQUE") folderId = drive.FOLDER_ESTOQUE;
    else if (modulo === "FORNECEDORES") folderId = drive.FOLDER_FORNECEDORES;
    else if (modulo === "PECAS") folderId = drive.FOLDER_PECAS;

    folderId = folderId || drive.FOLDER_RELATORIOS || drive.FOLDER_DOCUMENTOS || drive.FOLDER_BASE;
    if (!folderId) {
      throw new Error("Nenhuma pasta Drive configurada. Execute o setup do Drive antes de gerar documentos.");
    }
    return DriveApp.getFolderById(folderId);
  }

  function gerarHashDocumento_(dados, emitidoEm, sessao, codigo) {
    const base = JSON.stringify({
      tipo: dados.TIPO_DOCUMENTO,
      titulo: dados.TITULO,
      dados: dados.DADOS,
      dataEmissao: emitidoEm,
      entidade: dados.ENTIDADE_ID || dados.OS_ID || dados.PECA_ID || dados.FORNECEDOR_ID || dados.VEICULO_ID,
      usuario: sessao.userId || sessao.usuario || "",
      codigo: codigo
    });
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, base, Utilities.Charset.UTF_8);
    return digest.map(function(b) {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    }).join("");
  }

  function gerarTokenValidacao_(tipo, emitidoEm) {
    const ano = new Date(emitidoEm).getFullYear();
    const curto = TIPOS_SUPORTADOS[tipo] || tipo.substring(0, 6);
    return ["DOC", curto, ano, Utilities.getUuid().substring(0, 8).toUpperCase()].join("-");
  }

  function gerarCodigoDocumental_(tipo) {
    const curto = TIPOS_SUPORTADOS[tipo] || tipo.substring(0, 6);
    const agora = new Date();
    const stamp = Utilities.formatDate(agora, sgoGetCfgSafe_().SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
    return "SGO-" + curto + "-" + stamp + "-" + Utilities.getUuid().substring(0, 4).toUpperCase();
  }

  function montarUrlValidacao_(token) {
    let base = "";
    try {
      base = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL") || ScriptApp.getService().getUrl();
    } catch (e) {}
    if (!base) return "";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "validar=" + encodeURIComponent(token);
  }

  function montarNomeArquivo_(dados, codigo, emitidoEm) {
    if (dados.NOME_ARQUIVO) {
      return sanitizarNomeArquivo_(dados.NOME_ARQUIVO.replace(/\.pdf$/i, "") + ".pdf");
    }
    const stamp = Utilities.formatDate(new Date(emitidoEm), sgoGetCfgSafe_().SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    return sanitizarNomeArquivo_("SGO_" + dados.TIPO_DOCUMENTO + "_" + codigo + "_" + stamp + ".pdf");
  }

  function montarTextoWhatsapp_(dados, token, validacaoUrl, pdfUrl) {
    return [
      "Olá, segue o documento técnico emitido pela METROLABS.",
      "",
      "Documento: " + dados.TITULO,
      "Tipo: " + nomeAmigavelTipoDocumento_(dados.TIPO_DOCUMENTO),
      "Código: " + token,
      "Validação: " + validacaoUrl,
      "Download: " + pdfUrl,
      "",
      "Este documento possui QR Code e validação digital pelo Portal SGO+."
    ].join("\n");
  }

  function montarEmail_(dados, pdfFileId, validacaoUrl, pdfUrl) {
    return {
      assunto: "Documento técnico METROLABS - " + dados.TITULO,
      corpo: [
        "Documento técnico emitido pelo METROLABS SGO+.",
        "",
        "Documento: " + dados.TITULO,
        "Tipo: " + dados.TIPO_DOCUMENTO,
        "Validação: " + validacaoUrl,
        "Download: " + pdfUrl,
        "",
        "Este e-mail esta pronto para envio por rotina controlada do SGO+."
      ].join("\n"),
      anexos: [pdfFileId]
    };
  }

  function nomeAmigavelTipoDocumento_(tipo) {
    const mapa = {
      FROTA_RELATORIO_VEICULO: "Relatório Individual de Veículo",
      FROTA_RELATORIO_GERAL: "Relatório Geral da Frota",
      FROTA_TERMO_MULTA: "Termo de Ciência e Responsabilidade por Infração de Trânsito",
      OS_TECNICA: "Ordem de Serviço Técnica",
      INVENTARIO_TECNICO: "Inventário Técnico",
      RASTREABILIDADE_COMPLETA: "Rastreabilidade Completa"
    };
    return mapa[SGO_UTILS.safeUpper(tipo)] || tipo || "Documento Técnico";
  }

  function sanitizarNomeArquivo_(nome) {
    return SGO_UTILS.safe(nome || "documento.pdf")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 180);
  }

  function formatarData_(iso) {
    const raw = SGO_UTILS.safe(iso);
    if (!raw) return "--";
    try {
      const data = new Date(raw);
      if (isNaN(data.getTime()) || data.getFullYear() < 2000) return "--";
      return Utilities.formatDate(data, sgoGetCfgSafe_().SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return raw;
    }
  }

  function imagemItemSrc_(item, fileField, dataField) {
    item = item || {};
    const dataUrl = SGO_UTILS.safe(item[dataField] || item.DATA_URL || item.ASSINATURA_DATA_URL || item.FOTO_DATA_URL || "");
    if (dataUrl.indexOf("data:image/") === 0) return dataUrl;
    
    const fileIdUrl = SGO_UTILS.safe(item[fileField] || item.LINK_DRIVE || item.FILE_ID || item.FOTO_LINK || item.EVIDENCIA_LINK || "");
    return imagemDriveDataUrl_(fileIdUrl);
  }

  function normalizarTextoPdf_(texto) {
    var s = String(texto || "");
    s = s.replace(/&(A|E|I|O|U)ACUTE;?/gi, function(m, p1) { return {"A":"Á","E":"É","I":"Í","O":"Ó","U":"Ú"}[p1.toUpperCase()]; });
    s = s.replace(/&(A|O)TILDE;?/gi, function(m, p1) { return {"A":"Ã","O":"Õ"}[p1.toUpperCase()]; });
    s = s.replace(/&CCEDIL;?/gi, "Ç");
    s = s.replace(/&(A|E|O)CIRC;?/gi, function(m, p1) { return {"A":"Â","E":"Ê","O":"Ô"}[p1.toUpperCase()]; });
    s = s.replace(/&NBSP;?/gi, " ");
    s = s.replace(/&AMP;?/gi, "&");
    
    var trocas = {
      "Ã¡": "á", "Ã ": "à", "Ã¢": "â", "Ã£": "ã", "Ã©": "é", "Ãª": "ê",
      "Ã­": "í", "Ã³": "ó", "Ã´": "ô", "Ãµ": "õ", "Ãº": "ú", "Ã§": "ç",
      "Ã\u0081": "Á", "Ã\u0089": "É", "Ã\u008D": "Í", "Ã\u0093": "Ó", "Ã\u009A": "Ú", "Ã\u0087": "Ç",
      "â€“": "–", "â€”": "—", "â€œ": "\"", "â€": "\"", "â€™": "'", "Â·": "·", "Âº": "º",
      "&Aacute;": "Á", "&Eacute;": "É", "&Iacute;": "Í", "&Oacute;": "Ó", "&Uacute;": "Ú",
      "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú",
      "&Ccedil;": "Ç", "&ccedil;": "ç", "&atilde;": "ã", "&otilde;": "õ", "&Atilde;": "Ã", "&Otilde;": "Õ"
    };
    Object.keys(trocas).forEach(function(k) { s = s.split(k).join(trocas[k]); });
    return s;
  }

  function esc_(valor) {
    var limpo = normalizarTextoPdf_(valor);
    return limpo.replace(/&(?!(amp|lt|gt|quot|#39);)/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
  }

  function escAttr_(valor) {
    return esc_(valor).replace(/`/g, "&#96;");
  }

  /* ================================================================
   * OS_TECNICA PREMIUM V3 - template documental oficial
   * Ativado quando TIPO_DOCUMENTO === "OS_TECNICA"
   * ================================================================ */

  function getOSTecnicaCss_() {
    return "@page{size:A4;margin:0}" +
    ".v3{font-family:Arial,Helvetica,sans-serif;color:#071b34;font-size:11px;line-height:1.5;background:#fff}" +
    ".v3-page{position:relative;box-sizing:border-box;padding:10mm 12mm 15mm;background:#fff;}" +
    ".v3-head{text-align:center;border-bottom:2px solid #0b3b78;padding-bottom:3mm;margin-bottom:4mm}" +
    ".v3-logo{height:18mm;display:flex;align-items:center;justify-content:center;margin-bottom:2mm}" +
    ".v3-logo img{max-width:68mm;max-height:17mm;display:block}" +
    ".v3-logo-fallback{font-size:24px;font-weight:900;color:#0b3b78;letter-spacing:.04em}" +
    ".v3-company{font-size:8.5px;font-weight:900;color:#0b3b78;text-transform:uppercase}" +
    ".v3-company-line{font-size:7.5px;color:#334155;margin-top:1mm}" +
    ".v3-title{font-size:22px;font-weight:900;color:#0b3b78;line-height:1.08;text-transform:uppercase;letter-spacing:.01em;margin:4mm 0 2mm}" +
    ".v3-os-line{display:flex;align-items:center;gap:8mm;margin-bottom:4mm}" +
    ".v3-os-number{font-size:17px;font-weight:900;color:#159447;border-left:4px solid #159447;padding-left:5mm}" +
    ".v3-badge{display:inline-flex;align-items:center;border-radius:4px;background:#159447;color:#fff;padding:2.5mm 4mm;font-size:9.5px;font-weight:900;text-transform:uppercase}" +
    ".v3-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.v3-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}" +
    ".v3-card{border:1px solid #c9d5e2;border-radius:4px;background:#fff;overflow:hidden;page-break-inside:avoid}" +
    ".v3-card-title{background:#0b3b78;color:#fff;font-size:8.5px;font-weight:900;text-transform:uppercase;padding:2.5mm 3mm}" +
    ".v3-card-body{padding:3mm}.v3-info{display:grid;grid-template-columns:24mm 1fr;gap:2mm;border-bottom:1px solid #eef2f7;padding:1.4mm 0}.v3-info:last-child{border-bottom:none}" +
    ".v3-info-k{font-size:7.5px;font-weight:900;color:#0b3b78;text-transform:uppercase}.v3-info-v{font-size:9.2px;color:#111827;font-weight:700;word-break:break-word}" +
    ".v3-summary{border:1px solid #c9d5e2;border-radius:4px;padding:3mm;font-size:10.5px;white-space:pre-line;margin-top:4mm}" +
    ".v3-section{margin-bottom:3.5mm;page-break-inside:avoid}.v3-section-title{display:flex;align-items:center;gap:3mm;color:#0b3b78;font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:2mm}" +
    ".v3-section-title:before{content:'';display:block;width:3mm;height:3mm;border-radius:1mm;background:#159447}" +
    ".v3-text{border:1px solid #c9d5e2;border-radius:4px;background:#fff;padding:3mm;font-size:10.5px;white-space:pre-line;min-height:14mm}" +
    ".v3-text-green{background:#f0fdf4;border-color:#86efac}.v3-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:3mm}" +
    ".v3-pill-box{border:1px solid #d8e2ee;border-radius:4px;padding:2.5mm;background:#fbfdff}.v3-pill-title{font-size:7.5px;color:#0b3b78;font-weight:900;text-transform:uppercase;margin-bottom:1mm}.v3-pill-value{font-size:10.5px;font-weight:800;color:#111827}" +
    ".v3-check-sec{font-size:9px;font-weight:900;color:#0b3b78;text-transform:uppercase;border-left:4px solid #159447;padding-left:3mm;margin:3mm 0 1.5mm}" +
    ".v3-check-card{border:1px solid #d8e2ee;border-radius:4px;padding:2mm 2.5mm;margin-bottom:1.5mm;page-break-inside:avoid;background:#fff}" +
    ".v3-check-q{font-size:9.5px;font-weight:900;color:#111827;margin-bottom:1mm}.v3-check-row{display:grid;grid-template-columns:32mm 1fr 34mm;gap:3mm;font-size:8.5px;color:#334155}" +
    ".v3-chip{display:inline-block;border-radius:999px;padding:1mm 3mm;background:#e8f5ee;color:#08783b;font-size:7.5px;font-weight:900;text-transform:uppercase}.v3-chip-warn{background:#fff7ed;color:#9a3412}.v3-chip-bad,.v3-chip-nok{background:#fee2e2;color:#991b1b}.v3-chip-na{background:#eef2f7;color:#475569}" +
    ".v3-table{width:100%;border-collapse:collapse;font-size:8.5px}.v3-table th{background:#0b3b78;color:#fff;text-align:left;text-transform:uppercase;font-size:7px;padding:2mm}.v3-table td{border-bottom:1px solid #e2e8f0;padding:2mm;vertical-align:top}.v3-table tr:nth-child(even) td{background:#f8fafc}" +
    ".v3-empty{border:1px solid #d8e2ee;border-radius:4px;padding:4mm;color:#64748b;font-size:9px;background:#f8fafc}" +
    ".v3-photos{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.v3-photos-one{grid-template-columns:1fr}.v3-photo{border:1px solid #c9d5e2;border-radius:4px;overflow:hidden;page-break-inside:avoid;background:#fff}.v3-photo-media{height:60mm;background:#f1f5f9;text-align:center;color:#64748b;font-weight:800}.v3-photos-one .v3-photo-media{height:110mm}.v3-photo-media img{max-width:100%;max-height:100%;width:auto;height:auto;display:inline-block;margin:0 auto;}.v3-photo-meta{padding:2.5mm;font-size:8px}.v3-photo-title{font-size:9px;font-weight:900;color:#0b3b78;margin-bottom:1mm}" +
    ".v3-sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:4mm}.v3-sign{border:1px solid #c9d5e2;border-radius:4px;background:#fff;padding:3mm;min-height:40mm;page-break-inside:avoid}.v3-sign-title{font-size:9px;font-weight:900;color:#0b3b78;text-transform:uppercase;margin-bottom:3mm}.v3-sign-img{height:22mm;border-bottom:1px solid #94a3b8;text-align:center;margin-bottom:2.5mm;color:#64748b;font-size:9px}.v3-sign-img img{max-width:100%;max-height:21mm;display:inline-block;margin:0 auto;}.v3-auth{display:grid;grid-template-columns:1fr 42mm;gap:5mm;border:1px solid #c9d5e2;border-radius:4px;padding:4mm;background:#f8fafc;page-break-inside:avoid;}.v3-qr{width:38mm;height:38mm;display:block;margin:0 auto}.v3-qr-na{width:38mm;height:38mm;display:flex;align-items:center;justify-content:center;border:1px solid #c9d5e2;border-radius:4px;color:#64748b;font-weight:900;text-align:center}.mono{font-family:Consolas,Monaco,monospace;word-break:break-all}" +
    ".v3-footer{border-top: 1px solid #e2e8f0; margin-top: 5mm; padding-top: 3mm; font-size: 7.8px; color:#64748b; text-align:center;}";
  }

  function kv3_(label, value) {
    return "<div class=\"v3-kv\"><div class=\"v3-kv-k\">" + esc_(label) + "</div><div class=\"v3-kv-v\">" + esc_(value || "--") + "</div></div>";
  }

  function statusOsLabel_(status) {
    const s = SGO_UTILS.safeUpper(status);
    if (s === "CONCLUIDA_TECNICAMENTE") return "Atendimento concluído";
    if (s === "EM_APROVACAO") return "Atendimento concluído";
    if (s === "APROVADA") return "Aprovada";
    if (s === "FATURADA") return "Faturada";
    if (s === "CANCELADA") return "Cancelada";
    if (s === "EM_EXECUCAO") return "Em execução";
    if (s === "AGENDADA") return "Agendada";
    if (s === "ABERTA") return "Aberta";
    return status || "--";
  }

  function logoHtml_() {
    try {
      const fileId = SGO_UTILS.safe(sgoGetCfgSafe_().LOGO_FILE_ID);
      if (fileId) {
        const dataUrl = imagemDriveDataUrl_(fileId);
        if (dataUrl) return "<img src=\"" + escAttr_(dataUrl) + "\" alt=\"Metrolabs\">";
      }
    } catch (e) {}
    return "<div class=\"v3-logo-fallback\">METROLABS</div>";
  }

  function valorTecnico_(valor) {
    const v = SGO_UTILS.safe(valor);
    return v || "--";
  }

  function respostaClasse_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    if (["OK", "SIM", "CONFORME", "APROVADO"].indexOf(v) >= 0) return "v3-chip v3-chip-ok";
    if (["NAO", "NAO_OK", "NAO_CONFORME", "REPROVADO", "FALHA"].indexOf(v) >= 0) return "v3-chip v3-chip-nok";
    if (["NA", "N/A", "--", ""].indexOf(v) >= 0) return "v3-chip";
    return "v3-chip v3-chip-warn";
  }

  function montarResumoExecutivoOS_(os, cli, uni, eqp) {
    const tipo = (os.TIPO_OS || "").replace(/_/g, " ");
    const cliNome = cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || "cliente";
    const uniNome = uni.NOME_UNIDADE || "";
    const eqpDesc = [eqp.TAG, eqp.TIPO, eqp.MODELO].filter(Boolean).join(" – ") || "equipamento";
    const base = "Atendimento de " + tipo + " realizado para " + cliNome +
      (uniNome ? " – unidade " + uniNome : "") + ", no equipamento " + eqpDesc + ".";
    const resultado = os.RESULTADO_ATENDIMENTO ? " Resultado: " + os.RESULTADO_ATENDIMENTO.replace(/_/g, " ") + "." : "";
    const retorno = os.NECESSITA_RETORNO === "S" ? " Necessita retorno técnico." : "";
    const orcamento = os.NECESSITA_ORCAMENTO === "S" ? " Orçamento pendente." : "";
    return base + resultado + retorno + orcamento || "--";
  }

  function textoMissaoTecnicaPdf_(os, missao) {
    const demanda = normalizarTextoPdf_(os.RELATO_CLIENTE || os.SOLICITACAO || os.DESCRICAO_SOLICITACAO);
    const missaoTxt = normalizarTextoPdf_(os.MISSAO_TECNICA || missao.DESCRICAO || missao.ORIENTACAO);
    const padrao = "Verificar a ocorrência informada pelo cliente e registrar as condições observadas durante o atendimento.";
    if (!missaoTxt) return padrao;
    if (demanda && demanda.toLowerCase() === missaoTxt.toLowerCase()) return padrao;
    return missaoTxt;
  }

  function montarTextoDiagnosticoOS_(os) {
    const campos = [
      os.DIAGNOSTICO_FINAL,
      os.CAUSA_PROVAVEL ? "Causa: " + os.CAUSA_PROVAVEL : "",
      os.CONDICAO_ENCONTRADA ? "Condição encontrada: " + os.CONDICAO_ENCONTRADA : ""
    ].filter(Boolean);
    return campos.length ? campos.join("\n") : "--";
  }

  function montarTextoConclusaoTecnicaOS_(os) {
    return os.ENCERRAMENTO_TECNICO || os.RELATO_TECNICO || os.SERVICO_EXECUTADO || "--";
  }

  function montarTextoRecomendacaoOS_(os) {
    const campos = [
      os.RECOMENDACAO,
      os.PENDENCIAS ? "Pendências: " + os.PENDENCIAS : ""
    ].filter(Boolean);
    return campos.length ? campos.join("\n") : "--";
  }

  function texto_(valor) {
    return normalizarTextoPdf_(SGO_UTILS.safe(valor));
  }

  function simNao_(valor) {
    return valor === "S" || valor === true ? "Sim" : "Não";
  }

  function labelValor_(valor) {
    const v = texto_(valor);
    return v ? v.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : "--";
  }

  function kvPdf_(label, valor) {
    const v = texto_(valor);
    if (!v) return "";
    return "<div class=\"v3-info\"><div class=\"v3-info-k\">" + esc_(label) + "</div><div class=\"v3-info-v\">" + esc_(v) + "</div></div>";
  }

  function pillPdf_(label, valor) {
    return "<div class=\"v3-pill-box\"><div class=\"v3-pill-title\">" + esc_(label) + "</div><div class=\"v3-pill-value\">" + esc_(valor || "--") + "</div></div>";
  }

  function cardPdf_(titulo, corpo) {
    return "<div class=\"v3-card\"><div class=\"v3-card-title\">" + esc_(titulo) + "</div><div class=\"v3-card-body\">" + corpo + "</div></div>";
  }

  function secPdf_(titulo, corpo) {
    return corpo ? "<div class=\"v3-section\"><div class=\"v3-section-title\">" + esc_(titulo) + "</div>" + corpo + "</div>" : "";
  }

  function textoBoxPdf_(valor, classe) {
    const v = texto_(valor);
    if (!v) return "";
    return "<div class=\"v3-text " + (classe || "") + "\">" + esc_(v) + "</div>";
  }

  function chaveSecaoChecklist_(secao) {
    const s = SGO_UTILS.safeUpper(secao);
    if (s.indexOf("IDENT") >= 0) return "Identificação";
    if (s.indexOf("EXEC") >= 0) return "Execução";
    if (s.indexOf("RESULT") >= 0) return "Resultado";
    if (s.indexOf("ENCERR") >= 0) return "Encerramento";
    return secao ? esc_(secao) : "Geral";
  }

  function respostaAmigavel_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    if (!v) return "Não aplicável";
    if (v === "NAO" || v === "N") return "Não";
    if (v === "SIM" || v === "S") return "Sim";
    if (v === "NA" || v === "N/A") return "Não aplicável";
    return esc_(labelValor_(valor));
  }

  function classeRespostaPdf_(valor) {
    const v = SGO_UTILS.safeUpper(valor);
    if (["OK", "SIM", "S", "CONFORME", "APROVADO"].indexOf(v) >= 0) return "v3-chip";
    if (["NAO", "N", "NAO_OK", "NAO_CONFORME", "REPROVADO", "FALHA"].indexOf(v) >= 0) return "v3-chip v3-chip-bad";
    if (["NA", "N/A", ""].indexOf(v) >= 0) return "v3-chip v3-chip-na";
    return "v3-chip v3-chip-warn";
  }

  function respostaChecklistPdf_(item, temFotoPlaqueta, temAssinaturaResponsavel) {
    const pergunta = SGO_UTILS.safeUpper(item.PERGUNTA || item.ITEM || item.DESCRICAO);
    if (temFotoPlaqueta && pergunta.indexOf("PLAQUETA") >= 0) return "Registrado";
    if (temAssinaturaResponsavel && pergunta.indexOf("ASSINATURA") >= 0 && (pergunta.indexOf("CLIENTE") >= 0 || pergunta.indexOf("RESP") >= 0)) return "Registrada";
    return item.RESPOSTA;
  }

  function assinaturaAtiva_(a) {
    const st = SGO_UTILS.safeUpper(a && a.STATUS);
    return ["REMOVIDA_EXECUCAO", "REMOVIDA_ADMIN", "INATIVA", "CANCELADA", "CANCELADO"].indexOf(st) < 0;
  }

  function tipoAssinaturaGrupo_(a) {
    const t = SGO_UTILS.safeUpper((a && (a.TIPO_ASSINATURA || a.TIPO)) || "");
    if (t.indexOf("TEC") >= 0) return "TECNICO";
    if (t.indexOf("RESP") >= 0 || t.indexOf("CLI") >= 0 || t.indexOf("LOCAL") >= 0) return "RESPONSAVEL";
    return t || "ASSINATURA";
  }

  function dataAssinaturaMs_(a) {
    try {
      const d = new Date(a.ASSINADO_EM || a.CRIADO_EM || 0);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (e) {
      return 0;
    }
  }

  function assinaturasFinaisOS_(lista) {
    const mapa = {};
    (lista || []).filter(assinaturaAtiva_).forEach(function(a) {
      const g = tipoAssinaturaGrupo_(a);
      if (!mapa[g] || dataAssinaturaMs_(a) >= dataAssinaturaMs_(mapa[g])) mapa[g] = a;
    });
    return [
      { titulo: "Assinatura do técnico", item: mapa.TECNICO || null, cargoFallback: "Técnico responsável" },
      { titulo: "Assinatura do responsável local", item: mapa.RESPONSAVEL || null, cargoFallback: "Responsável local" }
    ];
  }

  function footerPdf_(os, meta) {
    return "<div class=\"v3-footer\">METROLABS SGO+ Engenharia Clínica · Documento técnico controlado · OS " +
      esc_(os.NUMERO_OS || os.ID || "--") + " · Token <span class=\"mono\">" + esc_(meta.token || "--") + "</span></div>";
  }

  function montarHtmlOSTecnicaPremiumV3_(pacote, meta) {
    const os = pacote.os || {};
    const cli = pacote.cliente || {};
    const uni = pacote.unidade || {};
    const eqp = pacote.equipamento || {};
    const tec = pacote.tecnico || {};
    const missao = pacote.missao || {};
    const assinaturas = (pacote.assinaturas && pacote.assinaturas.length) ? pacote.assinaturas : (pacote.assinatura ? [pacote.assinatura] : []);
    const checklist = pacote.checklist || [];
    const materiais = pacote.materiais || [];
    const fotos = (pacote.fotos || []).filter(function(f) {
      const st = SGO_UTILS.safeUpper(f.STATUS);
      return ["REMOVIDA_EXECUCAO", "REMOVIDA_ADMIN", "INATIVA", "CANCELADA"].indexOf(st) < 0;
    });
    const slotsAssinatura = assinaturasFinaisOS_(assinaturas);
    const temAssinaturaResponsavel = !!(slotsAssinatura[1] && slotsAssinatura[1].item);
    const temFotoPlaqueta = fotos.some(function(f) {
      const txt = SGO_UTILS.safeUpper([f.TIPO_FOTO, f.MOMENTO, f.OBSERVACAO, f.CATEGORIA].filter(Boolean).join(" "));
      return txt.indexOf("PLAQUETA") >= 0;
    });
    const tecNome = tec.NOME || tec.USUARIO || os.TECNICO_NOME || os.TECNICO_ID || "--";
    const cliNome = cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || os.CLIENTE_NOME || "--";
    const uniNome = uni.NOME_UNIDADE || os.UNIDADE_NOME || "--";
    const eqpTag = eqp.TAG || os.EQUIPAMENTO_TAG || "--";
    const qrSrc = meta.qrCodeDataUrl || meta.qrCodeUrl || "";
    const qrHtml = qrSrc ? "<img src=\"" + escAttr_(qrSrc) + "\" alt=\"QR Code\" class=\"v3-qr\">" : "<div class=\"v3-qr-na\">QR indisponível</div>";
    const relatoTecnico = os.RELATO_TECNICO || os.ENCERRAMENTO_TECNICO || os.SERVICO_EXECUTADO || "";
    const complementares = [
      ["Diagnóstico final", os.DIAGNOSTICO_FINAL],
      ["Condição encontrada", os.CONDICAO_ENCONTRADA],
      ["Causa provável", os.CAUSA_PROVAVEL],
      ["Recomendação", os.RECOMENDACAO],
      ["Pendências", os.PENDENCIAS]
    ].filter(function(c) { return texto_(c[1]); });

    var header =
      "<div class=\"v3-head\">" +
        "<div class=\"v3-logo\">" + logoHtml_() + "</div>" +
        "<div class=\"v3-company\">METROLABS SOLUÇÕES EM ENGENHARIA CLÍNICA LTDA</div>" +
        "<div class=\"v3-company-line\">CNPJ: 32.487.278/0001-21</div>" +
        "<div class=\"v3-company-line\">Rua C 155, nº 789, Quadra 365, Lote 08, Jardim América, Goiânia/GO · CEP 74.275-150</div>" +
        "<div class=\"v3-company-line\">Tel.: (62) 3123-1595 · administrativo@metrolabs.com.br</div>" +
      "</div>";

    var capa =
      header +
      "<div class=\"v3-title\">Ordem de Serviço<br>Técnica</div>" +
      "<div class=\"v3-os-line\"><div class=\"v3-os-number\">OS " + esc_(os.NUMERO_OS || os.ID || "--") + "</div><div class=\"v3-badge\">Atendimento concluído</div></div>" +
      "<div class=\"v3-grid-3\" style=\"margin-bottom:4mm;\">" +
        pillPdf_("Tipo de atendimento", labelValor_(os.TIPO_OS)) +
        pillPdf_("Técnico responsável", tecNome) +
        pillPdf_("Abertura", formatarData_(os.DATA_ABERTURA)) +
        pillPdf_("Início", formatarData_(os.DATA_INICIO || missao.CHECKIN_EM)) +
        pillPdf_("Término", formatarData_(os.DATA_CONCLUSAO || missao.CHECKOUT_EM)) +
        pillPdf_("Emissão", formatarData_(meta.emitidoEm)) +
      "</div>" +
      "<div class=\"v3-grid-2\" style=\"margin-bottom:4mm;\">" +
        cardPdf_("Cliente / Unidade", kvPdf_("Cliente", cliNome) + kvPdf_("Unidade", uniNome) + kvPdf_("CNPJ", cli.CNPJ) + kvPdf_("Endereço", uni.ENDERECO || cli.ENDERECO) + kvPdf_("Responsável", os.RESPONSAVEL_NOME || uni.RESPONSAVEL || uni.CONTATO)) +
        cardPdf_("Equipamento / Ativo", kvPdf_("TAG", eqpTag) + kvPdf_("Tipo", eqp.TIPO || os.EQUIPAMENTO_TIPO) + kvPdf_("Fabricante / modelo", [eqp.FABRICANTE, eqp.MODELO].filter(Boolean).join(" / ")) + kvPdf_("Série", eqp.SERIE || os.EQUIPAMENTO_SERIE) + kvPdf_("Patrimônio", eqp.PATRIMONIO || eqp.REGISTRO)) +
      "</div>" +
      secPdf_("Resumo executivo", textoBoxPdf_(montarResumoExecutivoOS_(os, cli, uni, eqp)));

    var relato =
      secPdf_("Relato técnico do atendimento", textoBoxPdf_(relatoTecnico, "v3-text-green")) +
      "<div class=\"v3-mini-grid\" style=\"margin-bottom:4mm;\">" +
        pillPdf_("Resultado", labelValor_(os.RESULTADO_ATENDIMENTO)) +
        pillPdf_("Retorno?", simNao_(os.NECESSITA_RETORNO)) +
        pillPdf_("Orçamento?", simNao_(os.NECESSITA_ORCAMENTO)) +
      "</div>" +
      secPdf_("Demanda do cliente", textoBoxPdf_(os.RELATO_CLIENTE || os.SOLICITACAO || os.DESCRICAO_SOLICITACAO)) +
      secPdf_("Missão técnica", textoBoxPdf_(textoMissaoTecnicaPdf_(os, missao)));

    if (complementares.length) {
      var compHtml = "";
      complementares.forEach(function(c) { compHtml += "<div style=\"margin-bottom:2mm;\"><div class=\"v3-pill-title\">" + c[0] + "</div>" + textoBoxPdf_(c[1]) + "</div>"; });
      relato += secPdf_("Informações complementares", compHtml);
    }

    var secoes = {};
    checklist.forEach(function(i) {
      var sec = chaveSecaoChecklist_(i.SECAO || i.GRUPO || "Geral");
      if (!secoes[sec]) secoes[sec] = [];
      secoes[sec].push(i);
    });

    var checklistHtml = "";
    Object.keys(secoes).forEach(function(sec) {
      checklistHtml += "<div class=\"v3-check-sec\">" + sec + "</div>";
      secoes[sec].forEach(function(i) {
        const obs = texto_(i.OBSERVACAO);
        const evid = texto_(i.EVIDENCIA_LINK || i.EVIDENCIA || i.FOTO_LINK);
        const resposta = respostaChecklistPdf_(i, temFotoPlaqueta, temAssinaturaResponsavel);
        checklistHtml += "<div class=\"v3-check-card\"><div class=\"v3-check-q\">" + esc_(i.PERGUNTA || i.ITEM || i.DESCRICAO || "--") + "</div>" +
          "<div class=\"v3-check-row\"><div><span class=\"" + classeRespostaPdf_(resposta) + "\">" + respostaAmigavel_(resposta) + "</span></div>" +
          "<div>" + (obs ? "<strong>Obs:</strong> " + esc_(obs) : "") + "</div>" +
          "<div>" + (evid ? "<strong>Evidência:</strong> sim" : "") + "</div></div></div>";
      });
    });

    if (!checklistHtml) checklistHtml = "<div class=\"v3-empty\">Nenhum checklist registrado.</div>";

    var materiaisHtml = "";
    if (!materiais.length) {
      materiaisHtml = "<div class=\"v3-empty\">Nenhum material registrado.</div>";
    } else {
      materiaisHtml = "<table class=\"v3-table\"><thead><tr><th>Item</th><th>Descrição</th><th>Qtd.</th><th>Status</th></tr></thead><tbody>";
      materiais.forEach(function(m, idx) {
        materiaisHtml += "<tr><td>" + (idx + 1) + "</td><td>" + esc_(m.DESCRICAO || m.ITEM || "--") + "</td><td>" + esc_(m.QUANTIDADE || "--") + "</td><td>" + esc_(m.STATUS || "Registrado") + "</td></tr>";
      });
      materiaisHtml += "</tbody></table>";
    }

    var pageFlow = capa + relato + secPdf_("Checklist técnico", checklistHtml) + secPdf_("Materiais e peças", materiaisHtml);

    if(fotos.length > 0) {
        var fotosHtml = "<div class=\"v3-photos\">";
        fotos.forEach(function(f, idx) {
            const src = imagemItemSrc_(f, "FILE_ID", "FOTO_DATA_URL");
            const img = src ? "<img src=\"" + escAttr_(src) + "\" alt=\"Evidência\">" : "Imagem indisponível";
            fotosHtml += "<div class=\"v3-photo\"><div class=\"v3-photo-media\">" + img + "</div><div class=\"v3-photo-meta\">" +
              "<div class=\"v3-photo-title\">" + ("0" + (idx + 1)).slice(-2) + " · " + esc_(labelValor_(f.TIPO_FOTO || f.MOMENTO || "Evidência")) + "</div>" +
              (texto_(f.OBSERVACAO) ? "<div><strong>Obs:</strong> " + esc_(f.OBSERVACAO) + "</div>" : "") +
              "<div><strong>Data:</strong> " + esc_(formatarData_(f.CRIADO_EM || f.DATA_FOTO || "")) + "</div></div></div>";
        });
        fotosHtml += "</div>";
        pageFlow += "<div style='page-break-before: always;'></div>" + header + secPdf_("Evidências fotográficas", fotosHtml);
    }

    var signHtml = "<div class=\"v3-sign-grid\">";
    slotsAssinatura.forEach(function(slot) {
      const a = slot.item;
      const src = a ? imagemItemSrc_(a, "FILE_ID", "ASSINATURA_DATA_URL") : "";
      const img = src ? "<img src=\"" + escAttr_(src) + "\" alt=\"Assinatura\">" : "Assinatura não registrada";
      signHtml += "<div class=\"v3-sign\"><div class=\"v3-sign-title\">" + esc_(slot.titulo) + "</div><div class=\"v3-sign-img\">" + img + "</div>" +
        kvPdf_("Nome", a ? a.ASSINADO_POR : "") + kvPdf_("Cargo", a ? (a.CARGO || slot.cargoFallback) : "") + kvPdf_("Data", a ? formatarData_(a.ASSINADO_EM) : "") + "</div>";
    });
    signHtml += "</div>";

    var authHtml = "<div class=\"v3-auth\"><div>" +
      "<div class=\"v3-section-title\">Validação digital</div>" +
      kvPdf_("Token", meta.token) + kvPdf_("Hash SHA", meta.hash) + kvPdf_("Data", formatarData_(meta.emitidoEm)) +
      (meta.urlValidacao ? kvPdf_("URL", meta.urlValidacao) : "") +
      "</div><div>" + qrHtml + "</div></div>";

    pageFlow += "<div style='page-break-inside: avoid; margin-top: 10mm;'>" + secPdf_("Assinaturas", signHtml) + authHtml + "</div>";

    return "<div class=\"v3\"><div class=\"v3-page\">" + pageFlow + footerPdf_(os, meta) + "</div></div>";
  }
  function listarTiposSuportadosSemGravar_() {
    return JSON.parse(JSON.stringify(TIPOS_SUPORTADOS));
  }

  return {
    gerarDocumento: gerarDocumento,
    obterDocumentoPorToken: obterDocumentoPorToken,
    getDocumentoCss: getDocumentoCss_,
    listarTiposSuportadosSemGravar: listarTiposSuportadosSemGravar_
  };
})();

function documentFactoryGerar(sessionId, payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_DOCUMENT_FACTORY.gerarDocumento(sessionId, payload)));
  } catch (e) {
    return { success: false, message: "Erro ao gerar documento: " + e.message };
  }
}

function documentFactoryTeste(sessionId) {
  try {
    return JSON.parse(JSON.stringify(SGO_DOCUMENT_FACTORY.gerarDocumento(sessionId, {
      TIPO_DOCUMENTO: "RELATORIO_CONFORMIDADE",
      TITULO: "Diagnostico DocumentFactory SGO+",
      MODULO_ORIGEM: "DOCUMENT_FACTORY",
      ENTIDADE_ID: "TESTE_DOCUMENT_FACTORY",
      DADOS: {
        ambiente: "Google Apps Script",
        objetivo: "Validar PDF, Drive, hash, token, QR Code e registro documental",
        observacao: "Documento de teste controlado sem dados reais de cliente"
      },
      NOME_ARQUIVO: "",
      VALIDADE: "",
      VISIBILIDADE: "PUBLICO_VALIDACAO"
    })));
  } catch (e) {
    return { success: false, message: "Erro ao testar DocumentFactory: " + e.message };
  }
}

function documentFactoryObterPorToken(token) {
  try {
    return JSON.parse(JSON.stringify({
      success: true,
      item: SGO_DOCUMENT_FACTORY.obterDocumentoPorToken(token)
    }));
  } catch (e) {
    return { success: false, message: "Erro ao consultar documento: " + e.message };
  }
}

function documentFactoryListarTiposSuportadosSemGravar() {
  try {
    return {
      success: true,
      ok: true,
      fase: "FIN.FLASH.8.7",
      tipos: SGO_DOCUMENT_FACTORY.listarTiposSuportadosSemGravar(),
      confirmacoes: {
        documentoGerado: false,
        pdfCriado: false,
        driveAlterado: false,
        planilhaAlterada: false,
        emailOuWhatsappEnviado: false
      },
      gravacaoReal: false,
      somenteLeitura: true
    };
  } catch (e) {
    return { success: false, ok: false, message: "Erro ao listar tipos DocumentFactory: " + e.message, gravacaoReal: false };
  }
}

function AUDITAR_DOCUMENTFACTORY_FIN_FLASH87_TIPOS_SEM_GRAVAR() {
  var resposta = documentFactoryListarTiposSuportadosSemGravar();
  var tipos = resposta.tipos || {};
  var esperados = [
    "FIN_FLASH_COMPROVANTE_ENTREGA",
    "FIN_FLASH_RELATORIO_PRESTACAO",
    "FIN_FLASH_RELATORIO_PENDENCIAS",
    "FIN_FLASH_RELATORIO_CONCILIACAO",
    "FIN_FLASH_RELATORIO_EXTRATO",
    "FIN_FLASH_RELATORIO_GERENCIAL"
  ];
  var ausentes = esperados.filter(function(tipo) { return !tipos[tipo]; });
  var resultado = {
    success: resposta.success === true,
    ok: resposta.success === true && ausentes.length === 0,
    fase: "FIN.FLASH.8.7",
    escopo: "DOCUMENTFACTORY_TIPOS_FIN_FLASH",
    tiposEsperados: esperados,
    tiposEncontrados: esperados.filter(function(tipo) { return !!tipos[tipo]; }),
    codigos: esperados.reduce(function(acc, tipo) { acc[tipo] = tipos[tipo] || ""; return acc; }, {}),
    bloqueios: ausentes.map(function(tipo) { return "Tipo FIN_FLASH ausente no DocumentFactory: " + tipo; }),
    avisos: ["Auditoria somente leitura: nao chama gerarDocumento, nao cria PDF, nao altera Drive."],
    tiposFinFlashReconhecidos: ausentes.length === 0,
    confirmacoes: {
      documentFactoryAlteradoEmRuntime: false,
      documentoGerado: false,
      pdfCriado: false,
      driveAlterado: false,
      planilhaAlterada: false,
      emailOuWhatsappEnviado: false,
      deployExecutado: false,
      producaoAlterada: false
    },
    gravacaoReal: false,
    somenteLeitura: true
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}