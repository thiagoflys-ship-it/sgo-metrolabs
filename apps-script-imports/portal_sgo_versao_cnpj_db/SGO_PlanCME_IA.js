/****************************************************
 * PLANEJAMENTO CME — TEXTOS DO DOCUMENTO (IA), 2026-07-25
 *
 * Diferente de PlanCME_refinarTextoIA (acima — polimento de texto livre do
 * operador), esta é a IA que escreve a fundamentação técnica dos 2
 * documentos gerados (Planejamento e Justificativa+ERU). Chamada 1x só,
 * dentro de PlanCME_calcularPlanejamento (SGO_PlanCME_Calculo.js) — o texto gerado fica
 * anexado em resultado.textosIA e os 2 documentos (Documento.js) só
 * reaproveitam, nunca chamam a IA de novo. Isso garante que os 2
 * documentos nunca descrevam o mesmo cálculo de forma divergente.
 *
 * REGRA CENTRAL: a IA nunca decide sozinha qual é a base de uma
 * exigência (normativa vs. protocolo do fabricante vs. critério próprio
 * da Metrolabs) — isso já vem pronto, calculado deterministicamente, em
 * resultado.fundamentacao (ver PlanCME_montarFundamentacao_ em SGO_PlanCME_Calculo.js). A IA
 * só escreve prosa técnica em cima dessas afirmações já dadas, nunca
 * inventa norma, artigo ou número novo.
 ****************************************************/
var PLANCMEIA_TOKENS = 8192;
var PLANCMEIA_MODELOS_FALLBACK = ["gemini-2.5-flash", "gemini-2.0-flash"];
var PLANCMEIA_MAX_TENTATIVAS = 3;
var PLANCMEIA_DELAYS_MS = [800, 1600];

var PLANCMEIA_MARC_INTRO = "###INTRODUCAO###";
var PLANCMEIA_MARC_QI = "###FUNDAMENTACAO_QI###";
var PLANCMEIA_MARC_QO = "###FUNDAMENTACAO_QO###";
var PLANCMEIA_MARC_QD = "###FUNDAMENTACAO_QD###";
var PLANCMEIA_MARC_ERU = "###ORIENTACAO_ERU###";
var PLANCMEIA_MARC_CONCLUSAO = "###CONCLUSAO###";
var PLANCMEIA_MARC_FIM = "###FIM###";

var PLANCMEIA_REGRAS_BASE =
  "Você é um redator técnico de engenharia clínica, especializado em documentar o dimensionamento de insumos " +
  "para qualificação de instalação/operação/desempenho (QI/QO/QD) de equipamentos de esterilização e desinfecção " +
  "em saúde.\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Nunca invente norma, artigo, cláusula, protocolo ou número — use SOMENTE o que está explicitamente no " +
  "CONTEXTO fornecido abaixo.\n" +
  "2. Sempre que mencionar uma exigência (sensores, indicadores, Bowie-Dick, repetições), diga explicitamente " +
  "qual é a NATUREZA dela, exatamente como informado no CONTEXTO: (a) exigência NORMATIVA — cite a norma/artigo/" +
  "anexo tal como fornecido; (b) protocolo/documentação técnica do FABRICANTE; ou (c) critério técnico PRÓPRIO da " +
  "Metrolabs. Nunca deixe ambíguo qual das três é, e nunca troque uma pela outra.\n" +
  "3. Nunca prometa ou mencione nenhum outro documento futuro além da 'Justificativa Técnica e E.R.U.' que este " +
  "mesmo sistema já gera quando solicitado — isso já existe, não é uma promessa vaga.\n" +
  "4. Não use markdown, negrito, itálico, listas ou títulos dentro dos textos — prosa corrida, técnica, formal, " +
  "em português brasileiro.\n" +
  "5. Cada seção deve ser extensa e tecnicamente rica, específica do equipamento e dos itens deste planejamento — " +
  "nunca texto genérico que serviria para qualquer equipamento.\n" +
  "6. NUNCA cite nome de marca, fabricante específico, modelo de instrumento de medição ou produto comercial " +
  "(mesmo que o CONTEXTO mencione 'protocolo do fabricante' como natureza da exigência, isso é sempre genérico — " +
  "'o fabricante do equipamento', nunca um nome próprio). O mesmo documento atende clientes com equipamentos de " +
  "marcas diferentes; citar uma marca específica tornaria o texto incoerente para os demais.\n" +
  "7. O texto precisa ser tecnicamente irretocável e argumentativamente sólido o suficiente para dissipar " +
  "qualquer questionamento técnico do cliente sobre o dimensionamento — cada afirmação deve soar inquestionável " +
  "porque está apoiada exatamente na fonte (norma ou protocolo) informada no contexto, nunca em opinião. Isso não " +
  "significa exagerar ou ser categórico além do que a fonte permite — significa ser preciso, completo e bem " +
  "encadeado, sem lacunas que abram margem a dúvida.\n" +
  "8. Cada exigência mencionada no CONTEXTO já vem com UMA ÚNICA classificação de natureza (normativa, protocolo " +
  "do fabricante ou critério próprio da Metrolabs) — NUNCA atribua uma segunda classificação diferente ao mesmo " +
  "item dentro do texto, mesmo que pareça reforçar a redação. Se o CONTEXTO afirma que um item é 100% normativo, " +
  "ele permanece 100% normativo do início ao fim do texto — não acrescente frases como 'a Metrolabs também o " +
  "adota como critério próprio' para um item já classificado como normativo, isso cria uma contradição direta.\n" +
  "9. Nunca atribua a um integrador/indicador uma capacidade que ele não tem, mesmo que pareça reforçar a força " +
  "do texto: o integrador/indicador químico verifica apenas condições FÍSICAS de exposição (tempo, temperatura, " +
  "presença do agente esterilizante) — ele NÃO comprova sozinho a esterilização microbiológica; só o indicador " +
  "biológico comprova isso (morte de esporos-teste). Quando o CONTEXTO indicar que os dois são usados juntos na " +
  "mesma posição, deixe explícito que estão sempre juntos, simultâneos, no mesmo ponto — nunca como alternativas " +
  "ou opções separadas.";

function PlanCMEIA_montarInstrucaoFormato_(marcadoresAtivos) {
  var linhas = [];
  linhas.push(
    "Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta estrutura de " +
    "marcadores, cada um sozinho em sua própria linha, NESTA ORDEM, e SOMENTE os marcadores listados abaixo:"
  );
  marcadoresAtivos.forEach(function (m) {
    linhas.push(m);
    linhas.push("(texto desta seção aqui)");
  });
  linhas.push(PLANCMEIA_MARC_FIM);
  linhas.push("O texto de cada seção pode ter vários parágrafos livremente — não precisa escapar nada.");
  return linhas.join("\n");
}

function PlanCMEIA_extrairPorMarcadores_(texto, marcadoresAtivos, mapaNomes) {
  var limpo = String(texto || "")
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  var todosMarcadores = marcadoresAtivos.concat([PLANCMEIA_MARC_FIM]);

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

  var resultado = {};
  var faltando = [];
  marcadoresAtivos.forEach(function (m) {
    var v = acharBloco(m);
    resultado[mapaNomes[m]] = v || "";
    if (!v) faltando.push(mapaNomes[m]);
  });

  if (faltando.length) {
    throw new Error(
      "A IA não retornou todas as seções esperadas (faltando: " + faltando.join(", ") +
      "). Provável corte por limite de tokens — tente calcular novamente."
    );
  }

  return resultado;
}

function PlanCMEIA_montarContexto_(dados, resultado) {
  var linhas = [];
  var equipamento = dados.equipamento || {};
  // Mesmo formato plano de PlanCME_gerarJustificativasIA_ acima (dados.qi/qo/qd,
  // não dados.servicos.qi/qo/qd) — ver nota lá.
  var servicos = { qi: !!dados.qi, qo: !!dados.qo, qd: !!dados.qd, bowieDick: !!dados.bowieDick };
  var fund = resultado.fundamentacao || {};

  linhas.push("CLIENTE: " + ((dados.cliente && dados.cliente.razaoSocial) || "-"));
  linhas.push("TIPO DE EQUIPAMENTO: " + (equipamento.tipo || "-"));
  linhas.push("TIPO DE PROCESSO: " + (equipamento.tipoProcesso || "-"));
  linhas.push("MARCA/MODELO: " + (equipamento.marca || "-") + " / " + (equipamento.modelo || "-"));
  linhas.push("VOLUME DA CÂMARA: " + (equipamento.volume || "-") + " litros");
  linhas.push("");
  linhas.push("ESCOPO CONTRATADO: QI=" + (servicos.qi ? "SIM" : "NAO") + " | QO=" + (servicos.qo ? "SIM" : "NAO") +
    " | QD=" + (servicos.qd ? "SIM" : "NAO") + " | Bowie-Dick=" + (servicos.bowieDick ? "SIM" : "NAO"));
  linhas.push("RECEITAS/CICLOS INFORMADOS: " + ((Array.isArray(dados.ciclos) && dados.ciclos.length) ? dados.ciclos.join(", ") : "nenhuma"));
  linhas.push("");
  linhas.push("QUANTIDADE DE SENSORES CALCULADA: " + (resultado.sensores || 0));
  if (fund.basisSensores) linhas.push("BASE DA QUANTIDADE DE SENSORES (fato dado, não reinterprete): " + fund.basisSensores);
  if (fund.basisIndicadores) linhas.push("BASE DOS INDICADORES/TESTES (fato dado, não reinterprete): " + fund.basisIndicadores);
  if (fund.basisBowieDick) linhas.push("BASE DO BOWIE-DICK (fato dado, não reinterprete): " + fund.basisBowieDick);
  linhas.push("");
  linhas.push("QUANTITATIVO DE INSUMOS CALCULADO (já inclui margem de segurança de " + (((resultado.margem || 1.2) - 1) * 100).toFixed(0) + "%):");
  (resultado.insumos || []).forEach(function (item) {
    linhas.push("  - " + item.nome + ": base " + (item.base || 0) + ", total com margem " + (item.total || 0));
  });

  if (servicos.qi && resultado.checklistQI && resultado.checklistQI.length) {
    linhas.push("");
    linhas.push("ITENS DO CHECKLIST DE QI (só descreva os itens desta lista, na ordem em que aparecem):");
    resultado.checklistQI.forEach(function (item) { linhas.push("  - " + item); });
  }

  var usaPrions = (resultado.totalIQPrion || 0) > 0;
  if (usaPrions) {
    linhas.push("");
    linhas.push("RECEITA DE PRÍONS PRESENTE: sim — para esta receita, o planejamento usa integrador químico específico " +
      "para Príons no lugar do integrador químico convencional, mantendo o indicador biológico por sensor.");
  }

  linhas.push("");
  linhas.push("TEXTO-BASE SOBRE E.R.U. (reescreva com mais formalidade, sem mudar o sentido nem inventar conteúdo novo): " +
    PLANCME_CFG.TEXTOS.ERU);

  return linhas.join("\n");
}

/**
 * Gera os textos do documento (Introdução + Fundamentação de QI/QO/QD +
 * Orientação de E.R.U. + Conclusão) numa ÚNICA chamada de Gemini. Chamada
 * 1x só, dentro de PlanCME_calcularPlanejamento — nunca durante
 * PlanCME_apiMontarDocumentoFinal (Documento.js), que só reaproveita o
 * texto já gerado no documento único.
 *
 * Diferente de PlanCME_refinarTextoIA (nunca trava, é conveniência opcional):
 * esta função LANÇA ERRO se falhar — não existe "documento parcial" ou
 * "sem fundamentação" aqui, o documento inteiro depende deste texto.
 */
function PlanCME_gerarJustificativasIA_(dados, resultado) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A chave GEMINI_KEY não foi configurada nas propriedades do script.");
  }

  // PlanCME_gerarJustificativasIA_ é chamada só dentro de PlanCME_calcularPlanejamento
  // (Calculo.js), que recebe o payload no formato PLANO (dados.qi/qo/qd
  // direto, não dados.servicos.qi/qo/qd) — formato diferente do payload
  // usado depois por PlanCME_apiMontarDocumentoFinal (que vem de
  // montarPayloadFinal_() no frontend, com os campos agrupados em
  // "servicos"). Normaliza aqui pra manter o resto da função legível.
  var servicos = { qi: !!dados.qi, qo: !!dados.qo, qd: !!dados.qd, bowieDick: !!dados.bowieDick };
  var marcadoresAtivos = [PLANCMEIA_MARC_INTRO];
  var mapaNomes = {};
  mapaNomes[PLANCMEIA_MARC_INTRO] = "introducao";
  if (servicos.qi) { marcadoresAtivos.push(PLANCMEIA_MARC_QI); mapaNomes[PLANCMEIA_MARC_QI] = "fundamentacaoQI"; }
  if (servicos.qo) { marcadoresAtivos.push(PLANCMEIA_MARC_QO); mapaNomes[PLANCMEIA_MARC_QO] = "fundamentacaoQO"; }
  if (servicos.qd) { marcadoresAtivos.push(PLANCMEIA_MARC_QD); mapaNomes[PLANCMEIA_MARC_QD] = "fundamentacaoQD"; }
  marcadoresAtivos.push(PLANCMEIA_MARC_ERU);
  mapaNomes[PLANCMEIA_MARC_ERU] = "orientacaoERU";
  marcadoresAtivos.push(PLANCMEIA_MARC_CONCLUSAO);
  mapaNomes[PLANCMEIA_MARC_CONCLUSAO] = "conclusao";

  var contextoStr = PlanCMEIA_montarContexto_(dados, resultado);

  // O Bowie-Dick só tem instrução dedicada dentro do bloco de QO (abaixo)
  // — mas o checkbox de Bowie-Dick é INDEPENDENTE de QO estar contratado
  // (achado real 2026-07-28: cliente contratou só QD+Bowie-Dick, sem QO,
  // e a IA — sem nenhuma seção "dona" do Bowie-Dick pra escrever — acabou
  // inventando que ele "é parte integrante da Qualificação de Operação"
  // dentro da Fundamentação de QD, uma seção que nem existia no
  // documento). Quando isso acontece, precisamos apontar explicitamente
  // pra IA ONDE explicar o item, escolhendo a melhor seção ativa
  // disponível (QD > QI), sem nunca afirmar que ele pertence a uma etapa
  // não contratada.
  // Gatilho tem que checar se o Bowie-Dick REALMENTE se aplica (fund.basisBowieDick
  // só vem preenchido pro Vapor, ver PlanCME_montarFundamentacao_ em SGO_PlanCME_Calculo.js) — não só
  // o checkbox marcado. Sem essa checagem, marcar o checkbox num processo que não
  // é Vapor (Peróxido/Formaldeído/ETO, onde o item não existe fisicamente) injeta
  // no prompt uma instrução de fallback morta/desnecessária pra IA.
  var bowieDickPrecisaFallback = servicos.bowieDick && !servicos.qo && !!(resultado.fundamentacao && resultado.fundamentacao.basisBowieDick);
  var bowieDickFallbackAlvo = bowieDickPrecisaFallback
    ? (servicos.qd ? "QD" : (servicos.qi ? "QI" : "INTRODUCAO"))
    : "";
  function instrucaoBowieDickFallback_(secaoAtual) {
    if (bowieDickFallbackAlvo !== secaoAtual) return "";
    return "Se houver BASE DO BOWIE-DICK no contexto (a Qualificação de Operação não foi contratada neste " +
      "escopo, então não existe uma FUNDAMENTACAO_QO pra explicar esse item), explique o Bowie-Dick aqui, nesta " +
      "seção, como um item independente do escopo — reproduza A ÚNICA classificação de natureza dada na fonte " +
      "(normativa OU própria, nunca as duas) e NUNCA afirme que o Bowie-Dick é 'parte' ou está 'incluído' na " +
      "Qualificação de Operação, já que essa etapa não foi contratada neste documento (ver regra 8).\n\n";
  }

  var prompt =
    PLANCMEIA_REGRAS_BASE + "\n\n" +
    "TAREFA: com base no contexto abaixo, escreva os textos de um PLANEJAMENTO TÉCNICO E QUANTITATIVO DE INSUMOS " +
    "para qualificação do equipamento indicado.\n\n" +
    "A INTRODUCAO (1 a 2 parágrafos) deve apresentar o objetivo do documento: dimensionar tecnicamente os " +
    "insumos necessários para a qualificação do equipamento identificado, citando cliente/tipo de processo/volume " +
    "reais do contexto, sem julgar se o equipamento está apto ou não — este documento é só o dimensionamento.\n\n" +
    instrucaoBowieDickFallback_("INTRODUCAO") +
    (servicos.qi ?
      "A FUNDAMENTACAO_QI (extenso) deve explicar o que é a Qualificação de Instalação e detalhar, um a um, os " +
      "itens do checklist de QI listados no contexto — o que cada item verifica e por que é relevante pra " +
      "instalação correta do equipamento.\n\n" +
      instrucaoBowieDickFallback_("QI") : "") +
    (servicos.qo ?
      "A FUNDAMENTACAO_QO (extenso) deve explicar o estudo de distribuição de temperatura em ciclo vazio, citando " +
      "EXATAMENTE a BASE DA QUANTIDADE DE SENSORES fornecida no contexto (reproduza a natureza normativa/" +
      "protocolo/critério próprio tal como informado, nunca troque). Se a BASE DOS INDICADORES/TESTES fornecida " +
      "no contexto mencionar 3 indicadores biológicos e 3 integradores químicos fixos por repetição (regime QI+QO " +
      "sem QD contratado), explique esse item AQUI na FUNDAMENTACAO_QO, deixando claro que é critério técnico " +
      "PRÓPRIO da Metrolabs (não normativo) adotado porque o escopo contratado não inclui Qualificação de " +
      "Desempenho, e que a quantidade fixa (3+3) não decorre de contagem de sensores. Se houver BASE DO " +
      "BOWIE-DICK no contexto, explique também esse teste reproduzindo A ÚNICA classificação de natureza dada na " +
      "fonte (normativa OU própria, nunca as duas) — se a fonte disser que o Bowie-Dick é INTEGRALMENTE " +
      "normativo, NÃO adicione nenhuma frase sugerindo que a Metrolabs também o adota por conta própria (ver " +
      "regra 8).\n\n" : "") +
    (servicos.qd ?
      "A FUNDAMENTACAO_QD (extenso) deve explicar o estudo de distribuição de temperatura com carga, citando " +
      "EXATAMENTE a BASE DOS INDICADORES/TESTES fornecida no contexto — reproduzindo fielmente que NENHUM dos " +
      "dois indicadores (químico e biológico) é critério técnico próprio da Metrolabs quando a fonte disser que " +
      "ambos são exigência normativa — nunca rebaixe o indicador biológico a 'critério próprio' se a fonte disser " +
      "que ele é normativo. Reproduza fielmente o que a fonte diz sobre o que cada indicador comprova (o químico " +
      "verifica só condição física de exposição; o biológico comprova a eficácia microbiológica) e deixe claro que " +
      "os dois são aplicados juntos, na mesma posição, nunca como alternativas (ver regra 9). Se houver receita de " +
      "Príons, explique a substituição do integrador químico convencional pelo específico para Príons.\n\n" +
      instrucaoBowieDickFallback_("QD") : "") +
    "A ORIENTACAO_ERU deve reescrever formalmente o TEXTO-BASE SOBRE E.R.U. fornecido no contexto, mantendo o " +
    "mesmo conteúdo e intenção, mas deixando ainda mais explícitas estas 4 diretrizes (nesta ordem de ideia, sem " +
    "precisar numerar no texto): (1) a alteração de qualquer premissa deste planejamento (sensores, ciclos, " +
    "receitas, testes, quantitativos) só pode partir de decisão PRÓPRIA da instituição contratante — nunca da " +
    "Metrolabs, que apenas recomenda o critério tecnicamente fundamentado; (2) caso a instituição (por meio do " +
    "setor de qualidade, responsável técnico ou setor competente) não concorde e queira agir de forma diferente da " +
    "sugerida, essa decisão deve ser formalizada pela PRÓPRIA instituição no documento de Especificação de " +
    "Requisitos do Usuário (E.R.U.), já fornecido pronto pela Metrolabs para agilizar isso, explicitando as " +
    "diretrizes que deseja adotar; (3) a partir da assinatura da E.R.U. pelo responsável técnico ou setor " +
    "competente da instituição, TODA a responsabilidade técnica, regulatória e legal por eventuais achados, não " +
    "conformidades ou questionamentos em fiscalizações, auditorias ou inspeções de órgãos competentes decorrentes " +
    "dessa alteração passa a ser INTEIRAMENTE da instituição signatária, nunca da Metrolabs; (4) a Metrolabs se " +
    "compromete a seguir fielmente o que for formalizado na E.R.U. — inclusive flexibilização de quantitativo de " +
    "insumos —, tendo atuado, nesse cenário, apenas como executora da orientação técnica determinada pelo setor " +
    "responsável da instituição contratante.\n\n" +
    "A CONCLUSAO (1 parágrafo) deve fechar afirmando que o quantitativo apresentado está tecnicamente " +
    "fundamentado conforme descrito neste documento, com base nas normas e/ou protocolos citados, e que qualquer " +
    "divergência de critério só pode ser formalizada pela própria instituição contratante através do processo de " +
    "E.R.U. já descrito — com TODA a responsabilidade técnica, regulatória e legal por essa alteração (inclusive " +
    "perante fiscalizações, auditorias e inspeções de órgãos competentes) recaindo inteiramente sobre quem assina " +
    "a E.R.U., nunca sobre a Metrolabs, que atua apenas seguindo fielmente o que for formalizado — sem prometer " +
    "nenhum outro documento.\n\n" +
    "CONTEXTO REAL (única fonte de fatos permitida):\n" + contextoStr + "\n\n" +
    PlanCMEIA_montarInstrucaoFormato_(marcadoresAtivos);

  var errosPorModelo = [];
  for (var mi = 0; mi < PLANCMEIA_MODELOS_FALLBACK.length; mi++) {
    var modelo = PLANCMEIA_MODELOS_FALLBACK[mi];
    var erroModelo = "falha desconhecida";
    for (var tent = 0; tent < PLANCMEIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(PLANCMEIA_DELAYS_MS[tent - 1] || 1600);

      var url = "https://generativelanguage.googleapis.com/v1/models/" + encodeURIComponent(modelo) +
        ":generateContent?key=" + encodeURIComponent(chave);
      var resp = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: PLANCMEIA_TOKENS }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var partes = cand && cand.content && cand.content.parts;
        var texto = (partes || []).map(function (p) { return p && p.text ? p.text : ""; }).join("").trim();
        if (!texto) { erroModelo = "resposta vazia"; break; }
        return PlanCMEIA_extrairPorMarcadores_(texto, marcadoresAtivos, mapaNomes);
      }

      if (codigo === 401 || codigo === 403) {
        throw new Error("Chave GEMINI_KEY inválida ou sem autorização (HTTP " + codigo + ").");
      }
      var msgApi = (corpo && corpo.error && corpo.error.message) || ("HTTP " + codigo);
      erroModelo = msgApi;
      if (codigo === 429 || codigo === 404) break; // tenta o próximo modelo
      if (codigo < 500) break; // erro de requisição, não adianta repetir
    }
    errosPorModelo.push(modelo + ": " + erroModelo);
  }

  throw new Error(
    "Falha ao gerar a fundamentação técnica do planejamento após tentar " + PLANCMEIA_MODELOS_FALLBACK.length +
    " modelo(s) — " + errosPorModelo.join(" | ")
  );
}

function PlanCME_refinarTextoIA(texto) {
  try {
    const props = PropertiesService.getScriptProperties();
    const chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();

    if (!chave) {
      return {
        ok: false,
        mensagem: "A chave GEMINI_KEY não foi configurada nas propriedades do script."
      };
    }

    const textoEntrada = String(texto || "").trim();
    if (!textoEntrada) {
      return {
        ok: false,
        mensagem: "Nenhum texto foi informado para refinamento."
      };
    }

    const modelosFallback = [
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ];

    const promptBase =
      "Você é um redator técnico-comercial da Metrolabs.\n\n" +
      "Reescreva o texto abaixo em português do Brasil, com linguagem técnica, profissional, clara, objetiva e natural.\n\n" +
      "Regras obrigatórias:\n" +
      "- manter fidelidade total ao conteúdo original;\n" +
      "- não inventar normas, dados, quantidades, datas, requisitos ou fatos;\n" +
      "- não resumir indevidamente;\n" +
      "- não omitir informação relevante;\n" +
      "- corrigir informalidades, gramática, clareza, coerência e fluidez;\n" +
      "- manter tom técnico e respeitoso;\n" +
      "- não usar saudações, comentários, introduções como 'segue abaixo', títulos artificiais, aspas externas ou markdown;\n" +
      "- retornar exclusivamente o texto final pronto para colar em documento oficial;\n" +
      "- não cortar frases.\n\n" +
      "Texto de entrada:\n" + textoEntrada;

    function montarUrl_(modelo, chaveApi) {
      return (
        "https://generativelanguage.googleapis.com/v1/models/" +
        encodeURIComponent(modelo) +
        ":generateContent?key=" +
        encodeURIComponent(chaveApi)
      );
    }

    function limparSaida_(texto) {
      let out = String(texto || "").trim();
      out = out.replace(/^```[a-zA-Z0-9_-]*\s*/i, "");
      out = out.replace(/\s*```$/i, "");
      out = out.replace(/^["“”']+/, "");
      out = out.replace(/["“”']+$/, "");
      out = out.replace(/^\s*(aqui está|segue abaixo|segue|texto refinado:|versão refinada:)\s*/i, "");
      return out.trim();
    }

    function extrairTexto_(json) {
      const candidato =
        json &&
        json.candidates &&
        json.candidates.length
          ? json.candidates[0]
          : null;

      if (!candidato) {
        return {
          texto: "",
          finishReason: ""
        };
      }

      const partes =
        candidato &&
        candidato.content &&
        Array.isArray(candidato.content.parts)
          ? candidato.content.parts
          : [];

      const texto = partes
        .map(function (p) {
          return p && typeof p.text === "string" ? p.text : "";
        })
        .join("")
        .trim();

      return {
        texto: texto,
        finishReason: String(candidato.finishReason || "").trim()
      };
    }

    function chamarModelo_(modelo, prompt) {
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      };

      const resposta = UrlFetchApp.fetch(montarUrl_(modelo, chave), {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const code = resposta.getResponseCode();
      const body = resposta.getContentText();

      let json = null;
      try {
        json = JSON.parse(body);
      } catch (e) {}

      if (code < 200 || code >= 300) {
        let detalhe = body;
        if (json && json.error && json.error.message) {
          detalhe = json.error.message;
        }

        return {
          ok: false,
          modelo: modelo,
          mensagem: String(detalhe || "Falha na chamada da API."),
          texto: "",
          finishReason: ""
        };
      }

      if (!json) {
        return {
          ok: false,
          modelo: modelo,
          mensagem: "A resposta da API não pôde ser interpretada.",
          texto: "",
          finishReason: ""
        };
      }

      const extraido = extrairTexto_(json);
      const textoSaida = limparSaida_(extraido.texto);

      if (!textoSaida) {
        return {
          ok: false,
          modelo: modelo,
          mensagem: "A IA não retornou texto utilizável.",
          texto: "",
          finishReason: extraido.finishReason || ""
        };
      }

      return {
        ok: true,
        modelo: modelo,
        mensagem: "",
        texto: textoSaida,
        finishReason: extraido.finishReason || ""
      };
    }

    let respostaOk = null;
    const erros = [];

    for (var i = 0; i < modelosFallback.length; i++) {
      const tentativa = chamarModelo_(modelosFallback[i], promptBase);

      if (tentativa.ok) {
        respostaOk = tentativa;
        break;
      }

      erros.push("[" + tentativa.modelo + "] " + tentativa.mensagem);
    }

    if (!respostaOk) {
      return {
        ok: false,
        mensagem: "Falha ao consultar a IA em todos os modelos configurados. Detalhes: " + erros.join(" | ")
      };
    }

    let textoFinal = respostaOk.texto;

    if (respostaOk.finishReason === "MAX_TOKENS") {
      const promptContinuacao =
        "Continue EXATAMENTE do ponto onde o texto abaixo parou.\n" +
        "Não reinicie, não repita trechos, não explique nada, não use título e não use aspas.\n" +
        "Apenas continue o texto até concluí-lo com fechamento natural.\n\n" +
        "Texto original do usuário:\n" + textoEntrada + "\n\n" +
        "Texto já gerado:\n" + textoFinal;

      for (var j = 0; j < modelosFallback.length; j++) {
        const cont = chamarModelo_(modelosFallback[j], promptContinuacao);
        if (cont.ok) {
          const trecho = String(cont.texto || "").trim();
          if (trecho) {
            textoFinal = (textoFinal + " " + trecho).replace(/\s+/g, " ").trim();
          }
          break;
        }
      }
    }

    return {
      ok: true,
      texto: textoFinal,
      modeloUsado: respostaOk.modelo
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro no refinamento por IA: " + e.message
    };
  }
}