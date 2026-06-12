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
  var avisos = [];
  var bloqueios = [];
  var checklist = [];

  try {
    var dryRun = finExtratoFlashObterDryRunPreparacao_(payload || {}, avisos, bloqueios);
    var preConfirmacao = finExtratoFlashObterPreConfirmacaoPreparacao_(payload || {}, dryRun, avisos, bloqueios);
    var pendencias = finExtratoFlashDetectarPendenciasOperacionais_(dryRun ? dryRun.lancamentosDryRun : []);
    var loteParaGravacao = finExtratoFlashMontarLoteParaGravacaoFutura_(dryRun);
    var extratosParaGravacao = finExtratoFlashMontarExtratosParaGravacaoFutura_(dryRun);
    var plano = finExtratoFlashPlanoGravacaoFuturo_();

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
    totalPrestacaoPendente: pendencias ? pendencias.totalPrestacaoPendente : 0
  };
}

function finExtratoFlashDetectarPendenciasOperacionais_(lancamentos) {
  var lista = lancamentos || [];
  var depositos = [];
  var pendentes = [];
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i] || {};
    var descricao = finExtratoFlashTexto_(item.descricaoLimpa || item.movimentacaoOriginal).toUpperCase();
    var status = finExtratoFlashTexto_(item.statusPrestacaoNormalizado || item.statusPrestacaoOriginal).toUpperCase();
    if (item.sinal === "CREDITO" || descricao.indexOf("DEPOSITO") >= 0 || descricao.indexOf("DEPÓSITO") >= 0 || descricao.indexOf("RECARGA") >= 0) {
      depositos.push({ linhaOrigem: item.linhaOrigem || "", descricao: item.descricaoLimpa || item.movimentacaoOriginal || "", valorNumero: item.valorNumero });
    }
    if (status.indexOf("PENDENTE") >= 0) {
      pendentes.push({ linhaOrigem: item.linhaOrigem || "", descricao: item.descricaoLimpa || item.movimentacaoOriginal || "", statusPrestacao: status });
    }
  }
  return {
    totalDepositosRecargas: depositos.length,
    totalPrestacaoPendente: pendentes.length,
    depositosRecargas: depositos,
    prestacoesPendentes: pendentes,
    bloqueiaImportacaoRealFutura: !!(depositos.length || pendentes.length)
  };
}

function finExtratoFlashPendenciasOperacionaisVazias_() {
  return {
    totalDepositosRecargas: 0,
    totalPrestacaoPendente: 0,
    depositosRecargas: [],
    prestacoesPendentes: [],
    bloqueiaImportacaoRealFutura: false
  };
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
