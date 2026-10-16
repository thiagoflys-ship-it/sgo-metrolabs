/****************************************************
 * METROLABS — AUTOCLAVE — INTERPRETAÇÃO TÉCNICA DO ENSAIO
 * Segunda forma de relatório (além do laudo em Planilha/PDF já
 * existente): documento HTML A4 com a interpretação técnica de UM
 * ciclo/ensaio individual, com textos gerados por IA a partir dos
 * MESMOS números já calculados por AutoRel_acExecutarAnaliseCompleta_ (ciclo
 * térmico, Main.js) ou AutoRel_acExecutarAnaliseLeakTestCompleta_ (Leak Test,
 * LeakTest.js) — nunca recalcula nada por conta própria.
 *
 * IMPORTANTE (mudança de escopo, 2026-08-01): NÃO é mais um certificado
 * final assinado. Numa campanha real (ex.: 5 receitas × 6 repetições)
 * cada ciclo gera o seu Relatório 1 (Planilha) + esta interpretação
 * (Relatório 2) — os N documentos são depois reunidos, por fora, num
 * relatório final consolidado (processo/módulo consolidador ainda em
 * definição). Por isso não tem Introdução/Objetivo nem Assinaturas.
 *
 * Cobre os dois tipos de relatório do módulo (payload.tipoRelatorio):
 * CICLO (os 5 ciclos térmicos de AutoRel_UCFG.CICLOS) e LEAK_TEST — uma
 * interpretação sempre cobre exatamente UM dos dois por execução, nunca
 * os dois juntos.
 *
 * Fluxo em 2 etapas (o técnico revisa o texto da IA antes de fechar o
 * documento):
 * 1. AutoRel_apiGerarRascunhoCertificado — roda a análise + IA, devolve os
 *    textos narrativos em campos editáveis + os fatos fixos pro preview.
 * 2. AutoRel_apiMontarCertificadoFinal — recebe os textos (possivelmente
 *    editados) + as fotos, monta o HTML final e devolve pronto pra abrir
 *    em nova aba e imprimir (Ctrl+P).
 ****************************************************/

/**
 * Normas reais aplicáveis, pesquisadas antes de escrever qualquer texto
 * (nunca inventadas) — ver docs/ da sessão que implementou este módulo.
 * CICLO: qualificação térmica (mesma norma-mãe usada em Cadeia de
 * Frio/Estufa) + validação/controle de rotina de esterilização a vapor +
 * a RDC que rege Boas Práticas de Processamento de Produtos para Saúde.
 * LEAK_TEST: reaproveita a referência já existente em
 * AutoRel_UCFG.LEAK_TEST.normaReferencia (EN 285, esterilizadores de grande
 * porte) + a mesma RDC de Boas Práticas.
 */
function AutoRel_acListarNormasAplicaveis_(tipoRelatorio) {
  if (tipoRelatorio === 'LEAK_TEST') {
    const cfgLeak = (AutoRel_UCFG && AutoRel_UCFG.LEAK_TEST) || {};
    const normas = [];
    if (cfgLeak.normaReferencia) normas.push(cfgLeak.normaReferencia);
    normas.push('RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde');
    return normas;
  }
  return [
    'ABNT NBR 16328 — Requisitos de desempenho e método de ensaio para equipamentos térmicos (qualificação térmica de autoclaves)',
    'ABNT NBR ISO 17665-1 — Esterilização de produtos para saúde, calor úmido: requisitos para o desenvolvimento, validação e controle de rotina de um processo de esterilização a vapor',
    'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
  ];
}

function AutoRel_acLabelCiclo_(motor, cicloCfg) {
  const base = 'Ciclo de Esterilização ' + motor + ' °C';
  if (cicloCfg && cicloCfg.tipoProcesso === 'BAIXA_TEMPERATURA') return 'Ciclo de Baixa Temperatura ' + motor + ' °C';
  return base;
}

/**
 * Conformidade por sensor (F0 acumulado + temperatura de exposição) —
 * mesmo papel do "conformidadePorSensor" de Cadeia de Frio/Estufa: dá à
 * IA o dado por posição pra escrever um parágrafo por sensor, não só o
 * agregado global. Só existe pro ciclo térmico (Leak Test não tem
 * conceito de posição — é uma única medida de pressão da câmara).
 */
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

/**
 * Monta o "pacote de fatos" único, usado tanto pra alimentar a IA
 * (AutoRel_acIACriarTextosCertificado_) quanto pra preencher as partes fixas do
 * template (identificação, normas, tiles, veredito).
 */
function AutoRel_acMontarContextoCertificado_(payload) {
  const tipoRelatorio = String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST' ? 'LEAK_TEST' : 'CICLO';

  let estudo;
  let statusConsolidado;
  let equipamentoLabel;
  let tempoInicioCicloBruto = '';
  let assinaturaLeituras = '';

  if (tipoRelatorio === 'LEAK_TEST') {
    const resultado = AutoRel_acExecutarAnaliseLeakTestCompleta_(payload);
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analiseLeak;

    equipamentoLabel = 'Autoclave — Teste de Estanqueidade (Leak Test)';
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));

    estudo = {
      tipoEstudo: 'LEAK_TEST',
      label: 'Teste de Estanqueidade (Leak Test)',
      tituloSecao: 'TESTE DE ESTANQUEIDADE (LEAK TEST)',
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
  } else {
    const resultado = AutoRel_acExecutarAnaliseCompleta_(payload);
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analise;
    const cicloCfg = resultado.cicloCfg || {};
    const f0MinNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.f0MinNormativo === 'number'
      ? a.limitesAprovacao.f0MinNormativo
      : AutoRel_parseFloatSeguro_(cicloCfg.f0MinNormativo, 0);

    equipamentoLabel = AutoRel_acLabelCiclo_(resultado.motor, cicloCfg);
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));
    // Fallback pra "Data do ensaio": quando a fase de exposição não é
    // identificada (ex.: ciclo reprovado por não atingir a condição
    // mínima), tempoInicioExposicao fica vazio — tempoInicioCiclo (1ª
    // linha do arquivo) sempre existe, mesmo nesse caso.
    tempoInicioCicloBruto = a.tempoInicioCiclo || '';

    estudo = {
      tipoEstudo: 'CICLO_TERMICO',
      label: equipamentoLabel,
      tituloSecao: 'CICLO DE ESTERILIZAÇÃO — ' + resultado.motor + ' °C',
      statusAprovacao: statusConsolidado,
      fatos: {
        exigeF0: !!(cicloCfg.f0MinNormativo || cicloCfg.f0Min),
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
        conformidadePorSensor: AutoRel_acMontarConformidadePorSensor_(a, resultado.sensoresAtivos, f0MinNormativo)
      },
      motivosReprovacao: a.motivosReprovacao || [],
      alertasAnalise: a.alertasAnalise || [],
      observacoesAnalise: a.observacoesAnalise || []
    };
  }

  return {
    tipoRelatorio: tipoRelatorio,
    assinaturaLeituras: assinaturaLeituras,
    simulado: !!payload.modoRelatorioSimulado,
    origemDados: payload.modoRelatorioSimulado ? 'SIMULADO — USO INTERNO; NÃO REPRESENTA ENSAIO REAL' : 'DADOS INFORMADOS PARA O ENSAIO',
    normas: AutoRel_acListarNormasAplicaveis_(tipoRelatorio),
    statusConsolidado: statusConsolidado,
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || payload.tagEquipamento || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.setor || payload.localizacao || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.setor || payload.localizacao || '').trim(),
      equipamento: equipamentoLabel,
      tag: String(payload.tag || payload.tagEquipamento || '').trim(),
      dtl: String(payload.certDataLogger || '').trim(),
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim(),
      dataDoEnsaio: AutoRel_acExtrairDataDoTexto_(estudo.fatos.tempoInicioExposicao || estudo.fatos.tempoInicio || tempoInicioCicloBruto || ''),
      tecnicoExecutor: String(payload.responsavelTecnico || payload.operador || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: AutoRel_UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

function AutoRel_acExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

function AutoRel_acNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  return ['APROVADO', 'APROVADO_COM_ALERTA', 'REPROVADO', 'INFORMATIVO'].indexOf(s) !== -1 ? s : 'INFORMATIVO';
}

function AutoRel_acLabelStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('ALERTA') !== -1) return 'APROVADO COM ALERTA';
  if (s === 'INFORMATIVO') return 'INFORMATIVO';
  if (s === 'APROVADO') return 'APROVADO';
  return 'INFORMATIVO';
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO (roda a IA, devolve pra revisão na tela)
// ------------------------------------------------------------
function AutoRel_apiGerarRascunhoCertificado(payload) {
  payload = payload || {};

  const contexto = AutoRel_acMontarContextoCertificado_(payload);
  const textos = AutoRel_acIACriarTextosCertificado_(contexto);

  return {
    ok: true,
    textos: textos,
    contexto: contexto,
    assinaturaContexto: AutoRel_acAssinatura_(contexto)
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: MONTAGEM FINAL (textos já revisados + fotos)
// ------------------------------------------------------------
function AutoRel_apiMontarCertificadoFinal(payload) {
  payload = payload || {};

  const contexto = AutoRel_acMontarContextoCertificado_(payload);

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

  const html = template.evaluate().getContent();
  // Regra do dono: HTML A4 + PDF salvos na pasta do cliente (subpasta por CNPJ
  // dentro da pasta de laudos). Falha ao salvar não impede a entrega na tela.
  return SGO_DocSalvar_finalizarCertificado_(html, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
  }, 'Certificado Autoclave', AutoRel_UCFG.TZ);
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO DO TEMPLATE (Certificado.html chama estas
// funções diretamente — mesmo projeto Apps Script, escopo global)
// ------------------------------------------------------------

function AutoRel_acEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quebra texto corrido da IA em parágrafos <p> HTML seguros (escapados). */
function AutoRel_acParagrafosHtml_(texto) {
  const partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>—</p>';
  return partes.map(function(p) { return '<p>' + AutoRel_acEscaparHtml_(p) + '</p>'; }).join('');
}

function AutoRel_acFmtValor_(v, sufixo) {
  if (v === null || v === undefined || v === '') return '—';
  // pt-BR: vírgula decimal, ponto de milhar, 2 casas fixas, espaço inseparável antes da unidade.
  const suf = String(sufixo || '').replace(/^\s+/, '');
  const n = typeof v === 'number' ? v : (/^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? Number(v) : NaN);
  const txt = isFinite(n) ? SGO_DocSalvar_num_(n, 2) : String(v);
  return txt + (suf ? '\u00a0' + suf : '');
}

/** Assina fatos e leituras, sem incluir textos editáveis ou fotografias. */
function AutoRel_acAssinatura_(valor) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
