// Agenda única (26/10/2026, aprovada pelo dono): a atividade que a Assistência técnica cria para cada O.S. agendada fica
// ligada à O.S. (OS_ID); quem manda é a O.S. (não conta atraso em Atividades, não muda à mão, sai da agenda se a O.S. for
// cancelada) e o painel da equipe mostra o horário da O.S. e os atendimentos do Auvo. Código real; só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, atividade, pastaLegado } = require('./_matriz_ambiente.cjs');

function comOS(opcoes) {
  const amb = ambiente(opcoes);
  amb.tabelas.ATEC_OS = [
    { ID: 'os1', NUMERO: 'OS-2026-0001', SITUACAO: 'AGENDADA', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-19T08:00', DURACAO_MIN: 120, ATIVIDADE_ID: 'atvOS' },
    { ID: 'os2', NUMERO: 'OS-2026-0002', SITUACAO: 'CANCELADA', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-20T08:00', DURACAO_MIN: 60, ATIVIDADE_ID: 'atvOS2' }
  ];
  amb.ctx.AST_ABAS = { OS: 'ATEC_OS' };
  amb.ctx.AST_OS_SITUACOES = { AGENDADA: 'Agendada', CANCELADA: 'Cancelada' };
  // atividade criada pela Assistência para a O.S. (prazo = fim do atendimento), ainda sem OS_ID (criada antes desta mudança)
  atividade(amb, 'atvOS', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:30', { TITULO: 'Atender OS-2026-0001 · Clínica Teste', PRIORIDADE: 'Alta', MODULO: 'assistencia', CRIADO_POR_ID: 'ASSISTENCIA', ATRASO_AVISADO_PREV: '' });
  atividade(amb, 'atvOS2', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-20T09:00', { TITULO: 'Atender OS-2026-0002 · Hospital Teste', MODULO: 'assistencia', CRIADO_POR_ID: 'ASSISTENCIA' });
  atividade(amb, 'atvComum', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:00', { TITULO: 'Enviar relatório interno', ATRASO_AVISADO_PREV: '' });
  return amb;
}

test('vínculo: a atividade criada pela O.S. ganha OS_ID (preenche só o vazio) e deixa de contar atraso; a comum continua contando', () => {
  const amb = comOS();
  const c = amb.ctx;
  assert.equal(c.Atividades_vincularOS_(), 2);
  assert.equal(c.Atividades_vincularOS_(), 0, 'segunda vez não muda nada');
  const a = (id) => amb.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id);
  assert.equal(a('atvOS').OS_ID, 'os1');
  assert.equal(a('atvComum').OS_ID, undefined);
  const agora = c.Atividades_agora_(); // 19/10 10:00: as duas passaram da previsão
  assert.equal(c.Atividades_vencida_(c.Atividades_limpar_(a('atvOS')), agora), false);
  assert.equal(c.Atividades_vencida_(c.Atividades_limpar_(a('atvComum')), agora), true);
  // aviso de atraso, escalonamento por prioridade e central de pendências: só a comum
  c.Atividades_notificarAtrasos_();
  assert.deepEqual(amb.tabelas.ATV_AVISOS.filter((v) => v.TIPO === 'ATRASO').map((v) => v.ATIVIDADE_ID), ['atvComum']);
  c.Sedna_escalonar_();
  assert.ok(!amb.tabelas[c.GES_ABA_ENVIOS].some((e) => e.TIPO === 'SEDNA_ESCALA' && /^atvOS/.test(e.REFERENCIA)), 'O.S. não escala pela regra de atividades');
  const pend = c.SGO_Pendencias_listar('s_tec', { semCache: true });
  assert.ok(pend.itens.some((i) => i.id === 'ATV:atvComum'));
  assert.ok(!pend.itens.some((i) => i.id === 'ATV:atvOS'), 'atendimento de O.S. é cobrado pela O.S.');
});

test('só a O.S. muda a atividade: situação, edição e justificativa à mão são recusadas com o caminho; a rotina da Assistência muda; criar com osId só pela rotina', () => {
  const amb = comOS();
  const c = amb.ctx;
  c.Atividades_vincularOS_();
  const r = c.Atividades_apiMudarSituacao('s_tec', { id: 'atvOS', situacao: 'Concluída' });
  assert.equal(r.ok, false);
  assert.match(r.message, /atendimento de uma O\.S\. da Assistência técnica e muda sozinha pela O\.S\..*Assistência técnica > Minhas O\.S\./);
  assert.match(c.Atividades_apiEditar('s_gt', { id: 'atvOS', titulo: 'Outro título' }).message, /muda sozinha pela O\.S\./);
  assert.match(c.Atividades_apiJustificar('s_tec', { id: 'atvOS', motivo: 'Motivo de teste com mais de quinze letras', novaPrevisao: '2026-10-21T10:00', categoria: c.ATV_MOTIVOS_ATRASO[0] }).message, /muda sozinha pela O\.S\./);
  // comentar continua liberado
  assert.equal(c.Atividades_apiComentar('s_tec', { id: 'atvOS', texto: 'Cliente pediu para chegar mais cedo' }).ok, true);
  // a rotina da Assistência (perfil SISTEMA) encerra
  c.ATV_PONTE_CTX = { token: 'tk-sis', eu: { id: 'ASSISTENCIA', usuario: 'sistema', nome: 'Assistência técnica (rotina)', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  const ok = c.Atividades_apiMudarSituacao('tk-sis', { id: 'atvOS', situacao: 'Concluída', observacao: 'O.S. encerrada' });
  assert.equal(ok.ok, true, ok.message);
  const nova = c.Atividades_apiCriar('tk-sis', { titulo: 'Atender OS-2026-0003 · Teste', prazo: '2026-10-22T10:00', responsavelId: 'u_tec', osId: 'os3' });
  assert.equal(nova.ok, true, nova.message);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((x) => x.TITULO === 'Atender OS-2026-0003 · Teste').OS_ID, 'os3');
  c.ATV_PONTE_CTX = null;
  const mao = c.Atividades_apiCriar('s_gt', { titulo: 'Tentativa de ligar à O.S.', prazo: '2026-10-22T10:00', responsavelId: 'u_tec', osId: 'os1' });
  assert.equal(mao.ok, true, mao.message);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((x) => x.TITULO === 'Tentativa de ligar à O.S.').OS_ID, '', 'pela tela não liga a O.S.');
});

test('painel da equipe: atendimento com o horário vivo da O.S.; O.S. cancelada sai; indicador sem a O.S.; atendimentos do Auvo (gestão vê todos, o técnico os seus)', () => {
  const amb = comOS({ tabelas: { AUVO_TAREFAS: [
    { ID: 't1', AUVO_TASK_ID: '7001', TECNICO_ID_SGO: 'u_tec', TIPO_TAREFA: 'Preventiva', CLIENTE_NOME_AUVO: 'Clínica Auvo Teste', DATA_TAREFA: '2026-10-21T14:00', FINALIZADA: 'NAO' },
    { ID: 't2', AUVO_TASK_ID: '7002', TECNICO_ID_SGO: 'u_pj', TIPO_TAREFA: 'Corretiva', CLIENTE_NOME_AUVO: 'Hospital Auvo Teste', DATA_TAREFA: '2026-10-21T09:00', CHECKOUT_EM: '2026-10-21T11:00', FINALIZADA: 'SIM' },
    { ID: 't3', AUVO_TASK_ID: '7003', TECNICO_ID_SGO: '', TIPO_TAREFA: 'Sem técnico', DATA_TAREFA: '2026-10-21T09:00' }
  ] } });
  const c = amb.ctx;
  c.SGO_CFG.SHEETS.AUVO_TAREFAS = 'AUVO_TAREFAS';
  c.Atividades_vincularOS_();
  const r = c.Atividades_apiPainelEquipe('s_gt', {});
  assert.equal(r.ok, true, r.message);
  const os = r.itens.find((i) => i.ID === 'atvOS');
  assert.equal(os.OS_NUMERO, 'OS-2026-0001');
  assert.equal(os.OS_INICIO, '2026-10-19T08:00');
  assert.equal(os.OS_FIM, '2026-10-19T10:00');
  assert.equal(os.OS_SITUACAO_NOME, 'Agendada');
  assert.ok(!r.itens.some((i) => i.ID === 'atvOS2'), 'O.S. cancelada sai da agenda');
  assert.equal(r.indicadores.vencidas, 1, 'só a atividade comum conta como vencida');
  assert.deepEqual(Array.from(r.auvo.map((t) => t.TAREFA)).sort(), ['7001', '7002']);
  const t2 = r.auvo.find((t) => t.TAREFA === '7002');
  assert.equal(t2.FIM, '2026-10-21T11:00'); assert.equal(t2.FINALIZADA, true);
  assert.equal(r.auvo.find((t) => t.TAREFA === '7001').FIM, '2026-10-21T15:30', 'sem saída registrada: 90 min');
  const rt = c.Atividades_apiPainelEquipe('s_tec', {});
  assert.deepEqual(Array.from(rt.auvo.map((t) => t.TAREFA)), ['7001'], 'o técnico vê só os seus');
});

test('tela: Gantt com O.S. no horário da O.S. e Auvo só consulta, Kanban sem arrastar a O.S., detalhe com "Abrir a O.S."; a Assistência cria a atividade ligada', () => {
  const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
  const t = ler('JS_Atividades.html');
  assert.match(t, /function Atividades_paraGantt_\(a\)/);
  assert.match(t, /Atividades_itensEquipeFiltrados_\(true\)\.map\(Atividades_paraGantt_\)\.concat\(Atividades_auvoFiltrados_\(\)\)/);
  assert.match(t, /if \(a && \(a\.OS_ID \|\| a\._auvo\)\) return false; \/\/ 26\/10\/2026: a situação muda pela O\.S\./);
  assert.match(t, /Atividades_abrirOS_\(\\'' \+ Atividades_esc_\(a\.OS_ID\) \+ '\\'\)">Abrir a O\.S\.<\/button>/);
  assert.match(t, /if \(a\.OS_ID\) \{ alert\("Não foi possível mudar a situação: esta atividade é o atendimento da O\.S\./);
  assert.match(ler('SGO_Assistencia_Agenda.js'), /Ast_criarAtividade_\(\{ osId: osId, responsavelId: tec\.id/);
  assert.match(ler('SGO_Assistencia_App.js'), /Ast_criarAtividade_\(\{ osId: osId, responsavelId: eu\.id/);
  assert.match(ler('SGO_Assistencia_Config.js'), /moduloNome: 'Assistência técnica', osId: o\.osId \|\| ''/);
});
