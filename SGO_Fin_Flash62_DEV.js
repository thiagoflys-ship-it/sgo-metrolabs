// FLASH.6.2 — auditoria pre-publicacao somente leitura no DEV.
var FLASH62_CONFIG={fase:'FLASH.6.2',ambiente:'DEV',destinoFuturo:'PRODUCAO_V2',cpf:'5553116198'};
function _flash62TodosTrue_(obj){return Object.keys(obj||{}).every(function(k){return obj[k]===true;});}
function _flash62ConfirmacoesNegativas_(c){return !!c&&c.implantacaoExecutada===false&&c.planilhaAlterada===false&&c.propertiesAlteradas===false&&c.recargaCriada===false&&c.lancamentoCriado===false&&c.emailOuWhatsappEnviado===false&&c.extratoImportado===false&&c.producaoV2Alterada===false;}
function AUDITAR_FLASH62_PRE_PUBLICACAO_PRODUCAO_V2_SEM_PUBLICAR(){
  var cfg=FLASH62_CONFIG,bloqueios=[],avisos=[],p61=null;
  try{
    p61=PREPARAR_FLASH61_PUBLICACAO_CONTROLADA_PRODUCAO_V2_SEM_PUBLICAR();
    var arquivosEsperados=['SGO_Fin_Flash60.js','SGO_Fin_Flash60_DEV.js','SGO_Fin_Flash61_DEV.js'];
    var arquivosAtuais=p61&&p61.arquivosCandidatos?p61.arquivosCandidatos:[];
    var arquivosPresentes=arquivosEsperados.every(function(nome){return arquivosAtuais.indexOf(nome)>=0;});
    var presencas=typeof _flash61Presencas_==='function'?_flash61Presencas_():{};
    var funcoesPresentes=_flash62TodosTrue_(presencas);
    var confirmacoesNegativas=_flash62ConfirmacoesNegativas_(p61?p61.confirmacoes:null);
    var passos=p61&&p61.checklistManualPublicacaoFutura?p61.checklistManualPublicacaoFutura:[];
    var textos=passos.join(' ').toLowerCase();
    var checklist={
      producaoV2SomenteDestinoFuturo:cfg.destinoFuturo==='PRODUCAO_V2'&&p61.confirmacoes.producaoV2Alterada===false,
      liberacaoGeralFalse:p61.liberacaoGeral===false,
      cpfAutorizadoMantido:p61.cpfAutorizado===cfg.cpf,
      flash44Protegido:p61.flash44Protegido===true,
      aceiteHumanoExplicito:textos.indexOf('aceite')>=0&&textos.indexOf('autorizacao humana explicita')>=0,
      planoDeRetorno:textos.indexOf('plano de retorno')>=0,
      auditoriaPosteriorObrigatoria:textos.indexOf('auditoria somente leitura apos')>=0
    };
    if(!p61||p61.success!==true||p61.ok!==true)bloqueios.push('FLASH.6.1 nao esta aprovada no estado atual do DEV.');
    if(!arquivosPresentes)bloqueios.push('Arquivos candidatos FLASH.6.1 incompletos.');
    if(!funcoesPresentes)bloqueios.push('Uma ou mais funcoes criticas nao estao presentes.');
    if(!confirmacoesNegativas)bloqueios.push('Uma ou mais confirmacoes de efeito real nao permanecem false.');
    Object.keys(checklist).forEach(function(k){if(checklist[k]!==true)bloqueios.push('Checklist pendente: '+k);});
    var out={
      success:bloqueios.length===0,
      ok:bloqueios.length===0,
      ambiente:cfg.ambiente,
      fase:cfg.fase,
      destinoFuturo:cfg.destinoFuturo,
      destinoExecutado:false,
      bloqueios:bloqueios,
      avisos:avisos,
      flash61Aprovada:!!p61&&p61.ok===true,
      arquivosCandidatosPresentes:arquivosPresentes,
      arquivosCandidatos:arquivosAtuais,
      funcoesCriticasPresentes:funcoesPresentes,
      funcoesCriticas:presencas,
      publicacaoAutomaticaAusente:confirmacoesNegativas,
      checklistPreProducao:checklist,
      confirmacoes:{implantacaoExecutada:false,planilhaAlterada:false,propertiesAlteradas:false,recargaCriada:false,lancamentoCriado:false,emailOuWhatsappEnviado:false,extratoImportado:false,producaoV2Alterada:false},
      gravacaoReal:false
    };
    Logger.log(JSON.stringify(out,null,2));return out;
  }catch(e){
    var erro={success:false,ok:false,ambiente:cfg.ambiente,fase:cfg.fase,destinoFuturo:cfg.destinoFuturo,destinoExecutado:false,bloqueios:bloqueios.concat(['Falha na auditoria FLASH.6.2: '+(e&&e.message?e.message:String(e))]),avisos:avisos,gravacaoReal:false};
    Logger.log(JSON.stringify(erro,null,2));return erro;
  }
}
function RESUMIR_FLASH62_GO_NOGO_SEM_PUBLICAR(){
  var auditoria=AUDITAR_FLASH62_PRE_PUBLICACAO_PRODUCAO_V2_SEM_PUBLICAR();
  var go=auditoria.ok===true&&auditoria.success===true&&auditoria.destinoExecutado===false&&auditoria.gravacaoReal===false;
  var out={
    success:true,
    ok:go,
    ambiente:'DEV',
    fase:'FLASH.6.2',
    decisao:go?'GO':'NO-GO',
    resumo:go?'GO tecnico para revisao e aceite humano; nenhuma publicacao foi executada.':'NO-GO: existem bloqueios que devem ser resolvidos antes de qualquer aceite.',
    bloqueios:auditoria.bloqueios||[],
    publicacaoExecutada:false,
    gravacaoReal:false
  };
  Logger.log(JSON.stringify(out,null,2));return out;
}
