/****************************************************
 * COMERCIAL — QUADRO DO FUNIL (KANBAN), GANTT COMERCIAL E TEMPO POR ETAPA (21/10/2026)
 *
 * Pedido do dono (21/10/2026): "Kanban, Gantt e IA especialista em comercial".
 *
 * QUADRO (Kanban): colunas = etapas do funil escolhido (Engenharia ou Produtos) + Ganhas + Perdidas do período.
 *   Cartão = oportunidade: cliente, valor (só para quem vê valores), próxima ação e data, dias sem contato, dias na
 *   etapa e selos (proposta, desconto aguardando aprovação, parada, atrasada...). Soltar o cartão em outra etapa NÃO
 *   grava direto: a tela pergunta ao servidor o que a metodologia exige (ComOpo_criteriosMudanca_), mostra a lista da
 *   etapa para o vendedor confirmar e o que falta (com o caminho na tela) e só então chama moverEtapa, que confere
 *   tudo de novo. Ganha pede o aceite do cliente na proposta enviada; Perdida pede motivo e aprendizado.
 * GANTT: uma linha por oportunidade (ou agrupadas por vendedor), barra da criação à previsão de fechamento, marcos
 *   (proposta enviada, validade, retornos combinados em Minhas atividades, pedido aprovado, passagem aos setores),
 *   atraso em vermelho. Só leitura: clicar abre a ficha.
 * TEMPO POR ETAPA: pelo histórico (COM_HISTORICO: criação, mudanças de etapa, ganho, perda), quanto tempo cada
 *   oportunidade ficou em cada etapa, comparado ao máximo de dias da metodologia.
 * LEITURA DO FUNIL: regras aqui (ComQ_leituraRegras_); a gestora (IA, conferida pelo verificador) reescreve em
 *   SGO_Comercial_Gestora.js › ComG_leituraFunil_.
 *
 * Permissões: as do módulo (Com_exigir_ / ComOpo_podeVer_). Vendedor vê só as próprias; gestão vê todas e filtra por
 * vendedor; Financeiro, Técnico, Metrologia e RH não abrem. Valor só com eu.veValores. Nenhuma função devolve Date.
 ****************************************************/

var COM_Q_MAX_LINHAS = 300;
var COM_Q_FECHADAS_MAX = 30;

/** Tudo o que o quadro e o Gantt leem, uma leitura por tabela. */
function ComQ_base_() {
  var met = Com_metodologia_(), agora = Com_agora_();
  var b = { met: met, agora: agora, hoje: agora.slice(0, 10), atividades: ComOpo_mapaAtividades_(), oportunidades: Com_ler_(COM_ABAS.OPORTUNIDADES),
    propostas: Com_ler_(COM_ABAS.PROPOSTAS), contatosReg: Com_ler_(COM_ABAS.CONTATOS_REG), historico: Com_ler_(COM_ABAS.HISTORICO), equipamentos: {}, produtos: {} };
  Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { b.equipamentos[Com_s_(e.ID)] = e; });
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { b.produtos[Com_s_(p.ID)] = p; });
  b.propsPorOpo = {};
  b.propostas.forEach(function (p) { (b.propsPorOpo[Com_s_(p.OPORTUNIDADE_ID)] = b.propsPorOpo[Com_s_(p.OPORTUNIDADE_ID)] || []).push(p); });
  return b;
}

/** Filtros da tela, conferidos. f: { funil, responsavelId, busca, area, de, ate, agrupar } */
function ComQ_filtro_(eu, f, met) {
  f = f || {};
  var hoje = Com_hoje_();
  var de = Com_dia_(f.de) || Com_somarDias_(hoje, -90), ate = Com_dia_(f.ate) || Com_somarDias_(hoje, 90);
  if (de > ate) throw new Error('Não foi possível montar: o período começa depois de terminar (' + Com_brDia_(de) + ' a ' + Com_brDia_(ate) + '). Ajuste as datas "De" e "Até" e toque em Atualizar');
  if (Com_diasEntre_(de, ate) > 731) throw new Error('Não foi possível montar: o período passa de 2 anos (' + Com_brDia_(de) + ' a ' + Com_brDia_(ate) + '). Escolha um período menor');
  var funil = Com_s_(f.funil);
  if (funil && !Com_funil_(funil, met)) funil = '';
  return { funil: funil, responsavelId: eu.gestao ? Com_s_(f.responsavelId) : '', busca: Com_s_(f.busca).toLowerCase(), area: Com_s_(f.area), de: de, ate: ate,
    agrupar: Com_s_(f.agrupar) === 'vendedor' ? 'vendedor' : 'oportunidade' };
}

/** Áreas de uma oportunidade: tipo dos equipamentos ligados e categoria dos itens do catálogo nas propostas. */
function ComQ_areasDe_(o, b) {
  var l = [];
  var add = function (v) { v = Com_s_(v); if (v && l.indexOf(v) < 0) l.push(v); };
  Com_s_(o.EQUIPAMENTOS_IDS).split(',').map(Com_s_).filter(Boolean).forEach(function (id) { var e = b.equipamentos[id]; if (e) add(e.TIPO); });
  (b.propsPorOpo[Com_s_(o.ID)] || []).forEach(function (p) {
    if (Com_up_(p.SITUACAO) === 'CANCELADA') return;
    Com_json_(p.ITENS_JSON, []).forEach(function (i) { var pr = i && i.produtoId ? b.produtos[Com_s_(i.produtoId)] : null; if (pr) add(pr.CATEGORIA); });
  });
  return l;
}

/** Intervalo da oportunidade no tempo: início (criação), previsão, fim (ganho/perda) e até onde a barra vai. */
function ComQ_intervalo_(o, hoje) {
  var s = Com_up_(o.SITUACAO || 'ABERTA');
  var inicio = Com_dia_(o.CRIADO_EM) || hoje, prev = Com_dia_(o.PREVISAO_FECHAMENTO);
  var fim = s === 'GANHA' ? Com_dia_(o.GANHA_EM) : s === 'PERDIDA' ? Com_dia_(o.PERDIDA_EM) : '';
  var ate = s === 'ABERTA' ? [prev || hoje, hoje].sort()[1] : (fim || prev || inicio);
  return { situacao: s, inicio: inicio, previsao: prev, fim: fim, ate: ate < inicio ? inicio : ate };
}

/** Oportunidades visíveis que passam nos filtros. funilObrigatorio: só as do funil (quadro). */
function ComQ_selecionar_(eu, b, fl) {
  return b.oportunidades.filter(function (o) {
    if (!ComOpo_podeVer_(eu, o)) return false;
    if (fl.funil && Com_s_(o.FUNIL) !== fl.funil) return false;
    if (fl.responsavelId && Com_s_(o.RESPONSAVEL_ID) !== fl.responsavelId) return false;
    // 27/10/2026: sem acento e por partes, igual à lista de oportunidades
    if (fl.busca && !Com_casaBusca_(Com_termosBusca_(fl.busca), ComOpo_textoBusca_(o))) return false;
    if (fl.area && ComQ_areasDe_(o, b).indexOf(fl.area) < 0) return false;
    var iv = ComQ_intervalo_(o, b.hoje);
    return iv.inicio <= fl.ate && iv.ate >= fl.de;
  });
}

/** Lista de áreas disponíveis (para o filtro), das oportunidades que a pessoa vê. */
function ComQ_areasDisponiveis_(eu, b) {
  var l = [];
  b.oportunidades.forEach(function (o) { if (ComOpo_podeVer_(eu, o)) ComQ_areasDe_(o, b).forEach(function (a) { if (l.indexOf(a) < 0) l.push(a); }); });
  return l.sort(function (a, c) { return a.localeCompare(c, 'pt-BR'); });
}

/** Proposta que representa a oportunidade no cartão (a mais recente que não foi cancelada nem substituída). */
function ComQ_propostaAtual_(lista) {
  var l = (lista || []).filter(function (p) { return ['CANCELADA', 'SUBSTITUIDA'].indexOf(Com_up_(p.SITUACAO)) < 0; });
  l.sort(function (a, c) { return String(c.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); });
  return l[0] || null;
}

/** Cartão do quadro. Sem valor para quem não vê valores. */
function ComQ_cartao_(eu, o, b) {
  var d = ComOpo_derivados_(o, { met: b.met, agora: b.agora, atividades: b.atividades });
  var s = Com_up_(o.SITUACAO || 'ABERTA'), props = b.propsPorOpo[Com_s_(o.ID)] || [];
  var p = ComQ_propostaAtual_(props);
  var selos = [];
  if (s === 'ABERTA') {
    if (d.semProxima) selos.push({ texto: 'Sem próxima ação', cor: 'vermelho' });
    if (d.atrasada) selos.push({ texto: 'Retorno atrasado', cor: 'vermelho' });
    if (d.parada) selos.push({ texto: 'Parada há ' + d.diasSemContato + ' dias', cor: 'vermelho' });
    else if (d.esfriando) selos.push({ texto: 'Esfriando', cor: 'laranja' });
    if (d.estagnada) selos.push({ texto: d.diasNaEtapa + ' dias na etapa (meta ' + d.maxDias + ')', cor: 'laranja' });
    if (d.hoje) selos.push({ texto: 'Retorno hoje', cor: 'azul' });
    if (Com_dia_(o.PREVISAO_FECHAMENTO) && Com_dia_(o.PREVISAO_FECHAMENTO) < b.hoje) selos.push({ texto: 'Previsão de fechamento vencida', cor: 'laranja' });
  }
  if (props.some(function (x) { return Com_up_(x.SITUACAO) === 'AGUARDANDO_APROVACAO'; })) selos.push({ texto: 'Desconto aguardando aprovação', cor: 'laranja' });
  if (p) selos.push({ texto: 'Proposta: ' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || Com_s_(p.SITUACAO)).toLowerCase(), cor: Com_up_(p.SITUACAO) === 'APROVADA' ? 'verde' : Com_up_(p.SITUACAO) === 'VENCIDA' || Com_up_(p.SITUACAO) === 'RECUSADA' ? 'vermelho' : 'azul' });
  if (s === 'GANHA' && props.some(function (x) { return Com_up_(x.SITUACAO) === 'APROVADA' && (!Com_s_(x.PEDIDO_SITUACAO) || Com_up_(x.PEDIDO_SITUACAO) === 'SEM_PASSAGEM'); })) selos.push({ texto: 'Pedido sem passagem aos setores', cor: 'vermelho' });
  var c = {
    id: Com_s_(o.ID), codigo: Com_s_(o.CODIGO), titulo: Com_s_(o.TITULO), cliente: Com_s_(o.CLIENTE_NOME), unidade: Com_s_(o.UNIDADE_NOME), etapa: Com_s_(o.ETAPA), situacao: s,
    responsavelId: Com_s_(o.RESPONSAVEL_ID), responsavel: Com_s_(o.RESPONSAVEL_NOME), proximaAcao: s === 'ABERTA' ? Com_s_(o.PROXIMA_ACAO) : '', proximaEm: s === 'ABERTA' ? Com_br_(d.proximaEm || o.PROXIMA_ACAO_EM) : '',
    proximaTipo: COM_TIPOS_CONTATO[Com_up_(o.PROXIMA_ACAO_TIPO)] || '', diasSemContato: d.diasSemContato, diasNaEtapa: d.diasNaEtapa, maxDias: d.maxDias, previsao: Com_brDia_(o.PREVISAO_FECHAMENTO),
    fechadaEm: s === 'GANHA' ? Com_brDia_(o.GANHA_EM) : s === 'PERDIDA' ? Com_brDia_(o.PERDIDA_EM) : '', motivoPerda: s === 'PERDIDA' ? Com_s_(o.MOTIVO_PERDA) : '',
    selos: selos, podeMover: s === 'ABERTA' && (eu.gestao || Com_s_(o.RESPONSAVEL_ID) === eu.id),
    proposta: p ? { id: Com_s_(p.ID), rotulo: ComP_rotulo_(p), situacao: Com_up_(p.SITUACAO), situacaoNome: COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || '' } : null,
    propostasEnviadas: props.filter(function (x) { return ['ENVIADA', 'VENCIDA'].indexOf(Com_up_(x.SITUACAO)) >= 0; }).map(function (x) { return { id: Com_s_(x.ID), rotulo: ComP_rotulo_(x), situacaoNome: COM_SITUACOES_PROP[Com_up_(x.SITUACAO)] || '', validaAte: Com_brDia_(x.VALIDA_ATE) }; })
  };
  if (eu.veValores) { c.valor = Number(o.VALOR_ESTIMADO) || 0; c.valorTxt = Com_moeda_(c.valor); c.ponderado = d.ponderado; }
  c._der = d; c._prev = Com_dia_(o.PREVISAO_FECHAMENTO);
  return c;
}

/** Tempo em cada etapa pelo histórico (dias corridos, como o máximo de dias da metodologia). ops: só deste funil. */
function ComQ_temposPorEtapa_(b, f, ops) {
  var codigoDe = {};
  f.etapas.forEach(function (e) { codigoDe[ComOpo_chaveItem_(e.nome)] = e.codigo; codigoDe[ComOpo_chaveItem_(e.codigo)] = e.codigo; });
  var cod = function (nome) { return codigoDe[ComOpo_chaveItem_(nome)] || ''; };
  var acc = {};
  f.etapas.forEach(function (e) { acc[e.codigo] = { duracoes: [], atuais: [], acima: 0 }; });
  var ids = {};
  ops.forEach(function (o) { ids[Com_s_(o.ID)] = o; });
  var porOpo = {};
  b.historico.forEach(function (h) {
    if (Com_s_(h.ENTIDADE) !== 'OPORTUNIDADE' || !ids[Com_s_(h.ENTIDADE_ID)]) return;
    if (['CRIACAO', 'ETAPA', 'GANHA', 'PERDIDA', 'REABERTA'].indexOf(Com_s_(h.TIPO)) < 0) return;
    (porOpo[Com_s_(h.ENTIDADE_ID)] = porOpo[Com_s_(h.ENTIDADE_ID)] || []).push(h);
  });
  Object.keys(ids).forEach(function (id) {
    var o = ids[id], ev = (porOpo[id] || []).slice().sort(function (x, y) { return String(Com_iso_(x.DATA)).localeCompare(String(Com_iso_(y.DATA))); });
    var atual = '', desde = '', ultima = '';
    var fecha = function (dia) { if (atual && desde && acc[atual]) { var n = Com_diasEntre_(desde, dia); if (n !== null && n >= 0) acc[atual].duracoes.push(n); } };
    ev.forEach(function (h) {
      var dia = Com_dia_(h.DATA), t = Com_s_(h.TIPO);
      if (!dia) return;
      if (t === 'CRIACAO') { atual = cod(h.PARA); desde = dia; ultima = atual; }
      else if (t === 'ETAPA') { var para = cod(h.PARA); if (!para) return; fecha(dia); atual = para; desde = dia; ultima = para; }
      else if (t === 'GANHA' || t === 'PERDIDA') { fecha(dia); atual = ''; desde = ''; }
      else if (t === 'REABERTA') { atual = ultima; desde = dia; }
    });
    if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA' && acc[Com_s_(o.ETAPA)]) {
      var d = ComOpo_derivados_(o, { met: b.met, agora: b.agora, atividades: b.atividades });
      acc[Com_s_(o.ETAPA)].atuais.push(d.diasNaEtapa);
      if (d.maxDias && d.diasNaEtapa > d.maxDias) acc[Com_s_(o.ETAPA)].acima++;
    }
  });
  var media = function (l) { return l.length ? Math.round(l.reduce(function (s, x) { return s + x; }, 0) / l.length * 10) / 10 : null; };
  return f.etapas.map(function (e) {
    var a = acc[e.codigo], m = media(a.duracoes), ma = media(a.atuais);
    return { codigo: e.codigo, nome: e.nome, maxDias: Number(e.maxDias) || 0, passagens: a.duracoes.length, mediaDias: m, mediaTxt: m === null ? '—' : SGO_DocA4_num_(m, 1) + ' dias',
      atuais: a.atuais.length, mediaAtuais: ma, mediaAtuaisTxt: ma === null ? '—' : SGO_DocA4_num_(ma, 1) + ' dias', acimaDoPrazo: a.acima,
      acimaDaMeta: m !== null && Number(e.maxDias) > 0 && m > Number(e.maxDias) };
  });
}

/** Oportunidades em risco (abertas), com os motivos pelas regras. Ordenadas pela gravidade e pelo valor. */
function ComQ_emRisco_(eu, b, cartoes) {
  var c = b.met.cadencia || {};
  return cartoes.filter(function (k) { return k.situacao === 'ABERTA'; }).map(function (k) {
    var d = k._der, m = [], peso = 0;
    if (d.semProxima) { m.push('sem próxima ação'); peso += 5; }
    if (d.parada) { m.push('parada há ' + d.diasSemContato + ' dias sem contato'); peso += 4; }
    if (d.atrasada) { m.push('retorno atrasado'); peso += 3; }
    if (d.estagnada) { m.push(d.diasNaEtapa + ' dias na etapa (meta ' + d.maxDias + ')'); peso += 2; }
    if (d.mudarEstrategia) { m.push('várias tentativas sem resposta'); peso += 2; }
    var prev = k._prev;
    if (prev && prev < b.hoje) { m.push('previsão de fechamento vencida em ' + Com_brDia_(prev)); peso += 1; }
    (b.propsPorOpo[k.id] || []).forEach(function (p) {
      if (Com_up_(p.SITUACAO) !== 'ENVIADA') return;
      var falta = Com_dia_(p.VALIDA_ATE) ? Com_diasEntre_(b.hoje, Com_dia_(p.VALIDA_ATE)) : 99;
      if (falta <= (Number(c.propostaVencendoDias) || 3)) { m.push('proposta ' + ComP_rotulo_(p) + ' vence em ' + Com_brDia_(p.VALIDA_ATE)); peso += 2; }
    });
    var r = { id: k.id, codigo: k.codigo, cliente: k.cliente, responsavel: k.responsavel, etapa: k.etapa, motivos: m, peso: peso };
    if (eu.veValores) { r.valor = k.valor; r.valorTxt = k.valorTxt; }
    return r;
  }).filter(function (r) { return r.motivos.length; }).sort(function (x, y) { return y.peso - x.peso || (y.valor || 0) - (x.valor || 0); });
}

/** Leitura do funil pelas regras (sempre sai, sem IA): gargalos, em risco e tempo por etapa contra a meta. */
function ComQ_leituraRegras_(eu, f, colunas, tempos, risco) {
  var abertas = colunas.reduce(function (s, c) { return s + c.qtd; }, 0);
  var gargalos = [];
  tempos.forEach(function (t, i) {
    var col = colunas[i] || { qtd: 0 };
    var motivos = [];
    if (t.acimaDaMeta) motivos.push('média de ' + t.mediaTxt + ' para sair (meta: até ' + t.maxDias + ' dias, ' + Com_plural_(t.passagens, 'passagem', 'passagens') + ')');
    if (t.acimaDoPrazo) motivos.push(t.acimaDoPrazo + ' de ' + t.atuais + ' acima do prazo agora');
    if (abertas >= 4 && col.qtd * 10 >= abertas * 4) motivos.push(col.qtd + ' de ' + abertas + ' oportunidades abertas estão aqui');
    if (motivos.length) gargalos.push({ etapa: t.codigo, nome: t.nome, texto: 'Etapa ' + t.nome + ': ' + motivos.join('; ') + '.' });
  });
  var par = [];
  par.push('Funil ' + f.nome + ': ' + Com_plural_(abertas, 'oportunidade aberta', 'oportunidades abertas') + ' no quadro' + (eu.veValores ? ' (' + Com_moeda_(colunas.reduce(function (s, c) { return s + (c.valor || 0); }, 0)) + ' em aberto)' : '') + '.');
  if (gargalos.length) par.push('Gargalos: ' + gargalos.map(function (g) { return g.texto; }).join(' '));
  else par.push('Nenhuma etapa acima da meta de tempo da metodologia.');
  if (risco.length) par.push(Com_plural_(risco.length, 'oportunidade em risco', 'oportunidades em risco') + ': ' + risco.slice(0, 5).map(function (r) { return r.codigo + ' (' + r.cliente + ': ' + r.motivos.join(', ') + ')'; }).join('; ') + (risco.length > 5 ? '; e mais ' + (risco.length - 5) + '.' : '.'));
  else par.push('Nenhuma oportunidade em risco pelas regras da cadência.');
  return { texto: par.join('\n\n'), gargalos: gargalos.map(function (g) { return g.texto; }), riscos: risco.slice(0, 10).map(function (r) { return r.codigo + ' · ' + r.cliente + ': ' + r.motivos.join(', ') + '.'; }), origem: 'REGRAS' };
}

/** Monta o quadro (dados prontos para a tela, a leitura das regras e o tempo por etapa). */
function ComQ_montar_(eu, d) {
  var b = ComQ_base_(), fl = ComQ_filtro_(eu, d, b.met);
  if (!fl.funil) fl.funil = b.met.funis[0].codigo;
  var f = Com_funil_(fl.funil, b.met);
  var sel = ComQ_selecionar_(eu, b, fl);
  var colunas = f.etapas.map(function (e) { return { codigo: e.codigo, nome: e.nome, probabilidade: Number(e.probabilidade) || 0, maxDias: Number(e.maxDias) || 0, criterio: Com_s_(e.criterio), checklist: e.checklist || [], qtd: 0, valor: 0, ponderado: 0, cartoes: [] }; });
  var porEtapa = {};
  colunas.forEach(function (c) { porEtapa[c.codigo] = c; });
  var ganhas = { codigo: 'GANHA', nome: 'Ganhas no período', qtd: 0, valor: 0, cartoes: [] }, perdidas = { codigo: 'PERDIDA', nome: 'Perdidas no período', qtd: 0, valor: 0, cartoes: [] };
  var abertosCartoes = [];
  sel.forEach(function (o) {
    var s = Com_up_(o.SITUACAO || 'ABERTA');
    var c = ComQ_cartao_(eu, o, b);
    if (s === 'ABERTA') {
      var col = porEtapa[Com_s_(o.ETAPA)] || colunas[0];
      col.cartoes.push(c); col.qtd++; if (eu.veValores) { col.valor += c.valor; col.ponderado += c.ponderado; }
      abertosCartoes.push(c);
      return;
    }
    var iv = ComQ_intervalo_(o, b.hoje);
    if (!iv.fim || iv.fim < fl.de || iv.fim > fl.ate) return;
    var alvo = s === 'GANHA' ? ganhas : perdidas;
    alvo.cartoes.push(c); alvo.qtd++; if (eu.veValores) alvo.valor += c.valor;
  });
  var ordem = function (x, y) { return (y.selos.length - x.selos.length) || String(x.proximaEm).localeCompare(String(y.proximaEm)); };
  colunas.forEach(function (c) { c.cartoes.sort(ordem); });
  [ganhas, perdidas].forEach(function (c) { c.cartoes.sort(function (x, y) { return String(y.fechadaEm.split('/').reverse().join('')).localeCompare(String(x.fechadaEm.split('/').reverse().join(''))); }); c.cartoes = c.cartoes.slice(0, COM_Q_FECHADAS_MAX); });
  var tempos = ComQ_temposPorEtapa_(b, f, sel);
  var risco = ComQ_emRisco_(eu, b, abertosCartoes);
  var leitura = ComQ_leituraRegras_(eu, f, colunas, tempos, risco);
  [colunas, [ganhas, perdidas]].forEach(function (grupo) { grupo.forEach(function (c) {
    if (eu.veValores) { c.valorTxt = Com_moeda_(c.valor); if (c.ponderado !== undefined) c.ponderadoTxt = Com_moeda_(c.ponderado); } else { delete c.valor; delete c.ponderado; }
    c.cartoes.forEach(function (k) { delete k._der; delete k._prev; });
  }); });
  return { b: b, fl: fl, f: f, colunas: colunas, ganhas: ganhas, perdidas: perdidas, tempos: tempos, risco: risco, leitura: leitura, abertas: abertosCartoes.length };
}

/** Ação "quadro" da tela. */
function ComQ_quadro_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'abrir o quadro do funil');
  var m = ComQ_montar_(eu, d);
  var risco = m.risco.slice(0, 10);
  return {
    funil: { codigo: m.f.codigo, nome: m.f.nome, descricao: Com_s_(m.f.descricao) }, colunas: m.colunas, ganhas: m.ganhas, perdidas: m.perdidas, tempos: m.tempos,
    emRisco: risco, leitura: m.leitura, filtros: m.fl, areas: ComQ_areasDisponiveis_(eu, m.b), equipe: eu.gestao ? Com_equipeComercial_() : [], veValores: !!eu.veValores,
    iaDisponivel: ComG_iaDisponivel_(), hoje: Com_brDia_(m.b.hoje), periodoTxt: Com_brDia_(m.fl.de) + ' a ' + Com_brDia_(m.fl.ate), avanco: m.b.met.avanco || {}
  };
}

// ------------------------------------------------------------
// GANTT COMERCIAL
// ------------------------------------------------------------
/** Marcos de uma oportunidade: proposta enviada, validade, retornos combinados, pedido aprovado e passagem aos setores. */
function ComQ_marcos_(o, b) {
  var l = [], props = b.propsPorOpo[Com_s_(o.ID)] || [], agora = b.agora, ids = {};
  if (Com_s_(o.ATIVIDADE_ID)) ids[Com_s_(o.ATIVIDADE_ID)] = true;
  props.forEach(function (p) {
    var s = Com_up_(p.SITUACAO), rot = ComP_rotulo_(p);
    if (Com_s_(p.RETORNO_ATIVIDADE_ID)) ids[Com_s_(p.RETORNO_ATIVIDADE_ID)] = true;
    if (s === 'CANCELADA') return;
    if (Com_dia_(p.ENVIADA_EM)) l.push({ tipo: 'ENVIO', dia: Com_dia_(p.ENVIADA_EM), rotulo: 'Proposta ' + rot + ' enviada', atrasado: false });
    if (Com_dia_(p.ENVIADA_EM) && Com_dia_(p.VALIDA_ATE) && s !== 'SUBSTITUIDA') l.push({ tipo: 'VALIDADE', dia: Com_dia_(p.VALIDA_ATE), rotulo: 'Validade da ' + rot + (s === 'VENCIDA' ? ' (venceu sem resposta)' : ''), atrasado: s === 'VENCIDA' || (s === 'ENVIADA' && Com_dia_(p.VALIDA_ATE) < b.hoje) });
    if (s === 'APROVADA' && Com_dia_(p.RESPOSTA_EM)) l.push({ tipo: 'APROVADO', dia: Com_dia_(p.RESPOSTA_EM), rotulo: 'Pedido aprovado pelo cliente (' + rot + ')', atrasado: false });
    if (Com_dia_(p.PASSAGEM_EM)) l.push({ tipo: 'PASSAGEM', dia: Com_dia_(p.PASSAGEM_EM), rotulo: 'Passagem aos setores (' + rot + ')' + (Com_dia_(p.PASSAGEM_CONCLUIDA_EM) ? ', concluída em ' + Com_brDia_(p.PASSAGEM_CONCLUIDA_EM) : ''), atrasado: false });
    else if (s === 'APROVADA' && Com_dia_(p.RESPOSTA_EM)) {
      var du = Com_diasUteisEntre_(Com_dia_(p.RESPOSTA_EM), b.hoje);
      if (du >= (Number(b.met.posVenda.pedidoParadoDiasUteis) || 1)) l.push({ tipo: 'PASSAGEM', dia: b.hoje, rotulo: 'Pedido aprovado sem passagem aos setores há ' + Com_plural_(du, 'dia útil', 'dias úteis'), atrasado: true, pendente: true });
    }
  });
  var onde = 'Comercial > Oportunidades > ' + Com_s_(o.CODIGO);
  Object.keys(b.atividades).forEach(function (id) {
    var a = b.atividades[id];
    if (!ids[id] && !(Com_s_(a.MODULO) === 'comercial' && Com_s_(a.ONDE) === onde)) return;
    if (Com_s_(a.SITUACAO) === 'Cancelada') return;
    var prev = Com_iso_(a.PREVISAO_ATUAL || a.PRAZO);
    if (!prev) return;
    var aberta = Com_atividadeAberta_(a);
    l.push({ tipo: 'RETORNO', dia: prev.slice(0, 10), rotulo: Com_s_(a.TITULO) + ' (' + (aberta ? 'combinado para ' + Com_br_(prev) : 'concluído' + (Com_s_(a.CONCLUIDA_EM) ? ' em ' + Com_brDia_(a.CONCLUIDA_EM) : '')) + ')',
      atrasado: aberta && prev < agora, concluido: !aberta });
  });
  return l.sort(function (x, y) { return x.dia.localeCompare(y.dia); });
}

/** Ação "gantt" da tela. Funil vazio = todos. */
function ComQ_gantt_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'abrir o Gantt comercial');
  var b = ComQ_base_(), fl = ComQ_filtro_(eu, d, b.met);
  var sel = ComQ_selecionar_(eu, b, fl);
  var linhas = sel.map(function (o) {
    var iv = ComQ_intervalo_(o, b.hoje), der = ComOpo_derivados_(o, { met: b.met, agora: b.agora, atividades: b.atividades });
    var f = Com_funil_(Com_s_(o.FUNIL), b.met);
    var l = { id: Com_s_(o.ID), codigo: Com_s_(o.CODIGO), titulo: Com_s_(o.TITULO), cliente: Com_s_(o.CLIENTE_NOME), responsavelId: Com_s_(o.RESPONSAVEL_ID), responsavel: Com_s_(o.RESPONSAVEL_NOME),
      funilNome: f ? f.nome : Com_s_(o.FUNIL), etapaNome: der.etapaNome, situacao: iv.situacao, inicio: iv.inicio, previsao: iv.previsao, fim: iv.fim,
      semPrevisao: !iv.previsao, atrasada: iv.situacao === 'ABERTA' && !!iv.previsao && iv.previsao < b.hoje, parada: der.parada, semProxima: der.semProxima,
      inicioTxt: Com_brDia_(iv.inicio), previsaoTxt: Com_brDia_(iv.previsao), fimTxt: Com_brDia_(iv.fim), marcos: ComQ_marcos_(o, b), podeMover: iv.situacao === 'ABERTA' && (eu.gestao || Com_s_(o.RESPONSAVEL_ID) === eu.id) };
    l.marcos.forEach(function (m) { m.diaTxt = Com_brDia_(m.dia); });
    if (eu.veValores) l.valorTxt = Com_moeda_(o.VALOR_ESTIMADO);
    return l;
  });
  linhas.sort(function (x, y) { return (fl.agrupar === 'vendedor' ? x.responsavel.localeCompare(y.responsavel, 'pt-BR') : 0) || x.inicio.localeCompare(y.inicio) || x.codigo.localeCompare(y.codigo); });
  var cortadas = linhas.length > COM_Q_MAX_LINHAS ? linhas.length - COM_Q_MAX_LINHAS : 0;
  return { linhas: linhas.slice(0, COM_Q_MAX_LINHAS), cortadas: cortadas, filtros: fl, de: fl.de, ate: fl.ate, hoje: b.hoje, hojeTxt: Com_brDia_(b.hoje), periodoTxt: Com_brDia_(fl.de) + ' a ' + Com_brDia_(fl.ate),
    areas: ComQ_areasDisponiveis_(eu, b), equipe: eu.gestao ? Com_equipeComercial_() : [], veValores: !!eu.veValores, iaDisponivel: ComG_iaDisponivel_() };
}
