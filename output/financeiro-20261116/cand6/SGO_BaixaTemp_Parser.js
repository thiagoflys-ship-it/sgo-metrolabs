/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — LEITURA DOS ARQUIVOS DO REGISTRADOR
 *
 * Lê planilhas (XLSX/XLS/Planilha), CSV e texto exportados por registradores
 * de dados (dataloggers): arquivo completo (todos os sensores numa planilha)
 * ou um arquivo por sensor (unidos pelo horário). O mapa de colunas é
 * proposto pelo cabeçalho e pode ser corrigido na tela (parser configurável).
 *
 * Tempo: guardado como "horário local sem fuso" em milissegundos
 * (Date.UTC dos campos lidos), igual em qualquer servidor. Para mostrar,
 * BaixaTempParser_fmtHora_ usa os campos UTC desse número.
 * Pressão: sempre convertida para mbar. Nenhuma função devolve Date.
 ****************************************************/

var BAIXATEMP_UNIDADES_PRESSAO = {
  MBAR: { rotulo: 'mbar', fator: 1 }, HPA: { rotulo: 'hPa', fator: 1 }, KPA: { rotulo: 'kPa', fator: 10 },
  PA: { rotulo: 'Pa', fator: 0.01 }, BAR: { rotulo: 'bar', fator: 1000 }, PSI: { rotulo: 'psi', fator: 68.9476 },
  MMHG: { rotulo: 'mmHg', fator: 1.333224 }, TORR: { rotulo: 'Torr', fator: 1.333224 }
};

function BaixaTempParser_norm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Número de texto pt-BR ou internacional; null se não for número. decimalVirgula: true/false/undefined (detecta). */
function BaixaTempParser_numero_(v, decimalVirgula) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'boolean') return null;
  var s = String(v).trim().replace(/ /g, '').replace(/\s/g, '');
  if (!s) return null;
  s = s.replace(/(°c|ºc|c|mbar|kpa|hpa|pa|bar|psi|%|ppm)$/i, '');
  if (!/^[+-]?[\d.,]+(e[+-]?\d+)?$/i.test(s)) return null;
  var temV = s.indexOf(',') >= 0, temP = s.indexOf('.') >= 0;
  if (temV && temP) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (temV) {
    s = (decimalVirgula === false && /^\d{1,3}(,\d{3})+$/.test(s)) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  var n = Number(s);
  return isFinite(n) ? n : null;
}

/* ============================================================ texto (CSV/TXT) */

function BaixaTempParser_separador_(linhas) {
  var cands = ['\t', ';', ',', '|'], melhor = '\t', pontos = -1;
  cands.forEach(function (c) {
    var contagens = linhas.slice(0, 30).map(function (l) { return l.split(c).length - 1; }).filter(function (n) { return n > 0; });
    if (!contagens.length) return;
    contagens.sort(function (a, b) { return a - b; });
    var mediana = contagens[Math.floor(contagens.length / 2)];
    var iguais = contagens.filter(function (n) { return n === mediana; }).length;
    var p = iguais * 10 + mediana;
    if (p > pontos) { pontos = p; melhor = c; }
  });
  return pontos < 0 ? null : melhor;
}

function BaixaTempParser_dividirLinha_(linha, sep) {
  if (!sep) return linha.trim().split(/\s{2,}|\s+(?=[-+]?\d)/);
  var saida = [], atual = '', aspas = false;
  for (var i = 0; i < linha.length; i++) {
    var ch = linha.charAt(i);
    if (ch === '"') { if (aspas && linha.charAt(i + 1) === '"') { atual += '"'; i++; } else aspas = !aspas; }
    else if (ch === sep && !aspas) { saida.push(atual); atual = ''; }
    else atual += ch;
  }
  saida.push(atual);
  return saida.map(function (c) { return c.trim(); });
}

/** Texto do arquivo → { matriz, separador, decimalVirgula }. */
function BaixaTempParser_textoParaMatriz_(texto) {
  var t = String(texto || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  var linhas = t.split('\n').filter(function (l) { return l.trim() !== ''; });
  if (!linhas.length) return { matriz: [], separador: '', decimalVirgula: true };
  var sep = BaixaTempParser_separador_(linhas);
  var decimalVirgula = sep !== ',';
  return { matriz: linhas.map(function (l) { return BaixaTempParser_dividirLinha_(l, sep); }), separador: sep || 'espaços', decimalVirgula: decimalVirgula };
}

/* ============================================================ data e hora */

function BaixaTempParser_ehData_(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

/** Date (do Sheets) → horário local sem fuso em ms. */
function BaixaTempParser_dataParaNaive_(d) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

function BaixaTempParser_serialParaNaive_(serial) {
  // 25569 = 01/01/1970 no sistema de datas da planilha
  return Math.round((Number(serial) - 25569) * 86400000);
}

/** "hh:mm[:ss[(.|:)mmm]]" → ms desde 0h; null se não for hora. */
function BaixaTempParser_hora_(v) {
  if (BaixaTempParser_ehData_(v)) return ((v.getHours() * 60 + v.getMinutes()) * 60 + v.getSeconds()) * 1000 + v.getMilliseconds();
  if (typeof v === 'number' && isFinite(v) && v >= 0 && v < 1) return Math.round(v * 86400000);
  var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.:,](\d{1,3}))?\s*(am|pm)?$/i.exec(String(v == null ? '' : v).trim());
  if (!m) return null;
  var h = Number(m[1]), mi = Number(m[2]), s = Number(m[3] || 0), ms = m[4] ? Number((m[4] + '00').slice(0, 3)) : 0;
  if (m[5]) { var pm = /pm/i.test(m[5]); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  if (h > 23 || mi > 59 || s > 59) return null;
  return ((h * 60 + mi) * 60 + s) * 1000 + ms;
}

/** Data (sem hora) → ms naive à 0h; estilo: 'BR' (dd/mm), 'US' (mm/dd) ou 'AUTO'. */
function BaixaTempParser_dataSo_(v, estilo) {
  if (BaixaTempParser_ehData_(v)) return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) return BaixaTempParser_serialParaNaive_(Math.floor(v));
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return BaixaTempParser_montar_(Number(m[1]), Number(m[2]), Number(m[3]));
  if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s))) {
    var a = Number(m[3]); if (a < 100) a += 2000;
    var x = Number(m[1]), y = Number(m[2]);
    if (estilo === 'US' || (estilo !== 'BR' && x <= 12 && y > 12)) return BaixaTempParser_montar_(a, x, y);
    return BaixaTempParser_montar_(a, y, x);
  }
  return null;
}

function BaixaTempParser_montar_(a, mes, dia) {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  var t = Date.UTC(a, mes - 1, dia);
  var d = new Date(t);
  return d.getUTCDate() === dia ? t : null;
}

/** Data e hora na mesma célula → ms naive. */
function BaixaTempParser_dataHora_(v, estilo) {
  if (BaixaTempParser_ehData_(v)) return BaixaTempParser_dataParaNaive_(v);
  if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) return BaixaTempParser_serialParaNaive_(v);
  var s = String(v == null ? '' : v).trim();
  var m = /^(\S+)[\sT]+(\d{1,2}:\d{2}(?::\d{2})?(?:[.:,]\d{1,3})?(?:\s*[ap]m)?)/i.exec(s);
  if (!m) return null;
  var d = BaixaTempParser_dataSo_(m[1], estilo), h = BaixaTempParser_hora_(m[2]);
  return d === null || h === null ? null : d + h;
}

function BaixaTempParser_dd_(n) { return (n < 10 ? '0' : '') + n; }

function BaixaTempParser_fmtHora_(ms) {
  if (ms === null || ms === undefined || !isFinite(ms)) return '—';
  var d = new Date(ms);
  return BaixaTempParser_dd_(d.getUTCHours()) + ':' + BaixaTempParser_dd_(d.getUTCMinutes()) + ':' + BaixaTempParser_dd_(d.getUTCSeconds());
}

function BaixaTempParser_fmtData_(ms) {
  if (ms === null || ms === undefined || !isFinite(ms)) return '—';
  var d = new Date(ms);
  return BaixaTempParser_dd_(d.getUTCDate()) + '/' + BaixaTempParser_dd_(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
}

function BaixaTempParser_fmtDataHora_(ms) {
  return BaixaTempParser_fmtData_(ms) + ' ' + BaixaTempParser_fmtHora_(ms);
}

/** "dd/mm/aaaa" ou "aaaa-mm-dd" → ms naive (0h); null se inválida. */
function BaixaTempParser_lerDataBr_(s) {
  return BaixaTempParser_dataSo_(String(s || '').trim(), 'BR');
}

/* ============================================================ cabeçalho e papéis */

function BaixaTempParser_linhaCabecalho_(matriz, decimalVirgula) {
  var lim = Math.min(matriz.length - 1, 60);
  for (var i = 0; i < lim; i++) {
    var l = matriz[i] || [], prox = matriz[i + 1] || [];
    var textos = l.filter(function (c) { return String(c == null ? '' : c).trim() !== '' && BaixaTempParser_numero_(c, decimalVirgula) === null && !BaixaTempParser_ehData_(c); }).length;
    var numerosProx = prox.filter(function (c) { return BaixaTempParser_numero_(c, decimalVirgula) !== null; }).length;
    if (textos >= 2 && numerosProx >= 1) return i;
  }
  return -1;
}

function BaixaTempParser_unidadePressao_(nome) {
  var n = BaixaTempParser_norm_(nome);
  if (/mbar/.test(n)) return 'MBAR';
  if (/hpa/.test(n)) return 'HPA';
  if (/kpa/.test(n)) return 'KPA';
  if (/mmhg/.test(n)) return 'MMHG';
  if (/torr/.test(n)) return 'TORR';
  if (/psi/.test(n)) return 'PSI';
  if (/\bbar\b/.test(n)) return 'BAR';
  if (/\(pa\)|\bpa\b/.test(n)) return 'PA';
  return '';
}

/** Papel proposto pelo nome do cabeçalho. */
function BaixaTempParser_papelPorNome_(nome) {
  var n = BaixaTempParser_norm_(nome);
  if (!n) return '';
  // 29/10/2026: número da linha do registrador ("Não." no arquivo do datalogger, "Nº", "Item"...) não é sensor.
  if (/^(n|no|nao|n[º°o]|num|numero|item|indice|index|seq|sequencia|#|id|registro|reg|amostra|linha|record)\.?$/.test(n)) return 'IGNORAR';
  if (/data.?(e|\/|_|-)?.?hora|date.?time|timestamp|data hora/.test(n)) return 'DATAHORA';
  if (/decorrid|elapsed|tempo\s*\((s|seg|min)|^seg(undos)?$|^tempo \(s\)$/.test(n)) return 'DECORRIDO';
  if (/^(data|date|dia)\b/.test(n)) return 'DATA';
  if (/^(hora|horario|time)\b/.test(n)) return 'HORA';
  if (/press|mbar|kpa|hpa|\bbar\b|psi|mmhg|torr|vacuo|vacuum/.test(n)) return 'PRESSAO';
  if (/umid|humid|\bur\b|%\s*ur|\brh\b/.test(n)) return 'UMIDADE';
  if (/conc|ppm|h2o2|perox|formal|mg\/l|mg\/m/.test(n)) return 'CONCENTRACAO';
  if (/^tempo$/.test(n)) return 'TEMPO';
  if (/temp|°c|ºc|degc|^t\s*-?\d+|^s\s*-?\d+|^st[\s\-_]?\d+|^ch\s*-?\d+|canal|sensor|^tc\s*-?\d+|^pt\s*-?\d+|sonda|probe/.test(n)) return 'TEMPERATURA';
  return '';
}

/**
 * Proposta de mapa de colunas para uma matriz.
 * Devolve { linhaCabecalho, colunas:[{idx,nome,papel,unidade}], mapa, decimalVirgula, avisos }.
 */
function BaixaTempParser_proporMapa_(matriz, decimalVirgula) {
  var avisos = [];
  var hdr = BaixaTempParser_linhaCabecalho_(matriz, decimalVirgula);
  var primeiraDados = hdr + 1;
  var largura = 0;
  matriz.slice(0, 80).forEach(function (l) { if (l && l.length > largura) largura = l.length; });
  var amostra = matriz.slice(primeiraDados, primeiraDados + 5);
  var colunas = [];
  for (var c = 0; c < largura; c++) {
    var nome = hdr >= 0 ? String((matriz[hdr] || [])[c] == null ? '' : matriz[hdr][c]).trim() : 'Coluna ' + (c + 1);
    var papel = BaixaTempParser_papelPorNome_(nome);
    var valores = amostra.map(function (l) { return (l || [])[c]; }).filter(function (v) { return v !== '' && v !== null && v !== undefined; });
    if (!valores.length) { colunas.push({ idx: c, nome: nome || ('Coluna ' + (c + 1)), papel: 'IGNORAR', unidade: '' }); continue; }
    var v0 = valores[0];
    if (papel === 'TEMPO') {
      papel = BaixaTempParser_hora_(v0) !== null ? 'HORA' : (BaixaTempParser_dataHora_(v0, 'AUTO') !== null ? 'DATAHORA' : (BaixaTempParser_numero_(v0, decimalVirgula) !== null ? 'DECORRIDO' : 'IGNORAR'));
    }
    if (!papel) {
      if (BaixaTempParser_ehData_(v0)) papel = (v0.getHours() || v0.getMinutes() || v0.getSeconds()) ? 'DATAHORA' : 'DATA';
      else if (BaixaTempParser_dataHora_(v0, 'AUTO') !== null) papel = 'DATAHORA';
      else if (BaixaTempParser_hora_(v0) !== null && typeof v0 !== 'number') papel = 'HORA';
      else if (typeof v0 !== 'number' && BaixaTempParser_dataSo_(v0, 'AUTO') !== null) papel = 'DATA';
      else if (BaixaTempParser_numero_(v0, decimalVirgula) !== null) papel = 'TEMPERATURA';
      else papel = 'IGNORAR';
    }
    colunas.push({ idx: c, nome: nome || ('Coluna ' + (c + 1)), papel: papel, unidade: papel === 'PRESSAO' ? BaixaTempParser_unidadePressao_(nome) : '' });
  }
  if (hdr < 0) avisos.push('O arquivo não tem linha de cabeçalho reconhecível: as colunas foram nomeadas "Coluna 1", "Coluna 2"... Confira o papel de cada coluna na prévia.');
  var mapa = BaixaTempParser_mapaDeColunas_(colunas);
  colunas.forEach(function (c) {
    if (c.papel === 'PRESSAO' && !c.unidade) avisos.push('A unidade da pressão da coluna "' + c.nome + '" não aparece no cabeçalho. Foi considerado mbar; escolha a unidade certa na prévia se o registrador usar outra.');
  });
  return { linhaCabecalho: hdr, colunas: colunas, mapa: mapa, decimalVirgula: decimalVirgula, avisos: avisos };
}

/** Lista de colunas com papéis → mapa usado na normalização. */
function BaixaTempParser_mapaDeColunas_(colunas) {
  var mapa = { data: -1, hora: -1, datahora: -1, decorrido: -1, temperaturas: [], nomesTemperaturas: [], pressao: -1, unidadePressao: 'MBAR', umidade: -1, concentracao: -1 };
  (colunas || []).forEach(function (c) {
    if (c.papel === 'DATA' && mapa.data < 0) mapa.data = c.idx;
    else if (c.papel === 'HORA' && mapa.hora < 0) mapa.hora = c.idx;
    else if (c.papel === 'DATAHORA' && mapa.datahora < 0) mapa.datahora = c.idx;
    else if (c.papel === 'DECORRIDO' && mapa.decorrido < 0) mapa.decorrido = c.idx;
    else if (c.papel === 'TEMPERATURA') { mapa.temperaturas.push(c.idx); mapa.nomesTemperaturas.push(c.nome); }
    else if (c.papel === 'PRESSAO' && mapa.pressao < 0) { mapa.pressao = c.idx; mapa.unidadePressao = c.unidade || 'MBAR'; }
    else if (c.papel === 'UMIDADE' && mapa.umidade < 0) mapa.umidade = c.idx;
    else if (c.papel === 'CONCENTRACAO' && mapa.concentracao < 0) mapa.concentracao = c.idx;
  });
  return mapa;
}

/* ============================================================ normalização */

/**
 * Matriz + mapa → série normalizada de UM arquivo.
 * opcoes: { linhaCabecalho, decimalVirgula, estiloData:'BR'|'US'|'AUTO', dataBase:'dd/mm/aaaa' (só com hora ou tempo decorrido),
 *           horaBase:'hh:mm:ss' (com tempo decorrido), unidadeDecorrido:'S'|'MIN' }
 * Devolve { tempos:[ms], temperaturas:[[...] por sensor], nomes:[], pressao:[mbar|null]|null, umidade, concentracao,
 *           descartadas, duplicadas, foraDeOrdem, avisos:[], erros:[] }.
 */
function BaixaTempParser_normalizar_(matriz, mapa, opcoes) {
  opcoes = opcoes || {};
  var dv = opcoes.decimalVirgula, estilo = String(opcoes.estiloData || 'AUTO').toUpperCase();
  var erros = [], avisos = [];
  var temData = mapa.datahora >= 0 || mapa.data >= 0 || mapa.hora >= 0 || mapa.decorrido >= 0;
  if (!temData) erros.push('Nenhuma coluna de data, hora ou tempo decorrido foi indicada. Na prévia, marque a coluna do horário como "Data e hora", "Hora" ou "Tempo decorrido" e leia o arquivo de novo.');
  if (!mapa.temperaturas || !mapa.temperaturas.length) erros.push('Nenhuma coluna de temperatura foi indicada. Na prévia, marque as colunas dos sensores como "Temperatura" e leia o arquivo de novo.');
  if (erros.length) return { tempos: [], temperaturas: [], nomes: [], pressao: null, umidade: null, concentracao: null, descartadas: 0, duplicadas: 0, foraDeOrdem: false, avisos: avisos, erros: erros };

  if (estilo === 'AUTO' && (mapa.data >= 0 || mapa.datahora >= 0)) estilo = BaixaTempParser_estiloDatas_(matriz, mapa, opcoes.linhaCabecalho);
  var base = opcoes.dataBase ? BaixaTempParser_lerDataBr_(opcoes.dataBase) : null;
  var horaBase = opcoes.horaBase ? BaixaTempParser_hora_(opcoes.horaBase) : 0;
  var fatorDec = String(opcoes.unidadeDecorrido || 'S').toUpperCase() === 'MIN' ? 60000 : 1000;
  if ((mapa.hora >= 0 && mapa.data < 0 && mapa.datahora < 0) || (mapa.decorrido >= 0 && mapa.datahora < 0 && mapa.data < 0 && mapa.hora < 0)) {
    if (base === null) {
      erros.push('O arquivo tem só a hora (ou o tempo decorrido), sem a data. Preencha a "Data do ciclo" no cartão do ciclo e leia o arquivo de novo.');
      return { tempos: [], temperaturas: [], nomes: [], pressao: null, umidade: null, concentracao: null, descartadas: 0, duplicadas: 0, foraDeOrdem: false, avisos: avisos, erros: erros };
    }
    avisos.push('O arquivo tem só a hora (ou o tempo decorrido), sem a data: foi usada a data do ciclo informada na tela (' + opcoes.dataBase + ').');
  }
  var unidade = BAIXATEMP_UNIDADES_PRESSAO[mapa.unidadePressao] || BAIXATEMP_UNIDADES_PRESSAO.MBAR;
  var linhas = [], descartadas = 0, inicio = (opcoes.linhaCabecalho == null ? -1 : opcoes.linhaCabecalho) + 1;
  var diaExtra = 0, ultimaHora = null;
  for (var i = Math.max(0, inicio); i < matriz.length; i++) {
    var l = matriz[i] || [];
    var t = null;
    if (mapa.datahora >= 0) t = BaixaTempParser_dataHora_(l[mapa.datahora], estilo);
    if (t === null && mapa.data >= 0 && mapa.hora >= 0) {
      var d = BaixaTempParser_dataSo_(l[mapa.data], estilo), h = BaixaTempParser_hora_(l[mapa.hora]);
      if (d !== null && h !== null) t = d + h;
    }
    if (t === null && mapa.hora >= 0 && mapa.data < 0 && mapa.datahora < 0) {
      var h2 = BaixaTempParser_hora_(l[mapa.hora]);
      if (h2 !== null) {
        if (ultimaHora !== null && h2 < ultimaHora - 3600000) diaExtra += 86400000; // passou da meia-noite
        ultimaHora = h2;
        t = (base === null ? Date.UTC(2000, 0, 1) : base) + diaExtra + h2;
      }
    }
    if (t === null && mapa.decorrido >= 0) {
      var dec = BaixaTempParser_numero_(l[mapa.decorrido], dv);
      if (dec !== null) t = (base === null ? Date.UTC(2000, 0, 1) : base) + horaBase + Math.round(dec * fatorDec);
    }
    var temps = mapa.temperaturas.map(function (c) {
      var n = BaixaTempParser_numero_(l[c], dv);
      if (n === null) return null;
      if (n < BAIXATEMP_CFG.LEITURA.TEMPERATURA_MIN_C || n > BAIXATEMP_CFG.LEITURA.TEMPERATURA_MAX_C) return null;
      return n;
    });
    if (t === null || temps.every(function (x) { return x === null; })) { descartadas++; continue; }
    var p = mapa.pressao >= 0 ? BaixaTempParser_numero_(l[mapa.pressao], dv) : null;
    linhas.push({
      t: t, temps: temps,
      p: p === null ? null : p * unidade.fator,
      u: mapa.umidade >= 0 ? BaixaTempParser_numero_(l[mapa.umidade], dv) : null,
      c: mapa.concentracao >= 0 ? BaixaTempParser_numero_(l[mapa.concentracao], dv) : null
    });
    if (linhas.length > BAIXATEMP_CFG.LEITURA.MAX_LINHAS) {
      erros.push('O arquivo passa de ' + BAIXATEMP_CFG.LEITURA.MAX_LINHAS + ' leituras. Exporte do registrador só o período do ciclo e envie de novo.');
      break;
    }
  }
  var foraDeOrdem = false;
  for (var k = 1; k < linhas.length; k++) if (linhas[k].t < linhas[k - 1].t) { foraDeOrdem = true; break; }
  if (foraDeOrdem) {
    linhas.sort(function (a, b) { return a.t - b.t; });
    avisos.push('As leituras do arquivo não estavam em ordem de horário e foram ordenadas. Confira se o formato da data (Brasil ou americano) está certo na prévia.');
  }
  var unicas = [], duplicadas = 0;
  linhas.forEach(function (x) { if (unicas.length && unicas[unicas.length - 1].t === x.t) duplicadas++; else unicas.push(x); });
  if (duplicadas) avisos.push(duplicadas + ' leitura(s) com horário repetido foram desconsideradas (ficou a primeira de cada horário).');
  if (descartadas) avisos.push(descartadas + ' linha(s) sem horário ou sem temperatura válida foram desconsideradas (cabeçalhos repetidos, linhas de resumo ou sensor fora da faixa de ' + BAIXATEMP_CFG.LEITURA.TEMPERATURA_MIN_C + ' °C a ' + BAIXATEMP_CFG.LEITURA.TEMPERATURA_MAX_C + ' °C).');
  if (!unicas.length) erros.push('Nenhuma leitura válida foi encontrada no arquivo. Confira na prévia se a coluna do horário e as colunas de temperatura estão marcadas certas.');
  var nomes = (mapa.nomesTemperaturas && mapa.nomesTemperaturas.length === mapa.temperaturas.length) ? mapa.nomesTemperaturas.slice() : mapa.temperaturas.map(function (c, i) { return 'Sensor ' + (i + 1); });
  return {
    tempos: unicas.map(function (x) { return x.t; }),
    temperaturas: mapa.temperaturas.map(function (c, s) { return unicas.map(function (x) { return x.temps[s]; }); }),
    nomes: nomes,
    pressao: mapa.pressao >= 0 ? unicas.map(function (x) { return x.p; }) : null,
    umidade: mapa.umidade >= 0 ? unicas.map(function (x) { return x.u; }) : null,
    concentracao: mapa.concentracao >= 0 ? unicas.map(function (x) { return x.c; }) : null,
    estiloData: estilo,
    descartadas: descartadas, duplicadas: duplicadas, foraDeOrdem: foraDeOrdem, avisos: avisos, erros: erros
  };
}

/** Estilo de data (BR/US) pelos valores: algum primeiro campo > 12 → BR; algum segundo > 12 → US. */
function BaixaTempParser_estiloDatas_(matriz, mapa, hdr) {
  var col = mapa.datahora >= 0 ? mapa.datahora : mapa.data;
  var br = 0, us = 0;
  for (var i = Math.max(0, (hdr == null ? -1 : hdr) + 1); i < Math.min(matriz.length, 3000); i++) {
    var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-]\d{2,4}/.exec(String((matriz[i] || [])[col] == null ? '' : matriz[i][col]).trim());
    if (!m) continue;
    if (Number(m[1]) > 12) br++;
    if (Number(m[2]) > 12) us++;
  }
  return us > br ? 'US' : 'BR';
}

/**
 * Une séries de vários arquivos (um por sensor, ou complementares) pelo horário.
 * A grade de horários é a do arquivo com pressão ou, sem pressão, a do primeiro.
 * Leitura de outro arquivo entra no horário da grade mais próximo, até meio intervalo típico de distância.
 * Devolve uma série no mesmo formato de BaixaTempParser_normalizar_.
 */
function BaixaTempParser_unir_(series) {
  var validas = (series || []).filter(function (s) { return s && s.tempos && s.tempos.length; });
  if (!validas.length) return null;
  if (validas.length === 1) return validas[0];
  var refIdx = 0;
  validas.forEach(function (s, i) { if (s.pressao && !validas[refIdx].pressao) refIdx = i; });
  var ref = validas[refIdx];
  var dt = BaixaTempParser_intervaloTipico_(ref.tempos);
  var tol = Math.max(500, dt * 1000 * BAIXATEMP_CFG.LEITURA.TOLERANCIA_ALINHAMENTO_FRACAO);
  var saida = { tempos: ref.tempos.slice(), temperaturas: [], nomes: [], pressao: ref.pressao, umidade: ref.umidade, concentracao: ref.concentracao, avisos: [], erros: [], descartadas: 0, duplicadas: 0, foraDeOrdem: false };
  var semPar = 0;
  validas.forEach(function (s, i) {
    s.avisos.forEach(function (a) { saida.avisos.push(a); });
    saida.descartadas += s.descartadas || 0;
    saida.duplicadas += s.duplicadas || 0;
    if (i === refIdx) {
      s.temperaturas.forEach(function (serie, k) { saida.temperaturas.push(serie.slice()); saida.nomes.push(s.nomes[k]); });
      return;
    }
    var j = 0;
    var alinhadas = s.temperaturas.map(function () { return []; });
    var u = s.umidade && !saida.umidade ? [] : null, c = s.concentracao && !saida.concentracao ? [] : null;
    saida.tempos.forEach(function (t) {
      while (j + 1 < s.tempos.length && Math.abs(s.tempos[j + 1] - t) <= Math.abs(s.tempos[j] - t)) j++;
      var ok = Math.abs(s.tempos[j] - t) <= tol;
      if (!ok) semPar++;
      s.temperaturas.forEach(function (serie, k) { alinhadas[k].push(ok ? serie[j] : null); });
      if (u) u.push(ok ? s.umidade[j] : null);
      if (c) c.push(ok ? s.concentracao[j] : null);
    });
    alinhadas.forEach(function (serie, k) { saida.temperaturas.push(serie); saida.nomes.push(s.nomes[k]); });
    if (u) saida.umidade = u;
    if (c) saida.concentracao = c;
  });
  if (semPar) saida.avisos.push(semPar + ' horário(s) da grade não tiveram leitura correspondente em algum dos arquivos por sensor (diferença maior que meio intervalo entre leituras). Esses pontos ficaram sem valor para o sensor.');
  return saida;
}

/** Intervalo típico (mediana) entre leituras, em segundos. */
function BaixaTempParser_intervaloTipico_(tempos) {
  var d = [];
  for (var i = 1; i < tempos.length; i++) d.push((tempos[i] - tempos[i - 1]) / 1000);
  if (!d.length) return 0;
  d.sort(function (a, b) { return a - b; });
  return d[Math.floor(d.length / 2)];
}

/** Lacunas (intervalos maiores que o fator × típico). */
function BaixaTempParser_lacunas_(tempos) {
  var dt = BaixaTempParser_intervaloTipico_(tempos);
  var lac = [], total = 0;
  for (var i = 1; i < tempos.length; i++) {
    var d = (tempos[i] - tempos[i - 1]) / 1000;
    if (dt > 0 && d > dt * BAIXATEMP_CFG.LEITURA.LACUNA_FATOR_AVISO) { lac.push({ de: tempos[i - 1], ate: tempos[i], segundos: d }); total += d - dt; }
  }
  var dur = tempos.length > 1 ? (tempos[tempos.length - 1] - tempos[0]) / 1000 : 0;
  return { intervaloTipicoS: dt, lacunas: lac, fracao: dur > 0 ? total / dur : 0 };
}
