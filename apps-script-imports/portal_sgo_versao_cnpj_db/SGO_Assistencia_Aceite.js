/****************************************************
 * ASSISTÊNCIA TÉCNICA: ACEITE DO ORÇAMENTO PELO CLIENTE (22/10/2026, etapa 4 do estudo do fluxo)
 *
 * O cliente aprova, recusa ou pede ajuste no orçamento do chamado por um link, sem login, ou pelo portal "Meus chamados".
 * Desenho tirado do aceite público do COMMAND (resumo do token, resposta única, assinatura, resumo do conteúdo), reescrito
 * sobre o fluxo que já existe no SGO+: a resposta passa por AstR_aplicarDecisao_ (SGO_Assistencia_Relatorio.js), o mesmo
 * núcleo do registro manual com o aceite anexado, que continua existindo para quem responde por telefone ou e-mail.
 *
 *   Link    token aleatório de 32 bytes (64 caracteres hexadecimais); só o resumo SHA-256 fica gravado (ATEC_ORC_LINKS).
 *           Um link por envio: enviar de novo (ou "Gerar e copiar link") cria outro e invalida o anterior; a revisão do
 *           orçamento revoga o link da revisão substituída; a gestão invalida com motivo. Validade: Regras da assistência
 *           (orcamentoLink.dias, padrão 30 dias corridos).
 *   Página  rota pública do servidor /orcamento/ (sgo_servidor, src/servicos/orcamentoPublico.ts). O token vai no fragmento
 *           do endereço (#...), que o navegador nunca manda ao servidor: não aparece em registro de acesso nem em Referer.
 *           A página chama Assistencia_orcLinkVer_, Assistencia_orcLinkResponder_ e Assistencia_orcLinkPdf_ (nomes
 *           terminados em "_": o navegador não chama pelo /api/run; só a rota pública, com o limite por IP).
 *   Prova   ATEC_ORC_ACEITES, só inclusão: data e hora do servidor, IP, navegador, nome, cargo, documento, e-mail, a
 *           assinatura (PNG na pasta privada, com o resumo), o resumo SHA-256 do conteúdo exibido (itens, valores,
 *           condições, validade) e do PDF, e o resumo do registro encadeado com o anterior. A aprovação gera o
 *           "Comprovante de aprovação" (A4 HTML + PDF) na pasta do cliente, ligado ao orçamento como o aceite, e o
 *           cliente recebe a confirmação por e-mail com o comprovante.
 *   Erros   token inexistente, vencido, invalidado ou substituído recebem exatamente a mesma resposta (não revela se existe).
 ****************************************************/

var AST_LINK_INDISPONIVEL = 'Este link de orçamento não está disponível. Ele pode ter vencido, ter sido trocado por um envio mais novo ou estar incompleto (abra o link inteiro, direto do e-mail). Para receber um link novo, fale com a Metrolabs.';
var AST_LINK_MARCA = '[o link para ver e responder o orçamento entra aqui]';
/** Campos que entram no resumo de cada registro da trilha (a ordem não muda nunca). */
var AST_ACEITE_CAMPOS = ['ORCAMENTO_ID', 'ORCAMENTO_NUMERO', 'REVISAO', 'CHAMADO_ID', 'CLIENTE_ID', 'LINK_ID', 'CANAL', 'DECISAO', 'NOME', 'CARGO', 'DOCUMENTO', 'EMAIL', 'TEXTO',
  'IP', 'NAVEGADOR', 'USUARIO_ID', 'EM', 'ASSINATURA_SHA256', 'CONTEUDO_SHA256', 'PDF_SHA256', 'VALOR_TOTAL', 'ANTERIOR_SHA256'];
var AST_DECISOES_NOMES = { APROVADO: 'Aprovado', RECUSADO: 'Recusado', AJUSTE: 'Ajuste pedido' };

// ------------------------------------------------------------
// BÁSICOS
// ------------------------------------------------------------
function AstL_hexBytes_(bytes) {
  return (bytes || []).map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}
function AstL_shaBytes_(bytes) { return AstL_hexBytes_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)); }
/** Token novo: resumo SHA-256 de três identificadores aleatórios (crypto.randomUUID no servidor) = 32 bytes em hexadecimal. */
function AstL_novoToken_() { return Ast_marca_([Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Date.now()].join('|')); }
function AstL_resumoToken_(token) { return Ast_marca_('ATEC-ORC-LINK|' + Ast_s_(token)); }
function AstL_tokenValido_(token) { return /^[a-f0-9]{64}$/.test(Ast_s_(token)); }
function AstL_dias_() { var d = Number((Ast_regras_().orcamentoLink || {}).dias); return d >= 1 && d <= 90 ? Math.round(d) : 30; }
/** Endereço público do link. Sem o endereço do sistema não há link possível. */
function AstL_url_(token) {
  var base = '';
  try { base = String(ScriptApp.getService().getUrl() || ''); } catch (e) { base = ''; }
  base = base.replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\/[^\/]+/i.test(base)) throw new Error('Não foi possível gerar o link: o endereço público do SGO+ não está configurado neste servidor. Avise o administrador; enquanto isso, envie o PDF pelo Enviar documento e registre a resposta com o aceite anexado');
  return base.replace(/^(https?:\/\/[^\/]+).*$/i, '$1') + '/orcamento/#' + token;
}
/** Contato da Metrolabs que a página mostra (o mesmo para qualquer link: não revela nada do orçamento). */
function AstL_contato_() {
  var e = typeof RelA4_empresa_ === 'function' ? RelA4_empresa_() : {};
  var email = '', tel = '';
  try { var p = PropertiesService.getScriptProperties(); email = Ast_s_(p.getProperty('ATEC_ORC_CONTATO_EMAIL')); tel = Ast_s_(p.getProperty('ATEC_ORC_CONTATO_TELEFONE')); } catch (x) {}
  return { nome: 'Metrolabs', telefone: tel || Ast_s_(e.telefone), email: email, site: Ast_s_(e.site) };
}
function AstL_indisponivel_() { return { ok: false, codigo: 'INDISPONIVEL', message: AST_LINK_INDISPONIVEL, contato: AstL_contato_() }; }
function AstL_cpfValido_(v) {
  var d = Ast_s_(v).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  var dv = function (n) { var s = 0; for (var i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); var r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
function AstL_mascaraDoc_(v) { var d = Ast_s_(v).replace(/\D/g, ''); return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : ''; }

// ------------------------------------------------------------
// CONTEÚDO DO ORÇAMENTO (o que o cliente vê, com o resumo que prova o que foi aceito)
// ------------------------------------------------------------
function AstL_itens_(o) {
  return Ast_json_(o.ITENS_JSON, []).map(function (i) {
    var q = Number(i.quantidade) || 0, v = Math.round((Number(i.valorUnitario) || 0) * 100) / 100;
    return { tipo: Ast_up_(i.tipo) === 'PECA' ? 'PECA' : 'SERVICO', descricao: Ast_s_(i.descricao), codigo: Ast_s_(i.codigo), quantidade: q, unidade: Ast_s_(i.unidade), valorUnitario: v, total: Math.round(q * v * 100) / 100 };
  });
}
/** Dados canônicos e o resumo SHA-256: número, revisão, chamado, cliente, itens com valores, total, validade e condições. */
function AstL_conteudo_(o) {
  var dados = { numero: Ast_s_(o.NUMERO), revisao: Number(o.REVISAO) || 0, chamado: Ast_s_(o.CHAMADO_NUMERO), cliente: Ast_s_(o.CLIENTE_NOME), itens: AstL_itens_(o),
    total: Math.round((Number(o.VALOR_TOTAL) || 0) * 100) / 100, validade: Ast_dia_(o.VALIDADE), condicoes: Ast_s_(o.CONDICOES) };
  return { dados: dados, sha: Ast_marca_(JSON.stringify(dados)) };
}
function AstL_pdfSha_(o) { try { return Ast_s_(o.PDF_ID) ? AstL_shaBytes_(DriveApp.getFileById(Ast_s_(o.PDF_ID)).getBlob().getBytes()) : ''; } catch (e) { return ''; } }
function AstL_vencido_(o) { var v = Ast_dia_(o.VALIDADE); return !!v && v < Ast_hoje_(); }
/** A última resposta registrada na trilha para o orçamento (link ou portal). */
function AstL_ultimaResposta_(oid) {
  var l = Ast_ler_(AST_ABAS.ORC_ACEITES).filter(function (a) { return Ast_s_(a.ORCAMENTO_ID) === Ast_s_(oid); });
  return l.length ? l[l.length - 1] : null;
}
function AstL_hashRegistro_(linha) { return Ast_marca_(JSON.stringify(AST_ACEITE_CAMPOS.map(function (k) { return Ast_s_(linha[k]); }))); }

/** O que a página pública (e o portal) mostra: sem nomes da equipe, sem dados internos, sem nada de outros clientes. */
function AstL_vista_(o) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {};
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(c.UNIDADE_ID)] || {};
  var itens = AstL_itens_(o), sit = Ast_up_(o.SITUACAO), vencido = AstL_vencido_(o);
  var v = { numero: Ast_s_(o.NUMERO), revisao: Number(o.REVISAO) || 0, chamadoNumero: Ast_s_(o.CHAMADO_NUMERO), emitidoEm: Ast_brDia_(o.EMITIDO_EM),
    cliente: Ast_s_(o.CLIENTE_NOME), unidade: [Ast_s_(un.NOME_UNIDADE), [Ast_s_(un.CIDADE), Ast_s_(un.UF)].filter(Boolean).join('/')].filter(Boolean).join(' · '),
    equipamento: Ast_s_(c.EQUIPAMENTO_TEXTO), problema: Ast_s_(c.SINTOMA).slice(0, 400),
    itens: itens.map(function (i, k) { return { n: k + 1, tipo: i.tipo === 'PECA' ? 'Peça' : 'Serviço', descricao: i.descricao, codigo: i.codigo,
      quantidadeTxt: Ast_fmtNum_(i.quantidade, Math.round(i.quantidade) === i.quantidade ? 0 : 2) + (i.unidade ? ' ' + i.unidade : ''), unitarioTxt: Ast_moeda_(i.valorUnitario), totalTxt: Ast_moeda_(i.total) }; }),
    totalTxt: Ast_moeda_(o.VALOR_TOTAL), validade: Ast_brDia_(o.VALIDADE), vencido: vencido, condicoes: Ast_s_(o.CONDICOES), temPdf: !!Ast_s_(o.PDF_ID), contato: AstL_contato_() };
  if (sit === 'EMITIDO') v.estado = vencido ? 'VENCIDO' : 'ABERTO';
  else {
    v.estado = 'RESPONDIDO';
    var a = AstL_ultimaResposta_(o.ID);
    var dec = a ? Ast_up_(a.DECISAO) : sit;
    v.resposta = { decisao: dec, decisaoNome: AST_DECISOES_NOMES[dec] || (AST_ORC_SITUACOES[sit] || sit), em: Ast_br_(a ? a.EM : o.DECIDIDO_EM), por: a ? Ast_s_(a.NOME) : Ast_s_(o.ACEITE_POR),
      canal: a ? (Ast_up_(a.CANAL) === 'PORTAL' ? 'pelo portal do cliente' : 'pelo link do orçamento') : 'registrada pela Metrolabs' };
  }
  return v;
}

// ------------------------------------------------------------
// LINKS
// ------------------------------------------------------------
/** Encerra os links ativos do orçamento (novo envio, revisão, invalidação). Chamar dentro da trava. */
function AstL_encerrarLinks_(oid, situacao, motivo) {
  delete AST_MEMO[AST_ABAS.ORC_LINKS];
  var n = 0;
  Ast_ler_(AST_ABAS.ORC_LINKS).forEach(function (l) {
    if (Ast_s_(l.ORCAMENTO_ID) !== Ast_s_(oid) || Ast_up_(l.SITUACAO) !== 'ATIVO') return;
    Ast_atualizar_(AST_ABAS.ORC_LINKS, l.ID, { SITUACAO: situacao, FIM_EM: Ast_agora_(), FIM_MOTIVO: Ast_texto_(motivo, 300) });
    n++;
  });
  delete AST_MEMO[AST_ABAS.ORC_LINKS];
  return n;
}
/** Cria o link de um envio (invalida o anterior). Devolve { token, url, link }. O token só existe aqui e no e-mail. */
function AstL_criar_(eu, o, canal, para, pedidoId) {
  var token = AstL_novoToken_(), url = AstL_url_(token);
  var r = Ast_comTrava_(function () {
    AstL_encerrarLinks_(o.ID, 'INVALIDADO', canal === 'COPIADO' ? 'Trocado por um link novo gerado para copiar' : 'Trocado por um novo envio ao cliente');
    return Ast_inserir_(AST_ABAS.ORC_LINKS, { ORCAMENTO_ID: o.ID, ORCAMENTO_NUMERO: o.NUMERO, REVISAO: Number(o.REVISAO) || 0, CHAMADO_ID: o.CHAMADO_ID, CLIENTE_ID: o.CLIENTE_ID,
      TOKEN_SHA256: AstL_resumoToken_(token), CONTEUDO_SHA256: AstL_conteudo_(o).sha, PEDIDO_ID: Ast_s_(pedidoId), CANAL: canal, ENVIADO_PARA: Ast_texto_(para, 500),
      VALIDO_ATE: Ast_agora_(Date.now() + AstL_dias_() * 86400000), SITUACAO: 'ATIVO', VISTAS: 0, CONTATO_EMAIL: Ast_s_(eu.email), POR_ID: eu.id, POR_NOME: eu.nome });
  });
  return { token: token, url: url, link: r };
}
function AstL_linkPorToken_(token) {
  if (!AstL_tokenValido_(token)) return null;
  var h = AstL_resumoToken_(token);
  return Ast_ler_(AST_ABAS.ORC_LINKS).filter(function (l) { return Ast_s_(l.TOKEN_SHA256) === h; })[0] || null;
}
/** Link que ainda abre a página: ativo ou já respondido, dentro da validade, e o orçamento não foi substituído. */
function AstL_abrir_(token) {
  var l = AstL_linkPorToken_(token);
  if (!l || ['ATIVO', 'RESPONDIDO'].indexOf(Ast_up_(l.SITUACAO)) < 0) return null;
  var ate = Ast_ms_(l.VALIDO_ATE);
  if (ate === null || Date.now() > ate) return null;
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, l.ORCAMENTO_ID);
  if (!o || Ast_up_(o.SITUACAO) === 'SUBSTITUIDO' || Ast_up_(o.SITUACAO) === 'RASCUNHO') return null;
  return { l: l, o: o };
}
function AstL_ctx_(ctx) {
  ctx = ctx || {};
  return { ip: Ast_s_(ctx.ip).replace(/[^0-9a-fA-F:.]/g, '').slice(0, 64), navegador: Ast_texto_(ctx.navegador, 300).replace(/[\r\n]+/g, ' ') };
}

// ------------------------------------------------------------
// ROTA PÚBLICA (só pelo servidor: /orcamento/)
// ------------------------------------------------------------
/** Abre o orçamento do link. ctx: { ip, navegador } (do servidor). Nunca lança. */
function Assistencia_orcLinkVer_(token, ctx) {
  try {
    Ast_memoLimpar_();
    try { Ast_garantirAbas_(); } catch (e0) {}
    var a = AstL_abrir_(token);
    if (!a) return AstL_indisponivel_();
    var agora = Ast_agora_(), primeira = !Ast_s_(a.l.VISTO_EM);
    Ast_atualizar_(AST_ABAS.ORC_LINKS, a.l.ID, { VISTO_EM: Ast_s_(a.l.VISTO_EM) || agora, VISTO_ULTIMO_EM: agora, VISTAS: (Number(a.l.VISTAS) || 0) + 1 });
    if (primeira && Ast_s_(a.o.CHAMADO_ID)) Ast_evento_('CHAMADO', a.o.CHAMADO_ID, 'ORCAMENTO_VISTO', Ast_sistema_('Link do orçamento'), 'Cliente abriu o link do orçamento ' + Ast_s_(a.o.NUMERO) + ' (rev. ' + (Number(a.o.REVISAO) || 0) + ')', { numero: a.o.CHAMADO_NUMERO });
    return { ok: true, orcamento: AstL_vista_(a.o) };
  } catch (e) {
    console.error('Assistência, link do orçamento (ver): ' + ((e && e.message) || e));
    return { ok: false, codigo: 'ERRO', message: 'Não foi possível abrir o orçamento agora. Tente de novo em alguns minutos; se continuar, fale com a Metrolabs.', contato: AstL_contato_() };
  }
}
/** PDF do orçamento do link: { ok, nome, base64 }. Nunca lança. */
function Assistencia_orcLinkPdf_(token) {
  try {
    Ast_memoLimpar_();
    var a = AstL_abrir_(token);
    if (!a || !Ast_s_(a.o.PDF_ID)) return AstL_indisponivel_();
    var b = DriveApp.getFileById(Ast_s_(a.o.PDF_ID)).getBlob();
    return { ok: true, nome: 'Orcamento ' + Ast_s_(a.o.NUMERO) + ' rev' + (Number(a.o.REVISAO) || 0) + '.pdf', base64: Utilities.base64Encode(b.getBytes()) };
  } catch (e) {
    console.error('Assistência, link do orçamento (PDF): ' + ((e && e.message) || e));
    return { ok: false, codigo: 'ERRO', message: 'Não foi possível baixar o PDF agora. Tente de novo em alguns minutos.', contato: AstL_contato_() };
  }
}
/** Resposta do cliente pelo link. d: { decisao, nome, cargo, documento, email, texto, concordo, assinatura }. Nunca lança. */
function Assistencia_orcLinkResponder_(token, d, ctx) {
  try {
    Ast_memoLimpar_();
    try { Ast_garantirAbas_(); } catch (e0) {}
    var a = AstL_abrir_(token);
    if (!a) return AstL_indisponivel_();
    var r = AstL_responder_(a.o, a.l, d, Object.assign(AstL_ctx_(ctx), { canal: 'LINK', usuarioId: '' }));
    return r;
  } catch (e) {
    console.error('Assistência, link do orçamento (responder): ' + ((e && e.message) || e));
    return { ok: false, codigo: 'ERRO', message: 'Não foi possível registrar a resposta agora. Nada foi registrado; tente de novo em alguns minutos. Se continuar, fale com a Metrolabs.', contato: AstL_contato_() };
  }
}

// ------------------------------------------------------------
// RESPOSTA (link e portal)
// ------------------------------------------------------------
/** Confere a resposta. Devolve { x } ou { erro: { campo, message } }. */
function AstL_validar_(d) {
  d = d || {};
  var dec = Ast_up_(d.decisao), nome = Ast_texto_(d.nome, 120).replace(/\s+/g, ' ').trim(), email = Ast_s_(d.email).toLowerCase().slice(0, 160);
  var cargo = Ast_texto_(d.cargo, 80).trim(), doc = Ast_s_(d.documento).replace(/\D/g, ''), texto = Ast_texto_(d.texto, 1500).trim(), ass = Ast_s_(d.assinatura);
  var erro = function (campo, m) { return { erro: { campo: campo, message: m } }; };
  if (['APROVADO', 'RECUSADO', 'AJUSTE'].indexOf(dec) < 0) return erro('decisao', 'Escolha uma resposta: aprovar, pedir ajuste ou recusar.');
  if (nome.length < 5 || nome.split(' ').length < 2) return erro('nome', 'Informe o nome completo (nome e sobrenome).');
  if (!/^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(email)) return erro('email', 'Informe um e-mail completo (nome@empresa.com.br): a confirmação vai para ele.');
  if (dec === 'APROVADO') {
    if (cargo.length < 2) return erro('cargo', 'Informe o seu cargo ou função (ex.: gerente de enfermagem, engenheiro clínico).');
    if (doc && !AstL_cpfValido_(doc)) return erro('documento', 'O CPF não confere. Corrija os números ou deixe em branco (é opcional).');
    if (d.concordo !== true) return erro('concordo', 'Marque "Li e concordo" para aprovar.');
    if (!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(ass) || ass.length < 800 || ass.length > 200000) return erro('assinatura', 'Assine no quadro (com o dedo ou o mouse) antes de aprovar.');
  } else if (texto.length < 5) return erro('texto', dec === 'RECUSADO' ? 'Escreva o motivo da recusa (ajuda a Metrolabs a propor outra solução).' : 'Escreva o ajuste que você precisa no orçamento.');
  return { x: { decisao: dec, nome: nome, email: email, cargo: dec === 'APROVADO' ? cargo : cargo, documento: doc, texto: texto, assinatura: dec === 'APROVADO' ? ass : '' } };
}
/**
 * Registra a resposta (link ou portal): confere tudo de novo dentro da trava, guarda a assinatura e a linha da trilha,
 * aplica a decisão pelo núcleo comum e, depois da trava, gera o comprovante (aprovação) e manda a confirmação por e-mail.
 * ctx: { canal: LINK|PORTAL, ip, navegador, usuarioId }.
 */
function AstL_responder_(o, l, d, ctx) {
  var v = AstL_validar_(d);
  if (v.erro) return { ok: false, codigo: 'ENTRADA', campo: v.erro.campo, message: v.erro.message };
  var x = v.x;
  if (Ast_up_(o.SITUACAO) !== 'EMITIDO') { var vr = AstL_vista_(o); return { ok: false, codigo: 'RESPONDIDO', message: 'Este orçamento já foi respondido' + (vr.resposta ? ' em ' + vr.resposta.em + ' por ' + vr.resposta.por : '') + '. Não é possível responder de novo. Se precisar mudar algo, fale com a Metrolabs.', orcamento: vr }; }
  if (AstL_vencido_(o) && x.decisao === 'APROVADO') return { ok: false, codigo: 'VENCIDO', message: 'Este orçamento venceu em ' + Ast_brDia_(o.VALIDADE) + ' e não pode mais ser aprovado. Peça uma revisão à Metrolabs; você ainda pode pedir ajuste.', orcamento: AstL_vista_(o) };
  var conteudo = AstL_conteudo_(o);
  if (l && Ast_s_(l.CONTEUDO_SHA256) && Ast_s_(l.CONTEUDO_SHA256) !== conteudo.sha) {
    return { ok: false, codigo: 'CONTEUDO', message: 'O orçamento mudou depois do envio deste link. Nada foi registrado. Peça à Metrolabs o envio da versão atual.', contato: AstL_contato_() };
  }
  var pdfSha = AstL_pdfSha_(o);
  var eu = Ast_sistema_(x.nome + (ctx.canal === 'PORTAL' ? ' (portal do cliente)' : ' (link do orçamento)'));
  eu.comoUsuarioId = (l && Ast_s_(l.POR_ID)) || Ast_s_(o.POR_ID);
  var registro = null, ja = null;
  try {
    Ast_comTrava_(function () {
      Ast_memoTirar_(AST_ABAS.ORCAMENTOS); delete AST_MEMO[AST_ABAS.ORC_LINKS]; delete AST_MEMO[AST_ABAS.ORC_ACEITES];
      var atual = Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID);
      if (!atual || Ast_up_(atual.SITUACAO) !== 'EMITIDO') { ja = atual || o; throw new Error('RESPONDIDO'); }
      if (l) { var lAtual = Ast_porId_(AST_ABAS.ORC_LINKS, l.ID); if (!lAtual || Ast_up_(lAtual.SITUACAO) !== 'ATIVO') { ja = atual; throw new Error('RESPONDIDO'); } }
      var ass = null;
      if (x.assinatura) {
        var bytes = Utilities.base64Decode(x.assinatura.replace(/^data:image\/png;base64,/, ''));
        var f = Ast_pastaPrivadaOS_(o.CHAMADO_NUMERO).createFile(Utilities.newBlob(bytes, 'image/png', 'Assinatura do aceite ' + o.NUMERO + ' rev' + (Number(o.REVISAO) || 0) + '.png'));
        Ast_privado_(f);
        ass = { id: f.getId(), sha: AstL_shaBytes_(bytes) };
      }
      var trilha = Ast_ler_(AST_ABAS.ORC_ACEITES), ant = trilha.length ? Ast_s_(trilha[trilha.length - 1].REGISTRO_SHA256) : '';
      var linha = { ORCAMENTO_ID: o.ID, ORCAMENTO_NUMERO: o.NUMERO, REVISAO: Number(o.REVISAO) || 0, CHAMADO_ID: o.CHAMADO_ID, CHAMADO_NUMERO: o.CHAMADO_NUMERO, CLIENTE_ID: o.CLIENTE_ID,
        LINK_ID: l ? l.ID : '', CANAL: ctx.canal, DECISAO: x.decisao, NOME: x.nome, CARGO: x.cargo, DOCUMENTO: x.documento, EMAIL: x.email, TEXTO: x.texto, IP: ctx.ip || '',
        NAVEGADOR: ctx.navegador || '', USUARIO_ID: Ast_s_(ctx.usuarioId), EM: Ast_agora_(), ASSINATURA_ARQUIVO_ID: ass ? ass.id : '', ASSINATURA_SHA256: ass ? ass.sha : '',
        CONTEUDO_SHA256: conteudo.sha, PDF_SHA256: pdfSha, VALOR_TOTAL: Math.round((Number(o.VALOR_TOTAL) || 0) * 100) / 100, ANTERIOR_SHA256: ant };
      linha.REGISTRO_SHA256 = AstL_hashRegistro_(linha);
      registro = Ast_inserir_(AST_ABAS.ORC_ACEITES, linha);
      if (l) Ast_atualizar_(AST_ABAS.ORC_LINKS, l.ID, { SITUACAO: 'RESPONDIDO', RESPONDIDO_EM: linha.EM });
      AstR_aplicarDecisao_(eu, atual, { decisao: x.decisao, por: x.nome + (x.cargo ? ' (' + x.cargo + ')' : ''), texto: x.texto, canal: ctx.canal, registroId: registro.ID, comprarPecas: true });
    });
  } catch (e) {
    if (ja || /já foi respondido|RESPONDIDO/.test(String((e && e.message) || e))) {
      Ast_memoLimpar_();
      var vj = AstL_vista_(Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID) || o);
      return { ok: false, codigo: 'RESPONDIDO', message: 'Este orçamento já foi respondido' + (vj.resposta ? ' em ' + vj.resposta.em + ' por ' + vj.resposta.por : '') + '. Não é possível responder de novo.', orcamento: vj };
    }
    throw e;
  }
  // depois da trava: comprovante e confirmação ao cliente (falha aqui não desfaz a resposta: a gestão gera o comprovante de novo)
  Ast_memoLimpar_();
  var comp = null;
  if (x.decisao === 'APROVADO') {
    try { comp = AstL_gerarComprovante_(o.ID, registro.ID, x.assinatura); }
    catch (e2) { console.error('Assistência, comprovante do aceite: ' + ((e2 && e2.message) || e2)); Ast_evento_('CHAMADO', o.CHAMADO_ID, 'COMPROVANTE', eu, 'Comprovante de aprovação não gerado: ' + String((e2 && e2.message) || e2).slice(0, 200) + '. Gere de novo pela ficha do orçamento.', { numero: o.CHAMADO_NUMERO }); }
  }
  var env = AstL_confirmarCliente_(Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID) || o, registro, comp, l);
  Ast_memoLimpar_();
  var vista = AstL_vista_(Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID) || o);
  var msgs = { APROVADO: 'Recebemos a sua aprovação do orçamento ' + o.NUMERO + '. A equipe técnica da Metrolabs segue com o atendimento e entra em contato para combinar a data.',
    RECUSADO: 'Recebemos a sua recusa do orçamento ' + o.NUMERO + '. A Metrolabs vai analisar o motivo e entrar em contato.',
    AJUSTE: 'Recebemos o seu pedido de ajuste no orçamento ' + o.NUMERO + '. A Metrolabs vai revisar e enviar uma nova versão.' };
  return { ok: true, message: msgs[x.decisao] + (env.para.length ? ' A confirmação foi enviada para ' + env.para.join(', ') + '.' : ''), protocolo: Ast_s_(registro.ID), em: Ast_br_(registro.EM),
    confirmacaoPara: env.para, orcamento: vista };
}

// ------------------------------------------------------------
// COMPROVANTE DE APROVAÇÃO (A4 HTML + PDF) E CONFIRMAÇÃO AO CLIENTE
// ------------------------------------------------------------
function AstL_htmlComprovante_(o, a, assinaturaDataUrl) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {}, cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(o.CLIENTE_ID)] || {};
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(c.UNIDADE_ID)] || {}, itens = AstL_itens_(o);
  var corpo = RelA4_secao_('Orçamento aprovado', RelA4_identificacao_([['Orçamento', Ast_s_(o.NUMERO) + ' (revisão ' + (Number(o.REVISAO) || 0) + ')'], ['Chamado', Ast_s_(o.CHAMADO_NUMERO)],
    ['Cliente', Ast_s_(o.CLIENTE_NOME), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Unidade', Ast_s_(un.NOME_UNIDADE)], ['Equipamento', Ast_s_(c.EQUIPAMENTO_TEXTO), { largo: true }],
    ['Emitido em', Ast_brDia_(o.EMITIDO_EM)], ['Validade', Ast_brDia_(o.VALIDADE)]]));
  var linhas = itens.map(function (i, k) { return [String(k + 1), { html: '<b>' + Ast_esc_(i.descricao) + '</b>' + (i.codigo ? '<span class="sub">Código ' + Ast_esc_(i.codigo) + '</span>' : '') }, i.tipo === 'PECA' ? 'Peça' : 'Serviço', Ast_fmtNum_(i.quantidade, Math.round(i.quantidade) === i.quantidade ? 0 : 2) + ' ' + i.unidade, Ast_moeda_(i.valorUnitario), Ast_moeda_(i.total)]; });
  corpo += RelA4_secao_('Itens aprovados', RelA4_tabela_([{ t: 'Nº', cen: true, w: '7mm' }, { t: 'Descrição' }, { t: 'Tipo' }, { t: 'Qtd.', num: true }, { t: 'Unitário', num: true }, { t: 'Total', num: true }], linhas, { total: ['', 'Total aprovado', '', '', '', Ast_moeda_(o.VALOR_TOTAL)] }) +
    (Ast_s_(o.CONDICOES) ? RelA4_paragrafos_('Condições: ' + o.CONDICOES) : ''));
  corpo += RelA4_secao_('Aprovação do cliente', RelA4_identificacao_([['Nome', Ast_s_(a.NOME), { largo: true }], ['Cargo', Ast_s_(a.CARGO)], ['CPF', Ast_s_(a.DOCUMENTO) ? AstL_mascaraDoc_(a.DOCUMENTO) : 'não informado'],
    ['E-mail', Ast_s_(a.EMAIL)], ['Data e hora (servidor, Brasília)', Ast_br_(a.EM)], ['Meio', Ast_up_(a.CANAL) === 'PORTAL' ? 'Portal do cliente do SGO+ (acesso com usuário e senha)' : 'Link do orçamento enviado por e-mail'],
    ['Endereço de rede (IP)', Ast_s_(a.IP) || 'não registrado'], ['Navegador', Ast_s_(a.NAVEGADOR).slice(0, 160) || 'não registrado', { largo: true }]]) +
    '<p>O cliente declarou ter lido o orçamento e concordar com os itens, os valores e as condições acima.</p>' +
    (assinaturaDataUrl ? '<div style="margin:3mm 0;padding:2mm;border:1px solid #c9cfc9;border-radius:2mm;max-width:90mm"><img src="' + Ast_esc_(assinaturaDataUrl) + '" alt="Assinatura" style="width:100%;height:auto;display:block"><p class="nota" style="margin:1mm 0 0">Assinatura feita na tela por ' + Ast_esc_(a.NOME) + '</p></div>' : ''));
  corpo += RelA4_secao_('Conferência de integridade', RelA4_identificacao_([['Protocolo do registro', Ast_s_(a.ID)], ['Resumo SHA-256 do conteúdo aprovado', Ast_s_(a.CONTEUDO_SHA256), { largo: true }],
    ['Resumo SHA-256 do PDF do orçamento', Ast_s_(a.PDF_SHA256) || 'PDF indisponível no momento do aceite', { largo: true }], ['Resumo SHA-256 da assinatura', Ast_s_(a.ASSINATURA_SHA256), { largo: true }],
    ['Resumo SHA-256 deste registro', Ast_s_(a.REGISTRO_SHA256), { largo: true }]]) +
    '<p class="nota">O registro é guardado só para inclusão (nunca é alterado) e encadeado ao registro anterior pelo resumo. Qualquer mudança no orçamento, no PDF ou neste registro muda o resumo correspondente.</p>');
  return RelA4_documento_({ titulo: 'Comprovante de aprovação de orçamento', subtitulo: Ast_s_(o.CLIENTE_NOME), tituloCurto: 'Comprovante de aprovação', tituloArquivo: 'Comprovante de aprovacao', numero: Ast_s_(o.NUMERO),
    revisao: Number(o.REVISAO) || 0, identificacao: Ast_s_(o.CLIENTE_NOME), rotuloIdentificacao: 'Cliente', ficha: [['Total aprovado', Ast_moeda_(o.VALOR_TOTAL)], ['Aprovado em', Ast_br_(a.EM)]], corpo: corpo, capa: false, sumario: false });
}
/** Gera (ou gera de novo) o comprovante da aprovação e o liga ao orçamento como o aceite. Devolve { pdfId, pdfUrl, htmlId, nome, pdfBlob }. */
function AstL_gerarComprovante_(oid, registroId, assinaturaDataUrl) {
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, oid), a = Ast_porId_(AST_ABAS.ORC_ACEITES, registroId);
  if (!o || !a || Ast_up_(a.DECISAO) !== 'APROVADO') throw new Error('Não foi possível gerar o comprovante: a aprovação do orçamento não foi encontrada');
  var img = Ast_s_(assinaturaDataUrl);
  if (!img && Ast_s_(a.ASSINATURA_ARQUIVO_ID)) { var b = AstR_b64Arquivo_(a.ASSINATURA_ARQUIVO_ID); if (b) img = 'data:image/png;base64,' + b.data; }
  var html = AstL_htmlComprovante_(o, a, img);
  var nome = 'Comprovante de aprovacao - ' + o.NUMERO + ' rev' + (Number(o.REVISAO) || 0) + ' - ' + Ast_s_(o.CLIENTE_NOME).slice(0, 60);
  var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(o.CLIENTE_ID)] || {};
  var pasta = SGO_DocSalvar_pastaClienteEm_(SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_ORC_ID', AST_PASTA_ORCAMENTOS, ''), cli.CNPJ, o.CLIENTE_NOME || 'Sem cliente');
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { pdfBlob: fin.pdfBlob } : {});
  Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, { ACEITE_ARQUIVO_ID: g.pdfId, ACEITE_URL: g.pdfUrl, ACEITE_NOME: nome + '.pdf', ATUALIZADO_EM: Ast_agora_() });
  if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'COMPROVANTE', Ast_sistema_('Link do orçamento'), 'Comprovante de aprovação do orçamento ' + o.NUMERO + ' gerado (protocolo ' + a.ID + ')', { numero: o.CHAMADO_NUMERO });
  var blob = fin.pdfBlob || null;
  if (!blob) { try { blob = DriveApp.getFileById(g.pdfId).getBlob(); } catch (e) { blob = null; } }
  return { pdfId: g.pdfId, pdfUrl: g.pdfUrl, htmlId: g.htmlId, nome: nome, pdfBlob: blob };
}
/** E-mail de confirmação ao cliente (quem respondeu e o e-mail do envio do link); na aprovação, com o comprovante. Nunca lança. */
function AstL_confirmarCliente_(o, a, comp, l) {
  var para = [];
  [Ast_s_(a && a.EMAIL)].concat(Ast_s_(l && l.ENVIADO_PARA).split(/[,;\s]+/)).forEach(function (e) {
    e = Ast_s_(e).toLowerCase();
    if (/^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(e) && para.indexOf(e) < 0 && para.length < 3) para.push(e);
  });
  if (!para.length) return { para: [] };
  var dec = Ast_up_(a.DECISAO), ct = AstL_contato_();
  var assunto = ({ APROVADO: 'Aprovação registrada', RECUSADO: 'Recusa registrada', AJUSTE: 'Pedido de ajuste registrado' }[dec]) + ': orçamento ' + Ast_s_(o.NUMERO) + ' | Chamado ' + Ast_s_(o.CHAMADO_NUMERO) + ' | Metrolabs';
  var texto = 'Prezados(as),\n\n' +
    ({ APROVADO: 'Registramos a aprovação do orçamento ' + o.NUMERO + ' (revisão ' + (Number(o.REVISAO) || 0) + '), no valor total de ' + Ast_moeda_(o.VALOR_TOTAL) + ', feita por ' + a.NOME + (a.CARGO ? ' (' + a.CARGO + ')' : '') + ' em ' + Ast_br_(a.EM) + '.\n\nO comprovante de aprovação segue em anexo, com os itens, os valores, a assinatura e os resumos de conferência. A equipe técnica da Metrolabs segue com o atendimento e entra em contato para combinar a data.',
      RECUSADO: 'Registramos a recusa do orçamento ' + o.NUMERO + ' feita por ' + a.NOME + ' em ' + Ast_br_(a.EM) + '.\nMotivo informado: ' + a.TEXTO + '\n\nA Metrolabs vai analisar o motivo e entrar em contato.',
      AJUSTE: 'Registramos o pedido de ajuste no orçamento ' + o.NUMERO + ' feito por ' + a.NOME + ' em ' + Ast_br_(a.EM) + '.\nAjuste pedido: ' + a.TEXTO + '\n\nA Metrolabs vai revisar o orçamento e enviar uma nova versão.' }[dec]) +
    '\n\nProtocolo do registro: ' + a.ID + '.' + (ct.telefone || ct.email ? '\nContato: ' + [ct.telefone, ct.email].filter(Boolean).join(' · ') : '') + '\n\nAtenciosamente,\nMetrolabs';
  try {
    var msg = { to: para.join(','), subject: assunto, body: texto, name: 'Metrolabs',
      htmlBody: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2a24;max-width:640px">' + texto.split(/\n{2,}/).map(function (p) { return '<p style="margin:0 0 12px">' + Ast_esc_(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div>' };
    if (comp && comp.pdfBlob) { var b = comp.pdfBlob; try { b.setName(comp.nome + '.pdf'); } catch (x) {} msg.attachments = [b]; }
    if (ct.email) msg.replyTo = ct.email;
    MailApp.sendEmail(msg);
    if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ENVIADO_CLIENTE', Ast_sistema_('Link do orçamento'), 'Confirmação da resposta ao orçamento ' + o.NUMERO + ' enviada por e-mail para ' + para.join(', ') + (comp ? ' (com o comprovante)' : ''), { numero: o.CHAMADO_NUMERO, publico: true });
    return { para: para };
  } catch (e) {
    console.error('Assistência, confirmação do aceite: ' + ((e && e.message) || e));
    if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ENVIADO_CLIENTE', Ast_sistema_('Link do orçamento'), 'Confirmação ao cliente não saiu: ' + String((e && e.message) || e).slice(0, 200) + '. Envie o comprovante pelo Enviar documento.', { numero: o.CHAMADO_NUMERO });
    return { para: [] };
  }
}

// ------------------------------------------------------------
// TELA INTERNA (gestão, Comercial, Financeiro)
// ------------------------------------------------------------
/** Bloco "Aceite do cliente" da ficha do orçamento. */
function AstL_aceiteTela_(o) {
  var links = Ast_ler_(AST_ABAS.ORC_LINKS).filter(function (l) { return Ast_s_(l.ORCAMENTO_ID) === Ast_s_(o.ID); });
  var l = links.length ? links[links.length - 1] : null, a = AstL_ultimaResposta_(o.ID);
  var nomes = { ATIVO: 'Ativo (aguardando a resposta)', RESPONDIDO: 'Respondido pelo link', INVALIDADO: 'Invalidado', SUBSTITUIDO: 'Revogado pela revisão' };
  var vencido = l && Ast_up_(l.SITUACAO) === 'ATIVO' && Ast_ms_(l.VALIDO_ATE) !== null && Date.now() > Ast_ms_(l.VALIDO_ATE);
  return {
    link: l ? { situacao: vencido ? 'VENCIDO' : Ast_up_(l.SITUACAO), situacaoNome: vencido ? 'Vencido em ' + Ast_br_(l.VALIDO_ATE) : (nomes[Ast_up_(l.SITUACAO)] || l.SITUACAO), canal: Ast_up_(l.CANAL) === 'COPIADO' ? 'Link copiado' : 'E-mail',
      enviadoPara: Ast_s_(l.ENVIADO_PARA), criadoEm: Ast_br_(l.CRIADO_EM), porNome: Ast_s_(l.POR_NOME), validoAte: Ast_br_(l.VALIDO_ATE), vistoEm: Ast_br_(l.VISTO_EM), vistoUltimoEm: Ast_br_(l.VISTO_ULTIMO_EM),
      vistas: Number(l.VISTAS) || 0, respondidoEm: Ast_br_(l.RESPONDIDO_EM), fimMotivo: Ast_s_(l.FIM_MOTIVO), fimEm: Ast_br_(l.FIM_EM) } : null,
    envios: links.length,
    resposta: a ? { protocolo: Ast_s_(a.ID), decisao: Ast_up_(a.DECISAO), decisaoNome: AST_DECISOES_NOMES[Ast_up_(a.DECISAO)] || a.DECISAO, nome: Ast_s_(a.NOME), cargo: Ast_s_(a.CARGO), email: Ast_s_(a.EMAIL),
      documento: AstL_mascaraDoc_(a.DOCUMENTO), texto: Ast_s_(a.TEXTO), em: Ast_br_(a.EM), canal: Ast_up_(a.CANAL) === 'PORTAL' ? 'Portal do cliente' : 'Link do orçamento', ip: Ast_s_(a.IP),
      assinatura: !!Ast_s_(a.ASSINATURA_ARQUIVO_ID), integro: AstL_hashRegistro_(a) === Ast_s_(a.REGISTRO_SHA256), conteudoConfere: Ast_s_(a.CONTEUDO_SHA256) === AstL_conteudo_(o).sha } : null,
    comprovanteUrl: a && Ast_up_(a.DECISAO) === 'APROVADO' ? Ast_s_(o.ACEITE_URL) : '',
    podeEnviar: Ast_up_(o.SITUACAO) === 'EMITIDO' && !!Ast_s_(o.PDF_ID), podeInvalidar: !!(l && Ast_up_(l.SITUACAO) === 'ATIVO' && !vencido),
    podeGerarComprovante: !!(a && Ast_up_(a.DECISAO) === 'APROVADO' && Ast_s_(o.ACEITE_REGISTRO_ID) === Ast_s_(a.ID) && !Ast_s_(o.ACEITE_URL)),
    validadeDias: AstL_dias_()
  };
}
function AstL_obter_(eu, id, acao) {
  Ast_exigir_(eu, 'VALORES', acao);
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, id);
  if (!o) throw new Error('Não foi possível ' + acao + ': o orçamento não foi encontrado. Atualize a ficha do chamado');
  return o;
}
function AstL_exigirEmitido_(o, acao) {
  if (Ast_up_(o.SITUACAO) !== 'EMITIDO') throw new Error('Não foi possível ' + acao + ': o orçamento ' + o.NUMERO + ' está "' + (AST_ORC_SITUACOES[Ast_up_(o.SITUACAO)] || o.SITUACAO) + '". Só orçamento emitido e ainda sem resposta vai ao cliente com link');
  if (!Ast_s_(o.PDF_ID)) throw new Error('Não foi possível ' + acao + ': o orçamento ' + o.NUMERO + ' está sem o PDF. Emita o A4 de novo pela revisão');
  if (AstL_vencido_(o)) throw new Error('Não foi possível ' + acao + ': o orçamento ' + o.NUMERO + ' venceu em ' + Ast_brDia_(o.VALIDADE) + '. Faça uma nova revisão (botão "Nova revisão"), emita e envie a revisão');
}
/** Texto do e-mail do orçamento com a marca do link (a janela deixa editar; o link entra no lugar da marca). */
function AstL_textoEnvio_(o, eu) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(c.UNIDADE_ID)] || {}, rev = Number(o.REVISAO) || 0;
  var assunto = ('Orçamento ' + Ast_s_(o.NUMERO) + (rev > 0 ? ' (revisão ' + rev + ')' : '') + ' | Chamado ' + Ast_s_(o.CHAMADO_NUMERO) + ' | ' + Ast_s_(o.CLIENTE_NOME)).slice(0, 180);
  var texto = 'Prezados(as),\n\n' +
    'Encaminhamos o orçamento ' + Ast_s_(o.NUMERO) + (rev > 0 ? ' (revisão ' + rev + ', que substitui a anterior)' : '') + ', referente ao chamado ' + Ast_s_(o.CHAMADO_NUMERO) +
    (Ast_s_(c.EQUIPAMENTO_TEXTO) ? ', equipamento ' + Ast_s_(c.EQUIPAMENTO_TEXTO) : '') + (Ast_s_(un.NOME_UNIDADE) ? ' (' + Ast_s_(un.NOME_UNIDADE) + ')' : '') + '.\n' +
    'Total: ' + Ast_moeda_(o.VALOR_TOTAL) + '. Validade do orçamento: ' + Ast_brDia_(o.VALIDADE) + '.\n\n' +
    'Para ver o orçamento e responder (aprovar, pedir ajuste ou recusar), abra o link abaixo, no celular ou no computador. Na aprovação, quem aprova informa nome, cargo e e-mail e assina na tela; a resposta fica registrada com data e hora e a confirmação chega por e-mail.\n\n' +
    AST_LINK_MARCA + '\n\n' +
    'O PDF do orçamento segue em anexo. Se preferir, responda este e-mail com a aprovação.\n\n' +
    'Atenciosamente,\n' + (Ast_s_(eu && eu.nome) || 'Equipe Metrolabs') + '\nMetrolabs';
  return { assunto: assunto, texto: texto };
}
function AstL_previaEnvio_(eu, d) {
  var o = AstL_obter_(eu, d && d.id, 'preparar o envio');
  AstL_exigirEmitido_(o, 'preparar o envio');
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {};
  var t = AstL_textoEnvio_(o, eu);
  return { contatos: AstR_contatosEnvio_({ CLIENTE_ID: o.CLIENTE_ID, UNIDADE_ID: c.UNIDADE_ID, CHAMADO_ID: o.CHAMADO_ID }), assunto: t.assunto, texto: t.texto, marca: AST_LINK_MARCA, validadeDias: AstL_dias_(),
    aviso: AstL_aceiteTela_(o).podeInvalidar ? 'Este orçamento já tem um link ativo. Enviar de novo cria um link novo e o anterior deixa de funcionar.' : '' };
}
/**
 * Envia o orçamento por e-mail com o link de aceite, pelo Enviar documento (registro em DOC_ENVIOS e "enviado em" no
 * orçamento). d: { id, para:[{ nome, email }], mensagem, assunto, pedidoId }. O mesmo pedidoId não gera outro link.
 */
function AstL_enviar_(eu, d) {
  d = d || {};
  var o = AstL_obter_(eu, d.id, 'enviar o orçamento');
  AstL_exigirEmitido_(o, 'enviar o orçamento');
  if (!eu.sessionId || typeof EnviarDoc_apiEnviar !== 'function') throw new Error('Não foi possível enviar: o Enviar documento não está disponível nesta sessão. Atualize a página (F5) e tente de novo');
  var pedidoId = Ast_s_(d.pedidoId).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80);
  if (pedidoId.length < 8) pedidoId = ('orc-' + Ast_s_(o.ID) + '-' + Date.now()).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80);
  var repetido = Ast_ler_(AST_ABAS.ORC_LINKS).filter(function (l) { return Ast_s_(l.PEDIDO_ID) === pedidoId; })[0];
  if (repetido) return { repetido: true, message: 'Este envio já tinha sido feito em ' + Ast_br_(repetido.CRIADO_EM) + '; nada foi enviado de novo.', orcamento: AstR_orcPublico_(o, eu) };
  var para = (Array.isArray(d.para) ? d.para : [d.para]).map(function (p) { return typeof p === 'string' ? { nome: '', email: p } : (p || {}); })
    .map(function (p) { return { nome: Ast_texto_(p.nome, 120), email: Ast_s_(p.email).toLowerCase().trim() }; }).filter(function (p) { return p.email; });
  if (!para.length) throw new Error('Não foi possível enviar: escolha ou digite o e-mail do contato do cliente que vai receber o orçamento');
  var ruins = para.filter(function (p) { return !/^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(p.email); });
  if (ruins.length) throw new Error('Não foi possível enviar: o e-mail "' + ruins[0].email + '" não está completo (nome@dominio). Corrija e envie de novo');
  var t = AstL_textoEnvio_(o, eu), msg = Ast_texto_(d.mensagem, 8000) || t.texto;
  var link = AstL_criar_(eu, o, 'EMAIL', para.map(function (p) { return p.email; }).join(', '), pedidoId);
  var bloco = 'Ver e responder o orçamento: ' + link.url + '\n(link pessoal deste envio, válido até ' + Ast_br_(link.link.VALIDO_ATE).slice(0, 10) + ')';
  msg = msg.indexOf(AST_LINK_MARCA) >= 0 ? msg.split(AST_LINK_MARCA).join(bloco) : msg + '\n\n' + bloco;
  var r;
  try {
    r = EnviarDoc_apiEnviar(eu.sessionId, { pedidoId: pedidoId, arquivoId: Ast_s_(o.PDF_ID), htmlId: Ast_s_(o.HTML_ID), incluirHtml: false,
      dica: { clienteId: Ast_s_(o.CLIENTE_ID), numero: Ast_s_(o.NUMERO), titulo: 'Orçamento ' + Ast_s_(o.NUMERO) },
      destinatarios: para, canais: { email: true, whatsapp: false }, assunto: Ast_texto_(d.assunto, 180) || t.assunto, mensagemEmail: msg });
  } catch (e) { r = { ok: false, erro: String((e && e.message) || e) }; }
  var falha = r && (r.itens || []).filter(function (i) { return i.situacao === 'FALHOU'; })[0];
  if (!r || r.ok === false || (!r.enviados && falha)) {
    Ast_comTrava_(function () { Ast_atualizar_(AST_ABAS.ORC_LINKS, link.link.ID, { SITUACAO: 'INVALIDADO', FIM_EM: Ast_agora_(), FIM_MOTIVO: 'O e-mail do envio não saiu' }); });
    var m = String((r && (r.erro || r.message)) || (falha && falha.motivo) || 'o Enviar documento não respondeu').replace(/[.\s]+$/, '');
    throw new Error('Não foi possível enviar: ' + m + '. O link deste envio foi anulado; confira o e-mail e envie de novo');
  }
  AstL_tirarTokenDoRegistro_(pedidoId, link.token);
  Ast_memoLimpar_();
  var atual = Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID) || o;
  if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ORCAMENTO_LINK', eu, 'Link de aceite do orçamento ' + o.NUMERO + ' enviado para ' + para.map(function (p) { return p.email; }).join(', ') + ' (válido até ' + Ast_br_(link.link.VALIDO_ATE) + ')', { numero: o.CHAMADO_NUMERO });
  return { enviado: true, orcamento: AstR_orcPublico_(atual, eu),
    message: 'Orçamento ' + o.NUMERO + ' enviado por e-mail para ' + para.map(function (p) { return p.email; }).join(', ') + ' com o link de aceite (válido até ' + Ast_br_(link.link.VALIDO_ATE).slice(0, 10) + '). A resposta do cliente aparece aqui e a gestão é avisada.' };
}
/**
 * O Enviar documento guarda o texto do e-mail no histórico (DOC_ENVIOS). Depois que o e-mail saiu, o token sai do texto
 * guardado: só o resumo fica no sistema, e um "reenviar" pelo histórico não manda um link antigo. Nunca lança.
 */
function AstL_tirarTokenDoRegistro_(pedidoId, token) {
  try {
    if (!token || typeof ENVDOC_ABA === 'undefined') return;
    SGO_DATA.getAll(ENVDOC_ABA).forEach(function (r) {
      if (Ast_s_(r.PEDIDO_ID) !== Ast_s_(pedidoId) || Ast_s_(r.MENSAGEM).indexOf(token) < 0) return;
      SGO_DATA.update(ENVDOC_ABA, r.ID, { MENSAGEM: Ast_s_(r.MENSAGEM).split(token).join('[link pessoal do envio: o sistema guarda só o resumo; para outro link, use "Enviar com link de aceite" no orçamento]') });
    });
  } catch (e) { console.error('Assistência, histórico do envio do orçamento: ' + ((e && e.message) || e)); }
}
/** Gera um link novo para copiar (WhatsApp ou outro meio, feito por uma pessoa). Invalida o anterior. */
function AstL_copiar_(eu, d) {
  var o = AstL_obter_(eu, d && d.id, 'gerar o link');
  AstL_exigirEmitido_(o, 'gerar o link');
  var link = AstL_criar_(eu, o, 'COPIADO', Ast_texto_(d && d.para, 200) || 'link copiado', '');
  if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ORCAMENTO_LINK', eu, 'Link de aceite do orçamento ' + o.NUMERO + ' gerado para copiar (válido até ' + Ast_br_(link.link.VALIDO_ATE) + ')', { numero: o.CHAMADO_NUMERO });
  return { url: link.url, validoAte: Ast_br_(link.link.VALIDO_ATE), orcamento: AstR_orcPublico_(o, eu),
    message: 'Link novo gerado (válido até ' + Ast_br_(link.link.VALIDO_ATE).slice(0, 10) + '). O link enviado antes deixou de funcionar. Copie e mande ao cliente.' };
}
function AstL_invalidar_(eu, d) {
  var o = AstL_obter_(eu, d && d.id, 'invalidar o link');
  var motivo = Ast_texto_(d && d.motivo, 300).trim();
  if (motivo.length < 5) throw new Error('Não foi possível invalidar: escreva o motivo (ex.: "enviado ao contato errado")');
  var n = Ast_comTrava_(function () { return AstL_encerrarLinks_(o.ID, 'INVALIDADO', motivo + ' (por ' + eu.nome + ')'); });
  if (!n) throw new Error('Não foi possível invalidar: o orçamento ' + o.NUMERO + ' não tem link ativo. Nada mudou');
  if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ORCAMENTO_LINK', eu, 'Link de aceite do orçamento ' + o.NUMERO + ' invalidado: ' + motivo, { numero: o.CHAMADO_NUMERO });
  return { orcamento: AstR_orcPublico_(o, eu), message: 'Link invalidado. Quem abrir o link antigo vê que ele não está mais disponível e o contato da Metrolabs. Para o cliente responder, envie de novo.' };
}
function AstL_comprovanteDeNovo_(eu, d) {
  var o = AstL_obter_(eu, d && d.id, 'gerar o comprovante');
  if (!Ast_s_(o.ACEITE_REGISTRO_ID)) throw new Error('Não foi possível gerar: o orçamento ' + o.NUMERO + ' não foi aprovado pelo link nem pelo portal. Na aprovação registrada à mão, o aceite anexado é o comprovante');
  var g = AstL_gerarComprovante_(o.ID, o.ACEITE_REGISTRO_ID, '');
  return { orcamento: AstR_orcPublico_(Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID) || o, eu), url: g.pdfUrl, message: 'Comprovante de aprovação gerado e ligado ao orçamento ' + o.NUMERO + '.' };
}

// ------------------------------------------------------------
// PORTAL "MEUS CHAMADOS" (cliente com login responde sem link)
// ------------------------------------------------------------
function AstL_portalOrcamentos_(eu) {
  return Ast_ler_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CLIENTE_ID) === Ast_s_(eu.clienteId) && ['EMITIDO', 'APROVADO', 'RECUSADO', 'AJUSTE'].indexOf(Ast_up_(o.SITUACAO)) >= 0; })
    .sort(function (a, b) { return String(b.EMITIDO_EM).localeCompare(String(a.EMITIDO_EM)); }).slice(0, 20)
    .map(function (o) { var v = AstL_vista_(o); v.id = o.ID; v.pdfUrl = Ast_s_(o.PDF_URL); return v; });
}
/** d: { id, decisao, nome, cargo, documento, email, texto, concordo, assinatura, navegador } */
function AstL_responderPortal_(eu, d) {
  Ast_exigir_(eu, 'CLIENTE', 'responder o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o || Ast_s_(o.CLIENTE_ID) !== Ast_s_(eu.clienteId) || ['RASCUNHO', 'SUBSTITUIDO'].indexOf(Ast_up_(o.SITUACAO)) >= 0) throw new Error('Não foi possível responder: o orçamento não foi encontrado entre os seus. Atualize a página (F5)');
  var r = AstL_responder_(o, null, d, { canal: 'PORTAL', ip: '', navegador: Ast_texto_(d && d.navegador, 300), usuarioId: eu.id });
  if (!r.ok) throw new Error('Não foi possível responder: ' + String(r.message || '').replace(/[.\s]+$/, ''));
  return { message: r.message, protocolo: r.protocolo, orcamento: r.orcamento };
}
