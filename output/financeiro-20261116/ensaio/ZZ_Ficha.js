/** Ensaio somente leitura (16/11/2026): Ficha do cliente com o Omie real. Só contagens e coerência; nada é gravado nem mostrado. */
function Ensaio_ficha_() {
  validarSessao = function () { return { valid: true, data: { usuario: 'ensaio', userId: 'ensaio', perfil: 'FINANCEIRO' } }; };
  SGO_pode_ = function () { return true; };
  if (typeof Omie_contaNoSigilo_ === 'function') Omie_contaNoSigilo_ = function () { return true; };
  if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_ = function () {};
  var out = { clientes: [] };
  var v = Omie_apiVencidosClientes('x');
  out.vencidosOk = v.ok;
  if (!v.ok) { out.msg = v.mensagem; return out; }
  // até 3 clientes com vencidos: confere o filtro por cliente e a coerência com a lista de vencidos
  var m = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 50, cTpLancamento: 'CR', cStatus: 'ATRASADO' });
  var vistos = {}, alvos = [];
  (m.movimentos || []).forEach(function (x) { var d = x.detalhes || {}; if (d.cCPFCNPJCliente && !vistos[d.nCodCliente] && alvos.length < 3) { vistos[d.nCodCliente] = 1; alvos.push({ cod: Number(d.nCodCliente), cnpj: d.cCPFCNPJCliente }); } });
  alvos.forEach(function (a) {
    var t0 = Date.now(), f = Omie_apiClienteFicha('x', { cnpj: a.cnpj });
    var linha = f.ok ? (v.clientes || []).filter(function (c) { return c.cliente && c.cliente === f.nomeOmie; })[0] : null;
    var bruto = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 100, cTpLancamento: 'CR', nCodCliente: a.cod });
    var outros = (bruto.movimentos || []).filter(function (x) { return Number(x.detalhes.nCodCliente) !== a.cod; }).length;
    out.clientes.push({ ok: f.ok, msg: f.ok ? '' : String(f.mensagem).slice(0, 120), segundos: Math.round((Date.now() - t0) / 1000), cadastrosOmie: f.cadastrosOmie,
      filtroPorCliente: { lidos: (bruto.movimentos || []).length, deOutroCliente: outros, paginas: bruto.nTotPaginas },
      titulosAbertos: f.totais ? f.totais.titulosAbertos : null, titulosVencidos: f.totais ? f.totais.titulosVencidos : null, recebimentos12m: f.totais ? f.totais.recebimentos12m : null,
      vencidosIgualListaDeVencidos: f.totais && linha ? (linha.titulos === f.totais.titulosVencidos && Math.abs(linha.valor - f.totais.vencido) < 0.01) : 'sem linha comparável',
      cortado: f.cortado });
  });
  return out;
}
