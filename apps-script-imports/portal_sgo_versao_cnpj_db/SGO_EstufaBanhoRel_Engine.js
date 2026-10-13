/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — ESTUFA+BANHO-MARIA
 * ARQUIVO: Engine.gs
 * DESCRIÇÃO:
 * Motor de análise térmica para estufa de incubação
 * (ABNT NBR 16328:2024, Anexo F), reaproveitado do motor de
 * Cadeia de Frio (Anexo G), que por sua vez adaptou o papel
 * do AnaliseCiclo.js do motor de Autoclave.
 *
 * Diferença de fundo em relação à Autoclave:
 * - não há F0/letalidade nem fases de vácuo/rampa/secagem;
 * - o critério é permanência dentro de uma faixa operacional
 *   (tMin/tMax) — tanto no estudo contínuo de 24h (distribuição
 *   em vazio/com carga) quanto nos eventos pontuais (abertura
 *   de porta, queda de energia, autonomia de caixa térmica);
 * - eventos pontuais (porta/energia) são marcados manualmente
 *   pelo técnico (mesmo papel do "override manual de janela"
 *   já usado no motor de Autoclave), porque são ações físicas
 *   que ele mesmo cronometra durante o ensaio.
 *
 * FUNÇÕES PÚBLICAS:
 * - ebAnalisarDistribuicao(...)   -> DISTRIBUICAO_VAZIO / DISTRIBUICAO_CARGA
 * - ebAnalisarEventoRuptura(...)  -> ABERTURA_PORTA / QUEDA_ENERGIA
 * - ebAnalisarAutonomia(...)      -> AUTONOMIA (caixa térmica)
 ****************************************************/

// ------------------------------------------------------------
// ESTUDO CONTÍNUO: DISTRIBUIÇÃO EM VAZIO / COM CARGA
// ------------------------------------------------------------
function EstufaBanhoRel_ebAnalisarDistribuicao(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }
  opcoes = opcoes || {};
  faixa = EstufaBanhoRel_ebNormalizarFaixa_(faixa);
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }
  const ativos = EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = EstufaBanhoRel_ebIndicesAtivos_(ativos);
  if (!ativosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  // Rampa de estabilização inicial (opcional): o técnico pode marcar o
  // horário em que o equipamento efetivamente entrou/estabilizou na faixa
  // operacional (ex.: ligado frio, levou 3h pra sair de temperatura
  // ambiente até 2-8°C). Leituras ANTES desse horário não entram no
  // julgamento de aprovação/reprovação nem nas estatísticas do laudo —
  // mas continuam no gráfico/dados brutos, marcadas como rampa. Sem esse
  // campo (padrão, comportamento idêntico ao de sempre), toda a série
  // conta normalmente. Nunca é aplicado sozinho — só quando confirmado
  // explicitamente (ver ebSugerirFimRampaEstabilizacao_ pra sugestão).
  const idxFimRampa = opcoes.fimRampaEstabilizacao ? EstufaBanhoRel_ebLocalizarIndicePorTempo_(dados, opcoes.fimRampaEstabilizacao, '>=', null) : 0;
  if (idxFimRampa === null || idxFimRampa >= dados.length - 1) throw new Error('Fim da estabilização fora dos dados ou sem período posterior suficiente para análise.');
  EstufaBanhoRel_ebValidarDadosSelecionados_(dados.slice(idxFimRampa), ativos, 'Distribuição térmica');
  const analise = {
    tipoEstudo: opcoes.tipoEstudo || 'DISTRIBUICAO_VAZIO',
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function (s) {
      return 'S' + (s + 1);
    }),
    sensoresDesabilitados: EstufaBanhoRel_ebIndicesInativos_(ativos).map(function (s) {
      return 'S' + (s + 1);
    }),
    quantidadeSensoresInstalados: nSensores,
    quantidadeSensoresUtilizados: ativosIdx.length,
    tempoInicio: dados[0].tempoStr || '',
    tempoFim: dados[dados.length - 1].tempoStr || '',
    tempoTotalMinutos: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[0], dados[dados.length - 1]),
    intervaloMedioMinutos: EstufaBanhoRel_ebRound_(EstufaBanhoRel_ebEstimarDeltaMinutos_(dados), 3),
    statsGlobal: null,
    statsPorSensor: [],
    piorSensor: null,
    primeiraRupturaGlobal: null,
    rampaEstabilizacao: null,
    aprovado: true,
    statusAprovacao: 'APROVADO',
    motivosReprovacao: [],
    alertasAnalise: [],
    observacoesAnalise: []
  };
  if (idxFimRampa > 0) {
    analise.rampaEstabilizacao = {
      fimRampaStr: dados[idxFimRampa].tempoStr,
      duracaoMinutos: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[0], dados[idxFimRampa]),
      temperaturaInicial: EstufaBanhoRel_ebParseNumero_(dados[0].temperaturas[ativosIdx[0]]),
      temperaturaAoEstabilizar: EstufaBanhoRel_ebParseNumero_(dados[idxFimRampa].temperaturas[ativosIdx[0]])
    };
  }

  // Estatística por sensor + varredura de ruptura de faixa (só no
  // período efetivamente avaliado, ou seja, a partir do fim da rampa)
  const acumuladorGlobal = {
    min: null,
    max: null,
    soma: 0,
    count: 0
  };
  const acumuladorSensor = ativosIdx.map(function (s) {
    return {
      sensor: 'S' + (s + 1),
      indice: s,
      min: null,
      max: null,
      soma: 0,
      count: 0
    };
  });
  let piorDesvio = -Infinity;
  let piorInfo = null;
  for (let i = idxFimRampa; i < dados.length; i++) {
    const row = dados[i];
    for (let k = 0; k < ativosIdx.length; k++) {
      const s = ativosIdx[k];
      const t = EstufaBanhoRel_ebParseNumero_(row.temperaturas[s]);
      if (t === null || !isFinite(t)) continue;
      const accS = acumuladorSensor[k];
      if (accS.min === null || t < accS.min) accS.min = t;
      if (accS.max === null || t > accS.max) accS.max = t;
      accS.soma += t;
      accS.count++;
      if (acumuladorGlobal.min === null || t < acumuladorGlobal.min) acumuladorGlobal.min = t;
      if (acumuladorGlobal.max === null || t > acumuladorGlobal.max) acumuladorGlobal.max = t;
      acumuladorGlobal.soma += t;
      acumuladorGlobal.count++;
      const desvio = EstufaBanhoRel_ebDesvioDaFaixa_(t, faixa);
      if (desvio > 0 && desvio > piorDesvio) {
        piorDesvio = desvio;
        piorInfo = {
          sensor: 'S' + (s + 1),
          indice: s,
          valor: EstufaBanhoRel_ebRound_(t, 2),
          tempoStr: row.tempoStr,
          desvio: EstufaBanhoRel_ebRound_(desvio, 2)
        };
      }
      if (desvio > 0 && !analise.primeiraRupturaGlobal) {
        analise.primeiraRupturaGlobal = {
          sensor: 'S' + (s + 1),
          valor: EstufaBanhoRel_ebRound_(t, 2),
          tempoStr: row.tempoStr,
          idx: i
        };
      }
    }
  }
  analise.statsGlobal = {
    min: acumuladorGlobal.min !== null ? EstufaBanhoRel_ebRound_(acumuladorGlobal.min, 2) : null,
    max: acumuladorGlobal.max !== null ? EstufaBanhoRel_ebRound_(acumuladorGlobal.max, 2) : null,
    media: acumuladorGlobal.count ? EstufaBanhoRel_ebRound_(acumuladorGlobal.soma / acumuladorGlobal.count, 2) : null
  };
  analise.statsGlobal.indicacaoMaxMin = EstufaBanhoRel_ebIndicacoes_(analise.statsGlobal);
  analise.statsPorSensor = acumuladorSensor.map(function (accS) {
    const stat = {
      sensor: accS.sensor,
      indice: accS.indice,
      min: accS.min !== null ? EstufaBanhoRel_ebRound_(accS.min, 2) : null,
      max: accS.max !== null ? EstufaBanhoRel_ebRound_(accS.max, 2) : null,
      media: accS.count ? EstufaBanhoRel_ebRound_(accS.soma / accS.count, 2) : null
    };
    stat.indicacaoMaxMin = EstufaBanhoRel_ebIndicacoes_(stat);
    return stat;
  });
  analise.piorSensor = piorInfo;

  // Aprovação: nenhuma leitura ativa pode romper a faixa além da tolerância;
  // rupturas dentro da tolerância geram alerta, não reprovação.
  if (piorInfo) {
    if (piorDesvio > faixa.tolerancia) {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push('Ruptura de faixa operacional: sensor ' + piorInfo.sensor + ' registrou ' + piorInfo.valor + ' °C em ' + piorInfo.tempoStr + ', fora da faixa ' + faixa.tMin + ' a ' + faixa.tMax + ' °C, além da tolerância de ' + faixa.tolerancia + ' °C permitida.');
    } else {
      analise.statusAprovacao = 'APROVADO_COM_ALERTA';
      analise.alertasAnalise.push('Excursão dentro da tolerância operacional: sensor ' + piorInfo.sensor + ' registrou ' + piorInfo.valor + ' °C em ' + piorInfo.tempoStr + ', fora da faixa nominal, mas dentro da tolerância de ' + faixa.tolerancia + ' °C.');
    }
  } else {
    analise.observacoesAnalise.push('Todos os ' + ativosIdx.length + ' sensor(es) ativo(s) permaneceram dentro da faixa operacional (' + faixa.tMin + ' a ' + faixa.tMax + ' °C) durante todo o período ' + (analise.rampaEstabilizacao ? 'avaliado' : 'monitorado') + '. Leitura global: mínima ' + analise.statsGlobal.min + ' °C, média ' + analise.statsGlobal.media + ' °C, máxima ' + analise.statsGlobal.max + ' °C — amplitude (máx-mín) de ' + analise.statsGlobal.indicacaoMaxMin.maxMin + ' °C.');
  }
  if (analise.rampaEstabilizacao) {
    analise.observacoesAnalise.push('Período de estabilização inicial identificado: o equipamento levou ' + EstufaBanhoRel_ebRound_(analise.rampaEstabilizacao.duracaoMinutos / 60, 2) + 'h (de ' + analise.tempoInicio + ' até ' + analise.rampaEstabilizacao.fimRampaStr + ') partindo de ' + analise.rampaEstabilizacao.temperaturaInicial + ' °C até estabilizar dentro da faixa operacional. Esse intervalo foi registrado nos dados brutos e no gráfico, ' + 'mas excluído do julgamento de aprovação/reprovação e das estatísticas acima, por representar o acionamento ' + 'do equipamento e não seu regime operacional estável.');
  }
  const piorAmplitudeSensor = acumuladorSensor.reduce(function (pior, s) {
    if (s.min === null || s.max === null) return pior;
    const amp = EstufaBanhoRel_ebRound_(s.max - s.min, 2);
    return !pior || amp > pior.amp ? {
      sensor: s.sensor,
      amp: amp
    } : pior;
  }, null);
  if (piorAmplitudeSensor) {
    analise.observacoesAnalise.push('O sensor com maior amplitude térmica ao longo do ensaio foi ' + piorAmplitudeSensor.sensor + ', com variação de ' + piorAmplitudeSensor.amp + ' °C entre a leitura mínima e máxima registradas.');
  }
  const tempoEfetivoMinutos = analise.rampaEstabilizacao ? EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[idxFimRampa], dados[dados.length - 1]) : analise.tempoTotalMinutos;
  analise.tempoEfetivoAvaliadoMinutos = EstufaBanhoRel_ebRound_(tempoEfetivoMinutos, 2);
  if (!opcoes.duracaoLivre && tempoEfetivoMinutos < 24 * 60) {
    analise.alertasAnalise.push('Duração ' + (analise.rampaEstabilizacao ? 'efetivamente avaliada (após a rampa de estabilização)' : 'total monitorada') + ' (' + EstufaBanhoRel_ebRound_(tempoEfetivoMinutos / 60, 1) + 'h) abaixo das 24h contínuas recomendadas pela norma para este estudo.');
  }

  // Conformidade por posição/sensor: o veredito global (aprovado/reprovado)
  // não diferencia "todo o equipamento fora de faixa" de "só uma posição
  // específica fora de faixa" — o equipamento pode ter uma posição
  // conforme e outra (perto de uma fonte de calor ou parede externa, por
  // ex.) sistematicamente fora,
  // e isso é uma informação prática valiosa mesmo quando o veredito global
  // é REPROVADO. Calculado só no trecho pós-rampa (mesmo trecho usado no
  // julgamento acima), nunca decide o veredito global sozinho.
  analise.conformidadePorSensor = EstufaBanhoRel_ebAvaliarConformidadePorSensor_(dados.slice(idxFimRampa), faixa, ativosIdx, analise.intervaloMedioMinutos);
  if (analise.statusAprovacao === 'APROVADO' && analise.alertasAnalise.length) analise.statusAprovacao = 'APROVADO_COM_ALERTA';
  return analise;
}

/**
 * Caracteriza, sensor a sensor, o quanto cada posição monitorada ficou
 * fora da faixa operacional (direção, magnitude, duração, se terminou
 * fora) — usado para a seção "conformidade por posição" do laudo, que
 * complementa (sem substituir) o veredito global de aprovação.
 */
function EstufaBanhoRel_ebAvaliarConformidadePorSensor_(dados, faixa, ativosIdx, intervaloMedioMinutos) {
  if (!dados || !dados.length || !ativosIdx || !ativosIdx.length) return [];
  const intervalo = intervaloMedioMinutos && intervaloMedioMinutos > 0 ? intervaloMedioMinutos : 1;
  return ativosIdx.map(function (s) {
    let min = null,
      max = null,
      soma = 0,
      count = 0,
      countFora = 0;
    let piorDesvioAbaixo = 0,
      piorDesvioAcima = 0;
    let primeiraForaStr = null;
    let terminouForaFaixa = false;
    let minutosFora = 0;
    dados.forEach(function (row, idx) {
      const t = EstufaBanhoRel_ebParseNumero_(row.temperaturas[s]);
      if (t === null || !isFinite(t)) return;
      if (min === null || t < min) min = t;
      if (max === null || t > max) max = t;
      soma += t;
      count++;
      let foraAgora = false;
      if (t < faixa.tMin) {
        const d = faixa.tMin - t;
        if (d > piorDesvioAbaixo) piorDesvioAbaixo = d;
        foraAgora = true;
      } else if (t > faixa.tMax) {
        const d = t - faixa.tMax;
        if (d > piorDesvioAcima) piorDesvioAcima = d;
        foraAgora = true;
      }
      if (foraAgora) {
        countFora++;
        if (idx < dados.length - 1) minutosFora += EstufaBanhoRel_ebCalcularDiferencaTempoMin_(row, dados[idx + 1]);
        if (!primeiraForaStr) primeiraForaStr = row.tempoStr;
      }
      terminouForaFaixa = foraAgora;
    });
    const piorDesvio = Math.max(piorDesvioAbaixo, piorDesvioAcima);
    let statusSensor;
    if (!count) statusSensor = 'SEM_DADOS';else if (piorDesvio === 0) statusSensor = 'CONFORME';else if (piorDesvio <= faixa.tolerancia) statusSensor = 'CONFORME_COM_RESSALVA';else statusSensor = 'NAO_CONFORME';
    return {
      sensor: 'S' + (s + 1),
      indice: s,
      min: min !== null ? EstufaBanhoRel_ebRound_(min, 2) : null,
      max: max !== null ? EstufaBanhoRel_ebRound_(max, 2) : null,
      media: count ? EstufaBanhoRel_ebRound_(soma / count, 2) : null,
      piorDesvioAbaixo: EstufaBanhoRel_ebRound_(piorDesvioAbaixo, 2),
      piorDesvioAcima: EstufaBanhoRel_ebRound_(piorDesvioAcima, 2),
      minutosForaFaixa: EstufaBanhoRel_ebRound_(minutosFora, 1),
      percentualForaFaixa: count ? EstufaBanhoRel_ebRound_(countFora / count * 100, 1) : 0,
      primeiraLeituraForaFaixaStr: primeiraForaStr,
      terminouForaFaixa: terminouForaFaixa,
      statusSensor: statusSensor
    };
  });
}

/**
 * Sugere (sem aplicar) o fim de uma possível rampa de estabilização
 * inicial: procura a ÚLTIMA leitura fora da faixa (além da tolerância)
 * e, só se ela cair dentro da janela de guarda (por padrão 6h a partir
 * do início do arquivo), sugere excluir até ali. Se a última ruptura
 * ocorrer fora dessa janela — ou seja, se o equipamento não voltou a
 * estabilizar logo no começo —, não sugere nada: pode ser uma falha
 * real no meio/fim do ensaio, e essa função nunca decide isso sozinha.
 * Cabe ao técnico/revisor confirmar ou ajustar antes de gerar o laudo.
 */
function EstufaBanhoRel_ebSugerirFimRampaEstabilizacao_(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || dados.length < 2) return null;
  opcoes = opcoes || {};
  faixa = EstufaBanhoRel_ebNormalizarFaixa_(faixa);
  const limiteMinutos = EstufaBanhoRel_ebClampInt_(opcoes.limiteRampaMinutos, 10, 24 * 60, 360);
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = EstufaBanhoRel_ebIndicesAtivos_(ativos);
  if (!ativosIdx.length) return null;
  let idxUltimaRuptura = -1;
  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];
    for (let k = 0; k < ativosIdx.length; k++) {
      const t = EstufaBanhoRel_ebParseNumero_(row.temperaturas[ativosIdx[k]]);
      if (t === null || !isFinite(t)) continue;
      if (EstufaBanhoRel_ebDesvioDaFaixa_(t, faixa) > faixa.tolerancia) {
        idxUltimaRuptura = i;
        break;
      }
    }
  }
  if (idxUltimaRuptura === -1) return null; // nunca saiu da faixa: sem rampa
  if (idxUltimaRuptura >= dados.length - 1) return null; // nunca voltou a estabilizar: não é rampa, é falha

  const idxFim = idxUltimaRuptura + 1;
  const duracaoMinutos = EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[0], dados[idxFim]);
  if (duracaoMinutos <= 0 || duracaoMinutos > limiteMinutos) return null; // fora da janela de guarda

  return {
    fimRampaStr: dados[idxFim].tempoStr,
    duracaoMinutos: EstufaBanhoRel_ebRound_(duracaoMinutos, 2),
    temperaturaInicial: EstufaBanhoRel_ebParseNumero_(dados[0].temperaturas[ativosIdx[0]]),
    temperaturaAoEstabilizar: EstufaBanhoRel_ebParseNumero_(dados[idxFim].temperaturas[ativosIdx[0]])
  };
}

// ------------------------------------------------------------
// EVENTO PONTUAL: ABERTURA DE PORTA / QUEDA DE ENERGIA
// ------------------------------------------------------------
// janelaEvento: { inicioEvento: 'dd/MM/yyyy HH:mm:ss', fimEvento: '...' (opcional) }
// - ABERTURA_PORTA: inicioEvento = porta abriu, fimEvento = porta fechou
// - QUEDA_ENERGIA: inicioEvento = energia cortada, fimEvento = energia restaurada (opcional)
function EstufaBanhoRel_ebAnalisarEventoRuptura(dados, faixa, sensoresAtivos, janelaEvento, tipoEstudo, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }
  opcoes = opcoes || {};
  faixa = EstufaBanhoRel_ebNormalizarFaixa_(faixa);
  janelaEvento = janelaEvento || {};
  tipoEstudo = String(tipoEstudo || 'ABERTURA_PORTA').toUpperCase();
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = EstufaBanhoRel_ebIndicesAtivos_(ativos);
  if (!ativosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }
  EstufaBanhoRel_ebValidarDadosSelecionados_(dados, ativos, 'Evento térmico');
  const idxInicioEvento = janelaEvento.inicioEvento ? EstufaBanhoRel_ebLocalizarIndicePorTempo_(dados, janelaEvento.inicioEvento, '>=', null) : 0;
  if (idxInicioEvento === null) {
    throw new Error('Não foi possível localizar o horário de início do evento (' + janelaEvento.inicioEvento + ') nos dados importados.');
  }
  const idxFimEvento = janelaEvento.fimEvento ? EstufaBanhoRel_ebLocalizarIndicePorTempo_(dados, janelaEvento.fimEvento, '<=', null) : null;
  if (janelaEvento.fimEvento && (idxFimEvento === null || idxFimEvento < idxInicioEvento)) throw new Error('Fim do evento fora do período importado ou anterior ao início.');
  const analise = {
    tipoEstudo: tipoEstudo,
    tipoAbertura: opcoes.tipoAbertura || null,
    // 'TOTAL' | 'SEMI_ABERTA' — só metadado, não muda o cálculo
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function (s) {
      return 'S' + (s + 1);
    }),
    tempoInicioEvento: dados[idxInicioEvento].tempoStr || '',
    tempoFimEvento: idxFimEvento !== null && dados[idxFimEvento] ? dados[idxFimEvento].tempoStr : '',
    rompeu: false,
    primeiraRuptura: null,
    tempoAteRupturaMinutos: null,
    recuperouTotalmente: false,
    tempoAteRecuperacaoMinutos: null,
    tempoAlvoMinutos: EstufaBanhoRel_ebParseNumero_(opcoes.tempoAlvoMinutos),
    statusAprovacao: 'INFORMATIVO',
    motivosReprovacao: [],
    alertasAnalise: [],
    observacoesAnalise: []
  };
  const consecutivas = EstufaBanhoRel_ebObterParametrosRobustez_(opcoes);

  // Fase 1: procurar a primeira ruptura a partir do início do evento
  // (para queda de energia, vai até o fim dos dados; para porta, se
  // fimEvento foi informado, a busca de ruptura fica restrita à janela
  // de porta aberta, e a recuperação é buscada depois do fechamento).
  const idxLimiteBuscaRuptura = tipoEstudo === 'ABERTURA_PORTA' && idxFimEvento !== null ? idxFimEvento : dados.length - 1;
  const ruptura = EstufaBanhoRel_ebDetectarPrimeiraRuptura_(dados, idxInicioEvento, idxLimiteBuscaRuptura, ativosIdx, faixa, consecutivas);
  if (ruptura) {
    analise.rompeu = true;
    analise.primeiraRuptura = ruptura;
    analise.tempoAteRupturaMinutos = EstufaBanhoRel_ebRound_(ruptura.minutosDesdeInicio, 2);

    // Em Queda de Energia, a busca de ruptura não para no "Término do
    // evento" (idxFimEvento = horário em que a energia voltou) — ela
    // continua até o fim dos dados, porque o equipamento pode continuar
    // se desviando por inércia térmica mesmo depois da energia já ter
    // sido restabelecida. Sem este alerta, o laudo mostra "Término do
    // evento" com uma duração X e, logo abaixo, "Tempo até a ruptura"
    // maior que X — o que parece contraditório pra quem lê.
    if (tipoEstudo === 'QUEDA_ENERGIA' && idxFimEvento !== null && ruptura.idx > idxFimEvento) {
      analise.alertasAnalise.push(
        'A ruptura da faixa operacional (' + ruptura.tempoStr + ') ocorreu depois do término do evento (' +
        dados[idxFimEvento].tempoStr + ', horário em que a energia foi restabelecida). Isso é esperado: o ' +
        'equipamento continua se desviando por inércia térmica mesmo após o retorno da energia, até o sistema ' +
        'recuperar o atraso — por isso o "Tempo até a ruptura" (contado a partir do início do evento) pode ser ' +
        'maior que a duração declarada do evento em si.'
      );
    }
  } else {
    const janelaObservadaMin = EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[idxInicioEvento], dados[Math.min(idxLimiteBuscaRuptura, dados.length - 1)]);
    analise.observacoesAnalise.push('Nenhum dos ' + ativosIdx.length + ' sensor(es) ativo(s) ultrapassou a faixa operacional (' + faixa.tMin + ' a ' + faixa.tMax + ' °C) durante os ' + EstufaBanhoRel_ebRound_(janelaObservadaMin, 1) + ' minutos de dados disponíveis a partir do início do evento — o equipamento sustentou a temperatura por inércia térmica/isolamento nesse intervalo.');
  }

  // Fase 2: recuperação — só faz sentido buscar se houve ruptura e/ou
  // se existe um ponto de "fechamento"/"restauração" a partir do qual
  // observar o retorno à faixa.
  const idxInicioBuscaRecuperacao = idxFimEvento !== null ? idxFimEvento : ruptura ? ruptura.idx : idxInicioEvento;
  if (analise.rompeu || idxFimEvento !== null) {
    const recuperacao = EstufaBanhoRel_ebDetectarRecuperacaoTotal_(dados, idxInicioBuscaRecuperacao, dados.length - 1, ativosIdx, faixa, consecutivas);
    if (recuperacao) {
      analise.recuperouTotalmente = true;
      analise.tempoAteRecuperacaoMinutos = EstufaBanhoRel_ebRound_(recuperacao.minutosDesdeInicio, 2);
    } else if (analise.rompeu) {
      analise.alertasAnalise.push('Os sensores não retornaram totalmente à faixa operacional dentro do período de dados disponível.');
    }
  }

  // Aprovação: só emite veredito se um tempo-alvo foi definido para o ensaio;
  // caso contrário, o estudo é só caracterização (tempo medido, sem aprovação/reprovação).
  if (analise.tempoAlvoMinutos !== null && isFinite(analise.tempoAlvoMinutos)) {
    const sustentouOTempoAlvo = !analise.rompeu || analise.tempoAteRupturaMinutos >= analise.tempoAlvoMinutos;
    const tempoObservado = EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[idxInicioEvento], dados[idxLimiteBuscaRuptura]);
    if (analise.tempoAlvoMinutos <= 0) throw new Error('Tempo-alvo do evento deve ser positivo.');
    if (!analise.rompeu && tempoObservado < analise.tempoAlvoMinutos) {
      analise.statusAprovacao = 'INFORMATIVO';
      analise.alertasAnalise.push('Período observado de ' + tempoObservado + ' min insuficiente para confirmar o tempo-alvo de ' + analise.tempoAlvoMinutos + ' min.');
    } else if (sustentouOTempoAlvo) {
      analise.statusAprovacao = 'APROVADO';
    } else {
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push('O equipamento rompeu a faixa operacional em ' + analise.tempoAteRupturaMinutos + ' min, antes do tempo-alvo definido para o ensaio (' + analise.tempoAlvoMinutos + ' min).');
    }
  }

  // Conformidade por posição/sensor durante o evento (ver mesma lógica e
  // justificativa em ebAnalisarDistribuicao) — a partir do início do
  // evento até o fim dos dados disponíveis.
  const dadosDesdeInicioEvento = dados.slice(idxInicioEvento);
  analise.conformidadePorSensor = EstufaBanhoRel_ebAvaliarConformidadePorSensor_(dadosDesdeInicioEvento, faixa, ativosIdx, EstufaBanhoRel_ebEstimarDeltaMinutos_(dados));

  // Guardado à parte pra a tabela "Comportamento dos sensores durante o
  // evento" (Planilha.js) usar a MESMA janela (a partir do início do
  // evento) que a tabela de conformidade acima — sem isso, as duas
  // tabelas mostravam Mín/Máx diferentes pro mesmo sensor na mesma
  // página, porque _dadosFatia (anexado pelo Main.js) inclui a margem de
  // contexto ANTES do evento (MARGEM_CONTEXTO_EVENTO_MINUTOS).
  analise._dadosDesdeInicioEvento = dadosDesdeInicioEvento;
  return analise;
}

// ------------------------------------------------------------
// AUTONOMIA (CAIXA TÉRMICA) — sem tempo-alvo, é o próprio objetivo do ensaio
// ------------------------------------------------------------
function EstufaBanhoRel_ebAnalisarAutonomia(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }
  opcoes = opcoes || {};
  faixa = EstufaBanhoRel_ebNormalizarFaixa_(faixa);
  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = EstufaBanhoRel_ebIndicesAtivos_(ativos);
  if (!ativosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }
  const consecutivas = EstufaBanhoRel_ebObterParametrosRobustez_(opcoes);
  EstufaBanhoRel_ebValidarDadosSelecionados_(dados, ativos, 'Autonomia');
  const ruptura = EstufaBanhoRel_ebDetectarPrimeiraRuptura_(dados, 0, dados.length - 1, ativosIdx, faixa, consecutivas);
  const analise = {
    tipoEstudo: 'AUTONOMIA',
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function (s) {
      return 'S' + (s + 1);
    }),
    tempoInicio: dados[0].tempoStr || '',
    tempoFim: dados[dados.length - 1].tempoStr || '',
    tempoTotalGravadoMinutos: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[0], dados[dados.length - 1]),
    rompeu: false,
    primeiraRuptura: null,
    autonomiaMinutos: null,
    statusAprovacao: 'CARACTERIZACAO',
    observacoesAnalise: []
  };
  if (ruptura) {
    analise.rompeu = true;
    analise.primeiraRuptura = ruptura;
    analise.autonomiaMinutos = EstufaBanhoRel_ebRound_(ruptura.minutosDesdeInicio, 2);
    analise.observacoesAnalise.push('Autonomia registrada: ' + EstufaBanhoRel_ebRound_(analise.autonomiaMinutos / 60, 2) + 'h (' + analise.autonomiaMinutos + ' min) até o sensor ' + ruptura.sensor + ' ultrapassar a faixa operacional.');
  } else {
    analise.autonomiaMinutos = analise.tempoTotalGravadoMinutos;
    analise.observacoesAnalise.push('Nenhuma ruptura observada durante todo o período gravado (' + EstufaBanhoRel_ebRound_(analise.tempoTotalGravadoMinutos / 60, 2) + 'h). A autonomia real pode ser maior que o período monitorado — considere estender a gravação.');
  }
  return analise;
}

// ------------------------------------------------------------
// PRIMITIVAS COMPARTILHADAS DE DETECÇÃO
// ------------------------------------------------------------

/**
 * Procura a primeira ruptura de faixa operacional (leitura fora de
 * tMin/tMax, confirmada por N leituras consecutivas para blindar contra
 * ruído) a partir de idxInicio até idxFim, entre os sensores ativos.
 */
function EstufaBanhoRel_ebDetectarPrimeiraRuptura_(dados, idxInicio, idxFim, ativosIdx, faixa, consecutivas) {
  let contador = 0;
  let idxCandidato = -1;
  let candidatoInfo = null;
  for (let i = Math.max(0, idxInicio); i <= Math.min(dados.length - 1, idxFim); i++) {
    const row = dados[i];
    const fora = EstufaBanhoRel_ebPiorLeituraForaDaFaixa_(row, ativosIdx, faixa);
    if (fora) {
      if (contador === 0) idxCandidato = i;
      contador++;
      if (contador === 1) candidatoInfo = fora;
      if (contador >= consecutivas.confirmarRuptura) {
        return {
          idx: idxCandidato,
          sensor: candidatoInfo.sensor,
          valor: candidatoInfo.valor,
          tempoStr: dados[idxCandidato].tempoStr,
          minutosDesdeInicio: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[Math.max(0, idxInicio)], dados[idxCandidato])
        };
      }
    } else {
      contador = 0;
      idxCandidato = -1;
      candidatoInfo = null;
    }
  }
  return null;
}

/**
 * Procura o ponto em que todos os sensores ativos voltam a ficar dentro
 * da faixa operacional de forma sustentada (N leituras consecutivas),
 * a partir de idxInicio até idxFim.
 */
function EstufaBanhoRel_ebDetectarRecuperacaoTotal_(dados, idxInicio, idxFim, ativosIdx, faixa, consecutivas) {
  let contador = 0;
  let idxCandidato = -1;
  for (let i = Math.max(0, idxInicio); i <= Math.min(dados.length - 1, idxFim); i++) {
    const row = dados[i];
    const fora = EstufaBanhoRel_ebPiorLeituraForaDaFaixa_(row, ativosIdx, faixa);
    if (!fora) {
      if (contador === 0) idxCandidato = i;
      contador++;
      if (contador >= consecutivas.confirmarRecuperacao) {
        return {
          idx: idxCandidato,
          tempoStr: dados[idxCandidato].tempoStr,
          minutosDesdeInicio: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dados[Math.max(0, idxInicio)], dados[idxCandidato])
        };
      }
    } else {
      contador = 0;
      idxCandidato = -1;
    }
  }
  return null;
}

/**
 * Retorna a pior leitura (maior desvio absoluto da faixa) entre os
 * sensores ativos de uma linha, ou null se todos estiverem dentro da faixa.
 */
function EstufaBanhoRel_ebPiorLeituraForaDaFaixa_(row, ativosIdx, faixa) {
  let pior = null;
  let piorDesvio = 0;
  for (let k = 0; k < ativosIdx.length; k++) {
    const s = ativosIdx[k];
    const t = EstufaBanhoRel_ebParseNumero_(row.temperaturas[s]);
    if (t === null || !isFinite(t)) continue;
    const desvio = EstufaBanhoRel_ebDesvioDaFaixa_(t, faixa);
    if (desvio > 0 && desvio > piorDesvio) {
      piorDesvio = desvio;
      pior = {
        sensor: 'S' + (s + 1),
        valor: EstufaBanhoRel_ebRound_(t, 2)
      };
    }
  }
  return pior;
}

/**
 * Desvio (em °C, sempre >= 0) de uma leitura em relação à faixa
 * operacional. Zero significa dentro da faixa.
 */
function EstufaBanhoRel_ebDesvioDaFaixa_(t, faixa) {
  if (t < faixa.tMin) return faixa.tMin - t;
  if (t > faixa.tMax) return t - faixa.tMax;
  return 0;
}
function EstufaBanhoRel_ebIndicacoes_(stat) {
  if (stat.min === null || stat.max === null || stat.media === null) {
    return {
      maxMin: null,
      mediaMin: null,
      maxMedia: null
    };
  }
  return {
    maxMin: EstufaBanhoRel_ebRound_(stat.max - stat.min, 2),
    mediaMin: EstufaBanhoRel_ebRound_(stat.media - stat.min, 2),
    maxMedia: EstufaBanhoRel_ebRound_(stat.max - stat.media, 2)
  };
}
function EstufaBanhoRel_ebObterParametrosRobustez_(opcoes) {
  opcoes = opcoes || {};
  return {
    confirmarRuptura: EstufaBanhoRel_ebClampInt_(opcoes.consecutivasRuptura, 1, 20, 2),
    confirmarRecuperacao: EstufaBanhoRel_ebClampInt_(opcoes.consecutivasRecuperacao, 1, 20, 3)
  };
}
function EstufaBanhoRel_ebNormalizarFaixa_(faixa) {
  faixa = faixa || {};
  const tMin = EstufaBanhoRel_ebParseNumero_(faixa.tMin);
  const tMax = EstufaBanhoRel_ebParseNumero_(faixa.tMax);
  if (tMin === null || tMax === null || !isFinite(tMin) || !isFinite(tMax)) {
    throw new Error('Faixa operacional inválida: informe tMin e tMax.');
  }
  if (tMin > tMax) throw new Error('Faixa operacional inválida: a mínima deve ser menor ou igual à máxima.');
  const tolerancia = EstufaBanhoRel_ebParseNumero_(faixa.tolerancia);
  if (tolerancia !== null && tolerancia < 0) throw new Error('Tolerância operacional não pode ser negativa.');
  return {
    tMin: tMin,
    tMax: tMax,
    tolerancia: tolerancia !== null ? tolerancia : 0.5
  };
}
function EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({
      length: nSensores
    }, function () {
      return true;
    });
  }
  const out = [];
  for (let i = 0; i < nSensores; i++) {
    out.push(typeof sensoresAtivos[i] === 'undefined' ? true : !!sensoresAtivos[i]);
  }
  return out;
}
function EstufaBanhoRel_ebIndicesAtivos_(ativos) {
  const out = [];
  for (let i = 0; i < ativos.length; i++) if (ativos[i]) out.push(i);
  return out;
}
function EstufaBanhoRel_ebIndicesInativos_(ativos) {
  const out = [];
  for (let i = 0; i < ativos.length; i++) if (!ativos[i]) out.push(i);
  return out;
}

// ------------------------------------------------------------
// TEMPO
// ------------------------------------------------------------

function EstufaBanhoRel_ebCalcularDiferencaTempoMin_(rowInicio, rowFim) {
  if (!rowInicio || !rowFim) return 0;
  const d1 = rowInicio.tempoDate instanceof Date ? rowInicio.tempoDate : EstufaBanhoRel_ebParseTempoSeguro_(rowInicio.tempoStr);
  const d2 = rowFim.tempoDate instanceof Date ? rowFim.tempoDate : EstufaBanhoRel_ebParseTempoSeguro_(rowFim.tempoStr);
  if (!(d1 instanceof Date) || isNaN(d1.getTime()) || !(d2 instanceof Date) || isNaN(d2.getTime())) return 0;
  const diffMs = d2.getTime() - d1.getTime();
  return diffMs > 0 ? EstufaBanhoRel_ebRound_(diffMs / 60000, 2) : 0;
}
function EstufaBanhoRel_ebEstimarDeltaMinutos_(dados) {
  if (!dados || dados.length < 2) return 1;
  const deltas = [];
  for (let i = 1; i < dados.length; i++) {
    const a = dados[i - 1].tempoDate;
    const b = dados[i].tempoDate;
    if (a instanceof Date && !isNaN(a.getTime()) && b instanceof Date && !isNaN(b.getTime())) {
      const diffMin = (b.getTime() - a.getTime()) / 60000;
      if (diffMin > 0 && diffMin < 120) deltas.push(diffMin);
    }
  }
  if (!deltas.length) return 1;
  deltas.sort(function (x, y) {
    return x - y;
  });
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
}

/**
 * Localiza o índice mais próximo de um horário informado manualmente
 * pelo técnico (ex.: horário em que a porta foi aberta).
 * comparador '>=' -> primeiro índice com tempo >= alvo
 * comparador '<=' -> último índice com tempo <= alvo
 */
function EstufaBanhoRel_ebLocalizarIndicePorTempo_(dados, alvo, comparador, fallback) {
  const alvoMs = EstufaBanhoRel_ebConverterTempoParaMs_(alvo);
  if (!isFinite(alvoMs)) return fallback === undefined ? null : fallback;
  if (!dados || !dados.length) return fallback === undefined ? null : fallback;
  const primeiroMs = EstufaBanhoRel_ebConverterTempoParaMs_(dados[0].tempoDate || dados[0].tempoStr);
  const ultimoMs = EstufaBanhoRel_ebConverterTempoParaMs_(dados[dados.length - 1].tempoDate || dados[dados.length - 1].tempoStr);
  if (alvoMs < primeiroMs || alvoMs > ultimoMs) return fallback === undefined ? null : fallback;
  if (comparador === '>=') {
    for (let i = 0; i < dados.length; i++) {
      const ms = EstufaBanhoRel_ebConverterTempoParaMs_(dados[i].tempoDate || dados[i].tempoStr);
      if (isFinite(ms) && ms >= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }
  if (comparador === '<=') {
    for (let i = dados.length - 1; i >= 0; i--) {
      const ms = EstufaBanhoRel_ebConverterTempoParaMs_(dados[i].tempoDate || dados[i].tempoStr);
      if (isFinite(ms) && ms <= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }
  return fallback === undefined ? null : fallback;
}
function EstufaBanhoRel_ebConverterTempoParaMs_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getTime();
  const d = EstufaBanhoRel_ebParseTempoSeguro_(valor);
  return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : NaN;
}

/**
 * Recorta um dataset (arquivo único de datalogger, cobrindo vários
 * ensaios) para a janela [inicioMs, fimMs] de um ensaio específico —
 * usado quando o técnico marca múltiplos estudos (distribuição 24h,
 * abertura de porta, queda de energia) dentro do mesmo arquivo.
 */
function EstufaBanhoRel_ebFatiarDadosPorJanela_(dados, inicioMs, fimMs) {
  if (!Array.isArray(dados) || !dados.length) return [];
  if (!isFinite(inicioMs) || !isFinite(fimMs)) return [];
  return dados.filter(function (row) {
    const ms = EstufaBanhoRel_ebConverterTempoParaMs_(row.tempoDate || row.tempoStr);
    return isFinite(ms) && ms >= inicioMs && ms <= fimMs;
  });
}
function EstufaBanhoRel_ebParseTempoSeguro_(valor) {
  try { return EstufaBanhoRel_parseDataHoraRobusta_(valor, 'BR'); } catch(e) { return null; }
}

function EstufaBanhoRel_ebParseNumero_(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '' || typeof valor === 'boolean') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : null;
}
function EstufaBanhoRel_ebRound_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round((Number(n) || 0) * p) / p;
}
function EstufaBanhoRel_ebClampInt_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

// ------------------------------------------------------------
// ANEXO E (ESTERILIZAÇÃO/DESPIROGENIZAÇÃO) — 3 REPETIÇÕES + LETALIDADE
//
// Diferente do F0 da Autoclave, aqui a "exposição" não é autodetectada
// por limiar de temperatura — é a janela inteira que o técnico marcou
// manualmente pra cada repetição (mesmo mecanismo de janela já usado
// em todos os outros estudos deste motor). Isso evita reimplementar a
// máquina de estados de histerese/consecutivas só pra um caso que já
// tem uma forma mais simples de resolver (ver seção 3 do plano).
// ------------------------------------------------------------

/**
 * Distribuição em vazio do Anexo E: MESMO critério de faixa usado em
 * DISTRIBUICAO_VAZIO comum (sem letalidade), só que repetido 3x — a
 * norma exige 3 rodadas independentes, e o laudo consolida as 3 num
 * único veredito (reprovar qualquer uma reprova o conjunto).
 */
function EstufaBanhoRel_ebAnalisarDistribuicaoVazioE_(repeticoesDados, faixa, sensoresAtivos, opcoes) {
  opcoes = opcoes || {};
  if (!Array.isArray(repeticoesDados) || !repeticoesDados.length) {
    throw new Error('Nenhuma repetição foi informada para a distribuição em vazio do Anexo E.');
  }
  const repeticoes = repeticoesDados.map(function (dadosRep, idx) {
    if (!dadosRep || !dadosRep.length) {
      throw new Error('Repetição ' + (idx + 1) + ' não tem dados na janela informada.');
    }
    return EstufaBanhoRel_ebAnalisarDistribuicao(dadosRep, faixa, sensoresAtivos, {
      tipoEstudo: 'DISTRIBUICAO_VAZIO_E',
      duracaoLivre: true,
      fimRampaEstabilizacao: (opcoes.fimRampaEstabilizacaoPorRepeticao || [])[idx] || ''
    });
  });
  return EstufaBanhoRel_ebConsolidarRepeticoesE_('DISTRIBUICAO_VAZIO_E', repeticoes, faixa);
}

/**
 * Penetração com carga do Anexo E: além do critério de faixa (mesma
 * estatística de temperatura das demais análises, informativa), calcula
 * a letalidade (FH para esterilização, FD para despirogenização) por
 * sensor, acumulando 10^((T - tBase)/z) * dtMin ao longo de TODA a
 * janela marcada (não há sub-fase de "exposição" autodetectada aqui,
 * ver nota no topo desta seção). O pior sensor (menor valor acumulado)
 * decide a aprovação térmica.
 *
 * O resultado do indicador biológico/endotoxina (ensaio de laboratório
 * terceirizado, não calculado por este motor) é o critério definitivo:
 * se vier reprovado, reprova a repetição mesmo que a letalidade
 * calculada tenha atingido o mínimo — é o padrão real de validação de
 * esterilização, onde o desafio biológico/químico é a prova final, e o
 * cálculo térmico é evidência de apoio.
 */
function EstufaBanhoRel_ebAnalisarPenetracaoELetalidade_(repeticoesDados, faixa, sensoresAtivos, cfgLetalidade, opcoes) {
  opcoes = opcoes || {};
  faixa = EstufaBanhoRel_ebNormalizarFaixa_(faixa);
  if (!cfgLetalidade || EstufaBanhoRel_ebParseNumero_(cfgLetalidade.tBase) === null || !(EstufaBanhoRel_ebParseNumero_(cfgLetalidade.z) > 0)) {
    throw new Error('Configuração de letalidade (tBase/z) inválida ou não informada.');
  }
  if (!Array.isArray(repeticoesDados) || !repeticoesDados.length) {
    throw new Error('Nenhuma repetição foi informada para a penetração com carga do Anexo E.');
  }
  const valorMinimoExigido = EstufaBanhoRel_ebParseNumero_(opcoes.valorMinimoExigido) !== null ? EstufaBanhoRel_ebParseNumero_(opcoes.valorMinimoExigido) : cfgLetalidade.usaIndicadorBiologico ? cfgLetalidade.fhMinimoSugerido : cfgLetalidade.fdMinimoNormativo;
  const indicadoresPorRepeticao = opcoes.indicadorPorRepeticao || [];
  if (!(valorMinimoExigido > 0) || !isFinite(valorMinimoExigido)) throw new Error('Mínimo de letalidade deve ser positivo.');
  const registrosCicloPorRepeticao = opcoes.registroCicloPorRepeticao || [];
  const repeticoes = repeticoesDados.map(function (dadosRep, idx) {
    if (!dadosRep || !dadosRep.length) {
      throw new Error('Repetição ' + (idx + 1) + ' não tem dados na janela informada.');
    }
    const nSensores = Array.isArray(dadosRep[0].temperaturas) ? dadosRep[0].temperaturas.length : 0;
    if (!nSensores) throw new Error('Não foi possível identificar sensores válidos na repetição ' + (idx + 1) + '.');
    const ativos = EstufaBanhoRel_ebNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
    const ativosIdx = EstufaBanhoRel_ebIndicesAtivos_(ativos);
    if (!ativosIdx.length) throw new Error('Nenhum sensor ativo foi selecionado para a repetição ' + (idx + 1) + '.');
    EstufaBanhoRel_ebValidarDadosSelecionados_(dadosRep, ativos, 'Penetração repetição ' + (idx + 1));
    const letalidadeAcumulada = new Array(nSensores).fill(null);
    ativosIdx.forEach(function (s) {
      letalidadeAcumulada[s] = 0;
    });
    const acumuladorGlobal = {
      min: null,
      max: null,
      soma: 0,
      count: 0
    };
    dadosRep.forEach(function (row, rowIdx) {
      ativosIdx.forEach(function (s) {
        const t = EstufaBanhoRel_ebParseNumero_(row.temperaturas[s]);
        if (t === null || !isFinite(t)) return;
        // Integra entre leituras reais; a última leitura não cria um intervalo extra.
        if (rowIdx > 0) {
          const anterior = EstufaBanhoRel_ebParseNumero_(dadosRep[rowIdx - 1].temperaturas[s]);
          const dtMin = (EstufaBanhoRel_ebConverterTempoParaMs_(row.tempoDate || row.tempoStr) - EstufaBanhoRel_ebConverterTempoParaMs_(dadosRep[rowIdx - 1].tempoDate || dadosRep[rowIdx - 1].tempoStr)) / 60000;
          letalidadeAcumulada[s] += (Math.pow(10, (anterior - cfgLetalidade.tBase) / cfgLetalidade.z) + Math.pow(10, (t - cfgLetalidade.tBase) / cfgLetalidade.z)) * 0.5 * dtMin;
        }
        if (acumuladorGlobal.min === null || t < acumuladorGlobal.min) acumuladorGlobal.min = t;
        if (acumuladorGlobal.max === null || t > acumuladorGlobal.max) acumuladorGlobal.max = t;
        acumuladorGlobal.soma += t;
        acumuladorGlobal.count++;
      });
    });
    const letalidadePorSensor = letalidadeAcumulada.map(function (v, s) {
      return ativos[s] ? EstufaBanhoRel_ebRound_(v, 4) : null;
    });
    const letalidadeAtivos = letalidadePorSensor.filter(function (v) {
      return v !== null && isFinite(v);
    });
    const minLetalidade = letalidadeAtivos.length ? EstufaBanhoRel_ebRound_(Math.min.apply(null, letalidadeAtivos), 4) : 0;
    const maxLetalidade = letalidadeAtivos.length ? EstufaBanhoRel_ebRound_(Math.max.apply(null, letalidadeAtivos), 4) : 0;
    const mediaLetalidade = letalidadeAtivos.length ? EstufaBanhoRel_ebRound_(letalidadeAtivos.reduce(function (a, b) {
      return a + b;
    }, 0) / letalidadeAtivos.length, 4) : 0;
    const piorSensorIdx = letalidadePorSensor.indexOf(minLetalidade);
    const piorSensor = letalidadeAtivos.length && piorSensorIdx !== -1 ? {
      sensor: 'S' + (piorSensorIdx + 1),
      valor: minLetalidade
    } : null;
    const indicador = indicadoresPorRepeticao[idx] || null;
    const minLetalidadeBruta = Math.min.apply(null, ativosIdx.map(function(s){return letalidadeAcumulada[s];}));
    const motivosReprovacao = [];
    const alertasAnalise = [];
    let statusRepeticao = 'APROVADO';
    if (!letalidadeAtivos.length) {
      statusRepeticao = 'REPROVADO';
      motivosReprovacao.push('Não foi possível calcular ' + cfgLetalidade.valorLabel + ' válido para os sensores ativos.');
    } else if (minLetalidadeBruta < valorMinimoExigido - 1e-10) {
      statusRepeticao = 'REPROVADO';
      motivosReprovacao.push(cfgLetalidade.valorLabel + ' mínimo insuficiente: pior sensor (' + (piorSensor ? piorSensor.sensor : 'N/A') + ') acumulou ' + minLetalidade + ' min, abaixo do mínimo exigido de ' + EstufaBanhoRel_ebRound_(valorMinimoExigido, 2) + ' min.');
    }
    if (indicador && indicador.aprovado === false) {
      statusRepeticao = 'REPROVADO';
      motivosReprovacao.push('Resultado de laboratório (' + (indicador.tipo === 'ENDOTOXINA' ? 'ensaio de endotoxina' : 'indicador biológico') + ') reprovado — desafio biológico/químico é o critério definitivo, independente do cálculo térmico.');
    } else if (!indicador || !indicador.tipo || indicador.aprovado !== true) {
      alertasAnalise.push('Resultado de laboratório (indicador biológico/endotoxina) não informado para esta repetição.');
    }

    // ABNT NBR 16328:2024, Anexo B.3.f: registro impresso do ciclo do
    // próprio equipamento é exigido para estufas de despirogenização —
    // não é bloqueante aqui (upload continua opcional na tela), só vira
    // alerta no laudo se faltar, pra não passar despercebido.
    const registroCiclo = registrosCicloPorRepeticao[idx];
    if (cfgLetalidade.valorLabel === 'FD' && !registroCiclo) {
      alertasAnalise.push('Registro impresso do ciclo do equipamento não anexado para esta repetição — exigido pela ABNT NBR 16328:2024 (Anexo B.3.f) para despirogenização.');
    }
    if (statusRepeticao === 'APROVADO' && alertasAnalise.length) statusRepeticao = 'APROVADO_COM_ALERTA';
    return {
      tipoEstudo: 'PENETRACAO_CARGA_E',
      numeroRepeticao: idx + 1,
      valorLabel: cfgLetalidade.valorLabel,
      valorMinimoExigido: EstufaBanhoRel_ebRound_(valorMinimoExigido, 2),
      letalidadePorSensor: letalidadePorSensor,
      minLetalidade: minLetalidade,
      maxLetalidade: maxLetalidade,
      mediaLetalidade: mediaLetalidade,
      piorSensor: piorSensor,
      statsGlobal: {
        min: acumuladorGlobal.min !== null ? EstufaBanhoRel_ebRound_(acumuladorGlobal.min, 2) : null,
        max: acumuladorGlobal.max !== null ? EstufaBanhoRel_ebRound_(acumuladorGlobal.max, 2) : null,
        media: acumuladorGlobal.count ? EstufaBanhoRel_ebRound_(acumuladorGlobal.soma / acumuladorGlobal.count, 2) : null
      },
      tempoInicio: dadosRep[0].tempoStr || '',
      tempoFim: dadosRep[dadosRep.length - 1].tempoStr || '',
      tempoTotalMinutos: EstufaBanhoRel_ebCalcularDiferencaTempoMin_(dadosRep[0], dadosRep[dadosRep.length - 1]),
      indicadorResultado: indicador,
      registroCicloFileId: registroCiclo || '',
      statusAprovacao: statusRepeticao,
      motivosReprovacao: motivosReprovacao,
      alertasAnalise: alertasAnalise
    };
  });
  return EstufaBanhoRel_ebConsolidarRepeticoesE_('PENETRACAO_CARGA_E', repeticoes, faixa);
}

/**
 * Consolida N repetições (Anexo E) num único veredito: qualquer
 * repetição reprovada reprova o conjunto; sem reprovação mas com algum
 * alerta -> APROVADO_COM_ALERTA; senão APROVADO. Mesmo espírito do
 * ebConsolidarStatus_ (Planilha.js) que já agrega múltiplos estudos no
 * mesmo laudo, só que aqui é dentro de UM único estudo repetido.
 */
function EstufaBanhoRel_ebConsolidarRepeticoesE_(tipoEstudo, repeticoes, faixa) {
  const reprovadas = repeticoes.filter(function (r) {
    return r.statusAprovacao === 'REPROVADO';
  });
  const comAlerta = repeticoes.filter(function (r) {
    return r.statusAprovacao === 'APROVADO_COM_ALERTA' || (r.alertasAnalise || []).length;
  });
  const statusAprovacao = reprovadas.length ? 'REPROVADO' : comAlerta.length ? 'APROVADO_COM_ALERTA' : 'APROVADO';
  const motivosReprovacao = [];
  const alertasAnalise = [];
  repeticoes.forEach(function (r, idx) {
    (r.motivosReprovacao || []).forEach(function (m) {
      motivosReprovacao.push('Repetição ' + (idx + 1) + ': ' + m);
    });
    (r.alertasAnalise || []).forEach(function (m) {
      alertasAnalise.push('Repetição ' + (idx + 1) + ': ' + m);
    });
  });
  return {
    tipoEstudo: tipoEstudo,
    faixa: faixa,
    quantidadeRepeticoes: repeticoes.length,
    repeticoes: repeticoes,
    tempoInicio: repeticoes[0] ? repeticoes[0].tempoInicio : '',
    tempoFim: repeticoes.length ? repeticoes[repeticoes.length - 1].tempoFim : '',
    statusAprovacao: statusAprovacao,
    aprovado: statusAprovacao !== 'REPROVADO',
    motivosReprovacao: motivosReprovacao,
    alertasAnalise: alertasAnalise,
    observacoesAnalise: []
  };
}
