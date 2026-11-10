const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
function ambiente(ocorrencias = []) {
  let liberado = 0;
  const fechamentos = [];
  const ctx = vm.createContext({
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } },
    // CONDUTA_SHEETS e SGO_UTILS reais (SGO_Conduta_Setup.js, SGO_Utilis.js), carregados abaixo como em produção.
    SGO_DATA: {
      getAll: tabela => tabela === 'qual_ocorrencia' ? ocorrencias : tabela === 'qual_fechamento' ? fechamentos : [],
      insert: (_, registro) => { fechamentos.push(registro); return registro; },
      getById: () => null,
      log() {}
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() { liberado++; } }) }
  });
  // Missões pendentes travam o fechamento (Conduta_missoesPendentesCompetencia_, SGO_Conduta_Missao.js) e o nome do mês vem
  // de SGO_Conduta_Ciencia.js (Conduta_nomeCompetencia_): em produção todos os .js são carregados juntos.
  for (const f of ['SGO_Utilis.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Missao.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Fechamento.js']) vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx);
  ctx.Conduta_hojeISO_ = () => '2026-10-01';
  ctx.Conduta_exigirGestor_ = () => ({ userId: 'gestor' });
  ctx.Conduta_processarPrazosVencidos_ = () => {};
  ctx.Conduta_gerarRelatorio_ = () => {};
  ctx.Conduta_apurarCompetencia_ = () => ({ D: 8, n: 1, ico: 60, farol: 'VERMELHO', sombra: true, porColaborador: [] });
  return { ctx, fechamentos, liberado: () => liberado };
}
test('pendências e último dia de recurso bloqueiam congelamento setembro', () => {
  for (const status of ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO', 'FIRME']) {
    const { ctx, fechamentos, liberado } = ambiente([{ ID: 1, COMPETENCIA: '2026-09', STATUS: status, PRAZO_RECURSO: '2026-10-01' }]);
    assert.throws(() => ctx.Conduta_apiFecharCompetencia('s', { competencia: '2026-09' }), /pendente/);
    assert.equal(fechamentos.length, 0);
    assert.equal(liberado(), 1);
  }
});
test('decisão real outubro continua contabilizada em setembro após defesa', () => {
  const oc = { ID: 1, COMPETENCIA: '2026-09', DATA_FATO: '2026-09-24', STATUS: 'FIRME', FIRME_EM: '2026-10-01', PRAZO_RECURSO: '2026-10-05' };
  const { ctx, fechamentos } = ambiente([oc]);
  ctx.Conduta_hojeISO_ = () => '2026-10-06';
  ctx.Conduta_apiFecharCompetencia('s', { competencia: '2026-09' });
  assert.equal(fechamentos[0].COMPETENCIA, '2026-09');
  assert.equal(fechamentos[0].FECHADO_EM, '2026-10-06');
  assert.equal(oc.FIRME_EM, '2026-10-01');
  assert.equal(fechamentos[0].SOMBRA, true);
});
test('prévia não escreve fechamento, valida mês e mantém pendências visíveis', () => {
  const { ctx, fechamentos } = ambiente([{ ID: 2, COMPETENCIA: '2026-09-01T00:00:00', STATUS: 'EM_RECURSO' }]);
  const previa = ctx.Conduta_apiPreviaFechamento('s', { competencia: '2026-09' });
  assert.equal(previa.pendencias.length, 1);
  assert.equal(previa.podeFechar, false);
  assert.match(previa.mensagem, /simulação/);
  assert.equal(fechamentos.length, 0);
  assert.throws(() => ctx.Conduta_validarCompetencia_('2026-13'), /inválida/);
});
test('mês corrente e competência já congelada não fecham', () => {
  const { ctx, fechamentos } = ambiente();
  assert.throws(() => ctx.Conduta_apiFecharCompetencia('s', { competencia: '2026-10' }), /término/);
  fechamentos.push({ COMPETENCIA: '2026-09', CONGELADO: true });
  assert.throws(() => ctx.Conduta_apiFecharCompetencia('s', { competencia: '2026-09' }), /congelada/);
  // Mensagem reescrita em 16/10 (63123cf, "operador nunca no limbo"): "O mês de setembro/2026 já foi fechado e congelado: ...".
  assert.throws(() => ctx.Conduta_exigirCompetenciaAberta_('2026-09'), /já foi fechado e congelado/);
  assert.equal(ctx.Conduta_apiPreviaFechamento('s', { competencia: '2026-09' }).fechamentoCongelado, true);
  assert.equal(ctx.Conduta_apiPreviaFechamento('s', { competencia: '2026-09' }).podeFechar, false);
});
test('homologação outubro preserva competência e data setembro e concede prazo completo', () => {
  const oc = { ID: 3, FISCAL_ID: 'fiscal', STATUS: 'REGISTRADA', DATA_FATO: '2026-09-30', COMPETENCIA: '2026-09' };
  const { ctx } = ambiente([oc]);
  ctx.SGO_DATA.getById = () => oc;
  ctx.SGO_DATA.update = (_, id, campos) => Object.assign(oc, campos);
  ctx.Conduta_obterParametros_ = () => ({ PRAZO_CONTESTACAO_DIAS_UTEIS: 3 });
  ctx.Conduta_veIdentidade_ = () => true; // quem homologa é a Diretoria ou o Gestor de Qualidade (28/10/2026)
  ctx.Conduta_apiHomologarOcorrencia('s', { id: 3, decisao: 'APROVAR' });
  assert.equal(oc.DATA_FATO, '2026-09-30');
  assert.equal(oc.COMPETENCIA, '2026-09');
  assert.equal(oc.HOMOLOGADA_EM, '2026-10-01');
  assert.equal(oc.PRAZO_CONTESTACAO, '2026-10-06');
});
