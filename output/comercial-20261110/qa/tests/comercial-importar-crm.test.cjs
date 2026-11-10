// Comercial — importação do CRM antigo (26/10/2026): clientes pelo CNPJ (ou unidade, ou nome sem CNPJ válido), vendedores,
// triagem dos abertos (60 dias), funil Aluguel, rascunhos, pedidos antigos fora da Caixa de decisões e nova rodada sem duplicar.
// Só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, em } = require('./_comercial_ambiente.cjs');

const tabela = (linhas) => ({ colunas: Object.keys(linhas[0] || {}), linhas });
const ts = (dia) => dia + ' 12:00:00.000+00';
function dadosCrm() {
  return {
    profiles: tabela([{ id: 'p_vera', full_name: 'Vera Vendedora' }, { id: 'p_ex', full_name: 'Ex Vendedor Sem Usuário' }]),
    funnels: tabela([{ id: 'f_prod', name: 'Produtos' }, { id: 'f_alu', name: 'Aluguel de Equipamentos' }]),
    funnel_stages: tabela([
      { id: 's_p1', funnel_id: 'f_prod', name: 'Prospecção', probability: '20', position: '0' }, { id: 's_p3', funnel_id: 'f_prod', name: 'Proposta', probability: '60', position: '2' },
      { id: 's_a1', funnel_id: 'f_alu', name: 'Levantamento', probability: '20', position: '0' }, { id: 's_a2', funnel_id: 'f_alu', name: 'Contrato', probability: '100', position: '1' }]),
    companies: tabela([
      { id: 'e_alfa', name: 'Hospital Alfa', cnpj: '11.222.333/0001-81', email: '', phone: '', address: '', city: '', state: '', zip_code: '' },
      { id: 'e_nova', name: 'Clínica Nova Teste', cnpj: '45.723.174/0001-10', email: 'contato@nova.exemplo.test', phone: '(62) 3333-0000', address: 'Rua A', city: 'Goiânia', state: 'GO', zip_code: '' },
      { id: 'e_cpf', name: 'Pessoa Física Teste', cnpj: '015.719.146-09', email: '', phone: '', address: '', city: '', state: '', zip_code: '' },
      { id: 'e_teste', name: 'teste', cnpj: '', email: '', phone: '', address: '', city: '', state: '', zip_code: '' }]),
    contacts: tabela([{ id: 'ct1', name: 'Carlos Compras', email: 'carlos@nova.exemplo.test', phone: '62999990000', company: 'Clínica Nova Teste', company_id: 'e_nova', notes: '', created_at: ts('2026-09-01') }]),
    products: tabela([
      { id: 'pr1', name: 'Teste Bowie Dick (100 folhas)', sku: 'BD-100', description: '', category: 'pecas', price: '250.00', cost: '100.00', unit: 'cx', brand: '', supplier: '', is_active: 't', created_at: ts('2026-01-01') },
      { id: 'pr0', name: 'Produto Exemplo', sku: 'PROD001', description: '', category: '', price: '1', cost: '1', unit: 'un', brand: '', supplier: '', is_active: 't', created_at: ts('2026-01-01') }]),
    loss_reasons: tabela([{ id: 'lr1', name: 'Preço alto' }]),
    deals: tabela([
      { id: 'd_ganho', title: 'Venda ganha', value: '1000.00', status: 'ganho', expected_close_date: '2026-09-30', funnel_id: 'f_prod', stage_id: 's_p3', contact_id: '', assigned_to: 'p_vera', created_at: ts('2026-09-01'), updated_at: ts('2026-09-20'), stage_entry_date: ts('2026-09-10'), company_id: 'e_alfa', loss_reason_id: '', loss_notes: '' },
      { id: 'd_perdido', title: 'Venda perdida', value: '500.00', status: 'perdido', expected_close_date: '', funnel_id: 'f_prod', stage_id: 's_p1', contact_id: '', assigned_to: 'p_ex', created_at: ts('2026-08-01'), updated_at: ts('2026-08-20'), stage_entry_date: ts('2026-08-01'), company_id: 'e_nova', loss_reason_id: 'lr1', loss_notes: 'Cliente achou caro' },
      { id: 'd_recente', title: 'Aberto recente', value: '800.00', status: 'aberto', expected_close_date: '2026-11-30', funnel_id: 'f_prod', stage_id: 's_p3', contact_id: 'ct1', assigned_to: 'p_vera', created_at: ts('2026-10-01'), updated_at: ts('2026-10-20'), stage_entry_date: ts('2026-10-05'), company_id: 'e_nova', loss_reason_id: '', loss_notes: '' },
      { id: 'd_parado', title: 'Aberto parado', value: '300.00', status: 'aberto', expected_close_date: '', funnel_id: 'f_alu', stage_id: 's_a1', contact_id: '', assigned_to: 'p_vera', created_at: ts('2026-03-01'), updated_at: ts('2026-04-01'), stage_entry_date: ts('2026-03-01'), company_id: 'e_cpf', loss_reason_id: '', loss_notes: '' },
      { id: 'd_teste', title: 'teste', value: '1', status: 'aberto', expected_close_date: '', funnel_id: 'f_prod', stage_id: 's_p1', contact_id: '', assigned_to: 'p_vera', created_at: ts('2026-10-01'), updated_at: ts('2026-10-20'), stage_entry_date: '', company_id: 'e_teste', loss_reason_id: '', loss_notes: '' }]),
    deal_products: tabela([{ id: 'dp1', deal_id: 'd_recente', product_id: 'pr1', quantity: '2', unit_price: '250.00' }]),
    budgets: tabela([
      { id: 'b_ap', deal_id: 'd_ganho', budget_number: 'ORC-20260915-0001', title: 'Orçamento ganho', client_name: 'Hospital Alfa', client_document: '11.222.333/0001-81', client_address: '', client_email: '', client_phone: '', subtotal: '1000.00', discount_amount: '0.00', total_amount: '1000.00', expiration_date: '2026-10-15', status: 'approved', sent_at: ts('2026-09-15'), signed_at: ts('2026-09-20'), signature_name: '', rejection_reason: '', rejected_at: '', notes: '', created_at: ts('2026-09-15'), updated_at: ts('2026-09-20') },
      { id: 'b_r1', deal_id: 'd_recente', budget_number: 'ORC-20261002-0002', title: 'Rascunho antigo', client_name: '', client_document: '', client_address: '', client_email: '', client_phone: '', subtotal: '500.00', discount_amount: '0.00', total_amount: '500.00', expiration_date: '2026-11-01', status: 'draft', sent_at: '', signed_at: '', signature_name: '', rejection_reason: '', rejected_at: '', notes: '', created_at: ts('2026-10-02'), updated_at: ts('2026-10-02') },
      { id: 'b_r2', deal_id: 'd_recente', budget_number: 'ORC-20261010-0003', title: 'Rascunho novo', client_name: '', client_document: '', client_address: '', client_email: '', client_phone: '', subtotal: '500.00', discount_amount: '0.00', total_amount: '500.00', expiration_date: '2026-11-10', status: 'draft', sent_at: '', signed_at: '', signature_name: '', rejection_reason: '', rejected_at: '', notes: '', created_at: ts('2026-10-10'), updated_at: ts('2026-10-10') },
      { id: 'b_r3', deal_id: 'd_perdido', budget_number: 'ORC-20260805-0004', title: 'Rascunho de perdido', client_name: '', client_document: '', client_address: '', client_email: '', client_phone: '', subtotal: '500.00', discount_amount: '0.00', total_amount: '500.00', expiration_date: '2026-09-01', status: 'draft', sent_at: '', signed_at: '', signature_name: '', rejection_reason: '', rejected_at: '', notes: '', created_at: ts('2026-08-05'), updated_at: ts('2026-08-05') }]),
    budget_items: tabela([{ id: 'bi1', budget_id: 'b_r2', item_type: 'product', product_id: 'pr1', service_name: '', description: 'Bowie Dick 100 folhas', quantity: '2', unit_price: '250.00', notes: '', position: '0' }]),
    activities: tabela([
      { id: 'a1', deal_id: 'd_recente', type: 'ligacao', title: 'Liguei', description: 'Cliente pediu prazo', scheduled_at: '', completed: 't', created_by: 'p_vera', created_at: ts('2026-10-15') },
      { id: 'a2', deal_id: 'd_recente', type: 'nota', title: 'Nota', description: 'Quer entrega em novembro', scheduled_at: '', completed: 't', created_by: 'p_vera', created_at: ts('2026-10-16') }])
  };
}

function preparar() {
  const amb = ambiente({ agora: em('2026-10-26T10:00:00-03:00') });
  amb.tabelas.CAD_USUARIOS.push({ ID: 'u_monica', USUARIO: 'monica', NOME: 'MONICA PADRAO TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', AREA: 'COMERCIAL', EMAIL: 'monica@exemplo.test' });
  vm.runInContext("COMIMP_VENDEDORES = [{ crm: /^vera/i, login: 'vera' }];", amb.ctx);
  return amb;
}
function carregar(amb) {
  const f = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_ImportarCrm.js');
  vm.runInContext(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), amb.ctx, { filename: 'SGO_Comercial_ImportarCrm.js' });
}
const opp = (amb, ref) => amb.tabelas.COM_OPORTUNIDADES.find((o) => o.ORIGEM_REF === 'CRM:' + ref);
const prop = (amb, n) => amb.tabelas.COM_PROPOSTAS.find((p) => p.NUMERO === n);

test('importação do CRM: simulação não grava; importação traz tudo com as regras do Comercial', () => {
  const amb = preparar(); carregar(amb);
  vm.runInContext("COMIMP_VENDEDORES = [{ crm: /^vera/i, login: 'vera' }];", amb.ctx);
  const nCli = amb.tabelas.CAD_CLIENTES.length;
  const sim = amb.ctx.ComImp_importarCrm(dadosCrm(), { simular: true });
  assert.equal(sim.oportunidades.criadas, 4);
  assert.equal(amb.tabelas.CAD_CLIENTES.length, nCli);
  assert.equal((amb.tabelas.COM_OPORTUNIDADES || []).length, 0);

  const r = amb.ctx.ComImp_importarCrm(dadosCrm(), {});
  // clientes: Alfa reaproveitado pelo CNPJ; Nova criada com CNPJ; CPF vira cliente sem CNPJ, com aviso; "teste" ignorado
  assert.equal(r.clientes.reaproveitados, 1); assert.equal(r.clientes.criados, 2);
  const nova = amb.tabelas.CAD_CLIENTES.find((c) => c.NOME_FANTASIA === 'CLÍNICA NOVA TESTE');
  assert.equal(nova.CNPJ, '45723174000110'); assert.equal(nova.ORIGEM, 'CRM'); assert.equal(nova.EMAIL, 'contato@nova.exemplo.test');
  assert.equal(amb.tabelas.CAD_CLIENTES.find((c) => c.NOME_FANTASIA === 'PESSOA FÍSICA TESTE').CNPJ, '');
  assert.ok(r.avisos.some((a) => /CNPJ inválido/.test(a)));
  assert.deepEqual(Array.from(r.ignoradosTeste).sort(), ['empresa "teste"', 'negócio "teste"', 'produto "Produto Exemplo"']);
  // produto real com "Teste" no nome entra no catálogo
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'BD-100').NOME, 'Teste Bowie Dick (100 folhas)');
  // oportunidades
  const g = opp(amb, 'd_ganho'), p = opp(amb, 'd_perdido'), ab = opp(amb, 'd_recente'), pa = opp(amb, 'd_parado');
  assert.equal(g.SITUACAO, 'GANHA'); assert.equal(g.CLIENTE_ID, 'c1'); assert.equal(g.RESPONSAVEL_ID, 'u_ven');
  assert.equal(p.SITUACAO, 'PERDIDA'); assert.equal(p.MOTIVO_PERDA, 'Preço ou condição de pagamento'); assert.equal(p.RESPONSAVEL_ID, 'u_monica');
  assert.match(p.OBSERVACOES, /Ex Vendedor Sem Usuário \(sem usuário no SGO\+; passou para MONICA PADRAO TESTE\)/);
  assert.equal(ab.SITUACAO, 'ABERTA'); assert.equal(ab.FUNIL, 'PRODUTOS'); assert.equal(ab.ETAPA, 'PRO_3'); assert.ok(ab.ATIVIDADE_ID);
  assert.equal(ab.CONTATO_NOME, 'Carlos Compras'); assert.match(ab.OBSERVACOES, /Teste Bowie Dick \(100 folhas\): 2 x/);
  const atv = amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === ab.ATIVIDADE_ID);
  assert.equal(atv.RESPONSAVEL_ID, 'u_ven'); assert.equal(atv.PRAZO, '2026-10-27T10:00');
  assert.equal(pa.SITUACAO, 'PERDIDA'); assert.equal(pa.MOTIVO_PERDA, 'Falha de acompanhamento ou oportunidade abandonada'); assert.equal(pa.FUNIL, 'ALUGUEL');
  assert.match(r.funilAluguel, /criado/);
  // propostas: aprovada antiga não vira "pedido sem passagem"; só o rascunho mais recente do aberto continua rascunho
  assert.equal(prop(amb, 'ORC-20260915-0001').SITUACAO, 'APROVADA'); assert.equal(prop(amb, 'ORC-20260915-0001').PEDIDO_SITUACAO, 'CONCLUIDO');
  assert.equal(prop(amb, 'ORC-20261010-0003').SITUACAO, 'RASCUNHO'); assert.equal(prop(amb, 'ORC-20261002-0002').SITUACAO, 'CANCELADA');
  assert.equal(prop(amb, 'ORC-20260805-0004').SITUACAO, 'CANCELADA');
  assert.equal(JSON.parse(prop(amb, 'ORC-20261010-0003').ITENS_JSON)[0].codigo, 'BD-100');
  // histórico: ligação vira contato registrado; nota vira histórico
  assert.equal(amb.tabelas.COM_CONTATOS_REGISTRO.filter((c) => c.OPORTUNIDADE_ID === ab.ID).length, 1);
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === ab.ID && h.TIPO === 'NOTA_CRM' && /novembro/.test(h.TEXTO)));
  // nenhum e-mail de "nova atividade" para a vendedora
  assert.equal(amb.emails.length, 0);
  // telas do Comercial abrem com os dados
  for (const acao of ['hoje', 'oportunidades', 'propostas', 'quadro', 'gantt', 'painel', 'pedidos']) assert.equal(amb.api('s_gaspar', acao, { funil: 'PRODUTOS' }).ok, true, acao);

  // nova rodada: nada duplica
  const contar = () => ['CAD_CLIENTES', 'CAD_CONTATOS', 'COM_PRODUTOS', 'COM_OPORTUNIDADES', 'COM_PROPOSTAS', 'COM_HISTORICO', 'ATV_ATIVIDADES'].map((t) => (amb.tabelas[t] || []).length).join(',');
  const antes = contar();
  const r2 = amb.ctx.ComImp_importarCrm(dadosCrm(), {});
  assert.equal(contar(), antes);
  assert.equal(r2.oportunidades.criadas, 0); assert.equal(r2.clientes.criados, 0);
});

test('importação do CRM: sem a usuária padrão ativa, para com a explicação', () => {
  const amb = ambiente({ agora: em('2026-10-26T10:00:00-03:00') }); carregar(amb);
  assert.throws(() => amb.ctx.ComImp_importarCrm(dadosCrm(), { simular: true }), /Mônica Souza.*não está ativo/);
});
