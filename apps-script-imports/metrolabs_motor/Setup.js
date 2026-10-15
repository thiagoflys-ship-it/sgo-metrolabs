/****************************************************
 * METROLABS — MOTOR CENTRAL DE AR MEDICAL V1
 * ARQUIVO: Setup.gs
 * STATUS:
 * CRIADO DO ZERO PARA O PROJETO REAL
 *
 * FUNÇÃO:
 * - criar a estrutura base do projeto
 * - criar pasta raiz no Drive
 * - criar subpastas padrão
 * - criar planilha DB
 * - criar abas do banco
 * - gravar IDs nas Script Properties
 * - popular CFG_SISTEMA com parâmetros iniciais
 *
 * COMO USAR:
 * 1. Cole este arquivo no projeto Apps Script
 * 2. Garanta que o Config.gs novo já esteja no projeto
 * 3. Execute: setupCentralArMedical()
 * 4. Autorize o script
 ****************************************************/

/**
 * Setup principal do sistema.
 */
function setupCentralArMedical() {
  validarConfigSetupCentralAr_();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const props = PropertiesService.getScriptProperties();
    const cfg = UCFG.SETUP || {};
    const app = UCFG.APP || {};

    // --------------------------------------------------------
    // 1. CRIAR / LOCALIZAR PASTA RAIZ
    // --------------------------------------------------------
    const rootFolder = criarOuLocalizarPastaNaRaiz_(
      cfg.NOME_PASTA_RAIZ || 'METROLABS_CENTRAL_AR_MEDICAL_V1'
    );

    // --------------------------------------------------------
    // 2. CRIAR / LOCALIZAR SUBPASTAS
    // --------------------------------------------------------
    const uploadsFolder = criarOuLocalizarSubpasta_(
      rootFolder,
      cfg.NOME_PASTA_UPLOADS || '01_UPLOADS_DATALOGGER'
    );

    const laudosFolder = criarOuLocalizarSubpasta_(
      rootFolder,
      cfg.NOME_PASTA_LAUDOS || '02_LAUDOS_GERADOS'
    );

    const tempFolder = criarOuLocalizarSubpasta_(
      rootFolder,
      cfg.NOME_PASTA_TEMP || '03_TEMPORARIOS'
    );

    // --------------------------------------------------------
    // 3. CRIAR / LOCALIZAR PLANILHA DB
    // --------------------------------------------------------
    const dbFileName = cfg.NOME_PLANILHA_DB || 'METROLABS_CENTRAL_AR_MEDICAL_DB';
    const dbSpreadsheet = criarOuLocalizarSpreadsheetNaPasta_(rootFolder, dbFileName);

    // --------------------------------------------------------
    // 4. CRIAR ABAS DO BANCO
    // --------------------------------------------------------
    const abas = Array.isArray(cfg.ABAS_DB) ? cfg.ABAS_DB : [];
    garantirAbasDbCentralAr_(dbSpreadsheet, abas);

    // --------------------------------------------------------
    // 5. GRAVAR SCRIPT PROPERTIES
    // --------------------------------------------------------
    const p = cfg.PROPRIEDADES || {};

    salvarPropertySeHouver_(props, p.APP_KEY, 'METROLABS_CENTRAL_AR_MEDICAL_V1');
    salvarPropertySeHouver_(props, p.DB_ID, dbSpreadsheet.getId());
    salvarPropertySeHouver_(props, p.ROOT_FOLDER_ID, rootFolder.getId());
    salvarPropertySeHouver_(props, p.UPLOAD_FOLDER_ID, uploadsFolder.getId());
    salvarPropertySeHouver_(props, p.LAUDOS_FOLDER_ID, laudosFolder.getId());
    salvarPropertySeHouver_(props, p.TEMP_FOLDER_ID, tempFolder.getId());

    // --------------------------------------------------------
    // 6. PREENCHER CFG_SISTEMA
    // --------------------------------------------------------
    preencherCfgSistemaCentralAr_(dbSpreadsheet);

    // --------------------------------------------------------
    // 7. PREENCHER LOG_SISTEMA
    // --------------------------------------------------------
    registrarLogSistemaCentralAr_(
      dbSpreadsheet,
      'SETUP',
      'Estrutura inicial criada/validada com sucesso.'
    );

    SpreadsheetApp.flush();

    return {
      ok: true,
      message: 'Setup concluído com sucesso.',
      app: {
        nome: valorSeguroSetup_(app.NOME),
        versao: valorSeguroSetup_(app.VERSAO)
      },
      rootFolderId: rootFolder.getId(),
      rootFolderUrl: rootFolder.getUrl(),
      uploadsFolderId: uploadsFolder.getId(),
      uploadsFolderUrl: uploadsFolder.getUrl(),
      laudosFolderId: laudosFolder.getId(),
      laudosFolderUrl: laudosFolder.getUrl(),
      tempFolderId: tempFolder.getId(),
      tempFolderUrl: tempFolder.getUrl(),
      dbId: dbSpreadsheet.getId(),
      dbUrl: dbSpreadsheet.getUrl()
    };

  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// 1. VALIDAÇÃO DE CONFIG
// ============================================================

function validarConfigSetupCentralAr_() {
  if (typeof UCFG === 'undefined' || !UCFG) {
    throw new Error('Config.gs não encontrado. Cole o Config.gs antes de executar o setup.');
  }

  if (!UCFG.SETUP) {
    throw new Error('Bloco UCFG.SETUP não encontrado no Config.gs.');
  }

  if (!UCFG.SETUP.PROPRIEDADES) {
    throw new Error('Bloco UCFG.SETUP.PROPRIEDADES não encontrado no Config.gs.');
  }
}

// ============================================================
// 2. PASTAS
// ============================================================

function criarOuLocalizarPastaNaRaiz_(nome) {
  const it = DriveApp.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(nome);
}

function criarOuLocalizarSubpasta_(parentFolder, nome) {
  const it = parentFolder.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(nome);
}

// ============================================================
// 3. PLANILHA DB
// ============================================================

function criarOuLocalizarSpreadsheetNaPasta_(folder, nomeArquivo) {
  const files = folder.getFilesByName(nomeArquivo);

  while (files.hasNext()) {
    const f = files.next();
    try {
      return SpreadsheetApp.openById(f.getId());
    } catch (e) {}
  }

  const ss = SpreadsheetApp.create(nomeArquivo);
  const file = DriveApp.getFileById(ss.getId());

  folder.addFile(file);
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) {}

  return ss;
}

function garantirAbasDbCentralAr_(ss, abas) {
  abas.forEach(function(nomeAba) {
    if (!ss.getSheetByName(nomeAba)) {
      ss.insertSheet(nomeAba);
    }
  });

  // remove Sheet1/Página1 se existirem e não fizerem parte da configuração
  ['Sheet1', 'Página1', 'Planilha1'].forEach(function(nomePadrao) {
    const sh = ss.getSheetByName(nomePadrao);
    if (sh && abas.indexOf(nomePadrao) === -1) {
      try {
        ss.deleteSheet(sh);
      } catch (e) {}
    }
  });

  if (!ss.getSheets().length && abas.length) {
    ss.insertSheet(abas[0]);
  }
}

// ============================================================
// 4. ABA CFG_SISTEMA
// ============================================================

function preencherCfgSistemaCentralAr_(ss) {
  const sh = ss.getSheetByName('CFG_SISTEMA');
  if (!sh) return;

  sh.clear();

  const app = UCFG.APP || {};
  const sistema = UCFG.SISTEMA || {};
  const csv = UCFG.CSV || {};
  const limites = UCFG.LIMITES || {};
  const textos = UCFG.TEXTOS || {};
  const rel = UCFG.RELATORIO || {};
  const props = UCFG.SETUP && UCFG.SETUP.PROPRIEDADES ? UCFG.SETUP.PROPRIEDADES : {};
  const scriptProps = PropertiesService.getScriptProperties();

  const linhas = [
    ['CHAVE', 'VALOR', 'DESCRIÇÃO'],

    ['APP_NOME', valorSeguroSetup_(app.NOME), 'Nome oficial do sistema'],
    ['APP_VERSAO', valorSeguroSetup_(app.VERSAO), 'Versão do sistema'],
    ['APP_TZ', valorSeguroSetup_(app.TZ), 'Timezone padrão'],
    ['APP_SUBTITULO', valorSeguroSetup_(app.SUBTITULO), 'Subtítulo oficial do sistema'],
    ['APP_REFERENCIA_NORMATIVA', valorSeguroSetup_(app.REFERENCIA_NORMATIVA), 'Referência normativa principal'],

    ['ROOT_FOLDER_ID', lerPropertySeHouver_(scriptProps, props.ROOT_FOLDER_ID), 'ID da pasta raiz do projeto'],
    ['UPLOAD_FOLDER_ID', lerPropertySeHouver_(scriptProps, props.UPLOAD_FOLDER_ID), 'ID da pasta de uploads'],
    ['LAUDOS_FOLDER_ID', lerPropertySeHouver_(scriptProps, props.LAUDOS_FOLDER_ID), 'ID da pasta de laudos'],
    ['TEMP_FOLDER_ID', lerPropertySeHouver_(scriptProps, props.TEMP_FOLDER_ID), 'ID da pasta temporária'],
    ['DB_ID', lerPropertySeHouver_(scriptProps, props.DB_ID), 'ID da planilha banco do sistema'],

    ['IDLE_TIMEOUT_MINUTES', numeroSeguroSetup_(sistema.IDLE_TIMEOUT_MINUTES, 7), 'Tempo de ociosidade em minutos'],
    ['MAX_PARSE_ROWS', numeroSeguroSetup_(sistema.MAX_PARSE_ROWS, 200000), 'Máximo de linhas para leitura'],
    ['PREVIEW_ROWS', numeroSeguroSetup_(sistema.PREVIEW_ROWS, 20), 'Quantidade de linhas no preview'],
    ['DEFAULT_DATE_STYLE', valorSeguroSetup_(sistema.DEFAULT_DATE_STYLE), 'Padrão de data'],
    ['MIN_VALID_YEAR', numeroSeguroSetup_(sistema.MIN_VALID_YEAR, 2020), 'Ano mínimo aceitável'],
    ['MAX_VALID_YEAR', numeroSeguroSetup_(sistema.MAX_VALID_YEAR, 2038), 'Ano máximo aceitável'],

    ['CSV_COL_DATA', valorSeguroSetup_(csv.COL_DATA), 'Nome esperado da coluna DATA'],
    ['CSV_COL_HORA', valorSeguroSetup_(csv.COL_HORA), 'Nome esperado da coluna HORA'],
    ['CSV_COL_ORVALHO', valorSeguroSetup_(csv.COL_ORVALHO), 'Nome esperado da coluna de orvalho'],
    ['CSV_COL_PRESSAO', valorSeguroSetup_(csv.COL_PRESSAO), 'Nome esperado da coluna de pressão'],

    ['PRESSAO_MIN', numeroSeguroSetup_(limites.PRESSAO && limites.PRESSAO.MIN, 4.50), 'Pressão mínima aceitável'],
    ['PRESSAO_MAX', numeroSeguroSetup_(limites.PRESSAO && limites.PRESSAO.MAX, 6.00), 'Pressão máxima aceitável'],
    ['PRESSAO_ALVO', numeroSeguroSetup_(limites.PRESSAO && limites.PRESSAO.ALVO, 5.00), 'Pressão alvo'],
    ['ORVALHO_MAX_ACEITAVEL', numeroSeguroSetup_(limites.ORVALHO && limites.ORVALHO.MAX_ACEITAVEL, -40.00), 'Orvalho máximo aceitável'],
    ['ORVALHO_ALERTA_ACIMA_DE', numeroSeguroSetup_(limites.ORVALHO && limites.ORVALHO.ALERTA_ACIMA_DE, -38.00), 'Faixa de alerta do orvalho'],
    ['ORVALHO_REPROVACAO_ACIMA_DE', numeroSeguroSetup_(limites.ORVALHO && limites.ORVALHO.REPROVACAO_ACIMA_DE, -35.00), 'Faixa de reprovação do orvalho'],

    ['PERCENTUAL_ALERTA_FORA_FAIXA', numeroSeguroSetup_(limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_ALERTA_FORA_FAIXA, 1.00), 'Percentual de alerta fora da faixa'],
    ['PERCENTUAL_REPROVACAO_FORA_FAIXA', numeroSeguroSetup_(limites.EXCURSAO && limites.EXCURSAO.PERCENTUAL_REPROVACAO_FORA_FAIXA, 5.00), 'Percentual de reprovação fora da faixa'],

    ['LABEL_ONLINE', valorSeguroSetup_(textos.LABEL_ONLINE), 'Texto padrão de sistema online'],
    ['LABEL_PROCESSANDO', valorSeguroSetup_(textos.LABEL_PROCESSANDO), 'Texto padrão de processamento'],
    ['LABEL_APROVADO', valorSeguroSetup_(textos.LABEL_APROVADO), 'Status aprovado'],
    ['LABEL_APROVADO_ALERTA', valorSeguroSetup_(textos.LABEL_APROVADO_ALERTA), 'Status aprovado com alerta'],
    ['LABEL_REPROVADO', valorSeguroSetup_(textos.LABEL_REPROVADO), 'Status reprovado'],

    ['RELATORIO_TITULO', valorSeguroSetup_(rel.TITULO), 'Título principal do relatório'],
    ['RELATORIO_SUBTITULO', valorSeguroSetup_(rel.SUBTITULO), 'Subtítulo principal do relatório']
  ];

  sh.getRange(1, 1, linhas.length, 3).setValues(linhas);

  sh.getRange('A1:C1')
    .setFontWeight('bold')
    .setBackground('#374151')
    .setFontColor('#ffffff');

  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 260);
  sh.setColumnWidth(2, 220);
  sh.setColumnWidth(3, 500);
}

// ============================================================
// 5. ABA LOG_SISTEMA
// ============================================================

function registrarLogSistemaCentralAr_(ss, tipo, mensagem) {
  const sh = ss.getSheetByName('LOG_SISTEMA');
  if (!sh) return;

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 4).setValues([['TIMESTAMP', 'TIPO', 'MENSAGEM', 'USUÁRIO']]);
    sh.getRange('A1:D1')
      .setFontWeight('bold')
      .setBackground('#374151')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }

  sh.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    valorSeguroSetup_(tipo),
    valorSeguroSetup_(mensagem),
    obterEmailUsuarioSetup_()
  ]);
}

// ============================================================
// 6. HELPERS DE PROPERTIES
// ============================================================

function salvarPropertySeHouver_(props, chave, valor) {
  if (!chave) return;
  props.setProperty(String(chave), String(valor == null ? '' : valor));
}

function lerPropertySeHouver_(props, chave) {
  if (!chave) return '';
  return String(props.getProperty(String(chave)) || '');
}

// ============================================================
// 7. HELPERS GERAIS
// ============================================================

function obterEmailUsuarioSetup_() {
  try {
    return Session.getActiveUser().getEmail() || 'USUÁRIO_NÃO_IDENTIFICADO';
  } catch (e) {
    return 'USUÁRIO_NÃO_IDENTIFICADO';
  }
}

function valorSeguroSetup_(valor) {
  return String(valor == null ? '' : valor);
}

function numeroSeguroSetup_(valor, fallback) {
  const n = Number(valor);
  if (isFinite(n)) return n;
  return typeof fallback === 'number' ? fallback : 0;
}