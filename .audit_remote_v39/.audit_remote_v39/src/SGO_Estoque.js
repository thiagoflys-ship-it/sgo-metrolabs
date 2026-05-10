const SGO_ESTOQUE = (() => {
  const DB = "ESTOQUE";
  const DB_OS = "OS";
  const DB_MAIN = "PRINCIPAL";
  const SHEETS = SGO_CFG.SHEETS;

  function listarItens(sessionId, filtros) {
    exigirSessao(sessionId);
    const f = filtros || {};
    const texto = SGO_UTILS.safeLower(f.TEXTO);
    const status = SGO_UTILS.safeUpper(f.STATUS);
    const itens = SGO_DATA.getAll(SHEETS.EST_ITENS, DB).map(enriquecerItem_);
    return {
      success: true,
      items: itens.filter(function(item) {
        if (status && SGO_UTILS.safeUpper(item.STATUS) !== status) return false;
        if (texto) {
          const alvo = [item.CODIGO_INTERNO, item.DESCRICAO, item.REFERENCIA, item.FABRICANTE].join(" ").toLowerCase();
          if (alvo.indexOf(texto) < 0) return false;
        }
        return true;
      })
    };
  }

  function salvarItem(sessionId, payload) {
    exigirSessao(sessionId);
    payload = payload || {};
    const dados = {
      CODIGO_INTERNO: SGO_UTILS.safeUpper(payload.CODIGO_INTERNO),
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO),
      TIPO_ITEM: SGO_UTILS.safeUpper(payload.TIPO_ITEM || "PECA"),
      FABRICANTE: SGO_UTILS.safe(payload.FABRICANTE),
      MODELO: SGO_UTILS.safe(payload.MODELO),
      REFERENCIA: SGO_UTILS.safeUpper(payload.REFERENCIA),
      UNIDADE_MEDIDA: SGO_UTILS.safeUpper(payload.UNIDADE_MEDIDA || "UN"),
      ESTOQUE_MINIMO: SGO_UTILS.toNumber(payload.ESTOQUE_MINIMO, 0),
      EXIGE_LOTE: SGO_UTILS.toBoolean(payload.EXIGE_LOTE) ? "S" : "N",
      EXIGE_VALIDADE: SGO_UTILS.toBoolean(payload.EXIGE_VALIDADE) ? "S" : "N",
      EXIGE_SERIE: SGO_UTILS.toBoolean(payload.EXIGE_SERIE) ? "S" : "N",
      APLICA_CALIBRACAO: SGO_UTILS.toBoolean(payload.APLICA_CALIBRACAO) ? "S" : "N",
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "ATIVO")
    };
    if (!dados.DESCRICAO) return { success: false, message: "Informe a descricao do item." };

    let id = SGO_UTILS.safe(payload.ID);
    if (id) {
      SGO_DATA.update(SHEETS.EST_ITENS, id, dados, DB);
    } else {
      if (!dados.CODIGO_INTERNO) dados.CODIGO_INTERNO = gerarCodigoItem_(dados.TIPO_ITEM);
      const etiqueta = SGO_ETIQUETAS.gerarToken("ITEM_ESTOQUE", dados.CODIGO_INTERNO);
      dados.QR_TOKEN = etiqueta.token;
      dados.QRCODE_LINK = etiqueta.qrcodeLink;
      id = SGO_DATA.insert(SHEETS.EST_ITENS, SGO_DATA.gerarRegistroBase(dados), DB).ID;
    }
    return { success: true, message: "Item salvo.", id: id };
  }

  function registrarNotaFiscal(sessionId, payload) {
    exigirSessao(sessionId);
    payload = payload || {};
    const fornecedorId = SGO_UTILS.safe(payload.FORNECEDOR_ID);
    const validacao = SGO_FORNECEDORES.validarFornecedorParaUso(fornecedorId);
    if (!validacao.ok) return { success: false, message: validacao.message };

    const dados = {
      FORNECEDOR_ID: fornecedorId,
      NUMERO_NF: SGO_UTILS.safe(payload.NUMERO_NF),
      SERIE_NF: SGO_UTILS.safe(payload.SERIE_NF),
      DATA_EMISSAO: SGO_UTILS.safe(payload.DATA_EMISSAO),
      DATA_RECEBIMENTO: SGO_UTILS.safe(payload.DATA_RECEBIMENTO || SGO_UTILS.nowIso()),
      VALOR_TOTAL: SGO_UTILS.toNumber(payload.VALOR_TOTAL, 0),
      LINK_XML: SGO_UTILS.safe(payload.LINK_XML),
      LINK_PDF: SGO_UTILS.safe(payload.LINK_PDF),
      HASH_XML: SGO_UTILS.safe(payload.HASH_XML),
      HASH_PDF: SGO_UTILS.safe(payload.HASH_PDF),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "RECEBIDA")
    };
    if (!dados.NUMERO_NF) return { success: false, message: "Informe o numero da NF." };

    const existente = payload.ID ? null : SGO_DATA.findOne(SHEETS.EST_NOTAS_FISCAIS, {
      FORNECEDOR_ID: fornecedorId,
      NUMERO_NF: dados.NUMERO_NF
    }, DB);
    if (existente) return { success: false, message: "NF ja registrada para este fornecedor." };

    let id = SGO_UTILS.safe(payload.ID);
    if (id) SGO_DATA.update(SHEETS.EST_NOTAS_FISCAIS, id, dados, DB);
    else id = SGO_DATA.insert(SHEETS.EST_NOTAS_FISCAIS, SGO_DATA.gerarRegistroBase(dados), DB).ID;
    return { success: true, message: "Nota fiscal registrada.", id: id };
  }

  function registrarEntrada(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const itemId = SGO_UTILS.safe(payload.ITEM_ID);
    const fornecedorId = SGO_UTILS.safe(payload.FORNECEDOR_ID);
    const item = SGO_DATA.getById(SHEETS.EST_ITENS, itemId, DB);
    if (!item) return { success: false, message: "Item de estoque nao encontrado." };
    if (SGO_UTILS.safeUpper(item.STATUS) !== "ATIVO") return { success: false, message: "Item bloqueado/inativo para entrada." };

    const validacaoFornecedor = SGO_FORNECEDORES.validarFornecedorParaUso(fornecedorId);
    if (!validacaoFornecedor.ok) return { success: false, message: validacaoFornecedor.message };

    const qtd = SGO_UTILS.toNumber(payload.QUANTIDADE, 0);
    const custoUnit = SGO_UTILS.toNumber(payload.CUSTO_UNITARIO, 0);
    if (qtd <= 0) return { success: false, message: "Quantidade de entrada deve ser maior que zero." };

    const lote = {
      ITEM_ID: itemId,
      FORNECEDOR_ID: fornecedorId,
      NUMERO_LOTE: SGO_UTILS.safeUpper(payload.NUMERO_LOTE),
      NUMERO_SERIE: SGO_UTILS.safeUpper(payload.NUMERO_SERIE),
      DATA_FABRICACAO: SGO_UTILS.safe(payload.DATA_FABRICACAO),
      DATA_VALIDADE: SGO_UTILS.safe(payload.DATA_VALIDADE),
      DATA_ENTRADA: SGO_UTILS.safe(payload.DATA_ENTRADA || SGO_UTILS.nowIso()),
      NF_ID: SGO_UTILS.safe(payload.NF_ID),
      QUANTIDADE_INICIAL: qtd,
      QUANTIDADE_ATUAL: qtd,
      CUSTO_UNITARIO: custoUnit,
      STATUS: "DISPONIVEL",
      BLOQUEADO: "N",
      MOTIVO_BLOQUEIO: ""
    };

    const validacaoLote = validarCamposObrigatoriosLote_(item, lote);
    if (!validacaoLote.ok) return { success: false, message: validacaoLote.message };
    if (lote.DATA_VALIDADE && dataVencida_(lote.DATA_VALIDADE)) {
      lote.STATUS = "VENCIDO";
      lote.BLOQUEADO = "S";
      lote.MOTIVO_BLOQUEIO = "Lote recebido com validade vencida.";
    }

    const etiqueta = SGO_ETIQUETAS.gerarToken("LOTE_ESTOQUE", itemId);
    lote.QR_TOKEN = etiqueta.token;
    lote.QRCODE_LINK = etiqueta.qrcodeLink;
    const loteCriado = SGO_DATA.insert(SHEETS.EST_LOTES, SGO_DATA.gerarRegistroBase(lote), DB);

    SGO_DATA.insert(SHEETS.EST_ENTRADAS, SGO_DATA.gerarRegistroBase({
      NF_ID: lote.NF_ID,
      ITEM_ID: itemId,
      LOTE_ID: loteCriado.ID,
      FORNECEDOR_ID: fornecedorId,
      QUANTIDADE: qtd,
      CUSTO_UNITARIO: custoUnit,
      CUSTO_TOTAL: qtd * custoUnit,
      RECEBIDO_POR: sessao.userId || sessao.usuario,
      RECEBIDO_EM: SGO_UTILS.nowIso(),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES)
    }), DB);

    registrarMovimento_({
      ITEM_ID: itemId,
      LOTE_ID: loteCriado.ID,
      TIPO_MOVIMENTO: "ENTRADA_NF",
      ORIGEM: "NF:" + SGO_UTILS.safe(payload.NF_ID),
      DESTINO: "ESTOQUE",
      QUANTIDADE: qtd,
      SALDO_ANTES: 0,
      SALDO_DEPOIS: qtd,
      RESPONSAVEL_ID: sessao.userId || sessao.usuario,
      OBSERVACOES: "Entrada por nota fiscal/lote"
    });

    return { success: true, message: "Entrada registrada.", loteId: loteCriado.ID };
  }

  function consumirItemEmOS(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      payload = payload || {};
      const osId = SGO_UTILS.safe(payload.OS_ID);
      const loteId = SGO_UTILS.safe(payload.LOTE_ID);
      const qtd = SGO_UTILS.toNumber(payload.QUANTIDADE, 1);
      if (!osId || !loteId) return { success: false, message: "Informe OS e lote." };
      if (qtd <= 0) return { success: false, message: "Quantidade deve ser maior que zero." };

      const os = SGO_DATA.getById(SHEETS.OS_ORDENS, osId, DB_OS);
      if (!os) return { success: false, message: "OS nao encontrada." };
      if (["APROVADA", "FATURADA", "CANCELADA"].indexOf(SGO_UTILS.safeUpper(os.STATUS)) >= 0) {
        return { success: false, message: "OS bloqueada para consumo de materiais." };
      }

      const lote = SGO_DATA.getById(SHEETS.EST_LOTES, loteId, DB);
      if (!lote) return { success: false, message: "Lote nao encontrado." };
      const item = SGO_DATA.getById(SHEETS.EST_ITENS, lote.ITEM_ID, DB);
      if (!item) return { success: false, message: "Item do lote nao encontrado." };

      const validacaoUso = validarLoteParaUso_(item, lote, qtd);
      if (!validacaoUso.ok) return { success: false, message: validacaoUso.message };
      const validacaoFornecedor = SGO_FORNECEDORES.validarFornecedorParaUso(lote.FORNECEDOR_ID);
      if (!validacaoFornecedor.ok) return { success: false, message: validacaoFornecedor.message };

      const saldoAntes = SGO_UTILS.toNumber(lote.QUANTIDADE_ATUAL, 0);
      const saldoDepois = saldoAntes - qtd;
      const custoUnit = SGO_UTILS.toNumber(lote.CUSTO_UNITARIO, 0);
      const custoTotal = custoUnit * qtd;
      SGO_DATA.update(SHEETS.EST_LOTES, loteId, {
        QUANTIDADE_ATUAL: saldoDepois,
        STATUS: saldoDepois <= 0 ? "ESGOTADO" : "DISPONIVEL"
      }, DB);

      const pecaInstalada = criarPecaInstaladaSeNecessario_(item, lote, os, payload, sessao);
      const saida = SGO_DATA.insert(SHEETS.EST_SAIDAS, SGO_DATA.gerarRegistroBase({
        ITEM_ID: item.ID,
        LOTE_ID: lote.ID,
        FORNECEDOR_ID: lote.FORNECEDOR_ID,
        OS_ID: osId,
        EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID || os.EQUIPAMENTO_ID),
        PECA_INSTALADA_ID: pecaInstalada ? pecaInstalada.ID : "",
        TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || os.TECNICO_ID || sessao.userId),
        QUANTIDADE: qtd,
        DESTINO: SGO_UTILS.safe(payload.DESTINO || "OS"),
        MOTIVO_SAIDA: SGO_UTILS.safe(payload.MOTIVO_SAIDA || "CONSUMO_OS"),
        DATA_SAIDA: SGO_UTILS.nowIso()
      }), DB);

      SGO_DATA.insert(SHEETS.OS_MATERIAIS, SGO_DATA.gerarRegistroBase({
        OS_ID: osId,
        PECA_ID: pecaInstalada ? pecaInstalada.ID : "",
        ITEM_ID: item.ID,
        LOTE_ID: lote.ID,
        FORNECEDOR_ID: lote.FORNECEDOR_ID,
        TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || os.TECNICO_ID || sessao.userId),
        PECA_INSTALADA_ID: pecaInstalada ? pecaInstalada.ID : "",
        DESCRICAO: item.DESCRICAO,
        REFERENCIA: item.REFERENCIA,
        NUMERO_SERIE: lote.NUMERO_SERIE,
        LOTE: lote.NUMERO_LOTE,
        QUANTIDADE: qtd,
        UNIDADE_MEDIDA: item.UNIDADE_MEDIDA,
        CUSTO_UNITARIO: custoUnit,
        CUSTO_TOTAL: custoTotal,
        FORNECEDOR: validacaoFornecedor.fornecedor.RAZAO_SOCIAL,
        NOTA_FISCAL: obterNumeroNF_(lote.NF_ID),
        DATA_USO: SGO_UTILS.nowIso(),
        STATUS: "CONSUMIDO"
      }), DB_OS);

      registrarMovimento_({
        ITEM_ID: item.ID,
        LOTE_ID: lote.ID,
        TIPO_MOVIMENTO: "SAIDA_OS",
        ORIGEM: "ESTOQUE",
        DESTINO: "OS:" + osId,
        OS_ID: osId,
        QUANTIDADE: qtd,
        SALDO_ANTES: saldoAntes,
        SALDO_DEPOIS: saldoDepois,
        RESPONSAVEL_ID: sessao.userId || sessao.usuario,
        OBSERVACOES: "Consumo vinculado a OS"
      });

      atualizarCustoPecasOS_(osId, custoTotal);
      return {
        success: true,
        message: "Item consumido e rastreado na OS.",
        saidaId: saida.ID,
        pecaInstaladaId: pecaInstalada ? pecaInstalada.ID : "",
        saldoAtual: saldoDepois
      };
    } finally {
      lock.releaseLock();
    }
  }

  function rastrearPorCodigo(codigo) {
    const token = SGO_UTILS.safeUpper(codigo);
    const etiqueta = SGO_ETIQUETAS.obterPorToken(token);
    if (!etiqueta) return null;
    return {
      etiqueta: etiqueta,
      entidade: resolverEntidadeEtiqueta_(etiqueta)
    };
  }

  function validarLoteParaUso_(item, lote, qtd) {
    if (SGO_UTILS.safeUpper(item.STATUS) !== "ATIVO") return { ok: false, message: "Item inativo/bloqueado." };
    if (SGO_UTILS.safeUpper(lote.BLOQUEADO) === "S") return { ok: false, message: "Lote bloqueado: " + SGO_UTILS.safe(lote.MOTIVO_BLOQUEIO) };
    if (["BLOQUEADO", "VENCIDO", "ESGOTADO"].indexOf(SGO_UTILS.safeUpper(lote.STATUS)) >= 0) return { ok: false, message: "Lote indisponivel: " + lote.STATUS };
    if (lote.DATA_VALIDADE && dataVencida_(lote.DATA_VALIDADE)) return { ok: false, message: "Nao pode usar lote vencido." };
    if (SGO_UTILS.toNumber(lote.QUANTIDADE_ATUAL, 0) < qtd) return { ok: false, message: "Saldo insuficiente no lote." };
    return { ok: true };
  }

  function criarPecaInstaladaSeNecessario_(item, lote, os, payload, sessao) {
    const instalar = SGO_UTILS.toBoolean(payload.INSTALAR_NO_EQUIPAMENTO) || SGO_UTILS.safe(payload.EQUIPAMENTO_ID || os.EQUIPAMENTO_ID);
    if (!instalar) return null;
    const equipamentoId = SGO_UTILS.safe(payload.EQUIPAMENTO_ID || os.EQUIPAMENTO_ID);
    if (!equipamentoId) return null;

    const peca = SGO_DATA.insert(SHEETS.CAD_PECAS, SGO_DATA.gerarRegistroBase({
      EQUIPAMENTO_ID: equipamentoId,
      CLIENTE_ID: SGO_UTILS.safe(os.CLIENTE_ID),
      UNIDADE_ID: SGO_UTILS.safe(os.UNIDADE_ID),
      NOME: item.DESCRICAO,
      TIPO_PECA: item.TIPO_ITEM,
      FABRICANTE: item.FABRICANTE,
      MODELO: item.MODELO,
      REFERENCIA: item.REFERENCIA,
      NUMERO_SERIE: lote.NUMERO_SERIE,
      LOTE: lote.NUMERO_LOTE,
      DATA_FABRICACAO: lote.DATA_FABRICACAO,
      DATA_INSTALACAO: SGO_UTILS.nowIso(),
      APLICA_CALIBRACAO: item.APLICA_CALIBRACAO,
      ITEM_ESTOQUE_ID: item.ID,
      LOTE_ID: lote.ID,
      FORNECEDOR_ID: lote.FORNECEDOR_ID,
      INSTALADA_OS_ID: os.ID,
      INSTALADA_POR: SGO_UTILS.safe(payload.TECNICO_ID || os.TECNICO_ID || sessao.userId),
      STATUS: "INSTALADA"
    }), DB_MAIN);

    SGO_DATA.insert(SHEETS.HST_PECAS_EQUIPAMENTO, SGO_DATA.gerarRegistroBase({
      PECA_INSTALADA_ID: peca.ID,
      EQUIPAMENTO_ID: equipamentoId,
      OS_ID: os.ID,
      EVENTO: "INSTALACAO",
      DATA_EVENTO: SGO_UTILS.nowIso(),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID || os.TECNICO_ID || sessao.userId),
      DESCRICAO: "Peca instalada via consumo de estoque na OS.",
      STATUS_ANTERIOR: "",
      STATUS_NOVO: "INSTALADA"
    }), DB_MAIN);

    return peca;
  }

  function enriquecerItem_(item) {
    const lotes = SGO_DATA.getManyByField(SHEETS.EST_LOTES, "ITEM_ID", item.ID, DB);
    const saldo = lotes.reduce(function(acc, lote) {
      if (SGO_UTILS.safeUpper(lote.BLOQUEADO) === "S" || dataVencida_(lote.DATA_VALIDADE)) return acc;
      return acc + SGO_UTILS.toNumber(lote.QUANTIDADE_ATUAL, 0);
    }, 0);
    return Object.assign({}, item, {
      SALDO_DISPONIVEL: saldo,
      ESTOQUE_BAIXO: saldo <= SGO_UTILS.toNumber(item.ESTOQUE_MINIMO, 0) ? "S" : "N",
      LOTES_TOTAL: lotes.length
    });
  }

  function validarCamposObrigatoriosLote_(item, lote) {
    if (SGO_UTILS.safeUpper(item.EXIGE_LOTE) === "S" && !lote.NUMERO_LOTE) return { ok: false, message: "Este item exige lote." };
    if (SGO_UTILS.safeUpper(item.EXIGE_SERIE) === "S" && !lote.NUMERO_SERIE) return { ok: false, message: "Este item exige numero de serie." };
    if (SGO_UTILS.safeUpper(item.EXIGE_VALIDADE) === "S" && !lote.DATA_VALIDADE) return { ok: false, message: "Este item exige validade." };
    return { ok: true };
  }

  function registrarMovimento_(dados) {
    SGO_DATA.insert(SHEETS.EST_MOVIMENTACOES, SGO_DATA.gerarRegistroBase(Object.assign({
      DATA_MOVIMENTO: SGO_UTILS.nowIso()
    }, dados || {})), DB);
  }

  function atualizarCustoPecasOS_(osId, incremento) {
    const os = SGO_DATA.getById(SHEETS.OS_ORDENS, osId, DB_OS);
    if (!os) return;
    const custoPecas = SGO_UTILS.toNumber(os.CUSTO_PECAS, 0) + SGO_UTILS.toNumber(incremento, 0);
    const custoTotal = custoPecas + SGO_UTILS.toNumber(os.CUSTO_HORA, 0) + SGO_UTILS.toNumber(os.CUSTO_DESLOCAMENTO, 0);
    SGO_DATA.update(SHEETS.OS_ORDENS, osId, {
      CUSTO_PECAS: custoPecas,
      CUSTO_TOTAL: custoTotal
    }, DB_OS);
  }

  function obterNumeroNF_(nfId) {
    const nf = nfId ? SGO_DATA.getById(SHEETS.EST_NOTAS_FISCAIS, nfId, DB) : null;
    return nf ? nf.NUMERO_NF : "";
  }

  function resolverEntidadeEtiqueta_(etiqueta) {
    const tipo = SGO_UTILS.safeUpper(etiqueta.TIPO_ENTIDADE);
    if (tipo === "ITEM_ESTOQUE") return SGO_DATA.getByField(SHEETS.EST_ITENS, "CODIGO_INTERNO", etiqueta.REFERENCIA_ID, DB) || SGO_DATA.getById(SHEETS.EST_ITENS, etiqueta.REFERENCIA_ID, DB);
    if (tipo === "LOTE_ESTOQUE") return SGO_DATA.getByField(SHEETS.EST_LOTES, "QR_TOKEN", etiqueta.TOKEN, DB);
    return null;
  }

  function gerarCodigoItem_(tipo) {
    return "ITM-" + SGO_UTILS.safeUpper(tipo || "PECA").substring(0, 3) + "-" + Utilities.getUuid().substring(0, 8).toUpperCase();
  }

  function dataVencida_(data) {
    const raw = SGO_UTILS.safe(data);
    if (!raw) return false;
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime() < hoje.getTime();
  }

  return {
    listarItens: listarItens,
    salvarItem: salvarItem,
    registrarNotaFiscal: registrarNotaFiscal,
    registrarEntrada: registrarEntrada,
    consumirItemEmOS: consumirItemEmOS,
    rastrearPorCodigo: rastrearPorCodigo
  };
})();

function estoqueListarItens(sessionId, filtros) { try { return JSON.parse(JSON.stringify(SGO_ESTOQUE.listarItens(sessionId, filtros))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function estoqueSalvarItem(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ESTOQUE.salvarItem(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function estoqueRegistrarNotaFiscal(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ESTOQUE.registrarNotaFiscal(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function estoqueRegistrarEntrada(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ESTOQUE.registrarEntrada(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function estoqueConsumirItemEmOS(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_ESTOQUE.consumirItemEmOS(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
