/** Verificação somente leitura (16/11/2026) do sigilo publicado: quem passa, quem não passa. Registro de acessos desligado. */
function Ensaio_verif_() {
  Omie_registrarAcesso_ = function () {};
  var contas = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS), out = { lista: OmieSig_lista_().length, propriedadeVazia: !String(PropertiesService.getScriptProperties().getProperty('OMIE_SIGILO_CONTAS') || ''), comCaixa: [], negadosSigilo: 0, excecoesFin: 0, telaAcessosSigilo: 0 };
  contas.forEach(function (u) {
    if (String(u.STATUS).toUpperCase() !== 'ATIVO') return;
    var s = { userId: String(u.ID), usuario: String(u.USUARIO), nome: String(u.NOME), perfil: String(u.PERFIL).toUpperCase() };
    validarSessao = function () { return { valid: true, data: s }; };
    try { Poderes_memoLimpar_(); } catch (e) {}
    var eu = Poderes_eu_(s), cx = Poderes_avaliar_(eu, Poderes_poder_('FIN_OMIE_CONSULTAR'));
    var ini = Omie_apiIniciar('x'), sig = Omie_apiSigilo('x');
    if (cx.valor || ini.ver || sig.ok) out.comCaixa.push(s.usuario + ' (caixa ' + cx.valor + ', menu ' + ini.ver + ', sigilo ' + sig.ok + (sig.ok ? ', diretoria ' + sig.diretoria + ', dono ' + sig.dono : '') + ')');
    else if (/sigiloso/.test(sig.mensagem || '')) out.negadosSigilo++;
    if (cx.origem === 'sigilo') out.telaAcessosSigilo++;
  });
  try { out.excecoesFin = Poderes_lerAba_(PODERES_ABA_EXC).filter(function (l) { return /^FIN_OMIE_/.test(String(l.PODER)); }).length; } catch (e) { out.excecoesFin = 'erro ' + e.message; }
  return out;
}
