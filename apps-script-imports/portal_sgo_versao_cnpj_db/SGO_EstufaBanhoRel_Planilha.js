/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — ESTUFA+BANHO-MARIA
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
const EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS = 7;
function EstufaBanhoRel_ebGerarPlanilhaEstufaBanhomaria(dados, analises, payload, perfilCfg) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado foi recebido para geração da planilha.');
  }
  if (!analises || !analises.length) {
    throw new Error('Nenhuma análise foi recebida para geração da planilha.');
  }
  payload = payload || {};
  const nomeArquivo = 'METROLABS_ESTUFABM_' + String(payload.perfil || '').trim() + '_' + Utilities.formatDate(new Date(), EstufaBanhoRel_EBCFG.TZ, 'ddMMyyyy_HHmm');
  const ss = SpreadsheetApp.create(nomeArquivo);
  ss.setSpreadsheetTimeZone(EstufaBanhoRel_EBCFG.TZ);
  ss.setSpreadsheetLocale('pt_BR');
  try {
    const folderIdConfigurado = EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID && String(EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID).length > 10 ? EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID : '';
    const folder = folderIdConfigurado ? DriveApp.getFolderById(folderIdConfigurado) : EstufaBanhoRel_ebObterPastaPersistente_('LAUDOS_FOLDER_ID', 'Estufa+Banho-maria - Laudos');
    const file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) {
    Logger.log('Aviso: pasta de destino não acessível. Detalhe: ' + e.message);
  }
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const statusConsolidado = EstufaBanhoRel_ebConsolidarStatus_(analises);
  const corStatusConsolidado = EstufaBanhoRel_ebCorPorStatus_(statusConsolidado);
  const relatorioSimulado = !!payload.modoRelatorioSimulado;
  const shCapa = ss.getSheets()[0];
  shCapa.setName('1. CAPA');
  EstufaBanhoRel_ebMontarCapa_(shCapa, analises, payload, perfilCfg, statusConsolidado, corStatusConsolidado, relatorioSimulado);
  analises.forEach(function (analise) {
    const sufixo = EstufaBanhoRel_ebNomeCurtoEstudo_(analise.tipoEstudo);
    const statusEstudo = String(analise.statusAprovacao || 'INFORMATIVO').toUpperCase();
    const corEstudo = EstufaBanhoRel_ebCorPorStatus_(statusEstudo);
    const dadosEstudo = analise._dadosFatia || dados;
    const shResultados = ss.insertSheet('RESULTADOS — ' + sufixo);
    EstufaBanhoRel_ebMontarResultados_(shResultados, analise, statusEstudo, corEstudo, relatorioSimulado);
    const shDados = ss.insertSheet('DADOS — ' + sufixo);
    EstufaBanhoRel_ebMontarDadosBrutos_(shDados, dadosEstudo, analise, nSensores);
    const shConclusao = ss.insertSheet('CONCLUSÃO — ' + sufixo);
    EstufaBanhoRel_ebMontarConclusaoTecnica_(shConclusao, analise, payload, perfilCfg, statusEstudo, corEstudo, relatorioSimulado);
  });
  const shParecer = ss.insertSheet('PARECER TÉCNICO FINAL');
  EstufaBanhoRel_ebMontarParecerTecnico_(shParecer, analises, payload, statusConsolidado, corStatusConsolidado, relatorioSimulado);
  ss.setActiveSheet(shCapa);
  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}
function EstufaBanhoRel_ebNomeCurtoEstudo_(tipo) {
  if(EstufaBanhoRel_ebEhSecadora_(tipo))return tipo.replace('SECADORA_','SEC. ').replace('_',' ');
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
function EstufaBanhoRel_ebMontarCapa_(sh, analises, payload, perfilCfg, statusConsolidado, corStatusConsolidado, relatorioSimulado) {
  EstufaBanhoRel_ebLayoutA4Paisagem_(sh);
  const larguraCol = Math.round((EstufaBanhoRel_EBCFG.LARGURA_PAGINA_PX || 1500) / 6);
  sh.setColumnWidths(1, 6, larguraCol);
  let row = 1;
  sh.getRange(row, 1, 1, 6).merge().setValue(EstufaBanhoRel_EBCFG.APP_TITLE || 'METROLABS - ESTUFA+BANHO-MARIA').setFontSize(18).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 36);
  row++;
  sh.getRange(row, 1, 1, 6).merge().setValue('LAUDO DE QUALIFICAÇÃO TÉRMICA').setFontSize(11).setFontStyle('italic').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 18);
  row++;
  sh.setRowHeight(row, 8);
  row++;
  if (relatorioSimulado) {
    row = EstufaBanhoRel_ebInserirFaixaRelatorioInterno_(sh, row, 6);
  }

  const primeiraFaixa = analises[0] && analises[0].faixa || {};
  const linhas = [['Cliente', payload.cliente || payload.razaoSocial || '-'], ['CNPJ', payload.cnpj || '-'], ['Equipamento', perfilCfg && perfilCfg.label || payload.perfil || '-'], ['TAG / Identificação', payload.tagEquipamento || '-'], ['Marca / Modelo', [payload.marca, payload.modelo].filter(Boolean).join(' / ') || '-'], ['Número de série', payload.numeroSerie || '-'], ['Localização', payload.localizacao || '-'], ['Volume interno declarado', payload.volumeLitros ? payload.volumeLitros + ' L' : '-'], ['Critério de aprovação (faixa + tolerância)', primeiraFaixa.tMin !== undefined ? EstufaBanhoRel_ebFmtC_(primeiraFaixa.tMin) + ' a ' + EstufaBanhoRel_ebFmtC_(primeiraFaixa.tMax) + ' — tolerância de ' + EstufaBanhoRel_ebFmtC_(primeiraFaixa.tolerancia) : '-'], ['Responsável técnico', payload.responsavelTecnico || '-'], ['Data de emissão', Utilities.formatDate(new Date(), EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm')]];

  // Anexo I (banho-maria) — item I.2.e/f da norma exige constar se o
  // ensaio usou tampa e se havia líquido suficiente na cuba.
  if (perfilCfg && perfilCfg.anexo === 'I') {
    linhas.splice(linhas.length - 1, 0, ['Utilizou tampa durante o ensaio? (NBR 16328, I.2.f)', payload.usoTampa === 'SIM' ? 'SIM' : payload.usoTampa === 'NAO' ? 'NÃO' : 'Não informado'], ['Quantidade de líquido na cuba', payload.quantidadeLiquido || 'Não informado']);
  }
  linhas.push(['Sensores utilizados',EstufaBanhoRel_ebResumoSensores_(analises[0].sensoresAtivos)]);
  linhas.forEach(function (par) {
    sh.getRange(row, 1).setValue(par[0]).setFontWeight('bold').setBackground('#e5e7eb').setVerticalAlignment('middle');
    sh.getRange(row, 2, 1, 5).merge().setValue(par[1]).setVerticalAlignment('middle');
    EstufaBanhoRel_ebBorda_(sh.getRange(row, 1, 1, 6));
    sh.setRowHeight(row, 22);
    row++;
  });
  sh.setRowHeight(row, 8);
  row++;
  sh.getRange(row, 1, 1, 6).merge().setValue('ESTUDOS INCLUÍDOS NESTE LAUDO').setFontSize(12).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 22);
  row++;
  sh.getRange(row, 1, 1, 2).merge().setValue('Estudo');
  sh.getRange(row, 3, 1, 2).merge().setValue('Início');
  sh.getRange(row, 5).setValue('Fim');
  sh.getRange(row, 6).setValue('Status');
  EstufaBanhoRel_ebEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, 6));
  sh.setRowHeight(row, 20);
  row++;
  const linhaInicioTabelaEstudos = row;
  analises.forEach(function (a) {
    const tipo = String(a.tipoEstudo || '').toUpperCase();
    const ehEvento = tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA';
    const inicio = ehEvento ? a.tempoInicioEvento : a.tempoInicio;
    const fim = ehEvento ? a.tempoFimEvento || '(sem término informado)' : a.tempoFim;
    sh.getRange(row, 1, 1, 2).merge().setValue(EstufaBanhoRel_ebLabelEstudo_(tipo)).setVerticalAlignment('middle');
    sh.getRange(row, 3, 1, 2).merge().setValue(inicio || '-').setVerticalAlignment('middle');
    sh.getRange(row, 5).setValue(fim || '-').setVerticalAlignment('middle');
    sh.getRange(row, 6).setValue(EstufaBanhoRel_ebLabelStatus_(a.statusAprovacao)).setFontColor(EstufaBanhoRel_ebCorPorStatus_(a.statusAprovacao)).setFontWeight('bold').setVerticalAlignment('middle');
    sh.setRowHeight(row, 22);
    row++;
  });
  EstufaBanhoRel_ebBorda_(sh.getRange(linhaInicioTabelaEstudos - 1, 1, analises.length + 1, 6));
  sh.setRowHeight(row, 8);
  row++;
  sh.getRange(row, 1, 1, 6).merge().setValue('REFERÊNCIAS NORMATIVAS').setFontSize(12).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 22);
  row++;
  const normas = EstufaBanhoRel_ebListarNormasAplicaveis_(payload.perfil);
  normas.forEach(function (norma, i) {
    sh.getRange(row, 1, 1, 6).merge().setValue(i + 1 + '. ' + norma).setWrap(true).setVerticalAlignment('middle').setFontSize(9);
    sh.setRowHeight(row, 26);
    row++;
  });
  EstufaBanhoRel_ebBorda_(sh.getRange(row - normas.length, 1, normas.length, 6));
  sh.setRowHeight(row, 8);
  row++;
  sh.getRange(row, 1, 1, 6).merge().setValue('STATUS DO LAUDO: ' + EstufaBanhoRel_ebLabelStatus_(statusConsolidado)).setFontSize(15).setFontWeight('bold').setBackground(corStatusConsolidado).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 32);
}

// ------------------------------------------------------------
// ABA 2 — RESULTADOS (varia por tipo de estudo)
// ------------------------------------------------------------
function EstufaBanhoRel_ebMontarResultados_(sh, analise, statusAprovacao, corStatus, relatorioSimulado) {
  EstufaBanhoRel_ebLayoutA4Paisagem_(sh);
  // Largura de coluna é decidida por cada sub-layout abaixo (Distribuição
  // usa uma tabela por sensor; Evento/Autonomia usam pares rótulo:valor
  // com rótulos bem mais longos) — mas ambos somam à mesma largura total
  // de página (EBCFG.LARGURA_PAGINA_PX), para a barra de título terminar
  // sempre no mesmo ponto que o conteúdo abaixo dela.
  sh.setColumnWidths(1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS, Math.round((EstufaBanhoRel_EBCFG.LARGURA_PAGINA_PX || 1500) / EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS));
  let linhaInicial = 1;
  if (relatorioSimulado) {
    linhaInicial = EstufaBanhoRel_ebInserirFaixaRelatorioInterno_(sh, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS);
  }
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  if (EstufaBanhoRel_ebEhDistribuicao_(tipo)) {
    EstufaBanhoRel_ebMontarResultadosDistribuicao_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    EstufaBanhoRel_ebMontarResultadosEvento_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  } else if (tipo === 'AUTONOMIA') {
    EstufaBanhoRel_ebMontarResultadosAutonomia_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  } else if (tipo === 'DISTRIBUICAO_VAZIO_E' || tipo === 'PENETRACAO_CARGA_E') {
    EstufaBanhoRel_ebMontarResultadosAnexoE_(sh, analise, statusAprovacao, corStatus, linhaInicial);
  }
}

/**
 * Layout simples (ainda não passou pelas rodadas de refinamento visual
 * que Distribuição/Evento/Autonomia tiveram no Cadeia de Frio) — 1 aba
 * consolidada com as 3 repetições lado a lado, decisão confirmada com
 * o usuário em 2026-07-21. Cada repetição vira uma linha de tabela;
 * PENETRACAO_CARGA_E soma as colunas de letalidade (FH/FD) e do
 * resultado de laboratório (indicador biológico/endotoxina).
 */
function EstufaBanhoRel_ebMontarResultadosAnexoE_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  const ehPenetracao = String(analise.tipoEstudo || '').toUpperCase() === 'PENETRACAO_CARGA_E';
  row = EstufaBanhoRel_ebTituloSecao_(sh, row, EstufaBanhoRel_ebLabelEstudo_(analise.tipoEstudo) + ' — RESULTADOS CONSOLIDADOS (' + (analise.quantidadeRepeticoes || 0) + ' REPETIÇÕES)', corStatus);
  const header = ehPenetracao ? ['Repetição', 'Início', 'Fim', 'Duração', analise.repeticoes[0] ? analise.repeticoes[0].valorLabel + ' mín' : 'Letalidade', 'Laboratório', 'Status'] : ['Repetição', 'Início', 'Fim', 'Duração', 'Mín (°C)', 'Máx (°C)', 'Status'];
  header.forEach(function (h, i) {
    sh.getRange(row, i + 1).setValue(h).setFontWeight('bold');
  });
  row++;
  (analise.repeticoes || []).forEach(function (rep, idx) {
    sh.getRange(row, 1).setValue('Rep. ' + (idx + 1));
    sh.getRange(row, 2).setValue(rep.tempoInicio || '-');
    sh.getRange(row, 3).setValue(rep.tempoFim || '-');
    sh.getRange(row, 4).setValue(EstufaBanhoRel_ebFmtHoras_(rep.tempoTotalMinutos));
    if (ehPenetracao) {
      sh.getRange(row, 5).setValue(rep.minLetalidade + ' min (pior: ' + (rep.piorSensor ? rep.piorSensor.sensor : 'N/A') + ')');
      const ind = rep.indicadorResultado;
      sh.getRange(row, 6).setValue(ind && ind.tipo ? ind.tipo + ' — ' + (ind.aprovado === false ? 'REPROVADO' : ind.aprovado === true ? 'APROVADO' : 'SEM RESULTADO') : 'Não informado');
    } else {
      sh.getRange(row, 5).setValue(EstufaBanhoRel_ebFmtC_(rep.statsGlobal ? rep.statsGlobal.min : null));
      sh.getRange(row, 6).setValue(EstufaBanhoRel_ebFmtC_(rep.statsGlobal ? rep.statsGlobal.max : null));
    }
    const corRep = rep.statusAprovacao === 'REPROVADO' ? EstufaBanhoRel_EBCFG.CORES.REPROVADO : rep.statusAprovacao === 'APROVADO_COM_ALERTA' ? EstufaBanhoRel_EBCFG.CORES.ALERTA : EstufaBanhoRel_EBCFG.CORES.APROVADO;
    sh.getRange(row, 7).setValue(EstufaBanhoRel_ebLabelStatus_(rep.statusAprovacao)).setFontColor(corRep).setFontWeight('bold');
    row++;
  });
  row += 1;
  sh.getRange(row, 1, 1, 2).merge().setValue('VEREDITO CONSOLIDADO').setFontWeight('bold');
  sh.getRange(row, 3, 1, 4).merge().setValue(EstufaBanhoRel_ebLabelStatus_(statusAprovacao)).setFontColor(corStatus).setFontWeight('bold');
  row += 2;
  if ((analise.motivosReprovacao || []).length) {
    row = EstufaBanhoRel_ebListarTextos_(sh, row, 'MOTIVOS DE REPROVAÇÃO', analise.motivosReprovacao, EstufaBanhoRel_EBCFG.CORES.REPROVADO);
  }
  if ((analise.alertasAnalise || []).length) {
    row = EstufaBanhoRel_ebListarTextos_(sh, row, 'ALERTAS', analise.alertasAnalise, EstufaBanhoRel_EBCFG.CORES.ALERTA);
  }
}
function EstufaBanhoRel_ebMontarResultadosDistribuicao_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  row = EstufaBanhoRel_ebTituloSecao_(sh, row, EstufaBanhoRel_ebLabelEstudo_(analise.tipoEstudo) + ' — RESULTADOS', corStatus);
  sh.getRange(row, 1).setValue('Início').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.tempoInicio || '-');
  sh.getRange(row, 3).setValue('Fim').setFontWeight('bold');
  sh.getRange(row, 4).setValue(analise.tempoFim || '-');
  sh.getRange(row, 5).setValue('Duração total').setFontWeight('bold');
  sh.getRange(row, 6).setValue(EstufaBanhoRel_ebFmtHoras_(analise.tempoTotalMinutos));
  row += 2;
  const header = ['Sensor', 'Mín (°C)', 'Máx (°C)', 'Média (°C)', 'Máx-Mín', 'Média-Mín', 'Máx-Média'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  EstufaBanhoRel_ebEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;
  const linhaInicioTabela = row;
  const linhaGlobal = ['GLOBAL', analise.statsGlobal.min, analise.statsGlobal.max, analise.statsGlobal.media, analise.statsGlobal.indicacaoMaxMin.maxMin, analise.statsGlobal.indicacaoMaxMin.mediaMin, analise.statsGlobal.indicacaoMaxMin.maxMedia];
  sh.getRange(row, 1, 1, linhaGlobal.length).setValues([linhaGlobal]).setFontWeight('bold');
  row++;
  (analise.statsPorSensor || []).forEach(function (s) {
    const linha = [s.sensor, s.min, s.max, s.media, s.indicacaoMaxMin.maxMin, s.indicacaoMaxMin.mediaMin, s.indicacaoMaxMin.maxMedia];
    sh.getRange(row, 1, 1, linha.length).setValues([linha]);
    row++;
  });
  const totalLinhasTabela = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 2, totalLinhasTabela, header.length - 1).setNumberFormat('0.00').setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhasTabela, 1).setHorizontalAlignment('center');
  EstufaBanhoRel_ebBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhasTabela + 1, header.length));
  row += 2;
  if (analise.piorSensor) {
    const colValor = EstufaBanhoRel_ebEscreverRotulo_(sh, row, 'Pior leitura');
    sh.getRange(row, colValor, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS - colValor + 1).merge().setValue(analise.piorSensor.sensor + ': ' + EstufaBanhoRel_ebFmtC_(analise.piorSensor.valor) + ' em ' + analise.piorSensor.tempoStr + ' (desvio de ' + EstufaBanhoRel_ebFmtC_(analise.piorSensor.desvio) + ' em relação à faixa)');
    row++;
  }
  if (analise.primeiraRupturaGlobal) {
    const colValor = EstufaBanhoRel_ebEscreverRotulo_(sh, row, 'Primeira excursão registrada');
    sh.getRange(row, colValor, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS - colValor + 1).merge().setValue(analise.primeiraRupturaGlobal.sensor + ': ' + EstufaBanhoRel_ebFmtC_(analise.primeiraRupturaGlobal.valor) + ' em ' + analise.primeiraRupturaGlobal.tempoStr);
    row++;
  }
  row += 1;
  row = EstufaBanhoRel_ebEscreverTabelaConformidadePorSensor_(sh, row, analise.conformidadePorSensor);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Motivos de reprovação', analise.motivosReprovacao, EstufaBanhoRel_EBCFG.CORES.REPROVADO);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Alertas', analise.alertasAnalise, EstufaBanhoRel_EBCFG.CORES.ALERTA);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, EstufaBanhoRel_EBCFG.CORES.INFO);
}
function EstufaBanhoRel_ebMontarResultadosEvento_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  row = EstufaBanhoRel_ebTituloSecao_(sh, row, EstufaBanhoRel_ebLabelEstudo_(analise.tipoEstudo) + ' — RESULTADOS', corStatus);
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
    let colValor = EstufaBanhoRel_ebEscreverRotulo_(sh, row, 'Sensor / valor da ruptura');
    sh.getRange(row, colValor, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS - colValor + 1).merge().setValue(analise.primeiraRuptura.sensor + ': ' + analise.primeiraRuptura.valor + ' °C em ' + analise.primeiraRuptura.tempoStr);
    row++;
    sh.getRange(row, 1).setValue('Tempo até a ruptura').setFontWeight('bold');
    sh.getRange(row, 2).setValue(EstufaBanhoRel_ebFmtMin_(analise.tempoAteRupturaMinutos));
    row++;
  }
  sh.getRange(row, 1).setValue('Recuperou totalmente?').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.recuperouTotalmente ? 'SIM' : analise.rompeu ? 'NÃO OBSERVADO NO PERÍODO GRAVADO' : 'N/A');
  row++;
  if (analise.recuperouTotalmente) {
    sh.getRange(row, 1).setValue('Tempo até a recuperação').setFontWeight('bold');
    sh.getRange(row, 2).setValue(EstufaBanhoRel_ebFmtMin_(analise.tempoAteRecuperacaoMinutos));
    row++;
  }
  if (analise.tempoAlvoMinutos !== null && analise.tempoAlvoMinutos !== undefined && isFinite(analise.tempoAlvoMinutos)) {
    row++;
    const colValor = EstufaBanhoRel_ebEscreverRotulo_(sh, row, 'Tempo-alvo definido para o ensaio');
    sh.getRange(row, colValor).setValue(EstufaBanhoRel_ebFmtMin_(analise.tempoAlvoMinutos));
    row++;
  }
  row += 1;
  row = EstufaBanhoRel_ebEscreverTabelaComportamentoSensores_(sh, row, 'Comportamento dos sensores durante o evento', analise._dadosDesdeInicioEvento || analise._dadosFatia, analise.sensoresAtivos);
  row += 1;
  row = EstufaBanhoRel_ebEscreverTabelaConformidadePorSensor_(sh, row, analise.conformidadePorSensor);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Motivos de reprovação', analise.motivosReprovacao, EstufaBanhoRel_EBCFG.CORES.REPROVADO);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Alertas', analise.alertasAnalise, EstufaBanhoRel_EBCFG.CORES.ALERTA);
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, EstufaBanhoRel_EBCFG.CORES.INFO);
}
function EstufaBanhoRel_ebMontarResultadosAutonomia_(sh, analise, statusAprovacao, corStatus, linhaInicial) {
  let row = linhaInicial || 1;
  row = EstufaBanhoRel_ebTituloSecao_(sh, row, 'AUTONOMIA — RESULTADOS', corStatus);
  sh.getRange(row, 1).setValue('Início do ensaio').setFontWeight('bold');
  sh.getRange(row, 2).setValue(analise.tempoInicio || '-');
  sh.getRange(row, 3).setValue('Fim do período gravado').setFontWeight('bold');
  sh.getRange(row, 4).setValue(analise.tempoFim || '-');
  row += 2;
  sh.getRange(row, 1).setValue('Autonomia medida').setFontWeight('bold');
  sh.getRange(row, 2, 1, 3).merge().setValue(EstufaBanhoRel_ebFmtHoras_(analise.autonomiaMinutos)).setFontSize(13).setFontWeight('bold');
  row++;
  const colValorAutonomia = EstufaBanhoRel_ebEscreverRotulo_(sh, row, 'Ultrapassou a faixa dentro do período gravado?');
  sh.getRange(row, colValorAutonomia).setValue(analise.rompeu ? 'SIM' : 'NÃO');
  row += 1;
  row = EstufaBanhoRel_ebEscreverTabelaComportamentoSensores_(sh, row, 'Comportamento dos sensores durante o período gravado', analise._dadosFatia, analise.sensoresAtivos);
  row += 1;
  row = EstufaBanhoRel_ebListarTextos_(sh, row, 'Observações', analise.observacoesAnalise, EstufaBanhoRel_EBCFG.CORES.INFO);
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
function EstufaBanhoRel_ebCalcularStatsSimplesPorSensor_(dados, sensoresAtivos) {
  if (!Array.isArray(dados) || !dados.length) return null;
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) return null;
  const ativos = Array.isArray(sensoresAtivos) && sensoresAtivos.length ? sensoresAtivos : Array.from({
    length: nSensores
  }, function () {
    return true;
  });
  const porSensor = Array.from({
    length: nSensores
  }, function (_, i) {
    return {
      sensor: 'S' + (i + 1),
      min: null,
      max: null,
      soma: 0,
      count: 0
    };
  });
  dados.forEach(function (row) {
    const temps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;
      const t = EstufaBanhoRel_ebParseNumero_(temps[s]);
      if (t === null || !isFinite(t)) continue;
      const acc = porSensor[s];
      if (acc.min === null || t < acc.min) acc.min = t;
      if (acc.max === null || t > acc.max) acc.max = t;
      acc.soma += t;
      acc.count++;
    }
  });
  return porSensor.filter(function (s, i) {
    return ativos[i] && s.count > 0;
  }).map(function (s) {
    return {
      sensor: s.sensor,
      min: EstufaBanhoRel_ebRound_(s.min, 2),
      max: EstufaBanhoRel_ebRound_(s.max, 2),
      media: EstufaBanhoRel_ebRound_(s.soma / s.count, 2)
    };
  });
}
function EstufaBanhoRel_ebEscreverTabelaComportamentoSensores_(sh, row, titulo, dadosFatia, sensoresAtivos) {
  const stats = EstufaBanhoRel_ebCalcularStatsSimplesPorSensor_(dadosFatia, sensoresAtivos);
  if (!stats || !stats.length) return row;
  sh.getRange(row, 1, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS).merge().setValue(titulo).setFontWeight('bold').setVerticalAlignment('middle');
  row++;
  const header = ['Sensor', 'Mín (°C)', 'Máx (°C)', 'Amplitude (°C)'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  EstufaBanhoRel_ebEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;
  const linhaInicioTabela = row;
  stats.forEach(function (s) {
    sh.getRange(row, 1, 1, 4).setValues([[s.sensor, s.min, s.max, EstufaBanhoRel_ebRound_(s.max - s.min, 2)]]);
    row++;
  });
  const totalLinhas = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 2, totalLinhas, 3).setNumberFormat('0.00').setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhas, 1).setHorizontalAlignment('center');
  EstufaBanhoRel_ebBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhas + 1, 4));
  return row + 1;
}

// Rótulo/cor de exibição do status por sensor — escala própria (não a
// mesma de ebLabelStatus_/ebCorPorStatus_, que é do veredito GLOBAL do
// estudo) porque aqui o "reprovado" da posição não implica reprovar o
// laudo inteiro, e vice-versa: um laudo pode ser aprovado globalmente
// mas ter uma posição específica não conforme, ou o contrário.
function EstufaBanhoRel_ebLabelStatusSensor_(status) {
  if (status === 'NAO_CONFORME') return 'NÃO CONFORME';
  if (status === 'CONFORME_COM_RESSALVA') return 'CONFORME COM RESSALVA';
  return 'CONFORME';
}
function EstufaBanhoRel_ebCorStatusSensor_(status) {
  if (status === 'NAO_CONFORME') return EstufaBanhoRel_EBCFG.CORES.REPROVADO;
  if (status === 'CONFORME_COM_RESSALVA') return EstufaBanhoRel_EBCFG.CORES.ALERTA;
  return EstufaBanhoRel_EBCFG.CORES.APROVADO;
}

/**
 * Tabela "Conformidade por posição/sensor" — complementa (nunca decide
 * sozinha) o veredito global do estudo, mostrando por sensor: direção e
 * magnitude do pior desvio (abaixo/acima da faixa), quanto tempo ficou
 * fora e se terminou o período fora da faixa. O equipamento pode ter
 * uma posição conforme e outra sistematicamente fora (ex.: perto de uma
 * fonte de calor) — essa granularidade é perdida no veredito global sozinho.
 * Usa analise.conformidadePorSensor (Engine.js ebAvaliarConformidadePorSensor_).
 */
function EstufaBanhoRel_ebEscreverTabelaConformidadePorSensor_(sh, row, conformidadePorSensor) {
  if (!Array.isArray(conformidadePorSensor) || !conformidadePorSensor.length) return row;
  sh.getRange(row, 1, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS).merge().setValue('Conformidade por posição/sensor').setFontWeight('bold').setVerticalAlignment('middle');
  row++;
  const header = ['Sensor', 'Status', 'Mín (°C)', 'Máx (°C)', 'Desvio abaixo (°C)', 'Desvio acima (°C)', '% tempo fora da faixa'];
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  EstufaBanhoRel_ebEstiloCabecalhoClaro_(sh.getRange(row, 1, 1, header.length));
  row++;
  const linhaInicioTabela = row;
  const naoConformes = [];
  conformidadePorSensor.forEach(function (c) {
    sh.getRange(row, 1, 1, header.length).setValues([[c.sensor, EstufaBanhoRel_ebLabelStatusSensor_(c.statusSensor), c.min, c.max, c.piorDesvioAbaixo, c.piorDesvioAcima, c.percentualForaFaixa]]);
    sh.getRange(row, 2).setFontColor(EstufaBanhoRel_ebCorStatusSensor_(c.statusSensor)).setFontWeight('bold');
    if (c.statusSensor === 'NAO_CONFORME') naoConformes.push(c.sensor);
    row++;
  });
  const totalLinhas = row - linhaInicioTabela;
  sh.getRange(linhaInicioTabela, 3, totalLinhas, 4).setNumberFormat('0.00').setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 2, totalLinhas, 1).setHorizontalAlignment('center');
  sh.getRange(linhaInicioTabela, 1, totalLinhas, 1).setHorizontalAlignment('center');
  EstufaBanhoRel_ebBorda_(sh.getRange(linhaInicioTabela - 1, 1, totalLinhas + 1, header.length));
  row++;
  if (naoConformes.length) {
    sh.getRange(row, 1, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS).merge().setWrap(true).setValue('Posições não conformes: ' + naoConformes.join(', ') + ' — não recomendadas para uso nesta configuração. ' + 'Ver análise detalhada por posição no Certificado de Qualificação Térmica.').setFontColor(EstufaBanhoRel_EBCFG.CORES.REPROVADO);
    row++;
  }
  return row + 1;
}

// ------------------------------------------------------------
// ABA 3 — DADOS BRUTOS (inclui colunas de referência de faixa,
// usadas depois pelo Graficos.js para desenhar as linhas de limite)
// ------------------------------------------------------------
function EstufaBanhoRel_ebMontarDadosBrutos_(sh, dados, analise, nSensores) {
  const faixa = analise.faixa || {
    tMin: null,
    tMax: null
  };

  // Só entram na tabela (e, por consequência, no gráfico que lê esta
  // aba) os sensores marcados como ativos na tela — sensores desmarcados
  // ficam de fora tanto dos dados brutos quanto do gráfico, em vez de
  // aparecerem sempre com a quantidade total instalada.
  const ativos = Array.isArray(analise.sensoresAtivos) && analise.sensoresAtivos.length ? analise.sensoresAtivos : Array.from({
    length: nSensores
  }, function () {
    return true;
  });
  const ativosIdx = [];
  for (let s = 0; s < nSensores; s++) if (ativos[s]) ativosIdx.push(s);
  const header = ['Tempo'];
  ativosIdx.forEach(function (s) {
    header.push('Sensor S' + (s + 1));
  });
  // Valor numérico embutido no próprio rótulo (não só "Limite Mín") pra
  // quem olha o gráfico/legenda entender de cara o que a linha tracejada
  // representa, sem precisar caçar o número em outra aba.
  header.push('Limite Mínimo (' + EstufaBanhoRel_ebFmtC_(faixa.tMin) + ')', 'Limite Máximo (' + EstufaBanhoRel_ebFmtC_(faixa.tMax) + ')', 'Marcador do Ensaio');
  EstufaBanhoRel_ebGarantirGrade_(sh,dados.length+1,header.length);
  const linhas = dados.map(function (row) {
    const todasTemps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const temps = ativosIdx.map(function (s) {
      return todasTemps[s] !== undefined ? todasTemps[s] : null;
    });
    return [row.tempoStr].concat(temps).concat([faixa.tMin, faixa.tMax, '']);
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  EstufaBanhoRel_ebEstiloCabecalhoEscuro_(sh.getRange(1, 1, 1, header.length));

  // As colunas "Limite Mínimo (X,XX °C)"/"Limite Máximo (X,XX °C)" têm
  // rótulo bem mais longo que "Sensor S1" — na largura uniforme de 72px
  // (igual à dos sensores) o texto cortava ("Mínimo (2." / "Máximo (8.").
  // Corrigido SÓ nessas 2 colunas (largura própria + quebra de linha no
  // cabeçalho), sem tocar EBCFG.LARGURA_PAGINA_PX nem a largura das
  // colunas de sensor — o cálculo da coluna do marcador abaixo já
  // contabiliza essa largura extra, então mesmo com 12 sensores ativos a
  // soma total da tabela continua batendo com a largura das abas
  // vizinhas (Gráfico, Resultados etc.), sem estourar página.
  const LARGURA_COL_SENSOR = 72;
  // 90px é o maior valor que ainda soma exatamente EBCFG.LARGURA_PAGINA_PX
  // mesmo no pior caso (12 sensores ativos, o teto do sistema) sem
  // acionar o piso de 300px da coluna do marcador abaixo — testado para
  // 1 a 12 sensores, sempre bate 1500px exatos, nunca estoura página.
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
  // ebMarcarEventosDadosBrutos_), mas dimensionada para a soma total da
  // tabela bater com EBCFG.LARGURA_PAGINA_PX (a mesma largura de toda
  // outra aba do laudo) sempre que os sensores já não tiverem consumido
  // esse espaço sozinhos — sem isso, esta aba ficava mais larga que as
  // vizinhas (Gráfico, Resultados etc.) e a borda direita não alinhava
  // entre as páginas.
  const larguraFixaSemMarcador = 150 + ativosIdx.length * LARGURA_COL_SENSOR + 2 * LARGURA_COL_LIMITE;
  const larguraMarcador = Math.max(300, (EstufaBanhoRel_EBCFG.LARGURA_PAGINA_PX || 1500) - larguraFixaSemMarcador);
  sh.setColumnWidth(header.length, larguraMarcador);
  if (linhas.length) {
    sh.getRange(2, 1, linhas.length, header.length).setValues(linhas);
    sh.getRange(2, 2, linhas.length, header.length - 2).setNumberFormat('0.00').setHorizontalAlignment('center');
    sh.getRange(2, 1, linhas.length, 1).setHorizontalAlignment('center');
    EstufaBanhoRel_ebBorda_(sh.getRange(1, 1, linhas.length + 1, header.length));
    EstufaBanhoRel_ebMarcarEventosDadosBrutos_(sh, dados, analise, header.length);
  }
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
}

/**
 * Destaca visualmente (cor de fundo + rótulo na última coluna) as
 * linhas de início/fim de cada ensaio dentro da própria tabela de
 * dados brutos — mesmo papel da coloração por fase de processo da
 * Autoclave/Cadeia de Frio, adaptado à estufa de incubação: aqui as "fases" são os
 * marcos do ensaio (início/fim da distribuição, início/fim do
 * evento de porta/energia, ruptura detectada, início/fim do
 * período gravado de autonomia).
 */
function EstufaBanhoRel_ebMarcarEventosDadosBrutos_(sh, dados, analise, totalColunas) {
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  const marcadores = [];
  function idxPorTempoStr(tempoStr) {
    if (!tempoStr) return -1;
    return dados.findIndex(function (r) {
      return r.tempoStr === tempoStr;
    });
  }
  if (EstufaBanhoRel_ebEhDistribuicao_(tipo)) {
    marcadores.push({
      idx: 0,
      texto: '◀ INÍCIO DO ENSAIO — ' + EstufaBanhoRel_ebLabelEstudo_(tipo).toUpperCase(),
      cor: '#dbeafe'
    });
    marcadores.push({
      idx: dados.length - 1,
      texto: '◀ FIM DO ENSAIO — ' + EstufaBanhoRel_ebLabelEstudo_(tipo).toUpperCase(),
      cor: '#dbeafe'
    });
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    const rotulo = EstufaBanhoRel_ebLabelEstudo_(tipo).toUpperCase();
    const idxInicio = idxPorTempoStr(analise.tempoInicioEvento);
    if (idxInicio !== -1) marcadores.push({
      idx: idxInicio,
      texto: '◀ INÍCIO DO EVENTO — ' + rotulo,
      cor: '#fef3c7'
    });
    if (analise.tempoFimEvento) {
      const idxFim = idxPorTempoStr(analise.tempoFimEvento);
      if (idxFim !== -1) marcadores.push({
        idx: idxFim,
        texto: '◀ TÉRMINO DO EVENTO — ' + rotulo,
        cor: '#dcfce7'
      });
    }
    if (analise.rompeu && analise.primeiraRuptura) {
      const idxRuptura = idxPorTempoStr(analise.primeiraRuptura.tempoStr);
      if (idxRuptura !== -1) marcadores.push({
        idx: idxRuptura,
        texto: '◀ RUPTURA DETECTADA (' + analise.primeiraRuptura.sensor + ')',
        cor: '#fecaca'
      });
    }
  } else if (tipo === 'AUTONOMIA') {
    marcadores.push({
      idx: 0,
      texto: '◀ INÍCIO DO PERÍODO GRAVADO',
      cor: '#dbeafe'
    });
    marcadores.push({
      idx: dados.length - 1,
      texto: '◀ FIM DO PERÍODO GRAVADO',
      cor: '#dbeafe'
    });
    if (analise.rompeu && analise.primeiraRuptura) {
      const idxRuptura = idxPorTempoStr(analise.primeiraRuptura.tempoStr);
      if (idxRuptura !== -1) marcadores.push({
        idx: idxRuptura,
        texto: '◀ RUPTURA (LIMITE DA AUTONOMIA)',
        cor: '#fecaca'
      });
    }
  }
  marcadores.forEach(function (m) {
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
function EstufaBanhoRel_ebMontarConclusaoTecnica_(sh, analise, payload, perfilCfg, statusAprovacao, corStatus, relatorioSimulado) {
  EstufaBanhoRel_ebLayoutA4Paisagem_(sh);
  sh.setColumnWidth(1, EstufaBanhoRel_EBCFG.LARGURA_PAGINA_PX || 1500);
  let row = 1;
  sh.getRange(row, 1).setValue('CONCLUSÃO TÉCNICA').setFontSize(14).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  row += 2;
  if (relatorioSimulado) {
    row = EstufaBanhoRel_ebInserirFaixaRelatorioInterno_(sh, row, 1);
  }
  const texto = EstufaBanhoRel_ebMontarTextoTecnico_(analise, payload, perfilCfg, statusAprovacao);
  row = EstufaBanhoRel_ebEscreverBlocoTextoRico_(sh, row, texto, [EstufaBanhoRel_ebLabelEstudo_(analise.tipoEstudo)], corStatus, 12, 1, 145);
  row += 1;
  row = EstufaBanhoRel_ebEscreverAssinatura_(sh, row, payload);
}
function EstufaBanhoRel_ebMontarTextoTecnico_(analise, payload, perfilCfg, statusAprovacao) {
  const nomeEquip = perfilCfg && perfilCfg.label || payload.perfil || 'equipamento avaliado';
  const tipo = String(analise.tipoEstudo || '').toUpperCase();
  const faixa = analise.faixa || {};
  const anexoRotulo = perfilCfg && perfilCfg.anexo ? 'Anexo ' + perfilCfg.anexo : 'anexo aplicável';
  const normasResumo = "critérios térmicos configurados para este ensaio";
  let texto = 'Com base no ' + EstufaBanhoRel_ebLabelEstudo_(tipo) + ', os dados coletados para o equipamento "' + nomeEquip + '" foram processados segundo os ' + normasResumo + ' (ver referências normativas completas na Capa), considerando a faixa operacional de referência de ' + EstufaBanhoRel_ebFmtC_(faixa.tMin) + ' a ' + EstufaBanhoRel_ebFmtC_(faixa.tMax) + ', com tolerância de ' + EstufaBanhoRel_ebFmtC_(faixa.tolerancia) + '.';
  texto += '\nSensores utilizados: '+EstufaBanhoRel_ebResumoSensores_(analise.sensoresAtivos)+'.';
  texto += '\n\n';
  if (EstufaBanhoRel_ebEhDistribuicao_(tipo)) {
    texto += 'O monitoramento contínuo teve duração de ' + EstufaBanhoRel_ebFmtHoras_(analise.tempoTotalMinutos) + ', entre ' + (analise.tempoInicio || '-') + ' e ' + (analise.tempoFim || '-') + '. ';
    if (analise.piorSensor) {
      texto += 'O sensor ' + analise.piorSensor.sensor + ' registrou a leitura mais crítica do ensaio, ' + EstufaBanhoRel_ebFmtC_(analise.piorSensor.valor) + ' em ' + analise.piorSensor.tempoStr + ', ' + EstufaBanhoRel_ebFmtC_(analise.piorSensor.desvio) + ' além do limite da faixa operacional.';
    } else {
      texto += 'Nenhum sensor ativo ultrapassou a faixa operacional em nenhum momento do período monitorado.';
    }
    if (analise.primeiraRupturaGlobal) {
      texto += ' A primeira excursão cronológica registrada no ensaio ocorreu no sensor ' + analise.primeiraRupturaGlobal.sensor + ', às ' + analise.primeiraRupturaGlobal.tempoStr + ' (' + EstufaBanhoRel_ebFmtC_(analise.primeiraRupturaGlobal.valor) + ').';
    }
    const piorAmplitude = EstufaBanhoRel_ebEncontrarPiorAmplitude_(analise.statsPorSensor);
    if (piorAmplitude) {
      texto += ' Em termos de estabilidade térmica, o sensor com maior amplitude (máx-mín) ao longo do ensaio foi ' + piorAmplitude.sensor + ', com variação de ' + EstufaBanhoRel_ebFmtC_(piorAmplitude.maxMin) + '.';
    }
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    const nomeEvento = tipo === 'ABERTURA_PORTA' ? 'a abertura de porta' : 'a queda de energia';
    texto += 'O evento avaliado — ' + nomeEvento + ' — teve início às ' + (analise.tempoInicioEvento || '-') + (analise.tempoFimEvento ? ' e término às ' + analise.tempoFimEvento + '.' : ', sem horário de término informado.');
    texto += ' ';
    if (analise.rompeu) {
      texto += 'A faixa operacional foi rompida pelo sensor ' + analise.primeiraRuptura.sensor + ' após ' + EstufaBanhoRel_ebFmtMin_(analise.tempoAteRupturaMinutos) + ' do início do evento (leitura de ' + EstufaBanhoRel_ebFmtC_(analise.primeiraRuptura.valor) + '). ';
      texto += analise.recuperouTotalmente ? 'A recuperação total à faixa operacional ocorreu ' + EstufaBanhoRel_ebFmtMin_(analise.tempoAteRecuperacaoMinutos) + ' após o evento.' : 'A recuperação total à faixa operacional não foi observada dentro do período de dados disponível.';
    } else {
      texto += 'Nenhum sensor ativo ultrapassou a faixa operacional durante o período de dados disponível a partir do início do evento.';
    }
    if (analise.tempoAlvoMinutos !== null && analise.tempoAlvoMinutos !== undefined && isFinite(analise.tempoAlvoMinutos)) {
      texto += ' O tempo-alvo definido para o ensaio foi de ' + EstufaBanhoRel_ebFmtMin_(analise.tempoAlvoMinutos) + (statusAprovacao === 'REPROVADO' ? ', não sustentado pelo equipamento.' : ', sustentado com sucesso pelo equipamento.');
    }
  } else if (tipo === 'AUTONOMIA') {
    texto += analise.rompeu ? 'A autonomia medida foi de ' + EstufaBanhoRel_ebFmtHoras_(analise.autonomiaMinutos) + ', até o sensor ' + analise.primeiraRuptura.sensor + ' ultrapassar a faixa operacional.' : 'Não foi observada ruptura da faixa operacional durante todo o período gravado (' + EstufaBanhoRel_ebFmtHoras_(analise.tempoTotalGravadoMinutos) + '); a autonomia real do equipamento pode ser superior ao período monitorado.';
  } else if (tipo === 'DISTRIBUICAO_VAZIO_E') {
    texto += 'Foram avaliadas ' + (analise.quantidadeRepeticoes || 0) + ' repetições independentes de distribuição em vazio, ' + 'exigência do Anexo E para caracterização da uniformidade térmica da câmara. ' + (analise.motivosReprovacao && analise.motivosReprovacao.length ? 'Ao menos uma repetição apresentou excursão fora da faixa operacional (detalhes na tabela consolidada), reprovando o conjunto.' : 'Todas as repetições permaneceram dentro da faixa operacional configurada.');
  } else if (tipo === 'PENETRACAO_CARGA_E') {
    const reps = analise.repeticoes || [];
    const valorLabel = reps[0] ? reps[0].valorLabel : 'FH/FD';
    const piorRep = reps.reduce(function (pior, r) {
      return !pior || r.minLetalidade < pior.minLetalidade ? r : pior;
    }, null);
    texto += 'Foram avaliadas ' + reps.length + ' repetições de penetração com carga, com cálculo de letalidade (' + valorLabel + ') ' + 'acumulada por sensor ao longo de toda a janela de exposição marcada em cada repetição. ';
    if (piorRep) {
      texto += 'A repetição mais crítica foi a de nº ' + piorRep.numeroRepeticao + ', com ' + valorLabel + ' mínimo de ' + piorRep.minLetalidade + ' min (sensor ' + (piorRep.piorSensor ? piorRep.piorSensor.sensor : 'N/A') + '), frente ao mínimo exigido de ' + piorRep.valorMinimoExigido + ' min. ';
    }
    const algumIndicadorReprovado = reps.some(function (r) {
      return r.indicadorResultado && r.indicadorResultado.aprovado === false;
    });
    texto += algumIndicadorReprovado ? 'O resultado de laboratório (indicador biológico/endotoxina) de ao menos uma repetição foi reprovado, o que reprova o conjunto independentemente do cálculo térmico — o desafio biológico/químico é o critério definitivo de eficácia do processo.' : 'O resultado de laboratório (indicador biológico/endotoxina), quando informado, foi compatível com a aprovação térmica calculada.';
  }
  texto += '\n\nA leitura técnica considerou simultaneamente a permanência dentro da faixa operacional, a tolerância configurada, o comportamento individual de cada sensor ativo e, quando aplicável, a capacidade de recuperação do equipamento após o evento avaliado.';
  return texto;
}

// ------------------------------------------------------------
// ABA FINAL — PARECER TÉCNICO (veredito formal consolidado de
// TODOS os estudos do laudo, mesmo papel do "PARECER DE
// ENGENHARIA" da Autoclave)
// ------------------------------------------------------------
function EstufaBanhoRel_ebMontarParecerTecnico_(sh, analises, payload, statusConsolidado, corStatusConsolidado, relatorioSimulado) {
  EstufaBanhoRel_ebLayoutA4Paisagem_(sh);
  sh.setColumnWidth(1, EstufaBanhoRel_EBCFG.LARGURA_PAGINA_PX || 1500);
  let row = 1;
  sh.getRange(row, 1).setValue('PARECER TÉCNICO FINAL DE METROLOGIA').setFontSize(14).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  row += 2;
  if (relatorioSimulado) {
    row = EstufaBanhoRel_ebInserirFaixaRelatorioInterno_(sh, row, 1);
  }
  const texto = EstufaBanhoRel_ebMontarTextoParecerConsolidado_(analises, payload, statusConsolidado);
  row = EstufaBanhoRel_ebEscreverBlocoTextoRico_(sh, row, texto, [], corStatusConsolidado, 12, 1, 145);
  row += 1;
  row = EstufaBanhoRel_ebEscreverAssinatura_(sh, row, payload);
}
function EstufaBanhoRel_ebMontarTextoParecerConsolidado_(analises, payload, statusConsolidado) {
  let texto = 'Parecer final do laboratório de metrologia: ' + EstufaBanhoRel_ebLabelStatus_(statusConsolidado) + '.\n\n';
  texto += 'Este laudo consolida ' + analises.length + ' estudo(s) realizado(s) sobre o mesmo equipamento, a partir dos dados importados para o ensaio:\n' + EstufaBanhoRel_ebTextoLista_(analises.map(function (a) {
    return EstufaBanhoRel_ebLabelEstudo_(a.tipoEstudo) + ' — ' + EstufaBanhoRel_ebLabelStatus_(a.statusAprovacao);
  }), '') + '\n\n';
  const reprovados = analises.filter(function (a) {
    return a.statusAprovacao === 'REPROVADO';
  });
  const comAlerta = analises.filter(function (a) {
    return a.statusAprovacao === 'APROVADO_COM_ALERTA';
  });
  if (reprovados.length) {
    texto += 'Motivos técnicos da reprovação, por estudo:\n\n';
    reprovados.forEach(function (a) {
      texto += EstufaBanhoRel_ebLabelEstudo_(a.tipoEstudo) + ':\n' + EstufaBanhoRel_ebTextoLista_(a.motivosReprovacao, 'Nenhum motivo registrado.') + '\n\n';
    });
    texto += 'O equipamento deve passar por avaliação técnica, revisão do processo de aquecimento/isolamento térmico e nova qualificação dos estudos reprovados antes da liberação operacional.';
  } else if (comAlerta.length) {
    texto += 'Alertas técnicos, por estudo:\n\n';
    comAlerta.forEach(function (a) {
      texto += EstufaBanhoRel_ebLabelEstudo_(a.tipoEstudo) + ':\n' + EstufaBanhoRel_ebTextoLista_(a.alertasAnalise, 'Nenhum alerta registrado.') + '\n\n';
    });
    texto += 'Recomenda-se investigar a causa da redução de margem operacional identificada e manter monitoramento reforçado do equipamento nas próximas verificações.';
  } else if(statusConsolidado==='INFORMATIVO'||statusConsolidado==='CARACTERIZACAO') {
    texto += 'Resultado: '+EstufaBanhoRel_ebParecerResultado_(statusConsolidado)+'.';
  } else {
    texto += 'Todos os estudos realizados atenderam aos critérios operacionais configurados, limitados aos sensores e períodos avaliados. O resultado térmico não constitui liberação automática de uso nem comprova, isoladamente, todos os requisitos normativos. A liberação depende da avaliação do responsável técnico.';
  }
  texto += '\n\nInterpretação operacional: neste tipo de equipamento, a aprovação não depende apenas de a leitura pontual estar dentro da faixa — o equipamento precisa demonstrar estabilidade térmica sustentada, homogeneidade entre sensores e, quando submetido a um evento de estresse (abertura de porta ou queda de energia, quando aplicável ao perfil), capacidade de recuperação em tempo compatível com a integridade do processo térmico avaliado. Qualquer perda de margem nesses pontos deve ser investigada antes da liberação rotineira do equipamento.';
  return texto;
}

// ------------------------------------------------------------
// HELPERS DE FORMATAÇÃO / LAYOUT
// ------------------------------------------------------------

function EstufaBanhoRel_ebLayoutA4Paisagem_(sh) {
  sh.setHiddenGridlines(true);
  try {
    const ps = sh.getPrintSettings();
    if (ps) {
      ps.setPaperSize(SpreadsheetApp.PrintPaperSize.A4);
      ps.setOrientation(SpreadsheetApp.PrintOrientation.LANDSCAPE);
    }
  } catch (e) {}
}
function EstufaBanhoRel_ebGarantirGrade_(sh,linhas,colunas){
  if(typeof sh.getMaxRows==='function'&&linhas>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),linhas-sh.getMaxRows());
  if(typeof sh.getMaxColumns==='function'&&colunas>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),colunas-sh.getMaxColumns());
}
function EstufaBanhoRel_ebBorda_(rg) {
  rg.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}
function EstufaBanhoRel_ebEstiloCabecalhoEscuro_(rg) {
  rg.setBackground(EstufaBanhoRel_EBCFG.CORES.CHUMBO).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
}
function EstufaBanhoRel_ebEstiloCabecalhoClaro_(rg) {
  rg.setBackground('#e5e7eb').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
}
function EstufaBanhoRel_ebInserirFaixaRelatorioInterno_(sh, row, span) {
  sh.getRange(row, 1, 1, span).merge().setValue('RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA').setFontSize(11).setFontWeight('bold').setBackground('#111827').setFontColor('#f8fafc').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 20);
  sh.setRowHeight(row + 1, 8);
  return row + 2;
}
function EstufaBanhoRel_ebInserirFaixaModoPersonalizado_(sh, row, span, nSensoresUsado, minimoExigido) {
  sh.getRange(row, 1, 1, span).merge().setValue('⚠ ENSAIO PERSONALIZADO — ' + nSensoresUsado + ' SENSOR(ES), ABAIXO DO MÍNIMO DE ' + minimoExigido + ' EXIGIDO PELA NBR 16328:2024 PARA ESTE ANEXO — AUTORIZADO POR SENHA ADMINISTRATIVA').setFontSize(11).setFontWeight('bold').setBackground(EstufaBanhoRel_EBCFG.CORES.REPROVADO).setFontColor('#ffffff').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 24);
  sh.setRowHeight(row + 1, 8);
  return row + 2;
}
function EstufaBanhoRel_ebTituloSecao_(sh, row, titulo, corStatus) {
  sh.getRange(row, 1, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS).merge().setValue(titulo).setFontSize(13).setFontWeight('bold').setBackground(corStatus).setFontColor(EstufaBanhoRel_EBCFG.CORES.TEXTO_BRANCO).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(row, 28);
  return row + 2;
}
function EstufaBanhoRel_ebListarTextos_(sh, row, titulo, lista, cor) {
  lista = Array.isArray(lista) ? lista : [];
  if (!lista.length) return row;
  sh.getRange(row, 1).setValue(titulo + ':').setFontWeight('bold').setFontColor(cor);
  row++;
  lista.forEach(function (texto) {
    sh.getRange(row, 1, 1, EstufaBanhoRel_EB_RESULTADOS_NUM_COLUNAS).merge().setValue('• ' + texto).setWrap(true);
    row++;
  });
  return row + 1;
}

// Rótulo de um par "rótulo: valor" nas abas de Evento/Autonomia — mescla
// as 2 primeiras colunas para o rótulo (textos longos como "Tempo-alvo
// definido para o ensaio" não cabem numa única coluna estreita sem
// cortar) e devolve a coluna onde o valor correspondente deve começar.
function EstufaBanhoRel_ebEscreverRotulo_(sh, row, texto) {
  sh.getRange(row, 1, 1, 2).merge().setValue(texto).setFontWeight('bold').setVerticalAlignment('middle');
  return 3;
}
function EstufaBanhoRel_ebRichTexto_(sh, r, c, textoCompleto, termosNegrito, corStatusPalavra, fontSize) {
  textoCompleto = String(textoCompleto || '');
  termosNegrito = termosNegrito || [];
  fontSize = Number(fontSize || 11);
  let rtv = SpreadsheetApp.newRichTextValue().setText(textoCompleto);
  const base = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).build();
  const boldBase = SpreadsheetApp.newTextStyle().setForegroundColor('#374151').setFontSize(fontSize).setBold(true).build();
  rtv.setTextStyle(0, textoCompleto.length, base);
  termosNegrito.forEach(function (termo) {
    if (!termo) return;
    let idx = textoCompleto.indexOf(termo);
    while (idx !== -1) {
      rtv.setTextStyle(idx, idx + termo.length, boldBase);
      idx = textoCompleto.indexOf(termo, idx + termo.length);
    }
  });
  if (corStatusPalavra) {
    const boldStatus = SpreadsheetApp.newTextStyle().setForegroundColor(corStatusPalavra).setFontSize(fontSize).setBold(true).build();
    ['APROVADO_COM_ALERTA', 'CARACTERIZACAO', 'REPROVADO', 'INFORMATIVO', 'APROVADO'].forEach(function (palavra) {
      let idx = textoCompleto.indexOf(palavra);
      while (idx !== -1) {
        rtv.setTextStyle(idx, idx + palavra.length, boldStatus);
        idx = textoCompleto.indexOf(palavra, idx + palavra.length);
      }
    });
  }
  sh.getRange(r, c).setRichTextValue(rtv.build()).setWrap(true).setVerticalAlignment('top').setHorizontalAlignment('left');
}
function EstufaBanhoRel_ebEstimarLinhasTexto_(texto, charsPorLinha) {
  charsPorLinha = charsPorLinha || 85;
  const paragrafos = String(texto || '').split('\n');
  let total = 0;
  paragrafos.forEach(function (p) {
    total += Math.max(1, Math.ceil(p.length / charsPorLinha));
  });
  return total;
}
function EstufaBanhoRel_ebEscreverBlocoTextoRico_(sh, rowInicio, texto, termosNegrito, corStatus, fontSize, numColunas, charsPorLinha) {
  numColunas = numColunas || 1;
  // margem de segurança generosa: melhor sobrar espaço em branco no fim
  // do bloco do que arriscar cortar/sobrepor texto (linha "engolida").
  const linhasEstimadas = EstufaBanhoRel_ebEstimarLinhasTexto_(texto, charsPorLinha || 85) + 4;
  const rowFim = rowInicio + linhasEstimadas - 1;
  sh.getRange(rowInicio, 1, linhasEstimadas, numColunas).merge();
  EstufaBanhoRel_ebRichTexto_(sh, rowInicio, 1, texto, termosNegrito, corStatus, fontSize);
  for (let r = rowInicio; r <= rowFim; r++) sh.setRowHeight(r, 24);
  return rowFim + 1;
}
function EstufaBanhoRel_ebEscreverAssinatura_(sh, row, payload) {
  sh.getRange(row, 1).setValue('______________________________________________________________').setHorizontalAlignment('center');
  row++;
  sh.getRange(row, 1).setValue((payload.responsavelTecnico || 'RESPONSÁVEL TÉCNICO') + ' — RESPONSÁVEL TÉCNICO / METROLOGIA').setHorizontalAlignment('center').setFontSize(10).setFontWeight('bold');
  row++;
  return row;
}
function EstufaBanhoRel_ebTextoLista_(lista, vazio) {
  if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
  return lista.map(function (m, i) {
    return i + 1 + '. ' + m;
  }).join('\n');
}
function EstufaBanhoRel_ebFmtC_(valor) {
  const n = Number(valor);
  if (!isFinite(n)) return '-';
  return n.toFixed(2) + ' °C';
}
function EstufaBanhoRel_ebEncontrarPiorAmplitude_(statsPorSensor) {
  if (!Array.isArray(statsPorSensor) || !statsPorSensor.length) return null;
  let pior = null;
  statsPorSensor.forEach(function (s) {
    const amp = s && s.indicacaoMaxMin && typeof s.indicacaoMaxMin.maxMin === 'number' ? s.indicacaoMaxMin.maxMin : null;
    if (amp === null) return;
    if (!pior || amp > pior.maxMin) pior = {
      sensor: s.sensor,
      maxMin: amp
    };
  });
  return pior;
}
function EstufaBanhoRel_ebCorPorStatus_(status) {
  status = String(status || '').toUpperCase();
  if (status === 'REPROVADO') return EstufaBanhoRel_EBCFG.CORES.REPROVADO;
  if (status === 'APROVADO_COM_ALERTA' || status === 'INFORMATIVO' || status === 'CARACTERIZACAO') return EstufaBanhoRel_EBCFG.CORES.ALERTA;
  return status==='APROVADO'?EstufaBanhoRel_EBCFG.CORES.APROVADO:EstufaBanhoRel_EBCFG.CORES.ALERTA;
}
function EstufaBanhoRel_ebLabelStatus_(status) {
  status = String(status || '').toUpperCase();
  if (status === 'REPROVADO') return 'REPROVADO';
  if (status === 'APROVADO_COM_ALERTA') return 'APROVADO COM ALERTA';
  if (status === 'INFORMATIVO') return 'INFORMATIVO';
  if (status === 'CARACTERIZACAO') return 'CARACTERIZAÇÃO (AUTONOMIA MEDIDA)';
  return status==='APROVADO'?'APROVADO':'INFORMATIVO';
}
function EstufaBanhoRel_ebLabelEstudo_(tipo) {
  if(EstufaBanhoRel_ebEhSecadora_(tipo)){var p=tipo.split('_');return 'Secadora — '+(p[1]==='VAZIO'?'vazio':'com carga')+' — estudo '+p[2];}
  tipo = String(tipo || '').toUpperCase();
  const mapa = {
    DISTRIBUICAO_VAZIO: 'Distribuição de Temperatura em Vazio',
    DISTRIBUICAO_CARGA: 'Distribuição de Temperatura com Carga',
    ABERTURA_PORTA: 'Estudo de Abertura de Porta',
    QUEDA_ENERGIA: 'Estudo de Queda de Energia',
    AUTONOMIA: 'Estudo de Autonomia (Caixa Térmica)',
    DISTRIBUICAO_VAZIO_E: 'Distribuição em Vazio (Anexo E, 3 repetições)',
    PENETRACAO_CARGA_E: 'Penetração com Carga e Letalidade (Anexo E, 3 repetições)'
  };
  return mapa[tipo] || tipo;
}

/**
 * Normas técnicas e regulatórias aplicáveis ao laudo. Todo ensaio deste
 * módulo se apoia na ABNT NBR 16328:2024 (procedimento técnico de
 * medição, anexo varia por perfil de equipamento — F para estufa de
 * incubação, I para banho-maria, E para esterilização/despirogenização)
 * dentro do arcabouço regulatório das RDC 658/2022 (medicamentos) e
 * RDC 665/2022 (produtos médicos/IVD) da ANVISA, que exigem validação
 * de processo (IQ/OQ/PQ) para equipamentos térmicos usados por
 * fabricantes — não é o mesmo arcabouço de cadeia de frio hospitalar
 * (RDC 430/2020), que não se aplica a este módulo.
 */
function EstufaBanhoRel_ebListarNormasAplicaveis_(chavePerfil) {
  if(chavePerfil==='SECADORA_TRAQUEIAS')return ['Protocolo de ensaio: faixa, tolerância e períodos definidos para a secadora de traqueias.'];
  const perfilCfg = EstufaBanhoRel_EBCFG.PERFIS && EstufaBanhoRel_EBCFG.PERFIS[String(chavePerfil || '').trim()];
  const anexo = perfilCfg && perfilCfg.anexo || '';
  const descricaoAnexo = {
    F: 'qualificação térmica de estufa de incubação: distribuição de temperatura, abertura de porta e queda de energia',
    I: 'qualificação térmica de banho-maria: distribuição de temperatura em vazio e com carga',
    E: 'qualificação térmica de estufa de esterilização/despirogenização: distribuição em vazio, penetração com carga e cálculo de letalidade'
  }[anexo] || 'qualificação térmica do equipamento avaliado';
  const anexoRotulo = anexo ? 'Anexo ' + anexo + ' — ' : '';
  const normas = ['ABNT NBR 16328:2024 — Requisitos de desempenho e método de ensaio para equipamentos térmicos (' + anexoRotulo + descricaoAnexo + ')', 'RDC nº 658/2022 (ANVISA) — Boas Práticas de Fabricação de Medicamentos, requisitos de validação de processo (IQ/OQ/PQ) para equipamentos críticos', 'RDC nº 665/2022 (ANVISA) — Boas Práticas de Fabricação de Produtos Médicos e Produtos para Diagnóstico In Vitro (IVD), requisitos de validação de processo (IQ/OQ/PQ) para equipamentos críticos'];
  return normas;
}
function EstufaBanhoRel_ebTextoNormasAplicaveis_(chavePerfil) {
  return EstufaBanhoRel_ebListarNormasAplicaveis_(chavePerfil).map(function (n, i) {
    return i + 1 + '. ' + n;
  }).join('\n');
}
function EstufaBanhoRel_ebFmtMin_(valor) {
  const n = Number(valor);
  if (!isFinite(n)) return '-';
  return n.toFixed(2) + ' min';
}
function EstufaBanhoRel_ebFmtHoras_(minutos) {
  const n = Number(minutos);
  if (!isFinite(n)) return '-';
  return n.toFixed(1) + ' min (' + (n / 60).toFixed(2) + ' h)';
}
