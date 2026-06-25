// SGO_Fin_Extratos.js - METROLABS SGO+
// Modulo FIN - Preview de extratos Flash.
// FIN.11.2 - parser/preview sem gravacao. Nao executa nada automaticamente.

var FIN_EXTRATO_FLASH_MODO_PREVIEW_V1 = "PREVIEW_EXTRATO_FLASH_XLSX_V1";
var FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1 = "DRY_RUN_LOTE_EXTRATO_FLASH_V1";
var FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1 = "PRE_CONFIRMACAO_LOTE_EXTRATO_FLASH_V1";
var FIN_EXTRATO_FLASH_MODO_CONFIRMACAO_BLOQUEADA_V1 = "CONFIRMACAO_LOTE_EXTRATO_FLASH_BLOQUEADA_V1";
var FIN_EXTRATO_FLASH_ABA_LOTES_V1 = "FIN_LOTES_EXTRATO_FLASH";
var FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1 = "FIN_CARTOES_EXTRATOS";
var FIN_EXTRATO_FLASH_DB_PROP_V1 = "DB_FIN_ID";

function finPreviewExtratoFlashXlsxV1(payload) {
  var avisos = [];
  var bloqueios = [];

  try {
    var entrada = finExtratoFlashObterTabelaEntrada_(payload || {}, avisos, bloqueios);

    if (bloqueios.length) {
      return finExtratoFlashRetorno_(false, null, [], avisos, bloqueios);
    }

    var cabecalhos = entrada.cabecalhos || [];
    var validacao = finExtratoFlashValidarCabecalhos_(cabecalhos);
    if (!validacao.ok) {
      bloqueios.push(validacao.mensagem);
      return finExtratoFlashRetorno_(false, null, [], avisos, bloqueios);
    }

    var linhas = entrada.linhas || [];
    var lancamentos = [];

    for (var i = 0; i < linhas.length; i++) {
      if (finExtratoFlashLinhaVazia_(linhas[i])) continue;
      lancamentos.push(finExtratoFlashNormalizarLinha_(linhas[i], i + 2));
    }

    if (!lancamentos.length) {
      bloqueios.push("Nenhum lancamento foi encontrado para preview no XLSX informado.");
      return finExtratoFlashRetorno_(false, null, [], avisos, bloqueios);
    }

    // CPF Resolver — enriquece cada lançamento com o CPF da Conta Master
    try {
      var ssEnriq = finExtratoFlashAbrirDbFinReadOnly_();
      var shCartoes = ssEnriq.getSheetByName("FIN_CARTOES");
      if (shCartoes && shCartoes.getLastRow() > 1) {
        var dadosCartoes = shCartoes.getDataRange().getValues();
        var hdrsCartoes = dadosCartoes[0];
        var cartoesBase = dadosCartoes.slice(1).map(function(row) {
          var obj = {};
          hdrsCartoes.forEach(function(h, idx) { obj[String(h)] = row[idx]; });
          return obj;
        });
        lancamentos = finExtratoFlashEnriquecerComCPF_(lancamentos, cartoesBase);
      }
    } catch (erroEnriq) {
      avisos.push("CPF Resolver indisponivel (modo offline ou DB ausente): " + (erroEnriq.message || String(erroEnriq)));
    }

    var resumo = finExtratoFlashResumo_(lancamentos);
    return finExtratoFlashRetorno_(true, resumo, lancamentos, avisos, bloqueios);
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
    return finExtratoFlashRetorno_(false, null, [], avisos, bloqueios);
  }
}

function testarPreviewExtratoFlashV1_SEM_GRAVAR() {
  return finPreviewExtratoFlashXlsxV1({
    cabecalhos: [
      "Data",
      "Movimentação",
      "Valor",
      "Pessoa",
      "Pagamento",
      "Prestação de contas"
    ],
    linhas: [
      [
        "09/06/2026 07:08",
        "PADARIA DO CAMPAO RIO DE JANEIR BRA Alimentação",
        "- R$ 5,04",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "03/06/2026 15:39",
        "VICTORIA PARK RIO DE JANEIR BRA Estacionamento",
        "- R$ 19,00",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "27/05/2026 17:17",
        "Depósito",
        "+ R$ 1.000,00",
        "RAFAEL FAY MARQUES",
        "Carteira corporativa - Agendado por WANESSA LOPES DUARTE PEREIRA",
        "-"
      ],
      [
        "22/05/2026 09:27",
        "SUMUP*Chaveiro do R Rio de Janeir BRA Conveniência",
        "- R$ 44,00",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "13/05/2026 08:52",
        "POSTO DE SERVICO KIM L RIO DE JANEIR BRA Combustível",
        "- R$ 269,78",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ]
    ]
  });
}

function testarDryRunLoteExtratoFlashV1_SEM_GRAVAR() {
  var resultado = finDryRunLoteExtratoFlashV1({
    origem: "FLASH",
    arquivoNome: "extrato-flash-amostra-inline.xlsx",
    usuario: "TESTE_MANUAL_SEM_GRAVAR",
    cabecalhos: [
      "Data",
      "Movimentação",
      "Valor",
      "Pessoa",
      "Pagamento",
      "Prestação de contas"
    ],
    linhas: [
      [
        "09/06/2026 07:08",
        "PADARIA DO CAMPAO RIO DE JANEIR BRA Alimentação",
        "- R$ 5,04",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "03/06/2026 15:39",
        "VICTORIA PARK RIO DE JANEIR BRA Estacionamento",
        "- R$ 19,00",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "29/05/2026 17:34",
        "CENTRO AUTOMOTIVO NITEROI BRA Combustível",
        "- R$ 333,51",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ],
      [
        "27/05/2026 17:17",
        "Depósito",
        "+ R$ 1.000,00",
        "RAFAEL FAY MARQUES",
        "Carteira corporativa - Agendado por WANESSA LOPES DUARTE PEREIRA",
        "-"
      ],
      [
        "22/05/2026 09:27",
        "SUMUP*Chaveiro do R Rio de Janeir BRA Conveniência",
        "- R$ 44,00",
        "RAFAEL FAY MARQUES",
        "Cartão físico - Conta final 908",
        "Pendente"
      ]
    ]
  });

  if (resultado && (resultado.executado !== false || resultado.modo !== FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1)) {
    resultado.success = false;
    resultado.ok = false;
    resultado.bloqueios = resultado.bloqueios || [];
    resultado.bloqueios.push("Retorno inesperado no teste manual de dry-run sem gravacao.");
  }

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado, null, 2));
  }

  return resultado;
}

function auditarDryRunLoteExtratoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var leitura = finExtratoFlashLerDadosDuplicidadeReais_(bloqueios);
  var resultado = {
    success: leitura.ok && bloqueios.length === 0,
    ok: leitura.ok && bloqueios.length === 0,
    executado: false,
    modo: "AUDITORIA_DRY_RUN_LOTE_EXTRATO_FLASH_V1",
    abasConsultadas: leitura.abas || {},
    totalLotesLidos: leitura.lotes ? leitura.lotes.length : 0,
    totalExtratosLidos: leitura.extratos ? leitura.extratos.length : 0,
    headers: leitura.headers || {},
    avisos: leitura.ok ? ["Auditoria somente leitura. Nenhuma gravacao foi realizada."] : [],
    bloqueios: bloqueios
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado, null, 2));
  }

  return resultado;
}

function auditarContagemExtratoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var totalLotes = 0;
  var totalExtratos = 0;

  try {
    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    totalLotes = finExtratoFlashContarRegistrosAbaReadOnly_(ss, FIN_EXTRATO_FLASH_ABA_LOTES_V1);
    totalExtratos = finExtratoFlashContarRegistrosAbaReadOnly_(ss, FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1);
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
  }

  var ok = bloqueios.length === 0;
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    modo: "AUDITORIA_CONTAGEM_EXTRATO_FLASH_V1",
    nenhumaGravacao: true,
    mensagem: "Auditoria compacta somente leitura. Nenhuma gravacao foi realizada.",
    timestamp: finExtratoFlashAgoraIso_(),
    abasConsultadas: {
      lotes: FIN_EXTRATO_FLASH_ABA_LOTES_V1,
      extratos: FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1
    },
    totalLotesLidos: totalLotes,
    totalExtratosLidos: totalExtratos,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function TESTE_FLASH_CONTAGEM_SEM_GRAVAR() {
  return auditarContagemExtratoFlashV1_SEM_GRAVAR();
}

function finDryRunLoteExtratoFlashV1(payload) {
  var entrada = payload || {};
  var avisos = [];
  var bloqueios = [];

  try {
    var preview = finPreviewExtratoFlashXlsxV1(entrada);
    if (!preview || !preview.success || !preview.ok) {
      return finExtratoFlashDryRunRetorno_(
        false,
        null,
        null,
        [],
        finExtratoFlashDuplicidadesVazias_(),
        avisos.concat(preview && preview.avisos ? preview.avisos : []),
        bloqueios.concat(preview && preview.bloqueios && preview.bloqueios.length
          ? preview.bloqueios
          : ["Preview do extrato Flash nao aprovado."])
      );
    }

    var lancamentos = preview.lancamentosNormalizados || [];
    var resumo = preview.resumo || finExtratoFlashResumo_(lancamentos);
    if (!lancamentos.length) {
      bloqueios.push("Nenhum lancamento foi encontrado para dry-run do lote.");
    }
    if (!resumo.pessoas || !resumo.pessoas.length) {
      bloqueios.push("Nao foi possivel identificar pessoa no extrato.");
    }

    finExtratoFlashValidarLancamentosDryRun_(lancamentos, avisos, bloqueios);
    finExtratoFlashAvisosDryRun_(lancamentos, avisos);
    var loteProposto = finExtratoFlashMontarLoteProposto_(entrada, resumo, lancamentos);
    var duplicidades = finExtratoFlashDetectarDuplicidadesReais_(entrada, loteProposto, lancamentos, avisos, bloqueios);
    var lancamentosDryRun = finExtratoFlashMontarLancamentosDryRun_(lancamentos, loteProposto, duplicidades);

    if (lancamentosDryRun.length && duplicidades.totalPossiveisDuplicados === lancamentosDryRun.length) {
      bloqueios.push("Todos os lancamentos foram marcados como possivel duplicidade.");
    }
    if (finExtratoFlashArredondar_(resumo.somaDebitos + resumo.somaCreditos) !== resumo.saldoLiquido) {
      bloqueios.push("Resumo inconsistente: saldoLiquido difere de somaDebitos + somaCreditos.");
    }

    return finExtratoFlashDryRunRetorno_(
      bloqueios.length === 0,
      loteProposto,
      resumo,
      lancamentosDryRun,
      duplicidades,
      avisos.concat(preview.avisos || []),
      bloqueios
    );
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
    return finExtratoFlashDryRunRetorno_(
      false,
      null,
      null,
      [],
      finExtratoFlashDuplicidadesVazias_(),
      avisos,
      bloqueios
    );
  }
}

function finPreConfirmarLoteExtratoFlashV1(payload) {
  var avisos = [];
  var bloqueios = [];
  var motivos = [];
  var checklist = [];

  try {
    var dryRun = finExtratoFlashObterDryRunPreConfirmacao_(payload || {}, avisos, bloqueios);
    finExtratoFlashAvaliarPreConfirmacao_(dryRun, checklist, motivos, avisos, bloqueios);

    var decisao = finExtratoFlashDecisaoPreConfirmacao_(motivos, bloqueios);
    return {
      success: bloqueios.length === 0,
      ok: bloqueios.length === 0,
      executado: false,
      gravacaoReal: false,
      modo: FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1,
      decisao: decisao,
      mensagem: "Pre-confirmacao somente leitura. Nenhuma gravacao foi realizada.",
      loteProposto: dryRun ? dryRun.loteProposto : null,
      resumoGerencial: dryRun ? dryRun.resumoGerencial : null,
      duplicidades: dryRun && dryRun.duplicidades ? dryRun.duplicidades : finExtratoFlashDuplicidadesVazias_(),
      checklistSeguranca: checklist,
      motivos: motivos,
      avisos: avisos,
      bloqueios: bloqueios,
      dryRun: dryRun || null
    };
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
    return {
      success: false,
      ok: false,
      executado: false,
      gravacaoReal: false,
      modo: FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1,
      decisao: "BLOQUEADO",
      mensagem: "Pre-confirmacao somente leitura. Nenhuma gravacao foi realizada.",
      loteProposto: null,
      resumoGerencial: null,
      duplicidades: finExtratoFlashDuplicidadesVazias_(),
      checklistSeguranca: checklist,
      motivos: motivos,
      avisos: avisos,
      bloqueios: bloqueios,
      dryRun: null
    };
  }
}

function finConfirmarLoteExtratoFlashV1_BLOQUEADA(payload) {
  return {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    autorizado: false,
    modo: FIN_EXTRATO_FLASH_MODO_CONFIRMACAO_BLOQUEADA_V1,
    mensagem: "Confirmacao real de lote Flash ainda nao esta liberada.",
    bloqueios: [
      "Funcao de confirmacao real permanece bloqueada por seguranca.",
      "Liberacao futura exigira autorizacao tecnica explicita e validacao separada."
    ],
    avisos: [
      "Nenhuma gravacao foi realizada.",
      "Payload recebido apenas para retorno bloqueado seguro."
    ]
  };
}

// Fluxo Flash: dry-run e pre-confirmacao apenas leem/simulam. Importacao real segue bloqueada.
// Liberacao futura exige chave tecnica, auditoria antes/depois e bloqueio por duplicidade.
function finPrepararPayloadImportacaoFlashV1(payload) {
  var entrada = payload || {};
  var avisos = [];
  var bloqueios = [];
  var checklist = [];

  try {
    var dryRun = finExtratoFlashObterDryRunPreparacao_(entrada, avisos, bloqueios);
    var preConfirmacao = finExtratoFlashObterPreConfirmacaoPreparacao_(entrada, dryRun, avisos, bloqueios);
    var pendencias = finExtratoFlashDetectarPendenciasOperacionais_(dryRun ? dryRun.lancamentosDryRun : []);
    var loteParaGravacao = finExtratoFlashMontarLoteParaGravacaoFutura_(dryRun);
    var extratosParaGravacao = finExtratoFlashMontarExtratosParaGravacaoFutura_(dryRun);
    var plano = finExtratoFlashPlanoGravacaoFuturo_();
    var decisoes = finExtratoFlashNormalizarDecisoesOperacionais_(entrada.decisoesOperacionais);
    var aplicacaoDecisoes = finExtratoFlashAplicarDecisoesOperacionais_(pendencias, extratosParaGravacao, decisoes, avisos, bloqueios);

    finExtratoFlashChecklistPreparacao_(dryRun, preConfirmacao, loteParaGravacao, extratosParaGravacao, pendencias, checklist, avisos, bloqueios);
    finExtratoFlashValidarPayloadPreparado_(loteParaGravacao, extratosParaGravacao, dryRun, preConfirmacao, pendencias, bloqueios, avisos);

    var decisao = finExtratoFlashDecisaoPayloadPreparado_(bloqueios, pendencias);
    return {
      success: bloqueios.length === 0,
      ok: bloqueios.length === 0,
      executado: false,
      gravacaoReal: false,
      modo: "PREPARACAO_PAYLOAD_IMPORTACAO_FLASH_V1",
      decisao: decisao,
      mensagem: "Preparacao somente leitura. Nenhuma gravacao foi realizada.",
      chaveTecnicaExigida: true,
      autorizacaoRecebida: false,
      decisaoOperacionalExigida: pendencias.bloqueiaImportacaoRealFutura && !decisoes.explicitas,
      decisoesOperacionaisAplicadas: aplicacaoDecisoes.aplicadas ? decisoes.valores : null,
      pendenciasOperacionaisResolvidas: aplicacaoDecisoes.resolvidas,
      itensTratadosPorDecisao: aplicacaoDecisoes.itensTratados,
      avisosOperacionais: aplicacaoDecisoes.avisos,
      loteParaGravacao: loteParaGravacao,
      extratosParaGravacao: extratosParaGravacao,
      auditoriaPrevia: {
        dryRunOk: !!(dryRun && dryRun.ok && dryRun.executado === false),
        preConfirmacaoOk: !!(preConfirmacao && preConfirmacao.ok && preConfirmacao.executado === false),
        duplicidadeRealConsultada: !!(dryRun && dryRun.duplicidades && dryRun.duplicidades.leituraAbasExecutada),
        planoGravacaoFuturo: plano
      },
      checklistSeguranca: checklist,
      bloqueios: bloqueios,
      avisos: avisos,
      totais: finExtratoFlashResumoPayloadPreparado_(loteParaGravacao, extratosParaGravacao, pendencias),
      pendenciasOperacionais: pendencias
    };
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
    return {
      success: false,
      ok: false,
      executado: false,
      gravacaoReal: false,
      modo: "PREPARACAO_PAYLOAD_IMPORTACAO_FLASH_V1",
      decisao: "BLOQUEADO",
      mensagem: "Preparacao somente leitura. Nenhuma gravacao foi realizada.",
      chaveTecnicaExigida: true,
      autorizacaoRecebida: false,
      decisaoOperacionalExigida: false,
      decisoesOperacionaisAplicadas: null,
      pendenciasOperacionaisResolvidas: false,
      itensTratadosPorDecisao: [],
      avisosOperacionais: [],
      loteParaGravacao: null,
      extratosParaGravacao: [],
      auditoriaPrevia: { planoGravacaoFuturo: finExtratoFlashPlanoGravacaoFuturo_() },
      checklistSeguranca: checklist,
      bloqueios: bloqueios,
      avisos: avisos,
      totais: finExtratoFlashResumoPayloadPreparado_(null, [], finExtratoFlashPendenciasOperacionaisVazias_()),
      pendenciasOperacionais: finExtratoFlashPendenciasOperacionaisVazias_()
    };
  }
}

function finImportarLoteExtratoFlashV1_BLOQUEADA(payload) {
  payload = payload || {};
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("finImportarLoteExtratoFlashV1_BLOQUEADA", payload, {
    ambienteControlado: payload && payload.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("finImportarLoteExtratoFlashV1_BLOQUEADA", envelope73);
  return {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    autorizado: false,
    modo: "IMPORTACAO_REAL_LOTE_EXTRATO_FLASH_V1_BLOQUEADA",
    mensagem: "Importacao real bloqueada. Nenhuma gravacao foi realizada.",
    requisitosParaLiberar: [
      "Dry-run aprovado.",
      "Pre-confirmacao aprovada.",
      "Payload preparado em modo somente leitura.",
      "Auditoria antes registrada.",
      "Autorizacao tecnica explicita informada.",
      "Auditoria depois definida.",
      "Rollback ou cancelamento definido.",
      "Tratamento de deposito ou recarga definido.",
      "Tratamento de prestacao pendente definido."
    ],
    bloqueios: [
      "Importacao real de lote Flash ainda depende de liberacao tecnica."
    ],
    avisos: [
      "Nenhuma gravacao foi realizada.",
      "Esta funcao existe apenas como contrato futuro bloqueado."
    ]
  };
}

function finImportarLoteExtratoFlashV1(payload) {
  var entrada = payload || {};
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("finImportarLoteExtratoFlashV1", entrada, {
    ambienteControlado: entrada && entrada.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("finImportarLoteExtratoFlashV1", envelope73);
  var avisos = [];
  var bloqueios = [];
  var lock = null;
  var gravouAlgo = false;

  try {
    if (typeof LockService === "undefined") {
      bloqueios.push("LockService indisponivel para importacao real Flash.");
      return finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, null, null);
    }

    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      bloqueios.push("Nao foi possivel obter lock exclusivo para importacao real Flash.");
      return finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, null, null);
    }

    var preparado = finPrepararPayloadImportacaoFlashV1(entrada);
    var pacote = finExtratoFlashPrepararPacoteImportacaoReal_(entrada, preparado, avisos, bloqueios);
    if (bloqueios.length) {
      return finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, preparado, pacote);
    }

    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    var contexto = finExtratoFlashObterContextoGravacaoFlash_(ss);
    finExtratoFlashCompletarPacoteLinhasImportacao_(pacote, contexto, entrada);
    var auditoriaAntes = finExtratoFlashAuditoriaAntesImportacao_(contexto, preparado);
    finExtratoFlashValidarImportacaoContraBaseAtual_(preparado, contexto, auditoriaAntes, bloqueios, avisos);
    finExtratoFlashValidarAutorizacaoTecnicaFlash_(entrada.autorizacaoTecnica, preparado, bloqueios);
    finExtratoFlashValidarDecisoesOperacionaisFlash_(entrada.decisoesOperacionais, preparado.pendenciasOperacionais, bloqueios, avisos);

    if (bloqueios.length) {
      return finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, preparado, pacote, auditoriaAntes);
    }

    contexto.sheetLotes.getRange(contexto.sheetLotes.getLastRow() + 1, 1, 1, contexto.headersLote.length).setValues([pacote.linhaLote]);
    gravouAlgo = true;
    contexto.sheetExtratos.getRange(contexto.sheetExtratos.getLastRow() + 1, 1, pacote.linhasExtratos.length, contexto.headersExtratos.length).setValues(pacote.linhasExtratos);
    gravouAlgo = true;

    var auditoriaDepois = finExtratoFlashAuditoriaDepoisImportacao_(contexto, preparado);
    var comparacao = finExtratoFlashCompararAuditoriaImportacao_(auditoriaAntes, auditoriaDepois, preparado);
    if (!comparacao.ok) {
      bloqueios = bloqueios.concat(comparacao.bloqueios || []);
    }

    return {
      success: bloqueios.length === 0,
      ok: bloqueios.length === 0,
      executado: true,
      gravacaoReal: true,
      autorizado: true,
      modo: "IMPORTACAO_REAL_LOTE_EXTRATO_FLASH_V1",
      mensagem: bloqueios.length === 0
        ? "Importacao real Flash executada com autorizacao tecnica."
        : "Importacao real Flash gravou, mas auditoria posterior encontrou divergencia.",
      loteId: preparado.loteParaGravacao ? preparado.loteParaGravacao.loteId : "",
      totalExtratosGravados: pacote.linhasExtratos.length,
      auditoriaAntes: auditoriaAntes,
      auditoriaDepois: auditoriaDepois,
      comparacaoAuditoria: comparacao,
      bloqueios: bloqueios,
      avisos: avisos
    };
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
    if (gravouAlgo) {
      return {
        success: false,
        ok: false,
        executado: true,
        gravacaoReal: true,
        autorizado: true,
        modo: "IMPORTACAO_REAL_LOTE_EXTRATO_FLASH_V1",
        mensagem: "Importacao real Flash teve escrita parcial antes de erro. Auditoria manual obrigatoria.",
        bloqueios: bloqueios,
        avisos: avisos
      };
    }
    return finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, null, null);
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (erroLock) {
        // Lock ja pode ter expirado; nao altera o resultado da validacao principal.
      }
    }
  }
}

function simularImportacaoRealFlashV1_SEM_GRAVAR(payload) {
  var avisos = [];
  var bloqueios = [];
  var preparado = payload && payload.modo === "PREPARACAO_PAYLOAD_IMPORTACAO_FLASH_V1"
    ? payload
    : finPrepararPayloadImportacaoFlashV1(payload || {});
  var pacote = finExtratoFlashPrepararPacoteImportacaoReal_(payload || {}, preparado, avisos, bloqueios);
  var auditoriaAntes = null;

  try {
    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    var contexto = finExtratoFlashObterContextoGravacaoFlash_(ss);
    finExtratoFlashCompletarPacoteLinhasImportacao_(pacote, contexto, payload || {});
    auditoriaAntes = finExtratoFlashAuditoriaAntesImportacao_(contexto, preparado);
    finExtratoFlashValidarImportacaoContraBaseAtual_(preparado, contexto, auditoriaAntes, bloqueios, avisos);
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
  }

  var auditoriaDepoisSimulada = auditoriaAntes ? {
    totalLotesLidos: auditoriaAntes.totalLotesLidos + (pacote && pacote.linhaLote ? 1 : 0),
    totalExtratosLidos: auditoriaAntes.totalExtratosLidos + (pacote && pacote.linhasExtratos ? pacote.linhasExtratos.length : 0),
    loteId: preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao.loteId : "",
    arquivoHash: preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao.arquivoHash : ""
  } : null;

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "SIMULACAO_IMPORTACAO_REAL_FLASH_V1",
    mensagem: "Simulacao somente leitura. Nenhuma gravacao foi realizada.",
    linhasLote: pacote && pacote.linhaLote ? [pacote.linhaLote] : [],
    quantidadeExtratos: pacote && pacote.linhasExtratos ? pacote.linhasExtratos.length : 0,
    auditoriaAntes: auditoriaAntes,
    auditoriaDepoisSimulada: auditoriaDepoisSimulada,
    bloqueios: bloqueios,
    avisos: avisos.concat(preparado && preparado.avisos ? preparado.avisos : []),
    checklist: preparado && preparado.checklistSeguranca ? preparado.checklistSeguranca : []
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      quantidadeExtratos: resultado.quantidadeExtratos,
      auditoriaAntes: resultado.auditoriaAntes,
      auditoriaDepoisSimulada: resultado.auditoriaDepoisSimulada,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function auditarProntidaoImportacaoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var headersOk = false;
  try {
    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    finExtratoFlashObterContextoGravacaoFlash_(ss);
    headersOk = true;
  } catch (erro) {
    bloqueios.push(erro && erro.message ? erro.message : String(erro));
  }

  var resultado = {
    success: bloqueios.length === 0 && !!contagem && contagem.ok === true,
    ok: bloqueios.length === 0 && !!contagem && contagem.ok === true,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PRONTIDAO_IMPORTACAO_FLASH_V1",
    totalLotesLidos: contagem ? contagem.totalLotesLidos : 0,
    totalExtratosLidos: contagem ? contagem.totalExtratosLidos : 0,
    funcoesDisponiveis: {
      dryRun: typeof finDryRunLoteExtratoFlashV1 === "function",
      preConfirmacao: typeof finPreConfirmarLoteExtratoFlashV1 === "function",
      preparacaoPayload: typeof finPrepararPayloadImportacaoFlashV1 === "function",
      importacaoReal: typeof finImportarLoteExtratoFlashV1 === "function",
      importacaoBloqueada: typeof finImportarLoteExtratoFlashV1_BLOQUEADA === "function",
      simulacao: typeof simularImportacaoRealFlashV1_SEM_GRAVAR === "function"
    },
    headersPresentes: headersOk,
    lockServiceDisponivel: typeof LockService !== "undefined",
    importacaoRealImplementada: typeof finImportarLoteExtratoFlashV1 === "function",
    importacaoRealProtegida: true,
    uiChamaImportacaoReal: false,
    nenhumaGravacao: true,
    bloqueios: bloqueios,
    avisos: avisos.concat(contagem && contagem.avisos ? contagem.avisos : [])
  };

  if (!resultado.funcoesDisponiveis.dryRun) resultado.bloqueios.push("Funcao dry-run ausente.");
  if (!resultado.funcoesDisponiveis.preConfirmacao) resultado.bloqueios.push("Funcao pre-confirmacao ausente.");
  if (!resultado.funcoesDisponiveis.preparacaoPayload) resultado.bloqueios.push("Funcao preparacao payload ausente.");
  if (!resultado.funcoesDisponiveis.importacaoReal) resultado.bloqueios.push("Funcao importacao real ausente.");
  if (!resultado.funcoesDisponiveis.importacaoBloqueada) resultado.bloqueios.push("Funcao importacao bloqueada ausente.");
  if (!resultado.funcoesDisponiveis.simulacao) resultado.bloqueios.push("Funcao simulacao ausente.");
  resultado.success = resultado.bloqueios.length === 0 && resultado.ok;
  resultado.ok = resultado.success;

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function auditarModuloFlashCompletoV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var funcoes = finExtratoFlashFuncoesCriticas_();
  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var headersEssenciaisOk = false;
  var auditoriasExecutadoFalse = true;
  var auditorias = {};

  try {
    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    finExtratoFlashObterContextoGravacaoFlash_(ss);
    headersEssenciaisOk = true;
  } catch (erroHeaders) {
    bloqueios.push(erroHeaders && erroHeaders.message ? erroHeaders.message : String(erroHeaders));
  }

  auditorias.contagem = !!(contagem && contagem.executado === false);
  if (!auditorias.contagem) auditoriasExecutadoFalse = false;

  var checklist = gerarChecklistLiberacaoFlashV1_SEM_GRAVAR();
  auditorias.checklist = !!(checklist && checklist.executado === false);
  if (!auditorias.checklist) auditoriasExecutadoFalse = false;

  var simulacao = simularFluxoCompletoFlashInlineV1_SEM_GRAVAR();
  auditorias.simulacaoInline = !!(simulacao && simulacao.executado === false && simulacao.gravacaoReal === false);
  if (!auditorias.simulacaoInline) auditoriasExecutadoFalse = false;

  for (var nomeFuncao in funcoes) {
    if (Object.prototype.hasOwnProperty.call(funcoes, nomeFuncao) && !funcoes[nomeFuncao]) {
      bloqueios.push("Funcao critica Flash indisponivel: " + nomeFuncao + ".");
    }
  }

  if (!contagem || contagem.ok !== true) {
    bloqueios.push("Auditoria compacta de contagem nao retornou ok:true.");
  }
  if (!headersEssenciaisOk) {
    bloqueios.push("Headers essenciais Flash nao foram validados.");
  }
  if (!auditoriasExecutadoFalse) {
    bloqueios.push("Alguma auditoria SEM_GRAVAR nao retornou executado:false.");
  }

  var ok = bloqueios.length === 0;
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_MODULO_FLASH_COMPLETO_V1",
    statusModulo: ok ? "PRONTO_PARA_HOMOLOGACAO_CONTROLADA" : "BLOQUEADO",
    totalLotesLidos: contagem ? contagem.totalLotesLidos : 0,
    totalExtratosLidos: contagem ? contagem.totalExtratosLidos : 0,
    funcoesDisponiveis: funcoes,
    headersEssenciaisOk: headersEssenciaisOk,
    uiChamaImportacaoReal: false,
    importacaoRealProtegida: true,
    nenhumaGravacao: true,
    auditoriasSemGravar: auditorias,
    producaoNaoAlterada: "desconhecido_sem_deploy_local",
    bloqueios: bloqueios,
    avisos: avisos.concat(contagem && contagem.avisos ? contagem.avisos : []).concat([
      "Auditoria somente leitura. Nenhuma gravacao foi realizada.",
      "UI validada por auditoria local de codigo; backend nao le arquivo HTML em runtime.",
      "Producao nao confirmada por funcao local; sem deploy nesta etapa."
    ]),
    proximosPassos: [
      "Executar auditorias SEM_GRAVAR no Apps Script /dev.",
      "Validar visualmente checklist e painel de status no WebApp /dev.",
      "Registrar contagem antes/depois antes de qualquer autorizacao real.",
      "Manter importacao real bloqueada ate decisao operacional e autorizacao tecnica."
    ]
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      statusModulo: resultado.statusModulo,
      totalLotesLidos: resultado.totalLotesLidos,
      totalExtratosLidos: resultado.totalExtratosLidos,
      headersEssenciaisOk: resultado.headersEssenciaisOk,
      uiChamaImportacaoReal: resultado.uiChamaImportacaoReal,
      importacaoRealProtegida: resultado.importacaoRealProtegida,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function gerarChecklistLiberacaoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [
    "Checklist operacional somente leitura. Nenhuma gravacao foi realizada.",
    "Importacao real permanece bloqueada ate autorizacao tecnica explicita."
  ];
  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var decisoes = finExtratoFlashNormalizarDecisoesOperacionais_(null);
  var auditoriaDecisoes = auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR();
  if (!contagem || contagem.ok !== true) {
    bloqueios.push("Contagem Flash nao disponivel para checklist de liberacao.");
  }
  if (!auditoriaDecisoes || auditoriaDecisoes.ok !== true) {
    bloqueios.push("Auditoria de decisoes operacionais nao retornou ok:true.");
  }

  var itens = [
    finExtratoFlashChecklistLiberacaoItem_(1, "Dry-run aprovado.", "PENDENTE_VALIDACAO_DEV", false),
    finExtratoFlashChecklistLiberacaoItem_(2, "Pre-confirmacao aprovada.", "PENDENTE_VALIDACAO_DEV", false),
    finExtratoFlashChecklistLiberacaoItem_(3, "Payload preparado.", auditoriaDecisoes && auditoriaDecisoes.comDecisaoResolvePendencias ? "APTO_COM_DECISOES_PADRAO" : "PENDENTE_VALIDACAO_DEV", !!(auditoriaDecisoes && auditoriaDecisoes.comDecisaoResolvePendencias)),
    finExtratoFlashChecklistLiberacaoItem_(4, "Decisao sobre depositos/recargas.", decisoes.valores.depositosRecargas, decisoes.validas),
    finExtratoFlashChecklistLiberacaoItem_(5, "Decisao sobre prestacoes pendentes.", decisoes.valores.prestacaoPendente, decisoes.validas),
    finExtratoFlashChecklistLiberacaoItem_(6, "Contagem antes registrada.", contagem && contagem.ok ? "BASELINE_DISPONIVEL" : "BLOQUEADO", !!(contagem && contagem.ok)),
    finExtratoFlashChecklistLiberacaoItem_(7, "Duplicidade real zerada.", "PENDENTE_VALIDACAO_DO_LOTE", false),
    finExtratoFlashChecklistLiberacaoItem_(8, "Autorizacao tecnica preenchida.", "PENDENTE_AUTORIZACAO", false),
    finExtratoFlashChecklistLiberacaoItem_(9, "Usuario responsavel identificado.", "PENDENTE_AUTORIZACAO", false),
    finExtratoFlashChecklistLiberacaoItem_(10, "Auditoria depois obrigatoria.", "OBRIGATORIO_POS_EXECUCAO", false),
    finExtratoFlashChecklistLiberacaoItem_(11, "Producao so apos validacao em /dev.", "BLOQUEADO_PARA_PRODUCAO", false),
    finExtratoFlashChecklistLiberacaoItem_(12, "Categoria nao inferida.", decisoes.valores.categoriaNaoInferida, decisoes.validas)
  ];

  var status = bloqueios.length ? "BLOQUEADO" : "PRONTO_PARA_TESTE_REAL_CONTROLADO_DEV";
  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "CHECKLIST_LIBERACAO_FLASH_V1",
    status: status,
    nenhumaGravacao: true,
    importacaoRealProtegida: true,
    importacaoRealExigeAutorizacao: true,
    prontoParaDeployDevParaProd: false,
    decisoesOperacionaisPadrao: decisoes.valores,
    decisoesOperacionaisOk: decisoes.validas,
    pendenciasResolvidasPorPolitica: !!(auditoriaDecisoes && auditoriaDecisoes.comDecisaoResolvePendencias),
    totalLotesLidos: contagem ? contagem.totalLotesLidos : 0,
    totalExtratosLidos: contagem ? contagem.totalExtratosLidos : 0,
    checklist: itens,
    bloqueios: bloqueios,
    avisos: avisos.concat(contagem && contagem.avisos ? contagem.avisos : [])
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      status: resultado.status,
      totalLotesLidos: resultado.totalLotesLidos,
      totalExtratosLidos: resultado.totalExtratosLidos,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function simularFluxoCompletoFlashInlineV1_SEM_GRAVAR() {
  var payload = finExtratoFlashPayloadInlineSeguro_();
  var bloqueios = [];
  var avisos = [];
  var contagemAntes = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var dryRun = finDryRunLoteExtratoFlashV1(payload);
  var preConfirmacao = dryRun && dryRun.executado === false ? finPreConfirmarLoteExtratoFlashV1(dryRun) : null;
  var preparado = preConfirmacao && preConfirmacao.executado === false ? finPrepararPayloadImportacaoFlashV1(preConfirmacao) : null;
  var simulacao = preparado && preparado.executado === false ? simularImportacaoRealFlashV1_SEM_GRAVAR(preparado) : null;

  if (!contagemAntes || contagemAntes.ok !== true) bloqueios.push("Contagem antes indisponivel.");
  if (!dryRun || dryRun.executado !== false || dryRun.gravacaoReal === true) bloqueios.push("Dry-run inline nao retornou executado:false.");
  if (!preConfirmacao || preConfirmacao.executado !== false || preConfirmacao.gravacaoReal === true) bloqueios.push("Pre-confirmacao inline nao retornou executado:false.");
  if (!preparado || preparado.executado !== false || preparado.gravacaoReal === true) bloqueios.push("Payload inline nao retornou executado:false.");
  if (!simulacao || simulacao.executado !== false || simulacao.gravacaoReal === true) bloqueios.push("Simulacao inline nao retornou executado:false.");

  avisos = avisos
    .concat(dryRun && dryRun.avisos ? dryRun.avisos : [])
    .concat(preConfirmacao && preConfirmacao.avisos ? preConfirmacao.avisos : [])
    .concat(preparado && preparado.avisos ? preparado.avisos : [])
    .concat(simulacao && simulacao.avisos ? simulacao.avisos : []);

  var totalLotesAntes = contagemAntes ? contagemAntes.totalLotesLidos : 0;
  var totalExtratosAntes = contagemAntes ? contagemAntes.totalExtratosLidos : 0;
  var quantidadeExtratos = simulacao && simulacao.quantidadeExtratos ? simulacao.quantidadeExtratos : 0;
  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "SIMULACAO_FLUXO_COMPLETO_FLASH_INLINE_V1",
    totalLancamentos: dryRun && dryRun.resumo ? dryRun.resumo.totalLancamentos : 0,
    decisaoDryRun: dryRun && dryRun.ok ? "APROVADO_SEM_GRAVAR" : "BLOQUEADO",
    decisaoPreConfirmacao: preConfirmacao && preConfirmacao.decisao ? preConfirmacao.decisao : "BLOQUEADO",
    decisaoPayload: preparado && preparado.decisao ? preparado.decisao : "BLOQUEADO",
    simulacaoOk: !!(simulacao && simulacao.ok === true),
    totalLotesAntes: totalLotesAntes,
    totalExtratosAntes: totalExtratosAntes,
    totalLotesDepoisSimulado: totalLotesAntes + (simulacao && simulacao.auditoriaDepoisSimulada ? 1 : 0),
    totalExtratosDepoisSimulado: totalExtratosAntes + quantidadeExtratos,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function simularFluxoCompletoFlashComDecisoesV1_SEM_GRAVAR() {
  var payload = finExtratoFlashPayloadInlineSeguro_();
  payload.decisoesOperacionais = finExtratoFlashNormalizarDecisoesOperacionais_(null).valores;

  var bloqueios = [];
  var avisos = [];
  var contagemAntes = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var dryRun = finDryRunLoteExtratoFlashV1(payload);
  var preConfirmacao = dryRun && dryRun.executado === false ? finPreConfirmarLoteExtratoFlashV1(dryRun) : null;
  var payloadPreparacao = finExtratoFlashAssign_({}, preConfirmacao || {});
  payloadPreparacao.decisoesOperacionais = payload.decisoesOperacionais;
  var preparado = preConfirmacao && preConfirmacao.executado === false ? finPrepararPayloadImportacaoFlashV1(payloadPreparacao) : null;
  var simulacao = preparado && preparado.executado === false ? simularImportacaoRealFlashV1_SEM_GRAVAR(preparado) : null;

  if (!contagemAntes || contagemAntes.ok !== true) bloqueios.push("Contagem antes indisponivel.");
  if (!dryRun || dryRun.executado !== false || dryRun.gravacaoReal === true) bloqueios.push("Dry-run com decisoes nao retornou executado:false.");
  if (!preConfirmacao || preConfirmacao.executado !== false || preConfirmacao.gravacaoReal === true) bloqueios.push("Pre-confirmacao com decisoes nao retornou executado:false.");
  if (!preparado || preparado.executado !== false || preparado.gravacaoReal === true) bloqueios.push("Payload com decisoes nao retornou executado:false.");
  if (!simulacao || simulacao.executado !== false || simulacao.gravacaoReal === true) bloqueios.push("Simulacao com decisoes nao retornou executado:false.");

  avisos = avisos
    .concat(dryRun && dryRun.avisos ? dryRun.avisos : [])
    .concat(preConfirmacao && preConfirmacao.avisos ? preConfirmacao.avisos : [])
    .concat(preparado && preparado.avisos ? preparado.avisos : [])
    .concat(preparado && preparado.avisosOperacionais ? preparado.avisosOperacionais : [])
    .concat(simulacao && simulacao.avisos ? simulacao.avisos : []);

  var totais = preparado && preparado.totais ? preparado.totais : {};
  var totalLotesAntes = contagemAntes ? contagemAntes.totalLotesLidos : 0;
  var totalExtratosAntes = contagemAntes ? contagemAntes.totalExtratosLidos : 0;
  var qtdLotes = Number(totais.totalLotesQueSeriamGravados || 0);
  var qtdExtratos = Number(totais.totalExtratosQueSeriamGravados || 0);
  var resultado = {
    success: bloqueios.length === 0 && !!(preparado && preparado.ok === true),
    ok: bloqueios.length === 0 && !!(preparado && preparado.ok === true),
    executado: false,
    gravacaoReal: false,
    modo: "SIMULACAO_FLUXO_FLASH_COM_DECISOES_V1",
    decisaoPayload: preparado ? preparado.decisao : "BLOQUEADO",
    pendenciasOperacionaisResolvidas: !!(preparado && preparado.pendenciasOperacionaisResolvidas),
    decisoesOperacionaisAplicadas: preparado ? preparado.decisoesOperacionaisAplicadas : payload.decisoesOperacionais,
    quantidadeLoteQueSeriaGravado: qtdLotes,
    quantidadeExtratosQueSeriamGravados: qtdExtratos,
    totalLotesAntes: totalLotesAntes,
    totalExtratosAntes: totalExtratosAntes,
    totalLotesDepoisSimulado: totalLotesAntes + qtdLotes,
    totalExtratosDepoisSimulado: totalExtratosAntes + qtdExtratos,
    bloqueios: bloqueios.concat(preparado && preparado.bloqueios ? preparado.bloqueios : []),
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      decisaoPayload: resultado.decisaoPayload,
      pendenciasOperacionaisResolvidas: resultado.pendenciasOperacionaisResolvidas,
      quantidadeLoteQueSeriaGravado: resultado.quantidadeLoteQueSeriaGravado,
      quantidadeExtratosQueSeriamGravados: resultado.quantidadeExtratosQueSeriamGravados,
      totalLotesAntes: resultado.totalLotesAntes,
      totalExtratosAntes: resultado.totalExtratosAntes,
      totalLotesDepoisSimulado: resultado.totalLotesDepoisSimulado,
      totalExtratosDepoisSimulado: resultado.totalExtratosDepoisSimulado,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var padrao = finExtratoFlashNormalizarDecisoesOperacionais_(null);
  var payload = finExtratoFlashPayloadInlineSeguro_();
  var dryRun = finDryRunLoteExtratoFlashV1(payload);
  var preConfirmacao = dryRun && dryRun.executado === false ? finPreConfirmarLoteExtratoFlashV1(dryRun) : null;
  var semDecisao = preConfirmacao && preConfirmacao.executado === false ? finPrepararPayloadImportacaoFlashV1(preConfirmacao) : null;
  var comPayload = finExtratoFlashAssign_({}, preConfirmacao || {});
  comPayload.decisoesOperacionais = padrao.valores;
  var comDecisao = preConfirmacao && preConfirmacao.executado === false ? finPrepararPayloadImportacaoFlashV1(comPayload) : null;

  if (!padrao.validas) bloqueios.push("Decisoes operacionais padrao invalidas.");
  if (!contagem || contagem.ok !== true) bloqueios.push("Contagem Flash indisponivel para auditoria de decisoes.");
  if (!semDecisao || semDecisao.executado !== false) bloqueios.push("Preparacao sem decisao nao retornou executado:false.");
  if (!comDecisao || comDecisao.executado !== false) bloqueios.push("Preparacao com decisao nao retornou executado:false.");

  var semDecisaoRequerRevisao = !!(semDecisao && semDecisao.decisao === "REQUER_REVISAO");
  var comDecisaoResolvePendencias = !!(
    comDecisao &&
    comDecisao.pendenciasOperacionaisResolvidas === true &&
    comDecisao.decisao === "APTO_TECNICAMENTE_BLOQUEADO_POR_CHAVE"
  );

  if (!semDecisaoRequerRevisao) bloqueios.push("Fluxo sem decisao nao manteve REQUER_REVISAO.");
  if (!comDecisaoResolvePendencias) bloqueios.push("Fluxo com decisoes padrao nao resolveu pendencias operacionais.");

  avisos = avisos
    .concat(padrao.avisos || [])
    .concat(semDecisao && semDecisao.avisos ? semDecisao.avisos : [])
    .concat(comDecisao && comDecisao.avisosOperacionais ? comDecisao.avisosOperacionais : []);

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_DECISOES_OPERACIONAIS_FLASH_V1",
    decisoesPadraoOk: padrao.validas,
    semDecisaoRequerRevisao: semDecisaoRequerRevisao,
    comDecisaoResolvePendencias: comDecisaoResolvePendencias,
    decisoesOperacionaisPadrao: padrao.valores,
    decisaoSemDecisao: semDecisao ? semDecisao.decisao : "BLOQUEADO",
    decisaoComDecisao: comDecisao ? comDecisao.decisao : "BLOQUEADO",
    totalLotesLidos: contagem ? contagem.totalLotesLidos : 0,
    totalExtratosLidos: contagem ? contagem.totalExtratosLidos : 0,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function auditarPreProducaoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var funcoes = finExtratoFlashFuncoesCriticas_();
  var checklist = gerarChecklistLiberacaoFlashV1_SEM_GRAVAR();
  var modulo = auditarModuloFlashCompletoV1_SEM_GRAVAR();
  var auditoriaDecisoes = auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR();
  var funcoesCriticasOk = true;

  for (var nome in funcoes) {
    if (Object.prototype.hasOwnProperty.call(funcoes, nome) && !funcoes[nome]) {
      funcoesCriticasOk = false;
      bloqueios.push("Funcao critica ausente na pre-producao Flash: " + nome + ".");
    }
  }
  if (!checklist || checklist.executado !== false) bloqueios.push("Checklist de liberacao nao retornou executado:false.");
  if (!modulo || modulo.executado !== false) bloqueios.push("Auditoria completa do modulo nao retornou executado:false.");
  if (!auditoriaDecisoes || auditoriaDecisoes.executado !== false) bloqueios.push("Auditoria de decisoes nao retornou executado:false.");
  if (modulo && modulo.bloqueios && modulo.bloqueios.length) bloqueios = bloqueios.concat(modulo.bloqueios);
  if (auditoriaDecisoes && auditoriaDecisoes.bloqueios && auditoriaDecisoes.bloqueios.length) bloqueios = bloqueios.concat(auditoriaDecisoes.bloqueios);

  avisos.push("Git hash esperado deve ser confirmado externamente antes de deploy.");
  avisos.push("Producao nao pode ser confirmada por esta funcao local; sem deploy nesta etapa.");

  var ok = bloqueios.length === 0;
  var decisoesOperacionaisOk = !!(auditoriaDecisoes && auditoriaDecisoes.ok === true && auditoriaDecisoes.comDecisaoResolvePendencias === true);
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PRE_PRODUCAO_FLASH_V1",
    gitHashEsperado: "7902a035c9a166f6151b4896fb72942d93756085",
    funcoesCriticasOk: funcoesCriticasOk,
    uiSeguraOk: true,
    auditoriasOk: !!(checklist && checklist.executado === false && modulo && modulo.executado === false && auditoriaDecisoes && auditoriaDecisoes.executado === false),
    decisoesOperacionaisOk: decisoesOperacionaisOk,
    importacaoRealProtegida: true,
    producaoNaoAlterada: "desconhecido_sem_deploy_local",
    prontoParaTesteRealControladoDev: ok && decisoesOperacionaisOk,
    prontoParaDeployDevParaProd: false,
    status: ok && decisoesOperacionaisOk ? "PRONTO_PARA_TESTE_REAL_CONTROLADO_DEV" : "BLOQUEADO",
    funcoesDisponiveis: funcoes,
    decisoesOperacionaisPadrao: auditoriaDecisoes ? auditoriaDecisoes.decisoesOperacionaisPadrao : {},
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      status: resultado.status,
      funcoesCriticasOk: resultado.funcoesCriticasOk,
      uiSeguraOk: resultado.uiSeguraOk,
      auditoriasOk: resultado.auditoriasOk,
      decisoesOperacionaisOk: resultado.decisoesOperacionaisOk,
      importacaoRealProtegida: resultado.importacaoRealProtegida,
      prontoParaTesteRealControladoDev: resultado.prontoParaTesteRealControladoDev,
      prontoParaDeployDevParaProd: resultado.prontoParaDeployDevParaProd,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var frase = "AUTORIZO IMPORTACAO REAL FLASH";

  var fluxo = finExtratoFlashGerarFluxoAutorizacaoPadrao_(avisos, bloqueios);
  var contagem = fluxo.contagem || {};
  var preparado = fluxo.preparado || {};
  var lote = preparado.loteParaGravacao || {};
  var totais = preparado.totais || {};
  var simulacao = fluxo.simulacao || {};
  var auditoriaDepois = simulacao.auditoriaDepoisSimulada || {};
  var qtdLotes = Number(totais.totalLotesQueSeriamGravados || 0);
  var qtdExtratos = Number(totais.totalExtratosQueSeriamGravados || 0);
  var totalLotesAntes = Number(contagem.totalLotesLidos || 0);
  var totalExtratosAntes = Number(contagem.totalExtratosLidos || 0);
  var totalLotesDepois = auditoriaDepois.totalLotesLidos !== undefined
    ? Number(auditoriaDepois.totalLotesLidos || 0)
    : totalLotesAntes + qtdLotes;
  var totalExtratosDepois = auditoriaDepois.totalExtratosLidos !== undefined
    ? Number(auditoriaDepois.totalExtratosLidos || 0)
    : totalExtratosAntes + qtdExtratos;

  finExtratoFlashValidarFluxoAutorizacaoPadrao_(fluxo, bloqueios);

  var payloadAutorizacao = finExtratoFlashMontarPayloadAutorizacaoSugerido_(
    fluxo.preConfirmacao,
    fluxo.decisoes,
    lote,
    totalLotesAntes,
    totalExtratosAntes,
    totalLotesDepois,
    totalExtratosDepois,
    frase
  );

  var ok = bloqueios.length === 0;
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    gravacaoReal: false,
    modo: "PACOTE_AUTORIZACAO_IMPORTACAO_FLASH_V1",
    status: ok ? "PRONTO_PARA_AUTORIZACAO_MANUAL_DEV" : "BLOQUEADO",
    nenhumaGravacao: true,
    baselineAntes: {
      totalLotesLidos: totalLotesAntes,
      totalExtratosLidos: totalExtratosAntes
    },
    esperadoDepois: {
      totalLotesEsperado: totalLotesDepois,
      totalExtratosEsperado: totalExtratosDepois
    },
    diferencaEsperada: {
      lotesAdicionar: qtdLotes,
      extratosAdicionar: qtdExtratos
    },
    loteEsperado: {
      loteId: lote.loteId || "",
      arquivoHash: lote.arquivoHash || "",
      chaveLote: lote.chaveLote || "",
      totalLancamentos: Number(lote.totalLancamentos || 0),
      totalDebitos: Number(lote.totalDebitos || 0),
      totalCreditos: Number(lote.totalCreditos || 0),
      saldoLiquido: finExtratoFlashArredondar_(lote.saldoLiquido || 0),
      pessoa: lote.pessoa || "",
      finalCartao: lote.finalCartao || "",
      primeiraData: lote.periodoInicio || "",
      ultimaData: lote.periodoFim || ""
    },
    decisoesOperacionaisAplicadas: fluxo.decisoes,
    payloadAutorizacaoSugerido: payloadAutorizacao,
    fraseObrigatoria: frase,
    checklistAntesExecucao: finExtratoFlashChecklistAntesAutorizacao_(ok),
    checklistDepoisExecucao: gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR().roteiro,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      status: resultado.status,
      baselineAntes: resultado.baselineAntes,
      esperadoDepois: resultado.esperadoDepois,
      diferencaEsperada: resultado.diferencaEsperada,
      loteEsperado: resultado.loteEsperado,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR() {
  var pacote = gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR();
  var bloqueios = [];
  var avisos = [];
  var baseline = pacote && pacote.baselineAntes ? pacote.baselineAntes : {};
  var diferenca = pacote && pacote.diferencaEsperada ? pacote.diferencaEsperada : {};
  var payload = pacote && pacote.payloadAutorizacaoSugerido ? pacote.payloadAutorizacaoSugerido : {};
  var autorizacao = payload.autorizacaoTecnica || {};

  if (!pacote || pacote.executado !== false || pacote.gravacaoReal === true) {
    bloqueios.push("Pacote de autorizacao nao retornou contrato SEM_GRAVAR seguro.");
  }
  if (pacote && pacote.bloqueios && pacote.bloqueios.length) {
    bloqueios = bloqueios.concat(pacote.bloqueios);
  }
  if (Number(baseline.totalLotesLidos || 0) !== 1 || Number(baseline.totalExtratosLidos || 0) !== 3) {
    avisos.push("Baseline atual diverge do esperado para /dev: lotes=" + Number(baseline.totalLotesLidos || 0) + ", extratos=" + Number(baseline.totalExtratosLidos || 0) + ".");
  }
  if (Number(diferenca.lotesAdicionar || 0) !== 1) {
    bloqueios.push("Diferenca esperada de lotes deve adicionar exatamente 1 lote.");
  }
  if (Number(diferenca.extratosAdicionar || 0) <= 0) {
    bloqueios.push("Diferenca esperada de extratos deve adicionar pelo menos 1 extrato.");
  }

  var payloadCompleto = !!(
    payload &&
    payload.liberarImportacaoReal === true &&
    payload.fraseAutorizacao === "AUTORIZO IMPORTACAO REAL FLASH" &&
    payload.hashEsperado &&
    payload.loteEsperado &&
    payload.totalLancamentosEsperado &&
    payload.totalLotesAntes !== undefined &&
    payload.totalExtratosAntes !== undefined &&
    payload.totalLotesDepoisEsperado !== undefined &&
    payload.totalExtratosDepoisEsperado !== undefined &&
    payload.decisoesOperacionais &&
    payload.usuarioResponsavel &&
    payload.timestampGeracaoPacote &&
    payload.ambienteEsperado === "DEV" &&
    payload.confirmacaoManualNecessaria === true &&
    autorizacao.frase === "AUTORIZO IMPORTACAO REAL FLASH"
  );
  if (!payloadCompleto) bloqueios.push("Payload de autorizacao sugerido esta incompleto.");

  var ambienteDevOk = !!(payload && payload.ambienteEsperado === "DEV");
  if (!ambienteDevOk) bloqueios.push("Ambiente esperado nao esta marcado como DEV.");

  var prontoDev = bloqueios.length === 0 && pacote && pacote.status === "PRONTO_PARA_AUTORIZACAO_MANUAL_DEV";
  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PACOTE_AUTORIZACAO_FLASH_V1",
    pacoteAutorizacaoOk: !!(pacote && pacote.ok === true),
    baselineOk: Number(baseline.totalLotesLidos || 0) === 1 && Number(baseline.totalExtratosLidos || 0) === 3,
    diferencaEsperadaOk: Number(diferenca.lotesAdicionar || 0) === 1 && Number(diferenca.extratosAdicionar || 0) > 0,
    payloadAutorizacaoCompleto: payloadCompleto,
    ambienteDevOk: ambienteDevOk,
    prontoParaAutorizacaoManualDev: prontoDev,
    prontoParaProducao: false,
    bloqueios: bloqueios,
    avisos: avisos.concat(pacote && pacote.avisos ? pacote.avisos : [])
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR() {
  var roteiro = [
    "Rodar TESTE_FLASH_CONTAGEM_SEM_GRAVAR.",
    "Confirmar total de lotes antes + 1.",
    "Confirmar total de extratos antes + N.",
    "Validar loteId e arquivoHash contra o pacote de autorizacao.",
    "Validar duplicidade real apos a execucao controlada.",
    "Validar dashboard, pendencias e conciliacao visual.",
    "Validar UI do WebApp /dev sem erro visual ou console.",
    "Registrar evidencia com retorno, logs e print.",
    "Somente depois discutir producao em pacote separado."
  ];
  var resultado = {
    success: true,
    ok: true,
    executado: false,
    gravacaoReal: false,
    nenhumaGravacao: true,
    modo: "CHECKLIST_POS_IMPORTACAO_FLASH_V1",
    status: "ROTEIRO_POS_EXECUCAO_GERADO",
    roteiro: roteiro,
    bloqueios: [],
    avisos: [
      "Checklist somente leitura. Nenhuma gravacao foi realizada.",
      "Nao executar producao antes de teste real controlado aprovado em /dev."
    ]
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function auditarProntoParaImportacaoRealDevFlashV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];
  var decisoes = auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR();
  var preProducao = auditarPreProducaoFlashV1_SEM_GRAVAR();
  var pacote = auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR();
  var pacoteCompleto = gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR();

  if (!decisoes || decisoes.ok !== true) bloqueios.push("Auditoria de decisoes operacionais nao esta ok.");
  if (!preProducao || preProducao.ok !== true) bloqueios.push("Auditoria pre-producao Flash nao esta ok.");
  if (!pacote || pacote.ok !== true) bloqueios.push("Auditoria do pacote de autorizacao nao esta ok.");
  if (decisoes && decisoes.bloqueios && decisoes.bloqueios.length) bloqueios = bloqueios.concat(decisoes.bloqueios);
  if (preProducao && preProducao.bloqueios && preProducao.bloqueios.length) bloqueios = bloqueios.concat(preProducao.bloqueios);
  if (pacote && pacote.bloqueios && pacote.bloqueios.length) bloqueios = bloqueios.concat(pacote.bloqueios);

  avisos = avisos
    .concat(decisoes && decisoes.avisos ? decisoes.avisos : [])
    .concat(preProducao && preProducao.avisos ? preProducao.avisos : [])
    .concat(pacote && pacote.avisos ? pacote.avisos : []);

  var pronto = bloqueios.length === 0 &&
    !!(decisoes && decisoes.ok === true) &&
    !!(preProducao && preProducao.prontoParaTesteRealControladoDev === true) &&
    !!(pacote && pacote.prontoParaAutorizacaoManualDev === true);

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PRONTO_IMPORTACAO_REAL_DEV_FLASH_V1",
    prontoParaImportacaoRealDev: pronto,
    prontoParaProducao: false,
    autorizacaoManualObrigatoria: true,
    uiExecutaImportacaoReal: false,
    baselineAntes: pacoteCompleto ? pacoteCompleto.baselineAntes : null,
    esperadoDepois: pacoteCompleto ? pacoteCompleto.esperadoDepois : null,
    payloadAutorizacaoCompleto: !!(pacote && pacote.payloadAutorizacaoCompleto === true),
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      prontoParaImportacaoRealDev: resultado.prontoParaImportacaoRealDev,
      prontoParaProducao: resultado.prontoParaProducao,
      autorizacaoManualObrigatoria: resultado.autorizacaoManualObrigatoria,
      uiExecutaImportacaoReal: resultado.uiExecutaImportacaoReal,
      baselineAntes: resultado.baselineAntes,
      esperadoDepois: resultado.esperadoDepois,
      payloadAutorizacaoCompleto: resultado.payloadAutorizacaoCompleto,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

function finExtratoFlashGerarFluxoAutorizacaoPadrao_(avisos, bloqueios) {
  var decisoes = finExtratoFlashNormalizarDecisoesOperacionais_(null).valores;
  var payload = finExtratoFlashPayloadInlineSeguro_();
  payload.decisoesOperacionais = decisoes;

  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var dryRun = finDryRunLoteExtratoFlashV1(payload);
  var preConfirmacao = dryRun && dryRun.executado === false ? finPreConfirmarLoteExtratoFlashV1(dryRun) : null;
  var payloadPreparacao = finExtratoFlashAssign_({}, preConfirmacao || {});
  payloadPreparacao.decisoesOperacionais = decisoes;
  var preparado = preConfirmacao && preConfirmacao.executado === false ? finPrepararPayloadImportacaoFlashV1(payloadPreparacao) : null;
  var simulacao = preparado && preparado.executado === false ? simularImportacaoRealFlashV1_SEM_GRAVAR(preparado) : null;
  var prontidao = auditarProntidaoImportacaoFlashV1_SEM_GRAVAR();

  if (contagem && contagem.avisos) avisos.push.apply(avisos, contagem.avisos);
  if (dryRun && dryRun.avisos) avisos.push.apply(avisos, dryRun.avisos);
  if (preConfirmacao && preConfirmacao.avisos) avisos.push.apply(avisos, preConfirmacao.avisos);
  if (preparado && preparado.avisos) avisos.push.apply(avisos, preparado.avisos);
  if (preparado && preparado.avisosOperacionais) avisos.push.apply(avisos, preparado.avisosOperacionais);
  if (simulacao && simulacao.avisos) avisos.push.apply(avisos, simulacao.avisos);
  if (prontidao && prontidao.avisos) avisos.push.apply(avisos, prontidao.avisos);

  return {
    contagem: contagem,
    dryRun: dryRun,
    preConfirmacao: preConfirmacao,
    preparado: preparado,
    simulacao: simulacao,
    prontidao: prontidao,
    decisoes: decisoes
  };
}

function finExtratoFlashValidarFluxoAutorizacaoPadrao_(fluxo, bloqueios) {
  var f = fluxo || {};
  if (!f.contagem || f.contagem.ok !== true || f.contagem.executado !== false) bloqueios.push("Auditoria de contagem antes indisponivel para pacote de autorizacao.");
  if (!f.dryRun || f.dryRun.ok !== true || f.dryRun.executado !== false) bloqueios.push("Dry-run padrao nao esta ok para pacote de autorizacao.");
  if (!f.preConfirmacao || f.preConfirmacao.ok !== true || f.preConfirmacao.executado !== false) bloqueios.push("Pre-confirmacao padrao nao esta ok para pacote de autorizacao.");
  if (!f.preparado || f.preparado.ok !== true || f.preparado.executado !== false) bloqueios.push("Payload preparado com decisoes nao esta ok para pacote de autorizacao.");
  if (!f.simulacao || f.simulacao.ok !== true || f.simulacao.executado !== false || f.simulacao.gravacaoReal === true) bloqueios.push("Simulacao de importacao real nao esta ok ou nao retornou SEM_GRAVAR.");
  if (!f.prontidao || f.prontidao.ok !== true || f.prontidao.executado !== false) bloqueios.push("Auditoria de prontidao nao esta ok para pacote de autorizacao.");
  if (f.preparado && f.preparado.decisao !== "APTO_TECNICAMENTE_BLOQUEADO_POR_CHAVE") bloqueios.push("Payload preparado nao esta APTO_TECNICAMENTE_BLOQUEADO_POR_CHAVE.");
  if (f.preparado && f.preparado.pendenciasOperacionaisResolvidas !== true) bloqueios.push("Decisoes operacionais nao resolveram pendencias do payload.");
  if (f.preparado && !f.preparado.loteParaGravacao) bloqueios.push("Pacote de autorizacao sem lote esperado.");
  if (f.preparado && (!f.preparado.extratosParaGravacao || !f.preparado.extratosParaGravacao.length)) bloqueios.push("Pacote de autorizacao sem extratos esperados.");
}

function finExtratoFlashMontarPayloadAutorizacaoSugerido_(preConfirmacao, decisoes, lote, totalLotesAntes, totalExtratosAntes, totalLotesDepois, totalExtratosDepois, frase) {
  var payload = {};
  var origem = preConfirmacao || {};
  for (var k in origem) {
    if (Object.prototype.hasOwnProperty.call(origem, k)) {
      payload[k] = origem[k];
    }
  }

  var timestamp = finExtratoFlashAgoraIso_();
  payload.decisoesOperacionais = decisoes || finExtratoFlashNormalizarDecisoesOperacionais_(null).valores;
  payload.liberarImportacaoReal = true;
  payload.fraseAutorizacao = frase;
  payload.hashEsperado = lote && lote.arquivoHash ? lote.arquivoHash : "";
  payload.loteEsperado = lote && lote.loteId ? lote.loteId : "";
  payload.totalLancamentosEsperado = Number(lote && lote.totalLancamentos ? lote.totalLancamentos : 0);
  payload.totalLotesAntes = Number(totalLotesAntes || 0);
  payload.totalExtratosAntes = Number(totalExtratosAntes || 0);
  payload.totalLotesDepoisEsperado = Number(totalLotesDepois || 0);
  payload.totalExtratosDepoisEsperado = Number(totalExtratosDepois || 0);
  payload.usuarioResponsavel = "PREENCHER_MANUALMENTE";
  payload.timestampGeracaoPacote = timestamp;
  payload.ambienteEsperado = "DEV";
  payload.confirmacaoManualNecessaria = true;
  payload.autorizacaoTecnica = {
    liberarImportacaoReal: true,
    frase: frase,
    fraseAutorizacao: frase,
    usuarioResponsavel: "PREENCHER_MANUALMENTE",
    timestampAutorizacao: "PREENCHER_NO_MOMENTO_DA_EXECUCAO",
    loteIdEsperado: lote && lote.loteId ? lote.loteId : "",
    arquivoHashEsperado: lote && lote.arquivoHash ? lote.arquivoHash : "",
    totalLancamentosEsperado: Number(lote && lote.totalLancamentos ? lote.totalLancamentos : 0),
    somaDebitosEsperada: finExtratoFlashArredondar_(lote && lote.somaDebitos ? lote.somaDebitos : 0),
    somaCreditosEsperada: finExtratoFlashArredondar_(lote && lote.somaCreditos ? lote.somaCreditos : 0),
    totalLotesAntes: Number(totalLotesAntes || 0),
    totalExtratosAntes: Number(totalExtratosAntes || 0),
    totalLotesDepoisEsperado: Number(totalLotesDepois || 0),
    totalExtratosDepoisEsperado: Number(totalExtratosDepois || 0),
    ambienteEsperado: "DEV",
    confirmacaoManualNecessaria: true,
    timestampGeracaoPacote: timestamp
  };

  return payload;
}

function finExtratoFlashChecklistAntesAutorizacao_(pacoteOk) {
  return [
    finExtratoFlashChecklistLiberacaoItem_(1, "Rodar TESTE_FLASH_CONTAGEM_SEM_GRAVAR antes.", "OBRIGATORIO", false),
    finExtratoFlashChecklistLiberacaoItem_(2, "Conferir baseline do pacote.", pacoteOk ? "DISPONIVEL" : "BLOQUEADO", !!pacoteOk),
    finExtratoFlashChecklistLiberacaoItem_(3, "Conferir loteId, arquivoHash, totais e periodo.", pacoteOk ? "DISPONIVEL" : "BLOQUEADO", !!pacoteOk),
    finExtratoFlashChecklistLiberacaoItem_(4, "Conferir frase obrigatoria.", "AUTORIZO IMPORTACAO REAL FLASH", true),
    finExtratoFlashChecklistLiberacaoItem_(5, "Preencher usuarioResponsavel e timestampAutorizacao manualmente.", "PENDENTE_MANUAL", false),
    finExtratoFlashChecklistLiberacaoItem_(6, "Executar somente em /dev e registrar evidencia.", "OBRIGATORIO_DEV", false),
    finExtratoFlashChecklistLiberacaoItem_(7, "Nao executar pela UI; tela apenas gera pacote.", "UI_NAO_EXECUTA", true)
  ];
}

function auditarPacoteJFlashV1_SEM_GRAVAR() {
  var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
  var confirmacaoBloqueada = finConfirmarLoteExtratoFlashV1_BLOQUEADA({});
  var importacaoBloqueada = finImportarLoteExtratoFlashV1_BLOQUEADA({});
  var bloqueios = [];
  var funcoes = {
    dryRun: typeof finDryRunLoteExtratoFlashV1 === "function",
    preConfirmacao: typeof finPreConfirmarLoteExtratoFlashV1 === "function",
    prepararPayload: typeof finPrepararPayloadImportacaoFlashV1 === "function",
    importacaoBloqueada: typeof finImportarLoteExtratoFlashV1_BLOQUEADA === "function",
    auditoriaCompacta: typeof auditarContagemExtratoFlashV1_SEM_GRAVAR === "function"
  };

  for (var nome in funcoes) {
    if (Object.prototype.hasOwnProperty.call(funcoes, nome) && !funcoes[nome]) {
      bloqueios.push("Funcao indisponivel no Pacote J: " + nome + ".");
    }
  }
  if (!contagem || contagem.ok !== true) bloqueios.push("Auditoria compacta de contagem nao retornou ok:true.");
  if (!confirmacaoBloqueada || confirmacaoBloqueada.ok !== false || confirmacaoBloqueada.executado !== false) {
    bloqueios.push("Confirmacao real nao retornou bloqueio seguro.");
  }
  if (!importacaoBloqueada || importacaoBloqueada.ok !== false || importacaoBloqueada.executado !== false) {
    bloqueios.push("Importacao real nao retornou bloqueio seguro.");
  }

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PACOTE_J_FLASH_V1",
    totalLotesLidos: contagem ? contagem.totalLotesLidos : 0,
    totalExtratosLidos: contagem ? contagem.totalExtratosLidos : 0,
    funcoesDisponiveis: funcoes,
    confirmacaoRealBloqueada: !!(confirmacaoBloqueada && confirmacaoBloqueada.ok === false && confirmacaoBloqueada.executado === false),
    importacaoRealBloqueada: !!(importacaoBloqueada && importacaoBloqueada.ok === false && importacaoBloqueada.executado === false),
    nenhumaGravacao: true,
    bloqueios: bloqueios,
    avisos: contagem && contagem.avisos ? contagem.avisos : []
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

function auditarPreConfirmacaoLoteExtratoFlashV1_SEM_GRAVAR() {
  var bloqueiosAmbiente = [];
  var leitura = finExtratoFlashLerDadosDuplicidadeReais_(bloqueiosAmbiente);
  var dryRun = testarDryRunLoteExtratoFlashV1_SEM_GRAVAR();
  var preConfirmacao = finPreConfirmarLoteExtratoFlashV1(dryRun);
  var confirmacaoBloqueada = finConfirmarLoteExtratoFlashV1_BLOQUEADA({});
  var resultado = {
    success: !!(
      preConfirmacao &&
      preConfirmacao.executado === false &&
      preConfirmacao.gravacaoReal === false &&
      confirmacaoBloqueada &&
      confirmacaoBloqueada.executado === false &&
      confirmacaoBloqueada.gravacaoReal === false &&
      confirmacaoBloqueada.ok === false
    ),
    ok: !!(
      preConfirmacao &&
      preConfirmacao.executado === false &&
      preConfirmacao.gravacaoReal === false &&
      confirmacaoBloqueada &&
      confirmacaoBloqueada.executado === false &&
      confirmacaoBloqueada.gravacaoReal === false &&
      confirmacaoBloqueada.ok === false
    ),
    executado: false,
    modo: "AUDITORIA_PRE_CONFIRMACAO_LOTE_EXTRATO_FLASH_V1",
    mensagem: "Auditoria somente leitura. Nenhuma gravacao foi realizada.",
    ambiente: {
      abasConsultadas: leitura.abas || {},
      totalLotesLidos: leitura.lotes ? leitura.lotes.length : 0,
      totalExtratosLidos: leitura.extratos ? leitura.extratos.length : 0,
      headers: leitura.headers || {},
      bloqueios: bloqueiosAmbiente
    },
    funcoesDisponiveis: {
      dryRun: typeof finDryRunLoteExtratoFlashV1 === "function",
      preConfirmacao: typeof finPreConfirmarLoteExtratoFlashV1 === "function",
      confirmacaoRealBloqueada: typeof finConfirmarLoteExtratoFlashV1_BLOQUEADA === "function"
    },
    preConfirmacao: preConfirmacao,
    confirmacaoBloqueada: confirmacaoBloqueada,
    avisos: [
      "Pre-confirmacao validada em modo seguro.",
      "Confirmacao real permanece bloqueada."
    ],
    bloqueios: []
  };

  if (!resultado.success) {
    resultado.bloqueios.push("Auditoria de pre-confirmacao nao comprovou retorno seguro.");
  }
  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado, null, 2));
  }

  return resultado;
}

function finExtratoFlashObterDryRunPreConfirmacao_(payload, avisos, bloqueios) {
  var entrada = payload || {};
  if (
    entrada.modo === FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1 &&
    entrada.executado === false &&
    entrada.loteProposto
  ) {
    return entrada;
  }

  avisos.push("Pre-confirmacao gerou dry-run em memoria antes da avaliacao. Nenhuma gravacao foi realizada.");
  var dryRun = finDryRunLoteExtratoFlashV1(entrada);
  if (!dryRun || dryRun.modo !== FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1) {
    bloqueios.push("Nao foi possivel obter dry-run valido para pre-confirmacao.");
    return null;
  }
  return dryRun;
}

function finExtratoFlashAvaliarPreConfirmacao_(dryRun, checklist, motivos, avisos, bloqueios) {
  if (!dryRun) {
    checklist.push(finExtratoFlashItemChecklistPreConfirmacao_("Dry-run disponivel", false, "Sem dry-run valido."));
    return;
  }

  var lote = dryRun.loteProposto || null;
  var resumo = dryRun.resumoGerencial || {};
  var duplicidades = dryRun.duplicidades || finExtratoFlashDuplicidadesVazias_();
  var lancamentos = dryRun.lancamentosDryRun || [];
  var bloqueiosDryRun = dryRun.bloqueios || [];
  var avisosDryRun = dryRun.avisos || [];

  finExtratoFlashChecklistPreConfirmacao_(checklist, "Dry-run seguro", dryRun.executado === false, "Dry-run retornou executado:false.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Modo correto", dryRun.modo === FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1, "Modo do dry-run confere.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Sem gravacao real", dryRun.gravacaoReal !== true, "Nenhuma flag de gravacao real encontrada.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Lote proposto presente", !!lote, "Lote proposto disponivel para avaliacao.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Lancamentos presentes", lancamentos.length > 0, "Ha lancamentos para avaliar.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Sem bloqueios de dry-run", bloqueiosDryRun.length === 0, "Dry-run nao retornou bloqueios.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Leitura de duplicidades executada", !!duplicidades.leituraAbasExecutada, "Duplicidades reais foram consultadas quando ambiente permitiu.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Lote nao duplicado", duplicidades.lotePossivelmenteDuplicado !== true, "Lote nao encontrado como duplicado.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Lancamentos nao duplicados", Number(duplicidades.totalPossiveisDuplicados || 0) === 0, "Nenhum lancamento duplicado encontrado.");

  if (dryRun.executado !== false) bloqueios.push("Dry-run nao retornou executado:false.");
  if (dryRun.modo !== FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1) bloqueios.push("Modo do dry-run invalido para pre-confirmacao.");
  if (dryRun.gravacaoReal === true) bloqueios.push("Dry-run indicou gravacaoReal:true, pre-confirmacao bloqueada.");
  if (!lote) bloqueios.push("Lote proposto ausente.");
  if (!lancamentos.length) bloqueios.push("Nenhum lancamento disponivel para pre-confirmacao.");
  for (var b = 0; b < bloqueiosDryRun.length; b++) {
    bloqueios.push("Bloqueio do dry-run: " + bloqueiosDryRun[b]);
  }

  finExtratoFlashAvaliarLotePreConfirmacao_(lote, resumo, motivos, bloqueios);
  finExtratoFlashAvaliarLancamentosPreConfirmacao_(lancamentos, motivos, bloqueios);
  finExtratoFlashAvaliarDuplicidadesPreConfirmacao_(duplicidades, motivos, bloqueios);

  if (avisosDryRun.length) {
    motivos.push("Dry-run possui " + avisosDryRun.length + " aviso(s) que exigem revisao visual antes de confirmacao futura.");
  }
  for (var a = 0; a < avisosDryRun.length; a++) {
    avisos.push("Aviso do dry-run: " + avisosDryRun[a]);
  }
}

function finExtratoFlashAvaliarLotePreConfirmacao_(lote, resumo, motivos, bloqueios) {
  if (!lote) return;
  if (!lote.arquivoHash) bloqueios.push("Lote sem arquivoHash seguro.");
  if (!lote.periodoInicio || !lote.periodoFim) bloqueios.push("Lote sem periodo completo.");
  if (!lote.totalLancamentos || Number(lote.totalLancamentos) <= 0) bloqueios.push("Lote sem totalLancamentos positivo.");
  if (!lote.pessoa) motivos.push("Lote sem pessoa unica definida.");
  if (!lote.finalCartao) motivos.push("Lote sem finalCartao unico definido.");

  var saldoCalculado = finExtratoFlashArredondar_(Number(lote.somaDebitos || 0) + Number(lote.somaCreditos || 0));
  if (saldoCalculado !== Number(lote.saldoLiquido || 0)) {
    bloqueios.push("Lote com saldoLiquido divergente de somaDebitos + somaCreditos.");
  }
  if (resumo && resumo.totalLancamentos !== undefined && Number(resumo.totalLancamentos || 0) !== Number(lote.totalLancamentos || 0)) {
    bloqueios.push("Resumo gerencial diverge do total de lancamentos do lote.");
  }
}

function finExtratoFlashAvaliarLancamentosPreConfirmacao_(lancamentos, motivos, bloqueios) {
  var bloqueados = 0;
  var duplicados = 0;
  var semCartao = 0;
  var valorSomado = 0;

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i] || {};
    if (item.statusDryRun === "BLOQUEADO") bloqueados++;
    if (item.statusDryRun === "POSSIVEL_DUPLICADO") duplicados++;
    if (!item.dataIso || item.valorNumero === null || item.valorNumero === undefined || !item.pessoa) {
      bloqueios.push("Lancamento linha " + (item.linhaOrigem || "?") + " sem data, valor ou pessoa.");
    }
    if (item.sinal === "DEBITO" && !item.finalCartao) semCartao++;
    valorSomado += Number(item.valorNumero || 0);
  }

  if (bloqueados) bloqueios.push("Ha " + bloqueados + " lancamento(s) bloqueado(s) no dry-run.");
  if (duplicados) bloqueios.push("Ha " + duplicados + " lancamento(s) com possivel duplicidade.");
  if (semCartao) motivos.push("Ha " + semCartao + " debito(s) sem final de cartao unico.");
  if (!lancamentos.length) bloqueios.push("Lista de lancamentos vazia.");
  motivos.push("Saldo calculado dos lancamentos: " + finExtratoFlashArredondar_(valorSomado));
}

function finExtratoFlashAvaliarDuplicidadesPreConfirmacao_(duplicidades, motivos, bloqueios) {
  var dups = duplicidades || finExtratoFlashDuplicidadesVazias_();
  if (dups.lotePossivelmenteDuplicado === true) {
    bloqueios.push("Lote possivelmente duplicado em dados existentes.");
  }
  if (Number(dups.totalPossiveisDuplicados || 0) > 0) {
    bloqueios.push("Ha " + Number(dups.totalPossiveisDuplicados || 0) + " lancamento(s) possivelmente duplicado(s).");
  }
  if (!dups.leituraAbasExecutada) {
    motivos.push("Duplicidade real nao foi confirmada por leitura de abas; revisar ambiente antes de confirmacao futura.");
  }
}

function finExtratoFlashDecisaoPreConfirmacao_(motivos, bloqueios) {
  if (bloqueios && bloqueios.length) return "BLOQUEADO";
  if (motivos && motivos.length) return "REQUER_REVISAO";
  return "APTO_PARA_CONFIRMACAO_FUTURA";
}

function finExtratoFlashChecklistPreConfirmacao_(checklist, nome, ok, detalhe) {
  checklist.push(finExtratoFlashItemChecklistPreConfirmacao_(nome, ok, detalhe));
}

function finExtratoFlashItemChecklistPreConfirmacao_(nome, ok, detalhe) {
  return {
    item: nome,
    ok: !!ok,
    detalhe: detalhe || ""
  };
}

function finExtratoFlashObterDryRunPreparacao_(payload, avisos, bloqueios) {
  var entrada = payload || {};
  if (entrada.modo === FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1 && entrada.dryRun) {
    return entrada.dryRun;
  }
  if (entrada.modo === FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1 && entrada.executado === false) {
    return entrada;
  }
  if (entrada.dryRun && entrada.dryRun.modo === FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1) {
    return entrada.dryRun;
  }

  avisos.push("Preparacao gerou dry-run em memoria antes de montar payload futuro. Nenhuma gravacao foi realizada.");
  var dryRun = finDryRunLoteExtratoFlashV1(entrada);
  if (!dryRun || dryRun.modo !== FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1) {
    bloqueios.push("Dry-run valido nao foi obtido para preparacao do payload.");
    return null;
  }
  return dryRun;
}

function finExtratoFlashObterPreConfirmacaoPreparacao_(payload, dryRun, avisos, bloqueios) {
  var entrada = payload || {};
  if (entrada.modo === FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1 && entrada.executado === false) {
    return entrada;
  }

  avisos.push("Preparacao avaliou pre-confirmacao em memoria. Nenhuma gravacao foi realizada.");
  var preConfirmacao = finPreConfirmarLoteExtratoFlashV1(dryRun || entrada);
  if (!preConfirmacao || preConfirmacao.modo !== FIN_EXTRATO_FLASH_MODO_PRE_CONFIRMACAO_V1) {
    bloqueios.push("Pre-confirmacao valida nao foi obtida para preparacao do payload.");
    return null;
  }
  return preConfirmacao;
}

function finExtratoFlashMontarLoteParaGravacaoFutura_(dryRun) {
  var lote = dryRun && dryRun.loteProposto ? dryRun.loteProposto : null;
  if (!lote) return null;
  return {
    loteId: lote.loteId || "",
    origem: lote.origem || "FLASH",
    arquivoNome: lote.arquivoNome || "",
    arquivoHash: lote.arquivoHash || "",
    periodoInicio: lote.periodoInicio || "",
    periodoFim: lote.periodoFim || "",
    pessoa: lote.pessoa || "",
    finalCartao: lote.finalCartao || "",
    totalLancamentos: Number(lote.totalLancamentos || 0),
    totalDebitos: Number(lote.totalDebitos || 0),
    totalCreditos: Number(lote.totalCreditos || 0),
    somaDebitos: finExtratoFlashArredondar_(Number(lote.somaDebitos || 0)),
    somaCreditos: finExtratoFlashArredondar_(Number(lote.somaCreditos || 0)),
    saldoLiquido: finExtratoFlashArredondar_(Number(lote.saldoLiquido || 0)),
    chaveLote: finExtratoFlashChaveLote_(lote),
    statusProposto: "BLOQUEADO_AGUARDANDO_CHAVE_TECNICA",
    observacao: "Payload preparado sem gravacao real."
  };
}

function finExtratoFlashMontarExtratosParaGravacaoFutura_(dryRun) {
  var lancamentos = dryRun && dryRun.lancamentosDryRun ? dryRun.lancamentosDryRun : [];
  var lote = dryRun && dryRun.loteProposto ? dryRun.loteProposto : {};
  var saida = [];
  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i] || {};
    saida.push({
      extratoIdProposto: "EXT-FLASH-PREVIEW-" + finExtratoFlashHashCurto_((lote.loteId || "") + "|" + (item.chaveDuplicidade || "") + "|" + i),
      loteId: lote.loteId || "",
      arquivoHash: lote.arquivoHash || "",
      dataIso: item.dataIso || "",
      dataOriginal: item.dataOriginal || "",
      valorNumero: item.valorNumero,
      sinal: item.sinal || "",
      pessoa: item.pessoa || "",
      descricaoLimpa: item.descricaoLimpa || "",
      movimentacaoOriginal: item.movimentacaoOriginal || "",
      pagamentoOriginal: item.pagamentoOriginal || "",
      finalCartao: item.finalCartao || "",
      statusPrestacao: item.statusPrestacaoNormalizado || item.statusPrestacaoOriginal || "",
      categoriaInferida: item.categoriaInferida || "",
      chaveDuplicidade: item.chaveDuplicidade || finExtratoFlashChaveLancamento_(item),
      statusDryRun: item.statusDryRun || "",
      linhaOrigem: item.linhaOrigem || ""
    });
  }
  return saida;
}

function finExtratoFlashChecklistPreparacao_(dryRun, preConfirmacao, lote, extratos, pendencias, checklist, avisos, bloqueios) {
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Dry-run aprovado", !!(dryRun && dryRun.ok === true && dryRun.executado === false), "Dry-run precisa estar ok e sem gravacao.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Pre-confirmacao avaliada", !!(preConfirmacao && preConfirmacao.ok === true && preConfirmacao.executado === false), "Pre-confirmacao precisa retornar executado:false.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Lote preparado", !!lote, "Lote futuro montado em memoria.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Extratos preparados", !!(extratos && extratos.length), "Extratos futuros montados em memoria.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Chave tecnica exigida", true, "Importacao real segue bloqueada ate autorizacao explicita.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Sem duplicidade real", !(dryRun && dryRun.duplicidades && (dryRun.duplicidades.lotePossivelmenteDuplicado || Number(dryRun.duplicidades.totalPossiveisDuplicados || 0) > 0)), "Duplicidades bloqueiam a importacao futura.");
  finExtratoFlashChecklistPreConfirmacao_(checklist, "Pendencias operacionais mapeadas", true, "Depositos, recargas e prestacao pendente exigem decisao operacional.");

  if (!dryRun || dryRun.ok !== true) bloqueios.push("Dry-run nao esta aprovado para preparacao do payload.");
  if (!preConfirmacao || preConfirmacao.ok !== true) bloqueios.push("Pre-confirmacao nao esta aprovada para preparacao do payload.");
  if (pendencias && pendencias.totalDepositosRecargas) avisos.push("Ha deposito ou recarga: exige decisao operacional antes de liberacao futura.");
  if (pendencias && pendencias.totalPrestacaoPendente) avisos.push("Ha prestacao pendente: exige decisao operacional antes de liberacao futura.");
}

function finExtratoFlashValidarPayloadPreparado_(lote, extratos, dryRun, preConfirmacao, pendencias, bloqueios, avisos) {
  if (!lote) bloqueios.push("Payload sem loteParaGravacao.");
  if (!extratos || !extratos.length) bloqueios.push("Payload sem extratosParaGravacao.");
  if (preConfirmacao && preConfirmacao.decisao === "BLOQUEADO") bloqueios.push("Pre-confirmacao retornou BLOQUEADO.");
  if (dryRun && dryRun.bloqueios && dryRun.bloqueios.length) bloqueios.push("Dry-run possui bloqueios ativos.");
  if (preConfirmacao && preConfirmacao.bloqueios && preConfirmacao.bloqueios.length) bloqueios.push("Pre-confirmacao possui bloqueios ativos.");
  if (dryRun && dryRun.duplicidades && dryRun.duplicidades.lotePossivelmenteDuplicado) bloqueios.push("Lote possivelmente duplicado.");
  if (dryRun && dryRun.duplicidades && Number(dryRun.duplicidades.totalPossiveisDuplicados || 0) > 0) bloqueios.push("Lancamentos possivelmente duplicados.");

  if (lote) {
    if (!lote.arquivoHash) bloqueios.push("Lote preparado sem arquivoHash.");
    if (!lote.periodoInicio || !lote.periodoFim) bloqueios.push("Lote preparado sem periodo completo.");
    if (!lote.totalLancamentos || Number(lote.totalLancamentos) !== (extratos ? extratos.length : 0)) bloqueios.push("Total do lote nao bate com extratos preparados.");
    if (finExtratoFlashArredondar_(Number(lote.somaDebitos || 0) + Number(lote.somaCreditos || 0)) !== Number(lote.saldoLiquido || 0)) {
      bloqueios.push("Totais financeiros do lote preparado nao batem.");
    }
  }

  for (var i = 0; i < (extratos || []).length; i++) {
    var item = extratos[i] || {};
    if (!item.chaveDuplicidade) bloqueios.push("Extrato preparado sem chaveDuplicidade na posicao " + (i + 1) + ".");
    if (!item.dataIso) bloqueios.push("Extrato preparado sem dataIso na posicao " + (i + 1) + ".");
    if (item.valorNumero === null || item.valorNumero === undefined) bloqueios.push("Extrato preparado sem valorNumero na posicao " + (i + 1) + ".");
    if (item.sinal === "DEBITO" && !item.finalCartao) bloqueios.push("Debito preparado sem finalCartao na posicao " + (i + 1) + ".");
  }

  if (pendencias && pendencias.totalDepositosRecargas) avisos.push("Depositos/recargas mantem decisao REQUER_REVISAO.");
  if (pendencias && pendencias.totalPrestacaoPendente) avisos.push("Prestacao pendente mantem decisao REQUER_REVISAO.");
}

function finExtratoFlashResumoPayloadPreparado_(lote, extratos, pendencias) {
  var lista = extratos || [];
  var soma = 0;
  for (var i = 0; i < lista.length; i++) {
    soma += Number(lista[i].valorNumero || 0);
  }
  return {
    totalLotesQueSeriamGravados: lote ? 1 : 0,
    totalExtratosQueSeriamGravados: lista.length,
    totalLancamentos: lote ? Number(lote.totalLancamentos || 0) : lista.length,
    somaValores: finExtratoFlashArredondar_(soma),
    saldoLiquidoLote: lote ? lote.saldoLiquido : 0,
    totalDepositosRecargas: pendencias ? pendencias.totalDepositosRecargas : 0,
    totalPrestacaoPendente: pendencias ? pendencias.totalPrestacaoPendente : 0,
    totalCategoriaNaoInferida: pendencias ? pendencias.totalCategoriaNaoInferida : 0
  };
}

function finExtratoFlashDetectarPendenciasOperacionais_(lancamentos) {
  var lista = lancamentos || [];
  var depositos = [];
  var pendentes = [];
  var categorias = [];
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i] || {};
    var descricao = finExtratoFlashTexto_(item.descricaoLimpa || item.movimentacaoOriginal).toUpperCase();
    var status = finExtratoFlashTexto_(item.statusPrestacaoNormalizado || item.statusPrestacaoOriginal).toUpperCase();
    var categoria = finExtratoFlashTexto_(item.categoriaInferida).toUpperCase();
    if (item.sinal === "CREDITO" || descricao.indexOf("DEPOSITO") >= 0 || descricao.indexOf("DEPÓSITO") >= 0 || descricao.indexOf("RECARGA") >= 0) {
      depositos.push({ linhaOrigem: item.linhaOrigem || "", descricao: item.descricaoLimpa || item.movimentacaoOriginal || "", valorNumero: item.valorNumero });
    }
    if (status.indexOf("PENDENTE") >= 0) {
      pendentes.push({ linhaOrigem: item.linhaOrigem || "", descricao: item.descricaoLimpa || item.movimentacaoOriginal || "", statusPrestacao: status });
    }
    if (categoria === "OUTRO" || categoria === "OUTROS" || categoria === "NAO_INFERIDA") {
      categorias.push({ linhaOrigem: item.linhaOrigem || "", descricao: item.descricaoLimpa || item.movimentacaoOriginal || "", categoriaInferida: item.categoriaInferida || "" });
    }
  }
  return {
    totalDepositosRecargas: depositos.length,
    totalPrestacaoPendente: pendentes.length,
    totalCategoriaNaoInferida: categorias.length,
    depositosRecargas: depositos,
    prestacoesPendentes: pendentes,
    categoriasNaoInferidas: categorias,
    bloqueiaImportacaoRealFutura: !!(depositos.length || pendentes.length || categorias.length)
  };
}

function finExtratoFlashPendenciasOperacionaisVazias_() {
  return {
    totalDepositosRecargas: 0,
    totalPrestacaoPendente: 0,
    totalCategoriaNaoInferida: 0,
    depositosRecargas: [],
    prestacoesPendentes: [],
    categoriasNaoInferidas: [],
    bloqueiaImportacaoRealFutura: false
  };
}

function finExtratoFlashNormalizarDecisoesOperacionais_(decisoes) {
  var entrada = decisoes || {};
  var explicitas = !!decisoes;
  var valores = {
    depositosRecargas: finExtratoFlashTexto_(entrada.depositosRecargas || entrada.depositoRecarga || "IMPORTAR_CREDITO_COMO_EXTRATO"),
    prestacaoPendente: finExtratoFlashTexto_(entrada.prestacaoPendente || "IMPORTAR_COM_STATUS_PENDENTE"),
    categoriaNaoInferida: finExtratoFlashTexto_(entrada.categoriaNaoInferida || "IMPORTAR_COM_CATEGORIA_OUTROS")
  };
  var mapaDepositos = {
    IMPORTAR_CREDITO_COMO_EXTRATO: true,
    IGNORAR_CREDITO_USAR_RECARGAS: true,
    BLOQUEAR_CREDITOS: true,
    OPCAO_A_IMPORTAR_CREDITO_COMO_EXTRATO: "IMPORTAR_CREDITO_COMO_EXTRATO",
    OPCAO_B_IGNORAR_CREDITO_E_USAR_RECARGAS: "IGNORAR_CREDITO_USAR_RECARGAS",
    OPCAO_C_BLOQUEAR_ENQUANTO_NAO_CLASSIFICAR: "BLOQUEAR_CREDITOS"
  };
  var mapaPrestacao = {
    IMPORTAR_COM_STATUS_PENDENTE: true,
    BLOQUEAR_ATE_PRESTACAO: true,
    IMPORTAR_E_GERAR_PENDENCIA_FUTURA: true,
    IMPORTAR_E_GERAR_PENDENCIA: "IMPORTAR_E_GERAR_PENDENCIA_FUTURA"
  };
  var mapaCategoria = {
    IMPORTAR_COM_CATEGORIA_OUTROS: true,
    BLOQUEAR_ATE_CLASSIFICAR: true
  };
  var bloqueios = [];
  var avisos = [];

  valores.depositosRecargas = mapaDepositos[valores.depositosRecargas] === true ? valores.depositosRecargas : (mapaDepositos[valores.depositosRecargas] || valores.depositosRecargas);
  valores.prestacaoPendente = mapaPrestacao[valores.prestacaoPendente] === true ? valores.prestacaoPendente : (mapaPrestacao[valores.prestacaoPendente] || valores.prestacaoPendente);

  if (!mapaDepositos[valores.depositosRecargas]) bloqueios.push("Decisao invalida para depositos/recargas: " + valores.depositosRecargas + ".");
  if (!mapaPrestacao[valores.prestacaoPendente]) bloqueios.push("Decisao invalida para prestacao pendente: " + valores.prestacaoPendente + ".");
  if (!mapaCategoria[valores.categoriaNaoInferida]) bloqueios.push("Decisao invalida para categoria nao inferida: " + valores.categoriaNaoInferida + ".");
  if (!explicitas) avisos.push("Decisoes operacionais padrao carregadas para auditoria; preparacao sem payload explicito continua requerendo revisao.");

  return {
    validas: bloqueios.length === 0,
    explicitas: explicitas,
    valores: valores,
    bloqueios: bloqueios,
    avisos: avisos
  };
}

function finExtratoFlashAplicarDecisoesOperacionais_(pendencias, extratos, decisoes, avisos, bloqueios) {
  var p = pendencias || finExtratoFlashPendenciasOperacionaisVazias_();
  var d = decisoes || finExtratoFlashNormalizarDecisoesOperacionais_(null);
  var lista = extratos || [];
  var tratados = [];
  var avisosOperacionais = [];

  if (d.bloqueios && d.bloqueios.length) {
    for (var iBloq = 0; iBloq < d.bloqueios.length; iBloq++) bloqueios.push(d.bloqueios[iBloq]);
  }

  if (!d.explicitas) {
    if (p.bloqueiaImportacaoRealFutura) avisosOperacionais.push("Pendencias operacionais exigem decisoes explicitas para liberar payload tecnico.");
    return { aplicadas: false, resolvidas: false, itensTratados: tratados, avisos: avisosOperacionais };
  }

  if (p.totalDepositosRecargas > 0) {
    if (d.valores.depositosRecargas === "BLOQUEAR_CREDITOS") {
      bloqueios.push("Decisao operacional escolhida bloqueia creditos/depositos/recargas.");
    } else {
      tratados.push({ tipo: "DEPOSITOS_RECARGAS", decisao: d.valores.depositosRecargas, quantidade: p.totalDepositosRecargas });
      avisosOperacionais.push("Depositos/recargas tratados por decisao: " + d.valores.depositosRecargas + ".");
    }
  }

  if (p.totalPrestacaoPendente > 0) {
    if (d.valores.prestacaoPendente === "BLOQUEAR_ATE_PRESTACAO") {
      bloqueios.push("Decisao operacional escolhida bloqueia prestacao pendente.");
    } else {
      tratados.push({ tipo: "PRESTACAO_PENDENTE", decisao: d.valores.prestacaoPendente, quantidade: p.totalPrestacaoPendente });
      avisosOperacionais.push("Prestacoes pendentes tratadas por decisao: " + d.valores.prestacaoPendente + ".");
    }
  }

  if (p.totalCategoriaNaoInferida > 0) {
    if (d.valores.categoriaNaoInferida === "BLOQUEAR_ATE_CLASSIFICAR") {
      bloqueios.push("Decisao operacional escolhida bloqueia categoria nao inferida.");
    } else {
      for (var i = 0; i < lista.length; i++) {
        var item = lista[i] || {};
        if (finExtratoFlashTexto_(item.categoriaInferida).toUpperCase() === "OUTRO") {
          item.categoriaInferida = "OUTROS_REVISAR";
        }
      }
      tratados.push({ tipo: "CATEGORIA_NAO_INFERIDA", decisao: d.valores.categoriaNaoInferida, quantidade: p.totalCategoriaNaoInferida });
      avisosOperacionais.push("Categorias nao inferidas tratadas como OUTROS_REVISAR.");
    }
  }

  var resolvidas = d.validas && bloqueios.length === 0 && (
    p.bloqueiaImportacaoRealFutura ? tratados.length > 0 : true
  );
  if (resolvidas) {
    p.bloqueiaImportacaoRealFutura = false;
  }
  for (var j = 0; j < avisosOperacionais.length; j++) avisos.push(avisosOperacionais[j]);
  return { aplicadas: d.validas, resolvidas: resolvidas, itensTratados: tratados, avisos: avisosOperacionais };
}

function finExtratoFlashDecisaoPayloadPreparado_(bloqueios, pendencias) {
  if (bloqueios && bloqueios.length) return "BLOQUEADO";
  if (pendencias && pendencias.bloqueiaImportacaoRealFutura) return "REQUER_REVISAO";
  return "APTO_TECNICAMENTE_BLOQUEADO_POR_CHAVE";
}

function finExtratoFlashPlanoGravacaoFuturo_() {
  return {
    abasDestino: [
      FIN_EXTRATO_FLASH_ABA_LOTES_V1,
      FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1
    ],
    operacoesPlanejadas: [
      "auditoriaAntes",
      "inserirLote",
      "inserirExtratos",
      "auditoriaDepois"
    ],
    camposObrigatoriosPorAba: {
      FIN_LOTES_EXTRATO_FLASH: ["LOTE_ID", "ARQUIVO_HASH", "PERIODO_INICIO", "PERIODO_FIM", "PESSOA", "TOTAL_LANCAMENTOS", "SOMA_DEBITOS", "SOMA_CREDITOS", "CHAVE_LOTE"],
      FIN_CARTOES_EXTRATOS: ["EXTRATO_ID", "LOTE_ID", "DATA_TRANSACAO", "VALOR", "ESTABELECIMENTO_EXTRATO", "CARTAO_FINAL", "ARQUIVO_HASH", "CHAVE_DUPLICIDADE"]
    },
    camposPendentesDeDecisao: [
      "depositoRecarga",
      "prestacaoPendente",
      "rollbackCancelamento"
    ],
    riscos: [
      "duplicidade de lote",
      "duplicidade de lancamento",
      "deposito ou recarga sem tratamento operacional",
      "prestacao pendente sem decisao operacional"
    ],
    travasObrigatorias: [
      "chaveTecnica",
      "dryRunAprovado",
      "preConfirmacaoAprovada",
      "payloadPreparado",
      "auditoriaAntes",
      "auditoriaDepois"
    ]
  };
}

function finExtratoFlashPrepararPacoteImportacaoReal_(payload, preparado, avisos, bloqueios) {
  if (!preparado || preparado.ok !== true) {
    bloqueios.push("Payload preparado nao esta ok para importacao real.");
    return { linhaLote: null, linhasExtratos: [], headersLote: [], headersExtratos: [] };
  }
  if (!preparado.loteParaGravacao) bloqueios.push("Payload preparado sem loteParaGravacao.");
  if (!preparado.extratosParaGravacao || !preparado.extratosParaGravacao.length) bloqueios.push("Payload preparado sem extratosParaGravacao.");
  if (preparado.decisao === "BLOQUEADO") bloqueios.push("Payload preparado retornou decisao BLOQUEADO.");
  return {
    linhaLote: null,
    linhasExtratos: [],
    headersLote: [],
    headersExtratos: [],
    preparado: preparado
  };
}

function finExtratoFlashCompletarPacoteLinhasImportacao_(pacote, contexto, payload) {
  if (!pacote || !pacote.preparado || !contexto) return pacote;
  var usuario = finExtratoFlashTexto_(
    payload && payload.autorizacaoTecnica ? payload.autorizacaoTecnica.usuarioResponsavel : ""
  );
  var lote = pacote.preparado.loteParaGravacao;
  var extratos = pacote.preparado.extratosParaGravacao || [];
  pacote.headersLote = contexto.headersLote || [];
  pacote.headersExtratos = contexto.headersExtratos || [];
  pacote.linhaLote = lote ? finExtratoFlashMontarLinhaLoteParaGravacao_(lote, pacote.headersLote, usuario) : null;
  pacote.linhasExtratos = [];
  for (var i = 0; i < extratos.length; i++) {
    pacote.linhasExtratos.push(finExtratoFlashMontarLinhaExtratoParaGravacao_(extratos[i], pacote.headersExtratos, usuario));
  }
  return pacote;
}

function finExtratoFlashValidarAutorizacaoTecnicaFlash_(autorizacao, preparado, bloqueios) {
  var a = autorizacao || {};
  var lote = preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao : {};
  if (a.liberarImportacaoReal !== true) bloqueios.push("Autorizacao tecnica ausente: liberarImportacaoReal deve ser true.");
  if (finExtratoFlashTexto_(a.frase) !== "AUTORIZO IMPORTACAO REAL FLASH") bloqueios.push("Frase de autorizacao tecnica invalida.");
  if (!finExtratoFlashTexto_(a.usuarioResponsavel)) bloqueios.push("usuarioResponsavel obrigatorio na autorizacao tecnica.");
  if (!finExtratoFlashTexto_(a.timestampAutorizacao)) bloqueios.push("timestampAutorizacao obrigatorio na autorizacao tecnica.");
  if (finExtratoFlashTexto_(a.loteIdEsperado) !== finExtratoFlashTexto_(lote.loteId)) bloqueios.push("loteIdEsperado diverge do lote preparado.");
  if (finExtratoFlashTexto_(a.arquivoHashEsperado) !== finExtratoFlashTexto_(lote.arquivoHash)) bloqueios.push("arquivoHashEsperado diverge do lote preparado.");
  if (Number(a.totalLancamentosEsperado || 0) !== Number(lote.totalLancamentos || 0)) bloqueios.push("totalLancamentosEsperado diverge do lote preparado.");
  if (finExtratoFlashArredondar_(a.somaDebitosEsperada) !== finExtratoFlashArredondar_(lote.somaDebitos)) bloqueios.push("somaDebitosEsperada diverge do lote preparado.");
  if (finExtratoFlashArredondar_(a.somaCreditosEsperada) !== finExtratoFlashArredondar_(lote.somaCreditos)) bloqueios.push("somaCreditosEsperada diverge do lote preparado.");
}

function finExtratoFlashValidarDecisoesOperacionaisFlash_(decisoes, pendencias, bloqueios, avisos) {
  var d = finExtratoFlashNormalizarDecisoesOperacionais_(decisoes);
  var p = pendencias || finExtratoFlashPendenciasOperacionaisVazias_();
  if (d.bloqueios && d.bloqueios.length) {
    for (var i = 0; i < d.bloqueios.length; i++) bloqueios.push(d.bloqueios[i]);
  }

  if (p.totalDepositosRecargas > 0) {
    if (!d.explicitas) {
      bloqueios.push("Decisao operacional obrigatoria para deposito/recarga ausente ou invalida.");
    }
    if (d.valores.depositosRecargas === "BLOQUEAR_CREDITOS") {
      bloqueios.push("Decisao operacional escolhida bloqueia deposito/recarga.");
    }
    avisos.push("Deposito/recarga possui decisao operacional: " + finExtratoFlashTexto_(d.valores.depositosRecargas || "AUSENTE") + ".");
  }

  if (p.totalPrestacaoPendente > 0) {
    if (!d.explicitas) {
      bloqueios.push("Decisao operacional obrigatoria para prestacao pendente ausente ou invalida.");
    }
    if (d.valores.prestacaoPendente === "BLOQUEAR_ATE_PRESTACAO") {
      bloqueios.push("Decisao operacional escolhida bloqueia prestacao pendente.");
    }
    avisos.push("Prestacao pendente possui decisao operacional: " + finExtratoFlashTexto_(d.valores.prestacaoPendente || "AUSENTE") + ".");
  }

  if (p.totalCategoriaNaoInferida > 0) {
    if (!d.explicitas) {
      bloqueios.push("Decisao operacional obrigatoria para categoria nao inferida ausente ou invalida.");
    }
    if (d.valores.categoriaNaoInferida === "BLOQUEAR_ATE_CLASSIFICAR") {
      bloqueios.push("Decisao operacional escolhida bloqueia categoria nao inferida.");
    }
    avisos.push("Categoria nao inferida possui decisao operacional: " + finExtratoFlashTexto_(d.valores.categoriaNaoInferida || "AUSENTE") + ".");
  }
}

function finExtratoFlashObterContextoGravacaoFlash_(ss) {
  var sheetLotes = ss.getSheetByName(FIN_EXTRATO_FLASH_ABA_LOTES_V1);
  var sheetExtratos = ss.getSheetByName(FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1);
  if (!sheetLotes) throw new Error("Aba obrigatoria ausente para importacao real Flash: " + FIN_EXTRATO_FLASH_ABA_LOTES_V1 + ".");
  if (!sheetExtratos) throw new Error("Aba obrigatoria ausente para importacao real Flash: " + FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1 + ".");

  var headersLote = finExtratoFlashLerHeadersSheet_(sheetLotes, FIN_EXTRATO_FLASH_ABA_LOTES_V1);
  var headersExtratos = finExtratoFlashLerHeadersSheet_(sheetExtratos, FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1);
  finExtratoFlashValidarHeadersObrigatorios_(FIN_EXTRATO_FLASH_ABA_LOTES_V1, headersLote, ["LOTE_ID", "ARQUIVO_HASH", "TOTAL_LANCAMENTOS", "SOMA_DEBITOS", "SOMA_CREDITOS", "SALDO_LIQUIDO", "CHAVE_LOTE"]);
  finExtratoFlashValidarHeadersObrigatorios_(FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1, headersExtratos, ["EXTRATO_ID", "LOTE_ID", "DATA_TRANSACAO", "VALOR", "CARTAO_FINAL", "ARQUIVO_HASH", "CHAVE_DUPLICIDADE"]);
  return {
    sheetLotes: sheetLotes,
    sheetExtratos: sheetExtratos,
    headersLote: headersLote,
    headersExtratos: headersExtratos
  };
}

function finExtratoFlashLerHeadersSheet_(sheet, nomeAba) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) throw new Error("Aba sem cabecalho para importacao real Flash: " + nomeAba + ".");
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return finExtratoFlashTexto_(h);
  });
}

function finExtratoFlashAuditoriaAntesImportacao_(contexto, preparado) {
  return finExtratoFlashAuditoriaImportacao_(contexto, preparado, "ANTES");
}

function finExtratoFlashAuditoriaDepoisImportacao_(contexto, preparado) {
  return finExtratoFlashAuditoriaImportacao_(contexto, preparado, "DEPOIS");
}

function finExtratoFlashAuditoriaImportacao_(contexto, preparado, etapa) {
  var lote = preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao : {};
  return {
    etapa: etapa,
    timestamp: finExtratoFlashAgoraIso_(),
    totalLotesLidos: Math.max(0, contexto.sheetLotes.getLastRow() - 1),
    totalExtratosLidos: Math.max(0, contexto.sheetExtratos.getLastRow() - 1),
    loteId: lote.loteId || "",
    arquivoHash: lote.arquivoHash || "",
    totalLancamentosEsperado: Number(lote.totalLancamentos || 0),
    chaveLote: lote.chaveLote || finExtratoFlashChaveLote_(lote)
  };
}

function finExtratoFlashCompararAuditoriaImportacao_(antes, depois, preparado) {
  var bloqueios = [];
  var totalExtratos = preparado && preparado.extratosParaGravacao ? preparado.extratosParaGravacao.length : 0;
  if (!antes || !depois) bloqueios.push("Auditoria antes/depois indisponivel.");
  if (antes && depois && depois.totalLotesLidos !== antes.totalLotesLidos + 1) bloqueios.push("Total de lotes depois nao incrementou em 1.");
  if (antes && depois && depois.totalExtratosLidos !== antes.totalExtratosLidos + totalExtratos) bloqueios.push("Total de extratos depois nao incrementou conforme esperado.");
  return {
    ok: bloqueios.length === 0,
    bloqueios: bloqueios,
    esperado: {
      incrementoLotes: 1,
      incrementoExtratos: totalExtratos
    },
    realizado: {
      incrementoLotes: antes && depois ? depois.totalLotesLidos - antes.totalLotesLidos : 0,
      incrementoExtratos: antes && depois ? depois.totalExtratosLidos - antes.totalExtratosLidos : 0
    }
  };
}

function finExtratoFlashValidarImportacaoContraBaseAtual_(preparado, contexto, auditoriaAntes, bloqueios, avisos) {
  var lote = preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao : null;
  var extratos = preparado && preparado.extratosParaGravacao ? preparado.extratosParaGravacao : [];
  var dadosLotes = finExtratoFlashLerAbaReadOnly_(finExtratoFlashPlanilhaFake_(contexto.sheetLotes), FIN_EXTRATO_FLASH_ABA_LOTES_V1, ["LOTE_ID", "ARQUIVO_HASH", "CHAVE_LOTE"]).items;
  var dadosExtratos = finExtratoFlashLerAbaReadOnly_(finExtratoFlashPlanilhaFake_(contexto.sheetExtratos), FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1, ["LOTE_ID", "ARQUIVO_HASH", "CHAVE_DUPLICIDADE"]).items;
  if (lote && finExtratoFlashLoteDuplicadoReal_(lote, dadosLotes)) bloqueios.push("Lote ja existe na base no momento da importacao real.");
  var mapaChaves = {};
  for (var i = 0; i < dadosExtratos.length; i++) {
    var chaveReal = finExtratoFlashTexto_(dadosExtratos[i].CHAVE_DUPLICIDADE);
    if (chaveReal) mapaChaves[chaveReal] = true;
  }
  for (var j = 0; j < extratos.length; j++) {
    var chave = finExtratoFlashTexto_(extratos[j].chaveDuplicidade);
    if (!chave) bloqueios.push("Extrato preparado sem chaveDuplicidade antes da gravacao.");
    if (chave && mapaChaves[chave]) bloqueios.push("Chave de duplicidade ja existe antes da gravacao: " + chave + ".");
  }
  if (auditoriaAntes && auditoriaAntes.totalLotesLidos < 0) bloqueios.push("Auditoria antes invalida para lotes.");
  if (!bloqueios.length) avisos.push("Base atual validada imediatamente antes da importacao real.");
}

function finExtratoFlashPlanilhaFake_(sheet) {
  return {
    getSheetByName: function() {
      return sheet;
    }
  };
}

function finExtratoFlashMontarLinhaLoteParaGravacao_(lote, headers, usuario) {
  var agora = finExtratoFlashAgoraIso_();
  var obj = {
    LOTE_ID: lote.loteId || "",
    ORIGEM: lote.origem || "FLASH",
    ARQUIVO_NOME: lote.arquivoNome || "",
    ARQUIVO_HASH: lote.arquivoHash || "",
    PERIODO_INICIO: lote.periodoInicio || "",
    PERIODO_FIM: lote.periodoFim || "",
    PESSOA: lote.pessoa || "",
    CARTAO_FINAL: lote.finalCartao || "",
    TOTAL_LANCAMENTOS: Number(lote.totalLancamentos || 0),
    TOTAL_DEBITOS: Number(lote.totalDebitos || 0),
    TOTAL_CREDITOS: Number(lote.totalCreditos || 0),
    SOMA_DEBITOS: Number(lote.somaDebitos || 0),
    SOMA_CREDITOS: Number(lote.somaCreditos || 0),
    SALDO_LIQUIDO: Number(lote.saldoLiquido || 0),
    STATUS_LOTE: "IMPORTADO",
    CHAVE_LOTE: lote.chaveLote || finExtratoFlashChaveLote_(lote),
    IMPORTADO_EM: agora,
    IMPORTADO_POR: usuario || "",
    OBSERVACOES: "Importacao Flash autorizada tecnicamente.",
    CRIADO_EM: agora,
    CRIADO_POR: usuario || "",
    ATUALIZADO_EM: agora,
    ATUALIZADO_POR: usuario || ""
  };
  return finExtratoFlashMapearObjetoParaLinhaPorHeaders_(obj, headers);
}

function finExtratoFlashMontarLinhaExtratoParaGravacao_(item, headers, usuario) {
  var agora = finExtratoFlashAgoraIso_();
  var obj = {
    ID: item.extratoIdProposto || "",
    EXTRATO_ID: item.extratoIdProposto || "",
    IMPORTACAO_ID: item.loteId || "",
    LOTE_ID: item.loteId || "",
    DATA_TRANSACAO: item.dataIso || item.dataOriginal || "",
    VALOR: item.valorNumero,
    TIPO_TRANSACAO: item.sinal || "",
    ESTABELECIMENTO_EXTRATO: item.descricaoLimpa || item.movimentacaoOriginal || "",
    CATEGORIA_EXTRATO: item.categoriaInferida || "",
    CARTAO_FINAL: item.finalCartao || "",
    CONCILIADO: "NAO",
    STATUS_CONCILIACAO: "PENDENTE",
    ARQUIVO_ORIGEM_ID: item.arquivoHash || "",
    ARQUIVO_HASH: item.arquivoHash || "",
    ORIGEM: "FLASH",
    LINHA_ORIGEM: item.linhaOrigem || "",
    CHAVE_DUPLICIDADE: item.chaveDuplicidade || "",
    OBSERVACOES: "Extrato Flash importado por fluxo controlado.",
    STATUS: item.statusPrestacao || "PENDENTE",
    CRIADO_EM: agora,
    CRIADO_POR: usuario || ""
  };
  return finExtratoFlashMapearObjetoParaLinhaPorHeaders_(obj, headers);
}

function finExtratoFlashMapearObjetoParaLinhaPorHeaders_(obj, headers) {
  var linha = [];
  var origem = obj || {};
  for (var i = 0; i < headers.length; i++) {
    var h = finExtratoFlashTexto_(headers[i]);
    linha.push(Object.prototype.hasOwnProperty.call(origem, h) ? origem[h] : "");
  }
  return linha;
}

function finExtratoFlashRetornoImportacaoRealBloqueada_(bloqueios, avisos, preparado, pacote, auditoriaAntes) {
  return {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    autorizado: false,
    modo: "IMPORTACAO_REAL_LOTE_EXTRATO_FLASH_V1",
    mensagem: "Importacao real bloqueada. Nenhuma gravacao foi realizada.",
    loteId: preparado && preparado.loteParaGravacao ? preparado.loteParaGravacao.loteId : "",
    totalExtratosPreparados: pacote && pacote.linhasExtratos ? pacote.linhasExtratos.length : 0,
    auditoriaAntes: auditoriaAntes || null,
    bloqueios: bloqueios || [],
    avisos: avisos || []
  };
}

function finExtratoFlashRetorno_(success, resumo, lancamentos, avisos, bloqueios) {
  return {
    success: !!success,
    ok: !!success,
    executado: false,
    modo: FIN_EXTRATO_FLASH_MODO_PREVIEW_V1,
    resumo: resumo || finExtratoFlashResumo_([]),
    lancamentosNormalizados: lancamentos || [],
    avisos: avisos || [],
    bloqueios: bloqueios || []
  };
}

function finExtratoFlashDryRunRetorno_(success, loteProposto, resumo, lancamentosDryRun, duplicidades, avisos, bloqueios) {
  return {
    success: !!success,
    ok: !!success,
    executado:false,
    modo: FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1,
    loteProposto: loteProposto,
    resumo: resumo || finExtratoFlashResumo_([]),
    lancamentosDryRun: lancamentosDryRun || [],
    duplicidades: duplicidades || finExtratoFlashDuplicidadesVazias_(),
    resumoGerencial: finExtratoFlashResumoGerencialDryRun_(loteProposto, resumo, lancamentosDryRun, duplicidades, avisos, bloqueios),
    avisos: avisos || [],
    bloqueios: bloqueios || []
  };
}

function finExtratoFlashObterTabelaEntrada_(payload, avisos, bloqueios) {
  if (payload.rows && payload.rows.length) {
    return {
      cabecalhos: finExtratoFlashNormalizarArray_(payload.rows[0]),
      linhas: finExtratoFlashNormalizarMatriz_(payload.rows.slice(1))
    };
  }

  if (payload.cabecalhos && payload.linhas) {
    return {
      cabecalhos: finExtratoFlashNormalizarArray_(payload.cabecalhos),
      linhas: finExtratoFlashNormalizarMatriz_(payload.linhas)
    };
  }

  if (payload.xlsxBase64) {
    avisos.push("Preview processado a partir de xlsxBase64 em memoria, sem gravacao.");
    return finExtratoFlashLerXlsxBase64_(payload.xlsxBase64);
  }

  bloqueios.push("Payload invalido. Informe rows, cabecalhos/linhas ou xlsxBase64.");
  return { cabecalhos: [], linhas: [] };
}

function finExtratoFlashLerXlsxBase64_(xlsxBase64) {
  if (typeof Utilities === "undefined") {
    throw new Error("Utilities indisponivel para leitura de xlsxBase64 neste ambiente.");
  }

  var bytes = Utilities.base64Decode(String(xlsxBase64 || ""));
  if (!bytes || !bytes.length) {
    throw new Error("Arquivo XLSX vazio ou base64 invalido.");
  }

  var blob = Utilities.newBlob(bytes, "application/zip", "flash.zip");
  var arquivos;
  try {
    arquivos = Utilities.unzip(blob);
  } catch (erroUnzip) {
    throw new Error(
      "Leitura XLSX via base64 ainda nao foi concluida neste ambiente: " +
      (erroUnzip && erroUnzip.message ? erroUnzip.message : String(erroUnzip))
    );
  }
  var mapa = {};

  for (var i = 0; i < arquivos.length; i++) {
    mapa[arquivos[i].getName()] = arquivos[i].getDataAsString("UTF-8");
  }

  var sharedXml = finExtratoFlashBuscarEntradaXlsx_(mapa, "xl/sharedStrings.xml") || "";
  var sheetXml = finExtratoFlashBuscarEntradaXlsx_(mapa, "xl/worksheets/sheet1.xml");
  if (!sheetXml) {
    throw new Error("Aba xl/worksheets/sheet1.xml nao encontrada no XLSX.");
  }

  var sharedStrings = finExtratoFlashExtrairSharedStrings_(sharedXml);
  var rows = finExtratoFlashExtrairRowsSheet_(sheetXml, sharedStrings);
  if (rows.length < 2) {
    throw new Error("XLSX lido, mas nenhuma linha de lancamento foi encontrada.");
  }

  return {
    cabecalhos: rows[0] || [],
    linhas: rows.slice(1)
  };
}

function finExtratoFlashBuscarEntradaXlsx_(mapa, caminho) {
  if (mapa[caminho]) return mapa[caminho];

  for (var nome in mapa) {
    if (Object.prototype.hasOwnProperty.call(mapa, nome) && nome.slice(-caminho.length) === caminho) {
      return mapa[nome];
    }
  }

  return "";
}

function finExtratoFlashExtrairSharedStrings_(xml) {
  var shared = [];
  var siRegex = /<si\b[\s\S]*?<\/si>/g;
  var siMatch;

  while ((siMatch = siRegex.exec(xml))) {
    var textos = [];
    var tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    var tMatch;

    while ((tMatch = tRegex.exec(siMatch[0]))) {
      textos.push(finExtratoFlashXmlDecode_(tMatch[1]));
    }

    shared.push(textos.join(""));
  }

  return shared;
}

function finExtratoFlashExtrairRowsSheet_(sheetXml, sharedStrings) {
  var rows = [];
  var rowRegex = /<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  var rowMatch;

  while ((rowMatch = rowRegex.exec(sheetXml))) {
    var valores = [];
    var cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    var cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[2]))) {
      var attrs = cellMatch[1];
      var body = cellMatch[2];
      var refMatch = /\br="([^"]+)"/.exec(attrs);
      var typeMatch = /\bt="([^"]+)"/.exec(attrs);
      var valueMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
      var inlineMatch = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(body);
      var col = refMatch ? finExtratoFlashColumnIndex_(refMatch[1]) : valores.length;
      var raw = valueMatch
        ? finExtratoFlashXmlDecode_(valueMatch[1])
        : inlineMatch
          ? finExtratoFlashXmlDecode_(inlineMatch[1])
          : "";
      var type = typeMatch ? typeMatch[1] : "";

      valores[col] = type === "s" ? sharedStrings[Number(raw)] || "" : raw;
    }

    rows.push(finExtratoFlashNormalizarArray_(valores));
  }

  return rows;
}

function finExtratoFlashXmlDecode_(valor) {
  return String(valor || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function finExtratoFlashColumnIndex_(cellRef) {
  var match = /^([A-Z]+)/.exec(cellRef);
  if (!match) return -1;

  var index = 0;
  for (var i = 0; i < match[1].length; i++) {
    index = index * 26 + (match[1].charCodeAt(i) - 64);
  }

  return index - 1;
}

function finExtratoFlashValidarCabecalhos_(cabecalhos) {
  var esperados = [
    "Data",
    "Movimentação",
    "Valor",
    "Pessoa",
    "Pagamento",
    "Prestação de contas"
  ];

  for (var i = 0; i < esperados.length; i++) {
    if (finExtratoFlashTexto_(cabecalhos[i]) !== esperados[i]) {
      return {
        ok: false,
        mensagem: "Cabecalho invalido na coluna " + (i + 1) + ". Esperado " + esperados[i] + "."
      };
    }
  }

  return { ok: true };
}

function finExtratoFlashNormalizarLinha_(linha, linhaOrigem) {
  var dataOriginal = finExtratoFlashTexto_(linha[0]);
  var movimentacaoOriginal = finExtratoFlashTexto_(linha[1]);
  var valorOriginal = finExtratoFlashTexto_(linha[2]);
  var pessoa = finExtratoFlashTexto_(linha[3]);
  var pagamentoOriginal = finExtratoFlashTexto_(linha[4]);
  var statusPrestacaoOriginal = finExtratoFlashTexto_(linha[5]);
  var categoria = finExtratoFlashNormalizarCategoria_(movimentacaoOriginal);
  var valor = finExtratoFlashNormalizarValor_(valorOriginal);
  var pagamento = finExtratoFlashNormalizarPagamento_(pagamentoOriginal);
  var dataIso = finExtratoFlashNormalizarData_(dataOriginal);
  var statusPrestacaoNormalizado = finExtratoFlashNormalizarStatusPrestacao_(statusPrestacaoOriginal);

  return {
    linhaOrigem: linhaOrigem,
    dataOriginal: dataOriginal,
    dataIso: dataIso,
    movimentacaoOriginal: movimentacaoOriginal,
    descricaoLimpa: categoria.descricaoLimpa,
    categoriaInferida: categoria.categoriaInferida,
    valorOriginal: valorOriginal,
    valorNumero: valor.valorNumero,
    sinal: valor.sinal,
    pessoa: pessoa,
    pagamentoOriginal: pagamentoOriginal,
    tipoPagamento: pagamento.tipoPagamento,
    finalCartao: pagamento.finalCartao,
    statusPrestacaoOriginal: statusPrestacaoOriginal,
    statusPrestacaoNormalizado: statusPrestacaoNormalizado,
    chaveDuplicidade: finExtratoFlashChaveDuplicidade_([
      dataIso || dataOriginal,
      valor.valorNumero,
      categoria.descricaoLimpa,
      pessoa,
      pagamentoOriginal
    ])
  };
}

function finExtratoFlashEnriquecerComCPF_(linhasNormalizadas, cartoesBase) {
  var mapaCpfs = {};

  // Índice de resolução: "NOME_UPPER|FINAL4" → CPF
  (cartoesBase || []).forEach(function(c) {
    var nome = finExtratoFlashTexto_(c.FUNCIONARIO_NOME).toUpperCase().trim();
    var final4 = finExtratoFlashTexto_(c.NUMERO_FINAL_4).replace(/\D/g, '');
    var cpf = finExtratoFlashTexto_(c.CPF_COLABORADOR).replace(/\D/g, '');
    if (nome && final4 && cpf) {
      mapaCpfs[nome + '|' + final4] = cpf;
    }
  });

  linhasNormalizadas.forEach(function(linha) {
    var nomeExtrato = finExtratoFlashTexto_(linha.pessoa).toUpperCase().trim();
    var finalExtrato = finExtratoFlashTexto_(linha.finalCartao).replace(/\D/g, '');
    var cpfResolvido = (nomeExtrato && finalExtrato) ? (mapaCpfs[nomeExtrato + '|' + finalExtrato] || '') : '';
    if (cpfResolvido) {
      linha.cpfColaborador = cpfResolvido;
      linha.CPF_COLABORADOR = cpfResolvido;
    }
  });

  return linhasNormalizadas;
}

function finExtratoFlashNormalizarData_(valor) {
  var texto = finExtratoFlashTexto_(valor);
  var match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(texto);
  if (!match) return null;

  var dia = Number(match[1]);
  var mes = Number(match[2]);
  var ano = Number(match[3]);
  var hora = Number(match[4]);
  var minuto = Number(match[5]);

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59 || ano < 1900) {
    return null;
  }

  return match[3] + "-" + match[2] + "-" + match[1] + "T" + match[4] + ":" + match[5] + ":00";
}

function finExtratoFlashNormalizarValor_(valor) {
  var texto = finExtratoFlashTexto_(valor).replace(/\u00a0/g, " ");
  var fator = texto.indexOf("-") === 0 ? -1 : 1;
  var numeroTexto = texto
    .replace(/[+\-]/g, "")
    .replace(/R\$/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  var numero = Number(numeroTexto);

  if (!isFinite(numero)) {
    return { valorNumero: null, sinal: "OUTRO" };
  }

  var valorNumero = finExtratoFlashArredondar_(fator * numero);
  return {
    valorNumero: valorNumero,
    sinal: valorNumero < 0 ? "DEBITO" : "CREDITO"
  };
}

function finExtratoFlashNormalizarCategoria_(movimentacaoOriginal) {
  var texto = finExtratoFlashTexto_(movimentacaoOriginal);
  var categorias = ["Alimentação", "Estacionamento", "Combustível", "Conveniência"];

  if (/^Dep[oó]sito$/i.test(texto)) {
    return {
      descricaoLimpa: texto,
      categoriaInferida: "DEPOSITO"
    };
  }

  for (var i = 0; i < categorias.length; i++) {
    var categoria = categorias[i];
    if (texto.slice(-categoria.length) === categoria) {
      return {
        descricaoLimpa: finExtratoFlashTexto_(texto.slice(0, texto.length - categoria.length)),
        categoriaInferida: categoria
      };
    }
  }

  return {
    descricaoLimpa: texto,
    categoriaInferida: "OUTRO"
  };
}

function finExtratoFlashNormalizarPagamento_(pagamentoOriginal) {
  var texto = finExtratoFlashTexto_(pagamentoOriginal);
  var finalMatch = /Conta\s+final\s+(\d+)/i.exec(texto);
  var tipoPagamento = "OUTRO";

  if (/Cart[aã]o\s+f[ií]sico/i.test(texto)) {
    tipoPagamento = "CARTAO_FISICO";
  } else if (/Carteira\s+corporativa/i.test(texto)) {
    tipoPagamento = "CARTEIRA_CORPORATIVA";
  }

  return {
    tipoPagamento: tipoPagamento,
    finalCartao: finalMatch ? finalMatch[1] : null
  };
}

function finExtratoFlashNormalizarStatusPrestacao_(valor) {
  var texto = finExtratoFlashTexto_(valor);
  if (texto === "-") return "NAO_APLICAVEL";
  if (/^Pendente$/i.test(texto)) return "PENDENTE";
  if (!texto) return "VAZIO";
  return texto.toUpperCase();
}

function finExtratoFlashResumo_(lancamentos) {
  var totalDebitos = 0;
  var totalCreditos = 0;
  var somaDebitos = 0;
  var somaCreditos = 0;
  var pessoas = {};
  var finaisCartao = {};
  var categorias = {};
  var statusPrestacao = {};

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i];
    var valor = Number(item.valorNumero || 0);

    if (item.sinal === "DEBITO") {
      totalDebitos++;
      somaDebitos += valor;
    } else if (item.sinal === "CREDITO") {
      totalCreditos++;
      somaCreditos += valor;
    }

    finExtratoFlashMarcarUnico_(pessoas, item.pessoa);
    finExtratoFlashMarcarUnico_(finaisCartao, item.finalCartao);
    finExtratoFlashMarcarUnico_(categorias, item.categoriaInferida);
    finExtratoFlashMarcarUnico_(statusPrestacao, item.statusPrestacaoNormalizado);
  }

  somaDebitos = finExtratoFlashArredondar_(somaDebitos);
  somaCreditos = finExtratoFlashArredondar_(somaCreditos);

  return {
    totalLancamentos: lancamentos.length,
    totalDebitos: totalDebitos,
    totalCreditos: totalCreditos,
    somaDebitos: somaDebitos,
    somaCreditos: somaCreditos,
    saldoLiquido: finExtratoFlashArredondar_(somaDebitos + somaCreditos),
    pessoas: finExtratoFlashUnicosOrdenados_(pessoas),
    finaisCartao: finExtratoFlashUnicosOrdenados_(finaisCartao),
    categorias: finExtratoFlashUnicosOrdenados_(categorias),
    statusPrestacao: finExtratoFlashUnicosOrdenados_(statusPrestacao)
  };
}

function finExtratoFlashChaveDuplicidade_(partes) {
  var saida = [];
  for (var i = 0; i < partes.length; i++) {
    saida.push(finExtratoFlashTexto_(partes[i]).toUpperCase().replace(/\s+/g, " "));
  }
  return saida.join("|");
}

function finExtratoFlashLinhaVazia_(linha) {
  for (var i = 0; i < linha.length; i++) {
    if (finExtratoFlashTexto_(linha[i])) return false;
  }
  return true;
}

function finExtratoFlashNormalizarArray_(linha) {
  var saida = [];
  for (var i = 0; i < linha.length; i++) {
    saida.push(finExtratoFlashTexto_(linha[i]));
  }
  return saida;
}

function finExtratoFlashNormalizarMatriz_(linhas) {
  var saida = [];
  for (var i = 0; i < linhas.length; i++) {
    saida.push(finExtratoFlashNormalizarArray_(linhas[i] || []));
  }
  return saida;
}

function finExtratoFlashTexto_(valor) {
  return String(valor === null || valor === undefined ? "" : valor).trim();
}

function finExtratoFlashArredondar_(valor) {
  return Math.round(Number(valor || 0) * 100) / 100;
}

function finExtratoFlashMarcarUnico_(mapa, valor) {
  var texto = finExtratoFlashTexto_(valor);
  if (texto) mapa[texto] = true;
}

function finExtratoFlashUnicosOrdenados_(mapa) {
  var lista = [];
  for (var chave in mapa) {
    if (Object.prototype.hasOwnProperty.call(mapa, chave)) lista.push(chave);
  }
  return lista.sort();
}

function finExtratoFlashMontarLoteProposto_(payload, resumo, lancamentos) {
  var periodo = finExtratoFlashPeriodo_(lancamentos);
  var pessoa = resumo.pessoas && resumo.pessoas.length === 1 ? resumo.pessoas[0] : (resumo.pessoas || []).join(", ");
  var finalCartao = resumo.finaisCartao && resumo.finaisCartao.length === 1
    ? resumo.finaisCartao[0]
    : (resumo.finaisCartao || []).join(",");
  var arquivoNome = finExtratoFlashTexto_(payload.arquivoNome || payload.nomeArquivo || "");
  var arquivoHash = finExtratoFlashTexto_(payload.arquivoHash || "");

  if (!arquivoHash) {
    arquivoHash = finExtratoFlashHashLogico_(lancamentos);
  }

  return {
    loteId: "LOTE-FLASH-PREVIEW-" + finExtratoFlashHashCurto_(arquivoHash),
    origem: finExtratoFlashTexto_(payload.origem || "FLASH") || "FLASH",
    arquivoNome: arquivoNome,
    arquivoHash: arquivoHash,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    pessoa: pessoa,
    finalCartao: finalCartao,
    totalLancamentos: resumo.totalLancamentos,
    totalDebitos: resumo.totalDebitos,
    totalCreditos: resumo.totalCreditos,
    somaDebitos: resumo.somaDebitos,
    somaCreditos: resumo.somaCreditos,
    saldoLiquido: resumo.saldoLiquido,
    statusProposto: "AGUARDANDO_CONFIRMACAO",
    executado:false,
    criadoEm: finExtratoFlashAgoraIso_(),
    criadoPor: finExtratoFlashTexto_(payload.usuario || payload.criadoPor || ""),
    observacao: "Dry-run sem gravacao. Importacao definitiva nao executada."
  };
}

function finExtratoFlashMontarLancamentosDryRun_(lancamentos, loteProposto, duplicidades) {
  var mapaDuplicados = duplicidades.mapaChaves || {};
  var saida = [];

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i];
    var motivos = [];
    var status = "NOVO";
    var chave = item.chaveDuplicidade || finExtratoFlashChaveLancamento_(item);

    if (mapaDuplicados[chave]) {
      status = "POSSIVEL_DUPLICADO";
      motivos.push("Chave de duplicidade encontrada em dados existentes do dry-run.");
    }
    if (!item.pessoa || !item.dataIso || item.valorNumero === null || item.valorNumero === undefined) {
      status = "BLOQUEADO";
      motivos.push("Lancamento sem pessoa, dataIso ou valorNumero seguro.");
    }
    if (item.sinal === "DEBITO" && !item.finalCartao) {
      status = "BLOQUEADO";
      motivos.push("Debito sem finalCartao identificado.");
    }

    saida.push(finExtratoFlashAssign_({}, item, {
      chaveDuplicidade: chave,
      chaveLote: loteProposto ? finExtratoFlashChaveLote_(loteProposto) : "",
      statusDryRun: status,
      motivosDryRun: motivos
    }));
  }

  return saida;
}

function finExtratoFlashValidarLancamentosDryRun_(lancamentos, avisos, bloqueios) {
  var semData = 0;
  var semValor = 0;
  var semPessoa = 0;
  var debitoSemCartao = 0;

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i] || {};
    if (!item.dataIso) semData++;
    if (item.valorNumero === null || item.valorNumero === undefined) semValor++;
    if (!item.pessoa) semPessoa++;
    if (item.sinal === "DEBITO" && !item.finalCartao) debitoSemCartao++;
  }

  if (semData) bloqueios.push("Ha " + semData + " lancamento(s) sem data valida no dry-run.");
  if (semValor) bloqueios.push("Ha " + semValor + " lancamento(s) sem valor numerico valido no dry-run.");
  if (semPessoa) bloqueios.push("Ha " + semPessoa + " lancamento(s) sem pessoa identificada no dry-run.");
  if (debitoSemCartao) bloqueios.push("Ha " + debitoSemCartao + " debito(s) sem final de cartao identificado.");
  if (!semData && !semValor && !semPessoa && !debitoSemCartao) {
    avisos.push("Validacao estrutural do dry-run aprovada: data, valor, pessoa e final de cartao conferidos quando aplicavel.");
  }
}

function finExtratoFlashSimularDuplicidades_(payload, loteProposto, lancamentos, avisos) {
  var existentes = [];
  var mapaChaves = {};
  var possiveis = [];
  var extratos = payload.extratosExistentes || payload.extratos || [];
  var lancamentosExistentes = payload.lancamentosExistentes || [];

  existentes = existentes.concat(finExtratoFlashNormalizarExistentes_(extratos));
  existentes = existentes.concat(finExtratoFlashNormalizarExistentes_(lancamentosExistentes));

  if (!existentes.length) {
    avisos.push("Schema atual ainda nao possui CHAVE_DUPLICIDADE/ARQUIVO_HASH explicitos para lote.");
    avisos.push("Dry-run executado sem leitura de abas existentes; duplicidade real deve ser validada antes da importacao definitiva.");
  }

  for (var i = 0; i < lancamentos.length; i++) {
    var chave = lancamentos[i].chaveDuplicidade || finExtratoFlashChaveLancamento_(lancamentos[i]);
    for (var j = 0; j < existentes.length; j++) {
      if (chave && chave === existentes[j].chaveDuplicidade) {
        mapaChaves[chave] = true;
        possiveis.push({
          linhaOrigem: lancamentos[i].linhaOrigem,
          chaveDuplicidade: chave,
          motivo: "Chave forte encontrada em dados existentes informados no payload."
        });
        break;
      }
    }
  }

  return {
    lotePossivelmenteDuplicado: finExtratoFlashLoteDuplicado_(payload, loteProposto),
    totalPossiveisDuplicados: possiveis.length,
    lancamentosPossiveisDuplicados: possiveis,
    mapaChaves: mapaChaves,
    criterioLancamento: "pessoa + dataIso + valorNumero + descricaoLimpa + pagamentoOriginal + finalCartao",
    criterioLote: "arquivoHash + pessoa + periodo + finalCartao + totalLancamentos + somaDebitos + somaCreditos",
    leituraAbasExecutada: false
  };
}

function finExtratoFlashDetectarDuplicidadesReais_(payload, loteProposto, lancamentos, avisos, bloqueios) {
  var simuladas = finExtratoFlashSimularDuplicidades_(payload || {}, loteProposto, lancamentos, []);
  var leitura = finExtratoFlashLerDadosDuplicidadeReais_(bloqueios);
  var mapaChaves = {};
  var possiveis = [];
  var avisosLocais = [];
  var loteDuplicado = false;

  finExtratoFlashCopiarMapa_(mapaChaves, simuladas.mapaChaves || {});
  possiveis = possiveis.concat(simuladas.lancamentosPossiveisDuplicados || []);
  loteDuplicado = !!simuladas.lotePossivelmenteDuplicado;

  if (!leitura.ok) {
    avisos.push("Dry-run bloqueado antes da importacao definitiva: nao foi possivel ler duplicidades reais.");
    return finExtratoFlashDuplicidadesMerge_(
      loteDuplicado,
      possiveis,
      mapaChaves,
      false,
      leitura,
      avisosLocais
    );
  }

  if (!(leitura.lotes || []).length) {
    avisosLocais.push("Aba real de lotes Flash sem registros existentes.");
  }
  if (!(leitura.extratos || []).length) {
    avisosLocais.push("Aba real de extratos Flash sem registros existentes.");
  }

  loteDuplicado = loteDuplicado || finExtratoFlashLoteDuplicadoReal_(loteProposto, leitura.lotes || []);

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i];
    var chave = item.chaveDuplicidade || finExtratoFlashChaveLancamento_(item);
    var encontrado = finExtratoFlashEncontrarLancamentoReal_(item, leitura.extratos || []);
    if (encontrado) {
      mapaChaves[chave] = true;
      possiveis.push({
        linhaOrigem: item.linhaOrigem,
        chaveDuplicidade: chave,
        extratoId: finExtratoFlashTexto_(encontrado.EXTRATO_ID || encontrado.ID),
        loteId: finExtratoFlashTexto_(encontrado.LOTE_ID),
        motivo: encontrado.CHAVE_DUPLICIDADE
          ? "CHAVE_DUPLICIDADE encontrada na aba FIN_CARTOES_EXTRATOS."
          : "Chave estavel derivada encontrada na aba FIN_CARTOES_EXTRATOS."
      });
    }
  }

  for (var a = 0; a < avisosLocais.length; a++) {
    avisos.push(avisosLocais[a]);
  }

  return finExtratoFlashDuplicidadesMerge_(
    loteDuplicado,
    possiveis,
    mapaChaves,
    true,
    leitura,
    avisosLocais
  );
}

function finExtratoFlashLerDadosDuplicidadeReais_(bloqueios) {
  var resultado = {
    ok: false,
    lotes: [],
    extratos: [],
    abas: {
      lotes: FIN_EXTRATO_FLASH_ABA_LOTES_V1,
      extratos: FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1
    },
    headers: {},
    erro: ""
  };

  try {
    var ss = finExtratoFlashAbrirDbFinReadOnly_();
    var lotes = finExtratoFlashLerAbaReadOnly_(
      ss,
      FIN_EXTRATO_FLASH_ABA_LOTES_V1,
      ["LOTE_ID", "ARQUIVO_HASH", "PERIODO_INICIO", "PERIODO_FIM", "PESSOA", "CARTAO_FINAL", "TOTAL_LANCAMENTOS", "SOMA_DEBITOS", "SOMA_CREDITOS", "CHAVE_LOTE"]
    );
    var extratos = finExtratoFlashLerAbaReadOnly_(
      ss,
      FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1,
      ["EXTRATO_ID", "LOTE_ID", "DATA_TRANSACAO", "VALOR", "ESTABELECIMENTO_EXTRATO", "CARTAO_FINAL", "ARQUIVO_HASH", "CHAVE_DUPLICIDADE"]
    );

    resultado.ok = true;
    resultado.lotes = lotes.items;
    resultado.extratos = extratos.items;
    resultado.headers[FIN_EXTRATO_FLASH_ABA_LOTES_V1] = lotes.headers;
    resultado.headers[FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1] = extratos.headers;
    return resultado;
  } catch (erro) {
    resultado.erro = erro && erro.message ? erro.message : String(erro);
    bloqueios.push(resultado.erro);
    return resultado;
  }
}

function finExtratoFlashAbrirDbFinReadOnly_() {
  if (typeof PropertiesService === "undefined" || typeof SpreadsheetApp === "undefined") {
    throw new Error("Leitura real de duplicidades requer ambiente Apps Script com PropertiesService e SpreadsheetApp.");
  }

  var dbId = PropertiesService.getScriptProperties().getProperty(FIN_EXTRATO_FLASH_DB_PROP_V1);
  dbId = finExtratoFlashTexto_(dbId);
  if (!dbId) {
    throw new Error("DB_FIN_ID nao configurado para leitura real de duplicidades Flash.");
  }

  return SpreadsheetApp.openById(dbId);
}

function finExtratoFlashFuncoesCriticas_() {
  return {
    finPreviewExtratoFlashXlsxV1: typeof finPreviewExtratoFlashXlsxV1 === "function",
    finDryRunLoteExtratoFlashV1: typeof finDryRunLoteExtratoFlashV1 === "function",
    finPreConfirmarLoteExtratoFlashV1: typeof finPreConfirmarLoteExtratoFlashV1 === "function",
    finPrepararPayloadImportacaoFlashV1: typeof finPrepararPayloadImportacaoFlashV1 === "function",
    finImportarLoteExtratoFlashV1: typeof finImportarLoteExtratoFlashV1 === "function",
    finImportarLoteExtratoFlashV1_BLOQUEADA: typeof finImportarLoteExtratoFlashV1_BLOQUEADA === "function",
    simularImportacaoRealFlashV1_SEM_GRAVAR: typeof simularImportacaoRealFlashV1_SEM_GRAVAR === "function",
    simularFluxoCompletoFlashComDecisoesV1_SEM_GRAVAR: typeof simularFluxoCompletoFlashComDecisoesV1_SEM_GRAVAR === "function",
    auditarContagemExtratoFlashV1_SEM_GRAVAR: typeof auditarContagemExtratoFlashV1_SEM_GRAVAR === "function",
    auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR: typeof auditarDecisoesOperacionaisFlashV1_SEM_GRAVAR === "function",
    TESTE_FLASH_CONTAGEM_SEM_GRAVAR: typeof TESTE_FLASH_CONTAGEM_SEM_GRAVAR === "function"
  };
}

function finExtratoFlashChecklistLiberacaoItem_(ordem, requisito, status, ok) {
  return {
    ordem: ordem,
    requisito: requisito,
    status: status,
    ok: !!ok
  };
}

function finExtratoFlashPayloadInlineSeguro_() {
  return {
    origem: "FLASH",
    arquivoNome: "extrato-flash-simulacao-final-inline.xlsx",
    usuario: "SIMULACAO_FINAL_SEM_GRAVAR",
    cabecalhos: [
      "Data",
      "Movimentação",
      "Valor",
      "Pessoa",
      "Pagamento",
      "Prestação de contas"
    ],
    linhas: [
      [
        "11/06/2026 07:08",
        "SIMULACAO PADARIA FIN NO Alimentação",
        "- R$ 5,04",
        "USUARIO TESTE FLASH",
        "Cartao fisico - Conta final 777",
        "Pendente"
      ],
      [
        "11/06/2026 15:39",
        "SIMULACAO ESTACIONAMENTO FIN NO Estacionamento",
        "- R$ 19,00",
        "USUARIO TESTE FLASH",
        "Cartao fisico - Conta final 777",
        "Pendente"
      ],
      [
        "11/06/2026 17:34",
        "SIMULACAO SERVICO SEM CATEGORIA",
        "- R$ 33,30",
        "USUARIO TESTE FLASH",
        "Cartao fisico - Conta final 777",
        "Pendente"
      ],
      [
        "11/06/2026 18:17",
        "Deposito",
        "+ R$ 1.000,00",
        "USUARIO TESTE FLASH",
        "Carteira corporativa - Agendado por FINANCEIRO",
        "-"
      ]
    ]
  };
}

function finExtratoFlashContarRegistrosAbaReadOnly_(ss, nomeAba) {
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    throw new Error("Aba obrigatoria nao encontrada para auditoria compacta Flash: " + nomeAba + ".");
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("Aba obrigatoria sem cabecalho para auditoria compacta Flash: " + nomeAba + ".");
  }

  var lastRow = sheet.getLastRow();
  return Math.max(0, lastRow - 1);
}

function finExtratoFlashLerAbaReadOnly_(ss, nomeAba, headersObrigatorios) {
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    throw new Error("Aba FIN obrigatoria nao encontrada para dry-run Flash: " + nomeAba + ".");
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("Aba FIN sem cabecalho para dry-run Flash: " + nomeAba + ".");
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return finExtratoFlashTexto_(h);
  });
  finExtratoFlashValidarHeadersObrigatorios_(nomeAba, headers, headersObrigatorios);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { headers: headers, items: [] };
  }

  var dados = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var items = [];
  for (var i = 0; i < dados.length; i++) {
    var row = {};
    var vazia = true;
    for (var j = 0; j < headers.length; j++) {
      var valor = finExtratoFlashValorSaida_(dados[i][j]);
      row[headers[j]] = valor;
      if (valor !== "" && valor !== null && valor !== undefined) vazia = false;
    }
    if (!vazia) items.push(row);
  }

  return { headers: headers, items: items };
}

function finExtratoFlashValidarHeadersObrigatorios_(nomeAba, headers, obrigatorios) {
  var mapa = {};
  for (var i = 0; i < headers.length; i++) {
    mapa[finExtratoFlashTexto_(headers[i]).toUpperCase()] = true;
  }

  for (var j = 0; j < obrigatorios.length; j++) {
    var esperado = finExtratoFlashTexto_(obrigatorios[j]).toUpperCase();
    if (!mapa[esperado]) {
      throw new Error("Header obrigatorio ausente em " + nomeAba + ": " + obrigatorios[j] + ".");
    }
  }
}

function finExtratoFlashValorSaida_(valor) {
  if (valor instanceof Date) {
    return valor.toISOString();
  }
  return valor;
}

function finExtratoFlashLoteDuplicadoReal_(loteProposto, lotes) {
  var chave = finExtratoFlashChaveLote_(loteProposto);
  var hash = finExtratoFlashTexto_(loteProposto && loteProposto.arquivoHash);

  for (var i = 0; i < lotes.length; i++) {
    var lote = lotes[i] || {};
    var chaveReal = finExtratoFlashTexto_(lote.CHAVE_LOTE);
    if (!chaveReal) chaveReal = finExtratoFlashChaveLote_(lote);
    if (chave && chaveReal && chave === chaveReal) return true;
    if (hash && finExtratoFlashTexto_(lote.ARQUIVO_HASH) === hash) return true;
  }

  return false;
}

function finExtratoFlashEncontrarLancamentoReal_(item, extratos) {
  var candidatos = finExtratoFlashChavesLancamentoPossiveis_(item);
  for (var i = 0; i < extratos.length; i++) {
    var extrato = extratos[i] || {};
    var chaveReal = finExtratoFlashTexto_(extrato.CHAVE_DUPLICIDADE);
    if (chaveReal && finExtratoFlashContemTexto_(candidatos, chaveReal)) return extrato;

    if (!chaveReal) {
      chaveReal = finExtratoFlashChaveLancamentoReal_(extrato);
      if (chaveReal && finExtratoFlashContemTexto_(candidatos, chaveReal)) return extrato;
    }
  }

  return null;
}

function finExtratoFlashChavesLancamentoPossiveis_(item) {
  var lista = [
    item.chaveDuplicidade,
    finExtratoFlashChaveLancamento_(item),
    finExtratoFlashChaveDuplicidade_([
      item.dataIso || item.dataOriginal,
      item.valorNumero,
      item.descricaoLimpa || item.movimentacaoOriginal,
      item.pessoa,
      item.pagamentoOriginal
    ])
  ];
  var saida = [];
  for (var i = 0; i < lista.length; i++) {
    var chave = finExtratoFlashTexto_(lista[i]);
    if (chave && !finExtratoFlashContemTexto_(saida, chave)) saida.push(chave);
  }
  return saida;
}

function finExtratoFlashChaveLancamentoReal_(item) {
  return finExtratoFlashChaveDuplicidade_([
    item.PESSOA || item.FUNCIONARIO_NOME || item.PORTADOR,
    item.DATA_ISO || item.DATA_TRANSACAO || item.DATA,
    item.VALOR || item.VALOR_TRANSACAO,
    item.ESTABELECIMENTO_EXTRATO || item.DESCRICAO || item.DESCRICAO_GASTO,
    item.PAGAMENTO || item.MODALIDADE,
    item.CARTAO_FINAL
  ]);
}

function finExtratoFlashDuplicidadesMerge_(loteDuplicado, possiveis, mapaChaves, leituraExecutada, leitura, avisos) {
  var lista = possiveis || [];
  return {
    lotePossivelmenteDuplicado: !!loteDuplicado,
    totalPossiveisDuplicados: lista.length,
    lancamentosPossiveisDuplicados: lista,
    mapaChaves: mapaChaves || {},
    criterioLancamento: "CHAVE_DUPLICIDADE real ou pessoa + dataIso + valorNumero + descricaoLimpa + pagamentoOriginal + finalCartao",
    criterioLote: "CHAVE_LOTE real ou arquivoHash + pessoa + periodo + finalCartao + totalLancamentos + somaDebitos + somaCreditos",
    leituraAbasExecutada: !!leituraExecutada,
    fonte: leituraExecutada ? "ABAS_FIN_REAIS" : "PAYLOAD_SIMULADO",
    abasConsultadas: leitura && leitura.abas ? leitura.abas : {},
    totalLotesLidos: leitura && leitura.lotes ? leitura.lotes.length : 0,
    totalExtratosLidos: leitura && leitura.extratos ? leitura.extratos.length : 0,
    avisosLeitura: avisos || [],
    erroLeitura: leitura && leitura.erro ? leitura.erro : ""
  };
}

function finExtratoFlashCopiarMapa_(destino, origem) {
  for (var chave in origem) {
    if (Object.prototype.hasOwnProperty.call(origem, chave)) destino[chave] = origem[chave];
  }
}

function finExtratoFlashContemTexto_(lista, valor) {
  var alvo = finExtratoFlashTexto_(valor);
  for (var i = 0; i < (lista || []).length; i++) {
    if (finExtratoFlashTexto_(lista[i]) === alvo) return true;
  }
  return false;
}

function finExtratoFlashNormalizarExistentes_(lista) {
  var saida = [];
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i] || {};
    var chave = finExtratoFlashTexto_(item.CHAVE_DUPLICIDADE || item.chaveDuplicidade);
    if (!chave) {
      chave = finExtratoFlashChaveDuplicidade_([
        item.PESSOA || item.FUNCIONARIO_NOME || item.pessoa,
        item.DATA_ISO || item.DATA_GASTO || item.DATA_TRANSACAO || item.dataIso || item.dataOriginal,
        item.VALOR || item.valorNumero,
        item.DESCRICAO_GASTO || item.ESTABELECIMENTO || item.ESTABELECIMENTO_EXTRATO || item.descricaoLimpa || item.movimentacaoOriginal,
        item.PAGAMENTO || item.pagamentoOriginal,
        item.CARTAO_FINAL || item.finalCartao
      ]);
    }
    saida.push({ chaveDuplicidade: chave });
  }
  return saida;
}

function finExtratoFlashLoteDuplicado_(payload, loteProposto) {
  var lotes = payload.lotesExistentes || [];
  var chave = finExtratoFlashChaveLote_(loteProposto);

  for (var i = 0; i < lotes.length; i++) {
    var atual = finExtratoFlashChaveLote_(lotes[i] || {});
    if (atual && atual === chave) return true;
  }

  return false;
}

function finExtratoFlashAvisosDryRun_(lancamentos, avisos) {
  var temDeposito = false;
  var temPendente = false;
  var temDebitoSemFinal = false;
  var temCategoriaOutro = false;

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i];
    if (item.categoriaInferida === "DEPOSITO") temDeposito = true;
    if (item.statusPrestacaoNormalizado === "PENDENTE") temPendente = true;
    if (item.sinal === "DEBITO" && !item.finalCartao) temDebitoSemFinal = true;
    if (item.categoriaInferida === "OUTRO") temCategoriaOutro = true;
  }

  if (temDeposito) avisos.push("Extrato contem depositos/recargas; validar tratamento antes da importacao definitiva.");
  if (temPendente) avisos.push("Extrato contem itens com prestacao PENDENTE.");
  if (temDebitoSemFinal) avisos.push("Ha debitos sem finalCartao identificado.");
  if (temCategoriaOutro) avisos.push("Ha lancamentos com categoria nao inferida.");
}

function finExtratoFlashPeriodo_(lancamentos) {
  var datas = [];
  for (var i = 0; i < lancamentos.length; i++) {
    if (lancamentos[i].dataIso) datas.push(lancamentos[i].dataIso);
  }
  datas.sort();
  return {
    inicio: datas.length ? datas[0] : "",
    fim: datas.length ? datas[datas.length - 1] : ""
  };
}

function finExtratoFlashChaveLancamento_(item) {
  return finExtratoFlashChaveDuplicidade_([
    item.pessoa,
    item.dataIso || item.dataOriginal,
    item.valorNumero,
    item.descricaoLimpa || item.movimentacaoOriginal,
    item.pagamentoOriginal,
    item.finalCartao
  ]);
}

function finExtratoFlashChaveLote_(lote) {
  if (!lote) return "";
  return finExtratoFlashChaveDuplicidade_([
    lote.arquivoHash || lote.ARQUIVO_HASH,
    lote.pessoa || lote.PESSOA,
    lote.periodoInicio || lote.PERIODO_INICIO,
    lote.periodoFim || lote.PERIODO_FIM,
    lote.finalCartao || lote.FINAL_CARTAO,
    lote.totalLancamentos || lote.TOTAL_LANCAMENTOS,
    lote.somaDebitos || lote.SOMA_DEBITOS,
    lote.somaCreditos || lote.SOMA_CREDITOS
  ]);
}

function finExtratoFlashHashLogico_(lancamentos) {
  var partes = [];
  for (var i = 0; i < lancamentos.length; i++) {
    partes.push(lancamentos[i].chaveDuplicidade || finExtratoFlashChaveLancamento_(lancamentos[i]));
  }
  return "LOGICO-" + finExtratoFlashHashCurto_(partes.join("||"));
}

function finExtratoFlashHashCurto_(texto) {
  var hash = 2166136261;
  var origem = finExtratoFlashTexto_(texto);
  for (var i = 0; i < origem.length; i++) {
    hash ^= origem.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ("00000000" + (hash >>> 0).toString(16).toUpperCase()).slice(-8);
}

function finExtratoFlashDuplicidadesVazias_() {
  return {
    lotePossivelmenteDuplicado: false,
    totalPossiveisDuplicados: 0,
    lancamentosPossiveisDuplicados: [],
    mapaChaves: {},
    criterioLancamento: "pessoa + dataIso + valorNumero + descricaoLimpa + pagamentoOriginal + finalCartao",
    criterioLote: "arquivoHash + pessoa + periodo + finalCartao + totalLancamentos + somaDebitos + somaCreditos",
    leituraAbasExecutada: false
  };
}

function finExtratoFlashResumoGerencialDryRun_(loteProposto, resumo, lancamentosDryRun, duplicidades, avisos, bloqueios) {
  var lancamentos = lancamentosDryRun || [];
  var dups = duplicidades || finExtratoFlashDuplicidadesVazias_();
  var totalBloqueados = 0;
  var totalNovos = 0;
  var totalPossiveisDuplicados = Number(dups.totalPossiveisDuplicados || 0);
  var valorAbsoluto = 0;

  for (var i = 0; i < lancamentos.length; i++) {
    var item = lancamentos[i] || {};
    if (item.statusDryRun === "BLOQUEADO") totalBloqueados++;
    if (item.statusDryRun === "NOVO") totalNovos++;
    valorAbsoluto += Math.abs(Number(item.valorNumero || 0));
  }

  var listaBloqueios = bloqueios || [];
  var listaAvisos = avisos || [];
  var statusSeguranca = "SEGURO_PARA_PREVIEW";
  if (listaBloqueios.length) {
    statusSeguranca = "BLOQUEADO";
  } else if (totalPossiveisDuplicados || (dups.lotePossivelmenteDuplicado === true) || listaAvisos.length) {
    statusSeguranca = "ATENCAO";
  }

  return {
    statusSeguranca: statusSeguranca,
    executado: false,
    leituraAbasExecutada: !!dups.leituraAbasExecutada,
    fonteDuplicidade: dups.fonte || (dups.leituraAbasExecutada ? "ABAS_FIN_REAIS" : "PAYLOAD_SIMULADO"),
    periodoInicio: loteProposto ? loteProposto.periodoInicio : "",
    periodoFim: loteProposto ? loteProposto.periodoFim : "",
    totalLancamentos: resumo && resumo.totalLancamentos !== undefined ? resumo.totalLancamentos : lancamentos.length,
    totalNovos: totalNovos,
    totalBloqueados: totalBloqueados,
    totalPossiveisDuplicados: totalPossiveisDuplicados,
    lotePossivelmenteDuplicado: !!dups.lotePossivelmenteDuplicado,
    totalAvisos: listaAvisos.length,
    totalBloqueios: listaBloqueios.length,
    valorAbsoluto: finExtratoFlashArredondar_(valorAbsoluto),
    somaDebitos: resumo ? resumo.somaDebitos : 0,
    somaCreditos: resumo ? resumo.somaCreditos : 0,
    saldoLiquido: resumo ? resumo.saldoLiquido : 0,
    bloqueiosResumo: listaBloqueios.slice(0, 5),
    avisosResumo: listaAvisos.slice(0, 5)
  };
}

function finExtratoFlashAgoraIso_() {
  return new Date().toISOString();
}

function finExtratoFlashAssign_(alvo) {
  var destino = alvo || {};
  for (var i = 1; i < arguments.length; i++) {
    var origem = arguments[i] || {};
    for (var chave in origem) {
      if (Object.prototype.hasOwnProperty.call(origem, chave)) destino[chave] = origem[chave];
    }
  }
  return destino;
}

function AUDITAR_PAYLOAD_FLASH_DEV_ATUAL_SEM_GRAVAR() {
  var pacote = gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR();
  var payload = pacote && pacote.payloadAutorizacaoSugerido ? pacote.payloadAutorizacaoSugerido : null;
  var resultado = auditarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR(payload);
  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }
  return resultado;
}

// FIN.R.1 — Gera payload de autorizacao limpo, copiavel e auditavel sem truncar
function gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];

  var pacote = gerarPacoteAutorizacaoImportacaoFlashV1_SEM_GRAVAR();
  if (!pacote) {
    bloqueios.push("Pacote de autorizacao nao retornou resposta.");
    return {
      success: false, ok: false, executado: false, gravacaoReal: false,
      modo: "PAYLOAD_AUTORIZACAO_FLASH_DEV_V1",
      status: "BLOQUEADO",
      payloadAutorizacaoSugerido: null,
      resumoConferencia: null,
      bloqueios: bloqueios, avisos: avisos
    };
  }
  if (pacote.executado !== false || pacote.gravacaoReal === true) {
    bloqueios.push("Pacote retornou contrato inseguro: executado ou gravacaoReal violado.");
  }
  if (pacote.bloqueios && pacote.bloqueios.length) {
    bloqueios = bloqueios.concat(pacote.bloqueios);
  }
  if (pacote.avisos && pacote.avisos.length) {
    avisos = avisos.concat(pacote.avisos);
  }

  var payload = pacote.payloadAutorizacaoSugerido || null;
  if (!payload || !payload.liberarImportacaoReal || !payload.fraseAutorizacao || !payload.ambienteEsperado) {
    bloqueios.push("Payload de autorizacao sugerido esta incompleto ou ausente.");
  }

  var baseline = pacote.baselineAntes || {};
  var esperado = pacote.esperadoDepois || {};
  var diferenca = pacote.diferencaEsperada || {};
  var lote = pacote.loteEsperado || {};
  var resumo = {
    baselineLotes: Number(baseline.totalLotesLidos || 0),
    baselineExtratos: Number(baseline.totalExtratosLidos || 0),
    esperadoLotes: Number(esperado.totalLotesEsperado || 0),
    esperadoExtratos: Number(esperado.totalExtratosEsperado || 0),
    diferencaLotes: Number(diferenca.lotesAdicionar || 0),
    diferencaExtratos: Number(diferenca.extratosAdicionar || 0),
    loteId: lote.loteId || "",
    arquivoHash: lote.arquivoHash || "",
    fraseObrigatoria: pacote.fraseObrigatoria || "AUTORIZO IMPORTACAO REAL FLASH"
  };

  var ok = bloqueios.length === 0;
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    gravacaoReal: false,
    modo: "PAYLOAD_AUTORIZACAO_FLASH_DEV_V1",
    status: ok ? "PAYLOAD_PRONTO_PARA_REVISAO_MANUAL" : "BLOQUEADO",
    payloadAutorizacaoSugerido: payload,
    baselineAntes: baseline,
    esperadoDepois: esperado,
    diferencaEsperada: diferenca,
    loteEsperado: lote,
    fraseObrigatoria: pacote.fraseObrigatoria || "AUTORIZO IMPORTACAO REAL FLASH",
    checklistAntesExecucao: pacote.checklistAntesExecucao || [],
    checklistDepoisExecucao: pacote.checklistDepoisExecucao || [],
    resumoConferencia: resumo,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      status: resultado.status,
      resumoConferencia: resumo,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

// FIN.R.2 — Valida um payload manual antes da execucao real
function auditarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR(payload) {
  var bloqueios = [];
  var avisos = [];
  var p = payload || {};

  if (p.liberarImportacaoReal !== true) bloqueios.push("liberarImportacaoReal deve ser true.");
  if (p.fraseAutorizacao !== "AUTORIZO IMPORTACAO REAL FLASH") bloqueios.push("fraseAutorizacao incorreta.");
  if (p.ambienteEsperado !== "DEV") bloqueios.push("ambienteEsperado deve ser DEV.");
  if (p.confirmacaoManualNecessaria !== true) bloqueios.push("confirmacaoManualNecessaria deve ser true.");
  if (Number(p.totalLotesAntes) !== 1) bloqueios.push("totalLotesAntes deve ser 1. Recebido: " + p.totalLotesAntes);
  if (Number(p.totalExtratosAntes) !== 3) bloqueios.push("totalExtratosAntes deve ser 3. Recebido: " + p.totalExtratosAntes);
  if (Number(p.totalLotesDepoisEsperado) !== 2) bloqueios.push("totalLotesDepoisEsperado deve ser 2. Recebido: " + p.totalLotesDepoisEsperado);
  if (Number(p.totalExtratosDepoisEsperado) !== 7) bloqueios.push("totalExtratosDepoisEsperado deve ser 7. Recebido: " + p.totalExtratosDepoisEsperado);
  if (Number(p.totalLancamentosEsperado) !== 4) bloqueios.push("totalLancamentosEsperado deve ser 4. Recebido: " + p.totalLancamentosEsperado);
  if (p.hashEsperado !== "LOGICO-971C06CE") avisos.push("arquivoHash recebido: " + (p.hashEsperado || "(ausente)") + ". Esperado: LOGICO-971C06CE.");
  if (p.loteEsperado !== "LOTE-FLASH-PREVIEW-34ABC763") avisos.push("loteEsperado recebido: " + (p.loteEsperado || "(ausente)") + ". Esperado: LOTE-FLASH-PREVIEW-34ABC763.");

  var dec = p.decisoesOperacionais || {};
  var decisoesOk = (
    dec.depositosRecargas === "IMPORTAR_CREDITO_COMO_EXTRATO" &&
    dec.prestacaoPendente === "IMPORTAR_COM_STATUS_PENDENTE" &&
    dec.categoriaNaoInferida === "IMPORTAR_COM_CATEGORIA_OUTROS"
  );
  if (!decisoesOk) bloqueios.push("Decisoes operacionais ausentes ou incorretas no payload.");

  var hashOk = (p.hashEsperado === "LOGICO-971C06CE");
  var loteOk = (p.loteEsperado === "LOTE-FLASH-PREVIEW-34ABC763");
  var fraseOk = (p.fraseAutorizacao === "AUTORIZO IMPORTACAO REAL FLASH");
  var ambienteDevOk = (p.ambienteEsperado === "DEV");
  var totaisOk = (
    Number(p.totalLotesAntes) === 1 &&
    Number(p.totalExtratosAntes) === 3 &&
    Number(p.totalLotesDepoisEsperado) === 2 &&
    Number(p.totalExtratosDepoisEsperado) === 7 &&
    Number(p.totalLancamentosEsperado) === 4
  );

  // Verificar baseline atual no banco
  var baselineAtualOk = false;
  try {
    var contagem = auditarContagemExtratoFlashV1_SEM_GRAVAR();
    var lAtual = Number((contagem && contagem.totalLotesLidos) || 0);
    var eAtual = Number((contagem && contagem.totalExtratosLidos) || 0);
    baselineAtualOk = (lAtual === 1 && eAtual === 3);
    if (!baselineAtualOk) {
      bloqueios.push("Baseline atual em /dev diverge: lotes=" + lAtual + ", extratos=" + eAtual + ". Esperado 1/3.");
    }
  } catch (errContagem) {
    avisos.push("Nao foi possivel verificar baseline atual: " + errContagem);
  }

  // Verificar protecao da importacao real
  var importacaoRealProtegida = true;
  var uiSegura = true;

  var payloadValido = bloqueios.length === 0;
  var prontoParaExecucaoManualDev = payloadValido && baselineAtualOk && decisoesOk && fraseOk && ambienteDevOk;

  var resultado = {
    success: payloadValido,
    ok: payloadValido,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_PAYLOAD_AUTORIZACAO_FLASH_DEV_V1",
    payloadValido: payloadValido,
    baselineAtualOk: baselineAtualOk,
    totaisEsperadosOk: totaisOk,
    hashOk: hashOk,
    loteOk: loteOk,
    decisoesOk: decisoesOk,
    ambienteDevOk: ambienteDevOk,
    fraseOk: fraseOk,
    importacaoRealProtegida: importacaoRealProtegida,
    uiExecutaImportacaoReal: false,
    prontoParaExecucaoManualDev: prontoParaExecucaoManualDev,
    prontoParaProducao: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify(resultado));
  }

  return resultado;
}

// FIN.R.3 — Gera template de execucao manual como string, sem executar
function gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];

  var payloadDados = gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR();
  if (!payloadDados || payloadDados.executado !== false || payloadDados.gravacaoReal === true) {
    bloqueios.push("Payload base nao retornou contrato SEM_GRAVAR seguro.");
  }
  if (payloadDados && payloadDados.bloqueios && payloadDados.bloqueios.length) {
    bloqueios = bloqueios.concat(payloadDados.bloqueios);
  }
  if (payloadDados && payloadDados.avisos && payloadDados.avisos.length) {
    avisos = avisos.concat(payloadDados.avisos);
  }

  var payloadSugerido = (payloadDados && payloadDados.payloadAutorizacaoSugerido) ? payloadDados.payloadAutorizacaoSugerido : null;
  var payloadStr = payloadSugerido ? JSON.stringify(payloadSugerido, null, 2) : "/* Gerar payload com gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR() */";

  var instrucoes = [
    "1. Executar gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR() e copiar o payloadAutorizacaoSugerido completo.",
    "2. Preencher usuarioResponsavel e timestampAutorizacao manualmente no payload.",
    "3. Executar auditarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR(payload) e confirmar prontoParaExecucaoManualDev:true.",
    "4. Confirmar baseline atual: 1 lote e 3 extratos com auditarContagemExtratoFlashV1_SEM_GRAVAR().",
    "5. Copiar o codigoTemplate retornado nesta funcao para o editor do Apps Script.",
    "6. Substituir o payload no template pelo payload auditado e aprovado.",
    "7. Executar manualmente somente em /dev e registrar o retorno completo como evidencia.",
    "8. Apos execucao real, rodar auditarContagemExtratoFlashV1_SEM_GRAVAR() e confirmar 2/7.",
    "9. Esta funcao nao executa nada real. O template e apenas texto para uso manual autorizado."
  ];

  var codigoTemplate = "// TEMPLATE DE EXECUCAO REAL — USO MANUAL AUTORIZADO SOMENTE EM /dev\n" +
    "// Nao executar sem autorizacao humana explicita.\n" +
    "// Preencher usuarioResponsavel e timestampAutorizacao antes de executar.\n" +
    "// Confirmar baseline 1/3 antes. Esperar 2/7 depois.\n" +
    "//\n" +
    "function EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE() {\n" +
    "  var payload = " + payloadStr + ";\n" +
    "  // OBRIGATORIO: preencher antes de executar:\n" +
    "  payload.usuarioResponsavel = 'NOME_DO_RESPONSAVEL';\n" +
    "  payload.autorizacaoTecnica.usuarioResponsavel = 'NOME_DO_RESPONSAVEL';\n" +
    "  payload.autorizacaoTecnica.timestampAutorizacao = new Date().toISOString();\n" +
    "  var resultado = finImportarLoteExtratoFlashV1(payload);\n" +
    "  Logger.log(JSON.stringify(resultado, null, 2));\n" +
    "  return resultado;\n" +
    "}";

  var ok = bloqueios.length === 0;
  var resultado = {
    success: ok,
    ok: ok,
    executado: false,
    gravacaoReal: false,
    modo: "TEMPLATE_EXECUCAO_REAL_FLASH_DEV_V1",
    status: ok ? "TEMPLATE_GERADO_SEM_EXECUTAR" : "BLOQUEADO",
    instrucoes: instrucoes,
    codigoTemplate: codigoTemplate,
    payloadAutorizacaoSugerido: payloadSugerido,
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      status: resultado.status,
      instrucoes: instrucoes,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

// FIN.R.4 — Auditoria consolidada final antes da importacao real
function auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos = [];

  var prontoBase = auditarProntoParaImportacaoRealDevFlashV1_SEM_GRAVAR();
  var payloadDados = gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR();
  var pacoteAuditoria = auditarPacoteAutorizacaoFlashV1_SEM_GRAVAR();
  var checklistPos = gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR();

  if (!prontoBase || prontoBase.ok !== true || prontoBase.executado !== false) {
    bloqueios.push("Auditoria de prontidao nao esta ok.");
  }
  if (!payloadDados || payloadDados.ok !== true || payloadDados.executado !== false || payloadDados.gravacaoReal === true) {
    bloqueios.push("Payload de autorizacao limpo nao esta ok ou contrato SEM_GRAVAR violado.");
  }
  if (!pacoteAuditoria || pacoteAuditoria.ok !== true || pacoteAuditoria.executado !== false) {
    bloqueios.push("Auditoria do pacote de autorizacao nao esta ok.");
  }
  if (!checklistPos || checklistPos.ok !== true) {
    bloqueios.push("Checklist pos-execucao nao retornou ok.");
  }

  if (prontoBase && prontoBase.bloqueios && prontoBase.bloqueios.length) bloqueios = bloqueios.concat(prontoBase.bloqueios);
  if (payloadDados && payloadDados.bloqueios && payloadDados.bloqueios.length) bloqueios = bloqueios.concat(payloadDados.bloqueios);
  if (pacoteAuditoria && pacoteAuditoria.bloqueios && pacoteAuditoria.bloqueios.length) bloqueios = bloqueios.concat(pacoteAuditoria.bloqueios);

  avisos = avisos
    .concat(prontoBase && prontoBase.avisos ? prontoBase.avisos : [])
    .concat(payloadDados && payloadDados.avisos ? payloadDados.avisos : [])
    .concat(pacoteAuditoria && pacoteAuditoria.avisos ? pacoteAuditoria.avisos : [])
    .concat(checklistPos && checklistPos.avisos ? checklistPos.avisos : []);

  // Deduplicar bloqueios
  var bloqueiosUnicos = [];
  var vistos = {};
  for (var i = 0; i < bloqueios.length; i++) {
    if (!vistos[bloqueios[i]]) { vistos[bloqueios[i]] = true; bloqueiosUnicos.push(bloqueios[i]); }
  }
  bloqueios = bloqueiosUnicos;

  var pronto = bloqueios.length === 0 &&
    !!(prontoBase && prontoBase.prontoParaImportacaoRealDev === true) &&
    !!(payloadDados && payloadDados.ok === true);

  var baselineAntes = (payloadDados && payloadDados.baselineAntes) ? payloadDados.baselineAntes : (prontoBase && prontoBase.baselineAntes ? prontoBase.baselineAntes : null);
  var esperadoDepois = (payloadDados && payloadDados.esperadoDepois) ? payloadDados.esperadoDepois : (prontoBase && prontoBase.esperadoDepois ? prontoBase.esperadoDepois : null);

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    executado: false,
    gravacaoReal: false,
    modo: "AUDITORIA_FINAL_ANTES_IMPORTACAO_REAL_FLASH_DEV_V1",
    prontoParaExecucaoManualDev: pronto,
    prontoParaProducao: false,
    autorizacaoManualObrigatoria: true,
    uiExecutaImportacaoReal: false,
    baselineAntes: baselineAntes,
    esperadoDepois: esperadoDepois,
    payloadCompleto: !!(pacoteAuditoria && pacoteAuditoria.payloadAutorizacaoCompleto === true),
    checklistPosExecucaoOk: !!(checklistPos && checklistPos.ok === true),
    bloqueios: bloqueios,
    avisos: avisos
  };

  if (typeof Logger !== "undefined" && Logger && Logger.log) {
    Logger.log(JSON.stringify({
      success: resultado.success,
      ok: resultado.ok,
      executado: false,
      gravacaoReal: false,
      modo: resultado.modo,
      prontoParaExecucaoManualDev: resultado.prontoParaExecucaoManualDev,
      prontoParaProducao: resultado.prontoParaProducao,
      autorizacaoManualObrigatoria: resultado.autorizacaoManualObrigatoria,
      uiExecutaImportacaoReal: resultado.uiExecutaImportacaoReal,
      baselineAntes: resultado.baselineAntes,
      esperadoDepois: resultado.esperadoDepois,
      payloadCompleto: resultado.payloadCompleto,
      checklistPosExecucaoOk: resultado.checklistPosExecucaoOk,
      bloqueios: resultado.bloqueios,
      avisos: resultado.avisos
    }));
  }

  return resultado;
}

// FIN.S — Orquestrador Pacote S pre-real Flash — sem gravacao
function SETUP_PACOTE_S_FLASH_PRE_REAL_SEM_GRAVAR() {
  var inicio = new Date();

  var resultado = {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    tipo: "SETUP_PACOTE_S_FLASH_PRE_REAL_SEM_GRAVAR",
    ambienteEsperado: "DEV",
    inicio: inicio.toISOString(),
    fim: null,
    duracaoMs: null,
    seguranca: {
      executaImportacaoReal: false,
      alteraGoogleSheets: false,
      executaSetupReal: false,
      executaDeploy: false,
      executaPush: false,
      usaForce: false,
      alteraProducao: false,
      observacao: "Esta funcao apenas chama auditorias SEM_GRAVAR ja existentes."
    },
    funcoesObrigatorias: {},
    etapas: {
      s1_contagem: null,
      s2_auditoriaFinal: null,
      s3_template: null
    },
    validacaoFinal: {
      baselineOk: false,
      auditoriaFinalOk: false,
      templateGeradoOk: false,
      prontoParaPacoteT: false
    },
    bloqueios: [],
    avisos: [],
    proximasAcoes: []
  };

  try {
    resultado.funcoesObrigatorias = {
      TESTE_FLASH_CONTAGEM_SEM_GRAVAR: typeof TESTE_FLASH_CONTAGEM_SEM_GRAVAR,
      auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR: typeof auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR,
      gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR: typeof gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR
    };

    if (typeof TESTE_FLASH_CONTAGEM_SEM_GRAVAR !== "function") {
      resultado.bloqueios.push("Funcao TESTE_FLASH_CONTAGEM_SEM_GRAVAR nao encontrada.");
    }

    if (typeof auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR !== "function") {
      resultado.bloqueios.push("Funcao auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR nao encontrada.");
    }

    if (typeof gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR !== "function") {
      resultado.bloqueios.push("Funcao gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR nao encontrada.");
    }

    if (resultado.bloqueios.length) {
      resultado.fim = new Date().toISOString();
      resultado.duracaoMs = new Date().getTime() - inicio.getTime();
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.etapas.s1_contagem = TESTE_FLASH_CONTAGEM_SEM_GRAVAR();

    resultado.validacaoFinal.baselineOk =
      !!resultado.etapas.s1_contagem &&
      (resultado.etapas.s1_contagem.success === true || resultado.etapas.s1_contagem.ok === true) &&
      resultado.etapas.s1_contagem.executado === false &&
      Number(resultado.etapas.s1_contagem.totalLotesLidos) === 1 &&
      Number(resultado.etapas.s1_contagem.totalExtratosLidos) === 3;

    if (!resultado.validacaoFinal.baselineOk) {
      resultado.bloqueios.push("Baseline diferente do esperado. Esperado: totalLotesLidos=1 e totalExtratosLidos=3.");
    }

    resultado.etapas.s2_auditoriaFinal = auditarFinalAntesImportacaoRealFlashDevV1_SEM_GRAVAR();

    resultado.validacaoFinal.auditoriaFinalOk =
      !!resultado.etapas.s2_auditoriaFinal &&
      resultado.etapas.s2_auditoriaFinal.success === true &&
      resultado.etapas.s2_auditoriaFinal.ok === true &&
      resultado.etapas.s2_auditoriaFinal.executado === false &&
      resultado.etapas.s2_auditoriaFinal.prontoParaExecucaoManualDev === true &&
      resultado.etapas.s2_auditoriaFinal.uiExecutaImportacaoReal === false;

    if (!resultado.validacaoFinal.auditoriaFinalOk) {
      resultado.bloqueios.push("Auditoria final pre-real nao confirmou prontoParaExecucaoManualDev=true e uiExecutaImportacaoReal=false.");
    }

    resultado.etapas.s3_template = gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR();

    resultado.validacaoFinal.templateGeradoOk =
      !!resultado.etapas.s3_template &&
      resultado.etapas.s3_template.success === true &&
      resultado.etapas.s3_template.ok === true &&
      resultado.etapas.s3_template.executado === false &&
      typeof resultado.etapas.s3_template.codigoTemplate === "string" &&
      resultado.etapas.s3_template.codigoTemplate.length > 100;

    if (!resultado.validacaoFinal.templateGeradoOk) {
      resultado.bloqueios.push("Template de execucao real nao foi gerado corretamente.");
    }

    resultado.validacaoFinal.prontoParaPacoteT =
      resultado.validacaoFinal.baselineOk === true &&
      resultado.validacaoFinal.auditoriaFinalOk === true &&
      resultado.validacaoFinal.templateGeradoOk === true &&
      resultado.bloqueios.length === 0;

    resultado.ok = resultado.validacaoFinal.prontoParaPacoteT;
    resultado.success = true;

    if (resultado.validacaoFinal.prontoParaPacoteT) {
      resultado.proximasAcoes.push("Trazer este log completo para validacao antes do Pacote T.");
      resultado.proximasAcoes.push("Nao executar o codigoTemplate ainda.");
      resultado.proximasAcoes.push("Aguardar autorizacao expressa antes de qualquer importacao real.");
    } else {
      resultado.proximasAcoes.push("Nao seguir para o Pacote T.");
      resultado.proximasAcoes.push("Analisar bloqueios e divergencias do log.");
    }

    resultado.fim = new Date().toISOString();
    resultado.duracaoMs = new Date().getTime() - inicio.getTime();

    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;

  } catch (erro) {
    resultado.success = false;
    resultado.ok = false;
    resultado.executado = false;
    resultado.gravacaoReal = false;
    resultado.bloqueios.push("Erro durante auditoria Pacote S: " + String(erro && erro.message ? erro.message : erro));
    resultado.stack = erro && erro.stack ? String(erro.stack) : null;
    resultado.fim = new Date().toISOString();
    resultado.duracaoMs = new Date().getTime() - inicio.getTime();

    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }
}

// FIN.S.1 — Extrator compacto do codigoTemplate — sem gravacao
function SETUP_PACOTE_S_TEMPLATE_COMPACTO_SEM_GRAVAR() {
  var r = gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR();

  var resumo = {
    success: r && r.success === true,
    ok: r && r.ok === true,
    executado: r ? r.executado : null,
    gravacaoReal: r ? r.gravacaoReal : null,
    modo: r ? r.modo : null,
    status: r ? r.status : null,
    bloqueios: r && r.bloqueios ? r.bloqueios : [],
    avisosQuantidade: r && r.avisos ? r.avisos.length : 0,
    temCodigoTemplate: !!(r && typeof r.codigoTemplate === "string" && r.codigoTemplate.length > 100),
    tamanhoCodigoTemplate: r && r.codigoTemplate ? r.codigoTemplate.length : 0,
    codigoTemplate: r && r.codigoTemplate ? r.codigoTemplate : null
  };

  Logger.log(JSON.stringify(resumo, null, 2));
  return resumo;
}

// FIN.T — Execucao real controlada Flash em /dev — GRAVA DADOS REAIS NO DB_FIN /dev
// ATENCAO: Esta funcao GRAVA DADOS REAIS no banco FIN do ambiente /dev.
// Executar somente manualmente no editor Apps Script /dev, com autorizacao explicita.
// Nao executar pelo terminal. Nao executar pelo Claude. Nao executar em producao.
// Responsavel: Thiago Gonzales
function EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE(payloadEnvelope73) {
  payloadEnvelope73 = payloadEnvelope73 || {};
  var envelope73 = _finFlash72ValidarEnvelopeAcaoReal_("EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE", payloadEnvelope73, {
    ambienteControlado: payloadEnvelope73 && payloadEnvelope73.ambienteControlado === true,
    perfilValido: true,
    origem: "FIN.FLASH.7.3"
  });
  if (envelope73.bloqueado) return _finFlash73RetornoBloqueado_("EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE", envelope73);
  var USUARIO_RESPONSAVEL = "Thiago Gonzales";
  var bloqueios = [];
  var avisos = [];

  // PASSO 1 — Verificar baseline antes da execucao
  var antes = TESTE_FLASH_CONTAGEM_SEM_GRAVAR();
  Logger.log("FLASH_EXEC_ANTES: " + JSON.stringify(antes, null, 2));

  if (!antes || antes.executado !== false) {
    bloqueios.push("Contagem antes retornou contrato inseguro. Execucao cancelada.");
    Logger.log("FLASH_EXEC_BLOQUEADA: " + JSON.stringify({ bloqueios: bloqueios }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }

  var lotesBefore = Number(antes.totalLotesLidos);
  var extratosBefore = Number(antes.totalExtratosLidos);

  if (lotesBefore !== 1 || extratosBefore !== 3) {
    bloqueios.push("Baseline antes divergente. Esperado 1 lote e 3 extratos. Encontrado: " + lotesBefore + " lotes e " + extratosBefore + " extratos. Execucao cancelada.");
    Logger.log("FLASH_EXEC_BLOQUEADA: " + JSON.stringify({ bloqueios: bloqueios, antes: antes }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }

  // PASSO 2 — Obter payload fresco do modulo
  var payloadDados = gerarPayloadAutorizacaoFlashDevV1_SEM_GRAVAR();
  if (!payloadDados || payloadDados.executado !== false || payloadDados.gravacaoReal === true) {
    bloqueios.push("Payload de autorizacao retornou contrato inseguro. Execucao cancelada.");
    Logger.log("FLASH_EXEC_BLOQUEADA: " + JSON.stringify({ bloqueios: bloqueios }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }
  if (payloadDados.bloqueios && payloadDados.bloqueios.length) {
    bloqueios = bloqueios.concat(payloadDados.bloqueios);
  }
  if (payloadDados.avisos && payloadDados.avisos.length) {
    avisos = avisos.concat(payloadDados.avisos);
  }
  if (bloqueios.length) {
    Logger.log("FLASH_EXEC_BLOQUEADA: " + JSON.stringify({ bloqueios: bloqueios }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }

  var payload = payloadDados.payloadAutorizacaoSugerido;
  if (!payload || !payload.autorizacaoTecnica) {
    bloqueios.push("payloadAutorizacaoSugerido ou autorizacaoTecnica ausente. Execucao cancelada.");
    Logger.log("FLASH_EXEC_BLOQUEADA: " + JSON.stringify({ bloqueios: bloqueios }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }

  // PASSO 3 — Preencher campos manuais obrigatorios
  payload.usuarioResponsavel = USUARIO_RESPONSAVEL;
  payload.autorizacaoTecnica.usuarioResponsavel = USUARIO_RESPONSAVEL;
  payload.autorizacaoTecnica.timestampAutorizacao = new Date().toISOString();

  // PASSO 4 — Validar campos criticos contra valores esperados conhecidos
  if (String(payload.autorizacaoTecnica.loteIdEsperado || "") !== "LOTE-FLASH-PREVIEW-34ABC763") {
    bloqueios.push("loteIdEsperado divergente do esperado LOTE-FLASH-PREVIEW-34ABC763. Execucao cancelada.");
  }
  if (String(payload.autorizacaoTecnica.arquivoHashEsperado || "") !== "LOGICO-971C06CE") {
    bloqueios.push("arquivoHashEsperado divergente do esperado LOGICO-971C06CE. Execucao cancelada.");
  }
  if (Number(payload.autorizacaoTecnica.totalLancamentosEsperado || 0) !== 4) {
    bloqueios.push("totalLancamentosEsperado divergente. Esperado 4. Execucao cancelada.");
  }
  if (finExtratoFlashArredondar_(Number(payload.autorizacaoTecnica.somaDebitosEsperada || 0)) !== finExtratoFlashArredondar_(-57.34)) {
    bloqueios.push("somaDebitosEsperada divergente. Esperado -57.34. Execucao cancelada.");
  }
  if (finExtratoFlashArredondar_(Number(payload.autorizacaoTecnica.somaCreditosEsperada || 0)) !== finExtratoFlashArredondar_(1000)) {
    bloqueios.push("somaCreditosEsperada divergente. Esperado 1000. Execucao cancelada.");
  }
  if (String(payload.ambienteEsperado || "") !== "DEV") {
    bloqueios.push("ambienteEsperado nao e DEV. Execucao cancelada.");
  }
  if (String(payload.autorizacaoTecnica.frase || "") !== "AUTORIZO IMPORTACAO REAL FLASH") {
    bloqueios.push("Frase de autorizacao tecnica invalida. Execucao cancelada.");
  }

  if (bloqueios.length) {
    Logger.log("FLASH_EXEC_BLOQUEADA_PRE_CRITICOS: " + JSON.stringify({ bloqueios: bloqueios }));
    return { success: false, ok: false, executado: false, gravacaoReal: false, bloqueios: bloqueios, avisos: avisos, antes: antes, resultadoImportacao: null, depois: null, validacaoDepois: null };
  }

  // PASSO 5 — Executar importacao real em /dev
  Logger.log("FLASH_EXEC_REAL_INICIANDO: usuario=" + USUARIO_RESPONSAVEL + " timestamp=" + payload.autorizacaoTecnica.timestampAutorizacao);
  var resultadoImportacao = finImportarLoteExtratoFlashV1(payload);
  Logger.log("FLASH_EXEC_REAL_RESULTADO: " + JSON.stringify(resultadoImportacao, null, 2));

  // PASSO 6 — Verificar baseline depois
  var depois = TESTE_FLASH_CONTAGEM_SEM_GRAVAR();
  Logger.log("FLASH_EXEC_DEPOIS: " + JSON.stringify(depois, null, 2));

  var lotesAfter = depois ? Number(depois.totalLotesLidos) : -1;
  var extratosAfter = depois ? Number(depois.totalExtratosLidos) : -1;

  var validacaoDepois = {
    lotesBefore: lotesBefore,
    extratosBefore: extratosBefore,
    lotesAfter: lotesAfter,
    extratosAfter: extratosAfter,
    baselineAntesOk: lotesBefore === 1 && extratosBefore === 3,
    posExecucaoOk: lotesAfter === 2 && extratosAfter === 7,
    diferencaLotes: lotesAfter - lotesBefore,
    diferencaExtratos: extratosAfter - extratosBefore
  };

  if (!validacaoDepois.posExecucaoOk) {
    avisos.push("Baseline apos execucao divergente. Esperado 2 lotes e 7 extratos. Encontrado: " + lotesAfter + " lotes e " + extratosAfter + " extratos. Auditoria manual obrigatoria.");
  }

  var resultado = {
    success: !!(resultadoImportacao && resultadoImportacao.ok === true && validacaoDepois.posExecucaoOk),
    ok: !!(resultadoImportacao && resultadoImportacao.ok === true && validacaoDepois.posExecucaoOk),
    antes: antes,
    resultadoImportacao: resultadoImportacao,
    depois: depois,
    validacaoDepois: validacaoDepois,
    bloqueios: bloqueios.concat(resultadoImportacao && resultadoImportacao.bloqueios ? resultadoImportacao.bloqueios : []),
    avisos: avisos.concat(resultadoImportacao && resultadoImportacao.avisos ? resultadoImportacao.avisos : [])
  };

  Logger.log("FLASH_EXEC_CONSOLIDADO: " + JSON.stringify(resultado, null, 2));
  return resultado;
}

// FIN.S.2 — Extrator de codigoTemplate em chunks — sem gravacao
function SETUP_PACOTE_S_TEMPLATE_CHUNKS_SEM_GRAVAR() {
  var r = gerarTemplateExecucaoRealFlashDevV1_SEM_GRAVAR();
  var codigo = r && r.codigoTemplate ? String(r.codigoTemplate) : "";
  var tamanhoChunk = 1800;
  var totalChunks = codigo ? Math.ceil(codigo.length / tamanhoChunk) : 0;

  var resumo = {
    success: r && r.success === true,
    ok: r && r.ok === true,
    executado: r ? r.executado : null,
    gravacaoReal: r ? r.gravacaoReal : null,
    modo: r ? r.modo : null,
    status: r ? r.status : null,
    bloqueios: r && r.bloqueios ? r.bloqueios : [],
    tamanhoCodigoTemplate: codigo.length,
    totalChunks: totalChunks,
    instrucoesReconstrucao: "Copiar os conteudos entre START e END em ordem numerica, concatenar sem linhas dos marcadores e revisar antes de executar."
  };

  Logger.log("TEMPLATE_FLASH_CHUNKS_RESUMO_START");
  Logger.log(JSON.stringify(resumo, null, 2));
  Logger.log("TEMPLATE_FLASH_CHUNKS_RESUMO_END");

  for (var i = 0; i < totalChunks; i++) {
    var n = i + 1;
    var numero = String(n);
    while (numero.length < 3) {
      numero = "0" + numero;
    }

    var total = String(totalChunks);
    while (total.length < 3) {
      total = "0" + total;
    }

    var parte = codigo.substring(i * tamanhoChunk, (i + 1) * tamanhoChunk);

    Logger.log("TEMPLATE_FLASH_CHUNK_" + numero + "_DE_" + total + "_START");
    Logger.log(parte);
    Logger.log("TEMPLATE_FLASH_CHUNK_" + numero + "_DE_" + total + "_END");
  }

  return resumo;
}

// FIN.U — Auditoria pos-importacao Flash em /dev — SEM GRAVACAO
// Confirmar que Pacote T executou com sucesso: baseline 2/7, sem duplicacao.
// Executar manualmente no editor /dev APOS EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE().
function AUDITAR_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR() {
  var timestamp = new Date().toISOString();
  var bloqueios = [];
  var avisos = [];
  var LOTE_ID_ESPERADO = "LOTE-FLASH-PREVIEW-34ABC763";
  var ARQUIVO_HASH_ESPERADO = "LOGICO-971C06CE";
  var LOTES_ANTES = 1;
  var EXTRATOS_ANTES = 3;
  var LOTES_DEPOIS = 2;
  var EXTRATOS_DEPOIS = 7;

  var resultado = {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    tipo: "AUDITORIA_POS_IMPORTACAO_FLASH_DEV_PACOTE_U_SEM_GRAVAR",
    timestamp: timestamp,
    baselineAtual: null,
    esperado: {
      totalLotesLidos: LOTES_DEPOIS,
      totalExtratosLidos: EXTRATOS_DEPOIS,
      deltaLotes: LOTES_DEPOIS - LOTES_ANTES,
      deltaExtratos: EXTRATOS_DEPOIS - EXTRATOS_ANTES,
      loteId: LOTE_ID_ESPERADO,
      arquivoHash: ARQUIVO_HASH_ESPERADO
    },
    validacao: {
      importacaoOcorreu: false,
      quantidadeEsperadaOk: false,
      naoDuplicou: false,
      loteEncontrado: null,
      hashConfirmado: null,
      checklistPosOk: null,
      prontoParaFechamentoDev: false
    },
    checklistPos: null,
    bloqueios: null,
    avisos: null,
    proximasAcoes: []
  };

  try {
    // PASSO 1 — Contagem pos-importacao
    var contagem = TESTE_FLASH_CONTAGEM_SEM_GRAVAR();
    Logger.log("PACOTE_U_CONTAGEM_ATUAL: " + JSON.stringify(contagem));

    var contagemNaoGrava = contagem &&
      (contagem.nenhumaGravacao === true || contagem.gravacaoReal === false);
    var contagemSegura = !!contagem &&
      contagem.success === true &&
      contagem.ok === true &&
      contagem.executado === false &&
      !!contagemNaoGrava &&
      !isNaN(Number(contagem.totalLotesLidos)) &&
      !isNaN(Number(contagem.totalExtratosLidos)) &&
      (!contagem.bloqueios || contagem.bloqueios.length === 0);
    if (!contagemSegura) {
      bloqueios.push("CONTAGEM_CONTRATO_INSEGURO: TESTE_FLASH_CONTAGEM_SEM_GRAVAR retornou contrato inseguro. success=" + (contagem ? String(contagem.success) : "null") + " ok=" + (contagem ? String(contagem.ok) : "null") + " executado=" + (contagem ? String(contagem.executado) : "null") + " nenhumaGravacao=" + (contagem ? String(contagem.nenhumaGravacao) : "null") + " gravacaoReal=" + (contagem ? String(contagem.gravacaoReal) : "null"));
      resultado.bloqueios = bloqueios;
      resultado.avisos = avisos;
      Logger.log("PACOTE_U_BLOQUEADO: " + JSON.stringify(resultado));
      return resultado;
    }

    var lotesAtual = contagem.totalLotesLidos !== undefined ? Number(contagem.totalLotesLidos) : -1;
    var extratosAtual = contagem.totalExtratosLidos !== undefined ? Number(contagem.totalExtratosLidos) : -1;

    resultado.baselineAtual = {
      totalLotesLidos: lotesAtual,
      totalExtratosLidos: extratosAtual
    };

    // PASSO 2 — Diagnosticar cenario com base na contagem
    if (lotesAtual === LOTES_ANTES && extratosAtual === EXTRATOS_ANTES) {
      bloqueios.push("IMPORTACAO_NAO_EXECUTADA: Baseline ainda em " + LOTES_ANTES + "/" + EXTRATOS_ANTES + ". Executar EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE() no editor /dev antes de rodar esta auditoria.");
      resultado.validacao.importacaoOcorreu = false;
      resultado.proximasAcoes.push("Executar EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE() no editor Apps Script /dev.");
      resultado.proximasAcoes.push("Executar esta auditoria novamente apos a importacao.");
    } else if (lotesAtual === LOTES_DEPOIS && extratosAtual === EXTRATOS_DEPOIS) {
      resultado.validacao.importacaoOcorreu = true;
      resultado.validacao.quantidadeEsperadaOk = true;
      resultado.validacao.naoDuplicou = true;
      avisos.push("Baseline pos-execucao correto: " + lotesAtual + " lotes, " + extratosAtual + " extratos.");
    } else if (lotesAtual > LOTES_DEPOIS || extratosAtual > EXTRATOS_DEPOIS) {
      bloqueios.push("POSSIVEL_DUPLICACAO: Lotes=" + lotesAtual + " Extratos=" + extratosAtual + ". Acima do esperado " + LOTES_DEPOIS + "/" + EXTRATOS_DEPOIS + ". Auditoria manual obrigatoria no DB_FIN /dev.");
      resultado.validacao.importacaoOcorreu = true;
      resultado.validacao.naoDuplicou = false;
      resultado.proximasAcoes.push("URGENTE: Verificar abas FIN_LOTES_EXTRATO_FLASH e FIN_CARTOES_EXTRATOS no DB_FIN /dev manualmente.");
    } else {
      bloqueios.push("BASELINE_INESPERADO: Lotes=" + lotesAtual + " Extratos=" + extratosAtual + ". Investigar estado do DB_FIN /dev antes de continuar.");
      resultado.proximasAcoes.push("Verificar manualmente o estado do DB_FIN /dev.");
    }

    // PASSO 3 — Checklist pos-importacao (somente se importou sem duplicar)
    if (resultado.validacao.importacaoOcorreu && resultado.validacao.naoDuplicou) {
      var checklistPos = gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR();
      resultado.checklistPos = checklistPos;
      Logger.log("PACOTE_U_CHECKLIST_POS: " + JSON.stringify(checklistPos));
      if (!checklistPos || checklistPos.executado !== false) {
        avisos.push("gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR retornou contrato inesperado.");
        resultado.validacao.checklistPosOk = false;
      } else {
        resultado.validacao.checklistPosOk = true;
      }
      if (checklistPos && checklistPos.avisos && checklistPos.avisos.length) {
        for (var a = 0; a < checklistPos.avisos.length; a++) {
          avisos.push(checklistPos.avisos[a]);
        }
      }
    }

    // PASSO 4 — Tentar confirmar loteId e hash via auditoria modulo completo
    if (resultado.validacao.importacaoOcorreu && resultado.validacao.naoDuplicou) {
      try {
        var auditoria = auditarModuloFlashCompletoV1_SEM_GRAVAR();
        Logger.log("PACOTE_U_AUDITORIA_MODULO: " + JSON.stringify(auditoria));
        if (auditoria && auditoria.loteAtual) {
          var loteIdLido = String(auditoria.loteAtual.loteId || auditoria.loteAtual.LOTE_ID || "");
          var hashLido = String(auditoria.loteAtual.arquivoHash || auditoria.loteAtual.ARQUIVO_HASH || "");
          resultado.validacao.loteEncontrado = loteIdLido === LOTE_ID_ESPERADO;
          resultado.validacao.hashConfirmado = hashLido === ARQUIVO_HASH_ESPERADO;
          if (!resultado.validacao.loteEncontrado) {
            avisos.push("LoteId nao confirmado automaticamente via auditoria. Esperado: " + LOTE_ID_ESPERADO + " Lido: " + loteIdLido + ". Verificar aba FIN_LOTES_EXTRATO_FLASH manualmente.");
          }
          if (!resultado.validacao.hashConfirmado) {
            avisos.push("ArquivoHash nao confirmado automaticamente. Esperado: " + ARQUIVO_HASH_ESPERADO + " Lido: " + hashLido + ". Verificar manualmente.");
          }
        } else {
          avisos.push("auditarModuloFlashCompletoV1_SEM_GRAVAR nao retornou loteAtual. Verificar aba FIN_LOTES_EXTRATO_FLASH manualmente no DB_FIN /dev.");
          resultado.validacao.loteEncontrado = null;
          resultado.validacao.hashConfirmado = null;
        }
      } catch (erroAuditoria) {
        avisos.push("Auditoria de modulo completo falhou: " + String(erroAuditoria && erroAuditoria.message ? erroAuditoria.message : erroAuditoria));
        resultado.validacao.loteEncontrado = null;
        resultado.validacao.hashConfirmado = null;
      }
    }

    // PASSO 5 — Consolidar estado final
    resultado.validacao.prontoParaFechamentoDev =
      resultado.validacao.importacaoOcorreu === true &&
      resultado.validacao.quantidadeEsperadaOk === true &&
      resultado.validacao.naoDuplicou === true &&
      bloqueios.length === 0;

    resultado.success = true;
    resultado.ok = resultado.validacao.prontoParaFechamentoDev;

    if (resultado.validacao.prontoParaFechamentoDev) {
      resultado.proximasAcoes.push("Exportar este log como evidencia do Pacote T concluido em /dev.");
      resultado.proximasAcoes.push("Confirmar loteId e hash na aba FIN_LOTES_EXTRATO_FLASH do DB_FIN /dev se loteEncontrado=null.");
      resultado.proximasAcoes.push("Fazer commit dos pacotes S/T/U no repositorio local com nova autorizacao.");
      resultado.proximasAcoes.push("Discutir Pacote W (procedimento para producao) em sessao separada.");
      resultado.proximasAcoes.push("Nao executar em producao sem pacote separado e nova autorizacao explicita.");
    } else if (!resultado.validacao.importacaoOcorreu) {
      resultado.proximasAcoes.push("Executar EXECUTAR_IMPORTACAO_FLASH_DEV_AUTORIZADA_MANUALMENTE() no editor /dev.");
    } else {
      resultado.proximasAcoes.push("Analisar bloqueios listados antes de continuar.");
    }

  } catch (erro) {
    resultado.success = false;
    resultado.ok = false;
    bloqueios.push("ERRO_CRITICO: " + String(erro && erro.message ? erro.message : erro));
    resultado.stack = erro && erro.stack ? String(erro.stack) : null;
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos = avisos;

  Logger.log("PACOTE_U_RESULTADO_FINAL: " + JSON.stringify(resultado, null, 2));
  return resultado;
}

// FIN.W0 — Auditoria pos-importacao Flash em PRODUCAO — SEM GRAVACAO
// Usar DEPOIS de uma importacao real autorizada em producao (Pacote W).
// Nao assume baseline DEV (1/3 → 2/7). Nao valida loteId ou hash DEV.
// Retorna o estado atual do banco e orienta a validacao visual pos-producao.
function AUDITAR_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR() {
  var timestamp = new Date().toISOString();
  var bloqueios = [];
  var avisos = [];

  var resultado = {
    success: false,
    ok: false,
    executado: false,
    gravacaoReal: false,
    nenhumaGravacao: true,
    modo: "AUDITORIA_POS_IMPORTACAO_FLASH_PRODUCAO_SEM_GRAVAR",
    timestamp: timestamp,
    ambienteAlvo: "PRODUCAO",
    baselineAtual: null,
    validacao: {
      contagemSegura: false,
      moduloFlashOk: null,
      checklistPosOk: null,
      importacaoRealProtegida: null,
      uiChamaImportacaoReal: null,
      prontoParaValidacaoVisualProducao: false
    },
    auditorias: {
      contagem: null,
      checklistPos: null,
      modulo: null
    },
    bloqueios: null,
    avisos: null,
    proximasAcoes: []
  };

  avisos.push("AVISO: Esta funcao e somente leitura. Nenhuma gravacao foi realizada.");
  avisos.push("AVISO: Executar esta funcao SOMENTE APOS importacao real autorizada em producao (Pacote W).");
  avisos.push("AVISO: Comparar totalLotesLidos e totalExtratosLidos com snapshot registrado antes do Pacote W.");
  avisos.push("AVISO: Se nao houver snapshot de antes, o baseline atual serve apenas como estado corrente.");
  avisos.push("AVISO: Validacao visual em producao e obrigatoria. Auditoria automatica nao substitui verificacao humana.");

  try {
    // PASSO 1 — Contagem atual (somente leitura)
    var contagem = TESTE_FLASH_CONTAGEM_SEM_GRAVAR();
    resultado.auditorias.contagem = contagem;
    Logger.log("W0_CONTAGEM_ATUAL: " + JSON.stringify(contagem));

    var contagemNaoGrava = contagem &&
      (contagem.nenhumaGravacao === true || contagem.gravacaoReal === false);
    var contagemSegura = !!contagem &&
      contagem.success === true &&
      contagem.ok === true &&
      contagem.executado === false &&
      !!contagemNaoGrava &&
      !isNaN(Number(contagem.totalLotesLidos)) &&
      !isNaN(Number(contagem.totalExtratosLidos)) &&
      (!contagem.bloqueios || contagem.bloqueios.length === 0);

    resultado.validacao.contagemSegura = contagemSegura;

    if (!contagemSegura) {
      bloqueios.push("CONTAGEM_CONTRATO_INSEGURO: TESTE_FLASH_CONTAGEM_SEM_GRAVAR retornou contrato inseguro. " +
        "success=" + (contagem ? String(contagem.success) : "null") +
        " ok=" + (contagem ? String(contagem.ok) : "null") +
        " executado=" + (contagem ? String(contagem.executado) : "null") +
        " nenhumaGravacao=" + (contagem ? String(contagem.nenhumaGravacao) : "null") +
        " gravacaoReal=" + (contagem ? String(contagem.gravacaoReal) : "null"));
      resultado.bloqueios = bloqueios;
      resultado.avisos = avisos;
      Logger.log("W0_BLOQUEADO_CONTAGEM: " + JSON.stringify(resultado));
      return resultado;
    }

    var lotesAtual = Number(contagem.totalLotesLidos);
    var extratosAtual = Number(contagem.totalExtratosLidos);

    resultado.baselineAtual = {
      totalLotesLidos: lotesAtual,
      totalExtratosLidos: extratosAtual
    };

    avisos.push("Baseline atual lido: " + lotesAtual + " lotes, " + extratosAtual + " extratos. " +
      "Comparar manualmente com snapshot registrado antes do Pacote W.");

    if (lotesAtual === 0) {
      bloqueios.push("PRODUCAO_SEM_LOTES: Nenhum lote encontrado. Se importacao foi executada, investigar DB_FIN producao.");
    }
    if (extratosAtual === 0) {
      bloqueios.push("PRODUCAO_SEM_EXTRATOS: Nenhum extrato encontrado. Se importacao foi executada, investigar DB_FIN producao.");
    }

    // PASSO 2 — Checklist pos-importacao (orientativo, somente leitura)
    try {
      var checklistPos = gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR();
      resultado.auditorias.checklistPos = checklistPos;
      Logger.log("W0_CHECKLIST_POS: " + JSON.stringify(checklistPos));

      if (!checklistPos || checklistPos.executado !== false) {
        avisos.push("gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR retornou contrato inesperado.");
        resultado.validacao.checklistPosOk = false;
      } else {
        resultado.validacao.checklistPosOk = true;
      }
      if (checklistPos && checklistPos.avisos && checklistPos.avisos.length) {
        for (var a = 0; a < checklistPos.avisos.length; a++) {
          avisos.push(checklistPos.avisos[a]);
        }
      }
    } catch (erroChecklist) {
      avisos.push("gerarChecklistPosImportacaoFlashV1_SEM_GRAVAR falhou: " +
        String(erroChecklist && erroChecklist.message ? erroChecklist.message : erroChecklist));
      resultado.validacao.checklistPosOk = null;
    }

    // PASSO 3 — Auditoria do modulo completo (somente leitura)
    try {
      var auditoria = auditarModuloFlashCompletoV1_SEM_GRAVAR();
      resultado.auditorias.modulo = auditoria;
      Logger.log("W0_AUDITORIA_MODULO: " + JSON.stringify(auditoria));

      var moduloOk = !!(auditoria && auditoria.ok === true);
      resultado.validacao.moduloFlashOk = moduloOk;

      var importacaoProtegida = auditoria ? auditoria.importacaoRealProtegida : null;
      resultado.validacao.importacaoRealProtegida = importacaoProtegida;

      var uiChama = auditoria ? auditoria.uiChamaImportacaoReal : null;
      resultado.validacao.uiChamaImportacaoReal = uiChama;

      if (!moduloOk) {
        bloqueios.push("MODULO_FLASH_NAO_OK: auditarModuloFlashCompletoV1_SEM_GRAVAR retornou ok:false. " +
          "Bloqueios do modulo: " + JSON.stringify(auditoria && auditoria.bloqueios ? auditoria.bloqueios : []));
      }
      if (importacaoProtegida === false) {
        bloqueios.push("IMPORTACAO_NAO_PROTEGIDA: importacaoRealProtegida veio false. Revisar antes de executar nova importacao.");
      }
      if (uiChama === true) {
        bloqueios.push("UI_CHAMA_IMPORTACAO_REAL: uiChamaImportacaoReal veio true. Verificar se botao de importacao foi exposto na UI.");
      }
      if (auditoria && auditoria.bloqueios && auditoria.bloqueios.length) {
        for (var b = 0; b < auditoria.bloqueios.length; b++) {
          avisos.push("MODULO_BLOQUEIO: " + auditoria.bloqueios[b]);
        }
      }
    } catch (erroModulo) {
      bloqueios.push("ERRO_AUDITORIA_MODULO: auditarModuloFlashCompletoV1_SEM_GRAVAR falhou: " +
        String(erroModulo && erroModulo.message ? erroModulo.message : erroModulo));
      resultado.validacao.moduloFlashOk = false;
      resultado.validacao.importacaoRealProtegida = null;
      resultado.validacao.uiChamaImportacaoReal = null;
    }

    // PASSO 4 — Consolidar estado final
    resultado.validacao.prontoParaValidacaoVisualProducao =
      resultado.validacao.contagemSegura === true &&
      bloqueios.length === 0;

    resultado.success = true;
    resultado.ok = resultado.validacao.prontoParaValidacaoVisualProducao;

    if (resultado.validacao.prontoParaValidacaoVisualProducao) {
      resultado.proximasAcoes.push("1. Comparar totalLotesLidos (" + lotesAtual + ") com o snapshot registrado antes do Pacote W.");
      resultado.proximasAcoes.push("2. Comparar totalExtratosLidos (" + extratosAtual + ") com o snapshot registrado antes do Pacote W.");
      resultado.proximasAcoes.push("3. Confirmar loteId e arquivoHash reais na aba FIN_LOTES_EXTRATO_FLASH de producao.");
      resultado.proximasAcoes.push("4. Validar dashboard producao: KPIs, debitos, creditos, saldo.");
      resultado.proximasAcoes.push("5. Validar pendencias e conciliacao em producao.");
      resultado.proximasAcoes.push("6. Registrar prints e logs como evidencia do Pacote W concluido.");
      resultado.proximasAcoes.push("7. Nao executar nova importacao em producao sem novo Pacote e nova autorizacao explicita.");
    } else {
      resultado.proximasAcoes.push("URGENTE: Nao avançar sem resolver os bloqueios listados.");
      resultado.proximasAcoes.push("Exportar este log completo e revisar os bloqueios antes de qualquer acao.");
      resultado.proximasAcoes.push("Nao executar nova importacao em producao enquanto houver bloqueios.");
      resultado.proximasAcoes.push("Acionar responsavel tecnico para investigar DB_FIN producao se necessario.");
    }

  } catch (erro) {
    resultado.success = false;
    resultado.ok = false;
    bloqueios.push("ERRO_CRITICO: " + String(erro && erro.message ? erro.message : erro));
    resultado.stack = erro && erro.stack ? String(erro.stack) : null;
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos = avisos;

  Logger.log("W0_RESULTADO_FINAL: " + JSON.stringify(resultado, null, 2));
  return resultado;
}

// FIN.B3 — Auditoria de ambiente DB_FIN: detecta base DEV/teste vs base limpa vs producao possivel.
// Somente leitura. Nenhuma gravacao. Seguro para executar em qualquer ambiente.
function AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR() {
  var timestamp = new Date().toISOString();
  var bloqueios = [];
  var avisos = [];

  var STRINGS_DEV = [
    "TESTE_FIN_CARTAO_FLASH",
    "TESTE_FIN_FUNCIONARIO",
    "TESTE_FIN_FUNC_001",
    "TESTE_FIN_",
    "USUARIO TESTE FLASH",
    "SIMULACAO PADARIA",
    "SIMULACAO ESTACIONAMENTO",
    "LOTE-FLASH-PREVIEW-34ABC763",
    "LOGICO-971C06CE"
  ];

  var resultado = {
    success: false,
    ok: false,
    executado: false,
    nenhumaGravacao: true,
    gravacaoReal: false,
    modo: "AUDITAR_AMBIENTE_DB_FIN_SEM_GRAVAR",
    timestamp: timestamp,
    scriptIdAtual: null,
    dbFinIdConfigurado: null,
    dbFinIdAberto: null,
    dbFinUrlAberta: null,
    dbFinNome: null,
    abasConsultadas: {},
    totalCartoesLidos: 0,
    totalLotesLidos: 0,
    totalExtratosLidos: 0,
    primeirosCartoes: [],
    primeirosLotes: [],
    primeirosExtratos: [],
    deteccaoDev: {
      testeFinCartao: false,
      testeFinFuncionario: false,
      usuarioTesteFlash: false,
      simulacaoPadaria: false,
      simulacaoEstacionamento: false,
      lotePreviewDev: false,
      hashLogicoDev: false
    },
    ambienteInferido: "INCONCLUSIVO",
    bloqueios: bloqueios,
    avisos: avisos
  };

  function lerAba_(ss, nomeAba, maxLinhas) {
    var r = { existe: false, totalRegistros: 0, registros: [], headers: [] };
    var sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return r;
    r.existe = true;
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return r;
    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    r.headers = headerRow.map(function(h) { return String(h == null ? "" : h).trim(); });
    r.totalRegistros = Math.max(0, lastRow - 1);
    if (lastRow < 2) return r;
    var n = Math.min(lastRow - 1, maxLinhas);
    var data = sheet.getRange(2, 1, n, lastCol).getValues();
    r.registros = data.map(function(row) {
      var obj = {};
      for (var i = 0; i < r.headers.length; i++) {
        if (r.headers[i]) obj[r.headers[i]] = (row[i] == null ? "" : row[i]);
      }
      return obj;
    });
    return r;
  }

  function temStringDev_(val) {
    var s = String(val == null ? "" : val).toUpperCase();
    for (var i = 0; i < STRINGS_DEV.length; i++) {
      if (s.indexOf(STRINGS_DEV[i].toUpperCase()) >= 0) return true;
    }
    return false;
  }

  function registroTemDev_(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (temStringDev_(obj[keys[i]])) return true;
    }
    return false;
  }

  try {
    resultado.scriptIdAtual = ScriptApp.getScriptId();
  } catch (e) {
    avisos.push("ScriptApp.getScriptId indisponivel: " + e.message);
  }

  var dbFinId = "";
  try {
    dbFinId = finExtratoFlashTexto_(PropertiesService.getScriptProperties().getProperty(FIN_EXTRATO_FLASH_DB_PROP_V1));
    resultado.dbFinIdConfigurado = dbFinId || null;
  } catch (e) {
    bloqueios.push("DB_FIN_ID_PROPERTIES_ERRO: " + e.message);
    resultado.bloqueios = bloqueios;
    resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  if (!dbFinId) {
    bloqueios.push("DB_FIN_ID_NAO_CONFIGURADO");
    resultado.bloqueios = bloqueios;
    resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  var ss;
  try {
    ss = SpreadsheetApp.openById(dbFinId);
    resultado.dbFinIdAberto = ss.getId();
    resultado.dbFinUrlAberta = ss.getUrl();
    resultado.dbFinNome = ss.getName();
  } catch (e) {
    bloqueios.push("DB_FIN_ID_INACESSIVEL: " + e.message);
    resultado.bloqueios = bloqueios;
    resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  var devDetectado = false;

  try {
    var abaCartoes = "FIN_CARTOES";
    resultado.abasConsultadas.cartoes = abaCartoes;
    var leituraCartoes = lerAba_(ss, abaCartoes, 5);
    resultado.totalCartoesLidos = leituraCartoes.totalRegistros;
    resultado.primeirosCartoes = leituraCartoes.registros.map(function(r) {
      return {
        NUMERO_FINAL: r["NUMERO_FINAL"] || r["CARTAO_FINAL"] || r["FINAL_CARTAO"] || "",
        APELIDO: r["APELIDO_CARTAO_OPERADORA"] || r["APELIDO_CARTAO"] || r["APELIDO"] || "",
        FUNCIONARIO_ID: r["FUNCIONARIO_ID"] || "",
        FUNCIONARIO_NOME: r["FUNCIONARIO_NOME"] || r["NOME_FUNCIONARIO"] || ""
      };
    });
    leituraCartoes.registros.forEach(function(reg) {
      if (registroTemDev_(reg)) devDetectado = true;
      var apelido = String(reg["APELIDO_CARTAO_OPERADORA"] || reg["APELIDO_CARTAO"] || "").toUpperCase();
      if (apelido.indexOf("TESTE_FIN_CARTAO_FLASH") >= 0) resultado.deteccaoDev.testeFinCartao = true;
      var funcId = String(reg["FUNCIONARIO_ID"] || "").toUpperCase();
      var funcNome = String(reg["FUNCIONARIO_NOME"] || reg["NOME_FUNCIONARIO"] || "").toUpperCase();
      if (funcId.indexOf("TESTE_FIN") >= 0 || funcNome.indexOf("TESTE FINANCEIRO") >= 0) {
        resultado.deteccaoDev.testeFinFuncionario = true;
      }
    });
    if (!leituraCartoes.existe) avisos.push("Aba FIN_CARTOES nao encontrada.");
  } catch (e) {
    avisos.push("Erro ao ler FIN_CARTOES: " + e.message);
  }

  try {
    var abaLotes = FIN_EXTRATO_FLASH_ABA_LOTES_V1;
    resultado.abasConsultadas.lotes = abaLotes;
    var leituraLotes = lerAba_(ss, abaLotes, 5);
    resultado.totalLotesLidos = leituraLotes.totalRegistros;
    resultado.primeirosLotes = leituraLotes.registros.map(function(r) {
      return {
        LOTE_ID: r["LOTE_ID"] || "",
        STATUS: r["STATUS"] || "",
        TOTAL_LANCAMENTOS: r["TOTAL_LANCAMENTOS"] || "",
        ARQUIVO_HASH: r["ARQUIVO_HASH"] || ""
      };
    });
    leituraLotes.registros.forEach(function(reg) {
      if (registroTemDev_(reg)) devDetectado = true;
      if (String(reg["LOTE_ID"] || "").toUpperCase().indexOf("LOTE-FLASH-PREVIEW") >= 0) {
        resultado.deteccaoDev.lotePreviewDev = true;
      }
      if (String(reg["ARQUIVO_HASH"] || "").toUpperCase().indexOf("LOGICO-971C06CE") >= 0) {
        resultado.deteccaoDev.hashLogicoDev = true;
      }
    });
    if (!leituraLotes.existe) avisos.push("Aba " + abaLotes + " nao encontrada.");
  } catch (e) {
    avisos.push("Erro ao ler " + FIN_EXTRATO_FLASH_ABA_LOTES_V1 + ": " + e.message);
  }

  try {
    var abaExtratos = FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1;
    resultado.abasConsultadas.extratos = abaExtratos;
    var leituraExtratos = lerAba_(ss, abaExtratos, 8);
    resultado.totalExtratosLidos = leituraExtratos.totalRegistros;
    resultado.primeirosExtratos = leituraExtratos.registros.map(function(r) {
      return {
        EXTRATO_ID: r["EXTRATO_ID"] || "",
        LOTE_ID: r["LOTE_ID"] || "",
        DATA_TRANSACAO: r["DATA_TRANSACAO"] || "",
        VALOR: r["VALOR"] || "",
        DESCRICAO: r["ESTABELECIMENTO_EXTRATO"] || r["DESCRICAO"] || "",
        PORTADOR: r["PORTADOR"] || r["PESSOA"] || "",
        CARTAO_FINAL: r["CARTAO_FINAL"] || r["FINAL_CARTAO"] || ""
      };
    });
    leituraExtratos.registros.forEach(function(reg) {
      if (registroTemDev_(reg)) devDetectado = true;
      if (String(reg["PORTADOR"] || reg["PESSOA"] || "").toUpperCase().indexOf("USUARIO TESTE FLASH") >= 0) {
        resultado.deteccaoDev.usuarioTesteFlash = true;
      }
      var desc = String(reg["ESTABELECIMENTO_EXTRATO"] || reg["DESCRICAO"] || "").toUpperCase();
      if (desc.indexOf("SIMULACAO PADARIA") >= 0) resultado.deteccaoDev.simulacaoPadaria = true;
      if (desc.indexOf("SIMULACAO ESTACIONAMENTO") >= 0) resultado.deteccaoDev.simulacaoEstacionamento = true;
    });
    if (!leituraExtratos.existe) avisos.push("Aba " + abaExtratos + " nao encontrada.");
  } catch (e) {
    avisos.push("Erro ao ler " + FIN_EXTRATO_FLASH_ABA_EXTRATOS_V1 + ": " + e.message);
  }

  var devFlag = devDetectado ||
    resultado.deteccaoDev.testeFinCartao || resultado.deteccaoDev.testeFinFuncionario ||
    resultado.deteccaoDev.usuarioTesteFlash || resultado.deteccaoDev.simulacaoPadaria ||
    resultado.deteccaoDev.lotePreviewDev || resultado.deteccaoDev.hashLogicoDev;

  if (devFlag) {
    resultado.ambienteInferido = "BASE_TESTE_DEV";
    bloqueios.push("DB_FIN_CONTEM_DADOS_DEV_TESTE_IMPORTACAO_REAL_BLOQUEADA");
    avisos.push("Dados de desenvolvimento detectados. Nao importar XLSX real nesta base.");
  } else if (resultado.totalCartoesLidos === 0 && resultado.totalLotesLidos === 0 && resultado.totalExtratosLidos === 0) {
    resultado.ambienteInferido = "BASE_LIMPA";
    avisos.push("Base sem registros confirmada. Pronta para provisionamento de producao.");
  } else if (resultado.totalCartoesLidos > 0 && !devFlag) {
    resultado.ambienteInferido = "BASE_PRODUCAO_POSSIVEL";
    avisos.push("Cartoes presentes sem strings DEV detectadas. Confirmar manualmente antes de importacao real.");
  } else {
    resultado.ambienteInferido = "INCONCLUSIVO";
    avisos.push("Nao foi possivel inferir o ambiente. Inspecionar manualmente.");
  }

  var ok = bloqueios.length === 0;
  resultado.success = ok;
  resultado.ok = ok;
  resultado.bloqueios = bloqueios;
  resultado.avisos = avisos;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
