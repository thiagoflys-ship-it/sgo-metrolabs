"use strict";
const fs=require("fs"),path=require("path");const g=require("../../_tools/gerar_base_assistente.cjs");
const RAIZ=path.join(__dirname,"../..");
const norm=(s)=>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const tok=(s)=>new Set(norm(s).split(" ").filter(w=>w.length>2));
const r=require("./paragrafos-so-producao.json").filter(x=>!x.noGit);
const cache={};
for(const x of r){
  const m=cache[x.arquivo]||(cache[x.arquivo]=g.lerManual(x.arquivo,fs.readFileSync(path.join(RAIZ,"docs",x.arquivo),"utf8")));
  const pars=[];m.secoes.forEach(s=>s.texto.split(/\n+/).forEach(p=>pars.push({s:s.titulo,p})));
  const a=tok(x.par);let best={j:0};
  for(const q of pars){const b=tok(q.p);let i=0;a.forEach(w=>{if(b.has(w))i++});const j=i/(a.size+b.size-i||1);if(j>best.j)best={j,q};}
  x.sim=+best.j.toFixed(2);x.parecido=best.q?best.q.s+" :: "+best.q.p.slice(0,160):"";
  const secaoExiste=m.secoes.some(s=>norm(s.titulo).replace(/ parte \d+$/,"")===norm(x.secao).replace(/ parte \d+$/,""));
  x.secaoNoDocs=secaoExiste;
}
fs.writeFileSync(path.join(__dirname,"paragrafos-so-producao-sim.json"),JSON.stringify(r,null,1));
r.forEach(x=>console.log(x.sim,x.secaoNoDocs?"S":"-",x.arquivo.replace("MANUAL_",""),"["+x.secao.slice(0,60)+"]",x.par.slice(0,90).replace(/\n/g," "),"\n      ~",x.parecido.slice(0,150)));
