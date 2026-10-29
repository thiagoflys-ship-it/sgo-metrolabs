// Relatórios automáticos da empresa (29/10/2026): destinatários e sigilo, pacotes semanal e mensal (um e-mail, sem duplicar),
// Saúde da empresa (regra e "sem dado") e o botão de teste só para quem clicou.
// Código real do SGO+ num contexto isolado, com tabelas em memória, relógio controlado, Drive e e-mail simulados.
// Só dados de teste (nomes e contatos fictícios).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);

const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICA', 'Técnica/Campo'], ['METROLOGIA', 'Metrologia'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'], ['COMERCIAL', 'Comercial']];

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || em('2026-10-26T08:00:00-03:00') };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      // como em produção: o dono entra com a conta "admin" (perfil Administrador, área Diretoria)
      { ID: 'u_dono', USUARIO: 'admin', NOME: 'TEODORO DONO TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test', AREA: 'DIRETORIA' },
      { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', AREA: 'DIRETORIA' },
      { ID: 'u_gq', USUARIO: 'quintino', NOME: 'QUINTINO QUALIDADE TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'quintino@exemplo.test', AREA: 'QUALIDADE' },
      { ID: 'u_gt', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', AREA: 'TECNICA' },
      { ID: 'u_ga', USUARIO: 'ana', NOME: 'ANA GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'ana@exemplo.test', AREA: 'ADMINISTRATIVO' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', AREA: 'TECNICA' },
      { ID: 'u_sai', USUARIO: 'saiu', NOME: 'PESSOA INATIVA TESTE', PERFIL: 'DIRETORIA', STATUS: 'INATIVO', EMAIL: 'saiu@exemplo.test', AREA: 'DIRETORIA' }
    ],
    CAD_AREAS: AREAS.map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_CONDUTORES: [], CAD_TECNICOS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [],
    qual_ocorrencia: [], qual_missao: [], qual_sugestao: [], qual_plano_acao: [], qual_fechamento: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'] } }) }, o.props || {});
  const cache = {}, emails = [], docs = [];
  const sessoes = {
    s_dono: { userId: 'u_dono', usuario: 'admin', nome: 'TEODORO DONO TESTE', perfil: 'ADMIN' },
    s_dir: { userId: 'u_dir', usuario: 'dora', nome: 'DORA DIRETORA TESTE', perfil: 'DIRETORIA' },
    s_gq: { userId: 'u_gq', usuario: 'quintino', nome: 'QUINTINO QUALIDADE TESTE', perfil: 'GESTOR' },
    s_gt: { userId: 'u_gt', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' },
    s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO TESTE', perfil: 'TECNICO' }
  };
  const pasta = { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => pasta, getUrl: () => 'https://drive.exemplo.test/pasta' };
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent,
    Utilities: criarUtilities(), Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }), everyMinutes: () => ({ create() {} }) }) }), getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d))); },
      log() {}
    },
    SGO_CFG: { SHEETS: Object.assign({ CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' }, o.sheets || {}) },
    CONDUTA_SHEETS: { OCORRENCIA: 'qual_ocorrencia', MISSAO: 'qual_missao', OCORRENCIA_TIPO: 'qual_ocorrencia_tipo', FECHAMENTO: 'qual_fechamento' },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: (l) => String(l || '').toLowerCase() === 'admin',
    SGO_execucaoInterna_: () => true,
    SGO_DocSalvar_pastaPersistente_: () => pasta,
    SGO_DocSalvar_sanitizarNome_: (n) => String(n),
    SGO_DocSalvar_salvarHtmlEPdf_: (p, nome, html) => { docs.push({ nome, html }); return { pdfUrl: 'https://drive.exemplo.test/doc' + docs.length + '.pdf', htmlUrl: 'https://drive.exemplo.test/doc' + docs.length + '.html', html }; }
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_Alertas_Central.js',
    'SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js', 'SGO_Gestao_RelatoriosEmpresa.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  }
  // regra real do sigilo do envolvido (28/10/2026), tirada do arquivo do Programa de conduta
  const cnd = fs.readFileSync(path.join(pastaLegado, 'SGO_Conduta_Ocorrencias.js'), 'utf8').replace(/\r\n/g, '\n');
  const fn = /function Conduta_veIdentidadeUsuario_\([\s\S]*?\n}\n/.exec(cnd);
  assert.ok(fn, 'Conduta_veIdentidadeUsuario_ existe no Programa de conduta');
  vm.runInContext(fn[0], ctx);
  vm.runInContext("var CNDQ_SHEETS = { SUGESTAO: 'qual_sugestao', PLANO: 'qual_plano_acao', ANALISE: 'qual_analise_causa' };", ctx);
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); };
  const rodar = (iso) => { mudar(iso); return ctx.Ges_rodada_(); };
  const doPacote = () => emails.filter((m) => /Relatórios da empresa/.test(m.subject));
  return { ctx, tabelas, props, cache, emails, docs, relogio, mudar, rodar, doPacote };
}

/** Programa de conduta simulado (só o necessário para o pacote): semanal da equipe e missões com nome de executante. */
function comConduta(amb) {
  const c = amb.ctx;
  c.Conduta_setup_ = () => {};
  c.CondutaRG_gerarSemanal_ = (fim) => ({ link: 'https://drive.exemplo.test/conduta-semanal-' + fim + '.pdf', html: '', aviso: '' });
  c.CondutaRG_contextoMissoes_ = (comp) => ({ competencia: comp, linhas: [{ nome: 'FULANO EXECUTANTE TESTE' }] });
  c.CondutaRG_ia_ = () => ({ analise: '', acoes: '', motivacao: '' });
  c.CondutaRG_htmlMissoes_ = (x) => c.RelA4_documento_({ titulo: 'Missões', corpo: '<p>' + x.linhas[0].nome + '</p>' });
  c.CondutaRel_pastaRelatorios_ = () => () => ({ getUrl: () => 'https://drive.exemplo.test/conduta' });
  c.CondutaRG_salvar_ = () => {};
}

const ordem = (l) => l.slice().sort();

// ------------------------------------------------------------------ destinatários e sigilo
test('destinatários: padrão = Diretoria, dono e gestor da Qualidade (sem id fixo); só Diretoria e Administrador mudam a lista', () => {
  const amb = ambiente();
  const c = amb.ctx, us = c.Ges_usuarios_();
  assert.deepEqual(ordem(c.RelEmp_destinatarios_(us, c.Ges_cfg_())), ['u_dir', 'u_dono', 'u_gq'], 'Thiago (dono, conta admin), Diretoria e Gestor de Qualidade; inativo fica de fora');
  // quem vê nome de envolvido do Programa de conduta (regra real de 28/10/2026)
  assert.equal(c.RelEmp_veNomes_(us.u_dono), true);
  assert.equal(c.RelEmp_veNomes_(us.u_dir), true);
  assert.equal(c.RelEmp_veNomes_(us.u_gq), true);
  assert.equal(c.RelEmp_veNomes_(us.u_gt), false);
  assert.equal(c.RelEmp_pode_(us.u_gq, 'DIRETORIA'), false, 'avaliação de gestores: só a Diretoria');
  assert.equal(c.RelEmp_pode_(us.u_dono, 'DIRETORIA'), true);
  // tela: leitura pela Diretoria; gestor e técnico não abrem
  const lido = c.Gestao_apiRelatoriosEmpresa('s_dir', {});
  assert.equal(lido.ok, true, lido.message);
  assert.equal(lido.padrao, true);
  assert.deepEqual(ordem(lido.destinatarios.map((p) => p.id)), ['u_dir', 'u_dono', 'u_gq']);
  assert.ok(lido.candidatos.every((p) => p.id !== 'u_tec' && p.id !== 'u_sai'), 'só gestão ativa pode ser marcada');
  assert.match(c.Gestao_apiRelatoriosEmpresa('s_gt', {}).message, /Diretoria e do Administrador/);
  assert.equal(c.Gestao_apiRelatoriosEmpresa('s_tec', {}).ok, false);
  // gravar: gestor não grava; pessoa fora da gestão é recusada; lista vazia pede ação
  assert.equal(c.Gestao_apiRelatoriosEmpresa('s_gq', { salvar: { ligado: true, destinatarios: ['u_gq'] } }).ok, false);
  assert.match(c.Gestao_apiRelatoriosEmpresa('s_dir', { salvar: { ligado: true, destinatarios: ['u_tec'] } }).message, /só pessoas ativas da gestão/);
  assert.match(c.Gestao_apiRelatoriosEmpresa('s_dir', { salvar: { ligado: true, destinatarios: [] } }).message, /marque pelo menos uma pessoa/);
  const salvo = c.Gestao_apiRelatoriosEmpresa('s_dono', { salvar: { ligado: true, destinatarios: ['u_dir', 'u_gt'] } });
  assert.equal(salvo.ok, true, salvo.message);
  assert.deepEqual(ordem(salvo.destinatarios.map((p) => p.id)), ['u_dir', 'u_gt']);
  assert.deepEqual(JSON.parse(amb.props.GES_RELATORIOS_EMPRESA_CFG).destinatarios, ['u_dir', 'u_gt'], 'guardado por id de usuário');
  const padrao = c.Gestao_apiRelatoriosEmpresa('s_dir', { salvar: { ligado: true, padrao: true } });
  assert.equal(padrao.padrao, true);
  assert.equal(padrao.destinatarios.length, 3);
});

test('sigilo: relatório com nomes do Programa de conduta e avaliação de gestores não vão para quem não tem o direito', () => {
  const amb = ambiente({ props: { GES_RELATORIOS_EMPRESA_CFG: JSON.stringify({ ligado: true, destinatarios: ['u_dir', 'u_gq', 'u_gt'] }) } });
  comConduta(amb);
  for (let k = 0; k < 8; k++) amb.rodar('2026-10-26T08:' + String(k * 5).padStart(2, '0') + ':00-03:00');
  const pac = amb.doPacote();
  assert.deepEqual(ordem(pac.map((m) => m.to)), ['dora@exemplo.test', 'gil@exemplo.test', 'quintino@exemplo.test'], 'um e-mail por pessoa da lista');
  const de = (to) => pac.find((m) => m.to === to).body;
  const missoes = /prestação de contas das missões de outubro de 2026 \(até 25\/10\/2026\): https:/;
  assert.match(de('dora@exemplo.test'), missoes);
  assert.match(de('dora@exemplo.test'), /Semanal da gestão: https:/);
  assert.match(de('quintino@exemplo.test'), missoes, 'Gestor de Qualidade vê os nomes da Conduta');
  assert.doesNotMatch(de('quintino@exemplo.test'), /Semanal da gestão: https:/, 'mas a avaliação de gestores é só da Diretoria');
  assert.match(de('quintino@exemplo.test'), /Não seguem neste e-mail, pela regra de acesso: Semanal da gestão \(avaliação de gestores: só a Diretoria\)/);
  const gil = de('gil@exemplo.test');
  assert.doesNotMatch(gil, missoes);
  assert.doesNotMatch(gil, /FULANO/);
  assert.match(gil, /prestação de contas das missões[^\n]*\(traz nomes do Programa de conduta: só a Diretoria e o Gestor de Qualidade\)/);
  assert.match(gil, /Programa de conduta: semanal da equipe: https:/, 'o semanal da equipe (sem nomes) vai para todos');
  const regGil = amb.tabelas.GES_ENVIOS.find((e) => e.TIPO === 'EMPRESA_PACOTE' && e.USUARIO_ID === 'u_gt');
  assert.doesNotMatch(regGil.ITENS, /CONDUTA_MISSOES|GESTAO_SEMANAL/);
  assert.match(regGil.MOTIVO, /regra de acesso/);
});

// ------------------------------------------------------------------ pacotes
test('semanal e mensal no mesmo dia: um relatório por rodada, um e-mail por pessoa com os dois pacotes, sem duplicar; e-mail diário da Diretoria sem os links', () => {
  // 01/11 domingo, 02/11 Finados: 03/11 é o primeiro dia útil da semana e do mês
  const amb = ambiente({ agora: em('2026-11-03T08:00:00-03:00') });
  amb.tabelas.GES_ENVIOS = [{ ID: 's1', TIPO: 'SEDNA_ESCALA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DIA: '2026-10-28', REFERENCIA: 'a1|2026-10-27T10:00|2', QTD: 1, SITUACAO: 'OK' }];
  const r1 = amb.rodar('2026-11-03T08:00:00-03:00');
  assert.equal(r1.empresa.gerado, 'SEDNA_SEMANA', 'um relatório do pacote por rodada');
  assert.equal(amb.doPacote().length, 0, 'espera tudo ficar pronto');
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_ITEM').length, 1);
  // e-mail diário da Diretoria: não espera e não leva os links (vão no pacote)
  const diario = amb.emails.filter((m) => m.to === 'dora@exemplo.test' && !/Relatórios da empresa/.test(m.subject));
  assert.equal(diario.length, 1);
  assert.match(diario[0].body, /Relatórios da semana e do mês: seguem em e-mail próprio/);
  assert.doesNotMatch(diario[0].body, /Desempenho da gestão — outubro/);
  for (let k = 1; k <= 6; k++) {
    const antes = amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_ITEM').length;
    amb.rodar('2026-11-03T' + String(8 + Math.floor((k * 15) / 60)).padStart(2, '0') + ':' + String((k * 15) % 60).padStart(2, '0') + ':00-03:00');
    assert.ok(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_ITEM').length - antes <= 1, 'no máximo um relatório novo do pacote por rodada');
  }
  const pac = amb.doPacote();
  assert.deepEqual(ordem(pac.map((m) => m.to)), ['dono@exemplo.test', 'dora@exemplo.test', 'quintino@exemplo.test']);
  const corpo = pac.find((m) => m.to === 'dora@exemplo.test').body;
  assert.match(pac[0].subject, /Relatórios da empresa: semana de 26\/10\/2026 a 01\/11\/2026 e outubro de 2026/);
  assert.match(corpo, /SEMANA DE 26\/10\/2026 A 01\/11\/2026\n- Semanal da gestão: https:/);
  assert.match(corpo, /MÊS DE OUTUBRO DE 2026\n- Saúde da empresa \(índice por área, melhorias e pendências\): https:/, 'a Saúde da empresa abre o pacote do mês');
  assert.match(corpo, /Desempenho da gestão \(avaliação dos gestores\): https:/);
  assert.match(corpo, /SEDNA da semana \(cobranças das atividades atrasadas\): https:/);
  assert.match(corpo, /Frota: não foi gerado\. Motivo: Módulo Frota indisponível\. O que fazer:/, 'o que falhou diz o motivo e o que fazer');
  // cada relatório gerado uma vez só
  const mensais = amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'MENSAL').map((e) => e.REFERENCIA);
  assert.deepEqual(ordem(mensais), ['2026-10|ATIVIDADES', '2026-10|CONDUTA', '2026-10|FROTA', '2026-10|GESTAO']);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'SEMANAL').length, 1);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_PACOTE').length, 6, 'um registro por pessoa e pacote');
  // rodadas seguintes no mesmo dia não mandam de novo
  amb.rodar('2026-11-03T11:00:00-03:00');
  amb.rodar('2026-11-03T14:00:00-03:00');
  assert.equal(amb.doPacote().length, 3);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'MENSAL').length, 4);
  // dia seguinte não é dia de pacote
  amb.rodar('2026-11-04T08:30:00-03:00');
  assert.equal(amb.doPacote().length, 3);
});

test('hora-limite: às 10:30 o e-mail sai com o que ficou pronto e o motivo do resto; feriado e fim de semana não geram nada', () => {
  const amb = ambiente({ agora: em('2026-11-02T09:00:00-03:00') });
  amb.rodar('2026-11-02T09:00:00-03:00'); // Finados
  amb.rodar('2026-11-01T09:00:00-03:00'); // domingo
  assert.equal((amb.tabelas.GES_ENVIOS || []).filter((e) => /EMPRESA|MENSAL|SEMANAL/.test(e.TIPO)).length, 0);
  amb.rodar('2026-11-03T10:20:00-03:00');
  assert.equal(amb.doPacote().length, 0);
  amb.rodar('2026-11-03T10:35:00-03:00');
  const pac = amb.doPacote();
  assert.equal(pac.length, 3, 'saiu na hora-limite');
  assert.match(pac[0].body, /não ficou pronto até 10:30\. Motivo: a geração é feita um relatório por vez/);
  // o resto continua sendo gerado, sem novo e-mail
  for (let k = 0; k < 6; k++) amb.rodar('2026-11-03T1' + (1 + k) + ':00:00-03:00');
  assert.equal(amb.doPacote().length, 3);
  assert.equal(amb.ctx.RelEmp_faltam_(amb.ctx.RelEmp_pacotesDoDia_('2026-11-03', amb.ctx.SGO_expediente_()), amb.ctx.Ges_envios_()), 0, 'tudo gerado depois');
});

test('desligado: nada de pacote e o e-mail diário da Diretoria volta a levar os relatórios, como antes', () => {
  const amb = ambiente({ props: { GES_RELATORIOS_EMPRESA_CFG: JSON.stringify({ ligado: false }) } });
  amb.rodar('2026-10-26T08:00:00-03:00');
  assert.equal(amb.doPacote().length, 0);
  assert.equal((amb.tabelas.GES_ENVIOS || []).filter((e) => /^EMPRESA/.test(e.TIPO)).length, 0);
  const diario = amb.emails.filter((m) => m.to === 'dora@exemplo.test');
  assert.equal(diario.length, 1);
  assert.match(diario[0].body, /Relatório semanal da gestão: https:/);
});

// ------------------------------------------------------------------ Saúde da empresa
test('Saúde da empresa: índice por área com regra escrita no documento, comparação com o mês anterior e "sem dado" onde não há dado', () => {
  const amb = ambiente({ agora: em('2026-11-03T09:00:00-03:00') });
  const dec = (id, area, entrou, prazo, acao, sit) => ({ ID: id, ITEM_ID: 'X:' + id, AREA: area, ENTROU_EM: entrou, PRAZO_DECISAO: prazo, PRIMEIRA_ACAO_EM: acao || '', SITUACAO: sit || (acao ? 'RESOLVIDA' : 'ABERTA'), RESOLVIDO_EM: acao || '', ACOMPANHAMENTO: '' });
  amb.tabelas.GES_DECISOES = [
    dec('d1', 'TECNICA', '2026-10-05T09:00', '2026-10-07', '2026-10-06T10:00'),          // no prazo
    dec('d2', 'TECNICA', '2026-10-05T09:00', '2026-10-07', ''),                          // venceu sem decisão
    dec('d3', 'ADMINISTRATIVO', '2026-10-10T09:00', '2026-10-14', '2026-10-13T10:00'),
    dec('d4', 'ADMINISTRATIVO', '2026-10-10T09:00', '2026-10-14', '2026-10-14T16:00'),
    dec('d5', 'TECNICA', '2026-09-10T09:00', '2026-09-14', '2026-09-11T10:00'),          // setembro, no prazo
    Object.assign(dec('d6', 'COMERCIAL', '2026-10-01T09:00', '2026-10-03', ''), { ACOMPANHAMENTO: 'SIM' }) // acompanhamento não entra
  ];
  amb.tabelas.ATV_ATIVIDADES = [
    { ID: 'a1', TITULO: 'Atividade de teste 1', RESPONSAVEL_ID: 'u_tec', PRAZO: '2026-10-10T17:00', PREVISAO_ATUAL: '2026-10-10T17:00', SITUACAO: 'Concluída', CONCLUIDA_EM: '2026-10-09T15:00', CRIADO_EM: '2026-10-01T09:00', PRIORIDADE: 'Normal' }
  ];
  amb.tabelas.qual_fechamento = [{ ID: 'f1', COMPETENCIA: '2026-10', ICO: 91.2, N: 7 }];
  amb.tabelas.qual_plano_acao = [{ ID: 'p1', CODIGO: 'PA-2026-1', FASE: 'EXECUTAR', QUANDO: '2026-10-20', CRIADO_EM: '2026-10-02T10:00' }];
  const c = amb.ctx, nomes = {};
  AREAS.forEach((a) => { nomes[a[0]] = a[1]; });
  const out = c.RelEmp_saudeDados_('2026-10', c.Ges_usuarios_(), nomes);
  const area = (k) => out.linhas.find((l) => l.codigo === k);
  assert.equal(area('TECNICA').decisoes, 50);
  assert.equal(area('TECNICA').atividades, 100);
  assert.equal(area('TECNICA').indice, 75, 'média simples dos componentes com dado');
  assert.equal(area('ADMINISTRATIVO').indice, 100);
  assert.equal(area('METROLOGIA').indice, null, 'sem decisão nem atividade: sem dado (não zero)');
  assert.equal(out.conduta.ico, 91.2);
  assert.equal(out.geral, 88.7, '(75 + 100 + 91,2) / 3');
  assert.equal(out.pendencias.caixa.vencidas, 1);
  assert.equal(out.pendencias.planos.vencidas, 1, 'plano com prazo vencido em aberto');
  const html = c.RelEmp_htmlSaude_('2026-10');
  const texto = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(texto, /Saúde da empresa/);
  assert.match(texto, /Como o índice é calculado/);
  assert.match(texto, /Média simples dos dois componentes acima que tiveram dado no mês/);
  assert.match(texto, /Metrologia sem dado sem dado sem dado/);
  assert.match(texto, /Técnica\/Campo 50,0% \(1 de 2\) 100,0% \(1 de 1\) 75,0 100,0 −25,0 pontos/, 'comparado com setembro pela mesma regra');
  assert.match(texto, /índice geral da empresa ficou em 88,7 de 100/);
  assert.match(texto, /Melhorias e pendências/);
  assert.doesNotMatch(texto, /TIAGO|GIL|DORA/, 'sem nomes de pessoas');
  assert.doesNotMatch(texto, /\b\d+\.\d+ ?%/, 'percentual com ponto decimal');
});

test('documentos da semana: Comercial, SEDNA e Frota com números pt-BR e "sem dado" quando a fonte não existe', () => {
  const amb = ambiente({ sheets: { CAD_VEICULOS: 'CAD_VEICULOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO' }, tabelas: {
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23' }],
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', DATA_SAIDA: '20/10/2026', KM_SAIDA: 1000, KM_CHEGADA: 1250, STATUS: 'FINALIZADO' }],
    COM_PROPOSTAS: [
      { ID: 'p1', RESPONSAVEL_ID: 'u_ga', RESPONSAVEL_NOME: 'ANA GESTORA TESTE', TOTAL: 1500, SITUACAO: 'APROVADA', ENVIADA_EM: '2026-10-20T10:00', RESPOSTA_EM: '2026-10-22T10:00' },
      { ID: 'p2', RESPONSAVEL_ID: 'u_ga', RESPONSAVEL_NOME: 'ANA GESTORA TESTE', TOTAL: '2.000,50', SITUACAO: 'RECUSADA', ENVIADA_EM: '2026-10-21T10:00', RESPOSTA_EM: '2026-10-23T10:00' },
      { ID: 'p3', RESPONSAVEL_ID: 'u_ga', RESPONSAVEL_NOME: 'ANA GESTORA TESTE', TOTAL: 900, SITUACAO: 'ENVIADA', ENVIADA_EM: '2026-10-12T10:00' }
    ],
    COM_OPORTUNIDADES: [{ ID: 'o1', SITUACAO: 'PERDIDA', PERDIDA_EM: '2026-10-21T10:00', MOTIVO_PERDA: 'Preço', VALOR_ESTIMADO: 3000, RESPONSAVEL_ID: 'u_ga', RESPONSAVEL_NOME: 'ANA GESTORA TESTE', CRIADO_EM: '2026-10-01T10:00' }],
    ATV_ATIVIDADES: [{ ID: 'a1', TITULO: 'Atividade de teste', RESPONSAVEL_ID: 'u_tec', PRAZO: '2026-10-20T10:00', PREVISAO_ATUAL: '2026-10-20T10:00', SITUACAO: 'Concluída', CONCLUIDA_EM: '2026-10-27T10:00', PRIORIDADE: 'Normal' }],
    GES_ENVIOS: [
      { ID: 'e1', TIPO: 'SEDNA_ESCALA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DIA: '2026-10-20', REFERENCIA: 'a1|2026-10-20T10:00|1', SITUACAO: 'OK' },
      { ID: 'e2', TIPO: 'SEDNA_ESCALA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DIA: '2026-10-21', REFERENCIA: 'a1|2026-10-20T10:00|2', SITUACAO: 'OK' },
      { ID: 'e3', TIPO: 'SEDNA_ESCALA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DIA: '2026-10-28', REFERENCIA: 'a9|2026-10-27T10:00|1', SITUACAO: 'OK' }
    ]
  } });
  const c = amb.ctx;
  c.COM_ABAS = { PROPOSTAS: 'COM_PROPOSTAS', OPORTUNIDADES: 'COM_OPORTUNIDADES' };
  c.Comercial_emUso_ = () => true;
  const p = c.RelEmp_pacoteSemanal_('2026-10-26');
  assert.equal(p.ini, '2026-10-19');
  assert.deepEqual(Array.from(p.itens, (i) => i.chave), ['GESTAO_SEMANAL', 'FROTA_SEMANA', 'COMERCIAL_SEMANA', 'SEDNA_SEMANA'], 'Frota e Comercial só quando em uso');
  const limpar = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const com = limpar(c.RelEmp_htmlComercialSemana_(p));
  assert.match(com, /R\$ 3\.500,50 Valor enviado/, 'enviadas na semana: 1.500 + 2.000,50 (a de 12/10 não entra)');
  assert.match(com, /R\$ 1\.500,00 Valor aprovado/);
  assert.match(com, /Preço 1/);
  const sed = limpar(c.RelEmp_htmlSednaSemana_(p));
  assert.match(sed, /2 Cobranças na semana 1 Nível 1 \(responsável\) 1 Nível 2 \(gestor da área\) 0 Nível 3/);
  assert.match(sed, /TIAGO TECNICO TESTE 1 1 0 1 1 0/, 'uma atividade cobrada, resolvida depois da semana');
  assert.match(sed, /0 foram concluídas ainda na semana, 1 depois dela e 0 continuam abertas/);
  const frota = limpar(c.RelEmp_htmlFrotaSemana_(p));
  assert.match(frota, /1 Retiradas na semana 250 km/);
  assert.match(frota, /sem dado Alertas do rastreador/, 'sem rastreador ligado: sem dado (não zero)');
  assert.match(frota, /Sem dado: as sugestões do copiloto não puderam ser calculadas/);
});

// ------------------------------------------------------------------ botão de teste
test('botão "Gerar e enviar agora (teste)": só Diretoria e Administrador, manda só para quem clicou e não bloqueia o pacote de verdade', () => {
  const amb = ambiente({ agora: em('2026-10-26T07:30:00-03:00') }); // antes do expediente
  const c = amb.ctx;
  assert.match(c.Gestao_apiRelatoriosEmpresaTeste('s_gt', { tipo: 'semanal' }).message, /Diretoria e do Administrador/);
  assert.equal(c.Gestao_apiRelatoriosEmpresaTeste('s_gq', { tipo: 'semanal' }).ok, false);
  const r = c.Gestao_apiRelatoriosEmpresaTeste('s_dir', { tipo: 'semanal' });
  assert.equal(r.ok, true, r.message);
  assert.match(r.message, /enviado só para você/);
  assert.equal(amb.emails.length, 1);
  assert.equal(amb.emails[0].to, 'dora@exemplo.test');
  assert.match(amb.emails[0].subject, /\[Teste\] Relatórios da empresa: semana de 19\/10\/2026 a 25\/10\/2026/);
  assert.match(amb.emails[0].body, /Envio de teste pedido por você/);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_TESTE').length, 1);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_PACOTE').length, 0, 'teste não conta como envio do pacote');
  const itens = amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_ITEM' || e.TIPO === 'SEMANAL').length;
  // o Administrador também pode; recebe só ele, e o que já estava pronto é reaproveitado
  const r2 = c.Gestao_apiRelatoriosEmpresaTeste('s_dono', { tipo: 'semanal' });
  assert.equal(r2.ok, true, r2.message);
  assert.match(r2.message, /Todos os relatórios já estavam prontos/);
  assert.equal(amb.emails.length, 2);
  assert.equal(amb.emails[1].to, 'dono@exemplo.test');
  // às 08:00 o pacote de verdade sai para toda a lista, sem gerar de novo
  amb.rodar('2026-10-26T08:00:00-03:00');
  assert.deepEqual(ordem(amb.doPacote().filter((m) => !/\[Teste\]/.test(m.subject)).map((m) => m.to)), ['dono@exemplo.test', 'dora@exemplo.test', 'quintino@exemplo.test']);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'EMPRESA_ITEM' || e.TIPO === 'SEMANAL').length, itens, 'nada gerado duas vezes');
  // teste do mensal: a Saúde da empresa vem primeiro
  const r3 = c.Gestao_apiRelatoriosEmpresaTeste('s_dir', { tipo: 'mensal' });
  assert.equal(r3.ok, true, r3.message);
  const ultimo = amb.emails[amb.emails.length - 1];
  assert.equal(ultimo.to, 'dora@exemplo.test');
  assert.match(ultimo.body, /MÊS DE SETEMBRO DE 2026\n- Saúde da empresa/);
});

test('tela e ajuda: bloco "Relatórios da empresa" em Desempenho da gestão > Relatórios, botões de teste e ajuda atualizada', () => {
  const js = fs.readFileSync(path.join(pastaLegado, 'JS_Gestao.html'), 'utf8');
  assert.match(js, /Gestao_apiRelatoriosEmpresa"/);
  assert.match(js, /Gestao_apiRelatoriosEmpresaTeste"/);
  assert.match(js, /Gerar e enviar agora \(teste\)/);
  assert.match(js, /Quem recebe os relatórios da empresa/);
  const amb = ambiente();
  vm.runInContext(fs.readFileSync(path.join(pastaLegado, 'SGO_Ajuda_Gestao.js'), 'utf8'), amb.ctx);
  const aj = amb.ctx.SGO_ajudaTelas_Gestao_();
  assert.ok(aj.gestao_desempenho.passos.some((p) => /Relatórios da empresa/.test(p.titulo)));
  assert.ok(aj.gestao_desempenho.perguntas.some((p) => /Saúde da empresa/.test(p.p)));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_GESTAO_DECISOES.md'), 'utf8');
  assert.match(manual, /## 6A\. Relatórios da empresa/);
  assert.doesNotMatch(JSON.stringify(aj) + js, /[\u{1F300}-\u{1FAFF}]/u, 'sem emoji');
});
