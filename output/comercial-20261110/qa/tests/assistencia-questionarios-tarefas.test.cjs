// Checklists montados a partir das tarefas copiadas do Auvo (21/10/2026): a lista de apoio de questionários do acervo veio
// vazia em produção; os modelos saem dos questionários respondidos no JSON de cada tarefa. Lotes curtos, aba lida por faixa
// (nunca inteira), JSON grande pulado, estado numa linha só, modelos inativos (rascunho). 25 tarefas simuladas, só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const v8 = require('node:v8');
const vm = require('node:vm');
const { ambiente, ok } = require('./_assistencia_ambiente.cjs');

const COLS = ['ID', 'AUVO_TASK_ID', 'MES_CONSULTA', 'ANO', 'DATA_TAREFA', 'TIPO_TAREFA', 'CLIENTE_AUVO_ID', 'CLIENTE_NOME', 'TECNICO_NOME', 'FINALIZADA', 'QTD_QUESTIONARIOS', 'QTD_ARQUIVOS', 'JSON_SHA256', 'JSON_TAMANHO', 'JSON_VERSAO', 'JSON_ARQUIVO_ID'];
function montar() {
  const amb = ambiente();
  const pasta = amb.ctx.DriveApp.getRootFolder().createFolder('Acervo Auvo');
  const linhas = [];
  for (let i = 1; i <= 25; i++) {
    const qs = [];
    if (i <= 20) qs.push({ id: 189072, description: 'Atendimento', answers: [
      { questionDescription: 'Equipamento funcionando ao chegar?', reply: i % 3 ? 'Sim' : 'Não' },
      { questionDescription: 'FOTO DO EQUIPAMENTO', reply: 'https://arquivos.exemplo.test/f' + i + '.jpg' },
      { questionDescription: 'Estado geral', reply: ['Bom', 'Regular', 'Ruim'][i % 3] },
      { questionDescription: 'Temperatura medida', reply: String(120 + i) },
      { questionDescription: 'Observações', reply: 'Texto livre número ' + i + ' com detalhes diferentes do atendimento' },
      { questionDescription: 'ASSINATURA DO CLIENTE', reply: 'https://arquivos.exemplo.test/a' + i + '.png' }
    ].concat(i === 7 ? [{ questionDescription: 'Pergunta rara', reply: 'x' }] : []) });
    if (i > 15) qs.push({ id: 192376, description: "RELATÓRIO METROLAB'S", answers: [{ questionDescription: 'Serviço executado', reply: 'Serviço ' + i }, { questionDescription: 'Data do serviço', reply: '10/10/2026' }] });
    const conteudo = i === 25 ? 'X'.repeat(10) : JSON.stringify({ taskID: 5000 + i, questionnaires: qs });
    const f = pasta.createFile(amb.ctx.Utilities.newBlob(conteudo, 'application/json', 'tarefa_' + (5000 + i) + '.json'));
    linhas.push({ ID: 't' + i, AUVO_TASK_ID: String(5000 + i), TIPO_TAREFA: 'Visita', QTD_QUESTIONARIOS: qs.length, JSON_VERSAO: 1, JSON_ARQUIVO_ID: f.getId() });
  }
  linhas.push({ ID: 't26', AUVO_TASK_ID: '5003', QTD_QUESTIONARIOS: 1, JSON_VERSAO: 2, JSON_ARQUIVO_ID: linhas[2].JSON_ARQUIVO_ID }); // versão nova da mesma tarefa: não conta de novo
  amb.tabelas.AUVO_ACERVO_TAREFAS = linhas;
  const leituras = { inteira: 0, faixas: [] };
  const getAll = amb.ctx.SGO_DATA.getAll, getSheet = amb.ctx.SGO_DATA.getSheet;
  amb.ctx.SGO_DATA.getAll = (t) => { if (t === 'AUVO_ACERVO_TAREFAS') leituras.inteira++; return getAll(t); };
  amb.ctx.SGO_DATA.getSheet = (n) => {
    if (n !== 'AUVO_ACERVO_TAREFAS') return getSheet(n);
    return { getLastRow: () => linhas.length + 1, getLastColumn: () => COLS.length,
      getRange: (r, c, nr, nc) => ({ getValues: () => { if (r > 1) leituras.faixas.push(nr); return r === 1 ? [COLS.slice(0, nc)] : linhas.slice(r - 2, r - 2 + nr).map((l) => COLS.slice(0, nc).map((k) => (l[k] === undefined ? '' : l[k]))); } }) };
  };
  return { amb, leituras };
}

test('derivação: lotes curtos, faixa da aba (nunca inteira), estado numa linha, modelos em rascunho com perguntas na ordem e tipos inferidos', () => {
  const { amb, leituras } = montar();
  let r;
  for (let k = 0; k < 5; k++) { r = ok(amb.api('s_gil', 'derivarQuestionarios', {})); if (r.situacao.concluido) break; amb.ctx.Ast_memoLimpar_(); }
  assert.equal(r.situacao.concluido, true);
  assert.equal(leituras.inteira, 0, 'a aba de tarefas do acervo não é lida inteira');
  assert.ok(leituras.faixas.every((n) => n <= 60), JSON.stringify(leituras.faixas));
  assert.equal(r.situacao.pulados, 1, 'JSON inválido pulado sem parar');
  assert.equal(r.situacao.questionarios, 2);
  assert.equal(amb.tabelas.ATEC_CONFIG.filter((c) => c.CHAVE === 'QUEST_DERIVA').length, 1, 'estado numa linha só');
  const m = amb.tabelas.ATEC_MODELOS.find((x) => x.CODIGO === 'AUVO_Q189072');
  assert.equal(m.ATIVO, 'NAO', 'nasce como rascunho');
  assert.match(m.NOME, /Atendimento \(Auvo, 20 tarefas\)/);
  const p = JSON.parse(m.PERGUNTAS_JSON);
  assert.deepEqual(p.map((x) => x.tipo), ['SIM_NAO', 'FOTO', 'OPCAO', 'NUMERO', 'TEXTO', 'ASSINATURA']);
  assert.deepEqual(p[2].opcoes.slice().sort(), ['Bom', 'Regular', 'Ruim']);
  assert.ok(p.every((x) => x.obrigatoria));
  assert.ok(!p.some((x) => /rara/.test(x.texto)), 'pergunta que quase não aparece fica de fora');
  const m2 = JSON.parse(amb.tabelas.ATEC_MODELOS.find((x) => x.CODIGO === 'AUVO_Q192376').PERGUNTAS_JSON);
  assert.deepEqual(m2.map((x) => x.tipo), ['TEXTO', 'DATA']);
  // inativo não aparece para agendar; a gestão ativa e a rotina não mexe mais
  assert.ok(!amb.ctx.Ast_modelos_(false).some((x) => x.codigo === 'AUVO_Q189072'));
  ok(amb.api('s_gil', 'salvarModelo', { modelo: { codigo: 'AUVO_Q189072', nome: 'Atendimento', perguntas: p, ativo: true }, motivo: 'Revisado pela Qualidade no ensaio' }));
  amb.ctx.Ast_memoLimpar_();
  ok(amb.api('s_gil', 'derivarQuestionarios', { recomecar: true, gerarAgora: true }));
  assert.equal(amb.tabelas.ATEC_MODELOS.find((x) => x.CODIGO === 'AUVO_Q189072').ATIVO, 'SIM', 'modelo revisado não é sobrescrito');
  assert.match(amb.api('s_tiago', 'derivarQuestionarios', {}).message, /Regras da assistência/);
  assert.ok(!amb.trava.aninhamentos);
});

test('memória estável: repetir a leitura completa não faz a memória crescer (acumulado pequeno, um JSON por vez)', () => {
  v8.setFlagsFromString('--expose-gc');
  const gc = vm.runInNewContext('gc');
  const { amb } = montar();
  const rodar = () => { amb.ctx.Ast_memoLimpar_(); amb.ctx.AstQ_derivarLote_({ recomecar: true, lote: 30 }); };
  rodar(); gc();
  const antes = process.memoryUsage().heapUsed;
  for (let k = 0; k < 15; k++) rodar();
  gc();
  const cresceu = process.memoryUsage().heapUsed - antes;
  const est = JSON.parse(amb.tabelas.ATEC_CONFIG.find((c) => c.CHAVE === 'QUEST_DERIVA').VALOR_JSON);
  assert.ok(JSON.stringify(est).length < 20000, 'estado guardado pequeno: ' + JSON.stringify(est).length);
  assert.ok(cresceu < 8 * 1024 * 1024, 'memória cresceu ' + Math.round(cresceu / 1024) + ' KB');
});
