const fs=require('node:fs'),path=require('node:path'),read=fs.readFileSync.bind(fs),exists=fs.existsSync.bind(fs),stat=fs.statSync.bind(fs),rdir=fs.readdirSync.bind(fs);
const origem='/qa/apps-script-imports/portal_sgo_versao_cnpj_db';
function mapa(p){if(typeof p==='string'){const r=path.resolve(p);if(r.startsWith(origem))return path.join('/app/legado',r.slice(origem.length));}return p;}
fs.readFileSync=function(p,...a){return read(mapa(p),...a);};fs.existsSync=function(p){return exists(mapa(p));};fs.statSync=function(p,...a){return stat(mapa(p),...a);};fs.readdirSync=function(p,...a){return rdir(mapa(p),...a);};
