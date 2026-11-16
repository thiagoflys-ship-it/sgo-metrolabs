// Pedido que depende da Diretoria avisado NA HORA aos dois da Diretoria (11/11/2026, regra do dono: "Isso tem que ir para a Diretoria
// como faz com o Matheus: enviar para o e-mail, o SGO e o WhatsApp para o Charles e para mim. Qualquer solicitação que seja regra tem que
// se comportar assim. Tudo quanto fala Diretoria tem que chegar para nós dois."). Caso que motivou: produtos novos cadastrados pela
// vendedora ficam com o preço PENDENTE e o pedido só aparecia na lista do Comercial e no GS01 agrupado da Caixa de decisões.
// Evento GS06 (SGO_avisoDiretoriaNaHora_, SGO_Avisos_Gestao.js): e-mail e WhatsApp pela fila da gestão + alerta na tela, para o dono
// (login admin) e para o perfil Diretoria, menos quem pediu. Também: modelo de utilidade sgo_gestao_item (a Meta classificou o
// sgo_gestao_acao como Marketing). Código real do SGO+; nada sai de verdade; dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const com = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const FONE_DIR = '5562999990010', FONE_DONO = '5562999990099', FONE_GC = '5562999990020';
const AVISOS = ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js'];

function carregarAvisos(a, situacoes) {
  for (const f of AVISOS) {
    const p = path.join(PASTA, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  }
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  const sit = Object.assign({ sgo_gestao_acao: 'APPROVED' }, situacoes && situacoes.st);
  const cat = Object.assign({ sgo_gestao_acao: 'MARKETING' }, situacoes && situacoes.cat);
  a.ctx.SGO_waModeloSituacao_ = (n) => sit[n] || '';
  a.ctx.SGO_waModeloCategoria_ = (n) => cat[n] || '';
}

/** Comercial com o dono (login admin) com e-mail e celular, Diretoria (Dora, no papel do Charles), gestor comercial com celular e a vendedora (Vera, no papel da Mônica). */
function montar(opcoes) {
  const o = opcoes || {};
  const a = com.ambiente({
    agora: Date.parse(o.agora || '2026-10-19T10:46:00-03:00'),
    props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc'] } }) }
  });
  const u = (id) => a.tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  u('u_dir').CELULAR = '62999990010';
  u('u_gc').CELULAR = '62999990020';
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA' });
  carregarAvisos(a, o.modelos);
  return a;
}
const emailsPara = (a, quem) => a.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const whatsPara = (a, fone) => a.whats.filter((w) => w.corpo && w.corpo.to === fone);
const gs06 = (a) => (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS06');
const toasts = (a, uid, re) => (a.tabelas.ATV_AVISOS || []).filter((v) => v.DESTINATARIO_ID === uid && (!re || re.test(v.TITULO)) && !v.LIDO_EM);

/** A vendedora cadastra um produto novo: o preço fica PENDENTE (caso da Mônica). */
function cadastroDaVendedora(a) {
  const r = ok(a.api('s_vera', 'salvarProduto', { codigo: 'BAT-01', nome: 'Bateria estacionária de teste', tipo: 'PRODUTO', unidade: 'un', preco: '2.100,00', custo: '900,00', motivoPreco: 'Cliente pediu a troca da bateria' }));
  assert.equal(r.pendente, true);
  const p = a.tabelas.COM_PRODUTOS.find((x) => x.CODIGO === 'BAT-01');
  assert.equal(p.PRECO_PEDIDO_SITUACAO, 'PENDENTE');
  return p;
}

test('D1 caso da Mônica: preço do catálogo PENDENTE chega NA HORA ao dono e à Diretoria por e-mail, WhatsApp e alerta na tela', () => {
  const a = montar();
  const p = cadastroDaVendedora(a);
  const g = gs06(a);
  assert.deepEqual(g.filter((l) => l.DIRETORIA === 'SIM').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir'], 'os dois da Diretoria (dono no login admin e o perfil Diretoria)');
  assert.ok(g.every((l) => l.USUARIO_ID !== 'u_ven'), 'quem pediu não recebe o próprio pedido');
  assert.ok(g.filter((l) => l.DIRETORIA === 'SIM').every((l) => l.SITUACAO === 'ENVIADO'), g.map((l) => l.USUARIO_ID + ':' + l.SITUACAO + '/' + l.WA_MOTIVO).join(' | '));
  assert.ok(g.every((l) => l.REF_ID === 'COM:PRECO:' + p.ID), 'refId = item da Caixa (o GS01 não repete)');
  assert.equal(emailsPara(a, 'dono').length, 1, 'e-mail do dono na hora');
  assert.equal(emailsPara(a, 'dora').length, 1, 'e-mail da Diretoria na hora');
  assert.equal(whatsPara(a, FONE_DONO).length, 1, 'WhatsApp do dono');
  assert.equal(whatsPara(a, FONE_DIR).length, 1, 'WhatsApp da Diretoria');
  assert.equal(emailsPara(a, 'vera').length, 0);
  // SGO+: alerta na tela e a lista do Comercial para os dois
  assert.equal(toasts(a, 'u_adm', /preço do catálogo BAT-01/).length, 1, 'alerta na tela do dono');
  assert.equal(toasts(a, 'u_dir', /preço do catálogo BAT-01/).length, 1, 'alerta na tela da Diretoria');
  const lista = a.tabelas.COM_AVISOS.filter((v) => v.TIPO === 'PRECO_PEDIDO').map((v) => v.DESTINATARIO_ID).sort();
  assert.deepEqual(lista, ['u_adm', 'u_dir', 'u_gc'], 'lista do Comercial: gestão comercial e os dois da Diretoria');
  // o gestor comercial (também decide) recebe pela mesma fila, no expediente
  assert.ok(g.some((l) => l.USUARIO_ID === 'u_gc'));
  assert.equal(whatsPara(a, FONE_GC).length, 1);
});

test('D2 o aviso diz o que está sendo aprovado: item, preço, custo, mínimo, motivo e quem pediu', () => {
  const a = montar();
  cadastroDaVendedora(a);
  const m = emailsPara(a, 'dono')[0];
  assert.match(m.subject, /preço do catálogo BAT-01 \(Bateria estacionária de teste\), R\$ 2\.100,00, pedido de VERA VENDEDORA TESTE/);
  const corpo = m.body || m.htmlBody;
  assert.match(corpo, /O que você aprova: o preço de venda de R\$ 2\.100,00 do item novo BAT-01/);
  assert.match(corpo, /Custo de compra: R\$ 900,00/);
  assert.match(corpo, /Preço mínimo \(sobra de [\d,]+%\): R\$/);
  assert.match(corpo, /Motivo: Cadastro novo pela equipe comercial: Cliente pediu a troca da bateria/);
  assert.match(corpo, /Pedido de VERA VENDEDORA TESTE/);
  assert.match(JSON.stringify(whatsPara(a, FONE_DONO)[0].corpo), /BAT-01/, 'o WhatsApp leva o item');
});

test('D3 fora do expediente (sábado à noite): a Diretoria recebe na hora; o gestor comercial fica para a abertura do expediente', () => {
  const a = montar({ agora: '2026-10-24T21:30:00-03:00' });
  cadastroDaVendedora(a);
  const g = gs06(a);
  assert.ok(g.filter((l) => l.DIRETORIA === 'SIM').every((l) => l.SITUACAO === 'ENVIADO'));
  const gc = g.find((l) => l.USUARIO_ID === 'u_gc');
  assert.equal(gc.SITUACAO, 'NA_FILA');
  assert.match(gc.LIBERAR_EM, /^2026-10-26T08:00/);
  assert.equal(whatsPara(a, FONE_GC).length, 0);
});

test('D4 redução de preço acima da alçada também chega aos dois, com de/para e a porcentagem', () => {
  const a = montar();
  a.tabelas.COM_PRODUTOS = [{ ID: 'prod_srv', CODIGO: 'QT-01', NOME: 'Qualificação térmica de teste', TIPO: 'SERVICO', UNIDADE_MEDIDA: 'serviço', PRECO: 4000, CUSTO: '', ATIVO: 'SIM', PRECO_PEDIDO_SITUACAO: 'APROVADO', CRIADO_EM: '2026-10-01T10:00:00.000Z' }];
  const r = ok(a.api('s_vera', 'salvarProduto', { id: 'prod_srv', codigo: 'QT-01', nome: 'Qualificação térmica de teste', tipo: 'SERVICO', unidade: 'serviço', preco: '3.000,00', motivoPreco: 'Contrato anual com três unidades do cliente' }));
  assert.equal(r.pendente, true, r.message);
  const g = gs06(a).filter((l) => l.DIRETORIA === 'SIM');
  assert.deepEqual(g.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.match(g[0].TEXTO, /a redução do preço de venda de R\$ 4\.000,00 para R\$ 3\.000,00 \(25/);
});

test('D5 decisão do preço: quem pediu recebe NA HORA o alerta na tela e o e-mail (aprovado e negado)', () => {
  for (const aprovar of [true, false]) {
    const a = montar();
    const p = cadastroDaVendedora(a);
    const antes = emailsPara(a, 'vera').length;
    ok(a.api('s_dora', 'decidirPreco', { id: p.ID, aprovar, texto: aprovar ? 'Preço conferido com o custo da cotação' : 'Item fora da linha de produtos da empresa' }));
    assert.equal(toasts(a, 'u_ven', aprovar ? /^Preço aprovado: BAT-01/ : /^Preço não aprovado: BAT-01/).length, 1, 'alerta na tela de quem pediu');
    const em = emailsPara(a, 'vera').slice(antes);
    assert.equal(em.length, 1, 'e-mail na hora (' + (aprovar ? 'aprovado' : 'negado') + ')');
    assert.match(em[0].subject, aprovar ? /Preço aprovado/ : /Preço não aprovado/);
    assert.match(em[0].body || em[0].htmlBody, /Fundamentação/);
    assert.equal(a.tabelas.COM_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_ven' && /PRECO_(APROVADO|NEGADO)/.test(v.TIPO)).length, 1, 'a lista do Comercial continua');
  }
});

test('D6 o GS01 da Caixa não repete o preço para quem já foi avisado na hora; a escalada (GS03) vai no resumo diário dos dois da Diretoria (11/11/2026)', () => {
  const a = montar();
  cadastroDaVendedora(a);
  const antes = emailsPara(a, 'dora').length;
  a.mudar('2026-10-19T11:30:00-03:00');
  try { a.ctx.Ges_sincronizarTalvez_(true); } catch (e) { /* segue */ }
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  const gs01 = (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS01' && ['u_dir', 'u_adm', 'u_gc'].includes(l.USUARIO_ID) && /^COM:PRECO:/.test(l.REF_ID));
  assert.equal(gs01.length, 0, 'sem GS01 repetido');
  assert.equal(emailsPara(a, 'dora').length, antes);
  // parada 5 dias úteis: sobe à Diretoria (GS03), aos dois
  a.mudar('2026-10-27T10:00:00-03:00');
  try { a.ctx.Ges_sincronizarTalvez_(true); } catch (e) { /* segue */ }
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  const gs03 = (a.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS03' && /^COM:PRECO:/.test(l.REF_ID)).map((l) => l.USUARIO_ID).sort();
  // 11/11/2026 (decisão do dono: a Diretoria é informada, não cobrada): a escalada continua marcada na Caixa, mas não vira GS03
  // item a item; os dois da Diretoria a recebem no resumo diário (GS07, tests/diretoria-informada.test.cjs). Antes: GS03 aos dois.
  assert.deepEqual(gs03, [], 'escalada vai no resumo diário da Diretoria, não item a item');
});

test('D7 preço de tabela abaixo do mínimo com o custo novo: os dois da Diretoria na hora (e a gestão comercial como antes)', () => {
  const a = com.ambiente({ agora: Date.parse('2026-10-19T10:46:00-03:00'), cotacaoReal: true,
    props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc'] } }) } });
  Object.assign(a.tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_adm'), { EMAIL: 'dono@exemplo.test', CELULAR: '62999990099' });
  a.tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_dir').CELULAR = '62999990010';
  carregarAvisos(a);
  a.tabelas.COM_PRODUTOS = [{ ID: 'prod_frag', CODIGO: 'FRAG-01', NOME: 'Fragmentadora de papel de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un.', PRECO: 15525, CUSTO: '', ATIVO: 'SIM', CRIADO_EM: '2026-10-01T10:00:00.000Z' }];
  const PDF = { nome: 'cotacao.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 cotacao de teste').toString('base64') };
  const r = ok(a.api('s_gaspar', 'custoSalvar', { produtoId: 'prod_frag', custo: '9.200,00', cotacao: { fornecedor: 'Distribuidora Teste Ltda', numero: 'COT-77', data: '2026-10-15', validade: '2026-11-30', arquivo: PDF } }));
  assert.equal(r.precoAbaixoPiso, true);
  const g = gs06(a).filter((l) => l.DIRETORIA === 'SIM');
  assert.deepEqual(g.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir']);
  assert.ok(g.every((l) => l.SITUACAO === 'ENVIADO' && l.RESOLVE_POR === ''), 'sem item na Caixa: não espera resolução');
  assert.match(g[0].TITULO, /Preço abaixo do mínimo · Comercial: FRAG-01.*tabela R\$ 15\.525,00, mínimo R\$ 21\.467,00/);
  assert.equal(whatsPara(a, FONE_DONO).length, 1);
  const av = a.tabelas.COM_AVISOS.filter((x) => x.TIPO === 'PRECO_ABAIXO_PISO');
  assert.ok(av.some((x) => x.DESTINATARIO_ID === 'u_gc' && x.EMAIL_SITUACAO === 'PENDENTE'), 'gestão comercial como antes');
  assert.ok(av.some((x) => x.DESTINATARIO_ID === 'u_dir' && x.EMAIL_SITUACAO === ''), 'Diretoria na lista, sem e-mail repetido');
});

test('D8 helper: quem pediu sendo da Diretoria não recebe; o outro membro recebe; soDiretoria não avisa o gestor', () => {
  const a = montar();
  const r = a.ctx.SGO_avisoDiretoriaNaHora_({ evento: 'GS06', modulo: 'comercial', soDiretoria: true, quem: { id: 'u_dir', nome: 'DORA DIRETORA TESTE' }, decisores: ['u_gc'], refId: 'COM:SEMAPR:p1', marco: 'm1', resolvePor: '',
    titulo: 'Proposta enviada sem a aprovação de preço · Comercial: PROP-TESTE', texto: 'O que faltou: aprovação da Diretoria.' });
  assert.deepEqual(Array.from(r.diretoria), ['u_adm']);
  assert.deepEqual(gs06(a).map((l) => l.USUARIO_ID), ['u_adm']);
  assert.equal(toasts(a, 'u_gc').length, 0);
  assert.equal(toasts(a, 'u_adm', /PROP-TESTE/).length, 1);
});

test('D9 GS06 desligado na matriz: a Diretoria ainda recebe o e-mail (regra comum) e o alerta na tela', () => {
  const a = montar();
  a.ctx.SGO_avisoRegra_ = ((orig) => (cod) => (cod === 'GS06' ? Object.assign({}, orig(cod), { gestaoLigada: false }) : orig(cod)))(a.ctx.SGO_avisoRegra_);
  cadastroDaVendedora(a);
  assert.equal(gs06(a).length, 0);
  assert.equal(emailsPara(a, 'dono').length, 1);
  assert.equal(toasts(a, 'u_adm', /BAT-01/).length, 1);
});

test('D10 modelo de utilidade sgo_gestao_item: válido para a Meta; usado só quando APPROVED e UTILITY; senão o sgo_gestao_acao', () => {
  const a0 = montar();
  const def = a0.ctx.NTF_MODELOS_META.sgo_gestao_item;
  assert.deepEqual(Array.from(a0.ctx.Notificar_validarModeloMeta_('sgo_gestao_item', def)), []);
  assert.equal(a0.ctx.Notificar_corpoCadastroMeta_('sgo_gestao_item').category, 'UTILITY');
  const nomeModelo = (a) => whatsPara(a, FONE_DONO)[0].corpo.template.name;
  // ainda não aprovado: segue no antigo
  cadastroDaVendedora(a0);
  assert.equal(nomeModelo(a0), 'sgo_gestao_acao');
  // aprovado mas reclassificado como Marketing: segue no antigo
  const a1 = montar({ modelos: { st: { sgo_gestao_item: 'APPROVED' }, cat: { sgo_gestao_item: 'MARKETING' } } });
  cadastroDaVendedora(a1);
  assert.equal(nomeModelo(a1), 'sgo_gestao_acao');
  // aprovado e Utilidade: usa o novo, com nome, situação, item e link
  const a2 = montar({ modelos: { st: { sgo_gestao_item: 'APPROVED' }, cat: { sgo_gestao_item: 'UTILITY' } } });
  cadastroDaVendedora(a2);
  const w = whatsPara(a2, FONE_DONO)[0].corpo.template;
  assert.equal(w.name, 'sgo_gestao_item');
  const ps = w.components.find((c) => c.type === 'body').parameters.map((x) => x.text);
  assert.equal(ps.length, 4);
  assert.equal(ps[1], 'aguarda a sua decisão');
  assert.match(ps[2], /preço do catálogo BAT-01/);
  assert.match(ps[3], /aviso=/);
  assert.match(gs06(a2).find((l) => l.USUARIO_ID === 'u_adm').WA_MOTIVO, /modelo sgo_gestao_item/);
});

test('D11 piloto: a lista da gestão libera os dois modelos da fila da gestão (antigo e o de utilidade)', () => {
  const a = montar();
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'SGO_WhatsappPiloto.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_WhatsappPiloto.js' });
  const cfg = { ligado: true, telefones: [], telefonesGestao: [a.ctx.SGO_waPilotoCanon_('5562999990099')], grupos: {} };
  const c = { id: 'u_adm', telefone: '5562999990099', nome: 'Dono', perfil: 'ADMIN' };
  for (const modelo of ['sgo_gestao_acao', 'sgo_gestao_item']) assert.equal(a.ctx.SGO_waPilotoMotivo_(c, cfg, { origem: 'AVISOS_GESTAO', modelo }), '', modelo);
  assert.notEqual(a.ctx.SGO_waPilotoMotivo_(c, cfg, { origem: 'AVISOS_GESTAO', modelo: 'sgo_aviso_geral' }), '');
});

// ------------------------------------------------------------------ Compras
test('D12 compra a aprovar: faixa da Diretoria chega NA HORA aos dois da Diretoria e ao dono; faixa do gestor, ao gestor e à Diretoria', () => {
  const cmp = require('./_compras_ambiente.cjs');
  const amb = cmp.ambiente();
  Object.assign(amb.tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_adm'), { EMAIL: 'dono@exemplo.test', CELULAR: '62999990099' });
  amb.props.META_WA_TOKEN = 'tok-teste'; amb.props.META_WA_PHONE_ID = '123456';
  carregarAvisos(amb);
  cmp.regrasDeTeste(amb);
  const fs4 = cmp.fornecedoresDeTeste(amb);
  const PDF = cmp.PDF;
  const emCot = (desc) => { const r = cmp.pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: desc, quantidade: 1, unidade: 'un.' }] }); ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id })); return ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao; };
  const cotar = (q, f, preco) => ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: f.id, precos: [{ itemId: q.itens[0].id, precoUnitario: preco }], prazoDias: 5, validade: '2026-11-10', arquivo: PDF })).requisicao;
  const g = () => (amb.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS06');
  // faixa da Diretoria
  const q3 = emCot('Bancada de calibração');
  cotar(q3, fs4[0], '15.000,00'); cotar(q3, fs4[1], '16.000,00');
  const t3 = cotar(q3, fs4[2], '17.000,00');
  ok(amb.api('s_carlos', 'escolher', { requisicaoId: q3.id, cotacaoId: t3.cotacoes.find((c) => c.maisBarata).id }));
  const l3 = g().filter((l) => l.REF_ID === 'CMP:APROVAR:' + q3.id);
  assert.deepEqual(l3.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2'], 'Diretoria inteira, inclusive o dono; nunca o gestor nem quem cotou');
  assert.ok(l3.every((l) => l.SITUACAO === 'ENVIADO'));
  assert.match(l3[0].TEXTO, /O que você aprova: .*total R\$ 15\.000,00/);
  assert.match(l3[0].TEXTO, /Faixa: .*Diretoria/);
  assert.ok(amb.emails.some((m) => m.to === 'dono@exemplo.test' && /Aprovação · Compras/.test(m.subject)));
  assert.ok((amb.tabelas.ATV_AVISOS || []).some((v) => v.DESTINATARIO_ID === 'u_adm' && /Aprovação · Compras/.test(v.TITULO)), 'alerta na tela do dono');
  // faixa do gestor da área: gestor (decide) + Diretoria (pode decidir)
  const q2 = emCot('Analisador de segurança elétrica');
  const t2 = cotar(q2, fs4[0], '5.000,00');
  ok(amb.api('s_carlos', 'escolher', { requisicaoId: q2.id, cotacaoId: t2.cotacoes[0].id, justificativaMinimo: 'Fornecedor único autorizado do analisador' }));
  const l2 = g().filter((l) => l.REF_ID === 'CMP:APROVAR:' + q2.id).map((l) => l.USUARIO_ID).sort();
  assert.deepEqual(l2, ['u_adm', 'u_dir', 'u_dir2', 'u_gt']);
  // a Caixa não repete (GS01) para quem já recebeu
  amb.mudar('2026-10-19T11:30:00-03:00');
  try { amb.ctx.Ges_sincronizarTalvez_(true); } catch (e) { /* segue */ }
  amb.ctx.SGO_avisosGestaoRodada_(new amb.ctx.Date());
  assert.equal((amb.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === 'GS01' && /^CMP:APROVAR:/.test(l.REF_ID)).length, 0);
});

// ------------------------------------------------------------------ janela de decisão do preço (conta completa)
/** Cinco itens no molde dos reais (custo / preço), com o preço pendente da vendedora e a cotação válida. */
function cincoItens(a) {
  const itens = [['QT-AUTOCLAVE', 'PRODUTO', 5100, 11100], ['FONTE-9V', 'PRODUTO', 25.26, 49.99], ['BOMBA-VAC', 'PRODUTO', 4049, 9450], ['SENSOR-PT100', 'PRODUTO', 1187, 3250], ['VERIF-BALANCA', 'SERVICO', 134.75, 400]];
  a.tabelas.COM_PRODUTOS = itens.map(([cod, tipo, custo, preco], i) => ({ ID: 'p' + i, CODIGO: cod, NOME: 'Item ' + cod, TIPO: tipo, UNIDADE_MEDIDA: 'un', PRECO: preco, CUSTO: custo, ATIVO: 'SIM', PRECO_PEDIDO: preco, PRECO_PEDIDO_SITUACAO: 'PENDENTE',
    PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T09:40:00', PRECO_PEDIDO_MOTIVO: 'Cadastro novo pela equipe comercial', CUSTO_COTACAO_ID: 'cot' + i, CUSTO_COTACAO_VALOR: custo, CUSTO_VALIDO_ATE: '2026-12-31' }));
  return itens;
}

test('D13 conta do preço no servidor: impostos, comissão, custo, sobra, mínimo, sugerido e selo (cinco itens no molde dos reais)', () => {
  const a = montar();
  cincoItens(a);
  const r0 = ok(a.api('s_dora', 'analisePreco', { id: 'p0' }));
  assert.equal(r0.conta.conta, 'R$ 11.100,00 − impostos R$ 2.052,00 − comissão R$ 333,00 − custo R$ 5.100,00 = sobra R$ 3.615,00 (32,6%)');
  assert.equal(r0.conta.selo, 'vermelho');
  assert.equal(r0.conta.minimoTxt, 'R$ 11.900,00'); assert.equal(r0.conta.difMinimo.txt, '−R$ 800,00 (−6,7%)');
  assert.equal(r0.conta.sugeridoTxt, 'R$ 13.970,00');
  assert.match(r0.conta.impostosRegra, /28,25% sobre o preço, menos o crédito de 21,25% sobre o custo/);
  assert.deepEqual(r0.opcoes.map((o) => o.opcao), ['PEDIDO', 'SUGERIDO', 'MINIMO']);
  assert.equal(r0.podeDecidir, true);
  const selos = ['p0', 'p1', 'p2', 'p3', 'p4'].map((id) => ok(a.api('s_dora', 'analisePreco', { id })).conta.selo);
  assert.deepEqual(selos, ['vermelho', 'vermelho', 'laranja', 'laranja', 'verde']);
  // outro preço: a mesma conta, sem decidir
  const o = ok(a.api('s_dora', 'analisePreco', { id: 'p3', preco: '3.300,00' })).contaOutro;
  assert.equal(o.selo, 'verde'); assert.equal(a.tabelas.COM_PRODUTOS[3].PRECO_PEDIDO_SITUACAO, 'PENDENTE');
  // a vendedora não vê a conta (custo)
  assert.equal(a.api('s_vera', 'analisePreco', { id: 'p0' }).ok, false);
});

test('D14 decidir: aprovar com o sugerido, com o mínimo, com outro preço; abaixo do mínimo fica marcado; o servidor recalcula o preço', () => {
  const a = montar();
  cincoItens(a);
  ok(a.api('s_dora', 'decidirPreco', { id: 'p0', aprovar: true, opcao: 'SUGERIDO', preco: '1,00', texto: 'Vale o sugerido da política de precificação' }));
  assert.equal(Number(a.tabelas.COM_PRODUTOS[0].PRECO), 13970, 'o servidor ignora o número da tela e recalcula');
  ok(a.api('s_dora', 'decidirPreco', { id: 'p1', aprovar: true, opcao: 'MINIMO', texto: 'Fica no mínimo para não perder o cliente' }));
  assert.equal(Number(a.tabelas.COM_PRODUTOS[1].PRECO), 59);
  assert.match(a.api('s_dora', 'decidirPreco', { id: 'p3', aprovar: true, opcao: 'OUTRO', preco: '', texto: 'Preço negociado com o fornecedor' }).message, /informe o preço/);
  ok(a.api('s_dora', 'decidirPreco', { id: 'p3', aprovar: true, opcao: 'OUTRO', preco: '3.300,00', texto: 'Preço negociado com o fornecedor' }));
  assert.equal(Number(a.tabelas.COM_PRODUTOS[3].PRECO), 3300);
  const r = ok(a.api('s_dora', 'decidirPreco', { id: 'p2', aprovar: true, opcao: 'OUTRO', preco: '8.000,00', texto: 'Cliente estratégico: contrato anual de manutenção' }));
  assert.equal(r.abaixoMinimo, true); assert.match(r.message, /abaixo do preço mínimo/);
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === 'p2' && /abaixo do preço mínimo/.test(h.TEXTO)), 'marca no histórico');
  // quem pediu sabe o preço que valeu
  assert.ok((a.tabelas.ATV_AVISOS || []).some((v) => v.DESTINATARIO_ID === 'u_ven' && /com o preço sugerido: R\$ 13\.970,00 \(o seu pedido era R\$ 11\.100,00\)/.test(v.TEXTO)));
});

test('D15 o aviso da Diretoria leva a conta curta (sobra, mínimo, sugerido) e o link abre a janela de decisão', () => {
  const a = montar();
  cadastroDaVendedora(a);
  const corpo = emailsPara(a, 'dono')[0].body;
  assert.match(corpo, /Conta: R\$ 2\.100,00 − impostos R\$ [\d.,]+ − comissão R\$ [\d.,]+ − custo R\$ 900,00 = sobra R\$ [\d.,]+ \([\d,]+%\)/);
  assert.match(corpo, /Preço mínimo \(sobra de 35,0%\): R\$/);
  assert.match(corpo, /Preço sugerido \(margem alvo de 40,0%\): R\$/);
  const linha = gs06(a).find((l) => l.USUARIO_ID === 'u_adm');
  assert.deepEqual(JSON.parse(linha.TELA_JSON), { tipo: 'comercial', aba: 'catalogo', id: a.tabelas.COM_PRODUTOS.find((x) => x.CODIGO === 'BAT-01').ID });
  const js = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  assert.match(js, /aba === "catalogo"\) Comercial_decidirPreco_\(\{ id: acao\.id \}\)/, 'o link do aviso abre a janela de decisão');
  const fn = js.slice(js.indexOf('function Comercial_decidirPreco_('), js.indexOf('POLÍTICA DE PRECIFICAÇÃO, REAJUSTE'));
  assert.doesNotMatch(fn, /\b(alert|confirm|prompt)\s*\(/, 'sem alert, confirm ou prompt na janela');
});
