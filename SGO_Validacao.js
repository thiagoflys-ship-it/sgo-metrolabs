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
      const cfgUrl = sgoGetCfgSafe_().WEBAPP_URL;
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

      const docAst = buscarDocumentoAssistenciaTecnica_(codigoBusca);
      if (docAst) return docAst;

      const sheet = obterSheet_();
      const dados = sheet.getDataRange().getValues();

      for (let i = 1; i < dados.length; i++) {
        const row = dados[i];
        const cod = String(row[1] || "").trim().toUpperCase();
        if (cod !== codigoBusca) continue;

        const dataEmissao = formatarDataValidacao_(row[0]);

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

    return { ok: false, mensagem: "Documento nao localizado ou token invalido." };
  }

  function traduzirStatusPublico_(s) {
    s = String(s || "").toUpperCase().trim();
    if (s === "CONCLUIDA_TECNICAMENTE" || s === "EM_APROVACAO") return "Atendimento concluído";
    if (s === "APROVADA" || s === "FATURADA") return "Atendimento concluído";
    if (s === "CANCELADA") return "Cancelada";
    if (s === "EM_EXECUCAO") return "Em execução";
    if (s === "AGENDADA") return "Agendada";
    if (s === "ABERTA") return "Aberta";
    return s || "VÁLIDO";
  }

  function buscarDocumentoControlado_(codigoBusca) {
    try {
      const docs = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.DOC_DOCUMENTOS);
      const doc = docs.find(function(d) {
        return String(d.TOKEN_VALIDACAO || "").trim().toUpperCase() === codigoBusca;
      });
      if (!doc) return null;

      const cliente = doc.CLIENTE_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES, doc.CLIENTE_ID) : null;
      const unidade = doc.UNIDADE_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, doc.UNIDADE_ID) : null;
      const equipamento = doc.EQUIPAMENTO_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS, doc.EQUIPAMENTO_ID) : null;
      const os = doc.OS_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.OS_ORDENS, doc.OS_ID, "OS") : null;
      const tipoRaw = String(doc.TIPO_DOCUMENTO || "Documento Tecnico");
      const frotaMeta = montarMetaFrotaValidacao_(doc, tipoRaw);

      return {
        ok: true,
        codigoValidacao: codigoBusca,
        documentoTipo: nomeAmigavelTipoDocumentoValidacao_(tipoRaw),
        documentoTipoRaw: tipoRaw,
        isFrota: frotaMeta.isFrota,
        cliente: cliente ? String(cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || "") : "",
        cnpj: cliente ? String(cliente.CNPJ || "") : "",
        unidade: unidade ? String(unidade.NOME_UNIDADE || unidade.NOME || "") : "",
        equipamento: equipamento ? String((equipamento.TAG || "") + " " + (equipamento.TIPO || "")) : "",
        status: String((os && traduzirStatusPublico_(os.STATUS)) || doc.STATUS || "VÁLIDO"),
        urlPdf: String(doc.LINK_ARQUIVO || ""),
        urlValidacao: String(doc.URL_VALIDACAO || ""),
        relatorioId: String((os && (os.NUMERO_OS || os.ID)) || doc.RESPONSAVEL_TECNICO || doc.OS_ID || doc.FILE_ID || ""),
        numeroOS: String((os && (os.NUMERO_OS || os.ID)) || doc.OS_ID || ""),
        osId: String(doc.OS_ID || ""),
        dataEmissao: formatarDataValidacao_(doc.DATA_EMISSAO || doc.CRIADO_EM),
        razaoSocial: cliente ? String(cliente.RAZAO_SOCIAL || cliente.NOME_FANTASIA || "") : "",
        endereco: unidade ? String(unidade.ENDERECO || "") : "",
        telefone: cliente ? String(cliente.TELEFONE || "") : "",
        email: cliente ? String(cliente.EMAIL || "") : "",
        contato: cliente ? String(cliente.CONTATO || "") : "",
        totalEquipamentos: equipamento ? 1 : 0,
        geradoEm: String(doc.CRIADO_EM || ""),
        hashSha256: String(doc.HASH_SHA256 || ""),
        placa: frotaMeta.placa,
        veiculo: frotaMeta.veiculo,
        periodo: frotaMeta.periodo,
        condutor: frotaMeta.condutor,
        numeroAuto: frotaMeta.numeroAuto,
        dataHoraInfracao: frotaMeta.dataHoraInfracao,
        orgaoAutuador: frotaMeta.orgaoAutuador,
        periodoInicial: frotaMeta.periodoInicial,
        periodoFinal: frotaMeta.periodoFinal,
        periodoLabel: frotaMeta.periodo,
        extra: {
          documentoId: doc.ID,
          unidadeId: doc.UNIDADE_ID || "",
          equipamentoId: doc.EQUIPAMENTO_ID || "",
          pecaInstaladaId: doc.PECA_INSTALADA_ID || "",
          fornecedorId: doc.FORNECEDOR_ID || "",
          osId: doc.OS_ID || "",
          fileId: doc.FILE_ID || "",
          hashSha256: doc.HASH_SHA256 || "",
          placa: frotaMeta.placa,
          veiculo: frotaMeta.veiculo,
          periodo: frotaMeta.periodo,
          condutor: frotaMeta.condutor,
          numeroAuto: frotaMeta.numeroAuto,
          dataHoraInfracao: frotaMeta.dataHoraInfracao,
          orgaoAutuador: frotaMeta.orgaoAutuador,
          periodoInicial: frotaMeta.periodoInicial,
          periodoFinal: frotaMeta.periodoFinal,
          periodoLabel: frotaMeta.periodo
        }
      };
    } catch (e) {
      return null;
    }
  }

  function buscarDocumentoAssistenciaTecnica_(codigoBusca) {
    try {
      if (!sgoGetCfgSafe_().SHEETS.AST_DOCUMENTOS) return null;
      const docs = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.AST_DOCUMENTOS);
      const doc = docs.find(function(d) {
        return String(d.TOKEN_VALIDACAO || "").trim().toUpperCase() === codigoBusca;
      });
      if (!doc) return null;

      const entrada = doc.ENTRADA_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.AST_ENTRADAS, doc.ENTRADA_ID) : null;
      const cliente = entrada && entrada.CLIENTE_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES, entrada.CLIENTE_ID) : null;
      const unidade = entrada && entrada.UNIDADE_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, entrada.UNIDADE_ID) : null;
      const equipamento = entrada && entrada.EQUIPAMENTO_ID ? SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS, entrada.EQUIPAMENTO_ID) : null;
      const equipamentoLabel = equipamento
        ? String([equipamento.TIPO, equipamento.TAG, equipamento.FABRICANTE, equipamento.MODELO].filter(Boolean).join(" - "))
        : String((entrada && entrada.EQUIPAMENTO_PROVISORIO) || "");
      const statusDoc = String(doc.STATUS || "VALIDO").toUpperCase();
      const statusPublico = (statusDoc === "CANCELADO" || statusDoc === "CANCELADA" || statusDoc === "SUBSTITUIDO" || statusDoc === "SUBSTITUIDA")
        ? "Documento cancelado/substituido."
        : "Documento valido.";

      return {
        ok: true,
        codigoValidacao: codigoBusca,
        documentoTipo: nomeAmigavelTipoDocumentoValidacao_(doc.TIPO_DOCUMENTO),
        documentoTipoRaw: String(doc.TIPO_DOCUMENTO || ""),
        cliente: cliente ? String(cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || "") : String((entrada && entrada.CLIENTE_PROVISORIO) || ""),
        cnpj: cliente ? String(cliente.CNPJ || "") : "",
        unidade: unidade ? String(unidade.NOME_UNIDADE || unidade.NOME || "") : String((entrada && entrada.UNIDADE_PROVISORIA) || ""),
        equipamento: equipamentoLabel,
        status: statusPublico,
        urlPdf: String(doc.LINK_ARQUIVO || ""),
        urlValidacao: String(doc.URL_VALIDACAO || ""),
        relatorioId: String((entrada && entrada.PROTOCOLO) || doc.NUMERO_DOCUMENTO || doc.FILE_ID || ""),
        dataEmissao: formatarDataValidacao_(doc.CRIADO_EM),
        razaoSocial: cliente ? String(cliente.RAZAO_SOCIAL || cliente.NOME_FANTASIA || "") : String((entrada && entrada.CLIENTE_PROVISORIO) || ""),
        endereco: unidade ? String(unidade.ENDERECO || "") : "",
        telefone: cliente ? String(cliente.TELEFONE || "") : "",
        email: cliente ? String(cliente.EMAIL || "") : "",
        contato: cliente ? String(cliente.CONTATO || "") : "",
        totalEquipamentos: 1,
        geradoEm: String(doc.CRIADO_EM || ""),
        hashSha256: String(doc.HASH_SHA256 || ""),
        emitidoPor: "Metrolabs",
        extra: {
          modulo: "ASSISTENCIA_TECNICA",
          documentoId: doc.ID,
          entradaId: doc.ENTRADA_ID || "",
          protocolo: (entrada && entrada.PROTOCOLO) || "",
          statusEntrada: (entrada && entrada.STATUS) || "",
          fileId: doc.FILE_ID || "",
          hashSha256: doc.HASH_SHA256 || ""
        }
      };
    } catch (e) {
      return null;
    }
  }

  function nomeAmigavelTipoDocumentoValidacao_(tipo) {
    const mapa = {
      FROTA_RELATORIO_VEICULO: "Relatório Individual de Veículo",
      FROTA_RELATORIO_GERAL: "Relatório Geral da Frota",
      FROTA_TERMO_MULTA: "Termo de Ciência e Responsabilidade por Infração de Trânsito",
      OS_TECNICA: "Ordem de Serviço Técnica",
      INVENTARIO_TECNICO: "Inventário Técnico",
      RASTREABILIDADE_COMPLETA: "Rastreabilidade Completa",
      COMPROVANTE_ENTRADA_EQUIPAMENTO: "Comprovante de Entrada de Equipamento",
      ETIQUETA_RASTREABILIDADE_AST: "Etiqueta de Rastreabilidade SGO+"
    };
    return mapa[String(tipo || "").toUpperCase()] || String(tipo || "Documento Técnico");
  }

  function montarMetaFrotaValidacao_(doc, tipo) {
    const tipoUp = String(tipo || "").toUpperCase();
    const isFrota = tipoUp.indexOf("FROTA_") === 0 || ["FROTA_RELATORIO_VEICULO", "FROTA_RELATORIO_GERAL", "FROTA_TERMO_MULTA"].indexOf(tipoUp) >= 0;
    const out = { isFrota: isFrota, placa: "", veiculo: "", periodo: "", periodoInicial: "", periodoFinal: "", condutor: "", numeroAuto: "", dataHoraInfracao: "", orgaoAutuador: "" };
    if (!isFrota) return out;
    try {
      let veiculo = null;
      if (doc.VEICULO_ID) veiculo = SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.FROTA_VEICULOS, doc.VEICULO_ID, "FROTA");
      if (veiculo) {
        out.placa = String(veiculo.PLACA || "");
        out.veiculo = String([veiculo.MARCA, veiculo.MODELO, veiculo.ANO].filter(Boolean).join(" "));
      }
    } catch (e) {}
    try {
      if (tipoUp === "FROTA_TERMO_MULTA" && doc.ENTIDADE_ID) {
        const multa = SGO_DATA.getById(sgoGetCfgSafe_().SHEETS.FROTA_MULTAS, doc.ENTIDADE_ID, "FROTA");
        if (multa) {
          out.placa = String(multa.PLACA || out.placa || "");
          out.condutor = String(multa.CONDUTOR_NOME || "");
          out.numeroAuto = String(multa.NUMERO_AUTO || "");
          out.dataHoraInfracao = String(multa.DATA_HORA_INFRACAO || "");
          out.orgaoAutuador = String(multa.ORGAO_AUTUADOR || "");
        }
      }
    } catch (e) {}
    if (!out.placa && doc.ENTIDADE_ID && tipoUp === "FROTA_RELATORIO_GERAL") out.placa = "FROTA_GERAL";
    const dados = parseDadosDocumentoValidacao_(doc);
    out.periodoInicial = String(doc.PERIODO_INICIAL || dados.PERIODO_INICIAL || dados.inicio || (dados.periodo && (dados.periodo.PERIODO_INICIAL || dados.periodo.inicio)) || "");
    out.periodoFinal = String(doc.PERIODO_FINAL || dados.PERIODO_FINAL || dados.fim || (dados.periodo && (dados.periodo.PERIODO_FINAL || dados.periodo.fim)) || "");
    out.periodo = String(doc.PERIODO_LABEL || dados.PERIODO_LABEL || (dados.periodo && dados.periodo.PERIODO_LABEL) || "");
    if (!out.periodo && (out.periodoInicial || out.periodoFinal)) out.periodo = montarPeriodoLabelValidacao_(out.periodoInicial, out.periodoFinal);
    return out;
  }

  function parseDadosDocumentoValidacao_(doc) {
    const raw = doc.DADOS || doc.DADOS_JSON || doc.METADADOS_JSON || "";
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(String(raw));
    } catch (e) {
      return {};
    }
  }

  function montarPeriodoLabelValidacao_(inicio, fim) {
    const ini = formatarDataCurtaValidacao_(inicio);
    const ate = formatarDataCurtaValidacao_(fim);
    if (ini && ate) return "de " + ini + " ate " + ate;
    if (ini) return "a partir de " + ini;
    if (ate) return "ate " + ate;
    return "";
  }

  function formatarDataCurtaValidacao_(valor) {
    const raw = String(valor || "").trim();
    if (!raw) return "";
    try {
      const data = new Date(raw);
      if (!isNaN(data.getTime()) && data.getFullYear() >= 2000) {
        return Utilities.formatDate(data, Session.getScriptTimeZone(), "dd/MM/yyyy");
      }
    } catch (e) {}
    return raw;
  }

  function formatarDataValidacao_(valor) {
    const raw = String(valor || "").trim();
    if (!raw) return "--";
    try {
      const data = new Date(raw);
      if (isNaN(data.getTime()) || data.getFullYear() < 2000) return "--";
      return Utilities.formatDate(data, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return raw;
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
