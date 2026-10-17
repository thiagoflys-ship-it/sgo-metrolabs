/****************************************************
 * METROLABS  CONVERSOR UNIVERSAL DATALOGGER  V4.8
 * ARQUIVO: Parser.gs
 * SISTEMA UNIFICADO: TERMO E ULTRASSONICA
 * FUNCAO:
 * Leitura inteligente de entrada, conversao de arquivos,
 * pre-visualizacao, diagnstico estrutural e normalizao
 * dos dados para analise tecnica.
 * * NAOVO: Auto-Cura de Linha do Tempo (Healer) para 
 * bypass de rollovers 12h e micro-reverses de dataloggers.
 ****************************************************/

/**
 * L os dados da origem escolhida e devolve:
 * - matrix: valores nativos
 * - displayMatrix: valores formatados
 * - diagnostico: resumo estrutural
 */
function LavRel_lerDadosEntradaRich_(payload) {
  payload = payload || {};

  const modoEntrada = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const delimManual = String(payload.delimManual || 'AUTO').toUpperCase().trim();

  let matrix = null;
  let displayMatrix = null;

  if (modoEntrada === 'FILE_ID') {
    if (!payload.fileId) {
      throw new Error('Cole o ID ou o link completo do arquivo gerado pelo Google Drive no campo.');
    }

    const idLimpo = LavRel_extrairDriveIdSeguro_(String(payload.fileId || '').trim());
    if (!idLimpo) {
      throw new Error('Não foi possível identificar o ID do arquivo informado.');
    }

    let file;
    try {
      file = DriveApp.getFileById(idLimpo);
    } catch (e) {
      throw new Error('Arquivo não encontrado. Verifique se o link/ID est correto e se você possui acesso ao arquivo.');
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
    const m = LavRel_extrairDeTextoColadoRobustamente(payload.textoColado, delimManual);
    matrix = m;
    displayMatrix = m;
  } else {
    throw new Error('Modo de leitura invalido.');
  }

  if (!matrix || matrix.length < 2) {
    throw new Error('A planilha está vazia ou os dados não estáo no formato esperado.');
  }

  const diagnostico = LavRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix);
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
// PROCESSAMENTO DE MATRIZES E AUTO-CURA
// ------------------------------------------------------------

function LavRel_curarLinhaDoTempo_(rows) {
  if (!rows || rows.length < 2) return;

  let prev = rows[0].tempoDate;
  let offsetAcumulado = 0;

  for (let i = 1; i < rows.length; i++) {
    let cur = rows[i].tempoDate;
    if (!(cur instanceof Date) || isNaN(cur.getTime())) continue;

    // Aplica o offset acumulado de rollovers anteriores
    if (offsetAcumulado > 0) {
      cur = new Date(cur.getTime() + offsetAcumulado);
      rows[i].tempoDate = cur;
    }

    let deltaMs = cur.getTime() - prev.getTime();

    if (deltaMs < 0) {
      // Reverso detectada.  um rollover de 12h sem PM/AM? (ex: 12:59 -> 01:00)
      // Um salto de 12:59 para 01:00 representa uma queda de aprox -11 horas (-39.600.000 ms)
      if (deltaMs <= -36000000 && deltaMs >= -43200000) {
        offsetAcumulado += 12 * 60 * 60 * 1000; // Soma 12 horas
        cur = new Date(cur.getTime() + (12 * 60 * 60 * 1000));
        rows[i].tempoDate = cur;
        deltaMs = cur.getTime() - prev.getTime();
      }

      // Se ainda for negativo (micro-reverso de engasgo do datalogger)
      if (deltaMs < 0) {
        // Fora a monotonicidade adicionando 1 segundo ao registro anterior
        cur = new Date(prev.getTime() + 1000);
        rows[i].tempoDate = cur;
      }
    }
    prev = cur;
  }
}

function LavRel_extrairDeTextoColadoRobustamente(txt, delimManual) {
  txt = String(txt || '').replace(/\r/g, '').trim();
  if (!txt) return null;

  const lines = txt
    .split('\n')
    .map(function(l) { return String(l || '').trim(); })
    .filter(function(l) { return l !== ''; });

  if (lines.length < 2) return null;

  const matrix = [];
  for (let i = 0; i < Math.min(lines.length, LavRel_UCFG.MAX_PARSE_ROWS); i++) {
    const parts = LavRel_smartSplitLine_(lines[i], delimManual);
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

function LavRel_smartSplitLine_(line, delimManual) {
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
    return LavRel_splitCsvPreservingQuotes_(line);
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
      return LavRel_splitCsvPreservingQuotes_(line);
    }
  }

  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map(function(s) { return String(s || '').trim(); });
  }

  return line.split(/\s+/).map(function(s) { return String(s || '').trim(); });
}

function LavRel_splitCsvPreservingQuotes_(line) {
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

function LavRel_parseNumeroRobusto_(valor) {
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
 * Normaliza a matriz de entrada para o formato esperado pelo motor de analise.
 */
function LavRel_normalizarMatrizParaAnalise(matriz, displayMatrix, nSensores, dateStyle) {
  if (!matriz || !matriz.length) {
    throw new Error('Matriz vazia para normalizao.');
  }

  displayMatrix = displayMatrix || matriz;
  nSensores = Number(nSensores || LavRel_UCFG.DEFAULT_N || 12);

  const headerDisplay = (displayMatrix[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = headerDisplay.map(function(h) { return LavRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = LavRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = LavRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = LavRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = LavRel_findPressaoIndexParser_(hlow);
  const tempIdx = LavRel_findTempColumnsParser_(headerDisplay, idxTempo, idxData, idxHora, idxPressao);

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

  let estilo = String(dateStyle || LavRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  if (estilo === 'AUTO') {
    const idxDataRef = (idxTempo !== -1)
      ? idxTempo
      : (idxData !== -1 ? idxData : 0);

    estilo = LavRel_detectarPadraoDataNaMatriz_(displayMatrix, startIdx, idxDataRef);
  }

  const outRows = [];
  let linhasDescartadasTempo = 0;
  let linhasDescartadasTemp = 0;
  let ultimaDataValida = null;

  for (let r = startIdx; r < matriz.length; r++) {
    const row = matriz[r] || [];
    const rowDisplay = displayMatrix[r] || row;

    const tempoInfo = LavRel_extrairTempoDaLinhaParser_(row, {
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

    const tempoStr = Utilities.formatDate(tempoDate, LavRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');

    const temps = LavRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, {
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
      pressao = LavRel_parseNumeroRobusto_(row[idxPressao]);
    } else {
      pressao = LavRel_inferirPressaoSemCabecalhoParser_(row, nSensores, tempoInfo.colunasConsumidas);
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

  // ALGORITMO HEALER: Sanitiza saltos e engasgos de tempo antes da ordem matemtica
  LavRel_curarLinhaDoTempo_(outRows);

  outRows.sort(function(a, b) {
    return a.tempoDate.getTime() - b.tempoDate.getTime();
  });

  LavRel_reconstruirSequenciaTemporalSeNecessario_(outRows);
  LavRel_normalizarTempoStrRows_(outRows);
  LavRel_validarSequenciaTempoNormalizado_(outRows);

  return outRows;
}

/**
 * Mescla N séries independentes (uma por sensor, cada uma já normalizada
 * por LavRel_normalizarMatrizParaAnalise com 1 sensor só) numa única linha do
 * tempo, no mesmo formato que o modo de arquivo único produz
 * ({tempoStr, tempoDate, temperaturas:[...]}) — o resto do pipeline
 * (análise/laudo/gráficos) não precisa saber a origem dos dados.
 *
 * seriesPorSensor[s] é a série do sensor s (array de linhas) ou null/[]
 * se aquele sensor não tiver arquivo (ex.: sensor desativado). A série
 * com mais leituras vira a linha do tempo de referência; para os
 * demais sensores, cada ponto da referência busca a leitura mais
 * próxima dentro de uma tolerância — sem correspondência dentro da
 * tolerância, o valor fica null naquele ponto (o motor já ignora
 * valores null sem quebrar, igual a um sensor com falha de leitura).
 */
function LavRel_mesclarSeriesPorSensor_(seriesPorSensor, opcoes) {
  opcoes = opcoes || {};

  if (!Array.isArray(seriesPorSensor) || !seriesPorSensor.length) {
    throw new Error('Nenhuma série de sensor foi informada para mesclagem.');
  }

  const nSensores = seriesPorSensor.length;

  let refIdx = -1;
  let refLen = 0;
  for (let s = 0; s < nSensores; s++) {
    const serie = seriesPorSensor[s];
    if (Array.isArray(serie) && serie.length > refLen) {
      refLen = serie.length;
      refIdx = s;
    }
  }

  if (refIdx === -1) {
    throw new Error('Nenhum arquivo de sensor válido foi encontrado para servir de referência de linha do tempo.');
  }

  const serieRef = seriesPorSensor[refIdx];

  let somaDelta = 0;
  let countDelta = 0;
  for (let i = 1; i < serieRef.length; i++) {
    const dt = serieRef[i].tempoDate.getTime() - serieRef[i - 1].tempoDate.getTime();
    if (dt > 0) {
      somaDelta += dt;
      countDelta++;
    }
  }
  const intervaloMedioMs = countDelta ? (somaDelta / countDelta) : 60000;
  const toleranciaMs = Number(opcoes.toleranciaMs) > 0 ? Number(opcoes.toleranciaMs) : Math.round(intervaloMedioMs * 0.5);

  const ponteiros = new Array(nSensores).fill(0);

  const linhasFinais = serieRef.map(function(linhaRef) {
    const alvoMs = linhaRef.tempoDate.getTime();
    const temperaturas = new Array(nSensores).fill(null);

    for (let s = 0; s < nSensores; s++) {
      const serie = seriesPorSensor[s];
      if (!Array.isArray(serie) || !serie.length) continue;

      let p = ponteiros[s];
      while (p < serie.length - 1 &&
        Math.abs(serie[p + 1].tempoDate.getTime() - alvoMs) <= Math.abs(serie[p].tempoDate.getTime() - alvoMs)) {
        p++;
      }
      ponteiros[s] = p;

      const diffMs = Math.abs(serie[p].tempoDate.getTime() - alvoMs);
      if (diffMs <= toleranciaMs) {
        temperaturas[s] = serie[p].temperaturas[0];
      }
    }

    return {
      tempoStr: linhaRef.tempoStr,
      tempoDate: linhaRef.tempoDate,
      temperaturas: temperaturas
    };
  });

  return linhasFinais;
}

// ------------------------------------------------------------
// EXTRACAO ROBUSTA DE TEMPO / TEMPERATURA / PRESSO
// ------------------------------------------------------------

function LavRel_extrairTempoDaLinhaParser_(row, ctx) {
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

    const dtSeparadoDisplay = LavRel_parseDataHoraSeparadaRobusta_(dataBrutaDisplay, horaBrutaDisplay, dateStyle, ultimaDataValida);
    if (dtSeparadoDisplay) {
      return {
        tempoDate: dtSeparadoDisplay,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const dataBruta = row[idxData];
    const horaBruta = row[idxHora];

    const dtSeparado = LavRel_parseDataHoraSeparadaRobusta_(dataBruta, horaBruta, dateStyle, ultimaDataValida);
    if (dtSeparado) {
      return {
        tempoDate: dtSeparado,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const combinadoDisplay = String(dataBrutaDisplay || '').trim() + ' ' + String(horaBrutaDisplay || '').trim();
    const dtDisplay = LavRel_parseDataHoraRobusta_(combinadoDisplay, dateStyle, ultimaDataValida);
    if (dtDisplay) {
      return {
        tempoDate: dtDisplay,
        colunasConsumidas: [idxData, idxHora]
      };
    }

    const combinado = String(dataBruta || '').trim() + ' ' + String(horaBruta || '').trim();
    const dt = LavRel_parseDataHoraRobusta_(combinado, dateStyle, ultimaDataValida);
    if (dt) {
      return {
        tempoDate: dt,
        colunasConsumidas: [idxData, idxHora]
      };
    }
  }

  if (idxTempo !== -1) {
    const dtTempoDisplay = LavRel_parseDataHoraRobusta_(rowDisplay[idxTempo], dateStyle, ultimaDataValida);
    if (dtTempoDisplay) {
      return {
        tempoDate: dtTempoDisplay,
        colunasConsumidas: [idxTempo]
      };
    }

    const dtTempo = LavRel_parseDataHoraRobusta_(row[idxTempo], dateStyle, ultimaDataValida);
    if (dtTempo) {
      return {
        tempoDate: dtTempo,
        colunasConsumidas: [idxTempo]
      };
    }
  }

  const dt0Display = LavRel_parseDataHoraRobusta_(rowDisplay[0], dateStyle, ultimaDataValida);
  if (dt0Display) {
    return {
      tempoDate: dt0Display,
      colunasConsumidas: [0]
    };
  }

  const dt0 = LavRel_parseDataHoraRobusta_(row[0], dateStyle, ultimaDataValida);
  if (dt0) {
    return {
      tempoDate: dt0,
      colunasConsumidas: [0]
    };
  }

  if (row.length >= 2) {
    const dtCombinadoDisplay = LavRel_parseDataHoraSeparadaRobusta_(rowDisplay[0], rowDisplay[1], dateStyle, ultimaDataValida);
    if (dtCombinadoDisplay) {
      return {
        tempoDate: dtCombinadoDisplay,
        colunasConsumidas: [0, 1]
      };
    }

    const dtCombinado = LavRel_parseDataHoraSeparadaRobusta_(row[0], row[1], dateStyle, ultimaDataValida);
    if (dtCombinado) {
      return {
        tempoDate: dtCombinado,
        colunasConsumidas: [0, 1]
      };
    }

    const combinado01Display = String(rowDisplay[0] || '').trim() + ' ' + String(rowDisplay[1] || '').trim();
    const dt01Display = LavRel_parseDataHoraRobusta_(combinado01Display, dateStyle, ultimaDataValida);
    if (dt01Display) {
      return {
        tempoDate: dt01Display,
        colunasConsumidas: [0, 1]
      };
    }

    const combinado01 = String(row[0] || '').trim() + ' ' + String(row[1] || '').trim();
    const dt01 = LavRel_parseDataHoraRobusta_(combinado01, dateStyle, ultimaDataValida);
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

function LavRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, ctx) {
  row = row || [];
  tempIdx = tempIdx || [];
  ctx = ctx || {};

  const temps = [];

  if (tempIdx.length) {
    for (let i = 0; i < Math.min(nSensores, tempIdx.length); i++) {
      temps.push(LavRel_parseNumeroRobusto_(row[tempIdx[i]]));
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

    const num = LavRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      candidatos.push({ idx: c, valor: num });
    }
  }

  for (let i = 0; i < candidatos.length && temps.length < nSensores; i++) {
    temps.push(candidatos[i].valor);
  }

  return temps;
}

function LavRel_inferirPressaoSemCabecalhoParser_(row, nSensores, colunasConsumidas) {
  row = row || [];
  colunasConsumidas = colunasConsumidas || [];

  const ignorar = {};
  colunasConsumidas.forEach(function(i) { ignorar[i] = true; });

  const nums = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;

    const num = LavRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      nums.push({ idx: c, valor: num });
    }
  }

  if (nums.length <= nSensores) return null;

  return nums[nSensores] ? nums[nSensores].valor : null;
}

// ------------------------------------------------------------
// DIAGNSTICO DE ESTRUTURA
// ------------------------------------------------------------

function LavRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix) {
  const disp = displayMatrix || matrix || [];

  if (!disp.length) {
    return {
      detectedDateStyle: '',
      hasPressao: false,
      qtdTemperaturas: 0
    };
  }

  const header = (disp[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = header.map(function(h) { return LavRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = LavRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = LavRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = LavRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = LavRel_findPressaoIndexParser_(hlow);
  const tempIdx = LavRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao);

  const idxDetect = (idxTempo !== -1)
    ? idxTempo
    : (idxData !== -1 ? idxData : 0);

  const detectedDateStyle = LavRel_detectarPadraoDataNaMatriz_(disp, 1, idxDetect);

  return {
    detectedDateStyle: detectedDateStyle,
    hasPressao: idxPressao !== -1,
    qtdTemperaturas: tempIdx.length
  };
}

// ------------------------------------------------------------
// PADRO DE DATA / PARSER DE DATA
// ------------------------------------------------------------

function LavRel_detectarPadraoDataNaMatriz_(matriz, startIdx, idxColunaData) {
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

    let m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
    if (m) {
      const a = +m[1];
      const b = +m[2];

      if (a > 12 && b <= 12) brScore++;
      else if (b > 12 && a <= 12) usScore++;
      continue;
    }

    m = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{4}|\d{2})$/);
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
  return LavRel_UCFG.DEFAULT_DATE_STYLE || 'BR';
}

function LavRel_parseDataHoraRobusta_(valor, dateStyle, ultimaDataValida) {
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
      return LavRel_excelSerialToDateTimeParser_(valor);
    }
    if (valor >= 0 && valor < 1 && ultimaDataValida instanceof Date) {
      return LavRel_combinarDataComFracaoDoDiaParser_(ultimaDataValida, valor);
    }
  }

  const s0 = String(valor || '').trim();
  if (!s0) return null;

  const s = s0.replace(/\.\d+$/, '');

  if (LavRel_isHoraIsoladaParser_(s) && ultimaDataValida instanceof Date) {
    return LavRel_combinarDataComHoraStringParser_(ultimaDataValida, s);
  }

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return LavRel_montarDataParserPorEstilo_(m, dateStyle);
  }

  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4}|\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return LavRel_montarDataParserPorEstilo_(m, dateStyle);
  }

  m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const yyyy = +m[1];
    const mm = +m[2];
    const dd = +m[3];
    const hh = +(m[4] || 0);
    const mi = +(m[5] || 0);
    const ss = +(m[6] || 0);

    if (!LavRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss)) return null;

    const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function LavRel_parseDataHoraSeparadaRobusta_(valorData, valorHora, dateStyle, ultimaDataValida) {
  const data = LavRel_parseSomenteDataRobustaParser_(valorData, dateStyle, ultimaDataValida);
  if (!data) return null;

  const hora = LavRel_parseSomenteHoraRobustaParser_(valorHora);
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

function LavRel_parseSomenteDataRobustaParser_(valorData, dateStyle, ultimaDataValida) {
  if (valorData instanceof Date && !isNaN(valorData.getTime())) {
    return new Date(valorData.getFullYear(), valorData.getMonth(), valorData.getDate(), 0, 0, 0);
  }

  if (typeof valorData === 'number' && isFinite(valorData) && valorData > 1000) {
    const dNum = LavRel_excelSerialToDateTimeParser_(valorData);
    if (!dNum) return null;
    return new Date(dNum.getFullYear(), dNum.getMonth(), dNum.getDate(), 0, 0, 0);
  }

  const s = String(valorData || '').trim();
  if (!s) return null;

  if (LavRel_isHoraIsoladaParser_(s) && ultimaDataValida instanceof Date) {
    return new Date(
      ultimaDataValida.getFullYear(),
      ultimaDataValida.getMonth(),
      ultimaDataValida.getDate(),
      0, 0, 0
    );
  }

  const dt = LavRel_parseDataHoraRobusta_(s, dateStyle, ultimaDataValida);
  if (!dt) return null;

  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0);
}

function LavRel_parseSomenteHoraRobustaParser_(valorHora) {
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

function LavRel_montarDataParserPorEstilo_(m, dateStyle) {
  const a = +m[1];
  const b = +m[2];
  // Ano com 2 dígitos (ex.: 8/13/26) vale como 20xx.
  const yyyy = (String(m[3]).length === 2 ? 2000 : 0) + Number(m[3]);
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

  if (!LavRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss)) return null;

  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  return isNaN(d.getTime()) ? null : d;
}

function LavRel_isDataValidaParser_(yyyy, mm, dd, hh, mi, ss) {
  if (!isFinite(yyyy) || !isFinite(mm) || !isFinite(dd)) return false;
  if (yyyy < LavRel_UCFG.MIN_VALID_YEAR || yyyy > LavRel_UCFG.MAX_VALID_YEAR) return false;
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

function LavRel_excelSerialToDateTimeParser_(serial) {
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

function LavRel_isHoraIsoladaParser_(s) {
  s = String(s || '').trim();
  return /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(s);
}

function LavRel_combinarDataComHoraStringParser_(dataBase, horaStr) {
  const hora = LavRel_parseSomenteHoraRobustaParser_(horaStr);
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

function LavRel_combinarDataComFracaoDoDiaParser_(dataBase, fracDia) {
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
// DETECO DE COLUNAS
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
function LavRel_normalizarTextoComparacaoParser_(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function LavRel_findAnyIndexParser_(hlow, keys) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    for (let k = 0; k < keys.length; k++) {
      const kk = LavRel_normalizarTextoComparacaoParser_(keys[k]);
      if (h === kk || h.indexOf(kk) !== -1) return i;
    }
  }
  return -1;
}

function LavRel_findPressaoIndexParser_(hlow) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    if (
      h.indexOf('press') !== -1 ||
      h.indexOf('bar') !== -1 ||
      h.indexOf('mbar') !== -1 ||
      h.indexOf('kpa') !== -1 ||
      h.indexOf('vacuo') !== -1 ||
      h.indexOf('bomba') !== -1 ||
      h.indexOf('nivel') !== -1 ||
      h.indexOf('fluxo') !== -1 ||
      h.indexOf('flow') !== -1 ||
      h.indexOf('analog') !== -1
    ) {
      return i;
    }
  }
  return -1;
}

function LavRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao) {
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
// VALIDACAO E RECONSTRUO TEMPORAL
// ------------------------------------------------------------

function LavRel_reconstruirSequenciaTemporalSeNecessario_(rows) {
  if (!rows || rows.length < 3) return;

  const diagnostico = LavRel_diagnosticarSequenciaTemporal_(rows);
  const cfg = LavRel_UCFG.VALIDACAO_TEMPO || {};

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

function LavRel_normalizarTempoStrRows_(rows) {
  for (let i = 0; i < rows.length; i++) {
    rows[i].tempoStr = Utilities.formatDate(rows[i].tempoDate, LavRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }
}

function LavRel_diagnosticarSequenciaTemporal_(rows) {
  const cfg = LavRel_UCFG.VALIDACAO_TEMPO || {};
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

  const deltaMedianoSegundos = LavRel_calcularMedianaNumerica_(deltas);
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

function LavRel_validarSequenciaTempoNormalizado_(rows) {
  if (!rows || !rows.length) return;

  const cfg = LavRel_UCFG.VALIDACAO_TEMPO || {};
  const maxIguais = Number(cfg.maxTimestampsIguaisSequenciais || 3);

  let prev = null;
  let maiorBlocoIguais = 1;
  let iguaisSequenciais = 1;

  for (let i = 0; i < rows.length; i++) {
    const d = rows[i].tempoDate;

    if (!(d instanceof Date) || isNaN(d.getTime())) continue;

    if (prev) {
      const deltaMin = (d.getTime() - prev.getTime()) / 60000;
      if (deltaMin === 0) {
        iguaisSequenciais++;
        if (iguaisSequenciais > maiorBlocoIguais) maiorBlocoIguais = iguaisSequenciais;
      } else {
        iguaisSequenciais = 1;
      }
    }

    prev = d;
  }

  // Travas punitivas fatais foram substitudas pelo Healer.
  // O motor segue seguro e a operação não vai ser mais interrompida no meio.
}

function LavRel_calcularMedianaNumerica_(arr) {
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

function LavRel_extrairDriveIdSeguro_(input) {
  const s = String(input || '').trim();
  if (!s) return '';

  if (/^[a-zA-Z0-9\-_]{20,}$/.test(s)) return s;

  let m = s.match(/\/(?:d|arquivos|planilhas)\/([a-zA-Z0-9\-_]+)/); // Google (/d/) ou servidor próprio (/arquivos/, /planilhas/)
  if (m && m[1]) return m[1];

  m = s.match(/[?&]id=([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/file\/d\/([a-zA-Z0-9\-_]+)/);
  if (m && m[1]) return m[1];

  return '';
}