/** 16/11/2026, somente leitura: indicadores para a Wanessa (só contagens) e recusa para quem está fora da lista. */
function Ensaio_ind_() {
  try { Omie_registrarAcesso_ = function () {}; } catch (e) {}
  var us = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS), out = {};
  ['wanessa', 'bruna'].forEach(function (login) {
    var u = us.filter(function (x) { return String(x.USUARIO) === login; })[0];
    var s = { userId: String(u.ID), usuario: login, nome: String(u.NOME), perfil: String(u.PERFIL).toUpperCase() };
    validarSessao = function () { return { valid: true, data: s }; }; exigirSessao = function () { return s; };
    try { Poderes_memoLimpar_(); } catch (e) {}
    var r = Fin_apiIndicadores('x', {});
    out[login] = r && r.ok ? { ok: true, chaves: Object.keys(r).slice(0, 12), cartoes: (r.indicadores || r.cartoes || []).length, graficos: (r.graficos || []).length, saudeTem: !!(r.saude), notaTipo: r.saude ? typeof r.saude.nota : null } : { ok: false, msg: String(r && (r.mensagem || r.message)).slice(0, 120) };
  });
  return out;
}
