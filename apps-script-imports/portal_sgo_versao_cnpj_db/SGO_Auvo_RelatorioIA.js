/****************************************************
 * SGO_Auvo_RelatorioIA.js
 * RELATÓRIO DE ATENDIMENTOS (AUVO) — INTERPRETAÇÃO POR IA
 *
 * Mesmo princípio de SGO_CertCal_IA.js: os números já vêm CALCULADOS e
 * corretos (agregados em SGO_Auvo_Relatorio.js a partir de AUVO_TAREFAS)
 * — a IA nunca soma/recalcula nada, só interpreta o que já está pronto
 * em texto de gestão ("saúde da empresa"), com os mesmos marcadores de
 * extração e o mesmo esquema de fallback/retry já usado em todo o
 * projeto.
 ****************************************************/
var AUVOREL_IA_TOKENS = 4096;
var AUVOREL_IA_MODELO_PADRAO = 'gemini-2.5-flash';
var AUVOREL_IA_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var AUVOREL_IA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var AUVOREL_IA_MAX_TENTATIVAS = 3;
var AUVOREL_IA_DELAYS_MS = [800, 1600];

var AUVOREL_IA_REGRAS_BASE =
  'Você é um analista de operações de campo, escrevendo a seção de interpretação de um relatório de atendimentos ' +
  '(dados vindos do Auvo, sistema de gestão de campo) pra diretoria de uma empresa de engenharia clínica ' +
  '(Metrolab\'s).\n' +
  'REGRAS ABSOLUTAS — nunca violar:\n' +
  '1. Todos os números do CONTEXTO abaixo já vêm CALCULADOS e CORRETOS — você NUNCA recalcula, arredonda, estima ' +
  'ou inventa um número diferente do que está no contexto. Cite-os exatamente como aparecem.\n' +
  '2. Não copie frases prontas — escreva prosa original, direta, em português brasileiro, tom executivo (é ' +
  'leitura de gestão, não documento técnico de engenharia).\n' +
  '3. Não use markdown, negrito, itálico nem títulos dentro do texto — texto corrido.\n' +
  '4. Nunca cite nome de técnico de forma negativa ou acusatória — se um número for baixo (pouco atendimento, ' +
  'muita O.S. sem relato de serviço), aponte o padrão como algo a acompanhar pela gestão, nunca como culpa ' +
  'individual de uma pessoa.';

var AUVOREL_IA_MARC_RESUMO = '###RESUMO_EXECUTIVO###';
var AUVOREL_IA_MARC_ATENCAO = '###PONTOS_DE_ATENCAO###';
var AUVOREL_IA_MARC_FIM = '###FIM###';

function AuvoRelIA_obterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    model: model || AUVOREL_IA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function AuvoRelIA_obterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(AUVOREL_IA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function AuvoRelIA_interpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + ').';
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function AuvoRelIA_retentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function AuvoRelIA_montarInstrucaoFormato_() {
  return [
    'Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta estrutura de ' +
      'marcadores, cada um sozinho em sua própria linha, NESTA ORDEM:',
    AUVOREL_IA_MARC_RESUMO, '(texto desta seção aqui)',
    AUVOREL_IA_MARC_ATENCAO, '(texto desta seção aqui)',
    AUVOREL_IA_MARC_FIM
  ].join('\n');
}

function AuvoRelIA_extrairPorMarcadores_(texto) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadores = [AUVOREL_IA_MARC_RESUMO, AUVOREL_IA_MARC_ATENCAO, AUVOREL_IA_MARC_FIM];
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

  var resumo = acharBloco(AUVOREL_IA_MARC_RESUMO);
  var atencao = acharBloco(AUVOREL_IA_MARC_ATENCAO);
  if (!resumo || !atencao) {
    throw new Error('A IA não retornou todas as seções esperadas. Provável corte por limite de tokens — tente gerar novamente.');
  }
  return { resumoExecutivo: resumo, pontosDeAtencao: atencao };
}

/**
 * Gera o texto interpretativo ("saúde da empresa") do relatório de
 * atendimentos, a partir dos números JÁ agregados por
 * Auvo_montarContextoRelatorio_ (SGO_Auvo_Relatorio.js). Lança erro de
 * verdade se falhar — o relatório sem essa seção não é o que o usuário
 * pediu.
 */
function AuvoRelIA_gerarInterpretacao_(contexto) {
  var cfg = AuvoRelIA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('Chave GEMINI_API_KEY não configurada. Acesse Configurações do projeto > Propriedades do script, e crie GEMINI_API_KEY.');
  }

  var linhas = [];
  linhas.push('PERÍODO DO RELATÓRIO: ' + contexto.periodoLabel);
  linhas.push('ESCOPO DE COLABORADORES: ' + contexto.escopoLabel);
  linhas.push('TOTAL DE ATENDIMENTOS: ' + contexto.total);
  linhas.push('ATENDIMENTOS ABERTOS (em andamento): ' + contexto.abertas);
  linhas.push('ATENDIMENTOS CONCLUÍDOS NO PERÍODO: ' + contexto.concluidas);
  linhas.push('% DE O.S. SEM RELATO DE SERVIÇO PREENCHIDO: ' + contexto.pctSemRelato + '%');
  linhas.push('QUANTIDADE DE O.S. FINALIZADAS SEM REGISTRO DE CHECKOUT: ' + contexto.finalizadasSemCheckout);
  linhas.push('RANKING DE TÉCNICOS POR VOLUME DE ATENDIMENTO (nome: quantidade):');
  contexto.rankingTecnicos.forEach(function(r) { linhas.push('- ' + r.nome + ': ' + r.qtd); });
  linhas.push('MÉDIA DE ATENDIMENTOS POR TÉCNICO NO PERÍODO: ' + contexto.mediaTecnico);
  linhas.push('DISTRIBUIÇÃO POR TIPO DE ATENDIMENTO (tipo: quantidade):');
  contexto.porTipo.forEach(function(t) { linhas.push('- ' + t.tipo + ': ' + t.qtd); });
  linhas.push('O.S. INCLUÍDAS NO RELATÓRIO: ' + contexto.tabela.map(function(t) { return t.osNumero; }).join(', '));

  var prompt =
    AUVOREL_IA_REGRAS_BASE + '\n\n' +
    'TAREFA: escreva 2 seções curtas pra diretoria sobre a saúde operacional dos atendimentos de campo no período.\n\n' +
    'RESUMO_EXECUTIVO (1-2 parágrafos): visão geral do volume de atendimento, se está proporcional/equilibrado ' +
    'entre a equipe, e o que os números indicam sobre o ritmo operacional no período.\n\n' +
    'PONTOS_DE_ATENCAO (1 parágrafo, pode ser lista corrida): aponte objetivamente os números que merecem ' +
    'acompanhamento da gestão — ex.: % alto de O.S. sem relato, atendimentos finalizados sem checkout, ' +
    'concentração de volume num só técnico. Se todos os indicadores estiverem saudáveis, diga isso claramente ' +
    'em vez de forçar um problema que não existe.\n\n' +
    'CONTEXTO REAL (única fonte de fatos):\n' + linhas.join('\n') + '\n\n' +
    AuvoRelIA_montarInstrucaoFormato_();

  var parts = [{ text: prompt }];
  var modelos = AuvoRelIA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    for (var tent = 0; tent < AUVOREL_IA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(AUVOREL_IA_DELAYS_MS[tent - 1] || 1600);

      var url = AUVOREL_IA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { maxOutputTokens: AUVOREL_IA_TOKENS, temperature: 0.3 }
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
        return AuvoRelIA_extrairPorMarcadores_(texto);
      }

      if (codigo === 401 || codigo === 403) throw new Error(AuvoRelIA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = AuvoRelIA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = AuvoRelIA_interpretarErro_(codigo, corpo);
      if (!AuvoRelIA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao gerar a interpretação do relatório após tentar ' + modelos.length +
    ' modelo(s) — ' + errosPorModelo.join(' | '));
}
