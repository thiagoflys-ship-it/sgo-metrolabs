// SGO_Fin_Extratos.js - METROLABS SGO+
// Modulo FIN - Preview de extratos Flash.
// FIN.11.2 - parser/preview sem gravacao. Nao executa nada automaticamente.

var FIN_EXTRATO_FLASH_MODO_PREVIEW_V1 = "PREVIEW_EXTRATO_FLASH_XLSX_V1";

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
