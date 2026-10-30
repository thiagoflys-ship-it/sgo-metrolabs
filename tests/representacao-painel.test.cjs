// Painel de abertura e acompanhamento (29/10/2026): índices com as fórmulas do manual, Kanban e Gantt para a representada,
// para a Metrolabs e para o cliente do portal ("Meus chamados"), sempre pelo escopo do perfil. Código real do SGO+ no
// ambiente da Assistência (tests/_assistencia_ambiente.cjs; relógio começa na segunda 19/10/2026 às 10h). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, FOTO, em } = require('./_assistencia_ambiente.cjs');

const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js'];
const CNPJ_B = '04.252.011/0001-10';
const foto = (nome) => ({ nome: nome || 'foto.jpg', tipo: 'image/jpeg', base64: FOTO });

function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }
  ];
  a.tabelas.REP_MODELOS = [{ ID: 'mB', REPRESENTADA_ID: 'repB', CODIGO: 'LV10', NOME: 'LAVADORA BETA 10', TIPO_EQUIPAMENTO: 'Lavadora ultrassônica', GARANTIA_MESES: 24, ATIVO: 'SIM' }];
  const us = [
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  return a;
}
const CLIENTE_B = { RAZAO_SOCIAL: 'HOSPITAL SIGILOSO BETA LTDA', CNPJ: CNPJ_B, CEP: '74000-000', LOGRADOURO: 'Rua Beta', NUMERO: '10', BAIRRO: 'Centro', CIDADE: 'Goiânia', UF: 'GO',
  CONTATO: 'Carla Contato Teste', EMAIL: 'carla@hospbeta.exemplo.test', TELEFONE: '(62) 99999-0000', CIENTE: true };
const RELATO = { setor: 'CME', contatoNome: 'Carla Contato Teste', contatoTelefone: '62999990000', contatoEmail: 'carla@hospbeta.exemplo.test', sintoma: 'A lavadora não aquece a água e para no meio do ciclo com alarme sonoro.',
  inicio: 'ontem à tarde', codigoErro: 'E07', parada: 'PARCIAL', risco: 'Sem lavagem do instrumental', tentado: 'Religamos o equipamento', enquadramento: 'GARANTIA' };

/**
 * Carteira da representada B: 4 pedidos no mesmo equipamento.
 *  P1 (parado): enviado seg 10h, aceito seg 11h (60 min úteis, no prazo); a Metrolabs grava nota interna às 11h10 e responde às 11h30.
 *  P2: enviado seg 11h, aceito ter 15h (810 min úteis, fora do prazo de 240).
 *  P3: enviado seg 11h, complemento pedido seg 12h (fica com a representada).
 *  P4: enviado seg 11h, recusado seg 12h.
 */
function carteira(a) {
  const cli = ok(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B })).cliente;
  const eq = ok(a.rep('s_beto.beta', 'cadastrarEquipamento', { clienteId: cli.id, unidadeId: cli.unidades[0].id, modeloCodigo: 'LV10', serie: 'SERIE-PAINEL-B1', dataInstalacao: '2026-03-10', ciente: true, fotoEtiqueta: foto('etq.jpg') })).equipamento;
  const abrir = (extra) => ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: cli.id, unidadeId: cli.unidades[0].id, equipamentoId: eq.id, fotos: [foto()], fotosEtiqueta: [foto('e.jpg')] }, RELATO, extra || {}))).solicitacao;
  const p1 = abrir({ parada: 'TOTAL', protocolo: 'B-001' });
  a.mudar('2026-10-19T11:00:00-03:00');
  const c1 = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p1.id, prioridade: 'P2' })).chamado;
  const p2 = abrir(), p3 = abrir(), p4 = abrir();
  a.mudar('2026-10-19T11:10:00-03:00');
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c1.id, texto: 'NOTA INTERNA DO PAINEL', interna: true }));
  a.mudar('2026-10-19T11:30:00-03:00');
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c1.id, texto: 'Recebemos e vamos ligar para o cliente.' }));
  a.mudar('2026-10-19T12:00:00-03:00');
  ok(a.rep('s_gil', 'complemento', { solicitacaoId: p3.id, pergunta: 'Envie a foto do visor com o código de erro' }));
  ok(a.rep('s_gil', 'recusar', { solicitacaoId: p4.id, motivo: 'Equipamento fora da linha atendida pela Metrolabs' }));
  a.mudar('2026-10-20T15:00:00-03:00');
  const r2 = a.rep('s_gil', 'aceitar', { solicitacaoId: p2.id, prioridade: 'P3', confirmarDuplicado: true });
  const c2 = ok(r2.duplicado ? a.rep('s_gil', 'aceitar', { solicitacaoId: p2.id, prioridade: 'P3', confirmarDuplicado: true }) : r2).chamado;
  return { cli, eq, p1, p2, p3, p4, c1, c2 };
}

test('representada: índices com as fórmulas do manual (aceite no prazo, tempos em horas úteis, com quem está, reincidência), Kanban e Gantt só dela', () => {
  const a = amb();
  const k = carteira(a);
  a.mudar('2026-10-21T10:00:00-03:00');
  const r = ok(a.rep('s_beto.beta', 'painel', { dias: 30 }));
  const p = r.painel, ind = p.indices;
  assert.equal(p.externo, true);
  assert.ok(r.ganttJs.includes('SGOGantt'));
  // abertos: 2 chamados + 1 pedido com complemento (o recusado fechou)
  assert.equal(ind.abertos, 3);
  assert.equal(ind.aguardandoRepresentada, 1);
  assert.equal(ind.aguardandoMetrolabs, 2);
  assert.equal(ind.aguardandoCliente, 0);
  assert.equal(ind.enviadosPeriodo, 4);
  // aceite: 60 min (no prazo) e 810 min (fora do prazo de 240): 50%, média 435
  const m2 = a.ctx.Ast_minUteisEntre_(em('2026-10-19T11:00:00-03:00'), em('2026-10-20T15:00:00-03:00'));
  assert.equal(m2, 810);
  assert.equal(ind.aceite.total, 2); assert.equal(ind.aceite.noPrazo, 1); assert.equal(ind.aceite.pct, 50); assert.equal(ind.aceite.mediaMin, Math.round((60 + m2) / 2));
  assert.equal(ind.visita.total, 0); assert.equal(ind.conclusao.total, 0);
  // reincidência: o 2º chamado do mesmo equipamento em até 90 dias
  assert.equal(ind.reincidencia.chamados, 2); assert.equal(ind.reincidencia.reincidentes, 1); assert.equal(ind.reincidencia.pct, 50);
  assert.equal(ind.reincidencia.porModelo[0].t, 'LAVADORA BETA 10'); assert.equal(ind.reincidencia.porModelo[0].reincidentes, 1);
  // prioridade: P2 (aceito como P2) e P3; o pedido com complemento conta P3 previsto
  assert.deepEqual(ind.porPrioridade.map((x) => x.n), [0, 1, 2, 0]);
  assert.equal(ind.porUf[0].t, 'GO'); assert.equal(ind.porCliente[0].t, 'HOSPITAL SIGILOSO BETA LTDA'); assert.equal(ind.porCliente[0].n, 4);
  assert.equal(ind.garantia.find((g) => g.codigo === 'EM_GARANTIA').n, 3); // 2 chamados + o pedido aberto; o recusado não conta
  // índices só da Metrolabs não vão para a representada
  for (const kInt of ['primeiroContato', 'slaPorPrioridade', 'fila', 'cargaTecnico', 'porRepresentada']) assert.equal(ind[kInt], undefined, kInt);
  // pendência dela: o complemento, com a pergunta
  assert.equal(p.pendencias.length, 1); assert.equal(p.pendencias[0].id, k.p3.id); assert.match(p.pendencias[0].pergunta, /foto do visor/);
  // Kanban: colunas pelas etapas REP_ETAPAS; cada cartão uma vez; cartão sem dado interno
  const cartoes = [].concat(...p.kanban.map((c) => c.itens));
  assert.deepEqual(p.kanban.map((c) => c.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(p.kanban.find((c) => c.n === 2).itens[0].id, k.p3.id);
  assert.equal(p.kanban.find((c) => c.n === 2).itens[0].podeResponder, true);
  assert.equal(p.kanban.find((c) => c.n === 3).qtd, 1); // recusado nos últimos 30 dias
  assert.equal(p.kanban.find((c) => c.n === 4).qtd, 2);
  assert.equal(cartoes.length, 4);
  for (const c of cartoes) for (const campo of ['representadaId', 'representadaNome', 'tecnicoId', 'situacao']) assert.equal(c[campo], undefined, campo);
  assert.equal(cartoes.find((c) => c.id === k.c2.id).reincidente, true);
  assert.equal(cartoes.find((c) => c.id === k.c1.id).pedidoNumero, k.p1.numero);
  // Gantt: barras do envio até agora (abertos) ou até o fim; prazo do pedido aberto pausado
  assert.equal(p.gantt.length, 4);
  const g3 = p.gantt.find((x) => x.id === k.p3.id);
  assert.equal(g3.prazo.estado, 'PAUSADO'); assert.equal(g3.aberto, true); assert.equal(g3.enviadoMs, em('2026-10-19T11:00:00-03:00'));
  const g4 = p.gantt.find((x) => x.id === k.p4.id);
  assert.equal(g4.aberto, false); assert.equal(g4.fimMs, em('2026-10-19T12:00:00-03:00'));
  // nada interno no painel dela
  const txt = JSON.stringify(r);
  for (const s of ['NOTA INTERNA DO PAINEL', 'GIL GESTOR', 'u_gt', '98765']) assert.ok(!txt.includes(s), s);
  // a outra representada não vê nada da B
  const ra = ok(a.rep('s_ana.alfa', 'painel', {}));
  assert.equal(ra.painel.indices.abertos, 0); assert.equal(ra.painel.gantt.length, 0);
  const txtA = JSON.stringify(ra);
  for (const s of ['HOSPITAL SIGILOSO', 'SERIE-PAINEL-B1', k.p1.numero, k.c1.numero, 'REPRESENTADA BETA']) assert.ok(!txtA.includes(s), s);
  // período desconhecido cai no padrão de 90 dias
  assert.equal(ok(a.rep('s_beto.beta', 'painel', { dias: 7 })).painel.indices.dias, 90);
});

test('ficha do chamado da representada: marcos previsto x realizado (envio, aceite, visita, conclusão)', () => {
  const a = amb();
  const k = carteira(a);
  const f = ok(a.rep('s_beto.beta', 'chamado', { tipo: 'CHAMADO', id: k.c2.id }));
  assert.deepEqual(f.marcos.map((m) => m.nome), ['Pedido enviado', 'Aceite pela Metrolabs', 'Visita', 'Conclusão']);
  const ac = f.marcos[1];
  assert.equal(ac.realizadoMs, em('2026-10-20T15:00:00-03:00'));
  assert.equal(ac.previstoMs, a.ctx.Ast_somarMinUteis_(em('2026-10-19T11:00:00-03:00'), 240));
  assert.equal(ac.atrasado, true);
  assert.equal(ok(a.rep('s_beto.beta', 'chamado', { tipo: 'CHAMADO', id: k.c1.id })).marcos[1].atrasado, false);
  // pedido ainda sem aceite: aceite previsto, sem realizado
  const fp = ok(a.rep('s_beto.beta', 'chamado', { tipo: 'SOLICITACAO', id: k.p3.id }));
  assert.equal(fp.marcos[1].realizadoMs, null);
  assert.ok(!JSON.stringify(fp).includes('NOTA INTERNA'));
});

test('Metrolabs: SLA de aceite e de primeiro contato, fila, carga por técnico e por representada; filtro por representada; técnico só vê os chamados dele', () => {
  const a = amb();
  const k = carteira(a);
  a.mudar('2026-10-21T10:00:00-03:00');
  const r = ok(a.rep('s_gil', 'painel', { dias: 30 }));
  const ind = r.painel.indices;
  assert.equal(r.painel.externo, false);
  assert.equal(ind.aceite.total, 2); assert.equal(ind.aceite.pct, 50);
  // primeiro contato: a nota interna (11h10) não conta; a mensagem à representada (11h30) conta: 30 min úteis depois do aceite
  assert.equal(ind.primeiroContato.total, 1); assert.equal(ind.primeiroContato.noPrazo, 1); assert.equal(ind.primeiroContato.mediaMin, 30);
  assert.equal(ind.primeiroContato.semRegistro, 1); // o 2º chamado ainda sem registro da Metrolabs
  // fila: só o pedido aguardando (com complemento)
  assert.equal(ind.fila.length, 1); assert.equal(ind.fila[0].id, k.p3.id); assert.equal(ind.fila[0].representada, 'REPRESENTADA BETA TESTE');
  assert.equal(ind.cargaTecnico.length, 1); assert.equal(ind.cargaTecnico[0].nome, 'Sem técnico definido'); assert.equal(ind.cargaTecnico[0].abertos, 2);
  assert.equal(ind.porRepresentada.length, 1); assert.equal(ind.porRepresentada[0].abertos, 3); assert.equal(ind.porRepresentada[0].fila, 1); assert.equal(ind.porRepresentada[0].aceitePct, 50);
  assert.deepEqual(ind.slaPorPrioridade.map((x) => x.codigo), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(ind.slaPorPrioridade.find((x) => x.codigo === 'P2').abertos, 1);
  const cartoes = [].concat(...r.painel.kanban.map((c) => c.itens));
  assert.equal(cartoes.find((c) => c.id === k.c1.id).representadaNome, 'REPRESENTADA BETA TESTE');
  // filtro por representada
  const soA = ok(a.rep('s_gil', 'painel', { representadaId: 'repA' }));
  assert.equal(soA.painel.indices.abertos, 0); assert.equal(soA.painel.gantt.length, 0);
  // técnico: o servidor filtra os chamados pelo que ele pode ver (AstC_podeVer_: o dele; fora da triagem e da fila livre)
  Object.assign(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === k.c1.id), { SITUACAO: 'PLANEJADO', TECNICO_ID: 'u_tec2', TECNICO_NOME: 'TALES TECNICO TESTE' });
  Object.assign(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === k.c2.id), { SITUACAO: 'PLANEJADO', TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE' });
  const tec = ok(a.rep('s_tiago', 'painel', { dias: 30 }));
  assert.deepEqual([].concat(...tec.painel.kanban.map((c) => c.itens)).filter((c) => c.tipo === 'CHAMADO').map((c) => c.id), [k.c2.id]);
  assert.ok(!JSON.stringify(tec).includes('TALES'));
  const ger = ok(a.rep('s_gil', 'painel', { dias: 30 })).painel.indices;
  assert.deepEqual(ger.cargaTecnico.map((t) => t.nome).sort(), ['TALES TECNICO TESTE', 'TIAGO TECNICO TESTE']);
  // a representada não chama o painel com outra representada (o filtro é ignorado: vale a sessão)
  const rb = ok(a.rep('s_beto.beta', 'painel', { representadaId: 'repA' }));
  assert.equal(rb.painel.indices.abertos, 3);
});

test('cliente do portal: painel com os chamados dele (5 etapas), sem técnico, sem prazo interno e sem a conversa com a representada', () => {
  const a = amb();
  const k = carteira(a);
  // conta do portal para o cliente da representada e um chamado do outro cliente (c1), aberto pela Metrolabs
  a.tabelas.CAD_USUARIOS.push({ ID: 'u_cliB', USUARIO: 'cliente.hospb', NOME: 'CLIENTE HOSP B TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospbeta.exemplo.test', CLIENTE_ID: k.cli.id });
  a.sessoes['s_cliente.hospb'] = { userId: 'u_cliB', usuario: 'cliente.hospb', nome: 'CLIENTE HOSP B TESTE', perfil: 'CLIENTE', clienteId: k.cli.id };
  ok(a.rep('s_beto.beta', 'enviarMensagem', { refTipo: 'CHAMADO', refId: k.c1.id, texto: 'CONVERSA SIGILOSA COM A METROLABS' }));
  const outro = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave do cliente alfa não completa o ciclo', solicitante: 'Rui', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' })).chamado;
  a.mudar('2026-10-21T10:00:00-03:00');
  const r = ok(a.api('s_cliente.hospb', 'portal', {}));
  const p = r.painel, ind = p.indices;
  assert.ok(r.ganttJs.includes('SGOGantt'));
  assert.equal(ind.abertos, 3); // 2 chamados + o pedido em análise (com complemento)
  assert.equal(ind.emAnalise, 3); assert.equal(ind.emAtendimento, 0); assert.equal(ind.visitaAgendada, 0); assert.equal(ind.concluidos, 0); assert.equal(ind.proximaVisita, null);
  assert.deepEqual(p.kanban.map((c) => c.nome), ['Recebido', 'Em análise', 'Visita agendada', 'Em atendimento', 'Concluído']);
  const nums = [].concat(...p.kanban.map((c) => c.itens)).map((x) => x.numero);
  assert.ok(nums.includes(k.c1.numero)); assert.ok(nums.includes(k.c2.numero)); assert.ok(nums.includes(k.p3.numero));
  assert.ok(!nums.includes(outro.numero)); assert.ok(!nums.includes(k.p4.numero)); // recusado não aparece
  const txt = JSON.stringify(p);
  for (const s of ['CONVERSA SIGILOSA', 'NOTA INTERNA', 'GIL GESTOR', 'TIAGO', 'REPRESENTADA BETA', 'SLA', 'prazo']) assert.ok(!txt.includes(s), s);
  // o cliente c1 só vê o chamado dele
  const r1 = ok(a.api('s_cliente.alfa', 'portal', {}));
  const n1 = [].concat(...r1.painel.kanban.map((c) => c.itens)).map((x) => x.numero);
  assert.deepEqual(n1, [outro.numero]);
  assert.equal(r1.painel.gantt.length, 1); assert.equal(r1.painel.gantt[0].aberto, true);
});

test('cliente do portal: concluído no período, próxima visita e tempo médio até a conclusão em horas úteis', () => {
  const a = amb();
  const c = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave não completa o ciclo', solicitante: 'Rui', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' })).chamado;
  const d = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq2', sintoma: 'Lavadora com vazamento na porta', solicitante: 'Rui', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' })).chamado;
  // conclusão e agenda gravadas direto (o fluxo de campo tem os próprios testes)
  const ch = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  Object.assign(ch, { SITUACAO: 'ENCERRADO', ATENDIDO_EM: '2026-10-20T10:00:00', ENCERRADO_EM: '2026-10-20T11:00:00' });
  Object.assign(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === d.id), { SITUACAO: 'AGENDADO', AGENDADO_PARA: '2026-10-22T09:00:00', TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE' });
  a.mudar('2026-10-21T10:00:00-03:00');
  const p = ok(a.api('s_cliente.alfa', 'portal', {})).painel, ind = p.indices;
  assert.equal(ind.concluidos, 1);
  assert.equal(ind.mediaConclusaoMin, a.ctx.Ast_minUteisEntre_(a.ctx.Ast_ms_(ch.ABERTO_EM), em('2026-10-20T10:00:00-03:00')));
  assert.equal(ind.mediaConclusaoMin, 570); // seg 10h -> ter 10h = um dia de expediente (8h às 17h30)
  assert.equal(ind.visitaAgendada, 1); assert.equal(ind.proximaVisita.numero, d.numero); assert.equal(ind.proximaVisita.quando, '22/10/2026 09:00');
  assert.equal(p.kanban.find((x) => x.n === 5).itens[0].id, c.id);
  assert.equal(p.kanban.find((x) => x.n === 3).itens[0].visitaPrevMs, em('2026-10-22T09:00:00-03:00'));
  assert.ok(!JSON.stringify(p).includes('TIAGO'));
});

test('telas: painel nos três perfis com os componentes do SGO+ (sem estilo próprio paralelo) e o painel incluído na página', () => {
  const rep = fs.readFileSync(path.join(pasta, 'JS_Representacao.html'), 'utf8');
  const pna = fs.readFileSync(path.join(pasta, 'JS_PainelAtendimento.html'), 'utf8');
  const ast = fs.readFileSync(path.join(pasta, 'JS_Assistencia.html'), 'utf8');
  const idx = fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8');
  assert.ok(!/<style|rp-caixa|rp-btn|rpEstilo/.test(rep), 'JS_Representacao.html não tem estilo próprio');
  for (const c of ['module-header', 'at-tabs', 'at-card', 'at-faixa', 'btn-primary', 'PnA_kanbanHtml_', 'PnA_ganttHtml_', 'PnA_indHtml_', 'PnA_marcosHtml_']) assert.ok(rep.includes(c), c);
  for (const c of ['atv-kanban', 'atv-kcol', 'atv-kcard', 'atv-gantt-wrap', 'atv-ind', 'atv-barra-ind', 'motores-tabs', 'SGOGantt']) assert.ok(pna.includes(c), c);
  assert.ok(ast.includes('PnA_kanbanHtml_(p.kanban') && ast.includes('PnA_ganttHtml_(p.gantt'));
  assert.ok(idx.indexOf("include('JS_PainelAtendimento')") > idx.indexOf("include('JS_Atividades')"));
  assert.ok(idx.indexOf("include('JS_PainelAtendimento')") < idx.indexOf("include('JS_Assistencia')"));
  // a representada não arrasta: nenhum cartão arrastável
  assert.ok(pna.includes('draggable="false"') && !pna.includes('draggable="true"'));
});
