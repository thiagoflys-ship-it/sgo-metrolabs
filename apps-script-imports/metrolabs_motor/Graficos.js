/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: Graficos.gs
 * VERSÃO REORGANIZADA — PDF + ANÁLISE INTELIGENTE
 * OBJETIVO:
 * - manter compatibilidade com o motor atual
 * - melhorar robustez da geração dos gráficos
 * - aceitar status APROVADO / APROVADO_COM_ALERTA / APROVADO_COM_RESSALVA / REPROVADO
 * - melhorar síntese gráfica para relatório técnico
 ****************************************************/

function gerarGraficosAuditoria(ss, analise) {
  if (!ss) return { ok:false, erro:'Planilha não informada para geração dos gráficos.' };

  analise = analise || {};

  const shDados = ss.getSheetByName('4. DADOS BRUTOS');
  if (!shDados) return { ok:false, erro:'Aba 4. DADOS BRUTOS não encontrada.' };

  const primeiraLinhaDados = 5;
  const ultimaLinha = shDados.getLastRow();
  
  // CORREÇÃO: Evitar retorno 'undefined' que quebra o motor principal
  if (ultimaLinha < primeiraLinhaDados) {
    return { ok: false, erro: 'Sem dados suficientes na aba DADOS BRUTOS.' };
  }

  const totalLinhas = ultimaLinha - primeiraLinhaDados + 1;
  // CORREÇÃO: Evitar retorno 'undefined' que quebra o motor principal
  if (totalLinhas < 2) {
    return { ok: false, erro: 'Quantidade insuficiente de linhas para gerar gráficos.' };
  }

  const nomesAbas = {
    pressao: '7. GRÁF. PRESSÃO',
    orvalho: '8. GRÁF. ORVALHO',
    sintese: '9. ANÁLISE GRÁFICA'
  };

  recriarAbaGraficoCentralAr_(ss, nomesAbas.pressao);
  recriarAbaGraficoCentralAr_(ss, nomesAbas.orvalho);
  recriarAbaGraficoCentralAr_(ss, nomesAbas.sintese);

  const shPressao = ss.getSheetByName(nomesAbas.pressao);
  const shOrvalho = ss.getSheetByName(nomesAbas.orvalho);
  const shSintese = ss.getSheetByName(nomesAbas.sintese);

  prepararAbaGraficoCentralAr_(shPressao);
  prepararAbaGraficoCentralAr_(shOrvalho);
  prepararAbaGraficoCentralAr_(shSintese);

  const status = normalizarStatusGraficoCentralAr_(analise.statusAprovacao, analise.aprovado);
  const corStatus = obterCorStatusGraficoCentralAr_(status);

  const metricas = analise.metricasAr || {};
  const pressao = metricas.pressao || {};
  const orvalho = metricas.orvalho || {};
  const comp = analise.comportamentoOperacional || {};

  preencherGraficoPressaoCentralAr_(shPressao, shDados, totalLinhas, status, corStatus, pressao, analise);
  preencherGraficoOrvalhoCentralAr_(shOrvalho, shDados, totalLinhas, status, corStatus, orvalho, analise);
  preencherSinteseGraficaCentralAr_(shSintese, status, corStatus, pressao, orvalho, comp, analise);

  SpreadsheetApp.flush();

  // CORREÇÃO: Retorno vital para a Main.gs saber que deu tudo certo e seguir para o PDF
  return { ok: true };
}

// ============================================================
// PREENCHIMENTO DAS ABAS
// ============================================================

function preencherGraficoPressaoCentralAr_(shPressao, shDados, totalLinhas, status, corStatus, pressao, analise) {
  cabecalhoGraficoCentralAr_(
    shPressao,
    'ANÁLISE GRÁFICA — PRESSÃO DA REDE',
    'COMPORTAMENTO TEMPORAL DA PRESSÃO DA REDE'
  );

  const chartPressao = shPressao.newChart()
    .asLineChart()
    .addRange(shDados.getRange(4, 1, totalLinhas + 1, 1))
    .addRange(shDados.getRange(4, 3, totalLinhas + 1, 1))
    .setNumHeaders(1)
    .setTitle('PRESSÃO DA REDE (bar)')
    .setXAxisTitle('TEMPO DE MONITORAMENTO')
    .setYAxisTitle('PRESSÃO (bar)')
    .setPosition(4, 1, 0, 0)
    .setOption('width', 1080)
    .setOption('height', 380)
    .setOption('legend', { position: 'bottom', textStyle: { fontSize: 9 } })
    .setOption('chartArea', { left: '10%', top: '18%', width: '80%', height: '55%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } })
    .setOption('vAxis', { textStyle: { fontSize: 9 } })
    .setOption('series', { 0: { lineWidth: 3, visibleInLegend: true } })
    .build();

  shPressao.insertChart(chartPressao);

  richTextGraficoCentralAr_(
    shPressao,
    'A22:M29',
    montarTextoPressaoCentralArV3_(status, pressao, analise),
    [
      'PARECER TÉCNICO — PRESSÃO DA REDE:',
      'estabilidade',
      'fora da faixa',
      'falhas',
      'recuperações',
      'ociosidade',
      'conformidade'
    ],
    corStatus,
    10
  );
}

function preencherGraficoOrvalhoCentralAr_(shOrvalho, shDados, totalLinhas, status, corStatus, orvalho, analise) {
  cabecalhoGraficoCentralAr_(
    shOrvalho,
    'ANÁLISE GRÁFICA — PONTO DE ORVALHO',
    'COMPORTAMENTO TEMPORAL DO PONTO DE ORVALHO'
  );

  // ESTILIZAÇÃO: Transformado em Gráfico de Área, na cor verde, preenchimento translúcido.
  const chartOrvalho = shOrvalho.newChart()
    .asAreaChart()
    .addRange(shDados.getRange(4, 1, totalLinhas + 1, 1))
    .addRange(shDados.getRange(4, 2, totalLinhas + 1, 1))
    .setNumHeaders(1)
    .setTitle('PONTO DE ORVALHO (°C)')
    .setXAxisTitle('TEMPO DE MONITORAMENTO')
    .setYAxisTitle('ORVALHO (°C)')
    .setPosition(4, 1, 0, 0)
    .setOption('width', 1080)
    .setOption('height', 380)
    .setOption('colors', ['#007b3e']) // Verde padrão Metrolabs para o Orvalho
    .setOption('legend', { position: 'bottom', textStyle: { fontSize: 9 } })
    .setOption('chartArea', { left: '10%', top: '18%', width: '80%', height: '55%' })
    .setOption('hAxis', { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 8 } })
    .setOption('vAxis', { textStyle: { fontSize: 9 } })
    .setOption('series', { 0: { lineWidth: 2, fillOpacity: 0.2, visibleInLegend: true } })
    .build();

  shOrvalho.insertChart(chartOrvalho);

  richTextGraficoCentralAr_(
    shOrvalho,
    'A22:M29',
    montarTextoOrvalhoCentralArV3_(status, orvalho, analise),
    [
      'PARECER TÉCNICO — PONTO DE ORVALHO:',
      'secagem',
      'fora da faixa',
      'falhas',
      'recuperações',
      'ociosidade',
      'conformidade'
    ],
    corStatus,
    10
  );
}

function preencherSinteseGraficaCentralAr_(shSintese, status, corStatus, pressao, orvalho, comp, analise) {
  cabecalhoGraficoCentralAr_(
    shSintese,
    'ANÁLISE GRÁFICA FINAL',
    'SÍNTESE VISUAL E COMPORTAMENTAL DOS INDICADORES'
  );

  const resumoDados = montarResumoIndicadoresGraficoCentralAr_(pressao, orvalho, comp, analise);

  shSintese.getRange(5, 1, resumoDados.length, 2).setValues(resumoDados);
  estiloTabelaGraficoCentralAr_(shSintese.getRange(5, 1, resumoDados.length, 2));
  
  // CORREÇÃO: Formatar a coluna como número na planilha, permitindo que o Gráfico do Sheets leia os dados corretamente
  shSintese.getRange(6, 2, resumoDados.length - 1, 1).setNumberFormat('0.0');

  const chartResumo = shSintese.newChart()
    .asColumnChart()
    .addRange(shSintese.getRange(5, 1, resumoDados.length, 2))
    .setNumHeaders(1)
    .setTitle('INDICADORES CONSOLIDADOS DO ENSAIO')
    .setXAxisTitle('PARÂMETROS')
    .setYAxisTitle('VALORES')
    .setPosition(5, 4, 0, 0)
    .setOption('width', 730)
    // CORREÇÃO: Altura reduzida de 360 para 280, eliminando a sobreposição com a caixa de texto
    .setOption('height', 280) 
    .setOption('legend', { position: 'none' })
    .setOption('chartArea', { left: '12%', top: '18%', width: '80%', height: '58%' })
    .build();

  shSintese.insertChart(chartResumo);

  richTextGraficoCentralAr_(
    shSintese,
    'A18:M25',
    montarTextoConclusaoCentralArV3_(status, analise),
    [
      'SÍNTESE FINAL:',
      'estabilidade',
      'fora da faixa',
      'falhas',
      'recuperações',
      'REPROVADO',
      'APROVADO COM ALERTA',
      'APROVADO COM RESSALVA',
      'APROVADO'
    ],
    corStatus,
    10
  );
}

// ============================================================
// ESTRUTURA / LAYOUT
// ============================================================

function recriarAbaGraficoCentralAr_(ss, nome) {
  const antiga = ss.getSheetByName(nome);
  if (antiga) ss.deleteSheet(antiga);
  ss.insertSheet(nome);
}

function prepararAbaGraficoCentralAr_(sh) {
  sh.clear();
  sh.setHiddenGridlines(true);
  for (var c = 1; c <= 13; c++) sh.setColumnWidth(c, 92);
  for (var r = 1; r <= 36; r++) sh.setRowHeight(r, 24);
}

function cabecalhoGraficoCentralAr_(sh, titulo, subtitulo) {
  sh.getRange('A1:M2').merge().setValue('METROLABS — RELATÓRIO TÉCNICO DE AR MEDICINAL')
    .setBackground('#374151')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(14)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sh.getRange('A3:M3').merge().setValue(String(titulo || ''))
    .setBackground('#e5e7eb')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  if (subtitulo) {
    sh.getRange('A30:M30').merge().setValue(subtitulo)
      .setFontSize(8)
      .setFontStyle('italic')
      .setFontColor('#6b7280')
      .setHorizontalAlignment('center');
  }
}

function estiloTabelaGraficoCentralAr_(range) {
  range.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  range.setVerticalAlignment('middle');

  range.offset(0, 0, 1, range.getNumColumns())
    .setFontWeight('bold')
    .setBackground('#dbeafe')
    .setHorizontalAlignment('center');
}

function richTextGraficoCentralAr_(sheet, rangeA1, textoCompleto, termosNegrito, corEspecial, fontSize) {
  textoCompleto = String(textoCompleto || '');
  termosNegrito = termosNegrito || [];
  fontSize = Number(fontSize || 10);

  let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);
  const estiloBase = SpreadsheetApp.newTextStyle()
    .setForegroundColor('#374151')
    .setFontSize(fontSize)
    .build();

  const estiloNegrito = SpreadsheetApp.newTextStyle()
    .setForegroundColor('#374151')
    .setFontSize(fontSize)
    .setBold(true)
    .build();

  // CORREÇÃO: Previne crash do Apps Script se o texto não existir
  if (textoCompleto.length > 0) {
    rtv.setTextStyle(0, textoCompleto.length, estiloBase);
  }

  termosNegrito.forEach(function(termo) {
    termo = String(termo || '');
    if (!termo) return;

    let pos = 0;
    while (true) {
      const idx = textoCompleto.indexOf(termo, pos);
      if (idx === -1) break;
      rtv.setTextStyle(idx, idx + termo.length, estiloNegrito);
      pos = idx + termo.length;
    }
  });

  if (corEspecial) {
    [
      'APROVADO',
      'REPROVADO',
      'APROVADO COM ALERTA',
      'APROVADO_COM_ALERTA',
      'APROVADO COM RESSALVA',
      'APROVADO_COM_RESSALVA'
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

  sheet.getRange(rangeA1).merge()
    .setRichTextValue(rtv.build())
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left')
    .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

// ============================================================
// TEXTOS INTELIGENTES
// ============================================================

function montarTextoPressaoCentralArV3_(status, pressao, analise) {
  const comp = analise.comportamentoOperacional || {};
  const pct = (analise.metricasAr && analise.metricasAr.percentualPressaoFora) || 0;

  let texto = 'PARECER TÉCNICO — PRESSÃO DA REDE:\n\n';
  texto += 'A leitura gráfica da pressão da rede evidenciou mínimo de ' + formatarNumeroGraficoCentralAr_(pressao.min, ' bar') + ', ';
  texto += 'média de ' + formatarNumeroGraficoCentralAr_(pressao.media, ' bar') + ', ';
  texto += 'máximo de ' + formatarNumeroGraficoCentralAr_(pressao.max, ' bar') + ' e ';
  texto += 'amplitude de ' + formatarNumeroGraficoCentralAr_(pressao.amplitude, ' bar') + '. ';
  texto += 'O percentual de registros fora da faixa foi de ' + formatarNumeroGraficoCentralAr_(pct, ' %') + ', ';
  texto += 'com ' + valorSeguroGraficoCentralAr_(comp.totalFalhas || 0) + ' falhas/excursões identificadas e ';
  texto += valorSeguroGraficoCentralAr_(comp.totalRecuperacoes || 0) + ' eventos de recuperação. ';
  texto += 'A estabilidade global do período foi de ' + formatarNumeroGraficoCentralAr_(comp.percentualEstavel, ' %') + '. ';

  if (comp.periodoOciosoDetectado) {
    texto += 'Observa-se ainda padrão compatível com ociosidade operacional/noturna em trechos de baixa variação. ';
  }

  if (status === 'REPROVADO') {
    texto += 'O comportamento gráfico da pressão da rede foi incompatível com os critérios de conformidade adotados, indicando necessidade de avaliação do sistema de geração e/ou distribuição do ar medicinal.';
  } else if (status === 'APROVADO_COM_ALERTA' || status === 'APROVADO_COM_RESSALVA') {
    texto += 'A pressão permaneceu operacional, porém com oscilações e excursões merecedoras de acompanhamento preventivo.';
  } else {
    texto += 'O comportamento gráfico da pressão da rede mostrou-se compatível com a conformidade esperada para o período analisado.';
  }

  return texto;
}

function montarTextoOrvalhoCentralArV3_(status, orvalho, analise) {
  const comp = analise.comportamentoOperacional || {};
  const pct = (analise.metricasAr && analise.metricasAr.percentualOrvalhoFora) || 0;

  let texto = 'PARECER TÉCNICO — PONTO DE ORVALHO:\n\n';
  texto += 'A leitura gráfica do ponto de orvalho evidenciou mínimo de ' + formatarNumeroGraficoCentralAr_(orvalho.min, ' °C') + ', ';
  texto += 'média de ' + formatarNumeroGraficoCentralAr_(orvalho.media, ' °C') + ', ';
  texto += 'máximo de ' + formatarNumeroGraficoCentralAr_(orvalho.max, ' °C') + ' e ';
  texto += 'amplitude de ' + formatarNumeroGraficoCentralAr_(orvalho.amplitude, ' °C') + '. ';
  texto += 'O percentual de registros fora da faixa foi de ' + formatarNumeroGraficoCentralAr_(pct, ' %') + ', refletindo o comportamento do sistema de secagem e tratamento do ar ao longo da janela monitorada. ';
  texto += 'A estabilidade global do período foi de ' + formatarNumeroGraficoCentralAr_(comp.percentualEstavel, ' %') + ', ';
  texto += 'com ' + valorSeguroGraficoCentralAr_(comp.totalRecuperacoes || 0) + ' eventos de recuperação após excursões. ';

  if (comp.periodoOciosoDetectado) {
    texto += 'Foram observados trechos compatíveis com baixa demanda da rede, com comportamento ocioso/estável em faixa noturna. ';
  }

  if (status === 'REPROVADO') {
    texto += 'O comportamento gráfico do ponto de orvalho foi incompatível com os critérios técnicos definidos, sugerindo necessidade de verificação do sistema de secagem, filtragem e tratamento do ar.';
  } else if (status === 'APROVADO_COM_ALERTA' || status === 'APROVADO_COM_RESSALVA') {
    texto += 'O ponto de orvalho manteve-se operacional, porém com desvios e instabilidades que justificam acompanhamento preventivo.';
  } else {
    texto += 'O comportamento gráfico do ponto de orvalho mostrou-se compatível com a conformidade esperada para o período avaliado.';
  }

  return texto;
}

function montarTextoConclusaoCentralArV3_(status, analise) {
  const comp = analise.comportamentoOperacional || {};
  const motivos = textoListaGraficoCentralAr_(analise.motivosReprovacao, 'Nenhum motivo crítico registrado.');
  const alertas = textoListaGraficoCentralAr_(analise.alertasAnalise, 'Nenhum alerta registrado.');

  if (status === 'REPROVADO') {
    return 'SÍNTESE FINAL:\n\n' +
      'O conjunto gráfico e estatístico do monitoramento classifica o sistema como REPROVADO. ' +
      'Foram identificadas não conformidades com potencial impacto técnico sobre a qualidade do ar medicinal. ' +
      'O período apresentou ' + formatarNumeroGraficoCentralAr_(comp.percentualForaFaixa, ' %') + ' fora da faixa, ' +
      valorSeguroGraficoCentralAr_(comp.totalFalhas || 0) + ' falhas/excursões e ' +
      valorSeguroGraficoCentralAr_(comp.totalRecuperacoes || 0) + ' recuperações. ' +
      'Motivos principais: ' + motivos + '.';
  }

  if (status === 'APROVADO_COM_ALERTA' || status === 'APROVADO_COM_RESSALVA') {
    return 'SÍNTESE FINAL:\n\n' +
      'O conjunto gráfico e estatístico do monitoramento classifica o sistema como ' + obterStatusLongoGraficoCentralAr_(status) + '. ' +
      'Embora o sistema tenha permanecido operacional, foram observados ' +
      formatarNumeroGraficoCentralAr_(comp.percentualInstabilidade, ' %') + ' de instabilidade e ' +
      formatarNumeroGraficoCentralAr_(comp.percentualForaFaixa, ' %') + ' fora da faixa, justificando acompanhamento. ' +
      'Alertas principais: ' + alertas + '.';
  }

  return 'SÍNTESE FINAL:\n\n' +
    'O conjunto gráfico e estatístico do monitoramento classifica o sistema como APROVADO. ' +
    'O período apresentou predominância de estabilidade (' +
    formatarNumeroGraficoCentralAr_(comp.percentualEstavel, ' %') +
    ') e ausência de não conformidades críticas com impacto relevante sobre a análise técnica.';
}

// ============================================================
// RESUMO DE INDICADORES
// ============================================================

function montarResumoIndicadoresGraficoCentralAr_(pressao, orvalho, comp, analise) {
  // CORREÇÃO: Enviando NÚMEROS REAIS para a tabela, ao invés de textos concatenados com "bar" e "%".
  // Isso destrava a renderização das colunas do gráfico na SÍNTESE FINAL.
  return [
    ['Indicador', 'Valor'],
    ['Pressão mín.', numeroGraficoCentralAr_(pressao.min)],
    ['Pressão méd.', numeroGraficoCentralAr_(pressao.media)],
    ['Pressão máx.', numeroGraficoCentralAr_(pressao.max)],
    ['Orvalho mín.', numeroGraficoCentralAr_(orvalho.min)],
    ['Orvalho méd.', numeroGraficoCentralAr_(orvalho.media)],
    ['Orvalho máx.', numeroGraficoCentralAr_(orvalho.max)],
    ['% Estável', numeroGraficoCentralAr_(comp.percentualEstavel)],
    ['% Fora da faixa', numeroGraficoCentralAr_(comp.percentualForaFaixa)]
  ];
}

// ============================================================
// HELPERS
// ============================================================

function normalizarStatusGraficoCentralAr_(status, aprovado) {
  status = String(status || '').trim().toUpperCase();
  if (status) return status;
  return aprovado ? 'APROVADO' : 'REPROVADO';
}

function obterStatusLongoGraficoCentralAr_(status) {
  if (status === 'REPROVADO') return 'REPROVADO';
  if (status === 'APROVADO_COM_ALERTA') return 'APROVADO COM ALERTA';
  if (status === 'APROVADO_COM_RESSALVA') return 'APROVADO COM RESSALVA';
  return 'APROVADO';
}

function obterCorStatusGraficoCentralAr_(status) {
  if (status === 'REPROVADO') return '#dc2626';
  if (status === 'APROVADO_COM_ALERTA' || status === 'APROVADO_COM_RESSALVA') return '#d97706';
  return '#059669';
}

function textoListaGraficoCentralAr_(lista, vazio) {
  if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
  return lista.map(function(m, i) { return (i + 1) + '. ' + m; }).join(' ');
}

function valorSeguroGraficoCentralAr_(v) {
  if (v === null || typeof v === 'undefined' || v === '') return '';
  return String(v);
}

function numeroGraficoCentralAr_(v) {
  const n = Number(String(v == null ? '' : v).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function formatarNumeroGraficoCentralAr_(v, sufixo) {
  const n = numeroGraficoCentralAr_(v);
  return n.toFixed(1) + String(sufixo || '');
}