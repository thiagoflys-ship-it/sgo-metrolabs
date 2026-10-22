/* Importação fiel: texto CSV sem conversão de localidade; XLSX lido do XML original. */
function CadeiaFrioRel_dataCivil_(y,m,d,h,mi,s){return CadeiaFrioRel_dataCivilRapida_(y,m,d,h,mi,s);}
function CadeiaFrioRel_partesData_(dt){return CadeiaFrioRel_partesRapidas_(dt,CadeiaFrioRel_CFCFG.TZ);}
function CadeiaFrioRel_dataSerialFiel_(n){
  if(typeof n!=='number'||!isFinite(n))return null;
  const dt=new Date(Date.UTC(1899,11,30)+Math.round(n*86400)*1000);
  return CadeiaFrioRel_dataCivil_(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),dt.getUTCHours(),dt.getUTCMinutes(),dt.getUTCSeconds());
}
function CadeiaFrioRel_textoOriginal_(blob){
  const bytes=blob.getBytes(),a=(bytes[0]+256)%256,b=(bytes[1]+256)%256;
  return blob.getDataAsString(a===255&&b===254?'UTF-16LE':a===254&&b===255?'UTF-16BE':'UTF-8').replace(/^\uFEFF/,'');
}
/** Cabeçalho de leituras: coluna de data/hora e coluna de sensor (21/10/2026: "ST-01 (C)", "S-01" e "T1 (°C)" também contam). */
function CadeiaFrioRel_ehCabecalhoTempo_(v){return /^(data|date|hora|horario|time|tempo|timestamp|datetime|date.?time|data.?hora)$/.test(v);}
function CadeiaFrioRel_ehCabecalhoSensor_(v){return /temper|temp|^s\d+$|^t\d+$|channel|canal|ch\d/.test(v)||/^(s|st|t|tp|ch|sensor)[\s\-_]?\d+\b/.test(v)||/\((°|º)?c\)/.test(v);}
function CadeiaFrioRel_abaTemLeituras_(matrix){return matrix.slice(0,100).some(function(row){const r=row.map(CadeiaFrioRel_normalizarTextoComparacaoParser_);return r.some(CadeiaFrioRel_ehCabecalhoTempo_)&&r.some(CadeiaFrioRel_ehCabecalhoSensor_);});}
/** opcoes.variasAbas (arquivo único do registrador, 21/10/2026): várias abas com leituras voltam como {abas:[{nome,matrix}]}, sem recusar. */
function CadeiaFrioRel_lerXlsxOriginal_(blob,opcoes){
  const files={};Utilities.unzip(blob.copyBlob().setContentType('application/zip')).forEach(function(b){files[b.getName().replace(/^\//,'')]=b;});
  const ns=XmlService.getNamespace('http://schemas.openxmlformats.org/spreadsheetml/2006/main');
  function xml(name){if(!files[name])throw new Error('XLSX incompleto: '+name);return XmlService.parse(files[name].getDataAsString('UTF-8')).getRootElement();}
  function attr(e,n){const a=e.getAttribute(n);return a?a.getValue():'';}
  function text(e){if(!e)return '';return e.getChildren().map(function(c){return c.getName()==='t'?c.getText():text(c);}).join('');}
  const wb=xml('xl/workbook.xml'),pr=wb.getChild('workbookPr',ns),date1904=pr&&/^(1|true)$/.test(attr(pr,'date1904'));
  const shared=files['xl/sharedStrings.xml']?xml('xl/sharedStrings.xml').getChildren('si',ns).map(text):[];
  const custom={},styles=[];
  if(files['xl/styles.xml']){const st=xml('xl/styles.xml'),nf=st.getChild('numFmts',ns),xf=st.getChild('cellXfs',ns);if(nf)nf.getChildren('numFmt',ns).forEach(function(f){custom[attr(f,'numFmtId')]=attr(f,'formatCode');});if(xf)xf.getChildren('xf',ns).forEach(function(f){const id=+attr(f,'numFmtId'),fmt=(custom[id]||'').replace(/"[^"]*"|\\.|\[[^\]]*\]/g,'');styles.push((id>=14&&id<=22)||(id>=45&&id<=47)||/[ydhs]/i.test(fmt));});}
  const sheets=wb.getChild('sheets',ns).getChildren('sheet',ns);
  if(!sheets.length)throw new Error('XLSX sem aba.');
  function lerAba(sheet){
  const rid=sheet.getAttribute('id',XmlService.getNamespace('http://schemas.openxmlformats.org/officeDocument/2006/relationships')).getValue();
  const rel=xml('xl/_rels/workbook.xml.rels').getChildren().filter(function(r){return attr(r,'Id')===rid;})[0];
  if(!rel||attr(rel,'TargetMode')==='External')throw new Error('Aba XLSX inválida.');
  const target=attr(rel,'Target'),sheetPath=target.charAt(0)==='/'?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  const data=xml(sheetPath).getChild('sheetData',ns);if(!data)return [];
  const rows=data.getChildren('row',ns);if(rows.length>CadeiaFrioRel_CFCFG.MAX_PARSE_ROWS)throw new Error('Arquivo excede o limite de linhas; divida o estudo sem remover registros.');
  return rows.map(function(row){const values=[];row.getChildren('c',ns).forEach(function(cell){const ref=attr(cell,'r'),letters=(ref.match(/^[A-Z]+/)||[''])[0];let col=0;for(let i=0;i<letters.length;i++)col=col*26+letters.charCodeAt(i)-64;col=col?col-1:values.length;if(col>250)throw new Error('XLSX excede 251 colunas.');while(values.length<=col)values.push('');const type=attr(cell,'t'),v=cell.getChild('v',ns),raw=v?v.getText():'';
    if(type==='s')values[col]=shared[Number(raw)]||'';
    else if(type==='inlineStr')values[col]=text(cell.getChild('is',ns));
    else if(type==='str'||type==='d'||type==='e')values[col]=raw;
    else if(raw!==''){const n=Number(raw);if(!isFinite(n)){values[col]=raw;return;}if(styles[+attr(cell,'s')]){if(n>=0&&n<1){const seconds=Math.round(n*86400);values[col]=[Math.floor(seconds/3600)%24,Math.floor(seconds%3600/60),seconds%60].map(v=>String(v).padStart(2,'0')).join(':');}else{const text=CadeiaFrioRel_serialTexto_(n+(date1904?1462:0));if(!text)throw new Error('Data Excel fora do intervalo aceito na célula '+ref);values[col]=text;}}else values[col]=n;}
  });return values;}).filter(function(r){return r.some(v=>v!=='');});
  }
  const candidatas=[];let primeira=[];
  sheets.forEach(function(sheet,i){
    const matrix=lerAba(sheet);if(i===0)primeira=matrix;
    if(CadeiaFrioRel_abaTemLeituras_(matrix)&&matrix.length>2)candidatas.push({nome:attr(sheet,'name'),matrix:matrix});
  });
  if(candidatas.length>1&&opcoes&&opcoes.variasAbas)return {abas:candidatas};
  if(candidatas.length>1)throw new Error('Mais de uma aba contém leituras: '+candidatas.map(x=>x.nome).join(', ')+'. Envie um arquivo com a aba do sensor desejado.');
  return candidatas.length?candidatas[0].matrix:primeira;
}

function CadeiaFrioRel_prepararTabelaDatas_(matrix,display){
  let header=-1;
  for(let i=0;i<Math.min(matrix.length,100);i++){const r=(display[i]||matrix[i]).map(CadeiaFrioRel_normalizarTextoComparacaoParser_);const time=r.some(CadeiaFrioRel_ehCabecalhoTempo_);const sensor=r.some(CadeiaFrioRel_ehCabecalhoSensor_);if(time&&sensor){header=i;break;}}
  return {matrix:header>0?matrix.slice(header):matrix,displayMatrix:header>0?display.slice(header):display};
}

// Cache somente da execução atual: não persiste dados de clientes nem leituras.
var CadeiaFrioRel_offsetsDia_ = Object.create(null);
function CadeiaFrioRel_offsetEstavel_(diaUtc, tz) {
  const key = tz + ':' + diaUtc;
  if (Object.prototype.hasOwnProperty.call(CadeiaFrioRel_offsetsDia_, key)) return CadeiaFrioRel_offsetsDia_[key];
  function offset(ms) {
    const p = Utilities.formatDate(new Date(ms), tz, 'yyyy MM dd HH mm ss').split(' ').map(Number);
    return Date.UTC(p[0],p[1]-1,p[2],p[3],p[4],p[5])-ms;
  }
  // Margens cobrem o dia civil e o UTC, incluindo fusos positivos/negativos.
  const a=offset(diaUtc-86400000), b=offset(diaUtc+2*86400000);
  return CadeiaFrioRel_offsetsDia_[key] = a===b ? a : null;
}
function CadeiaFrioRel_partesRapidas_(dt,tz) {
  const ms=dt.getTime(),dia=Math.floor(ms/86400000)*86400000;
  const offset=CadeiaFrioRel_offsetEstavel_(dia,tz);
  if(offset===null)return Utilities.formatDate(dt,tz,'yyyy MM dd HH mm ss').split(' ').map(Number);
  const d=new Date(ms+offset);
  return [d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()];
}
function CadeiaFrioRel_formatarDataRapida_(dt,tz,fmt) {
  const p=CadeiaFrioRel_partesRapidas_(dt,tz),pad=n=>String(n).padStart(2,'0');
  const values={yyyy:String(p[0]),MM:pad(p[1]),dd:pad(p[2]),HH:pad(p[3]),mm:pad(p[4]),ss:pad(p[5])};
  return fmt.replace(/yyyy|MM|dd|HH|mm|ss/g,k=>values[k]);
}
function CadeiaFrioRel_dataCivilRapida_(y,m,d,h,mi,s) {
  h=h||0;mi=mi||0;s=s||0;
  const ms=Date.UTC(y,m-1,d,h,mi,s),check=new Date(ms);
  if(y<CadeiaFrioRel_CFCFG.MIN_VALID_YEAR||y>CadeiaFrioRel_CFCFG.MAX_VALID_YEAR||check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||mi>59||s>59||h<0||mi<0||s<0)return null;
  const offset=CadeiaFrioRel_offsetEstavel_(Date.UTC(y,m-1,d),CadeiaFrioRel_CFCFG.TZ);
  if(offset!==null)return new Date(ms-offset);
  // Mudança de horário de verão: conserva validação original pelo fuso oficial.
  const pad=n=>String(n).padStart(2,'0'),text=y+'-'+pad(m)+'-'+pad(d)+' '+pad(h)+':'+pad(mi)+':'+pad(s);
  const dt=Utilities.parseDate(text,CadeiaFrioRel_CFCFG.TZ,'yyyy-MM-dd HH:mm:ss');
  return Utilities.formatDate(dt,CadeiaFrioRel_CFCFG.TZ,'yyyy-MM-dd HH:mm:ss')===text?dt:null;
}
function CadeiaFrioRel_serialTexto_(n) {
  const d=new Date(Date.UTC(1899,11,30)+Math.round(n*86400)*1000);
  if(!isFinite(d.getTime())||d.getUTCFullYear()<CadeiaFrioRel_CFCFG.MIN_VALID_YEAR||d.getUTCFullYear()>CadeiaFrioRel_CFCFG.MAX_VALID_YEAR)return null;
  const pad=n=>String(n).padStart(2,'0');
  return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds());
}
