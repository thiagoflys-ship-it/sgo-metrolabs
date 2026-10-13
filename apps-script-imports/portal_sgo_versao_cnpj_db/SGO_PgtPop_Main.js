/****************************************************
 * PGT E POP — ENGENHARIA CLÍNICA — módulo nativo do Portal SGO+ CNPJ/DB
 * (2026-08-13, v3)
 *
 * Backend principal: roteador único (PgtPop_apiDispatch, mesmo padrão
 * de PlanCME_apiDispatch/CronExec_apiDispatch) + bootstrap + persistência
 * própria (planilha separada, não a base central do Portal).
 *
 * v2 acrescentou: controle de revisão (cada geração pro mesmo hospital+
 * código de documento vira uma nova revisão, nunca perde o histórico),
 * campo de aprovador do hospital, e imagens com interpretação técnica
 * por IA (multimodal).
 *
 * v3 acrescenta: consulta de documentos JÁ gerados por CNPJ (pra não
 * precisar gerar tudo de novo toda vez — planilha agora guarda
 * CNPJ+HOSPITAL_JSON completo em ambas as abas, não só o nome), e nome
 * editável de "Elaborado por".
 *
 * v6 (2026-08-13) corrige bug real: cargo/registro do "Elaborado por"
 * eram sempre fixos (config), mesmo com o nome editável — um documento
 * assinado por outra pessoa saía com o registro profissional (REA-GO)
 * de alguém diferente. Agora cargo/registro também são editáveis e
 * seguem o nome, gravados como colunas próprias.
 ****************************************************/

function PgtPop_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiConsultarCnpj: PgtPop_apiConsultarCnpj,
    apiGerarDocumento: PgtPop_apiGerarDocumento,
    apiListarDocumentos: PgtPop_apiListarDocumentos,
    apiObterDocumentoPorId: PgtPop_apiObterDocumentoPorId,
    apiMontarDocumentoFinal: PgtPop_apiMontarDocumentoFinal,
    apiSalvarDocumento: PgtPop_apiSalvarDocumento,
    apiListarArquivosPdf: PgtPop_apiListarArquivosPdf
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  // apiGerarDocumento é a única função deste módulo que precisa saber
  // quem está logado (pra vincular a Tarefa criada no Auvo ao técnico real).
  if (fn === 'apiGerarDocumento') return PgtPop_apiGerarDocumento(payload, req.sessionId);

  return allow[fn](payload);
}

function PgtPop_getAppBootstrap() {
  var props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("PGTPOP_APP_NOME") || PGTPOP_CFG.APP.NOME,
    versao: props.getProperty("PGTPOP_APP_VERSAO") || PGTPOP_CFG.APP.VERSAO,
    whatsappMsg: props.getProperty("PGTPOP_WHATSAPP_MSG") || PGTPOP_CFG.WHATSAPP.MENSAGEM_PADRAO,
    empresaNome: props.getProperty("PGTPOP_EMPRESA_NOME") || PGTPOP_CFG.EMPRESA.NOME,
    catalogoPops: PGTPOP_CFG.CATALOGO_POPS,
    baseNormativa: PGTPOP_CFG.BASE_NORMATIVA,
    elaboradoPorNomePadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome,
    elaboradoPorCargoPadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo,
    elaboradoPorRegistroPadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro
  };
}

var PGTPOP_CODIGO_PGT = 'PGTS';

// ------------------------------------------------------------
// Índices de coluna (0-based) — MOV_PGT e MOV_POPS
// (mantidos aqui como constantes pra não espalhar números mágicos
// pelo arquivo; se mudar o layout no Setup.js, atualizar aqui também)
// ------------------------------------------------------------
var PGTPOP_COL_PGT = Object.freeze({
  ID: 0, DATA: 1, HOSPITAL: 2, CNPJ: 3, CODIGO: 4, VERSAO: 5,
  ROTEIRO: 6, ELABORADO_POR: 7, TEXTO_JSON: 8, HISTORICO_JSON: 9,
  HOSPITAL_JSON: 10, OBS: 11, ELABORADO_POR_CARGO: 12, ELABORADO_POR_REGISTRO: 13
});
var PGTPOP_COL_POP = Object.freeze({
  ID: 0, DATA: 1, HOSPITAL: 2, CNPJ: 3, PGT_ID: 4, CODIGO: 5, NOME_POP: 6,
  VERSAO: 7, ROTEIRO: 8, ELABORADO_POR: 9, TEXTO_JSON: 10, HISTORICO_JSON: 11,
  HOSPITAL_JSON: 12, ELABORADO_POR_CARGO: 13, ELABORADO_POR_REGISTRO: 14
});

/**
 * Gera UM documento (PGT ou POP). POP: uma chamada de IA. PGT (v15,
 * 2026-08-14): 6 chamadas em blocos, ver PgtPop_gerarTextoPGT_. Já
 * persiste o resultado na planilha assim que termina (como uma NOVA
 * REVISÃO se já existir um documento com o mesmo código pra esse
 * hospital — nunca perde o histórico anterior).
 *
 * payload:
 *   tipo: 'PGT' | 'POP'
 *   hospital: { razaoSocial, cnpj, logradouro, bairro, cidade, uf, porte,
 *               leitos, aprovadorNome, aprovadorCargo }
 *   roteiro: string (opcional)
 *   pop: { codigo, nome } — só quando tipo === 'POP' (codigo vazio = avulso)
 *   pgtId: string (opcional) — id do PGT já gerado deste hospital, se houver
 *   imagens: [{ base64, mimeType, legenda }] (opcional, até 4+)
 *   popsRelacionados: [{ codigo, nome }] (opcional) — só usado quando
 *     tipo === 'PGT'; POPs selecionados pra este hospital nesta
 *     geração, injetados no bloco de fechamento do PGT (seção
 *     "Documentos e Procedimentos Relacionados").
 *   descricaoRevisao: string (opcional) — só relevante quando já existe
 *     um documento anterior com o mesmo código; descreve o que mudou.
 *   elaboradoPorNome: string (opcional) — nome de quem elaborou este
 *     documento específico; se vazio, usa o padrão de PGTPOP_CFG.
 */
function PgtPop_apiGerarDocumento(payload, sessionId) {
  payload = payload || {};
  var tipo = String(payload.tipo || '').toUpperCase();
  if (tipo !== 'PGT' && tipo !== 'POP') {
    return { ok: false, mensagem: "Tipo de documento inválido: " + tipo };
  }
  var hospital = payload.hospital || {};
  if (!String(hospital.razaoSocial || '').trim()) {
    return { ok: false, mensagem: "Informe os dados do hospital antes de gerar." };
  }
  if (tipo === 'POP' && !(payload.pop && payload.pop.nome)) {
    return { ok: false, mensagem: "POP sem nome informado." };
  }
  var imagens = Array.isArray(payload.imagens) ? payload.imagens.filter(function (im) { return im && im.base64; }) : [];
  var elaboradoPorNome = String(payload.elaboradoPorNome || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome;
  // Cargo/registro seguem o nome (v6, 2026-08-13) — nunca mais herdam
  // um registro profissional fixo de outra pessoa quando o nome muda.
  var elaboradoPorCargo = String(payload.elaboradoPorCargo || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo;
  var elaboradoPorRegistro = String(payload.elaboradoPorRegistro || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro;

  var codigoDocumento = tipo === 'PGT' ? PGTPOP_CODIGO_PGT : String((payload.pop && payload.pop.codigo) || '').trim();
  var anterior = codigoDocumento ? PgtPop_buscarRegistroMaisRecente_(tipo, hospital, codigoDocumento) : null;
  var versaoNova = anterior ? (Number(anterior.versaoAtual) || 1) + 1 : 1;
  var historico = anterior ? (anterior.historico || []).slice() : [];
  historico.push({
    versao: versaoNova,
    descricao: anterior ? (payload.descricaoRevisao || 'Revisão de conteúdo') : 'Emissão Inicial',
    data: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")
  });

  var gerado;
  try {
    // PGT (v15, 2026-08-14) gera em blocos — usuário pediu documento
    // muito mais robusto/longo; POP continua 1 chamada só, sem mudança.
    if (tipo === 'PGT') {
      gerado = PgtPop_gerarTextoPGT_(hospital, payload.roteiro || '', imagens, payload.popsRelacionados || [], function (i, total, nomeBloco) {
        Logger.log('PGT bloco ' + i + '/' + total + ': ' + nomeBloco);
      });
    } else {
      gerado = PgtPop_gerarTextoIA_(tipo, hospital, payload.roteiro || '', payload.pop || null, imagens);
    }
  } catch (e) {
    return { ok: false, mensagem: "Erro ao gerar o texto (IA): " + e.message };
  }

  var registro = {
    tipo: tipo,
    hospital: hospital,
    roteiro: payload.roteiro || '',
    pop: payload.pop || null,
    codigoDocumento: codigoDocumento,
    versaoAtual: versaoNova,
    historico: historico,
    titulo: gerado.titulo,
    textoGerado: gerado.textoGerado,
    imagens: gerado.imagensComInterpretacao || [],
    pgtId: payload.pgtId || '',
    elaboradoPorNome: elaboradoPorNome,
    elaboradoPorCargo: elaboradoPorCargo,
    elaboradoPorRegistro: elaboradoPorRegistro
  };

  var salvo;
  if (tipo === 'PGT') {
    salvo = PgtPop_salvarPgt_(registro);
  } else {
    salvo = PgtPop_salvarPop_(registro);
  }
  registro.registroId = salvo.registroId;

  // Auto-save do PDF na pasta do CNPJ (v14, 2026-08-14) — antes só
  // acontecia se o usuário abrisse o documento manualmente e clicasse
  // "Salvar no Drive"; agora acontece sozinho a cada geração, pra
  // "Consultar documentos já gerados" poder simplesmente listar os
  // arquivos da pasta em vez de reconstruir cada documento sob demanda.
  // Nunca derruba a geração se falhar (documento já está salvo na
  // planilha de qualquer forma).
  var pdf = PgtPop_salvarPdfAutomatico_(registro);

  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Só
  // dispara se o PDF realmente foi salvo e se o CNPJ digitado bate com um
  // cliente já cadastrado no Portal (este módulo, como o Registros
  // Operacionais, não usa CAD_CLIENTES como fonte — consulta direto de
  // uma API pública de CNPJ). Nunca derruba a geração se o Auvo estiver
  // fora do ar ou mal configurado.
  if (pdf && pdf.url) {
    try {
      var clienteAuvo = Auvo_resolverClientePorCnpj_(hospital.cnpj);
      if (clienteAuvo) {
        Auvo_criarTarefa_({
          documentoId: salvo.registroId,
          titulo: (tipo === 'PGT' ? 'PGT' : 'POP') + ' — ' + gerado.titulo,
          descricao: 'Documento de Engenharia Clínica "' + gerado.titulo + '" (v' + versaoNova + ') — ' + (hospital.razaoSocial || ''),
          clienteId: clienteAuvo.ID,
          usuarioId: exigirSessao(sessionId).userId,
          data: '',
          linkPdf: pdf.url
        });
      }
    } catch (e) {
      SGO_DATA.log('AUVO_TAREFA_FALHOU', '', 'PGTPOP ' + salvo.registroId + ': ' + e.message, 'AUVO');
    }
  }

  return {
    ok: true,
    tipo: tipo,
    registroId: salvo.registroId,
    codigoDocumento: codigoDocumento,
    versaoAtual: versaoNova,
    historico: historico,
    titulo: gerado.titulo,
    textoGerado: gerado.textoGerado,
    imagens: registro.imagens,
    hospital: hospital,
    roteiro: payload.roteiro || '',
    pop: payload.pop || null,
    elaboradoPorNome: elaboradoPorNome,
    elaboradoPorCargo: elaboradoPorCargo,
    elaboradoPorRegistro: elaboradoPorRegistro,
    pdfUrl: pdf.url || '',
    pdfFileName: pdf.fileName || ''
  };
}

/** Procura, na planilha, o registro mais recente (maior VERSAO_ATUAL) do mesmo hospital (por CNPJ, com fallback pro nome)+código — usado pra decidir se a geração atual é uma nova revisão. */
function PgtPop_buscarRegistroMaisRecente_(tipo, hospital, codigoDocumento) {
  var db = PgtPop_getDB_();
  var col = tipo === 'PGT' ? PGTPOP_COL_PGT : PGTPOP_COL_POP;
  var aba = db.getSheetByName(tipo === 'PGT' ? PGTPOP_CFG.PLANILHA.ABAS.PGT : PGTPOP_CFG.PLANILHA.ABAS.POPS);
  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return null;

  var cnpjBusca = PgtPop_normalizarCnpj_(hospital.cnpj);
  var nomeBusca = String(hospital.razaoSocial || '').trim().toLowerCase();

  var melhor = null;
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var bate = cnpjBusca
      ? PgtPop_normalizarCnpj_(linha[col.CNPJ]) === cnpjBusca
      : String(linha[col.HOSPITAL] || '').trim().toLowerCase() === nomeBusca;
    if (!bate) continue;
    if (String(linha[col.CODIGO] || '').trim() !== codigoDocumento) continue;
    var versao = Number(linha[col.VERSAO]) || 1;
    if (!melhor || versao > melhor.versaoAtual) {
      var historico = [];
      try { historico = JSON.parse(linha[col.HISTORICO_JSON] || '[]'); } catch (e) {}
      melhor = { versaoAtual: versao, historico: historico };
    }
  }
  return melhor;
}

function PgtPop_normalizarCnpj_(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

function PgtPop_salvarPgt_(registro) {
  var db = PgtPop_getDB_();
  var aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.PGT);
  var id = PgtPop_gerarId_();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    id, agora, registro.hospital.razaoSocial || '', registro.hospital.cnpj || '',
    registro.codigoDocumento, registro.versaoAtual, registro.roteiro || '', registro.elaboradoPorNome || '',
    JSON.stringify({ titulo: registro.titulo, textoGerado: registro.textoGerado, imagens: registro.imagens }),
    JSON.stringify(registro.historico), JSON.stringify(registro.hospital || {}), '',
    registro.elaboradoPorCargo || '', registro.elaboradoPorRegistro || ''
  ]);

  return { registroId: id };
}

function PgtPop_salvarPop_(registro) {
  var db = PgtPop_getDB_();
  var aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.POPS);
  var id = PgtPop_gerarId_();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    id, agora, registro.hospital.razaoSocial || '', registro.hospital.cnpj || '', registro.pgtId || '',
    registro.codigoDocumento, (registro.pop && registro.pop.nome) || '', registro.versaoAtual,
    registro.roteiro || '', registro.elaboradoPorNome || '',
    JSON.stringify({ titulo: registro.titulo, textoGerado: registro.textoGerado, imagens: registro.imagens }),
    JSON.stringify(registro.historico), JSON.stringify(registro.hospital || {}),
    registro.elaboradoPorCargo || '', registro.elaboradoPorRegistro || ''
  ]);

  return { registroId: id };
}

/**
 * Consulta os documentos JÁ GERADOS pra um CNPJ — pra não precisar
 * gerar tudo de novo toda vez que alguém precisar ver/reimprimir um
 * documento existente. Devolve o registro mais recente por código
 * (PGT + cada POP), já com todo o conteúdo (texto/imagens/histórico/
 * dados do hospital) pronto pra abrir direto (mesmo formato que
 * PgtPop_apiGerarDocumento devolve, então o frontend reaproveita o
 * mesmo fluxo de "Abrir"/"Salvar no Drive").
 */
function PgtPop_apiListarDocumentos(payload) {
  payload = payload || {};
  var cnpjBusca = PgtPop_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) {
    return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  }

  try {
    var db = PgtPop_getDB_();
    var resultado = [];

    var abaPgt = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.PGT);
    var dadosPgt = abaPgt.getDataRange().getValues();
    var melhorPgt = null;
    for (var i = 1; i < dadosPgt.length; i++) {
      var l = dadosPgt[i];
      if (PgtPop_normalizarCnpj_(l[PGTPOP_COL_PGT.CNPJ]) !== cnpjBusca) continue;
      var versaoPgt = Number(l[PGTPOP_COL_PGT.VERSAO]) || 1;
      if (!melhorPgt || versaoPgt > melhorPgt.versaoAtual) {
        melhorPgt = PgtPop_linhaParaDocumento_(l, PGTPOP_COL_PGT, 'PGT', true);
      }
    }
    if (melhorPgt) resultado.push(melhorPgt);

    var abaPops = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.POPS);
    var dadosPops = abaPops.getDataRange().getValues();
    var melhorPorCodigo = {};
    for (var j = 1; j < dadosPops.length; j++) {
      var lp = dadosPops[j];
      if (PgtPop_normalizarCnpj_(lp[PGTPOP_COL_POP.CNPJ]) !== cnpjBusca) continue;
      var cod = lp[PGTPOP_COL_POP.CODIGO] || ('avulso_' + j);
      var versaoPop = Number(lp[PGTPOP_COL_POP.VERSAO]) || 1;
      if (!melhorPorCodigo[cod] || versaoPop > melhorPorCodigo[cod].versaoAtual) {
        melhorPorCodigo[cod] = PgtPop_linhaParaDocumento_(lp, PGTPOP_COL_POP, 'POP', true);
      }
    }
    Object.keys(melhorPorCodigo).forEach(function (cod) { resultado.push(melhorPorCodigo[cod]); });

    // 2026-08-14: usuário reportou (consistente, 100% das vezes, testado
    // sozinho — não é rede nem concorrência) que essa consulta específica
    // sempre voltava `null` pro cliente mesmo com resposta pequena (~19KB)
    // e rápida (~1.2s) confirmadas em teste direto no servidor. A única
    // diferença estrutural real pras outras chamadas do módulo (que
    // funcionam) é que esta devolve uma LISTA de objetos aninhados (cada
    // um com sub-objetos hospital/historico e um campo Date) — variação
    // de payload complexo com grafo aninhado é um problema conhecido do
    // canal do google.script.run, independente do tamanho em bytes.
    // Serializando pra string aqui (documentosJson) em vez de devolver o
    // array de objetos direto evita esse tipo de falha silenciosa —
    // string é o tipo mais simples possível de transmitir.
    return { ok: true, documentosJson: JSON.stringify(resultado) };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao consultar documentos: " + e.message };
  }
}

/**
 * Busca UM documento completo (texto+imagens) por registroId — usado
 * quando o usuário clica "Abrir" num item vindo da consulta por CNPJ
 * (2026-08-14, bugfix: `apiListarDocumentos` devolvia TUDO hidratado —
 * texto completo + imagens de cada documento já gerado pro CNPJ de
 * uma vez só, o que passou de 2,4 MB numa conta com bastante histórico
 * de testes e estourou o limite de payload do google.script.run — o
 * cliente recebia `null` em vez do resultado, "Cannot read properties
 * of null (reading 'ok')"). Agora `apiListarDocumentos` só devolve
 * resumo leve (sem textoGerado/imagens) e este endpoint busca o
 * conteúdo completo de UM documento por vez, sob demanda.
 */
function PgtPop_apiObterDocumentoPorId(payload) {
  payload = payload || {};
  var tipo = String(payload.tipo || '').toUpperCase();
  var registroId = String(payload.registroId || '');
  if (tipo !== 'PGT' && tipo !== 'POP') {
    return { ok: false, mensagem: "Tipo de documento inválido: " + tipo };
  }
  if (!registroId) {
    return { ok: false, mensagem: "ID do documento não informado." };
  }
  try {
    var db = PgtPop_getDB_();
    var col = tipo === 'PGT' ? PGTPOP_COL_PGT : PGTPOP_COL_POP;
    var aba = db.getSheetByName(tipo === 'PGT' ? PGTPOP_CFG.PLANILHA.ABAS.PGT : PGTPOP_CFG.PLANILHA.ABAS.POPS);
    var dados = aba.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][col.ID]) === registroId) {
        // Documento completo (texto+imagens) devolvido como STRING
        // (documentoJson), mesma defesa aplicada em apiListarDocumentos —
        // ver comentário em PgtPop_linhaParaDocumento_ sobre o Date que
        // quebrava esse canal antes.
        return { ok: true, documentoJson: JSON.stringify(PgtPop_linhaParaDocumento_(dados[i], col, tipo, false)) };
      }
    }
    return { ok: false, mensagem: "Documento não encontrado (pode ter sido removido da planilha)." };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao obter o documento: " + e.message };
  }
}

/** @param {boolean} apenasResumo quando true, omite textoGerado/imagens (payload leve pra listagem). */
function PgtPop_linhaParaDocumento_(linha, col, tipo, apenasResumo) {
  var textoJson = {};
  try { textoJson = JSON.parse(linha[col.TEXTO_JSON] || '{}'); } catch (e) {}
  var historico = [];
  try { historico = JSON.parse(linha[col.HISTORICO_JSON] || '[]'); } catch (e) {}
  var hospital = {};
  try { hospital = JSON.parse(linha[col.HOSPITAL_JSON] || '{}'); } catch (e) {}

  var doc = {
    ok: true,
    tipo: tipo,
    registroId: linha[col.ID],
    codigoDocumento: linha[col.CODIGO],
    versaoAtual: Number(linha[col.VERSAO]) || 1,
    historico: historico,
    titulo: textoJson.titulo || (tipo === 'PGT' ? 'PGTS' : linha[col.NOME_POP]),
    hospital: hospital,
    roteiro: linha[col.ROTEIRO] || '',
    pop: tipo === 'POP' ? { codigo: linha[col.CODIGO], nome: linha[col.NOME_POP] } : null,
    elaboradoPorNome: linha[col.ELABORADO_POR] || '',
    elaboradoPorCargo: linha[col.ELABORADO_POR_CARGO] || '',
    elaboradoPorRegistro: linha[col.ELABORADO_POR_REGISTRO] || '',
    // Raiz real do bug "resposta vazia/nula" em apiObterDocumentoPorId
    // (2026-08-14): a coluna DATA volta da planilha como objeto Date
    // (não string), e um Date "vivo" atravessando o canal do
    // google.script.run quebra a entrega silenciosamente — o cliente
    // recebe null. apiListarDocumentos escapou disso por acidente (já
    // devolve tudo serializado como JSON.stringify, que converte o Date
    // pra string antes de cruzar o canal); aqui a fonte é corrigida na
    // origem, pra nenhum outro campo Date nesta função voltar a quebrar
    // isso no futuro.
    data: (linha[col.DATA] instanceof Date)
      ? Utilities.formatDate(linha[col.DATA], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
      : String(linha[col.DATA] || '')
  };
  if (!apenasResumo) {
    doc.textoGerado = textoJson.textoGerado || '';
    doc.imagens = textoJson.imagens || [];
  }
  return doc;
}

function PgtPop_getDB_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty("PGTPOP_DB_ID");
  if (!dbId) {
    // Auto-provisiona na primeira vez (planilha + pastas do Drive), sem
    // exigir um passo manual de admin — mesmo padrão do Cronograma de
    // Execução/Planejamento CME.
    PgtPop_setupModulo();
    dbId = props.getProperty("PGTPOP_DB_ID");
  }
  return SpreadsheetApp.openById(dbId);
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (mesmo padrão de CronExec_apiConsultarCnpj)
// ------------------------------------------------------------

function PgtPop_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  const url = 'https://brasilapi.com.br/api/cnpj/v1/' + encodeURIComponent(cnpj);

  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { Accept: 'application/json' }
    });
  } catch (err) {
    throw new Error('Falha ao consultar CNPJ na BrasilAPI: ' + err.message);
  }

  const code = res.getResponseCode();
  const body = res.getContentText() || '';

  if (code === 404) {
    throw new Error('CNPJ não encontrado na base pública.');
  }
  if (code < 200 || code >= 300) {
    throw new Error('BrasilAPI retornou HTTP ' + code + ' ao consultar CNPJ.');
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (errJson) {
    throw new Error('Resposta inválida da API de CNPJ.');
  }

  // Logradouro e bairro voltam SEPARADOS (bug real, 2026-08-14: antes só
  // existia um "endereco" combinado, e o wizard jogava tudo em Logradouro
  // deixando o campo Bairro sempre vazio — usuário tinha que digitar toda
  // vez).
  const logradouroPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : ''
  ].filter(function (v) { return String(v || '').trim(); }).join(' ').replace(/\s+/g, ' ').trim();

  return {
    ok: true,
    fonte: 'BrasilAPI',
    cnpj: PgtPop_formatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    logradouro: logradouroPartes,
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || ''
  };
}

function PgtPop_formatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}
