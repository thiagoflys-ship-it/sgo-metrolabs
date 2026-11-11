/****************************************************
 * REGISTROS OPERACIONAIS — sugestão de campos de documento por IA
 * (v2, 2026-08-15 — generalização de "checklist" pra "tipo de
 * documento livre", ver [[project_registros_operacionais_modulo]])
 *
 * Só é chamada quando o gestor cria um TIPO DE DOCUMENTO novo (não
 * existe ainda salvo em MOD_TIPOS_DOCUMENTO). Depois que ele revisa e
 * salva, o modelo fica pronto e NUNCA mais chama a IA de novo pra esse
 * tipo — reaproveitado por todo mundo, qualquer hospital.
 *
 * O tipo de documento é LIVRE — não precisa corresponder a nenhum dos
 * 22 POPs "oficiais" nem a nenhum dos documentos reais já conhecidos
 * da Metrolabs (ex.: "Saída de Equipamento para Assistência Técnica
 * Externa" é um tipo válido mesmo sem existir ainda nos originais) —
 * a IA usa o nome + POP(s) relacionados (se houver) + roteiro do
 * gestor pra sugerir os campos e assinaturas certas.
 ****************************************************/
var REGOPIA_TOKENS = 4096;
var REGOPIA_MODELOS_FALLBACK = ["gemini-2.5-flash", "gemini-2.0-flash"];
var REGOPIA_MAX_TENTATIVAS = 3;
var REGOPIA_DELAYS_MS = [800, 1600];

var REGOPIA_MARC_CAMPOS = "###CAMPOS###";
var REGOPIA_MARC_ASSINATURAS = "###ASSINATURAS###";
var REGOPIA_MARC_FIM = "###FIM###";

var REGOPIA_REGRAS =
  "Você é um engenheiro clínico sênior da Metrolabs Soluções em Engenharia Clínica, especializado em " +
  "desenhar formulários e documentos de registro operacional de engenharia clínica, em conformidade com a " +
  "RDC nº 509/2021 (ANVISA) e a NBR 15943:2011 (ABNT).\n" +
  "REGRAS:\n" +
  "1. O documento é pra um colaborador de campo preencher toda vez que executa esta rotina — cada campo " +
  "deve corresponder a uma informação real que precisa ser registrada, não uma explicação teórica.\n" +
  "2. Documentos reais da Metrolabs costumam ter: (a) campos de identificação do equipamento quando " +
  "pertinente (nome, marca, modelo, número de série, fornecedor — só inclua se o documento realmente lidar " +
  "com um equipamento específico), (b) itens de verificação Sim/Não/N-A quando pertinente, (c) campos de " +
  "texto livre pra descrições/motivos/observações, (d) datas. Use o tipo certo pra cada campo — não force " +
  "tudo pra Sim/Não nem tudo pra texto livre.\n" +
  "3. Entre 4 e 15 campos — nem raso demais nem excessivo (ninguém preenche 30 campos na prática).\n" +
  "4. Agrupe campos relacionados numa mesma 'seção' quando fizer sentido (ex.: 'Dados do Equipamento', " +
  "'Verificação de Entrega') — campos sem relação clara podem ficar sem seção.\n" +
  "5. Assinaturas: a maioria dos documentos tem 1 só (o responsável pelo preenchimento). Alguns documentos " +
  "reais da Metrolabs têm 2 (ex.: um Laudo de Desativação tem 'Responsável pela Desativação' E 'Responsável " +
  "pelo Setor') — só sugira mais de uma assinatura quando o tipo de documento genuinamente pedir dupla " +
  "responsabilidade/aprovação.\n" +
  "6. Nunca cite marca ou fabricante específico de equipamento.\n" +
  "7. Frases curtas, diretas, no padrão operacional real da Metrolabs — sem markdown.";

function RegOpIA_montarPrompt_(nomeDocumento, popsRelacionados, roteiro, textoPopExistente) {
  var linhas = [];
  linhas.push(REGOPIA_REGRAS);
  linhas.push("");
  linhas.push("TAREFA: desenhe os campos e as assinaturas necessárias pro tipo de documento abaixo.");
  linhas.push("");
  linhas.push("NOME DO TIPO DE DOCUMENTO: " + nomeDocumento);
  if (popsRelacionados && popsRelacionados.length) {
    linhas.push("PROCEDIMENTO(S) OPERACIONAL(IS) RELACIONADO(S): " + popsRelacionados.map(function (p) { return (p.codigo ? (p.codigo + ' - ') : '') + p.nome; }).join('; '));
  }
  linhas.push("BASE NORMATIVA: " + REGOP_CFG.BASE_NORMATIVA);
  if (roteiro) {
    linhas.push("");
    linhas.push("ROTEIRO/CONTEXTO FORNECIDO PELO GESTOR (siga como guia do que este documento precisa cobrir):");
    linhas.push(roteiro);
  }
  if (textoPopExistente) {
    linhas.push("");
    linhas.push("TEXTO REAL DE UM POP RELACIONADO (já gerado pela Metrolabs pra um hospital — use como referência " +
      "do que realmente precisa ser registrado, mas os campos devem ser genéricos, sem citar o hospital específico):");
    linhas.push(textoPopExistente.slice(0, 6000));
  }
  linhas.push("");
  linhas.push("Responda SOMENTE em texto puro, seguindo EXATAMENTE esta estrutura:");
  linhas.push(REGOPIA_MARC_CAMPOS);
  linhas.push("(uma linha por campo, no formato: rótulo do campo | tipo | seção — onde tipo é exatamente " +
    "'sim_nao_na', 'texto', 'numero' ou 'data', e seção é opcional (deixe em branco se não houver agrupamento " +
    "natural). Exemplo: Marca do equipamento | texto | Dados do Equipamento)");
  linhas.push(REGOPIA_MARC_ASSINATURAS);
  linhas.push("(uma linha por papel de assinatura necessário — normalmente só 1. Exemplo: Responsável pelo Registro)");
  linhas.push(REGOPIA_MARC_FIM);
  return linhas.join("\n");
}

function RegOpIA_extrairBloco_(texto, marcador, marcadoresSeguintes) {
  var idxInicio = texto.indexOf(marcador);
  if (idxInicio === -1) return '';
  var inicioTexto = idxInicio + marcador.length;
  var fimTexto = texto.length;
  marcadoresSeguintes.forEach(function (m) {
    var idxFim = texto.indexOf(m, inicioTexto);
    if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
  });
  return texto.slice(inicioTexto, fimTexto).trim();
}

function RegOpIA_extrairCamposEAssinaturas_(texto) {
  var limpo = String(texto || "")
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  var blocoCampos = RegOpIA_extrairBloco_(limpo, REGOPIA_MARC_CAMPOS, [REGOPIA_MARC_ASSINATURAS, REGOPIA_MARC_FIM]);
  var blocoAssinaturas = RegOpIA_extrairBloco_(limpo, REGOPIA_MARC_ASSINATURAS, [REGOPIA_MARC_FIM]);

  if (!blocoCampos) {
    throw new Error("A IA não retornou os campos no formato esperado. Tente gerar a sugestão de novo.");
  }

  var tiposValidos = { sim_nao_na: true, texto: true, numero: true, data: true };
  var campos = blocoCampos.split("\n").map(function (linha) {
    var l = linha.replace(/^[\s\-\*\d.]+/, '').trim();
    if (!l) return null;
    var partes = l.split("|");
    var rotulo = (partes[0] || '').trim();
    var tipo = (partes[1] || '').trim().toLowerCase();
    var secao = (partes[2] || '').trim();
    if (!tiposValidos[tipo]) tipo = 'texto';
    if (!rotulo) return null;
    return { rotulo: rotulo, tipo: tipo, secao: secao };
  }).filter(Boolean);

  if (!campos.length) {
    throw new Error("A IA não retornou nenhum campo válido. Tente gerar a sugestão de novo.");
  }

  var assinaturas = blocoAssinaturas.split("\n")
    .map(function (l) { return l.replace(/^[\s\-\*\d.]+/, '').trim(); })
    .filter(Boolean);
  if (!assinaturas.length) assinaturas = ['Responsável pelo Registro'];

  return { campos: campos, assinaturas: assinaturas };
}

/**
 * Chamada de baixo nível ao Gemini com fallback de modelos + retry —
 * compartilhada entre a sugestão de campos e a melhoria de texto por
 * campo (v3, 2026-08-15). Devolve o texto bruto da resposta; lança
 * erro descritivo se todos os modelos falharem.
 */
function RegOpIA_chamarGemini_(prompt, maxTokens) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.");
  }

  var parts = [{ text: prompt }];
  var errosPorModelo = [];
  for (var mi = 0; mi < REGOPIA_MODELOS_FALLBACK.length; mi++) {
    var modelo = REGOPIA_MODELOS_FALLBACK[mi];
    var erroModelo = "falha desconhecida";
    for (var tent = 0; tent < REGOPIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(REGOPIA_DELAYS_MS[tent - 1] || 1600);

      var url = "https://generativelanguage.googleapis.com/v1/models/" + encodeURIComponent(modelo) +
        ":generateContent?key=" + encodeURIComponent(chave);
      var resp = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ role: "user", parts: parts }],
          generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: maxTokens }
        })
      });

      var codigo = resp.getResponseCode();
      var corpoResp = {};
      try { corpoResp = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpoResp.candidates && corpoResp.candidates[0];
        var partesResp = cand && cand.content && cand.content.parts;
        var texto = (partesResp || []).map(function (p) { return p && p.text ? p.text : ""; }).join("").trim();
        if (!texto) { erroModelo = "resposta vazia"; break; }
        // Modelos com "thinking" (ex.: gemini-2.5-flash) gastam parte do
        // maxOutputTokens com raciocínio interno antes de escrever a
        // resposta visível — se o orçamento for baixo demais, o texto
        // sai cortado no meio sem erro nenhum. Nunca aceitar isso
        // silenciosamente: se cortou, é pra tentar de novo com mais
        // orçamento, não pra entregar texto pela metade (ver
        // [[feedback_ia_prioriza_acuracia_sobre_custo]]).
        if (cand && cand.finishReason === 'MAX_TOKENS') {
          erroModelo = "resposta cortada por limite de tokens (finishReason=MAX_TOKENS)";
          break;
        }
        return texto;
      }

      if (codigo === 401 || codigo === 403) {
        throw new Error("Chave GEMINI_API_KEY inválida ou sem autorização (HTTP " + codigo + ").");
      }
      var msgApi = (corpoResp && corpoResp.error && corpoResp.error.message) || ("HTTP " + codigo);
      erroModelo = msgApi;
      if (codigo === 429 || codigo === 404) break;
      if (codigo < 500) break;
    }
    errosPorModelo.push(modelo + ": " + erroModelo);
  }

  throw new Error(
    "Falha ao consultar a IA após tentar " + REGOPIA_MODELOS_FALLBACK.length +
    " modelo(s) — " + errosPorModelo.join(" | ")
  );
}

/**
 * Sugere campos + assinaturas pra um tipo de documento — não salva
 * nada, o gestor revisa antes de confirmar (RegOp_apiSalvarTipoDocumento).
 * @return {{campos: Array, assinaturas: Array}}
 */
function RegOp_sugerirCamposDocumento_(nomeDocumento, popsRelacionados, roteiro, textoPopExistente) {
  var prompt = RegOpIA_montarPrompt_(nomeDocumento, popsRelacionados, roteiro, textoPopExistente);
  var texto = RegOpIA_chamarGemini_(prompt, REGOPIA_TOKENS);
  return RegOpIA_extrairCamposEAssinaturas_(texto);
}

/**
 * Reescreve um texto de campo livre (relato/observação) de forma mais
 * profissional — o colaborador digita cru, clica "Melhorar com IA",
 * revisa o resultado e decide se aceita (nunca aplica sozinha, ver
 * [[project_registros_operacionais_modulo]] v3). Mantém os fatos
 * relatados, não inventa informação nova.
 */
function RegOp_melhorarTextoCampo_(rotulo, valorOriginal, tipoDocumentoNome) {
  var prompt =
    "Você é um engenheiro clínico sênior da Metrolabs Soluções em Engenharia Clínica, revisando a redação de " +
    "um campo de um documento operacional.\n" +
    "REGRAS:\n" +
    "1. Reescreva o texto abaixo de forma mais clara, profissional e objetiva.\n" +
    "2. Mantenha TODOS os fatos relatados — não invente, não adicione informação nova, não remova detalhes " +
    "relevantes.\n" +
    "3. Não cite marca ou fabricante específico de equipamento.\n" +
    "4. Responda SOMENTE com o texto reescrito, sem comentários, sem aspas, sem markdown.\n\n" +
    "DOCUMENTO: " + (tipoDocumentoNome || '') + "\n" +
    "CAMPO: " + (rotulo || '') + "\n" +
    "TEXTO ORIGINAL: " + valorOriginal;

  // 2048, não 512: modelos com "thinking" (gemini-2.5-flash) consomem
  // parte do orçamento com raciocínio interno antes do texto visível —
  // um orçamento curto corta a resposta no meio mesmo pra uma reescrita
  // pequena (bug real de 2026-08-15, ver
  // [[feedback_ia_prioriza_acuracia_sobre_custo]]).
  var texto = RegOpIA_chamarGemini_(prompt, 2048);
  return texto.replace(/^["'`]+|["'`]+$/g, '').trim();
}
