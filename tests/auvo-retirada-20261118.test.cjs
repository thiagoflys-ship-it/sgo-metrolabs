// Retirada do Auvo (18/11/2026, decisão do dono): "O Auvo não faz mais parte do sistema, quero que retire tudo, cancelamos com
// eles; quero que todas pendências ou qualquer outra coisa seja retirado do sistema, dos avisos e dos alertas."
// Prova, com o código real do legado (SGO_Auvo_Retirada.js e os arquivos que usavam o Auvo):
//  1. nenhum gatilho do Auvo é criado; rodar as funções de gatilho não chama a API e remove o gatilho; Auvo_retirarGatilhos_ limpa a agenda;
//  2. nenhuma pendência, aviso ou alerta auvo_*; itens antigos da Caixa saem como RETIRADA (fora da avaliação); sugestão pendente do Auvo
//     é encerrada sem cobrança; a matriz de avisos não tem mais eventos do Auvo e registra a retirada na trilha;
//  3. nenhum menu ou aba do Auvo (fica só o "Histórico do Auvo", somente consulta, para Administrador e Diretoria);
//  4. o histórico do Auvo já ligado a documentos (ficha do equipamento, prontuário, QR, Portal do cliente) continua abrindo;
//  5. a recarga semanal ("Puxar da minha agenda") funciona sem o Auvo.
// Só dados de teste; nada sai para a rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, ok } = require('./_assistencia_ambiente.cjs');

const pasta = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const GATILHOS_AUVO = ['Auvo_dispararSincronizacaoIncremental_', 'Auvo_dispararSincronizacaoReversaDiaria_', 'Auvo_pendDispararDiario_',
  'Auvo_continuarViaTrigger_', 'Auvo_pendContinuarViaTrigger_', 'AuvoAcervo_loteGatilho'];

/** Contexto com os arquivos do Auvo e uma agenda de gatilhos simulada (igual à do servidor: lista, apagar, criar). */
function ambienteAuvo(agendaInicial) {
  const agenda = (agendaInicial || []).map((f, i) => ({ id: 'g' + i, funcao: f }));
  const criados = [], apagados = [], rede = [];
  const ScriptApp = {
    getProjectTriggers: () => agenda.map((t) => ({ getHandlerFunction: () => t.funcao, getUniqueId: () => t.id })),
    deleteTrigger: (t) => { const i = agenda.findIndex((x) => x.id === t.getUniqueId()); if (i >= 0) { apagados.push(agenda[i].funcao); agenda.splice(i, 1); } },
    newTrigger: (fn) => { const cadeia = { timeBased: () => cadeia, after: () => cadeia, everyMinutes: () => cadeia, atHour: () => cadeia, everyDays: () => cadeia, inTimezone: () => cadeia,
      create: () => { criados.push(fn); agenda.push({ id: 'n' + criados.length, funcao: fn }); return {}; } }; return cadeia; }
  };
  const props = {};
  const ctx = vm.createContext({
    console, ScriptApp, Logger: { log() {} },
    UrlFetchApp: { fetch: (url) => { rede.push(url); throw new Error('a rede não pode ser usada no teste: ' + url); }, fetchAll: (l) => { rede.push(l); throw new Error('rede'); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    Utilities: { sleep() {}, formatDate: (d) => new Date(d).toISOString() },
    SGO_UTILS: { safe: (v) => (v === null || v === undefined ? '' : String(v)), safeUpper: (v) => String(v || '').toUpperCase(), nowIso: () => '2026-11-18T10:00:00' },
    SGO_CFG: { SHEETS: { AUVO_SYNC: 'AUVO_SYNC', AUVO_TAREFAS: 'AUVO_TAREFAS', AUVO_PENDENCIAS: 'AUVO_PENDENCIAS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_USUARIOS: 'CAD_USUARIOS' } },
    SGO_DATA: { getAll: (t) => (t === 'AUVO_TAREFAS' ? [{ AUVO_TASK_ID: '45123', TIPO_TAREFA: 'Preventiva', DATA_TAREFA: '2025-03-01', FINALIZADA: 'SIM', QUESTIONARIO_JSON: '[]', RELATO_SERVICO: 'feito' }] : []),
      getById: () => null, log() {}, insert: (t, d) => d, update() { return true; } },
    exigirSessao: () => ({ perfil: 'ADMIN', usuario: 'admin', nome: 'Administrador' }), validarSessao: () => ({ data: { perfil: 'ADMIN' } }), isAdminSession: () => true,
    CertCal_garantirTabela_() {}, CertCal_garantirColuna_() {}
  });
  for (const f of ['SGO_Auvo_Config.js', 'SGO_Auvo_Retirada.js', 'SGO_Auvo_Main.js', 'SGO_Auvo_Incremental.js', 'SGO_Auvo_Pendencias.js', 'SGO_Auvo_Reverso.js', 'SGO_Auvo_Push.js', 'SGO_AuvoAcervo.js']) {
    vm.runInContext(ler(f), ctx, { filename: f });
  }
  return { ctx, agenda, criados, apagados, rede, props };
}

test('1a. nenhum arquivo do legado agenda gatilho do Auvo (código)', () => {
  const arquivos = fs.readdirSync(pasta).filter((f) => /\.(js|html)$/.test(f));
  const achados = [];
  for (const f of arquivos) {
    const s = ler(f);
    if (/newTrigger\(\s*['"](Auvo|AuvoAcervo)[A-Za-z_]*['"]/.test(s) || /newTrigger\(\s*AUVO_ACERVO_CFG\.GATILHO/.test(s)) achados.push(f);
  }
  assert.deepEqual(achados, [], 'arquivos que ainda criam gatilho do Auvo');
});

test('1b. ligar a sincronização ou agendar continuação não cria gatilho; só remove o que existir e explica a retirada', () => {
  const a = ambienteAuvo(['Auvo_dispararSincronizacaoIncremental_', 'Auvo_pendDispararDiario_', 'Auvo_dispararSincronizacaoReversaDiaria_', 'Gestao_rotinaGatilho']);
  for (const fn of ['Auvo_configurarTriggerIncremental_', 'Auvo_pendConfigurarTriggerDiario_', 'Auvo_configurarTriggerDiarioReverso_', 'Auvo_pendIniciarAtualizacao_']) {
    assert.throws(() => a.ctx[fn](), /O Auvo foi descontinuado em 18\/11\/2026/, fn);
  }
  a.ctx.Auvo_pendAgendarContinuacao_(); a.ctx.Auvo_agendarContinuacaoReversa_(); a.ctx.AuvoAcervo_agendar_(5000);
  assert.deepEqual(a.criados, [], 'nenhum gatilho criado');
  assert.deepEqual(a.agenda.map((t) => t.funcao), ['Gestao_rotinaGatilho'], 'o gatilho de outro módulo fica');
  assert.deepEqual(a.rede, [], 'nenhuma chamada de rede');
  // telas antigas: toda chamada da integração recusa (a não ser a consulta de uma O.S. já copiada e os balões, vazios)
  for (const fn of ['apiTestarConexao', 'apiAtivarSincronizacaoIncremental', 'apiRodarSincronizacaoIncremental', 'apiAtualizarPendenciasAgora', 'apiIniciarSincronizacaoReversa', 'apiSincronizarCliente']) {
    assert.throws(() => a.ctx.Auvo_apiDispatch({ sessionId: 's', fn }), /descontinuado/, fn);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.Auvo_apiDispatch({ sessionId: 's', fn: 'apiVerificarNovosEventos', payload: { desde: '2026-11-01' } }).eventos)), []);
  assert.equal(a.ctx.Auvo_apiDispatch({ sessionId: 's', fn: 'apiObterOS', payload: { auvoTaskId: '45123' } }).ok, true, 'consulta de O.S. copiada continua');
  for (const fn of ['apiIniciarCopia', 'apiIniciarContagem', 'apiContinuar', 'apiTentarDeNovo', 'apiConferir']) {
    assert.throws(() => a.ctx.AuvoAcervo_apiDispatch({ sessionId: 's', fn }), /descontinuado/, fn);
  }
  assert.equal(a.ctx.Auvo_obterConteudoModulo(), '', 'a tela Integração Auvo não é mais servida');
  assert.deepEqual(a.rede, []);
});

test('1c. cada função de gatilho que ainda estiver na agenda não chama a API e se remove na primeira execução', () => {
  for (const fn of GATILHOS_AUVO) {
    const a = ambienteAuvo([fn, fn, 'Conduta_rotinaDiaria', 'Assistencia_rotinaGatilho']);
    const r = a.ctx[fn]();
    assert.equal(r.removidos, 2, fn);
    assert.deepEqual(a.agenda.map((t) => t.funcao), ['Conduta_rotinaDiaria', 'Assistencia_rotinaGatilho'], fn);
    assert.deepEqual(a.rede, [], fn + ': nenhuma chamada ao Auvo');
    assert.deepEqual(a.criados, [], fn + ': não agenda continuação');
  }
  // a chamada direta à API também recusa antes da rede (credenciais nem são lidas)
  const a = ambienteAuvo([]);
  a.props.AUVO_API_KEY = 'segredo-que-nao-pode-ser-lido';
  assert.throws(() => a.ctx.Auvo_apiFetch_('get', '/tasks/1'), /descontinuado/);
  assert.throws(() => a.ctx.Auvo_autenticar_(), /descontinuado/);
  assert.throws(() => a.ctx.AuvoAcervo_getAuvo_('/tasks?x=1'), /descontinuado/);
  assert.throws(() => a.ctx.Auvo_criarTarefa_({ documentoId: 'd1' }), /descontinuado/);
  assert.deepEqual(a.rede, []);
});

test('1d. Auvo_retirarGatilhos_ (rodar uma vez na publicação) limpa todos os gatilhos do Auvo e mantém os outros', () => {
  const a = ambienteAuvo(GATILHOS_AUVO.concat(['Auvo_dispararSincronizacaoIncremental_', 'Gestao_rotinaGatilho', 'Assistencia_rotinaGatilho', 'Frota_rotina']));
  assert.equal(a.ctx.Auvo_gatilhosRestantes_(), 7);
  const r = a.ctx.Auvo_retirarGatilhos_();
  assert.equal(r.ok, true);
  assert.equal(r.removidos, 7);
  assert.equal(r.porFuncao.Auvo_dispararSincronizacaoIncremental_, 2);
  assert.deepEqual(a.agenda.map((t) => t.funcao), ['Gestao_rotinaGatilho', 'Assistencia_rotinaGatilho', 'Frota_rotina']);
  assert.equal(a.ctx.Auvo_gatilhosRestantes_(), 0);
  assert.equal(a.ctx.Auvo_retirarGatilhos_().removidos, 0, 'rodar de novo não faz nada');
  // agenda que falha: devolve o erro sem lançar
  a.ctx.ScriptApp.getProjectTriggers = () => { throw new Error('agenda fora do ar'); };
  const r2 = a.ctx.Auvo_retirarGatilhos_();
  assert.equal(r2.ok, false); assert.match(r2.erro, /agenda fora do ar/);
});

const TAREFAS_AUVO = [
  { ID: 't1', AUVO_TASK_ID: '9001', CLIENTE_ID_SGO: '', CLIENTE_NOME_AUVO: 'Hospital sem vínculo', TECNICO_ID_SGO: '', TECNICO_NOME_AUVO: 'TÉCNICO AUVO',
    TIPO_TAREFA: 'Preventiva', DATA_TAREFA: '2026-11-10T08:00:00', FINALIZADA: 'NAO', CHECKIN_EM: '2026-11-10T08:10:00', CHECKOUT_EM: '', EQUIPAMENTOS_ID_SGO: '' },
  { ID: 't2', AUVO_TASK_ID: '9002', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME_AUVO: 'TIAGO', TIPO_TAREFA: 'Corretiva',
    DATA_TAREFA: '2026-11-17T08:00:00', FINALIZADA: 'SIM', CHECKIN_EM: '2026-11-17T08:00:00', CHECKOUT_EM: '', RELATO_SERVICO: '', QTD_FOTOS: 0, EQUIPAMENTOS_ID_SGO: 'eq1', TASK_URL: 'https://app.auvo.exemplo/9002' },
  { ID: 't3', AUVO_TASK_ID: '9003', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME_AUVO: 'TIAGO', TIPO_TAREFA: 'Instalação',
    DATA_TAREFA: '2026-11-18T13:00:00', FINALIZADA: 'NAO', CHECKIN_EM: '2026-11-18T09:00:00', CHECKOUT_EM: '', EQUIPAMENTOS_ID_SGO: 'eq1' }];
const PEND_AUVO = [{ ID: 'p1', AUVO_TASK_ID: '9001', TASK_DATE: '2026-11-10T08:00:00', DIAS_ABERTA: 8, TEM_EVIDENCIA: 'NAO', TECNICO_ID_SGO: 'u_tec', TECNICO_NOME: 'TIAGO',
  CLIENTE_NOME: 'Hospital sem vínculo', TASK_URL: 'https://app.auvo.exemplo/9001', ULTIMA_SINCRONIZACAO: '2026-11-11T05:00:00' }];

test('2a. nenhuma pendência ou alerta auvo_* (gestor, técnico e administrador); qualidade não cobra O.S. do Auvo', () => {
  const amb = ambiente({ agora: Date.parse('2026-11-18T10:00:00-03:00'), tabelas: { AUVO_TAREFAS: TAREFAS_AUVO.map((t) => Object.assign({}, t)), AUVO_PENDENCIAS: PEND_AUVO.map((p) => Object.assign({}, p)) } });
  const sessoes = Object.keys(amb.sessoes);
  assert.ok(sessoes.length >= 3);
  for (const s of sessoes) {
    let itens = [];
    try { itens = amb.pend(s); } catch (e) { continue; } // conta de cliente sem central
    const doAuvo = itens.filter((i) => /^auvo/i.test(i.tipo) || /^AUVO:/.test(i.id) || i.modulo === 'auvo' || /no Auvo|Integração Auvo/.test(i.titulo + ' ' + (i.oQueFazer || '')));
    assert.deepEqual(doAuvo.map((i) => i.id), [], s);
    assert.equal(itens.some((i) => i.id === 'QUAL:OS:9002'), false, s + ': O.S. do Auvo sem relato não é cobrada');
  }
  assert.equal(typeof amb.ctx.Pend_fonteAuvo_, 'undefined', 'a fonte do Auvo saiu da central');
  assert.equal(amb.ctx.PEND_FONTES.some((f) => /auvo/i.test(f.nome)), false);
  assert.equal('auvo' in amb.ctx.PEND_MODULOS, false);
});

test('2b. Caixa de decisões: item do Auvo que estava aberto sai como RETIRADA, fora da avaliação e dos resolvidos', () => {
  const amb = ambiente({ agora: Date.parse('2026-11-18T10:00:00-03:00'), tabelas: { AUVO_TAREFAS: TAREFAS_AUVO.map((t) => Object.assign({}, t)), AUVO_PENDENCIAS: PEND_AUVO.map((p) => Object.assign({}, p)),
    GES_DECISOES: [
      { ID: 'gd1', ITEM_ID: 'AUVO:OS:9001', TIPO: 'AUVO_OS_ABERTA', MODULO: 'auvo', TITULO: 'O.S. nº 9001 aberta no Auvo há 8 dias', AREA: 'TECNICA', RESPONSAVEIS_IDS: 'u_gt', ENTROU_EM: '2026-11-11T08:00', PRAZO_DECISAO: '2026-11-14', SITUACAO: 'ABERTA', PROVIDENCIAS: 0 },
      { ID: 'gd2', ITEM_ID: 'AUVO:VINC:9001', TIPO: 'AUVO_SEM_VINCULO', MODULO: 'auvo', TITULO: 'O.S. nº 9001 sem vínculo', AREA: 'TECNICA', RESPONSAVEIS_IDS: 'u_gt', ENTROU_EM: '2026-11-11T08:00', PRAZO_DECISAO: '2026-11-14', SITUACAO: 'ABERTA', PROVIDENCIAS: 0 },
      { ID: 'gd3', ITEM_ID: 'AUVO:IMPORTACAO', TIPO: 'AUVO_IMPORTACAO', MODULO: 'auvo', TITULO: 'Importação do Auvo parada', AREA: 'TECNICA', RESPONSAVEIS_IDS: 'u_ad', ENTROU_EM: '2026-11-12T08:00', PRAZO_DECISAO: '2026-11-13', SITUACAO: 'ABERTA', PROVIDENCIAS: 0 }] } });
  const r = amb.ctx.Ges_sincronizar_();
  assert.deepEqual(JSON.parse(JSON.stringify(r.naoVerificado)), []);
  const gd = amb.tabelas.GES_DECISOES.filter((d) => /^gd/.test(d.ID));
  assert.deepEqual(gd.map((d) => d.SITUACAO), ['RETIRADA', 'RETIRADA', 'RETIRADA']);
  assert.ok(gd.every((d) => d.RESOLVIDO_EM), 'data registrada');
  assert.equal(amb.tabelas.GES_DECISOES.some((d) => /^AUVO/.test(d.TIPO) && d.SITUACAO === 'ABERTA'), false, 'nenhum item do Auvo novo na caixa');
  assert.equal(amb.ctx.GES_SITUACOES.RETIRADA, 'Retirada (Auvo descontinuado)');
  if (typeof amb.ctx.GesP_foraDaAvaliacao_ === 'function') assert.equal(amb.ctx.GesP_foraDaAvaliacao_(gd[0], 30), true, 'fora da nota do gestor');
  assert.equal(Object.keys(amb.ctx.GES_TIPOS).some((t) => /^auvo/.test(t)), false);
});

test('2c. matriz de avisos sem eventos do Auvo, com a retirada registrada na trilha; aviso guardado do Auvo não sai', () => {
  const amb = ambiente();
  const padrao = amb.ctx.MTZ_PADRAO;
  assert.equal(padrao.some((e) => e.modulo === 'auvo' || /^S5[456]$/.test(e.cod)), false);
  assert.equal('auvo' in amb.ctx.MTZ_MODULOS_SILENCIAVEIS, false);
  const trilha = amb.ctx.Mtz_trilha_(300);
  const ret = trilha.filter((l) => /^S5[456]$/.test(l.codigo));
  assert.equal(ret.length, 3);
  assert.ok(ret.every((l) => /descontinuado pelo dono em 18\/11\/2026/.test(l.motivo) && l.em === '2026-11-18T00:00:00'));
  assert.match(ler('SGO_Avisos_Matriz.js'), /Mtz_s_\(v\.MODULO\)\.toLowerCase\(\) === 'auvo'\) \{ velhos\.push\(v\); return; \}/);
});

test('2d. Conduta: tarefa do Auvo não vira sugestão; pendente do Auvo é encerrada sem cobrança; O.S. do SGO+ continua', () => {
  const amb = ambiente({ agora: Date.parse('2026-11-18T10:00:00-03:00'), extras: ['SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Qualidade.js'],
    tabelas: { AUVO_TAREFAS: TAREFAS_AUVO.map((t) => Object.assign({}, t)), AUVO_PENDENCIAS: PEND_AUVO.map((p) => Object.assign({}, p)) } });
  const avisos = [];
  const sug = amb.ctx.Cndq_coletarAtendimentos_({}, '2026-10-01', avisos);
  assert.equal(sug.some((s) => s.origem === 'AUVO' || /^AUVO\|/.test(s.chave)), false);
  assert.equal(typeof amb.ctx.Cndq_coletarAuvo_, 'undefined');
  const fonte = ler('SGO_Conduta_Qualidade.js');
  assert.match(fonte, /\['ASSISTENCIA', Cndq_coletarAtendimentos_\]/);
  assert.match(fonte, /STATUS: 'DESCARTADA', DECIDIDA_EM: agora, DECIDIDA_POR_NOME: 'Sistema',\n\s+MOTIVO: 'O Auvo foi descontinuado em 18\/11\/2026/);
});

test('3. nenhum menu, aba, chave ou caixa de acesso do Auvo; fica só o Histórico do Auvo, somente consulta, para Administrador e Diretoria', () => {
  const index = ler('Index.html');
  assert.doesNotMatch(index, /data-mod="auvo"/);
  assert.doesNotMatch(index, /Integração Auvo<\/button>|Transição do Auvo|assistencia_transicao/);
  assert.match(index, /data-mod="auvo_historico"[^>]*style="display:none;"[^>]*>.*Histórico do Auvo<\/button>/);
  const core = ler('JS_Core.html');
  assert.doesNotMatch(core, /iniciarPollingAuvo_\(\)|verificarEventosAuvo_|renderMotorModulo_\("Integração Auvo"|auvo: "Integração Auvo"|abrir\(["']auvo["']\)|Abrir no Auvo/);
  assert.match(core, /btnHistAuvo\.style\.display = \(perfilMenu === "ADMIN" \|\| perfilMenu === "DIRETORIA"\)/);
  assert.match(core, /Sistema descontinuado em 18\/11\/2026 — somente consulta\./);
  const assist = ler('JS_Assistencia.html');
  assert.doesNotMatch(assist, /assistencia_transicao|At_renderTransicao_|Trazer os questionários do Auvo|Montar os checklists a partir das tarefas do Auvo|Uso em paralelo/);
  // Chaves e senhas: o grupo e o teste do Auvo saíram da tela (os valores gravados não são lidos nem apagados)
  const chaves = ler('SGO_Chaves.js'), jsChaves = ler('JS_Chaves.html');
  assert.doesNotMatch(chaves, /grupo: 'Auvo'|Chaves_testarAuvo_|'Auvo', 'Omie'/);
  assert.doesNotMatch(jsChaves, /"Auvo": \{|auvo: "Entra na API do Auvo/);
  // Acessos: as caixas da integração e da transição saíram; o histórico é só consulta
  const pod = ler('SGO_Poderes.js');
  assert.doesNotMatch(pod, /\["(AUVO_INTEGRACAO|AUVO_IMPLANTACAO|AST_DESLIGAR_AUVO|AST_ACEITAR_FALTAS_ACERVO)"/);
  assert.match(pod, /\["AUVO_ACERVO", "Painel de qualidade e histórico do Auvo", "Histórico do Auvo \(somente consulta\)"/);
  // tela do histórico: sem botões que falem com o Auvo
  const tela = ler('SGO_AuvoAcervo_Tela.js');
  assert.match(tela, /Histórico do Auvo \(sistema descontinuado em 18\/11\/2026\) — somente consulta/);
  assert.doesNotMatch(tela, /acv_contar\(|acv_copiar\(|acv_repetir\(|apiPausar|apiContinuar|apiConferir|Iniciar cópia/);
  // ajuda: a tela nova tem ajuda; a da integração e da transição saíram
  const ctxA = vm.createContext({});
  vm.runInContext(ler('SGO_Ajuda_Auvo.js'), ctxA);
  const aj = ctxA.SGO_ajudaTelas_Auvo_();
  assert.deepEqual(Object.keys(aj), ['auvo_historico']);
  assert.match(aj.auvo_historico.titulo, /descontinuado em 18\/11\/2026/);
  assert.doesNotMatch(ler('SGO_Ajuda_Assistencia.js'), /'assistencia_transicao'/);
});

test('4. histórico do Auvo já ligado ao equipamento continua abrindo (ficha, prontuário, QR e Portal do cliente usam a mesma função)', () => {
  const amb = ambiente({ tabelas: { AUVO_TAREFAS: TAREFAS_AUVO.map((t) => Object.assign({}, t)),
    ATEC_ACERVO_EQUIP: [{ ID: 'ax1', AUVO_TASK_ID: '7001', DATA_TAREFA: '2025-05-02T08:00:00', TIPO_TAREFA: 'Preventiva', TECNICO_NOME: 'Técnico antigo', FINALIZADA: 'SIM',
      CLIENTE_ID_SGO: 'c1', EQUIPAMENTO_ID_SGO: 'eq1', RESUMO: 'Troca de vedação', QTD_ARQUIVOS: 2 }] } });
  // a fonte única, sem origem, já não traz o Auvo (agenda, qualidade, ponto, recarga...)
  assert.equal(amb.ctx.SGO_Atendimentos_linhas_().some((t) => t.ORIGEM === 'AUVO'), false);
  assert.equal(amb.ctx.SGO_Atendimentos_linhas_({ origem: 'AUVO' }).length, 3, 'o histórico continua guardado');
  const h = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'GESTOR' } });
  assert.deepEqual(JSON.parse(JSON.stringify(h.map((x) => x.numero).sort())), ['7001', '9002', '9003']);
  assert.ok(h.every((x) => /Auvo \(histórico\)/.test(x.origemNome)));
  // cliente vê o histórico do próprio cliente (Portal), sem link de outro sistema
  const hc = amb.ctx.SGO_Atendimentos_doEquipamento_('eq1', { sessao: { perfil: 'CLIENTE', clienteId: 'c1' } });
  assert.ok(hc.length >= 2 && hc.every((x) => !x.link));
  // as fotos do acervo continuam abrindo para a equipe
  assert.match(ler('SGO_Assistencia_Painel.js'), /arquivosAcervo: function \(eu, d\) \{ return AstF_arquivosAcervo_\(eu, d && d\.taskId\); \}/);
  assert.match(ler('SGO_DocumentosPastas.js'), /SGO_Atendimentos_doEquipamento_\(equipId, \{ limite: 60, sessao: sessao \}\)/);
  assert.match(ler('SGO_PortalCliente_Documentos.js'), /SGO_Atendimentos_doEquipamento_\(eqId, \{ limite: 80, sessao: x\.eu\.sessao \}\)/);
  // agenda dos técnicos e conflito: só o SGO+
  assert.doesNotMatch(ler('SGO_Assistencia_Agenda.js'), /origem: 'AUVO'/);
});

test('5. recarga semanal: "Puxar da minha agenda" traz só as O.S. do SGO+, mesmo com tarefas do Auvo na semana', () => {
  const { ambienteCaju } = require('./_caju_ambiente.cjs');
  const a = ambienteCaju({ props: { APROVACAO_SO_DIRETORIA: 'SIM' } });
  // a fonte única devolve (por segurança do teste) as duas origens: a recarga confere a origem e fica só com o SGO+
  a.ctx.SGO_Atendimentos_linhas_ = () => [
    { ORIGEM: 'SGO', TECNICO_ID_SGO: 'u_tec', DATA_TAREFA: '2026-10-27T08:00:00', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TIPO_TAREFA: 'Preventiva', AUVO_TASK_ID: 'OS-2026-0101', ENDERECO: 'Rua A' },
    { ORIGEM: 'AUVO', TECNICO_ID_SGO: 'u_tec', DATA_TAREFA: '2026-10-28T08:00:00', CLIENTE_NOME_AUVO: 'Cliente do Auvo', TIPO_TAREFA: 'Visita', AUVO_TASK_ID: '9003', ENDERECO: 'Rua B' }];
  const itens = JSON.parse(JSON.stringify(a.ctx.Rcj_agendaSemana_('u_tec', '2026-10-26', '2026-11-01')));
  assert.deepEqual(itens.map((x) => x.ref), ['O.S. OS-2026-0101']);
  assert.ok(itens.every((x) => x.fonte === 'SGO'));
  const fonte = ler('SGO_RecargaCaju_Semanal.js');
  assert.match(fonte, /SGO_Atendimentos_linhas_\(\{ origem: 'SGO' \}\)/);
  assert.doesNotMatch(fonte, /'Auvo '/);
  assert.doesNotMatch(ler('JS_RecargaCaju.html'), /atendimentos do Auvo|tarefa do Auvo/);
});

test('6. emissões não criam mais tarefa no Auvo (certificado, laudo NR-13, PGT/POP e registro operacional)', () => {
  for (const f of ['SGO_CertCal_Main.js', 'SGO_NR13_Main.js', 'SGO_PgtPop_Main.js', 'SGO_RegOp_Main.js']) {
    assert.doesNotMatch(ler(f), /Auvo_criarTarefa_\(|AUVO_TAREFA_FALHOU/, f);
  }
});
