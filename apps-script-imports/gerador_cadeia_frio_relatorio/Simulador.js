/****************************************************
 * METROLABS — CADEIA DE FRIO — RELATÓRIO INTERNO / DADOS RECONSTITUÍDOS
 * Gera UM arquivo sintético contínuo de temperatura cobrindo TODOS os
 * estudos habilitados no mesmo laudo (distribuição 24h, abertura de
 * porta, queda de energia, autonomia) — mesmo papel do Simulador.js
 * do motor de Autoclave, adaptado ao domínio de cadeia de frio: não
 * há F0/pressão/pré-vácuo, só permanência dentro da faixa operacional,
 * com uma excursão controlada nos estudos de evento e um decaimento
 * térmico passivo no estudo de autonomia.
 *
 * Cada estudo habilitado vira um "segmento" com sua própria janela de
 * tempo; fora dos segmentos (ex.: intervalo entre um ensaio e outro no
 * mesmo arquivo) a curva fica estável em torno da temperatura alvo.
 ****************************************************/

/**
 * Wrapper de cache: garante que o Relatório (Planilha) e o Certificado
 * (HTML, ver Certificado.js) gerados a partir do MESMO formulário no
 * modo simulado tenham exatamente os mesmos números — sem isso, cada
 * clique gera uma curva aleatória nova (ver seedBase abaixo, que usa
 * UUID/timestamp de propósito, para dar variedade quando o técnico
 * clica "gerar" várias vezes testando cenários) e os dois documentos
 * poderiam divergir. A senha é sempre validada aqui, mesmo em cache
 * hit — nunca pular autenticação por causa do cache.
 */
function cfGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, multiArquivo) {
  payload = payload || {};
  cfValidarSenhaSimuladorAdmin_(payload.simulacaoSenha);
  payload.modoRelatorioSimulado = true;

  const fingerprint = cfFingerprintSimulado_(payload, estudosConfig, faixa, multiArquivo);
  const chave = 'CFSIM_' + fingerprint;
  let cache = null;

  try {
    cache = CacheService.getScriptCache();
    const cacheado = cache.get(chave);
    if (cacheado) {
      const pacote = JSON.parse(cacheado);
      const linhas = Array.isArray(pacote.rows) ? pacote.rows : [];
      linhas.forEach(function(r) { r.tempoDate = new Date(r.tempoDate); });
      payload._simulacaoMeta = pacote.meta || null;
      return linhas;
    }
  } catch (e) {
    // Cache indisponível/corrompido — segue gerando normalmente.
  }

  const rows = multiArquivo
    ? cfGerarDadosSimuladosMultiArquivoAdmin_(payload, estudosConfig, faixa)
    : cfGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa);

  if (cache) {
    try {
      cache.put(chave, JSON.stringify({ rows: rows, meta: payload._simulacaoMeta || null }), 1800);
    } catch (e) {
      // Dataset grande demais para o cache (limite ~100KB por chave) — segue sem cachear.
    }
  }

  return rows;
}

function cfFingerprintSimulado_(payload, estudosConfig, faixa, multiArquivo) {
  const sim = payload.simulacao || {};
  const partes = [
    multiArquivo ? 'MULTI' : 'UNICO',
    payload.nSensores,
    sim.temperaturaAlvo,
    sim.intervaloSegundos,
    sim.inicioEstudo,
    sim.fimEstudo,
    sim.autonomiaEstimadaMinutos,
    faixa && faixa.tMin,
    faixa && faixa.tMax,
    faixa && faixa.tolerancia
  ];

  (estudosConfig || []).forEach(function(cfg) {
    partes.push(
      cfg.tipoEstudo, cfg.janelaInicioMs, cfg.janelaFimMs, cfg.resultadoDesejado,
      cfg.tipoAbertura, cfg.tempoAlvoMinutos, cfg.inicioEventoMs, cfg.fimEventoMs
    );
  });

  return cfHashSimulado_(partes.join('|'));
}

function cfHashSimulado_(texto) {
  let h = 2166136261;
  const s = String(texto || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function cfGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa) {
  payload = payload || {};

  cfValidarSenhaSimuladorAdmin_(payload.simulacaoSenha);

  if (!Array.isArray(estudosConfig) || !estudosConfig.length) {
    throw new Error('Nenhum estudo habilitado para reconstituir dados.');
  }

  const sim = payload.simulacao || {};
  const nSensores = cfClampIntMain_(payload.nSensores, 1, 60, CFCFG.DEFAULT_N || 12);
  const intervaloSeg = cfClampIntMain_(sim.intervaloSegundos, 10, 1800, (CFCFG.SIMULADOR_ADMIN && CFCFG.SIMULADOR_ADMIN.intervaloSegundosDefault) || 300);
  const alvo = cfParseNumeroMain_(sim.temperaturaAlvo, (faixa.tMin + faixa.tMax) / 2);

  const inicioEstudo = cfParseTempoSeguro_(sim.inicioEstudo);
  const fimEstudo = cfParseTempoSeguro_(sim.fimEstudo);

  if (!inicioEstudo || !fimEstudo) {
    throw new Error('Informe data/hora válidas para início e fim do arquivo reconstituído ("Início/Fim do estudo").');
  }
  if (!(inicioEstudo.getTime() < fimEstudo.getTime())) {
    throw new Error('O início do arquivo reconstituído deve ser anterior ao término.');
  }

  const totalSeg = Math.round((fimEstudo.getTime() - inicioEstudo.getTime()) / 1000);
  if (totalSeg < intervaloSeg * 3) {
    throw new Error('O período reconstituído deve conter pelo menos 3 leituras (ajuste início/fim do estudo ou o intervalo).');
  }

  const inicioMs = inicioEstudo.getTime();
  const fimMs = fimEstudo.getTime();

  const seedBase = [
    Utilities.getUuid(),
    new Date().getTime(),
    sim.inicioEstudo,
    sim.fimEstudo,
    alvo,
    nSensores,
    payload.cliente,
    payload.tagEquipamento,
    estudosConfig.length
  ].join('|');

  const rand = cfCriarRandomSimulador_(seedBase);

  // Cada estudo de evento (porta/energia) carrega uma margem de contexto
  // automática (CFCFG.MARGEM_CONTEXTO_EVENTO_MINUTOS) ao redor do horário
  // do evento — o técnico não digita essa margem, então em vez de exigir
  // que ele preveja isso e trave o laudo com erro, a janela de cada
  // estudo é simplesmente cortada (clampada) para caber dentro do
  // período do arquivo reconstituído informado.
  // `rand` já existe neste ponto porque cada segmento decide (uma única
  // vez, na montagem) se vai representar um resultado aprovado ou
  // reprovado, e com que amplitude/tempo de ruptura — mantendo isso fixo
  // por segmento (em vez de recalcular a cada leitura) é o que garante
  // uma curva coerente em vez de ruído aleatório sem sentido físico.
  const segmentos = estudosConfig.map(function(cfg) {
    return cfMontarSegmentoSimulado_(cfg, faixa, inicioMs, fimMs, rand);
  });

  const sensorOffsets = [];
  const sensorFase = [];
  for (let s = 0; s < nSensores; s++) {
    sensorOffsets.push((rand() - 0.5) * 0.6);
    sensorFase.push(rand() * Math.PI * 2);
  }

  const rows = [];
  for (let ms = inicioMs, idx = 0; ms <= fimMs; ms += intervaloSeg * 1000, idx++) {
    const d = new Date(ms);
    const segmento = cfEncontrarSegmentoSimulado_(ms, segmentos);
    const tempBase = cfCalcularTemperaturaBaseSimulada_(ms, segmento, alvo, faixa);

    const temps = [];
    for (let s = 0; s < nSensores; s++) {
      const ondaLenta = Math.sin((idx / 14) + sensorFase[s]) * 0.06;
      const ruido = (rand() - 0.5) * 0.14;
      temps.push(cfRoundSimulador_(tempBase + sensorOffsets[s] + ondaLenta + ruido, 2));
    }

    rows.push({
      tempoStr: Utilities.formatDate(d, CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      tempoDate: d,
      temperaturas: temps
    });
  }

  const segmentoAutonomia = segmentos.filter(function(s) { return s.tipoEstudo === 'AUTONOMIA'; })[0];

  payload.modoRelatorioSimulado = true;
  payload._simulacaoMeta = {
    origem: 'ANALISE_MANUAL_RECONSTITUIDA',
    geradoEm: Utilities.formatDate(new Date(), CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    operador: String(payload.operador || '').trim(),
    inicioEstudo: Utilities.formatDate(inicioEstudo, CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimEstudo: Utilities.formatDate(fimEstudo, CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    temperaturaAlvo: alvo,
    intervaloSegundos: intervaloSeg,
    linhasGeradas: rows.length,
    estudosIncluidos: estudosConfig.map(function(c) { return cfLabelEstudo_(c.tipoEstudo); }).join(', '),
    autonomiaEstimadaMinutos: segmentoAutonomia ? segmentoAutonomia.autonomiaEstimadaMinutos : null
  };

  return rows;
}

/**
 * Variante do Relatório Interno que simula o cenário de dataloggers
 * INDIVIDUAIS por sensor (modo real ARQUIVO_POR_SENSOR), em vez de um
 * arquivo único já alinhado. Reaproveita cfGerarDadosSimuladosAdmin_
 * (mesma curva/segmentos já validados) como "verdade" e depois quebra
 * essa série em N séries independentes, cada uma com pequeno desvio de
 * relógio/leituras faltantes — simulando aparelhos separados de
 * verdade — e mescla de volta usando cfMesclarSeriesPorSensor_ (a
 * mesma função usada no upload real de arquivos por sensor). Serve
 * pra validar a lógica de mesclagem sem precisar do datalogger real.
 */
function cfGerarDadosSimuladosMultiArquivoAdmin_(payload, estudosConfig, faixa) {
  const base = cfGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa);

  const nSensores = Array.isArray(base[0] && base[0].temperaturas) ? base[0].temperaturas.length : 0;
  if (!nSensores || base.length < 2) return base;

  let somaDelta = 0;
  let countDelta = 0;
  for (let i = 1; i < base.length; i++) {
    const dt = base[i].tempoDate.getTime() - base[i - 1].tempoDate.getTime();
    if (dt > 0) { somaDelta += dt; countDelta++; }
  }
  const intervaloMedioMs = countDelta ? (somaDelta / countDelta) : 60000;

  const rand = cfCriarRandomSimulador_('multiarquivo|' + Utilities.getUuid());

  const seriesPorSensor = [];
  for (let s = 0; s < nSensores; s++) {
    const serieSensor = [];
    base.forEach(function(row) {
      // ~2% das leituras somem (simula falha pontual de gravação do
      // aparelho individual) e o restante ganha um desvio de relógio de
      // até ±30% do intervalo (aparelhos independentes não estão
      // perfeitamente sincronizados entre si).
      if (rand() < 0.02) return;

      const jitterMs = Math.round((rand() * 2 - 1) * intervaloMedioMs * 0.3);
      const tempoDate = new Date(row.tempoDate.getTime() + jitterMs);

      serieSensor.push({
        tempoStr: Utilities.formatDate(tempoDate, CFCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
        tempoDate: tempoDate,
        temperaturas: [row.temperaturas[s]]
      });
    });
    serieSensor.sort(function(a, b) { return a.tempoDate.getTime() - b.tempoDate.getTime(); });
    seriesPorSensor.push(serieSensor);
  }

  return cfMesclarSeriesPorSensor_(seriesPorSensor);
}

function cfValidarSenhaSimuladorAdmin_(senhaInformada) {
  const cfg = CFCFG.SIMULADOR_ADMIN || {};
  if (cfg.habilitado === false) {
    throw new Error('Relatório interno administrativo desabilitado na configuração.');
  }

  const senha = String(senhaInformada || '').trim();
  if (!senha) {
    throw new Error('Senha administrativa obrigatória para o relatório interno.');
  }

  let senhaEsperada = '';
  try {
    senhaEsperada = String(PropertiesService.getScriptProperties().getProperty('SIMULADOR_ADMIN_SENHA') || '').trim();
  } catch (e) {}

  if (!senhaEsperada) {
    senhaEsperada = String(cfg.senhaFallback || '').trim();
  }

  if (!senhaEsperada || senha !== senhaEsperada) {
    throw new Error('Senha administrativa inválida para o relatório interno.');
  }
}

// ------------------------------------------------------------
// SEGMENTOS (um por estudo habilitado)
// ------------------------------------------------------------

function cfMontarSegmentoSimulado_(cfg, faixa, limiteInicioMs, limiteFimMs, rand) {
  const tipo = cfg.tipoEstudo;
  const seg = {
    tipoEstudo: tipo,
    resultadoDesejado: cfNormalizarResultadoDesejado_(cfg.resultadoDesejado),
    inicioMs: Math.min(Math.max(cfg.janelaInicioMs, limiteInicioMs), limiteFimMs),
    fimMs: Math.max(Math.min(cfg.janelaFimMs, limiteFimMs), limiteInicioMs)
  };

  if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    seg.inicioEventoMs = cfg.inicioEventoMs;
    seg.fimEventoMs = cfg.fimEventoMs; // pode ser null (sem horário de término informado)
    seg.tempoAlvoMinutos = cfParseNumeroMain_(cfg.tempoAlvoMinutos, null);
    seg.resultadoEfetivo = cfDecidirResultadoEfetivo_(seg.resultadoDesejado, rand);

    // Duração de referência usada só para ritmar a curva (tempo até o
    // pico) — se o técnico não informou tempo-alvo, assume uma fração
    // da janela disponível só para a excursão não parecer instantânea.
    const duracaoDisponivelMs = Math.max(60000, (seg.fimEventoMs || seg.fimMs) - seg.inicioEventoMs);
    const alvoDuracaoMs = (seg.tempoAlvoMinutos && seg.tempoAlvoMinutos > 0)
      ? seg.tempoAlvoMinutos * 60000
      : duracaoDisponivelMs * 0.6;

    if (seg.resultadoEfetivo === 'REPROVADO') {
      // Rompe bem antes do tempo-alvo (entre 30% e 65% dele), garantindo
      // reprovação mesmo com folga para o clamp de janela do arquivo.
      const fracaoRuptura = 0.30 + rand() * 0.35;
      seg.spanSubidaMs = Math.max(5 * 60000, Math.min(duracaoDisponivelMs * 0.7, alvoDuracaoMs * fracaoRuptura));
      seg.amplitudeExcursao = Math.max(1.5, (faixa.tMax - faixa.tMin) * (0.28 + rand() * 0.22));
    } else {
      // Sobe em direção a tMax mas nunca cruza — equipamento sustenta a
      // faixa durante todo o evento.
      seg.fatorSeguranca = 0.45 + rand() * 0.3; // pico entre 45% e 75% do caminho até tMax
      seg.spanSubidaSeguraMs = Math.max(5 * 60000, Math.min(duracaoDisponivelMs * 0.6, alvoDuracaoMs * (0.4 + rand() * 0.3)));
    }
  } else if (tipo === 'AUTONOMIA') {
    const tAmbiente = 27.0;
    const tInicioCurva = faixa.tMin + (faixa.tMax - faixa.tMin) * 0.25;
    const duracaoMin = Math.max(1, (seg.fimMs - seg.inicioMs) / 60000);

    let autonomiaEstimadaMin = cfg.autonomiaEstimadaMinutos;
    if (!autonomiaEstimadaMin || autonomiaEstimadaMin <= 0) {
      autonomiaEstimadaMin = duracaoMin * 0.55;
    }

    const autonomiaEstimadaMs = autonomiaEstimadaMin * 60000;
    const razao = (tAmbiente - faixa.tMax) / (tAmbiente - tInicioCurva);
    const tauMs = (razao > 0 && razao < 1) ? (-autonomiaEstimadaMs / Math.log(razao)) : autonomiaEstimadaMs;

    seg.tAmbiente = tAmbiente;
    seg.tInicioCurva = tInicioCurva;
    seg.tauMs = tauMs;
    seg.autonomiaEstimadaMinutos = cfRoundSimulador_(autonomiaEstimadaMin, 1);
  } else {
    // DISTRIBUICAO_VAZIO / DISTRIBUICAO_CARGA
    seg.resultadoEfetivo = cfDecidirResultadoEfetivo_(seg.resultadoDesejado, rand);

    if (seg.resultadoEfetivo === 'REPROVADO') {
      const duracaoMs = Math.max(60000, seg.fimMs - seg.inicioMs);
      // Excursão controlada num ponto aleatório do ensaio (nunca nas
      // bordas, para não colidir com o início/fim do estudo), com subida
      // e descida suaves — não é um degrau nem uma repetição do mesmo
      // ponto entre gerações.
      seg.excursaoCentroMs = seg.inicioMs + duracaoMs * (0.25 + rand() * 0.5);
      seg.excursaoDuracaoMs = Math.min(duracaoMs * 0.18, Math.max(20 * 60000, duracaoMs * 0.08));
      const tolerancia = isFinite(faixa.tolerancia) ? Number(faixa.tolerancia) : 2.0; // conservador quando a tolerância real não é conhecida (ex.: pré-visualização)
      seg.excursaoAmplitude = tolerancia + 0.6 + rand() * 1.2; // sempre > tolerância, garante REPROVADO
      seg.excursaoLado = rand() < 0.5 ? 1 : -1; // rompe por cima (tMax) ou por baixo (tMin)
    }
  }

  return seg;
}

function cfNormalizarResultadoDesejado_(valor) {
  const v = String(valor || 'ALEATORIO').toUpperCase().trim();
  return (v === 'APROVADO' || v === 'REPROVADO') ? v : 'ALEATORIO';
}

function cfDecidirResultadoEfetivo_(resultadoDesejado, rand) {
  if (resultadoDesejado === 'APROVADO' || resultadoDesejado === 'REPROVADO') return resultadoDesejado;
  return rand() < 0.5 ? 'APROVADO' : 'REPROVADO';
}

function cfEncontrarSegmentoSimulado_(ms, segmentos) {
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (ms >= s.inicioMs && ms <= s.fimMs) return s;
  }
  return null;
}

/**
 * Curva de temperatura sintética no instante ms, conforme o segmento
 * (estudo) em que ele cai:
 * - fora de qualquer segmento (intervalo entre ensaios no mesmo
 *   arquivo): estável em torno do alvo;
 * - distribuição (contínuo): oscila suavemente em torno do alvo,
 *   dentro da faixa operacional; se o resultado desejado do estudo for
 *   REPROVADO, uma excursão controlada (curva suave, não degrau) rompe
 *   tMax ou tMin num ponto aleatório do meio do ensaio;
 * - evento (porta/energia): estável até o início do evento; depois,
 *   conforme o resultado desejado do estudo, ou sobe além de tMax
 *   simulando a ruptura (REPROVADO), ou sobe sem nunca cruzar tMax
 *   (APROVADO) — em ambos os casos, se um "fim do evento" foi
 *   informado, recupera gradualmente de volta ao alvo depois;
 * - autonomia (caixa térmica): decaimento térmico passivo (lei de
 *   aquecimento de Newton) partindo de um ponto frio dentro da faixa
 *   e subindo em direção à temperatura ambiente até romper tMax perto
 *   do tempo estimado pelo técnico.
 */
function cfCalcularTemperaturaBaseSimulada_(ms, segmento, alvo, faixa) {
  if (!segmento) {
    return alvo + Math.sin(ms / 600000) * 0.25;
  }

  if (segmento.tipoEstudo === 'AUTONOMIA') {
    const decaimento = segmento.tauMs > 0 ? Math.exp(-(ms - segmento.inicioMs) / segmento.tauMs) : 0;
    return segmento.tAmbiente - (segmento.tAmbiente - segmento.tInicioCurva) * decaimento;
  }

  if (segmento.tipoEstudo === 'ABERTURA_PORTA' || segmento.tipoEstudo === 'QUEDA_ENERGIA') {
    if (ms < segmento.inicioEventoMs) {
      return alvo + Math.sin((ms - segmento.inicioMs) / 240000) * 0.3;
    }

    if (segmento.resultadoEfetivo === 'APROVADO') {
      // Sobe em direção a tMax mas nunca cruza — equipamento sustenta a
      // faixa operacional durante todo o evento.
      const pico = alvo + (faixa.tMax - alvo) * segmento.fatorSeguranca;

      if (segmento.fimEventoMs === null || ms <= segmento.fimEventoMs) {
        const p = Math.min(1, (ms - segmento.inicioEventoMs) / segmento.spanSubidaSeguraMs);
        return alvo + (pico - alvo) * Math.pow(p, 0.55) + Math.sin(p * Math.PI * 3) * 0.06;
      }

      const spanRecuperacao = Math.min(20 * 60000, Math.max(60000, segmento.fimMs - segmento.fimEventoMs));
      const p2 = Math.min(1, (ms - segmento.fimEventoMs) / spanRecuperacao);
      return pico - (pico - alvo) * Math.pow(p2, 0.5);
    }

    // REPROVADO — rompe a faixa e, se houver fim de evento, recupera depois
    const alvoExcursao = faixa.tMax + segmento.amplitudeExcursao;

    if (segmento.fimEventoMs === null || ms <= segmento.fimEventoMs) {
      const p = Math.min(1, (ms - segmento.inicioEventoMs) / segmento.spanSubidaMs);
      return alvo + (alvoExcursao - alvo) * Math.pow(p, 0.6);
    }

    const spanRecuperacao = Math.min(25 * 60000, Math.max(60000, segmento.fimMs - segmento.fimEventoMs));
    const p2 = Math.min(1, (ms - segmento.fimEventoMs) / spanRecuperacao);
    return alvoExcursao - (alvoExcursao - alvo) * Math.pow(p2, 0.5);
  }

  // distribuição (DISTRIBUICAO_VAZIO / DISTRIBUICAO_CARGA)
  const span = Math.max(1, segmento.fimMs - segmento.inicioMs);
  const p = (ms - segmento.inicioMs) / span;
  const base = alvo + Math.sin(p * Math.PI * 6) * 0.35 + Math.sin(p * Math.PI * 1.3) * 0.5;

  if (segmento.resultadoEfetivo === 'REPROVADO' && segmento.excursaoCentroMs !== undefined) {
    const distMs = Math.abs(ms - segmento.excursaoCentroMs);
    const meiaLargura = segmento.excursaoDuracaoMs / 2;
    if (distMs <= meiaLargura) {
      const pExc = 1 - (distMs / meiaLargura); // 0 nas bordas da excursão, 1 no centro
      const curvaSuave = Math.sin(pExc * Math.PI / 2); // sobe e desce suavemente, sem degrau
      const alvoExcursao = segmento.excursaoLado > 0
        ? faixa.tMax + segmento.excursaoAmplitude
        : faixa.tMin - segmento.excursaoAmplitude;
      return base + (alvoExcursao - base) * curvaSuave;
    }
  }

  return base;
}

function cfCriarRandomSimulador_(seedText) {
  let h = 2166136261;
  const s = String(seedText || 'simulador');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cfRoundSimulador_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round(Number(n || 0) * p) / p;
}
