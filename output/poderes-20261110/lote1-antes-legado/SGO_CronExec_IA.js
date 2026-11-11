/****************************************************
 * CRONOGRAMA DE EXECUÇÃO — TEXTOS DO DOCUMENTO (IA), 2026-08-11
 *
 * Mesmo padrão de SGO_PlanCME_IA.js: chamada 1x só, dentro de
 * CronExec_apiFinalizar (SGO_CronExec_Main.js) — o texto gerado fica
 * anexado em resultado.textosIA e o documento (Documento.js) só
 * reaproveita, nunca chama a IA de novo.
 *
 * REGRA CENTRAL: a IA nunca decide sozinha quantidade, data ou
 * composição de grupo — isso já vem pronto, calculado
 * deterministicamente por CronExec_sugerirGrupos_ (SGO_CronExec_Grupos.js).
 * A IA só escreve prosa em cima desses fatos já dados.
 ****************************************************/
var CRONEXECIA_TOKENS = 8192; // margem para o raciocínio do modelo (thinking) + texto; resposta cortada é tratada como falha
var CRONEXECIA_MODELOS_FALLBACK = ["gemini-2.5-flash", "gemini-2.0-flash"];
var CRONEXECIA_MAX_TENTATIVAS = 3;
var CRONEXECIA_DELAYS_MS = [800, 1600];

var CRONEXECIA_MARC_OBJETIVO = "###OBJETIVO###";
var CRONEXECIA_MARC_METODOLOGIA = "###METODOLOGIA###";
var CRONEXECIA_MARC_GRUPOS_INTRO = "###GRUPOS_INTRO###";
var CRONEXECIA_MARC_CONSIDERACOES = "###CONSIDERACOES_FINAIS###";
var CRONEXECIA_MARC_FIM = "###FIM###";

var CRONEXECIA_REGRAS_BASE =
  "Você é um redator técnico de engenharia clínica, especializado em documentar cronogramas de execução de " +
  "serviços de calibração e qualificação (QI/QO/QD) de equipamentos de esterilização e desinfecção em saúde.\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Nunca invente quantidade de equipamento, data, composição de grupo ou qualquer fato não presente " +
  "explicitamente no CONTEXTO abaixo — a lista de equipamentos, as quantidades, as datas e a divisão em grupos " +
  "já foram calculadas deterministicamente; você só escreve prosa técnica sobre esses fatos, nunca os recalcula " +
  "ou reinterpreta.\n" +
  "2. Ao descrever a metodologia (Calibração, QI, QO, QD), use SOMENTE as definições fornecidas no CONTEXTO — " +
  "nunca redefina o que cada etapa significa.\n" +
  "3. Não use markdown, negrito, itálico, listas ou títulos dentro dos textos — prosa corrida, técnica, formal, " +
  "em português brasileiro.\n" +
  "4. Nunca cite nome de marca ou fabricante específico, mesmo que o CONTEXTO informe a marca do equipamento — " +
  "refira-se a ele pelo tipo (ex.: 'as autoclaves', 'a lavadora ultrassônica').\n" +
  "5. Nunca prometa nenhum outro documento além deste próprio cronograma.\n" +
  "6. Cada seção deve ser específica do cliente e do escopo deste cronograma, nunca um texto genérico que " +
  "serviria para qualquer cronograma.\n" +
  "7. Nunca escreva 'a tabela abaixo', 'a tabela a seguir' ou 'acima': no documento, a lista de equipamentos é a " +
  "Tabela 1, os grupos com as datas são a Tabela 2 e o calendário dos grupos é a Figura 1. Cite pelo número quando " +
  "precisar e não repita as datas e quantidades que já estão nelas.";

function CronExecIA_montarInstrucaoFormato_(marcadoresAtivos) {
  var linhas = [];
  linhas.push(
    "Responda SOMENTE em texto puro (sem JSON, sem markdown, sem crase), seguindo EXATAMENTE esta estrutura de " +
    "marcadores, cada um sozinho em sua própria linha, NESTA ORDEM, e SOMENTE os marcadores listados abaixo:"
  );
  marcadoresAtivos.forEach(function (m) {
    linhas.push(m);
    linhas.push("(texto desta seção aqui)");
  });
  linhas.push(CRONEXECIA_MARC_FIM);
  linhas.push("O texto de cada seção pode ter vários parágrafos livremente — não precisa escapar nada.");
  return linhas.join("\n");
}

function CronExecIA_extrairPorMarcadores_(texto, marcadoresAtivos, mapaNomes) {
  var limpo = String(texto || "")
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  var todosMarcadores = marcadoresAtivos.concat([CRONEXECIA_MARC_FIM]);

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
      "). Provável corte por limite de tokens — tente gerar novamente."
    );
  }

  return resultado;
}

function CronExecIA_montarContexto_(cliente, equipamentos, agrupamento) {
  var linhas = [];
  var fund = agrupamento.fundamentacao || {};
  var grupos = agrupamento.grupos || [];

  linhas.push("CLIENTE: " + ((cliente && cliente.razaoSocial) || "-"));
  linhas.push("");
  linhas.push("LISTA DE EQUIPAMENTOS (na ordem informada):");
  equipamentos.forEach(function (e) {
    linhas.push("  - " + e.tipo + " " + (e.marca || "") + " " + (e.modelo || "") + " — quantidade: " + e.quantidade);
  });
  linhas.push("");
  linhas.push("TOTAL DE TIPOS DISTINTOS DE EQUIPAMENTO: " + equipamentos.length);
  linhas.push("TOTAL DE UNIDADES: " + (agrupamento.totalUnidades || 0));
  linhas.push("MODO: " + (agrupamento.modoUnico ? "grupo único" : ("dividido em " + (agrupamento.totalGrupos || grupos.length) + " grupos")));
  if (fund.estrategia) {
    linhas.push("FUNDAMENTAÇÃO DA ESTRATÉGIA DE AGRUPAMENTO (fato dado, não reinterprete): " + fund.estrategia);
  }
  linhas.push("");
  linhas.push("GRUPOS:");
  grupos.forEach(function (g) {
    linhas.push("  Grupo " + g.ordinal + " — período de " + CronExec_formatarDataBr_(g.dataInicio) + " a " + CronExec_formatarDataBr_(g.dataFim) + ":");
    (g.itens || []).forEach(function (item) {
      linhas.push("    - " + item.tipo + " " + (item.marca || "") + " " + (item.modelo || "") + " — quantidade: " + item.quantidade);
    });
  });
  linhas.push("");
  linhas.push("DEFINIÇÕES FIXAS DE METODOLOGIA (fato dado, não reinterprete o que cada etapa significa):");
  linhas.push("  CALIBRAÇÃO: " + CRONEXEC_CFG.METODOLOGIA_FATOS.CALIBRACAO);
  linhas.push("  QI: " + CRONEXEC_CFG.METODOLOGIA_FATOS.QI);
  linhas.push("  QO: " + CRONEXEC_CFG.METODOLOGIA_FATOS.QO);
  linhas.push("  QD: " + CRONEXEC_CFG.METODOLOGIA_FATOS.QD);

  return linhas.join("\n");
}

/**
 * Gera os textos do documento (Objetivo + Metodologia + [intro dos
 * Grupos, só se houver mais de 1] + Considerações Finais) numa ÚNICA
 * chamada de Gemini. Chamada 1x só, dentro de CronExec_apiFinalizar —
 * nunca durante a montagem/preview do documento, que só reaproveita o
 * texto já gerado.
 *
 * Lança erro se falhar — não existe "documento parcial" aqui, o
 * documento inteiro depende deste texto.
 */
function CronExec_gerarTextosIA_(cliente, equipamentos, agrupamento) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.");
  }

  var marcadoresAtivos = [CRONEXECIA_MARC_OBJETIVO, CRONEXECIA_MARC_METODOLOGIA];
  var mapaNomes = {};
  mapaNomes[CRONEXECIA_MARC_OBJETIVO] = "objetivo";
  mapaNomes[CRONEXECIA_MARC_METODOLOGIA] = "metodologia";

  var multiGrupo = !agrupamento.modoUnico && (agrupamento.grupos || []).length > 1;
  if (multiGrupo) {
    marcadoresAtivos.push(CRONEXECIA_MARC_GRUPOS_INTRO);
    mapaNomes[CRONEXECIA_MARC_GRUPOS_INTRO] = "gruposIntro";
  }
  marcadoresAtivos.push(CRONEXECIA_MARC_CONSIDERACOES);
  mapaNomes[CRONEXECIA_MARC_CONSIDERACOES] = "consideracoesFinais";

  var contextoStr = CronExecIA_montarContexto_(cliente, equipamentos, agrupamento);

  var prompt =
    CRONEXECIA_REGRAS_BASE + "\n\n" +
    "TAREFA: com base no contexto abaixo, escreva os textos de um CRONOGRAMA DE EXECUÇÃO de serviços de " +
    "calibração e qualificação técnica.\n\n" +
    "O OBJETIVO (1 a 2 parágrafos) deve apresentar a finalidade do documento: estabelecer o cronograma para " +
    "execução dos serviços de calibração e qualificação técnica (QI/QO/QD) dos equipamentos listados no " +
    "contexto, citando o cliente real e os tipos de equipamento envolvidos, garantindo conformidade técnica e " +
    "segurança para operadores e pacientes.\n\n" +
    "A METODOLOGIA (extenso) deve explicar, para os equipamentos deste cronograma, que cada um passa pela " +
    "sequência técnica: Calibração dos instrumentos/sensores, Qualificação de Instalação (QI), Qualificação de " +
    "Operação (QO) e Qualificação de Desempenho (QD) — usando as DEFINIÇÕES FIXAS DE METODOLOGIA do contexto " +
    "para descrever cada etapa, e mencionando os tipos de equipamento reais deste cronograma.\n\n" +
    (multiGrupo ?
      "O GRUPOS_INTRO (1 parágrafo curto) deve explicar, em prosa, a estratégia de divisão em grupos descrita na " +
      "FUNDAMENTAÇÃO DA ESTRATÉGIA DE AGRUPAMENTO do contexto — reproduza a lógica informada (por que os grupos " +
      "foram divididos assim), sem repetir os números já visíveis na tabela de grupos que acompanha o texto.\n\n" : "") +
    "As CONSIDERACOES_FINAIS (1 parágrafo) devem afirmar que as datas apresentadas são uma previsão estimada e " +
    "podem sofrer alterações conforme imprevistos técnicos, indisponibilidade de equipamentos ou interrupções " +
    "por parte da instituição, e reforçar o compromisso da empresa com qualidade, segurança e rastreabilidade " +
    "dos processos.\n\n" +
    "CONTEXTO REAL (única fonte de fatos permitida):\n" + contextoStr + "\n\n" +
    CronExecIA_montarInstrucaoFormato_(marcadoresAtivos);

  var errosPorModelo = [];
  for (var mi = 0; mi < CRONEXECIA_MODELOS_FALLBACK.length; mi++) {
    var modelo = CRONEXECIA_MODELOS_FALLBACK[mi];
    var erroModelo = "falha desconhecida";
    for (var tent = 0; tent < CRONEXECIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(CRONEXECIA_DELAYS_MS[tent - 1] || 1600);

      var url = "https://generativelanguage.googleapis.com/v1/models/" + encodeURIComponent(modelo) +
        ":generateContent?key=" + encodeURIComponent(chave);
      var resp = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, topP: 0.95, maxOutputTokens: CRONEXECIA_TOKENS }
        })
      });

      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        if (cand && cand.finishReason === 'MAX_TOKENS') { erroModelo = 'resposta da IA incompleta'; break; }
        var partes = cand && cand.content && cand.content.parts;
        var texto = (partes || []).map(function (p) { return p && p.text ? p.text : ""; }).join("").trim();
        if (!texto) { erroModelo = "resposta vazia"; break; }
        return CronExecIA_extrairPorMarcadores_(texto, marcadoresAtivos, mapaNomes);
      }

      if (codigo === 401 || codigo === 403) {
        throw new Error("Chave GEMINI_API_KEY inválida ou sem autorização (HTTP " + codigo + ").");
      }
      var msgApi = (corpo && corpo.error && corpo.error.message) || ("HTTP " + codigo);
      erroModelo = msgApi;
      if (codigo === 429 || codigo === 404) break; // tenta o próximo modelo
      if (codigo < 500) break; // erro de requisição, não adianta repetir
    }
    errosPorModelo.push(modelo + ": " + erroModelo);
  }

  throw new Error(
    "Falha ao gerar os textos do cronograma após tentar " + CRONEXECIA_MODELOS_FALLBACK.length +
    " modelo(s) — " + errosPorModelo.join(" | ")
  );
}
