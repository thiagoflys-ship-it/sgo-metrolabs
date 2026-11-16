/** Sessão e perfil conferidos aqui em toda chamada; MAC e senha não retornam ao navegador. */
function Alarme_api(sessionId, acao, dados) {
  return AutPred_resposta_(function () {
    var s = AutPred_sessao_(sessionId);
    if (AUT_PERFIS_INTERNOS.indexOf(AutPred_perfil_(s)) < 0 && !AutPred_ehDono_(s)) throw new Error('O alarme é exclusivo da equipe interna.');
    if (['configuracao', 'salvar', 'habilitar', 'desligar'].indexOf(String(acao || '')) >= 0 && !AutPred_administra_(s)) throw new Error('Somente Admin e Diretoria configuram o alarme.');
    if (typeof SGO_INTELBRAS === 'undefined') throw new Error('A integração Intelbras requer o servidor próprio do SGO+.');
    return SGO_INTELBRAS.chamar(String(acao || ''), { id:String(s.userId), nome:AutPred_nome_(s), dono:AutPred_ehDono_(s), admin:AutPred_administra_(s) }, dados || {});
  });
}
