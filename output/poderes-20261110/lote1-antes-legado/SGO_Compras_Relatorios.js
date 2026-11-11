/****************************************************
 * COMPRAS — PAINEL (ÍNDICES, KANBAN E GANTT), RELATÓRIOS A4 SALVOS E CUSTO NO CHAMADO E NA PROPOSTA (31/10/2026)
 *
 * Pedido do dono (31/10/2026): "que gere relatório por colaborador, total gasto, formas gastas [...] que tudo possa gerar
 * relatório com índice e gráfico em A4 HTML e que fique salvo para consulta, e que o módulo tenha gráfico de Gantt e Kanban
 * [...] que tudo converse entre todos os módulos do SGO+, tanto sozinho quanto Comercial, Assistência Técnica, Financeiro".
 *
 *  - Painel (compradores, gestores, Financeiro, Diretoria): índices do período, Kanban por situação (leitura; quem muda a
 *    situação é a ficha da compra), Gantt do pedido até a entrega (previsão de entrega como losango vazado, recebimento como
 *    losango cheio) e os gráficos por forma, colaborador, vínculo e mês. O desenho é o comum dos painéis do SGO+
 *    (JS_PainelAtendimento.html: PnA_kanbanHtml_, PnA_ganttHtml_ e a régua SGOGantt).
 *  - Relatórios A4 (moldura SGO_Documentos_RelatorioA4.js): por colaborador, por cliente ou chamado, por forma de pagamento,
 *    total do período e conciliação por cartão e fatura. Cada emissão salva HTML e PDF em "Compras - Relatórios" e fica
 *    registrada em CMP_DOCUMENTOS para abrir de novo pela tela.
 *  - Integração: Compras_custoDoChamado_ (ficha do chamado da Assistência) e Compras_doComercial_ (ficha da proposta),
 *    com valor só para quem pode ver valor.
 * Nenhuma função devolve Date cru: datas em texto e em milissegundos (número).
 ****************************************************/

var CMP_REL_TIPOS = { COLABORADOR: 'Compras por colaborador', CLIENTE: 'Compras por cliente e chamado', FORMA: 'Compras por forma de pagamento', PERIODO: 'Total de compras do período', CONCILIACAO: 'Conciliação da fatura do cartão' };
var CMP_KANBAN_ABERTAS = ['SOLICITADA', 'EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA', 'DISPONIVEL'];
var CMP_REL_PERIODOS = [30, 90, 180, 365];

function CmpRel_ms_(iso) { var s = Cmp_iso_(iso); if (!s) return null; return Date.parse((s.length === 10 ? s + 'T12:00' : s) + ':00-03:00'); }
function CmpRel_periodo_(d) {
  d = d || {};
  var hoje = Cmp_hoje_(), de = Cmp_dia_(d.de), ate = Cmp_dia_(d.ate);
  if (!de || !ate) { var dias = CMP_REL_PERIODOS.indexOf(Number(d.dias)) >= 0 ? Number(d.dias) : 30; ate = hoje; de = Cmp_somarDias_(hoje, -(dias - 1)); }
  if (de > ate) { var t = de; de = ate; ate = t; }
  return { de: de, ate: ate, deBr: Cmp_brDia_(de), ateBr: Cmp_brDia_(ate), texto: Cmp_brDia_(de) + ' a ' + Cmp_brDia_(ate) };
}
function CmpRel_ehChamado_(t) { return /^CH-\d{4}-\d+$/.test(Cmp_s_(t)); }

/** Todas as compras (requisição + pagamento), com os campos que o painel e os relatórios usam. */
function CmpRel_base_() {
  var peds = {}, parc = {};
  Cmp_ler_(CMP_ABAS.PEDIDOS).forEach(function (p) { peds[Cmp_s_(p.ID)] = p; });
  Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) { if (Cmp_up_(x.SITUACAO) !== 'CANCELADA') (parc[Cmp_s_(x.REQUISICAO_ID)] = parc[Cmp_s_(x.REQUISICAO_ID)] || []).push(x); });
  return Cmp_ler_(CMP_ABAS.REQUISICOES).map(function (r) {
    var p = peds[Cmp_s_(r.PEDIDO_ID)] || null, s = Cmp_up_(r.SITUACAO), origem = Cmp_up_(r.ORIGEM);
    var pago = p && Cmp_up_(p.SITUACAO) !== 'CANCELADO' && s !== 'CANCELADA';
    var dia = (p && (Cmp_dia_(p.DATA_COMPRA) || Cmp_dia_(p.PAGO_EM) || Cmp_dia_(p.EMITIDO_EM))) || Cmp_dia_(r.CRIADO_EM);
    var forma = p ? Cmp_up_(p.FORMA_PAGAMENTO) : '';
    var chamado = Cmp_s_(r.CHAMADO_NUMERO) || (CmpRel_ehChamado_(r.OS_AUVO) ? Cmp_s_(r.OS_AUVO) : '');
    return { r: r, p: p, id: Cmp_s_(r.ID), numero: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO), situacao: s, origem: origem === CMP_ORIGEM_INFORMADA ? 'INFORMADA' : (origem === 'SEM_PEDIDO' ? 'SEM_PEDIDO' : 'FLUXO'),
      dia: dia, valor: pago ? Cmp_r2_(Cmp_s_(p.VALOR_PAGO) !== '' ? p.VALOR_PAGO : p.VALOR_TOTAL) : 0, conta: !!pago, forma: forma, formaNome: CMP_FORMAS_PAGAMENTO[forma] || 'Sem pagamento registrado',
      cartao: p ? Cmp_s_(p.CARTAO_FINAL) : '', quem: Cmp_s_(r.COMPRADO_POR_NOME) || (p && Cmp_s_(p.PAGAMENTO_POR_NOME)) || Cmp_s_(r.COMPRADOR_NOME) || Cmp_s_(r.SOLICITANTE_NOME),
      quemId: Cmp_s_(r.COMPRADO_POR_ID) || (p && Cmp_s_(p.PAGAMENTO_POR_ID)) || Cmp_s_(r.COMPRADOR_ID) || Cmp_s_(r.SOLICITANTE_ID),
      cliente: Cmp_s_(r.CLIENTE_NOME), clienteId: Cmp_s_(r.CLIENTE_ID), chamado: chamado, vinculoTipo: Cmp_up_(r.VINCULO_TIPO), vinculo: CmpR_vinculoTexto_(r),
      vinculoNome: chamado ? 'Chamado da Assistência' : (CMP_VINCULOS[Cmp_up_(r.VINCULO_TIPO)] || 'Sem vínculo').replace(/ \(.*\)$/, ''), fornecedor: p ? Cmp_s_(p.FORNECEDOR_NOME) : '',
      apontamentos: Cmp_json_(r.INF_APONTAMENTOS, []), atrasoDias: Cmp_s_(r.INF_ATRASO_DIAS) !== '' ? Number(r.INF_ATRASO_DIAS) : null, finSituacao: p ? Cmp_up_(p.FIN_SITUACAO) : '',
      parcelas: parc[Cmp_s_(r.ID)] || [], area: Cmp_up_(r.SOLICITANTE_AREA), propostaId: Cmp_s_(r.PROPOSTA_ID), propostaNumero: Cmp_s_(r.PROPOSTA_NUMERO) };
  });
}
function CmpRel_doPeriodo_(base, per) { return base.filter(function (c) { return c.conta && c.dia >= per.de && c.dia <= per.ate; }); }
function CmpRel_agrupar_(l, chave, max) {
  var m = {};
  l.forEach(function (c) { var k = chave(c) || 'Não informado'; m[k] = m[k] || { nome: k, qtd: 0, valor: 0 }; m[k].qtd++; m[k].valor = Cmp_r2_(m[k].valor + c.valor); });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'); }).slice(0, max || 50);
}
function CmpRel_soma_(l) { return Cmp_r2_(l.reduce(function (s, c) { return s + c.valor; }, 0)); }

/** Índices do período (números crus; a tela e o A4 formatam). */
function CmpRel_indices_(base, per) {
  var hoje = Cmp_hoje_(), l = CmpRel_doPeriodo_(base, per), inf = l.filter(function (c) { return c.origem === 'INFORMADA'; });
  var comAtraso = inf.filter(function (c) { return c.atrasoDias !== null; }), prazo = Number((Cmp_regras_().informar || {}).prazoDiasUteis);
  if (!(prazo >= 0)) prazo = 2;
  var ext = Cmp_ler_(CMP_ABAS.EXTRATO).filter(function (x) { var dd = Cmp_dia_(x.CRIADO_EM); return dd >= per.de && dd <= per.ate; });
  var extAgora = Cmp_ler_(CMP_ABAS.EXTRATO).filter(function (x) { return Cmp_up_(x.SITUACAO) === 'NAO_INFORMADA'; });
  var fats = Cmp_ler_(CMP_ABAS.FATURAS), parc = Cmp_ler_(CMP_ABAS.PARCELAS);
  var aPagar = parc.filter(function (x) { return Cmp_up_(x.SITUACAO) === 'A_PAGAR'; });
  var abertas = base.filter(function (c) { return CMP_KANBAN_ABERTAS.indexOf(c.situacao) >= 0; });
  var atrasadas = base.filter(function (c) { return c.situacao === 'PEDIDO_FEITO' && Cmp_dia_(c.r.PREVISAO_ENTREGA) && Cmp_dia_(c.r.PREVISAO_ENTREGA) < hoje; });
  var entregues = base.filter(function (c) { var e = Cmp_dia_(c.r.DISPONIVEL_EM) || Cmp_dia_(c.r.ENTREGUE_EM); return c.origem === 'FLUXO' && e >= per.de && e <= per.ate; });
  var ciclo = entregues.map(function (c) { return Cmp_diasEntre_(Cmp_dia_(c.r.CRIADO_EM), Cmp_dia_(c.r.DISPONIVEL_EM) || Cmp_dia_(c.r.ENTREGUE_EM)); }).filter(function (n) { return n !== null && n >= 0; });
  var media = function (a) { return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) * 10 / a.length) / 10 : null; };
  return {
    total: CmpRel_soma_(l), qtd: l.length, informadas: inf.length, informadasValor: CmpRel_soma_(inf), pctInformadas: l.length ? Math.round(inf.length * 1000 / l.length) / 10 : null,
    tempoInformar: media(comAtraso.map(function (c) { return c.atrasoDias; })), pctNoPrazo: comAtraso.length ? Math.round(comAtraso.filter(function (c) { return c.atrasoDias <= prazo; }).length * 1000 / comAtraso.length) / 10 : null,
    comApontamento: l.filter(function (c) { return c.apontamentos.length; }).length, naoInformadasAgora: extAgora.length, naoInformadasValor: Cmp_r2_(extAgora.reduce(function (s, x) { return s + (Number(x.VALOR) || 0); }, 0)),
    lancamentos: ext.length, conciliacao: ext.length ? Math.round(ext.filter(function (x) { return Cmp_up_(x.SITUACAO) === 'CONCILIADA'; }).length * 1000 / ext.length) / 10 : null,
    faturasAbertas: fats.filter(function (f) { return !CmpFat_fechada_(f); }).length, faturasFechadas: fats.filter(function (f) { return Cmp_up_(f.SITUACAO) === 'FECHADA'; }).length, faturasRessalva: fats.filter(function (f) { return Cmp_up_(f.SITUACAO) === 'FECHADA_RESSALVA'; }).length,
    aPagarVencido: aPagar.filter(function (x) { return Cmp_dia_(x.VENCIMENTO) && Cmp_dia_(x.VENCIMENTO) < hoje; }).length, aPagarValor: Cmp_r2_(aPagar.reduce(function (s, x) { return s + (Number(x.VALOR) || 0); }, 0)),
    reembolsos: aPagar.filter(function (x) { return Cmp_up_(x.FORMA) === 'REEMBOLSO'; }).length, abertas: abertas.length, atrasadas: atrasadas.length, cicloMedio: media(ciclo),
    conferenciaAguardando: base.filter(function (c) { return c.finSituacao === 'AGUARDANDO'; }).length, divergentes: base.filter(function (c) { return c.finSituacao === 'DIVERGENTE'; }).length
  };
}

/** Prazo da compra para o Kanban e o Gantt (previsão de entrega). */
function CmpRel_prazo_(c, agoraMs) {
  var prev = Cmp_dia_(c.r.PREVISAO_ENTREGA), fim = Cmp_dia_(c.r.DISPONIVEL_EM) || Cmp_dia_(c.r.RECEBIDA_EM) || Cmp_dia_(c.r.ENTREGUE_EM);
  if (!prev) return { estado: 'SEM_PRAZO', ateMs: null, ate: '', texto: '' };
  var ateMs = CmpRel_ms_(prev + 'T18:00'), aberta = CMP_KANBAN_ABERTAS.indexOf(c.situacao) >= 0 && !fim;
  var estado = aberta ? (ateMs < agoraMs ? 'VENCIDO' : (ateMs - agoraMs < 2 * 864e5 ? 'EM_RISCO' : 'NO_PRAZO')) : (fim && fim > prev ? 'FORA_DO_PRAZO' : 'CUMPRIDO');
  return { estado: estado, ateMs: ateMs, ate: Cmp_brDia_(prev), texto: aberta ? (estado === 'VENCIDO' ? 'Entrega atrasada (previsão ' + Cmp_brDia_(prev) + ')' : 'Previsão de entrega ' + Cmp_brDia_(prev)) : (estado === 'FORA_DO_PRAZO' ? 'Chegou depois da previsão' : 'Chegou no prazo') };
}
function CmpRel_cartao_(c, agoraMs, valores) {
  var ini = CmpRel_ms_(c.r.CRIADO_EM) || CmpRel_ms_(c.dia), fimIso = Cmp_iso_(c.r.DISPONIVEL_EM) || Cmp_iso_(c.r.ENTREGUE_EM) || Cmp_iso_(c.r.CANCELADA_EM);
  if (c.origem === 'INFORMADA' && c.p && Cmp_dia_(c.p.DATA_COMPRA)) ini = Math.min(ini || 9e15, CmpRel_ms_(Cmp_dia_(c.p.DATA_COMPRA) + 'T09:00'));
  var aberta = CMP_KANBAN_ABERTAS.indexOf(c.situacao) >= 0;
  // compra informada com a mercadoria já em mãos: a barra termina na data da compra (não no dia em que foi informada)
  var naMao = c.origem === 'INFORMADA' && c.p && Cmp_dia_(c.p.DATA_COMPRA) && !Cmp_dia_(c.r.PREVISAO_ENTREGA) && c.situacao === 'ENTREGUE';
  if (naMao) fimIso = Cmp_dia_(c.p.DATA_COMPRA) + 'T18:00';
  var o = { tipo: 'compra', id: c.id, numero: c.numero, titulo: c.titulo.slice(0, 90), situacao: c.situacao, situacaoNome: CMP_SITUACOES[c.situacao] || c.situacao, quem: c.quem, vinculo: c.vinculo.slice(0, 90),
    clienteNome: c.cliente, origem: c.origem, urgencia: Cmp_up_(c.r.URGENCIA), prazo: CmpRel_prazo_(c, agoraMs), enviadoMs: ini, fimMs: fimIso ? CmpRel_ms_(fimIso) : null, aberto: aberta,
    visitaPrevMs: Cmp_dia_(c.r.PREVISAO_ENTREGA) ? CmpRel_ms_(Cmp_dia_(c.r.PREVISAO_ENTREGA) + 'T12:00') : null, visitaMs: naMao ? CmpRel_ms_(fimIso) : (Cmp_iso_(c.r.RECEBIDA_EM) ? CmpRel_ms_(c.r.RECEBIDA_EM) : null),
    criado: Cmp_br_(c.r.CRIADO_EM), apontamentos: c.apontamentos.length };
  if (valores) o.valorTxt = c.conta ? Cmp_moeda_(c.valor) : (Cmp_s_(c.r.VALOR_TOTAL) !== '' ? Cmp_moeda_(c.r.VALOR_TOTAL) : '');
  return o;
}

/** Painel. d: { dias (30|90|180|365) ou de/ate } */
function CmpRel_painel_(eu, d) {
  if (!(eu.veFila || eu.financeiro)) Cmp_exigir_(eu, 'FILA', 'ver o painel de compras');
  var per = CmpRel_periodo_(d), base = CmpRel_base_(), agoraMs = Date.now(), limite = Cmp_somarDias_(Cmp_hoje_(), -30);
  var ind = CmpRel_indices_(base, per), l = CmpRel_doPeriodo_(base, per);
  var kanban = CMP_KANBAN_ABERTAS.concat(['ENTREGUE']).map(function (s, i) {
    var fechada = s === 'ENTREGUE';
    var itens = base.filter(function (c) { return c.situacao === s && (!fechada || (Cmp_dia_(c.r.ENTREGUE_EM) || c.dia) >= limite); });
    itens.sort(fechada ? function (a, b) { return String(b.r.ENTREGUE_EM).localeCompare(String(a.r.ENTREGUE_EM)); } : function (a, b) { return String(a.r.CRIADO_EM).localeCompare(String(b.r.CRIADO_EM)); });
    return { n: i, nome: CMP_SITUACOES[s], fechada: fechada, qtd: itens.length, itens: itens.slice(0, fechada ? 30 : 200).map(function (c) { return CmpRel_cartao_(c, agoraMs, true); }) };
  });
  var lim365 = Cmp_somarDias_(Cmp_hoje_(), -365);
  var gantt = base.filter(function (c) { return c.situacao !== 'CANCELADA' && (CMP_KANBAN_ABERTAS.indexOf(c.situacao) >= 0 || (Cmp_dia_(c.r.ENTREGUE_EM) || c.dia) >= lim365); })
    .map(function (c) { return CmpRel_cartao_(c, agoraMs, true); }).filter(function (x) { return x.enviadoMs !== null; }).sort(function (a, b) { return a.enviadoMs - b.enviadoMs; });
  var fmt = function (g) { return g.map(function (x) { return { t: x.nome, n: x.valor, qtd: x.qtd, valorTxt: Cmp_moeda_(x.valor) }; }); };
  var meses = [], m0 = Cmp_hoje_().slice(0, 7);
  for (var k = 5; k >= 0; k--) { var mm = CmpI_addMes_(m0, -k); meses.push({ t: CmpI_competenciaNome_(mm).replace(/ de \d{4}$/, '').slice(0, 3) + '/' + mm.slice(2, 4), n: CmpRel_soma_(base.filter(function (c) { return c.conta && c.dia.slice(0, 7) === mm; })) }); }
  return { periodo: per, periodos: CMP_REL_PERIODOS, indices: ind, indicesTxt: { total: Cmp_moeda_(ind.total), informadasValor: Cmp_moeda_(ind.informadasValor), naoInformadasValor: Cmp_moeda_(ind.naoInformadasValor), aPagarValor: Cmp_moeda_(ind.aPagarValor) },
    kanban: kanban, gantt: gantt, agoraMs: agoraMs, ganttJs: typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() : '',
    porForma: fmt(CmpRel_agrupar_(l, function (c) { return c.formaNome; })), porColaborador: fmt(CmpRel_agrupar_(l, function (c) { return c.quem; }, 15)), porVinculo: fmt(CmpRel_agrupar_(l, function (c) { return c.vinculoNome; })),
    porMes: meses.map(function (x) { return { t: x.t, n: x.n, valorTxt: Cmp_moeda_(x.n) }; }), tipos: CMP_REL_TIPOS, podeRelatorio: true, documentos: CmpRel_documentos_(eu).documentos };
}

// ------------------------------------------------------------
// RELATÓRIOS A4
// ------------------------------------------------------------
function CmpRel_kpis_(ind) {
  return RelA4_kpis_([
    [Cmp_moeda_(ind.total), 'Total comprado (' + Cmp_plural_(ind.qtd, 'compra', 'compras') + ')', ''],
    [ind.pctInformadas === null ? '—' : RelA4_num_(ind.pctInformadas, 1) + '%', 'Compras informadas depois de feitas', ''],
    [ind.tempoInformar === null ? '—' : RelA4_num_(ind.tempoInformar, 1) + ' d.u.', 'Tempo médio para informar', ind.pctNoPrazo !== null && ind.pctNoPrazo < 80 ? 'aviso' : 'ok'],
    [String(ind.comApontamento), 'Compras com apontamento', ind.comApontamento ? 'aviso' : 'ok'],
    [String(ind.naoInformadasAgora), 'Lançamentos de fatura sem compra informada (agora)', ind.naoInformadasAgora ? 'critico' : 'ok'],
    [ind.conciliacao === null ? '—' : RelA4_num_(ind.conciliacao, 1) + '%', 'Lançamentos conciliados no período', ind.conciliacao !== null && ind.conciliacao < 90 ? 'aviso' : 'ok'],
    [String(ind.aPagarVencido), 'Vencimentos atrasados (a pagar)', ind.aPagarVencido ? 'critico' : 'ok'],
    [String(ind.abertas), 'Compras em aberto (' + ind.atrasadas + ' com entrega atrasada)', ind.atrasadas ? 'aviso' : '']
  ]);
}
function CmpRel_barras_(g, titulo) { return RelA4_barras_(g.slice(0, 15).map(function (x) { return { rotulo: x.nome, valor: x.valor, rotuloValor: Cmp_moeda_(x.valor) + ' (' + x.qtd + ')' }; }), { titulo: titulo, vazio: 'Nenhuma compra no período.' }); }
function CmpRel_tabGrupo_(g, rot, leg, total) {
  return RelA4_tabela_([{ t: rot }, { t: 'Compras', num: true }, { t: 'Valor', num: true }, { t: '% do total', num: true }],
    g.map(function (x) { return [x.nome, String(x.qtd), Cmp_moeda_(x.valor), total ? RelA4_num_(x.valor * 100 / total, 1) + '%' : '—']; }), { legenda: leg, vazio: 'Nenhuma compra no período.', total: ['Total', String(g.reduce(function (s, x) { return s + x.qtd; }, 0)), Cmp_moeda_(total), total ? '100%' : '—'] });
}
function CmpRel_lista_(l, leg) {
  return RelA4_tabela_([{ t: 'Data', nw: true }, { t: 'Compra' }, { t: 'Quem comprou' }, { t: 'Vínculo' }, { t: 'Forma' }, { t: 'Valor', num: true }],
    l.slice().sort(function (a, b) { return a.dia.localeCompare(b.dia); }).map(function (c) {
      return [Cmp_brDia_(c.dia), { html: RelA4_esc_(c.numero) + '<br><span style="font-size:8pt">' + RelA4_esc_(c.titulo.slice(0, 70)) + (c.apontamentos.length ? ' · ' + RelA4_esc_(c.apontamentos.map(function (a) { return a.tipo === 'ATRASO' ? 'atraso' : a.tipo === 'DUPLICIDADE' ? 'duplicidade possível' : a.tipo === 'CARTAO_SEM_CADASTRO' ? 'cartão sem cadastro' : 'acima do comum'; }).join(', ')) : '') + '</span>' },
        c.quem, c.vinculo.slice(0, 60), c.formaNome + (c.cartao ? ' final ' + c.cartao : '') + (c.parcelas.length > 1 ? ' (' + c.parcelas.length + 'x)' : ''), Cmp_moeda_(c.valor)];
    }), { legenda: leg, vazio: 'Nenhuma compra no período.', compacta: true, total: ['', '', '', '', 'Total', Cmp_moeda_(CmpRel_soma_(l))] });
}

/** HTML do relatório. o: { tipo, per, final, competencia, clienteId, quemId } */
function CmpRel_html_(eu, o) {
  var per = o.per, base = CmpRel_base_(), ind = CmpRel_indices_(base, per), l = CmpRel_doPeriodo_(base, per), corpo = '', total = CmpRel_soma_(l), titulo = CMP_REL_TIPOS[o.tipo], ident = per.texto, extraFicha = [];
  if (o.tipo === 'CONCILIACAO') {
    var t = CmpFat_tela_(eu, { final: o.final, competencia: o.competencia });
    if (!t.final) throw new Error('Não foi possível gerar: escolha o cartão (final) e o mês da fatura');
    var r = t.resumo;
    ident = 'Fatura de ' + t.competenciaNome + ' · ' + t.cartaoRotulo;
    corpo += RelA4_secao_('Resumo da fatura', RelA4_kpis_([[r.totalExtratoTxt, 'Total do extrato (sem ignorados)', ''], [r.totalSistemaTxt, 'Total das compras informadas', ''], [r.diferencaTxt, 'Diferença', r.diferenca ? 'critico' : 'ok'],
      [String(r.conciliadas) + ' de ' + r.linhas, 'Lançamentos conciliados', r.naoInformadas ? 'aviso' : 'ok'], [String(r.naoInformadas), 'Lançamentos não informados', r.naoInformadas ? 'critico' : 'ok'], [String(r.justificadas), 'Lançamentos justificados', ''],
      [String(r.foraDaFatura), 'Compras que não estão na fatura', r.foraDaFatura ? 'aviso' : 'ok'], [t.fatura ? t.fatura.situacaoNome : 'Sem extrato', 'Situação da fatura', t.fatura && t.fatura.fechada ? 'ok' : 'aviso']]) +
      (t.fatura && t.fatura.obs ? RelA4_caixa_('Fechamento: ' + t.fatura.obs, t.fatura.situacao === 'FECHADA_RESSALVA' ? 'aviso' : '') : ''));
    corpo += RelA4_secao_('Lançamentos do extrato', RelA4_tabela_([{ t: 'Linha', num: true }, { t: 'Data', nw: true }, { t: 'Descrição' }, { t: 'Parcela', cen: true }, { t: 'Valor', num: true }, { t: 'Situação' }],
      t.linhas.map(function (x) { return [String(x.linha), x.data, x.descricao, x.parcelas ? x.parcela + '/' + x.parcelas : '—', x.valorTxt, RelA4_marca_(x.situacaoNome + (x.motivo && x.situacao !== 'CONCILIADA' ? ': ' + x.motivo.slice(0, 80) : ''), x.situacao === 'CONCILIADA' ? 'ok' : x.situacao === 'NAO_INFORMADA' ? 'critico' : 'neutra')]; }),
      { legenda: 'Lançamentos importados da fatura', vazio: 'Nenhum extrato importado para esta fatura.', compacta: true }));
    corpo += RelA4_secao_('Compras informadas que caem nesta fatura', RelA4_tabela_([{ t: 'Compra' }, { t: 'Data', nw: true }, { t: 'Quem comprou' }, { t: 'Parcela', cen: true }, { t: 'Valor', num: true }, { t: 'Situação' }],
      t.parcelas.map(function (x) { return [x.requisicaoNumero + ' · ' + x.titulo.slice(0, 50), x.dataCompra, x.quem, x.parcela + '/' + x.parcelas, x.valorTxt, RelA4_marca_(x.situacaoNome + (x.estimada ? ' (fatura estimada)' : '') + (x.motivo && x.situacao !== 'CONCILIADA' ? ': ' + x.motivo.slice(0, 80) : ''), x.situacao === 'CONCILIADA' ? 'ok' : x.situacao === 'DIVERGENTE' || x.situacao === 'NAO_ESTA_NA_FATURA' ? 'critico' : 'neutra')]; }),
      { legenda: 'Parcelas das compras informadas', vazio: 'Nenhuma compra informada cai nesta fatura.', compacta: true }));
    corpo += RelA4_secao_('Importações', RelA4_tabela_([{ t: 'Arquivo' }, { t: 'Formato' }, { t: 'Lidos', num: true }, { t: 'Gravados', num: true }, { t: 'Conciliados na hora', num: true }, { t: 'Por' }, { t: 'Em', nw: true }],
      t.importacoes.map(function (i) { return [i.arquivo, i.formato, String(i.linhas), String(i.gravadas), String(i.casadas), i.por, i.em]; }), { vazio: 'Nenhuma importação.' }));
  } else {
    corpo += RelA4_secao_('Índices do período', CmpRel_kpis_(ind));
    if (o.tipo === 'COLABORADOR') {
      var porQuem = CmpRel_agrupar_(l, function (c) { return c.quem; });
      corpo += RelA4_secao_('Gasto por colaborador', CmpRel_barras_(porQuem, 'Valor comprado por colaborador (quantidade entre parênteses)') + CmpRel_tabGrupo_(porQuem, 'Colaborador', 'Gasto por colaborador', total));
      corpo += RelA4_secao_('Formas usadas por colaborador', RelA4_tabela_([{ t: 'Colaborador' }, { t: 'Formas e cartões' }, { t: 'Com apontamento', num: true }, { t: 'Informou com atraso', num: true }],
        porQuem.map(function (g) { var dele = l.filter(function (c) { return c.quem === g.nome; }); return [g.nome, CmpRel_agrupar_(dele, function (c) { return c.formaNome + (c.cartao ? ' final ' + c.cartao : ''); }).map(function (x) { return x.nome + ': ' + Cmp_moeda_(x.valor); }).join('; '), String(dele.filter(function (c) { return c.apontamentos.length; }).length), String(dele.filter(function (c) { return c.apontamentos.some(function (a) { return a.tipo === 'ATRASO'; }); }).length)]; }),
        { legenda: 'Formas de pagamento e controles por colaborador', vazio: 'Nenhuma compra no período.' }));
      if (o.quemId) l = l.filter(function (c) { return c.quemId === o.quemId; });
      corpo += RelA4_secao_('Lista das compras', CmpRel_lista_(l, 'Compras do período, por data'));
    } else if (o.tipo === 'CLIENTE') {
      var comCli = l.filter(function (c) { return c.clienteId || c.chamado; });
      if (o.clienteId) { comCli = comCli.filter(function (c) { return c.clienteId === o.clienteId; }); extraFicha.push(['Cliente', (comCli[0] && comCli[0].cliente) || o.clienteId]); }
      var porCli = CmpRel_agrupar_(comCli, function (c) { return c.cliente || 'Cliente não informado'; });
      corpo += RelA4_secao_('Gasto por cliente', CmpRel_barras_(porCli, 'Valor comprado por cliente') + CmpRel_tabGrupo_(porCli, 'Cliente', 'Gasto por cliente', CmpRel_soma_(comCli)));
      var porCh = CmpRel_agrupar_(comCli.filter(function (c) { return c.chamado; }), function (c) { return c.chamado + ' · ' + c.cliente; });
      corpo += RelA4_secao_('Gasto por chamado da Assistência', CmpRel_tabGrupo_(porCh, 'Chamado', 'Compras ligadas a chamados (custo do atendimento)', CmpRel_soma_(comCli.filter(function (c) { return c.chamado; }))));
      var porProp = CmpRel_agrupar_(comCli.filter(function (c) { return c.propostaNumero; }), function (c) { return c.propostaNumero + ' · ' + c.cliente; });
      corpo += RelA4_secao_('Gasto por pedido do Comercial', CmpRel_tabGrupo_(porProp, 'Pedido', 'Compras ligadas a pedidos aprovados', CmpRel_soma_(comCli.filter(function (c) { return c.propostaNumero; }))));
      corpo += RelA4_secao_('Lista das compras', CmpRel_lista_(comCli, 'Compras ligadas a clientes, por data'));
    } else if (o.tipo === 'FORMA') {
      var porForma = CmpRel_agrupar_(l, function (c) { return c.formaNome; }), porCartao = CmpRel_agrupar_(l.filter(function (c) { return c.cartao; }), function (c) { return CmpCart_rotulo_(CmpCart_porFinal_(c.cartao), c.cartao); });
      corpo += RelA4_secao_('Gasto por forma de pagamento', CmpRel_barras_(porForma, 'Valor por forma de pagamento') + CmpRel_tabGrupo_(porForma, 'Forma', 'Gasto por forma de pagamento', total));
      corpo += RelA4_secao_('Gasto por cartão', CmpRel_tabGrupo_(porCartao, 'Cartão', 'Compras no cartão, por final', CmpRel_soma_(l.filter(function (c) { return c.cartao; }))));
      var hoje = Cmp_hoje_(), futuras = Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) { return ['A_CONCILIAR', 'A_PAGAR', 'NAO_ESTA_NA_FATURA'].indexOf(Cmp_up_(x.SITUACAO)) >= 0; });
      var porComp = {};
      futuras.forEach(function (x) { var k = Cmp_s_(x.COMPETENCIA); porComp[k] = Cmp_r2_((porComp[k] || 0) + (Number(x.VALOR) || 0)); });
      corpo += RelA4_secao_('Parcelas e vencimentos em aberto', RelA4_colunas_(Object.keys(porComp).sort().slice(0, 12).map(function (k) { return { rotulo: k.slice(5, 7) + '/' + k.slice(2, 4), valor: porComp[k], rotuloValor: Cmp_moeda_(porComp[k]).replace('R$ ', '') }; }), { titulo: 'Valor em aberto por mês da fatura ou do vencimento (R$)', unidade: 'R$' }) +
        RelA4_tabela_([{ t: 'Compra' }, { t: 'Forma' }, { t: 'Parcela', cen: true }, { t: 'Fatura ou vencimento', nw: true }, { t: 'Valor', num: true }, { t: 'Situação' }],
          futuras.sort(function (a, b) { return String(a.COMPETENCIA + a.VENCIMENTO).localeCompare(String(b.COMPETENCIA + b.VENCIMENTO)); }).slice(0, 200).map(function (x) { return [Cmp_s_(x.REQUISICAO_NUMERO), (CMP_FORMAS_PAGAMENTO[Cmp_up_(x.FORMA)] || '') + (Cmp_s_(x.CARTAO_FINAL) ? ' final ' + x.CARTAO_FINAL : '') + (Cmp_s_(x.BENEFICIARIO_NOME) ? ' a ' + x.BENEFICIARIO_NOME : ''), x.PARCELA + '/' + x.PARCELAS, Cmp_up_(x.FORMA) === 'CARTAO_CREDITO' ? CmpI_competenciaNome_(Cmp_s_(x.COMPETENCIA)) + (Cmp_sim_(x.ESTIMADA) ? ' (estimada)' : '') : Cmp_brDia_(x.VENCIMENTO) + (Cmp_dia_(x.VENCIMENTO) < hoje ? ' (vencido)' : ''), Cmp_moeda_(x.VALOR), CMP_PARC_SIT[Cmp_up_(x.SITUACAO)] || ''];
          }), { legenda: 'Parcelas a conciliar e vencimentos a pagar', vazio: 'Nada em aberto.', compacta: true }));
    } else {
      var porVinc = CmpRel_agrupar_(l, function (c) { return c.vinculoNome; }), porOrigem = CmpRel_agrupar_(l, function (c) { return c.origem === 'INFORMADA' ? 'Informada depois de feita' : c.origem === 'SEM_PEDIDO' ? 'Registrada sem pedido' : 'Pedido de compra (fluxo completo)'; });
      var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
      var meses = {}; l.forEach(function (c) { var k = c.dia.slice(0, 7); meses[k] = Cmp_r2_((meses[k] || 0) + c.valor); });
      corpo += RelA4_secao_('Gasto por mês', RelA4_colunas_(Object.keys(meses).sort().map(function (k) { return { rotulo: k.slice(5, 7) + '/' + k.slice(2, 4), valor: meses[k], rotuloValor: Cmp_moeda_(meses[k]).replace('R$ ', '') }; }), { titulo: 'Valor comprado por mês (R$)', unidade: 'R$' }));
      corpo += RelA4_secao_('Gasto por vínculo e por origem', CmpRel_barras_(porVinc, 'Valor por vínculo') + CmpRel_tabGrupo_(porVinc, 'Vínculo', 'Gasto por vínculo', total) + CmpRel_tabGrupo_(porOrigem, 'Origem', 'Gasto por origem da compra', total));
      corpo += RelA4_secao_('Gasto por área e por fornecedor', CmpRel_tabGrupo_(CmpRel_agrupar_(l, function (c) { return c.area ? (nomesAreas[c.area] || c.area) : 'Sem área'; }), 'Área de quem pediu', 'Gasto por área', total) +
        CmpRel_tabGrupo_(CmpRel_agrupar_(l, function (c) { return c.fornecedor || 'Sem fornecedor'; }, 20), 'Fornecedor', 'Gasto por fornecedor (20 maiores)', total));
      corpo += RelA4_secao_('Controles', RelA4_tabela_([{ t: 'Compra' }, { t: 'Quem comprou' }, { t: 'Apontamento' }, { t: 'Valor', num: true }],
        l.filter(function (c) { return c.apontamentos.length; }).map(function (c) { return [c.numero, c.quem, c.apontamentos.map(function (a) { return a.texto; }).join(' ').slice(0, 220), Cmp_moeda_(c.valor)]; }),
        { legenda: 'Compras com apontamento (duplicidade, acima do comum, atraso, cartão sem cadastro)', vazio: 'Nenhuma compra com apontamento no período.', compacta: true }));
      corpo += RelA4_secao_('Lista das compras', CmpRel_lista_(l, 'Compras do período, por data'));
    }
  }
  return RelA4_documento_({ titulo: titulo, subtitulo: ident, tituloCurto: titulo, tituloArquivo: titulo.replace(/[^\wÀ-ú ]/g, ''), sigla: 'CMP' + o.tipo.slice(0, 3), identificacao: ident,
    rotuloIdentificacao: o.tipo === 'CONCILIACAO' ? 'Referência' : 'Período', emitidoPor: eu.nome, corpo: corpo, tipoCapa: 'Relatório gerencial', ficha: extraFicha });
}

/** Gera, salva e registra. d: { tipo, dias | de/ate, final, competencia, clienteId, quemId } */
function CmpRel_gerar_(eu, d) {
  if (!(eu.veFila || eu.financeiro)) Cmp_exigir_(eu, 'FILA', 'gerar relatórios de compras');
  d = d || {};
  var tipo = Cmp_up_(d.tipo);
  if (!CMP_REL_TIPOS[tipo]) throw new Error('Não foi possível gerar: escolha o tipo de relatório (por colaborador, por cliente, por forma de pagamento, total do período ou conciliação da fatura)');
  if (tipo === 'CONCILIACAO' && !(eu.financeiro || eu.gestao || eu.diretoria || eu.admin)) Cmp_exigir_(eu, 'FINANCEIRO', 'gerar o relatório da conciliação');
  var per = CmpRel_periodo_(d);
  var html = CmpRel_html_(eu, { tipo: tipo, per: per, final: Cmp_digitos_(d.final), competencia: Cmp_s_(d.competencia), clienteId: Cmp_s_(d.clienteId), quemId: Cmp_s_(d.quemId) });
  var ident = tipo === 'CONCILIACAO' ? 'fatura ' + Cmp_s_(d.competencia) + ' final ' + Cmp_digitos_(d.final) : per.de + ' a ' + per.ate;
  var g = RelA4_salvar_(CmpFin_pastaRelatorios_, ident, html, { compartilhar: false });
  var reg = RelA4_registro_(html);
  var doc = SGO_DATA.insert(CMP_ABAS.DOCUMENTOS, { TIPO: tipo, TITULO: CMP_REL_TIPOS[tipo] + ' · ' + (tipo === 'CONCILIACAO' ? CmpI_competenciaNome_(Cmp_s_(d.competencia)) + ' · final ' + Cmp_digitos_(d.final) : per.texto),
    NUMERO: reg ? Cmp_s_(reg.numero) : '', PERIODO_DE: tipo === 'CONCILIACAO' ? '' : per.de, PERIODO_ATE: tipo === 'CONCILIACAO' ? '' : per.ate,
    FILTRO_JSON: JSON.stringify({ final: Cmp_digitos_(d.final), competencia: Cmp_s_(d.competencia), clienteId: Cmp_s_(d.clienteId), quemId: Cmp_s_(d.quemId) }), PDF_URL: g.pdfUrl || '', HTML_URL: g.htmlUrl || '',
    PASTA_URL: g.pastaUrl || '', PAGINAS: g.paginas || '', SALVO: g.salvo ? 'SIM' : '', GERADO_POR_ID: eu.id, GERADO_POR_NOME: eu.nome, EM: Cmp_agora_() });
  return { documento: CmpRel_docParaTela_(doc), html: typeof RelA4_injetarAvisos_ === 'function' ? RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_({ salvo: g.salvo, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, aviso: g.salvo ? '' : g.aviso }, [])) : g.html,
    message: CMP_REL_TIPOS[tipo] + (g.salvo ? ' gerado e salvo em HTML e PDF na pasta "Compras - Relatórios". Ele fica em "Relatórios gerados" para abrir de novo.' : ' gerado, mas a cópia não foi gravada: ' + g.aviso) };
}
function CmpRel_docParaTela_(x) {
  return { id: Cmp_s_(x.ID), tipo: Cmp_up_(x.TIPO), tipoNome: CMP_REL_TIPOS[Cmp_up_(x.TIPO)] || Cmp_s_(x.TIPO), titulo: Cmp_s_(x.TITULO), numero: Cmp_s_(x.NUMERO), versao: 1, periodo: Cmp_s_(x.PERIODO_DE) ? Cmp_brDia_(x.PERIODO_DE) + ' a ' + Cmp_brDia_(x.PERIODO_ATE) : '',
    pdfUrl: Cmp_s_(x.PDF_URL), htmlUrl: Cmp_s_(x.HTML_URL), pastaUrl: Cmp_s_(x.PASTA_URL), salvo: Cmp_sim_(x.SALVO), por: Cmp_s_(x.GERADO_POR_NOME), em: Cmp_br_(x.EM) };
}
function CmpRel_documentos_(eu) {
  var fin = eu.financeiro || eu.gestao || eu.diretoria || eu.admin;
  return { documentos: Cmp_ler_(CMP_ABAS.DOCUMENTOS).filter(function (x) { return fin || Cmp_up_(x.TIPO) !== 'CONCILIACAO'; }).sort(function (a, b) { return String(b.EM).localeCompare(String(a.EM)); }).slice(0, 100).map(CmpRel_docParaTela_) };
}

// ------------------------------------------------------------
// INTEGRAÇÃO: custo no chamado da Assistência e na proposta do Comercial
// ------------------------------------------------------------
/** Nível em Compras de um usuário pelo ID (sem sessão). */
function CmpRel_nivelPorId_(usuarioId) {
  var u = Cmp_usuarios_()[Cmp_s_(usuarioId)];
  return u ? Cmp_nivelDe_(u) : { veValores: false };
}
function CmpRel_resumoLigadas_(l, nivel) {
  var ok = l.filter(function (c) { return c.situacao !== 'CANCELADA'; }), v = !!nivel.veValores;
  return { compras: ok.sort(function (a, b) { return a.dia.localeCompare(b.dia); }).map(function (c) {
    var t = { id: c.id, numero: c.numero, titulo: c.titulo.slice(0, 90), situacaoNome: CMP_SITUACOES[c.situacao] || c.situacao, data: Cmp_brDia_(c.dia), quem: c.quem, origem: c.origem === 'INFORMADA' ? 'Informada' : 'Pedido de compra' };
    if (v) { t.valorTxt = c.conta ? Cmp_moeda_(c.valor) : (Cmp_s_(c.r.VALOR_TOTAL) !== '' ? Cmp_moeda_(c.r.VALOR_TOTAL) + ' (previsto)' : '—'); t.forma = c.formaNome; }
    return t;
  }), totalTxt: v ? Cmp_moeda_(CmpRel_soma_(ok)) : '', veValores: v, quantidade: ok.length };
}
/** Compras ligadas a um chamado (número CH-... no vínculo, ou o pedido de peça do chamado). Nunca lança. */
function Compras_custoDoChamado_(usuarioId, numeroChamado, requisicaoId) {
  try {
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(CMP_ABAS.REQUISICOES)) return null;
    var num = Cmp_up_(numeroChamado), rid = Cmp_s_(requisicaoId);
    var l = CmpRel_base_().filter(function (c) { return (num && Cmp_up_(c.chamado) === num) || (rid && c.id === rid); });
    return l.length ? CmpRel_resumoLigadas_(l, CmpRel_nivelPorId_(usuarioId)) : null;
  } catch (e) { return null; }
}
/** Compras ligadas a uma proposta aprovada do Comercial. Nunca lança. */
function Compras_doComercial_(usuarioId, propostaId) {
  try {
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(CMP_ABAS.REQUISICOES)) return null;
    var l = CmpRel_base_().filter(function (c) { return c.propostaId && c.propostaId === Cmp_s_(propostaId); });
    return l.length ? CmpRel_resumoLigadas_(l, CmpRel_nivelPorId_(usuarioId)) : null;
  } catch (e) { return null; }
}
