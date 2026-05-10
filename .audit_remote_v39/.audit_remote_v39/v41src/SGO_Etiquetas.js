const SGO_ETIQUETAS = (() => {
  const DB = "ESTOQUE";
  const SHEET = SGO_CFG.SHEETS.SYS_ETIQUETAS;
  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=";

  function gerarToken(tipoEntidade, referenciaId) {
    const tipo = SGO_UTILS.safeUpper(tipoEntidade);
    const ref = SGO_UTILS.safe(referenciaId);
    if (!tipo || !ref) throw new Error("Informe tipo e referencia para gerar etiqueta.");

    const token = tipo + "-" + ref.replace(/[^\w]/g, "").substring(0, 18) + "-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const codigoLeitura = token;
    const urlValidacao = montarUrlLeitura_(token);
    const qrUrl = QR_API + encodeURIComponent(urlValidacao);

    SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase({
      TIPO_ENTIDADE: tipo,
      REFERENCIA_ID: ref,
      TOKEN: token,
      CODIGO_LEITURA: codigoLeitura,
      QRCODE_LINK: qrUrl,
      STATUS: "ATIVO"
    }), DB);

    return {
      token: token,
      codigoLeitura: codigoLeitura,
      qrcodeLink: qrUrl,
      urlLeitura: urlValidacao
    };
  }

  function obterPorToken(token) {
    const item = SGO_DATA.getByField(SHEET, "TOKEN", SGO_UTILS.safeUpper(token), DB);
    return item || null;
  }

  function registrarImpressao(sessionId, token) {
    const sessao = exigirSessao(sessionId);
    const etiqueta = obterPorToken(token);
    if (!etiqueta) return { success: false, message: "Etiqueta nao encontrada." };
    SGO_DATA.update(SHEET, etiqueta.ID, {
      IMPRESSO_POR: sessao.userId || sessao.usuario,
      IMPRESSO_EM: SGO_UTILS.nowIso()
    }, DB);
    return { success: true };
  }

  function montarUrlLeitura_(token) {
    let base = "";
    try {
      base = PropertiesService.getScriptProperties().getProperty("SGO_WEBAPP_URL") || ScriptApp.getService().getUrl();
    } catch (e) {}
    if (!base) base = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "qr=" + encodeURIComponent(SGO_UTILS.safeUpper(token));
  }

  return {
    gerarToken: gerarToken,
    obterPorToken: obterPorToken,
    registrarImpressao: registrarImpressao
  };
})();

function etiquetasRegistrarImpressao(sessionId, token) {
  try {
    return JSON.parse(JSON.stringify(SGO_ETIQUETAS.registrarImpressao(sessionId, token)));
  } catch (e) {
    return { success: false, message: "Erro ao registrar impressao: " + e.message };
  }
}
