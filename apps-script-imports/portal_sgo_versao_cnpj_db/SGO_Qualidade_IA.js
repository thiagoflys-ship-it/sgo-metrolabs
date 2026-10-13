/****************************************************
 * SGO_Qualidade_IA.js
 * RELATÓRIO DE GESTÃO DA QUALIDADE — INTERPRETAÇÃO POR IA
 *
 * Mesmo princípio de AuvoRelIA_gerarInterpretacao_ (SGO_Auvo_RelatorioIA.js):
 * números já vêm CALCULADOS — a IA só interpreta.
 *
 * Decisão do usuário (2026-08-28): nome de pessoa NUNCA vai pro prompt da
 * IA — só número agregado. Não é só uma instrução no prompt (a IA podia
 * ignorar) — é estrutural: o contexto monta aqui embaixo não tem nenhum
 * campo de nome, então fisicamente não tem como a IA citar alguém. Nome
 * de pessoa só aparece nas tabelas do HTML, montadas direto do dado, sem
 * passar pela IA.
 ****************************************************/
var QUALIDADEIA_TOKENS = 4096;
var QUALIDADEIA_MODELO_PADRAO = 'gemini-2.5-flash';
var QUALIDADEIA_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var QUALIDADEIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var QUALIDADEIA_MAX_TENTATIVAS = 3;
var QUALIDADEIA_DELAYS_MS = [800, 1600];

var QUALIDADEIA_REGRAS_BASE =
  'Você é um analista de qualidade, escrevendo a seção de interpretação de um relatório de gestão da qualidade ' +
  '(dados de atendimentos de campo via Auvo e uso de frota de veículos) pra diretoria de uma empresa de ' +
  'engenharia clínica (Metrolab\'s).\n' +
  'REGRAS ABSOLUTAS — nunca violar:\n' +
  '1. Todos os números do CONTEXTO abaixo já vêm CALCULADOS e CORRETOS — você NUNCA recalcula, arredonda, estima ' +
  'ou inventa um número diferente do que está no contexto. Cite-os exatamente como aparecem.\n' +
  '2. O contexto NUNCA traz nome de pessoa — não existe nome pra você citar. Fale só em termos agregados ' +
  '("a equipe", "parte dos atendimentos", "alguns condutores"), nunca tente adivinhar ou inventar quem é quem.\n' +
  '3. Não copie frases prontas — escreva prosa original, direta, em português brasileiro, tom executivo.\n' +
  '4. Não use markdown, negrito, itálico nem títulos dentro do texto — texto corrido.\n' +
  '5. Tom construtivo, nunca acusatório — números baixos são "pontos de atenção pra gestão acompanhar", não culpa.';

var QUALIDADEIA_MARC_RESUMO = '###RESUMO_EXECUTIVO###';
var QUALIDADEIA_MARC_ATENCAO = '###PONTOS_DE_ATENCAO###';
var QUALIDADEIA_MARC_FIM = '###FIM###';

function QualidadeIA_obterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    model: model || QUALIDADEIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function QualidadeIA_obterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(QUALIDADEIA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function QualidadeIA_interpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + ').';
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function QualidadeIA_retentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function QualidadeIA_montarInstrucaoFormato_() {
  return [
    'Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta estrutura de ' +
      'marcadores, cada um sozinho em sua própria linha, NESTA ORDEM:',
    QUALIDADEIA_MARC_RESUMO, '(texto desta seção aqui)',
    QUALIDADEIA_MARC_ATENCAO, '(texto desta seção aqui)',
    QUALIDADEIA_MARC_FIM
  ].join('\n');
}

function QualidadeIA_extrairPorMarcadores_(texto) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadores = [QUALIDADEIA_MARC_RESUMO, QUALIDADEIA_MARC_ATENCAO, QUALIDADEIA_MARC_FIM];
  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return null;
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    marcadores.forEach(function(m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }

  var resumo = acharBloco(QUALIDADEIA_MARC_RESUMO);
  var atencao = acharBloco(QUALIDADEIA_MARC_ATENCAO);
  if (!resumo || !atencao) {
    throw new Error('A IA não retornou todas as seções esperadas. Provável corte por limite de tokens — tente gerar novamente.');
  }
  return { resumoExecutivo: resumo, pontosDeAtencao: atencao };
}

/**
 * Gera o texto interpretativo do relatório de qualidade a partir dos
 * números JÁ agregados (Qualidade_montarContextoRelatorio_,
 * SGO_Qualidade_Relatorio.js) — sem nenhum nome de pessoa no contexto.
 */
function QualidadeIA_gerarInterpretacao_(ctx) {
  var cfg = QualidadeIA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('Chave GEMINI_API_KEY não configurada. Acesse Configurações do projeto > Propriedades do script, e crie GEMINI_API_KEY.');
  }

  var a = ctx.auvo || {}, f = ctx.frota || {};
  var linhas = [];
  linhas.push('PERÍODO DO RELATÓRIO: ' + ctx.periodoLabel);
  linhas.push('--- AUVO (atendimentos de campo) ---');
  linhas.push('Total de atendimentos: ' + (a.total || 0));
  linhas.push('% sem relato de serviço preenchido: ' + (a.pctSemRelato || 0) + '%');
  linhas.push('% sem nenhuma foto anexada: ' + (a.pctSemFoto || 0) + '%');
  linhas.push('% com questionário 100% vazio: ' + (a.pctQuestionarioVazio || 0) + '%');
  linhas.push('% sem check-in registrado: ' + (a.pctSemCheckin || 0) + '%');
  linhas.push('Finalizadas sem check-out: ' + (a.finalizadasSemCheckout || 0));
  linhas.push('Atendimentos sem cliente/técnico vinculado no Portal: ' + (a.semVinculo || 0));
  linhas.push('Quantidade de técnicos com qualidade de preenchimento perfeita (3+ atendimentos, sempre com relato e foto): ' + ((a.rankingDestaques || []).length));
  linhas.push('Quantidade de técnicos com pendência de preenchimento a acompanhar (3+ atendimentos, algum % de relato/foto faltando): ' + ((a.rankingPiorQualidade || []).length));
  linhas.push('--- FROTA (veículos e condutores) ---');
  linhas.push('Total de retiradas de veículo no período: ' + (f.totalMovimentacoes || 0));
  linhas.push('Retiradas em aberto há 2+ dias sem devolução: ' + (f.viagensPenduradas || 0));
  linhas.push('Retiradas/devoluções sem checklist ou sem foto: ' + (f.totalIncompletas || 0));
  linhas.push('Documentos de veículo vencidos: ' + (f.documentosVencidos || 0) + ' (vencendo em breve: ' + (f.documentosVencendo || 0) + ')');
  linhas.push('Multas em aberto: ' + (f.multasAbertas || 0) + ' (valor total: R$ ' + (f.valorMultasAbertas || 0).toFixed(2).replace('.', ',') + '), sem condutor vinculado: ' + (f.multasSemCondutor || 0));
  linhas.push('Consumo médio da frota: ' + (f.mediaFrotaConsumo ? f.mediaFrotaConsumo + ' km/L' : 'sem dado suficiente'));
  linhas.push('Veículos com consumo abaixo de 70% da média da frota: ' + ((f.consumoAbaixoDaMedia || []).length));
  linhas.push('--- AÇÕES DE GESTÃO NO PERÍODO ---');
  linhas.push('Ocorrências registradas (cobrança/elogio/observação): ' + (ctx.totalOcorrencias || 0) +
    ' (cobranças: ' + (ctx.qtdCobrancas || 0) + ', elogios: ' + (ctx.qtdElogios || 0) + ', observações: ' + (ctx.qtdObservacoes || 0) + ')');

  var prompt =
    QUALIDADEIA_REGRAS_BASE + '\n\n' +
    'TAREFA: escreva 2 seções curtas pra diretoria sobre a saúde geral da qualidade operacional no período — atendimentos de campo (Auvo) e uso de frota juntos.\n\n' +
    'RESUMO_EXECUTIVO (1-2 parágrafos): visão geral do padrão de qualidade no período (preenchimento de O.S., uso correto do processo de retirada/devolução de veículo) e se a gestão está agindo sobre os desvios (ocorrências registradas).\n\n' +
    'PONTOS_DE_ATENCAO (1 parágrafo, pode ser lista corrida): aponte objetivamente os números que merecem acompanhamento — sem citar ninguém, só o padrão. Se todos os indicadores estiverem saudáveis, diga isso claramente em vez de forçar um problema que não existe.\n\n' +
    'CONTEXTO REAL (única fonte de fatos, não tem nome de pessoa nenhum):\n' + linhas.join('\n') + '\n\n' +
    QualidadeIA_montarInstrucaoFormato_();

  var parts = [{ text: prompt }];
  var modelos = QualidadeIA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    for (var tent = 0; tent < QUALIDADEIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(QUALIDADEIA_DELAYS_MS[tent - 1] || 1600);

      var url = QUALIDADEIA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { maxOutputTokens: QUALIDADEIA_TOKENS, temperature: 0.3 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var respParts = cand && cand.content && cand.content.parts;
        var texto = respParts && respParts.map(function(p) { return p.text || ''; }).join('');
        if (!texto) throw new Error('A IA retornou resposta vazia. Tente novamente.');
        return QualidadeIA_extrairPorMarcadores_(texto);
      }

      if (codigo === 401 || codigo === 403) throw new Error(QualidadeIA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = QualidadeIA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = QualidadeIA_interpretarErro_(codigo, corpo);
      if (!QualidadeIA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao gerar a interpretação do relatório após tentar ' + modelos.length +
    ' modelo(s) — ' + errosPorModelo.join(' | '));
}
