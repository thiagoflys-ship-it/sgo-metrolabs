// Representação (03/11/2026, pedido do dono): "Abrir em nome da representada" (pedido que chega por telefone, e-mail ou
// WhatsApp) e "Ligar à representada" um chamado comum já aberto, só para quem está na lista restrita que o Administrador
// define (começa vazia; a conta do Matheus é só sugerida). Mesma validação e mesmo escopo do pedido da própria representada;
// o pedido nasce igual (fila, prazo, avisos) e a representada vê a origem. Isolamento: a representada nunca chama as
// ações novas; quem está fora da lista é recusado. Código real no ambiente da Assistência. Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, FOTO } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js'];
const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const NOVAS = ['emNomeBuscarCliente', 'emNomeBuscarEquipamento', 'abrirEmNome', 'ligarChamado', 'emNomeConfig', 'emNomeSalvar'];

function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repX', NOME: 'REPRESENTADA INATIVA TESTE', SITUACAO: 'INATIVA', PRAZOS_JSON: '' }
  ];
  a.tabelas.REP_MODELOS = [];
  const us = [
    { ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus.godoi@metrolabs.com.br', AREA: 'COMERCIAL' },
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, representadaId: u.REPRESENTADA_ID || '' }; });
  a.logs = [];
  a.ctx.SGO_DATA.log = (acao, usuario, detalhe, modulo) => { a.logs.push({ acao, usuario, detalhe, modulo }); };
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  a.marcar = (ids) => ok(a.rep('s_admin', 'emNomeSalvar', { ids }));
  return a;
}
const RELATO = { setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777', contatoEmail: 'rui@alfa.exemplo.test', sintoma: 'A autoclave não completa o ciclo e apita no final da secagem, todos os dias.',
  inicio: 'ontem de manhã', codigoErro: 'E12', parada: 'PARCIAL', risco: 'Atraso na esterilização', tentado: 'Religamos o equipamento', enquadramento: 'NAO_SEI' };
const PEDIDO = Object.assign({ representadaId: 'repA', canal: 'TELEFONE', pedidoPorNome: 'Fulano da Alfa', pedidoPorContato: '(62) 99999-1234', clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1' }, RELATO);

test('a lista começa vazia: ninguém abre em nome (nem gestor, nem responsável); o Matheus é só sugerido; só o Administrador muda a lista', () => {
  const a = amb();
  for (const sid of ['s_gil', 's_matheusgodoi', 's_admin', 's_dora']) {
    assert.equal(ok(a.rep(sid, 'iniciar')).podeAbrirEmNome, false, sid);
    const r = a.rep(sid, 'abrirEmNome', PEDIDO);
    assert.equal(r.ok, false); assert.equal(r.codigo, 'PERMISSAO', sid); assert.match(r.message, /lista "Quem pode abrir pedido em nome da representada"/);
  }
  // só o Administrador lê e muda a lista
  for (const sid of ['s_gil', 's_dora', 's_matheusgodoi']) {
    assert.equal(a.rep(sid, 'emNomeConfig').ok, false, sid);
    assert.equal(a.rep(sid, 'emNomeSalvar', { ids: ['u_mat'] }).ok, false, sid);
  }
  const cfg = ok(a.rep('s_admin', 'emNomeConfig'));
  assert.deepEqual(JSON.parse(JSON.stringify(cfg.ids)), []);
  assert.equal(cfg.sugestao.id, 'u_mat', 'a conta com o e-mail do Matheus aparece como sugestão');
  assert.equal(a.props.REP_ABRE_EM_NOME_CFG, undefined, 'nada é gravado sozinho');
  // cliente e representada não entram na lista
  const ruim = a.rep('s_admin', 'emNomeSalvar', { ids: ['u_mat', 'u_cli'] });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /só entram contas ativas da equipe/);
  assert.equal(a.rep('s_admin', 'emNomeSalvar', { ids: ['ra_adm'] }).ok, false);
  const salvo = a.marcar(['u_mat']);
  assert.match(salvo.message, /MATHEUS GODOI TESTE/);
  assert.equal(salvo.sugestao, null);
  assert.ok(a.logs.some((l) => l.acao === 'REP_EMNOME_LISTA' && /entrou: MATHEUS GODOI TESTE/.test(l.detalhe)), 'auditoria da lista');
  assert.equal(ok(a.rep('s_matheusgodoi', 'iniciar')).podeAbrirEmNome, true);
  assert.equal(ok(a.rep('s_gil', 'iniciar')).podeAbrirEmNome, false);
  // conta inativada deixa de valer sozinha
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_mat').STATUS = 'INATIVO';
  assert.equal(a.rep('s_matheusgodoi', 'abrirEmNome', PEDIDO).codigo, 'PERMISSAO');
});

test('abrir em nome: escopo da representada escolhida (busca pelo CNPJ e pela série), campos obrigatórios, nasce igual ao normal e com a origem', () => {
  const a = amb();
  a.marcar(['u_mat']);
  // sem a busca, o cliente não está no escopo da representada (mesma regra do pedido dela)
  const fora = a.rep('s_matheusgodoi', 'abrirEmNome', PEDIDO);
  assert.equal(fora.ok, false); assert.ok(fora.faltam.some((f) => f.campo === 'clienteId'));
  assert.equal(ok(a.rep('s_matheusgodoi', 'emNomeBuscarCliente', { representadaId: 'repA', documento: '11222333000181' })).encontrado, true);
  assert.equal(ok(a.rep('s_matheusgodoi', 'emNomeBuscarEquipamento', { representadaId: 'repA', clienteId: 'c1', serie: 'S-100' })).encontrado, true);
  // a busca feita para a A não vale para a B
  assert.ok(a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { representadaId: 'repB' })).faltam.some((f) => f.campo === 'clienteId'));
  // representada inativa e campos de quem pediu
  assert.equal(a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { representadaId: 'repX' })).codigo, 'REP_INATIVA');
  const inc = a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { canal: 'CARTA', pedidoPorNome: '', pedidoPorContato: '' }));
  assert.equal(inc.ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(inc.faltam.map((f) => f.campo))), ['canal', 'pedidoPorNome', 'pedidoPorContato']);
  const relatoCurto = a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { sintoma: 'não liga' }));
  assert.ok(relatoCurto.faltam.some((f) => f.campo === 'sintoma'), 'o mesmo relato do pedido normal');
  assert.equal(a.tabelas.ATEC_SOLICITACOES.length, 0, 'nada gravado nas recusas');
  // aberto (fotos opcionais: o pedido veio por telefone)
  const r = ok(a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { fotos: [{ nome: 'f.jpg', tipo: 'image/jpeg', base64: FOTO }] })));
  assert.match(r.message, /aberto em nome da REPRESENTADA ALFA TESTE/);
  const s = a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === r.solicitacao.id);
  assert.equal(s.ORIGEM, 'REPRESENTACAO'); assert.equal(s.SITUACAO, 'NOVA'); assert.equal(s.REPRESENTADA_ID, 'repA');
  assert.equal(s.POR_ID, '', 'POR_ID nunca é a pessoa da Metrolabs (pedido por telefone, sem conta de quem pediu)');
  assert.equal(s.POR_NOME, 'Aberto pela Metrolabs (MATHEUS GODOI TESTE) a pedido de Fulano da Alfa (REPRESENTADA ALFA TESTE), por telefone');
  assert.equal(s.EM_NOME_CANAL, 'TELEFONE'); assert.equal(s.EM_NOME_PEDIDO_POR_CONTATO, '(62) 99999-1234'); assert.equal(s.EM_NOME_METROLABS_ID, 'u_mat');
  assert.ok(Number(s.ACEITE_MIN_UTEIS) > 0, 'prazo de aceite como o normal');
  const ev = a.tabelas.ATEC_EVENTOS.find((e) => e.ENTIDADE_ID === s.ID && e.TIPO === 'ABERTURA_EM_NOME');
  assert.ok(ev); assert.equal(ev.PUBLICO, 'REPRESENTADA'); assert.match(ev.TEXTO, /a pedido de Fulano da Alfa/); assert.equal(ev.USUARIO_ID, 'u_mat');
  const an = a.tabelas.REP_ANEXOS.find((x) => x.REF_ID === s.ID);
  assert.equal(an.POR_LADO, 'METROLABS');
  // a fila da Metrolabs mostra o pedido como os demais
  assert.ok(ok(a.rep('s_gil', 'solicitacoes', {})).solicitacoes.some((x) => x.id === s.ID));
  // a representada vê e acompanha, com a origem
  const lista = ok(a.rep('s_ana.alfa', 'chamados', {})).itens;
  const item = lista.find((x) => x.id === s.ID);
  assert.ok(item); assert.match(item.origemTexto, /^Aberto pela Metrolabs \(MATHEUS GODOI TESTE\) a pedido de Fulano da Alfa/);
  const ficha = ok(a.rep('s_ana.alfa', 'chamado', { tipo: 'SOLICITACAO', id: s.ID }));
  assert.ok(ficha.linhaDoTempo.some((e) => /por telefone/.test(e.texto)));
  // a B não vê
  assert.ok(!JSON.stringify(a.rep('s_beto.beta', 'chamados', {})).includes(s.NUMERO));
  // auditoria e registro de ações da representada
  assert.ok(a.tabelas.REP_ACESSOS.some((x) => x.ACAO === 'PEDIDO_EM_NOME' && x.REPRESENTADA_ID === 'repA' && x.USUARIO_ID === 'u_mat'));
  assert.ok(a.logs.some((l) => l.acao === 'REP_PEDIDO_EM_NOME' && /Fulano da Alfa/.test(l.detalhe)));
  // aceitar segue igual: vira chamado com a marca da representada
  const ac = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: s.ID, prioridade: 'P3' }));
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((c) => c.ID === ac.chamado.id).REPRESENTADA_ID, 'repA');
});

test('ligar à representada um chamado comum já aberto: lista restrita, motivo, uma vez; a representada passa a ver com o motivo', () => {
  const a = amb();
  const c = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave parou no meio do ciclo, urgência', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P1', parada: 'TOTAL', canal: 'TELEFONE' })).chamado;
  // fora da lista: recusado pelas duas entradas (Representação e Assistência)
  const r0 = a.api('s_gil', 'ligarRepresentada', { id: c.id, representadaId: 'repA', motivo: 'urgência atendida antes por telefone' });
  assert.equal(r0.ok, false); assert.match(r0.message, /Quem pode abrir pedido em nome da representada/);
  assert.equal(a.rep('s_gil', 'ligarChamado', { chamadoId: c.id, representadaId: 'repA', motivo: 'urgência atendida antes por telefone' }).ok, false);
  assert.equal(ok(a.api('s_gil', 'iniciar', {})).podeLigarRepresentada, false);
  a.marcar(['u_mat']);
  assert.equal(ok(a.api('s_matheusgodoi', 'iniciar', {})).podeLigarRepresentada, true);
  const curto = a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repA', motivo: 'urgente' });
  assert.equal(curto.ok, false); assert.match(curto.message, /motivo/);
  const r = ok(a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repA', motivo: 'Urgência atendida antes por telefone; a Alfa pediu depois.' }));
  assert.match(r.message, /ligado à REPRESENTADA ALFA TESTE/);
  const ch = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  assert.equal(ch.REPRESENTADA_ID, 'repA'); assert.equal(ch.REP_LIGADO_POR_ID, 'u_mat'); assert.match(ch.REP_LIGADO_MOTIVO, /Urgência atendida antes/);
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === c.id && e.TIPO === 'LIGADO_REPRESENTADA' && e.PUBLICO === 'REPRESENTADA'));
  const it = ok(a.rep('s_ana.alfa', 'chamados', {})).itens.find((x) => x.id === c.id);
  assert.ok(it); assert.match(it.origemTexto, /Ligado à sua empresa pela Metrolabs \(MATHEUS GODOI TESTE\)[\s\S]*Motivo: Urgência/);
  assert.ok(!JSON.stringify(a.rep('s_beto.beta', 'chamados', {})).includes(c.numero), 'a B não vê');
  // uma vez só
  const de2 = a.rep('s_matheusgodoi', 'ligarChamado', { chamadoId: c.id, representadaId: 'repB', motivo: 'tentativa de ligar de novo a outra' });
  assert.equal(de2.ok, false); assert.equal(de2.codigo, 'JA_LIGADO');
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).REPRESENTADA_ID, 'repA');
  assert.ok(a.tabelas.REP_ACESSOS.some((x) => x.ACAO === 'CHAMADO_LIGADO' && x.USUARIO_ID === 'u_mat'));
  assert.ok(a.logs.some((l) => l.acao === 'REP_CHAMADO_LIGADO'));
});

test('isolamento: a representada nunca chama as ações novas; o cliente do portal também não; nada é gravado', () => {
  const a = amb();
  a.marcar(['u_mat']);
  for (const acao of NOVAS) {
    assert.ok(!Object.prototype.hasOwnProperty.call(a.ctx.REP_ACOES_REPRESENTADA, acao), acao + ' não pode estar nas ações da representada');
    assert.ok(Object.prototype.hasOwnProperty.call(a.ctx.REP_ACOES_INTERNAS, acao), acao);
    for (const sid of ['s_ana.alfa', 's_beto.beta']) {
      const r = a.rep(sid, acao, Object.assign({}, PEDIDO, { ids: ['ra_adm'], chamadoId: 'x', motivo: 'tentativa indevida de ligar', documento: '11222333000181', serie: 'S-100' }));
      assert.equal(r.ok, false, sid + ' ' + acao); assert.match(r.message, /desconhecida/);
    }
    assert.equal(a.rep('s_cliente.alfa', acao, PEDIDO).ok, false);
  }
  // a representada também não chega pela Assistência
  assert.equal(a.api('s_ana.alfa', 'ligarRepresentada', { id: 'x', representadaId: 'repA', motivo: 'tentativa indevida' }).ok, false);
  assert.equal(a.tabelas.ATEC_SOLICITACOES.length, 0);
  assert.equal(JSON.parse(a.props.REP_ABRE_EM_NOME_CFG).ids.join(','), 'u_mat', 'a lista não mudou');
});

test('telas, ajuda, manual e base do assistente falam da ação nova (botão só para quem está na lista)', () => {
  const t = ler('JS_Representacao.html');
  assert.match(t, /RP\.ini\.podeAbrirEmNome/);
  assert.match(t, /"abrirEmNome"/); assert.match(t, /"emNomeSalvar"/);
  const at = ler('JS_Assistencia.html');
  assert.match(at, /ini\.podeLigarRepresentada/); assert.match(at, /"ligarRepresentada"/);
  assert.match(ler('SGO_Ajuda_Representacao.js'), /Abrir em nome da representada/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Abrir em nome da representada/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Excluir usuário/);
});

// ---------------------------------------------------------------- revisão de e2ce04e
function espiarAvisosRep(a) {
  const chamadas = [];
  const orig = a.ctx.SGO_notificar_;
  a.ctx.SGO_notificar_ = (o) => { if (o && o.categoria === 'REPRESENTACAO') chamadas.push(o.usuarios.slice()); return orig(o); };
  return chamadas;
}
test('revisão: pedido aberto em nome: os avisos à representada vão para quem pediu (conta dela) e os administradores, nunca para quem abriu na Metrolabs', () => {
  const a = amb();
  a.marcar(['u_mat']);
  const av = espiarAvisosRep(a);
  ok(a.rep('s_matheusgodoi', 'emNomeBuscarCliente', { representadaId: 'repA', documento: '11222333000181' }));
  ok(a.rep('s_matheusgodoi', 'emNomeBuscarEquipamento', { representadaId: 'repA', clienteId: 'c1', serie: 'S-100' }));
  // quem pediu tem conta na representada (o contato é o e-mail dela)
  a.tabelas.CAD_USUARIOS.push({ ID: 'ra_at', USUARIO: 'bia.alfa', NOME: 'BIA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'bia@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ATENDENTE' });
  const r1 = ok(a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { pedidoPorNome: 'Bia da Alfa', pedidoPorContato: ' Bia@Alfa.exemplo.test ' })));
  const s1 = a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === r1.solicitacao.id);
  assert.equal(s1.POR_ID, 'ra_at'); assert.equal(s1.EM_NOME_METROLABS_ID, 'u_mat');
  // por telefone: sem conta, POR_ID vazio (os avisos vão aos administradores da representada)
  const r2 = ok(a.rep('s_matheusgodoi', 'abrirEmNome', PEDIDO));
  const s2 = a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === r2.solicitacao.id);
  assert.equal(s2.POR_ID, '');
  ok(a.rep('s_gil', 'complemento', { solicitacaoId: s2.ID, id: s2.ID, pergunta: 'Qual o código de erro exato que aparece no visor?', texto: 'Qual o código de erro exato que aparece no visor?' }));
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'SOLICITACAO', refId: s1.ID, texto: 'Recebemos o pedido, vamos ligar.' }));
  assert.ok(av.length >= 3, 'houve avisos à representada');
  for (const ids of av) { assert.ok(!ids.includes('u_mat'), 'nunca para a pessoa da Metrolabs: ' + ids); assert.ok(ids.includes('ra_adm')); }
  assert.ok(av.some((ids) => ids.includes('ra_at')), 'quem pediu (conta da representada) recebe');
  // mesmo que um POR_ID antigo aponte para alguém de fora da representada, o aviso não vai para ele
  a.tabelas.ATEC_SOLICITACOES.find((x) => x.ID === s2.ID).POR_ID = 'u_mat';
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'SOLICITACAO', refId: s2.ID, texto: 'Outra mensagem para a representada.' }));
  assert.ok(!av[av.length - 1].includes('u_mat'));
});

test('revisão: "Ligar à representada" errado: o texto manda falar com o Administrador; só ele desliga, com motivo; pedido da representada não desliga', () => {
  const a = amb();
  a.marcar(['u_mat']);
  const c = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave parou no meio do ciclo, urgência', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P1', parada: 'TOTAL', canal: 'TELEFONE' })).chamado;
  ok(a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repA', motivo: 'Urgência atendida antes por telefone.' }));
  const de2 = a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repB', motivo: 'era da outra representada' });
  assert.equal(de2.ok, false); assert.match(de2.message, /fale com o Administrador: ele desliga/);
  for (const sid of ['s_matheusgodoi', 's_gil', 's_dora']) assert.equal(a.api(sid, 'desligarRepresentada', { id: c.id, motivo: 'ligado à representada errada' }).ok, false, sid);
  assert.equal(a.api('s_admin', 'desligarRepresentada', { id: c.id, motivo: 'curto' }).ok, false);
  assert.equal(ok(a.api('s_admin', 'representacao', { id: c.id })).representacao.podeDesligar, true);
  const r = ok(a.api('s_admin', 'desligarRepresentada', { id: c.id, motivo: 'Ligado à representada errada; é da Beta.' }));
  assert.match(r.message, /desligado da REPRESENTADA ALFA TESTE/);
  const ch = a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  assert.equal(ch.REPRESENTADA_ID, ''); assert.match(ch.REP_DESLIGADO_MOTIVO, /errada/);
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === c.id && e.TIPO === 'DESLIGADO_REPRESENTADA'));
  assert.ok(!JSON.stringify(a.rep('s_ana.alfa', 'chamados', {})).includes(c.numero), 'a Alfa deixa de ver');
  ok(a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repB', motivo: 'Agora sim, a Beta pediu este atendimento.' }));
  assert.equal(a.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).REPRESENTADA_ID, 'repB');
  // chamado que nasceu de pedido da representada não é desligado
  ok(a.rep('s_matheusgodoi', 'emNomeBuscarCliente', { representadaId: 'repA', documento: '11222333000181' }));
  ok(a.rep('s_matheusgodoi', 'emNomeBuscarEquipamento', { representadaId: 'repA', clienteId: 'c1', serie: 'S-100' }));
  const sol = ok(a.rep('s_matheusgodoi', 'abrirEmNome', PEDIDO)).solicitacao;
  const ac = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol.id, prioridade: 'P3', confirmarDuplicado: true }));
  const nao = a.api('s_admin', 'desligarRepresentada', { id: ac.chamado.id, motivo: 'tentativa de desligar pedido' });
  assert.equal(nao.ok, false); assert.match(nao.message, /nasceu de um pedido da representada/);
  assert.ok(!Object.prototype.hasOwnProperty.call(a.ctx.REP_ACOES_REPRESENTADA, 'desligarChamado'));
  assert.match(ler('JS_Assistencia.html'), /"desligarRepresentada"/);
});

// ---------------------------------------------------------------- segunda revisão
test('revisão 2: ao desligar, a representada errada perde TUDO do chamado (documentos, anexos, mensagens, fotos liberadas)', () => {
  const a = amb();
  a.marcar(['u_mat']);
  const c = ok(a.api('s_gil', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave parou no meio do ciclo, urgência', solicitante: 'Rui Responsável Teste', contato: '62988887777', prioridade: 'P1', parada: 'TOTAL', canal: 'TELEFONE' })).chamado;
  ok(a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repA', motivo: 'Urgência atendida antes por telefone.' }));
  // o que a Alfa passou a ver deste chamado
  (a.tabelas.REP_DOCUMENTOS = a.tabelas.REP_DOCUMENTOS || []).push({ ID: 'doc1', TIPO: 'ATENDIMENTO', PUBLICO: 'REPRESENTADA', REPRESENTADA_ID: 'repA', CHAMADO_ID: c.id, CHAMADO_NUMERO: c.numero, HTML_ID: 'arq-doc-html', PDF_ID: 'arq-doc-pdf', VERSAO: 1, EM: '2026-10-19T10:00:00' });
  (a.tabelas.REP_ANEXOS = a.tabelas.REP_ANEXOS || []).push({ ID: 'an1', REPRESENTADA_ID: 'repA', REF_TIPO: 'CHAMADO', REF_ID: c.id, TIPO: 'DOCUMENTO', NOME: 'laudo.pdf', MIME: 'application/pdf', ARQUIVO_ID: 'arq-anexo', PUBLICO: 'REPRESENTADA', POR_LADO: 'METROLABS', EM: '2026-10-19T10:00:00' });
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c.id, texto: 'MENSAGEM DO CHAMADO LIGADO' }));
  (a.tabelas.ATEC_OS = a.tabelas.ATEC_OS || []).push({ ID: 'osX', NUMERO: 'OS-X', CHAMADO_ID: c.id, SITUACAO: 'ENCERRADA' });
  (a.tabelas.ATEC_FOTOS = a.tabelas.ATEC_FOTOS || []).push({ ID: 'f1', OS_ID: 'osX', PUBLICO: 'REPRESENTADA', ARQUIVO_ID: 'arq-foto' }, { ID: 'f2', OS_ID: 'osX', PUBLICO: 'SIM', ARQUIVO_ID: 'arq-foto2' });
  a.ctx.Rep_memoLimpar_(); a.ctx.Ast_memoLimpar_();
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', 'arq-doc-pdf'), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', 'arq-anexo'), true);
  assert.ok(JSON.stringify(ok(a.rep('s_ana.alfa', 'chamado', { tipo: 'CHAMADO', id: c.id }))).includes('MENSAGEM DO CHAMADO LIGADO'));
  const r = ok(a.api('s_admin', 'desligarRepresentada', { id: c.id, motivo: 'Ligado à representada errada; é da Beta.' }));
  assert.deepEqual(JSON.parse(JSON.stringify(r.ocultos)), { documentos: 1, anexos: 1, mensagens: 1, fotos: 1, registros: 2 });
  // isolamento depois do desligamento: nada mais abre nem aparece para a Alfa
  for (const arq of ['arq-doc-pdf', 'arq-doc-html', 'arq-anexo', 'arq-foto', 'arq-foto2']) assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', arq), false, arq);
  const sent = ['MENSAGEM DO CHAMADO LIGADO', c.numero, 'laudo.pdf', 'arq-doc', 'arq-anexo'];
  for (const [acao, d] of [['chamados', {}], ['documentos', {}], ['chamado', { tipo: 'CHAMADO', id: c.id }], ['mensagens', { refTipo: 'CHAMADO', refId: c.id }], ['painel', {}], ['inicio', {}]]) {
    const txt = JSON.stringify(a.rep('s_ana.alfa', acao, d));
    for (const s of sent) assert.ok(!txt.includes(s), acao + ' devolveu ' + s);
  }
  assert.equal(a.tabelas.ATEC_FOTOS.find((f) => f.ID === 'f1').PUBLICO, '', 'foto liberada só para ela volta a ser interna');
  assert.equal(a.tabelas.ATEC_FOTOS.find((f) => f.ID === 'f2').PUBLICO, 'SIM', 'a do cliente fica');
  // ligada à certa, a Beta não herda o que era da Alfa
  ok(a.api('s_matheusgodoi', 'ligarRepresentada', { id: c.id, representadaId: 'repB', motivo: 'Agora sim, a Beta pediu este atendimento.' }));
  assert.ok(!JSON.stringify(a.rep('s_beto.beta', 'chamado', { tipo: 'CHAMADO', id: c.id })).includes('MENSAGEM DO CHAMADO LIGADO'));
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', 'arq-anexo'), false);
});

test('revisão 2: pedido em nome sem administrador: vão os atendentes; sem ninguém, a resposta diz que nenhum e-mail saiu e quem cadastrar', () => {
  const a = amb();
  a.marcar(['u_mat']);
  a.tabelas.REP_REPRESENTADAS.push({ ID: 'repC', NOME: 'REPRESENTADA GAMA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' });
  const av = espiarAvisosRep(a);
  const abrirC = () => {
    ok(a.rep('s_matheusgodoi', 'emNomeBuscarCliente', { representadaId: 'repC', documento: '11222333000181' }));
    ok(a.rep('s_matheusgodoi', 'emNomeBuscarEquipamento', { representadaId: 'repC', clienteId: 'c1', serie: 'S-100' }));
    return ok(a.rep('s_matheusgodoi', 'abrirEmNome', Object.assign({}, PEDIDO, { representadaId: 'repC' })));
  };
  const r0 = abrirC();
  assert.equal(r0.semAviso, true);
  assert.match(r0.message, /nenhum e-mail saiu para a REPRESENTADA GAMA TESTE[\s\S]*cadastre a conta em Administração > Usuários \(perfil Representada, papel Administrador da representada ou Atendente\)/);
  assert.equal(av.length, 0);
  a.tabelas.CAD_USUARIOS.push({ ID: 'rc_at', USUARIO: 'gil.gama', NOME: 'GILDA GAMA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'gilda@gama.exemplo.test', REPRESENTADA_ID: 'repC', REPRESENTACAO_PAPEL: 'ATENDENTE' });
  const r1 = abrirC();
  assert.ok(!r1.semAviso); assert.match(r1.message, /O aviso por e-mail foi para 1 pessoa/);
  assert.deepEqual(av[av.length - 1], ['rc_at']);
});
