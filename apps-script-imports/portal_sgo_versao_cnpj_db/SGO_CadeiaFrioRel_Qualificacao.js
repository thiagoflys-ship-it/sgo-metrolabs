/****************************************************
 * METROLABS — CADEIA DE FRIO — QUALIFICAÇÃO TÉRMICA (motor revisado, 21/10/2026)
 *
 * Mesmo molde da Autoclave a vapor (SGO_AutoRel_*), com as regras da cadeia de frio:
 *  - o motor determinístico (SGO_CadeiaFrioRel_Engine.js) decide cada estudo; aqui se
 *    montam os critérios com a fonte, as estatísticas descritivas, a conferência do
 *    método do Anexo G e as travas que impedem a emissão (dado faltando ou incoerente,
 *    sensor parado, leitura impossível, lacuna, registrador sem cadastro ou vencido,
 *    evento iniciado com sensor fora da faixa, grandeza não medida sem justificativa);
 *  - a IA só redige; o texto passa pelo verificador comum (SGO_QualifIA_Verificador.js)
 *    e, se reprovar, vale o texto padrão determinístico montado aqui;
 *  - o pacote de fatos (contexto) é o mesmo para o relatório de ensaio (retrato), a
 *    planilha de dados (paisagem) e o resumo guardado para o relatório de qualificação.
 *
 * Critérios e normas ficam em CADEIAFRIO_QCFG com a fonte de cada um; a lista
 * CADEIAFRIO_QCFG.A_CONFIRMAR reúne o que o responsável técnico precisa confirmar.
 * Nenhum valor de norma foi inventado: o que não está no texto da norma lido pela
 * empresa (docs/REFERENCIA_NBR16328_2024_ANEXO_G.md) está marcado como critério da
 * empresa executante.
 ****************************************************/

var CADEIAFRIO_QCFG = {
  MODULO_ENSAIO: 'CADEIA_FRIO',
  MODULO_DADOS: 'CADEIA_FRIO_DADOS',
  // Modelos anteriores, preservados e desligados (só o Administrador religa em Chaves e senhas).
  PROP_PLANILHA_MODELO: 'CADEIAFRIO_PLANILHA_MODELO',
  PROP_RELATORIO_MODELO: 'CADEIAFRIO_RELATORIO_MODELO',
  // Pastas próprias do módulo (antes as chaves LAUDOS_FOLDER_ID e UPLOAD_FOLDER_ID eram genéricas e
  // podiam ser as mesmas de outro módulo no mesmo projeto).
  PROP_PASTA_LAUDOS: 'CADEIAFRIO_LAUDOS_FOLDER_ID',
  PROP_PASTA_UPLOADS: 'CADEIAFRIO_UPLOAD_PASTA_ID',
  NOME_PASTA_LAUDOS: 'Cadeia de Frio - Laudos',
  NOME_PASTA_UPLOADS: 'Cadeia de Frio - Uploads',
  // 21/10/2026: "ULTRA" só como ultracongelador/ultrafreezer; a lavadora ultrassônica não é da cadeia de frio.
  TIPO_EQUIPAMENTO_RE: /REFRIGER|FREEZER|CONGELADOR|CAMARA|GELADEIRA|CAIXA|ULTRA(?!SS?ON)|CONSERVA|VACINA|FRIO|FRIGOR/,

  EMISSAO: {
    perfisAprovadores: ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'],
    regraDecisao: 'Aceitação simples: o valor medido é comparado diretamente ao limite; a incerteza do registrador é informada, sem banda de guarda.'
  },

  // Únicas normas que o documento e a IA podem citar (edição conferida em docs/REFERENCIA_NBR16328_2024_ANEXO_G.md).
  NORMAS: {
    NBR16328: 'ABNT NBR 16328:2024 (3ª edição), Anexo G (informativo) — refrigeradores, freezers, câmaras frias e ultrafreezers: estudos de distribuição de temperatura, de abertura de porta e de queda de energia',
    RDC430: 'RDC ANVISA nº 430/2020 — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos',
    PNI: 'Manual de Rede de Frio do Programa Nacional de Imunizações — Ministério da Saúde, 5ª edição'
  },

  CRITERIOS: {
    tolerancia: { absorveExcursao: true, referencia: 'tolerância operacional do perfil, critério da empresa executante' },
    duracaoDistribuicao: { horas: 24, referencia: 'ABNT NBR 16328:2024, Anexo G (G.4 g e G.5): registro durante 24 h consecutivas a partir da estabilização' },
    intervaloDistribuicaoSeg: { valor: 60, referencia: 'ABNT NBR 16328:2024, Anexo G (G.4 g): registro a cada 60 s' },
    intervaloEventoSeg: { valor: 10, referencia: 'ABNT NBR 16328:2024, Anexo G (G.6 b e G.7 d): registro a cada 10 s' },
    monitoramentoPosEventoMin: { valor: 5, referencia: 'ABNT NBR 16328:2024, Anexo G (notas de G.6 e G.7): monitorar ao menos 5 min para demonstrar a estabilidade' },
    sensoresMinimos: { referencia: 'ABNT NBR 16328:2024, seção 15 (12 sensores a partir de 60 L; 3 abaixo de 60 L; 12 no equipamento conjugado), regra mantida pela empresa executante' },
    faixaNoInicioEvento: { trava: true, referencia: 'ABNT NBR 16328:2024, Anexo G (G.6 c e G.7 c): iniciar o estudo com todos os sensores na faixa de trabalho' },
    tempoAlvoEvento: { referencia: 'Critério de aceitação informado para o ensaio; a norma pede o registro do tempo, sem fixar valor (Anexo G, G.6 e G.7)' },
    recuperacao: { referencia: 'ABNT NBR 16328:2024, Anexo G (G.6 g): registro do tempo para todos os sensores voltarem à faixa' },
    autonomiaMinima: { referencia: 'Autonomia mínima informada para o ensaio (tempo de transporte exigido pelo contratante)' }
  },

  // Fonte da faixa de aceitação por perfil. Sem fonte própria: a faixa informada no protocolo do ensaio.
  FAIXA_FONTE: {
    CAMARA_VACINA_2_8: 'Manual de Rede de Frio do PNI (conservação de imunobiológicos entre +2 °C e +8 °C)',
    REFRIGERADOR_2_8: 'Faixa de conservação informada para os produtos armazenados (+2 °C a +8 °C)',
    CAIXA_TERMICA_2_8: 'Faixa de conservação informada para os produtos transportados (+2 °C a +8 °C)',
    padrao: 'Faixa de trabalho informada no protocolo do ensaio (perfil configurável)'
  },

  // Travas de qualidade dos dados (critério da empresa executante, revisável pelo responsável técnico).
  QUALIDADE_DADOS: {
    faixaFisicaC: [-100, 60],
    paradoMinLeituras: 30,
    paradoVariacaoProcessoC: 3,
    picoMinC: 10,
    minLeiturasEstudo: 5,
    maxLeiturasFaltandoPercent: 1,
    lacunaMaxIntervalos: 3,
    exigirRegistradorValido: true,
    exigirJustificativaSensorDesconsiderado: true
  },

  // Temperatura cinética média (MKT): informativa, sem critério. Valor convencional de energia de ativação.
  MKT: {
    calcular: true,
    perfis: ['CAMARA_VACINA_2_8', 'REFRIGERADOR_2_8', 'CAMARA_FRIA', 'CAIXA_TERMICA_2_8'],
    energiaAtivacaoKJmol: 83.144,
    constanteGasJmolK: 8.3144,
    fonte: 'valor convencional de energia de ativação (83,144 kJ/mol) usado no cálculo da temperatura cinética média de medicamentos'
  },

  // Planilha de dados: acima deste número de leituras num estudo, as tabelas mostram uma leitura a cada
  // intervalo da norma (os cálculos usam todas as leituras; o arquivo completo fica na pasta de envios).
  LEITURAS_MAX_IMPRESSAS: 2000,

  // O que o responsável técnico precisa confirmar (aparece no manual e no relatório da revisão).
  A_CONFIRMAR: [
    'Edição e título completo da ABNT NBR 16328 citada (no código antigo constava 2023; a leitura literal da norma usada pela empresa é da 3ª edição, de 29/02/2024).',
    'Mínimo de sensores: regra da seção 15 (12 a partir de 60 L, 3 abaixo de 60 L, 12 no conjugado) mantida por decisão do dono; o Anexo G cita no mínimo 12 sensores sem condicionar ao volume. Hoje é conferência do método, sem reprovar.',
    'Tolerância operacional de cada perfil (0,5 °C a 2,0 °C): excursão dentro dela é aceita e registrada como observação.',
    'Faixas dos perfis configuráveis (câmara fria, freezers e ultrafreezers) e a fonte da faixa de cada perfil.',
    'Duração de 24 h, intervalo de 60 s (distribuição) e de 10 s (porta e energia) e monitoramento de 5 min após o evento: hoje aparecem como desvio do método, sem reprovar.',
    'Travas de qualidade dos dados: faixa física de −100 °C a 60 °C, sensor parado (30 leituras iguais com variação de 3 °C nos demais), pico isolado de 10 °C, lacuna maior que 3 intervalos e até 1 % de leituras faltando por sensor.',
    'Temperatura cinética média (MKT) com energia de ativação de 83,144 kJ/mol, só informativa.',
    'Periodicidade padrão da requalificação no relatório de qualificação (12 meses) e lista de verificação da instalação.',
    'Citação do Manual de Rede de Frio do PNI (5ª edição) para o perfil de câmara de conservação de imunobiológicos.'
  ]
};

/* ============================================================
 * Utilitários
 * ============================================================ */

function CadeiaFrioRel_qS_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function CadeiaFrioRel_qV_(v, casas, un) { return SGO_DocA4_val_(v, casas, un); }
/** Justificativa digitada no meio da frase: inicial minúscula (sem mexer em sigla). */
function CadeiaFrioRel_qFrase_(t) {
  var s = CadeiaFrioRel_qS_(t).replace(/[.\s]+$/, '');
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function CadeiaFrioRel_qR_(n, d) { var p = Math.pow(10, d || 0); return Math.round((Number(n) || 0) * p) / p; }

function CadeiaFrioRel_qEhDistribuicao_(t) { return t === 'DISTRIBUICAO_VAZIO' || t === 'DISTRIBUICAO_CARGA'; }
function CadeiaFrioRel_qEhEvento_(t) { return t === 'ABERTURA_PORTA' || t === 'QUEDA_ENERGIA'; }

function CadeiaFrioRel_qRotuloEstudo_(t) {
  return ({ DISTRIBUICAO_VAZIO: 'Distribuição de temperatura em vazio', DISTRIBUICAO_CARGA: 'Distribuição de temperatura com carga', ABERTURA_PORTA: 'Abertura de porta', QUEDA_ENERGIA: 'Queda de energia', AUTONOMIA: 'Autonomia (caixa térmica)' })[t] || t;
}

/** Só a hora (hh:mm:ss) de "dd/mm/aaaa hh:mm:ss". */
function CadeiaFrioRel_qHora_(tempoStr) {
  var m = String(tempoStr || '').match(/(\d{1,2}:\d{2}(:\d{2})?)\s*$/);
  return m ? m[1] : (String(tempoStr || '') || '—');
}

/** Duração em minutos → "23 h 59 min" / "12 min" / "45 s". */
function CadeiaFrioRel_qDuracao_(min) {
  var m = Number(min);
  if (!isFinite(m)) return '—';
  if (m < 1) return SGO_DocA4_num_(Math.round(m * 60), 0) + ' s';
  var h = Math.floor(m / 60), r = Math.round(m - h * 60);
  if (r === 60) { h++; r = 0; }
  return h ? (h + ' h' + (r ? ' ' + r + ' min' : '')) : (r + ' min');
}

function CadeiaFrioRel_qLeitura_(row, s) {
  var v = row && row.temperaturas ? row.temperaturas[s] : null;
  if (v === null || v === undefined || v === '') return null;
  var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}

function CadeiaFrioRel_qMs_(row) {
  var d = row && row.tempoDate;
  if (d && typeof d.getTime === 'function' && isFinite(d.getTime())) return d.getTime();
  var p = CadeiaFrioRel_cfConverterTempoParaMs_(row && row.tempoStr);
  return isFinite(p) ? p : NaN;
}

/* ============================================================
 * Estatística descritiva, MKT e margem até o limite
 * ============================================================ */

/** { n, min, max, media, mediana, desvio (populacional), amplitude, maxMin, mediaMin, maxMedia } de uma lista. */
function CadeiaFrioRel_qEstatistica_(valores) {
  var v = (valores || []).filter(function (x) { return x !== null && isFinite(x); }).slice().sort(function (a, b) { return a - b; });
  var n = v.length;
  if (!n) return null;
  var soma = 0;
  v.forEach(function (x) { soma += x; });
  var media = soma / n;
  var q = 0;
  v.forEach(function (x) { q += (x - media) * (x - media); });
  var mediana = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  var r2 = function (x) { return CadeiaFrioRel_qR_(x, 2); };
  return {
    n: n, min: r2(v[0]), max: r2(v[n - 1]), media: r2(media), mediana: r2(mediana), desvio: r2(Math.sqrt(q / n)),
    amplitude: r2(v[n - 1] - v[0]), maxMin: r2(v[n - 1] - v[0]), mediaMin: r2(media - v[0]), maxMedia: r2(v[n - 1] - media)
  };
}

/**
 * Temperatura cinética média (°C): Tk = (ΔH/R) / (−ln(Σ e^(−ΔH/(R·Ti)) / n)), Ti em kelvin.
 * Com ΔH = 83,144 kJ/mol e R = 8,3144 J/(mol·K), ΔH/R = 10 000 K. Devolve null sem leituras.
 */
function CadeiaFrioRel_qMkt_(valores, cfgMkt) {
  cfgMkt = cfgMkt || CADEIAFRIO_QCFG.MKT;
  var l = (valores || []).filter(function (x) { return x !== null && isFinite(x); });
  if (!l.length) return null;
  var hr = (Number(cfgMkt.energiaAtivacaoKJmol) * 1000) / Number(cfgMkt.constanteGasJmolK);
  var soma = 0;
  l.forEach(function (t) { soma += Math.exp(-hr / (t + 273.15)); });
  var tk = hr / (-Math.log(soma / l.length));
  return tk - 273.15;
}

/* ============================================================
 * Recorte avaliado de cada estudo
 * ============================================================ */

/** Leituras que entram no julgamento: distribuição depois da rampa, evento desde o início do evento, autonomia inteira. */
function CadeiaFrioRel_qFatiaAvaliada_(analise) {
  var t = String(analise.tipoEstudo || '').toUpperCase();
  var fatia = analise._dadosFatia || [];
  if (CadeiaFrioRel_qEhDistribuicao_(t)) return fatia.slice(analise.idxInicioAvaliado || 0);
  if (CadeiaFrioRel_qEhEvento_(t)) return analise._dadosDesdeInicioEvento || fatia;
  return fatia;
}

/** Mediana do intervalo entre leituras (minutos) de um recorte. */
function CadeiaFrioRel_qIntervaloMin_(linhas) {
  var d = [];
  for (var i = 1; i < linhas.length; i++) {
    var a = CadeiaFrioRel_qMs_(linhas[i - 1]), b = CadeiaFrioRel_qMs_(linhas[i]);
    if (isFinite(a) && isFinite(b) && b > a) d.push((b - a) / 60000);
  }
  if (!d.length) return null;
  d.sort(function (x, y) { return x - y; });
  return d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
}

/* ============================================================
 * Travas de qualidade dos dados (por estudo)
 * Cada trava diz o que aconteceu, por que impede o documento e como corrigir.
 * ============================================================ */

function CadeiaFrioRel_qQualidadeEstudo_(analise, ativosIdx, rotulo) {
  var q = CADEIAFRIO_QCFG.QUALIDADE_DADOS;
  var num = SGO_DocA4_num_;
  var out = { travas: [], alertas: [] };
  var linhas = CadeiaFrioRel_qFatiaAvaliada_(analise);
  var pre = rotulo + ': ';
  var comoSensor = 'Se o sensor falhou durante o ensaio, desmarque-o em "Sensores" (seção 3), escreva o motivo em "Justificativa dos sensores desconsiderados" e registre a falha nas observações; se o arquivo saiu errado, exporte de novo do registrador e envie.';
  function trava(codigo, oQue, porQue, comoCorrigir) { out.travas.push({ codigo: codigo, estudo: analise.tipoEstudo, oQue: pre + oQue, porQue: porQue, comoCorrigir: comoCorrigir }); }

  if (analise.janelaInvalida) {
    var j = analise.janelaInvalida;
    out.travas.push({ codigo: j.codigo, estudo: analise.tipoEstudo, oQue: pre + j.oQue, porQue: j.porQue, comoCorrigir: j.comoCorrigir });
  }
  if (linhas.length < (Number(q.minLeiturasEstudo) || 5)) {
    trava('POUCAS_LEITURAS', 'o trecho avaliado tem só ' + linhas.length + ' leitura(s) por sensor.', 'Com tão poucas leituras os tempos e as estatísticas do estudo ficam sem base.', 'Confira os horários do estudo na seção 3 e se o arquivo do registrador cobre todo o período.');
    return out;
  }
  var ms = linhas.map(CadeiaFrioRel_qMs_);
  var media = linhas.map(function (r, i) {
    var l = ativosIdx.map(function (s) { return CadeiaFrioRel_qLeitura_(r, s); }).filter(function (x) { return x !== null; });
    var m = 0; l.forEach(function (x) { m += x; });
    return { ms: ms[i], t: l.length ? m / l.length : null };
  });
  var maxFaltaPct = Number(q.maxLeiturasFaltandoPercent) || 0;
  ativosIdx.forEach(function (s) {
    var nome = 'S' + (s + 1);
    var serie = linhas.map(function (r, i) { return { ms: ms[i], t: CadeiaFrioRel_qLeitura_(r, s) }; });
    var qs = SGO_QT_qualidadeSensor_(serie, {
      faixaFisica: q.faixaFisicaC, paradoMinLeituras: q.paradoMinLeituras, paradoVariacaoProcesso: q.paradoVariacaoProcessoC,
      picoMin: q.picoMinC, referencia: ativosIdx.length > 1 ? media : null
    });
    if (qs.foraFaixa.length) {
      var p = qs.foraFaixa[0];
      trava('LEITURA_IMPOSSIVEL', 'o sensor ' + nome + ' registrou ' + qs.foraFaixa.length + ' leitura(s) fora da faixa possível; a primeira, ' + num(p.t, 2) + ' °C em ' + linhas[p.i].tempoStr + '.',
        'Leitura fora de ' + num(q.faixaFisicaC[0], 0) + ' °C a ' + num(q.faixaFisicaC[1], 0) + ' °C indica sensor desconectado, danificado ou arquivo exportado com erro; usar esses valores falsearia o resultado.', comoSensor);
    }
    if (qs.parado.length) {
      var pp = qs.parado[0];
      trava('SENSOR_PARADO', 'o sensor ' + nome + ' ficou com o mesmo valor (' + num(pp.t, 2) + ' °C) em ' + (pp.i1 - pp.i0 + 1) + ' leituras seguidas, de ' + linhas[pp.i0].tempoStr + ' a ' + linhas[pp.i1].tempoStr + ', enquanto os outros sensores variaram.',
        'Valor que não acompanha a temperatura dos demais pontos indica sensor travado ou desconectado.', comoSensor);
    }
    if (qs.picos.length) {
      var pk = qs.picos[0];
      trava('PICO_ISOLADO', 'o sensor ' + nome + ' tem ' + qs.picos.length + ' pico(s) isolado(s); o primeiro, ' + num(pk.t, 2) + ' °C em ' + linhas[pk.i].tempoStr + ' (diferente das leituras vizinhas em mais de ' + num(q.picoMinC, 0) + ' °C).',
        'Um pico isolado no trecho avaliado altera o resultado do estudo sem representar a temperatura real.', comoSensor);
    }
    var falta = 0, primeira = -1;
    serie.forEach(function (x, i) { if (x.t === null) { falta++; if (primeira < 0) primeira = i; } });
    var limite = Math.floor(linhas.length * maxFaltaPct / 100);
    if (falta > limite) {
      trava('LEITURA_FALTANDO', 'o sensor ' + nome + ' não tem ' + falta + ' de ' + linhas.length + ' leituras do trecho avaliado (a primeira falta em ' + linhas[primeira].tempoStr + ').',
        'Acima de ' + num(maxFaltaPct, 0) + ' % de leituras faltando, o comportamento do ponto não fica demonstrado.',
        'No modo um arquivo por sensor, confira se o arquivo do sensor cobre todo o estudo e se os relógios dos registradores estavam acertados; no arquivo único, confira a coluna do sensor. Se o sensor falhou, desmarque-o e justifique.');
    }
  });
  var intervalo = CadeiaFrioRel_qIntervaloMin_(linhas);
  var maxGap = (Number(q.lacunaMaxIntervalos) || 3) * (intervalo || 1) * 60000;
  for (var i = 1; i < linhas.length; i++) {
    if (isFinite(ms[i]) && isFinite(ms[i - 1]) && ms[i] - ms[i - 1] > maxGap) {
      trava('LACUNA', 'há um intervalo sem leituras de ' + linhas[i - 1].tempoStr + ' a ' + linhas[i].tempoStr + '.',
        'Um intervalo maior que ' + (Number(q.lacunaMaxIntervalos) || 3) + ' vezes o intervalo normal de leitura esconde o que aconteceu com a temperatura naquele trecho.',
        'Confira se o arquivo do registrador está completo (exporte de novo, sem filtros) e envie.');
      break;
    }
  }
  if (CadeiaFrioRel_qEhEvento_(analise.tipoEstudo) && (analise.foraDaFaixaNoInicio || []).length && !analise.janelaInvalida && CADEIAFRIO_QCFG.CRITERIOS.faixaNoInicioEvento.trava) {
    var lista = analise.foraDaFaixaNoInicio.map(function (x) { return x.sensor + ' (' + num(x.valor, 2) + ' °C)'; }).join(', ');
    trava('EVENTO_INICIADO_FORA_DA_FAIXA', 'no início do evento (' + analise.tempoInicioEvento + ') havia sensor fora da faixa de aceitação: ' + lista + '.',
      'O estudo começa com todos os sensores na faixa de trabalho; começando fora, o tempo até sair da faixa não mede o equipamento (por exemplo, o estudo de energia começou antes da recuperação da abertura de porta).',
      'Marque o início do evento num horário em que todos os sensores já estavam na faixa (veja o gráfico na prévia dos dados) ou repita o estudo depois da estabilização.');
  }
  return out;
}

/** Travas do registrador (rastreabilidade), no mesmo padrão da Autoclave. */
function CadeiaFrioRel_qTravasRegistrador_(registradores, simulado) {
  var q = CADEIAFRIO_QCFG.QUALIDADE_DADOS;
  if (simulado || q.exigirRegistradorValido === false) return [];
  var travas = [];
  var itens = (registradores && registradores.itens) || [];
  if (!itens.length) {
    travas.push({ codigo: 'REGISTRADOR_NAO_INFORMADO', campo: 'certDataLogger', oQue: 'O registrador de dados usado no ensaio não foi informado.',
      porQue: 'Sem ele não há como demonstrar a rastreabilidade metrológica das temperaturas.',
      comoCorrigir: 'Preencha "Identificação do registrador" na seção 4 com a identificação cadastrada em Padrões de referência (ex.: DTL-01).' });
  }
  itens.forEach(function (it) {
    if (!it.encontrado) {
      travas.push({ codigo: 'REGISTRADOR_NAO_CADASTRADO', campo: 'certDataLogger', oQue: 'O registrador "' + it.tag + '" não está no cadastro de padrões.',
        porQue: 'Sem o cadastro não é possível conferir o certificado de calibração e a validade.',
        comoCorrigir: 'Cadastre o registrador em Cadastros › Padrões de referência (com o certificado e a validade) ou corrija a identificação digitada.' });
    } else if (it.conforme === false) {
      travas.push({ codigo: 'REGISTRADOR_VENCIDO', campo: 'certDataLogger', oQue: 'O certificado de calibração do registrador ' + it.tag + ' (' + (it.certificado || 'sem número') + ') estava vencido na data do ensaio (' + (registradores.dataReferencia ? 'ensaio em ' + registradores.dataReferencia + ', ' : '') + 'validade ' + it.validade + ').',
        porQue: 'Medição feita com instrumento fora da validade de calibração não tem rastreabilidade.',
        comoCorrigir: 'Se o certificado foi renovado antes do ensaio: no menu Calibração › Padrões de referência, procure ' + it.tag + ', clique em Editar, atualize o número do certificado, a validade (dd/mm/aaaa) e o PDF do certificado novo, salve e gere de novo. Se não foi renovado, o ensaio precisa ser repetido com registrador calibrado.' });
    } else if (it.conforme === null) {
      travas.push({ codigo: 'REGISTRADOR_SEM_VALIDADE', campo: 'certDataLogger', oQue: 'O registrador ' + it.tag + ' está cadastrado sem a validade do certificado de calibração.',
        porQue: 'Sem a validade não dá para confirmar que a calibração cobria a data do ensaio.',
        comoCorrigir: 'Informe a validade do certificado em Cadastros › Padrões de referência.' });
    }
  });
  return travas;
}

/* ============================================================
 * Grandezas e estudos não medidos (seletor com justificativa)
 * ============================================================ */

/**
 * payload.grandezas = { umidade: { medida, min, max, justificativa }, aberturaPorta: { justificativa }, quedaEnergia: { justificativa } }.
 * Porta e energia só pedem justificativa quando o perfil prevê o estudo e ele não foi incluído.
 */
function CadeiaFrioRel_qGrandezas_(payload, perfilCfg, estudosTipos) {
  var g = payload.grandezas || {};
  var disp = (perfilCfg && perfilCfg.estudosDisponiveis) || [];
  var u = g.umidade || {};
  var medida = u.medida === true || String(u.medida).toUpperCase() === 'SIM';
  var nUm = function (x) { var n = Number(String(x == null ? '' : x).replace(',', '.')); return String(x == null ? '' : x).trim() !== '' && isFinite(n) ? n : null; };
  var out = {
    umidade: { medida: medida, min: medida ? nUm(u.min) : null, max: medida ? nUm(u.max) : null, justificativa: medida ? '' : CadeiaFrioRel_qS_(u.justificativa) },
    aberturaPorta: { aplicavel: disp.indexOf('ABERTURA_PORTA') >= 0, realizado: estudosTipos.indexOf('ABERTURA_PORTA') >= 0, justificativa: CadeiaFrioRel_qS_((g.aberturaPorta || {}).justificativa) },
    quedaEnergia: { aplicavel: disp.indexOf('QUEDA_ENERGIA') >= 0, realizado: estudosTipos.indexOf('QUEDA_ENERGIA') >= 0, justificativa: CadeiaFrioRel_qS_((g.quedaEnergia || {}).justificativa) }
  };
  var travas = [];
  if (!medida && out.umidade.justificativa.length < 10) {
    travas.push({ codigo: 'GRANDEZA_SEM_JUSTIFICATIVA', campo: 'umidadeJustificativa', oQue: 'A umidade relativa foi marcada como não medida, sem a justificativa.',
      porQue: 'O documento precisa dizer por que a grandeza ficou fora do ensaio (escopo e limitações).',
      comoCorrigir: 'Na seção 3 (Estudos do ensaio), no bloco "Grandezas e estudos não realizados", preencha o campo "Por que a umidade não foi medida", ao lado de "Umidade relativa" (ao menos 10 caracteres), por exemplo: "registrador só de temperatura; a umidade não é controlada neste equipamento".' });
  }
  if (medida && (out.umidade.min === null || out.umidade.max === null || out.umidade.min > out.umidade.max || out.umidade.min < 0 || out.umidade.max > 100)) {
    travas.push({ codigo: 'UMIDADE_INCOMPLETA', campo: 'umidadeMin', oQue: 'A umidade relativa foi marcada como medida, mas a mínima e a máxima registradas não foram informadas corretamente (0 % a 100 %).',
      porQue: 'Sem os valores a grandeza não pode aparecer no documento.',
      comoCorrigir: 'Na seção 3, informe a umidade relativa mínima e máxima registradas pelo registrador, ou marque a umidade como não medida e justifique.' });
  }
  [['aberturaPorta', 'abertura de porta'], ['quedaEnergia', 'queda de energia']].forEach(function (par) {
    var x = out[par[0]];
    if (x.aplicavel && !x.realizado && x.justificativa.length < 10) {
      travas.push({ codigo: 'ESTUDO_SEM_JUSTIFICATIVA', campo: par[0] === 'aberturaPorta' ? 'portaJustificativa' : 'energiaJustificativa', oQue: 'O estudo de ' + par[1] + ' está previsto para este tipo de equipamento e não foi incluído, sem a justificativa.',
        porQue: 'O documento precisa dizer por que o estudo ficou fora do ensaio (escopo e limitações).',
        comoCorrigir: 'Inclua o estudo na seção 3 ou escreva o motivo em "Grandezas e estudos não realizados" (ao menos 10 caracteres).' });
    }
  });
  return { grandezas: out, travas: travas };
}

/** Termos que a IA não pode usar quando a grandeza ou o estudo não foi medido (frase do escopo já explica). */
function CadeiaFrioRel_qTermosProibidos_(g) {
  var t = [];
  if (g && !g.umidade.medida) t.push(/umidade/i);
  if (g && !g.aberturaPorta.realizado) t.push(/abertura\s+(da|de)\s+porta|porta\s+aberta/i);
  if (g && !g.quedaEnergia.realizado) t.push(/(queda|falta|interrup[cç][aã]o)\s+(de|da|no\s+fornecimento\s+de)\s+energia/i);
  return t;
}

/* ============================================================
 * Critérios de cada estudo
 * ============================================================ */

function CadeiaFrioRel_qFaixaFonte_(chavePerfil) {
  return CADEIAFRIO_QCFG.FAIXA_FONTE[chavePerfil] || CADEIAFRIO_QCFG.FAIXA_FONTE.padrao;
}

function CadeiaFrioRel_qCriteriosEstudo_(analise, faixa, chavePerfil, extra) {
  var C = CADEIAFRIO_QCFG.CRITERIOS;
  var t = String(analise.tipoEstudo || '').toUpperCase();
  var rot = CadeiaFrioRel_qRotuloEstudo_(t);
  var st = CadeiaFrioRel_cfNormalizarStatus_(analise.statusAprovacao);
  var val = CadeiaFrioRel_qV_;
  var faixaTxt = val(faixa.tMin, 1, '°C') + ' a ' + val(faixa.tMax, 1, '°C');
  var tol = Number(faixa.tolerancia) || 0;
  var lista = [];
  function add(o) { lista.push(Object.assign({ estudo: rot, tipoEstudo: t, decide: false, metodo: false, naoAvaliado: false }, o)); }
  var intervaloSeg = extra.intervaloMin !== null && isFinite(extra.intervaloMin) ? extra.intervaloMin * 60 : null;

  if (CadeiaFrioRel_qEhDistribuicao_(t)) {
    var g = analise.statsGlobal || {};
    var pior = analise.piorSensor;
    add({ chave: 'faixa', decide: true, criterio: 'Temperatura na faixa de aceitação',
      requisito: 'Todas as leituras dos sensores ativos entre ' + faixaTxt + (tol > 0 && C.tolerancia.absorveExcursao ? '; afastamento de até ' + val(tol, 1, '°C') + ' além da faixa é aceito e registrado' : ''),
      referencia: CadeiaFrioRel_qFaixaFonte_(chavePerfil) + (tol > 0 ? '; ' + C.tolerancia.referencia : ''),
      obtido: 'Mínima ' + val(g.min, 2, '°C') + ' e máxima ' + val(g.max, 2, '°C') + (pior ? '; maior afastamento de ' + val(pior.desvio, 2, '°C') + ' no sensor ' + pior.sensor + ' (' + pior.tempoStr + ')' : ''),
      conforme: st !== 'REPROVADO' });
    var durMin = analise.tempoEfetivoAvaliadoMinutos;
    add({ chave: 'duracao', metodo: true, criterio: 'Duração do estudo após a estabilização',
      requisito: C.duracaoDistribuicao.horas + ' h consecutivas', referencia: C.duracaoDistribuicao.referencia,
      obtido: CadeiaFrioRel_qDuracao_(durMin), conforme: isFinite(durMin) && durMin >= (analise.duracaoMinimaMinutos || C.duracaoDistribuicao.horas * 60) });
    add({ chave: 'intervalo', metodo: true, criterio: 'Intervalo entre leituras',
      requisito: 'Até ' + val(C.intervaloDistribuicaoSeg.valor, 0, 's'), referencia: C.intervaloDistribuicaoSeg.referencia,
      obtido: intervaloSeg === null ? '—' : val(intervaloSeg, 0, 's'), conforme: intervaloSeg !== null && intervaloSeg <= C.intervaloDistribuicaoSeg.valor + 0.5 });
    add({ chave: 'sensores', metodo: true, criterio: 'Quantidade de sensores',
      requisito: 'Ao menos ' + extra.sensoresMinimos + ' sensores', referencia: C.sensoresMinimos.referencia,
      obtido: extra.sensoresAtivos + ' sensor' + (extra.sensoresAtivos === 1 ? '' : 'es') + ' considerado' + (extra.sensoresAtivos === 1 ? '' : 's') + ' de ' + extra.sensoresInstalados + ' instalado' + (extra.sensoresInstalados === 1 ? '' : 's'),
      conforme: extra.sensoresAtivos >= extra.sensoresMinimos });
  } else if (CadeiaFrioRel_qEhEvento_(t)) {
    var energia = t === 'QUEDA_ENERGIA';
    var alvo = analise.tempoAlvoMinutos;
    var r = analise.primeiraRuptura;
    var obtidoEv = analise.rompeu
      ? 'Saiu da faixa após ' + val(analise.tempoAteRupturaMinutos, 1, 'min') + (r ? ' (sensor ' + r.sensor + ', ' + val(r.valor, 2, '°C') + ', ' + r.tempoStr + ')' : '')
      : 'Permaneceu na faixa durante os ' + val(analise.minutosMonitoradosDesdeInicio, 1, 'min') + ' registrados a partir do início do evento';
    if (alvo !== null && isFinite(alvo)) {
      add({ chave: 'tempoAlvo', decide: true, criterio: energia ? 'Tempo na faixa sem energia elétrica' : 'Tempo na faixa com a porta aberta',
        requisito: 'Ao menos ' + val(alvo, 0, 'min') + ' na faixa ' + faixaTxt + ' a partir do início do evento', referencia: C.tempoAlvoEvento.referencia,
        obtido: obtidoEv, conforme: st === 'APROVADO' });
    } else {
      add({ chave: 'tempoAlvo', decide: true, naoAvaliado: true, criterio: energia ? 'Tempo na faixa sem energia elétrica' : 'Tempo na faixa com a porta aberta',
        requisito: 'Sem tempo-alvo informado: o tempo é registrado (caracterização)', referencia: C.tempoAlvoEvento.referencia,
        obtido: 'Não avaliado: tempo-alvo não informado. ' + obtidoEv + '.', conforme: null });
    }
    add({ chave: 'inicioNaFaixa', metodo: true, criterio: 'Sensores na faixa no início do evento', requisito: 'Todos os sensores ativos na faixa', referencia: C.faixaNoInicioEvento.referencia,
      obtido: (analise.foraDaFaixaNoInicio || []).length ? 'Fora da faixa: ' + analise.foraDaFaixaNoInicio.map(function (x) { return x.sensor; }).join(', ') : 'Todos na faixa',
      conforme: !(analise.foraDaFaixaNoInicio || []).length });
    add({ chave: 'intervalo', metodo: true, criterio: 'Intervalo entre leituras', requisito: 'Até ' + val(C.intervaloEventoSeg.valor, 0, 's'), referencia: C.intervaloEventoSeg.referencia,
      obtido: intervaloSeg === null ? '—' : val(intervaloSeg, 0, 's'), conforme: intervaloSeg !== null && intervaloSeg <= C.intervaloEventoSeg.valor + 0.5 });
    add({ chave: 'monitoramento', metodo: true, criterio: 'Monitoramento depois do evento', requisito: 'Ao menos ' + val(C.monitoramentoPosEventoMin.valor, 0, 'min'), referencia: C.monitoramentoPosEventoMin.referencia,
      obtido: val(analise.minutosMonitoradosAposEvento, 1, 'min'), conforme: Number(analise.minutosMonitoradosAposEvento) >= C.monitoramentoPosEventoMin.valor });
  } else if (t === 'AUTONOMIA') {
    var alvoA = analise.tempoAlvoMinutos;
    var obtidoA = analise.rompeu ? 'Saiu da faixa após ' + val(analise.autonomiaMinutos, 1, 'min') + (analise.primeiraRuptura ? ' (sensor ' + analise.primeiraRuptura.sensor + ', ' + analise.primeiraRuptura.tempoStr + ')' : '')
      : 'Permaneceu na faixa durante todo o período gravado (' + val(analise.tempoTotalGravadoMinutos, 1, 'min') + ')';
    if (alvoA !== null && isFinite(alvoA) && alvoA > 0 && !analise.criterioNaoDemonstrado) {
      add({ chave: 'autonomia', decide: true, criterio: 'Autonomia na faixa de aceitação', requisito: 'Ao menos ' + val(alvoA, 0, 'min') + ' na faixa ' + faixaTxt, referencia: C.autonomiaMinima.referencia, obtido: obtidoA, conforme: st === 'APROVADO' });
    } else {
      add({ chave: 'autonomia', decide: true, naoAvaliado: true, criterio: 'Autonomia na faixa de aceitação',
        requisito: alvoA ? 'Ao menos ' + val(alvoA, 0, 'min') + ' na faixa ' + faixaTxt : 'Sem autonomia mínima informada: o tempo é registrado (caracterização)', referencia: C.autonomiaMinima.referencia,
        obtido: 'Não avaliado: ' + (alvoA ? 'o período gravado é menor que a autonomia exigida. ' : 'autonomia mínima não informada. ') + obtidoA + '.', conforme: null });
    }
  }
  return lista;
}

/* ============================================================
 * Fatos de cada estudo (estatísticas do trecho avaliado, por sensor, MKT, tempos)
 * ============================================================ */

function CadeiaFrioRel_qFatosEstudo_(analise, ativosIdx, chavePerfil, faixa, registradores) {
  var t = String(analise.tipoEstudo || '').toUpperCase();
  var linhas = CadeiaFrioRel_qFatiaAvaliada_(analise);
  var todos = [];
  var porSensor = ativosIdx.map(function (s) {
    var vals = linhas.map(function (r) { return CadeiaFrioRel_qLeitura_(r, s); });
    vals.forEach(function (v) { if (v !== null) todos.push(v); });
    var e = CadeiaFrioRel_qEstatistica_(vals) || {};
    return { sensor: 'S' + (s + 1), indice: s, n: e.n || 0, min: e.min, max: e.max, media: e.media, desvio: e.desvio, amplitude: e.amplitude };
  });
  var global = CadeiaFrioRel_qEstatistica_(todos);
  var mktCfg = CADEIAFRIO_QCFG.MKT;
  var mkt = null;
  if (mktCfg.calcular && mktCfg.perfis.indexOf(chavePerfil) >= 0 && (CadeiaFrioRel_qEhDistribuicao_(t) || t === 'AUTONOMIA')) {
    var m = CadeiaFrioRel_qMkt_(todos, mktCfg);
    if (m !== null) mkt = CadeiaFrioRel_qR_(m, 2);
    porSensor.forEach(function (ps) {
      var mm = CadeiaFrioRel_qMkt_(linhas.map(function (r) { return CadeiaFrioRel_qLeitura_(r, ps.indice); }), mktCfg);
      ps.mkt = mm === null ? null : CadeiaFrioRel_qR_(mm, 2);
    });
  }
  // Proximidade dos limites em relação à incerteza do registrador (informativo; a regra é a aceitação simples).
  var us = ((registradores && registradores.itens) || []).map(function (i) { return i.incertezaU95; }).filter(function (u) { return typeof u === 'number' && isFinite(u) && u > 0 && u < 5; });
  var u95 = us.length ? Math.max.apply(null, us) : null;
  var pertoDoLimite = 0;
  if (u95 !== null) todos.forEach(function (v) { if ((v >= faixa.tMin && v - faixa.tMin < u95) || (v <= faixa.tMax && faixa.tMax - v < u95)) pertoDoLimite++; });
  var intervaloMin = CadeiaFrioRel_qIntervaloMin_(linhas);
  var f = {
    leiturasAvaliadas: linhas.length,
    inicioAvaliado: linhas.length ? linhas[0].tempoStr : '',
    fimAvaliado: linhas.length ? linhas[linhas.length - 1].tempoStr : '',
    intervaloLeiturasSegundos: intervaloMin === null ? null : CadeiaFrioRel_qR_(intervaloMin * 60, 1),
    estatisticas: global,
    porSensor: porSensor,
    mkt: mkt,
    incertezaRegistrador: u95,
    leiturasPertoDoLimite: u95 !== null ? pertoDoLimite : null,
    conformidadePorSensor: (analise.conformidadePorSensor || []).map(function (c) {
      return { sensor: c.sensor, min: c.min, max: c.max, media: c.media, piorDesvioAbaixo: c.piorDesvioAbaixo, piorDesvioAcima: c.piorDesvioAcima, minutosForaFaixa: c.minutosForaFaixa, percentualForaFaixa: c.percentualForaFaixa, statusSensor: c.statusSensor };
    })
  };
  if (CadeiaFrioRel_qEhDistribuicao_(t)) {
    f.periodoInicio = analise.tempoInicio;
    f.periodoFim = analise.tempoFim;
    f.duracaoTotalMinutos = analise.tempoTotalMinutos;
    f.duracaoAvaliadaMinutos = analise.tempoEfetivoAvaliadoMinutos;
    f.piorSensor = analise.piorSensor ? { sensor: analise.piorSensor.sensor, valor: analise.piorSensor.valor, tempoStr: analise.piorSensor.tempoStr, desvio: analise.piorSensor.desvio } : null;
    f.excursaoDentroTolerancia = !!analise.excursaoDentroTolerancia;
    f.rampa = analise.rampaEstabilizacao ? { fim: analise.rampaEstabilizacao.fimRampaStr, duracaoMinutos: analise.rampaEstabilizacao.duracaoMinutos, temperaturaInicial: analise.rampaEstabilizacao.temperaturaInicial } : null;
  } else if (CadeiaFrioRel_qEhEvento_(t)) {
    f.inicioEvento = analise.tempoInicioEvento;
    f.fimEvento = analise.tempoFimEvento;
    f.duracaoEventoMinutos = analise.duracaoEventoMinutos;
    f.tipoAbertura = analise.tipoAbertura || null;
    f.rompeu = !!analise.rompeu;
    f.tempoAteRupturaMinutos = analise.tempoAteRupturaMinutos;
    f.ruptura = analise.primeiraRuptura ? { sensor: analise.primeiraRuptura.sensor, valor: analise.primeiraRuptura.valor, tempoStr: analise.primeiraRuptura.tempoStr } : null;
    f.recuperouTotalmente = !!analise.recuperouTotalmente;
    f.tempoAteRecuperacaoMinutos = analise.tempoAteRecuperacaoMinutos;
    f.tempoAlvoMinutos = analise.tempoAlvoMinutos;
    f.minutosMonitoradosAposEvento = analise.minutosMonitoradosAposEvento;
  } else if (t === 'AUTONOMIA') {
    f.periodoInicio = analise.tempoInicio;
    f.periodoFim = analise.tempoFim;
    f.duracaoTotalMinutos = analise.tempoTotalGravadoMinutos;
    f.rompeu = !!analise.rompeu;
    f.autonomiaMinutos = analise.autonomiaMinutos;
    f.tempoAlvoMinutos = analise.tempoAlvoMinutos;
    f.ruptura = analise.primeiraRuptura ? { sensor: analise.primeiraRuptura.sensor, valor: analise.primeiraRuptura.valor, tempoStr: analise.primeiraRuptura.tempoStr } : null;
  }
  return f;
}

/* ============================================================
 * Pacote de fatos (contexto) — fonte única dos três documentos e da IA
 * ============================================================ */

/**
 * interno (opcional): recebe { resultado } com os dados lidos, para gráficos e tabelas de leituras.
 * O contexto vai para a tela e é assinado: só strings, números e listas pequenas.
 */
function CadeiaFrioRel_qContexto_(payload, interno) {
  payload = payload || {};
  var resultado = CadeiaFrioRel_cfExecutarAnaliseCompleta_(payload);
  if (interno) interno.resultado = resultado;
  var perfilCfg = resultado.perfilCfg;
  var chavePerfil = String(payload.perfil || '').trim();
  var faixa = CadeiaFrioRel_cfNormalizarFaixa_(resultado.faixa);
  var simulado = !!payload.modoRelatorioSimulado;
  var ativos = resultado.sensoresAtivos || [];
  var ativosIdx = [];
  ativos.forEach(function (a, i) { if (a) ativosIdx.push(i); });
  var desconsiderados = [];
  ativos.forEach(function (a, i) { if (!a) desconsiderados.push('S' + (i + 1)); });
  var sensoresMinimos = CadeiaFrioRel_cfCalcularSensoresMinimos_(CadeiaFrioRel_cfParseNumeroMain_(payload.volumeLitros), !!payload.equipamentoConjugado);

  var analises = resultado.analises || [];
  var tipos = analises.map(function (a) { return String(a.tipoEstudo || '').toUpperCase(); });
  var primeiro = analises[0] || {};
  var dataBase = primeiro.tempoInicio || primeiro.tempoInicioEvento || '';
  var dataDoEnsaio = CadeiaFrioRel_cfExtrairDataDoTexto_(dataBase);
  var dtl = CadeiaFrioRel_qS_(payload.certDataLogger);
  var registradores = SGO_DocA4_registradores_(dtl, dataDoEnsaio);

  var travas = [];
  var estudos = analises.map(function (a) {
    var t = String(a.tipoEstudo || '').toUpperCase();
    var rot = CadeiaFrioRel_qRotuloEstudo_(t);
    var qd = CadeiaFrioRel_qQualidadeEstudo_(a, ativosIdx, rot);
    qd.travas.forEach(function (x) { travas.push(x); });
    var fatos = CadeiaFrioRel_qFatosEstudo_(a, ativosIdx, chavePerfil, faixa, registradores);
    var criterios = CadeiaFrioRel_qCriteriosEstudo_(a, faixa, chavePerfil, {
      intervaloMin: fatos.intervaloLeiturasSegundos === null ? null : fatos.intervaloLeiturasSegundos / 60,
      sensoresMinimos: sensoresMinimos, sensoresAtivos: ativosIdx.length, sensoresInstalados: ativos.length
    });
    var desvios = criterios.filter(function (c) { return c.metodo && c.conforme === false; }).map(function (c) {
      return c.criterio + ': obtido ' + c.obtido + ' (método: ' + c.requisito.charAt(0).toLowerCase() + c.requisito.slice(1) + ').';
    });
    var obs = (a.observacoesAnalise || []).filter(function (o) { return !/^RELATÓRIO INTERNO/.test(o); });
    if (fatos.leiturasPertoDoLimite) obs.push(fatos.leiturasPertoDoLimite + ' leitura(s) ficaram a menos de ' + SGO_DocA4_val_(fatos.incertezaRegistrador, 2, '°C') + ' (incerteza expandida do registrador) de um dos limites da faixa; pela aceitação simples o resultado não muda, e a proximidade fica registrada.');
    qd.alertas.forEach(function (x) { obs.push(x); });
    return {
      tipoEstudo: t, label: rot, tituloSecao: rot,
      statusAprovacao: CadeiaFrioRel_cfNormalizarStatus_(a.statusAprovacao),
      fatos: fatos, criterios: criterios, desviosMetodo: desvios,
      motivosReprovacao: a.motivosReprovacao || [], alertasAnalise: a.alertasAnalise || [], observacoesAnalise: obs
    };
  });

  var gr = CadeiaFrioRel_qGrandezas_(payload, perfilCfg, tipos);
  var q = CADEIAFRIO_QCFG.QUALIDADE_DADOS;
  var justSensores = CadeiaFrioRel_qS_(payload.justificativaSensores);
  if (desconsiderados.length && q.exigirJustificativaSensorDesconsiderado && justSensores.length < 10) {
    travas.push({ codigo: 'SENSOR_DESCONSIDERADO_SEM_JUSTIFICATIVA', campo: 'justificativaSensores', oQue: 'O(s) sensor(es) ' + desconsiderados.join(', ') + ' foi(ram) desmarcado(s) sem justificativa.',
      porQue: 'A ABNT NBR 16328:2024 (seção 15) pede que todos os sensores instalados façam parte do relatório; desconsiderar um sensor só é aceito com o motivo registrado no documento.',
      comoCorrigir: 'Na seção 3, em "Justificativa dos sensores desconsiderados", escreva o motivo (ao menos 10 caracteres), por exemplo, a falha do sensor durante o ensaio; ou marque o sensor de novo.' });
  }
  gr.travas.forEach(function (x) { travas.push(x); });
  CadeiaFrioRel_qTravasRegistrador_(registradores, simulado).forEach(function (x) { travas.push(x); });

  var statusConsolidado = CadeiaFrioRel_cfConsolidarStatus_(analises);
  var criterios = [];
  estudos.forEach(function (e) { e.criterios.forEach(function (c) { criterios.push(c); }); });
  var ncs = criterios.filter(function (c) { return c.decide && c.conforme === false; });
  var resumo;
  if (statusConsolidado === 'REPROVADO') resumo = 'Não atendido: ' + ncs.map(function (c) { return c.estudo.toLowerCase() + ' (' + c.criterio.toLowerCase() + ')'; }).join('; ') + '.';
  else if (statusConsolidado === 'APROVADO') resumo = 'Os critérios de aceitação avaliados foram atendidos em ' + (estudos.length === 1 ? 'todo o estudo' : 'todos os estudos') + ' (' + estudos.filter(function (e) { return e.statusAprovacao === 'APROVADO'; }).map(function (e) { return e.label.toLowerCase(); }).join('; ') + ').';
  else resumo = 'Estudo' + (estudos.length > 1 ? 's' : '') + ' de caracterização, sem critério de aprovação aplicável: os tempos e as temperaturas ficam registrados.';

  var normas = [CADEIAFRIO_QCFG.NORMAS.NBR16328, CADEIAFRIO_QCFG.NORMAS.RDC430];
  if (chavePerfil === 'CAMARA_VACINA_2_8') normas.push(CADEIAFRIO_QCFG.NORMAS.PNI);
  if (chavePerfil === 'CAIXA_TERMICA_2_8') normas = [CADEIAFRIO_QCFG.NORMAS.RDC430];

  var g = gr.grandezas;
  var escopo = [
    'Este relatório refere-se exclusivamente aos estudos aqui identificados, com as leituras do registrador informado. A qualificação do equipamento é declarada no relatório de qualificação, que consolida os relatórios de ensaio aprovados.',
    chavePerfil === 'CAIXA_TERMICA_2_8'
      ? 'Caixa térmica de transporte: o estudo mede a autonomia (tempo em que a temperatura permanece na faixa), fora dos estudos do Anexo G da ABNT NBR 16328:2024, que tratam de refrigeradores, freezers, câmaras frias e ultrafreezers.'
      : 'Os estudos seguem o método do Anexo G (informativo) da ABNT NBR 16328:2024. A norma pede o registro dos tempos de abertura de porta e de queda de energia, sem fixar valor de aceitação: o tempo-alvo de cada estudo, quando houver, é o informado para o ensaio.',
    'Critérios de aceitação configurados pela empresa executante e revisáveis pelo responsável técnico. ' + CADEIAFRIO_QCFG.EMISSAO.regraDecisao
  ];
  if (g.umidade.medida) escopo.push('A umidade relativa foi registrada sem critério de aceitação: mínima de ' + SGO_DocA4_val_(g.umidade.min, 0, '%') + ' e máxima de ' + SGO_DocA4_val_(g.umidade.max, 0, '%') + ' (valores informados a partir do registrador).');
  else if (g.umidade.justificativa) escopo.push('A umidade relativa não foi medida neste ensaio: ' + CadeiaFrioRel_qFrase_(g.umidade.justificativa) + '.');
  if (g.aberturaPorta.aplicavel && !g.aberturaPorta.realizado && g.aberturaPorta.justificativa) escopo.push('O estudo de abertura de porta não foi realizado neste ensaio: ' + CadeiaFrioRel_qFrase_(g.aberturaPorta.justificativa) + '.');
  if (g.quedaEnergia.aplicavel && !g.quedaEnergia.realizado && g.quedaEnergia.justificativa) escopo.push('O estudo de queda de energia não foi realizado neste ensaio: ' + CadeiaFrioRel_qFrase_(g.quedaEnergia.justificativa) + '.');
  estudos.forEach(function (e) {
    if (e.fatos.rampa) escopo.push('No estudo de ' + e.label.toLowerCase() + ', o período de estabilização inicial (até ' + e.fatos.rampa.fim + ') aparece nos gráficos e nas leituras, mas não entra no julgamento nem nas estatísticas.');
  });
  if (desconsiderados.length) escopo.push('Sensor(es) desconsiderado(s) na análise: ' + desconsiderados.join(', ') + (justSensores ? ' — ' + justSensores.replace(/[.\s]+$/, '') : '') + '.');

  var mesclagem = resultado.mesclagem || null;
  var intervalos = estudos.map(function (e) { return e.fatos.intervaloLeiturasSegundos; }).filter(function (x) { return x !== null; });
  var parametros = [
    ['Perfil do equipamento', perfilCfg.label],
    ['Faixa de aceitação', SGO_DocA4_val_(faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(faixa.tMax, 1, '°C') + (Number(faixa.tolerancia) ? ' (tolerância operacional de ' + SGO_DocA4_val_(faixa.tolerancia, 1, '°C') + ')' : '')],
    ['Sensores considerados', ativosIdx.length + ' de ' + ativos.length + ' instalados' + (desconsiderados.length ? ' (desconsiderados: ' + desconsiderados.join(', ') + ')' : '')],
    CadeiaFrioRel_qS_(payload.volumeLitros) ? ['Volume interno declarado', SGO_DocA4_val_(CadeiaFrioRel_cfParseNumeroMain_(payload.volumeLitros), 0, 'L') + (payload.equipamentoConjugado ? ' (equipamento conjugado)' : '')] : (payload.equipamentoConjugado ? ['Equipamento conjugado', 'Sim'] : null),
    ['Intervalo entre leituras', intervalos.length ? intervalos.map(function (x) { return SGO_DocA4_val_(x, 0, 's'); }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).join(' / ') : '—'],
    ['Origem dos dados', String(payload.modoEntrada || '').toUpperCase() === 'ARQUIVO_POR_SENSOR' ? 'Um arquivo por sensor (registradores individuais), alinhados pelo horário' : (simulado ? 'Dados reconstituídos (uso interno)' : 'Arquivo único do registrador')]
  ].filter(Boolean);

  var tecnico = CadeiaFrioRel_qS_(payload.responsavelTecnico);
  var tipoCadastro = CadeiaFrioRel_qS_(payload.tipoEquipamento);
  var ctxCf = {
    tipoRelatorio: 'CADEIA_FRIO',
    perfil: chavePerfil,
    assinaturaLeituras: SGO_DocSalvar_assinatura_({ dados: (resultado.dadosCompletos || []).map(function (r) { return [r.tempoStr, r.temperaturas]; }), ativos: ativos }),
    simulado: simulado,
    origemDados: simulado ? 'SIMULADO — USO INTERNO; NÃO REPRESENTA ENSAIO REAL' : 'DADOS INFORMADOS PARA O ENSAIO',
    normas: normas,
    statusConsolidado: statusConsolidado,
    resumoResultado: resumo,
    criterios: criterios,
    parametros: parametros,
    registradores: registradores,
    travas: travas,
    emissaoBloqueada: travas.length > 0 && !simulado,
    grandezas: g,
    escopo: escopo,
    mesclagem: mesclagem,
    faixa: { tMin: faixa.tMin, tMax: faixa.tMax, tolerancia: faixa.tolerancia },
    equipamentoLabel: perfilCfg.label,
    sensoresInstalados: ativos.length,
    sensoresAtivos: ativosIdx.map(function (s) { return 'S' + (s + 1); }),
    sensoresDesconsiderados: desconsiderados,
    justificativaSensores: justSensores,
    tag: CadeiaFrioRel_qS_(payload.tag || payload.tagEquipamento),
    cliente: CadeiaFrioRel_qS_(payload.cliente),
    setor: CadeiaFrioRel_qS_(payload.setor || payload.localizacao),
    identificacao: {
      cliente: CadeiaFrioRel_qS_(payload.cliente),
      cnpj: CadeiaFrioRel_qS_(payload.cnpj),
      endereco: CadeiaFrioRel_qS_(payload.endereco),
      setor: CadeiaFrioRel_qS_(payload.setor || payload.localizacao),
      equipamento: perfilCfg.label,
      equipamentoTipo: tipoCadastro || perfilCfg.label,
      tag: CadeiaFrioRel_qS_(payload.tag || payload.tagEquipamento),
      numeroSerie: CadeiaFrioRel_qS_(payload.numSerie || payload.numeroSerie),
      dtl: dtl,
      certificadoNumero: CadeiaFrioRel_qS_(payload.certNumero),
      revisao: CadeiaFrioRel_qS_(payload.certRevisao) || '0',
      dataDoEnsaio: dataDoEnsaio,
      tecnicoExecutor: tecnico,
      responsavelAceite: CadeiaFrioRel_qS_(payload.certResponsavelAceite),
      tarefaOrigem: CadeiaFrioRel_qS_(payload.certTarefaOrigem),
      empresaExecutante: CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE
    },
    estudos: estudos
  };
  // 22/10/2026 (pedido do dono): fabricante (marca), modelo e demais campos do cadastro saem no documento;
  // campo vazio não entra (a assinatura de ensaios antigos não muda).
  ['marca', 'modelo', 'patrimonio', 'capacidade', 'numCamaras', 'anoFabricacao'].forEach(function (k) { if (CadeiaFrioRel_qS_(payload[k])) ctxCf.identificacao[k] = CadeiaFrioRel_qS_(payload[k]); });
  return ctxCf;
}

/* ============================================================
 * Textos: padrão determinístico, conferência e redação pela IA
 * ============================================================ */

/** Texto padrão (sem IA), montado só com os resultados do motor. */
function CadeiaFrioRel_qTextosPadrao_(ctx) {
  var val = SGO_DocA4_val_;
  var analise = {};
  ctx.estudos.forEach(function (e) {
    var f = e.fatos || {}, s = f.estatisticas || {};
    var p = [];
    if (CadeiaFrioRel_qEhDistribuicao_(e.tipoEstudo)) {
      p.push('O estudo foi avaliado de ' + (f.inicioAvaliado || '—') + ' a ' + (f.fimAvaliado || '—') + ' (' + CadeiaFrioRel_qDuracao_(f.duracaoAvaliadaMinutos) + '), com ' + ctx.sensoresAtivos.length + ' sensores considerados' +
        (f.rampa ? ', depois do período de estabilização inicial, que terminou em ' + f.rampa.fim : '') + '. As leituras ficaram entre ' + val(s.min, 2, '°C') + ' e ' + val(s.max, 2, '°C') + ', com média de ' + val(s.media, 2, '°C') + ' e desvio-padrão de ' + val(s.desvio, 2, '°C') + '.' +
        (f.mkt !== null && f.mkt !== undefined ? ' A temperatura cinética média do período foi de ' + val(f.mkt, 2, '°C') + ', valor informativo.' : ''));
      if (f.piorSensor) p.push('O maior afastamento da faixa ocorreu no sensor ' + f.piorSensor.sensor + ', com ' + val(f.piorSensor.valor, 2, '°C') + ' em ' + f.piorSensor.tempoStr + ' (' + val(f.piorSensor.desvio, 2, '°C') + ' além do limite).');
      else p.push('Nenhuma leitura saiu da faixa de aceitação no período avaliado.');
    } else if (CadeiaFrioRel_qEhEvento_(e.tipoEstudo)) {
      var energia = e.tipoEstudo === 'QUEDA_ENERGIA';
      p.push((energia ? 'A energia foi interrompida em ' : 'A porta foi aberta em ') + (f.inicioEvento || '—') + (f.fimEvento ? (energia ? ' e restabelecida em ' : ' e fechada em ') + f.fimEvento + ' (' + CadeiaFrioRel_qDuracao_(f.duracaoEventoMinutos) + ')' : '') + '.' +
        (f.rompeu ? ' A temperatura saiu da faixa após ' + val(f.tempoAteRupturaMinutos, 1, 'min') + (f.ruptura ? ', no sensor ' + f.ruptura.sensor + ' (' + val(f.ruptura.valor, 2, '°C') + ')' : '') + '.' : ' Nenhum sensor saiu da faixa no período registrado a partir do início do evento.') +
        (f.rompeu ? (f.recuperouTotalmente ? ' Todos os sensores voltaram à faixa em ' + val(f.tempoAteRecuperacaoMinutos, 1, 'min') + '.' : ' Os sensores não voltaram todos à faixa no período registrado.') : ''));
      if (f.tempoAlvoMinutos) p.push('O tempo-alvo informado para o estudo era de ' + val(f.tempoAlvoMinutos, 0, 'min') + '.');
    } else {
      p.push(f.rompeu ? 'A caixa manteve a temperatura na faixa por ' + val(f.autonomiaMinutos, 1, 'min') + ', até o sensor ' + (f.ruptura ? f.ruptura.sensor : '—') + ' sair da faixa.' : 'A caixa manteve a temperatura na faixa durante todo o período gravado (' + val(f.duracaoTotalMinutos, 1, 'min') + ').');
      if (f.tempoAlvoMinutos) p.push('A autonomia mínima informada para o ensaio era de ' + val(f.tempoAlvoMinutos, 0, 'min') + '.');
    }
    var nc = e.criterios.filter(function (c) { return c.decide && c.conforme === false; });
    var dm = e.desviosMetodo || [];
    if (nc.length) p.push('Não atendido: ' + nc.map(function (c) { return c.criterio.toLowerCase() + ' (obtido ' + c.obtido.charAt(0).toLowerCase() + c.obtido.slice(1) + '; requisito ' + c.requisito.charAt(0).toLowerCase() + c.requisito.slice(1) + ')'; }).join('; ') + '.');
    if (dm.length) p.push('Desvios do método registrados, sem efeito no resultado: ' + dm.map(function (d) { return d.replace(/[.\s]+$/, ''); }).join('; ') + '.');
    analise[e.tipoEstudo] = p.join('\n\n');
  });
  var st = ctx.statusConsolidado;
  var aval = ctx.estudos.filter(function (e) { return e.statusAprovacao !== 'INFORMATIVO'; });
  var reprov = ctx.estudos.filter(function (e) { return e.statusAprovacao === 'REPROVADO'; });
  var conclusao = [
    (ctx.estudos.length === 1 ? 'Foi realizado 1 estudo' : 'Foram realizados ' + ctx.estudos.length + ' estudos') + ' (' + ctx.estudos.map(function (e) { return e.label.toLowerCase(); }).join('; ') + ')' +
      (aval.length < ctx.estudos.length ? ', ' + (ctx.estudos.length - aval.length) + ' sem critério de aprovação (caracterização)' : '') + '. ' +
      (reprov.length ? 'Não atenderam ao critério de aceitação: ' + reprov.map(function (e) { return e.label.toLowerCase(); }).join('; ') + '.' : (aval.length ? 'Os estudos com critério atenderam aos critérios de aceitação.' : 'Os tempos e as temperaturas ficam registrados para consulta.')),
    st === 'APROVADO' ? 'O ensaio está APROVADO.' : (st === 'REPROVADO' ? 'O ensaio está REPROVADO.' : 'O ensaio tem caráter informativo, sem critério de aprovação aplicável.')
  ].join('\n\n');
  var leigo = st === 'APROVADO'
    ? 'Nos estudos realizados, o equipamento manteve a temperatura dentro da faixa exigida para guardar os produtos com segurança. O resultado deste ensaio é aprovado.'
    : (st === 'REPROVADO'
      ? 'Em pelo menos um dos estudos o equipamento não manteve a temperatura dentro da faixa exigida, como mostra a tabela de critérios. O resultado deste ensaio é reprovado; o equipamento deve ser avaliado e o ensaio repetido antes de guardar os produtos nele.'
      : 'Este ensaio registra o comportamento da temperatura do equipamento para consulta, sem critério de aprovação aplicável.');
  return { analisePorEstudo: analise, conclusaoGeral: conclusao, conclusaoLeigo: leigo };
}

function CadeiaFrioRel_qRegrasTexto_(ctx, veredito, exigirVeredito, verificarNumeros) {
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.criterios, ctx.parametros, ctx.estudos.map(function (e) { return [e.fatos, e.motivosReprovacao, e.alertasAnalise, e.observacoesAnalise, e.desviosMetodo]; }), ctx.registradores, ctx.normas, ctx.escopo, ctx.faixa]),
    normas: ctx.normas,
    veredito: veredito,
    exigirVeredito: !!exigirVeredito,
    verificarNumeros: verificarNumeros !== false,
    termosProibidos: CadeiaFrioRel_qTermosProibidos_(ctx.grandezas)
  };
}

/** Confere as análises (veredito de cada estudo) e as duas conclusões (veredito do ensaio). */
function CadeiaFrioRel_qConferirTextos_(ctx, textos, verificarNumeros) {
  var blocos = {
    'Conclusão técnica': { texto: textos.conclusaoGeral, regras: CadeiaFrioRel_qRegrasTexto_(ctx, ctx.statusConsolidado, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoLeigo, regras: CadeiaFrioRel_qRegrasTexto_(ctx, ctx.statusConsolidado, false, verificarNumeros) }
  };
  ctx.estudos.forEach(function (e) {
    blocos['Análise — ' + e.label] = { texto: (textos.analisePorEstudo || {})[e.tipoEstudo], regras: CadeiaFrioRel_qRegrasTexto_(ctx, e.statusAprovacao, false, verificarNumeros) };
  });
  return SGO_QIAV_verificarBlocos_(blocos);
}

var CADEIAFRIO_QIA_MARC = { ANALISE: '###ANALISE:', TECNICA: '###CONCLUSAO_TECNICA###', LEIGO: '###CONCLUSAO_LEIGO###', FIM: '###FIM###' };

function CadeiaFrioRel_qPromptIA_(ctx) {
  var L = [];
  L.push('Você é engenheiro sênior em qualificação térmica de equipamentos da cadeia de frio (refrigeradores, câmaras de conservação, câmaras frias, freezers, ultrafreezers e caixas térmicas) e metrologista. Redige o relatório técnico de UM ensaio, no padrão de laboratórios de metrologia e engenharia clínica. Pense com cuidado antes de escrever: confira cada número com o contexto e não afirme nada que os dados não sustentem.');
  L.push(SGO_DocA4_regrasRedacaoIA_());
  L.push('- O resultado de cada estudo e do ensaio já foi decidido pelo cálculo e está no contexto. Você não decide nem questiona: explica. Estudo sem critério (caracterização) não aprova nem reprova; diga só o que foi registrado.');
  L.push('- Desvio do método (duração, intervalo de leitura, quantidade de sensores, monitoramento depois do evento) não muda o resultado: mencione como limitação, sem tirar conclusão de aprovação dele.');
  L.push('- Quando um ponto ficar fora da faixa, explique a direção (frio ou quente) e as causas técnicas PROVÁVEIS, sempre como hipótese e nunca como diagnóstico (não houve inspeção física): proximidade do evaporador ou da saída de ar, vedação da porta, carga que bloqueia a circulação do ar, posição próxima da porta, regulagem do termostato. Traduza em orientação prática (não usar a posição para guardar produtos, ajustar a carga, chamar a assistência técnica, repetir o ensaio).');
  L.push('- Não cite número de cláusula, item, seção ou anexo de norma. Cite as normas só pelo nome, exatamente como na lista. Todo número que você escrever tem de estar no contexto, com as mesmas casas decimais: o texto é conferido automaticamente e descartado se tiver número, norma ou resultado que não esteja no contexto.');
  var proib = [];
  if (!ctx.grandezas.umidade.medida) proib.push('umidade');
  if (!ctx.grandezas.aberturaPorta.realizado) proib.push('abertura de porta');
  if (!ctx.grandezas.quedaEnergia.realizado) proib.push('queda ou falta de energia');
  if (proib.length) L.push('- É proibido escrever sobre ' + proib.join(', ') + ': não foram medidos neste ensaio (o escopo do documento já explica).');
  L.push('');
  L.push('EQUIPAMENTO: ' + ctx.equipamentoLabel + ' | TAG: ' + (ctx.tag || '-') + ' | SETOR: ' + (ctx.setor || '-'));
  L.push('ORIGEM DOS DADOS: ' + ctx.origemDados);
  L.push('NORMAS (cite somente estas): ' + ctx.normas.join(' | '));
  L.push('ESCOPO E LIMITAÇÕES (já impressos; não repita): ' + ctx.escopo.join(' '));
  L.push('PARÂMETROS: ' + ctx.parametros.map(function (p) { return p[0] + ': ' + p[1]; }).join(' | '));
  if (ctx.registradores && ctx.registradores.observacoes && ctx.registradores.observacoes.length) L.push('RASTREABILIDADE: ' + ctx.registradores.observacoes.join(' '));
  ctx.estudos.forEach(function (e) {
    L.push('');
    L.push('--- ESTUDO: ' + e.label + ' (marcador ' + e.tipoEstudo + ') — resultado: ' + e.statusAprovacao + ' ---');
    e.criterios.forEach(function (c) {
      L.push('  Critério: ' + c.criterio + ' | requisito: ' + c.requisito + ' | obtido: ' + c.obtido + ' | situação: ' + (c.naoAvaliado ? 'NÃO AVALIADO' : (c.metodo ? (c.conforme ? 'MÉTODO ATENDIDO' : 'DESVIO DO MÉTODO (não muda o resultado)') : (c.conforme ? 'CONFORME' : 'NÃO CONFORME'))));
    });
    L.push('  Fatos (formato brasileiro): ' + JSON.stringify(SGO_DocA4_fatosPtBr_(e.fatos)));
    if (e.motivosReprovacao.length) L.push('  Motivos de reprovação: ' + e.motivosReprovacao.join(' '));
    if (e.alertasAnalise.length) L.push('  Alertas: ' + e.alertasAnalise.join(' '));
    if (e.observacoesAnalise.length) L.push('  Observações: ' + e.observacoesAnalise.join(' '));
  });
  L.push('');
  L.push('RESULTADO DO ENSAIO (use exatamente): ' + ctx.statusConsolidado + ' — ' + ctx.resumoResultado);
  L.push('');
  L.push('Responda SOMENTE em texto puro (sem JSON, sem markdown), com estes marcadores, cada um sozinho na linha, nesta ordem:');
  ctx.estudos.forEach(function (e) { L.push(CADEIAFRIO_QIA_MARC.ANALISE + e.tipoEstudo + '###'); L.push('(análise técnica deste estudo, dois a quatro parágrafos)'); });
  L.push(CADEIAFRIO_QIA_MARC.TECNICA); L.push('(conclusão técnica do ensaio, que termina declarando o resultado do ensaio)');
  L.push(CADEIAFRIO_QIA_MARC.LEIGO); L.push('(um parágrafo curto, sem termos técnicos, para o gestor do serviço de saúde, com o mesmo resultado)');
  L.push(CADEIAFRIO_QIA_MARC.FIM);
  return L.join('\n');
}

function CadeiaFrioRel_qExtrairIA_(texto, ctx) {
  var t = String(texto || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
  var marcs = ctx.estudos.map(function (e) { return CADEIAFRIO_QIA_MARC.ANALISE + e.tipoEstudo + '###'; }).concat([CADEIAFRIO_QIA_MARC.TECNICA, CADEIAFRIO_QIA_MARC.LEIGO, CADEIAFRIO_QIA_MARC.FIM]);
  var ult = -1;
  marcs.forEach(function (m) {
    var pos = t.indexOf(m);
    if (pos < 0 || pos <= ult || t.indexOf(m, pos + m.length) !== -1) throw new Error('a redação automática devolveu seções incompletas ou fora de ordem');
    ult = pos;
  });
  function bloco(m) {
    var i = t.indexOf(m) + m.length, fim = t.length;
    marcs.forEach(function (x) { if (x === m) return; var k = t.indexOf(x, i); if (k !== -1 && k < fim) fim = k; });
    return SGO_DocA4_limparTextoIA_(t.slice(i, fim));
  }
  var out = { analisePorEstudo: {}, conclusaoGeral: bloco(CADEIAFRIO_QIA_MARC.TECNICA), conclusaoLeigo: bloco(CADEIAFRIO_QIA_MARC.LEIGO) };
  ctx.estudos.forEach(function (e) { out.analisePorEstudo[e.tipoEstudo] = bloco(CADEIAFRIO_QIA_MARC.ANALISE + e.tipoEstudo + '###'); });
  if (!out.conclusaoGeral || !out.conclusaoLeigo || ctx.estudos.some(function (e) { return !out.analisePorEstudo[e.tipoEstudo]; })) throw new Error('a redação automática não devolveu todas as seções');
  return out;
}

function CadeiaFrioRel_qRedigirIA_(ctx) {
  var bruto = SGO_DocA4_chamarGemini_(CadeiaFrioRel_qPromptIA_(ctx), { tokens: 32768, temperatura: 0.2 });
  return CadeiaFrioRel_qExtrairIA_(bruto, ctx);
}

/** Resumo de um relatório de ensaio emitido (guardado em QUALIF_EMISSOES.RESUMO_JSON, usado no relatório de qualificação). */
function CadeiaFrioRel_qResumoEnsaio_(ctx) {
  var id = ctx.identificacao || {};
  return {
    v: 1, tipoRelatorio: 'CADEIA_FRIO', perfil: ctx.perfil, equipamentoLabel: ctx.equipamentoLabel, statusConsolidado: ctx.statusConsolidado, resumoResultado: ctx.resumoResultado,
    faixa: ctx.faixa, grandezas: ctx.grandezas, sensoresInstalados: ctx.sensoresInstalados, sensoresAtivos: ctx.sensoresAtivos.length, sensoresDesconsiderados: ctx.sensoresDesconsiderados,
    identificacao: { certificadoNumero: id.certificadoNumero, revisao: id.revisao, dataDoEnsaio: id.dataDoEnsaio, tecnicoExecutor: id.tecnicoExecutor, dtl: id.dtl, tag: id.tag, cnpj: id.cnpj },
    registradores: ctx.registradores || { itens: [], observacoes: [] },
    estudos: ctx.estudos.map(function (e) {
      var f = e.fatos || {}, s = f.estatisticas || {};
      return {
        tipoEstudo: e.tipoEstudo, label: e.label, statusAprovacao: e.statusAprovacao,
        criterios: e.criterios.map(function (c) { return { chave: c.chave, criterio: c.criterio, requisito: c.requisito, referencia: c.referencia, obtido: c.obtido, conforme: c.conforme === undefined ? null : c.conforme, decide: !!c.decide, metodo: !!c.metodo, naoAvaliado: !!c.naoAvaliado }; }),
        fatos: { inicio: f.inicioAvaliado, fim: f.fimAvaliado, min: s.min, max: s.max, media: s.media, mkt: f.mkt, tempoAteRupturaMinutos: f.tempoAteRupturaMinutos, rompeu: f.rompeu, autonomiaMinutos: f.autonomiaMinutos, tempoAteRecuperacaoMinutos: f.tempoAteRecuperacaoMinutos, duracaoAvaliadaMinutos: f.duracaoAvaliadaMinutos },
        desviosMetodo: e.desviosMetodo || [], motivosReprovacao: e.motivosReprovacao || [], alertasAnalise: (e.alertasAnalise || []).slice(0, 3)
      };
    })
  };
}
