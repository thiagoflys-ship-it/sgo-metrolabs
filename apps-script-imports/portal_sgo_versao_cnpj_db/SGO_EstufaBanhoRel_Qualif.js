/****************************************************
 * ESTUFA, BANHO-MARIA E SECADORA — QUALIFICAÇÃO TÉRMICA, MODELO NOVO (21/10/2026)
 *
 * Mesmo molde da Autoclave a vapor (SGO_AutoRel_*), com as regras próprias destes
 * equipamentos de temperatura controlada:
 *  - motor determinístico: a leitura e os estudos continuam no motor do módulo
 *    (SGO_EstufaBanhoRel_Main.js / Engine.js); este arquivo calcula, sobre os mesmos
 *    dados, a estatística por sensor, a uniformidade entre sensores, a estabilidade no
 *    tempo, o desvio em relação à temperatura programada, o tempo de estabilização,
 *    a recuperação após abertura de porta ou queda de energia, a letalidade (estufa de
 *    esterilização/despirogenização) e a incerteza de medição;
 *  - critérios em configuração, cada um com a fonte (ESTUFAQ_CFG.PERFIS) — nenhum valor
 *    sem fonte entra como critério: limite que só o protocolo do cliente define vem do
 *    ensaio, e sem ele o item sai como informativo ("não avaliado");
 *  - travas que impedem a emissão e dizem o que corrigir (registrador sem cadastro ou
 *    vencido, sensores abaixo do mínimo do anexo, leitura impossível, sensor parado,
 *    pico, lacuna, duração ou intervalo de registro fora do protocolo sem justificativa,
 *    umidade sem dados ou sem justificativa);
 *  - uma não conformidade reprova: não existe "aprovado com observação" no modelo novo;
 *  - IA só redige; o texto passa pelo verificador comum (SGO_QualifIA_Verificador.js) e,
 *    se reprovar, vale o texto padrão determinístico;
 *  - emissão só com aprovação registrada do responsável técnico (SGO_QualifEmissao.js,
 *    módulos ESTUFA = relatório de ensaio, ESTUFA_DADOS = planilha de dados), nova revisão
 *    substitui a anterior, que continua na pasta;
 *  - documentos A4: relatório retrato (SGO_EstufaBanhoRel_RelatorioEnsaio.js), planilha de
 *    dados paisagem (SGO_EstufaBanhoRel_PlanilhaDados.js) e relatório de qualificação do
 *    equipamento (SGO_EstufaBanhoRel_ModeloOficialNovo.js).
 *
 * Modelo anterior (planilha do Google Planilhas e certificado antigo): preservado sem mudança
 * e desligado. Volta só com ESTUFA_DOCUMENTOS_MODELO = ANTERIOR em Chaves e senhas.
 ****************************************************/

var ESTUFAQ_CFG = {
  MODULO_ENSAIO: 'ESTUFA',
  MODULO_DADOS: 'ESTUFA_DADOS',
  PROP_MODELO: 'ESTUFA_DOCUMENTOS_MODELO',
  PROP_SEQ: 'ESTUFAQ_SEQ_',
  SIGLA_ENSAIO: 'REE',
  PERFIS_APROVADORES: ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'],
  TIPO_EQUIPAMENTO_RE: /ESTUFA|BANHO|INCUBAD|SECADOR|DESPIROG|\bBOD\b/,
  REGRA_DECISAO: 'Aceitação simples: o valor medido é comparado diretamente ao limite; a incerteza de medição é declarada, sem banda de guarda.',
  // Normas citáveis no documento e pela IA (lista fechada). Só o que o módulo já usava.
  NORMA_BASE: 'ABNT NBR 16328:2024 — Esterilização de produtos para saúde — Procedimento de ensaios para medição de temperatura, pressão e umidade em equipamentos',
  NORMAS_REGULATORIAS: [
    'RDC nº 658/2022 (ANVISA) — Boas Práticas de Fabricação de Medicamentos',
    'RDC nº 665/2022 (ANVISA) — Boas Práticas de Fabricação de Produtos Médicos e Produtos para Diagnóstico de Uso in Vitro'
  ],
  // Referências usuais de caracterização de câmaras com temperatura controlada. NÃO são citadas nos
  // documentos enquanto o responsável técnico não confirmar título e edição (confirmado: false).
  REFERENCIAS_A_CONFIRMAR: [
    { ref: 'IEC 60068-3-5 (confirmação do desempenho de câmaras de temperatura)', confirmado: false },
    { ref: 'IEC 60068-3-11 (incerteza das condições em câmaras climáticas)', confirmado: false },
    { ref: 'DKD-R 5-7 (calibração de câmaras climáticas)', confirmado: false },
    { ref: 'EURAMET cg-20 (calibração de câmaras com temperatura e/ou umidade controladas)', confirmado: false }
  ],
  /**
   * Por perfil: mínimo de sensores, duração mínima da distribuição, intervalo máximo de registro,
   * faixa física (leitura impossível), pico e sensor parado. Cada valor normativo tem a fonte;
   * o que é do protocolo do cliente fica null (informado no ensaio).
   */
  PERFIS: {
    ESTUFA_INCUBACAO: {
      anexo: 'F', sensoresMinimos: 12, fonteSensores: 'ABNT NBR 16328:2024, Anexo F',
      duracaoMinimaHoras: 24, fonteDuracao: 'ABNT NBR 16328:2024, Anexo F (distribuição por 24 h a partir da estabilização)',
      intervaloMaxSeg: { DISTRIBUICAO: 60, EVENTO: 10 }, fonteIntervalo: 'ABNT NBR 16328:2024, Anexo F',
      faixaFisica: [-20, 100], picoMin: 5, paradoMin: 30, paradoVariacao: 2
    },
    BANHO_MARIA: {
      anexo: 'I', sensoresMinimos: 6, fonteSensores: 'ABNT NBR 16328:2024, Anexo I',
      duracaoMinimaHoras: null, fonteDuracao: 'Tempo predeterminado no protocolo do ensaio',
      intervaloMaxSeg: { DISTRIBUICAO: 30 }, fonteIntervalo: 'ABNT NBR 16328:2024, Anexo I',
      faixaFisica: [-20, 120], picoMin: 5, paradoMin: 30, paradoVariacao: 2
    },
    ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO: {
      anexo: 'E', sensoresMinimos: 12, fonteSensores: 'ABNT NBR 16328:2024, Anexo E',
      duracaoMinimaHoras: null, fonteDuracao: 'Duração do ciclo definida no protocolo do ensaio',
      intervaloMaxSeg: { DISTRIBUICAO: 30, PENETRACAO: 30 }, fonteIntervalo: 'ABNT NBR 16328:2024, Anexo E',
      faixaFisica: [-20, 400], picoMin: 20, paradoMin: 20, paradoVariacao: 10
    },
    SECADORA_TRAQUEIAS: {
      anexo: '', sensoresMinimos: 1, fonteSensores: 'Protocolo do ensaio da secadora',
      duracaoMinimaHoras: null, fonteDuracao: 'Períodos definidos no protocolo do ensaio',
      intervaloMaxSeg: {}, fonteIntervalo: 'Protocolo do ensaio',
      faixaFisica: [-20, 150], picoMin: 10, paradoMin: 30, paradoVariacao: 5
    }
  },
  // Letalidade em calor seco (estufa de esterilização/despirogenização): parâmetros da configuração do
  // módulo (EstufaBanhoRel_EBCFG.LETALIDADE). Valores da literatura, a confirmar pelo responsável técnico.
  FONTE_LETALIDADE: {
    ESTERILIZACAO: 'Mínimo do protocolo do cliente (valor inicial da configuração; a confirmar pelo responsável técnico)',
    DESPIROGENIZACAO: 'Mínimo do protocolo do cliente (valor inicial da configuração; a confirmar pelo responsável técnico)'
  },
  FONTE_PROTOCOLO: 'Protocolo do ensaio (limite informado no ensaio)',
  LACUNA_MULTIPLO: 3,
  VALIDADE_MESES: 12
};

/* ============================================================
 * Utilitários
 * ============================================================ */

function EstufaQ_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function EstufaQ_up_(v) { return EstufaQ_s_(v).toUpperCase(); }
function EstufaQ_r_(n, d) { var p = Math.pow(10, d === undefined ? 2 : d); return Math.round(Number(n) * p) / p; }
function EstufaQ_msg_(e) { return String(e && e.message ? e.message : e).replace(/[.\s]+$/, ''); }
function EstufaQ_tz_() { return (typeof EstufaBanhoRel_EBCFG !== 'undefined' && EstufaBanhoRel_EBCFG.TZ) || 'America/Sao_Paulo'; }

/** Número opcional do formulário (aceita vírgula). Vazio → null. Texto inválido → erro com o campo. */
function EstufaQ_num_(v, rotulo) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).trim().replace(',', '.');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) throw new Error('Valor inválido em "' + rotulo + '": ' + v + '. Informe só o número, sem unidade.');
  return Number(s);
}

function EstufaQ_modelo_() {
  try { return EstufaQ_up_(PropertiesService.getScriptProperties().getProperty(ESTUFAQ_CFG.PROP_MODELO)) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO'; } catch (e) { return 'NOVO'; }
}

function EstufaQ_ehAprovador_(sessao) { return SGO_QE_ehAprovador_(sessao, ESTUFAQ_CFG.PERFIS_APROVADORES); }

function EstufaQ_ms_(row) {
  if (!row) return NaN;
  if (row.tempoDate instanceof Date) return row.tempoDate.getTime();
  if (row.tempoDate && typeof row.tempoDate.getTime === 'function') return row.tempoDate.getTime();
  return EstufaBanhoRel_ebConverterTempoParaMs_(row.tempoStr);
}

function EstufaQ_valor_(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}

function EstufaQ_hhmm_(tempoStr) { var m = /(\d{1,2}:\d{2}(:\d{2})?)/.exec(EstufaQ_s_(tempoStr)); return m ? m[1] : EstufaQ_s_(tempoStr); }

function EstufaQ_duracaoTxt_(min) {
  if (min === null || min === undefined || !isFinite(min)) return '—';
  if (min < 120) return SGO_DocA4_val_(min, 1, 'min');
  return SGO_DocA4_val_(min / 60, 2, 'h') + ' (' + SGO_DocA4_val_(min, 0, 'min') + ')';
}

function EstufaQ_ehDistribuicao_(tipo) { return EstufaBanhoRel_ebEhDistribuicao_(tipo); }
function EstufaQ_ehEvento_(tipo) { return tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA'; }

/** Etapa da qualificação que o estudo fundamenta: QO (vazio, eventos) ou QD (com carga). */
function EstufaQ_etapaEstudo_(tipo) {
  if (/CARGA/.test(String(tipo))) return 'QD';
  return 'QO';
}

/* ============================================================
 * Parâmetros do ensaio (informados na tela)
 * ============================================================ */

function EstufaQ_parametros_(payload) {
  var q = payload.qualif || {};
  var p = {
    setpoint: EstufaQ_num_(q.setpoint, 'Temperatura programada'),
    limUniformidade: EstufaQ_num_(q.limUniformidade, 'Limite de uniformidade'),
    limEstabilidade: EstufaQ_num_(q.limEstabilidade, 'Limite de estabilidade'),
    limDesvioSetpoint: EstufaQ_num_(q.limDesvioSetpoint, 'Limite de desvio da temperatura programada'),
    recuperacaoMaxMin: EstufaQ_num_(q.recuperacaoMaxMin, 'Tempo máximo de recuperação'),
    resolucao: EstufaQ_num_(q.resolucao, 'Resolução do registrador'),
    faixaFonte: EstufaQ_s_(q.faixaFonte).slice(0, 200),
    justificativaProtocolo: EstufaQ_s_(q.justificativaProtocolo).slice(0, 600),
    umidade: {
      avaliar: q.avaliarUmidade === true || String(q.avaliarUmidade) === 'true',
      controla: q.equipamentoControlaUmidade === true || String(q.equipamentoControlaUmidade) === 'true',
      urMin: EstufaQ_num_(q.urMin, 'Umidade mínima'),
      urMax: EstufaQ_num_(q.urMax, 'Umidade máxima'),
      justificativa: EstufaQ_s_(q.justificativaSemUmidade).slice(0, 400)
    }
  };
  ['limUniformidade', 'limEstabilidade', 'limDesvioSetpoint', 'recuperacaoMaxMin', 'resolucao'].forEach(function (k) {
    if (p[k] !== null && !(p[k] > 0)) throw new Error('O campo "' + ({ limUniformidade: 'Limite de uniformidade', limEstabilidade: 'Limite de estabilidade', limDesvioSetpoint: 'Limite de desvio da temperatura programada', recuperacaoMaxMin: 'Tempo máximo de recuperação', resolucao: 'Resolução do registrador' })[k] + '" deve ser maior que zero (ou fique em branco).');
  });
  if (p.umidade.urMin !== null && p.umidade.urMax !== null && p.umidade.urMin > p.umidade.urMax) throw new Error('Na umidade, a mínima deve ser menor ou igual à máxima.');
  return p;
}

/* ============================================================
 * Cálculos sobre as leituras de um estudo
 * ============================================================ */

/** Leituras avaliadas do estudo (distribuição: depois da estabilização marcada; evento: desde o início do evento). */
function EstufaQ_linhasEstudo_(analise) {
  var tipo = String(analise.tipoEstudo || '').toUpperCase();
  var dados = analise._dadosFatia || [];
  if (EstufaQ_ehEvento_(tipo) && analise._dadosDesdeInicioEvento) return analise._dadosDesdeInicioEvento;
  if (EstufaQ_ehDistribuicao_(tipo) && analise.rampaEstabilizacao) {
    var i = dados.findIndex(function (r) { return r.tempoStr === analise.rampaEstabilizacao.fimRampaStr; });
    if (i > 0) return dados.slice(i);
  }
  return dados;
}

function EstufaQ_indicesAtivos_(ativos) { var o = []; (ativos || []).forEach(function (a, i) { if (a) o.push(i); }); return o; }

/** Intervalo entre leituras: mediana, maior intervalo e lacunas (intervalo maior que N vezes a mediana). */
function EstufaQ_intervalos_(linhas) {
  var d = [];
  for (var i = 1; i < linhas.length; i++) { var x = EstufaQ_ms_(linhas[i]) - EstufaQ_ms_(linhas[i - 1]); if (x > 0) d.push({ i: i, x: x }); }
  if (!d.length) return { medianaSeg: null, maiorSeg: null, lacunas: [] };
  var ord = d.map(function (o) { return o.x; }).sort(function (a, b) { return a - b; });
  var med = ord[Math.floor(ord.length / 2)];
  var lac = d.filter(function (o) { return o.x > ESTUFAQ_CFG.LACUNA_MULTIPLO * med; }).map(function (o) {
    return { de: linhas[o.i - 1].tempoStr, ate: linhas[o.i].tempoStr, seg: Math.round(o.x / 1000) };
  });
  return { medianaSeg: Math.round(med / 100) / 10, maiorSeg: Math.round(ord[ord.length - 1] / 100) / 10, lacunas: lac };
}

/**
 * Estatística do estudo. porSensor: mínima, máxima, média, desvio-padrão, estabilidade (± metade da
 * variação no tempo) e tempo fora da faixa. uniformidade: maior diferença entre sensores no mesmo
 * instante (e a média dessas diferenças). global: mínima, máxima e média de todas as leituras.
 */
function EstufaQ_estatistica_(linhas, ativosIdx, faixa) {
  var acc = ativosIdx.map(function (s) { return { s: s, n: 0, soma: 0, soma2: 0, min: null, max: null, foraMin: 0 }; });
  var g = { n: 0, soma: 0, min: null, max: null, sensorMin: '', sensorMax: '', tMin: '', tMax: '' };
  var unif = { max: null, instante: '', soma: 0, n: 0 };
  var serieUnif = [], serieMedia = [];
  for (var i = 0; i < linhas.length; i++) {
    var row = linhas[i], lmin = null, lmax = null, lsoma = 0, ln = 0;
    var dt = i < linhas.length - 1 ? (EstufaQ_ms_(linhas[i + 1]) - EstufaQ_ms_(row)) / 60000 : 0;
    for (var k = 0; k < ativosIdx.length; k++) {
      var t = EstufaQ_valor_(row.temperaturas && row.temperaturas[ativosIdx[k]]);
      if (t === null) continue;
      var a = acc[k];
      a.n++; a.soma += t; a.soma2 += t * t;
      if (a.min === null || t < a.min) a.min = t;
      if (a.max === null || t > a.max) a.max = t;
      if (faixa && (t < faixa.tMin || t > faixa.tMax) && dt > 0) a.foraMin += dt;
      g.n++; g.soma += t;
      if (g.min === null || t < g.min) { g.min = t; g.sensorMin = 'S' + (ativosIdx[k] + 1); g.tMin = row.tempoStr; }
      if (g.max === null || t > g.max) { g.max = t; g.sensorMax = 'S' + (ativosIdx[k] + 1); g.tMax = row.tempoStr; }
      if (lmin === null || t < lmin) lmin = t;
      if (lmax === null || t > lmax) lmax = t;
      lsoma += t; ln++;
    }
    if (ln >= 2) {
      var dif = lmax - lmin;
      unif.soma += dif; unif.n++;
      if (unif.max === null || dif > unif.max) { unif.max = dif; unif.instante = row.tempoStr; }
      serieUnif.push([EstufaQ_ms_(row), dif]);
    }
    if (ln) serieMedia.push([EstufaQ_ms_(row), lsoma / ln]);
  }
  var porSensor = acc.map(function (a) {
    var media = a.n ? a.soma / a.n : null;
    var dp = a.n > 1 ? Math.sqrt(Math.max(0, (a.soma2 - a.n * media * media) / (a.n - 1))) : null;
    return {
      sensor: 'S' + (a.s + 1), indice: a.s, leituras: a.n,
      min: a.min === null ? null : EstufaQ_r_(a.min, 2), max: a.max === null ? null : EstufaQ_r_(a.max, 2),
      media: media === null ? null : EstufaQ_r_(media, 2), desvioPadrao: dp === null ? null : EstufaQ_r_(dp, 3),
      estabilidade: a.min === null ? null : EstufaQ_r_((a.max - a.min) / 2, 2),
      minutosForaFaixa: EstufaQ_r_(a.foraMin, 1)
    };
  });
  var piorEstab = null;
  porSensor.forEach(function (p) { if (p.estabilidade !== null && (!piorEstab || p.estabilidade > piorEstab.estabilidade)) piorEstab = p; });
  var maisFrio = null, maisQuente = null;
  porSensor.forEach(function (p) {
    if (p.media === null) return;
    if (!maisFrio || p.media < maisFrio.media) maisFrio = p;
    if (!maisQuente || p.media > maisQuente.media) maisQuente = p;
  });
  return {
    porSensor: porSensor,
    global: { leituras: g.n, min: g.min === null ? null : EstufaQ_r_(g.min, 2), max: g.max === null ? null : EstufaQ_r_(g.max, 2), media: g.n ? EstufaQ_r_(g.soma / g.n, 2) : null, sensorMin: g.sensorMin, sensorMax: g.sensorMax, instanteMin: g.tMin, instanteMax: g.tMax },
    uniformidade: { max: unif.max === null ? null : EstufaQ_r_(unif.max, 2), media: unif.n ? EstufaQ_r_(unif.soma / unif.n, 2) : null, instante: unif.instante },
    piorEstabilidade: piorEstab ? { sensor: piorEstab.sensor, valor: piorEstab.estabilidade } : null,
    sensorMaisFrio: maisFrio ? { sensor: maisFrio.sensor, media: maisFrio.media } : null,
    sensorMaisQuente: maisQuente ? { sensor: maisQuente.sensor, media: maisQuente.media } : null,
    _serieUniformidade: serieUnif, _serieMedia: serieMedia
  };
}

/**
 * Tempo de estabilização: do início da janela até a primeira leitura a partir da qual todos os sensores
 * ficam dentro da faixa até o fim da janela (null se isso não acontece ou se já começa dentro).
 */
function EstufaQ_estabilizacao_(linhasJanela, ativosIdx, faixa) {
  var ultimaFora = -1;
  for (var i = 0; i < linhasJanela.length; i++) {
    for (var k = 0; k < ativosIdx.length; k++) {
      var t = EstufaQ_valor_(linhasJanela[i].temperaturas[ativosIdx[k]]);
      if (t !== null && (t < faixa.tMin || t > faixa.tMax)) { ultimaFora = i; break; }
    }
  }
  if (ultimaFora < 0) return { jaEstavel: true, minutos: 0, instante: linhasJanela.length ? linhasJanela[0].tempoStr : '' };
  if (ultimaFora >= linhasJanela.length - 1) return null;
  var idx = ultimaFora + 1;
  return { jaEstavel: false, minutos: EstufaQ_r_((EstufaQ_ms_(linhasJanela[idx]) - EstufaQ_ms_(linhasJanela[0])) / 60000, 1), instante: linhasJanela[idx].tempoStr };
}

/** Umidade relativa (quando o arquivo tem a coluna e a grandeza é avaliada). */
function EstufaQ_umidade_(linhas) {
  var v = linhas.map(function (r) { return EstufaQ_valor_(r.umidade); }).filter(function (x) { return x !== null; });
  if (!v.length) return null;
  var soma = v.reduce(function (a, b) { return a + b; }, 0);
  return { leituras: v.length, faltando: linhas.length - v.length, min: EstufaQ_r_(Math.min.apply(null, v), 1), max: EstufaQ_r_(Math.max.apply(null, v), 1), media: EstufaQ_r_(soma / v.length, 1) };
}

/** Qualidade das séries: leitura impossível, sensor parado e pico (SGO_QualifTermica_Calculos.js). */
function EstufaQ_qualidade_(linhas, ativosIdx, cfgPerfil) {
  var achados = [];
  var ref = linhas.map(function (r) {
    var vs = ativosIdx.map(function (s) { return EstufaQ_valor_(r.temperaturas[s]); }).filter(function (x) { return x !== null; });
    return { ms: EstufaQ_ms_(r), t: vs.length ? vs.reduce(function (a, b) { return a + b; }, 0) / vs.length : null };
  });
  ativosIdx.forEach(function (s) {
    var serie = linhas.map(function (r) { return { ms: EstufaQ_ms_(r), t: EstufaQ_valor_(r.temperaturas[s]) }; });
    var q = SGO_QT_qualidadeSensor_(serie, { faixaFisica: cfgPerfil.faixaFisica, paradoMinLeituras: cfgPerfil.paradoMin, paradoVariacaoProcesso: cfgPerfil.paradoVariacao, referencia: ref, picoMin: cfgPerfil.picoMin });
    if (q.foraFaixa.length) achados.push({ tipo: 'IMPOSSIVEL', sensor: 'S' + (s + 1), n: q.foraFaixa.length, exemplo: linhas[q.foraFaixa[0].i].tempoStr, valor: q.foraFaixa[0].t });
    if (q.parado.length) achados.push({ tipo: 'PARADO', sensor: 'S' + (s + 1), n: q.parado.length, exemplo: linhas[q.parado[0].i0].tempoStr + ' a ' + linhas[q.parado[0].i1].tempoStr, valor: q.parado[0].t });
    if (q.picos.length) achados.push({ tipo: 'PICO', sensor: 'S' + (s + 1), n: q.picos.length, exemplo: linhas[q.picos[0].i].tempoStr, valor: q.picos[0].t });
  });
  return achados;
}

/**
 * Incerteza de medição (orçamento simplificado, k = 2):
 *  u_cal = U do certificado do registrador / k do certificado (maior entre os registradores);
 *  u_res = resolução / (2·√3) (distribuição retangular), quando a resolução é informada;
 *  U_medição = 2·√(u_cal² + u_res²) — incerteza de cada leitura;
 *  u_estab = pior estabilidade / √3 e u_unif = maior diferença entre sensores / (2·√3) (retangulares);
 *  U_volume = 2·√(u_cal² + u_res² + u_estab² + u_unif²) — temperatura do volume útil caracterizado.
 * Sem U no cadastro do registrador: null (vira observação; a trava do registrador já cobre o cadastro).
 */
function EstufaQ_incerteza_(registradores, resolucao, estat) {
  var itens = ((registradores && registradores.itens) || []).filter(function (i) { return typeof i.incertezaU95 === 'number' && isFinite(i.incertezaU95) && i.incertezaU95 > 0 && i.incertezaU95 < 20; });
  if (!itens.length) return null;
  var pior = itens.reduce(function (a, b) { return (b.incertezaU95 / (b.fatorK || 2)) > (a.incertezaU95 / (a.fatorK || 2)) ? b : a; });
  var k = pior.fatorK && pior.fatorK > 0 ? pior.fatorK : 2;
  var uCal = pior.incertezaU95 / k;
  var uRes = resolucao ? resolucao / (2 * Math.sqrt(3)) : null;
  var uMed = Math.sqrt(uCal * uCal + (uRes || 0) * (uRes || 0));
  var out = { registrador: pior.tag, U95Certificado: pior.incertezaU95, kCertificado: k, uCal: EstufaQ_r_(uCal, 3), uRes: uRes === null ? null : EstufaQ_r_(uRes, 3), resolucao: resolucao, Umedicao: EstufaQ_r_(2 * uMed, 2) };
  if (estat && estat.piorEstabilidade && estat.uniformidade && estat.uniformidade.max !== null) {
    var uEst = estat.piorEstabilidade.valor / Math.sqrt(3);
    var uUni = estat.uniformidade.max / (2 * Math.sqrt(3));
    out.uEstab = EstufaQ_r_(uEst, 3); out.uUnif = EstufaQ_r_(uUni, 3);
    out.Uvolume = EstufaQ_r_(2 * Math.sqrt(uMed * uMed + uEst * uEst + uUni * uUni), 2);
  }
  return out;
}

/** Letalidade por sensor de uma repetição (regra dos trapézios, intervalo real; lacuna não soma). */
function EstufaQ_letalidadeRepeticao_(linhas, ativosIdx, cfgLet) {
  var intervalos = EstufaQ_intervalos_(linhas);
  var maxMs = intervalos.medianaSeg ? intervalos.medianaSeg * 1000 * ESTUFAQ_CFG.LACUNA_MULTIPLO : Infinity;
  var porSensor = ativosIdx.map(function (s) {
    var r = SGO_QT_letalidadeTrapezio_(linhas.map(function (l) { return { ms: EstufaQ_ms_(l), t: EstufaQ_valor_(l.temperaturas[s]) }; }), cfgLet.tBase, cfgLet.z, { maxIntervaloMs: maxMs });
    return { sensor: 'S' + (s + 1), valor: EstufaQ_r_(r.total, 2), lacunas: r.lacunas.length, _acum: r.linhas.map(function (x) { return [x.ms, x.acumulado]; }) };
  });
  var pior = porSensor.reduce(function (a, b) { return !a || b.valor < a.valor ? b : a; }, null);
  return { porSensor: porSensor, pior: pior };
}

/* ============================================================
 * Critérios por estudo
 * ============================================================ */

function EstufaQ_crit_(o) {
  return { chave: o.chave, estudo: o.estudo || '', criterio: o.criterio, requisito: o.requisito, referencia: o.referencia, obtido: o.obtido, conforme: o.conforme === undefined ? null : o.conforme, naoAvaliado: !!o.naoAvaliado };
}

function EstufaQ_statusDe_(criterios) {
  if (criterios.some(function (c) { return c.conforme === false; })) return 'REPROVADO';
  if (criterios.some(function (c) { return c.conforme === true; })) return 'APROVADO';
  return 'INFORMATIVO';
}

function EstufaQ_criteriosDistribuicao_(rotulo, estat, faixa, par, umid, prefixo) {
  var l = [];
  var g = estat.global;
  l.push(EstufaQ_crit_({ chave: prefixo + 'FAIXA', estudo: rotulo, criterio: 'Temperatura em todos os pontos dentro da faixa de aceitação',
    requisito: 'Todas as leituras de ' + SGO_DocA4_val_(faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(faixa.tMax, 1, '°C'),
    referencia: par.faixaFonte || 'Faixa de aceitação do protocolo do ensaio',
    obtido: 'Mínima ' + SGO_DocA4_val_(g.min, 2, '°C') + ' (' + g.sensorMin + ') e máxima ' + SGO_DocA4_val_(g.max, 2, '°C') + ' (' + g.sensorMax + ')',
    conforme: g.min !== null && g.min >= faixa.tMin - 1e-9 && g.max <= faixa.tMax + 1e-9 }));
  var u = estat.uniformidade.max;
  l.push(EstufaQ_crit_({ chave: prefixo + 'UNIFORMIDADE', estudo: rotulo, criterio: 'Uniformidade (maior diferença entre sensores no mesmo instante)',
    requisito: par.limUniformidade ? 'Até ' + SGO_DocA4_val_(par.limUniformidade, 2, '°C') : 'Sem limite no protocolo',
    referencia: par.limUniformidade ? ESTUFAQ_CFG.FONTE_PROTOCOLO : '—',
    obtido: par.limUniformidade ? SGO_DocA4_val_(u, 2, '°C') : 'Não avaliado: ' + SGO_DocA4_val_(u, 2, '°C') + ' (informativo, sem limite no protocolo)',
    conforme: par.limUniformidade ? u <= par.limUniformidade + 1e-9 : null, naoAvaliado: !par.limUniformidade }));
  var e = estat.piorEstabilidade;
  l.push(EstufaQ_crit_({ chave: prefixo + 'ESTABILIDADE', estudo: rotulo, criterio: 'Estabilidade no tempo (± metade da variação do sensor menos estável)',
    requisito: par.limEstabilidade ? 'Até ± ' + SGO_DocA4_val_(par.limEstabilidade, 2, '°C') : 'Sem limite no protocolo',
    referencia: par.limEstabilidade ? ESTUFAQ_CFG.FONTE_PROTOCOLO : '—',
    obtido: (par.limEstabilidade ? '' : 'Não avaliado: ') + '± ' + SGO_DocA4_val_(e ? e.valor : null, 2, '°C') + (e ? ' (' + e.sensor + ')' : '') + (par.limEstabilidade ? '' : ' (informativo)'),
    conforme: par.limEstabilidade && e ? e.valor <= par.limEstabilidade + 1e-9 : null, naoAvaliado: !par.limEstabilidade }));
  if (par.setpoint !== null) {
    var desvio = g.media !== null ? EstufaQ_r_(g.media - par.setpoint, 2) : null;
    l.push(EstufaQ_crit_({ chave: prefixo + 'SETPOINT', estudo: rotulo, criterio: 'Desvio da média em relação à temperatura programada (' + SGO_DocA4_val_(par.setpoint, 1, '°C') + ')',
      requisito: par.limDesvioSetpoint ? 'Até ± ' + SGO_DocA4_val_(par.limDesvioSetpoint, 2, '°C') : 'Sem limite no protocolo',
      referencia: par.limDesvioSetpoint ? ESTUFAQ_CFG.FONTE_PROTOCOLO : '—',
      obtido: (par.limDesvioSetpoint ? '' : 'Não avaliado: ') + SGO_DocA4_val_(desvio, 2, '°C') + ' (média ' + SGO_DocA4_val_(g.media, 2, '°C') + ')' + (par.limDesvioSetpoint ? '' : ' (informativo)'),
      conforme: par.limDesvioSetpoint && desvio !== null ? Math.abs(desvio) <= par.limDesvioSetpoint + 1e-9 : null, naoAvaliado: !par.limDesvioSetpoint }));
  }
  if (par.umidade.avaliar && umid) {
    var temLim = par.umidade.urMin !== null || par.umidade.urMax !== null;
    var ok = temLim ? ((par.umidade.urMin === null || umid.min >= par.umidade.urMin) && (par.umidade.urMax === null || umid.max <= par.umidade.urMax)) : null;
    l.push(EstufaQ_crit_({ chave: prefixo + 'UMIDADE', estudo: rotulo, criterio: 'Umidade relativa dentro da faixa de aceitação',
      requisito: temLim ? [par.umidade.urMin !== null ? 'mínima ' + SGO_DocA4_val_(par.umidade.urMin, 1, '%') : '', par.umidade.urMax !== null ? 'máxima ' + SGO_DocA4_val_(par.umidade.urMax, 1, '%') : ''].filter(Boolean).join(' e ') : 'Sem faixa no protocolo',
      referencia: temLim ? ESTUFAQ_CFG.FONTE_PROTOCOLO : '—',
      obtido: (temLim ? '' : 'Não avaliado: ') + 'de ' + SGO_DocA4_val_(umid.min, 1, '%') + ' a ' + SGO_DocA4_val_(umid.max, 1, '%') + (temLim ? '' : ' (informativo)'),
      conforme: ok, naoAvaliado: !temLim }));
  }
  return l;
}

/**
 * Evento (abertura de porta, queda de energia), recalculado sobre as leituras desde o início do evento até o fim
 * do período: qualquer leitura de sensor ativo fora da faixa conta como saída (inclusive depois de fechar a porta
 * ou de voltar a energia, por inércia térmica); a recuperação é a primeira leitura a partir da qual todos ficam na
 * faixa até o fim do período, contada a partir do fim do evento (ou da saída, sem fim informado).
 */
function EstufaQ_eventoProprio_(linhas, ativosIdx, faixa, analise) {
  var t0 = EstufaBanhoRel_ebConverterTempoParaMs_(analise.tempoInicioEvento);
  var tf = analise.tempoFimEvento ? EstufaBanhoRel_ebConverterTempoParaMs_(analise.tempoFimEvento) : null;
  var primeira = null, ultimaFora = -1;
  for (var i = 0; i < linhas.length; i++) {
    for (var k = 0; k < ativosIdx.length; k++) {
      var t = EstufaQ_valor_(linhas[i].temperaturas[ativosIdx[k]]);
      if (t !== null && (t < faixa.tMin || t > faixa.tMax)) {
        if (!primeira) primeira = { i: i, sensor: 'S' + (ativosIdx[k] + 1), valor: t, instante: linhas[i].tempoStr };
        ultimaFora = i;
      }
    }
  }
  var ev = { inicio: analise.tempoInicioEvento, fim: analise.tempoFimEvento || '', rompeu: !!primeira, tempoAlvoMinutos: analise.tempoAlvoMinutos,
    observadoMinutos: linhas.length ? EstufaQ_r_((EstufaQ_ms_(linhas[linhas.length - 1]) - t0) / 60000, 1) : 0,
    primeiraRuptura: primeira ? { sensor: primeira.sensor, valor: EstufaQ_r_(primeira.valor, 2), instante: primeira.instante } : null,
    tempoAteRupturaMinutos: primeira ? EstufaQ_r_((EstufaQ_ms_(linhas[primeira.i]) - t0) / 60000, 1) : null, recuperou: false, tempoAteRecuperacaoMinutos: null };
  if (primeira && ultimaFora < linhas.length - 1) {
    var base = tf !== null && isFinite(tf) ? tf : EstufaQ_ms_(linhas[primeira.i]);
    ev.recuperou = true;
    ev.tempoAteRecuperacaoMinutos = EstufaQ_r_(Math.max(0, EstufaQ_ms_(linhas[ultimaFora + 1]) - base) / 60000, 1);
  }
  return ev;
}

function EstufaQ_criteriosEvento_(rotulo, ev, par, prefixo) {
  var l = [];
  var alvo = ev.tempoAlvoMinutos;
  if (alvo !== null && alvo !== undefined && isFinite(alvo) && alvo > 0) {
    var naoAv = !ev.rompeu && ev.observadoMinutos < alvo;
    l.push(EstufaQ_crit_({ chave: prefixo + 'TEMPO_RUPTURA', estudo: rotulo, criterio: 'Tempo até sair da faixa de aceitação',
      requisito: 'Ao menos ' + SGO_DocA4_val_(alvo, 1, 'min'), referencia: ESTUFAQ_CFG.FONTE_PROTOCOLO,
      obtido: naoAv ? 'Não avaliado: período observado (' + SGO_DocA4_val_(ev.observadoMinutos, 1, 'min') + ') menor que o tempo exigido' : (ev.rompeu ? SGO_DocA4_val_(ev.tempoAteRupturaMinutos, 1, 'min') : 'Não saiu da faixa em ' + SGO_DocA4_val_(ev.observadoMinutos, 1, 'min')),
      conforme: naoAv ? null : (!ev.rompeu || ev.tempoAteRupturaMinutos >= alvo - 1e-9), naoAvaliado: naoAv }));
  }
  if (ev.fim || ev.rompeu) {
    var obtido = ev.recuperou ? SGO_DocA4_val_(ev.tempoAteRecuperacaoMinutos, 1, 'min') + ' após ' + (ev.fim ? 'o fim do evento' : 'a saída da faixa') : (ev.rompeu ? 'Não voltou à faixa no período registrado' : 'Não saiu da faixa');
    l.push(EstufaQ_crit_({ chave: prefixo + 'RECUPERACAO', estudo: rotulo, criterio: 'Recuperação (volta de todos os sensores à faixa)',
      requisito: par.recuperacaoMaxMin ? 'Até ' + SGO_DocA4_val_(par.recuperacaoMaxMin, 1, 'min') : 'Sem limite no protocolo',
      referencia: par.recuperacaoMaxMin ? ESTUFAQ_CFG.FONTE_PROTOCOLO : '—',
      obtido: par.recuperacaoMaxMin ? obtido : 'Não avaliado: ' + obtido.charAt(0).toLowerCase() + obtido.slice(1) + ' (informativo)',
      conforme: par.recuperacaoMaxMin ? (!ev.rompeu || (ev.recuperou && ev.tempoAteRecuperacaoMinutos <= par.recuperacaoMaxMin + 1e-9)) : null,
      naoAvaliado: !par.recuperacaoMaxMin }));
  }
  return l;
}

/* ============================================================
 * Contexto do relatório (pacote único de fatos)
 * ============================================================ */

function EstufaQ_normas_(chavePerfil, cfgPerfil) {
  if (chavePerfil === 'SECADORA_TRAQUEIAS') return [];
  return [ESTUFAQ_CFG.NORMA_BASE + (cfgPerfil.anexo ? ' (Anexo ' + cfgPerfil.anexo + ')' : '')].concat(ESTUFAQ_CFG.NORMAS_REGULATORIAS);
}

function EstufaQ_trava_(codigo, oQue, porQue, comoCorrigir) { return { codigo: codigo, oQue: oQue, porQue: porQue, comoCorrigir: comoCorrigir }; }

/** Travas do registrador (mesma regra da Autoclave: rastreabilidade). */
function EstufaQ_travasRegistrador_(reg) {
  var travas = [];
  var itens = (reg && reg.itens) || [];
  if (!itens.length) travas.push(EstufaQ_trava_('REGISTRADOR_NAO_INFORMADO', 'O registrador de dados usado no ensaio não foi informado.', 'Sem ele não há como demonstrar a rastreabilidade metrológica das temperaturas.', 'Preencha "Identificação do registrador" (seção 6) com a identificação cadastrada em Padrões de referência (ex.: DTL-01).'));
  itens.forEach(function (it) {
    if (!it.encontrado) travas.push(EstufaQ_trava_('REGISTRADOR_NAO_CADASTRADO', 'O registrador "' + it.tag + '" não está no cadastro de padrões.', 'Sem o cadastro não é possível conferir o certificado de calibração e a validade.', 'Cadastre o registrador em Cadastros › Padrões de referência (certificado, validade e incerteza) ou corrija a identificação digitada.'));
    else if (it.conforme === false) travas.push(EstufaQ_trava_('REGISTRADOR_VENCIDO', 'O certificado de calibração do registrador ' + it.tag + ' (' + (it.certificado || 'sem número') + ') estava vencido na data do ensaio (validade ' + it.validade + ').', 'Medição feita com instrumento fora da validade de calibração não tem rastreabilidade.', 'Se o certificado foi renovado antes do ensaio, atualize a validade em Padrões de referência; se não, o ensaio precisa ser repetido com registrador calibrado.'));
    else if (it.conforme === null) travas.push(EstufaQ_trava_('REGISTRADOR_SEM_VALIDADE', 'O registrador ' + it.tag + ' está cadastrado sem a validade do certificado de calibração.', 'Sem a validade não dá para confirmar que a calibração cobria a data do ensaio.', 'Informe a validade do certificado em Cadastros › Padrões de referência.'));
  });
  return travas;
}

/** Tipo do intervalo de registro exigido para o estudo. */
function EstufaQ_grupoIntervalo_(tipo) {
  if (EstufaQ_ehEvento_(tipo)) return 'EVENTO';
  if (tipo === 'PENETRACAO_CARGA_E') return 'PENETRACAO';
  return 'DISTRIBUICAO';
}

/**
 * Monta o contexto. interno (opcional) recebe { resultado, series } para os gráficos — fica fora do
 * contexto, que vai para a tela e é assinado.
 */
function EstufaQ_montarContexto_(payload, interno) {
  payload = payload || {};
  var simulado = EstufaQ_up_(payload.modoEntrada) === 'SIMULADO_ADMIN';
  var par = EstufaQ_parametros_(payload);
  var resultado = EstufaBanhoRel_ebExecutarAnaliseCompleta_(payload);
  simulado = simulado || !!payload.modoRelatorioSimulado;
  var chave = String(payload.perfil || '').trim();
  var perfilCfg = resultado.perfilCfg;
  var cfgP = ESTUFAQ_CFG.PERFIS[chave] || ESTUFAQ_CFG.PERFIS.ESTUFA_INCUBACAO;
  var faixa = { tMin: resultado.faixa.tMin, tMax: resultado.faixa.tMax };
  var ativos = resultado.sensoresAtivos;
  var ativosIdx = EstufaQ_indicesAtivos_(ativos);
  var travas = [], escopo = [], observacoes = [];
  // Secadora: a tela informa a temperatura de trabalho e a tolerância (±) do protocolo; a faixa de aceitação é
  // trabalho ± tolerância. Nos demais perfis a faixa é a mínima e a máxima informadas (a tolerância do modelo
  // anterior não entra: não existe "aprovado com observação").
  if (chave === 'SECADORA_TRAQUEIAS') {
    var tolSec = Number(resultado.faixa.tolerancia) || 0;
    if (!(tolSec > 0)) travas.push(EstufaQ_trava_('SECADORA_SEM_TOLERANCIA', 'A tolerância da temperatura de trabalho da secadora não foi informada.', 'Sem a tolerância do protocolo não há faixa de aceitação para comparar as leituras.', 'Informe a tolerância (± °C) do protocolo na seção 2 e gere de novo.'));
    escopo.push('Faixa de aceitação da secadora: temperatura de trabalho de ' + SGO_DocA4_val_(resultado.faixa.tMin, 1, '°C') + ' ± ' + SGO_DocA4_val_(tolSec, 1, '°C') + ' (protocolo do ensaio).');
    faixa = { tMin: EstufaQ_r_(resultado.faixa.tMin - tolSec, 3), tMax: EstufaQ_r_(resultado.faixa.tMax + tolSec, 3) };
  }

  if (par.setpoint !== null && (par.setpoint < faixa.tMin || par.setpoint > faixa.tMax)) {
    travas.push(EstufaQ_trava_('SETPOINT_FORA_FAIXA', 'A temperatura programada (' + SGO_DocA4_val_(par.setpoint, 1, '°C') + ') está fora da faixa de aceitação (' + SGO_DocA4_val_(faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(faixa.tMax, 1, '°C') + ').', 'A faixa de aceitação deve conter a temperatura de trabalho do equipamento.', 'Confira a temperatura programada e a faixa na seção 2 e gere de novo.'));
  }

  // Sensores: mínimo do anexo.
  var nAtivos = ativosIdx.length;
  if (cfgP.sensoresMinimos && nAtivos < cfgP.sensoresMinimos) {
    var liberado = false;
    if (payload.modoPersonalizado) { try { EstufaBanhoRel_ebValidarSenhaModoPersonalizado_(payload.modoPersonalizadoSenha); liberado = true; } catch (eSenha) { liberado = false; } }
    if (liberado) escopo.push('Ensaio com ' + nAtivos + ' sensores, abaixo do mínimo de ' + cfgP.sensoresMinimos + ' (' + cfgP.fonteSensores + '), conforme metodologia acordada com o cliente e autorizada pela gestão da empresa executante.');
    else travas.push(EstufaQ_trava_('SENSORES_ABAIXO_MINIMO', 'O ensaio tem ' + nAtivos + ' sensor(es) ativo(s); o mínimo para este equipamento é ' + cfgP.sensoresMinimos + ' (' + cfgP.fonteSensores + ').', 'Com menos sensores o mapeamento não cobre o volume útil como pede a referência.', 'Marque os sensores usados no ensaio (seção 3, Sensores). Se o ensaio foi feito com menos sensores, ele precisa ser repetido com a quantidade mínima.'));
  }

  // Registrador (rastreabilidade) e incerteza.
  var estudosDist = (payload.estudos && payload.estudos.distribuicao) || {};
  var a0 = resultado.analises[0] || {};
  var dataDoEnsaio = EstufaBanhoRel_ebExtrairDataDoTexto_(a0.tempoInicio || a0.tempoInicioEvento || estudosDist.inicio || '');
  var registradores = SGO_DocA4_registradores_(EstufaQ_s_(payload.certDataLogger), dataDoEnsaio);
  // Sem o fabricante e o modelo do equipamento (cadastro) na descrição do registrador.
  var nomesCadastro = [payload.marca, payload.modelo].map(EstufaQ_s_).concat(payload._nomesProibidos || []).filter(function (x) { return x.length >= 3; });
  (registradores.itens || []).forEach(function (it) {
    nomesCadastro.forEach(function (n) {
      it.descricao = EstufaQ_s_(it.descricao).replace(new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/\s{2,}/g, ' ').trim();
    });
  });
  if (!simulado) travas = travas.concat(EstufaQ_travasRegistrador_(registradores));

  // Umidade.
  var temUmidadeArquivo = (resultado.dadosCompletos || []).some(function (r) { return EstufaQ_valor_(r.umidade) !== null; });
  if (!par.umidade.avaliar) {
    if ((par.umidade.controla || temUmidadeArquivo) && par.umidade.justificativa.length < 10) {
      travas.push(EstufaQ_trava_('UMIDADE_SEM_JUSTIFICATIVA', par.umidade.controla ? 'O equipamento controla umidade, e a umidade relativa não foi avaliada.' : 'O arquivo do registrador tem leituras de umidade, e a umidade relativa não foi avaliada.', 'Deixar de avaliar uma grandeza medida ou controlada precisa de justificativa registrada no documento.', 'Na seção "Critérios e grandezas", marque "Avaliar umidade relativa" ou escreva a justificativa (ao menos 10 caracteres).'));
    }
    escopo.push('Grandeza avaliada: temperatura.' + (par.umidade.justificativa ? ' Umidade relativa não avaliada: ' + par.umidade.justificativa.replace(/[.\s]+$/, '') + '.' : ''));
  } else {
    escopo.push('Grandezas avaliadas: temperatura e umidade relativa.');
    if (!temUmidadeArquivo) travas.push(EstufaQ_trava_('UMIDADE_SEM_DADOS', '"Avaliar umidade relativa" está marcado, mas o arquivo do registrador não tem coluna de umidade reconhecida.', 'Sem as leituras não há como avaliar a grandeza.', 'Envie o arquivo com a coluna de umidade (cabeçalho com "Umidade" ou "UR") ou desmarque a opção e escreva a justificativa.'));
  }

  // Estudos.
  var estudos = [], series = [];
  resultado.analises.forEach(function (analise) {
    var tipo = String(analise.tipoEstudo || '').toUpperCase();
    var rotulo = EstufaBanhoRel_ebLabelEstudo_(tipo);
    var criterios = [], fatos = { tipoEstudo: tipo };
    var grupo = EstufaQ_grupoIntervalo_(tipo);
    var intervaloMax = (cfgP.intervaloMaxSeg || {})[grupo] || null;
    function conferirTempo(linhas, sufixo) {
      var iv = EstufaQ_intervalos_(linhas);
      iv.lacunas.forEach(function (lc, i) {
        if (i < 3 && !simulado) travas.push(EstufaQ_trava_('LACUNA', rotulo + sufixo + ': intervalo de ' + lc.seg + ' s sem leituras entre ' + lc.de + ' e ' + lc.ate + '.', 'Lacuna no registro deixa o período sem medição; o resultado não pode ser afirmado para esse trecho.', 'Confira o arquivo do registrador (pode haver outro arquivo do mesmo período) ou ajuste o período do estudo para um trecho contínuo.'));
      });
      if (intervaloMax && iv.medianaSeg && iv.medianaSeg > intervaloMax + 0.5) {
        if (par.justificativaProtocolo.length >= 10) escopo.push(rotulo + sufixo + ': intervalo de registro de ' + SGO_DocA4_val_(iv.medianaSeg, 0, 's') + ', maior que ' + intervaloMax + ' s (' + cfgP.fonteIntervalo + '). Justificativa: ' + par.justificativaProtocolo.replace(/[.\s]+$/, '') + '.');
        else if (!simulado) travas.push(EstufaQ_trava_('INTERVALO_REGISTRO', rotulo + sufixo + ': intervalo de registro de ' + SGO_DocA4_val_(iv.medianaSeg, 0, 's') + ', maior que ' + intervaloMax + ' s (' + cfgP.fonteIntervalo + ').', 'Intervalo maior que o da referência pode deixar de registrar oscilações e eventos curtos.', 'Repita o ensaio com o intervalo de ' + intervaloMax + ' s ou, se o protocolo do cliente define outro intervalo, escreva a justificativa em "Justificativa de desvio do protocolo" (seção "Critérios e grandezas").'));
      }
      return iv;
    }
    function conferirQualidade(linhas, sufixo) {
      if (simulado) return;
      EstufaQ_qualidade_(linhas, ativosIdx, cfgP).forEach(function (q) {
        if (q.tipo === 'IMPOSSIVEL') travas.push(EstufaQ_trava_('LEITURA_IMPOSSIVEL', rotulo + sufixo + ': o sensor ' + q.sensor + ' tem ' + q.n + ' leitura(s) impossível(is) para o equipamento (ex.: ' + SGO_DocA4_val_(q.valor, 2, '°C') + ' em ' + q.exemplo + ').', 'Leitura fora da faixa física indica sensor desconectado ou com defeito.', 'Confira o sensor no arquivo; se ele falhou, desmarque-o na seção Sensores (fica registrado) ou repita o ensaio.'));
        if (q.tipo === 'PARADO') travas.push(EstufaQ_trava_('SENSOR_PARADO', rotulo + sufixo + ': o sensor ' + q.sensor + ' ficou com o mesmo valor (' + SGO_DocA4_val_(q.valor, 2, '°C') + ') de ' + q.exemplo + ', enquanto os demais variaram.', 'Sensor parado não acompanha o processo; as leituras dele não representam a posição.', 'Confira o sensor; se ele travou, desmarque-o na seção Sensores (fica registrado) ou repita o ensaio.'));
        if (q.tipo === 'PICO') travas.push(EstufaQ_trava_('PICO', rotulo + sufixo + ': o sensor ' + q.sensor + ' tem ' + q.n + ' pico(s) isolado(s) (ex.: ' + SGO_DocA4_val_(q.valor, 2, '°C') + ' em ' + q.exemplo + ').', 'Pico de uma leitura só, diferente das vizinhas, costuma ser falha de contato ou interferência, e não comportamento do equipamento.', 'Confira o arquivo do registrador. Se for falha do sensor, desmarque-o (fica registrado); se for real, o ensaio deve ser repetido para confirmar.'));
      });
    }
    if (tipo === 'DISTRIBUICAO_VAZIO_E' || tipo === 'PENETRACAO_CARGA_E') {
      var reps = analise._dadosRepeticoes || [];
      fatos.repeticoes = [];
      var cfgLet = tipo === 'PENETRACAO_CARGA_E' ? (EstufaBanhoRel_EBCFG.LETALIDADE[(analise.repeticoes && analise.repeticoes[0] && analise.repeticoes[0].valorLabel === 'FD') ? 'DESPIROGENIZACAO' : 'ESTERILIZACAO']) : null;
      reps.forEach(function (linhas, i) {
        var sufixo = ' — repetição ' + (i + 1), serieLet = null;
        conferirTempo(linhas, sufixo);
        conferirQualidade(linhas, sufixo);
        var est = EstufaQ_estatistica_(linhas, ativosIdx, faixa);
        var rep = analise.repeticoes[i] || {};
        var fr = { numero: i + 1, inicio: linhas[0].tempoStr, fim: linhas[linhas.length - 1].tempoStr, duracaoMinutos: EstufaQ_r_((EstufaQ_ms_(linhas[linhas.length - 1]) - EstufaQ_ms_(linhas[0])) / 60000, 1), global: est.global, uniformidade: est.uniformidade, piorEstabilidade: est.piorEstabilidade, porSensor: est.porSensor };
        if (tipo === 'DISTRIBUICAO_VAZIO_E') {
          criterios = criterios.concat(EstufaQ_criteriosDistribuicao_(rotulo + sufixo, est, faixa, Object.assign({}, par, { setpoint: par.setpoint, umidade: { avaliar: false } }), null, 'R' + (i + 1) + '_'));
        } else {
          var let_ = EstufaQ_letalidadeRepeticao_(linhas, ativosIdx, cfgLet);
          var minimo = rep.valorMinimoExigido;
          fr.letalidade = { rotulo: cfgLet.valorLabel, tBase: cfgLet.tBase, z: cfgLet.z, minimo: minimo, porSensor: let_.porSensor.map(function (x) { return { sensor: x.sensor, valor: x.valor }; }), pior: let_.pior ? { sensor: let_.pior.sensor, valor: let_.pior.valor } : null };
          serieLet = { tipo: tipo, repeticao: i + 1, letalidade: let_.porSensor };
          criterios.push(EstufaQ_crit_({ chave: 'R' + (i + 1) + '_LETALIDADE', estudo: rotulo + sufixo, criterio: 'Letalidade ' + cfgLet.valorLabel + ' no sensor de menor valor',
            requisito: 'Ao menos ' + SGO_DocA4_val_(minimo, 2, 'min') + ' (T ref. ' + SGO_DocA4_val_(cfgLet.tBase, 1, '°C') + ', z ' + SGO_DocA4_val_(cfgLet.z, 1, '°C') + ')',
            referencia: ESTUFAQ_CFG.FONTE_LETALIDADE[cfgLet.valorLabel === 'FD' ? 'DESPIROGENIZACAO' : 'ESTERILIZACAO'],
            obtido: let_.pior ? SGO_DocA4_val_(let_.pior.valor, 2, 'min') + ' (' + let_.pior.sensor + ')' : '—',
            conforme: let_.pior ? let_.pior.valor >= minimo - 1e-9 : false }));
          var ind = rep.indicadorResultado || null;
          var tipoInd = ind && ind.tipo === 'ENDOTOXINA' ? 'Ensaio de endotoxina' : 'Indicador biológico';
          var temInd = ind && ind.aprovado !== null && ind.aprovado !== undefined;
          criterios.push(EstufaQ_crit_({ chave: 'R' + (i + 1) + '_INDICADOR', estudo: rotulo + sufixo, criterio: (ind && ind.tipo ? tipoInd : 'Indicador biológico ou ensaio de endotoxina') + ' (resultado do laboratório)',
            requisito: 'Resultado conforme', referencia: 'Laudo do laboratório informado no ensaio',
            obtido: temInd ? (ind.aprovado ? 'Conforme' : 'Não conforme') + (ind.laboratorio ? ' — ' + ind.laboratorio : '') + (ind.lote ? ', lote ' + ind.lote : '') : 'Não avaliado: resultado não informado',
            conforme: temInd ? ind.aprovado === true : null, naoAvaliado: !temInd }));
          if (cfgLet.valorLabel === 'FD' && !rep.registroCicloFileId) observacoes.push(rotulo + sufixo + ': registro impresso do ciclo do equipamento não anexado.');
        }
        fatos.repeticoes.push(fr);
        series.push({ tipo: tipo, repeticao: i + 1, linhas: linhas });
        if (serieLet) series.push(serieLet); // gráfico do perfil antes do da letalidade, em cada repetição
      });
    } else {
      var linhas = EstufaQ_linhasEstudo_(analise);
      var iv = conferirTempo(linhas, '');
      conferirQualidade(linhas, '');
      var est = EstufaQ_estatistica_(linhas, ativosIdx, EstufaQ_ehEvento_(tipo) ? faixa : faixa);
      fatos.inicio = linhas.length ? linhas[0].tempoStr : '';
      fatos.fim = linhas.length ? linhas[linhas.length - 1].tempoStr : '';
      fatos.duracaoMinutos = linhas.length ? EstufaQ_r_((EstufaQ_ms_(linhas[linhas.length - 1]) - EstufaQ_ms_(linhas[0])) / 60000, 1) : 0;
      fatos.intervaloSeg = iv.medianaSeg;
      fatos.global = est.global; fatos.uniformidade = est.uniformidade; fatos.piorEstabilidade = est.piorEstabilidade;
      fatos.sensorMaisFrio = est.sensorMaisFrio; fatos.sensorMaisQuente = est.sensorMaisQuente;
      fatos.porSensor = est.porSensor;
      if (EstufaQ_ehDistribuicao_(tipo)) {
        if (analise.rampaEstabilizacao) fatos.estabilizacao = { marcada: true, minutos: EstufaQ_r_(analise.rampaEstabilizacao.duracaoMinutos, 1), instante: analise.rampaEstabilizacao.fimRampaStr };
        else { var es = EstufaQ_estabilizacao_(analise._dadosFatia || linhas, ativosIdx, faixa); fatos.estabilizacao = es ? { marcada: false, minutos: es.minutos, instante: es.instante, jaEstavel: !!es.jaEstavel } : null; }
        var umid = par.umidade.avaliar ? EstufaQ_umidade_(linhas) : null;
        if (umid) fatos.umidade = umid;
        criterios = EstufaQ_criteriosDistribuicao_(rotulo, est, faixa, par, umid, '');
        var duracaoMin = cfgP.duracaoMinimaHoras && (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') ? cfgP.duracaoMinimaHoras * 60 : null;
        if (duracaoMin && fatos.duracaoMinutos < duracaoMin - 0.5) {
          if (par.justificativaProtocolo.length >= 10) escopo.push(rotulo + ': duração avaliada de ' + EstufaQ_duracaoTxt_(fatos.duracaoMinutos) + ', menor que ' + cfgP.duracaoMinimaHoras + ' h (' + cfgP.fonteDuracao + '). Justificativa: ' + par.justificativaProtocolo.replace(/[.\s]+$/, '') + '.');
          else if (!simulado) travas.push(EstufaQ_trava_('DURACAO_INSUFICIENTE', rotulo + ': duração avaliada de ' + EstufaQ_duracaoTxt_(fatos.duracaoMinutos) + ', menor que ' + cfgP.duracaoMinimaHoras + ' h (' + cfgP.fonteDuracao + ').', 'Período menor que o da referência não demonstra o comportamento do equipamento ao longo do tempo exigido.', 'Ajuste o início e o fim da distribuição para cobrir ' + cfgP.duracaoMinimaHoras + ' h depois da estabilização, repita o ensaio ou, se o protocolo do cliente define outra duração, escreva a justificativa em "Justificativa de desvio do protocolo".'));
        }
        if (umid && umid.faltando && !simulado) travas.push(EstufaQ_trava_('UMIDADE_LEITURA_FALTANDO', rotulo + ': ' + umid.faltando + ' leitura(s) de umidade faltando no período.', 'A umidade avaliada precisa cobrir o mesmo período da temperatura.', 'Confira a coluna de umidade do arquivo ou ajuste o período.'));
      } else if (EstufaQ_ehEvento_(tipo)) {
        fatos.evento = EstufaQ_eventoProprio_(linhas, ativosIdx, faixa, analise);
        criterios = EstufaQ_criteriosEvento_(rotulo, fatos.evento, par, '');
      } else {
        fatos.autonomiaMinutos = analise.autonomiaMinutos;
      }
      series.push({ tipo: tipo, linhas: analise._dadosFatia || linhas, avaliadas: linhas, uniformidade: est._serieUniformidade, evento: fatos.evento || null, rampa: analise.rampaEstabilizacao || null });
    }
    // Observações do modelo novo: as do motor antigo repetem a estatística ou falam de tolerância e de 24 h
    // (tratadas por critério e trava). Só os alertas de evento (inércia térmica, sem recuperação) seguem.
    var obs = EstufaQ_ehEvento_(tipo) ? (analise.alertasAnalise || []).slice() : [];
    estudos.push({ tipoEstudo: tipo, rotulo: rotulo, etapa: EstufaQ_etapaEstudo_(tipo), statusAprovacao: EstufaQ_statusDe_(criterios), criterios: criterios, fatos: fatos, observacoesAnalise: obs.slice(0, 6) });
  });

  // Incerteza (sobre o primeiro estudo de distribuição; senão, o primeiro estudo).
  var base = estudos.filter(function (e) { return e.fatos.global; })[0] || null;
  var incerteza = EstufaQ_incerteza_(registradores, par.resolucao, base ? { piorEstabilidade: base.fatos.piorEstabilidade, uniformidade: base.fatos.uniformidade } : null);
  if (!incerteza) observacoes.push('A incerteza expandida do registrador não está no cadastro de padrões; a incerteza de medição não foi declarada neste documento.');
  else if (!par.resolucao) observacoes.push('A resolução do registrador não foi informada; a contribuição da resolução não entrou no orçamento de incerteza.');
  estudos.forEach(function (e) {
    (e.fatos.repeticoes || []).forEach(function (r) {
      if (r.letalidade && r.letalidade.pior && incerteza) r.letalidade.incerteza = EstufaQ_r_(SGO_QT_incertezaLetalidade_(r.letalidade.pior.valor, incerteza.Umedicao, r.letalidade.z), 2);
    });
  });

  var criterios = [];
  estudos.forEach(function (e) { e.criterios.forEach(function (c) { criterios.push(Object.assign({ etapa: e.etapa }, c)); }); });
  var ncs = criterios.filter(function (c) { return c.conforme === false; });
  var status = EstufaQ_statusDe_(criterios);
  var resumo = status === 'APROVADO' ? 'Todos os critérios avaliados foram atendidos.' : (status === 'REPROVADO' ? 'Não atendido: ' + ncs.map(function (c) { return c.estudo + ' — ' + c.criterio.toLowerCase(); }).join('; ') + '.' : 'Ensaio sem critério de aprovação avaliado (resultado informativo).');
  var tipoEq = EstufaQ_s_(payload.tipoEquipamento);
  if (payload.equipamentoId && tipoEq && !ESTUFAQ_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(tipoEq))) {
    travas.push(EstufaQ_trava_('TIPO_EQUIPAMENTO', 'O equipamento escolhido está cadastrado como "' + tipoEq + '", e este relatório é de estufa, banho-maria ou secadora.', 'O relatório precisa corresponder ao equipamento ensaiado.', 'Escolha o equipamento certo em "Cliente e equipamento" ou corrija o tipo em Cadastros › Equipamentos.'));
  }

  var ctx = {
    versao: 1, modulo: 'ESTUFA', simulado: simulado,
    perfil: chave, perfilLabel: perfilCfg.label, anexo: cfgP.anexo || '',
    identificacao: {
      clienteId: EstufaQ_s_(payload.clienteId), unidadeId: EstufaQ_s_(payload.unidadeId), equipamentoId: EstufaQ_s_(payload.equipamentoId),
      cliente: EstufaQ_s_(payload.cliente), cnpj: EstufaQ_s_(payload.cnpj), endereco: EstufaQ_s_(payload.endereco), setor: EstufaQ_s_(payload.localizacao),
      tag: EstufaQ_s_(payload.tagEquipamento), numeroSerie: EstufaQ_s_(payload.numeroSerie), tipoEquipamento: tipoEq || perfilCfg.label,
      volumeLitros: EstufaQ_s_(payload.volumeLitros), tecnicoExecutor: EstufaQ_s_(payload.responsavelTecnico),
      responsavelAceite: EstufaQ_s_(payload.certResponsavelAceite), tarefaOrigem: EstufaQ_s_(payload.certTarefaOrigem),
      dtl: EstufaQ_s_(payload.certDataLogger), dataDoEnsaio: dataDoEnsaio,
      certificadoNumero: EstufaQ_s_(payload.certNumero), revisao: EstufaQ_s_(payload.certRevisao) || '0',
      empresaExecutante: EstufaBanhoRel_EBCFG.EMPRESA_EXECUTANTE
    },
    faixa: faixa, parametros: { setpoint: par.setpoint, limUniformidade: par.limUniformidade, limEstabilidade: par.limEstabilidade, limDesvioSetpoint: par.limDesvioSetpoint, recuperacaoMaxMin: par.recuperacaoMaxMin, resolucao: par.resolucao },
    grandezas: { temperatura: true, umidade: par.umidade.avaliar, justificativaSemUmidade: par.umidade.avaliar ? '' : par.umidade.justificativa },
    sensores: { instalados: resultado.nSensores, ativos: ativosIdx.map(function (s) { return 'S' + (s + 1); }), desabilitados: ativos.map(function (a, i) { return a ? '' : 'S' + (i + 1); }).filter(Boolean), minimo: cfgP.sensoresMinimos, fonteMinimo: cfgP.fonteSensores },
    registradores: registradores, incerteza: incerteza,
    estudos: estudos, criterios: criterios, statusConsolidado: status, resumoResultado: resumo,
    naoConformidades: ncs.map(function (c) { return c.estudo + ': ' + c.criterio.charAt(0).toLowerCase() + c.criterio.slice(1) + ' — obtido ' + c.obtido + ' (requisito: ' + c.requisito + ').'; }),
    observacoes: observacoes.concat((registradores.observacoes || [])),
    escopo: escopo, normas: EstufaQ_normas_(chave, cfgP), regraDecisao: ESTUFAQ_CFG.REGRA_DECISAO,
    travas: travas, emissaoBloqueada: travas.length > 0,
    _nomesProibidos: [payload.marca, payload.modelo].map(EstufaQ_s_).filter(function (x) { return x.length >= 3; }).concat(payload._nomesProibidos || [])
  };
  ctx.assinaturaDados = SGO_DocSalvar_assinatura_({ d: (resultado.dadosCompletos || []).map(function (r) { return [EstufaQ_ms_(r)].concat(ativosIdx.map(function (s) { return r.temperaturas[s]; })); }), e: payload.estudos || {}, f: faixa, a: ativos, q: payload.qualif || {} });
  if (interno) { interno.resultado = resultado; interno.series = series; }
  return ctx;
}

/** Contexto para a tela: sem os campos internos (nomes de fabricante e modelo usados só na conferência dos textos). */
function EstufaQ_ctxTela_(ctx) {
  var c = Object.assign({}, ctx);
  delete c._nomesProibidos;
  return c;
}

/** Assinatura dos fatos (número e revisão do documento ficam de fora: são atribuídos na emissão). */
function EstufaQ_assinatura_(ctx) {
  var c = JSON.parse(JSON.stringify(ctx));
  delete c.identificacao.certificadoNumero; delete c.identificacao.revisao;
  return SGO_DocSalvar_assinatura_(c);
}

/* ============================================================
 * Textos: padrão determinístico, IA com conferência
 * ============================================================ */

var ESTUFAQ_TERMOS_FORA = [/press[aã]o|v[aá]cuo|vapor saturado|\bF0\b|\bmbar\b/i];

function EstufaQ_regrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  var termos = ESTUFAQ_TERMOS_FORA.slice();
  if (!ctx.grandezas.umidade) termos.push(/umidade|\bUR\b/i);
  (ctx._nomesProibidos || []).forEach(function (n) { termos.push(new RegExp('\\b' + String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')); });
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.criterios, ctx.faixa, ctx.parametros, ctx.estudos.map(function (e) { return [e.fatos, e.observacoesAnalise]; }), ctx.incerteza, ctx.sensores, ctx.normas, ctx.escopo, ctx.registradores]),
    normas: ctx.normas, veredito: ctx.statusConsolidado, exigirVeredito: !!exigirVeredito, verificarNumeros: verificarNumeros !== false, termosProibidos: termos
  };
}

function EstufaQ_conferirTextos_(ctx, textos, verificarNumeros) {
  var blocos = {
    'Conclusão técnica': { texto: textos.conclusaoGeral, regras: EstufaQ_regrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoLeigo, regras: EstufaQ_regrasTexto_(ctx, false, verificarNumeros) }
  };
  ctx.estudos.forEach(function (e) {
    var r = EstufaQ_regrasTexto_(ctx, false, verificarNumeros);
    r.veredito = e.statusAprovacao;
    blocos['Análise — ' + e.rotulo] = { texto: (textos.analisePorEstudo || {})[e.tipoEstudo], regras: r };
  });
  return SGO_QIAV_verificarBlocos_(blocos);
}

function EstufaQ_equipTexto_(ctx) {
  return { ESTUFA_INCUBACAO: 'A estufa de incubação', BANHO_MARIA: 'O banho-maria', ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO: 'A estufa de esterilização e despirogenização', SECADORA_TRAQUEIAS: 'A secadora de traqueias' }[ctx.perfil] || 'O equipamento';
}

function EstufaQ_textosPadrao_(ctx) {
  var analise = {};
  ctx.estudos.forEach(function (e) {
    var f = e.fatos, p = [];
    if (f.repeticoes) {
      p.push('O estudo foi realizado em ' + f.repeticoes.length + ' repetições independentes, com ' + ctx.sensores.ativos.length + ' sensores ativos.');
      f.repeticoes.forEach(function (r) {
        var t = 'Na repetição ' + r.numero + ' (' + r.inicio + ' a ' + r.fim + '), as temperaturas variaram de ' + SGO_DocA4_val_(r.global.min, 2, '°C') + ' a ' + SGO_DocA4_val_(r.global.max, 2, '°C') + ', com maior diferença entre sensores de ' + SGO_DocA4_val_(r.uniformidade.max, 2, '°C') + '.';
        if (r.letalidade && r.letalidade.pior) t += ' A letalidade ' + r.letalidade.rotulo + ' do sensor de menor valor (' + r.letalidade.pior.sensor + ') foi de ' + SGO_DocA4_val_(r.letalidade.pior.valor, 2, 'min') + ', para o mínimo de ' + SGO_DocA4_val_(r.letalidade.minimo, 2, 'min') + '.';
        p.push(t);
      });
    } else if (f.evento) {
      var ev = f.evento;
      p.push('O evento começou em ' + ev.inicio + (ev.fim ? ' e terminou em ' + ev.fim : '') + '. ' + (ev.rompeu ? 'Os sensores saíram da faixa de aceitação após ' + SGO_DocA4_val_(ev.tempoAteRupturaMinutos, 1, 'min') + (ev.primeiraRuptura ? ', primeiro no sensor ' + ev.primeiraRuptura.sensor : '') + '.' : 'Nenhum sensor saiu da faixa de aceitação no período observado.') +
        (ev.recuperou ? ' Todos os sensores voltaram à faixa em ' + SGO_DocA4_val_(ev.tempoAteRecuperacaoMinutos, 1, 'min') + '.' : (ev.rompeu ? ' Os sensores não voltaram à faixa no período registrado.' : '')));
    } else if (f.global) {
      p.push('O estudo avaliou ' + EstufaQ_duracaoTxt_(f.duracaoMinutos) + ' de registro (' + f.inicio + ' a ' + f.fim + '), com ' + ctx.sensores.ativos.length + ' sensores ativos. As temperaturas variaram de ' + SGO_DocA4_val_(f.global.min, 2, '°C') + ' (' + f.global.sensorMin + ') a ' + SGO_DocA4_val_(f.global.max, 2, '°C') + ' (' + f.global.sensorMax + '), com média de ' + SGO_DocA4_val_(f.global.media, 2, '°C') + '.');
      p.push('A maior diferença entre sensores no mesmo instante foi de ' + SGO_DocA4_val_(f.uniformidade.max, 2, '°C') + (f.piorEstabilidade ? ', e o sensor menos estável no tempo foi ' + f.piorEstabilidade.sensor + ', com ± ' + SGO_DocA4_val_(f.piorEstabilidade.valor, 2, '°C') : '') + '.' +
        (f.sensorMaisFrio && f.sensorMaisQuente ? ' A posição mais fria foi ' + f.sensorMaisFrio.sensor + ' e a mais quente, ' + f.sensorMaisQuente.sensor + '.' : ''));
    }
    var nc = e.criterios.filter(function (c) { return c.conforme === false; });
    if (nc.length) p.push('Não foram atendidos: ' + nc.map(function (c) { return c.criterio.charAt(0).toLowerCase() + c.criterio.slice(1) + ' (obtido ' + c.obtido + '; requisito ' + c.requisito + ')'; }).join('; ') + '.');
    else if (e.criterios.some(function (c) { return c.conforme === true; })) p.push('Os critérios avaliados neste estudo foram atendidos.');
    analise[e.tipoEstudo] = p.join('\n\n');
  });
  var st = ctx.statusConsolidado;
  var aval = ctx.criterios.filter(function (c) { return c.conforme !== null; });
  var nc = ctx.criterios.filter(function (c) { return c.conforme === false; });
  var conclusao = [
    (aval.length === 1 ? 'Foi avaliado 1 critério de aceitação' : 'Foram avaliados ' + aval.length + ' critérios de aceitação') + ' em ' + (ctx.estudos.length === 1 ? '1 estudo' : ctx.estudos.length + ' estudos') + '. ' +
      (nc.length ? 'Não foram atendidos: ' + nc.map(function (c) { return c.estudo + ' — ' + c.criterio.charAt(0).toLowerCase() + c.criterio.slice(1); }).join('; ') + '.' : (aval.length ? 'Todos os critérios avaliados foram atendidos.' : 'Nenhum critério de aprovação foi aplicável.')),
    st === 'APROVADO' ? 'O ensaio está APROVADO.' : (st === 'REPROVADO' ? 'O ensaio está REPROVADO.' : 'O ensaio tem caráter informativo, sem critério de aprovação aplicável.')
  ].join('\n\n');
  var eq = EstufaQ_equipTexto_(ctx);
  var leigo = st === 'APROVADO' ? eq + ' manteve a temperatura dentro dos limites definidos em todos os pontos medidos durante os estudos realizados. O resultado deste ensaio é aprovado.'
    : (st === 'REPROVADO' ? eq + ' não atendeu a alguma das condições definidas para os estudos realizados, conforme indicado nos critérios. O resultado deste ensaio é reprovado; o equipamento deve ser avaliado e o ensaio repetido antes da liberação para uso.'
      : 'Este ensaio registra o comportamento do equipamento para consulta, sem critério de aprovação aplicável.');
  return { analisePorEstudo: analise, conclusaoGeral: conclusao, conclusaoLeigo: leigo };
}

function EstufaQ_promptIA_(ctx) {
  var fatos = {
    equipamento: ctx.perfilLabel, resultado: ctx.statusConsolidado, faixaAceitacao: SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C'),
    temperaturaProgramada: ctx.parametros.setpoint !== null ? SGO_DocA4_val_(ctx.parametros.setpoint, 1, '°C') : undefined,
    sensoresAtivos: ctx.sensores.ativos.length,
    estudos: ctx.estudos.map(function (e) {
      return { chave: e.tipoEstudo, estudo: e.rotulo, resultado: e.statusAprovacao, fatos: SGO_DocA4_fatosPtBr_(JSON.parse(JSON.stringify(Object.assign({}, e.fatos, { porSensor: undefined, repeticoes: e.fatos.repeticoes ? e.fatos.repeticoes.map(function (r) { return Object.assign({}, r, { porSensor: undefined }); }) : undefined })))),
        criterios: e.criterios.map(function (c) { return { criterio: c.criterio, requisito: c.requisito, obtido: c.obtido, situacao: c.naoAvaliado ? 'não avaliado' : (c.conforme ? 'atendido' : 'não atendido') }; }) };
    }),
    incertezaMedicao: ctx.incerteza ? SGO_DocA4_val_(ctx.incerteza.Umedicao, 2, '°C') : undefined,
    escopo: ctx.escopo, normasCitaveis: ctx.normas
  };
  return [
    'Você redige a interpretação técnica de um relatório de ensaio térmico de ' + ctx.perfilLabel.toLowerCase() + ', como o engenheiro responsável.',
    SGO_DocA4_regrasRedacaoIA_(),
    '- Não escreva sobre pressão nem vácuo.' + (ctx.grandezas.umidade ? '' : ' Não escreva sobre umidade: só a temperatura foi avaliada.'),
    '- Não cite número de seção, item ou cláusula de norma.',
    'Devolva somente um objeto JSON com as chaves "analisePorEstudo" (objeto cuja chave é o campo "chave" de cada estudo e o valor é um ou dois parágrafos de análise daquele estudo, com o resultado do estudo), "conclusaoGeral" (dois a três parágrafos que terminam declarando o resultado: ' + ctx.statusConsolidado + ') e "conclusaoLeigo" (um parágrafo curto, sem termos técnicos, com o mesmo resultado).',
    'FATOS (únicos permitidos):',
    JSON.stringify(fatos)
  ].join('\n');
}

function EstufaQ_redigirIA_(ctx) {
  var bruto = SGO_DocA4_chamarGemini_(EstufaQ_promptIA_(ctx), { tokens: 16384, temperatura: 0.2 });
  var m = /\{[\s\S]*\}/.exec(String(bruto || ''));
  if (!m) throw new Error('a redação automática não devolveu o formato esperado');
  var o = JSON.parse(m[0]);
  var a = {};
  ctx.estudos.forEach(function (e) { a[e.tipoEstudo] = SGO_DocA4_limparTextoIA_((o.analisePorEstudo || {})[e.tipoEstudo]); });
  return { analisePorEstudo: a, conclusaoGeral: SGO_DocA4_limparTextoIA_(o.conclusaoGeral), conclusaoLeigo: SGO_DocA4_limparTextoIA_(o.conclusaoLeigo) };
}

function EstufaQ_textosDoPayload_(ctx, payload) {
  var t = payload.textosCertificado || {};
  var textos = { conclusaoGeral: EstufaQ_s_(t.conclusaoGeral), conclusaoLeigo: EstufaQ_s_(t.conclusaoLeigo), analisePorEstudo: {} };
  ctx.estudos.forEach(function (e) { textos.analisePorEstudo[e.tipoEstudo] = EstufaQ_s_((t.analisePorEstudo || {})[e.tipoEstudo]); });
  if (!textos.conclusaoGeral || !textos.conclusaoLeigo || ctx.estudos.some(function (e) { return !textos.analisePorEstudo[e.tipoEstudo]; })) {
    throw new Error('A interpretação está incompleta. Preencha a análise de cada estudo e as duas conclusões (ou gere o rascunho de novo para receber o texto padrão).');
  }
  var conf = EstufaQ_conferirTextos_(ctx, textos, false);
  if (!conf.ok) throw new Error('Os textos revisados não podem ser emitidos: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e tente de novo.');
  return textos;
}

/* ============================================================
 * Vínculo com o cadastro (cliente → unidade → equipamento)
 * ============================================================ */

/** Troca a identificação digitada pela do cadastro. Relatório interno (dados reconstituídos) fica de fora. */
function EstufaQ_aplicarVinculo_(sessionId, payload, exigir) {
  payload = payload || {};
  if (EstufaQ_up_(payload.modoEntrada) === 'SIMULADO_ADMIN') return payload;
  var obrigatorio = exigir !== false;
  try { if (EstufaQ_up_(PropertiesService.getScriptProperties().getProperty('QUALIF_VINCULO_OBRIGATORIO')) === 'NAO') obrigatorio = false; } catch (e) {}
  if (!payload.equipamentoId && !obrigatorio) return payload;
  var id = SGO_QEQ_identificacao_(sessionId, payload.clienteId, payload.unidadeId, payload.equipamentoId);
  return Object.assign({}, payload, {
    clienteId: id.clienteId, unidadeId: id.unidadeId, equipamentoId: id.equipamentoId,
    cliente: id.cliente, cnpj: id.cnpj, endereco: [id.endereco, id.cidadeUf].filter(Boolean).join(' - '),
    localizacao: [id.unidade, id.setor].filter(Boolean).join(' — '), tagEquipamento: id.tag, tag: id.tag, numeroSerie: id.numeroSerie,
    tipoEquipamento: id.tipo, marca: '', modelo: '', _nomesProibidos: id._nomesProibidos
  });
}

/* ============================================================
 * Emissão (relatório de ensaio e planilha de dados) — QUALIF_EMISSOES
 * ============================================================ */

function EstufaQ_pastaLaudos_() {
  return SGO_DocSalvar_pastaPersistente_('LAUDOS_FOLDER_ID', 'Estufa+Banho-maria - Laudos', EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID);
}

/** Número do relatório de ensaio: REE-aaaa-00001 (quando o técnico não informa). */
function EstufaQ_proximoNumero_() {
  var ano = '';
  try { ano = Utilities.formatDate(new Date(), EstufaQ_tz_(), 'yyyy'); } catch (e) { ano = String(new Date().getFullYear()); }
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var chave = ESTUFAQ_CFG.PROP_SEQ + ano;
    var n = (parseInt(props.getProperty(chave), 10) || 0) + 1;
    var usados = SGO_QE_listar_(ESTUFAQ_CFG.MODULO_ENSAIO).concat(SGO_QE_listar_(ESTUFAQ_CFG.MODULO_DADOS)).map(function (r) { return r.NUMERO; });
    var numero;
    do { numero = ESTUFAQ_CFG.SIGLA_ENSAIO + '-' + ano + '-' + ('0000' + n).slice(-5); n++; } while (usados.indexOf(numero) >= 0);
    props.setProperty(chave, String(n - 1));
    return numero;
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

function EstufaQ_exigirSemTravas_(ctx) {
  if (!ctx.emissaoBloqueada) return;
  throw new Error('O documento não foi emitido porque os dados têm ' + ctx.travas.length + ' problema(s) a corrigir: ' +
    ctx.travas.map(function (t, i) { return (i + 1) + ') ' + t.oQue + ' Por quê: ' + t.porQue + ' Como corrigir: ' + t.comoCorrigir; }).join(' '));
}

/** Resumo guardado na emissão do relatório de ensaio (usado pelo relatório de qualificação). */
function EstufaQ_resumoEnsaio_(ctx) {
  return {
    v: 1, perfil: ctx.perfil, perfilLabel: ctx.perfilLabel, anexo: ctx.anexo, statusConsolidado: ctx.statusConsolidado, resumoResultado: ctx.resumoResultado,
    faixa: ctx.faixa, parametros: ctx.parametros, grandezas: ctx.grandezas, sensores: { ativos: ctx.sensores.ativos.length, minimo: ctx.sensores.minimo },
    identificacao: { certificadoNumero: ctx.identificacao.certificadoNumero, revisao: ctx.identificacao.revisao, dataDoEnsaio: ctx.identificacao.dataDoEnsaio, tecnicoExecutor: ctx.identificacao.tecnicoExecutor, dtl: ctx.identificacao.dtl, tag: ctx.identificacao.tag },
    estudos: ctx.estudos.map(function (e) {
      var f = e.fatos;
      return { tipoEstudo: e.tipoEstudo, rotulo: e.rotulo, etapa: e.etapa, status: e.statusAprovacao,
        min: f.global ? f.global.min : null, max: f.global ? f.global.max : null, media: f.global ? f.global.media : null, uniformidade: f.uniformidade ? f.uniformidade.max : null,
        estabilidade: f.piorEstabilidade ? f.piorEstabilidade.valor : null, duracaoMinutos: f.duracaoMinutos,
        repeticoes: f.repeticoes ? f.repeticoes.map(function (r) { return { numero: r.numero, min: r.global.min, max: r.global.max, letalidade: r.letalidade ? { rotulo: r.letalidade.rotulo, pior: r.letalidade.pior, minimo: r.letalidade.minimo } : null }; }) : null };
    }),
    criterios: ctx.criterios.map(function (c) { return { chave: c.chave, estudo: c.estudo, etapa: c.etapa, criterio: c.criterio, requisito: c.requisito, referencia: c.referencia, obtido: c.obtido, conforme: c.conforme, naoAvaliado: c.naoAvaliado }; }),
    registradores: ctx.registradores, incerteza: ctx.incerteza, escopo: ctx.escopo, normas: ctx.normas
  };
}

function EstufaQ_camposRegistro_(ctx, payload, sessao, modulo) {
  return {
    MODULO: modulo, NUMERO: ctx.identificacao.certificadoNumero, REVISAO: ctx.identificacao.revisao,
    CLIENTE: ctx.identificacao.cliente, CNPJ: ctx.identificacao.cnpj, TAG: ctx.identificacao.tag, RESULTADO: ctx.statusConsolidado,
    HASH_CONTEXTO: EstufaQ_assinatura_(ctx), ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    JUSTIFICATIVA_ESCOPO: ctx.escopo.join(' | ').slice(0, 2000),
    CLIENTE_ID: ctx.identificacao.clienteId, UNIDADE_ID: ctx.identificacao.unidadeId, EQUIPAMENTO_ID: ctx.identificacao.equipamentoId
  };
}

/** Validação comum antes de emitir ou enviar (relatório de ensaio). */
function EstufaQ_validar_(payload) {
  var interno = {};
  var ctx = EstufaQ_montarContexto_(payload, interno);
  if (!payload.assinaturaContexto || payload.assinaturaContexto !== EstufaQ_assinatura_(ctx)) {
    throw new Error('Os dados ou os critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Clique em "Gerar rascunho" de novo, revise os textos e emita.');
  }
  EstufaQ_exigirSemTravas_(ctx);
  return { ctx: ctx, interno: interno, textos: EstufaQ_textosDoPayload_(ctx, payload) };
}

function EstufaQ_fotosValidas_(fotos) {
  return (Array.isArray(fotos) ? fotos : []).slice(0, 4).filter(function (f) {
    if (!f || !f.base64) return false;
    if (!/^image\/(jpeg|png|webp)$/.test(String(f.mimeType || 'image/jpeg')) || !/^[A-Za-z0-9+/]+={0,2}$/.test(String(f.base64))) throw new Error('Foto inválida. Use imagem JPEG, PNG ou WebP.');
    return true;
  });
}

/** Emite (aprovação registrada): HTML + PDF na pasta do equipamento e revisão no registro. */
function EstufaQ_emitirEnsaio_(payload, v, sessao, idPendente) {
  var ctx = v.ctx;
  var numero = ctx.identificacao.certificadoNumero || EstufaQ_proximoNumero_();
  ctx.identificacao.certificadoNumero = numero;
  var revisao = ctx.simulado ? 0 : SGO_QE_proximaRevisao_(ESTUFAQ_CFG.MODULO_ENSAIO, numero, ctx.identificacao.revisao);
  ctx.identificacao.revisao = String(revisao);
  var aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: EstufaQ_s_(sessao && sessao.usuario), perfil: EstufaQ_s_(sessao && sessao.perfil), em: SGO_QE_agora_() };
  var html = EstufaRelEnsaio_html_(ctx, v.interno, v.textos, EstufaQ_fotosValidas_(payload.fotosCertificado), aprovacao, false);
  var payloadSalvar = Object.assign({}, payload, { certNumero: numero, tag: ctx.identificacao.tag, tipoEquipamento: ctx.identificacao.tipoEquipamento });
  var r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, EstufaQ_pastaLaudos_, 'Relatório de ensaio Estufa' + (revisao ? ' rev ' + revisao : ''), EstufaQ_tz_());
  if (!ctx.simulado) {
    var campos = { STATUS: 'EMITIDO', NUMERO: numero, REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em,
      PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: ctx.statusConsolidado, RESUMO_JSON: JSON.stringify(EstufaQ_resumoEnsaio_(ctx)) };
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(EstufaQ_camposRegistro_(ctx, payload, sessao, ESTUFAQ_CFG.MODULO_ENSAIO), campos, { PAYLOAD_JSON: JSON.stringify(Object.assign({}, payload, { fotosCertificado: [] })) }));
    SGO_QE_marcarSubstituidas_(ESTUFAQ_CFG.MODULO_ENSAIO, numero, id);
    r.emissaoId = id;
  }
  r.numero = numero; r.revisao = revisao; r.aprovadoPor = aprovacao.nome; r.resultado = ctx.statusConsolidado;
  return r;
}

/* ---------------- API (EstufaBanhoRel_apiDispatch) ---------------- */

function EstufaQ_apiSituacao(payload, sessao) {
  return { ok: true, modelo: EstufaQ_modelo_(), podeAprovar: EstufaQ_ehAprovador_(sessao), podeAlterarModelo: EstufaQ_up_(sessao && sessao.perfil) === 'ADMIN',
    perfisAprovadores: ESTUFAQ_CFG.PERFIS_APROVADORES, perfis: ESTUFAQ_CFG.PERFIS };
}

/** Só o Administrador volta ao modelo anterior (ou ao novo). */
function EstufaQ_apiDefinirModelo(payload, sessao) {
  if (EstufaQ_up_(sessao && sessao.perfil) !== 'ADMIN') throw new Error('Somente o Administrador do sistema escolhe o modelo dos documentos.');
  var modelo = EstufaQ_up_(payload.modelo) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO';
  PropertiesService.getScriptProperties().setProperty(ESTUFAQ_CFG.PROP_MODELO, modelo);
  return { ok: true, modelo: modelo };
}

function EstufaQ_apiGerarRascunho(payload, sessao) {
  var ctx = EstufaQ_montarContexto_(payload);
  var base = { ok: true, contexto: EstufaQ_ctxTela_(ctx), assinaturaContexto: EstufaQ_assinatura_(ctx), podeAprovar: EstufaQ_ehAprovador_(sessao), travas: ctx.travas, bloqueado: ctx.emissaoBloqueada };
  if (ctx.emissaoBloqueada) return Object.assign(base, { textos: { analisePorEstudo: {}, conclusaoGeral: '', conclusaoLeigo: '' }, avisoIA: 'O documento não pode ser emitido enquanto os problemas listados abaixo não forem corrigidos. Nada foi redigido.' });
  var textos = EstufaQ_textosPadrao_(ctx), origem = 'PADRAO', aviso = '';
  if (payload.redigirComIA !== false) {
    try {
      var t = EstufaQ_redigirIA_(ctx);
      var conf = EstufaQ_conferirTextos_(ctx, t, true);
      if (conf.ok) { textos = t; origem = 'IA'; }
      else aviso = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados; revise e complete se quiser.';
    } catch (e) {
      aviso = 'A redação automática não está disponível (' + EstufaQ_msg_(e) + '). Foi usado o texto padrão, montado só com os resultados; revise e complete se quiser.';
    }
  }
  return Object.assign(base, { textos: textos, origemTexto: origem, avisoIA: aviso });
}

function EstufaQ_apiPrevia(payload) {
  var interno = {};
  var ctx = EstufaQ_montarContexto_(payload, interno);
  var t = payload.textosCertificado && payload.textosCertificado.conclusaoGeral ? payload.textosCertificado : EstufaQ_textosPadrao_(ctx);
  return { ok: true, html: SGO_DocA4_prepararSumario_(EstufaRelEnsaio_html_(ctx, interno, t, EstufaQ_fotosValidas_(payload.fotosCertificado), null, true)).html, travas: ctx.travas };
}

function EstufaQ_apiEmitir(payload, sessao) {
  var simulado = EstufaQ_up_(payload.modoEntrada) === 'SIMULADO_ADMIN';
  if (!simulado && !EstufaQ_ehAprovador_(sessao)) throw new Error('A emissão precisa da aprovação do responsável técnico. Use "Enviar para aprovação": o responsável técnico confere a prévia e emite. Perfis que aprovam: ' + ESTUFAQ_CFG.PERFIS_APROVADORES.join(', ') + '.');
  if (!simulado && payload.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de emitir.');
  return EstufaQ_emitirEnsaio_(payload, EstufaQ_validar_(payload), sessao, '');
}

function EstufaQ_guardarFotos_(fotos, numero) {
  return EstufaQ_fotosValidas_(fotos).map(function (f, i) {
    var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.mimeType || 'image/jpeg', 'Foto ' + (i + 1) + ' - ' + (numero || 'sem número') + '.jpg');
    var arq = EstufaBanhoRel_ebObterPastaPersistente_('UPLOAD_FOLDER_ID', 'Estufa+Banho-maria - Uploads').createFile(blob);
    return { fileId: arq.getId(), mimeType: f.mimeType || 'image/jpeg', legenda: f.legenda || '' };
  });
}

/** Envio para aprovação. documento: 'ENSAIO' (relatório) ou 'DADOS' (planilha de dados). */
function EstufaQ_apiEnviarParaAprovacao(payload, sessao) {
  if (EstufaQ_up_(payload.modoEntrada) === 'SIMULADO_ADMIN') throw new Error('O relatório interno (dados reconstituídos) não passa por aprovação: ele não é entregue ao cliente.');
  var dados = EstufaQ_up_(payload.documento) === 'DADOS';
  var ctx;
  if (dados) { ctx = EstufaQ_montarContexto_(payload); if (!payload.assinaturaContexto || payload.assinaturaContexto !== EstufaQ_assinatura_(ctx)) throw new Error('Os dados mudaram desde a prévia. Clique em "Gerar planilha de dados" de novo e envie.'); EstufaQ_exigirSemTravas_(ctx); }
  else ctx = EstufaQ_validar_(payload).ctx;
  if (!ctx.identificacao.certificadoNumero) { ctx.identificacao.certificadoNumero = EstufaQ_proximoNumero_(); payload = Object.assign({}, payload, { certNumero: ctx.identificacao.certificadoNumero }); }
  var guardado = Object.assign({}, payload, { fotosCertificado: [], fotosArquivos: dados ? [] : EstufaQ_guardarFotos_(payload.fotosCertificado, ctx.identificacao.certificadoNumero) });
  var modulo = dados ? ESTUFAQ_CFG.MODULO_DADOS : ESTUFAQ_CFG.MODULO_ENSAIO;
  var id = SGO_QE_registrar_(Object.assign(EstufaQ_camposRegistro_(ctx, payload, sessao, modulo), { STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado) }));
  return { ok: true, id: id, numero: ctx.identificacao.certificadoNumero, mensagem: (dados ? 'Planilha de dados ' : 'Relatório de ensaio ') + ctx.identificacao.certificadoNumero + ' enviado para aprovação do responsável técnico (registro ' + id + '). Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function EstufaQ_exigirAprovador_(sessao) {
  if (!EstufaQ_ehAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + ESTUFAQ_CFG.PERFIS_APROVADORES.join(', ') + ') confere e aprova documentos.');
}

function EstufaQ_apiListarAprovacoes(payload, sessao) {
  var aprovador = EstufaQ_ehAprovador_(sessao), nome = SGO_QE_nomeSessao_(sessao);
  var lista = SGO_QE_listar_(ESTUFAQ_CFG.MODULO_ENSAIO).concat(SGO_QE_listar_(ESTUFAQ_CFG.MODULO_DADOS)).filter(function (r) {
    return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome);
  }).filter(function (r) { return aprovador || r.ENVIADO_POR === nome; });
  return { ok: true, podeAprovar: aprovador, itens: lista.map(function (r) {
    return { id: r.ID, documento: r.MODULO === ESTUFAQ_CFG.MODULO_DADOS ? 'Planilha de dados' : 'Relatório de ensaio', status: r.STATUS, numero: r.NUMERO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO };
  }) };
}

function EstufaQ_carregarPendente_(id) {
  var reg = SGO_QE_obter_(id);
  if (!reg || (reg.MODULO !== ESTUFAQ_CFG.MODULO_ENSAIO && reg.MODULO !== ESTUFAQ_CFG.MODULO_DADOS)) throw new Error('Registro de aprovação não encontrado. Atualize a lista.');
  if (reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação (situação: ' + reg.STATUS + '). Atualize a lista.');
  var payload = JSON.parse(reg.PAYLOAD_JSON || '{}');
  payload.fotosCertificado = (payload.fotosArquivos || []).map(function (f) {
    try { return { base64: Utilities.base64Encode(DriveApp.getFileById(f.fileId).getBlob().getBytes()), mimeType: f.mimeType, legenda: f.legenda }; } catch (e) { return null; }
  }).filter(Boolean);
  return { reg: reg, payload: payload };
}

function EstufaQ_conferirPendente_(p) {
  if (p.reg.MODULO === ESTUFAQ_CFG.MODULO_DADOS) {
    var interno = {};
    var ctx = EstufaQ_montarContexto_(p.payload, interno);
    if (EstufaQ_assinatura_(ctx) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar de novo.');
    EstufaQ_exigirSemTravas_(ctx);
    return { ctx: ctx, interno: interno };
  }
  var v = EstufaQ_validar_(p.payload);
  if (EstufaQ_assinatura_(v.ctx) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar o rascunho de novo.');
  return v;
}

function EstufaQ_apiPreverAprovacao(payload, sessao) {
  EstufaQ_exigirAprovador_(sessao);
  var p = EstufaQ_carregarPendente_(payload && payload.id);
  var v = EstufaQ_conferirPendente_(p);
  v.ctx.identificacao.certificadoNumero = p.reg.NUMERO;
  var html = p.reg.MODULO === ESTUFAQ_CFG.MODULO_DADOS
    ? EstufaPlanDados_html_(v.ctx, v.interno, null, true)
    : EstufaRelEnsaio_html_(v.ctx, v.interno, v.textos, p.payload.fotosCertificado, null, true);
  return { ok: true, html: SGO_DocA4_prepararSumario_(html).html };
}

function EstufaQ_apiAprovarEmitir(payload, sessao) {
  EstufaQ_exigirAprovador_(sessao);
  if (!payload || payload.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de aprovar.');
  var p = EstufaQ_carregarPendente_(payload.id);
  var v = EstufaQ_conferirPendente_(p);
  if (p.reg.MODULO === ESTUFAQ_CFG.MODULO_DADOS) return EstufaPlanDados_emitir_(p.payload, v, sessao, p.reg.ID);
  return EstufaQ_emitirEnsaio_(p.payload, v, sessao, p.reg.ID);
}

function EstufaQ_apiDevolver(payload, sessao) {
  EstufaQ_exigirAprovador_(sessao);
  var motivo = EstufaQ_s_(payload && payload.motivo);
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  var reg = SGO_QE_obter_(payload.id);
  if (!reg || reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação. Atualize a lista.');
  SGO_QE_atualizar_(reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Rotas do modelo novo, acrescentadas ao EstufaBanhoRel_apiDispatch (referências resolvidas na chamada). */
function EstufaQ_rotas_() {
  return {
    apiQSituacao: EstufaQ_apiSituacao, apiQDefinirModelo: EstufaQ_apiDefinirModelo,
    apiQGerarRascunho: EstufaQ_apiGerarRascunho, apiQPrevia: EstufaQ_apiPrevia, apiQEmitir: EstufaQ_apiEmitir,
    apiQEnviarParaAprovacao: EstufaQ_apiEnviarParaAprovacao, apiQListarAprovacoes: EstufaQ_apiListarAprovacoes,
    apiQPreverAprovacao: EstufaQ_apiPreverAprovacao, apiQAprovarEmitir: EstufaQ_apiAprovarEmitir, apiQDevolver: EstufaQ_apiDevolver,
    apiGerarPlanilhaDados: EstufaPlanDados_apiGerar
  };
}
/** Rotas que geram documento do ensaio: exigem o vínculo com o cadastro. */
var ESTUFAQ_ROTAS_COM_VINCULO = ['apiQGerarRascunho', 'apiQPrevia', 'apiQEmitir', 'apiQEnviarParaAprovacao', 'apiGerarPlanilhaDados'];
