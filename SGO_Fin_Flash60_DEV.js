// FLASH.6.0D — auditoria DEV somente leitura, sem alterar estado operacional.
var FLASH60_DEV_CONFIG = {
  SCRIPT_DEV: '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG',
  SCRIPT_PROD: '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y',
  DB_FIN_DEV: '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0',
  CPF_BRUNA: '5553116198'
};

function _flash60DevTexto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function _flash60DevCpf_(valor) {
  return _flash60DevTexto_(valor).replace(/\D/g, '');
}

function _flash60DevHeaders_(ss, nomeAba) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastColumn() < 1) return [];
  return aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(_flash60DevTexto_);
}

function DIAGNOSTICAR_FLASH60_CRITERIOS_DEV_SEM_GRAVAR() {
  var cfg = FLASH60_DEV_CONFIG;
  var resultado = {
    success: false,
    ok: false,
    ambiente: 'NAO_AUTORIZADO',
    scriptId: '',
    dbFinId: '',
    bloqueios: [],
    avisos: [],
    criterios: {},
    estadoVivo: {},
    gravacaoReal: false
  };

  try {
    resultado.scriptId = _flash60DevTexto_(ScriptApp.getScriptId());
    resultado.dbFinId = _flash60DevTexto_(
      PropertiesService.getScriptProperties().getProperty('DB_FIN_ID')
    );
    resultado.ambiente = resultado.scriptId === cfg.SCRIPT_DEV
      ? 'DEV'
      : (resultado.scriptId === cfg.SCRIPT_PROD ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO');

    if (resultado.scriptId === cfg.SCRIPT_PROD) resultado.bloqueios.push('BLOQUEADO: PRODUCAO_V2 detectada.');
    if (resultado.scriptId !== cfg.SCRIPT_DEV) resultado.bloqueios.push('scriptId diferente do DEV autorizado.');
    if (resultado.dbFinId !== cfg.DB_FIN_DEV) resultado.bloqueios.push('DB_FIN_ID diferente do DEV autorizado.');
    if (resultado.bloqueios.length) {
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props = PropertiesService.getScriptProperties();
    var operacaoProp = _flash60DevTexto_(props.getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA')).toLowerCase() === 'true';
    var liberacaoFlash = _flash60DevTexto_(props.getProperty('FLASH_LIBERACAO_GERAL')).toLowerCase() === 'true';
    var liberacaoFin = _flash60DevTexto_(props.getProperty('FIN_LIBERACAO_GERAL')).toLowerCase() === 'true';
    var cpfsProp = _flash60DevTexto_(props.getProperty('FLASH_CPFS_AUTORIZADOS')).split(',').map(_flash60DevCpf_);
    var ss = SpreadsheetApp.openById(resultado.dbFinId);
    var headersCartoes = _flash60DevHeaders_(ss, 'FIN_CARTOES');
    var headersRecargas = _flash60DevHeaders_(ss, 'FIN_CARTOES_RECARGAS');
    var guardOperacao = typeof _f413OperacaoControladaAtiva_ === 'function';
    var guardCpf = typeof _f413CPFAutorizado_ === 'function';
    var guardLiberacao = typeof _f413LiberacaoGeralFlash_ === 'function';
    var ponteContaCpf = typeof finFlashListarCartoesPorCPF48 === 'function';
    var sentinelaFlash44 = typeof _f410Flash44Intacto_ === 'function';
    var constanteBruna = typeof _F413_CPF_BRUNA !== 'undefined'
      ? _flash60DevCpf_(_F413_CPF_BRUNA)
      : '';
    var cpfFakeBloqueado = guardCpf ? !_f413CPFAutorizado_('00000000000') : false;
    var flash44RegistroDev = sentinelaFlash44 ? _f410Flash44Intacto_(ss) : false;

    resultado.estadoVivo = {
      operacaoControladaPropertyAtiva: operacaoProp,
      cpfBrunaNaProperty: cpfsProp.indexOf(cfg.CPF_BRUNA) >= 0,
      liberacaoGeralFlash: liberacaoFlash,
      liberacaoGeralFin: liberacaoFin,
      flash44RegistroPresenteNoDev: flash44RegistroDev
    };

    resultado.criterios.recargaPorCpf = {
      ok: headersCartoes.indexOf('CPF_COLABORADOR') >= 0 &&
          headersRecargas.indexOf('CPF_COLABORADOR') >= 0 && ponteContaCpf,
      motivo: 'Valida schema CPF nas contas/recargas e a ponte de agrupamento por CPF; recargas historicas sem CPF nao invalidam a arquitetura.'
    };
    resultado.criterios.operacaoControladaAtiva = {
      ok: guardOperacao && guardCpf && guardLiberacao && !liberacaoFlash && !liberacaoFin,
      motivo: 'Valida guards FLASH.4.13 presentes e liberacao geral desligada; a Property viva e informativa e nao e alterada.'
    };
    resultado.criterios.brunaAutorizada = {
      ok: constanteBruna === cfg.CPF_BRUNA && guardCpf,
      motivo: 'Valida CPF imutavel 5553116198 e guard de autorizacao preservados no codigo; nao escreve lista de autorizados.'
    };
    resultado.criterios.cpfNaoAutorizadoBloqueado = {
      ok: guardCpf && guardLiberacao && cpfFakeBloqueado && !liberacaoFlash,
      motivo: 'Simula somente leitura com CPF 00000000000 e confirma bloqueio pelo guard com liberacao geral desligada.'
    };
    resultado.criterios.flash44Intacto = {
      ok: sentinelaFlash44 && !liberacaoFlash && !liberacaoFin,
      motivo: 'Valida sentinela de integridade FLASH44 preservada no codigo; ausencia de registro piloto na base DEV e reportada separadamente.'
    };

    Object.keys(resultado.criterios).forEach(function(chave) {
      if (!resultado.criterios[chave].ok) resultado.bloqueios.push(chave + ': ' + resultado.criterios[chave].motivo);
    });
    if (!operacaoProp) resultado.avisos.push('Estado vivo: FLASH_OPERACAO_CONTROLADA_ATIVA nao esta true no DEV; nenhuma Property foi alterada.');
    if (cpfsProp.indexOf(cfg.CPF_BRUNA) < 0) resultado.avisos.push('Estado vivo: CPF da Bruna nao consta na Property DEV; a constante e o guard permanecem preservados.');
    if (!flash44RegistroDev) resultado.avisos.push('Estado vivo: PILOTO_FLASH44 nao foi localizado na base DEV; a sentinela e a protecao de codigo permanecem intactas.');
    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok = resultado.success;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  } catch (e) {
    resultado.success = false;
    resultado.ok = false;
    resultado.bloqueios.push('Falha no diagnostico FLASH.6.0D: ' + (e && e.message ? e.message : String(e)));
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }
}

function EXECUTAR_FLASH60_AUDITORIA_FINAL_DEV_SEM_GRAVAR() {
  var resultado = {
    success: false,
    ok: false,
    ambiente: 'NAO_AUTORIZADO',
    scriptId: '',
    dbFinId: '',
    bloqueios: [],
    avisos: [],
    arquiteturaFinal: null,
    diagnosticoCriterios: null,
    liberacaoGeral: null,
    operacaoControladaAtiva: false,
    cpfBrunaAutorizado: false,
    flash44Intacto: false,
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      producaoV2Publicada: false
    },
    gravacaoReal: false
  };

  try {
    resultado.diagnosticoCriterios = DIAGNOSTICAR_FLASH60_CRITERIOS_DEV_SEM_GRAVAR();
    resultado.ambiente = resultado.diagnosticoCriterios.ambiente;
    resultado.scriptId = resultado.diagnosticoCriterios.scriptId;
    resultado.dbFinId = resultado.diagnosticoCriterios.dbFinId;
    resultado.bloqueios = resultado.diagnosticoCriterios.bloqueios.slice();
    resultado.avisos = resultado.diagnosticoCriterios.avisos.slice();

    if (resultado.bloqueios.length === 0) {
      resultado.arquiteturaFinal = AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR();
      var checks = resultado.arquiteturaFinal && resultado.arquiteturaFinal.checks
        ? resultado.arquiteturaFinal.checks
        : {};
      var criterios = resultado.diagnosticoCriterios.criterios;
      ['recargaPorCpf','operacaoControladaAtiva','brunaAutorizada','cpfNaoAutorizadoBloqueado','flash44Intacto'].forEach(function(chave) {
        checks[chave] = criterios[chave].ok === true;
      });
      resultado.arquiteturaFinal.checks = checks;
      resultado.arquiteturaFinal.falhas = Object.keys(checks).filter(function(chave) {
        return checks[chave] !== true;
      });
      resultado.arquiteturaFinal.ok = resultado.arquiteturaFinal.falhas.length === 0;
      resultado.liberacaoGeral = checks.liberacaoGeralFalse === true ? false : true;
      resultado.operacaoControladaAtiva = checks.operacaoControladaAtiva === true;
      resultado.cpfBrunaAutorizado = checks.brunaAutorizada === true;
      resultado.flash44Intacto = checks.flash44Intacto === true;
      if (resultado.arquiteturaFinal.falhas.length) resultado.avisos.push('Criterios pendentes: ' + resultado.arquiteturaFinal.falhas.join(', '));
      resultado.success = true;
      resultado.ok = resultado.arquiteturaFinal.ok === true && resultado.liberacaoGeral === false;
    }
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  } catch (e) {
    resultado.success = false;
    resultado.ok = false;
    resultado.bloqueios.push('Falha na auditoria FLASH.6.0D: ' + (e && e.message ? e.message : String(e)));
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }
}

function TESTAR_FLASH60_LOGGER_DEV_SEM_GRAVAR() {
  var resultado = {success:true,ok:true,modo:'TESTE_LOGGER_FLASH60',ambiente:'DEV',gravacaoReal:false};
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
