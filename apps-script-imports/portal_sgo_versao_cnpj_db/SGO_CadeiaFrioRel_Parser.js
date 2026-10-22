/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - CADEIA DE FRIO
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
function CadeiaFrioRel_lerDadosEntradaRich_(payload) {
  payload=payload||{};
  const modoEntrada=String(payload.modoEntrada||'FILE_ID').toUpperCase();
  let matrix,displayMatrix,abas=null;
  if(modoEntrada==='COLAR') {
    matrix=CadeiaFrioRel_extrairDeTextoColadoRobustamente(payload.textoColado,payload.delimManual);
    displayMatrix=matrix;
  } else if(modoEntrada==='FILE_ID') {
    const id=CadeiaFrioRel_extrairDriveIdSeguro_(String(payload.fileId||''));
    if(!id)throw new Error('Informe o link ou ID do arquivo do datalogger.');
    const file=DriveApp.getFileById(id),mime=file.getMimeType(),name=file.getName();
    // Alguns dataloggers gravam OOXML (ZIP) com nome .xls. O conteúdo prevalece.
    const blob=mime===MimeType.GOOGLE_SHEETS?null:file.getBlob();
    const bytes=blob?blob.getBytes():[];
    const zip=bytes.length>=4&&(bytes[0]&255)===80&&(bytes[1]&255)===75&&(bytes[2]&255)===3&&(bytes[3]&255)===4;
    if(zip||(/\.xlsx$/i.test(name)&&mime!==MimeType.GOOGLE_SHEETS)||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // 21/10/2026: no arquivo único, cada estudo pode vir na sua aba (24 h, porta, energia); antes só a primeira aba era lida, em silêncio.
      try {matrix=CadeiaFrioRel_lerXlsxOriginal_(blob,{variasAbas:!!payload.permitirVariasAbas});}catch(e){throw new Error('Arquivo '+name+': '+(e.message||e));}
      if(matrix&&matrix.abas){abas=matrix.abas.map(function(a){return {nome:a.nome,matrix:a.matrix,displayMatrix:a.matrix};});matrix=abas[0].matrix;}
      displayMatrix=matrix;
    } else if(/\.(csv|txt|tsv)$/i.test(name)||/^(text\/csv|text\/plain|text\/tab-separated-values)$/.test(mime)) {
      matrix=CadeiaFrioRel_extrairDeTextoColadoRobustamente(CadeiaFrioRel_textoOriginal_(blob),payload.delimManual);displayMatrix=matrix;
    } else {
      let ssId=id,temp=false;
      if(mime!==MimeType.GOOGLE_SHEETS) {
        if(mime!=='application/vnd.ms-excel'&&!/\.xls$/i.test(name))throw new Error('Use XLSX, XLS, CSV, TXT ou Google Sheets.');
        try {
          const converted=Drive.Files.create({name:name+' (TEMP_CADEIA_FRIA)',mimeType:MimeType.GOOGLE_SHEETS},blob.copyBlob().setContentType('application/vnd.ms-excel'),{fields:'id'});
          ssId=converted.id;temp=true;
        }catch(e){throw new Error('Não foi possível ler o arquivo '+name+' como Excel antigo (.xls). Abra-o no Excel e salve como .xlsx, sem apenas renomear. Detalhe: '+(e.message||e));}
      }
      try {
        const ss=SpreadsheetApp.openById(ssId),tz=ss.getSpreadsheetTimeZone();
        // Datas nativas prevalecem sobre a formatação visual (que pode ocultar segundos).
        const lerFolha=function(sheet){
          const range=sheet.getDataRange(),disp=range.getDisplayValues();
          const mat=range.getValues().map(function(row,r){return row.map(function(value,c){
            if(value instanceof Date&&!isNaN(value.getTime())) {
              const year=Number(CadeiaFrioRel_formatarDataRapida_(value,tz,'yyyy'));
              const text=CadeiaFrioRel_formatarDataRapida_(value,tz,year<1901?'HH:mm:ss':'yyyy-MM-dd HH:mm:ss');
              disp[r][c]=text;return text;
            }
            return value;
          });});
          return {nome:sheet.getName(),matrix:mat,displayMatrix:disp};
        };
        const folhas=ss.getSheets();
        let lidas=[lerFolha(folhas[0])];
        // 21/10/2026: no arquivo único, as abas com leituras (cada estudo na sua aba) entram todas; antes só a primeira.
        if(payload.permitirVariasAbas&&folhas.length>1){
          const comLeituras=folhas.map(lerFolha).filter(function(f){return f.matrix.length>2&&CadeiaFrioRel_abaTemLeituras_(f.displayMatrix);});
          if(comLeituras.length>1)abas=comLeituras;else if(comLeituras.length===1)lidas=comLeituras;
        }
        matrix=(abas||lidas)[0].matrix;displayMatrix=(abas||lidas)[0].displayMatrix;
      } finally {if(temp)try{DriveApp.getFileById(ssId).setTrashed(true);}catch(e){}}
    }
  } else throw new Error('Modo de leitura inválido.');
  if(!matrix||matrix.length<2)throw new Error('Arquivo vazio ou sem registros suficientes.');
  if(matrix.length>CadeiaFrioRel_CFCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
  if(abas)abas=abas.map(function(a){const t=CadeiaFrioRel_prepararTabelaDatas_(a.matrix,a.displayMatrix||a.matrix);return {nome:a.nome,matrix:t.matrix,displayMatrix:t.displayMatrix};});
  const table=CadeiaFrioRel_prepararTabelaDatas_(matrix,displayMatrix||matrix);
  matrix=table.matrix;displayMatrix=table.displayMatrix;
  const diagnostico=CadeiaFrioRel_diagnosticarEstruturaEntrada_(matrix,displayMatrix);
  diagnostico.modoEntrada=modoEntrada;
  diagnostico.dateStyleDetectado=diagnostico.detectedDateStyle;
  diagnostico.sensoresDetectados=diagnostico.qtdTemperaturas||0;
  return {matrix:matrix,displayMatrix:displayMatrix,diagnostico:diagnostico,abas:abas};
}


function CadeiaFrioRel_extrairDeTextoColadoRobustamente(txt, delimManual) {
  txt = String(txt || '').replace(/\r/g, '').trim();
  if (!txt) return null;

  const delimiters={TAB:'\t',SEMICOLON:';',COMMA:','};
  let separator=delimiters[String(delimManual||'AUTO').toUpperCase()];
  if(!separator&&String(delimManual||'AUTO').toUpperCase()==='AUTO') {
    const sample=txt.split('\n').slice(0,100).join('\n').replace(/"(?:[^"]|"")*"/g,'');
    separator=sample.indexOf('\t')!==-1?'\t':sample.indexOf(';')!==-1?';':sample.indexOf(',')!==-1?',':null;
  }
  if(separator){
    const parsed=Utilities.parseCsv(txt,separator).filter(function(row){return row.some(function(v){return String(v).trim()!=='';});});
    if(parsed.length>CadeiaFrioRel_CFCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
    return parsed;
  }

  const lines = txt
    .split('\n')
    .map(function(l) { return String(l || '').trim(); })
    .filter(function(l) { return l !== ''; });

  if (lines.length < 2) return null;

  if(lines.length>CadeiaFrioRel_CFCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas. Divida o estudo sem remover registros.');
  const matrix = [];
  for (let i = 0; i < Math.min(lines.length, CadeiaFrioRel_CFCFG.MAX_PARSE_ROWS); i++) {
    const parts = CadeiaFrioRel_smartSplitLine_(lines[i], delimManual);
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

function CadeiaFrioRel_smartSplitLine_(line, delimManual) {
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
    return CadeiaFrioRel_splitCsvPreservingQuotes_(line);
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
      return CadeiaFrioRel_splitCsvPreservingQuotes_(line);
    }
  }

  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map(function(s) { return String(s || '').trim(); });
  }

  return line.split(/\s+/).map(function(s) { return String(s || '').trim(); });
}

function CadeiaFrioRel_splitCsvPreservingQuotes_(line) {
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

function CadeiaFrioRel_parseNumeroRobusto_(valor) {
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
 * - usa displayMatrix para tempo/data/hora
 * - usa matrix para temperaturas/pressão
 */
function CadeiaFrioRel_normalizarMatrizParaAnalise(matriz, displayMatrix, nSensores, dateStyle) {
  if (!matriz || !matriz.length) {
    throw new Error('Matriz vazia para normalização.');
  }

  displayMatrix = displayMatrix || matriz;
  nSensores = Number(nSensores || CadeiaFrioRel_CFCFG.DEFAULT_N || 12);

  const headerDisplay = (displayMatrix[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = headerDisplay.map(function(h) { return CadeiaFrioRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = CadeiaFrioRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = CadeiaFrioRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = CadeiaFrioRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = CadeiaFrioRel_findPressaoIndexParser_(hlow);
  const tempIdx = CadeiaFrioRel_findTempColumnsParser_(headerDisplay, idxTempo, idxData, idxHora, idxPressao);

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

  let estilo = String(dateStyle || CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  if (estilo === 'AUTO') {
    const idxDataRef = idxData !== -1 ? idxData : (idxTempo !== -1 ? idxTempo : 0);

    estilo = CadeiaFrioRel_detectarPadraoDataNaMatriz_(displayMatrix, startIdx, idxDataRef);
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

    const tempoInfo = CadeiaFrioRel_extrairTempoDaLinhaParser_(row, {
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

    const tempoStr = CadeiaFrioRel_formatarDataRapida_(tempoDate, CadeiaFrioRel_CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss');

    const temps = CadeiaFrioRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, {
      idxTempo: idxTempo,
      idxData: idxData,
      idxHora: idxHora,
      idxPressao: idxPressao,
      colunasConsumidas: tempoInfo.colunasConsumidas
    });

    while (temps.length < nSensores) {
      temps.push(null);
    }

    let pressao = null;
    if (idxPressao !== -1) {
      pressao = CadeiaFrioRel_parseNumeroRobusto_(row[idxPressao]);
    } else {
      pressao = CadeiaFrioRel_inferirPressaoSemCabecalhoParser_(row, nSensores, tempoInfo.colunasConsumidas);
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

  // Exportações estritamente decrescentes podem ser invertidas sem alterar registros.
  if(outRows.every(function(row,i){return i===0||row.tempoDate<outRows[i-1].tempoDate;}))outRows.reverse();
  // Não ordenar misturas nem reconstruir horários: a validação aponta o problema na origem.
  // tempoStr já foi formatado durante a leitura.
  CadeiaFrioRel_validarSequenciaTempoNormalizado_(outRows);

  return outRows;
}

// ------------------------------------------------------------
// MESCLAGEM DE ARQUIVOS INDIVIDUAIS POR SENSOR (modo ARQUIVO_POR_SENSOR)
// ------------------------------------------------------------

/**
 * Mescla N séries independentes (uma por sensor, cada uma já normalizada
 * por CadeiaFrioRel_normalizarMatrizParaAnalise com 1 sensor só) numa única linha do
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
function CadeiaFrioRel_cfMesclarSeriesPorSensor_(seriesPorSensor, opcoes) {
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
  // 21/10/2026: resumo do alinhamento por sensor (anexo do relatório e da planilha de dados).
  const resumo = seriesPorSensor.map(function(se) {
    return Array.isArray(se) && se.length ? { leituras: se.length, semCorrespondencia: 0, maiorDefasagemSeg: 0, inicio: se[0].tempoStr, fim: se[se.length - 1].tempoStr } : null;
  });

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
        if (diffMs / 1000 > resumo[s].maiorDefasagemSeg) resumo[s].maiorDefasagemSeg = diffMs / 1000;
      } else {
        resumo[s].semCorrespondencia++;
      }
    }

    return {
      tempoStr: linhaRef.tempoStr,
      tempoDate: linhaRef.tempoDate,
      temperaturas: temperaturas
    };
  });

  // Propriedade só de leitura interna (não vai para JSON): quem precisa do resumo lê daqui.
  Object.defineProperty(linhasFinais, '_mesclagem', { value: { referencia: 'registrador do sensor S' + (refIdx + 1), toleranciaSeg: Math.round(toleranciaMs / 100) / 10,
    sensores: resumo.map(function(r, s) { return r ? Object.assign({ sensor: 'S' + (s + 1) }, r) : null; }).filter(Boolean) }, enumerable: false });
  return linhasFinais;
}

// ------------------------------------------------------------
// EXTRAÇÃO ROBUSTA DE TEMPO / TEMPERATURA / PRESSÃO
// ------------------------------------------------------------

function CadeiaFrioRel_extrairTempoDaLinhaParser_(row,ctx) {
  const values=row||[],style=ctx.dateStyle;
  function one(i){return {tempoDate:CadeiaFrioRel_parseDataHoraRobusta_(values[i],style),colunasConsumidas:[i]};}
  function pair(a,b){return {tempoDate:CadeiaFrioRel_parseDataHoraSeparadaRobusta_(values[a],values[b],style),colunasConsumidas:[a,b]};}
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


function CadeiaFrioRel_extrairTemperaturasDaLinhaParser_(row, tempIdx, nSensores, ctx) {
  row = row || [];
  tempIdx = tempIdx || [];
  ctx = ctx || {};

  const temps = [];

  if (tempIdx.length) {
    for (let i = 0; i < Math.min(nSensores, tempIdx.length); i++) {
      temps.push(CadeiaFrioRel_parseNumeroRobusto_(row[tempIdx[i]]));
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

    const num = CadeiaFrioRel_parseNumeroRobusto_(row[c]);
    if (num !== null && isFinite(num)) {
      candidatos.push({ idx: c, valor: num });
    }
  }

  for (let i = 0; i < candidatos.length && temps.length < nSensores; i++) {
    temps.push(candidatos[i].valor);
  }

  return temps;
}

function CadeiaFrioRel_inferirPressaoSemCabecalhoParser_(row, nSensores, colunasConsumidas) {
  row = row || [];
  colunasConsumidas = colunasConsumidas || [];

  const ignorar = {};
  colunasConsumidas.forEach(function(i) { ignorar[i] = true; });

  const nums = [];
  for (let c = 0; c < row.length; c++) {
    if (ignorar[c]) continue;

    const num = CadeiaFrioRel_parseNumeroRobusto_(row[c]);
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

function CadeiaFrioRel_diagnosticarEstruturaEntrada_(matrix, displayMatrix) {
  const disp = displayMatrix || matrix || [];

  if (!disp.length) {
    return {
      detectedDateStyle: '',
      hasPressao: false,
      qtdTemperaturas: 0
    };
  }

  const header = (disp[0] || []).map(function(v) { return String(v || '').trim(); });
  const hlow = header.map(function(h) { return CadeiaFrioRel_normalizarTextoComparacaoParser_(h); });

  const idxTempo = CadeiaFrioRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']);
  const idxData = CadeiaFrioRel_findAnyIndexParser_(hlow, ['data', 'date']);
  const idxHora = CadeiaFrioRel_findAnyIndexParser_(hlow, ['hora', 'time']);
  const idxPressao = CadeiaFrioRel_findPressaoIndexParser_(hlow);
  const tempIdx = CadeiaFrioRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao);

  const idxDetect = idxData !== -1 ? idxData : (idxTempo !== -1 ? idxTempo : 0);

  const detectedDateStyle = CadeiaFrioRel_detectarPadraoDataNaMatriz_(disp, 1, idxDetect);

  return {
    detectedDateStyle: detectedDateStyle,
    hasPressao: idxPressao !== -1,
    qtdTemperaturas: tempIdx.length
  };
}

// ------------------------------------------------------------
// PADRÃO DE DATA / PARSER DE DATA
// ------------------------------------------------------------

function CadeiaFrioRel_detectarPadraoDataNaMatriz_(matriz,startIdx,idxColunaData) {
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


function CadeiaFrioRel_parseDataHoraRobusta_(valor,dateStyle,ultimaDataValida) {
  if(valor instanceof Date)return isNaN(valor.getTime())?null:new Date(valor.getTime());
  if(typeof valor==='number')return valor>1000?CadeiaFrioRel_dataSerialFiel_(valor):null;
  const s=String(valor||'').trim();
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
    if(!match||!CadeiaFrioRel_dataCivil_(y,month,day,+match[1],+match[2],+(match[3]||0)))return null;
    const zone=match[4],z=zone==='Z'?0:(zone[0]==='-'?-1:1)*(Number(zone.slice(1,3))*60+Number(zone.slice(-2)));
    if(zone!=='Z'&&(Number(zone.slice(1,3))>23||Number(zone.slice(-2))>59))return null;
    return new Date(Date.UTC(y,month-1,day,+match[1],+match[2],+(match[3]||0))-z*60000);
  }
  const hora=time?CadeiaFrioRel_parseSomenteHoraRobustaParser_(time):{hh:0,mi:0,ss:0};
  return hora?CadeiaFrioRel_dataCivil_(y,month,day,hora.hh,hora.mi,hora.ss):null;
}


function CadeiaFrioRel_parseDataHoraSeparadaRobusta_(valorData,valorHora,dateStyle,ultimaDataValida) {
  const data=CadeiaFrioRel_parseDataHoraRobusta_(valorData,dateStyle,ultimaDataValida);
  const hora=CadeiaFrioRel_parseSomenteHoraRobustaParser_(valorHora);
  if(!data||!hora)return null;
  const p=CadeiaFrioRel_partesData_(data);
  return CadeiaFrioRel_dataCivil_(p[0],p[1],p[2],hora.hh,hora.mi,hora.ss);
}


function CadeiaFrioRel_parseSomenteHoraRobustaParser_(valor) {
  if(valor instanceof Date){const p=CadeiaFrioRel_partesData_(valor);return {hh:p[3],mi:p[4],ss:p[5]};}
  if(typeof valor==='number'&&valor>=0&&valor<1){const n=Math.round(valor*86400);if(n>=86400)return null;return {hh:Math.floor(n/3600),mi:Math.floor(n%3600/60),ss:n%60};}
  const s=String(valor===0?'000000':valor||'').trim();
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
function CadeiaFrioRel_normalizarTextoComparacaoParser_(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function CadeiaFrioRel_findAnyIndexParser_(hlow, keys) {
  for (let i = 0; i < hlow.length; i++) {
    const h = String(hlow[i] || '');
    for (let k = 0; k < keys.length; k++) {
      const kk = CadeiaFrioRel_normalizarTextoComparacaoParser_(keys[k]);
      if (h === kk || h.indexOf(kk) !== -1) return i;
    }
  }
  return -1;
}

function CadeiaFrioRel_findPressaoIndexParser_(hlow) {
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

function CadeiaFrioRel_findTempColumnsParser_(header, idxTempo, idxData, idxHora, idxPressao) {
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

function CadeiaFrioRel_validarSequenciaTempoNormalizado_(rows) {
  if (!rows || !rows.length) {
    throw new Error('Não há linhas para validar a sequência temporal.');
  }

  const cfg = CadeiaFrioRel_CFCFG.VALIDACAO_TEMPO || {};
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
      'O arquivo tem ' + saltosAbsurdos + ' intervalo(s) sem leituras maior(es) que ' + maxSaltoMin + ' min' + (primeiroSalto ? (' — o primeiro entre ' + primeiroSalto.de + ' e ' + primeiroSalto.ate + ' (linha ' + primeiroSalto.linha + ' dos dados)') : '') + '. Isso costuma acontecer quando o arquivo junta registros de períodos diferentes. Separe o período do ensaio em um arquivo próprio (ou apague as linhas fora do ensaio) e envie de novo; confira também o formato de data na seção de importação.'
    );
  }

  const deltaMedianoMin = CadeiaFrioRel_calcularMedianaNumerica_(deltasMin);
  if (deltaMedianoMin !== null) {
    if (deltaMedianoMin < intervaloEsperadoMin || deltaMedianoMin > intervaloEsperadoMax) {
      throw new Error(
        SGO_DocSalvar_msgIntervalo_(deltaMedianoMin, intervaloEsperadoMin, intervaloEsperadoMax)
      );
    }
  }
}

function CadeiaFrioRel_calcularMedianaNumerica_(arr) {
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

function CadeiaFrioRel_extrairDriveIdSeguro_(input) {
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
