/****************************************************
 * PGT E POP — GERAÇÃO DE TEXTO (IA), v2 2026-08-13
 *
 * Reescrito com base na leitura de 26 documentos reais da Metrolabs
 * (1 PGT + 22 POPs padronizados + 2 POPs legados). O tom real é
 * operacional — frases diretas, passos numerados quando fizer sentido
 * — não prosa acadêmica longa. O pedido do usuário foi "enriquecer"
 * esse padrão real (mais completo/robusto), não substituí-lo por algo
 * genérico.
 *
 * Uma chamada de IA por documento — nunca PGT + POPs numa chamada só.
 *
 * v2 acrescenta suporte MULTIMODAL: quando o POP tem imagens anexadas,
 * elas entram na MESMA chamada (Gemini aceita texto + imagem na mesma
 * requisição) e a IA devolve, além do corpo do documento, uma
 * interpretação técnica por imagem (o documento real da Metrolabs já
 * usa imagens numeradas com legenda no meio do procedimento — ver
 * "Pop Grupo de Geradores").
 *
 * v15 (2026-08-14): PGT deixa de ser 1 chamada (usuário reportou
 * "muito resumido") e passa a ser gerado em 6 chamadas — uma por bloco
 * de seções (PGTPOPIA_BLOCOS_PGT/PgtPop_gerarTextoPGT_), com regras
 * próprias pedindo texto longo e explicativo (PGTPOPIA_REGRAS_PGT,
 * diferente das regras dos POPs, que continuam enxutas/operacionais
 * sem mudança). O bloco de fechamento ganhou uma seção nova
 * "Documentos e Procedimentos Relacionados", que lista e explica os
 * POPs gerados pra este hospital + os documentos já existentes.
 ****************************************************/
var PGTPOPIA_TOKENS = 16384; // o POP com o raciocínio (thinking) ligado podia passar de 8.192 e sair cortado
// PGT (2026-08-14, v15): gerado em 6 chamadas separadas (uma por bloco
// de seções) em vez de 1 chamada única cobrindo as ~28 seções — usuário
// reportou o PGT "muito resumido", e o teto de tokens de uma única
// chamada dividido por 28 seções matematicamente força texto raso.
// Cada bloco cobre só 3-6 seções, então ganha bem mais espaço cada.
// (26/10/2026) 32.768: o bloco 1 (glossário de 40-50 termos + 3 seções longas) com o
// raciocínio ligado chegava perto de 16.384 e voltava cortado.
var PGTPOPIA_TOKENS_PGT = 32768;
var PGTPOPIA_MODELOS_FALLBACK = ["gemini-2.5-flash", "gemini-2.0-flash"];
// Teto de saída de cada modelo: pedir acima disso faz a API recusar a chamada.
var PGTPOPIA_TETO_MODELO = { "gemini-2.0-flash": 8192 };
var PGTPOPIA_MAX_TENTATIVAS = 3;
var PGTPOPIA_DELAYS_MS = [800, 1600];

var PGTPOPIA_MARC_TITULO = "###TITULO###";
var PGTPOPIA_MARC_CORPO = "###CORPO###";
var PGTPOPIA_MARC_FIM = "###FIM###";

var PGTPOPIA_REGRAS_BASE =
  "Você é um engenheiro clínico sênior, especializado em elaborar documentação de gestão tecnológica " +
  "hospitalar (Planos de Gerenciamento de Tecnologias em Saúde e Procedimentos Operacionais Padrão), no " +
  "padrão real usado pela Metrolabs Soluções em Engenharia Clínica.\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Nunca invente dado do hospital que não está explicitamente no CONTEXTO abaixo. Se um dado não foi " +
  "informado, não o mencione, não presuma um valor.\n" +
  "2. O documento tem que ser especificamente amarrado a ESTE hospital — cite o nome real do hospital ao " +
  "longo do texto sempre que fizer sentido, nunca um texto genérico 'copia e cola'.\n" +
  "3. Nunca cite nome de marca, fabricante específico ou produto comercial — refira-se a equipamentos pelo " +
  "tipo genérico (ex.: 'monitores multiparamétricos', 'bombas de infusão').\n" +
  "4. Se houver um ROTEIRO fornecido pelo usuário no CONTEXTO, siga-o como guia estrutural (seções, ordem, " +
  "ênfases que ele pede) — não invente conteúdo que contradiga ou ignore o roteiro. Se o roteiro for parcial, " +
  "complete o restante com seu próprio conhecimento técnico, mantendo coerência com o que o roteiro já define.\n" +
  "5. Se NÃO houver roteiro, monte a estrutura completa usando a ESTRUTURA-PADRÃO SUGERIDA do CONTEXTO como " +
  "ponto de partida — pode ajustar, expandir ou reordenar seções conforme o assunto específico do documento " +
  "(POPs reais de assuntos diferentes têm seções diferentes — ex.: um POP de treinamento não precisa das " +
  "mesmas seções que um POP de descarte de equipamento).\n" +
  "6. TOM E FORMATO: o padrão real da Metrolabs é OPERACIONAL, não acadêmico — frases diretas e objetivas, " +
  "passos numerados ou em sequência clara quando descrever um procedimento, terminologia técnica precisa. " +
  "NÃO transforme isso em redação longa e floreada. 'Enriquecer' aqui significa ser mais COMPLETO e " +
  "tecnicamente mais robusto que um rascunho básico — cobrir responsabilidades, critérios objetivos, exceções " +
  "e consequências de não conformidade quando pertinente — não significa alongar o texto com prosa genérica.\n" +
  "7. Sem markdown (sem negrito, itálico, listas com marcadores tipo '-' ou '*') — se precisar de uma " +
  "sequência de passos, numere com '1.', '2.', '3.' dentro do próprio parágrafo/linha.\n" +
  "8. Nunca prometa nenhum outro documento além deste mesmo que está sendo gerado.";

/**
 * Regras específicas do PGT (2026-08-14, v15) — mesma base do
 * PGTPOPIA_REGRAS_BASE, mas a regra 6 é reescrita: o usuário pediu
 * explicitamente um PGTS "muito mais robusto, com diversas páginas,
 * textos longos e muito explicativos, nada resumido" — o oposto do que
 * a regra 6 original instrui (que foi calibrada pro tom enxuto dos
 * POPs, que não teve reclamação nenhuma). A regra 8 também precisa de
 * uma exceção: só o ÚLTIMO bloco do PGT (Documentos e Procedimentos
 * Relacionados) tem permissão de citar/listar os outros documentos do
 * hospital — é o propósito daquele bloco especificamente.
 */
var PGTPOPIA_REGRAS_PGT =
  "Você é um engenheiro clínico sênior, especializado em elaborar Planos de Gerenciamento de Tecnologias em " +
  "Saúde (PGTS) completos e robustos, no padrão real usado pela Metrolabs Soluções em Engenharia Clínica, em " +
  "conformidade com a RDC nº 509/2021 (ANVISA) e a NBR 15943:2011 (ABNT).\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Nunca invente dado do hospital que não está explicitamente no CONTEXTO abaixo. Se um dado não foi " +
  "informado, não o mencione, não presuma um valor.\n" +
  "2. O documento tem que ser especificamente amarrado a ESTE hospital — cite o nome real do hospital ao " +
  "longo do texto sempre que fizer sentido, nunca um texto genérico 'copia e cola'.\n" +
  "3. Nunca cite nome de marca, fabricante específico ou produto comercial — refira-se a equipamentos pelo " +
  "tipo genérico (ex.: 'monitores multiparamétricos', 'bombas de infusão').\n" +
  "4. Se houver um ROTEIRO fornecido pelo usuário no CONTEXTO, siga-o como guia — aplique nas seções deste " +
  "bloco específico onde ele for pertinente, sem contradizê-lo. Se o roteiro não falar nada sobre as seções " +
  "deste bloco, escreva-as normalmente com seu próprio conhecimento técnico.\n" +
  "5. Escreva TODAS as seções listadas em SEÇÕES DESTE BLOCO — nenhuma pode ficar de fora ou virar 1 " +
  "parágrafo genérico só pra 'cumprir tabela'.\n" +
  "6. TOM E EXTENSÃO: o usuário pediu explicitamente um documento ROBUSTO, LONGO e MUITO EXPLICATIVO — cada " +
  "seção precisa de vários parágrafos bem desenvolvidos, com profundidade técnica real: explique o PORQUÊ de " +
  "cada exigência (não só o QUE fazer), cite a base normativa pertinente quando fizer sentido, dê critérios " +
  "objetivos e mensuráveis, cubra responsabilidades, exceções, e consequências de não conformidade. Isto NÃO " +
  "é o tom operacional enxuto dos POPs — aqui é prosa técnica corrida, formal, de plano institucional, " +
  "detalhada o suficiente para ocupar várias páginas quando impressa. Nunca resuma uma seção em 1-2 frases " +
  "curtas quando o assunto comporta explicação mais completa. Evite só repetir a mesma ideia com palavras " +
  "diferentes só pra parecer mais longo — cada parágrafo precisa agregar informação nova e concreta.\n" +
  "7. Sem markdown (sem negrito, itálico, listas com marcadores tipo '-' ou '*') — se precisar de uma " +
  "sequência de passos, numere com '1.', '2.', '3.' dentro do próprio parágrafo/linha.\n" +
  "8. Este é um entre vários blocos que formam o PGTS completo — não prometa nenhum documento SEPARADO " +
  "(nenhum outro PGT/POP), a não ser que o CONTEXTO deste bloco especificamente peça pra listar os POPs e " +
  "documentos do hospital (só o bloco de fechamento pede isso).";

function PgtPopIA_montarInstrucaoFormato_(temImagens, qtdImagens) {
  var linhas = [];
  linhas.push(
    "Responda SOMENTE em texto puro (sem JSON, sem markdown além do pedido abaixo, sem crase), seguindo " +
    "EXATAMENTE esta estrutura:"
  );
  linhas.push(PGTPOPIA_MARC_TITULO);
  linhas.push("(uma linha só, com o título completo do documento)");
  linhas.push(PGTPOPIA_MARC_CORPO);
  linhas.push(
    "(o corpo do documento inteiro aqui. Cada seção começa com o título dela sozinho entre cerquilhas duplas, " +
    "assim: ## Nome da Seção ##, seguido do texto da seção em um ou mais parágrafos ou passos numerados. Pule " +
    "uma linha em branco entre parágrafos e entre seções." +
    (temImagens ? (" Quando for natural referenciar uma das " + qtdImagens + " imagens anexadas dentro do " +
      "corpo (ex.: num passo do procedimento que ela ilustra), cite-a como 'Figura N' (N = número da imagem, " +
      "1 a " + qtdImagens + ", na ordem em que foram anexadas — ver CONTEXTO).") : "")
  );
  if (temImagens) {
    for (var i = 1; i <= qtdImagens; i++) {
      linhas.push("###IMG" + i + "###");
      linhas.push("(interpretação técnica objetiva da imagem " + i + " — o que ela mostra e por que é relevante para este documento, 1 parágrafo curto)");
    }
  }
  linhas.push(PGTPOPIA_MARC_FIM);
  return linhas.join("\n");
}

function PgtPopIA_extrair_(texto, temImagens, qtdImagens, tituloPadrao) {
  var limpo = String(texto || "")
    .replace(/\r\n/g, "\n")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  var marcadores = [PGTPOPIA_MARC_TITULO, PGTPOPIA_MARC_CORPO];
  var imgMarcadores = [];
  if (temImagens) {
    for (var i = 1; i <= qtdImagens; i++) {
      imgMarcadores.push("###IMG" + i + "###");
    }
  }
  var todos = marcadores.concat(imgMarcadores).concat([PGTPOPIA_MARC_FIM]);

  function acharBloco(marcador) {
    var idxInicio = limpo.indexOf(marcador);
    if (idxInicio === -1) return null;
    var inicioTexto = idxInicio + marcador.length;
    var fimTexto = limpo.length;
    todos.forEach(function (m) {
      if (m === marcador) return;
      var idxFim = limpo.indexOf(m, inicioTexto);
      if (idxFim !== -1 && idxFim < fimTexto) fimTexto = idxFim;
    });
    return limpo.slice(inicioTexto, fimTexto).trim();
  }

  var titulo = acharBloco(PGTPOPIA_MARC_TITULO);
  var corpo = acharBloco(PGTPOPIA_MARC_CORPO);
  // (26/10/2026) A IA às vezes esquece a marca do título ou do corpo e manda o texto
  // com as seções certas. Vale o texto quando há seções "## ... ##" e o título vem do
  // sistema (o PGT nem usa o título da IA; o POP usa o nome escolhido).
  if (!corpo && /^##[^#\n]+##[ \t]*$/m.test(limpo)) {
    var semMarcas = limpo; // o corpo começa na primeira seção; o título, se veio, fica antes dela
    var idxPrimeira = semMarcas.search(/^##[^#\n]+##[ \t]*$/m);
    var idxCorte = semMarcas.length;
    todos.forEach(function (m) {
      if (m === PGTPOPIA_MARC_TITULO || m === PGTPOPIA_MARC_CORPO) return;
      var i = semMarcas.indexOf(m, idxPrimeira);
      if (i !== -1 && i < idxCorte) idxCorte = i;
    });
    corpo = semMarcas.slice(idxPrimeira, idxCorte).trim();
  }
  if (!titulo && corpo && tituloPadrao) titulo = tituloPadrao;
  if (!titulo || !corpo) {
    throw new Error("A IA retornou o documento incompleto (título ou corpo ausente). Provável corte por limite de tokens — tente gerar novamente.");
  }

  var interpretacoes = imgMarcadores.map(function (m) { return acharBloco(m) || ''; });

  return { titulo: titulo, corpo: corpo, interpretacoes: interpretacoes };
}

function PgtPopIA_montarContextoHospital_(hospital) {
  var linhas = [];
  linhas.push("HOSPITAL/INSTITUIÇÃO: " + (hospital.razaoSocial || "-"));
  if (hospital.cnpj) linhas.push("CNPJ: " + hospital.cnpj);
  if (hospital.cidade || hospital.uf) linhas.push("LOCALIZAÇÃO: " + [hospital.cidade, hospital.uf].filter(Boolean).join("/"));
  if (hospital.porte) linhas.push("PORTE/TIPO: " + hospital.porte);
  if (hospital.leitos) linhas.push("Nº DE LEITOS: " + hospital.leitos);
  return linhas.join("\n");
}

/**
 * Gera o texto de UM documento (PGT ou POP), uma chamada de Gemini —
 * multimodal (texto + imagens) quando houver imagens anexadas.
 * @param {string} tipo 'PGT' | 'POP'
 * @param {object} hospital dados do hospital
 * @param {string} roteiro roteiro opcional do usuário pra este documento específico
 * @param {object|null} pop { codigo, nome } — só quando tipo === 'POP'
 * @param {Array} imagens [{ base64, mimeType, legenda }] (opcional)
 * @return {{titulo: string, textoGerado: string, imagensComInterpretacao: Array}}
 */
function PgtPop_gerarTextoIA_(tipo, hospital, roteiro, pop, imagens) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.");
  }

  imagens = Array.isArray(imagens) ? imagens : [];
  var temImagens = imagens.length > 0;

  var contextoLinhas = [];
  contextoLinhas.push("TIPO DE DOCUMENTO: " + (tipo === 'PGT' ? "Plano de Gerenciamento de Tecnologias em Saúde (PGTS)" : "Procedimento Operacional Padrão (POP)"));
  contextoLinhas.push(PgtPopIA_montarContextoHospital_(hospital));
  contextoLinhas.push("");
  contextoLinhas.push("BASE NORMATIVA (citar exatamente assim, sem adicionar outras normas não confirmadas): " + PGTPOP_CFG.BASE_NORMATIVA);

  var estruturaSugerida;
  if (tipo === 'PGT') {
    estruturaSugerida = PGTPOP_CFG.ESTRUTURA_PGT_PADRAO;
  } else {
    contextoLinhas.push("");
    contextoLinhas.push("NOME DO POP: " + pop.nome);
    if (pop.codigo) contextoLinhas.push("CÓDIGO DO POP: " + pop.codigo);
    estruturaSugerida = PGTPOP_CFG.ESTRUTURA_POP_PADRAO;
  }

  var roteiroLimpo = String(roteiro || "").trim();
  contextoLinhas.push("");
  if (roteiroLimpo) {
    contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO (siga como guia estrutural, ver regra 4):");
    contextoLinhas.push(roteiroLimpo);
  } else {
    contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO: nenhum — monte a estrutura você mesmo (ver regra 5).");
    contextoLinhas.push("ESTRUTURA-PADRÃO SUGERIDA (ponto de partida, ajuste conforme o assunto):");
    estruturaSugerida.forEach(function (secao) { contextoLinhas.push("  - " + secao); });
  }

  if (temImagens) {
    contextoLinhas.push("");
    contextoLinhas.push("IMAGENS ANEXADAS NESTA MENSAGEM (nesta ordem):");
    imagens.forEach(function (img, i) {
      contextoLinhas.push("  IMAGEM " + (i + 1) + ": " + (img.legenda ? ("legenda fornecida pelo usuário: \"" + img.legenda + "\"") : "sem legenda fornecida — descreva o que a imagem mostra."));
    });
  }

  var prompt =
    PGTPOPIA_REGRAS_BASE + "\n\n" +
    "TAREFA: escreva o documento completo descrito no CONTEXTO abaixo, no padrão real de POP/PGT da Metrolabs " +
    "(ver regra 6 sobre tom).\n\n" +
    "CONTEXTO REAL (única fonte de fatos permitida sobre o hospital):\n" + contextoLinhas.join("\n") + "\n\n" +
    PgtPopIA_montarInstrucaoFormato_(temImagens, imagens.length);

  var parts = [{ text: prompt }];
  imagens.forEach(function (img) {
    parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.base64 } });
  });

  var tituloPadrao = tipo === 'PGT' ? "Plano de Gerenciamento de Tecnologias em Saúde (PGTS)" : ("Procedimento Operacional Padrão — " + pop.nome);
  var resultadoPop = PgtPopIA_chamarGeminiComParts_(chave, parts, PGTPOPIA_TOKENS, temImagens, imagens.length, imagens, tituloPadrao);
  // (2026-10-16) Mesma rede de segurança contra markdown residual que o PGT
  // já usa (PgtPopIA_removerMarkdownResidual_) — o POP não tinha.
  resultadoPop.textoGerado = PgtPopIA_removerMarkdownResidual_(resultadoPop.textoGerado);
  return resultadoPop;
}

/**
 * Faz a chamada de Gemini com retentativa/fallback de modelo (extraído
 * de PgtPop_gerarTextoIA_ em 2026-08-14 pra ser reaproveitado também
 * pela geração em blocos do PGT, ver PgtPop_gerarTextoPGT_). Devolve o
 * mesmo formato de sempre ou lança exceção com o erro de todos os
 * modelos tentados.
 */
function PgtPopIA_chamarGeminiComParts_(chave, parts, tokens, temImagens, qtdImagens, imagens, tituloPadrao) {
  var errosPorModelo = [];
  for (var mi = 0; mi < PGTPOPIA_MODELOS_FALLBACK.length; mi++) {
    var modelo = PGTPOPIA_MODELOS_FALLBACK[mi];
    var erroModelo = "falha desconhecida";
    for (var tent = 0; tent < PGTPOPIA_MAX_TENTATIVAS; tent++) {
      if (tent > 0) Utilities.sleep(PGTPOPIA_DELAYS_MS[tent - 1] || 1600);

      var url = "https://generativelanguage.googleapis.com/v1/models/" + encodeURIComponent(modelo) +
        ":generateContent?key=" + encodeURIComponent(chave);
      var resp = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ role: "user", parts: parts }],
          generationConfig: { temperature: 0.25, topP: 0.95, maxOutputTokens: Math.min(tokens, PGTPOPIA_TETO_MODELO[modelo] || tokens) }
        })
      });

      var codigo = resp.getResponseCode();
      var corpoResp = {};
      try { corpoResp = JSON.parse(resp.getContentText()); } catch (e) {}

      if (codigo === 200) {
        var cand = corpoResp.candidates && corpoResp.candidates[0];
        if (cand && cand.finishReason === 'MAX_TOKENS') { erroModelo = 'resposta da IA cortada no limite de tamanho'; break; }
        var partesResp = cand && cand.content && cand.content.parts;
        // (26/10/2026) Só o texto da resposta: as partes de raciocínio (thought) não entram no documento.
        var texto = (partesResp || []).map(function (p) { return p && p.text && !p.thought ? p.text : ""; }).join("").trim();
        if (!texto) { erroModelo = "resposta vazia"; continue; }
        // (26/10/2026) Resposta fora do formato tenta de novo (mesmo modelo, depois o reserva)
        // em vez de parar a geração inteira na primeira vez.
        var extraido;
        try { extraido = PgtPopIA_extrair_(texto, temImagens, qtdImagens, tituloPadrao); }
        catch (eFmt) { erroModelo = 'a IA devolveu o documento incompleto ou fora do formato'; continue; }
        var imagensComInterpretacao = (imagens || []).map(function (img, i) {
          return {
            base64: img.base64,
            mimeType: img.mimeType || 'image/jpeg',
            legenda: img.legenda || '',
            interpretacao: extraido.interpretacoes[i] || ''
          };
        });
        return { titulo: extraido.titulo, textoGerado: extraido.corpo, imagensComInterpretacao: imagensComInterpretacao };
      }

      if (codigo === 401 || codigo === 403) {
        throw new Error("Chave GEMINI_API_KEY inválida ou sem autorização (HTTP " + codigo + ").");
      }
      var msgApi = (corpoResp && corpoResp.error && corpoResp.error.message) || ("HTTP " + codigo);
      erroModelo = msgApi;
      if (codigo === 429 || codigo === 404) break; // tenta o próximo modelo
      if (codigo < 500) break; // erro de requisição, não adianta repetir
    }
    errosPorModelo.push(modelo + ": " + erroModelo);
  }

  throw new Error(
    "Falha ao gerar o documento após tentar " + PGTPOPIA_MODELOS_FALLBACK.length +
    " modelo(s) — " + errosPorModelo.join(" | ")
  );
}

/* ============================================================
 * GERAÇÃO DO PGT EM BLOCOS (v15, 2026-08-14)
 * 6 chamadas de Gemini sequenciais, uma por bloco de seções, em vez de
 * 1 chamada única cobrindo as ~28 seções do ESTRUTURA_PGT_PADRAO — ver
 * comentário em PGTPOPIA_TOKENS_PGT sobre o motivo. Os corpos são
 * concatenados na ordem no final; o parser de HTML (PgtPopDoc_
 * corpoParaHtml_, em SGO_PgtPop_Documento.js) já separa por "## Seção
 * ##" dentro do texto corrido, então a concatenação simples funciona
 * sem mudar nada do lado do Documento.js.
 * ============================================================ */
var PGTPOPIA_BLOCOS_PGT = Object.freeze([
  Object.freeze({
    nome: "Abertura e Termos e Definições",
    secoes: ['Escopo', 'Finalidade', 'Justificativa',
      'Termos e Definições (glossário extenso, ~40-50 termos técnicos da ABNT NBR 15943 — ex.: Acessório, Autoridade Sanitária Competente, Calibração, Código de Identificação Individual, Confiabilidade, Comissionamento, Dano, Disponibilidade, Durabilidade, Educação Permanente, EPC, EPI, Equipamento para Saúde, Eventos Adversos, Fabricante, Falha, Fornecedor, Gerenciamento de Equipamentos, Inspeção, Intervenção Técnica, Inventário, Mantenabilidade, Manutenção, Não Conformidade, Operador, Perigo, Prestador de Serviços, Rastreabilidade, Recall, Registro Histórico, Risco, Treinamento, Uso, Usuários, Validação, entre outros pertinentes — defina CADA termo com 1-2 frases técnicas precisas, não pule nenhum)'],
    imagens: true
  }),
  Object.freeze({
    nome: "Requisitos Gerais",
    secoes: ['Requisitos Gerais: Organização', 'Requisitos Gerais: Infraestrutura', 'Requisitos Gerais: Gestão de Pessoal', 'Requisitos Gerais: Documentação']
  }),
  Object.freeze({
    nome: "Requisitos Específicos I — Planejamento até Instalação",
    secoes: ['Requisitos Específicos: Planejamento e Seleção', 'Requisitos Específicos: Aquisição',
      'Requisitos Específicos: Recebimento, Verificação e Aceitação (incluindo procedimento de ensaio de aceitação)',
      'Requisitos Específicos: Inventário (lista de inventário, informações incluídas, atualização, auditoria)',
      'Requisitos Específicos: Instalação']
  }),
  Object.freeze({
    nome: "Requisitos Específicos II — Registro até Transferência",
    secoes: ['Requisitos Específicos: Registro Histórico do Equipamento', 'Requisitos Específicos: Arquivo de Registros',
      'Requisitos Específicos: Treinamento (responsabilidade e documentação do treinamento)',
      'Requisitos Específicos: Armazenamento', 'Requisitos Específicos: Transferência Interna de Equipamento']
  }),
  Object.freeze({
    nome: "Requisitos Específicos III — Uso até Evento Adverso",
    secoes: ['Requisitos Específicos: Uso',
      'Requisitos Específicos: Intervenção Técnica (manutenção corretiva; manutenção preventiva; critérios de análise de risco para priorização da MP)',
      'Requisitos Específicos: Desativação', 'Requisitos Específicos: Descarte',
      'Requisitos Específicos: Evento Adverso Relacionado ao Equipamento']
  }),
  Object.freeze({
    nome: "Fechamento e Documentos Relacionados",
    secoes: ['Referências às Legislações, Regulamentos e Normas', 'Periodicidade', 'Material',
      'Responsável pela Elaboração do PGTS', 'Recursos Humanos para Implantação do Serviço de Engenharia Clínica',
      'Atribuições do Serviço de Engenharia Clínica'],
    documentosRelacionados: true
  })
]);

/**
 * Monta a lista de POPs+documentos pra injetar no bloco de fechamento
 * — POPs selecionados/gerados nesta rodada (payload.popsRelacionados,
 * já disponíveis no wizard antes de gerar o PGT) + os PDFs que já
 * existem na pasta do CNPJ (histórico de gerações anteriores, se
 * houver). A IA usa essa lista pra escrever, POP por POP, por que ele
 * se aplica a este hospital, e listar os documentos já existentes.
 */
function PgtPopIA_montarContextoDocumentos_(hospital, popsRelacionados) {
  var linhas = [];
  var pops = Array.isArray(popsRelacionados) ? popsRelacionados : [];
  if (pops.length) {
    linhas.push("PROCEDIMENTOS OPERACIONAIS PADRÃO (POPs) SELECIONADOS PARA ESTE HOSPITAL NESTA GERAÇÃO:");
    pops.forEach(function (p) {
      linhas.push("  - " + (p.codigo ? (p.codigo + " — ") : "") + p.nome);
    });
  }

  // Sempre explícito (mesmo quando vazio) — sem isso, a IA já demonstrou
  // que INVENTA documentos plausíveis pra preencher a seção (achado real
  // em teste, 2026-08-14: listou os outros blocos do próprio PGT como se
  // fossem arquivos separados pré-existentes). "(se houver)" sozinho no
  // texto da instrução não bastou pra evitar isso.
  linhas.push("");
  var arquivosExistentes = [];
  try {
    var existentes = PgtPop_apiListarArquivosPdf({ cnpj: hospital && hospital.cnpj });
    if (existentes && existentes.ok && existentes.arquivos) arquivosExistentes = existentes.arquivos;
  } catch (e) {
    // não bloqueia a geração do PGT se a listagem de arquivos falhar
  }
  if (arquivosExistentes.length) {
    linhas.push("DOCUMENTOS JÁ EXISTENTES (gerados anteriormente) PARA ESTE HOSPITAL:");
    arquivosExistentes.forEach(function (a) {
      linhas.push("  - " + a.nome + " (" + a.data + ")");
    });
  } else {
    linhas.push("DOCUMENTOS JÁ EXISTENTES PARA ESTE HOSPITAL: NENHUM — é a primeira geração de documentos pra " +
      "este hospital no sistema. NÃO invente nem liste nenhum documento anterior; a seção deve mencionar " +
      "apenas os POPs selecionados nesta geração (listados acima).");
  }

  return linhas.join("\n");
}

/**
 * Rede de segurança contra markdown residual (2026-08-14, achado real
 * em teste: mesmo com a regra 7 pedindo "sem markdown", o bloco de
 * fechamento às vezes devolveu "**POP025 —**" e listas com "*   " —
 * instrução de prompt sozinha não é 100% confiável, mesma lição do bug
 * do Date cru mais cedo hoje. Remove negrito/itálico e marcadores de
 * lista residuais antes do texto virar HTML.
 */
function PgtPopIA_removerMarkdownResidual_(texto) {
  return String(texto || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^[ \t]*[*\-][ \t]+/gm, '')
    .replace(/\*(.*?)\*/g, '$1');
}

/**
 * Gera o PGT completo em 6 chamadas de Gemini (uma por bloco de
 * PGTPOPIA_BLOCOS_PGT), concatenando os corpos na ordem.
 * @param {object} hospital dados do hospital
 * @param {string} roteiro roteiro opcional do usuário (aplicado a todos os blocos)
 * @param {Array} imagens [{ base64, mimeType, legenda }] (opcional, só entram no 1º bloco)
 * @param {Array} popsRelacionados [{ codigo, nome }] — POPs selecionados pra este hospital nesta geração
 * @param {function(number,number,string)} [aoIniciarBloco] callback opcional (i, total, nomeBloco) pra log de progresso
 * @return {{titulo: string, textoGerado: string, imagensComInterpretacao: Array}}
 */
function PgtPop_gerarTextoPGT_(hospital, roteiro, imagens, popsRelacionados, aoIniciarBloco) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.");
  }

  imagens = Array.isArray(imagens) ? imagens : [];
  var roteiroLimpo = String(roteiro || "").trim();
  var contextoDocumentos = PgtPopIA_montarContextoDocumentos_(hospital, popsRelacionados);

  // Título é composto na hora, não vem da IA — achado real em teste
  // (2026-08-14): usando o título gerado pelo bloco 1, a IA às vezes
  // vazava a numeração interna do bloco pro título ("... - Bloco 1 de
  // 6"), já que o contexto de cada bloco menciona "bloco X de Y" pra
  // ela mesma se orientar. Um título fixo evita essa classe de bug de
  // vez, sem depender só do prompt pra não vazar.
  var tituloFinal = "Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — " + (hospital.razaoSocial || "");
  var corposFinal = [];
  var imagensComInterpretacaoFinal = [];

  for (var b = 0; b < PGTPOPIA_BLOCOS_PGT.length; b++) {
    var bloco = PGTPOPIA_BLOCOS_PGT[b];
    if (typeof aoIniciarBloco === 'function') aoIniciarBloco(b + 1, PGTPOPIA_BLOCOS_PGT.length, bloco.nome);

    var imagensDoBloco = bloco.imagens ? imagens : [];
    var temImagens = imagensDoBloco.length > 0;

    var contextoLinhas = [];
    contextoLinhas.push("TIPO DE DOCUMENTO: Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — bloco " + (b + 1) + " de " + PGTPOPIA_BLOCOS_PGT.length + " (" + bloco.nome + ")");
    contextoLinhas.push(PgtPopIA_montarContextoHospital_(hospital));
    contextoLinhas.push("");
    contextoLinhas.push("BASE NORMATIVA (citar exatamente assim, sem adicionar outras normas não confirmadas): " + PGTPOP_CFG.BASE_NORMATIVA);
    contextoLinhas.push("");
    if (roteiroLimpo) {
      contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO PRO PGT (aplique nas seções deste bloco onde for pertinente, ver regra 4):");
      contextoLinhas.push(roteiroLimpo);
      contextoLinhas.push("");
    }
    contextoLinhas.push("SEÇÕES DESTE BLOCO (escreva TODAS, ver regra 5):");
    bloco.secoes.forEach(function (secao) { contextoLinhas.push("  - " + secao); });

    if (bloco.documentosRelacionados && contextoDocumentos) {
      contextoLinhas.push("");
      contextoLinhas.push("Além das seções acima, este bloco de fechamento também deve incluir uma seção chamada " +
        "\"Documentos e Procedimentos Relacionados\", explicando — POP por POP — por que cada procedimento " +
        "listado abaixo se aplica a este hospital especificamente, e depois listando os documentos já " +
        "existentes (se houver):");
      contextoLinhas.push(contextoDocumentos);
    }

    if (temImagens) {
      contextoLinhas.push("");
      contextoLinhas.push("IMAGENS ANEXADAS NESTA MENSAGEM (nesta ordem):");
      imagensDoBloco.forEach(function (img, i) {
        contextoLinhas.push("  IMAGEM " + (i + 1) + ": " + (img.legenda ? ("legenda fornecida pelo usuário: \"" + img.legenda + "\"") : "sem legenda fornecida — descreva o que a imagem mostra."));
      });
    }

    var prompt =
      PGTPOPIA_REGRAS_PGT + "\n\n" +
      "TAREFA: escreva SOMENTE as seções deste bloco (ver regra 5), com a profundidade e extensão pedidas na " +
      "regra 6. Não repita conteúdo de outros blocos do PGTS.\n\n" +
      "CONTEXTO REAL (única fonte de fatos permitida sobre o hospital):\n" + contextoLinhas.join("\n") + "\n\n" +
      PgtPopIA_montarInstrucaoFormato_(temImagens, imagensDoBloco.length);

    var parts = [{ text: prompt }];
    imagensDoBloco.forEach(function (img) {
      parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.base64 } });
    });

    var resultado = PgtPopIA_chamarGeminiComParts_(chave, parts, PGTPOPIA_TOKENS_PGT, temImagens, imagensDoBloco.length, imagensDoBloco, tituloFinal);

    corposFinal.push(PgtPopIA_removerMarkdownResidual_(resultado.textoGerado));
    if (resultado.imagensComInterpretacao && resultado.imagensComInterpretacao.length) {
      imagensComInterpretacaoFinal = imagensComInterpretacaoFinal.concat(resultado.imagensComInterpretacao);
    }
  }

  return {
    titulo: tituloFinal,
    textoGerado: corposFinal.join("\n\n"),
    imagensComInterpretacao: imagensComInterpretacaoFinal
  };
}
