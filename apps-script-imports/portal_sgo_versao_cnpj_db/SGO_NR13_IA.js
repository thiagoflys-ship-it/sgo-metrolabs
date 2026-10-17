/****************************************************
 * NR13 — INTELIGÊNCIA ARTIFICIAL (interpretação de fotos, melhoria de
 * texto, textos narrativos do laudo)
 *
 * Mesmo scaffolding do SGO_CertCal_IA.js (fallback de modelo via Script
 * Properties, retry, tratamento de quota 429 com RetryInfo) — duplicado
 * de propósito, módulos irmãos independentes (convenção já estabelecida
 * no Portal).
 *
 * REGRA DE OURO, igual ao CertCal: a IA NUNCA decide aprovação/reprovação/
 * ressalvas sozinha — isso é sempre uma decisão do Profissional Legalmente Habilitado
 * (PH), digitada/escolhida por ele. A IA só: (1) descreve tecnicamente o
 * que uma foto mostra a partir do que o usuário disse que ela representa;
 * (2) reescreve um texto do usuário de forma mais clara, sem inventar
 * fato novo; (3) redige a Introdução/Objetivo do laudo com base SOMENTE
 * nos dados reais informados (nunca inventa dado técnico do vaso).
 ****************************************************/
var NR13IA_TOKENS = 16384;
var NR13IA_TOKENS_MAX = 32768;
var NR13IA_MODELO_PADRAO = 'gemini-2.5-flash';
var NR13IA_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var NR13IA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var NR13IA_MAX_TENTATIVAS = 3;
var NR13IA_DELAYS_MS = [800, 1600];

function NR13IA_obterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    model: model || NR13IA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function NR13IA_obterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(NR13IA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function NR13IA_extrairDetalheQuota_(corpo) {
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

function NR13IA_interpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return 'Chave GEMINI_API_KEY inválida ou sem autorização (HTTP ' + codigo + ').';
  if (codigo === 429) {
    var detalhe = NR13IA_extrairDetalheQuota_(corpo);
    var sugestao = detalhe.retryDelay
      ? ('Aguarde aproximadamente ' + detalhe.retryDelay + ' e tente novamente.')
      : 'Aguarde alguns minutos e tente novamente.';
    return 'Limite de uso da IA atingido (HTTP 429)' + (detalhe.descricao ? (' — ' + detalhe.descricao) : '') + '. ' + sugestao;
  }
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function NR13IA_retentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

/**
 * Corte por limite de tokens (finishReason=MAX_TOKENS) NUNCA deve virar
 * texto pela metade entregue ao usuário — sempre tenta de novo com MAIS
 * orçamento de tokens (nunca cortando o "raciocínio" do modelo, só dando
 * mais espaço pra ele terminar). Mesmo princípio do bug real documentado
 * em SGO_RegOp_IA.js (2026-08-15) — ver [[feedback_ia_prioriza_acuracia_sobre_custo]].
 * Dobra o orçamento a cada corte, até o teto NR13IA_TOKENS_MAX.
 */
function NR13IA_proximoOrcamento_(atual) {
  return Math.min(atual * 2, NR13IA_TOKENS_MAX);
}

/** Chamada genérica texto-only, usada por melhorarTexto/gerarParecerConclusivo/gerarTextosLaudo_. */
function NR13IA_chamarGemini_(prompt, maxTokens) {
  var cfg = NR13IA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.');
  }

  var modelos = NR13IA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    var orcamento = maxTokens || NR13IA_TOKENS;
    for (var tent = 0; tent < NR13IA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(NR13IA_DELAYS_MS[tent - 1] || 1600);

      var url = NR13IA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: orcamento, temperature: 0.25 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];

        // Corte por token — NUNCA devolve texto pela metade: tenta de
        // novo com o dobro do orçamento (mesma chave de API, sem contar
        // como falha de modelo).
        if (cand && cand.finishReason === 'MAX_TOKENS') {
          erroModelo = 'resposta cortada por limite de tokens (finishReason=MAX_TOKENS), tentando com mais orçamento';
          orcamento = NR13IA_proximoOrcamento_(orcamento);
          continue;
        }

        var partes = cand && cand.content && cand.content.parts;
        var texto = partes && partes.map(function(p) { return p.text || ''; }).join('');
        if (!texto) throw new Error('A IA retornou resposta vazia. Tente novamente.');
        return texto.trim();
      }

      if (codigo === 401 || codigo === 403) throw new Error(NR13IA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = NR13IA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = NR13IA_interpretarErro_(codigo, corpo);
      if (!NR13IA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao chamar a IA após tentar ' + modelos.length + ' modelo(s) — ' + errosPorModelo.join(' | '));
}

// ------------------------------------------------------------
// 1. INTERPRETAÇÃO TÉCNICA DE FOTO (Gemini vision) — o usuário diz o que
// a foto representa (legenda), a IA aprofunda tecnicamente em cima disso.
// Diferente de CertCalIA_analisarFoto_ (que é decorativa e nunca lança
// erro): aqui é uma ação explícita do usuário ("Interpretar com IA" por
// foto), então lança erro de verdade se falhar — o usuário precisa saber
// que precisa tentar de novo, não silenciosamente ficar sem nada.
// ------------------------------------------------------------
function NR13IA_analisarFoto_(base64, mimeType, legendaUsuario, contextoVaso) {
  var cfg = NR13IA_obterConfig_();
  if (!cfg.geminiKey) {
    throw new Error('A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.');
  }
  if (!base64) throw new Error('Nenhuma imagem informada.');

  var prompt =
    'Você é um Profissional Legalmente Habilitado (engenheiro) fazendo a inspeção de segurança NR-13 de um vaso de pressão. ' +
    'O técnico tirou uma foto durante a inspeção e descreveu em poucas palavras o que ela representa. Sua tarefa é ' +
    'aprofundar tecnicamente essa descrição, como se fosse escrever o registro fotográfico do laudo oficial ' +
    '(item 13.5.4.11, alínea "h", da NR-13 — registro fotográfico das anomalias detectadas no exame interno e externo).\n\n' +
    'VASO INSPECIONADO: ' + (contextoVaso || '-') + '\n' +
    'O QUE O TÉCNICO DISSE QUE A FOTO REPRESENTA: ' + (legendaUsuario || '(não informado — descreva só o que é visível)') + '\n\n' +
    'REGRAS:\n' +
    '1. Escreva 1 parágrafo curto (2 a 4 frases), tom de laudo técnico, português brasileiro, sem markdown.\n' +
    '2. Baseie-se no que o técnico disse E no que é visível na imagem — não contradiga a legenda do técnico, ' +
    'aprofunde-a com vocabulário técnico apropriado (ex.: tipo de anomalia, componente afetado, severidade aparente).\n' +
    '3. NUNCA declare aprovação, reprovação ou conformidade — isso é decisão exclusiva do engenheiro responsável, ' +
    'feita depois, considerando o conjunto da inspeção. Você só descreve o achado técnico.\n' +
    '4. Se a legenda não indicar nenhuma anomalia (ex.: "vista geral do vaso", "placa de identificação"), apenas ' +
    'descreva o que a imagem documenta, sem forçar a menção de um problema que não existe.';

  var modelos = NR13IA_obterListaModelos_(cfg);
  var errosPorModelo = [];

  for (var mi = 0; mi < modelos.length; mi++) {
    var modelo = modelos[mi];
    var erroModelo = 'falha desconhecida';
    var orcamentoFoto = 4096;
    for (var tent = 0; tent < NR13IA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(NR13IA_DELAYS_MS[tent - 1] || 1600);

      var url = NR13IA_ENDPOINT_GEMINI + modelo + ':generateContent?key=' + cfg.geminiKey;
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }
            ]
          }],
          generationConfig: { maxOutputTokens: orcamentoFoto, temperature: 0.3 }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e2) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];

        if (cand && cand.finishReason === 'MAX_TOKENS') {
          erroModelo = 'resposta cortada por limite de tokens, tentando com mais orçamento';
          orcamentoFoto = NR13IA_proximoOrcamento_(orcamentoFoto);
          continue;
        }

        var partes = cand && cand.content && cand.content.parts;
        var texto = partes && partes.map(function(p) { return p.text || ''; }).join('');
        if (texto) return String(texto).trim();
        erroModelo = 'a IA retornou resposta vazia ao analisar a imagem';
        break;
      }

      if (codigo === 401 || codigo === 403) throw new Error(NR13IA_interpretarErro_(codigo, corpo));
      if (codigo === 429) { erroModelo = NR13IA_interpretarErro_(codigo, corpo); break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado (HTTP 404)'; break; }

      erroModelo = NR13IA_interpretarErro_(codigo, corpo);
      if (!NR13IA_retentavel_(codigo)) break;
    }
    errosPorModelo.push(modelo + ': ' + erroModelo);
  }

  throw new Error('Falha ao analisar a foto após tentar ' + modelos.length + ' modelo(s) — ' + errosPorModelo.join(' | '));
}

// ------------------------------------------------------------
// 2. MELHORIA DE TEXTO (mesmo padrão de RegOp_melhorarTextoCampo_ —
// SGO_RegOp_IA.js) — reescreve mantendo todos os fatos, nunca inventa.
// Usuário sempre revisa e decide se aceita, nunca aplica sozinho.
// ------------------------------------------------------------
function NR13IA_melhorarTexto_(rotulo, valorOriginal, contextoVaso) {
  var prompt =
    'Você é um engenheiro sênior especializado em inspeção NR-13 (vasos de pressão) da Metrolabs Soluções em ' +
    'Engenharia Clínica, revisando a redação de um campo de um laudo técnico.\n' +
    'VASO: ' + (contextoVaso || '-') + '\n' +
    'REGRAS:\n' +
    '1. Reescreva o texto abaixo de forma mais clara, técnica e objetiva, no padrão de um laudo de engenharia.\n' +
    '2. Mantenha TODOS os fatos relatados — não invente, não adicione achado novo, não remova detalhe relevante.\n' +
    '3. Não cite marca ou fabricante específico além do que já estiver no texto original.\n' +
    '4. Responda SOMENTE com o texto reescrito, sem comentários, sem aspas, sem markdown.\n\n' +
    'CAMPO: ' + (rotulo || '') + '\n' +
    'TEXTO ORIGINAL: ' + valorOriginal;

  var texto = NR13IA_chamarGemini_(prompt, 4096);
  return texto.replace(/^["'`]+|["'`]+$/g, '').trim();
}

// ------------------------------------------------------------
// 3. SUGESTÃO DE PARECER CONCLUSIVO — rascunho editável, NUNCA a decisão
// final (isso é sempre do PH). Baseado só no que já foi digitado.
// ------------------------------------------------------------
function NR13IA_gerarParecerConclusivo_(payload) {
  payload = payload || {};
  var veredito = NR13_normalizarVeredito_(payload.veredito);
  var veredictoTexto = veredito === NR13_CFG.VEREDITOS.REPROVADO ? 'REPROVADO'
    : veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS ? 'APROVADO COM RESSALVAS'
    : 'APROVADO';

  var prompt =
    'Você é um engenheiro Profissional Legalmente Habilitado (PLH) redigindo o "parecer conclusivo quanto à integridade do ' +
    'vaso de pressão até a próxima inspeção" (item 13.5.4.11, alínea "k", da NR-13) — a seção mais importante do ' +
    'laudo.\n' +
    'O ENGENHEIRO JÁ DECIDIU O VEREDITO (não questione, apenas fundamente por escrito): ' + veredictoTexto + '\n\n' +
    'DADOS DA INSPEÇÃO (única fonte de fatos — nunca invente achado que não está aqui):\n' +
    'Vaso: ' + (payload.contextoVaso || '-') + '\n' +
    'Descrição das inspeções/exames/testes executados: ' + (payload.descricaoInspecoes || '-') + '\n' +
    'Resultado das inspeções e intervenções: ' + (payload.resultadoInspecoes || '-') + '\n' +
    'Recomendações e providências necessárias: ' + (payload.recomendacoes || '-') + '\n' +
    'Observações adicionais: ' + (payload.observacoes || '-') + '\n\n' +
    'REGRAS:\n' +
    '1. Escreva 1 a 2 parágrafos, tom formal de laudo de engenharia, português brasileiro, sem markdown.\n' +
    '2. Declare explicitamente o veredito (' + veredictoTexto + ') e fundamente com base SOMENTE nos dados acima.\n' +
    '3. NUNCA cite o número/algarismo romano da Categoria NR-13 do vaso (ex.: "Categoria III") neste texto — esse ' +
    'dado já aparece, calculado à parte, na tabela de identificação do laudo, e pode ter sido recalculado depois ' +
    'que este parecer foi redigido; citá-lo aqui de novo criaria risco de o parecer ficar desatualizado em relação ' +
    'ao resto do documento. Se precisar se referir a ela, diga apenas "a categoria indicada na identificação deste laudo".\n' +
    '4. Se o veredito for APROVADO COM RESSALVAS, deixe claro que a integridade está mantida até a próxima ' +
    'inspeção CONDICIONADA à execução das recomendações listadas, e que uma reinspeção de verificação é recomendada.\n' +
    '5. Se o veredito for REPROVADO, deixe claro que o vaso NÃO deve permanecer em operação até que as ' +
    'providências sejam tomadas e uma inspeção extraordinária confirme a integridade.\n' +
    '6. Responda SOMENTE com o texto do parecer, sem título, sem comentários, sem aspas.';

  return NR13IA_chamarGemini_(prompt, 2048);
}

// ------------------------------------------------------------
// 4. INTRODUÇÃO + OBJETIVO do laudo — gerados automaticamente na
// emissão, grounded nos dados reais (nunca inventa dado técnico do
// vaso). Se a chamada falhar, NR13_apiEmitirLaudo cai no texto fixo de
// NR13Doc_textoIntroducaoFixo_/textoObjetivoFixo_ (SGO_NR13_Documento.js)
// — a emissão do laudo NUNCA trava por causa da IA.
// ------------------------------------------------------------
var NR13IA_MARC_INTRO = '###INTRODUCAO###';
var NR13IA_MARC_OBJETIVO = '###OBJETIVO###';
var NR13IA_MARC_FIM = '###FIM###';

function NR13IA_gerarTextosLaudo_(ctx) {
  var prompt =
    'Você é um engenheiro Profissional Legalmente Habilitado redigindo a Introdução e o Objetivo de um Laudo de Inspeção de ' +
    'Segurança de Vaso de Pressão, conforme a NR-13 (Ministério do Trabalho e Emprego).\n\n' +
    'DADOS REAIS (única fonte de fatos — nunca invente dado técnico não informado aqui):\n' +
    'Cliente: ' + (ctx.cliente.razaoSocial || '-') + '\n' +
    'Tipo de vaso: ' + (ctx.vaso.tipo || '-') + (ctx.vaso.tag ? (' — TAG ' + ctx.vaso.tag) : '') + '\n' +
    'Fabricante/Modelo: ' + (ctx.vaso.fabricante || '-') + ' / ' + (ctx.vaso.modelo || '-') + '\n' +
    'Categoria (NR-13, Tabela 1): ' + (ctx.categoria.categoria || '-') + '\n' +
    'Tipo de inspeção: ' + (ctx.inspecao.tipo || '-') + '\n\n' +
    'A INTRODUÇÃO (1 parágrafo) deve contextualizar o laudo: identificar o cliente e o vaso, mencionar que a ' +
    'inspeção foi realizada em atendimento à NR-13, e citar o nome completo da norma: "' + NR13_CFG.NORMA_REFERENCIA + '".\n\n' +
    'O OBJETIVO (1 parágrafo curto) deve declarar, em linguagem técnica formal, que o objetivo deste laudo é ' +
    'verificar as condições de integridade estrutural e segurança operacional do vaso de pressão descrito, através ' +
    'de inspeção visual/exames técnicos, determinando sua aptidão para continuar em operação até a próxima ' +
    'inspeção de segurança, em conformidade com os critérios estabelecidos pela NR-13.\n\n' +
    'REGRAS: português brasileiro, tom formal de laudo de engenharia, sem markdown, sem inventar nenhum dado ' +
    'técnico do vaso além do que foi informado acima. Responda SOMENTE em texto puro seguindo EXATAMENTE esta ' +
    'estrutura de marcadores, cada um sozinho em sua própria linha:\n' +
    NR13IA_MARC_INTRO + '\n(texto da introdução aqui)\n' +
    NR13IA_MARC_OBJETIVO + '\n(texto do objetivo aqui)\n' +
    NR13IA_MARC_FIM;

  var texto = NR13IA_chamarGemini_(prompt, 4096);
  return NR13IA_extrairPorMarcadores_(texto);
}

function NR13IA_extrairPorMarcadores_(texto) {
  var limpo = String(texto || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
  var marcadores = [NR13IA_MARC_INTRO, NR13IA_MARC_OBJETIVO, NR13IA_MARC_FIM];

  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return '';
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    marcadores.forEach(function(m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }

  var introducao = acharBloco(NR13IA_MARC_INTRO);
  var objetivo = acharBloco(NR13IA_MARC_OBJETIVO);
  if (!introducao || !objetivo) throw new Error('A IA não retornou todas as seções esperadas (Introdução/Objetivo).');
  return { introducao: introducao, objetivo: objetivo };
}
