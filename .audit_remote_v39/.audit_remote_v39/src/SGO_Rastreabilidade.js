const SGO_RASTREABILIDADE = (() => {
  const DB = "ESTOQUE";
  const DB_OS = "OS";
  const DB_MAIN = "PRINCIPAL";
  const SHEETS = SGO_CFG.SHEETS;

  function consultar(sessionId, filtros) {
    exigirSessao(sessionId);
    return consultarInterno_(filtros);
  }

  function consultarPublico(codigo) {
    const valor = SGO_UTILS.safe(codigo);
    if (!valor) return { success: false, message: "Codigo nao informado." };
    return consultarInterno_({ CODIGO: valor, LOTE_ID: valor, PECA_ID: valor, OS_ID: valor });
  }

  function consultarInterno_(filtros) {
    filtros = filtros || {};
    const codigo = SGO_UTILS.safe(filtros.CODIGO || filtros.TOKEN || filtros.QR_TOKEN);
    const loteId = SGO_UTILS.safe(filtros.LOTE_ID);
    const pecaId = SGO_UTILS.safe(filtros.PECA_ID || filtros.PECA_INSTALADA_ID);
    const osId = SGO_UTILS.safe(filtros.OS_ID);

    if (codigo) {
      const rastreio = SGO_ESTOQUE.rastrearPorCodigo(codigo);
      if (!rastreio || !rastreio.entidade) return { success: false, message: "Codigo nao localizado." };
      if (SGO_UTILS.safeUpper(rastreio.etiqueta.TIPO_ENTIDADE) === "LOTE_ESTOQUE") {
        return montarPorLote_(rastreio.entidade.ID);
      }
      return { success: true, tipo: rastreio.etiqueta.TIPO_ENTIDADE, etiqueta: rastreio.etiqueta, entidade: rastreio.entidade };
    }

    if (loteId) return montarPorLote_(loteId);
    if (pecaId) return montarPorPeca_(pecaId);
    if (osId) return montarPorOS_(osId);
    return { success: false, message: "Informe codigo, lote, peca ou OS para rastrear." };
  }

  function montarPorLote_(loteId) {
    const lote = SGO_DATA.getById(SHEETS.EST_LOTES, loteId, DB);
    if (!lote) return { success: false, message: "Lote nao encontrado." };
    const item = SGO_DATA.getById(SHEETS.EST_ITENS, lote.ITEM_ID, DB);
    const fornecedor = SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, lote.FORNECEDOR_ID, DB);
    const nf = lote.NF_ID ? SGO_DATA.getById(SHEETS.EST_NOTAS_FISCAIS, lote.NF_ID, DB) : null;
    const entradas = SGO_DATA.getManyByField(SHEETS.EST_ENTRADAS, "LOTE_ID", lote.ID, DB);
    const saidas = SGO_DATA.getManyByField(SHEETS.EST_SAIDAS, "LOTE_ID", lote.ID, DB);
    const movimentos = SGO_DATA.getManyByField(SHEETS.EST_MOVIMENTACOES, "LOTE_ID", lote.ID, DB);
    const usos = saidas.map(enriquecerSaida_);

    return {
      success: true,
      tipo: "LOTE",
      item: item,
      lote: lote,
      fornecedor: fornecedor,
      notaFiscal: nf,
      entradas: entradas,
      saidas: usos,
      movimentacoes: movimentos
    };
  }

  function montarPorPeca_(pecaId) {
    const peca = SGO_DATA.getById(SHEETS.CAD_PECAS, pecaId, DB_MAIN);
    if (!peca) return { success: false, message: "Peca instalada nao encontrada." };
    const lote = peca.LOTE_ID ? SGO_DATA.getById(SHEETS.EST_LOTES, peca.LOTE_ID, DB) : null;
    const item = peca.ITEM_ESTOQUE_ID ? SGO_DATA.getById(SHEETS.EST_ITENS, peca.ITEM_ESTOQUE_ID, DB) : null;
    const fornecedor = peca.FORNECEDOR_ID ? SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, peca.FORNECEDOR_ID, DB) : null;
    const osInstalacao = peca.INSTALADA_OS_ID ? SGO_DATA.getById(SHEETS.OS_ORDENS, peca.INSTALADA_OS_ID, DB_OS) : null;
    const historico = SGO_DATA.getManyByField(SHEETS.HST_PECAS_EQUIPAMENTO, "PECA_INSTALADA_ID", peca.ID, DB_MAIN);
    return {
      success: true,
      tipo: "PECA_INSTALADA",
      peca: peca,
      item: item,
      lote: lote,
      fornecedor: fornecedor,
      osInstalacao: osInstalacao,
      historico: historico
    };
  }

  function montarPorOS_(osId) {
    const os = SGO_DATA.getById(SHEETS.OS_ORDENS, osId, DB_OS);
    if (!os) return { success: false, message: "OS nao encontrada." };
    const materiais = SGO_DATA.getManyByField(SHEETS.OS_MATERIAIS, "OS_ID", osId, DB_OS).map(function(mat) {
      const lote = mat.LOTE_ID ? SGO_DATA.getById(SHEETS.EST_LOTES, mat.LOTE_ID, DB) : null;
      const item = mat.ITEM_ID ? SGO_DATA.getById(SHEETS.EST_ITENS, mat.ITEM_ID, DB) : null;
      const fornecedor = mat.FORNECEDOR_ID ? SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, mat.FORNECEDOR_ID, DB) : null;
      const peca = mat.PECA_INSTALADA_ID ? SGO_DATA.getById(SHEETS.CAD_PECAS, mat.PECA_INSTALADA_ID, DB_MAIN) : null;
      return Object.assign({}, mat, {
        item: item,
        lote: lote,
        fornecedor: fornecedor,
        pecaInstalada: peca
      });
    });
    return {
      success: true,
      tipo: "OS",
      os: os,
      materiais: materiais
    };
  }

  function enriquecerSaida_(saida) {
    const os = saida.OS_ID ? SGO_DATA.getById(SHEETS.OS_ORDENS, saida.OS_ID, DB_OS) : null;
    const peca = saida.PECA_INSTALADA_ID ? SGO_DATA.getById(SHEETS.CAD_PECAS, saida.PECA_INSTALADA_ID, DB_MAIN) : null;
    return Object.assign({}, saida, {
      os: os,
      pecaInstalada: peca
    });
  }

  return {
    consultar: consultar,
    consultarPublico: consultarPublico
  };
})();

function rastreabilidadeConsultar(sessionId, filtros) {
  try {
    return JSON.parse(JSON.stringify(SGO_RASTREABILIDADE.consultar(sessionId, filtros)));
  } catch (e) {
    return { success: false, message: "Erro: " + e.message };
  }
}

function rastreabilidadeConsultarPublico(codigo) {
  try {
    return JSON.parse(JSON.stringify(SGO_RASTREABILIDADE.consultarPublico(codigo)));
  } catch (e) {
    return { success: false, message: "Erro: " + e.message };
  }
}
