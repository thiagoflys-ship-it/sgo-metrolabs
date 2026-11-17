'use strict';
// 17/11/2026 (falhas antigas): fim de linha dos arquivos do legado.
// Os testes antigos exigiam CRLF porque o repositório (apps-script-imports) guarda os arquivos em CRLF. Os testes rodam contra a
// cópia da PRODUÇÃO (DEST = conteúdo do contêiner), e no contêiner boa parte do legado está em LF desde antes de 10/11/2026
// (já em output/comercial-20261110/base). O risco que a afirmação protegia é a edição por script que mistura CRLF e LF e falha
// em silêncio (feedback "Edição por script em CRLF falha em silêncio"). O que vale conferir é: o arquivo tem quebra de linha e
// TODAS as linhas terminam igual (todas CRLF ou todas LF), nunca misturado.
function contar(texto) {
  const t = String(texto || '');
  return { crlf: (t.match(/\r\n/g) || []).length, lf: (t.match(/\n/g) || []).length };
}
/** true quando há quebra de linha e todas são CRLF ou todas são LF. */
function terminacaoUniforme(texto) {
  const c = contar(texto);
  return c.lf > 0 && (c.crlf === c.lf || c.crlf === 0);
}
/** Mensagem para o assert: nome, CRLF e LF contados. */
function descreverTerminacao(nome, texto) {
  const c = contar(texto);
  return nome + ' com fim de linha misturado ou sem quebra de linha (CRLF=' + c.crlf + ', quebras=' + c.lf + ')';
}
module.exports = { terminacaoUniforme, descreverTerminacao };
