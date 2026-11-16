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
 *
 * 14/11/2026 (refação pelas fichas técnicas do especialista): a IA recebe a FICHA do documento (SGO_PgtPop_Fichas.js:
 * objetivo, abrangência, seções na ordem, conteúdo mínimo, passos, responsabilidades, registros, indicadores,
 * periodicidade), as respostas do estabelecimento, a lista fechada de normas vigentes da ficha e o glossário fixo.
 * Saíram "cite o nome do hospital ao longo do texto" e o "PGT longo" com enchimento. O sistema monta as referências
 * normativas, o glossário e os documentos relacionados do PGT. A conferência depois da IA (PgtPopIA_revisarTexto_)
 * marca item mínimo ausente, norma fora da lista, número que o estabelecimento não informou e setor não informado.
 * O PGT continua em 6 blocos, agora pelas seções da ficha do PGTS.
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
  "Você redige Procedimentos Operacionais Padrão (POPs) de engenharia clínica no padrão da Metrolabs Soluções em " +
  "Engenharia Clínica, a partir da FICHA TÉCNICA do documento, conferida por especialista, e dos dados informados pelo " +
  "estabelecimento.\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Os fatos sobre o estabelecimento vêm só de DADOS INFORMADOS PELO ESTABELECIMENTO e do CONTEXTO. O que não foi " +
  "informado não é presumido: escreva \"a definir pelo estabelecimento\" no ponto em que o assunto aparece e siga. Nunca " +
  "invente setor, equipe, quantidade, prazo, meta, frequência ou recurso.\n" +
  "2. O nome do estabelecimento já sai na identificação do documento: no texto, escreva \"o estabelecimento\". Não escreva " +
  "o nome do estabelecimento no texto.\n" +
  "3. Nunca cite nome de marca, fabricante, software ou produto comercial; use o tipo genérico (ex.: 'bombas de infusão', " +
  "'sistema informatizado de gestão').\n" +
  "4. Escreva SOMENTE as seções da lista SEÇÕES, nesta ordem e com estes títulos. As referências normativas são montadas " +
  "pelo sistema: não escreva seção de referências nem de base normativa.\n" +
  "5. Cubra todos os itens de CONTEÚDO MÍNIMO. No Procedimento, siga os PASSOS ESSENCIAIS na ordem, em passos numerados. " +
  "Use os papéis de RESPONSABILIDADES e liste os REGISTROS. Indicador vai com a fórmula; a meta só entra se o " +
  "estabelecimento informou; senão, escreva \"meta a definir pelo estabelecimento\". A periodicidade da ficha é referência: " +
  "vale a que o estabelecimento informou; sem ela, \"a definir pelo estabelecimento\".\n" +
  "6. Normas: cite só as da BASE NORMATIVA DESTE DOCUMENTO, com o texto indicado, e nenhum número de artigo ou item que não " +
  "esteja na ficha.\n" +
  "7. Situação real: o que o estabelecimento informou que já existe é descrito como prática; o que está em implantação " +
  "ou não existe é escrito como exigência (\"deve\"). Nunca afirme que algo foi estabelecido ou implantado sem que isso " +
  "tenha sido informado.\n" +
  "8. Tom operacional: frases diretas, parágrafos curtos, sem repetir a mesma ideia. A completude vem de cobrir a ficha, " +
  "não de alongar o texto. Use as DEFINIÇÕES PADRONIZADAS sempre que definir um termo.\n" +
  "9. Sem markdown (sem negrito, itálico, listas com '-' ou '*'): passos numerados com '1.', '2.', '3.'.\n" +
  "10. Pode remeter a outro POP só se ele estiver em POPS DO CONJUNTO, pelo código e título dados ali. Nunca prometa " +
  "outro documento.";

/**
 * Regras do PGT (14/11/2026, fichas técnicas): o PGT continua completo e explicativo, mas cada parágrafo ligado a um item
 * da ficha, sem repetição nem enchimento. Gerado em 6 blocos (PGTPOPIA_BLOCOS_PGT); o glossário, os documentos
 * relacionados e as referências normativas são montados pelo sistema.
 */
var PGTPOPIA_REGRAS_PGT =
  "Você redige o Plano de Gerenciamento de Tecnologias em Saúde (PGTS) de equipamentos de saúde no padrão da Metrolabs " +
  "Soluções em Engenharia Clínica, a partir da FICHA TÉCNICA do PGTS, conferida por especialista, e dos dados informados " +
  "pelo estabelecimento.\n" +
  "REGRAS ABSOLUTAS — nunca violar:\n" +
  "1. Os fatos sobre o estabelecimento vêm só de DADOS INFORMADOS PELO ESTABELECIMENTO e do CONTEXTO. O que não foi " +
  "informado não é presumido: escreva \"a definir pelo estabelecimento\" no ponto em que o assunto aparece. Nunca invente " +
  "setor, equipe, dimensionamento, metragem, quantidade, prazo, meta, frequência ou recurso.\n" +
  "2. O nome do estabelecimento já sai na capa e na identificação: no texto, escreva \"o estabelecimento\".\n" +
  "3. Nunca cite nome de marca, fabricante, software ou produto comercial; use o tipo genérico.\n" +
  "4. Escreva TODAS as seções de SEÇÕES DESTE BLOCO, nesta ordem e com estes títulos, e nenhuma outra. O glossário, a " +
  "lista de documentos relacionados e as referências normativas são montados pelo sistema: não os escreva.\n" +
  "5. Cada item de CONTEÚDO MÍNIMO DESTE BLOCO tem de estar no texto. Cada etapa do ciclo de vida traz o critério " +
  "adotado, quem responde, o registro gerado e o POP correspondente (só os de POPS DO CONJUNTO, pelo código e título).\n" +
  "6. TOM E EXTENSÃO: plano institucional completo e explicativo, em prosa técnica formal. Explique o porquê de cada " +
  "exigência com a base normativa da lista. Cada parágrafo trata de um item da ficha ou de um dado do estabelecimento; " +
  "não repita ideias nem conteúdo de outros blocos, e não alongue o texto para ocupar espaço.\n" +
  "7. Situação real: o que o estabelecimento informou que já existe é descrito como prática; o que está em implantação " +
  "ou não existe é escrito como exigência (\"deve\") e entra no cronograma. Nunca afirme que algo foi estabelecido ou " +
  "implantado sem que isso tenha sido informado.\n" +
  "8. Normas: cite só as da BASE NORMATIVA DESTE DOCUMENTO, com o texto indicado; artigos da RDC 509 só os do MAPA DA " +
  "RDC 509. Use as DEFINIÇÕES PADRONIZADAS sempre que usar um termo definido.\n" +
  "9. Sem markdown (sem negrito, itálico, listas com '-' ou '*'): sequências numeradas com '1.', '2.', '3.'.\n" +
  "10. Este é um entre 6 blocos do PGTS: não prometa documento separado além dos POPs de POPS DO CONJUNTO.";

/**
 * (26/10/2026, pedido do dono) Todo documento é escrito como por um especialista
 * sênior no assunto específico dele, além do engenheiro clínico: o POP pelo tema do
 * POP, cada bloco do PGT pelo tema das seções do bloco. As regras absolutas valem
 * igual (sem inventar dado do hospital, só a base normativa informada, sem fabricante).
 * (14/11/2026) Mantido; o conteúdo técnico agora vem da ficha, e a limpeza tira do texto qualquer menção ao especialista.
 */
function PgtPopIA_especialista_(assunto) {
  return "ESPECIALISTA RESPONSÁVEL PELA REDAÇÃO: escreva como um especialista sênior no assunto \"" +
    String(assunto || "").trim() + "\", com anos de prática de campo em estabelecimentos de saúde, além " +
    "da visão de engenharia clínica. Use a terminologia técnica correta e o domínio dos riscos e dos pontos críticos " +
    "do assunto para aplicar a FICHA TÉCNICA com precisão. O conhecimento de especialista não autoriza quebrar as regras " +
    "absolutas: nada de dado do estabelecimento que não esteja no CONTEXTO, nada de norma fora da BASE NORMATIVA " +
    "DESTE DOCUMENTO, nada de conteúdo fora da ficha que contradiga a ficha, e nada de marca ou fabricante.";
}

/**
 * (14/11/2026, auditoria C2/M2/A2/B8) Ajuste mínimo do pedido: o que o documento NÃO traz. O especialista continua
 * orientando a redação (regra do dono), mas não aparece no texto; o sistema já põe identificação, controle de
 * revisões e assinaturas. A limpeza depois da IA (PgtPopIA_revisarTexto_) garante o mesmo se a IA não obedecer.
 */
var PGTPOPIA_REGRA_DOCUMENTO =
  "O QUE NÃO ENTRA NO DOCUMENTO: 1. Não mencione especialista, redator, roteiro, contexto, ficha, instruções, blocos nem a " +
  "forma como o texto foi elaborado; escreva só o conteúdo técnico. 2. Não copie para o documento os rótulos em " +
  "maiúsculas do CONTEXTO. 3. O sistema já põe no documento a identificação, o controle de revisões, a data e as " +
  "assinaturas: não escreva seções de identificação do documento, de histórico ou controle de revisões, nem versão, " +
  "nem campos para preencher entre colchetes. 4. O nome da empresa é sempre \"Metrolabs\", mesmo que o roteiro traga " +
  "outra grafia. 5. O sistema monta as referências normativas (e, no PGT, o glossário e os documentos relacionados): " +
  "não escreva essas seções.";

/* ============================================================
 * FICHAS TÉCNICAS (14/11/2026) — leitura de PGTPOP_FICHAS (SGO_PgtPop_Fichas.js, gerado dos JSON do especialista).
 * Sem o arquivo das fichas (contexto isolado de teste antigo), tudo cai na base normativa e nas estruturas do PGTPOP_CFG.
 * ============================================================ */
function PgtPopIA_fichas_() { return (typeof PGTPOP_FICHAS !== 'undefined' && PGTPOP_FICHAS && PGTPOP_FICHAS.docs) ? PGTPOP_FICHAS : null; }
function PgtPopIA_ficha_(codigo) { var F = PgtPopIA_fichas_(); return F ? (F.docs[String(codigo || '').trim()] || null) : null; }
function PgtPopIA_pergunta_(id) {
  var F = PgtPopIA_fichas_();
  if (!F) return null;
  if (!F._porId) { var m = {}; F.perguntas.forEach(function (p) { m[p.id] = p; }); try { F._porId = m; } catch (e) { return m[id] || null; } }
  return F._porId[id] || null;
}
function PgtPopIA_resposta_(hospital, id) {
  var r = (hospital && hospital.respostas) || {};
  return String(r[id] == null ? '' : r[id]).trim();
}
/** Valor legível ("Sim", "Contratada (empresa especializada)") ou ''. */
function PgtPopIA_respostaTexto_(hospital, id) {
  var v = PgtPopIA_resposta_(hospital, id);
  var p = PgtPopIA_pergunta_(id);
  if (!v || !p) return v;
  var op = p.tipo === 'simnao' ? [['sim', 'Sim'], ['nao', 'Não']] : (p.opcoes || []);
  for (var i = 0; i < op.length; i++) if (op[i][0] === v) return op[i][1];
  return v;
}
/** A pergunta vale para este estabelecimento? (exigeSe: só quando a outra resposta é uma das listadas). */
function PgtPopIA_perguntaAtiva_(p, hospital) {
  if (!p || !p.exigeSe) return true;
  return (p.exigeSe.valores || []).indexOf(PgtPopIA_resposta_(hospital, p.exigeSe.pergunta)) >= 0;
}
/** Perguntas do documento: as da ficha ou, sem ficha (POP avulso), só as comuns. [{ id, obrigatorio }] */
function PgtPopIA_perguntasDoDoc_(codigo) {
  var F = PgtPopIA_fichas_();
  if (!F) return [];
  var f = F.docs[String(codigo || '').trim()];
  return (f ? f.perguntas : F.comuns) || [];
}
function PgtPopIA_condicaoNorma_(se, hospital) {
  if (!se) return true;
  return (se.qualquer || []).some(function (c) { return PgtPopIA_resposta_(hospital, c[0]) === c[1]; });
}
/** Normas da ficha que valem para este estabelecimento: [{ id, comoCitar, chaves, ano }]. Sem ficha: []. */
function PgtPopIA_normasDoDoc_(codigo, hospital) {
  var F = PgtPopIA_fichas_();
  if (!F) return [];
  var f = F.docs[String(codigo || '').trim()] || F.docs.POP001;
  var ids = F.docs[String(codigo || '').trim()] ? f.normas : ['RDC-509-2021', 'NBR-15943-2011'];
  return ids.map(function (id) { return F.normas[id]; }).filter(function (n) { return n && PgtPopIA_condicaoNorma_(n.se, hospital); });
}
/** Seções da utilidade crítica do PGTS só existem com gerador, central de gases ou cilindros. */
function PgtPopIA_temUtilidades_(hospital) {
  return ['rec_gerador', 'rec_central_gases', 'rec_cilindros'].some(function (id) { return PgtPopIA_resposta_(hospital, id) === 'sim'; });
}

function PgtPopIA_contextoNormas_(codigo, hospital) {
  var normas = PgtPopIA_normasDoDoc_(codigo, hospital);
  if (!normas.length) return ["BASE NORMATIVA DESTE DOCUMENTO (citar exatamente assim, sem adicionar outras normas): " + (typeof PGTPOP_CFG !== 'undefined' ? PGTPOP_CFG.BASE_NORMATIVA : '')];
  var l = ["BASE NORMATIVA DESTE DOCUMENTO (lista fechada, conferida em fonte oficial; cite só estas e com este texto):"];
  normas.forEach(function (n) { l.push("  - " + n.comoCitar); });
  return l;
}

function PgtPopIA_contextoDados_(codigo, hospital) {
  var F = PgtPopIA_fichas_();
  var l = [];
  if (!F) return l;
  var infos = [], faltam = [];
  var impl = [];
  PgtPopIA_perguntasDoDoc_(codigo).forEach(function (x) {
    var p = PgtPopIA_pergunta_(x.id);
    if (!p || !PgtPopIA_perguntaAtiva_(p, hospital)) return;
    var v = PgtPopIA_respostaTexto_(hospital, x.id);
    if (p.sub === 'impl') { impl.push(p.rotulo + ": " + (v || "não informado")); return; }
    if (v) infos.push("  - " + p.rotulo + ": " + v.replace(/\s*\n\s*/g, '; '));
    else faltam.push("  - " + p.rotulo);
  });
  l.push("DADOS INFORMADOS PELO ESTABELECIMENTO (únicos fatos sobre ele que o texto pode usar):");
  if (hospital && hospital.porte) l.push("  - Porte e tipo: " + hospital.porte);
  if (hospital && hospital.leitos) l.push("  - Número de leitos: " + hospital.leitos);
  if (hospital && (hospital.cidade || hospital.uf)) l.push("  - Localização: " + [hospital.cidade, hospital.uf].filter(Boolean).join("/"));
  if (hospital && hospital.aprovadorNome) l.push("  - Quem aprova os documentos pelo estabelecimento: " + hospital.aprovadorNome + (hospital.aprovadorCargo ? " (" + hospital.aprovadorCargo + ")" : ""));
  l = l.concat(infos.length ? infos : ["  - (nenhum além da identificação)"]);
  if (impl.length) l.push("  - Situação de implantação de cada etapa: " + impl.join("; "));
  if (faltam.length) {
    l.push("NÃO INFORMADOS (não presuma; onde o assunto aparecer, escreva \"a definir pelo estabelecimento\"):");
    l = l.concat(faltam);
  }
  return l;
}

function PgtPopIA_contextoFicha_(f, hospital, opcoes) {
  opcoes = opcoes || {};
  var l = [];
  l.push("FICHA TÉCNICA DO DOCUMENTO (conteúdo técnico conferido; siga-a):");
  l.push("OBJETIVO: " + f.objetivo);
  l.push("ABRANGÊNCIA: " + f.escopo);
  if (!opcoes.semSecoes) {
    l.push("SEÇÕES (escreva todas, nesta ordem, com estes títulos):");
    f.secoes.forEach(function (s) { l.push("  - " + s); });
  }
  var cm = opcoes.itens || f.conteudoMinimo;
  if (cm.length) {
    l.push((opcoes.rotuloItens || "CONTEÚDO MÍNIMO") + " (cada item tem de aparecer no texto):");
    cm.forEach(function (c) { l.push("  - " + c.item + ": " + c.descricao); });
  }
  if (opcoes.passos !== false && f.passos.length) {
    l.push("PASSOS ESSENCIAIS (na ordem):");
    f.passos.forEach(function (p, i) { l.push("  " + (i + 1) + ". " + p); });
  }
  if (opcoes.responsabilidades !== false && f.responsabilidades.length) {
    l.push("RESPONSABILIDADES (papéis):");
    f.responsabilidades.forEach(function (r) { l.push("  - " + r.papel + ": " + r.atribuicoes); });
  }
  if (opcoes.registros !== false && f.registros.length) l.push("REGISTROS: " + f.registros.join("; ") + ".");
  if (opcoes.indicadores !== false && f.indicadores.length) {
    l.push("INDICADORES (fórmula; a meta é do estabelecimento — a referência abaixo não é meta adotada):");
    f.indicadores.forEach(function (x) { l.push("  - " + x.indicador + ": " + x.formula + " (referência: " + x.metaSugerida + ")"); });
  }
  if (opcoes.periodicidade !== false && f.periodicidade) l.push("PERIODICIDADE DE REFERÊNCIA (o estabelecimento define a sua): " + f.periodicidade);
  if (f.erros && f.erros.length) {
    l.push("ERROS A EVITAR:");
    f.erros.forEach(function (e) { l.push("  - " + e); });
  }
  return l;
}

function PgtPopIA_contextoGlossario_() {
  var F = PgtPopIA_fichas_();
  if (!F || !F.glossario) return [];
  var l = ["DEFINIÇÕES PADRONIZADAS (as mesmas do glossário do PGTS; quando definir um destes termos, use esta definição):"];
  F.glossario.forEach(function (g) { l.push("  - " + g.termo + ": " + g.definicao); });
  return l;
}

function PgtPopIA_contextoPops_(popsRelacionados, codigoAtual) {
  var pops = (Array.isArray(popsRelacionados) ? popsRelacionados : []).filter(function (p) { return p && p.codigo && p.codigo !== codigoAtual; });
  if (!pops.length) return ["POPS DO CONJUNTO: nenhum além deste; não remeta a outro POP."];
  var l = ["POPS DO CONJUNTO (selecionados para este estabelecimento; remeta só a estes, pelo código e título):"];
  pops.forEach(function (p) { l.push("  - " + p.codigo + " — " + PgtPopIA_nomeDoCatalogo_(p.codigo, p.nome)); });
  return l;
}

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
 * (14/11/2026) O POP do catálogo vai com a ficha técnica, os dados do estabelecimento, a lista fechada de normas, o
 * glossário fixo e os POPs do conjunto. O POP avulso (sem ficha) vai com as seções padrão das fichas e as normas de base.
 * @param {string} tipo 'PGT' | 'POP'
 * @param {object} hospital dados do hospital (hospital.respostas: respostas às perguntas das fichas)
 * @param {string} roteiro roteiro opcional do usuário pra este documento específico
 * @param {object|null} pop { codigo, nome } — só quando tipo === 'POP'
 * @param {Array} imagens [{ base64, mimeType, legenda }] (opcional)
 * @param {object} [extras] { popsRelacionados: [{ codigo, nome }] } — POPs selecionados para o estabelecimento
 * @return {{titulo: string, textoGerado: string, imagensComInterpretacao: Array}}
 */
function PgtPop_gerarTextoIA_(tipo, hospital, roteiro, pop, imagens, extras) {
  var props = PropertiesService.getScriptProperties();
  var chave = String(props.getProperty("GEMINI_API_KEY") || "").trim();
  if (!chave) {
    throw new Error("A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.");
  }
  extras = extras || {};
  hospital = hospital || {};
  imagens = Array.isArray(imagens) ? imagens : [];
  var temImagens = imagens.length > 0;
  var codigo = tipo === 'PGT' ? 'PGTS' : String((pop && pop.codigo) || '').trim();
  var ficha = PgtPopIA_ficha_(codigo);

  var contextoLinhas = [];
  contextoLinhas.push("TIPO DE DOCUMENTO: " + (tipo === 'PGT' ? "Plano de Gerenciamento de Tecnologias em Saúde (PGTS)" : "Procedimento Operacional Padrão (POP)"));
  contextoLinhas.push("ESTABELECIMENTO: " + (hospital.razaoSocial || "-") + " (o nome já sai na identificação; no texto, escreva \"o estabelecimento\")");
  if (tipo !== 'PGT') {
    contextoLinhas.push("NOME DO POP: " + pop.nome);
    if (pop.codigo) contextoLinhas.push("CÓDIGO DO POP: " + pop.codigo);
  }
  contextoLinhas.push("");
  if (ficha) {
    contextoLinhas = contextoLinhas.concat(PgtPopIA_contextoFicha_(ficha, hospital));
    if (codigo === 'POP010' && PgtPopIA_resposta_(hospital, 'rec_area_guarda') === 'nao') {
      var f26 = PgtPopIA_ficha_('POP026');
      contextoLinhas.push("SEM ÁREA PRÓPRIA DE GUARDA: o estabelecimento informou que não tem área própria de recebimento, guarda ou oficina. " +
        "Inclua neste POP, no Procedimento, as regras de organização e higiene das áreas onde os equipamentos ficam:" +
        (f26 ? " " + f26.conteudoMinimo.map(function (c) { return c.item + " (" + c.descricao + ")"; }).join("; ") + "." : " proibição de alimentos, bebidas e objetos alheios, limpeza e separação entre limpo e contaminado."));
    }
  } else {
    var estrutura = (PgtPopIA_ficha_('POP001') || {}).secoes || PGTPOP_CFG.ESTRUTURA_POP_PADRAO;
    contextoLinhas.push("POP FORA DO CATÁLOGO (sem ficha técnica): o conteúdo vem do ROTEIRO e dos dados do estabelecimento.");
    contextoLinhas.push("SEÇÕES (escreva todas, nesta ordem, com estes títulos):");
    estrutura.forEach(function (secao) { contextoLinhas.push("  - " + secao); });
  }
  contextoLinhas.push("");
  contextoLinhas = contextoLinhas.concat(PgtPopIA_contextoNormas_(codigo, hospital));
  var dados = PgtPopIA_contextoDados_(codigo, hospital);
  if (dados.length) { contextoLinhas.push(""); contextoLinhas = contextoLinhas.concat(dados); }
  else contextoLinhas.push(PgtPopIA_montarContextoHospital_(hospital));
  var gloss = PgtPopIA_contextoGlossario_();
  if (gloss.length) { contextoLinhas.push(""); contextoLinhas = contextoLinhas.concat(gloss); }
  contextoLinhas.push("");
  contextoLinhas = contextoLinhas.concat(PgtPopIA_contextoPops_(extras.popsRelacionados, codigo));

  var roteiroLimpo = String(roteiro || "").trim();
  contextoLinhas.push("");
  if (roteiroLimpo) {
    contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO (fatos e ênfases do estabelecimento; vale junto com a ficha, sem contradizê-la):");
    contextoLinhas.push(roteiroLimpo);
  } else {
    contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO: nenhum.");
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
    PgtPopIA_especialista_(tipo === 'PGT' ? "gestão de tecnologias em saúde (PGTS)" : pop.nome) + "\n\n" +
    PGTPOPIA_REGRA_DOCUMENTO + "\n\n" +
    "TAREFA: escreva o documento completo descrito no CONTEXTO abaixo, seguindo a FICHA TÉCNICA e as regras acima.\n\n" +
    "CONTEXTO REAL (única fonte de fatos permitida sobre o estabelecimento):\n" + contextoLinhas.join("\n") + "\n\n" +
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
      var resp;
      try {
        resp = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          muteHttpExceptions: true,
          payload: JSON.stringify({
            contents: [{ role: "user", parts: parts }],
            generationConfig: { temperature: 0.25, topP: 0.95, maxOutputTokens: Math.min(tokens, PGTPOPIA_TETO_MODELO[modelo] || tokens) }
          })
        });
      } catch (eRede) {
        // (14/11/2026, auditoria B9) Falha de rede conta como erro do servidor: repete e depois passa ao modelo reserva.
        erroModelo = 'falha de rede (' + String(eRede && eRede.message ? eRede.message : eRede).replace(/[.\s]+$/, '') + ')';
        continue;
      }

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
  // 14/11/2026: os 6 blocos seguem as seções da ficha do PGTS (a correspondência com os artigos da RDC 509 vai no pedido,
  // pelo mapaRDC509 da ficha). "Termos e definições" (glossário fixo), "Documentos relacionados" e "Referências
  // normativas" são montados pelo sistema. Os títulos com "Etapas do gerenciamento: ..." viram as subseções da etapa 9
  // da ficha no documento (PgtPopDoc_secoesHtml_ agrupa pelo prefixo).
  Object.freeze({
    nome: "Escopo, finalidade e base legal",
    secoes: ['Escopo do plano', 'Finalidade e objetivos', 'Justificativa e base legal'],
    imagens: true,
    glossarioDepois: true
  }),
  Object.freeze({
    nome: "Organização, infraestrutura, pessoas e documentação",
    secoes: ['Organização, responsabilidades e terceirização', 'Infraestrutura para as atividades de gerenciamento',
      'Pessoas — capacitação, educação continuada e proteção', 'Documentação, registros, rastreabilidade e guarda'],
    responsabilidades: true, registros: true
  }),
  Object.freeze({
    nome: "Etapas do gerenciamento I — do planejamento ao registro histórico",
    secoes: ['Etapas do gerenciamento: Planejamento e seleção', 'Etapas do gerenciamento: Aquisição',
      'Etapas do gerenciamento: Recebimento e ensaio de aceitação', 'Etapas do gerenciamento: Inventário e identificação',
      'Etapas do gerenciamento: Instalação', 'Etapas do gerenciamento: Registro histórico'],
    pops: true
  }),
  Object.freeze({
    nome: "Etapas do gerenciamento II — do treinamento ao descarte",
    secoes: ['Etapas do gerenciamento: Treinamento', 'Etapas do gerenciamento: Armazenamento', 'Etapas do gerenciamento: Transferência',
      'Etapas do gerenciamento: Uso e rondas', 'Etapas do gerenciamento: Intervenção técnica (corretiva, preventiva, calibração, ensaios de segurança e priorização por risco)',
      'Etapas do gerenciamento: Desativação', 'Etapas do gerenciamento: Descarte'],
    pops: true
  }),
  Object.freeze({
    nome: "Risco, indicadores e utilidades críticas",
    secoes: ['Gerenciamento de risco, eventos adversos, queixas técnicas e alertas sanitários',
      'Indicadores, monitoramento e avaliação anual da efetividade',
      'Utilidades críticas (energia de emergência e gases medicinais)'],
    utilidades: 'Utilidades críticas (energia de emergência e gases medicinais)',
    indicadores: true, pops: true
  }),
  Object.freeze({
    nome: "Implantação",
    secoes: ['Implantação — situação atual, prioridades e cronograma'],
    documentosRelacionados: true, periodicidade: true
  })
]);
// Marca do glossário entre o bloco 1 e o bloco 2: a limpeza não mexe nela e a gravação troca pelo glossário fixo.
var PGTPOPIA_MARCA_GLOSSARIO = '[[SGO:GLOSSARIO]]';

/**
 * Monta a lista de POPs+documentos pra injetar no bloco de fechamento.
 * (14/11/2026, auditoria C1) Antes a lista vinha da pasta inteira do CNPJ: entravam PDFs de revisões substituídas,
 * com nome de arquivo e hora, e às vezes o próprio PGT. Agora vem do registro: só a revisão vigente de cada código
 * (código e título, sem arquivo nem hora), sem o PGT e sem os POPs desta rodada, que já estão na primeira lista.
 */
function PgtPopIA_montarContextoDocumentos_(hospital, popsRelacionados) {
  var linhas = [];
  var pops = Array.isArray(popsRelacionados) ? popsRelacionados : [];
  if (pops.length) {
    linhas.push("PROCEDIMENTOS OPERACIONAIS PADRÃO (POPs) SELECIONADOS PARA ESTE HOSPITAL NESTA GERAÇÃO:");
    pops.forEach(function (p) {
      linhas.push("  - " + (p.codigo ? (p.codigo + " — ") : "") + PgtPopIA_nomeDoCatalogo_(p.codigo, p.nome));
    });
  }

  // Sempre explícito (mesmo quando vazio) — sem isso, a IA já demonstrou
  // que INVENTA documentos plausíveis pra preencher a seção (achado real
  // em teste, 2026-08-14: listou os outros blocos do próprio PGT como se
  // fossem arquivos separados pré-existentes). "(se houver)" sozinho no
  // texto da instrução não bastou pra evitar isso.
  linhas.push("");
  var existentes = PgtPopIA_documentosVigentes_(hospital, pops);
  if (existentes.length) {
    linhas.push("DOCUMENTOS JÁ EXISTENTES (gerados anteriormente) PARA ESTE HOSPITAL, NA REVISÃO VIGENTE:");
    existentes.forEach(function (d) {
      linhas.push("  - " + d.rotulo + " — " + d.titulo + " (revisão " + d.versao + ".0)");
    });
  } else {
    linhas.push("DOCUMENTOS JÁ EXISTENTES PARA ESTE HOSPITAL: NENHUM além dos POPs listados acima. NÃO invente nem liste " +
      "nenhum documento anterior; a seção deve mencionar apenas os POPs selecionados nesta geração (listados acima).");
  }

  return linhas.join("\n");
}

/** Nome do catálogo para um código (o mesmo título dos documentos); sem código ou fora do catálogo, o nome informado. */
function PgtPopIA_nomeDoCatalogo_(codigo, nome) {
  var cod = String(codigo || '').trim();
  var cat = (typeof PGTPOP_CFG !== 'undefined' && PGTPOP_CFG && PGTPOP_CFG.CATALOGO_POPS) || [];
  for (var i = 0; i < cat.length; i++) if (cat[i] && cat[i].codigo === cod) return cat[i].nome;
  return String(nome || '').trim();
}

/** POPs vigentes deste CNPJ pelo registro (última revisão de cada código), fora os desta rodada. Nunca lança. */
function PgtPopIA_documentosVigentes_(hospital, popsRodada) {
  var cnpj = String((hospital && hospital.cnpj) || '').replace(/\D/g, '');
  if (!cnpj || typeof PgtPop_apiListarDocumentos !== 'function') return [];
  var docs = [];
  try {
    var r = PgtPop_apiListarDocumentos({ cnpj: cnpj });
    if (r && r.ok) docs = JSON.parse(r.documentosJson || '[]');
  } catch (e) {
    return []; // não bloqueia a geração do PGT se a consulta falhar
  }
  var daRodada = {};
  (popsRodada || []).forEach(function (p) { if (p && p.codigo) daRodada[String(p.codigo)] = true; });
  return docs.filter(function (d) {
    // 14/11/2026: documento suspenso (emitido antes da geração revisada) não conta como existente; será refeito
    if (typeof PgtPop_documentoSuspenso_ === 'function' && PgtPop_documentoSuspenso_(d && d.data)) return false;
    return d && String(d.tipo).toUpperCase() === 'POP' && !daRodada[String(d.codigoDocumento || '')];
  }).map(function (d) {
    var cod = String(d.codigoDocumento || '');
    var avulso = !cod || /^AV-/.test(cod);
    return {
      rotulo: avulso ? 'POP avulso' : cod,
      titulo: PgtPopIA_nomeDoCatalogo_(cod, (d.pop && d.pop.nome) || d.titulo),
      versao: Number(d.versaoAtual) || 1
    };
  }).sort(function (a, b) { return a.rotulo < b.rotulo ? -1 : (a.rotulo > b.rotulo ? 1 : 0); });
}

/* ============================================================
 * REVISÃO DETERMINÍSTICA DO TEXTO DA IA (14/11/2026, auditoria C2, M2, A2, M1)
 * Depois da IA e antes de gravar. Remove o que não pode sair no documento e devolve os pontos para conferir
 * (DESENHO_V2, seção 5.1). Nunca bloqueia a gravação.
 * ============================================================ */

// Rótulos do pedido à IA que apareceram dentro de documentos vigentes (C2). Só em maiúsculas, como no pedido.
var PGTPOPIA_ECOS = [
  /PROCEDIMENTOS OPERACIONAIS PADR[ÃA]O \(POPs\) SELECIONADOS[^\n:]*:?/g,
  /DOCUMENTOS J[ÁA] EXISTENTES[^\n:]*:?/g,
  /CONTEXTO REAL[^\n:]*:?/g,
  /BASE NORMATIVA \(citar[^\n]*/g,
  /ROTEIRO FORNECIDO PELO USU[ÁA]RIO[^\n:]*:?/g,
  /SE[ÇC][ÕO]ES DESTE BLOCO[^\n:]*:?/g,
  /ESPECIALISTA RESPONS[ÁA]VEL PELA REDA[ÇC][ÃA]O:?/g,
  /REGRAS ABSOLUTAS[^\n:]*:?/g,
  /O QUE N[ÃA]O ENTRA NO DOCUMENTO:?/g,
  /ESTRUTURA-PADR[ÃA]O SUGERIDA[^\n:]*:?/g
];
// Bastidor da geração (M2): frase sobre quem redige; e a menção ao roteiro recebido.
var PGTPOPIA_BASTIDOR_FRASE = /especialista\s+s[êe]nior|engenheiro\s+cl[íi]nico\s+s[êe]nior|instru[çc][õo]es\s+(?:recebidas|fornecidas)/i;
var PGTPOPIA_BASTIDOR_ROTEIRO = /,?\s*(?:conforme|de acordo com|segundo|como)\s+(?:o\s+)?(?:(?:estabelecido|definido|previsto|indicado|descrito|solicitado|informado)\s+)?(?:no|pelo|em)\s+roteiro(?:\s+(?:fornecido|informado|apresentado|recebido))?(?:\s+pelo\s+usu[áa]rio)?/gi;
// Seções de controle escritas pela IA (A2): o sistema já tem identificação, controle de revisões e aprovação.
// "Revisão" no singular fica (costuma ser a periodicidade de revisão do procedimento, conteúdo legítimo).
var PGTPOPIA_SECAO_CONTROLE = /^(?:\d+(?:\.\d+)*[.)]?\s*)?(?:(?:hist[óo]rico|controle|registro)\s+de\s+(?:revis|vers|altera)[a-zçõãéê]*(?:\s+do\s+documento)?|revis(?:[õo]es)(?:\s+do\s+documento)?|revis[ãa]o\s+do\s+documento|identifica[çc][ãa]o\s+do\s+documento)$/i;
// Linhas de controle soltas: só quando o valor é número de versão, data, lacuna ou "[...]" (não a frase de periodicidade).
var PGTPOPIA_LINHA_CONTROLE = /^(?:(?:vers[ãa]o|revis[ãa]o)\s*(?:n[º°o.]*)?\s*:\s*(?:\d+(?:[.,]\d+)?|\[[^\]]*\]|_+)(?:\s*[\/|;-].*)?|data\s+(?:da|de)\s+(?:elabora|revis|aprova|emiss)[a-zçãõ]*\s*:\s*(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+de\s+\S+\s+de\s+\d{4}|\[[^\]]*\]|_+)\s*\.?|(?:elaborado|revisado|aprovado)\s+por\s*:.*)$/i;
// Campo para preencher ("[Inserir Data]", "[DD/MM/AAAA]", "[Nome do Elaborador]"...).
var PGTPOPIA_CAMPO = /\[(?=[^\]\n]*(?:inserir|preencher|nome|data|dd\/mm|aaaa|descrever|definir|informar|completar|xx|cargo|assinatura|n[º°o]\s*do|n[úu]mero))[^\]\n]{2,80}\]/gi;
// Normas citadas (M1): RDC, NBR, ISO, IEC, NR, Lei, Portaria; e a LGPD pelo nome.
// (14/11/2026) Também CONAMA, Confea e Decreto; "(RDC) nº 509" da forma de citar; parte ("60601-1") e ano (":2011", "/2021").
// Grupos: 1 sigla, 2 Lei/Portaria/Decreto, 3 número, 4 ano.
var PGTPOPIA_NORMA = /(?:\b(RDC|NBR|ISO|IEC|NR|CONAMA|CONFEA|Confea)\)?|\b([Ll]ei|[Pp]ortaria|[Dd]ecreto))\s*(?:(?:ANVISA|Anvisa|MS|GM\/MS)\s*)?(?:n[º°o.]*\s*)?-?\s*(\d[\d.]*(?:-\d+)?)(?:\s*[:\/]\s*(\d{4}))?/g;
// Seções que o sistema monta (14/11/2026): se a IA escrever, saem do texto (com ponto para conferir).
var PGTPOPIA_SECAO_SISTEMA = /^(?:\d+(?:\.\d+)*[.)]?\s*)?(?:refer[êe]ncias\b|base normativa|normas (?:de refer[êe]ncia|aplic[áa]veis)|legisla[çc][ãa]o (?:aplic[áa]vel|de refer[êe]ncia))/i;
var PGTPOPIA_SECAO_SISTEMA_PGT = /^(?:\d+(?:\.\d+)*[.)]?\s*)?(?:termos e defini|gloss[áa]rio|defini[çc][õo]es\b|documentos (?:e procedimentos )?relacionados|procedimentos relacionados)/i;
// Setores que a IA não pode supor (14/11/2026, RELATORIO_ESPECIALISTA): cada regra vale para o texto e para a resposta.
var PGTPOPIA_SETORES = [
  ['UTI', /\bUTI\b|terapia intensiva/i], ['centro cirúrgico', /centro cir[úu]rgico|bloco cir[úu]rgico/i], ['centro obstétrico', /centro obst[ée]trico/i],
  ['CME', /\bCME\b|central de materia(?:l|is)/i], ['radiologia', /radiologia|diagn[óo]stico por imagem|tomografia|resson[âa]ncia magn/i],
  ['hemodiálise', /hemodi[áa]lise|nefrologia/i], ['hemodinâmica', /hemodin[âa]mica/i],
  ['pronto-socorro', /pronto[- ]socorro|pronto[- ]atendimento|unidade de emerg[êe]ncia|servi[çc]o de emerg[êe]ncia/i],
  ['neonatologia', /neonat|ber[çc][áa]rio/i], ['endoscopia', /endoscopia/i], ['oncologia', /oncologia|quimioterapia|radioterapia/i],
  ['medicina nuclear', /medicina nuclear/i], ['agência transfusional', /ag[êe]ncia transfusional|banco de sangue/i]
];
// Números com unidade de prazo, meta, frequência, quantidade ou área (14/11/2026, conferência das fichas).
var PGTPOPIA_NUMERO = /(?:R\$\s*(\d[\d.]*(?:,\d+)?))|(?:(\d+(?:[.,]\d+)?)\s*(%|por cento|horas?\b|h\b|minutos?\b|min\b|dias?\b|semanas?\b|meses\b|m[êe]s\b|anos?\b|m²|m2\b|vezes\b))/gi;
// Marcas de software ou fabricante (M1). Só para detectar e pedir conferência; nunca entra em pedido nem documento.
var PGTPOPIA_MARCAS = ['Auvo', 'Excel', 'Tasy', 'Philips', 'Siemens', 'GE Healthcare', 'Dräger', 'Drager', 'Mindray', 'Medtronic', 'Baxter',
  'B. Braun', 'Fresenius', 'Olympus', 'Stryker', 'Getinge', 'Steris', 'Tuttnauer', 'Baumer', 'Sercon', 'Microsoft', 'Google', 'WhatsApp'];

function PgtPopIA_chaveNorma_(tipo, numero) {
  return String(tipo || '').toUpperCase() + ' ' + String(numero || '').replace(/\./g, '').replace(/^0+/, '');
}

/**
 * Normas citadas fora da lista do documento (14/11/2026): com ficha, a lista é a da ficha que vale para o estabelecimento;
 * sem ficha (POP avulso), a base (RDC 509 e NBR 15943). Edição substituída ou revogada e ano diferente do da lista também
 * entram. Devolve os rótulos ("ISO 13485", "NBR 10004:2004 (substituída...)", "LGPD").
 */
function PgtPopIA_normasForaDaLista_(texto, opcoes) {
  opcoes = opcoes || {};
  var codigo = String(opcoes.codigo || (opcoes.tipo === 'PGT' ? 'PGTS' : '')).trim();
  var lista = PgtPopIA_normasDoDoc_(codigo, opcoes.hospital || {});
  var permitidas = {};
  if (lista.length) lista.forEach(function (n) { (n.chaves || []).forEach(function (c) { permitidas[c] = n.ano || true; }); });
  else permitidas = PgtPopIA_normasDaBase_();
  var F = PgtPopIA_fichas_();
  var invalidas = (F && F.edicoesInvalidas) || [];
  var fora = [];
  var re = new RegExp(PGTPOPIA_NORMA.source, 'g'), mn;
  while ((mn = re.exec(String(texto || '')))) {
    var tipoN = mn[1] || mn[2];
    var chave = PgtPopIA_chaveNorma_(tipoN, mn[3]);
    var numero = mn[3].replace(/[.]+$/, '');
    var rotulo = (mn[1] ? mn[1].toUpperCase().replace('CONFEA', 'Confea') : tipoN.charAt(0).toUpperCase() + tipoN.slice(1).toLowerCase()) + ' ' + numero;
    var ano = mn[4] || '';
    var inval = ano ? invalidas.filter(function (e) { return e.chave === chave && e.ano === ano; })[0] : null;
    if (inval) rotulo = inval.texto;
    else if (permitidas[chave] && ano && typeof permitidas[chave] === 'string' && permitidas[chave] !== ano) rotulo = rotulo + ':' + ano + ' (a lista deste documento traz a edição de ' + permitidas[chave] + ')';
    else if (permitidas[chave]) continue;
    if (fora.indexOf(rotulo) < 0) fora.push(rotulo);
  }
  if (/\bLGPD\b|Lei Geral de Prote[çc][ãa]o de Dados/i.test(String(texto || '')) && !permitidas['LEI 13709'] && fora.indexOf('LGPD') < 0) fora.push('LGPD');
  return fora;
}

/** Sem acentos e em minúsculas (conferência dos itens mínimos e dos setores). */
function PgtPopIA_dobrar_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/** "Número + unidade" canônico ("5|ano", "72|h", "90|%") de um trecho de texto. */
function PgtPopIA_numerosComUnidade_(texto) {
  var out = [];
  var re = new RegExp(PGTPOPIA_NUMERO.source, 'gi'), m;
  while ((m = re.exec(String(texto || '')))) {
    var num = String(m[1] || m[2] || '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.').replace(/\.0+$/, '');
    var u = PgtPopIA_dobrar_(m[3] || 'R$');
    var un = /^(%|por cento)$/.test(u) ? '%' : /^h|^hora/.test(u) ? 'h' : /^min/.test(u) ? 'min' : /^dia/.test(u) ? 'dia' : /^semana/.test(u) ? 'semana' :
      /^mes/.test(u) ? 'mes' : /^ano/.test(u) ? 'ano' : /^m[²2]/.test(u) ? 'm2' : /^vez/.test(u) ? 'vez' : 'R$';
    out.push({ chave: num + '|' + un, trecho: m[0], indice: m.index });
  }
  return out;
}

/** Conferência pelas fichas (14/11/2026): item mínimo ausente, norma fora da lista, número e setor não informados. */
function PgtPopIA_conferirFicha_(texto, opcoes, ponto) {
  var codigo = String(opcoes.codigo || (opcoes.tipo === 'PGT' ? 'PGTS' : '')).trim();
  var ficha = PgtPopIA_ficha_(codigo);
  var hospital = opcoes.hospital || {};
  var semMarca = String(texto || '').split(PGTPOPIA_MARCA_GLOSSARIO).join('');
  var dobrado = PgtPopIA_dobrar_(semMarca);
  // Item de conteúdo mínimo: presente quando ao menos uma expressão aparece (início de palavra; radical vale como prefixo).
  if (ficha) {
    ficha.conteudoMinimo.forEach(function (c) {
      var achou = c.verificacao.some(function (exp) {
        var e = PgtPopIA_dobrar_(exp).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('(^|[^a-z0-9])' + e).test(dobrado);
      });
      if (!achou) ponto('FALTA', 'Falta: ' + c.item + ' (' + c.descricao.replace(/[.\s]+$/, '') + ').');
    });
  }
  // Números de prazo, meta ou frequência: só os informados pelo estabelecimento ou os da própria ficha (fora as referências).
  var permitidos = {};
  var juntar = function (t) { PgtPopIA_numerosComUnidade_(t).forEach(function (n) { permitidos[n.chave] = true; }); };
  Object.keys(hospital.respostas || {}).forEach(function (k) { juntar(hospital.respostas[k]); });
  juntar([hospital.porte, hospital.leitos ? hospital.leitos + ' leitos' : ''].join(' '));
  juntar(opcoes.roteiro || '');
  if (ficha) {
    juntar([ficha.objetivo, ficha.escopo].join(' '));
    ficha.conteudoMinimo.forEach(function (c) { juntar(c.descricao); });
    juntar(ficha.passos.join(' '));
    ficha.responsabilidades.forEach(function (r) { juntar(r.atribuicoes); });
    juntar(ficha.registros.join(' '));
    ficha.indicadores.forEach(function (x) { juntar(x.formula); });
    (ficha.mapaRDC509 || []).forEach(function (m) { juntar(m.artigo); });
  }
  var vistosNum = {}, numeros = [];
  PgtPopIA_numerosComUnidade_(semMarca).forEach(function (n) {
    if (permitidos[n.chave] || vistosNum[n.chave]) return;
    vistosNum[n.chave] = true;
    numeros.push(n.trecho.trim());
  });
  if (numeros.length) {
    ponto('NUMERO', 'Prazo, meta, frequência ou quantidade que o estabelecimento não informou: ' + numeros.slice(0, 8).join('; ') + (numeros.length > 8 ? ' (e mais ' + (numeros.length - 8) + ')' : '') +
      '. Confirme com o estabelecimento ou troque por "a definir pelo estabelecimento".');
  }
  // Setores: só os informados (lista de setores e recursos do estabelecimento).
  if (PgtPopIA_fichas_()) {
    var informado = [PgtPopIA_resposta_(hospital, 'setores'), PgtPopIA_resposta_(hospital, 'criticidade_uso'), hospital.porte || '', opcoes.roteiro || '',
      PgtPopIA_resposta_(hospital, 'rec_cme') === 'sim' ? 'CME' : '', PgtPopIA_resposta_(hospital, 'rec_radiologia') === 'sim' ? 'radiologia' : ''].join('\n');
    var fora = PGTPOPIA_SETORES.filter(function (s) { return s[1].test(semMarca) && !s[1].test(informado); }).map(function (s) { return s[0]; });
    if (fora.length) ponto('SETOR', 'Cita setor que não está entre os informados pelo estabelecimento: ' + fora.join(', ') + '. Confira e retire se o estabelecimento não tiver.');
  }
}

/** Normas da BASE NORMATIVA informada (PGTPOP_CFG), no mesmo formato da extração. */
function PgtPopIA_normasDaBase_() {
  var base = {};
  var txt = (typeof PGTPOP_CFG !== 'undefined' && PGTPOP_CFG) ? [PGTPOP_CFG.BASE_NORMATIVA, PGTPOP_CFG.BASE_NORMATIVA_EXTENSO].join(' ') : '';
  var re = new RegExp(PGTPOPIA_NORMA.source, 'g'), m;
  while ((m = re.exec(txt))) base[PgtPopIA_chaveNorma_(m[1] || m[2], m[3])] = true;
  return base;
}

function PgtPopIA_trecho_(t) {
  var s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length > 80 ? s.slice(0, 77).replace(/\s+\S*$/, '') + '…' : s;
}

/**
 * Limpa o corpo da IA e devolve { texto, conferir: [{ tipo, texto, trecho?, secao? }] }.
 * Texto sem nenhum desses defeitos sai igual (só o markdown residual é tirado, como já era).
 */
function PgtPopIA_revisarTexto_(corpo, opcoes) {
  opcoes = opcoes || {};
  var conferir = [];
  var vistos = {};
  var ponto = function (tipo, texto, trecho, secao) {
    var k = tipo + '|' + texto;
    if (vistos[k]) return;
    vistos[k] = true;
    var p = { tipo: tipo, texto: texto };
    if (trecho) p.trecho = PgtPopIA_trecho_(trecho);
    if (secao) p.secao = secao;
    conferir.push(p);
  };
  var linhas = PgtPopIA_removerMarkdownResidual_(String(corpo || '').replace(/\r\n/g, '\n')).split('\n');
  var saida = [];
  var secaoAtual = '';
  var pulando = false;
  // (14/11/2026) Seções que o sistema monta (referências; no PGT, glossário e documentos relacionados): a da IA sai.
  var tirarSistema = opcoes.tipo === 'PGT' || opcoes.tipo === 'POP';
  var sistema = null;
  var fecharSistema = function () {
    if (!sistema) return;
    var nf = PgtPopIA_normasForaDaLista_(sistema.linhas.join('\n'), opcoes);
    ponto('SECAO_SISTEMA', 'A IA escreveu a seção "' + PgtPopIA_trecho_(sistema.titulo) + '"; ela foi retirada, porque essa seção é montada pelo sistema' +
      (/refer|norma|legisla/i.test(sistema.titulo) ? ' com as normas conferidas deste documento' : ' a partir das fichas e do registro') + '.' +
      (nf.length ? ' Ela citava também: ' + nf.join(', ') + ' (fora da lista deste documento).' : ''), sistema.titulo);
    sistema = null;
  };
  linhas.forEach(function (bruta) {
    var linha = bruta;
    var t = linha.trim();
    if (t === PGTPOPIA_MARCA_GLOSSARIO) { fecharSistema(); pulando = false; saida.push(t); return; }
    var m = t.match(/^##\s*(.+?)\s*##$/);
    if (m) {
      fecharSistema();
      secaoAtual = m[1].trim();
      pulando = PGTPOPIA_SECAO_CONTROLE.test(secaoAtual);
      if (pulando) {
        ponto('SECAO_CONTROLE', 'Trazia uma seção de revisões ou identificação escrita pela IA ("' + PgtPopIA_trecho_(secaoAtual) + '"); ela foi retirada, porque o controle de revisões do sistema já está no documento.', secaoAtual);
        return;
      }
      if (tirarSistema && (PGTPOPIA_SECAO_SISTEMA.test(secaoAtual) || (opcoes.tipo === 'PGT' && PGTPOPIA_SECAO_SISTEMA_PGT.test(secaoAtual)))) {
        sistema = { titulo: secaoAtual, linhas: [] };
        pulando = true;
        return;
      }
      saida.push(linha);
      return;
    }
    if (sistema) { sistema.linhas.push(t); return; }
    if (pulando) return;
    // C2: eco dos rótulos do pedido. Linha que começa com o rótulo sai inteira; no meio da linha, sai só o rótulo.
    var ecoInicio = PGTPOPIA_ECOS.some(function (re) { re.lastIndex = 0; var mm = re.exec(t); return mm && mm.index === 0; });
    if (ecoInicio) return;
    PGTPOPIA_ECOS.forEach(function (re) { re.lastIndex = 0; linha = linha.replace(re, ''); });
    // Nome de arquivo de revisão antiga ("POP - POP001 rev 1.0 - ... 2026-10-26 1853.pdf").
    if (/\brev\s+\d+(?:\.\d+)?\s+-\s.*\.pdf\b/i.test(linha)) return;
    // A2: linha de controle solta ("Versão: 1.0", "Data da Elaboração: ...").
    if (t.length <= 160 && PGTPOPIA_LINHA_CONTROLE.test(t)) {
      ponto('SECAO_CONTROLE', 'Trazia dados de versão ou de aprovação escritos pela IA ("' + PgtPopIA_trecho_(t) + '"); eles foram retirados, porque o sistema já põe a revisão, a data e as assinaturas.', t, secaoAtual);
      return;
    }
    // M2: menção ao roteiro recebido (só a expressão sai) e frase sobre quem redige (a frase sai).
    if (PGTPOPIA_BASTIDOR_ROTEIRO.test(linha)) {
      PGTPOPIA_BASTIDOR_ROTEIRO.lastIndex = 0;
      var antes = linha;
      linha = linha.replace(PGTPOPIA_BASTIDOR_ROTEIRO, '').replace(/\s+([,.;:])/g, '$1').replace(/,\s*,/g, ',').replace(/^\s*,\s*/, '');
      ponto('BASTIDOR', 'Mencionava o roteiro recebido para a redação; a expressão foi retirada. Confira a frase: "' + PgtPopIA_trecho_(linha.trim() || antes) + '".', antes, secaoAtual);
    }
    PGTPOPIA_BASTIDOR_ROTEIRO.lastIndex = 0;
    if (PGTPOPIA_BASTIDOR_FRASE.test(linha)) {
      var frases = linha.split(/(?<=[.!?])\s+/);
      var ficam = frases.filter(function (f) {
        if (!PGTPOPIA_BASTIDOR_FRASE.test(f)) return true;
        ponto('BASTIDOR', 'Mencionava a forma de elaboração do documento; a frase foi retirada: "' + PgtPopIA_trecho_(f) + '". Confira se ela fazia falta.', f, secaoAtual);
        return false;
      });
      linha = ficam.join(' ');
      if (!linha.trim()) return;
    }
    // A2: campo para preencher vira lacuna e ponto para conferir.
    linha = linha.replace(PGTPOPIA_CAMPO, function (campo) {
      ponto('CAMPO_EM_BRANCO', 'Ficou um campo para preencher: "' + campo + '". No documento ele saiu como lacuna (____________); preencha à mão ou corrija o texto.', campo, secaoAtual);
      return '____________';
    });
    if (t && !linha.trim()) return;
    saida.push(linha);
  });
  fecharSistema();
  var texto = saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // M1: normas fora da lista do documento (ficha) ou da base informada, edições substituídas e marcas (só conferência).
  var fora = PgtPopIA_normasForaDaLista_(texto, opcoes);
  if (fora.length) ponto('NORMA_FORA_BASE', 'Cita norma fora da lista deste documento: ' + fora.join(', ') + '.');
  if (tirarSistema) PgtPopIA_conferirFicha_(texto, opcoes, ponto);
  PGTPOPIA_MARCAS.forEach(function (marca) {
    var rm = new RegExp('(^|[^A-Za-zÀ-ÿ])' + marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-zÀ-ÿ])', 'i');
    var achou = rm.exec(texto);
    if (!achou) return;
    var ini = achou.index + achou[1].length;
    var linhaMarca = texto.slice(texto.lastIndexOf('\n', ini) + 1, (texto.indexOf('\n', ini) + 1 || texto.length + 1) - 1);
    ponto('MARCA', 'Cita nome de sistema ou marca: "' + texto.substr(ini, marca.length) + '". Troque pelo tipo genérico, se for o caso.', linhaMarca);
  });
  // Texto que termina no meio de uma frase (última linha longa de uma seção sem pontuação final).
  var secao = '', ultima = '';
  var conferirCorte = function () {
    var u = ultima.trim();
    if (u && u.split(/\s+/).length >= 12 && !/[.!?:;)"”»]$/.test(u)) ponto('TEXTO_CORTADO', 'O texto parece terminar no meio de uma frase na seção "' + (secao || 'sem título') + '".', u.slice(-80), secao);
  };
  texto.split('\n').forEach(function (l) {
    var ms = l.trim().match(/^##\s*(.+?)\s*##$/);
    if (ms) { conferirCorte(); secao = ms[1]; ultima = ''; return; }
    if (l.trim() === PGTPOPIA_MARCA_GLOSSARIO) { conferirCorte(); ultima = ''; return; }
    if (l.trim()) ultima = l;
  });
  conferirCorte();
  return { texto: texto, conferir: conferir };
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
 * (14/11/2026) Cada bloco leva a ficha do PGTS (objetivo, escopo, mapa da RDC 509, os itens mínimos daquele bloco),
 * os dados do estabelecimento, as normas da ficha, o glossário fixo e os POPs do conjunto. Depois do bloco 1 entra a
 * marca do glossário (PGTPOPIA_MARCA_GLOSSARIO), que a gravação troca pelo glossário fixo da ficha.
 * @param {object} hospital dados do hospital (hospital.respostas: respostas às perguntas das fichas)
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

  hospital = hospital || {};
  imagens = Array.isArray(imagens) ? imagens : [];
  var roteiroLimpo = String(roteiro || "").trim();
  var contextoDocumentos = PgtPopIA_montarContextoDocumentos_(hospital, popsRelacionados);
  var ficha = PgtPopIA_ficha_('PGTS');
  var comUtilidades = PgtPopIA_temUtilidades_(hospital);
  var normas = PgtPopIA_contextoNormas_('PGTS', hospital);
  var dados = PgtPopIA_contextoDados_('PGTS', hospital);
  var gloss = PgtPopIA_contextoGlossario_();
  var pops = PgtPopIA_contextoPops_(popsRelacionados, 'PGTS');

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
    var secoes = bloco.secoes.filter(function (s) { return s !== bloco.utilidades || comUtilidades; });

    var contextoLinhas = [];
    contextoLinhas.push("TIPO DE DOCUMENTO: Plano de Gerenciamento de Tecnologias em Saúde (PGTS) de equipamentos de saúde — bloco " + (b + 1) + " de " + PGTPOPIA_BLOCOS_PGT.length + " (" + bloco.nome + ")");
    contextoLinhas.push("ESTABELECIMENTO: " + (hospital.razaoSocial || "-") + " (o nome já sai na capa; no texto, escreva \"o estabelecimento\")");
    contextoLinhas.push("");
    contextoLinhas.push("SEÇÕES DESTE BLOCO (escreva TODAS, nesta ordem, com estes títulos, e nenhuma outra):");
    secoes.forEach(function (secao) { contextoLinhas.push("  - " + secao); });
    if (bloco.utilidades && !comUtilidades) {
      contextoLinhas.push("Não escreva a seção de utilidades críticas: o estabelecimento não informou grupo gerador, central de gases nem cilindros de gases medicinais.");
    }
    contextoLinhas.push("");
    if (ficha) {
      var itens = ficha.conteudoMinimo.filter(function (c) { return (c.blocos || []).indexOf(b + 1) >= 0; });
      contextoLinhas = contextoLinhas.concat(PgtPopIA_contextoFicha_(ficha, hospital, {
        semSecoes: true, itens: itens, rotuloItens: "CONTEÚDO MÍNIMO DESTE BLOCO", passos: b === 5,
        responsabilidades: !!bloco.responsabilidades, registros: !!bloco.registros, indicadores: !!bloco.indicadores, periodicidade: !!bloco.periodicidade
      }));
      if (ficha.mapaRDC509 && ficha.mapaRDC509.length) {
        contextoLinhas.push("MAPA DA RDC 509 (artigo → seção do plano; cite só estes artigos):");
        ficha.mapaRDC509.forEach(function (m) { contextoLinhas.push("  - " + m.artigo + " → " + m.secao); });
      }
    } else {
      contextoLinhas.push("ESTRUTURA DO PLANO (referência): " + PGTPOP_CFG.ESTRUTURA_PGT_PADRAO.join("; ") + ".");
    }
    contextoLinhas.push("");
    contextoLinhas = contextoLinhas.concat(normas);
    if (dados.length) { contextoLinhas.push(""); contextoLinhas = contextoLinhas.concat(dados); }
    else contextoLinhas.push(PgtPopIA_montarContextoHospital_(hospital));
    if (gloss.length) { contextoLinhas.push(""); contextoLinhas = contextoLinhas.concat(gloss); }
    if (bloco.pops || bloco.documentosRelacionados) { contextoLinhas.push(""); contextoLinhas = contextoLinhas.concat(pops); }
    if (roteiroLimpo) {
      contextoLinhas.push("");
      contextoLinhas.push("ROTEIRO FORNECIDO PELO USUÁRIO PRO PGT (fatos e ênfases do estabelecimento; aplique nas seções deste bloco onde for pertinente):");
      contextoLinhas.push(roteiroLimpo);
    }

    if (bloco.documentosRelacionados && contextoDocumentos) {
      contextoLinhas.push("");
      contextoLinhas.push("Para o cronograma de implantação, considere os POPs e documentos abaixo. A lista de documentos relacionados " +
        "do plano é montada pelo sistema: não escreva essa seção.");
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
      PgtPopIA_especialista_(bloco.nome + " (" + secoes.map(function (s) { return s.replace(/\s*\(.*$/, ''); }).join("; ") + ")") + "\n\n" +
      PGTPOPIA_REGRA_DOCUMENTO + "\n\n" +
      "TAREFA: escreva SOMENTE as seções deste bloco (ver regra 4), cobrindo o conteúdo mínimo deste bloco (regra 5), " +
      "com o tom da regra 6. Não repita conteúdo de outros blocos do PGTS.\n\n" +
      "CONTEXTO REAL (única fonte de fatos permitida sobre o estabelecimento):\n" + contextoLinhas.join("\n") + "\n\n" +
      PgtPopIA_montarInstrucaoFormato_(temImagens, imagensDoBloco.length);

    var parts = [{ text: prompt }];
    imagensDoBloco.forEach(function (img) {
      parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.base64 } });
    });

    var resultado = PgtPopIA_chamarGeminiComParts_(chave, parts, PGTPOPIA_TOKENS_PGT, temImagens, imagensDoBloco.length, imagensDoBloco, tituloFinal);

    corposFinal.push(PgtPopIA_removerMarkdownResidual_(resultado.textoGerado));
    if (bloco.glossarioDepois) corposFinal.push(PGTPOPIA_MARCA_GLOSSARIO);
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

/* ============================================================
 * SEÇÕES MONTADAS PELO SISTEMA (14/11/2026, fichas técnicas)
 * Glossário fixo do PGTS (na marca depois do bloco 1), "Documentos relacionados" (PGT: tabela "código | título |
 * situação", desenhada como tabela por SGO_PgtPop_Documento.js) e "Referências normativas" (comoCitar das normas da ficha
 * que valem para o estabelecimento; POP avulso: RDC 509 e NBR 15943). Nunca vêm da IA.
 * ============================================================ */
function PgtPopIA_glossarioTexto_() {
  var F = PgtPopIA_fichas_();
  if (!F || !F.glossario) return '';
  return ['## Termos e definições ##', ''].concat(F.glossario.map(function (g) { return g.termo + ': ' + g.definicao + '\n'; })).join('\n').trim();
}
function PgtPopIA_referenciasTexto_(codigo, hospital) {
  var normas = PgtPopIA_normasDoDoc_(codigo, hospital);
  if (!normas.length) return '';
  return ['## Referências normativas ##'].concat(normas.map(function (n, i) { return (i + 1) + '. ' + n.comoCitar + '.'; })).join('\n');
}
function PgtPopIA_documentosRelacionadosTexto_(hospital, popsRelacionados) {
  var pops = (Array.isArray(popsRelacionados) ? popsRelacionados : []).filter(function (p) { return p && String(p.nome || '').trim(); });
  var linhas = [];
  pops.forEach(function (p) {
    var cod = String(p.codigo || '').trim();
    linhas.push((cod || 'Avulso') + ' | ' + PgtPopIA_nomeDoCatalogo_(cod, p.nome) + ' | Selecionado nesta geração');
  });
  PgtPopIA_documentosVigentes_(hospital, pops).forEach(function (d) {
    linhas.push(d.rotulo + ' | ' + d.titulo + ' | Revisão vigente ' + d.versao + '.0');
  });
  if (!linhas.length) return '## Documentos relacionados ##\nNenhum POP selecionado para este estabelecimento nesta geração.';
  return ['## Documentos relacionados ##', 'Código | Título | Situação'].concat(linhas).join('\n\n');
}
/** Texto final: corpo da IA (já conferido) + as seções do sistema. A marca do glossário vira o glossário fixo. */
function PgtPopIA_comSecoesDoSistema_(tipo, codigo, corpo, hospital, popsRelacionados) {
  var t = String(corpo || '');
  if (tipo === 'PGT') {
    var g = PgtPopIA_glossarioTexto_();
    if (t.indexOf(PGTPOPIA_MARCA_GLOSSARIO) >= 0) t = t.split(PGTPOPIA_MARCA_GLOSSARIO).join(g);
    else if (g) t = t + '\n\n' + g;
    t = t + '\n\n' + PgtPopIA_documentosRelacionadosTexto_(hospital, popsRelacionados);
  }
  var ref = PgtPopIA_referenciasTexto_(tipo === 'PGT' ? 'PGTS' : codigo, hospital);
  if (ref) t = t + '\n\n' + ref;
  return t.replace(/\n{3,}/g, '\n\n').trim();
}
