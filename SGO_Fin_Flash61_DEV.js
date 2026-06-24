// FLASH.6.1 — pacote declarativo para futura publicacao controlada; somente DEV.
var FLASH61_CONFIG={fase:'FLASH.6.1',ambiente:'DEV',scriptDev:'12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG',cpf:'5553116198'};
function _flash61Funcoes_(){return['PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR','GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR','GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR','GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR','GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR','PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR','AUDITAR_FLASH_BLOQUEIO_RECARGA_POR_PENDENCIA_SEM_GRAVAR','AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR','DIAGNOSTICAR_FLASH60_CRITERIOS_DEV_SEM_GRAVAR','EXECUTAR_FLASH60_AUDITORIA_FINAL_DEV_SEM_GRAVAR','PREPARAR_FLASH61_PUBLICACAO_CONTROLADA_PRODUCAO_V2_SEM_PUBLICAR','AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR'];}
function _flash61Arquivos_(){return['SGO_Fin_Flash60.js','SGO_Fin_Flash60_DEV.js','SGO_Fin_Flash61_DEV.js'];}
function _flash61Riscos_(){return[
  {risco:'Ambiente incorreto',controle:'Validar scriptId DEV antes da preparacao.'},
  {risco:'Liberacao ampla',controle:'liberacaoGeral deve permanecer false.'},
  {risco:'CPF nao autorizado',controle:'Guard FLASH.4.13 e CPF 5553116198 preservados.'},
  {risco:'Regressao FLASH44',controle:'Sentinela de integridade obrigatoria.'},
  {risco:'Efeito real acidental',controle:'Pacote composto apenas por leituras e retorno JSON.'},
  {risco:'Publicacao prematura',controle:'Nenhuma rotina de publicacao ou alteracao de implantacao incluida.'}
];}
function _flash61Checklist_(){return[
  'Revisar o JSON FLASH.6.0D mais recente no editor DEV.',
  'Confirmar scriptId e banco de destino antes de qualquer acao futura.',
  'Revisar diferencas dos tres arquivos candidatos.',
  'Confirmar liberacaoGeral=false no destino.',
  'Confirmar guard FLASH.4.13 e CPF autorizado 5553116198.',
  'Confirmar sentinela FLASH44 antes e depois da futura publicacao.',
  'Obter aceite visual e tecnico registrado.',
  'Criar janela de mudanca e plano de retorno.',
  'Executar futura publicacao somente com autorizacao humana explicita.',
  'Repetir auditoria somente leitura apos a futura publicacao.'
];}
function _flash61Presencas_(){return{
  PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR:typeof PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR==='function',
  GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR:typeof GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR==='function',
  GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR:typeof GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR==='function',
  GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR:typeof GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR==='function',
  GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR:typeof GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR==='function',
  PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR:typeof PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR==='function',
  AUDITAR_FLASH_BLOQUEIO_RECARGA_POR_PENDENCIA_SEM_GRAVAR:typeof AUDITAR_FLASH_BLOQUEIO_RECARGA_POR_PENDENCIA_SEM_GRAVAR==='function',
  AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR:typeof AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR==='function',
  DIAGNOSTICAR_FLASH60_CRITERIOS_DEV_SEM_GRAVAR:typeof DIAGNOSTICAR_FLASH60_CRITERIOS_DEV_SEM_GRAVAR==='function',
  EXECUTAR_FLASH60_AUDITORIA_FINAL_DEV_SEM_GRAVAR:typeof EXECUTAR_FLASH60_AUDITORIA_FINAL_DEV_SEM_GRAVAR==='function',
  PREPARAR_FLASH61_PUBLICACAO_CONTROLADA_PRODUCAO_V2_SEM_PUBLICAR:typeof PREPARAR_FLASH61_PUBLICACAO_CONTROLADA_PRODUCAO_V2_SEM_PUBLICAR==='function',
  AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR:typeof AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR==='function'
};}
function AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR(){
  var cfg=FLASH61_CONFIG,bloqueios=[],avisos=[],r60=null,p=_flash61Presencas_();
  try{
    r60=EXECUTAR_FLASH60_AUDITORIA_FINAL_DEV_SEM_GRAVAR();
    if(!r60||r60.success!==true||r60.ok!==true)bloqueios.push('FLASH.6.0D nao aprovada no estado atual do DEV.');
    if(!r60||r60.ambiente!==cfg.ambiente||r60.scriptId!==cfg.scriptDev)bloqueios.push('Ambiente DEV esperado nao confirmado.');
    Object.keys(p).forEach(function(k){if(p[k]!==true)bloqueios.push('Funcao ausente: '+k);});
    if(!r60||r60.liberacaoGeral!==false)bloqueios.push('liberacaoGeral deve permanecer false.');
    if(!r60||r60.cpfBrunaAutorizado!==true||cfg.cpf!=='5553116198')bloqueios.push('CPF autorizado controlado nao preservado.');
    if(!r60||r60.flash44Intacto!==true)bloqueios.push('Protecao FLASH44 nao confirmada.');
    if(r60&&r60.confirmacoes&&r60.confirmacoes.producaoV2Publicada!==false)bloqueios.push('Confirmacao de producao deve permanecer false.');
    var out={success:bloqueios.length===0,ok:bloqueios.length===0,ambiente:cfg.ambiente,fase:cfg.fase,bloqueios:bloqueios,avisos:avisos,flash60dAprovada:!!r60&&r60.ok===true,funcoesPresentes:p,liberacaoGeral:r60?r60.liberacaoGeral:null,cpfAutorizado:cfg.cpf,flash44Protegido:!!r60&&r60.flash44Intacto===true,confirmacoes:{implantacaoExecutada:false,planilhaAlterada:false,propertiesAlteradas:false,recargaCriada:false,lancamentoCriado:false,emailOuWhatsappEnviado:false,extratoImportado:false,producaoV2Alterada:false},gravacaoReal:false};
    Logger.log(JSON.stringify(out,null,2));return out;
  }catch(e){var erro={success:false,ok:false,ambiente:cfg.ambiente,fase:cfg.fase,bloqueios:bloqueios.concat(['Falha na auditoria FLASH.6.1: '+(e&&e.message?e.message:String(e))]),avisos:avisos,gravacaoReal:false};Logger.log(JSON.stringify(erro,null,2));return erro;}
}
function PREPARAR_FLASH61_PUBLICACAO_CONTROLADA_PRODUCAO_V2_SEM_PUBLICAR(){
  var a=AUDITAR_FLASH61_PACOTE_PUBLICACAO_SEM_PUBLICAR();
  var out={success:a.success===true,ok:a.ok===true,ambiente:FLASH61_CONFIG.ambiente,fase:FLASH61_CONFIG.fase,bloqueios:a.bloqueios||[],avisos:a.avisos||[],flash60dAprovada:a.flash60dAprovada===true,arquivosCandidatos:_flash61Arquivos_(),funcoesCriticas:_flash61Funcoes_(),riscosControlados:_flash61Riscos_(),checklistManualPublicacaoFutura:_flash61Checklist_(),confirmacoes:{implantacaoExecutada:false,planilhaAlterada:false,propertiesAlteradas:false,recargaCriada:false,lancamentoCriado:false,emailOuWhatsappEnviado:false,extratoImportado:false,producaoV2Alterada:false},liberacaoGeral:a.liberacaoGeral,cpfAutorizado:FLASH61_CONFIG.cpf,flash44Protegido:a.flash44Protegido===true,gravacaoReal:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}
