/* Documentos dos padrões de referência (inventário e solicitação de orçamento), A4 paisagem.
 * Padrão comum de 18/10/2026 (docs/DOCUMENTOS_PADRAO_A4_20261018.md): estilos da SGO_DocA4,
 * cabeçalho e rodapé corridos da SGO_RelTecA4, seções e tabelas numeradas, sem nomes de
 * campo internos no texto. O CSS próprio está em SGO_Padroes_DocumentoCSS.js. */
function PadDoc_esc_(v) { return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function PadDoc_vazio_(v) { var s=String(v==null?'':v).trim(); return !s||/^(n[ãâa]o consta|n\/c|n[ãa]o informado|---|—|-)$/i.test(s); }
/** Valor de célula: vazio vira "—" (padrão das tabelas). */
function PadDoc_val_(v) { return PadDoc_vazio_(v) ? '—' : PadDoc_esc_(String(v).trim()); }
function PadDoc_horario_(v) { return v ? Utilities.formatDate(new Date(v),'America/Sao_Paulo','dd/MM/yyyy HH:mm') : ''; }
function PadDoc_data_(v) { return v ? Utilities.formatDate(new Date(v),'America/Sao_Paulo','dd/MM/yyyy') : ''; }
function PadDoc_paragrafos_(v) { return String(v||'').split(/\n\s*\n/).filter(function(p){return p.trim();}).map(function(p){return '<p>'+PadDoc_esc_(p.trim()).replace(/\n/g,'<br>')+'</p>';}).join(''); }

/** Rótulos legíveis dos campos do cadastro (nunca o nome interno no documento). */
var PAD_DOC_ROTULOS = {
  LOCALIZACAO:'localização', MARCA:'marca', MODELO:'modelo', SERIE:'número de série', FAIXA:'faixa de medição',
  GRANDEZA:'grandeza', UNIDADE:'unidade', RESOLUCAO:'resolução', LABORATORIO:'laboratório', DATA_CALIBRACAO:'data da calibração',
  PONTOS:'pontos de calibração', RESULTADOS_CERTIFICADO:'resultados por ponto', METODO:'método', RASTREABILIDADE:'rastreabilidade',
  OBSERVACOES_TECNICAS:'observações técnicas', CERTIFICADO_NUMERO:'número do certificado', VALIDADE:'vencimento',
  'PDF do certificado':'PDF do certificado',
  'leitura automática ou conferência do certificado atual':'conferência dos dados com o certificado atual',
  'divergências entre cadastro e certificado':'divergências entre o cadastro e o certificado',
  'Localização não informada':'localização', 'Vencimento não informado':'vencimento'
};
function PadDoc_rotuloPendencia_(k) { return PAD_DOC_ROTULOS[k] || String(k||'').toLowerCase().replace(/_/g,' '); }

/** Nome da pessoa a partir do login (cadastro de usuários); sem cadastro, o próprio login. Nunca lança. */
function PadDoc_nomeUsuario_(login) {
  var l = String(login||'').trim(); if (!l) return '';
  try {
    // Cache curto: o servidor reaproveita o mesmo processo entre chamadas.
    if (!PadDoc_nomeUsuario_.cache || Date.now() - PadDoc_nomeUsuario_.em > 60000) {
      var m = {};
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u){ var k=String(u.USUARIO||'').trim().toLowerCase(); if(k&&u.NOME)m[k]=String(u.NOME).trim(); });
      PadDoc_nomeUsuario_.cache = m; PadDoc_nomeUsuario_.em = Date.now();
    }
    return PadDoc_nomeUsuario_.cache[l.toLowerCase()] || l;
  } catch (e) { return l; }
}

function PadDoc_contagem_(itens) {
  var c={OK:0,VENCENDO:0,VENCIDO:0,SEM_VALIDADE:0,VALIDADE_INVALIDA:0,PENDENTE:0,INATIVO:0},certs=Object.create(null);
  itens.forEach(function(p){
    if(Object.prototype.hasOwnProperty.call(c,p.situacao))c[p.situacao]++;
    if(PadDoc_pendencias_(p).length)c.PENDENTE++;
    if(p.STATUS==='INATIVO')c.INATIVO++;
    // Mesmo número pode existir em laboratórios diferentes; ausência não é certificado.
    if(p.CERTIFICADO_NUMERO){var k=String(p.LABORATORIO||'').trim().toUpperCase()+'|'+String(p.CERTIFICADO_NUMERO).trim().toUpperCase();certs[k]=true;}
  });
  c.certificados=Object.keys(certs).length;return c;
}
function PadDoc_tabela_(headers,rows) {
  return '<table class="t compacta pd-detalhe"><thead><tr>'+headers.map(function(v){return '<th scope="col">'+PadDoc_esc_(v)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(v,i){return '<td'+(i&&/^([-+−]?\d[\d.,]*|∞)$/.test(String(v||'').trim())?' class="num"':'')+'>'+PadDoc_val_(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
}
/** Faixas e resultados transcritos do certificado: tabela com cabeçalho (colunas "|") ou itens. '' se vazio. */
function PadDoc_detalhes_(v,tipo) {
  var text=String(v||'').trim();if(PadDoc_vazio_(text))return '';
  var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});
  if(lines.length>1 && lines.every(function(l){return l.indexOf('|')>=0;})) {
    var rows=lines.map(function(l){return l.split('|').map(function(s){return s.trim();});});
    var n=rows[0].length;
    if(rows.every(function(r){return r.length===n;})&&n<=12)return PadDoc_tabela_(rows.shift(),rows);
  }
  // Legado: preserva literalmente todos os valores; não tenta recalcular ou
  // adivinhar colunas em prosa heterogênea. Um ponto por linha, canal explícito.
  if(tipo==='resultados'&&text.indexOf('[')>=0){
    var re=/([^\[\]]*)\[([^\[\]]*)\]/g,m,rws=[],canal='',end=0,valid=true;
    while((m=re.exec(text))){var prefix=m[1].replace(/^[\s,;]+/,'').trim();if(prefix){if(!/:\s*$/.test(prefix)){valid=false;break;}canal=prefix.replace(/:\s*$/,'');}rws.push([canal,m[2]]);end=re.lastIndex;}
    if(valid&&rws.length&&!text.slice(end).replace(/[\s,;.]/g,''))return PadDoc_tabela_(['Grandeza / canal','Resultado transcrito por ponto'],rws);
  }
  var parts=text.split(/\r?\n|;\s*/).filter(function(s){return s.trim();});
  return PadDoc_tabela_([tipo==='faixa'?'Grandeza / canal':'Item',tipo==='faixa'?'Faixa declarada':'Informação transcrita'],parts.map(function(p,i){var j=p.indexOf(':');return j>0?[p.slice(0,j).trim(),p.slice(j+1).trim()]:[String(i+1),p.trim()];}));
}

/** Número legível do documento; o ID interno (uuid) fica só no histórico e no nome do arquivo .json. */
function PadDoc_numero_(ctx) { return ctx.numero || ctx.id || ''; }

/**
 * Esqueleto comum (paisagem): o.titulo, o.situacao, o.ficha [[rótulo, valor, {largo}]], o.corpo (HTML).
 * A 1ª folha abre com o logo e o número (sem cabeçalho corrido); as demais têm cabeçalho e rodapé da RelTecA4.
 */
function PadDoc_documento_(ctx, o) {
  var empresa=ctx.empresa||{};
  var numero=PadDoc_numero_(ctx);
  var empresaTxt=(empresa.nome||'Metrolab Soluções em Engenharia Clínica LTDA')+(empresa.cnpj?' — CNPJ '+empresa.cnpj:'');
  var doc={titulo:o.titulo,tituloCurto:o.titulo,numero:numero,revisao:'00',orientacao:'paisagem',empresa:{nome:empresa.nome,cnpj:empresa.cnpj}};
  var css=SGO_DocA4_estilos_(doc)+RelTecA4_css_({titulo:o.titulo,numero:numero,revisao:'00',orientacao:'paisagem',empresa:empresaTxt})+PAD_DOC_CSS;
  var h='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+PadDoc_esc_(o.titulo+(numero?' nº '+numero:''))+'</title><style>'+css+'</style></head><body>'+
    '<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div><main class="folha">';
  h+='<header class="pd-abertura"><img src="'+SGO_DocA4_logoDataUri_()+'" alt="Metrolabs"><div class="meta"><b>Nº '+PadDoc_esc_(numero||'—')+'</b> · Revisão 00<br>'+PadDoc_esc_(empresaTxt)+'</div></header>';
  h+='<h1>'+PadDoc_esc_(o.titulo)+'</h1><p class="subtitulo">'+PadDoc_esc_(o.situacao)+'</p>';
  h+=PadDoc_ficha3_(o.ficha);
  if(o.sumario)h+=RelTecA4_sumario_();
  h+=o.corpo+'</main></body></html>';
  return h;
}

/** Ficha do documento em três pares por linha (folha paisagem): rótulo | valor. */
function PadDoc_ficha3_(pares) {
  var l=(pares||[]).filter(function(p){return p&&p[0];}), linhas=[];
  for(var i=0;i<l.length;i+=3){
    var cel=l.slice(i,i+3).map(function(p){return '<th>'+PadDoc_esc_(p[0])+'</th><td>'+PadDoc_val_(p[1])+'</td>';});
    while(cel.length<3)cel.push('<th></th><td></td>');
    linhas.push('<tr>'+cel.join('')+'</tr>');
  }
  return '<table class="t ident ficha pd-ficha3"><tbody>'+linhas.join('')+'</tbody></table>';
}
function PadDoc_h2_(n,t) { return '<h2><span class="n">'+n+'.</span> '+PadDoc_esc_(t)+'</h2>'; }

function PadDoc_html_(ctx) {
  if(ctx.tipo==='ORCAMENTO')return PadOrc_html_(ctx);
  var titulo='Inventário dos padrões de referência';
  var num=RelTecA4_numerador_(), itens=ctx.itens||[], emissao=PadDoc_horario_(ctx.geradoEm);
  var counts=PadDoc_contagem_(itens), inativos=itens.filter(function(p){return p.STATUS==='INATIVO';}).length;
  var labels={OK:'Vigente',VENCENDO:'Vence em até 30 dias',VENCIDO:'Vencido',SEM_VALIDADE:'Sem validade',VALIDADE_INVALIDA:'Validade inválida'};
  var cls={OK:'ok-txt',VENCENDO:'warn-txt',VENCIDO:'nok-txt'};
  var b='', s=0;

  // 1. Situação do acervo
  b+='<section>'+PadDoc_h2_(++s,'Situação do acervo')+'<div class="manter">';
  b+=num.tabela('Situação dos registros selecionados em '+(PadDoc_data_(ctx.geradoEm)||'—'));
  b+='<table class="t pd-kpi"><thead><tr>'+['Registros e canais','Certificados¹','Vigentes','Vencem em até 30 dias','Vencidos','Sem validade definida','Com pendências²','Inativos'].map(function(t){return '<th class="num">'+PadDoc_esc_(t)+'</th>';}).join('')+'</tr></thead><tbody><tr>'+
    [itens.length,counts.certificados,counts.OK,counts.VENCENDO,counts.VENCIDO,counts.SEM_VALIDADE+counts.VALIDADE_INVALIDA,counts.PENDENTE,inativos].map(function(v){return '<td class="num">'+SGO_DocA4_num_(v,0)+'</td>';}).join('')+'</tr></tbody></table>';
  b+='<p class="nota">¹ Certificados identificados, contados por número do certificado e laboratório; cadastros sem laboratório exigem conciliação. ² Dados do cadastro ou do certificado a completar, discriminados em cada ficha da seção 4. Pendências e inatividade podem coexistir com qualquer situação de vencimento.</p></div></section>';

  // 2. Análise e acompanhamento (texto revisável na tela antes da emissão)
  b+='<section>'+PadDoc_h2_(++s,'Análise e acompanhamento')+'<div data-paddoc-texto>'+PadDoc_paragrafos_(ctx.texto)+'</div>';
  if(ctx.orientacoes)b+='<h3><span class="n">'+s+'.1</span> Orientações do solicitante</h3>'+PadDoc_paragrafos_(ctx.orientacoes);
  b+='</section>';

  // 3. Relação dos instrumentos
  b+='<section>'+PadDoc_h2_(++s,'Relação dos instrumentos');
  b+='<p>Na Tabela 2, a situação segue a validade cadastrada: vigente (dentro do prazo), vence em até 30 dias ou vencido (prazo ultrapassado). A situação documental não substitui a avaliação da aptidão metrológica. Campo sem informação aparece como “—”.</p>';
  b+=num.tabela('Padrões de referência incluídos neste inventário ('+itens.length+' '+(itens.length===1?'registro':'registros')+')');
  b+='<table class="t compacta pd-rel"><colgroup><col style="width:17%"><col style="width:11%"><col style="width:15%"><col style="width:14%"><col style="width:15%"><col style="width:12%"><col style="width:16%"></colgroup>'+
    '<thead><tr><th>TAG e descrição</th><th>Localização</th><th>Marca, modelo e série</th><th>Faixa</th><th>Certificado e laboratório</th><th>Calibração e vencimento</th><th>Situação</th></tr></thead><tbody>';
  itens.forEach(function(p,idx){
    var cl=p.situacao==='VENCIDO'?' class="pd-vencido"':p.situacao==='VENCENDO'?' class="pd-vencendo"':'';
    var faixa=(String(p.FAIXA||'').length>100||/[|\n]/.test(String(p.FAIXA||'')))?'Ver a ficha técnica '+(s+1)+'.'+(idx+1):PadDoc_val_(p.FAIXA);
    var dados=p.conferido?'Dados conferidos':p.extraido?'Dados lidos do certificado':'Dados a conferir';
    var mms=[p.MARCA,p.MODELO,PadDoc_vazio_(p.SERIE)?'':'série '+String(p.SERIE).trim()].filter(function(v){return !PadDoc_vazio_(v);}).map(PadDoc_esc_);
    var sub=function(v,pre){return PadDoc_vazio_(v)?'':'<span class="sub">'+(pre||'')+PadDoc_esc_(String(v).trim())+'</span>';};
    b+='<tr'+cl+'><td><b>'+PadDoc_esc_(p.TAG)+'</b>'+sub(p.DESCRICAO)+'</td><td>'+PadDoc_val_(p.LOCALIZACAO)+'</td>'+
      '<td>'+(mms.length?mms.join('<br>'):'—')+'</td><td>'+faixa+'</td>'+
      '<td>'+PadDoc_val_(p.CERTIFICADO_NUMERO)+sub(p.LABORATORIO)+'</td>'+
      '<td>'+(PadDoc_vazio_(p.DATA_CALIBRACAO)?'Calibração: —':'Calibração: '+PadDoc_esc_(p.DATA_CALIBRACAO))+'<span class="sub">Vencimento: '+PadDoc_val_(p.VALIDADE)+'</span></td>'+
      '<td><span class="'+(cls[p.situacao]||'info-txt')+'">'+PadDoc_esc_(labels[p.situacao]||p.situacao||'—')+'</span><span class="sub">'+(p.STATUS==='INATIVO'?'Inativo':'Ativo')+' · '+dados+'</span></td></tr>';
  });
  b+='</tbody></table></section>';

  // 4. Fichas técnicas
  b+='<section>'+PadDoc_h2_(++s,'Fichas técnicas');
  var semSumarioFichas=itens.length>30;
  itens.forEach(function(p,i){
    b+='<div class="pd-ficha"><h3'+(semSumarioFichas?' class="sem-sumario"':'')+'><span class="n">'+s+'.'+(i+1)+'</span> '+PadDoc_esc_(p.TAG)+(PadDoc_vazio_(p.DESCRICAO)?'':' — '+PadDoc_esc_(p.DESCRICAO))+'</h3>';
    if(p.fotoData)b+='<img class="pd-foto" src="'+PadDoc_esc_(p.fotoData)+'" alt="Foto do padrão '+PadDoc_esc_(p.TAG)+'">';
    var faixaSimples=!PadDoc_vazio_(p.FAIXA)&&!/[|\n:;]/.test(String(p.FAIXA));
    var pares=[['Grandeza',p.GRANDEZA],['Faixa de medição',faixaSimples?p.FAIXA:''],['Unidade',p.UNIDADE],['Resolução',p.RESOLUCAO],['Método ou procedimento',p.METODO],['Rastreabilidade declarada',p.RASTREABILIDADE],['Pontos ou canais calibrados',p.PONTOS,{largo:true}],['Observações técnicas e acessórios',p.OBSERVACOES_TECNICAS,{largo:true}]]
      .filter(function(k){return !PadDoc_vazio_(k[1]);}).map(function(k){return [k[0],{html:PadDoc_esc_(String(k[1]).trim()).replace(/\n/g,'<br>')},k[2]];});
    var faixas=faixaSimples?'':PadDoc_detalhes_(p.FAIXA,'faixa'), res=PadDoc_detalhes_(p.RESULTADOS_CERTIFICADO,'resultados');
    if(pares.length)b+=SGO_DocA4_tabelaIdent_(pares);
    if(faixas)b+=num.tabela('Faixas de medição declaradas — '+p.TAG)+faixas;
    if(res)b+=num.tabela('Resultados, incertezas e fatores por ponto — '+p.TAG)+res;
    if(!pares.length&&!faixas&&!res)b+='<p>Os dados técnicos do certificado ainda não foram cadastrados para este padrão.</p>';
    var pend=PadDoc_pendencias_(p).slice();if(!p.LOCALIZACAO)pend.push('Localização não informada');if(!p.VALIDADE)pend.push('Vencimento não informado');
    if(pend.length){var txt=pend.map(PadDoc_rotuloPendencia_).filter(function(v,j,a){return a.indexOf(v)===j;}).join(', ');b+='<p class="pd-pend"><b>A completar:</b> '+PadDoc_esc_(txt.charAt(0).toUpperCase()+txt.slice(1))+'.</p>';}
    if(p.AUTOMACAO&&p.AUTOMACAO.impedimentos)b+='<div class="pd-aviso"><b>Ressalvas do certificado de origem:</b> '+PadDoc_paragrafos_(p.AUTOMACAO.impedimentos)+'</div>';
    var orig=[];
    if(p.conferido)orig.push('Dados conferidos'+(p.CONFERIDO_POR?' por '+PadDoc_nomeUsuario_(p.CONFERIDO_POR):'')+(p.CONFERIDO_EM?' em '+PadDoc_horario_(p.CONFERIDO_EM):'')+(p.CERTIFICADO_NUMERO?' com o certificado nº '+p.CERTIFICADO_NUMERO:'')+'.');
    else if(p.extraido)orig.push('Dados lidos do certificado'+(p.CERTIFICADO_NUMERO?' nº '+p.CERTIFICADO_NUMERO:'')+(p.AUTOMACAO&&p.AUTOMACAO.extraidoEm?' em '+PadDoc_horario_(p.AUTOMACAO.extraidoEm):'')+(p.AUTOMACAO&&p.AUTOMACAO.paginas?' (origem: '+p.AUTOMACAO.paginas+')':'')+'; a conferência pela equipe está pendente.');
    if(orig.length)b+='<p class="nota">'+PadDoc_esc_(orig.join(' '))+'</p>';
    b+='</div>';
  });
  b+='</section>';

  // Sem bloco de fecho: a ficha já traz o responsável e a data; o documento termina na última ficha técnica.
  var resp=ctx.geradoPorNome||PadDoc_nomeUsuario_(ctx.geradoPor);
  var ficha=[['Emissão',emissao],['Responsável',resp],['Situação',ctx.status==='EMITIDO'?'Emitido':'Prévia para revisão'],['Localização',ctx.localizacao||'Conforme cada padrão'],['Registros',SGO_DocA4_num_(itens.length,0)],['Base dos dados','Cadastro e certificados na data de emissão']];
  return PadDoc_documento_(ctx,{titulo:titulo,situacao:'Controle dos padrões utilizados nos serviços de calibração e qualificação',ficha:ficha,corpo:b,sumario:itens.length>3});
}
