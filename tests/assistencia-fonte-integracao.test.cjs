// Fonte única de atendimentos (21/10/2026): os leitores do Auvo passam a ler Auvo + O.S. da Assistência do SGO+ sem quebrar.
// Ponto (técnico em atendimento), Conduta (sugestões), central (qualidade), Vínculos, Frota, Início e ficha do equipamento.
// Código real (tests/_assistencia_ambiente.cjs com arquivos extras); só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, FOTO, ASSINATURA, chamadoAgendado } = require('./_assistencia_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'int-' + String(n).padStart(5, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (amb, eventos) => ok(amb.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p-' + eventos[0].idLocal, eventos }));
const AUVO = [{ ID: 'a1', AUVO_TASK_ID: '45123', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME_AUVO: 'TIAGO', TIPO_TAREFA: 'Manutenção Preventiva',
  DATA_TAREFA: '2026-10-19T08:00:00', FINALIZADA: 'SIM', CHECKIN_EM: '2026-10-19T08:10:00', CHECKOUT_EM: '', RELATO_SERVICO: '', QTD_FOTOS: 0, EQUIPAMENTOS_ID_SGO: 'eq1', TASK_URL: 'https://app.auvo.exemplo/45123' }];

test('ponto: técnico em atendimento pelo aplicativo novo (Cheguei sem Concluí) entra na mesma regra do Auvo; evidência diz a origem', () => {
  const amb = ambiente({ extras: ['SGO_Ponto_Config.js'], tabelas: { AUVO_TAREFAS: AUVO.slice() } });
  const { os } = chamadoAgendado(amb, { inicio: '2026-10-19T11:00' });
  amb.mudar('2026-10-19T11:05:00-03:00');
  sync(amb, [ev('CHEGUEI', os.id, 1, {}, '2026-10-19T11:05:00')]);
  amb.mudar('2026-10-19T12:00:00-03:00');
  const t = amb.ctx.Ponto_tarefasAuvo_('2026-10-19');
  assert.equal(t.u_tec.length, 2);
  const em = amb.ctx.Ponto_emAtendimento_(t, 'u_tec', Date.now());
  assert.equal(em.id, os.numero);
  const evid = amb.ctx.Ponto_evidencia_('u_tec', '2026-10-19');
  assert.match(evid, /SGO\+ \(O\.S\. OS-2026-0001\): chegada 11:05, conclusão não feito/);
  assert.match(evid, /Auvo \(tarefa 45123\): check-in 08:10/);
});

test('central e Conduta: O.S. do SGO+ aberta há 3 dias vira sugestão "O.S. aberta"; qualidade da O.S. encerrada lida pela fonte única leva à ficha da O.S.', () => {
  const amb = ambiente({ extras: ['SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Qualidade.js'], tabelas: { AUVO_TAREFAS: AUVO.slice() } });
  const { os } = chamadoAgendado(amb);
  sync(amb, [ev('CHEGUEI', os.id, 1), ev('CONCLUI', os.id, 2, {}, '2026-10-20T10:00:00')]);
  amb.mudar('2026-10-24T10:00:00-03:00');
  const linha = amb.ctx.SGO_Atendimentos_linhas_({ origem: 'SGO' })[0];
  assert.equal(linha.FINALIZADA, 'NAO', 'documentação pendente conta como aberta');
  assert.ok(Number(linha.DIAS_ABERTA) >= 3);
  const avisos = [];
  const sug = amb.ctx.Cndq_coletarAuvo_({}, '2026-10-01', avisos);
  assert.ok(sug.some((s) => s.chave === 'SGO|ABERTA|' + os.numero && /no SGO\+/.test(s.titulo)), JSON.stringify(sug.map((s) => s.chave)));
  assert.ok(sug.some((s) => s.chave === 'AUVO|SEM_FOTO|45123'), 'o Auvo continua igual');
  // central: item de qualidade da tarefa do Auvo continua com o link do Auvo
  const itens = [];
  amb.ctx.Pend_fonteQualidade_((i) => itens.push(i), { gestao: true, userId: 'u_gt', perfil: 'GESTOR' });
  const q = itens.find((i) => i.id === 'QUAL:OS:45123');
  assert.ok(q && q.tela.tipo === 'link');
});

test('Vínculos, Frota, Início, ficha do equipamento e e-mail mensal: ligados à fonte única e às abas da Assistência (código)', () => {
  const v = ler('SGO_Vinculos.js');
  assert.match(v, /knownHistorical=\[[^\]]*'ATEC_CHAMADOS','ATEC_OS'/);
  assert.match(v, /da Assistência técnica em aberto ligados a este cadastro.*Conferir impacto de novo/);
  assert.match(ler('SGO_Frota_Rastreamento.js'), /SGO_Atendimentos_linhas_\(\) : Frota_lerSeExistir_\(SGO_CFG\.SHEETS\.AUVO_TAREFAS\)/);
  assert.match(ler('SGO_Frota_Reservas.js'), /SGO_Atendimentos_linhas_/);
  assert.match(ler('SGO_Main.js'), /fonteUnica \? SGO_Atendimentos_linhas_\(\) : SGO_DATA\.getAll\(aba\)/);
  assert.match(ler('SGO_Equipamentos.js'), /SGO_Atendimentos_doEquipamento_\(equipId/);
  assert.match(ler('SGO_Qualidade_Auvo.js'), /fonteUnica \? SGO_Atendimentos_linhas_\(\) : SGO_DATA\.getAll\(aba\)/);
  const g = ler('SGO_Gestao_Escada.js');
  assert.match(g, /\['ASSISTENCIA', 'Assistência técnica'\]/);
  assert.match(g, /falta\[0\] === 'ASSISTENCIA'\) g = Assistencia_relatorioMesParaGestao_\(comp\)/);
  assert.match(ler('SGO_Comercial_Propostas.js'), /s === 'TECNICA' && typeof Assistencia_doPedidoComercial_ === 'function'/);
});

test('Comercial: pedido aprovado passado à Técnica abre o chamado (sem valores), e o relatório mensal sai pelo e-mail da Diretoria uma vez', () => {
  const amb = ambiente();
  const p = { ID: 'p1', NUMERO: 'PROP-2026-0009', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', CLIENTE_NOME: 'Hospital Teste Alfa', CONTATO_NOME: 'Carla Compras Teste',
    ITENS_JSON: JSON.stringify([{ tipo: 'SERVICO', descricao: 'Manutenção preventiva', quantidade: 1, equipamentoId: 'eq1', valorUnitario: 900 }, { tipo: 'PRODUTO', descricao: 'Filtro', quantidade: 2 }]) };
  const r = amb.ctx.Assistencia_doPedidoComercial_(p, {});
  assert.equal(r.ok, true, r.motivo);
  const c = amb.tabelas.ATEC_CHAMADOS[0];
  assert.equal(c.CANAL, 'COMERCIAL');
  assert.equal(c.EQUIPAMENTO_ID, 'eq1');
  assert.equal(c.PROPOSTA_ID, 'p1');
  assert.doesNotMatch(c.SINTOMA, /900|R\$/);
  const g1 = amb.ctx.Assistencia_relatorioMesParaGestao_('2026-10');
  assert.equal(g1.salvo, true);
  const n = Object.keys(amb.arquivos).length;
  const g2 = amb.ctx.Assistencia_relatorioMesParaGestao_('2026-10');
  assert.equal(g2.salvo, true);
  assert.equal(Object.keys(amb.arquivos).length, n, 'segunda vez não gera de novo');
});

test('acervo do Auvo: índice por equipamento em lotes (vale o original no AUVO_SYNC), sem vínculo vai para a revisão; questionários viram modelos', () => {
  const amb = ambiente({ tabelas: {
    AUVO_SYNC: [{ ID: 's1', ENTIDADE_TIPO: 'EQUIPAMENTO', ENTIDADE_ID: 'eq1', AUVO_ID: '900' }, { ID: 's2', ENTIDADE_TIPO: 'EQUIPAMENTO', ENTIDADE_ID: 'eq2', AUVO_ID: '900' }, { ID: 's3', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'c1', AUVO_ID: '77' }],
    AUVO_ACERVO_TAREFAS: [] } });
  const pastaAc = amb.ctx.DriveApp.getRootFolder().createFolder('Acervo Auvo');
  const json = (o, nome) => pastaAc.createFile(amb.ctx.Utilities.newBlob(JSON.stringify(o), 'application/json', nome)).getId();
  amb.tabelas.AUVO_ACERVO_TAREFAS.push(
    { ID: 't1', AUVO_TASK_ID: '1001', DATA_TAREFA: '2025-01-10T08:00:00', TIPO_TAREFA: 'Manutenção Corretiva', CLIENTE_AUVO_ID: '77', TECNICO_NOME: 'Técnico antigo', FINALIZADA: 'SIM', QTD_ARQUIVOS: 3,
      JSON_ARQUIVO_ID: json({ taskID: 1001, equipmentsId: [900], customerId: 77, questionnaires: [{ answers: [{ questionDescription: 'Serviço', reply: 'Troca de vedação' }, { questionDescription: 'FOTO', reply: 'https://x/1.jpg' }] }] }, 'tarefa_1001.json') },
    { ID: 't2', AUVO_TASK_ID: '1002', DATA_TAREFA: '2025-02-10T08:00:00', TIPO_TAREFA: 'Entrega', CLIENTE_AUVO_ID: '78', FINALIZADA: 'SIM', JSON_ARQUIVO_ID: json({ taskID: 1002, equipmentsId: [] }, 'tarefa_1002.json') });
  const r1 = amb.ctx.AstF_indexarAcervo_({ lote: 1 });
  assert.equal(r1.feitos, 1); assert.equal(r1.restantes, 1);
  const r2 = amb.ctx.AstF_indexarAcervo_({ lote: 10 });
  assert.equal(r2.concluido, true);
  const ix = amb.tabelas.ATEC_ACERVO_EQUIP;
  assert.equal(ix.find((x) => x.AUVO_TASK_ID === '1001').EQUIPAMENTO_ID_SGO, 'eq1', 'vale o original');
  assert.match(ix.find((x) => x.AUVO_TASK_ID === '1001').RESUMO, /Troca de vedação/);
  assert.doesNotMatch(ix.find((x) => x.AUVO_TASK_ID === '1001').RESUMO, /https/);
  assert.equal(ok(amb.api('s_gil', 'revisaoAcervo', {})).total, 1);
  const h = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'GESTOR' } });
  assert.equal(h[0].origem, 'AUVO_ACERVO');
  // questionários e tipos do acervo (listas de apoio da etapa 0)
  const qid = json({ itens: [{ id: 189072, description: 'Checklist de manutenção', questions: [{ id: 1, description: 'Equipamento ligado?', answerType: 'YesNo', requiredAnswer: true },
    { id: 2, description: 'FOTO DO EQUIPAMENTO', answerType: 'Image', requiredAnswer: true }, { id: 3, description: 'Estado', answerType: 'SingleChoice', options: [{ description: 'Bom' }, { description: 'Ruim' }] }] }] }, 'questionarios.json');
  const tid = json({ itens: [{ id: 160907, description: 'Manutenção Corretiva', requirements: { requiredQuestionnaires: [189072] } }, { id: 999001, description: 'Tipo novo do Auvo (teste)', requirements: { fillReport: true, minimumNumberOfPhotos: 1 } }] }, 'tipos.json');
  amb.props.AUVO_ACERVO_ESTADO = JSON.stringify({ situacao: 'CONCLUIDO', catalogos: [{ nome: 'questionarios', arquivoId: qid }, { nome: 'tipos_de_tarefa', arquivoId: tid }] });
  amb.ctx.AuvoAcervo_lerEstado_ = () => JSON.parse(amb.props.AUVO_ACERVO_ESTADO);
  const imp = ok(amb.api('s_gil', 'importarAuvo', {}));
  assert.equal(imp.modelos, 1); assert.equal(imp.ligados, 1); assert.equal(imp.tiposNovos, 1);
  const mod = amb.tabelas.ATEC_MODELOS.find((m) => m.AUVO_QUESTIONARIO_ID === '189072');
  const perg = JSON.parse(mod.PERGUNTAS_JSON);
  assert.deepEqual(perg.map((p) => p.tipo), ['SIM_NAO', 'FOTO', 'OPCAO']);
  assert.equal(amb.tabelas.ATEC_TIPOS.find((t) => t.CODIGO === 'MANUTENCAO_CORRETIVA').MODELO_CODIGO, 'AUVO_Q189072');
  const imp2 = ok(amb.api('s_gil', 'importarAuvo', {}));
  assert.equal(imp2.modelos, 0, 'sem duplicar');
});
