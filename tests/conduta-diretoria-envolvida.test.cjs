// 19/10/2026 (decisão do dono): a Diretoria (perfil DIRETORIA ou o dono do sistema,
// SGO_DONOS de SGO_Chaves.js) homologa e julga ocorrência em que é a envolvida, com
// fundamentação obrigatória e a marca gravada; Gestor e Administrador comum seguem
// recusados; a Regra 12 (fiscal que registrou não decide) vale para todos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const MARCA = 'Decisão da Diretoria sobre ocorrência em que é envolvida';
const FUND = 'Fato confirmado pela agenda e pelo relato do cliente.';

function ambiente(sessao, registros) {
  const logs = [];
  const tabelas = { qual_ocorrencia: registros.ocorrencias || [], qual_missao: registros.missoes || [], qual_fechamento: [] };
  const ctx = vm.createContext({
    console,
    SGO_DATA: {
      getAll: t => tabelas[t] || [],
      getById: (t, id) => (tabelas[t] || []).find(r => String(r.ID) === String(id)) || null,
      update: (t, id, campos) => Object.assign((tabelas[t] || []).find(r => String(r.ID) === String(id)), campos),
      insert: (t, r) => r,
      log: (acao, usuario, texto) => logs.push({ acao, usuario, texto })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SGO_notificar_: () => {}
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Chaves.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Missao.js', 'SGO_Conduta_Ciencia.js']) {
    vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx);
  }
  ctx.Conduta_hojeISO_ = () => '2026-10-19';
  ctx.Conduta_obterParametros_ = () => ({ PRAZO_CONTESTACAO_DIAS_UTEIS: 3, PRAZO_RECURSO_DIAS_UTEIS: 2 });
  ctx.Conduta_exigirGestor_ = () => sessao;
  ctx.Conduta_exigirEquipe_ = () => sessao;
  ctx.isAdminSession = () => true;
  ctx.Conduta_podeConsultarTodos_ = () => true;
  return { ctx, logs, tabelas };
}

const DIRETORIA = { userId: 'u_dir', usuario: 'maria.diretoria', nome: 'MARIA', perfil: 'DIRETORIA' };
const DONO = { userId: 'u_admin', usuario: 'admin', nome: 'ADMIN', perfil: 'ADMIN' };
const ADMIN_COMUM = { userId: 'u_adm2', usuario: 'outro.admin', nome: 'OUTRO', perfil: 'ADMIN' };
const GESTOR = { userId: 'u_ges', usuario: 'joao.gestor', nome: 'JOAO', perfil: 'GESTOR' };

function ocorrencia(colaboradorId, status, extra) {
  return Object.assign({ ID: 'oc1', TIPO_CODIGO: 'M03', COLABORADOR_ID: colaboradorId, FISCAL_ID: 'u_fiscal', DATA_FATO: '2026-10-10', COMPETENCIA: '2026-10', STATUS: status }, extra || {});
}

test('Diretoria e dono homologam ocorrência própria com fundamentação e a marca gravada', () => {
  for (const sessao of [DIRETORIA, DONO]) {
    const oc = ocorrencia(sessao.userId, 'REGISTRADA');
    const { ctx, logs } = ambiente(sessao, { ocorrencias: [oc] });
    const r = ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR', justificativa: FUND });
    assert.equal(r.success, true);
    assert.equal(oc.STATUS, 'HOMOLOGADA');
    assert.equal(oc.DECISAO_DIRETORIA, MARCA);
    const hist = JSON.parse(oc.HISTORICO_JSON);
    assert.equal(hist.length, 1);
    assert.equal(hist[0].marca, MARCA);
    assert.equal(hist[0].texto, FUND);
    assert.equal(hist[0].acao, 'HOMOLOGACAO');
    const log = logs.find(l => l.acao === 'CONDUTA_DECISAO_DIRETORIA_PROPRIA');
    assert.ok(log, 'auditoria com a marca');
    assert.match(log.texto, /Decisão da Diretoria sobre ocorrência em que é envolvida/);
    assert.match(log.texto, /Fundamentação: Fato confirmado/);
  }
});

test('Diretoria em ocorrência própria precisa escrever a fundamentação', () => {
  const oc = ocorrencia('u_dir', 'REGISTRADA');
  const { ctx } = ambiente(DIRETORIA, { ocorrencias: [oc] });
  assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR', justificativa: '' }), /fundamentação/);
  assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'REJEITAR', justificativa: 'curto' }), /pelo menos 15/);
  assert.equal(oc.STATUS, 'REGISTRADA');
  assert.equal(oc.DECISAO_DIRETORIA, undefined);
});

test('Diretoria julga contestação e recurso próprios; extrato mostra a decisão da Diretoria', () => {
  const oc = ocorrencia('u_dir', 'CONTESTADA', { CONTESTADA_EM: '2026-10-15', TEXTO_CONTESTACAO: 'defesa' });
  const { ctx } = ambiente(DIRETORIA, { ocorrencias: [oc] });
  ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'MANTER', textoJulgamento: FUND });
  assert.equal(oc.STATUS, 'FIRME');
  assert.equal(oc.DECISAO_DIRETORIA, MARCA);
  assert.equal(oc.TEXTO_JULGAMENTO, FUND);
  oc.STATUS = 'EM_RECURSO';
  ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'ANULAR', textoJulgamento: 'Recurso acolhido: nova prova apresentada.' });
  assert.equal(oc.STATUS, 'ANULADA');
  const hist = JSON.parse(oc.HISTORICO_JSON);
  assert.deepEqual(hist.map(h => h.acao), ['JULGAMENTO_CONTESTACAO', 'JULGAMENTO_RECURSO']);
  assert.ok(hist.every(h => h.marca === MARCA));
  // extrato: a célula de situação ganha a marca e a nota traz a fundamentação mais recente
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Documentos_RelatorioA4.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Conduta_Extrato.js'), 'utf8'), ctx);
  const item = { data: '2026-10-10', codigo: 'M03', status: 'ANULADA', situacao: 'Anulada', decisaoDiretoria: oc.DECISAO_DIRETORIA, fundamentacao: ctx.CondutaExt_fundamentacaoDiretoria_(oc) };
  assert.match(ctx.CondutaExt_situacaoCelula_(item).html, /Decisão da Diretoria/);
  assert.match(ctx.CondutaExt_notaDiretoria_({ ocorrencias: [item] }), /Recurso acolhido/);
});

test('Gestor e Administrador comum envolvidos continuam recusados', () => {
  for (const sessao of [GESTOR, ADMIN_COMUM]) {
    const oc = ocorrencia(sessao.userId, 'REGISTRADA');
    const { ctx } = ambiente(sessao, { ocorrencias: [oc] });
    assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR', justificativa: FUND }), /Você é o colaborador envolvido/);
    oc.STATUS = 'CONTESTADA';
    assert.throws(() => ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'ANULAR', textoJulgamento: FUND }), /Você é o colaborador envolvido/);
    assert.equal(oc.DECISAO_DIRETORIA, undefined);
  }
});

test('Regra 12 vale também para a Diretoria: quem registrou como fiscal não decide', () => {
  const oc = ocorrencia('u_outro', 'REGISTRADA', { FISCAL_ID: 'u_dir' });
  const { ctx } = ambiente(DIRETORIA, { ocorrencias: [oc] });
  assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR', justificativa: FUND }), /fiscal que registrou/);
});

test('decisão comum (outra pessoa) não leva a marca e não exige texto', () => {
  const oc = ocorrencia('u_outro', 'REGISTRADA');
  const { ctx } = ambiente(GESTOR, { ocorrencias: [oc] });
  ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'APROVAR' });
  assert.equal(oc.STATUS, 'HOMOLOGADA');
  assert.equal(oc.DECISAO_DIRETORIA, undefined);
  assert.equal(JSON.parse(oc.HISTORICO_JSON)[0].marca, '');
});

test('lista: botão de decidir para a Diretoria envolvida, não para o Gestor envolvido', () => {
  for (const [sessao, espera] of [[DIRETORIA, true], [DONO, true], [GESTOR, false]]) {
    const oc = ocorrencia(sessao.userId, 'REGISTRADA');
    const { ctx } = ambiente(sessao, { ocorrencias: [oc] });
    ctx.exigirSessao = () => sessao;
    ctx.SGO_CFG = { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } };
    const lista = ctx.Conduta_apiListarOcorrencias('s', {});
    assert.equal(lista[0].PODE_HOMOLOGAR, espera, sessao.perfil);
    assert.equal(lista[0].DECIDE_COMO_DIRETORIA, espera, sessao.perfil);
  }
});

test('missão: a Diretoria executante decide com fundamentação e a marca; Gestor executante segue recusado', () => {
  const missao = () => ({ ID: 'm1', APROVACAO: 'PENDENTE', DESTINO: 'CAMPINAS', DATA: '2026-10-12', COMPETENCIA: '2026-10', EXECUTANTE_1_ID: 'u_dir', EXECUTANTE_2_ID: 'u_ges', REGISTRADO_POR: 'u_dir' });
  let m = missao();
  let amb = ambiente(DIRETORIA, { missoes: [m] });
  assert.throws(() => amb.ctx.Conduta_apiDecidirMissao('s', { id: 'm1', decisao: 'APROVAR', motivo: '' }), /fundamentação/);
  amb.ctx.Conduta_apiDecidirMissao('s', { id: 'm1', decisao: 'APROVAR', motivo: 'Deslocamento confirmado na agenda.' });
  assert.equal(m.APROVACAO, 'APROVADA');
  assert.equal(m.DECISAO_DIRETORIA, 'Decisão da Diretoria sobre missão em que é envolvida');
  assert.ok(amb.logs.some(l => l.acao === 'CONDUTA_DECISAO_DIRETORIA_PROPRIA'));
  m = missao();
  amb = ambiente(GESTOR, { missoes: [m] });
  assert.throws(() => amb.ctx.Conduta_apiDecidirMissao('s', { id: 'm1', decisao: 'APROVAR', motivo: 'Deslocamento confirmado na agenda.' }), /executante desta missão/);
  assert.equal(m.APROVACAO, 'PENDENTE');
});

test('rejeitar sem fundamentação é recusado para qualquer perfil', () => {
  const oc = ocorrencia('u_outro', 'REGISTRADA');
  const { ctx } = ambiente(GESTOR, { ocorrencias: [oc] });
  assert.throws(() => ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'REJEITAR', justificativa: '  ' }), /Para rejeitar, escreva a fundamentação/);
  assert.equal(oc.STATUS, 'REGISTRADA');
  ctx.Conduta_apiHomologarOcorrencia('s', { id: 'oc1', decisao: 'REJEITAR', justificativa: 'Fato não comprovado.' });
  assert.equal(oc.STATUS, 'REJEITADA');
});

test('lista de missões: Aprovar/Recusar para a Diretoria executante (com DECIDE_COMO_DIRETORIA), não para o Gestor executante', () => {
  for (const [sessao, espera] of [[DIRETORIA, true], [GESTOR, false]]) {
    const m = { ID: 'm1', APROVACAO: 'PENDENTE', DESTINO: 'CAMPINAS', DATA: '2026-10-12', COMPETENCIA: '2026-10', EXECUTANTE_1_ID: sessao.userId, REGISTRADO_POR: sessao.userId };
    const { ctx } = ambiente(sessao, { missoes: [m] });
    ctx.SGO_CFG = { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } };
    ctx.Conduta_ler_ = (aba) => ctx.SGO_DATA.getAll(aba);
    const item = ctx.Conduta_apiListarMissoes('s', {})[0];
    assert.equal(item.PODE_DECIDIR, espera, sessao.perfil);
    assert.equal(item.DECIDE_COMO_DIRETORIA, espera, sessao.perfil);
  }
});
