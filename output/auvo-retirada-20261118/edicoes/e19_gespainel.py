ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Gestao_Painel.js'
PARES = [
("""/** A linha de GES_DECISOES fica fora da avaliação do gestor? (saneada, saneamento ou cadastro) */
function GesP_foraDaAvaliacao_(r, corte) {
  if (Ges_up_(r.SITUACAO) === 'SANEADA') return true;""",
 """/** A linha de GES_DECISOES fica fora da avaliação do gestor? (saneada, retirada, saneamento ou cadastro) */
function GesP_foraDaAvaliacao_(r, corte) {
  if (Ges_up_(r.SITUACAO) === 'SANEADA') return true;
  // 18/11/2026: Auvo descontinuado pelo dono. Item do Auvo (retirado ou ainda não sincronizado) não conta para ninguém.
  if (Ges_up_(r.SITUACAO) === 'RETIRADA' || (typeof Ges_ehItemAuvo_ === 'function' && Ges_ehItemAuvo_(r.ITEM_ID, r.TIPO))) return true;"""),
("""  var todas = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM'; });""",
 """  // 18/11/2026: itens retirados com o Auvo (SITUACAO RETIRADA) ficam fora do painel; o histórico continua na aba.
  var todas = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM' && Ges_up_(r.SITUACAO) !== 'RETIRADA'; });"""),
]
