/****************************************************
 * CANAIS DE NOTIFICAÇÃO REUTILIZÁVEIS (2026-10-16)
 *
 *   SGO_notificar_({
 *     usuarios: [ids de CAD_USUARIOS],
 *     titulo: 'Assunto curto',
 *     texto: 'Texto completo (quebras de linha mantidas)',
 *     link: 'endereço opcional (padrão: endereço público do SGO+)',
 *     canais: ['sgo', 'email', 'whatsapp'],
 *     textoWhatsapp: 'opcional — resumo próprio para o WhatsApp',
 *     origem: 'AVISOS' | 'ATIVIDADES' | 'CONDUTA' ..., refId: 'id do registro'
 *   })
 *
 * Canais:
 *  'sgo'      — a janela/lista do próprio módulo que chama já cobre; aqui nada a fazer.
 *  'email'    — MailApp.sendEmail para CAD_USUARIOS.EMAIL (HTML simples). No servidor
 *               novo o MailApp vira a fila emails_saida e sai pelo SMTP do sistema.
 *  'whatsapp' — Z-API (POST /instances/<INSTANCIA>/token/<TOKEN>/send-text, header
 *               Client-Token). Credenciais SÓ nas propriedades do script:
 *               ZAPI_INSTANCIA, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN. Telefone: primeiro
 *               CAD_USUARIOS.CELULAR (Administração > Usuários); depois
 *               WHATSAPP/TELEFONE do usuário se a coluna existir; senão o telefone
 *               do cadastro de Condutor (Frota) ou de Técnico do mesmo USUARIO_ID.
 *
 * Cada tentativa vira uma linha em NTF_ENVIOS (quando, usuário, canal, assunto,
 * situação OK/ERRO/PULADO, motivo). NUNCA lança erro: a ação principal de quem
 * chamou não pode cair por causa de e-mail ou WhatsApp.
 * Mensagens sóbrias, sem emoji.
 ****************************************************/

var NTF_COLUNAS = ['ID', 'QUANDO', 'USUARIO_ID', 'USUARIO_NOME', 'CANAL', 'DESTINO', 'ASSUNTO', 'ORIGEM', 'REF_ID', 'SITUACAO', 'MOTIVO', 'CRIADO_EM'];
var NTF_FUSO = 'America/Sao_Paulo';

function Notificar_aba_() {
  return SGO_CFG.SHEETS.NTF_ENVIOS || 'NTF_ENVIOS';
}

function Notificar_garantirAba_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('NTF_ABA_OK_V1')) return;
  var aba = Notificar_aba_();
  CertCal_garantirTabela_(aba, NTF_COLUNAS);
  NTF_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(aba, c); });
  CertCal_forcarColunaTexto_(aba, 'QUANDO');
  CertCal_forcarColunaTexto_(aba, 'DESTINO');
  cache.put('NTF_ABA_OK_V1', '1', 21600);
}

function Notificar_agora_() {
  return Utilities.formatDate(new Date(), NTF_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
}

function Notificar_linkSgo_() {
  try { return String(ScriptApp.getService().getUrl() || ''); } catch (e) { return ''; }
}

function Notificar_esc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "(11) 98765-4321" -> "5511987654321". Vazio se não der para formar um número brasileiro. */
function Notificar_normalizarTelefone_(v) {
  var d = String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
  if (!d) return '';
  d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55\d{10,11}$/.test(d)) return '';
  return d;
}

/** Mapa usuárioId -> { id, nome, email, telefone } com o telefone vindo de onde existir. */
function Notificar_contatos_(ids) {
  var quero = {};
  (ids || []).forEach(function (id) { if (id) quero[String(id)] = true; });
  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var id = String(u.ID || '');
    if (!quero[id]) return;
    mapa[id] = {
      id: id,
      nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO),
      email: SGO_UTILS.safeLower(u.EMAIL).trim(),
      ativo: SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO',
      // CELULAR do cadastro de usuários vem PRIMEIRO; se vazio/inválido, tenta
      // WHATSAPP/TELEFONE e, por fim, Condutor (Frota) e Técnico (abaixo).
      telefone: Notificar_normalizarTelefone_(u.CELULAR) || Notificar_normalizarTelefone_(u.WHATSAPP) || Notificar_normalizarTelefone_(u.TELEFONE)
    };
  });
  var completar = function (aba) {
    try {
      SGO_DATA.getAll(aba).forEach(function (r) {
        var c = mapa[String(r.USUARIO_ID || '')];
        if (!c || c.telefone) return;
        if (SGO_UTILS.safeUpper(r.STATUS || 'ATIVO') !== 'ATIVO') return;
        c.telefone = Notificar_normalizarTelefone_(r.TELEFONE);
      });
    } catch (e) { /* aba ausente: segue sem telefone */ }
  };
  if (Object.keys(mapa).some(function (k) { return !mapa[k].telefone; })) {
    completar(SGO_CFG.SHEETS.CAD_CONDUTORES || 'CAD_CONDUTORES');
    completar(SGO_CFG.SHEETS.CAD_TECNICOS || 'CAD_TECNICOS');
  }
  return mapa;
}

function Notificar_htmlEmail_(titulo, texto, link) {
  var corpo = Notificar_esc_(texto).replace(/\r\n|\r|\n/g, '<br>');
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2a24;max-width:640px">' +
    '<div style="border-bottom:2px solid #2f5d50;padding:0 0 8px;margin:0 0 16px;font-weight:bold;color:#2f5d50">SGO+ Metrolabs</div>' +
    '<h2 style="font-size:18px;margin:0 0 12px;color:#1f2a24">' + Notificar_esc_(titulo) + '</h2>' +
    '<div style="margin:0 0 18px">' + corpo + '</div>' +
    (link ? '<p style="margin:0 0 18px"><a href="' + Notificar_esc_(link) + '" style="display:inline-block;background:#2f5d50;color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:4px">Abrir o SGO+</a></p>' +
      '<p style="font-size:12px;color:#5b6b63;margin:0 0 18px">Se o botão não abrir, copie este endereço no navegador: ' + Notificar_esc_(link) + '</p>' : '') +
    '<div style="border-top:1px solid #d5ddd8;padding-top:8px;font-size:12px;color:#5b6b63">Mensagem automática do SGO+. Não responda este e-mail; em caso de dúvida, fale com a gestão.</div>' +
    '</div>';
}

function Notificar_textoEmail_(titulo, texto, link) {
  return 'SGO+ Metrolabs\n\n' + titulo + '\n\n' + texto + (link ? '\n\nAbrir o SGO+: ' + link : '') +
    '\n\nMensagem automática do SGO+. Não responda este e-mail.';
}

/** Tira do motivo qualquer pedaço das credenciais (o endereço da Z-API leva instância e token). */
function Notificar_limparSegredos_(msg, segredos) {
  var s = String(msg || '');
  (segredos || []).forEach(function (x) { if (x && x.length >= 4) s = s.split(x).join('***'); });
  return s.slice(0, 480);
}

function Notificar_credenciaisZapi_() {
  var p = PropertiesService.getScriptProperties();
  return {
    instancia: String(p.getProperty('ZAPI_INSTANCIA') || '').trim(),
    token: String(p.getProperty('ZAPI_TOKEN') || '').trim(),
    clientToken: String(p.getProperty('ZAPI_CLIENT_TOKEN') || '').trim()
  };
}

function Notificar_enviarWhatsapp_(cred, telefone, mensagem) {
  var url = 'https://api.z-api.io/instances/' + encodeURIComponent(cred.instancia) + '/token/' + encodeURIComponent(cred.token) + '/send-text';
  var r = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'Client-Token': cred.clientToken },
    payload: JSON.stringify({ phone: telefone, message: mensagem })
  });
  var codigo = r.getResponseCode();
  if (codigo >= 200 && codigo < 300) return { ok: true };
  return { ok: false, motivo: 'Z-API respondeu ' + codigo + ': ' + String(r.getContentText() || '').slice(0, 200) };
}

/**
 * Envia a notificação pelos canais pedidos. Devolve { ok, erro, pulado } (contagens).
 * Nunca lança erro.
 */
function SGO_notificar_(opcoes) {
  var resumo = { ok: 0, erro: 0, pulado: 0 };
  try {
    var o = opcoes || {};
    var ids = [];
    (o.usuarios || []).forEach(function (id) { id = String(id || '').trim(); if (id && ids.indexOf(id) < 0) ids.push(id); });
    var canais = (o.canais && o.canais.length ? o.canais : ['sgo', 'email', 'whatsapp']).map(function (c) { return String(c).toLowerCase(); });
    var externos = canais.filter(function (c) { return c === 'email' || c === 'whatsapp'; });
    if (!ids.length || !externos.length) return resumo;

    Notificar_garantirAba_();
    var titulo = String(o.titulo || 'Aviso do SGO+').replace(/\s+/g, ' ').trim().slice(0, 180);
    var texto = String(o.texto || '').trim();
    var link = o.link === undefined || o.link === null || o.link === '' ? Notificar_linkSgo_() : String(o.link);
    var origem = String(o.origem || '').slice(0, 40), refId = String(o.refId || '').slice(0, 80);
    var contatos = Notificar_contatos_(ids);
    var linhas = [];
    var registrar = function (uid, nome, canal, destino, situacao, motivo) {
      resumo[situacao === 'OK' ? 'ok' : situacao === 'ERRO' ? 'erro' : 'pulado']++;
      linhas.push({
        QUANDO: Notificar_agora_(), USUARIO_ID: uid, USUARIO_NOME: nome || '', CANAL: canal, DESTINO: destino || '',
        ASSUNTO: titulo, ORIGEM: origem, REF_ID: refId, SITUACAO: situacao, MOTIVO: String(motivo || '').slice(0, 480)
      });
    };

    var cotaEmail = null;
    var cred = externos.indexOf('whatsapp') >= 0 ? Notificar_credenciaisZapi_() : null;
    var zapiOk = !!(cred && cred.instancia && cred.token && cred.clientToken);
    var htmlEmail = Notificar_htmlEmail_(titulo, texto, link);
    var txtEmail = Notificar_textoEmail_(titulo, texto, link);
    var txtWhats = String(o.textoWhatsapp || '').trim();
    if (!txtWhats) {
      var curto = texto.replace(/\s+/g, ' ');
      if (curto.length > 400) curto = curto.slice(0, 397) + '...';
      txtWhats = 'SGO+ Metrolabs - ' + titulo + (curto ? '\n\n' + curto : '');
    }
    if (link && txtWhats.indexOf(link) < 0) txtWhats += '\n\nAbra o SGO+: ' + link;

    ids.forEach(function (uid) {
      var c = contatos[uid];
      externos.forEach(function (canal) {
        try {
          if (!c) { registrar(uid, '', canal, '', 'PULADO', 'Usuário não encontrado no cadastro.'); return; }
          if (!c.ativo) { registrar(uid, c.nome, canal, '', 'PULADO', 'Usuário inativo.'); return; }
          if (canal === 'email') {
            if (!c.email || c.email.indexOf('@') < 0) { registrar(uid, c.nome, canal, '', 'PULADO', 'Sem e-mail no cadastro do usuário.'); return; }
            if (cotaEmail === null) { try { cotaEmail = MailApp.getRemainingDailyQuota(); } catch (e) { cotaEmail = 1; } }
            if (cotaEmail < 1) { registrar(uid, c.nome, canal, c.email, 'PULADO', 'Cota diária de e-mails esgotada; tente de novo amanhã.'); return; }
            MailApp.sendEmail({ to: c.email, subject: 'SGO+ | ' + titulo, body: txtEmail, htmlBody: htmlEmail, name: 'SGO+ Metrolabs' });
            cotaEmail--;
            registrar(uid, c.nome, canal, c.email, 'OK', 'Entregue ao serviço de e-mail.');
          } else {
            if (!zapiOk) { registrar(uid, c.nome, canal, c.telefone, 'PULADO', 'WhatsApp não configurado (faltam as chaves ZAPI_INSTANCIA, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN).'); return; }
            if (!c.telefone) { registrar(uid, c.nome, canal, '', 'PULADO', 'Sem telefone celular válido no cadastro (usuário, condutor ou técnico).'); return; }
            var r = Notificar_enviarWhatsapp_(cred, c.telefone, txtWhats);
            if (r.ok) registrar(uid, c.nome, canal, c.telefone, 'OK', 'Aceito pela Z-API.');
            else registrar(uid, c.nome, canal, c.telefone, 'ERRO', Notificar_limparSegredos_(r.motivo, [cred.instancia, cred.token, cred.clientToken]));
          }
        } catch (e) {
          registrar(uid, c ? c.nome : '', canal, c ? (canal === 'email' ? c.email : c.telefone) : '', 'ERRO',
            Notificar_limparSegredos_((e && e.message) || e, cred ? [cred.instancia, cred.token, cred.clientToken] : []));
        }
      });
    });

    try { if (linhas.length) SGO_DATA.insertMany(Notificar_aba_(), linhas); }
    catch (e) { console.error('NTF_ENVIOS: não foi possível registrar os envios: ' + ((e && e.message) || e)); }
  } catch (e) {
    console.error('SGO_notificar_: ' + ((e && e.message) || e));
  }
  return resumo;
}
