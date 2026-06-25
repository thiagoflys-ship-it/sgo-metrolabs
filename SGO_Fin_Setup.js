// ============================================================
// FLASH — CONSTANTES DE AMBIENTE (não alterar) — v37
// ============================================================

var _F410_PRODUCAO_V2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
var _F410_DEV_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
var _F410_EXPECTED_DB    = '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0';

var _F413_CPF_BRUNA      = '5553116198';
var _F413_CPF_FAKE_TESTE = '99999999999';

// ============================================================
// GUARD — Valida que o script rodando É PRODUCAO_V2 e
// que DB_FIN_ID está apontando para a planilha esperada.
// Retorna { ok, ss, bloqueio, scriptId, dbFinId }
// ============================================================
function _f410ValidarAmbientePV2_() {
  var scriptId = ScriptApp.getScriptId();
  if (scriptId === _F410_DEV_ID) {
    return { ok: false, bloqueio: 'BLOQUEADO: script e DEV. FLASH.4.10 exclusivo da PRODUCAO_V2.', scriptId: scriptId };
  }
  if (scriptId !== _F410_PRODUCAO_V2_ID) {
    return { ok: false, bloqueio: 'BLOQUEADO: scriptId desconhecido. Esperado PRODUCAO_V2.', scriptId: scriptId };
  }
  var props   = PropertiesService.getScriptProperties();
  var dbFinId = String(props.getProperty('DB_FIN_ID') || '').trim();
  if (!dbFinId) {
    return { ok: false, bloqueio: 'DB_FIN_ID nao configurado.', scriptId: scriptId };
  }
  if (dbFinId !== _F410_EXPECTED_DB) {
    return { ok: false, bloqueio: 'DB_FIN_ID inesperado: ' + dbFinId, scriptId: scriptId };
  }
  var ss = null;
  try { ss = SpreadsheetApp.openById(dbFinId); } catch(e) {
    return { ok: false, bloqueio: 'Sem acesso ao DB_FIN_ID: ' + e.message, scriptId: scriptId, dbFinId: dbFinId };
  }
  return { ok: true, scriptId: scriptId, dbFinId: dbFinId, ss: ss };
}

// ============================================================
// GUARDS FLASH.4.13 — leitura de ScriptProperties (sem escrita)
// ============================================================

function _f413OperacaoControladaAtiva_() {
  return String(PropertiesService.getScriptProperties()
    .getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA') || 'false')
    .trim().toLowerCase() === 'true';
}

function _f413CPFAutorizado_(cpf) {
  var lista = String(PropertiesService.getScriptProperties()
    .getProperty('FLASH_CPFS_AUTORIZADOS') || '')
    .split(',').map(function(c) { return c.trim().replace(/\D/g, ''); });
  return lista.indexOf(String(cpf || '').replace(/\D/g, '')) >= 0;
}

function _f413LiberacaoGeralFlash_() {
  return String(PropertiesService.getScriptProperties()
    .getProperty('FLASH_LIBERACAO_GERAL') || 'false')
    .trim().toLowerCase() === 'true';
}

// ============================================================
// HELPERS FLASH.6.8 — privados, não chamados diretamente pela UI
// ============================================================

function _f68ChaveIdempotencia_(cartaoId, valor) {
  var d  = new Date();
  var ds = d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2);
  var v  = (Math.round((valor || 0) * 100) / 100).toFixed(2);
  return 'RECARGA_BRUNA_' + _F413_CPF_BRUNA + '_' + String(cartaoId).trim() + '_' + v + '_' + ds;
}

function _f68ChaveExiste_(ss, chave) {
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh || sh.getLastRow() < 2) return { existe: false, quantidade: 0 };
  var dados  = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h      = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iObs   = h.indexOf('OBSERVACOES');
  var iChv   = h.indexOf('CHAVE_IDEMPOTENCIA');
  var marker = 'CHAVE_IDEM=' + chave;
  var count  = 0;
  for (var i = 1; i < dados.length; i++) {
    var obs = String(iObs >= 0 ? dados[i][iObs] : '');
    var chv = String(iChv >= 0 ? dados[i][iChv] : '');
    if (obs.indexOf(marker) >= 0 || chv === chave) count++;
  }
  return { existe: count > 0, quantidade: count };
}

function _f68BuscarCartaoAtivo_(ss, cpf, cartaoId) {
  var sh = ss.getSheetByName('FIN_CARTOES');
  if (!sh || sh.getLastRow() < 2) return { encontrado: false };
  var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h     = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iCpf  = h.indexOf('CPF_COLABORADOR');
  var iCid  = h.indexOf('CARTAO_ID');
  var iSt   = h.indexOf('STATUS_CARTAO');
  var iNome = h.indexOf('FUNCIONARIO_NOME');
  var iFid  = h.indexOf('FUNCIONARIO_ID');
  if (iCpf < 0) return { encontrado: false };
  for (var i = 1; i < dados.length; i++) {
    var rowCpf = String(dados[i][iCpf] || '').replace(/\D/g, '');
    if (rowCpf !== cpf) continue;
    var cid = String(iCid >= 0 ? dados[i][iCid] : '').trim();
    var st  = String(iSt  >= 0 ? dados[i][iSt]  : '').trim().toUpperCase();
    if (st === 'INATIVO' || st === 'CANCELADO') continue;
    if (cartaoId && cid !== cartaoId) continue;
    return {
      encontrado:      true,
      cpf:             rowCpf,
      cartaoId:        cid,
      status:          st,
      nomeFuncionario: String(iNome >= 0 ? dados[i][iNome] : '').trim(),
      funcionarioId:   String(iFid  >= 0 ? dados[i][iFid]  : '').trim()
    };
  }
  return { encontrado: false };
}

function _f68ValidarPayload_(payload, ss, cpfPiloto) {
  var bloqueios = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, bloqueios: ['Payload ausente ou invalido.'], normalizado: null };
  }
  var cpf        = String(payload.cpf || '').replace(/\D/g, '');
  var cartaoId   = String(payload.cartaoId || '').trim();
  var valor      = Number(payload.valor);
  var finalidade = String(payload.finalidade || '').trim();
  var confirmar  = payload.confirmarFinanceiro === true;

  if (cpf !== cpfPiloto)            bloqueios.push('CPF invalido: esperado ' + cpfPiloto + ', recebido ' + cpf + '.');
  if (!confirmar)                   bloqueios.push('confirmarFinanceiro deve ser true explicitamente.');
  if (isNaN(valor) || valor <= 0)   bloqueios.push('Valor invalido: deve ser numero positivo. Recebido: ' + payload.valor);
  if (!finalidade)                  bloqueios.push('finalidade nao pode estar vazia.');
  if (!cartaoId)                    bloqueios.push('cartaoId nao pode estar vazio.');

  var cartao = null;
  if (bloqueios.length === 0) {
    var liberacaoGeral = PropertiesService.getScriptProperties().getProperty('FLASH_LIBERACAO_GERAL') === 'true' ||
                         PropertiesService.getScriptProperties().getProperty('FIN_LIBERACAO_GERAL')   === 'true';
    var operacaoAtiva  = PropertiesService.getScriptProperties().getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA') === 'true';
    if (liberacaoGeral)                        bloqueios.push('REGRESSAO: liberacao geral esta true — execucao bloqueada.');
    if (!operacaoAtiva)                        bloqueios.push('FLASH_OPERACAO_CONTROLADA_ATIVA esta false — operacao bloqueada.');
    if (!_f413CPFAutorizado_(cpfPiloto))       bloqueios.push('CPF ' + cpfPiloto + ' nao autorizado no guard FLASH.4.13.');
    if (_f413CPFAutorizado_('00000000000'))    bloqueios.push('Guard de CPF nao autorizado com falha — execucao bloqueada.');
    cartao = _f68BuscarCartaoAtivo_(ss, cpfPiloto, cartaoId);
    if (!cartao.encontrado) bloqueios.push('Cartao ' + cartaoId + ' nao encontrado em FIN_CARTOES para CPF ' + cpfPiloto + ' com status ativo.');
  }

  var normalizado = bloqueios.length === 0 ? {
    cpf:             cpf,
    cartaoId:        cartaoId,
    valor:           valor,
    finalidade:      finalidade,
    observacao:      String(payload.observacao || '').trim(),
    nomeFuncionario: (cartao && cartao.nomeFuncionario) || '',
    funcionarioId:   (cartao && cartao.funcionarioId)   || ''
  } : null;

  return { ok: bloqueios.length === 0, bloqueios: bloqueios, normalizado: normalizado };
}

// ============================================================
// FLASH.6.8 — FUNÇÕES PÚBLICAS (chamadas via google.script.run)
// ============================================================

function PREVER_RECARGA_FLASH_CONTROLADA_FINANCEIRO_SEM_GRAVAR(payload) {
  var resultado  = {
    success: false, ok: false, fase: 'FLASH.6.8.PREVIA',
    ambiente: null, podeExecutar: false,
    payloadNormalizado: null, chaveIdempotencia: null,
    gravacaoReal: false, bloqueios: [], avisos: []
  };
  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var v = _f68ValidarPayload_(payload, amb.ss, _F413_CPF_BRUNA);
    resultado.bloqueios = v.bloqueios;
    if (!v.ok) {
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var chave = _f68ChaveIdempotencia_(v.normalizado.cartaoId, v.normalizado.valor);
    resultado.chaveIdempotencia   = chave;
    resultado.payloadNormalizado  = v.normalizado;
    var chaveInfo = _f68ChaveExiste_(amb.ss, chave);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('DUPLICIDADE BLOQUEADA: chave ' + chave + ' ja existe (' + chaveInfo.quantidade + 'x). Nenhuma recarga seria criada.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.success      = true;
    resultado.ok           = true;
    resultado.podeExecutar = true;
    resultado.avisos.push('Dry-run OK. Nenhuma gravacao executada. Chave: ' + chave);
  } catch (e) {
    resultado.bloqueios.push('Erro FLASH.6.8.PREVIA: ' + (e.message || String(e)));
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO(payload) {
  payload = payload || {};
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", payload, {
    ambienteControlado: payload && payload.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("EXECUTAR_RECARGA_FLASH_CONTROLADA_FINANCEIRO", envelope73);
  var resultado  = {
    success: false, ok: false, fase: 'FLASH.6.8.EXECUCAO',
    ambiente: null, recargaCriada: false,
    recargaId: null, chaveIdempotencia: null,
    cpf: _F413_CPF_BRUNA, cartaoId: null, valor: null,
    gravacaoReal: false,
    lancamentoCriado: false, emailOuWhatsappEnviado: false,
    liberacaoGeralFlash: false, bloqueios: [], avisos: []
  };
  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var v = _f68ValidarPayload_(payload, amb.ss, _F413_CPF_BRUNA);
    resultado.bloqueios = v.bloqueios;
    if (!v.ok) {
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var n     = v.normalizado;
    var chave = _f68ChaveIdempotencia_(n.cartaoId, n.valor);
    resultado.chaveIdempotencia = chave;
    resultado.cartaoId          = n.cartaoId;
    resultado.valor             = n.valor;
    var chaveInfo = _f68ChaveExiste_(amb.ss, chave);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('DUPLICIDADE BLOQUEADA: chave ' + chave + ' ja existe (' + chaveInfo.quantidade + 'x). Nenhuma recarga criada.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var shRec = amb.ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!shRec) {
      resultado.bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var lastCol = shRec.getLastColumn();
    var hdrs    = lastCol >= 1
      ? shRec.getRange(1, 1, 1, lastCol).getValues()[0].map(function(x) { return String(x || '').trim(); })
      : [];
    if (hdrs.map(function(h) { return h.toUpperCase(); }).indexOf('CPF_COLABORADOR') < 0) {
      resultado.bloqueios.push('CPF_COLABORADOR ausente do schema de RECARGAS. Execute PREPARAR_FLASH49.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var agora    = new Date().toISOString();
    var dataHoje = agora.slice(0, 10);
    var recargaId = 'REC_F68_' + new Date().getTime();
    var marker    = 'CHAVE_IDEM=' + chave;
    var reg = {
      ID                        : Utilities.getUuid(),
      RECARGA_ID                : recargaId,
      CARTAO_ID                 : n.cartaoId,
      CPF_COLABORADOR           : n.cpf,
      FUNCIONARIO_ID            : n.funcionarioId,
      FUNCIONARIO_NOME          : n.nomeFuncionario,
      VALOR                     : n.valor,
      DATA_RECARGA              : dataHoje,
      PERIODO_REFERENCIA        : '',
      FORMA_RECARGA             : 'FINANCEIRO_CONTROLADO_FLASH68',
      FINALIDADE                : n.finalidade,
      NUMERO_TRANSFERENCIA      : '',
      BANCO_ORIGEM              : '',
      COMPROVANTE_FILE_ID       : '',
      COMPROVANTE_LINK          : '',
      RESPONSAVEL_FINANCEIRO_ID : 'FINANCEIRO_FLASH68',
      RESPONSAVEL_NOME          : 'Financeiro - FLASH.6.8 Piloto Controlado',
      AUTORIZADO_POR_ID         : 'FINANCEIRO_FLASH68',
      AUTORIZADO_POR_NOME       : 'Financeiro - FLASH.6.8 Piloto Controlado',
      CHAVE_IDEMPOTENCIA        : chave,
      OBSERVACOES               : '[FLASH68] ' + marker + ' | ' + n.finalidade + (n.observacao ? ' | ' + n.observacao : ''),
      STATUS                    : 'APROVADO',
      CRIADO_EM                 : agora,
      CRIADO_POR                : 'FLASH68_FINANCEIRO_CONTROLADO',
      ATUALIZADO_EM             : agora,
      ATUALIZADO_POR            : 'FLASH68_FINANCEIRO_CONTROLADO'
    };
    var row = hdrs.map(function(h) {
      var k = h.toUpperCase().replace(/\s/g, '_');
      if (reg.hasOwnProperty(h)) return reg[h];
      if (reg.hasOwnProperty(k)) return reg[k];
      return '';
    });
    shRec.appendRow(row);
    resultado.recargaCriada = true;
    resultado.recargaId     = recargaId;
    resultado.gravacaoReal  = true;
    resultado.success       = true;
    resultado.ok            = true;
    resultado.avisos.push('Recarga APROVADO criada. RecargaId: ' + recargaId + '. Chave: ' + chave + '.');
  } catch (e) {
    resultado.bloqueios.push('Erro FLASH.6.8.EXECUCAO: ' + (e.message || String(e)));
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FLASH68_POS_RECARGA_CONTROLADA_SEM_GRAVAR(chaveIdempotencia) {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.8.AUDITORIA',
    ambiente: null, recargaEncontrada: false,
    cpf: null, cartaoId: null, valor: null,
    status: null, chaveIdempotencia: chaveIdempotencia || null,
    recargaId: null, criadoEm: null,
    lancamentoAutomaticoCriado: false,
    emailOuWhatsappEnviado: false,
    liberacaoGeralFlash: false,
    gravacaoReal: false, bloqueios: [], avisos: []
  };
  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (!chaveIdempotencia) {
      resultado.bloqueios.push('chaveIdempotencia obrigatoria.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.liberacaoGeralFlash = PropertiesService.getScriptProperties().getProperty('FLASH_LIBERACAO_GERAL') === 'true';
    var sh = amb.ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!sh || sh.getLastRow() < 2) {
      resultado.bloqueios.push('FIN_CARTOES_RECARGAS vazia ou ausente.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dados  = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var h      = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
    var iObs   = h.indexOf('OBSERVACOES');
    var iChv   = h.indexOf('CHAVE_IDEMPOTENCIA');
    var iCpf   = h.indexOf('CPF_COLABORADOR');
    var iCid   = h.indexOf('CARTAO_ID');
    var iVal   = h.indexOf('VALOR');
    var iSt    = h.indexOf('STATUS');
    var iRid   = h.indexOf('RECARGA_ID');
    var iCri   = h.indexOf('CRIADO_EM');
    var marker = 'CHAVE_IDEM=' + chaveIdempotencia;
    for (var i = 1; i < dados.length; i++) {
      var obs = String(iObs >= 0 ? dados[i][iObs] : '');
      var chv = String(iChv >= 0 ? dados[i][iChv] : '');
      if (obs.indexOf(marker) < 0 && chv !== chaveIdempotencia) continue;
      resultado.recargaEncontrada = true;
      resultado.cpf       = String(iCpf >= 0 ? dados[i][iCpf] : '');
      resultado.cartaoId  = String(iCid >= 0 ? dados[i][iCid] : '');
      resultado.valor     = Number(iVal >= 0 ? dados[i][iVal] : 0);
      resultado.status    = String(iSt  >= 0 ? dados[i][iSt]  : '');
      resultado.recargaId = String(iRid >= 0 ? dados[i][iRid] : '');
      resultado.criadoEm  = String(iCri >= 0 ? dados[i][iCri] : '');
      break;
    }
    if (!resultado.recargaEncontrada) {
      resultado.bloqueios.push('Recarga com chave ' + chaveIdempotencia + ' nao encontrada em FIN_CARTOES_RECARGAS.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: liberacaoGeralFlash esta true.');
    }
    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && resultado.recargaEncontrada;
    if (resultado.ok) {
      resultado.avisos.push('Recarga confirmada. Status: ' + resultado.status + '. Nenhum lancamento automatico criado.');
    }
  } catch (e) {
    resultado.bloqueios.push('Erro FLASH.6.8.AUDITORIA: ' + (e.message || String(e)));
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.6.9 — Preview de Relatorios e Cobrancas (somente leitura)
// ============================================================
function FIN_FLASH_RELATORIOS_COBRANCAS_PREVIEW_SEM_GRAVAR(payload) {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.9.PREVIEW',
    ambiente: 'PRODUCAO_V2', tipo: null, cpf: null, periodo: null,
    htmlPreview: null,
    envioReal: false, gravacaoReal: false,
    bloqueios: [], avisos: []
  };
  try {
    if (!payload || typeof payload !== 'object') {
      resultado.bloqueios.push('Payload ausente ou invalido.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var tipo = String(payload.tipo || '').trim().toUpperCase();
    var cpf  = String(payload.cpf  || '').replace(/\D/g, '');
    resultado.tipo    = tipo;
    resultado.cpf     = cpf;
    resultado.periodo = (payload.periodoInicio || '') + (payload.periodoFim ? '/' + payload.periodoFim : '');
    if (!tipo) { resultado.bloqueios.push('tipo obrigatorio: RELATORIO, NOTIFICACAO ou ADVERTENCIA.'); }
    if (!cpf)  { resultado.bloqueios.push('cpf obrigatorio.'); }
    if (resultado.bloqueios.length > 0) {
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var periodo = String(payload.periodoInicio || '').slice(0, 7);
    var html = null;
    if      (tipo === 'RELATORIO')   { html = GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR(cpf, periodo); }
    else if (tipo === 'NOTIFICACAO') { html = GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR(cpf); }
    else if (tipo === 'ADVERTENCIA') { html = GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR(cpf); }
    else {
      resultado.bloqueios.push('tipo invalido: ' + tipo + '. Use RELATORIO, NOTIFICACAO ou ADVERTENCIA.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (typeof html !== 'string' || html.length < 10) {
      resultado.bloqueios.push('Funcao HTML retornou conteudo vazio. CPF pode nao estar cadastrado ou sem dados no periodo.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.htmlPreview = html;
    resultado.success     = true;
    resultado.ok          = true;
    resultado.avisos.push('Preview ' + tipo + ' gerado para CPF ' + cpf + '. Nenhum envio ou gravacao executado.');
  } catch (e) {
    resultado.bloqueios.push('Erro FLASH.6.9.PREVIEW: ' + (e.message || String(e)));
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}