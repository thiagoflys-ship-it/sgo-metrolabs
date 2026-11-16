/** Ensaio somente leitura (16/11/2026): Ficha do cliente — recebimentos e diferença com a lista de vencidos. Só contagens. */
function Ensaio_ficha2_() {
  validarSessao = function () { return { valid: true, data: { usuario: 'ensaio', userId: 'ensaio', perfil: 'FINANCEIRO' } }; };
  SGO_pode_ = function () { return true; }; Omie_contaNoSigilo_ = function () { return true; }; Omie_registrarAcesso_ = function () {};
  var out = {};
  // 1) clientes que pagaram em novembro: a ficha mostra recebimentos?
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var p = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 50, cTpLancamento: 'CR', dDtPagtoDe: '01/11/2026', dDtPagtoAte: hoje });
  var vistos = {}, alvos = [];
  (p.movimentos || []).forEach(function (x) { var d = x.detalhes || {}; if (d.cCPFCNPJCliente && !vistos[d.nCodCliente] && alvos.length < 2) { vistos[d.nCodCliente] = 1; alvos.push({ cod: Number(d.nCodCliente), cnpj: d.cCPFCNPJCliente }); } });
  out.pagaramEmNovembro = alvos.map(function (a) {
    var f = Omie_apiClienteFicha('x', { cnpj: a.cnpj });
    var b; try { b = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 100, cTpLancamento: 'CR', nCodCliente: a.cod }); } catch (e) { b = { movimentos: [], erro: String(e.message).slice(0, 90) }; }
    var comPagto = (b.movimentos || []).filter(function (x) { return !!x.detalhes.dDtPagamento; }).length, comPago = (b.movimentos || []).filter(function (x) { return Number((x.resumo || {}).nValPago) > 0; }).length;
    var status = {}; (b.movimentos || []).forEach(function (x) { status[x.detalhes.cStatus] = (status[x.detalhes.cStatus] || 0) + 1; });
    return { erroBruto: b.erro || "", ok: f.ok, msg: f.ok ? '' : f.mensagem, recebimentos12m: f.totais ? f.totais.recebimentos12m : null, movimentos: (b.movimentos || []).length, comDataPagamento: comPagto, comValorPago: comPago, status: status };
  });
  // 2) a lista de vencidos x a ficha, por cliente (até 5), comparando contagens e se o total bate
  var v = Omie_apiVencidosClientes('x');
  var mv = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 50, cTpLancamento: 'CR', cStatus: 'ATRASADO' });
  var cods = {}, lista = [];
  (mv.movimentos || []).forEach(function (x) { var d = x.detalhes || {}; if (d.cCPFCNPJCliente && !cods[d.nCodCliente] && lista.length < 5) { cods[d.nCodCliente] = 1; lista.push({ cod: Number(d.nCodCliente), cnpj: d.cCPFCNPJCliente }); } });
  out.comparacao = lista.map(function (a) {
    var f = Omie_apiClienteFicha('x', { cnpj: a.cnpj });
    var linhas = (v.clientes || []).filter(function (c) { return c.cliente && c.cliente === f.nomeOmie; });
    var b; try { b = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 100, cTpLancamento: 'CR', nCodCliente: a.cod }); } catch (e) { b = { movimentos: [], erro: String(e.message).slice(0, 90) }; }
    var hojeIso = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    var abertosVencidosPorData = 0, statusAtrasado = 0, statusDosAbertosVencidos = {};
    (b.movimentos || []).forEach(function (x) { var d = x.detalhes, r = x.resumo || {}; var iso = String(d.dDtVenc).split('/').reverse().join('-');
      if (Number(r.nValAberto) > 0 && iso < hojeIso && d.cStatus !== 'CANCELADO') { abertosVencidosPorData++; statusDosAbertosVencidos[d.cStatus] = (statusDosAbertosVencidos[d.cStatus] || 0) + 1; }
      if (d.cStatus === 'ATRASADO' && Number(r.nValAberto) > 0) statusAtrasado++; });
    return { linhasComMesmoNome: linhas.length, listaTitulos: linhas[0] ? linhas[0].titulos : null, fichaVencidos: f.totais ? f.totais.titulosVencidos : null,
      totalBate: linhas[0] && f.totais ? Math.abs(linhas[0].valor - f.totais.vencido) < 0.01 : null, abertosVencidosPorData: abertosVencidosPorData, statusAtrasadoComSaldo: statusAtrasado, statusDosAbertosVencidos: statusDosAbertosVencidos };
  });
  return out;
}
