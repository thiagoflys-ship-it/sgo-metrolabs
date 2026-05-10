const SGO_FORNECEDORES = (() => {
  const DB = "ESTOQUE";
  const SHEETS = SGO_CFG.SHEETS;

  function listar(sessionId, filtros) {
    exigirSessao(sessionId);
    const todos = SGO_DATA.getAll(SHEETS.CAD_FORNECEDORES, DB).map(enriquecerFornecedor_);
    const f = filtros || {};
    const status = SGO_UTILS.safeUpper(f.STATUS);
    const texto = SGO_UTILS.safeLower(f.TEXTO);
    const items = todos.filter(function(item) {
      if (status && SGO_UTILS.safeUpper(item.STATUS) !== status) return false;
      if (texto) {
        const alvo = [item.RAZAO_SOCIAL, item.NOME_FANTASIA, item.CNPJ].join(" ").toLowerCase();
        if (alvo.indexOf(texto) < 0) return false;
      }
      return true;
    });
    return { success: true, items: items };
  }

  function obter(sessionId, id) {
    exigirSessao(sessionId);
    const fornecedor = SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, id, DB);
    if (!fornecedor) return { success: false, message: "Fornecedor nao encontrado." };
    return {
      success: true,
      item: enriquecerFornecedor_(fornecedor),
      documentos: listarDocumentosFornecedor_(id),
      qualificacao: obterQualificacao_(id)
    };
  }

  function salvar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const cnpj = SGO_UTILS.normalizeCnpj(payload.CNPJ);
    if (!payload.ID && cnpj && SGO_DATA.getByField(SHEETS.CAD_FORNECEDORES, "CNPJ", cnpj, DB)) {
      return { success: false, message: "Ja existe fornecedor cadastrado com este CNPJ." };
    }

    const dados = {
      RAZAO_SOCIAL: SGO_UTILS.safe(payload.RAZAO_SOCIAL),
      NOME_FANTASIA: SGO_UTILS.safe(payload.NOME_FANTASIA),
      CNPJ: cnpj,
      INSCRICAO_ESTADUAL: SGO_UTILS.safe(payload.INSCRICAO_ESTADUAL),
      ENDERECO: SGO_UTILS.safe(payload.ENDERECO),
      CIDADE: SGO_UTILS.safe(payload.CIDADE),
      UF: SGO_UTILS.safeUpper(payload.UF),
      CONTATO: SGO_UTILS.safe(payload.CONTATO),
      EMAIL: SGO_UTILS.safeLower(payload.EMAIL),
      TELEFONE: SGO_UTILS.safe(payload.TELEFONE),
      TIPO_FORNECEDOR: SGO_UTILS.safeUpper(payload.TIPO_FORNECEDOR || "PECAS"),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "PENDENTE"),
      BLOQUEADO: SGO_UTILS.toBoolean(payload.BLOQUEADO) ? "S" : "N",
      MOTIVO_BLOQUEIO: SGO_UTILS.safe(payload.MOTIVO_BLOQUEIO),
      DATA_BLOQUEIO: SGO_UTILS.safe(payload.DATA_BLOQUEIO)
    };

    if (!dados.RAZAO_SOCIAL) return { success: false, message: "Informe a razao social." };
    if (dados.EMAIL && !SGO_UTILS.isEmail(dados.EMAIL)) return { success: false, message: "E-mail invalido." };
    if (dados.CNPJ && !SGO_UTILS.isCnpj(dados.CNPJ)) return { success: false, message: "CNPJ invalido." };

    let id = SGO_UTILS.safe(payload.ID);
    if (id) {
      SGO_DATA.update(SHEETS.CAD_FORNECEDORES, id, dados, DB);
    } else {
      const criado = SGO_DATA.insert(SHEETS.CAD_FORNECEDORES, SGO_DATA.gerarRegistroBase(dados), DB);
      id = criado.ID;
    }

    reavaliarQualificacaoFornecedor_(id, sessao.userId || sessao.usuario);
    return { success: true, message: "Fornecedor salvo.", id: id };
  }

  function salvarDocumento(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const fornecedorId = SGO_UTILS.safe(payload.FORNECEDOR_ID);
    if (!fornecedorId) return { success: false, message: "Informe o fornecedor." };
    if (!SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, fornecedorId, DB)) {
      return { success: false, message: "Fornecedor nao encontrado." };
    }

    const dados = {
      FORNECEDOR_ID: fornecedorId,
      TIPO_DOCUMENTO: SGO_UTILS.safeUpper(payload.TIPO_DOCUMENTO),
      NUMERO_DOCUMENTO: SGO_UTILS.safe(payload.NUMERO_DOCUMENTO),
      DATA_EMISSAO: SGO_UTILS.safe(payload.DATA_EMISSAO),
      DATA_VENCIMENTO: SGO_UTILS.safe(payload.DATA_VENCIMENTO),
      LINK_ARQUIVO: SGO_UTILS.safe(payload.LINK_ARQUIVO),
      FILE_ID: SGO_UTILS.safe(payload.FILE_ID),
      HASH_SHA256: SGO_UTILS.safe(payload.HASH_SHA256),
      STATUS: statusDocumento_(payload.DATA_VENCIMENTO),
      VALIDADO_POR: sessao.userId || sessao.usuario,
      VALIDADO_EM: SGO_UTILS.nowIso()
    };

    if (!dados.TIPO_DOCUMENTO) return { success: false, message: "Informe o tipo de documento." };

    if (payload.ID) {
      SGO_DATA.update(SHEETS.FORN_DOCUMENTOS, SGO_UTILS.safe(payload.ID), dados, DB);
    } else {
      SGO_DATA.insert(SHEETS.FORN_DOCUMENTOS, SGO_DATA.gerarRegistroBase(dados), DB);
    }

    reavaliarQualificacaoFornecedor_(fornecedorId, sessao.userId || sessao.usuario);
    return { success: true, message: "Documento registrado." };
  }

  function reavaliarQualificacoes(sessionId) {
    const sessao = exigirSessao(sessionId);
    const fornecedores = SGO_DATA.getAll(SHEETS.CAD_FORNECEDORES, DB);
    fornecedores.forEach(function(f) {
      reavaliarQualificacaoFornecedor_(f.ID, sessao.userId || sessao.usuario);
    });
    return { success: true, total: fornecedores.length };
  }

  function validarFornecedorParaUso(fornecedorId) {
    const id = SGO_UTILS.safe(fornecedorId);
    const fornecedor = SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, id, DB);
    if (!fornecedor) return { ok: false, message: "Fornecedor nao encontrado." };
    if (SGO_UTILS.safeUpper(fornecedor.BLOQUEADO) === "S" || SGO_UTILS.safeUpper(fornecedor.STATUS) === "BLOQUEADO") {
      return { ok: false, message: "Fornecedor bloqueado: " + SGO_UTILS.safe(fornecedor.MOTIVO_BLOQUEIO) };
    }
    const qual = obterQualificacao_(id);
    if (!qual || SGO_UTILS.safeUpper(qual.STATUS_QUALIFICACAO) !== "QUALIFICADO") {
      return { ok: false, message: "Fornecedor sem qualificacao valida." };
    }
    return { ok: true, fornecedor: fornecedor, qualificacao: qual };
  }

  function reavaliarQualificacaoFornecedor_(fornecedorId, responsavelId) {
    const fornecedor = SGO_DATA.getById(SHEETS.CAD_FORNECEDORES, fornecedorId, DB);
    if (!fornecedor) return null;

    const docs = listarDocumentosFornecedor_(fornecedorId);
    const obrigatorios = SGO_CFG.FORNECEDORES.DOCUMENTOS_OBRIGATORIOS || [];
    const porTipo = {};
    docs.forEach(function(doc) {
      const tipo = SGO_UTILS.safeUpper(doc.TIPO_DOCUMENTO);
      if (!porTipo[tipo] || new Date(doc.DATA_VENCIMENTO || "2999-12-31") > new Date(porTipo[tipo].DATA_VENCIMENTO || "1900-01-01")) {
        porTipo[tipo] = doc;
      }
    });

    const vencidos = docs.filter(function(doc) { return statusDocumento_(doc.DATA_VENCIMENTO) === "VENCIDO"; });
    const faltantes = obrigatorios.filter(function(tipo) {
      const doc = porTipo[SGO_UTILS.safeUpper(tipo)];
      return !doc || statusDocumento_(doc.DATA_VENCIMENTO) === "VENCIDO";
    });

    const alvaraOk = faltantes.indexOf("ALVARA") < 0 ? "S" : "N";
    const anvisaOk = faltantes.indexOf("ANVISA") < 0 ? "S" : "N";
    const documentosOk = faltantes.length === 0 && vencidos.length === 0 ? "S" : "N";
    const status = documentosOk === "S" ? "QUALIFICADO" : (vencidos.length ? "VENCIDO" : "PENDENTE");
    const deveBloquear = status !== "QUALIFICADO";
    const motivo = deveBloquear ? "Qualificacao pendente/vencida: " + faltantes.concat(vencidos.map(function(d) { return d.TIPO_DOCUMENTO; })).join(", ") : "";

    const qualData = {
      FORNECEDOR_ID: fornecedorId,
      STATUS_QUALIFICACAO: deveBloquear ? "BLOQUEADO" : status,
      ALVARA_OK: alvaraOk,
      ANVISA_OK: anvisaOk,
      ISO_OK: porTipo.ISO ? "S" : "N",
      DOCUMENTOS_OK: documentosOk,
      DATA_ULTIMA_ANALISE: SGO_UTILS.nowIso(),
      RESPONSAVEL_ID: SGO_UTILS.safe(responsavelId),
      OBSERVACOES: motivo
    };

    const existente = obterQualificacao_(fornecedorId);
    if (existente) {
      SGO_DATA.update(SHEETS.FORN_QUALIFICACAO, existente.ID, qualData, DB);
    } else {
      SGO_DATA.insert(SHEETS.FORN_QUALIFICACAO, SGO_DATA.gerarRegistroBase(qualData), DB);
    }

    SGO_DATA.update(SHEETS.CAD_FORNECEDORES, fornecedorId, {
      STATUS: deveBloquear ? "BLOQUEADO" : "ATIVO",
      BLOQUEADO: deveBloquear ? "S" : "N",
      MOTIVO_BLOQUEIO: motivo,
      DATA_BLOQUEIO: deveBloquear ? SGO_UTILS.nowIso() : ""
    }, DB);

    return qualData;
  }

  function enriquecerFornecedor_(fornecedor) {
    const qual = obterQualificacao_(fornecedor.ID);
    return Object.assign({}, fornecedor, {
      QUALIFICACAO_STATUS: qual ? qual.STATUS_QUALIFICACAO : "PENDENTE",
      DOCUMENTOS_TOTAL: listarDocumentosFornecedor_(fornecedor.ID).length
    });
  }

  function listarDocumentosFornecedor_(fornecedorId) {
    return SGO_DATA.getManyByField(SHEETS.FORN_DOCUMENTOS, "FORNECEDOR_ID", SGO_UTILS.safe(fornecedorId), DB);
  }

  function obterQualificacao_(fornecedorId) {
    return SGO_DATA.getByField(SHEETS.FORN_QUALIFICACAO, "FORNECEDOR_ID", SGO_UTILS.safe(fornecedorId), DB);
  }

  function statusDocumento_(dataVencimento) {
    const raw = SGO_UTILS.safe(dataVencimento);
    if (!raw) return "SEM_VALIDADE";
    const venc = new Date(raw);
    if (isNaN(venc.getTime())) return "VALIDADE_INVALIDA";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    return venc.getTime() < hoje.getTime() ? "VENCIDO" : "VALIDO";
  }

  return {
    listar: listar,
    obter: obter,
    salvar: salvar,
    salvarDocumento: salvarDocumento,
    reavaliarQualificacoes: reavaliarQualificacoes,
    validarFornecedorParaUso: validarFornecedorParaUso
  };
})();

function fornecedoresListar(sessionId, filtros) { try { return JSON.parse(JSON.stringify(SGO_FORNECEDORES.listar(sessionId, filtros))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function fornecedoresObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_FORNECEDORES.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function fornecedoresSalvar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FORNECEDORES.salvar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function fornecedoresSalvarDocumento(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_FORNECEDORES.salvarDocumento(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function fornecedoresReavaliarQualificacoes(sessionId) { try { return JSON.parse(JSON.stringify(SGO_FORNECEDORES.reavaliarQualificacoes(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
