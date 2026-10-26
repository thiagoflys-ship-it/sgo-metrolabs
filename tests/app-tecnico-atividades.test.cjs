// Aplicativo do técnico — Minhas atividades (26/10/2026, agenda única aprovada pelo dono, etapa 3): o Meu dia leva as
// atividades internas do técnico (sem o atendimento de O.S., que já é a O.S.); iniciar, aguardando, concluir, justificar e
// comentar sobem pela fila do aparelho (Ast_appSincronizar) e usam a mesma API da tela; mudança da gestão depois do download
// prevalece. Código real; só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const ev = (tipo, dados, idLocal) => ({ tipo, osId: 'ATV:' + dados.atividadeId, em: '2026-10-19T10:05:00-03:00', dados, idLocal: idLocal || 'atv-' + Math.random().toString(36).slice(2, 12) });

function comAtividades(amb) {
  const base = { RESPONSAVEL_ID: 'u_tec', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', CRIADO_POR_ID: 'u_gt', CRIADO_POR_NOME: 'GIL GESTOR TECNICO TESTE', PRIORIDADE: 'Normal', SITUACAO: 'A fazer', CRIADO_EM: '2026-10-15T08:00', ATUALIZADO_EM: '2026-10-15T08:00' };
  amb.tabelas.ATV_ATIVIDADES.push(Object.assign({}, base, { ID: 'a_atr', TITULO: 'Devolver o termômetro de referência', PRAZO: '2026-10-17T17:00', PREVISAO_ATUAL: '2026-10-17T17:00', PRIORIDADE: 'Alta' }));
  amb.tabelas.ATV_ATIVIDADES.push(Object.assign({}, base, { ID: 'a_hoje', TITULO: 'Mandar foto do estoque da van', PRAZO: '2026-10-19T17:00', PREVISAO_ATUAL: '2026-10-19T17:00' }));
  amb.tabelas.ATV_ATIVIDADES.push(Object.assign({}, base, { ID: 'a_longe', TITULO: 'Curso de reciclagem', PRAZO: '2026-11-20T17:00', PREVISAO_ATUAL: '2026-11-20T17:00' }));
  amb.tabelas.ATV_ATIVIDADES.push(Object.assign({}, base, { ID: 'a_outro', TITULO: 'Atividade de outra pessoa', RESPONSAVEL_ID: 'u_tec2', PRAZO: '2026-10-19T17:00', PREVISAO_ATUAL: '2026-10-19T17:00' }));
}

test('Meu dia: atividades do técnico (atrasada primeiro, até amanhã), sem a de outra pessoa nem o atendimento da O.S. (que nasce ligado à O.S.); motivos de atraso', () => {
  const amb = ambiente();
  const { os } = chamadoAgendado(amb);
  const daOS = amb.tabelas.ATV_ATIVIDADES.find((a) => /^Atender /.test(a.TITULO));
  assert.ok(daOS, 'a O.S. agendada criou a atividade do técnico');
  assert.equal(daOS.OS_ID, os.id, 'já nasce ligada à O.S.');
  comAtividades(amb);
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', {}));
  assert.deepEqual(Array.from(md.atividades.map((a) => a.id)), ['a_atr', 'a_hoje']);
  const atr = md.atividades[0];
  assert.equal(atr.atrasada, true); assert.equal(atr.prioridade, 'Alta'); assert.equal(atr.versao, '2026-10-15T08:00'); assert.equal(atr.lancadaPor, 'GIL GESTOR TECNICO TESTE');
  assert.equal(md.atividades[1].venceHoje, true);
  assert.ok(md.motivosAtraso.length > 0);
  // gestão vendo o Meu dia de outro técnico: sem as atividades (são pessoais)
  assert.deepEqual(Array.from(ok(amb.app('Ast_appMeuDia', 's_gil', { tecnicoId: 'u_tec' })).atividades), []);
});

test('fila do aparelho: iniciar, comentar, aguardando e justificar sobem pela API das atividades; repetido não aplica de novo; a lista volta na resposta', () => {
  const amb = ambiente();
  comAtividades(amb);
  const r = ok(sync(amb, [
    ev('ATV_SITUACAO', { atividadeId: 'a_hoje', situacao: 'Em andamento', versao: '2026-10-15T08:00' }, 'atv-ini-0001'),
    ev('ATV_COMENTAR', { atividadeId: 'a_hoje', texto: 'Foto tirada, falta enviar a do baú' }, 'atv-com-0001'),
    ev('ATV_JUSTIFICAR', { atividadeId: 'a_atr', categoria: amb.ctx.ATV_MOTIVOS_ATRASO[0], motivo: 'O cliente segurou o termômetro até sexta-feira', novaPrevisao: '2026-10-21T17:00', versao: '2026-10-15T08:00' }, 'atv-jus-0001')
  ]));
  assert.equal(r.aceitos.length, 3, JSON.stringify(r.recusados));
  const a = (id) => amb.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id);
  assert.equal(a('a_hoje').SITUACAO, 'Em andamento');
  assert.equal(a('a_atr').PREVISAO_ATUAL, '2026-10-21T17:00');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === 'a_hoje' && h.TIPO === 'COMENTARIO' && /baú/.test(h.TEXTO)));
  assert.ok(Array.isArray(r.atividades) && r.atividades.some((x) => x.id === 'a_hoje' && x.situacao === 'Em andamento'));
  assert.ok(amb.tabelas.ATEC_SYNC.some((l) => l.ID_LOCAL === 'atv-ini-0001' && l.RESULTADO === 'ACEITO' && l.TIPO === 'ATV_SITUACAO'));
  // reenvio do mesmo idLocal (o aparelho não recebeu a resposta): aceito como repetido, sem novo comentário
  const n = amb.tabelas.ATV_HISTORICO.length;
  const r2 = ok(sync(amb, [ev('ATV_COMENTAR', { atividadeId: 'a_hoje', texto: 'Foto tirada, falta enviar a do baú' }, 'atv-com-0001')]));
  assert.equal(r2.aceitos[0].duplicado, true);
  assert.equal(amb.tabelas.ATV_HISTORICO.length, n);
  // aguardando sem motivo: recusado com a mensagem da tela
  const r3 = ok(sync(amb, [ev('ATV_SITUACAO', { atividadeId: 'a_hoje', situacao: 'Aguardando', motivo: '', versao: a('a_hoje').ATUALIZADO_EM })]));
  assert.equal(r3.recusados.length, 1);
  assert.match(r3.recusados[0].motivo, /informe o motivo/);
  assert.equal(r3.recusados[0].definitivo, true);
});

test('mudança da gestão depois do download prevalece: a conclusão do aparelho é recusada com quem mudou; comentário entra; outro técnico não mexe', () => {
  const amb = ambiente();
  comAtividades(amb);
  amb.mudar('2026-10-19T11:00:00-03:00');
  const ed = amb.ctx.Atividades_apiEditar('s_gil', { id: 'a_hoje', prazo: '2026-10-22T17:00', motivo: 'Cliente pediu para depois' });
  assert.equal(ed.ok, true, ed.message);
  const r = ok(sync(amb, [
    ev('ATV_SITUACAO', { atividadeId: 'a_hoje', situacao: 'Concluída', observacao: 'Feito', versao: '2026-10-15T08:00' }),
    ev('ATV_COMENTAR', { atividadeId: 'a_hoje', texto: 'Vou deixar para quarta então' })
  ]));
  assert.equal(r.recusados.length, 1);
  assert.match(r.recusados[0].motivo, /GIL GESTOR TECNICO TESTE mudou esta atividade em .*Vale a mudança dela; a sua não foi aplicada/);
  assert.match(r.recusados[0].corrigir, /Minhas atividades no Meu dia/);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((x) => x.ID === 'a_hoje').SITUACAO, 'A fazer');
  assert.equal(r.aceitos.length, 1, 'comentário entra mesmo assim');
  const r2 = ok(sync(amb, [ev('ATV_SITUACAO', { atividadeId: 'a_outro', situacao: 'Concluída', versao: '2026-10-15T08:00' })], 's_tiago'));
  assert.equal(r2.recusados.length, 1);
  assert.match(r2.recusados[0].motivo, /só o responsável, quem lançou e a gestão/i);
});
