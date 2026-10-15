/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: Planilha.gs
 * VERSÃO REORGANIZADA — ESTRUTURA LIMPA + PDF TÉCNICO
 * OBJETIVO:
 * - manter compatibilidade com o motor atual
 * - organizar melhor o layout do relatório
 * - reduzir redundâncias e facilitar manutenção
 * - aceitar status APROVADO / APROVADO_COM_ALERTA / APROVADO_COM_RESSALVA / REPROVADO
 * - deixar a planilha pronta para exportação PDF mais estável
 ****************************************************/

function gerarPlanilhaAuditoria(dados, analise, payload) {
  if (!Array.isArray(dados) || !dados.length) {
    return { ok:false, spreadsheetId:null, spreadsheetUrl:null, erro:'Sem dados para gerar relatório.' };
  }

  payload = payload || {};
  analise = analise || {};

  const cfg = obterCfgPlanilhaCentralAr_();
  const statusInfo = resolverStatusRelatorioAr_(analise.statusAprovacao);
  const metricas = obterMetricasPlanilhaAr_(analise);
  const comportamento = analise.comportamentoOperacional || {};
  const resumoDiario = normalizarResumoDiarioPlanilhaAr_(analise.resumoDiario);
  const resumoFaixas = normalizarResumoFaixasPlanilhaAr_(analise.resumoFaixaHorario);
  const nomeArquivo = montarNomeRelatorioPlanilhaAr_(payload, cfg.tz);

  const ss = SpreadsheetApp.create(nomeArquivo);

  const abas = criarAbasRelatorioPlanilhaAr_(ss);
  
  removerAbaPadraoPlanilhaAr_(ss);

  moverPlanilhaParaPastaLaudos_(ss.getId());

  Object.keys(abas).forEach(function(chave) {
    prepararAbaA4PaisagemCentralAr_(abas[chave]);
  });

  preencherAbaIdentificacaoCentralAr_(abas.identificacao, payload, analise, statusInfo);
  preencherAbaDashboardCentralAr_(abas.dashboard, payload, analise, statusInfo, metricas, comportamento, resumoDiario);
  preencherAbaConsolidadoCentralAr_(abas.consolidado, payload, analise, statusInfo, metricas, comportamento, resumoDiario);
  preencherAbaDadosBrutosCentralAr_(abas.brutos, dados, analise);
  preencherAbaAnaliseInteligenteCentralAr_(abas.analise, payload, analise, statusInfo, metricas, comportamento, resumoDiario, resumoFaixas);
  preencherAbaConclusaoCentralAr_(abas.conclusao, payload, analise, statusInfo, comportamento);

  SpreadsheetApp.flush();

  return {
    ok: true, 
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

// ============================================================
// CONFIG / ESTRUTURA
// ============================================================

function obterCfgPlanilhaCentralAr_() {
  const cores = obterCoresRelatorioAr_();
  const tz = (typeof UCFG !== 'undefined' && UCFG.APP && UCFG.APP.TZ)
    ? UCFG.APP.TZ
    : Session.getScriptTimeZone();

  return {
    tz: tz,
    cores: cores,
    colunas: 13,
    rodapeLinha: 32,
    ultimaLinhaPagina: 38,
    larguraPadrao: 95, 
    larguraColA: 135,
    larguraColG: 10, 
    larguraColH: 135,
    alturaPadrao: 24,
    alturasEspeciais: {
      1: 26,
      2: 26,
      3: 22,
      32: 22
    }
  };
}

function criarAbasRelatorioPlanilhaAr_(ss) {
  return {
    identificacao: ss.insertSheet('1. IDENTIFICAÇÃO', 0),
    dashboard: ss.insertSheet('2. DASHBOARD', 1),
    consolidado: ss.insertSheet('3. CONSOLIDADO', 2),
    brutos: ss.insertSheet('4. DADOS BRUTOS', 3),
    analise: ss.insertSheet('5. ANÁLISE INTELIGENTE', 4),
    conclusao: ss.insertSheet('6. CONCLUSÃO FINAL', 5)
  };
}

function montarNomeRelatorioPlanilhaAr_(payload, tz) {
  const tag = sanitizarTrechoNomePlanilhaAr_(payload.tag || 'SEM_TAG');
  let dataRef;
  try {
    dataRef = Utilities.formatDate(new Date(), tz || Session.getScriptTimeZone(), 'ddMMyyyy_HHmm');
  } catch (e) {
    dataRef = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'ddMMyyyy_HHmm');
  }
  return 'RELATORIO_AR_' + tag + '_' + dataRef;
}

function sanitizarTrechoNomePlanilhaAr_(valor) {
  return String(valor == null ? '' : valor)
    .trim()
    .replace(/[\\/:*?"<>|#\[\]]+/g, '_')
    .replace(/\s+/g, '_') || 'SEM_TAG';
}

function removerAbaPadraoPlanilhaAr_(ss) {
  try {
    const sheets = ss.getSheets();
    const nomesPadrao = ['Sheet1', 'Página1', 'Planilha1', 'Sheet 1', 'Página 1'];
    
    for (let i = 0; i < sheets.length; i++) {
      if (nomesPadrao.indexOf(sheets[i].getName()) >= 0) {
        if (ss.getSheets().length > 1) { 
          ss.deleteSheet(sheets[i]);
        }
      }
    }
  } catch (err) {}
}

function obterMetricasPlanilhaAr_(analise) {
  const metricasAr = analise.metricasAr || {};
  return {
    pressao: metricasAr.pressao || {},
    orvalho: metricasAr.orvalho || {},
    percentualPressaoFora: numeroSeguroPlanilhaAr_(metricasAr.percentualPressaoFora),
    percentualOrvalhoFora: numeroSeguroPlanilhaAr_(metricasAr.percentualOrvalhoFora),
    percentualForaFaixaGeral: numeroSeguroPlanilhaAr_(metricasAr.percentualForaFaixa || metricasAr.percentualFora),
    percentualConforme: numeroSeguroPlanilhaAr_(metricasAr.percentualConforme)
  };
}

function normalizarResumoDiarioPlanilhaAr_(resumoDiario) {
  resumoDiario = resumoDiario || {};
  return {
    totalDias: numeroSeguroPlanilhaAr_(resumoDiario.totalDias || (Array.isArray(resumoDiario.dias) ? resumoDiario.dias.length : 0)),
    dias: Array.isArray(resumoDiario.dias) ? resumoDiario.dias : []
  };
}

function normalizarResumoFaixasPlanilhaAr_(faixas) {
  faixas = faixas || {};
  return {
    MADRUGADA: faixas.MADRUGADA || {},
    MANHA: faixas.MANHA || {},
    TARDE: faixas.TARDE || {},
    NOITE: faixas.NOITE || {}
  };
}

function resolverStatusRelatorioAr_(statusBruto) {
  const cores = obterCoresRelatorioAr_();
  const bruto = String(statusBruto || 'APROVADO').trim().toUpperCase();

  if (bruto === 'REPROVADO') {
    return {
      chave: 'REPROVADO',
      rotulo: 'REPROVADO',
      cor: cores.REPROVADO
    };
  }

  if (bruto === 'APROVADO_COM_ALERTA' || bruto === 'APROVADO COM ALERTA') {
    return {
      chave: 'APROVADO_COM_ALERTA',
      rotulo: 'APROVADO COM ALERTA',
      cor: cores.ALERTA
    };
  }

  if (bruto === 'APROVADO_COM_RESSALVA' || bruto === 'APROVADO COM RESSALVA' || bruto === 'APROVADO_COM_RESSALVAS' || bruto === 'APROVADO COM RESSALVAS') {
    return {
      chave: 'APROVADO_COM_RESSALVA',
      rotulo: 'APROVADO COM RESSALVA',
      cor: cores.ALERTA
    };
  }

  return {
    chave: 'APROVADO',
    rotulo: 'APROVADO',
    cor: cores.APROVADO
  };
}

// ============================================================
// PREENCHIMENTO DAS ABAS
// ============================================================

function preencherAbaIdentificacaoCentralAr_(sh, payload, analise, statusInfo) {
  cabecalhoPaginaCentralAr_(
    sh,
    'IDENTIFICAÇÃO DO MONITORAMENTO E RASTREABILIDADE',
    'RELATÓRIO TÉCNICO DE MONITORAMENTO DE AR MEDICINAL'
  );

  blocoTituloCentralAr_(sh, 'A4:F4', 'DADOS DO CLIENTE');
  escreverTabelaRotuloValorCentralAr_(sh, 5, 1, [
    ['CLIENTE', valorSeguroPlanilhaAr_(payload.cliente)],
    ['CNPJ', valorSeguroPlanilhaAr_(payload.cnpj)],
    ['ENDEREÇO / UNIDADE', valorSeguroPlanilhaAr_(payload.endereco)]
  ], 6);

  blocoTituloCentralAr_(sh, 'A10:F10', 'DADOS DO PONTO MONITORADO');
  escreverTabelaRotuloValorCentralAr_(sh, 11, 1, [
    ['TAG / CÓDIGO', valorSeguroPlanilhaAr_(payload.tag)],
    ['LOCAL / SETOR', valorSeguroPlanilhaAr_(payload.local)],
    ['MARCA / FABRICANTE', valorSeguroPlanilhaAr_(payload.marca)],
    ['MODELO / SISTEMA', valorSeguroPlanilhaAr_(payload.modelo)],
    ['NÚMERO DE SÉRIE', valorSeguroPlanilhaAr_(payload.numSerie)],
    ['PONTO / LINHA MONITORADA', valorSeguroPlanilhaAr_(payload.pontoMonitorado)],
    ['TIPO DE ENSAIO', valorSeguroPlanilhaAr_(payload.ensaio)]
  ], 6);

  blocoTituloCentralAr_(sh, 'H4:M4', 'DADOS OPERACIONAIS');
  escreverTabelaRotuloValorCentralAr_(sh, 5, 8, [
    ['RESPONSÁVEL TÉCNICO', valorSeguroPlanilhaAr_(payload.respTecnico)],
    ['OPERADOR', valorSeguroPlanilhaAr_(payload.operador)],
    ['CERTIFICADO / REFERÊNCIA', valorSeguroPlanilhaAr_(payload.certificado)],
    ['O.S. / CHAMADO', valorSeguroPlanilhaAr_(payload.os)],
    ['INÍCIO DO MONITORAMENTO', valorSeguroPlanilhaAr_(analise.tempoInicioCiclo)],
    ['FIM DO MONITORAMENTO', valorSeguroPlanilhaAr_(analise.tempoFimCiclo)],
    ['TOTAL DE REGISTROS', valorSeguroPlanilhaAr_(analise.totalRegistros)]
  ], 13);

  blocoTituloCentralAr_(sh, 'H13:M13', 'CRITÉRIOS TÉCNICOS INFORMADOS');
  escreverTabelaRotuloValorCentralAr_(sh, 14, 8, [
    ['PRESSÃO MÍNIMA', formatarNumeroPlanilhaAr_(payload.pressaoMin, 1, ' bar')],
    ['PRESSÃO MÁXIMA', formatarNumeroPlanilhaAr_(payload.pressaoMax, 1, ' bar')],
    ['ORVALHO MÁXIMO', formatarNumeroPlanilhaAr_(payload.orvalhoMax, 1, ' °C')],
    ['STATUS FINAL', statusInfo.rotulo]
  ], 13);

  richTextCentralAr_(
    sh,
    'A20:M24',
    'FINALIDADE DO RELATÓRIO:\nEste relatório técnico apresenta os resultados do monitoramento de pressão da rede e ponto de orvalho do sistema de ar medicinal, com base nos dados coletados pelo registrador e analisados automaticamente pelo motor METROLABS. O objetivo desta emissão é fornecer rastreabilidade documental, evidência técnica do comportamento do sistema ao longo do período avaliado e subsídios para análise de conformidade operacional.',
    ['FINALIDADE DO RELATÓRIO:', 'pressão da rede', 'ponto de orvalho', 'rastreabilidade documental', 'conformidade operacional'],
    null,
    10
  );
}

function preencherAbaDashboardCentralAr_(sh, payload, analise, statusInfo, metricas, comportamento, resumoDiario) {
  cabecalhoPaginaCentralAr_(
    sh,
    'DASHBOARD EXECUTIVO DO ENSAIO',
    'VISÃO RESUMIDA DOS PRINCIPAIS INDICADORES'
  );

  caixaIndicadorCentralAr_(sh, 'A4:C7', 'STATUS FINAL', statusInfo.rotulo, statusInfo.cor, '#ffffff');
  caixaIndicadorCentralAr_(sh, 'D4:F7', 'PRESSÃO MÉDIA', formatarNumeroPlanilhaAr_(metricas.pressao.media, 1, ' bar'), obterCoresRelatorioAr_().AZUL, '#ffffff');
  caixaIndicadorCentralAr_(sh, 'G4:I7', 'ORVALHO MÉDIO', formatarNumeroPlanilhaAr_(metricas.orvalho.media, 1, ' °C'), obterCoresRelatorioAr_().VERDE, '#ffffff');
  caixaIndicadorCentralAr_(sh, 'J4:M7', 'DIAS ANALISADOS', valorSeguroPlanilhaAr_(resumoDiario.totalDias || 1), obterCoresRelatorioAr_().CHUMBO, '#ffffff');

  blocoTituloCentralAr_(sh, 'A9:F9', 'INDICADORES DE PRESSÃO');
  escreverTabelaIndicadoresMistosCentralAr_(sh, 10, 1, [
    ['PRESSÃO MÍNIMA', metricas.pressao.min, 'bar'],
    ['PRESSÃO MÉDIA', metricas.pressao.media, 'bar'],
    ['PRESSÃO MÁXIMA', metricas.pressao.max, 'bar'],
    ['AMPLITUDE DE PRESSÃO', metricas.pressao.amplitude, 'bar'],
    ['% FORA DA FAIXA', metricas.percentualPressaoFora, '%']
  ], 6);

  blocoTituloCentralAr_(sh, 'H9:M9', 'INDICADORES DE ORVALHO');
  escreverTabelaIndicadoresMistosCentralAr_(sh, 10, 8, [
    ['ORVALHO MÍNIMO', metricas.orvalho.min, '°C'],
    ['ORVALHO MÉDIO', metricas.orvalho.media, '°C'],
    ['ORVALHO MÁXIMO', metricas.orvalho.max, '°C'],
    ['AMPLITUDE DE ORVALHO', metricas.orvalho.amplitude, '°C'],
    ['% FORA DA FAIXA', metricas.percentualOrvalhoFora, '%']
  ], 13);

  richTextCentralAr_(
    sh,
    'A18:M24',
    montarTextoDashboardCentralArV3_(statusInfo, analise, payload),
    ['INTERPRETAÇÃO EXECUTIVA:', 'comportamento predominantemente', 'estável', 'fora da faixa', 'recuperação', 'ocioso'],
    statusInfo.cor,
    10
  );
}

function preencherAbaConsolidadoCentralAr_(sh, payload, analise, statusInfo, metricas, comportamento, resumoDiario) {
  cabecalhoPaginaCentralAr_(
    sh,
    'CONSOLIDADO ESTATÍSTICO E OPERACIONAL',
    'SÍNTESE NUMÉRICA E EVENTOS IDENTIFICADOS'
  );

  blocoTituloCentralAr_(sh, 'A4:M4', 'QUADRO CONSOLIDADO DE RESULTADOS');
  
  const consolidadoHeader = ['PARÂMETRO', 'MÍN.', 'MÉDIA', 'MÁX.', 'AMPLITUDE', '% FORA'];
  sh.getRange(5, 1, 1, 6).setValues([consolidadoHeader]);
  sh.getRange(5, 7, 1, 7).merge().setValue('CRITÉRIO'); 

  sh.getRange(6, 1, 1, 6).setValues([['PRESSÃO DA REDE', numeroSeguroPlanilhaAr_(metricas.pressao.min), numeroSeguroPlanilhaAr_(metricas.pressao.media), numeroSeguroPlanilhaAr_(metricas.pressao.max), numeroSeguroPlanilhaAr_(metricas.pressao.amplitude), numeroSeguroPlanilhaAr_(metricas.percentualPressaoFora)]]);
  sh.getRange(6, 7, 1, 7).merge().setValue('Faixa: ' + formatarNumeroPlanilhaAr_(payload.pressaoMin, 1, '') + ' a ' + formatarNumeroPlanilhaAr_(payload.pressaoMax, 1, '') + ' bar');

  sh.getRange(7, 1, 1, 6).setValues([['PONTO DE ORVALHO', numeroSeguroPlanilhaAr_(metricas.orvalho.min), numeroSeguroPlanilhaAr_(metricas.orvalho.media), numeroSeguroPlanilhaAr_(metricas.orvalho.max), numeroSeguroPlanilhaAr_(metricas.orvalho.amplitude), numeroSeguroPlanilhaAr_(metricas.percentualOrvalhoFora)]]);
  sh.getRange(7, 7, 1, 7).merge().setValue('Máximo: ' + formatarNumeroPlanilhaAr_(payload.orvalhoMax, 1, '') + ' °C');

  estiloTabelaCompletaCentralAr_(sh.getRange(5, 1, 3, 13), true);
  sh.getRange(6, 2, 2, 5).setNumberFormat('0.0');

  blocoTituloCentralAr_(sh, 'A10:F10', 'EVENTOS OPERACIONAIS IDENTIFICADOS');
  escreverTabelaIndicadoresMistosCentralAr_(sh, 11, 1, [
    ['FALHAS / EXCURSÕES', comportamento.totalFalhas, ''],
    ['RECUPERAÇÕES', comportamento.totalRecuperacoes, ''],
    ['% ESTÁVEL', comportamento.percentualEstavel, '%'],
    ['% INSTÁVEL', comportamento.percentualInstabilidade, '%'],
    ['% OCIOSO', comportamento.percentualOcioso, '%']
  ], 6);

  blocoTituloCentralAr_(sh, 'H10:M10', 'CLASSIFICAÇÃO PREDOMINANTE');
  richTextCentralAr_(
    sh,
    'H11:M16',
    montarTextoConsolidadoCentralArV3_(statusInfo, analise, payload),
    ['SÍNTESE CONSOLIDADA:', 'classificação predominante', 'falhas', 'recuperações', 'dias'],
    statusInfo.cor,
    10
  );
}

function preencherAbaDadosBrutosCentralAr_(sh, dados, analise) {
  cabecalhoPaginaCentralAr_(
    sh,
    'DADOS BRUTOS DO MONITORAMENTO',
    'REGISTROS UTILIZADOS PELA ROTINA DE ANÁLISE'
  );

  sh.setColumnWidth(1, 230); // Tempo
  sh.setColumnWidth(2, 150); // Orvalho
  sh.setColumnWidth(3, 150); // Pressão
  sh.setColumnWidth(4, 400); // Status
  sh.setColumnWidth(5, 150); // Pressão Fora?
  sh.setColumnWidth(6, 150); // Orvalho Fora?
  
  const header = [['Tempo', 'Orvalho (°C)', 'Pressão (bar)', 'Status do Registro', 'Pressão Fora?', 'Orvalho Fora?']];
  sh.getRange(4, 1, 1, 6).setValues(header);
  estiloTabelaCompletaCentralAr_(sh.getRange(4, 1, 1, 6), true);

  const linhasClassificadas = Array.isArray(analise.linhasClassificadas) ? analise.linhasClassificadas : [];
  const origem = linhasClassificadas.length ? linhasClassificadas : dados;

  const rows = origem.map(function(item) {
    if (!item) return ['', '', '', '', '', ''];
    return [
      valorSeguroPlanilhaAr_(item.tempoStr),
      valorOuVazioAr_(item.orvalho),
      valorOuVazioAr_(item.pressao),
      valorSeguroPlanilhaAr_(item.statusRegistro || ''),
      item.pressaoFora ? 'SIM' : 'NÃO',
      item.orvalhoFora ? 'SIM' : 'NÃO'
    ];
  });

  if (rows.length) {
    sh.getRange(5, 1, rows.length, 6).setValues(rows);
    estiloTabelaCompletaCentralAr_(sh.getRange(5, 1, rows.length, 6), false);
    sh.getRange(5, 2, rows.length, 2).setNumberFormat('0.0');
  }

  sh.setFrozenRows(4);
}

function preencherAbaAnaliseInteligenteCentralAr_(sh, payload, analise, statusInfo, metricas, comportamento, resumoDiario, resumoFaixas) {
  cabecalhoPaginaCentralAr_(
    sh,
    'ANÁLISE INTELIGENTE DE COMPORTAMENTO',
    'LEITURA OPERACIONAL DO SISTEMA POR EVENTO, DIA E FAIXA HORÁRIA'
  );

  richTextCentralAr_(
    sh,
    'A4:M10',
    montarTextoAnaliseTecnicaCentralArV3_(statusInfo, analise, payload),
    ['ANÁLISE TÉCNICA INTELIGENTE:', 'dias analisados', 'falhas', 'recuperações', 'período ocioso', 'pressão da rede', 'ponto de orvalho'],
    statusInfo.cor,
    10
  );

  blocoTituloCentralAr_(sh, 'A12:F12', 'COMPORTAMENTO POR DIA');
  sh.getRange('A13:D13').setValues([['DIA', '% ESTÁVEL', '% FORA', '% INSTÁVEL']]);
  sh.getRange('E13:F13').merge().setValue('CLASSIFICAÇÃO');

  const dias = Array.isArray(resumoDiario.dias) ? resumoDiario.dias : [];
  if (dias.length === 0) {
    sh.getRange('A14:D14').setValues([['-', 0, 0, 0]]);
    sh.getRange('E14:F14').merge().setValue('SEM DADOS');
    estiloTabelaCompletaCentralAr_(sh.getRange('A13:F14'), true);
  } else {
    dias.forEach(function(d, i) {
      const r = 14 + i;
      sh.getRange(r, 1, 1, 4).setValues([[
        valorSeguroPlanilhaAr_(d.data),
        numeroSeguroPlanilhaAr_(d.percentualEstavel),
        numeroSeguroPlanilhaAr_(d.percentualForaFaixa),
        numeroSeguroPlanilhaAr_(d.percentualInstavel)
      ]]);
      sh.getRange(r, 5, 1, 2).merge().setValue(valorSeguroPlanilhaAr_(d.comportamento));
    });
    estiloTabelaCompletaCentralAr_(sh.getRange(13, 1, dias.length + 1, 6), true);
    sh.getRange(14, 2, dias.length, 3).setNumberFormat('0.0');
  }

  blocoTituloCentralAr_(sh, 'H12:M12', 'FAIXAS HORÁRIAS');
  
  function escreverLinhaFaixa(r, c1, c2, c3) {
    sh.getRange(r, 8, 1, 2).merge().setValue(c1);
    sh.getRange(r, 10, 1, 2).merge().setValue(c2);
    sh.getRange(r, 12, 1, 2).merge().setValue(c3);
  }

  escreverLinhaFaixa(13, 'FAIXA', '% FORA', 'MIN FORA');
  escreverLinhaFaixa(14, 'MADRUGADA', numeroSeguroPlanilhaAr_(resumoFaixas.MADRUGADA.percentualForaFaixa), numeroSeguroPlanilhaAr_(resumoFaixas.MADRUGADA.minutosForaFaixa));
  escreverLinhaFaixa(15, 'MANHÃ', numeroSeguroPlanilhaAr_(resumoFaixas.MANHA.percentualForaFaixa), numeroSeguroPlanilhaAr_(resumoFaixas.MANHA.minutosForaFaixa));
  escreverLinhaFaixa(16, 'TARDE', numeroSeguroPlanilhaAr_(resumoFaixas.TARDE.percentualForaFaixa), numeroSeguroPlanilhaAr_(resumoFaixas.TARDE.minutosForaFaixa));
  escreverLinhaFaixa(17, 'NOITE', numeroSeguroPlanilhaAr_(resumoFaixas.NOITE.percentualForaFaixa), numeroSeguroPlanilhaAr_(resumoFaixas.NOITE.minutosForaFaixa));

  estiloTabelaCompletaCentralAr_(sh.getRange('H13:M17'), true);
  sh.getRange('J14:M17').setNumberFormat('0.0');

  richTextCentralAr_(
    sh,
    'A24:M31',
    montarTextoResumoDiarioCentralAr_(resumoDiario),
    ['LEITURA POR DIA:', 'DIA CRÍTICO', 'DIA ESTÁVEL', 'DIA COM INSTABILIDADE', 'DIA OPERACIONAL'],
    statusInfo.cor,
    9
  );
}

// CORREÇÃO MESTRA: Injeção do bloco de Justificativa na página de conclusão com ajuste dinâmico de layout
function preencherAbaConclusaoCentralAr_(sh, payload, analise, statusInfo, comportamento) {
  cabecalhoPaginaCentralAr_(
    sh,
    'CONCLUSÃO TÉCNICA FINAL',
    'PARECER CONCLUSIVO DO MONITORAMENTO'
  );

  richTextCentralAr_(
    sh,
    'A4:M11',
    montarTextoConclusaoFinalCentralArV3_(statusInfo, analise, payload),
    ['CONCLUSÃO TÉCNICA FINAL:', 'APROVADO', 'APROVADO COM ALERTA', 'APROVADO COM RESSALVA', 'REPROVADO', 'pressão da rede', 'ponto de orvalho', 'falhas', 'recuperações'],
    statusInfo.cor,
    11
  );

  const justificativa = String(payload.justificativa || '').trim();

  // Se o Engenheiro usou o poder de veto (preencheu a justificativa na tela), nós desenhamos um bloco especial no meio da página.
  if (justificativa) {
    blocoTituloCentralAr_(sh, 'A13:M13', 'JUSTIFICATIVA TÉCNICA / RESSALVA OPERACIONAL');
    
    // Bloco amarelo bem suave, estilo nota técnica, bordado e alinhado no topo
    sh.getRange('A14:M17').merge().setValue(justificativa)
      .setBackground('#fef3c7') // Amarelo suave
      .setFontColor('#92400e')  // Texto ambar/terroso para leitura técnica
      .setFontStyle('italic')
      .setWrap(true)
      .setVerticalAlignment('top')
      .setHorizontalAlignment('left')
      .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // Como usamos o espaço do meio, empurramos a RECOMENDAÇÃO mais para baixo na folha A4 (linha 19)
    richTextCentralAr_(
      sh,
      'A19:M25',
      'RECOMENDAÇÃO:\nEste parecer refere-se exclusivamente ao período monitorado e às condições avaliadas na presente coleta. Recomenda-se manter acompanhamento de rotina, verificação metrológica periódica dos instrumentos de medição, manutenção preventiva do sistema de secagem/filtragem, rastreabilidade documental das ocorrências e reavaliação sempre que houver falhas recorrentes, alterações operacionais ou desvios relevantes na qualidade do ar medicinal.',
      ['RECOMENDAÇÃO:', 'verificação metrológica', 'manutenção preventiva', 'qualidade do ar medicinal'],
      null,
      10
    );
  } else {
    // Fluxo Normal (robô autônomo): A recomendação fica no lugar original (linha 13)
    richTextCentralAr_(
      sh,
      'A13:M19',
      'RECOMENDAÇÃO:\nEste parecer refere-se exclusivamente ao período monitorado e às condições avaliadas na presente coleta. Recomenda-se manter acompanhamento de rotina, verificação metrológica periódica dos instrumentos de medição, manutenção preventiva do sistema de secagem/filtragem, rastreabilidade documental das ocorrências e reavaliação sempre que houver falhas recorrentes, alterações operacionais ou desvios relevantes na qualidade do ar medicinal.',
      ['RECOMENDAÇÃO:', 'verificação metrológica', 'manutenção preventiva', 'qualidade do ar medicinal'],
      null,
      10
    );
  }
}

// ============================================================
// DRIVE / PASTAS
// ============================================================

function moverPlanilhaParaPastaLaudos_(spreadsheetId) {
  try {
    let folderId = null;
    const props = PropertiesService.getScriptProperties();
    
    if (typeof UCFG !== 'undefined' && UCFG.SETUP && UCFG.SETUP.PROPRIEDADES) {
      folderId = props.getProperty(UCFG.SETUP.PROPRIEDADES.LAUDOS_FOLDER_ID);
    } else {
      folderId = props.getProperty('LAUDOS_FOLDER_ID');
    }

    if (!folderId) return;

    const file = DriveApp.getFileById(spreadsheetId);
    const folder = DriveApp.getFolderById(folderId);
    
    file.moveTo(folder);
  } catch (e) {}
}

// ============================================================
// LAYOUT
// ============================================================

function obterCoresRelatorioAr_() {
  return {
    CHUMBO: '#374151',
    VERDE: '#007b3e',
    AZUL: '#0b4ea2',
    BORDA: '#cbd5e1',
    APROVADO: '#059669',
    ALERTA: '#d97706',
    REPROVADO: '#dc2626'
  };
}

function prepararAbaA4PaisagemCentralAr_(sh) {
  const cfg = obterCfgPlanilhaCentralAr_();
  sh.clear();
  sh.setHiddenGridlines(true);

  for (var c = 1; c <= cfg.colunas; c++) {
    sh.setColumnWidth(c, cfg.larguraPadrao);
  }
  sh.setColumnWidth(1, cfg.larguraColA);
  sh.setColumnWidth(7, cfg.larguraColG);
  sh.setColumnWidth(8, cfg.larguraColH);

  for (var r = 1; r <= cfg.ultimaLinhaPagina; r++) {
    sh.setRowHeight(r, cfg.alturaPadrao);
  }

  Object.keys(cfg.alturasEspeciais).forEach(function(linha) {
    sh.setRowHeight(Number(linha), cfg.alturasEspeciais[linha]);
  });
}

function cabecalhoPaginaCentralAr_(sh, titulo, subtitulo) {
  sh.getRange('A1:M2').merge().setValue('METROLABS — RELATÓRIO TÉCNICO DE AR MEDICINAL')
    .setBackground('#374151').setFontColor('#ffffff').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle');

  sh.getRange('A3:M3').merge().setValue(String(titulo || ''))
    .setBackground('#e5e7eb').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  if (subtitulo) {
    sh.getRange('A32:M32').merge().setValue(subtitulo)
      .setFontSize(8).setFontStyle('italic').setFontColor('#6b7280')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
}

function blocoTituloCentralAr_(sh, rangeA1, texto) {
  sh.getRange(rangeA1).merge().setValue(String(texto || ''))
    .setBackground('#e5e7eb').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

function escreverTabelaRotuloValorCentralAr_(sh, rowStart, colStart, linhas, colFim) {
  linhas = linhas || [];
  if (!linhas.length) return;

  for (var i = 0; i < linhas.length; i++) {
    const r = rowStart + i;

    sh.getRange(r, colStart, 1, 2).merge()
      .setValue(linhas[i][0])
      .setFontWeight('bold')
      .setBackground('#f8fafc')
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    sh.getRange(r, colStart + 2, 1, (colFim - (colStart + 2) + 1)).merge()
      .setValue(linhas[i][1])
      .setWrap(true)
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }
}

function caixaIndicadorCentralAr_(sh, rangeA1, titulo, valor, corBg, corTexto) {
  sh.getRange(rangeA1).merge()
    .setValue(String(titulo || '') + '\n' + String(valor == null ? '' : valor))
    .setBackground(corBg || '#374151')
    .setFontColor(corTexto || '#ffffff')
    .setFontWeight('bold')
    .setFontSize(12)
    .setWrap(true)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

function escreverTabelaIndicadoresMistosCentralAr_(sh, rowStart, colStart, linhas, colFim) {
  const numCols = colFim ? (colFim - colStart + 1) : 2;
  const colMeio = Math.floor(numCols / 2);

  sh.getRange(rowStart, colStart, 1, colMeio).merge().setValue('INDICADOR');
  sh.getRange(rowStart, colStart + colMeio, 1, numCols - colMeio).merge().setValue('VALOR');

  linhas.forEach(function(item, i) {
    const r = rowStart + 1 + i;
    sh.getRange(r, colStart, 1, colMeio).merge().setValue(item[0]);
    sh.getRange(r, colStart + colMeio, 1, numCols - colMeio).merge().setValue(formatarValorComUnidadePlanilhaAr_(item[1], item[2] || ''));
  });

  const totalLinhas = linhas.length + 1;
  estiloTabelaCompletaCentralAr_(sh.getRange(rowStart, colStart, totalLinhas, numCols), true);
}

function estiloTabelaCompletaCentralAr_(range, cabecalhoEscuro) {
  range.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  range.setVerticalAlignment('middle');

  const head = range.offset(0, 0, 1, range.getNumColumns());
  head.setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground(cabecalhoEscuro ? '#dbeafe' : '#f3f4f6');
}

function richTextCentralAr_(sheet, rangeA1, textoCompleto, termosNegrito, corEspecial, fontSize) {
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

  if (textoCompleto.length > 0) {
    rtv.setTextStyle(0, textoCompleto.length, estiloBase);
  }

  termosNegrito.forEach(function(termo) {
    aplicarEstiloPorOcorrenciasPlanilhaAr_(rtv, textoCompleto, String(termo || ''), estiloNegrito);
  });

  if (corEspecial) {
    [
      'APROVADO',
      'REPROVADO',
      'APROVADO COM ALERTA',
      'APROVADO_COM_ALERTA',
      'APROVADO COM RESSALVA',
      'APROVADO_COM_RESSALVA',
      'DIA CRÍTICO',
      'DIA ESTÁVEL',
      'DIA COM INSTABILIDADE'
    ].forEach(function(palavra) {
      const estiloStatus = SpreadsheetApp.newTextStyle()
        .setForegroundColor(corEspecial)
        .setFontSize(fontSize)
        .setBold(true)
        .build();
      aplicarEstiloPorOcorrenciasPlanilhaAr_(rtv, textoCompleto, palavra, estiloStatus);
    });
  }

  sheet.getRange(rangeA1).merge()
    .setRichTextValue(rtv.build())
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left')
    .setBorder(true, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

function aplicarEstiloPorOcorrenciasPlanilhaAr_(rtv, textoBase, termo, estilo) {
  termo = String(termo || '');
  if (!termo) return;

  let pos = 0;
  while (true) {
    const idx = textoBase.indexOf(termo, pos);
    if (idx === -1) break;
    rtv.setTextStyle(idx, idx + termo.length, estilo);
    pos = idx + termo.length;
  }
}

// ============================================================
// TEXTOS INTELIGENTES
// ============================================================

function montarTextoDashboardCentralArV3_(statusInfo, analise, payload) {
  const comp = analise.comportamentoOperacional || {};
  return 'INTERPRETAÇÃO EXECUTIVA:\n' +
    'No período analisado, o sistema foi classificado como ' + statusInfo.rotulo + '. ' +
    'O comportamento operacional foi predominantemente ' + formatarTextoPredominanciaPlanilhaAr_(comp.classificacaoPredominante) + ', ' +
    'com ' + formatarNumeroPlanilhaAr_(comp.percentualEstavel, 1, '%') + ' dos registros em condição estável, ' +
    formatarNumeroPlanilhaAr_(comp.percentualForaFaixa, 1, '%') + ' fora da faixa e ' +
    formatarNumeroPlanilhaAr_(comp.percentualRecuperacao, 1, '%') + ' em recuperação. ' +
    'Foram detectados ' + valorSeguroPlanilhaAr_(comp.totalFalhas || 0) + ' eventos de falha/excursão e ' +
    valorSeguroPlanilhaAr_(comp.totalRecuperacoes || 0) + ' eventos de restabelecimento. ' +
    (comp.periodoOciosoDetectado ? 'Também foi identificado período ocioso/noturno compatível com baixa demanda da rede. ' : '') +
    'Este painel resume os principais indicadores globais e orienta a leitura técnica das páginas seguintes.';
}

function montarTextoConsolidadoCentralArV3_(statusInfo, analise, payload) {
  const comp = analise.comportamentoOperacional || {};
  const resumoDiario = normalizarResumoDiarioPlanilhaAr_(analise.resumoDiario);

  return 'SÍNTESE CONSOLIDADA:\n' +
    'A consolidação dos resultados demonstra o comportamento global dos parâmetros monitorados, integrando estatística, percentual de ocorrências e análise comportamental. ' +
    'A classificação predominante do período foi ' + formatarTextoPredominanciaPlanilhaAr_(comp.classificacaoPredominante) + '. ' +
    'Foram identificados ' + valorSeguroPlanilhaAr_(comp.totalFalhas || 0) + ' eventos de falha/excursão e ' +
    valorSeguroPlanilhaAr_(comp.totalRecuperacoes || 0) + ' eventos de recuperação, distribuídos ao longo de ' +
    valorSeguroPlanilhaAr_(resumoDiario.totalDias || 1) + ' dia(s) analisado(s). ' +
    'A leitura consolidada deve considerar simultaneamente os extremos, a amplitude, a permanência fora da faixa e o padrão temporal das ocorrências.';
}

function montarTextoAnaliseTecnicaCentralArV3_(statusInfo, analise, payload) {
  const metricasAr = analise.metricasAr || {};
  const pressao = metricasAr.pressao || {};
  const orvalho = metricasAr.orvalho || {};
  const comp = analise.comportamentoOperacional || {};
  const resumoDiario = normalizarResumoDiarioPlanilhaAr_(analise.resumoDiario);
  const faixas = normalizarResumoFaixasPlanilhaAr_(analise.resumoFaixaHorario);

  let texto = 'ANÁLISE TÉCNICA INTELIGENTE:\n';
  texto += 'A presente rotina avaliou o comportamento da pressão da rede e do ponto de orvalho com base em estatística clássica e classificação comportamental por registro. ';
  texto += 'No conjunto analisado, a pressão variou entre ' + formatarNumeroPlanilhaAr_(pressao.min, 1, ' bar') + ' e ' + formatarNumeroPlanilhaAr_(pressao.max, 1, ' bar') + ', com média de ' + formatarNumeroPlanilhaAr_(pressao.media, 1, ' bar') + '. ';
  texto += 'O ponto de orvalho variou entre ' + formatarNumeroPlanilhaAr_(orvalho.min, 1, ' °C') + ' e ' + formatarNumeroPlanilhaAr_(orvalho.max, 1, ' °C') + ', com média de ' + formatarNumeroPlanilhaAr_(orvalho.media, 1, ' °C') + '. ';
  texto += 'Foram observados ' + formatarNumeroPlanilhaAr_(comp.percentualEstavel, 1, '%') + ' de registros em condição estável, ' +
    formatarNumeroPlanilhaAr_(comp.percentualInstabilidade, 1, '%') + ' em instabilidade e ' +
    formatarNumeroPlanilhaAr_(comp.percentualForaFaixa, 1, '%') + ' fora da faixa aceitável. ';
  texto += 'Ao longo de ' + valorSeguroPlanilhaAr_(resumoDiario.totalDias || 1) + ' dia(s) analisado(s), foram contabilizados ' +
    valorSeguroPlanilhaAr_(comp.totalFalhas || 0) + ' eventos de falha/excursão e ' +
    valorSeguroPlanilhaAr_(comp.totalRecuperacoes || 0) + ' eventos de recuperação. ';

  if (comp.periodoOciosoDetectado) {
    texto += 'Houve identificação de período ocioso/noturno, sugerindo trechos de baixa demanda operacional da rede. ';
  }

  texto += 'Na leitura por faixas horárias, os percentuais fora da faixa foram de ' +
    formatarNumeroPlanilhaAr_(faixas.MADRUGADA.percentualForaFaixa, 1, '%') + ' na madrugada, ' +
    formatarNumeroPlanilhaAr_(faixas.MANHA.percentualForaFaixa, 1, '%') + ' pela manhã, ' +
    formatarNumeroPlanilhaAr_(faixas.TARDE.percentualForaFaixa, 1, '%') + ' à tarde e ' +
    formatarNumeroPlanilhaAr_(faixas.NOITE.percentualForaFaixa, 1, '%') + ' à noite.';

  return texto;
}

function montarTextoResumoDiarioCentralAr_(resumoDiario) {
  const dias = Array.isArray(resumoDiario && resumoDiario.dias) ? resumoDiario.dias : [];
  if (!dias.length) {
    return 'LEITURA POR DIA:\nNão houve quantidade suficiente de dados para compor resumo diário detalhado.';
  }

  const partes = ['LEITURA POR DIA:\n'];
  dias.forEach(function(d) {
    partes.push(
      'No dia ' + d.data + ', o sistema apresentou comportamento classificado como ' + valorSeguroPlanilhaAr_(d.comportamento) +
      ', com ' + formatarNumeroPlanilhaAr_(d.percentualEstavel, 1, '%') + ' de estabilidade, ' +
      formatarNumeroPlanilhaAr_(d.percentualForaFaixa, 1, '%') + ' fora da faixa, ' +
      formatarNumeroPlanilhaAr_(d.percentualInstavel, 1, '%') + ' em instabilidade e ' +
      valorSeguroPlanilhaAr_(d.totalRecuperacoes || 0) + ' evento(s) de recuperação.'
    );
  });
  return partes.join(' ');
}

function montarTextoConclusaoFinalCentralArV3_(statusInfo, analise, payload) {
  const comp = analise.comportamentoOperacional || {};
  const motivos = textoListaPlanilhaAr_(analise.motivosReprovacao, '');
  const alertas = textoListaPlanilhaAr_(analise.alertasAnalise, '');

  if (statusInfo.chave === 'REPROVADO') {
    return 'CONCLUSÃO TÉCNICA FINAL:\n' +
      'Com base na análise estatística e comportamental do monitoramento, o sistema foi classificado como REPROVADO. ' +
      'Foram identificadas não conformidades relacionadas à pressão da rede e/ou ao ponto de orvalho, com impacto técnico potencial sobre a qualidade do ar medicinal. ' +
      (motivos ? ('Principais motivos: ' + motivos + '. ') : '') +
      'No período analisado, registraram-se ' + valorSeguroPlanilhaAr_(comp.totalFalhas || 0) + ' falhas/excursões e ' +
      valorSeguroPlanilhaAr_(comp.totalRecuperacoes || 0) + ' recuperações, demonstrando comportamento operacional insuficiente para enquadramento conforme nos critérios configurados.';
  }

  if (statusInfo.chave === 'APROVADO_COM_ALERTA' || statusInfo.chave === 'APROVADO_COM_RESSALVA') {
    return 'CONCLUSÃO TÉCNICA FINAL:\n' +
      'Com base na análise estatística e comportamental do monitoramento, o sistema foi classificado como ' + statusInfo.rotulo + '. ' +
      'Os parâmetros principais permaneceram em condição operacional, porém foram identificados eventos de instabilidade e/ou excursões que justificam acompanhamento preventivo e registro técnico do comportamento observado. ' +
      (alertas ? ('Alertas relevantes: ' + alertas + '. ') : '') +
      'Foram contabilizados ' + valorSeguroPlanilhaAr_(comp.totalFalhas || 0) + ' eventos de falha/excursão e ' +
      valorSeguroPlanilhaAr_(comp.totalRecuperacoes || 0) + ' recuperações, indicando necessidade de vigilância operacional contínua.';
  }

  return 'CONCLUSÃO TÉCNICA FINAL:\n' +
    'Com base na análise estatística e comportamental do monitoramento, o sistema foi classificado como APROVADO. ' +
    'A pressão da rede e o ponto de orvalho permaneceram predominantemente compatíveis com os critérios configurados para o período avaliado, com ' +
    formatarNumeroPlanilhaAr_(comp.percentualEstavel, 1, '%') + ' de registros em condição estável e ausência de não conformidades críticas que comprometessem a avaliação técnica.';
}

// ============================================================
// HELPERS DE FORMATAÇÃO
// ============================================================

function valorSeguroPlanilhaAr_(v) {
  return v == null ? '' : String(v);
}

function numeroSeguroPlanilhaAr_(v) {
  const n = Number(String(v == null ? '' : v).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function formatarNumeroPlanilhaAr_(v, casas, sufixo) {
  const n = Number(String(v == null ? '' : v).replace(',', '.'));
  if (!isFinite(n)) return '';
  return n.toFixed(casas == null ? 1 : casas) + String(sufixo || '');
}

function formatarValorComUnidadePlanilhaAr_(valor, unidade) {
  unidade = String(unidade || '');
  if (!unidade) return valorSeguroPlanilhaAr_(valor);
  
  return formatarNumeroPlanilhaAr_(valor, 1, '');
}

function valorOuVazioAr_(v) {
  return v === null || typeof v === 'undefined' ? '' : v;
}

function textoListaPlanilhaAr_(lista, vazio) {
  if (!lista || !lista.length) return vazio || 'Nenhum item registrado.';
  return lista.map(function(item, idx) {
    return (idx + 1) + '. ' + item;
  }).join(' ');
}

function formatarTextoPredominanciaPlanilhaAr_(chave) {
  chave = String(chave || '');
  const mapa = {
    NORMAL: 'normal',
    FORA_FAIXA: 'fora da faixa',
    RECUPERACAO: 'em recuperação',
    INSTABILIDADE: 'instável',
    ESTAVEL: 'estável',
    OCIOSO_ESTAVEL: 'ocioso/estável'
  };
  return mapa[chave] || (chave ? chave.toLowerCase() : 'normal');
}