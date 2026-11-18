// Onda B do Financeiro, B2 (18/11/2026): a compra faturada ou por boleto CONFERIDA em Compras e a fatura do cartão FECHADA viram conta a
// pagar no Omie pela aba "Compras e Caju no Omie" (prévia e confirmação de Lançamentos e baixas, referência única, trilha), sem alçada
// nova: o pagamento segue a Aprovação de pagamentos (B1) e, quitado, marca o vencimento como pago em Compras > A pagar.
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_b.cjs); nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { montarOndaB, listaAprovada, FORN } = require('./_financeiro_onda_b.cjs');

test('lista: compras conferidas e faturas fechadas para lançar; o que falta na origem fica em "Aguardando"; cartão, compra antiga e fatura aberta não entram', () => {
  const a = montarOndaB();
  const r = a.tela();
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.inicio, '2026-11', 'a primeira abertura grava o mês de início');
  assert.equal(a.props.FIN_ESPELHO_INICIO, '2026-11');
  const refs = r.paraLancar.map((x) => x.referencia);
  assert.ok(refs.includes('CMP-REQ-2026-0101-1') && refs.includes('CMP-REQ-2026-0104-1') && refs.includes('FAT-4321-202611'), refs.join(','));
  assert.ok(!a.todos(r).some((x) => /REQ-2026-0090|REQ-2026-0103/.test(x.referencia)), 'compra anterior ao início e compra no cartão de crédito ficam fora');
  assert.ok(!a.todos(r).some((x) => x.referencia === 'FAT-4321-202612'), 'fatura aberta não entra');
  const ag = a.item(r, 'CMP-REQ-2026-0102-1');
  assert.equal(ag.situacao, 'AGUARDANDO'); assert.match(ag.motivo, /ainda não conferida pelo Financeiro: confira em Compras > Conferência do Financeiro/);
  const fat = a.item(r, 'FAT-4321-202611');
  assert.equal(fat.valorTxt, 'R$ 1.234,50'); assert.equal(fat.vencimentoBr, '10/11/2026'); assert.match(fat.rotulo, /Fatura 11\/2026 · Cartão da Logística \(final 4321\)/);
  assert.equal(r.contagens.paraLancar, 7); assert.equal(r.contagens.aguardando, 1);
  // a compra conferida depois sai de "Aguardando" e entra em "Para lançar"
  a.tabelas.CMP_PEDIDOS.find((p) => p.ID === 'p2').FIN_SITUACAO = 'CONFERIDA';
  assert.equal(a.item(a.tela(), 'CMP-REQ-2026-0102-1').situacao, 'PARA_LANCAR');
  // divergente na conferência: diz o que fazer
  a.tabelas.CMP_PEDIDOS.find((p) => p.ID === 'p2').FIN_SITUACAO = 'DIVERGENTE';
  assert.match(a.item(a.tela(), 'CMP-REQ-2026-0102-1').motivo, /"Divergente": o comprador corrige/);
});

test('sigilo: fora da lista nada abre (recusa registrada); a tela de Compras não muda', () => {
  const a = montarOndaB();
  for (const login of ['tiago', 'rita', 'matheusgodoi']) {
    const r = a.tela(login);
    assert.equal(r.ok, false); assert.match(r.mensagem, /Financeiro é sigiloso/);
    const p = a.F('OmieEsp_apiPreparar', login, { chave: 'COMPRA|x1|' });
    assert.equal(p.ok, false); assert.match(p.mensagem, /sigiloso/);
  }
  assert.ok(a.acessos().filter((x) => x.RESULTADO === 'NEGADO').length >= 6, 'recusas no registro de acessos');
  assert.ok(!a.acessos().some((x) => /R\$|850,00|1\.234/.test(String(x.DETALHE || '') + String(x.CONSULTA || ''))), 'nenhum valor no registro de acessos');
});

test('preparar e lançar a compra: formulário preenchido, CNPJ na busca, prévia com a origem, referência única, trilha e fornecedor lembrado', () => {
  const a = montarOndaB();
  const it = a.item(a.tela(), 'CMP-REQ-2026-0101-1');
  const pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: it.chave });
  assert.equal(pr.ok, true, pr.mensagem);
  assert.deepEqual([pr.previo.documento, pr.previo.valor, pr.previo.vencimento, pr.previo.referencia, pr.previo.categoria, pr.previo.pessoaId], ['NF 4567', 850, '25/11/2026', 'CMP-REQ-2026-0101-1', '', '']);
  assert.match(pr.previo.observacao, /Compra REQ-2026-0101 \(Resistência 220 V da autoclave\), Boleto, nota 4567\. Vínculo: Cliente: Hospital Teste Alfa\./);
  assert.equal(pr.contexto.buscaDocumento, FORN, 'a busca do fornecedor no Omie já vem com o CNPJ de Compras');
  assert.ok(pr.contexto.avisos.some((x) => /Sem categoria nas Regras do Financeiro para "Compra para cliente/.test(x)), 'sem de-para: a Wanessa escolhe a categoria');
  assert.equal(a.inclusoes().length, 0, 'preparar não grava nada no Omie');
  // prévia: a origem no SGO+ e o aviso quando o valor digitado é diferente
  let pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: Object.assign({}, pr.previo, { vencimento: '2026-11-25', pessoaId: 55, categoria: '2.10', contaId: 5, valor: 900 }) });
  assert.equal(pv.ok, true, pv.mensagem);
  const linhas = pv.resumo.map((l) => l.join(': ')).join('\n');
  assert.match(linhas, /Origem no SGO\+: Compra: REQ-2026-0101 · Resistência 220 V da autoclave · R\$ 850,00/);
  assert.match(linhas, /Atenção: valor diferente da origem: O valor deste lançamento \(R\$ 900,00\) é diferente do valor no SGO\+ \(R\$ 850,00\)/);
  // parcelar uma compra é recusado (a referência liga o título ao SGO+)
  pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: Object.assign({}, pr.previo, { vencimento: '2026-11-25', pessoaId: 55, categoria: '2.10', contaId: 5, parcelas: 2 }) });
  assert.equal(pv.ok, false); assert.match(pv.mensagem, /de compra, de fatura do cartão, de carga do Caju ou de conta fixa não é parcelado por aqui/);
  // lançar de verdade (Omie simulado)
  const l = a.lancar('CMP-REQ-2026-0101-1');
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  const inc = a.inclusoes();
  assert.equal(inc.length, 1);
  assert.deepEqual([inc[0].param.codigo_lancamento_integracao, inc[0].param.valor_documento, inc[0].param.numero_documento, inc[0].param.codigo_cliente_fornecedor], ['CMP-REQ-2026-0101-1', 850, 'NF 4567', 55]);
  assert.equal(inc[0].param.distribuicao, undefined, 'sem departamento: centro de custo não decidido');
  const e = a.espelho().find((x) => x.REFERENCIA === 'CMP-REQ-2026-0101-1');
  assert.deepEqual([e.SITUACAO, e.FORMA, e.TITULO_OMIE, e.VALOR_LANCADO, e.FORNECEDOR_ID, e.FORNECEDOR_NOME, e.LANCADO_POR_NOME], ['LANCADO', 'SGO', String(inc[0].param && a.contasPagar[0].codigo_lancamento_omie), 850, '55', 'PECAS FICTICIAS LTDA', 'WANESSA FINANCEIRO TESTE']);
  assert.ok(a.trilha().some((t) => /IncluirContaPagar/.test(JSON.stringify(t)) && /CMP-REQ-2026-0101-1/.test(JSON.stringify(t))), 'a gravação está na trilha das operações');
  // não lança duas vezes: nem pela aba, nem digitando a mesma referência
  const r2 = a.tela();
  assert.equal(a.item(r2, 'CMP-REQ-2026-0101-1').situacao, 'LANCADO');
  assert.match(a.F('OmieEsp_apiPreparar', 'wanessa', { chave: it.chave }).mensagem, /já foi lançado no Omie \(título \d+\).*Nada foi preparado/);
  pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: Object.assign({}, pr.previo, { vencimento: '2026-11-25', pessoaId: 55, categoria: '2.10', contaId: 5, documento: 'OUTRO' }) });
  assert.equal(pv.ok, false); assert.match(pv.mensagem, /A referência CMP-REQ-2026-0101-1 já foi lançada no Omie \(título \d+\).*para não lançar duas vezes/);
  // o próximo item do mesmo fornecedor já vem com o fornecedor do Omie (lembrado pelo CNPJ)
  const pr5 = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r2, 'CMP-REQ-2026-0104-1').chave });
  assert.equal(pr5.previo.pessoaId, '55'); assert.equal(pr5.previo.pessoaNome, 'PECAS FICTICIAS LTDA'); assert.equal(pr5.contexto.buscaDocumento, '');
});

test('categoria pelo de-para das Regras do Financeiro (por finalidade da compra e por CNPJ); sem regra continua vazia', () => {
  const a = montarOndaB();
  const t = a.F('OmieRegras_apiTela', 'wanessa');
  ['COMPRA_CLIENTE', 'COMPRA_COMERCIAL', 'COMPRA_VEICULO', 'COMPRA_INTERNO', 'FATURA_CARTAO', 'CAJU_VIAGEM', 'CAJU_RECARGA', 'CAJU_TAXA'].forEach((k) => assert.ok(t.tipos.some((x) => x.codigo === k && x.natureza === 'pagar'), k));
  assert.equal(t.config.espelhoDepartamento, false);
  const s = a.F('OmieRegras_apiSalvarDepara', 'wanessa', { motivo: 'de-para combinado com o contador', regras: [{ tipo: 'COMPRA_CLIENTE', categoria: '2.10' }, { tipo: 'FATURA_CARTAO', categoria: '2.03' }] });
  assert.equal(s.ok, true, s.mensagem);
  const r = a.tela();
  const pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'CMP-REQ-2026-0101-1').chave });
  assert.deepEqual([pr.previo.categoria, pr.previo.categoriaOrigem], ['2.10', 'regra geral do de-para']);
  const pf = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'FAT-4321-202611').chave });
  assert.equal(pf.previo.categoria, '2.03');
  // categoria de receita nunca entra no de-para de conta a pagar
  const ruim = a.F('OmieRegras_apiSalvarDepara', 'wanessa', { motivo: 'teste de categoria errada', regras: [{ tipo: 'CAJU_TAXA', categoria: '1.01' }] });
  assert.equal(ruim.ok, false); assert.match(ruim.mensagem, /não serve para Taxa de serviço do Caju/);
});

test('fatura do cartão fechada: conta a pagar ao emissor pelo total do extrato, vencimento do cartão; sem o dia do vencimento, a tela pede', () => {
  const a = montarOndaB();
  let pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(a.tela(), 'FAT-4321-202611').chave });
  assert.equal(pr.ok, true, pr.mensagem);
  assert.deepEqual([pr.previo.documento, pr.previo.valor, pr.previo.vencimento, pr.previo.referencia], ['FAT 4321 11/2026', 1234.5, '10/11/2026', 'FAT-4321-202611']);
  assert.match(pr.previo.observacao, /Fatura do cartão da empresa Cartão da Logística \(final 4321\), vencimento 11\/2026: total do extrato R\$ 1\.234,50 \(com estornos\)/);
  assert.ok(pr.contexto.avisos.some((x) => /banco ou o emissor do cartão/.test(x)));
  const l = a.lancar('FAT-4321-202611', { pessoaId: 55 });
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  // o próximo mês do mesmo cartão já vem com o mesmo emissor
  a.tabelas.CMP_FATURAS.push({ ID: 'ft3', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', COMPETENCIA: '2027-01', SITUACAO: 'FECHADA_RESSALVA', TOTAL_EXTRATO: 80, TOTAL_SISTEMA: 60, FECHAMENTO_OBS: 'Dois lançamentos aguardando comprovante' });
  a.tabelas.CMP_CARTOES[0].DIA_VENCIMENTO = '';
  pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(a.tela(), 'FAT-4321-202701').chave });
  assert.equal(pr.previo.pessoaId, '55'); assert.equal(pr.previo.vencimento, '');
  assert.ok(pr.contexto.avisos.some((x) => /não tem o dia do vencimento cadastrado/.test(x)));
  assert.match(pr.previo.observacao, /Fechada com ressalva: Dois lançamentos aguardando comprovante/);
  // fatura sem valor a pagar fica aguardando, com o porquê
  a.tabelas.CMP_FATURAS.push({ ID: 'ft4', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', COMPETENCIA: '2027-02', SITUACAO: 'FECHADA', TOTAL_EXTRATO: -15, TOTAL_SISTEMA: 0 });
  assert.match(a.item(a.tela(), 'FAT-4321-202702').motivo, /sem valor a pagar/);
});

test('pagamento pela Aprovação de pagamentos (B1): a baixa quitada marca o item e o vencimento em Compras > A pagar; sem aprovação, nada', () => {
  const a = montarOndaB();
  const l = a.lancar('CMP-REQ-2026-0101-1');
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  const id = a.contasPagar[0].codigo_lancamento_omie;
  a.saldo = 850;
  // sem aprovação: a baixa é recusada (B1) e nada muda em Compras
  let pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'pagar', id, dados: { contaId: 5, valor: 850, data: '2026-11-16' } });
  assert.equal(pv.ok, false); assert.match(pv.mensagem, /ainda não passou pela lista de aprovação/);
  assert.equal(a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x1').SITUACAO, 'A_PAGAR');
  // a Wanessa envia, a Diretoria aprova, a Wanessa registra a baixa
  a.em('2026-11-16T11:00:00-03:00');
  listaAprovada(a, [id], 'dora');
  a.limparCache();
  pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'pagar', id, dados: { contaId: 5, valor: 850, data: '2026-11-16' } });
  assert.equal(pv.ok, true, pv.mensagem);
  a.em('2026-11-16T11:05:00-03:00');
  const c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: pv.token });
  assert.equal(c.ok, true, c.mensagem);
  const e = a.espelho().find((x) => x.REFERENCIA === 'CMP-REQ-2026-0101-1');
  assert.deepEqual([e.QUITADO, e.BAIXADO_VALOR, e.BAIXADO_EM], ['SIM', 850, '2026-11-16']);
  const x1 = a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x1');
  assert.deepEqual([x1.SITUACAO, x1.PAGO_EM, x1.PAGO_POR_ID], ['PAGA', '2026-11-16', 'u_fin']);
  assert.match(x1.PAGO_POR_NOME, /WANESSA FINANCEIRO TESTE \(baixa no Omie, título \d+\)/);
  assert.equal(x1.VALOR, 850, 'nada além do pagamento muda na parcela');
  assert.ok(a.tabelas.CMP_HISTORICO.some((h) => /baixa registrada no Omie pelo Painel financeiro/.test(h.TEXTO)));
  const r = a.tela();
  const it = a.item(r, 'CMP-REQ-2026-0101-1');
  assert.equal(it.pago, true); assert.deepEqual(it.divergencias, []);
});

test('já lançado direto no Omie, dispensar e desfazer: com motivo, sem lançar duas vezes; travas dizem o quê e o que fazer', () => {
  const a = montarOndaB();
  const r = a.tela(), ch = a.item(r, 'CMP-REQ-2026-0104-1').chave;
  assert.match(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'LANCADO_DIRETO', motivo: 'curto' }).mensagem, /pelo menos 10 letras.*Nada foi alterado/);
  assert.match(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'LANCADO_DIRETO', motivo: 'lançado no Omie em 10/11, documento 778', titulo: 'abc' }).mensagem, /só algarismos/);
  const d = a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'LANCADO_DIRETO', motivo: 'lançado no Omie em 10/11, documento 778', titulo: '778' });
  assert.equal(d.ok, true, d.mensagem);
  assert.equal(a.item(a.tela(), 'CMP-REQ-2026-0104-1').situacao, 'LANCADO');
  assert.match(a.F('OmieEsp_apiPreparar', 'wanessa', { chave: ch }).mensagem, /já foi lançado no Omie \(título 778\)/);
  assert.match(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'DESFAZER', motivo: 'x' }).mensagem, /pelo menos 10 letras/);
  assert.equal(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'DESFAZER', motivo: 'o documento 778 era de outra compra' }).ok, true);
  assert.equal(a.item(a.tela(), 'CMP-REQ-2026-0104-1').situacao, 'PARA_LANCAR');
  assert.match(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'DISPENSAR', motivo: 'devolvida' }).mensagem, /pelo menos 15 letras/);
  assert.equal(a.F('OmieEsp_apiItem', 'wanessa', { chave: ch, acao: 'DISPENSAR', motivo: 'compra devolvida, fornecedor cancelou o boleto' }).ok, true);
  const pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 55, categoria: '2.10', contaId: 5, vencimento: '2026-11-30', valor: 210, documento: 'X', referencia: 'CMP-REQ-2026-0104-1' } });
  assert.equal(pv.ok, false); assert.match(pv.mensagem, /foi dispensado em Compras e Caju no Omie.*desfaça a dispensa/);
  // lançado pelo SGO+ não se desfaz por aqui: a exclusão é pela Trilha
  const l = a.lancar('CMP-REQ-2026-0101-1');
  assert.equal(l.confirmar.ok, true);
  assert.match(a.F('OmieEsp_apiItem', 'wanessa', { chave: a.item(a.tela(), 'CMP-REQ-2026-0101-1').chave, acao: 'DESFAZER', motivo: 'tentativa de desfazer' }).mensagem, /peça a exclusão do título em Trilha das operações/);
  // a Diretoria vê; quem não tem a caixa de lançar não prepara
  assert.equal(a.tela('dora').ok, true);
});
