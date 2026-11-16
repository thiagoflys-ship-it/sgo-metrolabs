/**
 * 12/11/2026: aviso de versão nova do SGO+.
 *
 * O SGO+ é uma página única: as telas (Index.html e os JS_*.html incluídos nele)
 * chegam ao navegador uma vez, quando a página é aberta, e nunca mais são lidas.
 * Quem estava com a página aberta desde antes de uma publicação continuava com as
 * telas antigas (caso real: o campo "Faturar para" do orçamento da Assistência não
 * aparecia, porque a tela tinha sido aberta antes da publicação).
 *
 * Aqui: um resumo (SHA-256) do conteúdo de Index.html e de todos os arquivos que ele
 * inclui, direta ou indiretamente, calculado uma vez por processo (os arquivos do
 * legado são lidos na partida do servidor; uma publicação reinicia o processo).
 * A página grava o resumo com que foi montada e, de tempos em tempos, compara com
 * SGO_versaoTelas(). Se mudou, mostra um aviso discreto com o botão Atualizar;
 * nunca recarrega sozinha (regra do dono: não apagar o que a pessoa digitou).
 */
var SGO_VERSAO_TELAS_CACHE_ = "";

function SGO_versaoTelasCalcular_() {
  if (SGO_VERSAO_TELAS_CACHE_) return SGO_VERSAO_TELAS_CACHE_;
  var vistos = {};
  var partes = [];
  function visitar(nome) {
    if (!nome || vistos[nome]) return;
    vistos[nome] = true;
    var conteudo;
    try { conteudo = HtmlService.createHtmlOutputFromFile(nome).getContent(); } catch (e) { return; }
    partes.push(nome + "\n" + conteudo);
    var re = /include\(\s*['"]([^'"]+)['"]\s*\)/g, m;
    while ((m = re.exec(conteudo))) visitar(m[1]);
  }
  visitar("Index");
  if (!partes.length) return "";
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, partes.join("\n\u0000\n"), Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  SGO_VERSAO_TELAS_CACHE_ = hex.slice(0, 16);
  return SGO_VERSAO_TELAS_CACHE_;
}

/** Usado pela página (sem sessão: devolve só o resumo, nenhum dado). */
function SGO_versaoTelas() {
  try {
    var v = SGO_versaoTelasCalcular_();
    return v ? { ok: true, versao: v } : { ok: false };
  } catch (e) {
    return { ok: false };
  }
}
