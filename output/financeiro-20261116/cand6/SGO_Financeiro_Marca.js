/**
 * Financeiro: identificação de quem vê, imprime e baixa (16/11/2026, especificação do Financeiro, seção 5).
 *
 * O navegador não impede foto de tela. O que funciona é identificar e lembrar a pessoa no momento do uso:
 * - Fin_marca_(sessao): nome e login de quem está na tela, com a hora do servidor, para a marca d'água (JS_Financeiro_Marca.html).
 *   Vem sempre da sessão conferida no servidor, nunca de campo digitado. Devolve só texto e número (nada de Date cru).
 * - Fin_planilhaIdentificada_(sessao, o): toda planilha do Financeiro sai com a linha "Gerado por ... · código XXXX-XXXX" no
 *   começo e o código repetido no fim. O código é único por download e fica no registro de acessos (FIN_OMIE_ACESSOS) com a
 *   quantidade de linhas e o resumo SHA-256 do conteúdo. Nenhum valor vai para o registro.
 * As duas são internas (terminam em "_"): quem chama é uma função pública que já conferiu a sessão e o acesso.
 */
function FinMarca_s_(v) { return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t;"<>]/g, ' ').replace(/\s+/g, ' ').trim(); }
function FinMarca_agora_() {
  var d = new Date();
  try { return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e) {}
  var p = function (n) { return ('0' + n).slice(-2); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
/** { nome, usuario, agora: 'dd/mm/aaaa hh:mm', agoraMs } de quem está na sessão. */
function Fin_marca_(sessao) {
  sessao = sessao || {};
  var nome = FinMarca_s_(sessao.nome) || FinMarca_s_(sessao.usuario || sessao.login);
  return { nome: nome.slice(0, 80), usuario: FinMarca_s_(sessao.usuario || sessao.login).slice(0, 60), agora: FinMarca_agora_(), agoraMs: Date.now() };
}
function FinMarca_codigo_() {
  var u = String(Utilities.getUuid()).replace(/[^0-9a-f]/gi, '').toUpperCase();
  return u.slice(0, 4) + '-' + u.slice(4, 8);
}
function FinMarca_sha_(texto) {
  try {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset ? Utilities.Charset.UTF_8 : undefined)
      .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  } catch (e) { return ''; }
}
/**
 * Registra o download e devolve as linhas de identificação.
 * o: { nome (arquivo), conteudo (texto da planilha, para o resumo), linhas (quantidade), consulta (nome do registro) }
 */
function Fin_planilhaIdentificada_(sessao, o) {
  o = o || {};
  var m = Fin_marca_(sessao), codigo = FinMarca_codigo_();
  var nome = FinMarca_s_(o.nome).replace(/[^\w.\- ]/g, '').slice(0, 80) || 'planilha';
  var linhas = Math.max(0, Math.floor(Number(o.linhas) || 0));
  var sha = FinMarca_sha_(o.conteudo);
  var quem = m.nome + (m.usuario ? ' (' + m.usuario + ')' : '');
  if (typeof Omie_registrarAcesso_ === 'function') {
    Omie_registrarAcesso_(sessao, 'CSV', o.consulta || 'Omie_apiCsv', nome + ' · ' + linhas + ' linha(s) · código ' + codigo + (sha ? ' · resumo ' + sha.slice(0, 16) : ''));
  }
  return {
    codigo: codigo,
    cabecalho: 'Gerado por ' + quem + ' em ' + m.agora + ' · uso interno do Financeiro · código ' + codigo,
    rodape: 'Fim da planilha · código ' + codigo + ' · o repasse deste arquivo é rastreado pelo código'
  };
}
