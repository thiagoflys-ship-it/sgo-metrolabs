/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - ESTUFA+BANHO-MARIA
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
 * NOTA:
 * - prioriza displayMatrix para colunas de data/hora
 * - evita distorções temporais de XLSX convertido
 ****************************************************/

/**
 * Lê os dados da origem escolhida e devolve:
 * - matrix: valores nativos
 * - displayMatrix: valores formatados
 * - diagnostico: resumo estrutural
 */
function EstufaBanhoRel_lerDadosEntradaRich_(payload) {
  payload=payload||{};
  const modoEntrada=String(payload.modoEntrada||'FILE_ID').toUpperCase();
  let matrix,displayMatrix;
  if(modoEntrada==='COLAR') {
    matrix=EstufaBanhoRel_extrairDeTextoColadoRobustamente(payload.textoColado,payload.delimManual);
    displayMatrix=matrix;
  } else if(modoEntrada==='FILE_ID') {
    const id=EstufaBanhoRel_extrairDriveIdSeguro_(String(payload.fileId||''));
    if(!id)throw new Error('Informe o link ou ID do arquivo do datalogger.');
    const file=DriveApp.getFileById(id),mime=file.getMimeType(),name=file.getName();
    const probe= /\.xls$/i.test(name)?file.getBlob().getBytes().slice(0,4):[];
    const isZipExcel=probe.length>=4&&(probe[0]+256)%256===80&&(probe[1]+256)%256===75&&(probe[2]+256)%256===3&&(probe[3]+256)%256===4;
    if(isZipExcel||/\.xlsx$/i.test(name)||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      matrix=EstufaBanhoRel_lerXlsxOriginal_(file.getBlob(),payload);displayMatrix=matrix;
    } else if(/\.(csv|txt|tsv)$/i.test(name)||/^(text\/csv|text\/plain|text\/tab-separated-values)$/.test(mime)) {
      matrix=EstufaBanhoRel_extrairDeTextoColadoRobustamente(EstufaBanhoRel_textoOriginal_(file.getBlob()),payload.delimManual);displayMatrix=matrix;
    } else {
      let ssId=id,temp=false;
      if(mime!==MimeType.GOOGLE_SHEETS) {
        if(mime!=='application/vnd.ms-excel'&&!/\.xls$/i.test(name))throw new Error('Use XLSX, XLS, CSV, TXT ou Google Sheets.');
        const converted=Drive.Files.create({name:name+' (TEMP_CADEIA_FRIA)',mimeType:MimeType.GOOGLE_SHEETS},file.getBlob(),{fields:'id'});
        ssId=converted.id;temp=true;
      }
      try {
        const ss=SpreadsheetApp.openById(ssId),tz=ss.getSpreadsheetTimeZone(),sheet=EstufaBanhoRel_selecionarAbaEntrada_(ss.getSheets(),payload);
        if(sheet.getLastRow()>EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Confira a área usada da planilha.');
        const range=sheet.getDataRange();
        matrix=range.getValues();displayMatrix=range.getDisplayValues();
        // Datas nativas prevalecem sobre a formatação visual (que pode ocultar segundos).
        matrix=matrix.map(function(row,r){return row.map(function(value,c){
          if(value instanceof Date&&!isNaN(value.getTime())) {
            const year=Number(Utilities.formatDate(value,tz,'yyyy'));
            const text=Utilities.formatDate(value,tz,year<1901?'HH:mm:ss':'yyyy-MM-dd HH:mm:ss');
            displayMatrix[r][c]=text;return text;
          }
          return value;
        });});
      } finally {if(temp)try{DriveApp.getFileById(ssId).setTrashed(true);}catch(e){}}
    }
  } else throw new Error('Modo de leitura inválido.');
  if(!matrix||matrix.length<2)throw new Error('Arquivo vazio ou sem registros suficientes.');
  if(matrix.length>EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
  const table=EstufaBanhoRel_prepararTabelaDatas_(matrix,displayMatrix||matrix);
  matrix=table.matrix;displayMatrix=table.displayMatrix;
  const diagnostico=EstufaBanhoRel_diagnosticarEstruturaEntrada_(matrix,displayMatrix);
  diagnostico.modoEntrada=modoEntrada;
  diagnostico.dateStyleDetectado=diagnostico.detectedDateStyle;
  diagnostico.sensoresDetectados=diagnostico.qtdTemperaturas||0;
  return {matrix:matrix,displayMatrix:displayMatrix,diagnostico:diagnostico};
}


function EstufaBanhoRel_extrairDeTextoColadoRobustamente(txt, delimManual) {
  txt = String(txt || '').replace(/\r/g, '').trim();
  if (!txt) return null;

  const delimiters={TAB:'\t',SEMICOLON:';',COMMA:','};
  let separator=delimiters[String(delimManual||'AUTO').toUpperCase()];
  if(!separator&&String(delimManual||'AUTO').toUpperCase()==='AUTO') {
    const sample=txt.split('\n').slice(0,100).join('\n').replace(/"(?:[^"]|"")*"/g,'');
    const whitespaceDecimal=txt.split('\n').filter(function(l){return /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\s+\d{1,2}:\d{2}/.test(l);}).some(function(l){return /\s[+-]?\d+,\d+(?:\s|$)/.test(l)&&l.indexOf(';')===-1&&l.indexOf('\t')===-1;});
    separator=whitespaceDecimal?null:sample.indexOf('\t')!==-1?'\t':sample.indexOf(';')!==-1?';':sample.indexOf(',')!==-1?',':null;
  }
  if(separator){
    const parsed=Utilities.parseCsv(txt,separator).filter(function(row){return row.some(function(v){return String(v).trim()!=='';});});
    if(parsed.length>EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
    return parsed;
  }

  const lines = txt
    .split('\n')
    .map(function(l) { return String(l || '').trim(); })
    .filter(function(l) { return l !== ''; });

  if (lines.length < 2) return null;

  if(lines.length>EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
  const matrix = [];
  for (let i = 0; i < Math.min(lines.length, EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS); i++) {
    const parts = EstufaBanhoRel_smartSplitLine_(lines[i], delimManual);
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

function EstufaBanhoRel_smartSplitLine_(line, delimManual) {
  line = String(line || '').trim();
  if (!line) return [];
  const mode = String(delimManual || 'AUTO').toUpperCase().trim();
  if (mode === 'TAB') {
    return line.split('\t').map(function (s) {
      return String(s || '').trim();
    });
  }
  if (mode === 'SEMICOLON') {
    return line.split(';').map(function (s) {
      return String(s || '').trim();
    });
  }
  if (mode === 'COMMA') {
    return EstufaBanhoRel_splitCsvPreservingQuotes_(line);
  }
  if (mode === 'SPACES') {
    return line.split(/\s+/).map(function (s) {
      return String(s || '').trim();
    });
  }
  if (line.indexOf('\t') !== -1) {
    return line.split('\t').map(function (s) {
      return String(s || '').trim();
    });
  }
  if (line.indexOf(';') !== -1) {
    return line.split(';').map(function (s) {
      return String(s || '').trim();
    });
  }
  if (line.indexOf(',') !== -1) {
    const commaCount = (line.match(/,/g) || []).length;
    const looksLikeSingleDecimal = /^\s*-?\d+,\d+\s*$/.test(line);
    const looksLikeDateTimeComma = /^\d{1,2}\/\d{1,2}\/\d{4},\d{1,2}:\d{2}:\d{2}$/.test(line);
    if (commaCount >= 2 && !looksLikeSingleDecimal && !looksLikeDateTimeComma) {
      return EstufaBanhoRel_splitCsvPreservingQuotes_(line);
    }
  }
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map(function (s) {
      return String(s || '').trim();
    });
  }
  return line.split(/\s+/).map(function (s) {
    return String(s || '').trim();
  });
}
function EstufaBanhoRel_splitCsvPreservingQuotes_(line) {
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
function EstufaBanhoRel_parseNumeroRobusto_(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
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
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const num = Number(s);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza a matriz de entrada para o formato esperado pelo motor de análise.
 * - usa displayMatrix para tempo/data/hora
 * - usa matrix para temperaturas/pressão
 */
function EstufaBanhoRel_normalizarMatrizParaAnalise(matriz, displayMatrix, nSensores, dateStyle, sensoresAtivos) {
  if (!matriz || !matriz.length) {
    throw new Error('Matriz vazia para normalização.');
  }

  displayMatrix = displayMatrix || matriz;
  nSensores = Number(nSensores || EstufaBanhoRel_EBCFG.DEFAULT_N || 12);

  const headerDisplay = (displayMatrix[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = headerDisplay.map(function(h) { return EstufaBanhoRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = EstufaBanhoRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora', 'data e hora', 'record time', 'recording time', 'recorded at']);
  const idxData = EstufaBanhoRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = EstufaBanhoRel_findAnyIndexParser_(hlow, ['hora', 'horario', 'time']);
  const idxPressao = EstufaBanhoRel_findPressaoIndexParser_(hlow);
  let tempIdx = EstufaBanhoRel_findTempColumnsParser_(headerDisplay, idxTempo, idxData, idxHora, idxPressao);

  // Cabeçalhos explícitos S1/S3/S8 preservam o canal, mesmo sem colunas intermediárias.
  if(nSensores>1&&tempIdx.length){
    const ids=tempIdx.map(function(c){return /^(?:S|ST|T|TP|CH|CHANNEL|CANAL|SENSOR)[\s_-]*(\d+)(?:\s*\([^)]*\)|\s*°?C)?$/i.exec(headerDisplay[c]);});
    if(ids.every(Boolean)){
      const mapa=new Array(nSensores).fill(-1);
      ids.forEach(function(m,i){const ch=Number(m[1])-1;if(ch<0||ch>=nSensores)throw new Error('O canal '+headerDisplay[tempIdx[i]]+' está fora da quantidade de canais informada.');if(mapa[ch]!==-1)throw new Error('Canal repetido no cabeçalho: '+m[1]);mapa[ch]=tempIdx[i];});
      tempIdx=mapa;
    }
  }
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

  let estilo = String(dateStyle || EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  if (estilo === 'AUTO') {
    const idxDataRef = idxData !== -1 ? idxData : (idxTempo !== -1 ? idxTempo : 0);

    estilo = EstufaBanhoRel_detectarPadraoDataNaMatriz_(displayMatrix, startIdx, idxDataRef);
  }

  if(estilo==='AMBIGUO')throw new Error('A data permite dia/mês ou mês/dia. Selecione o formato de data do arquivo e confira a prévia antes de gerar o relatório.');
  if(estilo==='MISTO')throw new Error('O arquivo mistura datas dia/mês e mês/dia. Corrija a origem antes de importar.');
  const outRows = [];
  let linhasDescartadasTempo = 0;
  let linhasDescartadasTemp = 0;
  let ultimaDataValida = null;

  for (let r = startIdx; r < matriz.length; r++) {
    const row = matriz[r] || [];
    const rowDisplay = displayMatrix[r] || row;

    const tempoInfo = EstufaBanhoRel_extrairTempoDaLinhaParser_(row, {
      rowDisplay: rowDisplay,
      idxTempo: idxTempo,
      idxData: idxData,
      idxHora: idxHora,
      dateStyle: estilo,
      ultimaDataValida: ultimaDataValida
    });

    const tempoDate = tempoInfo.tempoDate;
    if (!tempoDate || isNaN(tempoDate.getTime())) {
      if(row.some(function(v){return v!==''&&v!==null&&v!==undefined;}))throw new Error('Data ou hora inválida na linha '+(r+1)+': '+rowDisplay.slice(0,3).join(' | ')+'. Confira o formato de data selecionado. Nenhum horário foi reconstruído.');
      linhasDescartadasTempo++;
      continue;
    }

    ultimaDataValida = new Date(
      tempoDate.getFullYear(),
      tempoDate.getMonth(),
      tempoDate.getDate(),
      0, 0, 0, 0
    );

    const tempoStr = Utilities.formatDate(tempoDate, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss');

    const temps = EstufaBanhoRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, {
      idxTempo: idxTempo,
      idxData: idxData,
      idxHora: idxHora,
      idxPressao: idxPressao,
      colunasConsumidas: tempoInfo.colunasConsumidas
    });

    if(Array.isArray(sensoresAtivos)&&sensoresAtivos.length){sensoresAtivos.forEach(function(ativo,i){if(typeof ativo!=='boolean')throw new Error('Lista de sensores inválida. Use os canais selecionados no formulário.');if(!ativo)return;if(i>=nSensores)throw new Error('Sensor ativo fora da quantidade de canais: S'+(i+1));if(temps[i]===null||temps[i]===undefined||!isFinite(temps[i]))throw new Error('Temperatura inválida ou ausente na linha '+(r+1)+', sensor S'+(i+1)+'. Confira a origem ou desative explicitamente o sensor sem leitura.');});}
    while (temps.length < nSensores) {
      temps.push(null);
    }

    let pressao = null;
    if (idxPressao !== -1) {
      pressao = EstufaBanhoRel_parseNumeroRobusto_(row[idxPressao]);
    } else {
      pressao = EstufaBanhoRel_inferirPressaoSemCabecalhoParser_(row, nSensores, tempoInfo.colunasConsumidas);
    }

    const possuiAlgumaTempValida = temps.some(function(t) {
      return t !== null && isFinite(Number(t));
    });

    if (!possuiAlgumaTempValida) {
      throw new Error('Nenhuma temperatura válida na linha '+(r+1)+'. Confira as colunas de sensores; nenhuma leitura foi descartada.');
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

  // Exportações estritamente decrescentes podem ser invertidas sem alterar registros.
  if(outRows.every(function(row,i){return i===0||row.tempoDate<outRows[i-1].tempoDate;}))outRows.reverse();
  // Não ordenar misturas nem reconstruir horários: a validação aponta o problema na origem.
  EstufaBanhoRel_normalizarTempoStrRows_(outRows);
  EstufaBanhoRel_validarSequenciaTempoNormalizado_(outRows);

  return outRows;
}

// ------------------------------------------------------------
// MESCLAGEM DE ARQUIVOS INDIVIDUAIS POR SENSOR (modo ARQUIVO_POR_SENSOR)
// ------------------------------------------------------------

/**
 * Mescla N séries independentes (uma por sensor, cada uma já normalizada
 * por EstufaBanhoRel_normalizarMatrizParaAnalise com 1 sensor só) numa única linha do
 * tempo, no mesmo formato que o modo de arquivo único produz
 * ({tempoStr, tempoDate, temperaturas:[...]}) — o resto do pipeline
 * (Engine/Planilha/Gráficos) não precisa saber a origem dos dados.
 *
 * seriesPorSensor[s] é a série do sensor s (array de linhas) ou null/[]
 * se aquele sensor não tiver arquivo (ex.: sensor desativado). A série
 * com mais leituras vira a linha do tempo de referência; para os
 * demais sensores, cada ponto da referência busca a leitura mais
 * próxima dentro de uma tolerância — sem correspondência dentro da
 * tolerância, o valor fica null naquele ponto (o motor já ignora
 * valores null sem quebrar, igual a um sensor com falha de leitura).
 */
function EstufaBanhoRel_ebMesclarSeriesPorSensor_(seriesPorSensor, opcoes) {
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
  const intervaloMedioMs = countDelta ? somaDelta / countDelta : 60000;
  const toleranciaMs = Number(opcoes.toleranciaMs) > 0 ? Number(opcoes.toleranciaMs) : Math.round(intervaloMedioMs * 0.5);
  const ponteiros = new Array(nSensores).fill(0);
  const linhasFinais = serieRef.map(function (linhaRef) {
    const alvoMs = linhaRef.tempoDate.getTime();
    const temperaturas = new Array(nSensores).fill(null);
    for (let s = 0; s < nSensores; s++) {
      const serie = seriesPorSensor[s];
      if (!Array.isArray(serie) || !serie.length) continue;
      let p = ponteiros[s];
      while (p < serie.length - 1 && Math.abs(serie[p + 1].tempoDate.getTime() - alvoMs) <= Math.abs(serie[p].tempoDate.getTime() - alvoMs)) {
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
// EXTRAÇÃO ROBUSTA DE TEMPO / TEMPERATURA / PRESSÃO
// ------------------------------------------------------------

function EstufaBanhoRel_extrairTempoDaLinhaParser_(row,ctx) {
  const values=row||[],style=ctx.dateStyle;
  function one(i){return {tempoDate:EstufaBanhoRel_parseDataHoraRobusta_(values[i],style),colunasConsumidas:[i]};}
  function pair(a,b){return {tempoDate:EstufaBanhoRel_parseDataHoraSeparadaRobusta_(values[a],values[b],style),colunasConsumidas:[a,b]};}
  if(ctx.idxData!==-1&&ctx.idxHora!==-1&&ctx.idxData!==ctx.idxHora)return pair(ctx.idxData,ctx.idxHora);
  // Exportação Elitech: Número | Data | Tempo | Temperatura. "Tempo" é a hora separada.
  if(ctx.idxData!==-1&&ctx.idxTempo!==-1&&ctx.idxData!==ctx.idxTempo)return pair(ctx.idxData,ctx.idxTempo);
  if(ctx.idxTempo!==-1)return one(ctx.idxTempo);
  if(ctx.idxData!==-1)return one(ctx.idxData);
  if(ctx.idxHora!==-1)return one(ctx.idxHora);
  // Sem cabeçalho, só combina data/hora quando a segunda coluna contém uma hora real.
  if(typeof values[1]==='string'&&/^\d{1,2}:\d{2}/.test(values[1].trim()))return pair(0,1);
  return one(0);
}


function EstufaBanhoRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, ctx) {
  row = row || [];
  tempIdx = tempIdx || [];
  ctx = ctx || {};

  const temps = [];

  if (tempIdx.length) {
    for (let i = 0; i < Math.min(nSensores, tempIdx.length); i++) {
      temps.push(EstufaBanhoRel_parseNumeroRobusto_(row[tempIdx[i]]));
    }
    return temps;
  }

  const ignorar = {};
  [ctx.idxTempo, ctx.idxData, ctx.idxHora, ctx.idxPressao].forEach(function(v) {
    if (v !== null && v !== undefined && v !== -1) ignorar[v] = true;
  });

  (ctx.colunasConsumidas||[]).forEach(function(i){ignorar[i]=true;});
  const candidatos = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;

    const num = EstufaBanhoRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      candidatos.push({ idx: c, valor: num });
    }
  }

  for (let i = 0; i < candidatos.length && temps.length < nSensores; i++) {
    temps.push(candidatos[i].valor);
  }

  return temps;
}

function EstufaBanhoRel_inferirPressaoSemCabecalhoParser_(row, nSensores, colunasConsumidas) {
  row = row || [];
  colunasConsumidas = colunasConsumidas || [];
  const ignorar = {};
  colunasConsumidas.forEach(function (i) {
    ignorar[i] = true;
  });
  const nums = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;
    const num = EstufaBanhoRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      nums.push({
        idx: c,
        valor: num
      });
    }
  }
  if (nums.length <= nSensores) return null;
  return nums[nSensores] ? nums[nSensores].valor : null;
}

// ------------------------------------------------------------
// DIAGNÓSTICO DE ESTRUTURA
// ------------------------------------------------------------

function EstufaBanhoRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix) {
  const disp = displayMatrix || matrix || [];

  if (!disp.length) {
    return {
      detectedDateStyle: '',
      hasPressao: false,
      qtdTemperaturas: 0
    };
  }

  const header = (disp[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = header.map(function(h) { return EstufaBanhoRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = EstufaBanhoRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora', 'data e hora', 'record time', 'recording time', 'recorded at']);
  const idxData = EstufaBanhoRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = EstufaBanhoRel_findAnyIndexParser_(hlow, ['hora', 'horario', 'time']);
  const idxPressao = EstufaBanhoRel_findPressaoIndexParser_(hlow);
  const tempIdx = EstufaBanhoRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao);

  const idxDetect = idxData !== -1 ? idxData : (idxTempo !== -1 ? idxTempo : 0);

  const detectedDateStyle = EstufaBanhoRel_detectarPadraoDataNaMatriz_(disp, 1, idxDetect);

  return {
    detectedDateStyle: detectedDateStyle,
    hasPressao: idxPressao !== -1,
    canaisDisponiveis: tempIdx.map(function(c,i){const m=/^(?:S|ST|T|TP|CH|CHANNEL|CANAL|SENSOR)[\s_-]*(\d+)(?:\s*\([^)]*\)|\s*°?C)?$/i.exec(header[c]);return m?Number(m[1])-1:i;}),
    nCanais: tempIdx.reduce(function(max,c,i){const m=/^(?:S|ST|T|TP|CH|CHANNEL|CANAL|SENSOR)[\s_-]*(\d+)(?:\s*\([^)]*\)|\s*°?C)?$/i.exec(header[c]);return Math.max(max,m?Number(m[1]):i+1);},0),
    qtdTemperaturas: tempIdx.length
  };
}

// ------------------------------------------------------------
// PADRÃO DE DATA / PARSER DE DATA
// ------------------------------------------------------------

function EstufaBanhoRel_detectarPadraoDataNaMatriz_(matriz,startIdx,idxColunaData) {
  let br=false,us=false,ambigua=false;
  for(let i=startIdx;i<matriz.length;i++) {
    const value=(matriz[i]||[])[idxColunaData||0];
    const m=String(value||'').trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})(?:\s|$)/);
    if(!m)continue;
    const a=+m[1],b=+m[2];
    if(a>12&&b<=12)br=true;
    else if(b>12&&a<=12)us=true;
    else if(a<=12&&b<=12&&a!==b)ambigua=true;
  }
  if(br&&us)return 'MISTO';
  if(br)return 'BR';if(us)return 'US';
  return ambigua?'AMBIGUO':'ISO';
}


function EstufaBanhoRel_parseDataHoraRobusta_(valor,dateStyle,ultimaDataValida) {
  if(valor instanceof Date)return isNaN(valor.getTime())?null:new Date(valor.getTime());
  if(typeof valor==='number')return valor>1000?EstufaBanhoRel_dataSerialFiel_(valor):null;
  const s=String(valor||'').trim();
  if(/^\d{5,6}(?:[.,]\d+)?$/.test(s))return EstufaBanhoRel_dataSerialFiel_(Number(s.replace(',','.')));
  let m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](.+))?$/);
  let y,month,day,time;
  if(m){y=+m[1];month=+m[2];day=+m[3];time=m[4];}
  else {
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})(?:\s+(.+))?$/);
    if(!m)return null;
    y=+m[3]+(m[3].length===2?2000:0);month=+(dateStyle==='US'?m[1]:m[2]);day=+(dateStyle==='US'?m[2]:m[1]);time=m[4];
  }
  // Fuso explícito representa um instante; datas sem fuso mantêm o horário civil do estudo.
  if(time&&/(Z|[+-]\d{2}:?\d{2})$/.test(time)) {
    const match=time.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/);
    if(!match||!EstufaBanhoRel_dataCivil_(y,month,day,+match[1],+match[2],+(match[3]||0)))return null;
    const zone=match[4],z=zone==='Z'?0:(zone[0]==='-'?-1:1)*(Number(zone.slice(1,3))*60+Number(zone.slice(-2)));
    if(zone!=='Z'&&(Number(zone.slice(1,3))>23||Number(zone.slice(-2))>59))return null;
    return new Date(Date.UTC(y,month-1,day,+match[1],+match[2],+(match[3]||0))-z*60000);
  }
  const hora=time?EstufaBanhoRel_parseSomenteHoraRobustaParser_(time):{hh:0,mi:0,ss:0};
  return hora?EstufaBanhoRel_dataCivil_(y,month,day,hora.hh,hora.mi,hora.ss):null;
}


function EstufaBanhoRel_parseDataHoraSeparadaRobusta_(valorData,valorHora,dateStyle,ultimaDataValida) {
  const data=EstufaBanhoRel_parseDataHoraRobusta_(valorData,dateStyle,ultimaDataValida);
  const hora=EstufaBanhoRel_parseSomenteHoraRobustaParser_(valorHora);
  if(!data||!hora)return null;
  const p=EstufaBanhoRel_partesData_(data);
  return EstufaBanhoRel_dataCivil_(p[0],p[1],p[2],hora.hh,hora.mi,hora.ss);
}


function EstufaBanhoRel_parseSomenteHoraRobustaParser_(valor) {
  if(valor instanceof Date){const p=EstufaBanhoRel_partesData_(valor);return {hh:p[3],mi:p[4],ss:p[5]};}
  if(typeof valor==='number'&&valor>=0&&valor<1){const n=Math.round(valor*86400);if(n>=86400)return null;return {hh:Math.floor(n/3600),mi:Math.floor(n%3600/60),ss:n%60};}
  const s=String(valor===0?'000000':valor||'').trim();
  if(/^0[.,]\d+$/.test(s))return EstufaBanhoRel_parseSomenteHoraRobustaParser_(Number(s.replace(',','.')));
  let m=s.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.:]\d+)?)?\s*(AM|PM)?$/i);
  if(!m)m=s.match(/^(\d{2})(\d{2})(\d{2})$/);
  if(!m)return null;
  let h=+m[1];const mi=+m[2],sec=+(m[3]||0);
  if(m[4]){if(h<1||h>12)return null;h=h%12+(m[4].toUpperCase()==='PM'?12:0);}
  return h<=23&&mi<=59&&sec<=59?{hh:h,mi:mi,ss:sec}:null;
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
function EstufaBanhoRel_normalizarTextoComparacaoParser_(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
function EstufaBanhoRel_findAnyIndexParser_(hlow, keys) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    for (let k = 0; k < keys.length; k++) {
      const kk = EstufaBanhoRel_normalizarTextoComparacaoParser_(keys[k]);
      if (h === kk) return i;
    }
  }
  for(let i=0;i<hlow.length;i++){const h=String(hlow[i]||'');for(let k=0;k<keys.length;k++){const kk=EstufaBanhoRel_normalizarTextoComparacaoParser_(keys[k]);if(h.indexOf(kk)===0&&/^[\s([:_/-]/.test(h.slice(kk.length)))return i;}}
  return -1;
}
function EstufaBanhoRel_findPressaoIndexParser_(hlow) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    if (h.indexOf('press') !== -1 || h.indexOf('bar') !== -1 || h.indexOf('mbar') !== -1 || h.indexOf('kpa') !== -1 || h.indexOf('vacuo') !== -1) {
      return i;
    }
  }
  return -1;
}
function EstufaBanhoRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao) {
  const cols = [];
  for (let i = 0; i < header.length; i++) {
    if (i === idxTempo || i === idxData || i === idxHora || i === idxPressao) continue;
    const raw = String(header[i] || '').trim();
    const h = raw.toLowerCase();
    const isTemp = h.indexOf('temper') !== -1 || h.indexOf('temp') !== -1 && h.indexOf('tempo') === -1 || /^s[\s\-_]?\d+$/i.test(raw) || /^st[\s\-_]?\d+$/i.test(raw) || /^t[\s\-_]?\d+$/i.test(raw) || /^tp[\s\-_]?\d+$/i.test(raw) || /^ch[\s\-_]?\d+$/i.test(raw) || /^channel[\s\-_]?\d+$/i.test(raw) || /^canal[\s\-_]?\d+$/i.test(raw) || /^sensor[\s\-_]?\d+$/i.test(raw);
    if (isTemp || /^(?:S|ST|T|TP|CH|CHANNEL|CANAL|SENSOR)[\s_-]*\d+(?:\s*\([^)]*\)|\s*°?C)?$/i.test(raw)) cols.push(i);
  }
  return cols;
}

// ------------------------------------------------------------
// VALIDAÇÃO E RECONSTRUÇÃO TEMPORAL
// ------------------------------------------------------------

function EstufaBanhoRel_normalizarTempoStrRows_(rows) {
  for (let i = 0; i < rows.length; i++) {
    rows[i].tempoStr = Utilities.formatDate(rows[i].tempoDate, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }
}
function EstufaBanhoRel_validarSequenciaTempoNormalizado_(rows) {
  if (!rows || !rows.length) {
    throw new Error('Não há linhas para validar a sequência temporal.');
  }
  const cfg = EstufaBanhoRel_EBCFG.VALIDACAO_TEMPO || {};
  const maxIguais = Number(cfg.maxTimestampsIguaisSequenciais || 3);
  const maxSaltoMin = Number(cfg.maxSaltosMinutos || 120);
  const intervaloEsperadoMin = Number(cfg.intervaloEsperadoMin || 0.1);
  const intervaloEsperadoMax = Number(cfg.intervaloEsperadoMax || 10);
  let prev = null;
  let reversoes = 0;
  let iguaisSequenciais = 1;
  let maiorBlocoIguais = 1;
  let saltosAbsurdos = 0;
  let primeiroSalto = null;
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
        if (!primeiroSalto) primeiroSalto = { linha: i + 1, de: String((rows[i - 1] && rows[i - 1].tempoStr) || prev), ate: String(rows[i].tempoStr || d), min: deltaMin };
      }
      if (deltaMin > 0) {
        deltasMin.push(deltaMin);
      }
    }
    prev = d;
  }
  if (reversoes > 0) {
    throw new Error('A linha do tempo foi normalizada com reversões cronológicas (' + reversoes + '). Isso indica interpretação incorreta da coluna de data/hora.');
  }
  if (maiorBlocoIguais > maxIguais) {
    throw new Error('Foram detectados timestamps repetidos em excesso após a normalização (bloco máximo: ' + maiorBlocoIguais + ').');
  }
  if (saltosAbsurdos > 0) {
    throw new Error('O arquivo tem ' + saltosAbsurdos + ' intervalo(s) sem leituras maior(es) que ' + maxSaltoMin + ' min' + (primeiroSalto ? (' — o primeiro entre ' + primeiroSalto.de + ' e ' + primeiroSalto.ate + ' (linha ' + primeiroSalto.linha + ' dos dados)') : '') + '. Isso costuma acontecer quando o arquivo junta registros de períodos diferentes. Separe o período do ensaio em um arquivo próprio (ou apague as linhas fora do ensaio) e envie de novo; confira também o formato de data na seção de importação.');
  }
  const deltaMedianoMin = EstufaBanhoRel_calcularMedianaNumerica_(deltasMin);
  if (deltaMedianoMin !== null) {
    if (deltaMedianoMin < intervaloEsperadoMin || deltaMedianoMin > intervaloEsperadoMax) {
      throw new Error(SGO_DocSalvar_msgIntervalo_(deltaMedianoMin, intervaloEsperadoMin, intervaloEsperadoMax));
    }
  }
}
function EstufaBanhoRel_calcularMedianaNumerica_(arr) {
  if (!arr || !arr.length) return null;
  const nums = arr.filter(function (v) {
    return typeof v === 'number' && isFinite(v);
  }).slice().sort(function (a, b) {
    return a - b;
  });
  if (!nums.length) return null;
  const meio = Math.floor(nums.length / 2);
  if (nums.length % 2) return nums[meio];
  return (nums[meio - 1] + nums[meio]) / 2;
}

// ------------------------------------------------------------
// HELPERS DE ID/LINK
// ------------------------------------------------------------

function EstufaBanhoRel_extrairDriveIdSeguro_(input) {
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

function EstufaBanhoRel_selecionarAbaEntrada_(sheets,payload){
 payload=payload||{};const gid=payload.sheetGid!==undefined?String(payload.sheetGid):((String(payload.fileId||'').match(/[#&?]gid=(\d+)/)||[])[1]);let chosen;
 if(payload.sheetName)chosen=sheets.filter(function(s){return s.getName()===String(payload.sheetName);})[0];
 else if(gid!==undefined)chosen=sheets.filter(function(s){return s.getSheetId&&String(s.getSheetId())===gid;})[0];
 else if(payload.sheetIndex!==undefined)chosen=sheets[Number(payload.sheetIndex)];
 else if(sheets.length===1)chosen=sheets[0];
 else {const matches=sheets.filter(function(s){return EstufaBanhoRel_tabelaTemCabecalhoDados_(s.getDataRange().getDisplayValues());});if(matches.length===1)chosen=matches[0];else throw new Error(matches.length?'Mais de uma aba contém leituras. Use o link da aba com gid ou informe o nome da aba.':'Nenhuma aba contém cabeçalho de data/hora e temperatura.');}
 if(!chosen)throw new Error('A aba solicitada não existe no arquivo. Confira o link da aba.');return chosen;
}
function EstufaBanhoRel_tabelaTemCabecalhoDados_(matrix){return matrix.slice(0,100).some(function(row){const h=row.map(EstufaBanhoRel_normalizarTextoComparacaoParser_);return h.some(function(v){return /^(data|date|hora|horario|time|tempo|timestamp|datetime|date.?time|data.?hora|data e hora|record time|recording time|recorded at)$/.test(v);})&&EstufaBanhoRel_findTempColumnsParser_(row,-1,-1,-1,-1).length>0;});}
