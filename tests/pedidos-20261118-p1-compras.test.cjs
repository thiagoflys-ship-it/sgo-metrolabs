// Pacote 1 de 18/11/2026 — Compras (itens 2, 3 e 4 da fila output/pedidos-20261118/FILA.md).
//  2. Matheus (17/11 16:09): ao informar compra feita antes, a tela perguntava "por que só hoje", depois a duplicidade, e voltava às mesmas
//     perguntas sem sair do ciclo. As duas perguntas agora voltam juntas, com as respostas; respondidas, a compra grava; destinos
//     diferentes (matriz x filial) não são duplicidade.
//  3. Decisão do dono: o aprovador delegado (conta interna "MATHEUS GODOI") aprova, reprova ou pede novo orçamento depois do prazo do dono
//     e da Diretoria (padrão 30 minutos desde a postagem), com mínimo de 3 orçamentos, o mais em conta ou justificado, sem ter pedido nem
//     cotado, dentro do teto (vazio = sem teto). Regra configurável só pelo dono e pela Diretoria.
//  4. WhatsApp para o dono, a Diretoria e o delegado a cada nova solicitação, a qualquer hora (GS08), no prazo vencido (GS09) e na decisão
//     do delegado (GS10).
// Código REAL do SGO+ (tests/_compras_ambiente.cjs + avisos da gestão); nada sai de verdade; dados fictícios.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('./_compras_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const recusa = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); assert.match(r.message, re); return r; };
const FONE_MAT = '5562999990077', FONE_DONO = '5562999990099', FONE_DIR = '5562999990010';
const B64 = (t) => Buffer.from(t).toString('base64');

/** Compras com a aprovação só do dono e da Diretoria (SIM, padrão de produção), o dono (login admin), a Diretoria e o Matheus. */
function montar(o) {
  o = o || {};
  const amb = C.ambiente({ agora: o.agora, props: Object.assign({ APROVACAO_SO_DIRETORIA: 'SIM', META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456' }, o.props || {}),
    tabelas: o.tabelas });
  const us = amb.tabelas.CAD_USUARIOS, u = (id) => us.find((x) => x.ID === id);
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' });
  u('u_dir').CELULAR = '62999990010';
  us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE' });
  // conta de representação com o MESMO nome (existe em produção): nunca é o aprovador delegado
  us.push({ ID: 'u_rep', USUARIO: 'energiza', NOME: 'MATHEUS GODOI', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'rep@exemplo.test', VINCULO_TRABALHO: 'REPRESENTANTE', REPRESENTADA_ID: 'rp1' });
  amb.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
  for (const f of ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js']) {
    const p = path.join(PASTA, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), amb.ctx, { filename: f });
  }
  amb.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  amb.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  C.regrasDeTeste(amb);
  amb.fs = C.fornecedoresDeTeste(amb);
  return amb;
}
const gs = (amb, ev) => (amb.tabelas.NTF_GESTAO || []).filter((l) => l.EVENTO === ev);
const whatsPara = (amb, fone) => amb.whats.filter((w) => w.corpo && w.corpo.to === fone);
const textoWhats = (w) => JSON.stringify(w.corpo);

/** Pedido postado pelo técnico, cotado pelo comprador com n orçamentos (o primeiro o mais barato) e escolhido. */
function emAprovacao(amb, o) {
  o = o || {};
  const r = C.pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: 'Ferramenta de teste', quantidade: 1, unidade: 'un.' }] }, o.sid || 's_tiago');
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  let q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  const precos = o.precos || ['150,00', '180,00', '210,00'];
  precos.forEach((p, i) => { q = ok(amb.api(o.cotador || 's_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[i].id, precos: [{ itemId: q.itens[0].id, precoUnitario: p }], prazoDias: 5, validade: '2026-11-30', arquivo: C.PDF })).requisicao; });
  const alvo = q.cotacoes.filter((c) => c.situacao !== 'RETIRADA').sort((a, b) => a.total - b.total)[o.escolher || 0];
  const e = ok(amb.api('s_carlos', 'escolher', Object.assign({ requisicaoId: q.id, cotacaoId: alvo.id }, o.extra || {})));
  return { id: q.id, numero: q.numero, e };
}

// ------------------------------------------------------------------ item 2: ciclo ao informar compra
const comprovante = (n) => ({ nome: 'comprovante' + (n || '') + '.jpg', tipo: 'image/jpeg', base64: B64('comprovante de teste ' + (n || '')) });
function base(extra) {
  return Object.assign({ finalidade: 'Peças para a manutenção do equipamento do cliente', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ descricao: 'Rolamento 6204', quantidade: 2, unidade: 'un.' }], fornecedorNome: 'Loja de Peças Teste', valor: '80,00', formaPagamento: 'CARTAO_CREDITO',
    cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-19', comprovante: comprovante('a'), nfNumero: '12345', recebido: true }, extra || {});
}

test('P1-2a: compra informada com atraso E parecida com outra: as duas perguntas voltam juntas e, respondidas, a compra grava (sem ciclo)', () => {
  const amb = montar();
  ok(amb.api('s_tiago', 'informar', base({ destino: 'Matriz Goiânia/GO' })));
  // dez dias depois, a "mesma" compra (mesmo cartão, valor e data próxima) informada com atraso, sem destino
  amb.mudar('2026-10-29T10:00:00-03:00');
  const dados = base({ dataCompra: '2026-10-19', comprovante: comprovante('b') });
  const r1 = amb.api('s_tiago', 'informar', dados);
  assert.equal(r1.ok, true); assert.equal(r1.gravada, false);
  assert.deepEqual(r1.pendentes.map((p) => p.tipo), ['ATRASO', 'DUPLICIDADE'], 'as duas perguntas juntas');
  assert.match(r1.message, /Faltam duas respostas/);
  assert.equal(r1.duplicadas.length, 1);
  // respondeu só o atraso: volta SÓ a duplicidade (antes voltava ao atraso: o ciclo)
  const r2 = amb.api('s_tiago', 'informar', Object.assign({}, dados, { atrasoMotivo: 'Estava em campo sem sinal, voltei hoje' }));
  assert.equal(r2.gravada, false); assert.deepEqual(r2.pendentes.map((p) => p.tipo), ['DUPLICIDADE']);
  // respondeu as duas: grava, com as respostas nos apontamentos e no histórico
  const r3 = ok(amb.api('s_tiago', 'informar', Object.assign({}, dados, { atrasoMotivo: 'Estava em campo sem sinal, voltei hoje', duplicidadeMotivo: 'Uma é para a matriz e a outra para a filial' })));
  assert.equal(r3.gravada, true, r3.message);
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r3.numero);
  const ap = JSON.parse(req.INF_APONTAMENTOS);
  assert.ok(ap.some((x) => x.tipo === 'ATRASO' && /sem sinal/.test(x.texto)));
  assert.ok(ap.some((x) => x.tipo === 'DUPLICIDADE' && /confirmou que é outra compra\. Motivo: Uma é para a matriz e a outra para a filial/.test(x.texto)));
  const hist = amb.tabelas.CMP_HISTORICO.filter((h) => h.ENTIDADE_ID === req.ID).map((h) => h.TEXTO).join(' | ');
  assert.match(hist, /matriz e a outra para a filial/, 'a resposta fica no histórico');
});

test('P1-2b: destino diferente (matriz x filial) não é duplicidade; o mesmo arquivo de comprovante continua sendo; destino fora da lista é recusado', () => {
  const amb = montar();
  ok(amb.api('s_tiago', 'informar', base({ destino: 'Matriz Goiânia/GO' })));
  const f = ok(amb.api('s_tiago', 'informar', base({ destino: 'Filial Rio de Janeiro/RJ', comprovante: comprovante('c') })));
  assert.equal(f.gravada, true, 'destino diferente: grava sem perguntar');
  assert.equal(amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === f.numero).DESTINO, 'Filial Rio de Janeiro/RJ');
  const mesmo = amb.api('s_tiago', 'informar', base({ destino: 'Filial Rio de Janeiro/RJ', comprovante: comprovante('a'), valor: '81,00' }));
  assert.equal(mesmo.precisa, 'DUPLICIDADE'); assert.match(mesmo.message, /mesmo arquivo de comprovante/);
  recusa(amb.api('s_tiago', 'informar', base({ destino: 'Sede de Brasília' })), /escolha para onde vai a compra na lista/);
  const op = ok(amb.api('s_tiago', 'opcoesInformar', {}));
  assert.deepEqual(op.destinos, ['Matriz Goiânia/GO', 'Filial Rio de Janeiro/RJ']);
});

test('P1-2c: a tela mantém as respostas (o formulário não apaga a primeira ao mostrar a segunda pergunta)', () => {
  const html = fs.readFileSync(path.join(PASTA, 'JS_Compras.html'), 'utf8');
  assert.match(html, /var resp = \{ atraso: "", dup: "", perguntas: \{\} \}/);
  assert.match(html, /atrasoMotivo: resp\.atraso, duplicidadeMotivo: resp\.dup/);
  assert.match(html, /lerResp\(\); montar\(/);
  assert.doesNotMatch(html, /if \(r\.precisa === "ATRASO"\) \{ Cp_msg_/, 'o desenho antigo, que apagava a outra resposta, saiu');
});

// ------------------------------------------------------------------ item 4: WhatsApp a cada nova solicitação
test('P1-4: nova solicitação avisa NA HORA, a qualquer hora (sábado à noite), o dono, a Diretoria e o Matheus por WhatsApp e e-mail; nunca quem pediu; a conta de representação fica fora', () => {
  const amb = montar({ agora: Date.parse('2026-10-24T21:30:00-03:00') });
  const r = C.pedidoSimples(amb);
  const g = gs(amb, 'GS08');
  assert.deepEqual(g.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2', 'u_mat']);
  assert.ok(g.every((l) => l.SITUACAO === 'RESOLVIDO' && l.EMAIL_SITUACAO === 'ENVIADO'), 'saiu na hora e fica resolvido (informativo): ' + g.map((l) => l.USUARIO_ID + ':' + l.SITUACAO + '/' + l.WA_SITUACAO + '/' + l.WA_MOTIVO).join(' | '));
  assert.equal(g.find((l) => l.USUARIO_ID === 'u_mat').WA_SITUACAO, 'ENVIADO', 'Matheus (gestor, PJ) recebe fora do expediente');
  assert.equal(g.find((l) => l.USUARIO_ID === 'u_dir2').WA_SITUACAO, 'SEM_NUMERO', 'sem celular: fica no e-mail e no sistema');
  assert.equal(whatsPara(amb, FONE_MAT).length, 1); assert.equal(whatsPara(amb, FONE_DONO).length, 1); assert.equal(whatsPara(amb, FONE_DIR).length, 1);
  const w = textoWhats(whatsPara(amb, FONE_MAT)[0]);
  assert.match(w, new RegExp('Nova solicitação de compra ' + r.numero + ', de TIAGO TECNICO TESTE: Jogo de chaves de fenda isoladas'));
  assert.ok(!(amb.tabelas.NTF_GESTAO || []).some((l) => l.USUARIO_ID === 'u_rep' || l.USUARIO_ID === 'u_tec'), 'nem a representada nem quem pediu');
  const em = amb.emails.find((m) => String(m.to).indexOf('matheus@') === 0);
  assert.match(em.body || em.htmlBody, /Prazo de aprovação: 30 minutos da postagem do pedido de compra/);
  // alerta na tela do SGO+
  assert.ok((amb.tabelas.ATV_AVISOS || []).some((v) => v.DESTINATARIO_ID === 'u_mat' && /Nova solicitação de compra/.test(v.TITULO)));
  // o pedido do Matheus não avisa o próprio Matheus
  const antes = gs(amb, 'GS08').length;
  C.pedidoSimples(amb, null, 's_matheusgodoi');
  assert.deepEqual(gs(amb, 'GS08').slice(antes).map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2']);
});

// ------------------------------------------------------------------ item 3: aprovador delegado
test('P1-3a: o pedido vai à aprovação com 3 orçamentos; com menos, o comprador justifica e só o dono e a Diretoria decidem', () => {
  const amb = montar();
  const r = C.pedidoSimples(amb);
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  let q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  q = ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[0].id, precos: [{ itemId: q.itens[0].id, precoUnitario: '90,00' }], prazoDias: 5, validade: '2026-11-30', arquivo: C.PDF })).requisicao;
  recusa(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: q.cotacoes[0].id }), /por regra do dono, a compra vai à aprovação com 3 orçamentos de fornecedores diferentes \(com o arquivo\) e há 1[\s\S]*só o dono e a Diretoria decidem/);
  const e = ok(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: q.cotacoes[0].id, justificativaMinimo: 'Fornecedor único da peça original do fabricante' }));
  assert.equal(e.requisicao.situacao, 'AGUARDANDO_APROVACAO');
  amb.mudar('2026-10-19T11:00:00-03:00');
  const m = ok(amb.api('s_matheusgodoi', 'requisicao', { id: q.id })).requisicao;
  assert.equal(m.aprovacao.podeEu, false);
  assert.match(m.aprovacao.motivoNaoPode, /venceu, mas falta cumprir: pelo menos 3 orçamentos válidos, com fornecedor, valor e arquivo \(há 1\)/);
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: q.id, aprovar: true }), /falta cumprir/);
  ok(amb.api('s_dora', 'decidir', { requisicaoId: q.id, aprovar: true, texto: 'Fornecedor único conferido' }));
});

test('P1-3b: prazo do dono e da Diretoria (30 min da postagem) com contagem; depois, o Matheus aprova com o critério no histórico, e o dono e a Diretoria são avisados (GS10)', () => {
  const amb = montar();
  const p = emAprovacao(amb);
  assert.match(p.e.message, /Se o dono e a Diretoria não decidirem até 19\/10\/2026 10:30, MATHEUS GODOI pode decidir/);
  // GS06 continua para o dono e a Diretoria; o Matheus ainda não é avisado
  assert.deepEqual(gs(amb, 'GS06').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2']);
  assert.match(gs(amb, 'GS06')[0].TEXTO, /Se ninguém decidir até 19\/10\/2026 10:30, MATHEUS GODOI pode decidir com os critérios da regra/);
  // 10 minutos depois: a ficha mostra a contagem e os critérios; ele ainda não decide
  amb.mudar('2026-10-19T10:20:00-03:00');
  const f1 = ok(amb.api('s_matheusgodoi', 'requisicao', { id: p.id })).requisicao;
  const dl = f1.aprovacao.delegado;
  assert.equal(dl.liberado, false); assert.equal(dl.faltaMin, 10); assert.equal(dl.faltaTxt, '10 min'); assert.equal(dl.liberaEm, '19/10/2026 10:30'); assert.equal(dl.postadoEm, '19/10/2026 10:00');
  assert.deepEqual(dl.criterios.map((c) => c.ok), [true, true, true]);
  assert.match(dl.criterios.map((c) => c.texto).join(' | '), /3 orçamentos válidos de fornecedores diferentes \(mínimo 3\) \| escolhido o mais em conta \(R\$ 150,00\) \| sem teto de valor na regra/);
  assert.match(f1.aprovacao.motivoNaoPode, /O prazo do dono e da Diretoria vai até 19\/10\/2026 10:30 \(faltam 10 min\)/);
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /faltam 10 min/);
  // a rodada de 15 minutos ainda não avisa
  amb.ctx.CmpC_rodadaDelegado_(new amb.ctx.Date());
  assert.equal(gs(amb, 'GS09').length, 0);
  // 31 minutos: a rodada avisa o Matheus (e o dono e a Diretoria) uma vez; ele decide
  amb.mudar('2026-10-19T10:31:00-03:00');
  amb.ctx.CmpC_rodadaDelegado_(new amb.ctx.Date());
  amb.ctx.CmpC_rodadaDelegado_(new amb.ctx.Date());
  assert.deepEqual(gs(amb, 'GS09').map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2', 'u_mat'], 'uma vez só');
  assert.match(textoWhats(whatsPara(amb, FONE_MAT).pop()), /Prazo vencido na compra REQ-2026-\d+ \(Ferramenta de teste\), R\$ 150,00: MATHEUS GODOI já pode decidir/);
  const f2 = ok(amb.api('s_matheusgodoi', 'requisicao', { id: p.id })).requisicao;
  assert.equal(f2.aprovacao.podeEu, true); assert.equal(f2.aprovacao.delegado.decideComoDelegado, true);
  assert.ok(f2.aprovacao.fornecedores.length >= 3, 'lista de fornecedores para o novo orçamento');
  const d = ok(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true, texto: 'Ferramenta para o atendimento de amanhã' }));
  assert.equal(d.requisicao.situacao, 'APROVADA');
  assert.match(d.message, /o dono e a Diretoria foram avisados/);
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === p.id);
  assert.match(req.DECISAO_CRITERIO, /prazo de 30 minutos da postagem do pedido de compra vencido em 19\/10\/2026 10:30 sem decisão do dono e da Diretoria; 3 orçamentos válidos[\s\S]*não pediu nem cotou/);
  const apr = amb.tabelas.CMP_APROVACOES.filter((a) => a.REQUISICAO_ID === p.id).pop();
  assert.equal(apr.NIVEL, 'DELEGADO'); assert.match(apr.TEXTO, /Critério:/);
  assert.ok(amb.tabelas.CMP_HISTORICO.some((h) => h.ENTIDADE_ID === p.id && h.TIPO === 'DECISAO_DELEGADO' && /aprovador delegado/.test(h.TEXTO)));
  const g10 = gs(amb, 'GS10');
  assert.deepEqual(g10.map((l) => l.USUARIO_ID).sort(), ['u_adm', 'u_dir', 'u_dir2']);
  assert.match(g10[0].TITULO, /MATHEUS GODOI aprovou a compra REQ-2026-\d+ \(Ferramenta de teste\), R\$ 150,00, depois do prazo/);
  assert.match(g10[0].TEXTO, /Critério cumprido:/);
});

test('P1-3c: o Matheus não decide o que pediu nem o que cotou; o teto da regra vale; o dono e a Diretoria decidem antes do prazo', () => {
  // pediu
  let amb = montar();
  let p = emAprovacao(amb, { sid: 's_matheusgodoi' });
  amb.mudar('2026-10-19T10:40:00-03:00');
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /Quem pediu não aprova a própria compra/);
  // cotou (Matheus é gestor da área de Compras neste ensaio: compra e cota)
  amb = montar({ props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: {} }) } });
  C.regrasDeTeste(amb, { compradores: ['u_cmp', 'u_mat'] });
  p = emAprovacao(amb, { cotador: 's_matheusgodoi' });
  amb.mudar('2026-10-19T10:40:00-03:00');
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /lançou ou escolheu orçamento desta compra/);
  // teto de R$ 100,00: a compra de R$ 150,00 fica com o dono e a Diretoria
  amb = montar();
  const g = ok(amb.api('s_dora', 'regras', {})).regras;
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { tetoValor: '100,00' }) }), motivo: 'Teto de teste do aprovador delegado' }));
  p = emAprovacao(amb);
  amb.mudar('2026-10-19T10:40:00-03:00');
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /falta cumprir: valor até R\$ 100,00 \(teto do aprovador delegado; esta compra é de R\$ 150,00\)/);
  // o dono decide a qualquer momento (antes do prazo)
  amb = montar();
  p = emAprovacao(amb);
  ok(amb.api('s_admin', 'decidir', { requisicaoId: p.id, aprovar: true, texto: 'Aprovado pelo dono' }));
});

test('P1-3d: pedir novo orçamento a um contato específico: volta para cotação, atividade para o comprador, histórico e aviso ao dono e à Diretoria', () => {
  const amb = montar();
  const p = emAprovacao(amb);
  amb.mudar('2026-10-19T10:35:00-03:00');
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, acao: 'NOVO_ORCAMENTO', texto: 'Pedir com entrega em 2 dias' }), /escolha o fornecedor do cadastro ou escreva o contato/);
  const d = ok(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, acao: 'NOVO_ORCAMENTO', fornecedorId: amb.fs[3].id, contato: 'Ana, vendas', texto: 'Pedir o mesmo item com entrega em 2 dias' }));
  assert.equal(d.requisicao.situacao, 'EM_COTACAO');
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.ID === p.id);
  assert.match(req.NOVO_ORCAMENTO_CONTATO, /Fornecedor Teste Quatro · Ana, vendas/);
  assert.equal(req.REPROVACOES, 0, 'pedir novo orçamento não conta como reprovação');
  assert.equal(req.DELEGADO_AVISADO_EM, '', 'o próximo envio à aprovação avisa de novo');
  assert.ok((amb.tabelas.ATV_ATIVIDADES || []).some((a) => /^Pedir novo orçamento a Fornecedor Teste Quatro/.test(a.TITULO)));
  assert.equal(amb.tabelas.CMP_APROVACOES.filter((a) => a.REQUISICAO_ID === p.id).pop().DECISAO, 'NOVO_ORCAMENTO');
  assert.match(gs(amb, 'GS10')[0].TITULO, /MATHEUS GODOI pediu novo orçamento para a compra/);
});

test('P1-3e: a regra do aprovador delegado está em Regras de compras, mostra quem recebe e o celular; só o dono e a Diretoria alteram (versão e motivo)', () => {
  const amb = montar();
  amb.tabelas.CAD_USUARIOS.find((x) => x.ID === 'u_mat').CELULAR = '';
  // como em produção (SGO_Utilis.js): Gestor, RH e Financeiro alteram as regras de rotina da empresa
  amb.ctx.SGO_ehGestaoRotina_ = (p) => ['GESTOR', 'RH', 'FINANCEIRO'].includes(String(p).toUpperCase());
  const r = ok(amb.api('s_lia', 'regras', {}));
  assert.equal(r.delegado.podeEditar, false);
  assert.deepEqual(Array.from(r.delegado.ids), ['u_mat'], 'padrão: a conta interna MATHEUS GODOI (a representada com o mesmo nome fica fora)');
  assert.equal(r.delegado.regra.prazoMinutos, 30); assert.equal(r.delegado.regra.tetoValor, null); assert.equal(r.delegado.regra.minimoOrcamentos, 3); assert.equal(r.delegado.regra.contaDe, 'POSTADO');
  const mat = r.delegado.avisados.find((x) => x.nome === 'MATHEUS GODOI');
  assert.equal(mat.semTelefone, true); assert.match(mat.situacao, /sem telefone: o aviso vai só pelo sistema e pelo e-mail/);
  assert.match(r.delegado.avisados.find((x) => x.nome === 'DORA DIRETORA TESTE').situacao, /celular final 0010/);
  // gestor de Compras salva as outras regras, mas não o quadro do delegado
  recusa(amb.api('s_lia', 'regras', { salvar: Object.assign({}, r.regras, { delegado: Object.assign({}, r.regras.delegado, { prazoMinutos: 5 }) }), motivo: 'Tentativa de mudar o prazo do delegado' }), /só o dono e a Diretoria alteram/);
  ok(amb.api('s_lia', 'regras', { salvar: Object.assign({}, r.regras, { prazos: Object.assign({}, r.regras.prazos, { cotarDiasUteis: 2 }) }), motivo: 'Prazo de cotação de dois dias úteis' }));
  // a Diretoria muda: versão nova com o motivo; validações dizem o que fazer
  const g = ok(amb.api('s_dora', 'regras', {})).regras;
  recusa(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { prazoMinutos: 2 }) }), motivo: 'Prazo curto demais de teste' }), /de 5 a 2\.880 minutos/);
  recusa(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { aprovadorIds: ['u_rep'] }) }), motivo: 'Representada como delegado' }), /não é conta interna ativa/);
  recusa(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { aprovadorIds: ['u_dir2'] }) }), motivo: 'Diretoria como delegado' }), /o dono e a Diretoria já aprovam a qualquer momento/);
  const s = ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { prazoMinutos: '45', aprovadorIds: ['u_sub'] }) }), motivo: 'Sara como delegada nas férias do Matheus' }));
  assert.equal(s.regras.delegado.prazoMinutos, 45); assert.deepEqual(Array.from(s.regras.delegado.aprovadorIds), ['u_sub']);
  const versoes = ok(amb.api('s_dora', 'regras', {})).versoes;
  assert.match(versoes[0].motivo, /Sara como delegada/);
});

test('P1-3f: regra desligada ou aprovação só do dono e da Diretoria desligada (NAO): o delegado não decide; o resto do Financeiro continua só com o dono e a Diretoria', () => {
  let amb = montar();
  const g = ok(amb.api('s_dora', 'regras', {})).regras;
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g, { delegado: Object.assign({}, g.delegado, { ligado: false }) }), motivo: 'Desligar o aprovador delegado no teste' }));
  let p = emAprovacao(amb);
  amb.mudar('2026-10-19T11:00:00-03:00');
  const f = ok(amb.api('s_matheusgodoi', 'requisicao', { id: p.id })).requisicao;
  assert.equal(f.aprovacao.delegado, undefined);
  recusa(amb.api('s_matheusgodoi', 'decidir', { requisicaoId: p.id, aprovar: true }), /só o dono do sistema e a Diretoria aprovam/);
  amb = montar({ props: { APROVACAO_SO_DIRETORIA: 'NAO' } });
  assert.equal(amb.ctx.CmpC_rodadaDelegado_(new amb.ctx.Date()).fora.length > 0, true);
  // as outras aprovações financeiras não usam o delegado (só o dono e a Diretoria)
  const src = ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Orcamento.js', 'SGO_RecargaCaju.js', 'SGO_Financeiro_Trilha.js'].map((f2) => fs.readFileSync(path.join(PASTA, f2), 'utf8')).join('\n');
  assert.doesNotMatch(src, /SGO_delegadoIds_|delegado/i);
});
