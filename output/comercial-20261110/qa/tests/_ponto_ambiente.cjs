// Ambiente de teste do Assistente do ponto nativo (21/10/2026): código real do SGO+ num contexto isolado, tabelas em
// memória, relógio controlado (nunca a hora real), WhatsApp da Meta e e-mail simulados. Só dados fictícios.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
// segunda-feira 19/10/2026, dia útil; sexta 23/10; sábado 24/10; feriado 02/11 (segunda)
const SEG = (hhmm) => em('2026-10-19T' + hhmm + ':00-03:00');

const ARQUIVOS = ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_WhatsappPiloto.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js',
  'SGO_Alertas_Central.js', 'SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Gestao_Decisoes.js', 'SGO_Conduta_Qualidade.js',
  'SGO_Ponto_Config.js', 'SGO_Ponto_Rodada.js', 'SGO_Ponto_Api.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Ponto.js'];

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG('07:00') };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const U = (id, login, nome, perfil, extra) => Object.assign({ ID: id, USUARIO: login, NOME: nome, PERFIL: perfil, STATUS: 'ATIVO', EMAIL: login + '@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA', CELULAR: '' }, extra || {});
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      U('u_adm', 'admin', 'Administrador', 'ADMIN', { AREA: '', EMAIL: '' }),
      U('u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA', { AREA: 'DIRETORIA', CELULAR: '62990000001' }),
      U('u_rh', 'rita', 'RITA RH TESTE', 'RH', { AREA: 'RH', CELULAR: '62990000002' }),
      U('u_gt', 'gil', 'GIL GESTOR TECNICO TESTE', 'GESTOR', { AREA: 'TECNICA', CELULAR: '62990000003' }),
      U('u_ana', 'ana', 'ANA TECNICA TESTE', 'TECNICO', { CELULAR: '62990000010' }),
      U('u_beto', 'beto', 'BETO TECNICO TESTE', 'TECNICO', { CELULAR: '62990000011' }),
      U('u_caio', 'caio', 'CAIO PJ TESTE', 'TECNICO', { CELULAR: '62990000012', VINCULO_TRABALHO: 'PJ' }),
      U('u_duda', 'duda', 'DUDA SEM VINCULO TESTE', 'TECNICO', { CELULAR: '62990000013', VINCULO_TRABALHO: '' }),
      U('u_eva', 'eva', 'EVA FORA DO PILOTO TESTE', 'TECNICO', { CELULAR: '62990000014' }),
      U('u_fabio', 'fabio', 'FABIO COMERCIAL TESTE', 'COMERCIAL', { AREA: 'COMERCIAL', CELULAR: '62990000015' })
    ],
    CAD_AREAS: [['DIRETORIA', 'Diretoria'], ['RH', 'RH'], ['TECNICA', 'Técnica/Campo'], ['COMERCIAL', 'Comercial']].map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_CONDUTORES: [], CAD_TECNICOS: [], AUVO_TAREFAS: [], conduta_ausencia: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: []
  }, o.tabelas || {});
  let seq = 0;
  // piloto ligado com todos os de teste menos a Eva; WhatsApp oficial configurado; modelos do ponto aprovados (salvo o teste dizer outra coisa)
  const props = Object.assign({
    WA_PILOTO: JSON.stringify({ v: 1, ligado: true, usuarios: ['u_dir', 'u_rh', 'u_gt', 'u_ana', 'u_beto', 'u_caio', 'u_duda', 'u_fabio'], areas: [], telefones: [] }),
    META_WA_TOKEN: 'TOKEN-DE-TESTE', META_WA_PHONE_ID: '100200300', WHATSAPP_PROVEDOR: 'meta',
    NTF_MODELOS_SITUACAO: JSON.stringify({ em: '2026-10-19T06:00:00', modelos: { sgo_ponto_entrada: 'APPROVED', sgo_ponto_almoco: 'APPROVED', sgo_ponto_retorno: 'APPROVED', sgo_ponto_saida: 'APPROVED', sgo_aviso_geral: 'APPROVED' } }),
    GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: {} }),
    SGO_EXPEDIENTE: JSON.stringify({ ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '' })
  }, o.props || {});
  if (o.ligado !== false) props.PONTO_CONFIG = JSON.stringify(Object.assign({ ligado: true }, o.cfg || {}));
  const cache = {}, emails = [], whats = [], gatilhos = [];
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  const utilities = criarUtilities({
    computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    newBlob: (bytes, mime, nome) => { let b = Buffer.from(String(bytes || '')), n = nome, m = mime; return { setDataFromString(t) { b = Buffer.from(String(t)); return this; }, setContentType(x) { m = x; return this; }, setName(x) { n = x; return this; }, getName: () => n, getBytes: () => Array.from(b), _bytes: b, getAs: () => ({ setName() { return this; }, getName: () => 'x.pdf', _bytes: Buffer.from('%PDF'), getBytes: () => [] }) }; },
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
  });
  const templates = [];
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, isNaN, parseInt, encodeURIComponent, Buffer,
    Utilities: utilities, Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    MimeType: { PDF: 'application/pdf', HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => gatilhos.map((f) => ({ getHandlerFunction: () => f })),
      newTrigger: (f) => { const c = { create() { gatilhos.push(f); } }; ['everyHours', 'everyMinutes', 'everyDays', 'atHour', 'nearMinute', 'inTimezone', 'onWeekDay'].forEach((k) => { c[k] = () => c; }); return { timeBased: () => c }; },
      getService: () => ({ getUrl: () => 'https://sgo.metrolabs.com.br' }) },
    MailApp: { sendEmail: (m) => emails.push(Object.assign({ quando: relogio.agora }, m)), getRemainingDailyQuota: () => 100 },
    HtmlService: {
      createTemplateFromFile: (nome) => { const t = { nome, evaluate() { templates.push({ nome, token: t.token }); const saida = { setTitle() { return saida; }, addMetaTag() { return saida; }, setXFrameOptionsMode() { return saida; }, _token: t.token, _nome: nome }; return saida; } }; return t; },
      XFrameOptionsMode: { DEFAULT: 'DEFAULT', ALLOWALL: 'ALLOWALL' }
    },
    UrlFetchApp: {
      fetch: (url, op) => {
        whats.push({ url, corpo: JSON.parse(op.payload || '{}'), quando: relogio.agora });
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + whats.length }] }) };
      }
    },
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
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS', AUVO_TAREFAS: 'AUVO_TAREFAS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true,
    // Programa de conduta: só o necessário para a sugestão (o resto do módulo não entra neste teste)
    CONDUTA_SHEETS: { AUSENCIA: 'conduta_ausencia', OCORRENCIA: 'conduta_ocorrencia' },
    Conduta_setup_() { tabelas.qual_sugestao = tabelas.qual_sugestao || []; },
    Conduta_hojeISO_: () => new DataFalsa().toISOString().slice(0, 10),
    Conduta_competenciaDe_: (d) => String(d).slice(0, 7),
    Conduta_nomeCompetencia_: (m) => m
  });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  const api = (sid, acao, dados) => ctx.Ponto_api(sid, acao, dados || {});
  const mudar = (ms) => { relogio.agora = typeof ms === 'number' ? ms : em(ms); Object.keys(cache).forEach((k) => { if (!/^PONTO_PREVIA_/.test(k)) delete cache[k]; }); };
  const rodar = (ms) => { if (ms !== undefined) mudar(ms); delete props.PONTO_RODANDO; return ctx.Ponto_rodada_(new DataFalsa()); };
  const fone = (uid) => '55' + tabelas.CAD_USUARIOS.find((u) => u.ID === uid).CELULAR;
  const msgs = (uid) => whats.filter((w) => /\/messages$/.test(w.url) && (!uid || w.corpo.to === fone(uid)));
  const marc = (uid, dia, m) => (tabelas.PONTO_MARCACOES || []).find((r) => r.USUARIO_ID === uid && r.DIA === dia && r.MARCACAO === m) || null;
  const tokenDe = (w) => w.corpo.template.components[1].parameters[0].text;
  return { ctx, tabelas, props, cache, emails, whats, gatilhos, templates, relogio, api, mudar, rodar, msgs, marc, tokenDe, sessoes, fone, DataFalsa };
}

module.exports = { ambiente, em, SEG };
