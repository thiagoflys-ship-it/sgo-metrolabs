// SGO+ Campo, 19/11/2026 (pedido do dono, técnico em campo): vários equipamentos na MESMA O.S. Uma visita atende vários
// equipamentos e tudo sai num relatório só; cada equipamento a mais com a sua conferência de série/TAG, relato, resultado, fotos e
// peças (evento EQUIPAMENTO, aba ATEC_OS_EQUIPAMENTOS, foto "equip:<chave>", peça com equipChave). A assinatura do cliente é uma só.
// O histórico de cada equipamento mostra o atendimento com o relato DELE (nunca o de outro). Código real em contexto isolado
// (tests/_assistencia_ambiente.cjs); só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, em, ok, FOTO, ASSINATURA, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const DEPOIS = em('2026-11-05T10:00:00-03:00');
let n = 0;
const ev = (tipo, osId, dados, quando, idLocal) => ({ tipo, osId, idLocal: idLocal || 'veq-' + osId + '-' + String(++n).padStart(5, '0'), em: quando || '2026-11-05T10:05:00', dados: dados || {} });
const sync = (amb, eventos) => amb.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const NOVO = 'campo-teste-v2';
const RELATO_EQ2 = { condicaoEncontrada: 'Lavadora parada com vazamento na porta', causa: 'Vedação da porta ressecada', servicoRealizado: 'Troca da vedação da porta da lavadora',
  testeFuncional: 'Ciclo completo sem vazamento', testeResultado: 'APROVADO', resultadoFinal: 'LIBERADO' };

function osComEquipamentoPrincipal(amb) {
  const id = chamadoAgendado(amb, { inicio: '2026-11-06T09:00' }).os.id;
  ok(sync(amb, [ev('CHEGUEI', id), ev('RESPOSTA', id, { perguntaId: 'identificado', valor: 'SIM' }), ev('RESPOSTA', id, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    ev('RESPOSTA', id, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', id, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', id, { condicaoEncontrada: 'Autoclave parada sem aquecer', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Três ciclos sem erro', serieConfirmada: 'S-100', identificadoPor: 'SERIE' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'fveq-' + i + '-' + id, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-11-05T10:20:00' })));
  return id;
}

test('Meu dia: a O.S. de serviço técnico aceita vários equipamentos e traz a lista da unidade (sem o da O.S. e sem os de outro cliente)', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = chamadoAgendado(amb, { inicio: '2026-11-06T09:00' }).os.id;
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' })).os.find((o) => o.id === id);
  assert.equal(md.variosEquipamentos, true);
  const ids = md.equipamentosUnidade.map((e) => e.id);
  assert.ok(ids.includes('eq2'), 'a lavadora da mesma unidade aparece');
  assert.ok(!ids.includes('eq1'), 'o equipamento da própria O.S. não aparece');
  assert.ok(!ids.includes('eq3'), 'equipamento de outro cliente nunca aparece');
  assert.deepEqual(md.registrado.equipamentos, []);
});

test('equipamento a mais: só conclui com ele completo (o que falta diz qual equipamento); relatório com seção própria; sincronização idempotente', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = osComEquipamentoPrincipal(amb);
  const K = 'eqx-0001-abcd';
  // antes do Cheguei? já chegou. Acrescenta o 2º equipamento (lista da unidade) só com a conferência
  const evAdd = ev('EQUIPAMENTO', id, { chave: K, equipamentoId: 'eq2', serieConfirmada: 'S-200', identificadoPor: 'SERIE' }, '2026-11-05T10:30:00', 'veq-add-' + id);
  let r = ok(sync(amb, [evAdd]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  r = ok(sync(amb, [evAdd]));
  assert.equal(r.aceitos[0].duplicado, true, 'o mesmo envio repetido não grava duas vezes');
  assert.equal(amb.tabelas.ATEC_OS_EQUIPAMENTOS.length, 1);
  const linha = amb.tabelas.ATEC_OS_EQUIPAMENTOS[0];
  assert.equal(linha.EQUIPAMENTO_ID, 'eq2'); assert.equal(linha.ORDEM, 1); assert.equal(linha.SERIE_CONFIRMADA, 'S-200'); assert.equal(linha.TAG, 'LV-02');
  // assinaturas e Concluí com o 2º equipamento incompleto: fica em documentação pendente e diz o que falta em qual equipamento
  r = ok(sync(amb, [ev('ASSINATURA', id, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: NOVO }), ev('ASSINATURA', id, { papel: 'COLABORADOR', nome: 'Tiago Técnico Teste', imagem: ASSINATURA, versaoApp: NOVO }), ev('CONCLUI', id)]));
  assert.equal(r.os[0].situacao, 'DOC_PENDENTE');
  const faltas = r.os[0].pendencias.join(' | ');
  assert.match(faltas, /no equipamento 2 \(Lavadora · L2 · TAG LV-02/);
  assert.match(faltas, /relato do serviço realizado/); assert.match(faltas, /pelo menos 1 foto/);
  assert.doesNotMatch(faltas, /conferência do equipamento/, 'a série já foi conferida');
  // relato e foto do 2º equipamento, peça dele: encerra
  amb.mudar('2026-11-05T10:50:00-03:00');
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'fveq-x-' + id, nome: 'lavadora.jpg', base64: FOTO, perguntaId: 'equip:' + K, legenda: 'Vedação trocada', em: '2026-11-05T10:45:00' }));
  r = ok(sync(amb, [ev('PECA', id, { equipChave: K, descricao: 'Vedação da porta da lavadora', quantidade: 1, unidade: 'un', situacao: 'APLICADA' }, '2026-11-05T10:46:00'),
    ev('EQUIPAMENTO', id, Object.assign({ chave: K }, RELATO_EQ2), '2026-11-05T10:47:00')]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  assert.equal(amb.tabelas.ATEC_OS_EQUIPAMENTOS.length, 1, 'a atualização não cria outra linha');
  assert.equal(amb.tabelas.ATEC_OS_EQUIPAMENTOS[0].SERVICO_REALIZADO, RELATO_EQ2.servicoRealizado);
  assert.equal(amb.tabelas.ATEC_PECAS.find((p) => p.DESCRICAO === 'Vedação da porta da lavadora').EQUIP_CHAVE, K);
  assert.equal(amb.tabelas.ATEC_FOTOS.find((f) => f.ID_LOCAL === 'fveq-x-' + id).PERGUNTA_ID, 'equip:' + K, 'a foto fica marcada com o equipamento');
  // relatório: uma seção por equipamento; a peça e a foto do 2º ficam na seção dele
  const html = amb.ctx.AstR_htmlOS_(linhaOs(amb, id), { marca: 'teste' });
  assert.match(html, /Equipamento 2 atendido nesta visita: Lavadora/);
  assert.match(html, /Troca da vedação da porta da lavadora/);
  assert.match(html, /Equipamentos atendidos nesta visita/);
  const iSecao = html.indexOf('Equipamento 2 atendido nesta visita'), iPeca = html.indexOf('Vedação da porta da lavadora'), iPecasOs = html.indexOf('>Peças<');
  assert.ok(iPeca > iSecao, 'a peça do 2º equipamento sai na seção dele');
  assert.ok(iPecasOs < 0 || html.slice(iPecasOs, iSecao).indexOf('Vedação da porta') < 0, 'a peça do 2º equipamento não entra na tabela do equipamento da O.S.');
  assert.match(html, /Foto 3 — Vedação trocada/, 'a numeração das fotos continua depois das 2 do equipamento da O.S.');
  // ficha da O.S. (SGO+ web) e Meu dia (troca de celular)
  const fic = ok(amb.api('s_gil', 'os', { id })).os;
  assert.equal(fic.equipamentosExtras.length, 1); assert.equal(fic.equipamentosExtras[0].fotos, 1); assert.equal(fic.equipamentosExtras[0].pecas, 1);
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' })).os.find((o) => o.id === id);
  assert.equal(md.registrado.equipamentos[0].chave, K); assert.equal(md.registrado.equipamentos[0].servicoRealizado, RELATO_EQ2.servicoRealizado);
  assert.equal(md.registrado.pecas.find((p) => p.equipChave === K).descricao, 'Vedação da porta da lavadora');
});

test('histórico de cada equipamento: o atendimento aparece nos dois, cada um com o seu relato (dado não cruza)', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = osComEquipamentoPrincipal(amb);
  ok(sync(amb, [ev('EQUIPAMENTO', id, Object.assign({ chave: 'eqx-hist-01', equipamentoId: 'eq2', serieConfirmada: 'S-200' }, RELATO_EQ2))]));
  const h2 = amb.ctx.SGO_Atendimentos_doEquipamento_('eq2', {}).filter((h) => h.origem === 'SGO');
  assert.equal(h2.length, 1);
  assert.match(h2[0].relato, /vedação da porta/i); assert.doesNotMatch(h2[0].relato, /resistência/i, 'o relato da autoclave não aparece na lavadora');
  const h1 = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', {}).filter((h) => h.origem === 'SGO');
  assert.equal(h1.length, 1);
  assert.match(h1[0].relato, /resistência/i); assert.doesNotMatch(h1[0].relato, /vedação/i, 'o relato da lavadora não aparece na autoclave');
  assert.equal(amb.ctx.SGO_Atendimentos_doEquipamento_('eq3', {}).filter((h) => h.origem === 'SGO').length, 0);
});

test('recusas com o porquê e o que fazer: outro cliente, o próprio equipamento da O.S., em dobro; cadastro feito sem sinal vale; tirar o equipamento', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = osComEquipamentoPrincipal(amb);
  let r = ok(sync(amb, [ev('EQUIPAMENTO', id, { chave: 'eqx-outro-01', equipamentoId: 'eq3' }), ev('EQUIPAMENTO', id, { chave: 'eqx-mesmo-01', equipamentoId: 'eq1' })]));
  assert.equal(r.recusados.length, 2);
  assert.match(r.recusados[0].motivo, /outro cliente/); assert.ok(r.recusados[0].definitivo); assert.match(r.recusados[0].corrigir, /Escolha um equipamento do cliente/);
  assert.match(r.recusados[1].motivo, /equipamento da própria O\.S\./);
  ok(sync(amb, [ev('EQUIPAMENTO', id, { chave: 'eqx-dobra-01', equipamentoId: 'eq2' })]));
  r = ok(sync(amb, [ev('EQUIPAMENTO', id, { chave: 'eqx-dobra-02', equipamentoId: 'eq2' })]));
  assert.match(r.recusados[0].motivo, /já está nesta O\.S\./);
  // equipamento cadastrado em campo sem sinal: o aparelho manda o id provisório (idLocal do cadastro)
  const cad = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-eq-campo-0001', tipo: 'EQUIPAMENTO', dados: { clienteId: 'c1', unidadeId: 'un1', tipo: 'Seladora', modelo: 'SX', serie: 'SL-900', tag: 'SL-09', setor: 'CME' } }));
  r = ok(sync(amb, [ev('EQUIPAMENTO', id, { chave: 'eqx-novo-01', equipamentoId: 'cad-eq-campo-0001', serieConfirmada: 'SL-900' })]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  const novo = amb.tabelas.ATEC_OS_EQUIPAMENTOS.find((e) => e.CHAVE === 'eqx-novo-01');
  assert.equal(novo.EQUIPAMENTO_ID, cad.id || cad.cadastro && cad.cadastro.id || novo.EQUIPAMENTO_ID); assert.notEqual(novo.EQUIPAMENTO_ID, 'cad-eq-campo-0001');
  assert.match(novo.EQUIPAMENTO_TEXTO, /seladora/i);
  // tirar o equipamento (engano): sai das faltas e do relatório; a linha fica (nada é apagado)
  r = ok(sync(amb, [ev('EQUIPAMENTO', id, { chave: 'eqx-dobra-01', remover: true, motivo: 'Acrescentei por engano' })]));
  assert.equal(r.recusados.length, 0);
  const tirado = amb.tabelas.ATEC_OS_EQUIPAMENTOS.find((e) => e.CHAVE === 'eqx-dobra-01');
  assert.equal(tirado.ATIVO, 'NAO');
  const faltas = amb.ctx.AstO_faltas_(linhaOs(amb, id)).join(' | ');
  assert.doesNotMatch(faltas, /Lavadora/); assert.match(faltas, /no equipamento 2 \(seladora/i);
});

test('tela da O.S. (SGO+ web), ajuda e manual: equipamentos atendidos nesta visita', () => {
  const dest = process.env.DEST ? path.resolve(__dirname, '..', process.env.DEST) : path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const js = fs.readFileSync(path.join(dest, 'JS_Assistencia.html'), 'utf8');
  assert.match(js, /Equipamentos atendidos nesta visita/);
  const aj = fs.readFileSync(path.join(dest, 'SGO_Ajuda_Assistencia.js'), 'utf8');
  assert.match(aj, /Acrescentar equipamento/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_APP_CAMPO.md'), 'utf8');
  assert.match(man, /Acrescentar equipamento/);
});
