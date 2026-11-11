/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — CADEIA DE FRIO
 * ARQUIVO: Graficos.gs
 * DESCRIÇÃO:
 * Um gráfico de temperatura por sensor ao longo do tempo PARA CADA
 * ESTUDO do laudo (distribuição, abertura de porta, queda de
 * energia, autonomia), com linhas de referência da faixa
 * operacional (Limite Mín/Máx), lidos da aba "DADOS — {estudo}"
 * correspondente gerada pelo Planilha.js, seguido de um bloco de
 * texto interpretativo (mesmo papel dos pareceres técnicos que
 * acompanham os gráficos no motor de Autoclave), com variações
 * conforme o status de aprovação daquele estudo específico.
 ****************************************************/

// Paleta categórica validada (ordem fixa, nunca embaralhada) — mesmas 7
// cores da paleta padrão do design system (azul/verde/magenta/amarelo/
// aqua/laranja/violeta), excluindo só o vermelho (reservado às linhas de
// limite). A ORDEM é o que garante que o 1º e o 2º sensor (o caso mais
// comum, 2 sensores ativos) fiquem visualmente bem distintos — antes a
// paleta começava com dois tons de azul/roxo adjacentes, quase
// indistinguíveis quando as duas curvas andam coladas — validado com o
// script de paleta do design system (contraste CVD/visão normal ok).
// Repete em ciclo se houver mais sensores ativos que cores.
var CadeiaFrioRel_CFGRAF_PALETA_SENSORES = [
  '#2a78d6', // azul
  '#008300', // verde
  '#e87ba4', // magenta
  '#eda100', // amarelo
  '#1baf7a', // aqua
  '#eb6834', // laranja
  '#4a3aa7'  // violeta
];

function CadeiaFrioRel_cfPaletaCoresSensores_(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(CadeiaFrioRel_CFGRAF_PALETA_SENSORES[i % CadeiaFrioRel_CFGRAF_PALETA_SENSORES.length]);
  return out;
}

function CadeiaFrioRel_cfGerarGraficos(ss, analises, nSensores) {
  if (!ss || !Array.isArray(analises)) return;
  analises.forEach(function(analise) {
    CadeiaFrioRel_cfGerarGraficoEstudo_(ss, analise, nSensores);
  });
}

function CadeiaFrioRel_cfGerarGraficoEstudo_(ss, analise, nSensores) {
  const sufixo = CadeiaFrioRel_cfNomeCurtoEstudo_(analise.tipoEstudo);
  const nomeDados = 'DADOS — ' + sufixo;
  const nomeGrafico = 'GRÁFICO — ' + sufixo;

  const shDados = ss.getSheetByName(nomeDados);
  if (!shDados) return;

  const ultimaLinha = shDados.getLastRow();
  if (ultimaLinha < 2) return;

  // A aba "DADOS — {estudo}" só tem colunas para os sensores marcados como
  // ativos (ver CadeiaFrioRel_cfMontarDadosBrutos_ em Planilha.js) — usar essa contagem
  // em vez do total de sensores instalados, senão o gráfico tenta ler
  // colunas que não existem mais (ou lê a coluna errada de Limite Mín/Máx).
  const nSensoresAtivos = Array.isArray(analise.sensoresUtilizados) ? analise.sensoresUtilizados.length : Number(nSensores || 0);
  const totalColunas = 1 + nSensoresAtivos + 2; // Tempo + sensores ativos + Limite Mín/Máx

  const abaExistente = ss.getSheetByName(nomeGrafico);
  if (abaExistente) ss.deleteSheet(abaExistente);

  const posDados = ss.getSheets().findIndex(function(s) { return s.getName() === nomeDados; });
  const shGraf = ss.insertSheet(nomeGrafico, posDados + 1);
  CadeiaFrioRel_cfLayoutA4Paisagem_(shGraf);

  const statusAprovacao = String(analise.statusAprovacao || 'INFORMATIVO').toUpperCase();
  const corStatus = CadeiaFrioRel_cfCorPorStatus_(statusAprovacao);
  const larguraTitulo = Math.max(8, totalColunas);

  // Largura total de coluna igual à das outras abas do laudo (CadeiaFrioRel_CFCFG.
  // LARGURA_PAGINA_PX) — sem isso, a barra de título/gráfico usava a
  // largura padrão de coluna nova do Sheets, que não bate com a largura
  // real do gráfico (1500px), deixando-o descentralizado/cortado.
  const larguraPagina = CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500;
  const larguraColuna = Math.round(larguraPagina / larguraTitulo);
  shGraf.setColumnWidths(1, larguraTitulo, larguraColuna);

  shGraf.getRange(1, 1, 1, larguraTitulo).merge()
    .setValue(CadeiaFrioRel_cfLabelEstudo_(analise.tipoEstudo) + ' — TEMPERATURA × TEMPO')
    .setFontSize(14).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  shGraf.setRowHeight(1, 28);

  // Linhas 2 em diante ganham altura fixa e pequena (em vez da altura
  // padrão de linha nova do Sheets) — isso é o que garante que o total
  // de altura da aba (barra de título + área do gráfico + legenda +
  // texto interpretativo) fique dentro de UMA página impressa, em vez de
  // sobrar uma página extra em branco depois do gráfico.
  const ALTURA_LINHA_PADRAO = 20;
  const LINHA_GRAFICO_INICIO = 3;
  const ALTURA_GRAFICO_PX = 620;
  const LINHAS_GRAFICO = Math.ceil(ALTURA_GRAFICO_PX / ALTURA_LINHA_PADRAO);
  const LINHA_LEGENDA_INICIO = LINHA_GRAFICO_INICIO + LINHAS_GRAFICO + 1;

  for (let r = 2; r < LINHA_LEGENDA_INICIO; r++) {
    shGraf.setRowHeight(r, ALTURA_LINHA_PADRAO);
  }

  const range = shDados.getRange(1, 1, ultimaLinha, totalColunas);

  // Cada sensor ganha uma cor própria e nitidamente diferente das demais
  // (e diferente do vermelho, reservado só para os limites da faixa) —
  // sem isso, o Sheets escolhe cores automáticas que podem ficar muito
  // parecidas entre si ou com o vermelho dos limites, dificultando a
  // leitura de quem não conhece o gráfico.
  const seriesOptions = {};
  const paletaSensores = CadeiaFrioRel_cfPaletaCoresSensores_(nSensoresAtivos);
  for (let k = 0; k < nSensoresAtivos; k++) {
    seriesOptions[k] = { color: paletaSensores[k], lineWidth: 2 };
  }
  const idxLimiteMin = nSensoresAtivos;
  const idxLimiteMax = nSensoresAtivos + 1;
  seriesOptions[idxLimiteMin] = { lineDashStyle: [4, 4], color: '#dc2626', lineWidth: 1.5 };
  seriesOptions[idxLimiteMax] = { lineDashStyle: [4, 4], color: '#dc2626', lineWidth: 1.5 };

  // A legenda NATIVA do gráfico do Sheets (legend:{position:'bottom'})
  // foi desligada de propósito: em teste real ela renderizou só os
  // marcadores coloridos, sem o texto do rótulo ao lado (ilegível — não
  // dava pra saber qual cor era qual sensor). Em vez de depender do
  // motor de gráfico do Sheets pra isso, a legenda agora é escrita como
  // texto rico normal da planilha (mesma tecnologia 100% confiável já
  // usada em todo o resto do laudo), logo abaixo do gráfico — ver
  // CadeiaFrioRel_cfEscreverLegendaGrafico_.
  const chart = shGraf.newChart()
    .asLineChart()
    .addRange(range)
    .setOption('useFirstColumnAsDomain', true)
    .setOption('title', CadeiaFrioRel_cfLabelEstudo_(analise.tipoEstudo) + ' — Temperatura × Tempo')
    .setOption('titleTextStyle', { fontSize: 18, bold: true })
    .setOption('legend', { position: 'none' })
    .setOption('series', seriesOptions)
    .setOption('width', larguraPagina)
    .setOption('height', ALTURA_GRAFICO_PX)
    .setOption('chartArea', { width: '88%', height: '80%' })
    .setOption('lineWidth', 2)
    .setOption('pointSize', 2)
    .setOption('hAxis', { title: 'Tempo', titleTextStyle: { fontSize: 13, bold: true }, textStyle: { fontSize: 11 }, slantedText: true, gridlines: { color: '#e5e7eb' } })
    .setOption('vAxis', { title: 'Temperatura (°C)', titleTextStyle: { fontSize: 13, bold: true }, textStyle: { fontSize: 11 }, gridlines: { color: '#e5e7eb' } })
    .setOption('backgroundColor', '#ffffff')
    .setPosition(LINHA_GRAFICO_INICIO, 1, 0, 0)
    .build();

  shGraf.insertChart(chart);

  const itensLegenda = [];
  for (let k = 0; k < nSensoresAtivos; k++) {
    itensLegenda.push({ simbolo: '●', cor: paletaSensores[k], label: 'Sensor ' + (analise.sensoresUtilizados && analise.sensoresUtilizados[k] ? analise.sensoresUtilizados[k] : ('S' + (k + 1))) });
  }
  itensLegenda.push({ simbolo: '- -', cor: '#dc2626', label: 'Limite Mínimo (' + CadeiaFrioRel_cfFmtC_(analise.faixa && analise.faixa.tMin) + ')' });
  itensLegenda.push({ simbolo: '- -', cor: '#dc2626', label: 'Limite Máximo (' + CadeiaFrioRel_cfFmtC_(analise.faixa && analise.faixa.tMax) + ')' });

  const linhaTextoInicio = CadeiaFrioRel_cfEscreverLegendaGrafico_(shGraf, LINHA_LEGENDA_INICIO, itensLegenda, larguraTitulo, larguraPagina);

  const textoInterpretativo = CadeiaFrioRel_cfMontarTextoInterpretativoGrafico_(analise, statusAprovacao);
  CadeiaFrioRel_cfEscreverBlocoTextoRico_(shGraf, linhaTextoInicio, textoInterpretativo, [], corStatus, 11, larguraTitulo, larguraPagina / 10);
}

// Legenda manual do gráfico — escrita como texto rico de planilha (não
// como opção do gráfico), pra garantir que o rótulo de cada cor sempre
// apareça: um "●" colorido por sensor + um "- -" vermelho para cada
// linha de limite, seguidos do nome/valor em tinta neutra (a cor nunca
// vai no texto do rótulo, só no marcador).
function CadeiaFrioRel_cfEscreverLegendaGrafico_(sh, row, itens, larguraTitulo, larguraPagina) {
  if (!itens || !itens.length) return row;

  const SEP = '      ';
  let texto = '';
  const segmentos = [];

  itens.forEach(function(item, i) {
    if (i > 0) texto += SEP;
    const inicioSimbolo = texto.length;
    texto += item.simbolo;
    segmentos.push({ inicio: inicioSimbolo, fim: texto.length, cor: item.cor });
    texto += ' ' + item.label;
  });

  const charsPorLinha = Math.max(40, Math.round((larguraPagina || 1500) / 9));
  const linhas = Math.max(1, Math.ceil(texto.length / charsPorLinha));

  sh.getRange(row, 1, linhas, larguraTitulo).merge();

  const rtv = SpreadsheetApp.newRichTextValue().setText(texto);
  const base = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(12).build();
  rtv.setTextStyle(0, texto.length, base);

  segmentos.forEach(function(seg) {
    const estiloMarcador = SpreadsheetApp.newTextStyle().setForegroundColor(seg.cor).setFontSize(15).setBold(true).build();
    rtv.setTextStyle(seg.inicio, seg.fim, estiloMarcador);
  });

  sh.getRange(row, 1)
    .setRichTextValue(rtv.build())
    .setWrap(true)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  for (let r = row; r < row + linhas; r++) sh.setRowHeight(r, 24);

  return row + linhas;
}

function CadeiaFrioRel_cfMontarTextoInterpretativoGrafico_(analise, statusAprovacao) {
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  let texto = 'Leitura gráfica (' + CadeiaFrioRel_cfLabelStatus_(statusAprovacao) + '): ';

  if (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') {
    texto += analise.piorSensor
      ? ('as linhas tracejadas em vermelho marcam os limites da faixa operacional; o ponto de maior desvio em relação a esses limites ocorreu no sensor ' +
         analise.piorSensor.sensor + ', em ' + analise.piorSensor.tempoStr + ' (' + CadeiaFrioRel_cfFmtC_(analise.piorSensor.valor) + ').')
      : 'as linhas tracejadas em vermelho marcam os limites da faixa operacional; nenhuma série de sensor cruzou esses limites durante o período monitorado, evidenciando homogeneidade térmica entre os pontos monitorados do equipamento.';
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    texto += analise.rompeu
      ? ('observa-se a subida da curva de temperatura logo após o início do evento, cruzando o limite superior (linha tracejada) ' +
         CadeiaFrioRel_cfFmtMin_(analise.tempoAteRupturaMinutos) + ' depois, com a curva ' +
         (analise.recuperouTotalmente ? ('retornando à faixa operacional ' + CadeiaFrioRel_cfFmtMin_(analise.tempoAteRecuperacaoMinutos) + ' após o evento.') : 'sem retorno total à faixa registrado nos dados disponíveis.'))
      : 'a curva de temperatura permanece dentro das linhas tracejadas de limite durante todo o período de dados disponível a partir do início do evento.';
  } else if (tipo === 'AUTONOMIA') {
    texto += analise.rompeu
      ? ('a curva de temperatura sobe de forma sustentada até cruzar o limite superior (linha tracejada) em ' + CadeiaFrioRel_cfFmtHoras_(analise.autonomiaMinutos) + '.')
      : 'a curva de temperatura permanece dentro das linhas tracejadas de limite durante todo o período gravado, sem cruzar o limite superior.';
  } else {
    texto += 'as linhas tracejadas em vermelho marcam os limites da faixa operacional configurados para este ensaio.';
  }

  return texto;
}
