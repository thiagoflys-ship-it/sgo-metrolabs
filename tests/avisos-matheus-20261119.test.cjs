// 19/11/2026 — "O Matheus disse que não está recebendo os pedidos de autorização no WhatsApp nem no e-mail" (dono).
// Diagnóstico (output/avisos-matheus-20261119/DIAGNOSTICO.md): os GS08–GS11 estavam ligados, mas os gatilhos eram estreitos (a compra
// informada não avisava) e o Matheus só decidia depois de 15/30 minutos. Pedido novo do dono: o Matheus recebe NA HORA e decide NA HORA
// os pedidos de Compras e de preço do Comercial, com os mesmos critérios e sem decidir o próprio pedido; a espera vira configuração com
// padrão 0; o dono e o Charles continuam decidindo e recebem cada decisão dele (GS10). O que hoje cai só na Diretoria e não é dinheiro
// nem sigilo vai também ao decisor operacional (Caixa de decisões). Código REAL do SGO+; WhatsApp e e-mail são simuladores; nada sai.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('./_compras_ambiente.cjs');
const CA = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const recusa = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); assert.match(r.message, re); return r; };
const FONE_MAT = '5562999990077';
const B64 = (t) => Buffer.from(t).toString('base64');
const gs = (amb, ev) => (amb.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === ev);
const ids = (l) => l.map((x) => x.USUARIO_ID).sort();
const whatsPara = (amb, fone) => amb.whats.filter((w) => w.corpo && w.corpo.to === fone);

function carregarAvisos(ctx) {
  for (const f of ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js']) {
    const p = path.join(PASTA, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  }
  ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
}

/** Compras com a aprovação só do dono e da Diretoria (SIM, produção), o dono (admin), a Diretoria e o Matheus. Regra do delegado no padrão. */
function montarCompras(o) {
  o = o || {};
  const amb = C.ambiente({ agora: o.agora, props: Object.assign({ APROVACAO_SO_DIRETORIA: 'SIM', META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456' }, o.props || {}) });
  const us = amb.tabelas.CAD_USUARIOS, u = (id) => us.find((x) => x.ID === id);
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' });
  u('u_dir').CELULAR = '62999990010';
  us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE' });
  amb.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
  carregarAvisos(amb.ctx);
  C.regrasDeTeste(amb);
  amb.fs = C.fornecedoresDeTeste(amb);
  return amb;
}
/** Pedido do técnico, cotado com 3 orçamentos (ou só os preços dados) e escolhido. */
function emAprovacao(amb, o) {
  o = o || {};
  const r = C.pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: 'Ferramenta de teste', quantidade: 1, unidade: 'un.' }] }, o.sid || 's_tiago');
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  let q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  (o.precos || ['150,00', '180,00', '210,00']).forEach((p, i) => { q = ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[i].id, precos: [{ itemId: q.itens[0].id, precoUnitario: p }], prazoDias: 5, validade: '2026-11-30', arquivo: C.PDF })).requisicao; });
  const alvo = q.cotacoes.filter((c) => c.situacao !== 'RETIRADA').sort((a, b) => a.total - b.total)[0];
  const e = ok(amb.api('s_carlos', 'escolher', Object.assign({ requisicaoId: q.id, cotacaoId: alvo.id }, o.extra || {})));
  return { id: q.id, numero: q.numero, e };
}

// ------------------------------------------------------------------ Compras
test('AM-1: a espera do aprovador delegado de Compras é 0 por padrão; a regra de 18/11 gravada com 30 minutos (sem esperaMinutos) deixa de valer', () => {
  const amb = montarCompras();
  const L = amb.ctx.Cmp_delegadoLimpo_;
  assert.equal(L({}).prazoMinutos, 0);
  assert.equal(L({ ligado: true, aprovadorIds: null, prazoMinutos: 30, contaDe: 'POSTADO', minimoOrcamentos: 3, tetoValor: null, whatsappTres: true }).prazoMinutos, 0, 'o que está em produção (v4) passa a 0');
  assert.equal(L({ esperaMinutos: '45' }).prazoMinutos, 45, 'configurável');
  const r = ok(amb.api('s_dora', 'regras', {}));
  assert.equal(r.delegado.regra.esperaMinutos, 0);
  const g = r.regras;
  recusa(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { esperaMinutos: '-1' }) }), motivo: 'Espera negativa de teste' }), /de 0 a 2\.880 minutos/);
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { esperaMinutos: '0' }) }), motivo: 'Decisão na hora, pedido do dono de 19/11' }));
});

test('AM-2: escolhido o orçamento (sábado à noite), o Matheus recebe NA HORA por WhatsApp e e-mail (GS09) e decide NA HORA; o dono e a Diretoria recebem o GS06 e a decisão dele (GS10)', () => {
  const amb = montarCompras({ agora: Date.parse('2026-10-24T22:00:00-03:00') });
  const p = emAprovacao(amb);
  assert.match(p.e.message, /MATHEUS GODOI \(aprovador delegado\) foi avisado na hora e também pode decidir\./);
  const g9 = gs(amb, 'GS09');
  assert.deepEqual(ids(g9), ['u_mat'], 'o dono e a Diretoria recebem o GS06, não o GS09 repetido');
  assert.equal(g9[0].WA_SITUACAO, 'ENVIADO', 'fora do expediente: saiu na hora'); assert.equal(g9[0].EMAIL_SITUACAO, 'ENVIADO');
  assert.match(g9[0].TITULO, /Aprovação · Compras: compra REQ-2026-\d+ \(Ferramenta de teste\), R\$ 150,00, MATHEUS GODOI pode decidir agora/);
  assert.match(g9[0].TEXTO, /Critérios cumpridos: 3 orçamentos válidos/);
  assert.equal(whatsPara(amb, FONE_MAT).length >= 1, true);
  assert.deepEqual(ids(gs(amb, 'GS06')), ['u_adm', 'u_dir', 'u_dir2']);
  assert.match(gs(amb, 'GS06')[0].TEXTO, /MATHEUS GODOI \(aprovador delegado\) recebeu este pedido na hora e também pode decidir\./);
  // a ficha: decisão na hora, sem contagem
  const f = ok(amb.api('s_matheusgodoi', 'requisicao', { id: p.id })).requisicao;
  assert.equal(f.aprovacao.podeEu, true); assert.equal(f.aprovacao.delegado.prazoMinutos, 0); assert.equal(f.aprovacao.delegado.decideComoDelegado, true);
  // a rodada não repete o aviso
  amb.ctx.CmpC_rodadaDelegado_(new amb.ctx.Date());
  assert.equal(gs(amb, 'GS09').length, 1);
  // na Caixa de decisões, a compra também é dele (e ele a vê, embora o item seja da Diretoria)
  const it = amb.ctx.Ges_caixa_().itens.find((i) => i.id === 'CMP:APROVAR:' + p.id);
  assert.ok(it && it.responsaveis.includes('u_mat') && it.responsaveis.includes('u_dir'), 'responsáveis: ' + (it && it.responsaveis));
  const cx = amb.ctx.Gestao_apiCaixa('s_matheusgodoi', { filtro: 'minhas' });
  assert.equal(cx.ok, true, cx.message);
  assert.ok(JSON.stringify(cx).indexOf('CMP:APROVAR:' + p.id) >= 0, 'a compra aparece na Caixa do Matheus');
  const d = ok(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true, texto: 'Ferramenta para o atendimento de segunda' }));
  assert.equal(d.requisicao.situacao, 'APROVADA');
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === p.id);
  assert.match(req.DECISAO_CRITERIO, /^decisão na hora \(regra do dono de 19\/11\/2026, espera de 0 minutos\); 3 orçamentos válidos[\s\S]*não pediu nem cotou/);
  const g10 = gs(amb, 'GS10');
  assert.deepEqual(ids(g10), ['u_adm', 'u_dir', 'u_dir2']);
  assert.match(g10[0].TITULO, /MATHEUS GODOI aprovou a compra REQ-2026-\d+ \(Ferramenta de teste\), R\$ 150,00, como aprovador delegado/);
  assert.match(g10[0].TEXTO, /decisão na hora, regra do dono de 19\/11\/2026/);
});

test('AM-3: pedido do próprio Matheus não vai a ele e ele não decide (vai ao dono e à Diretoria); o dono decide na hora', () => {
  const amb = montarCompras();
  const p = emAprovacao(amb, { sid: 's_matheusgodoi' });
  assert.equal(gs(amb, 'GS09').length, 0);
  assert.deepEqual(ids(gs(amb, 'GS06')), ['u_adm', 'u_dir', 'u_dir2']);
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /Quem pediu não aprova a própria compra/);
  ok(amb.api('s_admin', 'decidir', { requisicaoId: p.id, aprovar: true, texto: 'Aprovado pelo dono' }));
});

test('AM-4: sem os critérios (1 orçamento com justificativa), o Matheus recebe o pedido dizendo o que falta, mas não decide; a decisão fica com o dono e a Diretoria', () => {
  const amb = montarCompras();
  const r = C.pedidoSimples(amb);
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  let q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  q = ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[0].id, precos: [{ itemId: q.itens[0].id, precoUnitario: '90,00' }], prazoDias: 5, validade: '2026-11-30', arquivo: C.PDF })).requisicao;
  ok(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: q.cotacoes[0].id, justificativaMinimo: 'Fornecedor único da peça original do fabricante' }));
  const g9 = gs(amb, 'GS09');
  assert.deepEqual(ids(g9), ['u_mat']);
  assert.match(g9[0].TITULO, /aguarda o dono ou a Diretoria \(falta critério para o aprovador delegado\)/);
  assert.match(g9[0].TEXTO, /Falta para o aprovador delegado decidir: pelo menos 3 orçamentos válidos[\s\S]*Por quê:[\s\S]*O que fazer:/);
  assert.equal(String(amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === q.id).DELEGADO_AVISADO_EM || ''), '');
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: q.id, aprovar: true }), /Como aprovador delegado, você decide na hora quando se cumprir a regra; falta: pelo menos 3 orçamentos válidos/);
  ok(amb.api('s_dora', 'decidir', { requisicaoId: q.id, aprovar: true, texto: 'Fornecedor único conferido' }));
});

test('AM-5: a compra informada depois de feita avisa na hora o dono, a Diretoria e o Matheus (GS08, para conhecimento); quem informou fica fora', () => {
  const amb = montarCompras();
  const comp = (n) => ({ nome: 'comprovante' + n + '.jpg', tipo: 'image/jpeg', base64: B64('comprovante de teste ' + n) });
  const base = (extra) => Object.assign({ finalidade: 'Peças para a manutenção do equipamento do cliente', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ descricao: 'Rolamento 6204', quantidade: 2, unidade: 'un.' }], fornecedorNome: 'Loja de Peças Teste', valor: '80,00', formaPagamento: 'CARTAO_CREDITO',
    cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-19', nfNumero: '12345', recebido: true, destino: 'Matriz Goiânia/GO' }, extra || {});
  const r = ok(amb.api('s_tiago', 'informar', base({ comprovante: comp('a') })));
  assert.equal(r.gravada, true, r.message);
  const g8 = gs(amb, 'GS08');
  assert.deepEqual(ids(g8), ['u_adm', 'u_dir', 'u_dir2', 'u_mat']);
  const m = g8.find((l) => l.USUARIO_ID === 'u_mat');
  assert.match(m.TITULO, new RegExp('Compra informada \\(já feita\\) ' + r.numero + ', de TIAGO TECNICO TESTE'));
  assert.match(m.TEXTO, /Onde: Loja de Peças Teste, em 19\/10\/2026\. Valor: R\$ 80,00\.[\s\S]*Para conhecimento/);
  assert.equal(m.SITUACAO, 'RESOLVIDO', 'informativo: não pede ação'); assert.equal(m.WA_SITUACAO, 'ENVIADO');
  // o Matheus informa a compra dele: os outros três recebem, ele não
  const antes = gs(amb, 'GS08').length;
  ok(amb.api('s_matheusgodoi', 'informar', base({ comprovante: comp('b'), valor: '95,00', itens: [{ descricao: 'Fita isolante', quantidade: 1, unidade: 'un.' }] })));
  assert.deepEqual(ids(gs(amb, 'GS08').slice(antes)), ['u_adm', 'u_dir', 'u_dir2']);
});

// ------------------------------------------------------------------ Caixa de decisões: decisor operacional
test('AM-6: reserva da Diretoria que não é dinheiro nem sigilo vai também ao Matheus (decisor operacional); dinheiro, conduta, sigilo e o próprio item ficam fora; configurável', () => {
  const amb = montarCompras();
  const X = amb.ctx, us = X.Ges_usuarios_(), cfg = X.Ges_cfg_();
  const rot = (it, c) => Array.from(X.Ges_rotear_(Object.assign({ modulo: 'gestao', extra: {} }, it), c || cfg, us).ids).sort();
  assert.deepEqual(rot({ tipo: 'plano_atrasado', extra: { soDiretoria: true } }), ['u_adm', 'u_dir', 'u_dir2', 'u_mat']);
  assert.deepEqual(rot({ tipo: 'comercial_sem_proxima', modulo: 'comercial', extra: { area: 'COMERCIAL' } }), ['u_adm', 'u_dir', 'u_dir2', 'u_mat'], 'área sem gestor: reserva + Matheus');
  assert.ok(!rot({ tipo: 'atividade_justificativa', modulo: 'atividades', responsavelId: 'u_mat', extra: { soDiretoria: true } }).includes('u_mat'), 'ninguém decide sobre si mesmo');
  for (const it of [{ tipo: 'fin_pag_aprovar', modulo: 'financeiro', extra: { soDiretoria: true, sigiloFin: true } }, { tipo: 'fin_orc_aprovar', extra: { soDiretoria: true } },
    { tipo: 'fin_estorno_decidir', extra: { soDiretoria: true } }, { tipo: 'viagem_aprovar', modulo: 'viagem', extra: { soDiretoria: true } }, { tipo: 'recarga_aprovar', extra: { soDiretoria: true } },
    { tipo: 'ganhos_aprovar', extra: { soDiretoria: true } }, { tipo: 'conduta_sugestao', modulo: 'conduta', extra: { soDiretoria: true } }, { tipo: 'ponto_ajuste_parado', modulo: 'ponto', extra: { soDiretoria: true } },
    { tipo: 'compras_aprovar', modulo: 'compras', extra: { soDiretoria: true } }, { tipo: 'qualidade_os', extra: { soDiretoria: true, sigilo: true } }, { tipo: 'plano_atrasado', publico: 'DIRETORIA', extra: { soDiretoria: true } }]) {
    assert.ok(!rot(it).includes('u_mat'), it.tipo + ' fica só com a Diretoria');
  }
  // área com gestor configurado: nada muda
  assert.deepEqual(rot({ tipo: 'plano_atrasado', extra: { area: 'LOGISTICA' } }, Object.assign({}, cfg, { gestoresPorArea: { LOGISTICA: ['u_log'] } })), ['u_log']);
  // configuração: desligado e tipo a mais fora
  const off = JSON.parse(JSON.stringify(cfg)); off.decisorOperacional.ligado = false;
  assert.ok(!rot({ tipo: 'plano_atrasado', extra: { soDiretoria: true } }, off).includes('u_mat'));
  const fora = JSON.parse(JSON.stringify(cfg)); fora.decisorOperacional.tiposFora = ['plano_atrasado'];
  assert.ok(!rot({ tipo: 'plano_atrasado', extra: { soDiretoria: true } }, fora).includes('u_mat'));
  // tela de regras: mostra quem está em uso; só gestão fora da Diretoria; grava ligado/desligado
  const t = X.Gestao_apiConfig('s_dora', {});
  assert.equal(t.ok, true, t.message); assert.deepEqual(Array.from(t.operacional.nomes), ['MATHEUS GODOI']); assert.match(t.operacional.foraFixo, /depósito de viagem, Recarga Caju/);
  const base = { gestoresPorArea: t.cfg.gestoresPorArea, areaPorModulo: t.cfg.areaPorModulo, escada: t.cfg.escada, automacoes: t.cfg.automacoes };
  const r1 = X.Gestao_apiConfig('s_dora', { salvar: Object.assign({}, base, { decisorOperacional: { ligado: true, ids: ['u_dir'] } }) });
  assert.equal(r1.ok, false); assert.match(r1.message, /fora da Diretoria/);
  const r2 = X.Gestao_apiConfig('s_dora', { salvar: Object.assign({}, base, { decisorOperacional: { ligado: false, ids: null, tiposFora: 'plano_atrasado, x' } }) });
  assert.equal(r2.ok, true, r2.message); assert.equal(r2.cfg.decisorOperacional.ligado, false); assert.deepEqual(Array.from(r2.cfg.decisorOperacional.tiposFora), ['plano_atrasado']);
  assert.deepEqual(Array.from(r2.operacional.nomes), []);
  const r3 = X.Gestao_apiConfig('s_tiago', { salvar: Object.assign({}, base, { decisorOperacional: { ligado: true } }) });
  assert.equal(r3.ok, false);
});

// ------------------------------------------------------------------ Comercial
function montarComercial(o) {
  o = o || {};
  const a = CA.ambiente({ agora: Date.parse(o.agora || '2026-10-19T10:46:00-03:00'),
    props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc', 'u_mat'] } }) } });
  const us = a.tabelas.CAD_USUARIOS, u = (id) => us.find((x) => x.ID === id);
  u('u_dir').CELULAR = '62999990010';
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA' });
  us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE' });
  a.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
  carregarAvisos(a.ctx);
  return a;
}
const COM_CUSTO = { CUSTO: 900, PRECO_PEDIDO_SITUACAO: 'PENDENTE', PRECO_PEDIDO: 2100, PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T09:00' };
function pedir(a, preco, sid, prod) {
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  a.tabelas.COM_PRODUTOS.push(Object.assign({ ID: 'prod_bat', CODIGO: 'BAT-01', NOME: 'Bateria estacionária de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 2100, CUSTO: '', ATIVO: 'SIM',
    ATUALIZADO_POR_NOME: 'VERA VENDEDORA TESTE', CRIADO_EM: '2026-11-05T14:30:00.000Z' }, prod || {}));
  const { oportunidade, contato } = CA.oportunidadeDeTeste(a);
  const np = ok(a.api(sid || 's_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api(sid || 's_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: CA.SEM_VIAGEM, escopo: 'Troca da bateria do equipamento de teste do cliente.', contatoId: contato.id,
    itens: [{ produtoId: 'prod_bat', descricao: 'Bateria estacionária de teste', quantidade: 1, precoUnitario: preco }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' } }));
  ok(a.api(sid || 's_vera', 'concluirProposta', { id: np.proposta.id, justificativa: 'Cliente recebeu orçamento de outro equipamento esta semana' }));
  return np.proposta.id;
}

test('AM-7: preço fora da política (segunda à noite): o Matheus recebe NA HORA (GS11) e autoriza NA HORA com o critério de preço; o dono e a Diretoria recebem o GS04 e a autorização (GS10); a rodada não repete', () => {
  const a = montarComercial({ agora: '2026-10-19T21:30:00-03:00' });
  assert.equal(a.ctx.ComDel_cfg_().prazoMinutos, 0, 'padrão 0');
  const id = pedir(a, '2.447,00', null, COM_CUSTO);
  const g11 = gs(a, 'GS11');
  assert.deepEqual(ids(g11), ['u_mat']); assert.equal(g11[0].WA_SITUACAO, 'ENVIADO');
  assert.match(g11[0].TEXTO, /MATHEUS GODOI \(aprovador delegado\) recebeu este pedido na hora e pode autorizar agora: só sem item abaixo do preço mínimo do catálogo/);
  assert.deepEqual(ids(gs(a, 'GS04')), ['u_adm', 'u_dir']);
  const v = ok(a.api('s_matheusgodoi', 'proposta', { id })).proposta;
  assert.equal(v.delegadoPreco.prazoMinutos, 0); assert.equal(v.delegadoPreco.podeEu, true); assert.equal(v.podeAprovarDesconto, true);
  assert.equal(a.ctx.ComDel_rodada_(new a.ctx.Date()).fora.length > 0, true);
  assert.equal(gs(a, 'GS09').length, 0, 'com espera 0 o GS11 já é o pedido');
  ok(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Preço acima do mínimo, cliente estratégico' }));
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
  assert.equal(p.SITUACAO, 'PRONTA');
  assert.match(p.DESCONTO_DECISAO_TEXTO, /\(aprovador delegado\. Critério: decisão na hora \(regra do dono de 19\/11\/2026, espera de 0 minutos\); nenhum item abaixo do preço mínimo do catálogo; não é o responsável/);
  const g10 = gs(a, 'GS10');
  assert.deepEqual(ids(g10), ['u_adm', 'u_dir']);
  assert.match(g10[0].TITULO, /MATHEUS GODOI autorizou o preço da proposta PROP-2026-\d+.*como aprovador delegado/);
});

test('AM-8: Comercial: sem custo válido o Matheus não autoriza (critério mantido); a proposta dele vai só ao dono e à Diretoria; a espera é configurável de 0 a 1.440', () => {
  let a = montarComercial();
  let id = pedir(a, '2.447,00');
  assert.deepEqual(ids(gs(a, 'GS11')), ['u_mat'], 'recebe mesmo sem poder autorizar');
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Tentativa sem custo válido' }), /Como aprovador delegado, você autoriza na hora quando se cumpre a regra; falta: o preço mínimo conferível em todos os itens/);
  a = montarComercial();
  id = pedir(a, '2.447,00', 's_matheusgodoi', COM_CUSTO);
  assert.equal(gs(a, 'GS11').length, 0);
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Minha própria proposta, não pode' }), /O pedido de aprovação é seu/);
  assert.deepEqual(ids(gs(a, 'GS04')), ['u_adm', 'u_dir']);
  recusa(a.api('s_dora', 'salvarDelegadoPreco', { regra: { prazoMinutos: '-1' }, motivo: 'Espera negativa de teste' }), /de 0 a 1\.440 minutos/);
  const s = ok(a.api('s_dora', 'salvarDelegadoPreco', { regra: { prazoMinutos: '0' }, motivo: 'Decisão na hora, pedido do dono de 19/11' }));
  assert.equal(s.regra.prazoMinutos, 0);
});

// ------------------------------------------------------------------ o que continua só com os sócios, telas e ajuda
test('AM-9: saída de dinheiro continua só com os sócios; telas, ajuda e matriz mostram a regra nova', () => {
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const fin = ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Orcamento.js', 'SGO_RecargaCaju.js', 'SGO_Financeiro_Trilha.js', 'SGO_Viagem.js'].filter((f) => fs.existsSync(path.join(PASTA, f))).map(ler).join('\n');
  assert.doesNotMatch(fin, /SGO_delegadoIds_|decisorOperacional|Ges_operacional/);
  const ges = ler('SGO_Gestao_Decisoes.js');
  assert.match(ges, /var GES_OPERACIONAL_FORA = \/\^\(fin_\|financeiro\|omie\|viagem_\|via_\|recarga_\|rcj_\|caju\|ganhos_\|comissao\|conduta_\|ponto_\|rh_\|compras_aprovar\)\/i/);
  const jsC = ler('JS_Compras.html').replace(/\r\n/g, '\n');
  assert.match(jsC, /id="rgDlPrazo" value="' \+ Cp_esc_\(x\.esperaMinutos === undefined/); assert.match(jsC, /min="0" max="2880" step="1" id="rgDlPrazo"/); assert.match(jsC, /esperaMinutos: Cp_\$_\("rgDlPrazo"\)\.value/);
  assert.match(jsC, /Aprovador delegado: decisão na hora/);
  const jsCo = ler('JS_Comercial.html');
  assert.match(jsCo, /min="0" max="1440" step="1" id="cmDlPrazo"/); assert.match(jsCo, /Aprovador delegado: decisão na hora/);
  const jsG = ler('JS_Gestao.html');
  assert.match(jsG, /Decisor operacional da Diretoria/); assert.match(jsG, /decisorOperacional: document\.getElementById\("gdOpLig"\)/);
  assert.match(ler('SGO_Ajuda_Compras.js'), /Desde 19\/11\/2026 a espera é 0 \(padrão\)/);
  assert.match(ler('SGO_Ajuda_Comercial.js'), /Desde 19\/11\/2026 \(pedido do dono\) a espera é 0/);
  assert.match(ler('SGO_Ajuda_Gestao.js'), /Decisor operacional da Diretoria \(decisão do dono de 19\/11\/2026\)/);
  assert.match(ler('SGO_Avisos_Gestao.js'), /compra informada depois de feita \(desde 19\/11\/2026\)', origem: 'SGO_Compras_Requisicoes\.js; SGO_Compras_Pedido\.js; SGO_Compras_Informar\.js/);
  const man = ler('SGO_AssistenteManuais.js');
  assert.match(man, /Decisor operacional da Diretoria \(19\/11\/2026\)/); assert.match(man, /Decisão na hora \(pedido do dono de 19\/11\/2026\)/);
});
