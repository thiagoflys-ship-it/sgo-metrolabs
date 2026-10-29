/* Importação fiel: texto CSV sem conversão de localidade; XLSX lido do XML original. */
function EstufaBanhoRel_dataCivil_(y,m,d,h,mi,s) {
  h=h||0;mi=mi||0;s=s||0;
  const check=new Date(Date.UTC(y,m-1,d,h,mi,s));
  if(y<EstufaBanhoRel_EBCFG.MIN_VALID_YEAR||y>EstufaBanhoRel_EBCFG.MAX_VALID_YEAR||check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||mi>59||s>59||h<0||mi<0||s<0)return null;
  const pad=n=>String(n).padStart(2,'0'),text=y+'-'+pad(m)+'-'+pad(d)+' '+pad(h)+':'+pad(mi)+':'+pad(s);
  const dt=Utilities.parseDate(text,EstufaBanhoRel_EBCFG.TZ,'yyyy-MM-dd HH:mm:ss');
  return Utilities.formatDate(dt,EstufaBanhoRel_EBCFG.TZ,'yyyy-MM-dd HH:mm:ss')===text?dt:null;
}
function EstufaBanhoRel_partesData_(dt){return Utilities.formatDate(dt,EstufaBanhoRel_EBCFG.TZ,'yyyy MM dd HH mm ss').split(' ').map(Number);}
function EstufaBanhoRel_dataSerialFiel_(n){
  if(typeof n!=='number'||!isFinite(n))return null;
  const dt=new Date(Date.UTC(1899,11,30)+Math.round(n*86400)*1000);
  return EstufaBanhoRel_dataCivil_(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),dt.getUTCHours(),dt.getUTCMinutes(),dt.getUTCSeconds());
}
function EstufaBanhoRel_textoOriginal_(blob){
  const bytes=blob.getBytes(),a=(bytes[0]+256)%256,b=(bytes[1]+256)%256;
  return blob.getDataAsString(a===255&&b===254?'UTF-16LE':a===254&&b===255?'UTF-16BE':'UTF-8').replace(/^\uFEFF/,'');
}
function EstufaBanhoRel_lerXlsxOriginal_(blob,payload){
  payload=payload||{};
  const files={};Utilities.unzip(blob.copyBlob().setContentType('application/zip')).forEach(function(b){files[b.getName().replace(/^\//,'')]=b;});
  const ns=XmlService.getNamespace('http://schemas.openxmlformats.org/spreadsheetml/2006/main');
  function xml(name){if(!files[name])throw new Error('XLSX incompleto: '+name);return XmlService.parse(files[name].getDataAsString('UTF-8')).getRootElement();}
  function attr(e,n){const a=e.getAttribute(n);return a?a.getValue():'';}
  function text(e){if(!e)return '';return e.getChildren().map(function(c){return c.getName()==='t'?c.getText():text(c);}).join('');}
  const wb=xml('xl/workbook.xml'),pr=wb.getChild('workbookPr',ns),date1904=pr&&/^(1|true)$/.test(attr(pr,'date1904'));
  const allSheets=wb.getChild('sheets',ns).getChildren('sheet',ns);if(!allSheets.length)throw new Error('XLSX sem aba.');
  let sheet=payload.sheetName?allSheets.filter(function(sh){return attr(sh,'name')===String(payload.sheetName);})[0]:payload.sheetIndex!==undefined?allSheets[Number(payload.sheetIndex)]:allSheets[0];
  if(!sheet)throw new Error('A aba solicitada não existe no XLSX.');
  if(allSheets.length>1&&!payload.sheetName&&payload.sheetIndex===undefined){const matches=[];allSheets.forEach(function(sh,index){try{const m=EstufaBanhoRel_lerXlsxOriginal_(blob,{sheetIndex:index});if(EstufaBanhoRel_tabelaTemCabecalhoDados_(m))matches.push({sheet:sh,matrix:m});}catch(e){if(/excede|intervalo aceito/.test(e.message))throw e;}});if(matches.length===1)return matches[0].matrix;if(matches.length>1)throw new Error('Mais de uma aba contém leituras no XLSX. Importe um arquivo com uma única aba de dados ou informe o nome da aba.');throw new Error('Nenhuma aba do XLSX contém cabeçalho de data/hora e temperatura. Informe o nome da aba de leituras.');}
  const rid=sheet.getAttribute('id',XmlService.getNamespace('http://schemas.openxmlformats.org/officeDocument/2006/relationships')).getValue();
  const rel=xml('xl/_rels/workbook.xml.rels').getChildren().filter(function(r){return attr(r,'Id')===rid;})[0];
  if(!rel||attr(rel,'TargetMode')==='External')throw new Error('Aba XLSX inválida.');
  const target=attr(rel,'Target'),sheetPath=target.charAt(0)==='/'?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  const shared=files['xl/sharedStrings.xml']?xml('xl/sharedStrings.xml').getChildren('si',ns).map(text):[];
  // soHora (29/10/2026, mesma correção da Cadeia Fria): hora arrastada no Excel passa de 24:00; célula só de hora vale a hora do dia.
  const custom={},styles=[],soHora=[];
  if(files['xl/styles.xml']){const st=xml('xl/styles.xml'),nf=st.getChild('numFmts',ns),xf=st.getChild('cellXfs',ns);if(nf)nf.getChildren('numFmt',ns).forEach(function(f){custom[attr(f,'numFmtId')]=attr(f,'formatCode');});if(xf)xf.getChildren('xf',ns).forEach(function(f){const id=+attr(f,'numFmtId'),fmt=(custom[id]||'').replace(/"[^"]*"|\\.|\[[^\]]*\]/g,'');styles.push((id>=14&&id<=22)||(id>=45&&id<=47)||/[ydhs]/i.test(fmt));soHora.push((id>=18&&id<=21)||(id>=45&&id<=47)||(id>=164&&/[hs]/i.test(fmt)&&!/[yd]/i.test(fmt)));});}
  const data=xml(sheetPath).getChild('sheetData',ns);if(!data)throw new Error('Aba XLSX sem dados.');
  const rows=data.getChildren('row',ns);if(rows.length>EstufaBanhoRel_EBCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas; divida o estudo sem remover registros.');
  return rows.map(function(row){const values=[];row.getChildren('c',ns).forEach(function(cell){const ref=attr(cell,'r'),letters=(ref.match(/^[A-Z]+/)||[''])[0];let col=0;for(let i=0;i<letters.length;i++)col=col*26+letters.charCodeAt(i)-64;col=col?col-1:values.length;if(col>250)throw new Error('XLSX excede 251 colunas.');while(values.length<=col)values.push('');const type=attr(cell,'t'),v=cell.getChild('v',ns),raw=v?v.getText():'';
    if(type==='s')values[col]=shared[Number(raw)]||'';
    else if(type==='inlineStr')values[col]=text(cell.getChild('is',ns));
    else if(type==='str'||type==='d'||type==='e')values[col]=raw;
    else if(raw!==''){const n=Number(raw);if(!isFinite(n)){values[col]=raw;return;}if(styles[+attr(cell,'s')]){if(n>=0&&(n<1||soHora[+attr(cell,'s')])){const seconds=Math.round(n*86400)%86400;values[col]=[Math.floor(seconds/3600)%24,Math.floor(seconds%3600/60),seconds%60].map(v=>String(v).padStart(2,'0')).join(':');}else{const dt=EstufaBanhoRel_dataSerialFiel_(n+(date1904?1462:0));if(!dt)throw new Error('Data Excel fora do intervalo aceito na célula '+ref);values[col]=Utilities.formatDate(dt,EstufaBanhoRel_EBCFG.TZ,'yyyy-MM-dd HH:mm:ss');}}else values[col]=n;}
  });return values;}).filter(function(r){return r.some(v=>v!=='');});
}
function EstufaBanhoRel_prepararTabelaDatas_(matrix,display){
  let header=-1;
  for(let i=0;i<Math.min(matrix.length,100);i++){if(EstufaBanhoRel_tabelaTemCabecalhoDados_([display[i]||matrix[i]])){header=i;break;}}
  return {matrix:header>0?matrix.slice(header):matrix,displayMatrix:header>0?display.slice(header):display};
}
