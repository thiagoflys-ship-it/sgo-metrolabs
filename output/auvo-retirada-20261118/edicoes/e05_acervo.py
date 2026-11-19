ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_AuvoAcervo.js'
PARES = [
("""function AuvoAcervo_getAuvo_(caminho, prazo) {
""",
"""function AuvoAcervo_getAuvo_(caminho, prazo) {
  // 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). O acervo não lê mais nada do Auvo.
  if (typeof Auvo_descontinuado_ === 'function' && Auvo_descontinuado_()) throw Auvo_erroDescontinuado_();
"""),
("""function AuvoAcervo_agendar_(ms) {
  AuvoAcervo_removerGatilhos_();
  ScriptApp.newTrigger(AUVO_ACERVO_CFG.GATILHO).timeBased().after(Math.max(1000, ms)).create();
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono. A cópia do acervo terminou de vez: nada é agendado; só remove o que existir.
function AuvoAcervo_agendar_(ms) {
  AuvoAcervo_removerGatilhos_();
}"""),
("""function AuvoAcervo_loteGatilho(e) {
  return AuvoAcervo_rodarLote_();
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono. Se o agendador ainda chamar, só remove o próprio gatilho (não lê o Auvo).
function AuvoAcervo_loteGatilho(e) {
  return Auvo_retirarGatilhos_(AUVO_ACERVO_CFG.GATILHO);
}"""),
("""  if (!AuvoAcervo_perfilPode_(sessao && sessao.perfil)) {
    throw new Error('O acervo do Auvo é só do Administrador e da Diretoria. Peça a um deles para abrir esta parte da tela.');
  }
  var allow = {
    apiStatus: AuvoAcervo_apiStatus,
    apiIniciarContagem: AuvoAcervo_apiIniciarContagem,
    apiIniciarCopia: AuvoAcervo_apiIniciarCopia,
    apiPausar: AuvoAcervo_apiPausar,
    apiContinuar: AuvoAcervo_apiContinuar,
    apiTentarDeNovo: AuvoAcervo_apiTentarDeNovo,
    apiConferir: AuvoAcervo_apiConferir,
    apiListarFalhas: AuvoAcervo_apiListarFalhas,
    apiConsultarTarefa: AuvoAcervo_apiConsultarTarefa
  };
  if (!allow[fn]) throw new Error('Função não permitida ou não encontrada: ' + fn);""",
"""  if (!AuvoAcervo_perfilPode_(sessao && sessao.perfil)) {
    throw new Error('O histórico do Auvo é só do Administrador e da Diretoria. Peça a um deles para consultar.');
  }
  // 18/11/2026: Auvo descontinuado pelo dono. O acervo fica só para consulta: contar, copiar, pausar, continuar,
  // repetir falhas e conferir saíram (todos dependiam do Auvo ou reagendavam a cópia).
  var allow = {
    apiStatus: AuvoAcervo_apiStatus,
    apiListarFalhas: AuvoAcervo_apiListarFalhas,
    apiConsultarTarefa: AuvoAcervo_apiConsultarTarefa
  };
  if (/^api(IniciarContagem|IniciarCopia|Pausar|Continuar|TentarDeNovo|Conferir)$/.test(fn)) throw Auvo_erroDescontinuado_();
  if (!allow[fn]) throw new Error('Função não permitida ou não encontrada: ' + fn);"""),
]
