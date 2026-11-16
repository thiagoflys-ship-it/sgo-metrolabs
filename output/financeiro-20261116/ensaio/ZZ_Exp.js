/** Pente fino (16/11/2026), somente leitura: quem chega hoje às partes do Financeiro fora do Painel (Compras, Caju, viagem, relatório diário). */
function Ensaio_exp_() {
  try { Omie_registrarAcesso_ = function () {}; } catch (e) {}
  var contas = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS), out = [];
  var cod = ['CAJU_VER', 'CAJU_CARGA', 'CAJU_CONCILIAR', 'VIAGEM_DEPOSITAR', 'VIAGEM_CONFERIR', 'FIN_OMIE_CONSULTAR'];
  try { if (typeof RELDIA_PODER !== 'undefined') cod.push(RELDIA_PODER); } catch (e) {}
  contas.forEach(function (u) {
    if (String(u.STATUS).toUpperCase() !== 'ATIVO') return;
    var s = { userId: String(u.ID), usuario: String(u.USUARIO), nome: String(u.NOME), perfil: String(u.PERFIL).toUpperCase() };
    validarSessao = function () { return { valid: true, data: s }; };
    try { Poderes_memoLimpar_(); } catch (e) {}
    var r = { login: s.usuario, perfil: s.perfil, area: String(u.AREA || ''), sigilo: Omie_contaNoSigilo_(s.userId) };
    try { var eu = Cmp_eu_('x'); r.cmpFin = !!eu.financeiro; r.cartoes = CmpCart_podeVer_(eu); r.conciliar = Cmp_cx_(eu, 'FIN_FATURAS_CONCILIAR', !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin)); } catch (e) { r.cmpErro = String(e.message).slice(0, 80); }
    var pe = Poderes_eu_(s);
    cod.forEach(function (c) { try { var a = Poderes_avaliar_(pe, Poderes_poder_(c)); if (a.valor) r[c] = a.origem; } catch (e) { r[c] = 'erro'; } });
    out.push(r);
  });
  return out.filter(function (r) { return r.cmpFin || r.conciliar || r.CAJU_VER || r.CAJU_CARGA || r.CAJU_CONCILIAR || r.VIAGEM_DEPOSITAR || r.VIAGEM_CONFERIR || r.FIN_OMIE_CONSULTAR || (typeof RELDIA_PODER !== 'undefined' && r[RELDIA_PODER]) || r.cartoes; });
}
