// Auditoria do Financeiro (19/11/2026, pedido do dono com os relatos do Matheus e da Wanessa):
//  (1) Contas a pagar e receber POR PERÍODO, com as colunas do Omie (SGO_Financeiro_Contas.js, JS_Financeiro_Contas.html);
//  (2) Conciliação bancária que casa as contas ATRASADAS e BAIXA no Omie, já conciliada (SGO_Omie_Conciliacao.js + SGO_Omie_Operacoes.js),
//      com juros, multa, desconto e baixa parcial, idempotência (nunca duas baixas do mesmo movimento) e os erros da API.
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs); nada sai para a rede. Os números do simulado seguem o formato
// dos dados reais lidos do Omie em 19/11/2026 (ex.: título de 150,00 com 6,97 de retenção e 11,02 de multa: banco 154,05).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const B = require('./_financeiro_b1c3.cjs');
const S = require('./_financeiro_simulado.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_AUDITORIA || path.join(__dirname, '../output/financeiro-auditoria-20261119/capturas');

const br = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const isoDe = (b) => b.slice(6, 10) + '-' + b.slice(3, 5) + '-' + b.slice(0, 2);
const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });

// ------------------------------------------------------------------------------------------------ cenário
// Hoje = 18/11/2026 (quarta). R = a receber, P = a pagar. Valores em reais. ret = retenções (retidas); jur/mul/desc já pagos.
function movimento(t) {
  const det = { nCodTitulo: t.id, cNumTitulo: t.doc || null, cNumParcela: t.parc || '001/001', cNumDocFiscal: t.nf || null, dDtVenc: br(t.venc), dDtPrevisao: br(t.prev || t.venc), dDtEmissao: br(t.emis || t.venc),
    dDtPagamento: t.pgEm ? br(t.pgEm) : null, nCodCliente: t.cli, cCPFCNPJCliente: t.cnpj || '', cStatus: t.status, cNatureza: t.n, cOperacao: t.op || '01', cCodCateg: t.cat || '1.01', cTipo: 'BOL', nValorTitulo: t.valor, nCodCC: 5 };
  if (t.ret) { det.nValorPIS = t.ret; det.cRetPIS = 'S'; det.nValorISS = 99; det.cRetISS = 'N'; }
  const ret = t.ret || 0, pago = t.pago || 0, liq = Math.round((pago - (t.desc || 0) + (t.jur || 0) + (t.mul || 0)) * 100) / 100;
  return { detalhes: det, resumo: { cLiquidado: t.aberto > 0 ? 'N' : 'S', nValPago: pago, nValAberto: t.aberto, nDesconto: t.desc || 0, nJuros: t.jur || 0, nMulta: t.mul || 0, nValLiquido: liq } };
}
const TITULOS = [
  // a receber
  { id: 101, n: 'R', doc: 'RPS455', nf: '456', cli: 4001, cnpj: '12.345.678/0001-95', venc: '2026-11-10', valor: 1000, aberto: 1000, status: 'ATRASADO' },        // atrasado (o a.titulo do simulado)
  { id: 502, n: 'R', doc: 'RPS502', cli: 4002, venc: '2026-11-25', valor: 500, aberto: 500, status: 'AVENCER' },
  { id: 503, n: 'R', doc: 'RPS503', cli: 4003, venc: '2026-11-12', valor: 300, aberto: 300, status: 'ATRASADO' },
  { id: 504, n: 'R', doc: 'RPS504', cli: 4004, venc: '2026-11-14', valor: 300, aberto: 300, status: 'ATRASADO' },
  { id: 505, n: 'R', doc: 'RPS505', cli: 4002, venc: '2026-11-18', valor: 800, aberto: 800, status: 'VENCEHOJE' },
  { id: 506, n: 'R', doc: 'RPS506', nf: '507', cli: 4001, venc: '2026-11-04', valor: 150, ret: 6.97, pago: 143.03, mul: 11.02, aberto: 0, pgEm: '2026-11-12', status: 'RECEBIDO' },
  { id: 507, n: 'R', doc: 'RPS507', cli: 4003, venc: '2026-11-05', valor: 2000, pago: 500, aberto: 1500, pgEm: '2026-11-06', status: 'PAGTOPARCIAL' },  // parcial atrasado
  { id: 508, n: 'R', doc: 'RPS508', cli: 4004, venc: '2026-11-20', valor: 700, aberto: 0, status: 'CANCELADO' },
  // a pagar (101 também existe como conta a pagar no ambiente da Aprovação de pagamentos)
  { id: 101, n: 'P', doc: 'NF-001', cli: 90, cnpj: '98.765.432/0001-98', venc: '2026-11-10', valor: 1000, aberto: 1000, status: 'ATRASADO' }
];
function cenario(o) {
  o = o || {};
  const a = B.montarB1C3({ agora: '2026-11-18T10:00:00-03:00' });
  vm.runInContext(fs.readFileSync(path.join(S.PASTA, 'SGO_Financeiro_Contas.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Financeiro_Contas.js' });
  a.em('2026-11-18T10:00:00-03:00');
  a.titulos = TITULOS.map((t) => Object.assign({}, t));
  a.extrato = [
    { nCodLancamento: 1, dDataLancamento: '16/11/2026', nValorDocumento: 0 }, // linha de saldo do Omie (sem natureza)
    { nCodLancamento: 9001, cOrigem: 'Conta Paga', cNatureza: 'P', dDataLancamento: '17/11/2026', nValorDocumento: -125.5, cDesCliente: 'BANCO TARIFAS', cSituacao: 'Realizado' },
    { nCodLancamento: 101, cOrigem: 'Conta a Receber', cNatureza: 'R', dDataLancamento: '10/11/2026', nValorDocumento: 1000, cDesCliente: 'CLIENTE ATRASADO', cSituacao: 'Previsto' }
  ];
  a.clientes.push({ codigo_cliente_omie: 4001, razao_social: 'CLIENTE ATRASADO SERVICOS LTDA', nome_fantasia: 'Cliente Atrasado', cnpj_cpf: '12.345.678/0001-95', inativo: 'N' },
    { codigo_cliente_omie: 4002, razao_social: 'HOSPITAL BETA LTDA', nome_fantasia: 'Hospital Beta', cnpj_cpf: '22.222.222/0001-22', inativo: 'N' });
  a.chamadas = [];
  // planilha do histórico da conciliação (OMIE_CONCILIACOES) com a API de planilha que o servidor oferece
  const planilhas = new Map(), getDB0 = a.ctx.SGO_DATA.getDB;
  const aba = () => { const rows = []; return { rows, appendRow(r) { rows.push(r); }, setFrozenRows() {}, getLastRow() { return rows.length; }, getRange(r, c, nr, nc) { return { getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? '')); }, setValues(v) { v.forEach((x, i) => { rows[r - 1 + i] = x; }); } }; } }; };
  a.ctx.SGO_DATA.getDB = () => { const db = getDB0(); return Object.assign({}, db, { getSheetByName: (n) => (n === 'OMIE_CONCILIACOES' ? planilhas.get(n) || null : db.getSheetByName(n)), insertSheet: (n) => { const s = aba(); planilhas.set(n, s); return s; } }); };
  a.historico = () => { const s = planilhas.get('OMIE_CONCILIACOES'); return s ? s.rows.slice(1).map((r) => Object.assign({ chaveBanco: r[3], chaveOmie: r[4] }, JSON.parse(r[5]))) : []; };
  const anterior = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      const falha = a.falhas[b.call];
      if (!(falha && falha.length)) {
        if (b.call === 'ListarMovimentos') {
          a.omie.push({ url, call: b.call, param: p }); a.chamadas.push(Object.assign({ call: b.call }, p));
          let l = a.titulos;
          if (p.nCodTitulo) { l = l.filter((t) => t.id === Number(p.nCodTitulo) && (p.cTpLancamento === 'CP' ? t.n === 'P' : t.n === 'R')); return resp(200, { nPagina: 1, nTotPaginas: 1, movimentos: l.map(movimento) }); }
          l = l.filter((t) => (p.cTpLancamento === 'CPCR' || (p.cTpLancamento === 'CP' ? t.n === 'P' : t.n === 'R')));
          if (p.cStatus) l = l.filter((t) => (p.cStatus === 'ATRASADO' ? t.status === 'ATRASADO' || (t.status === 'PAGTOPARCIAL' && t.venc < '2026-11-18') : t.status === p.cStatus));
          for (const [campo, chave] of [['dDtVenc', 'venc'], ['dDtPrev', 'prev'], ['dDtPagto', 'pgEm'], ['dDtEmis', 'emis']]) {
            if (p[campo + 'De']) l = l.filter((t) => { const v = t[chave] || (chave === 'prev' || chave === 'emis' ? t.venc : ''); return v && v >= isoDe(p[campo + 'De']) && v <= isoDe(p[campo + 'Ate']); });
          }
          const por = p.nRegPorPagina || 50, tot = Math.ceil(l.length / por);
          if (!l.length) return resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' });
          return resp(200, { nPagina: p.nPagina, nTotPaginas: tot, nTotRegistros: l.length, movimentos: l.slice((p.nPagina - 1) * por, p.nPagina * por).map(movimento) });
        }
        if ((b.call === 'ConsultarContaReceber' || b.call === 'ConsultarContaPagar') && a.titulos.some((x) => x.id === Number(p.codigo_lancamento_omie) && x.n === (b.call === 'ConsultarContaPagar' ? 'P' : 'R'))) {
          const t = a.titulos.find((x) => x.id === Number(p.codigo_lancamento_omie) && x.n === (b.call === 'ConsultarContaPagar' ? 'P' : 'R'));
          a.omie.push({ url, call: b.call, param: p });
          return resp(200, { codigo_lancamento_omie: t.id, numero_documento: t.doc, codigo_cliente_fornecedor: t.cli, codigo_categoria: t.n === 'P' ? '2.10' : '1.01', id_conta_corrente: 5, data_vencimento: br(t.venc), data_previsao: br(t.venc), valor_documento: t.valor, status_titulo: t.status });
        }
        if (b.call === 'ListarClientes' && p.clientesPorCodigo) {
          a.omie.push({ url, call: b.call, param: p });
          return resp(200, { total_de_paginas: 1, clientes_cadastro: a.clientes.filter((c) => p.clientesPorCodigo.some((x) => x.codigo_cliente_omie === c.codigo_cliente_omie)) });
        }
        if (b.call === 'ListarExtrato') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { nCodCC: p.nCodCC, listaMovimentos: a.extrato }); }
        if (b.call === 'ListarContasCorrentes') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { total_de_paginas: 1, ListarContasCorrentes: [{ nCodCC: 5, descricao: 'Banco simulado' }] }); }
        if ((b.call === 'LancarRecebimento' || b.call === 'LancarPagamento') && a.statusBaixa) { a.omie.push({ url, call: b.call, param: p }); return resp(200, { codigo_lancamento: p.codigo_lancamento, codigo_status: a.statusBaixa, descricao_status: 'Conta corrente bloqueada para baixas nesta data.' }); }
        if (b.call === 'LancarRecebimento' || b.call === 'LancarPagamento') {
          // o "Omie" baixa de verdade no simulado: o saldo do título cai (para a idempotência e para a 2ª prévia)
          const t = a.titulos.find((x) => x.id === Number(p.codigo_lancamento) && x.n === (b.call === 'LancarPagamento' ? 'P' : 'R'));
          if (t) { t.aberto = Math.round((t.aberto - p.valor) * 100) / 100; t.pago = (t.pago || 0) + p.valor; if (t.aberto <= 0) t.status = b.call === 'LancarPagamento' ? 'PAGO' : 'RECEBIDO'; }
          a.omie.push({ url, call: b.call, param: p });
          return resp(200, { codigo_lancamento: p.codigo_lancamento, codigo_baixa: a.proximaBaixa++, codigo_baixa_integracao: p.codigo_baixa_integracao, liquidado: t && t.aberto <= 0 ? 'S' : 'N', valor_baixado: p.valor, codigo_status: '0', descricao_status: 'Recebimento lançado com sucesso!' });
        }
      }
    }
    return anterior(url, op);
  };
  a.limparCache();
  if (o.semGravacao) delete a.props.OMIE_GRAVACAO_LIGADA;
  return a;
}
const CSV = (linhas) => 'Data;Valor;Descricao;Identificador\n' + linhas.map((l, i) => l.concat(['FIT' + (i + 1)]).join(';')).join('\n');
const EXTRATO = CSV([
  ['18/11/2026', '1.012,50', 'PIX RECEBIDO 12.345.678/0001-95 CLIENTE ATRASADO'], // 0: atrasado 101, com 12,50 a mais (juros/multa)
  ['17/11/2026', '500,00', 'PIX RECEBIDO HOSPITAL BETA'],                         // 1: 502 a vencer, mesmo valor
  ['17/11/2026', '300,00', 'TED RECEBIDA'],                                       // 2: 503 ou 504 (dois títulos com o mesmo valor)
  ['17/11/2026', '-125,50', 'TARIFA PACOTE'],                                     // 3: já pago no Omie (conferência)
  ['17/11/2026', '77,77', 'CREDITO SEM ORIGEM']                                    // 4: nada no Omie
]);
const previa = (a, texto, login) => a.F('Omie_apiConciliarPrevia', login || 'wanessa', { contaId: '5', contaNome: 'Banco simulado', inicio: '2026-11-01', fim: '2026-11-18', formato: 'CSV', texto: texto || EXTRATO });
const escritas = (a) => a.omie.filter((c) => /^(Lancar|Conciliar|Incluir|Alterar|Excluir|Cancelar)/.test(c.call));

// ================================================================================================ (1) contas por período
test('contas por período: colunas do Omie (líquido = valor − retidos; recebido = o que entrou no banco), situação calculada no dia de Brasília, totais em centavos', () => {
  const a = cenario();
  const r = a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'todas' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.linhas.length, 8); assert.equal(r.totalPeriodo, 8);
  const l = Object.fromEntries(r.linhas.map((x) => [x.id, x]));
  // título recebido com retenção e multa (o formato real conferido no Omie): 150,00 − 6,97 = 143,03 líquido; 143,03 + 11,02 = 154,05 no banco
  assert.deepEqual([l[506].valor, l[506].ret, l[506].liq, l[506].aberto, l[506].jm, l[506].pago], [15000, 697, 14303, 0, 1102, 15405]);
  assert.equal(l[506].sit, 'Recebido'); assert.equal(l[506].ult, '12/11/2026'); assert.equal(l[506].nf, '507'); assert.equal(l[506].parc, '001/001');
  assert.equal(l[506].cli, 'Cliente Atrasado', 'nome fantasia do cadastro do Omie'); assert.match(l[506].op, /^01 · Venda de serviço$/); assert.match(l[506].cat, /^1\.01 · Receitas de serviços$/);
  assert.equal(l[101].sit, 'Atrasado'); assert.equal(l[505].sit, 'Vence hoje'); assert.equal(l[502].sit, 'A vencer'); assert.equal(l[508].sit, 'Cancelado');
  assert.equal(l[507].sit, 'Atrasado (pagamento parcial)'); assert.equal(l[507].aberto, 150000);
  assert.equal(r.totais.valor, 100000 + 50000 + 30000 + 30000 + 80000 + 15000 + 200000 + 70000);
  assert.equal(r.totais.atrasado, 100000 + 30000 + 30000 + 150000);
  // filtros de situação, sem nova leitura do Omie (guardado 5 minutos)
  const antes = a.chamadas.length;
  const at = a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'atrasadas' });
  assert.deepEqual(at.linhas.map((x) => x.id).sort(), ['101', '503', '504', '507']); assert.equal(at.doCache, true); assert.equal(a.chamadas.length, antes);
  assert.deepEqual(a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'quitadas' }).linhas.map((x) => x.id), ['506']);
  assert.deepEqual(a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'parciais' }).linhas.map((x) => x.id), ['507']);
  assert.deepEqual(a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'canceladas' }).linhas.map((x) => x.id), ['508']);
  // "Ler de novo do Omie" lê na hora
  a.limparCache();
  const f = a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'todas', forcar: true });
  assert.equal(f.doCache, false); assert.ok(a.chamadas.length > antes);
});

test('contas por período: data de referência (pagamento, previsão), a pagar, paginação de várias páginas e validação do período (o quê, por quê, o que fazer)', () => {
  const a = cenario();
  const pg = a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'pagto', de: '01/11/2026', ate: '15/11/2026', situacao: 'todas' });
  assert.deepEqual(pg.linhas.map((x) => x.id).sort(), ['506', '507']); assert.match(pg.periodo.texto, /^pagamento/);
  const ultimo = a.chamadas[a.chamadas.length - 1]; assert.equal(ultimo.dDtPagtoDe, '01/11/2026'); assert.equal(ultimo.dDtPagtoAte, '15/11/2026'); assert.equal(ultimo.cTpLancamento, 'CR');
  const cp = a.F('FinCon_apiListar', 'wanessa', { tipo: 'pagar', campo: 'venc', de: '01/11/2026', ate: '30/11/2026', situacao: 'abertas' });
  assert.deepEqual(cp.linhas.map((x) => x.id), ['101']); assert.equal(a.chamadas[a.chamadas.length - 1].cTpLancamento === 'CP' || a.chamadas.some((c) => c.cTpLancamento === 'CP'), true);
  // 130 títulos: 3 páginas de 50, todas lidas, cada título uma vez
  for (let i = 0; i < 130; i++) a.titulos.push({ id: 9000 + i, n: 'R', doc: 'X' + i, cli: 4002, venc: '2026-12-' + String(1 + (i % 28)).padStart(2, '0'), valor: 10, aberto: 10, status: 'AVENCER' });
  a.limparCache();
  const dez = a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', campo: 'venc', de: '01/12/2026', ate: '31/12/2026', situacao: 'todas' });
  assert.equal(dez.linhas.length, 130); assert.equal(new Set(dez.linhas.map((x) => x.id)).size, 130); assert.equal(dez.totais.valor, 130000);
  assert.deepEqual(a.chamadas.filter((c) => c.dDtVencDe === '01/12/2026').map((c) => c.nPagina), [1, 2, 3]);
  for (const [p, re] of [[{ de: '30/11/2026', ate: '01/11/2026' }, /é depois da data "até"/], [{ de: '01/01/2025', ate: '31/12/2026' }, /máximo é 400/], [{ de: '', ate: '' }, /Informe as duas datas/], [{ de: '31/02/2026', ate: '01/03/2026' }, /Informe as duas datas|não é válida/]]) {
    const r = a.F('FinCon_apiListar', 'wanessa', Object.assign({ tipo: 'receber', situacao: 'todas' }, p)); assert.equal(r.ok, false); assert.match(r.mensagem, re);
  }
  assert.equal(escritas(a).length, 0, 'a tela de contas não grava nada no Omie');
});

test('contas por período e conciliação respeitam o sigilo: Matheus (fora da lista) não vê; o acesso fica registrado', () => {
  const a = cenario();
  for (const [fn, dados] of [['FinCon_apiListar', { tipo: 'receber', de: '01/11/2026', ate: '30/11/2026' }], ['Omie_apiConciliarPrevia', { contaId: '5', inicio: '2026-11-01', fim: '2026-11-18', formato: 'CSV', texto: EXTRATO }], ['OmieConc_apiBaixaPrevia', {}], ['OmieConc_apiBaixaConfirmar', {}], ['OmieConc_apiPendentes', {}]]) {
    const r = a.F(fn, 'matheusgodoi', dados); assert.equal(r.ok, false, fn); assert.match(r.mensagem, /sigiloso/, fn);
  }
  assert.equal(a.chamadas.length, 0);
  assert.ok(a.acessos().some((x) => x.USUARIO_ID === 'u_mat' && x.RESULTADO === 'NEGADO' && /FinCon_apiListar|Contas a pagar e receber por período/.test(x.CONSULTA + ' ' + x.DETALHE)));
  assert.ok(a.F('FinCon_apiListar', 'wanessa', { tipo: 'receber', de: '01/11/2026', ate: '30/11/2026' }).ok);
});

// ================================================================================================ (2) conciliação
test('conciliação: a conta ATRASADA é encontrada (antes ficava "sem correspondência"); a prévia diz o que fazer em cada movimento', () => {
  const a = cenario(), r = previa(a);
  assert.equal(r.ok, true, r.mensagem);
  const [l0, l1, l2, l3, l4] = r.linhas;
  // 0: título 101, atrasado desde 10/11, achado pelo CNPJ do extrato; 12,50 a mais = juros ou multa
  assert.equal(l0.acao, 'baixar'); assert.equal(l0.escolhido, 0); assert.equal(l0.candidatos[0].id, '101'); assert.equal(l0.candidatos[0].atrasado, true);
  assert.equal(l0.candidatos[0].dif, 1250); assert.match(l0.status, /Baixa sugerida com diferença/); assert.ok(l0.candidatos[0].motivos.some((m) => /CPF\/CNPJ/.test(m)));
  // o "Previsto" do extrato do Omie (o mesmo título 101, na data antiga) NÃO é tratado como pagamento já feito
  assert.notEqual(l0.acao, 'conferir');
  assert.equal(l1.acao, 'baixar'); assert.equal(l1.candidatos[l1.escolhido].id, '502'); assert.match(l1.status, /Baixa sugerida: título em aberto com o mesmo valor/);
  assert.equal(l2.acao, 'baixar'); assert.equal(l2.escolhido, -1); assert.deepEqual(l2.candidatos.map((c) => c.id).sort(), ['503', '504']); assert.match(l2.status, /Escolha o título/);
  assert.equal(l3.acao, 'conferir'); assert.equal(l3.elegivel, true); assert.match(l3.status, /já baixado no Omie/);
  assert.equal(l4.acao, 'nenhuma'); assert.match(l4.status, /Sem título em aberto compatível.*Lançamento avulso/);
  // consultas de títulos em aberto: atrasados, vencem hoje e a vencer (até 45 dias depois do fim do extrato)
  const ab = a.chamadas.filter((c) => c.cTpLancamento === 'CPCR');
  assert.deepEqual(ab.map((c) => c.cStatus), ['ATRASADO', 'VENCEHOJE', 'AVENCER']); assert.equal(ab[2].dDtVencDe, '18/11/2026'); assert.equal(ab[2].dDtVencAte, '02/01/2027');
  assert.equal(escritas(a).length, 0, 'a prévia não grava nada');
});

test('conciliação: baixa de conta atrasada com juros vai ao Omie (LancarRecebimento) já conciliada, com o código da baixa no histórico', () => {
  const a = cenario(), r = previa(a);
  const p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', juros: 12.5 });
  assert.equal(p.ok, true, p.mensagem);
  assert.ok(p.resumo.some((x) => x[0] === 'Efeito na conta corrente' && /R\$ 1\.012,50 entram na conta escolhida \(valor baixado R\$ 1\.000,00 \+ juros R\$ 12,50\)/.test(x[1])), JSON.stringify(p.resumo));
  assert.ok(p.resumo.some((x) => x[0] === 'Conciliação' && /conciliar documento" = S/.test(x[1])));
  assert.ok(p.resumo.some((x) => x[0] === 'Saldo em aberto' && /Saldo depois: R\$ 0,00 \(quitado\)/.test(x[1])));
  assert.equal(escritas(a).length, 0);
  const c = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, true, c.mensagem); assert.match(c.mensagem, /^Baixa registrada no Omie \(código da baixa 7001\)/); assert.match(c.mensagem, /título quitado/); assert.equal(c.codigoBaixa, 7001); assert.equal(c.liquidado, 'S');
  const w = escritas(a); assert.equal(w.length, 1); assert.equal(w[0].call, 'LancarRecebimento');
  assert.equal(w[0].param.valor, 1000); assert.equal(w[0].param.juros, 12.5); assert.equal(w[0].param.multa, 0); assert.equal(w[0].param.desconto, 0);
  assert.equal(w[0].param.data, '18/11/2026'); assert.equal(w[0].param.codigo_conta_corrente, 5); assert.equal(w[0].param.conciliar_documento, 'S');
  assert.match(w[0].param.codigo_baixa_integracao, /^CB[0-9a-f]{18}$/);
  const h = a.historico(); assert.equal(h.length, 1); assert.equal(h[0].tipo, 'BAIXA_OMIE'); assert.equal(h[0].codigoBaixa, 7001); assert.equal(h[0].juros, 12.5); assert.equal(h[0].conciliado, 'S'); assert.equal(h[0].liquidado, 'S');
  // trilha das operações do Financeiro com o resultado
  assert.ok(a.trilha().some((x) => /LancarRecebimento/.test(JSON.stringify(x))));
});

test('conciliação: idempotência — o mesmo movimento nunca gera duas baixas (repetir a confirmação, nova prévia, duas prévias abertas)', () => {
  const a = cenario(), r = previa(a);
  const p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '502' });
  const p2 = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '502' }); // outra aba, antes do envio
  assert.equal(p.ok, true, p.mensagem); assert.equal(p2.ok, true, p2.mensagem);
  assert.equal(a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }).ok, true);
  const rep = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }); assert.equal(rep.ok, true); assert.match(rep.mensagem, /já confirmada/);
  const outra = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p2.token }); assert.equal(outra.ok, false); assert.match(outra.mensagem, /já foi tratado|já foi enviada/);
  assert.equal(escritas(a).length, 1, 'uma baixa só');
  const de = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '502' }); assert.equal(de.ok, false); assert.match(de.mensagem, /já foi tratado.*Nada foi enviado/);
  a.limparCache();
  const nova = previa(a); assert.equal(nova.linhas[1].acao, 'nenhuma'); assert.match(nova.linhas[1].status, /Já baixado pelo SGO\+ em 18\/11\/2026 \(código da baixa 7001\)/);
  assert.equal(escritas(a).length, 1);
});

test('conciliação: diferença a menor — desconto quita o título; baixa parcial deixa saldo; a conta precisa fechar com o extrato', () => {
  const a = cenario(), r = previa(a, CSV([['17/11/2026', '950,00', 'PIX RECEBIDO 12345678000195'], ['17/11/2026', '290,00', 'TED RECEBIDA RPS503']]));
  assert.equal(r.linhas[0].candidatos[0].id, '101'); assert.equal(r.linhas[0].candidatos[0].dif, -5000);
  assert.equal(r.linhas[1].candidatos[0].id, '503', 'documento RPS503 citado no extrato');
  const ruim = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', desconto: 40 });
  assert.equal(ruim.ok, true, 'valor 990 cabe no saldo: baixa parcial com desconto'); // valor = 950 + 40 = 990 < 1000
  const d = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', desconto: 50, juros: 1 });
  assert.equal(d.ok, false); assert.match(d.mensagem, /não os dois/);
  const desc = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', desconto: 50 });
  assert.equal(desc.ok, true, desc.mensagem); assert.ok(desc.resumo.some((x) => x[0] === 'Efeito na conta corrente' && /R\$ 950,00 entram .*valor baixado R\$ 1\.000,00 − desconto R\$ 50,00/.test(x[1])));
  assert.ok(desc.resumo.some((x) => /\(quitado\)/.test(x[1])));
  const mais = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', desconto: 60 });
  assert.equal(mais.ok, false); assert.match(mais.mensagem, /passa do saldo em aberto do título/);
  assert.equal(a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: desc.token }).ok, true);
  const w = escritas(a)[0]; assert.equal(w.param.valor, 1000); assert.equal(w.param.desconto, 50); assert.equal(w.param.juros, 0);
  const parc = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '503' });
  assert.equal(parc.ok, true, parc.mensagem); assert.ok(parc.resumo.some((x) => /Saldo depois: R\$ 10,00 \(baixa parcial\)/.test(x[1])));
  assert.equal(a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: parc.token }).liquidado, 'N');
});

test('conciliação: erro da API do Omie — recusa clara (nada feito, pode corrigir e repetir), codigo_status ≠ 0 e envio sem resposta (a conferir, sem reenvio)', () => {
  const a = cenario(), r = previa(a);
  // recusa com motivo (validação do Omie)
  a.falhas.LancarRecebimento = [{ faultstring: 'ERROR: A data da baixa não pode ser anterior à data de abertura da conta corrente.', faultcode: 'SOAP-ENV:Client-102' }];
  let p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '502' });
  let c = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /O Omie recusou a operação: A data da baixa não pode ser anterior/); assert.match(c.mensagem, /Nada foi feito no Omie/);
  assert.equal(a.historico().length, 0);
  // codigo_status diferente de zero (falha de validação documentada): também é recusa, não "envio incerto"
  a.statusBaixa = '1';
  p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 1, tituloId: '502' }); assert.equal(p.ok, true, p.mensagem);
  c = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /recusou a operação: Conta corrente bloqueada/); assert.match(c.mensagem, /Nada foi feito/);
  delete a.statusBaixa;
  assert.equal(a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }).ok, true, 'corrigido no Omie, a mesma prévia vale');
  assert.equal(a.historico().length, 1);
  // sem resposta: fica "a conferir" e não é reenviado; conferido no Omie como feito, o movimento entra no histórico
  a.falhas.LancarRecebimento = ['transporte'];
  p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', juros: 12.5 });
  c = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /não foi confirmado.*Nenhum reenvio automático/);
  assert.match(a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }).mensagem, /precisa ser conferido no Omie/);
  const pend = a.F('OmieConc_apiPendentes', 'wanessa'); assert.equal(pend.itens.length, 1); assert.equal(pend.itens[0].estado, 'incerta');
  const inc = a.F('OmieOps_apiIncertos', 'wanessa'); const item = inc.itens.find((x) => /Baixa/.test(x.descricao));
  assert.equal(a.F('OmieOps_apiResolverIncerto', 'wanessa', { chave: item.chave, desfecho: 'feito', motivo: 'O recebimento aparece no extrato do Omie em 18/11' }).ok, true);
  assert.equal(a.historico().length, 2); assert.equal(a.historico()[1].origem, 'CONFERIDA_NO_OMIE');
  const de = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101', juros: 12.5 }); assert.equal(de.ok, false); assert.match(de.mensagem, /já foi tratado/);
});

test('conciliação: conta a pagar só baixa com o pagamento aprovado (dono ou Diretoria); o minuto do Omie é esperado sem enviar; gravação desligada não envia', () => {
  const a = cenario(), r = previa(a, CSV([['17/11/2026', '-1.000,00', 'PAGAMENTO PIX 98765432000198 FORNECEDOR']]));
  const l = r.linhas[0]; assert.equal(l.acao, 'baixar'); assert.equal(l.candidatos[0].id, '101'); assert.equal(l.candidatos[0].tipo, 'pagar');
  assert.match(l.candidatos[0].aprovacao.texto, /ainda não aprovado/); assert.equal(l.candidatos[0].aprovacao.liberado, false);
  const sem = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101' });
  assert.equal(sem.ok, false); assert.match(sem.mensagem, /ainda não passou pela lista de aprovação/);
  B.listaAprovada(a, [101], 'dora');
  const p = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 0, tituloId: '101' });
  assert.equal(p.ok, true, p.mensagem); assert.ok(p.resumo.some((x) => x[0] === 'Aprovação do pagamento' && /Aprovado por DORA/.test(x[1])));
  // o minuto do Omie: a confirmação antes dele não envia nada e diz quanto falta
  vm.runInContext('OMIE_ESPERA_RECONSULTA_MS = 61000;', a.ctx);
  const cedo = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token });
  assert.equal(cedo.ok, false); assert.ok(cedo.esperar > 0 && cedo.esperar <= 61); assert.match(cedo.mensagem, /Nada foi enviado/); assert.equal(escritas(a).length, 0);
  vm.runInContext('OMIE_ESPERA_RECONSULTA_MS = 0;', a.ctx);
  // gravação desligada: recusa e nada sai
  delete a.props.OMIE_GRAVACAO_LIGADA;
  const des = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }); assert.equal(des.ok, false); assert.match(des.mensagem, /gravação pelo SGO\+ ainda está desligada/); assert.equal(escritas(a).length, 0);
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  const c = a.F('OmieConc_apiBaixaConfirmar', 'wanessa', { token: p.token }); assert.equal(c.ok, true, c.mensagem);
  const w = escritas(a); assert.equal(w.length, 1); assert.equal(w[0].call, 'LancarPagamento'); assert.equal(w[0].param.conciliar_documento, 'S'); assert.equal(w[0].param.valor, 1000);
  assert.equal(a.itensPag().find((x) => String(x.TITULO_OMIE) === '101').SITUACAO, 'PAGO', 'a baixa aprovada marca o item da lista como pago');
});

test('conciliação: título escolhido à mão ("Outro título"), seleção inválida e a conferência local do que já estava baixado continuam funcionando', () => {
  const a = cenario(), r = previa(a);
  assert.match(a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 2 }).mensagem, /Escolha o título do Omie/);
  assert.match(a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 3, tituloId: '101' }).mensagem, /não é baixado pela conciliação/);
  assert.match(a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: 'x', indice: 0, tituloId: '101' }).mensagem, /Prévia inválida/);
  const m = a.F('OmieConc_apiBaixaPrevia', 'wanessa', { token: r.token, indice: 2, tituloId: '504' }); assert.equal(m.ok, true, m.mensagem);
  const conf = a.F('Omie_apiConciliarConfirmar', 'wanessa', { token: r.token, linhas: [3] });
  assert.equal(conf.ok, true, conf.mensagem); assert.equal(conf.registrados, 1); assert.match(conf.mensagem, /já estavam baixados no Omie/);
  assert.equal(a.F('Omie_apiConciliarConfirmar', 'wanessa', { token: r.token, linhas: [0] }).ok, false, 'movimento com título em aberto não vira "conferência"');
  const hist = a.F('Omie_apiConciliacaoHistorico', 'wanessa', { contaId: '5' }); assert.equal(hist.total, 1); assert.equal(hist.itens[0].tipo, 'CONFERENCIA_LOCAL');
});

test('baixa em Lançamentos e baixas: desconto não consome saldo a mais (antes: valor + desconto > saldo recusava a quitação com desconto)', () => {
  const a = cenario();
  const r = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 1000, desconto: 50, data: '2026-11-18' } });
  assert.equal(r.ok, true, r.mensagem);
  assert.ok(r.resumo.some((x) => x[0] === 'Saldo em aberto' && /Saldo depois: R\$ 0,00 \(quitado\)/.test(x[1])));
  assert.ok(r.resumo.some((x) => x[0] === 'Efeito na conta corrente' && /R\$ 950,00 entram/.test(x[1])));
  assert.equal(r.resumo.some((x) => x[0] === 'Conciliação'), false, 'baixa manual não é marcada como conciliada');
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: r.token }).ok, true);
  const w = escritas(a)[0]; assert.equal(w.param.conciliar_documento, undefined); assert.match(w.param.codigo_baixa_integracao, /^SGO/);
});

// ================================================================================================ telas
/** A página completa do SGO+ com o servidor simulado (as funções do Financeiro, inclusive FinCon_, vão ao código real). */
async function abrirPagina(browser, a, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
    if (/^(Omie|OmieOps|OmieConc|OmieRegras|FinCon_api|FinPag|Poderes_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
test('telas: JavaScript válido, texto justificado, sem dado fora do escape; aba de contas usa a tela nova', () => {
  const ler = (f) => fs.readFileSync(path.join(S.PASTA, f), 'utf8');
  for (const f of ['JS_Financeiro_Contas.html', 'JS_Omie_Conciliacao.html']) {
    const h = ler(f); for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
    assert.match(h, /text-align:justify/, f);
  }
  assert.match(ler('JS_Omie_Gestao.html'), /FinConTela_render_\(\)/); assert.match(ler('Index.html'), /include\('JS_Financeiro_Contas'\)/);
  assert.match(ler('SGO_Omie_Sigilo.js'), /FinCon_apiListar: 'Contas a pagar e receber por período'/);
  assert.match(ler('JS_Omie_Ajuda.html'), /finConSituacao:/); assert.match(ler('SGO_Ajuda_Financeiro.js'), /Conciliar o extrato do banco e baixar no Omie/);
});

test('página completa (1366, 390 e 320 px): contas por período com colunas, ordem, agrupamento e planilha; conciliação com a baixa preparada', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const largura of [1366, 390, 320]) {
      const a = cenario();
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
      await page.evaluate(() => OmieTela_abrir_('contas'));
      await page.waitForSelector('#finConCorpo table', { timeout: 15000 });
      const cab = await page.evaluate(() => Array.from(document.querySelectorAll('#finConCorpo thead tr:first-child th')).map((t) => t.textContent.replace(/[▲▼]/g, '').trim()));
      for (const c of ['Situação', 'Nº do documento', 'Parcela', 'Nota fiscal', 'Vencimento', 'Cliente (nome fantasia)', 'Valor da conta', 'Previsão de recebimento', 'Último recebimento', 'Valor líquido', 'Impostos retidos', 'Valor a receber', 'Desconto', 'Juros e multa', 'Valor recebido', 'Categoria', 'Operação']) assert.ok(cab.includes(c), 'coluna ' + c + ' em ' + largura);
      assert.match(await page.locator('#finConAviso').innerText(), /título\(s\) no período/);
      // ordenar por valor (desc) e agrupar por situação
      await page.evaluate(() => { document.querySelector('[data-fin-con-ordem="valor"]').click(); document.querySelector('[data-fin-con-ordem="valor"]').click(); });
      const primeiro = await page.evaluate(() => document.querySelector('#finConCorpo tbody tr td[data-r="Valor da conta"]').textContent);
      assert.match(primeiro, /2\.000,00/);
      await page.selectOption('#finConGrupo', 'sit');
      assert.ok(await page.locator('.fin-con-subtotal').count() >= 4, 'subtotais por situação');
      assert.ok(await page.evaluate(() => OMIE_CSV.contasPeriodo && OMIE_CSV.contasPeriodo.linhas.length === 8 && /Valor da conta \(R\$\)/.test(OMIE_CSV.contasPeriodo.cab.join('|'))), 'planilha com o que está na tela');
      const semDica = await page.evaluate(() => Array.from(document.querySelectorAll('#omieCorpo input, #omieCorpo select')).filter((el) => el.type !== 'hidden' && el.type !== 'checkbox' && !(el.getAttribute('aria-describedby') || '').trim() && !el.closest('.omie-barra')).map((el) => el.name || el.id));
      assert.deepEqual(semDica, [], 'todo campo com explicação');
      assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('.fin-con-intro')).textAlign === 'justify'));
      assert.ok(await S.semRolagem(page), 'contas: sem rolagem lateral em ' + largura);
      if (largura !== 320) await page.screenshot({ path: path.join(saida, largura + '-contas-periodo.png'), fullPage: true });
      // conciliação: prévia com a conta atrasada e a baixa preparada
      await page.evaluate(() => OmieTela_abrir_('conciliacao'));
      await page.waitForFunction(() => document.querySelectorAll('#omieConcConta option').length > 1, null, { timeout: 10000 });
      await page.selectOption('#omieConcConta', '5');
      await page.fill('#omieConcInicio', '2026-11-01'); await page.fill('#omieConcFim', '2026-11-18'); await page.selectOption('#omieConcFormato', 'CSV');
      await page.setInputFiles('#omieConcArquivo', { name: 'extrato.csv', mimeType: 'text/csv', buffer: Buffer.from(EXTRATO, 'utf8') });
      await page.evaluate(() => OmieConc_prever_());
      await page.waitForSelector('.omie-conc-linha', { timeout: 15000 });
      assert.match(await page.locator('[data-conc-linha="0"]').innerText(), /Baixa sugerida com diferença/);
      assert.equal(await page.inputValue('[data-conc-linha="0"] [name="concJuros"]'), '12,50');
      await page.evaluate(() => OmieConc_preparar_(0));
      await page.waitForSelector('[data-conc-linha="0"] .omie-conc-resumo', { timeout: 15000 });
      assert.match(await page.locator('[data-conc-linha="0"] .omie-conc-previa').innerText(), /R\$ 1\.012,50 entram/);
      assert.ok(await S.semRolagem(page), 'conciliação: sem rolagem lateral em ' + largura);
      if (largura !== 320) await page.screenshot({ path: path.join(saida, largura + '-conciliacao-previa.png'), fullPage: true });
      await page.evaluate(() => OmieConc_confirmarBaixa_(0));
      await page.waitForFunction(() => /Baixa registrada no Omie/.test(document.querySelector('[data-conc-linha="0"]').innerText), null, { timeout: 15000 });
      if (largura !== 320) await page.screenshot({ path: path.join(saida, largura + '-conciliacao-baixada.png'), fullPage: true });
      assert.equal(escritas(a).length, 1);
      assert.deepEqual(erros, [], 'sem erro de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});
