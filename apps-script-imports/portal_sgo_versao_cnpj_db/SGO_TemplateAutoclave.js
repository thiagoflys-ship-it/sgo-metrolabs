/****************************************************
 * PILOTO — Proxy server-a-servidor para o Template
 * Autoclave standalone, sem depender de iframe no
 * navegador (bloqueado por cookies de terceiros).
 * O Portal chama o doPost do módulo via UrlFetchApp
 * (Google -> Google); o navegador só fala com o Portal.
 ****************************************************/
const SGO_TEMPLATE_AUTOCLAVE = (() => {

  function chamarProxy_(action, payload) {
    const url = SGO_CFG.MOTORES && SGO_CFG.MOTORES.AUTOCLAVE_TEMPLATE;

    if (!url) {
      return { ok: false, erro: 'URL do Template Autoclave não configurada (SGO_CFG.MOTORES.AUTOCLAVE_TEMPLATE).' };
    }

    try {
      const resposta = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ action: action, payload: payload || null }),
        muteHttpExceptions: true
      });

      return JSON.parse(resposta.getContentText());
    } catch (e) {
      return { ok: false, erro: 'Erro ao chamar Template Autoclave: ' + (e && e.message ? e.message : String(e)) };
    }
  }

  function obterConfig() {
    return chamarProxy_('obterConfigPublica', null);
  }

  function obterPlaceholders() {
    return chamarProxy_('obterPlaceholdersTemplate', null);
  }

  function gerarRelatorio(payload) {
    return chamarProxy_('gerarRelatorio', payload);
  }

  return { obterConfig, obterPlaceholders, gerarRelatorio };
})();

/* =========================
   WRAPPERS PARA GOOGLE.SCRIPT.RUN COM BLINDAGEM JSON
========================= */
function tplAutoclaveObterConfig(sessionId) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_AUTOCLAVE.obterConfig()));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('carregar a configuração do modelo', e) };
  }
}

function tplAutoclaveObterPlaceholders(sessionId) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_AUTOCLAVE.obterPlaceholders()));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('carregar os campos do modelo', e) };
  }
}

function tplAutoclaveGerarRelatorio(payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_TEMPLATE_AUTOCLAVE.gerarRelatorio(payload)));
  } catch (e) {
    return { ok: false, erro: SGO_textoFalhaOperador_('preencher o modelo', e) };
  }
}
