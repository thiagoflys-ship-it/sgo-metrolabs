/** 16/11/2026, somente leitura: quem aprova compras e viagem com APROVACAO_SO_DIRETORIA (padrão SIM). */
function Ensaio_apr_() {
  var us = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS), out = {};
  us.filter(function (u) { return String(u.STATUS).toUpperCase() === 'ATIVO'; }).forEach(function (u) {
    var s = { userId: String(u.ID), usuario: String(u.USUARIO), nome: String(u.NOME), perfil: String(u.PERFIL).toUpperCase() };
    validarSessao = function () { return { valid: true, data: s }; }; exigirSessao = function () { return s; };
    try { Poderes_memoLimpar_(); } catch (e) {}
    var l = [];
    ['COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA', 'COMPRAS_APROVAR_SEM_LIMITE', 'VIAGEM_APROVAR', 'VIAGEM_APROVAR_DIRETORIA'].forEach(function (c) { try { if (SGO_pode_('x', c)) l.push(c); } catch (e) {} });
    if (l.length) out[s.usuario] = l.join(',');
  });
  return out;
}
