// Regras do Financeiro configuráveis (16/11/2026, pedido do dono: "deixa tudo organizado de forma que possa ser configurado").
// Código REAL (Chaves e senhas, sigilo, caixas, SGO_Omie*.js, SGO_Omie_Regras.js) com o OMIE SIMULADO de
// tests/_financeiro_simulado.cjs (nada sai para a rede). Para cada configuração: o padrão, cada opção e o valor inválido recusado;
// alçadas com aprovação por outra pessoa e recusa da autoaprovação; e a aba "Regras do Financeiro" a 390 e 320 px.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/financeiro-config-20261116.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('./_financeiro_simulado.cjs');
const { montar, nfe, abrasf, fornecedorNoOmie, FORN, PREST, fmt, PASTA } = S;
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_DEV || path.join(__dirname, '../output/financeiro-20261116/capturas-dev');
const item = (a, k) => a.ctx.CHV_ITENS.find((i) => i.chave === k);
const valida = (a, k, v) => a.ctx.Chaves_validarValor_(item(a, k), v);
const prestadorNoOmie = (a) => a.clientes.push({ codigo_cliente_omie: 60, razao_social: 'SERVICOS FICTICIOS LTDA', cnpj_cpf: fmt(PREST), inativo: 'N', tags: [{ tag: 'Fornecedor' }] });

test('Chaves e senhas: as cinco configurações novas, com ajuda, opções fechadas e valor inválido recusado', () => {
  const a = montar();
  assert.ok(a.ctx.CHV_GRUPOS.includes('Regras do Financeiro') && a.ctx.CHV_GRUPOS.includes('Conduta'));
  for (const k of ['OMIE_NFE_COMPRA_DESTINO', 'OMIE_NFSE_RETENCOES', 'OMIE_ALCADA_SEGUNDA_CONFIRMACAO', 'OMIE_ALCADA_APROVACAO']) { const i = item(a, k); assert.ok(i, k); assert.equal(i.grupo, 'Regras do Financeiro'); assert.equal(i.tipo, 'aberto'); assert.ok(i.ajuda.length > 80, k + ' com ajuda'); }
  assert.equal(item(a, 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU').grupo, 'Conduta');
  assert.match(item(a, 'OMIE_NFSE_RETENCOES').ajuda, /a confirmar na primeira operação acompanhada/);
  assert.equal(JSON.stringify(item(a, 'OMIE_NFE_COMPRA_DESTINO').opcoes.map((o) => o[0])), JSON.stringify(['FINANCEIRO', 'FINANCEIRO_FISCAL']));
  assert.match(item(a, 'OMIE_NFE_COMPRA_DESTINO').opcoes[1][1], /Financeiro e fiscal — combinar com o contador/);
  assert.equal(valida(a, 'OMIE_NFE_COMPRA_DESTINO', 'financeiro_fiscal'), 'FINANCEIRO_FISCAL');
  assert.throws(() => valida(a, 'OMIE_NFE_COMPRA_DESTINO', 'FISCAL'), /escolha uma das opções/);
  assert.equal(valida(a, 'OMIE_NFSE_RETENCOES', 'CAMPOS_OMIE'), 'CAMPOS_OMIE');
  assert.throws(() => valida(a, 'OMIE_NFSE_RETENCOES', 'BRUTO'), /escolha uma das opções/);
  assert.equal(valida(a, 'OMIE_ALCADA_SEGUNDA_CONFIRMACAO', 'R$ 10.000,50'), '10000.50');
  assert.equal(valida(a, 'OMIE_ALCADA_APROVACAO', '50000'), '50000.00');
  for (const v of ['abc', '0', '-5', '12,3,4', '10,123']) assert.throws(() => valida(a, 'OMIE_ALCADA_APROVACAO', v), /valor em reais/, v);
  assert.equal(valida(a, 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU', 'sim'), 'SIM');
  assert.equal(valida(a, 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU', 'NÃO'), 'NAO');
  assert.throws(() => valida(a, 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU', 'talvez'), /escolha uma das opções/);
  // nada pré-preenchido; o código da Conduta lê exatamente esta chave
  for (const k of ['OMIE_NFE_COMPRA_DESTINO', 'OMIE_NFSE_RETENCOES', 'OMIE_ALCADA_SEGUNDA_CONFIRMACAO', 'OMIE_ALCADA_APROVACAO', 'CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU']) assert.equal(a.props[k], undefined, k + ' sem valor');
  assert.match(fs.readFileSync(path.join(PASTA, 'SGO_Conduta_Ocorrencias.js'), 'utf8'), /getProperty\('CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU'\)[\s\S]{0,80}=== 'SIM'/);
  // padrões seguros
  const r = JSON.parse(vm.runInContext('JSON.stringify([OmieRegras_destinoNfe_(), OmieRegras_retencoes_(), JSON.stringify(OmieRegras_alcadas_())])', a.ctx));
  assert.deepEqual(r, ['FINANCEIRO', 'OBSERVACAO', '{"segunda":0,"aprovacao":0}']);
  a.props.OMIE_NFE_COMPRA_DESTINO = 'qualquer'; a.props.OMIE_NFSE_RETENCOES = 'x'; a.props.OMIE_ALCADA_APROVACAO = 'abc';
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify([OmieRegras_destinoNfe_(), OmieRegras_retencoes_(), OmieRegras_alcadas_().aprovacao])', a.ctx)), ['FINANCEIRO', 'OBSERVACAO', 0], 'valor estranho gravado vale o padrão');
});

test('NF-e de compra: padrão só financeiro; "Financeiro e fiscal" avisa na tela e continua lançando só no financeiro', () => {
  const a = montar(); fornecedorNoOmie(a);
  let l = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.equal(l.ok, true, l.mensagem); assert.equal(l.destinoFiscal, false); assert.ok(!l.alertas.some((x) => /Financeiro e fiscal/.test(x)));
  a.props.OMIE_NFE_COMPRA_DESTINO = 'FINANCEIRO_FISCAL';
  l = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.equal(l.destinoFiscal, true); assert.match(l.alertas[0], /"Financeiro e fiscal"[\s\S]*ainda não existe no SGO\+[\s\S]*só no financeiro/);
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(p.ok, true, p.mensagem); assert.match(p.alertas[0], /só no financeiro/);
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() }).ok, true);
  assert.deepEqual([...new Set(a.escritas().map((e) => e.call))], ['IncluirContaPagar'], 'nenhuma chamada fiscal inventada');
  // NFS-e não recebe o aviso da NF-e
  prestadorNoOmie(a);
  assert.equal(a.f('OmieNota_apiLer', 'wanessa', { xml: abrasf(), tipo: 'nfse' }).destinoFiscal, false);
});

test('NFS-e: padrão título pelo líquido; "campos do Omie" leva o valor do serviço e cada retenção no campo próprio', () => {
  const a = montar(); prestadorNoOmie(a);
  let p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: abrasf(), tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-05' });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos[0].valor, 1837);
  assert.ok(p.resumo.some((l) => l[0] === 'Retenções' && /observação do título/.test(l[1])));
  a.props.OMIE_NFSE_RETENCOES = 'CAMPOS_OMIE';
  const l = a.f('OmieNota_apiLer', 'wanessa', { xml: abrasf(), tipo: 'nfse' }); assert.equal(l.retencaoNosCampos, true);
  p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: abrasf(), tipo: 'nfse', categoria: '2.10', contaId: 5, vencimento: '2026-12-05' });
  assert.equal(p.ok, true, p.mensagem); assert.equal(p.titulos[0].valor, 2000);
  assert.ok(p.resumo.some((x) => x[0] === 'Retenções' && /campos de impostos retidos do Omie[\s\S]*a confirmar na primeira operação acompanhada/.test(x[1])));
  assert.ok(p.resumo.some((x) => x[0] === 'Valor do título no Omie' && /R\$ 2\.000,00[\s\S]*líquido: R\$ 1\.837,00/.test(x[1])));
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: abrasf() }); assert.equal(c.ok, true, c.mensagem);
  const env = a.escritas().at(-1).param;
  assert.equal(env.valor_documento, 2000);
  assert.deepEqual([env.retem_ir, env.valor_ir, env.retem_pis, env.valor_pis, env.retem_cofins, env.valor_cofins, env.retem_csll, env.valor_csll, env.retem_iss, env.valor_iss], ['S', 30, 'S', 13, 'S', 60, 'S', 20, 'S', 40]);
  assert.equal(env.retem_inss, undefined, 'retenção zerada não vai');
  assert.match(env.observacao, /retenções também nos campos de impostos retidos do Omie/);
});

test('De-para de categorias: vazio = escolha em cada lançamento; gravação com motivo, conferida no Omie, histórico; regra do CNPJ antes da geral', () => {
  const a = montar(); fornecedorNoOmie(a); prestadorNoOmie(a);
  let t = a.f('OmieRegras_apiTela', 'wanessa', {}); assert.equal(t.ok, true, t.mensagem); assert.deepEqual(t.depara, []); assert.equal(t.podeEditar, true);
  assert.equal(a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' }).categoriaSugerida, '', 'sem regra e sem histórico: nada sugerido');
  const regras = [{ tipo: 'NFE_COMPRA', categoria: '2.03' }, { tipo: 'NFE_COMPRA', cnpj: fmt(FORN), categoria: '2.10' }, { tipo: 'RECEBER_PROPOSTA', categoria: '1.01' }];
  let r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras, motivo: 'curto' }); assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 10 letras/);
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [{ tipo: 'QUALQUER', categoria: '2.03' }], motivo: 'Combinado com o contador' }); assert.equal(r.ok, false); assert.match(r.mensagem, /tipo de lançamento inválido/);
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [{ tipo: 'NFE_COMPRA', categoria: '1.01' }], motivo: 'Combinado com o contador' }); assert.equal(r.ok, false); assert.match(r.mensagem, /precisa ser ativa e de despesa/);
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [{ tipo: 'NFSE', categoria: '7.77' }], motivo: 'Combinado com o contador' }); assert.equal(r.ok, false); assert.match(r.mensagem, /não existe no Omie/);
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [regras[0], regras[0]], motivo: 'Combinado com o contador' }); assert.equal(r.ok, false); assert.match(r.mensagem, /Deixe uma só/);
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [{ tipo: 'NFSE', cnpj: '11111111111111', categoria: '2.10' }], motivo: 'Combinado com o contador' }); assert.equal(r.ok, false); assert.match(r.mensagem, /não confere/);
  assert.equal(a.props.OMIE_CATEGORIAS_DEPARA, undefined, 'nada gravado nas recusas');
  assert.equal(a.f('OmieRegras_apiSalvarDepara', 'tiago', { regras, motivo: 'Combinado com o contador' }).ok, false, 'fora do sigilo não altera');
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras, motivo: 'Combinado com o contador em 16/11' }); assert.equal(r.ok, true, r.mensagem);
  assert.equal(JSON.parse(a.props.OMIE_CATEGORIAS_DEPARA).regras.length, 3);
  assert.equal(r.tela.depara.find((x) => x.cnpj === FORN).descricao, 'Serviços de terceiros', 'descrição vem do Omie');
  assert.equal(r.tela.historico[0].motivo, 'Combinado com o contador em 16/11'); assert.match(r.tela.historico[0].depois, /NF-e de compra/);
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'REGRA_ALTERADA'));
  let l = a.f('OmieNota_apiLer', 'wanessa', { xml: nfe(), tipo: 'compra' });
  assert.equal(l.categoriaSugerida, '2.10'); assert.match(l.categoriaOrigem, /para este CNPJ/);
  assert.equal(vm.runInContext('OmieRegras_sugerir_("NFE_COMPRA", "' + PREST + '").categoria', a.ctx), '2.03', 'outro fornecedor: regra geral');
  assert.equal(vm.runInContext('OmieRegras_sugerir_("RECEBER_PROPOSTA", "").categoria', a.ctx), '1.01');
  assert.equal(a.f('OmieNota_apiLer', 'wanessa', { xml: abrasf(), tipo: 'nfse' }).categoriaSugerida, '', 'NFS-e sem regra');
  // a sugestão não substitui a escolha: a prévia usa o que a pessoa mandou
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.03', contaId: 5 });
  assert.equal(p.ok, true, p.mensagem); assert.ok(p.resumo.some((x) => x[0] === 'Categoria' && x[1] === 'Combustível'));
  // a regra de pedido aprovado entra no preparo da conta a receber
  assert.match(fs.readFileSync(path.join(PASTA, 'SGO_Omie_Pedidos.js'), 'utf8'), /OmieRegras_sugerir_\('RECEBER_PROPOSTA', cnpj\)/);
  // esvaziar volta ao comportamento de antes; JSON estragado = vazio
  r = a.f('OmieRegras_apiSalvarDepara', 'wanessa', { regras: [], motivo: 'Voltar a escolher em cada lançamento' }); assert.equal(r.ok, true); assert.equal(a.props.OMIE_CATEGORIAS_DEPARA, undefined);
  a.props.OMIE_CATEGORIAS_DEPARA = '{isto não é json';
  t = a.f('OmieRegras_apiTela', 'wanessa', {}); assert.deepEqual(t.depara, []);
});

test('Alçada de segunda confirmação: acima do valor, só confirma com o valor digitado de novo; abaixo, nada muda', () => {
  const a = montar(); a.saldo = 5000; a.props.OMIE_ALCADA_SEGUNDA_CONFIRMACAO = '1000.00';
  const baixa = (v) => ({ acao: 'baixar', tipo: 'pagar', id: 101, dados: { contaId: 5, valor: v, data: '2026-11-16' } });
  const baixo = a.f('OmieOps_apiPrevia', 'wanessa', baixa(900)); assert.equal(baixo.ok, true); assert.equal(baixo.alcada, null);
  assert.equal(a.f('OmieOps_apiConfirmar', 'wanessa', { token: baixo.token }).ok, true, 'abaixo da alçada confirma como antes');
  const p = a.f('OmieOps_apiPrevia', 'wanessa', baixa(1500)); assert.equal(p.ok, true, p.mensagem);
  assert.deepEqual(p.alcada, { segunda: true, aprovacao: false }); assert.ok(p.resumo.some((x) => x[0] === 'Segunda confirmação'));
  let c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, false); assert.match(c.mensagem, /digite de novo o valor exato/);
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token, valorConfirmado: '1.500,01' }); assert.equal(c.ok, false);
  const antes = a.escritas().length;
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token, valorConfirmado: '1.500,00' }); assert.equal(c.ok, true, c.mensagem);
  assert.equal(a.escritas().length - antes, 1);
  // conta a pagar nova acima da alçada também; conta a receber nova não
  const pagar = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 12, categoria: '2.03', contaId: 5, documento: 'X', referencia: 'REF-ALC', vencimento: '2026-12-01', valor: 2000 } });
  assert.deepEqual(pagar.alcada, { segunda: true, aprovacao: false });
  const receber = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'receber', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'X', referencia: 'REF-ALC-R', vencimento: '2026-12-01', valor: 2000 } });
  assert.equal(receber.alcada, null);
});

test('Alçada de aprovação: o dono ou a Diretoria aprova (16/11/2026, decisão do dono: o Financeiro não aprova); quem preparou não aprova; recusa com motivo; aprovada expira em 10 minutos', () => {
  const a = montar(); a.saldo = 50000; a.props.OMIE_ALCADA_APROVACAO = '10000';
  const baixa = { acao: 'baixar', tipo: 'pagar', id: 101, dados: { contaId: 5, valor: 12000, data: '2026-11-16' } };
  const p = a.f('OmieOps_apiPrevia', 'wanessa', baixa); assert.equal(p.ok, true, p.mensagem);
  assert.deepEqual(p.alcada, { segunda: false, aprovacao: true }); assert.match(p.expiraEm, /24 horas para a aprovação/);
  let c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, false); assert.match(c.mensagem, /aguardando a aprovação do dono do sistema ou da Diretoria/);
  assert.equal(a.escritas().length, 0);
  assert.equal(a.f('Omie_apiIniciar', 'dora', {}).aprovacoesPendentes, 1); assert.equal(a.f('Omie_apiIniciar', 'fabio', {}).aprovacoesPendentes, 0, 'o Financeiro não aprova'); assert.equal(a.f('Omie_apiIniciar', 'wanessa', {}).aprovacoesPendentes, 0, 'quem preparou não conta como aprovador');
  const lista = a.f('OmieRegras_apiAprovacoes', 'dora', {}); assert.equal(lista.itens.length, 1); assert.equal(lista.itens[0].valor, 'R$ 12.000,00'); assert.equal(lista.itens[0].minha, false);
  assert.equal(a.f('OmieRegras_apiAprovacoes', 'wanessa', {}).itens[0].minha, true);
  const chave = lista.itens[0].chave;
  let d = a.f('OmieRegras_apiDecidir', 'wanessa', { chave, decisao: 'aprovar' }); assert.equal(d.ok, false); assert.match(d.mensagem, /não aprova a própria operação/);
  d = a.f('OmieRegras_apiDecidir', 'tiago', { chave, decisao: 'aprovar' }); assert.equal(d.ok, false); assert.match(d.mensagem, /sigiloso/);
  d = a.f('OmieRegras_apiAprovacoes', 'tiago', {}); assert.equal(d.ok, false, 'fora do sigilo nem vê a lista');
  d = a.f('OmieRegras_apiDecidir', 'fabio', { chave, decisao: 'aprovar' }); assert.equal(d.ok, false); assert.match(d.mensagem, /só o dono do sistema e a Diretoria/);
  d = a.f('OmieRegras_apiDecidir', 'dora', { chave, decisao: 'aprovar' }); assert.equal(d.ok, true, d.mensagem); assert.equal(d.itens.length, 0);
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'APROVADA' && x.USUARIO === 'dora'));
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, true, c.mensagem); assert.equal(a.escritas().length, 1);
  // recusa: exige motivo e quem preparou vê o motivo
  const p2 = a.f('OmieOps_apiPrevia', 'wanessa', Object.assign({}, baixa, { dados: Object.assign({}, baixa.dados, { valor: 13000 }) }));
  const k2 = a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0].chave;
  assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: k2, decisao: 'recusar' }).ok, false);
  assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: k2, decisao: 'recusar', motivo: 'Valor diferente do combinado com o fornecedor' }).ok, true);
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p2.token }); assert.equal(c.ok, false); assert.match(c.mensagem, /recusada por DORA DIRETORA TESTE: Valor diferente do combinado/);
  // aprovada, a prévia vale 10 minutos (como sempre)
  const p3 = a.f('OmieOps_apiPrevia', 'wanessa', Object.assign({}, baixa, { dados: Object.assign({}, baixa.dados, { valor: 14000 }) }));
  const k3 = a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0].chave;
  assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: k3, decisao: 'aprovar' }).ok, true);
  const agoraCtx = vm.runInContext('Date.now()', a.ctx); // relógio controlado do ambiente de teste
  const op = JSON.parse(a.props[k3]); assert.ok(op.expira - agoraCtx > 0 && op.expira - agoraCtx <= 10 * 60000 + 1000, 'aprovada: 10 minutos'); op.expira = agoraCtx - 1; a.props[k3] = JSON.stringify(op);
  c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p3.token }); assert.equal(c.ok, false); assert.match(c.mensagem, /expirou/);
  assert.equal(a.escritas().length, 1);
});

test('Alçadas na nota recebida: o total a lançar passa da alçada, a nota espera a aprovação do dono ou da Diretoria', () => {
  const a = montar(); fornecedorNoOmie(a); a.props.OMIE_ALCADA_APROVACAO = '800'; a.props.OMIE_ALCADA_SEGUNDA_CONFIRMACAO = '900';
  const p = a.f('OmieNota_apiPrevia', 'wanessa', { xml: nfe(), tipo: 'compra', categoria: '2.10', contaId: 5 });
  assert.equal(p.ok, true, p.mensagem); assert.deepEqual(p.alcada, { segunda: true, aprovacao: true });
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe(), valorConfirmado: '1000' }).ok, false);
  const it = a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0]; assert.equal(it.origem, 'Nota recebida'); assert.ok(it.resumo.some((x) => x[0] === 'Fornecedor'));
  assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: it.chave, decisao: 'aprovar' }).ok, true);
  assert.equal(a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe() }).ok, false, 'falta digitar o valor');
  const c = a.f('OmieNota_apiConfirmar', 'wanessa', { token: p.token, xml: nfe(), valorConfirmado: '1.000,00' }); assert.equal(c.ok, true, c.mensagem);
  assert.equal(a.escritas().filter((e) => e.call === 'IncluirContaPagar').length, 2);
});

test('Regras do Financeiro na página completa a 390 e 320 px: configurações, aprovação por outra pessoa, de-para e explicações, sem rolagem lateral', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); a.saldo = 50000; fs.mkdirSync(saida, { recursive: true });
  a.props.OMIE_ALCADA_APROVACAO = '10000'; a.props.OMIE_ALCADA_SEGUNDA_CONFIRMACAO = '5000'; a.props.OMIE_NFSE_RETENCOES = 'CAMPOS_OMIE';
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320]) {
      // uma operação preparada por outra pessoa (fabio); quem está na tela (wanessa, Financeiro) acompanha, mas não aprova (16/11/2026)
      const p = a.f('OmieOps_apiPrevia', 'fabio', { acao: 'baixar', tipo: 'pagar', id: 101, dados: { contaId: 5, valor: 12000 + largura, data: '2026-11-16' } }); assert.equal(p.ok, true, p.mensagem);
      const { page, erros } = await S.abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
      assert.equal(await page.locator('#omieFaixaAprovacao').count(), 0, 'o Financeiro não recebe a faixa de aprovação');
      await page.evaluate(() => OmieTela_abrir_('regras'));
      await page.locator('.omie-regras-cfg').waitFor({ timeout: 10000 });
      const cfg = await page.locator('.omie-regras-cfg').innerText();
      assert.match(cfg, /Só financeiro/); assert.match(cfg, /campos de impostos retidos do Omie/); assert.match(cfg, /Acima de R\$ 5\.000,00/); assert.match(cfg, /Acima de R\$ 10\.000,00/);
      await page.locator('#omieRegraCategoria option[value="2.03"]').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForTimeout(300);
      const dicas = await page.evaluate(() => ['omieRegraTipo', 'omieRegraCnpj', 'omieRegraCategoria', 'omieRegraMotivo'].map((id) => { const el = document.getElementById(id); const d = el && document.getElementById((el.getAttribute('aria-describedby') || '').trim().split(' ').pop()); return d ? d.textContent.split(':')[0] : ''; }));
      assert.deepEqual(dicas, ['Tipo de lançamento', 'CNPJ ou CPF (opcional)', 'Categoria do Omie', 'Motivo da mudança']);
      assert.ok(await S.semRolagem(page), 'sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-regras-financeiro.png'), fullPage: true });
      // o Financeiro vê a operação esperando o dono ou a Diretoria, sem os botões de decidir
      assert.match(await page.locator('#omieRegrasAprov').innerText(), /Aguardando a decisão do dono do sistema ou da Diretoria/);
      assert.equal(await page.locator('#omieRegrasAprov button', { hasText: 'Aprovar' }).count(), 0);
      assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0].chave, decisao: 'aprovar' }).ok, true);
      // de-para: acrescentar e gravar
      await page.selectOption('#omieRegraCategoria', '2.03');
      await page.evaluate(() => OmieRegras_acrescentar_());
      await page.fill('#omieRegraMotivo', 'Combustível da frota combinado com o contador');
      await page.evaluate(() => OmieRegras_gravar_());
      await page.waitForFunction(() => /De-para gravado/.test((document.getElementById('omieRegrasAviso') || {}).textContent || ''), null, { timeout: 10000 });
      assert.match(await page.locator('#omieRegrasLista').innerText(), /NF-e de compra[\s\S]*2\.03/);
      // prévia com segunda confirmação e espera da aprovação (pedaço usado por Lançamentos e por Notas)
      const extra = await page.evaluate(() => { const d = document.createElement('div'); d.id = 'teste-extra'; d.innerHTML = OmieRegras_extrasPrevia_({ alcada: { segunda: true, aprovacao: true } }); document.getElementById('omieCorpo').appendChild(d); return d.innerText; });
      assert.match(extra, /Aguardando aprovação\.[\s\S]*Digite o valor de novo/);
      await page.waitForTimeout(200);
      assert.match(await page.evaluate(() => { const el = document.getElementById('omieValorConfirmado'); return document.getElementById((el.getAttribute('aria-describedby') || '').trim()).textContent; }), /^Digite o valor de novo: a operação passa da alçada/);
      assert.ok(await S.semRolagem(page), 'sem rolagem lateral depois de gravar em ' + largura);
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
      a.props.OMIE_CATEGORIAS_DEPARA = undefined; delete a.props.OMIE_CATEGORIAS_DEPARA;
    }
  } finally { await browser.close(); }
});
