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
function LavRel_apiDispatch(req) {
  req = req || {};
  var sessaoDispatchRH = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoDispatchRH, 'o módulo Lavadoras'); // perfil RH: sem documentos técnicos (SGO_Auth.js)

  const fn = String(req.fn || '').trim();
  const payload = req.payload || {};

  const allow = {
    apiPing: LavRel_apiPing,
    apiPreviewEntrada: LavRel_apiPreviewEntrada,
    apiConverter: LavRel_apiConverter,
    apiUploadArquivo: LavRel_apiUploadArquivo,
    apiConsultarCnpj: LavRel_apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: LavRel_apiValidarSenhaSimuladorAdmin,
    apiGerarRascunhoCertificado: LavRel_apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: LavRel_apiMontarCertificadoFinal
  };

  if (!fn) {
    throw new Error('Função não informada.');
  }

  if (!allow[fn] || typeof allow[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }

  return allow[fn](payload);
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO COM A INTERFACE
// ------------------------------------------------------------

function LavRel_apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  LavRel_validarSenhaSimuladorAdmin_(payload.senha);
  return { ok: true };
}
function LavRel_apiPing() {
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
    laudosUrl: laudosId ? ('https://drive.google.com/drive/folders/' + laudosId) : '',
    uploadsUrl: uploadsId ? ('https://drive.google.com/drive/folders/' + uploadsId) : '',
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

  if (!folderId) {
    throw new Error('UPLOAD_FOLDER_ID não configurado.');
  }

  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = DriveApp.getFolderById(folderId);
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
// LEITURA DO MODO "UM ARQUIVO POR SENSOR" (datalogger individual)
// ------------------------------------------------------------

/**
 * Lê um arquivo por sensor ativo (payload.arquivosPorSensor, alinhado
 * por índice com a grade de sensores da tela) e normaliza cada um como
 * uma série de 1 sensor só, reaproveitando LavRel_lerDadosEntradaRich_ e
 * LavRel_normalizarMatrizParaAnalise sem mudança — o mesmo parser do modo de
 * arquivo único já lida com o formato Tempo+Temperatura (a coluna
 * "Numero"/índice do datalogger individual é simplesmente ignorada,
 * pois não bate com nenhum padrão de coluna reconhecido).
 * Sensores inativos ficam com série null (não exigem arquivo).
 */
function LavRel_lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle) {
  const arquivos = Array.isArray(payload.arquivosPorSensor) ? payload.arquivosPorSensor : [];
  const delimManual = String(payload.delimManual || 'AUTO').toUpperCase().trim();

  const series = [];
  for (let s = 0; s < nSensores; s++) {
    if (!sensoresAtivos[s]) {
      series.push(null);
      continue;
    }

    const fileId = String(arquivos[s] || '').trim();
    if (!fileId) {
      throw new Error('Sensor S' + (s + 1) + ' está marcado como ativo, mas nenhum arquivo foi informado para ele (modo "um arquivo por sensor").');
    }

    const rich = LavRel_lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: fileId, delimManual: delimManual });
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler o arquivo do sensor S' + (s + 1) + '.');
    }

    let serieSensor;
    try {
      serieSensor = LavRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
    } catch (e) {
      throw new Error('Falha ao normalizar o arquivo do sensor S' + (s + 1) + ': ' + e.message);
    }

    series.push(serieSensor);
  }

  return series;
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

    const seriesPorSensor = LavRel_lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStylePrev);
    const mesclado = LavRel_mesclarSeriesPorSensor_(seriesPorSensor);

    const headerMulti = ['Tempo'].concat(Array.from({ length: nSensores }, function(_, i) { return 'S' + (i + 1); }));
    const previewMulti = [headerMulti].concat(mesclado.slice(0, LavRel_UCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas || []);
    }));

    const nulosPorSensor = Array.from({ length: nSensores }, function(_, s) {
      return mesclado.reduce(function(acc, row) { return acc + (row.temperaturas[s] === null ? 1 : 0); }, 0);
    });

    return {
      ok: true,
      rows: mesclado.length,
      cols: headerMulti.length,
      preview: previewMulti,
      diagnostico: {
        modoEntrada: 'ARQUIVO_POR_SENSOR',
        qtdTemperaturas: nSensores,
        observacao: 'Séries de ' + seriesPorSensor.filter(function(s) { return s; }).length +
          ' sensor(es) mescladas pela linha do tempo mais completa. Pontos sem correspondência por sensor (S1..S' + nSensores + '): ' +
          nulosPorSensor.join(', ') + '.'
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
  const opcoesAnalise = LavRel_normalizarOpcoesAnaliseMain_(payload);

  const modoEntradaNormalizado = String(payload.modoEntrada || '').toUpperCase().trim();
  const simuladoAdmin = modoEntradaNormalizado === 'SIMULADO_ADMIN';
  const arquivoPorSensor = modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR';

  let rich = null;
  let dadosNormalizados;

  if (simuladoAdmin) {
    rich = LavRel_gerarDadosSimuladosAdminLavadoras_(payload);
    if (!rich || !(rich.rows && rich.rows.length)) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosNormalizados = rich.rows;
  } else if (arquivoPorSensor) {
    const seriesPorSensor = LavRel_lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosNormalizados = LavRel_mesclarSeriesPorSensor_(seriesPorSensor);
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

function LavRel_apiConverter(payload) {
  const pipeline = LavRel_lvExecutarAnaliseCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analise = pipeline.analise;

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


