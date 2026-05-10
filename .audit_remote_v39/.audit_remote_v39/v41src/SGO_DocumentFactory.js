const SGO_DOCUMENT_FACTORY = (() => {
  const SHEET = SGO_CFG.SHEETS.DOC_DOCUMENTOS;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=";

  const TIPOS_SUPORTADOS = {
    OS_TECNICA: "OS",
    FROTA_RETIRADA: "FRTRET",
    FROTA_DEVOLUCAO: "FRTDEV",
    FROTA_ABASTECIMENTO: "FRTABA",
    FROTA_MANUTENCAO: "FRTMAN",
    ESTOQUE_ENTRADA: "ESTENT",
    ESTOQUE_SAIDA: "ESTSAI",
    FORNECEDOR_QUALIFICACAO: "FORN",
    INVENTARIO_TECNICO: "INV",
    RASTREABILIDADE_COMPLETA: "RAST",
    CONTRATO: "CONT",
    EQUIPAMENTO_FICHA: "EQP",
    PECA_FICHA: "PECA",
    RELATORIO_CONFORMIDADE: "CONF",
    EQUIPAMENTO_FICHA_TESTE: "TESTE"
  };

  const COLUNAS_DOCUMENTOS = [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "OS_ID", "PECA_ID",
    "FORNECEDOR_ID", "VEICULO_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO",
    "TITULO", "NOME_ARQUIVO", "LINK_ARQUIVO", "FILE_ID", "DATA_EMISSAO",
    "DATA_VENCIMENTO", "STATUS", "HASH_SHA256", "TOKEN_VALIDACAO",
    "URL_VALIDACAO", "QRCODE_LINK", "QR_CODE_LINK", "MODULO_ORIGEM", "ENTIDADE_ID",
    "VISIBILIDADE", "CRIADO_POR", "CRIADO_EM"
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
      templateDocumental: dados.TIPO_DOCUMENTO === "OS_TECNICA" ? "OS_TECNICA_PREMIUM_V3" : "",
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
      DADOS: payload.DADOS && typeof payload.DADOS === "object" ? payload.DADOS : {},
      HTML_CUSTOM: SGO_UTILS.safeUpper(payload.TIPO_DOCUMENTO) === "OS_TECNICA" ? "" : SGO_UTILS.safe(payload.HTML_CUSTOM),
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
      cliente: obterSeguro_(SGO_CFG.SHEETS.CAD_CLIENTES, dados.CLIENTE_ID),
      unidade: obterSeguro_(SGO_CFG.SHEETS.CAD_UNIDADES, dados.UNIDADE_ID),
      equipamento: obterSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, dados.EQUIPAMENTO_ID),
      peca: obterSeguro_(SGO_CFG.SHEETS.CAD_PECAS, dados.PECA_ID),
      fornecedor: obterSeguro_(SGO_CFG.SHEETS.CAD_FORNECEDORES, dados.FORNECEDOR_ID, "ESTOQUE"),
      veiculo: obterSeguro_(SGO_CFG.SHEETS.FRT_VEICULOS, dados.VEICULO_ID, "FROTA"),
      os: obterSeguro_(SGO_CFG.SHEETS.OS_ORDENS, dados.OS_ID, "OS")
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
    const custom = dados.HTML_CUSTOM ? aplicarMetaNoHtml_(dados.HTML_CUSTOM, meta) : "";
    if (custom && custom.indexOf('class="df-doc"') >= 0) {
      return '<!doctype html><html><head><meta charset="UTF-8"><style>' + getDocumentoCss_() + '</style></head><body>' + custom + '</body></html>';
    }
    const corpo = custom || montarCorpoPadrao_(dados.DADOS);
    const clienteNome = contexto.cliente ? (contexto.cliente.NOME_FANTASIA || contexto.cliente.RAZAO_SOCIAL || "") : "";
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

  function aplicarMetaNoHtml_(html, meta) {
    return String(html || "")
      .replace(/\{\{CODIGO_DOCUMENTAL\}\}/g, esc_(meta.codigo || ""))
      .replace(/\{\{TOKEN_VALIDACAO\}\}/g, esc_(meta.token || ""))
      .replace(/\{\{HASH_SHA256\}\}/g, esc_(meta.hash || ""))
      .replace(/\{\{URL_VALIDACAO\}\}/g, esc_(meta.validacaoUrl || ""))
      .replace(/\{\{QRCODE_DATA_URL\}\}/g, escAttr_(meta.qrCodeDataUrl || meta.qrCodeUrl || ""))
      .replace(/\{\{QRCODE_URL\}\}/g, escAttr_(meta.qrCodeUrl || ""))
      .replace(/\{\{DATA_EMISSAO\}\}/g, esc_(formatarData_(meta.emitidoEm)))
      .replace(/\{\{GERADO_POR\}\}/g, esc_(meta.usuario || ""));
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
      assinatura: pacote.assinatura || null,
      custos: pacote.custos || {},
      templateDocumental: "OS_TECNICA_PREMIUM_V3"
    });
  }

  function getDocumentoCss_() {
    return '@page{size:A4;margin:14mm 14mm 16mm}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#fff;font-size:11px}.page{width:100%}.header{display:grid;grid-template-columns:160px 1fr;gap:18px;align-items:center;border-bottom:4px solid #0b7a3e;padding-bottom:14px;margin-bottom:18px}.logo{font-size:24px;font-weight:900;color:#0b3b78;letter-spacing:.02em}.subtitle{font-size:10px;color:#667085;text-transform:uppercase;font-weight:800;letter-spacing:.06em}.title{text-align:right}.title h1{margin:0;color:#0b3b78;font-size:22px;line-height:1.2}.title p{margin:6px 0 0;color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.info{border:1px solid #dfe6ee;background:#f8fafc;border-radius:6px;padding:9px}.label{font-size:8px;color:#667085;text-transform:uppercase;font-weight:800;margin-bottom:4px;letter-spacing:.04em}.value{font-size:11px;font-weight:700;word-break:break-word}.section-title{background:#0b3b78;color:#fff;font-weight:900;font-size:9px;text-transform:uppercase;letter-spacing:.05em;padding:6px 9px;border-radius:4px;margin:16px 0 8px}.body{border:1px solid #dfe6ee;border-radius:8px;padding:14px;line-height:1.55}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{border-bottom:1px solid #dfe6ee;text-align:left;padding:7px;vertical-align:top}.data-table th{width:32%;font-size:9px;text-transform:uppercase;color:#667085}.trace{display:grid;grid-template-columns:1fr 120px;gap:14px;align-items:start}.qr{border:1px solid #dfe6ee;border-radius:8px;padding:8px;text-align:center}.qr img{width:104px;height:104px}.footer{border-top:1px solid #dfe6ee;margin-top:18px;padding-top:10px;color:#667085;font-size:9px;line-height:1.5}.mono{font-family:Consolas,Monaco,monospace;word-break:break-all}.seal{display:inline-block;border:2px solid #0b7a3e;color:#0b7a3e;border-radius:999px;padding:5px 10px;font-weight:900;font-size:9px;text-transform:uppercase}' +
      '.df-doc{background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:10px;line-height:1.45}.df-cover{border-bottom:4px solid #007b3e;padding-bottom:14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 118px;gap:18px;align-items:start}.df-brand{font-size:20px;font-weight:900;color:#007b3e;letter-spacing:.04em}.df-brand-sub{font-size:8px;color:#667085;text-transform:uppercase;font-weight:800;letter-spacing:.08em}.df-title{font-size:24px;font-weight:900;color:#0b3b78;margin:18px 0 3px;text-transform:uppercase;letter-spacing:.03em}.df-subtitle{font-size:10px;color:#475467;font-weight:700}.df-cover-meta{margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.df-meta{border:1px solid #dfe6ee;background:#f8fafc;border-radius:6px;padding:7px}.df-meta-k{font-size:7px;color:#667085;text-transform:uppercase;font-weight:900;letter-spacing:.06em}.df-meta-v{font-size:10px;color:#111827;font-weight:800;margin-top:2px;word-break:break-word}.df-qrbox{border:1px solid #dfe6ee;border-radius:8px;padding:8px;text-align:center;background:#fff}.df-qrbox img{width:96px;height:96px;display:block;margin:0 auto}.df-token{font-family:Consolas,Monaco,monospace;font-size:7px;color:#0b3b78;word-break:break-all;margin-top:5px;font-weight:800}.df-section{margin:14px 0 0}.df-section-title{font-size:8px;font-weight:900;color:#0b3b78;text-transform:uppercase;letter-spacing:.08em;border-left:4px solid #007b3e;padding-left:7px;margin:0 0 7px}.df-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.df-card{border:1px solid #dfe6ee;border-radius:6px;background:#f8fafc;padding:7px}.df-table{width:100%;border-collapse:collapse;font-size:9px}.df-table th{background:#0b3b78;color:#fff;text-align:left;padding:6px;font-size:7px;text-transform:uppercase;letter-spacing:.04em}.df-table td{border-bottom:1px solid #e5e7eb;padding:6px;vertical-align:top}.df-table tbody tr:nth-child(even) td{background:#f9fafb}.df-note{border:1px solid #dfe6ee;border-radius:6px;padding:9px;background:#fff;white-space:pre-line}.df-sign{display:grid;grid-template-columns:1.2fr 1fr;gap:10px;align-items:start}.df-sign-img{border:1px solid #dfe6ee;border-radius:6px;min-height:70px;text-align:center;padding:6px}.df-sign-img img{max-width:100%;max-height:92px}.df-footer{margin-top:16px;border-top:1px solid #dfe6ee;padding-top:8px;display:grid;grid-template-columns:1fr 78px;gap:12px;color:#667085;font-size:8px;page-break-inside:avoid}.df-footer img{width:70px;height:70px}.df-badge{display:inline-block;padding:2px 7px;border-radius:999px;background:#e1effe;color:#0b3b78;font-size:7px;font-weight:900;text-transform:uppercase}.df-badge-ok{background:#d1fae5;color:#065f46}.df-badge-warn{background:#fef3c7;color:#92400e}.df-badge-danger{background:#fee2e2;color:#991b1b}.df-break{page-break-before:always}';
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
      return "<p>Documento tecnico emitido pelo METROLABS SGO+ sem dados adicionais informados.</p>";
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
        Logger.log("Nao foi possivel compartilhar PDF DocumentFactory: " + e.message);
      }
    }

    return {
      fileId: file.getId(),
      url: file.getUrl()
    };
  }

  function obterPastaDestino_(dados) {
    const drive = SGO_CFG.DRIVE || {};
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
    const stamp = Utilities.formatDate(agora, SGO_CFG.SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
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
    const stamp = Utilities.formatDate(new Date(emitidoEm), SGO_CFG.SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    return sanitizarNomeArquivo_("SGO_" + dados.TIPO_DOCUMENTO + "_" + codigo + "_" + stamp + ".pdf");
  }

  function montarTextoWhatsapp_(dados, token, validacaoUrl, pdfUrl) {
    return [
      "Ola, segue o documento tecnico emitido pela METROLABS.",
      "",
      "Documento: " + dados.TITULO,
      "Codigo: " + token,
      "Validacao: " + validacaoUrl,
      "Download: " + pdfUrl,
      "",
      "Este documento possui QR Code e validacao digital pelo Portal SGO+."
    ].join("\n");
  }

  function montarEmail_(dados, pdfFileId, validacaoUrl, pdfUrl) {
    return {
      assunto: "Documento tecnico METROLABS - " + dados.TITULO,
      corpo: [
        "Documento tecnico emitido pelo METROLABS SGO+.",
        "",
        "Documento: " + dados.TITULO,
        "Tipo: " + dados.TIPO_DOCUMENTO,
        "Validacao: " + validacaoUrl,
        "Download: " + pdfUrl,
        "",
        "Este e-mail esta pronto para envio por rotina controlada do SGO+."
      ].join("\n"),
      anexos: [pdfFileId]
    };
  }

  function sanitizarNomeArquivo_(nome) {
    return SGO_UTILS.safe(nome || "documento.pdf")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 180);
  }

  function formatarData_(iso) {
    try {
      return Utilities.formatDate(new Date(iso), SGO_CFG.SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return SGO_UTILS.safe(iso);
    }
  }

  function esc_(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escAttr_(valor) {
    return esc_(valor).replace(/`/g, "&#96;");
  }

  /* ================================================================
   * OS_TECNICA PREMIUM V3 — template documental oficial
   * Ativado quando TIPO_DOCUMENTO === "OS_TECNICA"
   * Marcador obrigatório no rodapé: OS_TECNICA_PREMIUM_V3
   * ================================================================ */

  function getOSTecnicaCss_() {
    return "@page{size:A4;margin:13mm 14mm 15mm}" +
    ".v3{font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:10px;line-height:1.5;background:#fff}" +
    ".v3-header{background:#0b3b78;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}" +
    ".v3-brand{font-size:20px;font-weight:900;letter-spacing:.04em}" +
    ".v3-brand-sub{font-size:8px;text-transform:uppercase;letter-spacing:.1em;opacity:.75;margin-top:2px}" +
    ".v3-banner{padding:9px 16px;text-align:center;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;border-bottom:2px solid rgba(0,0,0,.08)}" +
    ".v3-cover{display:grid;grid-template-columns:1fr 128px;gap:14px;padding:14px 16px;border-bottom:1px solid #e5e7eb}" +
    ".v3-os-num{font-size:22px;font-weight:900;color:#0b3b78;margin-bottom:10px}" +
    ".v3-kv-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}" +
    ".v3-kv-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:7px}" +
    ".v3-kv-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}" +
    ".v3-kv{background:#f8fafc;border:1px solid #e5e7eb;border-radius:5px;padding:7px}" +
    ".v3-kv-k{font-size:7px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#6b7280;margin-bottom:2px}" +
    ".v3-kv-v{font-size:10px;font-weight:700;color:#111827;word-break:break-word}" +
    ".v3-qrbox{border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center;background:#fff}" +
    ".v3-qr-img{width:108px;height:108px;display:block;margin:0 auto}" +
    ".v3-qr-token{font-family:Consolas,Monaco,monospace;font-size:7px;color:#0b3b78;word-break:break-all;margin-top:4px;font-weight:700}" +
    ".v3-qr-na{font-size:9px;color:#ef4444;font-weight:700}" +
    ".v3-sec{margin:12px 0 0;padding:0 16px}" +
    ".v3-sec-title{display:flex;align-items:center;gap:6px;background:#0b3b78;color:#fff;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:6px 10px;border-radius:4px;margin-bottom:8px}" +
    ".v3-sec-title::before{content:'';display:inline-block;width:3px;height:11px;background:#007b3e;border-radius:2px;flex-shrink:0}" +
    ".v3-2col{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
    ".v3-lbl{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:4px}" +
    ".v3-note{background:#fff;border:1px solid #e5e7eb;border-radius:5px;padding:9px;white-space:pre-line;font-size:10px;min-height:36px}" +
    ".v3-note-green{background:#f0fdf4;border:1px solid #86efac}" +
    ".v3-note-blue{background:#eff6ff;border:1px solid #93c5fd}" +
    ".v3-note-empty{color:#9ca3af;font-style:italic}" +
    ".v3-tbl{width:100%;border-collapse:collapse;font-size:9px}" +
    ".v3-tbl thead th{background:#0b3b78;color:#fff;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.04em;font-weight:800;text-align:left}" +
    ".v3-tbl td{border-bottom:1px solid #e5e7eb;padding:6px 8px;vertical-align:top}" +
    ".v3-tbl tbody tr:nth-child(even) td{background:#f9fafb}" +
    ".v3-tbl-sec th{background:#f3f4f6 !important;color:#374151 !important;font-size:8px !important;text-transform:uppercase !important;letter-spacing:.05em !important;padding:6px 8px !important}" +
    ".v3-ok{color:#065f46;font-weight:800;text-align:center}" +
    ".v3-nok{color:#991b1b;font-weight:800;text-align:center}" +
    ".v3-na{color:#6b7280;text-align:center}" +
    ".v3-sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}" +
    ".v3-sign-box{border:2px dashed #e5e7eb;border-radius:6px;min-height:80px;text-align:center;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
    ".v3-sign-box img{max-width:100%;max-height:90px}" +
    ".v3-footer{margin:14px 0 0;padding:10px 16px 0;border-top:3px solid #007b3e;display:grid;grid-template-columns:1fr 88px;gap:12px;color:#6b7280;font-size:8px;line-height:1.55;page-break-inside:avoid}" +
    ".v3-footer-qr{width:80px;height:80px;display:block;margin:0 auto}" +
    ".mono{font-family:Consolas,Monaco,monospace;word-break:break-all}" +
    ".v3-tpl{font-size:7px;color:#9ca3af;font-style:italic;margin-top:5px}" +
    ".v3-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}" +
    ".v3-badge-ok{background:#d1fae5;color:#065f46}" +
    ".v3-badge-info{background:#dbeafe;color:#1e40af}" +
    ".v3-badge-warn{background:#fef3c7;color:#92400e}" +
    ".v3-badge-danger{background:#fee2e2;color:#991b1b}" +
    ".v3-wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:70px;font-weight:900;color:rgba(0,0,0,.05);pointer-events:none;white-space:nowrap;z-index:9999}";
  }

  function kv3_(label, value) {
    return "<div class=\"v3-kv\"><div class=\"v3-kv-k\">" + esc_(label) + "</div><div class=\"v3-kv-v\">" + esc_(value || "--") + "</div></div>";
  }

  function montarHtmlOSTecnicaPremiumV3_(pacote, meta) {
    const os = pacote.os || {};
    const cli = pacote.cliente || {};
    const uni = pacote.unidade || {};
    const eqp = pacote.equipamento || {};
    const peca = pacote.peca || {};
    const contrato = pacote.contrato || {};
    const tec = pacote.tecnico || {};
    const missao = pacote.missao || {};
    const assinatura = pacote.assinatura || {};
    const checklist = pacote.checklist || [];
    const materiais = pacote.materiais || [];
    const fotos = pacote.fotos || [];
    const custos = pacote.custos || {};
    const mostrarCustos = (pacote.emitidoPorPerfil || "").toUpperCase() !== "CLIENTE";

    const stUp = (os.STATUS || "").toUpperCase();
    var tipoLabel, tipoColor, tipoBackground, watermarkText;
    if (["APROVADA", "FATURADA"].indexOf(stUp) >= 0) {
      tipoLabel = "ORDEM DE SERVICO TECNICA OFICIAL";
      tipoColor = "#065f46"; tipoBackground = "#d1fae5"; watermarkText = "";
    } else if (["CONCLUIDA_TECNICAMENTE", "EM_APROVACAO"].indexOf(stUp) >= 0) {
      tipoLabel = "RELATORIO TECNICO DE ATENDIMENTO";
      tipoColor = "#1e40af"; tipoBackground = "#dbeafe"; watermarkText = "PENDENTE DE APROVACAO";
    } else {
      tipoLabel = "PREVIA OPERACIONAL DA OS";
      tipoColor = "#92400e"; tipoBackground = "#fef3c7"; watermarkText = "RASCUNHO / EM EXECUCAO";
    }

    var badgeCls = "v3-badge-warn";
    if (["APROVADA", "FATURADA"].indexOf(stUp) >= 0) badgeCls = "v3-badge-ok";
    else if (stUp === "CANCELADA") badgeCls = "v3-badge-danger";
    else if (["EM_EXECUCAO", "CONCLUIDA_TECNICAMENTE", "EM_APROVACAO"].indexOf(stUp) >= 0) badgeCls = "v3-badge-info";

    const tecNome = tec.NOME || tec.USUARIO || os.TECNICO_NOME || os.TECNICO_ID || "--";
    const cliNome = cli.NOME_FANTASIA || cli.RAZAO_SOCIAL || os.CLIENTE_NOME || "--";
    const uniNome = uni.NOME_UNIDADE || os.UNIDADE_NOME || "--";
    const eqpTag = eqp.TAG || os.EQUIPAMENTO_TAG || "--";
    const eqpTipo = eqp.TIPO || os.EQUIPAMENTO_TIPO || "--";
    const contratoLabel = [contrato.NUMERO_CONTRATO, contrato.TIPO_CONTRATO].filter(Boolean).join(" - ") || "--";

    const qrSrc = meta.qrCodeDataUrl || meta.qrCodeUrl || "";
    const qrImgHtml = qrSrc
      ? "<img src=\"" + escAttr_(qrSrc) + "\" alt=\"QR Code\" class=\"v3-qr-img\">"
      : "<div class=\"v3-qr-na\">QR indisponivel</div><div style=\"font-size:7px;color:#6b7280;word-break:break-all;margin-top:4px;\">" + esc_(meta.validacaoUrl || "Configure SGO_WEBAPP_URL") + "</div>";

    const encTexto = os.ENCERRAMENTO_TECNICO || os.SERVICO_EXECUTADO || "";
    const enc = encTexto ? esc_(encTexto) : "<em class=\"v3-note-empty\">Nao informado. Salve o encerramento na tela de execucao antes de gerar o PDF.</em>";
    const diag = os.DIAGNOSTICO_FINAL ? esc_(os.DIAGNOSTICO_FINAL) : "<em class=\"v3-note-empty\">Nao informado. Salve o diagnostico na tela de execucao antes de gerar o PDF.</em>";
    const relatoDetalhadoHtml =
      "<div class=\"v3-kv-grid-2\" style=\"margin-top:8px;\">" +
        kv3_("Condicao encontrada", os.CONDICAO_ENCONTRADA) +
        kv3_("Causa provavel", os.CAUSA_PROVAVEL) +
        kv3_("Recomendacao", os.RECOMENDACAO) +
        kv3_("Pendencias", os.PENDENCIAS) +
        kv3_("Necessita retorno?", os.NECESSITA_RETORNO === "S" ? "Sim" : "Nao") +
        kv3_("Necessita orcamento?", os.NECESSITA_ORCAMENTO === "S" ? "Sim" : "Nao") +
      "</div>";

    var checklistHtml;
    if (!checklist.length) {
      checklistHtml = "<div class=\"v3-note\">Nenhum item de checklist respondido.</div>";
    } else {
      var secoes = {};
      checklist.forEach(function(i) {
        var sec = (i.SECAO && String(i.SECAO).trim()) || "Geral";
        if (!secoes[sec]) secoes[sec] = [];
        secoes[sec].push(i);
      });
      checklistHtml = "<table class=\"v3-tbl\"><thead><tr><th>Item</th><th style=\"width:50px;text-align:center;\">Obrig.</th><th style=\"width:80px;text-align:center;\">Resposta</th><th>Observacao</th></tr></thead><tbody>";
      Object.keys(secoes).forEach(function(sec) {
        checklistHtml += "<tr class=\"v3-tbl-sec\"><th colspan=\"4\">" + esc_(sec) + "</th></tr>";
        secoes[sec].forEach(function(i) {
          var r = (i.RESPOSTA && String(i.RESPOSTA).toUpperCase()) || "--";
          var rCls = r === "OK" ? "v3-ok" : r === "NAO_OK" ? "v3-nok" : "v3-na";
          checklistHtml += "<tr><td>" + esc_(i.PERGUNTA || i.ITEM || "--") + "</td><td style=\"text-align:center;\">" + esc_(i.OBRIGATORIO || "--") + "</td><td class=\"" + rCls + "\">" + esc_(r) + "</td><td>" + esc_(i.OBSERVACAO || "--") + "</td></tr>";
        });
      });
      checklistHtml += "</tbody></table>";
    }

    var materiaisHtml;
    if (!materiais.length) {
      materiaisHtml = "<div class=\"v3-note\">Nenhum material registrado.</div>";
    } else {
      materiaisHtml = "<table class=\"v3-tbl\"><thead><tr><th>Descricao</th><th>Referencia</th><th>Serie/Lote</th><th style=\"text-align:center;\">Qtd</th>" + (mostrarCustos ? "<th style=\"text-align:right;\">Custo</th>" : "") + "</tr></thead><tbody>";
      materiais.forEach(function(m) {
        materiaisHtml += "<tr><td>" + esc_(m.DESCRICAO || "--") + "</td><td>" + esc_(m.REFERENCIA || "--") + "</td><td>" + esc_(m.NUMERO_SERIE || m.LOTE || "--") + "</td><td style=\"text-align:center;\">" + esc_(m.QUANTIDADE || "--") + "</td>" + (mostrarCustos ? "<td style=\"text-align:right;\">" + esc_(m.CUSTO_TOTAL || "--") + "</td>" : "") + "</tr>";
      });
      materiaisHtml += "</tbody></table>";
    }

    var evidenciasHtml;
    if (!fotos.length) {
      evidenciasHtml = "<div class=\"v3-note\">Nenhuma evidencia registrada.</div>";
    } else {
      evidenciasHtml = "<table class=\"v3-tbl\"><thead><tr><th>Momento</th><th>Nome</th><th>Link Drive</th><th>Observacao</th></tr></thead><tbody>";
      fotos.forEach(function(f) {
        evidenciasHtml += "<tr><td>" + esc_(f.MOMENTO || "GERAL") + "</td><td>" + esc_(f.NOME_ARQUIVO || "--") + "</td><td>" + esc_(f.LINK_DRIVE || "--") + "</td><td>" + esc_(f.OBSERVACAO || "--") + "</td></tr>";
      });
      evidenciasHtml += "</tbody></table>";
    }

    const assDataUrl = assinatura.ASSINATURA_DATA_URL ? String(assinatura.ASSINATURA_DATA_URL) : "";
    const assLink = assinatura.LINK_DRIVE ? String(assinatura.LINK_DRIVE) : "";
    var assImgHtml;
    if (assDataUrl.indexOf("data:image/") === 0) {
      assImgHtml = "<img src=\"" + escAttr_(assDataUrl) + "\" alt=\"Assinatura\">";
    } else if (assLink) {
      assImgHtml = "<div style=\"font-size:9px;\">" + esc_(assLink) + "</div>";
    } else {
      assImgHtml = "<div style=\"color:#9ca3af;font-size:9px;\">Sem imagem de assinatura</div>";
    }

    var custosBlock = "";
    if (mostrarCustos) {
      const cp = custos.CUSTO_PECAS || os.CUSTO_PECAS;
      const ch = custos.CUSTO_HORA || os.CUSTO_HORA;
      const cd = custos.CUSTO_DESLOCAMENTO || os.CUSTO_DESLOCAMENTO;
      const ct = custos.CUSTO_TOTAL || os.CUSTO_TOTAL;
      if (cp || ch || cd || ct) {
        custosBlock = "<div class=\"v3-sec\"><div class=\"v3-sec-title\">Custos Internos</div>" +
          "<div class=\"v3-kv-grid-4\">" + kv3_("Pecas", cp) + kv3_("Hora tecnica", ch) + kv3_("Deslocamento", cd) + kv3_("Total", ct) + "</div></div>";
      }
    }

    return (watermarkText ? "<div class=\"v3-wm\">" + esc_(watermarkText) + "</div>" : "") +
    "<div class=\"v3\">" +

    "<div class=\"v3-header\">" +
      "<div><div class=\"v3-brand\">METROLABS</div><div class=\"v3-brand-sub\">SGO+ Engenharia Clinica &nbsp;|&nbsp; Documento tecnico controlado</div></div>" +
      "<div style=\"text-align:right;font-size:8px;opacity:.8;\">" + esc_(meta.codigo || "") + "<br>" + esc_(formatarData_(meta.emitidoEm)) + "</div>" +
    "</div>" +

    "<div class=\"v3-banner\" style=\"background:" + tipoBackground + ";color:" + tipoColor + ";\">" + esc_(tipoLabel) + "</div>" +

    "<div class=\"v3-cover\">" +
      "<div>" +
        "<div class=\"v3-os-num\">OS " + esc_(os.NUMERO_OS || os.ID || "--") +
          "&nbsp;<span class=\"v3-badge " + badgeCls + "\">" + esc_(os.STATUS || "--") + "</span></div>" +
        "<div class=\"v3-kv-grid-4\" style=\"margin-bottom:8px;\">" +
          kv3_("Tipo", os.TIPO_OS) +
          kv3_("Prioridade", os.PRIORIDADE) +
          kv3_("Abertura", formatarData_(os.DATA_ABERTURA)) +
          kv3_("SLA", formatarData_(os.SLA_PRAZO)) +
          kv3_("Agendamento", formatarData_(os.DATA_AGENDADA)) +
          kv3_("Tecnico", tecNome) +
          kv3_("Emissao", formatarData_(meta.emitidoEm)) +
          kv3_("Emitido por", meta.usuario) +
        "</div>" +
      "</div>" +
      "<div class=\"v3-qrbox\">" + qrImgHtml +
        "<div class=\"v3-qr-token\">" + esc_(meta.token || "--") + "</div>" +
        "<div style=\"font-size:7px;color:#6b7280;margin-top:2px;\">Validacao digital</div>" +
      "</div>" +
    "</div>" +

    "<div class=\"v3-sec\">" +
      "<div class=\"v3-sec-title\">Identificacao do Cliente e Ativo</div>" +
      "<div class=\"v3-kv-grid-2\" style=\"margin-bottom:7px;\">" + kv3_("Cliente", cliNome) + kv3_("Unidade / Local", uniNome) + "</div>" +
      "<div class=\"v3-kv-grid-4\">" +
        kv3_("TAG do Equipamento", eqpTag) +
        kv3_("Tipo", eqpTipo) +
        kv3_("Fabricante / Modelo", [eqp.FABRICANTE, eqp.MODELO].filter(Boolean).join(" / ") || "--") +
        kv3_("Serie", eqp.SERIE || os.EQUIPAMENTO_SERIE || "--") +
        kv3_("Peca / Subconjunto", peca.NOME || os.PECA_ID || "--") +
        kv3_("Setor", eqp.SETOR || uni.SETOR || "--") +
        kv3_("Patrimonio", eqp.PATRIMONIO || eqp.REGISTRO || "--") +
        kv3_("Contrato", contratoLabel) +
      "</div>" +
    "</div>" +

    "<div class=\"v3-sec\">" +
      "<div class=\"v3-sec-title\">Demanda do Cliente</div>" +
      "<div class=\"v3-2col\">" +
        "<div><div class=\"v3-lbl\">Relato do cliente</div><div class=\"v3-note\">" + esc_(os.RELATO_CLIENTE || "--") + "</div></div>" +
        "<div><div class=\"v3-lbl\">Missao tecnica</div><div class=\"v3-note\">" + esc_(os.MISSAO_TECNICA || "--") + "</div></div>" +
      "</div>" +
    "</div>" +

    "<div class=\"v3-sec\">" +
      "<div class=\"v3-sec-title\">Execucao Tecnica</div>" +
      "<div class=\"v3-kv-grid-4\" style=\"margin-bottom:8px;\">" +
        kv3_("Inicio", formatarData_(os.DATA_INICIO || missao.CHECKIN_EM)) +
        kv3_("Termino", formatarData_(os.DATA_CONCLUSAO || missao.CHECKOUT_EM)) +
        kv3_("Check-in", [formatarData_(missao.CHECKIN_EM), missao.CHECKIN_ENDERECO].filter(Boolean).join(" | ") || "--") +
        kv3_("Check-out", [formatarData_(missao.CHECKOUT_EM), missao.CHECKOUT_ENDERECO].filter(Boolean).join(" | ") || "--") +
      "</div>" +
      "<div style=\"margin-bottom:8px;\"><div class=\"v3-lbl\">Encerramento tecnico</div>" +
        "<div class=\"v3-note v3-note-green\">" + enc + "</div></div>" +
      "<div><div class=\"v3-lbl\">Diagnostico final</div>" +
        "<div class=\"v3-note v3-note-blue\">" + diag + "</div></div>" +
      relatoDetalhadoHtml +
    "</div>" +

    "<div class=\"v3-sec\"><div class=\"v3-sec-title\">Checklist Tecnico</div>" + checklistHtml + "</div>" +

    "<div class=\"v3-sec\"><div class=\"v3-sec-title\">Materiais e Pecas</div>" + materiaisHtml + "</div>" +

    "<div class=\"v3-sec\"><div class=\"v3-sec-title\">Evidencias Fotograficas</div>" + evidenciasHtml + "</div>" +

    "<div class=\"v3-sec\">" +
      "<div class=\"v3-sec-title\">Aprovacao e Assinatura</div>" +
      "<div class=\"v3-sign-grid\">" +
        "<div>" +
          "<div class=\"v3-kv-grid-2\">" +
            kv3_("Assinado por", assinatura.ASSINADO_POR || os.ASSINADO_POR) +
            kv3_("Cargo", assinatura.CARGO) +
            kv3_("Assinado em", formatarData_(assinatura.ASSINADO_EM || os.ASSINADO_EM)) +
            kv3_("Aprovado por", os.APROVADO_POR || os.APROVADOR_ID) +
            kv3_("Aprovado em", formatarData_(os.APROVADO_EM || os.DATA_APROVACAO)) +
            kv3_("Status", os.APROVACAO_ADMIN || os.STATUS) +
          "</div>" +
        "</div>" +
        "<div><div class=\"v3-lbl\">Assinatura digital</div>" +
          "<div class=\"v3-sign-box\">" + assImgHtml + "</div>" +
        "</div>" +
      "</div>" +
    "</div>" +

    custosBlock +

    "<div class=\"v3-footer\">" +
      "<div>" +
        "<strong style=\"color:#0b3b78;\">Rastreabilidade digital METROLABS SGO+</strong><br>" +
        "Hash SHA256: <span class=\"mono\">" + esc_(meta.hash || "--") + "</span><br>" +
        "Token: <span class=\"mono\">" + esc_(meta.token || "--") + "</span><br>" +
        "URL: <span class=\"mono\">" + esc_(meta.validacaoUrl || "--") + "</span><br>" +
        "<span class=\"v3-tpl\">Template documental: OS_TECNICA_PREMIUM_V3</span>" +
      "</div>" +
      "<div style=\"text-align:center;\">" + (qrSrc ? "<img src=\"" + escAttr_(qrSrc) + "\" alt=\"QR\" class=\"v3-footer-qr\">" : "") +
        "<div style=\"font-size:7px;color:#6b7280;margin-top:2px;\">Validar</div>" +
      "</div>" +
    "</div>" +
    "</div>";
  }

  return {
    gerarDocumento: gerarDocumento,
    obterDocumentoPorToken: obterDocumentoPorToken,
    getDocumentoCss: getDocumentoCss_
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
