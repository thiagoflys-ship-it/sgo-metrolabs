/****************************************************
 * METROLABS — LAVADORA — INTERPRETAÇÃO TÉCNICA DO ENSAIO
 * Segunda forma de relatório (além do laudo em Planilha/PDF já
 * existente): documento HTML A4 com a interpretação técnica de UM
 * ciclo/ensaio individual, com textos gerados por IA a partir dos
 * MESMOS números já calculados por lvExecutarAnaliseCompleta_ (Main.js)
 * — nunca recalcula nada por conta própria.
 *
 * IMPORTANTE (mudança de escopo, 2026-08-01): NÃO é mais um certificado
 * final assinado. Numa campanha real (várias receitas × várias
 * repetições) cada ciclo gera o seu Relatório 1 (Planilha) + esta
 * interpretação (Relatório 2) — os N documentos são depois reunidos,
 * por fora, num relatório final consolidado (processo/módulo
 * consolidador ainda em definição). Por isso não tem Introdução/
 * Objetivo nem Assinaturas.
 *
 * Cobre os dois tipos de equipamento do módulo (payload.motor): TERMO
 * (Termodesinfectora, letalidade térmica/A0) e ULTRASSOM (Lavadora
 * Ultrassônica, tempo de cavitação) — uma interpretação sempre cobre
 * exatamente UM dos dois por execução.
 *
 * Fluxo em 2 etapas (o técnico revisa o texto da IA antes de fechar o
 * documento):
 * 1. apiGerarRascunhoCertificado — roda a análise + IA, devolve os
 *    textos narrativos em campos editáveis + os fatos fixos pro preview.
 * 2. apiMontarCertificadoFinal — recebe os textos (possivelmente
 *    editados) + as fotos, monta o HTML final e devolve pronto pra abrir
 *    em nova aba e imprimir (Ctrl+P).
 ****************************************************/

/**
 * Normas reais aplicáveis, pesquisadas antes de escrever qualquer texto
 * (nunca inventadas). TERMO reaproveita a mesma referência já citada no
 * laudo em Planilha (ver Planilha.js, cálculo de A0 baseado em ISO 15883).
 * ULTRASSOM: pesquisa não encontrou uma ABNT NBR estável e vigente
 * específica de validação de cavitação (o candidato mais próximo, NBR
 * 17130-1:2024, aparece como cancelada/em revisão em fontes recentes) —
 * mantido o mesmo texto genérico de manual do fabricante já usado no
 * laudo em Planilha, sem inventar norma. Sinalizado ao usuário.
 */
function lvListarNormasAplicaveis_(tipoCiclo) {
  if (tipoCiclo === 'ULTRASSOM') {
    return [
      'Protocolo de verificação de eficiência de cavitação conforme prática usual do fabricante',
      'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
    ];
  }
  return [
    'ABNT NBR ISO 15883 — base normativa do cálculo de letalidade térmica (A0) para lavadoras desinfectoras',
    'RDC nº 15/2012 (ANVISA) — Boas Práticas para o Processamento de Produtos para Saúde'
  ];
}

function lvLabelCiclo_(motor, cicloCfg) {
  if (motor === 'ULTRASSOM') return 'Lavadora Ultrassônica (Cavitação)';
  return 'Termodesinfectora (Cálculo de A0)';
}

/**
 * Conformidade por sensor (A0 acumulado + temperatura de exposição) — só
 * existe pra Termodesinfectora; a Ultrassônica não tem conceito de
 * posição/sensor pro parâmetro de aprovação (tempo de cavitação é uma
 * medida única do ciclo inteiro, não por sensor).
 */
function lvMontarConformidadePorSensor_(analise, sensoresAtivos, limiteAprovacaoFinal) {
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

/**
 * Monta o "pacote de fatos" único, usado tanto pra alimentar a IA
 * (lvIACriarTextosCertificado_) quanto pra preencher as partes fixas do
 * template (identificação, normas, tiles, veredito).
 */
function lvMontarContextoCertificado_(payload) {
  const resultado = lvExecutarAnaliseCompleta_(payload);
  payload = resultado.payload;
  const a = resultado.analise;
  const motor = resultado.motor;
  const cicloCfg = resultado.cicloCfg || {};
  const limiteAprovacaoFinal = a.limitesAprovacao && typeof a.limitesAprovacao.limiteAprovacaoFinal === 'number'
    ? a.limitesAprovacao.limiteAprovacaoFinal
    : parseFloatSeguro_(cicloCfg.parametroOperacional, 0);
  const parametroNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.parametroNormativo === 'number'
    ? a.limitesAprovacao.parametroNormativo
    : parseFloatSeguro_(cicloCfg.parametroNormativo, 0);

  const equipamentoLabel = lvLabelCiclo_(motor, cicloCfg);
  const statusConsolidado = a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO');

  const fatos = {
    tempoInicioExposicao: a.tempoInicioExposicao || '',
    tempoFimExposicao: a.tempoFimExposicao || '',
    tempoExposicaoMinutos: a.tempoExposicaoMinutos,
    tempoTotalMinutos: a.tempoTotalMinutos,
    quantidadeSensoresInstalados: a.quantidadeSensoresInstalados,
    quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    parametroNormativo: parametroNormativo,
    limiteAprovacaoFinal: limiteAprovacaoFinal
  };

  if (motor === 'ULTRASSOM') {
    fatos.tempoCavitacao = a.tempoCavitacao;
  } else {
    fatos.minA0 = a.minA0;
    fatos.mediaA0 = a.mediaA0;
    fatos.maxA0 = a.maxA0;
    fatos.piorSensorA0 = a.piorSensorA0 || null;
    fatos.conformidadePorSensor = lvMontarConformidadePorSensor_(a, resultado.sensoresAtivos, limiteAprovacaoFinal);
  }

  const estudo = {
    tipoEstudo: motor,
    label: equipamentoLabel,
    tituloSecao: (motor === 'ULTRASSOM' ? 'CICLO DE LAVAGEM ULTRASSÔNICA' : 'CICLO DE DESINFECÇÃO TÉRMICA'),
    statusAprovacao: statusConsolidado,
    fatos: fatos,
    motivosReprovacao: a.motivosReprovacao || [],
    alertasAnalise: a.alertasAnalise || [],
    observacoesAnalise: a.observacoesAnalise || []
  };

  return {
    tipoCiclo: motor,
    normas: lvListarNormasAplicaveis_(motor),
    statusConsolidado: statusConsolidado,
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.local || payload.setor || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.local || payload.setor || '').trim(),
      equipamento: equipamentoLabel,
      tag: String(payload.tag || '').trim(),
      dtl: String(payload.certDataLogger || '').trim(),
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim(),
      dataDoEnsaio: lvExtrairDataDoTexto_(fatos.tempoInicioExposicao || a.tempoInicioCiclo || ''),
      tecnicoExecutor: String(payload.respTecnico || payload.operador || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

function lvExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

function lvLabelStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('ALERTA') !== -1) return 'APROVADO COM ALERTA';
  if (s === 'INFORMATIVO') return 'INFORMATIVO';
  return 'APROVADO';
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO (roda a IA, devolve pra revisão na tela)
// ------------------------------------------------------------
function apiGerarRascunhoCertificado(payload) {
  payload = payload || {};

  const contexto = lvMontarContextoCertificado_(payload);
  const textos = lvIACriarTextosCertificado_(contexto);

  return {
    ok: true,
    textos: textos,
    contexto: contexto
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: MONTAGEM FINAL (textos já revisados + fotos)
// ------------------------------------------------------------
function apiMontarCertificadoFinal(payload) {
  payload = payload || {};

  const contexto = lvMontarContextoCertificado_(payload);

  const textos = payload.textosCertificado || {};
  const fotos = Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado.slice(0, 4) : [];

  const template = HtmlService.createTemplateFromFile('Certificado');
  template.ctx = contexto;
  template.textos = {
    conclusaoGeral: String(textos.conclusaoGeral || '').trim(),
    conclusaoLeigo: String(textos.conclusaoLeigo || '').trim(),
    analisePorEstudo: textos.analisePorEstudo || {}
  };
  template.fotos = fotos.filter(function(f) { return f && f.base64; });
  template.geradoEm = Utilities.formatDate(new Date(), UCFG.TZ, 'dd/MM/yyyy');

  const html = template.evaluate().getContent();
  return { ok: true, html: html };
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO DO TEMPLATE (Certificado.html chama estas
// funções diretamente — mesmo projeto Apps Script, escopo global)
// ------------------------------------------------------------

function lvEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quebra texto corrido da IA em parágrafos <p> HTML seguros (escapados). */
function lvParagrafosHtml_(texto) {
  const partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>—</p>';
  return partes.map(function(p) { return '<p>' + lvEscaparHtml_(p) + '</p>'; }).join('');
}

function lvFmtValor_(v, sufixo) {
  if (v === null || v === undefined || v === '') return '—';
  return v + (sufixo || '');
}
