/****************************************************
 * CANAIS DE NOTIFICAÇÃO REUTILIZÁVEIS (2026-10-16)
 *
 *   SGO_notificar_({
 *     usuarios: [ids de CAD_USUARIOS],
 *     titulo: 'Assunto curto',
 *     texto: 'Texto completo (quebras de linha mantidas)',
 *     link: 'endereço opcional (padrão: endereço público do SGO+)',
 *     canais: ['sgo', 'email', 'whatsapp'],
 *     textoWhatsapp: 'opcional — resumo próprio para o WhatsApp (Z-API, texto livre)',
 *     modelo: { nome: 'sgo_...', parametros: [...] }  — opcional, WhatsApp oficial (Meta);
 *             '@NOME' vira o primeiro nome de cada destinatário e '@LINK' o link.
 *             Sem modelo, a Meta recebe sgo_aviso_geral (título, resumo, link).
 *     origem: 'AVISOS' | 'ATIVIDADES' | 'CONDUTA' ..., refId: 'id do registro',
 *     contatos: [{ id, nome, email, telefone, cadastro, motivo }]  — opcional: destinatários
 *             FORA de CAD_USUARIOS (ex.: contato do cliente/unidade nos avisos de O.S. do
 *             Auvo). Em NTF_ENVIOS o USUARIO_ID fica 'EXT:<id>'; 'cadastro' entra no motivo
 *             do PULADO ("Sem e-mail no cadastro do <cadastro>"); 'motivo' preenchido = pula
 *             e registra esse motivo.
 *     semLink: true — não põe o endereço do SGO+ no e-mail/WhatsApp (destinatário externo).
 *     Retorno (20/10/2026): além das contagens, resumo.ids = { usuárioId: id da mensagem no WhatsApp (Meta: wamid;
 *             Z-API: messageId) } para quem recebeu — o bate-papo (SGO_ComunicacaoWhatsapp.js, origem BATE_PAPO)
 *             guarda esse id para a resposta da pessoa ("responder a") voltar para a conversa certa.
 *     categoria: 'PONTO' — opcional (19/10/2026). Mensagem do ponto (marcação, banco de horas,
 *             espelho) só vai para quem tem CAD_USUARIOS.VINCULO_TRABALHO = "CLT". PJ e vínculo
 *             vazio (e contato externo, que não tem vínculo) ficam PULADO em NTF_ENVIOS com o
 *             motivo. Sem categoria (ou qualquer outra) a mensagem vai para todos, inclusive PJ.
 *             Hoje o SGO+ não manda mensagem de ponto: é proteção para o futuro.
 *     categoria: 'ATIVIDADES' — (19/10/2026) WhatsApp de Minhas atividades: só vínculo liberado (padrão CLT),
 *             só em dia útil e no horário de trabalho (SGO_Expediente.js) e no máximo UMA mensagem por
 *             pessoa por dia (conferido em NTF_ENVIOS: ORIGEM começando por ATIVIDADES, canal whatsapp, OK).
 *             E-mail não é barrado aqui: os e-mails de atividades já saem só no expediente (fila em ATV_AVISOS).
 *     categoria: 'FROTA_RESERVAS' — (20/10/2026) WhatsApp das reservas de veículo (SGO_Frota_Reservas.js): a mesma regra
 *             sutil (vínculo liberado, padrão CLT; dia útil e horário de trabalho; no máximo UMA mensagem de reservas por
 *             pessoa por dia, ORIGEM começando por FROTA_RESERVAS). Só é pedido quando a reserva está em risco no mesmo dia.
 *     categoria: 'GESTAO' — (20/10/2026) resumo da Caixa de decisões para o gestor (SGO_Gestao_Escada.js): mesma regra sutil, e o
 *             limite de UMA mensagem por dia é somado com o de atividades (ORIGEM começando por ATIVIDADES ou GESTAO): quem
 *             recebe o resumo da gestão no dia não recebe outro de atividades (o da gestão já leva a contagem das atividades).
 *   })
 *
 * PILOTO DO WHATSAPP (21/10/2026, SGO_WhatsappPiloto.js): com o piloto ligado, o WhatsApp só sai para as pessoas da lista
 * (Administração > Piloto do WhatsApp); cliente e contato externo não recebem, salvo telefone da lista. Quem não está na
 * lista fica em NTF_ENVIOS com SITUACAO = RETIDO e o motivo; o e-mail e o sistema seguem normais. Com o piloto ligado (ou
 * WHATSAPP_PROVEDOR = meta) a Z-API está fora: o provedor é sempre o WhatsApp oficial (Meta). Modelo da Meta com
 * situação conhecida e não aprovada (lida em Chaves e senhas > Situação dos modelos) não é usado: vai o sgo_aviso_geral
 * se ele estiver aprovado; senão a mensagem fica PULADO com o motivo. O servidor confere a mesma lista em toda chamada
 * de envio (sgo_servidor, servicos/whatsappPiloto.ts).
 *
 * Canais:
 *  'sgo'      — a janela/lista do próprio módulo que chama já cobre; aqui nada a fazer.
 *  'email'    — MailApp.sendEmail para CAD_USUARIOS.EMAIL (HTML simples). No servidor
 *               novo o MailApp vira a fila emails_saida e sai pelo SMTP do sistema.
 *  'whatsapp' — dois provedores, escolhidos pela propriedade WHATSAPP_PROVEDOR
 *               ('meta' | 'zapi'; vazia = meta se META_WA_TOKEN existir, senão zapi
 *               se a Z-API estiver configurada, senão "WhatsApp não configurado").
 *    meta  — WhatsApp Cloud API oficial (POST graph.facebook.com/v21.0/<PHONE_ID>/messages,
 *            Bearer <TOKEN>). Mensagem iniciada pela empresa SÓ por modelo aprovado
 *            (NTF_MODELOS_META; textos em sgo_servidor/docs/MODELOS_WHATSAPP_META.md).
 *            Propriedades: META_WA_TOKEN (segredo), META_WA_PHONE_ID, META_WA_WABA_ID.
 *    zapi  — Z-API (POST /instances/<INSTANCIA>/token/<TOKEN>/send-text, header
 *            Client-Token). Credenciais SÓ nas propriedades do script:
 *            ZAPI_INSTANCIA, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN. Sem modelo: texto pronto por
 *            destinatário (Notificar_textoZapi_) e envio por SGO_zapiEnviarTexto_ (SGO_Zapi.js,
 *            20/10/2026): só celular, fila única com o COMMAND, intervalo e limites do número.
 *               Telefone: primeiro
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
// Mesma mensagem, mesma pessoa, mesmo canal: não repete dentro desta janela (ver SGO_notificar_).
var NTF_JANELA_REPETICAO_SEG = 600;

function Notificar_hash_(s) {
  var h = 5381;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

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
      telefone: Notificar_normalizarTelefone_(u.CELULAR) || Notificar_normalizarTelefone_(u.WHATSAPP) || Notificar_normalizarTelefone_(u.TELEFONE),
      // Vínculo de trabalho (Usuários): "CLT", "PJ" ou "" — usado pela categoria PONTO.
      vinculo: String(u.VINCULO_TRABALHO || '').replace(/\s+/g, '').toUpperCase(),
      // perfil: usado pelo piloto do WhatsApp (liberar por área, SGO_WhatsappPiloto.js)
      perfil: SGO_UTILS.safeUpper(u.PERFIL)
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
  // 21/10/2026: Z-API fora do sistema (piloto do WhatsApp ou provedor meta) — nada sai por aqui
  if (typeof SGO_waZapiFora_ === 'function' && SGO_waZapiFora_()) return { ok: false, motivo: typeof WAP_MOTIVO_ZAPI !== 'undefined' ? WAP_MOTIVO_ZAPI : 'Z-API desligada.' };
  var url = 'https://api.z-api.io/instances/' + encodeURIComponent(cred.instancia) + '/token/' + encodeURIComponent(cred.token) + '/send-text';
  var r = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'Client-Token': cred.clientToken },
    payload: JSON.stringify({ phone: telefone, message: mensagem })
  });
  var codigo = r.getResponseCode();
  if (codigo >= 200 && codigo < 300) {
    var id = '';
    try { var j = JSON.parse(r.getContentText() || '{}') || {}; id = String(j.messageId || j.id || ''); } catch (e) { id = ''; }
    return { ok: true, id: id };
  }
  return { ok: false, motivo: 'Z-API respondeu ' + codigo + ': ' + String(r.getContentText() || '').slice(0, 200) };
}

/* ---------- WhatsApp oficial (Meta — WhatsApp Cloud API) ---------- */

var NTF_META_VERSAO = 'v21.0';
var NTF_META_IDIOMA = 'pt_BR';
var NTF_META_CATEGORIA = 'UTILITY';
/**
 * Modelos do WhatsApp oficial — ÚNICA definição no sistema, usada para ENVIAR
 * (Notificar_montarPedidoMeta_) e para CADASTRAR na Meta (Chaves e senhas,
 * Notificar_corpoCadastroMeta_). Textos iguais a sgo_servidor/docs/MODELOS_WHATSAPP_META.md.
 *   limites: tamanho máximo de cada variável ({{1}}, {{2}}, ...), na ordem;
 *   texto: corpo (BODY) do modelo; exemplos: valores fictícios exigidos pela Meta na análise.
 * Regras da Meta conferidas por Notificar_validarModeloMeta_: não começa nem termina com
 * variável, variáveis {{1}}..{{n}} em sequência, sem duas variáveis coladas, no máximo
 * uma linha em branco seguida, até 1.024 caracteres.
 */
var NTF_MODELOS_META = {
  sgo_aviso_geral: {
    uso: 'Avisos e notificações sem modelo próprio (assunto, resumo, link)',
    limites: [120, 600, 300],
    texto: 'Você recebeu um comunicado no SGO+.\n\nAssunto: {{1}}\n\n{{2}}\n\nLeia o comunicado completo e confirme a leitura em: {{3}}\n\nMetrolabs — SGO+',
    exemplos: ['Aviso importante: Novo procedimento de limpeza da bancada',
      'A partir de segunda-feira, a limpeza da bancada passa a ser registrada no início de cada turno. Prazo para confirmar a leitura: 20/10/2026 18:00. Confirme a leitura no SGO+.',
      'https://sgo.metrolabs.com.br']
  },
  sgo_atividade_atribuida: {
    uso: 'Minhas atividades: atividade atribuída (nome, atividade, prazo, link)',
    limites: [60, 200, 40, 300],
    texto: 'Olá, {{1}}. Uma atividade foi atribuída a você no SGO+.\n\nAtividade: {{2}}\nPrazo: {{3}}\n\nPara ver os detalhes, acesse: {{4}}\n\nMetrolabs — SGO+',
    exemplos: ['Maria', 'Calibrar a estufa da unidade Centro', '20/10/2026 18:00', 'https://sgo.metrolabs.com.br']
  },
  sgo_atividade_atrasada: {
    uso: 'Minhas atividades: previsão vencida (nome, atividade, previsão, link)',
    limites: [60, 200, 40, 300],
    texto: 'Olá, {{1}}. A atividade abaixo passou da previsão de entrega e ainda está aberta.\n\nAtividade: {{2}}\nPrevisão vencida em: {{3}}\n\nRegistre a justificativa com a nova previsão ou conclua a atividade em: {{4}}\n\nMetrolabs — SGO+',
    exemplos: ['João', 'Emitir certificado da autoclave 2', '15/10/2026 18:00', 'https://sgo.metrolabs.com.br']
  },
  // 19/10/2026: resumo do dia de Minhas atividades (no máximo um por pessoa por dia, só em dia útil e no
  // horário de trabalho — SGO_Atividades_Avisos.js). Enquanto a Meta não aprovar este modelo, o resumo
  // usa sgo_atividade_atrasada ou sgo_atividade_atribuida (já aprovados), com uma atividade e "e mais N".
  sgo_atividades_resumo_dia: {
    uso: 'Minhas atividades: resumo do dia (nome, novas, vencem hoje, venceram desde o último resumo, link)',
    limites: [60, 10, 10, 10, 300],
    texto: 'Olá, {{1}}. Este é o resumo das suas atividades no SGO+.\n\nNovas para você: {{2}}\nVencem hoje: {{3}}\nVenceram desde o último resumo: {{4}}\n\nPara ver os detalhes, acesse Minhas atividades: {{5}}\n\nMetrolabs — SGO+',
    exemplos: ['Maria', '2', '1', '0', 'https://sgo.metrolabs.com.br']
  },
  // 20/10/2026: resumo do dia da Caixa de decisões (um por gestor por dia, só quando há decisão parada há 2 dias úteis ou mais;
  // dia útil e horário de trabalho — SGO_Gestao_Escada.js). Enquanto a Meta não aprovar, o resumo sai pelo sgo_aviso_geral.
  sgo_gestao_resumo_dia: {
    uso: 'Caixa de decisões: resumo do dia do gestor (nome, decisões aguardando, paradas há 2 dias úteis ou mais, atividades próprias, link)',
    limites: [60, 10, 10, 60, 300],
    texto: 'Olá, {{1}}. Este é o resumo do que espera pela sua decisão no SGO+.\n\nDecisões aguardando você: {{2}}\nParadas há 2 dias úteis ou mais: {{3}}\nSuas atividades: {{4}}\n\nPara decidir, acesse a Caixa de decisões: {{5}}\n\nMetrolabs — SGO+',
    exemplos: ['Maria', '4', '2', '1 nova, 1 vence hoje', 'https://sgo.metrolabs.com.br']
  },
  sgo_justificativa_recebida: {
    uso: 'Minhas atividades: justificativa de atraso (colaborador, atividade, motivo, nova previsão)',
    limites: [80, 200, 300, 40],
    texto: 'Justificativa de atraso registrada no SGO+.\n\nColaborador: {{1}}\nAtividade: {{2}}\nMotivo: {{3}}\nNova previsão: {{4}}\n\nVeja o histórico em Atividades da equipe, no SGO+.\n\nMetrolabs — SGO+',
    exemplos: ['João Pereira', 'Emitir certificado da autoclave 2', 'O padrão de temperatura voltou da calibração externa só hoje.', '17/10/2026 18:00']
  },
  // 20/10/2026: aviso do bate-papo (mensagem direta ou menção para quem está fora do sistema; SGO_ComunicacaoWhatsapp.js:
  // dia útil, horário de trabalho, no máximo 1 por hora e 4 por dia, várias mensagens num aviso só). Enquanto a Meta
  // não aprovar, o aviso vai só por e-mail.
  sgo_bate_papo_mensagem: {
    uso: 'Bate-papo: mensagem direta ou menção para quem está fora do sistema (nome, remetente, mensagem, link)',
    limites: [60, 160, 600, 300],
    texto: 'Olá, {{1}}. Você tem mensagem de {{2}} no bate-papo do SGO+.\n\n{{3}}\n\nPara responder, responda esta mensagem ou abra a conversa no SGO+: {{4}}\n\nMetrolabs — SGO+',
    exemplos: ['Maria', 'João Pereira', 'Consegue confirmar o horário da visita de amanhã na unidade Centro?', 'https://sgo.metrolabs.com.br']
  },
  sgo_missao_nova: {
    uso: 'Programa de conduta: missão nova (nome, destino, data, link)',
    limites: [60, 200, 40, 300],
    texto: 'Olá, {{1}}. Uma missão em que você é executante foi cadastrada no SGO+.\n\nDestino: {{2}}\nData: {{3}}\n\nConfira os dados no Programa de conduta: {{4}}\n\nMetrolabs — SGO+',
    exemplos: ['Carlos', 'Hospital Exemplo — Anápolis', '16/10/2026', 'https://sgo.metrolabs.com.br']
  },
  sgo_chamado_aberto: {
    uso: 'Chamado técnico aberto (cliente, chamado, agendamento) — Auvo/COMMAND',
    limites: [120, 200, 120],
    texto: 'Chamado técnico aberto.\n\nCliente: {{1}}\nChamado: {{2}}\nAgendamento: {{3}}\n\nAcompanharemos o atendimento e avisaremos a conclusão.\n\nMetrolabs — SGO+',
    exemplos: ['Clínica Exemplo Ltda.', 'Nº 1234 — manutenção corretiva da autoclave', '21/10/2026, técnico Carlos']
  },
  sgo_chamado_concluido: {
    uso: 'Chamado técnico concluído (cliente, chamado, data) — Auvo/COMMAND',
    limites: [120, 200, 60],
    texto: 'Chamado técnico concluído.\n\nCliente: {{1}}\nChamado: {{2}}\nConcluído em: {{3}}\n\nEm caso de dúvida, responda esta mensagem ou fale com a Metrolabs.\n\nMetrolabs — SGO+',
    exemplos: ['Clínica Exemplo Ltda.', 'Nº 1234', '21/10/2026']
  }
};

/** Confere um modelo contra as regras da Meta. Devolve a lista de problemas (vazia = ok). */
function Notificar_validarModeloMeta_(nome, def) {
  var erros = [];
  if (!/^[a-z0-9_]{1,512}$/.test(String(nome || ''))) erros.push('nome com caracteres fora de a-z, 0-9 e _');
  if (!def || typeof def.texto !== 'string') { erros.push('sem texto'); return erros; }
  var t = def.texto;
  if (!t.trim()) erros.push('texto vazio');
  if (t.length > 1024) erros.push('texto com mais de 1.024 caracteres');
  if (/^\s*\{\{\d+\}\}/.test(t)) erros.push('o texto começa com variável');
  if (/\{\{\d+\}\}[\s.!?]*$/.test(t)) erros.push('o texto termina com variável');
  if (/\{\{\d+\}\}[ \t]*\{\{\d+\}\}/.test(t)) erros.push('duas variáveis coladas');
  if (/\n\s*\n\s*\n/.test(t)) erros.push('mais de uma linha em branco seguida');
  if (/[\t]| {4,}/.test(t)) erros.push('tabulação ou 4 ou mais espaços seguidos');
  var nums = (t.match(/\{\{(\d+)\}\}/g) || []).map(function (x) { return parseInt(x.replace(/\D/g, ''), 10); });
  for (var i = 0; i < nums.length; i++) if (nums[i] !== i + 1) { erros.push('variáveis fora de sequência ({{1}}, {{2}}, ...) ou repetidas'); break; }
  if (/\{\{(?!\d+\}\})/.test(t)) erros.push('variável mal escrita (use {{1}}, {{2}}, ...)');
  var n = nums.length;
  if (!def.limites || def.limites.length !== n) erros.push('limites não batem com as ' + n + ' variáveis');
  if (!def.exemplos || def.exemplos.length !== n) erros.push('exemplos não batem com as ' + n + ' variáveis');
  (def.exemplos || []).forEach(function (ex, k) {
    if (!String(ex || '').trim() || /[\r\n\t]| {4,}/.test(String(ex))) erros.push('exemplo {{' + (k + 1) + '}} vazio ou com quebra de linha');
  });
  return erros;
}

/** Corpo do POST /<WABA_ID>/message_templates para cadastrar um dos modelos fixos. */
function Notificar_corpoCadastroMeta_(nomeModelo) {
  var def = Object.prototype.hasOwnProperty.call(NTF_MODELOS_META, nomeModelo) ? NTF_MODELOS_META[nomeModelo] : null;
  if (!def) throw new Error('Modelo de WhatsApp desconhecido: ' + nomeModelo + '.');
  var erros = Notificar_validarModeloMeta_(nomeModelo, def);
  if (erros.length) throw new Error('O modelo ' + nomeModelo + ' está fora das regras da Meta: ' + erros.join('; ') + '.');
  return {
    name: nomeModelo,
    language: NTF_META_IDIOMA,
    category: NTF_META_CATEGORIA,
    components: [{ type: 'BODY', text: def.texto, example: { body_text: [def.exemplos.slice()] } }]
  };
}

/** Variável de modelo da Meta: sem quebra de linha/tab, sem 4+ espaços seguidos, nunca vazia. */
function Notificar_paramMeta_(v, max) {
  var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
  max = max || 600;
  if (s.length > max) s = s.slice(0, max - 3).replace(/\s+$/, '') + '...';
  return s || '-';
}

/** "MARIA DA SILVA" -> "Maria". */
function Notificar_primeiroNome_(nome) {
  var p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : 'colaborador';
}

/** Pedido do envio por modelo: { url, corpo }. Lança erro se o modelo não for um dos fixos ou faltar variável. */
function Notificar_montarPedidoMeta_(phoneId, telefone, nomeModelo, parametros) {
  var def = Object.prototype.hasOwnProperty.call(NTF_MODELOS_META, nomeModelo) ? NTF_MODELOS_META[nomeModelo] : null;
  var limites = def && def.limites;
  if (!limites) throw new Error('Modelo de WhatsApp desconhecido: ' + nomeModelo + '.');
  var ps = parametros || [];
  if (ps.length !== limites.length) throw new Error('O modelo ' + nomeModelo + ' tem ' + limites.length + ' variáveis; vieram ' + ps.length + '.');
  return {
    url: 'https://graph.facebook.com/' + NTF_META_VERSAO + '/' + encodeURIComponent(String(phoneId)) + '/messages',
    corpo: {
      messaging_product: 'whatsapp',
      to: String(telefone),
      type: 'template',
      template: {
        name: nomeModelo,
        language: { code: NTF_META_IDIOMA },
        components: [{ type: 'body', parameters: ps.map(function (v, i) { return { type: 'text', text: Notificar_paramMeta_(v, limites[i]) }; }) }]
      }
    }
  };
}

function Notificar_credenciaisMeta_() {
  var p = PropertiesService.getScriptProperties();
  return {
    token: String(p.getProperty('META_WA_TOKEN') || '').trim(),
    phoneId: String(p.getProperty('META_WA_PHONE_ID') || '').replace(/\D/g, ''),
    wabaId: String(p.getProperty('META_WA_WABA_ID') || '').replace(/\D/g, '')
  };
}

/**
 * Qual WhatsApp usar: { provedor: 'meta'|'zapi'|'', cred, segredos, motivo }.
 * provedor vazio = não configurado (motivo diz o que gravar e onde).
 */
function Notificar_provedorWhatsapp_() {
  var escolha = '';
  try { escolha = String(PropertiesService.getScriptProperties().getProperty('WHATSAPP_PROVEDOR') || '').trim().toLowerCase(); } catch (e) {}
  var meta = Notificar_credenciaisMeta_(), zapi = Notificar_credenciaisZapi_();
  var zapiOk = !!(zapi.instancia && zapi.token && zapi.clientToken);
  if (escolha && escolha !== 'meta' && escolha !== 'zapi') {
    return { provedor: '', motivo: 'WhatsApp não configurado: a chave WHATSAPP_PROVEDOR tem "' + escolha.slice(0, 20) + '"; use meta ou zapi (Chaves e senhas do SGO+).' };
  }
  // 21/10/2026: com o piloto do WhatsApp ligado (ou o provedor meta) a Z-API está fora — o WhatsApp do sistema é o oficial
  var zapiFora = typeof SGO_waZapiFora_ === 'function' && SGO_waZapiFora_();
  if (zapiFora || escolha === 'meta' || (!escolha && meta.token)) {
    var falta = [];
    if (!meta.token) falta.push('META_WA_TOKEN');
    if (!meta.phoneId) falta.push('META_WA_PHONE_ID');
    if (falta.length) return { provedor: '', motivo: 'WhatsApp oficial (Meta) não configurado: falta gravar ' + falta.join(' e ') + ' em Chaves e senhas do SGO+.' + (zapiFora && escolha !== 'meta' ? ' A Z-API está desligada: o WhatsApp do sistema é o oficial (Meta).' : '') };
    return { provedor: 'meta', cred: meta, segredos: [meta.token] };
  }
  if (escolha === 'zapi' || zapiOk) {
    if (!zapiOk) return { provedor: '', motivo: 'WhatsApp não configurado (faltam as chaves ZAPI_INSTANCIA, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN).' };
    return { provedor: 'zapi', cred: zapi, segredos: [zapi.instancia, zapi.token, zapi.clientToken] };
  }
  return { provedor: '', motivo: 'WhatsApp não configurado: grave META_WA_TOKEN e META_WA_PHONE_ID (WhatsApp oficial) ou as 3 chaves da Z-API em Chaves e senhas do SGO+.' };
}

/** O que fazer quando a Meta recusa, pelos códigos mais comuns. */
var NTF_META_DICAS = {
  '190': 'token inválido ou vencido; gere um token permanente (usuário do sistema) e grave de novo META_WA_TOKEN',
  '10': 'o token não tem permissão whatsapp_business_messaging para este número',
  '100': 'pedido recusado; confira META_WA_PHONE_ID (é o Phone Number ID, não o número)',
  '131026': 'o número não tem WhatsApp ou não aceitou os termos',
  '131030': 'número fora da lista de teste; com o número de teste, cadastre o destinatário na Meta',
  '131047': 'passou a janela de 24 h; só modelo aprovado',
  '131049': 'a Meta segurou a mensagem para não saturar o destinatário; tente mais tarde',
  '132000': 'quantidade de variáveis diferente da cadastrada no modelo',
  '132001': 'o modelo não existe ou não foi aprovado em pt_BR; cadastre conforme MODELOS_WHATSAPP_META.md',
  '132005': 'texto das variáveis longo demais para o modelo',
  '132007': 'o conteúdo violou a política de modelos da Meta',
  '132015': 'o modelo foi pausado pela Meta por baixa qualidade',
  '132016': 'o modelo foi desativado pela Meta',
  '133010': 'o número da empresa ainda não está registrado na Cloud API'
};

/** Envia um modelo. Devolve { ok, id } ou { ok:false, motivo } com o código e a mensagem da Meta. */
function Notificar_enviarMeta_(cred, telefone, nomeModelo, parametros) {
  var ped = Notificar_montarPedidoMeta_(cred.phoneId, telefone, nomeModelo, parametros);
  var r = UrlFetchApp.fetch(ped.url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + cred.token },
    payload: JSON.stringify(ped.corpo)
  });
  var codigo = r.getResponseCode(), txt = String(r.getContentText() || ''), j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  if (codigo >= 200 && codigo < 300 && !(j && j.error)) {
    var id = j && j.messages && j.messages[0] && j.messages[0].id ? String(j.messages[0].id) : '';
    return { ok: true, id: id };
  }
  var er = (j && j.error) || {};
  var cod = er.code !== undefined ? String(er.code) : '';
  var detalhe = er.error_data && er.error_data.details ? String(er.error_data.details) : '';
  var msg = String(er.message || '') + (detalhe && String(er.message || '').indexOf(detalhe) < 0 ? ' (' + detalhe + ')' : '');
  if (!msg) msg = txt.slice(0, 200);
  var dica = NTF_META_DICAS[cod] || '';
  return { ok: false, motivo: 'Meta recusou (HTTP ' + codigo + (cod ? ', código ' + cod + (er.error_subcode ? '/' + er.error_subcode : '') : '') + '): ' + msg.slice(0, 260) + (dica ? ' — ' + dica + '.' : '') };
}

/**
 * Envia a notificação pelos canais pedidos. Devolve { ok, erro, pulado } (contagens).
 * Nunca lança erro.
 */
/**
 * Categoria PONTO (19/10/2026): devolve o motivo para NÃO enviar, ou '' quando pode enviar.
 * Só a categoria PONTO tem restrição; ela vale para todos os canais.
 */
var NTF_MOTIVO_PONTO_PJ = 'PJ: mensagens do ponto não são enviadas';
var NTF_MOTIVO_PONTO_SEM_VINCULO = 'vínculo de trabalho não informado';
function Notificar_motivoCategoria_(categoria, contato) {
  if (String(categoria || '').trim().toUpperCase() !== 'PONTO') return '';
  var v = contato && !contato.externo ? String(contato.vinculo || '').toUpperCase() : '';
  if (v === 'CLT') return '';
  if (v === 'PJ') return NTF_MOTIVO_PONTO_PJ;
  return NTF_MOTIVO_PONTO_SEM_VINCULO;
}

/**
 * Categoria ATIVIDADES (19/10/2026), só no WhatsApp: mensagem de atividades é sutil por regra.
 * Devolve o motivo para NÃO enviar ('' = pode enviar):
 *  - vínculo de trabalho fora da lista liberada (padrão: só CLT; PJ e vazio ficam no sistema e no e-mail);
 *  - fora do expediente (fim de semana, feriado, antes ou depois do horário — SGO_Expediente.js);
 *  - a pessoa já recebeu hoje uma mensagem de atividades pelo WhatsApp (no máximo uma por dia).
 * enviadosHoje: mapa usuárioId -> true, lido uma vez por chamada de NTF_ENVIOS.
 */
var NTF_MOTIVO_ATV_LIMITE = 'limite de uma mensagem de atividades por dia pelo WhatsApp já atingido hoje';
function Notificar_motivoAtividadesWhatsapp_(contato, enviadosHoje, agora) {
  var cfg = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
  if (cfg.whatsappResumo === false) return 'resumo de atividades pelo WhatsApp desligado em Avisos e horários';
  var v = contato && !contato.externo ? String(contato.vinculo || '').toUpperCase() : '';
  var lib = (cfg.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
  if (lib.indexOf(v || 'VAZIO') < 0) {
    return v === 'PJ' ? 'PJ: atividades não são cobradas pelo WhatsApp (seguem no sistema e por e-mail)'
      : (v ? 'vínculo ' + v + ' fora da lista do WhatsApp de atividades' : 'vínculo de trabalho não informado (Administração > Usuários > Vínculo); atividades seguem no sistema e por e-mail');
  }
  if (typeof SGO_dentroDoExpediente_ === 'function') {
    var ex = SGO_dentroDoExpediente_(agora || new Date());
    if (!ex.dentro) return 'fora do expediente (' + ex.motivo + '); WhatsApp de atividades só em dia útil e no horário de trabalho';
  }
  if (contato && enviadosHoje && enviadosHoje[String(contato.id)]) return NTF_MOTIVO_ATV_LIMITE;
  return '';
}

/**
 * Categoria GESTAO (20/10/2026): resumo da Caixa de decisões. Mesma regra sutil (vínculo liberado, dia útil, horário de
 * trabalho) e o MESMO limite diário das atividades: uma mensagem por pessoa por dia somando as duas.
 */
var NTF_MOTIVO_GESTAO_LIMITE = 'limite de uma mensagem por dia pelo WhatsApp (atividades e gestão) já atingido hoje';
function Notificar_motivoGestaoWhatsapp_(contato, enviadosHoje, agora) {
  var cfg = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
  var v = contato && !contato.externo ? String(contato.vinculo || '').toUpperCase() : '';
  var lib = (cfg.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
  if (lib.indexOf(v || 'VAZIO') < 0) {
    return v === 'PJ' ? 'PJ: o resumo da gestão não vai pelo WhatsApp (segue no sistema e por e-mail)'
      : (v ? 'vínculo ' + v + ' fora da lista do WhatsApp' : 'vínculo de trabalho não informado (Administração > Usuários > Vínculo); o resumo segue no sistema e por e-mail');
  }
  if (typeof SGO_dentroDoExpediente_ === 'function') {
    var ex = SGO_dentroDoExpediente_(agora || new Date());
    if (!ex.dentro) return 'fora do expediente (' + ex.motivo + '); WhatsApp da gestão só em dia útil e no horário de trabalho';
  }
  if (contato && enviadosHoje && enviadosHoje[String(contato.id)]) return NTF_MOTIVO_GESTAO_LIMITE;
  return '';
}

/** Categoria FROTA_RESERVAS (20/10/2026): mesma regra sutil das atividades, com limite próprio (uma por pessoa por dia). */
var NTF_MOTIVO_FROTA_LIMITE = 'limite de uma mensagem de reservas da Frota por dia pelo WhatsApp já atingido hoje';
function Notificar_motivoFrotaReservasWhatsapp_(contato, enviadosHoje, agora) {
  var cfg = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
  var v = contato && !contato.externo ? String(contato.vinculo || '').toUpperCase() : '';
  var lib = (cfg.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
  if (lib.indexOf(v || 'VAZIO') < 0) {
    return v === 'PJ' ? 'PJ: avisos de reserva da Frota não vão pelo WhatsApp (seguem no sistema e por e-mail)'
      : (v ? 'vínculo ' + v + ' fora da lista do WhatsApp' : 'vínculo de trabalho não informado (Administração > Usuários > Vínculo); o aviso segue no sistema e por e-mail');
  }
  if (typeof SGO_dentroDoExpediente_ === 'function') {
    var ex = SGO_dentroDoExpediente_(agora || new Date());
    if (!ex.dentro) return 'fora do expediente (' + ex.motivo + '); WhatsApp de reservas só em dia útil e no horário de trabalho';
  }
  if (contato && enviadosHoje && enviadosHoje[String(contato.id)]) return NTF_MOTIVO_FROTA_LIMITE;
  return '';
}

/**
 * Quem já recebeu hoje (fuso da empresa) mensagem pelo WhatsApp com ORIGEM começando pelo prefixo: { usuárioId: true }.
 * prefixo pode ser uma lista (20/10/2026: atividades e gestão dividem o mesmo limite de uma por dia).
 */
function Notificar_whatsAtividadesHoje_(prefixo) {
  var hoje = Utilities.formatDate(new Date(), NTF_FUSO, 'yyyy-MM-dd'), mapa = {};
  var prefixos = (Array.isArray(prefixo) ? prefixo : [prefixo || 'ATIVIDADES']).map(function (p) { return String(p).toUpperCase(); });
  try {
    SGO_DATA.getAll(Notificar_aba_()).forEach(function (r) {
      if (String(r.CANAL || '').toLowerCase() !== 'whatsapp' || String(r.SITUACAO || '').toUpperCase() !== 'OK') return;
      var org = String(r.ORIGEM || '').toUpperCase();
      if (!prefixos.some(function (p) { return org.indexOf(p) === 0; })) return;
      var q = r.QUANDO;
      var dia = Object.prototype.toString.call(q) === '[object Date]' ? Utilities.formatDate(q, NTF_FUSO, 'yyyy-MM-dd') : String(q || '').slice(0, 10);
      if (dia === hoje) mapa[String(r.USUARIO_ID || '')] = true;
    });
  } catch (e) { /* aba ausente: ninguém recebeu */ }
  return mapa;
}

function SGO_notificar_(opcoes) {
  var resumo = { ok: 0, erro: 0, pulado: 0 };
  try {
    var o = opcoes || {};
    var ids = [];
    (o.usuarios || []).forEach(function (id) { id = String(id || '').trim(); if (id && ids.indexOf(id) < 0) ids.push(id); });
    var contatosFora = [];
    (o.contatos || []).forEach(function (x, i) {
      if (!x) return;
      var k = 'EXT:' + String(x.id || ('contato' + i)).slice(0, 70);
      if (ids.indexOf(k) >= 0) return;
      ids.push(k);
      contatosFora.push({ k: k, x: x });
    });
    var canais = (o.canais && o.canais.length ? o.canais : ['sgo', 'email', 'whatsapp']).map(function (c) { return String(c).toLowerCase(); });
    var externos = canais.filter(function (c) { return c === 'email' || c === 'whatsapp'; });
    if (!ids.length || !externos.length) return resumo;

    Notificar_garantirAba_();
    var titulo = String(o.titulo || 'Aviso do SGO+').replace(/\s+/g, ' ').trim().slice(0, 180);
    var texto = String(o.texto || '').trim();
    var link = o.semLink ? '' : (o.link === undefined || o.link === null || o.link === '' ? Notificar_linkSgo_() : String(o.link));
    var origem = String(o.origem || '').slice(0, 40), refId = String(o.refId || '').slice(0, 80);
    var categoria = String(o.categoria || '').trim().toUpperCase();
    var contatos = Notificar_contatos_(ids);
    contatosFora.forEach(function (e) {
      contatos[e.k] = {
        id: e.k, externo: true, nome: SGO_UTILS.safe(e.x.nome), cadastro: SGO_UTILS.safe(e.x.cadastro) || 'contato',
        email: SGO_UTILS.safeLower(e.x.email).trim(), telefone: Notificar_normalizarTelefone_(e.x.telefone),
        ativo: true, motivo: SGO_UTILS.safe(e.x.motivo)
      };
    });
    var linhas = [];
    var registrar = function (uid, nome, canal, destino, situacao, motivo) {
      resumo[situacao === 'OK' ? 'ok' : situacao === 'ERRO' ? 'erro' : 'pulado']++;
      if (situacao !== 'OK') resumo.motivo = String(motivo || '').slice(0, 300); // último motivo de PULADO/ERRO (quem chamou pode registrar)
      linhas.push({
        QUANDO: Notificar_agora_(), USUARIO_ID: uid, USUARIO_NOME: nome || '', CANAL: canal, DESTINO: destino || '',
        ASSUNTO: titulo, ORIGEM: origem, REF_ID: refId, SITUACAO: situacao, MOTIVO: String(motivo || '').slice(0, 480)
      });
    };

    var cotaEmail = null;
    var pilotoCfg = null; // piloto do WhatsApp (SGO_WhatsappPiloto.js): lido só se houver WhatsApp a mandar
    var whatsAtvHoje = null; // categoria ATIVIDADES: quem já recebeu hoje (lido só se precisar)
    var wa = externos.indexOf('whatsapp') >= 0 ? Notificar_provedorWhatsapp_() : { provedor: '', segredos: [] };
    var segredos = wa.segredos || [];
    var modelo = o.modelo && o.modelo.nome ? { nome: String(o.modelo.nome), parametros: (o.modelo.parametros || []).slice() } : null;
    if (!modelo) {
      var resumoMeta = texto.replace(/\s+/g, ' ');
      modelo = { nome: 'sgo_aviso_geral', parametros: [titulo, resumoMeta || titulo, '@LINK'] };
    }
    var paramsPara = function (c) {
      return modelo.parametros.map(function (v) {
        if (v === '@NOME') return Notificar_primeiroNome_(c.nome);
        if (v === '@LINK') return link || 'acesse o SGO+';
        return v;
      });
    };
    var htmlEmail = Notificar_htmlEmail_(titulo, texto, link);
    var txtEmail = Notificar_textoEmail_(titulo, texto, link);
    // 20/10/2026: Z-API sem modelo — texto pronto por destinatário (SGO_Zapi.js, Notificar_textoZapi_): o texto próprio do
    // módulo; senão o texto do modelo que o módulo pediu, preenchido; senão o aviso geral com saudação, assunto e link.
    var baseZapi = { textoWhatsapp: String(o.textoWhatsapp || '').trim(), modelo: o.modelo && o.modelo.nome ? modelo : null, params: paramsPara, titulo: titulo, texto: texto, link: link };
    var txtWhatsPara = function (c) {
      if (typeof Notificar_textoZapi_ === 'function') return Notificar_textoZapi_(baseZapi, c);
      var t = baseZapi.textoWhatsapp || ('SGO+ Metrolabs - ' + titulo + (texto ? '\n\n' + texto.replace(/\s+/g, ' ').slice(0, 400) : ''));
      return link && t.indexOf(link) < 0 ? t + '\n\nAbra o SGO+: ' + link : t;
    };

    // 17/10/2026: a mesma mensagem para a mesma pessoa pelo mesmo canal não sai duas vezes em 10 minutos,
    // venha do caminho que vier (duplo clique em Publicar/Reenviar, a verificação das telas e a rotina de
    // hora em hora avisando o mesmo atraso, duas sincronizações do Auvo ao mesmo tempo). Fica PULADO com o motivo.
    // A assinatura inclui o registro de origem (refId): dois avisos diferentes com o mesmo texto
    // (duas atividades com o mesmo título, por exemplo) saem os dois; o mesmo registro não repete.
    var assinaturaMsg = Notificar_hash_(refId + '|' + titulo + '|' + texto + '|' + (modelo ? modelo.nome + ':' + modelo.parametros.join('|') : ''));
    var cacheDup = null;
    try { cacheDup = CacheService.getScriptCache(); } catch (e) { cacheDup = null; }
    var chaveDup = function (uid, canal) { return 'NTF_DUP_' + Notificar_hash_(uid + '|' + canal) + '_' + assinaturaMsg; };

    ids.forEach(function (uid) {
      var c = contatos[uid];
      externos.forEach(function (canal) {
        var reservaFeita = false;
        try {
          if (!c) { registrar(uid, '', canal, '', 'PULADO', 'Usuário não encontrado no cadastro.'); return; }
          if (!c.ativo) { registrar(uid, c.nome, canal, '', 'PULADO', 'Usuário inativo.'); return; }
          if (c.motivo) { registrar(uid, c.nome, canal, '', 'PULADO', c.motivo); return; }
          var barradoCategoria = Notificar_motivoCategoria_(categoria, c);
          if (barradoCategoria) { registrar(uid, c.nome, canal, '', 'PULADO', barradoCategoria); return; }
          if ((categoria === 'ATIVIDADES' || categoria === 'GESTAO') && canal === 'whatsapp') {
            if (whatsAtvHoje === null) whatsAtvHoje = Notificar_whatsAtividadesHoje_(['ATIVIDADES', 'GESTAO']);
            var barradoAtv = categoria === 'GESTAO' ? Notificar_motivoGestaoWhatsapp_(c, whatsAtvHoje) : Notificar_motivoAtividadesWhatsapp_(c, whatsAtvHoje);
            if (barradoAtv) { registrar(uid, c.nome, canal, c.telefone, 'PULADO', barradoAtv); return; }
          }
          if (categoria === 'FROTA_RESERVAS' && canal === 'whatsapp') {
            if (whatsAtvHoje === null) whatsAtvHoje = Notificar_whatsAtividadesHoje_('FROTA_RESERVAS');
            var barradoRes = Notificar_motivoFrotaReservasWhatsapp_(c, whatsAtvHoje);
            if (barradoRes) { registrar(uid, c.nome, canal, c.telefone, 'PULADO', barradoRes); return; }
          }
          // 21/10/2026: piloto do WhatsApp — só as pessoas da lista recebem; as demais ficam RETIDO (sistema e e-mail seguem)
          if (canal === 'whatsapp' && typeof SGO_waPilotoMotivo_ === 'function') {
            if (pilotoCfg === null) { SGO_waPilotoSincronizar_(false); pilotoCfg = SGO_waPilotoCfg_(); }
            var barradoPiloto = SGO_waPilotoMotivo_(c, pilotoCfg);
            if (barradoPiloto) { registrar(uid, c.nome, canal, c.telefone, 'RETIDO', barradoPiloto); return; }
          }
          var jaFoi = cacheDup ? cacheDup.get(chaveDup(uid, canal)) : null;
          if (jaFoi) { registrar(uid, c.nome, canal, canal === 'email' ? c.email : c.telefone, 'PULADO', 'Mesma mensagem já enviada a esta pessoa por este canal às ' + String(jaFoi).split('|')[0] + ' (origem ' + (String(jaFoi).split('|')[1] || 'SGO+') + '); não foi repetida.'); return; }
          // reserva antes de enviar (dois caminhos ao mesmo tempo não enviam os dois); falhou = libera
          var reservar = function () { try { if (cacheDup) cacheDup.put(chaveDup(uid, canal), Utilities.formatDate(new Date(), NTF_FUSO, 'HH:mm') + '|' + (origem || 'SGO+'), NTF_JANELA_REPETICAO_SEG); } catch (e) {} };
          var liberar = function () { try { if (cacheDup) cacheDup.remove(chaveDup(uid, canal)); } catch (e) {} };
          if (canal === 'email') {
            if (!c.email || c.email.indexOf('@') < 0) { registrar(uid, c.nome, canal, '', 'PULADO', 'Sem e-mail no cadastro do ' + (c.externo ? c.cadastro : 'usuário') + '.'); return; }
            if (cotaEmail === null) { try { cotaEmail = MailApp.getRemainingDailyQuota(); } catch (e) { cotaEmail = 1; } }
            if (cotaEmail < 1) { registrar(uid, c.nome, canal, c.email, 'PULADO', 'Cota diária de e-mails esgotada; tente de novo amanhã.'); return; }
            reservar(); reservaFeita = true;
            MailApp.sendEmail({ to: c.email, subject: 'SGO+ | ' + titulo, body: txtEmail, htmlBody: htmlEmail, name: 'SGO+ Metrolabs' });
            cotaEmail--;
            registrar(uid, c.nome, canal, c.email, 'OK', 'Entregue ao serviço de e-mail.');
          } else {
            if (!wa.provedor) { registrar(uid, c.nome, canal, c.telefone, 'PULADO', wa.motivo); return; }
            if (!c.telefone) { registrar(uid, c.nome, canal, '', 'PULADO', c.externo ? 'Sem telefone celular válido no cadastro do ' + c.cadastro + '.' : 'Sem telefone celular válido no cadastro (usuário, condutor ou técnico).'); return; }
            var r;
            reservar(); reservaFeita = true;
            if (wa.provedor === 'meta') {
              // 21/10/2026: modelo com situação conhecida e não aprovada na Meta não é usado (Chaves e senhas > Situação dos modelos)
              var nomeMod = modelo.nome, paramsMod = paramsPara(c);
              var stMod = typeof SGO_waModeloSituacao_ === 'function' ? SGO_waModeloSituacao_(nomeMod) : '';
              if (stMod && stMod !== 'APPROVED') {
                var stGeral = SGO_waModeloSituacao_('sgo_aviso_geral');
                if (nomeMod !== 'sgo_aviso_geral' && (!stGeral || stGeral === 'APPROVED')) {
                  nomeMod = 'sgo_aviso_geral';
                  paramsMod = [titulo, texto.replace(/\s+/g, ' ') || titulo, link || 'acesse o SGO+'];
                } else {
                  liberar();
                  registrar(uid, c.nome, canal, c.telefone, 'PULADO', 'Modelo ' + nomeMod + ' do WhatsApp não aprovado na Meta (situação: ' + stMod + '); a mensagem ficou no sistema e no e-mail. Confira em Chaves e senhas > Situação dos modelos.');
                  return;
                }
              }
              r = Notificar_enviarMeta_(wa.cred, c.telefone, nomeMod, paramsMod);
              if (r.ok) { resumo.ids = resumo.ids || {}; resumo.ids[uid] = r.id || ''; if (whatsAtvHoje) whatsAtvHoje[uid] = true; registrar(uid, c.nome, canal, c.telefone, 'OK', 'Aceito pela Meta (modelo ' + nomeMod + (r.id ? ', id ' + r.id : '') + ').'); return; }
            } else {
              // envio único da Z-API (SGO_Zapi.js): só celular válido, fila única com o COMMAND, intervalo e limites do número
              r = typeof SGO_zapiEnviarTexto_ === 'function' ? SGO_zapiEnviarTexto_(c.telefone, txtWhatsPara(c), { cred: wa.cred, tipo: 'AVISO' }) : Notificar_enviarWhatsapp_(wa.cred, c.telefone, txtWhatsPara(c));
              if (r.pulado) { liberar(); registrar(uid, c.nome, canal, c.telefone, 'PULADO', r.motivo); return; }
              if (r.ok) { resumo.ids = resumo.ids || {}; resumo.ids[uid] = r.id || ''; if (whatsAtvHoje) whatsAtvHoje[uid] = true; registrar(uid, c.nome, canal, c.telefone, 'OK', 'Aceito pela Z-API.'); return; }
            }
            liberar();
            registrar(uid, c.nome, canal, c.telefone, 'ERRO', Notificar_limparSegredos_(r.motivo, segredos));
          }
        } catch (e) {
          if (reservaFeita) { try { if (cacheDup) cacheDup.remove(chaveDup(uid, canal)); } catch (e2) {} }
          registrar(uid, c ? c.nome : '', canal, c ? (canal === 'email' ? c.email : c.telefone) : '', 'ERRO',
            Notificar_limparSegredos_((e && e.message) || e, segredos));
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
