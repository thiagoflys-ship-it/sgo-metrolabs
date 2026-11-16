// Ambiente de teste do Desempenho da gestão e da Caixa de decisões com volume realista (11/11/2026, pedido do dono:
// "desempenho da gestão, isso está horrível" e "Caixa de decisões, fazer o mesmo"). Código real do SGO+ num contexto isolado,
// tabelas em memória, relógio controlado e envios simulados. Volume no molde do que a produção mostrou (só dados fictícios):
// centenas de O.S. do Auvo abertas há 200 a 335 dias, O.S. sem vínculo de técnico, O.S. recentes, atividades atrasadas da
// equipe e sugestões de ocorrência (sigilo). A Caixa é ligada em 20/10/2026 e sincronizada em quatro datas até 11/11/2026.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICA', 'Técnica/Campo'], ['METROLOGIA', 'Metrologia'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'], ['COMERCIAL', 'Comercial']];
const USUARIOS = [
  { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'DIRETORIA' },
  { ID: 'u_mat', USUARIO: 'matheus', NOME: 'MATHEUS GESTOR TECNICO TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', VINCULO_TRABALHO: 'PJ', AREA: 'TECNICA' },
  { ID: 'u_bru', USUARIO: 'bruna', NOME: 'BRUNA GESTORA ADM TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'bruna@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'ADMINISTRATIVO' },
  { ID: 'u_gil', USUARIO: 'gil', NOME: 'GIL GESTOR COMERCIAL TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' },
  { ID: 'u_t1', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_t2', USUARIO: 'paulo', NOME: 'PAULO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'paulo@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_t3', USUARIO: 'renan', NOME: 'RENAN TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'renan@exemplo.test', VINCULO_TRABALHO: 'PJ', AREA: 'TECNICA' },
  { ID: 'u_a1', USUARIO: 'alice', NOME: 'ALICE ADMINISTRATIVO TESTE', PERFIL: 'OPERADOR', STATUS: 'ATIVO', EMAIL: 'alice@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'ADMINISTRATIVO' },
  { ID: 'u_a2', USUARIO: 'beto', NOME: 'BETO ADMINISTRATIVO TESTE', PERFIL: 'OPERADOR', STATUS: 'ATIVO', EMAIL: 'beto@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'ADMINISTRATIVO' },
  { ID: 'u_c1', USUARIO: 'vera', NOME: 'VERA VENDEDORA TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' },
  { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' }
];

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || em('2026-10-20T10:00:00-03:00') };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)),
    CAD_AREAS: AREAS.map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_CONDUTORES: [], CAD_TECNICOS: [], AUVO_PENDENCIAS: [], AUVO_TAREFAS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [],
    qual_ocorrencia: [], qual_missao: [], qual_sugestao: [], qual_plano_acao: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456',
    GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_mat'], ADMINISTRATIVO: ['u_bru'], COMERCIAL: ['u_gil'] } }) }, o.props || {});
  const cache = {}, emails = [], whats = [];
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  const utilities = criarUtilities({
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent,
    Utilities: utilities, Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }), everyMinutes: () => ({ create() {} }) }) }), getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    UrlFetchApp: { fetch: (url, op) => { whats.push({ url, corpo: JSON.parse(op.payload) }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + whats.length }] }) }; } },
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
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS',
      AUVO_PENDENCIAS: 'AUVO_PENDENCIAS', AUVO_TAREFAS: 'AUVO_TAREFAS' } },
    CONDUTA_SHEETS: { OCORRENCIA: 'qual_ocorrencia', MISSAO: 'qual_missao', OCORRENCIA_TIPO: 'qual_ocorrencia_tipo' },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true,
    SGO_DocSalvar_pastaPersistente_: () => { throw new Error('Drive indisponível no teste'); }
  });
  const arquivos = ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_PonteCommand.js', 'SGO_Alertas_Central.js',
    'SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js', 'SGO_Gestao_RelatorioDiario.js', 'SGO_Gestao_Painel.js'];
  for (const f of arquivos) {
    const p = path.join(PASTA, f);
    if (!fs.existsSync(p)) continue; // base antiga (antes da mudança) não tem o painel novo
    vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  }
  vm.runInContext("var CNDQ_SHEETS = { SUGESTAO: 'qual_sugestao', PLANO: 'qual_plano_acao', ANALISE: 'qual_analise_causa' };", ctx);
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); };
  // a varredura do Auvo regrava DIAS_ABERTA todo dia (o título "aberta no Auvo há N dias" acompanha a data)
  const varredura = () => { const hoje = new DataFalsa().toISOString().slice(0, 10); tabelas.AUVO_PENDENCIAS.forEach((p) => { p.DIAS_ABERTA = Math.round((Date.parse(hoje + 'T12:00:00Z') - Date.parse(String(p.TASK_DATE).slice(0, 10) + 'T12:00:00Z')) / 864e5); }); };
  const sincronizar = () => { Object.keys(cache).forEach((k) => delete cache[k]); varredura(); return ctx.Ges_sincronizar_(); };
  return { ctx, tabelas, props, cache, emails, whats, relogio, mudar, sincronizar, varredura, sessoes, arquivos };
}

const dia = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const TECS = [['u_t1', 'TIAGO TECNICO TESTE'], ['u_t2', 'PAULO TECNICO TESTE'], ['u_t3', 'RENAN TECNICO TESTE']];

/** O.S. aberta no Auvo (foto da última varredura) com N dias em aberto na data de referência. */
function osAuvo(a, os, diasAberta, ref, tec) {
  const t = tec || TECS[os % TECS.length];
  a.tabelas.AUVO_PENDENCIAS.push({ ID: 'ap' + os, AUVO_TASK_ID: String(os), TECNICO_ID_SGO: t[0], TECNICO_NOME: t[1], DIAS_ABERTA: diasAberta, TEM_EVIDENCIA: os % 3 ? 'SIM' : 'NAO',
    TASK_DATE: dia(ref, -diasAberta) + 'T09:00:00', TASK_URL: 'https://app.auvo.exemplo.test/tarefa/' + os, CLIENTE_NOME: 'CLINICA FICTICIA ' + (os % 17), TASK_TYPE_DESCRICAO: 'Manutenção preventiva' });
}
/** O.S. do Auvo sem técnico vinculado ao SGO+ (técnico do Auvo sem cadastro). */
function osSemVinculo(a, os, dataTarefa, nomeAuvo) {
  a.tabelas.AUVO_TAREFAS.push({ ID: 'at' + os, AUVO_TASK_ID: String(os), CLIENTE_ID_SGO: 'c' + (os % 9), TECNICO_ID_SGO: '', TECNICO_NOME_AUVO: nomeAuvo, CLIENTE_NOME_AUVO: 'CLINICA FICTICIA', DATA_TAREFA: dataTarefa + 'T08:00:00' });
}
function atividade(a, id, resp, prazo, titulo) {
  const u = USUARIOS.find((x) => x.ID === resp);
  a.tabelas.ATV_ATIVIDADES.push({ ID: id, TITULO: titulo || 'Atividade de teste ' + id, RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: u.NOME, CRIADO_POR_ID: 'u_dir', CRIADO_POR_NOME: 'DORA DIRETORA TESTE',
    PRAZO: prazo, PREVISAO_ATUAL: prazo, SITUACAO: 'A fazer', PRIORIDADE: 'Normal', ATRASO_AVISADO_PREV: prazo });
}

/**
 * Volume realista (fictício): Caixa ligada em 20/10/2026, sincronizações em 20/10, 27/10, 03/11 e 11/11/2026 (10:00, dia útil).
 * Devolve o ambiente já em 11/11/2026 10:00 com o histórico em GES_DECISOES.
 */
function ambienteVolume(opcoes) {
  const a = ambiente(opcoes);
  // 20/10: acúmulo antigo do Auvo (150 O.S. abertas há 180 a 313 dias nesta data; outras 150 chegam em 03/11), 40 sem vínculo, 14 atividades atrasadas
  for (let k = 0; k < 150; k++) osAuvo(a, 52300000 + k, 180 + (k % 134), '2026-10-20');
  for (let k = 0; k < 40; k++) osSemVinculo(a, 81590000 + k, dia('2026-10-20', -(k * 3)), k % 2 ? 'JOAO TERCEIRIZADO AUVO' : 'CARLOS PARCEIRO AUVO');
  for (let k = 0; k < 8; k++) atividade(a, 'adm' + k, k % 2 ? 'u_a1' : 'u_a2', '2026-10-1' + (k % 6) + 'T18:00', 'Conferir notas fiscais do lote ' + (k + 1));
  for (let k = 0; k < 6; k++) atividade(a, 'tec' + k, TECS[k % 3][0], '2026-10-1' + (k % 6) + 'T18:00', 'Entregar relatório de campo ' + (k + 1));
  for (let k = 0; k < 4; k++) atividade(a, 'com' + k, 'u_c1', '2026-10-15T18:00', 'Retornar ao cliente da proposta ' + (k + 1));
  a.tabelas.qual_sugestao.push(...[1, 2, 3].map((k) => ({ ID: 'sg' + k, CHAVE: 'SUG' + k, STATUS: 'PENDENTE', COLABORADOR_ID: 'u_t' + k, COLABORADOR_NOME: TECS[k - 1][1], DATA_FATO: '2026-10-17',
    TITULO: 'Avaria na devolução do veículo PQB4394 (17/10/2026)', ORIGEM_MODULO: 'FROTA', DETECTADA_EM: '2026-10-19' })));
  a.mudar('2026-10-20T10:00:00-03:00'); a.sincronizar();
  // 27/10: 10 atividades resolvidas (concluídas), 25 O.S. novas do Auvo, mais 6 atividades atrasadas
  a.tabelas.ATV_ATIVIDADES.slice(0, 10).forEach((x) => { x.SITUACAO = 'Concluída'; x.CONCLUIDA_EM = '2026-10-23T11:00'; });
  for (let k = 0; k < 25; k++) osAuvo(a, 80490000 + k, 3 + (k % 8), '2026-10-27');
  for (let k = 0; k < 6; k++) atividade(a, 'adm2' + k, k % 2 ? 'u_a1' : 'u_a2', '2026-10-2' + (k % 4) + 'T18:00', 'Renovar cadastro do fornecedor ' + (k + 1));
  a.mudar('2026-10-27T10:00:00-03:00'); a.sincronizar();
  // 03/11: 12 O.S. recentes finalizadas no Auvo, 20 sem vínculo novas, mais 4 atividades
  a.tabelas.AUVO_PENDENCIAS = a.tabelas.AUVO_PENDENCIAS.filter((p) => !(Number(p.AUVO_TASK_ID) >= 80490000 && Number(p.AUVO_TASK_ID) < 80490012));
  for (let k = 0; k < 20; k++) osSemVinculo(a, 81690000 + k, dia('2026-11-01', -k), 'JOAO TERCEIRIZADO AUVO');
  for (let k = 150; k < 300; k++) osAuvo(a, 52300000 + k, 194 + (k % 134), '2026-11-03'); // a varredura do Auvo trouxe mais O.S. antigas
  for (let k = 0; k < 4; k++) atividade(a, 'com2' + k, 'u_c1', '2026-10-30T18:00', 'Enviar proposta revisada ' + (k + 1));
  a.mudar('2026-11-03T10:00:00-03:00'); a.sincronizar();
  // 11/11: 30 O.S. recentes (acima de 30 dias só as antigas), 6 atividades resolvidas
  for (let k = 0; k < 30; k++) osAuvo(a, 81750000 + k, 2 + (k % 12), '2026-11-11');
  a.tabelas.ATV_ATIVIDADES.filter((x) => /^adm2/.test(x.ID)).slice(0, 4).forEach((x) => { x.SITUACAO = 'Concluída'; x.CONCLUIDA_EM = '2026-11-05T15:00'; });
  a.mudar('2026-11-11T10:00:00-03:00'); a.sincronizar();
  return a;
}

module.exports = { ambiente, ambienteVolume, em, PASTA, USUARIOS, osAuvo, osSemVinculo, atividade, dia };
