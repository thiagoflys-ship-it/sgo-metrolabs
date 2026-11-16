/** 16/11/2026, somente leitura: admin, charles e matheusgodoi abrem o relato? Devolve só contagens, nunca o texto. */
function Ensaio_rel_() {
  var us = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS), out = {};
  ['admin', 'charles', 'matheusgodoi'].forEach(function (login) {
    var u = us.filter(function (x) { return String(x.USUARIO) === login; })[0]; if (!u) { out[login] = 'sem conta'; return; }
    var s = { userId: String(u.ID), usuario: login, nome: String(u.NOME), perfil: String(u.PERFIL).toUpperCase() };
    validarSessao = function () { return { valid: true, data: s }; }; exigirSessao = function () { return s; };
    var l = Conduta_apiListarOcorrencias('x', {}); l = (l && l.ocorrencias) || l || [];
    var ok = 0, comTexto = 0, erro = '';
    (Array.isArray(l) ? l : []).slice(0, 15).forEach(function (o) { try { var r = Conduta_apiObterRelatoOcorrencia('x', { id: o.ID }); if (r && r.ok !== false) { ok++; if (String(r.relato || '').trim()) comTexto++; } else erro = String(r && (r.mensagem || r.message)).slice(0, 80); } catch (e) { erro = String(e.message).slice(0, 80); } });
    out[login] = { naLista: Array.isArray(l) ? l.length : 'formato ' + typeof l, abriram: ok, comRelato: comTexto, erro: erro };
  });
  return out;
}
