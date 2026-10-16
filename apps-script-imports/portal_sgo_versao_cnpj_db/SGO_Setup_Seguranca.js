/****************************************************
 * SGO_Setup_Seguranca.gs
 * METROLABS SGO+
 * SETUP AUTOMATIZADO DE SEGURANÇA
 *
 * COMO USAR (uma única vez, pelo editor do Apps Script):
 *   1. Selecione a função setupSeguranca no dropdown e execute.
 *   2. Abra "Execuções" (menu lateral) para ler as senhas
 *      administrativas geradas (elas NÃO são retornadas ao
 *      cliente — aparecem apenas no log do proprietário).
 *   3. Pronto. Nenhuma configuração manual adicional.
 *
 * O QUE ELE FAZ:
 *   - Gera e grava SIMULADOR_ADMIN_SENHA (se ausente)
 *   - Gera e grava MODO_PERSONALIZADO_SENHA (se ausente)
 *   - Migra todas as senhas de CAD_USUARIOS para hash SHA-256
 *   - Imprime checklist de segurança no log
 *
 * Para TROCAR uma senha administrativa depois:
 *   Configurações do projeto > Propriedades do script >
 *   editar SIMULADOR_ADMIN_SENHA / MODO_PERSONALIZADO_SENHA.
 ****************************************************/

function setupSeguranca() {
  const resultado = {
    senhaSimuladorDefinida: false,
    senhaModoPersonalizadoDefinida: false,
    senhasMigradas: 0,
    senhasJaHasheadas: 0
  };

  const props = PropertiesService.getScriptProperties();

  // ------------------------------------------------------------
  // 1) SENHAS ADMINISTRATIVAS (Script Properties)
  // ------------------------------------------------------------
  if (!String(props.getProperty('SIMULADOR_ADMIN_SENHA') || '').trim()) {
    const nova = gerarSenhaForteSeguranca_();
    props.setProperty('SIMULADOR_ADMIN_SENHA', nova);
    console.log('SIMULADOR_ADMIN_SENHA gerada: ' + nova + '  <-- anote e guarde');
    resultado.senhaSimuladorDefinida = true;
  } else {
    console.log('SIMULADOR_ADMIN_SENHA já configurada (mantida).');
  }

  if (!String(props.getProperty('MODO_PERSONALIZADO_SENHA') || '').trim()) {
    const nova = gerarSenhaForteSeguranca_();
    props.setProperty('MODO_PERSONALIZADO_SENHA', nova);
    console.log('MODO_PERSONALIZADO_SENHA gerada: ' + nova + '  <-- anote e guarde');
    resultado.senhaModoPersonalizadoDefinida = true;
  } else {
    console.log('MODO_PERSONALIZADO_SENHA já configurada (mantida).');
  }

  // ------------------------------------------------------------
  // 2) MIGRAÇÃO DAS SENHAS DE USUÁRIOS PARA HASH
  // ------------------------------------------------------------
  const mig = migrarSenhasParaHash();
  resultado.senhasMigradas = mig.migradas;
  resultado.senhasJaHasheadas = mig.jaHasheadas;

  // ------------------------------------------------------------
  // 3) CHECKLIST
  // ------------------------------------------------------------
  console.log('================ CHECKLIST DE SEGURANÇA ================');
  console.log('Senha do Simulador Admin ....... ' + (String(props.getProperty('SIMULADOR_ADMIN_SENHA') || '').trim() ? 'OK' : 'PENDENTE'));
  console.log('Senha do Modo Personalizado .... ' + (String(props.getProperty('MODO_PERSONALIZADO_SENHA') || '').trim() ? 'OK' : 'PENDENTE'));
  console.log('Senhas de usuários migradas .... ' + mig.migradas + ' convertida(s), ' + mig.jaHasheadas + ' já em hash');
  console.log('========================================================');

  // IMPORTANTE: nunca retornar senhas — este retorno pode chegar a um
  // cliente remoto via google.script.run.
  return resultado;
}

/**
 * Converte para hash (SHA-256 + salt) toda senha de CAD_USUARIOS
 * que ainda esteja em texto plano. Idempotente: pode rodar quantas
 * vezes quiser sem efeito colateral.
 */
function migrarSenhasParaHash() {
  const resumo = { migradas: 0, jaHasheadas: 0, ignoradas: 0 };

  const dbId = SGO_CFG.DB_ID;
  if (!dbId) {
    console.log('migrarSenhasParaHash: sistema não inicializado (rode setupSGO antes).');
    return resumo;
  }

  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName(SGO_CFG.SHEETS.CAD_USUARIOS);
  if (!sheet) {
    console.log('migrarSenhasParaHash: aba de usuários não encontrada.');
    return resumo;
  }

  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const senhaAtual = String(dados[i][2] || ''); // coluna C = SENHA

    if (!senhaAtual) {
      resumo.ignoradas++;
      continue;
    }
    if (senhaEstaHasheadaAuth_(senhaAtual)) {
      resumo.jaHasheadas++;
      continue;
    }

    sheet.getRange(i + 1, 3).setValue(gerarHashSenhaAuth_(senhaAtual));
    resumo.migradas++;
  }

  console.log('migrarSenhasParaHash: ' + resumo.migradas + ' convertida(s), ' +
    resumo.jaHasheadas + ' já em hash, ' + resumo.ignoradas + ' vazia(s).');

  return resumo;
}

/** Gera senha forte aleatória (16 caracteres). Uso interno do setup. */
function gerarSenhaForteSeguranca_() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#%&*';
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + new Date().getTime(),
    Utilities.Charset.UTF_8
  );
  let senha = '';
  for (let i = 0; i < 16; i++) {
    const v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    senha += alfabeto.charAt(v % alfabeto.length);
  }
  return senha;
}
