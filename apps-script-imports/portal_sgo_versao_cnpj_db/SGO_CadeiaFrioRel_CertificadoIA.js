/****************************************************
 * METROLABS — CADEIA DE FRIO — TEXTOS DO CERTIFICADO (IA)
 * Gera os textos narrativos do Certificado de Qualificação Térmica
 * (Introdução, Objetivo, Análise de cada ensaio, Conclusão Geral) a
 * partir dos números já calculados pelo Engine.js — nunca recalcula
 * nem inventa dado. Mesmo papel do SGO_IA.js do sistema principal
 * (mesmo padrão de configuração via Script Properties), mas isolado
 * neste projeto porque é um Apps Script standalone próprio.
 ****************************************************/

// Texto por estudo ficou bem mais longo (análise didática por posição/
// sensor, no mínimo 4 parágrafos quando há dados por sensor) — 8192 é o
// teto seguro de maxOutputTokens pro gemini-2.5-flash e variantes lite.
var CadeiaFrioRel_CFIA_TOKENS_CERTIFICADO = 8192;
var CadeiaFrioRel_CFIA_MODELO_PADRAO = 'gemini-2.5-flash';
var CadeiaFrioRel_CFIA_FALLBACKS_PADRAO = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
var CadeiaFrioRel_CFIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var CadeiaFrioRel_CFIA_MAX_TENTATIVAS = 3;
var CadeiaFrioRel_CFIA_DELAYS_MS = [800, 1600];

var CadeiaFrioRel_CFIA_REGRAS_BASE =
  'Você é um redator técnico especializado em certificados de qualificação térmica de equipamentos de conservação ' +
  '(farmácia, cadeia de frio, imunobiológicos), no padrão de laboratórios de metrologia e engenharia clínica.\n' +
  'REGRAS ABSOLUTAS — nunca violar:\n' +
  '1. Nunca invente número, data, valor, veredito ou resultado que não esteja explicitamente no contexto fornecido.\n' +
  '2. Preserve e cite corretamente todos os valores numéricos e fatos fornecidos (mínima, máxima, média, desvio-padrão, ' +
  'amplitude, tempos de ruptura/recuperação, vereditos de aprovação).\n' +
  '3. Não copie frases prontas de outro documento — escreva prosa original, extensa e fluida a partir dos fatos.\n' +
  '4. Não use markdown, negrito, itálico, listas ou títulos dentro dos textos — texto corrido, formal, em português brasileiro técnico.\n' +
  '5. Cada seção deve ser substancial (vários parágrafos quando fizer sentido) — não entregue resumos curtos.';

// Marcadores do protocolo de saída (substitui JSON): pedir texto longo e
// livre dentro de um JSON exige que a IA escape aspas/quebras de linha
// perfeitamente, o que ela faz mal em textos extensos — na prática gerava
// JSON inválido ("bad control character", "expected , or }") sempre que a
// prosa tinha uma quebra de parágrafo ou uma frase entre aspas. Marcadores
// de texto simples eliminam a necessidade de qualquer escape.
var CadeiaFrioRel_CFIA_MARC_INTRO = '###INTRODUCAO###';
var CadeiaFrioRel_CFIA_MARC_OBJETIVO = '###OBJETIVO###';
var CadeiaFrioRel_CFIA_MARC_ANALISE_PREFIXO = '###ANALISE:';
var CadeiaFrioRel_CFIA_MARC_CONCLUSAO = '###CONCLUSAO_GERAL###';
var CadeiaFrioRel_CFIA_MARC_FIM = '###FIM###';

function CadeiaFrioRel_cfIAObterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var provider = (props.getProperty('IA_PROVIDER') || 'GEMINI').toUpperCase().trim();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    provider: provider,
    model: model || CadeiaFrioRel_CFIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function CadeiaFrioRel_cfIAObterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(CadeiaFrioRel_CFIA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function CadeiaFrioRel_cfIAInterpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + '). Verifique as Propriedades do Script deste projeto.';
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function CadeiaFrioRel_cfIAERetentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function CadeiaFrioRel_cfIAChamarGemini_(prompt) {
  var cfg = CadeiaFrioRel_cfIAObterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('Chave GEMINI_API_KEY não configurada. Acesse o editor do Apps Script deste projeto (Cadeia de Frio) > Configurações do projeto > Propriedades do script, e crie GEMINI_API_KEY.');
  }

  var modelos = CadeiaFrioRel_cfIAObterListaModelos_(cfg);
  var ultimoErr = 'A IA está temporariamente indisponível. Tente novamente em alguns instantes.';

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    for (var tent = 0; tent < CadeiaFrioRel_CFIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(CadeiaFrioRel_CFIA_DELAYS_MS[tent - 1] || 1600);

      var url = CadeiaFrioRel_CFIA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: CadeiaFrioRel_CFIA_TOKENS_CERTIFICADO, temperature: 0.4 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var parts = cand && cand.content && cand.content.parts;
        var texto = parts && parts.map(function(p) { return p.text || ''; }).join('');
        if (!texto) throw new Error('A IA retornou resposta vazia. Tente novamente.');
        return String(texto).trim();
      }

      if (codigo === 401 || codigo === 403 || codigo === 429) throw new Error(CadeiaFrioRel_cfIAInterpretarErro_(codigo, corpo));
      if (codigo === 404) { ultimoErr = 'Modelo ' + modelo + ' não encontrado. Tentando próximo.'; break; }

      ultimoErr = CadeiaFrioRel_cfIAInterpretarErro_(codigo, corpo);
      if (!CadeiaFrioRel_cfIAERetentavel_(codigo)) break;
    }
  }

  throw new Error(ultimoErr);
}

/**
 * Monta a instrução de formato de saída (marcadores, um por linha) a
 * partir da lista de tipos de estudo incluídos neste laudo.
 */
function CadeiaFrioRel_cfIAMontarInstrucaoFormato_(tiposEstudo) {
  var linhas = [];
  linhas.push('Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta ' +
    'estrutura de marcadores, cada um sozinho em sua própria linha, nesta ordem:');
  linhas.push(CadeiaFrioRel_CFIA_MARC_INTRO);
  linhas.push('(texto da introdução aqui)');
  linhas.push(CadeiaFrioRel_CFIA_MARC_OBJETIVO);
  linhas.push('(texto do objetivo aqui)');
  tiposEstudo.forEach(function(t) {
    linhas.push(CadeiaFrioRel_CFIA_MARC_ANALISE_PREFIXO + t + '###');
    linhas.push('(texto da análise deste estudo aqui)');
  });
  linhas.push(CadeiaFrioRel_CFIA_MARC_CONCLUSAO);
  linhas.push('(texto da conclusão geral aqui)');
  linhas.push(CadeiaFrioRel_CFIA_MARC_FIM);
  linhas.push('O texto de cada seção pode ter várias linhas e parágrafos livremente, incluir aspas e pontuação ' +
    'sem nenhuma restrição — não precisa escapar nada, não use aspas triplas nem crases dentro do texto.');
  return linhas.join('\n');
}

/**
 * Extrai as seções da resposta em texto pelo protocolo de marcadores.
 * Lança erro claro (citando a seção específica) se algum marcador não
 * aparecer — sintoma normal de corte por limite de tokens.
 */
function CadeiaFrioRel_cfIAExtrairPorMarcadores_(texto, tiposEstudo) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadoresAnalise = tiposEstudo.map(function(t) { return CadeiaFrioRel_CFIA_MARC_ANALISE_PREFIXO + t + '###'; });
  var todosMarcadores = [CadeiaFrioRel_CFIA_MARC_INTRO, CadeiaFrioRel_CFIA_MARC_OBJETIVO]
    .concat(marcadoresAnalise, [CadeiaFrioRel_CFIA_MARC_CONCLUSAO, CadeiaFrioRel_CFIA_MARC_FIM]);

  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return null;
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    todosMarcadores.forEach(function(m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }

  var resultado = {
    introducao: acharBloco(CadeiaFrioRel_CFIA_MARC_INTRO),
    objetivo: acharBloco(CadeiaFrioRel_CFIA_MARC_OBJETIVO),
    analisePorEstudo: {},
    conclusaoGeral: acharBloco(CadeiaFrioRel_CFIA_MARC_CONCLUSAO)
  };

  var faltando = [];
  if (!resultado.introducao) faltando.push('introdução');
  if (!resultado.objetivo) faltando.push('objetivo');
  if (!resultado.conclusaoGeral) faltando.push('conclusão geral');

  tiposEstudo.forEach(function(t) {
    var v = acharBloco(CadeiaFrioRel_CFIA_MARC_ANALISE_PREFIXO + t + '###');
    resultado.analisePorEstudo[t] = v || '';
    if (!v) faltando.push('análise de ' + t);
  });

  if (faltando.length) {
    throw new Error('A IA não retornou todas as seções esperadas (faltando: ' + faltando.join(', ') +
      '). Provável corte por limite de tokens — tente gerar novamente.');
  }

  return resultado;
}

/**
 * Monta o "pacote de fatos" (contexto) que a IA pode usar — apenas
 * números/textos já calculados pelo Engine.js, nunca dado novo.
 */
function CadeiaFrioRel_cfIAMontarContextoCertificado_(dados) {
  var linhas = [];
  linhas.push('EQUIPAMENTO: ' + (dados.equipamentoLabel || '-'));
  linhas.push('TAG: ' + (dados.tag || '-'));
  linhas.push('CLIENTE: ' + (dados.cliente || '-'));
  linhas.push('SETOR/LOCALIZAÇÃO: ' + (dados.setor || '-'));
  linhas.push('FAIXA OPERACIONAL ACEITÁVEL: ' + dados.faixa.tMin + ' °C a ' + dados.faixa.tMax + ' °C (tolerância ' + dados.faixa.tolerancia + ' °C)');
  linhas.push('NORMAS APLICÁVEIS: ' + dados.normas.join(' | '));
  linhas.push('ESTUDOS INCLUÍDOS NESTE LAUDO: ' + dados.estudos.map(function(e) { return e.label; }).join(', '));
  linhas.push('');

  dados.estudos.forEach(function(e) {
    linhas.push('--- ESTUDO: ' + e.label + ' (tipo interno: ' + e.tipoEstudo + ') ---');
    linhas.push('Status de aprovação: ' + e.statusAprovacao);
    linhas.push('Fatos calculados: ' + JSON.stringify(e.fatos));
    if (e.motivosReprovacao && e.motivosReprovacao.length) linhas.push('Motivos de reprovação: ' + e.motivosReprovacao.join(' '));
    if (e.alertasAnalise && e.alertasAnalise.length) linhas.push('Alertas: ' + e.alertasAnalise.join(' '));
    if (e.observacoesAnalise && e.observacoesAnalise.length) linhas.push('Observações: ' + e.observacoesAnalise.join(' '));

    // Conformidade por posição/sensor, em formato legível (além do JSON
    // bruto acima) — é o dado central pra IA explicar POR POSIÇÃO, não só
    // no agregado. Cobre tanto excursão pra baixo (frio) quanto pra cima
    // (quente), sustentada ou pontual, cada sensor com seu próprio veredito.
    var cps = (e.fatos && e.fatos.conformidadePorSensor) || [];
    if (cps.length) {
      linhas.push('Conformidade detalhada por posição/sensor:');
      cps.forEach(function(c) {
        linhas.push(
          '  ' + c.sensor + ': status ' + c.statusSensor +
          ' | mínima ' + c.min + ' °C | máxima ' + c.max + ' °C | média ' + c.media + ' °C' +
          ' | pior desvio ABAIXO do piso da faixa: ' + c.piorDesvioAbaixo + ' °C' +
          ' | pior desvio ACIMA do teto da faixa: ' + c.piorDesvioAcima + ' °C' +
          ' | tempo fora da faixa: ' + c.percentualForaFaixa + '% do período (' + c.minutosForaFaixa + ' min)' +
          ' | primeira leitura fora da faixa: ' + (c.primeiraLeituraForaFaixaStr || 'nenhuma') +
          ' | terminou o período fora da faixa: ' + (c.terminouForaFaixa ? 'SIM' : 'NÃO')
        );
      });
    }
    linhas.push('');
  });

  linhas.push('VEREDITO CONSOLIDADO DO LAUDO: ' + dados.statusConsolidado);
  return linhas.join('\n');
}

/**
 * Gera os textos narrativos do Certificado num único chamada de IA
 * (garante coerência de tom entre as seções). Retorna um objeto pronto
 * pra exibir em campos editáveis na tela antes de confirmar.
 */
function CadeiaFrioRel_cfIACriarTextosCertificado_(dadosContexto) {
  var contextoStr = CadeiaFrioRel_cfIAMontarContextoCertificado_(dadosContexto);
  var tiposEstudo = dadosContexto.estudos.map(function(e) { return e.tipoEstudo; });

  var prompt =
    CadeiaFrioRel_CFIA_REGRAS_BASE + '\n\n' +
    'TAREFA: com base no contexto de um Certificado de Qualificação Térmica abaixo, escreva os textos narrativos ' +
    'do documento. A INTRODUÇÃO deve contextualizar, em 2 parágrafos extensos, a importância da qualificação térmica ' +
    'para segurança do paciente e conformidade regulatória (registro formal, sem citar números específicos deste ' +
    'ensaio ainda). O OBJETIVO deve declarar, em 1 a 2 parágrafos, o que este certificado especificamente verifica ' +
    'e documenta, citando equipamento/TAG/cliente/faixa reais.\n\n' +
    'Para CADA estudo, escreva uma ANÁLISE TÉCNICA EXTENSA E DIDÁTICA — o leitor pode ser um farmacêutico ou ' +
    'administrador sem formação técnica em refrigeração, então o texto precisa literalmente ENSINAR, não só relatar. ' +
    'Regras específicas desta seção:\n' +
    '1. Se o bloco "Conformidade detalhada por posição/sensor" estiver presente no contexto do estudo, dedique um ' +
    'parágrafo específico a CADA sensor/posição individualmente (não só ao agregado global) — cite o status, a ' +
    'direção do desvio (abaixo do piso = frio demais / acima do teto = quente demais), a magnitude, a duração/' +
    'percentual do tempo fora da faixa, e se terminou ou não fora da faixa ao fim do período.\n' +
    '2. Para cada posição não conforme, explique em linguagem acessível as causas técnicas PROVÁVEIS mais comuns ' +
    'para aquele padrão específico — sempre como hipótese/prática usual do setor, nunca como diagnóstico certo, ' +
    'já que não houve inspeção física direta do equipamento. Adapte a explicação ao padrão observado: um desvio ' +
    'FRIO DEMAIS e SUSTENTADO (a maior parte do tempo, terminando fora da faixa) sugere ponto frio por proximidade ' +
    'ao evaporador/serpentina, termostato regulado abaixo do necessário, ou fluxo de ar direto sobre o sensor; um ' +
    'desvio QUENTE DEMAIS e SUSTENTADO sugere vedação de porta comprometida, superlotação bloqueando circulação de ' +
    'ar, condensador sujo/obstruído, ou posição próxima a fonte de calor externa; um desvio PONTUAL/TRANSITÓRIO ' +
    '(pequeno percentual do tempo, não presente no fim do período) sugere ciclo normal de compressor, abertura de ' +
    'porta durante o ensaio, ou oscilação momentânea sem indicar falha estrutural do equipamento.\n' +
    '3. Traduza cada achado em orientação PRÁTICA E ACIONÁVEL: quais posições são seguras para armazenar produtos ' +
    'termolábeis e quais não são; se o padrão sugere ajuste simples (recalibração de termostato, reorganização de ' +
    'produtos, desobstrução de ventilação) versus necessidade de manutenção técnica mais profunda ou substituição ' +
    'do equipamento.\n' +
    '4. Se não houver dados de conformidade por sensor (ex.: estudo de evento sem essa quebra), escreva a análise ' +
    'de forma extensa e didática mesmo assim, interpretando os fatos agregados fornecidos.\n' +
    'Esta seção deve ter NO MÍNIMO 4 parágrafos substanciais quando houver dados por posição, e no mínimo 2 quando ' +
    'não houver — nunca um resumo curto.\n\n' +
    'A CONCLUSÃO GERAL deve amarrar todos os estudos incluídos num texto extenso e coeso, culminando no veredito ' +
    'consolidado, e resumindo (sem repetir todos os detalhes já ditos) quais posições do equipamento, se houver, ' +
    'são utilizáveis com segurança e quais não são.\n\n' +
    'CONTEXTO REAL DESTE ENSAIO (única fonte de fatos permitida):\n' + contextoStr + '\n\n' +
    CadeiaFrioRel_cfIAMontarInstrucaoFormato_(tiposEstudo);

  var respostaBruta = CadeiaFrioRel_cfIAChamarGemini_(prompt);
  var json;
  try {
    json = CadeiaFrioRel_cfIAExtrairPorMarcadores_(respostaBruta, tiposEstudo);
  } catch (e) {
    throw new Error('Falha ao gerar os textos do certificado: ' + e.message);
  }

  return json;
}
