// "É serviço técnico em cliente" na Nova atividade (26/10/2026, agenda única aprovada pelo dono, etapa 4): só quem agenda
// na Assistência; chamado (Interno) + triagem "Planejar visita" + O.S. agendada, com a atividade do técnico ligada à O.S.;
// chamado aberto do mesmo equipamento pergunta "é um destes?"; conflito de agenda avisa; nada fica pela metade.
// Código real; só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, PREPARO } = require('./_assistencia_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const base = (extra) => Object.assign({ clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', descricao: 'Preventiva semestral da autoclave do centro de material',
  prioridade: 'Alta', tipoCodigo: 'MANUTENCAO_CORRETIVA', tecnicoId: 'u_tec', inicio: '2026-10-21T09:00', duracaoMin: 120, preparo: PREPARO }, extra || {});

test('permissão: técnico vê a opção apagada com o motivo e não consegue criar; a gestão técnica recebe tipos e técnicos', () => {
  const amb = ambiente();
  const opT = ok(amb.app('Atividades_apiServicoOpcoes', 's_tiago'));
  assert.equal(opT.podeServico, false);
  assert.match(opT.motivo, /Só quem agenda na Assistência técnica/);
  const r = amb.app('Atividades_apiServicoCriar', 's_tiago', base());
  assert.equal(r.ok, false);
  assert.match(r.message, /esta ação é da gestão da área Técnica/);
  const opG = ok(amb.app('Atividades_apiServicoOpcoes', 's_gil'));
  assert.equal(opG.podeServico, true);
  assert.ok(opG.tipos.some((t) => t.codigo === 'MANUTENCAO_CORRETIVA'));
  assert.ok(opG.tecnicos.some((t) => t.id === 'u_tec'));
  assert.equal(opG.preparo.length, 4);
  const eq = ok(amb.app('Atividades_apiServicoEquipamentos', 's_gil', { clienteId: 'c1' }));
  assert.ok(eq.equipamentos.some((e) => e.id === 'eq1'));
});

test('cria chamado + triagem + O.S. agendada; a atividade do técnico nasce ligada à O.S.; chamado aberto do mesmo equipamento pergunta antes', () => {
  const amb = ambiente();
  const r = ok(amb.app('Atividades_apiServicoCriar', 's_gil', base()));
  assert.ok(r.os && r.os.numero, JSON.stringify(r));
  assert.match(r.message, /Serviço técnico aberto: chamado .* e O\.S\. .* agendada para TIAGO TECNICO TESTE/);
  const c = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === r.chamado.id);
  assert.equal(c.SITUACAO, 'AGENDADO'); assert.equal(c.CANAL, 'INTERNO'); assert.equal(c.PRIORIDADE, 'P2');
  const os = amb.tabelas.ATEC_OS.find((x) => x.NUMERO === r.os.numero);
  assert.equal(os.TECNICO_ID, 'u_tec');
  const atv = amb.tabelas.ATV_ATIVIDADES.find((a) => a.OS_ID === os.ID);
  assert.ok(atv, 'atividade do técnico ligada à O.S.');
  assert.equal(atv.RESPONSAVEL_ID, 'u_tec');
  assert.equal(amb.tabelas.ATV_ATIVIDADES.filter((a) => a.OS_ID === os.ID).length, 1, 'uma só (não lança duas vezes)');
  // de novo para o mesmo equipamento: "é um destes?", nada criado
  const n = amb.tabelas.ATEC_CHAMADOS.length;
  const d = ok(amb.app('Atividades_apiServicoCriar', 's_gil', base({ inicio: '2026-10-22T14:00' })));
  assert.equal(d.duplicado, true);
  assert.match(d.message, /já tem chamado em aberto.*É um destes\?.*É outro serviço/);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.length, n);
});

test('conflito de agenda e preparo incompleto: avisa antes, sem abrir chamado; com "agendar mesmo assim" e motivo, abre', () => {
  const amb = ambiente();
  ok(amb.app('Atividades_apiServicoCriar', 's_gil', base()));
  const n = amb.tabelas.ATEC_CHAMADOS.length;
  const semPreparo = amb.app('Atividades_apiServicoCriar', 's_gil', base({ equipamentoId: 'eq2', unidadeId: '', preparo: { ferramentas: true }, confirmarDuplicado: true }));
  assert.equal(semPreparo.ok, false);
  assert.match(semPreparo.message, /confirme no preparo/);
  const conf = ok(amb.app('Atividades_apiServicoCriar', 's_gil', base({ inicio: '2026-10-21T10:00', confirmarDuplicado: true })));
  assert.equal(conf.conflito, true);
  assert.match(conf.message, /já tem compromisso nesse horário/);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.length, n, 'nada criado antes da decisão');
  const semMotivo = amb.app('Atividades_apiServicoCriar', 's_gil', base({ inicio: '2026-10-21T10:00', confirmarDuplicado: true, confirmarConflito: true }));
  assert.match(semMotivo.message, /escreva o motivo/);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.length, n);
  const ok2 = ok(amb.app('Atividades_apiServicoCriar', 's_gil', base({ inicio: '2026-10-21T10:00', confirmarDuplicado: true, confirmarConflito: true, motivoConflito: 'Retorno rápido no mesmo local' })));
  assert.ok(ok2.os);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.length, n + 1);
});

test('tela: caixa só na criação, apagada com motivo para quem não agenda; campos do serviço; respostas "é um destes?" e "agendar mesmo assim"', () => {
  const t = fs.readFileSync(path.join(pasta, 'JS_Atividades.html'), 'utf8');
  assert.match(t, /\(ed \? "" : '<label class="atv-check"><input type="checkbox" id="atvF_servico" disabled onchange="Atividades_alternarServico_\(\)"> É serviço técnico em cliente/);
  assert.match(t, /if \(!editId && chkS && chkS\.checked\) return Atividades_enviarServico_\(ov, d, erro\);/);
  assert.match(t, /É outro serviço \(abrir mesmo assim\)/);
  assert.match(t, /Agendar mesmo assim/);
});

test('etapa 5: atividade com horário em cima de O.S. do técnico avisa e não bloqueia; só com prazo (dia inteiro) não avisa', () => {
  const amb = ambiente();
  ok(amb.app('Atividades_apiServicoCriar', 's_gil', base())); // O.S. de 21/10 09:00 a 11:00 com o Tiago
  const r = ok(amb.ctx.Atividades_apiCriar('s_gil', { titulo: 'Reunião de alinhamento da equipe', responsavelId: 'u_tec', inicioPrevisto: '2026-10-21T10:00', prazo: '2026-10-21T10:30' }));
  assert.match(r.message, /Atenção: TIAGO TECNICO TESTE tem compromisso nesse horário \(O\.S\. .*\)\. A atividade foi lançada/);
  const r2 = ok(amb.ctx.Atividades_apiCriar('s_gil', { titulo: 'Organizar a van até sexta', responsavelId: 'u_tec', prazo: '2026-10-21T10:30' }));
  assert.doesNotMatch(r2.message, /Atenção/);
});
