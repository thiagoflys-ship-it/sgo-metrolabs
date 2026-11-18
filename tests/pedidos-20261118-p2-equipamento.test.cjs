// Pacote 2 de 18/11/2026, item 6 (Matheus, 17/11/2026 23:40): no orçamento de calibração e qualificação, vincular o equipamento é
// opcional (padrão; configurável pela Diretoria). O item leva a quantidade e o tipo de equipamento; o documento A4, o escopo e a
// passagem aos setores dizem que os equipamentos são identificados na execução; manutenção continua exigindo o equipamento.
// Código real (legado) num contexto isolado; só dados de teste.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/pedidos-20261118-p2-equipamento.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente: ambienteBase, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const EXTRAS = ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js'];
function ambiente(o) {
  const a = ambienteBase(Object.assign({ custoAvulso: 0.3 }, o || {}));
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  a.ctx.SGO_DATA.validarCadastroUnico_ = () => {};
  a.tabelas.HIST_CADASTROS = [];
  for (const f of EXTRAS) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  return a;
}
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar'); if (re) assert.match(r.message, re); return r; };
const COND = { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Conforme a faixa', garantia: '90 dias' };
const dados = (a, id) => ok(a.api('s_vera', 'proposta', { id })).proposta.dadosEmissao;
function completarCliente(a) {
  Object.assign(a.tabelas.CAD_CLIENTES.find((c) => c.ID === 'c1'), { CEP: '74000-000', LOGRADOURO: 'RUA DE TESTE', NUMERO: '100', BAIRRO: 'CENTRO', CIDADE: 'GOIÂNIA', UF: 'GO', CONTATO: 'CARLA COMPRAS TESTE', TELEFONE: '6233330000' });
}
/** Orçamento típico do pedido: 10 termômetros, 2 autoclaves (qualificação) e 1 manutenção, nada vinculado. */
function orcamento(a, itens) {
  const { oportunidade } = oportunidadeDeTeste(a);
  const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id, condicoes: COND, itens: itens || [
    { descricao: 'Calibração de termômetro digital', quantidade: 10, unidade: 'un.', precoUnitario: '180,00' },
    { descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00' },
    { descricao: 'Manutenção preventiva de autoclave', quantidade: 1, unidade: 'un.', precoUnitario: '1.200,00' }] }));
  return id;
}

test('padrão: calibração e qualificação sem equipamento não travam a emissão; manutenção continua exigindo; o aviso lista o que fica para a execução', () => {
  const a = ambiente();
  const id = orcamento(a);
  const de = dados(a, id);
  const ids = de.faltas.map((f) => f.id);
  assert.equal(de.equipamentoOpcional, true, 'padrão = opcional');
  assert.ok(!ids.includes('EQ.1') && !ids.includes('EQ.2'), 'calibração e qualificação não exigem o vínculo: ' + ids.join(','));
  assert.ok(!ids.includes('EQT.1') && !ids.includes('EQT.2'), 'o tipo sai da descrição');
  assert.ok(ids.includes('EQ.3'), 'manutenção continua exigindo o equipamento');
  assert.deepEqual(de.aIdentificar.map((x) => [x.item, x.tipo, x.precisa, x.tem]), [[1, 'termômetro digital', 10, 0], [2, 'autoclave a vapor', 2, 0]]);
  // o tipo: escrito no item vale; descrição sem tipo pede o tipo (o quê, por quê e o que fazer)
  assert.equal(a.ctx.ComDE_tipoEquip_({ descricao: 'Qualificação de instalação (QI) de termodesinfectora' }), 'termodesinfectora');
  assert.equal(a.ctx.ComDE_tipoEquip_({ descricao: 'Serviço de calibração RBC' }), '');
  assert.equal(a.ctx.ComDE_tipoEquip_({ descricao: 'Serviço de calibração RBC', tipoEquipamento: '  manômetro  analógico ' }), 'manômetro analógico');
  assert.equal(a.ctx.ComDE_calQual_({ tipo: 'SERVICO', descricao: 'Inspeção NR-13 de vaso de pressão' }), false, 'NR-13 não entra');
  assert.equal(a.ctx.ComDE_calQual_({ tipo: 'SERVICO', codigo: 'CAL-001', descricao: 'Termômetros' }), true, 'pelo código do catálogo');
});

test('tipo de equipamento: sem tipo na descrição a falta pede o tipo; escrito no item, o rascunho guarda e a falta some; não muda o preço', () => {
  const a = ambiente();
  const id = orcamento(a, [{ descricao: 'Serviço de calibração RBC', quantidade: 6, unidade: 'un.', precoUnitario: '150,00' }]);
  const f = dados(a, id).faltas.find((x) => x.id === 'EQT.1');
  assert.ok(f, 'pede o tipo');
  assert.match(f.oQue, /falta o tipo de equipamento/); assert.match(f.porque, /identificado na execução/); assert.match(f.comoResolver, /Tipo de equipamento/);
  const antes = a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).TOTAL;
  ok(a.api('s_vera', 'salvarProposta', { id, itens: [{ descricao: 'Serviço de calibração RBC', quantidade: 6, unidade: 'un.', precoUnitario: '150,00', tipoEquipamento: 'Manômetro analógico' }] }));
  const it = JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).ITENS_JSON).find((i) => !i.auto);
  assert.equal(it.tipoEquipamento, 'Manômetro analógico');
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).TOTAL, antes, 'o preço não depende do vínculo');
  assert.ok(!dados(a, id).faltas.some((x) => x.id === 'EQT.1'));
  // dois itens iguais do mesmo serviço para tipos diferentes não são "repetidos"
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-T', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '180,00', custo: '60,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'CAL-T').ID;
  ok(a.api('s_vera', 'salvarProposta', { id, itens: [{ produtoId: pid, descricao: 'Calibração de termômetro', quantidade: 4, precoUnitario: '180,00', tipoEquipamento: 'termômetro digital' }, { produtoId: pid, descricao: 'Calibração de termômetro', quantidade: 2, precoUnitario: '180,00', tipoEquipamento: 'termômetro de vidro' }] }));
  falha(a.api('s_vera', 'salvarProposta', { id, itens: [{ produtoId: pid, descricao: 'Calibração de termômetro', quantidade: 4, precoUnitario: '180,00' }, { produtoId: pid, descricao: 'Calibração de termômetro', quantidade: 2, precoUnitario: '180,00' }] }), /repete o item 1/);
});

test('emissão completa sem nenhum equipamento vinculado: escopo da especialista, documento A4 e passagem aos setores dizem "identificados na execução"', () => {
  const a = ambiente();
  completarCliente(a);
  const id = orcamento(a, [{ descricao: 'Calibração de termômetro digital', quantidade: 10, unidade: 'un.', precoUnitario: '180,00' }, { descricao: 'Qualificação térmica de autoclave a vapor', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00', tipoEquipamento: 'autoclave de 100 L' }]);
  Object.assign(a.tabelas.CAD_CONTATOS.find((c) => c.NOME === 'Ana Enfermeira Teste'), { CELULAR: '62988887777', NOME: 'Ana Enfermeira Teste' });
  const g = ok(a.api('s_vera', 'escopoGerar', { id }));
  assert.match(g.escopo, /10 unidades de termômetro digital, identificados na execução do serviço/);
  assert.match(g.escopo, /2 unidades de autoclave de 100 L/);
  ok(a.api('s_vera', 'escopoValidar', { id, texto: g.escopo, li: true }));
  assert.equal(dados(a, id).total, 0, JSON.stringify(dados(a, id).faltas.map((f) => f.oQue)));
  ok(a.api('s_vera', 'concluirProposta', { id }));
  const d = ok(a.api('s_vera', 'gerarDocumento', { id }));
  const html = a.arquivos[d.htmlId].bytes.toString('utf8');
  assert.match(html, /Tipo de equipamento: termômetro digital\. Os equipamentos são identificados \(marca, modelo, número de série e local\) na execução do serviço/);
  assert.match(html, /Tipo de equipamento: autoclave de 100 L/);
  // aceite e passagem: a Área técnica recebe o tipo e o que fica para a triagem
  ok(a.api('s_vera', 'marcarEnviada', { id, como: 'Entregue em mãos na reunião com a CME' }));
  ok(a.api('s_vera', 'respostaCliente', { id, resposta: 'APROVADA', texto: 'Aprovado pela coordenação', arquivo: { nome: 'pedido.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF pedido').toString('base64') } }));
  ok(a.api('s_vera', 'passarSetores', { id }));
  const tec = a.tabelas.ATV_ATIVIDADES.find((x) => /Pedido aprovado/.test(x.TITULO) && /cnica/.test(x.TITULO));
  assert.ok(tec, 'atividade da Área técnica');
  assert.match(tec.DESCRICAO, /Equipamentos: termômetro digital; 10 equipamentos a identificar na execução \(triagem do chamado e certificado\)/);
  // o chamado da Assistência leva o tipo (o campo "Ligar ao equipamento do cadastro" da triagem já existe para chamado sem equipamento)
  const ast = fs.readFileSync(path.join(PASTA, 'SGO_Assistencia_Chamados.js'), 'utf8');
  assert.match(ast, /equipamentos a identificar na triagem/);
  assert.match(fs.readFileSync(path.join(PASTA, 'JS_Assistencia.html'), 'utf8'), /Ligar ao equipamento do cadastro/);
});

test('vínculo parcial: 1 de 2 identificado; o outro fica para a execução; equipamento vinculado continua conferido', () => {
  const a = ambiente();
  const id = orcamento(a, [{ descricao: 'Qualificação térmica de autoclave', quantidade: 2, unidade: 'un.', precoUnitario: '4.500,00', equipamentoId: 'eq1' }]);
  const de = dados(a, id);
  assert.deepEqual(de.aIdentificar.map((x) => [x.precisa, x.tem, x.faltam]), [[2, 1, 1]]);
  assert.ok(!de.faltas.some((f) => /^EQ/.test(f.id)), 'nem a série do vinculado trava (fica para a execução)');
  // equipamento de outro cliente continua recusado ao salvar
  falha(a.api('s_vera', 'salvarProposta', { id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq9' }] }), /não é desta unidade do cliente/);
});

test('configurável: só Diretoria, Administrador ou dono voltam a exigir o vínculo (motivo, histórico); a Metodologia mostra a opção', () => {
  const a = ambiente();
  const id = orcamento(a);
  falha(a.api('s_vera', 'equipamentoOpcionalSalvar', { ligada: false, motivo: 'Teste de permissão da vendedora' }), /só|Diretoria/);
  falha(a.api('s_gaspar', 'equipamentoOpcionalSalvar', { ligada: false, motivo: 'Teste de permissão do gestor' }), /Diretoria/);
  falha(a.api('s_dora', 'equipamentoOpcionalSalvar', { ligada: false, motivo: 'curto' }), /motivo/);
  const r = ok(a.api('s_dora', 'equipamentoOpcionalSalvar', { ligada: false, motivo: 'Auditoria pediu equipamento identificado antes da emissão' }));
  assert.equal(r.equipamentoOpcional.ligada, false);
  assert.match(r.message, /obrigatório de novo/);
  const cfg = JSON.parse(a.props.COM_DADOS_EMISSAO_CFG);
  assert.equal(cfg.equipamentoOpcional, false); assert.equal(cfg.ligada, undefined, 'merge: não cria nem apaga a outra chave');
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'EQUIPAMENTO_OPCIONAL' && /Auditoria pediu/.test(h.TEXTO)));
  const ids = dados(a, id).faltas.map((f) => f.id);
  assert.ok(ids.includes('EQ.1') && ids.includes('EQ.2'), 'obrigatório de novo');
  const met = ok(a.api('s_vera', 'metodologia', {}));
  assert.equal(met.equipamentoOpcional.ligada, false); assert.equal(met.equipamentoOpcional.podeAlterar, false);
  assert.equal(ok(a.api('s_dora', 'metodologia', {})).equipamentoOpcional.podeAlterar, true);
  ok(a.api('s_dora', 'equipamentoOpcionalSalvar', { ligada: true, motivo: 'Volta ao padrão pedido pelo Matheus em 17/11' }));
  assert.ok(!dados(a, id).faltas.some((f) => f.id === 'EQ.1'));
  // a outra chave da propriedade (trava ligada/desligada) continua como estava
  a.props.COM_DADOS_EMISSAO_CFG = JSON.stringify({ ligada: false });
  ok(a.api('s_dora', 'equipamentoOpcionalSalvar', { ligada: true, motivo: 'Conferência do merge da propriedade' }));
  assert.equal(JSON.parse(a.props.COM_DADOS_EMISSAO_CFG).ligada, false);
});

test('proposta guiada: linha "sem vincular equipamentos" monta o item com a quantidade e o tipo', () => {
  const a = ambiente();
  for (const f of ['SGO_Comercial_Assistente.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-001', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '180,00', custo: '60,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'CAL-001').ID;
  const ct = ok(a.api('s_vera', 'salvarContato', { clienteId: 'c1', unidadeId: 'un1', nome: 'Ana Enfermeira Teste', cargo: 'Coordenadora', papel: 'TECNICO', email: 'ana@alfa.exemplo.test', celular: '62988887777' })).contato;
  const r = ok(a.api('s_vera', 'guiaMontar', { clienteId: 'c1', unidadeId: 'un1', contatoTecnicoId: ct.id, origem: 'Indicação', titulo: 'Calibração dos termômetros da CME',
    itens: [{ produtoId: pid, equipamentos: [], quantidade: 12, tipoEquipamento: 'termômetro digital espeto', servico: { tipo: 'CALIBRACAO', ciclos: [], carga: 'NSA' } }] }));
  const it = JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === r.propostaId).ITENS_JSON).find((i) => !i.auto);
  assert.equal(it.quantidade, 12); assert.equal(it.tipoEquipamento, 'termômetro digital espeto'); assert.equal((it.equipamentos || []).length, 0);
});
