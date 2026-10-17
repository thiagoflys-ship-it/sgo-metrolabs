/****************************************************
 * METROLABS — LAVADORA — TEXTOS DA INTERPRETAÇÃO TÉCNICA (IA)
 * Gera os textos narrativos da Interpretação Técnica do Ensaio (Análise
 * do ciclo + Conclusão deste ensaio) a partir dos números já calculados
 * por LavRel_lvExecutarAnaliseCompleta_ — nunca recalcula nem inventa dado.
 * Mesmo motor/protocolo de marcadores já validado em
 * gerador_cadeia_frio_relatorio, gerador_estufa_banhomaria_relatorio e
 * gerador_autoclave_relatorio (prefixo LVIA_ aqui, isolado neste
 * projeto standalone).
 *
 * IMPORTANTE (mudança de escopo, 2026-08-01): este documento NÃO é mais
 * um certificado final — é a interpretação técnica de UM ciclo/ensaio
 * individual, complementar ao laudo em Planilha (Relatório 1) daquele
 * mesmo ciclo. Numa campanha real (várias receitas × várias repetições),
 * cada ciclo gera sua própria interpretação; todas são reunidas depois
 * por fora num documento final consolidado (processo/módulo consolidador
 * ainda em definição). Por isso não tem mais Introdução/Objetivo
 * (linguagem de abertura de documento final) nem Assinaturas (ficam
 * reservadas pro documento consolidado). O veredito de aprovação/
 * reprovação do ENSAIO em si continua presente (é fato do ciclo, vem do
 * motor de análise), só não é mais apresentado como "qualificação final
 * do equipamento".
 *
 * Diferença estrutural em relação a Cadeia de Frio/Estufa: aqui a
 * interpretação cobre sempre UM único ciclo por execução —
 * Termodesinfectora (A0) OU Lavadora Ultrassônica (tempo de cavitação),
 * nunca os dois juntos — então "dados.estudos" sempre tem exatamente 1 item.
 ****************************************************/

var LavRel_LVIA_TOKENS_CERTIFICADO = 8192;
var LavRel_LVIA_MODELO_PADRAO = 'gemini-2.5-flash';
var LavRel_LVIA_FALLBACKS_PADRAO = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
var LavRel_LVIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var LavRel_LVIA_MAX_TENTATIVAS = 3;
var LavRel_LVIA_DELAYS_MS = [800, 1600];

function LavRel_lvIARegrasBase_() {
  return 'Você é engenheiro sênior em qualificação de lavadoras para reprocessamento de produtos para saúde ' +
    '(termodesinfectoras e lavadoras ultrassônicas) e redige o relatório técnico de um ciclo ensaiado, no padrão de ' +
    'laboratórios de metrologia e engenharia clínica. Pense com cuidado antes de escrever: confira cada número com o ' +
    'contexto e não afirme nada que os dados não sustentem.\n' + SGO_DocA4_regrasRedacaoIA_() + '\n' +
    '- Cada seção deve ser substancial e escrita a partir dos fatos; não copie frases prontas.';
}

var LavRel_LVIA_MARC_ANALISE_PREFIXO = '###ANALISE:';
var LavRel_LVIA_MARC_CONCLUSAO_TECNICA = '###CONCLUSAO_TECNICA###';
var LavRel_LVIA_MARC_CONCLUSAO_LEIGO = '###CONCLUSAO_LEIGO###';
var LavRel_LVIA_MARC_FIM = '###FIM###';

function LavRel_lvIAObterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var provider = (props.getProperty('IA_PROVIDER') || 'GEMINI').toUpperCase().trim();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    provider: provider,
    model: model || LavRel_LVIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function LavRel_lvIAObterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(LavRel_LVIA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function LavRel_lvIAInterpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return SGO_DocSalvar_msgChaveIA_(codigo);
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function LavRel_lvIAERetentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function LavRel_lvIAChamarGemini_(prompt) {
  // Chamada comum (SGO_DocA4): raciocínio ligado, temperatura baixa, resposta cortada nunca é aproveitada.
  return SGO_DocA4_chamarGemini_(prompt, { tokens: 32768, temperatura: 0.2 });
}

function LavRel_lvIAMontarInstrucaoFormato_(tiposEstudo) {
  var linhas = [];
  linhas.push('Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta ' +
    'estrutura de marcadores, cada um sozinho em sua própria linha, nesta ordem:');
  tiposEstudo.forEach(function(t) {
    linhas.push(LavRel_LVIA_MARC_ANALISE_PREFIXO + t + '###');
    linhas.push('(texto da análise deste estudo aqui)');
  });
  linhas.push(LavRel_LVIA_MARC_CONCLUSAO_TECNICA);
  linhas.push('(texto da conclusão técnica deste ensaio aqui)');
  linhas.push(LavRel_LVIA_MARC_CONCLUSAO_LEIGO);
  linhas.push('(texto da conclusão em linguagem de fácil compreensão aqui)');
  linhas.push(LavRel_LVIA_MARC_FIM);
  linhas.push('O texto de cada seção pode ter várias linhas e parágrafos livremente, incluir aspas e pontuação ' +
    'sem nenhuma restrição — não precisa escapar nada, não use aspas triplas nem crases dentro do texto.');
  return linhas.join('\n');
}

function LavRel_lvIAExtrairPorMarcadores_(texto, tiposEstudo) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadoresAnalise = tiposEstudo.map(function(t) { return LavRel_LVIA_MARC_ANALISE_PREFIXO + t + '###'; });
  var todosMarcadores = marcadoresAnalise.concat([LavRel_LVIA_MARC_CONCLUSAO_TECNICA, LavRel_LVIA_MARC_CONCLUSAO_LEIGO, LavRel_LVIA_MARC_FIM]);

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
    analisePorEstudo: {},
    conclusaoGeral: acharBloco(LavRel_LVIA_MARC_CONCLUSAO_TECNICA),
    conclusaoLeigo: acharBloco(LavRel_LVIA_MARC_CONCLUSAO_LEIGO)
  };

  var faltando = [];
  if (!resultado.conclusaoGeral) faltando.push('conclusão técnica');
  if (!resultado.conclusaoLeigo) faltando.push('conclusão em linguagem de fácil compreensão');

  tiposEstudo.forEach(function(t) {
    var v = acharBloco(LavRel_LVIA_MARC_ANALISE_PREFIXO + t + '###');
    resultado.analisePorEstudo[t] = v || '';
    if (!v) faltando.push('análise de ' + t);
  });

  if (faltando.length) {
    throw new Error('A IA não retornou todas as seções esperadas (faltando: ' + faltando.join(', ') +
      '). Provável corte por limite de tokens — tente gerar novamente.');
  }

  return resultado;
}

function LavRel_lvIAMontarContextoCertificado_(dados) {
  var linhas = [];
  linhas.push('EQUIPAMENTO: ' + (dados.equipamentoLabel || '-'));
  linhas.push('TAG: ' + (dados.tag || '-'));
  linhas.push('CLIENTE: ' + (dados.cliente || '-'));
  linhas.push('SETOR/LOCALIZAÇÃO: ' + (dados.setor || '-'));
  linhas.push('NORMAS APLICÁVEIS (cite somente estas): ' + dados.normas.join(' | '));
  if (dados.criterios && dados.criterios.length) {
    linhas.push('CRITÉRIOS DE ACEITAÇÃO E RESULTADO OBTIDO (cite exatamente):');
    dados.criterios.forEach(function(c) {
      linhas.push('  - ' + c.criterio + ': requisito ' + c.requisito + ' (' + c.referencia + '); obtido ' + c.obtido + '; situação ' + (c.conforme === true ? 'CONFORME' : (c.conforme === false ? 'NÃO CONFORME' : 'INFORMATIVO')));
    });
  }
  if (dados.parametros && dados.parametros.length) linhas.push('PARÂMETROS DO ENSAIO: ' + dados.parametros.map(function(p) { return p[0] + ': ' + p[1]; }).join(' | '));
  if (dados.registradores && dados.registradores.observacoes && dados.registradores.observacoes.length) linhas.push('RASTREABILIDADE DO REGISTRADOR (mencione na análise): ' + dados.registradores.observacoes.join(' '));
  linhas.push('ESTUDOS INCLUÍDOS NESTE LAUDO: ' + dados.estudos.map(function(e) { return e.label; }).join(', '));
  linhas.push('');

  dados.estudos.forEach(function(e) {
    linhas.push('--- ESTUDO: ' + e.label + ' (tipo interno: ' + e.tipoEstudo + ') ---');
    linhas.push('Status de aprovação: ' + e.statusAprovacao);
    linhas.push('Fatos calculados (números já no formato brasileiro): ' + JSON.stringify(SGO_DocA4_fatosPtBr_(e.fatos)));
    if (e.motivosReprovacao && e.motivosReprovacao.length) linhas.push('Motivos de reprovação: ' + e.motivosReprovacao.join(' '));
    if (e.alertasAnalise && e.alertasAnalise.length) linhas.push('Alertas: ' + e.alertasAnalise.join(' '));
    if (e.observacoesAnalise && e.observacoesAnalise.length) linhas.push('Observações: ' + e.observacoesAnalise.join(' '));

    // Conformidade por sensor (A0 acumulado) só existe pra Termodesinfectora
    // — a Ultrassônica não tem conceito de posição/sensor pro parâmetro de
    // aprovação (tempo de cavitação é uma medida única do ciclo inteiro).
    var cps = (e.fatos && e.fatos.conformidadePorSensor) || [];
    if (cps.length) {
      linhas.push('Conformidade detalhada por posição/sensor (A0 acumulado):');
      cps.forEach(function(c) {
        linhas.push(
          '  ' + c.sensor + ': status ' + c.statusSensor +
          ' | A0 acumulado ' + SGO_DocA4_val_(c.a0, 2, 's') + ' | temperatura mínima na fase principal ' + SGO_DocA4_val_(c.minTemp, 2, '°C') +
          ' | temperatura máxima na fase principal ' + SGO_DocA4_val_(c.maxTemp, 2, '°C') + ' | temperatura média na fase principal ' + SGO_DocA4_val_(c.mediaTemp, 2, '°C')
        );
      });
    }
    linhas.push('');
  });

  linhas.push('VEREDITO DESTE ENSAIO (use exatamente): ' + LavRel_lvNormalizarStatus_(dados.statusConsolidado) + (dados.resumoResultado ? ' — ' + dados.resumoResultado : ''));
  return linhas.join('\n');
}

/**
 * Regra de causas técnicas prováveis, específica por tipo de ciclo —
 * selecionada programaticamente (não deixada a critério da IA) porque os
 * dois processos têm físicas e vetores de falha completamente diferentes:
 * letalidade térmica (calor) na Termodesinfectora vs. cavitação acústica
 * (energia ultrassônica) na Ultrassônica.
 */
function LavRel_lvIARegraCausasPorTipo_(tipoEstudo) {
  if (tipoEstudo === 'ULTRASSOM') {
    return (
      '2. Se o tempo de cavitação medido ficar abaixo do mínimo exigido no critério de aceitação, explique em linguagem ' +
      'acessível as causas técnicas PROVÁVEIS mais comuns para lavadoras ultrassônicas — sempre como hipótese/' +
      'prática usual do setor, nunca como diagnóstico certo, já que não houve inspeção física direta do ' +
      'equipamento: degaseificação incompleta da solução (ar dissolvido no líquido amortece a formação das ' +
      'microbolhas de cavitação), transdutores ultrassônicos com potência reduzida ou parcialmente danificados, ' +
      'volume de carga excessivo bloqueando a propagação uniforme da energia acústica no tanque, ou concentração/' +
      'temperatura da solução de limpeza fora da faixa recomendada pelo fabricante (a eficiência da cavitação é ' +
      'sensível a ambos). Traduza cada achado em orientação prática: se o padrão sugere apenas repetir o ciclo de ' +
      'degaseificação antes do próximo uso, revisão da carga/volume, ou inspeção técnica dos transdutores.\n'
    );
  }
  return (
    '2. Se o A0 mínimo entre os sensores ativos ficar abaixo do mínimo exigido no critério de aceitação, ou se algum ' +
    'sensor apresentar temperatura de exposição sustentadamente abaixo do esperado, explique em linguagem ' +
    'acessível as causas técnicas PROVÁVEIS mais comuns para desinfecção térmica (termodesinfectoras) — sempre ' +
    'como hipótese/prática usual do setor, nunca como diagnóstico certo, já que não houve inspeção física direta ' +
    'do equipamento: resistência de aquecimento com potência insuficiente ou parcialmente danificada, carga ' +
    'excessiva ou mal distribuída no cesto bloqueando a circulação uniforme da água quente, bicos de aspersão ' +
    'obstruídos ou mal direcionados reduzindo o contato da água quente com a posição do sensor, ou sensor ' +
    'posicionado numa zona de sombra hidráulica fora do fluxo principal de recirculação. Um sensor no ponto mais ' +
    'frio do carrinho com A0 próximo do limite (mas ainda conforme) é esperado e normal — só trate como achado ' +
    'relevante os casos efetivamente abaixo do mínimo operacional. Traduza cada achado em orientação prática: se ' +
    'o padrão sugere revisão dos bicos de aspersão, redistribuição/redução da carga, ou inspeção da resistência.\n'
  );
}

/**
 * Gera os textos narrativos do Certificado numa única chamada de IA.
 */
function LavRel_lvIACriarTextosCertificado_(dadosContexto) {
  var contextoStr = LavRel_lvIAMontarContextoCertificado_(dadosContexto);
  var tiposEstudo = dadosContexto.estudos.map(function(e) { return e.tipoEstudo; });
  var regraCausas = tiposEstudo.map(LavRel_lvIARegraCausasPorTipo_).join('\n');

  var prompt =
    LavRel_lvIARegrasBase_() + '\n\n' +
    'TAREFA: com base no contexto de um único ciclo/ensaio abaixo, escreva os textos narrativos da Interpretação ' +
    'Técnica deste ensaio específico. Este NÃO é um certificado final — é uma leitura técnica de UM ciclo dentro ' +
    'de uma campanha de qualificação maior (outros ciclos/receitas são analisados em documentos separados, iguais ' +
    'a este, e reunidos depois por outro processo). Por isso não escreva introdução institucional nem objetivo de ' +
    'documento — vá direto à análise técnica do que foi medido neste ensaio.\n\n' +
    'Para o estudo incluído, escreva uma ANÁLISE TÉCNICA EXTENSA E DIDÁTICA — o leitor pode ser um responsável de ' +
    'CME ou administrador sem formação técnica em processos de reprocessamento, então o texto precisa literalmente ' +
    'ENSINAR, não só relatar. Regras específicas desta seção:\n' +
    '1. Se o bloco "Conformidade detalhada por posição/sensor" estiver presente no contexto, dedique um parágrafo ' +
    'específico a CADA sensor/posição individualmente (não só ao agregado global) — cite o A0 acumulado, a ' +
    'temperatura mínima/máxima/média durante a exposição, e se está conforme ou não em relação ao A0 mínimo ' +
    'exigido no critério de aceitação.\n' +
    regraCausas +
    '3. Se não houver dados de conformidade por sensor (caso da Lavadora Ultrassônica), escreva a análise de forma ' +
    'extensa e didática mesmo assim, interpretando os fatos agregados fornecidos (tempo de cavitação, limite).\n' +
    'Esta seção deve ter NO MÍNIMO 4 parágrafos substanciais quando houver dados por posição/sensor, e no mínimo 2 ' +
    'quando não houver — nunca um resumo curto.\n\n' +
    'A CONCLUSÃO TÉCNICA deve amarrar o que foi observado neste ciclo específico num texto extenso, denso e ' +
    'rigoroso, culminando no veredito deste ensaio — sem declarar qualificação final do ' +
    'equipamento como um todo, já que este documento cobre só este ciclo. Esta seção é dirigida a um público técnico ' +
    '(engenheiros, auditores, outros laboratórios) — use a terminologia correta com precisão total, cite os valores ' +
    'com exatidão e não simplifique nada aqui. Na termodesinfecção, explique que o critério de A0 aplicado decorre da ' +
    'classificação do artigo informada (600 s para semicrítico ou não crítico, 3.000 s para crítico). O último parágrafo ' +
    'deve declarar o veredito de forma inequívoca ("O ensaio está APROVADO" ou "O ensaio está REPROVADO"), citando o ' +
    'critério de aceitação e o valor decisivo (o pior sensor e o seu A0, ou o tempo de cavitação e o mínimo).\n\n' +
    'A CONCLUSÃO EM LINGUAGEM DE FÁCIL COMPREENSÃO deve comunicar exatamente o MESMO veredito e os mesmos fatos ' +
    'centrais da conclusão técnica, mas escrita para qualquer leitor sem formação técnica (ex.: um fiscal ' +
    'administrativo, um profissional de enfermagem, ou qualquer pessoa curiosa que abra o documento) — alguém que ' +
    'nunca ouviu falar de A0, letalidade térmica ou cavitação ultrassônica. Regras específicas desta seção:\n' +
    '- Nunca diverja do veredito ou dos números da conclusão técnica — é a mesma informação, só em outro vocabulário.\n' +
    '- Não use jargão sem explicar: se precisar citar um termo técnico, explique o que ele significa na mesma frase, ' +
    'em linguagem cotidiana (ex.: em vez de simplesmente citar "A0", explique que é a forma de medir se o calor foi ' +
    'suficiente e por tempo suficiente para garantir a desinfecção do material).\n' +
    '- Tom respeitoso, cordial e profissional o tempo todo — nunca condescendente, nunca dê a entender que o leitor ' +
    'é menos capaz; é só uma explicação em linguagem mais direta, do tipo que qualquer pessoa desperta e atenta ' +
    'entenderia de primeira, mesmo sem nenhuma formação técnica.\n' +
    '- Explique o que foi verificado neste ensaio e o que o resultado significa na prática (por que isso importa ' +
    'pra segurança de quem usa o equipamento ou de quem é atendido com o material processado por ele).\n' +
    '- Também deve ser um texto substancial (vários parágrafos), não um resumo de uma linha.\n\n' +
    'CONTEXTO REAL DESTE ENSAIO (única fonte de fatos permitida):\n' + contextoStr + '\n\n' +
    LavRel_lvIAMontarInstrucaoFormato_(tiposEstudo);

  var respostaBruta = LavRel_lvIAChamarGemini_(prompt);
  var json;
  try {
    json = LavRel_lvIAExtrairPorMarcadores_(respostaBruta, tiposEstudo);
  } catch (e) {
    throw new Error('Falha ao gerar os textos do certificado: ' + e.message);
  }

  json.conclusaoGeral = SGO_DocA4_limparTextoIA_(json.conclusaoGeral);
  json.conclusaoLeigo = SGO_DocA4_limparTextoIA_(json.conclusaoLeigo);
  Object.keys(json.analisePorEstudo || {}).forEach(function(k) { json.analisePorEstudo[k] = SGO_DocA4_limparTextoIA_(json.analisePorEstudo[k]); });
  return json;
}
