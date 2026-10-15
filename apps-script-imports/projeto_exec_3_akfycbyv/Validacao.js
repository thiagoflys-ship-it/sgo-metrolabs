/**
 * ============================================================
 * METROLABS — BACKEND DE VALIDAÇÃO DOCUMENTAL
 * ARQUIVO: Validacao.gs
 * PROJETO: CARTA DE CONFORMIDADE METROLABS — V1.0.1
 *
 * IMPORTANTE:
 * - Este arquivo NÃO possui doGet().
 * - O doGet() oficial fica somente no Codigo.gs.
 * - Isso evita o erro de abrir direto a tela de validação sem código.
 * ============================================================
 */

/**
 * Registra documento em aba VALIDACAO.
 * Pode ser usado como fallback, mas o fluxo principal já salva
 * também pela função salvarRegistroRelatorio() do Codigo.gs.
 */
function registrarDocumento(payload, urlPdf) {
  try {
    const sheet = obterSheetValidacao_();

    const codigo = normalizarTexto_(
      payload.codigoValidacao ||
      payload.codigo_validacao ||
      gerarCodigoAutenticacao_(payload)
    ).toUpperCase();

    const osNumero = normalizarTexto_(
      payload.osNumero ||
      payload.os_numero ||
      gerarNumeroOs_(payload)
    );

    const urlValidacao = normalizarTexto_(
      payload.urlValidacao ||
      payload.url_validacao ||
      montarUrlValidacao_(codigo)
    );

    const cliente = payload.cliente || {};
    const equipamento = payload.equipamento || {};

    sheet.appendRow([
      new Date(),
      codigo,
      cliente.razaoSocial || cliente.nome || "",
      cliente.cnpj || "",
      equipamento.tipoNome || equipamento.tipo || "",
      equipamento.numeroSerie || equipamento.serie || "",
      payload.statusFinal || payload.statusManual || "",
      osNumero,
      urlPdf || payload.urlPdf || payload.url_pdf || "",
      urlValidacao
    ]);

    return {
      ok: true,
      codigoValidacao: codigo,
      osNumero: osNumero,
      urlValidacao: urlValidacao
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao registrar documento na validação: " + obterMensagemErro_(e)
    };
  }
}

/**
 * Busca primeiro no índice oficial MOV_DOCUMENTOS.
 * Se não encontrar, busca na aba fallback VALIDACAO.
 */
function buscarDocumentoPorCodigo(codigo) {
  try {
    const codigoBusca = normalizarTexto_(codigo).toUpperCase();
    if (!codigoBusca) {
      return { ok: false, mensagem: "Código de autenticação não informado." };
    }

    const resPrincipal = buscarDocumentoPorCodigoMovDocumentos_(codigoBusca);
    if (resPrincipal && resPrincipal.ok) return resPrincipal;

    const resFallback = buscarDocumentoPorCodigoValidacao_(codigoBusca);
    if (resFallback && resFallback.ok) return resFallback;

    return {
      ok: false,
      mensagem: "Código não localizado no histórico documental."
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao consultar documento: " + obterMensagemErro_(e)
    };
  }
}

function buscarDocumentoPorCodigoMovDocumentos_(codigoBusca) {
  try {
    const db = getDB_();
    const aba = db.getSheetByName(CFG.PLANILHA.ABAS.DOCUMENTOS);
    if (!aba) return { ok: false };

    const valores = aba.getDataRange().getValues();
    if (!valores || valores.length <= 1) return { ok: false };

    for (let i = 1; i < valores.length; i++) {
      const l = valores[i];
      const cod = normalizarTexto_(l[8]).toUpperCase();

      if (cod && cod === codigoBusca) {
        return {
          ok: true,
          documentoId: String(l[0] || ""),
          dataEmissao: String(l[1] || ""),
          clienteId: String(l[2] || ""),
          equipamentoId: String(l[3] || ""),
          relatorioId: String(l[4] || ""),
          documentoTipo: String(l[5] || "Carta de Conformidade Metrolabs"),
          nomeDocumento: String(l[6] || ""),
          urlPdf: String(l[7] || ""),
          codigoValidacao: String(l[8] || ""),
          urlValidacao: String(l[9] || ""),
          osNumero: String(l[10] || ""),
          cliente: String(l[11] || ""),
          cnpj: String(l[12] || ""),
          equipamento: String(l[13] || ""),
          serie: String(l[14] || ""),
          status: String(l[15] || "")
        };
      }
    }

    return { ok: false };

  } catch (e) {
    return { ok: false };
  }
}

function buscarDocumentoPorCodigoValidacao_(codigoBusca) {
  try {
    const sheet = obterSheetValidacao_();
    const dados = sheet.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];

      if (normalizarTexto_(row[1]).toUpperCase() === codigoBusca) {
        return {
          ok: true,
          cliente: row[2],
          cnpj: row[3],
          equipamento: row[4],
          serie: row[5],
          status: row[6],
          osNumero: row[7],
          urlPdf: row[8],
          urlValidacao: row[9],
          dataEmissao: Utilities.formatDate(
            new Date(row[0]),
            obterTimezone_(),
            "dd/MM/yyyy HH:mm"
          ),
          documentoTipo: "Carta de Conformidade Metrolabs",
          codigoValidacao: codigoBusca,
          relatorioId: ""
        };
      }
    }

    return { ok: false };

  } catch (e) {
    return { ok: false };
  }
}

function obterSheetValidacao_() {
  const db = getDB_();
  let sheet = db.getSheetByName("VALIDACAO");

  if (!sheet) {
    sheet = db.insertSheet("VALIDACAO");
    sheet.appendRow([
      "DATA",
      "CODIGO",
      "CLIENTE",
      "CNPJ",
      "EQUIPAMENTO",
      "SERIE",
      "STATUS",
      "OS",
      "PDF",
      "URL_VALIDACAO"
    ]);

    sheet.getRange(1, 1, 1, 10)
      .setFontWeight("bold")
      .setBackground("#198754")
      .setFontColor("#ffffff");

    sheet.setFrozenRows(1);
  }

  return sheet;
}
