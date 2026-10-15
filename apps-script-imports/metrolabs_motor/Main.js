/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: Main.gs
 * VERSÃO CORRIGIDA — COMPLETA / SEM REMENDO + SLA FLEXÍVEL E JUSTIFICATIVA
 * FOCO:
 * - manter compatibilidade com o restante do motor
 * - garantir retorno consistente para o frontend
 * - expor spreadsheetUrl / pdfUrl / pdfError com fallback
 * - melhorar robustez da geração do PDF
 * - manter análise automática e manual por período
 * - evitar falso sucesso quando não houver dados válidos
 * - evitar que o recorte manual descarte tudo por falha de parsing de data
 * - injetar SLA flexível e Justificativa de Veto no Payload
 ****************************************************/

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(obterTituloAplicacaoMain_())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiDispatch(req) {
  req = req || {};

  const fn = String(req.fn || '').trim();
  const payload = req.payload || {};
  const rotas = obterRotasPermitidasMain_();

  if (!fn) throw new Error('Função não informada.');
  if (!rotas[fn] || typeof rotas[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }

  return rotas[fn](payload);
}

// ============================================================
// 1. ROTAS / API
// ============================================================

function obterRotasPermitidasMain_() {
  return {
    apiPing: apiPing,
    apiPreviewEntrada: apiPreviewEntrada,
    apiConverter: apiConverter,
    apiUploadArquivo: apiUploadArquivo,
    apiConsultarCnpj: apiConsultarCnpj
  };
}

function apiPing() {
  const props = PropertiesService.getScriptProperties();
  const setup = obterConfigMain_('SETUP', {});
  const prop = setup.PROPRIEDADES || {};
  const app = obterConfigMain_('APP', {});
  const sistema = obterConfigMain_('SISTEMA', {});
  const limites = obterConfigMain_('LIMITES', {});
  const csv = obterConfigMain_('CSV', {});
  const textos = obterConfigMain_('TEXTOS', {});
  const cnpjCfg = obterConfigMain_('CNPJ', {});
  const tz = obterTimezoneMain_();

  const laudosFolderId = prop.LAUDOS_FOLDER_ID ? (props.getProperty(prop.LAUDOS_FOLDER_ID) || '') : '';
  const uploadFolderId = prop.UPLOAD_FOLDER_ID ? (props.getProperty(prop.UPLOAD_FOLDER_ID) || '') : '';

  let tsFormatado = '';
  try {
    tsFormatado = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
  } catch (e) {
    tsFormatado = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  }

  return {
    ok: true,
    versao: valorSeguroMain_(app.VERSAO || '1.0.0') + ' Oficial',
    appTitle: valorSeguroMain_(app.NOME || 'METROLABS — MOTOR CENTRAL DE AR MEDICAL V1'),
    subtitulo: valorSeguroMain_(app.SUBTITULO || ''),
    referenciaNormativa: valorSeguroMain_(app.REFERENCIA_NORMATIVA || ''),
    tz: tz,
    ts: tsFormatado,
    idleTimeout: numeroSeguroMain_(sistema.IDLE_TIMEOUT_MINUTES, 7),
    defaultDateStyle: valorSeguroMain_(sistema.DEFAULT_DATE_STYLE || 'BR'),
    previewRows: numeroSeguroMain_(sistema.PREVIEW_ROWS, 20),
    laudosUrl: laudosFolderId ? ('https://drive.google.com/drive/folders/' + laudosFolderId) : '',
    uploadsUrl: uploadFolderId ? ('https://drive.google.com/drive/folders/' + uploadFolderId) : '',
    logoFileId: valorSeguroMain_(app.LOGO_FILE_ID || ''),
    csv: {
      colData: valorSeguroMain_(csv.COL_DATA || 'DATA'),
      colHora: valorSeguroMain_(csv.COL_HORA || 'HORA'),
      colOrvalho: valorSeguroMain_(csv.COL_ORVALHO || 'PONTO_DE_ORVALHO_C'),
      colPressao: valorSeguroMain_(csv.COL_PRESSAO || 'PRESSAO_DA_REDE_BAR')
    },
    analise: {
      pressaoMin: numeroSeguroMain_(limites.PRESSAO && limites.PRESSAO.MIN, 4.50),
      pressaoMax: numeroSeguroMain_(limites.PRESSAO && limites.PRESSAO.MAX, 6.00),
      pressaoAlvo: numeroSeguroMain_(limites.PRESSAO && limites.PRESSAO.ALVO, 5.00),
      orvalhoMax: numeroSeguroMain_(limites.ORVALHO && limites.ORVALHO.MAX_ACEITAVEL, -40.00),
      alertaOrvalho: numeroSeguroMain_(limites.ORVALHO && limites.ORVALHO.ALERTA_ACIMA_DE, -38.00),
      reprovacaoOrvalho: numeroSeguroMain_(limites.ORVALHO && limites.ORVALHO.REPROVACAO_ACIMA_DE, -35.00),
      percentualAlertaForaFaixa: numeroSeguroMain_(limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_ALERTA_FORA_FAIXA, 5),
      percentualReprovacaoForaFaixa: numeroSeguroMain_(limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA, 15)
    },
    labels: {
      online: valorSeguroMain_(textos.LABEL_ONLINE || 'SISTEMA ONLINE'),
      processando: valorSeguroMain_(textos.LABEL_PROCESSANDO || 'PROCESSANDO...'),
      aprovado: valorSeguroMain_(textos.LABEL_APROVADO || 'APROVADO'),
      aprovadoAlerta: valorSeguroMain_(textos.LABEL_APROVADO_ALERTA || 'APROVADO COM ALERTA'),
      reprovado: valorSeguroMain_(textos.LABEL_REPROVADO || 'REPROVADO')
    },
    cnpj: { habilitado: !!cnpjCfg.HABILITADO },
    modosAnalise: { automatico: true, manual: true }
  };
}

function apiUploadArquivo(payload) {
  payload = payload || {};

  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.csv').trim();
  const fileName = sanitizarNomeArquivoMain_(fileNameOriginal || 'arquivo_sem_nome.csv');
  const mimeType = String(payload.mimeType || 'text/csv').trim();
  
  let base64 = String(payload.base64 || '').trim();
  if (base64.indexOf('base64,') !== -1) {
    base64 = base64.split('base64,')[1];
  }

  if (!base64) throw new Error('Conteúdo do arquivo não recebido para upload.');

  const uploadFolderId = obterIdPastaConfiguradaMain_('UPLOAD_FOLDER_ID');
  if (!uploadFolderId) {
    throw new Error('Pasta de uploads não configurada. Execute o Setup.gs primeiro.');
  }

  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = DriveApp.getFolderById(uploadFolderId);
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

function apiPreviewEntrada(payload) {
  payload = payload || {};

  const rich = lerDadosEntradaRichMain_(payload);
  const bruto = rich.displayMatrix || rich.matrix || [];

  if (!bruto.length) {
    throw new Error('A entrada retornou vazia. Verifique os dados fornecidos.');
  }

  const limitePreview = numeroSeguroMain_(obterConfigMain_('SISTEMA', {}).PREVIEW_ROWS, 20);
  const previewRows = bruto.slice(0, limitePreview);

  const maxCols = previewRows.reduce(function (m, row) {
    return Math.max(m, Array.isArray(row) ? row.length : 0);
  }, 0);

  const preview = previewRows.map(function (row) {
    const arr = Array.isArray(row) ? row : [row];
    const out = [];
    for (let i = 0; i < maxCols; i++) {
      out.push(typeof arr[i] === 'undefined' ? '' : arr[i]);
    }
    return out;
  });

  return {
    ok: true,
    rows: bruto.length,
    cols: maxCols,
    origem: valorSeguroMain_(rich.origem || ''),
    preview: preview,
    diagnostico: diagnosticarEstruturaEntradaCentralArMain_(rich.matrix || bruto, rich.displayMatrix || bruto)
  };
}

function apiConverter(payload) {
  payload = payload || {};

  try {
    const rich = lerDadosEntradaRichMain_(payload);
    validarDependenciasConversaoMain_();

    const dateStyle = valorSeguroMain_(payload.dateStyle || obterConfigMain_('SISTEMA', {}).DEFAULT_DATE_STYLE || 'BR');
    const dadosNormalizadosBrutos = normalizarMatrizCentralAr(
      rich.matrix,
      rich.displayMatrix || rich.matrix,
      dateStyle
    );

    if (!dadosNormalizadosBrutos || !dadosNormalizadosBrutos.length) {
      return montarRetornoErroConversaoMain_(
        'Não foi possível normalizar os dados da central de ar.',
        payload,
        { etapa: 'normalizacao' }
      );
    }

    const recorte = obterConfiguracaoPeriodoAnaliseMain_(payload);
    const dadosNormalizados = aplicarRecortePeriodoMain_(dadosNormalizadosBrutos, recorte);

    registrarLogMain_(
      'apiConverter | bruto=' + dadosNormalizadosBrutos.length +
      ' | filtrado=' + dadosNormalizados.length +
      ' | modo=' + (recorte.modo || 'AUTOMATICO') +
      ' | manual=' + (!!recorte.usarRecorte)
    );

    if (!dadosNormalizados.length) {
      return montarRetornoErroConversaoMain_(
        'Nenhum registro encontrado no período selecionado para análise.',
        payload,
        {
          etapa: 'recorte_periodo',
          totalRegistrosOriginais: dadosNormalizadosBrutos.length,
          totalRegistrosAnalisados: 0,
          periodoAnalise: {
            modo: recorte.modo || 'AUTOMATICO',
            periodoManualAtivo: !!recorte.usarRecorte,
            dataInicioIso: recorte.dataInicioIso || '',
            dataFimIso: recorte.dataFimIso || '',
            totalRegistrosAnalisados: 0,
            totalRegistrosOriginais: numeroSeguroMain_(dadosNormalizadosBrutos.length, 0)
          }
        }
      );
    }

    // CORREÇÃO MESTRA: Aqui repassamos as configurações flexíveis do Frontend (SLA, Dias, Falha, Justificativa) para a aba de Análise
    const payloadAnalise = montarPayloadAnaliseMain_(payload, recorte);
    const analise = analisarCiclo(dadosNormalizados, payloadAnalise);

    if (!analise) {
      return montarRetornoErroConversaoMain_(
        'A rotina de análise não retornou resultado.',
        payload,
        {
          etapa: 'analise',
          totalRegistrosOriginais: dadosNormalizadosBrutos.length,
          totalRegistrosAnalisados: dadosNormalizados.length
        }
      );
    }

    enriquecerRetornoAnaliseMain_(analise, recorte, dadosNormalizados.length, dadosNormalizadosBrutos.length);

    const infoPlanilha = gerarPlanilhaAuditoria(dadosNormalizados, analise, payloadAnalise);
    
    if (!infoPlanilha || !infoPlanilha.spreadsheetId || infoPlanilha.ok === false) {
      return montarRetornoErroConversaoMain_(
        infoPlanilha.erro || 'Falha ao gerar a planilha de auditoria.',
        payload,
        {
          etapa: 'planilha',
          analise: analise,
          analiseResumo: montarResumoRetornoCentralArMain_(analise),
          periodoAnalise: analise.periodoAnalise || {}
        }
      );
    }

    let ss;
    try {
      ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);
    } catch (e) {
      return montarRetornoErroConversaoMain_(
        'A planilha foi criada, mas não pôde ser reaberta. Detalhe: ' + e.message,
        payload,
        {
          etapa: 'reabertura_planilha',
          spreadsheetId: infoPlanilha.spreadsheetId,
          spreadsheetUrl: infoPlanilha.spreadsheetUrl || '',
          analise: analise,
          analiseResumo: montarResumoRetornoCentralArMain_(analise),
          periodoAnalise: analise.periodoAnalise || {}
        }
      );
    }

    if (typeof gerarGraficosAuditoria === 'function') {
      const resGraficos = gerarGraficosAuditoria(ss, analise);
      if (resGraficos && resGraficos.ok === false) {
        registrarLogMain_('Aviso na geração de gráficos: ' + resGraficos.erro);
      }
    }

    SpreadsheetApp.flush();
    Utilities.sleep(4000);

    const spreadsheetUrl = infoPlanilha.spreadsheetUrl || ss.getUrl() || ('https://docs.google.com/spreadsheets/d/' + infoPlanilha.spreadsheetId + '/edit');
    const infoPdf = tentarGerarPdfComRetryMain_(infoPlanilha.spreadsheetId, payloadAnalise, 3);

    const analiseLeve = {};
    if (analise) {
      Object.keys(analise).forEach(function(k) {
        if (Array.isArray(analise[k])) {
           if (k === 'motivosReprovacao' || k === 'alertasAnalise') {
             analiseLeve[k] = analise[k];
           }
        } else {
           analiseLeve[k] = analise[k];
        }
      });
    }

    return {
      ok: true,
      aprovado: !!analise.aprovado,
      statusAprovacao: valorSeguroMain_(analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO')),
      spreadsheetId: infoPlanilha.spreadsheetId,
      spreadsheetUrl: spreadsheetUrl,
      pdfUrl: infoPdf.fileUrl || '',
      pdfFileId: infoPdf.fileId || '',
      pdfFileName: infoPdf.fileName || '',
      pdfError: valorSeguroMain_(infoPdf.erro || ''),
      analise: analiseLeve,
      analiseResumo: montarResumoRetornoCentralArMain_(analise),
      periodoAnalise: analise.periodoAnalise || {}
    };
  } catch (err) {
    registrarErroMain_('apiConverter', err, payload);
    return montarRetornoErroConversaoMain_('Falha ao gerar relatório: ' + err.message, payload, {
      etapa: 'exception'
    });
  }
}

function apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpjCfg = obterConfigMain_('CNPJ', {});

  if (!cnpjCfg.HABILITADO) {
    throw new Error('Consulta de CNPJ desabilitada no Config.gs.');
  }

  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');
  if (cnpj.length !== 14) {
    throw new Error('CNPJ inválido. Informe 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  // CNPJ.URL_BRASIL_API do Config.js não é mais usado (fica só como referência).
  const json = SGO_CNPJ_consultarDados_(cnpj);

  const enderecoPartes = [
    [json.descricao_tipo_de_logradouro, json.logradouro].filter(Boolean).join(' ').trim(),
    json.numero || '',
    json.bairro || '',
    [json.municipio, json.uf].filter(Boolean).join(' / '),
    json.cep || ''
  ].filter(Boolean);

  return {
    ok: true,
    cnpj: formatarCnpjMain_(cnpj),
    razaoSocial: valorSeguroMain_(json.razao_social),
    nomeFantasia: valorSeguroMain_(json.nome_fantasia),
    email: valorSeguroMain_(json.email),
    telefone: valorSeguroMain_(json.ddd_telefone_1 || json.ddd_telefone_2),
    cep: valorSeguroMain_(json.cep),
    bairro: valorSeguroMain_(json.bairro),
    municipio: valorSeguroMain_(json.municipio),
    uf: valorSeguroMain_(json.uf),
    logradouro: valorSeguroMain_([json.descricao_tipo_de_logradouro, json.logradouro].filter(Boolean).join(' ')),
    numero: valorSeguroMain_(json.numero),
    complemento: valorSeguroMain_(json.complemento),
    enderecoCompleto: enderecoPartes.join(' - ')
  };
}

// ============================================================
// 2. LEITURA DE ENTRADA
// ============================================================

function lerDadosEntradaRichMain_(payload) {
  payload = payload || {};

  const modo = String(payload.modoEntrada || payload.modo || 'FILE_ID').toUpperCase().trim();
  const delim = String(payload.delimManual || payload.delim || 'AUTO').toUpperCase().trim();

  if (modo === 'COLAR') {
    return lerDadosColadosMain_(payload, delim);
  }

  return lerDadosPorArquivoMain_(payload, delim);
}

function lerDadosColadosMain_(payload, delim) {
  const texto = String(payload.textoColado || payload.dados || '')
    .replace(/\uFEFF/g, '')
    .trim();

  if (!texto) {
    throw new Error('Nenhum dado colado foi recebido para leitura.');
  }

  const matrix = parseTextoTabularCentralArMain_(texto, delim);
  if (!matrix.length) {
    throw new Error('Não foi possível interpretar os dados colados.');
  }

  return {
    matrix: matrix,
    displayMatrix: matrix,
    origem: 'COLAR'
  };
}

function lerDadosPorArquivoMain_(payload, delim) {
  const fileIdOuLink = String(payload.fileId || '').trim();
  if (!fileIdOuLink) {
    throw new Error('Nenhum File ID ou link foi informado.');
  }

  const fileId = extrairFileIdGoogleMain_(fileIdOuLink) || fileIdOuLink;
  let file;

  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error('Não foi possível localizar o arquivo informado no Drive. Detalhe: ' + err.message);
  }

  const mimeType = String(file.getMimeType() || '');

  if (mimeType === MimeType.GOOGLE_SHEETS || mimeType === 'application/vnd.google-apps.spreadsheet') {
    return lerGoogleSheetsMain_(fileId, file, mimeType);
  }

  return lerArquivoTextoMain_(file, mimeType, delim);
}

function lerGoogleSheetsMain_(fileId, file, mimeType) {
  try {
    const ss = SpreadsheetApp.openById(fileId);
    const sh = ss.getSheets()[0];

    if (!sh) {
      throw new Error('A planilha não possui abas acessíveis.');
    }

    const range = sh.getDataRange();

    return {
      matrix: range.getValues(),
      displayMatrix: range.getDisplayValues(),
      origem: 'GOOGLE_SHEETS',
      sheetName: sh.getName(),
      fileName: file.getName(),
      mimeType: mimeType
    };
  } catch (err) {
    throw new Error('Falha ao abrir a planilha Google Sheets informada. Detalhe: ' + err.message);
  }
}

function lerArquivoTextoMain_(file, mimeType, delim) {
  try {
    const blob = file.getBlob();
    let texto = '';

    try {
      texto = blob.getDataAsString('UTF-8');
    } catch (e1) {
      texto = blob.getDataAsString();
    }

    texto = String(texto || '').replace(/\uFEFF/g, '').trim();
    if (!texto) {
      throw new Error('Arquivo textual vazio.');
    }

    const matrix = parseTextoTabularCentralArMain_(texto, delim);
    if (!matrix.length) {
      throw new Error('Não foi possível interpretar o arquivo textual.');
    }

    return {
      matrix: matrix,
      displayMatrix: matrix,
      origem: 'ARQUIVO_TEXTO',
      fileName: file.getName(),
      mimeType: mimeType
    };
  } catch (err) {
    throw new Error('Falha ao ler o arquivo enviado como CSV/TXT. Detalhe: ' + err.message);
  }
}

// ============================================================
// 3. PERÍODO DE ANÁLISE
// ============================================================

function obterConfiguracaoPeriodoAnaliseMain_(payload) {
  payload = payload || {};

  const modoAnalise = String(payload.modoAnalise || payload.tipoAnalisePeriodo || 'AUTOMATICO').toUpperCase().trim();
  const dataInicioRaw = payload.dataInicio || payload.dataHoraInicio || '';
  const dataFimRaw = payload.dataFim || payload.dataHoraFim || '';

  if (modoAnalise !== 'MANUAL') {
    return {
      modo: 'AUTOMATICO',
      usarRecorte: false,
      dataInicio: null,
      dataFim: null,
      dataInicioIso: '',
      dataFimIso: ''
    };
  }

  const dataInicio = parseDataFlexMain_(dataInicioRaw);
  const dataFim = parseDataFlexMain_(dataFimRaw);

  if (!dataInicio || !dataFim) {
    throw new Error('Para análise manual, informe data/hora inicial e final válidas.');
  }

  if (dataFim.getTime() < dataInicio.getTime()) {
    throw new Error('A data/hora final não pode ser menor que a data/hora inicial.');
  }

  return {
    modo: 'MANUAL',
    usarRecorte: true,
    dataInicio: dataInicio,
    dataFim: dataFim,
    dataInicioIso: dataInicio.toISOString(),
    dataFimIso: dataFim.toISOString()
  };
}

function aplicarRecortePeriodoMain_(dados, recorte) {
  dados = Array.isArray(dados) ? dados : [];
  recorte = recorte || {};

  if (!recorte.usarRecorte) {
    return dados.slice();
  }

  return dados.filter(function (item) {
    const dt = extrairDataRegistroMain_(item);

    if (!dt) return true;

    return dt.getTime() >= recorte.dataInicio.getTime() &&
           dt.getTime() <= recorte.dataFim.getTime();
  });
}

function montarPayloadAnaliseMain_(payload, recorte) {
  payload = payload || {};
  recorte = recorte || {};

  const novoPayload = JSON.parse(JSON.stringify(payload));
  novoPayload.modoAnalise = recorte.modo || 'AUTOMATICO';
  novoPayload.periodoManualAtivo = !!recorte.usarRecorte;
  novoPayload.dataInicioIso = recorte.dataInicioIso || '';
  novoPayload.dataFimIso = recorte.dataFimIso || '';
  return novoPayload;
}

function enriquecerRetornoAnaliseMain_(analise, recorte, totalRegistrosRecorte, totalRegistrosOrigem) {
  analise = analise || {};
  recorte = recorte || {};

  analise.periodoAnalise = {
    modo: recorte.modo || 'AUTOMATICO',
    periodoManualAtivo: !!recorte.usarRecorte,
    dataInicioIso: recorte.dataInicioIso || '',
    dataFimIso: recorte.dataFimIso || '',
    totalRegistrosAnalisados: numeroSeguroMain_(totalRegistrosRecorte, 0),
    totalRegistrosOriginais: numeroSeguroMain_(totalRegistrosOrigem, 0)
  };
}

// ============================================================
// 4. PARSER DE TEXTO TABULAR
// ============================================================

function parseTextoTabularCentralArMain_(texto, delim) {
  const linhas = String(texto || '')
    .split(/\r?\n/)
    .filter(function (x) { return String(x || '').trim() !== ''; });

  if (!linhas.length) return [];

  const separador = detectarSeparadorCentralArMain_(linhas[0], delim);

  return linhas.map(function (linha) {
    return splitLinhaCsvCentralArMain_(linha, separador).map(function (cel) {
      return String(cel == null ? '' : cel).trim();
    });
  });
}

function detectarSeparadorCentralArMain_(primeiraLinha, delim) {
  if (delim && delim !== 'AUTO') {
    if (delim === 'TAB') return '\t';
    if (delim === 'PONTO_E_VIRGULA') return ';';
    if (delim === 'VIRGULA') return ',';
    if (delim === 'PIPE') return '|';
  }

  const linha = String(primeiraLinha || '');
  const candidatos = [';', ',', '\t', '|'];
  let melhor = ';';
  let score = -1;

  candidatos.forEach(function (sep) {
    const qtd = splitLinhaCsvCentralArMain_(linha, sep).length;
    if (qtd > score) {
      score = qtd;
      melhor = sep;
    }
  });

  return melhor;
}

function splitLinhaCsvCentralArMain_(linha, separador) {
  const out = [];
  let atual = '';
  let emAspas = false;

  linha = String(linha == null ? '' : linha);

  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    const prox = linha[i + 1];

    if (ch === '"') {
      if (emAspas && prox === '"') {
        atual += '"';
        i++;
      } else {
        emAspas = !emAspas;
      }
      continue;
    }

    if (ch === separador && !emAspas) {
      out.push(atual);
      atual = '';
      continue;
    }

    atual += ch;
  }

  out.push(atual);
  return out;
}

// ============================================================
// 5. DIAGNÓSTICO E RESUMO
// ============================================================

function diagnosticarEstruturaEntradaCentralArMain_(matrix, displayMatrix) {
  matrix = Array.isArray(matrix) ? matrix : [];
  displayMatrix = Array.isArray(displayMatrix) && displayMatrix.length ? displayMatrix : matrix;

  if (!displayMatrix.length) {
    return { encontrouCabecalho: false, headerRowIndex: -1, colunas: {} };
  }

  try {
    const header = localizarCabecalhoCentralArParser_(displayMatrix);
    return {
      encontrouCabecalho: header.score >= 2,
      headerRowIndex: header.headerRowIndex,
      score: header.score,
      colunas: header.map || {}
    };
  } catch (e) {
    return {
      encontrouCabecalho: false,
      headerRowIndex: -1,
      colunas: {},
      erro: e.message
    };
  }
}

function montarResumoRetornoCentralArMain_(analise) {
  analise = analise || {};
  const m = analise.metricasAr || {};
  const p = m.pressao || {};
  const o = m.orvalho || {};

  return {
    status: analise.statusAprovacao || 'SEM_STATUS',
    totalRegistros: analise.totalRegistros || 0,
    inicio: analise.tempoInicioCiclo || '',
    fim: analise.tempoFimCiclo || '',
    pressaoMin: p.min,
    pressaoMed: p.media,
    pressaoMax: p.max,
    orvalhoMin: o.min,
    orvalhoMed: o.media,
    orvalhoMax: o.max,
    motivosReprovacao: analise.motivosReprovacao || [],
    alertasAnalise: analise.alertasAnalise || [],
    periodoAnalise: analise.periodoAnalise || {}
  };
}

// ============================================================
// 6. PDF / EXPORTAÇÃO
// ============================================================

function tentarGerarPdfComRetryMain_(spreadsheetId, payload, tentativas) {
  tentativas = numeroSeguroMain_(tentativas, 3);
  let ultimoErro = '';

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      SpreadsheetApp.flush();
      Utilities.sleep(2500 * tentativa);
      return gerarPdfDaPlanilhaMain_(spreadsheetId, payload);
    } catch (err) {
      ultimoErro = err && err.message ? err.message : String(err);
      registrarLogMain_('Tentativa PDF ' + tentativa + ' falhou: ' + ultimoErro);
    }
  }

  return {
    ok: false,
    fileId: '',
    fileUrl: '',
    fileName: '',
    erro: ultimoErro || 'Falha desconhecida ao gerar PDF.'
  };
}

function gerarPdfDaPlanilhaMain_(spreadsheetId, payload) {
  payload = payload || {};

  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID não informado para geração do PDF.');
  }

  const nomeBase = montarNomeBasePdfMain_(payload);
  const exportUrl = montarUrlExportacaoPdfMain_(spreadsheetId);
  const token = ScriptApp.getOAuthToken();

  const resp = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Falha ao gerar PDF do relatório. Código HTTP: ' + code + '. Retorno: ' + truncarTextoMain_(resp.getContentText(), 500));
  }

  const blob = resp.getBlob();
  if (!blob || !blob.getBytes || !blob.getBytes().length) {
    throw new Error('PDF retornado vazio pelo serviço de exportação.');
  }

  blob.setName(nomeBase + '.pdf');

  const folderId = obterIdPastaConfiguradaMain_('LAUDOS_FOLDER_ID');
  let file;

  try {
    if (folderId) {
      const folder = DriveApp.getFolderById(folderId);
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
  } catch (eFolder) {
    registrarLogMain_('Aviso: Falha ao salvar PDF na pasta especificada. Tentando salvar na raiz. Erro: ' + eFolder.message);
    file = DriveApp.createFile(blob);
  }

  return {
    ok: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName(),
    erro: ''
  };
}

function montarUrlExportacaoPdfMain_(spreadsheetId) {
  return 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export?format=pdf' +
    '&portrait=false' +
    '&size=A4' +
    '&fitw=true' +
    '&sheetnames=false' +
    '&printtitle=false' +
    '&pagenumbers=true' +
    '&gridlines=false' +
    '&fzr=false' +
    '&top_margin=0.30' +
    '&bottom_margin=0.30' +
    '&left_margin=0.30' +
    '&right_margin=0.30';
}

function montarNomeBasePdfMain_(payload) {
  const tag = sanitizarNomeArquivoMain_(payload.tag || 'SEM_TAG');
  const carimbo = Utilities.formatDate(new Date(), obterTimezoneMain_(), 'ddMMyyyy_HHmm');
  return sanitizarNomeArquivoMain_('RELATORIO_AR_' + tag + '_' + carimbo).replace(/\.csv$/i, '');
}

// ============================================================
// 7. VALIDAÇÕES / DEPENDÊNCIAS
// ============================================================

function validarDependenciasConversaoMain_() {
  const faltantes = [];

  if (typeof normalizarMatrizCentralAr !== 'function') faltantes.push('normalizarMatrizCentralAr');
  if (typeof analisarCiclo !== 'function') faltantes.push('analisarCiclo');
  if (typeof gerarPlanilhaAuditoria !== 'function') faltantes.push('gerarPlanilhaAuditoria');

  if (faltantes.length) {
    throw new Error('Dependências obrigatórias não encontradas: ' + faltantes.join(', '));
  }
}

// ============================================================
// 8. HELPERS DE DATA / REGISTRO
// ============================================================

function extrairDataRegistroMain_(item) {
  if (!item) return null;

  const chavesDiretas = [
    'timestamp', 'dateTime', 'datetime', 'dataHora', 'data_hora',
    'dt', 'tempo', 'tempoDate', 'datahora', 'data_hora_iso'
  ];

  for (let i = 0; i < chavesDiretas.length; i++) {
    const valor = item[chavesDiretas[i]];
    const dt = parseDataFlexMain_(valor);
    if (dt) return dt;
  }

  if (item.data && item.hora) {
    const dtComposta = parseDataFlexMain_(String(item.data) + ' ' + String(item.hora));
    if (dtComposta) return dtComposta;
  }

  return null;
}

function parseDataFlexMain_(valor) {
  if (!valor && valor !== 0) return null;

  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return valor;
  }

  if (typeof valor === 'number') {
    const base = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (!isNaN(base.getTime())) return base;
  }

  const s = String(valor).trim();
  if (!s) return null;

  const dtNative = new Date(s);
  if (!isNaN(dtNative.getTime())) return dtNative;

  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m1) {
    return new Date(
      Number(m1[3]),
      Number(m1[2]) - 1,
      Number(m1[1]),
      Number(m1[4] || 0),
      Number(m1[5] || 0),
      Number(m1[6] || 0)
    );
  }

  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m2) {
    return new Date(
      Number(m2[1]),
      Number(m2[2]) - 1,
      Number(m2[3]),
      Number(m2[4] || 0),
      Number(m2[5] || 0),
      Number(m2[6] || 0)
    );
  }

  const m3 = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m3) {
    return new Date(
      Number(m3[3]),
      Number(m3[2]) - 1,
      Number(m3[1]),
      Number(m3[4] || 0),
      Number(m3[5] || 0),
      Number(m3[6] || 0)
    );
  }

  return null;
}

// ============================================================
// 8.1 RETORNO PADRÃO DE ERRO CONTROLADO
// ============================================================

function montarRetornoErroConversaoMain_(mensagem, payload, extra) {
  extra = extra || {};

  const periodoAnalise = extra.periodoAnalise || {};
  const analise = extra.analise || {};
  const analiseResumo = extra.analiseResumo || {
    status: 'SEM_STATUS',
    totalRegistros: numeroSeguroMain_(extra.totalRegistrosAnalisados, 0),
    inicio: '',
    fim: '',
    pressaoMin: null,
    pressaoMed: null,
    pressaoMax: null,
    orvalhoMin: null,
    orvalhoMed: null,
    orvalhoMax: null,
    motivosReprovacao: [mensagem],
    alertasAnalise: [],
    periodoAnalise: periodoAnalise
  };

  registrarLogMain_(
    'Retorno controlado de erro | etapa=' + valorSeguroMain_(extra.etapa || '') +
    ' | msg=' + valorSeguroMain_(mensagem)
  );

  const analiseLeve = {};
  if (analise) {
    Object.keys(analise).forEach(function(k) {
      if (!Array.isArray(analise[k]) || k === 'motivosReprovacao' || k === 'alertasAnalise') {
         analiseLeve[k] = analise[k];
      }
    });
  }

  return {
    ok: false,
    aprovado: false,
    statusAprovacao: valorSeguroMain_(analise.statusAprovacao || 'SEM_STATUS'),
    erro: valorSeguroMain_(mensagem),
    etapaErro: valorSeguroMain_(extra.etapa || ''),
    spreadsheetId: valorSeguroMain_(extra.spreadsheetId || ''),
    spreadsheetUrl: valorSeguroMain_(extra.spreadsheetUrl || ''),
    pdfUrl: '',
    pdfFileId: '',
    pdfFileName: '',
    pdfError: '',
    analise: analiseLeve, 
    analiseResumo: analiseResumo,
    periodoAnalise: periodoAnalise
  };
}

// ============================================================
// 9. HELPERS GERAIS
// ============================================================

function obterTituloAplicacaoMain_() {
  const app = obterConfigMain_('APP', {});
  return (app && app.NOME) ? app.NOME : 'METROLABS';
}

function obterConfigMain_(chave, fallback) {
  if (typeof UCFG === 'undefined' || !UCFG || typeof UCFG !== 'object') return fallback;
  return UCFG[chave] || fallback;
}

function obterTimezoneMain_() {
  const app = obterConfigMain_('APP', {});
  return valorSeguroMain_(app.TZ || Session.getScriptTimeZone());
}

function obterIdPastaConfiguradaMain_(nomePropriedade) {
  const setup = obterConfigMain_('SETUP', {});
  const propriedades = setup.PROPRIEDADES || {};
  const chave = propriedades[nomePropriedade] || '';
  if (!chave) return '';
  return PropertiesService.getScriptProperties().getProperty(chave) || '';
}

function extrairFileIdGoogleMain_(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  const m = s.match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

function sanitizarNomeArquivoMain_(nome) {
  return String(nome || 'arquivo.csv')
    .replace(/[\\/:*?"<>|#\[\]]+/g, '_')
    .trim();
}

function numeroSeguroMain_(valor, fallback) {
  const n = Number(valor);
  return isFinite(n) ? n : fallback;
}

function valorSeguroMain_(valor) {
  return String(valor == null ? '' : valor);
}

function formatarCnpjMain_(cnpj) {
  const n = String(cnpj || '').replace(/\D/g, '');
  if (n.length !== 14) return n;
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function truncarTextoMain_(texto, limite) {
  texto = valorSeguroMain_(texto);
  limite = numeroSeguroMain_(limite, 500);
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto;
}

function registrarLogMain_(mensagem) {
  Logger.log('[Main.gs] ' + mensagem);
}

function registrarErroMain_(origem, err, payload) {
  const msg = err && err.message ? err.message : String(err);
  Logger.log('[Main.gs][' + origem + '] ' + msg + ' | payload=' + JSON.stringify(payload || {}));
}