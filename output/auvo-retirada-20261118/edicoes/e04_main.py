ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Auvo_Main.js'
PARES = [
("""function Auvo_autenticar_() {
  var props = PropertiesService.getScriptProperties();""",
"""function Auvo_autenticar_() {
  // 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Nenhum login é tentado; as credenciais gravadas não são lidas.
  if (typeof Auvo_descontinuado_ === 'function' && Auvo_descontinuado_()) throw Auvo_erroDescontinuado_();
  var props = PropertiesService.getScriptProperties();"""),
("""function Auvo_apiFetch_(method, path, body) {
  var jaReautenticou = false;""",
"""function Auvo_apiFetch_(method, path, body) {
  // 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Nenhuma chamada sai para a API do Auvo.
  if (typeof Auvo_descontinuado_ === 'function' && Auvo_descontinuado_()) throw Auvo_erroDescontinuado_();
  var jaReautenticou = false;"""),
("""function Auvo_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};
""",
"""function Auvo_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  // 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A tela Integração Auvo saiu do sistema. Fica só a
  // consulta de uma O.S. já copiada (histórico do equipamento, leitura da aba AUVO_TAREFAS, sem chamar o Auvo).
  // Os balões de atendimento (apiVerificarNovosEventos) respondem vazio para navegadores com a página antiga aberta.
  if (fn === 'apiVerificarNovosEventos') return { ok: true, eventos: [], agora: SGO_UTILS.nowIso(), descontinuado: true };
  if (fn === 'apiObterOS') return Auvo_apiObterOS(req.sessionId, payload);
  if (fn === 'apiPing') return Auvo_respostaDescontinuado_();
  throw Auvo_erroDescontinuado_();
"""),
("""function Auvo_obterConteudoModulo() {
  return AUVO_CONTEUDO_MODULO;
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono. A tela Integração Auvo não é mais servida (a página da integração fica no arquivo
// SGO_Auvo_ConteudoModulo.js apenas como registro; nenhum menu chega a ela).
function Auvo_obterConteudoModulo() {
  return '';
}"""),
("""function Auvo_criarTarefa_(dados) {
  Auvo_bootstrap_();""",
"""function Auvo_criarTarefa_(dados) {
  // 18/11/2026: Auvo descontinuado pelo dono. Os módulos não criam mais tarefa no Auvo (as chamadas foram retiradas);
  // se algum caminho antigo ainda chamar, recusa sem tocar na rede.
  if (typeof Auvo_descontinuado_ === 'function' && Auvo_descontinuado_()) throw Auvo_erroDescontinuado_();
  Auvo_bootstrap_();"""),
]
