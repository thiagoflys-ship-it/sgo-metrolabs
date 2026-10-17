/****************************************************
 * FROTA — INTELIGÊNCIA ARTIFICIAL (interpretação executiva do relatório
 * A4 da frota)
 *
 * Mesmo scaffolding do SGO_NR13_IA.js/SGO_CertCal_IA.js (fallback de
 * modelo via Script Properties, retry, tratamento de quota 429 com
 * RetryInfo) — duplicado de propósito, módulos irmãos independentes
 * (convenção já estabelecida no Portal).
 *
 * REGRA DE OURO, igual aos outros módulos: a IA só interpreta os números
 * JÁ CALCULADOS pelo servidor (Frota_apiGerarRelatorio) — nunca inventa
 * veículo, condutor, valor ou fato que não esteja no resumo enviado a ela.
 ****************************************************/
var FrotaIA_TOKENS = 4096;
var FrotaIA_TOKENS_MAX = 16384;
var FrotaIA_MODELO_PADRAO = 'gemini-2.5-flash';
var FrotaIA_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var FrotaIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var FrotaIA_MAX_TENTATIVAS = 3;
var FrotaIA_DELAYS_MS = [800, 1600];

function FrotaIA_obterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    model: model || FrotaIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function FrotaIA_obterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(FrotaIA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function FrotaIA_extrairDetalheQuota_(corpo) {
  var detalhes = corpo && corpo.error && corpo.error.details;
  if (!Array.isArray(detalhes)) return { retryDelay: null, descricao: null };
  var retryInfo = detalhes.filter(function(d) { return d['@type'] && d['@type'].indexOf('RetryInfo') !== -1; })[0];
  var quotaFailure = detalhes.filter(function(d) { return d['@type'] && d['@type'].indexOf('QuotaFailure') !== -1; })[0];
  var descricao = null;
  if (quotaFailure && Array.isArray(quotaFailure.violations) && quotaFailure.violations[0]) {
    descricao = quotaFailure.violations[0].description || quotaFailure.violations[0].subject || null;
  }
  return { retryDelay: retryInfo ? retryInfo.retryDelay : null, descricao: descricao };
}

function FrotaIA_interpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + ').';
  if (codigo === 429) {
    var detalhe = FrotaIA_extrairDetalheQuota_(corpo);
    var sugestao = detalhe.retryDelay
      ? ('Aguarde aproximadamente ' + detalhe.retryDelay + ' e tente novamente.')
      : 'Aguarde alguns minutos e tente novamente.';
    return 'Limite de uso da IA atingido (HTTP 429)' + (detalhe.descricao ? (' — ' + detalhe.descricao) : '') + '. ' + sugestao;
  }
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function FrotaIA_retentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function FrotaIA_proximoOrcamento_(atual) {
  return Math.min(atual * 2, FrotaIA_TOKENS_MAX);
}

/** Chamada genérica texto-only. */
function FrotaIA_chamarGemini_(prompt, maxTokens) {
  var cfg = FrotaIA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('Chave GEMINI_API_KEY não configurada. O administrador cadastra a chave em Chaves e senhas, no menu do SGO+.');
  }

  var modelos = FrotaIA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    var orcamento = maxTokens || FrotaIA_TOKENS;
    for (var tent = 0; tent < FrotaIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(FrotaIA_DELAYS_MS[tent - 1] || 1600);

      var url = FrotaIA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: orcamento, temperature: 0.3 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];

        if (cand && cand.finishReason === 'MAX_TOKENS') {
          erroModelo = 'resposta cortada por limite de tokens (finishReason=MAX_TOKENS), tentando com mais orçamento';
          orcamento = FrotaIA_proximoOrcamento_(orcamento);
          continue;
        }

        var partes = cand && cand.content && cand.content.parts;
        var texto = partes && partes.map(function(p) { return p.text || ''; }).join('');
        if (!texto) throw new Error('A IA retornou resposta vazia. Tente novamente.');
        return texto.trim();
      }

      if (codigo === 401 || codigo === 403) throw new Error(FrotaIA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = FrotaIA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = FrotaIA_interpretarErro_(codigo, corpo);
      if (!FrotaIA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao chamar a IA após tentar ' + modelos.length + ' modelo(s) — ' + errosPorModelo.join(' | '));
}

/**
 * Interpretação executiva do relatório de frota — recebe SOMENTE os
 * números já agregados por Frota_apiGerarRelatorio (SGO_Frota_Relatorio.js),
 * nunca dados brutos de movimentação. Nunca decide nada sozinha, só
 * descreve/recomenda a partir do que já foi calculado.
 */
function FrotaIA_interpretarFrota_(dados) {
  var linhas = dados.veiculos.map(function(v) {
    return '- ' + v.placa + ' (' + (v.modelo || 'sem modelo') + '): ' + v.retiradas + ' retiradas, ' +
      FrotaRel_num_(v.kmRodado, 0) + ' km rodados, utilização ' + FrotaRel_num_(v.taxaUtilizacao, 1) + '%, ' +
      'consumo ' + (v.consumoMedioKmL > 0 ? (FrotaRel_num_(v.consumoMedioKmL, 1) + ' km/L') : 'sem dado suficiente') + ', ' +
      v.manutencoesQtd + ' manutenções (R$ ' + FrotaRel_num_(v.manutencoesCusto, 2) + '), despesas R$ ' +
      FrotaRel_num_(v.despesasValor, 2) + ', combustível R$ ' + FrotaRel_num_(v.abastecimentosValor, 2) +
      ', custo por km R$ ' + FrotaRel_num_(v.custoPorKm, 2) + ', ' + v.paradasQtd + ' paradas (' + FrotaRel_num_(v.paradasDias, 1) + ' dias), ' +
      v.multasQtd + ' multas (R$ ' + FrotaRel_num_(v.multasValor, 2) + ', ' + v.multasIdentificadas + ' com condutor identificado).';
  }).join('\n');

  var alertas = dados.alertasAtuais.length
    ? dados.alertasAtuais.map(function(a) { return '- ' + a.veiculoPlaca + ': ' + a.tipoLabel + ' (' + a.status + ')'; }).join('\n')
    : 'nenhum alerta ativo no momento';

  var prompt = 'Você é um analista de frota. Com base SOMENTE nos dados reais abaixo (nunca invente número, veículo, condutor ou fato que não esteja aqui), escreva uma interpretação executiva em português do Brasil, em 3 a 5 parágrafos curtos e diretos, cobrindo: (1) quais veículos estão mais usados/disputados e quais estão ociosos/subutilizados, com base nos números; (2) padrões relevantes de custo (manutenção, despesas, combustível, multas) e o que chama atenção, incluindo consumo/custo por km fora do padrão dos demais; (3) a situação atual de alertas (documentos/manutenções/CNH vencidos ou vencendo); (4) 2 a 3 recomendações práticas e objetivas para a gestão da frota. Nunca cite fabricante de peça/serviço específico. Nunca afirme causa que os números não comprovem — se algo for só uma hipótese, deixe claro que é hipótese.\n\n' +
    'PERÍODO ANALISADO: ' + dados.periodo.inicio + ' a ' + dados.periodo.fim + ' (' + dados.periodo.dias + ' dias)\n\n' +
    'DADOS POR VEÍCULO:\n' + linhas + '\n\n' +
    'CONDUTOR MAIS ATUANTE NO PERÍODO: ' + (dados.condutorMaisAtuante ? (dados.condutorMaisAtuante.nome + ' (' + dados.condutorMaisAtuante.retiradas + ' retiradas)') : 'sem dados suficientes no período') + '\n\n' +
    'ALERTAS ATUAIS (documentos/manutenções/CNH vencidos ou vencendo, situação de hoje):\n' + alertas;

  return FrotaIA_chamarGemini_(prompt, FrotaIA_TOKENS);
}

/**
 * Conclusão do responsável (bloco 9 do relatório por veículo) — texto
 * curto, grounded SOMENTE nos dados desse veículo específico. Mesma
 * regra de ouro: nunca inventa achado, nunca decide nada, só resume o
 * que os números mostram.
 */
function FrotaIA_interpretarVeiculo_(v, periodo, alertasVeiculo) {
  var alertasTxt = alertasVeiculo.length
    ? alertasVeiculo.map(function(a) { return '- ' + a.tipoLabel + ' (' + a.status + ')'; }).join('\n')
    : 'nenhum alerta ativo no momento';

  var prompt = 'Você é um analista de frota. Com base SOMENTE nos dados reais abaixo de UM único veículo (nunca invente número ou fato que não esteja aqui), escreva uma conclusão curta e objetiva em português do Brasil (1 parágrafo, 3 a 5 frases) sobre a situação desse veículo no período: funcionamento, documentação, manutenção e quaisquer pendências. Termine indicando, de forma direta, se a situação geral está regular ou se há pendências relevantes. Nunca cite fabricante de peça/serviço específico. Nunca afirme causa que os números não comprovem.\n\n' +
    'VEÍCULO: ' + v.placa + ' (' + (v.modelo || 'sem modelo') + ')\n' +
    'PERÍODO: ' + periodo.inicio + ' a ' + periodo.fim + ' (' + periodo.dias + ' dias)\n' +
    'Retiradas: ' + v.retiradas + ' | KM rodados: ' + FrotaRel_num_(v.kmRodado, 0) + ' | Utilização: ' + FrotaRel_num_(v.taxaUtilizacao, 1) + '%\n' +
    'Consumo médio: ' + (v.consumoMedioKmL > 0 ? (FrotaRel_num_(v.consumoMedioKmL, 1) + ' km/L') : 'sem dado suficiente') + '\n' +
    'Manutenções no período: ' + v.manutencoesQtd + ' (R$ ' + FrotaRel_num_(v.manutencoesCusto, 2) + ')\n' +
    'Despesas: R$ ' + FrotaRel_num_(v.despesasValor, 2) + ' | Combustível: R$ ' + FrotaRel_num_(v.abastecimentosValor, 2) + ' | Custo por km: R$ ' + FrotaRel_num_(v.custoPorKm, 2) + '\n' +
    'Paradas/ocorrências: ' + v.paradasQtd + ' (' + FrotaRel_num_(v.paradasDias, 1) + ' dias) | Multas: ' + v.multasQtd + ' (R$ ' + FrotaRel_num_(v.multasValor, 2) + ')\n\n' +
    'ALERTAS ATUAIS DESSE VEÍCULO (documentos/manutenções/CNH do condutor responsável):\n' + alertasTxt;

  return FrotaIA_chamarGemini_(prompt, FrotaIA_TOKENS);
}
