/****************************************************
 * PILOTO — Proxy server-a-servidor para o Template
 * Lavadora standalone (Lavadora Ultrassônica +
 * Termodesinfectora), sem depender de iframe no
 * navegador. O Portal chama o doPost do módulo via
 * UrlFetchApp (Google -> Google); o navegador só fala
 * com o Portal.
 ****************************************************/
const SGO_TEMPLATE_LAVADORA = (() => {

  function chamarProxy_(action, extra) {
    const url = SGO_CFG.MOTORES && SGO_CFG.MOTORES.LAVADORA_TEMPLATE;

    if (!url) {
      return { ok: false, erro: 'URL do Template Lavadora não configurada (SGO_CFG.MOTORES.LAVADORA_TEMPLATE).' };
    }

    try {
      const corpo = Object.assign({ action: action }, extra || {});
      const resposta = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(corpo),
        muteHttpExceptions: true
      });

      return JSON.parse(resposta.getContentText());
    } catch (e) {
      return { ok: false, erro: 'Erro ao chamar Template Lavadora: ' + (e && e.message ? e.message : String(e)) };
    }
  }

  function obterConfig() {
    return chamarProxy_('obterConfigPublica', null);
  }

  function obterPlaceholders(tipo) {
    return chamarProxy_('obterPlaceholdersTemplate', { tipo: tipo });
  }

  function gerarRelatorio(payload) {
    return chamarProxy_('gerarRelatorio', { payload: payload });
  }

  return { obterConfig, obterPlaceholders, gerarRelatorio };
})();

/* =========================
   WRAPPERS PARA GOOGLE.SCRIPT.RUN COM BLINDAGEM JSON
========================= */
function tplLavadoraObterConfig(sessionId) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_LAVADORA.obterConfig()));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('carregar a configuração do modelo', e) };
  }
}

function tplLavadoraObterPlaceholders(sessionId, tipo) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_LAVADORA.obterPlaceholders(tipo)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('carregar os campos do modelo', e) };
  }
}

function tplLavadoraGerarRelatorio(payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_LAVADORA.gerarRelatorio(payload)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('preencher o modelo', e) };
  }
}
