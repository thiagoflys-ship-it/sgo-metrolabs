/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - V4.4
 * ARQUIVO: Graficos.gs
 * DESCRIÇÃO:
 * Gráficos de auditoria revisados com:
 * - sensores ativos/desabilitados
 * - textos inteligentes coerentes com resultado
 * - F0 e temperatura compatíveis com o novo motor
 * - síntese final consolidada sem redundância
 * - blindagem para cenários com poucos dados
 * - suporte a APROVADO / APROVADO_COM_ALERTA / REPROVADO
 * - eixo temporal usando dados válidos do relatório
 * - conclusão sem rigidez excessiva e com critérios operacionais
 ****************************************************/

function AutoRel_gerarGraficosAuditoria(ss, analise, nSensores) {
  if (!ss) return;

  analise = analise || {};

  const shDados = ss.getSheetByName('5. DADOS BRUTOS');
  if (!shDados) return;

  const ultimaLinha = shDados.getLastRow();
  const dadosIniciais = 11;
  if (ultimaLinha < dadosIniciais) return;

  const totalLinhas = ultimaLinha - dadosIniciais + 1;
  if (totalLinhas <= 1) return;

  nSensores = AutoRel_normalizarQuantidadeSensoresGraficos_(analise, nSensores, shDados);

  const corChumbo = '#374151';
  const corVerdeMetro = '#007b3e';
  const corAzulVacuo = '#0b4ea2';
  const corTexto = '#374151';

  const statusAprovacao = String(
    analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO')
  ).toUpperCase();

  const corStatus =
    statusAprovacao === 'REPROVADO'
      ? '#dc2626'
      : (statusAprovacao === 'APROVADO_COM_ALERTA' ? '#d97706' : '#059669');

  AutoRel_recriarAbaGrafico_(ss, '6. GRÁF. TEMPERATURA', 5);
  AutoRel_recriarAbaGrafico_(ss, '7. GRÁF. PRESSÃO', 6);
  AutoRel_recriarAbaGrafico_(ss, '8. GRÁF. LETALIDADE', 7);
  AutoRel_recriarAbaGrafico_(ss, '9. CONCLUSÃO PRESSÃO', 8);

  AutoRel_excluirAbaSeExistir_(ss, '8. ANÁLISE AVANÇADA DE PRESSÃO');
  AutoRel_excluirAbaSeExistir_(ss, '8. CONCLUSÃO PRESSÃO');

  const shTemp = ss.getSheetByName('6. GRÁF. TEMPERATURA');
  const shPres = ss.getSheetByName('7. GRÁF. PRESSÃO');
  const shF0 = ss.getSheetByName('8. GRÁF. LETALIDADE');
  const shPresConc = ss.getSheetByName('9. CONCLUSÃO PRESSÃO');

  [shTemp, shPres, shF0, shPresConc].forEach(function(sh) {
    if (!sh) return;
    sh.setHiddenGridlines(true);
    AutoRel_aplicarLayoutA4PaisagemGrafico_(sh);
    AutoRel_limparAbaGrafico_(sh);
  });

  const colPressao = nSensores + 2;

  const globalPres = analise.stats && analise.stats.globalPres ? analise.stats.globalPres : {};
  const exposicaoTemp = analise.stats && analise.stats.exposicaoTemp ? analise.stats.exposicaoTemp : {};
  const globalTemp = analise.stats && analise.stats.globalTemp ? analise.stats.globalTemp : {};

  const pressMin = AutoRel_numGraf_(globalPres.min);
  const pressMax = AutoRel_numGraf_(globalPres.max);
  const pressMed = AutoRel_numGraf_(globalPres.media);

  const mediaF0 = AutoRel_numGraf_(analise.mediaF0);
  const minF0 = AutoRel_numGraf_(analise.minF0);
  const maxF0 = AutoRel_numGraf_(analise.maxF0);

  const tempoTotal = AutoRel_numGraf_(analise.tempoTotalMinutos);
  const tempoExp = AutoRel_numGraf_(analise.tempoExposicaoMinutos);
  const deltaMin = AutoRel_numGraf_(analise.deltaMinutosEstimado);
  const amplitudePress = Math.abs(pressMax - pressMin);

  const sensoresAtivosFlags = Array.isArray(analise.sensoresAtivos)
    ? analise.sensoresAtivos
    : Array.from({ length: nSensores }, function() { return true; });

  const sensoresUtilizados = Array.isArray(analise.sensoresUtilizados) ? analise.sensoresUtilizados : [];
  const sensoresDesabilitados = Array.isArray(analise.sensoresDesabilitados) ? analise.sensoresDesabilitados : [];
  const motivosReprovacao = Array.isArray(analise.motivosReprovacao) ? analise.motivosReprovacao : [];
  const alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];
  const observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  const piorSensorF0 = analise.piorSensorF0 || null;
  const piorSensorTemperatura = analise.piorSensorTemperatura || null;
  const limitesAprovacao = analise.limitesAprovacao || {};

  const f0MinNormativo = AutoRel_numGraf_(limitesAprovacao.f0MinNormativo);
  const f0MinOperacional = AutoRel_numGraf_(limitesAprovacao.f0MinOperacional);
  const toleranciaF0 = AutoRel_numGraf_(limitesAprovacao.toleranciaF0);
  const limiteAprovacaoF0 = AutoRel_numGraf_(limitesAprovacao.limiteAprovacaoF0);

  function fmtBarAbs_(v) {
    return AutoRel_numGraf_(v).toFixed(3) + ' BAR ABS';
  }

  function fmtTemp_(v) {
    return AutoRel_numGraf_(v).toFixed(2) + ' °C';
  }

  function fmtMin_(v) {
    return AutoRel_numGraf_(v).toFixed(2) + ' min';
  }

  function statusLongo_() {
    if (statusAprovacao === 'REPROVADO') return 'REPROVADO';
    if (statusAprovacao === 'APROVADO_COM_ALERTA') return 'APROVADO COM ALERTA';
    return 'APROVADO';
  }

  function tituloPagina(sheet, texto) {
    sheet.getRange('A1:O2').merge()
      .setValue(String(texto || '').toUpperCase())
      .setBackground(corChumbo)
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(14)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  }

  function formatarTextoComNegrito(sheet, rangeA1, textoCompleto, termosNegrito, corEspecial, fontSize) {
    textoCompleto = String(textoCompleto || '');
    termosNegrito = termosNegrito || [];
    fontSize = Number(fontSize || 11);

    let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);

    const estiloBase = SpreadsheetApp.newTextStyle()
      .setForegroundColor(corTexto)
      .setFontSize(fontSize)
      .build();

    const estiloNegrito = SpreadsheetApp.newTextStyle()
      .setForegroundColor(corTexto)
      .setFontSize(fontSize)
      .setBold(true)
      .build();

    rtv.setTextStyle(0, textoCompleto.length, estiloBase);

    termosNegrito.forEach(function(termo) {
      termo = String(termo || '');
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
      [
        'APROVADO',
        'REPROVADO',
        'APROVADO COM ALERTA',
        'APROVADO_COM_ALERTA',
        'APROVADO.',
        'REPROVADO.'
      ].forEach(function(palavra) {
        let pos = 0;
        while (true) {
          const idx = textoCompleto.indexOf(palavra, pos);
          if (idx === -1) break;

          const estiloStatus = SpreadsheetApp.newTextStyle()
            .setForegroundColor(corEspecial)
            .setFontSize(fontSize)
            .setBold(true)
            .build();

          rtv.setTextStyle(idx, idx + palavra.length, estiloStatus);
          pos = idx + palavra.length;
        }
      });
    }

    const range = sheet.getRange(rangeA1);
    range
      .setRichTextValue(rtv.build())
      .setWrap(true)
      .setVerticalAlignment('top')
      .setHorizontalAlignment('left')
      .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function textoListaGraficos_(lista, vazio) {
    if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
    return lista.map(function(m, i) {
      return (i + 1) + '. ' + m;
    }).join(' ');
  }

  function montarListaColunasSensoresAtivos_() {
    const cols = [];
    for (let s = 0; s < nSensores; s++) {
      if (sensoresAtivosFlags[s]) {
        cols.push(2 + s);
      }
    }
    return cols;
  }

  function montarTabelaF0Ativos_() {
    const dadosF0 = [['Sensor', 'Letalidade F0']];
    const f0PorSensor = Array.isArray(analise.f0PorSensor) ? analise.f0PorSensor : [];

    for (let idx = 0; idx < f0PorSensor.length; idx++) {
      if (!sensoresAtivosFlags[idx]) continue;

      const valor = f0PorSensor[idx];
      if (valor === null || valor === undefined || !isFinite(Number(String(valor).replace(',', '.')))) continue;

      dadosF0.push(['S' + (idx + 1), AutoRel_numGraf_(valor)]);
    }

    return dadosF0;
  }

  const colsSensoresAtivos = montarListaColunasSensoresAtivos_();
  // Fonte exclusiva dos graficos: cabecalho real preserva todas as leituras.
  const dadosGrafico = shDados.getRange(dadosIniciais, 1, totalLinhas, nSensores + 2).getValues();
  const temposGrafico = dadosGrafico.map(function(r) { return r[0]; });
  const minutosGrafico = AutoRel_minutosDecorridosGraficos_(temposGrafico);
  const tabelaGrafico = [['Tempo decorrido (min)'].concat(colsSensoresAtivos.map(function(c) { return 'S' + (c - 1) + ' (\u00b0C)'; })).concat(['Press\u00e3o (bar abs)'])];
  dadosGrafico.forEach(function(r, i) { tabelaGrafico.push([minutosGrafico[i]].concat(colsSensoresAtivos.map(function(c) { return r[c - 1]; })).concat([r[colPressao - 1]])); });
  AutoRel_recriarAbaGrafico_(ss, '_AUX_CICLO_AUTOCLAVE', 9);
  const shAuxGrafico = ss.getSheetByName('_AUX_CICLO_AUTOCLAVE');
  AutoRel_garantirGradeFonteGraficos_(shAuxGrafico, tabelaGrafico.length, tabelaGrafico[0].length);
  shAuxGrafico.getRange(1, 1, tabelaGrafico.length, tabelaGrafico[0].length).setValues(tabelaGrafico);
  shAuxGrafico.hideSheet();
  const periodoGrafico = 'Registro: ' + String(temposGrafico[0]) + ' a ' + String(temposGrafico[temposGrafico.length - 1]) + '. ';


  // ==========================================================
  // ABA 5: PERFIL TÉRMICO
  // ==========================================================
  tituloPagina(shTemp, 'MAPEAMENTO DE DISTRIBUIÇÃO TÉRMICA E HOMOGENEIDADE');

  let chartTempBuilder = shTemp.newChart()
    .asLineChart()
    .addRange(shAuxGrafico.getRange(1, 1, tabelaGrafico.length, 1))
    .setTitle('PERFIL TÉRMICO DA CÂMARA')
    .setXAxisTitle('TEMPO DECORRIDO (MIN)')
    .setYAxisTitle('TEMPERATURA (°C)')
    .setNumHeaders(1)
    .setOption('width', 1120)
    .setOption('height', 500)
    .setOption('legend', { position: 'right', textStyle: { fontSize: 8 } })
    .setOption('chartArea', { left: '8%', top: '12%', width: '83%', height: '72%' })
    .setOption('hAxis', {
      slantedText: true,
      slantedTextAngle: 45,
      textStyle: { fontSize: 8 }
    })
    .setPosition(3, 1, 0, 0);

  colsSensoresAtivos.forEach(function(colIdx, idx) {
    chartTempBuilder = chartTempBuilder.addRange(shAuxGrafico.getRange(1, idx + 2, tabelaGrafico.length, 1));
  });

  if (colsSensoresAtivos.length) {
    shTemp.insertChart(chartTempBuilder.build());
  }

  const txtTemp =
    statusAprovacao === 'REPROVADO'
      ? 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\n' +
        'O mapeamento térmico considerando exclusivamente os sensores ativos evidencia comportamento não uniforme suficiente para comprometer o desempenho térmico do processo no pior caso monitorado. ' +
        'Embora parte das curvas tenha apresentado aproximação ao setpoint, o ponto mais crítico identificado foi ' + (piorSensorTemperatura ? piorSensorTemperatura.sensor : 'N/A') + ', indicando que a distribuição térmica na janela de exposição não foi plenamente satisfatória para sustentar a aprovação do ciclo.'
      : (statusAprovacao === 'APROVADO_COM_ALERTA'
          ? 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\n' +
            'O mapeamento térmico considerando exclusivamente os sensores ativos evidencia estabilidade operacional durante a janela de exposição, porém com margem reduzida no pior caso monitorado. ' +
            'O pior sensor térmico identificado foi ' + (piorSensorTemperatura ? piorSensorTemperatura.sensor : 'N/A') + '. A distribuição térmica foi suficiente para atendimento do limite operacional configurado, recomendando-se acompanhamento reforçado nas próximas execuções.'
          : 'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):\n\n' +
            'O mapeamento térmico considerando exclusivamente os sensores ativos evidencia estabilidade e homogeneidade do calor no interior da câmara. ' +
            'A convergência das curvas durante o platô térmico indica distribuição consistente da energia térmica e ausência de desvios críticos impeditivos entre os pontos válidos monitorados. ' +
            'O pior sensor térmico identificado foi ' + (piorSensorTemperatura ? piorSensorTemperatura.sensor : 'N/A') + ', ainda assim compatível com a manutenção das condições térmicas exigidas para o processo analisado.');

  shTemp.getRange('A27:O34').merge();
  formatarTextoComNegrito(
    shTemp,
    'A27',
    periodoGrafico + txtTemp,
    [
      'PARECER TÉCNICO (DISTRIBUIÇÃO TÉRMICA):',
      piorSensorTemperatura ? piorSensorTemperatura.sensor : '',
      'sensores ativos',
      'janela de exposição',
      'estabilidade e homogeneidade',
      'margem reduzida',
      'aprovação do ciclo'
    ],
    statusAprovacao === 'REPROVADO' ? corStatus : null,
    11
  );

  // ==========================================================
  // ABA 6: PRESSÃO / PRÉ-VÁCUO
  // ==========================================================
  tituloPagina(shPres, 'COMPORTAMENTO TERMOBAROMÉTRICO E IDENTIFICAÇÃO DO PRÉ-VÁCUO');

  const chartPres = shPres.newChart()
    .asLineChart()
    .addRange(shAuxGrafico.getRange(1, 1, tabelaGrafico.length, 1))
    .addRange(shAuxGrafico.getRange(1, tabelaGrafico[0].length, tabelaGrafico.length, 1))
    .setTitle('GRÁFICO DE PRESSÃO ABSOLUTA / VÁCUO')
    .setXAxisTitle('TEMPO DECORRIDO (MIN)')
    .setYAxisTitle('PRESSÃO ABSOLUTA (BAR ABS)')
    .setNumHeaders(1)
    .setOption('width', 1120)
    .setOption('height', 500)
    .setOption('series', { 0: { color: corAzulVacuo, lineWidth: 2 } })
    .setOption('chartArea', { left: '8%', top: '12%', width: '85%', height: '72%' })
    .setOption('hAxis', {
      slantedText: true,
      slantedTextAngle: 45,
      textStyle: { fontSize: 8 }
    })
    .setPosition(3, 1, 0, 0)
    .build();

  shPres.insertChart(chartPres);

  const txtPres = 'PARECER T\u00c9CNICO (DIN\u00c2MICA BAROM\u00c9TRICA E V\u00c1CUO):\n\n' + periodoGrafico + AutoRel_textoDiagnosticoPreVacuoGraficos_(analise);

  shPres.getRange('A27:O34').merge();
  formatarTextoComNegrito(
    shPres,
    'A27',
    txtPres,
    [
      'PARECER TÉCNICO (DINÂMICA BAROMÉTRICA E VÁCUO):',
      'gases não condensáveis',
      'vácuo',
      'margem operacional reduzida',
      'pior caso monitorado'
    ],
    statusAprovacao === 'REPROVADO' ? corStatus : null,
    11
  );

  // ==========================================================
  // ABA 7: LETALIDADE F0
  // ==========================================================
  tituloPagina(shF0, 'INDICADOR DE LETALIDADE TÉRMICA ACUMULADA (VALOR F0)');

  const dadosF0 = montarTabelaF0Ativos_();
  shF0.getRange(1, 20, dadosF0.length, 2).setValues(dadosF0);
  shF0.hideColumns(20, 2);

  if (dadosF0.length > 1) {
    const chartF0 = shF0.newChart()
      .asColumnChart()
      .addRange(shF0.getRange(1, 20, dadosF0.length, 2))
      .setTitle('LETALIDADE ACUMULADA POR SENSOR ATIVO')
      .setXAxisTitle('SENSORES DE MONITORAMENTO')
      .setYAxisTitle('F0 ACUMULADO (MINUTOS)')
      .setNumHeaders(1)
      .setOption('width', 1120)
      .setOption('height', 500)
      .setOption('series', { 0: { color: corVerdeMetro } })
      .setOption('chartArea', { left: '8%', top: '12%', width: '85%', height: '72%' })
      .setPosition(3, 1, 0, 0)
      .build();

    shF0.insertChart(chartF0);
  }

  const txtF0 =
    statusAprovacao === 'REPROVADO'
      ? 'PARECER TÉCNICO (VALOR DE LETALIDADE TÉRMICA):\n\n' +
        'O indicador F0 representa a integração do tempo e temperatura na janela válida de exposição para os sensores ativos considerados na análise. ' +
        'O valor médio obtido foi de ' + mediaF0.toFixed(2) + ' min, com pior caso de ' + minF0.toFixed(2) + ' min e melhor caso de ' + maxF0.toFixed(2) + ' min. ' +
        'O pior sensor ativo (' + (piorSensorF0 ? piorSensorF0.sensor : 'N/A') + ') não atingiu o F0 mínimo normativo de ' + limiteAprovacaoF0.toFixed(2) + ' min, motivo pelo qual o ciclo foi classificado como reprovado.'
      : (statusAprovacao === 'APROVADO_COM_ALERTA'
          ? 'PARECER TÉCNICO (VALOR DE LETALIDADE TÉRMICA):\n\n' +
            'O indicador F0 representa a integração do tempo e temperatura na janela válida de exposição para os sensores ativos considerados na análise. ' +
            'O valor médio obtido foi de ' + mediaF0.toFixed(2) + ' min, com pior caso de ' + minF0.toFixed(2) + ' min e melhor caso de ' + maxF0.toFixed(2) + ' min. ' +
            'O pior sensor ativo (' + (piorSensorF0 ? piorSensorF0.sensor : 'N/A') + ') atendeu ao F0 mínimo normativo de ' + limiteAprovacaoF0.toFixed(2) + ' min, porém permaneceu abaixo do valor normativo estrito de ' + f0MinNormativo.toFixed(2) + ' min, justificando aprovação com alerta.'
          : 'PARECER TÉCNICO (VALOR DE LETALIDADE TÉRMICA):\n\n' +
            'O indicador F0 representa a integração do tempo e temperatura na janela válida de exposição para os sensores ativos considerados na análise. ' +
            'O valor médio obtido foi de ' + mediaF0.toFixed(2) + ' min, com pior caso de ' + minF0.toFixed(2) + ' min e melhor caso de ' + maxF0.toFixed(2) + ' min. ' +
            'Como o pior sensor ativo (' + (piorSensorF0 ? piorSensorF0.sensor : 'N/A') + ') atendeu ao critério configurado, conclui-se que a letalidade térmica foi suficiente para aprovação do ciclo.');

  shF0.getRange('A27:O35').merge();
  formatarTextoComNegrito(
    shF0,
    'A27',
    txtF0,
    [
      'PARECER TÉCNICO (VALOR DE LETALIDADE TÉRMICA):',
      mediaF0.toFixed(2) + ' min',
      minF0.toFixed(2) + ' min',
      maxF0.toFixed(2) + ' min',
      piorSensorF0 ? piorSensorF0.sensor : '',
      limiteAprovacaoF0.toFixed(2) + ' min',
      f0MinNormativo.toFixed(2) + ' min',
      'aprovação com alerta',
      'reprovado'
    ],
    statusAprovacao !== 'APROVADO' ? corStatus : null,
    11
  );

  // ==========================================================
  // ABA 8: CONCLUSÃO PRESSÃO / SÍNTESE FINAL
  // ==========================================================
  tituloPagina(shPresConc, 'SÍNTESE CONCLUSIVA DA ANÁLISE BAROMÉTRICA');

  const dadosIndicadores = [
    ['Indicador', 'Valor'],
    ['Pressão mínima', pressMin],
    ['Pressão média', pressMed],
    ['Pressão máxima', pressMax],
    ['Amplitude barométrica', amplitudePress]
  ];

  shPresConc.getRange(1, 20, dadosIndicadores.length, 2).setValues(dadosIndicadores);
  shPresConc.hideColumns(20, 2);

  const chartPresConc = shPresConc.newChart()
    .asColumnChart()
    .addRange(shPresConc.getRange(1, 20, dadosIndicadores.length, 2))
    .setTitle('INDICADORES BAROMÉTRICOS DO PROCESSO')
    .setXAxisTitle('PARÂMETROS DE PRESSÃO')
    .setYAxisTitle('PRESSÃO (BAR ABS)')
    .setNumHeaders(1)
    .setOption('width', 1120)
    .setOption('height', 430)
    .setOption('series', { 0: { color: corAzulVacuo } })
    .setOption('legend', { position: 'none' })
    .setOption('chartArea', { left: '8%', top: '12%', width: '85%', height: '68%' })
    .setPosition(3, 1, 0, 0)
    .build();

  shPresConc.insertChart(chartPresConc);

  const resumoSensores =
    'Sensores ativos considerados: ' +
    (sensoresUtilizados.length ? sensoresUtilizados.join(', ') : 'Nenhum') + '. ' +
    'Sensores desabilitados: ' +
    (sensoresDesabilitados.length ? sensoresDesabilitados.join(', ') : 'Nenhum') + '. ';

  const blocoMotivos =
    statusAprovacao === 'REPROVADO'
      ? ('Motivos determinantes da reprovação: ' + textoListaGraficos_(motivosReprovacao, 'Não informados.'))
      : (statusAprovacao === 'APROVADO_COM_ALERTA'
          ? ('Alertas técnicos relevantes: ' + textoListaGraficos_(alertasAnalise, 'Nenhum alerta registrado.'))
          : 'Todos os critérios configurados para os sensores ativos foram atendidos.');

  const blocoObservacoes = observacoesAnalise.length
    ? (' Observações complementares: ' + textoListaGraficos_(observacoesAnalise, ''))
    : '';

  const txtConclusaoPress =
    'PARECER TÉCNICO CONSOLIDADO (PRESSÃO / VÁCUO / INTEGRIDADE BAROMÉTRICA):\n\n' +
    periodoGrafico + resumoSensores + AutoRel_textoDiagnosticoPreVacuoGraficos_(analise) + ' ' +
    'A consolidação dos indicadores barométricos demonstra que o processo apresentou pressão mínima de ' + fmtBarAbs_(pressMin) +
    ', pressão média de ' + fmtBarAbs_(pressMed) +
    ', pressão máxima de ' + fmtBarAbs_(pressMax) +
    ' e amplitude total de ' + fmtBarAbs_(amplitudePress) + '. ' +
    'Considerando o tempo total de ' + tempoTotal.toFixed(1) +
    ' min, o tempo efetivo de exposição de ' + tempoExp.toFixed(1) +
    ' min e o delta médio entre leituras de ' + deltaMin.toFixed(3) +
    ' min, a dinâmica observada foi correlacionada com a resposta térmica e com o pior caso de letalidade do sensor ' +
    (piorSensorF0 ? piorSensorF0.sensor : 'N/A') + '. ' +
    'Temperatura mínima de exposição observada: ' + fmtTemp_(exposicaoTemp.min) +
    '. Temperatura média de exposição: ' + fmtTemp_(exposicaoTemp.media) +
    '. Temperatura máxima de exposição: ' + fmtTemp_(exposicaoTemp.max) + '. ' +
    'Temperatura média global do ciclo: ' + fmtTemp_(globalTemp.media) + '. ' +
    'F0 normativo de referência: ' + fmtMin_(f0MinNormativo) +
    '. Critério de aprovação: F0 igual ou acima do mínimo normativo em todos os sensores ativos. ' +
    blocoMotivos + blocoObservacoes + ' ' +
    'Pelos critérios térmicos e de letalidade configurados, o ciclo é classificado como ' +
    statusLongo_() + '.';

  shPresConc.getRange('A24:O35').merge();
  formatarTextoComNegrito(
    shPresConc,
    'A24',
    txtConclusaoPress,
    [
      'PARECER TÉCNICO CONSOLIDADO (PRESSÃO / VÁCUO / INTEGRIDADE BAROMÉTRICA):',
      fmtBarAbs_(pressMin),
      fmtBarAbs_(pressMed),
      fmtBarAbs_(pressMax),
      fmtBarAbs_(amplitudePress),
      tempoTotal.toFixed(1) + ' min',
      tempoExp.toFixed(1) + ' min',
      deltaMin.toFixed(3) + ' min',
      piorSensorF0 ? piorSensorF0.sensor : '',
      fmtTemp_(exposicaoTemp.min),
      fmtTemp_(exposicaoTemp.media),
      fmtTemp_(exposicaoTemp.max),
      fmtTemp_(globalTemp.media),
      fmtMin_(f0MinNormativo),
      fmtMin_(f0MinOperacional),
      fmtMin_(toleranciaF0),
      fmtMin_(limiteAprovacaoF0),
      'Sensores ativos considerados:',
      'Sensores desabilitados:',
      statusLongo_()
    ],
    corStatus,
    10
  );

  for (let r = 24; r <= 35; r++) {
    shPresConc.setRowHeight(r, 20);
  }

  SpreadsheetApp.flush();
}

// ------------------------------------------------------------
// GRÁFICOS DO LEAK TEST / TESTE DE ESTANQUEIDADE
//
// Reaproveita os helpers de módulo já existentes (AutoRel_recriarAbaGrafico_,
// AutoRel_excluirAbaSeExistir_, AutoRel_limparAbaGrafico_, AutoRel_aplicarLayoutA4PaisagemGrafico_,
// AutoRel_numGraf_). Não altera AutoRel_gerarGraficosAuditoria nem nenhuma outra função
// existente.
// ------------------------------------------------------------
function AutoRel_gerarGraficosLeakTest_(ss, analiseLeak, nSensores) {
  if (!ss) return;

  analiseLeak = analiseLeak || {};

  const shDados = ss.getSheetByName('5. DADOS BRUTOS');
  if (!shDados) return;

  const dadosIniciais = 2;
  const ultimaLinha = shDados.getLastRow();
  if (ultimaLinha < dadosIniciais) return;

  const totalLinhas = ultimaLinha - dadosIniciais + 1;
  if (totalLinhas <= 1) return;

  nSensores = Number(analiseLeak.quantidadeSensoresInstalados) || Number(nSensores) || 12;

  const corChumbo = '#374151';
  const corAzulVacuo = '#0b4ea2';
  const corTexto = '#374151';

  const statusAprovacao = String(analiseLeak.statusAprovacao || (analiseLeak.aprovado ? 'APROVADO' : 'REPROVADO')).toUpperCase();
  const corStatus = statusAprovacao === 'REPROVADO' ? '#dc2626' : '#059669';

  // ------------------------------------------------------------
  // LAYOUT EM SEÇÕES DAS ABAS DE GRÁFICO DO LEAK TEST
  //
  // Cada aba segue sempre: TÍTULO -> GRÁFICO (altura reservada
  // de verdade nas linhas por baixo dele) -> PARECER TÉCNICO.
  // O gráfico é uma imagem flutuante (não encolhe/cresce com a
  // altura da linha), então a área de linhas reservada para ele
  // (LINHA_GRAFICO_INICIO..LINHA_GRAFICO_FIM) precisa somar pelo
  // menos ALTURA_GRAFICO_PX, senão o texto da seção seguinte
  // começa antes do gráfico terminar e fica renderizado por trás
  // dele. A soma total (título + gráfico + texto) fica dentro de
  // uma única página A4 paisagem para não sobrar página em branco.
  // ------------------------------------------------------------
  const ALTURA_GRAFICO_PX = 420;
  const LINHA_GRAFICO_INICIO = 3;
  const LINHA_GRAFICO_FIM = 23; // 21 linhas x 20px = 420px = ALTURA_GRAFICO_PX
  const LINHA_TEXTO_INICIO = 25; // 1 linha de respiro após o gráfico (linha 24)
  const LINHA_TEXTO_FIM = 35; // 11 linhas x 20px = 220px para o parecer técnico
  const RANGE_TEXTO_SECAO = 'A' + LINHA_TEXTO_INICIO + ':O' + LINHA_TEXTO_FIM;

  function configurarSecoesGraficoLeakTest_(sheet) {
    for (let r = LINHA_GRAFICO_INICIO; r <= LINHA_TEXTO_FIM; r++) {
      sheet.setRowHeight(r, 20);
    }
  }

  AutoRel_recriarAbaGrafico_(ss, '6. GRÁF. CICLO COMPLETO (VÁCUO)', 5);
  AutoRel_recriarAbaGrafico_(ss, '7. GRÁF. PRESSÃO ABSOLUTA (INTERVALO DO LEAK TEST)', 6);
  AutoRel_recriarAbaGrafico_(ss, '8. GRÁF. TEMPERATURA (ACOMPANHAMENTO)', 7);

  const shCiclo = ss.getSheetByName('6. GRÁF. CICLO COMPLETO (VÁCUO)');
  const shPres = ss.getSheetByName('7. GRÁF. PRESSÃO ABSOLUTA (INTERVALO DO LEAK TEST)');
  const shTemp = ss.getSheetByName('8. GRÁF. TEMPERATURA (ACOMPANHAMENTO)');

  [shCiclo, shPres, shTemp].forEach(function(sh) {
    if (!sh) return;
    sh.setHiddenGridlines(true);
    AutoRel_aplicarLayoutA4PaisagemGrafico_(sh);
    AutoRel_limparAbaGrafico_(sh);
    configurarSecoesGraficoLeakTest_(sh);
  });

  const colPressao = nSensores + 2;
  const colVacuoRelativo = nSensores + 3;

  const registroTermico = analiseLeak.registroTermico || { porSensor: [], global: {} };
  const sensoresAtivosFlags = Array.isArray(registroTermico.porSensor)
    ? registroTermico.porSensor.map(function(s) { return !!s.ativo; })
    : Array.from({ length: nSensores }, function() { return true; });

  const pressaoInicioMbar = AutoRel_numGraf_(analiseLeak.pressaoInicioMbar);
  const pressaoFimMbar = AutoRel_numGraf_(analiseLeak.pressaoFimMbar);
  const deltaPressaoMbar = AutoRel_numGraf_(analiseLeak.deltaPressaoMbar);
  const taxaVazamento = AutoRel_numGraf_(analiseLeak.taxaVazamentoMbarMin);
  const limiteTaxa = AutoRel_numGraf_(analiseLeak.limiteTaxaVazamentoMbarMin);
  const tempoDecorrido = AutoRel_numGraf_(analiseLeak.tempoDecorridoMinutos);

  function fmtMbar_(v) {
    return AutoRel_numGraf_(v).toFixed(3) + ' mbar';
  }

  function fmtTaxa_(v) {
    return AutoRel_numGraf_(v).toFixed(4) + ' mbar/min';
  }

  function fmtMin_(v) {
    return AutoRel_numGraf_(v).toFixed(2) + ' min';
  }

  function statusLongo_() {
    return statusAprovacao === 'REPROVADO' ? 'REPROVADO' : 'APROVADO';
  }

  function tituloPagina(sheet, texto) {
    sheet.getRange('A1:O2').merge()
      .setValue(String(texto || '').toUpperCase())
      .setBackground(corChumbo)
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(14)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
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
      termo = String(termo || '');
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
      ['APROVADO', 'REPROVADO', 'APROVADO.', 'REPROVADO.'].forEach(function(palavra) {
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

    sheet.getRange(rangeA1)
      .setRichTextValue(rtv.build())
      .setWrap(true)
      .setVerticalAlignment('top')
      .setHorizontalAlignment('left')
      .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function montarListaColunasSensoresAtivos_() {
    const cols = [];
    for (let s = 0; s < nSensores; s++) {
      if (sensoresAtivosFlags[s]) cols.push(2 + s);
    }
    return cols;
  }

  const colsSensoresAtivos = montarListaColunasSensoresAtivos_();

  // ==========================================================
  // ABA 6: CICLO COMPLETO (ATMOSFERA → VÁCUO → MANUTENÇÃO → RETORNO)
  //
  // Mostra o registro INTEIRO do datalogger (não só o intervalo
  // avaliado no Leak Test) como Vácuo Relativo à pressão
  // atmosférica (0 = atmosfera). O trecho usado no cálculo da
  // taxa de vazamento aparece destacado em linha mais grossa.
  // ==========================================================
  const refAtmMbar = AutoRel_numGraf_((AutoRel_UCFG.LEAK_TEST && AutoRel_UCFG.LEAK_TEST.referenciaAtmosfericaMbar) || 1013.25);
  const contextoRegistro = analiseLeak.contextoRegistro || { temRampaAntes: false, temRampaDepois: false, temRegistroCompleto: false };

  const tituloPaginaCiclo = contextoRegistro.temRegistroCompleto
    ? 'CICLO COMPLETO DO ENSAIO - REFERÊNCIA: PRESSÃO ATMOSFÉRICA'
    : 'COMPORTAMENTO DO VÁCUO RELATIVO NO INTERVALO REGISTRADO';

  const tituloGraficoCiclo = contextoRegistro.temRegistroCompleto
    ? 'VÁCUO RELATIVO AO LONGO DO ENSAIO (0 = PRESSÃO ATMOSFÉRICA)'
    : 'VÁCUO RELATIVO NO INTERVALO REGISTRADO (0 = PRESSÃO ATMOSFÉRICA)';

  tituloPagina(shCiclo, tituloPaginaCiclo);

  const temposCol = shDados.getRange(dadosIniciais, 1, totalLinhas, 1).getValues();
  const minutosCiclo = AutoRel_minutosDecorridosGraficos_(temposCol.map(function(r) { return r[0]; }));
  const vacuoRelativoCol = shDados.getRange(dadosIniciais, colVacuoRelativo, totalLinhas, 1).getValues();

  const idxInicioLeak = Math.round(AutoRel_numGraf_(analiseLeak.indiceInicio));
  const idxFimLeak = Math.round(AutoRel_numGraf_(analiseLeak.indiceFim));

  const tabelaCiclo = [['Tempo', 'Vácuo Relativo (mbar)', 'Intervalo do Leak Test', 'Atmosfera (referência)']];
  for (let i = 0; i < vacuoRelativoCol.length; i++) {
    const vBruto = vacuoRelativoCol[i][0];
    const vNum = (vBruto === '' || vBruto === null || vBruto === undefined) ? null : AutoRel_numGraf_(vBruto);
    const destaque = (i >= idxInicioLeak && i <= idxFimLeak) ? vNum : null;
    tabelaCiclo.push([minutosCiclo[i], vNum, destaque, 0]);
  }

  // Tabela-fonte do gráfico fica numa aba auxiliar OCULTA (Sheet.hideSheet()),
  // não em colunas ocultas da própria aba visível: abas ocultas são excluídas
  // da exportação em PDF, então esta tabela (que pode ter muito mais linhas
  // que o conteúdo visível) nunca gera página extra em branco no laudo.
  AutoRel_recriarAbaGrafico_(ss, '_AUX_CICLO_LEAKTEST', 8);
  const shAuxCiclo = ss.getSheetByName('_AUX_CICLO_LEAKTEST');
  AutoRel_garantirGradeFonteGraficos_(shAuxCiclo, tabelaCiclo.length, 4);
  shAuxCiclo.getRange(1, 1, tabelaCiclo.length, 4).setValues(tabelaCiclo);
  shAuxCiclo.hideSheet();

  const chartCiclo = shCiclo.newChart()
    .asLineChart()
    .addRange(shAuxCiclo.getRange(1, 1, tabelaCiclo.length, 4))
    .setTitle(tituloGraficoCiclo)
    .setXAxisTitle('TEMPO DECORRIDO (MIN)')
    .setYAxisTitle('VÁCUO RELATIVO (MBAR) — 0 = ATMOSFERA')
    .setNumHeaders(1)
    .setOption('width', 1170)
    .setOption('height', ALTURA_GRAFICO_PX)
    .setOption('series', {
      0: { color: '#94a3b8', lineWidth: 1 },
      1: { color: corAzulVacuo, lineWidth: 3 },
      2: { color: '#9ca3af', lineWidth: 1, lineDashStyle: [4, 4] }
    })
    .setOption('legend', { position: 'top', textStyle: { fontSize: 9 }, alignment: 'center' })
    .setOption('chartArea', { left: '11%', top: '22%', width: '84%', height: '60%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } })
    .setOption('vAxis', { textStyle: { fontSize: 8 }, format: '#,##0' })
    .setPosition(LINHA_GRAFICO_INICIO, 1, 0, 0)
    .build();

  shCiclo.insertChart(chartCiclo);

  const tempoRegistroInicio = AutoRel_valorSeguroGraficos_(temposCol[0] && temposCol[0][0]);
  const tempoRegistroFim = AutoRel_valorSeguroGraficos_(temposCol[temposCol.length - 1] && temposCol[temposCol.length - 1][0]);

  const txtCiclo = contextoRegistro.temRegistroCompleto
    ? ('PARECER TÉCNICO (CICLO COMPLETO DO ENSAIO):\n\n' +
      'O gráfico acima representa o comportamento completo do ensaio em relação à pressão atmosférica, adotada como referência (' +
      refAtmMbar.toFixed(2) + ' mbar = 0 no eixo, linha tracejada). A curva evidencia a rampa de formação do vácuo (queda em relação à atmosfera), ' +
      'o período de manutenção do vácuo utilizado para o cálculo da taxa de vazamento — destacado em linha mais grossa, entre ' +
      AutoRel_valorSeguroGraficos_(analiseLeak.tempoInicioLeakTest) + ' e ' + AutoRel_valorSeguroGraficos_(analiseLeak.tempoFimLeakTest) +
      ' — e a rampa de retorno/despressurização até a condição atmosférica ao final do registro.\n\n' +
      'Registro completo do datalogger: de ' + tempoRegistroInicio + ' a ' + tempoRegistroFim + '. ' +
      'As temperaturas dos sensores não são exibidas neste gráfico; elas aparecem apenas na aba de acompanhamento térmico, como registro complementar.')
    : ('PARECER TÉCNICO (COMPORTAMENTO DO VÁCUO RELATIVO):\n\n' +
      'O registro do datalogger disponível para este ensaio contém apenas o intervalo monitorado do Leak Test, sem leituras suficientes antes ou depois dessa janela para caracterizar a rampa de formação do vácuo ou o retorno à condição atmosférica. ' +
      'O gráfico acima representa esse intervalo em relação à pressão atmosférica, adotada como referência (' +
      refAtmMbar.toFixed(2) + ' mbar = 0 no eixo, linha tracejada), com destaque em linha mais grossa para o trecho utilizado no cálculo da taxa de vazamento, entre ' +
      AutoRel_valorSeguroGraficos_(analiseLeak.tempoInicioLeakTest) + ' e ' + AutoRel_valorSeguroGraficos_(analiseLeak.tempoFimLeakTest) + '.\n\n' +
      'Registro disponível: de ' + tempoRegistroInicio + ' a ' + tempoRegistroFim + '. ' +
      'As temperaturas dos sensores não são exibidas neste gráfico; elas aparecem apenas na aba de acompanhamento térmico, como registro complementar.');

  shCiclo.getRange(RANGE_TEXTO_SECAO).merge();
  formatarTextoComNegrito(
    shCiclo,
    'A' + LINHA_TEXTO_INICIO,
    txtCiclo,
    [
      'PARECER TÉCNICO (CICLO COMPLETO DO ENSAIO):',
      'PARECER TÉCNICO (COMPORTAMENTO DO VÁCUO RELATIVO):',
      refAtmMbar.toFixed(2) + ' mbar',
      tempoRegistroInicio,
      tempoRegistroFim
    ],
    null,
    11
  );

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shCiclo, LINHA_TEXTO_FIM, 15);

  // ==========================================================
  // ABA 7: PRESSÃO ABSOLUTA DA CÂMARA (INTERVALO DO LEAK TEST)
  // ==========================================================
  tituloPagina(shPres, 'PRESSÃO ABSOLUTA DA CÂMARA - INTERVALO AVALIADO NO LEAK TEST');

  // Gráfico técnico principal: mostra SÓ o intervalo usado no cálculo
  // (não o registro inteiro do datalogger), com marcadores de P1/P2 e
  // o resultado (ΔP, taxa) já no próprio título do gráfico.
  const idxInicioPres = Math.round(AutoRel_numGraf_(analiseLeak.indiceInicio));
  const idxFimPres = Math.round(AutoRel_numGraf_(analiseLeak.indiceFim));
  const linhaInicioJanela = dadosIniciais + idxInicioPres;
  const totalLinhasJanela = idxFimPres - idxInicioPres + 1;

  const temposJanela = shDados.getRange(linhaInicioJanela, 1, totalLinhasJanela, 1).getValues();
  const minutosJanela = AutoRel_minutosDecorridosGraficos_(temposJanela.map(function(r) { return r[0]; }));
  const pressoesJanela = shDados.getRange(linhaInicioJanela, colPressao, totalLinhasJanela, 1).getValues();

  const tabelaPres = [['Tempo', 'Pressão Absoluta da Câmara', 'P1 (início)', 'P2 (fim)']];
  for (let i = 0; i < temposJanela.length; i++) {
    const pBruto = pressoesJanela[i][0];
    const pNum = (pBruto === '' || pBruto === null || pBruto === undefined) ? null : AutoRel_numGraf_(pBruto);
    const marcadorP1 = (i === 0) ? pNum : null;
    const marcadorP2 = (i === temposJanela.length - 1) ? pNum : null;
    tabelaPres.push([minutosJanela[i], pNum, marcadorP1, marcadorP2]);
  }

  AutoRel_recriarAbaGrafico_(ss, '_AUX_PRESSAO_LEAKTEST', 9);
  const shAuxPres = ss.getSheetByName('_AUX_PRESSAO_LEAKTEST');
  AutoRel_garantirGradeFonteGraficos_(shAuxPres, tabelaPres.length, 4);
  shAuxPres.getRange(1, 1, tabelaPres.length, 4).setValues(tabelaPres);
  shAuxPres.hideSheet();

  const tituloGraficoPres = 'PRESSÃO ABSOLUTA DA CÂMARA — ΔP = ' + fmtMbar_(deltaPressaoMbar) + ' | TAXA = ' + fmtTaxa_(taxaVazamento);

  const chartPres = shPres.newChart()
    .asLineChart()
    .addRange(shAuxPres.getRange(1, 1, tabelaPres.length, 4))
    .setTitle(tituloGraficoPres)
    .setXAxisTitle('TEMPO DECORRIDO (MIN)')
    .setYAxisTitle('PRESSÃO ABSOLUTA DA CÂMARA (' + (String(analiseLeak.unidadePressaoOriginal || 'MBAR')) + ')')
    .setNumHeaders(1)
    .setOption('width', 1170)
    .setOption('height', ALTURA_GRAFICO_PX)
    .setOption('series', {
      0: { color: corAzulVacuo, lineWidth: 2 },
      1: { color: '#059669', lineWidth: 0, pointsVisible: true, pointSize: 9 },
      2: { color: '#dc2626', lineWidth: 0, pointsVisible: true, pointSize: 9 }
    })
    .setOption('legend', { position: 'top', textStyle: { fontSize: 9 }, alignment: 'center' })
    .setOption('chartArea', { left: '11%', top: '22%', width: '84%', height: '60%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } })
    .setOption('vAxis', { textStyle: { fontSize: 8 }, format: '#,##0' })
    .setPosition(LINHA_GRAFICO_INICIO, 1, 0, 0)
    .build();

  shPres.insertChart(chartPres);

  const txtPres =
    'PARECER TÉCNICO (PRESSÃO ABSOLUTA NO INTERVALO DO LEAK TEST):\n\n' +
    'Este gráfico apresenta a Pressão Absoluta da Câmara exclusivamente durante o intervalo selecionado para o cálculo do Leak Test, entre ' +
    AutoRel_valorSeguroGraficos_(analiseLeak.tempoInicioLeakTest) + ' e ' + AutoRel_valorSeguroGraficos_(analiseLeak.tempoFimLeakTest) +
    ', totalizando ' + fmtMin_(tempoDecorrido) + ' de observação (marcador verde = P1, início; marcador vermelho = P2, fim). ' +
    'A Pressão Absoluta inicial registrada (P1) foi de ' + fmtMbar_(pressaoInicioMbar) + ' e a final (P2) foi de ' + fmtMbar_(pressaoFimMbar) +
    ', resultando em variação (ΔP) de ' + fmtMbar_(deltaPressaoMbar) + '. ' +
    'A taxa de vazamento calculada foi de ' + fmtTaxa_(taxaVazamento) + ', frente ao limite de referência de ' + fmtTaxa_(limiteTaxa) + '. ' +
    (statusAprovacao === 'REPROVADO'
      ? 'A taxa obtida superou o limite de referência, indicando perda de estanqueidade da câmara incompatível com o critério técnico adotado, motivo pelo qual o ensaio foi classificado como REPROVADO.'
      : 'A taxa obtida manteve-se dentro do limite de referência, evidenciando estanqueidade adequada da câmara durante o período avaliado, motivo pelo qual o ensaio foi classificado como APROVADO.') +
    '\n\nEsta avaliação considera exclusivamente a Pressão Absoluta da Câmara neste intervalo, sem interferência das temperaturas dos sensores. ' +
    'Para o comportamento completo do ensaio (rampa de vácuo, manutenção e retorno à atmosfera), consulte a aba "6. GRÁF. CICLO COMPLETO (VÁCUO)".';

  shPres.getRange(RANGE_TEXTO_SECAO).merge();
  formatarTextoComNegrito(
    shPres,
    'A' + LINHA_TEXTO_INICIO,
    txtPres,
    [
      'PARECER TÉCNICO (PRESSÃO ABSOLUTA NO INTERVALO DO LEAK TEST):',
      'P1',
      'P2',
      fmtMin_(tempoDecorrido),
      fmtMbar_(pressaoInicioMbar),
      fmtMbar_(pressaoFimMbar),
      fmtMbar_(deltaPressaoMbar),
      fmtTaxa_(taxaVazamento),
      fmtTaxa_(limiteTaxa),
      'REPROVADO',
      'APROVADO'
    ],
    corStatus,
    11
  );

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shPres, LINHA_TEXTO_FIM, 15);

  // ==========================================================
  // ABA 8: TEMPERATURA (ACOMPANHAMENTO)
  // ==========================================================
  tituloPagina(shTemp, 'ACOMPANHAMENTO TÉRMICO COMPLEMENTAR (SOMENTE REGISTRO)');

  // Identidade visual própria (diferente das abas 6 e 7, que usam linha
  // reta/técnica): curvas suavizadas, paleta em tons pastel e uma linha
  // tracejada de média em destaque, deixando claro que esta aba tem
  // finalidade só documental (não entra no critério de aprovação).
  const global = registroTermico.global || {};
  const mediaGlobalTemp = AutoRel_numGraf_(global.media);

  const cabecalhoTemp = ['Tempo'];
  for (let s = 0; s < nSensores; s++) {
    if (sensoresAtivosFlags[s]) cabecalhoTemp.push('S' + (s + 1) + ' (°C)');
  }
  cabecalhoTemp.push('Média global (°C)');

  const valoresSensoresJanela = colsSensoresAtivos.map(function(colIdx) {
    return shDados.getRange(linhaInicioJanela, colIdx, totalLinhasJanela, 1).getValues();
  });

  const tabelaTemp = [cabecalhoTemp];
  for (let i = 0; i < temposJanela.length; i++) {
    const linhaTabela = [minutosJanela[i]];
    valoresSensoresJanela.forEach(function(colValores) {
      const v = colValores[i][0];
      linhaTabela.push((v === '' || v === null || v === undefined) ? null : AutoRel_numGraf_(v));
    });
    linhaTabela.push(mediaGlobalTemp);
    tabelaTemp.push(linhaTabela);
  }

  AutoRel_recriarAbaGrafico_(ss, '_AUX_TEMP_LEAKTEST', 10);
  const shAuxTemp = ss.getSheetByName('_AUX_TEMP_LEAKTEST');
  AutoRel_garantirGradeFonteGraficos_(shAuxTemp, tabelaTemp.length, cabecalhoTemp.length);
  shAuxTemp.getRange(1, 1, tabelaTemp.length, cabecalhoTemp.length).setValues(tabelaTemp);
  shAuxTemp.hideSheet();

  const paletaSuaveTemp = ['#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd', '#a5f3fc', '#fdba74', '#a7f3d0', '#f9a8d4', '#bef264'];
  const seriesTemp = {};
  for (let i = 0; i < colsSensoresAtivos.length; i++) {
    seriesTemp[i] = { color: paletaSuaveTemp[i % paletaSuaveTemp.length], lineWidth: 1 };
  }
  seriesTemp[colsSensoresAtivos.length] = { color: '#374151', lineWidth: 2, lineDashStyle: [6, 3] };

  const chartTemp = shTemp.newChart()
    .asLineChart()
    .addRange(shAuxTemp.getRange(1, 1, tabelaTemp.length, cabecalhoTemp.length))
    .setTitle('TEMPERATURA DOS SENSORES NO INTERVALO DO LEAK TEST (ACOMPANHAMENTO)')
    .setXAxisTitle('TEMPO DECORRIDO (MIN)')
    .setYAxisTitle('TEMPERATURA (°C)')
    .setNumHeaders(1)
    .setOption('width', 1170)
    .setOption('height', ALTURA_GRAFICO_PX)
    .setOption('curveType', 'function')
    .setOption('series', seriesTemp)
    .setOption('legend', { position: 'right', textStyle: { fontSize: 7 } })
    .setOption('chartArea', { left: '10%', top: '14%', width: '78%', height: '70%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } })
    .setOption('vAxis', { textStyle: { fontSize: 8 }, format: '#,##0' })
    .setPosition(LINHA_GRAFICO_INICIO, 1, 0, 0)
    .build();

  if (colsSensoresAtivos.length) {
    shTemp.insertChart(chartTemp);
  }

  const txtTemp =
    'REGISTRO TÉCNICO (NÃO INTERFERE NO RESULTADO):\n\n' +
    AutoRel_valorSeguroGraficos_(analiseLeak.textoDisclaimerTermico) +
    '\n\nDurante a janela do Leak Test, a faixa térmica registrada pelos sensores ativos foi de ' +
    AutoRel_numGraf_(global.min).toFixed(2) + ' °C (mínima) a ' + AutoRel_numGraf_(global.max).toFixed(2) +
    ' °C (máxima), com média de ' + AutoRel_numGraf_(global.media).toFixed(2) +
    ' °C (linha tracejada no gráfico), apresentada aqui exclusivamente como evidência documental do ensaio.';

  shTemp.getRange(RANGE_TEXTO_SECAO).merge();
  formatarTextoComNegrito(
    shTemp,
    'A' + LINHA_TEXTO_INICIO,
    txtTemp,
    [
      'REGISTRO TÉCNICO (NÃO INTERFERE NO RESULTADO):',
      'ACOMPANHAMENTO TÉRMICO COMPLEMENTAR:',
      AutoRel_numGraf_(global.min).toFixed(2) + ' °C',
      AutoRel_numGraf_(global.max).toFixed(2) + ' °C',
      AutoRel_numGraf_(global.media).toFixed(2) + ' °C'
    ],
    null,
    11
  );

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shTemp, LINHA_TEXTO_FIM, 15);

  SpreadsheetApp.flush();
}

function AutoRel_valorSeguroGraficos_(valor) {
  if (valor === null || valor === undefined) return '-';
  const s = String(valor).trim();
  return s || '-';
}

// ------------------------------------------------------------
// HELPER: normaliza quantidade de sensores
// ------------------------------------------------------------
function AutoRel_normalizarQuantidadeSensoresGraficos_(analise, nSensores, shDados) {
  const porAnalise = Number(analise && analise.quantidadeSensoresInstalados);
  if (isFinite(porAnalise) && porAnalise > 0) return Math.round(porAnalise);

  const porParametro = Number(nSensores);
  if (isFinite(porParametro) && porParametro > 0) return Math.round(porParametro);

  if (shDados) {
    const totalCols = shDados.getLastColumn();
    if (totalCols >= 4) {
      return Math.max(1, totalCols - 3);
    }
  }

  return 12;
}

// ------------------------------------------------------------
// HELPER: recria aba
// ------------------------------------------------------------
function AutoRel_recriarAbaGrafico_(ss, nomeAba, posicao) {
  const antiga = ss.getSheetByName(nomeAba);
  if (antiga) {
    ss.deleteSheet(antiga);
  }
  ss.insertSheet(nomeAba, posicao);
}

// ------------------------------------------------------------
// HELPER: exclui aba se existir
// ------------------------------------------------------------
function AutoRel_excluirAbaSeExistir_(ss, nomeAba) {
  const sh = ss.getSheetByName(nomeAba);
  if (sh) {
    ss.deleteSheet(sh);
  }
}

// ------------------------------------------------------------
// HELPER: limpa gráficos e formatações pesadas residuais
// ------------------------------------------------------------
function AutoRel_limparAbaGrafico_(sheet) {
  const charts = sheet.getCharts();
  charts.forEach(function(chart) {
    sheet.removeChart(chart);
  });

  sheet.getRange('A1:V60').clearContent();
  sheet.getRange('A1:V60').clearFormat();
  sheet.getRange('A1:V60').clearDataValidations();

  try {
    sheet.getRange('A1:V60').breakApart();
  } catch (e) {}
}

// ------------------------------------------------------------
// HELPER: layout A4 paisagem visual
// ------------------------------------------------------------
function AutoRel_aplicarLayoutA4PaisagemGrafico_(sheet) {
  for (let c = 1; c <= 15; c++) {
    sheet.setColumnWidth(c, 78);
  }

  for (let c = 20; c <= 22; c++) {
    sheet.setColumnWidth(c, 90);
  }

  sheet.setRowHeight(1, 24);
  sheet.setRowHeight(2, 24);

  for (let r = 3; r <= 60; r++) {
    sheet.setRowHeight(r, 22);
  }
}

// ------------------------------------------------------------
// HELPER: número seguro
// ------------------------------------------------------------
function AutoRel_numGraf_(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(',', '.').trim());
  return isFinite(n) ? n : 0;
}
// Conversao estrita apenas para representacao; preserva dados e resultados do motor.
function AutoRel_minutosDecorridosGraficos_(tempos) {
  function ms(v) {
    if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    const texto = String(v || '').trim();
    const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (m) return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]));
    const iso = texto.match(/^\d{4}-\d{2}-\d{2}T/);
    if (iso) return new Date(texto).getTime();
    throw new Error('Horario invalido na fonte do grafico: ' + texto);
  }
  const valores = tempos.map(ms);
  return valores.map(function(v, i) {
    if (!isFinite(v) || (i && v < valores[i - 1])) throw new Error('Horarios do grafico devem ser validos e sem regressao temporal.');
    return (v - valores[0]) / 60000;
  });
}
function AutoRel_garantirGradeFonteGraficos_(sheet, linhas, colunas) {
  const rows = sheet.getMaxRows();
  const cols = sheet.getMaxColumns();
  if (linhas > rows) sheet.insertRowsAfter(rows, linhas - rows);
  if (colunas > cols) sheet.insertColumnsAfter(cols, colunas - cols);
}
function AutoRel_textoDiagnosticoPreVacuoGraficos_(analise) {
  const fases = analise.fasesProcesso || {};
  const d = fases.diagnostico || {};
  const estado = String(d.status || d.aplicabilidade || 'INDETERMINADO').toUpperCase();
  const n = Number(d.contagemEvacuacoes);
  let texto;
  if (estado === 'NAO_APLICAVEL') texto = 'Pr\u00e9-v\u00e1cuo n\u00e3o aplic\u00e1vel ao modo de remo\u00e7\u00e3o de ar informado. ';
  else if (estado === 'DETECTADO') texto = 'Foram identificadas ' + (isFinite(n) ? n : Number(fases.resumo && fases.resumo.pulsosPreVacuo || 0)) + ' evacua\u00e7\u00e3o(\u00f5es) antes da exposi\u00e7\u00e3o. ';
  else if (estado === 'NAO_DETECTADO') texto = 'N\u00e3o foi identificada evacua\u00e7\u00e3o pr\u00e9via pelos crit\u00e9rios configurados. Esse resultado n\u00e3o comprova aus\u00eancia de bomba de v\u00e1cuo. ';
  else texto = 'A identifica\u00e7\u00e3o do pr\u00e9-v\u00e1cuo \u00e9 indeterminada com os dados e par\u00e2metros dispon\u00edveis. ';
  if (Array.isArray(d.limitacoes) && d.limitacoes.length) texto += 'Limita\u00e7\u00f5es: ' + d.limitacoes.join('; ') + '. ';
  return texto + 'O perfil de press\u00e3o e a contagem de evacua\u00e7\u00f5es n\u00e3o comprovam, isoladamente, efic\u00e1cia da remo\u00e7\u00e3o de ar, aus\u00eancia de gases n\u00e3o condens\u00e1veis ou integridade da c\u00e2mara.';
}
