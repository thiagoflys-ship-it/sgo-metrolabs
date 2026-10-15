/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: AnaliseCiclo.gs
 * VERSÃO REFEITA — CRITÉRIO INTELIGENTE E COERENTE + SLA FLEXÍVEL
 * OBJETIVO:
 * - manter análise estatística completa
 * - classificar registros por comportamento operacional
 * - identificar eventos contínuos de excursão e recuperação
 * - evitar reprovação automática por evento pontual já sanado
 * - suportar APROVADO / APROVADO_COM_ALERTA / REPROVADO
 * - processar SLA Flexível e Justificativa do Engenheiro (VETO)
 ****************************************************/

function analisarCiclo(dados, payload) {
  if (!Array.isArray(dados) || !dados.length) {
    return { aprovado:false, statusAprovacao:'SEM_STATUS', motivosReprovacao:['Nenhum dado recebido para análise.'], alertasAnalise:[], totalRegistros:0 };
  }

  payload = payload || {};

  const limites = montarLimitesAnaliseCentralAr_(payload);
  const linhas = normalizarLinhasAnaliseCentralAr_(dados);

  if (!linhas.length) {
    return { aprovado:false, statusAprovacao:'SEM_STATUS', motivosReprovacao:['Dados inválidos após normalização.'], alertasAnalise:[], totalRegistros:0 };
  }

  const deltaMin = estimarDeltaMinAnalise_(linhas);
  const stats = {
    pressao: calcStats(linhas, 'pressao'),
    orvalho: calcStats(linhas, 'orvalho')
  };

  const amplitudePressao = diferencaSegura_(stats.pressao.max, stats.pressao.min);
  const amplitudeOrvalho = diferencaSegura_(stats.orvalho.max, stats.orvalho.min);

  const linhasClassificadas = classificarLinhasAnaliseCentralAr_(linhas, limites);
  const eventos = extrairEventosAnaliseCentralAr_(linhasClassificadas, deltaMin);
  const comportamento = resumirComportamentoAnalise_(linhasClassificadas, deltaMin, eventos);
  const resumoDiario = resumirPorDiaAnalise_(linhasClassificadas, deltaMin, limites);
  const resumoFaixaHorario = resumirFaixaHorarioAnalise_(linhasClassificadas, deltaMin);

  const metricasAr = montarMetricasAnaliseCentralAr_(linhasClassificadas, stats, amplitudePressao, amplitudeOrvalho, deltaMin);
  
  // CORREÇÃO: Enviamos também o Payload e o Resumo Diário para a função de decisão processar o SLA e a Justificativa
  const decisao = decidirStatusAnaliseCentralAr_(metricasAr, comportamento, eventos, limites, payload, resumoDiario);
  const observacoes = montarObservacoesAnaliseCentralAr_(metricasAr, comportamento, eventos, decisao, payload);

  return {
    aprovado: decisao.status !== 'REPROVADO',
    statusAprovacao: decisao.status,
    statusAprovacaoTexto: traduzirStatusAnaliseCentralAr_(decisao.status),
    tempoInicioCiclo: linhas[0].tempoStr,
    tempoFimCiclo: linhas[linhas.length - 1].tempoStr,
    totalRegistros: linhas.length,
    deltaMinutosEstimado: deltaMin,
    metricasAr: metricasAr,
    comportamentoOperacional: comportamento,
    resumoDiario: resumoDiario,
    resumoFaixaHorario: resumoFaixaHorario,
    linhasClassificadas: linhasClassificadas,
    eventosExcursao: eventos,
    motivosReprovacao: decisao.motivos,
    alertasAnalise: decisao.alertas,
    observacoesAnalise: observacoes
  };
}

// ============================================================
// MONTAGEM DE LIMITES
// ============================================================

function montarLimitesAnaliseCentralAr_(payload) {
  const cfg = typeof UCFG !== 'undefined' && UCFG ? UCFG : {};
  const lim = cfg.LIMITES || {};
  const exc = lim.EXCURSAO || {};
  const est = lim.ESTABILIDADE || {};
  const ana = cfg.ANALISE || {};

  return {
    PRESSAO: {
      MIN: numeroAnalise_(payload.pressaoMin, lim.PRESSAO && lim.PRESSAO.MIN),
      MAX: numeroAnalise_(payload.pressaoMax, lim.PRESSAO && lim.PRESSAO.MAX)
    },
    ORVALHO: {
      MAX_ACEITAVEL: numeroAnalise_(payload.orvalhoMax, lim.ORVALHO && lim.ORVALHO.MAX_ACEITAVEL)
    },
    EXCURSAO: {
      PERCENTUAL_ALERTA_FORA_FAIXA: numeroAnalise_(exc.PERCENTUAL_ALERTA_FORA_FAIXA, 5),
      PERCENTUAL_REPROVACAO_FORA_FAIXA: numeroAnalise_(exc.PERCENTUAL_REPROVACAO_FORA_FAIXA, 15),
      MINUTOS_REPROVACAO_CONTINUA: numeroAnalise_(exc.MINUTOS_REPROVACAO_CONTINUA, 60),
      MINUTOS_ALERTA_CONTINUA: numeroAnalise_(exc.MINUTOS_ALERTA_CONTINUA, 15),
      MAX_EVENTOS_ALERTA: numeroAnalise_(exc.MAX_EVENTOS_ALERTA, 3),
      MAX_EVENTOS_REPROVACAO: numeroAnalise_(exc.MAX_EVENTOS_REPROVACAO, 6)
    },
    ESTABILIDADE: {
      AMPLITUDE_PRESSAO_ALERTA: numeroAnalise_(est.AMPLITUDE_PRESSAO_ALERTA, 0.8),
      AMPLITUDE_PRESSAO_REPROVACAO: numeroAnalise_(est.AMPLITUDE_PRESSAO_REPROVACAO, 1.5),
      AMPLITUDE_ORVALHO_ALERTA: numeroAnalise_(est.AMPLITUDE_ORVALHO_ALERTA, 6),
      AMPLITUDE_ORVALHO_REPROVACAO: numeroAnalise_(est.AMPLITUDE_ORVALHO_REPROVACAO, 12)
    },
    TOLERANCIA_RUIDO_PRESSAO: numeroAnalise_(ana.TOLERANCIA_RUIDO_PRESSAO, 0.02),
    TOLERANCIA_RUIDO_ORVALHO: numeroAnalise_(ana.TOLERANCIA_RUIDO_ORVALHO, 0.30),
    HORA_OCIOSA_INICIO: numeroAnalise_(ana.HORA_OCIOSA_INICIO, 22),
    HORA_OCIOSA_FIM: numeroAnalise_(ana.HORA_OCIOSA_FIM, 6)
  };
}

// ============================================================
// NORMALIZAÇÃO INTERNA
// ============================================================

function normalizarLinhasAnaliseCentralAr_(dados) {
  return dados.map(function(row, i) {
    return {
      idx: i,
      tempo: row.tempoDate || null,
      tempoStr: row.tempoStr || '',
      data: row.data || '',
      hora: row.hora || '',
      pressao: parseNum(row.pressao),
      orvalho: parseNum(row.orvalho)
    };
  }).filter(function(l) {
    return l.pressao !== null || l.orvalho !== null;
  });
}

// ============================================================
// CLASSIFICAÇÃO POR REGISTRO
// ============================================================

function classificarLinhasAnaliseCentralAr_(linhas, limites) {
  const out = [];

  for (let i = 0; i < linhas.length; i++) {
    const atual = linhas[i];
    const anterior = i > 0 ? linhas[i - 1] : null;

    const minPressao = limites.PRESSAO && limites.PRESSAO.MIN != null ? limites.PRESSAO.MIN : 4.5;
    const maxPressao = limites.PRESSAO && limites.PRESSAO.MAX != null ? limites.PRESSAO.MAX : 6.0;
    const maxOrvalho = limites.ORVALHO && limites.ORVALHO.MAX_ACEITAVEL != null ? limites.ORVALHO.MAX_ACEITAVEL : -40.0;

    const pressaoFora = atual.pressao !== null && (atual.pressao < minPressao || atual.pressao > maxPressao);
    const orvalhoFora = atual.orvalho !== null && (atual.orvalho > maxOrvalho);
    const foraFaixa = !!(pressaoFora || orvalhoFora);

    const variacaoPressao = anterior && atual.pressao !== null && anterior.pressao !== null
      ? Math.abs(atual.pressao - anterior.pressao)
      : 0;

    const variacaoOrvalho = anterior && atual.orvalho !== null && anterior.orvalho !== null
      ? Math.abs(atual.orvalho - anterior.orvalho)
      : 0;

    const tolRuidoPressao = limites.TOLERANCIA_RUIDO_PRESSAO != null ? limites.TOLERANCIA_RUIDO_PRESSAO : 0.02;
    const tolRuidoOrvalho = limites.TOLERANCIA_RUIDO_ORVALHO != null ? limites.TOLERANCIA_RUIDO_ORVALHO : 0.30;

    const instavel = (
      variacaoPressao > tolRuidoPressao * 5 ||
      variacaoOrvalho > tolRuidoOrvalho * 5
    );

    const estavel = !foraFaixa && (
      variacaoPressao <= tolRuidoPressao * 2 &&
      variacaoOrvalho <= tolRuidoOrvalho * 2
    );

    const horaNum = extrairHoraAnalise_(atual.tempo);
    const hOciosaInicio = limites.HORA_OCIOSA_INICIO != null ? limites.HORA_OCIOSA_INICIO : 22;
    const hOciosaFim = limites.HORA_OCIOSA_FIM != null ? limites.HORA_OCIOSA_FIM : 6;
    const periodoNoturno = (horaNum >= hOciosaInicio || horaNum < hOciosaFim);
    const ocioso = periodoNoturno && estavel && !foraFaixa;

    let statusRegistro = 'NORMAL';
    if (foraFaixa) {
      statusRegistro = 'FORA_FAIXA';
    } else if (anterior && anterior.foraFaixaMemo_) {
      statusRegistro = 'RECUPERACAO';
    } else if (ocioso) {
      statusRegistro = 'OCIOSO_ESTAVEL';
    } else if (instavel) {
      statusRegistro = 'INSTABILIDADE';
    } else if (estavel) {
      statusRegistro = 'ESTAVEL';
    }

    atual.foraFaixaMemo_ = foraFaixa;

    out.push({
      idx: atual.idx,
      tempo: atual.tempo,
      tempoStr: atual.tempoStr,
      data: atual.data,
      hora: atual.hora,
      pressao: atual.pressao,
      orvalho: atual.orvalho,
      pressaoFora: pressaoFora,
      orvalhoFora: orvalhoFora,
      foraFaixa: foraFaixa,
      variacaoPressao: variacaoPressao,
      variacaoOrvalho: variacaoOrvalho,
      periodoNoturno: periodoNoturno,
      statusRegistro: statusRegistro
    });
  }

  return out;
}

// ============================================================
// EVENTOS DE EXCURSÃO CONTÍNUOS
// ============================================================

function extrairEventosAnaliseCentralAr_(linhas, deltaMin) {
  const eventos = [];
  let eventoAtual = null;

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    if (l.foraFaixa) {
      if (!eventoAtual) {
        eventoAtual = {
          indiceInicio: i,
          inicio: l.tempoStr,
          fim: l.tempoStr,
          totalRegistros: 0,
          minutos: 0,
          tipos: { PRESSAO: false, ORVALHO: false },
          recuperado: false
        };
      }

      eventoAtual.totalRegistros++;
      eventoAtual.fim = l.tempoStr;
      if (l.pressaoFora) eventoAtual.tipos.PRESSAO = true;
      if (l.orvalhoFora) eventoAtual.tipos.ORVALHO = true;
      continue;
    }

    if (eventoAtual) {
      eventoAtual.minutos = arredondarAnalise_(eventoAtual.totalRegistros * deltaMin, 2);
      eventoAtual.recuperado = (l.statusRegistro === 'RECUPERACAO');
      eventoAtual.tipoPredominante = eventoAtual.tipos.PRESSAO && eventoAtual.tipos.ORVALHO
        ? 'PRESSAO_E_ORVALHO'
        : (eventoAtual.tipos.PRESSAO ? 'PRESSAO' : 'ORVALHO');
      eventos.push(eventoAtual);
      eventoAtual = null;
    }
  }

  if (eventoAtual) {
    eventoAtual.minutos = arredondarAnalise_(eventoAtual.totalRegistros * deltaMin, 2);
    eventoAtual.recuperado = false;
    eventoAtual.tipoPredominante = eventoAtual.tipos.PRESSAO && eventoAtual.tipos.ORVALHO
      ? 'PRESSAO_E_ORVALHO'
      : (eventoAtual.tipos.PRESSAO ? 'PRESSAO' : 'ORVALHO');
    eventos.push(eventoAtual);
  }

  return eventos;
}

// ============================================================
// MÉTRICAS CONSOLIDADAS
// ============================================================

function montarMetricasAnaliseCentralAr_(linhasClassificadas, stats, amplitudePressao, amplitudeOrvalho, deltaMin) {
  const total = linhasClassificadas.length || 1;

  let foraPressao = 0;
  let foraOrvalho = 0;
  let dentroPressao = 0;
  let dentroOrvalho = 0;
  let foraFaixaTotal = 0;

  linhasClassificadas.forEach(function(l) {
    if (l.pressaoFora) foraPressao++;
    else if (l.pressao !== null) dentroPressao++;

    if (l.orvalhoFora) foraOrvalho++;
    else if (l.orvalho !== null) dentroOrvalho++;

    if (l.foraFaixa) foraFaixaTotal++;
  });

  return {
    pressao: stats.pressao,
    orvalho: stats.orvalho,
    amplitudePressao: amplitudePressao,
    amplitudeOrvalho: amplitudeOrvalho,
    percentualPressaoFora: (foraPressao / total) * 100,
    percentualOrvalhoFora: (foraOrvalho / total) * 100,
    percentualPressaoDentro: (dentroPressao / total) * 100,
    percentualOrvalhoDentro: (dentroOrvalho / total) * 100,
    percentualGlobalForaFaixa: (foraFaixaTotal / total) * 100,
    percentualGlobalConforme: ((total - foraFaixaTotal) / total) * 100,
    minutosForaFaixa: foraFaixaTotal * deltaMin
  };
}

// ============================================================
// DECISÃO INTELIGENTE (SLA E VETO)
// ============================================================

function decidirStatusAnaliseCentralAr_(metricas, comportamento, eventos, limites, payload, resumoDiario) {
  const motivos = [];
  const alertas = [];

  const maiorEvento = obterMaiorEventoAnaliseCentralAr_(eventos);
  const totalEventos = eventos.length;
  const eventosSemRecuperacao = eventos.filter(function(e) { return !e.recuperado; }).length;

  // CORREÇÃO MESTRA: Buscar os valores do SLA Flexível vindos da UI (Payload). Se não existir, usa o padrão do Config.
  const minPressao = limites.PRESSAO && limites.PRESSAO.MIN != null ? limites.PRESSAO.MIN : 4.5;
  const maxPressao = limites.PRESSAO && limites.PRESSAO.MAX != null ? limites.PRESSAO.MAX : 6.0;
  const maxOrvalho = limites.ORVALHO && limites.ORVALHO.MAX_ACEITAVEL != null ? limites.ORVALHO.MAX_ACEITAVEL : -40.0;
  
  const pctAlertaFora = payload.slaAlerta != null ? payload.slaAlerta : (limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_ALERTA_FORA_FAIXA != null ? limites.EXCURSAO.PERCENTUAL_ALERTA_FORA_FAIXA : 5);
  const pctReprovacaoFora = payload.slaReprovacao != null ? payload.slaReprovacao : (limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA != null ? limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA : 15);
  const minReprovacaoCont = payload.toleranciaFalha != null ? payload.toleranciaFalha : (limites.EXCURSAO && limites.EXCURSAO.MINUTOS_REPROVACAO_CONTINUA != null ? limites.EXCURSAO.MINUTOS_REPROVACAO_CONTINUA : 60);
  const diasCriticosTolerados = payload.diasCriticos != null ? payload.diasCriticos : 2;
  
  const ampPressaoAlerta = limites.ESTABILIDADE && limites.ESTABILIDADE.AMPLITUDE_PRESSAO_ALERTA != null ? limites.ESTABILIDADE.AMPLITUDE_PRESSAO_ALERTA : 0.8;
  const ampOrvalhoAlerta = limites.ESTABILIDADE && limites.ESTABILIDADE.AMPLITUDE_ORVALHO_ALERTA != null ? limites.ESTABILIDADE.AMPLITUDE_ORVALHO_ALERTA : 6;
  const maxEventosAlerta = limites.EXCURSAO && limites.EXCURSAO.MAX_EVENTOS_ALERTA != null ? limites.EXCURSAO.MAX_EVENTOS_ALERTA : 3;
  const maxEventosReprovacao = limites.EXCURSAO && limites.EXCURSAO.MAX_EVENTOS_REPROVACAO != null ? limites.EXCURSAO.MAX_EVENTOS_REPROVACAO : 6;

  // Analisando dias críticos
  let qtdDiasCriticos = 0;
  if (resumoDiario && Array.isArray(resumoDiario.dias)) {
    qtdDiasCriticos = resumoDiario.dias.filter(function(d) { return d.comportamento === 'DIA CRÍTICO'; }).length;
  }

  // --- REGRAS DE ALERTA ---
  if (metricas.pressao.min !== null && metricas.pressao.min < minPressao) {
    alertas.push('Houve registro de pressão abaixo do mínimo em parte do período.');
  }
  if (metricas.pressao.max !== null && metricas.pressao.max > maxPressao) {
    alertas.push('Houve registro de pressão acima do máximo em parte do período.');
  }
  if (metricas.orvalho.max !== null && metricas.orvalho.max > maxOrvalho) {
    alertas.push('Houve registro de ponto de orvalho acima do limite em parte do período.');
  }

  if (metricas.amplitudePressao > ampPressaoAlerta) {
    alertas.push('Amplitude de pressão acima do nível de atenção.');
  }
  
  if (metricas.percentualGlobalForaFaixa > pctAlertaFora) {
    alertas.push('Percentual global fora da faixa (' + formatarNumeroAnaliseTexto_(metricas.percentualGlobalForaFaixa, '%') + ') ultrapassou o nível de alerta do SLA (' + pctAlertaFora + '%).');
  }
  
  if (qtdDiasCriticos > 0 && qtdDiasCriticos <= diasCriticosTolerados) {
    alertas.push('Foram identificados ' + qtdDiasCriticos + ' dia(s) com instabilidade crítica, porém dentro da tolerância do período.');
  }

  if (totalEventos > 0) {
    alertas.push('Foram identificados ' + totalEventos + ' evento(s) de excursão na malha.');
  }
  if (comportamento.totalRecuperacoes > 0) {
    alertas.push('O sistema apresentou capacidade de recuperação automática após eventos de excursão.');
  }

  // --- REGRAS DE REPROVAÇÃO ---
  if (metricas.percentualGlobalForaFaixa >= pctReprovacaoFora) {
    motivos.push('Percentual global fora da faixa (' + formatarNumeroAnaliseTexto_(metricas.percentualGlobalForaFaixa, '%') + ') ultrapassou o limite crítico de reprovação (' + pctReprovacaoFora + '%).');
  }

  if (maiorEvento && maiorEvento.minutos >= minReprovacaoCont) {
    motivos.push('Identificada excursão contínua com duração crítica de ' + formatarNumeroAnaliseTexto_(maiorEvento.minutos, ' min') + ', superior à tolerância de ' + minReprovacaoCont + ' min.');
  }

  if (qtdDiasCriticos > diasCriticosTolerados) {
    motivos.push('Recorrência inaceitável: ' + qtdDiasCriticos + ' dias de instabilidade crítica (Tolerância: ' + diasCriticosTolerados + ' dias).');
  }

  if (eventosSemRecuperacao > 0 && metricas.percentualGlobalForaFaixa >= pctAlertaFora) {
    motivos.push('Excursões críticas encerradas sem recuperação operacional confirmada no período avaliado.');
  }

  // --- O VETO DO ENGENHEIRO (JUSTIFICATIVA) ---
  const temJustificativa = String(payload.justificativa || '').trim() !== '';

  let status = 'APROVADO';
  
  if (temJustificativa) {
    // A Bala de Prata: Se tem justificativa, salva de qualquer reprovação e vira RESSALVA.
    status = 'APROVADO_COM_RESSALVA';
    alertas.unshift('RESSALVA TÉCNICA: ' + String(payload.justificativa).trim());
    // Se tinha motivos de reprovação, eles viram apenas alertas históricos.
    if (motivos.length > 0) {
      alertas.push('A reprovação mecânica do sistema foi anulada pela justificativa técnica.');
      motivos.length = 0; 
    }
  } else {
    // Fluxo normal (robô decide)
    if (motivos.length) {
      status = 'REPROVADO';
    } else if (
      totalEventos > 0 ||
      metricas.percentualGlobalForaFaixa >= pctAlertaFora ||
      metricas.amplitudePressao > ampPressaoAlerta ||
      metricas.amplitudeOrvalho > ampOrvalhoAlerta ||
      qtdDiasCriticos > 0
    ) {
      status = 'APROVADO_COM_ALERTA';
    }
  }

  return {
    status: status,
    motivos: deduplicarMensagensAnalise_(motivos),
    alertas: deduplicarMensagensAnalise_(alertas)
  };
}

function obterMaiorEventoAnaliseCentralAr_(eventos) {
  if (!Array.isArray(eventos) || !eventos.length) return null;
  return eventos.reduce(function(maior, atual) {
    if (!maior) return atual;
    return atual.minutos > maior.minutos ? atual : maior;
  }, null);
}

function traduzirStatusAnaliseCentralAr_(status) {
  if (status === 'REPROVADO') return 'REPROVADO';
  if (status === 'APROVADO_COM_ALERTA') return 'APROVADO COM ALERTA';
  if (status === 'APROVADO_COM_RESSALVA') return 'APROVADO COM RESSALVA';
  return 'APROVADO';
}

// ============================================================
// RESUMOS INTELIGENTES
// ============================================================

function resumirComportamentoAnalise_(linhas, deltaMin, eventos) {
  const cont = {
    NORMAL: 0,
    FORA_FAIXA: 0,
    RECUPERACAO: 0,
    INSTABILIDADE: 0,
    ESTAVEL: 0,
    OCIOSO_ESTAVEL: 0
  };

  linhas.forEach(function(l) {
    if (cont.hasOwnProperty(l.statusRegistro)) cont[l.statusRegistro]++;
  });

  const total = linhas.length || 1;

  return {
    totalFalhas: Array.isArray(eventos) ? eventos.length : cont.FORA_FAIXA,
    totalRecuperacoes: cont.RECUPERACAO,
    percentualNormal: (cont.NORMAL / total) * 100,
    percentualForaFaixa: (cont.FORA_FAIXA / total) * 100,
    percentualRecuperacao: (cont.RECUPERACAO / total) * 100,
    percentualInstabilidade: (cont.INSTABILIDADE / total) * 100,
    percentualEstavel: ((cont.ESTAVEL + cont.OCIOSO_ESTAVEL) / total) * 100,
    percentualOcioso: (cont.OCIOSO_ESTAVEL / total) * 100,
    periodoOciosoDetectado: cont.OCIOSO_ESTAVEL > 0,
    minutosForaFaixa: cont.FORA_FAIXA * deltaMin,
    minutosEstaveis: (cont.ESTAVEL + cont.OCIOSO_ESTAVEL) * deltaMin,
    minutosInstaveis: cont.INSTABILIDADE * deltaMin,
    percentualInstabilidadeTotal: ((cont.INSTABILIDADE + cont.FORA_FAIXA) / total) * 100,
    classificacaoPredominante: obterClassificacaoPredominanteAnalise_(cont)
  };
}

function obterClassificacaoPredominanteAnalise_(cont) {
  let maiorChave = 'NORMAL';
  let maiorValor = -1;
  Object.keys(cont).forEach(function(k) {
    if (cont[k] > maiorValor) {
      maiorValor = cont[k];
      maiorChave = k;
    }
  });
  return maiorChave;
}

function resumirPorDiaAnalise_(linhas, deltaMin, limites) {
  const mapa = {};

  linhas.forEach(function(l) {
    const chave = l.data || (l.tempo ? Utilities.formatDate(l.tempo, Session.getScriptTimeZone(), 'dd/MM/yyyy') : 'SEM_DATA');
    if (!mapa[chave]) {
      mapa[chave] = {
        data: chave,
        total: 0,
        foraFaixa: 0,
        recuperacoes: 0,
        estavel: 0,
        instavel: 0,
        ocioso: 0,
        pressaoMin: null,
        pressaoMax: null,
        orvalhoMin: null,
        orvalhoMax: null
      };
    }

    const d = mapa[chave];
    d.total++;

    if (l.statusRegistro === 'FORA_FAIXA') d.foraFaixa++;
    if (l.statusRegistro === 'RECUPERACAO') d.recuperacoes++;
    if (l.statusRegistro === 'ESTAVEL') d.estavel++;
    if (l.statusRegistro === 'INSTABILIDADE') d.instavel++;
    if (l.statusRegistro === 'OCIOSO_ESTAVEL') d.ocioso++;

    d.pressaoMin = minSeguroAnalise_(d.pressaoMin, l.pressao);
    d.pressaoMax = maxSeguroAnalise_(d.pressaoMax, l.pressao);
    d.orvalhoMin = minSeguroAnalise_(d.orvalhoMin, l.orvalho);
    d.orvalhoMax = maxSeguroAnalise_(d.orvalhoMax, l.orvalho);
  });

  const lista = Object.keys(mapa).sort(function(a, b) {
    return parseDataTextoAnalise_(a) - parseDataTextoAnalise_(b);
  }).map(function(chave) {
    const d = mapa[chave];
    const total = d.total || 1;
    return {
      data: d.data,
      totalRegistros: d.total,
      percentualForaFaixa: (d.foraFaixa / total) * 100,
      percentualEstavel: ((d.estavel + d.ocioso) / total) * 100,
      percentualInstavel: (d.instavel / total) * 100,
      percentualOcioso: (d.ocioso / total) * 100,
      totalRecuperacoes: d.recuperacoes,
      minutosForaFaixa: d.foraFaixa * deltaMin,
      pressaoMin: d.pressaoMin,
      pressaoMax: d.pressaoMax,
      orvalhoMin: d.orvalhoMin,
      orvalhoMax: d.orvalhoMax,
      comportamento: classificarDiaAnalise_(d, total, limites, deltaMin)
    };
  });

  return {
    totalDias: lista.length,
    dias: lista
  };
}

function classificarDiaAnalise_(d, total, limites, deltaMin) {
  const pctFora = (d.foraFaixa / total) * 100;
  const pctInst = (d.instavel / total) * 100;
  const minFora = d.foraFaixa * deltaMin;
  
  const pctReprovacaoFora = limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA != null ? limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA : 15;
  const minReprovacaoCont = limites.EXCURSAO && limites.EXCURSAO.MINUTOS_REPROVACAO_CONTINUA != null ? limites.EXCURSAO.MINUTOS_REPROVACAO_CONTINUA : 60;

  if (pctFora >= pctReprovacaoFora || minFora >= minReprovacaoCont) {
    return 'DIA CRÍTICO';
  }
  if (pctFora > 0 || pctInst >= 20) {
    return 'DIA COM INSTABILIDADE';
  }
  if (((d.estavel + d.ocioso) / total) * 100 >= 60) {
    return 'DIA ESTÁVEL';
  }
  return 'DIA OPERACIONAL';
}

function resumirFaixaHorarioAnalise_(linhas, deltaMin) {
  const grupos = {
    MADRUGADA: { total: 0, fora: 0 },
    MANHA: { total: 0, fora: 0 },
    TARDE: { total: 0, fora: 0 },
    NOITE: { total: 0, fora: 0 }
  };

  linhas.forEach(function(l) {
    const h = extrairHoraAnalise_(l.tempo);
    const chave = h <= 5 ? 'MADRUGADA' : h <= 11 ? 'MANHA' : h <= 17 ? 'TARDE' : 'NOITE';
    grupos[chave].total++;
    if (l.statusRegistro === 'FORA_FAIXA') grupos[chave].fora++;
  });

  const saida = {};
  Object.keys(grupos).forEach(function(k) {
    const g = grupos[k];
    const total = g.total || 1;
    saida[k] = {
      totalRegistros: g.total,
      percentualForaFaixa: (g.fora / total) * 100,
      minutosForaFaixa: g.fora * deltaMin
    };
  });

  return saida;
}

// ============================================================
// OBSERVAÇÕES AUTOMÁTICAS
// ============================================================

function montarObservacoesAnaliseCentralAr_(metricas, comportamento, eventos, decisao, payload) {
  const obs = [];
  const temJustificativa = String(payload.justificativa || '').trim() !== '';

  if (temJustificativa) {
    obs.push('NOTA TÉCNICA: A aprovação deste relatório considerou o veto do Responsável Técnico, que inseriu uma justificativa operacional para os desvios encontrados, anulando a reprovação mecânica.');
  } else {
    obs.push('Análise automática do motor Central de Ar Medical com critério de impacto e recuperação. A classificação final considera SLA de tolerância global, duração dos eventos, dias críticos e recuperação operacional.');
  }

  if (eventos.length) {
    const maior = obterMaiorEventoAnaliseCentralAr_(eventos);
    obs.push('Foram identificados ' + eventos.length + ' evento(s) de excursão (Maior evento: ' + formatarNumeroAnaliseTexto_(maior.minutos, ' min') + ').');
  } else {
    obs.push('O sistema operou dentro da faixa de conformidade ininterruptamente.');
  }

  if (comportamento.periodoOciosoDetectado) {
    obs.push('Foram identificados trechos compatíveis com período ocioso/noturno, sem penalização direta da conclusão.');
  }

  if (decisao.status === 'APROVADO_COM_ALERTA') {
    obs.push('Ocorrências pontuais foram registradas, porém com impacto global controlado e sem violar o SLA crítico de reprovação.');
  }

  if (decisao.status === 'REPROVADO') {
    obs.push('A reprovação foi atribuída por violação do SLA de tolerância de excursões, persistência da falha sem recuperação, ou recorrência de dias críticos no período avaliado.');
  }

  return obs;
}

function deduplicarMensagensAnalise_(lista) {
  const seen = {};
  return (lista || []).filter(function(item) {
    const chave = String(item || '').trim();
    if (!chave || seen[chave]) return false;
    seen[chave] = true;
    return true;
  });
}

function formatarNumeroAnaliseTexto_(v, sufixo) {
  const n = Number(v);
  if (!isFinite(n)) return '0' + String(sufixo || '');
  return n.toFixed(1) + String(sufixo || '');
}

function arredondarAnalise_(v, casas) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  const p = Math.pow(10, Number(casas || 0));
  return Math.round(n * p) / p;
}

// ============================================================
// HELPERS BÁSICOS
// ============================================================

function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}

function calcStats(arr, campo) {
  const vals = arr.map(function(x) { return x[campo]; }).filter(function(v) { return v !== null; });
  if (!vals.length) return { min: null, max: null, media: null, amplitude: null };

  const min = Math.min.apply(null, vals);
  const max = Math.max.apply(null, vals);
  const media = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;

  return {
    min: min,
    max: max,
    media: media,
    amplitude: max - min
  };
}

function numeroAnalise_(valor, fallback) {
  const n = Number(String(valor == null ? '' : valor).replace(',', '.'));
  return isFinite(n) ? n : fallback;
}

function diferencaSegura_(a, b) {
  if (a === null || b === null) return 0;
  return a - b;
}

function estimarDeltaMinAnalise_(linhas) {
  if (!linhas || linhas.length < 2) return 1;

  const diffs = [];
  for (let i = 1; i < linhas.length; i++) {
    const t1 = linhas[i - 1].tempo ? linhas[i - 1].tempo.getTime() : null;
    const t2 = linhas[i].tempo ? linhas[i].tempo.getTime() : null;
    if (t1 !== null && t2 !== null && t2 > t1) {
      diffs.push((t2 - t1) / 60000);
    }
  }

  if (!diffs.length) return 1;
  diffs.sort(function(a, b) { return a - b; });
  return diffs[Math.floor(diffs.length / 2)] || 1;
}

function extrairHoraAnalise_(tempo) {
  if (tempo instanceof Date && !isNaN(tempo.getTime())) return tempo.getHours();
  return 0;
}

function minSeguroAnalise_(atual, valor) {
  if (valor === null || valor === undefined) return atual;
  if (atual === null || atual === undefined) return valor;
  return valor < atual ? valor : atual;
}

function maxSeguroAnalise_(atual, valor) {
  if (valor === null || valor === undefined) return atual;
  if (atual === null || atual === undefined) return valor;
  return valor > atual ? valor : atual;
}

function parseDataTextoAnalise_(s) {
  s = String(s || '');
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
}