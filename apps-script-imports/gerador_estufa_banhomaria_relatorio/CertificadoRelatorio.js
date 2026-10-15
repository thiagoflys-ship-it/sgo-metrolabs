/****************************************************
 * METROLABS — ESTUFA+BANHO-MARIA — CERTIFICADO DE QUALIFICAÇÃO TÉRMICA
 * Segunda forma de relatório (além do laudo em Planilha/PDF já
 * existente): documento HTML A4, narrativo, com textos gerados por
 * IA a partir dos MESMOS números já calculados pelo Engine.js — nunca
 * recalcula nada por conta própria (usa ebExecutarAnaliseCompleta_,
 * compartilhado com apiConverter em Main.js).
 *
 * Fluxo em 2 etapas (o técnico revisa o texto da IA antes de fechar o
 * documento, já que ele vai direto pro cliente):
 * 1. apiGerarRascunhoCertificado — roda a análise + IA, devolve os
 *    textos narrativos em campos editáveis + os fatos fixos (tabelas/
 *    normas/estatísticas) pro preview na tela.
 * 2. apiMontarCertificadoFinal — recebe os textos (possivelmente
 *    editados) + as 4 fotos, monta o HTML final fixo e devolve pronto
 *    pra abrir em nova aba e imprimir (Ctrl+P).
 ****************************************************/

/**
 * Monta o "pacote de fatos" único, usado tanto pra alimentar a IA
 * (ebIACriarTextosCertificado_) quanto pra preencher as partes fixas
 * do template (identificação, normas, tabelas de estatística, veredito)
 * — uma só fonte de verdade pros dois usos, sem duplicar cálculo.
 */
function ebMontarContextoCertificado_(payload, resultado) {
  const perfilCfg = resultado.perfilCfg;
  const faixa = resultado.faixa;
  const analises = resultado.analises;
  const sensoresAtivos = resultado.sensoresAtivos;

  const estudos = analises.map(function(analise) {
    const tipo = String(analise.tipoEstudo || '').toUpperCase();
    const dadosFatia = analise._dadosFatia || [];
    const dadosParaEstatistica = ebSelecionarDadosParaEstatisticaCertificado_(analise, tipo, dadosFatia);
    const estatisticas = ebCalcularEstatisticasCertificado_(dadosParaEstatistica, sensoresAtivos);

    // Conformidade por posição/sensor (ver Engine.js ebAvaliarConformidadePorSensor_)
    // — a IA usa isso pra escrever a análise educativa por posição, não só
    // o veredito global do estudo.
    const fatos = { estatisticas: estatisticas, conformidadePorSensor: analise.conformidadePorSensor || [] };
    if (tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') {
      fatos.periodoInicio = analise.tempoInicio;
      fatos.periodoFim = analise.tempoFim;
      fatos.duracaoMinutos = analise.tempoTotalMinutos;
      fatos.piorSensor = analise.piorSensor;
      fatos.primeiraRupturaGlobal = analise.primeiraRupturaGlobal;
    } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
      fatos.inicioEvento = analise.tempoInicioEvento;
      fatos.fimEvento = analise.tempoFimEvento;
      fatos.rompeu = analise.rompeu;
      fatos.tempoAteRupturaMinutos = analise.tempoAteRupturaMinutos;
      fatos.recuperouTotalmente = analise.recuperouTotalmente;
      fatos.tempoAteRecuperacaoMinutos = analise.tempoAteRecuperacaoMinutos;
      fatos.tempoAlvoMinutos = analise.tempoAlvoMinutos;
    } else if (tipo === 'AUTONOMIA') {
      fatos.autonomiaMinutos = analise.autonomiaMinutos;
      fatos.rompeu = analise.rompeu;
    }

    return {
      tipoEstudo: tipo,
      label: ebLabelEstudo_(tipo),
      tituloSecao: ebTituloSecaoCertificado_(tipo, analise),
      statusAprovacao: analise.statusAprovacao || 'INFORMATIVO',
      fatos: fatos,
      motivosReprovacao: analise.motivosReprovacao || [],
      alertasAnalise: analise.alertasAnalise || [],
      observacoesAnalise: analise.observacoesAnalise || []
    };
  });

  const estudosDist = (payload.estudos && payload.estudos.distribuicao) || {};

  // Horário REAL do datalogger (do Engine.js, mesma fonte usada no resto
  // do certificado e no laudo) — não o horário digitado pelo técnico no
  // formulário (payload.estudos.*.inicio/inicioEvento), que só tem
  // precisão de minuto e por isso não bate com o segundo exato da
  // primeira leitura encontrada nos dados. Usado só na tabela
  // IDENTIFICAÇÃO; o resto do documento já usava a fonte certa.
  const analiseDistribuicao = analises.filter(function(a) {
    const t = String(a.tipoEstudo || '').toUpperCase();
    return t === 'DISTRIBUICAO_VAZIO' || t === 'DISTRIBUICAO_CARGA';
  })[0];
  const analisePorta = analises.filter(function(a) { return String(a.tipoEstudo || '').toUpperCase() === 'ABERTURA_PORTA'; })[0];
  const analiseEnergia = analises.filter(function(a) { return String(a.tipoEstudo || '').toUpperCase() === 'QUEDA_ENERGIA'; })[0];

  const inicioEnsaio24hReal = (analiseDistribuicao && analiseDistribuicao.tempoInicio) || estudosDist.inicio || '';
  const inicioEnsaioPortaReal = (analisePorta && analisePorta.tempoInicioEvento) ||
    (payload.estudos && payload.estudos.aberturaPorta && payload.estudos.aberturaPorta.inicioEvento) || '';
  const inicioEnsaioEnergiaReal = (analiseEnergia && analiseEnergia.tempoInicioEvento) ||
    (payload.estudos && payload.estudos.quedaEnergia && payload.estudos.quedaEnergia.inicioEvento) || '';

  const dataDoEnsaio = ebExtrairDataDoTexto_(inicioEnsaio24hReal) || ebExtrairDataDoTexto_(payload.simulacao && payload.simulacao.inicioEstudo) || '';

  return {
    perfilCfg: perfilCfg,
    faixa: faixa,
    normas: ebListarNormasAplicaveis_(payload.perfil),
    statusConsolidado: ebConsolidarStatus_(analises),
    equipamentoLabel: perfilCfg.label,
    tag: String(payload.tagEquipamento || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.localizacao || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.localizacao || '').trim(),
      equipamento: perfilCfg.label,
      tag: String(payload.tagEquipamento || '').trim(),
      dtl: String(payload.certDataLogger || '').trim(),
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim(),
      dataDoEnsaio: dataDoEnsaio,
      inicioEnsaio24h: inicioEnsaio24hReal,
      inicioEnsaioPorta: inicioEnsaioPortaReal,
      inicioEnsaioEnergia: inicioEnsaioEnergiaReal,
      tecnicoExecutor: String(payload.responsavelTecnico || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: EBCFG.EMPRESA_EXECUTANTE
    },
    estudos: estudos
  };
}

/**
 * Escolhe o recorte de dados correto pras estatísticas GLOBAIS do
 * certificado, replicando os mesmos recortes que o Engine.js já usa pra
 * aprovação/reprovação e que o Laudo (Planilha.js) já usa nas próprias
 * tabelas. Sem isso, a caixa de estatísticas do certificado (MÍNIMA/
 * MÁXIMA/MÉDIA/MEDIANA/DESVIO-PADRÃO/AMPLITUDE) incluía a rampa de
 * estabilização inteira (Distribuição) ou a margem de contexto de 60 min
 * ANTES do evento (Abertura de Porta/Queda de Energia — ver
 * EBCFG.MARGEM_CONTEXTO_EVENTO_MINUTOS em Config.js), gerando números
 * que não batiam nem com o resto do próprio certificado (tabelas por
 * sensor) nem com o laudo.
 */
function ebSelecionarDadosParaEstatisticaCertificado_(analise, tipo, dadosFatia) {
  if ((tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') && analise._dadosDesdeInicioEvento) {
    return analise._dadosDesdeInicioEvento;
  }
  if ((tipo === 'DISTRIBUICAO_VAZIO' || tipo === 'DISTRIBUICAO_CARGA') && analise.rampaEstabilizacao) {
    const idxFimRampa = dadosFatia.findIndex(function(row) {
      return row.tempoStr === analise.rampaEstabilizacao.fimRampaStr;
    });
    if (idxFimRampa > 0) return dadosFatia.slice(idxFimRampa);
  }
  return dadosFatia;
}

/**
 * Estatística GLOBAL (todos os sensores ativos juntos, não por sensor)
 * de um recorte de dados — mín/máx/média/mediana/desvio-padrão/
 * amplitude, exatamente os 6 indicadores mostrados no certificado-
 * modelo. Cálculo isolado aqui (não mexe no Engine.js) porque é uma
 * agregação de apresentação nova, específica deste documento.
 */
function ebCalcularEstatisticasCertificado_(dadosFatia, sensoresAtivos) {
  if (!Array.isArray(dadosFatia) || !dadosFatia.length) return null;

  const nSensores = Array.isArray(dadosFatia[0].temperaturas) ? dadosFatia[0].temperaturas.length : 0;
  if (!nSensores) return null;

  const ativos = Array.isArray(sensoresAtivos) && sensoresAtivos.length
    ? sensoresAtivos
    : Array.from({ length: nSensores }, function() { return true; });

  const valores = [];
  dadosFatia.forEach(function(row) {
    const temps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;
      const t = ebParseNumero_(temps[s]);
      if (t !== null && isFinite(t)) valores.push(t);
    }
  });

  if (!valores.length) return null;

  valores.sort(function(a, b) { return a - b; });
  const n = valores.length;
  const soma = valores.reduce(function(a, b) { return a + b; }, 0);
  const media = soma / n;
  const mediana = (n % 2 === 0) ? (valores[n / 2 - 1] + valores[n / 2]) / 2 : valores[(n - 1) / 2];
  const variancia = valores.reduce(function(acc, v) { return acc + Math.pow(v - media, 2); }, 0) / n;
  const min = valores[0];
  const max = valores[n - 1];

  return {
    min: ebRound_(min, 2),
    max: ebRound_(max, 2),
    media: ebRound_(media, 2),
    mediana: ebRound_(mediana, 2),
    desvioPadrao: ebRound_(Math.sqrt(variancia), 2),
    amplitude: ebRound_(max - min, 2)
  };
}

function ebTituloSecaoCertificado_(tipo, analise) {
  const mapa = {
    DISTRIBUICAO_VAZIO: 'ENSAIO DE DISTRIBUIÇÃO EM VAZIO',
    DISTRIBUICAO_CARGA: 'ENSAIO DE DISTRIBUIÇÃO COM CARGA',
    ABERTURA_PORTA: 'ENSAIO DE ABERTURA DE PORTA',
    QUEDA_ENERGIA: 'ENSAIO DE QUEDA DE ENERGIA',
    AUTONOMIA: 'ENSAIO DE AUTONOMIA'
  };
  return mapa[tipo] || ebLabelEstudo_(tipo).toUpperCase();
}

/**
 * Extrai só a parte de data (sem hora) de um campo de "Início do
 * estudo" digitado pelo técnico, aceitando tanto BR (dd/mm/yyyy) quanto
 * ISO (yyyy-mm-dd), já que o datalogger individual usa ISO (ver 13ª
 * rodada) e o técnico tende a digitar no mesmo estilo do arquivo.
 * Sempre devolve em dd/mm/yyyy, consistente com o resto da tabela de
 * identificação do certificado.
 */
function ebExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO (roda a IA, devolve pra revisão na tela)
// ------------------------------------------------------------
function apiGerarRascunhoCertificado(payload) {
  payload = payload || {};

  const resultado = ebExecutarAnaliseCompleta_(payload);
  const contexto = ebMontarContextoCertificado_(payload, resultado);
  const textos = ebIACriarTextosCertificado_(contexto);

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

  const resultado = ebExecutarAnaliseCompleta_(payload);
  const contexto = ebMontarContextoCertificado_(payload, resultado);

  const textos = payload.textosCertificado || {};
  const fotos = Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado.slice(0, 4) : [];

  const template = HtmlService.createTemplateFromFile('Certificado');
  template.ctx = contexto;
  template.textos = {
    introducao: String(textos.introducao || '').trim(),
    objetivo: String(textos.objetivo || '').trim(),
    conclusaoGeral: String(textos.conclusaoGeral || '').trim(),
    analisePorEstudo: textos.analisePorEstudo || {}
  };
  template.fotos = fotos.filter(function(f) { return f && f.base64; });
  template.geradoEm = Utilities.formatDate(new Date(), EBCFG.TZ, 'dd/MM/yyyy');

  const html = template.evaluate().getContent();
  return { ok: true, html: html };
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO DO TEMPLATE (Certificado.html chama estas
// funções diretamente — mesmo projeto Apps Script, escopo global)
// ------------------------------------------------------------

function ebEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quebra texto corrido da IA em parágrafos <p> HTML seguros (escapados). */
function ebParagrafosHtml_(texto) {
  const partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>—</p>';
  return partes.map(function(p) { return '<p>' + ebEscaparHtml_(p) + '</p>'; }).join('');
}

function ebFmtValor_(v, sufixo) {
  if (v === null || v === undefined || v === '') return '—';
  return v + (sufixo || '');
}
