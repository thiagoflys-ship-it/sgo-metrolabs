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
 * Porta de entrada do WebApp.
 */
function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(UCFG.APP_TITLE || 'METROLABS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inclui arquivos HTML auxiliares.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Roteador seguro de funes chamadas pelo frontend.
 */
function apiDispatch(req) {
  req = req || {};

  const fn = String(req.fn || '').trim();
  const payload = req.payload || {};

  const allow = {
    apiPing: apiPing,
    apiPreviewEntrada: apiPreviewEntrada,
    apiConverter: apiConverter,
    apiUploadArquivo: apiUploadArquivo,
    apiConsultarCnpj: apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: apiValidarSenhaSimuladorAdmin,
    apiGerarRascunhoCertificado: apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: apiMontarCertificadoFinal
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

function apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  validarSenhaSimuladorAdmin_(payload.senha);
  return { ok: true };
}
function apiPing() {
  const laudosId = (UCFG.LAUDOS_FOLDER_ID && String(UCFG.LAUDOS_FOLDER_ID).length > 10)
    ? String(UCFG.LAUDOS_FOLDER_ID).trim()
    : '';

  const uploadsId = (UCFG.UPLOAD_FOLDER_ID && String(UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(UCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  const idleTimeout = Number(UCFG.IDLE_TIMEOUT_MINUTES);
  const logoFileId = String(UCFG.LOGO_FILE_ID || '').trim();
  const analiseCfg = UCFG.ANALISE || {};
  const validacaoTempoCfg = UCFG.VALIDACAO_TEMPO || {};

  return {
    ok: true,
    versao: String(UCFG.VERSION || 'V4.6') + ' Oficial',
    appTitle: UCFG.APP_TITLE || 'METROLABS',
    tz: UCFG.TZ || Session.getScriptTimeZone(),
    ts: Utilities.formatDate(new Date(), UCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    idleTimeout: isFinite(idleTimeout) && idleTimeout > 0 ? idleTimeout : 5,
    defaultDateStyle: String(UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase(),
    defaultNSensores: Number(UCFG.DEFAULT_N || 12),
    motoresDisponiveis: Object.keys(UCFG.CICLOS || {}),
    laudosUrl: laudosId ? ('https://drive.google.com/drive/folders/' + laudosId) : '',
    uploadsUrl: uploadsId ? ('https://drive.google.com/drive/folders/' + uploadsId) : '',
    logoFileId: logoFileId,
    simuladorAdmin: {
      habilitado: !!((UCFG.SIMULADOR_ADMIN || {}).habilitado),
      intervaloSegundos: Number((UCFG.SIMULADOR_ADMIN || {}).intervaloSegundos || 30)
    },
    analise: {
      tempMinGlobal: parseFloatSeguro_(analiseCfg.tempMinGlobal, 20.0),
      tempMaxGlobal: parseFloatSeguro_(analiseCfg.tempMaxGlobal, 100.0),
      histereseTemperatura: parseFloatSeguro_(analiseCfg.histereseTemperatura, 0.5),
      consecutivasInicio: clampIntSeguro_(analiseCfg.consecutivasInicio, 1, 20, 2),
      consecutivasFim: clampIntSeguro_(analiseCfg.consecutivasFim, 1, 20, 3),
      toleranciaEntrada: parseFloatSeguro_(analiseCfg.toleranciaEntrada, 0),
      toleranciaSaida: parseFloatSeguro_(analiseCfg.toleranciaSaida, 0.5),
      modoReconhecimentoExposicao: String(analiseCfg.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase(),
      percentualMinimoSensores: limitarNumeroSeguro_(analiseCfg.percentualMinimoSensores, 0.01, 1, 1),
      permitirOverrideManual: !!analiseCfg.permitirOverrideManual,
      permitirOverrideCiclo: !!analiseCfg.permitirOverrideCiclo,
      permitirOverrideExposicao: !!analiseCfg.permitirOverrideExposicao
    },
    validacaoTempo: {
      permitirReconstrucaoTempo: !!validacaoTempoCfg.permitirReconstrucaoTempo,
      maxTimestampsIguaisSequenciais: clampIntSeguro_(validacaoTempoCfg.maxTimestampsIguaisSequenciais, 1, 100, 3),
      maxSaltosMinutos: clampIntSeguro_(validacaoTempoCfg.maxSaltosMinutos, 1, 10000, 120),
      intervaloEsperadoMin: parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMin, 0.1),
      intervaloEsperadoMax: parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMax, 10)
    }
  };
}

// ------------------------------------------------------------
// UPLOAD DE ARQUIVO PARA PASTA DE UPLOADS
// ------------------------------------------------------------

function apiUploadArquivo(payload) {
  payload = payload || {};

  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.txt').trim();
  const fileName = sanitizarNomeArquivo_(fileNameOriginal || 'arquivo_sem_nome.txt');
  const mimeType = String(payload.mimeType || MimeType.PLAIN_TEXT).trim();
  const base64 = String(payload.base64 || '').trim();

  if (!base64) {
    throw new Error('Conteúdo do arquivo não recebido para upload.');
  }

  const folderId = (UCFG.UPLOAD_FOLDER_ID && String(UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(UCFG.UPLOAD_FOLDER_ID).trim()
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
 * uma série de 1 sensor só, reaproveitando lerDadosEntradaRich_ e
 * normalizarMatrizParaAnalise sem mudança — o mesmo parser do modo de
 * arquivo único já lida com o formato Tempo+Temperatura (a coluna
 * "Numero"/índice do datalogger individual é simplesmente ignorada,
 * pois não bate com nenhum padrão de coluna reconhecido).
 * Sensores inativos ficam com série null (não exigem arquivo).
 */
function lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle) {
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

    const rich = lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: fileId, delimManual: delimManual });
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler o arquivo do sensor S' + (s + 1) + '.');
    }

    let serieSensor;
    try {
      serieSensor = normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
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

function apiPreviewEntrada(payload) {
  payload = payload || {};

  const modoEntradaNormalizado = String(payload.modoEntrada || '').toUpperCase().trim();

  if (modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR') {
    const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
    const sensoresAtivos = normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
    const dateStylePrev = String(payload.dateStyle || UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

    const seriesPorSensor = lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStylePrev);
    const mesclado = mesclarSeriesPorSensor_(seriesPorSensor);

    const headerMulti = ['Tempo'].concat(Array.from({ length: nSensores }, function(_, i) { return 'S' + (i + 1); }));
    const previewMulti = [headerMulti].concat(mesclado.slice(0, UCFG.PREVIEW_ROWS || 20).map(function(row) {
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
    ? gerarDadosSimuladosAdminLavadoras_(payload)
    : lerDadosEntradaRich_(payload);
  const bruto = simuladoAdmin ? (rich.preview || []) : (rich.displayMatrix || rich.matrix || []);

  if (!bruto || !bruto.length) {
    throw new Error('A planilha retornou vazia. Verifique os dados fornecidos.');
  }

  const previewRows = bruto.slice(0, UCFG.PREVIEW_ROWS || 20);
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
    diagnostico = rich.diagnostico || diagnosticarEstruturaEntrada_(rich.matrix || bruto, rich.displayMatrix || bruto) || {};
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
 * pelo laudo em Planilha (apiConverter) e pelo Certificado em HTML
 * (CertificadoRelatorio.js) — nenhum dos dois recalcula nada por conta
 * própria, garantindo que as duas saídas usem exatamente os mesmos números.
 */
function lvExecutarAnaliseCompleta_(payload) {
  payload = payload || {};

  const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
  const motor = String(payload.motor || 'TERMO').trim();
  const offsetTemp = parseFloatSeguro_(payload.offsetTemp, 0.0);

  // Usa o novo parametro unificado de offset
  const offsetParametro = parseFloatSeguro_(payload.offsetParametro || payload.offsetF0, 0.0);
  const dateStyle = String(payload.dateStyle || UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  if (!UCFG.CICLOS || !UCFG.CICLOS[motor]) {
    throw new Error('Equipamento/ciclo inválido ou não configurado: ' + motor);
  }

  const sensoresAtivos = normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const opcoesAnalise = normalizarOpcoesAnaliseMain_(payload);

  const modoEntradaNormalizado = String(payload.modoEntrada || '').toUpperCase().trim();
  const simuladoAdmin = modoEntradaNormalizado === 'SIMULADO_ADMIN';
  const arquivoPorSensor = modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR';

  let rich = null;
  let dadosNormalizados;

  if (simuladoAdmin) {
    rich = gerarDadosSimuladosAdminLavadoras_(payload);
    if (!rich || !(rich.rows && rich.rows.length)) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosNormalizados = rich.rows;
  } else if (arquivoPorSensor) {
    const seriesPorSensor = lerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosNormalizados = mesclarSeriesPorSensor_(seriesPorSensor);
  } else {
    rich = lerDadosEntradaRich_(payload);
    if (!rich || !(rich.matrix && rich.matrix.length)) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosNormalizados = normalizarMatrizParaAnalise(
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

  const analise = analisarCiclo(
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
    aplicarMarcacaoRelatorioSimuladoLavadoras_(analise, payload);
  }

  return {
    payload: payload,
    motor: motor,
    cicloCfg: UCFG.CICLOS[motor],
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosNormalizados: dadosNormalizados,
    analise: analise,
    opcoesAnalise: opcoesAnalise
  };
}

function apiConverter(payload) {
  const pipeline = lvExecutarAnaliseCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analise = pipeline.analise;

  const infoPlanilha = gerarPlanilhaAuditoria(dadosNormalizados, analise, payload);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha de auditoria.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);

  gerarGraficosAuditoria(ss, analise, nSensores);

  SpreadsheetApp.flush();

  const pdfUrl = construirLinkPdfPaisagem(infoPlanilha.spreadsheetId);

  return {
    ok: true,
    aprovado: !!analise.aprovado,
    statusAprovacao: analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO'),
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
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

function construirLinkPdfPaisagem(id) {
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

function parseFloatSeguro_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : fallback;
}

function clampIntSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;

  n = Math.round(n);

  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function limitarNumeroSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function normalizarSensoresAtivosMain_(sensoresAtivos, nSensores) {
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

function sanitizarNomeArquivo_(nome) {
  return String(nome || 'arquivo_sem_nome.txt')
    .replace(/[\\\/:*?"<>|#%]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------
// NORMALIZAÇÃO DAS OPÇÕES NOVAS DE ANÁLISE
// ------------------------------------------------------------

function normalizarOpcoesAnaliseMain_(payload) {
  payload = payload || {};

  const cfgAnalise = UCFG.ANALISE || {};
  const permitirOverrideManual = !!cfgAnalise.permitirOverrideManual;
  const permitirOverrideCiclo = !!cfgAnalise.permitirOverrideCiclo;
  const permitirOverrideExposicao = !!cfgAnalise.permitirOverrideExposicao;

  const robustezIn = payload.robustez || {};
  const overrideIn = payload.overrideJanela || {};

  const robustez = {
    histereseTemperatura: parseFloatOpcionalSeguro_(robustezIn.histereseTemperatura),
    consecutivasInicio: clampIntOpcionalSeguro_(robustezIn.consecutivasInicio, 1, 20),
    consecutivasFim: clampIntOpcionalSeguro_(robustezIn.consecutivasFim, 1, 20),
    toleranciaEntrada: parseFloatOpcionalSeguro_(robustezIn.toleranciaEntrada),
    toleranciaSaida: parseFloatOpcionalSeguro_(robustezIn.toleranciaSaida),
    modoReconhecimentoExposicao: normalizarTextoOpcional_(robustezIn.modoReconhecimentoExposicao).toUpperCase(),
    percentualMinimoSensores: limitarNumeroOpcionalSeguro_(robustezIn.percentualMinimoSensores, 0.01, 1)
  };

  if (!robustez.modoReconhecimentoExposicao) {
    delete robustez.modoReconhecimentoExposicao;
  }

  const overrideJanela = {
    habilitado: permitirOverrideManual && !!overrideIn.habilitado,

    inicioCiclo: permitirOverrideCiclo ? normalizarTextoOpcional_(overrideIn.inicioCiclo) : '',
    fimCiclo: permitirOverrideCiclo ? normalizarTextoOpcional_(overrideIn.fimCiclo) : '',

    inicioExposicao: permitirOverrideExposicao ? normalizarTextoOpcional_(overrideIn.inicioExposicao) : '',
    fimExposicao: permitirOverrideExposicao ? normalizarTextoOpcional_(overrideIn.fimExposicao) : ''
  };

  return {
    robustez: robustez,
    overrideJanela: overrideJanela,
    setpoint: parseFloatOpcionalSeguro_(payload.setpoint)
  };
}

function clampIntOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;

  let n = Number(valor);
  if (!isFinite(n)) return undefined;

  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function parseFloatOpcionalSeguro_(valor) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : undefined;
}

function limitarNumeroOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  let n = Number(valor);
  if (!isFinite(n)) return undefined;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function normalizarTextoOpcional_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function aplicarMarcacaoRelatorioSimuladoLavadoras_(analise, payload) {
  analise = analise || {};
  payload = payload || {};
  analise.modoRelatorioSimulado = true;
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.simulacaoMeta = payload.simulacaoMeta || {};
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];

  const aviso = (UCFG.SIMULADOR_ADMIN && UCFG.SIMULADOR_ADMIN.avisoRelatorio)
    ? UCFG.SIMULADOR_ADMIN.avisoRelatorio
    : 'RELATÓRIO INTERNO - DADOS RECONSTITUÍDOS E ANALISADOS MANUALMENTE PELO LABORATÓRIO DE METROLOGIA';

  if (analise.observacoesAnalise.indexOf(aviso) === -1) {
    analise.observacoesAnalise.unshift(aviso);
  }
}


function apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = somenteDigitosMain_(payload.cnpj);

  if (cnpj.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  const endereco = montarEnderecoCnpjMain_(data);
  return {
    ok: true,
    cnpj: formatarCnpjMain_(cnpj),
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

function somenteDigitosMain_(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarCnpjMain_(cnpj) {
  cnpj = somenteDigitosMain_(cnpj);
  if (cnpj.length !== 14) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function montarEnderecoCnpjMain_(data) {
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


function autorizarConsultaCnpj() {
  const res = UrlFetchApp.fetch('https://brasilapi.com.br/api/cnpj/v1/00000000000191', {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { Accept: 'application/json' }
  });
  return {
    ok: true,
    httpCode: res.getResponseCode(),
    mensagem: 'Permissão UrlFetchApp autorizada para consulta pública de CNPJ.'
  };
}
