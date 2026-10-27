/**
 * Bate-papo — envio de imagens (só no SGO+; decisão do dono, 27/10/2026).
 *
 * Permitido para todos, sem bloqueio automático de print, para ilustrar o assunto, mas:
 *  - aviso fixo junto do envio (COM_IMG_AVISO, texto aprovado pelo dono);
 *  - explicação escrita obrigatória (legenda de COM_IMG_LIM.legendaMin a legendaMax caracteres);
 *  - a gestão (Diretoria e Administrador) desliga o envio para todos, com motivo, quem e quando (COM_CONFIG img_*);
 *    ligado por padrão. Desligado, nada novo entra; as imagens já enviadas continuam visíveis para quem é da conversa.
 *
 * Fica FORA de Comunicacao.js (idêntico ao do COMMAND): API própria comImagemApi(token, acao, dados), que usa as funções
 * do núcleo (sessão, pessoa, conversa, mensagem). A mensagem vai para COM_MENSAGENS como qualquer outra, com
 * texto "Imagem: <legenda>" (é o que aparece na lista, nos balões, no aviso pelo WhatsApp e no COMMAND, que não mostra
 * a imagem), ref_tipo "COM_IMAGEM", ref_id = id da imagem (uuid) e ref_sistema vazio (sem link "abrir no ...").
 *
 * ARQUIVO E ACESSO: a imagem (JPEG reduzido no navegador, até 1600 px) e a miniatura ficam no "Drive" do servidor, na
 * pasta COM_IMG_PROP_PASTA, com nome COMIMG_<id> e COMIMG_<id>_mini, marcadas setSharing("RESTRITO", "SISTEMA"): o
 * servidor (sgo_servidor) não as entrega por /arquivos/:id (nem com sessão), não as lista em /pastas/:id e não as anexa
 * a e-mail por ID. O ID do arquivo nunca sai daqui; o navegador recebe a imagem em data: pela comImagemApi, só depois de
 * conferir que a pessoa participa AGORA da conversa em que a imagem foi enviada (gravada na descrição do arquivo, não na
 * mensagem: mensagem forjada com ref_tipo COM_IMAGEM em outra conversa não abre a imagem).
 */

var COM_IMG_TIPO = "COM_IMAGEM";
var COM_IMG_PREFIXO = "Imagem: ";
var COM_IMG_PROP_PASTA = "COM_IMG_PASTA_ID";
var COM_IMG_NOME_PASTA = "SGO+ Bate-papo — imagens (restrito)";
var COM_IMG_AVISO = "Imagens devem servir para ilustrar o assunto, sempre acompanhadas de uma explicação escrita. O envio de prints de conversas ou de mensagens sem contexto, que dificultem o entendimento, não é permitido. O uso inadequado poderá levar à desativação deste recurso para todos.";
var COM_IMG_LIM = {
  legendaMin: 10,          // caracteres da explicação (sem contar espaços nas pontas)
  legendaMax: 1000,
  ladoMax: 1600,           // px do maior lado da imagem enviada (o navegador reduz antes)
  alvoKB: 500,             // o navegador tenta chegar a este tamanho
  maxKB: 700,              // o servidor recusa acima disto
  miniLado: 480,
  miniMaxKB: 90,
  arquivoMaxMB: 25,        // arquivo escolhido no aparelho, antes da redução
  porHora: 30,             // imagens por pessoa por hora
  lote: 24                 // miniaturas por chamada
};
var COM_IMG_TIPOS = ["image/jpeg", "image/png", "image/webp"];

/* ---------------- utilitários ---------------- */

function comImgFuso_() { return "America/Sao_Paulo"; }
function comImgDataHora_(iso) {
  try { var d = new Date(iso); if (isNaN(d.getTime())) return ""; return Utilities.formatDate(d, comImgFuso_(), "dd/MM/yyyy 'às' HH:mm"); } catch (e) { return ""; }
}
function comImgIdValido_(id) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || "")); }

/** "data:image/jpeg;base64,..." ou base64 puro → bytes (0..255). Lança com mensagem para a pessoa. */
function comImgBytes_(v, oque) {
  var s = String(v || ""), m = /^data:([a-z\/+.-]+);base64,(.*)$/i.exec(s);
  var b64 = (m ? m[2] : s).replace(/\s+/g, "");
  if (!b64 || !/^[A-Za-z0-9+\/]+={0,2}$/.test(b64)) comFalha_("A " + oque + " não chegou inteira. Por quê: o envio foi interrompido ou o arquivo não é uma imagem. O que fazer: escolha a imagem de novo e envie.");
  var bruto = Utilities.base64Decode(b64), out = [];
  for (var i = 0; i < bruto.length; i++) out.push(bruto[i] & 255);
  return out;
}

/** Tipo e dimensões conferidos pelo próprio arquivo (não pelo nome nem pelo que o navegador disse). null = não é PNG/JPEG/WEBP. */
function comImgDimensoes_(b) {
  var u16 = function (i) { return (b[i] << 8) | b[i + 1]; }, l16 = function (i) { return b[i] | (b[i + 1] << 8); };
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47)
    return { tipo: "image/png", w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
  if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
    var i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      var mk = b[i + 1];
      if (mk === 0xFF) { i++; continue; }
      if (mk === 0xD8 || mk === 0x01 || (mk >= 0xD0 && mk <= 0xD7)) { i += 2; continue; }
      var len = u16(i + 2);
      if ((mk >= 0xC0 && mk <= 0xCF) && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) return { tipo: "image/jpeg", w: u16(i + 7), h: u16(i + 5) };
      if (len < 2) break;
      i += 2 + len;
    }
    return null;
  }
  if (b.length > 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    var k = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (k === "VP8X") return { tipo: "image/webp", w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (k === "VP8 ") return { tipo: "image/webp", w: l16(26) & 0x3FFF, h: l16(28) & 0x3FFF };
    if (k === "VP8L") return { tipo: "image/webp", w: 1 + (((b[22] & 0x3F) << 8) | b[21]), h: 1 + (((b[24] & 0x0F) << 10) | (b[23] << 2) | ((b[22] & 0xC0) >> 6)) };
  }
  return null;
}

/** Confere uma imagem recebida: tipo pelo conteúdo, tamanho e lados. Devolve { bytes, tipo, w, h }. */
function comImgConferir_(v, oque, maxKB, ladoMax) {
  var bytes = comImgBytes_(v, oque), dim = comImgDimensoes_(bytes);
  if (!dim || COM_IMG_TIPOS.indexOf(dim.tipo) < 0 || !dim.w || !dim.h)
    comFalha_("A " + oque + " não é PNG, JPG nem WEBP. Por quê: só esses formatos são aceitos no bate-papo. O que fazer: escolha outra imagem (foto, print de tela do sistema ou desenho) nesses formatos.");
  if (bytes.length > maxKB * 1024)
    comFalha_("A " + oque + " ficou com " + Math.round(bytes.length / 1024) + " KB; o limite é " + maxKB + " KB. Por quê: o navegador deveria reduzir a imagem antes de enviar. O que fazer: atualize a página (F5) e envie de novo; se continuar, recorte a imagem.");
  if (dim.w > ladoMax + 1 || dim.h > ladoMax + 1)
    comFalha_("A " + oque + " tem " + dim.w + " × " + dim.h + " px; o limite é " + ladoMax + " px no maior lado. O que fazer: atualize a página (F5) e envie de novo (o navegador reduz sozinho).");
  return { bytes: bytes, tipo: dim.tipo, w: dim.w, h: dim.h };
}

/* ---------------- configuração (gestão liga e desliga para todos) ---------------- */

/** { ligado, alterado_por, alterado_em, motivo, historico[] }. Sem chave gravada = ligado (padrão). Nunca lança. */
function comImgCfg_(ss) {
  var m = {};
  try { delete COM_MEMO_.config; delete COM_MEMO_.ult_COM_CONFIG; m = comConfigMapa_(ss); } catch (e) { m = {}; }
  var v = function (k) { return m[k] ? String(m[k].valor) : ""; };
  var hist = [];
  try { hist = JSON.parse(v("img_historico") || "[]") || []; } catch (e) { hist = []; }
  return { ligado: v("img_ligado") !== "NAO", alterado_por: v("img_config_por"), alterado_em: v("img_config_em") || (m.img_ligado ? String(m.img_ligado.atualizado_em) : ""),
    motivo: v("img_config_motivo"), historico: hist };
}

function comImgPodeConfigurar_(u) { return !!(u && (u.admin || u.diretoria)); }

/* ---------------- pasta e arquivos ---------------- */

function comImgPasta_(criar) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(COM_IMG_PROP_PASTA);
  if (id) { try { var p = DriveApp.getFolderById(id); if (p && !(p.isTrashed && p.isTrashed())) return p; } catch (e) { } }
  if (!criar) return null;
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(20000); } catch (e) { trava = null; }
  try {
    id = props.getProperty(COM_IMG_PROP_PASTA);
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
    var pasta = DriveApp.createFolder(COM_IMG_NOME_PASTA);
    try { pasta.setDescription("Imagens do bate-papo. Só abrem dentro do balão de conversas, para quem participa da conversa. Não mova nem compartilhe."); } catch (e) { }
    props.setProperty(COM_IMG_PROP_PASTA, pasta.getId());
    return pasta;
  } finally { if (trava) try { trava.releaseLock(); } catch (e) { } }
}

function comImgGravarArquivo_(pasta, nome, img, meta) {
  var f = pasta.createFile(Utilities.newBlob(img.bytes, img.tipo, nome));
  try { f.setSharing("RESTRITO", "SISTEMA"); }
  catch (e) { try { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (x) { } }
  f.setDescription(JSON.stringify(meta));
  return f;
}

/**
 * Lê uma imagem (ou a miniatura) para a pessoa: só se ela participa agora da conversa gravada no arquivo.
 * Devolve { data, tipo, w, h, criado_em } ou { erro } (texto curto para a tela).
 */
function comImgLer_(ss, eu, id, mini) {
  if (!comImgIdValido_(id)) return { erro: "Imagem não encontrada." };
  var pasta = comImgPasta_(false);
  if (!pasta) return { erro: "Imagem não encontrada." };
  var achar = function (nome) { var it = pasta.getFilesByName(nome); while (it.hasNext()) { var f = it.next(); if (!(f.isTrashed && f.isTrashed())) return f; } return null; };
  var f = achar("COMIMG_" + id + (mini ? "_mini" : "")) || (mini ? achar("COMIMG_" + id) : null);
  if (!f) return { erro: "Imagem não encontrada." };
  var meta = {};
  try { meta = JSON.parse(f.getDescription() || "{}") || {}; } catch (e) { meta = {}; }
  if (String(meta.img_id || "") !== String(id)) return { erro: "Imagem não encontrada." };
  var c = comConversaPorId_(ss, meta.conversa_id);
  if (!c || !comEhMembro_(c, eu)) return { erro: "Você não participa da conversa desta imagem." };
  var bytes = f.getBlob().getBytes(), tipo = COM_IMG_TIPOS.indexOf(String(f.getMimeType())) >= 0 ? String(f.getMimeType()) : "image/jpeg";
  return { data: "data:" + tipo + ";base64," + Utilities.base64Encode(bytes), tipo: tipo, w: meta.w || 0, h: meta.h || 0, criado_em: meta.criado_em || "" };
}

/** Imagens que a pessoa enviou na última hora (cauda de COM_MENSAGENS). */
function comImgNaHora_(ss, eu) {
  var desde = new Date(Date.now() - 3600000).toISOString(), n = 0;
  comCauda_(ss, "COM_MENSAGENS", COM_JANELA_MSG).forEach(function (m) {
    if (m.ref_tipo === COM_IMG_TIPO && eu.ids.indexOf(String(m.de_pessoa)) >= 0 && String(m.criado_em) >= desde) n++;
  });
  return n;
}

/* ---------------- API do navegador ---------------- */

/**
 * comImagemApi(token, acao, dados) → { ok, ... }. Ações: estado, enviar, miniaturas, imagem, configurar (Diretoria e Administrador).
 */
function comImagemApi(token, acao, dados) {
  COM_MEMO_ = {};
  dados = dados || {};
  try {
    var u;
    try { u = comUsuarioDoToken_(token); }
    catch (e) {
      var m = String(e && e.message || e);
      if (/SEM_ACESSO/.test(m)) return { ok: false, erro: "SEM_ACESSO" };
      if (/SESS/i.test(m)) return { ok: false, erro: "SESSAO" };
      throw e;
    }
    if (!u || !u.id) return { ok: false, erro: "SESSAO" };
    var ss = comBanco_(false);
    if (!ss) return { ok: false, erro: "SEM_BANCO", mensagem: "Comunicação ainda não ativada: abra o COMMAND uma vez." };
    var eu = comPessoaDoUsuario_(ss, u, true);
    if (!eu) comFalha_("Não foi possível registrar você na Comunicação.");
    eu.admin = !!u.admin; eu.gestao = !!(u.admin || u.gestao);
    var fn = COM_IMG_ACOES_[acao];
    if (!fn) comFalha_("Ação desconhecida.");
    var r = fn(ss, eu, dados, comAdaptador_().sistema, u) || {};
    r.ok = r.ok === undefined ? true : r.ok;
    return r;
  } catch (e) {
    var msg = String((e && e.message) || e || "Erro");
    if (/^COM:/.test(msg)) return { ok: false, erro: msg.replace(/^COM:\s*/, "") };
    comLog_("ERRO imagem " + acao + ": " + msg);
    return { ok: false, erro: "Não foi possível concluir o envio ou a leitura da imagem. Tente de novo em instantes." };
  }
}

var COM_IMG_ACOES_ = {
  estado: function (ss, eu, d, sis, u) {
    var cfg = comImgCfg_(ss), pode = comImgPodeConfigurar_(u);
    var r = { ligado: cfg.ligado, pode_configurar: pode, aviso: COM_IMG_AVISO, limites: COM_IMG_LIM,
      alterado_por: cfg.alterado_por, alterado_em: cfg.alterado_em, motivo: cfg.motivo };
    if (pode) r.historico = cfg.historico.slice(-10).reverse();
    return r;
  },

  /** { conversa_id, legenda, imagem, miniatura, mencoes, resposta_a } */
  enviar: function (ss, eu, d, sis) {
    var cfg = comImgCfg_(ss);
    if (!cfg.ligado)
      comFalha_("O envio de imagens está desligado para todos" + (cfg.alterado_em ? " desde " + comImgDataHora_(cfg.alterado_em) : "") + (cfg.alterado_por ? ", por " + cfg.alterado_por : "") + "." +
        (cfg.motivo ? " Motivo: " + cfg.motivo + "." : "") + " O que fazer: explique por escrito na mensagem; se precisar mesmo mostrar uma imagem, fale com a Diretoria.");
    var c = comConversaPorId_(ss, d.conversa_id);
    if (!comEhMembro_(c, eu)) comFalha_("Conversa não encontrada.");
    var legenda = comTexto_(d.legenda).replace(/[ \t]+/g, " ");
    if (legenda.length < COM_IMG_LIM.legendaMin || !/[A-Za-zÀ-ÿ]/.test(legenda))
      comFalha_("Escreva a explicação da imagem (pelo menos " + COM_IMG_LIM.legendaMin + " caracteres). Por quê: imagem sem explicação dificulta o entendimento e não é permitida. O que fazer: diga na caixa de mensagem o que a imagem mostra e por que você está enviando.");
    if (legenda.length > COM_IMG_LIM.legendaMax)
      comFalha_("Explicação muito longa: o limite é " + COM_IMG_LIM.legendaMax + " caracteres. O que fazer: resuma e mande o restante numa mensagem de texto logo depois.");
    if (comImgNaHora_(ss, eu) >= COM_IMG_LIM.porHora)
      comFalha_("Você já enviou " + COM_IMG_LIM.porHora + " imagens na última hora, o limite por pessoa. Por quê: o bate-papo não é lugar de guardar imagens em quantidade. O que fazer: espere alguns minutos ou mande por e-mail.");
    var img = comImgConferir_(d.imagem, "imagem", COM_IMG_LIM.maxKB, COM_IMG_LIM.ladoMax);
    var mini = d.miniatura ? comImgConferir_(d.miniatura, "miniatura", COM_IMG_LIM.miniMaxKB, COM_IMG_LIM.miniLado) : null;
    var imgId = comUuid_(), msgId = comUuid_(), agora = comAgora_(), pasta = comImgPasta_(true);
    var meta = { v: 1, img_id: imgId, msg_id: msgId, conversa_id: c.conversa_id, de_pessoa: eu.pessoa_id, de_nome: eu.nome, criado_em: agora, tipo: img.tipo, w: img.w, h: img.h, bytes: img.bytes.length };
    comImgGravarArquivo_(pasta, "COMIMG_" + imgId, img, meta);
    if (mini) { var mm = JSON.parse(JSON.stringify(meta)); mm.miniatura = true; mm.tipo = mini.tipo; mm.w = mini.w; mm.h = mini.h; mm.bytes = mini.bytes.length; comImgGravarArquivo_(pasta, "COMIMG_" + imgId + "_mini", mini, mm); }
    var texto = COM_IMG_PREFIXO + legenda;
    var mencoes = c.tipo === "DIRETA" ? [] : comMencoes_(ss, c, eu, legenda, d.mencoes);
    var m = { msg_id: msgId, conversa_id: c.conversa_id, de_pessoa: eu.pessoa_id, de_nome: eu.nome, de_sistema: sis, texto: texto, criado_em: agora,
      ref_sistema: "", ref_tipo: COM_IMG_TIPO, ref_id: imgId, ref_codigo: "", resposta_a: comTexto_(d.resposta_a, 60), mencoes: mencoes.join(",") };
    comAppend_(ss, "COM_MENSAGENS", m);
    return { mensagem: comMsgTela_(ss, m), imagem: { id: imgId, w: img.w, h: img.h } };
  },

  /** { ids: [...] } → { miniaturas: { id: { data, w, h } | { erro } } } */
  miniaturas: function (ss, eu, d) {
    var ids = (d.ids || []).map(String).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, COM_IMG_LIM.lote), out = {};
    ids.forEach(function (id) { try { out[id] = comImgLer_(ss, eu, id, true); } catch (e) { comLog_("miniatura " + id + ": " + e.message); out[id] = { erro: "Imagem indisponível agora." }; } });
    return { miniaturas: out };
  },

  /** { id } → { imagem: { data, tipo, w, h, criado_em } } */
  imagem: function (ss, eu, d) {
    var r = comImgLer_(ss, eu, String(d.id || ""), false);
    if (r.erro) comFalha_(r.erro + " O que fazer: se a imagem é de uma conversa em que você está, feche e abra a conversa de novo.");
    return { imagem: r };
  },

  /** Diretoria e Administrador: { ligado: true|false, motivo } (motivo obrigatório para desligar). */
  configurar: function (ss, eu, d, sis, u) {
    if (!comImgPodeConfigurar_(u)) comFalha_("Só a Diretoria e o Administrador ligam ou desligam o envio de imagens. O que fazer: peça à Diretoria.");
    var ligar = d.ligado === true || d.ligado === "SIM", motivo = comTexto_(d.motivo, 300);
    if (!ligar && motivo.length < 10) comFalha_("Escreva o motivo para desligar (pelo menos 10 caracteres). Por quê: o motivo aparece para quem tentar enviar imagem e fica no histórico. O que fazer: descreva o uso inadequado ou a razão da decisão.");
    var cfg = comImgCfg_(ss);
    if (cfg.ligado === ligar && !motivo) comFalha_("Nada mudou: o envio de imagens já está " + (ligar ? "ligado" : "desligado") + ".");
    var agora = comAgora_(), hist = cfg.historico.concat([{ ligado: ligar, por: eu.nome, em: agora, motivo: motivo }]).slice(-20);
    var gravou = comConfigGravar_("img_ligado", ligar ? "SIM" : "NAO");
    if (gravou === "") comFalha_("Não foi possível gravar a configuração agora. Tente de novo em instantes.");
    comConfigGravar_("img_config_por", eu.nome);
    comConfigGravar_("img_config_em", agora);
    comConfigGravar_("img_config_motivo", motivo);
    comConfigGravar_("img_historico", JSON.stringify(hist));
    return COM_IMG_ACOES_.estado(ss, eu, d, sis, u);
  }
};
