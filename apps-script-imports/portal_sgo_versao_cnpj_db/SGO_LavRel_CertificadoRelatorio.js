/****************************************************
 * METROLABS — LAVADORA — RELATÓRIO DE ENSAIO (INTERPRETAÇÃO TÉCNICA)
 *
 * Documento HTML A4 de UM ciclo (termodesinfectora ou lavadora
 * ultrassônica), no padrão comum SGO_DocA4 (cabeçalho e rodapé em todas as
 * páginas, numeração, gráficos em SVG), salvo em HTML + PDF na pasta do
 * cliente. Os números vêm de LavRel_lvExecutarAnaliseCompleta_ (Main.js):
 * este arquivo nunca recalcula nada.
 *
 * 17/10/2026 (decisões do dono):
 *  (a) não existe "aprovado com alerta": A0 abaixo do mínimo = reprovado;
 *  (b) critério de A0 segue a classificação do artigo escolhida na tela:
 *      semicrítico/não crítico ≥ 600 s; crítico ≥ 3.000 s.
 * Inclui identificação completa, registradores (certificado e validade),
 * critérios com resultado obtido, tabela por sensor, gráficos, memória de
 * cálculo do A0 (anexo), não conformidades, conclusão e assinaturas.
 ****************************************************/

/** Normas aplicáveis (nunca inventadas). */
function LavRel_lvListarNormasAplicaveis_(tipoCiclo) {
  if (tipoCiclo === 'ULTRASSOM') {
    return [
      'ABNT NBR 17130-1:2024 — Lavadoras ultrassônicas de uso hospitalar — Parte 1: Requisitos gerais e construtivos',
      'Protocolo de verificação de eficiência de cavitação do fabricante do equipamento',
      'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
    ];
  }
  return [
    'ABNT NBR ISO 15883-1 — Lavadoras desinfetadoras — Parte 1: Requisitos gerais, termos, definições e ensaios (conceito de A0, Anexo B)',
    'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
  ];
}

function LavRel_lvLabelCiclo_(motor, cicloCfg) {
  if (motor === 'ULTRASSOM') return 'Lavadora Ultrassônica (Cavitação)';
  return 'Termodesinfectora (Cálculo de A0)';
}

function LavRel_lvTextoClasseArtigo_(classe) {
  return classe === 'CRITICO' ? 'Crítico' : 'Semicrítico ou não crítico';
}

/** Conformidade por sensor (A0 + temperaturas na fase principal) — só termodesinfecção. */
function LavRel_lvMontarConformidadePorSensor_(analise, sensoresAtivos, limiteAprovacaoFinal) {
  const lista = [];
  const a0PorSensor = analise.a0PorSensor || [];
  const statsSensores = (analise.stats && analise.stats.sensores) || [];

  for (let s = 0; s < a0PorSensor.length; s++) {
    if (!sensoresAtivos[s]) continue;
    const a0 = a0PorSensor[s];
    if (a0 === null || a0 === undefined) continue;
    const st = statsSensores[s] || {};
    lista.push({
      sensor: 'S' + (s + 1),
      a0: a0,
      statusSensor: a0 >= limiteAprovacaoFinal ? 'CONFORME' : 'NAO_CONFORME',
      minTemp: st.minExposicao !== null && st.minExposicao !== undefined ? st.minExposicao : null,
      maxTemp: st.maxExposicao !== null && st.maxExposicao !== undefined ? st.maxExposicao : null,
      mediaTemp: st.mediaExposicao !== null && st.mediaExposicao !== undefined ? st.mediaExposicao : null
    });
  }

  return lista;
}

/** Status único do documento: APROVADO, REPROVADO ou INFORMATIVO. */
function LavRel_lvNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

/**
 * Pacote de fatos único (IA + partes fixas do documento).
 * interno (opcional): recebe { resultado } para os gráficos e o anexo de
 * cálculo — fica fora do contexto que vai para a tela e é assinado.
 */
function LavRel_lvMontarContextoCertificado_(payload, interno) {
  const resultado = LavRel_lvExecutarAnaliseCompleta_(payload);
  if (interno) interno.resultado = resultado;
  payload = resultado.payload;
  const a = resultado.analise;
  const motor = resultado.motor;
  const cicloCfg = resultado.cicloCfg || {};
  const limiteAprovacaoFinal = a.limitesAprovacao && typeof a.limitesAprovacao.limiteAprovacaoFinal === 'number'
    ? a.limitesAprovacao.limiteAprovacaoFinal
    : LavRel_parseFloatSeguro_(cicloCfg.parametroNormativo, 0);
  const parametroNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.parametroNormativo === 'number'
    ? a.limitesAprovacao.parametroNormativo
    : LavRel_parseFloatSeguro_(cicloCfg.parametroNormativo, 0);
  const classeArtigo = (a.configuracaoCiclo && a.configuracaoCiclo.classeArtigo) || (motor === 'TERMO' ? 'SEMICRITICO' : '');

  const equipamentoLabel = LavRel_lvLabelCiclo_(motor, cicloCfg);
  const statusConsolidado = LavRel_lvNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));

  const fatos = {
    tempoInicioExposicao: a.tempoInicioExposicao || '',
    tempoFimExposicao: a.tempoFimExposicao || '',
    tempoExposicaoMinutos: a.tempoExposicaoMinutos,
    tempoTotalMinutos: a.tempoTotalMinutos,
    quantidadeSensoresInstalados: a.quantidadeSensoresInstalados,
    quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    parametroNormativo: parametroNormativo,
    limiteAprovacaoFinal: limiteAprovacaoFinal,
    classeArtigo: classeArtigo,
    temperaturaProgramada: (a.configuracaoCiclo || {}).tMin,
    tBase: (a.configuracaoCiclo || {}).tBase,
    z: (a.configuracaoCiclo || {}).z,
    tLimiteA0: cicloCfg.tLimiteA0,
    intervaloLeiturasSegundos: isFinite(a.deltaMinutosEstimado) ? Math.round(a.deltaMinutosEstimado * 60 * 10) / 10 : null
  };

  const criterios = [];
  const faseOk = !!(a.tempoInicioExposicao && a.tempoFimExposicao) && a.tempoExposicaoMinutos > 0;
  criterios.push({
    criterio: 'Identificação da fase principal',
    requisito: 'Patamar de temperatura reconhecido nos dados de todos os sensores ativos',
    referencia: motor === 'ULTRASSOM' ? 'ABNT NBR 17130-1:2024' : 'ABNT NBR ISO 15883-1',
    obtido: faseOk ? (LavRel_lvSoHora_(a.tempoInicioExposicao) + ' a ' + LavRel_lvSoHora_(a.tempoFimExposicao) + ' (' + SGO_DocA4_val_(a.tempoExposicaoMinutos, 2, 'min') + ')') : 'Não identificada',
    conforme: faseOk
  });
  let resumo;
  if (motor === 'ULTRASSOM') {
    fatos.tempoCavitacao = a.tempoCavitacao;
    const ok = isFinite(a.tempoCavitacao) && a.tempoCavitacao >= limiteAprovacaoFinal;
    criterios.push({
      criterio: 'Tempo efetivo de cavitação',
      requisito: '≥ ' + SGO_DocA4_val_(limiteAprovacaoFinal, 2, 'min'),
      referencia: 'Protocolo do fabricante do equipamento',
      obtido: SGO_DocA4_val_(a.tempoCavitacao, 2, 'min'),
      conforme: ok
    });
    resumo = 'Tempo efetivo de cavitação de ' + SGO_DocA4_val_(a.tempoCavitacao, 2, 'min') + ', ' + (ok ? 'igual ou acima' : 'abaixo') + ' do mínimo de ' + SGO_DocA4_val_(limiteAprovacaoFinal, 2, 'min') + '.';
  } else {
    fatos.minA0 = a.minA0;
    fatos.mediaA0 = a.mediaA0;
    fatos.maxA0 = a.maxA0;
    fatos.piorSensorA0 = a.piorSensorA0 || null;
    fatos.conformidadePorSensor = LavRel_lvMontarConformidadePorSensor_(a, resultado.sensoresAtivos, limiteAprovacaoFinal);
    const pior = a.piorSensorA0 ? a.piorSensorA0.sensor : '';
    const ok = fatos.conformidadePorSensor.length > 0 && a.minA0 >= limiteAprovacaoFinal;
    criterios.push({
      criterio: 'Letalidade térmica (A0) no pior sensor',
      requisito: 'A0 ≥ ' + SGO_DocA4_val_(limiteAprovacaoFinal, 0, 's') + ' em todos os sensores ativos (artigo ' + LavRel_lvTextoClasseArtigo_(classeArtigo).toLowerCase() + ')',
      referencia: 'ABNT NBR ISO 15883-1, Anexo B (Tref = ' + SGO_DocA4_val_(fatos.tBase, 0, '°C') + ', z = ' + SGO_DocA4_val_(fatos.z, 0, '°C') + ')',
      obtido: fatos.conformidadePorSensor.length ? SGO_DocA4_val_(a.minA0, 2, 's') + (pior ? ' (' + pior + ')' : '') : 'Não calculado',
      conforme: ok
    });
    resumo = fatos.conformidadePorSensor.length
      ? 'A0 mínimo de ' + SGO_DocA4_val_(a.minA0, 2, 's') + (pior ? ' no sensor ' + pior : '') + ', ' + (ok ? 'igual ou acima' : 'abaixo') + ' do mínimo de ' + SGO_DocA4_val_(limiteAprovacaoFinal, 0, 's') + ' exigido para artigo ' + LavRel_lvTextoClasseArtigo_(classeArtigo).toLowerCase() + '.'
      : 'Não foi possível calcular o A0 dos sensores ativos.';
  }
  if (!faseOk && statusConsolidado === 'REPROVADO') resumo = 'Fase principal não identificada nos dados. ' + resumo;

  const estudo = {
    tipoEstudo: motor,
    label: equipamentoLabel,
    tituloSecao: (motor === 'ULTRASSOM' ? 'Ciclo de lavagem ultrassônica' : 'Ciclo de desinfecção térmica'),
    statusAprovacao: statusConsolidado,
    fatos: fatos,
    motivosReprovacao: a.motivosReprovacao || [],
    alertasAnalise: a.alertasAnalise || [],
    observacoesAnalise: a.observacoesAnalise || []
  };

  const dataDoEnsaio = LavRel_lvExtrairDataDoTexto_(fatos.tempoInicioExposicao || a.tempoInicioCiclo || '');
  const dtl = String(payload.certDataLogger || '').trim();
  const desloc = LavRel_parseFloatSeguro_(payload.offsetTemp, 0);
  const parametros = [
    ['Temperatura programada (receita)', isFinite(fatos.temperaturaProgramada) ? SGO_DocA4_val_(fatos.temperaturaProgramada, 1, '°C') : '—'],
    motor === 'TERMO' ? ['Classificação do artigo', LavRel_lvTextoClasseArtigo_(classeArtigo)] : ['Critério', 'Tempo de cavitação'],
    ['Intervalo entre leituras', fatos.intervaloLeiturasSegundos ? SGO_DocA4_val_(fatos.intervaloLeiturasSegundos, 0, 's') : '—'],
    ['Sensores utilizados', (a.quantidadeSensoresUtilizados || 0) + ' de ' + (a.quantidadeSensoresInstalados || 0) + ' instalados'],
    ['Correção de temperatura aplicada', desloc ? SGO_DocA4_val_(desloc, 2, '°C') : 'Nenhuma']
  ];

  return {
    tipoCiclo: motor,
    simulado: !!payload.modoRelatorioSimulado,
    normas: LavRel_lvListarNormasAplicaveis_(motor),
    statusConsolidado: statusConsolidado,
    resumoResultado: resumo,
    criterios: criterios,
    parametros: parametros,
    registradores: SGO_DocA4_registradores_(dtl, dataDoEnsaio),
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.local || payload.setor || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      cnpj: String(payload.cnpj || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.local || payload.setor || '').trim(),
      equipamento: equipamentoLabel,
      tag: String(payload.tag || '').trim(),
      dtl: dtl,
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim() || '0',
      dataDoEnsaio: dataDoEnsaio,
      tecnicoExecutor: String(payload.respTecnico || payload.operador || '').trim(),
      marca: String(payload.marca || '').trim(),
      modelo: String(payload.modelo || '').trim(),
      numeroSerie: String(payload.numSerie || '').trim(),
      programa: String(payload.programa || '').trim(),
      tipoEnsaio: String(payload.ensaio || '').trim(),
      cicloNumero: String(payload.cicloNum || '').trim(),
      lote: String(payload.lote || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: LavRel_UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

function LavRel_lvSoHora_(tempoStr) {
  const s = String(tempoStr || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}(:\d{2})?)\s*$/);
  return m ? m[1] : (s || '—');
}

function LavRel_lvTextoTipoEnsaio_(v) {
  const mapa = {
    'QD (Carga)': 'Qualificação de desempenho (com carga)',
    'QO (Vazio)': 'Qualificação operacional (câmara vazia)',
    'Validação Limpeza': 'Validação de limpeza',
    'Teste Cavitacao': 'Teste de cavitação',
    'Monitoramento de Rotina': 'Monitoramento de rotina'
  };
  const s = String(v || '').trim();
  return mapa[s] || s || '—';
}

function LavRel_lvExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

function LavRel_lvLabelStatus_(status) {
  const s = LavRel_lvNormalizarStatus_(status);
  return s;
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO (roda a IA, devolve pra revisão na tela)
// ------------------------------------------------------------
function LavRel_apiGerarRascunhoCertificado(payload) {
  payload = payload || {};

  const contexto = LavRel_lvMontarContextoCertificado_(payload);
  const ia = SGO_DocSalvar_textosIaOuManual_(LavRel_lvIACriarTextosCertificado_, contexto);

  return {
    ok: true,
    textos: ia.textos,
    avisoIA: ia.avisoIA,
    contexto: contexto,
    assinaturaContexto: SGO_DocSalvar_assinatura_(contexto)
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: MONTAGEM FINAL (textos já revisados + fotos)
// ------------------------------------------------------------
function LavRel_apiMontarCertificadoFinal(payload) {
  payload = payload || {};

  const interno = {};
  const contexto = LavRel_lvMontarContextoCertificado_(payload, interno);
  SGO_DocSalvar_validarEmissao_(payload, contexto, ['conclusaoGeral', 'conclusaoLeigo']);

  const textos = payload.textosCertificado || {};
  const fotos = Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado.slice(0, 4) : [];

  const template = HtmlService.createTemplateFromFile('LavadoraCertificado');
  template.ctx = contexto;
  template.textos = {
    conclusaoGeral: String(textos.conclusaoGeral || '').trim(),
    conclusaoLeigo: String(textos.conclusaoLeigo || '').trim(),
    analisePorEstudo: textos.analisePorEstudo || {}
  };
  template.fotos = fotos.filter(function(f) { return f && f.base64; });
  template.geradoEm = Utilities.formatDate(new Date(), LavRel_UCFG.TZ, 'dd/MM/yyyy');
  template.graficos = LavRel_lvMontarGraficos_(contexto, interno.resultado || {});
  template.memoriaA0 = LavRel_lvMontarMemoriaA0_(contexto, interno.resultado || {});
  template.assinaturas = LavRel_lvListaAssinaturas_(contexto);

  const html = template.evaluate().getContent();
  return SGO_DocSalvar_finalizarCertificado_(html, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('LAVREL_LAUDOS_FOLDER_ID', 'Lavadora - Laudos', LavRel_UCFG.LAUDOS_FOLDER_ID);
  }, contexto.tipoCiclo === 'ULTRASSOM' ? 'Relatório de ensaio Lavadora ultrassônica' : 'Relatório de ensaio Termodesinfectora', LavRel_UCFG.TZ);
}

function LavRel_lvListaAssinaturas_(ctx) {
  const lista = [];
  const tecnico = (ctx.identificacao || {}).tecnicoExecutor;
  if (tecnico) lista.push({ nome: tecnico, cargo: 'Técnico executor do ensaio', registro: '' });
  (LavRel_UCFG.ASSINATURAS_PADRAO || []).forEach(function(a) { lista.push(a); });
  return lista;
}

/** Gráficos: temperatura por sensor com a fase principal e, na termodesinfecção, A0 por sensor. */
function LavRel_lvMontarGraficos_(ctx, resultado) {
  const figuras = [];
  try {
    const dados = resultado.dadosNormalizados || [];
    if (!dados.length) return figuras;
    const a = resultado.analise || {};
    const f = ctx.estudos[0].fatos || {};
    const ini = isFinite(a.indiceInicioCiclo) && a.indiceInicioCiclo >= 0 ? a.indiceInicioCiclo : 0;
    const fim = isFinite(a.indiceFimCiclo) && a.indiceFimCiclo >= ini ? a.indiceFimCiclo : dados.length - 1;
    const fatia = dados.slice(ini, fim + 1);
    const series = SGO_DocA4_seriesTemperatura_(fatia, {
      sensoresAtivos: resultado.sensoresAtivos, deslocamento: LavRel_parseFloatSeguro_((resultado.payload || {}).offsetTemp, 0),
      tz: LavRel_UCFG.TZ || 'America/Sao_Paulo', dtMin: a.deltaMinutosEstimado
    });
    const faixas = [];
    if (a.faseInicioExp >= 0 && a.faseFimExp >= a.faseInicioExp) {
      faixas.push({ x0: series.xDe(dados[a.faseInicioExp], a.faseInicioExp - ini), x1: series.xDe(dados[a.faseFimExp], a.faseFimExp - ini), rotulo: 'Fase principal' });
    }
    const refs = [];
    if (isFinite(f.temperaturaProgramada)) refs.push({ y: f.temperaturaProgramada, rotulo: 'Temperatura programada ' + SGO_DocA4_val_(f.temperaturaProgramada, 1, '°C'), cor: '#1f5fa8' });
    if (ctx.tipoCiclo === 'TERMO' && isFinite(f.tLimiteA0)) refs.push({ y: f.tLimiteA0, rotulo: 'Início da contagem do A0 (' + SGO_DocA4_val_(f.tLimiteA0, 0, '°C') + ')', cor: '#a61b1b' });
    const opt = { series: series.series, formatarX: series.formatarX, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', faixasX: faixas, referencias: refs };
    const svg = SGO_DocA4_graficoLinhas_(opt);
    if (svg) figuras.push({ svg: svg, legenda: 'Temperatura registrada por sensor ativo ao longo do ciclo' + (faixas.length ? ' (área sombreada: fase principal considerada na avaliação).' : '. A fase principal não foi identificada.') + SGO_DocA4_notaCorte_(opt, '°C') });
    if (ctx.tipoCiclo === 'TERMO' && f.conformidadePorSensor && f.conformidadePorSensor.length) {
      const pior = f.piorSensorA0 ? f.piorSensorA0.sensor : '';
      const svgB = SGO_DocA4_graficoBarras_({
        itens: f.conformidadePorSensor.map(function(c) { return { rotulo: c.sensor, valor: Number(c.a0), destaque: c.sensor === pior }; }),
        limite: { valor: f.limiteAprovacaoFinal, rotulo: 'A0 mínimo ' + SGO_DocA4_val_(f.limiteAprovacaoFinal, 0, 's') },
        unidade: 'A0 (s)', casas: 0
      });
      if (svgB) figuras.push({ svg: svgB, legenda: 'A0 acumulado por sensor na fase principal, comparado ao mínimo exigido para a classificação do artigo (linha tracejada).' });
    }
  } catch (e) {
    figuras.push({ erro: 'Os gráficos não puderam ser montados (' + (e && e.message ? e.message : e) + '). Os resultados numéricos não são afetados.' });
  }
  return figuras;
}

/**
 * Memória de cálculo do A0 (anexo): resumo por sensor e leitura a leitura do
 * pior sensor. Usa analise.memoriaA0PorSensor, preenchida no mesmo laço que
 * soma o A0 oficial (AnaliseCiclo.js).
 */
function LavRel_lvMontarMemoriaA0_(ctx, resultado) {
  const a = resultado.analise || {};
  const mem = a.memoriaA0PorSensor;
  if (ctx.tipoCiclo !== 'TERMO' || !mem) return null;
  const f = ctx.estudos[0].fatos || {};
  const resumo = (f.conformidadePorSensor || []).map(function(c) {
    const idx = Number(String(c.sensor).replace(/\D/g, '')) - 1;
    const l = mem[idx] || [];
    const soma = l.reduce(function(acc, r) { return acc + r.temperatura; }, 0);
    return { sensor: c.sensor, leituras: l.length, tempoSeg: l.length * (f.intervaloLeiturasSegundos || 0), media: l.length ? soma / l.length : null, a0: c.a0 };
  });
  const pior = f.piorSensorA0 ? f.piorSensorA0.sensor : '';
  const idxPior = pior ? Number(pior.replace(/\D/g, '')) - 1 : -1;
  return { resumo: resumo, pior: pior, leiturasPior: idxPior >= 0 ? (mem[idxPior] || []) : [] };
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO
// ------------------------------------------------------------

function LavRel_lvEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function LavRel_lvParagrafosHtml_(texto) {
  return SGO_DocA4_paragrafos_(texto);
}

function LavRel_lvFmtValor_(v, sufixo) {
  return SGO_DocA4_val_(v, 2, String(sufixo || '').replace(/^\s+/, ''));
}
