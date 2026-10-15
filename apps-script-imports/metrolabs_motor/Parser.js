/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: Parser.gs
 * VERSÃO REORGANIZADA — PENTE FINO ESTRUTURAL
 * OBJETIVO:
 * - localizar cabeçalho com mais robustez
 * - tratar CSV/TXT/Sheets com matriz simples ou expandida
 * - normalizar data, hora, pressão e ponto de orvalho
 * - preparar saída consistente para análise automática/manual
 * - manter compatibilidade com Main.gs e AnaliseCiclo.gs
 ****************************************************/

// ============================================================
// ENTRADA PRINCIPAL
// ============================================================

function normalizarMatrizCentralAr(matrix, displayMatrix, dateStyle) {
  const contexto = prepararContextoNormalizacaoCentralAr_(matrix, displayMatrix, dateStyle);
  const linhas = extrairLinhasNormalizadasCentralAr_(contexto);

  if (!linhas.length) {
    return [];
  }

  validarSequenciaTemporalCentralAr_(linhas);
  return linhas;
}

function prepararContextoNormalizacaoCentralAr_(matrix, displayMatrix, dateStyle) {
  const matrizOriginal = Array.isArray(matrix) ? matrix : [];
  const matrizDisplayOriginal = Array.isArray(displayMatrix) && displayMatrix.length ? displayMatrix : matrizOriginal;
  const estiloData = obterDateStyleNormalizadoCentralAr_(dateStyle);

  if (!matrizOriginal.length) {
    return { matrix: [], displayMatrix: [], headerInfo:{}, colunas:{} };
  }

  const matrizPreparada = prepararMatrizParserCentralAr_(matrizOriginal, matrizDisplayOriginal);
  const headerInfo = localizarCabecalhoCentralArParser_(matrizPreparada.displayMatrix);
  const mapa = headerInfo.map || {};
  
  // CORREÇÃO: Proteção da variável global UCFG para evitar "undefined"
  const cfg = typeof UCFG !== 'undefined' && UCFG.CSV ? UCFG.CSV : {};

  return {
    matrix: matrizPreparada.matrix,
    displayMatrix: matrizPreparada.displayMatrix,
    dateStyle: estiloData,
    tz: obterTimezoneCentralAr_(),
    headerInfo: headerInfo,
    colunas: {
      // CORREÇÃO: Passado o índice padrão esperado (0,1,2,3) caso o mapa falhe em encontrar a chave
      data: obterIndiceObrigatorioCentralAr_(mapa, cfg.COL_DATA || 'DATA', 0),
      hora: obterIndiceObrigatorioCentralAr_(mapa, cfg.COL_HORA || 'HORA', 1),
      orvalho: obterIndiceObrigatorioCentralAr_(mapa, cfg.COL_ORVALHO || 'PONTO_DE_ORVALHO_C', 2),
      pressao: obterIndiceObrigatorioCentralAr_(mapa, cfg.COL_PRESSAO || 'PRESSAO_DA_REDE_BAR', 3)
    }
  };
}

function extrairLinhasNormalizadasCentralAr_(contexto) {
  const matrix = contexto.matrix;
  const displayMatrix = contexto.displayMatrix;
  const inicioDados = Number(contexto.headerInfo.headerRowIndex || 0) + 1;
  const saida = [];

  for (let i = inicioDados; i < matrix.length; i++) {
    const linha = normalizarLinhaCentralAr_(matrix[i], displayMatrix[i], i, contexto);
    if (linha) {
      saida.push(linha);
    }
  }

  return saida;
}

function normalizarLinhaCentralAr_(rawRow, dispRow, idxOriginal, contexto) {
  const linhaRaw = Array.isArray(rawRow) ? rawRow : [rawRow];
  const linhaDisp = Array.isArray(dispRow) ? dispRow : linhaRaw;
  const cols = contexto.colunas;

  const dataRaw = valorCelulaParser_(linhaRaw[cols.data], linhaDisp[cols.data]);
  const horaRaw = valorCelulaParser_(linhaRaw[cols.hora], linhaDisp[cols.hora]);
  const orvalhoRaw = valorCelulaParser_(linhaRaw[cols.orvalho], linhaDisp[cols.orvalho]);
  const pressaoRaw = valorCelulaParser_(linhaRaw[cols.pressao], linhaDisp[cols.pressao]);

  if (linhaVaziaCentralAr_(dataRaw, horaRaw, orvalhoRaw, pressaoRaw)) {
    return null;
  }

  const tempoDate = parseDataHoraCentralAr_(dataRaw, horaRaw, contexto.dateStyle);
  const pressao = parseNumeroCentralAr_(pressaoRaw);
  const orvalho = parseNumeroCentralAr_(orvalhoRaw);

  if (!tempoDate) return null;
  if (pressao === null && orvalho === null) return null;

  return montarLinhaNormalizadaCentralAr_(idxOriginal, tempoDate, pressao, orvalho, contexto.tz);
}

function montarLinhaNormalizadaCentralAr_(idxOriginal, tempoDate, pressao, orvalho, tz) {
  return {
    idxOriginal: idxOriginal,
    tempoDate: tempoDate,
    tempoStr: Utilities.formatDate(tempoDate, tz, 'dd/MM/yyyy HH:mm:ss'),
    data: Utilities.formatDate(tempoDate, tz, 'dd/MM/yyyy'),
    hora: Utilities.formatDate(tempoDate, tz, 'HH:mm:ss'),
    pressao: pressao,
    orvalho: orvalho
  };
}

// ============================================================
// PREPARAÇÃO DA MATRIZ
// ============================================================

function prepararMatrizParserCentralAr_(matrix, displayMatrix) {
  const safeMatrix = Array.isArray(matrix) ? matrix : [];
  const safeDisplay = Array.isArray(displayMatrix) && displayMatrix.length ? displayMatrix : safeMatrix;

  const maxColsMatrix = obterMaxColsParserCentralAr_(safeMatrix);
  const maxColsDisplay = obterMaxColsParserCentralAr_(safeDisplay);

  if (maxColsMatrix > 1 || maxColsDisplay > 1) {
    return {
      matrix: safeMatrix,
      displayMatrix: safeDisplay
    };
  }

  return expandirMatrizUnicaCentralAr_(safeMatrix, safeDisplay);
}

function expandirMatrizUnicaCentralAr_(matrix, displayMatrix) {
  const linhasTexto = (displayMatrix && displayMatrix.length ? displayMatrix : matrix).map(function(row) {
    return extrairTextoCelulaUnicaCentralAr_(row);
  });

  const separador = detectarSeparadorMatrizUnicaCentralAr_(linhasTexto);
  if (!separador) {
    return {
      matrix: matrix,
      displayMatrix: displayMatrix
    };
  }

  return {
    matrix: matrix.map(function(row) {
      return splitLinhaCsvParserCentralAr_(extrairTextoCelulaUnicaCentralAr_(row), separador);
    }),
    displayMatrix: displayMatrix.map(function(row) {
      return splitLinhaCsvParserCentralAr_(extrairTextoCelulaUnicaCentralAr_(row), separador);
    })
  };
}

function extrairTextoCelulaUnicaCentralAr_(row) {
  if (Array.isArray(row)) return String(row[0] == null ? '' : row[0]);
  return String(row == null ? '' : row);
}

function obterMaxColsParserCentralAr_(matriz) {
  if (!Array.isArray(matriz) || !matriz.length) return 0;

  let maxCols = 0;
  for (let i = 0; i < matriz.length; i++) {
    const row = Array.isArray(matriz[i]) ? matriz[i] : [matriz[i]];
    if (row.length > maxCols) maxCols = row.length;
  }
  return maxCols;
}

function detectarSeparadorMatrizUnicaCentralAr_(linhasTexto) {
  if (!linhasTexto || !linhasTexto.length) return null;

  const amostra = linhasTexto.slice(0, Math.min(5, linhasTexto.length)).join('\n');
  const candidatos = [';', ',', '\t', '|'];
  let melhor = null;
  let scoreMelhor = 0;

  candidatos.forEach(function(sep) {
    const score = amostra.split(sep).length;
    if (score > scoreMelhor) {
      scoreMelhor = score;
      melhor = sep;
    }
  });

  return scoreMelhor <= 1 ? null : melhor;
}

function splitLinhaCsvParserCentralAr_(linha, separador) {
  const out = [];
  let atual = '';
  let emAspas = false;
  const texto = String(linha == null ? '' : linha);

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    const prox = texto[i + 1];

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

  return out.map(function(cel) {
    return String(cel == null ? '' : cel).trim();
  });
}

// ============================================================
// LOCALIZAÇÃO DE CABEÇALHO
// ============================================================

function localizarCabecalhoCentralArParser_(matriz) {
  const aliases = montarAliasesCabecalhoCentralAr_();
  const limiteBusca = Math.min(20, Array.isArray(matriz) ? matriz.length : 0);
  let melhor = { headerRowIndex: 0, map: {}, score: -1, maxCols: 0 };

  for (let i = 0; i < limiteBusca; i++) {
    const candidato = avaliarLinhaComoCabecalhoCentralAr_(matriz[i], aliases, i);
    if (candidato.score > melhor.score) {
      melhor = candidato;
    }
  }

  return melhor;
}

function avaliarLinhaComoCabecalhoCentralAr_(row, aliases, rowIndex) {
  const linha = Array.isArray(row) ? row : [row];
  const map = {};
  let score = 0;

  for (let c = 0; c < linha.length; c++) {
    const token = normalizarCabecalhoCentralArParser_(linha[c]);
    Object.keys(aliases).forEach(function(chaveCanonica) {
      if (aliases[chaveCanonica].indexOf(token) >= 0 && typeof map[chaveCanonica] !== 'number') {
        map[chaveCanonica] = c;
        score++;
      }
    });
  }

  return {
    headerRowIndex: rowIndex,
    map: map,
    score: score,
    maxCols: linha.length
  };
}

function montarAliasesCabecalhoCentralAr_() {
  const cfg = typeof UCFG !== 'undefined' && UCFG.CSV ? UCFG.CSV : {};
  const base = cfg.ACEITAR_VARIACOES || {};
  
  // CORREÇÃO: Fallbacks literais caso a UCFG não venha devidamente preenchida na chamada da função
  const colData = cfg.COL_DATA || 'DATA';
  const colHora = cfg.COL_HORA || 'HORA';
  const colOrvalho = cfg.COL_ORVALHO || 'PONTO_DE_ORVALHO_C';
  const colPressao = cfg.COL_PRESSAO || 'PRESSAO_DA_REDE_BAR';
  
  return {
    [colData]: normalizarListaCabecalho_([colData].concat(base.DATA || [])),
    [colHora]: normalizarListaCabecalho_([colHora].concat(base.HORA || [])),
    [colOrvalho]: normalizarListaCabecalho_([colOrvalho].concat(base.PONTO_DE_ORVALHO_C || [])),
    [colPressao]: normalizarListaCabecalho_([colPressao].concat(base.PRESSAO_DA_REDE_BAR || []))
  };
}

function normalizarListaCabecalho_(lista) {
  const seen = {};
  return (lista || []).map(normalizarCabecalhoCentralArParser_).filter(function(v) {
    if (!v || seen[v]) return false;
    seen[v] = true;
    return true;
  });
}

function obterIndiceObrigatorioCentralAr_(mapa, chave, indiceFallback) {
  // CORREÇÃO: Caso o header map falhe e não encontre o título, ele usará a coluna padrão do cliente para não quebrar a leitura inteira
  if (typeof mapa[chave] === 'number') return mapa[chave];
  return indiceFallback;
}

function normalizarCabecalhoCentralArParser_(v) {
  return String(v == null ? '' : v)
    .replace(/\uFEFF/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .trim();
}

// ============================================================
// DATA / HORA
// ============================================================

function parseDataHoraCentralAr_(dataValor, horaValor, dateStyle) {
  const data = parseDataCentralAr_(dataValor, dateStyle);
  const hora = parseHoraCentralAr_(horaValor);

  if (!data) return null;

  return new Date(
    data.ano,
    data.mes - 1,
    data.dia,
    hora.hora,
    hora.minuto,
    hora.segundo
  );
}

function parseDataCentralAr_(valor, dateStyle) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return {
      dia: valor.getDate(),
      mes: valor.getMonth() + 1,
      ano: valor.getFullYear()
    };
  }

  const s = limparTextoParser_(valor);
  if (!s) return null;

  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) {
    return {
      ano: Number(m[1]),
      mes: Number(m[2]),
      dia: Number(m[3])
    };
  }

  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const ano = Number(m[3]);

    if (String(dateStyle || '').toUpperCase() === 'US') {
      return { dia: b, mes: a, ano: ano };
    }

    return { dia: a, mes: b, ano: ano };
  }

  return null;
}

function parseHoraCentralAr_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return {
      hora: valor.getHours(),
      minuto: valor.getMinutes(),
      segundo: valor.getSeconds()
    };
  }

  const s = limparTextoParser_(valor);
  if (!s) {
    return { hora: 0, minuto: 0, segundo: 0 };
  }

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    return {
      hora: Number(m[1]),
      minuto: Number(m[2]),
      segundo: Number(m[3] || 0)
    };
  }

  return { hora: 0, minuto: 0, segundo: 0 };
}

// ============================================================
// NÚMEROS
// ============================================================

function parseNumeroCentralAr_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;

  let s = String(valor).trim();
  if (!s) return null;

  s = s.replace(/\s+/g, '');

  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d+,\d+$/.test(s)) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return isFinite(n) ? n : null;
}

// ============================================================
// VALIDAÇÃO TEMPORAL
// ============================================================

function validarSequenciaTemporalCentralAr_(saida) {
  if (!saida || saida.length < 2) return true;

  let ultima = saida[0].tempoDate ? saida[0].tempoDate.getTime() : null;

  for (let i = 1; i < saida.length; i++) {
    const atual = saida[i].tempoDate ? saida[i].tempoDate.getTime() : null;
    if (ultima !== null && atual !== null && atual < ultima) {
      return true;
    }
    ultima = atual;
  }

  return true;
}

// ============================================================
// HELPERS GERAIS
// ============================================================

function obterDateStyleNormalizadoCentralAr_(dateStyle) {
  const sis = typeof UCFG !== 'undefined' && UCFG.SISTEMA ? UCFG.SISTEMA : {};
  return String(dateStyle || sis.DEFAULT_DATE_STYLE || 'BR')
    .toUpperCase()
    .trim();
}

function obterTimezoneCentralAr_() {
  const app = typeof UCFG !== 'undefined' && UCFG.APP ? UCFG.APP : {};
  return app.TZ ? app.TZ : Session.getScriptTimeZone();
}

function linhaVaziaCentralAr_(dataRaw, horaRaw, orvalhoRaw, pressaoRaw) {
  return vazioParser_(dataRaw) && vazioParser_(horaRaw) && vazioParser_(orvalhoRaw) && vazioParser_(pressaoRaw);
}

function valorCelulaParser_(raw, disp) {
  if (!vazioParser_(disp)) return disp;
  return raw;
}

function vazioParser_(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

function limparTextoParser_(v) {
  return String(v == null ? '' : v).replace(/\uFEFF/g, '').trim();
}