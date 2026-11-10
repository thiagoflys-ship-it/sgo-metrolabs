// Redireciona as leituras dos testes: apps-script-imports/portal_sgo_versao_cnpj_db -> legado da produção (FASE=producao) ou do candidato (FASE=candidato).
const fs=require('node:fs'),path=require('node:path'),read=fs.readFileSync.bind(fs),exists=fs.existsSync.bind(fs),stat=fs.statSync.bind(fs),rdir=fs.readdirSync.bind(fs);
const raiz=path.resolve(__dirname);
const origem=path.resolve(raiz,'../../apps-script-imports/portal_sgo_versao_cnpj_db').toLowerCase();
const destino=process.env.FASE==='producao'?path.join(raiz,'producao','legado'):path.join(raiz,'base','legado');
function mapa(p){ if(typeof p==='string'){const r=path.resolve(p); if(r.toLowerCase().startsWith(origem)) return path.join(destino,r.slice(origem.length));} return p; }
fs.readFileSync=function(p,...a){return read(mapa(p),...a);};
fs.existsSync=function(p){return exists(mapa(p));};
fs.statSync=function(p,...a){return stat(mapa(p),...a);};
fs.readdirSync=function(p,...a){return rdir(mapa(p),...a);};
