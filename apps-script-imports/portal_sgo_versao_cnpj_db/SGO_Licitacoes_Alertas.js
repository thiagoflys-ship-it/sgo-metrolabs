/****************************************************
 * SGO+ LICITAÇÕES — ALERTAS DE PRAZO, CIÊNCIA E ESCALONAMENTO (etapa 3, 02/11/2026)
 *
 * Decisões do dono (docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md): os alertas de licitação vão SÓ para a Diretoria de
 * Licitações (Charles e Thiago = os perfis Diretoria e Administrador ativos, Lic_responsaveis_; nenhum nome ou número no
 * código) e podem sair FORA do expediente (exceção aprovada só para Licitações). Canais: interno (sempre: Central de alertas
 * e faixa nas telas de Licitações), e-mail e WhatsApp oficial (Meta, modelo sgo_licitacao_prazo; nunca WhatsApp Web nem
 * Z-API). Sem o modelo aprovado, o alerta vai pelo interno e pelo e-mail e a linha diz "WhatsApp aguardando aprovação do
 * modelo na Meta".
 *
 * Quem recebe primeiro: o responsável da oportunidade (se for da Diretoria de Licitações); sem ele, o titular escolhido nas
 * regras; sem titular, os dois. Só oportunidades candidatas, em análise ou adiante; nunca descartadas nem sem termo de
 * interesse (as travadas só com a chave "alertar travadas"). Prazo PREVISTO (pendente de confirmação) não gera alerta.
 *
 * CICLO DE CADA ALERTA (aba LIC_ALERTAS; nada é apagado; tudo também no LIC_HISTORICO, com quem, quando, canal e o retorno):
 *   1 Criado (PROGRAMADO, com a hora de sair) → 2 Enviado ao provedor → 3 Aceito pelo provedor (a Meta devolveu o id da
 *   mensagem; o e-mail entrou na fila de envio) → 4 Entregue e 5 Lido (SÓ pelo retorno real da Meta: webhook de status, sent,
 *   delivered, read, failed; SGO_whatsappRetornoMeta_) → 6 Ciência ("Ciente" na tela, no botão do WhatsApp, no link do e-mail
 *   ou respondendo "ciente" à mensagem) → 7 Em atendimento (abriu a licitação pelo link) → 8 Concluído (o prazo passou com
 *   a ciência registrada). Laterais: 9 Falha (com motivo e canal alternativo) e 10 Escalonado. Ciência não conclui a tarefa.
 *
 * Escalonamento: sem ciência no tempo do nível (padrão da missão: normal 60 min, importante 15 min, crítico 5 min; ajustável)
 * o alerta vai para o outro integrante (todos os canais) e é reenviado ao titular pelo outro canal. Falha nos dois canais
 * escalona na hora. Ciência de qualquer integrante encerra a cobrança daquele alerta para os dois.
 *
 * Antecedência que já tinha passado quando o prazo entrou na agenda: sai só o aviso mais recente; as anteriores não são
 * enviadas. Na implantação (primeira rodada), as já passadas não saem (sem rajada de mensagens antigas).
 *
 * Rodada: Licitacoes_rotinaAlertas, a cada 5 minutos (agenda que mudou → programar → escalonar → enviar → concluir).
 * Nunca mostra token, chave ou telefone (só "final 1234"). Mensagens sóbrias, sem emoji.
 ****************************************************/

var LIC_MODELO_WA = 'sgo_licitacao_prazo';
var LIC_FUNCAO_ROTINA = 'Licitacoes_rotinaAlertas';
var LIC_ENVIANDO_MAX_MIN = 10;
var LIC_NIVEIS = { NORMAL: 'normal', IMPORTANTE: 'importante', CRITICO: 'crítico' };
var LIC_ALERTA_SITUACOES = { PROGRAMADO: 'Programado', ENVIANDO: 'Enviando', ENVIADO: 'Enviado', CIENTE: 'Ciência registrada', ESCALONADO: 'Escalonado', FALHOU: 'Falhou',
  CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído', PULADO: 'Não enviado' };
var LIC_WA_ROTULOS = { ACEITO: 'Aceito pela Meta', ENVIADO: 'Enviado (retorno da Meta)', ENTREGUE: 'Entregue (retorno da Meta)', LIDO: 'Lido (retorno da Meta)', FALHOU: 'WhatsApp falhou',
  AGUARDANDO_MODELO: 'WhatsApp aguardando aprovação do modelo na Meta', SEM_NUMERO: 'Sem celular no cadastro', RETIDO: 'Retido pelo piloto do WhatsApp', NAO_CONFIGURADO: 'WhatsApp não configurado',
  NAO_ENVIADO: 'WhatsApp não enviado' };
var LIC_WA_ORDEM = { ACEITO: 1, ENVIADO: 2, ENTREGUE: 3, LIDO: 4 };
var LIC_CANAIS_CIENCIA = { SGO_TELA: 'tela do SGO+', WHATSAPP_BOTAO: 'botão "Confirmar ciência" do WhatsApp', EMAIL_LINK: 'link do e-mail', WHATSAPP_RESPOSTA: 'resposta "ciente" no WhatsApp' };
var LIC_MUDANCAS_NOMES = { RETIFICACAO: 'Prazo alterado na fonte', REABERTURA: 'Licitação reaberta na fonte', SUSPENSAO: 'Licitação suspensa na fonte', REVOGACAO: 'Licitação revogada na fonte', ANULACAO: 'Licitação anulada na fonte' };
var LIC_ALERTAS_PADRAO = {
  ligado: true, alertarTravadas: false, foraDoExpediente: true, titularId: '',
  canais: { email: true, whatsapp: true },
  pessoas: {},
  escalonarMin: { NORMAL: 60, IMPORTANTE: 15, CRITICO: 5 },
  antecedencias: {
    LIMITE_PROPOSTA: [{ min: 10080, nivel: 'NORMAL' }, { min: 4320, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'CRITICO' }, { min: 60, nivel: 'CRITICO' }],
    SESSAO_PUBLICA: [{ min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }, { min: 60, nivel: 'CRITICO' }, { min: 30, nivel: 'CRITICO' }, { min: 10, nivel: 'CRITICO' }],
    PRAZO_IMPUGNACAO: [{ min: 2880, nivel: 'NORMAL' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }],
    PRAZO_ESCLARECIMENTO: [{ min: 2880, nivel: 'NORMAL' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }],
    PRAZO_RECURSO: [{ min: 2880, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'CRITICO' }],
    ABERTURA_PROPOSTAS: []
  },
  mudancas: { RETIFICACAO: 'IMPORTANTE', REABERTURA: 'IMPORTANTE', SUSPENSAO: 'CRITICO', REVOGACAO: 'CRITICO', ANULACAO: 'CRITICO' }
};

// ------------------------------------------------------------ configuração (versão, motivo, merge)
function Lic_copia_(o) { return JSON.parse(JSON.stringify(o)); }
function Lic_alertasCfgLinha_() { return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === 'ALERTAS'; })[0] || null; }
/** Regras em vigor: padrão da missão + o que a Diretoria gravou (merge por campo; antecedências trocadas por tipo). */
function Lic_alertasCfg_() {
  var l = Lic_alertasCfgLinha_(), v = l ? Lic_json_(l.VALOR_JSON, {}) : {}, c = Lic_copia_(LIC_ALERTAS_PADRAO);
  ['ligado', 'alertarTravadas', 'titularId'].forEach(function (k) { if (v[k] !== undefined) c[k] = v[k]; });
  ['canais', 'escalonarMin', 'mudancas'].forEach(function (k) { if (v[k] && typeof v[k] === 'object') Object.keys(v[k]).forEach(function (x) { c[k][x] = v[k][x]; }); });
  if (v.pessoas && typeof v.pessoas === 'object') Object.keys(v.pessoas).forEach(function (u) { c.pessoas[u] = Object.assign({}, c.pessoas[u] || {}, v.pessoas[u]); });
  if (v.antecedencias && typeof v.antecedencias === 'object') Object.keys(v.antecedencias).forEach(function (t) { if (Array.isArray(v.antecedencias[t])) c.antecedencias[t] = v.antecedencias[t]; });
  c.foraDoExpediente = true;
  c.versao = l ? Number(l.VERSAO) || 1 : 0; c.motivo = l ? Lic_s_(l.MOTIVO) : ''; c.atualizadoPor = l ? Lic_s_(l.ATUALIZADO_POR_NOME) : ''; c.atualizadoEm = l ? Lic_s_(l.ATUALIZADO_EM) : '';
  return c;
}
function Lic_antecedenciaNome_(min) {
  min = Number(min) || 0;
  if (min % 1440 === 0) return min / 1440 + (min === 1440 ? ' dia' : ' dias');
  if (min % 60 === 0) return min / 60 + ' h';
  return min + ' min';
}
/**
 * Salvar as regras dos alertas: d = { campos: { ligado, alertarTravadas, titularId, canais, pessoas, escalonarMin, antecedencias,
 * mudancas } (só o que mudou), motivo }. Merge com o que está gravado (nunca sobrescreve campo que não veio), versão + 1,
 * cada mudança no histórico (de → para). Os alertas programados são refeitos pela regra nova (os que saem dela são cancelados
 * com o motivo).
 */
function Lic_alertasCfgSalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500), c = d.campos || {};
  if (motivo.length < 5) throw new Error('Escreva o motivo da mudança (pelo menos 5 letras): fica no histórico das regras com o seu nome e a data. Nada foi alterado');
  var resp = Lic_responsaveis_(), ids = resp.map(function (u) { return u.id; });
  var r = Lic_comTrava_(function () {
    var l = Lic_alertasCfgLinha_(), gravado = l ? Lic_json_(l.VALOR_JSON, {}) : {}, antes = Lic_alertasCfg_(), novo = Lic_copia_(gravado), mud = [];
    var poe = function (rot, de, para) { if (JSON.stringify(de) !== JSON.stringify(para)) mud.push({ rot: rot, de: de, para: para }); };
    ['ligado', 'alertarTravadas'].forEach(function (k) { if (c[k] !== undefined) { var b = c[k] === true || c[k] === 'SIM'; poe(k === 'ligado' ? 'Alertas ligados' : 'Alertar as travadas', antes[k], b); novo[k] = b; } });
    if (c.titularId !== undefined) {
      var t = Lic_s_(c.titularId);
      if (t && ids.indexOf(t) < 0) throw new Error('Escolha o titular na lista (Diretoria ou Administrador ativos). Nada foi alterado');
      poe('Quem recebe primeiro (sem responsável na oportunidade)', antes.titularId, t); novo.titularId = t;
    }
    if (c.canais) { novo.canais = Object.assign({}, gravado.canais || {}); ['email', 'whatsapp'].forEach(function (k) { if (c.canais[k] !== undefined) { var b = !!c.canais[k]; poe('Canal ' + (k === 'email' ? 'e-mail' : 'WhatsApp') + ' (todos)', antes.canais[k], b); novo.canais[k] = b; } }); }
    if (c.pessoas) {
      novo.pessoas = Object.assign({}, gravado.pessoas || {});
      Object.keys(c.pessoas).forEach(function (uid) {
        if (ids.indexOf(uid) < 0) throw new Error('Só a Diretoria de Licitações (perfis Diretoria e Administrador ativos) recebe alertas de licitação: a pessoa ' + uid + ' não está nessa lista. Nada foi alterado');
        var p = c.pessoas[uid] || {}, at = Object.assign({}, novo.pessoas[uid] || {}), nome = (resp.filter(function (u) { return u.id === uid; })[0] || {}).nome || uid;
        ['recebe', 'email', 'whatsapp'].forEach(function (k) { if (p[k] !== undefined) { var b = !!p[k]; poe(nome + ': ' + { recebe: 'recebe alertas', email: 'e-mail', whatsapp: 'WhatsApp' }[k], (antes.pessoas[uid] || {})[k] !== false, b); at[k] = b; } });
        novo.pessoas[uid] = at;
      });
    }
    if (c.escalonarMin) {
      novo.escalonarMin = Object.assign({}, gravado.escalonarMin || {});
      Object.keys(c.escalonarMin).forEach(function (n) {
        if (!LIC_NIVEIS[n]) throw new Error('Nível desconhecido: ' + n + '. Nada foi alterado');
        var v = Math.round(Number(c.escalonarMin[n]));
        if (!isFinite(v) || v < 1 || v > 1440) throw new Error('O tempo para escalonar o nível ' + LIC_NIVEIS[n] + ' precisa ficar entre 1 e 1.440 minutos. Nada foi alterado');
        poe('Escalonar ' + LIC_NIVEIS[n] + ' sem ciência (min)', antes.escalonarMin[n], v); novo.escalonarMin[n] = v;
      });
    }
    if (c.antecedencias) {
      novo.antecedencias = Object.assign({}, gravado.antecedencias || {});
      Object.keys(c.antecedencias).forEach(function (t) {
        if (!LIC_EVENTO_TIPOS[t]) throw new Error('Tipo de prazo desconhecido: ' + t + '. Nada foi alterado');
        var lista = Array.isArray(c.antecedencias[t]) ? c.antecedencias[t] : [], vistos = {}, limpa = [];
        if (lista.length > 8) throw new Error('No máximo 8 antecedências por prazo (' + LIC_EVENTO_TIPOS[t].nome + '). Nada foi alterado');
        lista.forEach(function (a) {
          var m = Math.round(Number(a && a.min)), n = Lic_up_(a && a.nivel);
          if (!isFinite(m) || m < 1 || m > 43200) throw new Error('Antecedência fora da faixa em "' + LIC_EVENTO_TIPOS[t].nome + '": use de 1 minuto a 30 dias. Nada foi alterado');
          if (!LIC_NIVEIS[n]) throw new Error('Escolha o nível (normal, importante ou crítico) de cada antecedência. Nada foi alterado');
          if (vistos[m]) throw new Error('Antecedência repetida em "' + LIC_EVENTO_TIPOS[t].nome + '" (' + Lic_antecedenciaNome_(m) + '). Nada foi alterado');
          vistos[m] = true; limpa.push({ min: m, nivel: n });
        });
        limpa.sort(function (a, b) { return b.min - a.min; });
        poe('Antecedências de "' + LIC_EVENTO_TIPOS[t].nome + '"', (antes.antecedencias[t] || []).map(function (a) { return Lic_antecedenciaNome_(a.min) + ' ' + LIC_NIVEIS[a.nivel]; }).join(', ') || 'nenhuma',
          limpa.map(function (a) { return Lic_antecedenciaNome_(a.min) + ' ' + LIC_NIVEIS[a.nivel]; }).join(', ') || 'nenhuma');
        novo.antecedencias[t] = limpa;
      });
    }
    if (c.mudancas) {
      novo.mudancas = Object.assign({}, gravado.mudancas || {});
      Object.keys(c.mudancas).forEach(function (k) { var n = Lic_up_(c.mudancas[k]); if (!LIC_MUDANCAS_NOMES[k] || !LIC_NIVEIS[n]) throw new Error('Nível de mudança inválido. Nada foi alterado'); poe('Nível: ' + LIC_MUDANCAS_NOMES[k], antes.mudancas[k], n); novo.mudancas[k] = n; });
    }
    // trava de segurança: alertas ligados sem ninguém para receber deixariam a Diretoria no escuro
    var efetivo = Object.assign(Lic_copia_(LIC_ALERTAS_PADRAO), novo), pessoas = Object.assign({}, efetivo.pessoas || {});
    if (efetivo.ligado !== false && resp.length && !resp.some(function (u) { return !pessoas[u.id] || pessoas[u.id].recebe !== false; })) throw new Error('Não foi possível salvar: com os alertas ligados, pelo menos uma pessoa da Diretoria de Licitações precisa receber. Ligue "recebe alertas" para alguém ou desligue os alertas (com o motivo). Nada foi alterado');
    if (!mud.length) return { semMudanca: true };
    var versao = (antes.versao || 0) + 1, agora = Lic_agora_();
    var reg = { CHAVE: 'ALERTAS', VALOR_JSON: JSON.stringify(novo), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    if (l) SGO_DATA.update(LIC_ABAS.CONFIG, l.ID, reg); else SGO_DATA.insert(LIC_ABAS.CONFIG, Object.assign({ CRIADO_EM: agora }, reg));
    mud.forEach(function (m) { Lic_historico_('CONFIG', 'ALERTAS', '', 'REGRAS_DOS_ALERTAS', eu, { de: typeof m.de === 'string' ? m.de : JSON.stringify(m.de), para: typeof m.para === 'string' ? m.para : JSON.stringify(m.para), texto: m.rot + '. Motivo: ' + motivo, versao: versao, fonte: 'Tela Portais e configurações › Regras dos alertas' }); });
    return { versao: versao, mudou: mud.map(function (m) { return m.rot; }) };
  });
  if (r.semMudanca) return { cfg: Lic_alertasCfgTela_(), semMudanca: true, texto: 'Nada mudou: os valores enviados são iguais aos atuais. Nenhuma versão nova foi criada.' };
  try { Lic_alertasProgramar_(new Date()); } catch (e) { r.aviso = 'Regras salvas; os alertas programados serão refeitos na próxima rodada (' + Lic_s_(e && e.message) + ').'; }
  try { Lic_garantirRotinaAlertas_(); } catch (e) {}
  r.cfg = Lic_alertasCfgTela_();
  return r;
}
/** Regras para a tela, com as pessoas da Diretoria de Licitações e a situação do modelo do WhatsApp. */
function Lic_alertasCfgTela_() {
  var c = Lic_alertasCfg_(), resp = Lic_responsaveis_(), contatos = {};
  try { contatos = Notificar_contatos_(resp.map(function (u) { return u.id; })); } catch (e) { contatos = {}; }
  c.pessoasLista = resp.map(function (u) {
    var p = c.pessoas[u.id] || {}, k = contatos[u.id] || {};
    return { id: u.id, nome: u.nome, perfil: u.perfil, recebe: p.recebe !== false, email: p.email !== false, whatsapp: p.whatsapp !== false, temEmail: !!(k.email && k.email.indexOf('@') > 0), celular: Lic_mascarar_(k.telefone) };
  });
  c.tipos = Object.keys(LIC_EVENTO_TIPOS).map(function (t) { return { tipo: t, nome: LIC_EVENTO_TIPOS[t].nome }; });
  c.niveis = LIC_NIVEIS; c.mudancasNomes = LIC_MUDANCAS_NOMES; c.modelo = Lic_modeloWa_(); c.retorno = Lic_retornoMetaSituacao_(); c.rotina = Lic_rotinaSituacao_();
  return c;
}
function Lic_mascarar_(fone) { var d = Lic_s_(fone).replace(/\D/g, ''); return d.length >= 4 ? 'final ' + d.slice(-4) : ''; }
function Lic_modeloWa_() {
  var st = '';
  try { st = typeof SGO_waModeloSituacao_ === 'function' ? Lic_up_(SGO_waModeloSituacao_(LIC_MODELO_WA)) : ''; } catch (e) { st = ''; }
  return { nome: LIC_MODELO_WA, situacao: st || 'NAO_CADASTRADO', aprovado: st === 'APPROVED',
    texto: st === 'APPROVED' ? 'Modelo ' + LIC_MODELO_WA + ' aprovado na Meta: o WhatsApp sai junto com o e-mail.' : 'WhatsApp aguardando aprovação do modelo ' + LIC_MODELO_WA + ' na Meta (situação: ' + (st || 'não cadastrado') + '). Enquanto isso, os alertas vão pelo SGO+ e pelo e-mail. O cadastro na Meta é feito pelo dono em Chaves e senhas › Cadastrar modelos na Meta.' };
}
function Lic_retornoMetaSituacao_() {
  var j = null;
  try { j = Lic_json_(PropertiesService.getScriptProperties().getProperty('SGO_WA_RETORNO_ULTIMO'), null); } catch (e) { j = null; }
  return j && j.em ? { recebido: true, em: j.em, texto: 'Último retorno de status da Meta recebido em ' + Lic_brDiaHora_(j.em) + '.' }
    : { recebido: false, texto: 'Nenhum retorno de status da Meta recebido ainda. Entregue e Lido só aparecem depois que a Meta mandar o retorno (webhook assinado do número do sistema); até lá o último estado garantido é "Aceito pela Meta".' };
}

// ------------------------------------------------------------ quem recebe
/** Diretoria de Licitações que recebe alertas agora (perfis Diretoria e Administrador ativos, menos quem foi desligado nas regras). */
function Lic_integrantes_(cfg) {
  cfg = cfg || Lic_alertasCfg_();
  return Lic_responsaveis_().filter(function (u) { var p = cfg.pessoas[u.id]; return !p || p.recebe !== false; });
}
/** Quem recebe primeiro: o responsável da oportunidade; sem ele, o titular das regras; sem titular, todos. */
function Lic_titulares_(l, cfg, integ) {
  var resp = Lic_s_(l && l.RESPONSAVEL_ID);
  if (resp && integ.some(function (u) { return u.id === resp; })) return integ.filter(function (u) { return u.id === resp; });
  if (cfg.titularId && integ.some(function (u) { return u.id === cfg.titularId; })) return integ.filter(function (u) { return u.id === cfg.titularId; });
  return integ.slice();
}
/** '' = a oportunidade pode ter alerta; senão o motivo (descartada, sem termo de interesse, travada, excluída). */
function Lic_opSemAlerta_(l, cfg) {
  if (!l || Lic_s_(l.EXCLUIDO_EM)) return 'a oportunidade saiu da lista';
  var s = Lic_s_(l.SITUACAO);
  if (s === 'DESCARTADA') return Lic_s_(l.DESCARTE_ORIGEM) === 'REGRA' ? 'descartada pela regra do radar' : 'descartada pela Diretoria';
  if (s === 'RADAR') {
    if (Lic_s_(l.TRIAGEM) === 'CANDIDATA') return '';
    if (Lic_s_(l.TRIAGEM) === 'TRAVADA') return cfg.alertarTravadas ? '' : 'travada (alertas das travadas desligados nas regras)';
    return 'sem termo de interesse';
  }
  return '';
}
/** Alerta de prazo cancelado solta a chave (CHAVE#C<hora>): se o prazo voltar a valer (reabertura, oportunidade reaberta,
 * regra desfeita), o alerta é programado de novo; a linha cancelada fica, com o motivo. */
function Lic_chaveLivre_(a, agora) { var c = Lic_s_(a.CHAVE); return c.indexOf('P|') === 0 && c.indexOf('#C') < 0 ? c + '#C' + Lic_s_(agora).replace(/[^0-9]/g, '').slice(0, 14) : c; }
function Lic_avisoId_() { return 'LA' + (Utilities.getUuid() + Utilities.getUuid()).replace(/[^0-9a-f]/gi, '').toLowerCase().slice(0, 10); }
function Lic_menosMin_(q, n) { return new Date((q instanceof Date ? q : new Date(q)).getTime() - n * 60000).toISOString(); }
function Lic_maisMin_(q, n) { return new Date((q instanceof Date ? q : new Date(q)).getTime() + n * 60000).toISOString(); }
function Lic_tempoRestante_(ms) {
  if (!isFinite(ms)) return '-';
  if (ms <= 0) return 'prazo encerrado';
  var d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  if (d) return d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + (h === 1 ? ' hora' : ' horas') : '');
  if (h) return h + ' h' + (m ? ' ' + m + ' min' : '');
  return Math.max(1, m) + ' min';
}
/** Data em que os alertas foram implantados (primeira rodada): o que já tinha passado antes dela não sai. */
function Lic_alertasImplantadoEm_(agora) {
  var p = PropertiesService.getScriptProperties(), v = Lic_s_(p.getProperty('LIC_ALERTAS_IMPLANTADO_EM'));
  if (!v) { v = agora; p.setProperty('LIC_ALERTAS_IMPLANTADO_EM', v); }
  return v;
}

// ------------------------------------------------------------ programação (uma linha por prazo + antecedência + pessoa)
/**
 * Garante os alertas de prazo das oportunidades que podem ter alerta e cancela, com o motivo, os programados que saíram da
 * regra (prazo retificado, suspenso, cancelado ou passado; oportunidade descartada; pessoa desligada; antecedência removida).
 * o: { opIds } limita às oportunidades. Devolve { criados, cancelados }.
 */
function Lic_alertasProgramar_(quando, o) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  o = o || {};
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), agoraMs = quando.getTime(), integ = Lic_integrantes_(cfg), r = { criados: 0, cancelados: 0 };
  var soOps = o.opIds ? o.opIds.map(Lic_s_) : null, implantado = Lic_alertasImplantadoEm_(agora);
  var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var eventos = Lic_ler_(LIC_ABAS.EVENTOS), evPorId = {}; eventos.forEach(function (e) { evPorId[Lic_s_(e.ID)] = e; });
  return Lic_comTrava_(function () {
    var linhas = Lic_ler_(LIC_ABAS.ALERTAS), porChave = {}, desejadas = {}, novos = [];
    linhas.forEach(function (a) { porChave[Lic_s_(a.CHAVE)] = a; });
    if (cfg.ligado) eventos.forEach(function (e) {
      if (soOps && soOps.indexOf(Lic_s_(e.OPORTUNIDADE_ID)) < 0) return;
      if (Lic_up_(e.SITUACAO) !== 'ATIVO' || Lic_up_(e.NATUREZA) === 'PREVISTO') return;
      var l = ops[Lic_s_(e.OPORTUNIDADE_ID)];
      if (!l || Lic_opSemAlerta_(l, cfg)) return;
      var alvo = Lic_s_(e.LIMITE_INTERNO_ISO) || Lic_s_(e.QUANDO_ISO), alvoMs = Date.parse(alvo);
      if (!isFinite(alvoMs) || alvoMs <= agoraMs) return;
      var ants = (cfg.antecedencias[Lic_s_(e.TIPO)] || []).slice().sort(function (a, b) { return b.min - a.min; });
      var passadas = ants.filter(function (a) { return alvoMs - a.min * 60000 <= agoraMs; }), recente = passadas.length ? passadas[passadas.length - 1] : null;
      var deAntes = Lic_s_(e.CRIADO_EM) && Lic_s_(e.CRIADO_EM) <= implantado;
      var tits = Lic_titulares_(l, cfg, integ), papel = tits.length > 1 ? 'TODOS' : 'TITULAR';
      tits.forEach(function (u) {
        ants.forEach(function (a) {
          var lib = alvoMs - a.min * 60000, ch = 'P|' + Lic_s_(e.ID) + '|' + a.min + '|' + u.id;
          if (lib <= agoraMs && (a !== recente || deAntes)) { if (porChave[ch]) desejadas[ch] = true; return; }   // antecedência já passada: não sai
          desejadas[ch] = true;
          if (porChave[ch]) return;
          var x = { AVISO_ID: Lic_avisoId_(), CHAVE: ch, GRUPO: Lic_s_(e.ID) + '|' + a.min, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: Lic_s_(e.ID), EVENTO_TIPO: Lic_s_(e.TIPO),
            TIPO: 'PRAZO', PAPEL: papel, ANTECEDENCIA_MIN: a.min, ANTECEDENCIA: Lic_antecedenciaNome_(a.min), NIVEL: a.nivel, USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: '',
            TITULO: '', TEXTO: '', ALVO_ISO: alvo, LIBERAR_EM: new Date(Math.max(lib, agoraMs)).toISOString(), SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora };
          novos.push(x); porChave[ch] = x; r.criados++;
        });
      });
    });
    // programados fora da regra agora: cancelados com o motivo (nada é apagado)
    linhas.forEach(function (a) {
      if (Lic_up_(a.SITUACAO) !== 'PROGRAMADO' || Lic_s_(a.TIPO) !== 'PRAZO' || (Lic_s_(a.PAPEL) !== 'TITULAR' && Lic_s_(a.PAPEL) !== 'TODOS')) return;
      if (soOps && soOps.indexOf(Lic_s_(a.OPORTUNIDADE_ID)) < 0) return;
      if (desejadas[Lic_s_(a.CHAVE)]) return;
      var e = evPorId[Lic_s_(a.EVENTO_ID)], l = ops[Lic_s_(a.OPORTUNIDADE_ID)], mot;
      if (!cfg.ligado) mot = 'Alertas de licitação desligados nas regras (versão ' + cfg.versao + ').';
      else if (!e || Lic_up_(e.SITUACAO) !== 'ATIVO') mot = e ? (Lic_s_(e.MOTIVO_MUDANCA) || 'O prazo deixou de valer.') : 'O prazo não existe mais.';
      else if (Lic_up_(e.NATUREZA) === 'PREVISTO') mot = 'O prazo voltou a ficar pendente de confirmação.';
      else if (Lic_opSemAlerta_(l, cfg)) mot = 'Sem alerta: oportunidade ' + Lic_opSemAlerta_(l, cfg) + '.';
      else if (Date.parse(Lic_s_(a.ALVO_ISO)) <= agoraMs) mot = 'O prazo passou antes do envio.';
      else mot = 'Fora das regras dos alertas (versão ' + cfg.versao + '): pessoa, titular ou antecedência mudaram.';
      SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: Lic_texto_(mot, 500), CHAVE: Lic_chaveLivre_(a, agora), ATUALIZADO_EM: agora });
      r.cancelados++;
    });
    if (novos.length) { if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(LIC_ABAS.ALERTAS, novos); else novos.forEach(function (n) { SGO_DATA.insert(LIC_ABAS.ALERTAS, n); }); }
    return r;
  });
}

/**
 * Depois de a agenda mudar (SGO_Licitacoes_Agenda.js): cancela os alertas pendentes dos prazos que deixaram de valer (com o
 * motivo), para o escalonamento dos que já saíram, cria os alertas de mudança (retificação, suspensão, revogação, anulação,
 * reabertura) e programa os dos prazos novos. x = { fora, novos, mudancas, motivoFora }.
 */
function Lic_alertasAposAgenda_(l, x, quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), fora = (x.fora || []).map(Lic_s_), r = { cancelados: 0, mudancas: 0 };
  if (fora.length) Lic_comTrava_(function () {
    var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) { evs[Lic_s_(e.ID)] = e; });
    Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
      if (fora.indexOf(Lic_s_(a.EVENTO_ID)) < 0) return;
      var e = evs[Lic_s_(a.EVENTO_ID)], mot = Lic_texto_(x.motivoFora || (e && e.MOTIVO_MUDANCA) || 'O prazo mudou.', 500), s = Lic_up_(a.SITUACAO);
      if (s === 'PROGRAMADO' || s === 'ENVIANDO') { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: mot, CHAVE: Lic_chaveLivre_(a, agora), ATUALIZADO_EM: agora }); r.cancelados++; }
      else if ((s === 'ENVIADO' || s === 'FALHOU' || s === 'ESCALONADO') && !Lic_s_(a.CIENTE_EM) && Lic_s_(a.ESCALONAR_EM)) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ESCALONAR_EM: '', CANCELADO_MOTIVO: 'Escalonamento cancelado: ' + mot, ATUALIZADO_EM: agora }); }
    });
  });
  if (cfg.ligado && !Lic_opSemAlerta_(l, cfg) && (x.mudancas || []).length) {
    var integ = Lic_integrantes_(cfg), tit = Lic_titulares_(l, cfg, integ);
    Lic_comTrava_(function () {
      var existe = {}; Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) { existe[Lic_s_(a.CHAVE)] = true; });
      var novos = [];
      x.mudancas.forEach(function (m) {
        var nivel = cfg.mudancas[m.tipo] || 'IMPORTANTE', para = nivel === 'CRITICO' ? integ : tit, h = Lic_hash_(m.tipo + '|' + m.texto).slice(0, 12);
        para.forEach(function (u) {
          var ch = 'M|' + Lic_s_(l.ID) + '|' + m.tipo + '|' + h + '|' + u.id;
          if (existe[ch]) return;
          existe[ch] = true;
          novos.push({ AVISO_ID: Lic_avisoId_(), CHAVE: ch, GRUPO: 'M|' + Lic_s_(l.ID) + '|' + h, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: Lic_s_(m.eventoId), EVENTO_TIPO: Lic_s_(m.eventoTipo),
            TIPO: 'MUDANCA', PAPEL: para === integ && integ.length > 1 ? 'TODOS' : 'TITULAR', ANTECEDENCIA_MIN: 0, ANTECEDENCIA: m.tipo, NIVEL: nivel, USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: '',
            TITULO: LIC_MUDANCAS_NOMES[m.tipo] || 'Mudança na licitação', TEXTO: Lic_texto_(m.texto, 1500), ALVO_ISO: '', LIBERAR_EM: agora, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora });
          r.mudancas++;
        });
      });
      if (novos.length) { if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(LIC_ABAS.ALERTAS, novos); else novos.forEach(function (n) { SGO_DATA.insert(LIC_ABAS.ALERTAS, n); }); }
    });
  }
  try { Lic_alertasProgramar_(quando, { opIds: [Lic_s_(l.ID)] }); } catch (e) { console.error('Licitações, programar depois da agenda: ' + ((e && e.message) || e)); }
  return r;
}

/** A oportunidade mudou de situação na tela (descartar, reabrir, enviar para análise): agenda e alertas acompanham. */
function Lic_agendaAposSituacao_(id) {
  try { if (typeof Lic_agendaAtualizar_ === 'function') Lic_agendaAtualizar_({ ids: [id] }); } catch (e) { console.error('Licitações, agenda depois da situação: ' + ((e && e.message) || e)); }
  try { Lic_alertasProgramar_(new Date(), { opIds: [id] }); } catch (e) { console.error('Licitações, alertas depois da situação: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------ texto do alerta
var LIC_ACOES_TIPO = {
  LIMITE_PROPOSTA: { RADAR: 'decidir se participa e, se sim, enviar a proposta no portal antes do fim', ANALISE: 'concluir a análise e enviar a proposta no portal antes do fim', OUTRA: 'conferir se a proposta foi enviada no portal' },
  SESSAO_PUBLICA: 'acompanhar a abertura da sessão no portal', PRAZO_IMPUGNACAO: 'decidir se impugna o edital até o limite interno', PRAZO_ESCLARECIMENTO: 'enviar o pedido de esclarecimento, se houver dúvida, até o limite interno',
  PRAZO_RECURSO: 'protocolar as razões de recurso no portal até o limite interno', ABERTURA_PROPOSTAS: 'conferir o edital: o recebimento das propostas começou'
};
function Lic_acaoAlerta_(a, l) {
  if (Lic_s_(a.TIPO) === 'MUDANCA') return Lic_s_(a.ANTECEDENCIA) === 'SUSPENSAO' ? 'acompanhar a reabertura; os alertas pendentes foram cancelados' : /REVOGACAO|ANULACAO/.test(Lic_s_(a.ANTECEDENCIA)) ? 'conferir o ato na fonte; os alertas pendentes foram cancelados' : 'conferir a mudança na fonte e os prazos novos na agenda';
  var x = LIC_ACOES_TIPO[Lic_s_(a.EVENTO_TIPO)];
  if (x && typeof x === 'object') return x[Lic_s_(l && l.SITUACAO)] || x.OUTRA;
  return x || 'conferir o prazo na agenda';
}
function Lic_linkAviso_(avisoId) {
  var base = typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '';
  if (!base) return '';
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'aviso=' + encodeURIComponent(avisoId);
}
function Lic_cienciaSegredo_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('LIC_CIENCIA_SEGREDO');
  if (s) return s;
  s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  p.setProperty('LIC_CIENCIA_SEGREDO', s);
  return s;
}
function Lic_hex_(bytes) { return (bytes || []).map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
/** Token do link de ciência (sem login): canal w = botão do WhatsApp, e = link do e-mail. Vale só para aquele alerta. */
function Lic_cienciaToken_(avisoId, canal) {
  var base = 'c1' + (canal === 'e' ? 'e' : 'w') + '.' + Lic_s_(avisoId);
  return base + '.' + Lic_hex_(Utilities.computeHmacSha256Signature(base, Lic_cienciaSegredo_())).slice(0, 24);
}
function Lic_linkCiencia_(avisoId, canal) {
  var base = (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '').replace(/\/(exec|dev)$/, '').replace(/\/+$/, '') || 'https://sgo.metrolabs.com.br';
  return base + '/?licciente=' + Lic_cienciaToken_(avisoId, canal);
}
/** Conteúdo do alerta: { titulo, texto (e-mail), params (os 9 do modelo do WhatsApp) }. */
function Lic_alertaConteudo_(a, l, e, quando) {
  var agoraMs = (quando instanceof Date ? quando : new Date()).getTime(), nivel = LIC_NIVEIS[Lic_up_(a.NIVEL)] || 'normal';
  var orgao = Lic_s_(l && l.ORGAO_NOME) || 'Órgão não informado', local = l ? (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF) : '';
  var processo = (Lic_s_(l && l.NUMERO_CONTROLE_PNCP) || Lic_s_(a.CODIGO)) + (l && Lic_s_(l.MODALIDADE) ? ' (' + Lic_s_(l.MODALIDADE) + ')' : '');
  var objeto = Lic_texto_(Lic_s_(l && l.OBJETO).replace(/\s+/g, ' '), 140), mud = Lic_s_(a.TIPO) === 'MUDANCA';
  var prazo = mud ? (Lic_s_(a.TITULO) || 'Mudança na licitação') : (e ? Lic_s_(e.NOME) : 'Prazo');
  var alvoMs = Date.parse(Lic_s_(a.ALVO_ISO)), quandoTxt = mud ? 'detectado em ' + Lic_brDiaHora_(a.CRIADO_EM) : (e ? Lic_eventoQuandoTxt_(e) : Lic_brDiaHora_(a.ALVO_ISO)) + ' (horário de Brasília' + (e && Lic_up_(e.FUSO_PRESUMIDO) === 'SIM' ? ', presumido' : '') + ')';
  var interno = !mud && e && Lic_s_(e.LIMITE_INTERNO_ISO) ? 'limite interno ' + Lic_brDiaHora_(e.LIMITE_INTERNO_ISO) : '';
  var restante = mud ? '-' : Lic_tempoRestante_(alvoMs - agoraMs) + (interno ? ' até o ' + interno : '');
  var acao = Lic_acaoAlerta_(a, l), esc = Lic_s_(a.PAPEL) === 'ESCALONAMENTO', reenvio = Lic_s_(a.PAPEL) === 'REENVIO';
  if (esc) acao = 'sem ciência de ' + Lic_s_(a.ESCALONADO_PARA || 'quem recebeu primeiro') + ': confirme a ciência e ' + acao;
  if (reenvio) acao = 'lembrete (sem ciência): ' + acao;
  var natureza = !mud && e ? (LIC_NATUREZAS[Lic_up_(e.NATUREZA)] || '') + ' · fonte: ' + Lic_s_(e.FONTE_REF) + (Lic_s_(e.REGRA) ? ' · ' + Lic_s_(e.REGRA) : '') : '';
  var titulo = (esc ? 'Sem ciência · ' : reenvio ? 'Lembrete · ' : '') + 'Licitação ' + Lic_s_(a.CODIGO) + ': ' + prazo + (mud ? '' : ' (' + Lic_tempoRestante_(alvoMs - agoraMs) + ')') + ' · ' + Lic_texto_(orgao, 60);
  var resp = l && Lic_s_(l.RESPONSAVEL_NOME) ? Lic_s_(l.RESPONSAVEL_NOME) : 'Diretoria de Licitações';
  var texto = ['METROLABS · ALERTA DE LICITAÇÃO (' + nivel + ')', '', 'Órgão: ' + orgao + (local ? ' (' + local + ')' : ''), 'Processo: ' + processo, 'Objeto: ' + objeto, (mud ? 'Mudança: ' : 'Prazo: ') + prazo,
    'Quando: ' + quandoTxt + (interno ? '; ' + interno : ''), 'Tempo restante: ' + restante, 'Responsável: ' + resp, 'Ação necessária: ' + acao]
    .concat(mud ? ['', Lic_s_(a.TEXTO)] : natureza ? ['', 'Natureza do prazo: ' + natureza] : [])
    .concat(['', 'Confirmar ciência (registra que você viu este alerta; não conclui a tarefa): ' + Lic_linkCiencia_(a.AVISO_ID, 'e'), '', 'O botão abaixo abre a licitação no SGO+, com login. Alerta da Diretoria de Licitações: pode chegar fora do expediente (decisão do dono, 01/11/2026).']).join('\n');
  var params = [nivel, orgao + (local ? ' (' + local + ')' : ''), processo, objeto || '-', prazo, quandoTxt, restante, acao, Lic_linkAviso_(a.AVISO_ID) || '@LINK'];
  return { titulo: titulo, texto: texto, params: params };
}

// ------------------------------------------------------------ envio
function Lic_canaisDe_(a, cfg) {
  var forc = Lic_s_(a.CANAIS);
  var c = forc ? forc.split(',').map(Lic_s_).filter(Boolean) : (function () { var p = cfg.pessoas[Lic_s_(a.USUARIO_ID)] || {}, x = []; if (p.email !== false) x.push('email'); if (p.whatsapp !== false) x.push('whatsapp'); return x; })();
  return c.filter(function (k) { return cfg.canais[k] !== false; });
}
/** E-mail do alerta. { situacao: ENVIADO|SEM_EMAIL|FALHOU, motivo }. */
function Lic_alertaEmail_(a, ct) {
  try {
    var r = SGO_notificar_({ usuarios: [Lic_s_(a.USUARIO_ID)], canais: ['email'], origem: 'LICITACOES', refId: Lic_s_(a.AVISO_ID) + '-' + (Number(a.TENTATIVAS) || 0), titulo: ct.titulo, texto: ct.texto,
      link: Lic_linkAviso_(a.AVISO_ID) || undefined, rotuloLink: 'Abrir a licitação no SGO+' }) || {};
    if (r.ok) return { situacao: 'ENVIADO', motivo: 'Entregue ao serviço de e-mail do SGO+ (sistema@metrolabs.com.br).' };
    return { situacao: /Sem e-mail no cadastro/i.test(Lic_s_(r.motivo)) ? 'SEM_EMAIL' : 'FALHOU', motivo: Lic_texto_(r.motivo || 'O e-mail não saiu.', 300) };
  } catch (e) { return { situacao: 'FALHOU', motivo: Lic_texto_((e && e.message) || e, 300) }; }
}
/** WhatsApp oficial (Meta) pelo modelo sgo_licitacao_prazo. { situacao: ACEITO|AGUARDANDO_MODELO|SEM_NUMERO|RETIDO|NAO_CONFIGURADO|FALHOU|NAO_ENVIADO, motivo, id }. */
function Lic_alertaWhatsapp_(a, ct) {
  try {
    var uid = Lic_s_(a.USUARIO_ID), c = typeof Notificar_contatos_ === 'function' ? Notificar_contatos_([uid])[uid] : null;
    var prov = typeof Notificar_provedorWhatsapp_ === 'function' ? Notificar_provedorWhatsapp_() : { provedor: '' };
    var mod = Lic_modeloWa_();
    if (!c || !c.telefone) return { situacao: 'SEM_NUMERO', motivo: 'Sem celular válido no cadastro (Administração › Usuários › Celular): o alerta foi pelo SGO+ e pelo e-mail.' };
    if (!prov.provedor) return { situacao: 'NAO_CONFIGURADO', motivo: Lic_texto_(prov.motivo || 'WhatsApp não configurado.', 260) };
    if (prov.provedor !== 'meta') return { situacao: 'NAO_CONFIGURADO', motivo: 'Licitações usa só o WhatsApp oficial (Meta); o provedor em uso não é o oficial. Nenhuma mensagem saiu por ele.' };
    if (!mod.aprovado) return { situacao: 'AGUARDANDO_MODELO', motivo: mod.texto };
    var r = SGO_notificar_({ usuarios: [uid], canais: ['whatsapp'], origem: 'LICITACOES', refId: Lic_s_(a.AVISO_ID) + '-' + (Number(a.TENTATIVAS) || 0), titulo: ct.titulo, texto: ct.texto,
      link: Lic_linkAviso_(a.AVISO_ID) || undefined, soMeta: true, modeloSemReserva: true, modelo: { nome: LIC_MODELO_WA, parametros: ct.params, botao: Lic_cienciaToken_(a.AVISO_ID, 'w') } }) || {};
    var id = r.ids && r.ids[uid] ? String(r.ids[uid]) : '';
    if (r.ok) return { situacao: 'ACEITO', motivo: 'Aceito pela Meta (celular ' + Lic_mascarar_(c.telefone) + ')' + (id ? '' : ', sem o id da mensagem: Entregue e Lido não vão aparecer') + '.', id: id };
    var mot = Lic_texto_(String(r.motivo || 'O WhatsApp não saiu.').replace(/\d{8,}/g, '***'), 300);
    if (/piloto/i.test(mot)) return { situacao: 'RETIDO', motivo: mot };
    if (/não aprovado/i.test(mot)) return { situacao: 'AGUARDANDO_MODELO', motivo: mot };
    return { situacao: r.erro ? 'FALHOU' : 'NAO_ENVIADO', motivo: mot };
  } catch (e) { return { situacao: 'FALHOU', motivo: Lic_texto_(String((e && e.message) || e).replace(/\d{8,}/g, '***'), 300) }; }
}

/** Envia um alerta (interno sempre; e-mail e WhatsApp conforme as regras; canal alternativo se o escolhido falhar). Nunca lança. */
function Lic_alertaEnviarUm_(a, quando, cfg, ops, evs) {
  var agora = quando.toISOString(), l = ops[Lic_s_(a.OPORTUNIDADE_ID)], e = evs[Lic_s_(a.EVENTO_ID)] || null;
  var tent = (Number(a.TENTATIVAS) || 0) + 1;
  var ct = Lic_alertaConteudo_(a, l, e, quando), canais = Lic_canaisDe_(a, cfg), em = null, wa = null, alt = '';
  if (canais.indexOf('email') >= 0) em = Lic_alertaEmail_(a, ct);
  if (canais.indexOf('whatsapp') >= 0) wa = Lic_alertaWhatsapp_(a, ct);
  var emOk = em && em.situacao === 'ENVIADO', waOk = wa && wa.situacao === 'ACEITO';
  // canal alternativo: o escolhido não saiu -> o outro (se não estiver desligado para todos)
  if (!emOk && !waOk) {
    if (!em && cfg.canais.email !== false) { em = Lic_alertaEmail_(a, ct); emOk = em.situacao === 'ENVIADO'; alt = 'WhatsApp não saiu (' + (wa ? LIC_WA_ROTULOS[wa.situacao] || wa.situacao : 'sem canal') + '): e-mail enviado como canal alternativo' + (emOk ? '' : ', e também falhou') + '.'; }
    else if (!wa && cfg.canais.whatsapp !== false) { wa = Lic_alertaWhatsapp_(a, ct); waOk = wa.situacao === 'ACEITO'; alt = 'E-mail não saiu (' + (em ? em.motivo : 'sem canal') + '): WhatsApp tentado como canal alternativo' + (waOk ? '' : ', e também não saiu') + '.'; }
  }
  var chegou = emOk || waOk, papel = Lic_s_(a.PAPEL), escalona = papel === 'TITULAR' || papel === 'TODOS';
  var campos = { TITULO: Lic_texto_(ct.titulo, 300), TEXTO: Lic_s_(a.TIPO) === 'MUDANCA' ? Lic_s_(a.TEXTO) : Lic_texto_(ct.texto, 3000), TENTATIVAS: tent, INTERNO_EM: Lic_s_(a.INTERNO_EM) || agora,
    ENVIADO_EM: chegou ? agora : Lic_s_(a.ENVIADO_EM), SITUACAO: chegou ? 'ENVIADO' : 'FALHOU', CANAL_ALTERNATIVO: Lic_texto_(alt, 300), ATUALIZADO_EM: agora };
  if (em) { campos.EMAIL_SITUACAO = em.situacao; campos.EMAIL_MOTIVO = em.motivo; campos.EMAIL_EM = agora; }
  if (wa) { campos.WA_SITUACAO = wa.situacao; campos.WA_MOTIVO = wa.motivo; campos.WA_ID = wa.id || ''; campos.WA_EM = agora; if (wa.situacao === 'FALHOU') campos.FALHOU_EM = agora; }
  if (!chegou) campos.FALHOU_EM = agora;
  if (escalona && !Lic_s_(a.CIENTE_EM)) campos.ESCALONAR_EM = chegou ? Lic_maisMin_(quando, Number(cfg.escalonarMin[Lic_up_(a.NIVEL)]) || 60) : agora;
  SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, campos);
  Object.keys(campos).forEach(function (k) { a[k] = campos[k]; });
  var resumo = 'interno: registrado na Central de alertas' + (em ? '; e-mail: ' + (em.situacao === 'ENVIADO' ? 'entregue ao serviço de e-mail' : em.motivo) : '') + (wa ? '; WhatsApp: ' + (LIC_WA_ROTULOS[wa.situacao] || wa.situacao) + (wa.situacao === 'ACEITO' ? '' : ' (' + wa.motivo + ')') : '') + (alt ? '; ' + alt : '');
  Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, chegou ? 'ALERTA_ENVIADO' : 'ALERTA_FALHOU', { id: '', nome: 'Alertas de licitação (sistema)' },
    { para: Lic_s_(a.USUARIO_NOME), texto: Lic_s_(a.AVISO_ID) + ' · ' + ct.titulo + ' · ' + LIC_NIVEIS[Lic_up_(a.NIVEL)] + ' · ' + resumo, fonte: 'Alertas (' + (papel === 'ESCALONAMENTO' ? 'escalonamento' : papel === 'REENVIO' ? 'reenvio por outro canal' : 'antecedência ' + Lic_s_(a.ANTECEDENCIA)) + ')' });
  return { chegou: chegou, email: em, whatsapp: wa };
}

/**
 * Envia o que está pronto. Sem envio em dobro: a escolha fica sob a trava e cada linha passa a ENVIANDO antes de sair (ENVIANDO há
 * mais de 10 minutos volta). Do mesmo prazo e pessoa, se mais de uma antecedência venceu junto (rotina parada), sai só a mais
 * recente. Prazo que passou antes do envio: cancelado com o motivo. Pessoa que saiu da Diretoria de Licitações: cancelado.
 */
function Lic_alertasEnviar_(quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), agoraMs = quando.getTime(), velho = Lic_menosMin_(quando, LIC_ENVIANDO_MAX_MIN), res = { enviados: 0, falhas: 0, pulados: 0 };
  if (!cfg.ligado) return { desligado: true };
  var integ = {}; Lic_integrantes_(cfg).forEach(function (u) { integ[u.id] = u; });
  var lote = [], lock = null;
  try { lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return { ocupado: 'outro envio de alertas de licitação em andamento; sai na próxima rodada' }; } catch (e) { lock = null; }
  try {
    var prontas = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (a) { var s = Lic_up_(a.SITUACAO); return (s === 'PROGRAMADO' && Lic_s_(a.LIBERAR_EM) <= agora) || (s === 'ENVIANDO' && Lic_s_(a.ENVIANDO_EM) < velho); });
    var maisRecente = {};
    var ehTitular = function (a) { return Lic_s_(a.TIPO) === 'PRAZO' && (Lic_s_(a.PAPEL) === 'TITULAR' || Lic_s_(a.PAPEL) === 'TODOS'); };
    prontas.forEach(function (a) { if (!ehTitular(a)) return; var k = Lic_s_(a.EVENTO_ID) + '|' + Lic_s_(a.USUARIO_ID); if (!maisRecente[k] || Number(a.ANTECEDENCIA_MIN) < Number(maisRecente[k].ANTECEDENCIA_MIN)) maisRecente[k] = a; });
    prontas.forEach(function (a) {
      var mot = '';
      if (!integ[Lic_s_(a.USUARIO_ID)]) mot = 'A pessoa não recebe mais alertas de licitação (saiu da Diretoria de Licitações ou foi desligada nas regras).';
      else if (Lic_s_(a.ALVO_ISO) && Date.parse(Lic_s_(a.ALVO_ISO)) <= agoraMs) mot = 'O prazo passou antes do envio (a rotina dos alertas ficou parada?).';
      if (mot) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: mot, ATUALIZADO_EM: agora }); res.pulados++; return; }
      if (ehTitular(a) && maisRecente[Lic_s_(a.EVENTO_ID) + '|' + Lic_s_(a.USUARIO_ID)] !== a) {
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'PULADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: 'Venceu junto com um aviso mais recente do mesmo prazo: saiu só o mais recente.', ATUALIZADO_EM: agora }); res.pulados++; return;
      }
      SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: agora });
      lote.push(a);
    });
  } finally { try { if (lock) lock.releaseLock(); } catch (e) {} }
  if (!lote.length) return res;
  var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) { evs[Lic_s_(e.ID)] = e; });
  lote.forEach(function (a) { var x = Lic_alertaEnviarUm_(a, quando, cfg, ops, evs); if (x.chegou) res.enviados++; else res.falhas++; });
  return res;
}

// ------------------------------------------------------------ ciência
/**
 * Registra a ciência de um alerta (e encerra a cobrança do mesmo alerta para os outros integrantes). quem = { id, nome };
 * canal: SGO_TELA | WHATSAPP_BOTAO | EMAIL_LINK | WHATSAPP_RESPOSTA. Repetir não duplica. Devolve { alerta, ja }.
 */
function Lic_alertaCiente_(alertaId, quem, canal, quando) {
  var agora = (quando instanceof Date ? quando : new Date()).toISOString();
  return Lic_comTrava_(function () {
    var a = SGO_DATA.getById(LIC_ABAS.ALERTAS, Lic_s_(alertaId));
    if (!a) throw new Error('Não foi possível registrar a ciência: o alerta não foi encontrado (o link pode ser de outro ambiente). Abra a Central de alertas no SGO+');
    if (Lic_s_(a.CIENTE_EM)) return { alerta: a, ja: true };
    var s = Lic_up_(a.SITUACAO);
    if (s === 'PROGRAMADO' || s === 'ENVIANDO') throw new Error('Este alerta ainda não foi enviado (sai em ' + Lic_brDiaHora_(a.LIBERAR_EM) + '). A ciência fica disponível quando ele sair');
    if (s === 'CANCELADO' || s === 'PULADO') throw new Error('Este alerta foi cancelado (' + Lic_s_(a.CANCELADO_MOTIVO) + '). Não há o que confirmar; confira a agenda da licitação');
    var grupo = Lic_s_(a.GRUPO), outros = [];
    Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (x) {
      if (Lic_s_(x.GRUPO) !== grupo || Lic_s_(x.CIENTE_EM)) return;
      var sx = Lic_up_(x.SITUACAO), mesmo = Lic_s_(x.ID) === Lic_s_(a.ID);
      if (sx === 'PROGRAMADO' || sx === 'ENVIANDO') {
        if (Lic_s_(x.PAPEL) === 'ESCALONAMENTO' || Lic_s_(x.PAPEL) === 'REENVIO') { SGO_DATA.update(LIC_ABAS.ALERTAS, x.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: 'Ciência de ' + quem.nome + ' antes do envio.', ATUALIZADO_EM: agora }); }
        return;
      }
      if (sx === 'CANCELADO' || sx === 'PULADO') return;
      SGO_DATA.update(LIC_ABAS.ALERTAS, x.ID, { SITUACAO: 'CIENTE', CIENTE_EM: agora, CIENTE_POR_ID: Lic_s_(quem.id), CIENTE_POR_NOME: Lic_s_(quem.nome), CIENTE_CANAL: mesmo ? canal : canal + '_OUTRO', ESCALONAR_EM: '', ATUALIZADO_EM: agora });
      if (!mesmo) outros.push(Lic_s_(x.USUARIO_NOME));
    });
    Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_CIENCIA', quem, { de: LIC_ALERTA_SITUACOES[s] || s, para: 'Ciência registrada',
      texto: Lic_s_(a.AVISO_ID) + ' · ' + (Lic_s_(a.TITULO) || 'alerta') + ' · ciência de ' + quem.nome + ' pelo ' + (LIC_CANAIS_CIENCIA[canal] || canal) + (outros.length ? '; encerra a cobrança também para ' + outros.join(', ') : '') + '. A ciência não conclui a tarefa.', fonte: 'Alertas de licitação' });
    return { alerta: SGO_DATA.getById(LIC_ABAS.ALERTAS, a.ID), ja: false };
  });
}
function Lic_alertaCienteTela_(eu, d) {
  var r = Lic_alertaCiente_(d.id, eu, 'SGO_TELA');
  return { ja: r.ja, texto: r.ja ? 'A ciência já estava registrada (' + Lic_s_(r.alerta.CIENTE_POR_NOME) + ', ' + Lic_brDiaHora_(r.alerta.CIENTE_EM) + ').' : 'Ciência registrada. A tarefa continua aberta até a ação ser feita.' };
}
/** Link sem login (botão do WhatsApp ou link do e-mail): resolve o token do alerta. */
function Lic_cienciaResolver_(token) {
  var m = /^c1([we])\.(LA[0-9a-f]{10})\.([0-9a-f]{24})$/.exec(Lic_s_(token));
  if (!m) return { erro: 'Este link de ciência não é válido (pode ter sido copiado pela metade). Abra o SGO+ e confirme na Central de alertas de Licitações.' };
  var esperado = Lic_cienciaToken_(m[2], m[1]).split('.')[2], d = 0;
  for (var i = 0; i < 24; i++) d |= esperado.charCodeAt(i) ^ m[3].charCodeAt(i);
  if (d) return { erro: 'Este link de ciência não é válido. Abra o SGO+ e confirme na Central de alertas de Licitações.' };
  var a = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.AVISO_ID) === m[2]; })[0];
  if (!a) return { erro: 'Não encontramos este alerta (o link pode ser de outro ambiente). Abra o SGO+ e confira a Central de alertas.' };
  if (Date.now() - Date.parse(Lic_s_(a.CRIADO_EM)) > 30 * 864e5) return { erro: 'Este link de ciência venceu (vale 30 dias). Abra o SGO+ para ver a licitação.' };
  return { alerta: a, canal: m[1] === 'e' ? 'EMAIL_LINK' : 'WHATSAPP_BOTAO' };
}
/** google.script.run da página do link (sem login): acao 'ver' ou 'confirmar'. Só o primeiro nome, o código e o prazo. Nunca lança. */
function Licitacoes_cienciaLink(token, acao) {
  try {
    var x = Lic_cienciaResolver_(token);
    if (x.erro) return { ok: false, message: x.erro };
    var a = x.alerta, base = { ok: true, nome: (Lic_s_(a.USUARIO_NOME).split(/\s+/)[0] || ''), codigo: Lic_s_(a.CODIGO), prazo: Lic_s_(a.TITULO) || 'Alerta de licitação', nivel: LIC_NIVEIS[Lic_up_(a.NIVEL)] || '' };
    if (Lic_s_(acao) === 'confirmar') {
      var r = Lic_alertaCiente_(a.ID, { id: Lic_s_(a.USUARIO_ID), nome: Lic_s_(a.USUARIO_NOME) }, x.canal);
      a = r.alerta;
    }
    base.ciente = !!Lic_s_(a.CIENTE_EM); base.cienteEm = Lic_s_(a.CIENTE_EM) ? Lic_brDiaHora_(a.CIENTE_EM) : ''; base.cientePor = Lic_s_(a.CIENTE_POR_NOME);
    return base;
  } catch (e) { return { ok: false, message: String((e && e.message) || e).replace(/[.\s]+$/, '') + '.' }; }
}
/** Página leve do link de ciência (?licciente=<token>), sem login, como a do assistente do ponto. */
function Lic_cientePagina_(token) {
  var t = Lic_s_(token).replace(/[^A-Za-z0-9.]/g, '').slice(0, 80);
  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ciência do alerta · Metrolabs</title>' +
    '<style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f4f5f3;color:#1c1f1d}main{max-width:460px;margin:0 auto;padding:24px 16px}' +
    '.c{background:#fff;border:1px solid #d8dcd6;border-radius:10px;padding:18px}h1{font-size:18px;margin:0 0 8px}p{font-size:15px;line-height:1.5;margin:8px 0}' +
    'button{width:100%;min-height:48px;font-size:16px;font-weight:700;border:0;border-radius:8px;background:#1f6f4a;color:#fff;margin-top:12px}button[disabled]{opacity:.6}.m{color:#5b625d;font-size:13px}.ok{color:#1f6f4a;font-weight:700}.er{color:#a3261b}</style></head>' +
    '<body><main><div class="c"><h1>Alerta de licitação</h1><div id="x"><p class="m">Carregando...</p></div></div><p class="m">Metrolabs · SGO+. A ciência registra que você viu o alerta; a tarefa continua aberta no sistema.</p></main>' +
    '<script>var T=' + JSON.stringify(t) + ';function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
    'function d(r){var x=document.getElementById("x");if(!r||!r.ok){x.innerHTML="<p class=er>"+e(r&&r.message||"Não foi possível abrir agora. Tente de novo.")+"</p>";return;}' +
    'x.innerHTML="<p>"+e(r.nome)+", "+e(r.prazo)+"</p><p class=m>"+e(r.codigo)+(r.nivel?" · nível "+e(r.nivel):"")+"</p>"+(r.ciente?"<p class=ok>Ciência registrada em "+e(r.cienteEm)+(r.cientePor?" por "+e(r.cientePor):"")+".</p>":"<button id=b>Confirmar ciência</button>");' +
    'var b=document.getElementById("b");if(b)b.onclick=function(){b.disabled=true;google.script.run.withSuccessHandler(d).withFailureHandler(function(){b.disabled=false;alert("Sem comunicação com o SGO+. Tente de novo.");}).Licitacoes_cienciaLink(T,"confirmar");};}' +
    'google.script.run.withSuccessHandler(d).withFailureHandler(function(){d({ok:false});}).Licitacoes_cienciaLink(T,"ver");</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Ciência do alerta · Metrolabs').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
/** Resposta "ciente" à mensagem do WhatsApp (contexto = id da mensagem do alerta; o número precisa ser o da pessoa). Devolve 1 ou 0. */
function Lic_alertasRespostaWhatsapp_(contextoId, de, texto, quandoIso) {
  try {
    contextoId = Lic_s_(contextoId);
    if (!contextoId || !/^\s*(ciente|cientes|confirmo|confirmado|recebido|visto|ok)\b/i.test(Lic_s_(texto))) return 0;
    var a = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.WA_ID) === contextoId; })[0];
    if (!a || Lic_s_(a.CIENTE_EM)) return 0;
    var c = Notificar_contatos_([Lic_s_(a.USUARIO_ID)])[Lic_s_(a.USUARIO_ID)] || {}, canon = function (v) { var dd = Lic_s_(v).replace(/\D/g, '').replace(/^0+/, ''); if (dd.length === 10 || dd.length === 11) dd = '55' + dd; return /^55\d{10,11}$/.test(dd) ? dd.slice(2, 4) + dd.slice(-8) : ''; };
    if (!c.telefone || canon(c.telefone) !== canon(de)) return 0;
    Lic_alertaCiente_(a.ID, { id: Lic_s_(a.USUARIO_ID), nome: Lic_s_(a.USUARIO_NOME) }, 'WHATSAPP_RESPOSTA', quandoIso ? new Date(quandoIso) : null);
    return 1;
  } catch (e) { return 0; }
}

// ------------------------------------------------------------ escalonamento e reenvio
/**
 * Sem ciência no tempo do nível: o alerta vai para os outros integrantes (todos os canais) e é reenviado ao titular pelo outro
 * canal. Uma vez por alerta. Sem outro integrante: só o reenvio. Prazo que já passou não escalona.
 */
function Lic_alertasEscalonar_(quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), agoraMs = quando.getTime(), r = { escalonados: 0, novos: 0 };
  if (!cfg.ligado) return r;
  var integ = Lic_integrantes_(cfg);
  return Lic_comTrava_(function () {
    var linhas = Lic_ler_(LIC_ABAS.ALERTAS), existe = {}, cientes = {}, novos = [];
    linhas.forEach(function (x) { existe[Lic_s_(x.CHAVE)] = true; if (Lic_s_(x.CIENTE_EM)) cientes[Lic_s_(x.GRUPO)] = true; });
    linhas.forEach(function (a) {
      var s = Lic_up_(a.SITUACAO);
      if ((s !== 'ENVIADO' && s !== 'FALHOU') || Lic_s_(a.CIENTE_EM) || !Lic_s_(a.ESCALONAR_EM) || Lic_s_(a.ESCALONAR_EM) > agora || Lic_s_(a.ESCALONADO_EM)) return;
      if (cientes[Lic_s_(a.GRUPO)]) return;
      if (Lic_s_(a.ALVO_ISO) && Date.parse(Lic_s_(a.ALVO_ISO)) <= agoraMs) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ESCALONAR_EM: '', CANCELADO_MOTIVO: 'Prazo encerrado sem ciência: o escalonamento parou.', ATUALIZADO_EM: agora }); return; }
      // quem recebeu junto com os outros (sem titular, ou mudança crítica) não cruza: só o reenvio por outro canal
      var outros = Lic_s_(a.PAPEL) === 'TODOS' ? [] : integ.filter(function (u) { return u.id !== Lic_s_(a.USUARIO_ID); }), nomes = [];
      var base = { OPORTUNIDADE_ID: a.OPORTUNIDADE_ID, CODIGO: a.CODIGO, EVENTO_ID: a.EVENTO_ID, EVENTO_TIPO: a.EVENTO_TIPO, TIPO: a.TIPO, GRUPO: a.GRUPO, ANTECEDENCIA_MIN: a.ANTECEDENCIA_MIN, ANTECEDENCIA: a.ANTECEDENCIA,
        NIVEL: a.NIVEL, TITULO: a.TITULO, TEXTO: Lic_s_(a.TIPO) === 'MUDANCA' ? a.TEXTO : '', ALVO_ISO: a.ALVO_ISO, LIBERAR_EM: agora, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ORIGEM_ALERTA_ID: a.ID, ESCALONADO_PARA: a.USUARIO_NOME, ATUALIZADO_EM: agora, CRIADO_EM: agora };
      outros.forEach(function (u) {
        var ch = 'E|' + Lic_s_(a.ID) + '|' + u.id;
        if (existe[ch]) return;
        existe[ch] = true; nomes.push(u.nome);
        novos.push(Object.assign({}, base, { AVISO_ID: Lic_avisoId_(), CHAVE: ch, PAPEL: 'ESCALONAMENTO', USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: ['email', 'whatsapp'].filter(function (k) { return cfg.canais[k] !== false; }).join(',') }));
      });
      // reenvio ao titular pelo outro canal (o que funcionou fica de fora; se nenhum funcionou, os dois de novo)
      var waOk = !!LIC_WA_ORDEM[Lic_up_(a.WA_SITUACAO)], emOk = Lic_up_(a.EMAIL_SITUACAO) === 'ENVIADO', alt = waOk && !emOk ? 'email' : emOk && !waOk ? 'whatsapp' : waOk && emOk ? 'whatsapp' : 'email,whatsapp';
      var chR = 'R|' + Lic_s_(a.ID);
      if (!existe[chR] && integ.some(function (u) { return u.id === Lic_s_(a.USUARIO_ID); })) {
        existe[chR] = true;
        novos.push(Object.assign({}, base, { AVISO_ID: Lic_avisoId_(), CHAVE: chR, PAPEL: 'REENVIO', USUARIO_ID: a.USUARIO_ID, USUARIO_NOME: a.USUARIO_NOME, CANAIS: alt.split(',').filter(function (k) { return cfg.canais[k] !== false; }).join(',') || 'email', ESCALONADO_PARA: '' }));
      }
      var para = nomes.length ? nomes.join(', ') : 'sem outro integrante: reenvio ao titular por outro canal';
      SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'ESCALONADO', ESCALONADO_EM: agora, ESCALONADO_PARA: Lic_texto_(para, 300), ESCALONAR_EM: '', ATUALIZADO_EM: agora });
      Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_ESCALONADO', { id: '', nome: 'Alertas de licitação (sistema)' }, { de: Lic_s_(a.USUARIO_NOME), para: para,
        texto: Lic_s_(a.AVISO_ID) + ' · ' + Lic_s_(a.TITULO) + ' · sem ciência em ' + (Number(cfg.escalonarMin[Lic_up_(a.NIVEL)]) || 60) + ' min (nível ' + LIC_NIVEIS[Lic_up_(a.NIVEL)] + ')' + (s === 'FALHOU' ? ', e o envio tinha falhado' : '') + ': escalonado para ' + para + ' e reenviado a ' + Lic_s_(a.USUARIO_NOME) + ' por ' + alt.replace('email', 'e-mail').replace('whatsapp', 'WhatsApp').replace(',', ' e ') + '.', fonte: 'Alertas de licitação' });
      r.escalonados++;
    });
    if (novos.length) { if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(LIC_ABAS.ALERTAS, novos); else novos.forEach(function (n) { SGO_DATA.insert(LIC_ABAS.ALERTAS, n); }); r.novos = novos.length; }
    return r;
  });
}
/** "Reenviar" (Central de alertas): uma linha nova de reenvio para a mesma pessoa, pelos dois canais. */
function Lic_alertaReenviar_(eu, d) {
  var r = Lic_comTrava_(function () {
    var a = SGO_DATA.getById(LIC_ABAS.ALERTAS, Lic_s_(d.id)), agora = Lic_agora_();
    if (!a) throw new Error('Não foi possível reenviar: o alerta não foi encontrado. Atualize a Central de alertas');
    var s = Lic_up_(a.SITUACAO);
    if (s === 'PROGRAMADO' || s === 'ENVIANDO' || s === 'CANCELADO' || s === 'PULADO') throw new Error('Não foi possível reenviar: o alerta está "' + (LIC_ALERTA_SITUACOES[s] || s) + '". Só alerta já enviado, com falha ou escalonado pode ser reenviado');
    var n = Object.assign({}, a); delete n.ID;
    Object.keys(n).forEach(function (k) { if (/_EM$|SITUACAO|MOTIVO|WA_ID|CIENTE|ESCALON|CANAL_ALT/.test(k)) n[k] = ''; });
    Object.assign(n, { AVISO_ID: Lic_avisoId_(), CHAVE: 'U|' + Lic_s_(a.ID) + '|' + agora, PAPEL: 'REENVIO', CANAIS: 'email,whatsapp', SITUACAO: 'PROGRAMADO', LIBERAR_EM: agora, TENTATIVAS: 0, ORIGEM_ALERTA_ID: a.ID, CRIADO_EM: agora, ATUALIZADO_EM: agora });
    SGO_DATA.insert(LIC_ABAS.ALERTAS, n);
    Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_REENVIO_PEDIDO', eu, { para: Lic_s_(a.USUARIO_NOME), texto: Lic_s_(a.AVISO_ID) + ' · reenvio pedido pela Central de alertas.', fonte: 'Tela Central de alertas' });
    return true;
  });
  var x = Lic_alertasEnviar_(new Date());
  return { reenviado: r, envio: x, texto: 'Reenvio feito agora: ' + (x.enviados ? 'saiu' : 'não saiu (veja o motivo na linha)') + '.' };
}

// ------------------------------------------------------------ retorno da Meta (sent, delivered, read, failed)
/**
 * Chamado por SGO_whatsappRetornoMeta_ (SGO_Avisos_Gestao.js) para cada status do webhook do WhatsApp oficial. Só muda o que a
 * Meta confirmou; nunca volta (lido não vira entregue). failed: canal alternativo (e-mail) na hora e, sem nenhum canal que
 * chegou, escalonamento na hora. Devolve quantas linhas mudaram.
 */
function Lic_alertasRetornoMeta_(wamid, status, quandoIso, motivo) {
  try {
    wamid = Lic_s_(wamid); status = Lic_s_(status).toLowerCase();
    if (!wamid) return 0;
    var em = Lic_s_(quandoIso) && isFinite(Date.parse(quandoIso)) ? new Date(quandoIso).toISOString() : Lic_agora_(), n = 0, meta = { id: '', nome: 'Retorno da Meta (WhatsApp oficial)' };
    Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
      if (Lic_s_(a.WA_ID) !== wamid) return;
      var at = Lic_up_(a.WA_SITUACAO), c = {}, ordem = LIC_WA_ORDEM[at] || 0;
      if (status === 'sent' && ordem === 1) c = { WA_SITUACAO: 'ENVIADO' };
      else if (status === 'delivered' && ordem < 3) c = { WA_SITUACAO: 'ENTREGUE', ENTREGUE_EM: em };
      else if (status === 'read' && ordem < 4) { c = { WA_SITUACAO: 'LIDO', LIDO_EM: em }; if (!Lic_s_(a.ENTREGUE_EM)) c.ENTREGUE_EM = em; }
      else if (status === 'failed' && (ordem === 1 || ordem === 2)) c = { WA_SITUACAO: 'FALHOU', FALHOU_EM: em, WA_MOTIVO: Lic_texto_('A Meta devolveu falha na entrega' + (motivo ? ': ' + String(motivo).replace(/\d{8,}/g, '***') : '') + '.', 300) };
      if (!Object.keys(c).length) return;
      c.ATUALIZADO_EM = Lic_agora_();
      SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, c);
      Object.keys(c).forEach(function (k) { a[k] = c[k]; });
      n++;
      var txt = Lic_s_(a.AVISO_ID) + ' · ' + Lic_s_(a.USUARIO_NOME) + ' · WhatsApp ' + (LIC_WA_ROTULOS[c.WA_SITUACAO] || c.WA_SITUACAO).toLowerCase() + ' em ' + Lic_brDiaHora_(em);
      if (status === 'failed') {
        var alt = '';
        if (Lic_up_(a.EMAIL_SITUACAO) !== 'ENVIADO') {
          var cfg = Lic_alertasCfg_(), l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, a.OPORTUNIDADE_ID), e = Lic_s_(a.EVENTO_ID) ? SGO_DATA.getById(LIC_ABAS.EVENTOS, a.EVENTO_ID) : null;
          if (cfg.canais.email !== false) {
            var r = Lic_alertaEmail_(a, Lic_alertaConteudo_(a, l, e, new Date()));
            var c2 = { EMAIL_SITUACAO: r.situacao, EMAIL_MOTIVO: r.motivo, EMAIL_EM: Lic_agora_(), CANAL_ALTERNATIVO: Lic_texto_('WhatsApp falhou no retorno da Meta: e-mail enviado como canal alternativo' + (r.situacao === 'ENVIADO' ? '.' : ', e também falhou (' + r.motivo + ').'), 300) };
            if (r.situacao !== 'ENVIADO' && !Lic_s_(a.CIENTE_EM)) { c2.SITUACAO = 'FALHOU'; c2.ESCALONAR_EM = Lic_agora_(); }
            SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, c2);
            alt = ' ' + c2.CANAL_ALTERNATIVO;
          }
        } else alt = ' O e-mail do alerta já tinha saído.';
        txt += alt;
      }
      Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_WHATSAPP_' + c.WA_SITUACAO, meta, { para: c.WA_SITUACAO, texto: txt, fonte: 'Webhook de status da Meta (' + status + ')' });
    });
    return n;
  } catch (e) { console.error('Licitações, retorno da Meta: ' + ((e && e.message) || e)); return 0; }
}

// ------------------------------------------------------------ conclusão e rodada
function Lic_alertasConcluir_(quando) {
  var agora = (quando instanceof Date ? quando : new Date()).toISOString(), n = 0;
  Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
    if (Lic_up_(a.SITUACAO) !== 'CIENTE' || !Lic_s_(a.ALVO_ISO) || Lic_s_(a.ALVO_ISO) > agora) return;
    SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CONCLUIDO', CONCLUIDO_EM: agora, ATUALIZADO_EM: agora }); n++;
  });
  return n;
}
/** Rodada completa (gatilho a cada 5 minutos, a qualquer hora). Cada passo em separado: uma falha não impede os outros. */
function Lic_alertasRodada_(quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var r = {};
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Licitações, alertas (' + nome + '): ' + r[nome].erro); } };
  try { Lic_garantirAbas_(); } catch (e) {}
  passo('agenda', function () { return Lic_agendaAtualizar_({ agora: quando, limite: 80 }); });
  passo('programar', function () { return Lic_alertasProgramar_(quando); });
  passo('escalonar', function () { return Lic_alertasEscalonar_(quando); });
  passo('enviar', function () { return Lic_alertasEnviar_(quando); });
  passo('concluir', function () { return Lic_alertasConcluir_(quando); });
  try { PropertiesService.getScriptProperties().setProperty('LIC_ALERTAS_ULTIMA_RODADA', JSON.stringify({ em: quando.toISOString(), r: r })); } catch (e) {}
  return r;
}
/** Gatilho (nome sem "_" para o agendador achar). Recusado quando chamado pelo navegador. */
function Licitacoes_rotinaAlertas() {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  return Lic_alertasRodada_(new Date());
}
function Lic_garantirRotinaAlertas_() {
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === LIC_FUNCAO_ROTINA; });
  if (tem) return 'já instalada';
  ScriptApp.newTrigger(LIC_FUNCAO_ROTINA).timeBased().everyMinutes(5).create();
  return 'instalada';
}
/** Confere o gatilho uma vez por dia, quando alguém da Diretoria abre Licitações. */
function Lic_garantirRotinaTalvez_() {
  try {
    var p = PropertiesService.getScriptProperties(), hoje = Lic_agora_().slice(0, 10);
    if (p.getProperty('LIC_ROTINA_CHECADA_EM') === hoje) return;
    Lic_garantirRotinaAlertas_();
    p.setProperty('LIC_ROTINA_CHECADA_EM', hoje);
  } catch (e) { console.error('Licitações, gatilho dos alertas: ' + ((e && e.message) || e)); }
}
function Lic_rotinaSituacao_() {
  var j = null;
  try { j = Lic_json_(PropertiesService.getScriptProperties().getProperty('LIC_ALERTAS_ULTIMA_RODADA'), null); } catch (e) { j = null; }
  if (!j || !j.em) return { rodou: false, texto: 'A rotina dos alertas (a cada 5 minutos) ainda não rodou neste ambiente.' };
  var parada = Date.now() - Date.parse(j.em) > 20 * 60000;
  return { rodou: true, em: j.em, parada: parada, texto: (parada ? 'A rotina dos alertas está parada: a última rodada foi em ' : 'Última rodada dos alertas: ') + Lic_brDiaHora_(j.em) + '.' + (parada ? ' Avise o responsável pelo sistema (o agendador do servidor pode ter parado).' : '') };
}

// ------------------------------------------------------------ leitura para as telas
function Lic_alertaParaTela_(a) {
  var s = Lic_up_(a.SITUACAO), wa = Lic_up_(a.WA_SITUACAO), em = Lic_up_(a.EMAIL_SITUACAO), enviado = !!Lic_s_(a.EMAIL_EM) || !!Lic_s_(a.WA_EM);
  var aceito = em === 'ENVIADO' || !!LIC_WA_ORDEM[wa], falha = s === 'FALHOU' || wa === 'FALHOU' || em === 'FALHOU';
  var estados = [
    { n: 1, nome: 'Criado', em: Lic_s_(a.CRIADO_EM), feito: true },
    { n: 2, nome: 'Enviado ao provedor', em: Lic_s_(a.WA_EM) || Lic_s_(a.EMAIL_EM), feito: enviado },
    { n: 3, nome: 'Aceito pelo provedor', em: Lic_s_(a.ENVIADO_EM), feito: aceito },
    { n: 4, nome: 'Entregue', em: Lic_s_(a.ENTREGUE_EM), feito: !!Lic_s_(a.ENTREGUE_EM), soMeta: true },
    { n: 5, nome: 'Lido', em: Lic_s_(a.LIDO_EM), feito: !!Lic_s_(a.LIDO_EM), soMeta: true },
    { n: 6, nome: 'Ciência', em: Lic_s_(a.CIENTE_EM), feito: !!Lic_s_(a.CIENTE_EM) },
    { n: 7, nome: 'Em atendimento', em: Lic_s_(a.ABERTO_EM), feito: !!Lic_s_(a.ABERTO_EM) },
    { n: 8, nome: 'Concluído', em: Lic_s_(a.CONCLUIDO_EM), feito: s === 'CONCLUIDO' }
  ];
  if (falha) estados.push({ n: 9, nome: 'Falha', em: Lic_s_(a.FALHOU_EM), feito: true, falha: true });
  if (Lic_s_(a.ESCALONADO_EM)) estados.push({ n: 10, nome: 'Escalonado', em: Lic_s_(a.ESCALONADO_EM), feito: true, escalado: true });
  return {
    id: Lic_s_(a.ID), avisoId: Lic_s_(a.AVISO_ID), opId: Lic_s_(a.OPORTUNIDADE_ID), codigo: Lic_s_(a.CODIGO), eventoId: Lic_s_(a.EVENTO_ID), eventoTipo: Lic_s_(a.EVENTO_TIPO), tipo: Lic_s_(a.TIPO), papel: Lic_s_(a.PAPEL),
    antecedencia: Lic_s_(a.ANTECEDENCIA), nivel: Lic_up_(a.NIVEL), nivelNome: LIC_NIVEIS[Lic_up_(a.NIVEL)] || '', pessoa: Lic_s_(a.USUARIO_NOME), pessoaId: Lic_s_(a.USUARIO_ID), titulo: Lic_s_(a.TITULO), texto: Lic_s_(a.TIPO) === 'MUDANCA' ? Lic_s_(a.TEXTO) : '',
    situacao: s, situacaoNome: LIC_ALERTA_SITUACOES[s] || s, liberarEm: Lic_s_(a.LIBERAR_EM), alvoIso: Lic_s_(a.ALVO_ISO), email: em, emailMotivo: Lic_s_(a.EMAIL_MOTIVO), whatsapp: wa,
    whatsappNome: wa ? LIC_WA_ROTULOS[wa] || wa : '', whatsappMotivo: Lic_s_(a.WA_MOTIVO), alternativo: Lic_s_(a.CANAL_ALTERNATIVO), cienteEm: Lic_s_(a.CIENTE_EM), cientePor: Lic_s_(a.CIENTE_POR_NOME),
    cienteCanal: LIC_CANAIS_CIENCIA[Lic_s_(a.CIENTE_CANAL).replace(/_OUTRO$/, '')] || Lic_s_(a.CIENTE_CANAL), cienteOutro: /_OUTRO$/.test(Lic_s_(a.CIENTE_CANAL)), escalonarEm: Lic_s_(a.ESCALONAR_EM),
    escalonadoEm: Lic_s_(a.ESCALONADO_EM), escalonadoPara: Lic_s_(a.ESCALONADO_PARA), canceladoMotivo: Lic_s_(a.CANCELADO_MOTIVO), estados: estados, criadoEm: Lic_s_(a.CRIADO_EM),
    podeCiente: !Lic_s_(a.CIENTE_EM) && ['ENVIADO', 'FALHOU', 'ESCALONADO'].indexOf(s) >= 0, podeReenviar: ['ENVIADO', 'FALHOU', 'ESCALONADO', 'CIENTE'].indexOf(s) >= 0
  };
}
function Lic_alertasDaOp_(opId) {
  return Lic_ler_(LIC_ABAS.ALERTAS).filter(function (a) { return Lic_s_(a.OPORTUNIDADE_ID) === Lic_s_(opId); }).map(Lic_alertaParaTela_)
    .sort(function (a, b) { return (a.liberarEm || a.criadoEm) < (b.liberarEm || b.criadoEm) ? -1 : 1; });
}
/** Resumo por prazo para a Agenda: { eventoId: { programados, enviados, semCiencia, ciente, proximo } }. */
function Lic_alertasPorEvento_() {
  var m = {};
  Lic_ler_(LIC_ABAS.ALERTAS).forEach(function (a) {
    var k = Lic_s_(a.EVENTO_ID); if (!k || Lic_s_(a.TIPO) !== 'PRAZO') return;
    var x = m[k] = m[k] || { programados: 0, enviados: 0, semCiencia: 0, ciente: '', proximo: '', cancelados: 0 }, s = Lic_up_(a.SITUACAO);
    if (s === 'PROGRAMADO') { x.programados++; if (!x.proximo || Lic_s_(a.LIBERAR_EM) < x.proximo) x.proximo = Lic_s_(a.LIBERAR_EM); }
    else if (s === 'CANCELADO' || s === 'PULADO') x.cancelados++;
    else { x.enviados++; if (!Lic_s_(a.CIENTE_EM) && s !== 'CONCLUIDO') x.semCiencia++; if (Lic_s_(a.CIENTE_EM)) x.ciente = Lic_s_(a.CIENTE_POR_NOME); }
  });
  Object.keys(m).forEach(function (k) { if (m[k].proximo) m[k].proximoTxt = Lic_brDiaHora_(m[k].proximo); });
  return m;
}
/** Alertas enviados e sem ciência cujo prazo ainda não passou (eu = null: de todos). */
function Lic_alertasSemCiencia_(eu) {
  var agora = Lic_agora_();
  return Lic_ler_(LIC_ABAS.ALERTAS).filter(function (a) {
    var s = Lic_up_(a.SITUACAO);
    if (['ENVIADO', 'FALHOU', 'ESCALONADO'].indexOf(s) < 0 || Lic_s_(a.CIENTE_EM)) return false;
    if (Lic_s_(a.ALVO_ISO) && Lic_s_(a.ALVO_ISO) < agora) return false;
    return !eu || Lic_s_(a.USUARIO_ID) === Lic_s_(eu.id);
  });
}
/**
 * Central de alertas: d = { filtro: semCiencia|programados|enviados|falhas|cancelados|todos, pessoa }. Contagens, a lista (até 200)
 * com os estados 1 a 10, a situação do modelo do WhatsApp, do retorno da Meta e da rotina.
 */
function Lic_alertasCentral_(eu, d) {
  d = d || {};
  var filtro = ['semCiencia', 'programados', 'enviados', 'falhas', 'cancelados', 'todos'].indexOf(Lic_s_(d.filtro)) >= 0 ? Lic_s_(d.filtro) : 'semCiencia';
  var agora = Lic_agora_(), todas = Lic_ler_(LIC_ABAS.ALERTAS), ops = {};
  Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var semC = function (a) { var s = Lic_up_(a.SITUACAO); return ['ENVIADO', 'FALHOU', 'ESCALONADO'].indexOf(s) >= 0 && !Lic_s_(a.CIENTE_EM) && !(Lic_s_(a.ALVO_ISO) && Lic_s_(a.ALVO_ISO) < agora); };
  var teste = { semCiencia: semC, programados: function (a) { return Lic_up_(a.SITUACAO) === 'PROGRAMADO'; }, enviados: function (a) { return ['ENVIADO', 'CIENTE', 'ESCALONADO', 'CONCLUIDO'].indexOf(Lic_up_(a.SITUACAO)) >= 0; },
    falhas: function (a) { return Lic_up_(a.SITUACAO) === 'FALHOU' || Lic_up_(a.WA_SITUACAO) === 'FALHOU' || Lic_up_(a.EMAIL_SITUACAO) === 'FALHOU' || !!Lic_s_(a.CANAL_ALTERNATIVO); },
    cancelados: function (a) { return Lic_up_(a.SITUACAO) === 'CANCELADO' || Lic_up_(a.SITUACAO) === 'PULADO'; }, todos: function () { return true; } };
  var cont = {}; Object.keys(teste).forEach(function (k) { cont[k] = todas.filter(teste[k]).length; });
  var lista = todas.filter(teste[filtro]).filter(function (a) { return !d.pessoa || Lic_s_(a.USUARIO_ID) === Lic_s_(d.pessoa); }).map(function (a) {
    var x = Lic_alertaParaTela_(a), l = ops[x.opId];
    x.orgao = l ? Lic_s_(l.ORGAO_NOME) : ''; x.local = l ? (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF) : '';
    return x;
  }).sort(function (a, b) { var ka = filtro === 'programados' ? a.liberarEm : a.criadoEm, kb = filtro === 'programados' ? b.liberarEm : b.criadoEm; return filtro === 'programados' ? (ka < kb ? -1 : 1) : (ka < kb ? 1 : -1); });
  var cfg = Lic_alertasCfg_();
  return { filtro: filtro, contagens: cont, total: lista.length, lista: lista.slice(0, 200), cortada: lista.length > 200, modelo: Lic_modeloWa_(), retorno: Lic_retornoMetaSituacao_(), rotina: Lic_rotinaSituacao_(),
    ligado: cfg.ligado, integrantes: Lic_integrantes_(cfg).map(function (u) { return u.nome; }), titular: cfg.titularId, euId: eu.id };
}
/** Link ?aviso=<código> de um alerta de licitação (depois do login): abre a ficha na aba Prazos e marca "em atendimento". */
function Lic_avisoAbrir_(s, avisoId) {
  var eu = { id: Lic_s_(s.userId), login: Lic_s_(s.usuario), perfil: Lic_up_(s.perfil) };
  if (!Lic_nivelDe_(eu).gestao) return { ok: false, tela: null, outraPessoa: true, message: 'Este link é de um alerta da Diretoria de Licitações. ' + LIC_MSG_SEM_ACESSO.charAt(0).toUpperCase() + LIC_MSG_SEM_ACESSO.slice(1) + '.' };
  var a = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.AVISO_ID) === Lic_s_(avisoId); })[0];
  if (!a) return { ok: false, tela: { tipo: 'modulo', mod: 'licitacoes_alertas' }, message: 'Não encontramos este alerta (o link pode ser de outro ambiente ou ter sido copiado pela metade). Abrimos a Central de alertas de Licitações.' };
  if (Lic_s_(a.USUARIO_ID) === eu.id && !Lic_s_(a.ABERTO_EM)) { try { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ABERTO_EM: Lic_agora_() }); } catch (e) {} }
  return { ok: true, tela: { tipo: 'licitacao', id: Lic_s_(a.OPORTUNIDADE_ID), aba: 'prazos', alerta: Lic_s_(a.ID) },
    message: Lic_s_(a.CIENTE_EM) ? '' : 'Confirme a ciência deste alerta na aba Prazos (botão "Ciente") ou pelo botão do WhatsApp.' };
}
