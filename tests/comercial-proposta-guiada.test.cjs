// Proposta guiada (etapa 2 dos dados completos, 11/11/2026): cliente pelo CNPJ (consulta e duplicados) -> unidade de execução ->
// responsáveis (técnico, financeiro, intermediário) e contatos repetidos (juntar) -> equipamentos no cadastro único (série a confirmar)
// -> leitura da plaqueta e do e-mail colado (IA simulada e sem chave) -> serviço oficial e insumos sugeridos -> serviço pedido ao
// cadastro (a proposta espera) -> proposta montada; ligações no cliente e na unidade. Código real; só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente: ambienteBase } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const TEM = fs.existsSync(path.join(PASTA, 'SGO_Comercial_Assistente.js'));
const EXTRAS = ['SGO_Vinculos.js', 'SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Equipamentos.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js', 'SGO_Comercial_Assistente.js'];
const PRODUTOS = [
  { ID: 'p1', CODIGO: 'QUA-001', NOME: 'Autoclave hospitalar a vapor — Pacote completo (QI, QO e QD)', TIPO: 'SERVICO', CATEGORIA: 'Qualificação', PRECO: 4870, CUSTO: 1500, UNIDADE_MEDIDA: 'equip.', ATIVO: 'SIM' },
  { ID: 'p2', CODIGO: 'QUA-001-QD', NOME: 'Autoclave hospitalar a vapor — Qualificação de Desempenho (QD)', TIPO: 'SERVICO', CATEGORIA: 'Qualificação', PRECO: 2500, CUSTO: 800, UNIDADE_MEDIDA: 'equip.', ATIVO: 'SIM' },
  { ID: 'p3', CODIGO: 'NR13-003', NOME: 'Inspeção NR-13 de autoclave com ensaios e ART', TIPO: 'SERVICO', CATEGORIA: 'NR-13', PRECO: 2933.33, CUSTO: 900, UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' },
  { ID: 'p4', CODIGO: 'INS-BD', NOME: 'Pacote de teste de Bowie-Dick', TIPO: 'PRODUTO', CATEGORIA: 'Insumos', PRECO: 45, CUSTO: 20, UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' },
  { ID: 'p5', CODIGO: 'INS-IB', NOME: 'Indicador biológico de leitura rápida', TIPO: 'PRODUTO', CATEGORIA: 'Insumos', PRECO: 30, CUSTO: 12, UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' }
];

function ambiente(o) {
  const a = ambienteBase(Object.assign({ custoAvulso: 0.3, tabelas: { COM_PRODUTOS: PRODUTOS.map((p) => Object.assign({}, p)) } }, o || {}));
  const D = a.ctx.SGO_DATA;
  D.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  D.validarCadastroUnico_ = () => {}; D.normalizarObjetoParaSheet = (t, r) => r; D.gerarRegistroBase = (r) => Object.assign({ ID: 'eqn' + Math.random().toString(36).slice(2, 8), CRIADO_EM: new a.ctx.Date().toISOString() }, r);
  a.ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true, hasLock: () => true }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true, hasLock: () => true }) };
  a.tabelas.HIST_CADASTROS = []; a.tabelas.CAD_CONTATOS = a.tabelas.CAD_CONTATOS || [];
  for (const f of EXTRAS) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  // consulta de CNPJ das bases públicas, simulada (nenhuma chamada sai)
  a.ctx.SGO_CNPJ_consultarDados_ = (c) => { if (String(c).replace(/\D/g, '') === '11444777000161') return { cnpj: '11444777000161', razao_social: 'Hospital Teste Alfa Ltda', nome_fantasia: 'Alfa Angra', descricao_tipo_de_logradouro: 'Rua', logradouro: 'do Porto', numero: '50', bairro: 'Centro', municipio: 'Angra dos Reis', uf: 'RJ', cep: '23900000', ddd_telefone_1: '2433330000', email: '', descricao_situacao_cadastral: 'ATIVA', _fonte: 'teste' }; throw new Error('CNPJ não encontrado. Confira o número ou preencha manualmente.'); };
  return a;
}
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar'); if (re) assert.match(r.message, re); return r; };
const CLIENTE_NOVO = { CNPJ: '11444777000161', RAZAO_SOCIAL: 'HOSPITAL MUNICIPAL DE ANGRA TESTE', NOME_FANTASIA: 'Hospital de Angra Teste', CEP: '23900-000', LOGRADOURO: 'RUA DO PORTO', NUMERO: '50', BAIRRO: 'CENTRO', CIDADE: 'ANGRA DOS REIS', UF: 'RJ', CONTATO: 'MARINA SOUZA TESTE', EMAIL: 'financeiro@angra.exemplo.test', TELEFONE: '2433330000' };

test('cliente pelo CNPJ: existente mostra o que falta e as propostas; novo vem da consulta, aponta duplicado e só cadastra completo com "Ciente"', { skip: !TEM }, () => {
  const a = ambiente();
  const r = ok(a.api('s_vera', 'guiaCliente', { cnpj: '11.222.333/0001-81' }));
  assert.equal(r.existe, true); assert.equal(r.cliente.id, 'c1'); assert.ok(r.cliente.faltam.some((f) => f.campo === 'CEP'));
  falha(a.api('s_vera', 'guiaCliente', { cnpj: '11.222.333/0001-00' }), /dígitos verificadores/);
  const n = ok(a.api('s_vera', 'guiaCliente', { cnpj: '11.444.777/0001-61' }));
  assert.equal(n.existe, false); assert.equal(n.sugestao.CIDADE, 'ANGRA DOS REIS'); assert.equal(n.sugestao.UF, 'RJ');
  assert.ok(n.duplicados.some((x) => x.id === 'c1'), 'nome muito parecido com o Hospital Teste Alfa');
  falha(a.api('s_vera', 'guiaSalvarCliente', { dados: CLIENTE_NOVO }), /Ciente/);
  falha(a.api('s_vera', 'guiaSalvarCliente', { dados: Object.assign({}, CLIENTE_NOVO, { EMAIL: '' }), ciente: true }), /precisa estar completo/);
  const s = ok(a.api('s_vera', 'guiaSalvarCliente', { dados: CLIENTE_NOVO, ciente: true }));
  assert.equal(s.cliente.completo, true);
  assert.ok(a.tabelas.HIST_CADASTROS.some((h) => h.ENTIDADE === 'CLIENTE' && /proposta guiada/.test(h.ORIGEM)));
  assert.equal(ok(a.api('s_vera', 'guiaCliente', { busca: 'angra' })).lista.length, 1);
});

test('unidade de execução e responsáveis: técnico com nome completo, cargo, e-mail e telefone; financeiro com e-mail', { skip: !TEM }, () => {
  const a = ambiente();
  falha(a.api('s_vera', 'guiaSalvarUnidade', { clienteId: 'c1', dados: { NOME_UNIDADE: 'Hospital de Angra' }, ciente: true }), /cidade/i);
  const u = ok(a.api('s_vera', 'guiaSalvarUnidade', { clienteId: 'c1', dados: { NOME_UNIDADE: 'Hospital de Angra', CIDADE: 'Angra dos Reis', UF: 'RJ', ENDERECO: 'Rua do Porto, 50' }, ciente: true }));
  const uid = u.unidades.find((x) => x.nome === 'HOSPITAL DE ANGRA' || /Angra/i.test(x.nome)).id;
  falha(a.api('s_vera', 'guiaSalvarContato', { clienteId: 'c1', unidadeId: uid, papel: 'TECNICO', nome: 'Marina', email: 'marina@angra.exemplo.test', telefone: '24999990000' }), /nome completo.*cargo/);
  const t = ok(a.api('s_vera', 'guiaSalvarContato', { clienteId: 'c1', unidadeId: uid, papel: 'TECNICO', nome: 'Marina Souza Teste', cargo: 'Engenheira clínica', email: 'marina@angra.exemplo.test', telefone: '(24) 99999-0000' }));
  assert.equal(a.tabelas.CAD_CONTATOS.find((c) => c.ID === t.contato.id).PAPEL, 'TECNICO');
  falha(a.api('s_vera', 'guiaSalvarContato', { clienteId: 'c1', papel: 'FINANCEIRO', nome: 'Setor Financeiro' }), /e-mail para nota/);
  const g = ok(a.api('s_vera', 'guiaUnidade', { clienteId: 'c1', unidadeId: uid }));
  assert.ok(g.contatos.some((c) => c.completoTecnico && c.papel === 'TECNICO'));
});

test('contatos repetidos (caso RIO MED: BRUNO com e sem e-mail): aparecem no passo; só a gestão junta; propostas passam para o que fica', { skip: !TEM }, () => {
  const a = ambiente();
  a.tabelas.CAD_CONTATOS.push({ ID: 'b1', CLIENTE_ID: 'c1', NOME: 'BRUNO', EMAIL: '', STATUS: 'ATIVO', PAPEL: 'INTERMEDIARIO' }, { ID: 'b2', CLIENTE_ID: 'c1', NOME: 'BRUNO SILVA', EMAIL: 'bruno@exemplo.test', TELEFONE: '2133330000', STATUS: 'ATIVO' });
  a.tabelas.COM_PROPOSTAS = [{ ID: 'px', NUMERO: 'PROP-2026-0099', REVISAO: 0, CLIENTE_ID: 'c1', CONTATO_ID: 'b1', CONTATO_NOME: 'BRUNO', SITUACAO: 'RASCUNHO', ITENS_JSON: '[]', RESPONSAVEL_ID: 'u_ven' }];
  const g = ok(a.api('s_vera', 'guiaUnidade', { clienteId: 'c1', unidadeId: 'un1' }));
  assert.ok(g.repetidos.some((r) => r.contatos.some((c) => c.id === 'b1') && r.contatos.some((c) => c.id === 'b2')));
  assert.equal(g.podeJuntar, false);
  falha(a.api('s_vera', 'guiaJuntarContatos', { ficaId: 'b2', saiId: 'b1' }), /gestão comercial/);
  ok(a.api('s_vera', 'guiaPedirJuncao', { clienteId: 'c1', ids: ['b1', 'b2'], motivo: 'O mesmo Bruno' }));
  assert.ok(a.tabelas.COM_AVISOS.some((x) => x.TIPO === 'CONTATO_REPETIDO'));
  const j = ok(a.api('s_gaspar', 'guiaJuntarContatos', { ficaId: 'b2', saiId: 'b1' }));
  assert.match(j.message, /1 propostas/);
  const b1 = a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'b1'), b2 = a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'b2');
  assert.equal(b1.STATUS, 'INATIVO'); assert.equal(b1.JUNTADO_COM_ID, 'b2'); assert.equal(b2.PAPEL, 'INTERMEDIARIO', 'campo vazio do que fica recebe o do que sai');
  assert.equal(a.tabelas.COM_PROPOSTAS[0].CONTATO_ID, 'b2');
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'JUNTADO'));
});

test('equipamentos no cadastro único: sem série entra "série a confirmar"; mesma série não duplica; capacidade obrigatória onde se aplica', { skip: !TEM }, () => {
  const a = ambiente();
  falha(a.api('s_vera', 'guiaSalvarEquipamento', { clienteId: 'c1', unidadeId: 'un1', dados: { TIPO: 'Autoclave a vapor', FABRICANTE: 'Marca A', MODELO: 'AV-100' } }), /capacidade/);
  const e1 = ok(a.api('s_vera', 'guiaSalvarEquipamento', { clienteId: 'c1', unidadeId: 'un1', dados: { TIPO: 'Autoclave a vapor', FABRICANTE: 'Marca A', MODELO: 'AV-100', CAPACIDADE: '100 L', SETOR: 'CME' } }));
  const reg = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === e1.equipamentoId);
  assert.equal(reg.SERIE_A_CONFIRMAR, 'SIM'); assert.equal(reg.ORIGEM, 'COMERCIAL'); assert.match(e1.message, /série a confirmar/);
  const e2 = ok(a.api('s_vera', 'guiaSalvarEquipamento', { clienteId: 'c1', unidadeId: 'un1', dados: { TIPO: 'Autoclave', FABRICANTE: 'X', MODELO: 'M1', SERIE: 's1' } }));
  assert.equal(e2.equipamentoId, 'eq1'); assert.equal(e2.jaExistia, true);
  // completar: só campos em branco; a série tira a marca "a confirmar"
  ok(a.api('s_vera', 'guiaSalvarEquipamento', { clienteId: 'c1', unidadeId: 'un1', id: e1.equipamentoId, dados: { TIPO: 'Outro', FABRICANTE: 'Outra', MODELO: 'Outro', SERIE: 'S-777' } }));
  assert.equal(reg.SERIE, 'S-777'); assert.equal(reg.SERIE_A_CONFIRMAR, ''); assert.equal(reg.MODELO, 'AV-100');
});

test('IA: plaqueta e e-mail colado (sem chave: regras; com IA simulada: só o que está no texto; nada é gravado sozinho)', { skip: !TEM }, () => {
  const a = ambiente();
  const sem = ok(a.api('s_vera', 'guiaLerPlaqueta', { arquivo: { tipo: 'image/png', base64: Buffer.from('foto').toString('base64') } }));
  assert.equal(sem.disponivel, false); assert.match(sem.message, /Chaves e senhas/);
  const email = 'Bom dia! Somos o Hospital Municipal de Angra (CNPJ 11.444.777/0001-61). Precisamos qualificar 2 autoclaves Marca A modelo AV-100 de 100 L.\nContato: Marina Souza, engenheira clínica, marina@angra.exemplo.test, (24) 99999-0000.';
  const t0 = ok(a.api('s_vera', 'guiaLerTexto', { texto: email }));
  assert.equal(t0.regras.cnpj, '11444777000161'); assert.deepEqual(t0.regras.emails, ['marina@angra.exemplo.test']); assert.ok(t0.regras.telefones.includes('24999990000')); assert.equal(t0.ia, null);
  const b = ambiente({ ia: (prompt) => /plaqueta/.test(prompt) ? JSON.stringify({ tipo: 'Autoclave a vapor', marca: 'Marca A', modelo: 'AV-100', serie: 'S-123', capacidade: '100 L', anoFabricacao: '2019', legivel: true })
    : JSON.stringify({ razaoSocial: 'Hospital Municipal de Angra', cnpj: '11.444.777/0001-61', contatos: [{ nome: 'Marina Souza', cargo: 'engenheira clínica', email: 'marina@angra.exemplo.test', telefone: '(24) 99999-0000' }, { nome: 'Inventado Pela IA', email: 'falso@x.com' }],
      equipamentos: [{ tipo: 'autoclaves', marca: 'Marca A', modelo: 'AV-100', serie: 'S-999', capacidade: '100 L', quantidade: 2 }], servicos: ['qualificar'] }) });
  const pl = ok(b.api('s_vera', 'guiaLerPlaqueta', { arquivo: { tipo: 'image/jpeg', base64: Buffer.from('foto').toString('base64') } }));
  assert.equal(pl.leitura.SERIE, 'S-123'); assert.equal(pl.leitura.ANO_FABRICACAO, '2019'); assert.match(pl.message, /confira cada campo/);
  assert.equal(b.tabelas.CAD_EQUIPAMENTOS.length, 2, 'a leitura não cadastra nada');
  const t1 = ok(b.api('s_vera', 'guiaLerTexto', { texto: email }));
  assert.equal(t1.ia.contatos.length, 1, 'contato que não está no texto é descartado'); assert.equal(t1.ia.contatos[0].papel, 'TECNICO');
  assert.equal(t1.ia.equipamentos[0].serie, '', 'série inventada descartada'); assert.equal(t1.ia.equipamentos[0].quantidade, 2);
});

test('serviço oficial e insumos sugeridos pelo catálogo; sem serviço no catálogo: pedido de cadastro e a proposta espera a gestão', { skip: !TEM }, () => {
  const a = ambiente();
  const s = ok(a.api('s_vera', 'guiaSugerir', { pedidos: [
    { chave: 'a', equipamento: { tipo: 'Autoclave a vapor', capacidade: '100 L' }, servico: 'QUALIFICACAO', ciclos: ['134 °C instrumental', 'Bowie-Dick'], carga: 'COM_E_SEM' },
    { chave: 'b', equipamento: { tipo: 'Autoclave a vapor', capacidade: '100 L' }, servico: 'QD' },
    { chave: 'c', equipamento: { tipo: 'Autoclave a vapor', capacidade: '50 L' }, servico: 'NR13' },
    { chave: 'd', equipamento: { tipo: 'Termodesinfectora' }, servico: 'QUALIFICACAO' }] }));
  const por = Object.fromEntries(s.sugestoes.map((x) => [x.chave, x]));
  assert.equal(por.a.sugerido.codigo, 'QUA-001'); assert.deepEqual(por.a.insumos.map((i) => i.produto.codigo).sort(), ['INS-BD', 'INS-IB']);
  assert.equal(por.b.sugerido.codigo, 'QUA-001-QD');
  assert.equal(por.c.sugerido, null, 'NR13-002 (até 75 L) não está no catálogo do teste'); assert.match(por.c.porque, /peça o cadastro/);
  assert.equal(por.d.sugerido, null);
  falha(a.api('s_vera', 'guiaPedirServico', { codigo: 'QUA-TD', nome: 'Termodesinfectora teste', descricao: 'curta', preco: '4.000,00' }), /pelo menos 30 letras/);
  const ps = ok(a.api('s_vera', 'guiaPedirServico', { codigo: 'QUA-TD-NOVA', nome: 'Qualificação de termodesinfectora de túnel', descricao: 'Qualificação de instalação, operação e desempenho da termodesinfectora de túnel, com os ciclos de 90 °C.', preco: '4.000,00' }));
  assert.equal(ps.produto.pendente, true);
  assert.ok(a.tabelas.COM_AVISOS.length || a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'QUA-TD-NOVA').PRECO_PEDIDO_SITUACAO === 'PENDENTE');
});

test('montar a proposta: oportunidade e proposta com os equipamentos ligados, o serviço pedido, o técnico no A/C e o intermediário; escopo com os ciclos', { skip: !TEM }, () => {
  const a = ambiente();
  a.tabelas.CAD_CONTATOS.push({ ID: 'tec1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', NOME: 'Marina Souza Teste', CARGO: 'Engenheira clínica', PAPEL: 'TECNICO', EMAIL: 'marina@alfa.exemplo.test', CELULAR: '62999990000', STATUS: 'ATIVO' },
    { ID: 'int1', CLIENTE_ID: 'c1', NOME: 'Bruno Indicador', PAPEL: 'INTERMEDIARIO', EMAIL: 'b@x.test', STATUS: 'ATIVO' });
  a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', FABRICANTE: 'FAB', MODELO: 'M2', SERIE: 'S2', SETOR: 'CME', CAPACIDADE: '100 L', STATUS: 'ATIVO' });
  falha(a.api('s_vera', 'guiaMontar', { clienteId: 'c1', unidadeId: 'un1', contatoTecnicoId: 'int1', itens: [{ produtoId: 'p1', equipamentos: ['eq1'] }] }), /intermediário e não recebe/);
  const ps = ok(a.api('s_vera', 'guiaPedirServico', { codigo: 'SRV-NOVO', nome: 'Validação de seladora térmica teste', descricao: 'Validação da seladora térmica com ensaio de resistência da selagem e relatório por equipamento.', preco: '900,00' }));
  const m = ok(a.api('s_vera', 'guiaMontar', { clienteId: 'c1', unidadeId: 'un1', contatoTecnicoId: 'tec1', titulo: 'Qualificação das autoclaves da CME', origem: 'Indicação',
    intermediario: { nome: 'Bruno Indicador', contatoId: 'int1', comissao: '', motivo: 'Indicou o hospital e pede comissão' },
    itens: [{ produtoId: 'p2', equipamentos: ['eq1', 'eq2'], servico: { tipo: 'QD', ciclos: ['134 °C instrumental', 'Bowie-Dick'], carga: 'COM_E_SEM' } }, { produtoId: ps.produto.id, equipamentos: ['eq2'] }],
    insumos: [{ produtoId: 'p4', quantidade: 2 }] }));
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === m.propostaId);
  const itens = JSON.parse(p.ITENS_JSON);
  assert.equal(p.CONTATO_ID, 'tec1'); assert.equal(p.UNIDADE_ID, 'un1');
  assert.equal(itens[0].quantidade, 2); assert.deepEqual(itens[0].equipamentos.map((e) => e.equipamentoId), ['eq1', 'eq2']); assert.deepEqual(itens[0].servico.ciclos, ['134 °C instrumental', 'Bowie-Dick']);
  assert.equal(itens[2].tipo, 'PRODUTO'); assert.equal(itens[2].quantidade, 2);
  assert.equal(JSON.parse(p.INTERMEDIARIO_JSON).nome, 'Bruno Indicador');
  const o = a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === m.oportunidadeId);
  assert.equal(o.CONTATO_ID, 'tec1'); assert.match(o.EQUIPAMENTOS_IDS, /eq1/);
  const f = ok(a.api('s_vera', 'proposta', { id: m.propostaId })).proposta.dadosEmissao.faltas.map((x) => x.id);
  assert.ok(f.some((x) => /^SRV\.PENDENTE/.test(x)), 'serviço pedido ao cadastro: a proposta espera a gestão');
  assert.ok(f.includes('INT.APROVACAO'));
  // o escopo leva o serviço pedido (QD, ciclos e carga)
  Object.assign(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === 'eq1'), { CAPACIDADE: '100 L' });
  const g = ok(a.api('s_vera', 'escopoGerar', { id: m.propostaId }));
  assert.match(g.escopo, /Serviço contratado: Qualificação de desempenho \(QD\); ciclos ou programas: 134 °C instrumental, Bowie-Dick; com e sem carga/);
  // ligações: o cliente e a unidade mostram a proposta e os serviços
  const lig = ok(a.api('s_vera', 'doCliente', { clienteId: 'c1', unidadeId: 'un1' })).ligacoes;
  assert.ok(lig.some((x) => x.id === m.propostaId && x.servicos.some((s) => /Desempenho/.test(s))));
});

test('equipamento informado sem série na conferência entra no cadastro como "série a confirmar"', { skip: !TEM }, () => {
  const a = ambiente();
  const { oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');
  const { oportunidade } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, itens: [{ descricao: 'Qualificação de termodesinfectora', quantidade: 1, unidade: 'un.', precoUnitario: '3.800,00' }] }));
  ok(a.api('s_vera', 'dadosPreencher', { id: np.proposta.id, ciente: true, valores: { 'EQ.1.1.TIPO': 'Termodesinfectora', 'EQ.1.1.MARCA': 'Marca B', 'EQ.1.1.MODELO': 'TD-1', 'EQ.1.1.CAPACIDADE': '200 L', 'EQ.1.1.SETOR': 'CME' } }));
  const novo = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.MODELO === 'TD-1');
  assert.ok(novo); assert.equal(novo.SERIE_A_CONFIRMAR, 'SIM');
  const f = ok(a.api('s_vera', 'proposta', { id: np.proposta.id })).proposta.dadosEmissao.faltas;
  assert.ok(f.some((x) => x.id === 'EQC.' + novo.ID && x.campos.includes('EQC.' + novo.ID + '.SERIE')), 'a emissão continua pedindo a série');
});
