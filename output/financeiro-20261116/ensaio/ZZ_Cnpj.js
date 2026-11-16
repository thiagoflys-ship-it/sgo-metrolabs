/** 16/11/2026: grava o CNPJ da empresa por ordem do dono (Chaves e senhas, como o dono faria) e confere gravação e configurações. */
function Ensaio_cnpj_() {
  var adm = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return String(u.USUARIO) === 'admin'; })[0];
  var s = { userId: String(adm.ID), usuario: 'admin', nome: String(adm.NOME), perfil: String(adm.PERFIL).toUpperCase() };
  validarSessao = function () { return { valid: true, data: s }; }; exigirSessao = function () { return s; };
  var r = Chaves_apiGravar('x', { chave: 'OMIE_EMPRESA_CNPJ', valor: '32.487.278/0001-21' });
  var p = PropertiesService.getScriptProperties();
  var chaves = ['OMIE_GRAVACAO_LIGADA', 'OMIE_EMPRESA_CNPJ', 'OMIE_NFE_COMPRA_DESTINO', 'OMIE_NFSE_RETENCOES', 'OMIE_ALCADA_SEGUNDA_CONFIRMACAO', 'OMIE_ALCADA_APROVACAO', 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU'], v = {};
  chaves.forEach(function (k) { v[k] = String(p.getProperty(k) || '(vazio = padrão)'); });
  return { ok: r && r.ok !== false, mensagem: r && (r.mensagem || r.message), valores: v };
}
