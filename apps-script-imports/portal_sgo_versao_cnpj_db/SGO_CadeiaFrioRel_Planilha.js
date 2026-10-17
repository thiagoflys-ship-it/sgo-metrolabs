/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — CADEIA DE FRIO
 * ARQUIVO: Planilha.gs
 * DESCRIÇÃO:
 * Gera o relatório em Google Sheets (A4 paisagem), no mesmo
 * papel do Planilha.js do motor de Autoclave: capa, resultados,
 * dados brutos e conclusão com texto rico. Sem abas de F0 ou
 * fases de vácuo — aqui o critério é faixa operacional.
 ****************************************************/

// Número de colunas usado por toda a aba "RESULTADOS — {estudo}" (título,
// cabeçalho da tabela de Distribuição e blocos de texto de Evento/
// Autonomia) — precisa ser o MESMO em todo lugar para a barra de título
// nunca terminar antes ou depois do conteúdo abaixo dela.
const CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS = 7;

function CadeiaFrioRel_cfGerarPlanilhaCadeiaFrio(dados, analises, payload, perfilCfg) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado foi recebido para geração da planilha.');
  }
  if (!analises || !analises.length) {
    throw new Error('Nenhuma análise foi recebida para geração da planilha.');
  }

  payload = payload || {};

  const nomeArquivo = 'METROLABS_CADEIAFRIO_' + String(payload.perfil || '').trim() + '_' +
    Utilities.formatDate(new Date(), CadeiaFrioRel_CFCFG.TZ, 'ddMMyyyy_HHmm');

  const ss = SpreadsheetApp.create(nomeArquivo);
  ss.setSpreadsheetTimeZone(CadeiaFrioRel_CFCFG.TZ);
  ss.setSpreadsheetLocale('pt_BR');

  try {
    const folderIdConfigurado = (CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID && String(CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID).length > 10)
      ? CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID
      : '';

    const folder = folderIdConfigurado
      ? DriveApp.getFolderById(folderIdConfigurado)
      : CadeiaFrioRel_cfObterPastaPersistente_('LAUDOS_FOLDER_ID', 'Cadeia de Frio - Laudos');

    const file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) {
    Logger.log('Aviso: pasta de destino não acessível. Detalhe: ' + e.message);
  }

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;

  const statusConsolidado = CadeiaFrioRel_cfConsolidarStatus_(analises);
  const corStatusConsolidado = CadeiaFrioRel_cfCorPorStatus_(statusConsolidado);
  const relatorioSimulado = !!payload.modoRelatorioSimulado;

  const shCapa = ss.getSheets()[0];
  shCapa.setName('1. CAPA');
  CadeiaFrioRel_cfMontarCapa_(shCapa, analises, payload, perfilCfg, statusConsolidado, corStatusConsolidado, relatorioSimulado);

  analises.forEach(function(analise) {
    const sufixo = CadeiaFrioRel_cfNomeCurtoEstudo_(analise.tipoEstudo);
    const statusEstudo = String(analise.statusAprovacao || 'INFORMATIVO').toUpperCase();
    const corEstudo = CadeiaFrioRel_cfCorPorStatus_(statusEstudo);
    const dadosEstudo = analise._dadosFatia || dados;

    const shResultados = ss.insertSheet('RESULTADOS — ' + sufixo);
    CadeiaFrioRel_cfMontarResultados_(shResultados, analise, statusEstudo, corEstudo, relatorioSimulado);

    const shDados = ss.insertSheet('DADOS — ' + sufixo);
    CadeiaFrioRel_cfMontarDadosBrutos_(shDados, dadosEstudo, analise, nSensores);

    const shConclusao = ss.insertSheet('CONCLUSÃO — ' + sufixo);
    CadeiaFrioRel_cfMontarConclusaoTecnica_(shConclusao, analise, payload, perfilCfg, statusEstudo, corEstudo, relatorioSimulado);
  });

  const shParecer = ss.insertSheet('PARECER TÉCNICO FINAL');
  CadeiaFrioRel_cfMontarParecerTecnico_(shParecer, analises, payload, statusConsolidado, corStatusConsolidado, relatorioSimulado);

  ss.setActiveSheet(shCapa);

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

function CadeiaFrioRel_cfNomeCurtoEstudo_(tipo) {
  const mapa = {
    DISTRIBUICAO_VAZIO: 'DISTRIB. VAZIO',
    DISTRIBUICAO_CARGA: 'DISTRIB. CARGA',
    ABERTURA_PORTA: 'ABERTURA PORTA',
    QUEDA_ENERGIA: 'QUEDA ENERGIA',
    AUTONOMIA: 'AUTONOMIA'
  };
  return mapa[String(tipo || '').toUpperCase()] || String(tipo || 'ESTUDO');
}

// ------------------------------------------------------------
// ABA 1 — CAPA
// ------------------------------------------------------------
function CadeiaFrioRel_cfMontarCapa_(sh, analises, payload, perfilCfg, statusConsolidado, corStatusConsolidado, relatorioSimulado) {
  CadeiaFrioRel_cfLayoutA4Paisagem_(sh);
  const larguraCol = Math.round((CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500) / 6);
  sh.setColumnWidths(1, 6, larguraCol);

  let row = 1;

  sh.getRange(row, 1, 1, 6).merge()
    .setValue(CadeiaFrioRel_CFCFG.APP_TITLE || 'METROLABS - CADEIA DE FRIO')
    .setFontSize(18).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 36);
  row++;

  sh.getRange(row, 1, 1, 6).merge()
    .setValue('LAUDO DE QUALIFICAÇÃO TÉRMICA')
    .setFontSize(11).setFontStyle('italic')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 18);
  row++;
  sh.setRowHeight(row, 8);
  row++;

  if (relatorioSimulado) {
    row = CadeiaFrioRel_cfInserirFaixaRelatorioInterno_(sh, row, 6);
  }

  const primeiraFaixa = (analises[0] && analises[0].faixa) || {};

  const linhas = [
    ['Cliente', payload.cliente || payload.razaoSocial || '-'],
    ['CNPJ', payload.cnpj || '-'],
    ['Equipamento', (perfilCfg && perfilCfg.label) || payload.perfil || '-'],
    ['TAG / Identificação', payload.tagEquipamento || '-'],
    ['Marca / Modelo', [payload.marca, payload.modelo].filter(Boolean).join(' / ') || '-'],
    ['Número de série', payload.numeroSerie || '-'],
    ['Localização', payload.localizacao || '-'],
    ['Volume interno declarado', payload.volumeLitros ? (payload.volumeLitros + ' L') : '-'],
    ['Critério de aprovação (faixa + tolerância)', primeiraFaixa.tMin !== undefined ? (CadeiaFrioRel_cfFmtC_(primeiraFaixa.tMin) + ' a ' + CadeiaFrioRel_cfFmtC_(primeiraFaixa.tMax) + ' — tolerância de ' + CadeiaFrioRel_cfFmtC_(primeiraFaixa.tolerancia)) : '-'],
    ['Responsável técnico', payload.responsavelTecnico || '-'],
    ['Data de emissão', Utilities.formatDate(new Date(), CadeiaFrioRel_CFCFG.TZ, 'dd/MM/yyyy HH:mm')]
  ];

  linhas.forEach(function(par) {
    sh.getRange(row, 1).setValue(par[0]).setFontWeight('bold').setBackground('#e5e7eb').setVerticalAlignment('middle');
    sh.getRange(row, 2, 1, 5).merge().setValue(par[1]).setVerticalAlignment('middle');
    CadeiaFrioRel_cfBorda_(sh.getRange(row, 1, 1, 6));
    sh.setRowHeight(row, 22);
    row++;
  });

  sh.setRowHeight(row, 8);
  row++;

  sh.getRange(row, 1, 1, 6).merge()
    .setValue('ESTUDOS INCLUÍDOS NESTE LAUDO')
    .setFontSize(12).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 22);
  row++;

  sh.getRange(row, 1, 1, 2).merge().setValue('Estudo');
  sh.getRange(row, 3, 1, 2).merge().setValue('Início');
  sh.getRange(row, 5).setValue('Fim');
  sh.getRange(row, 6).setValue('Status');
  CadeiaFrioRel_cfEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, 6));
  sh.setRowHeight(row, 20);
  row++;

  const linhaInicioTabelaEstudos = row;
  analises.forEach(function(a) {
    const tipo = String(a.tipoEstudo || '').toUpperCase();
    const ehEvento = (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA');
    const inicio = ehEvento ? a.tempoInicioEvento : a.tempoInicio;
    const fim = ehEvento ? (a.tempoFimEvento || '(sem término informado)') : a.tempoFim;

    sh.getRange(row, 1, 1, 2).merge().setValue(CadeiaFrioRel_cfLabelEstudo_(tipo)).setVerticalAlignment('middle');
    sh.getRange(row, 3, 1, 2).merge().setValue(inicio || '-').setVerticalAlignment('middle');
    sh.getRange(row, 5).setValue(fim || '-').setVerticalAlignment('middle');
    sh.getRange(row, 6).setValue(CadeiaFrioRel_cfLabelStatus_(a.statusAprovacao))
      .setFontColor(CadeiaFrioRel_cfCorPorStatus_(a.statusAprovacao)).setFontWeight('bold').setVerticalAlignment('middle');
    sh.setRowHeight(row, 22);
    row++;
  });
  CadeiaFrioRel_cfBorda_(sh.getRange(linhaInicioTabelaEstudos - 1, 1, analises.length + 1, 6));

  sh.setRowHeight(row, 8);
  row++;

  sh.getRange(row, 1, 1, 6).merge()
    .setValue('REFERÊNCIAS NORMATIVAS')
    .setFontSize(12).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 22);
  row++;

  const normas = CadeiaFrioRel_cfListarNormasAplicaveis_(payload.perfil);
  normas.forEach(function(norma, i) {
    sh.getRange(row, 1, 1, 6).merge()
      .setValue((i + 1) + '. ' + norma)
      .setWrap(true).setVerticalAlignment('middle').setFontSize(9);
    sh.setRowHeight(row, 26);
    row++;
  });
  CadeiaFrioRel_cfBorda_(sh.getRange(row - normas.length, 1, normas.length, 6));

  sh.setRowHeight(row, 8);
  row++;
  sh.getRange(row, 1, 1, 6).merge()
    .setValue('STATUS DO LAUDO: ' + CadeiaFrioRel_cfLabelStatus_(statusConsolidado))
    .setFontSize(15).setFontWeight('bold')
    .setBackground(corStatusConsolidado).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 32);
}

// ------------------------------------------------------------
// ABA 2 — RESULTADOS (varia por tipo de estudo)
// ------------------------------------------------------------
function CadeiaFrioRel_cfMontarResultados_(sh, analise, statusAprovacao, corStatus, relatorioSimulado) {
  CadeiaFrioRel_cfLayoutA4Paisagem_(sh);
  // Largura de coluna é decidida por cada sub-layout abaixo (Distribuição
  // usa uma tabela por sensor; Evento/Autonomia usam pares rótulo:valor
  // com rótulos bem mais longos) — mas ambos somam à mesma largura total
  // de página (CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX), para a barra de título terminar
  // sempre no mesmo ponto que o conteúdo abaixo dela.
  sh.setColumnWidths(1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS, Math.round((CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500) / CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS));

  let linhaInicial = 1;
  if (relatorioSimulado) {
    linhaInicial = CadeiaFrioRel_cfInserirFaixaRelatorioInterno_(sh, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS);
  }

  const tipo = String(analise.tipoEstudo || '').toUpperCase();

  if (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') {
    CadeiaFrioRel_cfMontarResultadosDistribuicao_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    CadeiaFrioRel_cfMontarResultadosEvento_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  } else if (tipo === 'AUTONOMIA') {
    CadeiaFrioRel_cfMontarResultadosAutonomia_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  }
}

function CadeiaFrioRel_cfMontarResultadosDistribuicao_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;

  row = CadeiaFrioRel_cfTituloSecao_(sh, row, CadeiaFrioRel_cfLabelEstudo_(analise.tipoEstudo) + ' — RESULTADOS', corStatus);

  sh.getRange(row, 1).setValue('Início').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.tempoInicio || '-');
  sh.getRange(row, 3).setValue('Fim').setFontWeight('bold');
  sh.getRange(row, 4).setValue(analise.tempoFim || '-');
  sh.getRange(row, 5).setValue('Duração total').setFontWeight('bold');
  sh.getRange(row, 6).setValue(CadeiaFrioRel_cfFmtHoras_(analise.tempoTotalMinutos));
  row += 2;

  const header = ['Sensor', 'Mín (°C)', 'Máx (°C)', 'Média (°C)', 'Máx-Mín', 'Média-Mín', 'Máx-Média'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  CadeiaFrioRel_cfEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;

  const linhaInicioTabela = row;

  const linhaGlobal = ['GLOBAL', analise.statsGlobal.min, analise.statsGlobal.max, analise.statsGlobal.media,
    analise.statsGlobal.indicacaoMaxMin.maxMin, analise.statsGlobal.indicacaoMaxMin.mediaMin, analise.statsGlobal.indicacaoMaxMin.maxMedia];
  sh.getRange(row, 1, 1, linhaGlobal.length).setValues([linhaGlobal]).setFontWeight('bold');
  row++;

  (analise.statsPorSensor || []).forEach(function(s) {
    const linha = [s.sensor, s.min, s.max, s.media, s.indicacaoMaxMin.maxMin, s.indicacaoMaxMin.mediaMin, s.indicacaoMaxMin.maxMedia];
    sh.getRange(row, 1, 1, linha.length).setValues([linha]);
    row++;
  });

  const totalLinhasTabela = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 2, totalLinhasTabela, header.length - 1)
    .setNumberFormat('0.00')
    .setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhasTabela, 1).setHorizontalAlignment('center');
  CadeiaFrioRel_cfBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhasTabela + 1, header.length));

  row += 2;

  if (analise.piorSensor) {
    const colValor = CadeiaFrioRel_cfEscreverRotulo_(sh, row, 'Pior leitura');
    sh.getRange(row, colValor, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS - colValor + 1).merge().setValue(
      analise.piorSensor.sensor + ': ' + CadeiaFrioRel_cfFmtC_(analise.piorSensor.valor) + ' em ' + analise.piorSensor.tempoStr +
      ' (desvio de ' + CadeiaFrioRel_cfFmtC_(analise.piorSensor.desvio) + ' em relação à faixa)'
    );
    row++;
  }

  if (analise.primeiraRupturaGlobal) {
    const colValor = CadeiaFrioRel_cfEscreverRotulo_(sh, row, 'Primeira excursão registrada');
    sh.getRange(row, colValor, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS - colValor + 1).merge().setValue(
      analise.primeiraRupturaGlobal.sensor + ': ' + CadeiaFrioRel_cfFmtC_(analise.primeiraRupturaGlobal.valor) + ' em ' + analise.primeiraRupturaGlobal.tempoStr
    );
    row++;
  }

  row += 1;
  row = CadeiaFrioRel_cfEscreverTabelaConformidadePorSensor_(sh, row, analise.conformidadePorSensor);

  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Motivos de reprovação', analise.motivosReprovacao, CadeiaFrioRel_CFCFG.CORES.REPROVADO);
  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Alertas', analise.alertasAnalise, CadeiaFrioRel_CFCFG.CORES.ALERTA);
  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, CadeiaFrioRel_CFCFG.CORES.INFO);
}

function CadeiaFrioRel_cfMontarResultadosEvento_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  row = CadeiaFrioRel_cfTituloSecao_(sh, row, CadeiaFrioRel_cfLabelEstudo_(analise.tipoEstudo) + ' — RESULTADOS', corStatus);

  if (analise.tipoAbertura) {
    sh.getRange(row, 1).setValue('Tipo de abertura').setFontWeight('bold');
    sh.getRange(row, 2).setValue(analise.tipoAbertura === 'SEMI_ABERTA' ? 'Porta semiaberta' : 'Porta totalmente aberta');
    row++;
  }

  sh.getRange(row, 1).setValue('Início do evento').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.tempoInicioEvento || '-');
  sh.getRange(row, 3).setValue('Fim do evento').setFontWeight('bold');
  sh.getRange(row, 4).setValue(analise.tempoFimEvento || '-');
  row += 2;

  sh.getRange(row, 1).setValue('Ultrapassou a faixa?').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.rompeu ? 'SIM' : 'NÃO');
  row++;

  if (analise.rompeu) {
    let colValor = CadeiaFrioRel_cfEscreverRotulo_(sh, row, 'Sensor / valor da ruptura');
    sh.getRange(row, colValor, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS - colValor + 1).merge()
      .setValue(analise.primeiraRuptura.sensor + ': ' + analise.primeiraRuptura.valor + ' °C em ' + analise.primeiraRuptura.tempoStr);
    row++;

    sh.getRange(row, 1).setValue('Tempo até a ruptura').setFontWeight('bold');
    sh.getRange(row, 2).setValue(CadeiaFrioRel_cfFmtMin_(analise.tempoAteRupturaMinutos));
    row++;
  }

  sh.getRange(row, 1).setValue('Recuperou totalmente?').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.recuperouTotalmente ? 'SIM' : (analise.rompeu ? 'NÃO OBSERVADO NO PERÍODO GRAVADO' : 'N/A'));
  row++;

  if (analise.recuperouTotalmente) {
    sh.getRange(row, 1).setValue('Tempo até a recuperação').setFontWeight('bold');
    sh.getRange(row, 2).setValue(CadeiaFrioRel_cfFmtMin_(analise.tempoAteRecuperacaoMinutos));
    row++;
  }

  if (analise.tempoAlvoMinutos !== null && analise.tempoAlvoMinutos !== undefined && isFinite(analise.tempoAlvoMinutos)) {
    row++;
    const colValor = CadeiaFrioRel_cfEscreverRotulo_(sh, row, 'Tempo-alvo definido para o ensaio');
    sh.getRange(row, colValor).setValue(CadeiaFrioRel_cfFmtMin_(analise.tempoAlvoMinutos));
    row++;
  }

  row += 1;
  row = CadeiaFrioRel_cfEscreverTabelaComportamentoSensores_(sh, row, 'Comportamento dos sensores durante o evento', analise._dadosDesdeInicioEvento || analise._dadosFatia, analise.sensoresAtivos);

  row += 1;
  row = CadeiaFrioRel_cfEscreverTabelaConformidadePorSensor_(sh, row, analise.conformidadePorSensor);

  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Motivos de reprovação', analise.motivosReprovacao, CadeiaFrioRel_CFCFG.CORES.REPROVADO);
  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Alertas', analise.alertasAnalise, CadeiaFrioRel_CFCFG.CORES.ALERTA);
  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, CadeiaFrioRel_CFCFG.CORES.INFO);
}

function CadeiaFrioRel_cfMontarResultadosAutonomia_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  row = CadeiaFrioRel_cfTituloSecao_(sh, row, 'AUTONOMIA — RESULTADOS', corStatus);

  sh.getRange(row, 1).setValue('Início do ensaio').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.tempoInicio || '-');
  sh.getRange(row, 3).setValue('Fim do período gravado').setFontWeight('bold');
  sh.getRange(row, 4).setValue(analise.tempoFim || '-');
  row += 2;

  sh.getRange(row, 1).setValue('Autonomia medida').setFontWeight('bold');
  sh.getRange(row, 2, 1, 3).merge().setValue(CadeiaFrioRel_cfFmtHoras_(analise.autonomiaMinutos)).setFontSize(13).setFontWeight('bold');
  row++;

  const colValorAutonomia = CadeiaFrioRel_cfEscreverRotulo_(sh, row, 'Ultrapassou a faixa dentro do período gravado?');
  sh.getRange(row, colValorAutonomia).setValue(analise.rompeu ? 'SIM' : 'NÃO');
  row += 1;

  row = CadeiaFrioRel_cfEscreverTabelaComportamentoSensores_(sh, row, 'Comportamento dos sensores durante o período gravado', analise._dadosFatia, analise.sensoresAtivos);

  row += 1;
  row = CadeiaFrioRel_cfListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, CadeiaFrioRel_CFCFG.CORES.INFO);
}

/**
 * Tabela compacta de mín/máx/média por sensor, usada nas abas de Evento
 * (Abertura de Porta / Queda de Energia) e Autonomia — sem isso, quando
 * o estudo não rompe a faixa (o cenário "bom"/aprovado), a página fica
 * só com meia dúzia de linhas rótulo:valor e uma área em branco enorme
 * antes das Observações. Em Evento, recebe analise._dadosDesdeInicioEvento
 * (a partir do início do evento, mesma janela da tabela de conformidade
 * por sensor logo abaixo); em Autonomia, recebe analise._dadosFatia (não
 * há um "início de evento" separado do início do próprio ensaio). Não
 * recalcula nada da lógica de aprovação, é só uma agregação simples para
 * preencher a página com contexto real.
 */
function CadeiaFrioRel_cfCalcularStatsSimplesPorSensor_(dados, sensoresAtivos) {
  if (!Array.isArray(dados) || !dados.length) return null;
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) return null;

  const ativos = Array.isArray(sensoresAtivos) && sensoresAtivos.length
    ? sensoresAtivos
    : Array.from({ length: nSensores }, function() { return true; });

  const porSensor = Array.from({ length: nSensores }, function(_, i) {
    return { sensor: 'S' + (i + 1), min: null, max: null, soma: 0, count: 0 };
  });

  dados.forEach(function(row) {
    const temps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;
      const t = CadeiaFrioRel_cfParseNumero_(temps[s]);
      if (t === null || !isFinite(t)) continue;
      const acc = porSensor[s];
      if (acc.min === null || t < acc.min) acc.min = t;
      if (acc.max === null || t > acc.max) acc.max = t;
      acc.soma += t;
      acc.count++;
    }
  });

  return porSensor
    .filter(function(s, i) { return ativos[i] && s.count > 0; })
    .map(function(s) { return { sensor: s.sensor, min: CadeiaFrioRel_cfRound_(s.min, 2), max: CadeiaFrioRel_cfRound_(s.max, 2), media: CadeiaFrioRel_cfRound_(s.soma / s.count, 2) }; });
}

function CadeiaFrioRel_cfEscreverTabelaComportamentoSensores_(sh, row, titulo, dadosFatia, sensoresAtivos) {
  const stats = CadeiaFrioRel_cfCalcularStatsSimplesPorSensor_(dadosFatia, sensoresAtivos);
  if (!stats || !stats.length) return row;

  sh.getRange(row, 1, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS).merge().setValue(titulo).setFontWeight('bold').setVerticalAlignment('middle');
  row++;

  const header = ['Sensor', 'Mín (°C)', 'Máx (°C)', 'Amplitude (°C)'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  CadeiaFrioRel_cfEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;

  const linhaInicioTabela = row;
  stats.forEach(function(s) {
    sh.getRange(row, 1, 1, 4).setValues([[s.sensor, s.min, s.max, CadeiaFrioRel_cfRound_(s.max - s.min, 2)]]);
    row++;
  });

  const totalLinhas = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 2, totalLinhas, 3).setNumberFormat('0.00').setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhas, 1).setHorizontalAlignment('center');
  CadeiaFrioRel_cfBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhas + 1, 4));

  return row + 1;
}
// Rótulo/cor de exibição do status por sensor — escala própria (não a
// mesma de CadeiaFrioRel_cfLabelStatus_/CadeiaFrioRel_cfCorPorStatus_, que é do veredito GLOBAL do
// estudo) porque aqui o "reprovado" da posição não implica reprovar o
// laudo inteiro, e vice-versa: um laudo pode ser aprovado globalmente
// mas ter uma posição específica não conforme, ou o contrário.
function CadeiaFrioRel_cfLabelStatusSensor_(status) {
  if (status === 'NAO_CONFORME') return 'NÃO CONFORME';
  if (status === 'CONFORME_COM_RESSALVA') return 'CONFORME COM RESSALVA';
  return 'CONFORME';
}

function CadeiaFrioRel_cfCorStatusSensor_(status) {
  if (status === 'NAO_CONFORME') return CadeiaFrioRel_CFCFG.CORES.REPROVADO;
  if (status === 'CONFORME_COM_RESSALVA') return CadeiaFrioRel_CFCFG.CORES.ALERTA;
  return CadeiaFrioRel_CFCFG.CORES.APROVADO;
}

/**
 * Tabela "Conformidade por posição/sensor" — complementa (nunca decide
 * sozinha) o veredito global do estudo, mostrando por sensor: direção e
 * magnitude do pior desvio (abaixo/acima da faixa), quanto tempo ficou
 * fora e se terminou o período fora da faixa. Um refrigerador pode ter
 * uma prateleira conforme e outra sistematicamente fora (ex.: perto do
 * evaporador) — essa granularidade é perdida no veredito global sozinho.
 * Usa analise.conformidadePorSensor (Engine.js CadeiaFrioRel_cfAvaliarConformidadePorSensor_).
 */
function CadeiaFrioRel_cfEscreverTabelaConformidadePorSensor_(sh, row, conformidadePorSensor) {
  if (!Array.isArray(conformidadePorSensor) || !conformidadePorSensor.length) return row;

  sh.getRange(row, 1, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS).merge()
    .setValue('Conformidade por posição/sensor').setFontWeight('bold').setVerticalAlignment('middle');
  row++;

  const header = ['Sensor', 'Status', 'Mín (°C)', 'Máx (°C)', 'Desvio abaixo (°C)', 'Desvio acima (°C)', '% tempo fora da faixa'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  CadeiaFrioRel_cfEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;

  const linhaInicioTabela = row;
  const naoConformes = [];

  conformidadePorSensor.forEach(function(c) {
    sh.getRange(row, 1, 1, header.length).setValues([[
      c.sensor, CadeiaFrioRel_cfLabelStatusSensor_(c.statusSensor), c.min, c.max,
      c.piorDesvioAbaixo, c.piorDesvioAcima, c.percentualForaFaixa
    ]]);
    sh.getRange(row, 2).setFontColor(CadeiaFrioRel_cfCorStatusSensor_(c.statusSensor)).setFontWeight('bold');
    if (c.statusSensor === 'NAO_CONFORME') naoConformes.push(c.sensor);
    row++;
  });

  const totalLinhas = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 3, totalLinhas, 4).setNumberFormat('0.00').setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 2, totalLinhas, 1).setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhas, 1).setHorizontalAlignment('center');
  CadeiaFrioRel_cfBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhas + 1, header.length));
  row++;

  if (naoConformes.length) {
    sh.getRange(row, 1, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS).merge().setWrap(true)
      .setValue('Posições não conformes: ' + naoConformes.join(', ') +
        ' — não recomendadas para armazenamento de produtos termolábeis nesta configuração. ' +
        'Ver análise detalhada por posição no Certificado de Qualificação Térmica.')
      .setFontColor(CadeiaFrioRel_CFCFG.CORES.REPROVADO);
    row++;
  }

  return row + 1;
}

// ------------------------------------------------------------
// ABA 3 — DADOS BRUTOS (inclui colunas de referência de faixa,
// usadas depois pelo Graficos.js para desenhar as linhas de limite)
// ------------------------------------------------------------
function CadeiaFrioRel_cfMontarDadosBrutos_(sh, dados, analise, nSensores) {
  const faixa = analise.faixa || { tMin: null, tMax: null };

  // Só entram na tabela (e, por consequência, no gráfico que lê esta
  // aba) os sensores marcados como ativos na tela — sensores desmarcados
  // ficam de fora tanto dos dados brutos quanto do gráfico, em vez de
  // aparecerem sempre com a quantidade total instalada.
  const ativos = Array.isArray(analise.sensoresAtivos) && analise.sensoresAtivos.length
    ? analise.sensoresAtivos
    : Array.from({ length: nSensores }, function() { return true; });
  const ativosIdx = [];
  for (let s = 0; s < nSensores; s++) if (ativos[s]) ativosIdx.push(s);

  const header = ['Tempo'];
  ativosIdx.forEach(function(s) { header.push('Sensor S' + (s + 1)); });
  // Valor numérico embutido no próprio rótulo (não só "Limite Mín") pra
  // quem olha o gráfico/legenda entender de cara o que a linha tracejada
  // representa, sem precisar caçar o número em outra aba.
  header.push(
    'Limite Mínimo (' + CadeiaFrioRel_cfFmtC_(faixa.tMin) + ')',
    'Limite Máximo (' + CadeiaFrioRel_cfFmtC_(faixa.tMax) + ')',
    'Marcador do Ensaio'
  );

  const linhas = dados.map(function(row) {
    const todasTemps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const temps = ativosIdx.map(function(s) { return todasTemps[s] !== undefined ? todasTemps[s] : null; });
    return [row.tempoStr].concat(temps).concat([faixa.tMin, faixa.tMax, '']);
  });

  sh.getRange(1, 1, 1, header.length).setValues([header]);
  CadeiaFrioRel_cfEstiloCabecalhoEscuro_(sh.getRange(1, 1, 1, header.length));

  // As colunas "Limite Mínimo (X,XX °C)"/"Limite Máximo (X,XX °C)" têm
  // rótulo bem mais longo que "Sensor S1" — na largura uniforme de 72px
  // (igual à dos sensores) o texto cortava ("Mínimo (2." / "Máximo (8.").
  // Corrigido SÓ nessas 2 colunas (largura própria + quebra de linha no
  // cabeçalho), sem tocar CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX nem a
  // largura das colunas de sensor — o cálculo da coluna do marcador
  // abaixo já contabiliza essa largura extra, então mesmo com 12
  // sensores ativos a soma total da tabela continua batendo com a
  // largura das abas vizinhas (Gráfico, Resultados etc.), sem estourar
  // página.
  const LARGURA_COL_SENSOR = 72;
  // 90px é o maior valor que ainda soma exatamente
  // CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX mesmo no pior caso (12
  // sensores ativos, o teto do sistema) sem acionar o piso de 300px da
  // coluna do marcador abaixo — testado para 1 a 12 sensores, sempre
  // bate 1500px exatos, nunca estoura página.
  const LARGURA_COL_LIMITE = 90;
  sh.setColumnWidth(1, 150);
  if (ativosIdx.length > 0) sh.setColumnWidths(2, ativosIdx.length, LARGURA_COL_SENSOR);
  const colLimiteMin = 2 + ativosIdx.length;
  const colLimiteMax = colLimiteMin + 1;
  sh.setColumnWidth(colLimiteMin, LARGURA_COL_LIMITE);
  sh.setColumnWidth(colLimiteMax, LARGURA_COL_LIMITE);
  sh.getRange(1, colLimiteMin, 1, 2).setWrap(true);
  sh.setRowHeight(1, 40);

  // Coluna do marcador: larga o bastante para o texto mais longo que
  // aparece aqui ("◀ INÍCIO DO ENSAIO — DISTRIBUIÇÃO DE TEMPERATURA COM
  // CARGA", com quebra de linha como reforço — ver
  // CadeiaFrioRel_cfMarcarEventosDadosBrutos_), mas dimensionada para a soma total da
  // tabela bater com CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX (a mesma largura de toda
  // outra aba do laudo) sempre que os sensores já não tiverem consumido
  // esse espaço sozinhos — sem isso, esta aba ficava mais larga que as
  // vizinhas (Gráfico, Resultados etc.) e a borda direita não alinhava
  // entre as páginas.
  const larguraFixaSemMarcador = 150 + ativosIdx.length * LARGURA_COL_SENSOR + 2 * LARGURA_COL_LIMITE;
  const larguraMarcador = Math.max(300, (CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500) - larguraFixaSemMarcador);
  sh.setColumnWidth(header.length, larguraMarcador);

  if (linhas.length) {
    sh.getRange(2, 1, linhas.length, header.length).setValues(linhas);
    sh.getRange(2, 2, linhas.length, header.length - 2)
      .setNumberFormat('0.00')
      .setHorizontalAlignment('center');
    sh.getRange(2, 1, linhas.length, 1).setHorizontalAlignment('center');
    CadeiaFrioRel_cfBorda_(sh.getRange(1, 1, linhas.length + 1, header.length));
    CadeiaFrioRel_cfMarcarEventosDadosBrutos_(sh, dados, analise, header.length);
  }

  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
}

/**
 * Destaca visualmente (cor de fundo + rótulo na última coluna) as
 * linhas de início/fim de cada ensaio dentro da própria tabela de
 * dados brutos — mesmo papel da coloração por fase de processo da
 * Autoclave, adaptado à cadeia de frio: aqui as "fases" são os
 * marcos do ensaio (início/fim da distribuição, início/fim do
 * evento de porta/energia, ruptura detectada, início/fim do
 * período gravado de autonomia).
 */
function CadeiaFrioRel_cfMarcarEventosDadosBrutos_(sh, dados, analise, totalColunas) {
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  const marcadores = [];

  function idxPorTempoStr(tempoStr) {
    if (!tempoStr) return -1;
    return dados.findIndex(function(r) { return r.tempoStr === tempoStr; });
  }

  if (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') {
    marcadores.push({ idx: 0, texto: '◀ INÍCIO DO ENSAIO — ' + CadeiaFrioRel_cfLabelEstudo_(tipo).toUpperCase(), cor: '#dbeafe' });
    marcadores.push({ idx: dados.length - 1, texto: '◀ FIM DO ENSAIO — ' + CadeiaFrioRel_cfLabelEstudo_(tipo).toUpperCase(), cor: '#dbeafe' });
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    const rotulo = CadeiaFrioRel_cfLabelEstudo_(tipo).toUpperCase();
    const idxInicio = idxPorTempoStr(analise.tempoInicioEvento);
    if (idxInicio !== -1) marcadores.push({ idx: idxInicio, texto: '◀ INÍCIO DO EVENTO — ' + rotulo, cor: '#fef3c7' });

    if (analise.tempoFimEvento) {
      const idxFim = idxPorTempoStr(analise.tempoFimEvento);
      if (idxFim !== -1) marcadores.push({ idx: idxFim, texto: '◀ TÉRMINO DO EVENTO — ' + rotulo, cor: '#dcfce7' });
    }

    if (analise.rompeu && analise.primeiraRuptura) {
      const idxRuptura = idxPorTempoStr(analise.primeiraRuptura.tempoStr);
      if (idxRuptura !== -1) marcadores.push({ idx: idxRuptura, texto: '◀ RUPTURA DETECTADA (' + analise.primeiraRuptura.sensor + ')', cor: '#fecaca' });
    }
  } else if (tipo === 'AUTONOMIA') {
    marcadores.push({ idx: 0, texto: '◀ INÍCIO DO PERÍODO GRAVADO', cor: '#dbeafe' });
    marcadores.push({ idx: dados.length - 1, texto: '◀ FIM DO PERÍODO GRAVADO', cor: '#dbeafe' });

    if (analise.rompeu && analise.primeiraRuptura) {
      const idxRuptura = idxPorTempoStr(analise.primeiraRuptura.tempoStr);
      if (idxRuptura !== -1) marcadores.push({ idx: idxRuptura, texto: '◀ RUPTURA (LIMITE DA AUTONOMIA)', cor: '#fecaca' });
    }
  }

  marcadores.forEach(function(m) {
    if (m.idx < 0 || m.idx >= dados.length) return;
    const linhaSheet = m.idx + 2; // linha 1 = cabeçalho
    sh.getRange(linhaSheet, 1, 1, totalColunas).setBackground(m.cor).setFontWeight('bold');
    sh.getRange(linhaSheet, totalColunas).setValue(m.texto).setWrap(true).setFontSize(9).setVerticalAlignment('middle');
    sh.setRowHeight(linhaSheet, 32);
  });
}

// ------------------------------------------------------------
// ABA 5 — CONCLUSÃO TÉCNICA (texto narrativo, mesmo padrão da Autoclave)
// ------------------------------------------------------------
function CadeiaFrioRel_cfMontarConclusaoTecnica_(sh, analise, payload, perfilCfg, statusAprovacao, corStatus, relatorioSimulado) {
  CadeiaFrioRel_cfLayoutA4Paisagem_(sh);
  sh.setColumnWidth(1, CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500);

  let row = 1;
  sh.getRange(row, 1).setValue('CONCLUSÃO TÉCNICA')
    .setFontSize(14).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  row += 2;

  if (relatorioSimulado) {
    row = CadeiaFrioRel_cfInserirFaixaRelatorioInterno_(sh, row, 1);
  }

  const texto = CadeiaFrioRel_cfMontarTextoTecnico_(analise, payload, perfilCfg, statusAprovacao);
  row = CadeiaFrioRel_cfEscreverBlocoTextoRico_(sh, row, texto, [CadeiaFrioRel_cfLabelEstudo_(analise.tipoEstudo)], corStatus, 12, 1, 145);

  row += 1;
  row = CadeiaFrioRel_cfEscreverAssinatura_(sh, row, payload);
}

function CadeiaFrioRel_cfMontarTextoTecnico_(analise, payload, perfilCfg, statusAprovacao) {
  const nomeEquip = (perfilCfg && perfilCfg.label) || payload.perfil || 'equipamento avaliado';
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  const faixa = analise.faixa || {};

  const normasResumo = String(payload.perfil || '').toUpperCase() === 'CAMARA_VACINA_2_8'
    ? 'ABNT NBR 16328:2023 (Anexo G), à RDC nº 430/2020 (ANVISA) e ao Manual de Rede de Frio do PNI/Ministério da Saúde'
    : 'ABNT NBR 16328:2023 (Anexo G) e à RDC nº 430/2020 (ANVISA)';

  let texto = 'Com base no ' + CadeiaFrioRel_cfLabelEstudo_(tipo) + ', os dados coletados para o equipamento "' + nomeEquip +
    '" foram processados em conformidade com a ' + normasResumo + ' (ver referências normativas completas na Capa), considerando a faixa operacional de referência de ' +
    CadeiaFrioRel_cfFmtC_(faixa.tMin) + ' a ' + CadeiaFrioRel_cfFmtC_(faixa.tMax) + ', com tolerância de ' + CadeiaFrioRel_cfFmtC_(faixa.tolerancia) + '.';

  texto += '\n\n';

  if (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') {
    texto += 'O monitoramento contínuo teve duração de ' + CadeiaFrioRel_cfFmtHoras_(analise.tempoTotalMinutos) +
      ', entre ' + (analise.tempoInicio || '-') + ' e ' + (analise.tempoFim || '-') + '. ';

    if (analise.piorSensor) {
      texto += 'O sensor ' + analise.piorSensor.sensor + ' registrou a leitura mais crítica do ensaio, ' +
        CadeiaFrioRel_cfFmtC_(analise.piorSensor.valor) + ' em ' + analise.piorSensor.tempoStr + ', ' +
        CadeiaFrioRel_cfFmtC_(analise.piorSensor.desvio) + ' além do limite da faixa operacional.';
    } else {
      texto += 'Nenhum sensor ativo ultrapassou a faixa operacional em nenhum momento do período monitorado.';
    }

    if (analise.primeiraRupturaGlobal) {
      texto += ' A primeira excursão cronológica registrada no ensaio ocorreu no sensor ' +
        analise.primeiraRupturaGlobal.sensor + ', às ' + analise.primeiraRupturaGlobal.tempoStr +
        ' (' + CadeiaFrioRel_cfFmtC_(analise.primeiraRupturaGlobal.valor) + ').';
    }

    const piorAmplitude = CadeiaFrioRel_cfEncontrarPiorAmplitude_(analise.statsPorSensor);
    if (piorAmplitude) {
      texto += ' Em termos de estabilidade térmica, o sensor com maior amplitude (máx-mín) ao longo do ensaio foi ' +
        piorAmplitude.sensor + ', com variação de ' + CadeiaFrioRel_cfFmtC_(piorAmplitude.maxMin) + '.';
    }
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    const nomeEvento = tipo === 'ABERTURA_PORTA' ? 'a abertura de porta' : 'a queda de energia';
    texto += 'O evento avaliado — ' + nomeEvento + ' — teve início às ' + (analise.tempoInicioEvento || '-') +
      (analise.tempoFimEvento ? (' e término às ' + analise.tempoFimEvento + '.') : ', sem horário de término informado.');

    texto += ' ';
    if (analise.rompeu) {
      texto += 'A faixa operacional foi rompida pelo sensor ' + analise.primeiraRuptura.sensor + ' após ' +
        CadeiaFrioRel_cfFmtMin_(analise.tempoAteRupturaMinutos) + ' do início do evento (leitura de ' + CadeiaFrioRel_cfFmtC_(analise.primeiraRuptura.valor) + '). ';
      texto += analise.recuperouTotalmente
        ? ('A recuperação total à faixa operacional ocorreu ' + CadeiaFrioRel_cfFmtMin_(analise.tempoAteRecuperacaoMinutos) + ' após o evento.')
        : 'A recuperação total à faixa operacional não foi observada dentro do período de dados disponível.';
    } else {
      texto += 'Nenhum sensor ativo ultrapassou a faixa operacional durante o período de dados disponível a partir do início do evento.';
    }

    if (analise.tempoAlvoMinutos !== null && analise.tempoAlvoMinutos !== undefined && isFinite(analise.tempoAlvoMinutos)) {
      texto += ' O tempo-alvo definido para o ensaio foi de ' + CadeiaFrioRel_cfFmtMin_(analise.tempoAlvoMinutos) +
        (statusAprovacao === 'REPROVADO' ? ', não sustentado pelo equipamento.' : ', sustentado com sucesso pelo equipamento.');
    }
  } else if (tipo === 'AUTONOMIA') {
    texto += analise.rompeu
      ? ('A autonomia medida foi de ' + CadeiaFrioRel_cfFmtHoras_(analise.autonomiaMinutos) + ', até o sensor ' +
         analise.primeiraRuptura.sensor + ' ultrapassar a faixa operacional.')
      : ('Não foi observada ruptura da faixa operacional durante todo o período gravado (' +
         CadeiaFrioRel_cfFmtHoras_(analise.tempoTotalGravadoMinutos) + '); a autonomia real do equipamento pode ser superior ao período monitorado.');
  }

  texto += '\n\nA leitura técnica considerou simultaneamente a permanência dentro da faixa operacional, a tolerância configurada, o comportamento individual de cada sensor ativo e, quando aplicável, a capacidade de recuperação do equipamento após o evento avaliado.';

  return texto;
}

// ------------------------------------------------------------
// ABA FINAL — PARECER TÉCNICO (veredito formal consolidado de
// TODOS os estudos do laudo, mesmo papel do "PARECER DE
// ENGENHARIA" da Autoclave)
// ------------------------------------------------------------
function CadeiaFrioRel_cfMontarParecerTecnico_(sh, analises, payload, statusConsolidado, corStatusConsolidado, relatorioSimulado) {
  CadeiaFrioRel_cfLayoutA4Paisagem_(sh);
  sh.setColumnWidth(1, CadeiaFrioRel_CFCFG.LARGURA_PAGINA_PX || 1500);

  let row = 1;
  sh.getRange(row, 1).setValue('PARECER TÉCNICO FINAL DE METROLOGIA')
    .setFontSize(14).setFontWeight('bold')
    .setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  row += 2;

  if (relatorioSimulado) {
    row = CadeiaFrioRel_cfInserirFaixaRelatorioInterno_(sh, row, 1);
  }

  const texto = CadeiaFrioRel_cfMontarTextoParecerConsolidado_(analises, payload, statusConsolidado);
  row = CadeiaFrioRel_cfEscreverBlocoTextoRico_(sh, row, texto, [], corStatusConsolidado, 12, 1, 145);

  row += 1;
  row = CadeiaFrioRel_cfEscreverAssinatura_(sh, row, payload);
}

function CadeiaFrioRel_cfMontarTextoParecerConsolidado_(analises, payload, statusConsolidado) {
  let texto = 'Parecer final do laboratório de metrologia: ' + CadeiaFrioRel_cfLabelStatus_(statusConsolidado) + '.\n\n';

  texto += 'Este laudo consolida ' + analises.length + ' estudo(s) realizado(s) sobre o mesmo equipamento, a partir de um único arquivo de datalogger:\n' +
    CadeiaFrioRel_cfTextoLista_(analises.map(function(a) {
      return CadeiaFrioRel_cfLabelEstudo_(a.tipoEstudo) + ' — ' + CadeiaFrioRel_cfLabelStatus_(a.statusAprovacao);
    }), '') + '\n\n';

  const reprovados = analises.filter(function(a) { return a.statusAprovacao === 'REPROVADO'; });
  const comAlerta = analises.filter(function(a) { return a.statusAprovacao === 'APROVADO_COM_ALERTA'; });

  if (reprovados.length) {
    texto += 'Motivos técnicos da reprovação, por estudo:\n\n';
    reprovados.forEach(function(a) {
      texto += CadeiaFrioRel_cfLabelEstudo_(a.tipoEstudo) + ':\n' + CadeiaFrioRel_cfTextoLista_(a.motivosReprovacao, 'Nenhum motivo registrado.') + '\n\n';
    });
    texto += 'O equipamento deve passar por avaliação técnica, revisão do processo de refrigeração/isolamento térmico e nova qualificação dos estudos reprovados antes da liberação operacional.';
  } else if (comAlerta.length) {
    texto += 'Alertas técnicos, por estudo:\n\n';
    comAlerta.forEach(function(a) {
      texto += CadeiaFrioRel_cfLabelEstudo_(a.tipoEstudo) + ':\n' + CadeiaFrioRel_cfTextoLista_(a.alertasAnalise, 'Nenhum alerta registrado.') + '\n\n';
    });
    texto += 'Recomenda-se investigar a causa da redução de margem operacional identificada e manter monitoramento reforçado do equipamento nas próximas verificações.';
  } else {
    texto += 'Todos os estudos realizados atenderam aos critérios operacionais configurados. O equipamento demonstrou desempenho compatível com a manutenção da faixa operacional exigida para o produto armazenado ou transportado, inclusive nos eventuais eventos de estresse avaliados (abertura de porta, queda de energia).\n\n' +
      'Equipamento liberado para uso operacional dentro dos critérios avaliados.';
  }

  texto += '\n\nInterpretação operacional: em equipamentos de cadeia de frio, a aprovação não depende apenas de a leitura pontual estar dentro da faixa — o equipamento precisa demonstrar estabilidade térmica sustentada, homogeneidade entre sensores e, quando submetido a um evento de estresse (abertura de porta ou queda de energia), capacidade de recuperação em tempo compatível com a estabilidade do produto armazenado. Qualquer perda de margem nesses pontos deve ser investigada antes da liberação rotineira do equipamento.';

  return texto;
}

// ------------------------------------------------------------
// HELPERS DE FORMATAÇÃO / LAYOUT
// ------------------------------------------------------------

function CadeiaFrioRel_cfLayoutA4Paisagem_(sh) {
  sh.setHiddenGridlines(true);
  try {
    const ps = sh.getPrintSettings();
    if (ps) {
      ps.setPaperSize(SpreadsheetApp.PrintPaperSize.A4);
      ps.setOrientation(SpreadsheetApp.PrintOrientation.LANDSCAPE);
    }
  } catch (e) {}
}

function CadeiaFrioRel_cfBorda_(rg) {
  rg.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

function CadeiaFrioRel_cfEstiloCabecalhoEscuro_(rg) {
  rg.setBackground(CadeiaFrioRel_CFCFG.CORES.CHUMBO)
    .setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function CadeiaFrioRel_cfEstiloCabecalhoClaro_(rg) {
  rg.setBackground('#e5e7eb')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function CadeiaFrioRel_cfInserirFaixaRelatorioInterno_(sh, row, span) {
  sh.getRange(row, 1, 1, span).merge()
    .setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA')
    .setFontSize(11).setFontWeight('bold')
    .setBackground('#111827').setFontColor('#f8fafc')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 20);
  sh.setRowHeight(row + 1, 8);
  return row + 2;
}

function CadeiaFrioRel_cfTituloSecao_(sh, row, titulo, corStatus) {
  sh.getRange(row, 1, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS).merge()
    .setValue(titulo)
    .setFontSize(13).setFontWeight('bold')
    .setBackground(corStatus).setFontColor(CadeiaFrioRel_CFCFG.CORES.TEXTO_BRANCO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  return row + 2;
}

function CadeiaFrioRel_cfListarTextos_(sh, row, titulo, lista, cor) {
  lista = Array.isArray(lista) ? lista : [];
  if (!lista.length) return row;

  sh.getRange(row, 1).setValue(titulo + ':').setFontWeight('bold').setFontColor(cor);
  row++;

  lista.forEach(function(texto) {
    sh.getRange(row, 1, 1, CadeiaFrioRel_CF_RESULTADOS_NUM_COLUNAS).merge().setValue('• ' + texto).setWrap(true);
    row++;
  });

  return row + 1;
}

// Rótulo de um par "rótulo: valor" nas abas de Evento/Autonomia — mescla
// as 2 primeiras colunas para o rótulo (textos longos como "Tempo-alvo
// definido para o ensaio" não cabem numa única coluna estreita sem
// cortar) e devolve a coluna onde o valor correspondente deve começar.
function CadeiaFrioRel_cfEscreverRotulo_(sh, row, texto) {
  sh.getRange(row, 1, 1, 2).merge().setValue(texto).setFontWeight('bold').setVerticalAlignment('middle');
  return 3;
}

function CadeiaFrioRel_cfRichTexto_(sh, r, c, textoCompleto, termosNegrito, corStatusPalavra, fontSize) {
  textoCompleto = String(textoCompleto || '');
  termosNegrito = termosNegrito || [];
  fontSize = Number(fontSize || 11);

  let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);

  const base = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).build();
  const boldBase = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).setBold(true).build();

  rtv.setTextStyle(0, textoCompleto.length, base);

  termosNegrito.forEach(function(termo) {
    if (!termo) return;
    let idx = textoCompleto.indexOf(termo);
    while (idx !== -1) {
      rtv.setTextStyle(idx, idx + termo.length, boldBase);
      idx = textoCompleto.indexOf(termo, idx + termo.length);
    }
  });

  if (corStatusPalavra) {
    const boldStatus = SpreadsheetApp.newTextStyle().setForegroundColor(corStatusPalavra).setFontSize(fontSize).setBold(true).build();
    ['APROVADO_COM_ALERTA', 'CARACTERIZACAO', 'REPROVADO', 'INFORMATIVO', 'APROVADO'].forEach(function(palavra) {
      let idx = textoCompleto.indexOf(palavra);
      while (idx !== -1) {
        rtv.setTextStyle(idx, idx + palavra.length, boldStatus);
        idx = textoCompleto.indexOf(palavra, idx + palavra.length);
      }
    });
  }

  sh.getRange(r, c)
    .setRichTextValue(rtv.build())
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');
}

function CadeiaFrioRel_cfEstimarLinhasTexto_(texto, charsPorLinha) {
  charsPorLinha = charsPorLinha || 85;
  const paragrafos = String(texto || '').split('\n');
  let total = 0;
  paragrafos.forEach(function(p) {
    total += Math.max(1, Math.ceil(p.length / charsPorLinha));
  });
  return total;
}

function CadeiaFrioRel_cfEscreverBlocoTextoRico_(sh, rowInicio, texto, termosNegrito, corStatus, fontSize, numColunas, charsPorLinha) {
  numColunas = numColunas || 1;
  // margem de segurança generosa: melhor sobrar espaço em branco no fim
  // do bloco do que arriscar cortar/sobrepor texto (linha "engolida").
  const linhasEstimadas = CadeiaFrioRel_cfEstimarLinhasTexto_(texto, charsPorLinha || 85) + 4;
  const rowFim = rowInicio + linhasEstimadas - 1;

  sh.getRange(rowInicio, 1, linhasEstimadas, numColunas).merge();
  CadeiaFrioRel_cfRichTexto_(sh, rowInicio, 1, texto, termosNegrito, corStatus, fontSize);
  for (let r = rowInicio; r <= rowFim; r++) sh.setRowHeight(r, 24);

  return rowFim + 1;
}

function CadeiaFrioRel_cfEscreverAssinatura_(sh, row, payload) {
  sh.getRange(row, 1)
    .setValue('______________________________________________________________')
    .setHorizontalAlignment('center');
  row++;

  sh.getRange(row, 1)
    .setValue((payload.responsavelTecnico || 'RESPONSÁVEL TÉCNICO') + ' — RESPONSÁVEL TÉCNICO / METROLOGIA')
    .setHorizontalAlignment('center')
    .setFontSize(10)
    .setFontWeight('bold');
  row++;

  return row;
}

function CadeiaFrioRel_cfTextoLista_(lista, vazio) {
  if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
  return lista.map(function(m, i) { return (i + 1) + '. ' + m; }).join('\n');
}

function CadeiaFrioRel_cfFmtC_(valor) {
  const n = Number(valor);
  if (!isFinite(n)) return '-';
  return n.toFixed(2) + ' °C';
}

function CadeiaFrioRel_cfEncontrarPiorAmplitude_(statsPorSensor) {
  if (!Array.isArray(statsPorSensor) || !statsPorSensor.length) return null;
  let pior = null;
  statsPorSensor.forEach(function(s) {
    const amp = (s && s.indicacaoMaxMin && typeof s.indicacaoMaxMin.maxMin === 'number') ? s.indicacaoMaxMin.maxMin : null;
    if (amp === null) return;
    if (!pior || amp > pior.maxMin) pior = { sensor: s.sensor, maxMin: amp };
  });
  return pior;
}


function CadeiaFrioRel_cfCorPorStatus_(status) {
  status = String(status || '').toUpperCase();
  if (status === 'REPROVADO') return CadeiaFrioRel_CFCFG.CORES.REPROVADO;
  if (status === 'APROVADO_COM_ALERTA' || status === 'INFORMATIVO' || status === 'CARACTERIZACAO') return CadeiaFrioRel_CFCFG.CORES.ALERTA;
  return CadeiaFrioRel_CFCFG.CORES.APROVADO;
}

function CadeiaFrioRel_cfLabelStatus_(status) {
  status = String(status || '').toUpperCase();
  if (status === 'REPROVADO') return 'REPROVADO';
  if (status === 'APROVADO_COM_ALERTA') return 'APROVADO (COM OBSERVAÇÃO)';
  if (status === 'INFORMATIVO') return 'INFORMATIVO (SEM TEMPO-ALVO DEFINIDO)';
  if (status === 'CARACTERIZACAO') return 'CARACTERIZAÇÃO (AUTONOMIA MEDIDA)';
  return 'APROVADO';
}

function CadeiaFrioRel_cfLabelEstudo_(tipo) {
  tipo = String(tipo || '').toUpperCase();
  const mapa = {
    DISTRIBUICAO_VAZIO: 'Distribuição de Temperatura em Vazio',
    DISTRIBUICAO_CARGA: 'Distribuição de Temperatura com Carga',
    ABERTURA_PORTA: 'Estudo de Abertura de Porta',
    QUEDA_ENERGIA: 'Estudo de Queda de Energia',
    AUTONOMIA: 'Estudo de Autonomia (Caixa Térmica)'
  };
  return mapa[tipo] || tipo;
}

/**
 * Normas técnicas e regulatórias aplicáveis ao laudo. Todo ensaio de
 * cadeia de frio se apoia na ABNT NBR 16328:2023 (procedimento técnico
 * de medição) dentro do arcabouço regulatório da RDC 430/2020 ANVISA
 * (boas práticas de armazenagem/transporte que exigem a qualificação).
 * Para o perfil de câmara de imunobiológicos/vacinas, soma-se o Manual
 * de Rede de Frio do PNI/Ministério da Saúde, referência específica
 * para a faixa de 2-8 °C de imunobiológicos.
 */
function CadeiaFrioRel_cfListarNormasAplicaveis_(chavePerfil) {
  const normas = [
    'ABNT NBR 16328:2023 — Refrigeradores, freezers e câmaras frias para conservação de produtos para a saúde — Requisitos de desempenho e método de ensaio (Anexo G — qualificação térmica: distribuição de temperatura, abertura de porta e queda de energia)',
    'RDC nº 430/2020 (ANVISA) — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos, incluindo os requisitos de cadeia de frio (rede de frio) para produtos termolábeis'
  ];

  if (String(chavePerfil || '').toUpperCase() === 'CAMARA_VACINA_2_8') {
    normas.push('Manual de Rede de Frio do Programa Nacional de Imunizações (PNI) — Ministério da Saúde, 5ª edição — diretrizes específicas de conservação de imunobiológicos na faixa de 2 °C a 8 °C');
  }

  return normas;
}

function CadeiaFrioRel_cfFmtMin_(valor) {
  const n = Number(valor);
  if (!isFinite(n)) return '-';
  return n.toFixed(2) + ' min';
}

function CadeiaFrioRel_cfFmtHoras_(minutos) {
  const n = Number(minutos);
  if (!isFinite(n)) return '-';
  return n.toFixed(1) + ' min (' + (n / 60).toFixed(2) + ' h)';
}
