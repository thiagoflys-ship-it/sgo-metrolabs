/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO MENSAL, INTERPRETAÇÃO POR IA
 *
 * Mesmo princípio de QualidadeIA_gerarInterpretacao_ (SGO_Qualidade_
 * IA.js, mesma casa): números já vêm CALCULADOS — a IA só interpreta,
 * e o contexto mandado pra ela NUNCA tem nome de colaborador — é
 * estrutural (o objeto ctx não carrega esse campo), não só uma
 * instrução de prompt que a IA poderia ignorar.
 *
 * Só 2 dos 8 blocos fixos da seção 8 do briefing viram texto de IA
 * (narrativa e recomendação) — os outros 6 (cabeçalho, composição do
 * demérito, top 5 códigos, comparativo de 6 meses, missões,
 * contestações) são tabelas/números montados direto do ctx em
 * SGO_Conduta_Relatorio.js, sem passar pela IA — mesma separação já
 * usada no relatório de Qualidade.
 ****************************************************/
var CONDUTAIA_TOKENS = 4096;
var CONDUTAIA_MODELO_PADRAO = 'gemini-2.5-flash';
var CONDUTAIA_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var CONDUTAIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var CONDUTAIA_MAX_TENTATIVAS = 3;
var CONDUTAIA_DELAYS_MS = [800, 1600];

var CONDUTAIA_REGRAS_BASE =
  'Você escreve a interpretação do relatório mensal do Programa de Conduta, Pontuação e Bonificação da Metrolab\'s ' +
  '(programa interno que define um Bônus Coletivo mensal — pago só se o farol fechar VERDE — e um Incentivo de ' +
  'Missão por deslocamento longo, independente do farol).\n' +
  'REGRAS ABSOLUTAS — nunca violar:\n' +
  '1. Todos os números do CONTEXTO abaixo já vêm CALCULADOS e CORRETOS — você NUNCA recalcula, arredonda, estima, ' +
  'contesta ou questiona o ICO ou o farol. Cite-os exatamente como aparecem.\n' +
  '2. O contexto NUNCA traz nome de pessoa — não existe nome pra você citar. Fale só em termos agregados ' +
  '("a equipe", "parte da equipe"), nunca tente adivinhar ou inventar quem é quem.\n' +
  '3. Nunca infira intenção de ninguém, nunca sugira medida disciplinar (advertência, desconto, demissão etc.) — ' +
  'isso não é decisão sua.\n' +
  '4. Nunca invente nenhum dado fora do CONTEXTO — se uma informação não está lá, não existe pra você.\n' +
  '5. Não copie frases prontas — escreva prosa original, direta, em português brasileiro, tom executivo e ' +
  'construtivo, nunca acusatório.\n' +
  '6. Não use markdown, negrito, itálico nem títulos dentro do texto — texto corrido.';

var CONDUTAIA_MARC_NARRATIVA = '###NARRATIVA###';
var CONDUTAIA_MARC_RECOMENDACAO = '###RECOMENDACAO###';
var CONDUTAIA_MARC_FIM = '###FIM###';

function CondutaIA_obterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    model: model || CONDUTAIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function CondutaIA_obterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function (m) { return m.trim(); }).filter(Boolean)
    : [].concat(CONDUTAIA_FALLBACKS_PADRAO);
  fb.forEach(function (m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function CondutaIA_interpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + ').';
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function CondutaIA_retentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function CondutaIA_montarInstrucaoFormato_() {
  return [
    'Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta estrutura de ' +
      'marcadores, cada um sozinho em sua própria linha, NESTA ORDEM:',
    CONDUTAIA_MARC_NARRATIVA, '(texto desta seção aqui)',
    CONDUTAIA_MARC_RECOMENDACAO, '(texto desta seção aqui)',
    CONDUTAIA_MARC_FIM
  ].join('\n');
}

function CondutaIA_extrairPorMarcadores_(texto) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadores = [CONDUTAIA_MARC_NARRATIVA, CONDUTAIA_MARC_RECOMENDACAO, CONDUTAIA_MARC_FIM];
  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return null;
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    marcadores.forEach(function (m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }

  var narrativa = acharBloco(CONDUTAIA_MARC_NARRATIVA);
  var recomendacao = acharBloco(CONDUTAIA_MARC_RECOMENDACAO);
  if (!narrativa || !recomendacao) {
    throw new Error('A IA não retornou todas as seções esperadas. Provável corte por limite de tokens — tente gerar novamente.');
  }
  return { narrativa: narrativa, recomendacao: recomendacao };
}

/**
 * Gera narrativa + recomendação a partir do contexto JÁ agregado
 * (Conduta_montarContextoRelatorio_, SGO_Conduta_Relatorio.js) — sem
 * nenhum nome de pessoa no contexto.
 */
function CondutaIA_gerarInterpretacao_(ctx) {
  var cfg = CondutaIA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('Chave GEMINI_API_KEY não configurada. Acesse Configurações do projeto > Propriedades do script, e crie GEMINI_API_KEY.');
  }

  var linhas = [];
  linhas.push('COMPETÊNCIA: ' + ctx.competencia + (ctx.sombra ? ' (modo sombra — apura mas não paga ainda)' : ''));
  linhas.push('FAROL DO MÊS: ' + ctx.farol + ' (ICO ' + ctx.ico + ')');
  linhas.push('Infração(ões) gravíssima(s) no mês: ' + (ctx.temGG ? 'sim' : 'não'));
  linhas.push('Demérito total (D): ' + ctx.D + ' | Divisor (n, exclui ausentes): ' + ctx.n);
  linhas.push('ICO do mês anterior: ' + (ctx.icoMesAnterior === null ? 'sem dado' : ctx.icoMesAnterior));
  linhas.push('--- COMPOSIÇÃO DO DEMÉRITO POR GRUPO ---');
  (ctx.composicaoPorGrupo || []).forEach(function (g) {
    linhas.push(g.grupo + ': ' + g.somaPeso + ' pontos (' + g.qtdOcorrencias + ' ocorrência(s))');
  });
  linhas.push('--- TOP 5 CÓDIGOS DO MÊS ---');
  (ctx.top5Codigos || []).forEach(function (c) {
    linhas.push(c.codigo + ' (' + c.descricao + '): ' + c.qtdOcorrencias + ' ocorrência(s), ' + c.somaPeso + ' pontos');
  });
  linhas.push('--- MISSÕES ---');
  linhas.push('Missões qualificadas (>=200km) no mês: ' + (ctx.missoes.qtdQualificadas || 0));
  linhas.push('Incentivo de missão ' + (ctx.sombra ? 'simulado' : 'devido') + ' no mês: R$ ' + (ctx.missoes.valorTotal || 0).toFixed(2).replace('.', ','));
  linhas.push('--- CONTESTAÇÕES ---');
  linhas.push('Contestações no mês: ' + (ctx.contestacoes.qtdContestadas || 0) +
    ' (anuladas: ' + (ctx.contestacoes.qtdAnuladas || 0) + ', mantidas/firmes: ' + (ctx.contestacoes.qtdMantidas || 0) + ')');

  var prompt =
    CONDUTAIA_REGRAS_BASE + '\n\n' +
    'TAREFA: escreva 2 seções curtas pro relatório mensal que a diretoria e a equipe toda vão ler.\n\n' +
    'NARRATIVA (1-2 parágrafos): explique a distância pro verde em termos concretos (quantos pontos de demérito ' +
    'de folga ou de excesso), nomeie os grupos/códigos que mais pesaram, e reconheça melhora ou piora frente ao ' +
    'mês anterior (se houver dado).\n\n' +
    'RECOMENDACAO (1 parágrafo curto, acionável): uma recomendação prática pra equipe/gestão pro próximo mês, ' +
    'baseada só no que está no contexto — nunca disciplinar, sempre construtiva.\n\n' +
    'CONTEXTO REAL (única fonte de fatos, não tem nome de pessoa nenhum):\n' + linhas.join('\n') + '\n\n' +
    CondutaIA_montarInstrucaoFormato_();

  var parts = [{ text: prompt }];
  var modelos = CondutaIA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    for (var tent = 0; tent < CONDUTAIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(CONDUTAIA_DELAYS_MS[tent - 1] || 1600);

      var url = CONDUTAIA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { maxOutputTokens: CONDUTAIA_TOKENS, temperature: 0.3 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var respParts = cand && cand.content && cand.content.parts;
        var texto = respParts && respParts.map(function (p) { return p.text || ''; }).join('');
        if (!texto) throw new Error('A IA retornou resposta vazia. Tente novamente.');
        return CondutaIA_extrairPorMarcadores_(texto);
      }

      if (codigo === 401 || codigo === 403) throw new Error(CondutaIA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = CondutaIA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = CondutaIA_interpretarErro_(codigo, corpo);
      if (!CondutaIA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao gerar a interpretação do relatório após tentar ' + modelos.length +
    ' modelo(s) — ' + errosPorModelo.join(' | '));
}
