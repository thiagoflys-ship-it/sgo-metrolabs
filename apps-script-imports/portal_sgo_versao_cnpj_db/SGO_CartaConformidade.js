/****************************************************
 * PILOTO — Proxy server-a-servidor para a Carta de
 * Conformidade Técnica standalone, sem depender de
 * iframe no navegador (bloqueado por cookies de
 * terceiros). O Portal chama o doPost do módulo via
 * UrlFetchApp (Google -> Google); o navegador só fala
 * com o Portal.
 ****************************************************/
const SGO_CARTA_CONFORMIDADE = (() => {

  function chamarProxy_(action, payload) {
    const url = SGO_CFG.MOTORES && SGO_CFG.MOTORES.RELATORIO_CONFORMIDADE;

    if (!url) {
      return { ok: false, mensagem: 'URL da Carta de Conformidade não configurada (SGO_CFG.MOTORES.RELATORIO_CONFORMIDADE).' };
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
      return { ok: false, mensagem: 'Erro ao chamar Carta de Conformidade: ' + (e && e.message ? e.message : String(e)) };
    }
  }

  function bootstrap() {
    return chamarProxy_('bootstrap', null);
  }

  function buscarCnpj(cnpj) {
    return chamarProxy_('buscarCnpj', cnpj);
  }

  function validarPayload(payload) {
    return chamarProxy_('validarPayload', payload);
  }

  function auditar(payload) {
    return chamarProxy_('auditar', payload);
  }

  function gerarDocumento(payload) {
    return chamarProxy_('gerarDocumento', payload);
  }

  function salvarRelatorio(payload) {
    return chamarProxy_('salvarRelatorio', payload);
  }

  function refinarIA(payload) {
    return chamarProxy_('refinarIA', payload);
  }

  function pesquisarDocumentos(filtro) {
    return chamarProxy_('pesquisarDocumentos', filtro);
  }

  return { bootstrap, buscarCnpj, validarPayload, auditar, gerarDocumento, salvarRelatorio, refinarIA, pesquisarDocumentos };
})();

/* =========================
   TRANCA DE ACESSO — módulo legado, uso administrativo apenas.
   Substituído pela Declaração de Execução de Serviço (ver
   SGO_DeclaracaoExec_*.js) — mantido só para consulta pontual de
   documentos antigos já emitidos, nunca para emissão de novos.
========================= */
function SGO_CartaConf_validarSenhaLegado_(senhaInformada) {
  const senhaConfigurada = String(PropertiesService.getScriptProperties().getProperty('CARTA_CONFORMIDADE_LEGADO_SENHA') || '').trim();
  const senhaEsperada = senhaConfigurada || 'METROLABS_LEGADO@2026';
  if (String(senhaInformada || '').trim() !== senhaEsperada) {
    throw new Error('Senha administrativa inválida para acessar o módulo legado.');
  }
  return true;
}

function tplCartaConfValidarSenhaLegado(senha) {
  try {
    SGO_CartaConf_validarSenhaLegado_(senha);
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e.message };
  }
}

/* =========================
   WRAPPERS PARA GOOGLE.SCRIPT.RUN COM BLINDAGEM JSON
========================= */
function tplCartaConfBootstrap(sessionId) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.bootstrap()));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfBuscarCnpj(sessionId, cnpj) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.buscarCnpj(cnpj)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfValidarPayload(sessionId, payload) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.validarPayload(payload)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfAuditar(payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.auditar(payload)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfGerarDocumento(sessionId, payload) {
  try {
    exigirSessao(String(sessionId || '')); // SEGURANCA: exige sessao valida do portal
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.gerarDocumento(payload)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfSalvarRelatorio(payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.salvarRelatorio(payload)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfRefinarIA(payload) {
  try {
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.refinarIA(payload)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}

function tplCartaConfPesquisarDocumentos(filtro) {
  try {
    return JSON.parse(JSON.stringify(SGO_CARTA_CONFORMIDADE.pesquisarDocumentos(filtro)));
  } catch (e) {
    return { ok: false, mensagem: 'Erro servidor: ' + e.message };
  }
}
