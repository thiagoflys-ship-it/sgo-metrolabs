/* O CSS PAD_DOC_CSS é copiado do DOCUMENTO de Inventário, não da tela. */
function PadDoc_esc_(v) { return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function PadDoc_val_(v) { return PadDoc_esc_(v || 'Não informado'); }
function PadDoc_horario_(v) { return v ? Utilities.formatDate(new Date(v),'America/Sao_Paulo','dd/MM/yyyy HH:mm') : ''; }
function PadDoc_paragrafos_(v) { return String(v||'').split(/\n\s*\n/).map(function(p){return '<p>'+PadDoc_esc_(p).replace(/\n/g,'<br>')+'</p>';}).join(''); }
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
  return '<table class="tplInv-prt-table paddoc-detalhes"><thead><tr>'+headers.map(function(v){return '<th scope="col">'+PadDoc_esc_(v)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(v){return '<td>'+PadDoc_val_(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
}
function PadDoc_detalhes_(v,tipo) {
  var text=String(v||'').trim();if(!text)return '<p>Não informado</p>';
  var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});
  if(lines.length>1 && lines.every(function(l){return l.indexOf('|')>=0;})) {
    var rows=lines.map(function(l){return l.split('|').map(function(s){return s.trim();});});
    var n=rows[0].length;
    if(rows.every(function(r){return r.length===n;})&&n<=12)return PadDoc_tabela_(rows.shift(),rows);
  }
  // Legado: preserva literalmente todos os valores; não tenta recalcular ou
  // adivinhar colunas em prosa heterogênea. Um ponto por linha, canal explícito.
  if(tipo==='resultados'&&text.indexOf('[')>=0){
    var re=/([^\[\]]*)\[([^\[\]]*)\]/g,m,rows=[],canal='',end=0,valid=true;
    while((m=re.exec(text))){var prefix=m[1].replace(/^[\s,;]+/,'').trim();if(prefix){if(!/:\s*$/.test(prefix)){valid=false;break;}canal=prefix.replace(/:\s*$/,'');}rows.push([canal,m[2]]);end=re.lastIndex;}
    if(valid&&rows.length&&!text.slice(end).replace(/[\s,;.]/g,''))return PadDoc_tabela_(['Grandeza / canal','Resultado transcrito por ponto'],rows);
  }
  var parts=text.split(/\r?\n|;\s*/).filter(function(s){return s.trim();});
  return PadDoc_tabela_([tipo==='faixa'?'Grandeza / canal':'Item',tipo==='faixa'?'Faixa declarada':'Informação transcrita'],parts.map(function(p,i){var j=p.indexOf(':');return j>0?[p.slice(0,j).trim(),p.slice(j+1).trim()]:[String(i+1),p.trim()];}));
}
function PadDoc_html_(ctx) {
  if(ctx.tipo==='ORCAMENTO')return PadOrc_html_(ctx);
  var orc=ctx.tipo==='ORCAMENTO', titulo=orc?'Solicitação de orçamento de calibração':'Inventário de padrões de referência';
  var empresa=ctx.empresa||(typeof CadeiaFrioRel_CFCFG!=='undefined'&&CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE)||{nome:'Metrolab Soluções em Engenharia Clínica LTDA'};
  var h='<div class="tplInv-prt-header"><div><div class="tplInv-prt-brand-name">METROLABS</div><div class="tplInv-prt-brand-slogan">'+PadDoc_esc_(empresa.nome)+'</div>';
  h+='<div class="tplInv-prt-brand-slogan">'+[empresa.cnpj?'CNPJ '+empresa.cnpj:'',empresa.endereco,empresa.telefone,empresa.site].filter(Boolean).map(PadDoc_esc_).join(' · ')+'</div></div>';
  h+='<div class="tplInv-prt-header-doc"><div class="tplInv-prt-doc-title">'+titulo+'</div><div class="tplInv-prt-doc-sub">'+(ctx.status==='RASCUNHO'?'PRÉVIA — AGUARDANDO REVISÃO':'DOCUMENTO EMITIDO')+'</div></div></div>';
  h+='<div class="tplInv-prt-meta-box">'+[['Documento',ctx.id],['Emissão',PadDoc_horario_(ctx.geradoEm)],['Responsável',ctx.geradoPor],[orc?'Destinatário':'Localização',orc?(ctx.destinatario||'Laboratório a definir'):(ctx.localizacao||'Conforme listagem')]].map(function(pair){return '<div><div class="tplInv-prt-meta-key">'+pair[0]+'</div><div class="tplInv-prt-meta-val">'+PadDoc_esc_(pair[1])+'</div></div>';}).join('')+'</div>';
  if(!orc) {
    var counts=PadDoc_contagem_(ctx.itens);
    h+='<div class="tplInv-prt-section-title">Controle do acervo</div><div class="tplInv-prt-kpis">';
    [[ctx.itens.length,'Registros / canais','total'],[counts.certificados,'Certificados identificados¹','gray'],[counts.SEM_VALIDADE+counts.VALIDADE_INVALIDA,'Sem validade definida','gray'],[counts.OK,'Vigentes','ok1'],[counts.VENCENDO,'Vencem em até 30 dias','warn'],[counts.VENCIDO,'Vencidos','danger'],[counts.PENDENTE,'Com pendências','gray'],[ctx.itens.filter(function(p){return p.STATUS==='INATIVO';}).length,'Inativos','gray']].forEach(function(k){h+='<div class="tplInv-prt-kpi tplInv-prt-kpi-'+k[2]+'"><div class="tplInv-prt-kpi-value">'+k[0]+'</div><div class="tplInv-prt-kpi-label">'+k[1]+'</div></div>';});
    h+='</div><p class="paddoc-legenda">¹ Contagem por número e laboratório cadastrado; cadastros sem laboratório exigem conciliação. Pendências e inatividade podem coexistir com qualquer situação de vencimento.</p>';
  }
  h+='<div class="tplInv-prt-section-title">'+(orc?'Solicitação ao laboratório':'Análise e acompanhamento')+'</div><div data-paddoc-texto>'+PadDoc_paragrafos_(ctx.texto)+'</div>';
  if(ctx.orientacoes)h+='<div class="tplInv-prt-section-title">Orientações do solicitante</div>'+PadDoc_paragrafos_(ctx.orientacoes);
  if(orc)h+='<div class="paddoc-aviso"><strong>Intervalo pretendido: 3 anos.</strong> Solicitamos avaliação técnica para o intervalo de recalibração pretendido, sem alteração automática do vencimento atual. Informar separadamente a validade comercial da proposta.</div>';
  h+='<div class="tplInv-prt-section-title">Relação de instrumentos — '+ctx.itens.length+' registros</div><table class="tplInv-prt-table"><thead><tr><th>TAG / descrição</th><th>Localização</th><th>Marca / modelo / série</th><th>Faixa</th><th>Certificado / laboratório</th><th>Calibração / vencimento</th><th>Situação</th></tr></thead><tbody>';
  var labels={OK:'Vigente',VENCENDO:'Vencendo ≤ 30 dias',VENCIDO:'Vencido',SEM_VALIDADE:'Sem validade',VALIDADE_INVALIDA:'Validade inválida'};
  ctx.itens.forEach(function(p){
    var cls=p.situacao==='VENCIDO'?'tplInv-prt-row-vencido':p.situacao==='VENCENDO'?'tplInv-prt-row-vencendo':'';
    h+='<tr class="'+cls+'"><td><strong>'+PadDoc_esc_(p.TAG)+'</strong><br>'+PadDoc_val_(p.DESCRICAO)+'</td><td>'+PadDoc_val_(p.LOCALIZACAO)+'</td><td>'+[p.MARCA,p.MODELO,p.SERIE].map(PadDoc_val_).join('<br>')+'</td><td>'+(String(p.FAIXA||'').length>100?'Consultar tabela na ficha técnica':PadDoc_val_(p.FAIXA))+'</td><td>'+PadDoc_val_(p.CERTIFICADO_NUMERO)+'<br>'+PadDoc_val_(p.LABORATORIO)+'</td><td>'+PadDoc_val_(p.DATA_CALIBRACAO)+'<br>'+PadDoc_val_(p.VALIDADE)+'</td><td>'+PadDoc_esc_(labels[p.situacao]||p.situacao)+'<br>'+PadDoc_esc_(p.STATUS)+'<br>'+(p.conferido?'Conferido pela equipe':p.extraido?'Extraído por IA':'Dados pendentes')+'</td></tr>';
  });
  h+='</tbody></table><p class="paddoc-legenda">Legenda: vigente = dentro do prazo cadastrado; vencendo = até 30 dias; vencido = prazo ultrapassado. A situação documental não substitui avaliação da aptidão metrológica. Campos ausentes estão identificados como “Não informado”.</p>';
  ctx.itens.forEach(function(p){
    h+='<div class="paddoc-ficha"><div class="tplInv-prt-section-title">Ficha técnica — '+PadDoc_esc_(p.TAG)+' · '+PadDoc_val_(p.DESCRICAO)+'</div>';
    if(p.fotoData)h+='<img class="paddoc-foto" src="'+PadDoc_esc_(p.fotoData)+'" alt="Foto do padrão '+PadDoc_esc_(p.TAG)+'">';
    h+='<h3>Faixas de medição</h3>'+PadDoc_detalhes_(p.FAIXA,'faixa');
    h+='<h3>Resultados, incertezas e fatores por ponto</h3>'+PadDoc_detalhes_(p.RESULTADOS_CERTIFICADO,'resultados');
    h+='<dl>'+[['Grandeza',p.GRANDEZA],['Unidade',p.UNIDADE],['Resolução',p.RESOLUCAO],['Pontos / canais de calibração',p.PONTOS],['Método / procedimento',p.METODO],['Rastreabilidade declarada',p.RASTREABILIDADE],['Observações técnicas / acessórios',p.OBSERVACOES_TECNICAS]].map(function(k){return '<dt>'+k[0]+'</dt><dd>'+PadDoc_val_(k[1]).replace(/\n/g,'<br>')+'</dd>';}).join('')+'</dl>';
    var pend=PadDoc_pendencias_(p);if(!p.LOCALIZACAO)pend.push('Localização não informada');if(!p.VALIDADE)pend.push('Vencimento não informado');if(pend.length)h+='<div class="paddoc-aviso">Pendências: '+PadDoc_esc_(pend.join(', '))+'.</div>';
    if(p.AUTOMACAO){if(p.AUTOMACAO.impedimentos)h+='<div class="paddoc-aviso"><strong>Ressalvas da fonte:</strong> '+PadDoc_paragrafos_(p.AUTOMACAO.impedimentos)+'</div>';h+='<p class="paddoc-legenda">Extração documental: '+PadDoc_val_(PadDoc_horario_(p.AUTOMACAO.extraidoEm))+' · Origem: '+PadDoc_val_(p.AUTOMACAO.paginas)+'.</p>';}
    h+='<p class="paddoc-legenda">Conferência: '+PadDoc_val_(p.CONFERIDO_POR)+' · '+PadDoc_val_(PadDoc_horario_(p.CONFERIDO_EM))+'. Certificado de origem: '+PadDoc_val_(p.CERTIFICADO_NUMERO)+'.</p></div>';
  });
  h+='<footer><strong>METROLABS SGO+</strong> · '+PadDoc_esc_(ctx.id)+'<br>Cópia preservada do conteúdo '+(ctx.status==='EMITIDO'?'emitido':'em revisão')+'. Dados documentais e cadastrais; resumo calculado pelo sistema'+'.</footer>';
  var css=PAD_DOC_CSS+'\n@page{size:A4 landscape;margin:10mm 12mm}*{box-sizing:border-box}body{margin:0;background:#fff;font-family:Segoe UI,Arial,sans-serif;font-size:10pt;color:#111}p{line-height:1.5;overflow-wrap:anywhere;text-align:justify}dd{text-align:justify}.paddoc-detalhes{margin:8px 0 14px}.paddoc-detalhes td{vertical-align:top;white-space:pre-wrap}.paddoc-ficha h3{font-size:10pt;color:#1a2e5a;break-after:avoid}.tplInv-prt-kpis{grid-template-columns:repeat(4,1fr)}main{max-width:273mm;margin:auto;padding:8mm}thead{display:table-header-group}tr{break-inside:avoid}.tplInv-prt-table{table-layout:fixed}.tplInv-prt-table th{white-space:normal}.tplInv-prt-table td,.tplInv-prt-meta-val{overflow-wrap:anywhere}.tplInv-prt-meta-val{font-size:8pt}.tplInv-prt-header{gap:20px}.tplInv-prt-header>div{max-width:55%}.paddoc-aviso{border-left:3px solid #d97706;background:#fffbeb;padding:10px;margin:10px 0;overflow-wrap:anywhere}.paddoc-legenda{font-size:8pt;color:#555}.paddoc-ficha{clear:both;padding-top:5mm}.paddoc-ficha dl{margin:0}.paddoc-ficha dt{font-weight:bold;color:#1a2e5a;margin-top:9px;break-after:avoid}.paddoc-ficha dd{margin:3px 0;white-space:pre-wrap;overflow-wrap:anywhere}.paddoc-foto{float:right;max-width:45mm;max-height:40mm;object-fit:contain;margin:0 0 4mm 6mm}footer{clear:both;border-top:2px solid #007b3e;margin-top:8mm;padding-top:4mm;font-size:8pt;color:#555}@media print{main{padding:0;max-width:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+titulo+'</title><style>'+css+'</style></head><body><main class="tplInv-prt-doc">'+h+'</main></body></html>';
}
