/**
 * ============================================================
 * METROLABS — CARTA DE CONFORMIDADE / RELATÓRIO TÉCNICO
 * ARQUIVO: Codigo.gs
 * PROJETO: NOVO — V2.0 PROFISSIONAL
 *
 * FUNÇÃO:
 * - WebApp principal.
 * - Bootstrap do frontend com perfis de equipamento.
 * - Consulta CNPJ.
 * - Funções centrais de banco, IDs, validação e persistência.
 * - Validação ANTES de gerar PDF/salvar.
 * - Compatível com Config V2, Documento V2, IA V2 e Motor V2.
 *
 * REGRA:
 * Este arquivo não decide regra técnica de equipamento sozinho.
 * Ele sempre consulta CFG.PERFIS_EQUIPAMENTO.
 * ============================================================
 */

/**
 * ============================================================
 * WEB APP
 * ============================================================
 */

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const codigoValidacao = normalizarTexto_(params.validar || params.codigo || "");

  if (codigoValidacao) {
    const tpl = HtmlService.createTemplateFromFile("Validador");
    tpl.CODIGO_VALIDACAO = sanitizarHtml_(codigoValidacao);
    tpl.APP_NOME = obterPropertyOuConfig_("APP_NOME", CFG.APP.NOME);

    return tpl.evaluate()
      .setTitle("Validação de Documento - " + CFG.APP.NOME)
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const tpl = HtmlService.createTemplateFromFile("Index");
  tpl.APP_NOME = obterPropertyOuConfig_("APP_NOME", CFG.APP.NOME);

  return tpl.evaluate()
    .setTitle(CFG.APP.NOME)
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/**
 * ============================================================
 * PILOTO -- Proxy JSON para integração nativa no Portal SGO+
 * CNPJ/DB (sem iframe). Roteador simples: apenas repassa para
 * as funções já existentes neste projeto, sem alterar nenhuma
 * regra de Config.js, Motor_Auditoria.js, Documento.js, IA.js
 * ou Validacao.js.
 * ============================================================
 */
function doPost(e) {
  let resultado;

  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const payload = body.payload;

    if (action === 'bootstrap') {
      resultado = getAppBootstrap();
    } else if (action === 'buscarCnpj') {
      resultado = buscarCnpjBackend(payload);
    } else if (action === 'validarPayload') {
      resultado = validarPayloadAntesDeGerar(payload);
    } else if (action === 'auditar') {
      resultado = auditarQualificacao(payload);
    } else if (action === 'gerarDocumento') {
      resultado = gerarCartaConformidade(payload);
    } else if (action === 'salvarRelatorio') {
      resultado = salvarRegistroRelatorio(payload);
    } else if (action === 'refinarIA') {
      resultado = refinarPayloadConclusaoIA(payload);
    } else if (action === 'pesquisarDocumentos') {
      resultado = pesquisarDocumentosGerados(payload);
    } else {
      resultado = { ok: false, mensagem: 'Ação desconhecida: ' + action };
    }
  } catch (err) {
    resultado = {
      ok: false,
      mensagem: err && err.message ? err.message : String(err)
    };
  }

  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================
 * BOOTSTRAP DO FRONTEND
 * ============================================================
 */

function getAppBootstrap() {
  const props = PropertiesService.getScriptProperties();

  return {
    ok: true,
    appNome: props.getProperty("APP_NOME") || CFG.APP.NOME,
    versao: props.getProperty("APP_VERSAO") || CFG.APP.VERSAO,
    modulo: props.getProperty("APP_MODULO") || CFG.APP.MODULO,

    empresa: {
      nome: props.getProperty("EMPRESA_NOME") || CFG.EMPRESA.NOME,
      cnpj: props.getProperty("EMPRESA_CNPJ") || CFG.EMPRESA.CNPJ,
      endereco: props.getProperty("EMPRESA_ENDERECO") || CFG.EMPRESA.ENDERECO,
      responsavelTecnico: props.getProperty("RESPONSAVEL_TECNICO") || CFG.EMPRESA.RESPONSAVEL_TECNICO,
      crea: props.getProperty("EMPRESA_CREA") || CFG.EMPRESA.CREA
    },

    textosGerais: CFG.TEXTOS_GERAIS || {},
    whatsappMsg: props.getProperty("WHATSAPP_MSG") || (CFG.WHATSAPP && CFG.WHATSAPP.MENSAGEM_PADRAO) || "",

    familias: CFG.FAMILIAS || {},
    qualificacoes: CFG.QUALIFICACOES || {},
    statusAvaliacao: CFG.STATUS_AVALIACAO || [],

    tiposEquipamento: getListaTiposEquipamento_(),
    perfisEquipamento: CFG.PERFIS_EQUIPAMENTO || {},

    pdf: CFG.PDF || {},
    appUrl: obterAppUrl_()
  };
}

function getPerfilEquipamentoPublico(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  if (!perfil) {
    return { ok: false, mensagem: "Perfil de equipamento não localizado." };
  }

  return {
    ok: true,
    perfil: clonarJson_(perfil)
  };
}

/**
 * ============================================================
 * CONSULTA CNPJ
 * ============================================================
 */

function autorizarConsultaCnpj() {
  const cnpjTeste = (CFG && CFG.EMPRESA && CFG.EMPRESA.CNPJ) ? CFG.EMPRESA.CNPJ : "32487278000121";
  return buscarCnpjBackend(cnpjTeste);
}

function buscarCnpjBackend(cnpj) {
  try {
    const cnpjLimpo = limparCnpj_(cnpj);

    if (cnpjLimpo.length !== 14) {
      return { ok: false, mensagem: "CNPJ inválido. Informe os 14 dígitos." };
    }

    // Várias bases públicas com reserva + cache (SGO_CnpjConsulta.js);
    // a base antiga (consultarSpeedioCnpj_) fica como última reserva.
    const principal = consultarBrasilApiCnpj_(cnpjLimpo);
    if (principal.ok) return principal;
    if (principal.invalido) return principal;

    const speedio = consultarSpeedioCnpj_(cnpjLimpo);
    if (speedio.ok) return speedio;

    return {
      ok: false,
      mensagem: principal.mensagem || "Nenhuma base pública conseguiu localizar este CNPJ automaticamente."
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao consultar CNPJ: " + obterMensagemErro_(e)
    };
  }
}

// Nome mantido por compatibilidade; agora usa a consulta com reserva entre
// várias bases públicas (SGO_CNPJ_consultarDados_, formato BrasilAPI).
function consultarBrasilApiCnpj_(cnpjLimpo) {
  try {
    try {
      SGO_CNPJ_validar_(cnpjLimpo);
    } catch (eValida) {
      return { ok: false, invalido: true, mensagem: SGO_CNPJ_mensagemErro_(eValida) };
    }
    const json = SGO_CNPJ_consultarDados_(cnpjLimpo);

    return {
      ok: true,
      fonte: "consulta pública",
      cnpj: cnpjLimpo,
      razaoSocial: formatarRazaoSocial_(json.razao_social),
      nomeFantasia: formatarTexto_(json.nome_fantasia || ""),
      logradouro: montarLogradouroBrasilApi_(json),
      numero: normalizarTexto_(json.numero || ""),
      complemento: formatarTexto_(json.complemento || ""),
      bairro: formatarTexto_(json.bairro || ""),
      cidade: formatarTexto_(json.municipio || ""),
      uf: normalizarTexto_(json.uf || "").toUpperCase(),
      cep: normalizarTexto_(json.cep || ""),
      telefone: normalizarTexto_(json.ddd_telefone_1 || json.ddd_telefone_2 || ""),
      email: normalizarTexto_(json.email || "")
    };
  } catch (e) {
    return { ok: false, mensagem: SGO_CNPJ_mensagemErro_(e) };
  }
}

function consultarSpeedioCnpj_(cnpjLimpo) {
  try {
    const url = "https://api-publica.speedio.com.br/buscarcnpj?cnpj=" + encodeURIComponent(cnpjLimpo);
    const resp = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "Accept": "application/json" }
    });

    const status = resp.getResponseCode();
    if (status < 200 || status >= 300) {
      return { ok: false, mensagem: "Speedio indisponível." };
    }

    const json = JSON.parse(resp.getContentText() || "{}");
    if (!json || !json.RAZAO_SOCIAL) {
      return { ok: false, mensagem: "Speedio sem dados válidos." };
    }

    return {
      ok: true,
      fonte: "Speedio",
      cnpj: cnpjLimpo,
      razaoSocial: formatarRazaoSocial_(json.RAZAO_SOCIAL),
      nomeFantasia: formatarTexto_(json.NOME_FANTASIA || ""),
      logradouro: formatarLogradouro_(json.LOGRADOURO || ""),
      numero: normalizarTexto_(json.NUMERO || ""),
      complemento: formatarTexto_(json.COMPLEMENTO || ""),
      bairro: formatarTexto_(json.BAIRRO || ""),
      cidade: formatarTexto_(json.MUNICIPIO || ""),
      uf: normalizarTexto_(json.UF || "").toUpperCase(),
      cep: normalizarTexto_(json.CEP || ""),
      telefone: normalizarTexto_(json.TELEFONE || ""),
      email: normalizarTexto_(json.EMAIL || "")
    };
  } catch (e) {
    return { ok: false, mensagem: "Falha Speedio: " + obterMensagemErro_(e) };
  }
}

function montarLogradouroBrasilApi_(json) {
  const tipo = formatarTipoLogradouro_(json.descricao_tipo_de_logradouro || "");
  const logradouro = formatarLogradouro_(json.logradouro || "");
  return [tipo, logradouro].filter(Boolean).join(" ").trim();
}

/**
 * ============================================================
 * VALIDAÇÃO CENTRAL ANTES DE GERAR DOCUMENTO
 * ============================================================
 */

function validarPayloadAntesDeGerar(dados) {
  try {
    const payload = normalizarPayloadBase_(dados);
    const erros = [];

    if (!payload.cliente.cnpj || limparCnpj_(payload.cliente.cnpj).length !== 14) {
      erros.push("Cliente: informe um CNPJ válido.");
    }

    if (!payload.cliente.razaoSocial) {
      erros.push("Cliente: informe a razão social.");
    }

    if (!payload.equipamento.tipoCodigo) {
      erros.push("Equipamento: tipo técnico não informado.");
    }

    if (!payload.equipamento.tipoNome) {
      erros.push("Equipamento: nome do tipo não informado.");
    }

    if (!payload.perfil) {
      erros.push("Equipamento: perfil técnico não localizado no Config.gs.");
    }

    if (!payload.equipamento.marca) {
      erros.push("Equipamento: informe a marca.");
    }

    if (!payload.equipamento.modelo) {
      erros.push("Equipamento: informe o modelo.");
    }

    if (!payload.equipamento.numeroSerie) {
      erros.push("Equipamento: informe o número de série.");
    }

    if (!payload.statusFinal) {
      erros.push("Parecer técnico: informe o status final.");
    }

    if (payload.perfil) {
      validarEscopoPorPerfil_(payload, erros);
      validarDadosPorPerfil_(payload, erros);
    }

    return {
      ok: erros.length === 0,
      erros: erros,
      mensagem: erros.length ? erros.join("\n") : "Payload validado com sucesso.",
      payload: payload
    };
  } catch (e) {
    return {
      ok: false,
      erros: [obterMensagemErro_(e)],
      mensagem: obterMensagemErro_(e)
    };
  }
}

function validarEscopoPorPerfil_(payload, erros) {
  const perfil = payload.perfil;
  const escopo = payload.escopo || {};

  if (perfil.usaQI || perfil.usaQO || perfil.usaQD) {
    const algum = (!!escopo.qi && !!perfil.usaQI) || (!!escopo.qo && !!perfil.usaQO) || (!!escopo.qd && !!perfil.usaQD);
    if (!algum) {
      erros.push("Escopo: selecione pelo menos uma etapa aplicável ao equipamento.");
    }
  }

  if (perfil.usaInspecaoNR13 && !escopo.inspecao) {
    erros.push("Escopo NR-13: marque a inspeção técnica para este tipo de equipamento.");
  }

  if (!perfil.usaQO && escopo.qo) {
    erros.push("Escopo: QO não se aplica ao equipamento selecionado.");
  }

  if (!perfil.usaQI && escopo.qi) {
    erros.push("Escopo: QI não se aplica ao equipamento selecionado.");
  }

  if (!perfil.usaQD && escopo.qd) {
    erros.push("Escopo: QD não se aplica ao equipamento selecionado.");
  }
}

function validarDadosPorPerfil_(payload, erros) {
  const perfil = payload.perfil;

  if (perfil.usaReceitas && (payload.escopo.qo || payload.escopo.qd)) {
    if (!payload.receitas || !payload.receitas.length) {
      erros.push("Receitas/Ciclos: informe ao menos uma receita ou programa para QO/QD.");
    }
  }

  if (!perfil.usaReceitas && payload.receitas && payload.receitas.length) {
    erros.push("Receitas/Ciclos: o equipamento selecionado não utiliza receitas ou ciclos neste relatório.");
  }

  if (!perfil.usaInsumos && payload.insumos && payload.insumos.length) {
    erros.push("Insumos: o equipamento selecionado não utiliza BI, IQ, integradores ou testes rastreáveis.");
  }

  if (perfil.usaInsumos && (payload.escopo.qo || payload.escopo.qd)) {
    const obrigatorios = obterInsumosObrigatoriosParaPayload_(payload);
    obrigatorios.forEach(function(insumoPerfil) {
      const achado = payload.insumos.some(function(i) {
        return String(i.codigo || "") === String(insumoPerfil.codigo || "") ||
               String(i.nome || "").toUpperCase() === String(insumoPerfil.nome || "").toUpperCase();
      });

      if (!achado) {
        erros.push("Insumos: informe lote e validade para " + insumoPerfil.nome + ".");
      }
    });
  }

  if (perfil.usaEnsaiosTermicos) {
    if (!payload.ensaios || !payload.ensaios.length) {
      erros.push("Ensaios térmicos: informe ao menos um ensaio aplicável.");
    }
  }

  if (perfil.usaEnsaiosGerais) {
    if (!payload.ensaios || !payload.ensaios.length) {
      erros.push("Ensaios técnicos: informe ao menos um ensaio aplicável.");
    }
  }

  if (perfil.usaInspecaoNR13) {
    if (!payload.nr13 || !payload.nr13.ensaios || !payload.nr13.ensaios.length) {
      erros.push("NR-13: informe ao menos um ensaio/inspeção realizada.");
    }
  }
}

function obterInsumosObrigatoriosParaPayload_(payload) {
  const perfil = payload.perfil;
  const insumos = Array.isArray(perfil.insumos) ? perfil.insumos : [];
  const escopo = payload.escopo || {};
  const receitas = (payload.receitas || []).map(function(r) {
    return normalizarChave_(r.nome || r);
  });

  return insumos.filter(function(insumo) {
    if (Array.isArray(insumo.obrigatorioQuando)) {
      if (escopo.qo && insumo.obrigatorioQuando.indexOf("QO") >= 0) return true;
      if (escopo.qd && insumo.obrigatorioQuando.indexOf("QD") >= 0) return true;
    }

    if (Array.isArray(insumo.obrigatorioQuandoReceita)) {
      return insumo.obrigatorioQuandoReceita.some(function(receita) {
        return receitas.indexOf(normalizarChave_(receita)) >= 0;
      });
    }

    return false;
  });
}

/**
 * ============================================================
 * NORMALIZAÇÃO DE PAYLOAD
 * ============================================================
 */

function normalizarPayloadBase_(dados) {
  if (!dados || typeof dados !== "object") {
    throw new Error("Dados não informados.");
  }

  const cliente = dados.cliente || {};
  const equipamento = dados.equipamento || {};
  const escopoBruto = dados.escopo || dados.servicos || {};

  const tipoCodigo = normalizarTexto_(equipamento.tipoCodigo || dados.tipoCodigo || dados.tipoEquipamentoCodigo || "");
  const perfil = getPerfilEquipamento_(tipoCodigo);
  const tipoNome = normalizarTexto_(equipamento.tipoNome || equipamento.tipo || dados.tipoEquipamento || (perfil && perfil.nome) || "");

  const escopo = {
    qi: !!(escopoBruto.qi || dados.qi),
    qo: !!(escopoBruto.qo || dados.qo),
    qd: !!(escopoBruto.qd || dados.qd),
    inspecao: !!(escopoBruto.inspecao || escopoBruto.nr13 || dados.inspecao || dados.nr13)
  };

  const receitas = normalizarListaNome_(dados.receitas || dados.receitas_qualificadas || []);
  const ensaios = normalizarListaEnsaios_(dados.ensaios || dados.ensaiosTermicos || dados.ensaiosGerais || []);
  const insumos = normalizarListaInsumos_(dados.insumos || dados.insumosPreenchidos || dados.insumos_utilizados || []);
  const nr13 = normalizarNr13_(dados.nr13 || dados.inspecaoNR13 || {});

  return {
    cliente: {
      cnpj: normalizarTexto_(cliente.cnpj || ""),
      razaoSocial: formatarRazaoSocial_(cliente.razaoSocial || cliente.nome || ""),
      nomeFantasia: formatarTexto_(cliente.nomeFantasia || ""),
      logradouro: formatarLogradouro_(cliente.logradouro || ""),
      numero: normalizarTexto_(cliente.numero || ""),
      complemento: formatarTexto_(cliente.complemento || ""),
      bairro: formatarTexto_(cliente.bairro || ""),
      cidade: formatarTexto_(cliente.cidade || ""),
      uf: normalizarTexto_(cliente.uf || "").toUpperCase(),
      cep: normalizarTexto_(cliente.cep || ""),
      responsavel: formatarTexto_(cliente.responsavel || ""),
      telefone: normalizarTexto_(cliente.telefone || ""),
      email: normalizarTexto_(cliente.email || "")
    },

    equipamento: {
      tipoCodigo: tipoCodigo,
      tipoNome: tipoNome,
      familia: perfil ? perfil.familia : "",
      marca: formatarTexto_(equipamento.marca || ""),
      modelo: formatarModelo_(equipamento.modelo || ""),
      numeroSerie: normalizarTexto_(equipamento.numeroSerie || equipamento.serie || ""),
      tag: normalizarTexto_(equipamento.tag || equipamento.patrimonio || ""),
      patrimonio: normalizarTexto_(equipamento.patrimonio || equipamento.tag || ""),
      capacidadeLitros: normalizarTexto_(equipamento.capacidadeLitros || equipamento.capacidade || equipamento.volume || ""),
      setor: formatarTexto_(equipamento.setor || cliente.setor || ""),
      localInstalacao: formatarTexto_(equipamento.localInstalacao || equipamento.local || ""),
      faixaMin: normalizarTexto_(equipamento.faixaMin || ""),
      faixaMax: normalizarTexto_(equipamento.faixaMax || ""),
      pmta: normalizarTexto_(equipamento.pmta || ""),
      volume: normalizarTexto_(equipamento.volume || ""),
      categoriaNR13: normalizarTexto_(equipamento.categoriaNR13 || ""),
      classeFiltro: normalizarTexto_(equipamento.classeFiltro || ""),
      rotacaoMaxima: normalizarTexto_(equipamento.rotacaoMaxima || ""),
      temperaturaTrabalho: normalizarTexto_(equipamento.temperaturaTrabalho || ""),
      tipoGas: normalizarTexto_(equipamento.tipoGas || ""),
      sistemaExaustao: normalizarTexto_(equipamento.sistemaExaustao || "")
    },

    perfil: perfil ? clonarJson_(perfil) : null,
    escopo: escopo,
    statusFinal: normalizarStatus_(dados.statusFinal || dados.status_final || dados.statusManual || ""),
    textoConclusao: normalizarTexto_(dados.textoConclusao || dados.texto_conclusao || ""),
    receitas: receitas,
    ensaios: ensaios,
    insumos: insumos,
    nr13: nr13,
    obsGerais: normalizarTexto_(dados.obsGerais || dados.obs_gerais || ""),
    responsavelExecucao: formatarTexto_(dados.responsavelExecucao || dados.responsavel_execucao || ""),
    dataExecucao: normalizarTexto_(dados.dataExecucao || dados.data_execucao || ""),
    osNumero: normalizarTexto_(dados.osNumero || dados.os_numero || ""),
    codigoValidacao: normalizarTexto_(dados.codigoValidacao || dados.codigo_validacao || ""),
    urlValidacao: normalizarTexto_(dados.urlValidacao || dados.url_validacao || ""),
    urlPdf: normalizarTexto_(dados.urlPdf || dados.url_pdf || "")
  };
}

function normalizarListaNome_(lista) {
  if (!Array.isArray(lista)) return [];

  const out = [];
  const seen = {};

  lista.forEach(function(item) {
    const nome = typeof item === "string"
      ? item
      : (item && (item.nome || item.nomeReceita || item.nome_receita || item.receita || item.programa)) || "";

    const n = formatarTexto_(nome);
    const k = normalizarChave_(n);
    if (n && !seen[k]) {
      seen[k] = true;
      out.push({ nome: n });
    }
  });

  return out;
}

function normalizarListaEnsaios_(lista) {
  if (!Array.isArray(lista)) return [];

  return lista.map(function(item) {
    if (typeof item === "string") {
      return { nome: formatarTexto_(item), resultado: "", obs: "" };
    }

    return {
      nome: formatarTexto_(item.nome || item.ensaio || ""),
      resultado: normalizarStatus_(item.resultado || ""),
      dataInicio: normalizarTexto_(item.dataInicio || item.data_inicio || ""),
      horaInicio: normalizarTexto_(item.horaInicio || item.hora_inicio || ""),
      dataFim: normalizarTexto_(item.dataFim || item.data_fim || ""),
      horaFim: normalizarTexto_(item.horaFim || item.hora_fim || ""),
      faixaMin: normalizarTexto_(item.faixaMin || ""),
      faixaMax: normalizarTexto_(item.faixaMax || ""),
      tempMin: normalizarTexto_(item.tempMin || ""),
      tempMax: normalizarTexto_(item.tempMax || ""),
      tempMedia: normalizarTexto_(item.tempMedia || ""),
      excursao: normalizarTexto_(item.excursao || item.excursoes || ""),
      obs: normalizarTexto_(item.obs || item.observacoes || "")
    };
  }).filter(function(x) { return x.nome; });
}

function normalizarListaInsumos_(entrada) {
  const lista = [];

  if (Array.isArray(entrada)) {
    entrada.forEach(function(item) {
      lista.push({
        codigo: normalizarTexto_(item.codigo || item.insumoCodigo || ""),
        nome: formatarTexto_(item.nome || item.insumo || item.nome_teste || ""),
        lote: normalizarTexto_(item.lote || ""),
        validade: normalizarTexto_(item.validade || ""),
        fabricante: formatarTexto_(item.fabricante || ""),
        resultado: normalizarStatus_(item.resultado || ""),
        obs: normalizarTexto_(item.obs || item.observacoes || "")
      });
    });
  } else if (entrada && typeof entrada === "object") {
    Object.keys(entrada).forEach(function(nome) {
      const item = entrada[nome] || {};
      lista.push({
        codigo: normalizarTexto_(item.codigo || ""),
        nome: formatarTexto_(item.nome || nome),
        lote: normalizarTexto_(item.lote || ""),
        validade: normalizarTexto_(item.validade || ""),
        fabricante: formatarTexto_(item.fabricante || ""),
        resultado: normalizarStatus_(item.resultado || ""),
        obs: normalizarTexto_(item.obs || item.observacoes || "")
      });
    });
  }

  return lista.filter(function(i) {
    return i.nome && (i.lote || i.validade || i.resultado || i.codigo);
  });
}

function normalizarNr13_(entrada) {
  const nr = entrada || {};
  const ensaios = Array.isArray(nr.ensaios) ? nr.ensaios : [];

  return {
    pmta: normalizarTexto_(nr.pmta || ""),
    volume: normalizarTexto_(nr.volume || ""),
    categoriaNR13: normalizarTexto_(nr.categoriaNR13 || ""),
    ensaios: ensaios.map(function(e) {
      return {
        nome: formatarTexto_(e.nome || e.ensaio || ""),
        pressaoTeste: normalizarTexto_(e.pressaoTeste || ""),
        tempoTeste: normalizarTexto_(e.tempoTeste || ""),
        resultado: normalizarStatus_(e.resultado || ""),
        obs: normalizarTexto_(e.obs || "")
      };
    }).filter(function(e) { return e.nome; })
  };
}

/**
 * ============================================================
 * CADASTRO / PERSISTÊNCIA
 * ============================================================
 */

function salvarCliente(dadosCliente) {
  try {
    const cliente = normalizarPayloadBase_({ cliente: dadosCliente, equipamento: { tipoCodigo: "AUTOCLAVE_VAPOR", tipoNome: "Autoclave a Vapor", marca: "N/A", modelo: "N/A", numeroSerie: "N/A" }, statusFinal: "Pendente" }).cliente;

    if (!cliente.cnpj || limparCnpj_(cliente.cnpj).length !== 14) {
      throw new Error("Cliente: CNPJ inválido.");
    }
    if (!cliente.razaoSocial) {
      throw new Error("Cliente: razão social não informada.");
    }

    const db = getDB_();
    const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.CLIENTES, "clientes");

    const cnpjLimpo = limparCnpj_(cliente.cnpj);
    const existente = localizarPrimeiroRegistroPorColuna_(aba, 3, cnpjLimpo);
    if (existente) {
      return { ok: true, clienteId: String(existente[0] || ""), jaExistia: true };
    }

    const id = gerarIdPadrao_("CLIENTE");
    aba.appendRow([
      id,
      agoraFmt_(),
      cnpjLimpo,
      cliente.razaoSocial,
      cliente.nomeFantasia,
      cliente.logradouro,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.uf,
      cliente.cep,
      cliente.responsavel,
      cliente.telefone,
      cliente.email,
      ""
    ]);

    return { ok: true, clienteId: id, jaExistia: false };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar cliente: " + obterMensagemErro_(e) };
  }
}

function salvarEquipamento(dadosEquipamento, clienteId) {
  try {
    const tipoCodigo = normalizarTexto_(dadosEquipamento.tipoCodigo || "");
    const perfil = getPerfilEquipamento_(tipoCodigo);
    if (!perfil) throw new Error("Perfil de equipamento inválido.");

    const eq = normalizarPayloadBase_({
      cliente: { cnpj: "00000000000000", razaoSocial: "TEMP" },
      equipamento: dadosEquipamento,
      statusFinal: "Pendente"
    }).equipamento;

    if (!clienteId) throw new Error("clienteId ausente.");
    if (!eq.numeroSerie) throw new Error("Número de série ausente.");

    const db = getDB_();
    const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.EQUIPAMENTOS, "equipamentos");

    const existente = localizarEquipamentoExistente_(aba, clienteId, eq.tipoCodigo, eq.numeroSerie);
    if (existente) {
      return { ok: true, equipamentoId: String(existente[0] || ""), jaExistia: true };
    }

    const id = gerarIdPadrao_("EQUIPAMENTO");
    aba.appendRow([
      id,
      agoraFmt_(),
      clienteId,
      eq.tipoCodigo,
      eq.tipoNome,
      eq.familia,
      eq.marca,
      eq.modelo,
      eq.numeroSerie,
      eq.tag,
      eq.patrimonio,
      eq.capacidadeLitros,
      eq.setor,
      eq.localInstalacao,
      eq.faixaMin,
      eq.faixaMax,
      eq.pmta,
      eq.volume,
      eq.categoriaNR13,
      eq.classeFiltro,
      eq.rotacaoMaxima,
      eq.temperaturaTrabalho,
      eq.tipoGas,
      eq.sistemaExaustao,
      ""
    ]);

    return { ok: true, equipamentoId: id, jaExistia: false };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar equipamento: " + obterMensagemErro_(e) };
  }
}

function localizarEquipamentoExistente_(aba, clienteId, tipoCodigo, numeroSerie) {
  const last = aba.getLastRow();
  if (last <= 1) return null;

  const valores = aba.getRange(2, 1, last - 1, aba.getLastColumn()).getValues();
  const serieBusca = normalizarChave_(numeroSerie);

  for (var i = 0; i < valores.length; i++) {
    const linha = valores[i];
    if (
      normalizarTexto_(linha[2]) === normalizarTexto_(clienteId) &&
      normalizarTexto_(linha[3]) === normalizarTexto_(tipoCodigo) &&
      normalizarChave_(linha[8]) === serieBusca
    ) {
      return linha;
    }
  }

  return null;
}

/**
 * Salva relatório já gerado.
 * Esta função será chamada depois da auditoria e depois da geração do PDF.
 */
function salvarRegistroRelatorio(dados) {
  try {
    const validacao = validarPayloadAntesDeGerar(dados);
    if (!validacao.ok) {
      throw new Error(validacao.mensagem);
    }

    const payload = validacao.payload;

    const clienteRes = salvarCliente(payload.cliente);
    if (!clienteRes.ok) throw new Error(clienteRes.mensagem);

    const equipamentoRes = salvarEquipamento(payload.equipamento, clienteRes.clienteId);
    if (!equipamentoRes.ok) throw new Error(equipamentoRes.mensagem);

    const relatorioId = normalizarTexto_(dados.relatorioId || dados.relatorio_id || gerarIdPadrao_("RELATORIO"));
    const execucaoId = normalizarTexto_(dados.execucaoId || dados.execucao_id || gerarIdPadrao_("EXECUCAO"));
    const codigoValidacao = normalizarTexto_(payload.codigoValidacao || gerarCodigoAutenticacao_(payload)).toUpperCase();
    const urlValidacao = normalizarTexto_(payload.urlValidacao || montarUrlValidacao_(codigoValidacao));
    const osNumero = normalizarTexto_(payload.osNumero || gerarNumeroOs_(payload));

    const db = getDB_();

    const abaExec = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.EXECUCOES, "execuções");
    abaExec.appendRow([
      execucaoId,
      agoraFmt_(),
      clienteRes.clienteId,
      equipamentoRes.equipamentoId,
      payload.equipamento.tipoCodigo,
      payload.equipamento.tipoNome,
      payload.equipamento.familia,
      payload.dataExecucao,
      payload.responsavelExecucao,
      osNumero,
      JSON.stringify(payload.escopo || {}),
      payload.obsGerais
    ]);

    const abaRel = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.RELATORIOS, "relatórios");
    abaRel.appendRow([
      relatorioId,
      agoraFmt_(),
      execucaoId,
      clienteRes.clienteId,
      equipamentoRes.equipamentoId,
      payload.equipamento.tipoCodigo,
      payload.equipamento.tipoNome,
      payload.equipamento.familia,
      payload.statusFinal,
      payload.escopo.qi ? "APROVADO" : "N/A",
      payload.escopo.qo ? "APROVADO" : "N/A",
      payload.escopo.qd ? "APROVADO" : "N/A",
      payload.escopo.inspecao ? "APROVADO" : "N/A",
      JSON.stringify(payload),
      JSON.stringify(dados.auditoria || {}),
      payload.textoConclusao,
      payload.urlPdf,
      normalizarTexto_(dados.urlDoc || dados.url_doc || ""),
      codigoValidacao,
      urlValidacao,
      osNumero,
      payload.cliente.razaoSocial,
      limparCnpj_(payload.cliente.cnpj),
      payload.equipamento.numeroSerie
    ]);

    salvarDocumentoIndexado_(db, {
      clienteId: clienteRes.clienteId,
      equipamentoId: equipamentoRes.equipamentoId,
      relatorioId: relatorioId,
      tipoDocumento: "CARTA_CONFORMIDADE_PDF",
      nomeArquivo: montarNomeDocumentoPadrao_(payload),
      urlArquivo: payload.urlPdf,
      codigoValidacao: codigoValidacao,
      urlValidacao: urlValidacao,
      osNumero: osNumero,
      cliente: payload.cliente.razaoSocial,
      cnpj: limparCnpj_(payload.cliente.cnpj),
      equipamento: payload.equipamento.tipoNome,
      serie: payload.equipamento.numeroSerie,
      status: payload.statusFinal
    });

    salvarDadosEspecificosPorPerfil_(db, payload, {
      clienteId: clienteRes.clienteId,
      equipamentoId: equipamentoRes.equipamentoId,
      relatorioId: relatorioId,
      execucaoId: execucaoId
    });

    return {
      ok: true,
      relatorioId: relatorioId,
      execucaoId: execucaoId,
      clienteId: clienteRes.clienteId,
      equipamentoId: equipamentoRes.equipamentoId,
      codigoValidacao: codigoValidacao,
      urlValidacao: urlValidacao,
      osNumero: osNumero,
      statusFinal: payload.statusFinal
    };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar relatório: " + obterMensagemErro_(e) };
  }
}

function salvarDocumentoIndexado_(db, doc) {
  const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.DOCUMENTOS, "documentos");

  aba.appendRow([
    gerarIdPadrao_("DOCUMENTO"),
    agoraFmt_(),
    doc.clienteId,
    doc.equipamentoId,
    doc.relatorioId,
    doc.tipoDocumento,
    doc.nomeArquivo,
    doc.urlArquivo,
    doc.codigoValidacao,
    doc.urlValidacao,
    doc.osNumero,
    doc.cliente,
    doc.cnpj,
    doc.equipamento,
    doc.serie,
    doc.status
  ]);
}

function salvarDadosEspecificosPorPerfil_(db, payload, ids) {
  const perfil = payload.perfil;
  if (!perfil) return;

  if (perfil.familia === "ESTERILIZACAO") {
    salvarEsterilizacao_(db, payload, ids);
    return;
  }

  if (perfil.familia === "LAVAGEM_DESINFECCAO") {
    salvarLavagem_(db, payload, ids);
    return;
  }

  if (perfil.usaEnsaiosTermicos) {
    salvarEnsaiosTermicos_(db, payload, ids);
    return;
  }

  if (perfil.usaEnsaiosGerais) {
    salvarEnsaiosGerais_(db, payload, ids);
    return;
  }

  if (perfil.usaInspecaoNR13) {
    salvarInspecoesNR13_(db, payload, ids);
    return;
  }
}

function salvarEsterilizacao_(db, payload, ids) {
  const A = CFG.PLANILHA.ABAS;

  if (payload.receitas && payload.receitas.length) {
    const abaCiclos = obterAbaObrigatoria_(db, A.ESTERILIZACAO_CICLOS, "ciclos de esterilização");
    const linhas = payload.receitas.map(function(r) {
      return [
        gerarIdPadrao_("CICLO"),
        ids.execucaoId,
        ids.relatorioId,
        ids.clienteId,
        ids.equipamentoId,
        payload.equipamento.tipoCodigo,
        payload.equipamento.tipoNome,
        r.nome,
        payload.escopo.qd ? "QD" : (payload.escopo.qo ? "QO" : "QI"),
        payload.escopo.qd ? "COM CARGA" : (payload.escopo.qo ? "VAZIO" : "N/A"),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        payload.statusFinal,
        ""
      ];
    });

    if (linhas.length) {
      abaCiclos.getRange(abaCiclos.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    }
  }

  if (payload.insumos && payload.insumos.length) {
    const abaIns = obterAbaObrigatoria_(db, A.ESTERILIZACAO_INSUMOS, "insumos de esterilização");
    const linhasIns = payload.insumos.map(function(i) {
      return [
        gerarIdPadrao_("INSUMO"),
        ids.execucaoId,
        ids.relatorioId,
        ids.clienteId,
        ids.equipamentoId,
        payload.equipamento.tipoCodigo,
        payload.equipamento.tipoNome,
        "",
        i.codigo,
        i.nome,
        i.lote,
        i.validade,
        i.fabricante,
        i.resultado,
        i.obs
      ];
    });

    if (linhasIns.length) {
      abaIns.getRange(abaIns.getLastRow() + 1, 1, linhasIns.length, linhasIns[0].length).setValues(linhasIns);
    }
  }
}

function salvarLavagem_(db, payload, ids) {
  const A = CFG.PLANILHA.ABAS;

  if (payload.receitas && payload.receitas.length) {
    const abaCiclos = obterAbaObrigatoria_(db, A.LAVAGEM_CICLOS, "ciclos de lavagem");
    const linhas = payload.receitas.map(function(r) {
      return [
        gerarIdPadrao_("CICLO"),
        ids.execucaoId,
        ids.relatorioId,
        ids.clienteId,
        ids.equipamentoId,
        payload.equipamento.tipoCodigo,
        payload.equipamento.tipoNome,
        r.nome,
        payload.escopo.qd ? "QD" : (payload.escopo.qo ? "QO" : "QI"),
        payload.escopo.qd ? "COM CARGA" : (payload.escopo.qo ? "VAZIO" : "N/A"),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        payload.statusFinal,
        ""
      ];
    });

    if (linhas.length) {
      abaCiclos.getRange(abaCiclos.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    }
  }

  if (payload.insumos && payload.insumos.length) {
    const abaTestes = obterAbaObrigatoria_(db, A.LAVAGEM_TESTES, "testes de lavagem");
    const linhas = payload.insumos.map(function(i) {
      return [
        gerarIdPadrao_("INSUMO"),
        ids.execucaoId,
        ids.relatorioId,
        ids.clienteId,
        ids.equipamentoId,
        payload.equipamento.tipoCodigo,
        payload.equipamento.tipoNome,
        "",
        i.codigo,
        i.nome,
        i.lote,
        i.validade,
        i.fabricante,
        i.resultado,
        i.obs
      ];
    });

    if (linhas.length) {
      abaTestes.getRange(abaTestes.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    }
  }
}

function salvarEnsaiosTermicos_(db, payload, ids) {
  const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.ENSAIOS_TERMICOS, "ensaios térmicos");

  const ensaios = payload.ensaios && payload.ensaios.length
    ? payload.ensaios
    : getEnsaiosPorTipo_(payload.equipamento.tipoCodigo).map(function(nome) { return { nome: nome }; });

  const linhas = ensaios.map(function(e) {
    return [
      gerarIdPadrao_("ENSAIO"),
      ids.execucaoId,
      ids.relatorioId,
      ids.clienteId,
      ids.equipamentoId,
      payload.equipamento.tipoCodigo,
      payload.equipamento.tipoNome,
      e.nome,
      e.dataInicio,
      e.horaInicio,
      e.dataFim,
      e.horaFim,
      e.faixaMin || payload.equipamento.faixaMin,
      e.faixaMax || payload.equipamento.faixaMax,
      e.tempMin,
      e.tempMax,
      e.tempMedia,
      e.excursao,
      e.resultado || payload.statusFinal,
      e.obs
    ];
  });

  if (linhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
}

function salvarEnsaiosGerais_(db, payload, ids) {
  const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.ENSAIOS_GERAIS, "ensaios gerais");

  const ensaios = payload.ensaios && payload.ensaios.length
    ? payload.ensaios
    : getEnsaiosPorTipo_(payload.equipamento.tipoCodigo).map(function(nome) { return { nome: nome }; });

  const linhas = ensaios.map(function(e) {
    return [
      gerarIdPadrao_("ENSAIO"),
      ids.execucaoId,
      ids.relatorioId,
      ids.clienteId,
      ids.equipamentoId,
      payload.equipamento.tipoCodigo,
      payload.equipamento.tipoNome,
      e.nome,
      e.parametro || "",
      e.valorReferencia || "",
      e.valorObservado || "",
      e.criterio || "",
      e.resultado || payload.statusFinal,
      e.obs || ""
    ];
  });

  if (linhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
}

function salvarInspecoesNR13_(db, payload, ids) {
  const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.INSPECOES_NR13, "inspeções NR-13");

  const ensaios = payload.nr13 && payload.nr13.ensaios && payload.nr13.ensaios.length
    ? payload.nr13.ensaios
    : getEnsaiosPorTipo_(payload.equipamento.tipoCodigo).map(function(nome) { return { nome: nome }; });

  const linhas = ensaios.map(function(e) {
    return [
      gerarIdPadrao_("NR13"),
      ids.execucaoId,
      ids.relatorioId,
      ids.clienteId,
      ids.equipamentoId,
      payload.equipamento.tipoCodigo,
      payload.equipamento.tipoNome,
      payload.equipamento.pmta || payload.nr13.pmta,
      payload.equipamento.volume || payload.nr13.volume,
      payload.equipamento.categoriaNR13 || payload.nr13.categoriaNR13,
      e.nome,
      e.pressaoTeste,
      e.tempoTeste,
      e.valvulaSeguranca || "",
      e.manometro || "",
      e.espessura || "",
      e.integridade || "",
      e.resultado || payload.statusFinal,
      e.obs || ""
    ];
  });

  if (linhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
}

/**
 * ============================================================
 * DOCUMENTOS / VALIDAÇÃO
 * ============================================================
 */

function pesquisarDocumentosGerados(filtro) {
  try {
    const termo = normalizarTexto_(filtro).toUpperCase();
    const db = getDB_();
    const aba = obterAbaObrigatoria_(db, CFG.PLANILHA.ABAS.DOCUMENTOS, "documentos");
    const valores = aba.getDataRange().getValues();

    if (!valores || valores.length <= 1) return { ok: true, itens: [] };

    const itens = [];

    for (var i = 1; i < valores.length; i++) {
      const l = valores[i];
      const item = {
        documentoId: String(l[0] || ""),
        dataEmissao: String(l[1] || ""),
        clienteId: String(l[2] || ""),
        equipamentoId: String(l[3] || ""),
        relatorioId: String(l[4] || ""),
        documentoTipo: String(l[5] || ""),
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

      const busca = Object.keys(item).map(function(k) { return item[k]; }).join(" | ").toUpperCase();
      if (!termo || busca.indexOf(termo) >= 0) itens.push(item);
    }

    itens.sort(function(a, b) {
      return String(b.dataEmissao || "").localeCompare(String(a.dataEmissao || ""));
    });

    return { ok: true, itens: itens.slice(0, 200) };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao pesquisar documentos: " + obterMensagemErro_(e), itens: [] };
  }
}

/**
 * ============================================================
 * IDS / AUTENTICAÇÃO
 * ============================================================
 */

function gerarCodigoAutenticacao_(dados) {
  const base = [
    Utilities.getUuid(),
    new Date().getTime(),
    dados && dados.cliente ? (dados.cliente.cnpj || dados.cliente.razaoSocial || "") : "",
    dados && dados.equipamento ? (dados.equipamento.numeroSerie || dados.equipamento.tipoCodigo || "") : ""
  ].join("|");

  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, base);
  const hex = bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16).toUpperCase();
    return v.length === 1 ? "0" + v : v;
  }).join("");

  return hex.substring(0, 12);
}

function gerarNumeroOs_(dados) {
  const data = Utilities.formatDate(new Date(), obterTimezone_(), "yyyyMMdd");
  const origem = [
    dados && dados.cliente ? (dados.cliente.cnpj || dados.cliente.razaoSocial || "") : "",
    dados && dados.equipamento ? (dados.equipamento.numeroSerie || dados.equipamento.tipoCodigo || "") : "",
    Utilities.getUuid()
  ].join("|");

  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, origem);
  const hex = bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16).toUpperCase();
    return v.length === 1 ? "0" + v : v;
  }).join("");

  return "OS-" + data + "-" + hex.substring(0, 6);
}

function montarUrlValidacao_(codigo) {
  const appUrl = obterAppUrl_();
  if (!appUrl || !codigo) return "";
  return appUrl + "?validar=" + encodeURIComponent(codigo);
}

function obterAppUrl_() {
  try {
    return ScriptApp.getService().getUrl() || "";
  } catch (e) {
    return "";
  }
}

function montarNomeDocumentoPadrao_(payload) {
  const cliente = sanitizarNomeArquivo_(payload.cliente.razaoSocial || "CLIENTE");
  const equipamento = sanitizarNomeArquivo_(payload.equipamento.tipoNome || "EQUIPAMENTO");
  const serie = sanitizarNomeArquivo_(payload.equipamento.numeroSerie || "SERIE");
  return "CARTA_CONFORMIDADE_" + equipamento + "_" + cliente + "_" + serie + ".pdf";
}

/**
 * ============================================================
 * DB / APOIO
 * ============================================================
 */

function getDB_() {
  const id = PropertiesService.getScriptProperties().getProperty("DB_ID");
  if (!id) {
    throw new Error("Banco de dados não configurado. Rode setupMetrolabsCartaConformidadeV1().");
  }
  return SpreadsheetApp.openById(id);
}

function obterAbaObrigatoria_(db, nomeAba, rotulo) {
  const aba = db.getSheetByName(nomeAba);
  if (!aba) {
    throw new Error("Aba de " + (rotulo || nomeAba) + " não encontrada.");
  }
  return aba;
}

function localizarPrimeiroRegistroPorColuna_(aba, indiceColuna1Base, valorBuscado) {
  const last = aba.getLastRow();
  if (last <= 1) return null;

  const alvo = normalizarChave_(valorBuscado);
  const valores = aba.getRange(2, indiceColuna1Base, last - 1, 1).getValues();

  for (var i = 0; i < valores.length; i++) {
    if (normalizarChave_(valores[i][0]) === alvo) {
      return aba.getRange(i + 2, 1, 1, aba.getLastColumn()).getValues()[0];
    }
  }

  return null;
}

function gerarIdPadrao_(tipo) {
  const chave = "PREFIXO_" + String(tipo || "").toUpperCase();
  const prefixo = String((CFG.IDS && CFG.IDS[chave]) || "ID");
  const token = Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase();
  return prefixo + "_" + token;
}

function agoraFmt_() {
  return Utilities.formatDate(new Date(), obterTimezone_(), "dd/MM/yyyy HH:mm:ss");
}

function obterTimezone_() {
  return PropertiesService.getScriptProperties().getProperty("TIMEZONE") ||
    (CFG.APP && CFG.APP.TIMEZONE) ||
    Session.getScriptTimeZone() ||
    "America/Sao_Paulo";
}

function obterPropertyOuConfig_(chave, fallback) {
  try {
    return PropertiesService.getScriptProperties().getProperty(chave) || fallback || "";
  } catch (e) {
    return fallback || "";
  }
}

/**
 * ============================================================
 * NORMALIZAÇÃO TEXTO
 * ============================================================
 */

function normalizarTexto_(valor) {
  return String(valor === null || valor === undefined ? "" : valor).trim();
}

function limparCnpj_(cnpj) {
  return normalizarTexto_(cnpj).replace(/\D/g, "");
}

function normalizarChave_(valor) {
  return normalizarTexto_(valor)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarStatus_(valor) {
  const s = normalizarChave_(valor);

  if (!s) return "";
  if (s === "APROVADO") return "Aprovado";
  if (s === "REPROVADO") return "Reprovado";
  if (s === "PENDENTE") return "Pendente";
  if (s === "APROVADO COM RESSALVAS" || s === "RESSALVAS" || s === "APROVADO C/ RESSALVAS") {
    return "Aprovado com Ressalvas";
  }

  return formatarTexto_(valor);
}

function formatarTexto_(valor) {
  let texto = normalizarTexto_(valor);
  if (!texto) return "";

  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const siglas = {
    "cme": "CME", "uti": "UTI", "upa": "UPA", "sus": "SUS",
    "cpf": "CPF", "cnpj": "CNPJ", "os": "OS", "sgo+": "SGO+",
    "nr": "NR", "nr-13": "NR-13", "abnt": "ABNT", "nbr": "NBR",
    "iso": "ISO", "rdc": "RDC", "anvisa": "ANVISA", "eto": "ETO",
    "qi": "QI", "qo": "QO", "qd": "QD",
    "go": "GO", "sp": "SP", "rj": "RJ", "mg": "MG", "df": "DF",
    "ltda": "LTDA", "eireli": "EIRELI", "epp": "EPP", "mei": "MEI", "me": "ME", "s/a": "S/A"
  };

  const especiais = {
    "metrolabs": "Metrolabs",
    "solucoes": "Soluções",
    "clinica": "Clínica",
    "clinico": "Clínico",
    "tecnica": "Técnica",
    "tecnico": "Técnico",
    "goiania": "Goiânia",
    "goias": "Goiás",
    "sao": "São",
    "peroxido": "Peróxido",
    "hidrogenio": "Hidrogênio",
    "ultrassonica": "Ultrassônica",
    "termodesinfectora": "Termodesinfectora",
    "centrifuga": "Centrífuga",
    "termica": "Térmica",
    "termico": "Térmico",
    "prions": "Príons",
    "quimico": "Químico",
    "biologico": "Biológico",
    "instalacao": "Instalação",
    "operacao": "Operação",
    "desempenho": "Desempenho",
    "traqueia": "Traqueia"
  };

  const minusculas = { "de": true, "da": true, "das": true, "do": true, "dos": true, "e": true, "em": true, "no": true, "na": true, "para": true, "por": true, "com": true };

  return texto.split(" ").map(function(p, idx) {
    if (!p) return "";
    const key = p.toLowerCase();
    if (siglas[key]) return siglas[key];
    if (especiais[key]) return especiais[key];
    if (idx > 0 && minusculas[key]) return key;
    if (p.indexOf("-") >= 0) {
      return p.split("-").map(function(x) {
        if (siglas[x]) return siglas[x];
        if (especiais[x]) return especiais[x];
        return x.charAt(0).toUpperCase() + x.slice(1);
      }).join("-");
    }
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(" ").trim();
}

function formatarRazaoSocial_(valor) {
  return formatarTexto_(valor)
    .replace(/\bLtda\b/g, "LTDA")
    .replace(/\bEireli\b/g, "EIRELI")
    .replace(/\bEpp\b/g, "EPP")
    .replace(/\bMei\b/g, "MEI")
    .replace(/\bMe\b/g, "ME")
    .replace(/\bS\/a\b/gi, "S/A");
}

function formatarModelo_(valor) {
  const t = normalizarTexto_(valor);
  if (!t) return "";
  if (/^[A-Za-z0-9\-./ ]+$/.test(t)) return t.toUpperCase();
  return formatarTexto_(t);
}

function formatarTipoLogradouro_(valor) {
  const v = normalizarChave_(valor);
  const mapa = {
    "RUA": "Rua",
    "AVENIDA": "Avenida",
    "AV": "Av.",
    "TRAVESSA": "Travessa",
    "ALAMEDA": "Alameda",
    "RODOVIA": "Rodovia",
    "ESTRADA": "Estrada",
    "QUADRA": "Quadra",
    "LOTE": "Lote",
    "SETOR": "Setor",
    "PRACA": "Praça"
  };
  return mapa[v] || formatarTexto_(valor);
}

function formatarLogradouro_(valor) {
  return formatarTexto_(valor)
    .replace(/^Av\b/i, "Av.")
    .replace(/^Av\.\b/i, "Av.")
    .replace(/^Rua\b/i, "Rua")
    .replace(/^Avenida\b/i, "Avenida");
}

function sanitizarHtml_(valor) {
  return normalizarTexto_(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizarNomeArquivo_(valor) {
  return normalizarTexto_(valor || "ARQUIVO")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80);
}

function clonarJson_(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function obterMensagemErro_(e) {
  if (!e) return "Erro não identificado.";
  return e.message || String(e);
}


/**
 * ============================================================
 * TESTE RÁPIDO DE SANIDADE DO SISTEMA
 * ============================================================
 * Execute esta função depois de implantar os arquivos.
 * Ela não gera PDF. Apenas verifica se as partes centrais existem.
 */
function testarSistemaCartaConformidadeV2() {
  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      item: nome,
      ok: !!ok,
      detalhe: detalhe || ""
    });
  }

  try {
    add("CFG", typeof CFG !== "undefined", "Config carregado.");
    add("Perfis de equipamento", CFG && CFG.PERFIS_EQUIPAMENTO && Object.keys(CFG.PERFIS_EQUIPAMENTO).length > 0, "Perfis encontrados: " + Object.keys(CFG.PERFIS_EQUIPAMENTO || {}).length);
    add("doGet", typeof doGet === "function", "WebApp principal disponível.");
    add("Validador", true, "Confirme que o arquivo HTML se chama Validador.");
    add("validarPayloadAntesDeGerar", typeof validarPayloadAntesDeGerar === "function", "Validação central disponível.");
    add("auditarQualificacao", typeof auditarQualificacao === "function", "Motor de auditoria disponível.");
    add("gerarCartaConformidade", typeof gerarCartaConformidade === "function", "Documento/PDF disponível.");
    add("refinarPayloadConclusaoIA", typeof refinarPayloadConclusaoIA === "function", "IA contextual disponível.");
    add("buscarDocumentoPorCodigo", typeof buscarDocumentoPorCodigo === "function", "Validação documental disponível.");

    const props = PropertiesService.getScriptProperties();
    add("DB_ID", !!props.getProperty("DB_ID"), props.getProperty("DB_ID") ? "Configurado." : "Rode setupMetrolabsCartaConformidadeV1().");
    add("PASTA_PDF_ID", !!props.getProperty("PASTA_PDF_ID"), props.getProperty("PASTA_PDF_ID") ? "Configurado." : "Rode setupMetrolabsCartaConformidadeV1().");

    return {
      ok: checks.every(function(c) { return c.ok; }),
      checks: checks
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: obterMensagemErro_(e),
      checks: checks
    };
  }
}
