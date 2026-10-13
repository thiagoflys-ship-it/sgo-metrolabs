/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — CADEIA DE FRIO
 * ARQUIVO: Engine.gs
 * DESCRIÇÃO:
 * Motor de análise térmica para equipamentos de cadeia de
 * frio (ABNT NBR 16328:2023, Anexo G), substituindo o papel
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
 * - CadeiaFrioRel_cfAnalisarDistribuicao(...)   -> DISTRIBUICAO_VAZIO / DISTRIBUICAO_CARGA
 * - CadeiaFrioRel_cfAnalisarEventoRuptura(...)  -> ABERTURA_PORTA / QUEDA_ENERGIA
 * - CadeiaFrioRel_cfAnalisarAutonomia(...)      -> AUTONOMIA (caixa térmica)
 ****************************************************/

// ------------------------------------------------------------
// ESTUDO CONTÍNUO: DISTRIBUIÇÃO EM VAZIO / COM CARGA
// ------------------------------------------------------------
function CadeiaFrioRel_cfAnalisarDistribuicao(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  opcoes = opcoes || {};
  faixa = CadeiaFrioRel_cfNormalizarFaixa_(faixa);

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }

  const ativos = CadeiaFrioRel_cfNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = CadeiaFrioRel_cfIndicesAtivos_(ativos);

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
  // explicitamente (ver CadeiaFrioRel_cfSugerirFimRampaEstabilizacao_ pra sugestão).
  const idxFimRampa = opcoes.fimRampaEstabilizacao
    ? CadeiaFrioRel_cfLocalizarIndicePorTempo_(dados, opcoes.fimRampaEstabilizacao, '>=', 0)
    : 0;

  const analise = {
    tipoEstudo: opcoes.tipoEstudo || 'DISTRIBUICAO_VAZIO',
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function(s) { return 'S' + (s + 1); }),
    sensoresDesabilitados: CadeiaFrioRel_cfIndicesInativos_(ativos).map(function(s) { return 'S' + (s + 1); }),
    quantidadeSensoresInstalados: nSensores,
    quantidadeSensoresUtilizados: ativosIdx.length,

    tempoInicio: dados[0].tempoStr || '',
    tempoFim: dados[dados.length - 1].tempoStr || '',
    tempoTotalMinutos: CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[0], dados[dados.length - 1]),
    intervaloMedioMinutos: CadeiaFrioRel_cfRound_(CadeiaFrioRel_cfEstimarDeltaMinutos_(dados), 3),

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
      duracaoMinutos: CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[0], dados[idxFimRampa]),
      temperaturaInicial: CadeiaFrioRel_cfParseNumero_(dados[0].temperaturas[ativosIdx[0]]),
      temperaturaAoEstabilizar: CadeiaFrioRel_cfParseNumero_(dados[idxFimRampa].temperaturas[ativosIdx[0]])
    };
  }

  // Estatística por sensor + varredura de ruptura de faixa (só no
  // período efetivamente avaliado, ou seja, a partir do fim da rampa)
  const acumuladorGlobal = { min: null, max: null, soma: 0, count: 0 };
  const acumuladorSensor = ativosIdx.map(function(s) {
    return { sensor: 'S' + (s + 1), indice: s, min: null, max: null, soma: 0, count: 0 };
  });

  let piorDesvio = -Infinity;
  let piorInfo = null;

  for (let i = idxFimRampa; i < dados.length; i++) {
    const row = dados[i];

    for (let k = 0; k < ativosIdx.length; k++) {
      const s = ativosIdx[k];
      const t = CadeiaFrioRel_cfParseNumero_(row.temperaturas[s]);
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

      const desvio = CadeiaFrioRel_cfDesvioDaFaixa_(t, faixa);
      if (desvio > 0 && desvio > piorDesvio) {
        piorDesvio = desvio;
        piorInfo = { sensor: 'S' + (s + 1), indice: s, valor: CadeiaFrioRel_cfRound_(t, 2), tempoStr: row.tempoStr, desvio: CadeiaFrioRel_cfRound_(desvio, 2) };
      }

      if (desvio > 0 && !analise.primeiraRupturaGlobal) {
        analise.primeiraRupturaGlobal = {
          sensor: 'S' + (s + 1),
          valor: CadeiaFrioRel_cfRound_(t, 2),
          tempoStr: row.tempoStr,
          idx: i
        };
      }
    }
  }

  analise.statsGlobal = {
    min: acumuladorGlobal.min !== null ? CadeiaFrioRel_cfRound_(acumuladorGlobal.min, 2) : null,
    max: acumuladorGlobal.max !== null ? CadeiaFrioRel_cfRound_(acumuladorGlobal.max, 2) : null,
    media: acumuladorGlobal.count ? CadeiaFrioRel_cfRound_(acumuladorGlobal.soma / acumuladorGlobal.count, 2) : null
  };
  analise.statsGlobal.indicacaoMaxMin = CadeiaFrioRel_cfIndicacoes_(analise.statsGlobal);

  analise.statsPorSensor = acumuladorSensor.map(function(accS) {
    const stat = {
      sensor: accS.sensor,
      indice: accS.indice,
      min: accS.min !== null ? CadeiaFrioRel_cfRound_(accS.min, 2) : null,
      max: accS.max !== null ? CadeiaFrioRel_cfRound_(accS.max, 2) : null,
      media: accS.count ? CadeiaFrioRel_cfRound_(accS.soma / accS.count, 2) : null
    };
    stat.indicacaoMaxMin = CadeiaFrioRel_cfIndicacoes_(stat);
    return stat;
  });

  analise.piorSensor = piorInfo;

  // Aprovação: nenhuma leitura ativa pode romper a faixa além da tolerância;
  // rupturas dentro da tolerância geram alerta, não reprovação.
  if (piorInfo) {
    if (piorDesvio > faixa.tolerancia) {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push(
        'Ruptura de faixa operacional: sensor ' + piorInfo.sensor + ' registrou ' + piorInfo.valor +
        ' °C em ' + piorInfo.tempoStr + ', fora da faixa ' + faixa.tMin + ' a ' + faixa.tMax +
        ' °C, além da tolerância de ' + faixa.tolerancia + ' °C permitida.'
      );
    } else {
      analise.statusAprovacao = 'APROVADO_COM_ALERTA';
      analise.alertasAnalise.push(
        'Excursão dentro da tolerância operacional: sensor ' + piorInfo.sensor + ' registrou ' + piorInfo.valor +
        ' °C em ' + piorInfo.tempoStr + ', fora da faixa nominal, mas dentro da tolerância de ' + faixa.tolerancia + ' °C.'
      );
    }
  } else {
    analise.observacoesAnalise.push(
      'Todos os ' + ativosIdx.length + ' sensor(es) ativo(s) permaneceram dentro da faixa operacional (' + faixa.tMin + ' a ' + faixa.tMax +
      ' °C) durante todo o período ' + (analise.rampaEstabilizacao ? 'avaliado' : 'monitorado') + '. Leitura global: mínima ' + analise.statsGlobal.min + ' °C, média ' + analise.statsGlobal.media +
      ' °C, máxima ' + analise.statsGlobal.max + ' °C — amplitude (máx-mín) de ' + analise.statsGlobal.indicacaoMaxMin.maxMin + ' °C.'
    );
  }

  if (analise.rampaEstabilizacao) {
    analise.observacoesAnalise.push(
      'Período de estabilização inicial identificado: o equipamento levou ' +
      CadeiaFrioRel_cfRound_(analise.rampaEstabilizacao.duracaoMinutos / 60, 2) + 'h (de ' + analise.tempoInicio + ' até ' +
      analise.rampaEstabilizacao.fimRampaStr + ') partindo de ' + analise.rampaEstabilizacao.temperaturaInicial +
      ' °C até estabilizar dentro da faixa operacional. Esse intervalo foi registrado nos dados brutos e no gráfico, ' +
      'mas excluído do julgamento de aprovação/reprovação e das estatísticas acima, por representar o acionamento ' +
      'do equipamento e não seu regime operacional estável.'
    );
  }

  const piorAmplitudeSensor = acumuladorSensor.reduce(function(pior, s) {
    if (s.min === null || s.max === null) return pior;
    const amp = CadeiaFrioRel_cfRound_(s.max - s.min, 2);
    return (!pior || amp > pior.amp) ? { sensor: s.sensor, amp: amp } : pior;
  }, null);

  if (piorAmplitudeSensor) {
    analise.observacoesAnalise.push(
      'O sensor com maior amplitude térmica ao longo do ensaio foi ' + piorAmplitudeSensor.sensor +
      ', com variação de ' + piorAmplitudeSensor.amp + ' °C entre a leitura mínima e máxima registradas.'
    );
  }

  const tempoEfetivoMinutos = analise.rampaEstabilizacao
    ? CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[idxFimRampa], dados[dados.length - 1])
    : analise.tempoTotalMinutos;
  analise.tempoEfetivoAvaliadoMinutos = CadeiaFrioRel_cfRound_(tempoEfetivoMinutos, 2);

  if (tempoEfetivoMinutos > 0 && tempoEfetivoMinutos < 23 * 60) {
    analise.alertasAnalise.push(
      'Duração ' + (analise.rampaEstabilizacao ? 'efetivamente avaliada (após a rampa de estabilização)' : 'total monitorada') +
      ' (' + CadeiaFrioRel_cfRound_(tempoEfetivoMinutos / 60, 1) + 'h) abaixo das 24h contínuas recomendadas pela norma para este estudo.'
    );
  }

  // Conformidade por posição/sensor: o veredito global (aprovado/reprovado)
  // não diferencia "todo o equipamento fora de faixa" de "só uma posição
  // específica fora de faixa" — um refrigerador pode ter uma prateleira
  // conforme e outra (perto do evaporador, por ex.) sistematicamente fora,
  // e isso é uma informação prática valiosa mesmo quando o veredito global
  // é REPROVADO. Calculado só no trecho pós-rampa (mesmo trecho usado no
  // julgamento acima), nunca decide o veredito global sozinho.
  analise.conformidadePorSensor = CadeiaFrioRel_cfAvaliarConformidadePorSensor_(
    dados.slice(idxFimRampa), faixa, ativosIdx, analise.intervaloMedioMinutos
  );

  return analise;
}

/**
 * Caracteriza, sensor a sensor, o quanto cada posição monitorada ficou
 * fora da faixa operacional (direção, magnitude, duração, se terminou
 * fora) — usado para a seção "conformidade por posição" do laudo, que
 * complementa (sem substituir) o veredito global de aprovação.
 */
function CadeiaFrioRel_cfAvaliarConformidadePorSensor_(dados, faixa, ativosIdx, intervaloMedioMinutos) {
  if (!dados || !dados.length || !ativosIdx || !ativosIdx.length) return [];
  const intervalo = intervaloMedioMinutos && intervaloMedioMinutos > 0 ? intervaloMedioMinutos : 1;

  return ativosIdx.map(function(s) {
    let min = null, max = null, soma = 0, count = 0, countFora = 0;
    let piorDesvioAbaixo = 0, piorDesvioAcima = 0;
    let primeiraForaStr = null;
    let terminouForaFaixa = false;

    dados.forEach(function(row) {
      const t = CadeiaFrioRel_cfParseNumero_(row.temperaturas[s]);
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
        if (!primeiraForaStr) primeiraForaStr = row.tempoStr;
      }
      terminouForaFaixa = foraAgora;
    });

    const piorDesvio = Math.max(piorDesvioAbaixo, piorDesvioAcima);
    let statusSensor;
    if (piorDesvio === 0) statusSensor = 'CONFORME';
    else if (piorDesvio <= faixa.tolerancia) statusSensor = 'CONFORME_COM_RESSALVA';
    else statusSensor = 'NAO_CONFORME';

    return {
      sensor: 'S' + (s + 1),
      indice: s,
      min: min !== null ? CadeiaFrioRel_cfRound_(min, 2) : null,
      max: max !== null ? CadeiaFrioRel_cfRound_(max, 2) : null,
      media: count ? CadeiaFrioRel_cfRound_(soma / count, 2) : null,
      piorDesvioAbaixo: CadeiaFrioRel_cfRound_(piorDesvioAbaixo, 2),
      piorDesvioAcima: CadeiaFrioRel_cfRound_(piorDesvioAcima, 2),
      minutosForaFaixa: CadeiaFrioRel_cfRound_(countFora * intervalo, 1),
      percentualForaFaixa: count ? CadeiaFrioRel_cfRound_((countFora / count) * 100, 1) : 0,
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
function CadeiaFrioRel_cfSugerirFimRampaEstabilizacao_(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || dados.length < 2) return null;

  opcoes = opcoes || {};
  faixa = CadeiaFrioRel_cfNormalizarFaixa_(faixa);
  const limiteMinutos = CadeiaFrioRel_cfClampInt_(opcoes.limiteRampaMinutos, 10, 24 * 60, 360);

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = CadeiaFrioRel_cfNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = CadeiaFrioRel_cfIndicesAtivos_(ativos);
  if (!ativosIdx.length) return null;

  let idxUltimaRuptura = -1;
  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];
    for (let k = 0; k < ativosIdx.length; k++) {
      const t = CadeiaFrioRel_cfParseNumero_(row.temperaturas[ativosIdx[k]]);
      if (t === null || !isFinite(t)) continue;
      if (CadeiaFrioRel_cfDesvioDaFaixa_(t, faixa) > faixa.tolerancia) { idxUltimaRuptura = i; break; }
    }
  }

  if (idxUltimaRuptura === -1) return null; // nunca saiu da faixa: sem rampa
  if (idxUltimaRuptura >= dados.length - 1) return null; // nunca voltou a estabilizar: não é rampa, é falha

  const idxFim = idxUltimaRuptura + 1;
  const duracaoMinutos = CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[0], dados[idxFim]);
  if (duracaoMinutos <= 0 || duracaoMinutos > limiteMinutos) return null; // fora da janela de guarda

  return {
    fimRampaStr: dados[idxFim].tempoStr,
    duracaoMinutos: CadeiaFrioRel_cfRound_(duracaoMinutos, 2),
    temperaturaInicial: CadeiaFrioRel_cfParseNumero_(dados[0].temperaturas[ativosIdx[0]]),
    temperaturaAoEstabilizar: CadeiaFrioRel_cfParseNumero_(dados[idxFim].temperaturas[ativosIdx[0]])
  };
}

// ------------------------------------------------------------
// EVENTO PONTUAL: ABERTURA DE PORTA / QUEDA DE ENERGIA
// ------------------------------------------------------------
// janelaEvento: { inicioEvento: 'dd/MM/yyyy HH:mm:ss', fimEvento: '...' (opcional) }
// - ABERTURA_PORTA: inicioEvento = porta abriu, fimEvento = porta fechou
// - QUEDA_ENERGIA: inicioEvento = energia cortada, fimEvento = energia restaurada (opcional)
function CadeiaFrioRel_cfAnalisarEventoRuptura(dados, faixa, sensoresAtivos, janelaEvento, tipoEstudo, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  opcoes = opcoes || {};
  faixa = CadeiaFrioRel_cfNormalizarFaixa_(faixa);
  janelaEvento = janelaEvento || {};
  tipoEstudo = String(tipoEstudo || 'ABERTURA_PORTA').toUpperCase();

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = CadeiaFrioRel_cfNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = CadeiaFrioRel_cfIndicesAtivos_(ativos);

  if (!ativosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  const idxInicioEvento = janelaEvento.inicioEvento
    ? CadeiaFrioRel_cfLocalizarIndicePorTempo_(dados, janelaEvento.inicioEvento, '>=', 0)
    : 0;

  if (idxInicioEvento === null) {
    throw new Error('Não foi possível localizar o horário de início do evento (' + janelaEvento.inicioEvento + ') nos dados importados.');
  }

  const idxFimEvento = janelaEvento.fimEvento
    ? CadeiaFrioRel_cfLocalizarIndicePorTempo_(dados, janelaEvento.fimEvento, '<=', null)
    : null;

  const analise = {
    tipoEstudo: tipoEstudo,
    tipoAbertura: opcoes.tipoAbertura || null, // 'TOTAL' | 'SEMI_ABERTA' — só metadado, não muda o cálculo
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function(s) { return 'S' + (s + 1); }),

    tempoInicioEvento: dados[idxInicioEvento].tempoStr || '',
    tempoFimEvento: (idxFimEvento !== null && dados[idxFimEvento]) ? dados[idxFimEvento].tempoStr : '',

    rompeu: false,
    primeiraRuptura: null,
    tempoAteRupturaMinutos: null,

    recuperouTotalmente: false,
    tempoAteRecuperacaoMinutos: null,

    tempoAlvoMinutos: CadeiaFrioRel_cfParseNumero_(opcoes.tempoAlvoMinutos),

    statusAprovacao: 'INFORMATIVO',
    motivosReprovacao: [],
    alertasAnalise: [],
    observacoesAnalise: []
  };

  const consecutivas = CadeiaFrioRel_cfObterParametrosRobustez_(opcoes);

  // Fase 1: procurar a primeira ruptura a partir do início do evento
  // (para queda de energia, vai até o fim dos dados; para porta, se
  // fimEvento foi informado, a busca de ruptura fica restrita à janela
  // de porta aberta, e a recuperação é buscada depois do fechamento).
  const idxLimiteBuscaRuptura = (tipoEstudo === 'ABERTURA_PORTA' && idxFimEvento !== null)
    ? idxFimEvento
    : (dados.length - 1);

  const ruptura = CadeiaFrioRel_cfDetectarPrimeiraRuptura_(dados, idxInicioEvento, idxLimiteBuscaRuptura, ativosIdx, faixa, consecutivas);

  if (ruptura) {
    analise.rompeu = true;
    analise.primeiraRuptura = ruptura;
    analise.tempoAteRupturaMinutos = CadeiaFrioRel_cfRound_(ruptura.minutosDesdeInicio, 2);

    // Em Queda de Energia, a busca de ruptura não para no "Término do
    // evento" (idxFimEvento = horário em que a energia voltou) — ela
    // continua até o fim dos dados, porque o equipamento pode continuar
    // esquentando por inércia térmica mesmo depois da energia já ter
    // sido restabelecida (o compressor demora pra recuperar o atraso).
    // Sem este alerta, o laudo mostra "Término do evento" com uma
    // duração X e, logo abaixo, "Tempo até a ruptura" maior que X — o
    // que parece contraditório pra quem lê, mesmo estando certo.
    if (tipoEstudo === 'QUEDA_ENERGIA' && idxFimEvento !== null && ruptura.idx > idxFimEvento) {
      analise.alertasAnalise.push(
        'A ruptura da faixa operacional (' + ruptura.tempoStr + ') ocorreu depois do término do evento (' +
        dados[idxFimEvento].tempoStr + ', horário em que a energia foi restabelecida). Isso é esperado: o ' +
        'equipamento continua aquecendo por inércia térmica mesmo após o retorno da energia, até o sistema de ' +
        'refrigeração recuperar o atraso — por isso o "Tempo até a ruptura" (contado a partir do início do evento) ' +
        'pode ser maior que a duração declarada do evento em si.'
      );
    }
  } else {
    const janelaObservadaMin = CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[idxInicioEvento], dados[Math.min(idxLimiteBuscaRuptura, dados.length - 1)]);
    analise.observacoesAnalise.push(
      'Nenhum dos ' + ativosIdx.length + ' sensor(es) ativo(s) ultrapassou a faixa operacional (' + faixa.tMin + ' a ' + faixa.tMax +
      ' °C) durante os ' + CadeiaFrioRel_cfRound_(janelaObservadaMin, 1) + ' minutos de dados disponíveis a partir do início do evento — o equipamento sustentou a temperatura sem depender da fonte de refrigeração ativa nesse intervalo.'
    );
  }

  // Fase 2: recuperação — só faz sentido buscar se houve ruptura e/ou
  // se existe um ponto de "fechamento"/"restauração" a partir do qual
  // observar o retorno à faixa.
  const idxInicioBuscaRecuperacao = idxFimEvento !== null ? idxFimEvento : (ruptura ? ruptura.idx : idxInicioEvento);

  if (analise.rompeu || idxFimEvento !== null) {
    const recuperacao = CadeiaFrioRel_cfDetectarRecuperacaoTotal_(dados, idxInicioBuscaRecuperacao, dados.length - 1, ativosIdx, faixa, consecutivas);

    if (recuperacao) {
      analise.recuperouTotalmente = true;
      analise.tempoAteRecuperacaoMinutos = CadeiaFrioRel_cfRound_(recuperacao.minutosDesdeInicio, 2);
    } else if (analise.rompeu) {
      analise.alertasAnalise.push('Os sensores não retornaram totalmente à faixa operacional dentro do período de dados disponível.');
    }
  }

  // Aprovação: só emite veredito se um tempo-alvo foi definido para o ensaio;
  // caso contrário, o estudo é só caracterização (tempo medido, sem aprovação/reprovação).
  if (analise.tempoAlvoMinutos !== null && isFinite(analise.tempoAlvoMinutos)) {
    const sustentouOTempoAlvo = !analise.rompeu || (analise.tempoAteRupturaMinutos >= analise.tempoAlvoMinutos);

    if (sustentouOTempoAlvo) {
      analise.statusAprovacao = 'APROVADO';
    } else {
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push(
        'O equipamento rompeu a faixa operacional em ' + analise.tempoAteRupturaMinutos +
        ' min, antes do tempo-alvo definido para o ensaio (' + analise.tempoAlvoMinutos + ' min).'
      );
    }
  }

  // Conformidade por posição/sensor durante o evento (ver mesma lógica e
  // justificativa em CadeiaFrioRel_cfAnalisarDistribuicao) — a partir do início do
  // evento até o fim dos dados disponíveis.
  const dadosDesdeInicioEvento = dados.slice(idxInicioEvento);
  analise.conformidadePorSensor = CadeiaFrioRel_cfAvaliarConformidadePorSensor_(
    dadosDesdeInicioEvento, faixa, ativosIdx, CadeiaFrioRel_cfEstimarDeltaMinutos_(dados)
  );

  // Guardado à parte pra a tabela "Comportamento dos sensores durante o
  // evento" (Planilha) usar a MESMA janela (a partir do início do
  // evento) que a tabela de conformidade acima — sem isso, as duas
  // tabelas mostravam Mín/Máx diferentes pro mesmo sensor na mesma
  // página, porque _dadosFatia (anexado pelo Main) inclui a margem de
  // contexto ANTES do evento (MARGEM_CONTEXTO_EVENTO_MINUTOS).
  analise._dadosDesdeInicioEvento = dadosDesdeInicioEvento;

  return analise;
}

// ------------------------------------------------------------
// AUTONOMIA (CAIXA TÉRMICA) — sem tempo-alvo, é o próprio objetivo do ensaio
// ------------------------------------------------------------
function CadeiaFrioRel_cfAnalisarAutonomia(dados, faixa, sensoresAtivos, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  opcoes = opcoes || {};
  faixa = CadeiaFrioRel_cfNormalizarFaixa_(faixa);

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  const ativos = CadeiaFrioRel_cfNormalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const ativosIdx = CadeiaFrioRel_cfIndicesAtivos_(ativos);

  if (!ativosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  const consecutivas = CadeiaFrioRel_cfObterParametrosRobustez_(opcoes);
  const ruptura = CadeiaFrioRel_cfDetectarPrimeiraRuptura_(dados, 0, dados.length - 1, ativosIdx, faixa, consecutivas);

  const analise = {
    tipoEstudo: 'AUTONOMIA',
    faixa: faixa,
    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: ativosIdx.map(function(s) { return 'S' + (s + 1); }),

    tempoInicio: dados[0].tempoStr || '',
    tempoFim: dados[dados.length - 1].tempoStr || '',
    tempoTotalGravadoMinutos: CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[0], dados[dados.length - 1]),

    rompeu: false,
    primeiraRuptura: null,
    autonomiaMinutos: null,

    statusAprovacao: 'CARACTERIZACAO',
    observacoesAnalise: []
  };

  if (ruptura) {
    analise.rompeu = true;
    analise.primeiraRuptura = ruptura;
    analise.autonomiaMinutos = CadeiaFrioRel_cfRound_(ruptura.minutosDesdeInicio, 2);
    analise.observacoesAnalise.push(
      'Autonomia registrada: ' + CadeiaFrioRel_cfRound_(analise.autonomiaMinutos / 60, 2) + 'h (' + analise.autonomiaMinutos +
      ' min) até o sensor ' + ruptura.sensor + ' ultrapassar a faixa operacional.'
    );
  } else {
    analise.autonomiaMinutos = analise.tempoTotalGravadoMinutos;
    analise.observacoesAnalise.push(
      'Nenhuma ruptura observada durante todo o período gravado (' + CadeiaFrioRel_cfRound_(analise.tempoTotalGravadoMinutos / 60, 2) +
      'h). A autonomia real pode ser maior que o período monitorado — considere estender a gravação.'
    );
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
function CadeiaFrioRel_cfDetectarPrimeiraRuptura_(dados, idxInicio, idxFim, ativosIdx, faixa, consecutivas) {
  let contador = 0;
  let idxCandidato = -1;
  let candidatoInfo = null;

  for (let i = Math.max(0, idxInicio); i <= Math.min(dados.length - 1, idxFim); i++) {
    const row = dados[i];
    const fora = CadeiaFrioRel_cfPiorLeituraForaDaFaixa_(row, ativosIdx, faixa);

    if (fora) {
      if (contador === 0) idxCandidato = i;
      contador++;
      candidatoInfo = fora;

      if (contador >= consecutivas.confirmarRuptura) {
        return {
          idx: idxCandidato,
          sensor: candidatoInfo.sensor,
          valor: candidatoInfo.valor,
          tempoStr: dados[idxCandidato].tempoStr,
          minutosDesdeInicio: CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[Math.max(0, idxInicio)], dados[idxCandidato])
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
function CadeiaFrioRel_cfDetectarRecuperacaoTotal_(dados, idxInicio, idxFim, ativosIdx, faixa, consecutivas) {
  let contador = 0;
  let idxCandidato = -1;

  for (let i = Math.max(0, idxInicio); i <= Math.min(dados.length - 1, idxFim); i++) {
    const row = dados[i];
    const fora = CadeiaFrioRel_cfPiorLeituraForaDaFaixa_(row, ativosIdx, faixa);

    if (!fora) {
      if (contador === 0) idxCandidato = i;
      contador++;

      if (contador >= consecutivas.confirmarRecuperacao) {
        return {
          idx: idxCandidato,
          tempoStr: dados[idxCandidato].tempoStr,
          minutosDesdeInicio: CadeiaFrioRel_cfCalcularDiferencaTempoMin_(dados[Math.max(0, idxInicio)], dados[idxCandidato])
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
function CadeiaFrioRel_cfPiorLeituraForaDaFaixa_(row, ativosIdx, faixa) {
  let pior = null;
  let piorDesvio = 0;

  for (let k = 0; k < ativosIdx.length; k++) {
    const s = ativosIdx[k];
    const t = CadeiaFrioRel_cfParseNumero_(row.temperaturas[s]);
    if (t === null || !isFinite(t)) continue;

    const desvio = CadeiaFrioRel_cfDesvioDaFaixa_(t, faixa);
    if (desvio > 0 && desvio > piorDesvio) {
      piorDesvio = desvio;
      pior = { sensor: 'S' + (s + 1), valor: CadeiaFrioRel_cfRound_(t, 2) };
    }
  }

  return pior;
}

/**
 * Desvio (em °C, sempre >= 0) de uma leitura em relação à faixa
 * operacional. Zero significa dentro da faixa.
 */
function CadeiaFrioRel_cfDesvioDaFaixa_(t, faixa) {
  if (t < faixa.tMin) return faixa.tMin - t;
  if (t > faixa.tMax) return t - faixa.tMax;
  return 0;
}

function CadeiaFrioRel_cfIndicacoes_(stat) {
  if (stat.min === null || stat.max === null || stat.media === null) {
    return { maxMin: null, mediaMin: null, maxMedia: null };
  }
  return {
    maxMin: CadeiaFrioRel_cfRound_(stat.max - stat.min, 2),
    mediaMin: CadeiaFrioRel_cfRound_(stat.media - stat.min, 2),
    maxMedia: CadeiaFrioRel_cfRound_(stat.max - stat.media, 2)
  };
}

function CadeiaFrioRel_cfObterParametrosRobustez_(opcoes) {
  opcoes = opcoes || {};
  return {
    confirmarRuptura: CadeiaFrioRel_cfClampInt_(opcoes.consecutivasRuptura, 1, 20, 2),
    confirmarRecuperacao: CadeiaFrioRel_cfClampInt_(opcoes.consecutivasRecuperacao, 1, 20, 3)
  };
}

function CadeiaFrioRel_cfNormalizarFaixa_(faixa) {
  faixa = faixa || {};
  const tMin = CadeiaFrioRel_cfParseNumero_(faixa.tMin);
  const tMax = CadeiaFrioRel_cfParseNumero_(faixa.tMax);

  if (tMin === null || tMax === null || !isFinite(tMin) || !isFinite(tMax)) {
    throw new Error('Faixa operacional inválida: informe tMin e tMax.');
  }

  return {
    tMin: tMin,
    tMax: tMax,
    tolerancia: CadeiaFrioRel_cfParseNumero_(faixa.tolerancia) !== null ? CadeiaFrioRel_cfParseNumero_(faixa.tolerancia) : 0.5
  };
}

function CadeiaFrioRel_cfNormalizarSensoresAtivos_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({ length: nSensores }, function() { return true; });
  }

  const out = [];
  for (let i = 0; i < nSensores; i++) {
    out.push(typeof sensoresAtivos[i] === 'undefined' ? true : !!sensoresAtivos[i]);
  }
  return out;
}

function CadeiaFrioRel_cfIndicesAtivos_(ativos) {
  const out = [];
  for (let i = 0; i < ativos.length; i++) if (ativos[i]) out.push(i);
  return out;
}

function CadeiaFrioRel_cfIndicesInativos_(ativos) {
  const out = [];
  for (let i = 0; i < ativos.length; i++) if (!ativos[i]) out.push(i);
  return out;
}

// ------------------------------------------------------------
// TEMPO
// ------------------------------------------------------------

function CadeiaFrioRel_cfCalcularDiferencaTempoMin_(rowInicio, rowFim) {
  if (!rowInicio || !rowFim) return 0;

  const d1 = rowInicio.tempoDate instanceof Date ? rowInicio.tempoDate : CadeiaFrioRel_cfParseTempoSeguro_(rowInicio.tempoStr);
  const d2 = rowFim.tempoDate instanceof Date ? rowFim.tempoDate : CadeiaFrioRel_cfParseTempoSeguro_(rowFim.tempoStr);

  if (!(d1 instanceof Date) || isNaN(d1.getTime()) || !(d2 instanceof Date) || isNaN(d2.getTime())) return 0;

  const diffMs = d2.getTime() - d1.getTime();
  return diffMs > 0 ? CadeiaFrioRel_cfRound_(diffMs / 60000, 2) : 0;
}

function CadeiaFrioRel_cfEstimarDeltaMinutos_(dados) {
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

  deltas.sort(function(x, y) { return x - y; });
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
}

/**
 * Localiza o índice mais próximo de um horário informado manualmente
 * pelo técnico (ex.: horário em que a porta foi aberta).
 * comparador '>=' -> primeiro índice com tempo >= alvo
 * comparador '<=' -> último índice com tempo <= alvo
 */
function CadeiaFrioRel_cfLocalizarIndicePorTempo_(dados, alvo, comparador, fallback) {
  const alvoMs = CadeiaFrioRel_cfConverterTempoParaMs_(alvo);
  if (!isFinite(alvoMs)) return fallback === undefined ? null : fallback;

  if (comparador === '>=') {
    for (let i = 0; i < dados.length; i++) {
      const ms = CadeiaFrioRel_cfConverterTempoParaMs_(dados[i].tempoDate || dados[i].tempoStr);
      if (isFinite(ms) && ms >= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  if (comparador === '<=') {
    for (let i = dados.length - 1; i >= 0; i--) {
      const ms = CadeiaFrioRel_cfConverterTempoParaMs_(dados[i].tempoDate || dados[i].tempoStr);
      if (isFinite(ms) && ms <= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  return fallback === undefined ? null : fallback;
}

function CadeiaFrioRel_cfConverterTempoParaMs_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getTime();
  const d = CadeiaFrioRel_cfParseTempoSeguro_(valor);
  return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : NaN;
}

/**
 * Recorta um dataset (arquivo único de datalogger, cobrindo vários
 * ensaios) para a janela [inicioMs, fimMs] de um ensaio específico —
 * usado quando o técnico marca múltiplos estudos (distribuição 24h,
 * abertura de porta, queda de energia) dentro do mesmo arquivo.
 */
function CadeiaFrioRel_cfFatiarDadosPorJanela_(dados, inicioMs, fimMs) {
  if (!Array.isArray(dados) || !dados.length) return [];
  if (!isFinite(inicioMs) || !isFinite(fimMs)) return [];

  return dados.filter(function(row) {
    const ms = CadeiaFrioRel_cfConverterTempoParaMs_(row.tempoDate || row.tempoStr);
    return isFinite(ms) && ms >= inicioMs && ms <= fimMs;
  });
}

function CadeiaFrioRel_cfParseTempoSeguro_(valor) {
  try { return CadeiaFrioRel_parseDataHoraRobusta_(valor, 'BR'); } catch(e) { return null; }
}

function CadeiaFrioRel_cfParseNumero_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : null;
}

function CadeiaFrioRel_cfRound_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round((Number(n) || 0) * p) / p;
}

function CadeiaFrioRel_cfClampInt_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}
