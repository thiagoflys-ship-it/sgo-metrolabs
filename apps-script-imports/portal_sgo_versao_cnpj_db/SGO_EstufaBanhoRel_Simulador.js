/****************************************************
 * METROLABS — ESTUFA+BANHO-MARIA — RELATÓRIO INTERNO / DADOS RECONSTITUÍDOS
 * Gera UM arquivo sintético contínuo de temperatura cobrindo TODOS os
 * estudos habilitados no mesmo laudo (distribuição 24h, abertura de
 * porta, queda de energia, autonomia) — mesmo papel do Simulador.js
 * do motor de Autoclave/Cadeia de Frio, adaptado ao domínio de estufa
 * de incubação: não há F0/pressão/pré-vácuo, só permanência dentro da
 * faixa operacional,
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
 * parâmetros diferentes geram outra curva, enquanto os mesmos parâmetros
 * mantêm as leituras inclusive sem cache. Assim os dois documentos
 * poderiam divergir. A senha é sempre validada aqui, mesmo em cache
 * hit — nunca pular autenticação por causa do cache.
 */
function EstufaBanhoRel_ebGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, multiArquivo) {
  payload = payload || {};
  EstufaBanhoRel_ebValidarSenhaSimuladorAdmin_(payload.simulacaoSenha);
  payload.modoRelatorioSimulado = true;
  const fingerprint = EstufaBanhoRel_ebFingerprintSimulado_(payload, estudosConfig, faixa, multiArquivo);
  const chave = 'EBSIM_' + fingerprint;
  let cache = null;
  try {
    cache = CacheService.getScriptCache();
    const cacheado = cache.get(chave);
    if (cacheado) {
      const pacote = JSON.parse(cacheado);
      const linhas = Array.isArray(pacote.rows) ? pacote.rows : [];
      linhas.forEach(function (r) {
        r.tempoDate = new Date(r.tempoDate);
      });
      payload._simulacaoMeta = pacote.meta || null;
      return linhas;
    }
  } catch (e) {
    // Cache indisponível/corrompido — segue gerando normalmente.
  }
  const rows = multiArquivo ? EstufaBanhoRel_ebGerarDadosSimuladosMultiArquivoAdmin_(payload, estudosConfig, faixa) : EstufaBanhoRel_ebGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa);
  if (cache) {
    try {
      cache.put(chave, JSON.stringify({
        rows: rows,
        meta: payload._simulacaoMeta || null
      }), 1800);
    } catch (e) {
      // Dataset grande demais para o cache (limite ~100KB por chave) — segue sem cachear.
    }
  }
  return rows;
}
function EstufaBanhoRel_ebFingerprintSimulado_(payload, estudosConfig, faixa, multiArquivo) {
  const sim = payload.simulacao || {};
  // Versiona o algoritmo e todos os parâmetros que alteram as leituras. Não inclui senha nem metadados gerados.
  const partes = ['SIM_V2_20261104', multiArquivo ? 'MULTI' : 'UNICO', payload.perfil,
    payload.nSensores, JSON.stringify(payload.sensoresAtivos || []), JSON.stringify(sim),
    JSON.stringify(payload.qualif || {}), JSON.stringify(faixa || {}), JSON.stringify(estudosConfig || [])];
  return EstufaBanhoRel_ebHashSimulado_(partes.join('|'));
}
function EstufaBanhoRel_ebHashSimulado_(texto) {
  let h = 2166136261;
  const s = String(texto || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function EstufaBanhoRel_ebGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa) {
  payload = payload || {};
  EstufaBanhoRel_ebValidarSenhaSimuladorAdmin_(payload.simulacaoSenha);
  if (!Array.isArray(estudosConfig) || !estudosConfig.length) {
    throw new Error('Nenhum estudo habilitado para reconstituir dados.');
  }
  const sim = payload.simulacao || {};
  const nSensores = EstufaBanhoRel_ebClampIntMain_(payload.nSensores, 1, 60, EstufaBanhoRel_EBCFG.DEFAULT_N || 12);
  const intervaloSeg = EstufaBanhoRel_ebClampIntMain_(sim.intervaloSegundos, 10, 1800, EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN && EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN.intervaloSegundosDefault || 300);
  const alvo = EstufaBanhoRel_ebParseNumeroMain_(sim.temperaturaAlvo, (faixa.tMin + faixa.tMax) / 2);
  const inicioEstudo = EstufaBanhoRel_ebParseTempoSeguro_(sim.inicioEstudo);
  const fimEstudo = EstufaBanhoRel_ebParseTempoSeguro_(sim.fimEstudo);
  if (!inicioEstudo || !fimEstudo) {
    throw new Error('Informe data/hora válidas para início e fim do arquivo reconstituído ("Início/Fim do estudo").');
  }
  if (!(inicioEstudo.getTime() < fimEstudo.getTime())) {
    throw new Error('O início do arquivo reconstituído deve ser anterior ao término.');
  }
  const totalSeg = Math.round((fimEstudo.getTime() - inicioEstudo.getTime()) / 1000);
  if (Math.floor(totalSeg / intervaloSeg) + 1 > (EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS || 200000)) throw new Error('Período reconstituído excede o limite de leituras. Reduza o período ou aumente o intervalo.');
  if (totalSeg < intervaloSeg * 3) {
    throw new Error('O período reconstituído deve conter pelo menos 3 leituras (ajuste início/fim do estudo ou o intervalo).');
  }
  const inicioMs = inicioEstudo.getTime();
  const fimMs = fimEstudo.getTime();
  // Mesmos parâmetros produzem os mesmos dados inclusive quando o cache de 100 KB não comporta o arquivo.
  const seedBase = EstufaBanhoRel_ebFingerprintSimulado_(payload, estudosConfig, faixa, false);
  const rand = EstufaBanhoRel_ebCriarRandomSimulador_(seedBase);

  // Cada estudo de evento (porta/energia) carrega uma margem de contexto
  // automática (EBCFG.MARGEM_CONTEXTO_EVENTO_MINUTOS) ao redor do horário
  // do evento — o técnico não digita essa margem, então em vez de exigir
  // que ele preveja isso e trave o laudo com erro, a janela de cada
  // estudo é simplesmente cortada (clampada) para caber dentro do
  // período do arquivo reconstituído informado.
  // `rand` já existe neste ponto porque cada segmento decide (uma única
  // vez, na montagem) se vai representar um resultado aprovado ou
  // reprovado, e com que amplitude/tempo de ruptura — mantendo isso fixo
  // por segmento (em vez de recalcular a cada leitura) é o que garante
  // uma curva coerente em vez de ruído aleatório sem sentido físico.
  const segmentos = EstufaBanhoRel_ebSegmentosControlados_(payload, estudosConfig, faixa, inicioMs, fimMs, intervaloSeg, rand);
  const rows = [];
  for (let ms = inicioMs, idx = 0; ms <= fimMs; ms += intervaloSeg * 1000, idx++) {
    const d = new Date(ms);
    const segmento = segmentos.filter(function (s) { return ms >= s.inicioMs && ms <= s.fimMs; })[0];
    const temps = [];
    for (let sensor = 0; sensor < nSensores; sensor++) {
      temps.push(EstufaBanhoRel_ebTemperaturaControlada_(ms, idx, sensor, segmento, alvo));
    }
    rows.push({ tempoStr: Utilities.formatDate(d, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'), tempoDate: d, temperaturas: temps });
  }
  const segmentoAutonomia = segmentos.filter(function (s) {
    return s.tipoEstudo === 'AUTONOMIA';
  })[0];
  payload.modoRelatorioSimulado = true;
  payload._simulacaoMeta = {
    origem: 'ANALISE_MANUAL_RECONSTITUIDA',
    geradoEm: Utilities.formatDate(new Date(), EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    operador: String(payload.operador || '').trim(),
    inicioEstudo: Utilities.formatDate(inicioEstudo, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimEstudo: Utilities.formatDate(fimEstudo, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    temperaturaAlvo: alvo,
    intervaloSegundos: intervaloSeg,
    linhasGeradas: rows.length,
    estudosIncluidos: estudosConfig.map(function (c) {
      return EstufaBanhoRel_ebLabelEstudo_(c.tipoEstudo);
    }).join(', '),
    autonomiaEstimadaMinutos: segmentoAutonomia ? segmentoAutonomia.autonomiaEstimadaMinutos : null
  };
  return rows;
}

/**
 * Variante do Relatório Interno que simula o cenário de dataloggers
 * INDIVIDUAIS por sensor (modo real ARQUIVO_POR_SENSOR), em vez de um
 * arquivo único já alinhado. Reaproveita ebGerarDadosSimuladosAdmin_
 * (mesma curva/segmentos já validados) como "verdade" e depois quebra
 * essa série em N séries independentes, cada uma com pequeno desvio de
 * relógio/leituras faltantes — simulando aparelhos separados de
 * verdade — e mescla de volta usando ebMesclarSeriesPorSensor_ (a
 * mesma função usada no upload real de arquivos por sensor). Serve
 * pra validar a lógica de mesclagem sem precisar do datalogger real.
 */
function EstufaBanhoRel_ebGerarDadosSimuladosMultiArquivoAdmin_(payload, estudosConfig, faixa) {
  const base = EstufaBanhoRel_ebGerarDadosSimuladosAdmin_(payload, estudosConfig, faixa);
  const nSensores = Array.isArray(base[0] && base[0].temperaturas) ? base[0].temperaturas.length : 0;
  if (!nSensores || base.length < 2) return base;
  // No cenário controlado não se introduzem perdas aleatórias: o veredito escolhido deve sobreviver
  // à separação e mesclagem reais dos canais. Mesmas datas e mesmos parâmetros = mesmas leituras.
  const seriesPorSensor = [];
  for (let s = 0; s < nSensores; s++) {
    const serieSensor = [];
    base.forEach(function (row) {
      const tempoDate = new Date(row.tempoDate.getTime());
      serieSensor.push({
        tempoStr: Utilities.formatDate(tempoDate, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
        tempoDate: tempoDate,
        temperaturas: [row.temperaturas[s]]
      });
    });
    serieSensor.sort(function (a, b) {
      return a.tempoDate.getTime() - b.tempoDate.getTime();
    });
    seriesPorSensor.push(serieSensor);
  }
  return EstufaBanhoRel_ebMesclarSeriesPorSensor_(seriesPorSensor);
}
function EstufaBanhoRel_ebValidarSenhaSimuladorAdmin_(senhaInformada) {
  const cfg = EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN || {};
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

function EstufaBanhoRel_ebMontarSegmentoSimulado_(cfg, faixa, limiteInicioMs, limiteFimMs, rand) {
  const tipo = cfg.tipoEstudo;
  const seg = {
    tipoEstudo: tipo,
    resultadoDesejado: EstufaBanhoRel_ebNormalizarResultadoDesejado_(cfg.resultadoDesejado),
    inicioMs: Math.min(Math.max(cfg.janelaInicioMs, limiteInicioMs), limiteFimMs),
    fimMs: Math.max(Math.min(cfg.janelaFimMs, limiteFimMs), limiteInicioMs)
  };
  if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    seg.inicioEventoMs = cfg.inicioEventoMs;
    seg.fimEventoMs = cfg.fimEventoMs; // pode ser null (sem horário de término informado)
    seg.tempoAlvoMinutos = EstufaBanhoRel_ebParseNumeroMain_(cfg.tempoAlvoMinutos, null);
    seg.resultadoEfetivo = EstufaBanhoRel_ebDecidirResultadoEfetivo_(seg.resultadoDesejado, rand);

    // Duração de referência usada só para ritmar a curva (tempo até o
    // pico) — se o técnico não informou tempo-alvo, assume uma fração
    // da janela disponível só para a excursão não parecer instantânea.
    const duracaoDisponivelMs = Math.max(60000, (seg.fimEventoMs || seg.fimMs) - seg.inicioEventoMs);
    const alvoDuracaoMs = seg.tempoAlvoMinutos && seg.tempoAlvoMinutos > 0 ? seg.tempoAlvoMinutos * 60000 : duracaoDisponivelMs * 0.6;
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
    const tauMs = razao > 0 && razao < 1 ? -autonomiaEstimadaMs / Math.log(razao) : autonomiaEstimadaMs;
    seg.tAmbiente = tAmbiente;
    seg.tInicioCurva = tInicioCurva;
    seg.tauMs = tauMs;
    seg.autonomiaEstimadaMinutos = EstufaBanhoRel_ebRoundSimulador_(autonomiaEstimadaMin, 1);
  } else {
    // DISTRIBUICAO_VAZIO / DISTRIBUICAO_CARGA
    seg.resultadoEfetivo = EstufaBanhoRel_ebDecidirResultadoEfetivo_(seg.resultadoDesejado, rand);
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
function EstufaBanhoRel_ebNormalizarResultadoDesejado_(valor) {
  const v = String(valor || 'ALEATORIO').toUpperCase().trim();
  return v === 'APROVADO' || v === 'REPROVADO' ? v : 'ALEATORIO';
}
function EstufaBanhoRel_ebDecidirResultadoEfetivo_(resultadoDesejado, rand) {
  if (resultadoDesejado === 'APROVADO' || resultadoDesejado === 'REPROVADO') return resultadoDesejado;
  return rand() < 0.5 ? 'APROVADO' : 'REPROVADO';
}
function EstufaBanhoRel_ebEncontrarSegmentoSimulado_(ms, segmentos) {
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
function EstufaBanhoRel_ebCalcularTemperaturaBaseSimulada_(ms, segmento, alvo, faixa) {
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
      const pExc = 1 - distMs / meiaLargura; // 0 nas bordas da excursão, 1 no centro
      const curvaSuave = Math.sin(pExc * Math.PI / 2); // sobe e desce suavemente, sem degrau
      const alvoExcursao = segmento.excursaoLado > 0 ? faixa.tMax + segmento.excursaoAmplitude : faixa.tMin - segmento.excursaoAmplitude;
      return base + (alvoExcursao - base) * curvaSuave;
    }
  }
  return base;
}
function EstufaBanhoRel_ebCriarRandomSimulador_(seedText) {
  let h = 2166136261;
  const s = String(seedText || 'simulador');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function EstufaBanhoRel_ebRoundSimulador_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round(Number(n || 0) * p) / p;
}

/** Dados reconstituídos: o mesmo motor da medição decide o parecer. Nunca substitui status/critério. */
function EstufaBanhoRel_ebSegmentosControlados_(payload, configs, faixa, ini, fim, intervaloSeg, rand) {
  const sim = payload.simulacao || {}, q = payload.qualif || {};
  const numero = function (v, def) { return EstufaBanhoRel_ebParseNumeroMain_(v, def); };
  let min = faixa.tMin, max = faixa.tMax;
  if (payload.perfil === 'SECADORA_TRAQUEIAS') { min -= faixa.tolerancia; max += faixa.tolerancia; }
  const alvo = numero(sim.temperaturaAlvo, (min + max) / 2);
  if (alvo < min || alvo > max) throw new Error('Simulado: a temperatura alvo deve ficar dentro da faixa de aceitação do perfil. Confira a faixa e o alvo.');
  const configsIndividuais = [];
  configs.forEach(function (cfg) {
    (cfg.repeticoesJanelas || [cfg]).forEach(function (j) {
      configsIndividuais.push(Object.assign({}, cfg, j, { repeticoesJanelas: null }));
    });
  });
  const segmentos = configsIndividuais.map(function (cfg) {
    const tipo = cfg.tipoEstudo, evento = tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA';
    const penetracao = tipo === 'PENETRACAO_CARGA_E';
    const desejado = EstufaBanhoRel_ebNormalizarResultadoDesejado_(cfg.resultadoDesejado || (penetracao ? sim.resultadoPenetracao : sim.resultadoDistribuicao));
    const resultado = EstufaBanhoRel_ebDecidirResultadoEfetivo_(desejado, rand);
    const s = { tipoEstudo: tipo, inicioMs: cfg.janelaInicioMs, fimMs: cfg.janelaFimMs, resultadoEfetivo: resultado, min: min, max: max, alvo: alvo, evento: evento, penetracao: penetracao };
    if (s.inicioMs < ini || s.fimMs > fim) throw new Error('Simulado: o início e o fim do arquivo precisam cobrir todos os períodos dos estudos, sem cortar o ensaio.');
    s.primeiraMs = ini + Math.ceil((s.inicioMs - ini) / (intervaloSeg * 1000)) * intervaloSeg * 1000;
    s.ultimaMs = ini + Math.floor((s.fimMs - ini) / (intervaloSeg * 1000)) * intervaloSeg * 1000;
    if ((s.ultimaMs - s.primeiraMs) / (intervaloSeg * 1000) < 2) throw new Error('Simulado: cada período precisa conter pelo menos três leituras. Reduza o intervalo entre leituras.');
    if (evento) {
      s.inicioEventoMs = cfg.inicioEventoMs;
      const alvoMin = numero(cfg.tempoAlvoMinutos, null), recuperacao = numero(q.recuperacaoMaxMin, null);
      if (desejado !== 'ALEATORIO' && !(alvoMin > 0) && !(recuperacao > 0)) throw new Error('Simulado: para forçar o resultado de porta/energia, informe o tempo-alvo mínimo ou o limite de recuperação no protocolo. Sem critério, o resultado é informativo.');
      if (resultado === 'APROVADO' && alvoMin > 0 && s.ultimaMs - cfg.inicioEventoMs < alvoMin * 60000) throw new Error('Simulado: o período de porta/energia deve observar pelo menos o tempo-alvo mínimo. Amplie o fim do arquivo e do estudo.');
      s.falhaMs = ini + Math.ceil((cfg.inicioEventoMs - ini) / (intervaloSeg * 1000)) * intervaloSeg * 1000;
      if (resultado === 'REPROVADO' && alvoMin > 0 && s.falhaMs - cfg.inicioEventoMs >= alvoMin * 60000) throw new Error('Simulado: o intervalo entre leituras não permite representar a ruptura antes do tempo-alvo. Reduza o intervalo.');
    } else s.falhaMs = s.primeiraMs + Math.floor((s.ultimaMs - s.primeiraMs) / (intervaloSeg * 1000) / 2) * intervaloSeg * 1000;
    if (penetracao) {
      const letal = EstufaBanhoRel_EBCFG.LETALIDADE[cfg.tipoLetalidade];
      const minimo = numero(cfg.valorMinimoExigido, letal.valorLabel === 'FD' ? letal.fdMinimoNormativo : letal.fhMinimoSugerido);
      const minutos = (s.ultimaMs - s.primeiraMs) / 60000;
      if (!(minimo > 0)) throw new Error('Simulado: informe um mínimo de letalidade positivo.');
      const requerida = letal.tBase + letal.z * Math.log(minimo / minutos) / Math.LN10;
      s.alvo = resultado === 'REPROVADO' ? requerida - letal.z : Math.max(alvo, requerida + 0.2);
      if (resultado === 'APROVADO' && s.alvo > max) throw new Error('Simulado: a faixa e a duração não permitem atingir a letalidade mínima. Aumente o tempo ou confira a temperatura do protocolo; o parecer não será forçado.');
    }
    // Margem dimensionada pelos critérios do protocolo, não ruído fixo de até 1,3 °C.
    const margens = [0.12, Math.max(0, Math.min(s.alvo - min, max - s.alvo)) * 0.35];
    const uniforme = numero(q.limUniformidade, null), estabilidade = numero(q.limEstabilidade, null), desvio = numero(q.limDesvioSetpoint, null), setpoint = numero(q.setpoint, null);
    if (uniforme > 0) margens.push(uniforme / 4);
    if (estabilidade > 0) margens.push(estabilidade / 3);
    if (!penetracao && desvio > 0 && setpoint !== null) {
      if (Math.abs(s.alvo - setpoint) > desvio) throw new Error('Simulado: o alvo informado não atende ao limite de desvio da temperatura programada. Confira os dois campos.');
      margens.push(Math.max(0, desvio - Math.abs(s.alvo - setpoint)) / 3);
    }
    s.amplitude = Math.min.apply(null, margens);
    return s;
  });
  // Um único arquivo não pode aprovar e reprovar a mesma leitura em dois estudos sobrepostos.
  segmentos.forEach(function (s, i) { segmentos.slice(i + 1).forEach(function (outro) {
    if (Math.max(s.inicioMs, outro.inicioMs) <= Math.min(s.fimMs, outro.fimMs) && s.resultadoEfetivo !== outro.resultadoEfetivo) throw new Error('Simulado: estudos com resultados diferentes têm períodos sobrepostos. Separe os períodos ou escolha o mesmo resultado.');
  }); });
  return segmentos;
}
function EstufaBanhoRel_ebTemperaturaControlada_(ms, idx, sensor, s, alvo) {
  if (!s) return EstufaBanhoRel_ebRoundSimulador_(alvo, 4);
  // Penetração reprovada reduz toda a integral térmica; distribuição/evento têm excursão verificável.
  let t = s.alvo + s.amplitude * (0.5 * Math.sin(idx / 17) + 0.25 * Math.sin(sensor * 1.7 + idx / 29));
  if (!s.penetracao && s.resultadoEfetivo === 'REPROVADO' && ms >= s.falhaMs && (s.evento || ms <= s.falhaMs + 60000)) t = s.max + Math.max(1, (s.max - s.min) * 0.5);
  return EstufaBanhoRel_ebRoundSimulador_(t, 4);
}
