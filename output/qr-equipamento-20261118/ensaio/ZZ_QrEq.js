/** 18/11/2026, somente leitura: o que o QR de cada equipamento mostra (contagem por pasta e origem). */
function Ensaio_qrSessao_() {
  var adm = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return String(u.USUARIO) === 'admin'; })[0];
  return { userId: String(adm.ID), usuario: 'admin', nome: String(adm.NOME), perfil: String(adm.PERFIL).toUpperCase() };
}
function Ensaio_qrResumo_(r) {
  var porPasta = {}, porOrigem = {}, daUn = 0, itens = [];
  (r.pastas || []).forEach(function (p) { p.itens.forEach(function (it) {
    porPasta[p.id] = (porPasta[p.id] || 0) + 1; if (it.daUnidade) daUn++;
    porOrigem[it.origemNome] = (porOrigem[it.origemNome] || 0) + 1;
    itens.push({ p: p.id, t: String(it.titulo).slice(0, 70), eq: it.equipamentoId, un: it.unidadeId, du: it.daUnidade ? 1 : 0, ant: (it.anteriores || []).length });
  }); });
  return { total: r.total, porPasta: porPasta, porOrigem: porOrigem, daUnidade: daUn, itens: itens };
}
function Ensaio_qrEq_(ids, detalhe) {
  var s = Ensaio_qrSessao_(), out = {};
  ids.forEach(function (id) {
    try { var r = Docs_doEquipamento_(s, id, 'qr'); var z = Ensaio_qrResumo_(r); if (!detalhe) delete z.itens; out[id] = z; }
    catch (e) { out[id] = { erro: String(e.message || e) }; }
  });
  return out;
}
/** Amostra: equipamentos de vários clientes. */
function Ensaio_qrAmostra_() {
  var E = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS), porCli = {};
  E.forEach(function (e) { var c = String(e.CLIENTE_ID || ''); (porCli[c] = porCli[c] || []).push(e); });
  return Object.keys(porCli).map(function (c) { return { c: c, n: porCli[c].length, ids: porCli[c].slice(0, 3).map(function (e) { return String(e.ID) + '|' + e.TAG + '|' + e.TIPO + '|' + e.UNIDADE_ID; }) }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 15);
}
/** Índice bruto: itens sem equipamento por pasta, com/sem unidade. */
function Ensaio_qrIndice_() {
  var idx = Docs_indice_({}), r = { total: idx.itens.length, semEq: {}, semEqSemUn: {}, porOrigem: {} };
  idx.itens.forEach(function (it) {
    r.porOrigem[it.origem] = (r.porOrigem[it.origem] || 0) + 1;
    if (!it.equipamentoId) { r.semEq[it.pasta] = (r.semEq[it.pasta] || 0) + 1; if (!it.unidadeId) r.semEqSemUn[it.pasta + ':' + it.origem] = (r.semEqSemUn[it.pasta + ':' + it.origem] || 0) + 1; }
  });
  return r;
}
