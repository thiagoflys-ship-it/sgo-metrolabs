/****************************************************
 * METROLABS — AUTOCLAVE — TEXTOS DA INTERPRETAÇÃO TÉCNICA (IA)
 * Gera os textos narrativos da Interpretação Técnica do Ensaio (Análise
 * do ciclo + Conclusão deste ensaio) a partir dos números já calculados
 * por AutoRel_acExecutarAnaliseCompleta_/analisarLeakTest_ — nunca recalcula nem
 * inventa dado. Mesmo motor/protocolo de marcadores já validado em
 * gerador_cadeia_frio_relatorio e gerador_estufa_banhomaria_relatorio
 * (prefixo ACIA_ aqui, isolado neste projeto standalone).
 *
 * IMPORTANTE (mudança de escopo, 2026-08-01): este documento NÃO é mais
 * um certificado final — é a interpretação técnica de UM ciclo/ensaio
 * individual, complementar ao laudo em Planilha (Relatório 1) daquele
 * mesmo ciclo. Vários desses, um por ciclo, são depois reunidos por
 * fora (processo ainda em definição) num documento final consolidado
 * pro cliente — por isso não tem mais Introdução/Objetivo (linguagem de
 * abertura de documento final) nem Assinaturas (ficam reservadas pro
 * documento consolidado). O veredito de aprovação/reprovação do ENSAIO
 * em si continua presente (é fato do ciclo, vem do motor de análise),
 * só não é mais apresentado como "qualificação final do equipamento".
 *
 * Diferença estrutural destes dois módulos (Autoclave/Lavadora) em
 * relação a Cadeia de Frio/Estufa: aqui a interpretação cobre sempre UM
 * único estudo por execução — ciclo térmico OU Leak Test, nunca os dois
 * juntos — então "dados.estudos" sempre tem exatamente 1 item, mas a
 * função abaixo continua genérica (aceita N) pra não duplicar código
 * caso o produto precise agregar mais de um estudo no futuro.
 ****************************************************/

var AutoRel_ACIA_TOKENS_CERTIFICADO = 8192;
var AutoRel_ACIA_MODELO_PADRAO = 'gemini-2.5-flash';
var AutoRel_ACIA_FALLBACKS_PADRAO = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
var AutoRel_ACIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var AutoRel_ACIA_MAX_TENTATIVAS = 3;
var AutoRel_ACIA_DELAYS_MS = [800, 1600];

function AutoRel_acIARegrasBase_() {
  return 'Você é engenheiro sênior em qualificação térmica de autoclaves a vapor hospitalares e redige o relatório técnico ' +
    'de um ensaio (ciclo de esterilização ou teste de estanqueidade da câmara), no padrão de laboratórios de metrologia e ' +
    'engenharia clínica. Pense com cuidado antes de escrever: confira cada número com o contexto e não afirme nada que os ' +
    'dados não sustentem.\n' + SGO_DocA4_regrasRedacaoIA_() + '\n' +
    '- Cada seção deve ser substancial e escrita a partir dos fatos; não copie frases prontas.';
}

// Marcadores do protocolo de saída (substitui JSON) — mesma justificativa
// documentada em Cadeia de Frio/Estufa: pedir texto longo dentro de JSON
// gera erro de parsing sempre que a prosa tem parágrafo ou aspas.
// Sem marcador de Introdução/Objetivo — este documento não abre mais como
// certificado final (ver comentário de topo do arquivo).
var AutoRel_ACIA_MARC_ANALISE_PREFIXO = '###ANALISE:';
var AutoRel_ACIA_MARC_CONCLUSAO_TECNICA = '###CONCLUSAO_TECNICA###';
var AutoRel_ACIA_MARC_CONCLUSAO_LEIGO = '###CONCLUSAO_LEIGO###';
var AutoRel_ACIA_MARC_FIM = '###FIM###';

function AutoRel_acIAObterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var provider = (props.getProperty('IA_PROVIDER') || 'GEMINI').toUpperCase().trim();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    provider: provider,
    model: model || AutoRel_ACIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}

function AutoRel_acIAObterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw
    ? cfg.fallbacksRaw.split(',').map(function(m) { return m.trim(); }).filter(Boolean)
    : [].concat(AutoRel_ACIA_FALLBACKS_PADRAO);
  fb.forEach(function(m) { if (lista.indexOf(m) === -1) lista.push(m); });
  return lista;
}

function AutoRel_acIAInterpretarErro_(codigo, corpo) {
  var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
  if (codigo === 401 || codigo === 403) return SGO_DocSalvar_msgChaveIA_(codigo);
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}

function AutoRel_acIAERetentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}

function AutoRel_acIAChamarGemini_(prompt) {
  // Chamada comum dos documentos de qualificação (SGO_DocA4): raciocínio
  // ligado, temperatura baixa, resposta cortada nunca é aproveitada.
  return SGO_DocA4_chamarGemini_(prompt, { tokens: 32768, temperatura: 0.2 });
}

function AutoRel_acIAMontarInstrucaoFormato_(tiposEstudo) {
  var linhas = [];
  linhas.push('Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta ' +
    'estrutura de marcadores, cada um sozinho em sua própria linha, nesta ordem:');
  tiposEstudo.forEach(function(t) {
    linhas.push(AutoRel_ACIA_MARC_ANALISE_PREFIXO + t + '###');
    linhas.push('(texto da análise deste estudo aqui)');
  });
  linhas.push(AutoRel_ACIA_MARC_CONCLUSAO_TECNICA);
  linhas.push('(texto da conclusão técnica deste ensaio aqui)');
  linhas.push(AutoRel_ACIA_MARC_CONCLUSAO_LEIGO);
  linhas.push('(texto da conclusão em linguagem de fácil compreensão aqui)');
  linhas.push(AutoRel_ACIA_MARC_FIM);
  linhas.push('O texto de cada seção pode ter várias linhas e parágrafos livremente, incluir aspas e pontuação ' +
    'sem nenhuma restrição — não precisa escapar nada, não use aspas triplas nem crases dentro do texto.');
  return linhas.join('\n');
}

function AutoRel_acIAExtrairPorMarcadores_(texto, tiposEstudo) {
  var limpo = String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  var marcadoresAnalise = tiposEstudo.map(function(t) { return AutoRel_ACIA_MARC_ANALISE_PREFIXO + t + '###'; });
  var todosMarcadores = marcadoresAnalise.concat([AutoRel_ACIA_MARC_CONCLUSAO_TECNICA, AutoRel_ACIA_MARC_CONCLUSAO_LEIGO, AutoRel_ACIA_MARC_FIM]);

  var ultimaPosicao = -1;
  todosMarcadores.forEach(function(m) {
    var pos = limpo.indexOf(m);
    if (pos < 0 || pos <= ultimaPosicao || limpo.indexOf(m, pos + m.length) !== -1) throw new Error('A IA retornou seções incompletas ou fora de ordem. Gere o rascunho novamente.');
    ultimaPosicao = pos;
  });

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
    conclusaoGeral: acharBloco(AutoRel_ACIA_MARC_CONCLUSAO_TECNICA),
    conclusaoLeigo: acharBloco(AutoRel_ACIA_MARC_CONCLUSAO_LEIGO)
  };

  var faltando = [];
  if (!resultado.conclusaoGeral) faltando.push('conclusão técnica');
  if (!resultado.conclusaoLeigo) faltando.push('conclusão em linguagem de fácil compreensão');

  tiposEstudo.forEach(function(t) {
    var v = acharBloco(AutoRel_ACIA_MARC_ANALISE_PREFIXO + t + '###');
    resultado.analisePorEstudo[t] = v || '';
    if (!v) faltando.push('análise de ' + t);
  });

  if (faltando.length) {
    throw new Error('A IA não retornou todas as seções esperadas (faltando: ' + faltando.join(', ') +
      '). Provável corte por limite de tokens — tente gerar novamente.');
  }

  return resultado;
}

function AutoRel_acIAMontarContextoCertificado_(dados) {
  var linhas = [];
  linhas.push('EQUIPAMENTO: ' + (dados.equipamentoLabel || '-'));
  linhas.push('TAG: ' + (dados.tag || '-'));
  linhas.push('CLIENTE: ' + (dados.cliente || '-'));
  linhas.push('ORIGEM DOS DADOS: ' + (dados.origemDados || 'DADOS INFORMADOS PARA O ENSAIO'));
  linhas.push('LIMITAÇÃO: aprovação térmica e F0 não comprovam eficácia da remoção de ar ou ausência de gases não condensáveis. Zero pulsos detectados não significa zero pulsos realizados; respeite o diagnóstico e suas limitações. Equipamento gravitacional não deve ser descrito como pré-vácuo pulsado. Não deduza o tipo do equipamento apenas pela curva.');
  linhas.push('SETOR/LOCALIZAÇÃO: ' + (dados.setor || '-'));
  linhas.push('NORMAS APLICÁVEIS (cite somente estas): ' + dados.normas.join(' | '));
  if (dados.criterios && dados.criterios.length) {
    linhas.push('CRITÉRIOS DE ACEITAÇÃO E RESULTADO OBTIDO (cite exatamente):');
    dados.criterios.forEach(function(c) {
      linhas.push('  - ' + c.criterio + ': requisito ' + c.requisito + ' (' + c.referencia + '); obtido ' + c.obtido + '; situação ' +
        (c.conforme === true ? 'CONFORME' : (c.conforme === false ? 'NÃO CONFORME' : 'INFORMATIVO')));
    });
  }
  if (dados.parametros && dados.parametros.length) {
    linhas.push('PARÂMETROS DO ENSAIO: ' + dados.parametros.map(function(p) { return p[0] + ': ' + p[1]; }).join(' | '));
  }
  if (dados.registradores && dados.registradores.observacoes && dados.registradores.observacoes.length) {
    linhas.push('RASTREABILIDADE DO REGISTRADOR (mencione na análise): ' + dados.registradores.observacoes.join(' '));
  }
  linhas.push('ESTUDOS INCLUÍDOS NESTE LAUDO: ' + dados.estudos.map(function(e) { return e.label; }).join(', '));
  linhas.push('');

  dados.estudos.forEach(function(e) {
    linhas.push('--- ESTUDO: ' + e.label + ' (tipo interno: ' + e.tipoEstudo + ') ---');
    linhas.push('Status de aprovação: ' + e.statusAprovacao);
    linhas.push('Fatos calculados (números já no formato brasileiro): ' + JSON.stringify(SGO_DocA4_fatosPtBr_(e.fatos)));
    if (e.motivosReprovacao && e.motivosReprovacao.length) linhas.push('Motivos de reprovação: ' + e.motivosReprovacao.join(' '));
    if (e.alertasAnalise && e.alertasAnalise.length) linhas.push('Alertas: ' + e.alertasAnalise.join(' '));
    if (e.observacoesAnalise && e.observacoesAnalise.length) linhas.push('Observações: ' + e.observacoesAnalise.join(' '));

    // Conformidade por sensor (só existe pro ciclo térmico — F0 acumulado
    // por posição, não faz sentido pro Leak Test, que é uma única medida
    // de pressão da câmara como um todo).
    var cps = (e.fatos && e.fatos.conformidadePorSensor) || [];
    if (cps.length) {
      linhas.push('Conformidade detalhada por posição/sensor (F0 acumulado):');
      cps.forEach(function(c) {
        linhas.push(
          '  ' + c.sensor + ': status ' + c.statusSensor +
          ' | F0 acumulado ' + SGO_DocA4_val_(c.f0, 2, 'min') + ' | temperatura mínima na exposição ' + SGO_DocA4_val_(c.minTemp, 2, '°C') +
          ' | temperatura máxima na exposição ' + SGO_DocA4_val_(c.maxTemp, 2, '°C') + ' | temperatura média na exposição ' + SGO_DocA4_val_(c.mediaTemp, 2, '°C')
        );
      });
    }
    linhas.push('');
  });

  linhas.push('VEREDITO DESTE ENSAIO (use exatamente): ' + AutoRel_acLabelStatus_(dados.statusConsolidado) +
    (dados.resumoResultado ? ' — ' + dados.resumoResultado : ''));
  return linhas.join('\n');
}

/**
 * Regra de causas técnicas prováveis, específica por tipo de estudo —
 * selecionada programaticamente (não deixada a critério da IA) porque os
 * dois estudos têm físicas e vetores de falha completamente diferentes.
 */
function AutoRel_acIARegraCausasPorTipo_(tipoEstudo) {
  if (tipoEstudo === 'LEAK_TEST') {
    return (
      '2. Se a taxa de vazamento medida ultrapassar o limite de referência, explique em linguagem acessível as ' +
      'causas técnicas PROVÁVEIS mais comuns — sempre como hipótese/prática usual do setor, nunca como diagnóstico ' +
      'certo, já que não houve inspeção física direta do equipamento: vedação (gaxeta/borracha) da porta da câmara ' +
      'desgastada, ressecada ou com corpo estranho impedindo o fechamento hermético; válvulas de admissão/exaustão ' +
      'com vedação comprometida ou sujeira acumulada; conexões, mangueiras ou registros da linha de vácuo com ' +
      'pequenas fissuras; ou desgaste natural de O-rings internos ao sistema de geração de vácuo. Traduza o achado ' +
      'em orientação prática: se a taxa está dentro do limite com folga confortável, se está no limite (recomendar ' +
      'acompanhamento mais frequente), ou se exige manutenção corretiva na vedação/sistema de vácuo antes do próximo uso.\n'
    );
  }
  return (
    '2. Para o ciclo térmico, se o F0 mínimo entre os sensores ativos ficar abaixo do F0 mínimo normativo exigido ' +
    'para o ciclo, ou se algum sensor apresentar temperatura de exposição sustentadamente abaixo do esperado, ' +
    'explique em linguagem acessível as causas técnicas PROVÁVEIS mais comuns para esterilização a vapor — sempre ' +
    'como hipótese/prática usual do setor, nunca como diagnóstico certo, já que não houve inspeção física direta do ' +
    'equipamento: remoção incompleta do ar residual da câmara/carga durante o pré-vácuo (ar residual forma uma ' +
    'bolsa isolante que impede o vapor de atingir a temperatura de saturação naquele ponto), carga mal distribuída ' +
    'ou excessiva bloqueando a livre penetração do vapor até a posição do sensor, embalagens/invólucros posicionados ' +
    'de forma a criar sombra de vapor, ou vedação de porta comprometida permitindo perda de pressão/temperatura ' +
    'localizada. Um sensor no ponto mais frio da câmara com F0 próximo do limite (mas ainda conforme) é esperado e ' +
    'normal — só trate como achado relevante os casos efetivamente abaixo do mínimo normativo. Traduza cada achado ' +
    'em orientação prática: se o padrão sugere revisão do ciclo de pré-vácuo, redistribuição/redução da carga, ou ' +
    'inspeção da vedação da porta.\n'
  );
}

/**
 * Gera os textos narrativos do Certificado numa única chamada de IA.
 */
function AutoRel_acIACriarTextosCertificado_(dadosContexto) {
  var contextoStr = AutoRel_acIAMontarContextoCertificado_(dadosContexto);
  var tiposEstudo = dadosContexto.estudos.map(function(e) { return e.tipoEstudo; });
  var regraCausas = tiposEstudo.map(AutoRel_acIARegraCausasPorTipo_).join('\n');

  var prompt =
    AutoRel_acIARegrasBase_() + '\n\n' +
    'TAREFA: com base no contexto de um único ciclo/ensaio abaixo, escreva os textos narrativos da Interpretação ' +
    'Técnica deste ensaio específico. Este NÃO é um certificado final — é uma leitura técnica de UM ciclo dentro ' +
    'de uma campanha de qualificação maior (outros ciclos/receitas são analisados em documentos separados, iguais ' +
    'a este, e reunidos depois por outro processo). Por isso não escreva introdução institucional nem objetivo de ' +
    'documento — vá direto à análise técnica do que foi medido neste ensaio.\n\n' +
    'Para o estudo incluído, escreva uma ANÁLISE TÉCNICA EXTENSA E DIDÁTICA — o leitor pode ser um responsável de ' +
    'CME ou administrador sem formação técnica em processos de esterilização, então o texto precisa literalmente ' +
    'ENSINAR, não só relatar. Regras específicas desta seção:\n' +
    '1. Se o bloco "Conformidade detalhada por posição/sensor" estiver presente no contexto, dedique um parágrafo ' +
    'específico a CADA sensor/posição individualmente (não só ao agregado global) — cite o F0 acumulado, a ' +
    'temperatura mínima/máxima/média durante a exposição, e se está conforme ou não em relação ao F0 mínimo ' +
    'normativo do ciclo.\n' +
    regraCausas +
    '3. Se não houver dados de conformidade por sensor (caso do teste de estanqueidade), escreva a análise de forma extensa e ' +
    'didática mesmo assim, interpretando os fatos agregados fornecidos (pressões, taxa de vazamento, limite).\n' +
    'Esta seção deve ter NO MÍNIMO 4 parágrafos substanciais quando houver dados por posição/sensor, e no mínimo 2 ' +
    'quando não houver — nunca um resumo curto.\n\n' +
    'A CONCLUSÃO TÉCNICA deve amarrar o que foi observado neste ciclo específico num texto extenso, denso e ' +
    'rigoroso, culminando no veredito deste ensaio — sem declarar qualificação final do ' +
    'equipamento como um todo, já que este documento cobre só este ciclo. Esta seção é dirigida a um público técnico ' +
    '(engenheiros, auditores, outros laboratórios) — use a terminologia correta com precisão total, cite os valores ' +
    'com exatidão e não simplifique nada aqui. O último parágrafo deve declarar o veredito de forma inequívoca ' +
    '("O ensaio está APROVADO" ou "O ensaio está REPROVADO"), citando o critério de aceitação e o valor decisivo ' +
    '(por exemplo, o pior sensor e o seu F0, ou a taxa de vazamento e o limite).\n\n' +
    'A CONCLUSÃO EM LINGUAGEM DE FÁCIL COMPREENSÃO deve comunicar exatamente o MESMO veredito e os mesmos fatos ' +
    'centrais da conclusão técnica, mas escrita para qualquer leitor sem formação técnica (ex.: um fiscal ' +
    'administrativo, um profissional de enfermagem, ou qualquer pessoa curiosa que abra o documento) — alguém que ' +
    'nunca ouviu falar de F0, letalidade térmica ou taxa de vazamento. Regras específicas desta seção:\n' +
    '- Nunca diverja do veredito ou dos números da conclusão técnica — é a mesma informação, só em outro vocabulário.\n' +
    '- Não use jargão sem explicar: se precisar citar um termo técnico, explique o que ele significa na mesma frase, ' +
    'em linguagem cotidiana (ex.: em vez de simplesmente citar "F0", explique que é a forma de medir se o calor foi ' +
    'suficiente e por tempo suficiente para garantir a eliminação de microrganismos).\n' +
    '- Tom respeitoso, cordial e profissional o tempo todo — nunca condescendente, nunca dê a entender que o leitor ' +
    'é menos capaz; é só uma explicação em linguagem mais direta, do tipo que qualquer pessoa desperta e atenta ' +
    'entenderia de primeira, mesmo sem nenhuma formação técnica.\n' +
    '- Explique o que foi verificado neste ensaio e o que o resultado significa na prática (por que isso importa ' +
    'pra segurança de quem usa o equipamento ou de quem é atendido com o material processado por ele).\n' +
    '- Também deve ser um texto substancial (vários parágrafos), não um resumo de uma linha.\n\n' +
    'CONTEXTO REAL DESTE ENSAIO (única fonte de fatos permitida):\n' + contextoStr + '\n\n' +
    AutoRel_acIAMontarInstrucaoFormato_(tiposEstudo);

  var respostaBruta = AutoRel_acIAChamarGemini_(prompt);
  var json;
  try {
    json = AutoRel_acIAExtrairPorMarcadores_(respostaBruta, tiposEstudo);
  } catch (e) {
    throw new Error('Falha ao gerar os textos do certificado: ' + e.message);
  }

  json.conclusaoGeral = SGO_DocA4_limparTextoIA_(json.conclusaoGeral);
  json.conclusaoLeigo = SGO_DocA4_limparTextoIA_(json.conclusaoLeigo);
  Object.keys(json.analisePorEstudo || {}).forEach(function(k) { json.analisePorEstudo[k] = SGO_DocA4_limparTextoIA_(json.analisePorEstudo[k]); });
  return json;
}
