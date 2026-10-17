/****************************************************
 * METROLABS — AUTOCLAVE — RELATÓRIO DE ENSAIO TÉRMICO (INTERPRETAÇÃO TÉCNICA)
 *
 * Documento HTML A4 de UM ciclo/ensaio (ciclo térmico ou teste de
 * estanqueidade), no padrão comum SGO_DocA4 (cabeçalho e rodapé em todas as
 * páginas, numeração, gráficos em SVG), salvo em HTML + PDF na pasta do
 * cliente. Os números vêm de AutoRel_acExecutarAnaliseCompleta_ (ciclo
 * térmico, Main.js) ou AutoRel_acExecutarAnaliseLeakTestCompleta_ (Leak Test,
 * LeakTest.js): este arquivo nunca recalcula nada por conta própria.
 *
 * Fluxo em 2 etapas (o técnico revisa o texto da IA antes de fechar):
 * 1. AutoRel_apiGerarRascunhoCertificado — análise + IA; devolve os textos
 *    editáveis, os fatos fixos e a assinatura dos dados.
 * 2. AutoRel_apiMontarCertificadoFinal — confere a assinatura e os textos,
 *    monta o documento (AutoclaveCertificado.html) e salva na pasta do cliente.
 *
 * 17/10/2026 (pedido do dono: "relatório perfeito"): identificação completa,
 * registradores com certificado e validade (cadastro de padrões), critérios
 * de aceitação com o resultado obtido, tabela por sensor, gráficos, não
 * conformidades, conclusão inequívoca (sem "aprovado com alerta") e
 * responsabilidade técnica com assinaturas.
 ****************************************************/

/** Normas aplicáveis (nunca inventadas). */
function AutoRel_acListarNormasAplicaveis_(tipoRelatorio) {
  if (tipoRelatorio === 'LEAK_TEST') {
    const cfgLeak = (AutoRel_UCFG && AutoRel_UCFG.LEAK_TEST) || {};
    const normas = [];
    if (cfgLeak.normaReferencia) normas.push(cfgLeak.normaReferencia);
    normas.push('RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde');
    return normas;
  }
  return [
    'ABNT NBR ISO 17665-1 — Esterilização de produtos para saúde — Calor úmido — Parte 1: Requisitos para o desenvolvimento, validação e controle de rotina de um processo de esterilização a vapor',
    'ABNT NBR 16328 — Requisitos de desempenho e método de ensaio para equipamentos térmicos (qualificação térmica)',
    'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
  ];
}

function AutoRel_acLabelCiclo_(motor, cicloCfg) {
  const base = 'Ciclo de Esterilização ' + motor + ' °C';
  if (cicloCfg && cicloCfg.tipoProcesso === 'BAIXA_TEMPERATURA') return 'Ciclo de Baixa Temperatura ' + motor + ' °C';
  return base;
}

/** Conformidade por sensor (F0 acumulado + temperaturas na exposição). */
function AutoRel_acMontarConformidadePorSensor_(analise, sensoresAtivos, f0MinNormativo) {
  const lista = [];
  const f0PorSensor = analise.f0PorSensor || [];
  const statsSensores = (analise.stats && analise.stats.sensores) || [];

  for (let s = 0; s < f0PorSensor.length; s++) {
    if (!sensoresAtivos[s]) continue;
    const f0 = f0PorSensor[s];
    if (f0 === null || f0 === undefined) continue;
    const st = statsSensores[s] || {};
    lista.push({
      sensor: 'S' + (s + 1),
      f0: f0,
      statusSensor: f0 >= f0MinNormativo ? 'CONFORME' : 'NAO_CONFORME',
      minTemp: st.minExposicao !== null && st.minExposicao !== undefined ? st.minExposicao : null,
      maxTemp: st.maxExposicao !== null && st.maxExposicao !== undefined ? st.maxExposicao : null,
      mediaTemp: st.mediaExposicao !== null && st.mediaExposicao !== undefined ? st.mediaExposicao : null
    });
  }

  return lista;
}

/** Texto curto de tipo de remoção de ar (campo da tela). */
function AutoRel_acTextoRemocaoAr_(modo) {
  const m = String(modo || '').toUpperCase();
  if (m === 'PRE_VACUO') return 'Pré-vácuo pulsado';
  if (m === 'GRAVITACIONAL') return 'Gravitacional';
  if (m === 'SFPP') return 'Pulsos de pressão positiva (SFPP)';
  return 'Identificação automática pelo registro';
}

/**
 * Pacote de fatos único: alimenta a IA e as partes fixas do documento.
 * interno (opcional): recebe { resultado } com os dados lidos, para os
 * gráficos — fica fora do contexto (que vai para a tela e é assinado).
 */
function AutoRel_acMontarContextoCertificado_(payload, interno) {
  const tipoRelatorio = String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST' ? 'LEAK_TEST' : 'CICLO';

  let estudo;
  let statusConsolidado;
  let equipamentoLabel;
  let tempoInicioCicloBruto = '';
  let assinaturaLeituras = '';
  let criterios = [];
  let resumo = '';
  let parametros = [];

  if (tipoRelatorio === 'LEAK_TEST') {
    const resultado = AutoRel_acExecutarAnaliseLeakTestCompleta_(payload);
    if (interno) interno.resultado = resultado;
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analiseLeak;

    equipamentoLabel = 'Autoclave — Teste de estanqueidade da câmara';
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));
    tempoInicioCicloBruto = a.tempoInicioLeakTest || '';

    estudo = {
      tipoEstudo: 'LEAK_TEST',
      label: 'Teste de estanqueidade',
      tituloSecao: 'Teste de estanqueidade',
      statusAprovacao: statusConsolidado,
      fatos: {
        tempoInicio: a.tempoInicioLeakTest,
        tempoFim: a.tempoFimLeakTest,
        tempoDecorridoMinutos: a.tempoDecorridoMinutos,
        unidadePressaoOriginal: a.unidadePressaoOriginal,
        pressaoInicioMbar: a.pressaoInicioMbar,
        pressaoFimMbar: a.pressaoFimMbar,
        deltaPressaoMbar: a.deltaPressaoMbar,
        taxaVazamentoMbarMin: a.taxaVazamentoMbarMin,
        limiteTaxaVazamentoMbarMin: a.limiteTaxaVazamentoMbarMin
      },
      motivosReprovacao: a.motivosReprovacao || [],
      alertasAnalise: a.alertasAnalise || [],
      observacoesAnalise: a.observacoesAnalise || []
    };

    const conformeTaxa = isFinite(a.taxaVazamentoMbarMin) && isFinite(a.limiteTaxaVazamentoMbarMin) ? a.taxaVazamentoMbarMin <= a.limiteTaxaVazamentoMbarMin : null;
    criterios = [{
      criterio: 'Taxa de vazamento da câmara',
      requisito: '≤ ' + SGO_DocA4_val_(a.limiteTaxaVazamentoMbarMin, 2, 'mbar/min'),
      referencia: ((AutoRel_UCFG.LEAK_TEST || {}).normaReferencia) || 'Limite de referência configurado',
      obtido: SGO_DocA4_val_(a.taxaVazamentoMbarMin, 2, 'mbar/min'),
      conforme: conformeTaxa
    }];
    resumo = 'Taxa de vazamento de ' + SGO_DocA4_val_(a.taxaVazamentoMbarMin, 2, 'mbar/min') + ', ' +
      (conformeTaxa === false ? 'acima' : 'dentro') + ' do limite de ' + SGO_DocA4_val_(a.limiteTaxaVazamentoMbarMin, 2, 'mbar/min') + '.';
    parametros = [
      ['Unidade de pressão do registro', String(a.unidadePressaoOriginal || '—').toLowerCase().replace('kpa', 'kPa')],
      ['Janela do teste', (a.tempoInicioLeakTest || '—') + ' a ' + (a.tempoFimLeakTest || '—')]
    ];
  } else {
    const resultado = AutoRel_acExecutarAnaliseCompleta_(payload);
    if (interno) interno.resultado = resultado;
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analise;
    const cicloCfg = resultado.cicloCfg || {};
    const f0MinNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.f0MinNormativo === 'number'
      ? a.limitesAprovacao.f0MinNormativo
      : AutoRel_parseFloatSeguro_(cicloCfg.f0MinNormativo, 0);
    const exigeF0 = !!(cicloCfg.f0MinNormativo || cicloCfg.f0Min);

    equipamentoLabel = AutoRel_acLabelCiclo_(resultado.motor, cicloCfg);
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));
    tempoInicioCicloBruto = a.tempoInicioCiclo || '';
    const conformidade = AutoRel_acMontarConformidadePorSensor_(a, resultado.sensoresAtivos, f0MinNormativo);

    estudo = {
      tipoEstudo: 'CICLO_TERMICO',
      label: equipamentoLabel,
      tituloSecao: 'Ciclo de esterilização — ' + resultado.motor + ' °C',
      statusAprovacao: statusConsolidado,
      fatos: {
        exigeF0: exigeF0,
        f0MinNormativo: f0MinNormativo,
        minF0: a.minF0,
        mediaF0: a.mediaF0,
        maxF0: a.maxF0,
        tempoInicioExposicao: a.tempoInicioExposicao || '',
        tempoFimExposicao: a.tempoFimExposicao || '',
        tempoExposicaoMinutos: a.tempoExposicaoMinutos,
        tempoTotalMinutos: a.tempoTotalMinutos,
        quantidadeSensoresInstalados: a.quantidadeSensoresInstalados,
        quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
        piorSensorF0: a.piorSensorF0 || null,
        piorSensorTemperatura: a.piorSensorTemperatura || null,
        fasesProcesso: (a.fasesProcesso && a.fasesProcesso.resumo) || {},
        diagnosticoPreVacuo: (a.fasesProcesso && a.fasesProcesso.diagnostico) || { status: 'INDETERMINADO', limitacoes: ['Diagnóstico de pré-vácuo indisponível; zero pulsos detectados não comprova ausência de remoção de ar.'] },
        pressaoRegistrada: (a.stats && a.stats.globalPres) || {},
        conformidadePorSensor: conformidade,
        temperaturaReferencia: { tMin: cicloCfg.tMin, tMax: cicloCfg.tMax, tBase: (a.configuracaoCiclo || {}).tBase, z: (a.configuracaoCiclo || {}).z },
        intervaloLeiturasSegundos: isFinite(a.deltaMinutosEstimado) ? Math.round(a.deltaMinutosEstimado * 60 * 10) / 10 : null
      },
      motivosReprovacao: a.motivosReprovacao || [],
      alertasAnalise: a.alertasAnalise || [],
      observacoesAnalise: a.observacoesAnalise || []
    };

    const exposicaoOk = !!(a.tempoInicioExposicao && a.tempoFimExposicao) && a.tempoExposicaoMinutos > 0;
    criterios.push({
      criterio: 'Identificação da fase de exposição',
      requisito: 'Patamar de esterilização reconhecido nos dados de todos os sensores ativos',
      referencia: 'ABNT NBR ISO 17665-1',
      obtido: exposicaoOk ? (AutoRel_acSoHora_(a.tempoInicioExposicao) + ' a ' + AutoRel_acSoHora_(a.tempoFimExposicao) + ' (' + SGO_DocA4_val_(a.tempoExposicaoMinutos, 2, 'min') + ')') : 'Não identificada',
      conforme: exposicaoOk
    });
    if (exigeF0) {
      const pior = a.piorSensorF0 ? a.piorSensorF0.sensor : '';
      const f0Ok = conformidade.length ? a.minF0 >= f0MinNormativo : false;
      criterios.push({
        criterio: 'Letalidade térmica (F0) no pior sensor',
        requisito: 'F0 ≥ ' + SGO_DocA4_val_(f0MinNormativo, 2, 'min') + ' em todos os sensores ativos',
        referencia: 'ABNT NBR ISO 17665-1 (F0 com Tref = ' + SGO_DocA4_val_((a.configuracaoCiclo || {}).tBase, 1, '°C') + ' e z = ' + SGO_DocA4_val_((a.configuracaoCiclo || {}).z, 0, '°C') + ')',
        obtido: conformidade.length ? (SGO_DocA4_val_(a.minF0, 2, 'min') + (pior ? ' (' + pior + ')' : '')) : 'Não calculado',
        conforme: f0Ok
      });
      resumo = conformidade.length
        ? 'F0 mínimo de ' + SGO_DocA4_val_(a.minF0, 2, 'min') + (pior ? ' no sensor ' + pior : '') + ', ' + (f0Ok ? 'igual ou acima' : 'abaixo') + ' do mínimo de ' + SGO_DocA4_val_(f0MinNormativo, 2, 'min') + '.'
        : 'Não foi possível calcular o F0 dos sensores ativos.';
    } else {
      resumo = exposicaoOk ? 'Fase de exposição identificada com ' + SGO_DocA4_val_(a.tempoExposicaoMinutos, 2, 'min') + ' de duração.' : 'Fase de exposição não identificada.';
    }
    if (!exposicaoOk && statusConsolidado === 'REPROVADO') resumo = 'Fase de exposição não identificada nos dados. ' + resumo;
    const eq = payload.equipamento || {};
    parametros = [
      ['Temperatura programada', payload.setpoint ? SGO_DocA4_val_(Number(String(payload.setpoint).replace(',', '.')), 1, '°C') : (resultado.motor + ' °C')],
      ['Faixa de esterilização de referência', (isFinite(cicloCfg.tMin) && isFinite(cicloCfg.tMax)) ? SGO_DocA4_val_(cicloCfg.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(cicloCfg.tMax, 1, '°C') : '—'],
      ['Remoção de ar', AutoRel_acTextoRemocaoAr_(eq.modoRemocaoAr)],
      ['Intervalo entre leituras', estudo.fatos.intervaloLeiturasSegundos ? SGO_DocA4_val_(estudo.fatos.intervaloLeiturasSegundos, 0, 's') : '—'],
      ['Sensores utilizados', (a.quantidadeSensoresUtilizados || 0) + ' de ' + (a.quantidadeSensoresInstalados || 0) + ' instalados'],
      ['Correção de temperatura aplicada', AutoRel_parseFloatSeguro_(payload.offsetTemp, 0) ? SGO_DocA4_val_(AutoRel_parseFloatSeguro_(payload.offsetTemp, 0), 2, '°C') : 'Nenhuma']
    ];
  }

  const dataDoEnsaio = AutoRel_acExtrairDataDoTexto_(estudo.fatos.tempoInicioExposicao || estudo.fatos.tempoInicio || tempoInicioCicloBruto || '');
  const dtl = String(payload.certDataLogger || '').trim();
  const registradores = SGO_DocA4_registradores_(dtl, dataDoEnsaio);

  return {
    tipoRelatorio: tipoRelatorio,
    assinaturaLeituras: assinaturaLeituras,
    simulado: !!payload.modoRelatorioSimulado,
    origemDados: payload.modoRelatorioSimulado ? 'SIMULADO — USO INTERNO; NÃO REPRESENTA ENSAIO REAL' : 'DADOS INFORMADOS PARA O ENSAIO',
    normas: AutoRel_acListarNormasAplicaveis_(tipoRelatorio),
    statusConsolidado: statusConsolidado,
    resumoResultado: resumo,
    criterios: criterios,
    parametros: parametros,
    registradores: registradores,
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || payload.tagEquipamento || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      cnpj: String(payload.cnpj || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
      equipamento: equipamentoLabel,
      tag: String(payload.tag || payload.tagEquipamento || '').trim(),
      dtl: dtl,
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim() || '0',
      dataDoEnsaio: dataDoEnsaio,
      tecnicoExecutor: String(payload.responsavelTecnico || payload.respTecnico || payload.operador || '').trim(),
      operador: String(payload.operador || '').trim(),
      marca: String(payload.marca || '').trim(),
      modelo: String(payload.modelo || '').trim(),
      numeroSerie: String(payload.numSerie || '').trim(),
      programa: String(payload.programa || '').trim(),
      tipoEnsaio: String(payload.ensaio || '').trim(),
      cicloNumero: String(payload.cicloNum || '').trim(),
      lote: String(payload.lote || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: AutoRel_UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

/** Valor gravado do campo "Tipo de ensaio" → texto do documento. */
function AutoRel_acTextoTipoEnsaio_(v) {
  const s = String(v || '').trim();
  const mapa = {
    'QD (Carga)': 'Qualificação de desempenho (com carga)',
    'QO (Vazio)': 'Qualificação operacional (câmara vazia)',
    'QI (Instalação)': 'Qualificação de instalação',
    'Rotina': 'Monitoramento de rotina'
  };
  return mapa[s] || s || '—';
}

function AutoRel_acSoHora_(tempoStr) {
  const s = String(tempoStr || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}(:\d{2})?)\s*$/);
  return m ? m[1] : (s || '—');
}

function AutoRel_acExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

/** Status único do documento: APROVADO, REPROVADO ou INFORMATIVO (não existe mais "com alerta"). */
function AutoRel_acNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

function AutoRel_acLabelStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO (roda a IA, devolve pra revisão na tela)
// ------------------------------------------------------------
function AutoRel_apiGerarRascunhoCertificado(payload) {
  payload = payload || {};

  const contexto = AutoRel_acMontarContextoCertificado_(payload);
  const ia = SGO_DocSalvar_textosIaOuManual_(AutoRel_acIACriarTextosCertificado_, contexto);

  return {
    ok: true,
    textos: ia.textos,
    avisoIA: ia.avisoIA,
    contexto: contexto,
    assinaturaContexto: AutoRel_acAssinatura_(contexto)
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: MONTAGEM FINAL (textos já revisados + fotos)
// ------------------------------------------------------------
function AutoRel_apiMontarCertificadoFinal(payload) {
  payload = payload || {};

  const interno = {};
  const contexto = AutoRel_acMontarContextoCertificado_(payload, interno);

  if (!payload.assinaturaContextoCertificado || payload.assinaturaContextoCertificado !== AutoRel_acAssinatura_(contexto)) {
    throw new Error('Os dados ou critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Gere um novo rascunho e revise os textos antes de emitir.');
  }
  const textos = payload.textosCertificado || {};
  if (!String(textos.conclusaoGeral || '').trim() || !String(textos.conclusaoLeigo || '').trim() || contexto.estudos.some(function(e) { return !String((textos.analisePorEstudo || {})[e.tipoEstudo] || '').trim(); })) {
    throw new Error('A interpretação está incompleta. Preencha as análises e as duas conclusões antes de emitir.');
  }
  const fotos = Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado.slice(0, 4) : [];

  const template = HtmlService.createTemplateFromFile('AutoclaveCertificado');
  template.ctx = contexto;
  template.textos = {
    conclusaoGeral: String(textos.conclusaoGeral || '').trim(),
    conclusaoLeigo: String(textos.conclusaoLeigo || '').trim(),
    analisePorEstudo: textos.analisePorEstudo || {}
  };
  template.fotos = fotos.filter(function(f) { return f && f.base64; });
  template.geradoEm = Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'dd/MM/yyyy');
  template.graficos = AutoRel_acMontarGraficos_(contexto, interno.resultado || {});
  template.assinaturas = AutoRel_acListaAssinaturas_(contexto);

  const html = template.evaluate().getContent();
  // Regra do dono: HTML A4 + PDF salvos na pasta do cliente (subpasta por CNPJ
  // dentro da pasta de laudos). Falha ao salvar não impede a entrega na tela.
  return SGO_DocSalvar_finalizarCertificado_(html, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
  }, contexto.tipoRelatorio === 'LEAK_TEST' ? 'Relatório de ensaio Autoclave - estanqueidade' : 'Relatório de ensaio Autoclave', AutoRel_UCFG.TZ);
}

/** Técnico executor (assina à mão) + responsáveis técnicos da configuração. */
function AutoRel_acListaAssinaturas_(ctx) {
  const lista = [];
  const tecnico = (ctx.identificacao || {}).tecnicoExecutor;
  if (tecnico) lista.push({ nome: tecnico, cargo: 'Técnico executor do ensaio', registro: '' });
  (AutoRel_UCFG.ASSINATURAS_PADRAO || []).forEach(function(a) { lista.push(a); });
  return lista;
}

/**
 * Gráficos do documento (SVG). Ciclo térmico: temperatura por sensor com a
 * janela de exposição, pressão da câmara e F0 por sensor. Estanqueidade:
 * pressão na janela do teste.
 */
function AutoRel_acMontarGraficos_(ctx, resultado) {
  const figuras = [];
  try {
    const dados = resultado.dadosNormalizados || [];
    if (!dados.length) return figuras;
    const tz = AutoRel_UCFG.TZ || 'America/Sao_Paulo';

    if (ctx.tipoRelatorio === 'LEAK_TEST') {
      const a = resultado.analiseLeak || {};
      const fator = typeof AutoRel_obterFatorConversaoParaMbarLeakTest_ === 'function' ? AutoRel_obterFatorConversaoParaMbarLeakTest_(a.unidadePressaoOriginal) : 1;
      const ini = Math.max(0, (a.indiceInicio || 0) - 5), fim = Math.min(dados.length - 1, (isFinite(a.indiceFim) ? a.indiceFim : dados.length - 1) + 5);
      const fatia = dados.slice(ini, fim + 1);
      const base = SGO_DocA4_seriesTemperatura_(fatia, { tz: tz });
      const pts = [];
      fatia.forEach(function(r, i) { const p = Number(r.pressao); if (r.pressao !== null && r.pressao !== '' && isFinite(p)) pts.push([base.xDe(r, i), p * fator]); });
      const x0 = base.xDe(dados[a.indiceInicio] || fatia[0], (a.indiceInicio || 0) - ini), x1 = base.xDe(dados[a.indiceFim] || fatia[fatia.length - 1], (a.indiceFim || 0) - ini);
      const svg = SGO_DocA4_graficoLinhas_({
        series: [{ nome: 'Pressão da câmara', cor: '#1f5fa8', pontos: pts, largura: 1.6 }],
        formatarX: base.formatarX, rotuloX: 'Horário', rotuloY: 'Pressão (mbar)', casasY: 0,
        faixasX: [{ x0: x0, x1: x1, rotulo: 'Janela do teste' }]
      });
      if (svg) figuras.push({ svg: svg, legenda: 'Pressão absoluta da câmara durante o teste de estanqueidade (área sombreada: janela de cálculo da taxa de vazamento).' });
      return figuras;
    }

    const a = resultado.analise || {};
    const inicioCiclo = isFinite(a.indiceInicioCiclo) && a.indiceInicioCiclo >= 0 ? a.indiceInicioCiclo : 0;
    const fimCiclo = isFinite(a.indiceFimCiclo) && a.indiceFimCiclo >= inicioCiclo ? a.indiceFimCiclo : dados.length - 1;
    const fatia = dados.slice(inicioCiclo, fimCiclo + 1);
    const desloc = AutoRel_parseFloatSeguro_((resultado.payload || {}).offsetTemp, 0);
    const series = SGO_DocA4_seriesTemperatura_(fatia, { sensoresAtivos: resultado.sensoresAtivos, deslocamento: desloc, tz: tz, dtMin: a.deltaMinutosEstimado });
    const faixas = [];
    if (a.faseInicioExp >= 0 && a.faseFimExp >= a.faseInicioExp) {
      faixas.push({ x0: series.xDe(dados[a.faseInicioExp], a.faseInicioExp - inicioCiclo), x1: series.xDe(dados[a.faseFimExp], a.faseFimExp - inicioCiclo), rotulo: 'Exposição' });
    }
    const ref = (ctx.estudos[0].fatos || {}).temperaturaReferencia || {};
    const referencias = [];
    if (isFinite(ref.tMin) && ref.tMin > 0) referencias.push({ y: ref.tMin, rotulo: 'Mínima de esterilização ' + SGO_DocA4_val_(ref.tMin, 1, '°C') });
    const optT = {
      series: series.series, formatarX: series.formatarX, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)',
      faixasX: faixas, referencias: referencias
    };
    const svgT = SGO_DocA4_graficoLinhas_(optT);
    if (svgT) figuras.push({ svg: svgT, legenda: 'Temperatura registrada por sensor ativo ao longo do ciclo' +
      (faixas.length ? ' (área sombreada: fase de exposição considerada no cálculo do F0).' : '. A fase de exposição não foi identificada, por isso não há janela sombreada.') + SGO_DocA4_notaCorte_(optT, '°C') });

    const ptsP = [];
    fatia.forEach(function(r, i) { const p = Number(r.pressao); if (r.pressao !== null && r.pressao !== '' && isFinite(p)) ptsP.push([series.xDe(r, i), p]); });
    if (ptsP.length >= 10) {
      const svgP = SGO_DocA4_graficoLinhas_({
        series: [{ nome: 'Pressão da câmara', cor: '#0f8b8d', pontos: ptsP, largura: 1.4 }], formatarX: series.formatarX,
        rotuloX: 'Horário', rotuloY: 'Pressão (bar abs.)', faixasX: faixas, altura: 230
      });
      if (svgP) figuras.push({ svg: svgP, legenda: 'Pressão da câmara registrada ao longo do ciclo (bar absoluto). As fases de remoção de ar, exposição e secagem são identificadas por observação da curva.' });
    }

    const f = ctx.estudos[0].fatos || {};
    if (f.exigeF0 && f.conformidadePorSensor && f.conformidadePorSensor.length) {
      const pior = f.piorSensorF0 ? f.piorSensorF0.sensor : '';
      const svgB = SGO_DocA4_graficoBarras_({
        itens: f.conformidadePorSensor.map(function(c) { return { rotulo: c.sensor, valor: Number(c.f0), destaque: c.sensor === pior }; }),
        limite: { valor: f.f0MinNormativo, rotulo: 'F0 mínimo ' + SGO_DocA4_val_(f.f0MinNormativo, 2, 'min') },
        unidade: 'F0 (min)', casas: 2
      });
      if (svgB) figuras.push({ svg: svgB, legenda: 'F0 acumulado por sensor na fase de exposição, comparado ao mínimo exigido (linha tracejada).' });
    }
  } catch (e) {
    // Gráfico é complemento: falha aqui não impede o documento.
    figuras.push({ erro: 'Os gráficos não puderam ser montados (' + (e && e.message ? e.message : e) + '). Os resultados numéricos acima não são afetados.' });
  }
  return figuras;
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO (AutoclaveCertificado.html chama estas funções)
// ------------------------------------------------------------

function AutoRel_acEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quebra texto corrido em parágrafos <p> HTML seguros (escapados). */
function AutoRel_acParagrafosHtml_(texto) {
  return SGO_DocA4_paragrafos_(texto);
}

function AutoRel_acFmtValor_(v, sufixo) {
  return SGO_DocA4_val_(v, 2, String(sufixo || '').replace(/^\s+/, ''));
}

/** Assina fatos e leituras, sem incluir textos editáveis ou fotografias. */
function AutoRel_acAssinatura_(valor) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
