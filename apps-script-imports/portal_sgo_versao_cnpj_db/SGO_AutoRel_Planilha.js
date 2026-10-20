/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — V4.4
 * ARQUIVO: Planilha.gs
 * DESCRIÇÃO:
 * Dashboard ONA/VISA A4 Paisagem, conclusões,
 * consolidação e dados brutos ajustados para PDF.
 *
 * REVISÕES V4.4:
 * - corrige padronização de horário no relatório
 * - melhora posicionamento da assinatura na conclusão
 * - usa tempo do conjunto realmente analisado
 * - evita duplicação indevida de offset de temperatura
 * - separa estatística global do ciclo e da exposição
 * - trata APROVADO / REPROVADO (sem "aprovado com alerta")
 * - melhora textos técnicos e consistência temporal
 * - tabela consolidada compatível com sensores excluídos
 * - blindagem extra contra campos ausentes
 ****************************************************/

function AutoRel_gerarPlanilhaAuditoria(dados, analise, payload) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado foi recebido para geração da planilha.');
  }

  payload = payload || {};
  analise = analise || {};
  const relatorioSimulado = !!payload.modoRelatorioSimulado;
  // Ensaio só de temperatura (20/10/2026): nada de pressão na planilha (sem campo vazio, coluna ou texto).
  const semPressaoPlan = !!(typeof analise !== 'undefined' && analise && analise.semPressao);
  const metaSimulacao = payload._simulacaoMeta || {};

  const motor = String(payload.motor || '134').trim();
  const cfg = AutoRel_UCFG && AutoRel_UCFG.CICLOS ? AutoRel_UCFG.CICLOS[motor] : null;

  if (!cfg) {
    throw new Error('Configuração normativa não encontrada para o ciclo: ' + motor);
  }

  const nomeArquivo = 'METROLABS_AUDITORIA_' + motor + 'C_' +
    Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'ddMMyyyy_HHmm');

  const ss = SpreadsheetApp.create(nomeArquivo);

  try {
    const folderId = (AutoRel_UCFG.LAUDOS_FOLDER_ID && String(AutoRel_UCFG.LAUDOS_FOLDER_ID).length > 10)
      ? AutoRel_UCFG.LAUDOS_FOLDER_ID
      : '';

    if (folderId) {
      // Pasta configurada ou, se ela não existir (Google Drive antigo), a pasta própria de laudos (20/10/2026).
      const file = DriveApp.getFileById(ss.getId());
      const folder = SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', folderId);
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
      ? AutoRel_UCFG.CORES.REPROVADO
      : AutoRel_UCFG.CORES.APROVADO;

  const idxInicioCiclo = AutoRel_numeroInteiroSeguroPlanilha_(analise.indiceInicioCiclo, 0);
  const idxFimCiclo = AutoRel_numeroInteiroSeguroPlanilha_(analise.indiceFimCiclo, dados.length - 1);

  const linhaInicioCiclo = dados[Math.max(0, Math.min(dados.length - 1, idxInicioCiclo))] || dados[0];
  const linhaFimCiclo = dados[Math.max(0, Math.min(dados.length - 1, idxFimCiclo))] || dados[dados.length - 1];

  const dataInicio = AutoRel_normalizarTempoPlanilha_(
    analise.tempoInicioCiclo || (linhaInicioCiclo ? (linhaInicioCiclo.tempoDate || linhaInicioCiclo.tempoStr) : '-')
  );
  const dataFim = AutoRel_normalizarTempoPlanilha_(
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

  const mediaTempGeral = AutoRel_valorNumericoSeguroPlanilha_(globalTemp.media);
  const mediaTempExposicao = AutoRel_valorNumericoSeguroPlanilha_(exposicaoTemp.media);
  const mediaPresGeral = AutoRel_valorNumericoSeguroPlanilha_(globalPres.media);

  const sensoresUtilizados = Array.isArray(analise.sensoresUtilizados) ? analise.sensoresUtilizados : [];
  const sensoresDesabilitados = Array.isArray(analise.sensoresDesabilitados) ? analise.sensoresDesabilitados : [];
  const qtdSensoresUtilizados = AutoRel_valorNumericoSeguroPlanilha_(analise.quantidadeSensoresUtilizados);
  const qtdSensoresInstalados = AutoRel_valorNumericoSeguroPlanilha_(analise.quantidadeSensoresInstalados) || nSensoresInstalados;

  const piorSensorF0 = analise.piorSensorF0 || null;
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

  const limitesAprovacao = analise.limitesAprovacao || {};
  const f0MinNormativo = AutoRel_valorNumericoSeguroPlanilha_(limitesAprovacao.f0MinNormativo || cfg.f0MinNormativo || cfg.f0Min || 0);
  const f0MinOperacional = AutoRel_valorNumericoSeguroPlanilha_(limitesAprovacao.f0MinOperacional || cfg.f0MinOperacional || cfg.f0Min || 0);
  const toleranciaF0 = AutoRel_valorNumericoSeguroPlanilha_(limitesAprovacao.toleranciaF0 || cfg.toleranciaF0 || 0);
  const limiteAprovacaoF0 = AutoRel_valorNumericoSeguroPlanilha_(
    limitesAprovacao.limiteAprovacaoF0 || Math.max(0, f0MinOperacional - toleranciaF0)
  );

  function aplicarBorda(rg) {
    rg.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function estiloCabecalhoEscuro(rg) {
    rg.setBackground(AutoRel_UCFG.CORES.CHUMBO)
      .setFontColor(AutoRel_UCFG.CORES.TEXTO_BRANCO)
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
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 3) + ' BAR ABS';
  }

  function fmtTemp_(valor) {
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 2) + ' °C';
  }

  function fmtMin_(valor) {
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 2) + ' MIN';
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

  function formatarResumoFasesAuto_(resumo) {
    resumo = resumo || {};
    return 'O mapeamento operacional identificado foi:\n' + [
      '- Pré-vácuo: ' + AutoRel_resumoPreVacuoPlanilha_(analise),
      '- Rampa de aquecimento: iniciada em ' + AutoRel_valorSeguroPlanilha_(resumo.inicioRampa || '-'),
      '- Esterilização / exposição: ' + AutoRel_valorSeguroPlanilha_(resumo.inicioEsterilizacao || '-') + ' a ' + AutoRel_valorSeguroPlanilha_(resumo.fimEsterilizacao || '-'),
      '- Vácuo pós-exposição: ' + (resumo.secagemDetectada ? 'observado' : 'não observado'),
      '- Despressurização: ' + (resumo.despressurizacaoDetectada ? 'detectada' : 'não detectada')
    ].join('\n');
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
    .setValue('RELATÓRIO DE QUALIFICAÇÃO TÉRMICA E VALIDAÇÃO DE PROCESSOS\nMETROLABS - ENGENHARIA CLÍNICA')
    .setFontSize(13);

  estiloCabecalhoEscuro(shCapa.getRange('A1:F2'));
  shCapa.setRowHeight(1, 30);
  shCapa.setRowHeight(2, 34);

  if (relatorioSimulado) {
    shCapa.getRange('A3:F3')
      .merge()
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA | ' + AutoRel_valorSeguroPlanilha_(metaSimulacao.geradoEm))
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    shCapa.setRowHeight(3, 42);
  }

  shCapa.getRange('A4:C4').merge().setValue('IDENTIFICAÇÃO DO CLIENTE');
  shCapa.getRange('D4:F4').merge().setValue('IDENTIFICAÇÃO DO EQUIPAMENTO');
  estiloCabecalhoClaro(shCapa.getRange('A4:C4'));
  estiloCabecalhoClaro(shCapa.getRange('D4:F4'));

  const infoMatriz = [
    ['CLIENTE:', AutoRel_valorSeguroPlanilha_(payload.cliente), '', 'TAG / CÓDIGO:', AutoRel_valorSeguroPlanilha_(payload.tag), ''],
    ['CNPJ:', AutoRel_valorSeguroPlanilha_(payload.cnpj), '', 'MARCA:', AutoRel_valorSeguroPlanilha_(payload.marca), ''],
    ['ENDEREÇO:', AutoRel_valorSeguroPlanilha_(payload.endereco), '', 'MODELO:', AutoRel_valorSeguroPlanilha_(payload.modelo), ''],
    ['TIPO DE ENSAIO:', AutoRel_valorSeguroPlanilha_(payload.ensaio), '', 'NÚMERO DE SÉRIE:', AutoRel_valorSeguroPlanilha_(payload.numSerie), ''],
    ['RECEITA / CICLO Nº:', AutoRel_valorSeguroPlanilha_(payload.programa) + ' (CICLO ' + AutoRel_valorSeguroPlanilha_(payload.cicloNum) + ')', '', 'LOTE DA CARGA:', AutoRel_valorSeguroPlanilha_(payload.lote), ''],
    ['TEMP. PROGRAMADA:', AutoRel_txtNumPlanilha_(payload.setpoint) + ' °C', '', 'LOCALIZAÇÃO:', AutoRel_valorSeguroPlanilha_(payload.local), ''],
    ['INÍCIO DO CICLO:', dataInicio, '', 'TÉRMINO DO CICLO:', dataFim, ''],
    ['TEMPO TOTAL:', AutoRel_txtNumPlanilha_(analise.tempoTotalMinutos) + ' MINUTOS', '', 'TEMPO EM PLATÔ:', AutoRel_txtNumPlanilha_(analise.tempoExposicaoMinutos) + ' MINUTOS', '']
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

  const criterioTxt =
    'CRITÉRIO: F0 ≥ ' + SGO_DocA4_num_(limiteAprovacaoF0, 2) + ' MIN EM TODOS OS SENSORES ATIVOS (MÍNIMO NORMATIVO)';

  const sensoresResumoTxt = qtdSensoresUtilizados + ' DE ' + qtdSensoresInstalados + ' PONTOS';

  const resMatriz = [
    ['F0 MÍNIMO OBTIDO:', fmtMin_(analise.minF0), 'F0 MÉDIO DA CÂMARA:', fmtMin_(analise.mediaF0), 'F0 MÁXIMO OBTIDO:', fmtMin_(analise.maxF0)],
    ['TEMP. MÍNIMA EXP.:', fmtTemp_(exposicaoTemp.min), 'TEMP. MÉDIA EXP.:', fmtTemp_(mediaTempExposicao), 'TEMP. MÁXIMA EXP.:', fmtTemp_(exposicaoTemp.max)],
    semPressaoPlan
      ? ['PATAMAR AVALIADO:', fmtMin_(((analise.criteriosPatamar || {}).patamar || {}).duracaoMin), 'INTERVALO DE LEITURA:', AutoRel_txtNumPlanilha_(Number(analise.deltaMinutosEstimado) * 60) + ' S', 'PIOR SENSOR (F0):', analise.piorSensorF0 ? analise.piorSensorF0.sensor : '—']
      : ['PRESSÃO MÍNIMA:', fmtBarAbs_(globalPres.min), 'PRESSÃO MÉDIA:', fmtBarAbs_(mediaPresGeral), 'PRESSÃO MÁXIMA:', fmtBarAbs_(globalPres.max)],
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
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shConclusao.getRange('A3'));
    shConclusao.setRowHeight(3, 34);
  }

  const isVapor = (motor === '134' || motor === '121' || motor === '127');
  const motorText = isVapor ? 'CALOR ÚMIDO / VAPOR SATURADO' : 'BAIXA TEMPERATURA';
  const normaText = isVapor
    ? 'ABNT NBR ISO 17665 E RDC 15/2012 (ANVISA)'
    : 'AAMI / ISO 11135 E RDC 15/2012 (ANVISA)';

  let txtP1 = '';
  if (statusAprovacao === 'REPROVADO') {
    txtP1 =
      'Os dados do ensaio (' + motorText + ') foram processados pelos critérios configurados pela empresa executante (referências: ' + normaText + ').\n\n' +
      'A janela de exposição identificada durou ' + AutoRel_txtNumPlanilha_(analise.tempoExposicaoMinutos) + ' minutos. O F0 médio calculado foi de ' + fmtMin_(analise.mediaF0) +
      ' e o menor valor, de ' + fmtMin_(analise.minF0) + '. O ciclo foi reprovado: ' +
      ((analise.motivosReprovacao && analise.motivosReprovacao.length) ? analise.motivosReprovacao.join(' ') : 'critério de aceitação não atendido.');
  } else {
    txtP1 =
      'Os dados do ensaio (' + motorText + ') foram processados pelos critérios configurados pela empresa executante (referências: ' + normaText + ').\n\n' +
      'A exposição identificada durou ' + AutoRel_txtNumPlanilha_(analise.tempoExposicaoMinutos) + ' minutos, com os critérios do patamar atendidos. ' +
      'A letalidade térmica apresentou F0 médio de ' + fmtMin_(analise.mediaF0) +
      ', sendo o pior caso igual a ' + fmtMin_(analise.minF0) +
      ', atendendo ao critério configurado do processo.';
  }

  const resumoFasesAuto = (analise.fasesProcesso && analise.fasesProcesso.resumo) ? analise.fasesProcesso.resumo : {};
  if (txtP1) {
    txtP1 += semPressaoPlan
      ? '\n\nA leitura técnica considerou a temperatura de cada sensor ativo, o pior sensor, a estabilidade da exposição e a letalidade acumulada.'
      : '\n\nA leitura técnica considerou simultaneamente temperatura, pressão, pior sensor ativo, estabilidade da exposição e letalidade acumulada.\n\n' + formatarResumoFasesAuto_(resumoFasesAuto);
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
      AutoRel_txtNumPlanilha_(analise.tempoExposicaoMinutos) + ' minutos',
      fmtMin_(analise.mediaF0),
      fmtMin_(analise.minF0),
      fmtMin_(limiteAprovacaoF0),
      fmtMin_(f0MinNormativo)
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
    .setValue((AutoRel_valorSeguroPlanilha_(payload.respTecnico) || 'TÉCNICO EXECUTOR') + ' - TÉCNICO EXECUTOR DO ENSAIO')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');

  let txtP2 = '';
  if (statusAprovacao === 'REPROVADO') {
    txtP2 =
      'Parecer final da engenharia clínica: REPROVADO.\n\n' +
      'Foram identificadas não conformidades nos sensores ativos monitorados.\n\n' +
      'Motivos técnicos da reprovação:\n' + textoLista(motivosReprovacao, 'Nenhum motivo registrado.') + '\n\n' +
      (alertasAnalise.length ? 'Registros técnicos adicionais:\n' + textoLista(alertasAnalise, '') + '\n\n' : '') +
      'O equipamento deve passar por avaliação técnica, revisão do processo e nova qualificação antes de liberação operacional.';
  } else {
    txtP2 =
      'Parecer final da engenharia clínica: APROVADO.\n\n' +
      'Todos os critérios configurados para os sensores ativos foram atendidos. ' +
      'O processo demonstrou desempenho compatível com o nível de letalidade térmica requerido e com os critérios térmicos avaliados.\n\n' +
      (proximoDoLimite ? 'Observação: o F0 mínimo ficou acima do mínimo normativo, porém próximo do limite; o ponto está registrado nas observações e deve ser acompanhado nas próximas requalificações.\n\n' : '') +
      (alertasAnalise.length ? 'Registros técnicos sem impacto no resultado:\n' + textoLista(alertasAnalise, '') + '\n\n' : '') +
      'Critérios térmicos atendidos para o ciclo analisado.';
  }

  txtP2 += '\n\nInterpretação operacional: a classificação apresentada resulta dos critérios térmicos e de letalidade configurados. ' + (semPressaoPlan ? 'O F0 e os critérios de temperatura não demonstram, isoladamente, a remoção do ar da câmara, que depende de ensaio específico. ' : 'A remoção de ar e o comportamento pós-exposição são descritos separadamente pelas evidências disponíveis; não decorrem automaticamente do F0. ') + 'A liberação rotineira requer avaliação técnica do processo e dos demais controles aplicáveis.';

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
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
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
      'Critérios térmicos atendidos',
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
    .setValue((AutoRel_valorSeguroPlanilha_(payload.respTecnico) || 'TÉCNICO EXECUTOR') + ' - TÉCNICO EXECUTOR DO ENSAIO')
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

  shConsolidado.getRange('A3:H3')
    .setValues([['SENSOR ID', 'STATUS', 'F0 ACUMULADO', 'TEMP. MÍN. EXP.', 'TEMP. MÉDIA EXP.', 'TEMP. MÁX. EXP.'].concat(semPressaoPlan ? ['MÚLTIPLO DO F0 MÍNIMO', 'SITUAÇÃO DO F0'] : ['PRESSÃO MÍN', 'PRESSÃO MÁX'])])
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

    const f0Sensor = Array.isArray(analise.f0PorSensor) && analise.f0PorSensor[s] !== null && analise.f0PorSensor[s] !== undefined
      ? SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(analise.f0PorSensor[s]), 2)
      : 'DESCONSIDERADO';

    linhasConsolidado.push([
      'SENSOR ' + (s + 1),
      ativo ? 'ATIVO' : 'DESABILITADO',
      f0Sensor,
      ativo ? fmtTemp_(statsSensor.minExposicao !== null ? statsSensor.minExposicao : statsSensor.min) : 'DESCONSIDERADO',
      ativo ? fmtTemp_(statsSensor.mediaExposicao !== null ? statsSensor.mediaExposicao : statsSensor.media) : 'DESCONSIDERADO',
      ativo ? fmtTemp_(statsSensor.maxExposicao !== null ? statsSensor.maxExposicao : statsSensor.max) : 'DESCONSIDERADO'
    ].concat(semPressaoPlan ? [
      ativo && limiteAprovacaoF0 > 0 && isFinite(Number(analise.f0PorSensor[s])) ? AutoRel_txtNumPlanilha_(Number(analise.f0PorSensor[s]) / limiteAprovacaoF0) + '×' : 'DESCONSIDERADO',
      ativo && isFinite(Number(analise.f0PorSensor[s])) ? (Number(analise.f0PorSensor[s]) >= limiteAprovacaoF0 ? 'ATENDE' : 'ABAIXO DO MÍNIMO') : 'DESCONSIDERADO'
    ] : [
      ativo ? fmtBarAbs_(globalPres.min) : 'DESCONSIDERADO',
      ativo ? fmtBarAbs_(globalPres.max) : 'DESCONSIDERADO'
    ]));
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

  const piorF0Txt = piorSensorF0
    ? ('Pior sensor de F0: ' + piorSensorF0.sensor + ' (' + fmtMin_(piorSensorF0.valor) + ').')
    : 'Pior sensor de F0: não identificado.';

  const piorTempTxt = piorSensorTemperatura
    ? ('Pior sensor térmico na exposição: ' + piorSensorTemperatura.sensor + ' (' + fmtTemp_(piorSensorTemperatura.valor) + ' mínima).')
    : 'Pior sensor térmico na exposição: não identificado.';

  const txtInterpretacao =
    'INTERPRETAÇÃO ESTATÍSTICA DOS DADOS:\n\n' +
    resumoSensores + '\n' +
    piorF0Txt + '\n' +
    piorTempTxt + '\n' +
    'F0 normativo de referência: ' + fmtMin_(f0MinNormativo) + '. ' +
    'Critério de aprovação: F0 mínimo de ' + fmtMin_(limiteAprovacaoF0) + ' em todos os sensores ativos. ' +
    'Status final do ciclo: ' + statusLongo + '.';

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
      piorSensorF0 ? piorSensorF0.sensor : '',
      piorSensorTemperatura ? piorSensorTemperatura.sensor : '',
      fmtMin_(f0MinNormativo),
      fmtMin_(limiteAprovacaoF0),
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
    .concat(semPressaoPlan ? ['Fases e Eventos do Processo'] : ['Pressão (bar abs)', 'Fases e Eventos do Processo']);

  const modoExp = AutoRel_valorSeguroPlanilha_(
    analise.configuracaoDeteccaoExposicao && analise.configuracaoDeteccaoExposicao.modoReconhecimentoExposicao
      ? analise.configuracaoDeteccaoExposicao.modoReconhecimentoExposicao
      : 'PIOR_SENSOR'
  );

  const qtdPulsosPreVacuoPlanilha = analise.fasesProcesso && analise.fasesProcesso.resumo ? Number(analise.fasesProcesso.resumo.pulsosPreVacuo || 0) : 0;

  const legenda = [
    [relatorioSimulado ? 'METROLABS - MAPEAMENTO DE FASES | ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA' : 'METROLABS - MAPEAMENTO DE FASES', '', '', ''],
    ['FASE', 'COR DE IDENTIFICAÇÃO', 'CRITÉRIO DE ENGENHARIA', 'STATUS']
  ].concat(semPressaoPlan ? [
    ['AQUECIMENTO', 'COR 2', 'ELEVAÇÃO DE TEMPERATURA ATÉ A EXPOSIÇÃO', 'OK'],
    ['ESTERILIZAÇÃO / EXPOSIÇÃO', 'COR 3', 'MODO ' + modoExp + ' | LIMIAR DE INÍCIO: ' + AutoRel_txtNumPlanilha_(analise.configuracaoDeteccaoExposicao && analise.configuracaoDeteccaoExposicao.limiteInicio) + ' °C', 'OK'],
    ['RESFRIAMENTO', 'SEM COR', 'TEMPERATURA ABAIXO DA FAIXA DEPOIS DA EXPOSIÇÃO', 'OBSERVACIONAL'],
    ['TEMPERATURA MÍNIMA NA EXPOSIÇÃO', fmtTemp_(exposicaoTemp.min), 'MENOR LEITURA DOS SENSORES ATIVOS', 'OK'],
    ['TEMPERATURA MÁXIMA NA EXPOSIÇÃO', fmtTemp_(exposicaoTemp.max), 'MAIOR LEITURA DOS SENSORES ATIVOS', 'OK'],
    ['F0 MÍNIMO (PIOR SENSOR)', fmtMin_(analise.minF0), 'MÍNIMO EXIGIDO: ' + fmtMin_(limiteAprovacaoF0), analise.minF0 >= limiteAprovacaoF0 ? 'OK' : 'ABAIXO DO MÍNIMO']
  ] : [
    ['PRÉ-VÁCUO OBSERVADO', 'COR 1', 'QUEDA ABAIXO DA REFERÊNCIA ATMOSFÉRICA + RECUPERAÇÃO; CRITÉRIOS OBSERVACIONAIS', AutoRel_resumoPreVacuoPlanilha_(analise)],
    ['RAMPA DE AQUECIMENTO', 'COR 2', 'ELEVAÇÃO DE TEMPERATURA E PRESSÃO', 'OK'],
    ['ESTERILIZAÇÃO / EXPOSIÇÃO', 'COR 3', 'MODO ' + modoExp + ' | LIMIAR DE INÍCIO: ' + AutoRel_txtNumPlanilha_(analise.configuracaoDeteccaoExposicao && analise.configuracaoDeteccaoExposicao.limiteInicio) + ' °C', 'OK'],
    ['SECAGEM / DESPRESSURIZAÇÃO', 'COR 4', 'VÁCUO PÓS-EXPOSIÇÃO (QUANDO OBSERVADO) / RETORNO DE PRESSÃO', 'OBSERVACIONAL'],
    ['PRESSÃO MÍNIMA DO PROCESSO', fmtBarAbs_(globalPres.min), 'MENOR PRESSÃO MEDIDA NO CICLO', 'OK'],
    ['PRESSÃO MÁXIMA DO PROCESSO', fmtBarAbs_(globalPres.max), 'MAIOR PRESSÃO MEDIDA NO CICLO', 'OK']
  ]);

  shDados.getRange('A1:D8')
    .setValues(legenda)
    .setWrap(true)
    .setVerticalAlignment('middle')
    .setFontWeight('bold')
    .setFontSize(9);

  aplicarBorda(shDados.getRange('A1:D8'));

  shDados.getRange('A1:D1').merge();
  estiloCabecalhoEscuro(shDados.getRange('A1:D1'));

  shDados.getRange('A2:D2')
    .setBackground('#e2e8f0')
    .setFontWeight('bold');

  shDados.getRange('B3').setBackground(AutoRel_UCFG.CORES.FASE_VACUO);
  shDados.getRange('B4').setBackground(AutoRel_UCFG.CORES.FASE_RAMPA);
  shDados.getRange('B5').setBackground(AutoRel_UCFG.CORES.FASE_EXPOSICAO);
  shDados.getRange('B6').setBackground(AutoRel_UCFG.CORES.FASE_SECAGEM);

  shDados.getRange('D2:D8')
    .setWrap(false)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  shDados.getRange('A2:C8')
    .setWrap(true)
    .setVerticalAlignment('middle');

  for (let r = 1; r <= 8; r++) {
    shDados.setRowHeight(r, 30);
  }
  shDados.setRowHeight(1, 32);
  shDados.setRowHeight(2, 34);

  AutoRel_garantirGradeDadosPlanilha_(shDados, dados.length + 10, headers.length);
  shDados.getRange(10, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(AutoRel_UCFG.CORES.CHUMBO)
    .setFontColor(AutoRel_UCFG.CORES.TEXTO_BRANCO)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const rows = [];
  const colors = [];
  const fasesProcessoPlanilha = analise && analise.fasesProcesso ? analise.fasesProcesso : null;

  dados.forEach(function(d, i) {
    let cor = '#ffffff';
    let eventoTexto = '';

    const faseAtual = fasesProcessoPlanilha && fasesProcessoPlanilha.fasePorIndice
      ? String(fasesProcessoPlanilha.fasePorIndice[String(i)] || '')
      : '';
    const eventosFase = fasesProcessoPlanilha && fasesProcessoPlanilha.eventosPorIndice
      ? (fasesProcessoPlanilha.eventosPorIndice[String(i)] || [])
      : [];

    if (eventosFase.length) {
      eventoTexto = eventosFase.join(' | ');
    } else if (!fasesProcessoPlanilha) {
      if (i === idxInicioCiclo) eventoTexto = 'INÍCIO DO CICLO';
      if (i === analise.faseInicioRampa && analise.faseInicioRampa > 0) eventoTexto = 'INÍCIO DA RAMPA DE AQUECIMENTO';
      if (i === analise.faseInicioExp && analise.faseInicioExp !== -1) eventoTexto = 'INÍCIO DA ESTERILIZAÇÃO / EXPOSIÇÃO';
      if (i === analise.faseFimExp && analise.faseFimExp !== -1) eventoTexto = 'TÉRMINO DA ESTERILIZAÇÃO / EXPOSIÇÃO';
      if (analise.faseFimExp !== -1 && i === analise.faseFimExp + 1) eventoTexto = 'INÍCIO DA DESPRESSURIZAÇÃO / SECAGEM';
      if (i === idxFimCiclo || i === dados.length - 1) {
        eventoTexto = eventoTexto
          ? (eventoTexto + ' | TÉRMINO DO CICLO / FIM DA GRAVAÇÃO')
          : 'TÉRMINO DO CICLO / FIM DA GRAVAÇÃO';
      }
    }

    if (faseAtual) {
      cor = AutoRel_corFaseProcessoPlanilha_(faseAtual, '#ffffff');
    } else if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && i >= analise.faseInicioExp && i <= analise.faseFimExp) {
      cor = AutoRel_UCFG.CORES.FASE_EXPOSICAO;
    } else if (analise.faseInicioRampa !== -1 && analise.faseInicioExp !== -1 && i >= analise.faseInicioRampa && i < analise.faseInicioExp) {
      cor = AutoRel_UCFG.CORES.FASE_RAMPA;
    } else if (AutoRel_valorNumericoOuNuloPlanilha_(d.pressao) !== null && AutoRel_valorNumericoOuNuloPlanilha_(d.pressao) < 1.0 && (analise.faseInicioExp === -1 || i < analise.faseInicioExp)) {
      cor = AutoRel_UCFG.CORES.FASE_VACUO;
    } else if (analise.faseFimExp !== -1 && i > analise.faseFimExp) {
      cor = AutoRel_UCFG.CORES.FASE_SECAGEM;
    }

    const temps = (d.temperaturas || []).map(function(t) {
      const num = AutoRel_valorNumericoOuNuloPlanilha_(t);
      return num === null ? '' : num;
    });

    const pressaoNum = AutoRel_valorNumericoOuNuloPlanilha_(d.pressao);

    rows.push(
      [AutoRel_normalizarTempoPlanilha_(d.tempoDate || d.tempoStr)]
        .concat(temps)
        .concat(semPressaoPlan ? [eventoTexto] : [pressaoNum === null ? '' : pressaoNum, eventoTexto])
    );

    colors.push(new Array(headers.length).fill(cor));
  });

  if (rows.length) {
    shDados.getRange(11, 1, rows.length, headers.length)
      .setValues(rows)
      .setBackgrounds(colors)
      .setWrap(true)
      .setFontWeight('normal');

    if (nSensoresInstalados > 0) {
      shDados.getRange(11, 2, rows.length, nSensoresInstalados).setNumberFormat('0.00');
    }

    shDados.getRange(11, nSensoresInstalados + 2, rows.length, 1).setNumberFormat('0.000');

    shDados.getRange(11, headers.length, rows.length, 1)
      .setFontWeight('bold')
      .setFontColor('#374151');
  }

  shDados.setFrozenRows(10);
  shDados.setColumnWidth(headers.length, 360);

  if (ss.getSheetByName('Página1')) ss.deleteSheet(ss.getSheetByName('Página1'));
  if (ss.getSheetByName('Sheet1')) ss.deleteSheet(ss.getSheetByName('Sheet1'));

  SpreadsheetApp.flush();

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

// ------------------------------------------------------------
// PLANILHA DO LEAK TEST / TESTE DE ESTANQUEIDADE
//
// Reaproveita os helpers de módulo já existentes (AutoRel_valorSeguroPlanilha_,
// AutoRel_valorNumericoOuNuloPlanilha_, AutoRel_normalizarTempoPlanilha_, etc.) e segue
// o mesmo padrão visual A4 paisagem do laudo de ciclo térmico. Não
// altera AutoRel_gerarPlanilhaAuditoria nem nenhuma outra função existente.
// ------------------------------------------------------------
function AutoRel_gerarPlanilhaLeakTest_(dados, analiseLeak, payload) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado foi recebido para geração da planilha do teste de estanqueidade.');
  }

  payload = payload || {};
  analiseLeak = analiseLeak || {};

  const relatorioSimulado = !!payload.modoRelatorioSimulado;
  // Ensaio só de temperatura (20/10/2026): nada de pressão na planilha (sem campo vazio, coluna ou texto).
  const semPressaoPlan = !!(typeof analise !== 'undefined' && analise && analise.semPressao);
  const metaSimulacao = payload._simulacaoMeta || {};

  const nomeArquivo = 'METROLABS_LEAKTEST_' +
    Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'ddMMyyyy_HHmm');

  const ss = SpreadsheetApp.create(nomeArquivo);

  try {
    const folderId = (AutoRel_UCFG.LAUDOS_FOLDER_ID && String(AutoRel_UCFG.LAUDOS_FOLDER_ID).length > 10)
      ? AutoRel_UCFG.LAUDOS_FOLDER_ID
      : '';

    if (folderId) {
      // Pasta configurada ou, se ela não existir (Google Drive antigo), a pasta própria de laudos (20/10/2026).
      const file = DriveApp.getFileById(ss.getId());
      const folder = SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', folderId);
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

  const statusAprovacao = String(analiseLeak.statusAprovacao || (analiseLeak.aprovado ? 'APROVADO' : 'REPROVADO')).toUpperCase();
  const statusCor = statusAprovacao === 'REPROVADO' ? AutoRel_UCFG.CORES.REPROVADO : AutoRel_UCFG.CORES.APROVADO;

  const idxInicio = AutoRel_numeroInteiroSeguroPlanilha_(analiseLeak.indiceInicio, 0);
  const idxFim = AutoRel_numeroInteiroSeguroPlanilha_(analiseLeak.indiceFim, dados.length - 1);

  const motivosReprovacao = Array.isArray(analiseLeak.motivosReprovacao) ? analiseLeak.motivosReprovacao : [];
  const alertasAnalise = Array.isArray(analiseLeak.alertasAnalise) ? analiseLeak.alertasAnalise : [];
  const observacoesAnalise = Array.isArray(analiseLeak.observacoesAnalise) ? analiseLeak.observacoesAnalise : [];
  const registroTermico = analiseLeak.registroTermico || { porSensor: [], sensoresUtilizados: [], sensoresDesabilitados: [], global: {} };
  const estabilidadeCurva = analiseLeak.estabilidadeCurva || { tendencia: 'INDEFINIDA', estabilidade: 'INDEFINIDA', percentualConsistente: 0, amplitudeMaxContraTendencia: 0 };

  function textoEstabilidadeCurvaLeakTest_(estab, statusAprovacaoAtual) {
    const percentual = SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(estab.percentualConsistente) * 100, 0);
    const reprovadoAtual = statusAprovacaoAtual === 'REPROVADO';

    if (estab.tendencia === 'ELEVACAO') {
      if (estab.estabilidade === 'ESTAVEL') {
        return 'A curva de Pressão Absoluta apresentou elevação gradual e consistente ao longo do intervalo avaliado (' + percentual +
          '% das leituras seguindo a mesma tendência, sem oscilações abruptas), o que reforça a consistência das leituras. ' +
          (reprovadoAtual
            ? 'Esse padrão de elevação constante é o comportamento tecnicamente esperado para perda de estanqueidade da câmara, reforçando a confiabilidade da taxa de vazamento calculada.'
            : 'Esse padrão é compatível com o comportamento normalmente esperado de uma câmara com boa estanqueidade, com variação mínima e previsível ao longo do tempo.');
      }
      return 'A curva de Pressão Absoluta apresentou oscilações relevantes durante o intervalo avaliado (variação pontual de até ' +
        SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(estab.amplitudeMaxContraTendencia), 3) + ' mbar em sentido contrário à tendência geral de elevação), ' +
        'reduzindo a consistência das leituras nesse trecho e recomendando atenção adicional na interpretação da curva - ainda que o cálculo da taxa de vazamento considere apenas os pontos inicial e final do intervalo informado.';
    }

    if (estab.tendencia === 'QUEDA') {
      if (estab.estabilidade === 'ESTAVEL') {
        return 'A curva de Pressão Absoluta apresentou queda gradual e consistente ao longo do intervalo avaliado (' + percentual +
          '% das leituras seguindo a mesma tendência, sem oscilações abruptas), evidenciando boa consistência das leituras' +
          (reprovadoAtual ? ', embora o resultado tenha sido classificado como REPROVADO pela taxa de vazamento calculada.' : '.');
      }
      return 'A curva de Pressão Absoluta apresentou oscilações relevantes durante o intervalo avaliado, reduzindo a consistência das leituras nesse trecho e recomendando atenção adicional na interpretação da curva.';
    }

    return 'A curva de Pressão Absoluta manteve-se estável, sem variação relevante nem oscilações abruptas, ao longo do intervalo avaliado, evidenciando boa consistência das leituras.';
  }

  function aplicarBorda(rg) {
    rg.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  function estiloCabecalhoEscuro(rg) {
    rg.setBackground(AutoRel_UCFG.CORES.CHUMBO)
      .setFontColor(AutoRel_UCFG.CORES.TEXTO_BRANCO)
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

  function richTexto(sheet, rangeA1, textoCompleto, termosNegrito, corStatusPalavra, fontSize) {
    textoCompleto = String(textoCompleto || '');
    termosNegrito = termosNegrito || [];
    fontSize = Number(fontSize || 11);

    let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);

    const base = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).build();
    const bold = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).setBold(true).build();

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
      ['APROVADO', 'REPROVADO', 'APROVADO.', 'REPROVADO.'].forEach(function(palavra) {
        let pos = 0;
        while (true) {
          const idx = textoCompleto.indexOf(palavra, pos);
          if (idx === -1) break;
          const estiloStatus = SpreadsheetApp.newTextStyle().setForegroundColor(corStatusPalavra).setFontSize(fontSize).setBold(true).build();
          rtv.setTextStyle(idx, idx + palavra.length, estiloStatus);
          pos = idx + palavra.length;
        }
      });
    }

    sheet.getRange(rangeA1)
      .setRichTextValue(rtv.build())
      .setWrap(true)
      .setVerticalAlignment('top')
      .setHorizontalAlignment('left');
  }

  function textoLista(lista, vazio) {
    if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
    return lista.map(function(m, i) { return (i + 1) + '. ' + m; }).join('\n');
  }

  function fmtMbar_(valor) {
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 3) + ' MBAR';
  }

  function fmtMin_(valor) {
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 2) + ' MIN';
  }

  function fmtTaxa_(valor) {
    return SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 4) + ' MBAR/MIN';
  }

  function fmtTemp_(valor) {
    return valor === null || valor === undefined ? '-' : (SGO_DocA4_num_(AutoRel_valorNumericoSeguroPlanilha_(valor), 2) + ' °C');
  }

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
    .setValue('RELATÓRIO DE TESTE DE ESTANQUEIDADE\nMETROLABS - AVALIAÇÃO DA TAXA DE VAZAMENTO SOB VÁCUO')
    .setFontSize(13);
  estiloCabecalhoEscuro(shCapa.getRange('A1:F2'));
  shCapa.setRowHeight(1, 30);
  shCapa.setRowHeight(2, 34);

  if (relatorioSimulado) {
    shCapa.getRange('A3:F3')
      .merge()
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA | ' + AutoRel_valorSeguroPlanilha_(metaSimulacao.geradoEm))
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    shCapa.setRowHeight(3, 42);
  }

  shCapa.getRange('A4:C4').merge().setValue('IDENTIFICAÇÃO DO CLIENTE');
  shCapa.getRange('D4:F4').merge().setValue('IDENTIFICAÇÃO DO EQUIPAMENTO');
  estiloCabecalhoClaro(shCapa.getRange('A4:C4'));
  estiloCabecalhoClaro(shCapa.getRange('D4:F4'));

  const infoMatriz = [
    ['CLIENTE:', AutoRel_valorSeguroPlanilha_(payload.cliente), '', 'TAG / CÓDIGO:', AutoRel_valorSeguroPlanilha_(payload.tag), ''],
    ['CNPJ:', AutoRel_valorSeguroPlanilha_(payload.cnpj), '', 'MARCA:', AutoRel_valorSeguroPlanilha_(payload.marca), ''],
    ['ENDEREÇO:', AutoRel_valorSeguroPlanilha_(payload.endereco), '', 'MODELO:', AutoRel_valorSeguroPlanilha_(payload.modelo), ''],
    ['TIPO DE ENSAIO:', 'TESTE DE ESTANQUEIDADE', '', 'NÚMERO DE SÉRIE:', AutoRel_valorSeguroPlanilha_(payload.numSerie), ''],
    ['LOTE DA CARGA:', AutoRel_valorSeguroPlanilha_(payload.lote), '', 'LOCALIZAÇÃO:', AutoRel_valorSeguroPlanilha_(payload.local), ''],
    ['INÍCIO DO TESTE:', AutoRel_valorSeguroPlanilha_(analiseLeak.tempoInicioLeakTest), '', 'TÉRMINO DO TESTE:', AutoRel_valorSeguroPlanilha_(analiseLeak.tempoFimLeakTest), ''],
    ['TEMPO DECORRIDO:', fmtMin_(analiseLeak.tempoDecorridoMinutos), '', 'UNIDADE DA PRESSÃO ABSOLUTA:', AutoRel_valorSeguroPlanilha_(analiseLeak.unidadePressaoOriginal), '']
  ];

  shCapa.getRange('A5:F11')
    .setValues(infoMatriz)
    .setVerticalAlignment('middle')
    .setFontSize(10)
    .setWrap(true);

  for (let r = 5; r <= 11; r++) {
    shCapa.getRange('B' + r + ':C' + r).merge();
    shCapa.getRange('E' + r + ':F' + r).merge();
    shCapa.setRowHeight(r, 30);
  }

  aplicarBorda(shCapa.getRange('A4:F11'));
  shCapa.getRange('A5:A11').setFontWeight('bold');
  shCapa.getRange('D5:D11').setFontWeight('bold');
  shCapa.getRange('B5:C11').setFontWeight('normal');
  shCapa.getRange('E5:F11').setFontWeight('normal');

  shCapa.getRange('A13:F13').merge().setValue('RESULTADOS DO TESTE DE ESTANQUEIDADE');
  estiloCabecalhoClaro(shCapa.getRange('A13:F13'));

  const resMatriz = [
    ['PRESSÃO ABSOLUTA INICIAL (P1):', fmtMbar_(analiseLeak.pressaoInicioMbar), 'PRESSÃO ABSOLUTA FINAL (P2):', fmtMbar_(analiseLeak.pressaoFimMbar), 'VARIAÇÃO DE PRESSÃO (ΔP):', fmtMbar_(analiseLeak.deltaPressaoMbar)],
    ['TAXA DE VAZAMENTO OBTIDA:', fmtTaxa_(analiseLeak.taxaVazamentoMbarMin), 'LIMITE DE REFERÊNCIA:', fmtTaxa_(analiseLeak.limiteTaxaVazamentoMbarMin), 'PARECER FINAL:', statusAprovacao]
  ];

  shCapa.getRange('A14:F15')
    .setValues(resMatriz)
    .setVerticalAlignment('middle')
    .setFontSize(10)
    .setWrap(true);

  shCapa.setRowHeight(14, 34);
  shCapa.setRowHeight(15, 40);

  aplicarBorda(shCapa.getRange('A14:F15'));
  shCapa.getRange('A14:A15').setFontWeight('bold');
  shCapa.getRange('C14:C15').setFontWeight('bold');
  shCapa.getRange('E14:E15').setFontWeight('bold');
  shCapa.getRange('F15')
    .setFontColor(statusCor)
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('center');

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shCapa, 17, 6);

  // =========================================================
  // ABA 2: CONCLUSÃO TÉCNICA
  // =========================================================
  const shConclusao = ss.insertSheet('2. CONCLUSÃO TÉCNICA', 1);
  textoA4Paisagem(shConclusao);
  shConclusao.setColumnWidth(1, 1120);
  shConclusao.setRowHeight(2, 32);

  shConclusao.getRange('A2').setValue('CONCLUSÃO DO TESTE DE ESTANQUEIDADE').setFontSize(14);
  estiloCabecalhoEscuro(shConclusao.getRange('A2'));

  if (relatorioSimulado) {
    shConclusao.getRange('A3')
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shConclusao.getRange('A3'));
    shConclusao.setRowHeight(3, 34);
  }

  const txtMemoria = AutoRel_compactarTextoLaudoLeakTest_(analiseLeak.memoriaCalculo);

  shConclusao.getRange('A6:A19').merge();
  richTexto(
    shConclusao,
    'A6',
    txtMemoria,
    [
      'MEMÓRIA DE CÁLCULO DA TAXA DE VAZAMENTO',
      'Pressão Absoluta da Câmara - início (P1):',
      'Pressão Absoluta da Câmara - fim (P2):',
      'Variação de pressão (ΔP):',
      'Tempo decorrido:',
      'Taxa de vazamento = ΔP / T =',
      'Critério de referência:',
      'Resultado obtido:'
    ],
    statusCor,
    10
  );
  for (let r = 6; r <= 19; r++) shConclusao.setRowHeight(r, 20);

  shConclusao.getRange('A21')
    .setValue('______________________________________________________________')
    .setHorizontalAlignment('center');
  shConclusao.getRange('A22')
    .setValue((AutoRel_valorSeguroPlanilha_(payload.respTecnico) || 'TÉCNICO EXECUTOR') + ' - TÉCNICO EXECUTOR DO ENSAIO')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shConclusao, 24, 1);

  // =========================================================
  // ABA 3: PARECER DE ENGENHARIA
  // =========================================================
  const shParecer = ss.insertSheet('3. PARECER DE ENGENHARIA', 2);
  textoA4Paisagem(shParecer);
  shParecer.setColumnWidth(1, 1120);
  shParecer.setRowHeight(2, 32);
  shParecer.getRange('A2').setValue('PARECER DE ENGENHARIA').setFontSize(14);
  estiloCabecalhoEscuro(shParecer.getRange('A2'));

  if (relatorioSimulado) {
    shParecer.getRange('A3')
      .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
      .setBackground('#111827')
      .setFontColor('#e5e7eb')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    aplicarBorda(shParecer.getRange('A3'));
    shParecer.setRowHeight(3, 34);
  }

  const textoEstabilidade = textoEstabilidadeCurvaLeakTest_(estabilidadeCurva, statusAprovacao);

  let txtParecer = '';
  if (statusAprovacao === 'REPROVADO') {
    txtParecer =
      'Parecer final da engenharia clínica: REPROVADO.\n\n' +
      'A taxa de vazamento obtida no ensaio superou o limite de referência configurado para a câmara. ' + textoEstabilidade + '\n\n' +
      'Motivos técnicos da reprovação:\n' + textoLista(motivosReprovacao, 'Nenhum motivo registrado.') + '\n\n' +
      'O equipamento deve passar por avaliação técnica de vedação (portas, gaxetas, válvulas e conexões) antes de nova tentativa de qualificação.';
  } else {
    txtParecer =
      'Parecer final da engenharia clínica: APROVADO.\n\n' +
      'A taxa de vazamento obtida no ensaio atendeu ao limite de referência configurado para a câmara, evidenciando estanqueidade adequada do sistema sob vácuo durante o período avaliado. ' + textoEstabilidade + '\n\n' +
      'Equipamento liberado quanto ao critério de estanqueidade avaliado neste ensaio.';
  }

  txtParecer += '\n\nEste resultado foi determinado exclusivamente pela taxa de vazamento calculada a partir da Pressão Absoluta da Câmara (ΔP / tempo) no intervalo informado.\n\n' +
    AutoRel_valorSeguroPlanilha_(analiseLeak.textoDisclaimerTermico);
  txtParecer = AutoRel_compactarTextoLaudoLeakTest_(txtParecer);

  shParecer.getRange('A5:A21').merge();
  richTexto(
    shParecer,
    'A5',
    txtParecer,
    [
      'Parecer final da engenharia clínica:',
      'APROVADO',
      'REPROVADO',
      'Motivos técnicos da reprovação:',
      'Pressão Absoluta da Câmara',
      'ACOMPANHAMENTO TÉRMICO COMPLEMENTAR:'
    ],
    statusCor,
    10
  );
  for (let r = 5; r <= 21; r++) shParecer.setRowHeight(r, 22);

  let linhaAssinaturaParecer = 23;
  if (observacoesAnalise.length || alertasAnalise.length) {
    shParecer.getRange('A23')
      .setValue('OBSERVAÇÕES DE ANÁLISE')
      .setFontWeight('bold')
      .setBackground('#e5e7eb');
    aplicarBorda(shParecer.getRange('A23'));

    shParecer.getRange('A24:A26').merge();
    richTexto(
      shParecer,
      'A24',
      textoLista(observacoesAnalise.concat(alertasAnalise), 'Nenhuma observação registrada.'),
      ['1.', '2.', '3.'],
      null,
      9
    );
    shParecer.setRowHeight(24, 48);
    linhaAssinaturaParecer = 28;
  }

  shParecer.getRange('A' + linhaAssinaturaParecer)
    .setValue('______________________________________________________________')
    .setHorizontalAlignment('center');
  shParecer.getRange('A' + (linhaAssinaturaParecer + 1))
    .setValue((AutoRel_valorSeguroPlanilha_(payload.respTecnico) || 'TÉCNICO EXECUTOR') + ' - TÉCNICO EXECUTOR DO ENSAIO')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shParecer, linhaAssinaturaParecer + 3, 1);

  // =========================================================
  // ABA 4: REGISTRO TÉRMICO COMPLEMENTAR
  // =========================================================
  const shTermico = ss.insertSheet('4. REGISTRO TÉRMICO COMPLEMENTAR', 3);
  textoA4Paisagem(shTermico);

  shTermico.setColumnWidth(1, 150);
  for (let c = 2; c <= 4; c++) shTermico.setColumnWidth(c, 200);

  shTermico.getRange('A1:D1')
    .merge()
    .setValue('REGISTRO TÉRMICO COMPLEMENTAR - NÃO INTERFERE NO RESULTADO DO TESTE');
  estiloCabecalhoEscuro(shTermico.getRange('A1:D1'));
  shTermico.setRowHeight(1, 30);

  shTermico.getRange('A3:D3')
    .setValues([['SENSOR ID', 'TEMP. MÍNIMA', 'TEMP. MÉDIA', 'TEMP. MÁXIMA']])
    .setBackground('#e2e8f0')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const porSensor = Array.isArray(registroTermico.porSensor) ? registroTermico.porSensor : [];
  const linhasTermico = porSensor.map(function(s) {
    return [
      s.sensor + (s.ativo ? '' : ' (DESABILITADO)'),
      fmtTemp_(s.min),
      fmtTemp_(s.media),
      fmtTemp_(s.max)
    ];
  });

  if (linhasTermico.length) {
    shTermico.getRange(4, 1, linhasTermico.length, 4)
      .setValues(linhasTermico)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true);
    aplicarBorda(shTermico.getRange(4, 1, linhasTermico.length, 4));

    porSensor.forEach(function(s, i) {
      if (!s.ativo) {
        shTermico.getRange(4 + i, 1, 1, 4).setBackground('#f3f4f6').setFontColor('#6b7280');
      }
    });
  }

  const linhaGlobalTermico = 4 + linhasTermico.length + 1;
  shTermico.getRange('A' + linhaGlobalTermico + ':D' + linhaGlobalTermico).merge()
    .setValue('FAIXA GLOBAL DOS SENSORES ATIVOS: MÍN. ' + fmtTemp_(registroTermico.global && registroTermico.global.min) +
      ' | MÉDIA ' + fmtTemp_(registroTermico.global && registroTermico.global.media) +
      ' | MÁX. ' + fmtTemp_(registroTermico.global && registroTermico.global.max))
    .setFontWeight('bold')
    .setFontSize(10)
    .setWrap(true);
  shTermico.setRowHeight(linhaGlobalTermico, 30);

  const linhaDisclaimerTermico = linhaGlobalTermico + 2;
  shTermico.getRange('A' + linhaDisclaimerTermico + ':D' + (linhaDisclaimerTermico + 3)).merge();
  richTexto(
    shTermico,
    'A' + linhaDisclaimerTermico,
    AutoRel_valorSeguroPlanilha_(analiseLeak.textoDisclaimerTermico),
    ['ACOMPANHAMENTO TÉRMICO COMPLEMENTAR:'],
    null,
    10
  );

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shTermico, linhaDisclaimerTermico + 5, 4);

  // =========================================================
  // ABA 5: DADOS BRUTOS
  // =========================================================
  const shDados = ss.insertSheet('5. DADOS BRUTOS', 4);
  textoA4Paisagem(shDados);

  shDados.setColumnWidth(1, 180);
  shDados.setColumnWidth(2, 150);

  const unidadeOriginal = AutoRel_valorSeguroPlanilha_(analiseLeak.unidadePressaoOriginal) || 'MBAR';
  const fatorParaMbarDados = AutoRel_obterFatorConversaoParaMbarLeakTest_(unidadeOriginal);
  const referenciaAtmMbarDados = AutoRel_valorNumericoSeguroPlanilha_(
    (AutoRel_UCFG.LEAK_TEST && AutoRel_UCFG.LEAK_TEST.referenciaAtmosfericaMbar) || 1013.25
  );

  const headers = ['Tempo']
    .concat(Array.from({ length: nSensoresInstalados }, function(_, i) { return 'S' + (i + 1) + ' (°C)'; }))
    .concat(['Pressão Absoluta (' + unidadeOriginal + ')', 'Vácuo Relativo (mbar)', 'Evento do teste de estanqueidade']);

  shDados.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(AutoRel_UCFG.CORES.CHUMBO)
    .setFontColor(AutoRel_UCFG.CORES.TEXTO_BRANCO)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const rows = [];
  const colors = [];

  dados.forEach(function(d, i) {
    let cor = '#ffffff';
    let eventoTexto = '';

    if (i === idxInicio) eventoTexto = 'INÍCIO DO TESTE';
    if (i === idxFim) {
      eventoTexto = eventoTexto ? (eventoTexto + ' | TÉRMINO DO TESTE') : 'TÉRMINO DO TESTE';
    }

    if (i >= idxInicio && i <= idxFim) {
      cor = AutoRel_UCFG.CORES.FASE_VACUO;
    }

    const temps = (d.temperaturas || []).map(function(t) {
      const num = AutoRel_valorNumericoOuNuloPlanilha_(t);
      return num === null ? '' : num;
    });

    const pressaoNum = AutoRel_valorNumericoOuNuloPlanilha_(d.pressao);
    const vacuoRelativoNum = pressaoNum === null
      ? null
      : Number((pressaoNum * fatorParaMbarDados - referenciaAtmMbarDados).toFixed(3));

    rows.push(
      [AutoRel_normalizarTempoPlanilha_(d.tempoDate || d.tempoStr)]
        .concat(temps)
        .concat([
          pressaoNum === null ? '' : pressaoNum,
          vacuoRelativoNum === null ? '' : vacuoRelativoNum,
          eventoTexto
        ])
    );

    colors.push(new Array(headers.length).fill(cor));
  });

  if (rows.length) {
    shDados.getRange(2, 1, rows.length, headers.length)
      .setValues(rows)
      .setBackgrounds(colors)
      .setWrap(true)
      .setFontWeight('normal');

    if (nSensoresInstalados > 0) {
      shDados.getRange(2, 2, rows.length, nSensoresInstalados).setNumberFormat('0.00');
    }
    shDados.getRange(2, nSensoresInstalados + 2, rows.length, 1).setNumberFormat('0.000');
    shDados.getRange(2, nSensoresInstalados + 3, rows.length, 1).setNumberFormat('0.000');
    shDados.getRange(2, headers.length, rows.length, 1).setFontWeight('bold').setFontColor('#374151');
  }

  shDados.setFrozenRows(1);
  shDados.setColumnWidth(headers.length, 260);

  AutoRel_trimDimensoesParaImpressaoLeakTest_(shDados, rows.length + 2, headers.length);

  if (ss.getSheetByName('Página1')) ss.deleteSheet(ss.getSheetByName('Página1'));
  if (ss.getSheetByName('Sheet1')) ss.deleteSheet(ss.getSheetByName('Sheet1'));

  SpreadsheetApp.flush();

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

function AutoRel_compactarTextoLaudoLeakTest_(texto) {
  return String(texto || '').replace(/\n{3,}/g, '\n\n').trim();
}

// ------------------------------------------------------------
// Remove linhas/colunas em branco além do conteúdo real de cada
// aba do Leak Test. Sem isso, o Google Sheets exporta o PDF
// considerando as 1000 linhas / 26 colunas padrão de uma aba
// nova, gerando páginas em branco depois do conteúdo real.
// ------------------------------------------------------------
function AutoRel_trimDimensoesParaImpressaoLeakTest_(sheet, ultimaLinhaUsada, ultimaColunaUsada) {
  try {
    const maxRows = sheet.getMaxRows();
    if (maxRows > ultimaLinhaUsada) {
      sheet.deleteRows(ultimaLinhaUsada + 1, maxRows - ultimaLinhaUsada);
    }
  } catch (e) {
    Logger.log('Aviso: falha ao ajustar linhas da aba ' + sheet.getName() + '. Detalhe: ' + e.message);
  }

  try {
    const maxCols = sheet.getMaxColumns();
    if (maxCols > ultimaColunaUsada) {
      sheet.deleteColumns(ultimaColunaUsada + 1, maxCols - ultimaColunaUsada);
    }
  } catch (e) {
    Logger.log('Aviso: falha ao ajustar colunas da aba ' + sheet.getName() + '. Detalhe: ' + e.message);
  }
}

function AutoRel_resumoPreVacuoPlanilha_(analise) {
  const fases = (analise && analise.fasesProcesso) || {};
  const diagnostico = fases.diagnostico || {};
  const status = diagnostico.status || (fases.resumo && fases.resumo.statusPreVacuo) || 'INDETERMINADO';
  if (status === 'NAO_APLICAVEL') return 'Não se aplica ao ciclo informado';
  if (status === 'INDETERMINADO') return 'Indeterminado: dados insuficientes';
  if (status === 'NAO_DETECTADO') return 'Não detectado nos dados';
  const quantidade = Number(diagnostico.contagemEvacuacoes || (fases.resumo && fases.resumo.pulsosPreVacuo) || 0);
  return quantidade + ' evacuação(ões) observada(s)';
}

function AutoRel_garantirGradeDadosPlanilha_(sheet, linhas, colunas) {
  const maxLinhas = sheet.getMaxRows();
  const maxColunas = sheet.getMaxColumns();
  if (linhas > maxLinhas) sheet.insertRowsAfter(maxLinhas, linhas - maxLinhas);
  if (colunas > maxColunas) sheet.insertColumnsAfter(maxColunas, colunas - maxColunas);
}

/** Número que vira texto na planilha: pt-BR (vírgula decimal, ponto no milhar); vazio fica vazio. */
function AutoRel_txtNumPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  var t = SGO_DocA4_num_(valor);
  return t === '—' ? String(valor) : t;
}

function AutoRel_valorSeguroPlanilha_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function AutoRel_valorNumericoSeguroPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : 0;
}

function AutoRel_valorNumericoOuNuloPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : null;
}

function AutoRel_numeroInteiroSeguroPlanilha_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  const n = parseInt(valor, 10);
  return isFinite(n) ? n : fallback;
}

function AutoRel_normalizarTempoPlanilha_(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }

  if (typeof valor === 'string') {
    const s = valor.trim();
    if (!s) return '-';

    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
      return s;
    }

    const tentativaIso = new Date(s);
    if (!isNaN(tentativaIso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return Utilities.formatDate(tentativaIso, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
    }

    return s;
  }

  try {
    const d = new Date(valor);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss');
    }
  } catch (e) {}

  return String(valor);
}
function AutoRel_corFaseProcessoPlanilha_(fase, corPadrao) {
  const f = String(fase || '').toUpperCase();
  if (f === 'PRE_VACUO') return AutoRel_UCFG.CORES.FASE_VACUO;
  if (f === 'RAMPA_AQUECIMENTO') return AutoRel_UCFG.CORES.FASE_RAMPA;
  if (f === 'ESTERILIZACAO') return AutoRel_UCFG.CORES.FASE_EXPOSICAO;
  if (f === 'SECAGEM' || f === 'DESPRESSURIZACAO') return AutoRel_UCFG.CORES.FASE_SECAGEM;
  return corPadrao || '#ffffff';
}
