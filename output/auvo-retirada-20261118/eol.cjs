// Compara o fim de linha de cada arquivo alterado (cand30 -> cand31): LF puro, CRLF puro ou misto.
const fs=require('fs'),p=require('path');const A=process.argv[2],B=process.argv[3];
const tipo=s=>{const cr=(s.match(/\r\n/g)||[]).length,lf=(s.match(/\n/g)||[]).length;return !cr?'LF':cr===lf?'CRLF':'MISTO('+cr+'/'+lf+')';};
for(const f of fs.readdirSync(B)){const b=fs.readFileSync(p.join(B,f),'utf8');const ea=fs.existsSync(p.join(A,f));const a=ea?fs.readFileSync(p.join(A,f),'utf8'):null;if(a===b)continue;const ta=a===null?'novo':tipo(a),tb=tipo(b);console.log((ta===tb||ta==='novo'?'ok  ':'DIF ')+f+' '+ta+' -> '+tb);}
