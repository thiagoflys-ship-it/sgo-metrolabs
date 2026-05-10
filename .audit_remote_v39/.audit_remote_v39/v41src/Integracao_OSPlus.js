/**
 * ============================================================================
 * SGO+ | MÓDULO DE INTEGRAÇÃO MASTER PARA METROLABS OS+
 * ============================================================================
 * Objetivo: Sincronização espelhada de Clientes, Unidades, Equipamentos e EQUIPE.
 * ============================================================================
 */

const ID_PLANILHA_DESTINO = "1eYZLYGXHWg5s_MzZsbBFTMzk6VXbHsWxnFwOOdYCy0g";

/**
 * Função Principal: Sincroniza TUDO de uma vez
 */
function sincronizarTudoMetrolabs() {
  sincronizarClientesOficial();
  sincronizarUnidadesOficial();
  sincronizarEquipamentosOficial();
  sincronizarUsuariosOficial(); // <--- A EQUIPE ENTRA AQUI
  mostrarAlerta("✅ OPERAÇÃO CONCLUÍDA!\n\nClientes, Unidades, Inventário e Equipe sincronizados com sucesso.");
}

/**
 * 1. SINCRONIZAR CLIENTES
 */
function sincronizarClientesOficial() {
  const dbIdAntigo = PropertiesService.getScriptProperties().getProperty("DB_ID");
  const ssOrigem = SpreadsheetApp.openById(dbIdAntigo);
  const abaOrigem = ssOrigem.getSheetByName("CAD_CLIENTES");
  const ssDestino = SpreadsheetApp.openById(ID_PLANILHA_DESTINO);
  const abaDestino = ssDestino.getSheetByName("CAD_CLIENTES");
  
  const dados = abaOrigem.getDataRange().getValues();
  let listaFinal = [];

  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    if (r[1]) { 
      listaFinal.push([
        String(r[0] || ""), String(r[1] || ""), String(r[2] || ""), String(r[3] || ""), 
        "", "", String(r[4] || ""), "", "", "", "", "", 
        String(r[5] || ""), String(r[6] || ""), String(r[7] || ""), 
        String(r[8] || "ATIVO"), String(r[9] || ""), ""
      ]);
    }
  }
  if (listaFinal.length > 0) {
    if (abaDestino.getLastRow() > 1) abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, abaDestino.getLastColumn()).clearContent();
    abaDestino.getRange(2, 1, listaFinal.length, listaFinal[0].length).setValues(listaFinal);
  }
}

/**
 * 2. SINCRONIZAR UNIDADES
 */
function sincronizarUnidadesOficial() {
  const dbIdAntigo = PropertiesService.getScriptProperties().getProperty("DB_ID");
  const ssOrigem = SpreadsheetApp.openById(dbIdAntigo);
  const abaOrigem = ssOrigem.getSheetByName("CAD_UNIDADES");
  const ssDestino = SpreadsheetApp.openById(ID_PLANILHA_DESTINO);
  const abaDestino = ssDestino.getSheetByName("CAD_UNIDADES");
  
  const dados = abaOrigem.getDataRange().getValues();
  let listaFinal = [];

  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    if (r[2]) {
      listaFinal.push([
        String(r[0] || ""), String(r[1] || ""), String(r[2] || ""), String(r[3] || ""), 
        "", String(r[4] || ""), "", "", "", String(r[5] || ""), String(r[6] || ""), 
        String(r[7] || ""), "", String(r[8] || ""), 
        String(r[9] || "ATIVO"), String(r[10] || ""), ""
      ]);
    }
  }
  if (listaFinal.length > 0) {
    if (abaDestino.getLastRow() > 1) abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, abaDestino.getLastColumn()).clearContent();
    abaDestino.getRange(2, 1, listaFinal.length, listaFinal[0].length).setValues(listaFinal);
  }
}

/**
 * 3. SINCRONIZAR EQUIPAMENTOS
 */
function sincronizarEquipamentosOficial() {
  const dbIdAntigo = PropertiesService.getScriptProperties().getProperty("DB_ID");
  const ssOrigem = SpreadsheetApp.openById(dbIdAntigo);
  const abaOrigem = ssOrigem.getSheetByName("CAD_EQUIPAMENTOS");
  const ssDestino = SpreadsheetApp.openById(ID_PLANILHA_DESTINO);
  const abaDestino = ssDestino.getSheetByName("CAD_EQUIPAMENTOS");
  
  const dados = abaOrigem.getDataRange().getValues();
  let listaFinal = [];

  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    if (r[7]) { 
      listaFinal.push([
        String(r[0] || ""), String(r[1] || ""), String(r[2] || ""), String(r[7] || ""), 
        String(r[6] || ""), String(r[3] || ""), String(r[4] || ""), String(r[5] || ""), 
        "", String(r[8] || ""), "", "", "", "", 
        String(r[10] || "ATIVO"), String(r[11] || ""), ""
      ]);
    }
  }
  if (listaFinal.length > 0) {
    if (abaDestino.getLastRow() > 1) abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, abaDestino.getLastColumn()).clearContent();
    abaDestino.getRange(2, 1, listaFinal.length, listaFinal[0].length).setValues(listaFinal);
  }
}

/**
 * 4. SINCRONIZAR USUÁRIOS (A EQUIPE METROLABS)
 */
function sincronizarUsuariosOficial() {
  const dbIdAntigo = PropertiesService.getScriptProperties().getProperty("DB_ID");
  const ssOrigem = SpreadsheetApp.openById(dbIdAntigo);
  const abaOrigem = ssOrigem.getSheetByName("CAD_USUARIOS");
  
  const ssDestino = SpreadsheetApp.openById(ID_PLANILHA_DESTINO);
  const abaDestino = ssDestino.getSheetByName("CAD_USUARIOS");
  
  const dados = abaOrigem.getDataRange().getValues();
  let listaFinal = [];

  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    if (r[1]) { // Se tiver LOGIN
      listaFinal.push([
        String(r[0] || ""),      // ID_USUARIO
        String(r[1] || ""),      // LOGIN
        String(r[2] || ""),      // SENHA
        String(r[3] || ""),      // NOME_COMPLETO
        "", "",                  // EMAIL e TELEFONE (Vazios para preencher depois)
        String(r[4] || "").toUpperCase(), // PERFIL (ADMIN, GESTOR, TECNICO)
        String(r[5] || "ATIVO").toUpperCase(), // STATUS
        String(r[6] || ""),      // DATA_CRIACAO
        ""                       // ULTIMO_ACESSO
      ]);
    }
  }

  if (listaFinal.length > 0) {
    if (abaDestino.getLastRow() > 1) abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, abaDestino.getLastColumn()).clearContent();
    abaDestino.getRange(2, 1, listaFinal.length, listaFinal[0].length).setValues(listaFinal);
  }
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 ENVIAR PARA OS+')
    .addItem('🚀 Sincronização TOTAL', 'sincronizarTudoMetrolabs')
    .addToUi();
}

function mostrarAlerta(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); }
}