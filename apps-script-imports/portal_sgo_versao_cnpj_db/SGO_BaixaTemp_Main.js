/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — SERVIDOR DO MÓDULO (21/10/2026)
 *
 * Tela: JS_BaixaTemp.html (carregador) + SGO_BaixaTemp_Tela.js (conteúdo).
 * Chamada única da tela: BaixaTemp_apiDispatch({ sessionId, fn, payload }).
 *
 * Fluxo: RASCUNHO → EM_REVISAO (técnico envia) → APROVADO (responsável técnico
 * aprova, com parecer, sobre a impressão digital dos dados) → EMITIDO (documento
 * A4 em HTML e PDF na pasta do cliente, registro no Arquivo de documentos).
 * Qualquer mudança depois do envio para revisão volta o ensaio para RASCUNHO e
 * anula a aprovação (fica no histórico). Ensaio emitido é imutável: correção
 * gera nova revisão (novo ensaio ligado ao original).
 *
 * Tabelas próprias, criadas sob demanda: BT_ENSAIOS (um por ensaio) e
 * BT_HISTORICO (trilha de cada ação). Os dados do formulário ficam em arquivo
 * JSON na pasta própria do módulo; cada gravação cria uma versão nova (nada é
 * sobrescrito). Nenhuma função devolve Date.
 ****************************************************/

var BAIXATEMP_COLUNAS_ENSAIOS = ['ID', 'NUMERO', 'REVISAO', 'TIPO', 'ETAPAS', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'CLIENTE_NOME', 'CNPJ',
  'EQUIPAMENTO_TAG', 'DATA_INICIO', 'STATUS', 'RESULTADO', 'ASSINATURA_DADOS', 'DADOS_ARQUIVO_ID', 'VERSAO_DADOS', 'ELABORADO_POR_ID', 'ELABORADO_POR',
  'ENVIADO_REVISAO_EM', 'APROVADO_POR_ID', 'APROVADO_POR', 'APROVADO_RT', 'APROVADO_EM', 'PARECER_RT', 'EMITIDO_POR', 'EMITIDO_EM', 'PDF_ID', 'LINK_PDF',
  'HTML_ID', 'LINK_HTML', 'PASTA_URL', 'REGISTRO_ORIGEM_ID', 'ATUALIZADO_EM', 'CRIADO_EM'];
var BAIXATEMP_COLUNAS_HISTORICO = ['ID', 'ENSAIO_ID', 'ACAO', 'USUARIO_ID', 'USUARIO', 'PERFIL', 'QUANDO', 'DETALHE', 'ASSINATURA_DADOS', 'CRIADO_EM'];
var BAIXATEMP_ROTULO_ACAO = { CRIADO: 'Criado', SALVO: 'Dados salvos', ALTERADO_APOS_REVISAO: 'Alterado após revisão', ENVIADO_REVISAO: 'Enviado para revisão', APROVADO: 'Revisado e aprovado', DEVOLVIDO: 'Devolvido ao técnico', EMITIDO: 'Emitido' };
var BAIXATEMP_STATUS = { RASCUNHO: 'RASCUNHO', EM_REVISAO: 'EM_REVISAO', APROVADO: 'APROVADO', EMITIDO: 'EMITIDO' };

function BaixaTemp_apiDispatch(req) {
  req = req || {};
  var sessao = exigirSessao(String(req.sessionId || ''));
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessao, 'a qualificação de esterilizadores a baixa temperatura');
  var perfil = String(sessao.perfil || '').trim().toUpperCase();
  if (perfil === 'CLIENTE') throw new Error('Acesso exclusivo à equipe interna. O relatório de qualificação emitido fica disponível para o cliente em Arquivo de documentos.');
  var fn = String(req.fn || '').trim();
  var p = req.payload || {};
  var allow = {
    apiPing: BaixaTemp_apiPing, apiPesquisarClientes: BaixaTemp_apiPesquisarClientes, apiListarUnidades: BaixaTemp_apiListarUnidades,
    apiListarEquipamentos: BaixaTemp_apiListarEquipamentos, apiListarPadroes: BaixaTemp_apiListarPadroes, apiUploadArquivo: BaixaTemp_apiUploadArquivo,
    apiLerArquivo: BaixaTemp_apiLerArquivo, apiCalcular: BaixaTemp_apiCalcular, apiRedigir: BaixaTemp_apiRedigir, apiSalvar: BaixaTemp_apiSalvar,
    apiListar: BaixaTemp_apiListar, apiObter: BaixaTemp_apiObter, apiPrevia: BaixaTemp_apiPrevia, apiEnviarRevisao: BaixaTemp_apiEnviarRevisao,
    apiAprovar: BaixaTemp_apiAprovar, apiDevolver: BaixaTemp_apiDevolver, apiEmitir: BaixaTemp_apiEmitir, apiNovaRevisao: BaixaTemp_apiNovaRevisao,
    // 21/10/2026: completar no cadastro do equipamento o que falta (só campo vazio), pela tela do ensaio.
    apiPreencherCadastro: function (sid, pp, s) { var r = SGO_QEQ_preencherCadastro_(sid, s, pp); return JSON.parse(JSON.stringify(r)); }
  };
  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn]) throw new Error('Função não permitida ou não encontrada: ' + fn);
  var soConsulta = { apiPing: 1, apiListar: 1, apiObter: 1, apiPrevia: 1 };
  if (BAIXATEMP_CFG.PERFIS_EQUIPE.indexOf(perfil) < 0 && !soConsulta[fn]) {
    throw new Error('O perfil ' + (perfil.charAt(0) + perfil.slice(1).toLowerCase()) + ' consulta os ensaios e os relatórios emitidos, mas não preenche, aprova nem emite. Peça a um técnico, à metrologia ou à gestão.');
  }
  var r = allow[fn](req.sessionId, p, sessao);
  if (fn === 'apiEmitir' && typeof SGO_Pendencias_aposGravar_ === 'function') { try { SGO_Pendencias_aposGravar_(r); } catch (e) {} }
  return r;
}

/* ============================================================ utilidades */

function BaixaTemp_agora_() { return Utilities.formatDate(new Date(), BAIXATEMP_CFG.TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function BaixaTemp_agoraBr_() { return Utilities.formatDate(new Date(), BAIXATEMP_CFG.TZ, 'dd/MM/yyyy HH:mm'); }
function BaixaTemp_hojeBr_() { return Utilities.formatDate(new Date(), BAIXATEMP_CFG.TZ, 'dd/MM/yyyy'); }
function BaixaTemp_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function BaixaTemp_nomeSessao_(sessao) { return BaixaTemp_s_(sessao.nome) || BaixaTemp_s_(sessao.usuario); }

function BaixaTemp_garantirTabela_(nome, colunas) {
  var ss = SGO_DATA.getDB();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(colunas);
    try { sh.getRange(1, 1, 1, colunas.length).setFontWeight('bold').setBackground('#f3f3f3'); sh.setFrozenRows(1); } catch (e) {}
  } else {
    var n = sh.getLastColumn();
    var atuais = n ? sh.getRange(1, 1, 1, n).getValues()[0].map(function (h) { return String(h || '').trim(); }) : [];
    colunas.forEach(function (c) { if (atuais.indexOf(c) < 0) { sh.getRange(1, atuais.length + 1).setValue(c); atuais.push(c); } });
  }
  try { delete SGO_DATA._headersCache[nome]; delete SGO_DATA._headerMapCache[nome]; } catch (e) {}
}

function BaixaTemp_bootstrap_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('BAIXATEMP_TABELAS_V1')) return; } catch (e) { cache = null; }
  BaixaTemp_garantirTabela_(BAIXATEMP_CFG.ABA_ENSAIOS, BAIXATEMP_COLUNAS_ENSAIOS);
  BaixaTemp_garantirTabela_(BAIXATEMP_CFG.ABA_HISTORICO, BAIXATEMP_COLUNAS_HISTORICO);
  if (cache) try { cache.put('BAIXATEMP_TABELAS_V1', '1', 21600); } catch (e) {}
}

/** Pasta própria persistente (ID guardado nas propriedades do script, criada uma vez). */
function BaixaTemp_pasta_(prop, nome) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(prop);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* apagada: cria de novo */ } }
  var pasta = DriveApp.getRootFolder().createFolder(nome);
  props.setProperty(prop, pasta.getId());
  return pasta;
}
function BaixaTemp_pastaUploads_() { return BaixaTemp_pasta_(BAIXATEMP_CFG.PASTA_UPLOADS_PROP, BAIXATEMP_CFG.PASTA_UPLOADS); }
function BaixaTemp_pastaDados_() { return BaixaTemp_pasta_(BAIXATEMP_CFG.PASTA_DADOS_PROP, BAIXATEMP_CFG.PASTA_DADOS); }
function BaixaTemp_pastaLaudos_() { return BaixaTemp_pasta_(BAIXATEMP_CFG.PASTA_LAUDOS_PROP, BAIXATEMP_CFG.PASTA_LAUDOS); }

function BaixaTemp_historico_(ensaioId, acao, sessao, detalhe, assinatura) {
  SGO_DATA.insert(BAIXATEMP_CFG.ABA_HISTORICO, {
    ENSAIO_ID: ensaioId, ACAO: acao, USUARIO_ID: BaixaTemp_s_(sessao.userId), USUARIO: BaixaTemp_nomeSessao_(sessao),
    PERFIL: BaixaTemp_s_(sessao.perfil).toUpperCase(), QUANDO: BaixaTemp_agora_(), DETALHE: String(detalhe || '').slice(0, 1800), ASSINATURA_DADOS: assinatura || ''
  });
}

function BaixaTemp_historicoDe_(ensaioId) {
  return SGO_DATA.getAll(BAIXATEMP_CFG.ABA_HISTORICO).filter(function (h) { return String(h.ENSAIO_ID) === String(ensaioId); })
    .sort(function (a, b) { return String(a.QUANDO).localeCompare(String(b.QUANDO)); })
    .map(function (h) {
      var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(h.QUANDO || ''));
      return { acao: BAIXATEMP_ROTULO_ACAO[h.ACAO] || h.ACAO, codigo: h.ACAO, usuario: h.USUARIO, perfil: h.PERFIL, quando: m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : String(h.QUANDO || ''), detalhe: h.DETALHE, assinatura: h.ASSINATURA_DADOS };
    });
}

function BaixaTemp_lerDados_(linha) {
  if (!linha || !linha.DADOS_ARQUIVO_ID) return null;
  try { return JSON.parse(DriveApp.getFileById(linha.DADOS_ARQUIVO_ID).getBlob().getDataAsString('UTF-8')); }
  catch (e) { throw new Error('Não foi possível ler os dados gravados do ensaio ' + (linha.NUMERO || linha.ID) + ' (' + (e && e.message ? e.message : e) + '). Avise o administrador; os dados anteriores continuam guardados na pasta "' + BAIXATEMP_CFG.PASTA_DADOS + '".'); }
}

function BaixaTemp_gravarDados_(ensaioId, versao, dados) {
  var blob = Utilities.newBlob('', 'application/json', ensaioId + ' - v' + versao + '.json');
  blob.setDataFromString(JSON.stringify(dados), 'UTF-8');
  return BaixaTemp_pastaDados_().createFile(blob).getId();
}

function BaixaTemp_linha_(id) {
  BaixaTemp_bootstrap_();
  var l = SGO_DATA.getById(BAIXATEMP_CFG.ABA_ENSAIOS, String(id || ''));
  if (!l) throw new Error('Ensaio não encontrado (código ' + id + '). Volte à lista de ensaios e abra de novo; se ele sumiu, avise o administrador.');
  return l;
}

/* ============================================================ configuração para a tela */

function BaixaTemp_assinaturasRT_() {
  var l = [];
  try { if (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) l = CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO; } catch (e) {}
  if (!l.length) { try { if (typeof AutoRel_UCFG !== 'undefined' && AutoRel_UCFG.ASSINATURAS_PADRAO) l = AutoRel_UCFG.ASSINATURAS_PADRAO; } catch (e2) {} }
  return l;
}

function BaixaTemp_empresa_() {
  try { if (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) return { nome: CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE.nome, cnpj: CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE.cnpj }; } catch (e) {}
  return { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
}

function BaixaTemp_apiPing(sessionId, p, sessao) {
  var perfil = String(sessao.perfil || '').toUpperCase();
  var tipos = {};
  Object.keys(BAIXATEMP_CFG.TIPOS).forEach(function (k) {
    var t = BAIXATEMP_CFG.TIPOS[k];
    tipos[k] = { codigo: k, rotulo: t.rotulo, rotuloLongo: t.rotuloLongo, fases: t.fases, janelaAuto: t.janelaAuto, checklistQI: t.checklistQI, checklistQO: t.checklistQO, elevacaoPulsoMbar: t.deteccao.elevacaoMinimaPulsoMbar, microrganismoSugerido: t.microrganismoSugerido };
  });
  return {
    ok: true, versao: BAIXATEMP_CFG.VERSAO, titulo: BAIXATEMP_CFG.APP_TITULO, tipos: tipos,
    criterios: BAIXATEMP_CFG.CRITERIOS.map(function (c) { return { codigo: c.codigo, titulo: c.titulo, etapas: c.etapas, fonte: BAIXATEMP_CFG.FONTES[c.fonte], opcional: !!c.opcional }; }),
    normas: BAIXATEMP_CFG.NORMAS.map(function (n) { return { codigo: n.codigo, titulo: n.titulo, tipos: n.tipos, confirmada: n.confirmada, usarNoDocumento: n.usarNoDocumento, observacao: n.observacao || '' }; }),
    ciclosQDMinimos: BAIXATEMP_CFG.CICLOS_QD_MINIMOS, ciclosQOMinimos: BAIXATEMP_CFG.CICLOS_QO_MINIMOS, regraDecisao: BAIXATEMP_CFG.REGRA_DECISAO,
    perfil: perfil, usuario: BaixaTemp_nomeSessao_(sessao), userId: BaixaTemp_s_(sessao.userId),
    podeEditar: BAIXATEMP_CFG.PERFIS_EQUIPE.indexOf(perfil) >= 0, podeAprovar: BAIXATEMP_CFG.PERFIS_APROVADORES.indexOf(perfil) >= 0,
    exigirAprovadorDiferente: BAIXATEMP_CFG.EXIGIR_APROVADOR_DIFERENTE,
    responsaveisTecnicos: BaixaTemp_assinaturasRT_().map(function (a) { return { nome: a.nome, cargo: a.cargo, registro: a.registro }; }),
    leitura: { maxArquivos: BAIXATEMP_CFG.LEITURA.MAX_ARQUIVOS_POR_CICLO, intervaloMin: BAIXATEMP_CFG.LEITURA.INTERVALO_MIN_S, intervaloMax: BAIXATEMP_CFG.LEITURA.INTERVALO_MAX_S }
  };
}

/* ============================================================ cadastros */

function BaixaTemp_apiPesquisarClientes(sessionId, p) {
  var r = SGO_CLIENTES.pesquisar(sessionId, String(p.termo || ''));
  if (!r.success) throw new Error(r.message || 'Não foi possível pesquisar os clientes. Tente de novo.');
  return { ok: true, items: (r.items || []).filter(function (c) { return SGO_UTILS.safeUpper(c.STATUS || 'ATIVO') === 'ATIVO'; }).slice(0, 40).map(function (c) {
    return { id: String(c.ID), nome: c.NOME_FANTASIA || c.RAZAO_SOCIAL || '', razao: c.RAZAO_SOCIAL || '', cnpj: SGO_UTILS.formatCnpj ? SGO_UTILS.formatCnpj(c.CNPJ) : String(c.CNPJ || '') };
  }) };
}

function BaixaTemp_apiListarUnidades(sessionId, p) {
  var r = SGO_EQUIPAMENTOS.listarUnidadesAtivasPorCliente(sessionId, p.clienteId);
  return { ok: true, items: ((r && r.items) || []).map(function (u) { return { id: String(u.ID), nome: u.NOME_UNIDADE || '', endereco: u.ENDERECO || '' }; }) };
}

function BaixaTemp_apiListarEquipamentos(sessionId, p) {
  exigirSessao(sessionId);
  var cli = BaixaTemp_s_(p.clienteId), uni = BaixaTemp_s_(p.unidadeId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) {
    return BaixaTemp_s_(e.CLIENTE_ID) === cli && (!uni || BaixaTemp_s_(e.UNIDADE_ID) === uni) && SGO_UTILS.safeUpper(e.STATUS || 'ATIVO') === 'ATIVO';
  }).sort(function (a, b) { return BaixaTemp_s_(a.TAG).localeCompare(BaixaTemp_s_(b.TAG)); });
  return { ok: true, items: itens.map(function (e) { return { id: String(e.ID), tag: e.TAG || '', tipo: e.TIPO || '', serie: e.SERIE || '', setor: e.SETOR || '' }; }) };
}

function BaixaTemp_apiListarPadroes(sessionId) {
  exigirSessao(sessionId);
  var l = [];
  try { l = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES) || []; } catch (e) { l = []; }
  return { ok: true, items: l.filter(function (x) { return SGO_UTILS.safeUpper(x.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (x) {
    return { id: String(x.ID), tag: x.TAG || '', descricao: x.DESCRICAO || '', certificado: x.CERTIFICADO_NUMERO || '', validade: x.VALIDADE || '', U: x.INCERTEZA_U95 === undefined ? '' : String(x.INCERTEZA_U95), k: x.FATOR_K === undefined ? '' : String(x.FATOR_K) };
  }) };
}

/** Identificação a partir do cadastro (o que a tela mandou só vale para os campos de ensaio). */
function BaixaTemp_identificacao_(sessionId, id) {
  id = id || {};
  var out = {};
  Object.keys(id).forEach(function (k) { out[k] = id[k]; });
  var nomes = [];
  try {
    var c = id.clienteId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, id.clienteId) : null;
    var u = id.unidadeId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, id.unidadeId) : null;
    var e = id.equipamentoId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, id.equipamentoId) : null;
    if (c) { out.cliente = c.RAZAO_SOCIAL || c.NOME_FANTASIA || ''; out.cnpj = SGO_UTILS.formatCnpj ? SGO_UTILS.formatCnpj(c.CNPJ) : String(c.CNPJ || ''); out.endereco = (u && u.ENDERECO) || c.ENDERECO || ''; }
    if (u) out.unidade = u.NOME_UNIDADE || '';
    // 21/10/2026: patrimônio e capacidade do cadastro, quando preenchidos.
    if (e && e.PATRIMONIO) out.patrimonio = String(e.PATRIMONIO);
    if (e && e.CAPACIDADE) out.capacidade = String(e.CAPACIDADE);
    if (e) { out.tag = e.TAG || ''; out.numeroSerie = e.SERIE || ''; out.setor = e.SETOR || ''; out.tipoEquipamento = e.TIPO ? String(e.TIPO).charAt(0) + String(e.TIPO).slice(1).toLowerCase() : 'Esterilizador'; nomes = [e.FABRICANTE, e.MODELO].filter(function (x) { return String(x || '').trim().length >= 3; }); }
  } catch (err) { /* sem cadastro: as travas do motor pedem a seleção */ }
  out._nomesProibidos = nomes;
  return out;
}

/* ============================================================ arquivos */

function BaixaTemp_apiUploadArquivo(sessionId, p) {
  var base64 = String(p.base64 || '');
  if (!base64) throw new Error('O arquivo não chegou ao servidor. Escolha o arquivo de novo e aguarde o envio terminar.');
  var nome = String(p.fileName || 'registrador').replace(/[\\\/:*?"<>|]+/g, '_').slice(0, 120);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), String(p.mimeType || 'application/octet-stream'), nome);
  var f = BaixaTemp_pastaUploads_().createFile(blob);
  return { ok: true, fileId: f.getId(), nome: f.getName() };
}

/** Lê o arquivo do registrador → { matriz, decimalVirgula, nome, separador }. */
function BaixaTemp_lerMatriz_(fileId) {
  var arq;
  try { arq = DriveApp.getFileById(String(fileId || '')); } catch (e) { throw new Error('O arquivo enviado não foi encontrado (código ' + fileId + '). Envie o arquivo de novo no cartão do ciclo.'); }
  var nome = arq.getName(), mime = String(arq.getMimeType() || '');
  var ehTexto = /\.(csv|txt|tsv|dat|log)$/i.test(nome) || /^text\//.test(mime);
  if (ehTexto) {
    var blob = arq.getBlob(), txt = blob.getDataAsString('UTF-8');
    if (/�/.test(txt)) txt = blob.getDataAsString('ISO-8859-1');
    var m = BaixaTempParser_textoParaMatriz_(txt);
    return { matriz: m.matriz, decimalVirgula: m.decimalVirgula, nome: nome, separador: m.separador };
  }
  var ssId = null, temp = false;
  if (mime === 'application/vnd.google-apps.spreadsheet') ssId = arq.getId();
  else if (/\.(xlsx|xls|ods)$/i.test(nome) || /spreadsheet|excel/i.test(mime)) {
    if (typeof Drive === 'undefined' || !Drive.Files) throw new Error('A conversão de planilhas não está disponível neste servidor. Exporte o arquivo do registrador em CSV e envie de novo.');
    ssId = Drive.Files.copy({ title: nome.replace(/\.[^.]+$/, '') + ' (TEMP_BAIXATEMP)', mimeType: 'application/vnd.google-apps.spreadsheet' }, arq.getId()).id;
    temp = true;
  } else {
    throw new Error('O formato do arquivo "' + nome + '" não é lido por este módulo. Envie a planilha (XLSX, XLS ou Planilha Google) ou o texto (CSV ou TXT) exportado pelo registrador.');
  }
  try {
    var sh = SpreadsheetApp.openById(ssId).getSheets()[0];
    var rg = sh.getDataRange();
    return { matriz: rg.getValues(), decimalVirgula: true, nome: nome, separador: 'planilha' };
  } finally {
    if (temp) { try { Drive.Files.remove(ssId); } catch (e) {} }
  }
}

function BaixaTemp_celulaTexto_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return v.getFullYear() < 1901 ? Utilities.formatDate(v, BAIXATEMP_CFG.TZ, 'HH:mm:ss') : Utilities.formatDate(v, BAIXATEMP_CFG.TZ, 'dd/MM/yyyy HH:mm:ss');
  }
  if (typeof v === 'number') return SGO_DocA4_num_(v, Math.round(v) === v ? 0 : 3);
  return String(v == null ? '' : v);
}

/**
 * Lê um arquivo e devolve a prévia, o mapa de colunas proposto (ou o informado) e o resumo das leituras.
 * p = { fileId, mapa (colunas com papel), estiloData, dataBase, horaBase, unidadeDecorrido }
 */
function BaixaTemp_apiLerArquivo(sessionId, p) {
  var m = BaixaTemp_lerMatriz_(p.fileId);
  if (!m.matriz.length) throw new Error('O arquivo "' + m.nome + '" está vazio. Exporte de novo do registrador.');
  var prop = BaixaTempParser_proporMapa_(m.matriz, m.decimalVirgula);
  var colunas = Array.isArray(p.colunas) && p.colunas.length ? p.colunas : prop.colunas;
  var hdr = p.linhaCabecalho !== undefined && p.linhaCabecalho !== null && p.linhaCabecalho !== '' ? Number(p.linhaCabecalho) : prop.linhaCabecalho;
  var serie = BaixaTempParser_normalizar_(m.matriz, BaixaTempParser_mapaDeColunas_(colunas), { linhaCabecalho: hdr, decimalVirgula: m.decimalVirgula, estiloData: p.estiloData || 'AUTO', dataBase: p.dataBase, horaBase: p.horaBase, unidadeDecorrido: p.unidadeDecorrido });
  var ini = Math.max(0, hdr);
  var previa = m.matriz.slice(ini, ini + BAIXATEMP_CFG.LEITURA.PREVIA_LINHAS + 1).map(function (l) { return (l || []).map(BaixaTemp_celulaTexto_); });
  var lac = serie.tempos.length ? BaixaTempParser_lacunas_(serie.tempos) : { intervaloTipicoS: 0, lacunas: [] };
  return {
    ok: true, nome: m.nome, separador: m.separador, linhaCabecalho: hdr, colunas: colunas, previa: previa,
    avisos: prop.avisos.concat(serie.avisos), erros: serie.erros,
    resumo: serie.tempos.length ? { leituras: serie.tempos.length, inicio: BaixaTempParser_fmtDataHora_(serie.tempos[0]), fim: BaixaTempParser_fmtDataHora_(serie.tempos[serie.tempos.length - 1]), intervaloS: lac.intervaloTipicoS, lacunas: lac.lacunas.length, sensores: serie.nomes, temPressao: !!serie.pressao, estiloData: serie.estiloData } : null
  };
}

/** Série unida de um ciclo (lê todos os arquivos com o mapa salvo). */
function BaixaTemp_serieDoCiclo_(ciclo) {
  var arquivos = (Array.isArray(ciclo.arquivos) ? ciclo.arquivos : []).filter(function (a) { return a && a.fileId; });
  if (!arquivos.length) return { serie: null, erros: [] };
  var series = [], erros = [];
  arquivos.forEach(function (a) {
    var m = BaixaTemp_lerMatriz_(a.fileId);
    var colunas = Array.isArray(a.colunas) && a.colunas.length ? a.colunas : BaixaTempParser_proporMapa_(m.matriz, m.decimalVirgula).colunas;
    var hdr = a.linhaCabecalho !== undefined && a.linhaCabecalho !== null && a.linhaCabecalho !== '' ? Number(a.linhaCabecalho) : BaixaTempParser_linhaCabecalho_(m.matriz, m.decimalVirgula);
    var s = BaixaTempParser_normalizar_(m.matriz, BaixaTempParser_mapaDeColunas_(colunas), { linhaCabecalho: hdr, decimalVirgula: m.decimalVirgula, estiloData: a.estiloData || 'AUTO', dataBase: ciclo.data, horaBase: a.horaBase, unidadeDecorrido: a.unidadeDecorrido });
    s.erros.forEach(function (e) { erros.push(BaixaTempMotor_rotuloCiclo_(ciclo) + ', arquivo "' + m.nome + '": ' + e); });
    if (arquivos.length > 1) s.nomes = s.nomes.map(function (n) { return n; });
    a.leituras = s.tempos.length;
    series.push(s);
  });
  var u = BaixaTempParser_unir_(series);
  if (u) {
    var vistos = {};
    u.nomes = u.nomes.map(function (n, i) { var x = n; var k = 2; while (vistos[x]) { x = n + ' (' + k + ')'; k++; } vistos[x] = 1; return x; });
  }
  return { serie: u, erros: erros };
}

/* ============================================================ cálculo */

/** Calcula todos os ciclos e o ensaio. Devolve { dados (identificação do cadastro), av, series, nomesProibidos }. */
function BaixaTemp_calcular_(sessionId, dadosTela) {
  var dados = JSON.parse(JSON.stringify(dadosTela || {}));
  dados.identificacao = BaixaTemp_identificacao_(sessionId, dados.identificacao);
  var nomesProibidos = dados.identificacao._nomesProibidos || [];
  delete dados.identificacao._nomesProibidos;
  var analises = {}, series = {}, errosLeitura = [];
  var et = dados.etapas || {};
  (Array.isArray(dados.ciclos) ? dados.ciclos : []).forEach(function (c) {
    var e = String(c.etapa || '').toUpperCase();
    if (!((e === 'QO' && et.QO) || (e === 'QD' && et.QD))) return;
    var sr;
    try { sr = BaixaTemp_serieDoCiclo_(c); }
    catch (err) { sr = { serie: null, erros: [BaixaTempMotor_rotuloCiclo_(c) + ': ' + (err && err.message ? err.message : err)] }; }
    sr.erros.forEach(function (x) { errosLeitura.push(x); });
    series[c.id] = sr.serie;
    var a = BaixaTempMotor_analisarCiclo_(sr.serie, c, dados);
    sr.erros.forEach(function (x) { a.travas.unshift(x); });
    a.resultado = a.travas.length ? null : a.resultado;
    analises[c.id] = a;
  });
  var av = BaixaTempMotor_avaliarEnsaio_(dados, analises);
  return { dados: dados, av: av, series: series, nomesProibidos: nomesProibidos };
}

/** Avaliação sem os índices internos (para a tela e para a impressão digital). */
function BaixaTemp_avParaTela_(av) {
  return JSON.parse(JSON.stringify(av, function (k, v) { return (k === 'i0' || k === 'i1') ? undefined : v; }));
}

function BaixaTemp_assinatura_(calc, textos) {
  var d = JSON.parse(JSON.stringify(calc.dados));
  delete d.textos;
  return SGO_DocSalvar_assinatura_({ dados: d, resultado: BaixaTemp_avParaTela_(calc.av), textos: textos || {} });
}

function BaixaTemp_graficosTela_(calc) {
  var g = {};
  (calc.av.ciclos || []).forEach(function (a) {
    var s = calc.series[a.cicloId];
    if (!s) return;
    var t = BaixaTempDoc_graficoTemperatura_(s, a).svg;
    var pr = a.pressao && s.pressao ? BaixaTempDoc_graficoPressao_({ tempos: s.tempos, pressao: s.pressao, janela: a.janela, limiar: a.pressao.limiarVacuo, rotuloLimiar: 'Limiar de vácuo' }) : '';
    g[a.cicloId] = { temperatura: t, pressao: pr };
  });
  return g;
}

function BaixaTemp_apiCalcular(sessionId, p) {
  var calc = BaixaTemp_calcular_(sessionId, p.dados);
  return { ok: true, avaliacao: BaixaTemp_avParaTela_(calc.av), identificacao: calc.dados.identificacao, graficos: p.semGraficos ? {} : BaixaTemp_graficosTela_(calc), leituras: BaixaTemp_leiturasPorArquivo_(calc.dados) };
}

function BaixaTemp_leiturasPorArquivo_(dados) {
  var r = {};
  (dados.ciclos || []).forEach(function (c) { (c.arquivos || []).forEach(function (a) { if (a.fileId) r[a.fileId] = a.leituras || 0; }); });
  return r;
}

function BaixaTemp_apiRedigir(sessionId, p) {
  var calc = BaixaTemp_calcular_(sessionId, p.dados);
  if (calc.av.travas.length) {
    return { ok: true, bloqueado: true, avaliacao: BaixaTemp_avParaTela_(calc.av), aviso: 'Os textos só são redigidos depois que as pendências forem resolvidas (o texto precisa partir do resultado calculado). Resolva os itens da lista "O que falta" e toque em "Redigir textos" de novo.' };
  }
  var r = BaixaTempIA_redigir_(calc.dados, calc.av, calc.nomesProibidos);
  return { ok: true, textos: r.textos, origem: r.origem, aviso: r.aviso, avaliacao: BaixaTemp_avParaTela_(calc.av) };
}

/* ============================================================ gravação e fluxo */

function BaixaTemp_resumoLinha_(dados) {
  var id = dados.identificacao || {}, et = dados.etapas || {};
  return {
    TIPO: String(dados.tipo || '').toUpperCase(), ETAPAS: ['QI', 'QO', 'QD'].filter(function (k) { return et[k]; }).join(','),
    CLIENTE_ID: BaixaTemp_s_(id.clienteId), UNIDADE_ID: BaixaTemp_s_(id.unidadeId), EQUIPAMENTO_ID: BaixaTemp_s_(id.equipamentoId),
    CLIENTE_NOME: BaixaTemp_s_(id.cliente), CNPJ: BaixaTemp_s_(id.cnpj), EQUIPAMENTO_TAG: BaixaTemp_s_(id.tag), DATA_INICIO: BaixaTemp_s_(id.dataInicio)
  };
}

function BaixaTemp_apiSalvar(sessionId, p, sessao) {
  BaixaTemp_bootstrap_();
  var dados = p.dados || {};
  if (!dados.tipo) throw new Error('Escolha o tipo de processo (peróxido de hidrogênio ou vapor a baixa temperatura com formaldeído) em 1. Identificação antes de salvar.');
  BaixaTemp_tipoCfg_(dados.tipo);
  dados.identificacao = BaixaTemp_identificacao_(sessionId, dados.identificacao);
  delete dados.identificacao._nomesProibidos;
  // 20/10/2026: equipamento de outro cliente (ou de outra unidade) é recusado já ao salvar (SGO_QualifEquipamento.js).
  var idt = dados.identificacao;
  if (idt.equipamentoId && typeof SGO_QEQ_identificacao_ === 'function') SGO_QEQ_identificacao_(sessionId, idt.clienteId, idt.unidadeId, idt.equipamentoId);
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(20000)) throw new Error('Outro salvamento está em andamento. Aguarde alguns segundos e toque em "Salvar" de novo; o que você preencheu continua na tela.');
  try {
    if (p.id) {
      var l = BaixaTemp_linha_(p.id);
      if (l.STATUS === BAIXATEMP_STATUS.EMITIDO) throw new Error('Este ensaio já foi emitido (relatório ' + l.NUMERO + ') e não pode mais ser alterado. Para corrigir, toque em "Nova revisão": o sistema cria uma revisão nova com os mesmos dados, e o relatório emitido continua guardado.');
      if (p.versaoDados && Number(p.versaoDados) !== Number(l.VERSAO_DADOS)) throw new Error('Este ensaio foi alterado por outra pessoa ou em outra aba depois que você o abriu (versão ' + l.VERSAO_DADOS + '). Para não perder nada, copie o que mudou, abra o ensaio de novo pela lista e salve.');
      var versao = (Number(l.VERSAO_DADOS) || 0) + 1;
      var arqId = BaixaTemp_gravarDados_(l.ID, versao, dados);
      var mud = Object.assign(BaixaTemp_resumoLinha_(dados), { DADOS_ARQUIVO_ID: arqId, VERSAO_DADOS: versao, ATUALIZADO_EM: BaixaTemp_agora_() });
      var anulou = l.STATUS === BAIXATEMP_STATUS.EM_REVISAO || l.STATUS === BAIXATEMP_STATUS.APROVADO;
      if (anulou) Object.assign(mud, { STATUS: BAIXATEMP_STATUS.RASCUNHO, ASSINATURA_DADOS: '', APROVADO_POR_ID: '', APROVADO_POR: '', APROVADO_RT: '', APROVADO_EM: '', PARECER_RT: '' });
      SGO_DATA.update(BAIXATEMP_CFG.ABA_ENSAIOS, l.ID, mud);
      BaixaTemp_historico_(l.ID, anulou ? 'ALTERADO_APOS_REVISAO' : 'SALVO', sessao, anulou ? 'Dados alterados depois do envio para revisão: a revisão' + (l.STATUS === BAIXATEMP_STATUS.APROVADO ? ' e a aprovação foram anuladas' : ' foi anulada') + ' (versão ' + versao + ').' : 'Versão ' + versao + ' dos dados.');
      return { ok: true, id: l.ID, versaoDados: versao, status: anulou ? BAIXATEMP_STATUS.RASCUNHO : l.STATUS, aviso: anulou ? 'O ensaio voltou para rascunho porque os dados mudaram depois do envio para revisão. Envie para revisão de novo quando terminar.' : '' };
    }
    var reg = SGO_DATA.gerarRegistroBase(Object.assign(BaixaTemp_resumoLinha_(dados), {
      NUMERO: '', REVISAO: String(p.revisao || '0'), STATUS: BAIXATEMP_STATUS.RASCUNHO, RESULTADO: '', VERSAO_DADOS: 1,
      ELABORADO_POR_ID: BaixaTemp_s_(sessao.userId), ELABORADO_POR: BaixaTemp_nomeSessao_(sessao), REGISTRO_ORIGEM_ID: BaixaTemp_s_(p.registroOrigemId), ATUALIZADO_EM: BaixaTemp_agora_()
    }));
    reg.DADOS_ARQUIVO_ID = BaixaTemp_gravarDados_(reg.ID, 1, dados);
    SGO_DATA.insert(BAIXATEMP_CFG.ABA_ENSAIOS, SGO_DATA.normalizarObjetoParaSheet(BAIXATEMP_CFG.ABA_ENSAIOS, reg));
    BaixaTemp_historico_(reg.ID, 'CRIADO', sessao, 'Ensaio criado' + (p.registroOrigemId ? ' como nova revisão do ensaio ' + p.registroOrigemId : '') + '.');
    return { ok: true, id: reg.ID, versaoDados: 1, status: BAIXATEMP_STATUS.RASCUNHO, aviso: '' };
  } finally { trava.releaseLock(); }
}

function BaixaTemp_rotuloStatus_(s) {
  return { RASCUNHO: 'Rascunho', EM_REVISAO: 'Aguardando revisão do responsável técnico', APROVADO: 'Aprovado, pronto para emitir', EMITIDO: 'Emitido' }[s] || s;
}

function BaixaTemp_apiListar(sessionId, p) {
  BaixaTemp_bootstrap_();
  var q = SGO_UTILS.safeLower(p.termo || ''), st = BaixaTemp_s_(p.status).toUpperCase();
  var itens = SGO_DATA.getAll(BAIXATEMP_CFG.ABA_ENSAIOS).filter(function (l) {
    if (st && l.STATUS !== st) return false;
    if (!q) return true;
    return [l.NUMERO, l.CLIENTE_NOME, l.CNPJ, l.EQUIPAMENTO_TAG].some(function (v) { return SGO_UTILS.safeLower(v).indexOf(q) >= 0; });
  }).sort(function (a, b) { return String(b.ATUALIZADO_EM || b.CRIADO_EM || '').localeCompare(String(a.ATUALIZADO_EM || a.CRIADO_EM || '')); }).slice(0, 200);
  return { ok: true, items: itens.map(function (l) {
    return { id: l.ID, numero: l.NUMERO, revisao: l.REVISAO, tipo: l.TIPO, etapas: l.ETAPAS, cliente: l.CLIENTE_NOME, tag: l.EQUIPAMENTO_TAG, dataInicio: l.DATA_INICIO,
      status: l.STATUS, statusRotulo: BaixaTemp_rotuloStatus_(l.STATUS), resultado: l.RESULTADO, elaboradoPor: l.ELABORADO_POR, doc: { pdf: l.LINK_PDF || '' } };
  }) };
}

function BaixaTemp_apiObter(sessionId, p) {
  var l = BaixaTemp_linha_(p.id);
  return { ok: true, id: l.ID, numero: l.NUMERO, revisao: l.REVISAO, status: l.STATUS, statusRotulo: BaixaTemp_rotuloStatus_(l.STATUS), versaoDados: Number(l.VERSAO_DADOS) || 1,
    elaboradoPor: l.ELABORADO_POR, elaboradoPorId: l.ELABORADO_POR_ID, aprovadoPor: l.APROVADO_POR, aprovadoRt: l.APROVADO_RT, parecerRt: l.PARECER_RT,
    resultado: l.RESULTADO,
    // links aninhados de propósito: abrir um ensaio emitido não deve acender a barra "Documento salvo" (JS_EnviarDoc só olha até 3 níveis)
    arquivos: { emitido: { links: { pdf: l.LINK_PDF || '', html: l.LINK_HTML || '', pasta: l.PASTA_URL || '', idPdf: l.PDF_ID || '', idHtml: l.HTML_ID || '' } } },
    dados: BaixaTemp_lerDados_(l), historico: BaixaTemp_historicoDe_(l.ID) };
}

/** Pendências para enviar, aprovar ou emitir: travas do motor + textos. */
function BaixaTemp_conferir_(sessionId, dados) {
  var calc = BaixaTemp_calcular_(sessionId, dados);
  var travas = calc.av.travas.slice(), avisos = calc.av.avisos.slice();
  if (!travas.length) {
    var ct = BaixaTempIA_conferirTextosFinais_(dados.textos || {}, calc.dados, calc.av, calc.nomesProibidos);
    travas = travas.concat(ct.travas); avisos = avisos.concat(ct.avisos);
  }
  return { calc: calc, travas: travas, avisos: avisos };
}

function BaixaTemp_mensagemTravas_(acao, travas) {
  return 'Não foi possível ' + acao + ' porque há ' + travas.length + ' pendência(s). O relatório só sai com dados completos e coerentes:\n- ' + travas.slice(0, 12).join('\n- ') + (travas.length > 12 ? '\n- e mais ' + (travas.length - 12) + ' pendência(s), listadas em "O que falta".' : '') + '\nCorrija, salve e toque em "' + (acao === 'emitir' ? 'Emitir relatório' : 'Enviar para revisão') + '" de novo.';
}

function BaixaTemp_apiEnviarRevisao(sessionId, p, sessao) {
  var l = BaixaTemp_linha_(p.id);
  if (l.STATUS !== BAIXATEMP_STATUS.RASCUNHO) throw new Error('Este ensaio está "' + BaixaTemp_rotuloStatus_(l.STATUS) + '". Só um rascunho pode ser enviado para revisão.');
  var dados = BaixaTemp_lerDados_(l);
  var c = BaixaTemp_conferir_(sessionId, dados);
  if (c.travas.length) throw new Error(BaixaTemp_mensagemTravas_('enviar para revisão', c.travas));
  var ass = BaixaTemp_assinatura_(c.calc, dados.textos);
  SGO_DATA.update(BAIXATEMP_CFG.ABA_ENSAIOS, l.ID, { STATUS: BAIXATEMP_STATUS.EM_REVISAO, RESULTADO: c.calc.av.resultado, ASSINATURA_DADOS: ass, ENVIADO_REVISAO_EM: BaixaTemp_agora_(), ATUALIZADO_EM: BaixaTemp_agora_() });
  BaixaTemp_historico_(l.ID, 'ENVIADO_REVISAO', sessao, 'Resultado calculado: ' + (c.calc.av.resultado === 'CONFORME' ? 'conforme' : 'não conforme') + '.', ass);
  return { ok: true, status: BAIXATEMP_STATUS.EM_REVISAO, avisos: c.avisos, assinatura: ass };
}

function BaixaTemp_exigirAprovador_(sessao, l) {
  var perfil = String(sessao.perfil || '').toUpperCase();
  if (BAIXATEMP_CFG.PERFIS_APROVADORES.indexOf(perfil) < 0) throw new Error('A revisão e a aprovação são do responsável técnico (perfis Administrador, Diretoria ou Gestor). Peça a revisão a ele; o ensaio fica em "Aguardando revisão".');
  if (BAIXATEMP_CFG.EXIGIR_APROVADOR_DIFERENTE && BaixaTemp_s_(l.ELABORADO_POR_ID) && BaixaTemp_s_(l.ELABORADO_POR_ID) === BaixaTemp_s_(sessao.userId)) throw new Error('Quem elaborou o ensaio não pode aprová-lo (revisão independente). Peça a outro responsável técnico para revisar e aprovar.');
}

function BaixaTemp_apiAprovar(sessionId, p, sessao) {
  var l = BaixaTemp_linha_(p.id);
  BaixaTemp_exigirAprovador_(sessao, l);
  if (l.STATUS !== BAIXATEMP_STATUS.EM_REVISAO) throw new Error('Este ensaio está "' + BaixaTemp_rotuloStatus_(l.STATUS) + '". Só um ensaio aguardando revisão pode ser aprovado.');
  var rt = BaixaTemp_assinaturasRT_().filter(function (a) { return a.nome === String(p.rtNome || ''); })[0];
  if (!rt) throw new Error('Escolha o responsável técnico que assina o relatório na lista "Responsável técnico que assina" e toque em "Aprovar" de novo.');
  if (!String(p.parecer || '').trim()) throw new Error('Escreva o parecer da revisão (o que foi conferido) no campo "Parecer da revisão" e toque em "Aprovar" de novo.');
  var dados = BaixaTemp_lerDados_(l);
  var c = BaixaTemp_conferir_(sessionId, dados);
  if (c.travas.length) throw new Error(BaixaTemp_mensagemTravas_('aprovar', c.travas));
  var ass = BaixaTemp_assinatura_(c.calc, dados.textos);
  if (ass !== l.ASSINATURA_DADOS) throw new Error('Os dados do ensaio ou dos arquivos mudaram depois do envio para revisão (a impressão digital não confere). Devolva o ensaio ao técnico para conferir e enviar de novo.');
  SGO_DATA.update(BAIXATEMP_CFG.ABA_ENSAIOS, l.ID, { STATUS: BAIXATEMP_STATUS.APROVADO, APROVADO_POR_ID: BaixaTemp_s_(sessao.userId), APROVADO_POR: BaixaTemp_nomeSessao_(sessao), APROVADO_RT: rt.nome, APROVADO_EM: BaixaTemp_agora_(), PARECER_RT: String(p.parecer).trim().slice(0, 1500), ATUALIZADO_EM: BaixaTemp_agora_() });
  BaixaTemp_historico_(l.ID, 'APROVADO', sessao, 'Responsável técnico que assina: ' + rt.nome + '. Parecer: ' + String(p.parecer).trim(), ass);
  return { ok: true, status: BAIXATEMP_STATUS.APROVADO, avisos: c.avisos };
}

function BaixaTemp_apiDevolver(sessionId, p, sessao) {
  var l = BaixaTemp_linha_(p.id);
  BaixaTemp_exigirAprovador_(sessao, l);
  if (l.STATUS !== BAIXATEMP_STATUS.EM_REVISAO && l.STATUS !== BAIXATEMP_STATUS.APROVADO) throw new Error('Só um ensaio aguardando revisão ou aprovado pode ser devolvido.');
  if (!String(p.motivo || '').trim()) throw new Error('Escreva no campo "Parecer da revisão" o que o técnico precisa corrigir e toque em "Devolver ao técnico" de novo.');
  SGO_DATA.update(BAIXATEMP_CFG.ABA_ENSAIOS, l.ID, { STATUS: BAIXATEMP_STATUS.RASCUNHO, ASSINATURA_DADOS: '', APROVADO_POR_ID: '', APROVADO_POR: '', APROVADO_RT: '', APROVADO_EM: '', PARECER_RT: String(p.motivo).trim().slice(0, 1500), ATUALIZADO_EM: BaixaTemp_agora_() });
  BaixaTemp_historico_(l.ID, 'DEVOLVIDO', sessao, String(p.motivo).trim());
  return { ok: true, status: BAIXATEMP_STATUS.RASCUNHO };
}

function BaixaTemp_proximoNumero_() {
  var props = PropertiesService.getScriptProperties();
  var ano = Utilities.formatDate(new Date(), BAIXATEMP_CFG.TZ, 'yyyy');
  var chave = BAIXATEMP_CFG.NUMERO_PROP_PREFIXO + ano;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(20000)) throw new Error('Outro relatório está sendo numerado neste momento. Aguarde alguns segundos e toque em "Emitir relatório" de novo.');
  try {
    var n = (parseInt(props.getProperty(chave) || '0', 10) || 0) + 1;
    props.setProperty(chave, String(n));
    return BAIXATEMP_CFG.SIGLA_NUMERO + '-' + ano + '-' + ('0000' + n).slice(-5);
  } finally { trava.releaseLock(); }
}

/** Monta o HTML do relatório (prévia ou emissão). */
function BaixaTemp_montarHtml_(calc, dados, l, extra) {
  var hist = BaixaTemp_historicoDe_(l.ID).map(function (h) { return { quando: h.quando, acao: h.acao, usuario: h.usuario, detalhe: h.detalhe }; })
    .filter(function (h) { return h.acao !== 'Dados salvos'; });
  if (extra && extra.emitindo) hist.push({ quando: BaixaTemp_agoraBr_(), acao: 'Emitido', usuario: extra.emissor, detalhe: 'Relatório ' + extra.numero });
  var rt = BaixaTemp_assinaturasRT_().filter(function (a) { return a.nome === l.APROVADO_RT; })[0];
  return BaixaTempDoc_montar_({
    dados: calc.dados, av: calc.av, series: calc.series, textos: dados.textos || {},
    numero: (extra && extra.numero) || l.NUMERO || 'prévia', revisao: l.REVISAO || '0', geradoEm: BaixaTemp_hojeBr_(), empresa: BaixaTemp_empresa_(),
    elaborador: { nome: calc.dados.identificacao.tecnicoExecutor || l.ELABORADO_POR },
    aprovacao: rt ? { nome: rt.nome, cargo: rt.cargo, registro: rt.registro, imagemSvg: (extra && extra.emitindo) ? rt.imagemSvg : '', parecer: l.PARECER_RT } : null,
    historico: hist, assinaturaDados: l.ASSINATURA_DADOS, simulado: !!(extra && extra.previa)
  });
}

function BaixaTemp_apiPrevia(sessionId, p) {
  var l = BaixaTemp_linha_(p.id);
  var dados = p.dados || BaixaTemp_lerDados_(l);
  var calc = BaixaTemp_calcular_(sessionId, dados);
  if (calc.av.travas.length) throw new Error(BaixaTemp_mensagemTravas_('montar a prévia', calc.av.travas));
  var html = BaixaTemp_montarHtml_(calc, dados, l, { previa: true });
  html = html.replace('Documento de uso interno, gerado com dados simulados. Não representa ensaio real e não pode ser entregue ao cliente.', 'Prévia para revisão: este documento ainda não foi emitido, não tem número definitivo nem assinatura e não pode ser entregue ao cliente.');
  try { html = SGO_DocA4_paginar_(html, { nome: 'Previa' }).html; } catch (e) {}
  return { ok: true, html: html };
}

/** <pasta do cliente>/<TAG - tipo>/Qualificação (cria o que faltar), mesmo nome usado por SGO_QEQ_pastaEquipamento_. */
function BaixaTemp_pastaEquipamento_(pastaCliente, id) {
  var sub = function (pai, nome) { var it = pai.getFoldersByName(nome); return it.hasNext() ? it.next() : pai.createFolder(nome); };
  var nomeEq = SGO_DocSalvar_sanitizarNome_([BaixaTemp_s_(id.tag) || 'Sem TAG', BaixaTemp_s_(id.tipoEquipamento) || 'Esterilizador'].join(' - '));
  return sub(sub(pastaCliente, nomeEq), 'Qualificação');
}

function BaixaTemp_apiEmitir(sessionId, p, sessao) {
  var l = BaixaTemp_linha_(p.id);
  if (l.STATUS === BAIXATEMP_STATUS.EMITIDO) return { ok: true, jaEmitido: true, numero: l.NUMERO, pdfId: l.PDF_ID, pdfUrl: l.LINK_PDF, htmlId: l.HTML_ID, htmlUrl: l.LINK_HTML, pastaUrl: l.PASTA_URL };
  if (l.STATUS !== BAIXATEMP_STATUS.APROVADO) throw new Error('O relatório só pode ser emitido depois da revisão e da aprovação do responsável técnico. Situação atual: "' + BaixaTemp_rotuloStatus_(l.STATUS) + '". ' + (l.STATUS === BAIXATEMP_STATUS.RASCUNHO ? 'Toque em "Enviar para revisão".' : 'Peça ao responsável técnico para revisar em "8. Revisão e emissão".'));
  var dados = BaixaTemp_lerDados_(l);
  var c = BaixaTemp_conferir_(sessionId, dados);
  if (c.travas.length) throw new Error(BaixaTemp_mensagemTravas_('emitir', c.travas));
  var ass = BaixaTemp_assinatura_(c.calc, dados.textos);
  if (ass !== l.ASSINATURA_DADOS) throw new Error('Os dados ou os arquivos mudaram depois da aprovação (a impressão digital não confere). O relatório não foi emitido. Peça ao responsável técnico para devolver e revisar de novo.');
  var id = c.calc.dados.identificacao;
  SGO_VINCULOS.relation(sessionId, id.clienteId, id.unidadeId, id.equipamentoId);
  var numero = BaixaTemp_proximoNumero_();
  var html = BaixaTemp_montarHtml_(c.calc, dados, l, { emitindo: true, numero: numero, emissor: BaixaTemp_nomeSessao_(sessao) });
  // 21/10/2026: pasta do equipamento dentro da pasta do cliente, como nos outros módulos de qualificação
  // (Baixa Temperatura - Laudos/<CNPJ>/<TAG - tipo>/Qualificação). Relatórios antigos continuam onde estão.
  var pasta = BaixaTemp_pastaEquipamento_(SGO_DocSalvar_pastaClienteEm_(BaixaTemp_pastaLaudos_(), id.cnpj, id.cliente), id);
  var carimbo = Utilities.formatDate(new Date(), BAIXATEMP_CFG.TZ, 'yyyy-MM-dd HHmm');
  var nomeBase = SGO_DocSalvar_sanitizarNome_('Relatório de qualificação baixa temperatura - ' + numero + ' - ' + (id.tag || 'sem-tag') + ' - ' + carimbo);
  var salvo = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, { compartilhar: true });
  var agora = BaixaTemp_agora_();
  SGO_DATA.update(BAIXATEMP_CFG.ABA_ENSAIOS, l.ID, { NUMERO: numero, STATUS: BAIXATEMP_STATUS.EMITIDO, RESULTADO: c.calc.av.resultado, EMITIDO_POR: BaixaTemp_nomeSessao_(sessao), EMITIDO_EM: agora,
    PDF_ID: salvo.pdfId, LINK_PDF: salvo.pdfUrl, HTML_ID: salvo.htmlId, LINK_HTML: salvo.htmlUrl, PASTA_URL: pasta.getUrl(), ATUALIZADO_EM: agora });
  BaixaTemp_historico_(l.ID, 'EMITIDO', sessao, 'Relatório ' + numero + ' (' + salvo.pdfNome + ').', ass);
  var avisoArquivo = '';
  try {
    var venc = new Date(); venc.setMonth(venc.getMonth() + BAIXATEMP_CFG.VALIDADE_DOCUMENTO_MESES);
    var reg = SGO_DOCUMENTOS.registrarDocumentoExistente(sessionId, { CLIENTE_ID: id.clienteId, UNIDADE_ID: id.unidadeId, EQUIPAMENTO_ID: id.equipamentoId, TIPO_DOCUMENTO: BAIXATEMP_CFG.TIPO_DOCUMENTO_ARQUIVO, NOME_ARQUIVO: salvo.pdfNome, LINK_ARQUIVO: salvo.pdfUrl, DATA_VENCIMENTO: Utilities.formatDate(venc, BAIXATEMP_CFG.TZ, 'yyyy-MM-dd') });
    if (reg && reg.success === false) avisoArquivo = 'O relatório foi salvo na pasta do cliente, mas não entrou no Arquivo de documentos: ' + reg.message + ' Registre pelo Arquivo de documentos > Vincular documento existente.';
  } catch (e) { avisoArquivo = 'O relatório foi salvo na pasta do cliente, mas não entrou no Arquivo de documentos (' + (e && e.message ? e.message : e) + '). Registre pelo Arquivo de documentos > Vincular documento existente.'; }
  var htmlTela = SGO_DocSalvar_injetarAvisoTela_(salvo.html || html, { salvo: true, pdfUrl: salvo.pdfUrl, pastaUrl: pasta.getUrl(), pdfId: salvo.pdfId });
  return { ok: true, numero: numero, html: htmlTela, pdfId: salvo.pdfId, pdfUrl: salvo.pdfUrl, htmlId: salvo.htmlId, htmlUrl: salvo.htmlUrl, pastaUrl: pasta.getUrl(), resultado: c.calc.av.resultado, avisoArquivo: avisoArquivo, avisos: c.avisos };
}

function BaixaTemp_apiNovaRevisao(sessionId, p, sessao) {
  var l = BaixaTemp_linha_(p.id);
  if (l.STATUS !== BAIXATEMP_STATUS.EMITIDO) throw new Error('Nova revisão só se aplica a ensaio emitido. Este ensaio ainda pode ser alterado diretamente.');
  var dados = BaixaTemp_lerDados_(l);
  var rev = String((parseInt(l.REVISAO, 10) || 0) + 1);
  var r = BaixaTemp_apiSalvar(sessionId, { dados: dados, revisao: rev, registroOrigemId: l.ID }, sessao);
  return { ok: true, id: r.id, revisao: rev };
}
