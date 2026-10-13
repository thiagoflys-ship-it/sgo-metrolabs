/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - V4.5
 * ARQUIVO: Parser.gs
 * FUNÇÃO:
 * Leitura inteligente de entrada, conversão de arquivos,
 * pré-visualização, diagnóstico estrutural e normalização
 * dos dados para análise técnica.
 *
 * RESPONSABILIDADES:
 * - ler Google Sheets, XLSX, CSV e texto colado
 * - converter arquivos quando necessário
 * - identificar colunas de tempo, temperatura e pressão
 * - detectar padrão de data
 * - normalizar a matriz para o motor de análise
 * - validar consistência cronológica
 * - reconstruir linha do tempo quando necessário
 *
 * CORREÇÃO V4.5:
 * - prioriza displayMatrix para colunas de data/hora
 * - evita distorções temporais de XLSX convertido
 ****************************************************/

/**
 * Mantém compatibilidade com a assinatura esperada pelo restante do sistema.
 * Para análise técnica, prioriza matrix (valor real) e não displayMatrix.
 */
function AutoRel_lerDadosEntradaBruta(payload) {
  const rich = AutoRel_lerDadosEntradaRich_(payload);
  return rich.matrix || rich.displayMatrix || [];
}

/**
 * Lê os dados da origem escolhida e devolve:
 * - matrix: valores nativos
 * - displayMatrix: valores formatados
 * - diagnostico: resumo estrutural
 */
function AutoRel_lerDadosEntradaRich_(payload) {
  payload = payload || {};

  const modoEntrada = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const delimManual = String(payload.delimManual || 'AUTO').toUpperCase().trim();

  let matrix = null;
  let displayMatrix = null;

  if (modoEntrada === 'FILE_ID') {
    if (!payload.fileId) {
      throw new Error('Cole o ID ou o link completo do arquivo gerado pelo Google Drive no campo.');
    }

    const idLimpo = AutoRel_extrairDriveIdSeguro_(String(payload.fileId || '').trim());
    if (!idLimpo) {
      throw new Error('Não foi possível identificar o ID do arquivo informado.');
    }

    let file;
    try {
      file = DriveApp.getFileById(idLimpo);
    } catch (e) {
      throw new Error('Arquivo não encontrado. Verifique se o link/ID está correto e se você possui acesso ao arquivo.');
    }

    const mime = String(file.getMimeType() || '');
    let ssId = null;
    let isTemp = false;

    if (mime === MimeType.GOOGLE_SHEETS) {
      ssId = idLimpo;
    } else if (
      mime === MimeType.MICROSOFT_EXCEL ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === MimeType.CSV ||
      mime === 'text/csv' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'text/plain'
    ) {
      const drv = (typeof globalThis !== 'undefined')
        ? globalThis.Drive
        : (typeof Drive !== 'undefined' ? Drive : null);

      if (!drv || !drv.Files) {
        throw new Error("A API avançada do Drive não está ativa. Ative o Serviço Avançado 'Drive API'.");
      }

      try {
        const resource = {
          title: file.getName().replace(/\.[^.]+$/, '') + ' (TEMP_METROLABS)',
          mimeType: MimeType.GOOGLE_SHEETS
        };

        const converted = drv.Files.copy(resource, idLimpo);
        ssId = converted.id;
        isTemp = true;
      } catch (errConv) {
        throw new Error('Falha ao converter o arquivo na nuvem do Google. Detalhe: ' + errConv.message);
      }
    } else {
      throw new Error('Formato do arquivo não suportado: ' + mime + '. Use Google Sheets, XLSX ou CSV.');
    }

    try {
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheets()[0];
      const rg = sheet.getDataRange();

      matrix = rg.getValues();
      displayMatrix = rg.getDisplayValues();
    } catch (e) {
      throw new Error('Erro ao ler os dados da planilha convertida: ' + e.message);
    } finally {
      if (isTemp && ssId) {
        try {
          const drv = (typeof globalThis !== 'undefined')
            ? globalThis.Drive
            : (typeof Drive !== 'undefined' ? Drive : null);

          if (drv && drv.Files && drv.Files.remove) {
            drv.Files.remove(ssId);
          }
        } catch (e) {}
      }
    }
  } else if (modoEntrada === 'COLAR') {
    const m = AutoRel_extrairDeTextoColadoRobustamente(payload.textoColado, delimManual);
    matrix = m;
    displayMatrix = m;
  } else {
    throw new Error('Modo de leitura inválido.');
  }

  if (!matrix || matrix.length < 2) {
    throw new Error('A planilha está vazia ou os dados não estáo no formato esperado.');
  }

  const diagnostico = AutoRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix);
  diagnostico.modoEntrada = modoEntrada;
  diagnostico.dateStyleDetectado = diagnostico.detectedDateStyle || '';
  diagnostico.sensoresDetectados = diagnostico.qtdTemperaturas || 0;
  diagnostico.pressaoEncontrada = !!diagnostico.hasPressao;

  return {
    matrix: matrix,
    displayMatrix: displayMatrix || matrix,
    diagnostico: diagnostico
  };
}

// ------------------------------------------------------------
// PROCESSAMENTO DE MATRIZES
// ------------------------------------------------------------

function AutoRel_extrairDeTextoColadoRobustamente(txt, delimManual) {
  txt = String(txt || '').replace(/\r/g, '').trim();
  if (!txt) return null;

  const lines = txt
    .split('\n')
    .map(function(l) { return String(l || '').trim(); })
    .filter(function(l) { return l !== ''; });

  if (lines.length < 2) return null;

  const matrix = [];
  for (let i = 0; i < Math.min(lines.length, AutoRel_UCFG.MAX_PARSE_ROWS); i++) {
    const parts = AutoRel_smartSplitLine_(lines[i], delimManual);
    if (parts && parts.length) matrix.push(parts);
  }

  if (!matrix.length) return null;

  const maxCols = matrix.reduce(function(m, r) {
    return Math.max(m, (r || []).length);
  }, 0);

  for (let i = 0; i < matrix.length; i++) {
    while (matrix[i].length < maxCols) matrix[i].push('');
  }

  return matrix;
}

function AutoRel_smartSplitLine_(line, delimManual) {
  line = String(line || '').trim();
  if (!line) return [];

  const mode = String(delimManual || 'AUTO').toUpperCase().trim();

  if (mode === 'TAB') {
    return line.split('\t').map(function(s) { return String(s || '').trim(); });
  }

  if (mode === 'SEMICOLON') {
    return line.split(';').map(function(s) { return String(s || '').trim(); });
  }

  if (mode === 'COMMA') {
    return AutoRel_splitCsvPreservingQuotes_(line);
  }

  if (mode === 'SPACES') {
    return line.split(/\s+/).map(function(s) { return String(s || '').trim(); });
  }

  if (line.indexOf('\t') !== -1) {
    return line.split('\t').map(function(s) { return String(s || '').trim(); });
  }

  if (line.indexOf(';') !== -1) {
    return line.split(';').map(function(s) { return String(s || '').trim(); });
  }

  if (line.indexOf(',') !== -1) {
    const commaCount = (line.match(/,/g) || []).length;
    const looksLikeSingleDecimal = /^\s*-?\d+,\d+\s*$/.test(line);
    const looksLikeDateTimeComma = /^\d{1,2}\/\d{1,2}\/\d{4},\d{1,2}:\d{2}:\d{2}$/.test(line);

    if (commaCount >= 2 && !looksLikeSingleDecimal && !looksLikeDateTimeComma) {
      return AutoRel_splitCsvPreservingQuotes_(line);
    }
  }

  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map(function(s) { return String(s || '').trim(); });
  }

  return line.split(/\s+/).map(function(s) { return String(s || '').trim(); });
}

function AutoRel_splitCsvPreservingQuotes_(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function AutoRel_parseNumeroRobusto_(valor) {
  if (typeof valor === 'number') return valor;
  if (valor === null || valor === undefined || valor === '') return null;

  let s = String(valor || '').trim();
  if (!s) return null;

  s = s.replace(/\s/g, '');

  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes(',') && s.includes('.')) {
    const ultimaVirgula = s.lastIndexOf(',');
    const ultimoPonto = s.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza a matriz de entrada para o formato esperado pelo motor de análise.
 * V4.5:
 * - usa displayMatrix para tempo/data/hora
 * - usa matrix para temperaturas/pressão
 */
function AutoRel_normalizarMatrizParaAnalise(matriz, displayMatrix, nSensores, dateStyle) {
  if (!matriz || !matriz.length) {
    throw new Error('Matriz vazia para normalização.');
  }

  displayMatrix = displayMatrix || matriz;
  nSensores = Number(nSensores || AutoRel_UCFG.DEFAULT_N || 12);

  const headerDisplay = (displayMatrix[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = headerDisplay.map(function(h) { return AutoRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = AutoRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = AutoRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = AutoRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = AutoRel_findPressaoIndexParser_(hlow);
  const tempIdx = AutoRel_findTempColumnsParser_(headerDisplay, idxTempo, idxData, idxHora, idxPressao);

  let startIdx = 1;
  const temCabecalhoDetectado =
    tempIdx.length > 0 ||
    idxTempo !== -1 ||
    idxData !== -1 ||
    idxHora !== -1 ||
    idxPressao !== -1;

  if (!temCabecalhoDetectado) {
    startIdx = 0;
  }

  let estilo = String(dateStyle || AutoRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  if (estilo === 'AUTO') {
    const idxDataRef = (idxTempo !== -1)
      ? idxTempo
      : (idxData !== -1 ? idxData : 0);

    estilo = AutoRel_detectarPadraoDataNaMatriz_(displayMatrix, startIdx, idxDataRef);
  }

  const outRows = [];
  let linhasDescartadasTempo = 0;
  let linhasDescartadasTemp = 0;
  let ultimaDataValida = null;

  for (let r = startIdx; r < matriz.length; r++) {
    const row = matriz[r] || [];
    const rowDisplay = displayMatrix[r] || row;

    const tempoInfo = AutoRel_extrairTempoDaLinhaParser_(row, {
      rowDisplay: rowDisplay,
      idxTempo: idxTempo,
      idxData: idxData,
      idxHora: idxHora,
      dateStyle: estilo,
      ultimaDataValida: ultimaDataValida
    });

    const tempoDate = tempoInfo.tempoDate;
    if (!tempoDate || isNaN(tempoDate.getTime())) {
      linhasDescartadasTempo++;
      continue;
    }

    ultimaDataValida = new Date(
      tempoDate.getFullYear(),
      tempoDate.getMonth(),
      tempoDate.getDate(),
      0, 0, 0, 0
    );

    const tempoStr = Utilities.formatDate(tempoDate, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');

    const temps = AutoRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, {
      idxTempo: idxTempo,
      idxData: idxData,
      idxHora: idxHora,
      idxPressao: idxPressao
    });

    while (temps.length < nSensores) {
      temps.push(null);
    }

    let pressao = null;
    if (idxPressao !== -1) {
      pressao = AutoRel_parseNumeroRobusto_(row[idxPressao]);
    } else {
      pressao = AutoRel_inferirPressaoSemCabecalhoParser_(row, nSensores, tempoInfo.colunasConsumidas);
    }

    const possuiAlgumaTempValida = temps.some(function(t) {
      return t !== null && isFinite(Number(t));
    });

    if (!possuiAlgumaTempValida) {
      linhasDescartadasTemp++;
      continue;
    }

    outRows.push({
      tempoStr: tempoStr,
      tempoDate: tempoDate,
      temperaturas: temps.slice(0, nSensores),
      pressao: pressao
    });
  }

  if (outRows.length < 3) {
    throw new Error(
      'Não foi possível detectar dados válidos após a normalização. ' +
      'Linhas descartadas por tempo: ' + linhasDescartadasTempo +
      ' | Linhas descartadas por temperatura: ' + linhasDescartadasTemp + '.'
    );
  }

  outRows.sort(function(a, b) {
    return a.tempoDate.getTime() - b.tempoDate.getTime();
  });

  AutoRel_reconstruirSequenciaTemporalSeNecessario_(outRows);
  AutoRel_normalizarTempoStrRows_(outRows);
  AutoRel_validarSequenciaTempoNormalizado_(outRows);

  return outRows;
}

// ------------------------------------------------------------
// EXTRAÇÃO ROBUSTA DE TEMPO / TEMPERATURA / PRESSÃO
// ------------------------------------------------------------

function AutoRel_extrairTempoDaLinhaParser_(row, ctx) {
  row = row || [];
  ctx = ctx || {};

  const rowDisplay = ctx.rowDisplay || row;
  const idxTempo = ctx.idxTempo;
  const idxData = ctx.idxData;
  const idxHora = ctx.idxHora;
  const dateStyle = ctx.dateStyle || 'BR';
  const ultimaDataValida = ctx.ultimaDataValida || null;

  if (idxData !== -1 && idxHora !== -1) {
    const dataBrutaDisplay = rowDisplay[idxData];
    const horaBrutaDisplay = rowDisplay[idxHora];

    const dtSeparadoDisplay = AutoRel_parseDataHoraSeparadaRobusta_(dataBrutaDisplay, horaBrutaDisplay, dateStyle, ultimaDataValida);
    if (dtSeparadoDisplay) {
      return {
        tempoDate: dtSeparadoDisplay,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const dataBruta = row[idxData];
    const horaBruta = row[idxHora];

    const dtSeparado = AutoRel_parseDataHoraSeparadaRobusta_(dataBruta, horaBruta, dateStyle, ultimaDataValida);
    if (dtSeparado) {
      return {
        tempoDate: dtSeparado,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const combinadoDisplay = String(dataBrutaDisplay || '').trim() + ' ' + String(horaBrutaDisplay || '').trim();
    const dtDisplay = AutoRel_parseDataHoraRobusta_(combinadoDisplay, dateStyle, ultimaDataValida);
    if (dtDisplay) {
      return {
        tempoDate: dtDisplay,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const combinado = String(dataBruta || '').trim() + ' ' + String(horaBruta || '').trim();
    const dt = AutoRel_parseDataHoraRobusta_(combinado, dateStyle, ultimaDataValida);
    if (dt) {
      return {
        tempoDate: dt,
        colunasConsumidas: [idxData, idxHora]
      };
    }
  }

  if (idxTempo !== -1) {
    const dtTempoDisplay = AutoRel_parseDataHoraRobusta_(rowDisplay[idxTempo], dateStyle, ultimaDataValida);
    if (dtTempoDisplay) {
      return {
        tempoDate: dtTempoDisplay,
        colunasConsumidas: [idxTempo]
      };
    }

    const dtTempo = AutoRel_parseDataHoraRobusta_(row[idxTempo], dateStyle, ultimaDataValida);
    if (dtTempo) {
      return {
        tempoDate: dtTempo,
        colunasConsumidas: [idxTempo]
      };
    }
  }

  const dt0Display = AutoRel_parseDataHoraRobusta_(rowDisplay[0], dateStyle, ultimaDataValida);
  if (dt0Display) {
    return {
      tempoDate: dt0Display,
      colunasConsumidas: [0]
    };
  }

  const dt0 = AutoRel_parseDataHoraRobusta_(row[0], dateStyle, ultimaDataValida);
  if (dt0) {
    return {
      tempoDate: dt0,
      colunasConsumidas: [0]
    };
  }

  if (row.length >= 2) {
    const dtCombinadoDisplay = AutoRel_parseDataHoraSeparadaRobusta_(rowDisplay[0], rowDisplay[1], dateStyle, ultimaDataValida);
    if (dtCombinadoDisplay) {
      return {
        tempoDate: dtCombinadoDisplay,
        colunasConsumidas: [0, 1]
      };
    }

    const dtCombinado = AutoRel_parseDataHoraSeparadaRobusta_(row[0], row[1], dateStyle, ultimaDataValida);
    if (dtCombinado) {
      return {
        tempoDate: dtCombinado,
        colunasConsumidas: [0, 1]
      };
    }

    const combinado01Display = String(rowDisplay[0] || '').trim() + ' ' + String(rowDisplay[1] || '').trim();
    const dt01Display = AutoRel_parseDataHoraRobusta_(combinado01Display, dateStyle, ultimaDataValida);
    if (dt01Display) {
      return {
        tempoDate: dt01Display,
        colunasConsumidas: [0, 1]
      };
    }

    const combinado01 = String(row[0] || '').trim() + ' ' + String(row[1] || '').trim();
    const dt01 = AutoRel_parseDataHoraRobusta_(combinado01, dateStyle, ultimaDataValida);
    if (dt01) {
      return {
        tempoDate: dt01,
        colunasConsumidas: [0, 1]
      };
    }
  }

  return {
    tempoDate: null,
    colunasConsumidas: []
  };
}

function AutoRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, ctx) {
  row = row || [];
  tempIdx = tempIdx || [];
  ctx = ctx || {};

  const temps = [];

  if (tempIdx.length) {
    for (let i = 0; i < Math.min(nSensores, tempIdx.length); i++) {
      temps.push(AutoRel_parseNumeroRobusto_(row[tempIdx[i]]));
    }
    return temps;
  }

  const ignorar = {};
  [ctx.idxTempo, ctx.idxData, ctx.idxHora, ctx.idxPressao].forEach(function(v) {
    if (v !== null && v !== undefined && v !== -1) ignorar[v] = true;
  });

  const candidatos = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;

    const num = AutoRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      candidatos.push({ idx: c, valor: num });
    }
  }

  for (let i = 0; i < candidatos.length && temps.length < nSensores; i++) {
    temps.push(candidatos[i].valor);
  }

  return temps;
}

function AutoRel_inferirPressaoSemCabecalhoParser_(row, nSensores, colunasConsumidas) {
  row = row || [];
  colunasConsumidas = colunasConsumidas || [];

  const ignorar = {};
  colunasConsumidas.forEach(function(i) { ignorar[i] = true; });

  const nums = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;

    const num = AutoRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      nums.push({ idx: c, valor: num });
    }
  }

  if (nums.length <= nSensores) return null;

  return nums[nSensores] ? nums[nSensores].valor : null;
}

// ------------------------------------------------------------
// DIAGNÓSTICO DE ESTRUTURA
// ------------------------------------------------------------

function AutoRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix) {
  const disp = displayMatrix || matrix || [];

  if (!disp.length) {
    return {
      detectedDateStyle: '',
      hasPressao: false,
      qtdTemperaturas: 0
    };
  }

  const header = (disp[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = header.map(function(h) { return AutoRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = AutoRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = AutoRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = AutoRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = AutoRel_findPressaoIndexParser_(hlow);
  const tempIdx = AutoRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao);

  const idxDetect = (idxTempo !== -1)
    ? idxTempo
    : (idxData !== -1 ? idxData : 0);

  const detectedDateStyle = AutoRel_detectarPadraoDataNaMatriz_(disp, 1, idxDetect);

  return {
    detectedDateStyle: detectedDateStyle,
    hasPressao: idxPressao !== -1,
    qtdTemperaturas: tempIdx.length
  };
}

// ------------------------------------------------------------
// PADRÃO DE DATA / PARSER DE DATA
// ------------------------------------------------------------

function AutoRel_detectarPadraoDataNaMatriz_(matriz, startIdx, idxColunaData) {
  let brScore = 0;
  let usScore = 0;
  let isoScore = 0;

  const col = Number(idxColunaData || 0);
  const limite = Math.min(matriz.length, startIdx + 80);

  for (let i = startIdx; i < limite; i++) {
    const row = matriz[i] || [];
    const cel = row[col];

    if (cel instanceof Date) {
      return 'BR';
    }

    const s = String(cel || '').trim();
    if (!s) continue;

    const datePart = s.split(/\s+/)[0];

    let m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const a = +m[1];
      const b = +m[2];

      if (a > 12 && b <= 12) brScore++;
      else if (b > 12 && a <= 12) usScore++;
      continue;
    }

    m = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      const a2 = +m[1];
      const b2 = +m[2];

      if (a2 > 12 && b2 <= 12) brScore++;
      else if (b2 > 12 && a2 <= 12) usScore++;
      continue;
    }

    m = datePart.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
    if (m) {
      isoScore++;
      continue;
    }
  }

  if (isoScore > 0) return 'ISO';
  if (brScore > usScore) return 'BR';
  if (usScore > brScore) return 'US';
  return AutoRel_UCFG.DEFAULT_DATE_STYLE || 'BR';
}

function AutoRel_parseDataHoraRobusta_(valor, dateStyle, ultimaDataValida) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(
      valor.getFullYear(),
      valor.getMonth(),
      valor.getDate(),
      valor.getHours(),
      valor.getMinutes(),
      valor.getSeconds()
    );
  }

  if (typeof valor === 'number' && isFinite(valor)) {
    if (valor > 1000) {
      return AutoRel_excelSerialToDateTimeParser_(valor);
    }
    if (valor >= 0 && valor < 1 && ultimaDataValida instanceof Date) {
      return AutoRel_combinarDataComFracaoDoDiaParser_(ultimaDataValida, valor);
    }
  }

  const s0 = String(valor || '').trim();
  if (!s0) return null;

  const s = s0.replace(/\.\d+$/, '');

  if (AutoRel_isHoraIsoladaParser_(s) && ultimaDataValida instanceof Date) {
    return AutoRel_combinarDataComHoraStringParser_(ultimaDataValida, s);
  }

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return AutoRel_montarDataParserPorEstilo_(m, dateStyle);
  }

  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return AutoRel_montarDataParserPorEstilo_(m, dateStyle);
  }

  m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const yyyy = +m[1];
    const mm = +m[2];
    const dd = +m[3];
    const hh = +(m[4] || 0);
    const mi = +(m[5] || 0);
    const ss = +(m[6] || 0);

    if (!AutoRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss)) return null;

    const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function AutoRel_parseDataHoraSeparadaRobusta_(valorData, valorHora, dateStyle, ultimaDataValida) {
  const data = AutoRel_parseSomenteDataRobustaParser_(valorData, dateStyle, ultimaDataValida);
  if (!data) return null;

  const hora = AutoRel_parseSomenteHoraRobustaParser_(valorHora);
  if (!hora) return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0);

  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    hora.hh,
    hora.mi,
    hora.ss
  );
}

function AutoRel_parseSomenteDataRobustaParser_(valorData, dateStyle, ultimaDataValida) {
  if (valorData instanceof Date && !isNaN(valorData.getTime())) {
    return new Date(valorData.getFullYear(), valorData.getMonth(), valorData.getDate(), 0, 0, 0);
  }

  if (typeof valorData === 'number' && isFinite(valorData) && valorData > 1000) {
    const dNum = AutoRel_excelSerialToDateTimeParser_(valorData);
    if (!dNum) return null;
    return new Date(dNum.getFullYear(), dNum.getMonth(), dNum.getDate(), 0, 0, 0);
  }

  const s = String(valorData || '').trim();
  if (!s) return null;

  if (AutoRel_isHoraIsoladaParser_(s) && ultimaDataValida instanceof Date) {
    return new Date(
      ultimaDataValida.getFullYear(),
      ultimaDataValida.getMonth(),
      ultimaDataValida.getDate(),
      0, 0, 0
    );
  }

  const dt = AutoRel_parseDataHoraRobusta_(s, dateStyle, ultimaDataValida);
  if (!dt) return null;

  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0);
}

function AutoRel_parseSomenteHoraRobustaParser_(valorHora) {
  if (valorHora instanceof Date && !isNaN(valorHora.getTime())) {
    return {
      hh: valorHora.getHours(),
      mi: valorHora.getMinutes(),
      ss: valorHora.getSeconds()
    };
  }

  if (typeof valorHora === 'number' && isFinite(valorHora)) {
    if (valorHora >= 0 && valorHora < 1) {
      const totalSeconds = Math.round(valorHora * 86400);
      return {
        hh: Math.floor(totalSeconds / 3600) % 24,
        mi: Math.floor((totalSeconds % 3600) / 60),
        ss: totalSeconds % 60
      };
    }

    if (valorHora >= 0 && valorHora <= 235959) {
      const sNum = String(Math.round(valorHora)).padStart(6, '0');
      const hh = parseInt(sNum.substring(0, 2), 10);
      const mi = parseInt(sNum.substring(2, 4), 10);
      const ss = parseInt(sNum.substring(4, 6), 10);
      if (hh <= 23 && mi <= 59 && ss <= 59) {
        return { hh: hh, mi: mi, ss: ss };
      }
    }
  }

  const s = String(valorHora || '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const hh = +m[1];
    const mi = +m[2];
    const ss = +(m[3] || 0);
    if (hh <= 23 && mi <= 59 && ss <= 59) {
      return { hh: hh, mi: mi, ss: ss };
    }
  }

  m = s.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    const hh2 = +m[1];
    const mi2 = +m[2];
    const ss2 = +m[3];
    if (hh2 <= 23 && mi2 <= 59 && ss2 <= 59) {
      return { hh: hh2, mi: mi2, ss: ss2 };
    }
  }

  // Alguns dataloggers exportam hora em 4 blocos "HH:MM:SS:mmm" (dois
  // pontos antes do milissegundo, em vez do ponto mais comum). O
  // milissegundo é ignorado pra granularidade de segundo — aditivo,
  // não interfere no padrão de 2/3 blocos acima (nunca bate na mesma
  // string).
  m = s.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d+)$/);
  if (m) {
    const hh3 = +m[1];
    const mi3 = +m[2];
    const ss3 = +m[3];
    if (hh3 <= 23 && mi3 <= 59 && ss3 <= 59) {
      return { hh: hh3, mi: mi3, ss: ss3 };
    }
  }

  return null;
}

function AutoRel_montarDataParserPorEstilo_(m, dateStyle) {
  const a = +m[1];
  const b = +m[2];
  const yyyy = +m[3];
  const hh = +(m[4] || 0);
  const mi = +(m[5] || 0);
  const ss = +(m[6] || 0);

  let dd, mm;
  const style = String(dateStyle || 'BR').toUpperCase();

  if (style === 'US') {
    mm = a;
    dd = b;
  } else {
    dd = a;
    mm = b;
  }

  if (!AutoRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss)) return null;

  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  return isNaN(d.getTime()) ? null : d;
}

function AutoRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss) {
  if (!isFinite(yyyy) || !isFinite(mm) || !isFinite(dd)) return false;
  if (yyyy < AutoRel_UCFG.MIN_VALID_YEAR || yyyy > AutoRel_UCFG.MAX_VALID_YEAR) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  if (hh < 0 || hh > 23) return false;
  if (mi < 0 || mi > 59) return false;
  if (ss < 0 || ss > 59) return false;

  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  return (
    d.getFullYear() === yyyy &&
    d.getMonth() === (mm - 1) &&
    d.getDate() === dd &&
    d.getHours() === hh &&
    d.getMinutes() === mi &&
    d.getSeconds() === ss
  );
}

function AutoRel_excelSerialToDateTimeParser_(serial) {
  if (typeof serial !== 'number' || !isFinite(serial)) return null;

  const base = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const frac = serial - days;

  let totalSeconds = Math.round(frac * 86400);
  if (totalSeconds >= 86400) totalSeconds = 86399;
  if (totalSeconds < 0) totalSeconds = 0;

  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + days,
    hh, mm, ss
  );

  return isNaN(d.getTime()) ? null : d;
}

function AutoRel_isHoraIsoladaParser_(s) {
  s = String(s || '').trim();
  return /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(s);
}

function AutoRel_combinarDataComHoraStringParser_(dataBase, horaStr) {
  const hora = AutoRel_parseSomenteHoraRobustaParser_(horaStr);
  if (!hora || !(dataBase instanceof Date)) return null;

  return new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate(),
    hora.hh,
    hora.mi,
    hora.ss
  );
}

function AutoRel_combinarDataComFracaoDoDiaParser_(dataBase, fracDia) {
  if (!(dataBase instanceof Date)) return null;
  if (typeof fracDia !== 'number' || !isFinite(fracDia)) return null;

  let totalSeconds = Math.round(fracDia * 86400);
  if (totalSeconds >= 86400) totalSeconds = 86399;
  if (totalSeconds < 0) totalSeconds = 0;

  const hh = Math.floor(totalSeconds / 3600);
  const mi = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  return new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate(),
    hh,
    mi,
    ss
  );
}

// ------------------------------------------------------------
// DETECÇÃO DE COLUNAS
// ------------------------------------------------------------

/**
 * Remove acentos + normaliza pra comparação de cabeçalho — alguns
 * dataloggers exportam cabeçalhos acentuados ("Horário"), outros não
 * ("hora", "Hora"). Aditivo: qualquer cabeçalho que já batia sem
 * acento continua batendo (normalizar uma string sem acento é
 * no-op); só passa a bater também a versão acentuada. Não altera
 * nenhum texto original exibido em nenhum outro lugar — usada só
 * nas cópias internas de comparação (`hlow`).
 */
function AutoRel_normalizarTextoComparacaoParser_(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function AutoRel_findAnyIndexParser_(hlow, keys) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    for (let k = 0; k < keys.length; k++) {
      const kk = AutoRel_normalizarTextoComparacaoParser_(keys[k]);
      if (h === kk || h.indexOf(kk) !== -1) return i;
    }
  }
  return -1;
}

function AutoRel_findPressaoIndexParser_(hlow) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    if (
      h.indexOf('press') !== -1 ||
      h.indexOf('bar') !== -1 ||
      h.indexOf('mbar') !== -1 ||
      h.indexOf('kpa') !== -1 ||
      h.indexOf('vacuo') !== -1
    ) {
      return i;
    }
  }
  return -1;
}

function AutoRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao) {
  const cols = [];

  for (let i = 0; i < header.length; i++) {
    if (i === idxTempo || i === idxData || i === idxHora || i === idxPressao) continue;

    const raw = String(header[i] || '').trim();
    const h = raw.toLowerCase();

    const isTemp =
      h.indexOf('temper') !== -1 ||
      (h.indexOf('temp') !== -1 && h.indexOf('tempo') === -1) ||
      /^s[\s\-_]?\d+$/i.test(raw) ||
      /^st[\s\-_]?\d+$/i.test(raw) ||
      /^t[\s\-_]?\d+$/i.test(raw) ||
      /^tp[\s\-_]?\d+$/i.test(raw) ||
      /^ch[\s\-_]?\d+$/i.test(raw) ||
      /^canal[\s\-_]?\d+$/i.test(raw) ||
      /^sensor[\s\-_]?\d+$/i.test(raw);

    if (isTemp) cols.push(i);
  }

  return cols;
}

// ------------------------------------------------------------
// VALIDAÇÃO E RECONSTRUÇÃO TEMPORAL
// ------------------------------------------------------------

function AutoRel_reconstruirSequenciaTemporalSeNecessario_(rows) {
  if (!rows || rows.length < 3) return;

  const diagnostico = AutoRel_diagnosticarSequenciaTemporal_(rows);
  const cfg = AutoRel_UCFG.VALIDACAO_TEMPO || {};

  if (
    !diagnostico.precisaReconstrucao ||
    !cfg.permitirReconstrucaoTempo
  ) {
    return;
  }

  const deltaSeg = diagnostico.deltaMedianoSegundos;
  if (!deltaSeg || !isFinite(deltaSeg) || deltaSeg <= 0) {
    return;
  }

  let base = rows[0].tempoDate;
  if (!(base instanceof Date) || isNaN(base.getTime())) return;

  for (let i = 0; i < rows.length; i++) {
    const novo = new Date(base.getTime() + (i * deltaSeg * 1000));
    rows[i].tempoDate = novo;
  }
}

function AutoRel_normalizarTempoStrRows_(rows) {
  for (let i = 0; i < rows.length; i++) {
    rows[i].tempoStr = Utilities.formatDate(rows[i].tempoDate, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }
}

function AutoRel_diagnosticarSequenciaTemporal_(rows) {
  const cfg = AutoRel_UCFG.VALIDACAO_TEMPO || {};
  const maxIguais = Number(cfg.maxTimestampsIguaisSequenciais || 3);
  const maxSaltoMin = Number(cfg.maxSaltosMinutos || 120);

  let reversoes = 0;
  let iguaisSequenciais = 1;
  let maiorBlocoIguais = 1;
  let saltosAbsurdos = 0;

  const deltas = [];

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].tempoDate;
    const cur = rows[i].tempoDate;

    if (!(prev instanceof Date) || isNaN(prev.getTime()) || !(cur instanceof Date) || isNaN(cur.getTime())) {
      continue;
    }

    const deltaSeg = Math.round((cur.getTime() - prev.getTime()) / 1000);

    if (deltaSeg < 0) reversoes++;

    if (deltaSeg === 0) {
      iguaisSequenciais++;
      if (iguaisSequenciais > maiorBlocoIguais) {
        maiorBlocoIguais = iguaisSequenciais;
      }
    } else {
      iguaisSequenciais = 1;
    }

    if (deltaSeg > 0) {
      deltas.push(deltaSeg);
    }

    if (deltaSeg > maxSaltoMin * 60) {
      saltosAbsurdos++;
    }
  }

  const deltaMedianoSegundos = AutoRel_calcularMedianaNumerica_(deltas);
  const precisaReconstrucao =
    reversoes > 0 ||
    maiorBlocoIguais > maxIguais ||
    saltosAbsurdos > 0;

  return {
    reversoes: reversoes,
    maiorBlocoIguais: maiorBlocoIguais,
    saltosAbsurdos: saltosAbsurdos,
    deltaMedianoSegundos: deltaMedianoSegundos,
    precisaReconstrucao: precisaReconstrucao
  };
}

function AutoRel_validarSequenciaTempoNormalizado_(rows) {
  if (!rows || !rows.length) {
    throw new Error('Não há linhas para validar a sequência temporal.');
  }

  const cfg = AutoRel_UCFG.VALIDACAO_TEMPO || {};
  const maxIguais = Number(cfg.maxTimestampsIguaisSequenciais || 3);
  const maxSaltoMin = Number(cfg.maxSaltosMinutos || 120);
  const intervaloEsperadoMin = Number(cfg.intervaloEsperadoMin || 0.1);
  const intervaloEsperadoMax = Number(cfg.intervaloEsperadoMax || 10);

  let prev = null;
  let reversoes = 0;
  let iguaisSequenciais = 1;
  let maiorBlocoIguais = 1;
  let saltosAbsurdos = 0;
  const deltasMin = [];

  for (let i = 0; i < rows.length; i++) {
    const d = rows[i].tempoDate;

    if (!(d instanceof Date) || isNaN(d.getTime())) {
      throw new Error('Data/hora inválida após normalização na linha ' + (i + 1) + '.');
    }

    if (prev) {
      const deltaMin = (d.getTime() - prev.getTime()) / 60000;

      if (deltaMin < 0) reversoes++;

      if (deltaMin === 0) {
        iguaisSequenciais++;
        if (iguaisSequenciais > maiorBlocoIguais) maiorBlocoIguais = iguaisSequenciais;
      } else {
        iguaisSequenciais = 1;
      }

      if (deltaMin > maxSaltoMin) {
        saltosAbsurdos++;
      }

      if (deltaMin > 0) {
        deltasMin.push(deltaMin);
      }
    }

    prev = d;
  }

  if (reversoes > 0) {
    throw new Error(
      'A linha do tempo foi normalizada com reversões cronológicas (' + reversoes + '). Isso indica interpretação incorreta da coluna de data/hora.'
    );
  }

  if (maiorBlocoIguais > maxIguais) {
    throw new Error(
      'Foram detectados timestamps repetidos em excesso após a normalização (bloco máximo: ' + maiorBlocoIguais + ').'
    );
  }

  if (saltosAbsurdos > 0) {
    throw new Error(
      'Foram detectados saltos temporais excessivos após a normalização (' + saltosAbsurdos + ').'
    );
  }

  const deltaMedianoMin = AutoRel_calcularMedianaNumerica_(deltasMin);
  if (deltaMedianoMin !== null) {
    if (deltaMedianoMin < intervaloEsperadoMin || deltaMedianoMin > intervaloEsperadoMax) {
      throw new Error(
        'O intervalo mediano entre leituras ficou fora do esperado (' + deltaMedianoMin.toFixed(3) + ' min).'
      );
    }
  }
}

function AutoRel_calcularMedianaNumerica_(arr) {
  if (!arr || !arr.length) return null;

  const nums = arr
    .filter(function(v) { return typeof v === 'number' && isFinite(v); })
    .slice()
    .sort(function(a, b) { return a - b; });

  if (!nums.length) return null;

  const meio = Math.floor(nums.length / 2);
  if (nums.length % 2) return nums[meio];
  return (nums[meio - 1] + nums[meio]) / 2;
}

// ------------------------------------------------------------
// HELPERS DE ID/LINK
// ------------------------------------------------------------

function AutoRel_extrairDriveIdSeguro_(input) {
  const s = String(input || '').trim();
  if (!s) return '';

  if (/^[a-zA-Z0-9\-_]{20,}$/.test(s)) return s;

  let m = s.match(/\/d\/([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/[?&]id=([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/file\/d\/([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  return '';
}