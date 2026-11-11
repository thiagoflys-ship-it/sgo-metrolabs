/****************************************************
 * METROLABS — ESTUFA+BANHO-MARIA — TEXTOS DO CERTIFICADO (IA)
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
var EstufaBanhoRel_EBIA_TOKENS_CERTIFICADO = 8192;
var EstufaBanhoRel_EBIA_MODELO_PADRAO = 'gemini-2.5-flash';
var EstufaBanhoRel_EBIA_FALLBACKS_PADRAO = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
var EstufaBanhoRel_EBIA_ENDPOINT_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
var EstufaBanhoRel_EBIA_MAX_TENTATIVAS = 3;
var EstufaBanhoRel_EBIA_DELAYS_MS = [800, 1600];
function EstufaBanhoRel_ebIARegrasBase_() {
  return 'Você é engenheiro sênior em qualificação térmica de equipamentos de aquecimento (estufas de incubação, banhos-maria, estufas de esterilização/despirogenização e secadoras) e redige o certificado de qualificação térmica, no padrão de laboratórios de metrologia e engenharia clínica. Pense com cuidado antes de escrever: confira cada número com o contexto e não afirme nada que os dados não sustentem.\n' + SGO_DocA4_regrasRedacaoIA_() + '\n- Cada seção deve ser substancial e escrita a partir dos fatos; não copie frases prontas.';
}
var EstufaBanhoRel_EBIA_REGRAS_BASE = 'Você é um redator técnico especializado em certificados de qualificação térmica de equipamentos industriais/farmacêuticos ' + '(estufa de incubação, banho-maria), no padrão de laboratórios de metrologia e engenharia clínica.\n' + 'REGRAS ABSOLUTAS — nunca violar:\n' + '1. Nunca invente número, data, valor, veredito ou resultado que não esteja explicitamente no contexto fornecido.\n' + '2. Preserve e cite corretamente todos os valores numéricos e fatos fornecidos (mínima, máxima, média, desvio-padrão, ' + 'amplitude, tempos de ruptura/recuperação, vereditos de aprovação).\n' + '3. Não copie frases prontas de outro documento — escreva prosa original, extensa e fluida a partir dos fatos.\n' + '4. Não use markdown, negrito, itálico, listas ou títulos dentro dos textos — texto corrido, formal, em português brasileiro técnico.\n' + '5. Cada seção deve ser substancial (vários parágrafos quando fizer sentido) — não entregue resumos curtos.';

// Marcadores do protocolo de saída (substitui JSON): pedir texto longo e
// livre dentro de um JSON exige que a IA escape aspas/quebras de linha
// perfeitamente, o que ela faz mal em textos extensos — na prática gerava
// JSON inválido ("bad control character", "expected , or }") sempre que a
// prosa tinha uma quebra de parágrafo ou uma frase entre aspas. Marcadores
// de texto simples eliminam a necessidade de qualquer escape.
var EstufaBanhoRel_EBIA_MARC_INTRO = '###INTRODUCAO###';
var EstufaBanhoRel_EBIA_MARC_OBJETIVO = '###OBJETIVO###';
var EstufaBanhoRel_EBIA_MARC_ANALISE_PREFIXO = '###ANALISE:';
var EstufaBanhoRel_EBIA_MARC_CONCLUSAO = '###CONCLUSAO_GERAL###';
var EstufaBanhoRel_EBIA_MARC_FIM = '###FIM###';
function EstufaBanhoRel_ebIAObterConfig_() {
  var props = PropertiesService.getScriptProperties();
  var provider = (props.getProperty('IA_PROVIDER') || 'GEMINI').toUpperCase().trim();
  var model = (props.getProperty('IA_MODEL') || '').trim();
  var fbProp = (props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  return {
    provider: provider,
    model: model || EstufaBanhoRel_EBIA_MODELO_PADRAO,
    fallbacksRaw: fbProp,
    geminiKey: props.getProperty('GEMINI_API_KEY') || ''
  };
}
function EstufaBanhoRel_ebIAObterListaModelos_(cfg) {
  var lista = [cfg.model];
  var fb = cfg.fallbacksRaw ? cfg.fallbacksRaw.split(',').map(function (m) {
    return m.trim();
  }).filter(Boolean) : [].concat(EstufaBanhoRel_EBIA_FALLBACKS_PADRAO);
  fb.forEach(function (m) {
    if (lista.indexOf(m) === -1) lista.push(m);
  });
  return lista;
}
function EstufaBanhoRel_ebIAInterpretarErro_(codigo, corpo) {
  var msgApi = corpo && corpo.error && (corpo.error.message || corpo.error.status) || 'HTTP ' + codigo;
  if (codigo === 401 || codigo === 403) return SGO_DocSalvar_msgChaveIA_(codigo);
  if (codigo === 429) return 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.';
  if (codigo === 404) return 'Modelo não encontrado (HTTP 404): ' + msgApi;
  if (codigo >= 500) return 'Serviço de IA temporariamente indisponível (HTTP ' + codigo + '): ' + msgApi;
  return 'Erro na API de IA (HTTP ' + codigo + '): ' + msgApi;
}
function EstufaBanhoRel_ebIAERetentavel_(codigo) {
  return codigo === 500 || codigo === 503;
}
function EstufaBanhoRel_ebIAChamarGemini_(prompt) {
  // Chamada comum (SGO_DocA4): raciocínio ligado, temperatura baixa, resposta cortada nunca é aproveitada.
  return SGO_DocA4_chamarGemini_(prompt, { tokens: 32768, temperatura: 0.2 });
}

function EstufaBanhoRel_ebIAMontarInstrucaoFormato_(tiposEstudo) {
  var linhas = [];
  linhas.push('Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta ' + 'estrutura de marcadores, cada um sozinho em sua própria linha, nesta ordem:');
  linhas.push(EstufaBanhoRel_EBIA_MARC_INTRO);
  linhas.push('(texto da introdução aqui)');
  linhas.push(EstufaBanhoRel_EBIA_MARC_OBJETIVO);
  linhas.push('(texto do objetivo aqui)');
  tiposEstudo.forEach(function (t) {
    linhas.push(EstufaBanhoRel_EBIA_MARC_ANALISE_PREFIXO + t + '###');
    linhas.push('(texto da análise deste estudo aqui)');
  });
  linhas.push(EstufaBanhoRel_EBIA_MARC_CONCLUSAO);
  linhas.push('(texto da conclusão geral aqui)');
  linhas.push(EstufaBanhoRel_EBIA_MARC_FIM);
  linhas.push('O texto de cada seção pode ter várias linhas e parágrafos livremente, incluir aspas e pontuação ' + 'sem nenhuma restrição — não precisa escapar nada, não use aspas triplas nem crases dentro do texto.');
  return linhas.join('\n');
}

/**
 * Extrai as seções da resposta em texto pelo protocolo de marcadores.
 * Lança erro claro (citando a seção específica) se algum marcador não
 * aparecer — sintoma normal de corte por limite de tokens.
 */
function EstufaBanhoRel_ebIAExtrairPorMarcadores_(texto, tiposEstudo) {
  var limpo = String(texto || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
  var marcadoresAnalise = tiposEstudo.map(function (t) {
    return EstufaBanhoRel_EBIA_MARC_ANALISE_PREFIXO + t + '###';
  });
  var todosMarcadores = [EstufaBanhoRel_EBIA_MARC_INTRO, EstufaBanhoRel_EBIA_MARC_OBJETIVO].concat(marcadoresAnalise, [EstufaBanhoRel_EBIA_MARC_CONCLUSAO, EstufaBanhoRel_EBIA_MARC_FIM]);
  var anterior=-1;todosMarcadores.forEach(function(m){var pos=limpo.indexOf(m);if(pos<0||pos<=anterior||limpo.indexOf(m,pos+m.length)!==-1)throw new Error('Resposta incompleta ou fora de ordem: marcador '+m+'. Gere os textos novamente; nenhuma conclusão parcial será emitida.');anterior=pos;});
  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return null;
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    todosMarcadores.forEach(function (m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }
  var resultado = {
    introducao: acharBloco(EstufaBanhoRel_EBIA_MARC_INTRO),
    objetivo: acharBloco(EstufaBanhoRel_EBIA_MARC_OBJETIVO),
    analisePorEstudo: {},
    conclusaoGeral: acharBloco(EstufaBanhoRel_EBIA_MARC_CONCLUSAO)
  };
  var faltando = [];
  if (!resultado.introducao) faltando.push('introdução');
  if (!resultado.objetivo) faltando.push('objetivo');
  if (!resultado.conclusaoGeral) faltando.push('conclusão geral');
  tiposEstudo.forEach(function (t) {
    var v = acharBloco(EstufaBanhoRel_EBIA_MARC_ANALISE_PREFIXO + t + '###');
    resultado.analisePorEstudo[t] = v || '';
    if (!v) faltando.push('análise de ' + t);
  });
  if (faltando.length) {
    throw new Error('A IA não retornou todas as seções esperadas (faltando: ' + faltando.join(', ') + '). Provável corte por limite de tokens — tente gerar novamente.');
  }
  return resultado;
}

/**
 * Monta o "pacote de fatos" (contexto) que a IA pode usar — apenas
 * números/textos já calculados pelo Engine.js, nunca dado novo.
 */
function EstufaBanhoRel_ebIAMontarContextoCertificado_(dados) {
  var linhas = [];
  linhas.push('EQUIPAMENTO: ' + (dados.equipamentoLabel || '-'));
  linhas.push('ORIGEM: '+(dados.origemDados||'dados informados')+'. Não afirmar liberação automática de uso, aprovação normativa integral ou resultado de ensaio real quando a origem for simulada.');
  linhas.push('SENSORES UTILIZADOS: '+dados.sensoresUtilizados);
  linhas.push('REDAÇÃO: relate quantidade, identificação e resultados. Não compare a quantidade de sensores com referências nem justifique sua escolha. Não invente aprovação; siga o status calculado.');
  if(dados.perfilChave==='SECADORA_TRAQUEIAS')linhas.push('PERFIL: secadora de traqueias da CME. Seis estudos independentes, três em vazio e três com carga. Interprete cada estudo e consolide. Temperatura e duração configuradas pelo operador; não se trata de ensaio de esterilização/despirogenização, não calcular ou atribuir letalidade. Os dados fornecidos são térmicos; não afirmar medição de umidade ou comprovação de secagem que não foi medida.');
  linhas.push('TAG: ' + (dados.tag || '-'));
  linhas.push('CLIENTE: ' + (dados.cliente || '-'));
  linhas.push('SETOR/LOCALIZAÇÃO: ' + (dados.setor || '-'));
  linhas.push('FAIXA DE ACEITAÇÃO: ' + SGO_DocA4_val_(dados.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(dados.faixa.tMax, 1, '°C') + ' (tolerância ± ' + SGO_DocA4_val_(dados.faixa.tolerancia, 1, '°C') + ')');
  linhas.push('NORMAS APLICÁVEIS (cite somente estas): ' + dados.normas.join(' | '));
  linhas.push('CRITÉRIOS DE ACEITAÇÃO E RESULTADO OBTIDO POR ESTUDO (cite exatamente):');
  dados.estudos.forEach(function(e) { var c = SGO_DocA4_criterioEstudo_(e, dados.faixa); linhas.push('  - ' + c.criterio + ': requisito ' + c.requisito + '; obtido ' + c.obtido + '; situação ' + (c.conforme === true ? 'CONFORME' : (c.conforme === false ? 'NÃO CONFORME' : 'INFORMATIVO'))); });
  if (dados.registradores && dados.registradores.observacoes && dados.registradores.observacoes.length) linhas.push('RASTREABILIDADE DOS REGISTRADORES (mencione na análise): ' + dados.registradores.observacoes.join(' '));
  linhas.push('ESTUDOS INCLUÍDOS NESTE LAUDO: ' + dados.estudos.map(function (e) {
    return e.label;
  }).join(', '));
  linhas.push('');
  dados.estudos.forEach(function (e) {
    linhas.push('--- ESTUDO: ' + e.label + ' (tipo interno: ' + e.tipoEstudo + ') ---');
    linhas.push('Status de aprovação: ' + e.statusAprovacao);
    linhas.push('Fatos calculados (números já no formato brasileiro): ' + JSON.stringify(SGO_DocA4_fatosPtBr_(e.fatos)));
    if (e.motivosReprovacao && e.motivosReprovacao.length) linhas.push('Motivos de reprovação: ' + e.motivosReprovacao.join(' '));
    if (e.alertasAnalise && e.alertasAnalise.length) linhas.push('Alertas: ' + e.alertasAnalise.join(' '));
    if (e.observacoesAnalise && e.observacoesAnalise.length) linhas.push('Observações: ' + e.observacoesAnalise.join(' '));

    // Conformidade por posição/sensor, em formato legível (além do JSON
    // bruto acima) — é o dado central pra IA explicar POR POSIÇÃO, não só
    // no agregado. Cobre tanto excursão pra baixo (frio) quanto pra cima
    // (quente), sustentada ou pontual, cada sensor com seu próprio veredito.
    var cps = e.fatos && e.fatos.conformidadePorSensor || [];
    if (cps.length) {
      linhas.push('Conformidade detalhada por posição/sensor:');
      cps.forEach(function (c) {
        c = SGO_DocA4_fatosPtBr_(c);
        linhas.push('  ' + c.sensor + ': status ' + c.statusSensor + ' | mínima ' + c.min + ' °C | máxima ' + c.max + ' °C | média ' + c.media + ' °C' + ' | pior desvio ABAIXO do piso da faixa: ' + c.piorDesvioAbaixo + ' °C' + ' | pior desvio ACIMA do teto da faixa: ' + c.piorDesvioAcima + ' °C' + ' | tempo fora da faixa: ' + c.percentualForaFaixa + '% do período (' + c.minutosForaFaixa + ' min)' + ' | primeira leitura fora da faixa: ' + (c.primeiraLeituraForaFaixaStr || 'nenhuma') + ' | terminou o período fora da faixa: ' + (c.terminouForaFaixa ? 'SIM' : 'NÃO'));
      });
    }
    linhas.push('');
  });
  var stIA = SGO_DocA4_classeStatus_(dados.statusConsolidado);
  linhas.push('PARECER FINAL (use exatamente, sem forma intermediária): ' + (stIA === 'nok' ? 'NÃO QUALIFICADO PARA O USO PRETENDIDO' : (stIA === 'ok' ? 'QUALIFICADO PARA O USO PRETENDIDO' : 'CARACTERIZAÇÃO TÉRMICA, SEM CRITÉRIO DE APROVAÇÃO')) + '. Estudos com status APROVADO_COM_ALERTA estão APROVADOS: a excursão ficou dentro da tolerância declarada e deve ser descrita como observação.');
  return linhas.join('\n');
}

/**
 * Gera os textos narrativos do Certificado num único chamada de IA
 * (garante coerência de tom entre as seções). Retorna um objeto pronto
 * pra exibir em campos editáveis na tela antes de confirmar.
 */
function EstufaBanhoRel_ebIACriarTextosCertificado_(dadosContexto) {
  var contextoStr = EstufaBanhoRel_ebIAMontarContextoCertificado_(dadosContexto);
  var tiposEstudo = dadosContexto.estudos.map(function (e) {
    return e.tipoEstudo;
  });
  var prompt = EstufaBanhoRel_ebIARegrasBase_() + '\n\n' + 'TAREFA: com base no contexto de um Certificado de Qualificação Térmica abaixo, escreva os textos narrativos ' + 'do documento. A INTRODUÇÃO deve contextualizar, em 2 parágrafos extensos, a importância da qualificação térmica ' + 'para segurança do paciente e conformidade regulatória (registro formal, sem citar números específicos deste ' + 'ensaio ainda). O OBJETIVO deve declarar, em 1 a 2 parágrafos, o que este certificado especificamente verifica ' + 'e documenta, citando equipamento/TAG/cliente/faixa reais.\n\n' + 'Para CADA estudo, escreva uma ANÁLISE TÉCNICA EXTENSA E DIDÁTICA — o leitor pode ser um farmacêutico ou ' + 'administrador sem formação técnica em processos térmicos industriais, então o texto precisa literalmente ENSINAR, não só relatar. ' + 'Regras específicas desta seção:\n' + '1. Se o bloco "Conformidade detalhada por posição/sensor" estiver presente no contexto do estudo, dedique um ' + 'parágrafo específico a CADA sensor/posição individualmente (não só ao agregado global) — cite o status, a ' + 'direção do desvio (abaixo do piso = frio demais / acima do teto = quente demais), a magnitude, a duração/' + 'percentual do tempo fora da faixa, e se terminou ou não fora da faixa ao fim do período.\n' + '2. Para cada posição não conforme, explique em linguagem acessível as causas técnicas PROVÁVEIS mais comuns ' + 'para aquele padrão específico — sempre como hipótese/prática usual do setor, nunca como diagnóstico certo, ' + 'já que não houve inspeção física direta do equipamento. Estes são equipamentos de AQUECIMENTO (estufa de ' + 'incubação, banho-maria ou estufa de esterilização/despirogenização por calor seco), não refrigeração — adapte ' + 'a explicação ao padrão observado nesse sentido: um desvio FRIO DEMAIS e SUSTENTADO (a maior parte do tempo, ' + 'terminando fora da faixa) sugere resistência de aquecimento com potência insuficiente ou parcialmente ' + 'danificada, controlador/termostato com set point regulado abaixo do necessário, perda de calor por isolamento ' + 'térmico comprometido, ou posição do sensor numa zona de sombra térmica fora do fluxo de recirculação de ar ' + 'quente (ex.: perto de porta ou parede externa); um desvio QUENTE DEMAIS e SUSTENTADO sugere sensor posicionado ' + 'muito próximo da resistência/fonte de calor direta, controlador com sobressinal (overshoot) por sintonia ' + 'inadequada, ou ventilação/recirculação interna insuficiente causando acúmulo localizado de calor; um desvio ' + 'PONTUAL/TRANSITÓRIO (pequeno percentual do tempo, não presente no fim do período) sugere abertura de porta ' + 'durante o ensaio, ciclo normal de liga/desliga do controlador (histerese do termostato), ou oscilação ' + 'momentânea sem indicar falha estrutural do equipamento.\n' + '3. Traduza cada achado em orientação PRÁTICA E ACIONÁVEL: quais posições são adequadas para o processo ' + 'térmico avaliado e quais não são; se o padrão sugere ajuste simples (recalibração do controlador, reposicionamento ' + 'de carga, desobstrução de ventilação) versus necessidade de manutenção técnica mais profunda ou substituição ' + 'do equipamento.\n' + '4. Se não houver dados de conformidade por sensor (ex.: estudo de evento sem essa quebra), escreva a análise ' + 'de forma extensa e didática mesmo assim, interpretando os fatos agregados fornecidos.\n' + 'Esta seção deve ter NO MÍNIMO 4 parágrafos substanciais quando houver dados por posição, e no mínimo 2 quando ' + 'não houver — nunca um resumo curto.\n\n' + 'A CONCLUSÃO GERAL deve amarrar todos os estudos incluídos num texto extenso e coeso, culminando no veredito ' + 'consolidado, e resumindo (sem repetir todos os detalhes já ditos) quais posições do equipamento, se houver, ' + 'são utilizáveis com segurança e quais não são.\n\n' + 'CONTEXTO REAL DESTE ENSAIO (única fonte de fatos permitida):\n' + contextoStr + '\n\n' + EstufaBanhoRel_ebIAMontarInstrucaoFormato_(tiposEstudo);
  var respostaBruta = EstufaBanhoRel_ebIAChamarGemini_(prompt);
  var json;
  try {
    json = EstufaBanhoRel_ebIAExtrairPorMarcadores_(respostaBruta, tiposEstudo);
  } catch (e) {
    throw new Error('Falha ao gerar os textos do certificado: ' + e.message);
  }
  ['introducao', 'objetivo', 'conclusaoGeral', 'conclusaoLeigo'].forEach(function(k) { if (json[k]) json[k] = SGO_DocA4_limparTextoIA_(json[k]); });
  Object.keys(json.analisePorEstudo || {}).forEach(function(k) { json.analisePorEstudo[k] = SGO_DocA4_limparTextoIA_(json.analisePorEstudo[k]); });
  return json;
}
