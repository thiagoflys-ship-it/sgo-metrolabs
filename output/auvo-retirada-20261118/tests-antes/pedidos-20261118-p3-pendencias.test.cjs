'use strict';
// 18/11/2026 (pacote 3, item 9, pedido do Matheus): atendimento reagendado continuava com "prazo estourado" no alerta de prioridade
// do Início. Regra nova: chamado com a visita marcada (agendada ou reagendada) para o futuro sai da lista de pendências; o prazo
// estourado continua no estado do prazo, nos indicadores e no histórico. Passada a data marcada sem a chegada, volta à lista com o
// texto da visita não registrada. No Auvo: O.S. da foto de pendências que a sincronização das tarefas leu depois já finalizada ou
// com a data passada para o futuro (reagendada no Auvo) não é cobrada.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, abrirChamado, triarVisita, agendar } = require('./_assistencia_ambiente.cjs');

const sla = (amb) => amb.pend('s_gil').filter((i) => i.tipo === 'ast_sla');

test('chamado reagendado para o futuro sai do alerta; o prazo estourado continua registrado; passada a data, volta', () => {
  const amb = ambiente();
  const c = abrirChamado(amb);                       // P2, segunda 19/10 10h: prazo até terça 20/10 10h
  triarVisita(amb, c.id);
  ok(agendar(amb, c.id, '2026-10-20T09:00'));
  // terça 11h: o prazo estourou e a visita das 9h não teve a chegada registrada
  amb.mudar('2026-10-20T11:00:00-03:00');
  let itens = sla(amb);
  assert.equal(itens.length, 1);
  assert.match(itens[0].titulo, /Prazo estourado: chamado .*: a visita marcada não foi registrada/);
  assert.equal(itens[0].gravidade, 'CRITICO');
  assert.match(itens[0].detalhe, /A visita estava marcada para 20\/10\/2026 09:00 com TIAGO/);
  assert.match(itens[0].oQueFazer, /registrar a chegada .* toque em "Reagendar"/);

  // a gestão reagenda para quinta 14h: sai do alerta
  ok(agendar(amb, c.id, '2026-10-22T14:00', { motivo: 'Cliente pediu outro dia' }));
  assert.equal(sla(amb).length, 0, 'reagendado para o futuro não é pendência de ação');
  // ... mas o prazo do contrato continua estourado na ficha, na lista e nos indicadores
  const ficha = ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado;
  assert.equal(ficha.sla.estado, 'ESTOURADO');
  assert.deepEqual(JSON.parse(JSON.stringify(ficha.visitaMarcada)), { quando: '22/10/2026 14:00', reagendado: true });
  const lista = ok(amb.api('s_gil', 'lista', {}));
  assert.equal(lista.contagem.estourados, 1, 'o indicador de estourados não apaga o chamado');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'CHAMADO' && e.TIPO === 'REAGENDADO'), 'o reagendamento fica no histórico');
  // nem a Caixa de decisões (mesma fonte) cobra o chamado
  assert.equal(amb.pend('s_dora').filter((i) => i.tipo === 'ast_sla').length, 0);

  // quinta 15h: a data nova passou sem chegada: volta
  amb.mudar('2026-10-22T15:00:00-03:00');
  itens = sla(amb);
  assert.equal(itens.length, 1);
  assert.match(itens[0].detalhe, /marcada para 22\/10\/2026 14:00/);
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.visitaMarcada, null);
});

test('chamado sem visita marcada continua no alerta (estourado e em risco), como antes', () => {
  const amb = ambiente();
  const c = abrirChamado(amb, { prioridade: 'P1' });   // P1: 4 h úteis, até 14h
  amb.mudar('2026-10-19T13:30:00-03:00');
  let itens = sla(amb).filter((i) => i.id === 'AST:SLA:' + c.id);
  assert.equal(itens.length, 1);
  assert.match(itens[0].titulo, /^Prazo em risco/);
  amb.mudar('2026-10-19T15:00:00-03:00');
  itens = sla(amb).filter((i) => i.id === 'AST:SLA:' + c.id);
  assert.match(itens[0].titulo, /^Prazo estourado: chamado [^:]+$/);
  assert.doesNotMatch(itens[0].titulo, /visita marcada/);
});

test('agendado antes de estourar e a visita ainda por vir: nenhum alerta de prazo', () => {
  const amb = ambiente();
  const c = abrirChamado(amb);
  triarVisita(amb, c.id);
  ok(agendar(amb, c.id, '2026-10-21T09:00'));    // depois do prazo (20/10 10h), marcado com antecedência
  amb.mudar('2026-10-20T12:00:00-03:00');
  assert.equal(sla(amb).length, 0);
  const ficha = ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado;
  assert.equal(ficha.sla.estado, 'ESTOURADO');
  assert.equal(ficha.visitaMarcada.reagendado, false);
});

test('Auvo: O.S. da foto já finalizada ou reagendada pela sincronização mais nova não é cobrada; leitura antiga não muda nada', () => {
  const foto = (id, data) => ({ ID: 'p' + id, AUVO_TASK_ID: id, TASK_TYPE_DESCRICAO: 'Manutenção', CLIENTE_NOME: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE',
    TASK_DATE: data, DIAS_ABERTA: 5, TEM_EVIDENCIA: 'NAO', TASK_URL: '', ULTIMA_SINCRONIZACAO: '2026-10-15T08:00:00.000Z' });
  const tarefa = (id, data, fin, lida) => ({ ID: 't' + id, AUVO_TASK_ID: id, DATA_TAREFA: data, FINALIZADA: fin, ULTIMA_SINCRONIZACAO: lida });
  const amb = ambiente({ tabelas: {
    AUVO_PENDENCIAS: [foto('100', '2026-10-14T09:00:00'), foto('200', '2026-10-14T09:00:00'), foto('300', '2026-10-14T09:00:00'), foto('400', '2026-10-14T09:00:00'), foto('500', '2026-10-14T09:00:00')],
    AUVO_TAREFAS: [
      tarefa('100', new Date('2026-10-23T12:00:00Z'), 'NAO', '2026-10-18T10:00:00.000Z'),   // reagendada no Auvo para o dia 23
      tarefa('200', '2026-10-14T09:00:00', 'SIM', '2026-10-18T10:00:00.000Z'),               // finalizada depois da foto
      tarefa('300', '2026-10-14T09:00:00', 'NAO', '2026-10-18T10:00:00.000Z'),               // continua aberta, mesma data
      tarefa('400', '2026-10-25T09:00:00', 'NAO', '2026-10-10T10:00:00.000Z')                // leitura ANTERIOR à foto: não vale
    ]
  } });
  const ids = amb.pend('s_gil').filter((i) => i.tipo === 'auvo_os_aberta').map((i) => i.id).sort();
  assert.deepEqual(ids, ['AUVO:OS:300', 'AUVO:OS:400', 'AUVO:OS:500']);
});
