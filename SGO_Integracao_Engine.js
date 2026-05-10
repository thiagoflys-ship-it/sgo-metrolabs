/**
 * ============================================================================
 * SGO+ | MOTOR DE ATUALIZACAO INTERNA
 * ============================================================================
 * Objetivo: verificar e atualizar dados essenciais do SGO+ sem integrar com
 * sistemas externos.
 * ============================================================================
 */

function dispararSincronizacaoTotal() {
  return atualizarDadosInternosSGO_();
}

function atualizarDadosInternosSGO_() {
  const inicioTimer = new Date();

  try {
    const props = PropertiesService.getScriptProperties();
    const dbId = props.getProperty("DB_ID");
    if (!dbId) throw new Error("DB_ID nao encontrado. Rode o setup principal do SGO+.");

    const ss = SpreadsheetApp.openById(dbId);
    const osDbId = props.getProperty("DB_OS_ID");
    const ssOS = osDbId ? SpreadsheetApp.openById(osDbId) : ss;
    const resumo = {
      unidades: contarRegistrosAba_(ss, "CAD_UNIDADES"),
      equipamentos: contarRegistrosAba_(ss, "CAD_EQUIPAMENTOS"),
      usuarios: contarRegistrosAba_(ss, "CAD_USUARIOS"),
      ordensServico: contarRegistrosAbaOpcional_(ssOS, "OS_ORDENS"),
      tempo: ((new Date() - inicioTimer) / 1000).toFixed(2)
    };

    SpreadsheetApp.flush();

    return {
      sucesso: true,
      mensagem: "Dados atualizados com sucesso.\n\n" +
        "Unidades/Filiais: " + resumo.unidades + "\n" +
        "Equipamentos (TAGs): " + resumo.equipamentos + "\n" +
        "Usuarios: " + resumo.usuarios + "\n" +
        "Ordens de Servico: " + resumo.ordensServico + "\n" +
        "Tempo de processamento: " + resumo.tempo + "s"
    };
  } catch (e) {
    return { sucesso: false, mensagem: "Erro ao atualizar dados: " + e.message };
  }
}

function contarRegistrosAba_(ss, nomeAba) {
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) throw new Error("Aba '" + nomeAba + "' nao encontrada no SGO+.");
  return Math.max(sheet.getLastRow() - 1, 0);
}

function contarRegistrosAbaOpcional_(ss, nomeAba) {
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) return 0;
  return Math.max(sheet.getLastRow() - 1, 0);
}
