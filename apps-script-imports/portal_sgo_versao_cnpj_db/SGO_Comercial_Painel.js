/****************************************************
 * COMERCIAL — PAINEL, PENDÊNCIAS, ROTINA E A CHAMADA ÚNICA DA TELA (21/10/2026)
 *
 * Comercial_api(sessionId, acao, dados) — google.script.run, uma porta só para todas as telas do Comercial.
 *   Toda ação confere a sessão e o nível (Com_eu_ / Com_exigir_). Nunca lança: erro vem em { ok:false, message }.
 *
 * Pendências (fonte da central SGO_Alertas_Central.js › PEND_FONTES; as de gestão entram na Caixa de decisões
 * pelos tipos de GES_TIPOS, com a área COMERCIAL):
 *   comercial_sem_proxima    oportunidade aberta sem próxima ação — vendedor e gestão (Caixa, prazo 1 dia útil)
 *   comercial_parada         sem contato há N dias — só o vendedor (Início)
 *   comercial_desconto       proposta aguardando aprovação do desconto — gestão comercial (Caixa)
 *   comercial_reabertura     pedido de reabertura de oportunidade encerrada — gestão comercial (Caixa)
 *   comercial_pedido_parado  pedido aprovado sem passagem aos setores há 1 dia útil — gestão (Caixa) e vendedor
 *   comercial_pedido_passar  pedido aprovado ainda sem passagem (antes do prazo) — só o vendedor
 *   comercial_aviso          avisos do Comercial não lidos (desconto decidido, setor concluiu...) — só a pessoa
 * Os retornos atrasados já são atividades: a central e a Caixa cobram pela regra das atividades (escada da gestão).
 * Nenhuma pendência leva valor.
 *
 * Rotina: Comercial_rotina_ é chamada pela rotina da gestão (SGO_Gestao_Escada.js › Ges_rodada_, a cada 15 min)
 * e roda no máximo uma vez por hora: envios registrados, validade das propostas, passagem aos setores, e-mails
 * guardados (só no expediente) e, uma vez por dia útil no início do expediente, a lista do dia de cada vendedor e
 * o panorama da gestão pela gestora comercial. O relatório mensal sai pela rotina de relatórios da gestão.
 ****************************************************/

var COM_ROTINA_PROP = 'COM_ROTINA_ULTIMA';

// ------------------------------------------------------------
// INDICADORES
// ------------------------------------------------------------
/** Indicadores de uma competência 'aaaa-mm' (gestão: equipe toda; vendedorId: só ele). Sem Date cru. */
function Com_indicadores_(comp, vendedorId) {
  var met = Com_metodologia_(), agora = Com_agora_(), atvs = ComOpo_mapaAtividades_();
  var ops = Com_ler_(COM_ABAS.OPORTUNIDADES), props = Com_ler_(COM_ABAS.PROPOSTAS);
  if (vendedorId) { ops = ops.filter(function (o) { return Com_s_(o.RESPONSAVEL_ID) === vendedorId; }); props = props.filter(function (p) { return Com_s_(p.RESPONSAVEL_ID) === vendedorId; }); }
  var noMes = function (v) { return Com_dia_(v).slice(0, 7) === comp; };
  var r = { competencia: comp, ganho: { qtd: 0, valor: 0 }, perdido: { qtd: 0, valor: 0 }, aberto: { qtd: 0, valor: 0, ponderado: 0 }, novas: 0, emDia: 0,
    perdasPorMotivo: met.motivosPerda.map(function (m) { return { motivo: m, qtd: 0, valor: 0 }; }), funil: [], porVendedor: [], origens: [],
    propostas: { enviadas: 0, aprovadas: 0, recusadas: 0, vencidas: 0, descontoMedio: 0 }, pedidosSemPassagem: 0 };
  var funilMapa = {}, vend = {}, orig = {};
  met.funis.forEach(function (f) { f.etapas.forEach(function (e) { funilMapa[f.codigo + '|' + e.codigo] = { funil: f.nome, etapa: e.nome, probabilidade: e.probabilidade, qtd: 0, valor: 0, ponderado: 0 }; }); });
  ops.forEach(function (o) {
    var v = Number(o.VALOR_ESTIMADO) || 0, s = Com_up_(o.SITUACAO || 'ABERTA'), uid = Com_s_(o.RESPONSAVEL_ID);
    var pv = vend[uid] = vend[uid] || { id: uid, nome: Com_s_(o.RESPONSAVEL_NOME), abertas: 0, semProxima: 0, paradas: 0, ganhas: 0, valorGanho: 0, perdidas: 0 };
    if (noMes(o.CRIADO_EM)) { r.novas++; var og = orig[Com_s_(o.ORIGEM) || 'Outro'] = orig[Com_s_(o.ORIGEM) || 'Outro'] || { origem: Com_s_(o.ORIGEM) || 'Outro', novas: 0, ganhas: 0 }; og.novas++; }
    if (s === 'GANHA' && noMes(o.GANHA_EM)) { r.ganho.qtd++; r.ganho.valor += v; pv.ganhas++; pv.valorGanho += v; var og2 = orig[Com_s_(o.ORIGEM) || 'Outro'] = orig[Com_s_(o.ORIGEM) || 'Outro'] || { origem: Com_s_(o.ORIGEM) || 'Outro', novas: 0, ganhas: 0 }; og2.ganhas++; }
    if (s === 'PERDIDA' && noMes(o.PERDIDA_EM)) {
      r.perdido.qtd++; r.perdido.valor += v; pv.perdidas++;
      var m = r.perdasPorMotivo.filter(function (x) { return x.motivo === Com_s_(o.MOTIVO_PERDA); })[0];
      if (!m) { m = { motivo: Com_s_(o.MOTIVO_PERDA) || 'Sem motivo', qtd: 0, valor: 0 }; r.perdasPorMotivo.push(m); }
      m.qtd++; m.valor += v;
    }
    if (s === 'ABERTA') {
      var d = ComOpo_derivados_(o, { met: met, agora: agora, atividades: atvs });
      r.aberto.qtd++; r.aberto.valor += v; r.aberto.ponderado += d.ponderado; pv.abertas++;
      if (d.semProxima) pv.semProxima++; if (d.parada) pv.paradas++;
      if (!d.semProxima && !d.atrasada) r.emDia++;
      var fe = funilMapa[Com_s_(o.FUNIL) + '|' + Com_s_(o.ETAPA)];
      if (fe) { fe.qtd++; fe.valor += v; fe.ponderado += d.ponderado; }
    }
  });
  var descontos = [], primeira = [];
  props.forEach(function (p) {
    var s = Com_up_(p.SITUACAO);
    if (noMes(p.ENVIADA_EM)) { r.propostas.enviadas++; descontos.push(Number(p.DESCONTO_PCT) || 0); }
    if (s === 'APROVADA' && noMes(p.RESPOSTA_EM)) r.propostas.aprovadas++;
    if (s === 'RECUSADA' && noMes(p.RESPOSTA_EM)) r.propostas.recusadas++;
    if (s === 'VENCIDA' && noMes(p.VALIDA_ATE)) r.propostas.vencidas++;
    if (s === 'APROVADA' && (!Com_s_(p.PEDIDO_SITUACAO) || Com_up_(p.PEDIDO_SITUACAO) === 'SEM_PASSAGEM')) r.pedidosSemPassagem++;
  });
  ops.forEach(function (o) {
    if (!noMes(o.CRIADO_EM)) return;
    var env = props.filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && Com_s_(p.ENVIADA_EM); }).map(function (p) { return Com_dia_(p.ENVIADA_EM); }).sort()[0];
    if (env) primeira.push(Math.max(0, Com_diasEntre_(Com_dia_(o.CRIADO_EM), env) || 0));
  });
  var dec = r.ganho.qtd + r.perdido.qtd, resp = r.propostas.aprovadas + r.propostas.recusadas;
  r.ganho.valor = Com_r2_(r.ganho.valor); r.perdido.valor = Com_r2_(r.perdido.valor); r.aberto.valor = Com_r2_(r.aberto.valor); r.aberto.ponderado = Com_r2_(r.aberto.ponderado);
  r.conversao = dec ? Math.round(r.ganho.qtd / dec * 1000) / 10 : 0; r.conversaoTxt = dec ? Com_pct_(r.conversao) : 'sem decisões';
  r.aprovacao = resp ? Math.round(r.propostas.aprovadas / resp * 1000) / 10 : 0; r.aprovacaoTxt = resp ? Com_pct_(r.aprovacao) : 'sem respostas';
  r.higienePct = r.aberto.qtd ? Math.round(r.emDia / r.aberto.qtd * 1000) / 10 : 100; r.higieneTxt = r.aberto.qtd ? Com_pct_(r.higienePct) : 'sem abertas';
  r.propostas.descontoMedio = descontos.length ? Math.round(descontos.reduce(function (a, b) { return a + b; }, 0) / descontos.length * 100) / 100 : 0;
  r.propostas.descontoMedioTxt = descontos.length ? Com_pct_(r.propostas.descontoMedio) : '—';
  r.tempoPrimeiraProposta = primeira.length ? Math.round(primeira.reduce(function (a, b) { return a + b; }, 0) / primeira.length * 10) / 10 : null;
  r.tempoPrimeiraPropostaTxt = primeira.length ? SGO_DocA4_num_(r.tempoPrimeiraProposta, 1) + ' dias' : '—';
  r.funil = Object.keys(funilMapa).map(function (k) { var e = funilMapa[k]; e.valor = Com_r2_(e.valor); e.ponderado = Com_r2_(e.ponderado); return e; });
  r.porVendedor = Object.keys(vend).map(function (k) { var v = vend[k]; v.valorGanho = Com_r2_(v.valorGanho); return v; }).filter(function (v) { return v.abertas || v.ganhas || v.perdidas; }).sort(function (a, b) { return b.valorGanho - a.valorGanho || b.abertas - a.abertas; });
  r.origens = Object.keys(orig).map(function (k) { return orig[k]; }).sort(function (a, b) { return b.novas - a.novas; });
  r.meta = Number(met.referencias.metaMensal) || 0;
  return r;
}

function Com_painel_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'abrir o painel comercial');
  d = d || {};
  var comp = /^\d{4}-\d{2}$/.test(Com_s_(d.competencia)) ? Com_s_(d.competencia) : Com_hoje_().slice(0, 7);
  var vid = eu.gestao ? Com_s_(d.vendedorId) : eu.id;
  var ind = Com_indicadores_(comp, vid);
  if (!eu.gestao) delete ind.porVendedor;
  return { indicadores: ind, competencia: comp, vendedorId: vid, equipe: eu.gestao ? Com_equipeComercial_() : [] };
}

// ------------------------------------------------------------
// RELATÓRIO MENSAL
// ------------------------------------------------------------
/** O Comercial está em uso? (há pelo menos uma oportunidade registrada) */
function Comercial_emUso_() {
  try { return Com_ler_(COM_ABAS.OPORTUNIDADES).length > 0; } catch (e) { return false; }
}

// ------------------------------------------------------------
/** Gera e salva o relatório da competência. Chamado pela rotina dos relatórios mensais (1º dia útil) e pela gestão. */
function Comercial_relatorioMes_(comp, quem) {
  try { Com_garantirAbas_(); } catch (e) {}
  var ind = Com_indicadores_(comp, '');
  var analise = ComG_analiseMes_(ind, true);
  var html = ComDoc_relatorioMesHtml_(comp, ind, analise, quem || 'Rotina automática');
  var g = RelA4_salvar_(ComDoc_pastaRelatorios_, comp, html, { compartilhar: false });
  try { ComG_registrar_('ANALISE_MES', analise.origem, '', null, analise.origem, comp, { texto: analise.texto, sugestoes: analise.sugestoes }, analise.aviso); } catch (e) {}
  return { salvo: g.salvo, link: g.pdfUrl, aviso: [g.aviso, analise.aviso].filter(Boolean).join(' '), html: g.html, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl };
}

// ------------------------------------------------------------
// PENDÊNCIAS (central e Caixa de decisões)
// ------------------------------------------------------------
/**
 * Quem decide na Caixa quando a área Comercial ainda não tem gestor em "Regras e responsáveis": o gestor comercial do
 * cadastro (Gestor com área Comercial ou listado na metodologia). Com a área configurada, a Caixa roteia sozinha ('').
 */
function Com_decisorCaixa_(envolvidoId) {
  try {
    var g = typeof Ges_cfg_ === 'function' ? ((Ges_cfg_().gestoresPorArea || {}).COMERCIAL || []) : [];
    if (g.length) return '';
    var us = Com_usuarios_();
    var ids = Com_idsGestaoComercial_([Com_s_(envolvidoId)]).filter(function (id) { return us[id] && ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(us[id].perfil) >= 0; });
    return ids[0] || '';
  } catch (e) { return ''; }
}

function Comercial_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.comercial_sem_proxima) return;
  if (!Pend_abaExiste_(COM_ABAS.OPORTUNIDADES)) return;
  var met = Com_metodologia_(), agora = Com_agora_(), hoje = agora.slice(0, 10), atvs = ComOpo_mapaAtividades_();
  var tela = function (aba, id) { return { tipo: 'comercial', aba: aba, id: id }; };
  Com_ler_(COM_ABAS.OPORTUNIDADES).forEach(function (o) {
    var s = Com_up_(o.SITUACAO || 'ABERTA'), resp = Com_s_(o.RESPONSAVEL_ID), nome = Com_s_(o.RESPONSAVEL_NOME);
    if (s === 'ABERTA') {
      var d = ComOpo_derivados_(o, { met: met, agora: agora, atividades: atvs });
      if (d.semProxima) add(Pend_item_('comercial_sem_proxima', {
        id: 'COM:SEMPROX:' + o.ID, nome: Com_s_(o.CODIGO) + ' · ' + Com_s_(o.CLIENTE_NOME), publico: 'GESTAO', paraUsuarios: [resp], responsavel: nome, responsavelId: resp,
        gravidade: 'CRITICO', dias: 0, titulo: 'Oportunidade ' + Com_s_(o.CODIGO) + ' (' + Com_s_(o.CLIENTE_NOME) + ') sem próxima ação',
        detalhe: 'Responsável: ' + nome + '. A atividade de retorno foi concluída ou cancelada sem marcar o próximo passo.',
        oQueFazer: 'Abra Comercial > Oportunidades, registre o contato feito e marque a próxima ação com data.',
        oQueFazerOutro: 'Peça a ' + nome + ' para marcar a próxima ação hoje (Comercial > Oportunidades).',
        tela: tela('oportunidades', Com_s_(o.ID)), extra: { area: 'COMERCIAL', motivoDecisor: 'Gestor comercial do cadastro (a área Comercial ainda não tem responsável em Regras e responsáveis).', decisor: Com_decisorCaixa_(resp), prazo: Com_somarDiasUteis_(hoje, 1), desde: Com_dia_(o.ATUALIZADO_EM) || hoje }
      }));
      else if (d.parada) add(Pend_item_('comercial_parada', {
        id: 'COM:PARADA:' + o.ID, nome: Com_s_(o.CODIGO), publico: 'PESSOA', paraUsuarios: [resp], responsavel: nome, responsavelId: resp, gravidade: 'ATENCAO', dias: null,
        titulo: 'Oportunidade ' + Com_s_(o.CODIGO) + ' (' + Com_s_(o.CLIENTE_NOME) + ') parada há ' + d.diasSemContato + ' dias', detalhe: 'Sem contato registrado há ' + d.diasSemContato + ' dias.',
        oQueFazer: 'Registre um contato real com o cliente e a próxima ação, ou registre a perda com o motivo real.', tela: tela('oportunidades', Com_s_(o.ID))
      }));
    } else if (Com_s_(o.REABERTURA_PEDIDA_EM)) {
      var pedinte = Com_s_(o.REABERTURA_PEDIDA_POR_ID);
      add(Pend_item_('comercial_reabertura', {
        id: 'COM:REABRIR:' + o.ID, nome: Com_s_(o.CODIGO), publico: 'GESTAO', responsavel: nome, responsavelId: pedinte,
        gravidade: 'ATENCAO', dias: null, titulo: 'Pedido de reabertura da oportunidade ' + Com_s_(o.CODIGO) + ' (' + Com_s_(o.CLIENTE_NOME) + ')',
        detalhe: 'Pedido de ' + nome + ' em ' + Com_br_(o.REABERTURA_PEDIDA_EM) + ': ' + Com_s_(o.REABERTURA_MOTIVO).slice(0, 220),
        oQueFazer: 'Abra a oportunidade em Comercial > Oportunidades e reabra (com a próxima ação) ou recuse com o motivo. Quem pediu não decide.',
        tela: tela('oportunidades', Com_s_(o.ID)), extra: { area: 'COMERCIAL', motivoDecisor: 'Gestor comercial do cadastro (a área Comercial ainda não tem responsável em Regras e responsáveis).', decisor: Com_decisorCaixa_(pedinte), naoPode: [pedinte], desde: Com_dia_(o.REABERTURA_PEDIDA_EM) }
      }));
    }
  });
  Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) {
    var s = Com_up_(p.SITUACAO), resp = Com_s_(p.RESPONSAVEL_ID), nome = Com_s_(p.RESPONSAVEL_NOME), rot = ComP_rotulo_(p);
    if (s === 'AGUARDANDO_APROVACAO') add(Pend_item_('comercial_desconto', {
      id: 'COM:DESC:' + p.ID, nome: rot, publico: 'GESTAO', responsavel: nome, responsavelId: resp, gravidade: 'ATENCAO', dias: null,
      titulo: 'Desconto da proposta ' + rot + ' (' + Com_s_(p.CLIENTE_NOME) + ') aguardando aprovação',
      detalhe: 'Pedido de ' + nome + ' em ' + Com_br_(p.DESCONTO_PEDIDO_EM) + '. Motivo: ' + Com_s_(p.DESCONTO_MOTIVO).slice(0, 200) + ' A proposta não pode ser enviada até a decisão.',
      oQueFazer: 'Abra a proposta em Comercial > Propostas, confira a política e aprove ou negue com a fundamentação. Quem pediu não aprova o próprio desconto.',
      tela: tela('propostas', Com_s_(p.ID)), extra: { area: 'COMERCIAL', motivoDecisor: 'Gestor comercial do cadastro (a área Comercial ainda não tem responsável em Regras e responsáveis).', decisor: Com_decisorCaixa_(resp), naoPode: [resp], desde: Com_dia_(p.DESCONTO_PEDIDO_EM) }
    }));
    if (s === 'APROVADA' && (!Com_s_(p.PEDIDO_SITUACAO) || Com_up_(p.PEDIDO_SITUACAO) === 'SEM_PASSAGEM')) {
      var du = Com_diasUteisEntre_(Com_dia_(p.RESPOSTA_EM), hoje), lim = Number(met.posVenda.pedidoParadoDiasUteis) || 1;
      if (du >= lim) add(Pend_item_('comercial_pedido_parado', {
        id: 'COM:PEDIDO:' + p.ID, nome: rot, publico: 'GESTAO', paraUsuarios: [resp], responsavel: nome, responsavelId: resp, gravidade: 'CRITICO', dias: null,
        titulo: 'Pedido aprovado ' + rot + ' (' + Com_s_(p.CLIENTE_NOME) + ') sem passagem aos setores há ' + Com_plural_(du, 'dia útil', 'dias úteis'),
        detalhe: 'Aprovado pelo cliente em ' + Com_brDia_(p.RESPOSTA_EM) + '. A técnica, compras e o financeiro ainda não receberam o pedido.',
        oQueFazer: 'Abra a proposta em Comercial > Propostas e toque em "Passar aos setores".', oQueFazerOutro: 'Cobre de ' + nome + ' a passagem aos setores hoje.',
        tela: tela('propostas', Com_s_(p.ID)), extra: { area: 'COMERCIAL', motivoDecisor: 'Gestor comercial do cadastro (a área Comercial ainda não tem responsável em Regras e responsáveis).', decisor: Com_decisorCaixa_(resp), desde: Com_dia_(p.RESPOSTA_EM) }
      }));
      else add(Pend_item_('comercial_pedido_passar', {
        id: 'COM:PASSAR:' + p.ID, nome: rot, publico: 'PESSOA', paraUsuarios: [resp], responsavel: nome, responsavelId: resp, gravidade: 'ATENCAO', dias: 0,
        titulo: 'Passe o pedido aprovado ' + rot + ' (' + Com_s_(p.CLIENTE_NOME) + ') aos setores', detalhe: 'O cliente aprovou em ' + Com_brDia_(p.RESPOSTA_EM) + '.',
        oQueFazer: 'Abra a proposta e toque em "Passar aos setores".', tela: tela('propostas', Com_s_(p.ID))
      }));
    }
  });
  if (ctx.userId && !ctx.interno) {
    Com_ler_(COM_ABAS.AVISOS).forEach(function (v) {
      if (Com_s_(v.DESTINATARIO_ID) !== ctx.userId || Com_s_(v.LIDO_EM)) return;
      add(Pend_item_('comercial_aviso', {
        id: 'COM:AVISO:' + v.ID, nome: Com_s_(v.TITULO).slice(0, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId, gravidade: 'INFO', dias: null,
        titulo: Com_s_(v.TITULO), detalhe: Com_s_(v.TEXTO).slice(0, 220), oQueFazer: 'Abra o Comercial: o aviso fica marcado como lido ao aparecer na tela.',
        tela: Com_s_(v.REF_ID) ? tela(Com_s_(v.REF_TIPO) === 'proposta' ? 'propostas' : 'oportunidades', Com_s_(v.REF_ID)) : tela('hoje', '')
      }));
    });
  }
}

// ------------------------------------------------------------
// ROTINA
// ------------------------------------------------------------
/** Chamado pela rotina da gestão (a cada 15 min). Roda no máximo uma vez por hora; a lista do dia, uma vez por dia útil. */
function Comercial_rotina_(quando, forcar) {
  var r = {};
  try {
    if (!Pend_abaExiste_ || !Pend_abaExiste_(COM_ABAS.OPORTUNIDADES)) return { fora: 'Comercial ainda sem uso' };
  } catch (e) { return { fora: 'Comercial ainda sem uso' }; }
  var props = PropertiesService.getScriptProperties(), ultima = Number(props.getProperty(COM_ROTINA_PROP)) || 0, agoraMs = (quando || new Date()).getTime();
  if (!forcar && agoraMs - ultima < 55 * 60 * 1000) return { fora: 'rodou há menos de 1 hora' };
  props.setProperty(COM_ROTINA_PROP, String(agoraMs));
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Comercial (' + nome + '): ' + r[nome].erro); } };
  passo('envios', ComP_sincronizarEnvios_);
  passo('validade', ComP_rotinaValidade_);
  passo('passagens', ComP_acompanharPassagens_);
  passo('emails', Com_enviarEmailsPendentes_);
  passo('contatos', ComCt_migrarUmaVez_);
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true };
  if (ex.dentro) passo('listaDoDia', function () { return Com_listasDoDia_(); });
  return r;
}

/** Lista do dia de cada vendedor e panorama de cada gestor comercial (uma vez por dia útil; com IA quando houver chave). */
function Com_listasDoDia_() {
  var hoje = Com_hoje_();
  var feitos = {};
  Com_ler_(COM_ABAS.DIA).forEach(function (d) { if (Com_dia_(d.DIA) === hoje) feitos[Com_s_(d.USUARIO_ID) + '|' + Com_s_(d.PAPEL)] = true; });
  var ctx = ComG_ctx_(), n = 0;
  Com_equipeComercial_().forEach(function (p) {
    var papel = p.gestao ? 'GESTAO' : 'VENDEDOR';
    if (feitos[p.id + '|' + papel]) return;
    if (papel === 'VENDEDOR' && !ctx.oportunidades.some(function (o) { return Com_s_(o.RESPONSAVEL_ID) === p.id; })) return;
    ComG_gerarDia_(p.id, p.nome, papel, true, ctx);
    n++;
  });
  return { geradas: n };
}

// ------------------------------------------------------------
// CHAMADA ÚNICA DA TELA
// ------------------------------------------------------------
function Com_inicio_(eu) {
  var met = Com_metodologia_();
  var base = { nivel: eu.nivel, gestao: eu.gestao, vendedor: eu.vendedor, financeiro: eu.financeiro, veCusto: eu.veCusto, catalogo: !!eu.catalogo, diretoria: eu.diretoria, eu: { id: eu.id, nome: eu.nome } };
  if (eu.nivel === 'NENHUM') return base;
  base.funis = met.funis.map(function (f) { return { codigo: f.codigo, nome: f.nome, descricao: f.descricao, etapas: f.etapas.map(function (e) { return { codigo: e.codigo, nome: e.nome, probabilidade: e.probabilidade, maxDias: e.maxDias, criterio: e.criterio }; }) }; });
  base.origens = met.origens; base.motivosPerda = met.motivosPerda; base.regraPerda = met.regraPerda; base.tiposContato = COM_TIPOS_CONTATO; base.papeisContato = COM_PAPEIS_CONTATO;
  base.estrategias = met.estrategias; base.qualificacao = met.qualificacao.itens; base.situacoesProposta = COM_SITUACOES_PROP; base.tiposItem = COM_TIPOS_ITEM; base.setores = COM_SETORES;
  base.politica = { descontoMaxPct: ComP_limiteDe_(eu.id, met), margemMinPct: met.politica.margemMinPct };
  base.validadePadrao = met.proposta.validadeDias;
  base.equipe = eu.gestao ? Com_equipeComercial_() : [];
  base.iaDisponivel = ComG_iaDisponivel_();
  return base;
}

function Com_marcarAvisosLidos_(eu) {
  var agora = Com_agora_(), n = 0;
  Com_ler_(COM_ABAS.AVISOS).forEach(function (v) { if (Com_s_(v.DESTINATARIO_ID) === eu.id && !Com_s_(v.LIDO_EM)) { SGO_DATA.update(COM_ABAS.AVISOS, v.ID, { LIDO_EM: agora }); n++; } });
  if (n && typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  return n;
}

function Com_avisosDe_(eu) {
  return Com_ler_(COM_ABAS.AVISOS).filter(function (v) { return Com_s_(v.DESTINATARIO_ID) === eu.id; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); }).slice(0, 20)
    .map(function (v) { return { titulo: Com_s_(v.TITULO), texto: Com_s_(v.TEXTO), em: Com_br_(v.DATA), novo: !Com_s_(v.LIDO_EM), ref: { tipo: Com_s_(v.REF_TIPO), id: Com_s_(v.REF_ID) } }; });
}

/** Clientes para a escolha (busca no cadastro único). */
function Com_buscarClientes_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'buscar clientes');
  // 27/10/2026: sem acento e por partes (Com_casaBusca_); o nome da unidade também acha o cliente ("Uruaçu" acha o IMED da unidade).
  var termos = Com_termosBusca_(d && d.busca);
  if (termos.join('').length < 2) return [];
  var unidadesPorCliente = {};
  try {
    Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) {
      if (Com_up_(u.STATUS || 'ATIVO') !== 'ATIVO') return;
      var cid = Com_s_(u.CLIENTE_ID);
      (unidadesPorCliente[cid] = unidadesPorCliente[cid] || []).push(Com_s_(u.NOME_UNIDADE) + ' ' + Com_s_(u.CIDADE));
    });
  } catch (e) {}
  var achados = [];
  Com_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) {
    if (Com_up_(c.STATUS || 'ATIVO') === 'INATIVO') return;
    var proprio = [Com_s_(c.NOME_FANTASIA), Com_s_(c.RAZAO_SOCIAL), Com_s_(c.CNPJ)];
    if (Com_casaBusca_(termos, proprio)) { achados.push({ c: c, peso: Com_normBusca_(c.NOME_FANTASIA || c.RAZAO_SOCIAL).indexOf(termos[0]) === 0 ? 0 : 1 }); return; }
    var un = (unidadesPorCliente[Com_s_(c.ID)] || []).filter(function (t) { return Com_casaBusca_(termos, proprio.concat([t])); })[0];
    if (un) achados.push({ c: c, peso: 2, unidade: un });
  });
  achados.sort(function (a, b) { return (a.peso - b.peso) || String(a.c.NOME_FANTASIA || a.c.RAZAO_SOCIAL).localeCompare(String(b.c.NOME_FANTASIA || b.c.RAZAO_SOCIAL), 'pt-BR'); });
  return achados.slice(0, 30).map(function (x) { var c = x.c; return { id: Com_s_(c.ID), nome: Com_s_(c.NOME_FANTASIA) || Com_s_(c.RAZAO_SOCIAL), razao: Com_s_(c.RAZAO_SOCIAL), cnpj: Com_s_(c.CNPJ), unidade: x.unidade ? Com_s_(x.unidade) : '' }; });
}

function Com_unidadesEquip_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ver as unidades do cliente');
  var cid = Com_s_(d && d.clienteId);
  var unidades = Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Com_s_(u.CLIENTE_ID) === cid && Com_up_(u.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (u) { return { id: Com_s_(u.ID), nome: Com_s_(u.NOME_UNIDADE), cidade: [Com_s_(u.CIDADE), Com_s_(u.UF)].filter(Boolean).join('/') }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  var equipamentos = Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Com_s_(e.CLIENTE_ID) === cid && Com_up_(e.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (e) { return { id: Com_s_(e.ID), unidadeId: Com_s_(e.UNIDADE_ID), texto: [Com_s_(e.TIPO), Com_s_(e.TAG) ? 'TAG ' + Com_s_(e.TAG) : '', Com_s_(e.SETOR)].filter(Boolean).join(' · ') }; });
  try { Com_comTrava_(function () { ComCt_migrar_(cid); }); } catch (e) {}
  return { unidades: unidades, equipamentos: equipamentos, contatos: ComCt_listar_(cid, '', true) };
}

/** Quadro "Comercial" da ficha do cliente (Cadastros): só para quem vê o Comercial. */
function Com_doCliente_(eu, d) {
  if (eu.nivel === 'NENHUM') return { semAcesso: true };
  var cid = Com_s_(d && d.clienteId);
  var ops = Com_ler_(COM_ABAS.OPORTUNIDADES).filter(function (o) { return Com_s_(o.CLIENTE_ID) === cid && ComOpo_podeVer_(eu, o); }).map(function (o) { return ComOpo_paraTela_(eu, o); });
  var props = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_s_(p.CLIENTE_ID) === cid && ComP_podeVer_(eu, p); }).map(function (p) { return ComP_paraTela_(eu, p, false); });
  return { oportunidades: ops, propostas: props, contatos: ComCt_podeVer_(eu) ? ComCt_listar_(cid, '', false) : [] };
}

function Com_metodologiaTela_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ver a metodologia');
  d = d || {};
  if (d.salvar) {
    Com_exigir_(eu, 'GESTAO', 'salvar a metodologia');
    var motivo = Com_texto_(d.motivo, 500);
    if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 10 letras). Cada versão fica no histórico');
    var v = Com_comTrava_(function () { Com_garantirAbas_(); return Com_gravarMetodologia_(d.salvar, eu, motivo); });
    return { metodologia: Com_metodologia_(), message: 'Metodologia salva (versão ' + v + '). A gestora comercial passa a usar a versão nova nas próximas sugestões.' };
  }
  var r = { metodologia: Com_metodologia_(), podeEditar: eu.gestao, padrao: eu.gestao ? COM_METODOLOGIA_PADRAO : null };
  if (eu.gestao) {
    r.aprendizado = ComG_aprendizado_();
    r.versoes = Com_ler_(COM_ABAS.CONFIG).filter(function (c) { return Com_s_(c.CHAVE) === 'METODOLOGIA'; }).map(function (c) { return { versao: Number(c.VERSAO), em: Com_br_(c.ATUALIZADO_EM), por: Com_s_(c.ATUALIZADO_POR_NOME), motivo: Com_s_(c.MOTIVO) }; })
      .sort(function (a, b) { return b.versao - a.versao; });
    r.equipeSgo = Object.keys(Com_usuarios_()).map(function (id) { var u = Com_usuarios_()[id]; return u.ativo ? { id: id, nome: u.nome, perfil: u.perfil } : null; }).filter(Boolean)
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }
  return r;
}

var COM_ACOES = {
  iniciar: function (eu) { var b = Com_inicio_(eu); if (eu.nivel !== 'NENHUM') { try { Com_garantirAbas_(); ComCt_migrarUmaVez_(); } catch (e) {} b.avisos = Com_avisosDe_(eu); } return b; },
  acesso: function (eu) { return { nivel: eu.nivel, gestao: eu.gestao, vendedor: eu.vendedor, financeiro: eu.financeiro, catalogo: !!eu.catalogo }; },
  avisosLidos: function (eu) { return { marcados: Com_marcarAvisosLidos_(eu) }; },
  hoje: function (eu, sid, d) { return ComG_hoje_(eu, d); },
  decidirSugestao: function (eu, sid, d) { return ComG_decidirSugestao_(eu, d); },
  proximoPasso: function (eu, sid, d) { return ComG_proximoPasso_(eu, d); },
  revisarProposta: function (eu, sid, d) { return ComG_revisarProposta_(eu, d); },
  perguntar: function (eu, sid, d) { return ComG_perguntar_(eu, d); },
  clientes: function (eu, sid, d) { return { clientes: Com_buscarClientes_(eu, d) }; },
  cliente: function (eu, sid, d) { return Com_unidadesEquip_(eu, d); },
  doCliente: function (eu, sid, d) { return Com_doCliente_(eu, d); },
  salvarContato: function (eu, sid, d) { return { contato: ComCt_salvar_(eu, d), message: 'Contato salvo.' }; },
  inativarContato: function (eu, sid, d) { return ComCt_inativar_(eu, d && d.id, d && d.motivo); },
  oportunidades: function (eu, sid, d) { var info = {}; var l = ComOpo_listar_(eu, d, info); return { oportunidades: l, foraDoFiltro: info.foraDoFiltro || 0 }; },
  oportunidade: function (eu, sid, d) { return ComOpo_detalhe_(eu, d && d.id); },
  salvarOportunidade: function (eu, sid, d) { return ComOpo_salvar_(eu, sid, d); },
  moverEtapa: function (eu, sid, d) { return ComOpo_moverEtapa_(eu, sid, d); },
  // 21/10/2026: quadro do funil (Kanban), Gantt comercial e a especialista (SGO_Comercial_Quadro.js e SGO_Comercial_Gestora.js)
  criteriosEtapa: function (eu, sid, d) { return ComOpo_criteriosTela_(eu, d); },
  quadro: function (eu, sid, d) { return ComQ_quadro_(eu, d); },
  gantt: function (eu, sid, d) { return ComQ_gantt_(eu, d); },
  especialista: function (eu, sid, d) { return ComG_especialista_(eu, d); },
  leituraFunil: function (eu, sid, d) { return ComG_leituraFunil_(eu, d); },
  registrarContato: function (eu, sid, d) { return ComOpo_registrarContato_(eu, sid, d); },
  ganhar: function (eu, sid, d) { return ComOpo_ganhar_(eu, d); },
  perder: function (eu, sid, d) { return ComOpo_perder_(eu, d); },
  pedirReabertura: function (eu, sid, d) { return ComOpo_pedirReabertura_(eu, d); },
  reabrir: function (eu, sid, d) { return ComOpo_reabrir_(eu, sid, d); },
  catalogo: function (eu, sid, d) { return ComP_catalogo_(eu, d); },
  salvarProduto: function (eu, sid, d) { return ComP_salvarProduto_(eu, d); },
  arquivarProduto: function (eu, sid, d) { return ComP_arquivarProduto_(eu, d); },
  propostas: function (eu, sid, d) { var info = {}; var l = ComP_listar_(eu, d, info); return { propostas: l, foraDoFiltro: info.foraDoFiltro || 0 }; },
  proposta: function (eu, sid, d) { return { proposta: ComP_detalhe_(eu, d && d.id) }; },
  novaProposta: function (eu, sid, d) { return ComP_nova_(eu, d); },
  salvarProposta: function (eu, sid, d) { return ComP_salvar_(eu, d); },
  concluirProposta: function (eu, sid, d) { return ComP_concluir_(eu, d); },
  decidirDesconto: function (eu, sid, d) { return ComP_decidirDesconto_(eu, d); },
  voltarRascunho: function (eu, sid, d) { return ComP_voltarRascunho_(eu, d); },
  gerarDocumento: function (eu, sid, d) { return ComP_gerarDocumento_(eu, d); },
  marcarEnviada: function (eu, sid, d) { return ComP_marcarEnviada_(eu, d); },
  sincronizarEnvios: function (eu) { Com_exigir_(eu, 'VENDEDOR', 'conferir os envios'); return { atualizadas: ComP_sincronizarEnvios_() }; },
  novaRevisao: function (eu, sid, d) { return ComP_novaRevisao_(eu, d); },
  cancelarProposta: function (eu, sid, d) { return ComP_cancelar_(eu, d); },
  respostaCliente: function (eu, sid, d) { return ComP_registrarResposta_(eu, sid, d); },
  opcoesPassagem: function (eu, sid, d) { return ComP_opcoesPassagem_(eu, d); },
  passarSetores: function (eu, sid, d) { return ComP_passarSetores_(eu, d); },
  pedidos: function (eu, sid, d) { return { pedidos: ComP_pedidos_(eu, d) }; },
  painel: function (eu, sid, d) { return Com_painel_(eu, d); },
  relatorioMes: function (eu, sid, d) {
    Com_exigir_(eu, 'GESTAO', 'gerar o relatório mensal');
    var comp = /^\d{4}-\d{2}$/.test(Com_s_(d && d.competencia)) ? Com_s_(d.competencia) : Com_hoje_().slice(0, 7);
    var g = Comercial_relatorioMes_(comp, eu.nome);
    return { html: typeof RelA4_injetarAvisos_ === 'function' ? RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_({ salvo: g.salvo, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, aviso: g.salvo ? '' : g.aviso }, [{ aviso: g.salvo ? g.aviso : '' }])) : g.html, salvo: g.salvo, pdfUrl: g.pdfUrl };
  },
  metodologia: function (eu, sid, d) { return Com_metodologiaTela_(eu, d); }
};

/** google.script.run: Comercial_api(sessionId, acao, dados). Nunca lança. */
function Comercial_api(sessionId, acao, dados) {
  try {
    var fn = COM_ACOES[Com_s_(acao)];
    if (!fn) return { ok: false, message: 'Ação do Comercial desconhecida (' + Com_s_(acao) + '). Atualize a página (F5) e tente de novo.' };
    var eu = Com_eu_(sessionId);
    if (eu.perfil === 'CLIENTE') return { ok: false, message: 'O Comercial é da equipe interna da Metrolabs.' };
    if (acao !== 'iniciar' && acao !== 'acesso' && acao !== 'doCliente' && eu.nivel === 'NENHUM') return { ok: false, semAcesso: true, message: 'Não foi possível abrir: ' + COM_MSG_SEM_ACESSO + '.' };
    if (eu.nivel !== 'NENHUM' && acao !== 'acesso') { try { Com_garantirAbas_(); } catch (e) {} }
    var r = fn(eu, sessionId, dados || {});
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, message: (/^Não foi possível|^A proposta|^Escreva/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  }
}
