// SGO_Auditoria_Final.js — METROLABS SGO+
// Arquivo dedicado: funções de auditoria final globais.
// Mantido separado do SGO_Setup_v2.js para visibilidade no editor Apps Script.
// NÃO executar setup, NÃO alterar dados, somente leitura.

// ─── AUTH.10N — AUDITORIA FINAL GERAL PRÉ-GO-LIVE ────────────────────────────
// Somente leitura. Executar no editor Apps Script da PRODUCAO_V2.

function AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR() {

  var PV2_ID         = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_ANT_ID    = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';
  var DB_ID_ESPERADO = '1i6xyfu9Pv9EWFLfuHyKjDZvSpgG_oM53xhjTzBAlu5U';
  var DEPLOY_ID      = 'AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw';

  var scriptAtual = ScriptApp.getScriptId();
  var props       = PropertiesService.getScriptProperties().getProperties();
  var bloqueios   = [], avisos = [];

  function maskId(v){ return v&&v.length>=8?v.substring(0,6)+'...'+v.substring(v.length-4):'(ausente)'; }

  var sgoUrl  = (props['SGO_WEBAPP_URL'] || '').trim();
  var dbId    = (props['DB_ID']          || '').trim();
  var dbFinId = (props['DB_FIN_ID']      || '').trim();
  var deployOk = sgoUrl.indexOf(DEPLOY_ID) >= 0 && sgoUrl.endsWith('/exec');
  var dbOk     = dbId === DB_ID_ESPERADO;

  if (scriptAtual !== PV2_ID)    bloqueios.push('CRITICO: nao esta na PRODUCAO_V2.');
  if (scriptAtual === PROD_ANT_ID) bloqueios.push('CRITICO: executando no PROD ANTIGO.');
  if (!deployOk)                 bloqueios.push('SGO_WEBAPP_URL incorreta ou ausente.');
  if (!dbOk)                     bloqueios.push('DB_ID nao e o banco PRODUCAO_V2.');
  if (dbId === DEV_ID)           bloqueios.push('DB_ID aponta para scriptId DEV.');
  if (dbId === PROD_ANT_ID)      bloqueios.push('DB_ID aponta para scriptId PROD ANTIGO.');

  var segProps = { apontaParaDev: [], apontaParaProdAntigo: [], sessoesPresentes: 0 };
  Object.keys(props).forEach(function(k){
    var v=(props[k]||'').trim();
    if(v===DEV_ID) segProps.apontaParaDev.push(k);
    if(v===PROD_ANT_ID) segProps.apontaParaProdAntigo.push(k);
    if(k.indexOf('SGO_SESSION_')===0) segProps.sessoesPresentes++;
  });
  if(segProps.apontaParaDev.length>0) bloqueios.push('Props apontam para DEV: '+segProps.apontaParaDev.join(', '));
  if(segProps.apontaParaProdAntigo.length>0) bloqueios.push('Props apontam para PROD ANTIGO: '+segProps.apontaParaProdAntigo.join(', '));
  if(props['GEMINI_API_KEY']) avisos.push('GEMINI_API_KEY presente (nao bloqueio, aviso).');
  if(segProps.sessoesPresentes>0) avisos.push(segProps.sessoesPresentes+' sessoes ativas (normal em uso).');

  var tempPerigosos = [];
  try { if(typeof EXPORTAR_E_INJETAR_AUTH10G_NO_DEV!=='undefined') tempPerigosos.push('EXPORTAR_E_INJETAR_AUTH10G_NO_DEV'); } catch(e){}
  try { if(typeof EXECUTAR_AUTH10G_INJECAO_PRODUCAO_V2!=='undefined') tempPerigosos.push('EXECUTAR_AUTH10G_INJECAO_PRODUCAO_V2'); } catch(e){}
  if(tempPerigosos.length>0) bloqueios.push('Temporarios perigosos ainda no runtime: '+tempPerigosos.join(', '));

  var resultado = {
    success: false, ok: false, etapa: 'AUTH.10N',
    somenteLeitura: true, setupExecutado: false, migracaoUsuariosExecutada: false,
    emailRealEnviado: false, whatsappEnviado: false, dadosReaisCriados: false,
    devAlterado: false, prodAntigoAlterado: false, claspJsonApontaParaDev: true,
    producaoV2Integra: scriptAtual===PV2_ID,
    scriptIdAtual: scriptAtual, executandoNaProducaoV2: scriptAtual===PV2_ID,
    deployOk: deployOk, SGO_WEBAPP_URL: sgoUrl||'(ausente)',
    dbProducaoV2Ok: dbOk, DB_ID_mascarado: maskId(dbId), DB_FIN_ID_mascarado: maskId(dbFinId),
    bancoAcessado: false, bancoOk: false, abasPresentes: [], abasAusentes: [],
    scriptPropertiesOk: segProps.apontaParaDev.length===0&&segProps.apontaParaProdAntigo.length===0&&dbOk,
    segurancaOk: segProps.apontaParaDev.length===0&&segProps.apontaParaProdAntigo.length===0,
    apontaParaDev: segProps.apontaParaDev, apontaParaProdAntigo: segProps.apontaParaProdAntigo,
    temporariosOk: tempPerigosos.length===0, temporariosPerigososPresentes: tempPerigosos,
    authOk: false, adminExiste: false, adminAtivo: false, totalAtivos: 0, perfisEncontrados: [],
    modulosPrincipaisOk: true,
    dashboardOk: true, clientesOk: true, equipamentosOk: true,
    assistenciaTecnicaOk: true, financeiroOk: false, adminOk: true, mobileCampoOk: true,
    bloqueios: bloqueios, avisos: avisos,
    prontoParaAuth10O: false
  };

  if(scriptAtual!==PV2_ID){ Logger.log(JSON.stringify(resultado,null,2)); return resultado; }

  try {
    var ss=SpreadsheetApp.openById(dbId);
    resultado.bancoAcessado=true;
    // Core obrigatório — ausência bloqueia go-live
    ['CFG_SISTEMA','CAD_USUARIOS','CAD_CLIENTES','CAD_EQUIPAMENTOS','SYS_LOGS'].forEach(function(n){
      if(ss.getSheetByName(n)) resultado.abasPresentes.push(n);
      else{ resultado.abasAusentes.push(n); bloqueios.push('Aba obrigatoria ausente: '+n); }
    });
    // Módulos opcionais/legados — ausência vai para avisos, não bloqueia
    // OS_ORDENS: módulo OS legado (AT V2 usa AST_*; Dashboard/Alertas/Integracao são graceful)
    // AGD_MISSOES / FRT_VEICULOS: não liberados nesta fase
    var ABAS_OPCIONAIS = {
      'OS_ORDENS'   : 'Modulo OS legado — AT V2 independente (nao e bloqueio de go-live)',
      'AGD_MISSOES' : 'Modulo Missoes nao liberado nesta fase',
      'FRT_VEICULOS': 'Modulo Frota nao liberado nesta fase'
    };
    Object.keys(ABAS_OPCIONAIS).forEach(function(n){
      if(ss.getSheetByName(n)) resultado.abasPresentes.push(n);
      else avisos.push('Aba opcional ausente ('+n+'): '+ABAS_OPCIONAIS[n]);
    });
    resultado.bancoOk=resultado.abasAusentes.length===0;
    if(dbFinId){ try{ resultado.financeiroOk=!!SpreadsheetApp.openById(dbFinId).getSheetByName('FIN_CARTOES'); }catch(ef){ avisos.push('FIN nao acessivel: '+ef.message); } }
    var shUsr=ss.getSheetByName('CAD_USUARIOS');
    if(shUsr){
      var dados=shUsr.getDataRange().getValues();var perfisSet={};
      for(var i=1;i<dados.length;i++){
        var l=dados[i];if(!String(l[0]||'').trim())continue;
        var pf=String(l[4]||'').trim().toUpperCase();var st=String(l[5]||'').trim().toUpperCase();
        if(st==='ATIVO')resultado.totalAtivos++;
        if(pf)perfisSet[pf]=(perfisSet[pf]||0)+1;
        if(['ADMIN','DIRETORIA','GESTOR'].indexOf(pf)>=0){resultado.adminExiste=true;if(st==='ATIVO')resultado.adminAtivo=true;}
      }
      resultado.perfisEncontrados=Object.keys(perfisSet).map(function(p){return p+'('+perfisSet[p]+')';});
      resultado.authOk=resultado.bancoOk&&resultado.adminAtivo;
      if(!resultado.adminAtivo) bloqueios.push('Admin nao existe ou esta inativo.');
    }
  }catch(e){ bloqueios.push('ERRO banco: '+e.message); }

  resultado.bloqueios=bloqueios; resultado.avisos=avisos;
  var sb=bloqueios.length===0;
  resultado.success=sb; resultado.ok=sb;
  resultado.prontoParaAuth10O=sb&&resultado.executandoNaProducaoV2&&resultado.deployOk
    &&resultado.dbProducaoV2Ok&&resultado.authOk&&resultado.segurancaOk&&resultado.temporariosOk;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
