/**
 * ============================================================
 * METROLABS — IA CONTEXTUAL / CONCLUSÃO TÉCNICA
 * ARQUIVO: IA.gs
 * VERSÃO: V2.0 PROFISSIONAL
 *
 * OBJETIVO:
 * - Corrigir botão de IA que não refinava.
 * - Aceitar chamada simples: refinarTextoIA(texto)
 * - Aceitar chamada contextual: refinarConclusaoComContextoIA(payload)
 * - Usar perfil do equipamento, normas, critérios, QI/QO/QD,
 *   pendências e alertas.
 * - Nunca inventar dados.
 * - Nunca trocar status técnico.
 * - Funcionar mesmo sem chave OPENAI_API_KEY.
 *
 * CONFIGURAÇÃO OPCIONAL:
 * Propriedades do Script:
 * OPENAI_API_KEY = sua chave
 * ============================================================
 */

/**
 * ============================================================
 * FUNÇÃO USADA PELO FRONT ATUAL
 * ============================================================
 * O botão do Index.html chama refinarTextoIA(texto).
 * Por isso esta função precisa funcionar mesmo sem payload completo.
 */
function refinarTextoIA(texto, contextoOpcional) {
  try {
    const original = normalizarTexto_(texto);

    if (!original) {
      return {
        ok: false,
        mensagem: "Texto vazio para refinamento."
      };
    }

    const contexto = montarContextoSeguroIA_(contextoOpcional || {});
    const apiKey = obterApiKeyIA_();

    if (!apiKey) {
      return {
        ok: true,
        modo: "SEM_CHAVE",
        texto: lapidarTextoLocalIA_(original),
        mensagem: "OPENAI_API_KEY não configurada. Foi aplicada lapidação local segura."
      };
    }

    const prompt = montarPromptRefinoTecnicoIA_(original, contexto);
    const resposta = chamarOpenAIChat_(apiKey, prompt);

    if (!resposta.ok) {
      return {
        ok: true,
        modo: "FALLBACK_LOCAL",
        texto: lapidarTextoLocalIA_(original),
        mensagem: resposta.mensagem || "Falha na IA externa. Foi aplicada lapidação local segura."
      };
    }

    const textoFinal = limparSaidaIA_(resposta.texto);

    if (!validarSaidaIA_(original, textoFinal, contexto)) {
      return {
        ok: true,
        modo: "VALIDACAO_RECUO_LOCAL",
        texto: lapidarTextoLocalIA_(original),
        mensagem: "A saída da IA não passou na validação. Foi aplicada lapidação local segura."
      };
    }

    return {
      ok: true,
      modo: "IA_EXTERNA",
      texto: textoFinal
    };

  } catch (e) {
    return {
      ok: true,
      modo: "ERRO_FALLBACK_LOCAL",
      texto: lapidarTextoLocalIA_(texto),
      mensagem: "Erro na IA: " + obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * FUNÇÃO CONTEXTUAL PESADA
 * ============================================================
 * Pode ser chamada pelo Documento/Index quando houver payload completo.
 */
function refinarConclusaoComContextoIA(dados) {
  try {
    const validacao = validarPayloadAntesDeGerar(dados);

    if (!validacao.ok) {
      return {
        ok: false,
        mensagem: validacao.mensagem
      };
    }

    const payload = validacao.payload;
    const perfil = payload.perfil;

    const auditoriaRes = auditarQualificacao(payload);
    const auditoria = auditoriaRes && auditoriaRes.ok ? auditoriaRes.resultado : {};

    const textoBase =
      normalizarTexto_(payload.textoConclusao || payload.texto_conclusao) ||
      normalizarTexto_(auditoria.textoBaseConclusao) ||
      montarTextoConclusaoBaseIA_(payload, auditoria, perfil);

    const contexto = {
      tipoEquipamento: perfil.nome,
      tipoCodigo: perfil.codigo,
      familia: perfil.familia,
      statusFinal: payload.statusFinal,
      escopo: payload.escopo,
      normas: perfil.normas || [],
      criterios: perfil.criterios || {},
      pendencias: auditoria.pendencias || [],
      alertas: auditoria.alertas || [],
      resumoTecnico: auditoria.resumoTecnico || [],
      usaBI: !!perfil.usaBI,
      usaIQ: !!perfil.usaIQ,
      usaBowieDick: !!perfil.usaBowieDick,
      usaPrions: !!perfil.usaPrions,
      usaInsumos: !!perfil.usaInsumos
    };

    return refinarTextoIA(textoBase, contexto);

  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao refinar conclusão contextual: " + obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * FUNÇÃO NOVA PARA O FRONT USAR COM PAYLOAD COMPLETO
 * ============================================================
 */
function refinarPayloadConclusaoIA(dados) {
  return refinarConclusaoComContextoIA(dados);
}

/**
 * ============================================================
 * PROMPT
 * ============================================================
 */

function montarPromptRefinoTecnicoIA_(texto, contexto) {
  const linhas = [];

  linhas.push("Você é um especialista em engenharia clínica, qualificação de equipamentos hospitalares, metrologia, CME, cadeia fria, NR-13 e documentação técnica auditável.");
  linhas.push("");
  linhas.push("Sua tarefa é reescrever o texto fornecido com linguagem técnica, profissional, institucional e clara para relatório/carta de conformidade Metrolabs.");
  linhas.push("");
  linhas.push("REGRAS OBRIGATÓRIAS:");
  linhas.push("1. Não invente dados, medições, datas, nomes, marcas, modelos, números de série, resultados, normas ou conclusões.");
  linhas.push("2. Preserve o status técnico. Se o texto indicar reprovação, não transforme em aprovação.");
  linhas.push("3. Preserve pendências, ressalvas e alertas. Não minimize riscos técnicos.");
  linhas.push("4. Não cite BI, IQ, Bowie-Dick, Príons ou integradores se o equipamento não utilizar esses itens.");
  linhas.push("5. Não misture lógica de autoclave com lavadora, termodesinfectora, cadeia fria, capela, centrífuga, estufa, secadora ou NR-13.");
  linhas.push("6. Evite redundância. Não repita a mesma ideia com palavras diferentes.");
  linhas.push("7. Use tom técnico, forte, seguro e próprio para auditoria, sem exageros comerciais.");
  linhas.push("8. Entregue apenas o texto final, sem markdown, sem título e sem explicações.");
  linhas.push("");

  if (contexto && contexto.tipoEquipamento) {
    linhas.push("CONTEXTO TÉCNICO DO EQUIPAMENTO:");
    linhas.push("- Equipamento: " + contexto.tipoEquipamento);
    linhas.push("- Código: " + (contexto.tipoCodigo || "não informado"));
    linhas.push("- Família: " + (contexto.familia || "não informada"));
    linhas.push("- Status final: " + (contexto.statusFinal || "não informado"));

    if (contexto.escopo) {
      linhas.push("- Escopo: QI=" + boolTxt_(contexto.escopo.qi) + ", QO=" + boolTxt_(contexto.escopo.qo) + ", QD=" + boolTxt_(contexto.escopo.qd) + ", Inspeção=" + boolTxt_(contexto.escopo.inspecao));
    }

    linhas.push("- Usa BI: " + boolTxt_(contexto.usaBI));
    linhas.push("- Usa IQ: " + boolTxt_(contexto.usaIQ));
    linhas.push("- Usa Bowie-Dick: " + boolTxt_(contexto.usaBowieDick));
    linhas.push("- Usa Príons: " + boolTxt_(contexto.usaPrions));
    linhas.push("- Usa insumos rastreáveis: " + boolTxt_(contexto.usaInsumos));

    if (contexto.normas && contexto.normas.length) {
      linhas.push("- Referências: " + contexto.normas.join("; "));
    }

    if (contexto.pendencias && contexto.pendencias.length) {
      linhas.push("- Pendências: " + contexto.pendencias.join("; "));
    }

    if (contexto.alertas && contexto.alertas.length) {
      linhas.push("- Alertas: " + contexto.alertas.join("; "));
    }

    if (contexto.resumoTecnico && contexto.resumoTecnico.length) {
      linhas.push("- Resumo técnico: " + contexto.resumoTecnico.join("; "));
    }

    linhas.push("");
  }

  linhas.push("TEXTO ORIGINAL:");
  linhas.push(texto);

  return linhas.join("\n");
}

/**
 * ============================================================
 * CHAMADA OPENAI
 * ============================================================
 */

function chamarOpenAIChat_(apiKey, prompt) {
  try {
    const modelos = ["gpt-4o-mini", "gpt-4.1-mini"];

    for (let i = 0; i < modelos.length; i++) {
      const payload = {
        model: modelos[i],
        messages: [
          {
            role: "system",
            content: "Você refina textos técnicos de engenharia clínica com precisão, sem inventar dados e sem alterar o status técnico."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      };

      const resp = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        headers: {
          Authorization: "Bearer " + apiKey
        },
        payload: JSON.stringify(payload)
      });

      const status = resp.getResponseCode();
      const body = resp.getContentText();

      if (status >= 200 && status < 300) {
        const json = JSON.parse(body || "{}");
        const texto = json &&
          json.choices &&
          json.choices[0] &&
          json.choices[0].message &&
          json.choices[0].message.content
            ? json.choices[0].message.content
            : "";

        if (texto) {
          return {
            ok: true,
            modelo: modelos[i],
            texto: texto
          };
        }
      }
    }

    return {
      ok: false,
      mensagem: "Nenhum modelo retornou texto válido."
    };

  } catch (e) {
    return {
      ok: false,
      mensagem: obterMensagemErro_(e)
    };
  }
}

/**
 * ============================================================
 * FALLBACK LOCAL SEGURO
 * ============================================================
 * Não depende de API. Não inventa. Só melhora pontuação/estrutura.
 */
function lapidarTextoLocalIA_(texto) {
  let t = normalizarTexto_(texto);

  if (!t) return "";

  t = t
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .replace(/\.\s*\./g, ".")
    .trim();

  if (!/[.!?]$/.test(t)) t += ".";

  const inicio = "Com base nas evidências declaradas e no escopo técnico informado, ";
  const lower = t.toLowerCase();

  if (
    lower.indexOf("com base") < 0 &&
    lower.indexOf("evidências") < 0 &&
    lower.indexOf("escopo") < 0
  ) {
    t = inicio + t.charAt(0).toLowerCase() + t.slice(1);
  }

  return t;
}

/**
 * ============================================================
 * CONTEXTO
 * ============================================================
 */

function montarContextoSeguroIA_(ctx) {
  ctx = ctx || {};

  return {
    tipoEquipamento: normalizarTexto_(ctx.tipoEquipamento || ctx.tipo || ""),
    tipoCodigo: normalizarTexto_(ctx.tipoCodigo || ""),
    familia: normalizarTexto_(ctx.familia || ""),
    statusFinal: normalizarTexto_(ctx.statusFinal || ctx.status || ""),
    escopo: ctx.escopo || {},
    normas: Array.isArray(ctx.normas) ? ctx.normas : [],
    criterios: ctx.criterios || {},
    pendencias: Array.isArray(ctx.pendencias) ? ctx.pendencias : [],
    alertas: Array.isArray(ctx.alertas) ? ctx.alertas : [],
    resumoTecnico: Array.isArray(ctx.resumoTecnico) ? ctx.resumoTecnico : [],
    usaBI: !!ctx.usaBI,
    usaIQ: !!ctx.usaIQ,
    usaBowieDick: !!ctx.usaBowieDick,
    usaPrions: !!ctx.usaPrions,
    usaInsumos: !!ctx.usaInsumos
  };
}

function montarTextoConclusaoBaseIA_(payload, auditoria, perfil) {
  const status = normalizarChave_(payload.statusFinal || "");
  const textos = perfil.textos || {};

  if (status === "APROVADO") return textos.conclusaoAprovado || "";
  if (status === "APROVADO COM RESSALVAS") return textos.conclusaoRessalvas || "";
  if (status === "REPROVADO") return textos.conclusaoReprovado || "";

  return auditoria.textoBaseConclusao || "Conclusão técnica pendente de consolidação das evidências.";
}

/**
 * ============================================================
 * LIMPEZA E VALIDAÇÃO DA SAÍDA
 * ============================================================
 */

function limparSaidaIA_(texto) {
  let t = normalizarTexto_(texto);

  t = t
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^texto refinado:\s*/i, "")
    .replace(/^segue o texto refinado:\s*/i, "")
    .replace(/^conclusão técnica:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return t;
}

function validarSaidaIA_(original, saida, contexto) {
  const o = normalizarTexto_(original);
  const s = normalizarTexto_(saida);

  if (!s) return false;
  if (s.length < Math.min(40, o.length * 0.25)) return false;
  if (s.length > Math.max(6500, o.length * 9)) return false;

  const okOriginal = normalizarChave_(o);
  const okSaida = normalizarChave_(s);

  if (okOriginal.indexOf("REPROV") >= 0 && okSaida.indexOf("APROVADO") >= 0 && okSaida.indexOf("REPROV") < 0) {
    return false;
  }

  if (okOriginal.indexOf("RESSALVA") >= 0 && okSaida.indexOf("RESSALVA") < 0) {
    return false;
  }

  if (okOriginal.indexOf("PENDENCIA") >= 0 && okSaida.indexOf("PENDENCIA") < 0) {
    return false;
  }

  if (contexto) {
    const tipo = normalizarChave_(contexto.tipoEquipamento || "");
    const saida = okSaida;

    if (!contexto.usaBI && (saida.indexOf("INDICADOR BIOLOGICO") >= 0 || saida.indexOf(" BI ") >= 0)) return false;
    if (!contexto.usaIQ && (saida.indexOf("INTEGRADOR QUIMICO") >= 0 || saida.indexOf(" IQ ") >= 0)) return false;
    if (!contexto.usaBowieDick && saida.indexOf("BOWIE") >= 0) return false;
    if (!contexto.usaPrions && saida.indexOf("PRIONS") >= 0) return false;

    if (tipo.indexOf("CAMARA") >= 0 || tipo.indexOf("FREEZER") >= 0 || tipo.indexOf("CAIXA TERMICA") >= 0) {
      if (saida.indexOf("ESTERILIZ") >= 0 || saida.indexOf("VAPOR SATURADO") >= 0) return false;
    }

    if (tipo.indexOf("VASO") >= 0 || tipo.indexOf("NR-13") >= 0) {
      if (saida.indexOf("QI") >= 0 && saida.indexOf("QO") >= 0 && saida.indexOf("QD") >= 0) return false;
    }
  }

  return true;
}

/**
 * ============================================================
 * APOIO
 * ============================================================
 */

function obterApiKeyIA_() {
  try {
    return normalizarTexto_(PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY"));
  } catch (e) {
    return "";
  }
}

function boolTxt_(v) {
  return v ? "sim" : "não";
}
