const test=require('node:test'),assert=require('node:assert/strict');
const {ambiente,oportunidadeDeTeste}=require('./_comercial_ambiente.cjs');
const ok=r=>{assert.equal(r.ok,true,r.message);return r};
function setup(){const a=ambiente(),o=oportunidadeDeTeste(a).oportunidade;return {a,o,d:{id:o.id,proxima:{acao:'Conferir escopo com o cliente',data:'2026-10-20',hora:'14:00',tipo:'LIGACAO'}}};}
test('gestor cria atividade para a dona da oportunidade e preserva a próxima ação',()=>{
 const {a,o,d}=setup(),row=a.tabelas.COM_OPORTUNIDADES.find(x=>x.ID===o.id),antes=JSON.stringify(row),n=a.tabelas.ATV_ATIVIDADES.length;
 const r=ok(a.api('s_gaspar','criarAtividadeOportunidade',d));
 assert.equal(a.tabelas.ATV_ATIVIDADES.length,n+1);
 const task=a.tabelas.ATV_ATIVIDADES.find(x=>x.ID===r.atividadeId);
 assert.equal(task.RESPONSAVEL_ID,row.RESPONSAVEL_ID);assert.equal(task.RESTRITA,'SIM');
 // 10/11/2026 (etapa 2, D7): título com código e cliente; a oportunidade guarda só o id em ATIVIDADES_GESTAO_JSON (o resto não muda)
 assert.equal(task.TITULO,'['+o.codigo+'] '+d.proxima.acao+' — '+o.cliente);const g=JSON.parse(row.ATIVIDADES_GESTAO_JSON);assert.equal(g[0].id,r.atividadeId);assert.equal(g[0].porId,'u_gc');
 const semG=Object.assign({},row);delete semG.ATIVIDADES_GESTAO_JSON;assert.equal(JSON.stringify(semG),antes);
 assert(a.tabelas.COM_HISTORICO.some(h=>h.ENTIDADE_ID===o.id&&h.TIPO==='ATIVIDADE_GESTAO'));
});
test('vendedor e financeiro não criam atividade de gestão',()=>{const {a,d}=setup(),n=a.tabelas.ATV_ATIVIDADES.length;for(const sid of ['s_vera','s_vito','s_fabio'])assert.equal(a.api(sid,'criarAtividadeOportunidade',d).ok,false);assert.equal(a.tabelas.ATV_ATIVIDADES.length,n);});
test('recusa oportunidade encerrada, inexistente e prazo passado sem criar atividade',()=>{
 for(const tipo of ['fechada','inexistente','passado']){const {a,o,d}=setup();if(tipo==='fechada')a.tabelas.COM_OPORTUNIDADES.find(x=>x.ID===o.id).SITUACAO='GANHA';if(tipo==='inexistente')d.id='NAO_EXISTE';if(tipo==='passado')d.proxima.data='2026-10-18';const n=a.tabelas.ATV_ATIVIDADES.length;assert.equal(a.api('s_gaspar','criarAtividadeOportunidade',d).ok,false);assert.equal(a.tabelas.ATV_ATIVIDADES.length,n);}
});
test('exclusão de duplicado retira produto ou serviço das novas escolhas e mantém registro',()=>{
 for(const tipo of ['PRODUTO','SERVICO']){
  const a=ambiente();const p=ok(a.api('s_gaspar','salvarProduto',{codigo:'DUP-1',tipo,nome:'Item repetido teste',unidade:'un.',preco:'100',custo:'20'})).produto;
  // 10/11/2026 (etapa 2, D18): só é repetido com outro item ativo de mesmo nome (veio assim do CRM) e o servidor pede qual fica
  a.tabelas.COM_PRODUTOS.push({ID:'p_fica',CODIGO:'DUP-1B',TIPO:tipo,NOME:'Item repetido teste',UNIDADE_MEDIDA:'un.',PRECO:100,ATIVO:'SIM'});
  a.tabelas.COM_PROPOSTAS.push({ID:'PROPOSTA_ANTIGA',ITENS_JSON:JSON.stringify([{produtoId:p.id,precoUnitario:100,quantidade:2}]),TOTAL:200});
  const before=JSON.stringify(a.tabelas.COM_PROPOSTAS);
  ok(a.api('s_gaspar','excluirProdutoDuplicado',{id:p.id,manterId:'p_fica',motivo:'Cadastrado duas vezes por engano'}));
  assert.equal(a.tabelas.COM_PRODUTOS.find(x=>x.ID===p.id).ATIVO,'NAO');
  assert.equal(JSON.stringify(a.tabelas.COM_PROPOSTAS),before);
  assert(a.tabelas.COM_HISTORICO.some(x=>x.ENTIDADE_ID===p.id&&/Exclusão de duplicado/.test(x.TEXTO)));
 }
});
test('exclusão exige motivo e respeita acesso do catálogo',()=>{
 const a=ambiente(),p=ok(a.api('s_gaspar','salvarProduto',{codigo:'DUP-2',tipo:'SERVICO',nome:'Serviço teste',unidade:'un.',preco:'100',custo:'20'})).produto;
 assert.equal(a.api('s_gaspar','excluirProdutoDuplicado',{id:p.id,motivo:'erro'}).ok,false);
 assert.equal(a.api('s_rita','excluirProdutoDuplicado',{id:p.id,motivo:'Cadastrado duas vezes por engano'}).ok,false);
 assert.equal(a.tabelas.COM_PRODUTOS.find(x=>x.ID===p.id).ATIVO,'SIM');
});
