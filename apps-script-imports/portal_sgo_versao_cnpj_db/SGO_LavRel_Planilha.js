/****************************************************
 * METROLABS  CONVERSOR UNIVERSAL DATALOGGER  V4.8
 * ARQUIVO: Planilha.gs
 * SISTEMA UNIFICADO: TERMO E ULTRASSOM
 * DESCRICAO: Dashboard ONA/VISA A4 Paisagem.
 * Removidos fantasmas de F0/Esterilizao. Tempos de Rampa includos.
 * TRATAMENTO SEGURO CONTRA FALHAS MECANICAS: Preveno de tempos nulos (ciclos abortados)
 ****************************************************/

function LavRel_gerarPlanilhaAuditoria(dados, analise, payload) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado foi recebido para geração da planilha.');
  }

  payload = payload || {};
  analise = analise || {};

  const motor = String(payload.motor || 'TERMO').trim();
  const cfg = LavRel_UCFG && LavRel_UCFG.CICLOS ? LavRel_UCFG.CICLOS[motor] : null;

  if (!cfg) {
    throw new Error('Configuração normativa não encontrada para o equipamento: ' + motor);
  }

  const nomeArquivo = 'METROLABS_AUDITORIA_' + motor + '_' +
    Utilities.formatDate(new Date(), LavRel_UCFG.TZ, 'ddMMyyyy_HHmm');

  const ss = SpreadsheetApp.create(nomeArquivo);

  try {
    const folderId = (LavRel_UCFG.LAUDOS_FOLDER_ID && String(LavRel_UCFG.LAUDOS_FOLDER_ID).length > 10)
      ? LavRel_UCFG.LAUDOS_FOLDER_ID
      : '';

    if (folderId) {
      const file = DriveApp.getFileById(ss.getId());
      const folder = DriveApp.getFolderById(folderId);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
  } catch (e) {
    Logger.log('Aviso: pasta de destino não acessível. Detalhe: ' + e.message);
  }

  const nSensoresInstalados = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensoresInstalados) {
    throw new Error('Não foi possível identificar os sensores instalados.');
  }

  const statusBruto = String(
    analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO')
  ).toUpperCase();
  const statusAprovacao = statusBruto === 'APROVADO_COM_ALERTA' ? 'APROVADO' : statusBruto;

  // Decisão do dono (17/10/2026): sem "aprovado com alerta"; perto do mínimo = aprovado com observação.
  const proximoDoLimite = statusAprovacao !== 'REPROVADO' && (Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : []).some(function(o) {
    return /pr[oó]ximo do limite/i.test(String(o || ''));
  });

  const statusCor =
    statusAprovacao === 'REPROVADO'
      ? LavRel_UCFG.CORES.REPROVADO
      : LavRel_UCFG.CORES.APROVADO;

  const idxInicioCiclo = LavRel_numeroInteiroSeguroPlanilha_(analise.indiceInicioCiclo, 0);
  const idxFimCiclo = LavRel_numeroInteiroSeguroPlanilha_(analise.indiceFimCiclo, dados.length - 1);

  const linhaInicioCiclo = dados[Math.max(0, Math.min(dados.length - 1, idxInicioCiclo))] || dados[0];
  const linhaFimCiclo = dados[Math.max(0, Math.min(dados.length - 1, idxFimCiclo))] || dados[dados.length - 1];

  const dataInicio = LavRel_normalizarTempoPlanilha_(
    analise.tempoInicioCiclo || (linhaInicioCiclo ? (linhaInicioCiclo.tempoDate || linhaInicioCiclo.tempoStr) : '-')
  );
  const dataFim = LavRel_normalizarTempoPlanilha_(
    analise.tempoFimCiclo || (linhaFimCiclo ? (linhaFimCiclo.tempoDate || linhaFimCiclo.tempoStr) : '-')
  );

  const globalTemp = (analise.stats && analise.stats.globalTemp)
    ? analise.stats.globalTemp
    : { min: 0, max: 0, soma: 0, count: 0, media: 0 };

  const exposicaoTemp = (analise.stats && analise.stats.exposicaoTemp)
    ? analise.stats.exposicaoTemp
    : { min: 0, max: 0, soma: 0, count: 0, media: 0 };

  const globalPres = (analise.stats && analise.stats.globalPres)
    ? analise.stats.globalPres
    : { min: 0, max: 0, soma: 0, count: 0, media: 0 };

  const sensoresStats = (analise.stats && analise.stats.sensores)
    ? analise.stats.sensores
    : [];

  const mediaTempGeral = LavRel_valorNumericoSeguroPlanilha_(globalTemp.media);
  const mediaTempExposicao = LavRel_valorNumericoSeguroPlanilha_(exposicaoTemp.media);
  const mediaPresGeral = LavRel_valorNumericoSeguroPlanilha_(globalPres.media);

  const exibePressao = globalPres.count > 0;
  const relatorioSimulado = !!(payload.modoRelatorioSimulado || analise.modoRelatorioSimulado);
  const avisoSimulado = relatorioSimulado
    ? ((LavRel_UCFG.SIMULADOR_ADMIN && LavRel_UCFG.SIMULADOR_ADMIN.avisoRelatorio) || 'RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
    : '';

  const sensoresUtilizados = Array.isArray(analise.sensoresUtilizados) ? analise.sensoresUtilizados : [];
  const sensoresDesabilitados = Array.isArray(analise.sensoresDesabilitados) ? analise.sensoresDesabilitados : [];
  const qtdSensoresUtilizados = LavRel_valorNumericoSeguroPlanilha_(analise.quantidadeSensoresUtilizados);
  const qtdSensoresInstalados = LavRel_valorNumericoSeguroPlanilha_(analise.quantidadeSensoresInstalados) || nSensoresInstalados;

  const piorSensorTemperatura = analise.piorSensorTemperatura || null;

  const motivosReprovacao = Array.isArray(analise.motivosReprovacao)
    ? analise.motivosReprovacao
    : [];

  const alertasAnalise = Array.isArray(analise.alertasAnalise)
    ? analise.alertasAnalise
    : [];

  const observacoesAnalise = Array.isArray(analise.observacoesAnalise)
    ? analise.observacoesAnalise
    : [];

  if (relatorioSimulado && observacoesAnalise.indexOf(avisoSimulado) === -1) {
    observacoesAnalise.unshift(avisoSimulado);
  }

  const limitesAprovacao = analise.limitesAprovacao || {};
  const parametroNormativo = LavRel_valorNumericoSeguroPlanilha_(limitesAprovacao.parametroNormativo || cfg.parametroNormativo || 0);
  const limiteAprovacaoFinal = LavRel_valorNumericoSeguroPlanilha_(limitesAprovacao.limiteAprovacaoFinal || 0);
  const toleranciaParametro = LavRel_valorNumericoSeguroPlanilha_(limitesAprovacao.toleranciaParametro || 0);

  // Calcula tempo de preparo para exibir na capa com seguranca (previne numeros negativos se a fase abortar)
  let tempoPreparoMinutos = 0;
  if (analise.faseInicioRampa !== -1 && analise.faseInicioExp !== -1 && analise.faseInicioExp >= analise.faseInicioRampa) {
    const p = Math.max(0, analise.faseInicioExp - analise.faseInicioRampa);
    tempoPreparoMinutos = p * (analise.deltaMinutosEstimado || 1);
  } else if (analise.faseInicioExp === -1 && analise.faseInicioRampa !== -1) {
      // Se abortou no preparo, contabiliza o preparo até o fim do ciclo
      const p = Math.max(0, dados.length - 1 - analise.faseInicioRampa);
      tempoPreparoMinutos = p * (analise.deltaMinutosEstimado || 1);
  }

  const tempoPreparoExibicao = SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(tempoPreparoMinutos), 1) + ' MINUTOS';
  const tempoExpExibicao = analise.faseInicioExp === -1 ? 'N/A (CICLO ABORTADO)' : SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(analise.tempoExposicaoMinutos), 1) + ' MINUTOS';

  function aplicarBorda(rg) {
    rg.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function estiloCabecalhoEscuro(rg) {
    rg.setBackground(LavRel_UCFG.CORES.CHUMBO)
      .setFontColor(LavRel_UCFG.CORES.TEXTO_BRANCO)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  }

  function estiloCabecalhoClaro(rg) {
    rg.setBackground('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
  }

  function textoA4Paisagem(sheet) {
    sheet.setHiddenGridlines(true);
    try {
      sheet.setColumnWidths(1, Math.max(1, sheet.getMaxColumns()), 110);
    } catch (e) {}

    try {
      const ps = sheet.getPrintSettings();
      if (ps) {
        ps.setPaperSize(SpreadsheetApp.PrintPaperSize.A4);
        ps.setOrientation(SpreadsheetApp.PrintOrientation.LANDSCAPE);
      }
    } catch (e) {}
  }

  function fmtBarAbs_(valor) {
    return SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(valor), 3);
  }

  function fmtTemp_(valor) {
    return SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(valor), 2) + ' °C';
  }

  function fmtMin_(valor) {
    return SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(valor), 2) + ' MIN';
  }
  
  function fmtA0_(valor) {
    return SGO_DocA4_num_(LavRel_valorNumericoSeguroPlanilha_(valor), 2) + ' s';
  }

  function richTexto(sheet, rangeA1, textoCompleto, termosNegrito, corStatusPalavra, fontSize) {
    textoCompleto = String(textoCompleto || '');
    termosNegrito = termosNegrito || [];
    fontSize = Number(fontSize || 11);

    let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);

    const base = SpreadsheetApp.newTextStyle()
      .setForegroundColor('#374151')
      .setFontSize(fontSize)
      .build();

    const bold = SpreadsheetApp.newTextStyle()
      .setForegroundColor('#374151')
      .setFontSize(fontSize)
      .setBold(true)
      .build();

    rtv.setTextStyle(0, textoCompleto.length, base);

    termosNegrito.forEach(function(termo) {
      termo = String(termo || '');
      if (!termo) return;

      let pos = 0;
      while (true) {
        const idx = textoCompleto.indexOf(termo, pos);
        if (idx === -1) break;
        rtv.setTextStyle(idx, idx + termo.length, bold);
        pos = idx + termo.length;
      }
    });

    if (corStatusPalavra) {
      [
        'APROVADO',
        'REPROVADO',
        'APROVADO.',
        'REPROVADO.'
      ].forEach(function(palavra) {
        let pos = 0;
        while (true) {
          const idx = textoCompleto.indexOf(palavra, pos);
          if (idx === -1) break;

          const estiloStatus = SpreadsheetApp.newTextStyle()
            .setForegroundColor(corStatusPalavra)
            .setFontSize(fontSize)
            .setBold(true)
            .build();

          rtv.setTextStyle(idx, idx + palavra.length, estiloStatus);
          pos = idx + palavra.length;
        }
      });
    }

    const rg = sheet.getRange(rangeA1);
    rg.setRichTextValue(rtv.build())
      .setWrap(true)
      .setVerticalAlignment('top')
      .setHorizontalAlignment('left');
  }

  function compactarTextoLaudo_(texto) {
    return String(texto || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function textoLista(lista, vazio) {
    if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
    return lista.map(function(m, i) {
      return (i + 1) + '. ' + m;
    }).join('\n');
  }

  function formatarResumoFasesLaudo_(analise) {
    const fases = analise && analise.fasesProcesso && Array.isArray(analise.fasesProcesso.resumo)
      ? analise.fasesProcesso.resumo
      : [];

    if (!fases.length) {
      return 'O mapeamento operacional identificado foi:\n- Mapeamento de fases não disponível para este ciclo.';
    }

    return 'O mapeamento operacional identificado foi:\n' + fases.map(function(fase) {
      return '- ' + String(fase || '').replace(/\.$/, '');
    }).join('\n');
  }

  function obterTextoStatusLongo_(status) {
    if (status === 'REPROVADO') return 'REPROVADO';
    return 'APROVADO';
  }

  const statusLongo = obterTextoStatusLongo_(statusAprovacao);

  // =========================================================
  // ABA 1: CAPA DO LAUDO
  // =========================================================
  const shCapa = ss.insertSheet('1. CAPA DO LAUDO', 0);
  textoA4Paisagem(shCapa);

  shCapa.setColumnWidth(1, 170);
  shCapa.setColumnWidth(2, 220);
  shCapa.setColumnWidth(3, 170);
  shCapa.setColumnWidth(4, 185);
  shCapa.setColumnWidth(5, 220);
  shCapa.setColumnWidth(6, 170);

  shCapa.getRange('A1:F2')
    .merge()
    .setValue('RELATÓRIO DE QUALIFICAÇÃO TÉRMICA E VALIDAÇÃO DE PROCESSOS\nMETROLABS - ENGENHARIA CLÍNICA (LAYOUT ONA/VISA)')
    .setFontSize(13);

  estiloCabecalhoEscuro(shCapa.getRange('A1:F2'));
  shCapa.setRowHeight(1, 30);
  shCapa.setRowHeight(2, 34);

  if (relatorioSimulado) {
    shCapa.getRange('A3:F3')
      .merge()
      .setValue(avisoSimulado)
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shCapa.getRange('A3:F3'));
    shCapa.setRowHeight(3, 42);
  }

  shCapa.getRange('A4:C4').merge().setValue('IDENTIFICAÇÃO DO CLIENTE');
  shCapa.getRange('D4:F4').merge().setValue('IDENTIFICAÇÃO DO EQUIPAMENTO');
  estiloCabecalhoClaro(shCapa.getRange('A4:C4'));
  estiloCabecalhoClaro(shCapa.getRange('D4:F4'));

  const lblPreparo = motor === 'TERMO' ? 'DURAÇÃO DA LAVAGEM:' : 'DURAÇÃO DO ENCHIMENTO:';

  const infoMatriz = [
    ['CLIENTE:', LavRel_valorSeguroPlanilha_(payload.cliente), '', 'TAG / CÓDIGO:', LavRel_valorSeguroPlanilha_(payload.tag), ''],
    ['CNPJ:', LavRel_valorSeguroPlanilha_(payload.cnpj), '', 'MARCA:', LavRel_valorSeguroPlanilha_(payload.marca), ''],
    ['ENDEREÇO:', LavRel_valorSeguroPlanilha_(payload.endereco), '', 'MODELO:', LavRel_valorSeguroPlanilha_(payload.modelo), ''],
    ['TIPO DE ENSAIO:', LavRel_valorSeguroPlanilha_(payload.ensaio), '', 'NÚMERO DE SÉRIE:', LavRel_valorSeguroPlanilha_(payload.numSerie), ''],
    ['RECEITA / CICLO N:', LavRel_valorSeguroPlanilha_(payload.programa) + ' (CICLO ' + LavRel_valorSeguroPlanilha_(payload.cicloNum) + ')', '', 'LOTE DA CARGA:', LavRel_valorSeguroPlanilha_(payload.lote), ''],
    ['TEMP. PROGRAMADA:', LavRel_txtNumPlanilha_(payload.setpoint) + ' °C', '', 'LOCALIZAÇÃO:', LavRel_valorSeguroPlanilha_(payload.local), ''],
    ['INÍCIO DO CICLO:', dataInicio, '', 'TÉRMINO DO CICLO:', dataFim, ''],
    ['TEMPO TOTAL:', LavRel_txtNumPlanilha_(analise.tempoTotalMinutos) + ' MINUTOS', '', 'TEMPO DA FASE PRINCIPAL:', tempoExpExibicao, '']
  ];

  shCapa.getRange('A5:F12')
    .setValues(infoMatriz)
    .setVerticalAlignment('middle')
    .setFontSize(10)
    .setWrap(true);

  for (let r = 5; r <= 12; r++) {
    shCapa.getRange('B' + r + ':C' + r).merge();
    shCapa.getRange('E' + r + ':F' + r).merge();
    shCapa.setRowHeight(r, 30);
  }

  shCapa.setRowHeight(7, 42);
  shCapa.setRowHeight(9, 42);

  aplicarBorda(shCapa.getRange('A4:F12'));
  shCapa.getRange('A5:A12').setFontWeight('bold');
  shCapa.getRange('D5:D12').setFontWeight('bold');
  shCapa.getRange('B5:C12').setFontWeight('normal');
  shCapa.getRange('E5:F12').setFontWeight('normal');

  shCapa.getRange('A14:F14')
    .merge()
    .setValue('RESULTADOS GLOBAIS DO MONITORAMENTO');
  estiloCabecalhoClaro(shCapa.getRange('A14:F14'));

  let criterioTxt = '';
  let letalidadeTituloMin = '';
  let letalidadeValorMin = '';
  let letalidadeTituloMed = '';
  let letalidadeValorMed = '';
  let letalidadeTituloMax = '';
  let letalidadeValorMax = '';

  if (motor === 'TERMO') {
    criterioTxt = 'CRITÉRIO: A0 ≥ ' + SGO_DocA4_num_(limiteAprovacaoFinal, 0) + ' S EM TODOS OS SENSORES ATIVOS (' + (String((analise.configuracaoCiclo || {}).classeArtigo) === 'CRITICO' ? 'ARTIGO CRÍTICO' : 'ARTIGO SEMICRÍTICO OU NÃO CRÍTICO') + ')';
    letalidadeTituloMin = 'A0 MÍNIMO OBTIDO:';
    letalidadeValorMin = analise.faseInicioExp !== -1 ? fmtA0_(analise.minA0) : 'N/A';
    letalidadeTituloMed = 'A0 MÉDIO DA CÂMARA:';
    letalidadeValorMed = analise.faseInicioExp !== -1 ? fmtA0_(analise.mediaA0) : 'N/A';
    letalidadeTituloMax = 'A0 MÁXIMO OBTIDO:';
    letalidadeValorMax = analise.faseInicioExp !== -1 ? fmtA0_(analise.maxA0) : 'N/A';
  } else {
    criterioTxt = 'CRITÉRIO: TEMPO DE CAVITAÇÃO ≥ ' + SGO_DocA4_num_(limiteAprovacaoFinal, 2) + ' MIN';
    letalidadeTituloMin = 'TEMPO DE CAVITAÇÃO:';
    letalidadeValorMin = analise.faseInicioExp !== -1 ? fmtMin_(analise.tempoCavitacao) : 'N/A';
    letalidadeTituloMed = 'TEMPO DE EXPOSIÇÃO GERAL:';
    letalidadeValorMed = tempoExpExibicao;
    letalidadeTituloMax = lblPreparo;
    letalidadeValorMax = tempoPreparoExibicao;
  }

  const sensoresResumoTxt = qtdSensoresUtilizados + ' DE ' + qtdSensoresInstalados + ' PONTOS';

  // Proteção: se o ciclo abortar, não exibimos dados fantasmas na fase de exposição.
  const exibicaoTempMinFase = analise.faseInicioExp !== -1 ? fmtTemp_(exposicaoTemp.min) : 'N/A';
  const exibicaoTempMediaFase = analise.faseInicioExp !== -1 ? fmtTemp_(mediaTempExposicao) : 'N/A';
  const exibicaoTempMaxFase = analise.faseInicioExp !== -1 ? fmtTemp_(exposicaoTemp.max) : 'N/A';

  const resMatriz = [
    [letalidadeTituloMin, letalidadeValorMin, letalidadeTituloMed, letalidadeValorMed, letalidadeTituloMax, letalidadeValorMax],
    ['TEMP. MÍNIMA DA FASE:', exibicaoTempMinFase, 'TEMP. MÉDIA DA FASE:', exibicaoTempMediaFase, 'TEMP. MÁXIMA DA FASE:', exibicaoTempMaxFase],
    ['SINAL MÍNIMO (QUANDO APLICÁVEL):', exibePressao ? fmtBarAbs_(globalPres.min) : 'N/A', 'SINAL MÉDIO:', exibePressao ? fmtBarAbs_(mediaPresGeral) : 'N/A', 'SINAL MÁXIMO:', exibePressao ? fmtBarAbs_(globalPres.max) : 'N/A'],
    ['CRITÉRIO EXIGIDO:', criterioTxt, 'SENSORES UTILIZADOS:', sensoresResumoTxt, 'PARECER FINAL:', statusLongo]
  ];

  shCapa.getRange('A15:F18')
    .setValues(resMatriz)
    .setVerticalAlignment('middle')
    .setFontSize(10)
    .setWrap(true);

  shCapa.setRowHeight(15, 34);
  shCapa.setRowHeight(16, 34);
  shCapa.setRowHeight(17, 34);
  shCapa.setRowHeight(18, 40);

  aplicarBorda(shCapa.getRange('A15:F18'));
  shCapa.getRange('A15:A18').setFontWeight('bold');
  shCapa.getRange('C15:C18').setFontWeight('bold');
  shCapa.getRange('E15:E18').setFontWeight('bold');

  shCapa.getRange('F18')
    .setFontColor(statusCor)
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('center')
    .setValue(statusLongo);

  // =========================================================
  // ABA 2: CONCLUSÃO TÉCNICA
  // =========================================================
  const shConclusao = ss.insertSheet('2. CONCLUSÃO TÉCNICA', 1);
  textoA4Paisagem(shConclusao);

  shConclusao.setColumnWidth(1, 1120);
  shConclusao.setRowHeight(2, 32);

  shConclusao.getRange('A2')
    .setValue('CONCLUSÃO DO CICLO')
    .setFontSize(14);
  estiloCabecalhoEscuro(shConclusao.getRange('A2'));

  if (relatorioSimulado) {
    shConclusao.getRange('A3')
      .setValue(avisoSimulado)
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shConclusao.getRange('A3'));
    shConclusao.setRowHeight(3, 34);
  }

  const motorText = motor === 'TERMO' ? 'DESINFECÇÃO TÉRMICA' : 'LAVAGEM ULTRASSÔNICA';
  const normaText = motor === 'TERMO'
    ? 'ABNT NBR ISO 15883 E RDC 15/2012 (ANVISA)'
    : 'MANUAL DO FABRICANTE E RDC 15/2012 (ANVISA)';

  let txtP1 = '';
  
  if (analise.faseInicioExp === -1) {
     txtP1 = 'Com base nos ensaios de qualificação de desempenho (' + motorText + '), a análise dos dados coletados revelou que o ciclo foi abortado prematuramente (por falha operacional, desarme do motor ou ausência térmica), impossibilitando o alcance dos patamares mínimos de validação normativa requeridos pela ' + normaText + '.';
  } else {
      if (motor === 'TERMO') {
          if (statusAprovacao === 'REPROVADO') {
            txtP1 =
              'Com base nos ensaios de qualificação de desempenho (' + motorText + '), os dados coletados foram processados em conformidade com as exigências da ' + normaText + ' e diretrizes de acreditação ONA.\n\n' +
              'A análise térmica identificou janela de desinfecção com duração de ' + tempoExpExibicao + ' contínuos. ' +
              'Entretanto, o pior caso de letalidade (A0) foi insuficiente para aprovação. O A0 médio calculado foi de ' + fmtA0_(analise.mediaA0) +
              ', enquanto o menor valor obtido foi de ' + fmtA0_(analise.minA0) +
              ', abaixo do mínimo exigido de ' + fmtA0_(limiteAprovacaoFinal) + '.';
          } else {
            txtP1 =
              'Com base nos ensaios de qualificação de desempenho (' + motorText + '), os dados coletados foram processados em conformidade com as exigências da ' + normaText + ' e diretrizes de acreditação ONA.\n\n' +
              'A análise térmica confirmou estabilidade operacional durante a desinfecção, com duração de ' + tempoExpExibicao + ' contínuos. ' +
              'A letalidade (A0) apresentou média de ' + fmtA0_(analise.mediaA0) +
              ', sendo o pior caso igual a ' + fmtA0_(analise.minA0) +
              ', atendendo integralmente ao critério configurado do processo.';
          }
      } else {
          if (statusAprovacao === 'REPROVADO') {
            txtP1 =
              'Com base nos ensaios de qualificação de desempenho (' + motorText + '), os dados coletados foram processados em conformidade com as exigências da ' + normaText + ' e diretrizes de acreditação ONA.\n\n' +
              'A análise térmica e de exposição identificou que o equipamento manteve as condições operacionais (Cavitação) por ' + fmtMin_(analise.tempoCavitacao) +
              ', o que é insuficiente e está abaixo do mínimo exigido de ' + fmtMin_(limiteAprovacaoFinal) + '.';
          } else {
            txtP1 =
              'Com base nos ensaios de qualificação de desempenho (' + motorText + '), os dados coletados foram processados em conformidade com as exigências da ' + normaText + ' e diretrizes de acreditação ONA.\n\n' +
              'A análise térmica e de exposição confirmou estabilidade operacional, com duração de cavitação efetiva de ' + fmtMin_(analise.tempoCavitacao) +
              ', atendendo integralmente ao critério configurado do processo.';
          }
      }
  }

  const criterioProcessoTexto = motor === 'TERMO'
    ? 'A avaliação considerou a evolução térmica dos sensores ativos, a janela de desinfecção, o cálculo de A0 e a estabilidade do pior ponto monitorado.'
    : 'A avaliação considerou a evolução térmica do banho, o tempo efetivo de cavitação, a estabilidade do sinal analógico e o pior ponto monitorado.';
  if (txtP1) {
    txtP1 += '\n\n' + criterioProcessoTexto + '\n\n' + formatarResumoFasesLaudo_(analise);
  }

  txtP1 = compactarTextoLaudo_(txtP1);

  shConclusao.getRange('A6:A17').merge();
  richTexto(
    shConclusao,
    'A6',
    txtP1,
    [
      motorText,
      normaText,
      'ONA',
      tempoExpExibicao !== 'N/A (CICLO ABORTADO)' ? tempoExpExibicao : '',
      analise.faseInicioExp !== -1 ? fmtMin_(analise.mediaA0) : '',
      analise.faseInicioExp !== -1 ? fmtMin_(analise.minA0) : '',
      analise.faseInicioExp !== -1 ? fmtA0_(analise.mediaA0) : '',
      analise.faseInicioExp !== -1 ? fmtA0_(analise.minA0) : '',
      analise.faseInicioExp !== -1 ? fmtMin_(analise.tempoCavitacao) : '',
      fmtMin_(limiteAprovacaoFinal),
      fmtA0_(limiteAprovacaoFinal),
      fmtMin_(parametroNormativo),
      fmtA0_(parametroNormativo)
    ],
    null,
    10
  );
  shConclusao.setRowHeight(4, 18);
  shConclusao.setRowHeight(5, 18);
  for (let r = 6; r <= 17; r++) shConclusao.setRowHeight(r, 24);

  shConclusao.getRange('A20')
    .setValue('______________________________________________________________')
    .setHorizontalAlignment('center');

  shConclusao.getRange('A21')
    .setValue((LavRel_valorSeguroPlanilha_(payload.respTecnico) || 'RESPONSÁVEL TÉCNICO') + ' - RESPONSÁVEL TÉCNICO / ENGENHARIA CLÍNICA')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');

  let txtP2 = '';
  if (statusAprovacao === 'REPROVADO') {
    txtP2 =
      'Parecer final da engenharia clínica: REPROVADO.\n\n' +
      'Foram identificadas não conformidades nos sensores ativos monitorados ou falha estrutural no ciclo processado.\n\n' +
      'Motivos técnicos da reprovação:\n' + textoLista(motivosReprovacao, 'Nenhum motivo registrado.') + '\n\n' +
      (alertasAnalise.length ? 'Registros técnicos adicionais:\n' + textoLista(alertasAnalise, '') + '\n\n' : '') +
      'O equipamento deve passar por avaliação técnica, revisão do processo e nova qualificação antes de liberação operacional.';
  } else {
    txtP2 =
      'Parecer final da engenharia clínica: APROVADO.\n\n' +
      'Todos os critérios configurados para os sensores ativos foram atendidos. ' +
      'O processo demonstrou desempenho compatível com o nível de eficácia requerido e com a integridade operacional do ciclo.\n\n' +
      (proximoDoLimite ? 'Observação: o resultado mínimo ficou acima do mínimo exigido, porém próximo do limite; o ponto está registrado nas observações e deve ser acompanhado nas próximas requalificações.\n\n' : '') +
      (alertasAnalise.length ? 'Registros técnicos sem impacto no resultado:\n' + textoLista(alertasAnalise, '') + '\n\n' : '') +
      'Equipamento liberado para processamento dentro dos critérios avaliados.';
  }

  const interpretacaoOperacionalTexto = motor === 'TERMO'
    ? 'Interpretação operacional: em termodesinfectoras, a aprovação depende de fase térmica sustentada, A0 adequado e coerência entre aquecimento, enxágues, desinfecção e finalização do ciclo. Divergências devem ser investigadas antes da liberação rotineira.'
    : 'Interpretação operacional: em lavadoras ultrassônicas, a aprovação depende de banho aquecido, desgaseificação compatível, cavitação sustentada pelo tempo configurado e finalização coerente do ciclo. Oscilações excessivas indicam necessidade de verificação de carga, solução, transdutores ou programação.';
  txtP2 += '\n\n' + interpretacaoOperacionalTexto;

  txtP2 = compactarTextoLaudo_(txtP2);

  // =========================================================
  // ABA 3: PARECER DE ENGENHARIA
  // =========================================================
  const shParecer = ss.insertSheet('3. PARECER DE ENGENHARIA', 2);
  textoA4Paisagem(shParecer);
  shParecer.setColumnWidth(1, 1120);
  shParecer.setRowHeight(2, 32);
  shParecer.getRange('A2')
    .setValue('PARECER DE ENGENHARIA')
    .setFontSize(14);
  estiloCabecalhoEscuro(shParecer.getRange('A2'));

  if (relatorioSimulado) {
    shParecer.getRange('A3')
      .setValue(avisoSimulado)
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shParecer.getRange('A3'));
    shParecer.setRowHeight(3, 34);
  }

  shParecer.getRange('A5:A13').merge();
  richTexto(
    shParecer,
    'A5',
    txtP2,
    [
      'Parecer final da engenharia clínica:',
      'APROVADO',
      'REPROVADO',
      'Motivos técnicos da reprovação:',
      'Observação:',
      'Equipamento liberado',
      'nova qualificação'
    ],
    statusCor,
    10
  );
  for (let r = 5; r <= 13; r++) shParecer.setRowHeight(r, 24);

  let linhaAssinatura = 15;

  if (observacoesAnalise.length) {
    shParecer.getRange('A15')
      .setValue('OBSERVAÇÕES DE ANÁLISE')
      .setFontWeight('bold')
      .setBackground('#e5e7eb');
    aplicarBorda(shParecer.getRange('A15'));

    shParecer.getRange('A16:A18').merge();
    richTexto(
      shParecer,
      'A16',
      textoLista(observacoesAnalise, 'Nenhuma observação registrada.'),
      ['1.', '2.', '3.', '4.', '5.'],
      null,
      9
    );
    shParecer.setRowHeight(16, 48);
    shParecer.setRowHeight(17, 20);
    shParecer.setRowHeight(18, 20);

    linhaAssinatura = 20;
  }

  shParecer.getRange('A' + linhaAssinatura)
    .setValue('______________________________________________________________')
    .setHorizontalAlignment('center');

  shParecer.getRange('A' + (linhaAssinatura + 1))
    .setValue((LavRel_valorSeguroPlanilha_(payload.respTecnico) || 'RESPONSÁVEL TÉCNICO') + ' - RESPONSÁVEL TÉCNICO / ENGENHARIA CLÍNICA')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');

  // =========================================================
  // ABA 4: TABELA CONSOLIDADA

  // =========================================================
  const shConsolidado = ss.insertSheet('4. TABELA CONSOLIDADA', 3);
  textoA4Paisagem(shConsolidado);

  shConsolidado.setColumnWidth(1, 120);
  shConsolidado.setColumnWidth(2, 110);
  shConsolidado.setColumnWidth(3, 135);
  shConsolidado.setColumnWidth(4, 135);
  shConsolidado.setColumnWidth(5, 135);
  shConsolidado.setColumnWidth(6, 135);
  shConsolidado.setColumnWidth(7, 125);
  shConsolidado.setColumnWidth(8, 125);

  shConsolidado.getRange('A1:H1')
    .merge()
    .setValue('CONSOLIDAÇÃO DE RESULTADOS POR PONTO DE MONITORAMENTO');
  estiloCabecalhoEscuro(shConsolidado.getRange('A1:H1'));

  const cabecalhoLetalidade = motor === 'TERMO' ? 'A0 ACUMULADO' : 'TEMPO MANTIDO (MIN)';

  shConsolidado.getRange('A3:H3')
    .setValues([['SENSOR ID', 'STATUS', cabecalhoLetalidade, 'TEMP. MÍN. FASE', 'TEMP. MÉDIA FASE', 'TEMP. MÁX. FASE', 'SINAL MÍN.', 'SINAL MÁX.']])
    .setBackground('#e2e8f0')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const linhasConsolidado = [];
  for (let s = 0; s < nSensoresInstalados; s++) {
    const statsSensor = sensoresStats[s] || {
      min: null,
      max: null,
      soma: 0,
      count: 0,
      media: null,
      minExposicao: null,
      maxExposicao: null,
      mediaExposicao: null,
      ativo: false
    };

    const ativo = !!statsSensor.ativo;

    let letalidadeSensor = 'N/A';
    
    if (motor === 'TERMO') {
        letalidadeSensor = Array.isArray(analise.a0PorSensor) && analise.a0PorSensor[s] !== null && analise.a0PorSensor[s] !== undefined && analise.faseInicioExp !== -1
          ? fmtA0_(analise.a0PorSensor[s])
          : 'DESCONSIDERADO';
    } else {
        letalidadeSensor = ativo && analise.faseInicioExp !== -1 ? fmtMin_(analise.tempoCavitacao) : 'DESCONSIDERADO';
    }

    // Se o ciclo foi abortado (fase principal = -1), a temperatura na fase tambem deve ser "DESCONSIDERADO"
    const exibicaoValorSensor = (ativo && analise.faseInicioExp !== -1);

    linhasConsolidado.push([
      'SENSOR ' + (s + 1),
      ativo ? 'ATIVO' : 'DESABILITADO',
      letalidadeSensor,
      exibicaoValorSensor ? fmtTemp_(statsSensor.minExposicao !== null ? statsSensor.minExposicao : statsSensor.min) : 'N/A',
      exibicaoValorSensor ? fmtTemp_(statsSensor.mediaExposicao !== null ? statsSensor.mediaExposicao : statsSensor.media) : 'N/A',
      exibicaoValorSensor ? fmtTemp_(statsSensor.maxExposicao !== null ? statsSensor.maxExposicao : statsSensor.max) : 'N/A',
      ativo && exibePressao ? fmtBarAbs_(globalPres.min) : 'N/A',
      ativo && exibePressao ? fmtBarAbs_(globalPres.max) : 'N/A'
    ]);
  }

  shConsolidado.getRange(4, 1, linhasConsolidado.length, 8)
    .setValues(linhasConsolidado)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontWeight('normal')
    .setWrap(true);

  aplicarBorda(shConsolidado.getRange(4, 1, linhasConsolidado.length, 8));
  shConsolidado.getRange(4, 2, linhasConsolidado.length, 1).setFontWeight('bold');

  for (let s = 0; s < nSensoresInstalados; s++) {
    const linha = 4 + s;
    const status = String(shConsolidado.getRange(linha, 2).getValue() || '');
    if (status === 'DESABILITADO') {
      shConsolidado.getRange(linha, 1, 1, 8).setBackground('#f3f4f6').setFontColor('#6b7280');
    }
  }

  const resumoSensores =
    'Sensores instalados: ' + qtdSensoresInstalados + '. ' +
    'Sensores considerados no cálculo: ' + qtdSensoresUtilizados + '. ' +
    'Sensores desabilitados: ' + (sensoresDesabilitados.length ? sensoresDesabilitados.join(', ') : 'Nenhum') + '.';

  const piorLetalidadeTxt = motor === 'TERMO' && analise.piorSensorA0 && analise.faseInicioExp !== -1
    ? ('Pior sensor (Menor A0): ' + analise.piorSensorA0.sensor + ' (' + fmtA0_(analise.piorSensorA0.valor) + ').')
    : (motor === 'TERMO' ? 'Pior sensor de A0: não aplicável/identificado.' : '');

  const piorTempTxt = piorSensorTemperatura && analise.faseInicioExp !== -1
    ? ('Pior sensor térmico na fase principal: ' + piorSensorTemperatura.sensor + ' (' + fmtTemp_(piorSensorTemperatura.valor) + ' mínima).')
    : 'Pior sensor térmico na fase principal: não aplicável/identificado.';

  let valRefTxt = '';
  if (motor === 'TERMO') {
      valRefTxt = 'A0 normativo de referência: ' + fmtA0_(parametroNormativo) + '. ' +
                  'Critério aplicado (classificação do artigo): A0 mínimo de ' + fmtA0_(limiteAprovacaoFinal) + '. ';
  } else {
      valRefTxt = 'Tempo exigido de cavitação: ' + fmtMin_(parametroNormativo) + '. ';
  }

  const txtInterpretacao =
    'INTERPRETAÇÃO ESTATÍSTICA DOS DADOS:\n\n' +
    resumoSensores + '\n' +
    (piorLetalidadeTxt ? piorLetalidadeTxt + '\n' : '') +
    piorTempTxt + '\n' +
    valRefTxt +
    'Status final do processo: ' + statusLongo + '.';

  const linhaTexto = 4 + linhasConsolidado.length + 2;
  shConsolidado.getRange('A' + linhaTexto + ':H' + (linhaTexto + 5)).merge();
  richTexto(
    shConsolidado,
    'A' + linhaTexto,
    txtInterpretacao,
    [
      'INTERPRETAÇÃO ESTATÍSTICA DOS DADOS:',
      'Sensores instalados:',
      'Sensores considerados no cálculo:',
      'Sensores desabilitados:',
      analise.piorSensorA0 && analise.faseInicioExp !== -1 ? analise.piorSensorA0.sensor : '',
      piorSensorTemperatura && analise.faseInicioExp !== -1 ? piorSensorTemperatura.sensor : '',
      fmtMin_(parametroNormativo),
      fmtMin_(limiteAprovacaoFinal),
      fmtA0_(parametroNormativo),
      fmtA0_(limiteAprovacaoFinal),
      statusLongo
    ],
    null,
    11
  );
  shConsolidado.setRowHeight(linhaTexto, 150);

  // =========================================================
  // ABA 5: DADOS BRUTOS
  // =========================================================
  const shDados = ss.insertSheet('5. DADOS BRUTOS', 4);
  textoA4Paisagem(shDados);

  shDados.setColumnWidth(1, 180);
  shDados.setColumnWidth(2, 150);
  shDados.setColumnWidth(3, 250);
  shDados.setColumnWidth(4, 140);

  const headers = ['Tempo']
    .concat(Array.from({ length: nSensoresInstalados }, function(_, i) { return 'S' + (i + 1) + ' (°C)'; }))
    .concat(['Sinal Analógico / Bomba', 'Fases e Eventos do Processo']);

  const modoExp = LavRel_valorSeguroPlanilha_(
    analise.configuracaoDeteccaoExposicao && analise.configuracaoDeteccaoExposicao.modoReconhecimentoExposicao
      ? analise.configuracaoDeteccaoExposicao.modoReconhecimentoExposicao
      : 'PIOR_SENSOR'
  );

  const fasesProcesso = analise.fasesProcesso || {};
  const fasePorIndice = fasesProcesso.fasePorIndice || {};
  const eventosPorIndice = fasesProcesso.eventosPorIndice || {};

  function corFaseProcesso_(codigo, fallback) {
    codigo = String(codigo || '').toUpperCase();
    if (codigo === 'PRE_LAVAGEM') return LavRel_UCFG.CORES.FASE_PRE_LAVAGEM;
    if (codigo === 'LAVAGEM_AQUECIMENTO') return LavRel_UCFG.CORES.FASE_LAVAGEM_TERMO;
    if (codigo === 'LAVAGEM_AQUECIMENTO_ULTRA') return LavRel_UCFG.CORES.FASE_ENCHIMENTO;
    if (codigo === 'ENXAGUE_INTERMEDIARIO') return LavRel_UCFG.CORES.FASE_ENXAGUE;
    if (codigo === 'ENXAGUE_INTERMEDIARIO_ULTRA') return LavRel_UCFG.CORES.FASE_DOSAGEM;
    if (codigo === 'DESINFECCAO_TERMICA') return LavRel_UCFG.CORES.FASE_DESINFECCAO;
    if (codigo === 'ENXAGUE_FINAL') return LavRel_UCFG.CORES.FASE_ENXAGUE;
    if (codigo === 'ENXAGUE_FINAL_ULTRA') return LavRel_UCFG.CORES.FASE_DOSAGEM;
    if (codigo === 'SECAGEM_RESFRIAMENTO') return LavRel_UCFG.CORES.FASE_SECAGEM;
    if (codigo === 'DESGASEIFICACAO') return LavRel_UCFG.CORES.FASE_DESGASEIFICACAO;
    if (codigo === 'CAVITACAO_ULTRASSOM') return LavRel_UCFG.CORES.FASE_CAVITACAO;
    if (codigo === 'DRENAGEM_FINAL') return LavRel_UCFG.CORES.FASE_DRENAGEM;
    if (codigo === 'PREPARO_INCOMPLETO') return LavRel_UCFG.CORES.REPROVADO;
    return fallback || '#ffffff';
  }

  function criterioFaseLavadoras_(codigo) {
    codigo = String(codigo || '').toUpperCase();
    if (codigo === 'PRE_LAVAGEM') return 'Entrada de água, remoção inicial de resíduos e estabilização hidráulica';
    if (codigo === 'LAVAGEM_AQUECIMENTO') return 'Ação mecânica/química com elevação controlada de temperatura';
    if (codigo === 'LAVAGEM_AQUECIMENTO_ULTRA') return 'Aquecimento e preparação do banho antes da ação ultrassônica';
    if (codigo === 'ENXAGUE_INTERMEDIARIO' || codigo === 'ENXAGUE_INTERMEDIARIO_ULTRA') return 'Renovação de banho/enxágue para remover resíduos solúveis';
    if (codigo === 'DESGASEIFICACAO') return 'Remoção de ar dissolvido para favorecer cavitação estável';
    if (codigo === 'DESINFECCAO_TERMICA') return 'Cálculo de A0 - modo ' + modoExp + ' | Tmín: ' + LavRel_txtNumPlanilha_(analise.configuracaoDeteccaoExposicao && analise.configuracaoDeteccaoExposicao.limiteInicio) + ' °C';
    if (codigo === 'CAVITACAO_ULTRASSOM') return 'Tempo efetivo de cavitação em temperatura operacional';
    if (codigo === 'ENXAGUE_FINAL' || codigo === 'ENXAGUE_FINAL_ULTRA') return 'Remoção final de detergente/resíduos e preparação para término';
    if (codigo === 'SECAGEM_RESFRIAMENTO') return 'Redução térmica, secagem e finalização segura do ciclo';
    if (codigo === 'DRENAGEM_FINAL') return 'Drenagem do banho, queda do sinal e final de ciclo';
    if (codigo === 'PREPARO_INCOMPLETO') return 'Ciclo sem fase principal válida; verificar dados e operação';
    return 'Critério de engenharia associado à fase detectada';
  }

  const segmentosLegenda = [];
  const vistosLegenda = {};
  (Array.isArray(fasesProcesso.segmentos) ? fasesProcesso.segmentos : []).forEach(function(seg) {
    const codigo = String(seg.codigo || '').toUpperCase();
    if (!codigo || vistosLegenda[codigo]) return;
    vistosLegenda[codigo] = true;
    segmentosLegenda.push({ codigo: codigo, nome: seg.nome || codigo });
  });

  if (!segmentosLegenda.length) {
    if (motor === 'TERMO') {
      segmentosLegenda.push(
        { codigo: 'PRE_LAVAGEM', nome: 'Pré-lavagem / entrada de água' },
        { codigo: 'LAVAGEM_AQUECIMENTO', nome: 'Lavagem mecânica / aquecimento' },
        { codigo: 'ENXAGUE_INTERMEDIARIO', nome: 'Enxágue intermediário' },
        { codigo: 'DESINFECCAO_TERMICA', nome: 'Desinfecção térmica - A0' },
        { codigo: 'ENXAGUE_FINAL', nome: 'Enxágue final' },
        { codigo: 'SECAGEM_RESFRIAMENTO', nome: 'Secagem / resfriamento / final de ciclo' }
      );
    } else {
      segmentosLegenda.push(
        { codigo: 'LAVAGEM_AQUECIMENTO_ULTRA', nome: 'Lavagem / aquecimento do banho' },
        { codigo: 'ENXAGUE_INTERMEDIARIO_ULTRA', nome: 'Enxágue intermediário' },
        { codigo: 'DESGASEIFICACAO', nome: 'Desgaseificação / preparo do banho' },
        { codigo: 'CAVITACAO_ULTRASSOM', nome: 'Cavitação ultrassônica' },
        { codigo: 'ENXAGUE_FINAL_ULTRA', nome: 'Enxágue final' },
        { codigo: 'DRENAGEM_FINAL', nome: 'Drenagem / final de ciclo' }
      );
    }
  }

  const legenda = [
    ['METROLABS - MAPEAMENTO DE FASES', '', '', ''],
    ['FASE', 'COR DE IDENTIFICAÇÃO', 'CRITÉRIO DE ENGENHARIA', 'STATUS']
  ];
  segmentosLegenda.forEach(function(seg, idx) {
    legenda.push([seg.nome, 'COR ' + (idx + 1), criterioFaseLavadoras_(seg.codigo), analise.faseInicioExp !== -1 ? 'OK' : 'FALHA / ABORTADO']);
  });
  legenda.push(
    ['SINAL MÍNIMO (QUANDO APLICÁVEL)', exibePressao ? fmtBarAbs_(globalPres.min) : 'N/A', 'Menor sinal medido no ciclo', 'OK'],
    ['SINAL MÁXIMO (QUANDO APLICÁVEL)', exibePressao ? fmtBarAbs_(globalPres.max) : 'N/A', 'Maior sinal medido no ciclo', 'OK']
  );

  const legendaRows = legenda.length;
  shDados.getRange(1, 1, legendaRows, 4)
    .setValues(legenda)
    .setWrap(true)
    .setVerticalAlignment('middle')
    .setFontWeight('bold')
    .setFontSize(9);

  aplicarBorda(shDados.getRange(1, 1, legendaRows, 4));

  shDados.getRange('A1:D1').merge();
  estiloCabecalhoEscuro(shDados.getRange('A1:D1'));

  shDados.getRange('A2:D2')
    .setBackground('#e2e8f0')
    .setFontWeight('bold');

  segmentosLegenda.forEach(function(seg, idx) {
    shDados.getRange(3 + idx, 2).setBackground(corFaseProcesso_(seg.codigo, '#ffffff'));
  });

  shDados.getRange(2, 4, Math.max(1, legendaRows - 1), 1)
    .setWrap(false)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  shDados.getRange(2, 1, Math.max(1, legendaRows - 1), 3)
    .setWrap(true)
    .setVerticalAlignment('middle');

  for (let r = 1; r <= legendaRows; r++) {
    shDados.setRowHeight(r, r === 1 ? 32 : (r === 2 ? 34 : 36));
  }

  let headerRow = legendaRows + 1;
  if (relatorioSimulado) {
    shDados.getRange(headerRow, 1, 1, 4)
      .merge()
      .setValue(avisoSimulado)
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shDados.getRange(headerRow, 1, 1, 4));
    shDados.setRowHeight(headerRow, 42);
    headerRow++;
  }

  shDados.getRange(headerRow, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(LavRel_UCFG.CORES.CHUMBO)
    .setFontColor(LavRel_UCFG.CORES.TEXTO_BRANCO)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const dataStartRow = headerRow + 1;

  const rows = [];
  const colors = [];

  dados.forEach(function(d, i) {
    let cor = '#ffffff';
    let eventoTexto = '';

    if (eventosPorIndice && eventosPorIndice[i]) {
      eventoTexto = '-> ' + eventosPorIndice[i];
    } else if (i === idxInicioCiclo) {
      eventoTexto = '-> INÍCIO DO CICLO';
    }

    if (i === idxFimCiclo || i === dados.length - 1) {
      eventoTexto = eventoTexto
        ? (eventoTexto + ' | -> TÉRMINO DO CICLO / FIM DA GRAVAÇÃO')
        : '-> TÉRMINO DO CICLO / FIM DA GRAVAÇÃO';
    }

    if (fasePorIndice && fasePorIndice[i]) {
      cor = corFaseProcesso_(fasePorIndice[i], cor);
    } else if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && i >= analise.faseInicioExp && i <= analise.faseFimExp) {
      cor = motor === 'TERMO' ? LavRel_UCFG.CORES.FASE_DESINFECCAO : LavRel_UCFG.CORES.FASE_CAVITACAO;
    } else if (analise.faseInicioRampa !== -1 && analise.faseInicioExp !== -1 && i >= analise.faseInicioRampa && i < analise.faseInicioExp) {
      cor = motor === 'TERMO' ? LavRel_UCFG.CORES.FASE_LAVAGEM_TERMO : LavRel_UCFG.CORES.FASE_DESGASEIFICACAO;
    } else if (analise.faseInicioRampa !== -1 && analise.faseInicioExp === -1 && i >= analise.faseInicioRampa) {
        // Se abortou, a partir do preparo até o fim, usa cor de falha ou preparo inacabado
        cor = LavRel_UCFG.CORES.REPROVADO; 
    } else if (LavRel_valorNumericoOuNuloPlanilha_(d.pressao) !== null && LavRel_valorNumericoOuNuloPlanilha_(d.pressao) < 1.0 && (analise.faseInicioExp === -1 || i < analise.faseInicioExp)) {
      cor = motor === 'TERMO' ? LavRel_UCFG.CORES.FASE_PRE_LAVAGEM : LavRel_UCFG.CORES.FASE_ENCHIMENTO; 
    } else if (analise.faseFimExp !== -1 && i > analise.faseFimExp) {
      cor = motor === 'TERMO' ? LavRel_UCFG.CORES.FASE_SECAGEM : LavRel_UCFG.CORES.FASE_DRENAGEM;
    }

    const temps = (d.temperaturas || []).map(function(t) {
      const num = LavRel_valorNumericoOuNuloPlanilha_(t);
      return num === null ? '' : num;
    });

    const pressaoNum = LavRel_valorNumericoOuNuloPlanilha_(d.pressao);

    rows.push(
      [LavRel_normalizarTempoPlanilha_(d.tempoDate || d.tempoStr)]
        .concat(temps)
        .concat([pressaoNum === null ? '' : pressaoNum, eventoTexto])
    );

    colors.push(new Array(headers.length).fill(cor));
  });

  if (rows.length) {
    shDados.getRange(dataStartRow, 1, rows.length, headers.length)
      .setValues(rows)
      .setBackgrounds(colors)
      .setWrap(true)
      .setFontWeight('normal');

    if (nSensoresInstalados > 0) {
      shDados.getRange(dataStartRow, 2, rows.length, nSensoresInstalados).setNumberFormat('0.00');
    }

    shDados.getRange(dataStartRow, nSensoresInstalados + 2, rows.length, 1).setNumberFormat('0.000');

    shDados.getRange(dataStartRow, headers.length, rows.length, 1)
      .setFontWeight('bold')
      .setFontColor('#374151');
  }

  shDados.setFrozenRows(headerRow);
  shDados.setColumnWidth(headers.length, 360);

  if (ss.getSheetByName('Página1')) ss.deleteSheet(ss.getSheetByName('Página1'));
  if (ss.getSheetByName('Sheet1')) ss.deleteSheet(ss.getSheetByName('Sheet1'));

  SpreadsheetApp.flush();

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

/** Número que vira texto na planilha: pt-BR (vírgula decimal, ponto no milhar); vazio fica vazio. */
function LavRel_txtNumPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  var t = SGO_DocA4_num_(valor);
  return t === '—' ? String(valor) : t;
}

function LavRel_valorSeguroPlanilha_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function LavRel_valorNumericoSeguroPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : 0;
}

function LavRel_valorNumericoOuNuloPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : null;
}

function LavRel_numeroInteiroSeguroPlanilha_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  const n = parseInt(valor, 10);
  return isFinite(n) ? n : fallback;
}

function LavRel_normalizarTempoPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, LavRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }

  if (typeof valor === 'string') {
    const s = valor.trim();
    if (!s) return '-';

    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
      return s;
    }

    const tentativaIso = new Date(s);
    if (!isNaN(tentativaIso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return Utilities.formatDate(tentativaIso, LavRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
    }

    return s;
  }

  try {
    const d = new Date(valor);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, LavRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
    }
  } catch (e) {}

  return String(valor);
}