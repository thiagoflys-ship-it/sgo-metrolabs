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
 * ENVIO AGRUPADO (revisão de 03/11/2026, "muitos repetidos" na caixa do dono): na mesma rodada, os alertas devidos da MESMA
 * licitação para a MESMA pessoa (prazos, mudanças, lembretes e escalonamentos) saem num e-mail só e numa mensagem só de
 * WhatsApp, com a lista dos prazos e UM link de ciência que vale para todos (ENVIO_GRUPO = LG...). Cada alerta continua com a
 * sua linha, situação e histórico; só o envio é agrupado. O grupo sai no nível do mais grave (crítico, se houver um); o teto do
 * dia conta o grupo como uma mensagem e o grupo com crítico fica fora dele; o teto por alerta continua por alerta. O
 * escalonamento do grupo é um só (o tempo do nível mais grave): no máximo um lembrete por grupo e por pessoa. Os avisos de
 * documento de habilitação continuam um por mensagem.
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
  CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído', PULADO: 'Não enviado', NO_RESUMO: 'No resumo do dia (teto atingido)' };
/** Situações que esperam a ciência (faixa "sem ciência" e Central de alertas). NO_RESUMO: barrado pelo teto do dia, foi no resumo. */
var LIC_SITUACOES_SEM_CIENCIA = ['ENVIADO', 'FALHOU', 'ESCALONADO', 'NO_RESUMO'];
var LIC_WA_ROTULOS = { ACEITO: 'Aceito pela Meta', ENVIADO: 'Enviado (retorno da Meta)', ENTREGUE: 'Entregue (retorno da Meta)', LIDO: 'Lido (retorno da Meta)', FALHOU: 'WhatsApp falhou',
  AGUARDANDO_MODELO: 'WhatsApp aguardando aprovação do modelo na Meta', SEM_NUMERO: 'Sem celular no cadastro', RETIDO: 'Retido pelo piloto do WhatsApp', NAO_CONFIGURADO: 'WhatsApp não configurado',
  NAO_ENVIADO: 'WhatsApp não enviado' };
var LIC_WA_ORDEM = { ACEITO: 1, ENVIADO: 2, ENTREGUE: 3, LIDO: 4 };
var LIC_CANAIS_CIENCIA = { SGO_TELA: 'tela do SGO+', WHATSAPP_BOTAO: 'botão "Confirmar ciência" do WhatsApp', EMAIL_LINK: 'link do e-mail', WHATSAPP_RESPOSTA: 'resposta "ciente" no WhatsApp' };
var LIC_MUDANCAS_NOMES = { RETIFICACAO: 'Prazo alterado na fonte', REABERTURA: 'Licitação reaberta na fonte', SUSPENSAO: 'Licitação suspensa na fonte', REVOGACAO: 'Licitação revogada na fonte', ANULACAO: 'Licitação anulada na fonte' };
var LIC_ALERTAS_PADRAO = {
  ligado: true, alertarTravadas: false, foraDoExpediente: true, titularId: '',
  // revisão 02/11/2026: lista explícita de destinatários (vazia = padrão: Diretoria/Administrador com área Diretoria) e os tetos
  // duros de mensagens: por pessoa em cada alerta (o original, o reenvio e o escalonamento somados) e por pessoa no dia
  destinatarios: [], tetoPorAlerta: 3, tetoDia: 30,
  canais: { email: true, whatsapp: true },
  pessoas: {},
  escalonarMin: { NORMAL: 60, IMPORTANTE: 15, CRITICO: 5 },
  antecedencias: {
    LIMITE_PROPOSTA: [{ min: 10080, nivel: 'NORMAL' }, { min: 4320, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'CRITICO' }, { min: 60, nivel: 'CRITICO' }],
    SESSAO_PUBLICA: [{ min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }, { min: 60, nivel: 'CRITICO' }, { min: 30, nivel: 'CRITICO' }, { min: 10, nivel: 'CRITICO' }],
    PRAZO_IMPUGNACAO: [{ min: 2880, nivel: 'NORMAL' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }],
    PRAZO_ESCLARECIMENTO: [{ min: 2880, nivel: 'NORMAL' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'IMPORTANTE' }],
    PRAZO_RECURSO: [{ min: 2880, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'CRITICO' }],
    PRAZO_CONTRARRAZOES: [{ min: 2880, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'IMPORTANTE' }, { min: 240, nivel: 'CRITICO' }],
    ABERTURA_PROPOSTAS: [],
    // contratos (02/11/2026, SGO_Licitacoes_Contratos.js): o alvo é o limite interno do marco (09:00 do dia)
    CONTRATO_INICIO: [{ min: 10080, nivel: 'NORMAL' }, { min: 1440, nivel: 'IMPORTANTE' }],
    CONTRATO_ENTREGA: [{ min: 10080, nivel: 'NORMAL' }, { min: 2880, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'CRITICO' }],
    CONTRATO_OBRIGACAO: [{ min: 10080, nivel: 'NORMAL' }, { min: 2880, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'CRITICO' }],
    CONTRATO_REAJUSTE: [{ min: 43200, nivel: 'NORMAL' }, { min: 10080, nivel: 'IMPORTANTE' }],
    CONTRATO_GARANTIA: [{ min: 43200, nivel: 'IMPORTANTE' }, { min: 10080, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'CRITICO' }],
    CONTRATO_RENOVACAO: [{ min: 43200, nivel: 'IMPORTANTE' }, { min: 10080, nivel: 'IMPORTANTE' }, { min: 1440, nivel: 'CRITICO' }],
    CONTRATO_FIM: [{ min: 43200, nivel: 'IMPORTANTE' }, { min: 10080, nivel: 'CRITICO' }, { min: 1440, nivel: 'CRITICO' }]
  },
  mudancas: { RETIFICACAO: 'IMPORTANTE', REABERTURA: 'IMPORTANTE', SUSPENSAO: 'CRITICO', REVOGACAO: 'CRITICO', ANULACAO: 'CRITICO' }
};

// ------------------------------------------------------------ configuração (versão, motivo, merge)
function Lic_copia_(o) { return JSON.parse(JSON.stringify(o)); }
function Lic_alertasCfgLinha_() { return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === 'ALERTAS'; })[0] || null; }
/** Regras em vigor: padrão da missão + o que a Diretoria gravou (merge por campo; antecedências trocadas por tipo). */
function Lic_alertasCfg_() {
  var l = Lic_alertasCfgLinha_(), v = l ? Lic_json_(l.VALOR_JSON, {}) : {}, c = Lic_copia_(LIC_ALERTAS_PADRAO);
  ['ligado', 'alertarTravadas', 'titularId', 'tetoPorAlerta', 'tetoDia'].forEach(function (k) { if (v[k] !== undefined) c[k] = v[k]; });
  if (Array.isArray(v.destinatarios)) c.destinatarios = v.destinatarios.slice();
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
    if (c.destinatarios !== undefined) {
      var dl = (Array.isArray(c.destinatarios) ? c.destinatarios : []).map(Lic_s_).filter(Boolean), fora = dl.filter(function (x) { return ids.indexOf(x) < 0; });
      if (fora.length) throw new Error('Só a Diretoria de Licitações (perfis Diretoria e Administrador ativos) pode estar na lista de destinatários: ' + fora.join(', ') + ' não está. Nada foi alterado');
      var nomeDe = function (x) { return (resp.filter(function (u) { return u.id === x; })[0] || {}).nome || x; };
      poe('Lista de destinatários', (antes.destinatarios || []).map(nomeDe).join(', ') || 'padrão (área Diretoria)', dl.map(nomeDe).join(', ') || 'padrão (área Diretoria)'); novo.destinatarios = dl;
    }
    [['tetoPorAlerta', 'Teto de mensagens por pessoa em cada alerta', 1, 10], ['tetoDia', 'Teto de mensagens de licitação por pessoa no dia', 1, 200]].forEach(function (x) {
      if (c[x[0]] === undefined) return;
      var v = Math.round(Number(c[x[0]]));
      if (!isFinite(v) || v < x[2] || v > x[3]) throw new Error(x[1] + ': use de ' + x[2] + ' a ' + x[3] + '. Nada foi alterado');
      poe(x[1], antes[x[0]], v); novo[x[0]] = v;
    });
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
    if (efetivo.ligado !== false && resp.length && !Lic_integrantes_(efetivo).length) throw new Error('Não foi possível salvar: com os alertas ligados, pelo menos uma pessoa da Diretoria de Licitações precisa receber. Ligue "recebe alertas" para alguém ou desligue os alertas (com o motivo). Nada foi alterado');
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
  var c = Lic_alertasCfg_(), resp = Lic_responsaveis_(), contatos = {}, integ = Lic_integrantes_(c).map(function (u) { return u.id; });
  try { contatos = Notificar_contatos_(resp.map(function (u) { return u.id; })); } catch (e) { contatos = {}; }
  c.pessoasLista = resp.map(function (u) {
    var p = c.pessoas[u.id] || {}, k = contatos[u.id] || {};
    return { id: u.id, nome: u.nome, perfil: u.perfil, area: u.area, naLista: (c.destinatarios || []).indexOf(u.id) >= 0, padrao: u.area === 'DIRETORIA', integrante: integ.indexOf(u.id) >= 0, recebe: p.recebe !== false, email: p.email !== false, whatsapp: p.whatsapp !== false, temEmail: !!(k.email && k.email.indexOf('@') > 0), celular: Lic_mascarar_(k.telefone) };
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
/**
 * Diretoria de Licitações que recebe alertas agora. Revisão de 02/11/2026: com a lista explícita de destinatários das regras
 * (com versão e motivo) preenchida, vale só ela; vazia, o padrão é perfil Diretoria ou Administrador ativo E área Diretoria
 * (uma conta técnica de administrador, sem a área, não recebe WhatsApp de madrugada). Quem foi desligado nas regras sai.
 */
function Lic_integrantes_(cfg) {
  cfg = cfg || Lic_alertasCfg_();
  var lista = Array.isArray(cfg.destinatarios) ? cfg.destinatarios.map(Lic_s_).filter(Boolean) : [];
  return Lic_responsaveis_().filter(function (u) {
    if (lista.length ? lista.indexOf(u.id) < 0 : u.area !== 'DIRETORIA') return false;
    var p = cfg.pessoas[u.id]; return !p || p.recebe !== false;
  });
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
/**
 * Data em que os alertas foram implantados ('' = ainda não). Revisão de 02/11/2026: só a rodada grava a marca, e só quando a
 * agenda inteira já está montada (Lic_alertasMarcarImplantacao_). Antes disso, e para toda oportunidade que já existia antes
 * dela (pela data de chegada da fonte), aviso de antecedência já vencido nunca sai: salvar as regras ou abrir uma ficha antes
 * da primeira rodada não dispara atrasados.
 */
function Lic_alertasImplantadoEm_() { return Lic_s_(PropertiesService.getScriptProperties().getProperty('LIC_ALERTAS_IMPLANTADO_EM')); }
function Lic_alertasMarcarImplantacao_(agora) {
  var p = PropertiesService.getScriptProperties();
  if (!Lic_s_(p.getProperty('LIC_ALERTAS_IMPLANTADO_EM'))) p.setProperty('LIC_ALERTAS_IMPLANTADO_EM', agora);
  return Lic_s_(p.getProperty('LIC_ALERTAS_IMPLANTADO_EM'));
}
/** Chegada da oportunidade no SGO+ (primeira coleta da fonte; na falta, a criação da linha ou do prazo). */
/** Já houve aviso enviado (ou ciência) desta antecedência, para esta pessoa, numa versão anterior do mesmo prazo? */
function Lic_jaAvisado_(e, min, uid, porChave, evPorId) {
  var ant = evPorId[Lic_s_(e.SUBSTITUI_ID)], n = 0;
  while (ant && n++ < 30) {
    var x = porChave['P|' + Lic_s_(ant.ID) + '|' + min + '|' + uid];
    if (x && (Lic_s_(x.ENVIADO_EM) || Lic_s_(x.CIENTE_EM))) return true;
    ant = evPorId[Lic_s_(ant.SUBSTITUI_ID)];
  }
  return false;
}
/**
 * '' = o alerta ainda vale; senão o motivo: oportunidade sem alerta (descartada, sem termo, travada, fora da lista), prazo que
 * deixou de valer ou que já passou. Conferido na programação, no envio e no escalonamento (revisão de 02/11/2026).
 */
function Lic_alertaSemValer_(a, ops, evPorId, cfg, agoraMs) {
  // avisos dos documentos de habilitação (SGO_Licitacoes_Habilitacao.js): a regra é do documento (versão, faixa, sessão)
  if (Lic_s_(a.TIPO) === 'DOCUMENTO') return typeof LicH_alertaSemValer_ === 'function' ? LicH_alertaSemValer_(a, ops, cfg, agoraMs) : 'O cadastro de habilitação não está disponível neste ambiente.';
  var l = ops[Lic_s_(a.OPORTUNIDADE_ID)], m = Lic_opSemAlerta_(l, cfg);
  if (m) return 'Sem alerta: oportunidade ' + m + '.';
  if (Lic_s_(a.TIPO) === 'PRAZO') {
    var e = evPorId[Lic_s_(a.EVENTO_ID)];
    if (!e || Lic_up_(e.SITUACAO) !== 'ATIVO') return e ? (Lic_s_(e.MOTIVO_MUDANCA) || 'O prazo deixou de valer.') : 'O prazo não existe mais.';
  }
  if (Lic_s_(a.ALVO_ISO) && Date.parse(Lic_s_(a.ALVO_ISO)) <= agoraMs) return 'O prazo passou.';
  return '';
}
function Lic_chegadaDe_(l, e) { return Lic_s_(l && l.ALERTAVEL_DESDE) || Lic_s_(l && l.PRIMEIRA_COLETA_EM) || Lic_s_(l && l.CRIADO_EM) || Lic_s_(e && e.CRIADO_EM); }

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
  var soOps = o.opIds ? o.opIds.map(Lic_s_) : null, implantado = Lic_alertasImplantadoEm_();
  var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var eventos = Lic_ler_(LIC_ABAS.EVENTOS), evPorId = {}; eventos.forEach(function (e) { evPorId[Lic_s_(e.ID)] = e; });
  return Lic_comTrava_(function () {
    var linhas = Lic_ler_(LIC_ABAS.ALERTAS), porChave = {}, desejadas = {}, novos = [];
    linhas.forEach(function (a) { porChave[Lic_s_(a.CHAVE)] = a; });
    // revisão 02/11/2026: ALERTAVEL_DESDE = quando a oportunidade passou a poder ter alerta (candidata, em análise ou adiante);
    // é a referência para "existia antes da implantação" (uma coletada antes e triada candidata depois recebe o aviso mais recente)
    Object.keys(ops).forEach(function (k) {
      if (soOps && soOps.indexOf(k) < 0) return;
      var l = ops[k], pode = !Lic_opSemAlerta_(l, cfg), tem = Lic_s_(l.ALERTAVEL_DESDE);
      if (pode && !tem) { SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, { ALERTAVEL_DESDE: agora }); l.ALERTAVEL_DESDE = agora; }
      else if (!pode && tem) { SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, { ALERTAVEL_DESDE: '' }); l.ALERTAVEL_DESDE = ''; }
    });
    if (cfg.ligado) eventos.forEach(function (e) {
      if (soOps && soOps.indexOf(Lic_s_(e.OPORTUNIDADE_ID)) < 0) return;
      if (Lic_up_(e.SITUACAO) !== 'ATIVO' || Lic_up_(e.NATUREZA) === 'PREVISTO') return;
      var l = ops[Lic_s_(e.OPORTUNIDADE_ID)];
      if (!l || Lic_opSemAlerta_(l, cfg)) return;
      var alvo = Lic_s_(e.LIMITE_INTERNO_ISO) || Lic_s_(e.QUANDO_ISO), alvoMs = Date.parse(alvo);
      if (!isFinite(alvoMs) || alvoMs <= agoraMs) return;
      var ants = (cfg.antecedencias[Lic_s_(e.TIPO)] || []).slice().sort(function (a, b) { return b.min - a.min; });
      var passadas = ants.filter(function (a) { return alvoMs - a.min * 60000 <= agoraMs; }), recente = passadas.length ? passadas[passadas.length - 1] : null;
      var cheg = Lic_chegadaDe_(l, e), deAntes = !implantado || !cheg || cheg <= implantado;
      var tits = Lic_titulares_(l, cfg, integ), papel = tits.length > 1 ? 'TODOS' : 'TITULAR';
      tits.forEach(function (u) {
        ants.forEach(function (a) {
          var lib = alvoMs - a.min * 60000, ch = 'P|' + Lic_s_(e.ID) + '|' + a.min + '|' + u.id;
          if (lib <= agoraMs && (a !== recente || deAntes)) { if (porChave[ch]) desejadas[ch] = true; return; }   // antecedência já passada: não sai
          desejadas[ch] = true;
          if (porChave[ch]) return;
          // revisão 02/11/2026: versão nova do prazo (retificação, confirmação) herda o aviso já enviado e a ciência da mesma
          // antecedência para a mesma pessoa: o de 7 dias não sai de novo
          if (Lic_jaAvisado_(e, a.min, u.id, porChave, evPorId)) return;
          var x = { AVISO_ID: Lic_avisoId_(), CHAVE: ch, GRUPO: Lic_s_(e.ID) + '|' + a.min, OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), EVENTO_ID: Lic_s_(e.ID), EVENTO_TIPO: Lic_s_(e.TIPO),
            TIPO: 'PRAZO', PAPEL: papel, ANTECEDENCIA_MIN: a.min, ANTECEDENCIA: Lic_antecedenciaNome_(a.min), NIVEL: a.nivel, USUARIO_ID: u.id, USUARIO_NOME: u.nome, CANAIS: '',
            TITULO: '', TEXTO: '', ALVO_ISO: alvo, LIBERAR_EM: new Date(Math.max(lib, agoraMs)).toISOString(), SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, ATUALIZADO_EM: agora, CRIADO_EM: agora };
          novos.push(x); porChave[ch] = x; r.criados++;
        });
      });
    });
    // revisão 02/11/2026: oportunidade que não pode mais ter alerta (descartada, sem termo, travada) ou prazo que deixou de valer:
    // reenvio, escalonamento e mudança programados são cancelados e o escalonamento pendente dos já enviados é limpo
    linhas.forEach(function (a) {
      if (soOps && soOps.indexOf(Lic_s_(a.OPORTUNIDADE_ID)) < 0) return;
      var sem = Lic_alertaSemValer_(a, ops, evPorId, cfg, agoraMs), s0 = Lic_up_(a.SITUACAO);
      if (!sem) return;
      if (s0 === 'PROGRAMADO' && (Lic_s_(a.TIPO) !== 'PRAZO' || (Lic_s_(a.PAPEL) !== 'TITULAR' && Lic_s_(a.PAPEL) !== 'TODOS'))) {
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: Lic_texto_(sem, 500), ATUALIZADO_EM: agora }); r.cancelados++;
      } else if (['ENVIADO', 'FALHOU', 'ESCALONADO'].indexOf(s0) >= 0 && Lic_s_(a.ESCALONAR_EM)) {
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ESCALONAR_EM: '', CANCELADO_MOTIVO: Lic_texto_('Escalonamento cancelado: ' + sem, 500), ATUALIZADO_EM: agora });
      }
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
      // revisão 02/11/2026: um alerta de mudança só por oportunidade em cada atualização da agenda, com todas as mudanças juntas;
      // o tipo é o mais grave (anulação > revogação > suspensão > reabertura > retificação) e o nível, o maior entre elas
      var ordem = ['ANULACAO', 'REVOGACAO', 'SUSPENSAO', 'REABERTURA', 'RETIFICACAO'], pesoN = { NORMAL: 1, IMPORTANTE: 2, CRITICO: 3 };
      var tipoP = x.mudancas.map(function (m) { return m.tipo; }).sort(function (p1, p2) { return ordem.indexOf(p1) - ordem.indexOf(p2); })[0];
      var nivelP = x.mudancas.map(function (m) { return cfg.mudancas[m.tipo] || 'IMPORTANTE'; }).sort(function (n1, n2) { return pesoN[n2] - pesoN[n1]; })[0];
      var textos = []; x.mudancas.forEach(function (m) { if (textos.indexOf(m.texto) < 0) textos.push(m.texto); });
      var umEvento = x.mudancas.length === 1 ? x.mudancas[0] : {};
      [{ tipo: tipoP, nivel: nivelP, texto: textos.join(' | '), eventoId: umEvento.eventoId, eventoTipo: umEvento.eventoTipo }].forEach(function (m) {
        var nivel = m.nivel, para = nivel === 'CRITICO' ? integ : tit, h = Lic_hash_(m.tipo + '|' + m.texto).slice(0, 12);
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
  PRAZO_RECURSO: 'protocolar as razões de recurso no portal até o limite interno', PRAZO_CONTRARRAZOES: 'protocolar as contrarrazões no portal até o limite interno', ABERTURA_PROPOSTAS: 'conferir o edital: o recebimento das propostas começou',
  // contratos (02/11/2026)
  CONTRATO_INICIO: 'conferir a equipe e o planejamento: o contrato começa', CONTRATO_ENTREGA: 'conferir se a entrega do contrato está pronta e registrar no órgão',
  CONTRATO_OBRIGACAO: 'cumprir a obrigação do contrato até o prazo', CONTRATO_REAJUSTE: 'pedir o reajuste ao órgão (índice e cláusula no contrato)',
  CONTRATO_GARANTIA: 'renovar a garantia ou pedir a liberação ao órgão', CONTRATO_RENOVACAO: 'decidir se renova e, se sim, pedir o aditivo antes do fim',
  CONTRATO_FIM: 'decidir o aditivo de prorrogação ou preparar o encerramento'
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
  // revisão 02/11/2026: criado sob a trava e relido dentro dela (duas execuções ao mesmo tempo não geram dois segredos)
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    s = p.getProperty('LIC_CIENCIA_SEGREDO');
    if (!s) { s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); p.setProperty('LIC_CIENCIA_SEGREDO', s); }
    return s;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
function Lic_hex_(bytes) { return (bytes || []).map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
/** Token do link de ciência (sem login): canal w = botão do WhatsApp, e = link do e-mail. Vale só para aquele alerta (LA...) ou,
 * no envio agrupado, para todos os alertas daquele envio (LG..., revisão de 03/11/2026). */
function Lic_cienciaToken_(avisoId, canal) {
  var base = 'c1' + (canal === 'e' ? 'e' : 'w') + '.' + Lic_s_(avisoId);
  return base + '.' + Lic_hex_(Utilities.computeHmacSha256Signature(base, Lic_cienciaSegredo_())).slice(0, 24);
}
function Lic_linkCiencia_(avisoId, canal) {
  var base = (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '').replace(/\/(exec|dev)$/, '').replace(/\/+$/, '') || 'https://sgo.metrolabs.com.br';
  return base + '/?licciente=' + Lic_cienciaToken_(avisoId, canal);
}
/** Dados da licitação usados no texto do alerta (órgão, local, processo, objeto, responsável). */
function Lic_alertaCabecalho_(a, l) {
  var orgao = Lic_s_(l && l.ORGAO_NOME) || 'Órgão não informado', local = l ? (Lic_s_(l.MUNICIPIO) ? Lic_s_(l.MUNICIPIO) + '/' : '') + Lic_s_(l.UF) : '';
  return { orgao: orgao, local: local, processo: (Lic_s_(l && l.NUMERO_CONTROLE_PNCP) || Lic_s_(a.CODIGO)) + (l && Lic_s_(l.MODALIDADE) ? ' (' + Lic_s_(l.MODALIDADE) + ')' : ''),
    objeto: Lic_texto_(Lic_s_(l && l.OBJETO).replace(/\s+/g, ' '), 140), resp: l && Lic_s_(l.RESPONSAVEL_NOME) ? Lic_s_(l.RESPONSAVEL_NOME) : 'Diretoria de Licitações' };
}
/** Um prazo (ou mudança) do alerta: nome, quando, limite interno, tempo restante, natureza e fonte, ação (com o lembrete). */
function Lic_alertaItem_(a, l, e, agoraMs) {
  var mud = Lic_s_(a.TIPO) === 'MUDANCA', nivel = LIC_NIVEIS[Lic_up_(a.NIVEL)] || 'normal';
  var prazo = mud ? (Lic_s_(a.TITULO) || 'Mudança na licitação') : (e ? Lic_s_(e.NOME) : 'Prazo');
  var alvoMs = Date.parse(Lic_s_(a.ALVO_ISO)), quandoTxt = mud ? 'detectado em ' + Lic_brDiaHora_(a.CRIADO_EM) : (e ? Lic_eventoQuandoTxt_(e) : Lic_brDiaHora_(a.ALVO_ISO)) + ' (horário de Brasília' + (e && Lic_up_(e.FUSO_PRESUMIDO) === 'SIM' ? ', presumido' : '') + ')';
  var interno = !mud && e && Lic_s_(e.LIMITE_INTERNO_ISO) ? 'limite interno ' + Lic_brDiaHora_(e.LIMITE_INTERNO_ISO) : '';
  var restante = mud ? '-' : Lic_tempoRestante_(alvoMs - agoraMs) + (interno ? ' até o ' + interno : '');
  var acao = Lic_acaoAlerta_(a, l), esc = Lic_s_(a.PAPEL) === 'ESCALONAMENTO', reenvio = Lic_s_(a.PAPEL) === 'REENVIO';
  if (esc) acao = 'sem ciência de ' + Lic_s_(a.ESCALONADO_PARA || 'quem recebeu primeiro') + ': confirme a ciência e ' + acao;
  if (reenvio) acao = 'lembrete (sem ciência): ' + acao;
  var natureza = !mud && e ? (LIC_NATUREZAS[Lic_up_(e.NATUREZA)] || '') + ' · fonte: ' + Lic_s_(e.FONTE_REF) + (Lic_s_(e.REGRA) ? ' · ' + Lic_s_(e.REGRA) : '') : '';
  return { mud: mud, nivel: nivel, prazo: prazo, alvoMs: alvoMs, quandoTxt: quandoTxt, interno: interno, restante: restante, acao: acao, esc: esc, reenvio: reenvio, natureza: natureza };
}
/** Conteúdo do alerta: { titulo, texto (e-mail), params (os 9 do modelo do WhatsApp) }. */
function Lic_alertaConteudo_(a, l, e, quando) {
  if (Lic_s_(a.TIPO) === 'DOCUMENTO' && typeof LicH_alertaConteudo_ === 'function') return LicH_alertaConteudo_(a, l, quando);
  var agoraMs = (quando instanceof Date ? quando : new Date()).getTime(), cb = Lic_alertaCabecalho_(a, l), it = Lic_alertaItem_(a, l, e, agoraMs);
  var orgao = cb.orgao, local = cb.local, mud = it.mud, prazo = it.prazo, interno = it.interno;
  var titulo = (it.esc ? 'Sem ciência · ' : it.reenvio ? 'Lembrete · ' : '') + 'Licitação ' + Lic_s_(a.CODIGO) + ': ' + prazo + (mud ? '' : ' (' + Lic_tempoRestante_(it.alvoMs - agoraMs) + ')') + ' · ' + Lic_texto_(orgao, 60);
  var texto = ['METROLABS · ALERTA DE LICITAÇÃO (' + it.nivel + ')', '', 'Órgão: ' + orgao + (local ? ' (' + local + ')' : ''), 'Processo: ' + cb.processo, 'Objeto: ' + cb.objeto, (mud ? 'Mudança: ' : 'Prazo: ') + prazo,
    'Quando: ' + it.quandoTxt + (interno ? '; ' + interno : ''), 'Tempo restante: ' + it.restante, 'Responsável: ' + cb.resp, 'Ação necessária: ' + it.acao]
    .concat(mud ? ['', Lic_s_(a.TEXTO)] : it.natureza ? ['', 'Natureza do prazo: ' + it.natureza] : [])
    .concat(['', 'Confirmar ciência (registra que você viu este alerta; não conclui a tarefa): ' + Lic_linkCiencia_(a.AVISO_ID, 'e'), '', 'O botão abaixo abre a licitação no SGO+, com login. Alerta da Diretoria de Licitações: pode chegar fora do expediente (decisão do dono, 01/11/2026).']).join('\n');
  var params = [it.nivel, orgao + (local ? ' (' + local + ')' : ''), cb.processo, cb.objeto || '-', prazo, it.quandoTxt, it.restante, it.acao, Lic_linkAviso_(a.AVISO_ID) || '@LINK'];
  return { titulo: titulo, texto: texto, params: params };
}

/** Nome curto de cada prazo para o resumo do WhatsApp ({{5}}: "3 prazos: impugnação, esclarecimento e fim das propostas"). */
var LIC_NOMES_CURTOS = { LIMITE_PROPOSTA: 'fim das propostas', SESSAO_PUBLICA: 'sessão pública', PRAZO_IMPUGNACAO: 'impugnação', PRAZO_ESCLARECIMENTO: 'esclarecimento',
  PRAZO_RECURSO: 'razões de recurso', PRAZO_CONTRARRAZOES: 'contrarrazões', ABERTURA_PROPOSTAS: 'início das propostas', CONTRATO_INICIO: 'início do contrato', CONTRATO_ENTREGA: 'entrega do contrato',
  CONTRATO_OBRIGACAO: 'obrigação do contrato', CONTRATO_REAJUSTE: 'reajuste do contrato', CONTRATO_GARANTIA: 'garantia do contrato', CONTRATO_RENOVACAO: 'renovação do contrato', CONTRATO_FIM: 'fim do contrato' };
var LIC_PESO_NIVEL = { NORMAL: 1, IMPORTANTE: 2, CRITICO: 3 };
function Lic_listaE_(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]; }
/** Nível do grupo: o mais grave entre os alertas (crítico, se houver um). */
function Lic_nivelGrupo_(linhas) { return linhas.map(function (a) { return Lic_up_(a.NIVEL); }).sort(function (n1, n2) { return (LIC_PESO_NIVEL[n2] || 0) - (LIC_PESO_NIVEL[n1] || 0); })[0] || 'NORMAL'; }
/** Ordem dos itens no envio agrupado: mudanças primeiro, depois os prazos do mais próximo ao mais distante. */
function Lic_ordemGrupo_(linhas) {
  return linhas.slice().sort(function (x, y) {
    var ax = Date.parse(Lic_s_(x.ALVO_ISO)), ay = Date.parse(Lic_s_(y.ALVO_ISO));
    ax = isFinite(ax) ? ax : -Infinity; ay = isFinite(ay) ? ay : -Infinity;
    return ax === ay ? (LIC_PESO_NIVEL[Lic_up_(y.NIVEL)] || 0) - (LIC_PESO_NIVEL[Lic_up_(x.NIVEL)] || 0) : ax - ay;
  });
}
/** "3 prazos: impugnação, esclarecimento e fim das propostas" (ou "2 alertas: ..." quando há mudança na lista). */
function Lic_resumoGrupo_(linhas, curto, evs) {
  var todosPrazo = linhas.every(function (a) { return Lic_s_(a.TIPO) === 'PRAZO'; }), nomes = [];
  Lic_ordemGrupo_(linhas).forEach(function (a) {
    var n = Lic_s_(a.TIPO) === 'MUDANCA' ? (Lic_s_(a.TITULO) || 'mudança na licitação').toLowerCase() : curto ? (LIC_NOMES_CURTOS[Lic_s_(a.EVENTO_TIPO)] || Lic_s_(a.EVENTO_TIPO).toLowerCase()) : Lic_s_((evs[Lic_s_(a.EVENTO_ID)] || {}).NOME) || LIC_NOMES_CURTOS[Lic_s_(a.EVENTO_TIPO)] || 'prazo';
    if (nomes.indexOf(n) < 0) nomes.push(n);
  });
  // revisão de 03/11/2026: com 4 ou mais tipos, o resumo fica curto (os 3 primeiros e "outros N"); a lista toda vai no e-mail
  var lista = nomes.length >= 4 ? nomes.slice(0, 3).join(', ') + ' e outros ' + (nomes.length - 3) : Lic_listaE_(nomes);
  return { rotulo: linhas.length + (todosPrazo ? ' prazos' : ' alertas'), texto: linhas.length + (todosPrazo ? ' prazos: ' : ' alertas: ') + lista, todosPrazo: todosPrazo };
}
/**
 * Conteúdo do envio agrupado (mesma licitação, mesma pessoa, mesma rodada): { titulo, texto, params, refId, botao, link }.
 * O e-mail diz no começo quantos prazos e o mais urgente; cada item tem natureza, data e hora, limite interno, fonte e ação.
 * O WhatsApp usa o mesmo modelo (9 variáveis): {{5}} o resumo, {{6}} e {{7}} o prazo mais próximo, {{8}} a ação dele.
 */
function Lic_alertaConteudoGrupo_(linhas, l, evs, quando, envioId) {
  var agoraMs = (quando instanceof Date ? quando : new Date()).getTime(), ord = Lic_ordemGrupo_(linhas), a0 = ord[0], cb = Lic_alertaCabecalho_(a0, l);
  var itens = ord.map(function (a) { var e = evs[Lic_s_(a.EVENTO_ID)] || null, it = Lic_alertaItem_(a, l, e, agoraMs); it.linha = a; return it; });
  var comPrazo = itens.filter(function (it) { return !it.mud && isFinite(it.alvoMs); }), urg = comPrazo[0] || itens[0];
  var rs = Lic_resumoGrupo_(linhas, false, evs), rc = Lic_resumoGrupo_(linhas, true, evs);
  var nivelG = LIC_NIVEIS[Lic_nivelGrupo_(linhas)] || 'normal';
  var todosEsc = itens.every(function (it) { return it.esc; }), todosLemb = itens.every(function (it) { return it.esc || it.reenvio; });
  var janela = '';
  if (comPrazo.length) {
    var maxMs = Math.max.apply(null, comPrazo.map(function (it) { return it.alvoMs; })) - agoraMs, h = Math.max(1, Math.ceil(maxMs / 36e5));
    janela = h <= 48 ? (h === 1 ? ' na próxima hora' : ' nas próximas ' + h + ' h') : ' nos próximos ' + Math.ceil(maxMs / 864e5) + ' dias';
  }
  var titulo = (todosEsc ? 'Sem ciência · ' : todosLemb ? 'Lembrete · ' : '') + 'Licitação ' + Lic_s_(a0.CODIGO) + ': ' + rs.rotulo + janela + ' · ' + Lic_texto_(cb.orgao, 60);
  var abre = rs.rotulo.charAt(0).toUpperCase() + rs.rotulo.slice(1) + ' desta licitação nesta mensagem. ' + (urg.mud ? 'Primeiro: ' + urg.prazo + ' (' + urg.quandoTxt + ').' : 'O mais urgente: ' + urg.prazo + ', ' + urg.quandoTxt + ' (faltam ' + urg.restante + ').');
  var texto = ['METROLABS · ALERTAS DE LICITAÇÃO (' + nivelG + ')', '', abre]
    .concat(todosEsc ? ['Sem ciência de quem recebeu primeiro: confirme a ciência.'] : todosLemb ? ['Lembrete: a ciência ainda não foi registrada.'] : [])
    .concat(['', 'Órgão: ' + cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), 'Processo: ' + cb.processo, 'Objeto: ' + cb.objeto, 'Responsável: ' + cb.resp, '', rs.todosPrazo ? 'Prazos:' : 'Alertas:']);
  itens.forEach(function (it, i) {
    texto.push((i + 1) + '. ' + it.prazo + ' (' + it.nivel + ')');
    if (it.mud) { texto.push('   ' + it.quandoTxt.charAt(0).toUpperCase() + it.quandoTxt.slice(1)); if (Lic_s_(it.linha.TEXTO)) texto.push('   ' + Lic_texto_(Lic_s_(it.linha.TEXTO).replace(/\s+/g, ' '), 600)); }
    else {
      texto.push('   Quando: ' + it.quandoTxt + (it.interno ? '; ' + it.interno : ''));
      texto.push('   Tempo restante: ' + it.restante);
      if (it.natureza) texto.push('   Natureza: ' + it.natureza);
    }
    texto.push('   Ação: ' + it.acao);
  });
  texto = texto.concat(['', 'Confirmar ciência ' + (linhas.length === 2 ? 'dos 2' : 'de todos os ' + linhas.length) + (rs.todosPrazo ? ' prazos' : ' alertas') + ' (um clique registra a ciência de todos; não conclui as tarefas): ' + Lic_linkCiencia_(envioId, 'e'), '',
    'O botão abaixo abre a licitação no SGO+, com login. Alerta da Diretoria de Licitações: pode chegar fora do expediente (decisão do dono, 01/11/2026).']).join('\n');
  var link = Lic_linkAviso_(a0.AVISO_ID) || '@LINK', mais = itens.length - 1;
  // o sufixo "(e mais N itens ...)" nunca é cortado: a ação é que cabe no que sobra dos 200 caracteres
  var suf = mais ? ' (e ' + (mais === 1 ? 'mais 1 item' : 'mais ' + mais + ' itens') + ' no e-mail e no SGO+)' : '', acao8 = Lic_texto_(urg.acao, 200 - suf.length) + suf;
  var params = [nivelG, cb.orgao + (cb.local ? ' (' + cb.local + ')' : ''), cb.processo, cb.objeto || '-', rc.texto, urg.quandoTxt, urg.restante, acao8, link];
  return { titulo: titulo, texto: texto, params: params, refId: envioId, botao: Lic_cienciaToken_(envioId, 'w'), link: Lic_linkAviso_(a0.AVISO_ID) || '' };
}

// ------------------------------------------------------------ envio
function Lic_canaisDe_(a, cfg) {
  var forc = Lic_s_(a.CANAIS);
  var p = cfg.pessoas[Lic_s_(a.USUARIO_ID)] || {};
  var c = forc ? forc.split(',').map(Lic_s_).filter(Boolean) : (function () { var x = []; if (p.email !== false) x.push('email'); if (p.whatsapp !== false) x.push('whatsapp'); return x; })();
  // avisos de documento de habilitação (SGO_Licitacoes_Habilitacao.js): a preferência da pessoa vale também no canal forçado
  if (Lic_s_(a.TIPO) === 'DOCUMENTO') c = c.filter(function (k) { return p[k] !== false; });
  return c.filter(function (k) { return cfg.canais[k] !== false; });
}
/** E-mail do alerta (ct.refId e ct.link: os do envio agrupado). { situacao: ENVIADO|SEM_EMAIL|FALHOU, motivo }. */
function Lic_alertaEmail_(a, ct) {
  try {
    var r = SGO_notificar_({ usuarios: [Lic_s_(a.USUARIO_ID)], canais: ['email'], origem: 'LICITACOES', refId: ct.refId || (Lic_s_(a.AVISO_ID) + '-' + (Number(a.TENTATIVAS) || 0)), titulo: ct.titulo, texto: ct.texto,
      link: (ct.refId ? ct.link : Lic_linkAviso_(a.AVISO_ID)) || undefined, rotuloLink: 'Abrir a licitação no SGO+' }) || {};
    if (r.ok) return { situacao: 'ENVIADO', motivo: 'Entregue ao serviço de e-mail do SGO+ (sistema@metrolabs.com.br).' };
    return { situacao: /Sem e-mail no cadastro/i.test(Lic_s_(r.motivo)) ? 'SEM_EMAIL' : 'FALHOU', motivo: Lic_texto_(r.motivo || 'O e-mail não saiu.', 300) };
  } catch (e) { return { situacao: 'FALHOU', motivo: Lic_texto_((e && e.message) || e, 300) }; }
}
/** WhatsApp oficial (Meta) pelo modelo sgo_licitacao_prazo (ct.botao: o token de ciência do envio agrupado). { situacao: ACEITO|AGUARDANDO_MODELO|SEM_NUMERO|RETIDO|NAO_CONFIGURADO|FALHOU|NAO_ENVIADO, motivo, id }. */
function Lic_alertaWhatsapp_(a, ct) {
  try {
    var uid = Lic_s_(a.USUARIO_ID), c = typeof Notificar_contatos_ === 'function' ? Notificar_contatos_([uid])[uid] : null;
    var prov = typeof Notificar_provedorWhatsapp_ === 'function' ? Notificar_provedorWhatsapp_() : { provedor: '' };
    var mod = Lic_modeloWa_();
    if (!c || !c.telefone) return { situacao: 'SEM_NUMERO', motivo: 'Sem celular válido no cadastro (Administração › Usuários › Celular): o alerta foi pelo SGO+ e pelo e-mail.' };
    if (!prov.provedor) return { situacao: 'NAO_CONFIGURADO', motivo: Lic_texto_(prov.motivo || 'WhatsApp não configurado.', 260) };
    if (prov.provedor !== 'meta') return { situacao: 'NAO_CONFIGURADO', motivo: 'Licitações usa só o WhatsApp oficial (Meta); o provedor em uso não é o oficial. Nenhuma mensagem saiu por ele.' };
    if (!mod.aprovado) return { situacao: 'AGUARDANDO_MODELO', motivo: mod.texto };
    var r = SGO_notificar_({ usuarios: [uid], canais: ['whatsapp'], origem: 'LICITACOES', refId: ct.refId || (Lic_s_(a.AVISO_ID) + '-' + (Number(a.TENTATIVAS) || 0)), titulo: ct.titulo, texto: ct.texto,
      link: (ct.refId ? ct.link : Lic_linkAviso_(a.AVISO_ID)) || undefined, soMeta: true, modeloSemReserva: true, modelo: { nome: LIC_MODELO_WA, parametros: ct.params, botao: ct.botao || Lic_cienciaToken_(a.AVISO_ID, 'w') } }) || {};
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
  var tent = Number(a.TENTATIVAS) || 1;   // já contada ao marcar ENVIANDO (a chave do envio é AVISO_ID-tentativa)
  var ct = Lic_alertaConteudo_(a, l, e, quando), canais = Lic_canaisDe_(a, cfg), em = null, wa = null, alt = '';
  if (canais.indexOf('email') >= 0) em = Lic_alertaEmail_(a, ct);
  if (canais.indexOf('whatsapp') >= 0) wa = Lic_alertaWhatsapp_(a, ct);
  var emOk = em && em.situacao === 'ENVIADO', waOk = wa && wa.situacao === 'ACEITO';
  // canal alternativo: o escolhido não saiu -> o outro (se não estiver desligado para todos)
  // aviso de documento: o canal alternativo respeita a pessoa, e o de 30/15 dias (CANAIS "email") nunca cai para o WhatsApp
  var doc = Lic_s_(a.TIPO) === 'DOCUMENTO', pp = cfg.pessoas[Lic_s_(a.USUARIO_ID)] || {};
  var altEmail = cfg.canais.email !== false && !(doc && pp.email === false), altWa = cfg.canais.whatsapp !== false && !(doc && (pp.whatsapp === false || Lic_s_(a.CANAIS) === 'email'));
  if (!emOk && !waOk) {
    if (!em && altEmail) { em = Lic_alertaEmail_(a, ct); emOk = em.situacao === 'ENVIADO'; alt = 'WhatsApp não saiu (' + (wa ? LIC_WA_ROTULOS[wa.situacao] || wa.situacao : 'sem canal') + '): e-mail enviado como canal alternativo' + (emOk ? '' : ', e também falhou') + '.'; }
    else if (!wa && altWa) { wa = Lic_alertaWhatsapp_(a, ct); waOk = wa.situacao === 'ACEITO'; alt = 'E-mail não saiu (' + (em ? em.motivo : 'sem canal') + '): WhatsApp tentado como canal alternativo' + (waOk ? '' : ', e também não saiu') + '.'; }
  }
  var chegou = emOk || waOk, papel = Lic_s_(a.PAPEL), escalona = papel === 'TITULAR' || papel === 'TODOS';
  // aviso de documento sem nenhum canal permitido para a pessoa: fica só no SGO+ (Central de alertas), sem falha
  if (doc && !em && !wa) { chegou = true; alt = 'Só no SGO+: a pessoa desligou os canais deste aviso nas regras dos alertas.'; }
  var campos = { TITULO: Lic_texto_(ct.titulo, 300), TEXTO: Lic_s_(a.TIPO) === 'MUDANCA' || Lic_s_(a.TIPO) === 'DOCUMENTO' ? Lic_s_(a.TEXTO) : Lic_texto_(ct.texto, 3000), TENTATIVAS: tent, INTERNO_EM: Lic_s_(a.INTERNO_EM) || agora,
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
 * Envio agrupado (revisão de 03/11/2026): os alertas da mesma licitação para a mesma pessoa nesta rodada saem numa mensagem só
 * por canal (os canais de todos somados; o alternativo se nenhum chegou), com um link de ciência que vale para todos. Cada linha
 * fica com a própria situação, os canais, o código do envio (ENVIO_GRUPO) e o seu histórico. O escalonamento do grupo é um só,
 * no tempo do nível mais grave (no máximo um lembrete por grupo e por pessoa). Nunca lança.
 */
function Lic_alertaEnviarGrupo_(linhas, quando, cfg, ops, evs) {
  var agora = quando.toISOString(), a0 = linhas[0], l = ops[Lic_s_(a0.OPORTUNIDADE_ID)], envioId = Lic_s_(a0.ENVIO_GRUPO);
  var ct = Lic_alertaConteudoGrupo_(linhas, l, evs, quando, envioId), canais = [], em = null, wa = null, alt = '';
  linhas.forEach(function (a) { Lic_canaisDe_(a, cfg).forEach(function (k) { if (canais.indexOf(k) < 0) canais.push(k); }); });
  if (canais.indexOf('email') >= 0) em = Lic_alertaEmail_(a0, ct);
  if (canais.indexOf('whatsapp') >= 0) wa = Lic_alertaWhatsapp_(a0, ct);
  var emOk = em && em.situacao === 'ENVIADO', waOk = wa && wa.situacao === 'ACEITO';
  if (!emOk && !waOk) {
    if (!em && cfg.canais.email !== false) { em = Lic_alertaEmail_(a0, ct); emOk = em.situacao === 'ENVIADO'; alt = 'WhatsApp não saiu (' + (wa ? LIC_WA_ROTULOS[wa.situacao] || wa.situacao : 'sem canal') + '): e-mail enviado como canal alternativo' + (emOk ? '' : ', e também falhou') + '.'; }
    else if (!wa && cfg.canais.whatsapp !== false) { wa = Lic_alertaWhatsapp_(a0, ct); waOk = wa.situacao === 'ACEITO'; alt = 'E-mail não saiu (' + (em ? em.motivo : 'sem canal') + '): WhatsApp tentado como canal alternativo' + (waOk ? '' : ', e também não saiu') + '.'; }
  }
  var chegou = !!(emOk || waOk), escMin = Math.min.apply(null, linhas.map(function (a) { return Number(cfg.escalonarMin[Lic_up_(a.NIVEL)]) || 60; }));
  var resumo = 'interno: registrado na Central de alertas' + (em ? '; e-mail: ' + (em.situacao === 'ENVIADO' ? 'entregue ao serviço de e-mail' : em.motivo) : '') + (wa ? '; WhatsApp: ' + (LIC_WA_ROTULOS[wa.situacao] || wa.situacao) + (wa.situacao === 'ACEITO' ? '' : ' (' + wa.motivo + ')') : '') + (alt ? '; ' + alt : '');
  var juntos = 'numa mensagem só com ' + (linhas.length - 1) + (linhas.length === 2 ? ' outro alerta' : ' outros alertas') + ' da mesma licitação (envio ' + envioId + '; assunto: ' + ct.titulo + ')';
  linhas.forEach(function (a) {
    // revisão de 03/11/2026: linha cancelada (ou com ciência) durante o envio fica como está; grava só a que ainda está "Enviando"
    var atual = SGO_DATA.getById(LIC_ABAS.ALERTAS, a.ID);
    if (atual && Lic_up_(atual.SITUACAO) !== 'ENVIANDO') return;
    var e = evs[Lic_s_(a.EVENTO_ID)] || null, cA = Lic_alertaConteudo_(a, l, e, quando), papel = Lic_s_(a.PAPEL), escalona = papel === 'TITULAR' || papel === 'TODOS';
    var campos = { TITULO: Lic_texto_(cA.titulo, 300), TEXTO: Lic_s_(a.TIPO) === 'MUDANCA' ? Lic_s_(a.TEXTO) : Lic_texto_(cA.texto, 3000), TENTATIVAS: Number(a.TENTATIVAS) || 1, INTERNO_EM: Lic_s_(a.INTERNO_EM) || agora,
      ENVIADO_EM: chegou ? agora : Lic_s_(a.ENVIADO_EM), SITUACAO: chegou ? 'ENVIADO' : 'FALHOU', CANAL_ALTERNATIVO: Lic_texto_(alt, 300), ENVIO_GRUPO: envioId, ATUALIZADO_EM: agora };
    if (em) { campos.EMAIL_SITUACAO = em.situacao; campos.EMAIL_MOTIVO = em.motivo; campos.EMAIL_EM = agora; }
    if (wa) { campos.WA_SITUACAO = wa.situacao; campos.WA_MOTIVO = wa.motivo; campos.WA_ID = wa.id || ''; campos.WA_EM = agora; if (wa.situacao === 'FALHOU') campos.FALHOU_EM = agora; }
    if (!chegou) campos.FALHOU_EM = agora;
    if (escalona && !Lic_s_(a.CIENTE_EM)) campos.ESCALONAR_EM = chegou ? Lic_maisMin_(quando, escMin) : agora;
    SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, campos);
    Object.keys(campos).forEach(function (k) { a[k] = campos[k]; });
    Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, chegou ? 'ALERTA_ENVIADO' : 'ALERTA_FALHOU', { id: '', nome: 'Alertas de licitação (sistema)' },
      { para: Lic_s_(a.USUARIO_NOME), texto: Lic_s_(a.AVISO_ID) + ' · ' + cA.titulo + ' · ' + LIC_NIVEIS[Lic_up_(a.NIVEL)] + ' · ' + juntos + ' · ' + resumo, fonte: 'Alertas (' + (papel === 'ESCALONAMENTO' ? 'escalonamento' : papel === 'REENVIO' ? 'reenvio por outro canal' : 'antecedência ' + Lic_s_(a.ANTECEDENCIA)) + ', envio agrupado)' });
  });
  return { chegou: chegou, email: em, whatsapp: wa };
}
/** Chave do envio agrupado: mesma licitação e mesma pessoa. Aviso de documento de habilitação: um por mensagem (a própria linha). */
function Lic_chaveEnvio_(a) { return Lic_s_(a.TIPO) === 'DOCUMENTO' || !Lic_s_(a.OPORTUNIDADE_ID) ? 'D|' + Lic_s_(a.ID) : 'G|' + Lic_s_(a.OPORTUNIDADE_ID) + '|' + Lic_s_(a.USUARIO_ID); }
function Lic_envioId_() { return 'LG' + (Utilities.getUuid() + Utilities.getUuid()).replace(/[^0-9a-f]/gi, '').toLowerCase().slice(0, 10); }

/**
 * Envia o que está pronto. Sem envio em dobro: a escolha fica sob a trava e cada linha passa a ENVIANDO antes de sair (ENVIANDO há
 * mais de 10 minutos volta). Do mesmo prazo e pessoa, se mais de uma antecedência venceu junto (rotina parada), sai só a mais
 * recente. Prazo que passou antes do envio: cancelado com o motivo. Pessoa que saiu da Diretoria de Licitações: cancelado.
 * Revisão de 03/11/2026: o que sobra da mesma licitação para a mesma pessoa sai junto (Lic_alertaEnviarGrupo_); o teto do dia
 * conta cada envio (agrupado ou não) como uma mensagem, e o grupo que tem um crítico fica fora dele.
 */
function Lic_alertasEnviar_(quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), agoraMs = quando.getTime(), velho = Lic_menosMin_(quando, LIC_ENVIANDO_MAX_MIN), res = { enviados: 0, falhas: 0, pulados: 0, teto: 0 };
  if (!cfg.ligado) return { desligado: true };
  var integ = {}; Lic_integrantes_(cfg).forEach(function (u) { integ[u.id] = u; });
  var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
  var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) { evs[Lic_s_(e.ID)] = e; });
  // revisão 02/11/2026: sem a trava, nada é enviado (antes seguia sem trava se o serviço de trava falhasse)
  var lote = [], lock = null, finais = [], envios = [];
  try { lock = LockService.getScriptLock(); } catch (e) { return { ocupado: 'trava indisponível agora; os alertas saem na próxima rodada' }; }
  if (!lock || !lock.tryLock(10000)) return { ocupado: 'outro envio de alertas de licitação em andamento; sai na próxima rodada' };
  try {
    var todas = Lic_ler_(LIC_ABAS.ALERTAS), hoje = Lic_diaSp_(agora), tetoA = Number(cfg.tetoPorAlerta) || 3, tetoD = Number(cfg.tetoDia) || 30;
    var porGrupo = {}, porDia = {}, vistoDia = {}, saiu = function (a) { return !!(Lic_s_(a.WA_EM) || Lic_s_(a.EMAIL_EM)); };
    todas.forEach(function (a) {
      if (!saiu(a)) return;
      var kg = Lic_s_(a.GRUPO) + '|' + Lic_s_(a.USUARIO_ID); porGrupo[kg] = (porGrupo[kg] || 0) + 1;
      var kd0 = Lic_s_(a.USUARIO_ID) + (Lic_s_(a.TIPO) === 'DOCUMENTO' ? '|D' : '');   // avisos de documento: teto próprio
      // revisão 03/11/2026: o envio agrupado conta uma vez só no teto do dia (as linhas dele têm o mesmo ENVIO_GRUPO)
      var msg = kd0 + '|' + (Lic_s_(a.ENVIO_GRUPO) || Lic_s_(a.ID));
      if (Lic_diaSp_(Lic_s_(a.WA_EM) || Lic_s_(a.EMAIL_EM)) === hoje && !vistoDia[msg]) { vistoDia[msg] = true; porDia[kd0] = (porDia[kd0] || 0) + 1; }
    });
    // ENVIANDO só é abandonado se não há outro envio em curso (ou se o "em curso" também está parado há mais de 10 minutos)
    var emCurso = Lic_s_(PropertiesService.getScriptProperties().getProperty('LIC_ENVIO_EM_CURSO')), cursoVivo = !!emCurso && emCurso >= velho;
    var prontas = todas.filter(function (a) { var s = Lic_up_(a.SITUACAO); return (s === 'PROGRAMADO' && Lic_s_(a.LIBERAR_EM) <= agora) || (s === 'ENVIANDO' && !cursoVivo && Lic_s_(a.ENVIANDO_EM) < velho); });
    var maisRecente = {};
    var ehTitular = function (a) { return Lic_s_(a.TIPO) === 'PRAZO' && (Lic_s_(a.PAPEL) === 'TITULAR' || Lic_s_(a.PAPEL) === 'TODOS'); };
    prontas.forEach(function (a) { if (!ehTitular(a)) return; var k = Lic_s_(a.EVENTO_ID) + '|' + Lic_s_(a.USUARIO_ID); if (!maisRecente[k] || Number(a.ANTECEDENCIA_MIN) < Number(maisRecente[k].ANTECEDENCIA_MIN)) maisRecente[k] = a; });
    var enviosOk = null, resumos = {}, validas = [];
    // 1ª passada: o que não vale mais é cancelado; o ENVIANDO abandonado que já tinha saído é só fechado
    prontas.forEach(function (a) {
      var mot = '', uid = Lic_s_(a.USUARIO_ID);
      if (!integ[uid]) mot = 'A pessoa não recebe mais alertas de licitação (saiu da Diretoria de Licitações ou foi desligada nas regras).';
      else mot = Lic_alertaSemValer_(a, ops, evs, cfg, agoraMs);
      if (mot) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: Lic_texto_(mot, 500), ESCALONAR_EM: '', ATUALIZADO_EM: agora }); res.pulados++; return; }
      if (ehTitular(a) && maisRecente[Lic_s_(a.EVENTO_ID) + '|' + uid] !== a) {
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'PULADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: 'Venceu junto com um aviso mais recente do mesmo prazo: saiu só o mais recente.', ATUALIZADO_EM: agora }); res.pulados++; return;
      }
      // ENVIANDO abandonado (a execução caiu): se o registro do notificador mostra que a tentativa saiu, não envia de novo
      // (no envio agrupado a chave é o código do envio, ENVIO_GRUPO)
      if (Lic_up_(a.SITUACAO) === 'ENVIANDO') {
        if (enviosOk === null) { enviosOk = {}; Lic_ler_(typeof Notificar_aba_ === 'function' ? Notificar_aba_() : 'NTF_ENVIOS').forEach(function (n) { if (Lic_up_(n.SITUACAO) === 'OK' && Lic_up_(n.ORIGEM) === 'LICITACOES') enviosOk[Lic_s_(n.REF_ID)] = Lic_s_(n.CANAL).toLowerCase(); }); }
        var ref = Lic_s_(a.ENVIO_GRUPO) || (Lic_s_(a.AVISO_ID) + '-' + (Number(a.TENTATIVAS) || 0));
        if (enviosOk[ref]) { finais.push(a); return; }
      }
      validas.push(a);
    });
    // o grupo (mesma licitação, mesma pessoa) com um crítico sai como crítico: fica fora do teto do dia
    var grupoCritico = {}, admitido = {};
    validas.forEach(function (a) { if (Lic_up_(a.NIVEL) === 'CRITICO') grupoCritico[Lic_chaveEnvio_(a)] = true; });
    // 2ª passada, tetos duros: por pessoa em cada alerta (original + reenvio + escalonamento) e por pessoa no dia (cada envio conta 1)
    validas.forEach(function (a) {
      var uid = Lic_s_(a.USUARIO_ID), ke = Lic_chaveEnvio_(a);
      var kg = Lic_s_(a.GRUPO) + '|' + uid, motT = '', ehDoc = Lic_s_(a.TIPO) === 'DOCUMENTO', kd = uid + (ehDoc ? '|D' : '');
      var tetoX = ehDoc ? (typeof LICH_TETO_DIA !== 'undefined' ? LICH_TETO_DIA : 10) : tetoD;
      if ((porGrupo[kg] || 0) >= tetoA) motT = 'Teto de ' + tetoA + ' mensagens para esta pessoa neste alerta atingido: não foi enviada de novo (o alerta continua na Central de alertas).';
      else if (!admitido[ke] && (porDia[kd] || 0) >= tetoX && Lic_up_(a.NIVEL) !== 'CRITICO' && !grupoCritico[ke]) {
        // revisão 02/11/2026: o crítico é isento do teto do dia; normal e importante barrados não somem: vão num resumo só
        // (interno + e-mail) por pessoa nesta rodada e ficam pendentes de ciência na faixa e na Central
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'NO_RESUMO', INTERNO_EM: agora, CANCELADO_MOTIVO: 'Teto de ' + tetoX + (ehDoc ? ' avisos de documento de habilitação' : ' mensagens de licitação') + ' para esta pessoa hoje atingido: foi no resumo por e-mail, sem WhatsApp. Confirme a ciência na Central de alertas.', ESCALONAR_EM: '', ATUALIZADO_EM: agora });
        Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_TETO', { id: '', nome: 'Alertas de licitação (sistema)' }, { para: Lic_s_(a.USUARIO_NOME), texto: Lic_s_(a.AVISO_ID) + ' · teto do dia (' + tetoX + ') atingido: vai no resumo por e-mail e fica pendente de ciência.', fonte: 'Alertas de licitação' });
        (resumos[uid] = resumos[uid] || []).push(a);
        res.teto++; return;
      }
      if (motT) {
        SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'PULADO', CANCELADO_EM: agora, CANCELADO_MOTIVO: motT, ESCALONAR_EM: '', ATUALIZADO_EM: agora });
        Lic_historico_('OPORTUNIDADE', a.OPORTUNIDADE_ID, a.CODIGO, 'ALERTA_TETO', { id: '', nome: 'Alertas de licitação (sistema)' }, { para: Lic_s_(a.USUARIO_NOME), texto: Lic_s_(a.AVISO_ID) + ' · ' + motT, fonte: 'Alertas de licitação' });
        res.teto++; return;
      }
      porGrupo[kg] = (porGrupo[kg] || 0) + 1;
      // o envio agrupado gasta UMA mensagem do teto do dia (os outros alertas do mesmo grupo vão juntos, sem gastar)
      if (!admitido[ke]) { admitido[ke] = true; porDia[kd] = (porDia[kd] || 0) + 1; }
      var tent = (Number(a.TENTATIVAS) || 0) + 1;
      SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: agora, TENTATIVAS: tent, ENVIO_GRUPO: '' });
      a.TENTATIVAS = tent; a.ENVIO_GRUPO = '';
      lote.push(a);
    });
    // revisão 03/11/2026: grupos (mesma licitação e pessoa) montados ainda sob a trava; o código do envio vai para as linhas antes
    // de sair (é a prova no registro do notificador se a execução cair no meio)
    var idx = {};
    lote.forEach(function (a) { var k = Lic_chaveEnvio_(a); if (idx[k] === undefined) { idx[k] = envios.length; envios.push([]); } envios[idx[k]].push(a); });
    envios.forEach(function (g) {
      if (g.length < 2) return;
      var id = Lic_envioId_();
      g.forEach(function (a) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ENVIO_GRUPO: id }); a.ENVIO_GRUPO = id; });
    });
  } finally { try { lock.releaseLock(); } catch (e) {} }
  finais.forEach(function (a) {
    var esc = Lic_s_(a.PAPEL) === 'TITULAR' || Lic_s_(a.PAPEL) === 'TODOS';
    SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { SITUACAO: 'ENVIADO', ENVIADO_EM: Lic_s_(a.ENVIANDO_EM) || agora, INTERNO_EM: Lic_s_(a.INTERNO_EM) || agora, EMAIL_MOTIVO: Lic_s_(a.EMAIL_MOTIVO) || 'Envio confirmado no registro do notificador (a execução caiu depois de enviar); não foi repetido.',
      ESCALONAR_EM: esc && !Lic_s_(a.CIENTE_EM) ? Lic_maisMin_(quando, Number(cfg.escalonarMin[Lic_up_(a.NIVEL)]) || 60) : '', ATUALIZADO_EM: agora });
    res.enviados++;
  });
  Object.keys(resumos).forEach(function (uid) { if (Lic_alertasResumoTeto_(uid, resumos[uid], quando, ops, evs)) res.resumos = (res.resumos || 0) + 1; });
  if (!lote.length) return res;
  // revisão 02/11/2026: "envio em curso" marcado antes do lote (prova para a outra rodada não pegar como abandonada a linha que
  // ainda vai sair), e cada linha marca a tentativa e o instante logo antes de chamar o notificador
  var props = PropertiesService.getScriptProperties();
  props.setProperty('LIC_ENVIO_EM_CURSO', new Date().toISOString());
  try {
    envios.forEach(function (g) {
      var ini = new Date().toISOString();
      g.forEach(function (a) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ENVIANDO_EM: ini, TENTATIVAS: a.TENTATIVAS }); a.ENVIANDO_EM = ini; });
      props.setProperty('LIC_ENVIO_EM_CURSO', ini);
      var x;
      if (g.length === 1) x = Lic_alertaEnviarUm_(g[0], quando, cfg, ops, evs);
      else {
        try { x = Lic_alertaEnviarGrupo_(g, quando, cfg, ops, evs); }
        catch (e) { console.error('Licitações, envio agrupado: ' + ((e && e.message) || e)); x = { chegou: false }; }
        res.agrupados = (res.agrupados || 0) + 1;
      }
      if (x.chegou) res.enviados += g.length; else res.falhas += g.length;
    });
  } finally { try { props.setProperty('LIC_ENVIO_EM_CURSO', ''); } catch (e) {} }
  res.mensagens = envios.length;
  return res;
}
/** Resumo (interno + e-mail, sem WhatsApp) dos alertas normais e importantes barrados pelo teto do dia. Nunca lança. */
function Lic_alertasResumoTeto_(uid, linhas, quando, ops, evs) {
  try {
    var agora = quando.toISOString(), itens = linhas.map(function (a, i) {
      var ct = Lic_alertaConteudo_(a, ops[Lic_s_(a.OPORTUNIDADE_ID)], evs[Lic_s_(a.EVENTO_ID)] || null, quando);
      return (i + 1) + '. ' + ct.titulo + '\n   Confirmar ciência: ' + Lic_linkCiencia_(a.AVISO_ID, 'e') + '\n   Abrir: ' + (Lic_linkAviso_(a.AVISO_ID) || 'abra o SGO+');
    });
    var r = SGO_notificar_({ usuarios: [uid], canais: ['email'], origem: 'LICITACOES', refId: ('LR-' + Lic_hash_(uid + '|' + linhas.map(function (a) { return a.ID; }).join(',')).slice(0, 20)),
      titulo: 'Licitações: ' + linhas.length + (linhas.length === 1 ? ' alerta' : ' alertas') + ' no resumo (teto do dia atingido)',
      texto: 'O teto de mensagens de licitação por pessoa no dia foi atingido. Os alertas abaixo (normais e importantes) vão juntos neste e-mail, sem WhatsApp, e ficam pendentes de ciência na Central de alertas. Alertas críticos não entram no teto.\n\n' + itens.join('\n\n'),
      link: (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '') || undefined, rotuloLink: 'Abrir o SGO+' }) || {};
    var em = r.ok ? { s: 'ENVIADO', m: 'Foi no resumo por e-mail (teto do dia).' } : { s: 'FALHOU', m: Lic_texto_(r.motivo || 'O resumo por e-mail não saiu.', 300) };
    linhas.forEach(function (a) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { EMAIL_SITUACAO: em.s, EMAIL_MOTIVO: em.m, EMAIL_EM: agora, ATUALIZADO_EM: agora }); });
    return !!r.ok;
  } catch (e) { console.error('Licitações, resumo do teto: ' + ((e && e.message) || e)); return false; }
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
/**
 * Ciência de todos os alertas de um envio agrupado (link do e-mail, botão ou resposta do WhatsApp do grupo; revisão de 03/11/2026).
 * Cada alerta passa por Lic_alertaCiente_ (encerra também a cobrança do mesmo alerta para o outro integrante). Os cancelados e os
 * que já tinham ciência ficam como estão. Devolve { alertas, novas }.
 */
function Lic_alertaCienteGrupo_(envioId, quem, canal, quando) {
  var ids = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.ENVIO_GRUPO) === Lic_s_(envioId); }).map(function (x) { return Lic_s_(x.ID); }), novas = 0;
  if (!ids.length) throw new Error('Não foi possível registrar a ciência: os alertas deste envio não foram encontrados. Abra a Central de alertas no SGO+');
  ids.forEach(function (id) {
    var a = SGO_DATA.getById(LIC_ABAS.ALERTAS, id), s = a ? Lic_up_(a.SITUACAO) : '';
    if (!a || Lic_s_(a.CIENTE_EM) || ['PROGRAMADO', 'ENVIANDO', 'CANCELADO', 'PULADO'].indexOf(s) >= 0) return;
    if (!Lic_alertaCiente_(id, quem, canal, quando).ja) novas++;
  });
  return { alertas: ids.map(function (id) { return SGO_DATA.getById(LIC_ABAS.ALERTAS, id); }).filter(Boolean), novas: novas };
}
function Lic_alertaCienteTela_(eu, d) {
  var r = Lic_alertaCiente_(d.id, eu, 'SGO_TELA');
  return { ja: r.ja, texto: r.ja ? 'A ciência já estava registrada (' + Lic_s_(r.alerta.CIENTE_POR_NOME) + ', ' + Lic_brDiaHora_(r.alerta.CIENTE_EM) + ').' : 'Ciência registrada. A tarefa continua aberta até a ação ser feita.' };
}
/** Link sem login (botão do WhatsApp ou link do e-mail): resolve o token do alerta (LA...) ou do envio agrupado (LG...). */
function Lic_cienciaResolver_(token) {
  var m = /^c1([we])\.(L[AG][0-9a-f]{10})\.([0-9a-f]{24})$/.exec(Lic_s_(token));
  if (!m) return { erro: 'Este link de ciência não é válido (pode ter sido copiado pela metade). Abra o SGO+ e confirme na Central de alertas de Licitações.' };
  var esperado = Lic_cienciaToken_(m[2], m[1]).split('.')[2], d = 0;
  for (var i = 0; i < 24; i++) d |= esperado.charCodeAt(i) ^ m[3].charCodeAt(i);
  if (d) return { erro: 'Este link de ciência não é válido. Abra o SGO+ e confirme na Central de alertas de Licitações.' };
  var grupo = m[2].charAt(1) === 'G', doEnvio = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return grupo ? Lic_s_(x.ENVIO_GRUPO) === m[2] : Lic_s_(x.AVISO_ID) === m[2]; }), a = doEnvio[0];
  if (!a) return { erro: 'Não encontramos este alerta (o link pode ser de outro ambiente). Abra o SGO+ e confira a Central de alertas.' };
  // revisão de 03/11/2026: os 30 dias contam do ENVIO (no grupo, o envio mais recente das linhas), não da criação da linha:
  // o aviso de 7 dias de uma licitação publicada 45 dias antes chegava com o link vencido
  var enviadoEm = doEnvio.map(function (x) { return Lic_s_(x.ENVIADO_EM) || Lic_s_(x.EMAIL_EM) || Lic_s_(x.WA_EM) || Lic_s_(x.CRIADO_EM); }).sort().pop();
  if (Date.now() - Date.parse(enviadoEm) > 30 * 864e5) return { erro: 'Este link de ciência venceu (vale 30 dias a partir do envio). Abra o SGO+ para ver a licitação.' };
  return { alerta: a, envio: grupo ? m[2] : '', linhas: grupo ? doEnvio : [a], canal: m[1] === 'e' ? 'EMAIL_LINK' : 'WHATSAPP_BOTAO' };
}
/** google.script.run da página do link (sem login): acao 'ver' ou 'confirmar'. Só o primeiro nome, o código e o prazo. Nunca lança. */
function Licitacoes_cienciaLink(token, acao) {
  try {
    var x = Lic_cienciaResolver_(token);
    if (x.erro) return { ok: false, message: x.erro };
    var a = x.alerta, base = { ok: true, nome: (Lic_s_(a.USUARIO_NOME).split(/\s+/)[0] || ''), codigo: Lic_s_(a.CODIGO), prazo: Lic_s_(a.TITULO) || 'Alerta de licitação', nivel: LIC_NIVEIS[Lic_up_(a.NIVEL)] || '' };
    if (x.envio) {
      // envio agrupado: um clique registra a ciência de todos os alertas daquele envio
      var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) { evs[Lic_s_(e.ID)] = e; });
      var linhas = x.linhas;
      if (Lic_s_(acao) === 'confirmar') linhas = Lic_alertaCienteGrupo_(x.envio, { id: Lic_s_(a.USUARIO_ID), nome: Lic_s_(a.USUARIO_NOME) }, x.canal).alertas;
      var cobr = linhas.filter(function (y) { return ['CANCELADO', 'PULADO'].indexOf(Lic_up_(y.SITUACAO)) < 0; }), ult = cobr.filter(function (y) { return Lic_s_(y.CIENTE_EM); }).sort(function (p, q) { return Lic_s_(p.CIENTE_EM) < Lic_s_(q.CIENTE_EM) ? 1 : -1; })[0];
      base.prazo = Lic_resumoGrupo_(linhas, false, evs).texto + ' (um clique confirma todos)'; base.nivel = LIC_NIVEIS[Lic_nivelGrupo_(linhas)] || '';
      base.ciente = cobr.length > 0 && cobr.every(function (y) { return Lic_s_(y.CIENTE_EM); }); base.cienteEm = base.ciente && ult ? Lic_brDiaHora_(ult.CIENTE_EM) : ''; base.cientePor = base.ciente && ult ? Lic_s_(ult.CIENTE_POR_NOME) : '';
      base.grupo = linhas.length;
      return base;
    }
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
    // revisão 02/11/2026: só a palavra CIENTE (com ponto ou exclamação no fim); "ok" ou frase com outra coisa não é ciência
    if (!contextoId || !/^\s*ciente\s*[.!]*\s*$/i.test(Lic_s_(texto))) return 0;
    // envio agrupado (revisão de 03/11/2026): a mensagem é uma só para os alertas do envio; a resposta vale para todos
    var doMsg = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.WA_ID) === contextoId; }), a = doMsg.filter(function (x) { return !Lic_s_(x.CIENTE_EM); })[0] || null;
    if (!a) return 0;
    var c = Notificar_contatos_([Lic_s_(a.USUARIO_ID)])[Lic_s_(a.USUARIO_ID)] || {}, canon = function (v) { var dd = Lic_s_(v).replace(/\D/g, '').replace(/^0+/, ''); if (dd.length === 10 || dd.length === 11) dd = '55' + dd; return /^55\d{10,11}$/.test(dd) ? dd.slice(2, 4) + dd.slice(-8) : ''; };
    if (!c.telefone || canon(c.telefone) !== canon(de)) return 0;
    var quem = { id: Lic_s_(a.USUARIO_ID), nome: Lic_s_(a.USUARIO_NOME) }, q = quandoIso ? new Date(quandoIso) : null;
    if (Lic_s_(a.ENVIO_GRUPO)) Lic_alertaCienteGrupo_(a.ENVIO_GRUPO, quem, 'WHATSAPP_RESPOSTA', q);
    else Lic_alertaCiente_(a.ID, quem, 'WHATSAPP_RESPOSTA', q);
    return 1;
  } catch (e) { return 0; }
}

// ------------------------------------------------------------ escalonamento e reenvio
/**
 * Sem ciência no tempo do nível: o alerta vai para os outros integrantes (todos os canais) e é reenviado ao titular pelo outro
 * canal. Uma vez por alerta. Sem outro integrante: só o reenvio. Prazo que já passou não escalona. Os alertas de um envio
 * agrupado escalonam juntos, e o escalonamento e o reenvio deles saem agrupados de novo na mesma rodada (Lic_alertasEnviar_).
 */
function Lic_alertasEscalonar_(quando) {
  quando = quando instanceof Date ? quando : new Date(quando || Date.now());
  var cfg = Lic_alertasCfg_(), agora = quando.toISOString(), agoraMs = quando.getTime(), r = { escalonados: 0, novos: 0 };
  if (!cfg.ligado) return r;
  var integ = Lic_integrantes_(cfg);
  return Lic_comTrava_(function () {
    var linhas = Lic_ler_(LIC_ABAS.ALERTAS), existe = {}, cientes = {}, novos = [];
    var ops = {}; Lic_ativas_().forEach(function (l) { ops[Lic_s_(l.ID)] = l; });
    var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (e) { evs[Lic_s_(e.ID)] = e; });
    linhas.forEach(function (x) { existe[Lic_s_(x.CHAVE)] = true; if (Lic_s_(x.CIENTE_EM)) cientes[Lic_s_(x.GRUPO)] = true; });
    // revisão 03/11/2026: o envio agrupado escalona junto (um lembrete só por grupo e por pessoa): basta um alerta dele vencer
    var pendente = function (a) { var s = Lic_up_(a.SITUACAO); return (s === 'ENVIADO' || s === 'FALHOU') && !Lic_s_(a.CIENTE_EM) && !!Lic_s_(a.ESCALONAR_EM) && !Lic_s_(a.ESCALONADO_EM); };
    var envioVenceu = {}; linhas.forEach(function (a) { if (Lic_s_(a.ENVIO_GRUPO) && pendente(a) && Lic_s_(a.ESCALONAR_EM) <= agora) envioVenceu[Lic_s_(a.ENVIO_GRUPO)] = true; });
    linhas.forEach(function (a) {
      var s = Lic_up_(a.SITUACAO);
      if (!pendente(a) || (Lic_s_(a.ESCALONAR_EM) > agora && !envioVenceu[Lic_s_(a.ENVIO_GRUPO)])) return;
      if (cientes[Lic_s_(a.GRUPO)]) return;
      // revisão 02/11/2026: escalonamento e reenvio nunca escalonam de novo (era o laço sem fim com a Meta falhando)
      if (Lic_s_(a.PAPEL) !== 'TITULAR' && Lic_s_(a.PAPEL) !== 'TODOS') { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ESCALONAR_EM: '', ATUALIZADO_EM: agora }); return; }
      var semV = Lic_alertaSemValer_(a, ops, evs, cfg, agoraMs);
      if (semV) { SGO_DATA.update(LIC_ABAS.ALERTAS, a.ID, { ESCALONAR_EM: '', CANCELADO_MOTIVO: Lic_texto_('Escalonamento cancelado: ' + semV, 500), ATUALIZADO_EM: agora }); return; }
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
    var recente = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (x) { return Lic_s_(x.ORIGEM_ALERTA_ID) === Lic_s_(a.ID) && Lic_s_(x.PAPEL) === 'REENVIO' && Lic_s_(x.CRIADO_EM) > Lic_menosMin_(new Date(), 10); })[0];
    if (recente) throw new Error('Não foi possível reenviar agora: este alerta já foi reenviado às ' + Lic_brDiaHora_(recente.CRIADO_EM) + '. Espere 10 minutos e confira a situação na Central de alertas antes de pedir de novo');
    var n = Object.assign({}, a); delete n.ID;
    Object.keys(n).forEach(function (k) { if (/_EM$|SITUACAO|MOTIVO|WA_ID|CIENTE|ESCALON|CANAL_ALT/.test(k)) n[k] = ''; });
    Object.assign(n, { AVISO_ID: Lic_avisoId_(), CHAVE: 'U|' + Lic_s_(a.ID) + '|' + agora, PAPEL: 'REENVIO', CANAIS: 'email,whatsapp', ENVIO_GRUPO: '', SITUACAO: 'PROGRAMADO', LIBERAR_EM: agora, TENTATIVAS: 0, ORIGEM_ALERTA_ID: a.ID, CRIADO_EM: agora, ATUALIZADO_EM: agora });
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
    // envio agrupado (revisão de 03/11/2026): a mensagem é uma só para várias linhas; o e-mail de reserva também sai uma vez só
    var todas = Lic_ler_(LIC_ABAS.ALERTAS), reserva = {};
    todas.forEach(function (a) {
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
        var alvoMs = Date.parse(Lic_s_(a.ALVO_ISO)), passou = isFinite(alvoMs) && alvoMs <= Date.now();
        if (Lic_s_(a.CIENTE_EM) || passou) alt = Lic_s_(a.CIENTE_EM) ? ' A ciência já estava registrada: o e-mail de reserva não foi enviado.' : ' O prazo já passou: o e-mail de reserva não foi enviado.';
        else if (Lic_up_(a.EMAIL_SITUACAO) !== 'ENVIADO') {
          var cfg = Lic_alertasCfg_(), l = SGO_DATA.getById(LIC_ABAS.OPORTUNIDADES, a.OPORTUNIDADE_ID), e = Lic_s_(a.EVENTO_ID) ? SGO_DATA.getById(LIC_ABAS.EVENTOS, a.EVENTO_ID) : null;
          var eg = Lic_s_(a.ENVIO_GRUPO), r = eg ? reserva[eg] : null;
          if (cfg.canais.email !== false) {
            if (!r) {
              var doEnvio = eg ? todas.filter(function (x) { return Lic_s_(x.ENVIO_GRUPO) === eg && !Lic_s_(x.CIENTE_EM) && Lic_up_(x.EMAIL_SITUACAO) !== 'ENVIADO' && ['CANCELADO', 'PULADO'].indexOf(Lic_up_(x.SITUACAO)) < 0; }) : [];
              if (doEnvio.length > 1) { var evs = {}; Lic_ler_(LIC_ABAS.EVENTOS).forEach(function (x) { evs[Lic_s_(x.ID)] = x; }); r = Lic_alertaEmail_(a, Lic_alertaConteudoGrupo_(doEnvio, l, evs, new Date(), eg)); }
              else r = Lic_alertaEmail_(a, Lic_alertaConteudo_(a, l, e, new Date()));
              if (eg) reserva[eg] = r;
            }
            var c2 = { EMAIL_SITUACAO: r.situacao, EMAIL_MOTIVO: r.motivo, EMAIL_EM: Lic_agora_(), CANAL_ALTERNATIVO: Lic_texto_('WhatsApp falhou no retorno da Meta: e-mail enviado como canal alternativo' + (r.situacao === 'ENVIADO' ? '.' : ', e também falhou (' + r.motivo + ').'), 300) };
            // só o alerta do titular (ou "todos") ainda não escalonado escalona na hora; reenvio e escalonamento ficam como falha
            if (r.situacao !== 'ENVIADO') { c2.SITUACAO = Lic_s_(a.ESCALONADO_EM) ? Lic_s_(a.SITUACAO) : 'FALHOU'; if ((Lic_s_(a.PAPEL) === 'TITULAR' || Lic_s_(a.PAPEL) === 'TODOS') && !Lic_s_(a.ESCALONADO_EM)) c2.ESCALONAR_EM = Lic_agora_(); }
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
  try { Lic_cienciaSegredo_(); } catch (e) { console.error('Licitações, segredo dos links de ciência: ' + ((e && e.message) || e)); }
  passo('agenda', function () { return Lic_agendaAtualizar_({ agora: quando, limite: 80 }); });
  // implantação: só depois que a agenda inteira foi montada (rodadas com sobra continuam sem a marca)
  passo('implantacao', function () { var ag = r.agenda || {}; return ag.erro || ag.restam ? (Lic_alertasImplantadoEm_() || 'aguardando a agenda inteira') : Lic_alertasMarcarImplantacao_(quando.toISOString()); });
  passo('programar', function () { return Lic_alertasProgramar_(quando); });
  // avisos dos documentos de habilitação (validade e licitações acompanhadas), no máximo a cada 30 min (SGO_Licitacoes_Habilitacao.js)
  passo('habilitacao', function () { return typeof LicH_alertasProgramar_ === 'function' ? LicH_alertasProgramar_(quando) : null; });
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
  var parada = Date.now() - Date.parse(j.em) > 20 * 60000, ag = (j.r && j.r.agenda) || {}, impl = Lic_alertasImplantadoEm_();
  var aguardando = impl ? '' : ' Implantação dos alertas aguardando a agenda inteira' + (ag.erro ? ' (a montagem da agenda falhou: ' + ag.erro + ')' : ag.restam ? ' (faltam ' + ag.restam + ' oportunidades)' : '') + '.';
  var erros = ag.erros && ag.erros.length ? ' Agenda com erro em ' + ag.erros.length + ' oportunidade(s): ' + ag.erros.slice(0, 3).map(function (x) { return x.codigo + ' (' + x.erro + ')'; }).join('; ') + '. As demais seguiram.' : '';
  return { rodou: true, em: j.em, parada: parada, implantacaoAguardando: !impl, errosAgenda: ag.erros || [], texto: (parada ? 'A rotina dos alertas está parada: a última rodada foi em ' : 'Última rodada dos alertas: ') + Lic_brDiaHora_(j.em) + '.' + (parada ? ' Avise o responsável pelo sistema (o agendador do servidor pode ter parado).' : '') + aguardando + erros };
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
    antecedencia: Lic_s_(a.ANTECEDENCIA), nivel: Lic_up_(a.NIVEL), nivelNome: LIC_NIVEIS[Lic_up_(a.NIVEL)] || '', pessoa: Lic_s_(a.USUARIO_NOME), pessoaId: Lic_s_(a.USUARIO_ID), titulo: Lic_s_(a.TITULO), texto: Lic_s_(a.TIPO) === 'MUDANCA' || Lic_s_(a.TIPO) === 'DOCUMENTO' ? Lic_s_(a.TEXTO) : '',
    abrirAba: Lic_s_(a.TIPO) === 'DOCUMENTO' ? 'habilitacao' : 'prazos',
    situacao: s, situacaoNome: LIC_ALERTA_SITUACOES[s] || s, liberarEm: Lic_s_(a.LIBERAR_EM), alvoIso: Lic_s_(a.ALVO_ISO), email: em, emailMotivo: Lic_s_(a.EMAIL_MOTIVO), whatsapp: wa,
    whatsappNome: wa ? LIC_WA_ROTULOS[wa] || wa : '', whatsappMotivo: Lic_s_(a.WA_MOTIVO), alternativo: Lic_s_(a.CANAL_ALTERNATIVO), cienteEm: Lic_s_(a.CIENTE_EM), cientePor: Lic_s_(a.CIENTE_POR_NOME),
    cienteCanal: LIC_CANAIS_CIENCIA[Lic_s_(a.CIENTE_CANAL).replace(/_OUTRO$/, '')] || Lic_s_(a.CIENTE_CANAL), cienteOutro: /_OUTRO$/.test(Lic_s_(a.CIENTE_CANAL)), escalonarEm: Lic_s_(a.ESCALONAR_EM),
    escalonadoEm: Lic_s_(a.ESCALONADO_EM), escalonadoPara: Lic_s_(a.ESCALONADO_PARA), canceladoMotivo: Lic_s_(a.CANCELADO_MOTIVO), estados: estados, criadoEm: Lic_s_(a.CRIADO_EM),
    envioGrupo: Lic_s_(a.ENVIO_GRUPO),   // revisão 03/11/2026: código do envio agrupado (mesma mensagem que outros alertas)
    podeCiente: !Lic_s_(a.CIENTE_EM) && LIC_SITUACOES_SEM_CIENCIA.indexOf(s) >= 0, podeReenviar: ['ENVIADO', 'FALHOU', 'ESCALONADO', 'CIENTE'].indexOf(s) >= 0
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
    if (LIC_SITUACOES_SEM_CIENCIA.indexOf(s) < 0 || Lic_s_(a.CIENTE_EM)) return false;
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
  var semC = function (a) { var s = Lic_up_(a.SITUACAO); return LIC_SITUACOES_SEM_CIENCIA.indexOf(s) >= 0 && !Lic_s_(a.CIENTE_EM) && !(Lic_s_(a.ALVO_ISO) && Lic_s_(a.ALVO_ISO) < agora); };
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
  // aviso de documento de habilitação: sem licitação, abre o cadastro; com licitação, a aba Habilitação da ficha
  if (Lic_s_(a.TIPO) === 'DOCUMENTO') return { ok: true, tela: Lic_s_(a.OPORTUNIDADE_ID) ? { tipo: 'licitacao', id: Lic_s_(a.OPORTUNIDADE_ID), aba: 'habilitacao', alerta: Lic_s_(a.ID) } : { tipo: 'licitacao', mod: 'licitacoes_habilitacao', alerta: Lic_s_(a.ID) },
    message: Lic_s_(a.CIENTE_EM) ? '' : 'Confirme a ciência deste aviso na Central de alertas (botão "Ciente") ou pelo link do e-mail.' };
  return { ok: true, tela: { tipo: 'licitacao', id: Lic_s_(a.OPORTUNIDADE_ID), aba: 'prazos', alerta: Lic_s_(a.ID) },
    message: Lic_s_(a.CIENTE_EM) ? '' : 'Confirme a ciência deste alerta na aba Prazos (botão "Ciente") ou pelo botão do WhatsApp.' };
}
