// Comercial, custo com cotação do fornecedor, validade e preço sugerido (11/11/2026, pedido do dono depois da PROP-2026-0028).
// Regras: custo só se grava com a cotação anexada (PDF ou imagem), com fornecedor, data, validade e quem anexou; o custo vence (validade da
// cotação limitada ao teto da gestão, padrão 90 dias); vencido ou sem anexo = "sem custo válido" (a proposta vai para a Diretoria, e a
// reconferência antes do envio pega o que venceu depois da conclusão); avisos antecipados aos responsáveis; preço de tabela abaixo do
// piso com o custo novo é sinalizado à gestão; histórico por item; painel "Custos a atualizar". Ampliação: guia de preço (mínimo,
// sugerido, opções). Dados fictícios. Código real (tests/_comercial_ambiente.cjs) com a opção cotacaoReal (sem cotação automática).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar: ' + (r.message || '')); if (re) assert.match(r.message, re); return r; };
const prop = (a, id) => a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const prod = (a, id) => a.tabelas.COM_PRODUTOS.find((x) => x.ID === id);
const versoes = (a, id) => (a.tabelas.COM_CUSTOS_COTACOES || []).filter((v) => v.PRODUTO_ID === id);
const PDF = { nome: 'cotacao-fornecedor.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 cotacao do fornecedor de teste').toString('base64') };
const COND_PRODUTO = { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' };
const cot = (extra) => Object.assign({ fornecedor: 'Distribuidora Teste Ltda', numero: 'COT-77', data: '2026-10-15', validade: '2026-11-30', arquivo: PDF }, extra || {});
const amb = () => ambiente({ cotacaoReal: true });

function produto(a, extra) {
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  const p = Object.assign({ ID: 'prod_frag', CODIGO: 'FRAG-01', NOME: 'Fragmentadora de papel de teste', TIPO: 'PRODUTO', CATEGORIA: 'Equipamentos', UNIDADE_MEDIDA: 'un.', PRECO: 30000, CUSTO: '', ATIVO: 'SIM',
    ATUALIZADO_POR_NOME: 'GASPAR GESTOR COMERCIAL TESTE', CRIADO_EM: '2026-10-01T10:00:00.000Z' }, extra || {});
  a.tabelas.COM_PRODUTOS.push(p);
  return p;
}
function rascunho(a, preco) {
  const amanha = a.ctx.Com_somarDias_(a.ctx.Com_hoje_(), 1);
  const { oportunidade, contato } = oportunidadeDeTeste(a, 's_vera', { proxima: { acao: 'Ligar para confirmar o escopo', data: amanha, hora: '10:00', tipo: 'LIGACAO' } });
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const r = ok(a.api('s_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: SEM_VIAGEM, escopo: 'Fornecimento de equipamento para a CME do cliente de teste.', contatoId: contato.id,
    itens: [{ produtoId: 'prod_frag', descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: preco || '30.000,00' }], condicoes: COND_PRODUTO }));
  return { id: np.proposta.id, salvo: r };
}
/** Produto com custo de R$ 9.200 gravado pela gestão com a cotação (válida até 30/11/2026). */
function comCustoValido(a, extra) {
  produto(a, extra);
  return ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot() }));
}

// ------------------------------------------------------------------ 1. sem anexo, nada é gravado
test('C1 custo sem cotação anexada é recusado (cadastro e atualização), com o que fazer; dados incompletos, cotação vencida e teto também; equipe comercial não grava custo de item existente', () => {
  const a = amb();
  falha(a.api('s_gaspar', 'salvarProduto', { codigo: 'NOVO-1', nome: 'Produto novo de teste', tipo: 'PRODUTO', preco: '1.000,00', custo: '400,00' }), /anexe a cotação.*Por quê.*Como resolver.*Nada foi gravado/);
  assert.equal((a.tabelas.COM_PRODUTOS || []).length, 0, 'nada foi gravado');
  // vendedora: produto novo exige custo E cotação
  falha(a.api('s_vera', 'salvarProduto', { codigo: 'NOVO-2', nome: 'Produto da vendedora', tipo: 'PRODUTO', preco: '1.000,00', custo: '400,00' }), /anexe a cotação/);
  produto(a);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ arquivo: null }) }), /anexe a cotação ou proposta do fornecedor/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ fornecedor: '' }) }), /informe o fornecedor/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ validade: '' }) }), /informe a validade/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ data: '2026-10-25' }) }), /está no futuro/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ validade: '2026-10-18' }) }), /venceu em 18\/10\/2026.*cotação atualizada/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ data: '2026-06-01', validade: '2027-06-01' }) }), /prazo máximo aceito pela gestão é de 90 dias/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ arquivo: { nome: 'cotacao.pdf', tipo: 'application/pdf', base64: Buffer.from('isto nao e pdf').toString('base64') } }) }), /não é um PDF ou imagem válido/);
  falha(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ arquivo: { nome: 'cotacao.docx', tipo: 'x', base64: PDF.base64 } }) }), /PDF ou imagem/);
  falha(a.api('s_vera', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot() }), /gestão comercial/);
  // edição pela gestão sem mandar o custo: o custo fica como está (o custo muda só com a cotação)
  ok(a.api('s_gaspar', 'salvarProduto', { id: 'prod_frag', codigo: 'FRAG-01', nome: 'Fragmentadora de papel de teste', tipo: 'PRODUTO', preco: '30.000,00', descricao: 'Nova descrição' }));
  assert.equal(prod(a, 'prod_frag').CUSTO, ''); assert.equal(versoes(a, 'prod_frag').length, 0);
});

// ------------------------------------------------------------------ 2. com anexo: versão, validade, arquivo privado e histórico
test('C2 custo com cotação: grava a versão (fornecedor, datas, validade calculada, quem anexou, SHA), o arquivo abre conferido; nova cotação substitui e o histórico guarda as duas', () => {
  const a = amb();
  const r = comCustoValido(a);
  assert.match(r.message, /válido até 30\/11\/2026/);
  const p = prod(a, 'prod_frag');
  assert.equal(p.CUSTO, 9200); assert.equal(p.CUSTO_VALIDO_ATE, '2026-11-30'); assert.equal(p.CUSTO_FORNECEDOR, 'Distribuidora Teste Ltda'); assert.equal(p.CUSTO_POR_NOME, 'GASPAR GESTOR COMERCIAL TESTE');
  const v = versoes(a, 'prod_frag');
  assert.equal(v.length, 1); assert.equal(v[0].SITUACAO, 'VIGENTE'); assert.equal(v[0].COTACAO_NUMERO, 'COT-77'); assert.equal(v[0].TETO_DIAS, 90); assert.ok(v[0].SHA256.length === 64); assert.ok(a.arquivos[v[0].ARQUIVO_ID], 'arquivo guardado');
  assert.equal(r.produto.custoSit.codigo, 'VIGENTE');
  const arq = ok(a.api('s_fabio', 'custoArquivo', { versaoId: v[0].ID }));
  assert.equal(Buffer.from(arq.base64, 'base64').toString(), '%PDF-1.4 cotacao do fornecedor de teste');
  falha(a.api('s_vera', 'custoArquivo', { versaoId: v[0].ID }), /gestão comercial, pela Diretoria e pelo Financeiro/);
  falha(a.api('s_vera', 'custoItem', { produtoId: 'prod_frag' }), /custos e cotações são vistos/);
  // o vendedor vê a situação do custo, sem valores
  const visto = ok(a.api('s_vera', 'catalogo', { busca: 'FRAG-01' })).produtos[0];
  assert.equal(visto.custoSit.codigo, 'VIGENTE'); assert.equal(visto.custo, undefined); assert.equal(visto.custoSit.fornecedor, undefined);
  // o Financeiro atualiza com a cotação nova: a anterior fica SUBSTITUIDA (nunca apagada)
  a.mudar('2026-10-20T10:00:00-03:00');
  ok(a.api('s_fabio', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.500,00', cotacao: cot({ fornecedor: 'Outro Fornecedor Teste', data: '2026-10-20', validade: '2027-03-01' }) }));
  const v2 = versoes(a, 'prod_frag').sort((x, y) => x.VERSAO - y.VERSAO);
  assert.deepEqual(v2.map((x) => x.SITUACAO), ['SUBSTITUIDA', 'VIGENTE']); assert.equal(v2[1].VERSAO, 2); assert.equal(v2[1].CUSTO_ANTERIOR, 9200);
  assert.equal(prod(a, 'prod_frag').CUSTO_VALIDO_ATE, '2027-01-18', 'teto de 90 dias vence antes da validade do fornecedor');
  const item = ok(a.api('s_gaspar', 'custoItem', { produtoId: 'prod_frag' }));
  assert.equal(item.versoes.length, 2); assert.equal(item.versoes[0].situacao, 'Em uso'); assert.equal(item.versoes[1].situacao, 'Substituída');
  assert.ok(a.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === 'prod_frag' && h.TIPO === 'CUSTO').length === 2);
});

// ------------------------------------------------------------------ 3. preço de tabela abaixo do piso com o custo novo
test('C3 custo novo deixa o preço de tabela abaixo do mínimo: a gestão é avisada (sem R$), o preço não muda e o painel mostra', () => {
  const a = amb();
  const r = comCustoValido(a, { PRECO: 15525 }); // caso real: com R$ 9.200 o mínimo é R$ 21.467
  assert.equal(r.precoAbaixoPiso, true); assert.match(r.message, /abaixo do mínimo \(R\$ 21\.467,00\).*O preço não mudou/);
  assert.equal(prod(a, 'prod_frag').PRECO, 15525);
  const av = a.tabelas.COM_AVISOS.filter((x) => x.TIPO === 'PRECO_ABAIXO_PISO');
  assert.ok(av.some((x) => x.DESTINATARIO_ID === 'u_gc' && x.EMAIL_SITUACAO === 'PENDENTE')); assert.ok(av.every((x) => !/R\$/.test(x.TEXTO)), 'aviso sem valores');
  assert.equal(versoes(a, 'prod_frag')[0].PRECO_ABAIXO_PISO, 'SIM');
  const pn = ok(a.api('s_gaspar', 'custosPainel', { situacao: 'ABAIXO_PISO' }));
  assert.equal(pn.itens.length, 1); assert.equal(pn.itens[0].pisoTxt, 'R$ 21.467,00'); assert.equal(pn.kpis.ABAIXO_PISO, 1);
});

// ------------------------------------------------------------------ 4. vencido bloqueia a conclusão; a Diretoria libera
test('C4 custo vencido = sem custo válido: a conclusão vai para a Diretoria (gestor não aprova), a Diretoria aprova e o registro guarda o item aprovado', () => {
  const a = amb();
  comCustoValido(a);
  a.mudar('2026-12-02T10:00:00-03:00'); // cotação válida até 30/11
  const x = rascunho(a);
  assert.equal(x.salvo.politica.exigeDiretoria, true); assert.match(x.salvo.politica.motivos.join(' '), /custo sem cotação válida: item 1 \(FRAG-01.*cotação vencida em 30\/11\/2026/);
  const det = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta;
  assert.equal(det.guiaPrecos.itens[0].custo.codigo, 'VENCIDO'); assert.equal(det.guiaPrecos.itens[0].podePedirCusto, true);
  falha(a.api('s_vera', 'concluirProposta', { id: x.id }), /custo sem cotação válida.*aprovação da Diretoria.*Pedir atualização do custo/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Fornecedor confirmou o preço por telefone; cotação nova a caminho' }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  falha(a.api('s_gaspar', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovo pelo cliente estratégico' }), /essa exceção é da Diretoria/);
  ok(a.api('s_dora', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovado com o preço confirmado pelo fornecedor' }));
  const q = prop(a, x.id), ap = JSON.parse(q.PRECIFICACAO_JSON).aprovacao;
  assert.equal(q.SITUACAO, 'PRONTA'); assert.deepEqual(ap.codigos, ['CUSTO_SEM_COTACAO']); assert.deepEqual(ap.semCotacao, ['prod_frag']);
  ok(a.api('s_vera', 'conferirEnvio', { id: x.id }));
});

// ------------------------------------------------------------------ 5. reconferência: custo que venceu depois da conclusão
test('C5 proposta pronta com custo válido na conclusão: depois que a cotação vence, gerar documento e enviar são barrados com o que fazer; a tela mostra o que mudou', () => {
  const a = amb();
  comCustoValido(a);
  const x = rascunho(a);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id }));
  const p = prop(a, x.id);
  assert.equal(p.SITUACAO, 'PRONTA'); assert.ok(JSON.parse(p.PRECIFICACAO_JSON).custos.itens[0].situacao === 'VIGENTE');
  ok(a.api('s_vera', 'conferirEnvio', { id: x.id }));
  a.mudar('2026-12-01T10:00:00-03:00');
  const re = /hoje tem custo sem cotação válida.*cotação vencida em 30\/11\/2026.*Voltar para rascunho.*Custos a atualizar.*Nada foi alterado/;
  falha(a.api('s_vera', 'gerarDocumento', { id: x.id }), re);
  falha(a.api('s_vera', 'conferirEnvio', { id: x.id }), re);
  const det = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta;
  assert.match(det.politica.reavaliar, /Voltar para rascunho/); assert.match(det.mudancasCusto[0].texto, /cotação do fornecedor venceu/);
  // custo que subiu depois da conclusão também aparece (sem valores)
  a.mudar('2026-12-01T11:00:00-03:00');
  ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.900,00', cotacao: cot({ data: '2026-12-01', validade: '2027-01-31' }) }));
  const det2 = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta;
  assert.match(det2.mudancasCusto[0].texto, /custo subiu depois da conclusão/); assert.ok(!/R\$/.test(det2.mudancasCusto[0].texto));
});

// ------------------------------------------------------------------ 6. legado: custo sem anexo
test('C6 custo antigo sem anexo (legado): na próxima conclusão vai para a Diretoria; a proposta pronta antiga (sem o retrato) não é barrada por isso', () => {
  const a = amb();
  a.ctx.COM_CU_PADRAO.carenciaLegadoAte = '2026-10-01'; a.ctx.COM_CU_MEMO = null; // depois do prazo de transição para anexar a cotação
  produto(a, { CUSTO: 9200 }); // como os 894 itens com custo de hoje: sem cotação
  const x = rascunho(a);
  assert.match(x.salvo.politica.motivos.join(' '), /custo sem cotação válida.*sem a cotação do fornecedor anexada/);
  const pn = ok(a.api('s_gaspar', 'custosPainel', {}));
  assert.equal(pn.kpis.SEM_ANEXO, 1); assert.equal(pn.itens[0].situacao.codigo, 'SEM_ANEXO'); assert.equal(pn.itens[0].propostas, 1, 'prioridade pelo uso em propostas abertas');
  // pronta antes de 11/11/2026: sem o retrato dos custos na fotografia
  Object.assign(prop(a, x.id), { SITUACAO: 'PRONTA', DESCONTO_SITUACAO: 'DENTRO', PRECIFICACAO_JSON: JSON.stringify({ em: '2026-11-05T10:00', margemPct: 40 }) });
  ok(a.api('s_vera', 'conferirEnvio', { id: x.id }));
  assert.equal(ok(a.api('s_vera', 'proposta', { id: x.id })).proposta.politica.reavaliar, undefined);
  // custo mudado por fora (sem cotação) não confere com a versão: volta a ser "sem cotação"
  const b = amb(); comCustoValido(b); b.tabelas.COM_PRODUTOS[0].CUSTO = 8000; // custo mudado por fora não tem prazo de transição
  assert.equal(b.ctx.ComCu_situacao_(b.tabelas.COM_PRODUTOS[0]).codigo, 'SEM_ANEXO');
});

// ------------------------------------------------------------------ 6b. transição (decisão do dono na implantação, 11/11/2026)
test('C6b custo antigo sem anexo dentro do prazo de transição: vale para o mínimo, aparece com aviso e prazo, e não leva a proposta à Diretoria por isso', () => {
  const a = amb();
  produto(a, { CUSTO: 9200 }); // sem cotação; o prazo padrão (11/12/2026) ainda não venceu no relógio do teste
  const s = a.ctx.ComCu_situacao_(a.tabelas.COM_PRODUTOS[0]);
  assert.equal(s.codigo, 'LEGADO'); assert.equal(s.valido, true); assert.match(s.texto, /anexe a cotação do fornecedor até 11\/12\/2026/);
  const x = rascunho(a);
  assert.doesNotMatch((x.salvo.politica.motivos || []).join(' '), /sem cotação válida/);
  const pn = ok(a.api('s_gaspar', 'custosPainel', {}));
  assert.equal(pn.kpis.LEGADO, 1); assert.equal(pn.itens[0].situacao.codigo, 'LEGADO');
});

// ------------------------------------------------------------------ 7. avisos antecipados e vencidos
test('C7 rotina: custo vencendo avisa os responsáveis (sistema + e-mail, sem valores, uma vez); vencido em proposta aberta vira atividade; regra configurável pela gestão', () => {
  const a = amb();
  produto(a);
  ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ validade: '2026-10-29' }) })); // vence em 10 dias
  assert.equal(a.ctx.ComCu_situacao_(prod(a, 'prod_frag')).codigo, 'VENCENDO');
  a.ctx.ComCu_rotinaAvisos_(null, true);
  const av = () => a.tabelas.COM_AVISOS.filter((x) => x.TIPO === 'CUSTOS_ATUALIZAR');
  assert.equal(av().length, 1); assert.equal(av()[0].DESTINATARIO_ID, 'u_gc'); assert.equal(av()[0].EMAIL_SITUACAO, 'PENDENTE');
  assert.match(av()[0].TEXTO, /FRAG-01.*cotação vence em 29\/10\/2026/); assert.ok(!/R\$/.test(av()[0].TEXTO));
  a.ctx.ComCu_rotinaAvisos_(null, false); // mesmo dia: não repete
  a.mudar('2026-10-21T10:00:00-03:00'); a.ctx.ComCu_rotinaAvisos_(null, true); // já avisado nesta situação: não repete
  assert.equal(av().length, 1);
  // regra da gestão: responsável = Financeiro; vendedor não muda; pessoa sem catálogo completo é recusada
  falha(a.api('s_vera', 'custosConfigSalvar', { tetoDias: 60, avisoDias: 10, responsaveis: ['u_fin'], motivo: 'Compras passa ao Financeiro' }), /gestão comercial/);
  falha(a.api('s_gaspar', 'custosConfigSalvar', { tetoDias: 60, avisoDias: 10, responsaveis: ['u_ven'], motivo: 'Compras passa ao Financeiro' }), /não tem o catálogo completo/);
  ok(a.api('s_gaspar', 'custosConfigSalvar', { tetoDias: 60, avisoDias: 10, tetoPorCategoria: [{ categoria: 'Equipamentos', dias: 30 }], responsaveis: ['u_fin'], motivo: 'Compras passa ao Financeiro' }));
  const x = rascunho(a);
  a.mudar('2026-10-30T10:00:00-03:00'); // venceu ontem; item em proposta aberta
  a.ctx.ComCu_rotinaAvisos_(null, true);
  assert.ok(av().some((x) => x.DESTINATARIO_ID === 'u_fin' && /cotação vencida/.test(x.TEXTO)));
  assert.ok(a.tabelas.ATV_ATIVIDADES.some((t) => /Atualizar custos vencidos/.test(t.TITULO)), 'atividade para o responsável');
  // teto por categoria vale para a cotação nova: 30 dias a partir da data
  ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot({ data: '2026-10-30', validade: '2027-06-30' }) }));
  assert.equal(prod(a, 'prod_frag').CUSTO_VALIDO_ATE, '2026-11-29');
  assert.ok(x.id);
});

// ------------------------------------------------------------------ 8. pedir a atualização do custo pela proposta
test('C8 "Pedir atualização do custo" na proposta: avisa quem mantém custos, cria a atividade ligada ao item e à proposta, registra no histórico e não repete no mesmo dia', () => {
  const a = amb();
  produto(a, { CUSTO: 9200 }); // sem cotação
  const x = rascunho(a);
  const r = ok(a.api('s_vera', 'custoPedirAtualizacao', { propostaId: x.id, produtoId: 'prod_frag' }));
  assert.match(r.message, /GASPAR GESTOR COMERCIAL TESTE/);
  const av = a.tabelas.COM_AVISOS.filter((v) => v.TIPO === 'CUSTO_PEDIDO');
  assert.equal(av.length, 1); assert.equal(av[0].REF_ID, 'prod_frag'); assert.match(av[0].TEXTO, /PROP-.*FRAG-01|FRAG-01.*PROP-/s);
  assert.ok(a.tabelas.ATV_ATIVIDADES.some((t) => /Atualizar o custo de FRAG-01/.test(t.TITULO)));
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === x.id && h.TIPO === 'CUSTO_PEDIDO'));
  assert.equal(ok(a.api('s_vera', 'custoPedirAtualizacao', { propostaId: x.id, produtoId: 'prod_frag' })).jaPedido, true);
  falha(a.api('s_vito', 'custoPedirAtualizacao', { propostaId: x.id, produtoId: 'prod_frag' }), /é de VERA/);
  // gravado o custo com a cotação, a proposta conclui pronta
  ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: cot() }));
  ok(a.api('s_vera', 'concluirProposta', { id: x.id }));
  assert.equal(prop(a, x.id).SITUACAO, 'PRONTA');
});

// ------------------------------------------------------------------ 9. preço sugerido e opções (ampliação)
test('C9 guia de preço: mínimo e sugerido por item (vendedor sem custo; gestão com custo e sobra), opções com o novo total, quem aprova e a alçada; "Ajustar para o mínimo" e "Usar preço sugerido" aplicam no rascunho', () => {
  const a = amb();
  comCustoValido(a, { PRECO: 18000 });
  const x = rascunho(a, '18.000,00'); // abaixo do mínimo de R$ 21.467
  const g = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta.guiaPrecos;
  const it = g.itens[0];
  assert.equal(it.faixa, 'ABAIXO_MIN'); assert.equal(it.minimoTxt, 'R$ 21.467,00'); assert.ok(it.sugerido > it.minimo, 'sugerido pela margem alvo'); assert.equal(it.custoTxt, undefined, 'vendedor não vê custo');
  assert.equal(g.resumo.sobraTxt, undefined, 'vendedor não vê o percentual da sobra');
  assert.equal(g.opcoes.minimo.itens, 1); assert.equal(g.opcoes.minimo.totalTxt, 'R$ 21.467,00'); assert.ok(g.opcoes.sugerido.total > g.opcoes.minimo.total);
  assert.equal(g.opcoes.autorizacao.precisa, true); assert.equal(g.opcoes.autorizacao.quem, 'a Diretoria'); assert.ok(g.opcoes.autorizacao.nomes.includes('DORA DIRETORA TESTE')); assert.match(g.opcoes.autorizacao.oQue.join(' '), /sobra/);
  assert.equal(g.desconto.alcadaTxt.length > 0, true); assert.equal(g.desconto.dentro, true);
  const gg = ok(a.api('s_gaspar', 'guiaPrecos', { id: x.id })).guia;
  assert.equal(gg.itens[0].custoTxt, 'R$ 9.200,00'); assert.ok(gg.resumo.sobraTxt && gg.resumo.minimaTxt);
  // ajustar ao mínimo: só o item abaixo; total novo; proposta passa sem a Diretoria
  const m = ok(a.api('s_vera', 'aplicarPrecos', { id: x.id, modo: 'MINIMO' }));
  assert.match(m.message, /Novo total: R\$ 21\.467,00 \(antes R\$ 18\.000,00\)/); assert.equal(m.politica.dentro, true);
  assert.equal(JSON.parse(prop(a, x.id).ITENS_JSON)[0].precoUnitario, 21467);
  // usar o sugerido: sobe até o sugerido; nunca desce
  const s = ok(a.api('s_vera', 'aplicarPrecos', { id: x.id, modo: 'SUGERIDO' }));
  assert.equal(JSON.parse(prop(a, x.id).ITENS_JSON)[0].precoUnitario, it.sugerido); assert.equal(s.guia.itens[0].faixa, 'OK');
  assert.match(ok(a.api('s_vera', 'aplicarPrecos', { id: x.id, modo: 'MINIMO' })).message, /Nenhum preço mudou/);
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === x.id && h.TIPO === 'PRECO_SUGERIDO'));
  ok(a.api('s_vera', 'concluirProposta', { id: x.id }));
  assert.equal(prop(a, x.id).SITUACAO, 'PRONTA');
  falha(a.api('s_vera', 'aplicarPrecos', { id: x.id, modo: 'SUGERIDO' }), /não está em rascunho/);
});

test('C10 guia: item sem custo não tem mínimo nem sugerido e oferece pedir o custo; desconto acima da alçada mostra o efeito e pede autorização do gestor', () => {
  const a = amb();
  produto(a); // sem custo
  const x = rascunho(a);
  const g = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta.guiaPrecos;
  assert.equal(g.itens[0].faixa, 'SEM_CUSTO'); assert.equal(g.itens[0].minimo, null); assert.equal(g.opcoes.custos[0].produtoId, 'prod_frag');
  const b = amb(); comCustoValido(b);
  const y = rascunho(b, '30.000,00');
  ok(b.api('s_vera', 'salvarProposta', { id: y.id, descontoGeral: '6.000,00', itens: [{ produtoId: 'prod_frag', descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: '30.000,00' }], deslocamento: SEM_VIAGEM, condicoes: COND_PRODUTO }));
  const gb = ok(b.api('s_vera', 'proposta', { id: y.id })).proposta.guiaPrecos;
  assert.equal(gb.desconto.dentro, false); assert.match(gb.desconto.descontoPctTxt, /20/); assert.ok(gb.desconto.efeito.length > 10);
  assert.equal(gb.opcoes.autorizacao.precisa, true);
});

// ------------------------------------------------------------------ 11. tela e ajuda
test('tela e ajuda: custo com cotação no cadastro, "Atualizar custo", painel "Custos a atualizar", selo do custo, guia de preço com as opções e ajuda atualizada', () => {
  const js = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  ['custosPainel', 'custoSalvar', 'custoItem', 'custoArquivo', 'custosConfigSalvar', 'custoPedirAtualizacao', 'aplicarPrecos', 'Custos a atualizar', 'Atualizar custo', 'Usar preço sugerido', 'Ajustar para o mínimo', 'Manter meu preço e pedir autorização', 'Pedir atualização do custo']
    .forEach((t) => assert.ok(js.includes(t), 'tela tem ' + t));
  const ajuda = fs.readFileSync(path.join(PASTA, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /cotação do fornecedor/); assert.match(ajuda, /Custos a atualizar/); assert.match(ajuda, /preço sugerido/i);
});
