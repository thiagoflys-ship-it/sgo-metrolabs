/****************************************************
 * PILOTO DO WHATSAPP (21/10/2026) — aprovado pelo dono em 20/10/2026.
 *
 * O número do WhatsApp oficial (Meta) é só do sistema. A Z-API (o WhatsApp de uma pessoa da equipe) saiu do sistema:
 * com o piloto ligado, ou com WHATSAPP_PROVEDOR = meta, nada sai pela Z-API (SGO_waZapiFora_).
 * Durante o piloto só as pessoas da lista recebem WhatsApp; as demais recebem no sistema e por e-mail, como antes.
 * A mensagem que não sai fica em NTF_ENVIOS com SITUACAO = RETIDO e o motivo ("retida pelo piloto do WhatsApp").
 *
 * Configuração: propriedade WA_PILOTO (JSON), gravada pela tela SGO+ › Administração › Piloto do WhatsApp
 * (Administrador e Diretoria):
 *   { v: 1, ligado, usuarios: [ids de CAD_USUARIOS], areas: [perfis liberados inteiros], telefones: [55+DDD+8 dígitos],
 *     atualizadoEm, atualizadoPor }
 *   - Sem a propriedade: piloto LIGADO e só o responsável pelo sistema (SGO_DONOS, SGO_Chaves.js) na lista. Nenhum nome
 *     de pessoa fica no código: as demais pessoas são escolhidas na tela.
 *   - telefones: calculados aqui a partir das pessoas e áreas (CELULAR do usuário, senão condutor ou técnico —
 *     Notificar_contatos_), sem o 9 (o mesmo número com ou sem o 9). É a lista que o SERVIDOR confere em toda
 *     chamada de envio (sgo_servidor, servicos/whatsappPiloto.ts) — segunda garantia, independente deste código.
 *     O COMMAND lê a mesma propriedade (alias WA_PILOTO no servidor) e resolve as pessoas pelo sgo_id.
 *   - Cliente e contato externo (Auvo ao cliente, contato da unidade) não recebem WhatsApp durante o piloto, salvo
 *     telefone que esteja na lista.
 *
 * Relatório: SGO_WaPiloto_api('relatorio') junta NTF_ENVIOS (WhatsApp do SGO+: enviado, retido, falhou, pulado) e o
 * registro do servidor (SGO_WHATSAPP.pilotoRegistros: tudo do COMMAND e o que o servidor bloqueou). Telefone só para o
 * Administrador. E-mail diário às 18h ao responsável pelo sistema (SGO_waPilotoResumoDiario, gatilho diário).
 ****************************************************/

var WAP_PROP = 'WA_PILOTO';
// 21/10/2026 (pedido do dono): escolher as pessoas e áreas do piloto é rotina da empresa (gestão, RH e Financeiro). Ligar ou
// desligar o piloto e ver o telefone completo continuam com o Administrador e a Diretoria (o telefone, só o Administrador).
var WAP_PERFIS_TELA = ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'];
var WAP_AREAS = ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH'];
var WAP_FUSO = 'America/Sao_Paulo';
var WAP_MOTIVO_PESSOA = 'Retida pelo piloto do WhatsApp: esta pessoa não está na lista do piloto (o aviso segue no sistema e por e-mail).';
var WAP_MOTIVO_EXTERNO = 'Retida pelo piloto do WhatsApp: cliente e contato externo não recebem WhatsApp durante o piloto (o aviso segue por e-mail, quando houver).';
var WAP_SITUACOES = { OK: 'Enviada', ENVIADO: 'Enviada', RETIDO: 'Retida pelo piloto', BLOQUEADO: 'Bloqueada pelo servidor', ERRO: 'Falhou', FALHOU: 'Falhou', PULADO: 'Não enviada (regra do módulo)' };

/** Chave do telefone sem o 9: 55 + DDD + 8 últimos dígitos ("5562999990001" e "556299990001" dão "556299990001"). */
function SGO_waPilotoCanon_(v) {
  var d = String(v === null || v === undefined ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55\d{10,11}$/.test(d)) return '';
  return d.slice(0, 4) + d.slice(-8);
}

function SGO_waPilotoLista_(v) {
  var out = [];
  (Array.isArray(v) ? v : []).forEach(function (x) { x = String(x === null || x === undefined ? '' : x).trim(); if (x && out.indexOf(x) < 0) out.push(x); });
  return out;
}

/** Ids do responsável pelo sistema (SGO_DONOS) — a lista padrão do piloto. */
function SGO_waPilotoDonos_() {
  var donos = typeof SGO_DONOS !== 'undefined' ? SGO_DONOS : ['admin'];
  var ids = [];
  try {
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
      var login = SGO_UTILS.safeLower(u.USUARIO).trim();
      if (login && donos.some(function (d) { return String(d || '').trim().toLowerCase() === login; })) ids.push(String(u.ID || ''));
    });
  } catch (e) { /* sem cadastro: lista vazia */ }
  return ids.filter(Boolean);
}

/** Configuração em vigor. Sem a propriedade: piloto ligado, só o responsável pelo sistema. */
function SGO_waPilotoCfg_() {
  var bruto = null;
  try { bruto = PropertiesService.getScriptProperties().getProperty(WAP_PROP); } catch (e) { bruto = null; }
  var j = null;
  try { j = bruto ? JSON.parse(bruto) : null; } catch (e) { j = null; }
  if (!j || typeof j !== 'object') {
    return { ligado: true, usuarios: SGO_waPilotoDonos_(), areas: [], telefones: [], gravado: false, atualizadoEm: '', atualizadoPor: '' };
  }
  return {
    ligado: j.ligado !== false,
    usuarios: SGO_waPilotoLista_(j.usuarios),
    areas: SGO_waPilotoLista_(j.areas).map(function (a) { return a.toUpperCase(); }).filter(function (a) { return WAP_AREAS.indexOf(a) >= 0; }),
    telefones: SGO_waPilotoLista_(j.telefones).map(SGO_waPilotoCanon_).filter(Boolean),
    gravado: true, atualizadoEm: String(j.atualizadoEm || ''), atualizadoPor: String(j.atualizadoPor || '')
  };
}

/** Pessoa interna liberada? (na lista ou com o perfil de uma área liberada) */
function SGO_waPilotoPessoaLiberada_(cfg, contato) {
  if (!contato || contato.externo) return false;
  if (cfg.usuarios.indexOf(String(contato.id)) >= 0) return true;
  var perfil = String(contato.perfil || '').toUpperCase();
  return !!perfil && cfg.areas.indexOf(perfil) >= 0;
}

/**
 * Motivo para NÃO mandar WhatsApp a este destinatário ('' = pode). contato = item de Notificar_contatos_
 * (ou contato externo do SGO_notificar_, com externo = true). Nunca lança erro: na dúvida, retém.
 */
function SGO_waPilotoMotivo_(contato, cfg) {
  try {
    cfg = cfg || SGO_waPilotoCfg_();
    if (!cfg.ligado) return '';
    if (contato && contato.externo) {
      var k = SGO_waPilotoCanon_(contato.telefone);
      return k && SGO_waPilotoTelefones_(cfg).indexOf(k) >= 0 ? '' : WAP_MOTIVO_EXTERNO;
    }
    return SGO_waPilotoPessoaLiberada_(cfg, contato) ? '' : WAP_MOTIVO_PESSOA;
  } catch (e) {
    return 'Retida pelo piloto do WhatsApp (não foi possível conferir a lista: ' + String((e && e.message) || e).slice(0, 120) + ').';
  }
}

/** Telefones (sem o 9) das pessoas e áreas liberadas, a partir do cadastro de agora. */
function SGO_waPilotoTelefones_(cfg) {
  cfg = cfg || SGO_waPilotoCfg_();
  var ids = cfg.usuarios.slice();
  if (cfg.areas.length) {
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
        if (cfg.areas.indexOf(SGO_UTILS.safeUpper(u.PERFIL)) >= 0 && ids.indexOf(String(u.ID || '')) < 0) ids.push(String(u.ID || ''));
      });
    } catch (e) {}
  }
  var mapa = ids.length ? Notificar_contatos_(ids) : {};
  var out = [];
  Object.keys(mapa).forEach(function (id) {
    var c = mapa[id];
    if (!c || !c.ativo) return;
    var k = SGO_waPilotoCanon_(c.telefone);
    if (k && out.indexOf(k) < 0) out.push(k);
  });
  return out;
}

/** O telefone está liberado pelo piloto? (piloto desligado = sim). Usado nos testes de Chaves e senhas. */
function SGO_waPilotoTelefoneLiberado_(fone) {
  var cfg = SGO_waPilotoCfg_();
  if (!cfg.ligado) return true;
  var k = SGO_waPilotoCanon_(fone);
  return !!k && SGO_waPilotoTelefones_(cfg).indexOf(k) >= 0;
}

/** Z-API fora do sistema: piloto ligado ou provedor escolhido = meta. */
function SGO_waZapiFora_() {
  try {
    if (SGO_waPilotoCfg_().ligado) return true;
    return String(PropertiesService.getScriptProperties().getProperty('WHATSAPP_PROVEDOR') || '').trim().toLowerCase() === 'meta';
  } catch (e) { return true; }
}
var WAP_MOTIVO_ZAPI = 'Z-API desligada: o WhatsApp do sistema é o oficial (Meta); nenhuma mensagem sai pela Z-API.';

/**
 * Grava (quando mudou) a lista de telefones na propriedade, para o servidor conferir. No máximo a cada 30 min, salvo
 * forcar. Sem a propriedade gravada, grava a configuração padrão (piloto ligado, só o responsável pelo sistema).
 */
function SGO_waPilotoSincronizar_(forcar) {
  try {
    var cache = null;
    try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
    if (!forcar && cache && cache.get('WAP_SYNC_V1')) return;
    var cfg = SGO_waPilotoCfg_();
    var tel = SGO_waPilotoTelefones_(cfg);
    var igual = cfg.gravado && cfg.telefones.length === tel.length && tel.every(function (t) { return cfg.telefones.indexOf(t) >= 0; });
    if (!igual) SGO_waPilotoGravarProp_(cfg, tel, cfg.atualizadoPor || 'sistema');
    SGO_waPilotoGarantirGatilho_();   // resumo das 18h mesmo sem ninguém abrir a tela
    if (cache) cache.put('WAP_SYNC_V1', '1', 1800);
  } catch (e) { console.error('Piloto do WhatsApp (sincronizar): ' + ((e && e.message) || e)); }
}

function SGO_waPilotoGravarProp_(cfg, telefones, por) {
  var agora = Utilities.formatDate(new Date(), WAP_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
  PropertiesService.getScriptProperties().setProperty(WAP_PROP, JSON.stringify({
    v: 1, ligado: cfg.ligado !== false, usuarios: cfg.usuarios, areas: cfg.areas, telefones: telefones,
    atualizadoEm: agora, atualizadoPor: String(por || '').slice(0, 80)
  }));
}

/* ------------------------------------------------------------
 * Modelos da Meta: situação lida em Chaves e senhas (e no resumo diário)
 * ------------------------------------------------------------ */

/** Guarda a situação dos modelos lida da Meta: { nome: 'APPROVED'|'PENDING'|... }. */
function SGO_waModelosGuardar_(itens) {
  try {
    var m = {};
    (itens || []).forEach(function (x) { if (x && x.nome) m[x.nome] = String(x.status || (x.falta ? 'NAO_CADASTRADO' : '')).toUpperCase(); });
    PropertiesService.getScriptProperties().setProperty('NTF_MODELOS_SITUACAO', JSON.stringify({ em: Utilities.formatDate(new Date(), WAP_FUSO, "yyyy-MM-dd'T'HH:mm:ss"), modelos: m }));
  } catch (e) {}
}

/** Situação conhecida de um modelo ('' = nunca conferida). */
function SGO_waModeloSituacao_(nome) {
  try {
    var j = JSON.parse(PropertiesService.getScriptProperties().getProperty('NTF_MODELOS_SITUACAO') || 'null');
    return j && j.modelos && j.modelos[nome] ? String(j.modelos[nome]) : '';
  } catch (e) { return ''; }
}

/** Relê a situação dos modelos na Meta (resumo diário). Silencioso: sem token ou WABA, não faz nada. */
function SGO_waModelosAtualizar_() {
  try {
    if (typeof Chaves_metaListarModelos_ !== 'function' || typeof Chaves_situacaoModelos_ !== 'function') return;
    var cred = Notificar_credenciaisMeta_();
    if (!cred.token || !cred.wabaId) return;
    var l = Chaves_metaListarModelos_(cred);
    if (l.ok) SGO_waModelosGuardar_(Chaves_situacaoModelos_(l.lista).itens);
  } catch (e) {}
}

/* ------------------------------------------------------------
 * Tela (Administração › Piloto do WhatsApp)
 * ------------------------------------------------------------ */

function SGO_waPilotoEu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (WAP_PERFIS_TELA.indexOf(perfil) < 0) throw new Error('A tela Piloto do WhatsApp é da gestão (Administrador, Diretoria, Gestor, RH e Financeiro). Se você não recebeu um aviso pelo WhatsApp, ele está no sistema e no seu e-mail.');
  return { id: SGO_UTILS.safe(s.userId), usuario: SGO_UTILS.safe(s.usuario), nome: SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario), perfil: perfil, admin: perfil === 'ADMIN', ligaDesliga: perfil === 'ADMIN' || perfil === 'DIRETORIA' };
}

/** "5562999990001" -> "(62) 99999-0001"; sem o admin: só os 4 últimos. */
function SGO_waPilotoFone_(f, completo) {
  var d = String(f || '').replace(/\D/g, '').replace(/^55/, '');
  if (!d) return '';
  if (!completo) return '(final ' + d.slice(-4) + ')';
  return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : d;
}

function SGO_waPilotoCarregar_(eu) {
  var cfg = SGO_waPilotoCfg_();
  var usuarios = [];
  try { usuarios = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { usuarios = []; }
  var ativos = usuarios.filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE'; });
  var contatos = Notificar_contatos_(ativos.map(function (u) { return String(u.ID || ''); }));
  var donos = SGO_waPilotoDonos_();
  var pessoas = ativos.map(function (u) {
    var id = String(u.ID || ''), c = contatos[id] || {};
    c.perfil = SGO_UTILS.safeUpper(u.PERFIL);
    var cel = typeof SGO_zapiCelular_ === 'function' ? SGO_zapiCelular_(c.telefone) : c.telefone;
    return {
      id: id, nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), perfil: c.perfil,
      vinculo: String(u.VINCULO_TRABALHO || '').replace(/\s+/g, '').toUpperCase(),
      celular: cel ? SGO_waPilotoFone_(cel, eu.admin) : '', temCelular: !!cel, temEmail: !!(c.email && c.email.indexOf('@') > 0),
      naLista: cfg.usuarios.indexOf(id) >= 0, porArea: cfg.areas.indexOf(c.perfil) >= 0, dono: donos.indexOf(id) >= 0
    };
  }).sort(function (a, b) { return (b.naLista - a.naLista) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var pv = Notificar_provedorWhatsapp_();
  var modelos = Object.keys(NTF_MODELOS_META).map(function (n) {
    var st = SGO_waModeloSituacao_(n);
    return { nome: n, uso: NTF_MODELOS_META[n].uso || '', status: st, situacao: st === 'APPROVED' ? 'Aprovado' : st === 'PENDING' || st === 'IN_APPEAL' ? 'Em análise' : st === 'REJECTED' ? 'Recusado' : st === 'NAO_CADASTRADO' ? 'Não cadastrado' : st ? st : 'Não conferido' };
  });
  var prov = String(PropertiesService.getScriptProperties().getProperty('WHATSAPP_PROVEDOR') || '').trim().toLowerCase();
  return {
    ligado: cfg.ligado, gravado: cfg.gravado, atualizadoEm: cfg.atualizadoEm, atualizadoPor: cfg.atualizadoPor,
    usuarios: cfg.usuarios, areas: cfg.areas, areasPossiveis: WAP_AREAS.slice(),
    pessoas: pessoas, liberadas: pessoas.filter(function (p) { return p.naLista || p.porArea; }).length,
    provedorEscolhido: prov || '(vazio)', provedorEmUso: pv.provedor === 'meta' ? 'WhatsApp oficial (Meta)' : pv.provedor === 'zapi' ? 'Z-API' : 'nenhum',
    provedorMotivo: pv.provedor ? '' : String(pv.motivo || ''), zapiFora: SGO_waZapiFora_(), modelos: modelos, admin: eu.admin, ligaDesliga: !!eu.ligaDesliga
  };
}

function SGO_waPilotoGravar_(eu, d) {
  if (WAP_PERFIS_TELA.indexOf(eu.perfil) < 0) throw new Error('Só a gestão (Administrador, Diretoria, Gestor, RH e Financeiro) altera o piloto do WhatsApp.');
  if (!eu.ligaDesliga && (d.ligado !== false) !== (SGO_waPilotoCfg_().ligado !== false)) {
    throw new Error('Ligar ou desligar o piloto do WhatsApp é do Administrador e da Diretoria. Você pode marcar e desmarcar as pessoas e as áreas; deixe o piloto como está e grave de novo.');
  }
  var validos = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    if (SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE') validos[String(u.ID || '')] = true;
  });
  var usuarios = SGO_waPilotoLista_(d.usuarios);
  var fora = usuarios.filter(function (id) { return !validos[id]; });
  if (fora.length) throw new Error('Uma das pessoas marcadas não está mais ativa no cadastro. Atualize a tela e marque de novo.');
  var areas = SGO_waPilotoLista_(d.areas).map(function (a) { return a.toUpperCase(); });
  if (areas.some(function (a) { return WAP_AREAS.indexOf(a) < 0; })) throw new Error('Área desconhecida. Atualize a tela e tente de novo.');
  var ligado = d.ligado !== false;
  if (ligado && !usuarios.length && !areas.length) throw new Error('Com o piloto ligado, marque pelo menos uma pessoa (ou desligue o piloto).');
  var cfg = { ligado: ligado, usuarios: usuarios, areas: areas };
  var tel = SGO_waPilotoTelefones_(cfg);
  SGO_waPilotoGravarProp_(cfg, tel, eu.usuario);
  try { CacheService.getScriptCache().remove('WAP_SYNC_V1'); } catch (e) {}
  try { SGO_DATA.log('WA_PILOTO', eu.usuario, 'Piloto do WhatsApp ' + (ligado ? 'ligado' : 'desligado') + ': ' + usuarios.length + ' pessoa(s), áreas ' + (areas.join(', ') || 'nenhuma') + ', ' + tel.length + ' celular(es) liberado(s).', 'WA_PILOTO'); } catch (e) {}
  SGO_waPilotoGarantirGatilho_();
  var r = SGO_waPilotoCarregar_(eu);
  r.mensagem = ligado ? 'Piloto gravado: ' + r.liberadas + ' pessoa(s) recebem WhatsApp; as demais recebem no sistema e por e-mail.' : 'Piloto desligado: o WhatsApp oficial volta a valer para todos, com as regras de cada módulo.';
  return r;
}

/** Dia 'yyyy-MM-dd' (fuso da empresa) de um valor de data. */
function SGO_waPilotoDia_(q) {
  if (Object.prototype.toString.call(q) === '[object Date]') return Utilities.formatDate(q, WAP_FUSO, 'yyyy-MM-dd');
  var s = String(q || '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s)) return Utilities.formatDate(new Date(s), WAP_FUSO, 'yyyy-MM-dd');
  return s.slice(0, 10);
}
function SGO_waPilotoHora_(q) {
  if (Object.prototype.toString.call(q) === '[object Date]') return Utilities.formatDate(q, WAP_FUSO, 'HH:mm');
  var s = String(q || '');
  if (/Z$/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, WAP_FUSO, 'HH:mm'); }
  var m = s.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '';
}

/**
 * Linhas do relatório de um dia: WhatsApp do SGO+ (NTF_ENVIOS) + registro do servidor (COMMAND e bloqueios do servidor).
 * pessoa: id de CAD_USUARIOS (opcional). completo: mostra o telefone (só o Administrador).
 */
function SGO_waPilotoLinhas_(dia, pessoa, completo) {
  var linhas = [];
  var todos = [];
  try { todos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { todos = []; }
  var contatos = Notificar_contatos_(todos.map(function (u) { return String(u.ID || ''); }));
  var porFone = {};
  Object.keys(contatos).forEach(function (id) { var k = SGO_waPilotoCanon_(contatos[id].telefone); if (k && !porFone[k]) porFone[k] = { id: id, nome: contatos[id].nome }; });
  var fonePessoa = pessoa && contatos[pessoa] ? SGO_waPilotoCanon_(contatos[pessoa].telefone) : '';
  try {
    SGO_DATA.getAll(Notificar_aba_()).forEach(function (r) {
      if (String(r.CANAL || '').toLowerCase() !== 'whatsapp' || SGO_waPilotoDia_(r.QUANDO) !== dia) return;
      var uid = String(r.USUARIO_ID || '');
      if (pessoa && uid !== pessoa) return;
      var ext = uid.indexOf('EXT:') === 0;
      linhas.push({ ordem: String(SGO_waPilotoHora_(r.QUANDO)), hora: SGO_waPilotoHora_(r.QUANDO), sistema: 'SGO+', origem: String(r.ORIGEM || ''), assunto: String(r.ASSUNTO || ''),
        pessoa: String(r.USUARIO_NOME || '') + (ext ? ' (contato externo)' : ''), pessoaId: ext ? '' : uid,
        telefone: completo ? SGO_waPilotoFone_(r.DESTINO, true) : '', situacao: String(r.SITUACAO || '').toUpperCase(), motivo: String(r.MOTIVO || '') });
    });
  } catch (e) { /* aba ainda não existe */ }
  if (typeof SGO_WHATSAPP !== 'undefined' && SGO_WHATSAPP && typeof SGO_WHATSAPP.pilotoRegistros === 'function') {
    var ini = new Date(dia + 'T00:00:00-03:00'), fim = new Date(ini.getTime() + 86400000);
    var regs = [];
    try { regs = SGO_WHATSAPP.pilotoRegistros({ desde: ini.toISOString(), ate: fim.toISOString() }) || []; } catch (e) { regs = []; }
    regs.forEach(function (x) {
      // do SGO+ só entra o que o servidor bloqueou (o resto já está em NTF_ENVIOS, com o nome e a origem)
      if (String(x.sistema) === 'sgo' && String(x.situacao) !== 'BLOQUEADO') return;
      var k = SGO_waPilotoCanon_(x.destino), quem = porFone[k];
      if (pessoa && !(fonePessoa && k === fonePessoa)) return;
      linhas.push({ ordem: SGO_waPilotoHora_(x.em), hora: SGO_waPilotoHora_(x.em), sistema: String(x.sistema) === 'command' ? 'COMMAND' : 'SGO+',
        origem: String(x.origem || '') || (x.modelo ? 'modelo ' + x.modelo : ''), assunto: String(x.modelo || ''),
        pessoa: quem ? quem.nome : (String(x.nome || '') || 'Fora do cadastro de usuários (cliente ou contato)'), pessoaId: quem ? quem.id : '',
        telefone: completo ? SGO_waPilotoFone_(x.destino, true) : '', situacao: String(x.situacao || ''), motivo: String(x.motivo || '') });
    });
  }
  linhas.sort(function (a, b) { return String(b.ordem).localeCompare(String(a.ordem)); });
  linhas.forEach(function (l) { l.situacaoTxt = WAP_SITUACOES[l.situacao] || l.situacao; delete l.ordem; });
  return linhas;
}

function SGO_waPilotoContar_(linhas) {
  var c = { enviadas: 0, retidas: 0, bloqueadas: 0, falhas: 0, puladas: 0, total: linhas.length };
  linhas.forEach(function (l) {
    if (l.situacao === 'OK' || l.situacao === 'ENVIADO') c.enviadas++;
    else if (l.situacao === 'RETIDO') c.retidas++;
    else if (l.situacao === 'BLOQUEADO') c.bloqueadas++;
    else if (l.situacao === 'ERRO' || l.situacao === 'FALHOU') c.falhas++;
    else c.puladas++;
  });
  return c;
}

function SGO_waPilotoRelatorio_(eu, d) {
  var dia = /^\d{4}-\d{2}-\d{2}$/.test(String(d.dia || '')) ? String(d.dia) : Utilities.formatDate(new Date(), WAP_FUSO, 'yyyy-MM-dd');
  var pessoa = String(d.pessoa || '').trim();
  var linhas = SGO_waPilotoLinhas_(dia, pessoa, eu.admin);
  return { dia: dia, pessoa: pessoa, linhas: linhas.slice(0, 1000), contagem: SGO_waPilotoContar_(linhas), servidor: typeof SGO_WHATSAPP !== 'undefined' && !!SGO_WHATSAPP, admin: eu.admin };
}

/** Chamada única da tela: acao = carregar | gravar | relatorio. */
function SGO_WaPiloto_api(sessionId, acao, dados) {
  try {
    var eu = SGO_waPilotoEu_(sessionId);
    var d = dados || {};
    var r;
    if (acao === 'carregar') { SGO_waPilotoSincronizar_(false); SGO_waPilotoGarantirGatilho_(); r = SGO_waPilotoCarregar_(eu); }
    else if (acao === 'gravar') r = SGO_waPilotoGravar_(eu, d);
    else if (acao === 'relatorio') r = SGO_waPilotoRelatorio_(eu, d);
    else throw new Error('Ação desconhecida na tela Piloto do WhatsApp. Atualize a página e tente de novo.');
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

/* ------------------------------------------------------------
 * Resumo diário por e-mail (18h) ao responsável pelo sistema
 * ------------------------------------------------------------ */

function SGO_waPilotoGarantirGatilho_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var hoje = Utilities.formatDate(new Date(), WAP_FUSO, 'yyyy-MM-dd');
    if (props.getProperty('WAP_GATILHO_CHECADO_EM') === hoje) return;
    var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'SGO_waPilotoResumoDiario'; });
    if (!tem) ScriptApp.newTrigger('SGO_waPilotoResumoDiario').timeBased().everyDays(1).atHour(18).nearMinute(0).inTimezone(WAP_FUSO).create();
    props.setProperty('WAP_GATILHO_CHECADO_EM', hoje);
  } catch (e) { console.error('Piloto do WhatsApp (gatilho): ' + ((e && e.message) || e)); }
}

/** Texto do e-mail do dia (sem telefone completo: só o final). */
function SGO_waPilotoTextoResumo_(dia, linhas) {
  var c = SGO_waPilotoContar_(linhas);
  var br = dia.slice(8, 10) + '/' + dia.slice(5, 7) + '/' + dia.slice(0, 4);
  var t = ['Resumo do piloto do WhatsApp em ' + br + '.', '',
    'Enviadas: ' + c.enviadas, 'Retidas pelo piloto (foram só no sistema e por e-mail): ' + c.retidas,
    'Bloqueadas pelo servidor: ' + c.bloqueadas, 'Falharam: ' + c.falhas, 'Não enviadas por regra do módulo: ' + c.puladas, ''];
  var porPessoa = {};
  linhas.forEach(function (l) { var k = l.pessoa || '(sem nome)'; porPessoa[k] = porPessoa[k] || { e: 0, r: 0, f: 0 }; if (l.situacao === 'OK' || l.situacao === 'ENVIADO') porPessoa[k].e++; else if (l.situacao === 'RETIDO' || l.situacao === 'BLOQUEADO') porPessoa[k].r++; else if (l.situacao === 'ERRO' || l.situacao === 'FALHOU') porPessoa[k].f++; });
  var nomes = Object.keys(porPessoa).sort();
  if (nomes.length) {
    t.push('Por pessoa (enviadas / retidas ou bloqueadas / falharam):');
    nomes.forEach(function (n) { t.push('- ' + n + ': ' + porPessoa[n].e + ' / ' + porPessoa[n].r + ' / ' + porPessoa[n].f); });
    t.push('');
  }
  var falhas = linhas.filter(function (l) { return l.situacao === 'ERRO' || l.situacao === 'FALHOU' || l.situacao === 'BLOQUEADO'; }).slice(0, 30);
  if (falhas.length) {
    t.push('Falhas e bloqueios (até 30):');
    falhas.forEach(function (l) { t.push('- ' + l.hora + ' ' + l.sistema + ' ' + (l.origem || '-') + ' para ' + l.pessoa + ': ' + String(l.motivo || '').slice(0, 220)); });
    t.push('');
  }
  if (!linhas.length) t.push('Nenhuma mensagem de WhatsApp foi enviada, retida ou bloqueada hoje.', '');
  t.push('O detalhe de cada mensagem está em Administração > Piloto do WhatsApp, com filtros por dia e por pessoa.');
  return t.join('\n');
}

/**
 * Gatilho diário às 18h (nome sem "_" no fim para o gatilho de tempo achar a função). Atualiza a lista de telefones e a
 * situação dos modelos e manda o resumo do dia por e-mail ao responsável pelo sistema. Só com o piloto ligado.
 */
function SGO_waPilotoResumoDiario() {
  try {
    var cfg = SGO_waPilotoCfg_();
    SGO_waPilotoSincronizar_(true);
    SGO_waModelosAtualizar_();
    if (!cfg.ligado) return { enviado: false, motivo: 'piloto desligado' };
    var dia = Utilities.formatDate(new Date(), WAP_FUSO, 'yyyy-MM-dd');
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('WAP_RESUMO_ENVIADO_EM') === dia) return { enviado: false, motivo: 'resumo de hoje já enviado' };
    var linhas = SGO_waPilotoLinhas_(dia, '', false);
    var donos = SGO_waPilotoDonos_();
    if (!donos.length) return { enviado: false, motivo: 'responsável pelo sistema não encontrado no cadastro' };
    var r = SGO_notificar_({ usuarios: donos, canais: ['email'], origem: 'WA_PILOTO', refId: 'RESUMO-' + dia,
      titulo: 'Piloto do WhatsApp: resumo de ' + dia.slice(8, 10) + '/' + dia.slice(5, 7), texto: SGO_waPilotoTextoResumo_(dia, linhas) });
    if (r.ok) props.setProperty('WAP_RESUMO_ENVIADO_EM', dia);
    return { enviado: r.ok > 0, linhas: linhas.length };
  } catch (e) {
    console.error('Piloto do WhatsApp (resumo diário): ' + ((e && e.message) || e));
    return { enviado: false, motivo: String((e && e.message) || e) };
  }
}
