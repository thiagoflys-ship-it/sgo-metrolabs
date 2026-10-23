/****************************************************
 * ENVIAR DOCUMENTO AO CLIENTE (20/10/2026) — componente único do SGO+.
 *
 * Todo documento gerado pelo SGO+ (certificados, relatórios de ensaio e de qualificação, laudos NR-13, declarações,
 * relatórios de calibração, PGT/POP, planejamento do CME, cronograma, registros operacionais, inventário, documentos
 * do Arquivo de documentos e os relatórios internos quando fizer sentido) pode ser enviado por E-MAIL e/ou WHATSAPP
 * a partir da janela "Enviar documento" (JS_EnviarDoc.html). Nada é enviado sozinho: é sempre ação do usuário.
 *
 * Regras:
 *  - O CLIENTE do documento é descoberto AQUI, pelo próprio arquivo: registro do Arquivo de documentos
 *    (DOC_DOCUMENTOS.LINK_ARQUIVO) ou pasta do cliente (CNPJ com 14 dígitos ou nome do cliente) em que o PDF foi
 *    gravado. O que a tela manda é só dica e nunca troca o cliente descoberto pelo arquivo. Destinatários sugeridos
 *    = contatos desse cliente (cadastro do cliente, unidades, acessos do portal do cliente e envios anteriores).
 *  - Documento com dado pessoal de colaborador (Programa de conduta, avaliação da gestão, cópias privadas) não sai
 *    do sistema por aqui (LGPD): a janela explica e não envia.
 *  - Documento interno (Frota, Qualidade, padrões, sem pasta de cliente): pode ser enviado a quem o usuário digitar
 *    ou a pessoas da equipe (o servidor busca o e-mail e o celular do cadastro; a tela não recebe o telefone).
 *  - E-mail: SGO_Email_enviarComoUsuario_({ usuarioId, para, cc, assunto, html, anexos }) quando existir (e-mail
 *    integrado, outra equipe); enquanto não existir, ou se ela responder semCaixa, sai pela caixa do sistema
 *    (MailApp) com "responder para" o e-mail do usuário.
 *  - WhatsApp: Z-API, documento em base64 (send-document), nunca link público; respeita a fila e os limites de
 *    proteção do número (SGO_zapiReservar_, SGO_Zapi.js). Usa SGO_zapiEnviarDocumento_ se a equipe da Z-API criar.
 *    Fora do horário comercial a janela avisa, mas o envio continua sendo do usuário.
 *  - Registro: DOC_ENVIOS, uma linha por e-mail (todos os endereços juntos) e uma por celular, com quem, quando,
 *    para quem, canal, situação ENVIANDO / ENVIADO / FALHOU e motivo. "Tentar de novo" cria uma linha nova ligada
 *    à original (TENTATIVA_DE); nada é apagado.
 *  - Pedido repetido (duplo clique, conexão que cai e repete): o mesmo PEDIDO_ID nunca envia duas vezes.
 *
 * Chamadas da tela (google.script.run):
 *   EnviarDoc_apiConferir(sessionId, { ids })            — depois de gerar: qual dos arquivos é o documento.
 *   EnviarDoc_apiPreparar(sessionId, { arquivoId, ... }) — dados da janela.
 *   EnviarDoc_apiEnviar(sessionId, { pedidoId, ... })    — envia e registra.
 *   EnviarDoc_apiTentarDeNovo(sessionId, { envioId, pedidoId })
 *   EnviarDoc_apiHistorico(sessionId, { arquivoId | clienteId })
 *   EnviarDoc_apiDocumentosDoCliente(sessionId, { clienteId }) — pasta do cliente (documentos gerados e envios).
 *   EnviarDoc_apiEnvios(sessionId, { clienteId, situacao }) — envios recentes (Arquivo de documentos).
 * Nenhuma função devolve objeto Date (só texto).
 ****************************************************/

var ENVDOC_ABA = 'DOC_ENVIOS';
var ENVDOC_COLUNAS = ['ID', 'PEDIDO_ID', 'TENTATIVA_DE', 'ARQUIVO_ID', 'ARQUIVO_NOME', 'ANEXOS_JSON', 'DOC_TIPO', 'DOC_TITULO',
  'DOC_NUMERO', 'EQUIPAMENTO', 'DOC_DOCUMENTO_ID', 'CLIENTE_CHAVE', 'CLIENTE_ID', 'CLIENTE_NOME', 'CANAL', 'DESTINO', 'COPIA',
  'DESTINO_NOME', 'ASSUNTO', 'MENSAGEM', 'MODO', 'SITUACAO', 'MOTIVO', 'PROVEDOR_ID', 'FORA_HORARIO', 'USUARIO_ID',
  'USUARIO_NOME', 'QUANDO', 'ATUALIZADO_EM', 'CRIADO_EM'];
var ENVDOC_FUSO = 'America/Sao_Paulo';
var ENVDOC_LIMITES = { emailMb: 18, whatsMb: 15, destinosEmail: 20, destinosWhats: 8, anexosExtras: 5, historico: 200 };
var ENVDOC_PERFIS_BLOQUEADOS = { CLIENTE: 1, RH: 1 };

/**
 * Pastas raiz dos módulos (nome de alguma pasta acima do arquivo). classe: CLIENTE (documento de cliente),
 * INTERNO (sem cliente) ou BLOQUEADO (dado pessoal de colaborador). frase: parágrafo do e-mail padrão.
 */
var ENVDOC_RAIZES = [
  // 22/10/2026 (etapa 2): relatório da O.S. da Assistência técnica (pasta "4. Ordens de Serviço" do equipamento ou a pasta própria do módulo)
  { rx: /^(4\. Ordens de Serviço|Assistência técnica - Relatórios)$/i, tipo: 'Relatório de atendimento técnico', classe: 'CLIENTE', frase: 'O relatório registra o atendimento técnico realizado: condição encontrada, serviço executado, teste funcional, peças, fotos e a assinatura de quem acompanhou. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Assistência técnica - Orçamentos$/i, tipo: 'Orçamento de assistência técnica', classe: 'CLIENTE', frase: 'O orçamento tem validade indicada no documento. A execução começa depois da aprovação por escrito.' },
  { rx: /^Autoclave - Laudos$/i, tipo: 'Relatório de ensaio da autoclave', classe: 'CLIENTE', frase: 'O relatório reúne os resultados do ensaio e a conclusão técnica. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Lavadora - Laudos$/i, tipo: 'Relatório de ensaio da lavadora', classe: 'CLIENTE', frase: 'O relatório reúne os resultados do ensaio e a conclusão técnica. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Cadeia de Frio - Laudos$/i, tipo: 'Relatório de qualificação térmica', classe: 'CLIENTE', frase: 'O relatório reúne os resultados da qualificação térmica e a conclusão técnica. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Baixa Temperatura - Laudos$/i, tipo: 'Relatório de qualificação do esterilizador', classe: 'CLIENTE', frase: 'O relatório reúne os resultados da qualificação do esterilizador a baixa temperatura e a conclusão técnica. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Estufa\+?Banho-?maria - Laudos$/i, tipo: 'Relatório de qualificação térmica', classe: 'CLIENTE', frase: 'O relatório reúne os resultados da qualificação térmica e a conclusão técnica. Recomendamos arquivá-lo no prontuário do equipamento.' },
  { rx: /^Certificado de Calibracao - Documentos Gerados$/i, tipo: 'Certificado de calibração', classe: 'CLIENTE', frase: 'O certificado apresenta os resultados da calibração e a incerteza de medição. Recomendamos arquivá-lo junto à documentação do instrumento.' },
  { rx: /^Relatorio Calibracao - Documentos Gerados$/i, tipo: 'Relatório de calibração', classe: 'CLIENTE', frase: 'O relatório resume as calibrações realizadas. Os certificados de calibração prevalecem sobre este resumo.' },
  { rx: /^Laudos NR13 - Documentos Gerados$/i, tipo: 'Laudo de inspeção NR-13', classe: 'CLIENTE', frase: 'Recomendamos arquivar o laudo no prontuário do equipamento, conforme a NR-13.' },
  { rx: /^Declaracao Execucao Servico - Documentos Gerados$/i, tipo: 'Declaração de execução de serviço', classe: 'CLIENTE', frase: 'O documento registra o serviço executado e pode ser arquivado junto à documentação do equipamento.' },
  { rx: /^METROLABS_PGTPOP_SISTEMA$/i, tipo: 'PGT / POP', classe: 'CLIENTE', frase: 'O documento deve ser revisado pelo responsável técnico da unidade antes da implantação.' },
  { rx: /^METROLABS_CME_SISTEMA$/i, tipo: 'Planejamento técnico do CME', classe: 'CLIENTE', frase: 'O planejamento deve ser revisado pelo responsável técnico da unidade.' },
  { rx: /^METROLABS_CRONEXEC_SISTEMA$/i, tipo: 'Cronograma de execução', classe: 'CLIENTE', frase: 'As datas podem ser ajustadas em comum acordo com a equipe da unidade.' },
  { rx: /^METROLABS_REGOP_SISTEMA$/i, tipo: 'Registro operacional', classe: 'CLIENTE', frase: 'Recomendamos arquivar o registro junto à documentação da unidade.' },
  // 21/10/2026: Comercial nativo (SGO_Comercial_Propostas.js): proposta ao cliente; o relatório mensal é interno.
  { rx: /^Comercial - Propostas$/i, tipo: 'Proposta comercial', classe: 'CLIENTE', frase: 'A proposta apresenta o escopo, os valores e as condições comerciais. Para aprovar, basta responder a este e-mail confirmando o aceite ou enviar o pedido de compra.' },
  { rx: /^Comercial - Relat/i, tipo: 'Relatório do Comercial', classe: 'INTERNO' },
  // 21/10/2026: Compras nativo (SGO_Compras_Pedido.js): pedido de compra ao fornecedor; o relatório mensal é interno.
  { rx: /^Compras - Pedidos de compra$/i, tipo: 'Pedido de compra', classe: 'FORNECEDOR', frase: 'Pedimos a confirmação do recebimento deste pedido e da data de entrega. Favor citar o número do pedido na nota fiscal.' },
  { rx: /^Compras - Relat/i, tipo: 'Relatório de compras', classe: 'INTERNO' },
  { rx: /^Inventario de Equipamentos - Documentos Gerados$/i, tipo: 'Inventário de equipamentos', classe: 'CLIENTE', frase: 'O inventário lista os equipamentos levantados e a análise da situação de cada um.' },
  { rx: /^Programa de conduta - Relat/i, tipo: 'Relatório do Programa de conduta', classe: 'BLOQUEADO' },
  { rx: /^Conduta - Fotos/i, tipo: 'Foto de ocorrência do Programa de conduta', classe: 'BLOQUEADO' },
  { rx: /^Gest[aã]o - Relat/i, tipo: 'Relatório de avaliação da gestão', classe: 'BLOQUEADO' },
  { rx: /^CERTCAL Snapshots Privados$/i, tipo: 'Cópia privada do certificado', classe: 'BLOQUEADO' },
  { rx: /^Frota - /i, tipo: 'Relatório da frota', classe: 'INTERNO' },
  { rx: /^Painel de qualidade - Relat/i, tipo: 'Relatório de gestão da qualidade', classe: 'INTERNO' },
  { rx: /^Auvo - Relat/i, tipo: 'Relatório de atendimentos', classe: 'INTERNO' },
  { rx: /^(Relatorios gerenciais dos padroes|Padroes de Referencia|SGO\+ .* padr)/i, tipo: 'Documento dos padrões de referência', classe: 'INTERNO' }
];

/* ============================================================ utilidades */

function EnviarDoc_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function EnviarDoc_agoraIso_() { return Utilities.formatDate(new Date(), ENVDOC_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function EnviarDoc_dataBr_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : EnviarDoc_s_(iso);
}
/** Sem acento, minúsculo, só letras e números (para comparar nomes de pasta com nomes de cliente). */
function EnviarDoc_norm_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function EnviarDoc_digitos_(s) { return String(s || '').replace(/\D/g, ''); }
function EnviarDoc_emailOk_(e) { return /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(String(e || '').trim()); }
function EnviarDoc_esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** "MARIA DA SILVA" -> "Maria". */
function EnviarDoc_primeiroNome_(nome) {
  var p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
}
/** "(62) 99999-0001" para mostrar; vazio se não der. */
function EnviarDoc_foneBr_(f) {
  var d = EnviarDoc_digitos_(f).replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return d;
}
function EnviarDoc_celular_(f) {
  if (typeof SGO_zapiCelular_ === 'function') return SGO_zapiCelular_(f);
  var d = EnviarDoc_digitos_(f).replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return /^55[1-9][1-9](9\d{8}|[6-9]\d{7})$/.test(d) ? d : '';
}
/** ID de arquivo a partir de um link do sistema (servidor /arquivos/<id>) ou do Drive. */
function EnviarDoc_idDeLink_(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = /\/arquivos\/([A-Za-z0-9_-]{6,})/.exec(s) || /\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(s) ||
    /\/document\/d\/([A-Za-z0-9_-]{10,})/.exec(s) || /[?&]id=([A-Za-z0-9_-]{10,})/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(s) ? s : '';
}
function EnviarDoc_ehPdf_(nome, mime) { return /pdf/i.test(String(mime || '')) || /\.pdf$/i.test(String(nome || '')); }
function EnviarDoc_ehHtml_(nome, mime) { return /html/i.test(String(mime || '')) || /\.html?$/i.test(String(nome || '')); }
function EnviarDoc_semExt_(nome) { return String(nome || '').replace(/\.(pdf|html?)$/i, ''); }

/** Título legível a partir do nome do arquivo: tira a extensão e o carimbo "aaaa-MM-dd HHmm" do fim. */
function EnviarDoc_tituloDoNome_(nome) {
  return EnviarDoc_semExt_(nome).replace(/\s*-\s*\d{4}-\d{2}-\d{2}(\s+\d{4,6})?\s*$/, '').replace(/\s*-\s*sem-tag\s*$/i, '').replace(/\s+/g, ' ').trim();
}

function EnviarDoc_garantirAba_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('ENVDOC_ABA_OK_V1')) return; } catch (e) { cache = null; }
  CertCal_garantirTabela_(ENVDOC_ABA, ENVDOC_COLUNAS);
  ENVDOC_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(ENVDOC_ABA, c); });
  ['DESTINO', 'COPIA', 'QUANDO', 'ATUALIZADO_EM', 'DOC_NUMERO', 'PEDIDO_ID'].forEach(function (c) { CertCal_forcarColunaTexto_(ENVDOC_ABA, c); });
  if (cache) try { cache.put('ENVDOC_ABA_OK_V1', '1', 21600); } catch (e) {}
}

function EnviarDoc_linhas_() {
  EnviarDoc_garantirAba_();
  try { return SGO_DATA.getAll(ENVDOC_ABA) || []; } catch (e) { return []; }
}

/** Sessão de quem envia. Cliente e RH não enviam (o documento é da Metrolabs para o cliente). */
function EnviarDoc_sessao_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (ENVDOC_PERFIS_BLOQUEADOS[perfil]) {
    throw new Error('Este acesso não envia documentos. O envio de documentos ao cliente é feito pela equipe da Metrolabs (técnico, metrologia, comercial ou gestão). Se você precisa de um documento, fale com a Metrolabs pelo contato de sempre.');
  }
  var eu = { id: EnviarDoc_s_(s.userId), usuario: EnviarDoc_s_(s.usuario), nome: EnviarDoc_s_(s.nome) || EnviarDoc_s_(s.usuario), perfil: perfil, email: '' };
  try {
    var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, eu.id);
    if (u) { eu.email = SGO_UTILS.safeLower(u.EMAIL).trim(); if (!eu.nome) eu.nome = EnviarDoc_s_(u.NOME); }
  } catch (e) {}
  if (!EnviarDoc_emailOk_(eu.email)) eu.email = '';
  return eu;
}

function EnviarDoc_responder_(fn) {
  try { return JSON.parse(JSON.stringify(fn())); }
  catch (e) {
    var msg = String((e && e.message) || e || '').trim();
    return { ok: false, message: msg || 'Não foi possível concluir. Tente de novo; se repetir, avise o administrador.' };
  }
}

/* ============================================================ documento e cliente */

/** Metadados do arquivo (lança erro claro se não existir). */
function EnviarDoc_arquivo_(id) {
  var limpo = EnviarDoc_idDeLink_(id);
  if (!limpo) throw new Error('O documento não foi informado. Feche esta janela, gere ou abra o documento de novo e toque em "Enviar".');
  var f;
  try { f = DriveApp.getFileById(limpo); } catch (e) {
    throw new Error('O arquivo do documento não foi encontrado (pode ter sido apagado ou movido). Gere o documento de novo pela tela do módulo e toque em "Enviar" depois de salvo.');
  }
  var pastas = [], pai = null;
  try { var it = f.getParents(); if (it.hasNext()) pai = it.next(); } catch (e) { pai = null; }
  var atual = pai;
  for (var i = 0; atual && i < 8; i++) {
    var desc = '';
    try { desc = EnviarDoc_s_(atual.getDescription()); } catch (e) {}
    pastas.push({ id: atual.getId(), nome: EnviarDoc_s_(atual.getName()), descricao: desc });
    try { var it2 = atual.getParents(); atual = it2.hasNext() ? it2.next() : null; } catch (e) { atual = null; }
  }
  var criado = '';
  try { criado = Utilities.formatDate(f.getDateCreated(), ENVDOC_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) {}
  return {
    id: f.getId(), nome: EnviarDoc_s_(f.getName()), mime: EnviarDoc_s_(f.getMimeType()), tamanho: Number(f.getSize()) || 0,
    url: EnviarDoc_s_(f.getUrl()), criadoEm: criado, pastaId: pai ? pai.getId() : '', pastas: pastas, _arquivo: f, _pasta: pai
  };
}

/** Raiz do módulo pela cadeia de pastas. */
function EnviarDoc_raiz_(pastas) {
  for (var i = 0; i < pastas.length; i++) {
    for (var j = 0; j < ENVDOC_RAIZES.length; j++) if (ENVDOC_RAIZES[j].rx.test(pastas[i].nome)) return ENVDOC_RAIZES[j];
  }
  return null;
}

function EnviarDoc_clientes_() {
  try { return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || []; } catch (e) { return []; }
}
function EnviarDoc_unidades_() {
  try { return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES) || []; } catch (e) { return []; }
}
function EnviarDoc_nomeCliente_(c) { return EnviarDoc_s_(c && (c.NOME_FANTASIA || c.RAZAO_SOCIAL)) || EnviarDoc_s_(c && c.RAZAO_SOCIAL); }
function EnviarDoc_infoCliente_(c, origem) {
  return { chave: 'CLI:' + EnviarDoc_s_(c.ID), id: EnviarDoc_s_(c.ID), nome: EnviarDoc_nomeCliente_(c), razao: EnviarDoc_s_(c.RAZAO_SOCIAL), cnpj: EnviarDoc_digitos_(c.CNPJ), origem: origem };
}

/** Cliente pelo nome de uma pasta (14 dígitos = CNPJ; senão o nome do cliente, que precisa ser único). */
function EnviarDoc_clienteDaPasta_(pasta, clientes, unidades) {
  var nome = pasta.nome, dig = EnviarDoc_digitos_(nome);
  if (/^\d{14}$/.test(nome.trim())) {
    var c = clientes.filter(function (x) { return EnviarDoc_digitos_(x.CNPJ) === dig; })[0];
    if (c) return EnviarDoc_infoCliente_(c, 'pasta do cliente (CNPJ)');
    var u = unidades.filter(function (x) { return EnviarDoc_digitos_(x.CNPJ_UNIDADE) === dig; })[0];
    if (u) {
      var cu = clientes.filter(function (x) { return String(x.ID) === String(u.CLIENTE_ID); })[0];
      if (cu) { var info = EnviarDoc_infoCliente_(cu, 'pasta da unidade (CNPJ)'); info.unidadeId = EnviarDoc_s_(u.ID); return info; }
    }
    return { chave: 'CNPJ:' + dig, id: '', nome: pasta.descricao || ('CNPJ ' + dig), razao: pasta.descricao || '', cnpj: dig, origem: 'pasta do cliente (CNPJ sem cadastro)' };
  }
  var n = EnviarDoc_norm_(nome);
  if (!n || n.length < 3) return null;
  var achados = clientes.filter(function (x) {
    var a = EnviarDoc_norm_(typeof SGO_DocSalvar_sanitizarNome_ === 'function' ? SGO_DocSalvar_sanitizarNome_(x.RAZAO_SOCIAL) : x.RAZAO_SOCIAL);
    var b = EnviarDoc_norm_(typeof SGO_DocSalvar_sanitizarNome_ === 'function' ? SGO_DocSalvar_sanitizarNome_(x.NOME_FANTASIA) : x.NOME_FANTASIA);
    return (a && a === n) || (b && b === n);
  });
  if (achados.length === 1) return EnviarDoc_infoCliente_(achados[0], 'pasta do cliente (nome)');
  return null;
}

/** Registro do Arquivo de documentos que aponta para este arquivo. */
function EnviarDoc_registroArquivo_(arquivoId, docDocumentoId) {
  var abas = SGO_CFG.SHEETS.DOC_DOCUMENTOS || 'DOC_DOCUMENTOS', lista = [];
  try { lista = SGO_DATA.getAll(abas) || []; } catch (e) { return null; }
  if (docDocumentoId) {
    var porId = lista.filter(function (d) { return String(d.ID) === String(docDocumentoId); })[0];
    if (porId && EnviarDoc_idDeLink_(porId.LINK_ARQUIVO) === arquivoId) return porId;
  }
  return lista.filter(function (d) { return d.LINK_ARQUIVO && EnviarDoc_idDeLink_(d.LINK_ARQUIVO) === arquivoId; })[0] || null;
}

/**
 * Tudo o que se sabe do documento: arquivo, tipo, classe e cliente. dica = { clienteId, numero, equipamento, titulo }
 * (da tela). A dica de cliente só vale quando o arquivo não diz o cliente E o nome do arquivo cita esse cliente.
 */
function EnviarDoc_documento_(arquivoId, dica) {
  dica = dica || {};
  var arq = EnviarDoc_arquivo_(arquivoId);
  var raiz = EnviarDoc_raiz_(arq.pastas);
  var clientes = EnviarDoc_clientes_(), unidades = EnviarDoc_unidades_();
  var cliente = null, docReg = EnviarDoc_registroArquivo_(arq.id, dica.docDocumentoId), equipamento = EnviarDoc_s_(dica.equipamento);
  if (docReg && docReg.CLIENTE_ID) {
    var cReg = clientes.filter(function (x) { return String(x.ID) === String(docReg.CLIENTE_ID); })[0];
    if (cReg) { cliente = EnviarDoc_infoCliente_(cReg, 'Arquivo de documentos'); cliente.unidadeId = EnviarDoc_s_(docReg.UNIDADE_ID); }
    if (!equipamento && docReg.EQUIPAMENTO_ID) {
      try { var eq = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, docReg.EQUIPAMENTO_ID); if (eq) equipamento = [eq.TIPO, eq.TAG].filter(Boolean).join(' · '); } catch (e) {}
    }
  }
  if (!cliente) {
    for (var i = 0; i < arq.pastas.length && !cliente; i++) cliente = EnviarDoc_clienteDaPasta_(arq.pastas[i], clientes, unidades);
  }
  var avisoDica = '';
  if (dica.clienteId) {
    if (cliente && cliente.id && String(cliente.id) !== String(dica.clienteId)) {
      avisoDica = 'A tela indicou outro cliente, mas o arquivo está gravado para ' + cliente.nome + '. Valem os contatos de ' + cliente.nome + '.';
      try { SGO_DATA.log('ENVDOC_CLIENTE_DIVERGENTE', '', 'Arquivo ' + arq.id + ': tela indicou ' + dica.clienteId + ', arquivo é de ' + cliente.id, 'DOCUMENTOS'); } catch (e) {}
    } else if (!cliente) {
      var cd = clientes.filter(function (x) { return String(x.ID) === String(dica.clienteId); })[0];
      var nomeArq = EnviarDoc_norm_(arq.nome);
      if (cd && ((EnviarDoc_digitos_(cd.CNPJ).length === 14 && EnviarDoc_digitos_(arq.nome).indexOf(EnviarDoc_digitos_(cd.CNPJ)) >= 0) ||
          [cd.RAZAO_SOCIAL, cd.NOME_FANTASIA].some(function (n) { var x = EnviarDoc_norm_(n); return x.length >= 4 && nomeArq.indexOf(x) >= 0; }))) {
        cliente = EnviarDoc_infoCliente_(cd, 'nome do arquivo');
      }
    }
  }
  var classe = raiz ? raiz.classe : (cliente ? 'CLIENTE' : 'INTERNO');
  if (classe === 'INTERNO' && cliente) classe = 'CLIENTE';
  if (docReg) classe = 'CLIENTE';
  var titulo = EnviarDoc_s_(dica.titulo) || EnviarDoc_tituloDoNome_(arq.nome);
  var tipo = raiz ? raiz.tipo : (docReg ? (EnviarDoc_s_(docReg.TIPO_DOCUMENTO).replace(/^\s*\d+\.\s*/, '') || 'Documento') : 'Documento');
  var frase = raiz && raiz.frase ? raiz.frase : '';
  // 21/10/2026: relatório de qualificação (modelo novo) gravado na pasta "Laudos" do módulo: o assunto e o texto falam de
  // qualificação, não de "relatório de ensaio" (autoclave e lavadora usam a mesma pasta para os dois documentos).
  if (raiz && raiz.classe === 'CLIENTE' && /^relat[oó]rio de qualifica/i.test(arq.nome) && /^Relatório de ensaio/.test(tipo)) {
    tipo = tipo.replace(/^Relatório de ensaio/, 'Relatório de qualificação');
    frase = 'O relatório reúne as etapas da qualificação, os resultados e a conclusão técnica, com a validade quando aprovado. Recomendamos arquivá-lo no prontuário do equipamento.';
  }
  return {
    arquivo: arq, raiz: raiz, classe: classe, cliente: cliente, docReg: docReg, tipo: tipo, titulo: titulo,
    numero: EnviarDoc_s_(dica.numero), equipamento: equipamento, avisoDica: avisoDica,
    frase: frase
  };
}

/** HTML gravado ao lado do PDF (mesmo nome, .html), se houver. */
function EnviarDoc_htmlIrmao_(doc, htmlId) {
  if (htmlId) {
    try {
      var h = EnviarDoc_arquivo_(htmlId);
      if (EnviarDoc_ehHtml_(h.nome, h.mime) && h.pastaId === doc.arquivo.pastaId) return h;
    } catch (e) {}
  }
  if (!doc.arquivo._pasta) return null;
  try {
    var it = doc.arquivo._pasta.getFilesByName(EnviarDoc_semExt_(doc.arquivo.nome) + '.html');
    if (it.hasNext()) { var f = it.next(); return { id: f.getId(), nome: EnviarDoc_s_(f.getName()), mime: EnviarDoc_s_(f.getMimeType()), tamanho: Number(f.getSize()) || 0, _arquivo: f }; }
  } catch (e) {}
  return null;
}

/** Bloqueio por dado pessoal: mensagem completa (o quê, por quê, o que fazer). */
function EnviarDoc_textoBloqueado_(doc) {
  return 'Este documento (' + doc.tipo + ') tem dados pessoais de colaboradores e não é enviado por e-mail nem por WhatsApp pelo sistema. ' +
    'Por quê: proteção de dados pessoais (LGPD); o documento fica só no SGO+ para quem tem acesso. ' +
    'O que fazer: se a pessoa precisa do documento, entregue-o pessoalmente ou peça orientação à Diretoria.';
}

/* ============================================================ destinatários */

/** Contatos do cliente: cadastro, unidades, acessos do portal do cliente e quem já recebeu documento deste cliente. */
function EnviarDoc_contatosCliente_(cliente) {
  var lista = [], vistos = {};
  function add(nome, email, fone, origem) {
    email = SGO_UTILS.safeLower(email).trim();
    if (!EnviarDoc_emailOk_(email)) email = '';
    var cel = EnviarDoc_celular_(fone), foneTxt = EnviarDoc_foneBr_(fone);
    if (!email && !EnviarDoc_digitos_(fone)) return;
    var chave = (email || '-') + '|' + (cel || EnviarDoc_digitos_(fone) || '-');
    if (vistos[chave]) return;
    // mesmo e-mail já listado: completa o celular em vez de repetir a pessoa
    var mesmo = email ? lista.filter(function (x) { return x.email === email; })[0] : null;
    if (mesmo && !mesmo.celular && cel) { mesmo.celular = cel; mesmo.telefone = foneTxt; mesmo.whatsOk = true; vistos[chave] = 1; return; }
    if (mesmo && (!cel || mesmo.celular === cel)) return;
    vistos[chave] = 1;
    lista.push({ ref: 'c' + lista.length, nome: EnviarDoc_s_(nome), email: email, celular: cel, telefone: foneTxt, whatsOk: !!cel,
      notaFone: !cel && EnviarDoc_digitos_(fone) ? 'telefone fixo ou incompleto: não recebe WhatsApp' : '', origem: origem });
  }
  if (!cliente) return lista;
  if (cliente.id) {
    var c = null;
    try { c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, cliente.id); } catch (e) {}
    if (c) add(c.CONTATO || EnviarDoc_nomeCliente_(c), c.EMAIL, c.TELEFONE, 'Cadastro do cliente');
    EnviarDoc_unidades_().filter(function (u) { return String(u.CLIENTE_ID) === String(cliente.id) && SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO'; })
      .forEach(function (u) { add(u.RESPONSAVEL || u.NOME_UNIDADE, u.EMAIL, u.TELEFONE || u.CELULAR, 'Unidade ' + EnviarDoc_s_(u.NOME_UNIDADE)); });
    // 21/10/2026: contatos do cliente e das unidades (CAD_CONTATOS, Comercial), ativos e com o cargo.
    try {
      SGO_DATA.getAll('CAD_CONTATOS').filter(function (k) { return String(k.CLIENTE_ID) === String(cliente.id) && SGO_UTILS.safeUpper(k.STATUS || 'ATIVO') === 'ATIVO'; })
        .forEach(function (k) { add(k.NOME, k.EMAIL, k.CELULAR || k.TELEFONE, 'Contato do cliente' + (EnviarDoc_s_(k.CARGO) ? ' (' + EnviarDoc_s_(k.CARGO) + ')' : '')); });
    } catch (e) {}
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
        return SGO_UTILS.safeUpper(u.PERFIL) === 'CLIENTE' && String(u.CLIENTE_ID) === String(cliente.id) && SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO';
      }).forEach(function (u) { add(u.NOME || u.USUARIO, u.EMAIL, u.CELULAR || u.WHATSAPP || u.TELEFONE, 'Acesso do cliente ao SGO+'); });
    } catch (e) {}
  }
  // quem já recebeu documento deste mesmo cliente (com sucesso)
  EnviarDoc_linhas_().filter(function (r) { return r.CLIENTE_CHAVE === cliente.chave && r.SITUACAO === 'ENVIADO'; })
    .sort(function (a, b) { return String(b.QUANDO).localeCompare(String(a.QUANDO)); }).slice(0, 40)
    .forEach(function (r) {
      if (r.CANAL === 'EMAIL') String(r.DESTINO || '').split(/[;,]\s*/).forEach(function (e) { add(r.DESTINO_NOME && r.DESTINO.indexOf(';') < 0 ? r.DESTINO_NOME : '', e, '', 'Já recebeu documento deste cliente'); });
      else if (r.CANAL === 'WHATSAPP') add(r.DESTINO_NOME, '', r.DESTINO, 'Já recebeu documento deste cliente');
    });
  return lista;
}

/** Equipe interna (para documento interno): só nome e se tem e-mail/celular — o telefone não vai para a tela. */
function EnviarDoc_equipe_() {
  try {
    return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
      var p = SGO_UTILS.safeUpper(u.PERFIL);
      return p && p !== 'CLIENTE' && SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO';
    }).map(function (u) {
      return { usuarioId: EnviarDoc_s_(u.ID), nome: EnviarDoc_s_(u.NOME) || EnviarDoc_s_(u.USUARIO),
        temEmail: EnviarDoc_emailOk_(u.EMAIL), temCelular: !!EnviarDoc_celular_(u.CELULAR || u.WHATSAPP || u.TELEFONE) };
    }).filter(function (u) { return u.temEmail || u.temCelular; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  } catch (e) { return []; }
}

/* ============================================================ textos padrão */

function EnviarDoc_textos_(doc, eu) {
  var cli = doc.cliente ? doc.cliente.nome : '';
  var ident = doc.titulo + (doc.numero && doc.titulo.indexOf(doc.numero) < 0 ? ' (nº ' + doc.numero + ')' : '');
  var sobre = (cli ? ' de ' + cli : '') + (doc.equipamento && ident.indexOf(doc.equipamento) < 0 ? ', equipamento ' + doc.equipamento : '');
  // o tipo só entra no assunto quando o título não começa por ele (nem pelas três primeiras palavras: "Relatório de qualificação ...")
  var inicioTipo = String(doc.tipo || '').toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  var tituloJaDiz = doc.titulo.toLowerCase().indexOf(String(doc.tipo || '').toLowerCase()) === 0 || (inicioTipo.split(' ').length === 3 && doc.titulo.toLowerCase().indexOf(inicioTipo) === 0);
  var assunto = (doc.tipo && !tituloJaDiz ? doc.tipo + ': ' : '') + ident + (cli ? ' | ' + cli : '');
  var email = 'Prezados(as),\n\n' +
    'Encaminhamos em anexo o documento "' + ident + '"' + sobre + ', emitido pela Metrolabs.\n\n' +
    (doc.frase ? doc.frase + '\n\n' : '') +
    'Em caso de dúvida, estamos à disposição.\n\n' +
    'Atenciosamente,\n' + (eu.nome || 'Equipe Metrolabs') + '\nMetrolabs';
  var whats = 'Olá, {nome}.\n\n' +
    'Segue o documento "' + ident + '"' + sobre + ', emitido pela Metrolabs.\n\n' +
    'Em caso de dúvida, responda esta mensagem.\n\n' + (eu.nome ? EnviarDoc_primeiroNome_(eu.nome) + ' | ' : '') + 'Metrolabs';
  return { assunto: assunto.slice(0, 180), email: email, whatsapp: whats };
}

/** "{nome}" vira o primeiro nome; sem nome, a saudação fica sem ele. */
function EnviarDoc_aplicarNome_(texto, nome) {
  var p = EnviarDoc_primeiroNome_(nome);
  var t = String(texto || '');
  return p ? t.replace(/\{nome\}/g, p) : t.replace(/,?\s*\{nome\}/g, '').replace(/\{nome\}/g, '');
}

function EnviarDoc_htmlEmail_(texto, eu, anexos, modo) {
  var corpo = String(texto || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map(function (p) {
    // 22/10/2026: endereço https vira link clicável (link de aceite do orçamento da Assistência e qualquer outro digitado)
    return '<p style="margin:0 0 12px">' + EnviarDoc_esc_(p).replace(/\n/g, '<br>').replace(/https:\/\/[^\s<"']+/g, function (u) { return '<a href="' + u + '" style="color:#1F6B2A;font-weight:bold">' + u + '</a>'; }) + '</p>';
  }).join('');
  var lista = (anexos || []).map(function (a) { return '<li>' + EnviarDoc_esc_(a.nome) + '</li>'; }).join('');
  var rodape = modo === 'SISTEMA'
    ? 'E-mail enviado pelo SGO+ da Metrolabs em nome de ' + EnviarDoc_esc_(eu.nome || 'Metrolabs') + '.' + (eu.email ? ' Para responder, use a opção Responder: a resposta vai para ' + EnviarDoc_esc_(eu.email) + '.' : '')
    : 'E-mail enviado pelo SGO+ da Metrolabs.';
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2a24;max-width:640px">' +
    corpo +
    (lista ? '<div style="margin:16px 0 12px;padding:10px 12px;border:1px solid #d5ddd8;border-radius:4px;background:#f7f9f8"><div style="font-weight:bold;margin:0 0 4px">Anexos</div><ul style="margin:0;padding-left:18px">' + lista + '</ul></div>' : '') +
    '<div style="border-top:1px solid #d5ddd8;padding-top:8px;margin-top:16px;font-size:12px;color:#5b6b63">' + rodape + '</div></div>';
}

/** Fora do horário comercial? { fora, texto }. */
function EnviarDoc_horario_() {
  try {
    if (typeof SGO_dentroDoExpediente_ === 'function') {
      var r = SGO_dentroDoExpediente_(new Date());
      if (r && r.dentro === false) return { fora: true, texto: 'Agora está fora do horário comercial (' + r.motivo + '). O envio continua liberado, mas o cliente pode só ver a mensagem no próximo dia útil. Se preferir, envie no horário comercial.' };
      return { fora: false, texto: '' };
    }
  } catch (e) {}
  var h = Utilities.formatDate(new Date(), ENVDOC_FUSO, 'yyyy-MM-dd HH:mm').split(' '), ymd = h[0].split('-');
  var semana = new Date(Number(ymd[0]), Number(ymd[1]) - 1, Number(ymd[2])).getDay(), hora = h[1];
  if (semana === 0 || semana === 6 || hora < '08:00' || hora >= '18:00') return { fora: true, texto: 'Agora está fora do horário comercial (segunda a sexta, 08:00 às 18:00). O envio continua liberado, mas o cliente pode só ver a mensagem no próximo dia útil.' };
  return { fora: false, texto: '' };
}

/** Situação dos canais para a tela. */
function EnviarDoc_canais_(eu) {
  var integrado = typeof SGO_Email_enviarComoUsuario_ === 'function';
  var email = {
    ok: true, modo: integrado ? 'USUARIO' : 'SISTEMA',
    texto: integrado
      ? 'Sai pelo seu e-mail (e-mail integrado do SGO+); se a sua caixa não estiver ligada, sai pela caixa do sistema com resposta para você.'
      : 'Sai pela caixa de e-mail do sistema da Metrolabs' + (eu.email ? ', com "responder para" ' + eu.email + ': a resposta do cliente chega para você.' : '. Seu cadastro não tem e-mail: a resposta do cliente vai para a caixa do sistema. Para receber as respostas, peça ao administrador para preencher o seu e-mail em Usuários.')
  };
  var whats = { ok: false, texto: '' };
  var cred = typeof Notificar_credenciaisZapi_ === 'function' ? Notificar_credenciaisZapi_() : {};
  var zapiOk = !!(cred && cred.instancia && cred.token && cred.clientToken);
  // 22/10/2026: o WhatsApp só é oferecido quando o envio pode sair de verdade. Com o piloto do WhatsApp ligado (ou o provedor
  // oficial escolhido) a Z-API está fora do sistema e o número oficial ainda não envia documentos: antes a janela mostrava a
  // opção e o envio falhava em silêncio.
  var zapiFora = typeof SGO_waZapiFora_ === 'function' && SGO_waZapiFora_();
  if (zapiFora) whats = { ok: false, motivo: 'PILOTO', texto: 'WhatsApp indisponível para documentos. Por quê: o piloto do WhatsApp oficial está ligado, a Z-API (que mandava o PDF) saiu do sistema e o número oficial ainda não envia documentos (só avisos por modelo aprovado). O que fazer: envie por e-mail; quando o envio de documentos pelo número oficial for ligado, a opção volta aqui sozinha.' };
  else if (zapiOk) whats = { ok: true, texto: 'Sai pelo WhatsApp da empresa, com o documento anexado (não vai link). Há um intervalo de alguns segundos entre as mensagens para proteger o número da empresa.' };
  else whats = { ok: false, motivo: 'SEM_CHAVES', texto: 'O WhatsApp da empresa para envio de documentos (Z-API) não está configurado. O que fazer: o responsável pelo sistema grava as 3 chaves da Z-API em Administração > Chaves e senhas. Depois volte aqui e envie de novo. Enquanto isso, use o e-mail.' };
  return { email: email, whatsapp: whats };
}

/* ============================================================ API: conferir, preparar */

/** Depois de gerar: dos links devolvidos pelo módulo, qual é o documento (PDF; senão HTML). Nunca lança. */
function EnviarDoc_apiConferir(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    var eu = EnviarDoc_sessao_(sessionId);
    var ids = ((payload && payload.ids) || []).map(EnviarDoc_idDeLink_).filter(Boolean).slice(0, 4);
    var vistos = {}, pdf = null, html = null;
    ids.forEach(function (id) {
      if (vistos[id]) return; vistos[id] = 1;
      try {
        var a = EnviarDoc_arquivo_(id);
        if (!pdf && EnviarDoc_ehPdf_(a.nome, a.mime)) pdf = a;
        else if (!html && EnviarDoc_ehHtml_(a.nome, a.mime)) html = a;
      } catch (e) {}
    });
    var principal = pdf || html;
    if (!principal) return { ok: true, documento: null };
    var doc = EnviarDoc_documento_(principal.id, payload && payload.dica);
    if (doc.classe === 'BLOQUEADO') return { ok: true, documento: null, bloqueado: true };
    return { ok: true, documento: { arquivoId: principal.id, htmlId: pdf && html ? html.id : '', nome: principal.nome, titulo: doc.titulo,
      tipo: doc.tipo, classe: doc.classe, cliente: doc.cliente ? doc.cliente.nome : '' }, eu: eu.nome };
  });
}

/**
 * Dados da janela "Enviar documento". payload = { arquivoId, htmlId, docDocumentoId, dica: { clienteId, numero, equipamento, titulo } }.
 */
function EnviarDoc_apiPreparar(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    payload = payload || {};
    var eu = EnviarDoc_sessao_(sessionId);
    var dica = Object.assign({}, payload.dica || {}, { docDocumentoId: payload.docDocumentoId });
    var doc = EnviarDoc_documento_(payload.arquivoId, dica);
    var arq = doc.arquivo;
    var base = {
      ok: true,
      documento: { arquivoId: arq.id, nome: arq.nome, titulo: doc.titulo, tipo: doc.tipo, classe: doc.classe, numero: doc.numero,
        equipamento: doc.equipamento, criadoEm: EnviarDoc_dataBr_(arq.criadoEm), tamanhoKb: Math.ceil(arq.tamanho / 1024), url: arq.url,
        ehPdf: EnviarDoc_ehPdf_(arq.nome, arq.mime), docDocumentoId: doc.docReg ? EnviarDoc_s_(doc.docReg.ID) : '' },
      cliente: doc.cliente ? { id: doc.cliente.id, nome: doc.cliente.nome, cnpj: doc.cliente.cnpj, origem: doc.cliente.origem } : null,
      eu: { nome: eu.nome, email: eu.email }
    };
    if (doc.classe === 'BLOQUEADO') { base.bloqueado = true; base.motivoBloqueio = EnviarDoc_textoBloqueado_(doc); return base; }
    var html = EnviarDoc_htmlIrmao_(doc, payload.htmlId);
    base.documento.html = html ? { id: html.id, nome: html.nome, tamanhoKb: Math.ceil(html.tamanho / 1024) } : null;
    base.avisos = [];
    if (doc.avisoDica) base.avisos.push(doc.avisoDica);
    if (doc.classe === 'INTERNO') base.avisos.push('Documento interno (não está na pasta de um cliente). Confira se ele pode sair da Metrolabs antes de enviar; escolha as pessoas da equipe ou digite o destinatário.');
    else if (!doc.cliente && doc.classe !== 'FORNECEDOR') base.avisos.push('Não foi possível saber de qual cliente é este documento pela pasta em que ele foi gravado. Digite o destinatário e confira o documento antes de enviar.');
    if (arq.tamanho > ENVDOC_LIMITES.whatsMb * 1048576) base.avisos.push('O arquivo tem ' + Math.ceil(arq.tamanho / 1048576) + ' MB: acima do limite do WhatsApp (' + ENVDOC_LIMITES.whatsMb + ' MB). Envie por e-mail.');
    base.contatos = EnviarDoc_contatosCliente_(doc.cliente);
    // 21/10/2026: pedido de compra: o fornecedor do pedido é o destinatário sugerido (Compras > Fornecedores).
    if (doc.classe === 'FORNECEDOR') { base.contatos = typeof Compras_contatosEnvio_ === 'function' ? Compras_contatosEnvio_(arq.id) : []; base.avisos.push('Pedido de compra ao fornecedor: confira o e-mail para pedidos antes de enviar. Sem e-mail no cadastro, digite o endereço.'); }
    base.equipe = doc.classe === 'INTERNO' || !doc.cliente ? EnviarDoc_equipe_() : [];
    base.textos = EnviarDoc_textos_(doc, eu);
    base.canais = EnviarDoc_canais_(eu);
    base.horario = EnviarDoc_horario_();
    base.outrosArquivos = EnviarDoc_outrosDoCliente_(doc, html);
    base.historico = EnviarDoc_historicoDe_(function (r) { return r.ARQUIVO_ID === arq.id; }, 30);
    base.limites = ENVDOC_LIMITES;
    return base;
  });
}

/** Outros documentos da MESMA pasta do cliente (PDF), para anexar junto. */
function EnviarDoc_outrosDoCliente_(doc, html) {
  if (doc.classe !== 'CLIENTE' || !doc.cliente || !doc.arquivo._pasta) return [];
  var saida = [];
  try {
    var it = doc.arquivo._pasta.getFiles(), n = 0;
    while (it.hasNext() && n < 200) {
      n++;
      var f = it.next(), id = f.getId(), nome = EnviarDoc_s_(f.getName());
      if (id === doc.arquivo.id || (html && id === html.id)) continue;
      if (!EnviarDoc_ehPdf_(nome, f.getMimeType())) continue;
      var quando = '';
      try { quando = Utilities.formatDate(f.getDateCreated(), ENVDOC_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) {}
      saida.push({ id: id, nome: nome, quando: quando, quandoBr: EnviarDoc_dataBr_(quando), tamanhoKb: Math.ceil((Number(f.getSize()) || 0) / 1024) });
    }
  } catch (e) {}
  return saida.sort(function (a, b) { return String(b.quando).localeCompare(String(a.quando)); }).slice(0, 30);
}

/* ============================================================ envio */

function EnviarDoc_blob_(arq) {
  var f = arq._arquivo || DriveApp.getFileById(arq.id);
  var b = f.getBlob();
  try { if (!b.getName()) b.setName(arq.nome); } catch (e) {}
  return b;
}

/** E-mail: integrado (pessoal) se existir; senão a caixa do sistema com responder-para o usuário. */
function EnviarDoc_enviarEmail_(eu, para, cc, assunto, texto, anexos) {
  var blobs = anexos.map(function (a) { return a.blob; });
  if (typeof SGO_Email_enviarComoUsuario_ === 'function') {
    var r = null;
    try {
      r = SGO_Email_enviarComoUsuario_({ usuarioId: eu.id, para: para.join(', '), cc: cc.join(', '), assunto: assunto, html: EnviarDoc_htmlEmail_(texto, eu, anexos, 'USUARIO'), anexos: blobs });
    } catch (e) { return { ok: false, modo: 'USUARIO', motivo: 'O seu e-mail integrado recusou o envio: ' + String((e && e.message) || e).slice(0, 300) }; }
    if (r && (r.semCaixa || r.codigo === 'SEM_CAIXA')) {
      // sem caixa pessoal ligada: segue pela caixa do sistema
    } else if (r && r.ok === false) {
      return { ok: false, modo: 'USUARIO', motivo: String(r.motivo || r.message || 'o e-mail integrado não aceitou o envio') };
    } else {
      // via: 'pessoal' (caixa da pessoa) ou 'sistema' (a própria função já caiu na caixa do sistema com responder-para)
      return { ok: true, modo: r && r.via === 'sistema' ? 'SISTEMA' : 'USUARIO', id: r && (r.id || r.messageId) ? String(r.id || r.messageId) : '' };
    }
  }
  try {
    var msg = { to: para.join(','), subject: assunto, htmlBody: EnviarDoc_htmlEmail_(texto, eu, anexos, 'SISTEMA'), body: texto,
      name: (eu.nome ? eu.nome + ' | ' : '') + 'Metrolabs', attachments: blobs };
    if (cc.length) msg.cc = cc.join(',');
    if (eu.email) msg.replyTo = eu.email;
    MailApp.sendEmail(msg);
    return { ok: true, modo: 'SISTEMA', id: '' };
  } catch (e) {
    return { ok: false, modo: 'SISTEMA', motivo: 'A caixa de e-mail do sistema não aceitou o envio: ' + String((e && e.message) || e).slice(0, 300) + '. Confira os endereços e tente de novo; se repetir, avise o administrador.' };
  }
}

/** Documento pela Z-API (base64). Nunca lança: { ok, id } | { ok:false, motivo }. */
function EnviarDoc_zapiDocumento_(telefone, anexo, legenda) {
  // 21/10/2026: Z-API fora do sistema (piloto do WhatsApp ou provedor meta): documento só por e-mail
  if (typeof SGO_waZapiFora_ === 'function' && SGO_waZapiFora_()) return { ok: false, motivo: 'O WhatsApp de documentos está desligado: a Z-API saiu do sistema e o WhatsApp oficial só manda avisos por modelo aprovado. Envie este documento por e-mail.' };
  if (typeof SGO_zapiEnviarDocumento_ === 'function') {
    try { return SGO_zapiEnviarDocumento_(telefone, { nome: anexo.nome, mime: anexo.mime, base64: Utilities.base64Encode(anexo.blob.getBytes()), legenda: legenda }, { tipo: 'AVISO' }) || { ok: false, motivo: 'sem resposta do envio' }; }
    catch (e) { return { ok: false, motivo: String((e && e.message) || e).slice(0, 300) }; }
  }
  var cred = typeof Notificar_credenciaisZapi_ === 'function' ? Notificar_credenciaisZapi_() : {};
  var segredos = [cred.instancia, cred.token, cred.clientToken];
  var limpar = function (m) { return typeof Notificar_limparSegredos_ === 'function' ? Notificar_limparSegredos_(m, segredos) : String(m).slice(0, 400); };
  try {
    var fone = EnviarDoc_celular_(telefone);
    if (!fone) return { ok: false, motivo: 'Número sem WhatsApp válido (precisa de DDD + 9 + 8 dígitos; telefone fixo não recebe). Corrija o número e tente de novo.' };
    if (!(cred.instancia && cred.token && cred.clientToken)) return { ok: false, motivo: 'WhatsApp da empresa (Z-API) não configurado: o responsável pelo sistema grava ZAPI_INSTANCIA, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN em Administração > Chaves e senhas. Depois use "Tentar de novo".' };
    var res = typeof SGO_zapiReservar_ === 'function' ? (SGO_zapiReservar_(fone, 'AVISO') || {}) : { ok: true, esperarMs: 0 };
    if (!res.ok) return { ok: false, motivo: 'Não enviado agora: ' + String(res.motivo || 'fila do WhatsApp indisponível') + '. Tente de novo mais tarde ou envie por e-mail.' };
    if (res.esperarMs > 0) Utilities.sleep(Math.min(Number(res.esperarMs) || 0, 90000));
    var ext = EnviarDoc_ehPdf_(anexo.nome, anexo.mime) ? 'pdf' : (EnviarDoc_ehHtml_(anexo.nome, anexo.mime) ? 'html' : 'pdf');
    var corpo = { phone: fone, document: 'data:' + (anexo.mime || 'application/pdf') + ';base64,' + Utilities.base64Encode(anexo.blob.getBytes()), fileName: anexo.nome };
    if (legenda) corpo.caption = String(legenda).slice(0, 3000);
    var r = UrlFetchApp.fetch('https://api.z-api.io/instances/' + encodeURIComponent(cred.instancia) + '/token/' + encodeURIComponent(cred.token) + '/send-document/' + ext, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'Client-Token': cred.clientToken }, payload: JSON.stringify(corpo)
    });
    var cod = r.getResponseCode(), j = {};
    try { j = JSON.parse(r.getContentText() || '{}') || {}; } catch (e) { j = {}; }
    if (cod >= 200 && cod < 300) return { ok: true, id: String(j.messageId || j.zaapId || j.id || '') };
    var det = String(j.error || j.message || r.getContentText() || '').slice(0, 200);
    if (typeof SGO_zapiExplicar_ === 'function') det = SGO_zapiExplicar_(det);
    return { ok: false, motivo: limpar('O WhatsApp (Z-API) recusou o envio (código ' + cod + '): ' + det) };
  } catch (e) {
    return { ok: false, motivo: limpar('Sem comunicação com o WhatsApp da empresa: ' + String((e && e.message) || e)) };
  }
}

/** Monta os anexos conferindo que cada arquivo é do MESMO cliente do documento. */
function EnviarDoc_anexos_(doc, op) {
  var anexos = [{ id: doc.arquivo.id, nome: doc.arquivo.nome, mime: doc.arquivo.mime || 'application/pdf', tamanho: doc.arquivo.tamanho, blob: null, principal: true, _arq: doc.arquivo }];
  if (op.incluirHtml) {
    var h = EnviarDoc_htmlIrmao_(doc, op.htmlId);
    if (!h) throw new Error('A cópia em HTML deste documento não foi encontrada na pasta. Desmarque "Incluir a cópia em HTML" e envie só o PDF.');
    anexos.push({ id: h.id, nome: h.nome, mime: h.mime || 'text/html', tamanho: h.tamanho, blob: null, _arq: h });
  }
  var brutos = (op.extras || []).filter(function (x) { return EnviarDoc_s_(x); });
  var extras = brutos.map(EnviarDoc_idDeLink_).filter(Boolean);
  if (extras.length !== brutos.length) throw new Error('Um dos documentos a mais não foi reconhecido. Feche a janela, abra de novo e marque os documentos outra vez.');
  if (extras.length > ENVDOC_LIMITES.anexosExtras) throw new Error('Escolha no máximo ' + ENVDOC_LIMITES.anexosExtras + ' documentos a mais por envio. Desmarque alguns e envie de novo.');
  extras.forEach(function (id) {
    if (anexos.some(function (a) { return a.id === id; })) return;
    var d2 = EnviarDoc_documento_(id, {});
    var mesmo = doc.cliente && d2.cliente && d2.cliente.chave === doc.cliente.chave;
    if (!mesmo || d2.classe === 'BLOQUEADO') throw new Error('O arquivo "' + d2.arquivo.nome + '" não é do mesmo cliente deste documento e não pode ir junto. Desmarque esse arquivo e envie de novo.');
    anexos.push({ id: d2.arquivo.id, nome: d2.arquivo.nome, mime: d2.arquivo.mime || 'application/pdf', tamanho: d2.arquivo.tamanho, blob: null, _arq: d2.arquivo });
  });
  var total = anexos.reduce(function (s, a) { return s + (a.tamanho || 0); }, 0);
  if (total > ENVDOC_LIMITES.emailMb * 1048576) throw new Error('Os anexos somam ' + Math.ceil(total / 1048576) + ' MB, acima do limite de ' + ENVDOC_LIMITES.emailMb + ' MB por e-mail. Desmarque documentos a mais e envie em partes.');
  anexos.forEach(function (a) { a.blob = EnviarDoc_blob_(a._arq); delete a._arq; });
  return anexos;
}

/** Destinatários: confere e completa (pessoa da equipe vem do cadastro). */
function EnviarDoc_destinatarios_(lista, canais) {
  var usuarios = null, emails = [], whats = [], erros = [];
  (lista || []).slice(0, 40).forEach(function (d) {
    d = d || {};
    var nome = EnviarDoc_s_(d.nome).slice(0, 120), email = SGO_UTILS.safeLower(d.email).trim(), fone = EnviarDoc_s_(d.celular || d.telefone);
    if (d.usuarioId) {
      if (!usuarios) { try { usuarios = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { usuarios = []; } }
      var u = usuarios.filter(function (x) { return String(x.ID) === String(d.usuarioId) && SGO_UTILS.safeUpper(x.PERFIL) !== 'CLIENTE'; })[0];
      if (!u) { erros.push('A pessoa escolhida da equipe não foi encontrada no cadastro.'); return; }
      nome = EnviarDoc_s_(u.NOME) || nome; email = SGO_UTILS.safeLower(u.EMAIL).trim(); fone = u.CELULAR || u.WHATSAPP || u.TELEFONE;
    }
    if (canais.email && email) {
      if (!EnviarDoc_emailOk_(email)) erros.push('E-mail inválido: "' + email.slice(0, 80) + '". Corrija o endereço.');
      else if (!emails.some(function (x) { return x.email === email; })) emails.push({ nome: nome, email: email });
    }
    if (canais.whatsapp && fone) {
      var cel = EnviarDoc_celular_(fone);
      if (!cel) erros.push('O número ' + EnviarDoc_foneBr_(fone) + (nome ? ' (' + nome + ')' : '') + ' não é um celular com WhatsApp (DDD + 9 + 8 dígitos).');
      else if (!whats.some(function (x) { return x.celular === cel; })) whats.push({ nome: nome, celular: cel });
    }
  });
  return { emails: emails, whats: whats, erros: erros };
}

function EnviarDoc_linhaBase_(doc, eu, anexos, horario) {
  return {
    ARQUIVO_ID: doc.arquivo.id, ARQUIVO_NOME: doc.arquivo.nome,
    ANEXOS_JSON: JSON.stringify(anexos.map(function (a) { return { id: a.id, nome: a.nome, mime: a.mime }; })),
    DOC_TIPO: doc.tipo, DOC_TITULO: doc.titulo, DOC_NUMERO: doc.numero, EQUIPAMENTO: doc.equipamento,
    DOC_DOCUMENTO_ID: doc.docReg ? EnviarDoc_s_(doc.docReg.ID) : '',
    CLIENTE_CHAVE: doc.cliente ? doc.cliente.chave : (doc.classe === 'INTERNO' ? 'INTERNO' : ''),
    CLIENTE_ID: doc.cliente ? doc.cliente.id : '', CLIENTE_NOME: doc.cliente ? doc.cliente.nome : '',
    FORA_HORARIO: horario.fora ? 'SIM' : '', USUARIO_ID: eu.id, USUARIO_NOME: eu.nome
  };
}

/** Executa um envio planejado (linha já gravada como ENVIANDO) e grava o resultado. */
function EnviarDoc_executar_(linha, eu, anexos, plano) {
  var r;
  if (linha.CANAL === 'EMAIL') {
    r = EnviarDoc_enviarEmail_(eu, plano.para, plano.cc, linha.ASSUNTO, linha.MENSAGEM, anexos);
  } else {
    r = { ok: true, id: '' };
    var ids = [];
    for (var i = 0; i < anexos.length; i++) {
      if (anexos[i].tamanho > ENVDOC_LIMITES.whatsMb * 1048576) { r = { ok: false, motivo: 'O arquivo "' + anexos[i].nome + '" passa de ' + ENVDOC_LIMITES.whatsMb + ' MB, limite do WhatsApp. Envie por e-mail.' }; break; }
      var x = EnviarDoc_zapiDocumento_(linha.DESTINO, anexos[i], i === 0 ? linha.MENSAGEM : '');
      if (!x.ok) { r = { ok: false, motivo: (i > 0 ? 'O primeiro arquivo foi entregue, mas "' + anexos[i].nome + '" não: ' : '') + x.motivo }; break; }
      if (x.id) ids.push(x.id);
    }
    if (r.ok) r.id = ids.join(',');
  }
  var mudar = { SITUACAO: r.ok ? 'ENVIADO' : 'FALHOU', MOTIVO: r.ok ? (r.modo === 'SISTEMA' ? 'Na fila de saída do e-mail do sistema' + (eu.email ? ' (responder para ' + eu.email + ')' : '') : '') : String(r.motivo || 'falha sem detalhe').slice(0, 480),
    PROVEDOR_ID: String(r.id || '').slice(0, 200), MODO: linha.CANAL === 'EMAIL' ? (r.modo || '') : 'ZAPI', ATUALIZADO_EM: EnviarDoc_agoraIso_() };
  try { SGO_DATA.update(ENVDOC_ABA, linha.ID, mudar); } catch (e) {}
  Object.keys(mudar).forEach(function (k) { linha[k] = mudar[k]; });
  return linha;
}

function EnviarDoc_pedidoId_(v) {
  var s = EnviarDoc_s_(v);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(s)) throw new Error('Pedido sem identificação. Feche a janela "Enviar documento", abra de novo e envie.');
  return s;
}

/** Já existe este pedido? Devolve as linhas (para não enviar duas vezes). */
function EnviarDoc_doPedido_(pedidoId) {
  return EnviarDoc_linhas_().filter(function (r) { return r.PEDIDO_ID === pedidoId; });
}

function EnviarDoc_trava_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  return lock;
}

/**
 * Envia. payload = { pedidoId, arquivoId, htmlId, docDocumentoId, dica, incluirHtml, extras: [ids],
 *   destinatarios: [{ nome, email, celular } | { usuarioId }], cc: "a@b; c@d", canais: { email, whatsapp },
 *   assunto, mensagemEmail, mensagemWhatsapp }.
 */
function EnviarDoc_apiEnviar(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    payload = payload || {};
    var eu = EnviarDoc_sessao_(sessionId);
    var pedidoId = EnviarDoc_pedidoId_(payload.pedidoId);
    var canais = { email: !!(payload.canais && payload.canais.email), whatsapp: !!(payload.canais && payload.canais.whatsapp) };
    if (!canais.email && !canais.whatsapp) throw new Error('Escolha pelo menos um canal: E-mail e/ou WhatsApp. Depois toque em "Enviar" de novo.');
    var lock = EnviarDoc_trava_(), planejadas = [], anexos, doc, plano = { para: [], cc: [] };
    try {
      var ja = EnviarDoc_doPedido_(pedidoId);
      if (ja.length) return EnviarDoc_respostaEnvio_(ja, true);
      doc = EnviarDoc_documento_(payload.arquivoId, Object.assign({}, payload.dica || {}, { docDocumentoId: payload.docDocumentoId }));
      if (doc.classe === 'BLOQUEADO') throw new Error(EnviarDoc_textoBloqueado_(doc));
      anexos = EnviarDoc_anexos_(doc, { incluirHtml: !!payload.incluirHtml, htmlId: payload.htmlId, extras: payload.extras });
      var dest = EnviarDoc_destinatarios_(payload.destinatarios, canais);
      if (dest.erros.length) throw new Error(dest.erros.join(' ') + ' Nada foi enviado. Corrija e toque em "Enviar" de novo.');
      var cc = String(payload.cc || '').split(/[;,\s]+/).map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);
      var ccRuim = cc.filter(function (e) { return !EnviarDoc_emailOk_(e); });
      if (ccRuim.length) throw new Error('E-mail em cópia inválido: ' + ccRuim.join(', ') + '. Nada foi enviado. Corrija e toque em "Enviar" de novo.');
      if (canais.email && !dest.emails.length) throw new Error('E-mail marcado, mas nenhum destinatário escolhido tem e-mail. Marque alguém com e-mail, digite um endereço ou desmarque E-mail.');
      if (canais.whatsapp && !dest.whats.length) throw new Error('WhatsApp marcado, mas nenhum destinatário escolhido tem celular com WhatsApp. Marque alguém com celular, digite o número ou desmarque WhatsApp.');
      if (dest.emails.length > ENVDOC_LIMITES.destinosEmail) throw new Error('No máximo ' + ENVDOC_LIMITES.destinosEmail + ' e-mails por envio.');
      if (dest.whats.length > ENVDOC_LIMITES.destinosWhats) throw new Error('No máximo ' + ENVDOC_LIMITES.destinosWhats + ' celulares por envio pelo WhatsApp (proteção do número da empresa). Envie em partes.');
      var assunto = EnviarDoc_s_(payload.assunto).slice(0, 180), txtEmail = String(payload.mensagemEmail || '').trim(), txtWhats = String(payload.mensagemWhatsapp || '').trim();
      if (canais.email && (!assunto || !txtEmail)) throw new Error('Preencha o assunto e a mensagem do e-mail antes de enviar.');
      if (canais.whatsapp && !txtWhats) throw new Error('Preencha a mensagem do WhatsApp antes de enviar.');
      var horario = EnviarDoc_horario_(), agora = EnviarDoc_agoraIso_(), base = EnviarDoc_linhaBase_(doc, eu, anexos, horario);
      if (canais.email) {
        plano.para = dest.emails.map(function (x) { return x.email; }); plano.cc = cc;
        planejadas.push(Object.assign({}, base, { PEDIDO_ID: pedidoId, CANAL: 'EMAIL', DESTINO: plano.para.join('; '), COPIA: cc.join('; '),
          DESTINO_NOME: dest.emails.map(function (x) { return x.nome || x.email; }).join('; ').slice(0, 480), ASSUNTO: assunto, MENSAGEM: txtEmail.slice(0, 8000),
          SITUACAO: 'ENVIANDO', QUANDO: agora, ATUALIZADO_EM: agora }));
      }
      dest.whats.forEach(function (w) {
        planejadas.push(Object.assign({}, base, { PEDIDO_ID: pedidoId, CANAL: 'WHATSAPP', DESTINO: w.celular, DESTINO_NOME: w.nome, ASSUNTO: assunto,
          MENSAGEM: EnviarDoc_aplicarNome_(txtWhats, w.nome).slice(0, 3000), SITUACAO: 'ENVIANDO', QUANDO: agora, ATUALIZADO_EM: agora }));
      });
      planejadas = planejadas.map(function (l) { return SGO_DATA.insert(ENVDOC_ABA, l); });
    } finally { try { lock.releaseLock(); } catch (e) {} }
    planejadas.forEach(function (l) {
      try { EnviarDoc_executar_(l, eu, anexos, plano); }
      catch (e) {
        var m = { SITUACAO: 'FALHOU', MOTIVO: String((e && e.message) || e).slice(0, 480), ATUALIZADO_EM: EnviarDoc_agoraIso_() };
        try { SGO_DATA.update(ENVDOC_ABA, l.ID, m); } catch (x) {}
        Object.assign(l, m);
      }
    });
    try { SGO_DATA.log('ENVDOC_ENVIAR', eu.usuario, doc.arquivo.nome + ': ' + planejadas.map(function (l) { return l.CANAL + ' ' + l.SITUACAO; }).join(', '), 'DOCUMENTOS'); } catch (e) {}
    EnviarDoc_aposEnvio_(planejadas, eu);
    return EnviarDoc_respostaEnvio_(planejadas, false);
  });
}

/**
 * 22/10/2026: gancho "depois do envio" por módulo (como o COMMAND fazia com OS_ENVIADA): o relatório da O.S. e o orçamento
 * do chamado passam a mostrar "enviado ao cliente em / por / canal / para". Só os envios que saíram. Nunca lança.
 */
function EnviarDoc_aposEnvio_(linhas, eu) {
  try {
    var ok = (linhas || []).filter(function (l) { return l && l.SITUACAO === 'ENVIADO'; }).map(function (l) {
      return { arquivoId: l.ARQUIVO_ID, canal: l.CANAL, destino: l.DESTINO, destinoNome: l.DESTINO_NOME, quando: l.QUANDO, porId: eu && eu.id, porNome: eu && eu.nome };
    });
    if (ok.length && typeof Assistencia_aoEnviarDocumento_ === 'function') Assistencia_aoEnviarDocumento_(ok);
  } catch (e) { try { console.error('Enviar documento, gancho depois do envio: ' + ((e && e.message) || e)); } catch (x) {} }
}

function EnviarDoc_respostaEnvio_(linhas, repetido) {
  var itens = linhas.map(EnviarDoc_itemHistorico_);
  var ok = itens.filter(function (i) { return i.situacao === 'ENVIADO'; }).length, falhas = itens.filter(function (i) { return i.situacao === 'FALHOU'; }).length;
  var andamento = itens.filter(function (i) { return i.situacao === 'ENVIANDO'; }).length;
  return { ok: true, repetido: !!repetido, enviados: ok, falhas: falhas, emAndamento: andamento, itens: itens,
    message: repetido ? 'Este envio já tinha sido feito (o pedido chegou duas vezes); nada foi enviado de novo.' : '' };
}

/** "Tentar de novo" de um envio que falhou: nova linha ligada à original, mesmos anexos e texto. */
function EnviarDoc_apiTentarDeNovo(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    payload = payload || {};
    var eu = EnviarDoc_sessao_(sessionId);
    var pedidoId = EnviarDoc_pedidoId_(payload.pedidoId);
    var lock = EnviarDoc_trava_(), linha, anexos, plano = { para: [], cc: [] };
    try {
      var ja = EnviarDoc_doPedido_(pedidoId);
      if (ja.length) return EnviarDoc_respostaEnvio_(ja, true);
      var todas = EnviarDoc_linhas_();
      var orig = todas.filter(function (r) { return String(r.ID) === String(payload.envioId); })[0];
      if (!orig) throw new Error('Envio não encontrado. Atualize a lista e tente de novo.');
      if (orig.SITUACAO !== 'FALHOU') throw new Error('Só envio com falha pode ser tentado de novo; este está ' + (orig.SITUACAO === 'ENVIADO' ? 'enviado' : 'em andamento') + '.');
      var depois = todas.filter(function (r) { return String(r.TENTATIVA_DE) === String(orig.ID) && r.SITUACAO !== 'FALHOU'; })[0];
      if (depois) throw new Error('Este envio já foi tentado de novo em ' + EnviarDoc_dataBr_(depois.QUANDO) + ' (' + (depois.SITUACAO === 'ENVIADO' ? 'enviado' : 'em andamento') + '). Confira o histórico.');
      var doc = EnviarDoc_documento_(orig.ARQUIVO_ID, { docDocumentoId: orig.DOC_DOCUMENTO_ID, numero: orig.DOC_NUMERO, equipamento: orig.EQUIPAMENTO });
      if (doc.classe === 'BLOQUEADO') throw new Error(EnviarDoc_textoBloqueado_(doc));
      var lista = [];
      try { lista = JSON.parse(orig.ANEXOS_JSON || '[]') || []; } catch (e) { lista = []; }
      var htmlIncl = lista.filter(function (a) { return a.id !== doc.arquivo.id && EnviarDoc_ehHtml_(a.nome, a.mime); })[0];
      anexos = EnviarDoc_anexos_(doc, { incluirHtml: !!htmlIncl, htmlId: htmlIncl ? htmlIncl.id : '', extras: lista.filter(function (a) { return a.id !== doc.arquivo.id && (!htmlIncl || a.id !== htmlIncl.id); }).map(function (a) { return a.id; }) });
      if (orig.CANAL === 'EMAIL') { plano.para = String(orig.DESTINO || '').split(/;\s*/).filter(Boolean); plano.cc = String(orig.COPIA || '').split(/;\s*/).filter(Boolean); }
      var agora = EnviarDoc_agoraIso_();
      var nova = Object.assign({}, EnviarDoc_linhaBase_(doc, eu, anexos, EnviarDoc_horario_()), {
        PEDIDO_ID: pedidoId, TENTATIVA_DE: orig.ID, CANAL: orig.CANAL, DESTINO: orig.DESTINO, COPIA: orig.COPIA, DESTINO_NOME: orig.DESTINO_NOME,
        ASSUNTO: orig.ASSUNTO, MENSAGEM: orig.MENSAGEM, SITUACAO: 'ENVIANDO', QUANDO: agora, ATUALIZADO_EM: agora });
      linha = SGO_DATA.insert(ENVDOC_ABA, nova);
    } finally { try { lock.releaseLock(); } catch (e) {} }
    try { EnviarDoc_executar_(linha, eu, anexos, plano); }
    catch (e) { var m = { SITUACAO: 'FALHOU', MOTIVO: String((e && e.message) || e).slice(0, 480), ATUALIZADO_EM: EnviarDoc_agoraIso_() }; try { SGO_DATA.update(ENVDOC_ABA, linha.ID, m); } catch (x) {} Object.assign(linha, m); }
    EnviarDoc_aposEnvio_([linha], eu);
    return EnviarDoc_respostaEnvio_([linha], false);
  });
}

/* ============================================================ histórico */

function EnviarDoc_itemHistorico_(r) {
  return {
    id: EnviarDoc_s_(r.ID), quando: EnviarDoc_dataBr_(r.QUANDO), quandoIso: EnviarDoc_s_(r.QUANDO), usuario: EnviarDoc_s_(r.USUARIO_NOME),
    canal: r.CANAL === 'WHATSAPP' ? 'WhatsApp' : 'E-mail', canalCodigo: EnviarDoc_s_(r.CANAL),
    destino: r.CANAL === 'WHATSAPP' ? EnviarDoc_foneBr_(r.DESTINO) : EnviarDoc_s_(r.DESTINO), copia: EnviarDoc_s_(r.COPIA),
    destinoNome: EnviarDoc_s_(r.DESTINO_NOME), situacao: EnviarDoc_s_(r.SITUACAO), motivo: EnviarDoc_s_(r.MOTIVO),
    tentativaDe: EnviarDoc_s_(r.TENTATIVA_DE), foraHorario: r.FORA_HORARIO === 'SIM',
    documento: { arquivoId: EnviarDoc_s_(r.ARQUIVO_ID), nome: EnviarDoc_s_(r.ARQUIVO_NOME), titulo: EnviarDoc_s_(r.DOC_TITULO), tipo: EnviarDoc_s_(r.DOC_TIPO) },
    cliente: EnviarDoc_s_(r.CLIENTE_NOME), clienteId: EnviarDoc_s_(r.CLIENTE_ID),
    anexos: (function () { try { return (JSON.parse(r.ANEXOS_JSON || '[]') || []).map(function (a) { return a.nome; }); } catch (e) { return []; } })()
  };
}

/** Itens do histórico (mais recentes primeiro) com "podeTentar" calculado (falhou e ainda não foi refeito). */
function EnviarDoc_historicoDe_(filtro, limite) {
  var todas = EnviarDoc_linhas_();
  var refeitas = {};
  todas.forEach(function (r) { if (r.TENTATIVA_DE && r.SITUACAO !== 'FALHOU') refeitas[String(r.TENTATIVA_DE)] = r; });
  return todas.filter(filtro).sort(function (a, b) { return String(b.QUANDO).localeCompare(String(a.QUANDO)); }).slice(0, limite || ENVDOC_LIMITES.historico)
    .map(function (r) {
      var i = EnviarDoc_itemHistorico_(r);
      var refeita = refeitas[String(r.ID)];
      i.podeTentar = r.SITUACAO === 'FALHOU' && !refeita;
      if (refeita) i.refeitoEm = EnviarDoc_dataBr_(refeita.QUANDO) + (refeita.SITUACAO === 'ENVIADO' ? ' (enviado)' : ' (em andamento)');
      return i;
    });
}

function EnviarDoc_apiHistorico(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    EnviarDoc_sessao_(sessionId);
    payload = payload || {};
    var arq = EnviarDoc_idDeLink_(payload.arquivoId), cli = EnviarDoc_s_(payload.clienteId);
    if (!arq && !cli) throw new Error('Informe o documento ou o cliente para ver o histórico de envios.');
    return { ok: true, itens: EnviarDoc_historicoDe_(function (r) { return arq ? r.ARQUIVO_ID === arq : String(r.CLIENTE_ID) === cli; }, payload.limite) };
  });
}

/** Envios recentes (Arquivo de documentos): filtros cliente e situação. */
function EnviarDoc_apiEnvios(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    EnviarDoc_sessao_(sessionId);
    payload = payload || {};
    var cli = EnviarDoc_s_(payload.clienteId), sit = SGO_UTILS.safeUpper(payload.situacao);
    var itens = EnviarDoc_historicoDe_(function (r) {
      return (!cli || String(r.CLIENTE_ID) === cli) && (!sit || r.SITUACAO === sit);
    }, Math.min(Number(payload.limite) || 100, ENVDOC_LIMITES.historico));
    var clientes = {};
    EnviarDoc_linhas_().forEach(function (r) { if (r.CLIENTE_ID) clientes[r.CLIENTE_ID] = r.CLIENTE_NOME || r.CLIENTE_ID; });
    return { ok: true, itens: itens, clientes: Object.keys(clientes).map(function (k) { return { id: k, nome: clientes[k] }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }) };
  });
}

/* ============================================================ pasta do cliente */

/**
 * Documentos gerados do cliente: as pastas do cliente (CNPJ do cliente e das unidades, e o nome) dentro das pastas
 * dos módulos, mais o Arquivo de documentos. Cada um com o último envio.
 */
function EnviarDoc_apiDocumentosDoCliente(sessionId, payload) {
  return EnviarDoc_responder_(function () {
    EnviarDoc_sessao_(sessionId);
    var id = EnviarDoc_s_(payload && payload.clienteId);
    var c = id ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, id) : null;
    if (!c) throw new Error('Cliente não encontrado. Atualize a lista de clientes e abra de novo.');
    var nomes = {};
    var cnpj = EnviarDoc_digitos_(c.CNPJ);
    if (cnpj.length === 14) nomes[cnpj] = 1;
    EnviarDoc_unidades_().forEach(function (u) { if (String(u.CLIENTE_ID) === String(id)) { var d = EnviarDoc_digitos_(u.CNPJ_UNIDADE); if (d.length === 14) nomes[d] = 1; } });
    [c.RAZAO_SOCIAL, c.NOME_FANTASIA].forEach(function (n) {
      if (!n) return;
      nomes[typeof SGO_DocSalvar_sanitizarNome_ === 'function' ? SGO_DocSalvar_sanitizarNome_(n) : String(n).trim()] = 1;
    });
    var envios = {};
    EnviarDoc_linhas_().forEach(function (r) {
      // último envio que deu certo; sem nenhum, o último que falhou
      var e = envios[r.ARQUIVO_ID], ok = r.SITUACAO === 'ENVIADO', eOk = e && e.SITUACAO === 'ENVIADO';
      if (!e || (ok && !eOk) || (ok === eOk && String(r.QUANDO) > String(e.QUANDO))) envios[r.ARQUIVO_ID] = r;
    });
    var docs = [], vistos = {};
    Object.keys(nomes).forEach(function (nomePasta) {
      var it;
      try { it = DriveApp.getFoldersByName(nomePasta); } catch (e) { return; }
      var nPastas = 0;
      while (it.hasNext() && nPastas < 30) {
        nPastas++;
        var p = it.next(), cadeia = [], atual = p;
        for (var i = 0; atual && i < 6; i++) {
          cadeia.push({ nome: EnviarDoc_s_(atual.getName()) });
          try { var pi = atual.getParents(); atual = pi.hasNext() ? pi.next() : null; } catch (e) { atual = null; }
        }
        var raiz = EnviarDoc_raiz_(cadeia);
        if (!raiz || raiz.classe !== 'CLIENTE') continue;
        // o nome da pasta precisa levar de volta a ESTE cliente (CNPJ de outro cliente com o mesmo nome não entra)
        var dono = EnviarDoc_clienteDaPasta_({ nome: EnviarDoc_s_(p.getName()), descricao: '' }, EnviarDoc_clientes_(), EnviarDoc_unidades_());
        if (!dono || dono.id !== String(id)) continue;
        var fs = p.getFiles(), n = 0;
        while (fs.hasNext() && n < 300) {
          n++;
          var f = fs.next(), nome = EnviarDoc_s_(f.getName());
          if (vistos[f.getId()] || !EnviarDoc_ehPdf_(nome, f.getMimeType())) continue;
          vistos[f.getId()] = 1;
          var quando = '';
          try { quando = Utilities.formatDate(f.getDateCreated(), ENVDOC_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) {}
          var ult = envios[f.getId()];
          docs.push({ arquivoId: f.getId(), nome: nome, titulo: EnviarDoc_tituloDoNome_(nome), tipo: raiz.tipo, quando: quando, quandoBr: EnviarDoc_dataBr_(quando), url: EnviarDoc_s_(f.getUrl()),
            ultimoEnvio: ult ? { quando: EnviarDoc_dataBr_(ult.QUANDO), canal: ult.CANAL === 'WHATSAPP' ? 'WhatsApp' : 'E-mail', situacao: ult.SITUACAO, usuario: ult.USUARIO_NOME } : null });
        }
      }
    });
    // Arquivo de documentos do cliente (com arquivo)
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.DOC_DOCUMENTOS || 'DOC_DOCUMENTOS').forEach(function (d) {
        if (String(d.CLIENTE_ID) !== String(id) || !d.LINK_ARQUIVO || SGO_UTILS.safeUpper(d.STATUS) === 'INATIVO') return;
        var aid = EnviarDoc_idDeLink_(d.LINK_ARQUIVO);
        if (!aid || vistos[aid]) return;
        vistos[aid] = 1;
        var q = EnviarDoc_s_(d.CRIADO_EM), ult = envios[aid];
        docs.push({ arquivoId: aid, nome: EnviarDoc_s_(d.NOME_ARQUIVO), titulo: EnviarDoc_s_(d.NOME_ARQUIVO), tipo: EnviarDoc_s_(d.TIPO_DOCUMENTO).replace(/^\s*\d+\.\s*/, '') || 'Arquivo de documentos',
          quando: q, quandoBr: EnviarDoc_dataBr_(q).slice(0, 10), url: EnviarDoc_s_(d.LINK_ARQUIVO), docDocumentoId: EnviarDoc_s_(d.ID),
          ultimoEnvio: ult ? { quando: EnviarDoc_dataBr_(ult.QUANDO), canal: ult.CANAL === 'WHATSAPP' ? 'WhatsApp' : 'E-mail', situacao: ult.SITUACAO, usuario: ult.USUARIO_NOME } : null });
      });
    } catch (e) {}
    docs.sort(function (a, b) { return String(b.quando).localeCompare(String(a.quando)); });
    return { ok: true, cliente: { id: String(id), nome: EnviarDoc_nomeCliente_(c) }, documentos: docs.slice(0, 300),
      historico: EnviarDoc_historicoDe_(function (r) { return String(r.CLIENTE_ID) === String(id); }, 60) };
  });
}
