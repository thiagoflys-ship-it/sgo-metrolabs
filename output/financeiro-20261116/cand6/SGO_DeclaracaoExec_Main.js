function DeclExec_apiDispatch(req){req=req||{};DeclExecQIQO_exigirEquipe_(String(req.sessionId||""));var fn=String(req.fn||"").trim();var payload=req.payload||{};var allow={apiPing:DeclExec_apiPing,apiConsultarCnpj:DeclExec_apiConsultarCnpj,apiUploadArquivo:DeclExec_apiUploadArquivo,apiGerarRascunho:DeclExec_apiGerarRascunho,apiMontarDocumentoFinal:DeclExec_apiMontarDocumentoFinal,apiGerarRascunhoQIQO:DeclExec_apiGerarRascunhoQIQO,apiMontarDocumentoQIQO:DeclExec_apiMontarDocumentoQIQO,apiSalvarDocumento:DeclExec_apiSalvarDocumento,apiListarDocumentosSalvos:DeclExec_apiListarDocumentosSalvos};if(typeof SGO_QEQ_rotasBuscaCadastro_==="function"){var rotasCad=SGO_QEQ_rotasBuscaCadastro_();Object.keys(rotasCad).forEach(function(k){allow[k]=rotasCad[k]})}if(!fn)throw new Error("Função não informada.");if(!allow[fn]||typeof allow[fn]!=="function")throw new Error("Função não permitida ou não encontrada: "+fn);if(fn==="apiGerarRascunhoQIQO"||fn==="apiMontarDocumentoQIQO"){var perfilQ=String(exigirSessao(String(req.sessionId||"")).perfil||"").trim().toUpperCase();if(perfilQ==="COMERCIAL"||perfilQ==="FINANCEIRO")throw new Error("O perfil "+(perfilQ==="COMERCIAL"?"Comercial":"Financeiro")+" consulta os relatórios de qualificação salvos, mas não os emite. Peça a emissão a um técnico, à metrologia ou ao gestor.")}return allow[fn](payload,req.sessionId)}function DeclExec_apiPing(){var perfis={};Object.keys(DECLEXEC_CFG.PERFIS).forEach(function(k){var p=DECLEXEC_CFG.PERFIS[k];perfis[k]={codigo:p.codigo,label:p.label,usaQI:p.usaQI,usaQO:p.usaQO,usaQD:p.usaQD,usaReceitas:p.usaReceitas,itensCalibraveis:p.itensCalibraveis,itensQI:p.itensQI||[],itensQO:p.itensQO||[],normas:p.normas,escopoPadrao:p.escopoPadrao}});return{ok:true,versao:"1.0-mvp",appTitle:DECLEXEC_CFG.APP_TITLE,perfis:perfis}}function DeclExec_apiConsultarCnpj(payload){payload=payload||{};var cnpj=String(payload.cnpj||"").replace(/\D/g,"");if(!/^\d{14}$/.test(cnpj))throw new Error("Informe um CNPJ válido com 14 dígitos.");var data=SGO_CNPJ_consultarDados_(cnpj);var enderecoPartes=[data.descricao_tipo_de_logradouro||"",data.logradouro||"",data.numero||"",data.complemento?"- "+data.complemento:"",data.bairro?"- "+data.bairro:"",data.municipio?"- "+data.municipio:"",data.uf?"/"+data.uf:"",data.cep?"- CEP "+data.cep:""].filter(function(v){return String(v||"").trim()}).join(" ");return{ok:true,cliente:data.razao_social||data.nome_fantasia||"",endereco:enderecoPartes.replace(/\s+/g," ").trim()}}function DeclExec_obterPastaPersistente_(){var props=PropertiesService.getScriptProperties();var idSalvo=props.getProperty(DECLEXEC_CFG.UPLOAD_FOLDER_PROP);if(idSalvo){try{return DriveApp.getFolderById(idSalvo)}catch(e){}}var folder=DriveApp.getRootFolder().createFolder("Declaracao Execucao Servico - Uploads");props.setProperty(DECLEXEC_CFG.UPLOAD_FOLDER_PROP,folder.getId());return folder}function DeclExec_apiUploadArquivo(payload){payload=payload||{};var base64=String(payload.base64||"");if(!base64)throw new Error("Nenhum arquivo recebido para upload.");var mimeType=payload.mimeType||"application/octet-stream";var nome=String(payload.fileName||"arquivo").replace(/[\\/:*?"<>|]/g,"_");var bytes=Utilities.base64Decode(base64);var blob=Utilities.newBlob(bytes,mimeType,nome);var folder=DeclExec_obterPastaPersistente_();var file=folder.createFile(blob);return{ok:true,fileId:file.getId()}}function DeclExec_validarPerfil_(chavePerfil){var perfil=DECLEXEC_CFG.PERFIS[String(chavePerfil||"").trim()];if(!perfil)throw new Error("Equipamento inválido ou ainda não configurado neste módulo: "+chavePerfil);return perfil}function DeclExec_montarDadosContexto_(payload){var perfil=DeclExec_validarPerfil_(payload.perfil);var calibracoesMarcadas=(Array.isArray(payload.calibracoes)?payload.calibracoes:[]).filter(function(c){return c&&c.marcado}).map(function(c){var item=(perfil.itensCalibraveis||[]).filter(function(i){return i.codigo===c.codigo})[0];return{codigo:c.codigo,label:item?item.label:c.codigo,quantidade:DeclExec_clampInt_(c.quantidade,1,999,1),observacao:String(c.observacao||"").trim()}});var periodo=DeclExec_montarPeriodo_(payload.dataInicio,payload.dataFim);return{equipamentoLabel:perfil.label,perfilCodigo:perfil.codigo,normas:perfil.normas,cliente:String(payload.cliente||"").trim(),endereco:String(payload.endereco||"").trim(),tag:String(payload.tagEquipamento||"").trim(),numeroSerie:String(payload.numeroSerie||"").trim().slice(0,80),marca:String(payload.marca||"").trim(),modelo:String(payload.modelo||"").trim(),localizacao:String(payload.localizacao||"").trim(),dataInicio:String(payload.dataInicio||"").trim(),dataFim:String(payload.dataFim||"").trim(),periodoLabel:periodo.label,diasAtendimento:periodo.dias,padroesUsados:(typeof SGO_DocA4_exigirPadroesValidos_==="function"?SGO_DocA4_exigirPadroesValidos_(payload.padroesUsados,(payload.dataFim||payload.dataInicio),"data do atendimento"):String(payload.padroesUsados||"").trim()),padroesDataRef:String(payload.dataFim||payload.dataInicio||"").trim(),tecnicoExecutor:String(payload.tecnicoExecutor||"").trim(),localAtendimento:payload.localAtendimento==="LABORATORIO"?"LABORATORIO":"CLIENTE",metodologiaTecnico:String(payload.metodologia||"").trim(),calibracoes:calibracoesMarcadas,qi:!!(perfil.usaQI&&payload.qi),qiObservacoes:String(payload.qiObservacoes||"").trim(),qo:!!(perfil.usaQO&&payload.qo),qoObservacoes:String(payload.qoObservacoes||"").trim(),qd:!!(perfil.usaQD&&payload.qd),qdObservacoes:String(payload.qdObservacoes||"").trim(),receitasQualificadas:perfil.usaReceitas?String(payload.receitasQualificadas||"").trim():""}}function DeclExec_parseDataBr_(s){var m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s||"").trim());if(!m)return null;var d=new Date(parseInt(m[3],10),parseInt(m[2],10)-1,parseInt(m[1],10));return isNaN(d.getTime())?null:d}function DeclExec_dataBrEstrita_(s){var d=DeclExec_parseDataBr_(s);if(!d)return null;var m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s||"").trim());return(d.getDate()===parseInt(m[1],10)&&d.getMonth()===parseInt(m[2],10)-1&&d.getFullYear()===parseInt(m[3],10))?d:null}
/* Período do atendimento: data inválida (ex.: 31/02) ou fim antes do início
   saíam no documento como texto solto; agora param com o que corrigir. */
function DeclExec_montarPeriodo_(dataInicioStr,dataFimStr){var ini=String(dataInicioStr||"").trim();var fim=String(dataFimStr||"").trim();if(!ini){if(fim)throw new Error("Informe a data de início do atendimento (seção 2, formato dd/mm/aaaa) ou apague a data de fim.");return{label:"—",dias:null}}var dIni=DeclExec_dataBrEstrita_(ini);if(!dIni)throw new Error("A data de início ("+ini+") não é uma data válida. Corrija na seção 2 no formato dd/mm/aaaa.");if(!fim||fim===ini)return{label:ini,dias:1};var dFim=DeclExec_dataBrEstrita_(fim);if(!dFim)throw new Error("A data de fim ("+fim+") não é uma data válida. Corrija na seção 2 no formato dd/mm/aaaa, ou deixe em branco se o atendimento foi em um dia só.");var dias=Math.round((dFim.getTime()-dIni.getTime())/864e5)+1;if(dias<1)throw new Error("A data de fim ("+fim+") é anterior à data de início ("+ini+"). Corrija o período na seção 2.");return{label:ini+" a "+fim+" ("+dias+(dias===1?" dia":" dias")+")",dias:dias}}function DeclExec_clampInt_(valor,min,max,fallback){var n=parseInt(valor,10);if(!isFinite(n))n=fallback;if(n<min)n=min;if(n>max)n=max;return n}function DeclExec_apiGerarRascunho(payload){payload=payload||{};var dados=DeclExec_montarDadosContexto_(payload);if(!dados.calibracoes.length&&!dados.qi&&!dados.qo&&!dados.qd){throw new Error("Marque pelo menos um item calibrado ou uma etapa de qualificação (QI/QO/QD) executada.")}var textos,avisoIA="";try{textos=DeclExecIA_criarTextos_(dados)}catch(eIA){textos=DeclExec_textosPadrao_(dados);avisoIA=DeclExec_avisoSemIA_(eIA)}return{ok:true,textos:textos,dados:dados,aviso:avisoIA}}function DeclExec_apiMontarDocumentoFinal(payload,sessionId){payload=payload||{};var docRev=SGO_DocRev_montar_("DECLARACAO_EXECUCAO",payload,sessionId,payload.numeroDocumento);var dados=DeclExec_montarDadosContexto_(payload);var textos=payload.textos||{};var fotos=(Array.isArray(payload.fotos)?payload.fotos:[]).slice(0,6).filter(function(f){return f&&f.base64});var ctx={numeroDocumento:docRev.numero||String(payload.numeroDocumento||"").trim()||SGO_DocRev_numeroLivre_("DECLARACAO_EXECUCAO",RelTecA4_numeroAuto_("DEX")),revisao:docRev.revisao,dataEmissao:Utilities.formatDate(new Date,Session.getScriptTimeZone()||"America/Sao_Paulo","dd/MM/yyyy"),cliente:dados.cliente,endereco:dados.endereco,equipamentoLabel:dados.equipamentoLabel,tag:dados.tag,numeroSerie:dados.numeroSerie,marca:dados.marca,modelo:dados.modelo,padroesUsados:dados.padroesUsados,padroesDataRef:dados.padroesDataRef,localizacao:dados.localizacao,periodoLabel:dados.periodoLabel,tecnicoExecutor:dados.tecnicoExecutor,localAtendimento:dados.localAtendimento,normas:dados.normas,calibracoes:dados.calibracoes,textos:{introducao:String(textos.introducao||"").trim(),metodologia:String(textos.metodologia||"").trim(),calibracoes:String(textos.calibracoes||"").trim(),qi:String(textos.qi||"").trim(),qo:String(textos.qo||"").trim(),qd:String(textos.qd||"").trim(),declaracaoFinal:String(textos.declaracaoFinal||"").trim()},fotos:fotos};return{ok:true,revisao:docRev.rotulo,html:SGO_DocRev_finalizarMontagem_("DECLARACAO_EXECUCAO",docRev,payload,DeclExec_finalizarHtml_(function(comSumario){return SGO_DocRev_injetarHtml_(DeclExec_montarDocumentoHtml_(ctx,{sumario:comSumario}),docRev)},"Declaracao de execucao"),ctx.numeroDocumento,{semHistorico:true})}}function DeclExec_resolverItensQualificacao_(itensConfig,itensPayload){var marcadosPorCodigo={};(Array.isArray(itensPayload)?itensPayload:[]).forEach(function(it){if(it&&it.codigo)marcadosPorCodigo[it.codigo]=it});return(itensConfig||[]).map(function(itCfg){var doPayload=marcadosPorCodigo[itCfg.codigo];return{codigo:itCfg.codigo,label:itCfg.label,marcado:!!(doPayload&&doPayload.marcado),observacao:doPayload?String(doPayload.observacao||"").trim():""}})}function DeclExec_montarDadosContextoQIQO_(payload){var perfil=DeclExec_validarPerfil_(payload.perfil);var periodo=DeclExec_montarPeriodo_(payload.dataInicio,payload.dataFim);var itensQI=perfil.usaQI?DeclExec_resolverItensQualificacao_(perfil.itensQI,payload.itensQI):[];var itensQO=perfil.usaQO?DeclExec_resolverItensQualificacao_(perfil.itensQO,payload.itensQO):[];return{equipamentoLabel:perfil.label,perfilCodigo:perfil.codigo,normas:perfil.normas,cliente:String(payload.cliente||"").trim(),endereco:String(payload.endereco||"").trim(),tag:String(payload.tagEquipamento||"").trim(),numeroSerie:String(payload.numeroSerie||"").trim().slice(0,80),marca:String(payload.marca||"").trim(),modelo:String(payload.modelo||"").trim(),localizacao:String(payload.localizacao||"").trim(),dataInicio:String(payload.dataInicio||"").trim(),dataFim:String(payload.dataFim||"").trim(),periodoLabel:periodo.label,padroesUsados:(typeof SGO_DocA4_exigirPadroesValidos_==="function"?SGO_DocA4_exigirPadroesValidos_(payload.padroesUsados,(payload.dataFim||payload.dataInicio),"data do atendimento"):String(payload.padroesUsados||"").trim()),padroesDataRef:String(payload.dataFim||payload.dataInicio||"").trim(),tecnicoExecutor:String(payload.tecnicoExecutor||"").trim(),localAtendimento:payload.localAtendimento==="LABORATORIO"?"LABORATORIO":"CLIENTE",usaQO:!!perfil.usaQO,usaQD:!!perfil.usaQD,itensQI:itensQI,itensQO:itensQO,itensCalibraveis:perfil.itensCalibraveis||[],metodologiaQI:String(payload.metodologiaQI||"").trim(),metodologiaQO:String(payload.metodologiaQO||"").trim(),metodologiaQD:String(payload.metodologiaQD||"").trim()}}function DeclExec_resolverCertificadosQD_(itensCalibraveisConfig,certsPayload,contextoEquipamento){var porCodigo=DeclExecQIQO_indexarCertificados_(itensCalibraveisConfig,certsPayload);return(itensCalibraveisConfig||[]).map(function(itCfg){var doPayload=porCodigo[itCfg.codigo];var temCertificado=!!(doPayload&&doPayload.base64);var leitura=temCertificado?DeclExecIA_lerCertificado_(doPayload.base64,doPayload.mimeType,itCfg.label,contextoEquipamento):"";if(temCertificado&&!leitura&&!DeclExecIA_obterConfig_().geminiKey){leitura="Certificado de calibração de "+itCfg.label+" apresentado neste atendimento. Os resultados de medição, as incertezas e a rastreabilidade devem ser consultados no próprio certificado, que é a referência desta qualificação de desempenho."}if(temCertificado&&(!leitura||/^\(não foi possível ler/i.test(leitura))){throw new Error("Não foi possível ler o certificado de "+itCfg.label+". Confira o arquivo e tente novamente; QD não pode ser gerada sem evidência legível.")}if(temCertificado)leitura=DeclExecQIQO_validarTextos_({qdTexto:leitura}).qdTexto;return{codigo:itCfg.codigo,label:itCfg.label,temCertificado:temCertificado,arquivoHash:temCertificado?DeclExecQIQO_hashArquivo_(doPayload.base64):"",contextoEquipamento:contextoEquipamento||"",leituraIA:leitura,observacao:doPayload?String(doPayload.observacao||"").trim():""}})}function DeclExecQIQO_indexarCertificados_(config,lista){var permitidos=Object.create(null),mapa=Object.create(null);(config||[]).forEach(function(item){permitidos[item.codigo]=true});(Array.isArray(lista)?lista:[]).forEach(function(item){if(!item||!permitidos[item.codigo])throw new Error("Instrumento desconhecido nos certificados de QD.");if(mapa[item.codigo])throw new Error("Instrumento duplicado nos certificados de QD: "+item.codigo);mapa[item.codigo]=item});return mapa}function DeclExecQIQO_exigirEquipe_(sessionId){var sid=String(sessionId||"").trim();if(!sid)throw new Error("Sessão obrigatória.");var sessao=exigirSessao(sid);if(!sessao||String(sessao.perfil||"").toUpperCase()==="CLIENTE")throw new Error("Acesso exclusivo à equipe interna.");if(typeof SGO_bloquearRH_==="function")SGO_bloquearRH_(sessao,"a Declaração de execução e o Relatório de qualificação");return sessao}function DeclExecQIQO_hashArquivo_(base64){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(base64||"")))}function DeclExec_apiGerarRascunhoQIQO(payload,sessionId){DeclExecQIQO_exigirEquipe_(sessionId);payload=payload||{};var dados=DeclExec_montarDadosContextoQIQO_(payload);var qiMarcados=dados.itensQI.filter(function(it){return it.marcado});var qoMarcados=dados.itensQO.filter(function(it){return it.marcado});if(!qiMarcados.length&&!qoMarcados.length){throw new Error("Marque ao menos um item de Qualificação de Instalação ou de Operação.")}var contextoEquipamento=dados.equipamentoLabel+(dados.tag?" (TAG "+dados.tag+")":"");dados.certificadosQD=dados.usaQD?DeclExec_resolverCertificadosQD_(dados.itensCalibraveis,payload.certificadosQD,contextoEquipamento):[];dados.temCertificadosQD=dados.certificadosQD.some(function(c){return c.temCertificado});var textos,avisoIA=dados.avisoLeituraQD||"";try{textos=DeclExecIA_criarTextosQIQO_(dados)}catch(eIA){textos=DeclExec_textosPadraoQIQO_(dados);avisoIA=DeclExec_avisoSemIA_(eIA)}return{ok:true,textos:textos,dados:dados,aviso:avisoIA}}function DeclExec_apiMontarDocumentoQIQO(payload,sessionId){DeclExecQIQO_exigirEquipe_(sessionId);payload=payload||{};var docRev=SGO_DocRev_montar_("DECLARACAO_QIQO",payload,sessionId,payload.numeroDocumento);if(docRev.origemId&&!(Array.isArray(payload.leiturasQD)&&payload.leiturasQD.length)){var docRevOrigem=SGO_DocRev_payloadOrigem_(docRev);if(docRevOrigem&&Array.isArray(docRevOrigem.leiturasQD))payload.leiturasQD=docRevOrigem.leiturasQD}var dados=DeclExec_montarDadosContextoQIQO_(payload);var textos=DeclExecQIQO_validarTextos_(payload.textos||{});var contextoEquipamento=dados.equipamentoLabel+(dados.tag?" (TAG "+dados.tag+")":"");function prepararFotos(fotosPayload){return(Array.isArray(fotosPayload)?fotosPayload:[]).slice(0,6).filter(function(f){return f&&f.base64}).map(function(f){return{mimeType:f.mimeType||"image/jpeg",base64:f.base64,legendaTecnico:String(f.legenda||"").trim(),legendaIA:DeclExec_legendaIAOuVazio_(DeclExecIA_analisarFoto_(f.base64,f.mimeType,contextoEquipamento))}})}function prepararCertificadosQD(){if(!dados.usaQD)return[];var leiturasPorCodigo=DeclExecQIQO_indexarCertificados_(dados.itensCalibraveis,payload.leiturasQD);var arquivosPorCodigo=DeclExecQIQO_indexarCertificados_(dados.itensCalibraveis,payload.certificadosQD);return(dados.itensCalibraveis||[]).map(function(itCfg){var leitura=leiturasPorCodigo[itCfg.codigo];var arquivo=arquivosPorCodigo[itCfg.codigo];if(arquivo&&arquivo.base64&&!(leitura&&leitura.temCertificado)){throw new Error("Certificado ainda não lido. Gere o rascunho novamente.")}if(leitura&&leitura.temCertificado&&(!String(leitura.leituraIA||"").trim()||/^\(não foi possível ler/i.test(leitura.leituraIA))){throw new Error("Leitura do certificado vazia ou indisponível. Gere o rascunho novamente.")}if(leitura&&leitura.temCertificado&&leitura.contextoEquipamento!==contextoEquipamento){throw new Error("Equipamento ou TAG alterado após a leitura. Gere o rascunho novamente.")}if(leitura&&leitura.temCertificado&&(!arquivo||!arquivo.base64||!leitura.arquivoHash||leitura.arquivoHash!==DeclExecQIQO_hashArquivo_(arquivo.base64))){throw new Error("Certificado de "+itCfg.label+" foi alterado após a leitura. Gere o rascunho novamente.")}return{codigo:itCfg.codigo,label:itCfg.label,temCertificado:!!(leitura&&leitura.temCertificado),leituraIA:leitura?String(leitura.leituraIA||"").trim():"",observacao:leitura?String(leitura.observacao||"").trim():"",mimeType:arquivo?arquivo.mimeType||"":"",base64:arquivo?arquivo.base64||"":""}})}var ctx={numeroDocumento:docRev.numero||String(payload.numeroDocumento||"").trim()||SGO_DocRev_numeroLivre_("DECLARACAO_QIQO",RelTecA4_numeroAuto_("RQQ")),revisao:docRev.revisao,dataEmissao:Utilities.formatDate(new Date,Session.getScriptTimeZone()||"America/Sao_Paulo","dd/MM/yyyy"),cliente:dados.cliente,endereco:dados.endereco,equipamentoLabel:dados.equipamentoLabel,tag:dados.tag,numeroSerie:dados.numeroSerie,marca:dados.marca,modelo:dados.modelo,padroesUsados:dados.padroesUsados,padroesDataRef:dados.padroesDataRef,localizacao:dados.localizacao,periodoLabel:dados.periodoLabel,tecnicoExecutor:dados.tecnicoExecutor,localAtendimento:dados.localAtendimento,normas:dados.normas,usaQO:dados.usaQO,usaQD:dados.usaQD,itensQI:dados.itensQI,itensQO:dados.itensQO,textos:{introducao:String(textos.introducao||"").trim(),objetivo:String(textos.objetivo||"").trim(),qiTexto:String(textos.qiTexto||"").trim(),qoTexto:String(textos.qoTexto||"").trim(),qdTexto:String(textos.qdTexto||"").trim(),conclusao:String(textos.conclusao||"").trim()},fotosQI:prepararFotos(payload.fotosQI),fotosQO:dados.usaQO?prepararFotos(payload.fotosQO):[],certificadosQD:prepararCertificadosQD()};return{ok:true,revisao:docRev.rotulo,html:SGO_DocRev_finalizarMontagem_("DECLARACAO_QIQO",docRev,payload,DeclExec_finalizarHtml_(function(comSumario){return SGO_DocRev_injetarHtml_(DeclExecQIQO_montarDocumentoHtml_(ctx,{sumario:comSumario}),docRev)},"Relatorio de qualificacao"),ctx.numeroDocumento,{semHistorico:true})}}var DECLEXEC_DOCS_FOLDER_PROP="DECLEXEC_DOCUMENTOS_FOLDER_ID";function DeclExec_obterPastaDocumentos_(){var props=PropertiesService.getScriptProperties();var idSalvo=props.getProperty(DECLEXEC_DOCS_FOLDER_PROP);if(idSalvo){try{return DriveApp.getFolderById(idSalvo)}catch(e){}}var folder=DriveApp.getRootFolder().createFolder("Declaracao Execucao Servico - Documentos Gerados");props.setProperty(DECLEXEC_DOCS_FOLDER_PROP,folder.getId());return folder}function DeclExec_sanitizarNome_(nome){var limpo=String(nome||"").replace(/[\\\/:*?"<>|#%]+/g,"_").replace(/\s+/g," ").trim().slice(0,80);return limpo||"sem-nome"}
/* Pasta do cliente (padrão A4 de 18/10/2026): subpasta com o CNPJ de 14 dígitos e a razão social na
   descrição (SGO_DocSalvar_pastaClienteEm_). Sem CNPJ no formulário, procura o cliente no cadastro pelo
   nome; se não achar, usa o nome do cliente, como antes. */
function DeclExec_obterPastaCliente_(nomeCliente, cnpj) {
  var raiz = DeclExec_obterPastaDocumentos_();
  var nome = String(nomeCliente || '').trim() || 'Cliente nao informado';
  var doc = String(cnpj || '').replace(/\D/g, '') || DeclExec_cnpjDoCadastro_(nome);
  return SGO_DocSalvar_pastaClienteEm_(raiz, doc, nome);
}
/* CNPJ (14 dígitos) do cliente com esta razão social ou nome fantasia no cadastro; '' se não achar. Nunca lança. */
function DeclExec_cnpjDoCadastro_(nomeCliente) {
  try {
    var alvo = String(nomeCliente || '').trim().toUpperCase();
    if (!alvo) return '';
    var achado = (SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || []).filter(function (c) {
      return String(c.RAZAO_SOCIAL || '').trim().toUpperCase() === alvo || String(c.NOME_FANTASIA || '').trim().toUpperCase() === alvo;
    })[0];
    var d = achado ? String(achado.CNPJ || '').replace(/\D/g, '') : '';
    return d.length === 14 ? d : '';
  } catch (e) { return ''; }
}
/* Número do documento gravado no próprio HTML (<meta name="sgo-numero">), para o nome do arquivo. */
function DeclExec_numeroDoHtml_(html) {
  var m = /<meta name="sgo-numero" content="([^"]*)"/.exec(String(html || ''));
  return m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim() : '';
}
/* Razão social do cadastro para a pasta com nome de CNPJ (quando a pasta não guarda a descrição). Nunca lança. */
function DeclExec_nomeDoCadastro_(nomePasta, cache) {
  try {
    if (!/^\d{14}$/.test(String(nomePasta || ''))) return '';
    var lista = (cache && cache.lista) || SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || [];
    if (cache) cache.lista = lista;
    var achado = lista.filter(function (c) { return String(c.CNPJ || '').replace(/\D/g, '') === nomePasta; })[0];
    return achado ? String(achado.RAZAO_SOCIAL || achado.NOME_FANTASIA || '').trim() : '';
  } catch (e) { return ''; }
}
/* Grava HTML + PDF na pasta do cliente com o nome padrão
   "<Tipo do documento> - <número> - <TAG> - <aaaa-MM-dd HHmm>" (.html e .pdf de mesmo nome).
   Documento com sumário já chega com os números de página (montado em DeclExec_finalizarHtml_). */
function DeclExec_apiSalvarDocumento(payload, sessionId) {
  DeclExecQIQO_exigirEquipe_(sessionId);
  payload = payload || {};
  var html = String(payload.html || '');
  if (!html) throw new Error('Nenhum conteúdo de documento recebido para salvar.');
  // 21/10/2026: dados para corrigir depois (SGO_DocRevisao.js); a marca interna sai do HTML antes de gravar.
  var docRevS = SGO_DocRev_abrirSalvamento_(html);
  html = docRevS.html;
  var docRevModulo = payload.tipoDocumento === 'qiqo' ? 'DECLARACAO_QIQO' : 'DECLARACAO_EXECUCAO';
  var tipo = payload.tipoDocumento === 'qiqo' ? 'Relatorio de qualificacao' : 'Declaracao de execucao';
  var numero = DeclExec_numeroDoHtml_(html) || String(payload.numeroDocumento || '').trim();
  var carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd HHmm');
  var nomeBase = SGO_DocSalvar_sanitizarNome_([tipo, SGO_DocRev_numeroComRevisao_(numero, docRevS.rev), String(payload.tag || '').trim() || 'sem TAG', carimbo].filter(Boolean).join(' - '));
  var folder = DeclExec_obterPastaCliente_(payload.cliente, payload.cnpj);
  var r = SGO_DocSalvar_salvarHtmlEPdf_(folder, nomeBase, html, {});
  var docRevR = SGO_DocRev_registrarPendente_(docRevModulo, docRevS.id, { numero: numero, titulo: String(payload.equipamentoLabel || ''), cliente: String(payload.cliente || ''), cnpj: String(payload.cnpj || ''), tag: String(payload.tag || ''), pdfId: r.pdfId, htmlId: r.htmlId, pdfUrl: r.pdfUrl, htmlUrl: r.htmlUrl }, SGO_DocRev_sessao_(sessionId));
  return { ok: true, fileId: r.pdfId, fileName: r.pdfNome, url: r.pdfUrl, htmlId: r.htmlId, htmlUrl: r.htmlUrl, pastaUrl: folder.getUrl(), revisao: docRevR.rotulo, avisoRevisao: docRevR.ok ? '' : docRevR.aviso };
}
/* Lista os PDFs das pastas de cliente. A pasta nova tem o CNPJ como nome e a razão social na descrição;
   as antigas, o nome do cliente. Aceita os prefixos antigos ("Declaracao - ", "QI-QO - ") e os novos. */
function DeclExec_apiListarDocumentosSalvos(payload, sessionId) {
  DeclExecQIQO_exigirEquipe_(sessionId);
  payload = payload || {};
  var termo = String(payload.termoBusca || '').trim().toLowerCase();
  var prefixos = payload.tipoFiltro === 'qiqo' ? ['qi-qo -', 'relatorio de qualificacao -'] : payload.tipoFiltro === 'declaracao' ? ['declaracao -', 'declaracao de execucao -'] : null;
  var raiz = DeclExec_obterPastaDocumentos_();
  var resultado = [];
  var cadastro = {};
  var pastasClientes = raiz.getFolders();
  while (pastasClientes.hasNext() && resultado.length < 300) {
    var pastaCliente = pastasClientes.next();
    var descricao = '';
    try { descricao = String(pastaCliente.getDescription() || '').trim(); } catch (e) { descricao = ''; }
    var nomeCliente = descricao || DeclExec_nomeDoCadastro_(pastaCliente.getName(), cadastro) || pastaCliente.getName();
    var bateNomeCliente = !termo || nomeCliente.toLowerCase().indexOf(termo) !== -1 || pastaCliente.getName().toLowerCase().indexOf(termo) !== -1;
    var arquivos = pastaCliente.getFilesByType(MimeType.PDF);
    while (arquivos.hasNext() && resultado.length < 300) {
      var arquivo = arquivos.next();
      var nomeArquivo = arquivo.getName();
      var nomeMin = nomeArquivo.toLowerCase();
      if (prefixos && !prefixos.some(function (p) { return nomeMin.indexOf(p) === 0; })) continue;
      var bate = bateNomeCliente || nomeMin.indexOf(termo) !== -1;
      if (bate) {
        resultado.push({ fileId: arquivo.getId(), fileName: nomeArquivo, cliente: nomeCliente, url: arquivo.getUrl(), dataCriacao: arquivo.getDateCreated().getTime() });
      }
    }
  }
  resultado.sort(function (a, b) { return b.dataCriacao - a.dataCriacao; });
  return { ok: true, documentos: resultado.slice(0, 50) };
}


/* Falha da IA ao analisar a foto volta como "(não foi possível ...)": esse aviso interno não pode ir para o documento do cliente; a foto sai só com a legenda do técnico. */
function DeclExec_legendaIAOuVazio_(texto){var t=String(texto||"").trim();return /^\(não foi possível/i.test(t)?"":t}


/* ---------- Textos padrão (sem IA): a Declaração e o QI/QO/QD podem ser gerados sem a chave ---------- */
function DeclExec_avisoSemIA_(e) {
  var motivo = String(e && e.message ? e.message : e || '').replace(/^A interpretação por IA não está disponível: /, '').replace(/[.\s]+$/, '');
  return 'Os textos abaixo são o texto padrão, sem a redação da IA (' + motivo + '). Revise e complete cada campo antes de confirmar.';
}
function DeclExec_identificacao_(d) {
  var partes = [d.equipamentoLabel];
  if (d.tag) partes.push('TAG ' + d.tag);
  // 21/10/2026: nº de série do cadastro (equipamento escolhido em "Buscar no cadastro").
  if (d.numeroSerie) partes.push('nº de série ' + d.numeroSerie);
  var mm = [d.marca, d.modelo].filter(Boolean).join(' / ');
  if (mm) partes.push(mm);
  return partes.join(', ');
}
function DeclExec_quandoOnde_(d) {
  var quando = d.periodoLabel ? (/ a /.test(d.periodoLabel) ? 'no período de ' + d.periodoLabel : 'em ' + d.periodoLabel) : '';
  var onde = d.localAtendimento === 'LABORATORIO' ? 'no laboratório da Metrolabs' : 'nas instalações do cliente' + (d.localizacao ? ' (' + d.localizacao + ')' : '');
  return [quando, onde].filter(Boolean).join(', ');
}
function DeclExec_textosPadrao_(d) {
  var intro = 'Declaramos, para os devidos fins, que a Metrolabs Soluções em Engenharia Clínica executou serviço técnico no equipamento ' +
    DeclExec_identificacao_(d) + (d.cliente ? ', de ' + d.cliente : '') + ', ' + DeclExec_quandoOnde_(d) +
    (d.tecnicoExecutor ? ', sob a execução do técnico ' + d.tecnicoExecutor : '') + '.';
  var etapas = [];
  if (d.qi) etapas.push('qualificação de instalação (QI)' + (d.qiObservacoes ? ': ' + d.qiObservacoes : ''));
  if (d.qo) etapas.push('qualificação de operação (QO)' + (d.qoObservacoes ? ': ' + d.qoObservacoes : ''));
  if (d.qd) etapas.push('qualificação de desempenho (QD)' + (d.qdObservacoes ? ': ' + d.qdObservacoes : ''));
  var met = (d.metodologiaTecnico ? d.metodologiaTecnico + '\n\n' : '') +
    // As normas ficam listadas uma vez só, na seção "Referências normativas" do documento.
    'Os serviços seguiram os procedimentos técnicos da Metrolabs' + ((d.normas || []).length ? ' e as normas de referência aplicáveis ao equipamento, listadas em Referências normativas' : '') + '.' +
    (etapas.length ? ' Foram executadas as etapas de ' + (etapas.length > 1 ? etapas.slice(0, -1).join('; ') + ' e ' + etapas[etapas.length - 1] : etapas[0]) + '.' : '') +
    (d.receitasQualificadas ? ' Receitas (ciclos) qualificadas: ' + d.receitasQualificadas + '.' : '');
  // Itens, quantidades e observações ficam na Tabela 1 do documento (não se repetem no texto).
  var cal = (d.calibracoes || []).length
    ? 'Os itens calibrados, as quantidades' + (d.calibracoes.some(function (c) { return c.observacao; }) ? ' e as observações do técnico' : '') +
      ' constam da Tabela 1. Os resultados de medição constam dos certificados de calibração correspondentes.'
    : '';
  var fim = 'Este documento declara a execução dos serviços descritos, sem emitir juízo de conformidade sobre o equipamento. Os resultados técnicos constam dos relatórios e certificados correspondentes, e a liberação do equipamento para uso cabe ao setor de qualidade do cliente.';
  return { introducao: intro, metodologia: met, calibracoes: cal, declaracaoFinal: fim };
}
function DeclExec_listaItens_(itens) {
  return (itens || []).filter(function (it) { return it.marcado; }).map(function (it) {
    return it.label + (it.observacao ? ' (observação: ' + it.observacao + ')' : '');
  });
}
function DeclExec_textosPadraoQIQO_(d) {
  var qi = DeclExec_listaItens_(d.itensQI), qo = DeclExec_listaItens_(d.itensQO);
  var qd = (d.certificadosQD || []).filter(function (c) { return c.temCertificado; });
  var etapas = ['de instalação (QI)'];
  if (d.usaQO && qo.length) etapas.push('de operação (QO)');
  if (qd.length) etapas.push('de desempenho (QD)');
  var etapasTxt = etapas.length > 1 ? etapas.slice(0, -1).join(', ') + ' e ' + etapas[etapas.length - 1] : etapas[0];
  var intro = 'Este relatório registra a qualificação ' + etapasTxt + ' do equipamento ' + DeclExec_identificacao_(d) +
    (d.cliente ? ', de ' + d.cliente : '') + ', realizada ' + DeclExec_quandoOnde_(d) + (d.tecnicoExecutor ? ', pelo técnico ' + d.tecnicoExecutor : '') + '.';
  // Normas, itens e certificados aparecem uma vez só no documento: as normas em "Referências
  // normativas" e os itens e certificados nas tabelas de cada seção (mesma numeração do documento).
  var nTabQI = qi.length ? 1 : 0;
  var nTabQO = d.usaQO && qo.length ? nTabQI + 1 : 0;
  var nTabQD = qd.length ? Math.max(nTabQI, nTabQO) + 1 : 0;
  var obj = 'Documentar as verificações executadas, como evidência para o setor de qualidade do cliente' +
    ((d.normas || []).length ? ', tendo como referência as normas listadas em Referências normativas' : '') + '.';
  var qiTxt = (d.metodologiaQI ? d.metodologiaQI + '\n\n' : '') + (qi.length ? 'Os itens verificados na qualificação de instalação constam da Tabela ' + nTabQI + '.' : '');
  var qoTxt = d.usaQO && qo.length ? (d.metodologiaQO ? d.metodologiaQO + '\n\n' : '') + 'Os itens verificados na qualificação de operação constam da Tabela ' + nTabQO + '.' : '';
  var qdTxt = qd.length ? (d.metodologiaQD ? d.metodologiaQD + '\n\n' : '') + 'Para a qualificação de desempenho foram apresentados os certificados de calibração indicados na Tabela ' + nTabQD +
    '. Os resultados de medição, as incertezas e a rastreabilidade constam dos próprios certificados.' : '';
  var concl = 'As verificações registradas neste relatório foram executadas no período indicado. Este relatório não emite juízo de aprovação ou reprovação do equipamento: a avaliação dos resultados e a liberação para uso cabem ao setor de qualidade do cliente.';
  return { introducao: intro, objetivo: obj, qiTexto: qiTxt, qoTexto: qoTxt, qdTexto: qdTxt, conclusao: concl };
}
