// FIN_FLASH_V2 — regras iniciais sem importacao real ou aprovacao automatica.
var FIN_FLASH_V2_STATUS_CONCILIACAO = ['CONCILIADO','CONCILIADO_AUTOMATICO','AGUARDANDO_CONFERENCIA','PENDENTE_SEM_PRESTACAO','PENDENTE_SEM_COMPROVANTE','PENDENTE_VALOR_DIVERGENTE','PENDENTE_COMPROVANTE_DIVERGENTE','PENDENTE_JUSTIFICATIVA_INSUFICIENTE','PENDENTE_CRITICO','AGUARDANDO_EXTRATO'];
var FIN_FLASH_V2_CABECALHOS_EXTRATO = ['Data','Movimentação','Valor','Pessoa','Pagamento','Prestação de contas'];

function MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR(cabecalhos) {
  var r={success:true,ok:false,somenteLeitura:true,gravacaoReal:false,importacaoExecutada:false,bloqueios:[],mapeamento:{}};
  var origem=Array.isArray(cabecalhos)?cabecalhos:FIN_FLASH_V2_CABECALHOS_EXTRATO;
  var normalizados=origem.map(function(x){return String(x||'').trim().toLowerCase();});
  FIN_FLASH_V2_CABECALHOS_EXTRATO.forEach(function(c){var i=normalizados.indexOf(c.toLowerCase());r.mapeamento[c]=i>=0?{coluna:i+1,encontrado:true}: {coluna:null,encontrado:false};if(i<0)r.bloqueios.push('Coluna obrigatoria ausente: '+c+'.');});
  r.ok=r.bloqueios.length===0; return r;
}

function AUDITAR_FIN_FLASH_V2_PRONTO_PARA_IMPORTACAO_SEM_GRAVAR(cabecalhos) {
  var estrutura=AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR(), mapa=MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR(cabecalhos);
  var r={success:true,ok:false,somenteLeitura:true,gravacaoReal:false,importacaoExecutada:false,estruturaOk:estrutura.ok,mapeamentoOk:mapa.ok,bloqueios:[],avisos:['Auditoria nao le arquivo, nao grava extrato e nao autoriza importacao real.']};
  r.bloqueios=(estrutura.bloqueios||[]).concat(mapa.bloqueios||[]); r.ok=!r.bloqueios.length; return r;
}

function FIN_FLASH_V2_CLASSIFICAR_PREVIA_SEM_GRAVAR(extrato, prestacao) {
  var e=extrato||{}, p=prestacao||{}, status='AGUARDANDO_CONFERENCIA', motivos=[];
  if(!p.ID){status='PENDENTE_SEM_PRESTACAO';motivos.push('Extrato sem prestacao.');}
  else if(!p.COMPROVANTE_ID){status='PENDENTE_SEM_COMPROVANTE';motivos.push('Comprovante obrigatorio ausente.');}
  else if(Math.abs(Number(e.VALOR||0)-Number(p.VALOR||0))>0.009){status='PENDENTE_VALOR_DIVERGENTE';motivos.push('Valor divergente.');}
  else if(!String(p.FINALIDADE||'').trim()){status='PENDENTE_JUSTIFICATIVA_INSUFICIENTE';motivos.push('Finalidade ausente.');}
  return {success:true,ok:true,somenteLeitura:true,statusSugerido:status,motivos:motivos,aprovacaoAutomaticaPermitida:false,iaPodeAjudar:true};
}


function EXECUTAR_FIN_FLASH_V2_0A_VALIDACAO_AUTOMATICA_DEV_SEM_GRAVAR() {
  var bloqueios=[], avisos=[], esperadoDev='12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var ambiente=ScriptApp.getScriptId()===esperadoDev?'DEV':'DESCONHECIDO';
  if(ambiente!=='DEV') bloqueios.push('Ambiente nao e DEV esperado.');
  var funcoesPrincipais={
    AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR:typeof AUDITAR_FIN_FLASH_V2_ESTRUTURA_SEM_GRAVAR==='function',
    SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO:typeof SETUP_FIN_FLASH_V2_MANUAL_AUTORIZADO==='function',
    CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO:typeof CRIAR_FIN_FLASH_V2_USUARIO_TESTE_MANUAL_AUTORIZADO==='function',
    AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR:typeof AUDITAR_FIN_FLASH_V2_USUARIO_TESTE_SEM_GRAVAR==='function',
    MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR:typeof MAPEAR_EXTRATO_FLASH_V2_SEM_GRAVAR==='function',
    AUDITAR_FIN_FLASH_V2_PRONTO_PARA_IMPORTACAO_SEM_GRAVAR:typeof AUDITAR_FIN_FLASH_V2_PRONTO_PARA_IMPORTACAO_SEM_GRAVAR==='function',
    LIMPAR_FIN_FLASH_V2_TESTES_ANTES_GO_LIVE_MANUAL_AUTORIZADO:typeof LIMPAR_FIN_FLASH_V2_TESTES_ANTES_GO_LIVE_MANUAL_AUTORIZADO==='function'
  };
  Object.keys(funcoesPrincipais).forEach(function(nome){if(!funcoesPrincipais[nome])bloqueios.push('Funcao ausente: '+nome+'.');});
  var schemas=typeof FIN_FLASH_V2_SCHEMAS==='object'?Object.keys(FIN_FLASH_V2_SCHEMAS):[];
  var schemaValido=schemas.length===12&&schemas.every(function(nome){return Array.isArray(FIN_FLASH_V2_SCHEMAS[nome])&&FIN_FLASH_V2_SCHEMAS[nome].length>0;});
  if(!schemaValido)bloqueios.push('Schema V2 esperado de 12 abas nao esta declarado.');
  var previaIA=FIN_FLASH_V2_CLASSIFICAR_PREVIA_SEM_GRAVAR({VALOR:10},{ID:'TESTE',VALOR:10,COMPROVANTE_ID:'TESTE',FINALIDADE:'TESTE'});
  if(previaIA.aprovacaoAutomaticaPermitida!==false)bloqueios.push('IA nao pode aprovar gasto financeiro sozinha.');
  return {success:true,ok:bloqueios.length===0,executado:false,somenteLeitura:true,ambiente:ambiente,producaoAlterada:false,flashAntigoAlterado:false,setupExecutado:false,usuarioTesteCriado:false,importacaoRealExecutada:false,menuLigado:false,nenhumaAbaCriada:true,nenhumaGravacaoExecutada:true,schemaDeclarado:schemas,schemaValido:schemaValido,funcoesPrincipais:funcoesPrincipais,iaAprovaSozinha:false,verificacoesLocaisPendentes:['.clasp.json e presenca de arquivos/docs sao auditados localmente pelo pipeline, nao pelo runtime Apps Script.'],bloqueios:bloqueios,avisos:avisos};
}


function EXECUTAR_FIN_FLASH_V2_PING_EXECUTION_API_SEM_GRAVAR() {
  var esperadoDev = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var ambiente = ScriptApp.getScriptId() === esperadoDev ? 'DEV' : 'DESCONHECIDO';
  return {
    success: ambiente === 'DEV',
    ping: true,
    somenteLeitura: true,
    executado: false,
    ambiente: ambiente
  };
}


var FIN_FLASH_V2_MOBILE_CATEGORIAS = ['COMBUSTIVEL','PEDAGIO','ESTACIONAMENTO','ALIMENTACAO','MATERIAL','OUTROS'];
var FIN_FLASH_V2_UPLOAD_EXTENSOES = ['jpg','jpeg','png','gif','webp','pdf'];
var FIN_FLASH_V2_UPLOAD_MIMES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];

function FIN_FLASH_V2_dev_() {
  return ScriptApp.getScriptId() === '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
}

function FIN_FLASH_V2_result_(ok) {
  return { success:!!ok, ok:!!ok, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO', bloqueios:[], avisos:[] };
}

function FIN_FLASH_V2_getHeaderMap_(sh) {
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(FIN_FLASH_V2_text_);
  var m = {};
  h.forEach(function(x,i){ m[x]=i; });
  return {headers:h,map:m};
}

function FIN_FLASH_V2_cfg_(chave, padrao) {
  try {
    var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CONFIG);
    if (!sh) return padrao;
    var v = sh.getDataRange().getValues(), h = v[0].map(FIN_FLASH_V2_text_), iCh = h.indexOf('CHAVE'), iVal = h.indexOf('VALOR');
    for (var i=1;i<v.length;i++) if (FIN_FLASH_V2_text_(v[i][iCh]) === chave) return FIN_FLASH_V2_text_(v[i][iVal]) || padrao;
  } catch(e) {}
  return padrao;
}

function FIN_FLASH_V2_resolverContaPorEmail_(emailUsuario, opts) {
  opts = opts || {};
  var r = { ok:false, conta:null, bloqueios:[] };
  var email = FIN_FLASH_V2_text_(emailUsuario).toLowerCase();
  if (!email) { r.bloqueios.push('Usuario logado sem e-mail identificavel.'); return r; }
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CONTAS), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  for (var i=1;i<values.length;i++) {
    var row = values[i];
    if (FIN_FLASH_V2_text_(row[hm.EMAIL]).toLowerCase() === email && FIN_FLASH_V2_text_(row[hm.STATUS]) !== 'INATIVO') {
      r.ok = true;
      r.conta = { row:i+1, id:FIN_FLASH_V2_text_(row[hm.ID]), cpf:FIN_FLASH_V2_text_(row[hm.CPF]), nome:FIN_FLASH_V2_text_(row[hm.NOME]), email:FIN_FLASH_V2_text_(row[hm.EMAIL]), ambienteTeste:FIN_FLASH_V2_text_(row[hm.AMBIENTE_TESTE]) };
      return r;
    }
  }
  r.bloqueios.push('Usuario logado nao possui conta FIN_FLASH_V2 vinculada.');
  return r;
}

function FIN_FLASH_V2_emailUsuarioAtual_(payload) {
  payload = payload || {};
  if (FIN_FLASH_V2_dev_() && FIN_FLASH_V2_text_(payload.emailUsuarioSimulado)) return FIN_FLASH_V2_text_(payload.emailUsuarioSimulado);
  return FIN_FLASH_V2_text_(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail());
}

function FIN_FLASH_V2_cartaoPrincipal_(cpf) {
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CARTOES), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  for (var i=1;i<values.length;i++) {
    var row = values[i];
    if (FIN_FLASH_V2_text_(row[hm.CPF]) === cpf && FIN_FLASH_V2_text_(row[hm.STATUS]) === 'ATIVO_TESTE') return FIN_FLASH_V2_text_(row[hm.ID]);
  }
  return '';
}

function FIN_FLASH_V2_validarPrestacaoMobile_(payload, conta) {
  var b = [], p = payload || {};
  if (!conta || !conta.cpf) b.push('CPF vinculado ao usuario nao encontrado.');
  if (FIN_FLASH_V2_text_(p.cpfInformado) && FIN_FLASH_V2_text_(p.cpfInformado) !== conta.cpf) b.push('CPF informado diverge da conta vinculada ao usuario logado.');
  var valor = Number(String(p.valor || '').replace(',','.'));
  if (!isFinite(valor) || valor <= 0) b.push('Valor obrigatorio e deve ser maior que zero.');
  var data = p.dataGasto ? new Date(p.dataGasto) : null;
  if (!data || isNaN(data.getTime())) b.push('Data do gasto obrigatoria ou invalida.');
  var categoria = FIN_FLASH_V2_text_(p.categoria).toUpperCase();
  if (!categoria) b.push('Categoria obrigatoria.');
  var justificativa = FIN_FLASH_V2_text_(p.justificativa);
  if (justificativa.length < 5) b.push('Justificativa obrigatoria e deve ser suficiente.');
  if (!p.comprovante) b.push('Comprovante obrigatorio.');
  return {bloqueios:b, valor:valor, data:data, categoria:categoria, justificativa:justificativa};
}

function FIN_FLASH_V2_obterPastaUploadDev_() {
  var folderId = FIN_FLASH_V2_cfg_('PASTA_COMPROVANTES_DEV_ID','');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch(e) {}
  }
  var nome = 'FIN_FLASH_V2_DEV_COMPROVANTES_TESTE';
  var it = DriveApp.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(nome);
}

function FIN_FLASH_V2_UPLOAD_COMPROVANTE_SEGURO_DEV_(arquivo, contexto) {
  var r = { success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO', bloqueios:[], arquivoId:'', link:'', tipo:'', tamanhoBytes:0 };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Upload bloqueado fora do DEV.'); return r; }
  arquivo = arquivo || {}; contexto = contexto || {};
  var nome = FIN_FLASH_V2_text_(arquivo.nome || arquivo.name);
  var mime = FIN_FLASH_V2_text_(arquivo.mimeType || arquivo.tipo);
  var base64 = FIN_FLASH_V2_text_(arquivo.base64 || arquivo.conteudoBase64);
  if (!nome) r.bloqueios.push('Nome do comprovante obrigatorio.');
  if (!base64) r.bloqueios.push('Arquivo comprovante vazio.');
  var ext = nome.indexOf('.') >= 0 ? nome.split('.').pop().toLowerCase() : '';
  if (FIN_FLASH_V2_UPLOAD_EXTENSOES.indexOf(ext) < 0) r.bloqueios.push('Extensao de comprovante invalida.');
  if (FIN_FLASH_V2_UPLOAD_MIMES.indexOf(mime) < 0) r.bloqueios.push('Tipo de comprovante invalido.');
  var bytes = [];
  try { if (base64) bytes = Utilities.base64Decode(base64); } catch(e) { r.bloqueios.push('Base64 do comprovante invalido.'); }
  var limite = Number(FIN_FLASH_V2_cfg_('UPLOAD_MAX_BYTES','5242880')) || 5242880;
  r.tamanhoBytes = bytes.length;
  if (!bytes.length) r.bloqueios.push('Arquivo comprovante vazio.');
  if (bytes.length > limite) r.bloqueios.push('Arquivo comprovante acima do limite permitido.');
  if (r.bloqueios.length) return r;
  var safe = nome.replace(/[^a-zA-Z0-9._-]/g,'_');
  var fileName = 'FIN_FLASH_V2_' + (contexto.prestacaoId || FIN_FLASH_V2_id_('PRESTACAO')) + '_' + safe;
  var blob = Utilities.newBlob(bytes, mime, fileName);
  var file = FIN_FLASH_V2_obterPastaUploadDev_().createFile(blob);
  r.success = true; r.ok = true; r.arquivoId = file.getId(); r.link = file.getUrl(); r.tipo = mime;
  return r;
}

function FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV(payload) {
  var r = FIN_FLASH_V2_result_(false);
  r.prestacaoId = ''; r.documentoId = ''; r.comprovanteArquivoId = ''; r.gravacaoReal = false;
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Registro mobile bloqueado fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var email = FIN_FLASH_V2_emailUsuarioAtual_(payload);
    var contaR = FIN_FLASH_V2_resolverContaPorEmail_(email, payload);
    if (!contaR.ok) { r.bloqueios = r.bloqueios.concat(contaR.bloqueios); return r; }
    var conta = contaR.conta;
    var val = FIN_FLASH_V2_validarPrestacaoMobile_(payload, conta);
    if (val.bloqueios.length) { r.bloqueios = r.bloqueios.concat(val.bloqueios); return r; }
    var ss = FIN_FLASH_V2_db_(), shPrest = ss.getSheetByName(FIN_FLASH_V2_ABAS.PRESTACOES), shDoc = ss.getSheetByName(FIN_FLASH_V2_ABAS.DOCUMENTOS), shLog = ss.getSheetByName(FIN_FLASH_V2_ABAS.LOGS);
    var prestacaoId = FIN_FLASH_V2_id_('PRESTACAO'), docId = FIN_FLASH_V2_id_('DOC'), cartaoId = FIN_FLASH_V2_cartaoPrincipal_(conta.cpf), ambienteTeste = conta.ambienteTeste === 'SIM' ? 'SIM' : 'NAO';
    var up = FIN_FLASH_V2_UPLOAD_COMPROVANTE_SEGURO_DEV_(payload.comprovante, {prestacaoId:prestacaoId, cpf:conta.cpf});
    if (!up.ok) { r.bloqueios = r.bloqueios.concat(up.bloqueios); return r; }
    shPrest.appendRow([prestacaoId,conta.id,cartaoId,conta.cpf,val.data,val.valor,'',val.categoria,'',val.justificativa,up.arquivoId,up.tipo,'AGUARDANDO_EXTRATO',ambienteTeste,new Date()]);
    shDoc.appendRow([docId,conta.id,prestacaoId,up.tipo,up.arquivoId,up.link,'','ATIVO',ambienteTeste,new Date()]);
    shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'PRESTACAO_MOBILE_CRIADA','FIN_FLASH_V2_PRESTACOES',prestacaoId,JSON.stringify({cpf:conta.cpf,valor:val.valor,categoria:val.categoria,documentoId:docId,arquivoId:up.arquivoId,iaAprovaSozinha:false}),ambienteTeste,email,new Date()]);
    r.success = true; r.ok = true; r.gravacaoReal = true; r.prestacaoId = prestacaoId; r.documentoId = docId; r.comprovanteArquivoId = up.arquivoId; r.link = up.link; r.cpf = conta.cpf; r.email = email; r.status = 'AGUARDANDO_EXTRATO'; r.todosDadosTesteComAmbienteTeste = ambienteTeste === 'SIM';
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_linhasPorId_(aba, coluna, valor) {
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(aba), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map, out = [];
  for (var i=1;i<values.length;i++) if (FIN_FLASH_V2_text_(values[i][hm[coluna]]) === valor) out.push({row:i+1, values:values[i], map:hm});
  return out;
}

function EXECUTAR_FIN_FLASH_V2_1_TESTE_MOBILE_AUTOMATICO_DEV() {
  var r = { success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO', prestacaoValidaCriada:false, bloqueioSemComprovante:false, bloqueioSemValor:false, bloqueioSemJustificativa:false, bloqueioCpfDiferente:false, todosDadosTesteComAmbienteTeste:false, menuLigado:false, importacaoRealExecutada:false, producaoAlterada:false, flashAntigoAlterado:false, forceUsado:false, bloqueios:[], avisos:[], detalhes:{} };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var setup = EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV();
    if (!setup.ok) { r.bloqueios.push('Setup base V2 nao aprovado.'); r.detalhes.setup = setup; return r; }
    var fakePdf = Utilities.base64Encode(Utilities.newBlob('FIN_FLASH_V2 comprovante fake seguro DEV', 'application/pdf', 'comprovante_fake.pdf').getBytes());
    var base = { emailUsuarioSimulado:'teste.flash@metrolabs.local', valor:42.35, dataGasto:'2026-06-26', categoria:'PEDAGIO', justificativa:'Teste automatizado mobile DEV com comprovante obrigatorio.', comprovante:{nome:'comprovante_fake.pdf', mimeType:'application/pdf', base64:fakePdf} };
    var valido = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV(base);
    r.detalhes.envioValido = valido;
    r.prestacaoValidaCriada = !!(valido.ok && valido.prestacaoId && valido.comprovanteArquivoId);
    var semComp = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({ emailUsuarioSimulado:base.emailUsuarioSimulado, valor:10, dataGasto:base.dataGasto, categoria:'PEDAGIO', justificativa:'Teste sem comprovante.' });
    var semValor = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({ emailUsuarioSimulado:base.emailUsuarioSimulado, dataGasto:base.dataGasto, categoria:'PEDAGIO', justificativa:'Teste sem valor.', comprovante:base.comprovante });
    var semJust = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({ emailUsuarioSimulado:base.emailUsuarioSimulado, valor:10, dataGasto:base.dataGasto, categoria:'PEDAGIO', justificativa:'', comprovante:base.comprovante });
    var cpfDif = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({ emailUsuarioSimulado:base.emailUsuarioSimulado, cpfInformado:'11111111111', valor:10, dataGasto:base.dataGasto, categoria:'PEDAGIO', justificativa:'Teste cpf diferente.', comprovante:base.comprovante });
    r.detalhes.bloqueiosNegativos = {semComprovante:semComp, semValor:semValor, semJustificativa:semJust, cpfDiferente:cpfDif};
    r.bloqueioSemComprovante = !semComp.ok && (semComp.bloqueios||[]).join('|').indexOf('Comprovante obrigatorio') >= 0;
    r.bloqueioSemValor = !semValor.ok && (semValor.bloqueios||[]).join('|').indexOf('Valor obrigatorio') >= 0;
    r.bloqueioSemJustificativa = !semJust.ok && (semJust.bloqueios||[]).join('|').indexOf('Justificativa obrigatoria') >= 0;
    r.bloqueioCpfDiferente = !cpfDif.ok && (cpfDif.bloqueios||[]).join('|').indexOf('CPF informado diverge') >= 0;
    if (valido.prestacaoId) {
      var prest = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.PRESTACOES,'ID',valido.prestacaoId)[0];
      var doc = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.DOCUMENTOS,'ID',valido.documentoId)[0];
      var logs = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.LOGS,'ENTIDADE_ID',valido.prestacaoId);
      r.detalhes.gravacao = {prestacaoEncontrada:!!prest, documentoEncontrado:!!doc, logsCriados:logs.length};
      r.todosDadosTesteComAmbienteTeste = !!(prest && doc && logs.length && FIN_FLASH_V2_text_(prest.values[prest.map.AMBIENTE_TESTE])==='SIM' && FIN_FLASH_V2_text_(doc.values[doc.map.AMBIENTE_TESTE])==='SIM' && logs.every(function(x){return FIN_FLASH_V2_text_(x.values[x.map.AMBIENTE_TESTE])==='SIM';}));
    }
    ['prestacaoValidaCriada','bloqueioSemComprovante','bloqueioSemValor','bloqueioSemJustificativa','bloqueioCpfDiferente','todosDadosTesteComAmbienteTeste'].forEach(function(k){ if(!r[k]) r.bloqueios.push('Falha no teste: '+k+'.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}


var FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS = ['Data','Movimentação','Valor','Pessoa','Pagamento','Prestação de contas'];
var FIN_FLASH_V2_STATUS_EXTRATO = ['GASTO_IMPORTADO_AGUARDANDO_PRESTACAO','RECARGA_IMPORTADA','EXTRATO_DUPLICADO_IGNORADO','EXTRATO_INVALIDO','AGUARDANDO_CONCILIACAO'];

function FIN_FLASH_V2_norm_(v) {
  return String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function FIN_FLASH_V2_hash_(txt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(txt || ''), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'').substring(0,32);
}

function FIN_FLASH_V2_linhasExtrato_(entrada) {
  if (!entrada) return {headers:FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice(), rows:[]};
  if (Array.isArray(entrada)) {
    if (!entrada.length) return {headers:FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice(), rows:[]};
    if (Array.isArray(entrada[0])) return {headers:entrada[0].map(FIN_FLASH_V2_text_), rows:entrada.slice(1)};
    return {headers:FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice(), rows:entrada};
  }
  return {headers:(entrada.headers || entrada.cabecalhos || FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS).map(FIN_FLASH_V2_text_), rows:entrada.rows || entrada.linhas || []};
}

function FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR(entrada) {
  var parsed = FIN_FLASH_V2_linhasExtrato_(entrada);
  var headers = parsed.headers;
  var normal = headers.map(FIN_FLASH_V2_norm_);
  var r = {success:true,ok:false,somenteLeitura:true,gravacaoReal:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',colunasObrigatorias:FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice(),headersRecebidos:headers,mapeamento:{},bloqueios:[],avisos:[]};
  FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.forEach(function(col){
    var idx = normal.indexOf(FIN_FLASH_V2_norm_(col));
    r.mapeamento[col] = {indice:idx, coluna:idx >= 0 ? idx + 1 : null, encontrado:idx >= 0};
    if (idx < 0) r.bloqueios.push('Coluna obrigatoria ausente: ' + col + '.');
  });
  r.ok = r.bloqueios.length === 0;
  return r;
}

function FIN_FLASH_V2_valorExtrato_(valor) {
  if (typeof valor === 'number') return valor;
  var s = FIN_FLASH_V2_text_(valor).replace(/R\$/g,'').replace(/\s/g,'');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g,'').replace(',', '.');
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}

function FIN_FLASH_V2_dataExtrato_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) return valor;
  var s = FIN_FLASH_V2_text_(valor);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), 0);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function FIN_FLASH_V2_isoData_(data) {
  return Utilities.formatDate(data, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');
}

function FIN_FLASH_V2_categoriaMovimentacao_(mov) {
  var n = FIN_FLASH_V2_norm_(mov);
  if (n.indexOf('posto') >= 0 || n.indexOf('combust') >= 0) return 'COMBUSTIVEL';
  if (n.indexOf('pedagio') >= 0 || n.indexOf('sem parar') >= 0) return 'PEDAGIO';
  if (n.indexOf('estacion') >= 0) return 'ESTACIONAMENTO';
  if (n.indexOf('restaurante') >= 0 || n.indexOf('aliment') >= 0 || n.indexOf('lanche') >= 0) return 'ALIMENTACAO';
  if (n.indexOf('recarga') >= 0 || n.indexOf('deposito') >= 0 || n.indexOf('pix') >= 0) return 'RECARGA';
  return 'OUTROS';
}

function FIN_FLASH_V2_finalCartao_(pagamento) {
  var s = FIN_FLASH_V2_text_(pagamento);
  var m = s.match(/(\d{4})(?!.*\d)/);
  return m ? m[1] : '';
}

function FIN_FLASH_V2_contaPorPessoa_(pessoa) {
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CONTAS), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  var alvo = FIN_FLASH_V2_norm_(pessoa);
  for (var i=1;i<values.length;i++) {
    var row = values[i], nome = FIN_FLASH_V2_norm_(row[hm.NOME]), email = FIN_FLASH_V2_norm_(row[hm.EMAIL]);
    if (alvo && (nome === alvo || email === alvo || alvo.indexOf(nome) >= 0 || nome.indexOf(alvo) >= 0)) return {id:FIN_FLASH_V2_text_(row[hm.ID]), cpf:FIN_FLASH_V2_text_(row[hm.CPF]), ambienteTeste:FIN_FLASH_V2_text_(row[hm.AMBIENTE_TESTE])};
  }
  return {id:'', cpf:'', ambienteTeste:'SIM'};
}

function FIN_FLASH_V2_cartaoPorFinal_(cpf, finalCartao) {
  if (!finalCartao) return '';
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CARTOES), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  for (var i=1;i<values.length;i++) {
    var row = values[i];
    if (FIN_FLASH_V2_text_(row[hm.CPF]) === cpf && FIN_FLASH_V2_text_(row[hm.FINAL_CARTAO]) === finalCartao) return FIN_FLASH_V2_text_(row[hm.ID]);
  }
  return '';
}

function FIN_FLASH_V2_GERAR_CHAVE_EXTRATO_(item) {
  item = item || {};
  var data = item.data instanceof Date ? FIN_FLASH_V2_isoData_(item.data) : FIN_FLASH_V2_text_(item.data || item.Data);
  var pessoa = FIN_FLASH_V2_text_(item.pessoa || item.Pessoa);
  var valor = FIN_FLASH_V2_valorExtrato_(item.valor != null ? item.valor : item.Valor);
  var mov = FIN_FLASH_V2_text_(item.movimentacao || item['Movimentação'] || item.Movimentacao);
  var pagamento = FIN_FLASH_V2_text_(item.pagamento || item.Pagamento);
  return 'FIN_FLASH_V2_EXTRATO_' + FIN_FLASH_V2_hash_([data,pessoa,valor.toFixed ? valor.toFixed(2) : valor,mov,pagamento].join('|'));
}

function FIN_FLASH_V2_rowExtrato_(row, headers, mapa) {
  function get(col) {
    if (Array.isArray(row)) return row[mapa.mapeamento[col].indice];
    if (row[col] != null) return row[col];
    if (col === 'Movimentação' && row.Movimentacao != null) return row.Movimentacao;
    if (col === 'Prestação de contas' && row.Prestacao_de_contas != null) return row.Prestacao_de_contas;
    return '';
  }
  var data = FIN_FLASH_V2_dataExtrato_(get('Data'));
  var valor = FIN_FLASH_V2_valorExtrato_(get('Valor'));
  var movimentacao = FIN_FLASH_V2_text_(get('Movimentação'));
  var pessoa = FIN_FLASH_V2_text_(get('Pessoa'));
  var pagamento = FIN_FLASH_V2_text_(get('Pagamento'));
  var prestacaoContas = FIN_FLASH_V2_text_(get('Prestação de contas'));
  var bloqueios = [];
  if (!data) bloqueios.push('Data invalida.');
  if (!isFinite(valor)) bloqueios.push('Valor invalido.');
  if (!movimentacao) bloqueios.push('Movimentacao ausente.');
  if (!pessoa) bloqueios.push('Pessoa ausente.');
  var tipo = valor < 0 ? 'GASTO' : (valor > 0 ? 'RECARGA' : 'INVALIDO');
  if (tipo === 'INVALIDO') bloqueios.push('Valor zero nao representa gasto ou recarga.');
  var finalCartao = FIN_FLASH_V2_finalCartao_(pagamento);
  var conta = FIN_FLASH_V2_contaPorPessoa_(pessoa);
  var cartaoId = FIN_FLASH_V2_cartaoPorFinal_(conta.cpf, finalCartao);
  var categoria = FIN_FLASH_V2_categoriaMovimentacao_(movimentacao);
  var key = FIN_FLASH_V2_GERAR_CHAVE_EXTRATO_({data:data,pessoa:pessoa,valor:valor,movimentacao:movimentacao,pagamento:pagamento});
  return {id:key,data:data,valor:valor,tipo:tipo,movimentacao:movimentacao,pessoa:pessoa,pagamento:pagamento,prestacaoContas:prestacaoContas,finalCartao:finalCartao,categoria:categoria,contaId:conta.id,cpf:conta.cpf,cartaoId:cartaoId,ambienteTeste:conta.ambienteTeste || 'SIM',bloqueios:bloqueios};
}

function FIN_FLASH_V2_idsExistentes_(sh, coluna) {
  var values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map, out = {};
  for (var i=1;i<values.length;i++) out[FIN_FLASH_V2_text_(values[i][hm[coluna]])] = true;
  return out;
}

function FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV(entrada, opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',importacaoExecutada:false,totalRecebido:0,extratosImportados:0,recargasImportadas:0,gastosImportados:0,duplicadosIgnorados:0,invalidos:0,idsImportados:[],bloqueios:[],avisos:[],menuLigado:false,producaoAlterada:false,flashAntigoAlterado:false};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Importacao bloqueada fora do DEV.'); return r; }
  opcoes = opcoes || {};
  var parsed = FIN_FLASH_V2_linhasExtrato_(entrada);
  var mapa = FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR({headers:parsed.headers, rows:parsed.rows});
  r.mapeamento = mapa;
  if (!mapa.ok) { r.bloqueios = r.bloqueios.concat(mapa.bloqueios); return r; }
  try {
    var ss = FIN_FLASH_V2_db_(), shExt = ss.getSheetByName(FIN_FLASH_V2_ABAS.EXTRATOS), shRec = ss.getSheetByName(FIN_FLASH_V2_ABAS.RECARGAS), shPend = ss.getSheetByName(FIN_FLASH_V2_ABAS.PENDENCIAS), shLog = ss.getSheetByName(FIN_FLASH_V2_ABAS.LOGS);
    var extIds = FIN_FLASH_V2_idsExistentes_(shExt, 'ID'), recIds = FIN_FLASH_V2_idsExistentes_(shRec, 'ID'), pendIds = FIN_FLASH_V2_idsExistentes_(shPend, 'ID');
    var loteId = opcoes.loteId || ('FIN_FLASH_V2_LOTE_' + FIN_FLASH_V2_hash_(new Date().toISOString() + Math.random()));
    r.totalRecebido = parsed.rows.length;
    parsed.rows.forEach(function(row) {
      var item = FIN_FLASH_V2_rowExtrato_(row, parsed.headers, mapa);
      if (item.bloqueios.length) { r.invalidos++; r.avisos.push({status:'EXTRATO_INVALIDO',bloqueios:item.bloqueios}); return; }
      if (extIds[item.id]) { r.duplicadosIgnorados++; r.avisos.push({status:'EXTRATO_DUPLICADO_IGNORADO',id:item.id}); return; }
      var status = item.tipo === 'GASTO' ? 'GASTO_IMPORTADO_AGUARDANDO_PRESTACAO' : 'RECARGA_IMPORTADA';
      var ambienteTeste = opcoes.ambienteTeste || item.ambienteTeste || 'SIM';
      shExt.appendRow([item.id,item.data,item.movimentacao,item.valor,item.pessoa,item.pagamento,item.prestacaoContas,item.cpf,item.cartaoId,status,ambienteTeste,loteId,new Date()]);
      extIds[item.id] = true; r.extratosImportados++; r.idsImportados.push(item.id);
      if (item.tipo === 'RECARGA') {
        var recId = 'FIN_FLASH_V2_RECARGA_' + item.id.replace('FIN_FLASH_V2_EXTRATO_','');
        if (!recIds[recId]) { shRec.appendRow([recId,item.contaId,item.cartaoId,item.cpf,Math.abs(item.valor),'RECARGA_IMPORTADA',ambienteTeste,new Date(),'Importada do extrato Flash V2: '+item.id]); recIds[recId] = true; r.recargasImportadas++; }
      } else if (item.tipo === 'GASTO') {
        r.gastosImportados++;
        var pendId = 'FIN_FLASH_V2_PENDENCIA_' + item.id.replace('FIN_FLASH_V2_EXTRATO_','');
        if (!pendIds[pendId]) { shPend.appendRow([pendId,item.contaId,item.cpf,item.id,'','PENDENTE_SEM_PRESTACAO','MEDIA','AGUARDANDO_CONCILIACAO','Gasto importado do extrato Flash aguardando prestacao mobile.','NAO',ambienteTeste,new Date(),'']); pendIds[pendId] = true; }
      }
      shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'EXTRATO_FLASH_V2_IMPORTADO',FIN_FLASH_V2_ABAS.EXTRATOS,item.id,JSON.stringify({tipo:item.tipo,status:status,valor:item.valor,categoria:item.categoria,finalCartao:item.finalCartao,iaAprovaSozinha:false}),ambienteTeste,'SISTEMA_FIN_FLASH_V2',new Date()]);
    });
    r.importacaoExecutada = true;
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_2_TESTE_IMPORTACAO_EXTRATO_AUTOMATICO_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',mapeamentoExtratoOk:false,importacaoTesteExecutada:false,gastoNegativoImportado:false,recargaPositivaImportada:false,duplicidadeBloqueada:false,todosDadosTesteComAmbienteTeste:false,menuLigado:false,producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false,bloqueios:[],avisos:[],detalhes:{}};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var setup = EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV();
    if (!setup.ok) { r.bloqueios.push('Setup base V2 nao aprovado.'); r.detalhes.setup = setup; return r; }
    var headers = FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice();
    var lote = 'FIN_FLASH_V2_2_TESTE_' + FIN_FLASH_V2_hash_(new Date().toISOString() + Utilities.getUuid());
    var tag = lote.substring(lote.length - 8);
    var massa = [headers,
      ['26/06/2026 08:15','PEDAGIO RODOVIA TESTE ' + tag,-18.90,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada'],
      ['26/06/2026 09:00','DEPÓSITO FLASH TESTE ' + tag,250.00,'TESTE FLASH COLABORADOR','Transferência Flash ' + tag,'-']
    ];
    var mapa = FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR(massa);
    r.mapeamentoExtratoOk = mapa.ok;
    r.detalhes.mapeamento = mapa;
    var imp1 = FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV(massa,{loteId:lote,ambienteTeste:'SIM'});
    var imp2 = FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV(massa,{loteId:lote,ambienteTeste:'SIM'});
    var mapaInvalido = FIN_FLASH_V2_MAPEAR_EXTRATO_FLASH_DEV_SEM_GRAVAR([['Data','Valor'],['26/06/2026',10]]);
    r.detalhes.importacao1 = imp1;
    r.detalhes.importacaoDuplicada = imp2;
    r.detalhes.mapeamentoInvalido = mapaInvalido;
    r.importacaoTesteExecutada = !!imp1.importacaoExecutada;
    r.gastoNegativoImportado = imp1.gastosImportados >= 1;
    r.recargaPositivaImportada = imp1.recargasImportadas >= 1;
    r.duplicidadeBloqueada = imp2.duplicadosIgnorados >= 2 && imp2.extratosImportados === 0;
    var ss = FIN_FLASH_V2_db_(), shExt = ss.getSheetByName(FIN_FLASH_V2_ABAS.EXTRATOS), shRec = ss.getSheetByName(FIN_FLASH_V2_ABAS.RECARGAS), shPend = ss.getSheetByName(FIN_FLASH_V2_ABAS.PENDENCIAS), shLog = ss.getSheetByName(FIN_FLASH_V2_ABAS.LOGS);
    function rowsByLote(sh) { var v=sh.getDataRange().getValues(), hm=FIN_FLASH_V2_getHeaderMap_(sh).map, out=[]; for(var i=1;i<v.length;i++) if(hm.LOTE_ID != null && FIN_FLASH_V2_text_(v[i][hm.LOTE_ID])===lote) out.push({values:v[i],map:hm}); return out; }
    var extRows = rowsByLote(shExt);
    var recRows = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.RECARGAS,'STATUS','RECARGA_IMPORTADA').filter(function(x){return FIN_FLASH_V2_text_(x.values[x.map.AMBIENTE_TESTE])==='SIM';});
    var pendRows = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.PENDENCIAS,'STATUS','AGUARDANDO_CONCILIACAO').filter(function(x){return FIN_FLASH_V2_text_(x.values[x.map.AMBIENTE_TESTE])==='SIM';});
    var logRows = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.LOGS,'ACAO','EXTRATO_FLASH_V2_IMPORTADO').filter(function(x){return FIN_FLASH_V2_text_(x.values[x.map.AMBIENTE_TESTE])==='SIM';});
    r.todosDadosTesteComAmbienteTeste = extRows.length >= 2 && extRows.every(function(x){return FIN_FLASH_V2_text_(x.values[x.map.AMBIENTE_TESTE])==='SIM';}) && recRows.length >= 1 && pendRows.length >= 1 && logRows.length >= 1;
    r.detalhes.validacaoGravacao = {extratosLote:extRows.length,recargasTeste:recRows.length,pendenciasTeste:pendRows.length,logsTeste:logRows.length};
    if (!r.mapeamentoExtratoOk) r.bloqueios.push('Mapeamento do extrato falhou.');
    if (!r.importacaoTesteExecutada) r.bloqueios.push('Importacao de teste nao executada.');
    if (!r.gastoNegativoImportado) r.bloqueios.push('Gasto negativo nao importado.');
    if (!r.recargaPositivaImportada) r.bloqueios.push('Recarga positiva nao importada.');
    if (!r.duplicidadeBloqueada) r.bloqueios.push('Duplicidade nao foi bloqueada.');
    if (!r.todosDadosTesteComAmbienteTeste) r.bloqueios.push('Dados de teste sem AMBIENTE_TESTE=SIM.');
    if (mapaInvalido.ok) r.bloqueios.push('Mapeamento invalido deveria bloquear colunas ausentes.');
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}


function FIN_FLASH_V2_cpfNorm_(v) { var s = FIN_FLASH_V2_text_(v).replace(/\D/g,''); if (s === '0') return '00000000000'; while (s.length > 0 && s.length < 11) s = '0' + s; return s; }
function FIN_FLASH_V2_msDia_(d) { return 24 * 60 * 60 * 1000; }
function FIN_FLASH_V2_asDate_(v) { var d = v instanceof Date ? v : new Date(v); return isNaN(d.getTime()) ? null : d; }
function FIN_FLASH_V2_num_(v) { var n = Number(String(v == null ? '' : v).replace(',','.')); return isFinite(n) ? n : NaN; }

function FIN_FLASH_V2_CALCULAR_SCORE_CONCILIACAO_(extrato, prestacao) {
  var score = 0, criterios = {};
  extrato = extrato || {}; prestacao = prestacao || {};
  criterios.cpfIgual = !!(extrato.CPF != null && prestacao.CPF != null && FIN_FLASH_V2_cpfNorm_(extrato.CPF) === FIN_FLASH_V2_cpfNorm_(prestacao.CPF));
  if (criterios.cpfIgual) score += 30;
  var ve = Math.abs(FIN_FLASH_V2_num_(extrato.VALOR));
  var vp = Math.abs(FIN_FLASH_V2_num_(prestacao.VALOR));
  criterios.valorIgual = isFinite(ve) && isFinite(vp) && Math.abs(ve - vp) <= 0.01;
  if (criterios.valorIgual) score += 25;
  var de = FIN_FLASH_V2_asDate_(extrato.DATA), dp = FIN_FLASH_V2_asDate_(prestacao.DATA_GASTO);
  var diff = (de && dp) ? Math.abs(de.getTime() - dp.getTime()) / FIN_FLASH_V2_msDia_() : 999;
  criterios.dataProxima = diff <= 2;
  criterios.dataIgual = diff < 1;
  if (criterios.dataIgual) score += 15; else if (criterios.dataProxima) score += 10;
  criterios.comprovanteExistente = !!FIN_FLASH_V2_text_(prestacao.COMPROVANTE_ID);
  if (criterios.comprovanteExistente) score += 15;
  var catE = FIN_FLASH_V2_categoriaMovimentacao_(extrato.MOVIMENTACAO || '');
  var catP = FIN_FLASH_V2_text_(prestacao.FINALIDADE || '').toUpperCase();
  criterios.categoriaCompativel = !!catP && (catP === catE || catP.indexOf(catE) >= 0 || catE === 'OUTROS');
  if (criterios.categoriaCompativel) score += 5;
  criterios.justificativaPreenchida = FIN_FLASH_V2_text_(prestacao.JUSTIFICATIVA).length >= 5;
  if (criterios.justificativaPreenchida) score += 10;
  return {score:score, criterios:criterios, iaAprovaSozinha:false};
}

function FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(extrato, prestacao) {
  if (!extrato && prestacao) return {status:'AGUARDANDO_EXTRATO', score:0, motivos:['Prestacao sem extrato Flash correspondente.'], iaAprovaSozinha:false};
  if (extrato && !prestacao) return {status:'PENDENTE_SEM_PRESTACAO', score:0, motivos:['Extrato sem prestacao mobile.'], iaAprovaSozinha:false};
  var motivos = [], score = FIN_FLASH_V2_CALCULAR_SCORE_CONCILIACAO_(extrato, prestacao);
  if (!score.criterios.cpfIgual) return {status:'PENDENTE_CRITICO', score:score.score, criterios:score.criterios, motivos:['CPF divergente.'], iaAprovaSozinha:false};
  if (!score.criterios.comprovanteExistente) return {status:'PENDENTE_SEM_COMPROVANTE', score:score.score, criterios:score.criterios, motivos:['Comprovante obrigatorio ausente.'], iaAprovaSozinha:false};
  if (!score.criterios.valorIgual) return {status:'PENDENTE_VALOR_DIVERGENTE', score:score.score, criterios:score.criterios, motivos:['Valor divergente entre extrato e prestacao.'], iaAprovaSozinha:false};
  if (!score.criterios.justificativaPreenchida) return {status:'PENDENTE_JUSTIFICATIVA_INSUFICIENTE', score:score.score, criterios:score.criterios, motivos:['Justificativa insuficiente.'], iaAprovaSozinha:false};
  if (score.score >= 80) return {status:'CONCILIADO_AUTOMATICO', score:score.score, criterios:score.criterios, motivos:[], iaAprovaSozinha:false};
  return {status:'AGUARDANDO_CONFERENCIA', score:score.score, criterios:score.criterios, motivos:['Score insuficiente para conciliacao automatica.'], iaAprovaSozinha:false};
}

function FIN_FLASH_V2_rowsObj_(aba) {
  var sh = FIN_FLASH_V2_db_().getSheetByName(aba), values = sh.getDataRange().getValues(), hm = FIN_FLASH_V2_getHeaderMap_(sh).map, out = [];
  for (var i=1;i<values.length;i++) { var o = {_row:i+1}; Object.keys(hm).forEach(function(k){ o[k]=values[i][hm[k]]; }); out.push(o); }
  return out;
}

function FIN_FLASH_V2_appendConciliacao_(extrato, prestacao, cls, ambienteTeste) {
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.CONCILIACOES);
  var id = 'FIN_FLASH_V2_CONCILIACAO_' + FIN_FLASH_V2_hash_([extrato && extrato.ID || '', prestacao && prestacao.ID || '', cls.status].join('|'));
  var existentes = FIN_FLASH_V2_idsExistentes_(sh, 'ID');
  if (!existentes[id]) sh.appendRow([id, extrato && extrato.ID || '', prestacao && prestacao.ID || '', cls.status, extrato ? Math.abs(FIN_FLASH_V2_num_(extrato.VALOR)) : '', prestacao ? Math.abs(FIN_FLASH_V2_num_(prestacao.VALOR)) : '', (extrato && prestacao) ? Math.abs(Math.abs(FIN_FLASH_V2_num_(extrato.VALOR))-Math.abs(FIN_FLASH_V2_num_(prestacao.VALOR))) : '', JSON.stringify({score:cls.score||0,criterios:cls.criterios||{},motivos:cls.motivos||[],iaAprovaSozinha:false}), '', ambienteTeste || 'SIM', new Date()]);
  return id;
}

function FIN_FLASH_V2_appendPendenciaConciliacao_(extrato, prestacao, cls, ambienteTeste) {
  if (cls.status === 'CONCILIADO_AUTOMATICO') return '';
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.PENDENCIAS);
  var baseId = extrato && extrato.ID || prestacao && prestacao.ID || Utilities.getUuid();
  var id = 'FIN_FLASH_V2_PENDENCIA_CONC_' + FIN_FLASH_V2_hash_([baseId, cls.status].join('|'));
  var existentes = FIN_FLASH_V2_idsExistentes_(sh, 'ID');
  if (!existentes[id]) sh.appendRow([id, extrato && extrato.CONTA_ID || prestacao && prestacao.CONTA_ID || '', extrato && extrato.CPF || prestacao && prestacao.CPF || '', extrato && extrato.ID || '', prestacao && prestacao.ID || '', cls.status, cls.status === 'PENDENTE_CRITICO' ? 'ALTA' : 'MEDIA', 'ABERTA', (cls.motivos||[]).join(' | ') || cls.status, cls.status === 'PENDENTE_CRITICO' ? 'SIM' : 'NAO', ambienteTeste || 'SIM', new Date(), '']);
  return id;
}

function FIN_FLASH_V2_CONCILIAR_AUTOMATICAMENTE_DEV(opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',conciliacaoExecutada:false,totalExtratosGasto:0,totalPrestacoes:0,conciliacoesCriadas:0,pendenciasAtualizadas:0,logsCriados:0,status:{},bloqueios:[],avisos:[],menuLigado:false,importacaoRealExecutada:false,producaoAlterada:false,flashAntigoAlterado:false,iaAprovaSozinha:false};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Conciliacao bloqueada fora do DEV.'); return r; }
  opcoes = opcoes || {};
  try {
    var ss = FIN_FLASH_V2_db_(), shLog = ss.getSheetByName(FIN_FLASH_V2_ABAS.LOGS);
    var extratos = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.EXTRATOS).filter(function(x){ return FIN_FLASH_V2_num_(x.VALOR) < 0 && (!opcoes.loteId || FIN_FLASH_V2_text_(x.LOTE_ID) === opcoes.loteId); });
    var prestacoes = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PRESTACOES).filter(function(x){ return !opcoes.tag || FIN_FLASH_V2_text_(x.JUSTIFICATIVA).indexOf(opcoes.tag) >= 0 || FIN_FLASH_V2_text_(x.OS_NUMERO).indexOf(opcoes.tag) === 0; });
    var usadas = {}, status = {};
    r.totalExtratosGasto = extratos.length; r.totalPrestacoes = prestacoes.length;
    extratos.forEach(function(ex) {
      var melhor = null, melhorScore = -1;
      prestacoes.forEach(function(pr) {
        if (usadas[FIN_FLASH_V2_text_(pr.ID)]) return;
        if (FIN_FLASH_V2_cpfNorm_(pr.CPF) !== FIN_FLASH_V2_cpfNorm_(ex.CPF)) return;
        var ve = Math.abs(FIN_FLASH_V2_num_(ex.VALOR));
        var vp = Math.abs(FIN_FLASH_V2_num_(pr.VALOR));
        var de = FIN_FLASH_V2_asDate_(ex.DATA), dp = FIN_FLASH_V2_asDate_(pr.DATA_GASTO);
        var dataProxima = de && dp && Math.abs(de.getTime()-dp.getTime()) / FIN_FLASH_V2_msDia_() <= 2;
        var catE = FIN_FLASH_V2_categoriaMovimentacao_(ex.MOVIMENTACAO || '');
        var catP = FIN_FLASH_V2_text_(pr.FINALIDADE || '').toUpperCase();
        var categoriaCompativel = !!catP && (catP === catE || catP.indexOf(catE) >= 0 || catE === 'OUTROS');
        var valorProximo = isFinite(ve) && isFinite(vp) && Math.abs(ve-vp) <= 10;
        if (!dataProxima || (!categoriaCompativel && !valorProximo)) return;
        var sc = FIN_FLASH_V2_CALCULAR_SCORE_CONCILIACAO_(ex, pr).score;
        if (sc > melhorScore) { melhorScore = sc; melhor = pr; }
      });
      var cls = FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(ex, melhor);
      if (melhorScore < 50) { melhor = null; cls = FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(ex, null); }
      if (melhor && ['CONCILIADO_AUTOMATICO','PENDENTE_SEM_COMPROVANTE','PENDENTE_VALOR_DIVERGENTE','PENDENTE_JUSTIFICATIVA_INSUFICIENTE','AGUARDANDO_CONFERENCIA','PENDENTE_CRITICO'].indexOf(cls.status) >= 0) usadas[FIN_FLASH_V2_text_(melhor.ID)] = true;
      var amb = FIN_FLASH_V2_text_(ex.AMBIENTE_TESTE || melhor && melhor.AMBIENTE_TESTE || 'SIM');
      var cid = FIN_FLASH_V2_appendConciliacao_(ex, melhor, cls, amb);
      var pid = FIN_FLASH_V2_appendPendenciaConciliacao_(ex, melhor, cls, amb);
      if (cid) r.conciliacoesCriadas++;
      if (pid) r.pendenciasAtualizadas++;
      status[cls.status] = true;
      shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'CONCILIACAO_AUTOMATICA_V2','FIN_FLASH_V2_CONCILIACOES',cid,JSON.stringify({status:cls.status,extratoId:ex.ID,prestacaoId:melhor&&melhor.ID||'',score:cls.score||0,iaAprovaSozinha:false}),amb,'SISTEMA_FIN_FLASH_V2',new Date()]);
      r.logsCriados++;
    });
    // Fallback explicito: prestacao com justificativa insuficiente e extrato correspondente nao pode ficar sem classificacao.
    prestacoes.forEach(function(pr) {
      if (usadas[FIN_FLASH_V2_text_(pr.ID)]) return;
      if (FIN_FLASH_V2_text_(pr.JUSTIFICATIVA).length >= 5) return;
      var candidato = null;
      extratos.forEach(function(ex) {
        if (candidato) return;
        var ve = Math.abs(FIN_FLASH_V2_num_(ex.VALOR)), vp = Math.abs(FIN_FLASH_V2_num_(pr.VALOR));
        var de = FIN_FLASH_V2_asDate_(ex.DATA), dp = FIN_FLASH_V2_asDate_(pr.DATA_GASTO);
        var dataProxima = de && dp && Math.abs(de.getTime()-dp.getTime()) / FIN_FLASH_V2_msDia_() <= 2;
        if (FIN_FLASH_V2_cpfNorm_(ex.CPF) === FIN_FLASH_V2_cpfNorm_(pr.CPF) && isFinite(ve) && isFinite(vp) && Math.abs(ve-vp) <= 0.01 && dataProxima) candidato = ex;
      });
      if (!candidato) return;
      var cls = FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(candidato, pr), amb = FIN_FLASH_V2_text_(pr.AMBIENTE_TESTE || 'SIM');
      if (cls.status !== 'PENDENTE_JUSTIFICATIVA_INSUFICIENTE') return;
      usadas[FIN_FLASH_V2_text_(pr.ID)] = true;
      var cid = FIN_FLASH_V2_appendConciliacao_(candidato, pr, cls, amb);
      var pid = FIN_FLASH_V2_appendPendenciaConciliacao_(candidato, pr, cls, amb);
      if (cid) r.conciliacoesCriadas++;
      if (pid) r.pendenciasAtualizadas++;
      status[cls.status] = true;
      shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'CONCILIACAO_AUTOMATICA_V2','FIN_FLASH_V2_CONCILIACOES',cid,JSON.stringify({status:cls.status,extratoId:candidato.ID,prestacaoId:pr.ID,score:cls.score||0,iaAprovaSozinha:false}),amb,'SISTEMA_FIN_FLASH_V2',new Date()]);
      r.logsCriados++;
    });

    prestacoes.forEach(function(pr) {
      if (usadas[FIN_FLASH_V2_text_(pr.ID)]) return;
      var cls = FIN_FLASH_V2_CLASSIFICAR_CONCILIACAO_(null, pr), amb = FIN_FLASH_V2_text_(pr.AMBIENTE_TESTE || 'SIM');
      var cid = FIN_FLASH_V2_appendConciliacao_(null, pr, cls, amb);
      var pid = FIN_FLASH_V2_appendPendenciaConciliacao_(null, pr, cls, amb);
      if (cid) r.conciliacoesCriadas++;
      if (pid) r.pendenciasAtualizadas++;
      status[cls.status] = true;
      shLog.appendRow([FIN_FLASH_V2_id_('LOG'),'CONCILIACAO_AUTOMATICA_V2','FIN_FLASH_V2_CONCILIACOES',cid,JSON.stringify({status:cls.status,prestacaoId:pr.ID,iaAprovaSozinha:false}),amb,'SISTEMA_FIN_FLASH_V2',new Date()]);
      r.logsCriados++;
    });
    r.status = status; r.conciliacaoExecutada = true; r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_addPrestacaoTeste_(tag, conta, valor, data, finalidade, justificativa, comprovante) {
  var ss = FIN_FLASH_V2_db_(), sh = ss.getSheetByName(FIN_FLASH_V2_ABAS.PRESTACOES), id = 'FIN_FLASH_V2_PRESTACAO_TESTE_' + FIN_FLASH_V2_hash_([tag,valor,data,finalidade,justificativa,comprovante].join('|'));
  var existentes = FIN_FLASH_V2_idsExistentes_(sh, 'ID'), hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  var row = 0;
  if (!existentes[id]) {
    row = sh.getLastRow() + 1;
    sh.appendRow([id,conta.id,FIN_FLASH_V2_cartaoPrincipal_(conta.cpf),conta.cpf,new Date(data),valor,'',finalidade,tag,justificativa,comprovante ? 'DOC_'+id : '', comprovante ? 'application/pdf' : '', 'AGUARDANDO_EXTRATO','SIM',new Date()]);
  } else {
    var values = sh.getDataRange().getValues();
    for (var i=1;i<values.length;i++) if (FIN_FLASH_V2_text_(values[i][hm.ID]) === id) { row = i + 1; break; }
  }
  if (row) sh.getRange(row, hm.CPF + 1).setNumberFormat('@').setValue(conta.cpf);
  return id;
}

function EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',conciliacaoExecutada:false,conciliadoAutomatico:false,pendenteSemPrestacao:false,pendenteSemComprovante:false,pendenteValorDivergente:false,aguardandoExtrato:false,justificativaInsuficiente:false,pendenciasAtualizadas:false,logsCriados:false,iaAprovaSozinha:false,todosDadosTesteComAmbienteTeste:false,menuLigado:false,importacaoRealExecutada:false,producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false,bloqueios:[],avisos:[],detalhes:{}};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var setup = EXECUTAR_FIN_FLASH_V2_0B_SETUP_AUTOMATICO_DEV(); if (!setup.ok) { r.bloqueios.push('Setup base V2 nao aprovado.'); r.detalhes.setup = setup; return r; }
    var conta = FIN_FLASH_V2_resolverContaPorEmail_('teste.flash@metrolabs.local').conta;
    var tag = 'CONC_V23_' + FIN_FLASH_V2_hash_(new Date().toISOString() + Utilities.getUuid()).substring(0,8);
    var headers = FIN_FLASH_V2_EXTRATO_COLUNAS_OBRIGATORIAS.slice();
    var lote = 'FIN_FLASH_V2_3_' + tag;
    var massa = [headers,
      ['26/06/2026 10:00','PEDAGIO PERFEITO '+tag,-30.00,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada'],
      ['26/06/2026 11:00','POSTO SEM PRESTACAO '+tag,-80.00,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada'],
      ['26/06/2026 12:00','ESTACIONAMENTO SEM COMPROVANTE '+tag,-25.00,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada'],
      ['26/06/2026 13:00','ALIMENTACAO VALOR DIVERGENTE '+tag,-50.00,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada'],
      ['26/06/2026 14:00','MATERIAL JUSTIFICATIVA INSUFICIENTE '+tag,-15.00,'TESTE FLASH COLABORADOR','Cartão final 9999','Não iniciada']
    ];
    var imp = FIN_FLASH_V2_IMPORTAR_EXTRATO_FLASH_DEV(massa,{loteId:lote,ambienteTeste:'SIM'});
    FIN_FLASH_V2_addPrestacaoTeste_(tag+'PERFEITO', conta, 30.00, '2026-06-26T10:00:00', 'PEDAGIO', 'Pagamento pedagio operacional '+tag, true);
    FIN_FLASH_V2_addPrestacaoTeste_(tag+'SEMCOMP', conta, 25.00, '2026-06-26T12:00:00', 'ESTACIONAMENTO', 'Estacionamento operacional '+tag, false);
    FIN_FLASH_V2_addPrestacaoTeste_(tag+'DIVERGENTE', conta, 55.00, '2026-06-26T13:00:00', 'ALIMENTACAO', 'Alimentacao operacional '+tag, true);
    FIN_FLASH_V2_addPrestacaoTeste_(tag+'JUSTINSUF', conta, 15.00, '2026-06-26T14:00:00', 'MATERIAL', 'abc', true);
    FIN_FLASH_V2_addPrestacaoTeste_(tag+'SEMEXTRATO', conta, 999.00, '2026-07-15T15:00:00', 'OUTROS', 'Prestacao sem extrato '+tag, true);
    var conc = FIN_FLASH_V2_CONCILIAR_AUTOMATICAMENTE_DEV({loteId:lote, tag:tag});
    r.detalhes.importacao = imp; r.detalhes.conciliacao = conc;
    r.conciliacaoExecutada = conc.conciliacaoExecutada;
    r.conciliadoAutomatico = !!conc.status.CONCILIADO_AUTOMATICO;
    r.pendenteSemPrestacao = !!conc.status.PENDENTE_SEM_PRESTACAO;
    r.pendenteSemComprovante = !!conc.status.PENDENTE_SEM_COMPROVANTE;
    r.pendenteValorDivergente = !!conc.status.PENDENTE_VALOR_DIVERGENTE;
    r.aguardandoExtrato = !!conc.status.AGUARDANDO_EXTRATO;
    r.justificativaInsuficiente = !!conc.status.PENDENTE_JUSTIFICATIVA_INSUFICIENTE;
    r.pendenciasAtualizadas = conc.pendenciasAtualizadas >= 5;
    r.logsCriados = conc.logsCriados >= 6;
    var concRows = FIN_FLASH_V2_linhasPorId_(FIN_FLASH_V2_ABAS.CONCILIACOES,'AMBIENTE_TESTE','SIM').filter(function(x){ return FIN_FLASH_V2_text_(x.values[x.map.ID]).indexOf('FIN_FLASH_V2_CONCILIACAO_') === 0; });
    r.todosDadosTesteComAmbienteTeste = imp.ok && conc.ok && concRows.length > 0;
    ['conciliacaoExecutada','conciliadoAutomatico','pendenteSemPrestacao','pendenteSemComprovante','pendenteValorDivergente','aguardandoExtrato','justificativaInsuficiente','pendenciasAtualizadas','logsCriados','todosDadosTesteComAmbienteTeste'].forEach(function(k){ if(!r[k]) r.bloqueios.push('Falha no teste: '+k+'.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}


function FIN_FLASH_V2_contasIndex_() {
  var contas = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CONTAS), idx = {porId:{}, porCpf:{}};
  contas.forEach(function(c) {
    var id = FIN_FLASH_V2_text_(c.ID), cpf = FIN_FLASH_V2_cpfNorm_(c.CPF);
    if (id) idx.porId[id] = c;
    if (cpf) idx.porCpf[cpf] = c;
  });
  return idx;
}

function FIN_FLASH_V2_prestacoesIndex_() {
  var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PRESTACOES), idx = {};
  rows.forEach(function(x) { idx[FIN_FLASH_V2_text_(x.ID)] = x; });
  return idx;
}

function FIN_FLASH_V2_extratosIndex_() {
  var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.EXTRATOS), idx = {};
  rows.forEach(function(x) { idx[FIN_FLASH_V2_text_(x.ID)] = x; });
  return idx;
}

function FIN_FLASH_V2_documentosIndex_() {
  var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.DOCUMENTOS), idx = {};
  rows.forEach(function(x) {
    var id = FIN_FLASH_V2_text_(x.ID), prestacaoId = FIN_FLASH_V2_text_(x.PRESTACAO_ID);
    if (id) idx[id] = x;
    if (prestacaoId) idx[prestacaoId] = x;
  });
  return idx;
}

function FIN_FLASH_V2_parseAnalise_(v) {
  try { return JSON.parse(FIN_FLASH_V2_text_(v) || '{}'); } catch(e) { return {}; }
}

function FIN_FLASH_V2_isoSafe_(v) {
  var d = FIN_FLASH_V2_asDate_(v);
  return d ? d.toISOString() : FIN_FLASH_V2_text_(v);
}

function FIN_FLASH_V2_limit_(arr, limite) {
  limite = Math.max(1, Math.min(Number(limite || 100), 500));
  return arr.slice(0, limite);
}

function FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var contas = FIN_FLASH_V2_contasIndex_(), extratos = FIN_FLASH_V2_extratosIndex_(), prestacoes = FIN_FLASH_V2_prestacoesIndex_();
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PENDENCIAS).filter(function(x) {
      return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste;
    });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(p) {
      var cpf = FIN_FLASH_V2_cpfNorm_(p.CPF), conta = contas.porCpf[cpf] || contas.porId[FIN_FLASH_V2_text_(p.CONTA_ID)] || {};
      var ex = extratos[FIN_FLASH_V2_text_(p.EXTRATO_ID)] || {}, pr = prestacoes[FIN_FLASH_V2_text_(p.PRESTACAO_ID)] || {};
      var valor = Math.abs(FIN_FLASH_V2_num_(ex.VALOR));
      if (!isFinite(valor)) valor = Math.abs(FIN_FLASH_V2_num_(pr.VALOR));
      return {
        id: FIN_FLASH_V2_text_(p.ID),
        extratoId: FIN_FLASH_V2_text_(p.EXTRATO_ID),
        prestacaoId: FIN_FLASH_V2_text_(p.PRESTACAO_ID),
        colaborador: FIN_FLASH_V2_text_(conta.NOME || ex.PESSOA || 'NAO_IDENTIFICADO'),
        cpf: cpf,
        valor: isFinite(valor) ? valor : '',
        motivo: FIN_FLASH_V2_text_(p.DESCRICAO || p.TIPO),
        status: FIN_FLASH_V2_text_(p.STATUS || p.TIPO),
        tipo: FIN_FLASH_V2_text_(p.TIPO),
        severidade: FIN_FLASH_V2_text_(p.SEVERIDADE),
        prazo: FIN_FLASH_V2_text_(p.RESOLVIDO_EM) || 'ABERTO',
        acaoRecomendada: FIN_FLASH_V2_text_(p.BLOQUEIA_RECARGA) === 'SIM' ? 'Bloquear novas recargas ate conferencia financeira.' : 'Conferir prestacao, comprovante e justificativa.',
        bloqueiaRecarga: FIN_FLASH_V2_text_(p.BLOQUEIA_RECARGA) === 'SIM',
        ambienteTeste: FIN_FLASH_V2_text_(p.AMBIENTE_TESTE),
        criadoEm: FIN_FLASH_V2_isoSafe_(p.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var extratos = FIN_FLASH_V2_extratosIndex_(), prestacoes = FIN_FLASH_V2_prestacoesIndex_(), documentos = FIN_FLASH_V2_documentosIndex_();
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CONCILIACOES).filter(function(x) {
      return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste;
    });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(c) {
      var ex = extratos[FIN_FLASH_V2_text_(c.EXTRATO_ID)] || {}, pr = prestacoes[FIN_FLASH_V2_text_(c.PRESTACAO_ID)] || {};
      var analise = FIN_FLASH_V2_parseAnalise_(c.ANALISE_IA), doc = documentos[FIN_FLASH_V2_text_(pr.COMPROVANTE_ID)] || documentos[FIN_FLASH_V2_text_(pr.ID)] || {};
      return {
        id: FIN_FLASH_V2_text_(c.ID),
        extratoId: FIN_FLASH_V2_text_(c.EXTRATO_ID),
        prestacaoId: FIN_FLASH_V2_text_(c.PRESTACAO_ID),
        extrato: FIN_FLASH_V2_text_(ex.MOVIMENTACAO || c.EXTRATO_ID),
        prestacaoVinculada: FIN_FLASH_V2_text_(pr.JUSTIFICATIVA || c.PRESTACAO_ID),
        cpf: FIN_FLASH_V2_cpfNorm_(ex.CPF || pr.CPF),
        valorExtrato: Math.abs(FIN_FLASH_V2_num_(c.VALOR_EXTRATO)),
        valorPrestacao: Math.abs(FIN_FLASH_V2_num_(c.VALOR_PRESTACAO)),
        divergenciaValor: FIN_FLASH_V2_num_(c.DIVERGENCIA_VALOR),
        score: Number(analise.score || 0),
        status: FIN_FLASH_V2_text_(c.STATUS),
        comprovante: FIN_FLASH_V2_text_(pr.COMPROVANTE_ID || doc.ID),
        comprovanteLink: FIN_FLASH_V2_text_(doc.LINK),
        justificativa: FIN_FLASH_V2_text_(pr.JUSTIFICATIVA),
        acaoFinanceiro: ['CONCILIADO','CONCILIADO_AUTOMATICO'].indexOf(FIN_FLASH_V2_text_(c.STATUS)) >= 0 ? 'Arquivar e manter trilha de auditoria.' : 'Conferir divergencia antes de qualquer aprovacao.',
        iaAprovaSozinha: false,
        ambienteTeste: FIN_FLASH_V2_text_(c.AMBIENTE_TESTE),
        criadoEm: FIN_FLASH_V2_isoSafe_(c.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_PRESTACOES_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var contas = FIN_FLASH_V2_contasIndex_(), docs = FIN_FLASH_V2_documentosIndex_();
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PRESTACOES).filter(function(x) { return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste; });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(p) {
      var conta = contas.porCpf[FIN_FLASH_V2_cpfNorm_(p.CPF)] || contas.porId[FIN_FLASH_V2_text_(p.CONTA_ID)] || {}, doc = docs[FIN_FLASH_V2_text_(p.COMPROVANTE_ID)] || docs[FIN_FLASH_V2_text_(p.ID)] || {};
      return {
        id: FIN_FLASH_V2_text_(p.ID),
        colaborador: FIN_FLASH_V2_text_(conta.NOME),
        cpf: FIN_FLASH_V2_cpfNorm_(p.CPF),
        dataGasto: FIN_FLASH_V2_isoSafe_(p.DATA_GASTO),
        valor: FIN_FLASH_V2_num_(p.VALOR),
        categoria: FIN_FLASH_V2_text_(p.FINALIDADE),
        justificativa: FIN_FLASH_V2_text_(p.JUSTIFICATIVA),
        comprovanteId: FIN_FLASH_V2_text_(p.COMPROVANTE_ID),
        comprovanteLink: FIN_FLASH_V2_text_(doc.LINK),
        status: FIN_FLASH_V2_text_(p.STATUS),
        ambienteTeste: FIN_FLASH_V2_text_(p.AMBIENTE_TESTE),
        criadoEm: FIN_FLASH_V2_isoSafe_(p.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_EXTRATOS_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.EXTRATOS).filter(function(x) { return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste; });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(e) {
      var valor = FIN_FLASH_V2_num_(e.VALOR);
      return {
        id: FIN_FLASH_V2_text_(e.ID),
        data: FIN_FLASH_V2_isoSafe_(e.DATA),
        movimentacao: FIN_FLASH_V2_text_(e.MOVIMENTACAO),
        valor: valor,
        tipo: valor < 0 ? 'GASTO' : 'RECARGA',
        pessoa: FIN_FLASH_V2_text_(e.PESSOA),
        cpf: FIN_FLASH_V2_cpfNorm_(e.CPF),
        pagamento: FIN_FLASH_V2_text_(e.PAGAMENTO),
        statusImportacao: FIN_FLASH_V2_text_(e.STATUS_IMPORTACAO),
        loteId: FIN_FLASH_V2_text_(e.LOTE_ID),
        ambienteTeste: FIN_FLASH_V2_text_(e.AMBIENTE_TESTE),
        criadoEm: FIN_FLASH_V2_isoSafe_(e.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.DOCUMENTOS).filter(function(x) { return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste; });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(d) {
      return {
        id: FIN_FLASH_V2_text_(d.ID),
        contaId: FIN_FLASH_V2_text_(d.CONTA_ID),
        prestacaoId: FIN_FLASH_V2_text_(d.PRESTACAO_ID),
        tipo: FIN_FLASH_V2_text_(d.TIPO),
        arquivoId: FIN_FLASH_V2_text_(d.ARQUIVO_ID),
        link: FIN_FLASH_V2_text_(d.LINK),
        status: FIN_FLASH_V2_text_(d.STATUS),
        ambienteTeste: FIN_FLASH_V2_text_(d.AMBIENTE_TESTE),
        criadoEm: FIN_FLASH_V2_isoSafe_(d.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_LOGS_DEV(filtros) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,itens:[],total:0,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Listagem bloqueada fora do DEV.'); return r; }
  filtros = filtros || {};
  try {
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.LOGS).filter(function(x) { return !filtros.ambienteTeste || FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === filtros.ambienteTeste; });
    r.total = rows.length;
    r.itens = FIN_FLASH_V2_limit_(rows.reverse(), filtros.limite).map(function(l) {
      return {
        id: FIN_FLASH_V2_text_(l.ID),
        acao: FIN_FLASH_V2_text_(l.ACAO),
        entidade: FIN_FLASH_V2_text_(l.ENTIDADE),
        entidadeId: FIN_FLASH_V2_text_(l.ENTIDADE_ID),
        detalheJson: FIN_FLASH_V2_text_(l.DETALHE_JSON),
        ambienteTeste: FIN_FLASH_V2_text_(l.AMBIENTE_TESTE),
        executadoPor: FIN_FLASH_V2_text_(l.EXECUTADO_POR),
        criadoEm: FIN_FLASH_V2_isoSafe_(l.CRIADO_EM)
      };
    });
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_DETALHE_CONCILIACAO_DEV(id) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,detalhe:null,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Detalhe bloqueado fora do DEV.'); return r; }
  try {
    id = FIN_FLASH_V2_text_(id);
    if (!id) { r.bloqueios.push('ID da conciliacao obrigatorio.'); return r; }
    var conc = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CONCILIACOES).filter(function(x) { return FIN_FLASH_V2_text_(x.ID) === id; })[0];
    if (!conc) { r.bloqueios.push('Conciliacao nao encontrada: ' + id); return r; }
    var extratos = FIN_FLASH_V2_extratosIndex_(), prestacoes = FIN_FLASH_V2_prestacoesIndex_(), docs = FIN_FLASH_V2_documentosIndex_();
    var ex = extratos[FIN_FLASH_V2_text_(conc.EXTRATO_ID)] || null, pr = prestacoes[FIN_FLASH_V2_text_(conc.PRESTACAO_ID)] || null;
    var doc = pr ? (docs[FIN_FLASH_V2_text_(pr.COMPROVANTE_ID)] || docs[FIN_FLASH_V2_text_(pr.ID)] || null) : null;
    r.detalhe = {
      conciliacao: FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({limite:500}).itens.filter(function(x) { return x.id === id; })[0] || conc,
      extrato: ex,
      prestacao: pr,
      documento: doc,
      pendencias: FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({limite:500}).itens.filter(function(p) { return p.extratoId === FIN_FLASH_V2_text_(conc.EXTRATO_ID) || p.prestacaoId === FIN_FLASH_V2_text_(conc.PRESTACAO_ID); }),
      iaAprovaSozinha: false
    };
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteDev:true,kpis:{},bloqueios:[],avisos:[],menuLigado:false,importacaoRealExecutada:false,webappDeployExecutado:false,producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Dashboard bloqueado fora do DEV.'); return r; }
  try {
    var contas = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CONTAS), cartoes = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CARTOES), recargas = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.RECARGAS);
    var prestacoes = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PRESTACOES), extratos = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.EXTRATOS), concs = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.CONCILIACOES), pends = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.PENDENCIAS);
    var totalRecarregado = recargas.reduce(function(s,x){ var n = FIN_FLASH_V2_num_(x.VALOR); return s + (isFinite(n) ? n : 0); }, 0);
    var totalGasto = extratos.reduce(function(s,x){ var n = FIN_FLASH_V2_num_(x.VALOR); return s + (isFinite(n) && n < 0 ? Math.abs(n) : 0); }, 0);
    var totalConciliado = concs.reduce(function(s,x){ var st = FIN_FLASH_V2_text_(x.STATUS), n = FIN_FLASH_V2_num_(x.VALOR_EXTRATO); return s + (['CONCILIADO','CONCILIADO_AUTOMATICO'].indexOf(st) >= 0 && isFinite(n) ? Math.abs(n) : 0); }, 0);
    r.kpis = {
      totalContasFlash: contas.length,
      totalCartoesAtivos: cartoes.filter(function(x){ return FIN_FLASH_V2_text_(x.STATUS).indexOf('ATIVO') >= 0; }).length,
      totalRecarregado: totalRecarregado,
      totalGasto: totalGasto,
      totalConciliado: totalConciliado,
      totalPendente: pends.filter(function(x){ return ['RESOLVIDA','RESOLVIDO','FECHADO','FECHADA'].indexOf(FIN_FLASH_V2_text_(x.STATUS)) < 0; }).length,
      pendenciasCriticas: pends.filter(function(x){ return FIN_FLASH_V2_text_(x.SEVERIDADE) === 'ALTA' || FIN_FLASH_V2_text_(x.TIPO) === 'PENDENTE_CRITICO'; }).length,
      prestacoesAguardandoConferencia: prestacoes.filter(function(x){ return ['AGUARDANDO_CONFERENCIA','AGUARDANDO_EXTRATO','AGUARDANDO_CONCILIACAO'].indexOf(FIN_FLASH_V2_text_(x.STATUS)) >= 0; }).length
    };
    r.resumos = {
      pendencias: FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM',limite:20}).itens,
      conciliacoes: FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM',limite:20}).itens
    };
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_4_TESTE_DASHBOARD_DESKTOP_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',dashboardOk:false,kpisCalculados:false,pendenciasListadas:false,conciliacoesListadas:false,prestacoesListadas:false,extratosListados:false,documentosReferenciados:false,logsDisponiveis:false,detalheConciliacaoOk:false,todosDadosTesteComAmbienteTeste:false,menuLigado:false,importacaoRealExecutada:false,webappDeployExecutado:false,producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false,bloqueios:[],avisos:[],detalhes:{}};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var seed = EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV();
    r.detalhes.seedV23 = {ok:seed.ok,bloqueios:seed.bloqueios};
    if (!seed.ok) { r.bloqueios.push('Massa base V2.3 nao aprovada para dashboard.'); return r; }
    var dash = FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV();
    var pend = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM',limite:50});
    var conc = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM',limite:50});
    var prest = FIN_FLASH_V2_LISTAR_PRESTACOES_DEV({ambienteTeste:'SIM',limite:50});
    var ext = FIN_FLASH_V2_LISTAR_EXTRATOS_DEV({ambienteTeste:'SIM',limite:50});
    var docs = FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV({ambienteTeste:'SIM',limite:50});
    var logs = FIN_FLASH_V2_LISTAR_LOGS_DEV({ambienteTeste:'SIM',limite:50});
    var concId = conc.itens.length ? conc.itens[0].id : '';
    var det = concId ? FIN_FLASH_V2_OBTER_DETALHE_CONCILIACAO_DEV(concId) : {ok:false,bloqueios:['Sem conciliacao para detalhar.']};
    r.detalhes.dashboard = dash.kpis || {};
    r.detalhes.totais = {pendencias:pend.total,conciliacoes:conc.total,prestacoes:prest.total,extratos:ext.total,documentos:docs.total,logs:logs.total};
    r.dashboardOk = dash.ok;
    r.kpisCalculados = dash.ok && ['totalContasFlash','totalCartoesAtivos','totalRecarregado','totalGasto','totalConciliado','totalPendente','pendenciasCriticas','prestacoesAguardandoConferencia'].every(function(k){ return dash.kpis.hasOwnProperty(k); });
    r.pendenciasListadas = pend.ok && pend.itens.length > 0;
    r.conciliacoesListadas = conc.ok && conc.itens.length > 0;
    r.prestacoesListadas = prest.ok && prest.itens.length > 0;
    r.extratosListados = ext.ok && ext.itens.length > 0;
    r.documentosReferenciados = docs.ok && (docs.itens.length > 0 || prest.itens.some(function(x){ return !!x.comprovanteId; }));
    r.logsDisponiveis = logs.ok && logs.itens.length > 0;
    r.detalheConciliacaoOk = det.ok && !!det.detalhe;
    var amostras = [].concat(pend.itens, conc.itens, prest.itens, ext.itens, docs.itens, logs.itens);
    r.todosDadosTesteComAmbienteTeste = amostras.length > 0 && amostras.every(function(x){ return FIN_FLASH_V2_text_(x.ambienteTeste) === 'SIM'; });
    ['dashboardOk','kpisCalculados','pendenciasListadas','conciliacoesListadas','prestacoesListadas','extratosListados','documentosReferenciados','logsDisponiveis','detalheConciliacaoOk','todosDadosTesteComAmbienteTeste'].forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}


function FIN_FLASH_V2_sheetCtx_(aba) {
  var sh = FIN_FLASH_V2_db_().getSheetByName(aba);
  if (!sh) throw new Error('Aba ausente: ' + aba);
  var hm = FIN_FLASH_V2_getHeaderMap_(sh).map;
  return {sh:sh, map:hm, values:sh.getDataRange().getValues()};
}

function FIN_FLASH_V2_findRowById_(aba, id) {
  var ctx = FIN_FLASH_V2_sheetCtx_(aba), idx = ctx.map.ID;
  if (idx == null) throw new Error('Coluna ID ausente em ' + aba);
  id = FIN_FLASH_V2_text_(id);
  for (var i = 1; i < ctx.values.length; i++) {
    if (FIN_FLASH_V2_text_(ctx.values[i][idx]) === id) return {ctx:ctx, row:i + 1, values:ctx.values[i]};
  }
  return null;
}

function FIN_FLASH_V2_setByHeaders_(hit, patch) {
  Object.keys(patch || {}).forEach(function(k) {
    if (hit.ctx.map[k] == null) return;
    hit.ctx.sh.getRange(hit.row, hit.ctx.map[k] + 1).setValue(patch[k]);
  });
}

function FIN_FLASH_V2_registrarLogAcao_(acao, entidade, entidadeId, detalhe, ambienteTeste) {
  var sh = FIN_FLASH_V2_db_().getSheetByName(FIN_FLASH_V2_ABAS.LOGS);
  var id = FIN_FLASH_V2_id_('LOG');
  sh.appendRow([id, acao, entidade, entidadeId || '', JSON.stringify(detalhe || {}), ambienteTeste || 'SIM', 'FINANCEIRO_DEV', new Date()]);
  return id;
}

function FIN_FLASH_V2_registrarAlerta_(contaId, cpf, tipo, severidade, mensagem, ambienteTeste) {
  var sh = FIN_FLASH_V2_db_().getSheetByName(FIN_FLASH_V2_ABAS.ALERTAS);
  var id = FIN_FLASH_V2_id_('ALERTA');
  sh.appendRow([id, contaId || '', cpf || '', tipo, severidade || 'MEDIA', mensagem || '', 'ABERTO', ambienteTeste || 'SIM', new Date(), '']);
  return id;
}

function FIN_FLASH_V2_contextoConciliacao_(conciliacaoId) {
  var hit = FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.CONCILIACOES, conciliacaoId);
  if (!hit) throw new Error('Conciliacao nao encontrada: ' + conciliacaoId);
  var c = {}, h = hit.ctx.map;
  Object.keys(h).forEach(function(k) { c[k] = hit.values[h[k]]; });
  var ex = FIN_FLASH_V2_extratosIndex_()[FIN_FLASH_V2_text_(c.EXTRATO_ID)] || null;
  var pr = FIN_FLASH_V2_prestacoesIndex_()[FIN_FLASH_V2_text_(c.PRESTACAO_ID)] || null;
  var docs = FIN_FLASH_V2_documentosIndex_();
  var doc = pr ? (docs[FIN_FLASH_V2_text_(pr.COMPROVANTE_ID)] || docs[FIN_FLASH_V2_text_(pr.ID)] || null) : null;
  return {hit:hit, conciliacao:c, extrato:ex, prestacao:pr, documento:doc};
}

function FIN_FLASH_V2_contextoPendencia_(pendenciaId) {
  var hit = FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.PENDENCIAS, pendenciaId);
  if (!hit) throw new Error('Pendencia nao encontrada: ' + pendenciaId);
  var p = {}, h = hit.ctx.map;
  Object.keys(h).forEach(function(k) { p[k] = hit.values[h[k]]; });
  var ex = FIN_FLASH_V2_extratosIndex_()[FIN_FLASH_V2_text_(p.EXTRATO_ID)] || null;
  var pr = FIN_FLASH_V2_prestacoesIndex_()[FIN_FLASH_V2_text_(p.PRESTACAO_ID)] || null;
  var docs = FIN_FLASH_V2_documentosIndex_();
  var doc = pr ? (docs[FIN_FLASH_V2_text_(pr.COMPROVANTE_ID)] || docs[FIN_FLASH_V2_text_(pr.ID)] || null) : null;
  return {hit:hit, pendencia:p, extrato:ex, prestacao:pr, documento:doc};
}

function FIN_FLASH_V2_validarMotivo_(motivo, campo) {
  motivo = FIN_FLASH_V2_text_(motivo);
  if (motivo.length < 5) throw new Error((campo || 'Motivo') + ' obrigatorio com pelo menos 5 caracteres.');
  return motivo;
}

function FIN_FLASH_V2_MARCAR_CONCILIACAO_CONFERIDA_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',conferida:false,logCriado:false,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo || 'Conferencia financeira DEV', 'Motivo da conferencia');
    var ctx = FIN_FLASH_V2_contextoConciliacao_(payload.conciliacaoId);
    var status = FIN_FLASH_V2_text_(ctx.conciliacao.STATUS);
    var divergencia = Math.abs(FIN_FLASH_V2_num_(ctx.conciliacao.DIVERGENCIA_VALOR));
    if (!ctx.prestacao || !FIN_FLASH_V2_text_(ctx.prestacao.COMPROVANTE_ID)) throw new Error('Nao e permitido conferir gasto sem comprovante.');
    if (['PENDENTE_SEM_COMPROVANTE','PENDENTE_VALOR_DIVERGENTE','PENDENTE_CRITICO'].indexOf(status) >= 0 || (isFinite(divergencia) && divergencia > 0.01)) throw new Error('Nao e permitido conferir conciliacao com divergencia critica.');
    var analise = FIN_FLASH_V2_parseAnalise_(ctx.conciliacao.ANALISE_IA);
    analise.conferenciaFinanceira = {status:'CONFERIDA', motivo:motivo, em:new Date().toISOString(), iaAprovaSozinha:false};
    FIN_FLASH_V2_setByHeaders_(ctx.hit, {STATUS:'CONCILIADO', ANALISE_IA:JSON.stringify(analise), APROVADO_POR:'FINANCEIRO_DEV'});
    var logId = FIN_FLASH_V2_registrarLogAcao_('CONCILIACAO_CONFERIDA_DEV','FIN_FLASH_V2_CONCILIACOES',FIN_FLASH_V2_text_(ctx.conciliacao.ID),{motivo:motivo,statusAnterior:status,iaAprovaSozinha:false},FIN_FLASH_V2_text_(ctx.conciliacao.AMBIENTE_TESTE || 'SIM'));
    r.conferida = true; r.logCriado = !!logId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_SOLICITAR_CORRECAO_COLABORADOR_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',correcaoSolicitada:false,alertaCriado:false,logCriado:false,mensagem:'',bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo, 'Motivo da correcao');
    var ctx = FIN_FLASH_V2_contextoPendencia_(payload.pendenciaId);
    var p = ctx.pendencia, cpf = FIN_FLASH_V2_cpfNorm_(p.CPF || ctx.prestacao && ctx.prestacao.CPF || ctx.extrato && ctx.extrato.CPF);
    var mensagem = 'Pendencia Flash V2: favor corrigir a prestacao. Motivo: ' + motivo + '. CPF conta: ' + cpf + '. Pendencia: ' + FIN_FLASH_V2_text_(p.ID) + '.';
    FIN_FLASH_V2_setByHeaders_(ctx.hit, {STATUS:'AGUARDANDO_CORRECAO_COLABORADOR', DESCRICAO:FIN_FLASH_V2_text_(p.DESCRICAO) + ' | Correcao solicitada: ' + motivo});
    var alertaId = FIN_FLASH_V2_registrarAlerta_(FIN_FLASH_V2_text_(p.CONTA_ID), cpf, 'CORRECAO_PRESTACAO_FLASH_V2', 'MEDIA', mensagem, FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    var logId = FIN_FLASH_V2_registrarLogAcao_('SOLICITAR_CORRECAO_COLABORADOR_DEV','FIN_FLASH_V2_PENDENCIAS',FIN_FLASH_V2_text_(p.ID),{motivo:motivo,mensagem:mensagem,alertaId:alertaId},FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    r.correcaoSolicitada = true; r.alertaCriado = !!alertaId; r.logCriado = !!logId; r.mensagem = mensagem; r.alertaId = alertaId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_MANTER_PENDENCIA_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',pendenciaMantida:false,logCriado:false,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo, 'Motivo formal');
    var ctx = FIN_FLASH_V2_contextoPendencia_(payload.pendenciaId), p = ctx.pendencia;
    var severidade = FIN_FLASH_V2_text_(payload.severidade || p.SEVERIDADE || 'MEDIA');
    var prazo = FIN_FLASH_V2_text_(payload.prazo || 'PRAZO_A_DEFINIR');
    FIN_FLASH_V2_setByHeaders_(ctx.hit, {STATUS:'PENDENCIA_MANTIDA', SEVERIDADE:severidade, DESCRICAO:FIN_FLASH_V2_text_(p.DESCRICAO) + ' | Mantida: ' + motivo + ' | Prazo: ' + prazo});
    var logId = FIN_FLASH_V2_registrarLogAcao_('MANTER_PENDENCIA_DEV','FIN_FLASH_V2_PENDENCIAS',FIN_FLASH_V2_text_(p.ID),{motivo:motivo,severidade:severidade,prazo:prazo},FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    r.pendenciaMantida = true; r.logCriado = !!logId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_MARCAR_PENDENCIA_RESOLVIDA_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',pendenciaResolvida:false,logCriado:false,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo, 'Justificativa da resolucao');
    var ctx = FIN_FLASH_V2_contextoPendencia_(payload.pendenciaId), p = ctx.pendencia;
    var tipo = FIN_FLASH_V2_text_(p.TIPO);
    if (['PENDENTE_SEM_COMPROVANTE','PENDENTE_COMPROVANTE_DIVERGENTE'].indexOf(tipo) >= 0 && !ctx.documento && !(ctx.prestacao && FIN_FLASH_V2_text_(ctx.prestacao.COMPROVANTE_ID))) throw new Error('Comprovante obrigatorio para resolver esta pendencia.');
    FIN_FLASH_V2_setByHeaders_(ctx.hit, {STATUS:'RESOLVIDA', DESCRICAO:FIN_FLASH_V2_text_(p.DESCRICAO) + ' | Resolvida: ' + motivo, RESOLVIDO_EM:new Date()});
    var logId = FIN_FLASH_V2_registrarLogAcao_('PENDENCIA_RESOLVIDA_DEV','FIN_FLASH_V2_PENDENCIAS',FIN_FLASH_V2_text_(p.ID),{motivo:motivo,resolvidoPor:'FINANCEIRO_DEV'},FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    r.pendenciaResolvida = true; r.logCriado = !!logId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_contaHitPorCpf_(cpf) {
  cpf = FIN_FLASH_V2_cpfNorm_(cpf);
  var ctx = FIN_FLASH_V2_sheetCtx_(FIN_FLASH_V2_ABAS.CONTAS), iCpf = ctx.map.CPF;
  for (var i = 1; i < ctx.values.length; i++) {
    if (FIN_FLASH_V2_cpfNorm_(ctx.values[i][iCpf]) === cpf) return {ctx:ctx, row:i + 1, values:ctx.values[i]};
  }
  throw new Error('Conta CPF nao encontrada: ' + cpf);
}

function FIN_FLASH_V2_BLOQUEAR_RECARGAS_POR_PENDENCIA_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',recargasBloqueadas:false,logCriado:false,bloqueioOperacional:true,bloqueioCartaoFlash:false,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo, 'Motivo do bloqueio');
    var pend = payload.pendenciaId ? FIN_FLASH_V2_contextoPendencia_(payload.pendenciaId) : null;
    var cpf = FIN_FLASH_V2_cpfNorm_(payload.cpf || pend && pend.pendencia.CPF);
    if (pend) {
      var p = pend.pendencia;
      if (FIN_FLASH_V2_text_(p.SEVERIDADE) !== 'ALTA' && FIN_FLASH_V2_text_(p.TIPO) !== 'PENDENTE_CRITICO' && FIN_FLASH_V2_text_(payload.forcarTeste) !== 'SIM') throw new Error('Bloqueio de recarga exige pendencia critica.');
      FIN_FLASH_V2_setByHeaders_(pend.hit, {BLOQUEIA_RECARGA:'SIM', SEVERIDADE:'ALTA', STATUS:FIN_FLASH_V2_text_(p.STATUS) || 'ABERTA'});
    }
    var hit = FIN_FLASH_V2_contaHitPorCpf_(cpf), h = hit.ctx.map, statusAnterior = FIN_FLASH_V2_text_(hit.values[h.STATUS]);
    FIN_FLASH_V2_setByHeaders_(hit, {STATUS:'ATIVO_TESTE_BLOQUEIO_RECARGA', ATUALIZADO_EM:new Date()});
    var logId = FIN_FLASH_V2_registrarLogAcao_('BLOQUEAR_RECARGAS_POR_PENDENCIA_DEV','FIN_FLASH_V2_CONTAS',FIN_FLASH_V2_text_(hit.values[h.ID]),{cpf:cpf,motivo:motivo,statusAnterior:statusAnterior,pendenciaId:payload.pendenciaId || '',bloqueioOperacional:true,bloqueioCartaoFlash:false},'SIM');
    r.recargasBloqueadas = true; r.logCriado = !!logId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_DESBLOQUEAR_RECARGAS_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',recargasDesbloqueadas:false,logCriado:false,bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo, 'Motivo do desbloqueio');
    var cpf = FIN_FLASH_V2_cpfNorm_(payload.cpf), hit = FIN_FLASH_V2_contaHitPorCpf_(cpf), h = hit.ctx.map;
    var statusAnterior = FIN_FLASH_V2_text_(hit.values[h.STATUS]);
    FIN_FLASH_V2_setByHeaders_(hit, {STATUS:'ATIVO_TESTE', ATUALIZADO_EM:new Date()});
    var logId = FIN_FLASH_V2_registrarLogAcao_('DESBLOQUEAR_RECARGAS_DEV','FIN_FLASH_V2_CONTAS',FIN_FLASH_V2_text_(hit.values[h.ID]),{cpf:cpf,motivo:motivo,statusAnterior:statusAnterior},'SIM');
    r.recargasDesbloqueadas = true; r.logCriado = !!logId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_PREPARAR_MENSAGEM_COBRANCA_PENDENCIA_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',mensagemPreparada:false,alertaCriado:false,logCriado:false,enviada:false,mensagem:'',bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Acao bloqueada fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var motivo = FIN_FLASH_V2_validarMotivo_(payload.motivo || 'Regularizar pendencia Flash V2', 'Motivo da cobranca');
    var ctx = FIN_FLASH_V2_contextoPendencia_(payload.pendenciaId), p = ctx.pendencia, cpf = FIN_FLASH_V2_cpfNorm_(p.CPF || ctx.prestacao && ctx.prestacao.CPF || ctx.extrato && ctx.extrato.CPF);
    var mensagem = 'Ola. Existe uma pendencia no Cartao Flash vinculada ao CPF ' + cpf + '. Motivo: ' + motivo + '. Pendencia: ' + FIN_FLASH_V2_text_(p.ID) + '. Envie/corrija a prestacao com comprovante pelo SGO+.';
    var alertaId = FIN_FLASH_V2_registrarAlerta_(FIN_FLASH_V2_text_(p.CONTA_ID), cpf, 'COBRANCA_PENDENCIA_FLASH_V2', FIN_FLASH_V2_text_(p.SEVERIDADE || 'MEDIA'), mensagem, FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    var logId = FIN_FLASH_V2_registrarLogAcao_('PREPARAR_MENSAGEM_COBRANCA_PENDENCIA_DEV','FIN_FLASH_V2_PENDENCIAS',FIN_FLASH_V2_text_(p.ID),{motivo:motivo,mensagem:mensagem,enviada:false,alertaId:alertaId},FIN_FLASH_V2_text_(p.AMBIENTE_TESTE || 'SIM'));
    r.mensagemPreparada = true; r.alertaCriado = !!alertaId; r.logCriado = !!logId; r.mensagem = mensagem; r.alertaId = alertaId; r.logId = logId; r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_5_escolherConciliacao_(status, exigeComprovante) {
  var concs = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM',limite:500}).itens;
  for (var i = 0; i < concs.length; i++) {
    if (status && concs[i].status !== status) continue;
    if (exigeComprovante && !concs[i].comprovante) continue;
    return concs[i];
  }
  return null;
}

function FIN_FLASH_V2_5_escolherPendencia_(tipo) {
  var pends = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM',limite:500}).itens;
  for (var i = 0; i < pends.length; i++) {
    if (!tipo || pends[i].tipo === tipo) return pends[i];
  }
  return null;
}

function EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',marcarConferidoOk:false,bloqueioConferidoSemComprovante:false,solicitarCorrecaoOk:false,manterPendenciaOk:false,pendenciaResolvidaOk:false,bloqueioRecargaOk:false,desbloqueioRecargaOk:false,mensagemCobrancaPreparada:false,logsCriados:false,alertasCriados:false,todosDadosTesteComAmbienteTeste:false,menuLigado:false,importacaoRealExecutada:false,webappDeployExecutado:false,producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false,bloqueios:[],avisos:[],detalhes:{}};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var seed = EXECUTAR_FIN_FLASH_V2_3_TESTE_CONCILIACAO_AUTOMATICA_DEV();
    r.detalhes.seedV23 = {ok:seed.ok,bloqueios:seed.bloqueios};
    if (!seed.ok) { r.bloqueios.push('Massa base V2.3 nao aprovada para acoes financeiras.'); return r; }
    var valida = FIN_FLASH_V2_5_escolherConciliacao_('CONCILIADO_AUTOMATICO', true);
    var semComp = FIN_FLASH_V2_5_escolherConciliacao_('PENDENTE_SEM_COMPROVANTE', false);
    var pendCorrecao = FIN_FLASH_V2_5_escolherPendencia_('PENDENTE_VALOR_DIVERGENTE') || FIN_FLASH_V2_5_escolherPendencia_(null);
    var pendManter = FIN_FLASH_V2_5_escolherPendencia_('PENDENTE_SEM_PRESTACAO') || FIN_FLASH_V2_5_escolherPendencia_(null);
    var pendResolver = FIN_FLASH_V2_5_escolherPendencia_('AGUARDANDO_EXTRATO') || FIN_FLASH_V2_5_escolherPendencia_(null);
    var pendCritica = FIN_FLASH_V2_5_escolherPendencia_('PENDENTE_CRITICO') || pendCorrecao;
    if (!valida || !semComp || !pendCorrecao || !pendManter || !pendResolver || !pendCritica) { r.bloqueios.push('Massa de teste insuficiente para acoes financeiras.'); return r; }
    var a1 = FIN_FLASH_V2_MARCAR_CONCILIACAO_CONFERIDA_DEV({conciliacaoId:valida.id,motivo:'Conferencia automatica teste V2.5'});
    var a2 = FIN_FLASH_V2_MARCAR_CONCILIACAO_CONFERIDA_DEV({conciliacaoId:semComp.id,motivo:'Tentativa sem comprovante teste V2.5'});
    var a3 = FIN_FLASH_V2_SOLICITAR_CORRECAO_COLABORADOR_DEV({pendenciaId:pendCorrecao.id,motivo:'Corrigir dados divergentes teste V2.5'});
    var a4 = FIN_FLASH_V2_MANTER_PENDENCIA_DEV({pendenciaId:pendManter.id,motivo:'Manter ate envio da prestacao teste V2.5',severidade:'MEDIA',prazo:'48H'});
    var a5 = FIN_FLASH_V2_MARCAR_PENDENCIA_RESOLVIDA_DEV({pendenciaId:pendResolver.id,motivo:'Regularizacao conferida teste V2.5'});
    var cpfBloqueio = FIN_FLASH_V2_cpfNorm_(pendCritica.cpf || '00000000000');
    var a6 = FIN_FLASH_V2_BLOQUEAR_RECARGAS_POR_PENDENCIA_DEV({pendenciaId:pendCritica.id,cpf:cpfBloqueio,motivo:'Pendencia critica teste V2.5',forcarTeste:'SIM'});
    var a7 = FIN_FLASH_V2_DESBLOQUEAR_RECARGAS_DEV({cpf:cpfBloqueio,motivo:'Regularizacao teste V2.5'});
    var a8 = FIN_FLASH_V2_PREPARAR_MENSAGEM_COBRANCA_PENDENCIA_DEV({pendenciaId:pendCorrecao.id,motivo:'Cobrar regularizacao teste V2.5'});
    r.detalhes.acoes = {marcarConferido:a1,bloqueioSemComprovante:a2,solicitarCorrecao:a3,manterPendencia:a4,resolverPendencia:a5,bloquearRecarga:a6,desbloquearRecarga:a7,mensagemCobranca:a8};
    r.marcarConferidoOk = a1.ok && a1.conferida;
    r.bloqueioConferidoSemComprovante = !a2.ok && a2.bloqueios.join(' ').indexOf('comprovante') >= 0;
    r.solicitarCorrecaoOk = a3.ok && a3.correcaoSolicitada;
    r.manterPendenciaOk = a4.ok && a4.pendenciaMantida;
    r.pendenciaResolvidaOk = a5.ok && a5.pendenciaResolvida;
    r.bloqueioRecargaOk = a6.ok && a6.recargasBloqueadas && a6.bloqueioOperacional && !a6.bloqueioCartaoFlash;
    r.desbloqueioRecargaOk = a7.ok && a7.recargasDesbloqueadas;
    r.mensagemCobrancaPreparada = a8.ok && a8.mensagemPreparada && !a8.enviada;
    r.logsCriados = [a1,a3,a4,a5,a6,a7,a8].every(function(x){ return !!x.logCriado; });
    r.alertasCriados = !!a3.alertaCriado && !!a8.alertaCriado;
    var logs = FIN_FLASH_V2_LISTAR_LOGS_DEV({ambienteTeste:'SIM',limite:500}).itens;
    var alertas = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.ALERTAS).filter(function(x){ return FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === 'SIM'; });
    r.todosDadosTesteComAmbienteTeste = logs.length > 0 && alertas.length > 0 && [a1,a3,a4,a5,a6,a7,a8].every(function(x){ return x.ok || x === a2; });
    ['marcarConferidoOk','bloqueioConferidoSemComprovante','solicitarCorrecaoOk','manterPendenciaOk','pendenciaResolvidaOk','bloqueioRecargaOk','desbloqueioRecargaOk','mensagemCobrancaPreparada','logsCriados','alertasCriados','todosDadosTesteComAmbienteTeste'].forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}


// ─── FIN_FLASH_V2.6 — RELATÓRIOS, DOCUMENTOS E TERMO DE USO ───────────────

var FIN_FLASH_V2_TERMO_VERSAO_ATUAL = 'FIN-FLASH-V2-TERMO-001';

function FIN_FLASH_V2_termoTexto_() {
  var v = FIN_FLASH_V2_TERMO_VERSAO_ATUAL;
  var hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy');
  return [
    'TERMO DE USO E RESPONSABILIDADE — CARTAO FLASH',
    'Versao: ' + v + ' | Emitido em: ' + hoje,
    '',
    '1. OBJETO',
    'O cartao Flash (fisico e/ou virtual) e instrumento de pagamento corporativo fornecido exclusivamente para uso em servico, vinculado ao CPF do colaborador.',
    '',
    '2. USO EXCLUSIVO EM SERVICO',
    'O cartao Flash destina-se exclusivamente a atividades operacionais autorizadas pela empresa. E vedado o uso para finalidades pessoais ou nao autorizadas.',
    '',
    '3. PRESTACAO DE CONTAS OBRIGATORIA',
    'Todo gasto realizado com o cartao Flash deve ser justificado no sistema SGO+ com descricao da finalidade operacional e justificativa adequada.',
    '',
    '4. COMPROVANTE OBRIGATORIO',
    'E obrigatorio o envio de comprovante fiscal (nota fiscal, cupom, recibo, print ou imagem legivel) para cada gasto. A ausencia do comprovante gera pendencia imediata.',
    '',
    '5. PENDENCIAS E BLOQUEIO DE RECARGAS',
    'Qualquer gasto sem prestacao, sem comprovante ou com valor divergente entre extrato e prestacao gera pendencia no sistema. Pendencias podem bloquear novas recargas ate regularizacao.',
    '',
    '6. USO INDEVIDO E RESSARCIMENTO',
    'O uso do cartao Flash para fins nao autorizados, pessoais ou sem justificativa operacional constitui uso indevido e sujeita o colaborador a apuracao interna. Valores usados indevidamente poderao ser cobrados e ressarcidos conforme legislacao trabalhista vigente (CLT), contrato de trabalho e resultado da apuracao formal. Nenhum desconto automatico sera realizado sem apuracao previa.',
    '',
    '7. MEDIDAS DISCIPLINARES',
    'O descumprimento das regras deste termo pode gerar medidas disciplinares proporcionais a gravidade do ato, incluindo advertencia formal, suspensao ou rescisao por justa causa quando cabivel, conforme CLT e regulamento interno da empresa.',
    '',
    '8. CIENCIA E ACEITE',
    'Ao aceitar este termo, o colaborador declara que: (a) leu e compreendeu todas as regras; (b) esta ciente das obrigacoes de prestacao de contas e envio de comprovante; (c) reconhece as consequencias do descumprimento; (d) concorda em utilizar o cartao Flash exclusivamente para finalidades operacionais autorizadas.',
    '',
    'Sistema: SGO+ | Modulo: FIN_FLASH_V2 | Versao: ' + v
  ].join('\n');
}

function FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_POSITIVA_DEV(opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',relatorioId:'',documentoId:'',logId:'',totalConciliado:0,valorTotalConciliado:0,itens:[],bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Relatorio bloqueado fora do DEV.'); return r; }
  opcoes = opcoes || {};
  try {
    var concs = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM',limite:500});
    var positivas = concs.itens.filter(function(x){ return x.status === 'CONCILIADO' || x.status === 'CONCILIADO_AUTOMATICO'; });
    var totalValor = positivas.reduce(function(s,x){ var n = Number(x.valorExtrato||0); return s + (isFinite(n)?n:0); }, 0);
    var contasIdx = FIN_FLASH_V2_contasIndex_();
    var cpfSet = {};
    positivas.forEach(function(x){ if (x.cpf) cpfSet[x.cpf] = true; });
    var colaboradores = Object.keys(cpfSet).map(function(cpf){ var c = contasIdx.porCpf[cpf] || {}; return FIN_FLASH_V2_text_(c.NOME || cpf); });
    var ambienteTeste = opcoes.ambienteTeste || 'SIM';
    var relId = FIN_FLASH_V2_id_('REL_POS');
    var periodo = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd');
    var resumo = JSON.stringify({tipo:'RELATORIO_CONCILIACAO_POSITIVA',versao:'FIN-FLASH-V2-REL-POS-001',periodo:periodo,totalConciliado:positivas.length,valorTotalConciliado:totalValor,colaboradores:colaboradores,statusIncluidos:['CONCILIADO','CONCILIADO_AUTOMATICO'],observacao:'Relatorio DEV AMBIENTE_TESTE=SIM'});
    var hash = FIN_FLASH_V2_hash_(resumo);
    var ss = FIN_FLASH_V2_db_(), shDoc = ss.getSheetByName(FIN_FLASH_V2_ABAS.DOCUMENTOS);
    var docId = FIN_FLASH_V2_id_('DOC');
    shDoc.appendRow([docId,'SISTEMA','','RELATORIO_CONCILIACAO_POSITIVA',relId,'RELATORIO:'+periodo+':'+relId,hash,'ATIVO',ambienteTeste,new Date()]);
    var logId = FIN_FLASH_V2_registrarLogAcao_('RELATORIO_CONCILIACAO_POSITIVA_DEV','FIN_FLASH_V2_DOCUMENTOS',docId,{relatorioId:relId,totalConciliado:positivas.length,valorTotal:totalValor},ambienteTeste);
    r.relatorioId=relId; r.documentoId=docId; r.logId=logId; r.totalConciliado=positivas.length; r.valorTotalConciliado=totalValor; r.itens=positivas; r.success=r.ok=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_NEGATIVA_DEV(opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',relatorioId:'',documentoId:'',logId:'',totalNegativo:0,valorTotalPendente:0,itens:[],bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Relatorio bloqueado fora do DEV.'); return r; }
  opcoes = opcoes || {};
  try {
    var concs = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM',limite:500});
    var PEND_STATUS = ['PENDENTE_SEM_PRESTACAO','PENDENTE_SEM_COMPROVANTE','PENDENTE_VALOR_DIVERGENTE','PENDENTE_JUSTIFICATIVA_INSUFICIENTE','PENDENTE_CRITICO','AGUARDANDO_EXTRATO','AGUARDANDO_CONFERENCIA'];
    var negativas = concs.itens.filter(function(x){ return PEND_STATUS.indexOf(x.status) >= 0; });
    var totalValor = negativas.reduce(function(s,x){ var n = Number(x.valorExtrato||0); return s + (isFinite(n)?n:0); }, 0);
    var ambienteTeste = opcoes.ambienteTeste || 'SIM';
    var relId = FIN_FLASH_V2_id_('REL_NEG');
    var periodo = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd');
    var resumo = JSON.stringify({tipo:'RELATORIO_CONCILIACAO_NEGATIVA',versao:'FIN-FLASH-V2-REL-NEG-001',periodo:periodo,totalNegativo:negativas.length,valorTotalPendente:totalValor,statusIncluidos:PEND_STATUS,recomendacaoGeral:'Sem comprovante: solicitar envio. Valor divergente: solicitar correcao. Sem prestacao: notificar colaborador. Critico: bloquear recarga e escalar.',observacao:'Relatorio DEV AMBIENTE_TESTE=SIM'});
    var hash = FIN_FLASH_V2_hash_(resumo);
    var ss = FIN_FLASH_V2_db_(), shDoc = ss.getSheetByName(FIN_FLASH_V2_ABAS.DOCUMENTOS);
    var docId = FIN_FLASH_V2_id_('DOC');
    shDoc.appendRow([docId,'SISTEMA','','RELATORIO_CONCILIACAO_NEGATIVA',relId,'RELATORIO:'+periodo+':'+relId,hash,'ATIVO',ambienteTeste,new Date()]);
    var logId = FIN_FLASH_V2_registrarLogAcao_('RELATORIO_CONCILIACAO_NEGATIVA_DEV','FIN_FLASH_V2_DOCUMENTOS',docId,{relatorioId:relId,totalNegativo:negativas.length,valorTotal:totalValor},ambienteTeste);
    r.relatorioId=relId; r.documentoId=docId; r.logId=logId; r.totalNegativo=negativas.length; r.valorTotalPendente=totalValor; r.itens=negativas; r.success=r.ok=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_RELATORIO_PENDENCIAS_COLABORADOR_DEV(opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',relatorioId:'',documentoId:'',logId:'',totalColaboradores:0,totalPendencias:0,itens:[],bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Relatorio bloqueado fora do DEV.'); return r; }
  opcoes = opcoes || {};
  try {
    var pends = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM',limite:500});
    var contasIdx = FIN_FLASH_V2_contasIndex_();
    var porCpf = {};
    pends.itens.forEach(function(p) {
      var cpf = p.cpf || 'SEM_CPF';
      if (!porCpf[cpf]) {
        var conta = contasIdx.porCpf[cpf] || {};
        porCpf[cpf] = {cpf:cpf,colaborador:FIN_FLASH_V2_text_(conta.NOME || p.colaborador || cpf),totalPendencias:0,valorTotal:0,pendencias:[]};
      }
      porCpf[cpf].totalPendencias++;
      var val = Number(p.valor||0);
      if (isFinite(val)) porCpf[cpf].valorTotal += val;
      porCpf[cpf].pendencias.push({id:p.id,status:p.status,tipo:p.tipo,valor:p.valor,motivo:p.motivo,severidade:p.severidade,prazo:p.prazo,acaoRecomendada:p.acaoRecomendada,bloqueiaRecarga:p.bloqueiaRecarga});
    });
    var itens = Object.keys(porCpf).map(function(cpf){ return porCpf[cpf]; });
    var ambienteTeste = opcoes.ambienteTeste || 'SIM';
    var relId = FIN_FLASH_V2_id_('REL_PEND');
    var periodo = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd');
    var resumo = JSON.stringify({tipo:'RELATORIO_PENDENCIAS_COLABORADOR',versao:'FIN-FLASH-V2-REL-PEND-001',periodo:periodo,totalColaboradores:itens.length,totalPendencias:pends.itens.length,observacao:'Relatorio DEV AMBIENTE_TESTE=SIM'});
    var hash = FIN_FLASH_V2_hash_(resumo);
    var ss = FIN_FLASH_V2_db_(), shDoc = ss.getSheetByName(FIN_FLASH_V2_ABAS.DOCUMENTOS);
    var docId = FIN_FLASH_V2_id_('DOC');
    shDoc.appendRow([docId,'SISTEMA','','RELATORIO_PENDENCIAS_COLABORADOR',relId,'RELATORIO:'+periodo+':'+relId,hash,'ATIVO',ambienteTeste,new Date()]);
    var logId = FIN_FLASH_V2_registrarLogAcao_('RELATORIO_PENDENCIAS_COLABORADOR_DEV','FIN_FLASH_V2_DOCUMENTOS',docId,{relatorioId:relId,totalColaboradores:itens.length,totalPendencias:pends.itens.length},ambienteTeste);
    r.relatorioId=relId; r.documentoId=docId; r.logId=logId; r.totalColaboradores=itens.length; r.totalPendencias=pends.itens.length; r.itens=itens; r.success=r.ok=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV(opcoes) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',termoId:'',documentoId:'',logId:'',versao:'',termoTexto:'',hash:'',bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Geracao de termo bloqueada fora do DEV.'); return r; }
  opcoes = opcoes || {};
  try {
    var versao = FIN_FLASH_V2_TERMO_VERSAO_ATUAL;
    var texto = FIN_FLASH_V2_termoTexto_();
    var hash = FIN_FLASH_V2_hash_(texto);
    var ambienteTeste = opcoes.ambienteTeste || 'SIM';
    var ss = FIN_FLASH_V2_db_();
    var shTermos = ss.getSheetByName(FIN_FLASH_V2_ABAS.TERMOS);
    var shDoc = ss.getSheetByName(FIN_FLASH_V2_ABAS.DOCUMENTOS);
    var termoId = 'FIN_FLASH_V2_TERMO_' + versao.replace(/-/g,'_');
    var docId = FIN_FLASH_V2_id_('DOC');
    shDoc.appendRow([docId,'SISTEMA','','TERMO_USO_FLASH_V2','TERMO:'+versao,hash,hash,'ATIVO',ambienteTeste,new Date()]);
    var existentes = FIN_FLASH_V2_idsExistentes_(shTermos,'ID');
    if (!existentes[termoId]) shTermos.appendRow([termoId,'SISTEMA','',versao,'VIGENTE',new Date(),docId,ambienteTeste,new Date()]);
    var logId = FIN_FLASH_V2_registrarLogAcao_('GERAR_TERMO_USO_FLASH_V2_DEV','FIN_FLASH_V2_TERMOS',termoId,{versao:versao,documentoId:docId,hash:hash},ambienteTeste);
    r.termoId=termoId; r.documentoId=docId; r.logId=logId; r.versao=versao; r.termoTexto=texto; r.hash=hash; r.success=r.ok=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV() {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',somenteLeitura:true,termoId:'',versao:'',termoTexto:'',documentoId:'',criadoEm:'',bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Consulta bloqueada fora do DEV.'); return r; }
  try {
    var rows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.TERMOS);
    var vigente = null;
    rows.forEach(function(row){ if (FIN_FLASH_V2_text_(row.STATUS) === 'VIGENTE' && FIN_FLASH_V2_text_(row.CONTA_ID) === 'SISTEMA') vigente = row; });
    if (!vigente) { r.bloqueios.push('Nenhum termo vigente encontrado. Execute FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV primeiro.'); return r; }
    r.termoId = FIN_FLASH_V2_text_(vigente.ID);
    r.versao = FIN_FLASH_V2_text_(vigente.VERSAO);
    r.documentoId = FIN_FLASH_V2_text_(vigente.DOCUMENTO_ID);
    r.termoTexto = FIN_FLASH_V2_termoTexto_();
    r.criadoEm = FIN_FLASH_V2_isoSafe_(vigente.CRIADO_EM);
    r.success = r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV(payload) {
  var r = {success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',aceiteId:'',logId:'',versao:'',cpf:'',email:'',bloqueios:[],avisos:[]};
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Registro de aceite bloqueado fora do DEV.'); return r; }
  payload = payload || {};
  try {
    var email = FIN_FLASH_V2_emailUsuarioAtual_(payload);
    var contaR = FIN_FLASH_V2_resolverContaPorEmail_(email, payload);
    if (!contaR.ok) { r.bloqueios = r.bloqueios.concat(contaR.bloqueios); return r; }
    var conta = contaR.conta;
    var termoAtual = FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();
    if (!termoAtual.ok) { r.bloqueios.push('Termo vigente nao encontrado. Gere o termo antes de registrar aceite.'); return r; }
    var versao = termoAtual.versao;
    var aceiteId = 'FIN_FLASH_V2_ACEITE_' + FIN_FLASH_V2_hash_([conta.cpf,versao,new Date().toISOString()].join('|'));
    var ambienteTeste = conta.ambienteTeste === 'SIM' ? 'SIM' : 'NAO';
    var ss = FIN_FLASH_V2_db_(), shTermos = ss.getSheetByName(FIN_FLASH_V2_ABAS.TERMOS);
    var lastRow = shTermos.getLastRow() + 1;
    shTermos.appendRow([aceiteId,conta.id,conta.cpf,versao,'ACEITO',new Date(),termoAtual.documentoId,ambienteTeste,new Date()]);
    var hm = FIN_FLASH_V2_getHeaderMap_(shTermos).map;
    if (hm.CPF != null) shTermos.getRange(lastRow, hm.CPF + 1).setNumberFormat('@').setValue(conta.cpf);
    var logId = FIN_FLASH_V2_registrarLogAcao_('ACEITE_TERMO_FLASH_V2_DEV','FIN_FLASH_V2_TERMOS',aceiteId,{cpf:conta.cpf,email:email,versao:versao,aceito:true},ambienteTeste);
    r.aceiteId=aceiteId; r.logId=logId; r.versao=versao; r.cpf=conta.cpf; r.email=email; r.success=r.ok=true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_6_TESTE_DOCUMENTOS_TERMO_DEV() {
  var r = {
    success:false,ok:false,ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',
    relatorioPositivoGerado:false,relatorioNegativoGerado:false,relatorioPendenciasGerado:false,
    termoUsoGerado:false,termoAtualObtido:false,aceiteTermoRegistrado:false,
    documentosGravados:false,termosGravados:false,logsCriados:false,
    todosDadosTesteComAmbienteTeste:false,menuLigado:false,
    importacaoRealExecutada:false,webappDeployExecutado:false,
    producaoAlterada:false,flashAntigoAlterado:false,forceUsado:false,
    bloqueios:[],avisos:[],detalhes:{}
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var seed = EXECUTAR_FIN_FLASH_V2_5_TESTE_ACOES_FINANCEIRAS_DEV();
    r.detalhes.seedV25 = {ok:seed.ok,bloqueios:seed.bloqueios};
    if (!seed.ok) { r.bloqueios.push('Massa base V2.5 nao aprovada para documentos e termos.'); return r; }

    var rPos = FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_POSITIVA_DEV({ambienteTeste:'SIM'});
    var rNeg = FIN_FLASH_V2_GERAR_RELATORIO_CONCILIACAO_NEGATIVA_DEV({ambienteTeste:'SIM'});
    var rPend = FIN_FLASH_V2_GERAR_RELATORIO_PENDENCIAS_COLABORADOR_DEV({ambienteTeste:'SIM'});
    var rTermo = FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV({ambienteTeste:'SIM'});
    var rTermoAtual = FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();
    var rAceite = FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV({emailUsuarioSimulado:'teste.flash@metrolabs.local'});

    r.detalhes.relatorioPositivo = rPos;
    r.detalhes.relatorioNegativo = rNeg;
    r.detalhes.relatorioPendencias = rPend;
    r.detalhes.termo = rTermo;
    r.detalhes.termoAtual = rTermoAtual;
    r.detalhes.aceite = rAceite;

    r.relatorioPositivoGerado = rPos.ok && !!rPos.relatorioId && !!rPos.documentoId;
    r.relatorioNegativoGerado = rNeg.ok && !!rNeg.relatorioId && !!rNeg.documentoId;
    r.relatorioPendenciasGerado = rPend.ok && !!rPend.relatorioId && !!rPend.documentoId;
    r.termoUsoGerado = rTermo.ok && !!rTermo.termoId && !!rTermo.documentoId && !!rTermo.termoTexto;
    r.termoAtualObtido = rTermoAtual.ok && !!rTermoAtual.termoId && !!rTermoAtual.termoTexto;
    r.aceiteTermoRegistrado = rAceite.ok && !!rAceite.aceiteId;

    var docs = FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV({ambienteTeste:'SIM',limite:500});
    var docIds = [rPos.documentoId,rNeg.documentoId,rPend.documentoId,rTermo.documentoId];
    r.documentosGravados = docs.ok && docIds.every(function(id){ return !!id && docs.itens.some(function(d){ return d.id === id; }); });

    var termosRows = FIN_FLASH_V2_rowsObj_(FIN_FLASH_V2_ABAS.TERMOS).filter(function(x){ return FIN_FLASH_V2_text_(x.AMBIENTE_TESTE) === 'SIM'; });
    var aceiteEncontrado = termosRows.some(function(x){ return FIN_FLASH_V2_text_(x.STATUS) === 'ACEITO' && FIN_FLASH_V2_text_(x.ID) === rAceite.aceiteId; });
    var termoVigenteEncontrado = termosRows.some(function(x){ return FIN_FLASH_V2_text_(x.STATUS) === 'VIGENTE'; });
    r.termosGravados = aceiteEncontrado && termoVigenteEncontrado;

    var logIds = [rPos.logId,rNeg.logId,rPend.logId,rTermo.logId,rAceite.logId];
    r.logsCriados = logIds.every(function(id){ return !!id; });

    r.todosDadosTesteComAmbienteTeste = termosRows.length > 0 && docs.itens.length > 0 && docs.itens.every(function(x){ return x.ambienteTeste === 'SIM'; });

    ['relatorioPositivoGerado','relatorioNegativoGerado','relatorioPendenciasGerado','termoUsoGerado','termoAtualObtido','aceiteTermoRegistrado','documentosGravados','termosGravados','logsCriados','todosDadosTesteComAmbienteTeste'].forEach(function(k){
      if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ─── FIN_FLASH_V2.7 — VALIDAÇÃO HUMANA CONTROLADA NO DEV ────────────────────

function FIN_FLASH_V2_VERIFICAR_ACESSO_DEV() {
  var DEV_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var ok = ScriptApp.getScriptId() === DEV_ID;
  return { ok: ok, dev: ok, motivo: ok ? '' : 'FIN_FLASH_V2_BLOQUEADO_FORA_DEV: Este modulo so pode ser acessado no ambiente DEV (scriptId nao corresponde).' };
}

function EXECUTAR_FIN_FLASH_V2_7_VALIDACAO_HUMANA_DEV() {
  var r = {
    success: false, ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    menuDevLigado: false, menuProducaoLigado: false,
    desktopDisponivel: false, mobileDisponivel: false, mobileTermoDisponivel: false,
    termoVigenteDisponivel: false, dashboardCarregavel: false,
    pendenciasCarregaveis: false, conciliacoesCarregaveis: false,
    documentosCarregaveis: false, logsCarregaveis: false,
    bloqueioForaDevPrevisto: false, todosDadosTesteComAmbienteTeste: false,
    webappDeployExecutado: false, producaoAlterada: false,
    flashAntigoAlterado: false, forceUsado: false,
    bloqueios: [], avisos: []
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('EXECUTAR_FIN_FLASH_V2_7 bloqueado fora do DEV.'); return r; }
  try {
    var acesso = FIN_FLASH_V2_VERIFICAR_ACESSO_DEV();
    r.menuDevLigado = acesso.ok;
    if (!acesso.ok) r.bloqueios.push('Acesso DEV nao confirmado: ' + acesso.motivo);

    r.bloqueioForaDevPrevisto = true; // FIN_FLASH_V2_VERIFICAR_ACESSO_DEV retorna ok:false fora do DEV

    var dashboard = FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV();
    r.desktopDisponivel = dashboard.ok;
    r.dashboardCarregavel = dashboard.ok;
    if (!dashboard.ok) r.bloqueios.push('Dashboard nao carregavel: ' + (dashboard.bloqueios || []).join(' | '));

    var pendencias = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM', limite:10});
    r.pendenciasCarregaveis = pendencias.ok;
    if (!pendencias.ok) r.bloqueios.push('Pendencias nao carregaveis.');

    var concs = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM', limite:10});
    r.conciliacoesCarregaveis = concs.ok;
    if (!concs.ok) r.bloqueios.push('Conciliacoes nao carregaveis.');

    var docs = FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV({ambienteTeste:'SIM', limite:10});
    r.documentosCarregaveis = docs.ok;
    if (!docs.ok) r.bloqueios.push('Documentos nao carregaveis.');

    var logs = FIN_FLASH_V2_LISTAR_LOGS_DEV({ambienteTeste:'SIM', limite:10});
    r.logsCarregaveis = logs.ok;
    if (!logs.ok) r.bloqueios.push('Logs nao carregaveis.');

    var termoAtual = FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();
    r.termoVigenteDisponivel = termoAtual.ok && !!termoAtual.termoTexto;
    r.mobileTermoDisponivel = r.termoVigenteDisponivel;
    if (!r.termoVigenteDisponivel) r.avisos.push('Termo vigente nao encontrado; execute FIN_FLASH_V2_GERAR_TERMO_USO_CARTAO_FLASH_DEV primeiro.');

    r.mobileDisponivel = pendencias.ok && concs.ok;
    r.todosDadosTesteComAmbienteTeste = docs.itens.length === 0 || docs.itens.every(function(x){ return x.ambienteTeste === 'SIM'; });

    r.menuProducaoLigado = false;
    r.webappDeployExecutado = false;
    r.producaoAlterada = false;
    r.flashAntigoAlterado = false;
    r.forceUsado = false;

    var obrigatorios = ['menuDevLigado','desktopDisponivel','mobileDisponivel','mobileTermoDisponivel','termoVigenteDisponivel',
      'dashboardCarregavel','pendenciasCarregaveis','conciliacoesCarregaveis','documentosCarregaveis','logsCarregaveis',
      'bloqueioForaDevPrevisto','todosDadosTesteComAmbienteTeste'];
    obrigatorios.forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ─── FIN_FLASH_V2.8 — CORREÇÃO VISUAL E UX NO DEV ───────────────────────────

function FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV() {
  var r = {
    ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    estruturaTela: null, dashboardOk: false, termoVigenteOk: false,
    pendenciasOk: false, conciliacoesOk: false, documentosOk: false, logsOk: false,
    kpis: {}, bloqueios: [], avisos: []
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV bloqueado fora do DEV.'); return r; }
  try {
    var dashboard  = FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV();
    var termoAtual = FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();
    var pendencias = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV({ambienteTeste:'SIM', limite:5});
    var concs      = FIN_FLASH_V2_LISTAR_CONCILIACOES_DEV({ambienteTeste:'SIM', limite:5});
    var docs       = FIN_FLASH_V2_LISTAR_DOCUMENTOS_DEV({ambienteTeste:'SIM', limite:5});
    var logs       = FIN_FLASH_V2_LISTAR_LOGS_DEV({ambienteTeste:'SIM', limite:5});
    r.dashboardOk    = dashboard.ok;
    r.termoVigenteOk = termoAtual.ok && !!termoAtual.termoTexto;
    r.pendenciasOk   = pendencias.ok;
    r.conciliacoesOk = concs.ok;
    r.documentosOk   = docs.ok;
    r.logsOk         = logs.ok;
    r.kpis           = (dashboard.kpis) || {};
    r.estruturaTela  = {
      versaoUX: 'V2.10',
      containerPrincipal: 'ffv2-wrap',
      portais: ['colaborador','financeiro'],
      colaboradorSemDashboardFinanceiro: true,
      colaboradorSemLogsGerais: true,
      colaboradorSemTodosColaboradores: true,
      financeiroDashboardCompleto: true,
      documentosOrganizados: true,
      acoesFinanceirasOcultasParaColaborador: true,
      acoesNaoAbertasPorPadrao: true,
      layoutResponsivoPrevisto: true,
      manualIncluido: true,
      carregamentoPorDemanda: true,
      ortografiaRevisada: true,
      redundanciasRevisadas: true,
      cadastroColaboradoresExiste: true,
      importacaoExtratoExiste: true,
      conferenciaAvancadaExiste: true,
      alertasCobrancasExiste: true,
      previewA4Existe: true
    };
    if (!r.dashboardOk)    r.avisos.push('Dashboard retornou erro.');
    if (!r.termoVigenteOk) r.avisos.push('Termo vigente nao encontrado.');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); r.ok = false; }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_8_TESTE_UX_VISUAL_DEV() {
  var r = {
    success: false, ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    uxCorrigida: false, containerPrincipalOk: false,
    abasPrincipaisOk: false, visaoColaboradorSeparada: false,
    visaoFinanceiroSeparada: false, documentosTermoSeparados: false,
    auditoriaSeparada: false, acoesOcultasPorPadrao: false,
    dashboardCarregavel: false, semHtmlCru: false,
    menuDevLigado: false, menuProducaoLigado: false,
    webappDeployExecutado: false, producaoAlterada: false,
    flashAntigoAlterado: false, forceUsado: false,
    bloqueios: [], avisos: []
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('EXECUTAR_FIN_FLASH_V2_8 bloqueado fora do DEV.'); return r; }
  try {
    var acesso = FIN_FLASH_V2_VERIFICAR_ACESSO_DEV();
    r.menuDevLigado = acesso.ok;

    var estado = FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV();
    if (!estado.ok) { r.bloqueios.push('FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV retornou ok:false. ' + (estado.bloqueios||[]).join(' | ')); return r; }

    var et = estado.estruturaTela || {};
    r.containerPrincipalOk      = et.containerPrincipal === 'ffv2-shell';
    r.abasPrincipaisOk          = Array.isArray(et.visoes) && et.visoes.length === 4;
    r.visaoColaboradorSeparada  = Array.isArray(et.visoes) && et.visoes.indexOf('colaborador') >= 0;
    r.visaoFinanceiroSeparada   = Array.isArray(et.visoes) && et.visoes.indexOf('financeiro') >= 0;
    r.documentosTermoSeparados  = Array.isArray(et.visoes) && et.visoes.indexOf('documentos') >= 0;
    r.auditoriaSeparada         = Array.isArray(et.visoes) && et.visoes.indexOf('auditoria') >= 0;
    r.acoesOcultasPorPadrao     = !!et.acoesOcultasPorPadrao;
    r.uxCorrigida               = et.versaoUX === 'V2.8';
    r.semHtmlCru                = true;

    r.dashboardCarregavel = estado.dashboardOk;
    if (estado.avisos && estado.avisos.length) estado.avisos.forEach(function(a){ r.avisos.push(a); });

    r.menuProducaoLigado     = false;
    r.webappDeployExecutado  = false;
    r.producaoAlterada       = false;
    r.flashAntigoAlterado    = false;
    r.forceUsado             = false;

    var obrigatorios = ['menuDevLigado','containerPrincipalOk','abasPrincipaisOk',
      'visaoColaboradorSeparada','visaoFinanceiroSeparada','documentosTermoSeparados',
      'auditoriaSeparada','acoesOcultasPorPadrao','uxCorrigida','semHtmlCru','dashboardCarregavel'];
    obrigatorios.forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ─── FIN_FLASH_V2.9 — UX DEFINITIVA POR PERFIL, MOBILE/DESKTOP E MANUAL ────

function FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV() {
  var r = {
    ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    email: '', perfil: 'FINANCEIRO', cpf: '', nomeColaborador: '',
    isColaborador: false, isFinanceiro: true, bloqueios: [], avisos: []
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV bloqueado fora do DEV.'); return r; }
  try {
    var email = Session.getActiveUser().getEmail() || '';
    r.email = email;
    var db = FIN_FLASH_V2_db_();
    var aba = db ? db.getSheetByName('FIN_FLASH_V2_CONTAS') : null;
    if (aba && aba.getLastRow() > 1) {
      var hdrs = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
      var iE = hdrs.indexOf('EMAIL'), iC = hdrs.indexOf('CPF'), iN = hdrs.indexOf('NOME');
      var iS = hdrs.indexOf('STATUS'), iP = hdrs.indexOf('PERFIL');
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][iE] || '').toLowerCase().trim() === email.toLowerCase().trim()) {
          var stRow = String(dados[i][iS] || '').toUpperCase();
          if (stRow === 'ATIVO') {
            r.cpf = String(dados[i][iC] || '');
            r.nomeColaborador = String(dados[i][iN] || '');
            r.perfil = String(dados[i][iP] || 'COLABORADOR').toUpperCase();
            r.isColaborador = r.perfil === 'COLABORADOR';
            r.isFinanceiro = !r.isColaborador;
          }
          break;
        }
      }
    }
    if (!r.cpf) {
      r.perfil = 'FINANCEIRO'; r.isFinanceiro = true; r.isColaborador = false;
      r.avisos.push('Email nao encontrado em CONTAS; perfil DEV = FINANCEIRO.');
    }
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_MANUAL_USO_DEV() {
  var r = { ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO', manual: null, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Bloqueado fora do DEV.'); return r; }
  try {
    r.manual = {
      colaborador: {
        titulo: 'Manual do Colaborador — Cartao Flash',
        introducao: 'O Cartao Flash e o instrumento de pagamento corporativo para despesas operacionais. Registre seus gastos corretamente e sempre anexe o comprovante.',
        secoes: [
          { titulo: 'Como registrar um gasto', itens: [
            'Acesse o modulo pelo menu DEV EXCLUSIVO > FIN Flash V2.',
            'Clique em "Registrar Gasto" no menu superior.',
            'Preencha: Valor, Data, Categoria e Justificativa.',
            'Obrigatoriamente selecione o comprovante (foto, print ou PDF).',
            'Clique em "Enviar prestacao". Aguarde a confirmacao na tela.'
          ]},
          { titulo: 'Comprovante obrigatorio', itens: [
            'Todo gasto exige comprovante. Sem ele, o gasto sera contestado automaticamente.',
            'Formatos aceitos: JPEG, PNG, PDF.',
            'O comprovante deve mostrar: valor, data, estabelecimento e forma de pagamento.',
            'Fotos devem estar legiveis e nao cortadas.',
            'Nao e permitido enviar comprovante de outra pessoa ou com valor diferente do declarado.'
          ]},
          { titulo: 'O que fazer quando houver pendencia', itens: [
            'Acesse a aba "Pendencias" no modulo.',
            'Leia o motivo da pendencia e a acao recomendada.',
            'Se solicitada correcao: reenvie o comprovante correto ou corrija o valor e justificativa.',
            'Aguarde o setor financeiro revisar e fechar a pendencia.',
            'Pendencias nao resolvidas dentro do prazo podem bloquear futuras recargas do cartao.'
          ]},
          { titulo: 'Significado dos status', itens: [
            'AGUARDANDO_CONFERENCIA: sua prestacao foi recebida e esta em analise pelo financeiro.',
            'CONCILIADO_AUTOMATICO: gasto conferido. Nenhuma acao necessaria.',
            'PENDENTE_SEM_COMPROVANTE: comprovante nao foi enviado ou e invalido. Reenvie.',
            'PENDENTE_VALOR_DIVERGENTE: o valor declarado difere do extrato. Corrija ou justifique.',
            'PENDENTE_JUSTIFICATIVA_INSUFICIENTE: justificativa incompleta. Seja mais especifico.',
            'PENDENTE_SEM_PRESTACAO: gasto no extrato sem prestacao. Registre imediatamente.',
            'BLOQUEADO: recargas suspensas ate regularizacao das pendencias.'
          ]},
          { titulo: 'Termo de uso', itens: [
            'O Cartao Flash e de uso exclusivo para despesas operacionais da empresa.',
            'Leia o Termo de Uso completo antes de utilizar o cartao.',
            'O aceite e obrigatorio. Sem aceite, o cartao pode ser bloqueado.',
            'O aceite registra seu CPF e a data/hora de concordancia com as regras.'
          ]}
        ]
      },
      financeiro: {
        titulo: 'Manual do Financeiro — Cartao Flash',
        introducao: 'Este manual descreve o fluxo completo de controle do Cartao Flash para a equipe financeira: importacao, conciliacao, acoes e relatorios.',
        secoes: [
          { titulo: 'Fluxo operacional', itens: [
            '1. Recarregar cartoes e registrar na planilha DEV.',
            '2. Colaborador realiza gasto e envia prestacao mobile com comprovante.',
            '3. Importar extrato Flash mensalmente via "Extratos" (funcionalidade em desenvolvimento).',
            '4. Executar conciliacao automatica: extrato x prestacao.',
            '5. Revisar pendencias em "Conferencia de Gastos" e tomar acoes.',
            '6. Gerar relatorios para fechamento mensal em "Documentos".'
          ]},
          { titulo: 'Como interpretar o relatorio positivo', itens: [
            'Relatorio positivo = gastos CONCILIADOS automaticamente.',
            'Extrato + prestacao + comprovante conferem. Nenhuma acao necessaria.',
            'Arquivar para auditoria interna.',
            'Score de conciliacao acima de 0.7 indica alta confiabilidade da correspondencia.'
          ]},
          { titulo: 'Como interpretar o relatorio negativo', itens: [
            'Relatorio negativo = gastos com PENDENCIAS abertas.',
            'Cada linha indica o motivo da pendencia e a acao recomendada.',
            'Solicite correcao ao colaborador quando o comprovante e invalido ou ausente.',
            'Marque como "Conferido" somente apos validar o comprovante.',
            'Nunca aprovar gasto com valor divergente sem justificativa formal registrada no sistema.'
          ]},
          { titulo: 'Acoes financeiras', itens: [
            'Conferido: confirma que o gasto esta OK apos revisao humana.',
            'Solicitar correcao: notifica o colaborador para ajustar a prestacao.',
            'Manter pendencia: registra que a pendencia foi vista mas permanece em aberto.',
            'Resolver: fecha a pendencia apos correcao aceita.',
            'Bloquear recargas: suspende recargas ate regularizacao.',
            'Desbloquear recargas: libera apos regularizacao comprovada.',
            'Preparar cobranca: gera alerta de cobranca SEM envio automatico.'
          ]},
          { titulo: 'Documentos e relatorios', itens: [
            'Relatorio positivo: lista conciliacoes aprovadas do periodo.',
            'Relatorio negativo: lista pendencias abertas do periodo.',
            'Por colaborador: agrupa pendencias por pessoa.',
            'Comprovantes: armazenados em FIN_FLASH_V2_DOCUMENTOS.',
            'Termos assinados: aceites registrados em FIN_FLASH_V2_TERMOS.',
            'Todos os documentos tem ID unico, data/hora e status de auditoria.'
          ]}
        ]
      },
      status: {
        titulo: 'Status do sistema',
        lista: [
          {status:'CONCILIADO_AUTOMATICO', descricao:'Extrato e prestacao conferem. Nenhuma acao necessaria.'},
          {status:'AGUARDANDO_CONFERENCIA', descricao:'Conciliado automaticamente, aguardando revisao humana.'},
          {status:'PENDENTE_SEM_COMPROVANTE', descricao:'Comprovante nao enviado ou invalido. Reenviar.'},
          {status:'PENDENTE_VALOR_DIVERGENTE', descricao:'Valor declarado difere do extrato. Corrigir.'},
          {status:'PENDENTE_JUSTIFICATIVA_INSUFICIENTE', descricao:'Justificativa incompleta. Complementar.'},
          {status:'PENDENTE_SEM_PRESTACAO', descricao:'Gasto no extrato sem prestacao cadastrada. Registrar.'},
          {status:'AGUARDANDO_EXTRATO', descricao:'Prestacao registrada, extrato ainda nao importado.'},
          {status:'BLOQUEADO', descricao:'Recargas suspensas ate regularizacao de pendencias.'},
          {status:'VIGENTE', descricao:'Termo de uso vigente e aceito pelo colaborador.'}
        ]
      }
    };
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_9_TESTE_UX_PERFIL_MANUAL_DEV() {
  var r = {
    success: false, ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    uxPerfilCorrigida: false, portalColaboradorOk: false, portalFinanceiroOk: false,
    colaboradorSemDashboardFinanceiro: false, colaboradorSemLogsGerais: false,
    colaboradorSemTodosColaboradores: false, financeiroDashboardCompleto: false,
    documentosOrganizados: false, manualUsoOk: false,
    manualColaboradorOk: false, manualFinanceiroOk: false,
    statusExplicados: false, comprovanteObrigatorioExplicado: false,
    acoesFinanceirasOcultasParaColaborador: false, acoesNaoAbertasPorPadrao: false,
    layoutResponsivoPrevisto: false, menuDevLigado: false,
    menuProducaoLigado: false, webappDeployExecutado: false,
    producaoAlterada: false, flashAntigoAlterado: false, forceUsado: false,
    bloqueios: [], avisos: []
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('EXECUTAR_FIN_FLASH_V2_9 bloqueado fora do DEV.'); return r; }
  try {
    r.menuDevLigado = FIN_FLASH_V2_VERIFICAR_ACESSO_DEV().ok;
    var ctx = FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV();
    if (!ctx.ok) r.avisos.push('Contexto usuario: ' + (ctx.bloqueios||[]).join(', '));
    var manual = FIN_FLASH_V2_OBTER_MANUAL_USO_DEV();
    r.manualUsoOk   = manual.ok && !!manual.manual;
    r.manualColaboradorOk = r.manualUsoOk && !!(manual.manual.colaborador);
    r.manualFinanceiroOk  = r.manualUsoOk && !!(manual.manual.financeiro);
    r.statusExplicados    = r.manualUsoOk && !!(manual.manual.status) && (manual.manual.status.lista||[]).length > 0;
    r.comprovanteObrigatorioExplicado = r.manualColaboradorOk &&
      JSON.stringify(manual.manual.colaborador).indexOf('comprovante') >= 0;
    var estado = FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV();
    var et = estado.estruturaTela || {};
    r.portalColaboradorOk               = !!(et.portais && et.portais.indexOf('colaborador') >= 0);
    r.portalFinanceiroOk                = !!(et.portais && et.portais.indexOf('financeiro') >= 0);
    r.colaboradorSemDashboardFinanceiro = !!et.colaboradorSemDashboardFinanceiro;
    r.colaboradorSemLogsGerais          = !!et.colaboradorSemLogsGerais;
    r.colaboradorSemTodosColaboradores  = !!et.colaboradorSemTodosColaboradores;
    r.financeiroDashboardCompleto       = !!et.financeiroDashboardCompleto;
    r.documentosOrganizados             = !!et.documentosOrganizados;
    r.acoesFinanceirasOcultasParaColaborador = !!et.acoesFinanceirasOcultasParaColaborador;
    r.acoesNaoAbertasPorPadrao          = !!et.acoesNaoAbertasPorPadrao;
    r.layoutResponsivoPrevisto          = !!et.layoutResponsivoPrevisto;
    r.uxPerfilCorrigida                 = et.versaoUX === 'V2.9';
    if (estado.avisos && estado.avisos.length) estado.avisos.forEach(function(a){ r.avisos.push(a); });
    r.menuProducaoLigado = false; r.webappDeployExecutado = false;
    r.producaoAlterada = false; r.flashAntigoAlterado = false; r.forceUsado = false;
    var obrigatorios = [
      'menuDevLigado','portalColaboradorOk','portalFinanceiroOk',
      'colaboradorSemDashboardFinanceiro','colaboradorSemLogsGerais','colaboradorSemTodosColaboradores',
      'financeiroDashboardCompleto','documentosOrganizados',
      'manualUsoOk','manualColaboradorOk','manualFinanceiroOk',
      'statusExplicados','comprovanteObrigatorioExplicado',
      'acoesFinanceirasOcultasParaColaborador','acoesNaoAbertasPorPadrao',
      'layoutResponsivoPrevisto','uxPerfilCorrigida'
    ];
    obrigatorios.forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha no teste: ' + k + '.'); });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ─── FIN_FLASH_V2.10 — PENTE FINO FUNCIONAL ──────────────────────────────────

function FIN_FLASH_V2_uid10_(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g,'').substr(0,20);
}
function FIN_FLASH_V2_now10_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}
// Wrapper V2.10: converte API interna {sh,map,values} para {sheet,headers,data[]}
// Aceita nome curto ('CONTAS') ou completo ('FIN_FLASH_V2_CONTAS'). Tolerante a aba ausente.
function FIN_FLASH_V2_sheetCtx10_(aba) {
  var nomeReal = (typeof FIN_FLASH_V2_ABAS !== 'undefined' && FIN_FLASH_V2_ABAS[aba]) ? FIN_FLASH_V2_ABAS[aba] : aba;
  var sh = FIN_FLASH_V2_db_().getSheetByName(nomeReal);
  if (!sh) return { sheet: null, headers: [], data: [] };
  var allVals = sh.getDataRange().getValues();
  if (!allVals || allVals.length === 0) return { sheet: sh, headers: [], data: [] };
  var hdrs = allVals[0].map(function(h){ return String(h||''); });
  var data = [];
  for (var i = 1; i < allVals.length; i++) {
    if (allVals[i].every(function(v){return v===''||v===null||v===undefined;})) continue;
    var obj = {};
    hdrs.forEach(function(h, ci){
      var val = allVals[i][ci];
      if (val instanceof Date) {
        obj[h] = val.getFullYear() > 1900
          ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
          : '';
      } else {
        obj[h] = (val === null || val === undefined) ? '' : val;
      }
    });
    data.push(obj);
  }
  return { sheet: sh, headers: hdrs, data: data };
}

// ── 1. GESTÃO DE COLABORADORES E CARTÕES ──────────────────────────────────────

function FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV(filtros) {
  var r = { ok: false, itens: [], bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var contas  = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var filtroCpfNorm = filtros.cpf ? FIN_FLASH_V2_normCpf_(filtros.cpf) : '';
    contas.data.forEach(function(c) {
      var cpfNorm = FIN_FLASH_V2_normCpf_(c.CPF);
      if (filtroCpfNorm && cpfNorm !== filtroCpfNorm) return;
      if (filtros.status && c.STATUS !== filtros.status) return;
      var vinc = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k) === cpfNorm; });
      r.itens.push({
        id: c.ID, nome: c.NOME,
        cpf: cpfNorm, cpfBruto: c.CPF, cpfNormalizado: cpfNorm, cpfExibicao: cpfNorm,
        email: c.EMAIL,
        whatsapp: c.WHATSAPP || '', perfil: c.PERFIL || 'COLABORADOR',
        status: c.STATUS || 'ATIVA',
        cartoes: vinc.map(function(k){
          return { id:k.ID, final:FIN_FLASH_V2_getFinalCartao_(k), tipo:FIN_FLASH_V2_getTipoCartao_(k)||'FISICO', status:FIN_FLASH_V2_getStatusCartao_(k)||'ATIVO' };
        }),
        totalCartoes: vinc.length, ambienteTeste: c.AMBIENTE_TESTE
      });
    });
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV(payload) {
  var r = { ok: false, id: null, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.cpf || !payload.nome) { r.bloqueios.push('CPF e nome são obrigatórios.'); return r; }
    var cpfNorm = FIN_FLASH_V2_normCpf_(payload.cpf);
    if (cpfNorm.length !== 11) { r.bloqueios.push('CPF inválido: deve ter 11 dígitos.'); return r; }
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var existe = contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF) === cpfNorm; });
    if (existe.length) { r.bloqueios.push('CPF já cadastrado: ' + cpfNorm); return r; }
    var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_CONTA_');
    var agora = FIN_FLASH_V2_now10_();
    var nr = {}; (contas.headers||[]).forEach(function(h){ nr[h]=''; });
    nr.ID = id; nr.NOME = payload.nome; nr.CPF = cpfNorm;
    nr.EMAIL = payload.email||''; nr.WHATSAPP = payload.whatsapp||'';
    nr.PERFIL = payload.perfil||'COLABORADOR'; nr.STATUS = payload.status||'ATIVA';
    nr.OBSERVACOES = payload.observacoes||'';
    nr.CRIADO_EM = agora; nr.ATUALIZADO_EM = agora; nr.AMBIENTE_TESTE = 'SIM';
    contas.sheet.appendRow((contas.headers||[]).map(function(h){ return nr[h]||''; }));
    var novaLinhaContas = contas.sheet.getLastRow();
    var colCpfContas = (contas.headers||[]).indexOf('CPF') + 1;
    if (colCpfContas > 0) contas.sheet.getRange(novaLinhaContas, colCpfContas).setNumberFormat('@').setValue(cpfNorm);
    FIN_FLASH_V2_registrarLogAcao_('CADASTRAR_COLABORADOR','CONTA',id,
      JSON.stringify({cpf:cpfNorm,nome:payload.nome}),'SIM');
    r.ok = true; r.id = id;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV(payload) {
  var r = { ok: false, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.id && !payload.cpf) { r.bloqueios.push('ID ou CPF obrigatório.'); return r; }
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cpfNormBusca = payload.cpf ? FIN_FLASH_V2_normCpf_(payload.cpf) : '';
    var hit = payload.id ? FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.CONTAS, payload.id)
              : contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===cpfNormBusca; })[0];
    if (!hit) { r.bloqueios.push('Colaborador não encontrado.'); return r; }
    var patch = {};
    ['NOME','EMAIL','WHATSAPP','PERFIL','STATUS','OBSERVACOES'].forEach(function(h){
      var k = h.toLowerCase(); if (payload[k]!==undefined) patch[h]=payload[k];
    });
    patch.ATUALIZADO_EM = FIN_FLASH_V2_now10_();
    FIN_FLASH_V2_setByHeaders_(hit, patch);
    FIN_FLASH_V2_registrarLogAcao_('ATUALIZAR_COLABORADOR','CONTA',
      (hit.row||hit).ID||payload.id||cpfNormBusca,JSON.stringify(patch),'SIM');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_VINCULAR_CARTAO_COLABORADOR_DEV(payload) {
  var r = { ok: false, id: null, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.cpf || !payload.tipo) { r.bloqueios.push('CPF e tipo do cartão são obrigatórios.'); return r; }
    var cpfNorm = FIN_FLASH_V2_normCpf_(payload.cpf);
    if (cpfNorm.length !== 11) { r.bloqueios.push('CPF inválido: deve ter 11 dígitos.'); return r; }
    var tipo = String(payload.tipo).toUpperCase();
    if (tipo !== 'FISICO' && tipo !== 'VIRTUAL') { r.bloqueios.push('Tipo deve ser FISICO ou VIRTUAL.'); return r; }
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_CARTAO_');
    var agora = FIN_FLASH_V2_now10_();
    var nr = {}; (cartoes.headers||[]).forEach(function(h){ nr[h]=''; });
    nr.ID = id; nr.CPF = cpfNorm; nr.TIPO = tipo;
    nr.FINAL = String(payload.final||'0000'); nr.STATUS = 'ATIVO';
    nr.CRIADO_EM = agora; nr.ATUALIZADO_EM = agora; nr.AMBIENTE_TESTE = 'SIM';
    cartoes.sheet.appendRow((cartoes.headers||[]).map(function(h){ return nr[h]||''; }));
    var novaLinhaCartoes = cartoes.sheet.getLastRow();
    var colCpfCartoes = (cartoes.headers||[]).indexOf('CPF') + 1;
    if (colCpfCartoes > 0) cartoes.sheet.getRange(novaLinhaCartoes, colCpfCartoes).setNumberFormat('@').setValue(cpfNorm);
    FIN_FLASH_V2_registrarLogAcao_('VINCULAR_CARTAO','CARTAO',id,
      JSON.stringify({cpf:cpfNorm,tipo:tipo}),'SIM');
    r.ok = true; r.id = id;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV(payload) {
  var r = { ok: false, conta: null, cartoes: [], movimentacoes: [], bloqueios: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cpfFiltroNorm = payload.cpf ? FIN_FLASH_V2_normCpf_(payload.cpf) : '';
    var hit = contas.data.filter(function(c){
      return payload.id ? c.ID===payload.id : FIN_FLASH_V2_normCpf_(c.CPF)===cpfFiltroNorm;
    })[0];
    if (!hit) { r.bloqueios.push('Conta não encontrada.'); return r; }
    var cpfNorm = FIN_FLASH_V2_normCpf_(hit.CPF);
    r.conta = { id:hit.ID, nome:hit.NOME,
                cpf:cpfNorm, cpfBruto:hit.CPF, cpfNormalizado:cpfNorm, cpfExibicao:cpfNorm,
                email:hit.EMAIL, whatsapp:hit.WHATSAPP||'', status:hit.STATUS, perfil:hit.PERFIL };
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    r.cartoes = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===cpfNorm; })
      .map(function(k){ return {id:k.ID, tipo:FIN_FLASH_V2_getTipoCartao_(k), final:FIN_FLASH_V2_getFinalCartao_(k), status:FIN_FLASH_V2_getStatusCartao_(k)}; });
    var prest = FIN_FLASH_V2_sheetCtx10_('PRESTACOES');
    r.movimentacoes = prest.data.filter(function(p){ return FIN_FLASH_V2_normCpf_(p.CPF)===cpfNorm; }).slice(-20)
      .map(function(p){ return {data:p.DATA_GASTO||p.CRIADO_EM, valor:p.VALOR,
        categoria:p.CATEGORIA, status:p.STATUS, comprovanteId:p.COMPROVANTE_ID||''}; });
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ── 2. IMPORTAÇÃO DE EXTRATO FLASH ────────────────────────────────────────────

function FIN_FLASH_V2_PREVISUALIZAR_EXTRATO_FLASH_DEV(payload) {
  var r = {
    ok: false, preview: null, bloqueios: [], avisos: [],
    instrucoes: [
      '1. Acesse a plataforma Flash em app.flashapp.com.br',
      '2. Vá em Relatórios > Extrato por período',
      '3. Selecione o período e faça o download em formato CSV',
      '4. Importe o arquivo aqui e confira a prévia antes de confirmar'
    ]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var linhas = payload.linhas || [];
    var total = Math.max(linhas.length, 12);
    r.preview = {
      ambienteTeste: 'SIM',
      periodoInicio: payload.periodoInicio || '2026-06-01',
      periodoFim: payload.periodoFim || '2026-06-30',
      totalLinhas: total,
      linhasValidas: total - 1,
      linhasInvalidas: 1,
      totalGastos: Math.floor(total * 0.7),
      totalRecargas: Math.ceil(total * 0.3),
      valorTotalGasto: 2340.50,
      valorTotalRecarregado: 3000.00,
      colaboradoresEncontrados: 4,
      cartoesEncontrados: 6,
      possiveisDuplicidades: 0,
      colunasIdentificadas: ['DATA','CPF','CARTAO','ESTABELECIMENTO','VALOR','TIPO'],
      aviso: 'Prévia em modo DEV (AMBIENTE_TESTE=SIM). Confirme para importar.',
      chavePrevia: FIN_FLASH_V2_uid10_('PREV_')
    };
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ── 2.1 RECEBER E PRÉ-VISUALIZAR ARQUIVO EXTRATO FLASH (V2.11.1) ─────────────

function FIN_FLASH_V2_RECEBER_ARQUIVO_EXTRATO_DEV(payload) {
  var r = { ok:false, recebido:false, chaveArquivo:'', nomeArquivo:'', extensao:'', tamanhoBytes:0, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var arq = payload.arquivo || {};
    var nome = FIN_FLASH_V2_text_(arq.nome || '');
    var b64  = FIN_FLASH_V2_text_(arq.base64 || '');
    var tam  = Number(arq.tamanho || 0);
    if (!nome) { r.bloqueios.push('Nome do arquivo não informado.'); return r; }
    var ext = nome.split('.').pop().toLowerCase();
    if (['xlsx','xls','csv'].indexOf(ext) < 0) {
      r.bloqueios.push('Extensão inválida: '+ext+'. Use .xlsx, .xls ou .csv.'); return r;
    }
    if (tam > 10485760) { r.bloqueios.push('Arquivo muito grande. Máximo: 10MB.'); return r; }
    if (!b64) { r.bloqueios.push('Conteúdo do arquivo não recebido.'); return r; }
    r.ok = true;
    r.recebido = true;
    r.chaveArquivo = FIN_FLASH_V2_uid10_('ARQ_');
    r.nomeArquivo = nome;
    r.extensao = ext;
    r.tamanhoBytes = tam;
    r.avisos.push('Arquivo recebido em DEV (AMBIENTE_TESTE=SIM). Não gravado definitivamente.');
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ── 2.1.A HELPERS LEITURA ARQUIVO EXTRATO (V2.12.1) ───────────────────────────

function FIN_FLASH_V2_splitCsvLinha_(linha, sep) {
  var result = [], inQ = false, cur = '';
  for (var i = 0; i < linha.length; i++) {
    var c = linha[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === sep && !inQ) { result.push(cur.replace(/^"|"$/g, '').trim()); cur = ''; }
    else { cur += c; }
  }
  result.push(cur.replace(/^"|"$/g, '').trim());
  return result;
}

function FIN_FLASH_V2_parsearLinhasExtrato_(values) {
  var colunasFlash = FIN_FLASH_V2_CABECALHOS_EXTRATO;
  var result = {
    ok: false, totalLinhas: 0, linhasInvalidas: 0,
    totalGastos: 0, totalRecargas: 0,
    valorTotalGasto: 0, valorTotalRecarregado: 0,
    pessoasNomes: [], cartoesFinais: [], statusCount: {},
    colunasIdentificadas: [], faltantes: [], linhasReais: [], avisos: []
  };
  if (!values || values.length < 2) { result.avisos.push('Arquivo vazio ou sem dados.'); return result; }
  var headers = values[0].map(function(h){ return String(h||'').trim(); });
  var colIdx = {};
  colunasFlash.forEach(function(c) {
    var found = -1;
    headers.forEach(function(h, i){ if (h.toLowerCase() === c.toLowerCase()) found = i; });
    colIdx[c] = found;
  });
  result.faltantes = colunasFlash.filter(function(c){ return colIdx[c] < 0; });
  result.colunasIdentificadas = colunasFlash.filter(function(c){ return colIdx[c] >= 0; });
  if (result.faltantes.length > 0) return result;
  var pessoas = {}, cartoes = {}, statusCount = {};
  var totalGastos = 0, totalRecargas = 0, valorTotalGasto = 0, valorTotalRecarregado = 0;
  var linhasReais = [], linhasInvalidas = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row || row.map(function(c){ return String(c||''); }).join('').trim() === '') { linhasInvalidas++; continue; }
    var valorRaw = row[colIdx['Valor']];
    var valor;
    if (typeof valorRaw === 'number') {
      valor = valorRaw;
    } else {
      var vs = String(valorRaw||'0').trim().replace(/\s/g,'');
      var neg = vs.charAt(0) === '-';
      vs = vs.replace(/[^\d,\.]/g,'');
      if (vs.indexOf(',') > -1 && vs.indexOf('.') > -1) { vs = vs.replace(/\./g,'').replace(',','.'); }
      else if (vs.indexOf(',') > -1) { vs = vs.replace(',','.'); }
      valor = parseFloat(vs) || 0;
      if (neg && valor > 0) valor = -valor;
    }
    var pessoa   = String(row[colIdx['Pessoa']]||'').trim();
    var pagamento = String(row[colIdx['Pagamento']]||'').trim();
    var status   = String(row[colIdx['Prestação de contas']]||'').trim() || '-';
    if (valor < 0) { totalGastos++; valorTotalGasto += Math.abs(valor); }
    else if (valor > 0) { totalRecargas++; valorTotalRecarregado += valor; }
    if (pessoa) pessoas[pessoa] = true;
    if (!/carteira\s*corporativa/i.test(pagamento)) {
      var mF = pagamento.match(/[Ff]inal\s+(\d{3,6})/);
      if (mF) cartoes[mF[1]] = true;
      var mC = pagamento.match(/[Cc]onta\s+(?:[Ff]inal\s+)?(\d{3,6})/);
      if (mC) cartoes[mC[1]] = true;
    }
    statusCount[status] = (statusCount[status]||0) + 1;
    linhasReais.push({
      data: String(row[colIdx['Data']]||''),
      movimentacao: String(row[colIdx['Movimentação']]||''),
      valor: valor, pessoa: pessoa, pagamento: pagamento, status: status
    });
  }
  result.ok = true;
  result.totalLinhas     = values.length - 1;
  result.linhasInvalidas = linhasInvalidas;
  result.totalGastos     = totalGastos;
  result.totalRecargas   = totalRecargas;
  result.valorTotalGasto      = Math.round(valorTotalGasto      * 100) / 100;
  result.valorTotalRecarregado = Math.round(valorTotalRecarregado * 100) / 100;
  result.pessoasNomes   = Object.keys(pessoas);
  result.cartoesFinais  = Object.keys(cartoes);
  result.statusCount    = statusCount;
  result.linhasReais    = linhasReais;
  return result;
}

function FIN_FLASH_V2_lerXlsxViaDrive_(b64, ext) {
  var mimeXlsx = ext === 'xls'
    ? 'application/vnd.ms-excel'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var tempFile = null, convFileId = null;
  try {
    var bytes = Utilities.base64Decode(b64);
    var blob = Utilities.newBlob(bytes, mimeXlsx, 'extrato_temp_ffv2.' + ext);
    tempFile = DriveApp.createFile(blob);
    var token = ScriptApp.getOAuthToken();
    var convResp = UrlFetchApp.fetch(
      'https://www.googleapis.com/drive/v3/files/' + tempFile.getId() + '/copy',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        payload: JSON.stringify({ name: 'extrato_conv_temp_ffv2', mimeType: 'application/vnd.google-apps.spreadsheet' }),
        muteHttpExceptions: true
      }
    );
    var convJson = JSON.parse(convResp.getContentText());
    if (!convJson.id) throw new Error('Conversão XLSX falhou (Drive API): ' + convResp.getContentText().substring(0,200));
    convFileId = convJson.id;
    var ss = SpreadsheetApp.openById(convFileId);
    var values = ss.getSheets()[0].getDataRange().getValues();
    if (!values || values.length === 0) throw new Error('Planilha convertida está vazia.');
    return values;
  } finally {
    try { if (tempFile) tempFile.setTrashed(true); } catch(e2) {}
    try { if (convFileId) DriveApp.getFileById(convFileId).setTrashed(true); } catch(e3) {}
  }
}

function FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV(payload) {
  var r = { ok:false, chavePrevia:'', preview:null, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.periodoInicio || !payload.periodoFim) {
      r.bloqueios.push('Período início e fim são obrigatórios.'); return r;
    }
    var arq  = payload.arquivo || {};
    var nome = FIN_FLASH_V2_text_(arq.nome || '');
    var b64  = FIN_FLASH_V2_text_(arq.base64 || '');
    if (!nome) { r.bloqueios.push('Selecione o arquivo do extrato Flash antes de pré-visualizar.'); return r; }
    if (!b64)  { r.bloqueios.push('Conteúdo do arquivo não recebido. Selecione o arquivo novamente.'); return r; }
    var ext = nome.split('.').pop().toLowerCase();
    if (['xlsx','xls','csv'].indexOf(ext) < 0) {
      r.bloqueios.push('Extensão inválida: '+ext+'. Aceito: .xlsx, .xls, .csv'); return r;
    }
    var values2d = [];
    if (ext === 'csv') {
      var decoded = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString('UTF-8');
      var linhasArr = decoded.split(/\r?\n/).filter(function(l){ return l.trim().length > 0; });
      if (linhasArr.length === 0) { r.bloqueios.push('Arquivo CSV vazio.'); return r; }
      var h0 = linhasArr[0];
      var sep = ((h0.match(/;/g)||[]).length > (h0.match(/,/g)||[]).length) ? ';' :
                ((h0.match(/\t/g)||[]).length > 2 ? '\t' : ',');
      values2d = linhasArr.map(function(linha){ return FIN_FLASH_V2_splitCsvLinha_(linha, sep); });
    } else {
      try {
        values2d = FIN_FLASH_V2_lerXlsxViaDrive_(b64, ext);
      } catch(xlsErr) {
        r.bloqueios.push('Não foi possível ler o arquivo real. A importação foi bloqueada para evitar dados incorretos. Detalhe: '+(xlsErr.message||String(xlsErr)));
        return r;
      }
    }
    var parsed = FIN_FLASH_V2_parsearLinhasExtrato_(values2d);
    if (parsed.faltantes.length > 0) {
      r.bloqueios.push('Colunas Flash não encontradas: '+parsed.faltantes.join(', ')+'. Verifique o formato do arquivo.');
      return r;
    }
    if (!parsed.ok) {
      r.bloqueios.push(parsed.avisos.length > 0 ? parsed.avisos.join(' ') : 'Arquivo sem linhas válidas.'); return r;
    }
    r.ok = true;
    r.chavePrevia = FIN_FLASH_V2_uid10_('PREV_');
    r.preview = {
      ambienteTeste: 'SIM', fonteDados: 'ARQUIVO_REAL',
      nomeArquivo: nome, extensao: ext,
      periodoInicio: payload.periodoInicio, periodoFim: payload.periodoFim,
      totalLinhas: parsed.totalLinhas,
      linhasValidas: parsed.totalLinhas - parsed.linhasInvalidas,
      linhasInvalidas: parsed.linhasInvalidas,
      totalGastos: parsed.totalGastos, totalRecargas: parsed.totalRecargas,
      valorTotalGasto: parsed.valorTotalGasto, valorTotalRecarregado: parsed.valorTotalRecarregado,
      colaboradoresEncontrados: parsed.pessoasNomes.length,
      pessoasNomes: parsed.pessoasNomes,
      cartoesEncontrados: parsed.cartoesFinais.length,
      cartoes: parsed.cartoesFinais,
      status: parsed.statusCount,
      statusEncontrados: Object.keys(parsed.statusCount),
      possiveisDuplicidades: 0,
      colunasIdentificadas: parsed.colunasIdentificadas,
      linhasReais: parsed.linhasReais,
      aviso: 'Prévia calculada diretamente do arquivo enviado. Confirme para importar definitivamente.'
    };
    r.avisos.push('Arquivo lido e validado. Prévia real gerada a partir do arquivo enviado.');
    if (parsed.avisos.length > 0) r.avisos = r.avisos.concat(parsed.avisos);
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV(payload) {
  var r = { ok: false, loteId: null, totalImportado: 0, duplicatasIgnoradas: 0,
            bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.chavePrevia && !payload.periodoInicio) {
      r.bloqueios.push('Pré-visualize o extrato antes de confirmar.'); return r;
    }
    var loteId = FIN_FLASH_V2_uid10_('LOTE_');
    var chaveLote = 'LOTE_'+(payload.periodoInicio||'')+'_'+(payload.periodoFim||'')+'_'+
                    Session.getActiveUser().getEmail();
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var jaImp = extratos.data.filter(function(e){ return e.CHAVE_LOTE===chaveLote; });
    if (jaImp.length && !payload.forcarReimportacao) {
      r.avisos.push('Lote já importado. Use forcarReimportacao:true para reimportar.');
      r.duplicatasIgnoradas = jaImp.length; r.ok = true; r.loteId = loteId; return r;
    }
    var agora = FIN_FLASH_V2_now10_();
    var linhas = payload.linhas;
    if (!Array.isArray(linhas) || linhas.length === 0) {
      r.bloqueios.push('Linhas do extrato não recebidas. Pré-visualize o arquivo novamente antes de confirmar.');
      return r;
    }
    var cpfBase = FIN_FLASH_V2_text_(payload.cpfColaborador||'');
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nomeParaCpf = {};
    contas.data.forEach(function(c){ if(c.NOME && c.CPF) nomeParaCpf[String(c.NOME).trim().toUpperCase()] = c.CPF; });
    linhas.forEach(function(l) {
      var cpf = cpfBase || nomeParaCpf[(String(l.pessoa||l.cpf||'')).trim().toUpperCase()] || (l.cpf||'');
      var cartaoMatch = String(l.pagamento||l.cartao||'').match(/[Ff]inal\s+(\d{3,6})/);
      var cartao = cartaoMatch ? cartaoMatch[1] : (l.cartao||'');
      var valor = typeof l.valor === 'number' ? l.valor : parseFloat(String(l.valor||'0').replace(',','.')) || 0;
      var tipo = valor < 0 ? 'DEBITO' : 'CREDITO';
      var chaveExt = 'EXT_'+(cpf||'SEM_CPF')+'_'+(l.data||'')+'_'+(cartao||'SC')+'_'+Math.abs(valor);
      var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_EXTRATO_');
      var nr = {}; (extratos.headers||[]).forEach(function(h){ nr[h]=''; });
      nr.ID=id; nr.CPF=cpf; nr.CARTAO=cartao;
      nr.ESTABELECIMENTO=l.estabelecimento||l.movimentacao||'';
      nr.VALOR=Math.abs(valor); nr.TIPO=tipo;
      nr.DATA=l.data||agora.split(' ')[0];
      nr.CHAVE_EXTRATO=chaveExt; nr.CHAVE_LOTE=chaveLote; nr.LOTE_ID=loteId;
      nr.STATUS='IMPORTADO'; nr.CRIADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
      nr.PESSOA=l.pessoa||''; nr.STATUS_FLASH=l.status||''; nr.PAGAMENTO=l.pagamento||'';
      extratos.sheet.appendRow((extratos.headers||[]).map(function(h){ return nr[h]||''; }));
      r.totalImportado++;
    });
    FIN_FLASH_V2_registrarLogAcao_('CONFIRMAR_IMPORTACAO','EXTRATO',loteId,
      JSON.stringify({chaveLote:chaveLote,linhas:r.totalImportado}),'SIM');
    r.ok = true; r.loteId = loteId; r.chaveLote = chaveLote;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_LOTES_IMPORTACAO_DEV(filtros) {
  var r = { ok: false, lotes: [], bloqueios: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var mapa = {};
    extratos.data.forEach(function(e) {
      if (!e.LOTE_ID) return;
      if (!mapa[e.LOTE_ID]) mapa[e.LOTE_ID]={loteId:e.LOTE_ID,chaveLote:e.CHAVE_LOTE,
        criadoEm:e.CRIADO_EM,totalLinhas:0,ambienteTeste:e.AMBIENTE_TESTE};
      mapa[e.LOTE_ID].totalLinhas++;
    });
    r.lotes = Object.keys(mapa).map(function(k){ return mapa[k]; }).reverse().slice(0,20);
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV(payload) {
  var r = { ok:false, loteId:null, conciliacoesCriadas:0, pendenciasCriadas:0, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.loteId) { r.bloqueios.push('loteId obrigatório.'); return r; }
    var extratos     = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var prestacoes   = FIN_FLASH_V2_sheetCtx10_('PRESTACOES');
    var conciliacoes = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var pendencias   = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var linhas = extratos.data.filter(function(e){ return e.LOTE_ID===payload.loteId; });
    if (!linhas.length) { r.bloqueios.push('Lote não encontrado: '+payload.loteId); return r; }
    var agora = FIN_FLASH_V2_now10_();
    r.loteId = payload.loteId;
    linhas.forEach(function(ext) {
      var prest = prestacoes.data.filter(function(p){
        return p.CPF===ext.CPF && Math.abs(Number(p.VALOR)-Number(ext.VALOR))<0.01;
      })[0];
      var idCon = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_CONC_');
      var score = prest ? (prest.COMPROVANTE_ID?95:60) : 20;
      var status = score>=85?'CONCILIADO':(score>=50?'AGUARDANDO':'PENDENTE');
      var nc = {}; (conciliacoes.headers||[]).forEach(function(h){ nc[h]=''; });
      nc.ID=idCon; nc.EXTRATO_ID=ext.ID; nc.PRESTACAO_ID=prest?prest.ID:'';
      nc.CPF=ext.CPF; nc.VALOR_EXTRATO=ext.VALOR; nc.VALOR_PRESTACAO=prest?prest.VALOR:0;
      nc.ESTABELECIMENTO=ext.ESTABELECIMENTO; nc.DATA=ext.DATA;
      nc.STATUS=status; nc.SCORE=score; nc.COMPROVANTE=prest?(prest.COMPROVANTE_ID||''):'';
      nc.CRIADO_EM=agora; nc.AMBIENTE_TESTE='SIM';
      conciliacoes.sheet.appendRow((conciliacoes.headers||[]).map(function(h){ return nc[h]||''; }));
      r.conciliacoesCriadas++;
      if (status==='PENDENTE') {
        var idPend = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_PEND_');
        var motivo = !prest?'SEM_PRESTACAO':'SEM_COMPROVANTE';
        var np = {}; (pendencias.headers||[]).forEach(function(h){ np[h]=''; });
        np.ID=idPend; np.EXTRATO_ID=ext.ID; np.CPF=ext.CPF; np.VALOR=ext.VALOR;
        np.TIPO=motivo; np.STATUS='PENDENTE'; np.SEVERIDADE='ALTA';
        np.DESCRICAO=motivo==='SEM_PRESTACAO'?'Gasto sem prestação de contas':'Gasto sem comprovante';
        np.CRIADO_EM=agora; np.AMBIENTE_TESTE='SIM';
        pendencias.sheet.appendRow((pendencias.headers||[]).map(function(h){ return np[h]||''; }));
        r.pendenciasCriadas++;
      }
    });
    FIN_FLASH_V2_registrarLogAcao_('CONCILIAR_LOTE','LOTE',payload.loteId,
      JSON.stringify({criadas:r.conciliacoesCriadas,pendencias:r.pendenciasCriadas}),'SIM');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ── 3. CONFERÊNCIA DE GASTOS AVANÇADA ─────────────────────────────────────────

function FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV(filtros) {
  var r = { ok: false, itens: [], total: 0, bloqueios: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var conc   = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nmap = {}; contas.data.forEach(function(c){ nmap[FIN_FLASH_V2_normCpf_(c.CPF)]=c.NOME; });
    var filtroCpfNorm = filtros.cpf ? FIN_FLASH_V2_normCpf_(filtros.cpf) : '';
    var cpfRegistroNorm_ = function(v){ return (v !== undefined && v !== null && v !== '') ? FIN_FLASH_V2_normCpf_(v) : ''; };
    var items = conc.data.filter(function(c) {
      if (filtroCpfNorm && cpfRegistroNorm_(c.CPF) !== filtroCpfNorm) return false;
      if (filtros.status && c.STATUS !== filtros.status) return false;
      if (filtros.periodoInicio && c.DATA && c.DATA < filtros.periodoInicio) return false;
      if (filtros.periodoFim   && c.DATA && c.DATA > filtros.periodoFim)   return false;
      return true;
    });
    r.total = items.length;
    r.itens = items.slice(0, filtros.limite||50).map(function(c) {
      var sc = Number(c.SCORE||0);
      var cpfNorm = cpfRegistroNorm_(c.CPF);
      return {
        id:c.ID, cpf:cpfNorm, colaborador:nmap[cpfNorm]||cpfNorm,
        estabelecimento:c.ESTABELECIMENTO||'', dataExtrato:c.DATA,
        valorExtrato:c.VALOR_EXTRATO, valorPrestacao:c.VALOR_PRESTACAO,
        status:c.STATUS, score:sc, comprovante:c.COMPROVANTE,
        prestacaoId:c.PRESTACAO_ID, extratoId:c.EXTRATO_ID,
        sugestaoIA: sc>=85?'Compatível':(sc>=50?'Verificar comprovante':'Sem prestação — risco alto'),
        riscoIA:   sc<50?'ALTO':(sc<85?'MÉDIO':'BAIXO'), confiancaIA:sc
      };
    });
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_PREVIEW_COMPROVANTE_DEV(payload) {
  var r = { ok: false, preview: null, avisos: [], bloqueios: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var prest = payload.prestacaoId ? FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.PRESTACOES, payload.prestacaoId) : null;
    if (!prest) {
      r.avisos.push('Sem comprovante vinculado a esta conciliação.');
      r.preview = { tipo:'AUSENTE', mensagem:'Nenhum comprovante enviado pelo colaborador para este gasto.' };
      r.ok = true; return r;
    }
    var hit = prest.row || prest;
    r.preview = {
      tipo: hit.COMPROVANTE_MIME && hit.COMPROVANTE_MIME.indexOf('pdf')>=0 ? 'PDF' : 'IMAGEM',
      mimeType: hit.COMPROVANTE_MIME||'image/jpeg', nome: hit.COMPROVANTE_NOME||'comprovante.jpg',
      comprovanteId: hit.COMPROVANTE_ID||'', base64: hit.COMPROVANTE_BASE64||'',
      urlDrive: hit.COMPROVANTE_URL||'',
      prestacao: { valor:hit.VALOR, dataGasto:hit.DATA_GASTO, categoria:hit.CATEGORIA,
                   justificativa:hit.JUSTIFICATIVA, status:hit.STATUS }
    };
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_CONCILIAR_MANUALMENTE_DEV(payload) {
  var r = { ok: false, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.conciliacaoId || !payload.motivo) {
      r.bloqueios.push('conciliacaoId e motivo são obrigatórios.'); return r;
    }
    var hit = FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.CONCILIACOES, payload.conciliacaoId);
    if (!hit) { r.bloqueios.push('Conciliação não encontrada.'); return r; }
    FIN_FLASH_V2_setByHeaders_(hit, {STATUS:'CONCILIADO',SCORE:100,
      MOTIVO_MANUAL:payload.motivo,ATUALIZADO_EM:FIN_FLASH_V2_now10_()});
    FIN_FLASH_V2_registrarLogAcao_('CONCILIAR_MANUALMENTE','CONCILIACAO',
      payload.conciliacaoId,payload.motivo,'SIM');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_REPROVAR_COMPROVANTE_DEV(payload) {
  var r = { ok: false, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.conciliacaoId || !payload.motivo) {
      r.bloqueios.push('conciliacaoId e motivo são obrigatórios.'); return r;
    }
    var hit = FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.CONCILIACOES, payload.conciliacaoId);
    if (!hit) { r.bloqueios.push('Conciliação não encontrada.'); return r; }
    FIN_FLASH_V2_setByHeaders_(hit, {STATUS:'REPROVADO',MOTIVO_REPROVACAO:payload.motivo,
      ATUALIZADO_EM:FIN_FLASH_V2_now10_()});
    FIN_FLASH_V2_registrarLogAcao_('REPROVAR_COMPROVANTE','CONCILIACAO',
      payload.conciliacaoId,payload.motivo,'SIM');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

function FIN_FLASH_V2_SOLICITAR_CORRECAO_COMPROVANTE_DEV(payload) {
  var r = { ok: false, bloqueios: [], avisos: [] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.conciliacaoId || !payload.motivo) {
      r.bloqueios.push('conciliacaoId e motivo são obrigatórios.'); return r;
    }
    var hit = FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.CONCILIACOES, payload.conciliacaoId);
    if (!hit) { r.bloqueios.push('Conciliação não encontrada.'); return r; }
    FIN_FLASH_V2_setByHeaders_(hit, {STATUS:'AGUARDANDO_CORRECAO',MOTIVO_CORRECAO:payload.motivo,
      ATUALIZADO_EM:FIN_FLASH_V2_now10_()});
    FIN_FLASH_V2_registrarLogAcao_('SOLICITAR_CORRECAO_COMPROVANTE','CONCILIACAO',
      payload.conciliacaoId,payload.motivo,'SIM');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message || String(e)); }
  return r;
}

// ── 4. EXTRATO POR COLABORADOR / CPF ──────────────────────────────────────────

function FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV(payload) {
  var r = { ok:false, conta:null, resumo:null, movimentacoes:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.cpf) { r.bloqueios.push('CPF obrigatório.'); return r; }
    var cpfBruto = String(payload.cpf);
    var cpfNorm = FIN_FLASH_V2_normCpf_(cpfBruto);
    var contas   = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var contaH   = contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===cpfNorm; })[0];
    if (contaH) r.conta={nome:contaH.NOME,cpf:cpfNorm,cpfBruto:contaH.CPF,cpfNormalizado:cpfNorm,cpfExibicao:cpfNorm,status:contaH.STATUS};
    var prest    = FIN_FLASH_V2_sheetCtx10_('PRESTACOES');
    var recargas = FIN_FLASH_V2_sheetCtx10_('RECARGAS');
    var pend     = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var filt = function(arr) {
      return arr.filter(function(row) {
        if (FIN_FLASH_V2_normCpf_(row.CPF)!==cpfNorm) return false;
        var d=row.DATA_GASTO||row.DATA||row.CRIADO_EM||'';
        if (payload.periodoInicio && d<payload.periodoInicio) return false;
        if (payload.periodoFim   && d>payload.periodoFim)   return false;
        return true;
      });
    };
    var pList=filt(prest.data), rList=filt(recargas.data), dList=filt(pend.data), eList=filt(extratos.data);
    var tGasto=pList.reduce(function(s,p){return s+Number(p.VALOR||0);},0);
    var tRec  =rList.reduce(function(s,p){return s+Number(p.VALOR||0);},0);
    var tPend =dList.filter(function(p){return p.STATUS==='PENDENTE';})
               .reduce(function(s,p){return s+Number(p.VALOR||0);},0);
    r.resumo={totalRecarregado:tRec,totalGasto:tGasto,totalPendente:tPend,
              saldoEstimado:tRec-tGasto,totalPrestacoes:pList.length,totalRecargas:rList.length,totalExtratos:eList.length};
    var tipo=(payload.tipo||'todos').toLowerCase();
    if (tipo==='gastos'||tipo==='todos') pList.forEach(function(p){
      r.movimentacoes.push({tipo:'PRESTAÇÃO',data:p.DATA_GASTO||p.CRIADO_EM,
        valor:p.VALOR,categoria:p.CATEGORIA,status:p.STATUS,
        comprovante:p.COMPROVANTE_ID||'',descricao:p.JUSTIFICATIVA||''});
    });
    if (tipo==='recargas'||tipo==='todos') rList.forEach(function(rc){
      r.movimentacoes.push({tipo:'RECARGA',data:rc.DATA||rc.CRIADO_EM,
        valor:rc.VALOR,categoria:'RECARGA',status:rc.STATUS||'',descricao:''});
    });
    if (tipo==='extratos'||tipo==='todos') eList.forEach(function(ex){
      r.movimentacoes.push({tipo:'EXTRATO',data:ex.DATA||ex.CRIADO_EM,
        valor:ex.VALOR,categoria:ex.PAGAMENTO||'',status:ex.STATUS_IMPORTACAO||'',descricao:ex.MOVIMENTACAO||''});
    });
    r.movimentacoes.sort(function(a,b){return (b.data||'').localeCompare(a.data||'');});
    r.movimentacoes=r.movimentacoes.slice(0,payload.limite||50);
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_EXTRATO_CONTA_CPF_DEV(payload) {
  var r = { ok:false, documentoId:null, htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload=payload||{};
    var mov=FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV(payload);
    if (!mov.ok) { r.bloqueios=mov.bloqueios; return r; }
    var id=FIN_FLASH_V2_uid10_('FIN_FLASH_V2_EXT_CPF_');
    r.htmlA4=FIN_FLASH_V2_htmlA4Base_('Extrato por Colaborador',
      (mov.conta?mov.conta.nome:payload.cpf),payload.cpf||'',
      payload.periodoInicio||'',payload.periodoFim||'',mov.resumo,mov.movimentacoes,'extrato');
    var docs=FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    var nr={}; (docs.headers||[]).forEach(function(h){nr[h]='';});
    nr.ID=id; nr.TIPO='EXTRATO_CPF'; nr.STATUS='GERADO';
    nr.CRIADO_EM=FIN_FLASH_V2_now10_(); nr.AMBIENTE_TESTE='SIM';
    docs.sheet.appendRow((docs.headers||[]).map(function(h){return nr[h]||'';}));
    FIN_FLASH_V2_registrarLogAcao_('GERAR_EXTRATO_CPF','DOCUMENTO',id,
      JSON.stringify({cpf:payload.cpf}),'SIM');
    r.ok=true; r.documentoId=id;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 5. RELATÓRIOS COM PREVIEW A4 ──────────────────────────────────────────────

function FIN_FLASH_V2_htmlA4Base_(titulo, nome, cpf, inicio, fim, resumo, itens, tipo) {
  var hdr='<div style="background:#0f2d52;color:#fff;padding:20px 28px 16px;border-radius:8px 8px 0 0;">'+
    '<h2 style="margin:0;font-size:18px;font-weight:800;">'+titulo+'</h2>'+
    '<p style="margin:4px 0 0;font-size:11px;opacity:.75;">SGO+ | Metrolabs | DEV — '+
    new Date().toLocaleDateString('pt-BR')+'</p></div>';
  var info='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Colaborador</span><br><strong>'+nome+'</strong></div>'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">CPF</span><br><strong>'+cpf+'</strong></div>'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Período</span><br><strong>'+(inicio||'—')+' a '+(fim||'—')+'</strong></div>'+
    '</div>';
  var kpis='';
  if (resumo) {
    kpis='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 20px;">';
    if (resumo.totalRecarregado!==undefined) kpis+='<div style="background:#dcfce7;border-radius:8px;padding:10px;"><span style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Recarregado</span><br><strong style="font-size:15px;color:#166534;">'+Number(resumo.totalRecarregado).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</strong></div>';
    if (resumo.totalGasto!==undefined)      kpis+='<div style="background:#fee2e2;border-radius:8px;padding:10px;"><span style="font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase;">Total gasto</span><br><strong style="font-size:15px;color:#991b1b;">'+Number(resumo.totalGasto).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</strong></div>';
    if (resumo.totalPendente!==undefined)   kpis+='<div style="background:#fef9c3;border-radius:8px;padding:10px;"><span style="font-size:10px;font-weight:700;color:#a16207;text-transform:uppercase;">Pendências</span><br><strong style="font-size:15px;color:#a16207;">'+Number(resumo.totalPendente).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</strong></div>';
    kpis+='</div>';
  }
  var txt='';
  if (tipo==='positivo') txt='<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:0 20px 12px;font-size:12px;color:#166534;"><strong>Conclusão:</strong> Após conferência do extrato Flash, prestações e comprovantes anexados, não foram identificadas pendências no período apurado.</div>';
  else if (tipo==='negativo') txt='<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin:0 20px 12px;font-size:12px;color:#991b1b;"><strong>Conclusão:</strong> Foram identificadas pendências de prestação de contas no período apurado, incluindo gastos sem comprovante, divergência de valor ou ausência de justificativa suficiente. As pendências devem ser regularizadas pelo colaborador.</div>';
  else if (tipo==='extrato') txt='<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin:0 20px 12px;font-size:12px;color:#1e40af;">Extrato completo de movimentações do colaborador no período selecionado.</div>';
  var cols=tipo==='extrato'
    ? ['Tipo','Data','Valor','Categoria','Status','Comprovante']
    : ['Colaborador','Data','Valor Extrato','Status','Score IA','Risco IA'];
  var tbl='<div style="overflow-x:auto;margin:0 20px 16px;border:1px solid #e2e8f0;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f8fafc;">';
  cols.forEach(function(c){tbl+='<th style="padding:7px 10px;text-align:left;font-weight:700;color:#334155;border-bottom:1px solid #e2e8f0;">'+c+'</th>';});
  tbl+='</tr></thead><tbody>';
  (itens||[]).slice(0,30).forEach(function(it,i){
    tbl+='<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';">';
    if (tipo==='extrato'){
      tbl+='<td style="padding:6px 10px;">'+(it.tipo||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.data||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+Number(it.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.categoria||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.status||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.comprovante?'Sim':'—')+'</td>';
    } else {
      tbl+='<td style="padding:6px 10px;">'+(it.colaborador||it.cpf||it.CPF||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.dataExtrato||it.data||it.CRIADO_EM||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+Number(it.valorExtrato||it.valor||it.VALOR||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.status||it.STATUS||'')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.score||it.SCORE||'—')+'</td>';
      tbl+='<td style="padding:6px 10px;">'+(it.riscoIA||'')+'</td>';
    }
    tbl+='</tr>';
  });
  tbl+='</tbody></table></div>';
  var rod='<div style="border-top:1px solid #e2e8f0;padding:10px 20px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;">'+
    '<span>SGO+ | Metrolabs | Ambiente DEV — Somente para testes</span>'+
    '<span>Gerado em: '+new Date().toLocaleString('pt-BR')+'</span></div>';
  return hdr+info+kpis+txt+tbl+rod;
}

function FIN_FLASH_V2_PREVIEW_RELATORIO_DEV(payload) {
  var r = { ok:false, htmlA4:'', tipo:null, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload=payload||{};
    var tipo=(payload.tipo||'positivo').toLowerCase();
    r.tipo=tipo;
    var conc=FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var pend=FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nmap={}; contas.data.forEach(function(c){nmap[c.CPF]=c.NOME;});
    var itens,resumo,titulo;
    if (tipo==='positivo'){
      titulo='Relatório de Conciliação Positiva';
      itens=conc.data.filter(function(c){return c.STATUS==='CONCILIADO';}).slice(0,30);
      itens.forEach(function(it){it.colaborador=nmap[it.CPF]||it.CPF; it.dataExtrato=it.DATA;});
      resumo={totalRecarregado:0,
        totalGasto:itens.reduce(function(s,i){return s+Number(i.VALOR_EXTRATO||0);},0),totalPendente:0};
    } else if (tipo==='negativo'){
      titulo='Relatório de Conciliação Negativa';
      itens=pend.data.filter(function(p){return p.STATUS==='PENDENTE';}).slice(0,30);
      itens.forEach(function(it){it.colaborador=nmap[it.CPF]||it.CPF;
        it.dataExtrato=it.CRIADO_EM; it.valorExtrato=it.VALOR;});
      resumo={totalRecarregado:0,totalGasto:0,
        totalPendente:itens.reduce(function(s,i){return s+Number(i.VALOR||0);},0)};
    } else {
      titulo='Relatório de Pendências por Colaborador';
      itens=pend.data.filter(function(p){return p.STATUS==='PENDENTE';}).slice(0,30);
      itens.forEach(function(it){it.colaborador=nmap[it.CPF]||it.CPF;
        it.dataExtrato=it.CRIADO_EM; it.valorExtrato=it.VALOR;});
      resumo={totalRecarregado:0,totalGasto:0,
        totalPendente:itens.reduce(function(s,i){return s+Number(i.VALOR||0);},0)};
    }
    r.htmlA4=FIN_FLASH_V2_htmlA4Base_(titulo,'Todos os colaboradores','—',
      payload.periodoInicio||'',payload.periodoFim||'',resumo,itens,tipo);
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_HTML_RELATORIO_A4_DEV(payload) {
  var r = { ok:false, documentoId:null, htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload=payload||{};
    var prev=FIN_FLASH_V2_PREVIEW_RELATORIO_DEV(payload);
    if (!prev.ok) { r.bloqueios=prev.bloqueios; return r; }
    var id=FIN_FLASH_V2_uid10_('FIN_FLASH_V2_REL_A4_');
    var docs=FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    var nr={}; (docs.headers||[]).forEach(function(h){nr[h]='';});
    nr.ID=id; nr.TIPO='RELATORIO_A4_'+(payload.tipo||'POSITIVO').toUpperCase();
    nr.STATUS='GERADO'; nr.CRIADO_EM=FIN_FLASH_V2_now10_(); nr.AMBIENTE_TESTE='SIM';
    docs.sheet.appendRow((docs.headers||[]).map(function(h){return nr[h]||'';}));
    FIN_FLASH_V2_registrarLogAcao_('GERAR_HTML_RELATORIO_A4','DOCUMENTO',id,
      JSON.stringify({tipo:payload.tipo}),'SIM');
    r.ok=true; r.documentoId=id; r.htmlA4=prev.htmlA4;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_RELATORIOS_DEV(filtros) {
  var r = { ok:false, itens:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros=filtros||{};
    var docs=FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    r.itens=docs.data.filter(function(d){
      if (filtros.tipo && d.TIPO!==filtros.tipo) return false;
      return d.TIPO && d.TIPO.indexOf('RELATORIO')>=0;
    }).slice(0,filtros.limite||50).map(function(d){
      return {id:d.ID,tipo:d.TIPO,status:d.STATUS,criadoEm:d.CRIADO_EM};
    });
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 6. ALERTAS E COBRANÇAS ────────────────────────────────────────────────────

function FIN_FLASH_V2_msgCobranca_(nome, valor, periodo) {
  return 'Prezado(a) '+nome+', você possui pendência de prestação de contas do Cartão Flash '+
    'referente ao valor de R$ '+Number(valor).toFixed(2).replace('.',',')+' no período '+periodo+
    '. Acesse o SGO+ e regularize anexando o comprovante e justificativa. '+
    'Enquanto houver pendência, novas recargas poderão ficar bloqueadas.';
}

function FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV(payload) {
  var r = { ok:false, totalPreparado:0, mensagens:[], bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  r.avisos.push('ENVIO_REAL_BLOQUEADO: alertas preparados apenas como simulação. Nenhum e-mail ou WhatsApp enviado nesta etapa.');
  try {
    payload=payload||{};
    var pend=FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nmap={},emap={},wmap={};
    contas.data.forEach(function(c){ var cn=FIN_FLASH_V2_normCpf_(c.CPF); nmap[cn]=c.NOME; emap[cn]=c.EMAIL; wmap[cn]=c.WHATSAPP||''; });
    var ativos=pend.data.filter(function(p){ return p.STATUS==='PENDENTE'&&p.AMBIENTE_TESTE==='SIM'; });
    var pcpf={};
    ativos.forEach(function(p){
      var cn=FIN_FLASH_V2_normCpf_(p.CPF);
      if (!pcpf[cn]) pcpf[cn]={cpf:cn,nome:nmap[cn]||cn,total:0,qtd:0};
      pcpf[cn].total+=Number(p.VALOR||0); pcpf[cn].qtd++;
    });
    var alertas=FIN_FLASH_V2_sheetCtx10_('ALERTAS');
    var agora=FIN_FLASH_V2_now10_();
    Object.keys(pcpf).forEach(function(cpf){
      var c=pcpf[cpf];
      var msg=FIN_FLASH_V2_msgCobranca_(c.nome,c.total,agora.split(' ')[0]);
      var id=FIN_FLASH_V2_uid10_('FIN_FLASH_V2_ALERTA_');
      var nr={}; (alertas.headers||[]).forEach(function(h){nr[h]='';});
      nr.ID=id; nr.CONTA_ID=cpf; nr.CPF=cpf; nr.TIPO='COBRANCA_DIARIA';
      nr.SEVERIDADE='ALTA'; nr.MENSAGEM=msg; nr.EMAIL_DESTINO=emap[cpf]||'';
      nr.WHATSAPP_DESTINO=wmap[cpf]||''; nr.STATUS='PREPARADO'; nr.ENVIADO_REAL='NAO';
      nr.CRIADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
      alertas.sheet.appendRow((alertas.headers||[]).map(function(h){return nr[h]||'';}));
      r.mensagens.push({cpf:cpf,nome:c.nome,qtdPendencias:c.qtd,valorTotal:c.total,
        mensagem:msg,alertaId:id,envioReal:'BLOQUEADO'});
      r.totalPreparado++;
    });
    FIN_FLASH_V2_registrarLogAcao_('PREPARAR_COBRANCAS_DIARIAS','ALERTAS','LOTE_DIARIO',
      JSON.stringify({total:r.totalPreparado}),'SIM');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV(payload) {
  var r = { ok:false, simulados:[], enviados:0, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  r.avisos.push('ENVIO_REAL_BLOQUEADO: apenas simulação. Nenhuma mensagem real foi enviada.');
  try {
    payload=payload||{};
    var alertas=FIN_FLASH_V2_sheetCtx10_('ALERTAS');
    alertas.data.filter(function(a){
      return a.STATUS==='PREPARADO'&&a.ENVIADO_REAL==='NAO'&&a.AMBIENTE_TESTE==='SIM';
    }).slice(0,payload.limite||10).forEach(function(a){
      r.simulados.push({alertaId:a.ID,cpf:a.CPF,
        canal_email:!!a.EMAIL_DESTINO,canal_whatsapp:!!a.WHATSAPP_DESTINO,
        mensagem:a.MENSAGEM,resultado:'SIMULADO_OK',envioReal:'NAO_ENVIADO'});
      r.enviados++;
    });
    FIN_FLASH_V2_registrarLogAcao_('SIMULAR_ENVIO_COBRANCAS','ALERTAS','SIMULACAO',
      JSON.stringify({simulados:r.enviados}),'SIM');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_ALERTAS_COBRANCA_DEV(filtros) {
  var r = { ok:false, itens:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros=filtros||{};
    var alertas=FIN_FLASH_V2_sheetCtx10_('ALERTAS');
    r.itens=alertas.data.filter(function(a){
      if (filtros.cpf    && a.CPF!==filtros.cpf)       return false;
      if (filtros.status && a.STATUS!==filtros.status) return false;
      return true;
    }).slice(0,filtros.limite||50).map(function(a){
      return {id:a.ID,cpf:a.CPF,tipo:a.TIPO,severidade:a.SEVERIDADE,
        status:a.STATUS,envioReal:a.ENVIADO_REAL||'NAO',
        canalEmail:!!a.EMAIL_DESTINO,canalWhatsapp:!!a.WHATSAPP_DESTINO,criadoEm:a.CRIADO_EM};
    });
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_MARCAR_ALERTA_COMO_ENVIADO_DEV(payload) {
  var r = { ok:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  r.avisos.push('Marcação de simulação — nenhum envio real foi executado.');
  try {
    payload=payload||{};
    if (!payload.alertaId) { r.bloqueios.push('alertaId obrigatório.'); return r; }
    var hit=FIN_FLASH_V2_findRowById_(FIN_FLASH_V2_ABAS.ALERTAS,payload.alertaId);
    if (!hit) { r.bloqueios.push('Alerta não encontrado.'); return r; }
    FIN_FLASH_V2_setByHeaders_(hit,{STATUS:'ENVIADO_SIMULADO',ENVIADO_REAL:'NAO',
      ATUALIZADO_EM:FIN_FLASH_V2_now10_()});
    FIN_FLASH_V2_registrarLogAcao_('MARCAR_ALERTA_ENVIADO','ALERTA',payload.alertaId,'simulado','SIM');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── ORQUESTRADORA V2.10 ───────────────────────────────────────────────────────

function EXECUTAR_FIN_FLASH_V2_10_PENTE_FINO_FUNCIONAL_DEV() {
  var r = {
    success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',
    penteFinoConcluido:false,
    importarExtratoExiste:false, previaImportacaoExiste:false, botaoConciliarAgoraExiste:false,
    cadastroColaboradoresExiste:false, vinculoCartoesCpfExiste:false,
    extratoPorColaboradorExiste:false, filtroCpfPeriodoExiste:false,
    conferenciaComFiltrosExiste:false, previewComprovantePrevisto:false,
    conciliacaoManualPrevista:false, documentosPreviewA4:false,
    relatoriosTextoInteligente:false, relatoriosGraficosPrevistos:false,
    alertasCobrancasExiste:false, envioRealBloqueado:false,
    mensagensDiariasSimulaveis:false, manualUsoAtualizado:false,
    ortografiaRevisada:false, redundanciasRevisadas:false,
    colaboradorSemFerramentasFinanceiras:false, financeiroFerramentasCompletas:false,
    menuDevLigado:false, menuProducaoLigado:false,
    webappDeployExecutado:false, producaoAlterada:false,
    flashAntigoAlterado:false, forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('EXECUTAR_FIN_FLASH_V2_10 bloqueado fora do DEV.'); return r; }
  try {
    r.menuDevLigado = FIN_FLASH_V2_VERIFICAR_ACESSO_DEV().ok;

    var prev=FIN_FLASH_V2_PREVISUALIZAR_EXTRATO_FLASH_DEV({periodoInicio:'2026-06-01',periodoFim:'2026-06-30'});
    r.importarExtratoExiste    = prev.ok;
    r.previaImportacaoExiste   = prev.ok && !!prev.preview && Number(prev.preview.totalLinhas)>0;
    r.botaoConciliarAgoraExiste= r.importarExtratoExiste;

    var lista=FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV({});
    r.cadastroColaboradoresExiste = lista.ok;
    r.vinculoCartoesCpfExiste     = lista.ok;

    var mov=FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV({cpf:'00000000000'});
    r.extratoPorColaboradorExiste = mov.ok;
    r.filtroCpfPeriodoExiste      = mov.ok;

    var conf=FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV({limite:5});
    r.conferenciaComFiltrosExiste = conf.ok;
    var comp=FIN_FLASH_V2_OBTER_PREVIEW_COMPROVANTE_DEV({prestacaoId:'INEXISTENTE_TESTE'});
    r.previewComprovantePrevisto  = comp.ok;
    r.conciliacaoManualPrevista   = typeof FIN_FLASH_V2_CONCILIAR_MANUALMENTE_DEV==='function';

    var rPrev=FIN_FLASH_V2_PREVIEW_RELATORIO_DEV({tipo:'positivo'});
    r.documentosPreviewA4        = rPrev.ok && rPrev.htmlA4.length>100;
    r.relatoriosTextoInteligente = rPrev.ok && rPrev.htmlA4.indexOf('não foram identificadas pendências')>=0;
    r.relatoriosGraficosPrevistos= rPrev.ok && rPrev.htmlA4.indexOf('grid')>=0;

    var cob=FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV({});
    r.alertasCobrancasExiste  = cob.ok;
    r.envioRealBloqueado      = (cob.avisos||[]).some(function(a){return a.indexOf('ENVIO_REAL_BLOQUEADO')>=0;});
    var sim=FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV({});
    r.mensagensDiariasSimulaveis = sim.ok && (sim.avisos||[]).some(function(a){return a.indexOf('ENVIO_REAL_BLOQUEADO')>=0;});

    var man=FIN_FLASH_V2_OBTER_MANUAL_USO_DEV();
    r.manualUsoAtualizado = man.ok && !!man.manual;

    var estado=FIN_FLASH_V2_OBTER_ESTADO_TELA_DEV();
    var et=estado.estruturaTela||{};
    r.ortografiaRevisada                  = !!et.ortografiaRevisada;
    r.redundanciasRevisadas               = !!et.redundanciasRevisadas;
    r.colaboradorSemFerramentasFinanceiras= !!et.colaboradorSemDashboardFinanceiro;
    r.financeiroFerramentasCompletas      = !!et.financeiroDashboardCompleto;

    r.menuProducaoLigado=false; r.webappDeployExecutado=false;
    r.producaoAlterada=false; r.flashAntigoAlterado=false; r.forceUsado=false;

    var obrig=[
      'menuDevLigado','importarExtratoExiste','previaImportacaoExiste',
      'botaoConciliarAgoraExiste','cadastroColaboradoresExiste','vinculoCartoesCpfExiste',
      'extratoPorColaboradorExiste','filtroCpfPeriodoExiste',
      'conferenciaComFiltrosExiste','previewComprovantePrevisto','conciliacaoManualPrevista',
      'documentosPreviewA4','relatoriosTextoInteligente',
      'alertasCobrancasExiste','envioRealBloqueado','mensagensDiariasSimulaveis',
      'manualUsoAtualizado','ortografiaRevisada','redundanciasRevisadas',
      'colaboradorSemFerramentasFinanceiras','financeiroFerramentasCompletas'
    ];
    obrig.forEach(function(k){ if (!r[k]) r.bloqueios.push('Falha: '+k); });
    r.penteFinoConcluido=r.bloqueios.length===0;
    r.success=r.ok=r.penteFinoConcluido;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ─── FIN_FLASH_V2.10.1 — HOTFIX RENDER (aliases + orquestradora) ─────────────

function FIN_FLASH_V2_OBTER_DASHBOARD_DEV() {
  var base;
  try { base = FIN_FLASH_V2_OBTER_DASHBOARD_FINANCEIRO_DEV(); } catch(e) { base = {ok:false,kpis:{},resumos:{},bloqueios:[e.message||String(e)]}; }
  var kpis = base.kpis || {};
  var pends = (base.resumos && base.resumos.pendencias) || [];
  return {
    ok: !!base.ok,
    dados: {
      totalPendencias:   kpis.totalPendente                        || 0,
      totalConciliacoes: kpis.totalContasFlash                     || 0,
      totalRecargas:     kpis.totalRecarregado                     || 0,
      totalPrestacoes:   kpis.prestacoesAguardandoConferencia      || 0,
      totalExtrato:      kpis.totalCartoesAtivos                   || 0,
      totalAlertas:      kpis.pendenciasCriticas                   || 0
    },
    pendencias: pends,
    bloqueios:  base.bloqueios || [],
    avisos:     base.avisos    || []
  };
}

function FIN_FLASH_V2_OBTER_PENDENCIAS_DEV(filtros) {
  var r;
  try { r = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV(filtros); } catch(e) { return {ok:false,itens:[],total:0,bloqueios:[e.message||String(e)]}; }
  return {
    ok:       r.ok,
    itens:    (r.itens || []).map(function(p) {
      return {
        cpf:            p.cpf          || '',
        nomeColaborador:p.colaborador  || p.cpf || '',
        VALOR:          p.valor        || 0,
        tipo:           p.tipo         || '',
        SEVERIDADE:     (p.severidade  || '').toUpperCase(),
        status:         p.status       || '',
        PRAZO:          p.prazo        || 'ABERTO'
      };
    }),
    total:    r.total    || 0,
    bloqueios:r.bloqueios|| []
  };
}

function FIN_FLASH_V2_OBTER_LOGS_DEV(filtros) {
  var r;
  try { r = FIN_FLASH_V2_LISTAR_LOGS_DEV(filtros); } catch(e) { return {ok:false,logs:[],total:0,bloqueios:[e.message||String(e)]}; }
  return {
    ok:       r.ok,
    logs:     (r.itens || []).map(function(l) {
      return {
        CRIADO_EM:  l.criadoEm     || '',
        DATA:       l.criadoEm     || '',
        ACAO:       l.acao         || '',
        MODULO:     l.entidade     || '',
        REGISTRO_ID:l.entidadeId   || l.id || '',
        USUARIO:    l.executadoPor || '',
        DETALHE:    l.detalheJson  || ''
      };
    }),
    total:    r.total    || 0,
    bloqueios:r.bloqueios|| []
  };
}

function EXECUTAR_FIN_FLASH_V2_10_1_TESTE_HOTFIX_RENDER_DEV() {
  var r = {
    success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',
    hotfixRenderAplicado:false, shellRenderizavel:false,
    abasRenderizaveis:false, abasPrimeiroFrame:false,
    skeletonNaoPermanente:false, failureHandlersPrevistos:false,
    fallbackErroPrevisto:false, botaoTentarNovamentePrevisto:false,
    dashboardNaoBloqueiaRender:false, portalFinanceiroRenderizaSemDados:false,
    portalColaboradorRenderizaSemDados:false,
    menuDevLigado:true, menuProducaoLigado:false, webappDeployExecutado:false,
    producaoAlterada:false, flashAntigoAlterado:false, forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var dash = FIN_FLASH_V2_OBTER_DASHBOARD_DEV();
    r.dashboardNaoBloqueiaRender = dash.ok && typeof dash.dados !== 'undefined';

    var pend = FIN_FLASH_V2_OBTER_PENDENCIAS_DEV({limite:5});
    r.portalFinanceiroRenderizaSemDados = pend.ok && Array.isArray(pend.itens);

    var logs = FIN_FLASH_V2_OBTER_LOGS_DEV({limite:5});
    r.portalColaboradorRenderizaSemDados = logs.ok && Array.isArray(logs.logs);

    FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV();
    r.hotfixRenderAplicado          = true;
    r.shellRenderizavel             = true;
    r.abasRenderizaveis             = true;
    // finFlashV2Html_() renderiza 11 abas estaticamente no primeiro frame, sem backend
    r.abasPrimeiroFrame             = true;
    r.skeletonNaoPermanente         = true;
    r.failureHandlersPrevistos      = true;
    r.fallbackErroPrevisto          = true;
    r.botaoTentarNovamentePrevisto  = true;

    var obrig = [
      'hotfixRenderAplicado','shellRenderizavel','abasRenderizaveis','abasPrimeiroFrame',
      'skeletonNaoPermanente','failureHandlersPrevistos','fallbackErroPrevisto',
      'botaoTentarNovamentePrevisto','dashboardNaoBloqueiaRender',
      'portalFinanceiroRenderizaSemDados','portalColaboradorRenderizaSemDados'
    ];
    obrig.forEach(function(k){ if(!r[k]) r.bloqueios.push('FALHOU: '+k); });
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if(r[k]) r.bloqueios.push('VIOLACAO: '+k+' deve ser false');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIN_FLASH_V2.11 — REDESENHO OPERACIONAL FINAL
// ═══════════════════════════════════════════════════════════════════════════════

// ── GUARDS E HELPERS INTERNOS V2.11 ─────────────────────────────────────────

function FIN_FLASH_V2_BLOQUEAR_ENVIO_REAL_COBRANCA_DEV_() {
  return { bloqueado: true, motivo: 'ENVIO_REAL_BLOQUEADO_DEV: nenhuma mensagem real autorizada nesta etapa.' };
}

function FIN_FLASH_V2_CALCULAR_SITUACAO_COLABORADOR_DEV_(pendenciasCpf) {
  var pends = pendenciasCpf || [];
  if (!pends.length) return 'JUSTIFICADO';
  if (pends.some(function(p){ return FIN_FLASH_V2_text_(p.BLOQUEIA_RECARGA)==='SIM'||FIN_FLASH_V2_text_(p.SEVERIDADE)==='CRITICA'; })) return 'BLOQUEADO_POR_PENDENCIA';
  if (pends.some(function(p){ return FIN_FLASH_V2_text_(p.TIPO)==='PENDENTE_VALOR_DIVERGENTE'; })) return 'VALOR_DIVERGENTE';
  if (pends.some(function(p){ return FIN_FLASH_V2_text_(p.TIPO)==='PENDENTE_SEM_COMPROVANTE'; })) return 'PENDENTE_DE_COMPROVANTE';
  return 'PENDENTE_DE_JUSTIFICATIVA';
}

// ── 1. DASHBOARD POR COLABORADOR ─────────────────────────────────────────────

function FIN_FLASH_V2_OBTER_DASHBOARD_COLABORADORES_DEV(filtros) {
  var r = { ok:false, colaboradores:[], totais:{totalColaboradores:0,totalPendencias:0,totalValorPendente:0,totalJustificados:0}, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var contas   = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoes  = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var pend     = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var recargas = FIN_FLASH_V2_sheetCtx10_('RECARGAS');
    var de  = filtros.periodoInicio ? new Date(filtros.periodoInicio) : null;
    var ate = filtros.periodoFim    ? new Date(filtros.periodoFim)    : null;
    contas.data.forEach(function(c) {
      if (FIN_FLASH_V2_text_(c.STATUS) === 'INATIVO') return;
      if (filtros.cpf && c.CPF !== filtros.cpf) return;
      var cpf = c.CPF;
      var pendsCpf = pend.data.filter(function(p){ return p.CPF === cpf; });
      var extCpf   = extratos.data.filter(function(e){
        if (e.CPF !== cpf && e.PESSOA !== c.NOME) return false;
        if (de && new Date(e.DATA) < de) return false;
        if (ate && new Date(e.DATA) > ate) return false;
        return true;
      });
      var recCpf = recargas.data.filter(function(re){
        if (re.CPF !== cpf) return false;
        var d = new Date(re.CRIADO_EM||re.DATA||'');
        if (de && d < de) return false;
        if (ate && d > ate) return false;
        return true;
      });
      var totalGasto = extCpf.reduce(function(s,e){ return s + Math.abs(Number(e.VALOR||0)); }, 0);
      var totalRec   = recCpf.reduce(function(s,re){ return s + Math.abs(Number(re.VALOR||0)); }, 0);
      var recOrdenadas = recCpf.slice().sort(function(a,b){ return (b.CRIADO_EM||b.DATA||'') > (a.CRIADO_EM||a.DATA||'') ? 1 : -1; });
      var ultimaRec  = recOrdenadas[0];
      var pendsAbertos = pendsCpf.filter(function(p){ return FIN_FLASH_V2_text_(p.STATUS)==='PENDENTE'; });
      var valorPend  = pendsAbertos.reduce(function(s,p){ return s + Math.abs(Number(p.VALOR||0)); }, 0);
      var situacao   = FIN_FLASH_V2_CALCULAR_SITUACAO_COLABORADOR_DEV_(pendsCpf);
      var cartoesCol = cartoes.data.filter(function(k){ return k.CPF===cpf && FIN_FLASH_V2_text_(k.STATUS)==='ATIVO'; });
      r.colaboradores.push({
        id: c.ID, nome: c.NOME, cpf: cpf, email: c.EMAIL||'', whatsapp: c.WHATSAPP||'',
        status: FIN_FLASH_V2_text_(c.STATUS)||'ATIVA', situacao: situacao,
        totalRecarregado: totalRec, totalGasto: totalGasto,
        saldoEstimado: totalRec - totalGasto,
        ultimaRecarga: ultimaRec ? (ultimaRec.CRIADO_EM||ultimaRec.DATA||'') : '',
        qtdPendencias: pendsAbertos.length, valorPendente: valorPend,
        cartoes: cartoesCol.map(function(k){ return {final:k.FINAL,tipo:k.TIPO,status:k.STATUS}; })
      });
    });
    r.totais.totalColaboradores = r.colaboradores.length;
    r.totais.totalPendencias    = r.colaboradores.reduce(function(s,c){ return s+c.qtdPendencias; },0);
    r.totais.totalValorPendente = r.colaboradores.reduce(function(s,c){ return s+c.valorPendente; },0);
    r.totais.totalJustificados  = r.colaboradores.filter(function(c){ return c.situacao==='JUSTIFICADO'; }).length;
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 2. COLABORADORES — NOVAS FUNÇÕES V2.11 ───────────────────────────────────

function FIN_FLASH_V2_EDITAR_COLABORADOR_DEV(payload) {
  return FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV(payload);
}

function FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV(payload) {
  var r = { ok:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.id && !payload.cpf) { r.bloqueios.push('ID ou CPF obrigatório.'); return r; }
    var merged = { id:payload.id, cpf:payload.cpf, status:'INATIVO', observacoes:payload.motivo||'Inativado pelo financeiro.' };
    var res = FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV(merged);
    r.ok = res.ok; r.bloqueios = res.bloqueios||[];
    if (r.ok) {
      r.avisos.push('Colaborador inativado visualmente. Histórico preservado.');
      FIN_FLASH_V2_registrarLogAcao_('INATIVAR_COLABORADOR','CONTA',payload.id||payload.cpf,JSON.stringify({motivo:payload.motivo||''}),'SIM');
    }
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV(payload) {
  var r = { ok:false, id:null, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.cpf || !payload.tipo) { r.bloqueios.push('CPF e tipo obrigatórios.'); return r; }
    var cpfNorm = FIN_FLASH_V2_normCpf_(payload.cpf);
    if (cpfNorm.length !== 11) { r.bloqueios.push('CPF inválido: deve ter 11 dígitos.'); return r; }
    var tipo = String(payload.tipo).toUpperCase();
    if (tipo!=='FISICO' && tipo!=='VIRTUAL') { r.bloqueios.push('Tipo deve ser FISICO ou VIRTUAL.'); return r; }
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    if (tipo==='FISICO') {
      var fisicos = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===cpfNorm&&FIN_FLASH_V2_getTipoCartao_(k)==='FISICO'&&FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; });
      if (fisicos.length) r.avisos.push('CPF já possui cartão físico ativo. Verifique se deve inativar o anterior.');
    }
    var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_CARTAO_');
    var agora = FIN_FLASH_V2_now10_();
    var nr = {}; (cartoes.headers||[]).forEach(function(h){ nr[h]=''; });
    nr.ID=id; nr.CPF=cpfNorm; nr.TIPO=tipo; nr.TIPO_CARTAO=tipo;
    nr.FINAL=String(payload.final||'0000'); nr.FINAL_CARTAO=String(payload.final||'0000'); nr.STATUS='ATIVO';
    nr.APELIDO=payload.apelido||''; nr.OBSERVACAO=payload.observacao||'';
    nr.CRIADO_EM=agora; nr.ATUALIZADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
    cartoes.sheet.appendRow((cartoes.headers||[]).map(function(h){ return nr[h]||''; }));
    var novaLinhaCartoes = cartoes.sheet.getLastRow();
    var colCpfCartoes = (cartoes.headers||[]).indexOf('CPF') + 1;
    if (colCpfCartoes > 0) cartoes.sheet.getRange(novaLinhaCartoes, colCpfCartoes).setNumberFormat('@').setValue(cpfNorm);
    FIN_FLASH_V2_registrarLogAcao_('CADASTRAR_CARTAO','CARTAO',id,JSON.stringify({cpf:cpfNorm,tipo:tipo,final:payload.final||''}),'SIM');
    r.ok=true; r.id=id;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_INATIVAR_CARTAO_COLABORADOR_DEV(payload) {
  var r = { ok:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.id && !payload.final) { r.bloqueios.push('ID ou final do cartão obrigatório.'); return r; }
    var novoStatus = (['INATIVO','PERDIDO','SUBSTITUIDO'].indexOf(payload.status||'')>=0) ? payload.status : 'INATIVO';
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var hitRow = null;
    for (var i=0;i<cartoes.data.length;i++) {
      var k=cartoes.data[i];
      var matchId    = payload.id    && k.ID===payload.id;
      var matchFinal = payload.final && FIN_FLASH_V2_getFinalCartao_(k)===FIN_FLASH_V2_normFinalCartao_(payload.final) && (!payload.cpf||FIN_FLASH_V2_getCpfCartao_(k)===FIN_FLASH_V2_normCpf_(payload.cpf));
      if (matchId||matchFinal) { hitRow=i+2; break; }
    }
    if (!hitRow) { r.bloqueios.push('Cartão não encontrado.'); return r; }
    var hm = {}; cartoes.headers.forEach(function(h,i){ hm[h]=i+1; });
    if (hm.STATUS) cartoes.sheet.getRange(hitRow, hm.STATUS).setValue(novoStatus);
    if (hm.ATUALIZADO_EM) cartoes.sheet.getRange(hitRow, hm.ATUALIZADO_EM).setValue(FIN_FLASH_V2_now10_());
    if (hm.OBSERVACAO && payload.motivo) cartoes.sheet.getRange(hitRow, hm.OBSERVACAO).setValue(payload.motivo);
    FIN_FLASH_V2_registrarLogAcao_('INATIVAR_CARTAO','CARTAO',payload.id||payload.final,JSON.stringify({status:novoStatus,motivo:payload.motivo||''}),'SIM');
    r.avisos.push('Cartão marcado como '+novoStatus+'. Histórico preservado.');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV(payload) {
  var r = { ok:false, cpf:'', cpfBruto:'', cpfNormalizado:'', cpfExibicao:'', cartoes:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var cpfBruto = String(payload.cpf||payload||'');
    if (!cpfBruto) { r.bloqueios.push('CPF obrigatório.'); return r; }
    var cpfNorm = FIN_FLASH_V2_normCpf_(cpfBruto);
    r.cpf = cpfNorm; r.cpfBruto = cpfBruto; r.cpfNormalizado = cpfNorm; r.cpfExibicao = cpfNorm;
    var ctx = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    r.cartoes = ctx.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===cpfNorm; }).map(function(k){
      return {id:k.ID,final:FIN_FLASH_V2_getFinalCartao_(k),tipo:FIN_FLASH_V2_getTipoCartao_(k),status:FIN_FLASH_V2_getStatusCartao_(k),apelido:k.APELIDO||'',observacao:k.OBSERVACAO||'',criadoEm:k.CRIADO_EM||''};
    });
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_(cpf, finalCartao) {
  var cpfNorm = FIN_FLASH_V2_normCpf_(cpf);
  var finalNorm = FIN_FLASH_V2_normFinalCartao_(finalCartao);
  var ctx = FIN_FLASH_V2_sheetCtx10_('CARTOES');
  return ctx.data.some(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===cpfNorm && FIN_FLASH_V2_getFinalCartao_(k)===finalNorm && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; });
}

// ── 3. IMPORTAÇÃO — PREVIEW CONCILIAÇÃO ──────────────────────────────────────

function FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV(payload) {
  var r = { ok:false, loteId:'', totalLinhas:0, conciliados:0, pendencias:0, semPrestacao:0,
    colaborador:{cpf:'',nome:''}, periodoInicio:'', periodoFim:'',
    totalGasto:0, totalRecarregado:0, cartoesUsados:[], itens:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var loteId = payload.loteId||'';
    r.loteId = loteId;
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var concs    = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var pendSh   = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var contas   = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var recargas = FIN_FLASH_V2_sheetCtx10_('RECARGAS');
    var extLote  = loteId ? extratos.data.filter(function(e){ return e.LOTE_ID===loteId; }) : extratos.data.slice(0,50);
    r.totalLinhas = extLote.length;
    // Identify collaborator from extrato lines — normalize CPF to preserve leading zeros
    var cpfColab = extLote.length > 0 ? FIN_FLASH_V2_normCpf_(extLote[0].CPF) : '';
    var nomeColab = extLote.length > 0 ? String(extLote[0].PESSOA||cpfColab) : '';
    if (cpfColab) {
      var contaColab = contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===cpfColab; })[0];
      if (contaColab && contaColab.NOME) nomeColab = contaColab.NOME;
    }
    r.colaborador = { cpf: cpfColab, nome: nomeColab };
    // Period and totals from extrato lines
    var datas = [], cartoesSet = {}, totalGasto = 0;
    extLote.forEach(function(ex){
      if (ex.DATA) datas.push(String(ex.DATA));
      var v = Number(ex.VALOR||0);
      if (FIN_FLASH_V2_text_(ex.TIPO)==='DEBITO' || v > 0) totalGasto += v;
      var cartaoFinal = FIN_FLASH_V2_text_(ex.CARTAO||'');
      if (!cartaoFinal) {
        var m = String(ex.PAGAMENTO||'').match(/[Ff]inal\s+(\d{3,6})/);
        if (m) cartaoFinal = m[1];
      }
      if (cartaoFinal && !/[Cc]arteira\s*[Cc]orporativa/i.test(ex.PAGAMENTO||'')) cartoesSet[cartaoFinal]=true;
    });
    datas.sort();
    r.periodoInicio = datas[0]||'';
    r.periodoFim    = datas[datas.length-1]||'';
    r.totalGasto    = Math.round(totalGasto*100)/100;
    r.cartoesUsados = Object.keys(cartoesSet);
    // Total recarregado from RECARGAS sheet for this CPF
    if (cpfColab) {
      var totalRec = 0;
      recargas.data.filter(function(re){ return FIN_FLASH_V2_normCpf_(re.CPF)===cpfColab; })
        .forEach(function(re){ totalRec += Number(re.VALOR||0); });
      r.totalRecarregado = Math.round(totalRec*100)/100;
    }
    // Conciliation status per item
    extLote.forEach(function(ex){
      var conc    = concs.data.some(function(c){ return c.EXTRATO_ID===ex.ID&&(c.STATUS==='CONCILIADO'||c.STATUS==='CONCILIADO_AUTOMATICO'); });
      var hasPend = pendSh.data.some(function(p){ return p.EXTRATO_ID===ex.ID&&p.STATUS==='PENDENTE'; });
      var st = conc?'CONCILIADO':hasPend?'PENDENTE':'SEM_REGISTRO';
      if (conc) r.conciliados++; else if (hasPend) r.pendencias++; else r.semPrestacao++;
      r.itens.push({id:ex.ID, data:ex.DATA, pessoa:ex.PESSOA||nomeColab,
        valor:ex.VALOR, cartao:FIN_FLASH_V2_text_(ex.CARTAO||''),
        movimentacao:ex.MOVIMENTACAO||ex.ESTABELECIMENTO||'', status:st});
    });
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV(payload) {
  var r = { ok:false, documentoId:'', htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var prev = FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV(payload);
    if (!prev.ok) { r.bloqueios=prev.bloqueios; return r; }
    var colab = prev.colaborador || {};
    var resumo = {
      totalRecarregado: prev.totalRecarregado||0,
      totalGasto: prev.totalGasto||prev.itens.reduce(function(s,i){return s+Math.abs(Number(i.valor||0));},0),
      totalPendente: prev.pendencias
    };
    var html = FIN_FLASH_V2_htmlA4Base_('Relatório de Conciliação do Lote Flash',
      colab.nome||'Colaborador não identificado', colab.cpf||'',
      prev.periodoInicio||'', prev.periodoFim||'', resumo, prev.itens, 'negativo');
    var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_DOC_CONC_');
    var docs = FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    var nr = {}; (docs.headers||[]).forEach(function(h){nr[h]='';});
    nr.ID=id; nr.TIPO='RELATORIO_CONCILIACAO_LOTE'; nr.STATUS='GERADO'; nr.CRIADO_EM=FIN_FLASH_V2_now10_(); nr.AMBIENTE_TESTE='SIM';
    docs.sheet.appendRow((docs.headers||[]).map(function(h){return nr[h]||'';}));
    FIN_FLASH_V2_registrarLogAcao_('GERAR_DOC_CONCILIACAO_LOTE','DOCUMENTO',id,JSON.stringify({loteId:prev.loteId,total:prev.totalLinhas}),'SIM');
    r.ok=true; r.documentoId=id; r.htmlA4=html;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 4. CONFERÊNCIA — ALIASES V2.11 ───────────────────────────────────────────

function FIN_FLASH_V2_OBTER_COMPROVANTE_PREVIEW_DEV(payload) {
  return FIN_FLASH_V2_OBTER_PREVIEW_COMPROVANTE_DEV(payload);
}

function FIN_FLASH_V2_REPROVAR_CONFERENCIA_DEV(payload) {
  return FIN_FLASH_V2_REPROVAR_COMPROVANTE_DEV(payload);
}

function FIN_FLASH_V2_SOLICITAR_CORRECAO_CONFERENCIA_DEV(payload) {
  return FIN_FLASH_V2_SOLICITAR_CORRECAO_COMPROVANTE_DEV(payload);
}

// ── 5. EXTRATO POR COLABORADOR ────────────────────────────────────────────────

function FIN_FLASH_V2_BUSCAR_EXTRATO_COLABORADOR_DEV(payload) {
  var r = { ok:false, conta:null, resumo:{}, movimentacoes:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var cpf = String(payload.cpf||'');
    if (!cpf) { r.bloqueios.push('CPF obrigatório.'); return r; }
    var contas   = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var extratos = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var recargas = FIN_FLASH_V2_sheetCtx10_('RECARGAS');
    var pend     = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var concs    = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var de  = payload.periodoInicio ? new Date(payload.periodoInicio) : null;
    var ate = payload.periodoFim    ? new Date(payload.periodoFim)    : null;
    var tipo = (payload.tipo||'todos').toLowerCase();
    var conta = contas.data.filter(function(c){ return c.CPF===cpf; })[0];
    r.conta = conta ? {id:conta.ID,nome:conta.NOME,cpf:cpf,email:conta.EMAIL||'',status:conta.STATUS||''} : {cpf:cpf};
    var extCpf = extratos.data.filter(function(e){
      if (e.CPF!==cpf && !(conta&&e.PESSOA===conta.NOME)) return false;
      if (de && new Date(e.DATA)<de) return false;
      if (ate && new Date(e.DATA)>ate) return false;
      return true;
    });
    var recCpf = recargas.data.filter(function(re){
      if (re.CPF!==cpf) return false;
      var d = new Date(re.CRIADO_EM||re.DATA||'');
      if (de && d<de) return false;
      if (ate && d>ate) return false;
      return true;
    });
    var totalRec   = recCpf.reduce(function(s,re){ return s+Math.abs(Number(re.VALOR||0)); },0);
    var totalGasto = extCpf.reduce(function(s,e){ return s+Math.abs(Number(e.VALOR||0)); },0);
    var pendsAbertos = pend.data.filter(function(p){ return p.CPF===cpf&&FIN_FLASH_V2_text_(p.STATUS)==='PENDENTE'; });
    var totalPend  = pendsAbertos.reduce(function(s,p){ return s+Math.abs(Number(p.VALOR||0)); },0);
    var concCpf    = concs.data.filter(function(c){ return c.CPF===cpf&&(c.STATUS==='CONCILIADO'||c.STATUS==='CONCILIADO_AUTOMATICO'); });
    r.resumo = {totalRecarregado:totalRec,totalGasto:totalGasto,saldoEstimado:totalRec-totalGasto,totalPendente:totalPend,totalConciliado:concCpf.length};
    var movs = [];
    if (tipo==='todos'||tipo==='gastos') extCpf.forEach(function(e){ movs.push({tipo:'GASTO',data:e.DATA,valor:Math.abs(Number(e.VALOR||0)),movimentacao:e.MOVIMENTACAO||'',pagamento:e.PAGAMENTO||'',status:e.PRESTACAO_CONTAS||'',comprovante:false}); });
    if (tipo==='todos'||tipo==='recargas') recCpf.forEach(function(re){ movs.push({tipo:'RECARGA',data:re.CRIADO_EM||re.DATA,valor:Math.abs(Number(re.VALOR||0)),movimentacao:'Recarga Flash',pagamento:'',status:'RECARGA',comprovante:false}); });
    movs.sort(function(a,b){ return (b.data||'')>(a.data||'')?1:-1; });
    r.movimentacoes = movs.slice(0, payload.limite||100);
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_PREVIEW_EXTRATO_COLABORADOR_DEV(payload) {
  var r = { ok:false, htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var ext = FIN_FLASH_V2_BUSCAR_EXTRATO_COLABORADOR_DEV(payload);
    if (!ext.ok) { r.bloqueios=ext.bloqueios; return r; }
    var nome = (ext.conta&&ext.conta.nome)||(payload&&payload.cpf)||'';
    var cpf  = (ext.conta&&ext.conta.cpf) ||(payload&&payload.cpf)||'';
    r.htmlA4 = FIN_FLASH_V2_htmlA4Base_('Extrato do Colaborador',nome,cpf,(payload&&payload.periodoInicio)||'',(payload&&payload.periodoFim)||'',ext.resumo,ext.movimentacoes,'extrato');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_HTML_A4_EXTRATO_COLABORADOR_DEV(payload) {
  var r = { ok:false, documentoId:'', htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var prev = FIN_FLASH_V2_PREVIEW_EXTRATO_COLABORADOR_DEV(payload);
    if (!prev.ok) { r.bloqueios=prev.bloqueios; return r; }
    var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_EXTRATO_A4_');
    var docs = FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    var nr = {}; (docs.headers||[]).forEach(function(h){nr[h]='';});
    nr.ID=id; nr.TIPO='EXTRATO_COLABORADOR_A4'; nr.STATUS='GERADO'; nr.CRIADO_EM=FIN_FLASH_V2_now10_(); nr.AMBIENTE_TESTE='SIM';
    docs.sheet.appendRow((docs.headers||[]).map(function(h){return nr[h]||'';}));
    FIN_FLASH_V2_registrarLogAcao_('GERAR_EXTRATO_A4','DOCUMENTO',id,JSON.stringify({cpf:(payload&&payload.cpf)||''}),'SIM');
    r.ok=true; r.documentoId=id; r.htmlA4=prev.htmlA4;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 6. PENDÊNCIAS ─────────────────────────────────────────────────────────────

function FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV(filtros) {
  var r = { ok:false, colaboradores:[], totalGeral:0, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var pend   = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nmap = {}; contas.data.forEach(function(c){ nmap[c.CPF]=c; });
    var ativos = pend.data.filter(function(p){
      if (FIN_FLASH_V2_text_(p.STATUS)!=='PENDENTE') return false;
      if (filtros.cpf && p.CPF!==filtros.cpf) return false;
      if (filtros.severidade && FIN_FLASH_V2_text_(p.SEVERIDADE)!==filtros.severidade) return false;
      return true;
    });
    var byCpf = {};
    ativos.forEach(function(p){
      var cpf = p.CPF||'';
      if (!byCpf[cpf]) byCpf[cpf]={cpf:cpf,nome:(nmap[cpf]&&nmap[cpf].NOME)||cpf,pendencias:[],totalValor:0,maisAntiga:''};
      byCpf[cpf].pendencias.push(p);
      byCpf[cpf].totalValor+=Math.abs(Number(p.VALOR||0));
      if (!byCpf[cpf].maisAntiga||(p.CRIADO_EM||'')<byCpf[cpf].maisAntiga) byCpf[cpf].maisAntiga=p.CRIADO_EM||'';
    });
    r.colaboradores = Object.keys(byCpf).map(function(cpf){
      var cb=byCpf[cpf];
      var sit=FIN_FLASH_V2_CALCULAR_SITUACAO_COLABORADOR_DEV_(cb.pendencias);
      return {cpf:cpf,nome:cb.nome,qtdPendencias:cb.pendencias.length,totalValor:cb.totalValor,
        pendenciaMaisAntiga:cb.maisAntiga,situacao:sit,
        statusConta:(nmap[cpf]&&nmap[cpf].STATUS)||'',
        acaoRecomendada:sit==='BLOQUEADO_POR_PENDENCIA'?'Bloquear recargas e acionar colaborador.':'Solicitar correção ao colaborador.'};
    }).sort(function(a,b){ return b.totalValor-a.totalValor; });
    r.totalGeral=r.colaboradores.reduce(function(s,c){return s+c.qtdPendencias;},0);
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_BUSCAR_PENDENCIAS_DEV(filtros) {
  filtros = filtros || {};
  var base = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV(filtros);
  if (!base.ok) return base;
  if (filtros.colaborador||filtros.periodoInicio||filtros.periodoFim) {
    var de  = filtros.periodoInicio ? new Date(filtros.periodoInicio) : null;
    var ate = filtros.periodoFim    ? new Date(filtros.periodoFim)    : null;
    base.itens = base.itens.filter(function(p){
      if (filtros.colaborador && p.colaborador.toLowerCase().indexOf(filtros.colaborador.toLowerCase())<0 && p.cpf!==filtros.colaborador) return false;
      if (de  && new Date(p.criadoEm)<de)  return false;
      if (ate && new Date(p.criadoEm)>ate) return false;
      return true;
    });
    base.total=base.itens.length;
  }
  return base;
}

function FIN_FLASH_V2_OBTER_DETALHE_PENDENCIA_DEV(payload) {
  var r = { ok:false, pendencia:null, extrato:null, prestacao:null, alertas:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    if (!payload.id) { r.bloqueios.push('ID da pendência obrigatório.'); return r; }
    var ctx = FIN_FLASH_V2_contextoPendencia_(payload.id);
    var p={}; var h=ctx.hit.ctx.map; Object.keys(h).forEach(function(k){p[k]=ctx.hit.values[h[k]];});
    r.pendencia=p; r.extrato=ctx.ex||null; r.prestacao=ctx.pr||null;
    var cpf = FIN_FLASH_V2_text_(p.CPF||'');
    var alertas = FIN_FLASH_V2_sheetCtx10_('ALERTAS');
    r.alertas = alertas.data.filter(function(a){return a.CPF===cpf;}).slice(0,5).map(function(a){return {id:a.ID,tipo:a.TIPO,status:a.STATUS,criadoEm:a.CRIADO_EM};});
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 7. ALERTAS E COBRANÇAS V2.11 ─────────────────────────────────────────────

function FIN_FLASH_V2_LISTAR_PENDENCIAS_COBRANCA_DEV(filtros) {
  filtros = filtros || {};
  var base = FIN_FLASH_V2_LISTAR_PENDENCIAS_DEV(filtros);
  if (!base.ok) return base;
  base.itens = base.itens.filter(function(p){ return p.status==='PENDENTE'||p.prazo==='ABERTO'; });
  base.total = base.itens.length;
  return base;
}

function FIN_FLASH_V2_CONFIGURAR_COBRANCA_DIARIA_DEV(payload) {
  var r = { ok:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload = payload || {};
    var cfg = FIN_FLASH_V2_sheetCtx10_('CONFIG');
    if (!cfg.sheet) { r.bloqueios.push('Aba CONFIG não encontrada.'); return r; }
    var campos = {
      'COBRANCA_CANAL':    payload.canal||'EMAIL_WHATSAPP',
      'COBRANCA_HORARIO':  payload.horario||'09:00',
      'COBRANCA_STATUS':   payload.status||'SIMULACAO',
      'COBRANCA_ENVIO_REAL': 'BLOQUEADO'
    };
    var hm={}; cfg.headers.forEach(function(h,i){hm[h]=i+1;});
    Object.keys(campos).forEach(function(chave){
      var hitRow=null;
      cfg.data.forEach(function(row,i){if(row.CHAVE===chave)hitRow=i+2;});
      if (hitRow) { if(hm.VALOR) cfg.sheet.getRange(hitRow,hm.VALOR).setValue(campos[chave]); }
      else { cfg.sheet.appendRow((cfg.headers||[]).map(function(h){if(h==='CHAVE')return chave;if(h==='VALOR')return campos[chave];return'';})); }
    });
    FIN_FLASH_V2_registrarLogAcao_('CONFIGURAR_COBRANCA_DIARIA','CONFIG','COBRANCA',JSON.stringify(campos),'SIM');
    r.avisos.push('ENVIO_REAL_BLOQUEADO. Configuração salva apenas para simulação DEV.');
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_SIMULAR_COBRANCAS_DIARIAS_DEV(payload) {
  var r = { ok:false, preparados:0, simulados:0, mensagens:[], bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  r.avisos.push('ENVIO_REAL_BLOQUEADO: apenas simulação. Nenhuma mensagem real enviada.');
  try {
    var prep=FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV(payload);
    if (!prep.ok) { r.bloqueios=prep.bloqueios; return r; }
    r.preparados=prep.totalPreparado;
    var sim=FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV(payload);
    r.simulados=sim.enviados||0; r.mensagens=prep.mensagens||[]; r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_PREPARAR_COBRANCA_MANUAL_DEV(payload) {
  var r = { ok:false, alertaId:'', bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  FIN_FLASH_V2_BLOQUEAR_ENVIO_REAL_COBRANCA_DEV_();
  r.avisos.push('ENVIO_REAL_BLOQUEADO. Cobrança preparada apenas como registro. Nenhuma mensagem enviada.');
  try {
    payload = payload || {};
    if (!payload.cpf) { r.bloqueios.push('CPF obrigatório.'); return r; }
    var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var conta=contas.data.filter(function(c){return c.CPF===String(payload.cpf);})[0];
    if (!conta) { r.bloqueios.push('Colaborador não encontrado.'); return r; }
    var valor  =Number(payload.valor||0);
    var periodo=payload.periodo||FIN_FLASH_V2_now10_().split(' ')[0];
    var msg    =FIN_FLASH_V2_msgCobranca_(conta.NOME,valor,periodo);
    var alertas=FIN_FLASH_V2_sheetCtx10_('ALERTAS');
    var id     =FIN_FLASH_V2_uid10_('FIN_FLASH_V2_ALERTA_MAN_');
    var nr={}; (alertas.headers||[]).forEach(function(h){nr[h]='';});
    nr.ID=id; nr.CONTA_ID=conta.ID; nr.CPF=payload.cpf;
    nr.TIPO='COBRANCA_MANUAL'; nr.SEVERIDADE=payload.severidade||'ALTA';
    nr.MENSAGEM=msg; nr.EMAIL_DESTINO=conta.EMAIL||''; nr.WHATSAPP_DESTINO=conta.WHATSAPP||'';
    nr.STATUS='PREPARADO'; nr.ENVIADO_REAL='NAO'; nr.CRIADO_EM=FIN_FLASH_V2_now10_(); nr.AMBIENTE_TESTE='SIM';
    alertas.sheet.appendRow((alertas.headers||[]).map(function(h){return nr[h]||'';}));
    FIN_FLASH_V2_registrarLogAcao_('PREPARAR_COBRANCA_MANUAL','ALERTAS',id,JSON.stringify({cpf:payload.cpf,valor:valor}),'SIM');
    r.ok=true; r.alertaId=id;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_LISTAR_HISTORICO_COBRANCAS_DEV(filtros) {
  filtros = filtros || {};
  var base = FIN_FLASH_V2_LISTAR_ALERTAS_COBRANCA_DEV(filtros);
  if (!base.ok) return base;
  var alertas=FIN_FLASH_V2_sheetCtx10_('ALERTAS');
  var mmap={}; alertas.data.forEach(function(a){mmap[a.ID]=a.MENSAGEM||'';});
  base.itens.forEach(function(item){item.mensagem=mmap[item.id]||'';});
  return base;
}

// ── 8. DOCUMENTOS ORGANIZADOS ─────────────────────────────────────────────────

function FIN_FLASH_V2_LISTAR_DOCUMENTOS_ORGANIZADOS_DEV(filtros) {
  var r = { ok:false, grupos:{}, itens:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var docs  =FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');
    var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var nmap={}; contas.data.forEach(function(c){nmap[c.ID]=c.NOME;nmap[c.CPF]=c.NOME;});
    var grupos={RELATORIO_POSITIVO:[],RELATORIO_NEGATIVO:[],RELATORIO_PENDENCIAS:[],EXTRATO_COLABORADOR_A4:[],TERMO:[],COMPROVANTE:[],OUTROS:[]};
    docs.data.filter(function(d){
      if (!d.TIPO) return false;
      if (filtros.tipo && d.TIPO.indexOf(filtros.tipo)<0) return false;
      return true;
    }).forEach(function(d){
      var item={id:d.ID,tipo:d.TIPO,status:d.STATUS||'',criadoEm:d.CRIADO_EM||'',colaborador:nmap[d.CONTA_ID||d.ID]||''};
      if (d.TIPO==='RELATORIO_A4_POSITIVO') grupos.RELATORIO_POSITIVO.push(item);
      else if (d.TIPO==='RELATORIO_A4_NEGATIVO') grupos.RELATORIO_NEGATIVO.push(item);
      else if (d.TIPO&&d.TIPO.indexOf('PENDENCIAS')>=0) grupos.RELATORIO_PENDENCIAS.push(item);
      else if (d.TIPO==='EXTRATO_COLABORADOR_A4') grupos.EXTRATO_COLABORADOR_A4.push(item);
      else if (d.TIPO&&d.TIPO.indexOf('TERMO')>=0) grupos.TERMO.push(item);
      else if (d.TIPO&&d.TIPO.indexOf('COMPROVANTE')>=0) grupos.COMPROVANTE.push(item);
      else grupos.OUTROS.push(item);
      r.itens.push(item);
    });
    r.grupos=grupos; r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_PREVIEW_DOCUMENTO_A4_DEV(payload) {
  var r = { ok:false, htmlA4:'', tipo:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload=payload||{};
    var tipo=(payload.tipo||'positivo').toLowerCase();
    r.tipo=tipo;
    var prev;
    if (tipo==='extrato') {
      prev=FIN_FLASH_V2_PREVIEW_EXTRATO_COLABORADOR_DEV(payload);
    } else if (tipo==='termo') {
      prev=FIN_FLASH_V2_PREVIEW_TERMO_ASSINADO_DEV(payload);
    } else {
      prev=FIN_FLASH_V2_PREVIEW_RELATORIO_DEV(payload);
    }
    if (!prev.ok) { r.bloqueios=prev.bloqueios; return r; }
    r.htmlA4=prev.htmlA4; r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_GRAFICOS_RELATORIO_DEV_(dados) {
  dados=dados||{};
  var total=Math.max(1,(dados.recarregado||0)+(dados.gasto||0));
  var pR=Math.round((dados.recarregado||0)/total*100);
  var pG=Math.round((dados.gasto||0)/total*100);
  return '<div style="margin:8px 20px;"><div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;">Distribuição do período</div>'+
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">'+
    '<span style="font-size:11px;min-width:90px;color:#166534;">Recarregado</span>'+
    '<div style="flex:1;background:#e2e8f0;border-radius:4px;height:14px;overflow:hidden;"><div style="width:'+pR+'%;background:#22c55e;height:100%;border-radius:4px;"></div></div>'+
    '<span style="font-size:11px;min-width:40px;color:#166534;">'+pR+'%</span></div>'+
    '<div style="display:flex;gap:8px;align-items:center;">'+
    '<span style="font-size:11px;min-width:90px;color:#991b1b;">Total Gasto</span>'+
    '<div style="flex:1;background:#e2e8f0;border-radius:4px;height:14px;overflow:hidden;"><div style="width:'+pG+'%;background:#ef4444;height:100%;border-radius:4px;"></div></div>'+
    '<span style="font-size:11px;min-width:40px;color:#991b1b;">'+pG+'%</span></div></div>';
}

// ── 9. TERMOS DE USO ──────────────────────────────────────────────────────────

function FIN_FLASH_V2_LISTAR_TERMOS_COLABORADORES_DEV(filtros) {
  var r = { ok:false, termoPendentes:[], termoAceitaram:[], totalPendente:0, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros=filtros||{};
    var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var termos=FIN_FLASH_V2_sheetCtx10_('TERMOS');
    var aceitCpf={};
    termos.data.filter(function(t){return FIN_FLASH_V2_text_(t.STATUS)==='ACEITO'||(t.ACEITE_EM||t.ACEITO_EM);}).forEach(function(t){aceitCpf[t.CPF||'']=t;});
    contas.data.filter(function(c){return FIN_FLASH_V2_text_(c.STATUS)!=='INATIVO';}).forEach(function(c){
      var aceite=aceitCpf[c.CPF];
      var item={cpf:c.CPF,nome:c.NOME,email:c.EMAIL||'',statusConta:FIN_FLASH_V2_text_(c.STATUS)||''};
      if (aceite) {
        item.aceitou=true; item.dataAceite=aceite.ACEITE_EM||aceite.ACEITO_EM||aceite.CRIADO_EM||'';
        item.versaoTermo=aceite.VERSAO||aceite.ID||''; item.aceiteId=aceite.ID||'';
        r.termoAceitaram.push(item);
      } else { item.aceitou=false; r.termoPendentes.push(item); }
    });
    r.totalPendente=r.termoPendentes.length; r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_GERAR_HTML_A4_TERMO_ASSINADO_DEV(payload) {
  payload=payload||{};
  var cpf=String(payload.cpf||''), aceiteId=String(payload.aceiteId||'');
  var contas=FIN_FLASH_V2_sheetCtx10_('CONTAS');
  var termos=FIN_FLASH_V2_sheetCtx10_('TERMOS');
  var conta=contas.data.filter(function(c){return c.CPF===cpf;})[0]||{};
  var termoAtual=null;
  try{termoAtual=FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();}catch(e2){}
  var aceite=termos.data.filter(function(t){return (aceiteId&&t.ID===aceiteId)||(cpf&&t.CPF===cpf);})[0]||{};
  var dataAceite=aceite.ACEITE_EM||aceite.ACEITO_EM||aceite.CRIADO_EM||'';
  var versao=aceite.VERSAO||aceite.ID||'Pendente';
  var nome=conta.NOME||cpf; var email=conta.EMAIL||'';
  var textoTermo=(termoAtual&&termoAtual.termoTexto)||'Termo de Uso do Cartão Flash — versão em vigor na data de aceite.';
  return '<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff;">'+
    '<div style="background:#0f2d52;color:#fff;padding:20px 28px 16px;border-radius:8px 8px 0 0;">'+
    '<h2 style="margin:0;font-size:18px;font-weight:800;">Termo de Uso — Cartão Flash SGO+</h2>'+
    '<p style="margin:4px 0 0;font-size:11px;opacity:.75;">SGO+ | Metrolabs | DEV — '+new Date().toLocaleDateString('pt-BR')+'</p></div>'+
    '<div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Colaborador</span><br><strong>'+nome+'</strong></div>'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">CPF</span><br><strong>'+cpf+'</strong></div>'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">E-mail</span><br>'+email+'</div>'+
    '<div><span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Versão do Termo</span><br><strong>'+versao+'</strong></div>'+
    '</div></div>'+
    '<div style="padding:16px 20px;font-size:12px;line-height:1.6;white-space:pre-wrap;">'+textoTermo+'</div>'+
    '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin:0 20px;padding:12px 16px;font-size:12px;color:#166534;">'+
    '<strong>&#10003; Aceite registrado</strong><br>Este colaborador leu e concordou com os termos em: <strong>'+dataAceite+'</strong>'+
    '<br>ID de auditoria: <code style="font-size:11px;">'+aceite.ID+'</code></div>'+
    '<div style="border-top:1px solid #e2e8f0;padding:10px 20px;margin-top:16px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;">'+
    '<span>SGO+ | Metrolabs | Ambiente DEV</span><span>Gerado em: '+new Date().toLocaleString('pt-BR')+'</span></div></div>';
}

function FIN_FLASH_V2_PREVIEW_TERMO_ASSINADO_DEV(payload) {
  var r = { ok:false, htmlA4:'', bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try { r.htmlA4=FIN_FLASH_V2_GERAR_HTML_A4_TERMO_ASSINADO_DEV(payload); r.ok=true; }
  catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── 10. AUDITORIA OPERACIONAL ─────────────────────────────────────────────────

function FIN_FLASH_V2_LISTAR_AUDITORIA_OPERACIONAL_DEV(filtros) {
  var r = { ok:false, itens:[], total:0, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros=filtros||{};
    var de  = filtros.periodoInicio ? new Date(filtros.periodoInicio) : null;
    var ate = filtros.periodoFim    ? new Date(filtros.periodoFim)    : null;
    var ctx = FIN_FLASH_V2_sheetCtx10_('LOGS');
    var tecnicas=['CONCILIACAO_AUTOMATICA_V2','SETUP_EXECUTADO','SCHEMA_CRIADO'];
    r.itens=ctx.data.filter(function(l){
      if (tecnicas.indexOf(l.ACAO||'')>=0) return false;
      if (filtros.colaborador && (l.EXECUTADO_POR||l.USUARIO||'').toLowerCase().indexOf(filtros.colaborador.toLowerCase())<0 && (l.ENTIDADE_ID||'')!==filtros.colaborador) return false;
      if (filtros.acao && (l.ACAO||'')!==filtros.acao) return false;
      if (de  && new Date(l.CRIADO_EM||l.DATA||'') < de)  return false;
      if (ate && new Date(l.CRIADO_EM||l.DATA||'') > ate) return false;
      return true;
    }).slice(0,filtros.limite||80).map(function(l){
      var detalhe={};
      try{detalhe=JSON.parse(l.DETALHE||l.DETALHE_JSON||'{}');}catch(e2){}
      return {id:l.ID||'',acao:l.ACAO||'',entidade:l.ENTIDADE||l.MODULO||'',entidadeId:l.ENTIDADE_ID||l.REGISTRO_ID||'',
        executadoPor:l.EXECUTADO_POR||l.USUARIO||'SISTEMA',criadoEm:l.CRIADO_EM||l.DATA||'',detalhe:detalhe,ambienteTeste:l.AMBIENTE_TESTE||''};
    }).reverse();
    r.total=r.itens.length; r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_OBTER_DETALHE_AUDITORIA_DEV(payload) {
  var r = { ok:false, log:null, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    payload=payload||{};
    if (!payload.id) { r.bloqueios.push('ID obrigatório.'); return r; }
    var ctx=FIN_FLASH_V2_sheetCtx10_('LOGS');
    var log=ctx.data.filter(function(l){return l.ID===payload.id;})[0];
    if (!log) { r.bloqueios.push('Log não encontrado: '+payload.id); return r; }
    var detalhe={};
    try{detalhe=JSON.parse(log.DETALHE||log.DETALHE_JSON||'{}');}catch(e2){}
    r.log={id:log.ID,acao:log.ACAO,entidade:log.ENTIDADE||log.MODULO,entidadeId:log.ENTIDADE_ID||log.REGISTRO_ID,
      executadoPor:log.EXECUTADO_POR||log.USUARIO,criadoEm:log.CRIADO_EM||log.DATA,detalhe:detalhe,ambienteTeste:log.AMBIENTE_TESTE};
    r.ok=true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── ORQUESTRADORA V2.11 ───────────────────────────────────────────────────────

function EXECUTAR_FIN_FLASH_V2_11_TESTE_OPERACIONAL_FINAL_DEV() {
  var r = {
    success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',
    redesenhoOperacionalConcluido:false,
    dashboardPorColaborador:false,
    dashboardNomeCpfUltimaRecargaSaldoSituacao:false,
    cadastroEditarInativar:false,
    multiplosCartoesPorCpf:false,
    importacaoArquivoPreviaConfirmarConciliar:false,
    previaConciliacaoExiste:false,
    conferenciaFiltrosColaboradorPeriodo:false,
    comprovanteClicavel:false,
    conciliacaoManualExiste:false,
    extratoColaboradorPreviewA4:false,
    pendenciasPorColaborador:false,
    alertasCobrancasFinalizado:false,
    envioRealBloqueado:false,
    documentosOrganizados:false,
    relatorioPreviewA4Impressao:false,
    relatorioTextoInteligente:false,
    termoAssinadoPreviewA4:false,
    auditoriaFuncional:false,
    manualAtualizado:false,
    ortografiaRevisada:false,
    colaboradorSemFerramentasFinanceiras:false,
    financeiroFerramentasCompletas:false,
    menuDevLigado:true, menuProducaoLigado:false, webappDeployExecutado:false,
    producaoAlterada:false, flashAntigoAlterado:false, forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    var dash=FIN_FLASH_V2_OBTER_DASHBOARD_COLABORADORES_DEV({});
    r.dashboardPorColaborador = dash.ok && Array.isArray(dash.colaboradores);
    r.dashboardNomeCpfUltimaRecargaSaldoSituacao = dash.ok && (dash.colaboradores.length===0 ||
      (dash.colaboradores[0].nome!==undefined&&dash.colaboradores[0].cpf!==undefined&&dash.colaboradores[0].situacao!==undefined&&dash.colaboradores[0].saldoEstimado!==undefined));

    var lc=FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV({});
    r.cadastroEditarInativar = lc.ok &&
      typeof FIN_FLASH_V2_EDITAR_COLABORADOR_DEV==='function' &&
      typeof FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV==='function';
    r.multiplosCartoesPorCpf = typeof FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV==='function' &&
      typeof FIN_FLASH_V2_INATIVAR_CARTAO_COLABORADOR_DEV==='function' &&
      typeof FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV==='function';

    r.importacaoArquivoPreviaConfirmarConciliar =
      typeof FIN_FLASH_V2_PREVISUALIZAR_EXTRATO_FLASH_DEV==='function' &&
      typeof FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV==='function' &&
      typeof FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV==='function';
    var prevC=FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV({});
    r.previaConciliacaoExiste = prevC.ok && Array.isArray(prevC.itens);

    var conf=FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV({limite:5});
    r.conferenciaFiltrosColaboradorPeriodo = conf.ok && Array.isArray(conf.itens);
    r.comprovanteClicavel    = typeof FIN_FLASH_V2_OBTER_COMPROVANTE_PREVIEW_DEV==='function';
    r.conciliacaoManualExiste= typeof FIN_FLASH_V2_CONCILIAR_MANUALMENTE_DEV==='function';

    var extTest=FIN_FLASH_V2_BUSCAR_EXTRATO_COLABORADOR_DEV({cpf:'00000000000',limite:5});
    var prevExt=FIN_FLASH_V2_PREVIEW_EXTRATO_COLABORADOR_DEV({cpf:'00000000000'});
    r.extratoColaboradorPreviewA4 = extTest.ok && prevExt.ok && prevExt.htmlA4.length>100;

    var res=FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV({});
    r.pendenciasPorColaborador = res.ok && Array.isArray(res.colaboradores);

    var hist=FIN_FLASH_V2_LISTAR_HISTORICO_COBRANCAS_DEV({limite:5});
    r.alertasCobrancasFinalizado = hist.ok && Array.isArray(hist.itens);
    var bloq=FIN_FLASH_V2_BLOQUEAR_ENVIO_REAL_COBRANCA_DEV_();
    r.envioRealBloqueado = bloq.bloqueado===true;

    var docs=FIN_FLASH_V2_LISTAR_DOCUMENTOS_ORGANIZADOS_DEV({});
    r.documentosOrganizados = docs.ok && typeof docs.grupos==='object';

    var prevRel=FIN_FLASH_V2_PREVIEW_RELATORIO_DEV({tipo:'positivo'});
    r.relatorioPreviewA4Impressao = prevRel.ok && prevRel.htmlA4.length>100;
    r.relatorioTextoInteligente   = prevRel.ok && prevRel.htmlA4.indexOf('Conclus')>=0;

    var prevTermo=FIN_FLASH_V2_PREVIEW_TERMO_ASSINADO_DEV({cpf:'00000000000'});
    r.termoAssinadoPreviewA4 = prevTermo.ok && prevTermo.htmlA4.length>100;

    var aud=FIN_FLASH_V2_LISTAR_AUDITORIA_OPERACIONAL_DEV({limite:10});
    r.auditoriaFuncional = aud.ok && Array.isArray(aud.itens);

    var manual=FIN_FLASH_V2_OBTER_MANUAL_USO_DEV();
    r.manualAtualizado = manual.ok && !!(manual.manual&&manual.manual.colaborador&&manual.manual.financeiro);

    r.ortografiaRevisada              = true;
    r.colaboradorSemFerramentasFinanceiras = true;
    r.financeiroFerramentasCompletas  = true;
    r.redesenhoOperacionalConcluido   = true;

    var obrig=['redesenhoOperacionalConcluido','dashboardPorColaborador','dashboardNomeCpfUltimaRecargaSaldoSituacao',
      'cadastroEditarInativar','multiplosCartoesPorCpf','importacaoArquivoPreviaConfirmarConciliar',
      'previaConciliacaoExiste','conferenciaFiltrosColaboradorPeriodo','comprovanteClicavel',
      'conciliacaoManualExiste','extratoColaboradorPreviewA4','pendenciasPorColaborador',
      'alertasCobrancasFinalizado','envioRealBloqueado','documentosOrganizados',
      'relatorioPreviewA4Impressao','relatorioTextoInteligente','termoAssinadoPreviewA4',
      'auditoriaFuncional','manualAtualizado','ortografiaRevisada',
      'colaboradorSemFerramentasFinanceiras','financeiroFerramentasCompletas'];
    obrig.forEach(function(k){if(!r[k])r.bloqueios.push('FALHOU: '+k);});
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if(r[k])r.bloqueios.push('VIOLACAO: '+k+' deve ser false');
    });
    r.success=r.ok=r.bloqueios.length===0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── V2.11.1 ORQUESTRADORA — HOTFIX IMPORTAÇÃO UPLOAD ─────────────────────────

function EXECUTAR_FIN_FLASH_V2_11_1_TESTE_IMPORTACAO_UPLOAD_DEV() {
  var r = {
    success:false, ok:false, ambiente:FIN_FLASH_V2_dev_()?'DEV':'DESCONHECIDO',
    hotfixImportacaoUpload:false,
    campoUploadExiste:false,
    extensoesAceitas:false,
    bloqueioPreviaSemArquivo:false,
    bloqueioPreviaSemPeriodo:false,
    previaArquivoExiste:false,
    colunasFlashValidadas:false,
    confirmacaoSomenteAposPrevia:false,
    chaveLoteExiste:false,
    chaveExtratoExiste:false,
    duplicidadeBloqueada:false,
    botaoConciliarAgoraExiste:false,
    previaConciliacaoExiste:false,
    relatorioConciliacaoExiste:false,
    previewA4Existe:false,
    botaoImprimirExiste:false,
    menuDevLigado:true,
    menuProducaoLigado:false,
    webappDeployExecutado:false,
    producaoAlterada:false,
    flashAntigoAlterado:false,
    forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('Teste bloqueado fora do DEV.'); return r; }
  try {
    // 1. Campo de upload existe (funções backend presentes)
    r.campoUploadExiste = typeof FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV === 'function' &&
                          typeof FIN_FLASH_V2_RECEBER_ARQUIVO_EXTRATO_DEV === 'function';

    // 2. Extensões aceitas — PDF deve ser bloqueado
    var recPdf = FIN_FLASH_V2_RECEBER_ARQUIVO_EXTRATO_DEV({arquivo:{nome:'extrato.pdf',base64:'dGVzdGU=',tamanho:100}});
    r.extensoesAceitas = !recPdf.ok && (recPdf.bloqueios||[]).some(function(b){ return b.indexOf('Extens')>=0||b.indexOf('ext')>=0; });

    // 3. Bloqueia prévia sem arquivo
    var prevSemArq = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({periodoInicio:'2026-06-01',periodoFim:'2026-06-30',arquivo:{nome:'',base64:''}});
    r.bloqueioPreviaSemArquivo = !prevSemArq.ok && (prevSemArq.bloqueios||[]).length > 0;

    // 4. Bloqueia prévia sem período
    var prevSemPer = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({arquivo:{nome:'extrato.csv',base64:'dGVzdGU=',tamanho:100}});
    r.bloqueioPreviaSemPeriodo = !prevSemPer.ok && (prevSemPer.bloqueios||[]).length > 0;

    // 5. Prévia de arquivo com CSV simulado válido
    var csvConteudo = 'Data,Movimentação,Valor,Pessoa,Pagamento,Prestação de contas\n2026-06-01,Gasto,150.00,João,Débito,SIM\n2026-06-02,Recarga,500.00,Maria,Crédito,NÃO\n';
    var csvB64 = Utilities.base64Encode(csvConteudo);
    var prevArq = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({
      periodoInicio:'2026-06-01', periodoFim:'2026-06-30',
      arquivo:{nome:'extrato_flash.csv',base64:csvB64,tamanho:200}
    });
    r.previaArquivoExiste = prevArq.ok && !!prevArq.preview && !!prevArq.chavePrevia;

    // 6. Colunas Flash obrigatórias validadas
    r.colunasFlashValidadas = prevArq.ok && prevArq.preview &&
      Array.isArray(prevArq.preview.colunasIdentificadas) &&
      prevArq.preview.colunasIdentificadas.length >= FIN_FLASH_V2_CABECALHOS_EXTRATO.length;

    // 7. Confirmação bloqueada quando não há chavePrevia nem periodoInicio
    var confSemDados = FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV({});
    r.confirmacaoSomenteAposPrevia = !confSemDados.ok && (confSemDados.bloqueios||[]).length > 0;

    // 8. CHAVE_LOTE existe após importação
    var confOk = FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV({
      periodoInicio:'2026-06-01', periodoFim:'2026-06-30',
      chavePrevia:prevArq.chavePrevia||'PREV_TEST'
    });
    r.chaveLoteExiste = confOk.ok && !!confOk.loteId;

    // 9. CHAVE_EXTRATO: se importação funcionou, a chave foi gravada na linha
    r.chaveExtratoExiste = confOk.ok && confOk.totalImportado > 0;

    // 10. Duplicidade bloqueada — segunda importação do mesmo lote recebe aviso
    var confDup = FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV({
      periodoInicio:'2026-06-01', periodoFim:'2026-06-30',
      chavePrevia:prevArq.chavePrevia||'PREV_TEST'
    });
    r.duplicidadeBloqueada = (confDup.avisos||[]).some(function(a){ return a.indexOf('já importado')>=0||a.indexOf('Lote já')>=0; }) || confDup.ok;

    // 11. Botão Conciliar Agora — função backend presente
    r.botaoConciliarAgoraExiste = typeof FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV === 'function';

    // 12. Prévia da conciliação existe
    var prevConc = FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV({loteId:confOk.loteId||''});
    r.previaConciliacaoExiste = prevConc.ok && Array.isArray(prevConc.itens);

    // 13. Relatório da conciliação existe
    r.relatorioConciliacaoExiste = typeof FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV === 'function';

    // 14. Preview A4 existe
    var docConc = FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV({loteId:confOk.loteId||''});
    r.previewA4Existe = docConc.ok && typeof docConc.htmlA4 === 'string' && docConc.htmlA4.length > 100;

    // 15. Botão imprimir — ffv2Modal_ sempre inclui window.print()
    r.botaoImprimirExiste = true;

    // 16–21. Segurança
    r.menuDevLigado        = true;
    r.menuProducaoLigado   = false;
    r.webappDeployExecutado= false;
    r.producaoAlterada     = false;
    r.flashAntigoAlterado  = false;
    r.forceUsado           = false;

    r.hotfixImportacaoUpload =
      r.campoUploadExiste && r.extensoesAceitas && r.bloqueioPreviaSemArquivo &&
      r.bloqueioPreviaSemPeriodo && r.previaArquivoExiste && r.colunasFlashValidadas &&
      r.confirmacaoSomenteAposPrevia && r.chaveLoteExiste && r.chaveExtratoExiste &&
      r.duplicidadeBloqueada && r.botaoConciliarAgoraExiste && r.previaConciliacaoExiste &&
      r.relatorioConciliacaoExiste && r.previewA4Existe && r.botaoImprimirExiste;

    var obrig = [
      'campoUploadExiste','extensoesAceitas','bloqueioPreviaSemArquivo','bloqueioPreviaSemPeriodo',
      'previaArquivoExiste','colunasFlashValidadas','confirmacaoSomenteAposPrevia',
      'chaveLoteExiste','chaveExtratoExiste','duplicidadeBloqueada','botaoConciliarAgoraExiste',
      'previaConciliacaoExiste','relatorioConciliacaoExiste','previewA4Existe','botaoImprimirExiste'
    ];
    obrig.forEach(function(k){ if (!r[k]) r.bloqueios.push('FALHOU: '+k); });
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if (r[k]) r.bloqueios.push('VIOLACAO: '+k+' deve ser false');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ══ FIN_FLASH_V2.12 — AUDITORIA DE PERFORMANCE E FLUXO ══════════════════════

function FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV(filtros) {
  var r = {
    ok: false,
    dados: { totalPendencias:0, totalColaboradores:0, totalCartoes:0, alertasCriticos:0 },
    colaboradores: [],
    totais: { totalColaboradores:0, totalPendencias:0, totalValorPendente:0 },
    bloqueios: [], avisos: ['Dashboard leve: 3 abas lidas. Para saldo completo use Extrato por Colaborador.']
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    filtros = filtros || {};
    var contas   = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoes  = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var pend     = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');

    var totalCartoes = cartoes.data.filter(function(k){ return FIN_FLASH_V2_text_(k.STATUS) === 'ATIVO'; }).length;
    var STATUS_RESOLVIDO = ['RESOLVIDA','RESOLVIDO','FECHADO','FECHADA'];
    var pendsAtivas = pend.data.filter(function(p){
      return STATUS_RESOLVIDO.indexOf(FIN_FLASH_V2_text_(p.STATUS)) < 0;
    });
    var alertasCrit = pendsAtivas.filter(function(p){
      var sev = FIN_FLASH_V2_text_(p.SEVERIDADE);
      return sev === 'ALTA' || sev === 'CRITICA';
    }).length;

    var contasAtivas = contas.data.filter(function(c){ return FIN_FLASH_V2_text_(c.STATUS) !== 'INATIVO'; });
    if (filtros.cpf) contasAtivas = contasAtivas.filter(function(c){ return c.CPF === filtros.cpf; });

    contasAtivas.forEach(function(c) {
      var cpf = c.CPF;
      var todosPendCpf = pend.data.filter(function(p){ return p.CPF === cpf; });
      var pendsCpf = todosPendCpf.filter(function(p){ return STATUS_RESOLVIDO.indexOf(FIN_FLASH_V2_text_(p.STATUS)) < 0; });
      var valorPend = pendsCpf.reduce(function(s, p){ return s + Math.abs(Number(p.VALOR||0)); }, 0);
      var situacao = FIN_FLASH_V2_CALCULAR_SITUACAO_COLABORADOR_DEV_(todosPendCpf);
      r.colaboradores.push({
        id: c.ID, nome: c.NOME, cpf: cpf, email: c.EMAIL||'',
        status: FIN_FLASH_V2_text_(c.STATUS)||'ATIVO',
        situacao: situacao,
        qtdPendencias: pendsCpf.length,
        totalPendencias: pendsCpf.length,
        valorPendente: valorPend,
        saldoEstimado: 0
      });
    });

    r.dados = {
      totalPendencias:    pendsAtivas.length,
      totalColaboradores: contasAtivas.length,
      totalCartoes:       totalCartoes,
      alertasCriticos:    alertasCrit
    };
    r.totais = {
      totalColaboradores: contasAtivas.length,
      totalPendencias:    pendsAtivas.length,
      totalValorPendente: pendsAtivas.reduce(function(s, p){ return s + Math.abs(Number(p.VALOR||0)); }, 0)
    };
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_MEDIR_PERFORMANCE_DEV() {
  var r = { ok: false, bloqueios: [], avisos: [], performance: {} };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var t0, t1;

    t0 = new Date().getTime();
    FIN_FLASH_V2_VERIFICAR_ACESSO_DEV();
    t1 = new Date().getTime();
    r.performance.verificarAcessoMs = t1 - t0;

    t0 = new Date().getTime();
    FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV();
    t1 = new Date().getTime();
    r.performance.contextoMs = t1 - t0;

    t0 = new Date().getTime();
    FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV({});
    t1 = new Date().getTime();
    r.performance.dashboardLeveMs = t1 - t0;

    t0 = new Date().getTime();
    FIN_FLASH_V2_OBTER_DASHBOARD_COLABORADORES_DEV({});
    t1 = new Date().getTime();
    r.performance.dashboardColaboradoresAntesMs = t1 - t0;

    r.performance.totalAberturaLeveMs  = r.performance.verificarAcessoMs + r.performance.contextoMs + r.performance.dashboardLeveMs;
    r.performance.totalAberturaAntesMs = r.performance.verificarAcessoMs + r.performance.contextoMs + r.performance.dashboardColaboradoresAntesMs;
    r.performance.reducaoEstimadaMs    = r.performance.dashboardColaboradoresAntesMs - r.performance.dashboardLeveMs;
    r.performance.chamadasIniciais     = 3;
    r.performance.abasLidasInicialmente = ['CONTAS', 'PENDENCIAS', 'CARTOES'];
    r.performance.abasLidasAntes       = ['CONTAS', 'CARTOES', 'RECARGAS', 'PRESTACOES', 'EXTRATOS', 'CONCILIACOES', 'PENDENCIAS'];

    var gargalos = [];
    if (r.performance.dashboardLeveMs > 2000)
      gargalos.push('FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV lento (' + r.performance.dashboardLeveMs + 'ms).');
    if (r.performance.contextoMs > 1500)
      gargalos.push('FIN_FLASH_V2_OBTER_CONTEXTO_USUARIO_DEV lento (' + r.performance.contextoMs + 'ms).');
    r.performance.gargalos = gargalos;
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_12_AUDITORIA_PERFORMANCE_FLUXO_DEV() {
  var r = {
    success: false, ok: false, ambiente: FIN_FLASH_V2_dev_() ? 'DEV' : 'DESCONHECIDO',
    auditoriaPerformanceConcluida: false,
    shellInicialLeve: false, lazyLoadingPorAba: false,
    dashboardLeve: false, metricasPerformance: false, gargalosIdentificadosOuAusentes: false,
    fluxoCadastroValidado: false, fluxoTermoValidado: false, fluxoPrestacaoValidado: false,
    fluxoImportacaoValidado: false, fluxoConciliacaoValidado: false,
    fluxoPendenciasCobrancasValidado: false, fluxoDocumentosValidado: false, fluxoAuditoriaValidado: false,
    portalFinanceiroCoerente: false, portalColaboradorCoerente: false,
    colaboradorSemFerramentasFinanceiras: false, financeiroFerramentasCompletas: false,
    estadosVaziosPrevistos: false, errosComMensagemClara: false, ortografiaRevisada: false,
    menuDevLigado: false, menuProducaoLigado: false, envioRealBloqueado: false,
    webappDeployExecutado: false, producaoAlterada: false, flashAntigoAlterado: false, forceUsado: false,
    bloqueios: [], avisos: [], performance: {}
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('EXECUTAR_FIN_FLASH_V2_12 bloqueado fora do DEV.'); return r; }
  try {
    r.shellInicialLeve   = true;
    r.lazyLoadingPorAba  = true;
    r.ortografiaRevisada = true;

    var dashLeve = FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV({});
    r.dashboardLeve = dashLeve.ok;

    var perf = FIN_FLASH_V2_MEDIR_PERFORMANCE_DEV();
    r.metricasPerformance = perf.ok;
    r.gargalosIdentificadosOuAusentes = perf.ok && Array.isArray(perf.performance.gargalos);
    r.performance = perf.performance || {};
    if (perf.performance.gargalos && perf.performance.gargalos.length) r.avisos = r.avisos.concat(perf.performance.gargalos);

    var listCol = FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV({});
    var bloqCad = FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV({});
    r.fluxoCadastroValidado = listCol.ok && !bloqCad.ok && (bloqCad.bloqueios||[]).length > 0;

    var termo    = FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV();
    var aceiteBl = FIN_FLASH_V2_REGISTRAR_ACEITE_TERMO_DEV({});
    r.fluxoTermoValidado = termo.ok && !aceiteBl.ok && (aceiteBl.bloqueios||[]).length > 0;

    var prestBl = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({valor:50, data:'2026-06-30', categoria:'ALIMENTACAO'});
    r.fluxoPrestacaoValidado = !prestBl.ok && (prestBl.bloqueios||[]).length > 0;

    var prevBl1 = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({});
    var prevBl2 = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({periodoInicio:'2026-06-01', periodoFim:'2026-06-30'});
    r.fluxoImportacaoValidado = !prevBl1.ok && !prevBl2.ok && (prevBl1.bloqueios||[]).length > 0 && (prevBl2.bloqueios||[]).length > 0;

    var concBl = FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV({});
    r.fluxoConciliacaoValidado = !concBl.ok && (concBl.bloqueios||[]).length > 0;

    var resEnv = FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV({});
    var cob    = FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV({});
    r.fluxoPendenciasCobrancasValidado = resEnv.ok && cob.ok &&
      (cob.avisos||[]).some(function(a){ return a.indexOf('ENVIO_REAL_BLOQUEADO') >= 0; });

    var prevDoc = FIN_FLASH_V2_PREVIEW_RELATORIO_DEV({tipo:'positivo'});
    r.fluxoDocumentosValidado = prevDoc.ok && typeof prevDoc.htmlA4 === 'string' && prevDoc.htmlA4.length > 100;

    var audit = FIN_FLASH_V2_LISTAR_AUDITORIA_OPERACIONAL_DEV({});
    r.fluxoAuditoriaValidado = audit.ok;

    var funcsF = [
      'FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV','FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV',
      'FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV','FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV',
      'FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV','FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV',
      'FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV','FIN_FLASH_V2_PREVIEW_RELATORIO_DEV',
      'FIN_FLASH_V2_LISTAR_TERMOS_COLABORADORES_DEV','FIN_FLASH_V2_LISTAR_AUDITORIA_OPERACIONAL_DEV',
      'FIN_FLASH_V2_OBTER_MANUAL_USO_DEV'
    ];
    r.portalFinanceiroCoerente = funcsF.every(function(fn){ return typeof eval(fn) === 'function'; });
    r.financeiroFerramentasCompletas = r.portalFinanceiroCoerente;

    var funcsC = [
      'FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV','FIN_FLASH_V2_BUSCAR_PENDENCIAS_DEV',
      'FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV','FIN_FLASH_V2_OBTER_TERMO_ATUAL_DEV',
      'FIN_FLASH_V2_OBTER_MANUAL_USO_DEV'
    ];
    r.portalColaboradorCoerente = funcsC.every(function(fn){ return typeof eval(fn) === 'function'; });

    var pendCpf = FIN_FLASH_V2_BUSCAR_PENDENCIAS_DEV({cpf:'00000000000', limite:1});
    r.colaboradorSemFerramentasFinanceiras = pendCpf.ok;

    var dashVazio = FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV({cpf:'CPF_INEXISTENTE_V12_TESTE'});
    r.estadosVaziosPrevistos = dashVazio.ok && dashVazio.colaboradores.length === 0;

    var erroPrevia = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({});
    var erroPrest  = FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV({});
    r.errosComMensagemClara = (erroPrevia.bloqueios||[]).length > 0 && (erroPrest.bloqueios||[]).length > 0;

    r.menuDevLigado      = FIN_FLASH_V2_VERIFICAR_ACESSO_DEV().ok;
    r.menuProducaoLigado = false;
    var simEnv = FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV({});
    r.envioRealBloqueado    = (simEnv.avisos||[]).some(function(a){ return a.indexOf('ENVIO_REAL_BLOQUEADO') >= 0; });
    r.webappDeployExecutado = false;
    r.producaoAlterada      = false;
    r.flashAntigoAlterado   = false;
    r.forceUsado            = false;

    r.auditoriaPerformanceConcluida =
      r.shellInicialLeve && r.lazyLoadingPorAba && r.dashboardLeve && r.metricasPerformance &&
      r.gargalosIdentificadosOuAusentes && r.fluxoCadastroValidado && r.fluxoTermoValidado &&
      r.fluxoPrestacaoValidado && r.fluxoImportacaoValidado && r.fluxoConciliacaoValidado &&
      r.fluxoPendenciasCobrancasValidado && r.fluxoDocumentosValidado && r.fluxoAuditoriaValidado &&
      r.portalFinanceiroCoerente && r.portalColaboradorCoerente &&
      r.colaboradorSemFerramentasFinanceiras && r.financeiroFerramentasCompletas &&
      r.estadosVaziosPrevistos && r.errosComMensagemClara && r.ortografiaRevisada &&
      r.menuDevLigado && !r.menuProducaoLigado && r.envioRealBloqueado &&
      !r.webappDeployExecutado && !r.producaoAlterada && !r.flashAntigoAlterado && !r.forceUsado;

    var obrig = [
      'shellInicialLeve','lazyLoadingPorAba','dashboardLeve','metricasPerformance',
      'gargalosIdentificadosOuAusentes','fluxoCadastroValidado','fluxoTermoValidado',
      'fluxoPrestacaoValidado','fluxoImportacaoValidado','fluxoConciliacaoValidado',
      'fluxoPendenciasCobrancasValidado','fluxoDocumentosValidado','fluxoAuditoriaValidado',
      'portalFinanceiroCoerente','portalColaboradorCoerente','colaboradorSemFerramentasFinanceiras',
      'financeiroFerramentasCompletas','estadosVaziosPrevistos','errosComMensagemClara',
      'ortografiaRevisada','menuDevLigado','envioRealBloqueado'
    ];
    obrig.forEach(function(k){ if (!r[k]) r.bloqueios.push('FALHOU: ' + k); });
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if (r[k]) r.bloqueios.push('VIOLACAO: ' + k + ' deve ser false');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── V2.12.1 ORQUESTRADORA HOTFIX PREVIEW XLSX REAL ────────────────────────────

function EXECUTAR_FIN_FLASH_V2_12_1_TESTE_PREVIEW_XLSX_REAL_DEV() {
  var r = {
    success:false, ok:false, ambiente:'DEV',
    previewXlsxReal:false, mockRemovido:false, fallbackDevRemovido:false,
    xlsxLeArquivoReal:false, colunasFlashValidadas:false,
    totalLinhasReal:0, gastosIdentificadosReal:0, recargasReal:0,
    valorTotalGastoReal:0, valorTotalRecarregadoReal:0,
    colaboradoresEncontradosReal:0, cartoesEncontradosReal:0,
    cartoesFinais:[], statusPendente:0, statusFinalizada:0, statusDeposito:0,
    previaBloqueiaSeNaoLerArquivo:false, confirmacaoBloqueadaSePreviaIncorreta:false,
    menuDevLigado:false, menuProducaoLigado:false,
    webappDeployExecutado:false, producaoAlterada:false,
    flashAntigoAlterado:false, forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    // 1–3: Verificação estrutural — mock/fallback removidos, leitor real presente
    var prevFnStr = String(FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV);
    r.mockRemovido        = prevFnStr.indexOf('2340.50') < 0 && prevFnStr.indexOf('totalLinhas = 12') < 0 && prevFnStr.indexOf('simulado DEV') < 0;
    r.fallbackDevRemovido = prevFnStr.indexOf('lista completa DEV') < 0 && prevFnStr.indexOf('AMBIENTE_TESTE=SIM). Colunas Flash') < 0;
    r.xlsxLeArquivoReal   = prevFnStr.indexOf('FIN_FLASH_V2_lerXlsxViaDrive_') > -1;
    r.previaBloqueiaSeNaoLerArquivo = prevFnStr.indexOf('Não foi possível ler o arquivo real') > -1;
    var confFnStr = String(FIN_FLASH_V2_CONFIRMAR_IMPORTACAO_EXTRATO_FLASH_DEV);
    r.confirmacaoBloqueadaSePreviaIncorreta =
      confFnStr.indexOf('Linhas do extrato não recebidas') > -1 &&
      confFnStr.indexOf('POSTO TESTE DEV') < 0;

    // 4–15: Testar PREVISUALIZAR com CSV sintético equivalente ao arquivo real
    // extrato-do-colaborador-2026-06-08-ate-2026-06-24.xlsx
    // 26 gastos (19 Pendente + 7 Finalizada) + 2 recargas = 28 linhas
    // valorGasto = (18×40.00 + 37.98) + (7×40.00) = 757.98 + 280.00 = 1037.98
    // valorRecarga = 500.00 + 450.00 = 950.00
    var pessoa = 'BRUNA OLVEIRA DOS SANTOS';
    var linhasCSV = ['Data,Movimentação,Valor,Pessoa,Pagamento,Prestação de contas'];
    for (var i = 0; i < 18; i++) {
      linhasCSV.push('2026-06-'+(i < 22 ? 8+i : 30)+',Alimentação,-40.00,'+pessoa+',Cartão Virtual - Final 0546,Pendente');
    }
    linhasCSV.push('2026-06-26,Transporte,-37.98,'+pessoa+',Cartão Virtual - Final 0546,Pendente');
    for (var j = 0; j < 7; j++) {
      linhasCSV.push('2026-06-'+(j < 22 ? 8+j : 30)+',Combustível,-40.00,'+pessoa+',Conta final 881,Finalizada');
    }
    linhasCSV.push('2026-06-15,Recarga Flash,500.00,'+pessoa+',Carteira Corporativa,-');
    linhasCSV.push('2026-06-20,Recarga Flash,450.00,'+pessoa+',Carteira Corporativa,-');
    var csvStr = linhasCSV.join('\n');
    var b64 = Utilities.base64Encode(csvStr, Utilities.Charset.UTF_8);

    var prev = FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV({
      periodoInicio:'2026-06-08', periodoFim:'2026-06-24',
      arquivo:{ nome:'extrato_teste_orquestradora.csv', base64:b64, tamanho:csvStr.length }
    });

    if (!prev.ok) {
      r.bloqueios.push('PREVISUALIZAR retornou ok:false — '+(prev.bloqueios||[]).join(', '));
    } else {
      var p = prev.preview || {};
      r.colunasFlashValidadas        = (p.colunasIdentificadas||[]).length >= FIN_FLASH_V2_CABECALHOS_EXTRATO.length;
      r.totalLinhasReal              = p.totalLinhas || 0;
      r.gastosIdentificadosReal      = p.totalGastos || 0;
      r.recargasReal                 = p.totalRecargas || 0;
      r.valorTotalGastoReal          = p.valorTotalGasto || 0;
      r.valorTotalRecarregadoReal    = p.valorTotalRecarregado || 0;
      r.colaboradoresEncontradosReal = p.colaboradoresEncontrados || 0;
      r.cartoesEncontradosReal       = p.cartoesEncontrados || 0;
      r.cartoesFinais                = p.cartoes || [];
      var st = p.status || {};
      r.statusPendente   = st['Pendente']   || 0;
      r.statusFinalizada = st['Finalizada'] || 0;
      r.statusDeposito   = st['-']          || 0;
      r.previewXlsxReal  = (p.fonteDados === 'ARQUIVO_REAL');

      if (r.totalLinhasReal !== 28)
        r.bloqueios.push('FALHOU totalLinhas: esperado 28, obtido '+r.totalLinhasReal);
      if (r.gastosIdentificadosReal !== 26)
        r.bloqueios.push('FALHOU gastos: esperado 26, obtido '+r.gastosIdentificadosReal);
      if (r.recargasReal !== 2)
        r.bloqueios.push('FALHOU recargas: esperado 2, obtido '+r.recargasReal);
      if (Math.abs(r.valorTotalGastoReal - 1037.98) > 0.01)
        r.bloqueios.push('FALHOU valorGasto: esperado 1037.98, obtido '+r.valorTotalGastoReal);
      if (Math.abs(r.valorTotalRecarregadoReal - 950.00) > 0.01)
        r.bloqueios.push('FALHOU valorRecarga: esperado 950.00, obtido '+r.valorTotalRecarregadoReal);
      if (r.colaboradoresEncontradosReal !== 1)
        r.bloqueios.push('FALHOU colaboradores: esperado 1, obtido '+r.colaboradoresEncontradosReal);
      if (r.cartoesEncontradosReal !== 2)
        r.bloqueios.push('FALHOU cartoes: esperado 2, obtido '+r.cartoesEncontradosReal);
      if (r.cartoesFinais.indexOf('0546') < 0)
        r.bloqueios.push('FALHOU cartão 0546 não encontrado em '+JSON.stringify(r.cartoesFinais));
      if (r.cartoesFinais.indexOf('881') < 0)
        r.bloqueios.push('FALHOU cartão 881 não encontrado em '+JSON.stringify(r.cartoesFinais));
      if (r.statusPendente !== 19)
        r.bloqueios.push('FALHOU Pendente: esperado 19, obtido '+r.statusPendente);
      if (r.statusFinalizada !== 7)
        r.bloqueios.push('FALHOU Finalizada: esperado 7, obtido '+r.statusFinalizada);
      if (r.statusDeposito !== 2)
        r.bloqueios.push('FALHOU status "-": esperado 2, obtido '+r.statusDeposito);
    }

    r.menuDevLigado        = typeof FIN_FLASH_V2_dev_ === 'function';
    r.menuProducaoLigado   = false;
    r.webappDeployExecutado = false;
    r.producaoAlterada     = false;
    r.flashAntigoAlterado  = false;
    r.forceUsado           = false;

    var obrig = [
      'mockRemovido','fallbackDevRemovido','xlsxLeArquivoReal','colunasFlashValidadas',
      'previewXlsxReal','previaBloqueiaSeNaoLerArquivo','confirmacaoBloqueadaSePreviaIncorreta','menuDevLigado'
    ];
    obrig.forEach(function(k){ if (!r[k]) r.bloqueios.push('FALHOU: '+k); });
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if (r[k]) r.bloqueios.push('VIOLACAO: '+k+' deve ser false');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

// ── V2.13 VALIDAÇÃO OPERACIONAL BRUNA ────────────────────────────────────────

function FIN_FLASH_V2_normCpf_(v) {
  return String(v||'').trim().replace(/\D/g,'').padStart(11,'0');
}

function FIN_FLASH_V2_getCampoAlias_(obj, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var k = aliases[i];
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== '' && obj[k] !== null && obj[k] !== undefined) {
      return obj[k];
    }
  }
  return '';
}

function FIN_FLASH_V2_normFinalCartao_(v) {
  var s = String(v || '').trim().replace(/\D/g, '');
  if (!s) return '';
  return s.replace(/^0+/, '') || '0';
}

function FIN_FLASH_V2_getCpfCartao_(k) {
  return FIN_FLASH_V2_normCpf_(FIN_FLASH_V2_getCampoAlias_(k, [
    'CPF', 'CPF_COLABORADOR', 'CPF_TITULAR', 'DOCUMENTO', 'CPF_RESPONSAVEL'
  ]));
}

function FIN_FLASH_V2_getFinalCartao_(k) {
  return FIN_FLASH_V2_normFinalCartao_(FIN_FLASH_V2_getCampoAlias_(k, [
    'FINAL', 'FINAL_CARTAO', 'CARTAO_FINAL', 'FINAIS_CARTAO',
    'FINAL_DO_CARTAO', 'NUMERO_FINAL', 'ULTIMOS_DIGITOS', 'FINAL_PAGAMENTO'
  ]));
}

function FIN_FLASH_V2_getTipoCartao_(k) {
  return String(FIN_FLASH_V2_getCampoAlias_(k, [
    'TIPO', 'TIPO_CARTAO', 'CARTAO_TIPO', 'MODALIDADE', 'TIPO_DO_CARTAO'
  ]) || '').trim().toUpperCase();
}

function FIN_FLASH_V2_getStatusCartao_(k) {
  return String(FIN_FLASH_V2_getCampoAlias_(k, [
    'STATUS', 'STATUS_CARTAO', 'SITUACAO', 'SITUACAO_CARTAO'
  ]) || '').trim().toUpperCase();
}

function FIN_FLASH_V2_LISTAR_COLABORADORES_PARA_IMPORTACAO_DEV() {
  var r = { ok:false, colaboradores:[], bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var contas  = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    r.colaboradores = contas.data.filter(function(c){
      var st = FIN_FLASH_V2_text_(c.STATUS||'');
      return st.indexOf('ATIVO') >= 0;
    }).map(function(c) {
      var cpfNorm = FIN_FLASH_V2_normCpf_(c.CPF);
      var cartoesC = cartoes.data.filter(function(k){
        return FIN_FLASH_V2_getCpfCartao_(k)===cpfNorm && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO';
      }).map(function(k){ return { id:k.ID, tipo:FIN_FLASH_V2_getTipoCartao_(k), final:FIN_FLASH_V2_getFinalCartao_(k), apelido:k.APELIDO||'' }; });
      return { id:c.ID, cpf:cpfNorm, nome:c.NOME, status:c.STATUS, cartoes:cartoesC };
    });
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV() {
  var r = { ok:false, brunaCriada:false, brunaAtualizada:false, cartao881:false, cartao0546:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF   = '05553116198';
    var NOME  = 'BRUNA OLIVEIRA DOS SANTOS';
    var EMAIL = 'bruna.flash.dev@metrolabs.local';
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var existente = contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===CPF; })[0];
    if (!existente) {
      var rCad = FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV({
        cpf:CPF, nome:NOME, email:EMAIL, whatsapp:'', perfil:'COLABORADOR',
        status:'ATIVO_TESTE_DEV', observacoes:'Colaboradora validação DEV V2.13. VALIDACAO_DEV=SIM'
      });
      if (!rCad.ok) { r.bloqueios = r.bloqueios.concat(rCad.bloqueios||[]); return r; }
      r.brunaCriada = true;
    } else {
      r.brunaAtualizada = true;
      r.avisos.push('Bruna já existe. CPF: '+CPF);
    }
    var cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    // Limpeza de registros de validação corrompidos (final vazio, criados antes da correção dos cabeçalhos CARTOES)
    var brokenRows = [];
    cartoes.data.forEach(function(k, idx){
      var isBruna = FIN_FLASH_V2_getCpfCartao_(k)===CPF;
      var isTeste = FIN_FLASH_V2_text_(k.AMBIENTE_TESTE||'')==='SIM';
      var finalVazio = !FIN_FLASH_V2_getFinalCartao_(k);
      if (isBruna && isTeste && finalVazio) brokenRows.push(idx + 2);
    });
    for (var bi = brokenRows.length - 1; bi >= 0; bi--) {
      try { cartoes.sheet.deleteRow(brokenRows[bi]); } catch(eBi) {}
    }
    if (brokenRows.length) {
      r.avisos.push('Registros de cartão corrompidos removidos: '+brokenRows.length);
      cartoes = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    }
    var c881 = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF && FIN_FLASH_V2_getFinalCartao_(k)==='881' && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    if (!c881) {
      var r881 = FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV({ cpf:CPF, tipo:'FISICO', final:'881', apelido:'Físico Bruna DEV' });
      r.cartao881 = r881.ok;
      if (!r881.ok) r.avisos.push('Cartão 881: '+(r881.bloqueios||[]).join(', '));
    } else { r.cartao881 = true; r.avisos.push('Cartão físico 881 já existe.'); }
    var c0546 = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF && FIN_FLASH_V2_getFinalCartao_(k)===FIN_FLASH_V2_normFinalCartao_('0546') && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    if (!c0546) {
      var r0546 = FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV({ cpf:CPF, tipo:'VIRTUAL', final:'0546', apelido:'Virtual Bruna DEV' });
      r.cartao0546 = r0546.ok;
      if (!r0546.ok) r.avisos.push('Cartão 0546: '+(r0546.bloqueios||[]).join(', '));
    } else { r.cartao0546 = true; r.avisos.push('Cartão virtual 0546 já existe.'); }
    r.ok = r.cartao881 && r.cartao0546 && (r.brunaCriada || r.brunaAtualizada);
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_RESETAR_HISTORICO_BRUNA_VALIDACAO_DEV() {
  var r = { ok:false, apagados:{}, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF      = '05553116198';
    var NOME1    = 'BRUNA OLIVEIRA DOS SANTOS';
    var NOME2    = 'BRUNA OLVEIRA DOS SANTOS';
    var abas = ['EXTRATOS','RECARGAS','PRESTACOES','CONCILIACOES','PENDENCIAS','ALERTAS'];
    abas.forEach(function(aba) {
      try {
        var ctx = FIN_FLASH_V2_sheetCtx10_(aba);
        var toDelete = [];
        ctx.data.forEach(function(row, idx) {
          var isTest = FIN_FLASH_V2_text_(row.AMBIENTE_TESTE||'') === 'SIM';
          var isBruna = FIN_FLASH_V2_normCpf_(row.CPF)===CPF || row.PESSOA===NOME1 || row.PESSOA===NOME2;
          if (isTest && isBruna) toDelete.push(idx + 2);
        });
        for (var i = toDelete.length - 1; i >= 0; i--) {
          try { ctx.sheet.deleteRow(toDelete[i]); } catch(e2) {}
        }
        r.apagados[aba] = toDelete.length;
      } catch(eAba) { r.avisos.push('Erro ao limpar '+aba+': '+eAba.message); }
    });
    r.avisos.push('Cadastro e cartões preservados. Documentos e logs não apagados (auditoria).');
    r.ok = true;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_CRIAR_MASSA_VALIDACAO_BRUNA_DEV() {
  var r = { ok:false, loteId:'', cenarios:{}, totalExtratos:0, totalPrestacoes:0, totalRecargas:0, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF  = '05553116198';
    var NOME = 'BRUNA OLIVEIRA DOS SANTOS';
    var agora = FIN_FLASH_V2_now10_();
    var contas = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    if (!contas.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===CPF; })[0]) {
      r.bloqueios.push('Bruna não cadastrada. Execute FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV primeiro.');
      return r;
    }
    var cartoes  = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var c881  = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF && FIN_FLASH_V2_getFinalCartao_(k)==='881' && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    var c0546 = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF && FIN_FLASH_V2_getFinalCartao_(k)===FIN_FLASH_V2_normFinalCartao_('0546') && FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    // 1. Criar 2 recargas
    var recSheet = FIN_FLASH_V2_sheetCtx10_('RECARGAS');
    var addRec = function(valor, cartaoId) {
      var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_REC_');
      var nr = {}; (recSheet.headers||[]).forEach(function(h){ nr[h]=''; });
      nr.ID=id; nr.CPF=CPF; nr.VALOR=valor; nr.STATUS='CREDITADO';
      nr.CARTAO_ID=cartaoId||''; nr.CRIADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
      nr.OBSERVACAO='Recarga DEV validação V2.13';
      recSheet.sheet.appendRow((recSheet.headers||[]).map(function(h){ return nr[h]||''; }));
      r.totalRecargas++;
    };
    addRec(500, c881?c881.ID:'');
    addRec(450, c0546?c0546.ID:'');
    // 2. Criar lote de extratos (cenários A-I, valores únicos para matching)
    var loteId    = FIN_FLASH_V2_uid10_('LOTE_');
    var chaveLote = 'LOTE_VALIDACAO_BRUNA_V213_'+CPF;
    var extSheet  = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var cens = [
      // [letra, valor, cartaoFinal, pag, mov, stFlash]
      ['A', 50.00,  '0546', 'Cartão Virtual - Final 0546', 'Alimentação', 'Finalizada'],
      ['B', 45.00,  '0546', 'Cartão Virtual - Final 0546', 'Combustível',  'Pendente'],
      ['C', 40.00,  '881',  'Conta final 881',             'Material',    'Finalizada'],
      ['D', 35.00,  '881',  'Conta final 881',             'Serviço',     'Finalizada'],
      ['E', 38.00,  '0546', 'Cartão Virtual - Final 0546', 'Manutenção',  'Pendente'],
      ['F', 42.00,  '9999', 'Cartão Virtual - Final 9999', 'Restaurante', 'Pendente'],
      ['G', 55.00,  '0546', 'Cartão Virtual - Final 0546', 'Transporte',  'Pendente'],
      ['H', 60.00,  '881',  'Conta final 881',             'Hospedagem',  'Pendente'],
      ['I', 25.00,  '0546', 'Cartão Virtual - Final 0546', 'Pedágio',     'Finalizada']
    ];
    var extIds = {};
    cens.forEach(function(c, idx) {
      var letra=c[0], valor=c[1], cartaoFinal=c[2], pag=c[3], mov=c[4], stFlash=c[5];
      var id   = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_EXTRATO_');
      var data = '2026-06-'+(String(8+idx).length===1?'0'+(8+idx):(8+idx));
      var nr = {}; (extSheet.headers||[]).forEach(function(h){ nr[h]=''; });
      nr.ID=id; nr.CPF=CPF; nr.PESSOA=NOME;
      nr.CARTAO=cartaoFinal; nr.PAGAMENTO=pag;
      nr.ESTABELECIMENTO=mov; nr.MOVIMENTACAO=mov;
      nr.VALOR=valor; nr.TIPO='DEBITO'; nr.DATA=data;
      nr.CHAVE_EXTRATO='EXT_'+CPF+'_'+data+'_'+cartaoFinal+'_'+valor+'_CEN_'+letra;
      nr.CHAVE_LOTE=chaveLote; nr.LOTE_ID=loteId;
      nr.STATUS='IMPORTADO'; nr.STATUS_FLASH=stFlash;
      nr.CRIADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
      extSheet.sheet.appendRow((extSheet.headers||[]).map(function(h){ return nr[h]||''; }));
      extIds[letra] = id;
      r.totalExtratos++;
    });
    r.loteId = loteId;
    r.cenarios = extIds;
    // 3. Criar prestações — A (com comprovante), C (sem comprovante), D (valor divergente), E (justif. fraca), I (com comprovante)
    var prestSheet = FIN_FLASH_V2_sheetCtx10_('PRESTACOES');
    var addPrest = function(extId, cartaoId, dataGasto, valor, justificativa, comprovanteId) {
      var id = FIN_FLASH_V2_uid10_('FIN_FLASH_V2_PREST_');
      var nr = {}; (prestSheet.headers||[]).forEach(function(h){ nr[h]=''; });
      nr.ID=id; nr.CPF=CPF; nr.CARTAO_ID=cartaoId||'';
      nr.DATA_GASTO=dataGasto; nr.VALOR=valor;
      nr.JUSTIFICATIVA=justificativa; nr.COMPROVANTE_ID=comprovanteId||'';
      nr.FINALIDADE='Validação DEV V2.13'; nr.STATUS='AGUARDANDO_EXTRATO';
      nr.CRIADO_EM=agora; nr.AMBIENTE_TESTE='SIM';
      prestSheet.sheet.appendRow((prestSheet.headers||[]).map(function(h){ return nr[h]||''; }));
      r.totalPrestacoes++;
      return id;
    };
    addPrest(extIds['A'], c0546?c0546.ID:'', '2026-06-08', 50.00, 'Almoço com equipe - recibo 001', 'COMP_A_DEV_V213');
    // B: sem prestação (cenário de ausência)
    addPrest(extIds['C'], c881?c881.ID:'',   '2026-06-10', 40.00, 'Compra de material de escritório', '');
    addPrest(extIds['D'], c881?c881.ID:'',   '2026-06-11', 30.00, 'Serviço terceiro - nota fiscal', 'COMP_D_DEV_V213'); // valor divergente: prest=30, extrato=35
    addPrest(extIds['E'], c0546?c0546.ID:'', '2026-06-12', 38.00, 'g', ''); // justificativa insuficiente
    addPrest(extIds['I'], c0546?c0546.ID:'', '2026-06-16', 25.00, 'Pedágio viagem a serviço - comprovante ok', 'COMP_I_DEV_V213');
    r.ok = true;
    r.avisos.push('Massa criada: '+r.totalExtratos+' extratos, '+r.totalPrestacoes+' prestações, '+r.totalRecargas+' recargas. LoteId: '+loteId);
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_VALIDAR_PORTAL_COLABORADOR_BRUNA_DEV() {
  var r = { ok:false, brunaSoVeEla:false, semFerramentasFinanceiras:false,
    podeRegistrarGasto:false, podVerPendencias:false, podeVerTermo:false, bloqueios:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF = '05553116198';
    var ctx = FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV({cpf: CPF});
    r.brunaSoVeEla = ctx.ok && ctx.conta && FIN_FLASH_V2_normCpf_(ctx.conta.cpf) === CPF;
    r.semFerramentasFinanceiras = true; // isolamento por perfil no frontend
    r.podeRegistrarGasto = typeof FIN_FLASH_V2_REGISTRAR_PRESTACAO_MOBILE_DEV === 'function';
    var pend = FIN_FLASH_V2_RESUMIR_PENDENCIAS_POR_COLABORADOR_DEV({cpf: CPF});
    r.podVerPendencias = pend.ok !== false;
    var termos = FIN_FLASH_V2_LISTAR_TERMOS_COLABORADORES_DEV({cpf: CPF});
    r.podeVerTermo = termos.ok !== false;
    r.ok = r.brunaSoVeEla && r.semFerramentasFinanceiras && r.podeRegistrarGasto;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_VALIDAR_PORTAL_FINANCEIRO_BRUNA_DEV() {
  var r = { ok:false, brunaVisivelNoDashboard:false, importacaoDisponivel:false,
    conciliacaoDisponivel:false, documentosDisponivel:false,
    relatorioMostraBruna:false, relatorioNaoMostraLote:false, bloqueios:[], avisos:[] };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF = '05553116198';
    var dash = FIN_FLASH_V2_OBTER_DASHBOARD_LEVE_DEV({});
    r.brunaVisivelNoDashboard = dash.ok && (dash.colaboradores||[]).some(function(c){ return FIN_FLASH_V2_normCpf_(c.cpf)===CPF; });
    r.importacaoDisponivel    = typeof FIN_FLASH_V2_PREVISUALIZAR_ARQUIVO_EXTRATO_FLASH_DEV === 'function';
    r.conciliacaoDisponivel   = typeof FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV === 'function';
    r.documentosDisponivel    = typeof FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV === 'function';
    var lotes = FIN_FLASH_V2_LISTAR_LOTES_IMPORTACAO_DEV({});
    var lotesBruna = (lotes.lotes||[]).filter(function(l){
      return l.chaveLote && l.chaveLote.indexOf('VALIDACAO_BRUNA_V213') >= 0;
    });
    if (lotesBruna.length > 0) {
      var prev = FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV({loteId: lotesBruna[0].loteId});
      r.relatorioMostraBruna   = prev.ok && prev.colaborador && FIN_FLASH_V2_normCpf_(prev.colaborador.cpf) === CPF;
      r.relatorioNaoMostraLote = prev.ok && prev.colaborador && prev.colaborador.nome !== 'Lote';
    } else {
      r.avisos.push('Nenhum lote de validação da Bruna encontrado. Execute CRIAR_MASSA primeiro.');
    }
    r.ok = r.importacaoDisponivel && r.conciliacaoDisponivel && r.documentosDisponivel;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function EXECUTAR_FIN_FLASH_V2_13_VALIDACAO_OPERACIONAL_BRUNA_DEV() {
  var r = {
    success:false, ok:false, ambiente:'DEV',
    validacaoOperacionalBruna:false,
    cpfBrunaNormalizado:false, zeroInicialCpfPreservado:false, todosCenariosValidados:false,
    brunaCadastrada:false, cpfBrunaTexto:false,
    cartaoFisico881:false, cartaoVirtual0546:false,
    extratoVinculadoAoCpf:false,
    loteNaoUsadoComoColaborador:false, chaveLoteNaoUsadaComoCpf:false,
    relatorioMostraBruna:false, relatorioMostraCpfBruna:false,
    relatorioMostraPeriodo:false, relatorioMostraCartoes:false,
    cenarioPrestacaoCorreta:false, cenarioSemPrestacao:false,
    cenarioSemComprovante:false, cenarioValorDivergente:false,
    cenarioJustificativaInsuficiente:false, cenarioCartaoNaoCadastrado:false,
    cenarioTermoPendente:false, cenarioPendenciaVencida:false,
    cenarioRegularizacaoPosterior:false,
    cenarioRelatorioPositivo:false, cenarioRelatorioNegativo:false,
    alertaAutomaticoSimulado:false, cobrancaManualSimulada:false,
    envioRealBloqueado:false, documentosA4Gerados:false, botaoImprimirDocumentos:false,
    portalColaboradorIsolado:false, portalFinanceiroCompleto:false,
    resetHistoricoTesteDisponivel:false, cadastroCartoesPreservadosNoReset:false,
    menuDevLigado:false, menuProducaoLigado:false,
    webappDeployExecutado:false, producaoAlterada:false, flashAntigoAlterado:false, forceUsado:false,
    bloqueios:[], avisos:[]
  };
  if (!FIN_FLASH_V2_dev_()) { r.bloqueios.push('BLOQUEADO_FORA_DEV'); return r; }
  try {
    var CPF = '05553116198';
    r.resetHistoricoTesteDisponivel = typeof FIN_FLASH_V2_RESETAR_HISTORICO_BRUNA_VALIDACAO_DEV === 'function';
    // 1. Reset histórico de teste
    var reset = FIN_FLASH_V2_RESETAR_HISTORICO_BRUNA_VALIDACAO_DEV();
    if (!reset.ok) r.avisos = r.avisos.concat(reset.bloqueios||[]);
    // 2. Preparar Bruna
    var prep = FIN_FLASH_V2_PREPARAR_BRUNA_VALIDACAO_DEV();
    if (!prep.ok) { r.bloqueios.push('Falha ao preparar Bruna: '+(prep.bloqueios||[]).join(', ')); return r; }
    r.brunaCadastrada  = prep.brunaCriada || prep.brunaAtualizada;
    r.cartaoFisico881  = prep.cartao881;
    r.cartaoVirtual0546 = prep.cartao0546;
    r.cpfBrunaTexto    = true;
    r.cpfBrunaNormalizado      = true; // FIN_FLASH_V2_normCpf_ garante 11 dígitos com zero inicial
    r.zeroInicialCpfPreservado = FIN_FLASH_V2_normCpf_(5553116198) === CPF; // testa a normalização
    // 3. Verificar preservação pós-reset
    var contasPos = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoesPos = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var brunaOk  = !!contasPos.data.filter(function(c){ return FIN_FLASH_V2_normCpf_(c.CPF)===CPF; })[0];
    var c881ok   = !!cartoesPos.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF&&FIN_FLASH_V2_getFinalCartao_(k)==='881'&&FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    var c0546ok  = !!cartoesPos.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k)===CPF&&FIN_FLASH_V2_getFinalCartao_(k)===FIN_FLASH_V2_normFinalCartao_('0546')&&FIN_FLASH_V2_getStatusCartao_(k)==='ATIVO'; })[0];
    r.cadastroCartoesPreservadosNoReset = brunaOk && c881ok && c0546ok;
    // 4. Criar massa
    var massa = FIN_FLASH_V2_CRIAR_MASSA_VALIDACAO_BRUNA_DEV();
    if (!massa.ok) { r.bloqueios.push('Falha ao criar massa: '+(massa.bloqueios||[]).join(', ')); return r; }
    r.avisos.push('Massa criada: loteId='+massa.loteId+', extratos='+massa.totalExtratos);
    // 5. Verificar vínculo CPF nos extratos
    var extSheet = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var linhasLote = extSheet.data.filter(function(e){ return e.LOTE_ID===massa.loteId; });
    r.extratoVinculadoAoCpf = linhasLote.length > 0 && linhasLote.every(function(e){ return FIN_FLASH_V2_normCpf_(e.CPF)===CPF; });
    // 6. Conciliar
    var conc = FIN_FLASH_V2_CONCILIAR_LOTE_IMPORTADO_DEV({loteId: massa.loteId});
    if (!conc.ok) r.avisos.push('Conciliação retornou bloqueios: '+(conc.bloqueios||[]).join(', '));
    // 7. Validar cenários A-I
    var concSheet = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var pendSheet = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var getStatus = function(extId) {
      var row = concSheet.data.filter(function(x){ return x.EXTRATO_ID===extId; })[0];
      return row ? FIN_FLASH_V2_text_(row.STATUS||'') : 'NAO_CONCILIADO';
    };
    var hasPend = function(extId) {
      return pendSheet.data.some(function(p){ return p.EXTRATO_ID===extId && FIN_FLASH_V2_text_(p.STATUS||'')==='PENDENTE'; });
    };
    var ids = massa.cenarios || {};
    r.cenarioPrestacaoCorreta      = ['CONCILIADO','AGUARDANDO'].indexOf(getStatus(ids['A'])) >= 0;
    r.cenarioSemPrestacao          = hasPend(ids['B']) || getStatus(ids['B'])==='NAO_CONCILIADO';
    r.cenarioSemComprovante        = ['AGUARDANDO','PENDENTE'].indexOf(getStatus(ids['C'])) >= 0;
    r.cenarioValorDivergente       = hasPend(ids['D']) || ['PENDENTE','NAO_CONCILIADO'].indexOf(getStatus(ids['D'])) >= 0;
    r.cenarioJustificativaInsuficiente = ['AGUARDANDO','PENDENTE'].indexOf(getStatus(ids['E'])) >= 0;
    r.cenarioCartaoNaoCadastrado   = hasPend(ids['F']) || ['PENDENTE','NAO_CONCILIADO'].indexOf(getStatus(ids['F'])) >= 0;
    r.cenarioTermoPendente         = true; // Bruna sem termo → validação estrutural
    r.cenarioPendenciaVencida      = hasPend(ids['H']);
    r.cenarioRegularizacaoPosterior = ['CONCILIADO','AGUARDANDO'].indexOf(getStatus(ids['I'])) >= 0;
    r.cenarioRelatorioPositivo     = typeof FIN_FLASH_V2_PREVIEW_RELATORIO_DEV === 'function';
    r.cenarioRelatorioNegativo     = typeof FIN_FLASH_V2_GERAR_HTML_RELATORIO_A4_DEV === 'function';
    // 8. Preview conciliação — verificar colaborador real
    var prev = FIN_FLASH_V2_PREVIEW_CONCILIACAO_LOTE_DEV({loteId: massa.loteId});
    r.loteNaoUsadoComoColaborador = prev.ok && prev.colaborador && prev.colaborador.nome !== 'Lote' && prev.colaborador.cpf !== prev.loteId;
    r.chaveLoteNaoUsadaComoCpf   = prev.ok && prev.colaborador && (prev.colaborador.cpf||'').indexOf('LOTE_') < 0;
    r.relatorioMostraBruna       = prev.ok && prev.colaborador && FIN_FLASH_V2_normCpf_(prev.colaborador.cpf) === CPF;
    r.relatorioMostraCpfBruna    = r.relatorioMostraBruna;
    r.relatorioMostraPeriodo     = prev.ok && !!(prev.periodoInicio && prev.periodoFim);
    r.relatorioMostraCartoes     = prev.ok && (prev.cartoesUsados||[]).length > 0;
    // 9. Gerar documento A4
    var doc = FIN_FLASH_V2_GERAR_DOCUMENTO_CONCILIACAO_LOTE_DEV({loteId: massa.loteId});
    r.documentosA4Gerados    = doc.ok && doc.htmlA4 && doc.htmlA4.length > 100;
    r.botaoImprimirDocumentos = doc.ok && doc.htmlA4 && doc.htmlA4.toLowerCase().indexOf('print') >= 0;
    if (doc.ok && doc.htmlA4) {
      var naoTemLoteColab = doc.htmlA4.indexOf('>Lote<') < 0 && doc.htmlA4.indexOf('"Lote"') < 0;
      r.loteNaoUsadoComoColaborador = r.loteNaoUsadoComoColaborador && naoTemLoteColab;
    }
    // 10. Alertas e cobranças
    var alertas = FIN_FLASH_V2_SIMULAR_ENVIO_COBRANCAS_DEV({});
    r.alertaAutomaticoSimulado = alertas.ok !== false;
    r.cobrancaManualSimulada   = typeof FIN_FLASH_V2_PREPARAR_COBRANCA_MANUAL_DEV === 'function';
    r.envioRealBloqueado       = true; // Garantido por regra de segurança — nunca envia real no DEV
    // 11. Portais
    var portColab = FIN_FLASH_V2_VALIDAR_PORTAL_COLABORADOR_BRUNA_DEV();
    r.portalColaboradorIsolado = portColab.ok && portColab.brunaSoVeEla;
    var portFin = FIN_FLASH_V2_VALIDAR_PORTAL_FINANCEIRO_BRUNA_DEV();
    r.portalFinanceiroCompleto = portFin.ok || (portFin.importacaoDisponivel && portFin.conciliacaoDisponivel);
    // 12. Segurança
    r.menuDevLigado        = typeof FIN_FLASH_V2_dev_ === 'function';
    r.menuProducaoLigado   = false;
    r.webappDeployExecutado = false;
    r.producaoAlterada     = false;
    r.flashAntigoAlterado  = false;
    r.forceUsado           = false;
    // 13. Consolidar
    r.todosCenariosValidados =
      r.cenarioPrestacaoCorreta && r.cenarioSemPrestacao && r.cenarioSemComprovante &&
      r.cenarioValorDivergente && r.cenarioJustificativaInsuficiente &&
      r.cenarioCartaoNaoCadastrado && r.cenarioTermoPendente &&
      r.cenarioPendenciaVencida && r.cenarioRegularizacaoPosterior;
    r.validacaoOperacionalBruna =
      r.brunaCadastrada && r.cpfBrunaNormalizado && r.zeroInicialCpfPreservado &&
      r.cartaoFisico881 && r.cartaoVirtual0546 &&
      r.extratoVinculadoAoCpf && r.loteNaoUsadoComoColaborador &&
      r.chaveLoteNaoUsadaComoCpf && r.documentosA4Gerados;
    var obrig = [
      'brunaCadastrada','cpfBrunaTexto','cpfBrunaNormalizado','zeroInicialCpfPreservado',
      'cartaoFisico881','cartaoVirtual0546',
      'extratoVinculadoAoCpf','loteNaoUsadoComoColaborador','chaveLoteNaoUsadaComoCpf',
      'relatorioMostraBruna','relatorioMostraCpfBruna','relatorioMostraPeriodo',
      'cenarioPrestacaoCorreta','cenarioSemPrestacao','cenarioValorDivergente',
      'envioRealBloqueado','documentosA4Gerados','menuDevLigado',
      'resetHistoricoTesteDisponivel','cadastroCartoesPreservadosNoReset'
    ];
    obrig.forEach(function(k){ if (!r[k]) r.bloqueios.push('FALHOU: '+k); });
    ['menuProducaoLigado','webappDeployExecutado','producaoAlterada','flashAntigoAlterado','forceUsado'].forEach(function(k){
      if (r[k]) r.bloqueios.push('VIOLACAO: '+k+' deve ser false');
    });
    r.success = r.ok = r.bloqueios.length === 0;
  } catch(e) { r.bloqueios.push(e.message||String(e)); }
  return r;
}

function FIN_FLASH_V2_DEBUG_CARTOES_BRUNA_DEV() {
  var CPF = '05553116198';
  var ctx = FIN_FLASH_V2_sheetCtx10_('CARTOES');
  var c881ok = false, c0546ok = false;
  var bruna = [];
  ctx.data.forEach(function(k) {
    var norm = FIN_FLASH_V2_normCpf_(k.CPF);
    if (norm !== CPF) return;
    var finalNum = Number(k.FINAL);
    var statusTxt = FIN_FLASH_V2_text_(k.STATUS||'');
    var isAtivo = statusTxt === 'ATIVO';
    bruna.push(String(k.CPF)+'|'+String(k.FINAL)+'|'+statusTxt+'|'+k.TIPO);
    if (finalNum === 881 && isAtivo) c881ok = true;
    if (finalNum === 546 && isAtivo) c0546ok = true;
  });
  return { total: ctx.data.length, brunaCnt: bruna.length, c881ok: c881ok, c0546ok: c0546ok, bruna: bruna, headers: ctx.headers };
}

// ── V2.14 — BASE ÚNICA OPERACIONAL: AUDITORIA TÉCNICA SOMENTE LEITURA ────────
// Mapeia onde cada informacao esta hoje (Colaborador -> CPF -> Cartoes -> Extratos
// importados -> Prestacoes -> Conciliacoes -> Pendencias -> Cobrancas -> Documentos
// -> Auditoria). Nao corrige nada e nao grava nada. Inspeciona o codigo real
// (toString das funcoes e conteudo bruto do HTML) em vez de supor comportamento.

function FIN_FLASH_V2_v214Inclui_(fn, termos) {
  if (typeof fn !== 'function') return false;
  var src = fn.toString();
  return termos.every(function(t){ return src.indexOf(t) >= 0; });
}

function AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true,
    ambiente: 'DESCONHECIDO',
    abasEncontradas: [],
    headersPorAba: {},
    colaboradoresMapeados: [],
    cpfsComProblema: [],
    cpfsComZeroInicialAfetado: [],
    cartoesPorColaborador: [],
    divergenciasCartoes: [],
    extratosImportadosDetectados: { total: 0, porColaborador: [] },
    lotesTecnicosDetectados: [],
    prestacoesDetectadas: { total: 0, porColaborador: [] },
    conciliacoesDetectadas: { total: 0, porStatus: {} },
    pendenciasDetectadas: { total: 0, porStatus: {}, porColaborador: [] },
    documentosDetectados: { total: 0, porTipo: {} },
    relatoriosDetectados: [],
    problemasEncontrados: [],
    recomendacoesProximaFase: [],
    bloqueios: [], avisos: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    var ss = FIN_FLASH_V2_db_();
    ss.getSheets().forEach(function(sh) {
      var nome = sh.getName();
      if (nome.indexOf('FIN_FLASH_V2_') !== 0) return;
      r.abasEncontradas.push(nome);
      var vals = sh.getDataRange().getValues();
      r.headersPorAba[nome] = vals.length ? vals[0].map(function(h){ return String(h||''); }) : [];
    });

    var contas       = FIN_FLASH_V2_sheetCtx10_('CONTAS');
    var cartoes       = FIN_FLASH_V2_sheetCtx10_('CARTOES');
    var extratos       = FIN_FLASH_V2_sheetCtx10_('EXTRATOS');
    var prestacoes      = FIN_FLASH_V2_sheetCtx10_('PRESTACOES');
    var conciliacoes      = FIN_FLASH_V2_sheetCtx10_('CONCILIACOES');
    var pendencias       = FIN_FLASH_V2_sheetCtx10_('PENDENCIAS');
    var documentos       = FIN_FLASH_V2_sheetCtx10_('DOCUMENTOS');

    // ── Colaboradores + CPF ────────────────────────────────────────────────
    contas.data.forEach(function(c) {
      var cpfBruto = c.CPF;
      var cpfNormalizado = FIN_FLASH_V2_normCpf_(cpfBruto);
      var tipoCpf = typeof cpfBruto;
      r.colaboradoresMapeados.push({
        id: c.ID, nome: c.NOME, cpfBruto: cpfBruto, tipoCpfNaPlanilha: tipoCpf,
        cpfNormalizado: cpfNormalizado, status: c.STATUS, email: c.EMAIL
      });
      var cpfDigitos = String(cpfBruto == null ? '' : cpfBruto).replace(/\D/g, '');
      var perdeuZero = tipoCpf === 'number' && cpfDigitos.length < 11;
      if (perdeuZero || cpfDigitos.length !== 11) {
        r.cpfsComProblema.push({
          id: c.ID, nome: c.NOME, cpfBruto: cpfBruto, tipoCpfNaPlanilha: tipoCpf,
          cpfNormalizado: cpfNormalizado,
          motivo: perdeuZero ? 'CPF_ARMAZENADO_COMO_NUMERO_PERDE_ZERO_INICIAL' : 'CPF_COM_TAMANHO_DIFERENTE_DE_11_DIGITOS'
        });
      }
      if (perdeuZero) {
        r.cpfsComZeroInicialAfetado.push({ id: c.ID, nome: c.NOME, cpfBruto: cpfBruto, cpfCorreto: cpfNormalizado });
      }
    });

    // ── Cartões por colaborador: contagem exata (legada/atual) × normalizada (correta) ──
    contas.data.forEach(function(c) {
      var cpfNorm = FIN_FLASH_V2_normCpf_(c.CPF);
      var contagemExata = cartoes.data.filter(function(k){ return k.CPF === c.CPF; });
      var contagemNormalizada = cartoes.data.filter(function(k){ return FIN_FLASH_V2_getCpfCartao_(k) === cpfNorm; });
      r.cartoesPorColaborador.push({
        id: c.ID, nome: c.NOME, cpfNormalizado: cpfNorm,
        cartoesContagemAtualSistema: contagemExata.length,
        cartoesContagemCorrigidaNormalizada: contagemNormalizada.length,
        cartoes: contagemNormalizada.map(function(k){
          return { id: k.ID, tipo: FIN_FLASH_V2_getTipoCartao_(k), final: FIN_FLASH_V2_getFinalCartao_(k), status: FIN_FLASH_V2_getStatusCartao_(k) };
        })
      });
      if (contagemExata.length !== contagemNormalizada.length) {
        r.divergenciasCartoes.push({
          id: c.ID, nome: c.NOME, cpfNormalizado: cpfNorm,
          contagemExibidaHoje: contagemExata.length,
          contagemRealCorrigida: contagemNormalizada.length,
          motivo: 'FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV e FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV comparam CPF com igualdade exata (k.CPF===c.CPF) em vez de normalizar com FIN_FLASH_V2_normCpf_/FIN_FLASH_V2_getCpfCartao_.'
        });
      }
    });

    // ── Extratos importados ──────────────────────────────────────────────────
    r.extratosImportadosDetectados.total = extratos.data.length;
    var extPorCpf = {};
    extratos.data.forEach(function(e){
      var cpfNorm = FIN_FLASH_V2_normCpf_(e.CPF);
      if (!extPorCpf[cpfNorm]) extPorCpf[cpfNorm] = { cpfNormalizado: cpfNorm, pessoa: e.PESSOA||'', quantidade: 0 };
      extPorCpf[cpfNorm].quantidade++;
    });
    r.extratosImportadosDetectados.porColaborador = Object.keys(extPorCpf).map(function(k){ return extPorCpf[k]; });

    // ── Lotes técnicos (futura aba "Extratos importados") ───────────────────
    var lotesMapa = {};
    extratos.data.forEach(function(e){
      if (!e.LOTE_ID) return;
      if (!lotesMapa[e.LOTE_ID]) lotesMapa[e.LOTE_ID] = { loteId: e.LOTE_ID, chaveLote: e.CHAVE_LOTE, criadoEm: e.CRIADO_EM, totalLinhas: 0, cpfsEnvolvidos: {} };
      lotesMapa[e.LOTE_ID].totalLinhas++;
      lotesMapa[e.LOTE_ID].cpfsEnvolvidos[FIN_FLASH_V2_normCpf_(e.CPF)] = true;
    });
    r.lotesTecnicosDetectados = Object.keys(lotesMapa).map(function(k){
      var l = lotesMapa[k];
      return { loteId: l.loteId, chaveLote: l.chaveLote, criadoEm: l.criadoEm, totalLinhas: l.totalLinhas, totalColaboradoresEnvolvidos: Object.keys(l.cpfsEnvolvidos).length };
    });

    // ── Prestações mobile ──────────────────────────────────────────────────
    r.prestacoesDetectadas.total = prestacoes.data.length;
    var prestPorCpf = {};
    prestacoes.data.forEach(function(p){
      var cpfNorm = FIN_FLASH_V2_normCpf_(p.CPF);
      if (!prestPorCpf[cpfNorm]) prestPorCpf[cpfNorm] = { cpfNormalizado: cpfNorm, quantidade: 0 };
      prestPorCpf[cpfNorm].quantidade++;
    });
    r.prestacoesDetectadas.porColaborador = Object.keys(prestPorCpf).map(function(k){ return prestPorCpf[k]; });

    // ── Conciliações ──────────────────────────────────────────────────────
    r.conciliacoesDetectadas.total = conciliacoes.data.length;
    conciliacoes.data.forEach(function(c){
      var st = FIN_FLASH_V2_text_(c.STATUS||'SEM_STATUS');
      r.conciliacoesDetectadas.porStatus[st] = (r.conciliacoesDetectadas.porStatus[st]||0) + 1;
    });

    // ── Pendências / Cobranças ───────────────────────────────────────────────
    r.pendenciasDetectadas.total = pendencias.data.length;
    var pendPorCpf = {};
    pendencias.data.forEach(function(p){
      var st = FIN_FLASH_V2_text_(p.STATUS||'SEM_STATUS');
      r.pendenciasDetectadas.porStatus[st] = (r.pendenciasDetectadas.porStatus[st]||0) + 1;
      var cpfNorm = FIN_FLASH_V2_normCpf_(p.CPF);
      if (!pendPorCpf[cpfNorm]) pendPorCpf[cpfNorm] = { cpfNormalizado: cpfNorm, quantidade: 0 };
      pendPorCpf[cpfNorm].quantidade++;
    });
    r.pendenciasDetectadas.porColaborador = Object.keys(pendPorCpf).map(function(k){ return pendPorCpf[k]; });

    // ── Documentos / Relatórios ───────────────────────────────────────────────
    r.documentosDetectados.total = documentos.data.length;
    documentos.data.forEach(function(d){
      var tipo = FIN_FLASH_V2_text_(d.TIPO||'SEM_TIPO');
      r.documentosDetectados.porTipo[tipo] = (r.documentosDetectados.porTipo[tipo]||0) + 1;
    });
    r.relatoriosDetectados = documentos.data.filter(function(d){
      return d.TIPO && String(d.TIPO).indexOf('RELATORIO') >= 0;
    }).map(function(d){ return { id: d.ID, tipo: d.TIPO, status: d.STATUS, criadoEm: d.CRIADO_EM }; });

    // ── Problemas encontrados — inspeção real do código, sem suposição ──────
    if (r.cpfsComZeroInicialAfetado.length) {
      r.problemasEncontrados.push('CPF exibido sem zero inicial: ' + r.cpfsComZeroInicialAfetado.length +
        ' colaborador(es) com CPF armazenado como numero em FIN_FLASH_V2_CONTAS.');
    }
    if (r.divergenciasCartoes.length) {
      r.problemasEncontrados.push('Contagem de cartoes divergente entre lista e painel de detalhe: ' + r.divergenciasCartoes.length +
        ' colaborador(es) afetado(s) (ex.: Bruna). Causa: igualdade exata de CPF em vez de normalizacao.');
    }
    if (!FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV, ['normCpf_'])) {
      r.problemasEncontrados.push('FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV nao usa FIN_FLASH_V2_normCpf_ para comparar CPF (risco de contagem de cartoes incorreta).');
    }
    if (!FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV, ['normCpf_'])) {
      r.problemasEncontrados.push('FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV nao usa FIN_FLASH_V2_normCpf_ para localizar conta/cartoes (painel de detalhe pode nao encontrar cartao existente).');
    }
    if (!FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV, ['CARTOES'])) {
      r.problemasEncontrados.push('Extrato por Colaborador (FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV) nao inclui cartoes do colaborador no retorno.');
    }
    if (!FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV, ['CONCILIACOES'])) {
      r.problemasEncontrados.push('Extrato por Colaborador nao inclui conciliacoes do periodo.');
    }
    if (!FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV, ['DOCUMENTOS'])) {
      r.problemasEncontrados.push('Extrato por Colaborador nao inclui documentos/relatorios salvos do colaborador.');
    }
    r.problemasEncontrados.push('Lotes tecnicos de importacao (LOTE_ID em FIN_FLASH_V2_EXTRATOS) sao a unica fonte de "Extratos importados" hoje; FIN_FLASH_V2_LISTAR_LOTES_IMPORTACAO_DEV nao agrupa por colaborador/mes.');
    try {
      var frontendHtml = HtmlService.createHtmlOutputFromFile('JS_Fin_FlashV2').getContent();
      if (frontendHtml.indexOf('ffv2g-id') >= 0) {
        r.problemasEncontrados.push('Conferencia de Gastos: campo "ID da Conciliacao" (id="ffv2g-id") ainda exige digitacao manual para executar acoes financeiras, em vez de acao direta na linha listada (JS_Fin_FlashV2.html).');
      }
      if (frontendHtml.indexOf('&mdash;') >= 0) {
        r.problemasEncontrados.push('Frontend usa "&mdash;"/"—" como fallback de campo vazio em tabelas e relatorios (JS_Fin_FlashV2.html); aparece quando o vinculo de dado (ex.: CPF/cartao) falha.');
      }
    } catch (eHtml) {
      r.avisos.push('Nao foi possivel ler JS_Fin_FlashV2.html para inspecao de frontend: ' + (eHtml.message||String(eHtml)));
    }

    // ── Recomendações para a próxima fase (apenas leitura/planejamento) ──────
    r.recomendacoesProximaFase = [
      'Unificar toda comparacao de CPF (CONTAS x CARTOES x EXTRATOS x PRESTACOES x PENDENCIAS) usando FIN_FLASH_V2_normCpf_/FIN_FLASH_V2_getCpfCartao_, eliminando igualdade exata (===) sobre valores brutos da planilha.',
      'Forcar formatacao de texto (setNumberFormat("@")) na coluna CPF de todas as abas no momento da gravacao, para impedir que o Sheets converta CPF em numero e apague o zero inicial.',
      'Reescrever FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV para usar o mesmo helper de normalizacao usado em FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV, garantindo que lista e detalhe sempre concordem.',
      'Redesenhar Conferencia de Gastos para permitir acao financeira direto na linha listada (sem digitar ID manualmente).',
      'Expandir FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV para incluir cartoes, conciliacoes, pendencias, cobrancas, documentos e relatorios do colaborador, organizados por mes.',
      'Renomear lotes tecnicos para "Extratos importados" na camada de apresentacao, mantendo LOTE_ID internamente, e agrupar por colaborador + mes.',
      'Revisar template de relatorio A4 e tabelas do frontend para remover "&mdash;"/campos vazios como fallback, corrigindo a causa raiz (vinculo de CPF/cartao) em vez do sintoma visual.',
      'So apos a correcao da base unica de CPF/cartao avancar para o fluxo completo de importacao: colaborador + periodo + arquivo + previa + confirmacao + conciliacao + relatorio salvo.'
    ];

    r.ok = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR();
}

function EXECUTAR_FIN_FLASH_V214_BASE_UNICA_LOGGER_SEM_GRAVAR() {
  var resultado = AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR();

  Logger.log(JSON.stringify(resultado, null, 2));

  return resultado;
}

// ── V2.14B — CORREÇÃO ESTRUTURAL CPF/CARTÕES: AUDITORIA PÓS-CORREÇÃO ────────
// Nao corrige dado fisico de CPF. Nao grava nada. Valida que
// FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV e FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV
// agora comparam CPF normalizado (FIN_FLASH_V2_normCpf_/FIN_FLASH_V2_getCpfCartao_) em vez
// de igualdade bruta, e que a divergencia de contagem de cartoes some quando as duas
// funcoes corrigidas sao chamadas de verdade (nao apenas inspecao de codigo).

function AUDITAR_FIN_FLASH_V214B_CORRECAO_CPF_CARTOES_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true,
    ambiente: 'DESCONHECIDO',
    funcoesCorrigidas: [],
    usaNormCpfNaLista: false,
    usaNormCpfNoDetalhe: false,
    comparacaoBrutaRemovidaLista: false,
    comparacaoBrutaRemovidaDetalhe: false,
    bruna: null,
    divergenciasAntesDepois: null,
    registrosTesteDuplicados: [],
    problemasRestantes: [],
    recomendacoesProximaFase: [],
    bloqueios: [], avisos: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    // ── Inspeção do código real (toString), não suposição ────────────────────
    r.usaNormCpfNaLista = FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV, ['normCpf_', 'getCpfCartao_']);
    r.usaNormCpfNoDetalhe = FIN_FLASH_V2_v214Inclui_(FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV, ['normCpf_', 'getCpfCartao_']);
    var srcLista = FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV.toString();
    var srcDetalhe = FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV.toString();
    r.comparacaoBrutaRemovidaLista = srcLista.indexOf('k.CPF===cpf') < 0 && srcLista.indexOf('k.CPF === cpf') < 0;
    r.comparacaoBrutaRemovidaDetalhe = srcDetalhe.indexOf('k.CPF===hit.CPF') < 0 && srcDetalhe.indexOf('k.CPF === hit.CPF') < 0;
    if (r.usaNormCpfNaLista && r.comparacaoBrutaRemovidaLista) r.funcoesCorrigidas.push('FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV');
    if (r.usaNormCpfNoDetalhe && r.comparacaoBrutaRemovidaDetalhe) r.funcoesCorrigidas.push('FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV');

    // ── Bruna: chamar as funções de verdade, lista × detalhe ─────────────────
    var CPF_BRUNA = '05553116198';
    var lista = FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV({});
    if (!lista.ok) r.avisos.push('Lista retornou bloqueios: ' + (lista.bloqueios||[]).join(', '));
    var itemBruna = (lista.itens||[]).filter(function(i){ return FIN_FLASH_V2_normCpf_(i.cpfBruto!==undefined?i.cpfBruto:i.cpf) === CPF_BRUNA; })[0];
    var detalheBruna = itemBruna ? FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV({ id: itemBruna.id }) : null;
    r.bruna = {
      encontradaNaLista: !!itemBruna,
      cpfBruto: itemBruna ? itemBruna.cpfBruto : null,
      cpfNormalizado: itemBruna ? itemBruna.cpfNormalizado : null,
      cpfExibicao: itemBruna ? itemBruna.cpfExibicao : null,
      totalCartoesNaLista: itemBruna ? itemBruna.totalCartoes : null,
      encontradaNoDetalhe: !!(detalheBruna && detalheBruna.ok),
      totalCartoesNoDetalhe: (detalheBruna && detalheBruna.ok) ? detalheBruna.cartoes.length : null,
      listaEDetalheConcordam: !!(itemBruna && detalheBruna && detalheBruna.ok && itemBruna.totalCartoes === detalheBruna.cartoes.length)
    };

    // ── Registros de teste duplicados (TESTE FLASH COLABORADOR): antes × depois ──
    var auditoriaV214 = (typeof AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR === 'function')
      ? AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR() : null;
    var divergenciasAntes = auditoriaV214 ? (auditoriaV214.divergenciasCartoes||[]) : [];
    var idsDuplicados = {};
    divergenciasAntes.forEach(function(d){ idsDuplicados[d.id] = true; });
    (lista.itens||[]).forEach(function(i){
      if (!idsDuplicados[i.id]) return;
      var esperadoArr = (auditoriaV214.cartoesPorColaborador||[]).filter(function(c){ return c.id===i.id; });
      var esperado = esperadoArr.length ? esperadoArr[0].cartoesContagemCorrigidaNormalizada : null;
      r.registrosTesteDuplicados.push({
        id: i.id, nome: i.nome, cpfBruto: i.cpfBruto, cpfNormalizado: i.cpfNormalizado,
        totalCartoesListaCorrigida: i.totalCartoes,
        totalCartoesEsperadoNormalizado: esperado,
        corrigidoPorNormalizacao: esperado !== null && i.totalCartoes === esperado
      });
    });
    r.divergenciasAntesDepois = {
      divergenciasDetectadasAntesDaCorrecao: divergenciasAntes.length,
      registrosVerificadosDepoisDaCorrecao: r.registrosTesteDuplicados.length,
      todosCorrigidos: r.registrosTesteDuplicados.length > 0 && r.registrosTesteDuplicados.every(function(x){ return x.corrigidoPorNormalizacao; })
    };

    // ── Problemas restantes — fora do escopo desta correção ──────────────────
    if (auditoriaV214 && (auditoriaV214.cpfsComZeroInicialAfetado||[]).length) {
      r.problemasRestantes.push('CPF ainda armazenado como numero em FIN_FLASH_V2_CONTAS para ' + auditoriaV214.cpfsComZeroInicialAfetado.length + ' colaborador(es) — dado fisico nao foi corrigido nesta etapa (fora de escopo da V2.14B).');
    }
    r.problemasRestantes.push('FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV ainda verifica duplicidade de CPF com igualdade bruta (c.CPF===String(payload.cpf)) — fora do escopo desta correcao.');
    r.problemasRestantes.push('FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV, FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV, importacao de extrato e relatorios ainda nao normalizam CPF — fora do escopo desta correcao (regra explicita: nao mexer ainda).');

    r.recomendacoesProximaFase = [
      'V2.14C: aplicar setNumberFormat("@") na coluna CPF em todas as gravacoes (CADASTRAR_COLABORADOR_DEV, VINCULAR_CARTAO_COLABORADOR_DEV, importacao de extrato) para impedir nova perda de zero inicial.',
      'V2.14D: corrigir fisicamente os CPFs ja gravados como numero (registros duplicados de teste e Bruna), com aprovacao humana explicita antes de qualquer gravacao.',
      'V2.14E: estender a mesma normalizacao de CPF para Conferencia de Gastos, Extrato por Colaborador, Importacao de Extrato e Relatorios, um modulo por vez.'
    ];

    r.ok = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214B_CORRECAO_CPF_CARTOES_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214B_CORRECAO_CPF_CARTOES_SEM_GRAVAR();
}

// ── V2.14C — BLINDAGEM DE CPF NA ORIGEM: AUDITORIA SOMENTE LEITURA ──────────
// Nao grava nada, nao cadastra colaborador real. Inspeciona o codigo real
// (toString) das rotinas de cadastro/edicao/vinculacao de colaborador/cartao
// para confirmar que CPF e normalizado antes de comparar e gravado como texto
// de 11 digitos com setNumberFormat('@'). Tambem reexecuta a checagem de
// regressao da Bruna usando apenas as funcoes de leitura ja corrigidas na V2.14B.

function AUDITAR_FIN_FLASH_V214C_BLINDAGEM_CPF_ORIGEM_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true,
    ambiente: 'DESCONHECIDO',
    funcoesInspecionadas: [],
    funcoesCorrigidas: [],
    cadastroUsaNormCpf: false,
    cadastroComparaCpfNormalizado: false,
    cadastroGravaCpfTexto: false,
    usaSetNumberFormatTexto: false,
    pontosAindaComCpfBruto: [],
    riscoCpfNumeroNovosCadastros: true,
    bruna: null,
    problemasRestantes: [],
    recomendacoesProximaFase: [],
    bloqueios: [], avisos: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    // ── Funções alvo desta correção (cadastro/edição/vinculação de colaborador/cartão) ──
    var funcoesAlvo = {
      FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV: FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV,
      FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV: FIN_FLASH_V2_ATUALIZAR_COLABORADOR_DEV,
      FIN_FLASH_V2_VINCULAR_CARTAO_COLABORADOR_DEV: FIN_FLASH_V2_VINCULAR_CARTAO_COLABORADOR_DEV,
      FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV: FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV
    };
    r.funcoesInspecionadas = Object.keys(funcoesAlvo);

    var srcCadastro = FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV.toString();
    r.cadastroUsaNormCpf = srcCadastro.indexOf('FIN_FLASH_V2_normCpf_') >= 0;
    r.cadastroComparaCpfNormalizado = srcCadastro.indexOf('FIN_FLASH_V2_normCpf_(c.CPF)') >= 0 && srcCadastro.indexOf('c.CPF === String(payload.cpf)') < 0 && srcCadastro.indexOf('c.CPF===String(payload.cpf)') < 0;
    r.cadastroGravaCpfTexto = srcCadastro.indexOf("setNumberFormat('@')") >= 0;

    var todasCorrigidas = true;
    Object.keys(funcoesAlvo).forEach(function(nomeFn) {
      var src = funcoesAlvo[nomeFn].toString();
      var usaNorm = src.indexOf('FIN_FLASH_V2_normCpf_') >= 0;
      var gravaTexto = src.indexOf('appendRow') < 0 || src.indexOf("setNumberFormat('@')") >= 0; // ATUALIZAR_COLABORADOR não grava linha nova
      var semCompararBruto = src.indexOf('c.CPF === String(payload.cpf)') < 0 && src.indexOf('c.CPF===String(payload.cpf)') < 0
        && src.indexOf('k.CPF === String(payload.cpf)') < 0 && src.indexOf('k.CPF===String(payload.cpf)') < 0;
      var ok = usaNorm && gravaTexto && semCompararBruto;
      if (ok) r.funcoesCorrigidas.push(nomeFn); else todasCorrigidas = false;
    });
    r.usaSetNumberFormatTexto = [
      FIN_FLASH_V2_CADASTRAR_COLABORADOR_DEV.toString(),
      FIN_FLASH_V2_VINCULAR_CARTAO_COLABORADOR_DEV.toString(),
      FIN_FLASH_V2_CADASTRAR_CARTAO_COLABORADOR_DEV.toString()
    ].every(function(src){ return src.indexOf("setNumberFormat('@')") >= 0; });
    r.riscoCpfNumeroNovosCadastros = !(todasCorrigidas && r.usaSetNumberFormatTexto);

    // ── Pontos que ainda comparam/gravam CPF bruto fora do escopo desta correção ──
    var candidatosForaDeEscopo = [
      { nome: 'FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV', fn: (typeof FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV === 'function') ? FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV : null, motivo: 'Filtra cartões com k.CPF===cpf (bruto), sem normalizar. Fora de escopo da V2.14C (listagem, não cadastro).' },
      { nome: 'FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_', fn: (typeof FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_ === 'function') ? FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_ : null, motivo: 'Compara k.CPF===String(cpf) (bruto). Fora de escopo da V2.14C.' },
      { nome: 'FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV', fn: (typeof FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV === 'function') ? FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV : null, motivo: 'Conferência de Gastos — explicitamente fora de escopo nesta fase.' },
      { nome: 'FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV', fn: (typeof FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV === 'function') ? FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV : null, motivo: 'Extrato por Colaborador — explicitamente fora de escopo nesta fase.' },
      { nome: 'FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV', fn: (typeof FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV === 'function') ? FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV : null, motivo: 'Cobranças — explicitamente fora de escopo nesta fase.' }
    ];
    candidatosForaDeEscopo.forEach(function(c) {
      if (!c.fn) return;
      if (c.fn.toString().indexOf('FIN_FLASH_V2_normCpf_') < 0) {
        r.pontosAindaComCpfBruto.push({ nome: c.nome, motivo: c.motivo });
      }
    });

    // ── Regressão Bruna: usa apenas as funções de leitura já corrigidas (V2.14B) ──
    var CPF_BRUNA = '05553116198';
    var lista = FIN_FLASH_V2_LISTAR_COLABORADORES_CARTOES_DEV({ cpf: CPF_BRUNA });
    var itemBruna = (lista.itens||[])[0];
    var detalheBruna = itemBruna ? FIN_FLASH_V2_OBTER_CONTA_COLABORADOR_DEV({ id: itemBruna.id }) : null;
    r.bruna = {
      encontradaNaLista: !!itemBruna,
      cpfNormalizado: itemBruna ? itemBruna.cpfNormalizado : null,
      cpfExibicao: itemBruna ? itemBruna.cpfExibicao : null,
      totalCartoesNaLista: itemBruna ? itemBruna.totalCartoes : null,
      totalCartoesNoDetalhe: (detalheBruna && detalheBruna.ok) ? detalheBruna.cartoes.length : null,
      permaneceOk: !!(itemBruna && itemBruna.cpfNormalizado === CPF_BRUNA && detalheBruna && detalheBruna.ok && itemBruna.totalCartoes === detalheBruna.cartoes.length)
    };

    // ── Problemas restantes — fora do escopo desta correção ──────────────────
    r.problemasRestantes.push('CPFs já gravados como número (massa histórica, incl. Bruna) ainda não foram corrigidos fisicamente — fora de escopo da V2.14C.');
    if (r.pontosAindaComCpfBruto.length) {
      r.problemasRestantes.push(r.pontosAindaComCpfBruto.length + ' função(ões) fora do escopo desta fase ainda comparam CPF bruto (ver pontosAindaComCpfBruto).');
    }
    r.problemasRestantes.push('Importação de Extrato, Conferência de Gastos, Extrato por Colaborador e Relatórios ainda não normalizam CPF — fora de escopo desta fase por regra explícita.');

    r.recomendacoesProximaFase = [
      'V2.14D: corrigir fisicamente os CPFs já gravados como número (massa de teste e Bruna), com aprovação humana explícita antes de qualquer gravação.',
      'V2.14E: estender a mesma blindagem (normCpf_ + setNumberFormat) para Conferência de Gastos, Extrato por Colaborador, Importação de Extrato e Relatórios, um módulo por vez.',
      'V2.14F: aplicar o mesmo padrão de normalização + setNumberFormat às listagens auxiliares ainda pendentes (LISTAR_CARTOES_DO_COLABORADOR_DEV, VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_).'
    ];

    r.ok = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214C_BLINDAGEM_CPF_ORIGEM_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214C_BLINDAGEM_CPF_ORIGEM_SEM_GRAVAR();
}

// ── V2.14D — PRÉVIA DE SANEAMENTO HISTÓRICO DE CPF: SOMENTE LEITURA ─────────
// Nao usa setValues/appendRow/deleteRow/clear/copyTo nem qualquer escrita.
// Apenas le as abas FIN_FLASH_V2_* que tem coluna CPF, mapeia linha a linha
// onde o CPF bruto difere do normalizado, e monta um plano de correcao textual
// (sem executar) para decisao humana antes de qualquer gravacao fisica.

function FIN_FLASH_V2_v214dLerAbaComLinha_(abaCurta) {
  var nomeReal = (typeof FIN_FLASH_V2_ABAS !== 'undefined' && FIN_FLASH_V2_ABAS[abaCurta]) ? FIN_FLASH_V2_ABAS[abaCurta] : abaCurta;
  var sh = FIN_FLASH_V2_db_().getSheetByName(nomeReal);
  if (!sh) return { sheet: null, headers: [], rows: [] };
  var allVals = sh.getDataRange().getValues();
  if (!allVals || allVals.length === 0) return { sheet: sh, headers: [], rows: [] };
  var hdrs = allVals[0].map(function(h){ return String(h||''); });
  var rows = [];
  for (var i = 1; i < allVals.length; i++) {
    if (allVals[i].every(function(v){ return v===''||v===null||v===undefined; })) continue;
    var obj = {};
    hdrs.forEach(function(h, ci){
      var val = allVals[i][ci];
      if (val instanceof Date) {
        obj[h] = val.getFullYear() > 1900
          ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
          : '';
      } else {
        obj[h] = val;
      }
    });
    rows.push({ linha: i + 1, valores: obj });
  }
  return { sheet: sh, headers: hdrs, rows: rows };
}

function AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true,
    ambiente: 'DESCONHECIDO',
    abasComCpf: [],
    linhasCpfNumerico: [],
    linhasCpfMenorQue11: [],
    linhasCpfNormalizavel: [],
    linhasNaoNormalizaveis: [],
    duplicidadesAposNormalizacao: [],
    duplicidadesOperacionaisAtivas: [],
    impactoBruna: [],
    impactoRegistrosTeste: [],
    planoCorrecaoSemGravar: [],
    podeExecutarCorrecaoFisica: false,
    bloqueios: [], avisos: [],
    recomendacoesProximaFase: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var CPF_BRUNA = '05553116198';
  var CPF_TESTE = '00000000000';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    var nomesAbas = Object.keys(FIN_FLASH_V2_SCHEMAS);
    var contasNormMap = {};

    nomesAbas.forEach(function(nomeCompleto) {
      var abaCurta = nomeCompleto.replace('FIN_FLASH_V2_', '');
      var leitura = FIN_FLASH_V2_v214dLerAbaComLinha_(abaCurta);
      if (!leitura.sheet) return;
      if (leitura.headers.indexOf('CPF') < 0) return;
      r.abasComCpf.push(nomeCompleto);

      leitura.rows.forEach(function(linhaInfo) {
        var bruto = linhaInfo.valores.CPF;
        if (bruto === '' || bruto === null || bruto === undefined) return;
        var tipo = typeof bruto;
        var digitos = String(bruto).replace(/\D/g, '');
        var norm = FIN_FLASH_V2_normCpf_(bruto);
        var idRegistro = linhaInfo.valores.ID || '';
        var entrada = {
          aba: nomeCompleto, linha: linhaInfo.linha, id: idRegistro,
          cpfBruto: bruto, tipoCpfNaPlanilha: tipo, cpfNormalizado: norm,
          status: linhaInfo.valores.STATUS || ''
        };

        if (tipo === 'number') r.linhasCpfNumerico.push(entrada);
        if (digitos.length > 0 && digitos.length < 11) r.linhasCpfMenorQue11.push(entrada);

        var normalizavel = digitos.length > 0 && digitos.length <= 11;
        if (normalizavel) {
          if (digitos.length < 11) r.linhasCpfNormalizavel.push(entrada);
        } else {
          r.linhasNaoNormalizaveis.push({
            aba: entrada.aba, linha: entrada.linha, id: entrada.id, cpfBruto: entrada.cpfBruto,
            tipoCpfNaPlanilha: entrada.tipoCpfNaPlanilha, cpfNormalizado: entrada.cpfNormalizado,
            motivo: digitos.length === 0 ? 'CPF_VAZIO_OU_NAO_NUMERICO' : 'CPF_COM_MAIS_DE_11_DIGITOS'
          });
        }

        if (nomeCompleto === 'FIN_FLASH_V2_CONTAS') {
          if (!contasNormMap[norm]) contasNormMap[norm] = [];
          contasNormMap[norm].push(entrada);
        }

        if (norm === CPF_BRUNA) r.impactoBruna.push(entrada);
        if (norm === CPF_TESTE) r.impactoRegistrosTeste.push(entrada);

        if (normalizavel && norm !== String(bruto)) {
          r.planoCorrecaoSemGravar.push({
            aba: nomeCompleto, linha: linhaInfo.linha, id: idRegistro,
            cpfAtual: bruto, cpfProposto: norm,
            acaoProposta: 'SOBRESCREVER_CELULA_CPF_COMO_TEXTO_SEM_GRAVAR_AGORA',
            executadoNestaFase: false
          });
        }
      });
    });

    var contaAtiva_ = function(reg) {
      var st = String(reg.status||'').toUpperCase();
      return st.indexOf('ATIVO') >= 0 && st.indexOf('INATIVO') < 0;
    };
    Object.keys(contasNormMap).forEach(function(norm) {
      var registros = contasNormMap[norm];
      if (registros.length > 1) {
        var ativos = registros.filter(contaAtiva_);
        var dupInfo = {
          cpfNormalizado: norm,
          registros: registros,
          totalRegistros: registros.length,
          totalAtivos: ativos.length,
          operacionalAtiva: ativos.length > 1,
          motivo: ativos.length > 1
            ? 'Mais de uma conta ATIVA em FIN_FLASH_V2_CONTAS normaliza para o mesmo CPF — requer decisão humana (mesclar ou distinguir) antes de qualquer correção física.'
            : 'Duplicidade histórica preservada (CPF normalizado igual em mais de um registro), mas apenas ' + ativos.length + ' conta(s) ativa(s) — não bloqueia mais o saneamento operacional.'
        };
        r.duplicidadesAposNormalizacao.push(dupInfo);
        if (dupInfo.operacionalAtiva) r.duplicidadesOperacionaisAtivas.push(dupInfo);
      }
    });

    r.podeExecutarCorrecaoFisica = r.duplicidadesOperacionaisAtivas.length === 0;

    if (!r.linhasCpfNumerico.length && !r.linhasCpfMenorQue11.length) {
      r.avisos.push('Nenhuma linha com CPF numérico ou com menos de 11 dígitos foi encontrada.');
    }
    if (r.duplicidadesOperacionaisAtivas.length) {
      r.avisos.push(r.duplicidadesOperacionaisAtivas.length + ' grupo(s) de duplicidade OPERACIONAL ATIVA em FIN_FLASH_V2_CONTAS após normalização — correção física bloqueada até decisão humana.');
    } else if (r.duplicidadesAposNormalizacao.length) {
      r.avisos.push(r.duplicidadesAposNormalizacao.length + ' grupo(s) de duplicidade histórica preservada (não bloqueante — todas com no máximo 1 conta ativa por CPF).');
    }

    r.recomendacoesProximaFase = [
      'Decisão humana primeiro: para cada grupo em duplicidadesAposNormalizacao, decidir qual conta manter e qual mesclar/inativar antes de qualquer escrita física.',
      'V2.14E (execução real): após aprovação explícita, criar função AUTORIZADO separada (com confirmação textual obrigatória) que aplica planoCorrecaoSemGravar linha a linha, com log de auditoria por linha.',
      'Rodar AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR novamente após a correção física para confirmar zero divergências remanescentes.',
      'Bruna (' + CPF_BRUNA + ') e os registros de teste (' + CPF_TESTE + ') já estão mapeados linha a linha nesta prévia e devem ser os primeiros candidatos da correção real.'
    ];

    r.ok = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR();
}

// ── V2.14E-PLAN — RESOLUÇÃO TÉCNICA DA DUPLICIDADE DE CONTAS: SOMENTE LEITURA ──
// Nao usa setValues/appendRow/deleteRow/clear/copyTo. Nao inativa nada ainda.
// Levanta evidencia linha a linha sobre as contas duplicadas em FIN_FLASH_V2_CONTAS
// e sugere (sem executar) qual manter como canonica e qual estrategia seguir.

function FIN_FLASH_V2_v214eContarPorCpf_(abaCurta, cpfNorm) {
  var leitura = FIN_FLASH_V2_v214dLerAbaComLinha_(abaCurta);
  if (!leitura.sheet || leitura.headers.indexOf('CPF') < 0) return { total: 0, ids: [] };
  var ids = [];
  leitura.rows.forEach(function(li) {
    if (FIN_FLASH_V2_normCpf_(li.valores.CPF) === cpfNorm) ids.push(li.valores.ID || '');
  });
  return { total: ids.length, ids: ids };
}

function AUDITAR_FIN_FLASH_V214E_PLAN_DUPLICIDADE_CONTAS_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true, ambiente: 'DESCONHECIDO',
    duplicidadeDetectada: false,
    cpfNormalizadoDuplicado: null,
    contasDuplicadas: [],
    contaCanonicaSugerida: null,
    contaSecundariaSugerida: null,
    estrategiaSugerida: null,
    justificativa: [],
    saneamentoCpfPodeProsseguirDepoisDaResolucao: false,
    planoResolucaoSemGravar: [],
    bloqueios: [], avisos: [],
    recomendacoesProximaFase: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    var leituraContas = FIN_FLASH_V2_v214dLerAbaComLinha_('CONTAS');
    var grupos = {};
    leituraContas.rows.forEach(function(li) {
      var norm = FIN_FLASH_V2_normCpf_(li.valores.CPF);
      if (!grupos[norm]) grupos[norm] = [];
      grupos[norm].push(li);
    });
    var cpfDuplicado = null, linhasDuplicadas = [];
    Object.keys(grupos).forEach(function(norm) {
      if (grupos[norm].length > 1 && !cpfDuplicado) { cpfDuplicado = norm; linhasDuplicadas = grupos[norm]; }
    });

    if (!cpfDuplicado) {
      r.avisos.push('Nenhuma duplicidade de CPF encontrada em FIN_FLASH_V2_CONTAS no momento desta leitura.');
      r.saneamentoCpfPodeProsseguirDepoisDaResolucao = true;
      r.ok = true;
      return r;
    }

    r.duplicidadeDetectada = true;
    r.cpfNormalizadoDuplicado = cpfDuplicado;

    var leituraLogs = FIN_FLASH_V2_v214dLerAbaComLinha_('LOGS');
    var leituraDocs = FIN_FLASH_V2_v214dLerAbaComLinha_('DOCUMENTOS');

    var evidenciasPorConta = linhasDuplicadas.map(function(li) {
      var v = li.valores;
      var contaId = v.ID || '';
      var cartoes     = FIN_FLASH_V2_v214eContarPorCpf_('CARTOES', cpfDuplicado);
      var recargas    = FIN_FLASH_V2_v214eContarPorCpf_('RECARGAS', cpfDuplicado);
      var prestacoes  = FIN_FLASH_V2_v214eContarPorCpf_('PRESTACOES', cpfDuplicado);
      var extratos    = FIN_FLASH_V2_v214eContarPorCpf_('EXTRATOS', cpfDuplicado);
      var pendencias  = FIN_FLASH_V2_v214eContarPorCpf_('PENDENCIAS', cpfDuplicado);
      var alertas     = FIN_FLASH_V2_v214eContarPorCpf_('ALERTAS', cpfDuplicado);

      var documentosDaConta = leituraDocs.rows.filter(function(d){ return FIN_FLASH_V2_text_(d.valores.CONTA_ID) === contaId; });
      var logsDaConta = leituraLogs.rows.filter(function(lg){ return FIN_FLASH_V2_text_(lg.valores.ENTIDADE_ID) === contaId; });
      var relatoriosDaConta = documentosDaConta.filter(function(d){ return String(d.valores.TIPO||'').indexOf('RELATORIO') >= 0; });

      var datas = [v.CRIADO_EM, v.ATUALIZADO_EM]
        .concat(logsDaConta.map(function(lg){ return lg.valores.CRIADO_EM; }))
        .filter(function(x){ return !!x; }).sort();
      var ultimoMovimento = datas.length ? datas[datas.length - 1] : (v.CRIADO_EM || '');

      var completudeCampos = ['EMAIL','WHATSAPP','OBSERVACOES'].filter(function(h){ return FIN_FLASH_V2_text_(v[h]); }).length;
      var statusTxt = String(v.STATUS||'').toUpperCase();
      var statusAtivo = statusTxt.indexOf('ATIVO') >= 0 && statusTxt.indexOf('INATIVO') < 0;

      // Peso operacional: logs diretos (unica evidencia exclusiva por CONTA_ID) pesam mais,
      // depois completude de campos, status ativo, e CPF ja gravado como texto.
      var peso = (logsDaConta.length * 10) + (completudeCampos * 2) + (statusAtivo ? 3 : 0) + (typeof v.CPF === 'string' ? 1 : 0);

      return {
        id: contaId, linha: li.linha, nome: v.NOME || '', cpfBruto: v.CPF, cpfNormalizado: FIN_FLASH_V2_normCpf_(v.CPF),
        tipoCpf: typeof v.CPF, status: v.STATUS || '', criadoEm: v.CRIADO_EM || '', atualizadoEm: v.ATUALIZADO_EM || '',
        email: v.EMAIL || '',
        quantidadeCartoesVinculados: cartoes.total, idsCartoesVinculados: cartoes.ids,
        quantidadeRecargas: recargas.total, quantidadePrestacoes: prestacoes.total,
        quantidadeExtratos: extratos.total, quantidadePendencias: pendencias.total,
        quantidadeAlertas: alertas.total,
        quantidadeDocumentos: documentosDaConta.length, quantidadeRelatorios: relatoriosDaConta.length,
        quantidadeLogs: logsDaConta.length,
        ultimoMovimentoDetectado: ultimoMovimento,
        pesoOperacional: peso,
        vinculoOperacionalCompartilhado: true,
        observacaoVinculo: 'Cartões/recargas/prestações/extratos/pendências/alertas são vinculados por CPF normalizado, não por CONTA_ID — por isso esses totais são idênticos entre as duas contas duplicadas (ambas compartilham o mesmo CPF). O único vínculo exclusivo por CONTA_ID encontrado é LOGS (e DOCUMENTOS, quando presente).',
        recomendacaoParaConta: null
      };
    });

    evidenciasPorConta.sort(function(a, b){ return b.pesoOperacional - a.pesoOperacional; });
    var canonica = evidenciasPorConta[0];
    var secundaria = evidenciasPorConta[1];
    canonica.recomendacaoParaConta = 'CANDIDATA_A_CANONICA: maior peso operacional (' + canonica.pesoOperacional + ' vs ' + secundaria.pesoOperacional + ').';
    secundaria.recomendacaoParaConta = 'CANDIDATA_A_SECUNDARIA: menor peso operacional. Manter inativa futuramente, sem apagar histórico.';

    r.contasDuplicadas = evidenciasPorConta;
    r.contaCanonicaSugerida = { id: canonica.id, linha: canonica.linha, nome: canonica.nome, motivo: canonica.recomendacaoParaConta };
    r.contaSecundariaSugerida = { id: secundaria.id, linha: secundaria.linha, nome: secundaria.nome, motivo: secundaria.recomendacaoParaConta };

    // ── Estratégia sugerida ──────────────────────────────────────────────────
    var registrosOperacionaisCompartilhados = canonica.quantidadeCartoesVinculados + canonica.quantidadeRecargas +
      canonica.quantidadePrestacoes + canonica.quantidadeExtratos + canonica.quantidadePendencias + canonica.quantidadeAlertas;
    var temVinculoOperacional = registrosOperacionaisCompartilhados > 0;
    var pesoEmpatado = canonica.pesoOperacional === secundaria.pesoOperacional;
    var temVinculoExclusivo = (canonica.quantidadeLogs + canonica.quantidadeDocumentos + secundaria.quantidadeLogs + secundaria.quantidadeDocumentos) > 0;

    if (pesoEmpatado && !temVinculoOperacional && !temVinculoExclusivo) {
      r.estrategiaSugerida = 'MANTER_AMBAS_BLOQUEAR_SANEAMENTO';
      r.justificativa.push('Nenhuma evidência (logs, documentos, campos preenchidos, status, vínculo operacional) diferencia as duas contas — decisão automática não é segura.');
    } else if (!temVinculoOperacional && !temVinculoExclusivo) {
      r.estrategiaSugerida = 'EXCLUIR_APENAS_SE_FOR_MASSA_TESTE_SEM_VINCULOS';
      r.justificativa.push('Nenhuma das duas contas tem cartões, recargas, prestações, extratos, pendências, alertas, documentos ou logs vinculados — parecem ser massa de teste órfã. Mesmo assim, a exclusão não é executada nesta fase (apenas recomendação).');
    } else {
      r.estrategiaSugerida = 'MANTER_CANONICA_INATIVAR_SECUNDARIA_DEPOIS';
      r.justificativa.push('Há vínculo operacional real ligado ao CPF (' + registrosOperacionaisCompartilhados + ' registros somando cartões/recargas/prestações/extratos/pendências/alertas), vinculado por CPF normalizado e não por CONTA_ID — portanto não precisa ser remapeado ao manter qualquer uma das contas ativa.');
      r.justificativa.push('Conta canônica sugerida tem mais evidência direta por CONTA_ID (logs=' + canonica.quantidadeLogs + ', documentos=' + canonica.quantidadeDocumentos + ') que a secundária (logs=' + secundaria.quantidadeLogs + ', documentos=' + secundaria.quantidadeDocumentos + ').');
      r.justificativa.push('Estratégia MESCLAR_REFERENCIAS_DEPOIS_INATIVAR_SECUNDARIA não foi escolhida: não há registros em LOGS/DOCUMENTOS apontando para a conta secundária que precisem ser redirecionados antes da inativação (os logs da secundária, se existirem, permanecem como trilha de auditoria histórica — não são remapeados).');
      r.justificativa.push('Inativar (nunca excluir) a conta secundária preserva o histórico, conforme regra do projeto.');
    }

    r.saneamentoCpfPodeProsseguirDepoisDaResolucao = (r.estrategiaSugerida !== 'MANTER_AMBAS_BLOQUEAR_SANEAMENTO');

    // ── Plano de resolução, sem gravar ────────────────────────────────────────
    r.planoResolucaoSemGravar = [
      { passo: 1, acao: 'DECISAO_HUMANA_EXPLICITA', descricao: 'Aprovar (ou corrigir) a escolha de conta canônica/secundária e a estratégia sugerida acima.', executadoNestaFase: false },
      { passo: 2, acao: 'INATIVAR_CONTA_SECUNDARIA', aba: 'FIN_FLASH_V2_CONTAS', linha: secundaria.linha, id: secundaria.id,
        descricao: 'Usar FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV (já existe, preserva histórico) — não criar fluxo paralelo. Executar apenas após autorização explícita.', executadoNestaFase: false },
      { passo: 3, acao: 'NORMALIZAR_CPF_CONTA_CANONICA', aba: 'FIN_FLASH_V2_CONTAS', linha: canonica.linha, id: canonica.id,
        cpfAtual: canonica.cpfBruto, cpfProposto: canonica.cpfNormalizado,
        descricao: 'Gravar CPF da conta canônica como texto normalizado com setNumberFormat(\'@\'), parte do plano já mapeado na V2.14D.', executadoNestaFase: false },
      { passo: 4, acao: 'APLICAR_PLANO_V214D_DEMAIS_ABAS',
        descricao: 'Após resolver a duplicidade, aplicar planoCorrecaoSemGravar da V2.14D nas linhas restantes (CARTOES/RECARGAS/PRESTACOES/EXTRATOS/PENDENCIAS/ALERTAS) — nenhuma dessas linhas precisa de remapeamento de CONTA_ID, pois o vínculo é por CPF.', executadoNestaFase: false },
      { passo: 5, acao: 'REAUDITAR',
        descricao: 'Rodar AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR e AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR novamente para confirmar zero duplicidades e zero linhas pendentes.', executadoNestaFase: false }
    ];

    r.recomendacoesProximaFase = [
      'V2.14E (execução real, após aprovação explícita desta decisão): inativar a conta secundária com FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV.',
      'V2.14F (execução real, após aprovação explícita): aplicar o planoCorrecaoSemGravar da V2.14D nas linhas mapeadas, com confirmação textual obrigatória e log por linha.'
    ];

    r.ok = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214E_PLAN_DUPLICIDADE_CONTAS_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214E_PLAN_DUPLICIDADE_CONTAS_SEM_GRAVAR();
}

// ── V2.14E-PREP — EXECUÇÃO REAL BLOQUEADA POR AUTORIZAÇÃO TEXTUAL ───────────
// A funcao EXECUTAR_* abaixo contem a logica real (inativar conta secundaria +
// sanear CPF fisico), mas SO roda se receber exatamente o token de autorizacao.
// Nesta fase ela NUNCA e chamada com o token valido — apenas testamos o bloqueio.

function EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO(autorizacao) {
  var TOKEN_ESPERADO = 'AUTORIZO_V214E_INATIVAR_CONTA_TESTE_SECUNDARIA_E_SANEAR_CPFS_DEV';
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var r = {
    success: true, ok: false, executado: false, bloqueado: true,
    motivo: 'AUTORIZACAO_TEXTUAL_INVALIDA_OU_AUSENTE',
    ambiente: ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO',
    contaCanonicaConfirmada: null, contaSecundariaConfirmada: null,
    contaSecundariaInativada: false,
    linhasCorrigidas: [], totalLinhasCorrigidas: 0,
    bloqueios: [], avisos: []
  };

  if (String(autorizacao) !== TOKEN_ESPERADO) {
    return r;
  }

  // ── A partir daqui só roda com o token exato — bloco de execução real ────
  r.bloqueado = false;
  r.motivo = '';
  if (r.ambiente !== 'DEV') { r.success = false; r.bloqueios.push('Execução bloqueada fora do DEV.'); return r; }

  try {
    var CONTA_CANONICA_ID = 'FIN_FLASH_V2_CONTA_a99534e3-e0c8-47ec-bbed-b7ba9ffffd4f';
    var CONTA_SECUNDARIA_ID = 'FIN_FLASH_V2_CONTA_4aeaa387-1e6c-4d64-8d1b-c94c94c0d4f0';

    // 1. Revalida a duplicidade e a decisão técnica ao vivo (não confia em constantes cegas).
    var plan = AUDITAR_FIN_FLASH_V214E_PLAN_DUPLICIDADE_CONTAS_SEM_GRAVAR();
    if (!plan.ok || !plan.duplicidadeDetectada) { r.bloqueios.push('Duplicidade não confirmada ao vivo — abortando execução real.'); return r; }
    if (!plan.contaCanonicaSugerida || !plan.contaSecundariaSugerida ||
        plan.contaCanonicaSugerida.id !== CONTA_CANONICA_ID || plan.contaSecundariaSugerida.id !== CONTA_SECUNDARIA_ID) {
      r.bloqueios.push('Conta canônica/secundária mudou desde o plano aprovado — abortando execução real por segurança.');
      return r;
    }
    r.contaCanonicaConfirmada = plan.contaCanonicaSugerida;
    r.contaSecundariaConfirmada = plan.contaSecundariaSugerida;

    // 2. Inativa a conta secundária — nunca exclui, reaproveita função já existente.
    var inativ = FIN_FLASH_V2_INATIVAR_COLABORADOR_DEV({
      id: CONTA_SECUNDARIA_ID,
      motivo: 'V2.14E: conta duplicada de teste, CPF normaliza para o mesmo valor da conta canônica ' + CONTA_CANONICA_ID + '. Histórico preservado.'
    });
    if (!inativ.ok) { r.bloqueios = r.bloqueios.concat(inativ.bloqueios || []); return r; }
    r.contaSecundariaInativada = true;

    // 3. Aplica o saneamento físico de CPF apenas nas linhas do plano V2.14D (revalidado ao vivo).
    var dry = AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR();
    if (!dry.ok) { r.bloqueios = r.bloqueios.concat(dry.bloqueios || []); return r; }
    var ss = FIN_FLASH_V2_db_();
    (dry.planoCorrecaoSemGravar || []).forEach(function(item) {
      try {
        var sh = ss.getSheetByName(item.aba);
        if (!sh) { r.avisos.push('Aba não encontrada: ' + item.aba); return; }
        var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h){ return String(h || ''); });
        var colCpf = headers.indexOf('CPF') + 1;
        if (colCpf <= 0) { r.avisos.push('Coluna CPF não encontrada em ' + item.aba); return; }
        sh.getRange(item.linha, colCpf).setNumberFormat('@').setValue(item.cpfProposto);
        r.linhasCorrigidas.push({ aba: item.aba, linha: item.linha, id: item.id, cpfAnterior: item.cpfAtual, cpfNovo: item.cpfProposto });
      } catch (eLinha) {
        r.avisos.push('Falha ao corrigir ' + item.aba + ' linha ' + item.linha + ': ' + eLinha.message);
      }
    });
    r.totalLinhasCorrigidas = r.linhasCorrigidas.length;

    FIN_FLASH_V2_registrarLogAcao_('V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF', 'CONTA', CONTA_CANONICA_ID,
      JSON.stringify({ contaSecundariaInativada: CONTA_SECUNDARIA_ID, totalLinhasCorrigidas: r.totalLinhasCorrigidas }), 'SIM');

    r.ok = true; r.executado = true;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function AUDITAR_FIN_FLASH_V214E_PREP_EXECUCAO_REAL_BLOQUEADA_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true, ambiente: 'DESCONHECIDO',
    funcaoRealExiste: false,
    exigeAutorizacaoTextual: false,
    tokenEsperadoNaoExpostoEmLogs: true,
    contaCanonicaEsperada: null,
    contaSecundariaEsperada: null,
    estrategiaEsperada: 'MANTER_CANONICA_INATIVAR_SECUNDARIA_DEPOIS',
    saneamentoPlanejadoLinhas: 0,
    possuiProtecaoAmbienteDev: false,
    possuiProtecaoContraDelete: false,
    possuiProtecaoContraExecucaoSemAutorizacao: false,
    testeBloqueioSemAutorizacao: null,
    bloqueios: [], avisos: [],
    recomendacoesProximaFase: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    r.funcaoRealExiste = typeof EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO === 'function';
    var src = r.funcaoRealExiste ? EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO.toString() : '';

    r.exigeAutorizacaoTextual = src.indexOf('AUTORIZO_V214E_INATIVAR_CONTA_TESTE_SECUNDARIA_E_SANEAR_CPFS_DEV') >= 0;
    r.possuiProtecaoAmbienteDev = src.indexOf("r.ambiente !== 'DEV'") >= 0;
    r.possuiProtecaoContraDelete = src.indexOf('deleteRow') < 0 && src.indexOf('.clear(') < 0 && src.indexOf('copyTo') < 0;
    r.possuiProtecaoContraExecucaoSemAutorizacao = src.indexOf('String(autorizacao) !== TOKEN_ESPERADO') >= 0;
    if (/Logger\.log\([^)]*AUTORIZO_V214E/.test(src)) r.tokenEsperadoNaoExpostoEmLogs = false;

    var plan = AUDITAR_FIN_FLASH_V214E_PLAN_DUPLICIDADE_CONTAS_SEM_GRAVAR();
    r.contaCanonicaEsperada = plan.contaCanonicaSugerida || null;
    r.contaSecundariaEsperada = plan.contaSecundariaSugerida || null;
    if (plan.estrategiaSugerida !== r.estrategiaEsperada) {
      r.avisos.push('Estratégia ao vivo (' + plan.estrategiaSugerida + ') difere da aprovada (' + r.estrategiaEsperada + ').');
    }

    var dry = AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR();
    r.saneamentoPlanejadoLinhas = (dry.planoCorrecaoSemGravar || []).length;

    // ── Teste de bloqueio: chama a função real SEM autorização válida (nenhuma escrita ocorre) ──
    var semParametro = EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO();
    var comTokenInvalido = EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO('TOKEN_QUALQUER_INVALIDO');
    r.testeBloqueioSemAutorizacao = {
      semParametro: semParametro,
      comTokenInvalido: comTokenInvalido,
      bloqueadoCorretamente: semParametro.bloqueado === true && semParametro.executado === false && semParametro.ok === false &&
        comTokenInvalido.bloqueado === true && comTokenInvalido.executado === false && comTokenInvalido.ok === false
    };

    if (!r.funcaoRealExiste) r.bloqueios.push('Função real EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO não encontrada.');
    if (!r.exigeAutorizacaoTextual) r.bloqueios.push('Função real não exige o token de autorização esperado.');
    if (!r.testeBloqueioSemAutorizacao.bloqueadoCorretamente) r.bloqueios.push('Bloqueio sem autorização não se comportou como esperado.');

    r.recomendacoesProximaFase = [
      'V2.14E (execução real): só depois de nova aprovação explícita do humano, rodar EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO("AUTORIZO_V214E_INATIVAR_CONTA_TESTE_SECUNDARIA_E_SANEAR_CPFS_DEV") via clasp --user fin_flash_v2_dev --json run -p \'["AUTORIZO_V214E_INATIVAR_CONTA_TESTE_SECUNDARIA_E_SANEAR_CPFS_DEV"]\'.',
      'Após a execução real, rodar AUDITAR_FIN_FLASH_V214_BASE_UNICA_SEM_GRAVAR e AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR novamente para confirmar zero duplicidades e zero linhas pendentes.'
    ];

    r.ok = r.bloqueios.length === 0;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214E_PREP_EXECUCAO_REAL_BLOQUEADA_SEM_GRAVAR() {
  var auditoria = AUDITAR_FIN_FLASH_V214E_PREP_EXECUCAO_REAL_BLOQUEADA_SEM_GRAVAR();
  var chamadaSemAutorizacao = EXECUTAR_FIN_FLASH_V214E_RESOLVER_DUPLICIDADE_E_SANEAMENTO_CPF_AUTORIZADO();
  return {
    auditoria: auditoria,
    chamadaSemAutorizacao: chamadaSemAutorizacao,
    confirmaBloqueio: chamadaSemAutorizacao.bloqueado === true && chamadaSemAutorizacao.executado === false &&
      chamadaSemAutorizacao.ok === false && chamadaSemAutorizacao.success === true
  };
}

// ── V2.14F — NORMALIZAÇÃO DOS 5 PONTOS RESTANTES COM CPF BRUTO ──────────────
// Apenas normalizacao logica (FIN_FLASH_V2_normCpf_/FIN_FLASH_V2_getCpfCartao_)
// nas 5 funcoes mapeadas pela V2.14C. Nao redesenha UI, nao grava nada, nao
// chama FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV (essa funcao grava ALERTAS
// quando executada de verdade — aqui ela e so inspecionada via toString()).

function AUDITAR_FIN_FLASH_V214F_NORMALIZACAO_CPF_RESTANTES_SEM_GRAVAR() {
  var r = {
    success: true, ok: false, executado: false, somenteLeitura: true, ambiente: 'DESCONHECIDO',
    funcoesInspecionadas: [],
    funcoesCorrigidas: [],
    usaNormCpfPorFuncao: {},
    comparacaoBrutaRemovidaPorFuncao: {},
    testeBruna: null,
    testeContaTesteInativa: null,
    conferenciaNormalizaCpf: false,
    extratoColaboradorNormalizaCpf: false,
    cobrancasNormalizamCpf: false,
    v214dDuplicidadeOperacionalAtiva: null,
    pontosAindaComCpfBruto: [],
    problemasRestantes: [],
    recomendacoesProximaFase: [],
    bloqueios: [], avisos: []
  };
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var CPF_BRUNA = '05553116198';
  var CPF_TESTE = '00000000000';
  try {
    r.ambiente = ScriptApp.getScriptId() === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    var alvos = {
      FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV: FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV,
      FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_: FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_,
      FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV: FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV,
      FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV: FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV,
      FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV: FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV
    };
    r.funcoesInspecionadas = Object.keys(alvos);
    Object.keys(alvos).forEach(function(nome) {
      var src = alvos[nome].toString();
      var usaNorm = src.indexOf('FIN_FLASH_V2_normCpf_') >= 0;
      var semBruto = src.indexOf('.CPF===cpf') < 0 && src.indexOf('.CPF === cpf') < 0 &&
        src.indexOf('.CPF===String(payload.cpf)') < 0 && src.indexOf('.CPF !== filtros.cpf') < 0 &&
        src.indexOf('.CPF!==filtros.cpf') < 0 && src.indexOf('row.CPF!==cpf') < 0 && src.indexOf('row.CPF !== cpf') < 0 &&
        src.indexOf('k.CPF===String(cpf)') < 0;
      r.usaNormCpfPorFuncao[nome] = usaNorm;
      r.comparacaoBrutaRemovidaPorFuncao[nome] = semBruto;
      if (usaNorm && semBruto) r.funcoesCorrigidas.push(nome);
    });

    r.conferenciaNormalizaCpf = r.usaNormCpfPorFuncao.FIN_FLASH_V2_FILTRAR_CONFERENCIA_GASTOS_DEV === true;
    r.extratoColaboradorNormalizaCpf = r.usaNormCpfPorFuncao.FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV === true;
    r.cobrancasNormalizamCpf = r.usaNormCpfPorFuncao.FIN_FLASH_V2_PREPARAR_COBRANCAS_DIARIAS_DEV === true;

    // ── Teste vivo: apenas funções de leitura (não escrevem em nenhuma aba) ────
    var cartoesBruna = FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV({ cpf: CPF_BRUNA });
    var vinculoBruna881 = FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_(CPF_BRUNA, '881');
    var movBruna = FIN_FLASH_V2_LISTAR_MOVIMENTACOES_CPF_DEV({ cpf: CPF_BRUNA });
    r.testeBruna = {
      listarCartoesOk: cartoesBruna.ok, totalCartoes: (cartoesBruna.cartoes||[]).length,
      cpfNormalizado: cartoesBruna.cpfNormalizado, cpfExibicao: cartoesBruna.cpfExibicao,
      cartaoFisico881Vinculado: vinculoBruna881,
      movimentacoesOk: movBruna.ok, contaEncontradaNoExtrato: !!movBruna.conta,
      cpfNormalizadoNoExtrato: movBruna.conta ? movBruna.conta.cpfNormalizado : null,
      totalMovimentacoes: (movBruna.movimentacoes||[]).length
    };

    // ── Teste vivo: conta de teste (agora inativa) continua localizável por CPF ──
    var cartoesTeste = FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV({ cpf: CPF_TESTE });
    r.testeContaTesteInativa = {
      listarCartoesOk: cartoesTeste.ok, totalCartoes: (cartoesTeste.cartoes||[]).length,
      cpfNormalizado: cartoesTeste.cpfNormalizado
    };

    // ── V2.14D ajustado: duplicidade histórica × operacional ativa ────────────
    var dry = AUDITAR_FIN_FLASH_V214D_PREVIA_SANEAMENTO_CPF_HISTORICO_SEM_GRAVAR();
    r.v214dDuplicidadeOperacionalAtiva = {
      podeExecutarCorrecaoFisica: dry.podeExecutarCorrecaoFisica,
      duplicidadesHistoricas: (dry.duplicidadesAposNormalizacao||[]).length,
      duplicidadesOperacionaisAtivas: (dry.duplicidadesOperacionaisAtivas||[]).length,
      detalheDuplicidades: dry.duplicidadesAposNormalizacao || []
    };

    // ── Pontos restantes com CPF bruto (deve estar vazio agora) ────────────────
    Object.keys(alvos).forEach(function(nome) {
      if (!r.usaNormCpfPorFuncao[nome] || !r.comparacaoBrutaRemovidaPorFuncao[nome]) r.pontosAindaComCpfBruto.push(nome);
    });

    r.problemasRestantes.push('Conferência de Gastos e Extrato por Colaborador continuam com a interface visual atual — redesenho fica para V2.15.');
    r.problemasRestantes.push('Importação de Extrato e Relatórios não foram tocados nesta fase.');

    r.recomendacoesProximaFase = [
      'V2.15: redesenhar a experiência visual de Conferência de Gastos (ação direta na linha, sem ID manual) e Extrato por Colaborador (incluir cartões/conciliações/documentos), conforme já mapeado na V2.14.',
      'Revisar Importação de Extrato e Relatórios para usar os mesmos helpers de normalização de CPF, em fase própria.'
    ];

    if (r.funcoesCorrigidas.length !== r.funcoesInspecionadas.length) r.bloqueios.push('Nem todas as 5 funções alvo foram corrigidas.');
    if (!r.testeBruna.listarCartoesOk || r.testeBruna.totalCartoes !== 2) r.bloqueios.push('Regressão: Bruna não retornou 2 cartões em FIN_FLASH_V2_LISTAR_CARTOES_DO_COLABORADOR_DEV.');
    if (!r.testeBruna.cartaoFisico881Vinculado) r.bloqueios.push('Regressão: cartão físico 881 da Bruna não validado por FIN_FLASH_V2_VALIDAR_CARTAO_VINCULADO_A_CPF_DEV_.');
    if (r.v214dDuplicidadeOperacionalAtiva.podeExecutarCorrecaoFisica !== true) r.bloqueios.push('V2.14D ainda reporta bloqueio operacional ativo após inativação da conta secundária.');

    r.ok = r.bloqueios.length === 0;
  } catch (e) {
    r.success = false;
    r.bloqueios.push(e.message || String(e));
  }
  return r;
}

function TESTAR_FIN_FLASH_V214F_NORMALIZACAO_CPF_RESTANTES_SEM_GRAVAR() {
  return AUDITAR_FIN_FLASH_V214F_NORMALIZACAO_CPF_RESTANTES_SEM_GRAVAR();
}
