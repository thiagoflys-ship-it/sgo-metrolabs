// Ambiente da MATRIZ DE AVISOS (21/10/2026): código real do SGO+ num contexto isolado, com tabelas em memória,
// relógio controlado e envios simulados (e-mail e WhatsApp não saem). Só dados de teste (nomes e contatos fictícios).
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
const SEG_10H = em('2026-10-19T10:00:00-03:00'); // segunda-feira, dia útil

const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICA', 'Técnica/Campo'], ['METROLOGIA', 'Metrologia'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'], ['COMERCIAL', 'Comercial'], ['LOGISTICA', 'Logística']];

const ARQUIVOS = ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_PonteCommand.js',
  'SGO_Alertas_Central.js', 'SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js',
  'SGO_Avisos.js', 'SGO_Avisos_Matriz.js'];

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG_10H };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', CELULAR: '62999990010', VINCULO_TRABALHO: 'CLT', AREA: 'DIRETORIA' },
      { ID: 'u_gt', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', CELULAR: '62999990011', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
      { ID: 'u_ga', USUARIO: 'ana', NOME: 'ANA GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'ana@exemplo.test', CELULAR: '62999990012', VINCULO_TRABALHO: 'PJ', AREA: 'ADMINISTRATIVO' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', CELULAR: '62999990013', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
      { ID: 'u_pj', USUARIO: 'paulo', NOME: 'PAULO PJ TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'paulo@exemplo.test', CELULAR: '62999990014', VINCULO_TRABALHO: 'PJ', AREA: 'TECNICA' },
      { ID: 'u_sem', USUARIO: 'sara', NOME: 'SARA SEM VINCULO TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'sara@exemplo.test', CELULAR: '62999990015', VINCULO_TRABALHO: '', AREA: 'COMERCIAL' },
      { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', CELULAR: '', VINCULO_TRABALHO: 'CLT', AREA: 'METROLOGIA' },
      { ID: 'u_gs', USUARIO: 'gael', NOME: 'GAEL GESTOR SEM AREA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gael@exemplo.test', CELULAR: '62999990016', VINCULO_TRABALHO: 'CLT', AREA: '' },
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' },
      { ID: 'u_ad2', USUARIO: 'adao', NOME: 'ADAO ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'adao@exemplo.test', CELULAR: '62999990017', VINCULO_TRABALHO: 'CLT', AREA: '' },
      { ID: 'u_rh', USUARIO: 'rita', NOME: 'RITA RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO', EMAIL: 'rita@exemplo.test', AREA: 'RH' },
      { ID: 'u_sai', USUARIO: 'saiu', NOME: 'PESSOA INATIVA TESTE', PERFIL: 'TECNICO', STATUS: 'INATIVO', AREA: 'TECNICA' }
    ],
    CAD_AREAS: AREAS.map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_CONDUTORES: [], CAD_TECNICOS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [],
    qual_ocorrencia: [], qual_missao: [], qual_sugestao: [], qual_plano_acao: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', PONTE_COMMAND_SEGREDO: 'segredo-da-ponte',
    GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'] } }) }, o.props || {});
  const cache = {}, emails = [], whats = [];
  const sessoes = {
    s_dir: { userId: 'u_dir', usuario: 'dora', nome: 'DORA DIRETORA TESTE', perfil: 'DIRETORIA' },
    s_gt: { userId: 'u_gt', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' },
    s_ga: { userId: 'u_ga', usuario: 'ana', nome: 'ANA GESTORA TESTE', perfil: 'GESTOR' },
    s_gs: { userId: 'u_gs', usuario: 'gael', nome: 'GAEL GESTOR SEM AREA TESTE', perfil: 'GESTOR' },
    s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO TESTE', perfil: 'TECNICO' },
    s_pj: { userId: 'u_pj', usuario: 'paulo', nome: 'PAULO PJ TESTE', perfil: 'TECNICO' },
    s_adm: { userId: 'u_ad2', usuario: 'adao', nome: 'ADAO ADMINISTRADOR TESTE', perfil: 'ADMIN' },
    s_rh: { userId: 'u_rh', usuario: 'rita', nome: 'RITA RH TESTE', perfil: 'RH' }
  };
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
    MailApp: { sendEmail: (m) => emails.push(Object.assign({ quando: relogio.agora }, m)), getRemainingDailyQuota: () => 100 },
    UrlFetchApp: { fetch: (url, op) => { whats.push({ url, quando: relogio.agora, corpo: JSON.parse(op.payload) }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + whats.length }] }) }; } },
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
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    CONDUTA_SHEETS: { OCORRENCIA: 'qual_ocorrencia', MISSAO: 'qual_missao', OCORRENCIA_TIPO: 'qual_ocorrencia_tipo' },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true,
    SGO_DocSalvar_pastaPersistente_: () => { throw new Error('Drive indisponível no teste'); }
  });
  for (const f of ARQUIVOS.concat(o.extras || [])) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  }
  vm.runInContext("var CNDQ_SHEETS = { SUGESTAO: 'qual_sugestao', PLANO: 'qual_plano_acao', ANALISE: 'qual_analise_causa' };", ctx);
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); };
  const linhas = (filtro) => tabelas.NTF_ENVIOS.filter((l) => Object.keys(filtro || {}).every((k) => l[k] === filtro[k]));
  return { ctx, tabelas, props, cache, emails, whats, relogio, mudar, linhas, sessoes };
}

/** Atividade aberta (prazo = previsão). */
function atividade(amb, id, resp, nome, prazo, extra) {
  amb.tabelas.ATV_ATIVIDADES.push(Object.assign({ ID: id, TITULO: 'Atividade de teste ' + id, RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: nome, CRIADO_POR_ID: 'u_dir', CRIADO_POR_NOME: 'DORA DIRETORA TESTE',
    PRAZO: prazo, PREVISAO_ATUAL: prazo, SITUACAO: 'A fazer', PRIORIDADE: 'Normal', ATRASO_AVISADO_PREV: prazo }, extra || {}));
}

module.exports = { ambiente, atividade, em, SEG_10H, pastaLegado };
