/**
 * ============================================================
 * METROLABS — CARTA DE CONFORMIDADE / RELATÓRIO TÉCNICO
 * ARQUIVO: Documento.gs
 * PROJETO: NOVO — V1.0.1
 *
 * VERSÃO V3 ANTI-REDUNDNCIA:
 * - Gera PDF com texto técnico robusto e sem repetições.
 * - Usa 100% o Config.gs V2 Pesado.
 * - Conclusão automática por status.
 * - Aceita conclusão manual lapidada por IA.
 * - Se houver texto manual/IA, usa esse texto.
 * - Se não houver, gera automaticamente com base no status.
 * - Registra automaticamente o documento no banco.
 * - Retorna resumo completo para impressora térmica.
 * - Remove duplicidade entre introdução, escopo, observações, critérios, normas e conclusão.
 * - Corrige títulos técnicos, acentuação de critérios e textos internos que apareciam no PDF.
 * ============================================================
 */

function gerarCartaConformidade(dados) {
  try {
    const validacao = validarPayloadAntesDeGerar(dados);
    if (!validacao.ok) {
      throw new Error(validacao.mensagem);
    }

    const payload = validacao.payload;
    const perfil = payload.perfil;

    const props = PropertiesService.getScriptProperties();
    const pastaId = String(props.getProperty("PASTA_PDF_ID") || "").trim();
    if (!pastaId) {
      throw new Error("Pasta de PDF não configurada. Execute setupMetrolabsCartaConformidadeV1().");
    }

    const auditoriaRes = dados && dados.auditoria
      ? { ok: true, resultado: dados.auditoria }
      : auditarQualificacao(payload);

    const auditoria = auditoriaRes && auditoriaRes.ok
      ? (auditoriaRes.resultado || auditoriaRes.auditoria || {})
      : {};

    const codigoValidacao = normalizarTexto_(payload.codigoValidacao || gerarCodigoAutenticacao_(payload)).toUpperCase();
    const osNumero = normalizarTexto_(payload.osNumero || gerarNumeroOs_(payload));
    const urlValidacao = normalizarTexto_(payload.urlValidacao || montarUrlValidacaoPadraoDocumento_(codigoValidacao));

    payload.codigoValidacao = codigoValidacao;
    payload.codigo_validacao = codigoValidacao;
    payload.osNumero = osNumero;
    payload.os_numero = osNumero;
    payload.urlValidacao = urlValidacao;
    payload.url_validacao = urlValidacao;

    const consolidado = consolidarDocumentoPorPerfil_(payload, auditoria, perfil);
    const html = montarHtmlDocumentoMetrolabs_(consolidado);

    const blob = Utilities
      .newBlob(html, MimeType.HTML, "carta_conformidade_metrolabs.html")
      .getAs(MimeType.PDF);

    const pasta = DriveApp.getFolderById(pastaId);
    const nomeArquivo = montarNomeArquivoDocumento_(payload, perfil);
    blob.setName(nomeArquivo);

    const arquivo = pasta.createFile(blob);
    const urlPdf = arquivo.getUrl();

    payload.urlPdf = urlPdf;
    payload.url_pdf = urlPdf;

    const resumoImpressao = gerarResumoImpressaoTermica_(payload, consolidado);

    const registro = registrarDocumentoGeradoDocumento_(payload, urlPdf);

    return {
      ok: true,
      url: urlPdf,
      nome: arquivo.getName(),
      codigoValidacao: codigoValidacao,
      urlValidacao: urlValidacao,
      osNumero: osNumero,
      resumoImpressao: resumoImpressao,
      registro: registro
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao gerar PDF da Carta de Conformidade: " + obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * REGISTRO AUTOMÁTICO DO DOCUMENTO
 * ============================================================
 * Este método evita dependência de remendo manual.
 * Se existir registrarDocumento(), ele usa.
 * Se não existir, usa salvarRegistroRelatorio().
 * Se ambos existirem, prioriza salvarRegistroRelatorio() porque é mais completo.
 */

function registrarDocumentoGeradoDocumento_(payload, urlPdf) {
  try {
    payload.urlPdf = urlPdf;
    payload.url_pdf = urlPdf;

    if (typeof salvarRegistroRelatorio === "function") {
      const r = salvarRegistroRelatorio(payload);
      if (r && r.ok) return r;
      return { ok: false, mensagem: (r && r.mensagem) || "Falha ao salvar via salvarRegistroRelatorio." };
    }

    if (typeof registrarDocumento === "function") {
      const r2 = registrarDocumento(payload, urlPdf);
      if (r2 && r2.ok) return r2;
      return { ok: false, mensagem: (r2 && r2.mensagem) || "Falha ao salvar via registrarDocumento." };
    }

    return {
      ok: false,
      mensagem: "Nenhuma função de registro documental disponível. Verifique Codigo.gs ou Validacao.gs."
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao registrar documento: " + obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * CONSOLIDAÇÃO POR PERFIL
 * ============================================================
 */

function consolidarDocumentoPorPerfil_(payload, auditoria, perfil) {
  const statusFinal = normalizarStatusDocumento_(
    (auditoria && auditoria.statusFinal) ||
    payload.statusFinal ||
    "Pendente"
  );

  const corStatus = obterCorStatusDocumento_(statusFinal);

  const conclusaoAutomatica = montarConclusaoTecnicaAutomaticaDocumento_(payload, auditoria || {}, perfil, statusFinal);
  const conclusaoManual = normalizarTexto_(payload.textoConclusao || payload.texto_conclusao || "");
  const conclusao = conclusaoManual || conclusaoAutomatica;

  return {
    payload: payload,
    perfil: perfil,
    auditoria: auditoria || {},

    titulo: CFG.PDF.TITULO_PADRAO || "Carta de Conformidade Técnica Metrolabs",
    subtitulo: perfil.nome + " • " + obterNomeFamilia_(perfil.familia),
    dataEmissao: Utilities.formatDate(new Date(), obterTimezone_(), "dd/MM/yyyy HH:mm"),

    statusFinal: statusFinal,
    corStatus: corStatus,
    conclusao: conclusao,
    conclusaoAutomatica: conclusaoAutomatica,
    conclusaoOrigem: conclusaoManual ? "MANUAL_IA" : "AUTOMATICA",

    cliente: payload.cliente || {},
    equipamento: payload.equipamento || {},
    escopo: payload.escopo || {},

    normas: Array.isArray(perfil.normas) ? perfil.normas : [],
    criterios: perfil.criterios || {},
    textos: perfil.textos || {},

    receitas: Array.isArray(payload.receitas) ? payload.receitas : [],
    ensaios: Array.isArray(payload.ensaios) ? payload.ensaios : [],
    insumos: Array.isArray(payload.insumos) ? payload.insumos : [],
    nr13: payload.nr13 || {},

    pendencias: Array.isArray(auditoria && auditoria.pendencias) ? auditoria.pendencias : [],
    alertas: Array.isArray(auditoria && auditoria.alertas) ? auditoria.alertas : [],
    observacoesTecnicas: Array.isArray(auditoria && auditoria.observacoesTecnicas) ? auditoria.observacoesTecnicas : [],
    resumoTecnico: Array.isArray(auditoria && auditoria.resumoTecnico) ? auditoria.resumoTecnico : [],
    quadroResumo: (auditoria && auditoria.quadroResumo) || {},

    codigoValidacao: payload.codigoValidacao,
    urlValidacao: payload.urlValidacao,
    osNumero: payload.osNumero,
    qrDataUri: gerarQrCodeDataUriDocumento_(payload.urlValidacao || payload.codigoValidacao)
  };
}

function montarConclusaoPadraoDocumento_(payload, auditoria, perfil, statusFinal) {
  const textos = perfil.textos || {};
  const st = normalizarChave_(statusFinal);

  if (st === "APROVADO") return textos.conclusaoAprovado || "O equipamento apresentou conformidade preliminar com o escopo avaliado.";
  if (st === "APROVADO COM RESSALVAS") return textos.conclusaoRessalvas || "O equipamento apresentou conformidade preliminar com ressalvas.";
  if (st === "REPROVADO") return textos.conclusaoReprovado || "O equipamento não apresentou evidências suficientes de conformidade.";

  return "O equipamento permanece com conclusão pendente até a consolidação das evidências técnicas aplicáveis.";
}

/**
 * ============================================================
 * HTML PRINCIPAL
 * ============================================================
 */

function montarHtmlDocumentoMetrolabs_(d) {
  let html = "";
  html += "<html><head><meta charset='UTF-8'><style>";
  html += getCssDocumentoMetrolabs_();
  html += "</style></head><body>";

  html += montarCabecalhoDocumento_(d);
  html += montarBlocoParecer_(d);
  html += montarSecaoIdentificacaoCliente_(d);
  html += montarSecaoIdentificacaoEquipamento_(d);
  html += montarSecaoIntroducaoTecnica_(d);
  html += montarSecaoEscopo_(d);
  html += montarSecaoMetodologiaAplicada_(d);
  html += montarSecaoQualificacoesDocumento_(d);
  html += montarSecaoDadosProcesso_(d);
  html += montarSecaoRastreabilidade_(d);
  html += montarSecaoCriteriosAceitacao_(d);
  html += montarSecaoPendencias_(d);
  html += montarSecaoNormasCriterios_(d);
  html += montarSecaoConclusaoFinalDocumento_(d);
  html += montarSecaoValidadeAutenticidade_(d);
  html += montarRodapeDocumento_();

  html += "</body></html>";
  return html;
}

function montarCabecalhoDocumento_(d) {
  const logoDataUri = getLogoDataUriDocumento_();

  let html = "";
  html += "<div class='cabecalho bloco-evitar-quebra'>";
  html += "  <div class='cab-grid'>";
  html += "    <div class='cab-logo'>";
  if (logoDataUri) html += "      <img class='logo' src='" + logoDataUri + "'>";
  else html += "      <div class='logo-placeholder'>METROLABS</div>";
  html += "    </div>";
  html += "    <div class='cab-titulo'>";
  html += "      <div class='titulo-principal'>" + escHtml_(d.titulo) + "</div>";
  html += "      <div class='subtitulo'>" + escHtml_(d.subtitulo) + "</div>";
  html += "      <div class='subtitulo forte'>Emissão: " + escHtml_(d.dataEmissao) + " • Documento técnico controlado</div>";
  html += "    </div>";
  html += "  </div>";
  html += "</div>";
  return html;
}

function montarBlocoParecer_(d) {
  const frase = montarFraseParecerExecutivo_(d);

  let html = "";
  html += "<div class='bloco-status bloco-evitar-quebra' style='border-left:8px solid " + d.corStatus + ";'>";
  html += "  <div class='status-rotulo'>PARECER TÉCNICO PRELIMINAR</div>";
  html += "  <h1 class='status-final' style='color:" + d.corStatus + ";'>" + escHtml_(d.statusFinal) + "</h1>";
  html += "  <p class='status-texto'>" + escHtml_(frase) + "</p>";
  html += "</div>";
  return html;
}



function montarSecaoIdentificacaoCliente_(d) {
  const c = d.cliente || {};
  let html = "";
  html += "<h2>1. Identificação Institucional</h2>";
  html += "<table class='tabela-info bloco-evitar-quebra'>";
  html += linhaInfo_("Instituição / Cliente", c.razaoSocial || "Não informado");
  html += linhaInfo_("CNPJ", formatarCnpjDocumento_(c.cnpj || ""));
  html += linhaInfo_("Endereço", montarEnderecoDocumento_(c));
  html += linhaInfo_("Empresa Executante", CFG.EMPRESA.NOME);
  html += linhaInfo_("Responsável Técnico", CFG.EMPRESA.RESPONSAVEL_TECNICO);
  html += "</table>";
  return html;
}

function montarSecaoIdentificacaoEquipamento_(d) {
  const e = d.equipamento || {};
  let html = "";
  html += "<h2>2. Identificação do Equipamento</h2>";
  html += "<table class='tabela-info bloco-evitar-quebra'>";
  html += linhaInfo_("Tipo de Equipamento", e.tipoNome || e.tipo || d.perfil.nome);
  html += linhaInfo_("Família Técnica", obterNomeFamilia_(d.perfil.familia));
  html += linhaInfo_("Marca / Modelo", [e.marca, e.modelo].filter(Boolean).join(" / ") || "Não informado");
  html += linhaInfo_("Número de Série", e.numeroSerie || "Não informado");
  html += linhaInfo_("TAG / Patrimônio", e.tag || e.patrimonio || "Não informado");
  html += linhaInfo_("Capacidade / Volume", e.capacidadeLitros || e.volume || "Não informado");
  html += linhaInfo_("Setor", e.setor || "Não informado");
  html += linhaInfo_("Local de Instalação", e.localInstalacao || "Não informado");

  if (d.perfil.usaEnsaiosTermicos) html += linhaInfo_("Faixa de Aceitação", montarFaixaDocumento_(e));
  if (d.perfil.usaInspecaoNR13) {
    html += linhaInfo_("PMTA", e.pmta || "Não informado");
    html += linhaInfo_("Categoria NR-13", e.categoriaNR13 || "Não informado");
  }
  if (d.perfil.codigo === "AUTOCLAVE_ETO") {
    html += linhaInfo_("Tipo de Gás", e.tipoGas || "Não informado");
    html += linhaInfo_("Sistema de Exaustão", e.sistemaExaustao || "Não informado");
  }

  html += "</table>";
  return html;
}


function montarSecaoIntroducaoTecnica_(d) {
  let html = "";
  html += "<h2>3. Introdução Técnica</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>" + escHtml_(CFG.TEXTOS_GERAIS.CABECALHO_PRELIMINAR || "") + "</p>";
  html += "<p>Para esta emissão, o equipamento foi classificado como <strong>" + escHtml_(d.perfil.nome || "equipamento avaliado") + "</strong>, pertencente à família técnica <strong>" + escHtml_(obterNomeFamilia_(d.perfil.familia)) + "</strong>. A interpretação documental considera somente os requisitos compatíveis com esse perfil, evitando aplicação de critérios pertencentes a outros tipos de equipamento.</p>";
  html += "</div>";
  return html;
}



function montarSecaoMetodologiaAplicada_(d) {
  let html = "";
  html += "<h2>5. Metodologia Aplicada</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>" + escHtml_(d.textos.metodologia || "A metodologia foi definida com base no perfil técnico do equipamento, no escopo declarado, nas evidências coletadas e nos critérios aplicáveis ao processo avaliado.") + "</p>";
  html += "<p>A avaliação considera a relação entre identificação do equipamento, finalidade de uso, etapas executadas, registros disponíveis, rastreabilidade declarada e critérios técnicos aplicáveis. Informações não pertencentes ao perfil selecionado não são utilizadas como critério de aprovação.</p>";
  html += "</div>";
  return html;
}



function montarSecaoQualificacoesDocumento_(d) {
  let html = "";
  html += "<h2>7. Interpretação Técnica por Etapa</h2>";

  const possui = d.perfil.usaQI || d.perfil.usaQO || d.perfil.usaQD || d.perfil.usaInspecaoNR13;
  if (!possui) {
    html += "<div class='caixa bloco-evitar-quebra'><p>O perfil selecionado não utiliza QI, QO ou QD tradicional. A interpretação técnica é realizada conforme o tipo de inspeção ou ensaio aplicável.</p></div>";
    return html;
  }

  if (d.perfil.usaQI) {
    html += montarBlocoQualificacaoDocumento_("Qualificação de Instalação (QI)", d.escopo.qi, d.textos.qi);
  }

  if (d.perfil.usaQO) {
    html += montarBlocoQualificacaoDocumento_("Qualificação de Operação (QO)", d.escopo.qo, d.textos.qo);
  }

  if (d.perfil.usaQD) {
    html += montarBlocoQualificacaoDocumento_("Qualificação de Desempenho (QD)", d.escopo.qd, d.textos.qd);
  }

  if (d.perfil.usaInspecaoNR13) {
    html += montarBlocoQualificacaoDocumento_("Inspeção Técnica / NR-13", d.escopo.inspecao, d.textos.escopo);
  }

  return html;
}

function montarBlocoQualificacaoDocumento_(titulo, executada, texto) {
  let html = "";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<h3>" + escHtml_(titulo) + "</h3>";
  if (executada) {
    html += "<p>" + escHtml_(texto || "Texto técnico específico não configurado para esta etapa.") + "</p>";
  } else {
    html += "<p>Esta etapa não foi declarada no escopo desta emissão; portanto, não compõe a conclusão técnica deste documento.</p>";
  }
  html += "</div>";
  return html;
}



function montarSecaoCriteriosAceitacao_(d) {
  const keys = Object.keys(d.criterios || {});
  let html = "";
  html += "<h2>10. Critérios de Aceitação e Interpretação</h2>";

  if (!keys.length) {
    html += "<div class='caixa bloco-evitar-quebra'><p>Não foram configurados critérios específicos adicionais para este perfil.</p></div>";
    return html;
  }

  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Critério</th><th>Interpretação Técnica</th></tr>";
  keys.forEach(function(k) {
    html += "<tr>";
    html += "<td><strong>" + escHtml_(formatarChaveCriterio_(k)) + "</strong></td>";
    html += "<td>" + escHtml_(String(d.criterios[k])) + "</td>";
    html += "</tr>";
  });
  html += "</table>";
  return html;
}



function montarSecaoConclusaoFinalDocumento_(d) {
  let html = "";
  html += "<h2>13. Conclusão Técnica Final</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>" + escHtml_(d.conclusao) + "</p>";
  html += "</div>";
  return html;
}



function montarConclusaoTecnicaAutomaticaDocumento_(payload, auditoria, perfil, statusFinal) {
  const textos = perfil.textos || {};
  const st = normalizarChave_(statusFinal);
  const partes = [];

  if (st === "APROVADO") {
    partes.push(textos.conclusaoAprovado || "O equipamento apresentou conformidade preliminar com o escopo avaliado.");
  } else if (st === "APROVADO COM RESSALVAS") {
    partes.push(textos.conclusaoRessalvas || "O equipamento apresentou conformidade preliminar com ressalvas.");
  } else if (st === "REPROVADO") {
    partes.push(textos.conclusaoReprovado || "O equipamento não apresentou evidências suficientes de conformidade.");
  } else {
    partes.push("O equipamento permanece com conclusão pendente até a consolidação das evidências técnicas aplicáveis.");
  }

  if (auditoria && auditoria.pendencias && auditoria.pendencias.length) {
    partes.push("Foram registradas pendências que devem ser analisadas e tratadas antes da consolidação final do relatório técnico completo.");
  }

  if (auditoria && auditoria.alertas && auditoria.alertas.length) {
    partes.push("Foram identificados alertas técnicos que não necessariamente impedem a emissão preliminar, mas devem ser avaliados quanto ao impacto no uso, na segurança e na rastreabilidade.");
  }

  if (perfil.normas && perfil.normas.length) {
    partes.push("A interpretação considerou as referências técnicas e normativas vinculadas exclusivamente ao perfil " + perfil.nome + ", sem aplicação de critérios pertencentes a outros tipos de equipamento.");
  }

  partes.push("A validade desta conclusão está condicionada à manutenção das condições observadas, à integridade dos registros e à inexistência de intervenções posteriores não documentadas.");

  return partes.join(" ");
}


function montarSecaoEscopo_(d) {
  let html = "";
  html += "<h2>4. Escopo Técnico Executado</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>O escopo desta carta foi definido pelas etapas assinaladas na coleta técnica e pelos dados informados no sistema. A emissão abaixo registra apenas as etapas declaradas para este equipamento.</p>";
  html += "<table class='tabela-info tabela-compacta'>";
  if (d.perfil.usaQI) html += linhaInfo_("Qualificação de Instalação (QI)", d.escopo.qi ? "Executada / declarada" : "Não executada nesta emissão");
  if (d.perfil.usaQO) html += linhaInfo_("Qualificação de Operação (QO)", d.escopo.qo ? "Executada / declarada" : "Não executada nesta emissão");
  if (d.perfil.usaQD) html += linhaInfo_("Qualificação de Desempenho (QD)", d.escopo.qd ? "Executada / declarada" : "Não executada nesta emissão");
  if (d.perfil.usaInspecaoNR13) html += linhaInfo_("Inspeção Técnica / NR-13", d.escopo.inspecao ? "Executada / declarada" : "Não executada nesta emissão");
  html += "</table>";
  html += "</div>";
  return html;
}



function montarSecaoExclusivaPerfil_(d) {
  let html = "";
  html += "<h2>6. Fundamentação Técnica do Equipamento</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>" + escHtml_(d.textos.metodologia || "A metodologia foi definida conforme o perfil técnico exclusivo do equipamento selecionado.") + "</p>";
  html += "<p>" + escHtml_(d.textos.rastreabilidade || "A rastreabilidade foi estruturada conforme os registros e evidências aplicáveis ao equipamento.") + "</p>";
  html += "</div>";

  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Indicador Executivo</th><th class='centro'>Resultado</th></tr>";
  html += linhaTabela_("Receitas / Programas", String(d.quadroResumo.totalReceitas || d.receitas.length || 0));
  html += linhaTabela_("Ensaios / Inspeções", String(d.quadroResumo.totalEnsaios || d.ensaios.length || ((d.nr13.ensaios || []).length) || 0));
  html += linhaTabela_("Insumos / Testes Rastreáveis", String(d.quadroResumo.totalInsumos || d.insumos.length || 0));
  html += linhaTabela_("Pendências Preliminares", String(d.pendencias.length || 0));
  html += linhaTabela_("Alertas Técnicos", String(d.alertas.length || 0));
  html += linhaTabela_("Status Técnico", d.statusFinal);
  html += "</table>";

  return html;
}

function montarSecaoDadosProcesso_(d) {
  let html = "";
  html += "<h2>8. Dados do Processo, Ensaios e Execuções</h2>";
  if (d.perfil.usaReceitas) html += montarTabelaReceitasDocumento_(d);
  else if (d.perfil.usaEnsaiosTermicos || d.perfil.usaEnsaiosGerais) html += montarTabelaEnsaiosDocumento_(d);
  else if (d.perfil.usaInspecaoNR13) html += montarTabelaNR13Documento_(d);
  else html += "<div class='caixa bloco-evitar-quebra'><p>O perfil selecionado não exige receitas, ciclos ou ensaios adicionais nesta emissão preliminar.</p></div>";
  return html;
}

function montarTabelaReceitasDocumento_(d) {
  let html = "";
  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Receita / Programa</th><th class='centro'>QO</th><th class='centro'>QD</th><th class='centro'>Ciclos previstos</th></tr>";

  if (!d.receitas.length) {
    html += "<tr><td colspan='4' class='centro'>Nenhuma receita/programa foi informado nesta emissão.</td></tr>";
  } else {
    const qoQtd = Number((d.criterios && d.criterios.qoCiclosVaziosPorReceita) || 0);
    const qdQtd = Number((d.criterios && d.criterios.qdCiclosComCargaPorReceita) || 0);
    d.receitas.forEach(function(r) {
      const previsto = (d.escopo.qo ? qoQtd : 0) + (d.escopo.qd ? qdQtd : 0);
      html += "<tr>";
      html += "<td><strong>" + escHtml_(r.nome || r) + "</strong></td>";
      html += "<td class='centro'>" + escHtml_(d.escopo.qo ? (qoQtd + " ciclo(s) vazio(s)") : "N/A") + "</td>";
      html += "<td class='centro'>" + escHtml_(d.escopo.qd ? (qdQtd + " ciclo(s) com carga") : "N/A") + "</td>";
      html += "<td class='centro'>" + escHtml_(String(previsto)) + "</td>";
      html += "</tr>";
    });
  }
  html += "</table>";
  return html;
}

function montarTabelaEnsaiosDocumento_(d) {
  let html = "";
  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Ensaio</th><th class='centro'>Resultado</th><th class='centro'>Valor / Faixa</th><th>Observação</th></tr>";
  if (!d.ensaios.length) {
    html += "<tr><td colspan='4' class='centro'>Nenhum ensaio foi informado nesta emissão.</td></tr>";
  } else {
    d.ensaios.forEach(function(e) {
      html += "<tr>";
      html += "<td><strong>" + escHtml_(e.nome || "Ensaio") + "</strong></td>";
      html += "<td class='centro'>" + escHtml_(e.resultado || "Não informado") + "</td>";
      html += "<td class='centro'>" + escHtml_(montarValorEnsaioDocumento_(e, d)) + "</td>";
      html += "<td>" + escHtml_(e.obs || "") + "</td>";
      html += "</tr>";
    });
  }
  html += "</table>";
  return html;
}

function montarTabelaNR13Documento_(d) {
  const ensaios = (d.nr13 && Array.isArray(d.nr13.ensaios)) ? d.nr13.ensaios : [];
  let html = "";
  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Inspeção / Ensaio</th><th class='centro'>Pressão</th><th class='centro'>Tempo</th><th class='centro'>Resultado</th><th>Observação</th></tr>";
  if (!ensaios.length) {
    html += "<tr><td colspan='5' class='centro'>Nenhuma inspeção NR-13 foi informada nesta emissão.</td></tr>";
  } else {
    ensaios.forEach(function(e) {
      html += "<tr>";
      html += "<td><strong>" + escHtml_(e.nome || "Inspeção") + "</strong></td>";
      html += "<td class='centro'>" + escHtml_(e.pressaoTeste || "N/A") + "</td>";
      html += "<td class='centro'>" + escHtml_(e.tempoTeste || "N/A") + "</td>";
      html += "<td class='centro'>" + escHtml_(e.resultado || "Não informado") + "</td>";
      html += "<td>" + escHtml_(e.obs || "") + "</td>";
      html += "</tr>";
    });
  }
  html += "</table>";
  return html;
}

function montarSecaoRastreabilidade_(d) {
  let html = "";
  html += "<h2>9. Rastreabilidade Aplicável</h2>";
  html += "<div class='caixa bloco-evitar-quebra'><p>" + escHtml_(d.textos.rastreabilidade || "") + "</p></div>";

  if (!d.perfil.usaInsumos) {
    html += "<div class='caixa bloco-evitar-quebra'><p><strong>Observação:</strong> Este perfil de equipamento não utiliza BI, IQ, Bowie-Dick, Príons ou integradores. A rastreabilidade técnica é baseada nas evidências, ensaios, registros metrológicos e documentação aplicável ao equipamento.</p></div>";
    return html;
  }

  html += "<table class='bloco-evitar-quebra'>";
  html += "<tr><th>Insumo / Teste</th><th class='centro'>Lote</th><th class='centro'>Validade</th><th>Fabricante</th></tr>";

  if (!d.insumos.length) {
    html += "<tr><td colspan='4' class='centro'>Nenhum insumo rastreável foi informado.</td></tr>";
  } else {
    d.insumos.forEach(function(i) {
      html += "<tr>";
      html += "<td>" + escHtml_(i.nome || "Insumo") + "</td>";
      html += "<td class='centro'>" + escHtml_(i.lote || "Não informado") + "</td>";
      html += "<td class='centro'>" + escHtml_(i.validade || "Não informada") + "</td>";
      html += "<td>" + escHtml_(i.fabricante || "") + "</td>";
      html += "</tr>";
    });
  }

  html += "</table>";
  return html;
}

function montarSecaoPendencias_(d) {
  const pendencias = Array.isArray(d.pendencias) ? d.pendencias : [];
  const alertas = Array.isArray(d.alertas) ? d.alertas : [];
  const bloqueios = Array.isArray(d.auditoria && d.auditoria.inconsistenciasBloqueantes) ? d.auditoria.inconsistenciasBloqueantes : [];
  const resumo = filtrarResumoTecnicoUnicoDocumento_(d);

  let html = "";
  html += "<h2>11. Pendências, Ressalvas e Observações</h2>";

  if (!pendencias.length && !alertas.length && !bloqueios.length && !resumo.length) {
    html += "<div class='caixa bloco-evitar-quebra'><p>Não foram registradas pendências, bloqueios ou ressalvas adicionais para esta emissão.</p></div>";
    return html;
  }

  html += "<div class='caixa bloco-evitar-quebra'><ul>";

  bloqueios.forEach(function(p) {
    html += "<li><strong>Inconsistência bloqueante:</strong> " + escHtml_(p) + "</li>";
  });

  pendencias.forEach(function(p) {
    html += "<li><strong>Pendência:</strong> " + escHtml_(p) + "</li>";
  });

  alertas.forEach(function(a) {
    html += "<li><strong>Alerta técnico:</strong> " + escHtml_(a) + "</li>";
  });

  resumo.forEach(function(r) {
    html += "<li><strong>Síntese da auditoria:</strong> " + escHtml_(r) + "</li>";
  });

  html += "</ul></div>";
  return html;
}



function montarSecaoNormasCriterios_(d) {
  let html = "";
  html += "<h2>12. Referências Técnicas e Normativas</h2>";
  html += "<div class='caixa bloco-evitar-quebra'>";
  html += "<p>As referências abaixo orientam a interpretação técnica do perfil selecionado. A aplicação efetiva de cada requisito depende do escopo executado, do tipo de equipamento, da documentação disponível e dos protocolos do fabricante.</p>";

  if (d.normas.length) {
    html += "<ul>";
    d.normas.forEach(function(n) {
      html += "<li>" + escHtml_(n) + "</li>";
    });
    html += "</ul>";
  } else {
    html += "<p>Não foram configuradas referências específicas para este perfil.</p>";
  }

  html += "</div>";
  return html;
}



function montarSecaoValidadeAutenticidade_(d) {
  let html = "";
  html += "<div class='bloco-evitar-quebra-master'>";
  html += "<h2>14. Autenticidade, Rastreabilidade e Validação Externa</h2>";
  html += "<div class='caixa'>";
  html += "<p>" + escHtml_(CFG.TEXTOS_GERAIS.CLAUSULA_FINAL || "") + "</p>";
  html += "<p>" + escHtml_(CFG.TEXTOS_GERAIS.VALIDACAO || "") + "</p>";
  html += "</div>";

  html += "<table class='tabela-info'>";
  html += linhaInfo_("Número da O.S.", d.osNumero || "Não informado");
  html += linhaInfo_("Código de Autenticação", d.codigoValidacao || "Não informado");
  html += linhaInfo_("Validação Externa", d.urlValidacao || "URL não disponível");
  html += "</table>";

  html += "<div class='bloco-validacao'>";
  html += "<div class='validacao-coluna validacao-coluna-qr'>";
  html += "<div class='label-auth'>QR CODE DE VALIDAÇÃO</div>";
  if (d.qrDataUri) html += "<img class='qr-img' src='" + d.qrDataUri + "'>";
  else html += "<div class='qr-fallback'>QR indisponível nesta emissão</div>";
  html += "<div class='qr-legenda'>Escaneie o código para validar o documento.</div>";
  html += "</div>";

  html += "<div class='validacao-coluna validacao-coluna-url'>";
  html += "<div class='label-auth'>ENDEREÇO DE VALIDAÇÃO</div>";
  html += "<div class='url-box'>" + escHtml_(d.urlValidacao || "URL não disponível.") + "</div>";
  html += "<div class='qr-legenda'>Código: <span class='mono'>" + escHtml_(d.codigoValidacao || "") + "</span></div>";
  html += "</div></div>";

  html += "<div class='assinaturas'>";
  html += "<table class='tabela-assinatura'><tr>";
  html += "<td class='sem-borda centro'><div class='linha-assinatura'></div><strong>" + escHtml_(CFG.EMPRESA.RESPONSAVEL_TECNICO) + "</strong><br>Responsável Técnico - " + escHtml_(CFG.EMPRESA.NOME) + "</td>";
  html += "<td class='sem-borda centro'><div class='linha-assinatura'></div><strong>Representante da Instituição</strong><br>" + escHtml_(d.cliente.razaoSocial || "") + "</td>";
  html += "</tr></table></div></div>";
  return html;
}

function montarRodapeDocumento_() {
  let html = "";
  html += "<div class='rodape'>";
  html += "<div><strong>" + escHtml_(CFG.EMPRESA.NOME) + "</strong> • Documento Técnico Controlado</div>";
  html += "<div>A validade deste documento preliminar está condicionada ao escopo executado e ao relatório técnico completo correspondente.</div>";
  html += "</div>";
  return html;
}

/**
 * ============================================================
 * RESUMO PARA IMPRESSORA
 * ============================================================
 */

function gerarResumoImpressaoTermica_(payload, d) {
  d = d || consolidarDocumentoPorPerfil_(payload, {}, payload.perfil);

  return {
    documentoTipo: "CARTA_CONFORMIDADE_METROLABS",
    stateType: "LAUDO TÉCNICO RESUMIDO",
    ticketTitle: "METROLABS",
    cycleId: d.osNumero || ("CARTA-" + Utilities.formatDate(new Date(), obterTimezone_(), "ddMMyy-HHmm")),
    result: d.statusFinal,
    state: d.statusFinal,
    stateLabel: d.statusFinal,
    startTimestamp: new Date().toISOString(),
    endTimestamp: new Date().toISOString(),
    conclusion: d.conclusao,
    thermal: {
      cliente: d.cliente.razaoSocial,
      cnpj: d.cliente.cnpj,
      equipamento: d.perfil.nome,
      marcaModelo: [d.equipamento.marca, d.equipamento.modelo].filter(Boolean).join(" / "),
      serie: d.equipamento.numeroSerie,
      patrimonio: d.equipamento.tag || d.equipamento.patrimonio,
      capacidade: d.equipamento.capacidadeLitros || d.equipamento.volume || "N/A",
      statusQI: d.escopo.qi ? "APROVADO" : "N/A",
      statusQO: d.escopo.qo ? "APROVADO" : "N/A",
      statusQD: d.escopo.qd ? "APROVADO" : "N/A",
      statusInspecao: d.escopo.inspecao ? "APROVADO" : "N/A",
      receitas: d.receitas.map(function(r) { return { nome: r.nome || r }; }),
      insumos: d.insumos,
      normas: d.normas,
      textoValidade: CFG.TEXTOS_GERAIS.CLAUSULA_FINAL,
      osNumero: d.osNumero,
      codigoValidacao: d.codigoValidacao,
      urlValidacao: d.urlValidacao,
      qrDataUri: d.qrDataUri
    }
  };
}

/**
 * ============================================================
 * CSS
 * ============================================================
 */

function getCssDocumentoMetrolabs_() {
  let css = "";
  css += "@page { size: A4 portrait; margin: 16mm 12mm 28mm 12mm; }";
  css += "body{font-family:Arial,sans-serif;font-size:10.8px;color:#1f2937;line-height:1.52;text-align:justify;margin:0;padding:0 0 20mm 0;}";
  css += "*{box-sizing:border-box;}";
  css += "p,li{text-align:justify;}";
  css += ".cabecalho{margin-bottom:16px;border-bottom:2px solid #198754;padding-bottom:10px;}";
  css += ".cab-grid{width:100%;display:table;}";
  css += ".cab-logo{display:table-cell;width:24%;vertical-align:middle;text-align:left;}";
  css += ".cab-titulo{display:table-cell;width:76%;vertical-align:middle;text-align:center;}";
  css += ".logo{max-height:62px;max-width:210px;}";
  css += ".logo-placeholder{font-size:20px;font-weight:bold;color:#198754;}";
  css += ".titulo-principal{font-size:18px;font-weight:bold;color:#198754;text-transform:uppercase;letter-spacing:.3px;}";
  css += ".subtitulo{font-size:10px;color:#4b5563;margin-top:3px;}";
  css += ".forte{font-weight:bold;color:#374151;}";
  css += ".bloco-status{background:#f8fafc;padding:14px 16px;margin-bottom:18px;border-radius:6px;}";
  css += ".status-rotulo{font-size:10px;color:#6b7280;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;font-weight:bold;}";
  css += ".status-final{font-size:20px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:.4px;}";
  css += ".status-texto{margin:0;}";
  css += "h2{color:#198754;font-size:12.8px;border-bottom:1px solid #cfd8dc;padding-bottom:4px;margin-top:16px;margin-bottom:8px;text-align:left;text-transform:uppercase;page-break-after:avoid;}";
  css += "h3{font-size:11.2px;color:#146c43;margin:10px 0 5px 0;text-align:left;}";
  css += "table{width:100%;border-collapse:collapse;margin-top:8px;text-align:left;}";
  css += "th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top;text-align:left;font-size:10.2px;}";
  css += "th{background:#198754;color:#fff;font-weight:bold;}";
  css += ".tabela-info td:first-child{width:31%;background:#f3fbf5;font-weight:bold;}";
  css += ".tabela-compacta{margin-top:6px;}";
  css += ".caixa{background:#fafafa;border:1px solid #d8dee4;padding:10px 11px;border-radius:4px;margin-bottom:8px;}";
  css += ".centro{text-align:center !important;}";
  css += ".rodape{position:fixed;bottom:4mm;left:0;right:0;border-top:1px solid #9ca3af;padding-top:5px;text-align:center;font-size:8.6px;color:#4b5563;background:#fff;}";
  css += ".assinaturas{margin-top:18px;padding-top:6px;}";
  css += ".tabela-assinatura{margin-top:6px;width:100%;}";
  css += ".tabela-assinatura td{width:50%;text-align:center;font-size:10px;vertical-align:bottom;padding-top:18px;}";
  css += ".sem-borda{border:none !important;}";
  css += ".mono{font-family:Consolas,monospace;letter-spacing:.08em;}";
  css += ".qr-img{max-width:150px;max-height:150px;margin-top:8px;display:block;margin-left:auto;margin-right:auto;}";
  css += ".label-auth{font-weight:bold;color:#198754;}";
  css += ".linha-assinatura{border-top:1px solid #111;width:88%;margin:0 auto 8px auto;height:1px;}";
  css += ".bloco-evitar-quebra{page-break-inside:avoid;}";
  css += ".bloco-evitar-quebra-master{page-break-inside:avoid;margin-top:16px;}";
  css += ".bloco-validacao{display:table;width:100%;margin-top:10px;border:1px solid #d8dee4;border-radius:4px;overflow:hidden;background:#fafafa;}";
  css += ".validacao-coluna{display:table-cell;vertical-align:top;padding:12px;}";
  css += ".validacao-coluna-qr{width:42%;text-align:center;border-right:1px solid #d8dee4;}";
  css += ".validacao-coluna-url{width:58%;}";
  css += ".url-box{margin-top:8px;padding:10px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;word-break:break-all;font-size:9.4px;line-height:1.35;}";
  css += ".qr-legenda{font-size:9px;color:#4b5563;margin-top:8px;line-height:1.3;}";
  css += ".qr-fallback{border:1px dashed #9ca3af;border-radius:4px;padding:24px 10px;color:#6b7280;background:#fff;margin-top:8px;}";
  css += "ul{margin:6px 0 0 18px;padding:0;}";
  css += "li{margin-bottom:4px;}";
  return css;
}

/**
 * ============================================================
 * HELPERS DOCUMENTO
 * ============================================================
 */

function linhaInfo_(rotulo, valor) {
  return "<tr><td><strong>" + escHtml_(rotulo) + "</strong></td><td>" + escHtml_(valor || "Não informado") + "</td></tr>";
}

function linhaTabela_(rotulo, valor) {
  return "<tr><td>" + escHtml_(rotulo) + "</td><td class='centro'>" + escHtml_(valor || "0") + "</td></tr>";
}

function montarEnderecoDocumento_(c) {
  const partes = [];
  if (c.logradouro) partes.push(corrigirTextoEnderecoDocumento_(c.logradouro));
  if (c.numero) partes.push(c.numero);
  if (c.bairro) partes.push(corrigirTextoEnderecoDocumento_(c.bairro));
  if (c.cidade || c.uf) partes.push([corrigirTextoEnderecoDocumento_(c.cidade || ""), String(c.uf || "").toUpperCase()].filter(Boolean).join("/"));
  if (c.cep) partes.push("CEP " + c.cep);
  return partes.join(" - ") || "Não informado";
}



function montarFaixaDocumento_(e) {
  if (e.faixaMin || e.faixaMax) return (e.faixaMin || "-") + " a " + (e.faixaMax || "-") + " °C";
  return "Não informada";
}

function montarValorEnsaioDocumento_(e, d) {
  const partes = [];
  if (e.tempMin) partes.push("Min: " + e.tempMin);
  if (e.tempMax) partes.push("Max: " + e.tempMax);
  if (e.tempMedia) partes.push("Média: " + e.tempMedia);
  if (e.excursao) partes.push("Excursões: " + e.excursao);
  if (!partes.length && d.perfil.usaEnsaiosTermicos) return montarFaixaDocumento_(d.equipamento);
  return partes.join(" | ") || "Não informado";
}

function obterNomeFamilia_(familiaCodigo) {
  return (CFG.FAMILIAS && CFG.FAMILIAS[familiaCodigo]) || familiaCodigo || "Não informado";
}

function normalizarStatusDocumento_(status) {
  const s = normalizarChave_(status);
  if (s === "APROVADO") return "Aprovado";
  if (s === "REPROVADO") return "Reprovado";
  if (s === "PENDENTE") return "Pendente";
  if (s === "APROVADO COM RESSALVAS" || s === "RESSALVAS" || s === "APROVADO C/ RESSALVAS") return "Aprovado com Ressalvas";
  return normalizarTexto_(status) || "Pendente";
}

function obterCorStatusDocumento_(status) {
  const s = normalizarChave_(status);
  if (s.indexOf("REPROVADO") >= 0 || s.indexOf("PENDENTE") >= 0) return "#d9534f";
  if (s.indexOf("RESSALVA") >= 0) return "#f0ad4e";
  return "#198754";
}

function montarNomeArquivoDocumento_(payload, perfil) {
  const cliente = sanitizarNomeArquivo_(payload.cliente.razaoSocial || "CLIENTE");
  const equipamento = sanitizarNomeArquivo_(perfil.nome || "EQUIPAMENTO");
  const serie = sanitizarNomeArquivo_(payload.equipamento.numeroSerie || "SERIE");
  const data = Utilities.formatDate(new Date(), obterTimezone_(), "yyyyMMdd_HHmm");
  return "CARTA_CONFORMIDADE_" + equipamento + "_" + cliente + "_" + serie + "_" + data + ".pdf";
}

function montarUrlValidacaoPadraoDocumento_(codigo) {
  if (typeof montarUrlValidacao_ === "function") return montarUrlValidacao_(codigo);
  const url = ScriptApp.getService().getUrl();
  return url ? (url + "?validar=" + encodeURIComponent(codigo)) : "";
}

function formatarCnpjDocumento_(cnpj) {
  const n = limparCnpj_(cnpj);
  if (n.length !== 14) return cnpj || "Não informado";
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarChaveCriterio_(chave) {
  const mapa = {
    qoCiclosVaziosPorReceita: "QO – ciclos vazios por receita",
    qdCiclosComCargaPorReceita: "QD – ciclos com carga por receita",
    temperatura: "Temperatura",
    pressao: "Pressão",
    secagem: "Secagem",
    f0: "F₀",
    bowieDick: "Bowie-Dick",
    prions: "Príons",
    compatibilidadeCarga: "Compatibilidade da carga",
    cicloBaixaTemperatura: "Ciclo de baixa temperatura",
    aeracao: "Aeração",
    vacuo: "Vácuo",
    gas: "Gás esterilizante",
    seguranca: "Segurança",
    temperaturaLavagem: "Temperatura de lavagem",
    tempoLavagem: "Tempo de lavagem",
    cavitacao: "Cavitação",
    canulados: "Canulados",
    a0: "A₀",
    temperaturaDesinfeccao: "Temperatura de desinfecção",
    limpeza: "Limpeza",
    faixaPadrao: "Faixa padrão",
    estabilidade: "Estabilidade",
    portaSemiaberta: "Porta semiaberta",
    quedaEnergia: "Queda de energia",
    uniformidade: "Uniformidade",
    faixa: "Faixa de aceitação",
    recuperacao: "Recuperação",
    excursao: "Excursão",
    autonomiaTermica: "Autonomia térmica",
    cargaTermica: "Carga térmica",
    transporte: "Transporte",
    fluxo: "Fluxo",
    filtro: "Filtro",
    areaTrabalho: "Área de trabalho",
    rotacao: "Rotação",
    tempo: "Tempo",
    setpoint: "Setpoint",
    fluxoAr: "Fluxo de ar",
    pmta: "PMTA",
    ensaioHidrostatico: "Ensaio hidrostático",
    valvulaSeguranca: "Válvula de segurança",
    manometro: "Manômetro",
    integridade: "Integridade"
  };

  if (mapa[chave]) return mapa[chave];

  return String(chave || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, function(c) { return c.toUpperCase(); });
}




function montarFraseParecerExecutivo_(d) {
  const status = normalizarChave_(d.statusFinal || "");
  const nome = (d.perfil && d.perfil.nome) ? d.perfil.nome : "equipamento avaliado";

  if (status === "APROVADO") {
    return "O " + nome + " foi enquadrado como aprovado para o escopo declarado nesta emissão. A fundamentação técnica completa está descrita nas seções seguintes.";
  }

  if (status === "APROVADO COM RESSALVAS") {
    return "O " + nome + " foi enquadrado como aprovado com ressalvas para o escopo declarado. As pendências e alertas aplicáveis estão descritos nas seções técnicas.";
  }

  if (status === "REPROVADO") {
    return "O " + nome + " foi enquadrado como reprovado no escopo avaliado. As inconsistências e impedimentos técnicos estão descritos nas seções seguintes.";
  }

  return "O " + nome + " permanece com parecer pendente até a consolidação das evidências aplicáveis.";
}

function filtrarResumoTecnicoUnicoDocumento_(d) {
  const lista = Array.isArray(d.resumoTecnico) ? d.resumoTecnico : [];
  const textosJaUsados = [
    d.textos && d.textos.qi,
    d.textos && d.textos.qo,
    d.textos && d.textos.qd,
    d.textos && d.textos.rastreabilidade,
    d.textos && d.textos.escopo,
    d.textos && d.textos.metodologia,
    d.conclusao
  ].map(function(x) { return normalizarChave_(x || ""); }).filter(Boolean);

  const out = [];
  lista.forEach(function(item) {
    const chave = normalizarChave_(item || "");
    if (!chave) return;
    const repetido = textosJaUsados.some(function(t) {
      return t === chave || (t.length > 80 && chave.length > 80 && (t.indexOf(chave) >= 0 || chave.indexOf(t) >= 0));
    });
    if (!repetido) out.push(item);
  });

  return out;
}

function corrigirTextoEnderecoDocumento_(txt) {
  return String(txt || "")
    .replace(/\bBro\b\.?/gi, "Bairro")
    .replace(/\bJardim America\b/gi, "Jardim América")
    .replace(/\bC155\b/gi, "C-155")
    .replace(/\s+/g, " ")
    .trim();
}


function escHtml_(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

function getLogoDataUriDocumento_() {
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("LOGO_ID") || CFG.LOGO_ID;
    if (!logoId) return "";
    const blob = DriveApp.getFileById(logoId).getBlob();
    return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return "";
  }
}

function gerarQrCodeDataUriDocumento_(texto) {
  try {
    const clean = String(texto || "").trim();
    if (!clean) return "";
    const url = "https://quickchart.io/qr?size=180&margin=1&text=" + encodeURIComponent(clean);
    const resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) return "";
    const blob = resp.getBlob();
    return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return "";
  }
}
