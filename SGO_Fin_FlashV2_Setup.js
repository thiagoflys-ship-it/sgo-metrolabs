// FIN_FLASH_V2 — fundacao isolada. Nao altera tabelas do Flash legado.
var FIN_FLASH_V2_ABAS = {
  CONTAS: 'FIN_FLASH_V2_CONTAS', CARTOES: 'FIN_FLASH_V2_CARTOES', RECARGAS: 'FIN_FLASH_V2_RECARGAS',
  PRESTACOES: 'FIN_FLASH_V2_PRESTACOES', EXTRATOS: 'FIN_FLASH_V2_EXTRATOS', CONCILIACOES: 'FIN_FLASH_V2_CONCILIACOES',
  PENDENCIAS: 'FIN_FLASH_V2_PENDENCIAS', DOCUMENTOS: 'FIN_FLASH_V2_DOCUMENTOS', TERMOS: 'FIN_FLASH_V2_TERMOS',
  ALERTAS: 'FIN_FLASH_V2_ALERTAS', LOGS: 'FIN_FLASH_V2_LOGS', CONFIG: 'FIN_FLASH_V2_CONFIG'
};

var FIN_FLASH_V2_SCHEMAS = {
  FIN_FLASH_V2_CONTAS: ['ID','CPF','NOME','EMAIL','STATUS','AMBIENTE_TESTE','CRIADO_EM','ATUALIZADO_EM'],
  FIN_FLASH_V2_CARTOES: ['ID','CONTA_ID','CPF','TIPO_CARTAO','FINAL_CARTAO','STATUS','AMBIENTE_TESTE','CRIADO_EM','ATUALIZADO_EM'],
  FIN_FLASH_V2_RECARGAS: ['ID','CONTA_ID','CARTAO_ID','CPF','VALOR','STATUS','AMBIENTE_TESTE','CRIADO_EM','OBSERVACAO'],
  FIN_FLASH_V2_PRESTACOES: ['ID','CONTA_ID','CARTAO_ID','CPF','DATA_GASTO','VALOR','ESTABELECIMENTO','FINALIDADE','OS_NUMERO','JUSTIFICATIVA','COMPROVANTE_ID','COMPROVANTE_TIPO','STATUS','AMBIENTE_TESTE','CRIADO_EM'],
  FIN_FLASH_V2_EXTRATOS: ['ID','DATA','MOVIMENTACAO','VALOR','PESSOA','PAGAMENTO','PRESTACAO_CONTAS','CPF','CARTAO_ID','STATUS_IMPORTACAO','AMBIENTE_TESTE','LOTE_ID','CRIADO_EM'],
  // V2.17A — SCORE/MOTIVO_DECISAO/ATUALIZADO_POR/ATUALIZADO_EM adicionados ao final
  // (migração aditiva via MIGRAR_FIN_FLASH_V217_CONCILIACOES_MOTIVO_SCORE_DEV).
  // APROVADO_POR permanece como campo legado/automático (motor de IA), sem mudar semântica.
  FIN_FLASH_V2_CONCILIACOES: ['ID','EXTRATO_ID','PRESTACAO_ID','STATUS','VALOR_EXTRATO','VALOR_PRESTACAO','DIVERGENCIA_VALOR','ANALISE_IA','APROVADO_POR','AMBIENTE_TESTE','CRIADO_EM','SCORE','MOTIVO_DECISAO','ATUALIZADO_POR','ATUALIZADO_EM'],
  FIN_FLASH_V2_PENDENCIAS: ['ID','CONTA_ID','CPF','EXTRATO_ID','PRESTACAO_ID','TIPO','SEVERIDADE','STATUS','DESCRICAO','BLOQUEIA_RECARGA','AMBIENTE_TESTE','CRIADO_EM','RESOLVIDO_EM'],
  FIN_FLASH_V2_DOCUMENTOS: ['ID','CONTA_ID','PRESTACAO_ID','TIPO','ARQUIVO_ID','LINK','HASH','STATUS','AMBIENTE_TESTE','CRIADO_EM'],
  FIN_FLASH_V2_TERMOS: ['ID','CONTA_ID','CPF','VERSAO','STATUS','ACEITO_EM','DOCUMENTO_ID','AMBIENTE_TESTE','CRIADO_EM'],
  FIN_FLASH_V2_ALERTAS: ['ID','CONTA_ID','CPF','TIPO','SEVERIDADE','MENSAGEM','STATUS','AMBIENTE_TESTE','CRIADO_EM','LIDO_EM'],
  FIN_FLASH_V2_LOGS: ['ID','ACAO','ENTIDADE','ENTIDADE_ID','DETALHE_JSON','AMBIENTE_TESTE','EXECUTADO_POR','CRIADO_EM'],
  FIN_FLASH_V2_CONFIG: ['CHAVE','VALOR','DESCRICAO','AMBIENTE_TESTE','ATUALIZADO_EM']
};

function FIN_FLASH_V2_db_() {
  var id = String(PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '').trim();
  if (!id) throw new Error('DB_FIN_ID nao configurado.');
  return SpreadsheetApp.openById(id);
}
function FIN_FLASH_V2_text_(v) { return String(v == null ? '' : v).trim(); }
function FIN_FLASH_V2_id_(tipo) { return 'FIN_FLASH_V2_' + tipo + '_' + Utilities.getUuid(); }
function FIN_FLASH_V2_headersOk_(sh, schema) {
  if (!sh || sh.getLastColumn() < schema.length) return false;
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(FIN_FLASH_V2_text_);
  return schema.every(function(x) { return h.indexOf(x) >= 0; });
}

function AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR() {
  var r = { success:true, ok:false, somenteLeitura:true, gravacaoReal:false, modulo:'FIN_FLASH_V2', abas:{}, bloqueios:[], avisos:[] };
  try {
    var ss = FIN_FLASH_V2_db_();
    Object.keys(FIN_FLASH_V2_SCHEMAS).forEach(function(nome) {
      var sh = ss.getSheetByName(nome), ok = FIN_FLASH_V2_headersOk_(sh, FIN_FLASH_V2_SCHEMAS[nome]);
      r.abas[nome] = { existe:!!sh, headersOk:ok };
      if (!sh) r.bloqueios.push('Aba ausente: ' + nome + '.');
      else if (!ok) r.bloqueios.push('Schema invalido: ' + nome + '.');
    });
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  r.ok = r.bloqueios.length === 0;
  return r;
}

function SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO(confirmacao) {
  var r = { success:false, ok:false, executado:false, gravacaoReal:false, modulo:'FIN_FLASH_V2', bloqueios:[], abasCriadas:[] };
  if (confirmacao !== 'AUTORIZO_SETUP_FIN_FLASH_V2') { r.bloqueios.push('Confirmacao explicita invalida.'); return r; }
  try {
    var ss = FIN_FLASH_V2_db_();
    Object.keys(FIN_FLASH_V2_SCHEMAS).forEach(function(nome) {
      var schema = FIN_FLASH_V2_SCHEMAS[nome], sh = ss.getSheetByName(nome);
      if (!sh) { sh = ss.insertSheet(nome); sh.getRange(1,1,1,schema.length).setValues([schema]); sh.setFrozenRows(1); r.abasCriadas.push(nome); }
      else if (!FIN_FLASH_V2_headersOk_(sh, schema)) r.bloqueios.push('Aba existente com schema diferente: ' + nome + '. Nenhuma alteracao feita nela.');
    });
    if (!r.bloqueios.length) { r.success=true; r.ok=true; r.executado=true; r.gravacaoReal=true; }
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO(confirmacao) {
  var r = { success:false, ok:false, executado:false, ambienteTeste:'SIM', bloqueios:[], registrosCriados:[] };
  if (confirmacao !== 'AUTORIZO_USUARIO_TESTE_FIN_FLASH_V2') { r.bloqueios.push('Confirmacao explicita invalida.'); return r; }
  var a = AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR(); if (!a.ok) { r.bloqueios = a.bloqueios; return r; }
  try {
    var ss=FIN_FLASH_V2_db_(), cpf='00000000000', email='teste.flash@metrolabs.local', nome='TESTE FLASH COLABORADOR';
    var contas=ss.getSheetByName(FIN_FLASH_V2_ABAS.CONTAS), cartoes=ss.getSheetByName(FIN_FLASH_V2_ABAS.CARTOES);
    var dados=contas.getDataRange().getValues(), h=dados[0].map(FIN_FLASH_V2_text_);
    var iId=h.indexOf('ID'), iCpf=h.indexOf('CPF'), iNome=h.indexOf('NOME'), iEmail=h.indexOf('EMAIL'), iStatus=h.indexOf('STATUS'), iTeste=h.indexOf('AMBIENTE_TESTE');
    var contaRow=0, contaId='';
    for(var i=1;i<dados.length;i++) {
      var row=dados[i], rowCpf=FIN_FLASH_V2_text_(row[iCpf]), rowEmail=FIN_FLASH_V2_text_(row[iEmail]), rowNome=FIN_FLASH_V2_text_(row[iNome]), rowTeste=FIN_FLASH_V2_text_(row[iTeste]);
      if(rowTeste==='SIM' && (rowCpf===cpf || rowEmail===email || rowNome===nome)) { contaRow=i+1; contaId=FIN_FLASH_V2_text_(row[iId]); break; }
    }
    if(!contaId) contaId=FIN_FLASH_V2_id_('CONTA');
    if(!contaRow) { contaRow=contas.getLastRow()+1; r.registrosCriados.push('CONTA'); } else { r.registrosCriados.push('CONTA_VALIDADA'); }
    contas.getRange(contaRow,iCpf+1).setNumberFormat('@');
    contas.getRange(contaRow,1,1,h.length).setValues([[contaId,cpf,nome,email,'ATIVO_TESTE','SIM',new Date(),new Date()]]);
    contas.getRange(contaRow,iCpf+1).setNumberFormat('@').setValue(cpf);
    var cd=cartoes.getDataRange().getValues(), ch=cd[0].map(FIN_FLASH_V2_text_);
    var cId=ch.indexOf('ID'), cConta=ch.indexOf('CONTA_ID'), cCpf=ch.indexOf('CPF'), cTipo=ch.indexOf('TIPO_CARTAO'), cFinal=ch.indexOf('FINAL_CARTAO'), cStatus=ch.indexOf('STATUS'), cTeste=ch.indexOf('AMBIENTE_TESTE');
    [['FISICO','9999'],['VIRTUAL','8888']].forEach(function(x) {
      var tipo=x[0], final=x[1], cardRow=0, cardId='';
      for(var j=1;j<cd.length;j++) {
        var cr=cd[j], rowTeste=FIN_FLASH_V2_text_(cr[cTeste]), rowFinal=FIN_FLASH_V2_text_(cr[cFinal]), rowCpf=FIN_FLASH_V2_text_(cr[cCpf]);
        if(rowTeste==='SIM' && rowFinal===final && (rowCpf===cpf || rowCpf==='0' || rowCpf==='')) { cardRow=j+1; cardId=FIN_FLASH_V2_text_(cr[cId]); break; }
      }
      if(!cardId) cardId=FIN_FLASH_V2_id_('CARTAO');
      if(!cardRow) { cardRow=cartoes.getLastRow()+1; r.registrosCriados.push('CARTAO_'+tipo); } else { r.registrosCriados.push('CARTAO_'+tipo+'_VALIDADO'); }
      cartoes.getRange(cardRow,cCpf+1).setNumberFormat('@');
      cartoes.getRange(cardRow,cFinal+1).setNumberFormat('@');
      cartoes.getRange(cardRow,1,1,ch.length).setValues([[cardId,contaId,cpf,tipo,final,'ATIVO_TESTE','SIM',new Date(),new Date()]]);
      cartoes.getRange(cardRow,cCpf+1).setNumberFormat('@').setValue(cpf);
      cartoes.getRange(cardRow,cFinal+1).setNumberFormat('@').setValue(final);
    });
    r.success=true; r.ok=true; r.executado=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR() {
  var r={success:true,ok:false,somenteLeitura:true,gravacaoReal:false,bloqueios:[],detalhes:{}};
  try {
    var ss=FIN_FLASH_V2_db_(), cpf='00000000000';
    var contas=ss.getSheetByName(FIN_FLASH_V2_ABAS.CONTAS).getDataRange().getValues(), cartoes=ss.getSheetByName(FIN_FLASH_V2_ABAS.CARTOES).getDataRange().getValues();
    var h=contas[0].map(FIN_FLASH_V2_text_), iCpf=h.indexOf('CPF'), iTeste=h.indexOf('AMBIENTE_TESTE'), iNome=h.indexOf('NOME'), iEmail=h.indexOf('EMAIL'), iStatus=h.indexOf('STATUS');
    var conta=contas.slice(1).some(function(row) { return FIN_FLASH_V2_text_(row[iCpf])===cpf && FIN_FLASH_V2_text_(row[iTeste])==='SIM' && FIN_FLASH_V2_text_(row[iNome])==='TESTE FLASH COLABORADOR' && FIN_FLASH_V2_text_(row[iEmail])==='teste.flash@metrolabs.local' && FIN_FLASH_V2_text_(row[iStatus])==='ATIVO_TESTE'; });
    var ch=cartoes[0].map(FIN_FLASH_V2_text_), cCpf=ch.indexOf('CPF'), cTeste=ch.indexOf('AMBIENTE_TESTE'), cFinal=ch.indexOf('FINAL_CARTAO'), cTipo=ch.indexOf('TIPO_CARTAO'), cStatus=ch.indexOf('STATUS');
    var finais={};
    cartoes.slice(1).forEach(function(row) { if(FIN_FLASH_V2_text_(row[cCpf])===cpf && FIN_FLASH_V2_text_(row[cTeste])==='SIM' && FIN_FLASH_V2_text_(row[cStatus])==='ATIVO_TESTE') finais[FIN_FLASH_V2_text_(row[cFinal])]=FIN_FLASH_V2_text_(row[cTipo]); });
    r.detalhes={contaTesteEncontrada:conta,cartaoFisico9999:finais['9999']==='FISICO',cartaoVirtual8888:finais['8888']==='VIRTUAL'};
    if(!conta) r.bloqueios.push('Conta de teste ausente ou nao marcada AMBIENTE_TESTE=SIM.');
    if(finais['9999']!=='FISICO'||finais['8888']!=='VIRTUAL') r.bloqueios.push('Cartoes de teste 9999/8888 ausentes.');
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  r.ok=!r.bloqueios.length;
  return r;
}

function LIMPAR_FIN_FLASH_V2_TESTES_ANTES_GO_LIVE_MANUAL_AUTORIZADO(confirmacao) {
  var r={success:false,ok:false,executado:false,bloqueios:[],linhasRemovidas:{}};
  if(confirmacao!=='AUTORIZO_LIMPEZA_TESTES_FIN_FLASH_V2') {r.bloqueios.push('Confirmacao explicita invalida.');return r;}
  try { var ss=FIN_FLASH_V2_db_(); Object.keys(FIN_FLASH_V2_SCHEMAS).forEach(function(nome){var sh=ss.getSheetByName(nome), values=sh.getDataRange().getValues(), h=values[0], ix=h.indexOf('AMBIENTE_TESTE'), keep=[values[0]], removed=0; if(ix<0){r.bloqueios.push('AMBIENTE_TESTE ausente em '+nome);return;} values.slice(1).forEach(function(row){if(FIN_FLASH_V2_text_(row[ix])==='SIM') removed++;else keep.push(row);}); if(!r.bloqueios.length&&removed){sh.clearContents();sh.getRange(1,1,keep.length,h.length).setValues(keep);} r.linhasRemovidas[nome]=removed;}); if(!r.bloqueios.length){r.success=true;r.ok=true;r.executado=true;}
  } catch(e){r.bloqueios.push(e.message||String(e));} return r;
}


function EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV() {
  var r={success:false,ok:false,ambiente:'DESCONHECIDO',executado:false,setupExecutado:false,abasCriadasOuValidadas:0,usuarioTesteCriadoOuValidado:false,cartoesTesteCriadosOuValidados:false,menuLigado:false,importacaoRealExecutada:false,producaoAlterada:false,flashAntigoAlterado:false,todosDadosTesteComAmbienteTeste:false,bloqueios:[],avisos:[],auditoriaFinal:null};
  var dev='12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente=ScriptApp.getScriptId()===dev?'DEV':'DESCONHECIDO';
    if(r.ambiente!=='DEV'){r.bloqueios.push('Execucao bloqueada fora do DEV.');return r;}
    var ss=FIN_FLASH_V2_db_(), nomes=Object.keys(FIN_FLASH_V2_SCHEMAS);
    nomes.forEach(function(nome){var sh=ss.getSheetByName(nome);if(sh&&!FIN_FLASH_V2_headersOk_(sh,FIN_FLASH_V2_SCHEMAS[nome]))r.bloqueios.push('Schema existente invalido: '+nome+'.');});
    if(r.bloqueios.length)return r;
    var setup=SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO('AUTORIZO_SETUP_FIN_FLASH_V2');
    if(!setup.ok){r.bloqueios=r.bloqueios.concat(setup.bloqueios||[]);return r;}
    r.setupExecutado=true; r.abasCriadasOuValidadas=nomes.length;
    var shCfg=ss.getSheetByName(FIN_FLASH_V2_ABAS.CONFIG), cfg=shCfg.getDataRange().getValues(), ch=cfg[0], iCh=ch.indexOf('CHAVE');
    var existentes={};cfg.slice(1).forEach(function(row){existentes[FIN_FLASH_V2_text_(row[iCh])]=true;});
    [['AMBIENTE','DEV','Fundacao FIN_FLASH_V2 DEV'],['IMPORTACAO_REAL_HABILITADA','NAO','Bloqueio explicito de importacao real'],['MENU_LIGADO','NAO','Modulo V2 isolado'],['IA_APROVACAO_AUTOMATICA','NAO','IA nao aprova gasto sozinha']].forEach(function(x){if(!existentes[x[0]])shCfg.appendRow([x[0],x[1],x[2],'SIM',new Date()]);});
    var u=CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO('AUTORIZO_USUARIO_TESTE_FIN_FLASH_V2');
    if(!u.ok){r.bloqueios=r.bloqueios.concat(u.bloqueios||[]);return r;}
    var au=AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR();
    if(!au.ok){r.bloqueios=r.bloqueios.concat(au.bloqueios||[]);return r;}
    r.usuarioTesteCriadoOuValidado=true;r.cartoesTesteCriadosOuValidados=true;
    var shLog=ss.getSheetByName(FIN_FLASH_V2_ABAS.LOGS);shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'SETUP_AUTOMATICO_DEV_0B','FIN_FLASH_V2','FUNDACAO',JSON.stringify({setup:setup.abasCriadas,usuario:u.registrosCriados}),'SIM','SISTEMA_FIN_FLASH_V2',new Date()]);
    var af=AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR();r.auditoriaFinal={estrutura:af,usuarioTeste:au};
    if(!af.ok){r.bloqueios=r.bloqueios.concat(af.bloqueios||[]);return r;}
    r.todosDadosTesteComAmbienteTeste=true;r.success=true;r.ok=true;r.executado=true;return r;
  } catch(e){r.bloqueios.push(e.message||String(e));return r;}
}
