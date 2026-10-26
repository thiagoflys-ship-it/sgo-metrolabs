/****************************************************
 * SEDNA DO SGO+ (26/10/2026, fase 5 do plano de avisos aprovado pelo dono)
 *
 * Rotina que acompanha a equipe sozinha, dentro da rodada de 15 minutos da gestão (SGO_Gestao_Escada.js Ges_rodada_),
 * só no expediente (dia útil, horário de trabalho, sem feriado):
 *
 * 1. ESCALONAMENTO DAS ATIVIDADES ATRASADAS POR PRIORIDADE. Horas corridas depois da previsão atual vencer:
 *      prioridade   nível 1 (responsável)   nível 2 (gestor da área)   nível 3 (Diretoria)
 *      Urgente      15 min                   1 h                        4 h
 *      Alta         1 h                      4 h                        24 h
 *      Normal       4 h                      24 h                       72 h
 *      Baixa        24 h                     72 h                       168 h
 *    Editável em Caixa de decisões > Regras e responsáveis (Administrador e Diretoria). Cada nível vale uma vez por
 *    atividade e por previsão (nova previsão = nova contagem); quem passou de vários níveis fora do expediente recebe só
 *    o mais alto. Gestor da área: os responsáveis da área da pessoa (e da área do módulo) e quem lançou, se for da gestão;
 *    sem ninguém, a Diretoria. Ninguém recebe cobrança da própria atividade como gestor. Atividade restrita (Programa de
 *    conduta) só vai a quem vê as restritas. Cada destinatário recebe UMA mensagem por rodada com tudo o que escalou
 *    para ele. Eventos da matriz de avisos: S71, S72 e S73 (e-mail na hora; WhatsApp só se a gestão marcar "na hora").
 *    Registro em GES_ENVIOS (TIPO SEDNA_ESCALA) e no histórico da atividade (tipo ESCALONAMENTO).
 *
 * 2. RESUMO DO DIA DA GESTÃO (briefing). A partir das 08:30 (editável), uma vez por dia, para cada pessoa da gestão
 *    (Administrador, Diretoria, Gestor, RH e Financeiro): atividades atrasadas e que vencem hoje da equipe dela, as dela,
 *    o que começar primeiro e a central de pendências. O texto sai pelas regras; com a chave da IA cadastrada, a IA
 *    reescreve (no máximo 3 pessoas por rodada) e o texto só vale se passar no verificador (números e nomes só dos
 *    dados, sem emoji, sem formatação, sem mencionar IA). Aparece no Início, acima de "Prioridades do dia".
 *
 * 3. PAINEL "HOJE": é a central de pendências do Início (SGO_Alertas_Central.js); aqui só se acrescenta o resumo.
 *
 * Nada aqui apaga ou muda dado das atividades; só avisa e registra.
 ****************************************************/

var SEDNA_CFG_PROP = 'SEDNA_CFG';
var SEDNA_PRIORIDADES = ['Urgente', 'Alta', 'Normal', 'Baixa'];
var SEDNA_CFG_PADRAO = {
  escalonamento: { ligado: true, horas: { Urgente: [0.25, 1, 4], Alta: [1, 4, 24], Normal: [4, 24, 72], Baixa: [24, 72, 168] } },
  briefing: { ligado: true, hora: '08:30', ia: true }
};
var SEDNA_EVENTO_NIVEL = { 1: 'S71', 2: 'S72', 3: 'S73' };
var SEDNA_MTZ_EVENTOS = [
  { cod: 'S71', modulo: 'atividades', evento: 'Atividade atrasada: cobrança pela prioridade (nível 1, responsável)', origem: 'SGO_Sedna.js', publico: 'Responsável', email: 'HORA', whatsapp: 'NAO', limite: '1 por atividade por previsão', obs: 'Prazos por prioridade em Caixa de decisões > Regras e responsáveis. Diz quando vai ao gestor da área.' },
  { cod: 'S72', modulo: 'atividades', evento: 'Atividade atrasada escalada ao gestor da área (nível 2)', origem: 'SGO_Sedna.js', publico: 'Gestor da área e quem lançou (da gestão); sem gestor, a Diretoria', email: 'HORA', whatsapp: 'NAO', limite: '1 por atividade por previsão (agrupado por pessoa)', obs: 'Uma mensagem por rodada com todas as atividades que escalaram para a pessoa.' },
  { cod: 'S73', modulo: 'atividades', evento: 'Atividade atrasada escalada à Diretoria (nível 3)', origem: 'SGO_Sedna.js', publico: 'Diretoria', email: 'HORA', whatsapp: 'NAO', limite: '1 por atividade por previsão (agrupado por pessoa)', obs: 'Leva o nome de quem está com a atividade e há quanto tempo está atrasada.' }
];
var SEDNA_PESO_PRI = { Urgente: 4, Alta: 3, Normal: 2, Baixa: 1 };
var SEDNA_IA_POR_RODADA = 3;
var SEDNA_EU = { id: 'GESTAO_ROTINA', nome: 'Rotina da gestão' };

function Sedna_registrarEventos_() {
  try {
    if (typeof MTZ_PADRAO !== 'undefined' && Array.isArray(MTZ_PADRAO)) SEDNA_MTZ_EVENTOS.forEach(function (ev) { if (!MTZ_PADRAO.some(function (x) { return x && x.cod === ev.cod; })) MTZ_PADRAO.push(ev); });
  } catch (e) { try { console.error('SEDNA (registro): ' + ((e && e.message) || e)); } catch (x) {} }
}

// ------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------
function Sedna_cfg_() {
  var c = JSON.parse(JSON.stringify(SEDNA_CFG_PADRAO)), g = null;
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(SEDNA_CFG_PROP) || 'null'); } catch (e) { g = null; }
  if (!g || typeof g !== 'object') return c;
  var es = g.escalonamento || {};
  if (es.ligado === false) c.escalonamento.ligado = false;
  SEDNA_PRIORIDADES.forEach(function (p) { var l = Sedna_horasValidas_((es.horas || {})[p]); if (l) c.escalonamento.horas[p] = l; });
  var b = g.briefing || {};
  if (b.ligado === false) c.briefing.ligado = false;
  if (b.ia === false) c.briefing.ia = false;
  if (/^\d{2}:\d{2}$/.test(String(b.hora || ''))) c.briefing.hora = b.hora;
  return c;
}

/** Três números crescentes entre 0,25 e 720 horas, ou null. */
function Sedna_horasValidas_(l) {
  if (!Array.isArray(l) || l.length !== 3) return null;
  var n = l.map(Number);
  if (n.some(function (x) { return !isFinite(x) || x < 0.25 || x > 720; })) return null;
  if (!(n[0] < n[1] && n[1] < n[2])) return null;
  return n.map(function (x) { return Math.round(x * 100) / 100; });
}

/** Grava a política (chamado pelo Gestao_apiConfig, que já conferiu que é Administrador ou Diretoria). Lança com mensagem que diz o que fazer. */
function Sedna_cfgSalvar_(v) {
  v = v || {};
  var es = v.escalonamento || {}, b = v.briefing || {}, horas = {};
  SEDNA_PRIORIDADES.forEach(function (p) {
    var l = Sedna_horasValidas_((es.horas || {})[p]);
    if (!l) throw new Error('as horas do escalonamento da prioridade ' + p + ' precisam ser três números crescentes entre 0,25 e 720 (responsável, gestor da área, Diretoria). Corrija e salve de novo');
    horas[p] = l;
  });
  var hora = String(b.hora || SEDNA_CFG_PADRAO.briefing.hora);
  if (!/^\d{2}:\d{2}$/.test(hora)) throw new Error('a hora do resumo do dia (' + hora + ') não está no formato HH:MM (por exemplo 08:30). Corrija e salve de novo');
  var exp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30' };
  if (hora < exp.ini || hora >= exp.fim) throw new Error('a hora do resumo do dia (' + hora + ') precisa ficar dentro do horário de trabalho (' + exp.ini + ' a ' + exp.fim + ', em Atividades da equipe > Avisos e horários)');
  var c = { escalonamento: { ligado: es.ligado !== false, horas: horas }, briefing: { ligado: b.ligado !== false, hora: hora, ia: b.ia !== false } };
  PropertiesService.getScriptProperties().setProperty(SEDNA_CFG_PROP, JSON.stringify(c));
  return c;
}

// ------------------------------------------------------------
// APOIO
// ------------------------------------------------------------
/** "aaaa-mm-ddThh:mm" (hora local) em minutos corridos, para a diferença entre duas datas locais. NaN se inválido. */
function Sedna_minutos_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 23), +(m[5] || 59)) / 60000;
}

function Sedna_tempoTexto_(min) {
  var h = Math.floor(min / 60);
  if (h < 1) return Math.max(1, Math.round(min)) + ' min';
  if (h < 48) return h + (h === 1 ? ' hora' : ' horas');
  var d = Math.floor(h / 24);
  return d + ' dias';
}

function Sedna_horasTexto_(h) {
  if (h < 1) return Math.round(h * 60) + ' min';
  return String(h).replace('.', ',') + (h === 1 ? ' hora' : ' horas');
}

function Sedna_primeiroNome_(nome) {
  var p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
}

function Sedna_prioridade_(a) { return SEDNA_PESO_PRI[a.PRIORIDADE] ? a.PRIORIDADE : 'Normal'; }

function Sedna_restrita_(a) { return typeof Atividades_restrita_ === 'function' ? Atividades_restrita_(a) : String(a.RESTRITA || '').toUpperCase() === 'SIM'; }

function Sedna_veRestritas_(u) { return !!u && (typeof Atividades_veRestritasPerfil_ === 'function' ? Atividades_veRestritasPerfil_(u.perfil) : u.diretoria); }

/** Gestores que recebem o nível 2: responsáveis da área da pessoa e da área do módulo, e quem lançou se for da gestão. */
function Sedna_gestoresDe_(a, us, gcfg) {
  var resp = String(a.RESPONSAVEL_ID), ids = [];
  var add = function (id) { id = String(id || ''); if (id && id !== resp && us[id] && us[id].ativo && !us[id].sistema && ids.indexOf(id) < 0) ids.push(id); };
  var areaPessoa = us[resp] ? us[resp].area : '', areaMod = a.MODULO ? Ges_areaDoModulo_(a.MODULO, gcfg) : '';
  [areaPessoa, areaMod].forEach(function (ar) { if (ar) ((gcfg.gestoresPorArea || {})[ar] || []).forEach(add); });
  var cri = us[String(a.CRIADO_POR_ID || '')];
  if (cri && (cri.gestao || cri.rotina)) add(cri.id);
  if (!ids.length) Ges_diretoria_(us, [resp]).forEach(add);
  return ids;
}

// ------------------------------------------------------------
// 1. ESCALONAMENTO
// ------------------------------------------------------------
/** Uma rodada (só no expediente; quem chama confere). Devolve { atividades, mensagens } ou { fora }. Nunca muda a atividade. */
function Sedna_escalonar_() {
  var cfg = Sedna_cfg_();
  if (!cfg.escalonamento.ligado) return { fora: 'escalonamento desligado em Regras e responsáveis' };
  if (typeof Atividades_todas_ !== 'function') return { fora: 'Atividades indisponível' };
  Sedna_registrarEventos_();
  var agora = Atividades_agora_(), minAgora = Sedna_minutos_(agora), dia = agora.slice(0, 10);
  var us = Ges_usuarios_(), gcfg = Ges_cfg_(), feitos = {};
  Ges_envios_().forEach(function (e) { if (Ges_up_(e.TIPO) === 'SEDNA_ESCALA') feitos[Ges_s_(e.REFERENCIA)] = true; });
  var porDest = {}, escaladas = [];
  Atividades_todas_().forEach(function (a) {
    if (!Atividades_vencida_(a, agora) || !a.RESPONSAVEL_ID || !us[String(a.RESPONSAVEL_ID)]) return;
    var pri = Sedna_prioridade_(a), lim = cfg.escalonamento.horas[pri];
    var atraso = minAgora - Sedna_minutos_(a.PREVISAO_ATUAL);
    if (!(atraso > 0)) return;
    var nivel = 0;
    lim.forEach(function (h, i) { if (atraso >= h * 60) nivel = i + 1; });
    if (!nivel) return;
    var base = a.ID + '|' + a.PREVISAO_ATUAL + '|';
    for (var n = nivel; n <= 3; n++) if (feitos[base + n]) return;
    var resp = String(a.RESPONSAVEL_ID), dest;
    if (nivel === 1) dest = [resp];
    else if (nivel === 2) dest = Sedna_gestoresDe_(a, us, gcfg);
    else dest = Ges_diretoria_(us, [resp]);
    if (nivel > 1 && Sedna_restrita_(a)) dest = dest.filter(function (id) { return Sedna_veRestritas_(us[id]); });
    var item = { a: a, pri: pri, nivel: nivel, atraso: atraso, proximo: nivel < 3 ? lim[nivel] * 60 - atraso : 0 };
    dest.forEach(function (id) { var k = id + '|' + nivel; (porDest[k] = porDest[k] || { uid: id, nivel: nivel, itens: [] }).itens.push(item); });
    escaladas.push({ item: item, dest: dest });
    feitos[base + nivel] = true;
  });
  if (!escaladas.length) return { atividades: 0, mensagens: 0 };
  var nomeNivel = { 1: 'cobrança ao responsável', 2: 'escalada ao gestor da área', 3: 'escalada à Diretoria' };
  Atividades_comTrava_(function () {
    escaladas.forEach(function (x) {
      var a = x.item.a, nomes = x.dest.map(function (id) { return us[id].nome; });
      Ges_registrarEnvio_({ tipo: 'SEDNA_ESCALA', uid: a.RESPONSAVEL_ID, nome: a.RESPONSAVEL_NOME, dia: dia, ref: a.ID + '|' + a.PREVISAO_ATUAL + '|' + x.item.nivel, qtd: x.dest.length,
        itens: nomes.join(', '), situacao: x.dest.length ? 'OK' : 'SEM_DESTINO', motivo: 'Nível ' + x.item.nivel + ' (' + nomeNivel[x.item.nivel] + '), prioridade ' + x.item.pri + ', atrasada há ' + Sedna_tempoTexto_(x.item.atraso) + '.' });
      Atividades_registrarHist_(SEDNA_EU, a.ID, 'ESCALONAMENTO', { texto: 'Atrasada há ' + Sedna_tempoTexto_(x.item.atraso) + ' (prioridade ' + x.item.pri + '): ' + nomeNivel[x.item.nivel] +
        (x.dest.length ? (x.item.nivel > 1 ? ' (' + nomes.join(', ') + ')' : '') + '.' : ', mas não há ninguém ativo para receber.') });
    });
  });
  var mensagens = 0;
  Object.keys(porDest).forEach(function (k) {
    var g = porDest[k], u = us[g.uid];
    g.itens.sort(function (x, y) { return SEDNA_PESO_PRI[y.pri] - SEDNA_PESO_PRI[x.pri] || y.atraso - x.atraso; });
    var linhas = g.itens.map(function (it) {
      var a = it.a;
      return '- [' + it.pri + '] ' + String(a.TITULO || '').replace(/\s+/g, ' ').slice(0, 140) + (g.nivel > 1 ? ', com ' + (a.RESPONSAVEL_NOME || 'responsável') : '') +
        ', atrasada há ' + Sedna_tempoTexto_(it.atraso) + ' (previsão ' + Atividades_dataBr_(a.PREVISAO_ATUAL) + ')' +
        (g.nivel === 1 && it.proximo > 0 ? '. Se continuar aberta, vai ao gestor da área em ' + Sedna_tempoTexto_(it.proximo) : '') + '.';
    });
    var n = g.itens.length, titulo, abertura, fecho;
    if (g.nivel === 1) {
      titulo = n === 1 ? 'Atividade atrasada: ' + g.itens[0].a.TITULO : n + ' atividades suas atrasadas';
      abertura = 'Pela prioridade, ' + (n === 1 ? 'esta atividade precisa' : 'estas atividades precisam') + ' da sua atenção agora:';
      fecho = 'Conclua, ou registre a justificativa de atraso com a nova previsão em Minhas atividades.';
    } else {
      titulo = (n === 1 ? 'Atividade da equipe atrasada' : n + ' atividades da equipe atrasadas') + (g.nivel === 3 ? ' (Diretoria)' : '');
      abertura = (g.nivel === 3 ? 'Escalada à Diretoria' : 'Escalada a você como gestor da área') + ' pelo tempo de atraso e pela prioridade:';
      fecho = 'Fale com quem está com a atividade, replaneje ou passe para outra pessoa em Atividades da equipe.';
    }
    var r = SGO_notificar_({ usuarios: [g.uid], canais: ['sgo', 'email'], evento: SEDNA_EVENTO_NIVEL[g.nivel], origem: 'SEDNA',
      refId: ('SEDNA-' + g.nivel + '-' + dia + '-' + g.itens.map(function (it) { return it.a.ID; }).join(',')).slice(0, 80),
      titulo: String(titulo).slice(0, 180), texto: abertura + '\n' + linhas.join('\n') + '\n\n' + fecho, link: typeof Ges_linkTela_ === 'function' ? Ges_linkTela_('atividades_equipe') : '' });
    if (r && r.ok) mensagens++;
  });
  return { atividades: escaladas.length, mensagens: mensagens };
}

// ------------------------------------------------------------
// 2. RESUMO DO DIA DA GESTÃO
// ------------------------------------------------------------
/** Atividades abertas que a pessoa acompanha como gestão: Diretoria vê todas; os demais, as das áreas dela e as que lançou. */
function Sedna_escopo_(u, us, gcfg, todas) {
  var areas = Ges_areasDoGestor_(u.id, gcfg);
  if (!u.diretoria && u.perfil === 'GESTOR' && u.area && areas.indexOf(u.area) < 0) areas.push(u.area);
  return todas.filter(function (a) {
    if (!Atividades_aberta_(a) || String(a.RESPONSAVEL_ID) === u.id) return false;
    if (Sedna_restrita_(a) && !Sedna_veRestritas_(u)) return false;
    if (u.diretoria) return true;
    var r = us[String(a.RESPONSAVEL_ID)];
    return String(a.CRIADO_POR_ID) === u.id || (r && areas.indexOf(r.area) >= 0) || (a.MODULO && areas.indexOf(Ges_areaDoModulo_(a.MODULO, gcfg)) >= 0);
  });
}

/** Fatos do resumo (só números, títulos e primeiros nomes que a pessoa já enxerga no sistema). */
function Sedna_fatos_(u, us, gcfg, todas, agora) {
  var hoje = agora.slice(0, 10), minAgora = Sedna_minutos_(agora);
  var equipe = Sedna_escopo_(u, us, gcfg, todas);
  var atrasadas = equipe.filter(function (a) { return Atividades_vencida_(a, agora); });
  var venceHoje = equipe.filter(function (a) { var p = String(a.PREVISAO_ATUAL || ''); return p.slice(0, 10) === hoje && p >= agora; });
  var porPri = {};
  atrasadas.forEach(function (a) { var p = Sedna_prioridade_(a); porPri[p] = (porPri[p] || 0) + 1; });
  var comecar = atrasadas.map(function (a) { return { a: a, pri: Sedna_prioridade_(a), min: minAgora - Sedna_minutos_(a.PREVISAO_ATUAL) }; })
    .sort(function (x, y) { return SEDNA_PESO_PRI[y.pri] - SEDNA_PESO_PRI[x.pri] || y.min - x.min; }).slice(0, 3)
    .map(function (x) { return { titulo: Sedna_restrita_(x.a) ? 'Atividade restrita' : String(x.a.TITULO || '').replace(/\s+/g, ' ').slice(0, 120), prioridade: x.pri, com: Sedna_primeiroNome_(x.a.RESPONSAVEL_NOME), atrasadaHa: Sedna_tempoTexto_(x.min) }; });
  var minhas = todas.filter(function (a) { return Atividades_aberta_(a) && String(a.RESPONSAVEL_ID) === u.id; });
  var f = {
    nome: Sedna_primeiroNome_(u.nome), dia: Ges_brDia_(hoje),
    equipe: { atrasadas: atrasadas.length, porPrioridade: porPri, vencemHoje: venceHoje.length, comecarPor: comecar },
    suas: { atrasadas: minhas.filter(function (a) { return Atividades_vencida_(a, agora); }).length, vencemHoje: minhas.filter(function (a) { var p = String(a.PREVISAO_ATUAL || ''); return p.slice(0, 10) === hoje && p >= agora; }).length },
    pendencias: null
  };
  try {
    if (typeof Pend_contextoDaSessao_ === 'function' && typeof Pend_resposta_ === 'function') {
      var pr = Pend_resposta_(Pend_contextoDaSessao_({ userId: u.id, perfil: u.perfil, nome: u.nome, usuario: u.login }), {});
      f.pendencias = { total: Number(pr.resumo.total) || 0, criticas: Number(pr.resumo.criticos) || 0, maiores: (pr.grupos || []).slice(0, 3).map(function (g) { return { grupo: g.rotulo, qtd: g.qtd }; }) };
    }
  } catch (e) { f.pendencias = null; }
  return f;
}

function Sedna_plural_(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

/** Texto do resumo pelas regras (vale sempre; a IA só reescreve). */
function Sedna_textoRegras_(f) {
  var l = [], e = f.equipe;
  l.push('Bom dia, ' + f.nome + '. Resumo de ' + f.dia + '.');
  if (e.atrasadas) {
    var pri = SEDNA_PRIORIDADES.filter(function (p) { return e.porPrioridade[p]; }).map(function (p) { return e.porPrioridade[p] + ' ' + p.toLowerCase(); });
    l.push('Equipe: ' + Sedna_plural_(e.atrasadas, 'atividade atrasada', 'atividades atrasadas') + ' (prioridade: ' + pri.join(', ') + ')' + (e.vencemHoje ? ' e ' + Sedna_plural_(e.vencemHoje, 'vence', 'vencem') + ' hoje.' : '.'));
    l.push('Comece por: ' + e.comecarPor.map(function (c) { return c.titulo + ' (' + c.prioridade.toLowerCase() + ', com ' + c.com + ', atrasada há ' + c.atrasadaHa + ')'; }).join('; ') + '.');
  } else {
    l.push('Equipe: nenhuma atividade atrasada' + (e.vencemHoje ? '; ' + Sedna_plural_(e.vencemHoje, 'vence', 'vencem') + ' hoje.' : '.'));
  }
  if (f.suas.atrasadas || f.suas.vencemHoje) l.push('Suas atividades: ' + [f.suas.atrasadas ? Sedna_plural_(f.suas.atrasadas, 'atrasada', 'atrasadas') : '', f.suas.vencemHoje ? Sedna_plural_(f.suas.vencemHoje, 'vence hoje', 'vencem hoje') : ''].filter(Boolean).join(' e ') + '.');
  if (f.pendencias && f.pendencias.total) {
    l.push('Central de pendências: ' + Sedna_plural_(f.pendencias.total, 'pendência', 'pendências') + (f.pendencias.criticas ? ', ' + Sedna_plural_(f.pendencias.criticas, 'crítica', 'críticas') : '') +
      (f.pendencias.maiores.length ? '. Maiores grupos: ' + f.pendencias.maiores.map(function (g) { return g.grupo + ' (' + g.qtd + ')'; }).join(', ') : '') + '.');
  }
  return l.join('\n');
}

/** Confere o texto da IA: números e nomes só dos fatos; sem emoji, formatação, inglês de marketing ou menção a IA. */
function Sedna_verificar_(texto, fatos, us) {
  var t = String(texto || '').trim(), problemas = [];
  if (!t) return { ok: false, problemas: ['texto vazio'] };
  if (t.length > 900) problemas.push('texto longo demais');
  var fj = JSON.stringify(fatos);
  var nums = {};
  (fj.match(/\d+/g) || []).forEach(function (n) { nums[String(Number(n))] = true; });
  (t.match(/\d+/g) || []).forEach(function (n) { if (!nums[String(Number(n))]) problemas.push('número fora dos dados: ' + n); });
  var nomesFatos = fj.toLowerCase();
  var conhecidos = {};
  Object.keys(us || {}).forEach(function (id) { var p = Sedna_primeiroNome_(us[id].nome).toLowerCase(); if (p.length > 2) conhecidos[p] = true; });
  (t.match(/[A-Za-zÀ-ÿ]+/g) || []).forEach(function (w) {
    var lw = w.toLowerCase();
    if (conhecidos[lw] && nomesFatos.indexOf(lw) < 0) problemas.push('nome fora dos dados: ' + w);
  });
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) problemas.push('emoji');
  if (/\*\*|^#|\bAI\b|\bIA\b|intelig[eê]ncia artificial|assistente virtual/im.test(t)) problemas.push('formatação ou referência a IA');
  return { ok: !problemas.length, problemas: problemas.slice(0, 5) };
}

/** A IA reescreve o resumo; devolve { texto, aviso }. texto vazio = vale o das regras. Nunca lança. */
function Sedna_iaDisponivel_() {
  try { return typeof SGO_DocA4_chamarGemini_ === 'function' && !!String(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '').trim(); } catch (e) { return false; }
}

function Sedna_refinarComIA_(f, regras, us) {
  if (!Sedna_iaDisponivel_()) return { texto: '', aviso: 'sem a chave da IA (Administração > Chaves e senhas): vale o texto das regras' };
  var prompt = [
    'Você escreve o resumo do início do dia para uma pessoa da gestão de uma empresa de engenharia clínica.',
    'Regras obrigatórias:',
    '- Use somente os FATOS. Não invente pessoa, atividade, número, prazo ou data. Não use número nem nome que não esteja nos fatos.',
    '- Comece por "Bom dia, ' + f.nome + '." e diga, em ordem, o que fazer primeiro (o mais urgente e mais atrasado antes).',
    '- No máximo 5 frases curtas, português do Brasil, tom sóbrio de gestor. Sem emojis, sem markdown, sem listas, sem termos em inglês, sem elogios. Não diga que é inteligência artificial.',
    '- Responda APENAS com o JSON {"texto":"..."}.',
    '', 'FATOS:', JSON.stringify(f), '', 'TEXTO PELAS REGRAS (referência):', regras
  ].join('\n');
  try {
    var bruto = String(SGO_DocA4_chamarGemini_(prompt, { tokens: 8192, temperatura: 0.2 }) || '').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
    var i = bruto.indexOf('{'), j = bruto.lastIndexOf('}'), json = null;
    if (i >= 0 && j > i) { try { json = JSON.parse(bruto.slice(i, j + 1)); } catch (eJ) { json = null; } }
    if (!json || !json.texto) return { texto: '', aviso: 'a resposta da IA não veio no formato esperado: vale o texto das regras' };
    var v = Sedna_verificar_(json.texto, f, us);
    if (!v.ok) return { texto: '', aviso: 'o verificador recusou o texto da IA (' + v.problemas.join('; ') + '): vale o texto das regras' };
    return { texto: String(json.texto).trim().slice(0, 900), aviso: '' };
  } catch (e) {
    return { texto: '', aviso: 'a IA não respondeu agora (' + String((e && e.message) || e).slice(0, 120) + '): vale o texto das regras' };
  }
}

function Sedna_chaveBriefing_(uid) { return 'SEDNA_BRIEF_' + uid; }

/** Uma rodada do resumo (só no expediente; quem chama confere). Devolve { gerados, ia } ou { fora }. */
function Sedna_briefingRodada_(ex) {
  var cfg = Sedna_cfg_();
  if (!cfg.briefing.ligado) return { fora: 'resumo do dia desligado em Regras e responsáveis' };
  if (ex && ex.hora && ex.hora < cfg.briefing.hora) return { fora: 'antes das ' + cfg.briefing.hora };
  if (typeof Atividades_todas_ !== 'function') return { fora: 'Atividades indisponível' };
  var props = PropertiesService.getScriptProperties();
  var agora = Atividades_agora_(), hoje = agora.slice(0, 10);
  var us = Ges_usuarios_(), gcfg = Ges_cfg_(), todas = null, r = { gerados: 0, ia: 0 }, iaFeitas = 0;
  var iaPossivel = cfg.briefing.ia && Sedna_iaDisponivel_();
  Object.keys(us).forEach(function (id) {
    var u = us[id];
    if (!u.ativo || u.sistema || !(u.gestao || u.rotina || u.diretoria)) return;
    var atual = Ges_json_(props.getProperty(Sedna_chaveBriefing_(id)), null);
    var querIA = iaPossivel && iaFeitas < SEDNA_IA_POR_RODADA;
    // o de hoje já existe: só refaz para tentar a IA, uma vez
    if (atual && atual.dia === hoje && (!querIA || atual.origem === 'IA' || atual.iaTentada)) return;
    if (!todas) todas = Atividades_todas_();
    var f = Sedna_fatos_(u, us, gcfg, todas, agora);
    var regras = Sedna_textoRegras_(f);
    var reg = { dia: hoje, em: agora, texto: regras, origem: 'REGRAS', iaTentada: false, aviso: '' };
    if (querIA) {
      iaFeitas++;
      var ia = Sedna_refinarComIA_(f, regras, us);
      reg.iaTentada = true;
      if (ia.texto) { reg.texto = ia.texto; reg.origem = 'IA'; r.ia++; } else reg.aviso = ia.aviso;
    }
    props.setProperty(Sedna_chaveBriefing_(id), JSON.stringify(reg));
    r.gerados++;
  });
  return r;
}

/** Resumo do dia da pessoa logada para o Início (só gestão, só o de hoje). null se não houver. Nunca lança. */
function Sedna_briefingDaSessao_(sessionId) {
  try {
    var s = exigirSessao(sessionId);
    var raw = PropertiesService.getScriptProperties().getProperty(Sedna_chaveBriefing_(String(s.userId)));
    if (!raw) return null;
    var b = JSON.parse(raw), hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    if (!b || b.dia !== hoje || !b.texto) return null;
    var perfil = String(s.perfil || '').toUpperCase();
    var gestao = (typeof isAdminPerfilAuth_ === 'function' && isAdminPerfilAuth_(perfil)) || (typeof SGO_ehGestaoRotina_ === 'function' && SGO_ehGestaoRotina_(perfil)) || perfil === 'DIRETORIA';
    if (!gestao) return null;
    return { texto: String(b.texto), hora: String(b.em || '').slice(11, 16) };
  } catch (e) { return null; }
}

/** Passo da rodada da gestão (Ges_rodada_), já dentro do expediente. */
function Sedna_rodada_(ex) {
  var r = {};
  try { r.escalonamento = Sedna_escalonar_(); } catch (e) { r.escalonamento = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('SEDNA (escalonamento): ' + r.escalonamento.erro); }
  try { r.briefing = Sedna_briefingRodada_(ex); } catch (e) { r.briefing = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('SEDNA (resumo): ' + r.briefing.erro); }
  return r;
}

Sedna_registrarEventos_();
