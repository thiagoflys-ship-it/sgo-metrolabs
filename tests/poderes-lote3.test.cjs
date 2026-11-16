// Acessos por caixas — LOTE 3 (15/11/2026): Financeiro em Compras. Cada trava pergunta a própria caixa (Cmp_exigirFinCx_ /
// Cmp_cx_, SGO_Compras_Config.js); a regra padrão continua a de hoje; só a alteração gravada em Administração > Acessos muda.
//  1) equivalência: sem exceções, as 23 contas reais recebem, em cada ação do lote, o mesmo resultado e a mesma mensagem do
//     legado de antes (output/financeiro-20261115/lote3-antes);
//  2) exceção NÃO tira (do Financeiro) com a mensagem da caixa, e uma caixa não muda as outras;
//  3) exceção SIM dá (a quem não é do Financeiro), só a caixa liberada;
//  4) catálogo: 6 caixas ligadas; FIN_VER_CONTAS e FIN_CONCILIAR_BANCO desligadas (página antiga aposentada).
// Uso: DEST=<legado> node --require <fontes.cjs> tests/poderes-lote3.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaAntes = process.env.LOTE3_ANTES || path.join(__dirname, '../output/financeiro-20261115/lote3-antes');
const saida = path.join(__dirname, '../output/financeiro-20261115');
const EXTRAS = ['SGO_Compras_Cotacoes.js', 'SGO_Compras_Financeiro.js', 'SGO_Compras_Fornecedores.js', 'SGO_Compras_Painel.js', 'SGO_Compras_Pedido.js',
  'SGO_Compras_Requisicoes.js', 'SGO_Compras_Informar.js', 'SGO_Compras_Relatorios.js'];
const LOTE3 = ['FIN_CONFERIR_COMPRAS', 'FIN_FATURAS_CONCILIAR', 'FIN_A_PAGAR', 'FIN_FATURA_REABRIR', 'FIN_CARTOES_VER', 'FIN_CARTOES_EDITAR'];
const j = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const amb = (pasta) => ambiente(Object.assign({ extras: EXTRAS }, pasta ? { pasta } : {}));
const salvarExc = (a, login, mudancas) => {
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: 'Teste do lote 3 (exceção)', mudancas });
  assert.ok(r && r.ok, 'gravar exceção: ' + JSON.stringify(r));
  a.limparMemo();
};
const eu = (a, login) => a.ctx.Cmp_eu_('s_' + login);
const api = (a, login, acao, d) => { try { const r = a.ctx.Compras_api('s_' + login, acao, j(d)); return acao === 'acesso' ? { podeCartoes: r.podeCartoes, podeConciliar: r.podeConciliar } : { ok: r.ok, message: r.message || '' }; } catch (e) { return { lancou: String(e.message) }; } };
const ACOES = [['conferir', {}], ['financeiro', {}], ['cartoes', {}], ['salvarCartao', {}], ['fatura', {}], ['importarExtrato', {}], ['conciliacao', {}],
  ['fecharFatura', {}], ['fecharFatura', { reabrir: true, motivo: 'reabrir para corrigir a conciliação' }], ['aPagar', {}], ['marcarPago', {}],
  ['gerarRelatorio', { tipo: 'CONCILIACAO' }], ['acesso', {}]];

// 16/11/2026 (sigilo do Financeiro): a única diferença aceita é o texto da recusa do Financeiro, que passou a explicar o sigilo.
const MSG_FIN_ANTES = 'a conferência das compras é do Financeiro (perfil ou área Financeiro), da Diretoria e do Administrador';
const MSG_FIN_AGORA = 'esta parte é do Financeiro, que é sigiloso: só a Diretoria e o Financeiro autorizado a acessam. Para enviar uma informação ao Financeiro, registre o pagamento e o comprovante na ficha da compra';
const normFin = (x) => JSON.stringify(x).split(MSG_FIN_ANTES).join(MSG_FIN_AGORA);
test('1) equivalência: 23 contas reais × ações do lote 3, sem exceções = legado de antes (resultado e mensagem)', () => {
  assert.ok(fs.existsSync(path.join(pastaAntes, 'SGO_Compras_Faturas.js')), 'cópia de antes: ' + pastaAntes);
  assert.ok(!/Cmp_exigirFinCx_/.test(fs.readFileSync(path.join(pastaAntes, 'SGO_Compras_Config.js'), 'utf8')), 'a cópia de antes precisa ser anterior ao lote 3');
  const contas = amb().contas.map((u) => u.login);
  assert.equal(contas.length, 23);
  const divergencias = [];
  let comparacoes = 0, recusadas = 0;
  for (const u of contas) {
    const antes = amb(pastaAntes), depois = amb();
    for (const [acao, d] of ACOES) {
      const ra = api(antes, u, acao, d), rd = api(depois, u, acao, d);
      comparacoes++;
      if (ra.lancou || ra.ok === false) recusadas++;
      if (normFin(ra) !== JSON.stringify(rd)) divergencias.push(u + ' · ' + acao + '\n   antes:  ' + JSON.stringify(ra).slice(0, 300) + '\n   depois: ' + JSON.stringify(rd).slice(0, 300));
    }
    const ea = antes.ctx.CmpFin_acoes_ ? (() => { const o = {}; antes.ctx.CmpFin_acoes_(eu(antes, u), { PEDIDO_ID: '', SITUACAO: 'PEDIDO_FEITO' }, o); return j(o); })() : null;
    const ed = depois.ctx.CmpFin_acoes_ ? (() => { const o = {}; depois.ctx.CmpFin_acoes_(eu(depois, u), { PEDIDO_ID: '', SITUACAO: 'PEDIDO_FEITO' }, o); return j(o); })() : null;
    comparacoes++;
    if (JSON.stringify(ea) !== JSON.stringify(ed)) divergencias.push(u + ' · CmpFin_acoes_');
  }
  fs.writeFileSync(path.join(saida, 'lote3-equivalencia.txt'), 'Lote 3 — equivalência (sem exceções) em ' + new Date().toISOString() + '\ncontas=' + contas.length +
    ' ações=' + (ACOES.length + 1) + ' comparações=' + comparacoes + ' recusadas(antes)=' + recusadas + ' divergências=' + divergencias.length + '\n' + divergencias.join('\n') + '\n');
  assert.equal(divergencias.length, 0, divergencias.slice(0, 5).join('\n'));
  assert.ok(recusadas > 50 && recusadas < comparacoes - 20, 'a sequência precisa ter recusas e liberações: ' + recusadas + '/' + comparacoes);
});

test('2) exceção NÃO tira do Financeiro, com a mensagem da caixa; as outras caixas continuam no padrão', () => {
  const a = amb();
  const fin = a.contas.find((c) => (c.perfil === 'FINANCEIRO' || c.area === 'FINANCEIRO') && !a.ctx.Cmp_ehDono_(c.login));
  assert.ok(fin, 'há uma conta do Financeiro');
  const L = fin.login;
  assert.notEqual(api(a, L, 'aPagar', {}).message.indexOf('permissão'), 0);
  const antesConc = api(a, L, 'conciliacao', {});
  salvarExc(a, L, [{ codigo: 'FIN_A_PAGAR', valor: 'NAO' }, { codigo: 'FIN_CARTOES_EDITAR', valor: 'NAO' }]);
  assert.match(api(a, L, 'aPagar', {}).message, /«Ver e baixar o que há a pagar» para ver o que há a pagar/);
  assert.match(api(a, L, 'marcarPago', {}).message, /«Ver e baixar o que há a pagar»/);
  assert.match(api(a, L, 'salvarCartao', {}).message, /«Cadastrar e alterar cartões»[\s\S]*Administração > Acessos/);
  assert.deepEqual(api(a, L, 'conciliacao', {}), antesConc, 'a conciliação das faturas segue o padrão');
  assert.equal(eu(a, L).financeiro, true, 'eu.financeiro não é sobrescrito pela caixa');
  salvarExc(a, L, [{ codigo: 'FIN_CONFERIR_COMPRAS', valor: 'NAO' }]);
  assert.match(api(a, L, 'financeiro', {}).message, /«Conferir compras \(Financeiro\)»/);
  assert.match(api(a, L, 'gerarRelatorio', { tipo: 'CONCILIACAO' }).message, /«Conferir compras \(Financeiro\)»/);
});

test('3) exceção SIM: o Financeiro não se libera para quem está fora da lista de sigilo; ver cartões libera sem o limite', () => {
  // 16/11/2026 (sigilo do Financeiro, pedido do dono): antes a exceção SIM dava o A pagar a um técnico; agora é recusada
  const a = amb();
  const tec = a.contas.find((c) => c.perfil === 'TECNICO' && !a.ctx.Cmp_ehDono_(c.login));
  assert.ok(tec, 'há um técnico');
  const L = tec.login;
  const semPoder = api(a, L, 'aPagar', {});
  assert.ok(semPoder.ok === false || semPoder.lancou, 'padrão: técnico não vê o a pagar');
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(L), motivo: 'Teste do sigilo do Financeiro', mudancas: [{ codigo: 'FIN_A_PAGAR', valor: 'SIM' }] });
  assert.equal(r.ok, false, 'SIM em A pagar para quem está fora da lista é recusado');
  assert.match(r.message, /sigilosa/);
  assert.ok(!(a.tabelas.SYS_PODERES_EXCECOES || []).some((l) => l.PODER === 'FIN_A_PAGAR'), 'nada gravado');
  assert.match(api(a, L, 'aPagar', {}).message, /sigiloso/);
  salvarExc(a, L, [{ codigo: 'FIN_CARTOES_VER', valor: 'SIM' }]);
  const k = j(a.ctx.Compras_api('s_' + L, 'cartoes', {}));
  assert.equal(k.ok, true, 'SIM em Ver cartões libera a lista (final e responsável)');
  assert.ok((k.cartoes || []).every((c) => c.limite === '' && c.limiteTxt === ''), 'sem o limite fora da lista');
  const conc = api(a, L, 'conciliacao', {});
  assert.ok(conc.ok === false || conc.lancou, 'a conciliação das faturas continua fechada');
  assert.equal(api(a, L, 'acesso', {}).podeConciliar, false);
});

test('4) catálogo: as 6 caixas do lote 3 ligadas; as da página antiga desligadas', () => {
  const a = amb();
  const ligados = Array.from(a.ctx.SGO_PODERES_LIGADOS);
  LOTE3.forEach((c) => assert.ok(ligados.includes(c), c + ' ligado'));
  assert.ok(!ligados.includes('FIN_VER_CONTAS') && !ligados.includes('FIN_CONCILIAR_BANCO'));
});
