/**
 * ============================================================================
 * SGO+ | MOTOR DE INTEGRAÇÃO BLINDADO + RELATÓRIO (VERSÃO DIRETORIA)
 * ============================================================================
 * Objetivo: Sincronizar Clientes, Equipamentos e Usuários com o novo OS+
 * e enviar relatório de performance para thiagoflys@gmail.com.
 * ============================================================================
 */

/**
 * SEGURANÇA: valida o chamador da sincronização.
 * Aceita 2 origens legítimas:
 *  1) Gatilho de tempo (03:00) — evento com triggerUid conferido contra os
 *     gatilhos reais do projeto (anônimo não consegue forjar).
 *  2) Portal web — sessionId válido de perfil não-CLIENTE.
 */
function Integracao_validarAcessoSincronizacao_(arg) {
  // Origem 1: gatilho de tempo
  if (arg && typeof arg === 'object' && arg.triggerUid) {
    const uid = String(arg.triggerUid);
    const gatilhoValido = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getUniqueId() === uid && t.getHandlerFunction() === 'dispararSincronizacaoTotal';
    });
    if (gatilhoValido) return;
    throw new Error("Gatilho de sincronização não reconhecido.");
  }

  // Origem 2: portal web (sessionId)
  const sessao = exigirSessao(typeof arg === 'string' ? arg : '');
  if (SGO_UTILS.safeUpper(sessao.perfil) === 'CLIENTE') {
    throw new Error("Acesso negado: seu perfil não permite disparar a sincronização.");
  }
}

function dispararSincronizacaoTotal(arg) {
  Integracao_validarAcessoSincronizacao_(arg); // SEGURANCA: valida gatilho ou sessao

  const inicioTimer = new Date();

  try {
    const props = PropertiesService.getScriptProperties();
    const idDestino = props.getProperty("ID_PLANILHA_OSPLUS");
    const dbIdOrigem = props.getProperty("DB_ID");

    if (!idDestino || !dbIdOrigem) throw new Error("Setup incompleto. Por favor, rode o script 'SGO_Setup_Integracao.gs' primeiro.");

    const ssOrigem = SpreadsheetApp.openById(dbIdOrigem);
    const ssDestino = SpreadsheetApp.openById(idDestino);

    /**
     * FUNÇÃO INTERNA: Garante que a aba de destino exista com cabeçalho formatado.
     */
    function garantirAbaNoDestino(ss, nome, cabecalho) {
      let sheet = ss.getSheetByName(nome);
      if (!sheet) {
        sheet = ss.insertSheet(nome);
        sheet.appendRow(cabecalho);
        sheet.getRange(1, 1, 1, cabecalho.length).setFontWeight("bold").setBackground("#E2EFDA");
      }
      return sheet;
    }

    // --- 1. SINCRONIZAR CLIENTES E UNIDADES ---
    const abaUnidOrigem = ssOrigem.getSheetByName("CAD_UNIDADES");
    if (!abaUnidOrigem) throw new Error("Aba 'CAD_UNIDADES' não encontrada no SGO+ antigo.");
    
    const abaCliDestino = garantirAbaNoDestino(ssDestino, "CAD_CLIENTES", ["CLIENTE", "UNIDADE", "CNPJ", "ENDERECO", "CIDADE_UF", "CONTATO"]);
    const dadosUnid = abaUnidOrigem.getDataRange().getValues();
    const listaCli = dadosUnid.slice(1).filter(r => r[0]).map(r => [
      String(r[0]).trim(), String(r[1]).trim(), String(r[2]).trim(), 
      String(r[3] || "S/N").trim(), String(r[4] || "").trim(), String(r[5] || "").trim()
    ]);
    
    if (abaCliDestino.getLastRow() > 1) abaCliDestino.getRange(2, 1, abaCliDestino.getLastRow() - 1, 6).clearContent();
    if (listaCli.length > 0) abaCliDestino.getRange(2, 1, listaCli.length, 6).setValues(listaCli);


    // --- 2. SINCRONIZAR EQUIPAMENTOS (TAGS) ---
    const abaEquipOrigem = ssOrigem.getSheetByName("CAD_EQUIPAMENTOS");
    if (!abaEquipOrigem) throw new Error("Aba 'CAD_EQUIPAMENTOS' não encontrada no SGO+ antigo.");
    
    const abaEquipDestino = garantirAbaNoDestino(ssDestino, "CAD_EQUIPAMENTOS", ["TAG", "NOME", "FABRICANTE", "MODELO", "SERIE", "CLIENTE", "UNIDADE"]);
    const dadosEquip = abaEquipOrigem.getDataRange().getValues();
    const listaEquip = dadosEquip.slice(1).filter(r => r[1]).map(r => [
      String(r[1]).trim(), String(r[2]).trim(), String(r[3]).trim(), 
      String(r[4]).trim(), String(r[5]).trim(), String(r[6]).trim(), String(r[7]).trim()
    ]);
    
    if (abaEquipDestino.getLastRow() > 1) abaEquipDestino.getRange(2, 1, abaEquipDestino.getLastRow() - 1, 7).clearContent();
    if (listaEquip.length > 0) abaEquipDestino.getRange(2, 1, listaEquip.length, 7).setValues(listaEquip);


    // --- 3. SINCRONIZAR USUÁRIOS ---
    const abaUsuOrigem = ssOrigem.getSheetByName("CAD_USUARIOS");
    if (!abaUsuOrigem) throw new Error("Aba 'CAD_USUARIOS' não encontrada no SGO+ antigo.");
    
    const abaUsuDestino = garantirAbaNoDestino(ssDestino, "CAD_USUARIOS", ["NOME", "EMAIL", "SENHA", "PERFIL", "STATUS"]);
    const dadosUsu = abaUsuOrigem.getDataRange().getValues();
    const listaUsu = dadosUsu.slice(1).filter(r => r[0]).map(r => [
      String(r[0]).trim(), String(r[1]).trim(), String(r[2]).trim(), String(r[3]).trim(), String(r[4]).trim()
    ]);
    
    if (abaUsuDestino.getLastRow() > 1) abaUsuDestino.getRange(2, 1, abaUsuDestino.getLastRow() - 1, 5).clearContent();
    if (listaUsu.length > 0) abaUsuDestino.getRange(2, 1, listaUsu.length, 5).setValues(listaUsu);

    // DADOS PARA O RELATÓRIO
    const resumo = {
      unidades: listaCli.length,
      equipamentos: listaEquip.length,
      usuarios: listaUsu.length,
      tempo: ((new Date() - inicioTimer) / 1000).toFixed(2)
    };

    // ENVIO DO E-MAIL DE SUCESSO
    enviarEmailRelatorioDiretoria(resumo);

    return { sucesso: true, mensagem: "Envio ao OS+ concluído. O resumo foi enviado por e-mail à diretoria." };

  } catch (e) {
    enviarEmailErroDiretoria(e.message);
    console.error("Falha no envio SGO+ → OS+: " + ((e && e.stack) || e));
    return { sucesso: false, mensagem: "Não foi possível enviar ao OS+. A diretoria foi avisada por e-mail. Tente de novo; se repetir, avise o administrador." };
  }
}

/**
 * Funções Auxiliares de E-mail
 */
function enviarEmailRelatorioDiretoria(data) {
  const email = "thiagoflys@gmail.com";
  const assunto = "[METROLABS] Relatório de Sincronização OS+";
  const htmlBody = `
    <div style="font-family: sans-serif; color: #333; max-width: 500px; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
      <h3 style="color: #198754;">Envio ao OS+ concluído</h3>
      <p>A base de dados do <b>OS+</b> foi atualizada com sucesso.</p>
      <hr>
      <p><b>Resumo da carga:</b></p>
      <ul>
        <li>Unidades/Filiais: ${data.unidades}</li>
        <li>Equipamentos (TAGs): ${data.equipamentos}</li>
        <li>Usuários enviados: ${data.usuarios}</li>
      </ul>
      <p><b>Tempo de processamento:</b> ${String(data.tempo).replace('.', ',')} segundos</p>
      <hr>
      <p style="font-size: 11px; color: #888;">Gerado automaticamente pelo SGO+.</p>
    </div>
  `;
  MailApp.sendEmail({ to: email, subject: assunto, htmlBody: htmlBody });
}

function enviarEmailErroDiretoria(erroMsg) {
  MailApp.sendEmail({
    to: "thiagoflys@gmail.com",
    subject: "[METROLABS] Falha no envio SGO+ → OS+",
    body: "Falha no envio SGO+ → OS+.\n\nDetalhe técnico: " + erroMsg
  });
}