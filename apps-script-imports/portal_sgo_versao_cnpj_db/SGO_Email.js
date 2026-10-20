/**
 * ============================================================
 * E-MAIL INTEGRADO DE CADA COLABORADOR (21/10/2026) — servidor
 * ============================================================
 * Um "Outlook" dentro do SGO+: cada colaborador conecta a própria caixa @metrolabs (endereço e senha da caixa,
 * testados antes de gravar) e lê, escreve, responde, encaminha, anexa, move e apaga pela tela E-mail.
 *
 * Onde fica cada coisa:
 *   - caixa, senha e leitura: no servidor próprio (global SGO_EMAIL → sgo_servidor/src/servicos/emailPessoal.ts).
 *     A senha é cifrada com a chave do servidor assim que chega e NUNCA volta para cá nem para a tela. Este arquivo
 *     só repassa o usuário que a sessão validou: ninguém (nem Administrador, nem Gestão) abre a caixa de outra pessoa.
 *   - cliente: o remetente é comparado com CAD_CLIENTES.EMAIL (endereço exato) e com o domínio do e-mail do
 *     cliente (se não for provedor público como gmail.com); "Registrar no cliente" grava EML_CLIENTE_REGISTROS.
 *   - pendências: Email_pendencias_ é fonte da central (SGO_Alertas_Central.js, PEND_FONTES):
 *       email_cliente_nao_lido      e-mail de cliente não lido há mais de N horas úteis (padrão 4) — só a própria pessoa;
 *       email_cliente_sem_resposta  lido e sem resposta há mais de M horas úteis (padrão 8) — só a própria pessoa;
 *       email_cliente_parado        sem resposta há mais de E horas úteis (padrão 16 = 2 dias úteis) — gestão
 *                                   (entra na Caixa de decisões e na escada de cobrança: GES_TIPOS). Sem assunto nem texto.
 *     WhatsApp: nunca um aviso por e-mail; a gestão recebe no resumo diário da escada (regra sutil).
 *   - envio como usuário (outras equipes, ex.: "Enviar ao cliente" dos documentos): SGO_Email_enviarComoUsuario_.
 *
 * No Google (sem SGO_EMAIL) a tela explica que o e-mail integrado só funciona no servidor próprio.
 */

var EMAIL_CFG_PROP = 'EMAIL_INTEGRADO_CFG';
var EMAIL_CFG_PADRAO = { horasNaoLido: 4, horasSemResposta: 8, horasGestao: 16 };
var EMAIL_ABA_REGISTROS = 'EML_CLIENTE_REGISTROS';
var EMAIL_COLUNAS_REGISTROS = ['ID', 'CLIENTE_ID', 'CLIENTE_NOME', 'USUARIO_ID', 'USUARIO_NOME', 'CAIXA', 'REMETENTE', 'ASSUNTO', 'DATA_EMAIL', 'RESUMO', 'MESSAGE_ID', 'CRIADO_EM'];
var EMAIL_DOMINIOS_PUBLICOS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.com.br',
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br', 'icloud.com', 'me.com', 'globo.com', 'globomail.com', 'r7.com', 'zipmail.com.br', 'protonmail.com', 'proton.me'];

function Email_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/** O servidor próprio tem o e-mail integrado? */
function Email_disponivel_() {
  return typeof SGO_EMAIL !== 'undefined' && !!SGO_EMAIL && typeof SGO_EMAIL.chamar === 'function';
}
var EMAIL_MSG_SEM_SERVIDOR = 'O e-mail integrado só funciona no servidor próprio do SGO+ (https://sgo.metrolabs.com.br). Entre por esse endereço e abra E-mail de novo.';

function Email_config_() {
  var c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty(EMAIL_CFG_PROP) || '{}') || {}; } catch (e) { c = {}; }
  var n = function (v, p) { v = Number(v); return isFinite(v) && v > 0 && v <= 200 ? v : p; };
  return { horasNaoLido: n(c.horasNaoLido, EMAIL_CFG_PADRAO.horasNaoLido), horasSemResposta: n(c.horasSemResposta, EMAIL_CFG_PADRAO.horasSemResposta), horasGestao: n(c.horasGestao, EMAIL_CFG_PADRAO.horasGestao) };
}

/** Quem está na tela (da sessão). Cliente não usa o e-mail integrado. */
function Email_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (perfil === 'CLIENTE') throw new Error('O e-mail integrado é da equipe interna da Metrolabs. Para falar com a Metrolabs, use os contatos do seu portal.');
  return Email_euDoId_(s.userId, s);
}
function Email_euDoId_(id, sessao) {
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, id); } catch (e) { u = null; }
  var perfil = SGO_UTILS.safeUpper((sessao && sessao.perfil) || (u && u.PERFIL));
  var area = '';
  try { area = typeof SGO_areaDoUsuario_ === 'function' ? SGO_areaDoUsuario_(u || {}).codigo : Email_s_(u && u.AREA).toUpperCase(); } catch (e) { area = ''; }
  return {
    id: Email_s_(id), nome: Email_s_((sessao && sessao.nome) || (u && u.NOME) || (u && u.USUARIO)), perfil: perfil,
    area: area, email: Email_s_(u && u.EMAIL).toLowerCase(), ativo: !u || SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO',
    admin: perfil === 'ADMIN', gestao: typeof isAdminPerfilAuth_ === 'function' ? isAdminPerfilAuth_(perfil) : (perfil === 'ADMIN' || perfil === 'GESTOR' || perfil === 'DIRETORIA')
  };
}

function Email_chamar_(eu, acao, dados) {
  if (!Email_disponivel_()) throw new Error(EMAIL_MSG_SEM_SERVIDOR);
  return SGO_EMAIL.chamar(acao, { id: eu.id, nome: eu.nome, area: eu.area, admin: eu.admin === true }, dados || {});
}

function Email_resposta_(fn) {
  try { return JSON.parse(JSON.stringify(Object.assign({ ok: true }, fn() || {}))); }
  catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
}

/* ------------------------------------------------------------
 * CLIENTES: quem é o remetente
 * ------------------------------------------------------------ */
var EMAIL_INDICE_CLIENTES = null;
function Email_indiceClientes_() {
  if (EMAIL_INDICE_CLIENTES) return EMAIL_INDICE_CLIENTES;
  var porEndereco = {}, porDominio = {}, dominiosAmbiguos = {};
  var lista = [];
  try { lista = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || []; } catch (e) { lista = []; }
  lista.forEach(function (c) {
    if (SGO_UTILS.safeUpper(c.STATUS || 'ATIVO') === 'INATIVO') return;
    var nome = Email_s_(c.NOME_FANTASIA) || Email_s_(c.RAZAO_SOCIAL) || Email_s_(c.ID);
    Email_s_(c.EMAIL).toLowerCase().split(/[\s,;]+/).forEach(function (e) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
      porEndereco[e] = { id: Email_s_(c.ID), nome: nome };
      var dom = e.split('@')[1];
      if (EMAIL_DOMINIOS_PUBLICOS.indexOf(dom) >= 0 || /(^|\.)metrolabs\.com\.br$/.test(dom)) return;
      if (porDominio[dom] && porDominio[dom].id !== Email_s_(c.ID)) dominiosAmbiguos[dom] = true;
      porDominio[dom] = { id: Email_s_(c.ID), nome: nome };
    });
  });
  Object.keys(dominiosAmbiguos).forEach(function (d) { delete porDominio[d]; });
  EMAIL_INDICE_CLIENTES = { porEndereco: porEndereco, porDominio: porDominio };
  return EMAIL_INDICE_CLIENTES;
}
/** Cliente do remetente: { id, nome, por: 'endereco'|'dominio' } ou null. */
function Email_clienteDe_(endereco) {
  var e = Email_s_(endereco).toLowerCase();
  if (!e) return null;
  var idx = Email_indiceClientes_();
  if (idx.porEndereco[e]) return { id: idx.porEndereco[e].id, nome: idx.porEndereco[e].nome, por: 'endereco' };
  var d = idx.porDominio[e.split('@')[1] || ''];
  return d ? { id: d.id, nome: d.nome, por: 'dominio' } : null;
}
function Email_filtroClientes_() {
  var idx = Email_indiceClientes_();
  return { enderecos: Object.keys(idx.porEndereco), dominios: Object.keys(idx.porDominio) };
}

/* ------------------------------------------------------------
 * HORAS ÚTEIS (expediente do SGO_Expediente.js)
 * ------------------------------------------------------------ */
/** Horas de expediente entre duas datas (dias úteis, só dentro do horário de trabalho). */
function Email_horasUteis_(inicio, fim, cfg) {
  var a = new Date(inicio), b = fim ? new Date(fim) : new Date();
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return 0;
  var c = cfg || (typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], extras: [] });
  var total = 0, dia = new Date(a.getTime()), passos = 0, ultimo = Utilities.formatDate(b, 'America/Sao_Paulo', 'yyyy-MM-dd');
  while (passos++ < 400) {
    var iso = Utilities.formatDate(dia, 'America/Sao_Paulo', 'yyyy-MM-dd');
    if (iso > ultimo) break;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso), semana = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
    var util = typeof SGO_expedienteMotivoDia_ === 'function' ? !SGO_expedienteMotivoDia_(iso, semana, c) : (semana >= 1 && semana <= 5);
    if (util) {
      var ini = new Date(iso + 'T' + c.ini + ':00-03:00').getTime(), fi = new Date(iso + 'T' + c.fim + ':00-03:00').getTime();
      var de = Math.max(ini, a.getTime()), ate = Math.min(fi, b.getTime());
      if (ate > de) total += (ate - de) / 3600000;
    }
    dia = new Date(new Date(iso + 'T12:00:00-03:00').getTime() + 24 * 3600000);
  }
  return Math.round(total * 10) / 10;
}
function Email_textoHoras_(h) {
  var dias = Math.floor(h / 8);
  if (dias >= 1) return dias + (dias === 1 ? ' dia útil' : ' dias úteis');
  var hh = Math.max(1, Math.floor(h));
  return hh + (hh === 1 ? ' hora útil' : ' horas úteis');
}

/* ------------------------------------------------------------
 * APIS DA TELA (google.script.run)
 * ------------------------------------------------------------ */
function Email_apiSituacao(sessionId) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId);
    if (!Email_disponivel_()) return { disponivel: false, motivo: EMAIL_MSG_SEM_SERVIDOR, eu: { nome: eu.nome, email: eu.email, admin: eu.admin } };
    var s = Email_chamar_(eu, 'situacao');
    return { disponivel: true, situacao: s, eu: { nome: eu.nome, email: eu.email, admin: eu.admin }, config: Email_config_() };
  });
}

/** Conectar: a senha passa direto para o servidor (testada e cifrada lá); nunca é gravada nem devolvida aqui. */
function Email_apiConectar(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId), p = payload || {};
    var r = Email_chamar_(eu, 'conectar', { endereco: Email_s_(p.endereco), senha: String(p.senha || ''), nome: Email_s_(p.nome) || eu.nome, assinatura: p.assinatura !== undefined ? String(p.assinatura) : undefined });
    try { SGO_DATA.log('EMAIL_CONECTAR', eu.nome, 'Conectou a caixa de e-mail ' + Email_s_(p.endereco).toLowerCase(), 'EMAIL'); } catch (e) {}
    return { pessoal: r.pessoal };
  });
}
function Email_apiDesconectar(sessionId) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId);
    Email_chamar_(eu, 'desconectar');
    try { SGO_DATA.log('EMAIL_DESCONECTAR', eu.nome, 'Desconectou a caixa de e-mail (credencial apagada do servidor)', 'EMAIL'); } catch (e) {}
    Email_invalidarPendencias_();
    return {};
  });
}
function Email_apiAssinatura(sessionId, payload) {
  return Email_resposta_(function () { var p = payload || {}; return Email_chamar_(Email_eu_(sessionId), 'assinatura', { conta: p.conta || '', html: String(p.html || '') }); });
}
function Email_apiPastas(sessionId, payload) {
  return Email_resposta_(function () { return { pastas: Email_chamar_(Email_eu_(sessionId), 'pastas', { conta: (payload || {}).conta || '' }) }; });
}

/** Lista da pasta; marca o cliente de cada remetente. filtro.deCliente usa os e-mails e domínios dos clientes. */
function Email_apiListar(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId), p = payload || {};
    var d = { conta: p.conta || '', pasta: p.pasta || 'INBOX', busca: Email_s_(p.busca).slice(0, 100), naoLidas: !!p.naoLidas, comAnexo: !!p.comAnexo, pagina: Number(p.pagina) || 0, porPagina: Number(p.porPagina) || 30 };
    if (p.deCliente) d.remetentes = Email_filtroClientes_();
    var r = Email_chamar_(eu, 'listar', d);
    (r.itens || []).forEach(function (it) { var c = Email_clienteDe_(it.deEndereco); if (c) it.cliente = c; });
    return r;
  });
}
function Email_apiLer(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId), p = payload || {};
    var m = Email_chamar_(eu, 'ler', { conta: p.conta || '', pasta: p.pasta || 'INBOX', uid: Number(p.uid), marcarLida: p.marcarLida !== false });
    m.cliente = Email_clienteDe_(m.deEndereco);
    try {
      var regs = (SGO_DATA.getAll(EMAIL_ABA_REGISTROS) || []).filter(function (r) { return m.messageId && Email_s_(r.MESSAGE_ID) === m.messageId; });
      m.registrado = regs.length ? { cliente: Email_s_(regs[0].CLIENTE_NOME), por: Email_s_(regs[0].USUARIO_NOME), em: Email_s_(regs[0].CRIADO_EM) } : null;
    } catch (e) { m.registrado = null; }
    Email_invalidarPendencias_();
    return { mensagem: m };
  });
}
function Email_apiAnexo(sessionId, payload) {
  return Email_resposta_(function () { var p = payload || {}; return { anexo: Email_chamar_(Email_eu_(sessionId), 'anexo', { conta: p.conta || '', pasta: p.pasta, uid: Number(p.uid), parte: String(p.parte) }) }; });
}
function Email_apiMarcar(sessionId, payload) {
  return Email_resposta_(function () {
    var p = payload || {};
    var r = Email_chamar_(Email_eu_(sessionId), 'marcar', { conta: p.conta || '', pasta: p.pasta, uids: p.uids || [], lida: p.lida, sinalizada: p.sinalizada });
    Email_invalidarPendencias_();
    return r;
  });
}
function Email_apiMover(sessionId, payload) {
  return Email_resposta_(function () { var p = payload || {}; var r = Email_chamar_(Email_eu_(sessionId), 'mover', { conta: p.conta || '', pasta: p.pasta, uids: p.uids || [], destino: p.destino }); Email_invalidarPendencias_(); return r; });
}
function Email_apiApagar(sessionId, payload) {
  return Email_resposta_(function () {
    var p = payload || {};
    var r = Email_chamar_(Email_eu_(sessionId), 'apagar', { conta: p.conta || '', pasta: p.pasta, uids: p.uids || [], definitivo: p.definitivo === true, confirmado: p.confirmado === true });
    Email_invalidarPendencias_();
    return r;
  });
}
/** Envio pela tela: anexos só do computador (base64). Arquivo do sistema por id só pelas funções de servidor. */
function Email_apiEnviar(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId), p = Email_mensagemDaTela_(payload);
    var r = Email_chamar_(eu, 'enviar', p);
    Email_invalidarPendencias_();
    return { envio: r };
  });
}
function Email_apiRascunho(sessionId, payload) {
  return Email_resposta_(function () { return { rascunho: Email_chamar_(Email_eu_(sessionId), 'rascunho', Email_mensagemDaTela_(payload)) }; });
}
function Email_mensagemDaTela_(payload) {
  var p = payload || {};
  return {
    conta: p.conta || '', para: Email_s_(p.para), cc: Email_s_(p.cc), cco: Email_s_(p.cco), assunto: Email_s_(p.assunto), html: String(p.html || ''),
    anexos: (p.anexos || []).map(function (a) { return { nome: Email_s_(a.nome) || 'anexo', tipo: Email_s_(a.tipo) || 'application/octet-stream', base64: String(a.base64 || '') }; }),
    respondendo: p.respondendo && p.respondendo.uid ? { pasta: String(p.respondendo.pasta || 'INBOX'), uid: Number(p.respondendo.uid) } : undefined,
    encaminhando: p.encaminhando && p.encaminhando.uid ? { pasta: String(p.encaminhando.pasta || 'INBOX'), uid: Number(p.encaminhando.uid) } : undefined,
    rascunhoUid: Number(p.rascunhoUid) || undefined
  };
}
function Email_apiTratar(sessionId, payload) {
  return Email_resposta_(function () { var p = payload || {}; return Email_chamar_(Email_eu_(sessionId), 'tratar', { conta: p.conta, messageId: p.messageId, situacao: p.situacao === 'livre' ? 'livre' : 'respondendo' }); });
}

/** Contador do menu e balão: só do banco do servidor (rápido); `desde` = hora da última consulta da tela. */
function Email_apiResumo(sessionId, desde) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId);
    if (!Email_disponivel_()) return { disponivel: false };
    var r = Email_chamar_(eu, 'resumo', { desde: Email_s_(desde) });
    (r.novas || []).forEach(function (n) { var c = Email_clienteDe_(n.deEndereco); if (c) n.cliente = c.nome; });
    r.disponivel = true;
    r.conectada = (r.contas || []).some(function (c) { return c.tipo === 'pessoal'; });
    return r;
  });
}

/** "Registrar no cliente": guarda o resumo e o vínculo do e-mail no histórico do cliente (EML_CLIENTE_REGISTROS). */
function Email_apiRegistrarNoCliente(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_eu_(sessionId), p = payload || {};
    var m = Email_chamar_(eu, 'ler', { conta: p.conta || '', pasta: p.pasta || 'INBOX', uid: Number(p.uid), marcarLida: false });
    var clienteId = Email_s_(p.clienteId) || (Email_clienteDe_(m.deEndereco) || {}).id;
    if (!clienteId) throw new Error('Escolha o cliente: o remetente ' + m.deEndereco + ' não está no cadastro de nenhum cliente. Se for um contato novo, cadastre o e-mail em Cadastros > Clientes e tente de novo.');
    var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, clienteId);
    if (!c) throw new Error('Cliente não encontrado no cadastro. Atualize a tela e escolha de novo.');
    Email_garantirAba_();
    var resumo = Email_s_(p.resumo).slice(0, 2000) || String(m.texto || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    var reg = SGO_DATA.insert(EMAIL_ABA_REGISTROS, {
      CLIENTE_ID: clienteId, CLIENTE_NOME: Email_s_(c.NOME_FANTASIA) || Email_s_(c.RAZAO_SOCIAL), USUARIO_ID: eu.id, USUARIO_NOME: eu.nome,
      CAIXA: m.enderecoConta || '', REMETENTE: m.deEndereco, ASSUNTO: Email_s_(m.assunto).slice(0, 300), DATA_EMAIL: m.data, RESUMO: resumo, MESSAGE_ID: m.messageId || ''
    });
    try { SGO_DATA.log('EMAIL_REGISTRO_CLIENTE', eu.nome, 'E-mail registrado no cliente ' + reg.CLIENTE_NOME, 'EMAIL'); } catch (e) {}
    return { registro: { id: reg.ID, cliente: reg.CLIENTE_NOME, clienteId: clienteId } };
  });
}
/** Histórico de e-mails registrados de um cliente (para o cadastro do cliente e para a tela E-mail). */
function Email_apiRegistrosDoCliente(sessionId, clienteId) {
  return Email_resposta_(function () {
    Email_eu_(sessionId);
    var id = Email_s_(clienteId);
    var l = [];
    try { l = (SGO_DATA.getAll(EMAIL_ABA_REGISTROS) || []).filter(function (r) { return Email_s_(r.CLIENTE_ID) === id; }); } catch (e) { l = []; }
    l.sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); });
    return { registros: l.slice(0, 200).map(function (r) { return { em: Email_s_(r.CRIADO_EM), por: Email_s_(r.USUARIO_NOME), remetente: Email_s_(r.REMETENTE), assunto: Email_s_(r.ASSUNTO), dataEmail: Email_s_(r.DATA_EMAIL), resumo: Email_s_(r.RESUMO) }; }) };
  });
}
/** Clientes para escolher ("Registrar no cliente" e "Escrever para cliente"): nome e e-mail do cadastro. */
function Email_apiClientes(sessionId) {
  return Email_resposta_(function () {
    Email_eu_(sessionId);
    var l = [];
    try { l = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || []; } catch (e) { l = []; }
    return { clientes: l.filter(function (c) { return SGO_UTILS.safeUpper(c.STATUS || 'ATIVO') !== 'INATIVO'; }).map(function (c) { return { id: Email_s_(c.ID), nome: Email_s_(c.NOME_FANTASIA) || Email_s_(c.RAZAO_SOCIAL), email: Email_s_(c.EMAIL).toLowerCase() }; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome); }) };
  });
}
function Email_garantirAba_() {
  if (typeof CertCal_garantirTabela_ === 'function') {
    CertCal_garantirTabela_(EMAIL_ABA_REGISTROS, EMAIL_COLUNAS_REGISTROS);
    EMAIL_COLUNAS_REGISTROS.forEach(function (c) { CertCal_garantirColuna_(EMAIL_ABA_REGISTROS, c); });
  }
}

/* ------------------------------------------------------------
 * CAIXAS COMPARTILHADAS (só Administrador)
 * ------------------------------------------------------------ */
function Email_exigirAdmin_(sessionId) {
  var eu = Email_eu_(sessionId);
  if (!eu.admin) throw new Error('Só o Administrador cadastra caixas compartilhadas e escolhe quem tem acesso. Peça a um Administrador (Administração > Usuários mostra quem é).');
  return eu;
}
function Email_apiCompartilhadas(sessionId) {
  return Email_resposta_(function () {
    var eu = Email_exigirAdmin_(sessionId);
    var pessoas = [];
    try {
      pessoas = (SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS) || []).filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE'; })
        .map(function (u) { return { chave: 'sgo:' + Email_s_(u.ID), nome: Email_s_(u.NOME) || Email_s_(u.USUARIO) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    } catch (e) { pessoas = []; }
    var areas = [];
    try { var mapa = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {}; areas = Object.keys(mapa).map(function (k) { return { codigo: k, nome: mapa[k] }; }); } catch (e) { areas = []; }
    return { caixas: Email_chamar_(eu, 'compartilhadasAdmin'), pessoas: pessoas, areas: areas, config: Email_config_() };
  });
}
function Email_apiCompartilhadaSalvar(sessionId, payload) {
  return Email_resposta_(function () {
    var eu = Email_exigirAdmin_(sessionId), p = payload || {};
    var r = Email_chamar_(eu, 'compartilhadaSalvar', { id: p.id || '', endereco: Email_s_(p.endereco), senha: p.senha ? String(p.senha) : '', nome: Email_s_(p.nome), assinatura: p.assinatura !== undefined ? String(p.assinatura) : undefined,
      pessoas: (p.pessoas || []).map(String), areas: (p.areas || []).map(String) });
    try { SGO_DATA.log('EMAIL_COMPARTILHADA', eu.nome, 'Caixa compartilhada ' + Email_s_(p.endereco).toLowerCase() + ' gravada', 'EMAIL'); } catch (e) {}
    return r;
  });
}
function Email_apiCompartilhadaRemover(sessionId, id) {
  return Email_resposta_(function () { return Email_chamar_(Email_exigirAdmin_(sessionId), 'compartilhadaRemover', { id: Email_s_(id) }); });
}
function Email_apiAuditoria(sessionId, id) {
  return Email_resposta_(function () { return { trilha: Email_chamar_(Email_exigirAdmin_(sessionId), 'auditoria', { id: Email_s_(id), limite: 200 }) }; });
}
/** Prazos dos avisos (horas úteis). Só Administrador. */
function Email_apiConfigSalvar(sessionId, payload) {
  return Email_resposta_(function () {
    Email_exigirAdmin_(sessionId);
    var p = payload || {}, n = function (v) { v = Number(v); if (!isFinite(v) || v < 1 || v > 200) throw new Error('Use um número de horas úteis entre 1 e 200 em cada campo.'); return Math.round(v); };
    var c = { horasNaoLido: n(p.horasNaoLido), horasSemResposta: n(p.horasSemResposta), horasGestao: n(p.horasGestao) };
    if (!(c.horasNaoLido <= c.horasSemResposta && c.horasSemResposta <= c.horasGestao)) throw new Error('Os prazos precisam crescer: não lido ≤ sem resposta ≤ gestão (por exemplo 4, 8 e 16 horas úteis).');
    PropertiesService.getScriptProperties().setProperty(EMAIL_CFG_PROP, JSON.stringify(c));
    Email_invalidarPendencias_();
    return { config: c };
  });
}

/* ------------------------------------------------------------
 * PENDÊNCIAS (fonte da central: SGO_Alertas_Central.js → PEND_FONTES)
 * ------------------------------------------------------------ */
function Email_invalidarPendencias_() { try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {} }

function Email_pendencias_(add, ctx) {
  if (!Email_disponivel_() || !ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  var cfg = Email_config_(), exp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null, agora = new Date();
  // 1) a própria pessoa: e-mails de cliente (caixa pessoal e compartilhadas dela)
  if (ctx.userId && !ctx.interno) {
    var eu = Email_euDoId_(ctx.userId, { nome: ctx.nome, perfil: ctx.perfil });
    var lista = [];
    try { lista = Email_chamar_(eu, 'recebidas', { dias: 15 }) || []; } catch (e) { lista = []; }
    lista.forEach(function (m) {
      var cli = Email_clienteDe_(m.remetente);
      if (!cli || m.tratadoPor) return;
      var h = Email_horasUteis_(m.recebidoEm, agora, exp);
      var tipo = !m.lida && h >= cfg.horasNaoLido ? 'email_cliente_nao_lido' : (m.lida && h >= cfg.horasSemResposta ? 'email_cliente_sem_resposta' : '');
      if (!tipo) return;
      var caixa = m.tipoConta === 'compartilhada' ? ' (caixa ' + m.enderecoConta + ')' : '';
      add(Pend_item_(tipo, {
        id: 'EMAIL:' + m.conta + ':' + m.uid, gravidade: h >= cfg.horasGestao ? 'CRITICO' : 'ATENCAO', publico: 'PESSOA', paraUsuarios: [ctx.userId],
        titulo: cli.nome + ': ' + (Email_s_(m.assunto) || '(sem assunto)'), nome: cli.nome, clienteId: cli.id, responsavelId: ctx.userId, responsavel: ctx.nome,
        detalhe: (m.lida ? 'Lido e sem resposta' : 'Não lido') + ' há ' + Email_textoHoras_(h) + caixa + '. De ' + (m.remetenteNome || m.remetente) + '.',
        oQueFazer: m.lida ? 'Abra E-mail e responda o cliente (ou mova a mensagem para outra pasta se não precisa de resposta).' : 'Abra E-mail e leia a mensagem do cliente.',
        tela: { tipo: 'modulo', mod: 'email' }, dias: 0
      }));
    });
  }
  // 2) gestão (e a escada de cobrança, que lê a visão interna): sem resposta há mais do prazo da gestão — sem assunto nem texto
  if (ctx.gestao) {
    var equipe = [];
    try { equipe = Email_chamar_({ id: 'rotina', nome: 'Rotina de e-mail', area: '', admin: false }, 'recebidasEquipe', { dias: 15 }) || []; } catch (e) { equipe = []; }
    var grupos = {};
    equipe.forEach(function (m) {
      var cli = Email_clienteDe_(m.remetente);
      if (!cli) return;
      var h = Email_horasUteis_(m.recebidoEm, agora, exp);
      if (h < cfg.horasGestao) return;
      var chave = m.tipoConta === 'pessoal' ? 'U:' + m.usuarioId : 'C:' + m.conta;
      var g = grupos[chave] || (grupos[chave] = { m: m, qtd: 0, clientes: {}, maisAntigo: m.recebidoEm, horas: 0 });
      g.qtd++; g.clientes[cli.nome] = true; if (h > g.horas) { g.horas = h; g.maisAntigo = m.recebidoEm; }
    });
    var nomes = {};
    try { (SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS) || []).forEach(function (u) { nomes[Email_s_(u.ID)] = Email_s_(u.NOME) || Email_s_(u.USUARIO); }); } catch (e) {}
    Object.keys(grupos).forEach(function (k) {
      var g = grupos[k], pessoal = g.m.tipoConta === 'pessoal', quem = pessoal ? (nomes[g.m.usuarioId] || 'Colaborador') : 'Caixa ' + g.m.enderecoConta;
      var clientes = Object.keys(g.clientes).slice(0, 5).join(', ');
      var areas = (!pessoal && g.m.acesso && g.m.acesso.areas) || [];
      add(Pend_item_('email_cliente_parado', {
        id: 'EMAILGES:' + k, gravidade: 'CRITICO', publico: 'GESTAO', paraUsuarios: [],
        titulo: quem + ': ' + g.qtd + (g.qtd === 1 ? ' e-mail de cliente sem resposta' : ' e-mails de cliente sem resposta'),
        nome: quem, responsavelId: pessoal ? g.m.usuarioId : '', responsavel: quem,
        detalhe: 'Cliente(s): ' + clientes + '. O mais antigo está parado há ' + Email_textoHoras_(g.horas) + '. O conteúdo das mensagens é só de quem recebeu.',
        oQueFazer: pessoal ? 'Fale com ' + quem + ' para responder o cliente hoje (a gestão não abre a caixa pessoal de ninguém).' : 'Combine com a equipe da caixa quem responde o cliente hoje.',
        tela: { tipo: 'modulo', mod: 'email' }, dias: 0, extra: areas.length ? { area: String(areas[0]) } : null
      }));
    });
  }
}

/* ------------------------------------------------------------
 * PARA AS OUTRAS EQUIPES: enviar COMO o usuário
 * ------------------------------------------------------------ */
/**
 * SGO_Email_enviarComoUsuario_({ usuarioId, para, cc, cco, assunto, html, texto, anexos, responderPara })
 *   anexos: [{ arquivoId, nome?, tipo? } | { conteudo (base64), nome, tipo } | { blob (Blob do Apps Script), nome? } | Blob]
 * Com caixa pessoal conectada: sai da caixa dele (cópia em Enviados, a resposta do cliente cai na caixa dele).
 * Sem caixa: sai pela caixa do sistema (sistema@metrolabs.com.br) com "responder para" o e-mail do usuário
 * (CAD_USUARIOS.EMAIL) e o nome dele no remetente. Os dois caminhos contam no limite de envio por hora do usuário.
 * Nunca lança erro: { ok, via: 'pessoal'|'sistema', de, responderPara, messageId?, salvoEmEnviados?, message? }.
 */
function SGO_Email_enviarComoUsuario_(o) {
  try {
    var p = o || {};
    var eu = Email_euDoId_(Email_s_(p.usuarioId), null);
    if (!eu.id || !eu.nome) return { ok: false, message: 'Usuário não encontrado no cadastro (CAD_USUARIOS). Confira quem está enviando.' };
    if (!eu.ativo) return { ok: false, message: 'O usuário ' + eu.nome + ' está inativo e não pode enviar e-mail pelo sistema.' };
    if (!Email_s_(p.para)) return { ok: false, message: 'Informe o e-mail do destinatário (campo Para).' };
    if (!Email_s_(p.assunto)) return { ok: false, message: 'Informe o assunto do e-mail.' };
    var html = String(p.html || '') || ('<div style="white-space:pre-wrap">' + Email_esc_(p.texto || '') + '</div>');
    // aceita também o Blob direto na lista (como o Enviar ao cliente faz)
    p.anexos = (p.anexos || []).map(function (a) { return a && typeof a.getBytes === 'function' ? { blob: a } : a; });
    var anexosServidor = (p.anexos || []).map(function (a) {
      if (a.arquivoId) return { arquivoId: Email_s_(a.arquivoId), nome: Email_s_(a.nome) || undefined, tipo: Email_s_(a.tipo) || undefined };
      if (a.blob) return { nome: Email_s_(a.nome) || a.blob.getName() || 'anexo', tipo: a.blob.getContentType() || 'application/octet-stream', base64: Utilities.base64Encode(a.blob.getBytes()) };
      return { nome: Email_s_(a.nome) || 'anexo', tipo: Email_s_(a.tipo) || 'application/octet-stream', base64: String(a.conteudo || a.base64 || '') };
    });
    var tem = null;
    if (Email_disponivel_()) { try { tem = Email_chamar_(eu, 'temCaixa'); } catch (e) { tem = null; } }
    if (tem && tem.conectada) {
      var r = Email_chamar_(eu, 'enviar', { para: p.para, cc: p.cc || '', cco: p.cco || '', assunto: p.assunto, html: html, anexos: anexosServidor, responderPara: Email_s_(p.responderPara) || undefined });
      return { ok: true, via: 'pessoal', de: r.de, responderPara: '', messageId: r.messageId, salvoEmEnviados: r.salvoEmEnviados };
    }
    // sem caixa pessoal: caixa do sistema, respondendo para o usuário
    var destinos = String([p.para, p.cc, p.cco].filter(Boolean).join(',')).split(/[,;]+/).map(Email_s_).filter(Boolean);
    if (Email_disponivel_()) Email_chamar_(eu, 'registrarEnvioSistema', { destinatarios: destinos.length, dominios: destinos.map(function (x) { return x.split('@')[1] || ''; }).join(', ') });
    var blobs = (p.anexos || []).map(function (a) {
      if (a.blob) return a.blob;
      if (a.arquivoId) { var b = DriveApp.getFileById(Email_s_(a.arquivoId)).getBlob(); if (a.nome) b.setName(Email_s_(a.nome)); return b; }
      return Utilities.newBlob(Utilities.base64Decode(String(a.conteudo || a.base64 || '')), Email_s_(a.tipo) || 'application/octet-stream', Email_s_(a.nome) || 'anexo');
    });
    var responderPara = Email_s_(p.responderPara) || eu.email;
    var msg = { to: p.para, subject: p.assunto, htmlBody: html, name: eu.nome + ' (Metrolabs)' };
    if (p.cc) msg.cc = p.cc;
    if (p.cco) msg.bcc = p.cco;
    if (responderPara) msg.replyTo = responderPara;
    if (blobs.length) msg.attachments = blobs;
    MailApp.sendEmail(msg);
    return { ok: true, via: 'sistema', de: 'sistema@metrolabs.com.br', responderPara: responderPara,
      aviso: responderPara ? '' : 'O usuário não tem e-mail no cadastro: a resposta do cliente vai para a caixa do sistema.' };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
function Email_esc_(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
