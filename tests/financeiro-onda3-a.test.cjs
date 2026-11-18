// Onda 3, bloco A (16/11/2026, decisão do dono confirmada): "no começo somente eu e o Charles aprovam" — vale para TODAS as
// aprovações financeiras. Configuração APROVACAO_SO_DIRETORIA (Chaves e senhas > Regras do Financeiro; vazio/SIM = só dono e
// Diretoria; NAO = regras de antes). Código REAL de Compras, Depósito de viagem, Poderes e Omie, com dados fictícios.
// Os testes antigos (compras, poderes-lote5, deposito-viagem...) rodam com NAO e provam que as regras de antes voltam.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_compras_ambiente.cjs');
const V = require('./_viagem_ambiente.cjs');
const S = require('./_financeiro_simulado.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message || r.mensagem); return r; };
const recusa = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); assert.match(r.message || r.mensagem, re); return r; };
const SIM = { props: { APROVACAO_SO_DIRETORIA: 'SIM' } };

// ---------------------------------------------------------------- Compras
function comprasAmb(o) {
  const amb = C.ambiente(o);
  C.regrasDeTeste(amb);
  amb.fs = C.fornecedoresDeTeste(amb);
  amb.pend = (sid) => amb.ctx.SGO_Pendencias_listar(sid, { semCache: true }).itens;
  amb.caixa = () => amb.ctx.Ges_caixa_().itens.filter((i) => /^compras/.test(i.tipo));
  return amb;
}
function emAprovacao(amb, preco, sid) {
  const r = C.pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: 'Ferramenta de teste', quantidade: 1, unidade: 'un.' }] }, sid || 's_tiago');
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  const q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  const t = ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[0].id, precos: [{ itemId: q.itens[0].id, precoUnitario: preco }], prazoDias: 5, validade: '2026-11-10', arquivo: C.PDF })).requisicao;
  // 18/11/2026 (Pacote 1, decisão do dono): com SIM, a compra vai à aprovação com 3 orçamentos (regra do aprovador delegado); com 1 só, o
  // comprador justifica em qualquer faixa. Ajustado de propósito: antes a justificativa só era pedida acima de R$ 1.000 (faixas).
  const extra = Number(String(preco).replace(/\./g, '').replace(',', '.')) > 1000 || amb.props.APROVACAO_SO_DIRETORIA !== 'NAO' ? { justificativaMinimo: 'Fornecedor único da peça no ensaio automático' } : {};
  const e = ok(amb.api('s_carlos', 'escolher', Object.assign({ requisicaoId: q.id, cotacaoId: t.cotacoes[0].id }, extra)));
  return { id: q.id, e };
}

test('Chaves e senhas: "Aprovação só do dono e da Diretoria" no grupo Regras do Financeiro, padrão Sim, só Sim ou Não', () => {
  const a = S.montar();
  const item = a.ctx.CHV_ITENS.find((i) => i.chave === 'APROVACAO_SO_DIRETORIA');
  assert.equal(item.grupo, 'Regras do Financeiro'); assert.match(item.vazio, /^Sim/); assert.ok(item.ajuda.length > 200);
  assert.equal(a.ctx.Chaves_validarValor_(item, 'nao'), 'NAO'); assert.equal(a.ctx.Chaves_validarValor_(item, 'Não'), 'NAO'); assert.equal(a.ctx.Chaves_validarValor_(item, 'sim'), 'SIM');
  assert.throws(() => a.ctx.Chaves_validarValor_(item, 'talvez'), /escolha uma das opções/);
  assert.equal(a.props.APROVACAO_SO_DIRETORIA, undefined, 'sem valor gravado');
  assert.equal(a.ctx.SGO_aprovacaoSoDiretoria_(), true, 'vazio = SIM');
  a.props.APROVACAO_SO_DIRETORIA = 'NAO'; assert.equal(a.ctx.SGO_aprovacaoSoDiretoria_(), false);
});

test('Compras com SIM: nem a faixa do comprador é aprovada na escolha; comprador e gestor não aprovam; a Diretoria aprova', () => {
  const amb = comprasAmb(SIM);
  const p = emAprovacao(amb, '150,00');
  assert.equal(p.e.requisicao.situacao, 'AGUARDANDO_APROVACAO', 'na faixa do comprador a escolha não aprova');
  assert.deepEqual(p.e.requisicao.aprovacao.quem.slice().sort(), ['DAVI DIRETOR TESTE', 'DORA DIRETORA TESTE']);
  assert.match(p.e.requisicao.aprovacao.nivelNome, /Dono e Diretoria/);
  for (const sid of ['s_sara', 's_carlos', 's_lia', 's_gil', 's_fabio']) recusa(amb.api(sid, 'decidir', { requisicaoId: p.id, aprovar: true }), /(Você não aprova esta compra: por decisão do dono, no começo só o dono do sistema e a Diretoria aprovam[\s\S]*Quem aprova: [\s\S]*DORA|lançou ou escolheu orçamento|permissão)/);
  const sara = amb.api('s_sara', 'decidir', { requisicaoId: p.id, aprovar: true }); assert.match(sara.message, /só o dono do sistema e a Diretoria aprovam/);
  // pendência: só dono e Diretoria; nenhum item para o comprador substituto
  assert.equal(amb.pend('s_sara').filter((i) => /^compras_aprovar/.test(i.tipo)).length, 0);
  assert.equal(amb.pend('s_dora').filter((i) => /^compras_aprovar/.test(i.tipo)).length, 1);
  const cx = amb.caixa(); assert.equal(cx.length, 1); assert.equal(cx[0].soDiretoria, true); assert.deepEqual(cx[0].responsaveis.slice().sort(), ['u_dir', 'u_dir2']);
  const d = ok(amb.api('s_dora', 'decidir', { requisicaoId: p.id, aprovar: true, texto: 'Ferramenta necessária para o atendimento' }));
  assert.equal(d.requisicao.situacao, 'APROVADA');
});

test('Compras com SIM: quem pediu nunca aprova o próprio pedido (pedido da Diretoria aprova o outro diretor)', () => {
  const amb = comprasAmb(SIM);
  const p = emAprovacao(amb, '5.000,00', 's_dora');
  assert.deepEqual(p.e.requisicao.aprovacao.quem, ['DAVI DIRETOR TESTE']);
  recusa(amb.api('s_dora', 'decidir', { requisicaoId: p.id, aprovar: true }), /Quem pediu não aprova a própria compra/);
  assert.equal(ok(amb.api('s_davi', 'decidir', { requisicaoId: p.id, aprovar: true })).requisicao.situacao, 'APROVADA');
});

test('Compras: a compra que aguardava o gestor passa ao dono e à Diretoria quando a configuração vira SIM; com NAO volta ao gestor', () => {
  const amb = comprasAmb(); // NAO (regras de antes)
  const p = emAprovacao(amb, '5.000,00');
  const antes = amb.caixa()[0];
  assert.ok(!antes.soDiretoria, 'faixa do gestor: gestor da área'); assert.ok(antes.responsaveis.includes('u_gt') || antes.responsaveis.includes('u_log') || antes.responsaveis.length > 0);
  amb.props.APROVACAO_SO_DIRETORIA = 'SIM';
  const depois = amb.caixa()[0];
  assert.equal(depois.soDiretoria, true); assert.deepEqual(depois.responsaveis.slice().sort(), ['u_dir', 'u_dir2']);
  const quem = ok(amb.api('s_tiago', 'meus')).requisicoes.length; assert.ok(quem >= 1);
  for (const g of antes.responsaveis.filter((id) => !['u_dir', 'u_dir2'].includes(id))) {
    const login = amb.tabelas.CAD_USUARIOS.find((u) => u.ID === g).USUARIO;
    recusa(amb.api('s_' + login, 'decidir', { requisicaoId: p.id, aprovar: true }), /só o dono do sistema e a Diretoria/);
  }
  // as caixas de alçada não valem com SIM, mesmo marcadas
  const r = amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === p.id);
  const pa = amb.ctx.CmpC_podeAprovar_({ id: 'u_log', cx: { COMPRAS_APROVAR_SEM_LIMITE: 'SIM', COMPRAS_APROVAR_DA_AREA: 'SIM', COMPRAS_APROVAR_ATE_LIMITE: 'SIM' }, area: 'LOGISTICA' }, r);
  assert.equal(pa.pode, false);
  // NAO: volta ao gestor
  amb.props.APROVACAO_SO_DIRETORIA = 'NAO';
  assert.deepEqual(amb.caixa()[0].responsaveis, antes.responsaveis);
  // e, com NAO, a faixa do comprador volta a ser aprovada na escolha
  const p2 = emAprovacao(amb, '150,00');
  assert.equal(p2.e.requisicao.situacao, 'APROVADA');
});

// ---------------------------------------------------------------- Depósito de viagem
test('Depósito de viagem com SIM: uma etapa só, direto ao dono e à Diretoria; a gerência não aprova; quem pede ou viaja não aprova', () => {
  const a = V.ambiente(SIM);
  const s = V.criarCompleta(a);
  const e = a.ok(a.v('gil', 'enviar', { id: s.id }));
  assert.equal(e.solicitacao.situacao, 'AGUARDANDO_DIRETORIA');
  assert.match(e.message, /DORA DIRETORA TESTE/); assert.doesNotMatch(e.message, /MATHEUS/);
  const m = a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' });
  assert.equal(m.ok, false); assert.match(m.message, /Você não aprova esta solicitação: por decisão do dono, no começo só o dono e a Diretoria aprovam/);
  assert.equal(a.v('wanessa', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' }).ok, false);
  const d = a.ok(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde', revisao: 0 }));
  assert.equal(d.solicitacao.situacao, 'APROVADA', 'uma etapa só');
  assert.equal(a.tabelas.VIA_DECISOES.filter((x) => x.SOLICITACAO_ID === s.id).length, 1);
  // a Diretoria que viaja não aprova a própria
  const s2 = V.criarCompleta(a, 'gil', { equipe: [{ id: 'u_dir', funcao: 'TECNICO' }, { id: 'u_tec2', funcao: 'TECNICO' }], responsavelId: 'u_dir', saidaEm: '2026-11-02T07:00', chegadaEm: '2026-11-05T18:00' });
  a.ok(a.v('gil', 'enviar', { id: s2.id }));
  const r2 = a.v('dora', 'decidir', { id: s2.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' });
  assert.equal(r2.ok, false); assert.match(r2.message, /viaja nesta solicitação, e ninguém aprova a própria despesa/);
});

test('Depósito de viagem: o que aguardava a gerência passa à Diretoria com SIM (uma etapa); com NAO o Matheus aprova como antes', () => {
  const a = V.ambiente(); // NAO
  const s = V.criarCompleta(a);
  assert.equal(a.ok(a.v('gil', 'enviar', { id: s.id })).solicitacao.situacao, 'AGUARDANDO_APROVACAO');
  a.props.APROVACAO_SO_DIRETORIA = 'SIM';
  const it = [];
  a.ctx.Viagem_fontePendencias_((x) => it.push(x), a.ctx.Pend_contextoInterno_());
  const ap = it.find((x) => /^viagem_(aprovar|diretoria)$/.test(x.tipo));
  assert.equal(ap.tipo, 'viagem_diretoria'); assert.ok(!ap.paraUsuarios.includes('u_mat')); assert.ok(ap.paraUsuarios.includes('u_dir'));
  assert.equal(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' }).ok, false);
  const d = a.ok(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' }));
  assert.equal(d.solicitacao.situacao, 'APROVADA');
  // NAO: o Matheus aprova
  a.props.APROVACAO_SO_DIRETORIA = 'NAO';
  const s3 = V.criarCompleta(a, 'gil', { saidaEm: '2026-11-09T07:00', chegadaEm: '2026-11-12T18:00' });
  a.ok(a.v('gil', 'enviar', { id: s3.id }));
  assert.equal(a.ok(a.v('matheusgodoi', 'decidir', { id: s3.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado em Rio Verde' })).solicitacao.situacao, 'APROVADA');
});

// ---------------------------------------------------------------- Omie (alçada)
test('Alçada do Omie: com SIM o Financeiro não aprova; com NAO qualquer outra pessoa da lista de sigilo aprova, como antes', () => {
  const a = S.montar(); a.saldo = 50000; a.props.OMIE_ALCADA_APROVACAO = '1000';
  const p = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'pagar', id: 101, dados: { contaId: 5, valor: 2000, data: '2026-11-16' } }); assert.equal(p.ok, true, p.mensagem);
  const chave = a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0].chave;
  assert.equal(a.f('OmieRegras_apiDecidir', 'fabio', { chave, decisao: 'aprovar' }).ok, false);
  a.props.APROVACAO_SO_DIRETORIA = 'NAO';
  assert.equal(a.f('OmieRegras_apiDecidir', 'fabio', { chave, decisao: 'aprovar' }).ok, true);
  assert.match(a.f('OmieRegras_apiTela', 'wanessa').config ? JSON.stringify(a.f('OmieRegras_apiTela', 'wanessa').config) : '', /"soDiretoria":false/);
});
