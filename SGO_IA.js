/**
 * SGO_IA.js - METROLABS SGO+
 * Camada de IA para textos tecnicos do modulo interno de O.S.
 */

var SGO_IA = (function() {
  var MAX_CHARS = 8000;
  var MAX_TENTATIVAS = 3;
  var DELAYS_MS = [800, 1600];
  var MODELO_GEMINI_PAD = "gemini-2.5-flash";
  var MODELO_ANT_PAD = "claude-haiku-4-5-20251001";
  var FALLBACKS_PADRAO = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
  var ENDPOINT_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";
  var ENDPOINT_ANT = "https://api.anthropic.com/v1/messages";
  var ANT_VER = "2023-06-01";
  var TOKENS_TEXTO_COMPLETO_OS = 3500;

  var REGRAS_BASE =
    "Voce e um assistente de redacao tecnica para ordens de servico de engenharia clinica.\n" +
    "REGRAS ABSOLUTAS - nunca viole:\n" +
    "1. Nunca invente dados ausentes: medicao, resultado de teste, peca trocada, aprovacao, calibracao, qualificacao, evidencia fotografica, assinatura ou resultado nao informado.\n" +
    "2. Preserve todos os fatos, valores numericos e termos tecnicos do texto original.\n" +
    "3. Nao adicione informacoes que nao estao no texto fornecido.\n" +
    "4. Responda somente com o texto solicitado, sem prefacio, sem comentario, sem aspas.\n" +
    "5. Use portugues brasileiro formal e tecnico.\n" +
    "6. Nao use markdown, negrito, italico ou listas. Use texto corrido profissional.";

  var PROMPT_OS_COMPLETO =
    "Elabore um texto técnico completo para Ordem de Serviço, profissional e claro, sem abreviações e sem cortar a resposta. " +
    "O texto deve conter: contextualização do atendimento, problema relatado, diagnóstico/avaliação técnica, procedimentos executados, " +
    "evidências observadas, peças ou componentes envolvidos quando houver, resultado obtido, recomendações ao cliente e conclusão técnica. " +
    "Não entregue apenas resumo. Não finalize no meio da frase. Retorne conteúdo pronto para compor relatório de O.S em PDF.";

  function obterConfig_() {
    var props = PropertiesService.getScriptProperties();
    var provider = (props.getProperty("IA_PROVIDER") || "GEMINI").toUpperCase().trim();
    var model = (props.getProperty("IA_MODEL") || "").trim();
    var fbProp = (props.getProperty("IA_MODEL_FALLBACKS") || "").trim();
    return {
      provider: provider,
      model: model || (provider === "ANTHROPIC" ? MODELO_ANT_PAD : MODELO_GEMINI_PAD),
      fallbacksRaw: fbProp,
      geminiKey: props.getProperty("GEMINI_API_KEY") || "",
      anthropicKey: props.getProperty("ANTHROPIC_API_KEY") || ""
    };
  }

  function obterListaModelos_(cfg) {
    var lista = [cfg.model];
    var fb = cfg.fallbacksRaw
      ? cfg.fallbacksRaw.split(",").map(function(m) { return m.trim(); }).filter(Boolean)
      : [].concat(FALLBACKS_PADRAO);
    fb.forEach(function(m) {
      if (lista.indexOf(m) === -1) lista.push(m);
    });
    return lista;
  }

  function interpretarErro_(codigo, corpo, provedor) {
    var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ("HTTP " + codigo);
    if (codigo === 401 || codigo === 403) return "Chave " + provedor + " invalida ou sem autorizacao (HTTP " + codigo + "). Verifique a propriedade do script.";
    if (codigo === 429) return "Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente.";
    if (codigo === 404) return "Modelo nao encontrado (HTTP 404): " + msgApi;
    if (codigo >= 500) return "Servico temporariamente indisponivel (HTTP " + codigo + "): " + msgApi;
    return "Erro na API de IA (HTTP " + codigo + "): " + msgApi;
  }

  function eRetentavel_(codigo) {
    return codigo === 500 || codigo === 503;
  }

  function chamarGemini_(prompt, cfg, maxTokens) {
    if (!cfg.geminiKey) {
      throw new Error("Chave GEMINI_API_KEY nao configurada. Acesse o editor GAS > Configuracoes do projeto > Propriedades do script.");
    }

    var modelos = obterListaModelos_(cfg);
    var ultimoErr = "Gemini esta temporariamente indisponivel. Tente novamente em alguns instantes.";

    for (var mi = 0; mi < modelos.length; mi++) {
      var modelo = modelos[mi];
      for (var tent = 0; tent < MAX_TENTATIVAS; tent++) {
        if (tent > 0) Utilities.sleep(DELAYS_MS[tent - 1] || 1600);

        var url = ENDPOINT_GEMINI + modelo + ":generateContent?key=" + cfg.geminiKey;
        var resp = UrlFetchApp.fetch(url, {
          method: "post",
          muteHttpExceptions: true,
          contentType: "application/json",
          payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: maxTokens || TOKENS_TEXTO_COMPLETO_OS,
              temperature: 0.25
            }
          })
        });

        var codigo = resp.getResponseCode();
        var corpo = {};
        try { corpo = JSON.parse(resp.getContentText()); } catch (_) {}

        if (codigo === 200) {
          var cand = corpo.candidates && corpo.candidates[0];
          var parts = cand && cand.content && cand.content.parts;
          var texto = parts && parts.map(function(p) { return p.text || ""; }).join("");
          if (!texto) throw new Error("Gemini retornou resposta vazia. Tente novamente.");
          return String(texto).trim();
        }

        if (codigo === 401 || codigo === 403 || codigo === 429) throw new Error(interpretarErro_(codigo, corpo, "GEMINI_API_KEY"));
        if (codigo === 404) {
          ultimoErr = "Modelo " + modelo + " nao encontrado. Tentando proximo.";
          break;
        }

        ultimoErr = interpretarErro_(codigo, corpo, "GEMINI");
        if (!eRetentavel_(codigo)) break;
      }
    }

    throw new Error(ultimoErr);
  }

  function chamarAnthropic_(prompt, cfg, maxTokens) {
    if (!cfg.anthropicKey) {
      throw new Error("Chave ANTHROPIC_API_KEY nao configurada. Acesse o editor GAS > Configuracoes do projeto > Propriedades do script.");
    }
    var resp = UrlFetchApp.fetch(ENDPOINT_ANT, {
      method: "post",
      muteHttpExceptions: true,
      headers: {
        "x-api-key": cfg.anthropicKey,
        "anthropic-version": ANT_VER,
        "content-type": "application/json"
      },
      payload: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens || TOKENS_TEXTO_COMPLETO_OS,
        temperature: 0.25,
        messages: [{ role: "user", content: prompt }]
      })
    });

    var codigo = resp.getResponseCode();
    var corpo = {};
    try { corpo = JSON.parse(resp.getContentText()); } catch (_) {}
    if (codigo !== 200) throw new Error(interpretarErro_(codigo, corpo, "ANTHROPIC_API_KEY"));

    var texto = corpo.content && corpo.content[0] && corpo.content[0].text;
    if (!texto) throw new Error("Anthropic retornou resposta vazia. Tente novamente.");
    return String(texto).trim();
  }

  function chamarApi_(prompt, maxTokens) {
    var cfg = obterConfig_();
    if (cfg.provider === "ANTHROPIC") return chamarAnthropic_(prompt, cfg, maxTokens);
    return chamarGemini_(prompt, cfg, maxTokens);
  }

  function validarTexto_(texto) {
    var t = String(texto || "").trim();
    if (!t) throw new Error("Campo vazio. Preencha o texto antes de usar a IA.");
    if (t.length < 8) throw new Error("Texto muito curto para processar.");
    if (t.length > MAX_CHARS) throw new Error("Texto muito longo (" + t.length + " chars). Limite: " + MAX_CHARS + ".");
    return t;
  }

  function contextoStr_(ctx) {
    ctx = ctx || {};
    var partes = [];
    if (ctx.numeroOS) partes.push("Numero da OS: " + ctx.numeroOS);
    if (ctx.tipo) partes.push("Tipo OS: " + ctx.tipo);
    if (ctx.equipamento) partes.push("Equipamento: " + ctx.equipamento);
    if (ctx.cliente) partes.push("Cliente: " + ctx.cliente);
    if (ctx.missao) partes.push("Missao tecnica: " + ctx.missao);
    if (ctx.relatoCliente) partes.push("Problema relatado pelo cliente: " + ctx.relatoCliente);
    if (ctx.relato) partes.push("Relato tecnico: " + ctx.relato);
    if (ctx.diagnostico) partes.push("Diagnostico: " + ctx.diagnostico);
    if (ctx.condicao) partes.push("Condicao encontrada: " + ctx.condicao);
    if (ctx.causa) partes.push("Causa provavel: " + ctx.causa);
    if (ctx.resultado) partes.push("Resultado: " + ctx.resultado);
    if (ctx.recomendacao) partes.push("Recomendacao: " + ctx.recomendacao);
    if (ctx.pendencias) partes.push("Pendencias: " + ctx.pendencias);
    return partes.join("\n");
  }

  function limitarPreview_(texto, limite) {
    var t = String(texto || "").replace(/\s+/g, " ").trim();
    limite = limite || 360;
    if (t.length <= limite) return t;
    var m = t.match(new RegExp("^.{1," + limite + "}\\b"));
    return (m && m[0] ? m[0] : t).trim() + "...";
  }

  function validarTextoIACompleto_(texto, contexto) {
    var avisos = [];
    var t = String(texto || "").trim();
    var ctx = contexto || {};
    if (!t) {
      avisos.push("A IA retornou texto vazio.");
      return { ok: false, avisos: avisos };
    }
    if (t.length < 180 && SGO_UTILS.safeUpper(ctx.tipoValidacao || "") !== "RESUMO") {
      avisos.push("O texto gerado parece curto demais para um relatorio tecnico completo.");
    }
    if (/[,;:]$/.test(t)) avisos.push("O texto termina com pontuacao que sugere corte.");
    if (/\b(e|de|da|do|das|dos|para|com|que|em|por|ao|aos|as|os)$/i.test(t)) {
      avisos.push("O texto termina com palavra de ligacao e pode estar incompleto.");
    }
    if (!/[.!?]$/.test(t)) avisos.push("O texto nao termina com pontuacao final.");

    var lower = t.toLowerCase();
    var temas = [
      /atendimento|ordem de servi[cç]o|servi[cç]o|visita/,
      /problema|relatad|solicita|demanda|ocorr/,
      /diagn[oó]stico|avalia[cç][aã]o|verifica|inspe[cç][aã]o/,
      /procedimento|executad|realizad|servi[cç]o/,
      /resultado|conclus[aã]o|finaliz/
    ];
    var presentes = temas.filter(function(rx) { return rx.test(lower); }).length;
    if (presentes < 3 && SGO_UTILS.safeUpper(ctx.tipoValidacao || "") !== "RESUMO") {
      avisos.push("O texto nao apresenta estrutura minima de relatorio tecnico completo.");
    }
    return { ok: avisos.length === 0, avisos: avisos };
  }

  function normalizarRespostaIA_(resposta, contexto) {
    var ctx = contexto || {};
    var texto = "";
    var avisos = [];
    if (resposta && typeof resposta === "object") {
      texto = resposta.textoCompleto || resposta.versaoRelatorio || resposta.texto || resposta.resumoCurto || "";
      if (Array.isArray(resposta.avisos)) avisos = resposta.avisos;
    } else {
      texto = String(resposta || "");
    }
    texto = String(texto || "").trim();
    var validacao = validarTextoIACompleto_(texto, ctx);
    avisos = avisos.concat(validacao.avisos || []);
    return {
      ok: true,
      success: true,
      titulo: SGO_UTILS.safe(ctx.titulo || "Texto tecnico de O.S"),
      texto: texto,
      textoCompleto: texto,
      resumoCurto: limitarPreview_(texto, 360),
      versaoWhatsApp: limitarPreview_(texto, 1200),
      versaoRelatorio: texto,
      avisos: avisos
    };
  }

  function registrarAuditoriaIAOS_(sessao, osId, tipo, resultado) {
    try {
      var texto = (resultado && (resultado.textoCompleto || resultado.versaoRelatorio || resultado.texto)) || "";
      var avisos = (resultado && resultado.avisos && resultado.avisos.length) ? resultado.avisos.join(" | ") : "";
      SGO_DATA.log(
        "OS_IA_TEXTO",
        (sessao && (sessao.usuario || sessao.userId)) || "",
        "OS=" + SGO_UTILS.safe(osId || "") + " tipo=" + SGO_UTILS.safe(tipo || "") + " tamanho=" + String(texto).length + (avisos ? " avisos=" + avisos : ""),
        "OS"
      );
    } catch (e) {
      Logger.log("[SGO_IA] Falha ao registrar auditoria IA OS: " + e.message);
    }
  }

  function contextoAuditoria_(payload) {
    return (payload && payload.contexto) || {};
  }

  function lapidarTexto(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    payload = payload || {};
    var texto = validarTexto_(payload.texto);
    var campo = SGO_UTILS.safe(payload.campo || "campo tecnico");
    var ctx = contextoAuditoria_(payload);
    var prompt =
      REGRAS_BASE + "\n\n" +
      PROMPT_OS_COMPLETO + "\n\n" +
      "Tarefa: Lapidar o texto do campo '" + campo + "' de uma OS. Corrija gramatica, pontuacao e clareza. " +
      "Preserve todos os fatos tecnicos. Entregue o texto completo, pronto para relatorio/PDF, sem resumo e sem cortes.\n\n" +
      (contextoStr_(ctx) ? "Contexto da OS:\n" + contextoStr_(ctx) + "\n\n" : "") +
      "Texto original:\n" + texto;
    var res = normalizarRespostaIA_(chamarApi_(prompt, TOKENS_TEXTO_COMPLETO_OS), { titulo: "Texto lapidado de O.S", osId: ctx.osId || ctx.id || "", campo: campo });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "LAPIDAR_" + campo, res);
    return res;
  }

  function gerarTextoTecnicoOS(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    var ctx = contextoAuditoria_(payload);
    if (!ctx.relato && !ctx.missao) throw new Error("Informe ao menos o relato ou a missao tecnica para gerar o texto.");
    var prompt =
      REGRAS_BASE + "\n\n" +
      PROMPT_OS_COMPLETO + "\n\n" +
      "Tarefa: Com base nas informacoes abaixo de uma OS, gere o texto tecnico principal completo. " +
      "Use apenas os dados fornecidos e nao invente nenhum detalhe tecnico nao informado. " +
      "Nao entregue resumo curto. Nao use reticencias. Finalize com conclusao tecnica completa.\n\n" +
      contextoStr_(ctx);
    var res = normalizarRespostaIA_(chamarApi_(prompt, TOKENS_TEXTO_COMPLETO_OS), { titulo: "Relato tecnico completo de O.S", osId: ctx.osId || ctx.id || "" });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "GERAR_TEXTO_TECNICO", res);
    return res;
  }

  function corrigirPortuguesBR(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    payload = payload || {};
    var ctx = contextoAuditoria_(payload);
    var texto = validarTexto_(payload.texto);
    var prompt =
      REGRAS_BASE + "\n\n" +
      "Tarefa: Corrija apenas a ortografia e gramatica do texto abaixo em portugues brasileiro. " +
      "Nao altere o conteudo, os termos tecnicos, os dados ou a estrutura das frases. Retorne o texto completo, sem cortes.\n\n" +
      "Texto:\n" + texto;
    var res = normalizarRespostaIA_(chamarApi_(prompt, TOKENS_TEXTO_COMPLETO_OS), { titulo: "Texto corrigido de O.S", osId: ctx.osId || ctx.id || "" });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "CORRIGIR_PORTUGUES", res);
    return res;
  }

  function criarResumoExecutivoOS(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    var ctx = contextoAuditoria_(payload);
    if (!ctx.relato && !ctx.tipo) throw new Error("Informe ao menos o relato ou o tipo da OS para gerar o resumo.");
    var prompt =
      REGRAS_BASE + "\n\n" +
      "Tarefa: Gere um resumo executivo de 2 a 3 frases para esta OS. O resumo deve ser objetivo, tecnico e adequado para leitura gerencial. " +
      "Use apenas os dados fornecidos. Este texto e apenas para card/resumo, nao para o corpo tecnico do PDF.\n\n" +
      contextoStr_(ctx);
    var res = normalizarRespostaIA_(chamarApi_(prompt, 700), { titulo: "Resumo executivo de O.S", osId: ctx.osId || ctx.id || "", tipoValidacao: "RESUMO" });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "RESUMO_EXECUTIVO", res);
    return res;
  }

  function criarConclusaoTecnicaOS(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    var ctx = contextoAuditoria_(payload);
    if (!ctx.relato) throw new Error("Informe o relato tecnico para gerar a conclusao.");
    var prompt =
      REGRAS_BASE + "\n\n" +
      PROMPT_OS_COMPLETO + "\n\n" +
      "Tarefa: Gere uma conclusao tecnica completa para esta OS. A conclusao deve sintetizar o que foi feito, o diagnostico, " +
      "o resultado obtido, as recomendacoes e o estado final do equipamento. Use apenas os dados fornecidos. Nao entregue apenas uma frase curta.\n\n" +
      contextoStr_(ctx);
    var res = normalizarRespostaIA_(chamarApi_(prompt, TOKENS_TEXTO_COMPLETO_OS), { titulo: "Conclusao tecnica completa de O.S", osId: ctx.osId || ctx.id || "" });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "CONCLUSAO_TECNICA", res);
    return res;
  }

  function criarRecomendacaoTecnicaOS(sessionId, payload) {
    var sessao = exigirSessao(sessionId);
    var ctx = contextoAuditoria_(payload);
    if (!ctx.relato) throw new Error("Informe o relato tecnico para gerar a recomendacao.");
    var prompt =
      REGRAS_BASE + "\n\n" +
      "Tarefa: Gere recomendacoes tecnicas completas para esta OS, em texto corrido profissional. Inclua orientacoes ao cliente, cuidados, " +
      "pendencias e proximas acoes somente quando houver base nos dados informados. Nao invente necessidades nao relatadas e nao corte a resposta.\n\n" +
      contextoStr_(ctx);
    var res = normalizarRespostaIA_(chamarApi_(prompt, 1600), { titulo: "Recomendacao tecnica de O.S", osId: ctx.osId || ctx.id || "" });
    registrarAuditoriaIAOS_(sessao, ctx.osId || ctx.id || "", "RECOMENDACAO_TECNICA", res);
    return res;
  }

  return {
    lapidarTexto: lapidarTexto,
    gerarTextoTecnicoOS: gerarTextoTecnicoOS,
    corrigirPortuguesBR: corrigirPortuguesBR,
    criarResumoExecutivoOS: criarResumoExecutivoOS,
    criarConclusaoTecnicaOS: criarConclusaoTecnicaOS,
    criarRecomendacaoTecnicaOS: criarRecomendacaoTecnicaOS,
    normalizarRespostaIA_: normalizarRespostaIA_,
    validarTextoIACompleto_: validarTextoIACompleto_
  };
})();

function iaLapidarTexto(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.lapidarTexto(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function iaGerarTextoTecnicoOS(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.gerarTextoTecnicoOS(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function iaCorrigirPortuguesBR(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.corrigirPortuguesBR(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function iaCriarResumoExecutivoOS(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.criarResumoExecutivoOS(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function iaCriarConclusaoTecnicaOS(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.criarConclusaoTecnicaOS(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function iaCriarRecomendacaoTecnicaOS(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_IA.criarRecomendacaoTecnicaOS(sessionId, payload))); }
  catch (e) { return { success: false, ok: false, message: e.message, avisos: [e.message] }; }
}

function normalizarRespostaIA_(resposta, contexto) {
  return SGO_IA.normalizarRespostaIA_(resposta, contexto || {});
}

function validarTextoIACompleto_(texto, contexto) {
  return SGO_IA.validarTextoIACompleto_(texto, contexto || {});
}
