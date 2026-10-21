/****************************************************
 * METROLABS  CONVERSOR UNIVERSAL DATALOGGER  V4.6
 * ARQUIVO: Main.gs
 * SISTEMA UNIFICADO: TERMO E ULTRASSONICA
 * FUNCAO:
 * Backend principal do WebApp. Responsável por:
 * - carregar a interface (Index.html)
 * - incluir arquivos HTML auxiliares
 * - rotear chamadas da interface com seguranca
 * - sincronizar parametros (A0 e Cavitacao) com o frontend
 * - receber uploads de arquivos
 * - executar o fluxo principal de conversao/analise
 * - gerar link de exportacao PDF
 ****************************************************/

/**
 * Roteador seguro de funes chamadas pelo frontend.
 */
/** Chamadas que geram documento do ensaio: exigem o vínculo com o cadastro (SGO_QEQ_aplicarVinculoPayload_). */
var LAVREL_FN_COM_VINCULO = ['apiConverter', 'apiGerarRascunhoCertificado', 'apiMontarCertificadoFinal', 'apiEnviarParaAprovacao'];

function LavRel_apiDispatch(req) {
  req = req || {};
  var sessaoDispatchRH = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoDispatchRH, 'o módulo Lavadoras'); // perfil RH: sem documentos técnicos (SGO_Auth.js)

  const fn = String(req.fn || '').trim();
  let payload = req.payload || {};
  // 21/10/2026 (fluxo cliente → unidade → equipamento, molde da autoclave): documento do ensaio só com o
  // equipamento escolhido no cadastro; cliente, CNPJ, endereço, TAG e nº de série vêm do cadastro
  // (equipamento de outro cliente é recusado). Relatório interno (dados reconstituídos) fica de fora.
  if (LAVREL_FN_COM_VINCULO.indexOf(fn) >= 0 && !payload.modoRelatorioSimulado && typeof SGO_QEQ_aplicarVinculoPayload_ === 'function') {
    payload = SGO_QEQ_aplicarVinculoPayload_(String(req.sessionId || ''), payload);
  }

  const allow = {
    apiPing: LavRel_apiPing,
    apiPreviewEntrada: LavRel_apiPreviewEntrada,
    apiConverter: LavRel_apiConverter,
    apiUploadArquivo: LavRel_apiUploadArquivo,
    apiConsultarCnpj: LavRel_apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: LavRel_apiValidarSenhaSimuladorAdmin,
    apiGerarRascunhoCertificado: LavRel_apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: LavRel_apiMontarCertificadoFinal,
    // Aprovação do responsável técnico (21/10/2026, SGO_QualifEmissao.js)
    apiEnviarParaAprovacao: LavRel_apiEnviarParaAprovacao,
    apiListarAprovacoes: LavRel_apiListarAprovacoes,
    apiPreverAprovacao: LavRel_apiPreverAprovacao,
    apiAprovarEmitir: LavRel_apiAprovarEmitir,
    apiDevolverAprovacao: LavRel_apiDevolverAprovacao
  };

  if (!fn) {
    throw new Error('Função não informada.');
  }

  if (!allow[fn] || typeof allow[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }

  return allow[fn](payload, sessaoDispatchRH);
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO COM A INTERFACE
// ------------------------------------------------------------

function LavRel_apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  LavRel_validarSenhaSimuladorAdmin_(payload.senha);
  return { ok: true };
}
function LavRel_apiPing(payload, sessao) {
  const laudosId = (LavRel_UCFG.LAUDOS_FOLDER_ID && String(LavRel_UCFG.LAUDOS_FOLDER_ID).length > 10)
    ? String(LavRel_UCFG.LAUDOS_FOLDER_ID).trim()
    : '';

  const uploadsId = (LavRel_UCFG.UPLOAD_FOLDER_ID && String(LavRel_UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(LavRel_UCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  const idleTimeout = Number(LavRel_UCFG.IDLE_TIMEOUT_MINUTES);
  const logoFileId = String(LavRel_UCFG.LOGO_FILE_ID || '').trim();
  const analiseCfg = LavRel_UCFG.ANALISE || {};
  const validacaoTempoCfg = LavRel_UCFG.VALIDACAO_TEMPO || {};

  return {
    ok: true,
    versao: String(LavRel_UCFG.VERSION || 'V4.6') + ' Oficial',
    appTitle: LavRel_UCFG.APP_TITLE || 'METROLABS',
    tz: LavRel_UCFG.TZ || Session.getScriptTimeZone(),
    ts: Utilities.formatDate(new Date(), LavRel_UCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    idleTimeout: isFinite(idleTimeout) && idleTimeout > 0 ? idleTimeout : 5,
    defaultDateStyle: String(LavRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase(),
    defaultNSensores: Number(LavRel_UCFG.DEFAULT_N || 12),
    motoresDisponiveis: Object.keys(LavRel_UCFG.CICLOS || {}),
    // 21/10/2026: modelo da planilha de dados, se a sessão aprova a emissão e pastas que existem de fato
    // (a pasta fixa do Google Drive antigo não existe no servidor).
    planilhaModelo: typeof LavRel_planilhaModelo_ === 'function' ? LavRel_planilhaModelo_() : 'NOVO',
    podeAprovarEmissao: !!(sessao && typeof LavRel_lvEhAprovador_ === 'function' && LavRel_lvEhAprovador_(sessao)),
    laudosUrl: LavRel_urlPastaExistente_(laudosId, 'LAVREL_LAUDOS_FOLDER_ID'),
    uploadsUrl: LavRel_urlPastaExistente_(uploadsId, 'LAVREL_UPLOAD_PASTA_ID'),
    logoFileId: logoFileId,
    simuladorAdmin: {
      habilitado: !!((LavRel_UCFG.SIMULADOR_ADMIN || {}).habilitado),
      intervaloSegundos: Number((LavRel_UCFG.SIMULADOR_ADMIN || {}).intervaloSegundos || 30)
    },
    analise: {
      tempMinGlobal: LavRel_parseFloatSeguro_(analiseCfg.tempMinGlobal, 20.0),
      tempMaxGlobal: LavRel_parseFloatSeguro_(analiseCfg.tempMaxGlobal, 100.0),
      histereseTemperatura: LavRel_parseFloatSeguro_(analiseCfg.histereseTemperatura, 0.5),
      consecutivasInicio: LavRel_clampIntSeguro_(analiseCfg.consecutivasInicio, 1, 20, 2),
      consecutivasFim: LavRel_clampIntSeguro_(analiseCfg.consecutivasFim, 1, 20, 3),
      toleranciaEntrada: LavRel_parseFloatSeguro_(analiseCfg.toleranciaEntrada, 0),
      toleranciaSaida: LavRel_parseFloatSeguro_(analiseCfg.toleranciaSaida, 0.5),
      modoReconhecimentoExposicao: String(analiseCfg.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase(),
      percentualMinimoSensores: LavRel_limitarNumeroSeguro_(analiseCfg.percentualMinimoSensores, 0.01, 1, 1),
      permitirOverrideManual: !!analiseCfg.permitirOverrideManual,
      permitirOverrideCiclo: !!analiseCfg.permitirOverrideCiclo,
      permitirOverrideExposicao: !!analiseCfg.permitirOverrideExposicao
    },
    validacaoTempo: {
      permitirReconstrucaoTempo: !!validacaoTempoCfg.permitirReconstrucaoTempo,
      maxTimestampsIguaisSequenciais: LavRel_clampIntSeguro_(validacaoTempoCfg.maxTimestampsIguaisSequenciais, 1, 100, 3),
      maxSaltosMinutos: LavRel_clampIntSeguro_(validacaoTempoCfg.maxSaltosMinutos, 1, 10000, 120),
      intervaloEsperadoMin: LavRel_parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMin, 0.1),
      intervaloEsperadoMax: LavRel_parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMax, 10)
    }
  };
}

// ------------------------------------------------------------
// UPLOAD DE ARQUIVO PARA PASTA DE UPLOADS
// ------------------------------------------------------------

function LavRel_apiUploadArquivo(payload) {
  payload = payload || {};

  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.txt').trim();
  const fileName = LavRel_sanitizarNomeArquivo_(fileNameOriginal || 'arquivo_sem_nome.txt');
  const mimeType = String(payload.mimeType || MimeType.PLAIN_TEXT).trim();
  const base64 = String(payload.base64 || '').trim();

  if (!base64) {
    throw new Error('Conteúdo do arquivo não recebido para upload.');
  }

  const folderId = (LavRel_UCFG.UPLOAD_FOLDER_ID && String(LavRel_UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(LavRel_UCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = LavRel_pastaUploads_(folderId);
    const file = folder.createFile(blob);

    return {
      ok: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl()
    };
  } catch (err) {
    throw new Error('Falha ao enviar arquivo para a pasta de uploads: ' + err.message);
  }
}

// ------------------------------------------------------------
// LEITURA DO MODO "UM ARQUIVO POR SENSOR" (registradores individuais)
// ------------------------------------------------------------

/**
 * 21/10/2026 (molde da autoclave): cada sensor ativo tem o seu arquivo (payload.arquivosPorSensor[s],
 * alinhado com a grade de sensores da tela). As séries são alinhadas pela linha do tempo mais completa
 * (SGO_QT_mesclarSeries_, tolerância de metade do intervalo mediano); leitura sem correspondência fica
 * vazia e vira trava se cair na fase avaliada. Devolve { linhas, resumo } (resumo vai para o anexo do documento).
 */
function LavRel_lerEMesclarPorSensor_(payload, nSensores, sensoresAtivos, dateStyle) {
  const arquivos = Array.isArray(payload.arquivosPorSensor) ? payload.arquivosPorSensor : [];
  const delim = String(payload.delimManual || 'AUTO').toUpperCase().trim();
  const series = [];
  for (let s = 0; s < nSensores; s++) {
    if (!sensoresAtivos[s]) { series.push(null); continue; }
    const id = String(arquivos[s] || '').trim();
    if (!id) throw new Error('O sensor S' + (s + 1) + ' está marcado como ativo, mas não tem arquivo. Envie o arquivo do registrador desse sensor no campo dele ou desmarque o sensor.');
    let linhas;
    try {
      const rich = LavRel_lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: id, delimManual: delim });
      linhas = LavRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
    } catch (e) {
      throw new Error('Arquivo do sensor S' + (s + 1) + ': ' + e.message);
    }
    series.push(linhas.map(function(l) { return { tempoDate: l.tempoDate, tempoStr: l.tempoStr, valor: l.temperaturas[0] }; }));
  }
  const mesc = SGO_QT_mesclarSeries_(series);
  return {
    linhas: mesc.linhas.map(function(l) { return { tempoStr: l.tempoStr, tempoDate: l.tempoDate, temperaturas: l.valores.slice(0, nSensores), pressao: null }; }),
    resumo: {
      referencia: 'S' + (mesc.referencia + 1),
      toleranciaSeg: Math.round(mesc.toleranciaMs / 100) / 10,
      sensores: mesc.resumo.map(function(r, s) { return r ? Object.assign({ sensor: 'S' + (s + 1) }, r) : null; }).filter(Boolean)
    }
  };
}

// ------------------------------------------------------------
// PRÉ-VISUALIZAÇÃO
// ------------------------------------------------------------

function LavRel_apiPreviewEntrada(payload) {
  payload = payload || {};

  const modoEntradaNormalizado = String(payload.modoEntrada || '').toUpperCase().trim();

  if (modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR') {
    const nSensores = LavRel_clampIntSeguro_(payload.nSensores, 1, 60, LavRel_UCFG.DEFAULT_N || 12);
    const sensoresAtivos = LavRel_normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
    const dateStylePrev = String(payload.dateStyle || LavRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
    const mesc = LavRel_lerEMesclarPorSensor_(payload, nSensores, sensoresAtivos, dateStylePrev);
    const headerMulti = ['Tempo'].concat(Array.from({ length: nSensores }, function(_, i) { return 'S' + (i + 1); }));
    const previewMulti = [headerMulti].concat(mesc.linhas.slice(0, LavRel_UCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas.map(function(t) { return t === null ? '' : t; }));
    }));
    return {
      ok: true,
      rows: mesc.linhas.length,
      cols: headerMulti.length,
      preview: previewMulti,
      diagnostico: {
        modoEntrada: 'ARQUIVO_POR_SENSOR',
        qtdTemperaturas: mesc.resumo.sensores.length,
        observacao: 'Arquivos de ' + mesc.resumo.sensores.length + ' sensor(es) alinhados pela linha do tempo do ' + mesc.resumo.referencia +
          ' (tolerância de ' + SGO_DocA4_num_(mesc.resumo.toleranciaSeg, 1) + ' s). Leituras sem correspondência: ' +
          mesc.resumo.sensores.map(function(r) { return r.sensor + ' ' + r.semCorrespondencia; }).join(', ') + '. Maior defasagem de relógio: ' +
          mesc.resumo.sensores.map(function(r) { return r.sensor + ' ' + SGO_DocA4_num_(r.maiorDefasagemSeg, 0) + ' s'; }).join(', ') + '.'
      }
    };
  }

  const simuladoAdmin = modoEntradaNormalizado === 'SIMULADO_ADMIN';
  const rich = simuladoAdmin
    ? LavRel_gerarDadosSimuladosAdminLavadoras_(payload)
    : LavRel_lerDadosEntradaRich_(payload);
  const bruto = simuladoAdmin ? (rich.preview || []) : (rich.displayMatrix || rich.matrix || []);

  if (!bruto || !bruto.length) {
    throw new Error('A planilha retornou vazia. Verifique os dados fornecidos.');
  }

  const previewRows = bruto.slice(0, LavRel_UCFG.PREVIEW_ROWS || 20);
  const maxCols = previewRows.reduce(function(m, r) {
    return Math.max(m, Array.isArray(r) ? r.length : 0);
  }, 0);

  const preview = previewRows.map(function(row) {
    const arr = Array.isArray(row) ? row : [row];
    const out = [];
    for (let i = 0; i < maxCols; i++) {
      out.push(typeof arr[i] === 'undefined' ? '' : arr[i]);
    }
    return out;
  });

  let diagnostico = {};
  try {
    diagnostico = rich.diagnostico || LavRel_diagnosticarEstruturaEntrada_(rich.matrix || bruto, rich.displayMatrix || bruto) || {};
  } catch (e) {
    diagnostico = {
      erroDiagnostico: e.message
    };
  }

  return {
    ok: true,
    rows: bruto.length,
    cols: maxCols,
    preview: preview,
    diagnostico: diagnostico
  };
}

// ------------------------------------------------------------
// CEREBRO PRINCIPAL DO CONVERSOR
// ------------------------------------------------------------

/**
 * Pipeline reaproveitável: leitura + normalização + análise do ciclo
 * (Termodesinfectora/A0 ou Ultrassônica/tempo de cavitação). Compartilhado
 * pelo laudo em Planilha (LavRel_apiConverter) e pela Interpretação
 * Técnica do Ensaio (LavRel_CertificadoRelatorio.js).
 */
function LavRel_lvExecutarAnaliseCompleta_(payload) {
  payload = payload || {};

  const nSensores = LavRel_clampIntSeguro_(payload.nSensores, 1, 60, LavRel_UCFG.DEFAULT_N || 12);
  const motor = String(payload.motor || 'TERMO').trim();
  const offsetTemp = LavRel_parseFloatSeguro_(payload.offsetTemp, 0.0);

  // Usa o novo parametro unificado de offset
  const offsetParametro = LavRel_parseFloatSeguro_(payload.offsetParametro || payload.offsetF0, 0.0);
  const dateStyle = String(payload.dateStyle || LavRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  if (!LavRel_UCFG.CICLOS || !LavRel_UCFG.CICLOS[motor]) {
    throw new Error('Equipamento/ciclo inválido ou não configurado: ' + motor);
  }

  const sensoresAtivos = LavRel_normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const modoEntradaNormalizado = String(payload.modoEntrada || '').toUpperCase().trim();
  const simuladoAdmin = modoEntradaNormalizado === 'SIMULADO_ADMIN';
  const arquivoPorSensor = modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR';
  // Relatório interno: a temperatura alvo da simulação vale como programada quando a tela não informou.
  if (simuladoAdmin && !String(payload.setpoint || '').trim() && payload.simulacao && payload.simulacao.temperaturaAlvo) payload.setpoint = payload.simulacao.temperaturaAlvo;
  const opcoesAnalise = LavRel_normalizarOpcoesAnaliseMain_(payload);

  let rich = null;
  let dadosNormalizados;

  if (simuladoAdmin) {
    rich = LavRel_gerarDadosSimuladosAdminLavadoras_(payload);
    if (!rich || !(rich.rows && rich.rows.length)) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosNormalizados = rich.rows;
  } else if (arquivoPorSensor) {
    const mesc = LavRel_lerEMesclarPorSensor_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosNormalizados = mesc.linhas;
    payload._mesclagem = mesc.resumo;
  } else {
    rich = LavRel_lerDadosEntradaRich_(payload);
    if (!rich || !(rich.matrix && rich.matrix.length)) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosNormalizados = LavRel_normalizarMatrizParaAnalise(
      rich.matrix,
      rich.displayMatrix,
      nSensores,
      dateStyle
    );
  }

  if (!dadosNormalizados || !dadosNormalizados.length) {
    throw new Error('Não foi possível normalizar os dados para análise.');
  }

  // 21/10/2026: grandeza complementar. Por padrão o ensaio é só de temperatura; a coluna de pressão
  // (aspersão ou bomba) só entra, como informação sem critério, se "Analisar pressão" estiver ligado.
  if (!LavRel_analisaPressao_(payload)) {
    dadosNormalizados = dadosNormalizados.map(function(r) { return Object.assign({}, r, { pressao: null }); });
  }

  if (simuladoAdmin) {
    const sim = payload.simulacao || {};
    opcoesAnalise.overrideJanela = {
      habilitado: true,
      inicioCiclo: sim.inicioCiclo || '',
      fimCiclo: sim.fimCiclo || '',
      inicioExposicao: sim.inicioFasePrincipal || '',
      fimExposicao: sim.fimFasePrincipal || ''
    };
  }

  const analise = LavRel_analisarCiclo(
    dadosNormalizados,
    motor,
    offsetTemp,
    offsetParametro,
    sensoresAtivos,
    opcoesAnalise
  );

  if (!analise) {
    throw new Error('A rotina de análise não retornou resultado.');
  }

  if (simuladoAdmin) {
    payload.modoRelatorioSimulado = true;
    payload.simulacaoMeta = rich.meta || {};
    LavRel_aplicarMarcacaoRelatorioSimuladoLavadoras_(analise, payload);
  }

  return {
    payload: payload,
    motor: motor,
    cicloCfg: LavRel_UCFG.CICLOS[motor],
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosNormalizados: dadosNormalizados,
    analise: analise,
    opcoesAnalise: opcoesAnalise
  };
}

/**
 * Botão "Gerar planilha de dados" (21/10/2026). Modelo NOVO (padrão): documento A4 em paisagem em
 * HTML + PDF com aprovação do responsável técnico (SGO_LavRel_PlanilhaDados.js). Modelo ANTERIOR
 * (Google Planilhas, abaixo): preservado sem mudança de leiaute e usado só se o responsável pelo
 * sistema gravar LAVREL_PLANILHA_MODELO = ANTERIOR em Chaves e senhas.
 */
function LavRel_apiConverter(payload, sessao) {
  if (typeof LavRel_planilhaModelo_ === 'function' && LavRel_planilhaModelo_() !== 'ANTERIOR') return LavRel_apiGerarPlanilhaDados(payload, sessao);
  return LavRel_apiConverterModeloAnterior_(payload);
}

/** Modelo anterior da planilha de dados (Google Planilhas → PDF em paisagem). */
function LavRel_apiConverterModeloAnterior_(payload) {
  const pipeline = LavRel_lvExecutarAnaliseCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analise = pipeline.analise;
  // Dado com problema não vira documento (21/10/2026).
  if (!payload.modoRelatorioSimulado) LavRel_exigirSemTravas_((analise.qualidadeDados || {}).travas);

  const infoPlanilha = LavRel_gerarPlanilhaAuditoria(dadosNormalizados, analise, payload);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha de auditoria.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);

  LavRel_gerarGraficosAuditoria(ss, analise, nSensores);

  SpreadsheetApp.flush();

  const pdfUrl = LavRel_construirLinkPdfPaisagem(infoPlanilha.spreadsheetId);
  // Regra do dono: o PDF da planilha (relatório de dados) também fica na pasta do cliente. Nunca lança.
  const salvoPlanilha = SGO_DocSalvar_salvarPdfPlanilha_(pdfUrl, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('LAVREL_LAUDOS_FOLDER_ID', 'Lavadora - Laudos', LavRel_UCFG.LAUDOS_FOLDER_ID);
  }, 'Relatório de dados Lavadora', LavRel_UCFG.TZ);

  return {
    ok: true,
    aprovado: !!analise.aprovado,
    statusAprovacao: analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO'),
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
    salvoNaPasta: salvoPlanilha.salvoNaPasta,
    pdfId: salvoPlanilha.pdfId,
    pdfSalvoUrl: salvoPlanilha.pdfSalvoUrl,
    pdfNome: salvoPlanilha.pdfNome,
    pastaUrl: salvoPlanilha.pastaUrl,
    avisoSalvar: salvoPlanilha.avisoSalvar,
    analiseResumo: {
      // Parametros Termodesinfectora (A0)
      minA0: analise.minA0 || 0,
      mediaA0: analise.mediaA0 || 0,
      maxA0: analise.maxA0 || 0,
      piorSensorA0: analise.piorSensorA0 || null,

      // Parametros Lavadora Ultrassonica
      tempoCavitacao: analise.tempoCavitacao || 0,

      // Parametros Comuns
      tempoExposicaoMinutos: analise.tempoExposicaoMinutos,
      tempoTotalMinutos: analise.tempoTotalMinutos,
      tempoInicioExposicao: analise.tempoInicioExposicao || '',
      tempoFimExposicao: analise.tempoFimExposicao || '',
      tempoInicioCiclo: analise.tempoInicioCiclo || '',
      tempoFimCiclo: analise.tempoFimCiclo || '',
      quantidadeSensoresInstalados: analise.quantidadeSensoresInstalados,
      quantidadeSensoresUtilizados: analise.quantidadeSensoresUtilizados,
      sensoresUtilizados: analise.sensoresUtilizados || [],
      sensoresDesabilitados: analise.sensoresDesabilitados || [],
      
      piorSensorTemperatura: analise.piorSensorTemperatura || null,
      origemJanelaCiclo: analise.origemJanelaCiclo || 'AUTO',
      origemJanelaExposicao: analise.origemJanelaExposicao || 'AUTO',
      configuracaoDeteccaoExposicao: analise.configuracaoDeteccaoExposicao || {},
      limitesAprovacao: analise.limitesAprovacao || {},
      observacoesAnalise: analise.observacoesAnalise || [],
      alertasAnalise: analise.alertasAnalise || [],
      motivosReprovacao: analise.motivosReprovacao || [],
      deltaMinutosEstimado: analise.deltaMinutosEstimado || 0,
      faseInicioRampa: typeof analise.faseInicioRampa === 'number' ? analise.faseInicioRampa : -1,
      faseInicioExp: typeof analise.faseInicioExp === 'number' ? analise.faseInicioExp : -1,
      faseFimExp: typeof analise.faseFimExp === 'number' ? analise.faseFimExp : -1,
      fasesProcesso: analise.fasesProcesso || null,
      modoRelatorioSimulado: !!payload.modoRelatorioSimulado
    }
  };
}

// ------------------------------------------------------------
// LINK DE EXPORTAÇÃO PDF
// ------------------------------------------------------------

function LavRel_construirLinkPdfPaisagem(id) {
  id = String(id || '').trim();

  if (!id) {
    throw new Error('ID da planilha não informado para geração do PDF.');
  }

  const urlBase = 'https://docs.google.com/spreadsheets/d/' + id + '/export?';
  const parametros = [
    'exportFormat=pdf',
    'format=pdf',
    'size=A4',
    'portrait=false',
    'fitw=true',
    'sheetnames=false',
    'printtitle=false',
    'pagenum=CENTER',
    'gridlines=false',
    'fzr=false',
    'top_margin=0.30',
    'bottom_margin=0.30',
    'left_margin=0.25',
    'right_margin=0.25'
  ].join('&');

  return urlBase + parametros;
}

// ------------------------------------------------------------
// HELPERS LOCAIS DE SEGURANCA
// ------------------------------------------------------------

function LavRel_parseFloatSeguro_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : fallback;
}

function LavRel_clampIntSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;

  n = Math.round(n);

  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function LavRel_limitarNumeroSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function LavRel_normalizarSensoresAtivosMain_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({ length: nSensores }, function() {
      return true;
    });
  }

  const out = [];
  for (let i = 0; i < nSensores; i++) {
    if (typeof sensoresAtivos[i] === 'undefined') {
      out.push(true);
    } else {
      out.push(!!sensoresAtivos[i]);
    }
  }

  return out;
}

function LavRel_sanitizarNomeArquivo_(nome) {
  return String(nome || 'arquivo_sem_nome.txt')
    .replace(/[\\\/:*?"<>|#%]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------
// NORMALIZAÇÃO DAS OPÇÕES NOVAS DE ANÁLISE
// ------------------------------------------------------------

function LavRel_normalizarOpcoesAnaliseMain_(payload) {
  payload = payload || {};

  const cfgAnalise = LavRel_UCFG.ANALISE || {};
  const permitirOverrideManual = !!cfgAnalise.permitirOverrideManual;
  const permitirOverrideCiclo = !!cfgAnalise.permitirOverrideCiclo;
  const permitirOverrideExposicao = !!cfgAnalise.permitirOverrideExposicao;

  const robustezIn = payload.robustez || {};
  const overrideIn = payload.overrideJanela || {};

  const robustez = {
    histereseTemperatura: LavRel_parseFloatOpcionalSeguro_(robustezIn.histereseTemperatura),
    consecutivasInicio: LavRel_clampIntOpcionalSeguro_(robustezIn.consecutivasInicio, 1, 20),
    consecutivasFim: LavRel_clampIntOpcionalSeguro_(robustezIn.consecutivasFim, 1, 20),
    toleranciaEntrada: LavRel_parseFloatOpcionalSeguro_(robustezIn.toleranciaEntrada),
    toleranciaSaida: LavRel_parseFloatOpcionalSeguro_(robustezIn.toleranciaSaida),
    modoReconhecimentoExposicao: LavRel_normalizarTextoOpcional_(robustezIn.modoReconhecimentoExposicao).toUpperCase(),
    percentualMinimoSensores: LavRel_limitarNumeroOpcionalSeguro_(robustezIn.percentualMinimoSensores, 0.01, 1)
  };

  if (!robustez.modoReconhecimentoExposicao) {
    delete robustez.modoReconhecimentoExposicao;
  }

  const overrideJanela = {
    habilitado: permitirOverrideManual && !!overrideIn.habilitado,

    inicioCiclo: permitirOverrideCiclo ? LavRel_normalizarTextoOpcional_(overrideIn.inicioCiclo) : '',
    fimCiclo: permitirOverrideCiclo ? LavRel_normalizarTextoOpcional_(overrideIn.fimCiclo) : '',

    inicioExposicao: permitirOverrideExposicao ? LavRel_normalizarTextoOpcional_(overrideIn.inicioExposicao) : '',
    fimExposicao: permitirOverrideExposicao ? LavRel_normalizarTextoOpcional_(overrideIn.fimExposicao) : ''
  };

  return {
    robustez: robustez,
    overrideJanela: overrideJanela,
    setpoint: LavRel_parseFloatOpcionalSeguro_(payload.setpoint),
    // Classificação do artigo processado (termodesinfecção): CRITICO → A0 ≥ 3.000 s; demais → A0 ≥ 600 s.
    classeArtigo: String(payload.classeArtigo || '').toUpperCase() === 'CRITICO' ? 'CRITICO' : 'SEMICRITICO'
  };
}

function LavRel_clampIntOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;

  let n = Number(valor);
  if (!isFinite(n)) return undefined;

  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function LavRel_parseFloatOpcionalSeguro_(valor) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : undefined;
}

function LavRel_limitarNumeroOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  let n = Number(valor);
  if (!isFinite(n)) return undefined;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function LavRel_normalizarTextoOpcional_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function LavRel_aplicarMarcacaoRelatorioSimuladoLavadoras_(analise, payload) {
  analise = analise || {};
  payload = payload || {};
  analise.modoRelatorioSimulado = true;
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.simulacaoMeta = payload.simulacaoMeta || {};
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];

  const aviso = (LavRel_UCFG.SIMULADOR_ADMIN && LavRel_UCFG.SIMULADOR_ADMIN.avisoRelatorio)
    ? LavRel_UCFG.SIMULADOR_ADMIN.avisoRelatorio
    : 'RELATÓRIO INTERNO - DADOS RECONSTITUÍDOS E ANALISADOS MANUALMENTE PELO LABORATÓRIO DE METROLOGIA';

  if (analise.observacoesAnalise.indexOf(aviso) === -1) {
    analise.observacoesAnalise.unshift(aviso);
  }
}


function LavRel_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = LavRel_somenteDigitosMain_(payload.cnpj);

  if (cnpj.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  const endereco = LavRel_montarEnderecoCnpjMain_(data);
  return {
    ok: true,
    cnpj: LavRel_formatarCnpjMain_(cnpj),
    razaoSocial: data.razao_social || data.nome || '',
    nomeFantasia: data.nome_fantasia || '',
    endereco: endereco,
    cidade: data.municipio || '',
    uf: data.uf || '',
    telefone: data.ddd_telefone_1 || data.telefone || '',
    email: data.email || '',
    atividadePrincipal: data.cnae_fiscal_descricao || '',
    situacao: data.descricao_situacao_cadastral || data.situacao_cadastral || ''
  };
}

function LavRel_somenteDigitosMain_(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function LavRel_formatarCnpjMain_(cnpj) {
  cnpj = LavRel_somenteDigitosMain_(cnpj);
  if (cnpj.length !== 14) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function LavRel_montarEnderecoCnpjMain_(data) {
  data = data || {};
  const partes = [];
  const logradouro = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim();
  if (logradouro) partes.push(logradouro);
  if (data.numero) partes.push('n. ' + data.numero);
  if (data.complemento) partes.push(data.complemento);
  if (data.bairro) partes.push(data.bairro);
  const cidadeUf = [data.municipio, data.uf].filter(Boolean).join(' / ');
  if (cidadeUf) partes.push(cidadeUf);
  if (data.cep) partes.push('CEP ' + String(data.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2'));
  return partes.join(', ');
}




/**
 * Pasta das planilhas enviadas para leitura (20/10/2026). A pasta fixa da configuração era do Google Drive antigo e não
 * existe no servidor novo: o envio falhava com "Não foi possível encontrar a pasta". Usa a pasta configurada quando ela
 * existe; senão, a pasta própria "Lavadora - Planilhas enviadas" (criada uma vez, endereço guardado em LAVREL_UPLOAD_PASTA_ID).
 */
function LavRel_pastaUploads_(folderIdConfigurado) {
  if (folderIdConfigurado) {
    try { return DriveApp.getFolderById(folderIdConfigurado); } catch (e) { /* pasta antiga não existe aqui: segue para a própria */ }
  }
  const props = PropertiesService.getScriptProperties();
  const idSalvo = props.getProperty('LAVREL_UPLOAD_PASTA_ID');
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* apagada: cria de novo */ }
  }
  const pasta = DriveApp.getRootFolder().createFolder('Lavadora - Planilhas enviadas');
  props.setProperty('LAVREL_UPLOAD_PASTA_ID', pasta.getId());
  return pasta;
}


// ------------------------------------------------------------
// 21/10/2026 — pastas, grandeza complementar e travas (molde da autoclave)
// ------------------------------------------------------------

/** Endereço da pasta que existe de fato (configurada ou a própria do módulo); '' se nenhuma existe ainda. Não cria pasta. */
function LavRel_urlPastaExistente_(idConfigurado, propKey) {
  const ids = [String(idConfigurado || '').trim()];
  try { ids.push(String(PropertiesService.getScriptProperties().getProperty(propKey) || '').trim()); } catch (e) {}
  for (let i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    try { return DriveApp.getFolderById(ids[i]).getUrl(); } catch (e) { /* pasta do Google Drive antigo: não existe aqui */ }
  }
  return '';
}

/**
 * Seletor "Analisar pressão (aspersão ou bomba)" — desligado por padrão: a qualificação térmica da
 * lavadora é feita pela temperatura. Ligado, a pressão registrada aparece no documento como informação,
 * sem critério de aceitação (nenhum limite configurado).
 */
function LavRel_analisaPressao_(payload) {
  payload = payload || {};
  return payload.analisarPressao === true || String(payload.analisarPressao).toLowerCase() === 'true';
}

/** Trava de emissão: dado com problema não vira documento. Lança erro com a lista do que corrigir. */
function LavRel_exigirSemTravas_(travas) {
  if (!travas || !travas.length) return;
  throw new Error('O documento não foi emitido porque os dados têm ' + travas.length + ' problema(s) a corrigir: ' +
    travas.map(function(t, i) { return (i + 1) + ') ' + t.oQue + ' Por quê: ' + t.porQue + ' Como corrigir: ' + t.comoCorrigir; }).join(' '));
}
