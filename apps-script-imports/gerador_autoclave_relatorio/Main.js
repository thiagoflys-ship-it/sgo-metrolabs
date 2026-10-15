/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - V4.5
 * ARQUIVO: Main.gs
 * FUNÇÃO:
 * Backend principal do WebApp. Responsável por:
 * - carregar a interface (Index.html)
 * - incluir arquivos HTML auxiliares
 * - rotear chamadas da interface com segurança
 * - sincronizar parâmetros básicos com o frontend
 * - receber uploads de arquivos
 * - executar o fluxo principal de conversão/análise
 * - gerar link de exportação PDF
 *
 * CORREÇÃO V4.5:
 * - integração com Parser V4.5
 * - envio de matrix + displayMatrix para normalização
 * - blindagem do fluxo de leitura temporal
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
 * Roteador seguro de funções chamadas pelo frontend.
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
    apiMontarCertificadoFinal: apiMontarCertificadoFinal,
    apiGerarMemoriaF0: apiGerarMemoriaF0
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
    versao: String(UCFG.VERSION || 'V4.5') + ' Oficial',
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
    analise: {
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
    simuladorAdmin: {
      habilitado: !!(UCFG.SIMULADOR_ADMIN && UCFG.SIMULADOR_ADMIN.habilitado !== false),
      intervaloSegundosDefault: Number(UCFG.SIMULADOR_ADMIN && UCFG.SIMULADOR_ADMIN.intervaloSegundosDefault) || 30
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
// AUTORIZAÇÃO MANUAL DE ESCOPO EXTERNO
// ------------------------------------------------------------

function autorizarConsultaCnpj() {
  const res = UrlFetchApp.fetch('https://brasilapi.com.br/api/cnpj/v1/00000000000191', {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { Accept: 'application/json' }
  });
  return 'Autorização UrlFetchApp OK. HTTP ' + res.getResponseCode();
}

// ------------------------------------------------------------
// CONSULTA PUBLICA DE CNPJ
// ------------------------------------------------------------

function apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  const enderecoPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : '',
    data.bairro ? ('- ' + data.bairro) : '',
    data.municipio ? ('- ' + data.municipio) : '',
    data.uf ? ('/' + data.uf) : '',
    data.cep ? ('- CEP ' + formatarCepConsultaCnpj_(data.cep)) : ''
  ].filter(function(v) { return String(v || '').trim(); }).join(' ');

  return {
    ok: true,
    fonte: 'consulta pública',
    cnpj: formatarCnpjConsultaCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    endereco: enderecoPartes.replace(/\s+/g, ' ').trim(),
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: formatarCepConsultaCnpj_(data.cep || ''),
    telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
    email: data.email || '',
    cnaeFiscal: data.cnae_fiscal_descricao || '',
    situacaoCadastral: data.descricao_situacao_cadastral || '',
    abertura: data.data_inicio_atividade || ''
  };
}

function formatarCnpjConsultaCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}

function formatarCepConsultaCnpj_(cep) {
  const s = String(cep || '').replace(/\D/g, '');
  if (s.length !== 8) return String(cep || '');
  return s.substring(0, 5) + '-' + s.substring(5);
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
// PRÉ-VISUALIZAÇÃO
// ------------------------------------------------------------

function apiPreviewEntrada(payload) {
  payload = payload || {};

  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'SIMULADO_ADMIN') {
    const dadosSimulados = gerarDadosSimuladosAdmin_(payload, { preview: true });
    const nSensoresPrev = Array.isArray(dadosSimulados[0] && dadosSimulados[0].temperaturas) ? dadosSimulados[0].temperaturas.length : 0;
    const header = ['Tempo'].concat(Array.from({ length: nSensoresPrev }, function(_, i) { return 'S' + (i + 1); })).concat(['Pressão']);
    const previewSim = [header].concat(dadosSimulados.slice(0, UCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas || []).concat([row.pressao]);
    }));

    return {
      ok: true,
      rows: dadosSimulados.length,
      cols: header.length,
      preview: previewSim,
      diagnostico: {
        modoEntrada: 'SIMULADO_ADMIN',
        detectedDateStyle: 'BR',
        qtdTemperaturas: nSensoresPrev,
        hasPressao: true,
        observacao: 'Dados reconstituídos gerados para análise interna pelo laboratório de metrologia.'
      }
    };
  }

  const rich = lerDadosEntradaRich_(payload);
  const bruto = rich.displayMatrix || rich.matrix || [];

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
// CÉREBRO PRINCIPAL DO CONVERSOR
// ------------------------------------------------------------

/**
 * Pipeline reaproveitável: leitura + normalização + análise do ciclo térmico.
 * Compartilhado pelo laudo em Planilha (apiConverter) e pelo Certificado em HTML
 * (CertificadoRelatorio.js) — nenhum dos dois recalcula nada por conta própria,
 * garantindo que as duas saídas usem exatamente os mesmos números.
 * Não cobre Leak Test (pipeline próprio em LeakTest.js).
 */
function acExecutarAnaliseCompleta_(payload) {
  payload = payload || {};
  payload = normalizarCicloNormativoPayload_(payload);

  const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
  const motor = String(payload.motor || '134').trim();
  const offsetTemp = parseFloatSeguro_(payload.offsetTemp, 0.0);
  const offsetF0 = parseFloatSeguro_(payload.offsetF0, 0.0);
  const dateStyle = String(payload.dateStyle || UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  if (!UCFG.CICLOS || !UCFG.CICLOS[motor]) {
    throw new Error('Motor/ciclo inválido ou não configurado: ' + motor);
  }

  const sensoresAtivos = normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  let opcoesAnalise = null;

  let dadosNormalizados = null;
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();

  if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    dadosNormalizados = gerarDadosSimuladosAdmin_(payload, { converter: true });
    aplicarOverrideSimulacaoNoPayload_(payload);
  } else {
    const rich = lerDadosEntradaRich_(payload);
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }

    dadosNormalizados = normalizarMatrizParaAnalise(
      rich.matrix,
      rich.displayMatrix,
      nSensores,
      dateStyle
    );
  }

  opcoesAnalise = normalizarOpcoesAnaliseMain_(payload);

  if (!dadosNormalizados || !dadosNormalizados.length) {
    throw new Error('Não foi possível normalizar os dados para análise.');
  }

  const analise = analisarCiclo(
    dadosNormalizados,
    motor,
    offsetTemp,
    offsetF0,
    sensoresAtivos,
    opcoesAnalise
  );

  if (!analise) {
    throw new Error('A rotina de análise não retornou resultado.');
  }

  aplicarMarcadoresSimulacaoNaAnalise_(analise, payload);

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
  payload = payload || {};

  if (String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST') {
    return apiConverterLeakTest_(payload);
  }

  const pipeline = acExecutarAnaliseCompleta_(payload);
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
      minF0: analise.minF0,
      mediaF0: analise.mediaF0,
      maxF0: analise.maxF0,
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
      piorSensorF0: analise.piorSensorF0 || null,
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
      faseFimExp: typeof analise.faseFimExp === 'number' ? analise.faseFimExp : -1
    }
  };
}

function aplicarOverrideSimulacaoNoPayload_(payload) {
  payload = payload || {};
  const sim = payload.simulacao || {};
  payload.modoAnaliseJanela = 'MANUAL';
  payload.overrideJanela = {
    habilitado: true,
    inicioCiclo: sim.inicioCiclo || '',
    fimCiclo: sim.fimCiclo || '',
    inicioExposicao: sim.inicioEsterilizacao || sim.inicioExposicao || '',
    fimExposicao: sim.fimEsterilizacao || sim.fimExposicao || ''
  };
}

function aplicarMarcadoresSimulacaoNaAnalise_(analise, payload) {
  if (!analise || !payload || !payload.modoRelatorioSimulado) return;
  const meta = payload._simulacaoMeta || {};
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];
  const avisoInterno = 'RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA';
  if (analise.observacoesAnalise.indexOf(avisoInterno) === -1) {
    analise.observacoesAnalise.unshift(avisoInterno);
  }
  analise.observacoesAnalise.push('Parâmetros da análise manual: ciclo ' + (meta.inicioCiclo || '-') + ' a ' + (meta.fimCiclo || '-') + ' | esterilização ' + (meta.inicioEsterilizacao || '-') + ' a ' + (meta.fimEsterilizacao || '-') + ' | alvo ' + (meta.temperaturaAlvo || '-') + ' °C | intervalo ' + (meta.intervaloSegundos || '-') + ' s | gerado em ' + (meta.geradoEm || '-') + ' | operador ' + (meta.operador || '-'));
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
// HELPERS LOCAIS DE SEGURANÇA
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

function normalizarCicloNormativoPayload_(payload) {
  payload = payload || {};
  const ciclos = (UCFG && UCFG.CICLOS) ? UCFG.CICLOS : {};
  const modoEntrada = String(payload.modoEntrada || '').toUpperCase().trim();
  const sim = payload.simulacao || {};
  const alvoPreferencial = modoEntrada === 'SIMULADO_ADMIN'
    ? parseFloatSeguro_(sim.temperaturaAlvo || payload.setpoint, NaN)
    : parseFloatSeguro_(payload.setpoint, NaN);

  const cicloAlvo = isFinite(alvoPreferencial) ? String(Math.round(alvoPreferencial)) : '';
  if (cicloAlvo && ciclos[cicloAlvo]) {
    payload.motor = cicloAlvo;
    payload.setpoint = cicloAlvo;
    if (modoEntrada === 'SIMULADO_ADMIN') {
      payload.simulacao = sim;
      payload.simulacao.temperaturaAlvo = String(alvoPreferencial);
    }
  }

  return payload;
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
    overrideJanela: overrideJanela
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