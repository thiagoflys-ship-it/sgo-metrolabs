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
function EstufaBanhoRel_ebMontarContextoCertificado_(payload, resultado) {
  const perfilCfg = resultado.perfilCfg;
  const faixa = resultado.faixa;
  const analises = resultado.analises;
  const sensoresAtivos = resultado.sensoresAtivos;
  const estudos = analises.map(function (analise) {
    const tipo = String(analise.tipoEstudo || '').toUpperCase();
    const dadosFatia = analise._dadosFatia || [];
    const dadosParaEstatistica = EstufaBanhoRel_ebSelecionarDadosParaEstatisticaCertificado_(analise, tipo, dadosFatia);
    const estatisticas = EstufaBanhoRel_ebCalcularEstatisticasCertificado_(dadosParaEstatistica, sensoresAtivos);

    // Conformidade por posição/sensor (ver Engine.js ebAvaliarConformidadePorSensor_)
    // — a IA usa isso pra escrever a análise educativa por posição, não só
    // o veredito global do estudo.
    const fatos = {
      estatisticas: estatisticas,
      conformidadePorSensor: analise.conformidadePorSensor || []
    };
    if (analise.repeticoes) {
      fatos.periodoInicio=analise.tempoInicio; fatos.periodoFim=analise.tempoFim;
      fatos.repeticoes=analise.repeticoes.map(function(r){return {
        numero:r.numeroRepeticao, inicio:r.tempoInicio, fim:r.tempoFim,
        duracaoMinutos:r.tempoTotalMinutos, status:r.statusAprovacao,
        estatisticas:r.statsGlobal, conformidadePorSensor:r.conformidadePorSensor||[],
        valorLabel:r.valorLabel||'', minimoExigido:r.valorMinimoExigido,
        minimoObtido:r.minLetalidade, piorSensor:r.piorSensor,
        letalidadePorSensor:r.letalidadePorSensor, indicador:r.indicadorResultado,
        motivos:r.motivosReprovacao||[], alertas:r.alertasAnalise||[]
      };});
    }
    if (EstufaBanhoRel_ebEhDistribuicao_(tipo)) {
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
      label: EstufaBanhoRel_ebLabelEstudo_(tipo),
      tituloSecao: EstufaBanhoRel_ebTituloSecaoCertificado_(tipo, analise),
      statusAprovacao: analise.statusAprovacao || 'INFORMATIVO',
      fatos: fatos,
      motivosReprovacao: analise.motivosReprovacao || [],
      alertasAnalise: analise.alertasAnalise || [],
      observacoesAnalise: analise.observacoesAnalise || []
    };
  });
  const estudosDist = payload.estudos && payload.estudos.distribuicao || {};

  // Horário REAL do datalogger (do Engine, mesma fonte usada no resto do
  // certificado e no laudo) — não o horário digitado pelo técnico no
  // formulário, que só tem precisão de minuto. Usado só na tabela
  // IDENTIFICAÇÃO; o resto do documento já usava a fonte certa.
  const analiseDistribuicao = analises.filter(function(a) {
    const t = String(a.tipoEstudo || '').toUpperCase();
    return EstufaBanhoRel_ebEhDistribuicao_(t) || t==='DISTRIBUICAO_VAZIO_E' || t==='PENETRACAO_CARGA_E';
  })[0];
  const analisePorta = analises.filter(function(a) { return String(a.tipoEstudo || '').toUpperCase() === 'ABERTURA_PORTA'; })[0];
  const analiseEnergia = analises.filter(function(a) { return String(a.tipoEstudo || '').toUpperCase() === 'QUEDA_ENERGIA'; })[0];

  const inicioEnsaio24hReal = (analiseDistribuicao && analiseDistribuicao.tempoInicio) || estudosDist.inicio || '';
  const inicioEnsaioPortaReal = (analisePorta && analisePorta.tempoInicioEvento) ||
    (payload.estudos && payload.estudos.aberturaPorta && payload.estudos.aberturaPorta.inicioEvento) || '';
  const inicioEnsaioEnergiaReal = (analiseEnergia && analiseEnergia.tempoInicioEvento) ||
    (payload.estudos && payload.estudos.quedaEnergia && payload.estudos.quedaEnergia.inicioEvento) || '';

  const dataDoEnsaio = EstufaBanhoRel_ebExtrairDataDoTexto_(inicioEnsaio24hReal) || EstufaBanhoRel_ebExtrairDataDoTexto_(payload.simulacao && payload.simulacao.inicioEstudo) || '';
  return {
    origemDados: payload.modoRelatorioSimulado ? 'SIMULADO — RELATÓRIO INTERNO' : 'DADOS INFORMADOS PARA O ENSAIO',
    simulado: !!payload.modoRelatorioSimulado,
    assinaturaDados: EstufaBanhoRel_ebAssinaturaContexto_({dados:resultado.dadosCompletos.map(function(r){return [r.tempoDate.getTime()].concat(r.temperaturas.filter(function(t,i){return sensoresAtivos[i];}));}),estudos:payload.estudos||{},faixa:faixa,sensoresAtivos:sensoresAtivos}),
    sensoresUtilizados: EstufaBanhoRel_ebResumoSensores_(sensoresAtivos),
    registradores: SGO_DocA4_registradores_(String(payload.certDataLogger || '').trim(), dataDoEnsaio),
    perfilChave: payload.perfil,
    perfilCfg: perfilCfg,
    faixa: faixa,
    normas: EstufaBanhoRel_ebListarNormasAplicaveis_(payload.perfil),
    statusConsolidado: EstufaBanhoRel_ebConsolidarStatus_(analises),
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
      cnpj: String(payload.cnpj || '').trim(),
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim(),
      dataDoEnsaio: dataDoEnsaio,
      inicioEnsaio24h: inicioEnsaio24hReal,
      inicioEnsaioPorta: inicioEnsaioPortaReal,
      inicioEnsaioEnergia: inicioEnsaioEnergiaReal,
      tecnicoExecutor: String(payload.responsavelTecnico || '').trim(),
      marca: String(payload.marca || '').trim(),
      modelo: String(payload.modelo || '').trim(),
      numeroSerie: String(payload.numeroSerie || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: EstufaBanhoRel_EBCFG.EMPRESA_EXECUTANTE
    },
    estudos: estudos
  };
}

/**
 * Estatística GLOBAL (todos os sensores ativos juntos, não por sensor)
 * de um recorte de dados — mín/máx/média/mediana/desvio-padrão/
 * amplitude, exatamente os 6 indicadores mostrados no certificado-
 * modelo. Cálculo isolado aqui (não mexe no Engine.js) porque é uma
 * agregação de apresentação nova, específica deste documento.
 */
function EstufaBanhoRel_ebSelecionarDadosParaEstatisticaCertificado_(analise, tipo, dadosFatia) {
  if ((tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') && analise._dadosDesdeInicioEvento) {
    return analise._dadosDesdeInicioEvento;
  }
  if ((EstufaBanhoRel_ebEhDistribuicao_(tipo)) && analise.rampaEstabilizacao) {
    const idxFimRampa = dadosFatia.findIndex(function(row) {
      return row.tempoStr === analise.rampaEstabilizacao.fimRampaStr;
    });
    if (idxFimRampa > 0) return dadosFatia.slice(idxFimRampa);
  }
  return dadosFatia;
}

function EstufaBanhoRel_ebCalcularEstatisticasCertificado_(dadosFatia, sensoresAtivos) {
  if (!Array.isArray(dadosFatia) || !dadosFatia.length) return null;
  const nSensores = Array.isArray(dadosFatia[0].temperaturas) ? dadosFatia[0].temperaturas.length : 0;
  if (!nSensores) return null;
  const ativos = Array.isArray(sensoresAtivos) && sensoresAtivos.length ? sensoresAtivos : Array.from({
    length: nSensores
  }, function () {
    return true;
  });
  const valores = [];
  dadosFatia.forEach(function (row) {
    const temps = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;
      const t = EstufaBanhoRel_ebParseNumero_(temps[s]);
      if (t !== null && isFinite(t)) valores.push(t);
    }
  });
  if (!valores.length) return null;
  valores.sort(function (a, b) {
    return a - b;
  });
  const n = valores.length;
  const soma = valores.reduce(function (a, b) {
    return a + b;
  }, 0);
  const media = soma / n;
  const mediana = n % 2 === 0 ? (valores[n / 2 - 1] + valores[n / 2]) / 2 : valores[(n - 1) / 2];
  const variancia = valores.reduce(function (acc, v) {
    return acc + Math.pow(v - media, 2);
  }, 0) / n;
  const min = valores[0];
  const max = valores[n - 1];
  return {
    min: EstufaBanhoRel_ebRound_(min, 2),
    max: EstufaBanhoRel_ebRound_(max, 2),
    media: EstufaBanhoRel_ebRound_(media, 2),
    mediana: EstufaBanhoRel_ebRound_(mediana, 2),
    desvioPadrao: EstufaBanhoRel_ebRound_(Math.sqrt(variancia), 2),
    amplitude: EstufaBanhoRel_ebRound_(max - min, 2)
  };
}
function EstufaBanhoRel_ebTituloSecaoCertificado_(tipo, analise) {
  const mapa = {
    DISTRIBUICAO_VAZIO: 'ENSAIO DE DISTRIBUIÇÃO EM VAZIO',
    DISTRIBUICAO_CARGA: 'ENSAIO DE DISTRIBUIÇÃO COM CARGA',
    ABERTURA_PORTA: 'ENSAIO DE ABERTURA DE PORTA',
    QUEDA_ENERGIA: 'ENSAIO DE QUEDA DE ENERGIA',
    AUTONOMIA: 'ENSAIO DE AUTONOMIA'
  };
  return mapa[tipo] || EstufaBanhoRel_ebLabelEstudo_(tipo).toUpperCase();
}

/**
 * Extrai só a parte de data (sem hora) de um campo de "Início do
 * estudo" digitado pelo técnico, aceitando tanto BR (dd/mm/yyyy) quanto
 * ISO (yyyy-mm-dd), já que o datalogger individual usa ISO (ver 13ª
 * rodada) e o técnico tende a digitar no mesmo estilo do arquivo.
 * Sempre devolve em dd/mm/yyyy, consistente com o resto da tabela de
 * identificação do certificado.
 */
function EstufaBanhoRel_ebExtrairDataDoTexto_(texto) {
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
function EstufaBanhoRel_apiGerarRascunhoCertificado(payload) {
  payload = payload || {};
  const resultado = EstufaBanhoRel_ebExecutarAnaliseCompleta_(payload);
  const contexto = EstufaBanhoRel_ebMontarContextoCertificado_(payload, resultado);
  const ia = SGO_DocSalvar_textosIaOuManual_(EstufaBanhoRel_ebIACriarTextosCertificado_, contexto);
  return {
    ok: true,
    textos: ia.textos,
    avisoIA: ia.avisoIA,
    contexto: contexto,
    assinaturaContexto: EstufaBanhoRel_ebAssinaturaContexto_(contexto)
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: MONTAGEM FINAL (textos já revisados + fotos)
// ------------------------------------------------------------
function EstufaBanhoRel_apiMontarCertificadoFinal(payload) {
  payload = payload || {};
  const resultado = EstufaBanhoRel_ebExecutarAnaliseCompleta_(payload);
  const contexto = EstufaBanhoRel_ebMontarContextoCertificado_(payload, resultado);
  if(payload.assinaturaContexto!==EstufaBanhoRel_ebAssinaturaContexto_(contexto))throw new Error('Os dados ou a seleção mudaram. Gere novamente a interpretação antes de emitir.');
  const textos = payload.textosCertificado || {};
  if(!String(textos.introducao||'').trim()||!String(textos.objetivo||'').trim()||!String(textos.conclusaoGeral||'').trim()||contexto.estudos.some(function(e){return !String((textos.analisePorEstudo||{})[e.tipoEstudo]||'').trim();}))throw new Error('Complete e revise introdução, objetivo, análise de cada estudo e conclusão antes de montar o relatório final.');
  const fotos = Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado.slice(0, 4) : [];
  fotos.forEach(function(f){if(f&&f.base64&&(!/^image\/(jpeg|png|webp)$/.test(String(f.mimeType||'image/jpeg'))||!/^[A-Za-z0-9+/]+={0,2}$/.test(String(f.base64))))throw new Error('Foto inválida. Use imagem JPEG, PNG ou WebP.');});
  const template = HtmlService.createTemplateFromFile('EstufaBanhoCertificado');
  template.ctx = contexto;
  template.textos = {
    introducao: String(textos.introducao || '').trim(),
    objetivo: String(textos.objetivo || '').trim(),
    conclusaoGeral: String(textos.conclusaoGeral || '').trim(),
    analisePorEstudo: textos.analisePorEstudo || {}
  };
  template.fotos = fotos.filter(function (f) {
    return f && f.base64;
  });
  template.geradoEm = Utilities.formatDate(new Date(), EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy');
  // Gráficos por estudo (mesmo recorte de dados usado na análise) e assinaturas.
  const graficos = {};
  (resultado.analises || []).forEach(function(a) {
    try { const g = SGO_DocA4_graficoEstudoFaixa_(a._dadosFatia || [], resultado.sensoresAtivos, resultado.faixa, EstufaBanhoRel_EBCFG.TZ); if (g) graficos[String(a.tipoEstudo || '').toUpperCase()] = g; } catch (e) {}
  });
  template.graficos = graficos;
  template.intervaloLeiturasSegundos = (resultado.analises && resultado.analises[0] && resultado.analises[0].intervaloMedioMinutos) ? Math.round(resultado.analises[0].intervaloMedioMinutos * 60) : null;
  template.assinaturas = [].concat(contexto.identificacao.tecnicoExecutor ? [{ nome: contexto.identificacao.tecnicoExecutor, cargo: 'Técnico executor do ensaio' }] : [], EstufaBanhoRel_EBCFG.ASSINATURAS_PADRAO || []);

  const html = template.evaluate().getContent();
  // Regra do dono: HTML A4 + PDF salvos na pasta do cliente (subpasta por CNPJ
  // dentro da pasta de laudos). Falha ao salvar não impede a entrega na tela.
  return SGO_DocSalvar_finalizarCertificado_(html, payload, function () {
    const id = EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID && String(EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID).length > 10 ? String(EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID).trim() : '';
    return id ? DriveApp.getFolderById(id) : EstufaBanhoRel_ebObterPastaPersistente_('LAUDOS_FOLDER_ID', 'Estufa+Banho-maria - Laudos');
  }, 'Certificado de qualificação térmica Estufa-Banho-maria', EstufaBanhoRel_EBCFG.TZ);
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO DO TEMPLATE (Certificado.html chama estas
// funções diretamente — mesmo projeto Apps Script, escopo global)
// ------------------------------------------------------------

function EstufaBanhoRel_ebEscaparHtml_(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Quebra texto corrido da IA em parágrafos <p> HTML seguros (escapados). */
function EstufaBanhoRel_ebParagrafosHtml_(texto) {
  const partes = String(texto || '').split(/\n{2,}/).map(function (p) {
    return p.trim();
  }).filter(Boolean);
  if (!partes.length) return '<p>—</p>';
  return partes.map(function (p) {
    return '<p>' + EstufaBanhoRel_ebEscaparHtml_(p) + '</p>';
  }).join('');
}
function EstufaBanhoRel_ebFmtValor_(v, sufixo) {
  if (v === null || v === undefined || v === '') return '—';
  // pt-BR: vírgula decimal, ponto de milhar, 2 casas fixas, espaço inseparável antes da unidade.
  const suf = String(sufixo || '').replace(/^\s+/, '');
  const n = typeof v === 'number' ? v : (/^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? Number(v) : NaN);
  const txt = isFinite(n) ? SGO_DocSalvar_num_(n, 2) : String(v);
  return txt + (suf ? '\u00a0' + suf : '');
}
