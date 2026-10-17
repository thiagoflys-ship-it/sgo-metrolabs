/****************************************************
 * METROLABS  CONVERSOR UNIVERSAL DATALOGGER  V4.8
 * ARQUIVO: Graficos.gs
 * SISTEMA UNIFICADO: TERMO E ULTRASSOM
 * DESCRICAO: 
 * - Grficos blindados contra ausencia de analgicos. 
 * - Termos de Autoclave extirpados.
 * - NAOVO: Grfico de Fases Temporais (Gantt-like).
 * - PROTECAO OPERACIONAL: Blindagem de tempos e ndices contra ciclos abortados
 ****************************************************/

function LavRel_gerarGraficosAuditoria(ss, analise, nSensores) {
  if (!ss) return;

  analise = analise || {};

  const shDados = ss.getSheetByName('5. DADOS BRUTOS');
  if (!shDados) return;

  const ultimaLinha = shDados.getLastRow();
  const dadosIniciais = 11;
  if (ultimaLinha < dadosIniciais) return;

  const totalLinhas = ultimaLinha - dadosIniciais + 1;
  if (totalLinhas <= 1) return;

  nSensores = LavRel_normalizarQuantidadeSensoresGraficos_(analise, nSensores, shDados);
  const motor = String(analise.tipoCiclo || 'TERMO').toUpperCase();

  const corChumbo = '#374151';
  const corVerdeMetro = '#007b3e';
  const corAzulVacuo = '#0b4ea2';
  const corTexto = '#374151';

  const statusAprovacao = String(analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO')).toUpperCase();
  const corStatus = statusAprovacao === 'REPROVADO' ? '#dc2626' : (statusAprovacao === 'APROVADO_COM_ALERTA' ? '#d97706' : '#059669');

  LavRel_recriarAbaGrafico_(ss, '6. GRF. TEMPERATURA', 5);
  LavRel_recriarAbaGrafico_(ss, '7. GRF. ANALÓGICO', 6);
  LavRel_recriarAbaGrafico_(ss, '8. GRF. LETALIDADE', 7);
  LavRel_recriarAbaGrafico_(ss, '9. GRF. FASES E CONCLUSÃO', 8);

  LavRel_excluirAbaSeExistir_(ss, '6. GRF. PRESSO');
  LavRel_excluirAbaSeExistir_(ss, '6. GRF. PRESSÃO');
  LavRel_excluirAbaSeExistir_(ss, '8. ANÁLISE AVANÇADA DE PRESSÃO');
  LavRel_excluirAbaSeExistir_(ss, '9. CONCLUSÃO PRESSÃO');
  LavRel_excluirAbaSeExistir_(ss, '8. CONCLUSÃO PRESSÃO');
  LavRel_excluirAbaSeExistir_(ss, '8. ANALISE AVANADA DE PRESSO');
  LavRel_excluirAbaSeExistir_(ss, '9. CONCLUSAO PRESSO');
  LavRel_excluirAbaSeExistir_(ss, '8. CONCLUSAO PRESSO');
  LavRel_excluirAbaSeExistir_(ss, '8. CONCLUSAO PROCESSO');

  const shTemp = ss.getSheetByName('6. GRF. TEMPERATURA');
  const shAnalogo = ss.getSheetByName('7. GRF. ANALÓGICO');
  const shLeta = ss.getSheetByName('8. GRF. LETALIDADE');
  const shConc = ss.getSheetByName('9. GRF. FASES E CONCLUSÃO');

  [shTemp, shAnalogo, shLeta, shConc].forEach(function(sh) {
    if (!sh) return;
    sh.setHiddenGridlines(true);
    LavRel_aplicarLayoutA4PaisagemGrafico_(sh);
    LavRel_limparAbaGrafico_(sh);
  });

  const colPressao = nSensores + 2;

  const globalPres = analise.stats && analise.stats.globalPres ? analise.stats.globalPres : {};
  const exposicaoTemp = analise.stats && analise.stats.exposicaoTemp ? analise.stats.exposicaoTemp : {};
  const globalTemp = analise.stats && analise.stats.globalTemp ? analise.stats.globalTemp : {};

  const temDadoAnalogico = globalPres.count > 0;

  const pressMin = LavRel_numGraf_(globalPres.min);
  const pressMax = LavRel_numGraf_(globalPres.max);
  const pressMed = LavRel_numGraf_(globalPres.media);

  const mediaA0 = LavRel_numGraf_(analise.mediaA0);
  const minA0 = LavRel_numGraf_(analise.minA0);
  const maxA0 = LavRel_numGraf_(analise.maxA0);
  const tempoCavitacao = LavRel_numGraf_(analise.tempoCavitacao);

  const tempoTotal = LavRel_numGraf_(analise.tempoTotalMinutos);
  const tempoExp = LavRel_numGraf_(analise.tempoExposicaoMinutos);
  
  // Protecao contra ndices negativos de rampa em ciclos abortados
  let tempoPreparo = 0;
  if (analise.faseInicioRampa !== -1 && analise.faseInicioExp !== -1 && analise.faseInicioExp >= analise.faseInicioRampa) {
    const minPreparo = Math.max(0, analise.faseInicioExp - analise.faseInicioRampa);
    tempoPreparo = LavRel_numGraf_(minPreparo * analise.deltaMinutosEstimado);
  } else if (analise.faseInicioExp === -1 && analise.faseInicioRampa !== -1) {
    const minPreparo = Math.max(0, totalLinhas - 1 - analise.faseInicioRampa);
    tempoPreparo = LavRel_numGraf_(minPreparo * analise.deltaMinutosEstimado);
  }

  const deltaMin = LavRel_numGraf_(analise.deltaMinutosEstimado);
  const amplitudePress = Math.abs(pressMax - pressMin);

  const sensoresAtivosFlags = Array.isArray(analise.sensoresAtivos) ? analise.sensoresAtivos : Array.from({ length: nSensores }, function() { return true; });
  const sensoresUtilizados = Array.isArray(analise.sensoresUtilizados) ? analise.sensoresUtilizados : [];
  const sensoresDesabilitados = Array.isArray(analise.sensoresDesabilitados) ? analise.sensoresDesabilitados : [];
  const motivosReprovacao = Array.isArray(analise.motivosReprovacao) ? analise.motivosReprovacao : [];
  const alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];
  const observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  const piorSensorA0 = analise.piorSensorA0 || null;
  const piorSensorTemperatura = analise.piorSensorTemperatura || null;
  const limitesAprovacao = analise.limitesAprovacao || {};

  const parametroNormativo = LavRel_numGraf_(limitesAprovacao.parametroNormativo);
  const parametroOperacional = LavRel_numGraf_(limitesAprovacao.parametroOperacional);
  const limiteAprovacaoFinal = LavRel_numGraf_(limitesAprovacao.limiteAprovacaoFinal);

  function fmtBarAbs_(v) { return LavRel_numGraf_(v).toFixed(3); }
  function fmtTemp_(v) { return LavRel_numGraf_(v).toFixed(2) + ' °C'; }
  function fmtMin_(v) { return LavRel_numGraf_(v).toFixed(2) + ' min'; }
  function fmtA0_(v) { return LavRel_numGraf_(v).toFixed(2); }
  function statusLongo_() {
    if (statusAprovacao === 'REPROVADO') return 'REPROVADO';
    if (statusAprovacao === 'APROVADO_COM_ALERTA') return 'APROVADO COM ALERTA';
    return 'APROVADO';
  }

  function tituloPagina(sheet, texto) {
    sheet.getRange('A1:O2').merge()
      .setValue(String(texto || '').toUpperCase())
      .setBackground(corChumbo).setFontColor('#ffffff')
      .setFontWeight('bold').setFontSize(14)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  function formatarTextoComNegrito(sheet, rangeA1, textoCompleto, termosNegrito, corEspecial, fontSize) {
    textoCompleto = String(textoCompleto || '');
    termosNegrito = termosNegrito || [];
    fontSize = Number(fontSize || 11);

    let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);
    const estiloBase = SpreadsheetApp.newTextStyle().setForegroundColor(corTexto).setFontSize(fontSize).build();
    const estiloNegrito = SpreadsheetApp.newTextStyle().setForegroundColor(corTexto).setFontSize(fontSize).setBold(true).build();

    rtv.setTextStyle(0, textoCompleto.length, estiloBase);

    termosNegrito.forEach(function(termo) {
      if (!termo) return;
      let inicioBusca = 0;
      while (true) {
        const inicio = textoCompleto.indexOf(termo, inicioBusca);
        if (inicio === -1) break;
        rtv.setTextStyle(inicio, inicio + termo.length, estiloNegrito);
        inicioBusca = inicio + termo.length;
      }
    });

    if (corEspecial) {
      ['APROVADO', 'REPROVADO', 'APROVADO COM ALERTA', 'APROVADO_COM_ALERTA'].forEach(function(palavra) {
        let pos = 0;
        while (true) {
          const idx = textoCompleto.indexOf(palavra, pos);
          if (idx === -1) break;
          const estiloStatus = SpreadsheetApp.newTextStyle().setForegroundColor(corEspecial).setFontSize(fontSize).setBold(true).build();
          rtv.setTextStyle(idx, idx + palavra.length, estiloStatus);
          pos = idx + palavra.length;
        }
      });
    }

    sheet.getRange(rangeA1).setRichTextValue(rtv.build()).setWrap(true).setVerticalAlignment('top').setHorizontalAlignment('left').setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function textoListaGraficos_(lista, vazio) {
    if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
    return lista.map(function(m, i) { return (i + 1) + '. ' + m; }).join(' ');
  }

  function montarListaColunasSensoresAtivos_() {
    const cols = [];
    for (let s = 0; s < nSensores; s++) { if (sensoresAtivosFlags[s]) cols.push(2 + s); }
    return cols;
  }

  function montarTabelaLetalidadeAtivos_() {
    const dadosLetalidade = motor === 'TERMO' ? [['Sensor', 'Letalidade A0']] : [['Sensor', 'Temp. média na cavitação (°C)']];
    for (let idx = 0; idx < nSensores; idx++) {
      if (!sensoresAtivosFlags[idx]) continue;
      if (motor === 'TERMO') {
        const valor = (Array.isArray(analise.a0PorSensor) ? analise.a0PorSensor : [])[idx];
        if (valor !== null && valor !== undefined && analise.faseInicioExp !== -1) {
          dadosLetalidade.push(['S' + (idx + 1), LavRel_numGraf_(valor)]);
        } else {
          dadosLetalidade.push(['S' + (idx + 1), 0]);
        }
      } else {
        const statsS = analise.stats && analise.stats.sensores ? analise.stats.sensores[idx] : null;
        dadosLetalidade.push(['S' + (idx + 1), LavRel_numGraf_(statsS && statsS.mediaExposicao !== null && analise.faseInicioExp !== -1 ? statsS.mediaExposicao : 0)]);
      }
    }
    return dadosLetalidade;
  }

  const colsSensoresAtivos = montarListaColunasSensoresAtivos_();

  // ABA 5: PERFIL TRMICO
  tituloPagina(shTemp, 'MAPEAMENTO DE DISTRIBUIÇÃO TÉRMICA E HOMOGENEIDADE');
  let chartTempBuilder = shTemp.newChart().asLineChart().addRange(shDados.getRange(dadosIniciais, 1, totalLinhas, 1))
    .setTitle('PERFIL TÉRMICO DO EQUIPAMENTO').setXAxisTitle('EVOLUÇÃO TEMPORAL DO CICLO').setYAxisTitle('TEMPERATURA (°C)')
    .setNumHeaders(1).setOption('width', 1120).setOption('height', 500)
    .setOption('legend', { position: 'right', textStyle: { fontSize: 8 } })
    .setOption('chartArea', { left: '8%', top: '12%', width: '83%', height: '72%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } }).setPosition(3, 1, 0, 0);

  colsSensoresAtivos.forEach(colIdx => chartTempBuilder = chartTempBuilder.addRange(shDados.getRange(dadosIniciais, colIdx, totalLinhas, 1)));
  if (colsSensoresAtivos.length) shTemp.insertChart(chartTempBuilder.build());

  const txtTemp = statusAprovacao === 'REPROVADO'
    ? 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\nO mapeamento térmico evidencia comportamento não uniforme ou ciclo interrompido prematuramente, comprometendo o desempenho do processo. ' + (piorSensorTemperatura && analise.faseInicioExp !== -1 ? 'O ponto mais crítico identificado foi ' + piorSensorTemperatura.sensor + '.' : 'A câmara não atingiu estabilidade térmica regulamentar.')
    : (statusAprovacao === 'APROVADO_COM_ALERTA'
      ? 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\nO mapeamento térmico evidencia estabilidade durante a fase principal, porém com margem reduzida no pior caso monitorado (' + (piorSensorTemperatura ? piorSensorTemperatura.sensor : 'N/A') + '). A distribuição foi suficiente para atendimento operacional, requerendo acompanhamento.'
      : 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\nO mapeamento térmico evidencia estabilidade e homogeneidade no interior do equipamento. A convergência das curvas indica distribuição consistente da energia térmica sem desvios críticos.');

  shTemp.getRange('A27:O34').merge();
  formatarTextoComNegrito(shTemp, 'A27', txtTemp, ['PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):', piorSensorTemperatura && analise.faseInicioExp !== -1 ? piorSensorTemperatura.sensor : '', 'fase principal', 'estabilidade e homogeneidade'], statusAprovacao === 'REPROVADO' ? corStatus : null, 11);

  // ABA 6: GRÁFICO ANALÓGICO / BLINDADO CONTRA CRASH
  tituloPagina(shAnalogo, motor === 'TERMO' ? 'COMPORTAMENTO DE BOMBA / FLUIDOS' : 'COMPORTAMENTO ANALÓGICO DO TANQUE');

  let chartAnalogBuilder = shAnalogo.newChart().asLineChart().addRange(shDados.getRange(dadosIniciais, 1, totalLinhas, 1))
    .setXAxisTitle('EVOLUÇÃO TEMPORAL DO CICLO')
    .setNumHeaders(1).setOption('width', 1120).setOption('height', 500)
    .setOption('chartArea', { left: '8%', top: '12%', width: '85%', height: '72%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } }).setPosition(3, 1, 0, 0);

  if (temDadoAnalogico) {
    chartAnalogBuilder = chartAnalogBuilder.addRange(shDados.getRange(dadosIniciais, colPressao, totalLinhas, 1))
      .setTitle(motor === 'TERMO' ? 'GRÁFICO DA BOMBA DE RECIRCULAÇÃO' : 'NÍVEL / DINMICA DO TANQUE')
      .setYAxisTitle('VALOR MEDIDO (BAR / ANALÓGICO)')
      .setOption('series', { 0: { color: corAzulVacuo, lineWidth: 2 } });
  } else {
    chartAnalogBuilder = chartAnalogBuilder.addRange(shDados.getRange(dadosIniciais, 2, totalLinhas, 1))
      .setTitle('SEM SENSORES ANALÓGICOS NESTE DATALOGGER (EXIBINDO PERFIL TÉRMICO T1)')
      .setYAxisTitle('TEMPERATURA (°C)')
      .setOption('series', { 0: { color: '#9ca3af', lineWidth: 1, lineDashStyle: [4, 4] } });
  }

  shAnalogo.insertChart(chartAnalogBuilder.build());

  const txtAnalog = temDadoAnalogico
    ? 'PARECER TÉCNICO (DINMICA DE FLUIDOS):\n\nA curva analógica foi avaliada. ' + (statusAprovacao === 'REPROVADO' ? 'A avaliação integrada evidencia que a descontinuidade ou queda no ciclo inviabiliza a aprovação da dinâmica mecânica.' : 'A estabilidade observada ao longo da fase crítica indica coerência, sem indícios relevantes de falha mecânica.')
    : 'PARECER TÉCNICO (DINMICA DE FLUIDOS):\n\nO datalogger utilizado nesta validação não registrou colunas analógicas (pressão/nível). A aprovação baseou-se exclusivamente na eficácia térmica e mecânica inferida pelos termopares.';

  shAnalogo.getRange('A27:O34').merge();
  formatarTextoComNegrito(shAnalogo, 'A27', txtAnalog, ['PARECER TÉCNICO (DINMICA DE FLUIDOS):'], null, 11);

  // ABA 7: LETALIDADE
  tituloPagina(shLeta, motor === 'TERMO' ? 'INDICADOR DE LETALIDADE (VALOR A0)' : 'DESEMPENHO TÉRMICO NA FASE DE CAVITAÇÃO');
  const dadosLetalidade = montarTabelaLetalidadeAtivos_();
  shLeta.getRange(1, 20, dadosLetalidade.length, 2).setValues(dadosLetalidade);
  shLeta.hideColumns(20, 2);

  if (dadosLetalidade.length > 1) {
    const chartLeta = shLeta.newChart().asColumnChart().addRange(shLeta.getRange(1, 20, dadosLetalidade.length, 2))
      .setTitle(motor === 'TERMO' ? 'A0 ACUMULADO POR SENSOR ATIVO' : 'TEMPERATURA MÉDIA NA FASE POR SENSOR')
      .setXAxisTitle('SENSORES DE MONITORAMENTO')
      .setYAxisTitle(motor === 'TERMO' ? 'A0 ACUMULADO' : 'TEMPERATURA MÉDIA (°C)')
      .setNumHeaders(1).setOption('width', 1120).setOption('height', 500)
      .setOption('series', { 0: { color: corVerdeMetro } })
      .setOption('chartArea', { left: '8%', top: '12%', width: '85%', height: '72%' }).setPosition(3, 1, 0, 0).build();
    shLeta.insertChart(chartLeta);
  }

  let txtLeta = '';
  if (analise.faseInicioExp === -1) {
    txtLeta = motor === 'TERMO'
      ? 'PARECER TÉCNICO (VALOR A0):\n\nCálculo de letalidade térmica interrompido. O ciclo não atingiu a temperatura mínima programada na fase principal devido à interrupção operacional prematura. Valor de A0 global calculado: 0.00.'
      : 'PARECER TÉCNICO (EFICÁCIA DE CAVITAÇÃO):\n\nFase de lavagem não iniciada de forma estável. O tempo em temperatura alvo de cavitação foi nulo (0.00 min), caracterizando falha crítica estrutural no ciclo.';
  } else {
    txtLeta = motor === 'TERMO'
      ? 'PARECER TÉCNICO (VALOR A0):\n\nO indicador A0 representa a integração térmica. O pior caso (' + (piorSensorA0 ? piorSensorA0.sensor : 'N/A') + ') obteve ' + minA0.toFixed(2) + ', frente ao mínimo exigido de ' + limiteAprovacaoFinal.toFixed(2) + '. Classificação: ' + statusLongo_() + '.'
      : 'PARECER TÉCNICO (EFICÁCIA DE CAVITAÇÃO):\n\nO tempo de cavitação eficaz obtido foi de ' + tempoCavitacao.toFixed(2) + ' min, frente ao limite de ' + limiteAprovacaoFinal.toFixed(2) + ' min. Classificação: ' + statusLongo_() + '.';
  }

  shLeta.getRange('A27:O35').merge();
  formatarTextoComNegrito(shLeta, 'A27', txtLeta, ['PARECER TÉCNICO (VALOR A0):', 'PARECER TÉCNICO (EFICÁCIA DE CAVITAÇÃO):', statusLongo_()], statusAprovacao !== 'APROVADO' ? corStatus : null, 11);

  // ABA 8: SNTESE CONCLUSIVA (GRAFICO DE FASES BLINDADO)
  tituloPagina(shConc, 'DURAÇÃO DAS FASES E CONCLUSÃO DO PROCESSO');
  
  const nomeFasePreparo = motor === 'TERMO' ? 'LAVAGEM / AQUECIMENTO (MIN)' : 'ENCHIMENTO / DESGASEIFICAÇÃO (MIN)';
  const nomeFasePrincipal = motor === 'TERMO' ? 'DESINFECÇÃO (MIN)' : 'CAVITAÇÃO / LAVAGEM (MIN)';

  const dadosFases = [
    ['Fase', 'Duração estimada'],
    ['Tempo Total de Ciclo', tempoTotal],
    [nomeFasePreparo, tempoPreparo],
    [nomeFasePrincipal, tempoExp]
  ];

  shConc.getRange(1, 20, dadosFases.length, 2).setValues(dadosFases);
  shConc.hideColumns(20, 2);

  const chartConc = shConc.newChart().asBarChart().addRange(shConc.getRange(1, 20, dadosFases.length, 2))
    .setTitle('DISTRIBUIÇÃO TEMPORAL ESTIMADA (GRÁFICO DE FASES)')
    .setXAxisTitle('TEMPO (MINUTOS)')
    .setNumHeaders(1)
    .setOption('width', 1120).setOption('height', 430).setOption('series', { 0: { color: '#fb923c' } })
    .setOption('legend', { position: 'none' }).setOption('chartArea', { left: '20%', top: '12%', width: '75%', height: '68%' }).setPosition(3, 1, 0, 0).build();
  shConc.insertChart(chartConc);

  const resumoSensores = 'Sensores ativos: ' + (sensoresUtilizados.length ? sensoresUtilizados.join(', ') : 'Nenhum') + '. ';
  const blocoMotivos = statusAprovacao === 'REPROVADO' ? ('Motivos: ' + textoListaGraficos_(motivosReprovacao, 'Não informados.')) : (statusAprovacao === 'APROVADO_COM_ALERTA' ? ('Alertas: ' + textoListaGraficos_(alertasAnalise, 'Nenhum alerta.')) : 'Critérios atendidos.');
  
  let letalidadeInfoTxt = '';
  if (analise.faseInicioExp === -1) {
    letalidadeInfoTxt = motor === 'TERMO'
      ? 'A0 mínimo alcançado: 0.00 (FALHA DO COLETOR TÉRMICO). Mínimo exigido: ' + fmtA0_(limiteAprovacaoFinal) + '. '
      : 'Tempo eficaz mantido: 0.00 min (CICLO INTERROMPIDO). Mínimo exigido: ' + fmtMin_(limiteAprovacaoFinal) + '. ';
  } else {
    letalidadeInfoTxt = motor === 'TERMO' 
      ? 'A0 mínimo alcançado: ' + fmtA0_(minA0) + '. Limite aprovativo: ' + fmtA0_(limiteAprovacaoFinal) + '. '
      : 'Tempo eficaz mantido: ' + fmtMin_(tempoCavitacao) + '. Limite aprovativo: ' + fmtMin_(limiteAprovacaoFinal) + '. ';
  }

  const textoExposicaoExibicao = analise.faseInicioExp === -1 ? '0.0 min (Abortado)' : tempoExp.toFixed(1) + ' min';
  const textoMinimaExibicao = analise.faseInicioExp !== -1 ? fmtTemp_(exposicaoTemp.min) : 'N/A';

  const txtConclusaoGeral = 'PARECER TÉCNICO CONSOLIDADO DO EQUIPAMENTO:\n\n' + resumoSensores +
    'Tempo de fase principal (' + nomeFasePrincipal.replace(' (MIN)','') + '): ' + textoExposicaoExibicao + '. ' +
    'Temperatura mínima mantida na fase principal: ' + textoMinimaExibicao + '. ' +
    (temDadoAnalogico ? ('Sinal analógico máximo detectado na máquina: ' + fmtBarAbs_(pressMax) + '. ') : '') +
    letalidadeInfoTxt + blocoMotivos + ' Sob o ponto de vista normativo, o ciclo é classificado como ' + statusLongo_() + '.';

  shConc.getRange('A24:O35').merge();
  formatarTextoComNegrito(shConc, 'A24', txtConclusaoGeral, ['PARECER TÉCNICO CONSOLIDADO DO EQUIPAMENTO:', statusLongo_()], corStatus, 10);

  for (let r = 24; r <= 35; r++) shConc.setRowHeight(r, 20);

  SpreadsheetApp.flush();
}

function LavRel_normalizarQuantitySensoresGraficos_(analise, nSensores, shDados) {
  const porAnalise = Number(analise && analise.quantidadeSensoresInstalados);
  if (isFinite(porAnalise) && porAnalise > 0) return Math.round(porAnalise);
  const porParametro = Number(nSensores);
  if (isFinite(porParametro) && porParametro > 0) return Math.round(porParametro);
  if (shDados) {
    const totalCols = shDados.getLastColumn();
    if (totalCols >= 4) return Math.max(1, totalCols - 3);
  }
  return 12;
}

function LavRel_normalizarQuantidadeSensoresGraficos_(analise, nSensores, shDados) {
  return LavRel_normalizarQuantitySensoresGraficos_(analise, nSensores, shDados);
}

function LavRel_recriarAbaGrafico_(ss, nomeAba, posicao) {
  const antiga = ss.getSheetByName(nomeAba);
  if (antiga) ss.deleteSheet(antiga);
  ss.insertSheet(nomeAba, posicao);
}

function LavRel_excluirAbaSeExistir_(ss, nomeAba) {
  const sh = ss.getSheetByName(nomeAba);
  if (sh) ss.deleteSheet(sh);
}

function LavRel_limparAbaGrafico_(sheet) {
  const charts = sheet.getCharts();
  charts.forEach(function(chart) { sheet.removeChart(chart); });
  sheet.getRange('A1:V60').clearContent();
  sheet.getRange('A1:V60').clearFormat();
  sheet.getRange('A1:V60').clearDataValidations();
  try { sheet.getRange('A1:V60').breakApart(); } catch (e) {}
}

function LavRel_aplicarLayoutA4PaisagemGrafico_(sheet) {
  for (let c = 1; c <= 15; c++) sheet.setColumnWidth(c, 78);
  for (let c = 20; c <= 22; c++) sheet.setColumnWidth(c, 90);
  sheet.setRowHeight(1, 24);
  sheet.setRowHeight(2, 24);
  for (let r = 3; r <= 60; r++) sheet.setRowHeight(r, 22);
}

function LavRel_numGraf_(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(',', '.').trim());
  return isFinite(n) ? n : 0;
}