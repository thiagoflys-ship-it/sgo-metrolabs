'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ambiente,regrasDeTeste}=require('./_compras_ambiente.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
test('delegação financeira de Compras mantém perfil, área e alçadas existentes',()=>{
 const a=ambiente(),before=JSON.stringify(a.tabelas.CAD_USUARIOS);regrasDeTeste(a,{financeiros:['u_gc','u_gt']});
 for(const sid of ['s_gaspar','s_gil']){const eu=a.ctx.Cmp_eu_(sid);assert.equal(eu.financeiro,true);assert.equal(eu.comprador,false);assert.equal(eu.perfil,'GESTOR');assert.equal(a.ctx.CmpCart_podeEditar_(eu),true);}
 assert.equal(JSON.stringify(a.tabelas.CAD_USUARIOS),before);assert.equal(a.ctx.Cmp_eu_('s_vera').financeiro,false);
});
test('delegados cadastram cartão e consultam conferência sem alterar dados globais do usuário',()=>{
 const a=ambiente();regrasDeTeste(a,{financeiros:['u_gc','u_gt']});
 const card=a.api('s_gaspar','salvarCartao',{final:'6789',apelido:'Cartão fictício QA',tipo:'CREDITO',responsavelId:'u_gt',diaFechamento:5,diaVencimento:15});assert.equal(card.ok,true,card.message);
 const list=a.api('s_gil','cartoes',{});assert.equal(list.ok,true,list.message);assert.equal(list.podeEditar,true);assert.equal(list.cartoes.some(c=>c.final==='6789'),true);
 assert.doesNotThrow(()=>a.ctx.Cmp_exigir_(a.ctx.Cmp_eu_('s_gil'),'FINANCEIRO','conferir compras'));
});
test('gestor sem autorização não amplia a própria permissão financeira',()=>{
 const a=ambiente();regrasDeTeste(a);const before=JSON.stringify(a.tabelas.CMP_CONFIG),r=plain(a.ctx.Cmp_regras_());r.financeiros=['u_gc'];
 assert.throws(()=>a.ctx.Cmp_gravarRegras_(r,a.ctx.Cmp_eu_('s_gaspar'),'Tentativa QA de ampliar acesso financeiro'),/somente o Administrador ou a Diretoria/);assert.equal(JSON.stringify(a.tabelas.CMP_CONFIG),before);
});
test('tela antiga que omite financeiros preserva os acessos já liberados',()=>{
 const a=ambiente();regrasDeTeste(a,{financeiros:['u_gc','u_gt']});const r=plain(a.ctx.Cmp_regras_());delete r.financeiros;
 const result=a.api('s_dora','regras',{salvar:r,motivo:'Atualização de regras por tela anterior QA'});assert.equal(result.ok,true,result.message);assert.deepEqual(plain(a.ctx.Cmp_regras_().financeiros),['u_gc','u_gt']);
});
test('delegação recusa usuário inativo e perfis de acesso restrito',()=>{
 for(const id of ['u_tec','u_met','u_rh','inexistente']){const a=ambiente();assert.throws(()=>regrasDeTeste(a,{financeiros:[id]}),/usuário interno ativo/);}
 const a=ambiente();a.tabelas.CAD_USUARIOS.find(u=>u.ID==='u_gc').STATUS='INATIVO';assert.throws(()=>regrasDeTeste(a,{financeiros:['u_gc']}),/usuário interno ativo/);
});
test('destinatários financeiros acrescentam apenas os delegados e respeitam exclusão',()=>{
 const a=ambiente();regrasDeTeste(a,{financeiros:['u_gc','u_gt']});const us=a.ctx.Cmp_usuarios_();assert.deepEqual(Array.from(a.ctx.CmpFin_idsFinanceiro_(us,[])).sort(),['u_fin','u_gc','u_gt'].sort());assert.deepEqual(Array.from(a.ctx.CmpFin_idsFinanceiro_(us,['u_gc'])).sort(),['u_fin','u_gt'].sort());
});
test('retirada da delegação revoga edição e conferência imediatamente',()=>{
 const a=ambiente();regrasDeTeste(a,{financeiros:['u_gc']});assert.equal(a.ctx.Cmp_eu_('s_gaspar').financeiro,true);regrasDeTeste(a,{financeiros:[]});assert.equal(a.ctx.Cmp_eu_('s_gaspar').financeiro,false);assert.equal(a.ctx.CmpCart_podeEditar_(a.ctx.Cmp_eu_('s_gaspar')),false);
});
