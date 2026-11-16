/** Ensaio somente leitura (16/11/2026): ficha x vencidos agrupados pelo CÓDIGO do cliente (mesma regra da lista). Só contagens e se bate. */
function Ensaio_ficha3_() {
  validarSessao = function () { return { valid: true, data: { usuario: 'ensaio', userId: 'ensaio', perfil: 'FINANCEIRO' } }; };
  SGO_pode_ = function () { return true; }; Omie_contaNoSigilo_ = function () { return true; }; Omie_registrarAcesso_ = function () {};
  var grupos = {}, cnpj = {}, vistos = {}, pagina = 1, paginas = 1;
  do {
    var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 50, cTpLancamento: 'CR', cStatus: 'ATRASADO' });
    paginas = Number(r.nTotPaginas) || 0;
    (r.movimentos || []).forEach(function (m) { var x = m.detalhes || {}, s = m.resumo || {}; var id = String(x.nCodTitulo); if (vistos[id] || x.cNatureza !== 'R' || !(Number(s.nValAberto) > 0)) return; vistos[id] = 1;
      var c = String(x.nCodCliente); var g = grupos[c] || (grupos[c] = { t: 0, cent: 0 }); g.t++; g.cent += Math.round(Number(s.nValAberto) * 100); if (x.cCPFCNPJCliente) cnpj[c] = x.cCPFCNPJCliente; });
    pagina++;
  } while (pagina <= paginas);
  var cods = Object.keys(grupos).filter(function (c) { return cnpj[c]; }).slice(0, 6), out = [];
  cods.forEach(function (c) {
    var f = Omie_apiClienteFicha('x', { cnpj: cnpj[c] });
    out.push({ ok: f.ok, msg: f.ok ? '' : String(f.mensagem).slice(0, 100), cadastros: f.cadastrosOmie, listaTitulos: grupos[c].t, fichaTitulosVencidos: f.totais ? f.totais.titulosVencidos : null,
      totalBate: f.totais ? Math.abs(grupos[c].cent / 100 - f.totais.vencido) < 0.01 : null, fichaMaiorQueLista: f.totais ? f.totais.vencido > grupos[c].cent / 100 : null });
  });
  return { clientesComVencidos: Object.keys(grupos).length, semCnpjNoMovimento: Object.keys(grupos).length - Object.keys(cnpj).length, comparados: out };
}
