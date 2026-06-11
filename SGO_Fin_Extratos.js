// SGO_Fin_Extratos.js - METROLABS SGO+
// Modulo FIN - Preview de extratos Flash.
// FIN.11.2 - parser/preview sem gravacao. Nao executa nada automaticamente.

var FIN_EXTRATO_FLASH_MODO_PREVIEW_V1 = "PREVIEW_EXTRATO_FLASH_XLSX_V1";
var FIN_EXTRATO_FLASH_MODO_DRY_RUN_LOTE_V1 = "DRY_RUN_LOTE_EXTRATO_FLASH_V1";

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

    finExtratoFlashAvisosDryRun_(lancamentos, avisos);
    var loteProposto = finExtratoFlashMontarLoteProposto_(entrada, resumo, lancamentos);
    var duplicidades = finExtratoFlashSimularDuplicidades_(entrada, loteProposto, lancamentos, avisos);
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
      motivos.push("Chave de duplicidade encontrada em dados existentes simulados.");
    }
    if (!item.pessoa || !item.dataIso || item.valorNumero === null || item.valorNumero === undefined) {
      status = "BLOQUEADO";
      motivos.push("Lancamento sem pessoa, dataIso ou valorNumero seguro.");
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
