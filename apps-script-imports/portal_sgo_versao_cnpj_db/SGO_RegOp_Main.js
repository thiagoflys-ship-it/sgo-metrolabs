/****************************************************
 * REGISTROS OPERACIONAIS — dispatcher + APIs
 * v2 (2026-08-15): generalizado de "checklist por POP" pra "tipo de
 * documento livre" — ver [[project_registros_operacionais_modulo]].
 ****************************************************/
function RegOp_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiConsultarCnpj: RegOp_apiConsultarCnpj,
    apiListarTiposDocumento: RegOp_apiListarTiposDocumento,
    apiSugerirCamposDocumento: RegOp_apiSugerirCamposDocumento,
    apiSalvarTipoDocumento: RegOp_apiSalvarTipoDocumento,
    apiExcluirTipoDocumento: RegOp_apiExcluirTipoDocumento,
    apiGerarRegistro: RegOp_apiGerarRegistro,
    apiListarArquivosPdf: RegOp_apiListarArquivosPdf,
    apiListarRegistrosPendentes: RegOp_apiListarRegistrosPendentes,
    apiMelhorarTextoCampo: RegOp_apiMelhorarTextoCampo
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  // apiGerarRegistro é a única função deste módulo que precisa saber quem
  // está logado (pra vincular a Tarefa criada no Auvo ao técnico real).
  if (fn === 'apiGerarRegistro') return RegOp_apiGerarRegistro(payload, req.sessionId);

  return allow[fn](payload);
}

/** Catálogo de POPs é o mesmo do módulo PGT e POP (PGTPOP_CFG, mesmo projeto Apps Script) — sem cópia própria. */
function RegOp_getAppBootstrap() {
  var props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("REGOP_APP_NOME") || REGOP_CFG.APP.NOME,
    versao: props.getProperty("REGOP_APP_VERSAO") || REGOP_CFG.APP.VERSAO,
    empresaNome: props.getProperty("REGOP_EMPRESA_NOME") || REGOP_CFG.EMPRESA.NOME,
    catalogoPops: PGTPOP_CFG.CATALOGO_POPS,
    baseNormativa: REGOP_CFG.BASE_NORMATIVA
  };
}

function RegOp_getDB_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty("REGOP_DB_ID");
  if (!dbId) {
    RegOp_setupModulo();
    dbId = props.getProperty("REGOP_DB_ID");
  }
  return SpreadsheetApp.openById(dbId);
}

// ------------------------------------------------------------
// Índices de coluna (0-based) — MOD_TIPOS_DOCUMENTO e MOV_REGISTROS
// ------------------------------------------------------------
var REGOP_COL_TIPO_DOCUMENTO = Object.freeze({
  ID: 0, NOME: 1, POPS_RELACIONADOS_JSON: 2, CAMPOS_JSON: 3,
  ASSINATURAS_JSON: 4, CRIADO_EM: 5, REVISADO_POR: 6,
  ABRE_PENDENCIA: 7, TIPO_FECHAMENTO_ID: 8
});
var REGOP_COL_REGISTRO = Object.freeze({
  ID: 0, DATA: 1, HOSPITAL: 2, CNPJ: 3, TIPO_DOCUMENTO_ID: 4, TIPO_DOCUMENTO_NOME: 5,
  RESPOSTAS_JSON: 6, ASSINATURAS_JSON: 7, OBSERVACOES_GERAIS: 8, IMAGENS_JSON: 9, PDF_URL: 10,
  STATUS_PENDENCIA: 11, REGISTRO_ORIGEM_ID: 12
});

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (mesmo padrão de PgtPop_apiConsultarCnpj,
// já com logradouro/bairro separados — bug real corrigido em 2026-08-14)
// ------------------------------------------------------------
function RegOp_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  const logradouroPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : ''
  ].filter(function (v) { return String(v || '').trim(); }).join(' ').replace(/\s+/g, ' ').trim();

  return {
    ok: true,
    fonte: 'consulta pública',
    cnpj: RegOp_formatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    logradouro: logradouroPartes,
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || ''
  };
}

function RegOp_formatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}

// ------------------------------------------------------------
// TIPOS DE DOCUMENTO (livres — não travados 1:1 com um POP; podem ter
// zero, um ou vários POPs relacionados; um POP pode ter vários tipos)
// ------------------------------------------------------------

/** Lista TODOS os tipos de documento já criados — popula o seletor da etapa 2, cresce conforme o gestor cria novos. */
function RegOp_apiListarTiposDocumento(payload) {
  try {
    var db = RegOp_getDB_();
    var aba = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.TIPOS_DOCUMENTO);
    var dados = aba.getDataRange().getValues();
    var tipos = [];
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      if (!linha[REGOP_COL_TIPO_DOCUMENTO.ID]) continue;
      var campos = [], assinaturas = [], popsRelacionados = [];
      try { campos = JSON.parse(linha[REGOP_COL_TIPO_DOCUMENTO.CAMPOS_JSON] || '[]'); } catch (e) {}
      try { assinaturas = JSON.parse(linha[REGOP_COL_TIPO_DOCUMENTO.ASSINATURAS_JSON] || '[]'); } catch (e) {}
      try { popsRelacionados = JSON.parse(linha[REGOP_COL_TIPO_DOCUMENTO.POPS_RELACIONADOS_JSON] || '[]'); } catch (e) {}
      tipos.push({
        id: linha[REGOP_COL_TIPO_DOCUMENTO.ID],
        nome: linha[REGOP_COL_TIPO_DOCUMENTO.NOME],
        popsRelacionados: popsRelacionados,
        campos: campos,
        assinaturas: assinaturas,
        abrePendencia: linha[REGOP_COL_TIPO_DOCUMENTO.ABRE_PENDENCIA] === true || String(linha[REGOP_COL_TIPO_DOCUMENTO.ABRE_PENDENCIA]) === 'true',
        tipoFechamentoId: linha[REGOP_COL_TIPO_DOCUMENTO.TIPO_FECHAMENTO_ID] || ''
      });
    }
    tipos.sort(function (a, b) { return a.nome < b.nome ? -1 : (a.nome > b.nome ? 1 : 0); });
    return { ok: true, tipos: tipos };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao listar tipos de documento: " + e.message };
  }
}

/** Busca, na base do módulo PGT e POP (mesmo projeto), o texto real mais recente já gerado pra um código de POP — pra dar contexto melhor à sugestão de campos. Best-effort: nunca lança exceção. */
function RegOp_buscarTextoPopExistente_(codigoPop) {
  if (!codigoPop) return '';
  try {
    var pgtpopDbId = PropertiesService.getScriptProperties().getProperty("PGTPOP_DB_ID");
    if (!pgtpopDbId) return '';
    var db = SpreadsheetApp.openById(pgtpopDbId);
    var aba = db.getSheetByName('MOV_POPS');
    if (!aba) return '';
    var dados = aba.getDataRange().getValues();
    // Layout de MOV_POPS (SGO_PgtPop_Setup.js): ID,DATA,HOSPITAL,CNPJ,PGT_ID,
    // CODIGO_DOCUMENTO,NOME_POP,VERSAO_ATUAL,ROTEIRO,ELABORADO_POR_NOME,TEXTO_GERADO_JSON,...
    var COL_CODIGO = 5, COL_TEXTO_JSON = 10;
    for (var i = dados.length - 1; i >= 1; i--) {
      if (String(dados[i][COL_CODIGO]) === codigoPop) {
        try {
          var textoJson = JSON.parse(dados[i][COL_TEXTO_JSON] || '{}');
          return textoJson.textoGerado || '';
        } catch (e) { return ''; }
      }
    }
    return '';
  } catch (e) {
    return '';
  }
}

/** Sugere campos + assinaturas via IA pra um tipo de documento NOVO (nome livre) — não salva nada, o gestor revisa antes de confirmar (RegOp_apiSalvarTipoDocumento). */
function RegOp_apiSugerirCamposDocumento(payload) {
  payload = payload || {};
  var nome = String(payload.nomeDocumento || '').trim();
  if (!nome) return { ok: false, mensagem: "Nome do tipo de documento não informado." };
  var popsRelacionados = Array.isArray(payload.popsRelacionados) ? payload.popsRelacionados : [];
  try {
    var textoExistente = popsRelacionados.length ? RegOp_buscarTextoPopExistente_(popsRelacionados[0].codigo) : '';
    var resultado = RegOp_sugerirCamposDocumento_(nome, popsRelacionados, payload.roteiro || '', textoExistente);
    return { ok: true, campos: resultado.campos, assinaturas: resultado.assinaturas };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao sugerir campos: " + e.message };
  }
}

/** Salva (cria ou atualiza, se vier "id") um tipo de documento — fica valendo pra qualquer hospital dali pra frente. */
function RegOp_apiSalvarTipoDocumento(payload) {
  payload = payload || {};
  var nome = String(payload.nome || '').trim();
  var campos = Array.isArray(payload.campos) ? payload.campos : [];
  var assinaturas = Array.isArray(payload.assinaturas) ? payload.assinaturas.map(function (a) { return String(a || '').trim(); }).filter(Boolean) : [];
  var popsRelacionados = Array.isArray(payload.popsRelacionados) ? payload.popsRelacionados : [];
  var abrePendencia = !!payload.abrePendencia;
  var tipoFechamentoId = abrePendencia ? String(payload.tipoFechamentoId || '').trim() : '';
  if (!nome) return { ok: false, mensagem: "Nome do tipo de documento não informado." };
  if (!campos.length) return { ok: false, mensagem: "Informe pelo menos 1 campo." };
  if (!assinaturas.length) assinaturas = ['Responsável pelo Registro'];

  try {
    var db = RegOp_getDB_();
    var aba = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.TIPOS_DOCUMENTO);
    var id = String(payload.id || '').trim();
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    var linhaExistente = -1;
    if (id) {
      var dados = aba.getDataRange().getValues();
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][REGOP_COL_TIPO_DOCUMENTO.ID]) === id) { linhaExistente = i + 1; break; }
      }
    }
    var linha = [
      id || RegOp_gerarId_(), nome, JSON.stringify(popsRelacionados), JSON.stringify(campos),
      JSON.stringify(assinaturas), agora, payload.revisadoPor || '',
      abrePendencia, tipoFechamentoId
    ];
    if (linhaExistente > 0) {
      aba.getRange(linhaExistente, 1, 1, linha.length).setValues([linha]);
    } else {
      aba.appendRow(linha);
    }
    return { ok: true, id: linha[0] };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar tipo de documento: " + e.message };
  }
}

/**
 * Exclui um Tipo de Documento. Sem `confirmado`, faz dry-run — só
 * conta quantos registros já foram gerados com esse tipo e devolve
 * pra confirmação do gestor, sem apagar nada. Registros já gerados
 * guardam sua própria cópia de TIPO_DOCUMENTO_NOME/RESPOSTAS_JSON,
 * então continuam íntegros mesmo depois do tipo excluído.
 */
function RegOp_apiExcluirTipoDocumento(payload) {
  payload = payload || {};
  var id = String(payload.id || '').trim();
  if (!id) return { ok: false, mensagem: "ID do tipo de documento não informado." };
  try {
    var db = RegOp_getDB_();

    if (!payload.confirmado) {
      var abaReg = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.REGISTROS);
      var dadosReg = abaReg.getDataRange().getValues();
      var totalRegistros = 0;
      for (var i = 1; i < dadosReg.length; i++) {
        if (String(dadosReg[i][REGOP_COL_REGISTRO.TIPO_DOCUMENTO_ID]) === id) totalRegistros++;
      }
      return { ok: true, precisaConfirmar: true, totalRegistros: totalRegistros };
    }

    var aba = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.TIPOS_DOCUMENTO);
    var dados = aba.getDataRange().getValues();
    for (var j = 1; j < dados.length; j++) {
      if (String(dados[j][REGOP_COL_TIPO_DOCUMENTO.ID]) === id) {
        aba.deleteRow(j + 1);
        return { ok: true };
      }
    }
    return { ok: false, mensagem: "Tipo de documento não encontrado." };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao excluir tipo de documento: " + e.message };
  }
}

/** Melhora a redação de um campo de texto livre via IA — o colaborador revisa antes de aceitar. */
function RegOp_apiMelhorarTextoCampo(payload) {
  payload = payload || {};
  var valorOriginal = String(payload.valorOriginal || '').trim();
  if (!valorOriginal) return { ok: false, mensagem: "Escreva algo no campo antes de pedir a melhoria." };
  try {
    var textoMelhorado = RegOp_melhorarTextoCampo_(payload.rotulo || '', valorOriginal, payload.tipoDocumentoNome || '');
    return { ok: true, textoMelhorado: textoMelhorado };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao melhorar o texto: " + e.message };
  }
}

/** Lista os registros com pendência em aberto (documento que ainda precisa de um fechamento) pra um CNPJ. */
function RegOp_apiListarRegistrosPendentes(payload) {
  payload = payload || {};
  var cnpjBusca = RegOp_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  try {
    var db = RegOp_getDB_();
    var aba = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.REGISTROS);
    var dados = aba.getDataRange().getValues();
    var pendentes = [];
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      if (RegOp_normalizarCnpj_(linha[REGOP_COL_REGISTRO.CNPJ]) !== cnpjBusca) continue;
      if (String(linha[REGOP_COL_REGISTRO.STATUS_PENDENCIA]) !== 'aberto') continue;
      pendentes.push({
        id: linha[REGOP_COL_REGISTRO.ID],
        data: linha[REGOP_COL_REGISTRO.DATA],
        tipoDocumentoId: linha[REGOP_COL_REGISTRO.TIPO_DOCUMENTO_ID],
        tipoDocumentoNome: linha[REGOP_COL_REGISTRO.TIPO_DOCUMENTO_NOME]
      });
    }
    return { ok: true, pendentes: pendentes };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao listar pendências: " + e.message };
  }
}

// ------------------------------------------------------------
// GERAÇÃO DO REGISTRO (preenchimento + documento + PDF, tudo numa
// chamada só — menos round-trips = menos superfície pra bug de
// serialização, lição de 2026-08-14)
// ------------------------------------------------------------

/**
 * payload:
 *   hospital: { razaoSocial, cnpj, cidade, uf }
 *   tipoDocumentoId, tipoDocumentoNome
 *   data: string (opcional, default hoje)
 *   respostas: [{ rotulo, tipo, secao, valor }]
 *   assinaturas: [{ papel, nome, cargo }]
 *   observacoesGerais: string (opcional)
 *   imagens: [{ base64, mimeType, legenda }] (opcional)
 */
function RegOp_apiGerarRegistro(payload, sessionId) {
  payload = payload || {};
  var hospital = payload.hospital || {};
  if (!String(hospital.razaoSocial || '').trim()) {
    return { ok: false, mensagem: "Informe os dados do hospital antes de gerar." };
  }
  var tipoDocumentoId = String(payload.tipoDocumentoId || '').trim();
  var tipoDocumentoNome = String(payload.tipoDocumentoNome || '').trim();
  if (!tipoDocumentoNome) {
    return { ok: false, mensagem: "Informe o tipo de documento." };
  }
  var assinaturas = Array.isArray(payload.assinaturas) ? payload.assinaturas : [];
  if (!assinaturas.length) {
    return { ok: false, mensagem: "Informe ao menos um responsável pela assinatura." };
  }
  for (var a = 0; a < assinaturas.length; a++) {
    if (!String(assinaturas[a].nome || '').trim()) {
      return { ok: false, mensagem: "Preencha o nome de todos os responsáveis pela assinatura." };
    }
  }

  var respostas = Array.isArray(payload.respostas) ? payload.respostas : [];
  var imagens = Array.isArray(payload.imagens) ? payload.imagens.filter(function (im) { return im && im.base64; }) : [];
  var data = String(payload.data || '').trim() || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var registroId = RegOp_gerarId_();
  var fechaRegistroId = String(payload.fechaRegistroId || '').trim();

  var db = RegOp_getDB_();
  var abaReg = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.REGISTROS);
  var dadosReg = abaReg.getDataRange().getValues();

  // Se este registro é um FECHAMENTO de uma pendência, busca os dados
  // do registro de origem pra referenciar no PDF e pra localizar sua
  // linha e marcá-la como 'fechado' depois de gravar este.
  var registroOrigemInfo = null;
  var linhaRegistroOrigem = -1;
  if (fechaRegistroId) {
    for (var r = 1; r < dadosReg.length; r++) {
      if (String(dadosReg[r][REGOP_COL_REGISTRO.ID]) === fechaRegistroId) {
        linhaRegistroOrigem = r + 1;
        registroOrigemInfo = {
          data: dadosReg[r][REGOP_COL_REGISTRO.DATA],
          tipoDocumentoNome: dadosReg[r][REGOP_COL_REGISTRO.TIPO_DOCUMENTO_NOME]
        };
        break;
      }
    }
  }

  // Este tipo de documento abre pendência? Precisa saber pra gravar
  // STATUS_PENDENCIA='aberto' na linha deste novo registro.
  var abrePendencia = false;
  if (tipoDocumentoId) {
    var abaTipos = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.TIPOS_DOCUMENTO);
    var dadosTipos = abaTipos.getDataRange().getValues();
    for (var t = 1; t < dadosTipos.length; t++) {
      if (String(dadosTipos[t][REGOP_COL_TIPO_DOCUMENTO.ID]) === tipoDocumentoId) {
        var valorAbre = dadosTipos[t][REGOP_COL_TIPO_DOCUMENTO.ABRE_PENDENCIA];
        abrePendencia = valorAbre === true || String(valorAbre) === 'true';
        break;
      }
    }
  }

  var dadosDoc = {
    hospital: hospital,
    tipoDocumentoNome: tipoDocumentoNome,
    data: data,
    respostas: respostas,
    assinaturas: assinaturas,
    observacoesGerais: payload.observacoesGerais || '',
    imagens: imagens,
    registroOrigemInfo: registroOrigemInfo
  };

  var html;
  try {
    html = RegOp_montarDocumentoHtml_(dadosDoc);
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }

  var pdfUrl = '', fileName = '';
  try {
    var pasta = RegOp_obterPastaPorCnpj_(hospital.cnpj, hospital.razaoSocial);
    var blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
    fileName = RegOp_sanitizarNomeArquivo_(tipoDocumentoNome) + "_" + RegOp_sanitizarNomeArquivo_(data) + ".pdf";
    blob.setName(fileName);
    var arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    pdfUrl = arquivo.getUrl();
    RegOp_registrarDocumento_({ hospital: hospital.razaoSocial || '', cnpj: hospital.cnpj || '', registroId: registroId }, arquivo);
  } catch (e) {
    // não bloqueia o registro se o auto-save do PDF falhar — o registro
    // já fica salvo na planilha (abaixo) mesmo sem o PDF.
  }

  try {
    // Imagens gravadas só com legenda (sem base64 — célula do Sheets
    // tem limite de 50.000 caracteres); o PDF já guarda a imagem de verdade.
    var imagensMeta = imagens.map(function (im) { return { legenda: im.legenda || '' }; });
    abaReg.appendRow([
      registroId, data, hospital.razaoSocial || '', hospital.cnpj || '',
      tipoDocumentoId, tipoDocumentoNome,
      JSON.stringify(respostas), JSON.stringify(assinaturas),
      payload.observacoesGerais || '', JSON.stringify(imagensMeta), pdfUrl,
      abrePendencia ? 'aberto' : '', fechaRegistroId
    ]);
    if (linhaRegistroOrigem > 0) {
      abaReg.getRange(linhaRegistroOrigem, REGOP_COL_REGISTRO.STATUS_PENDENCIA + 1).setValue('fechado');
    }
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o registro: " + e.message };
  }

  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Só
  // dispara se o PDF realmente foi salvo (pdfUrl pode ficar vazio se o
  // auto-save acima falhou silenciosamente) e se o CNPJ digitado bate com
  // um cliente já cadastrado no Portal (este módulo não usa CAD_CLIENTES
  // como fonte — consulta direto de uma API pública de CNPJ). Nunca
  // derruba o registro se o Auvo estiver fora do ar ou mal configurado.
  if (pdfUrl) {
    try {
      var clienteAuvo = Auvo_resolverClientePorCnpj_(hospital.cnpj);
      if (clienteAuvo) {
        Auvo_criarTarefa_({
          documentoId: registroId,
          titulo: tipoDocumentoNome + ' — ' + (hospital.razaoSocial || ''),
          descricao: 'Registro operacional "' + tipoDocumentoNome + '" gerado em ' + data,
          clienteId: clienteAuvo.ID,
          usuarioId: exigirSessao(sessionId).userId,
          data: data,
          linkPdf: pdfUrl
        });
      }
    } catch (e) {
      SGO_DATA.log('AUVO_TAREFA_FALHOU', '', 'REGOP ' + registroId + ': ' + e.message, 'AUVO');
    }
  }

  return { ok: true, registroId: registroId, html: html, pdfUrl: pdfUrl, fileName: fileName };
}
