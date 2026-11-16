// Comercial: pedido de aprovação avisado NA HORA (11/11/2026, pedido do dono). Caso real que motivou: PROP-2026-0057 rev.00
// (pedido às 10:46; o e-mail da Diretoria foi guardado para o resumo do dia, o WhatsApp esperava a Caixa de decisões e o dono,
// no login "admin", estava fora dos avisos da gestão no celular). O aviso também passa a dizer o que está sendo aprovado
// (total e itens com preço diferente da tabela). Código real do SGO+ (tests/_comercial_ambiente.cjs + avisos da gestão);
// nada sai de verdade; dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const FONE_DIR = '5562999990010', FONE_DONO = '5562999990099', FONE_GC = '5562999990020';

function montar() {
  const a = ambiente({
    agora: Date.parse('2026-10-19T10:46:00-03:00'),
    props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc'] } }) }
  });
  const u = (id) => a.tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  u('u_dir').CELULAR = '62999990010';
  u('u_gc').CELULAR = '62999990020';
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA' });
  for (const f of ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js']) {
    const p = path.join(PASTA, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  }
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  a.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  return a;
}
function produto(a, extra) {
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  a.tabelas.COM_PRODUTOS.push(Object.assign({ ID: 'prod_bat', CODIGO: 'BAT-01', NOME: 'Bateria estacionária de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 2100, CUSTO: '', ATIVO: 'SIM',
    ATUALIZADO_POR_NOME: 'VERA VENDEDORA TESTE', CRIADO_EM: '2026-11-05T14:30:00.000Z' }, extra || {}));
}
function pedirDiretoria(a, preco) {
  produto(a);
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api('s_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: SEM_VIAGEM, escopo: 'Troca da bateria do equipamento de teste do cliente.', contatoId: contato.id,
    itens: [{ produtoId: 'prod_bat', descricao: 'Bateria estacionária de teste', quantidade: 1, precoUnitario: preco }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' } }));
  ok(a.api('s_vera', 'concluirProposta', { id: np.proposta.id, justificativa: 'Cliente recebeu orçamento de outro equipamento esta semana' }));
  return np.proposta.id;
}
const emailsPara = (a, quem) => a.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const whatsPara = (a, fone) => a.whats.filter((w) => w.corpo && w.corpo.to === fone);

test('A1 pedido à Diretoria sai NA HORA por e-mail e WhatsApp para a Diretoria e para o dono (login admin)', () => {
  const a = montar();
  const id = pedirDiretoria(a, '2.447,00');
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
  assert.equal(p.SITUACAO, 'AGUARDANDO_APROVACAO');
  const g = (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS04');
  assert.deepEqual(g.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir'], 'Diretoria e dono; nunca quem pediu');
  assert.ok(g.every((l) => l.SITUACAO === 'ENVIADO'), 'saiu na hora: ' + g.map((l) => l.SITUACAO + '/' + l.EMAIL_MOTIVO + '/' + l.WA_MOTIVO).join(' | '));
  assert.equal(emailsPara(a, 'dora').length, 1, 'e-mail da Diretoria na hora (não no resumo do dia)');
  assert.equal(emailsPara(a, 'dono').length, 1, 'e-mail do dono na hora');
  assert.equal(whatsPara(a, FONE_DIR).length, 1, 'WhatsApp da Diretoria');
  assert.equal(whatsPara(a, FONE_DONO).length, 1, 'WhatsApp do dono');
  assert.equal(emailsPara(a, 'vera').length, 0, 'quem pediu não recebe o próprio pedido');
  // o aviso no sistema continua, sem um segundo e-mail guardado para o resumo do dia
  const av = a.tabelas.COM_AVISOS.filter((v) => v.TIPO === 'MARGEM_DIRETORIA');
  assert.ok(av.some((v) => v.DESTINATARIO_ID === 'u_dir'));
  assert.ok(av.every((v) => v.EMAIL_SITUACAO !== 'PENDENTE'), 'sem e-mail repetido no resumo do dia');
});

test('A2 o aviso diz o que está sendo aprovado: total, item fora da tabela e o motivo (caso PROP-2026-0057)', () => {
  const a = montar();
  pedirDiretoria(a, '2.447,00');
  const corpo = emailsPara(a, 'dono')[0].body;
  assert.match(corpo, /O que você aprova: a proposta exatamente como está, total R\$ 2\.447,00/);
  assert.match(corpo, /Bateria estacionária de teste: proposta R\$ 2\.447,00, tabela R\$ 2\.100,00/);
  assert.match(corpo, /Motivo do vendedor: Cliente recebeu orçamento/);
  assert.match(corpo, /Para outro valor, negue/);
  const wa = whatsPara(a, FONE_DONO)[0];
  assert.match(JSON.stringify(wa.corpo), /total R\$ 2\.447,00/, 'o WhatsApp mostra o total');
});

test('A3 GS01 da Caixa de decisões não repete o mesmo pedido para quem já foi avisado na hora', () => {
  const a = montar();
  pedirDiretoria(a, '2.447,00');
  const antes = emailsPara(a, 'dora').length;
  a.mudar('2026-10-19T11:30:00-03:00');
  a.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  try { if (typeof a.ctx.Ges_sincronizarTalvez_ === 'function') a.ctx.Ges_sincronizarTalvez_(true); } catch (e) { /* Caixa indisponível no ambiente: segue */ }
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  const gs01 = (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS01' && l.USUARIO_ID === 'u_dir');
  assert.equal(gs01.length, 0, 'sem GS01 duplicado');
  assert.equal(emailsPara(a, 'dora').length, antes, 'nenhum e-mail repetido');
});

test('A4 dentro da política: nenhum aviso de aprovação', () => {
  const a = montar();
  produto(a, { CUSTO: 500, CUSTO_COTACAO_JSON: '' });
  const n = (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS04').length;
  assert.equal(n, 0);
});

test('A5 decisão: o vendedor recebe NA HORA o alerta na tela e o e-mail (aprovada e não aprovada)', () => {
  for (const aprovar of [true, false]) {
    const a = montar();
    const id = pedirDiretoria(a, '2.447,00');
    const antesEmails = emailsPara(a, 'vera').length;
    const r = a.api('s_dora', 'decidirDesconto', { id, aprovar, texto: aprovar ? 'Aprovado pela Diretoria pelo contrato anual' : 'Use a tabela: R$ 2.100,00 na bateria' });
    assert.equal(r.ok, true, r.message);
    const toast = (a.tabelas.ATV_AVISOS || []).filter((v) => v.DESTINATARIO_ID === 'u_ven' && /Proposta (não )?aprovada/.test(v.TITULO) && !v.LIDO_EM);
    assert.equal(toast.length, 1, 'alerta na tela (aviso do SGO+) para o vendedor');
    const em = emailsPara(a, 'vera').slice(antesEmails);
    assert.equal(em.length, 1, 'e-mail na hora para o vendedor (' + (aprovar ? 'aprovada' : 'não aprovada') + ')');
    assert.match(em[0].subject, aprovar ? /Proposta aprovada/ : /Proposta não aprovada/);
    assert.match(em[0].body || em[0].htmlBody, /Fundamentação/);
  }
});

test('A6 preço do catálogo abaixo do mínimo: só a Diretoria aprova; o gestor comercial é recusado com a explicação (decisão do dono 11/11)', () => {
  const a = montar();
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  a.tabelas.COM_PRODUTOS.push({ ID: 'prod_min', CODIGO: 'MIN-01', NOME: 'Item de teste abaixo do mínimo', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 100, CUSTO: 90, ATIVO: 'SIM',
    PRECO_PEDIDO: 100, PRECO_PEDIDO_SITUACAO: 'PENDENTE', PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T10:00', PRECO_PEDIDO_MOTIVO: 'Cadastro novo pela equipe comercial',
    CRIADO_EM: '2026-10-19T13:00:00.000Z' });
  const g = a.api('s_gaspar', 'decidirPreco', { id: 'prod_min', aprovar: true, opcao: 'PEDIDO', texto: 'Aprovo o preço pedido pelo cliente estratégico' });
  assert.equal(g.ok, false, 'gestor comercial não aprova abaixo do mínimo');
  assert.match(g.message, /só a Diretoria aprova/);
  const d = a.api('s_dora', 'decidirPreco', { id: 'prod_min', aprovar: true, opcao: 'PEDIDO', texto: 'Aprovado pela Diretoria: item de entrada do contrato' });
  assert.equal(d.ok, true, d.message);
  assert.equal(a.tabelas.COM_PRODUTOS.find((p) => p.ID === 'prod_min').PRECO_PEDIDO_SITUACAO, 'APROVADO');
});
