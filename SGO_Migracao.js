// ============================================================
// SGO_Migracao.js — Diagnóstico e planejamento MIG
// Somente leitura — não altera nenhuma fonte de dados.
// ============================================================

var MIG_DEV_SCRIPT_ID_ = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

// Nomes candidatos por entidade (origem pode variar)
var MIG_NOMES_ = {
  clientes     : ["CAD_CLIENTES","CLIENTES","CLIENTS","CADASTRO_CLIENTES","CLIENTES_ATIVOS"],
  unidades     : ["CAD_UNIDADES","UNIDADES","UNITS","CAD_LOCAIS","LOCAIS","FILIAIS","CAD_FILIAIS"],
  equipamentos : ["CAD_EQUIPAMENTOS","EQUIPAMENTOS","EQUIPMENT","CAD_ATIVOS","ATIVOS","CAD_MAQUINAS"],
  os           : ["CAD_OS","OS","ORDENS_SERVICO","ORDENS","ORDEM_SERVICO","TICKETS"],
  atendimentos : ["CAD_ATENDIMENTOS","ATENDIMENTOS","REGISTROS","CAD_REGISTROS","SERVICOS"],
  documentos   : ["CAD_DOCUMENTOS","DOCUMENTOS","DOCS","RELATORIOS","CERTIFICADOS"],
  tecnicos     : ["CAD_TECNICOS","TECNICOS","TECHNICIANS"],
  contratos    : ["CAD_CONTRATOS","CONTRATOS","CONTRACTS"]
};

// ── Helpers internos ──────────────────────────────────────────

function migLerAba_(ss, nomesAlternativos, maxAmostra) {
  var maxAm = maxAmostra || 3;
  for (var n = 0; n < nomesAlternativos.length; n++) {
    var sh = ss.getSheetByName(nomesAlternativos[n]);
    if (!sh) continue;
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var headers = [];
    var amostra = [];
    if (lastRow >= 1 && lastCol >= 1) {
      headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
        .map(function (v) { return String(v || "").trim(); })
        .filter(function (v) { return v; });
    }
    if (lastRow >= 2 && lastCol >= 1 && maxAm > 0) {
      var linhas = Math.min(lastRow - 1, maxAm);
      amostra = sh.getRange(2, 1, linhas, lastCol).getValues()
        .map(function (row) {
          return row.map(function (c) { return String(c || "").trim(); });
        });
    }
    return {
      aba         : nomesAlternativos[n],
      existe      : true,
      totalLinhas : Math.max(0, lastRow - 1),
      headers     : headers,
      amostra     : amostra
    };
  }
  return {
    aba         : nomesAlternativos[0],
    existe      : false,
    totalLinhas : 0,
    headers     : [],
    amostra     : []
  };
}

function migCompararHeaders_(nomeAba, hOrigem, hDestino) {
  var somenteOrigem  = hOrigem.filter(function (h) { return hDestino.indexOf(h) < 0; });
  var somenteDestino = hDestino.filter(function (h) { return hOrigem.indexOf(h) < 0; });
  var comuns         = hOrigem.filter(function (h) { return hDestino.indexOf(h) >= 0; });
  return {
    aba           : nomeAba,
    comuns        : comuns,
    somenteOrigem : somenteOrigem,
    somenteDestino: somenteDestino,
    compativel    : somenteOrigem.length === 0
  };
}

function migAvaliarVinculos_(clientes, unidades, equipamentos) {
  var vinc = {
    clienteUnidade       : "nao avaliado",
    unidadeEquipamento   : "nao avaliado",
    equipamentoClienteFK : "nao avaliado",
    idsPresentes         : false
  };
  var hCli   = clientes.headers;
  var hUni   = unidades.headers;
  var hEquip = equipamentos.headers;

  if (clientes.existe && unidades.existe) {
    var idCli  = hCli.some(function (h) { return /^(ID|ID_CLIENTE)$/i.test(h); });
    var fkCli  = hUni.some(function (h) { return /CLIENTE_?ID|ID_?CLIENTE|CLIENT/i.test(h); });
    vinc.clienteUnidade = (idCli && fkCli) ? "FK detectada" : "FK nao detectada nos headers";
  }
  if (unidades.existe && equipamentos.existe) {
    var idUni  = hUni.some(function (h) { return /^(ID|ID_UNIDADE)$/i.test(h); });
    var fkUni  = hEquip.some(function (h) { return /UNIDADE_?ID|ID_?UNIDADE|UNIT/i.test(h); });
    vinc.unidadeEquipamento = (idUni && fkUni) ? "FK detectada" : "FK nao detectada nos headers";
  }
  if (clientes.existe && equipamentos.existe) {
    var fkCliEq = hEquip.some(function (h) { return /CLIENTE_?ID|ID_?CLIENTE/i.test(h); });
    vinc.equipamentoClienteFK = fkCliEq ? "FK detectada" : "FK nao detectada nos headers";
  }
  vinc.idsPresentes =
    hCli.some(function (h) { return /^ID$/i.test(h); }) &&
    hEquip.some(function (h) { return /^ID$/i.test(h); });
  return vinc;
}

// ── AUDITAR_DESTINO_OPERACIONAL_MIG1_SEM_GRAVAR ───────────────
function AUDITAR_DESTINO_OPERACIONAL_MIG1_SEM_GRAVAR() {
  var resultado = {
    funcao          : "AUDITAR_DESTINO_OPERACIONAL_MIG1_SEM_GRAVAR",
    devConfirmado   : false,
    dbIdDestino     : null,
    dbUrlDestino    : null,
    abasEncontradas : [],
    clientes        : {},
    unidades        : {},
    equipamentos    : {},
    os              : {},
    atendimentos    : {},
    documentos      : {},
    tecnicos        : {},
    contratos       : {},
    dadosExistentes : {
      clientes    : 0,
      unidades    : 0,
      equipamentos: 0,
      total       : 0
    },
    riscoDuplicidade: false,
    riscos          : [],
    bloqueios       : [],
    avisos          : []
  };

  try {
    resultado.devConfirmado = (ScriptApp.getScriptId() === MIG_DEV_SCRIPT_ID_);
    if (!resultado.devConfirmado)
      resultado.riscos.push("Nao esta rodando no DEV esperado — prossiga com cautela.");

    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.dbIdDestino = dbId;
    var ss = SpreadsheetApp.openById(dbId);
    resultado.dbUrlDestino    = ss.getUrl();
    resultado.abasEncontradas = ss.getSheets().map(function (s) { return s.getName(); });

    resultado.clientes     = migLerAba_(ss, MIG_NOMES_.clientes,     2);
    resultado.unidades     = migLerAba_(ss, MIG_NOMES_.unidades,     2);
    resultado.equipamentos = migLerAba_(ss, MIG_NOMES_.equipamentos, 2);
    resultado.os           = migLerAba_(ss, MIG_NOMES_.os,           0);
    resultado.atendimentos = migLerAba_(ss, MIG_NOMES_.atendimentos, 0);
    resultado.documentos   = migLerAba_(ss, MIG_NOMES_.documentos,   0);
    resultado.tecnicos     = migLerAba_(ss, MIG_NOMES_.tecnicos,     2);
    resultado.contratos    = migLerAba_(ss, MIG_NOMES_.contratos,    0);

    resultado.dadosExistentes.clientes     = resultado.clientes.totalLinhas;
    resultado.dadosExistentes.unidades     = resultado.unidades.totalLinhas;
    resultado.dadosExistentes.equipamentos = resultado.equipamentos.totalLinhas;
    resultado.dadosExistentes.total        =
      resultado.dadosExistentes.clientes +
      resultado.dadosExistentes.unidades  +
      resultado.dadosExistentes.equipamentos;

    resultado.riscoDuplicidade = resultado.dadosExistentes.total > 0;
    if (resultado.riscoDuplicidade)
      resultado.riscos.push(
        "Destino ja tem dados: " + resultado.dadosExistentes.clientes + " clientes, " +
        resultado.dadosExistentes.unidades + " unidades, " +
        resultado.dadosExistentes.equipamentos + " equipamentos. " +
        "Definir estrategia (merge, limpar, sobrescrever) antes de migrar."
      );

    if (!resultado.clientes.existe)
      resultado.avisos.push("CAD_CLIENTES nao encontrada no destino — sera criada na migracao.");
    if (!resultado.equipamentos.existe)
      resultado.avisos.push("CAD_EQUIPAMENTOS nao encontrada no destino — sera criada na migracao.");

    resultado.conclusao = "DESTINO AUDITADO — aguardando resultado da origem para comparar.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "DESTINO BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── AUDITAR_ORIGEM_COM_ID_MIG1_SEM_GRAVAR ────────────────────
// Roda no DEV mas abre a planilha de ORIGEM pelo ID fornecido.
// Pré-requisito: executar o snippet standalone no projeto de origem
//   para descobrir o dbIdOrigem, depois informar aqui.
// Chamada: AUDITAR_ORIGEM_COM_ID_MIG1_SEM_GRAVAR("ID_DA_PLANILHA_ORIGEM")
function AUDITAR_ORIGEM_COM_ID_MIG1_SEM_GRAVAR(dbIdOrigem) {
  var resultado = {
    funcao          : "AUDITAR_ORIGEM_COM_ID_MIG1_SEM_GRAVAR",
    devConfirmado   : false,
    dbIdOrigem      : dbIdOrigem || null,
    dbUrlOrigem     : null,
    abasEncontradas : [],
    clientes        : {},
    unidades        : {},
    equipamentos    : {},
    os              : {},
    atendimentos    : {},
    documentos      : {},
    tecnicos        : {},
    contratos       : {},
    vinculos        : {},
    riscos          : [],
    bloqueios       : [],
    avisos          : []
  };

  try {
    resultado.devConfirmado = (ScriptApp.getScriptId() === MIG_DEV_SCRIPT_ID_);

    if (!dbIdOrigem || String(dbIdOrigem).trim().length < 20) {
      resultado.bloqueios.push(
        "dbIdOrigem invalido ou ausente. " +
        "Execute o snippet standalone no projeto de origem para obter o ID."
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var ss = SpreadsheetApp.openById(String(dbIdOrigem).trim());
    resultado.dbUrlOrigem     = ss.getUrl();
    resultado.abasEncontradas = ss.getSheets().map(function (s) { return s.getName(); });

    resultado.clientes     = migLerAba_(ss, MIG_NOMES_.clientes,     3);
    resultado.unidades     = migLerAba_(ss, MIG_NOMES_.unidades,     3);
    resultado.equipamentos = migLerAba_(ss, MIG_NOMES_.equipamentos, 3);
    resultado.os           = migLerAba_(ss, MIG_NOMES_.os,           0);
    resultado.atendimentos = migLerAba_(ss, MIG_NOMES_.atendimentos, 0);
    resultado.documentos   = migLerAba_(ss, MIG_NOMES_.documentos,   0);
    resultado.tecnicos     = migLerAba_(ss, MIG_NOMES_.tecnicos,     2);
    resultado.contratos    = migLerAba_(ss, MIG_NOMES_.contratos,    0);

    resultado.vinculos = migAvaliarVinculos_(
      resultado.clientes, resultado.unidades, resultado.equipamentos
    );

    if (!resultado.clientes.existe)
      resultado.riscos.push("CAD_CLIENTES nao localizada em nenhum nome candidato.");
    if (!resultado.unidades.existe)
      resultado.riscos.push("CAD_UNIDADES nao localizada em nenhum nome candidato.");
    if (!resultado.equipamentos.existe)
      resultado.riscos.push("CAD_EQUIPAMENTOS nao localizada em nenhum nome candidato.");
    if (resultado.clientes.totalLinhas === 0 && resultado.clientes.existe)
      resultado.riscos.push("CAD_CLIENTES existe mas esta vazia — nada a migrar.");
    if (resultado.equipamentos.totalLinhas === 0 && resultado.equipamentos.existe)
      resultado.riscos.push("CAD_EQUIPAMENTOS existe mas esta vazia — nada a migrar.");
    if (resultado.vinculos.clienteUnidade === "FK nao detectada nos headers")
      resultado.riscos.push("FK cliente-unidade ausente nos headers — validar vinculo manualmente.");
    if (resultado.vinculos.unidadeEquipamento === "FK nao detectada nos headers")
      resultado.riscos.push("FK unidade-equipamento ausente nos headers — validar vinculo manualmente.");

    var temDados = resultado.clientes.existe || resultado.unidades.existe ||
                   resultado.equipamentos.existe;
    resultado.conclusao = temDados
      ? "MIG.1 ORIGEM AUDITADA — execute COMPARAR_MIGRACAO_MIG1_SEM_GRAVAR para comparar com destino"
      : "MIG.1 BLOQUEADO — nenhuma aba operacional encontrada na origem";

  } catch (e) {
    resultado.bloqueios.push("Falha ao acessar planilha de origem: " + e.message +
      ". Confirme que o sgotId da planilha esta correto e que o projeto DEV tem permissao de acesso.");
    resultado.conclusao = "MIG.1 BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── COMPARAR_MIGRACAO_MIG1_SEM_GRAVAR ────────────────────────
// Lê origem e destino em uma única chamada e compara headers + volumes.
// Chamada: COMPARAR_MIGRACAO_MIG1_SEM_GRAVAR("ID_DA_PLANILHA_ORIGEM")
function COMPARAR_MIGRACAO_MIG1_SEM_GRAVAR(dbIdOrigem) {
  var resultado = {
    funcao    : "COMPARAR_MIGRACAO_MIG1_SEM_GRAVAR",
    dbIdOrigem: dbIdOrigem || null,
    dbIdDestino: null,
    comparacoes: {},
    volumeOrigem: {},
    volumeDestino: {},
    planoDeMigracao: null,
    riscos   : [],
    bloqueios: [],
    avisos   : []
  };

  try {
    if (!dbIdOrigem || String(dbIdOrigem).trim().length < 20) {
      resultado.bloqueios.push("dbIdOrigem invalido. Execute AUDITAR_ORIGEM_COM_ID_MIG1_SEM_GRAVAR primeiro.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props  = PropertiesService.getScriptProperties();
    var dbDest = String(props.getProperty("DB_ID") || "").trim();
    if (!dbDest) { resultado.bloqueios.push("DB_ID destino nao configurado."); return resultado; }
    resultado.dbIdDestino = dbDest;

    var ssOrig = SpreadsheetApp.openById(String(dbIdOrigem).trim());
    var ssDest = SpreadsheetApp.openById(dbDest);

    var entidades = ["clientes","unidades","equipamentos","tecnicos","os","atendimentos","contratos","documentos"];
    entidades.forEach(function (ent) {
      var orig = migLerAba_(ssOrig, MIG_NOMES_[ent], 0);
      var dest = migLerAba_(ssDest, MIG_NOMES_[ent], 0);
      resultado.volumeOrigem[ent]  = orig.totalLinhas;
      resultado.volumeDestino[ent] = dest.totalLinhas;
      resultado.comparacoes[ent]   = migCompararHeaders_(ent, orig.headers, dest.headers);
      resultado.comparacoes[ent].origemExiste  = orig.existe;
      resultado.comparacoes[ent].destinoExiste = dest.existe;
      resultado.comparacoes[ent].abaOrigem     = orig.aba;
      resultado.comparacoes[ent].abaDestino    = dest.aba;
    });

    // Plano de migração
    var destVazio = (resultado.volumeDestino.clientes || 0) +
                    (resultado.volumeDestino.unidades || 0) +
                    (resultado.volumeDestino.equipamentos || 0) === 0;
    var origTemDados = (resultado.volumeOrigem.clientes || 0) +
                       (resultado.volumeOrigem.unidades || 0) +
                       (resultado.volumeOrigem.equipamentos || 0) > 0;

    if (destVazio && origTemDados) {
      resultado.planoDeMigracao = {
        estrategia: "MIGRAR_TUDO",
        descricao : "Destino vazio — migrar todos os registros de origem.",
        prioridade: ["clientes", "unidades", "equipamentos", "tecnicos",
                     "contratos", "os", "atendimentos", "documentos"],
        usuarios  : "Recriar do zero no AUTH.5+ — nao migrar de CAD_USUARIOS.",
        risco     : "BAIXO"
      };
    } else if (!destVazio && origTemDados) {
      resultado.planoDeMigracao = {
        estrategia: "MERGE_COM_VALIDACAO",
        descricao : "Destino ja tem dados — migrar somente registros novos (por ID ou chave natural).",
        prioridade: ["clientes", "unidades", "equipamentos"],
        usuarios  : "Recriar do zero no AUTH.5+ — nao migrar de CAD_USUARIOS.",
        risco     : "MEDIO"
      };
      resultado.riscos.push(
        "Destino ja tem dados — risco de duplicidade. Definir chave de deduplicacao por entidade."
      );
    } else {
      resultado.planoDeMigracao = {
        estrategia: "SEM_DADOS_PARA_MIGRAR",
        descricao : "Origem sem dados ou nao localizada.",
        risco     : "NENHUM"
      };
    }

    // Detectar colunas incompatíveis
    var incompat = [];
    Object.keys(resultado.comparacoes).forEach(function (ent) {
      var comp = resultado.comparacoes[ent];
      if (comp.somenteOrigem && comp.somenteOrigem.length > 0) {
        incompat.push(ent + ": colunas so na origem: " + comp.somenteOrigem.join(", "));
      }
    });
    if (incompat.length > 0) {
      resultado.avisos.push(
        "Colunas presentes na origem mas ausentes no destino (mapeamento necessario): " +
        incompat.join(" | ")
      );
    }

    resultado.conclusao = "MIG.1 APROVADO PARA PLANEJAR MIGRACAO — estrategia: " +
      resultado.planoDeMigracao.estrategia;

  } catch (e) {
    resultado.bloqueios.push("Falha na comparacao: " + e.message);
    resultado.conclusao = "MIG.1 BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
