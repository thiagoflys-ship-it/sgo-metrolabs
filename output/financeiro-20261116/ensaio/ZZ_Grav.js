/** 16/11/2026: liga a gravação no Omie por ordem do dono (Chaves e senhas, como o dono faria), e confere. */
function Ensaio_grav_() {
  var adm = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return String(u.USUARIO) === 'admin'; })[0];
  var s = { userId: String(adm.ID), usuario: 'admin', nome: String(adm.NOME), perfil: String(adm.PERFIL).toUpperCase() };
  validarSessao = function () { return { valid: true, data: s }; };
  exigirSessao = function () { return s; };
  var r = Chaves_apiGravar('x', { chave: 'OMIE_GRAVACAO_LIGADA', valor: '1' });
  return { ok: r && r.ok !== false, mensagem: r && (r.mensagem || r.message), ligada: Omie_gravacaoLigada_ ? Omie_gravacaoLigada_() : String(PropertiesService.getScriptProperties().getProperty('OMIE_GRAVACAO_LIGADA')) };
}
