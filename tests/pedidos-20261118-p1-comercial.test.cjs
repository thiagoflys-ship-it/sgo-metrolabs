// Pacote 1 de 18/11/2026 — Comercial, item 5 da fila (output/pedidos-20261118/FILA.md): orçamento fora do preço. O dono e a Diretoria
// aprovam a qualquer momento; se não decidirem em 15 minutos (padrão, configurável), o aprovador delegado (conta interna "MATHEUS GODOI",
// da gestão comercial) autoriza com o critério de preço: sem desconto máximo definido (padrão, o dono não deu número), nenhum item abaixo
// do preço mínimo do catálogo e o custo de todos os itens conferível; com número, desconto até ele sobre a tabela. WhatsApp ao dono, à
// Diretoria e ao delegado a cada pedido de aprovação de preço, a qualquer hora (GS11). Código REAL do SGO+; nada sai de verdade.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const recusa = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); assert.match(r.message, re); return r; };
const FONE_MAT = '5562999990077', FONE_DONO = '5562999990099', FONE_DIR = '5562999990010';

function montar(o) {
  o = o || {};
  const a = ambiente({ agora: Date.parse(o.agora || '2026-10-19T10:46:00-03:00'),
    props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc', 'u_mat'] } }) } });
  const us = a.tabelas.CAD_USUARIOS, u = (id) => us.find((x) => x.ID === id);
  u('u_dir').CELULAR = '62999990010';
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA' });
  us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE' });
  us.push({ ID: 'u_rep', USUARIO: 'energiza', NOME: 'MATHEUS GODOI', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'rep@exemplo.test', VINCULO_TRABALHO: 'REPRESENTANTE', REPRESENTADA_ID: 'rp1' });
  a.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
  for (const f of ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js']) {
    const p = path.join(PASTA, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  }
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  a.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  // 19/11/2026: o padrão da espera passou a 0 (tests/avisos-matheus-20261119.test.cjs); aqui fica gravada a regra de 15 minutos do
  // cenário do Pacote 1, para continuar conferindo o caminho com prazo (configurável)
  if (!o.esperaPadrao) {
    a.tabelas.COM_CONFIG = a.tabelas.COM_CONFIG || [];
    a.tabelas.COM_CONFIG.push({ ID: 'cfg_del_p1', CHAVE: 'DELEGADO_PRECO', VALOR_JSON: JSON.stringify({ prazoMinutos: 15 }), VERSAO: 1, MOTIVO: 'Cenário do Pacote 1: espera de 15 minutos',
      ATUALIZADO_POR_ID: 'u_dir', ATUALIZADO_POR_NOME: 'DORA DIRETORA TESTE', ATUALIZADO_EM: '2026-10-19T09:00:00' });
  }
  return a;
}
function produto(a, extra) {
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  a.tabelas.COM_PRODUTOS.push(Object.assign({ ID: 'prod_bat', CODIGO: 'BAT-01', NOME: 'Bateria estacionária de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 2100, CUSTO: '', ATIVO: 'SIM',
    ATUALIZADO_POR_NOME: 'VERA VENDEDORA TESTE', CRIADO_EM: '2026-11-05T14:30:00.000Z' }, extra || {}));
}
/** Proposta da vendedora que vai para a aprovação da Diretoria (o motivo depende do produto). */
function pedir(a, preco, sid, prod) {
  produto(a, prod);
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = ok(a.api(sid || 's_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api(sid || 's_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: SEM_VIAGEM, escopo: 'Troca da bateria do equipamento de teste do cliente.', contatoId: contato.id,
    itens: [{ produtoId: 'prod_bat', descricao: 'Bateria estacionária de teste', quantidade: 1, precoUnitario: preco }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' } }));
  ok(a.api(sid || 's_vera', 'concluirProposta', { id: np.proposta.id, justificativa: 'Cliente recebeu orçamento de outro equipamento esta semana' }));
  return np.proposta.id;
}
const gs = (a, ev) => (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === ev);
const whatsPara = (a, fone) => a.whats.filter((w) => w.corpo && w.corpo.to === fone);
// cadastro novo da vendedora com custo e o preço ainda não aprovado: "preço do catálogo não aprovado" (só a Diretoria aprova), mas o preço
// mínimo é conferível pelo custo
const COM_CUSTO = { CUSTO: 900, PRECO_PEDIDO_SITUACAO: 'PENDENTE', PRECO_PEDIDO: 2100, PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T09:00' };

test('P1-5a: pedido de aprovação de preço avisa o Matheus NA HORA, a qualquer hora (GS11); o dono e a Diretoria seguem no GS04, sem aviso repetido', () => {
  const a = montar({ agora: '2026-10-19T21:30:00-03:00' }); // segunda-feira à noite, fora do expediente
  const id = pedir(a, '2.447,00');
  const g11 = gs(a, 'GS11'), g04 = gs(a, 'GS04');
  assert.deepEqual(g11.map((l) => l.USUARIO_ID), ['u_mat']);
  assert.equal(g11[0].SITUACAO, 'ENVIADO', 'sábado à noite: saiu na hora'); assert.equal(g11[0].WA_SITUACAO, 'ENVIADO');
  assert.deepEqual(g04.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.ok(!g04.some((l) => l.USUARIO_ID === 'u_mat'), 'o Matheus não recebe o mesmo pedido duas vezes');
  assert.equal(whatsPara(a, FONE_MAT).length, 1); assert.equal(whatsPara(a, FONE_DONO).length, 1); assert.equal(whatsPara(a, FONE_DIR).length, 1);
  assert.match(JSON.stringify(whatsPara(a, FONE_MAT)[0].corpo), /preço fora da política em PROP-2026-\d+/);
  assert.match(g11[0].TEXTO, /Se o dono e a Diretoria não decidirem até 19\/10\/2026 21:45 \(15 minutos\), MATHEUS GODOI pode autorizar: só sem item abaixo do preço mínimo do catálogo/);
  assert.ok(!(a.tabelas.NTF_GESTAO || []).some((l) => l.USUARIO_ID === 'u_rep'));
  assert.equal(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id).SITUACAO, 'AGUARDANDO_APROVACAO');
});

test('P1-5b: com o custo conferível e o preço acima do mínimo, o Matheus autoriza depois de 15 minutos; o critério fica registrado; a proposta vai ao cliente; o dono e a Diretoria são avisados (GS10)', () => {
  const a = montar();
  const id = pedir(a, '2.447,00', null, COM_CUSTO);
  const v1 = ok(a.api('s_matheusgodoi', 'proposta', { id })).proposta;
  assert.equal(v1.decisaoSoDiretoria, true);
  assert.equal(v1.delegadoPreco.liberado, false); assert.equal(v1.delegadoPreco.faltaTxt, '15 min'); assert.equal(v1.delegadoPreco.liberaEm, '19/10/2026 11:01');
  assert.deepEqual(v1.delegadoPreco.criterios.map((c) => c.ok), [true]);
  assert.equal(v1.podeAprovarDesconto, false);
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Preço acima do mínimo, cliente estratégico' }), /Aprovador delegado: O prazo do dono e da Diretoria vai até 19\/10\/2026 11:01 \(faltam 15 min\)/);
  // a rodada avisa uma vez, quando o prazo vence
  a.mudar('2026-10-19T11:02:00-03:00');
  a.ctx.ComDel_rodada_(new a.ctx.Date()); a.ctx.ComDel_rodada_(new a.ctx.Date());
  assert.deepEqual(gs(a, 'GS09').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_mat']);
  const v2 = ok(a.api('s_matheusgodoi', 'proposta', { id })).proposta;
  assert.equal(v2.podeAprovarDesconto, true); assert.equal(v2.delegadoPreco.podeEu, true);
  const d = ok(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Preço acima do mínimo, cliente estratégico' }));
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
  assert.equal(p.SITUACAO, 'PRONTA');
  assert.match(p.DESCONTO_DECISAO_TEXTO, /aprovador delegado, depois do prazo do dono e da Diretoria\. Critério: prazo de 15 minutos vencido em 19\/10\/2026 11:01[\s\S]*nenhum item abaixo do preço mínimo do catálogo; não é o responsável/);
  const ap = JSON.parse(p.PRECIFICACAO_JSON).aprovacao;
  assert.equal(ap.delegado, true);
  assert.equal(a.ctx.ComP_faltaAprovacaoPreco_(p, a.ctx.ComP_avaliarProposta_(p)), '', 'a autorização do delegado vale na conferência antes do envio');
  assert.deepEqual(gs(a, 'GS10').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.match(gs(a, 'GS10')[0].TITULO, /MATHEUS GODOI autorizou o preço da proposta PROP-2026-\d+/);
  assert.match(d.message, /aprovado/i);
});

test('P1-5c: sem custo válido (preço mínimo não conferível) ou com o desconto máximo excedido, o Matheus não autoriza; com o desconto máximo da regra, autoriza', () => {
  let a = montar();
  let id = pedir(a, '2.447,00');
  a.mudar('2026-10-19T11:05:00-03:00');
  const v = ok(a.api('s_matheusgodoi', 'proposta', { id })).proposta;
  assert.match(v.delegadoPreco.criterios[0].texto, /o preço mínimo conferível em todos os itens \(sem custo válido: item 1/);
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Tentativa sem custo cadastrado' }), /falta cumprir: o preço mínimo conferível/);
  ok(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: false, texto: 'Sem custo não autorizo; peça o custo ao Financeiro' }));
  // o dono configura 10% de desconto máximo: o preço de R$ 2.000 (4,76% abaixo da tabela) passa, mesmo sem custo
  a = montar();
  recusa(a.api('s_matheusgodoi', 'salvarDelegadoPreco', { regra: { descontoMaxPct: '10' }, motivo: 'Matheus tentando mudar a regra' }), /só o dono e a Diretoria alteram/);
  ok(a.api('s_admin', 'salvarDelegadoPreco', { regra: { descontoMaxPct: '10' }, motivo: 'Desconto máximo de 10% para o Matheus autorizar' }));
  id = pedir(a, '2.000,00');
  a.mudar('2026-10-19T11:05:00-03:00');
  ok(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Desconto de 5% dentro da regra do dono' }));
  // acima do máximo: recusado com o motivo
  a = montar();
  ok(a.api('s_admin', 'salvarDelegadoPreco', { regra: { descontoMaxPct: '3' }, motivo: 'Desconto máximo de 3% para o Matheus' }));
  id = pedir(a, '2.000,00');
  a.mudar('2026-10-19T11:05:00-03:00');
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Acima do máximo, não deve passar' }), /desconto sobre a tabela até 3,0% \(a proposta tem 4,8%\)/);
});

test('P1-5d: o Matheus não autoriza a própria proposta; a regra mostra quem recebe e o celular; prazo e validações', () => {
  const a = montar();
  const id = pedir(a, '2.447,00', 's_matheusgodoi');
  assert.equal(gs(a, 'GS11').length, 0, 'o pedido do próprio Matheus não avisa o Matheus');
  a.mudar('2026-10-19T11:05:00-03:00');
  recusa(a.api('s_matheusgodoi', 'decidirDesconto', { id, aprovar: true, texto: 'Minha própria proposta, não pode' }), /O pedido de aprovação é seu \(você concluiu a proposta\)/);
  const t = ok(a.api('s_gaspar', 'delegadoPreco', {}));
  assert.equal(t.podeEditar, false); assert.deepEqual(Array.from(t.ids), ['u_mat']); assert.equal(t.regra.prazoMinutos, 15); assert.equal(t.regra.descontoMaxPct, null);
  assert.match(t.avisados.find((x) => x.nome === 'MATHEUS GODOI').situacao, /celular final 6527|celular final 0077/);
  recusa(a.api('s_admin', 'salvarDelegadoPreco', { regra: { prazoMinutos: '1441' }, motivo: 'Espera longa demais de teste' }), /de 0 a 1\.440 minutos/);
  recusa(a.api('s_admin', 'salvarDelegadoPreco', { regra: { aprovadorIds: ['u_ven'] }, motivo: 'Vendedora como delegada' }), /não é da gestão comercial/);
  recusa(a.api('s_admin', 'salvarDelegadoPreco', { regra: { aprovadorIds: ['u_rep'] }, motivo: 'Representada como delegada' }), /conta interna ativa/);
  const s = ok(a.api('s_dora', 'salvarDelegadoPreco', { regra: { prazoMinutos: '20' }, motivo: 'Vinte minutos pedidos pelo dono' }));
  assert.equal(s.regra.prazoMinutos, 20); assert.match(s.versoes[0].motivo, /Vinte minutos/);
});

test('P1-5e: preço do catálogo abaixo do mínimo: sem desconto máximo, só o dono e a Diretoria; com ele, o Matheus aprova depois do prazo; o pedido avisa o Matheus a qualquer hora (GS11)', () => {
  const a = montar();
  a.tabelas.COM_PRODUTOS = [{ ID: 'prod_srv', CODIGO: 'QT-01', NOME: 'Qualificação térmica de teste', TIPO: 'SERVICO', UNIDADE_MEDIDA: 'serviço', PRECO: 4000, CUSTO: 2000, ATIVO: 'SIM', PRECO_PEDIDO_SITUACAO: 'APROVADO', CRIADO_EM: '2026-10-01T10:00:00.000Z' }];
  const r = ok(a.api('s_vera', 'salvarProduto', { id: 'prod_srv', codigo: 'QT-01', nome: 'Qualificação térmica de teste', tipo: 'SERVICO', unidade: 'serviço', preco: '2.600,00', motivoPreco: 'Contrato anual com três unidades do cliente' }));
  assert.equal(r.pendente, true, r.message);
  assert.deepEqual(gs(a, 'GS11').map((l) => l.USUARIO_ID), ['u_mat']);
  assert.ok(!gs(a, 'GS06').some((l) => l.USUARIO_ID === 'u_mat'), 'sem aviso repetido');
  a.mudar('2026-10-19T11:05:00-03:00');
  const d1 = a.api('s_matheusgodoi', 'decidirPreco', { id: 'prod_srv', aprovar: true, texto: 'Contrato anual compensa a redução' });
  if (!d1.ok) {
    assert.match(d1.message, /a regra do dono não tem desconto máximo definido/);
    ok(a.api('s_admin', 'salvarDelegadoPreco', { regra: { descontoMaxPct: '40', prazoMinutos: 15 }, motivo: 'Até 40% de redução para o Matheus' }));
    const d2 = ok(a.api('s_matheusgodoi', 'decidirPreco', { id: 'prod_srv', aprovar: true, texto: 'Contrato anual compensa a redução' }));
    assert.match(d2.message, /Preço aprovado/);
    assert.match(a.tabelas.COM_PRODUTOS[0].PRECO_DECISAO_TEXTO, /aprovador delegado, depois do prazo do dono e da Diretoria/);
    assert.deepEqual(gs(a, 'GS10').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  } else assert.fail('2.600 devia ficar abaixo do mínimo do item (custo 2.000): ' + d1.message);
});
