/****************************************************
 * ESTUFA, BANHO-MARIA E SECADORA — PLANILHA DE DADOS (A4 PAISAGEM), MODELO NOVO (21/10/2026)
 *
 * Documento em HTML para imprimir e PDF na pasta do equipamento: capa com a ficha do ensaio e o
 * resultado, sumário, quadro-resumo dos critérios (uma vez só), condições e escopo, resultados por
 * estudo e por sensor, gráficos em SVG, memória de cálculo passo a passo (estatística, uniformidade,
 * estabilidade, desvio da temperatura programada, incerteza e letalidade), não conformidades,
 * aprovação e assinaturas, e as leituras folha a folha em blocos de 12 sensores.
 * Emissão pelo fluxo de QUALIF_EMISSOES (módulo ESTUFA_DADOS, revisões próprias): o responsável
 * técnico emite com confirmação; o técnico recebe a minuta e envia para aprovação.
 * Modelo anterior (Google Planilhas, SGO_EstufaBanhoRel_Planilha.js): preservado e desligado.
 ****************************************************/

var ESTUFAPD_SENSORES_POR_BLOCO = 12;

function EstufaPlanDados_tabelaLeituras_(linhas, ctx, titulo, umidade) {
  var ativos = ctx.sensores.ativos.map(function (n) { return Number(n.slice(1)) - 1; });
  var out = [];
  for (var b = 0; b < ativos.length; b += ESTUFAPD_SENSORES_POR_BLOCO) {
    var bloco = ativos.slice(b, b + ESTUFAPD_SENSORES_POR_BLOCO);
    var cols = [{ t: 'Data e hora' }].concat(bloco.map(function (s) { return { t: 'S' + (s + 1), cls: 'num' }; })).concat(umidade && b === 0 ? [{ t: 'UR (%)', cls: 'num' }] : []);
    var linhasTab = linhas.map(function (r) {
      return [r.tempoStr].concat(bloco.map(function (s) {
        var t = EstufaQ_valor_(r.temperaturas[s]);
        if (t === null) return { t: '—', cls: 'num' };
        var fora = t < ctx.faixa.tMin || t > ctx.faixa.tMax;
        return fora ? { html: '<span class="nok-txt">' + SGO_DocA4_num_(t, 2) + '</span>', cls: 'num' } : { t: SGO_DocA4_num_(t, 2), cls: 'num' };
      })).concat(umidade && b === 0 ? [{ t: SGO_DocA4_num_(EstufaQ_valor_(r.umidade), 1), cls: 'num' }] : []);
    });
    out.push('<h3>' + SGO_DocA4_esc_(titulo) + (ativos.length > ESTUFAPD_SENSORES_POR_BLOCO ? ' — sensores ' + (b + 1) + ' a ' + Math.min(ativos.length, b + ESTUFAPD_SENSORES_POR_BLOCO) : '') + '</h3>' +
      SGO_DocA4_tabela_(cols, linhasTab, { classe: 'compacta leituras' }));
  }
  return out.join('');
}

/** Memória de cálculo da uniformidade: o instante da maior diferença, com os valores. */
function EstufaPlanDados_memoriaUniformidade_(linhas, ctx, instante) {
  var r = (linhas || []).filter(function (x) { return x.tempoStr === instante; })[0];
  if (!r) return '';
  var ativos = ctx.sensores.ativos.map(function (n) { return Number(n.slice(1)) - 1; });
  var vals = ativos.map(function (s) { return { s: 'S' + (s + 1), t: EstufaQ_valor_(r.temperaturas[s]) }; }).filter(function (v) { return v.t !== null; });
  if (vals.length < 2) return '';
  var mx = vals.reduce(function (a, b) { return b.t > a.t ? b : a; }), mn = vals.reduce(function (a, b) { return b.t < a.t ? b : a; });
  return '<p>Em ' + SGO_DocA4_esc_(instante) + ': maior leitura ' + mx.s + ' = ' + SGO_DocA4_val_(mx.t, 2, '°C') + ', menor leitura ' + mn.s + ' = ' + SGO_DocA4_val_(mn.t, 2, '°C') + '; ΔT = ' + SGO_DocA4_num_(mx.t, 2) + ' − ' + SGO_DocA4_num_(mn.t, 2) + ' = <b>' + SGO_DocA4_val_(EstufaQ_r_(mx.t - mn.t, 2), 2, '°C') + '</b>.</p>';
}

function EstufaPlanDados_memoriaLetalidade_(serie, rep) {
  if (!serie || !rep || !rep.letalidade || !rep.letalidade.pior) return '';
  var pior = (serie.letalidade || []).filter(function (x) { return x.sensor === rep.letalidade.pior.sensor; })[0];
  if (!pior) return '';
  var linhas = serie.linhas || [];
  var s = Number(pior.sensor.slice(1)) - 1;
  var tb = rep.letalidade.tBase, z = rep.letalidade.z, acum = 0, l = [];
  for (var i = 0; i < linhas.length; i++) {
    var t = EstufaQ_valor_(linhas[i].temperaturas[s]);
    var f = t === null ? null : Math.pow(10, (t - tb) / z);
    var dt = 0, c = 0;
    if (i > 0) {
      var ta = EstufaQ_valor_(linhas[i - 1].temperaturas[s]);
      dt = (EstufaQ_ms_(linhas[i]) - EstufaQ_ms_(linhas[i - 1])) / 60000;
      if (ta !== null && t !== null) { c = (Math.pow(10, (ta - tb) / z) + f) / 2 * dt; acum += c; }
    }
    l.push([linhas[i].tempoStr, SGO_DocA4_num_(t, 2), f === null ? '—' : SGO_DocA4_num_(f, 4), SGO_DocA4_num_(dt, 3), SGO_DocA4_num_(c, 4), SGO_DocA4_num_(acum, 4)]);
  }
  var corte = l.length > 40 ? l.slice(0, 20).concat([[{ t: '… ' + (l.length - 30) + ' linhas intermediárias com o mesmo cálculo …', colspan: 6 }]]).concat(l.slice(-10)) : l;
  return '<p>Repetição ' + rep.numero + ', sensor de menor letalidade (' + pior.sensor + '), com T<sub>ref</sub> = ' + SGO_DocA4_val_(tb, 1, '°C') + ' e z = ' + SGO_DocA4_val_(z, 1, '°C') + ':</p>' +
    SGO_DocA4_tabela_([{ t: 'Data e hora' }, { t: 'T (°C)', cls: 'num' }, { t: '10^((T − Tref)/z)', cls: 'num' }, { t: 'Δt (min)', cls: 'num' }, { t: 'Parcela (min)', cls: 'num' }, { t: 'Acumulado (min)', cls: 'num' }], corte, { classe: 'compacta' }) +
    '<p>Total = <b>' + SGO_DocA4_val_(pior.valor, 2, 'min') + '</b> (mínimo exigido ' + SGO_DocA4_val_(rep.letalidade.minimo, 2, 'min') + ').</p>';
}

function EstufaPlanDados_html_(ctx, interno, aprovacao, minuta) {
  var id = ctx.identificacao, st = ctx.statusConsolidado;
  var h = [], nFig = 0;
  var series = (interno && interno.series) || [];
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Planilha de dados do ensaio térmico — ' + ctx.perfilLabel, orientacao: 'paisagem',
    subtitulo: 'Leituras, resultados por sensor, gráficos e memória de cálculo do ensaio identificado.',
    tituloCurto: 'Planilha de dados do ensaio térmico', rotuloNumero: 'Relatório nº', numero: id.certificadoNumero || '(atribuído na emissão)', revisao: id.revisao,
    empresa: id.empresaExecutante,
    capa: { tipo: 'Qualificação térmica — dados do ensaio', linhas: [['Cliente', id.cliente], ['Unidade e local', id.setor], ['Equipamento', id.tipoEquipamento + (id.tag ? ' — TAG ' + id.tag : '') + (id.numeroSerie ? ' — nº de série ' + id.numeroSerie : '') + (id.marca || id.modelo ? ' — ' + [id.marca, id.modelo].filter(Boolean).join(' ') : '')],
      ['Estudos', ctx.estudos.map(function (e) { return e.rotulo; }).join('; ')], ['Data do ensaio', id.dataDoEnsaio], ['Técnico executor', id.tecnicoExecutor],
      ['Registrador', (ctx.registradores.itens || []).map(function (r) { return r.tag + (r.certificado ? ' (certificado ' + r.certificado + (r.validade ? ', válido até ' + r.validade : '') + ')' : ''); }).join('; ') || id.dtl],
      ['Incerteza de cada leitura', ctx.incerteza ? SGO_DocA4_val_(ctx.incerteza.Umedicao, 2, '°C') + ' (k = 2)' : 'não declarada'], ['Resultado', SGO_DocA4_rotuloStatus_(st)]] },
    simulado: ctx.simulado || minuta,
    avisoSimulado: minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.' : 'RELATÓRIO INTERNO — dados reconstituídos pelo laboratório; não representa ensaio real e não pode ser entregue ao cliente.',
    resultado: { status: st, rotulo: 'Resultado do ensaio', texto: ctx.resumoResultado },
    sumario: true
  }));
  if (minuta) h.push('<style>@page{@top-center{content:"MINUTA";font:700 9pt Arial,sans-serif;color:#a61b1b}}</style>');

  h.push('<h2>1. Quadro-resumo dos critérios</h2>');
  h.push(ctx.criterios.length ? SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Valor medido' }, { t: 'Referência' }, { t: 'Situação' }], ctx.criterios.map(function (c) {
    return [c.estudo, c.criterio, c.requisito, c.obtido, c.referencia, c.naoAvaliado ? { html: '<span class="info-txt">Não avaliado</span>' } : SGO_DocA4_celSituacao_(c.conforme)];
  })) : '<p class="nota">Nenhum critério aplicável.</p>');

  h.push('<h2>2. Condições do ensaio, escopo e normas</h2>');
  h.push(SGO_DocA4_tabelaIdent_([['Perfil', ctx.perfilLabel], ['Faixa de aceitação', SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C')], ['Temperatura programada', ctx.parametros.setpoint !== null ? SGO_DocA4_val_(ctx.parametros.setpoint, 1, '°C') : 'não informada'],
    ['Sensores instalados / ativos', ctx.sensores.instalados + ' / ' + ctx.sensores.ativos.length], ['Mínimo de sensores', ctx.sensores.minimo + ' (' + ctx.sensores.fonteMinimo + ')'], ['Grandezas', ctx.grandezas.umidade ? 'Temperatura e umidade relativa' : 'Temperatura'],
    ['Regra de decisão', ctx.regraDecisao, { largo: true }]], '', { porLinha: 3 }));
  if (ctx.escopo.length) h.push(SGO_DocA4_lista_(ctx.escopo));
  if (ctx.normas.length) h.push(SGO_DocA4_lista_(ctx.normas));
  // 21/10/2026: parâmetros personalizados pelo responsável técnico (referência, valor usado, justificativa e responsável).
  if (typeof SGO_MP_secaoDocumento_ === 'function') h.push(SGO_MP_secaoDocumento_(ctx.parametrosPersonalizados, 'Parâmetros personalizados', aprovacao, minuta));

  h.push('<h2>3. Resultados por estudo</h2>');
  ctx.estudos.forEach(function (e, i) {
    h.push('<h3>3.' + (i + 1) + ' ' + SGO_DocA4_esc_(e.rotulo) + ' — ' + SGO_DocA4_rotuloStatus_(e.statusAprovacao) + '</h3>');
    var f = e.fatos;
    if (f.repeticoes) {
      f.repeticoes.forEach(function (r) {
        h.push('<h4>Repetição ' + r.numero + ' (' + SGO_DocA4_esc_(r.inicio) + ' a ' + SGO_DocA4_esc_(r.fim) + ', ' + EstufaQ_duracaoTxt_(r.duracaoMinutos) + ')</h4>');
        h.push(EstufaDoc_tabelaSensores_(r.porSensor.map(function (p) {
          var l = r.letalidade ? r.letalidade.porSensor.filter(function (x) { return x.sensor === p.sensor; })[0] : null;
          return Object.assign({}, p, { sensor: p.sensor + (l ? ' — ' + r.letalidade.rotulo + ' ' + SGO_DocA4_num_(l.valor, 2) + ' min' : '') });
        }), true));
      });
    } else {
      h.push(SGO_DocA4_tabelaIdent_(EstufaDoc_fatosEstudo_(e), '', { porLinha: 3 }));
      if (f.porSensor && f.porSensor.length) h.push(EstufaDoc_tabelaSensores_(f.porSensor, !f.evento));
    }
  });

  var figs = EstufaDoc_figuras_(ctx, interno, 980);
  if (figs.length) {
    h.push('<h2>4. Gráficos</h2>');
    figs.forEach(function (g) { if (g.erro) h.push('<p class="nota">' + SGO_DocA4_esc_(g.erro) + '</p>'); else { nFig++; h.push(SGO_DocA4_figura_(g.svg, nFig, g.legenda)); } });
  }

  h.push('<h2>' + (figs.length ? 5 : 4) + '. Memória de cálculo</h2>');
  h.push('<p>Média de um sensor: T̄ = Σ T<sub>i</sub> / n. Desvio-padrão amostral: s = √[Σ (T<sub>i</sub> − T̄)² / (n − 1)]. Estabilidade de um sensor: ± (T<sub>máx</sub> − T<sub>mín</sub>) / 2 no período avaliado. Uniformidade: ΔT = T<sub>máx</sub> − T<sub>mín</sub> entre os sensores ativos no mesmo instante; vale a maior diferença do período. Desvio da temperatura programada: média de todas as leituras − temperatura programada.</p>');
  ctx.estudos.forEach(function (e) {
    var s = series.filter(function (x) { return x.tipo === e.tipoEstudo && !x.repeticao; })[0];
    var f = e.fatos;
    if (s && f.uniformidade && f.uniformidade.instante && !f.evento) h.push('<h3 class="sem-sumario">' + SGO_DocA4_esc_(e.rotulo) + '</h3>' + EstufaPlanDados_memoriaUniformidade_(s.avaliadas || s.linhas, ctx, f.uniformidade.instante) +
      (f.piorEstabilidade ? '<p>Estabilidade do sensor menos estável (' + f.piorEstabilidade.sensor + '): ± (' + SGO_DocA4_num_(f.porSensor.filter(function (p) { return p.sensor === f.piorEstabilidade.sensor; })[0].max, 2) + ' − ' + SGO_DocA4_num_(f.porSensor.filter(function (p) { return p.sensor === f.piorEstabilidade.sensor; })[0].min, 2) + ') / 2 = <b>± ' + SGO_DocA4_val_(f.piorEstabilidade.valor, 2, '°C') + '</b>.</p>' : '') +
      (ctx.parametros.setpoint !== null && f.global ? '<p>Desvio da temperatura programada: ' + SGO_DocA4_num_(f.global.media, 2) + ' − ' + SGO_DocA4_num_(ctx.parametros.setpoint, 2) + ' = <b>' + SGO_DocA4_val_(EstufaQ_r_(f.global.media - ctx.parametros.setpoint, 2), 2, '°C') + '</b>.</p>' : ''));
    (f.repeticoes || []).forEach(function (r) {
      var sr = series.filter(function (x) { return x.tipo === e.tipoEstudo && x.repeticao === r.numero && x.letalidade; })[0];
      var sl = series.filter(function (x) { return x.tipo === e.tipoEstudo && x.repeticao === r.numero && x.linhas; })[0];
      if (sr && sl) h.push(EstufaPlanDados_memoriaLetalidade_({ letalidade: sr.letalidade, linhas: sl.linhas }, r));
    });
  });
  h.push('<h3 class="sem-sumario">Incerteza de medição</h3>' + EstufaDoc_tabelaIncerteza_(ctx.incerteza));

  var nSec = figs.length ? 6 : 5;
  h.push('<h2>' + nSec + '. Não conformidades e observações</h2>');
  h.push(ctx.naoConformidades.length ? SGO_DocA4_lista_(ctx.naoConformidades) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>');
  if (ctx.observacoes.length) h.push(SGO_DocA4_lista_(ctx.observacoes));

  h.push('<div class="manter"><h2>' + (nSec + 1) + '. Aprovação e assinaturas</h2>');
  if (aprovacao) h.push('<p><b>Revisada e aprovada para emissão por</b> ' + SGO_DocA4_esc_(aprovacao.nome || '—') + ', em ' + SGO_DocA4_esc_(aprovacao.em) + ', com registro no sistema. Revisão ' + SGO_DocA4_esc_(SGO_DocA4_revisao_(id.revisao)) + '.</p>');
  else if (minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico.</b></p>');
  h.push(SGO_DocA4_assinaturas_(EstufaRelEnsaio_assinaturas_(ctx, aprovacao)) + '</div>');

  h.push('<h2 class="quebra">Anexo A — Leituras do registrador</h2><p class="nota">Leituras do período avaliado de cada estudo, como registradas (°C). Valores fora da faixa de aceitação em vermelho.</p>');
  ctx.estudos.forEach(function (e) {
    series.filter(function (x) { return x.tipo === e.tipoEstudo && x.linhas; }).forEach(function (s) {
      h.push(EstufaPlanDados_tabelaLeituras_(s.avaliadas || s.linhas, ctx, e.rotulo + (s.repeticao ? ' — repetição ' + s.repeticao : ''), ctx.grandezas.umidade));
    });
  });
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}

/** Emite a planilha de dados (aprovação registrada): HTML + PDF na pasta do equipamento. */
function EstufaPlanDados_emitir_(payload, v, sessao, idPendente) {
  var ctx = v.ctx;
  // 21/10/2026: com parâmetro personalizado, a emissão final exige o responsável técnico com o modo personalizado aberto.
  if (!ctx.simulado && typeof SGO_MP_exigirAprovacao_ === 'function') SGO_MP_exigirAprovacao_(ctx.parametrosPersonalizados, sessao);
  var numero = ctx.identificacao.certificadoNumero || EstufaQ_proximoNumero_();
  ctx.identificacao.certificadoNumero = numero;
  var revisao = ctx.simulado ? 0 : SGO_QE_proximaRevisao_(ESTUFAQ_CFG.MODULO_DADOS, numero, 0);
  ctx.identificacao.revisao = String(revisao);
  var aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: EstufaQ_s_(sessao && sessao.usuario), perfil: EstufaQ_s_(sessao && sessao.perfil), em: SGO_QE_agora_() };
  var html = EstufaPlanDados_html_(ctx, v.interno, aprovacao, false);
  var r = SGO_DocSalvar_finalizarCertificado_(html, Object.assign({}, payload, { certNumero: numero, tag: ctx.identificacao.tag, tipoEquipamento: ctx.identificacao.tipoEquipamento }), EstufaQ_pastaLaudos_, 'Planilha de dados Estufa' + (revisao ? ' rev ' + revisao : ''), EstufaQ_tz_());
  if (!ctx.simulado) {
    var campos = { STATUS: 'EMITIDO', NUMERO: numero, REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: ctx.statusConsolidado };
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(EstufaQ_camposRegistro_(ctx, payload, sessao, ESTUFAQ_CFG.MODULO_DADOS), campos, { PAYLOAD_JSON: JSON.stringify(payload) }));
    SGO_QE_marcarSubstituidas_(ESTUFAQ_CFG.MODULO_DADOS, numero, id);
    r.emissaoId = id;
    if (typeof SGO_MP_registrarAprovacao_ === 'function') SGO_MP_registrarAprovacao_(ctx.parametrosPersonalizados, sessao, 'Planilha de dados ' + numero + ' rev ' + revisao + ' (' + id + ')');
  }
  r.numero = numero; r.revisao = revisao; r.resultado = ctx.statusConsolidado; r.aprovadoPor = aprovacao.nome;
  return r;
}

/**
 * Botão "Gerar planilha de dados". Com travas: devolve a lista do que corrigir. Responsável técnico com a
 * confirmação marcada: emite. Demais casos: devolve a minuta (prévia) e a assinatura para "Enviar para aprovação".
 */
function EstufaPlanDados_apiGerar(payload, sessao) {
  var interno = {};
  var ctx = EstufaQ_montarContexto_(payload, interno);
  var podeAprovar = EstufaQ_ehAprovador_(sessao);
  var base = { ok: true, assinaturaContexto: EstufaQ_assinatura_(ctx), travas: ctx.travas, bloqueado: ctx.emissaoBloqueada, podeAprovar: podeAprovar, statusAprovacao: ctx.statusConsolidado, resumoResultado: ctx.resumoResultado,
    criterios: ctx.criterios, estudos: ctx.estudos.map(function (e) { return { tipoEstudo: e.tipoEstudo, rotulo: e.rotulo, statusAprovacao: e.statusAprovacao }; }) };
  if (ctx.emissaoBloqueada) return base;
  if (ctx.simulado || (podeAprovar && payload.confirmacaoRevisao === true)) {
    return Object.assign(base, { emitido: true }, EstufaPlanDados_emitir_(payload, { ctx: ctx, interno: interno }, sessao, ''));
  }
  return Object.assign(base, { emitido: false, html: SGO_DocA4_prepararSumario_(EstufaPlanDados_html_(ctx, interno, null, true)).html });
}
