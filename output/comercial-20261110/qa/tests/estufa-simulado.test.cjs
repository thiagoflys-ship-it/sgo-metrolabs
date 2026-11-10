const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./_estufa_ambiente.cjs');
function ambiente() { return E.criarAmbiente({props:{SIMULADOR_ADMIN_SENHA:'senha-teste'}}); }
function payload(perfil, resultado, extra={}) {
  const faixas={ESTUFA_INCUBACAO:[34.9,35.1,35],BANHO_MARIA:[37.9,38.1,38],SECADORA_TRAQUEIAS:[60,60,60],ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO:[169.8,170.2,170]};
  const [min,max,alvo]=faixas[perfil];
  const hora=(h,m=0)=>`04/11/2026 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
  const p={perfil,nSensores:12,sensoresAtivos:Array(12).fill(true),faixaTMin:min,faixaTMax:max,tolerancia:.5,modoEntrada:'SIMULADO_ADMIN',simulacaoSenha:'senha-teste',
    simulacao:{temperaturaAlvo:alvo,intervaloSegundos:30,inicioEstudo:hora(8),fimEstudo:hora(16),resultadoDistribuicao:resultado,resultadoPenetracao:resultado},
    estudos:{distribuicao:{tipo:'DISTRIBUICAO_VAZIO',inicio:hora(8),fim:hora(16),resultadoDesejado:resultado}},
    qualif:{setpoint:alvo,limUniformidade:.1,limEstabilidade:.1,limDesvioSetpoint:.05}};
  if(perfil==='SECADORA_TRAQUEIAS') { p.estudos={secadora:{vazio:[],carga:[]}};let h=8;for(const c of ['vazio','carga'])for(let i=0;i<3;i++){p.estudos.secadora[c].push({inicio:hora(h),fim:hora(h,30)});h++;} }
  if(perfil==='ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO') {
    p.estudos={distribuicaoE:{habilitado:true,repeticoes:[8,9,10].map(h=>({inicio:hora(h),fim:hora(h,30)}))},penetracaoE:{habilitado:true,tipoLetalidade:'ESTERILIZACAO',valorMinimoExigido:20,repeticoes:[11,12,13].map(h=>({inicio:hora(h),fim:hora(h,30),indicador:{tipo:'BIOLOGICO',aprovado:true,laboratorio:'Laboratório sintético'}}))}};
  }
  return Object.assign(p,extra);
}
const perfis=['ESTUFA_INCUBACAO','BANHO_MARIA','SECADORA_TRAQUEIAS','ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO'];
for(const perfil of perfis) for(const resultado of ['APROVADO','REPROVADO']) test(`${perfil}: forçar ${resultado} passa pelo motor novo, não por troca de parecer`,()=>{
 const e=ambiente(),p=payload(perfil,resultado);const r=e.fn('EstufaQ_montarContexto_')(p);
 assert.equal(r.statusConsolidado,resultado,JSON.stringify(r.criterios.filter(c=>c.conforme===false)));
 for(const s of r.estudos) assert.equal(s.statusAprovacao,resultado,s.rotulo+JSON.stringify(s.criterios));
 if(resultado==='APROVADO')assert.equal(r.criterios.filter(c=>c.conforme===false).length,0);
 else assert.ok(r.criterios.some(c=>c.conforme===false));
});
test('prévia e documento: mesmos dados sem cache, inclusive por sensor',()=>{
 for(const perfil of perfis)for(const multi of [false,true]) {
  const e=ambiente(),p=payload(perfil,'APROVADO');p.simulacao.multiArquivoPorSensor=multi;
  const gerar=()=>{const q=JSON.parse(JSON.stringify(p));const r=e.fn('EstufaBanhoRel_ebExecutarAnaliseCompleta_')(q);return JSON.stringify(r.dadosCompletos||r.analises.map(a=>a._dadosFatia));};
  assert.equal(gerar(),gerar(),perfil+' multi='+multi);
  const c=e.fn('EstufaQ_montarContexto_')(JSON.parse(JSON.stringify(p)));assert.equal(c.statusConsolidado,'APROVADO',perfil+' multi='+multi);
 }
});
test('cache/fingerprint muda com critérios, perfil, repetições e resultado',()=>{
 const e=ambiente();const p=payload(perfis[3],'APROVADO');const cfg=e.fn('EstufaBanhoRel_ebMontarConfigEstudos_')(p,e.run('EstufaBanhoRel_EBCFG.PERFIS.ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO'));
 const f=q=>e.fn('EstufaBanhoRel_ebFingerprintSimulado_')(q,cfg,{tMin:169.8,tMax:170.2,tolerancia:.5},false);
 const b=f(p);for(const mutate of [q=>q.qualif.limUniformidade=.02,q=>q.simulacao.resultadoPenetracao='REPROVADO',q=>q.perfil='BANHO_MARIA']){const q=JSON.parse(JSON.stringify(p));mutate(q);assert.notEqual(f(q),b);}
});
for(const tipo of ['ABERTURA_PORTA','QUEDA_ENERGIA'])for(const resultado of ['APROVADO','REPROVADO'])test(tipo+': '+resultado+' com tempo-alvo no motor novo',()=>{
 const e=ambiente(),p=payload('ESTUFA_INCUBACAO',resultado);p.simulacao.intervaloSegundos=10;
 p.estudos={};p.estudos[tipo==='ABERTURA_PORTA'?'aberturaPorta':'quedaEnergia']={habilitado:true,tipoAbertura:'TOTAL',inicioEvento:'04/11/2026 10:00:00',fimEvento:'04/11/2026 10:02:00',tempoAlvoMinutos:5,resultadoDesejado:resultado};
 const r=e.fn('EstufaQ_montarContexto_')(p);assert.equal(r.statusConsolidado,resultado,JSON.stringify(r.criterios));
 if(resultado==='REPROVADO')assert.ok(r.criterios.some(c=>c.chave==='TEMPO_RUPTURA'&&c.conforme===false));
});
for(const resultado of ['APROVADO','REPROVADO'])test('despirogenização FD: '+resultado+', sem inventar resultado de laboratório',()=>{
 const e=ambiente(),p=payload('ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO',resultado);p.faixaTMin=249;p.faixaTMax=251;p.simulacao.temperaturaAlvo=250;p.qualif.setpoint=250;
 p.estudos.distribuicaoE.habilitado=false;const pen=p.estudos.penetracaoE;pen.tipoLetalidade='DESPIROGENIZACAO';pen.valorMinimoExigido='';pen.repeticoes.forEach(r=>r.indicador.tipo='ENDOTOXINA');
 const r=e.fn('EstufaQ_montarContexto_')(p);assert.equal(r.statusConsolidado,resultado);assert.equal(r.criterios.find(c=>c.chave==='R1_LETALIDADE').conforme,resultado==='APROVADO');
});
test('Forçar aprovado nunca altera o resultado não conforme do laboratório',()=>{
 const e=ambiente(),p=payload(perfis[3],'APROVADO');p.estudos.penetracaoE.repeticoes[1].indicador.aprovado=false;
 const r=e.fn('EstufaQ_montarContexto_')(p);assert.equal(r.statusConsolidado,'REPROVADO');assert.equal(r.criterios.find(c=>c.chave==='R2_INDICADOR').conforme,false);
});
test('falhas de entrada dizem como corrigir, sem inventar aprovação nem recortar dados',()=>{
 const e=ambiente();const analisar=p=>e.fn('EstufaQ_montarContexto_')(p);
 let p=payload(perfis[0],'APROVADO');p.simulacao.fimEstudo='04/11/2026 15:00:00';assert.throws(()=>analisar(p),/cobrir todos/);
 p=payload(perfis[0],'APROVADO');p.simulacao.temperaturaAlvo=40;assert.throws(()=>analisar(p),/alvo deve ficar/);
 p=payload(perfis[3],'APROVADO');p.estudos.penetracaoE.valorMinimoExigido=100000;assert.throws(()=>analisar(p),/não permitem atingir/);
 p=payload(perfis[0],'APROVADO');p.simulacaoSenha='errada';assert.throws(()=>analisar(p),/Senha administrativa/);
 p=payload(perfis[0],'APROVADO');p.estudos={aberturaPorta:{habilitado:true,inicioEvento:'04/11/2026 10:00:00',fimEvento:'04/11/2026 10:02:00',resultadoDesejado:'REPROVADO'}};assert.throws(()=>analisar(p),/Sem critério/);
});
test('períodos sobrepostos de resultados contraditórios são recusados',()=>{
 const e=ambiente(),p=payload(perfis[0],'APROVADO');p.estudos.aberturaPorta={habilitado:true,inicioEvento:'04/11/2026 10:00:00',fimEvento:'04/11/2026 10:02:00',tempoAlvoMinutos:5,resultadoDesejado:'REPROVADO'};assert.throws(()=>e.fn('EstufaQ_montarContexto_')(p),/sobrepostos/);
});
test('o modo real ignora a escolha de simulação e continua reprovando leitura fora da faixa',()=>{
 const e=ambiente(),serie=E.serieEstufa({evento:(m,k,t)=>m===120&&k===0?40:t});const p=E.payloadIncubacao(serie,{simulacao:{resultadoDistribuicao:'APROVADO'}});
 const r=e.fn('EstufaQ_montarContexto_')(p);assert.equal(r.simulado,false);assert.equal(r.statusConsolidado,'REPROVADO');
});


test('documentos simulados: prévia, relatório e planilha mantêm o resultado nos quatro perfis',()=>{
 for(const perfil of perfis)for(const resultado of ['APROVADO','REPROVADO']) {
  const e=ambiente(),p=payload(perfil,resultado);p.certNumero='SIM-TESTE';p.responsavelTecnico='Técnico sintético';
  const r=e.estufa('adm','apiQGerarRascunho',JSON.parse(JSON.stringify(p)));assert.equal(r.bloqueado,false,JSON.stringify(r.travas));assert.equal(r.contexto.statusConsolidado,resultado);
  const em=e.estufa('adm','apiQEmitir',Object.assign({},JSON.parse(JSON.stringify(p)),{assinaturaContexto:r.assinaturaContexto,textosCertificado:r.textos}));assert.equal(em.resultado,resultado,perfil);
  const plan=e.estufa('adm','apiGerarPlanilhaDados',JSON.parse(JSON.stringify(p)));assert.equal(plan.statusAprovacao,resultado,perfil);assert.match(plan.html,/RECONSTITU|SIMULAD|RELATÓRIO INTERNO/i);
 }
});
