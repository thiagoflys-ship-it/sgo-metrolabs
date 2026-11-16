/** Fluxo de caixa, provisões e configuração posterior das comissões. */
function Omie_dia_(valor) {
  var s = String(valor || ''), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Informe uma data válida.');
  var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.toISOString().slice(0, 10) !== s) throw new Error('Informe uma data válida.');
  return m[3] + '/' + m[2] + '/' + m[1];
}
function Omie_periodo_(p) {
  var inicio = Omie_dia_(p.inicio), fim = Omie_dia_(p.fim);
  if (String(p.inicio) > String(p.fim)) throw new Error('A data inicial precisa ser anterior à final.');
  if ((new Date(p.fim) - new Date(p.inicio)) / 86400000 > 366) throw new Error('Consulte no máximo um ano por vez.');
  return { inicio: inicio, fim: fim };
}
function Omie_numId_(v, rotulo) {
  var n = Number(v);
  if (!isFinite(n) || n <= 0 || Math.floor(n) !== n || n > 9007199254740991) throw new Error('Informe ' + rotulo + ' válido.');
  return n;
}
/**
 * 16/11/2026 (Onda 2 do Financeiro, E2): leituras do Omie reutilizáveis. O miolo de cada consulta virou função interna SEM
 * sessão (OmieLer_*_), chamada pela api da tela (depois de Omie_exigirAcesso_) e pela rotina da fotografia diária
 * (SGO_Financeiro_Foto.js). O laço de paginação do ListarMovimentos é um só (OmieLer_movimentos_): nada de cópias irmãs.
 * Os nomes OmieGest_* da especificação já são usados pela tela (JS_Omie_Gestao.html); por isso o prefixo OmieLer_.
 * As api devolvem exatamente o mesmo de antes (teste de equivalência em tests/financeiro-onda2-e1e5.test.cjs).
 */
/**
 * Percorre as páginas do ListarMovimentos (50 por página). filtro: os campos do Omie depois de nPagina e nRegPorPagina (a ordem
 * dos campos é a mesma de antes, para a leitura guardada de 60 s valer entre a tela e a rotina). o: { aCada(movimento),
 * limite (máximo de páginas; acima, erro msgLimite), msgFormato, dePagina (padrão 1), maxNesta (páginas nesta chamada; a rotina
 * continua depois) }. Devolve { paginas, lidas, proxima (0 = terminou) }.
 */
function OmieLer_movimentos_(filtro, o) {
  o = o || {};
  var pagina = o.dePagina || 1, paginas = 1, lidas = 0;
  do {
    var param = { nPagina: pagina, nRegPorPagina: 50 };
    Object.keys(filtro || {}).forEach(function (k) { param[k] = filtro[k]; });
    var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', param);
    if (Object.keys(r).length && !Array.isArray(r.movimentos)) throw new Error(o.msgFormato || 'O Omie não devolveu os títulos esperados. Tente de novo em um minuto.');
    paginas = Number(r.nTotPaginas) || 0;
    if (o.limite && paginas > o.limite) throw new Error(o.msgLimite || 'Há títulos demais para esta consulta.');
    (r.movimentos || []).forEach(function (m) { if (o.aCada) o.aCada(m); });
    pagina++; lidas++;
  } while (pagina <= paginas && !(o.maxNesta && lidas >= o.maxNesta));
  return { paginas: paginas, lidas: lidas, proxima: pagina <= paginas ? pagina : 0 };
}
function Omie_apiResumo(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_resumo_(payload);
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/** Miolo da Visão geral: saldos em aberto dos títulos com vencimento no período (todas as páginas). */
function OmieLer_resumo_(payload) {
  var p = payload || {}, periodo = Omie_periodo_(p), conta = p.contaId ? Omie_numId_(p.contaId, 'a conta') : 0;
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var totais = { pagar: 0, receber: 0, pagarVencido: 0, receberVencido: 0, titulos: 0 }, vistos = {};
  var filtro = { cTpLancamento: 'CPCR', dDtVencDe: periodo.inicio, dDtVencAte: periodo.fim };
  if (conta) filtro.nCodCC = conta;
  OmieLer_movimentos_(filtro, { limite: 50, msgFormato: 'O Omie não devolveu os títulos esperados para o resumo.',
    msgLimite: 'O período contém mais de 2.500 títulos. Reduza o período ou escolha uma conta para gerar o resumo completo.',
    aCada: function (i) {
      var d = i.detalhes || {}, resumo = i.resumo || {}, natureza = String(d.cNatureza || '');
      if (natureza !== 'P' && natureza !== 'R') throw new Error('Há um título sem natureza identificada no Omie. Confira o cadastro antes de gerar o resumo.');
      var id = natureza + ':' + String(d.nCodTitulo || '');
      if (!d.nCodTitulo || vistos[id]) throw new Error('Os títulos mudaram durante a consulta. Atualize o resumo.');
      vistos[id] = true;
      if (String(d.cStatus).toUpperCase() === 'CANCELADO') return;
      if (typeof resumo.nValAberto !== 'number' || !isFinite(resumo.nValAberto) || resumo.nValAberto < 0) throw new Error('Há um título sem saldo em aberto válido no Omie. Confira os dados antes de gerar o resumo.');
      var centavos = Math.round(resumo.nValAberto * 100), chave = natureza === 'P' ? 'pagar' : 'receber';
      var venc = String(d.dDtVenc || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!venc) throw new Error('Há um título sem vencimento válido no Omie.');
      var dia = venc[3] + '-' + venc[2] + '-' + venc[1]; Omie_dia_(dia);
      totais[chave] += centavos;
      if (dia < hoje) totais[chave + 'Vencido'] += centavos;
      totais.titulos++;
    } });
  ['pagar','receber','pagarVencido','receberVencido'].forEach(function (k) { totais[k] /= 100; });
  return { ok: true, totais: totais, atualizadoEm: new Date().toISOString(), completo: true };
}
/**
 * 15/11/2026: Agenda de vencimentos — títulos com vencimento de hoje até hoje + dias (7, 15 ou 30), com saldo em aberto,
 * em ordem de data. Nomes pelo cadastro do Omie (ListarClientes por código, 50 por chamada). Somente leitura.
 */
function Omie_apiAgenda(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_agenda_(payload);
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function OmieLer_agenda_(payload) {
  var p = payload || {}, dias = Number(p.dias || 7), natureza = String(p.natureza || 'todos');
  if ([7, 15, 30].indexOf(dias) < 0 || ['todos', 'P', 'R'].indexOf(natureza) < 0) throw new Error('Escolha o período e o tipo da agenda.');
  var agora = new Date(), hoje = Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyy-MM-dd');
  var fim = Utilities.formatDate(new Date(agora.getTime() + dias * 86400000), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var br = function (s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); };
  var tipo = natureza === 'P' ? 'CP' : natureza === 'R' ? 'CR' : 'CPCR';
  var itens = [], vistos = {};
  OmieLer_movimentos_({ cTpLancamento: tipo, dDtVencDe: br(hoje), dDtVencAte: br(fim) }, { limite: 20, msgFormato: 'O Omie não devolveu os títulos esperados para a agenda.',
    msgLimite: 'O período tem mais de 1.000 títulos. Escolha um período menor ou só a pagar ou só a receber.',
    aCada: function (m) {
      var d = m.detalhes || {}, s = m.resumo || {}, nat = String(d.cNatureza || '');
      if (nat !== 'P' && nat !== 'R') return;
      var chave = nat + ':' + String(d.nCodTitulo || '');
      if (!d.nCodTitulo || vistos[chave]) return;
      vistos[chave] = true;
      if (String(d.cStatus || '').toUpperCase() === 'CANCELADO') return;
      var aberto = Number(s.nValAberto);
      if (!isFinite(aberto) || aberto <= 0) return;
      var v = String(d.dDtVenc || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!v) return;
      itens.push({ id: String(d.nCodTitulo), natureza: nat, vencimento: v[3] + '-' + v[2] + '-' + v[1], pessoaId: Number(d.nCodCliente) || 0,
        documento: String(d.cNumDocFiscal || d.cNumTitulo || ''), parcela: String(d.cNumParcela || ''), valor: Math.round(aberto * 100) / 100,
        situacao: String(d.cStatus || ''), cnpj: String(d.cCPFCNPJCliente || '') });
    } });
  // nomes: cadastro do Omie por código (50 por chamada)
  var codigos = [], nomes = {};
  itens.forEach(function (i) { if (i.pessoaId && codigos.indexOf(i.pessoaId) < 0) codigos.push(i.pessoaId); });
  for (var k = 0; k < codigos.length; k += 50) {
    var lote = codigos.slice(k, k + 50);
    try {
      var c = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 50, apenas_importado_api: 'N', clientesPorCodigo: lote.map(function (x) { return { codigo_cliente_omie: x }; }) });
      (c.clientes_cadastro || []).forEach(function (x) { nomes[String(x.codigo_cliente_omie)] = String(x.nome_fantasia || x.razao_social || '').slice(0, 120); });
    } catch (e) { break; } // sem os nomes a agenda continua útil (mostra o CNPJ)
  }
  var totais = { pagar: 0, receber: 0 };
  itens.forEach(function (i) {
    i.nome = nomes[String(i.pessoaId)] || '';
    if (i.natureza === 'P') totais.pagar += Math.round(i.valor * 100); else totais.receber += Math.round(i.valor * 100);
    delete i.pessoaId;
  });
  itens.sort(function (a, b) { return a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.natureza < b.natureza ? -1 : a.natureza > b.natureza ? 1 : b.valor - a.valor; });
  return { ok: true, de: hoje, ate: fim, itens: itens, totais: { pagar: totais.pagar / 100, receber: totais.receber / 100 }, semNome: itens.filter(function (i) { return !i.nome; }).length, atualizadoEm: new Date().toISOString() };
}
/** 15/11/2026: plano de contas do Omie { código: { descricao, superior, transferencia } } (todas as páginas, 100 por vez). */
function Omie_categorias_() {
  var mapa = {}, pagina = 1, paginas = 1;
  do {
    var r = Omie_requisitar_('geral/categorias/', 'ListarCategorias', { pagina: pagina, registros_por_pagina: 100 });
    paginas = Number(r.total_de_paginas) || 0;
    if (paginas > 20) throw new Error('O plano de contas do Omie tem categorias demais para esta consulta.');
    (r.categoria_cadastro || []).forEach(function (c) {
      mapa[String(c.codigo)] = { descricao: String(c.descricao || c.descricao_padrao || c.codigo), superior: String(c.categoria_superior || ''), transferencia: String(c.transferencia || '') === 'S' };
    });
    pagina++;
  } while (pagina <= paginas);
  return mapa;
}
/** 15/11/2026: resultado do mês pelo regime de caixa: pago e recebido no mês, por categoria; transferências à parte. */
function Omie_apiResultado(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_resultado_(payload);
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/**
 * Miolo do Resultado do mês. o (só a rotina usa): { categorias (o plano já lido, para não ler de novo), aCada(pagamento) com
 * { natureza, codigo, categoria, centavos, pagoEm, vencimento, emissao, cliente, transferencia } de cada título pago no mês
 * (sem os cancelados) }. Com o, devolve também paginas (páginas do Omie lidas), para a rotina não passar do limite por rodada.
 */
function OmieLer_resultado_(payload, o) {
  o = o || {};
  var m = String((payload || {}).mes || '').match(/^(\d{4})-(\d{2})$/);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) < 2015) throw new Error('Escolha o mês.');
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'), mes = m[1] + '-' + m[2];
  if (mes > hoje.slice(0, 7)) throw new Error('O mês escolhido ainda não começou.');
  var ultimo = new Date(Number(m[1]), Number(m[2]), 0).getDate(), ateIso = mes + '-' + (ultimo < 10 ? '0' : '') + ultimo;
  if (ateIso > hoje) ateIso = hoje;
  var de = '01/' + m[2] + '/' + m[1], ate = ateIso.slice(8, 10) + '/' + m[2] + '/' + m[1];
  var linhas = {}, vistos = {}, titulos = 0, semCategoria = 0, pagos = [];
  var iso = function (t) { var x = String(t || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return x ? x[3] + '-' + x[2] + '-' + x[1] : ''; };
  var lidas = OmieLer_movimentos_({ cTpLancamento: 'CPCR', dDtPagtoDe: de, dDtPagtoAte: ate }, { limite: 40, msgFormato: 'O Omie não devolveu os pagamentos esperados. Tente de novo em um minuto.',
    msgLimite: 'O mês tem mais de 2.000 pagamentos e recebimentos; esta consulta mostra até 2.000.',
    aCada: function (mv) {
      var d = mv.detalhes || {}, s = mv.resumo || {}, nat = String(d.cNatureza || '');
      var chave = nat + ':' + String(d.nCodTitulo || '');
      if ((nat !== 'P' && nat !== 'R') || !d.nCodTitulo || vistos[chave]) return;
      vistos[chave] = true;
      if (String(d.cStatus || '').toUpperCase() === 'CANCELADO') return;
      var pago = Number(s.nValPago), pg = String(d.dDtPagamento || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!(pago > 0) || !pg || (pg[3] + '-' + pg[2]) !== mes) return;
      var cat = String(d.cCodCateg || ''); if (!cat) semCategoria++;
      var k = nat + '|' + cat, l = linhas[k] || (linhas[k] = { natureza: nat, codigo: cat, titulos: 0, centavos: 0 });
      l.titulos++; l.centavos += Math.round(pago * 100); titulos++;
      if (o.aCada) pagos.push({ natureza: nat, codigo: String(d.nCodTitulo), categoria: cat, centavos: Math.round(pago * 100), pagoEm: pg[3] + '-' + pg[2] + '-' + pg[1], vencimento: iso(d.dDtVenc), emissao: iso(d.dDtEmissao), cliente: Number(d.nCodCliente) || 0 });
    } }).lidas;
  var cats = o.categorias || Omie_categorias_(), tot = { R: 0, P: 0, T: 0 }, receitas = [], despesas = [], transferencias = [];
  Object.keys(linhas).forEach(function (k) {
    var l = linhas[k], c = cats[l.codigo] || {}, sup = cats[c.superior] || {};
    var item = { codigo: l.codigo || 'sem categoria', descricao: c.descricao || (l.codigo ? 'Categoria ' + l.codigo : 'Sem categoria'), grupo: sup.descricao || '', titulos: l.titulos, valor: l.centavos / 100 };
    if (c.transferencia) { transferencias.push(item); tot.T += l.centavos; return; }
    if (l.natureza === 'R') { receitas.push(item); tot.R += l.centavos; } else { despesas.push(item); tot.P += l.centavos; }
  });
  if (o.aCada) pagos.forEach(function (x) { x.transferencia = !!(cats[x.categoria] || {}).transferencia; o.aCada(x); });
  var ord = function (a, b) { return b.valor - a.valor; };
  var r = { ok: true, mes: mes, de: mes + '-01', ate: ateIso, titulos: titulos, semCategoria: semCategoria,
    receitas: receitas.sort(ord), despesas: despesas.sort(ord), transferencias: transferencias.sort(ord),
    totais: { receitas: tot.R / 100, despesas: tot.P / 100, resultado: (tot.R - tot.P) / 100, transferencias: tot.T / 100 }, atualizadoEm: new Date().toISOString() };
  if (o.aCada || o.categorias) r.paginas = lidas;
  return r;
}
/** 15/11/2026: posição de hoje pelo resumo do Omie (ObterResumoFinancas): saldos, abertos, atrasados e fluxo de 10 dias. */
function Omie_apiPosicao(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_posicao_();
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function OmieLer_posicao_() {
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var r = Omie_requisitar_('financas/resumo/', 'ObterResumoFinancas', { dDia: hoje, lApenasResumo: true, lExibirCategoria: false });
  var n = function (v) { var x = Number(v); return isFinite(x) ? Math.round(x * 100) / 100 : 0; };
  var cc = r.contaCorrente || {}, cp = r.contaPagar || {}, cr = r.contaReceber || {};
  if (!r.contaCorrente || !r.contaPagar || !r.contaReceber) throw new Error('O Omie não devolveu o resumo esperado. Tente de novo em um minuto.');
  var fluxo = (Array.isArray(r.fluxoCaixa) ? r.fluxoCaixa : []).map(function (d) {
    var m = String(d.dDia || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? { dia: m[3] + '-' + m[2] + '-' + m[1], pagar: n(d.vPagar), receber: n(d.vReceber), saldo: n(d.vSaldo) } : null;
  }).filter(Boolean);
  return { ok: true, saldoContas: n(cc.vTotal), limite: n(cc.vLimiteCredito), pagar: { aberto: n(cp.vTotal), atraso: n(cp.vAtraso), titulos: Number(cp.nTotal) || 0 },
    receber: { aberto: n(cr.vTotal), atraso: n(cr.vAtraso), titulos: Number(cr.nTotal) || 0 }, fluxo: fluxo, atualizadoEm: new Date().toISOString() };
}
/** 15/11/2026: vencidos a receber agrupados por cliente, pelo SALDO EM ABERTO (ListarMovimentos CR com cStatus ATRASADO, conferido
 * no Omie real: os mesmos 80 títulos; o saldo em aberto é 71% do valor dos documentos, por pagamentos parciais e retenções). */
function Omie_apiVencidosClientes(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_vencidos_();
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/** o (opcional): { semNomes: true } não consulta o cadastro do Omie e devolve o código de cada cliente. */
function OmieLer_vencidos_(o) {
  o = o || {};
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'), grupos = {}, vistos = {}, titulos = 0;
  var faixas = { ate30: { titulos: 0, centavos: 0 }, de31a90: { titulos: 0, centavos: 0 }, mais90: { titulos: 0, centavos: 0 } }; // 15/11/2026
  OmieLer_movimentos_({ cTpLancamento: 'CR', cStatus: 'ATRASADO' }, { limite: 20, msgFormato: 'O Omie não devolveu os títulos vencidos. Tente de novo em um minuto.',
    msgLimite: 'Há mais de 1.000 títulos vencidos. Consulte por cliente em Contas a pagar e receber.',
    aCada: function (m) {
      var x = m.detalhes || {}, s = m.resumo || {};
      var id = String(x.nCodTitulo || ''); if (!id || vistos[id] || String(x.cNatureza || '') !== 'R') return; vistos[id] = true;
      var aberto = Number(s.nValAberto); if (!(aberto > 0)) return;
      var v = String(x.dDtVenc || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!v) return;
      var dia = v[3] + '-' + v[2] + '-' + v[1], cli = String(x.nCodCliente || '0');
      var g = grupos[cli] || (grupos[cli] = { codigo: Number(cli) || 0, titulos: 0, centavos: 0, maisAntigo: dia, parciais: 0, documentos: [] });
      g.titulos++; titulos++; g.centavos += Math.round(aberto * 100);
      var atraso = Math.round((Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10)) - Date.UTC(+v[3], +v[2] - 1, +v[1])) / 86400000);
      var fx = atraso <= 30 ? 'ate30' : atraso <= 90 ? 'de31a90' : 'mais90';
      faixas[fx].titulos++; faixas[fx].centavos += Math.round(aberto * 100);
      if (dia < g.maisAntigo) g.maisAntigo = dia;
      if (Number(s.nValPago) > 0) g.parciais++;
      var doc = String(x.cNumDocFiscal ? 'NF ' + x.cNumDocFiscal : x.cNumTitulo || '').slice(0, 30);
      if (doc && g.documentos.length < 5) g.documentos.push(doc);
    } });
  var lista = Object.keys(grupos).map(function (k) { return grupos[k]; });
  var nomes = !o.semNomes && typeof Omie_nomesClientes_ === 'function' ? Omie_nomesClientes_(lista.map(function (g) { return g.codigo; }).filter(Boolean)) : {};
  var dias = function (d) { return Math.max(0, Math.round((Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10)) - Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))) / 86400000)); };
  var total = 0;
  lista = lista.map(function (g) {
    total += g.centavos;
    var it = { cliente: nomes[String(g.codigo)] || '', titulos: g.titulos, valor: g.centavos / 100, maisAntigo: g.maisAntigo, diasAtraso: dias(g.maisAntigo), parciais: g.parciais, documentos: g.documentos.filter(Boolean) };
    if (o.semNomes) it.codigo = g.codigo;
    return it;
  }).sort(function (a, b) { return b.valor - a.valor; });
  Object.keys(faixas).forEach(function (k) { faixas[k].valor = faixas[k].centavos / 100; delete faixas[k].centavos; });
  return { ok: true, clientes: lista, titulos: titulos, total: total / 100, faixas: faixas, atualizadoEm: new Date().toISOString() };
}
function Omie_apiContasCorrentes(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    var lista = [], pagina = 1, r;
    do {
      r = Omie_requisitar_('geral/contacorrente/', 'ListarContasCorrentes', { pagina: pagina, registros_por_pagina: 100, apenas_importado_api: 'N' });
      if (Object.keys(r).length && !Array.isArray(r.ListarContasCorrentes)) throw new Error('O Omie não devolveu as contas no formato esperado.');
      (r.ListarContasCorrentes || []).forEach(function (i) { if (i.inativo !== 'S') lista.push({ id: String(i.nCodCC), nome: String(i.descricao || i.nCodCC) }); });
      pagina++;
      if (pagina > 30 && pagina <= Number(r.total_de_paginas)) throw new Error('Há muitas contas. Solicite a revisão do cadastro no Omie.');
    } while (pagina <= Number(r.total_de_paginas));
    return { ok: true, contas: lista };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiFluxo(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {}, periodo = Omie_periodo_(p), conta = Omie_numId_(p.contaId, 'a conta');
    var r = Omie_requisitar_('financas/extrato/', 'ListarExtrato', { nCodCC: conta, dPeriodoInicial: periodo.inicio, dPeriodoFinal: periodo.fim });
    if (!Array.isArray(r.listaMovimentos)) throw new Error('O Omie não devolveu o extrato esperado.');
    return { ok: true, conta: String(r.cDescricao || ''), saldoAnterior: Number(r.nSaldoAnterior) || 0,
      saldoAtual: Number(r.nSaldoAtual) || 0, saldoPrevisto: Number(r.nSaldoAtualPrevisto) || 0,
      saldoConciliado: Number(r.nSaldoConciliado) || 0,
      itens: r.listaMovimentos.map(function (i) { return { id: String(i.nCodLancamento || ''), data: String(i.dDataLancamento || ''),
        pessoa: String(i.cDesCliente || i.cRazCliente || ''), documento: String(i.cNumero || ''), natureza: String(i.cNatureza || ''),
        categoria: String(i.cDesCategoria || ''), valor: Number(i.nValorDocumento) || 0, saldo: Number(i.nSaldo) || 0,
        saldoPrevisto: Number(i.nSaldoPrev) || 0, situacao: String(i.cSituacao || '') }; }) };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiOrcamento(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    return OmieLer_orcamento_(payload);
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function OmieLer_orcamento_(payload) {
  var m = String((payload || {}).mes || '').match(/^(\d{4})-(\d{2})$/);
  if (!m || Number(m[1]) < 2000 || Number(m[1]) > 2200 || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('Escolha o mês.');
  var r = Omie_requisitar_('financas/caixa/', 'ListarOrcamentos', { nAno: Number(m[1]), nMes: Number(m[2]) });
  if (!Array.isArray(r.ListaOrcamentos)) throw new Error('O Omie não devolveu o orçamento esperado.');
  return { ok: true, itens: r.ListaOrcamentos.map(function (i) { return { categoria: String(i.cDesCateg || i.cCodCateg || ''),
    previsto: Number(i.nValorPrevisto) || 0, realizado: Number(i.nValorRealilzado) || 0 }; }) };
}

var OMIE_PROV_ABA = 'FIN_OMIE_PROVISOES';
var OMIE_PROV_COLUNAS = ['ID', 'TIPO', 'DESCRICAO', 'VALOR', 'VENCIMENTO', 'SITUACAO', 'AUTOR', 'CRIADO_EM', 'ATUALIZADO_EM', 'CONTA_HASH'];
function Omie_contaHash_() {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Omie_credenciais_().key, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function Omie_textoPlanilha_(v) { var s = String(v || ''); return /^[=+@\-\t\r]/.test(s) ? "'" + s : s; }
function Omie_provisoesGarantir_() {
  var db = SGO_DATA.getDB(), sh = db.getSheetByName(OMIE_PROV_ABA);
  if (!sh) { sh = db.insertSheet(OMIE_PROV_ABA); sh.getRange(1, 1, 1, OMIE_PROV_COLUNAS.length).setValues([OMIE_PROV_COLUNAS]); }
  return sh;
}
function Omie_apiProvisoes(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {}, periodo = Omie_periodo_(p), tipo = String(p.origem || 'PV'), pagina = Number(p.pagina || 1);
    if (['PV', 'POS', 'PPV', 'LOCAL'].indexOf(tipo) < 0 || !Number.isInteger(pagina) || pagina < 1 || pagina > 100000) throw new Error('Filtro de provisões inválido.');
    if (tipo === 'LOCAL') {
      var lock = LockService.getScriptLock(); lock.waitLock(10000);
      try { Omie_provisoesGarantir_(); } finally { lock.releaseLock(); }
      var conta = Omie_contaHash_();
      var itens = SGO_DATA.getAll(OMIE_PROV_ABA).filter(function (i) { var dia = String(i.VENCIMENTO || '').slice(0, 10); return i.CONTA_HASH === conta && dia >= p.inicio && dia <= p.fim; });
      return { ok: true, paginas: Math.ceil(itens.length / 50), total: itens.length, itens: itens.slice((pagina - 1) * 50, pagina * 50).map(function (i) {
        return { id: String(i.ID), documento: String(i.DESCRICAO).replace(/^'(?=[=+@\-\t\r])/, ''), data: String(i.VENCIMENTO).slice(0, 10), valor: Number(i.VALOR), natureza: String(i.TIPO), situacao: String(i.SITUACAO) };
      }) };
    }
    var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 50, cTpLancamento: tipo, dDtPrevDe: periodo.inicio, dDtPrevAte: periodo.fim });
    if (Object.keys(r).length && !Array.isArray(r.movimentos)) throw new Error('O Omie não devolveu as previsões esperadas.');
    return { ok: true, paginas: Number(r.nTotPaginas) || 0, total: Number(r.nTotRegistros) || 0, itens: (r.movimentos || []).map(function (i) {
      var d = i.detalhes || {};
      return { id: String(d.nCodTitulo || d.nCodOS || d.nCodCtr || ''), documento: String(d.cNumTitulo || d.cNumOS || d.cNumCtr || ''),
        data: String(d.dDtPrevisao || ''), valor: Number(d.nValorTitulo) || 0, natureza: String(d.cNatureza || ''), situacao: String(d.cStatus || '') };
    }) };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiSalvarProvisao(sessionId, payload) {
  try {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_PROVISOES', 'registrar a provisão'), p = payload || {}, valor = Number(p.valor), descricao = String(p.descricao || '').trim();
    Omie_dia_(p.vencimento);
    if (['P', 'R'].indexOf(p.tipo) < 0 || !(valor > 0) || !isFinite(valor) || valor > 1e12 || descricao.length < 3 || descricao.length > 250) throw new Error('Informe tipo, descrição (3 a 250 caracteres), data e valor positivo.');
    if (!/^[a-f0-9-]{36}$/i.test(String(p.id || ''))) throw new Error('Identificador inválido. Atualize a tela.');
    var conta = Omie_contaHash_();
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      Omie_provisoesGarantir_();
      var anterior = SGO_DATA.getById(OMIE_PROV_ABA, p.id);
      if (anterior) {
        if (anterior.CONTA_HASH !== conta) throw new Error('Identificador indisponível. Atualize a tela.');
        return { ok: true, mensagem: 'Esta provisão já está registrada.' };
      }
      SGO_DATA.insert(OMIE_PROV_ABA, { ID: p.id, TIPO: p.tipo, DESCRICAO: Omie_textoPlanilha_(descricao), VALOR: Math.round(valor * 100) / 100,
        VENCIMENTO: p.vencimento, SITUACAO: 'PREVISTA', AUTOR: Omie_textoPlanilha_(eu.usuario), CRIADO_EM: new Date().toISOString(), ATUALIZADO_EM: new Date().toISOString(), CONTA_HASH: conta });
      SGO_DATA.log('OMIE_PROVISAO_CRIADA', eu.usuario, 'Provisão ' + p.id, 'FINANCEIRO');
    } finally { lock.releaseLock(); }
    return { ok: true, mensagem: 'Provisão registrada no SGO+. Não foi criado título no Omie.' };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiCancelarProvisao(sessionId, payload) {
  try {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_PROVISOES', 'cancelar a provisão'), id = String((payload || {}).id || ''), conta = Omie_contaHash_();
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      Omie_provisoesGarantir_();
      var r = SGO_DATA.getById(OMIE_PROV_ABA, id);
      if (!r || r.CONTA_HASH !== conta) throw new Error('Provisão não encontrada.');
      SGO_DATA.update(OMIE_PROV_ABA, id, { SITUACAO: 'CANCELADA', ATUALIZADO_EM: new Date().toISOString() });
      SGO_DATA.log('OMIE_PROVISAO_CANCELADA', eu.usuario, 'Provisão ' + id, 'FINANCEIRO');
    } finally { lock.releaseLock(); }
    return { ok: true, mensagem: 'Provisão cancelada. O histórico foi preservado.' };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiComissoes(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    return { ok: true, configurada: true, mensagem: 'As comissões ficam em Ganhos dos vendedores: comissão sobre o valor recebido, por faixa, com fechamento mensal.' };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
