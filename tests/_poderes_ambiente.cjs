// Ambiente de teste do projeto "Acessos por caixas" (lote 0, 10/11/2026): o código real do SGO+ (as funções-base de
// permissão de cada módulo e o SGO_Poderes.js) num contexto isolado, com tabelas e propriedades em memória.
// As 23 contas e as configurações que dão poderes são as reais, levantadas em output/poderes-20261110
// (catalogo-fonte.cjs, cadastro-e-config.txt e gestoresPorArea.json); nenhuma senha, e-mail ou celular entra aqui.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');

const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');

// Funções-base de permissão de cada módulo (as mesmas que as travas de hoje chamam) e o módulo novo.
const ARQUIVOS = ['SGO_Config.js', 'SGO_Utilis.js', 'SGO_Auth.js', 'SGO_Chaves.js', 'SGO_Areas.js', 'SGO_Gestao_Decisoes.js',
  'SGO_Comercial_Config.js', 'SGO_Comercial_Contatos.js', 'SGO_Comercial_CatalogoOficial.js', 'SGO_Compras_Config.js', 'SGO_Compras_Faturas.js',
  'SGO_Assistencia_Config.js', 'SGO_Assistencia_OS.js', 'SGO_Assistencia_Ronda.js', 'SGO_Assistencia_Chamados.js',
  'SGO_Representacao.js', 'SGO_Representacao_Config.js', 'SGO_Representacao_Alertas.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_SegurancaAcesso.js',
  'SGO_CadastroQualidade.js', 'SGO_QualifEmissao.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes_Pareceres.js', 'SGO_Automacao_Predial.js',
  'SGO_Ponto_Config.js', 'SGO_Frota_Reservas.js', 'SGO_AuvoAcervo.js', 'SGO_BaixaTemp_Config.js', 'SGO_Documento_LogoCompartilhado.js', 'SGO_AutoRel_Config.js', 'SGO_Avisos_Gestao.js',
  'SGO_Ajuda.js', 'SGO_Ajuda_Administracao.js', 'SGO_Poderes.js'];

/** Contas reais (id, login, perfil, área, vínculo) do levantamento de 10/11/2026. */
function contasReais() {
  const { USUARIOS } = require(path.join(pastaPoderes, 'ferramentas-catalogo/catalogo-fonte.cjs'));
  return USUARIOS.map((u) => Object.assign({}, u));
}
/** Linhas CONFIG|ABA|CHAVE|VALOR_JSON do cadastro-e-config.txt (a última de cada chave vale). */
function configsReais() {
  const txt = fs.readFileSync(path.join(pastaPoderes, 'cadastro-e-config.txt'), 'utf8');
  const out = {};
  txt.split(/\r?\n/).forEach((l) => {
    if (!l.startsWith('CONFIG|')) return;
    const p1 = l.indexOf('|', 7), p2 = l.indexOf('|', p1 + 1);
    if (p1 < 0 || p2 < 0) return;
    const aba = l.slice(7, p1), chave = l.slice(p1 + 1, p2), valor = l.slice(p2 + 1);
    if (chave === 'CHAVE') return;
    try { JSON.parse(valor); } catch (e) { return; }
    (out[aba] = out[aba] || {})[chave] = valor;
  });
  return out;
}
function gestoresPorAreaReal() { return JSON.parse(fs.readFileSync(path.join(pastaPoderes, 'gestoresPorArea.json'), 'utf8')); }

/**
 * o.contas: [{ id, login, perfil, area, vinculo }] (padrão: as 23 reais); o.gestoresPorArea (padrão: o real);
 * o.semArquivos: lista de arquivos a não carregar (para simular função-base ausente).
 */
function ambiente(opcoes) {
  const o = opcoes || {};
  const contas = o.contas || contasReais();
  const cfgs = configsReais();
  let seq = 0;
  const tabelas = {
    CAD_USUARIOS: contas.map((u) => ({ ID: u.id, USUARIO: u.login, NOME: (u.nome || u.login).toUpperCase(), PERFIL: u.perfil, STATUS: u.status || 'ATIVO', AREA: u.area || '',
      VINCULO_TRABALHO: u.vinculo || '', EMAIL: u.login.replace(/\W/g, '') + '@exemplo.test', CLIENTE_ID: u.perfil === 'CLIENTE' ? 'cli-' + u.login : '', EXCLUIDO_EM: u.excluidoEm || '' })),
    CAD_AREAS: [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['COMERCIAL', 'Comercial'], ['FINANCEIRO', 'Financeiro'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'],
      ['METROLOGIA', 'Metrologia'], ['TECNICA', 'Técnica/Campo'], ['LOGISTICA', 'Logística']].map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    ATEC_CONFIG: Object.keys(cfgs.ATEC_CONFIG || {}).map((k, i) => ({ ID: 'atec' + i, CHAVE: k, VALOR_JSON: cfgs.ATEC_CONFIG[k], VERSAO: 1 })),
    CMP_CONFIG: Object.keys(cfgs.CMP_CONFIG || {}).map((k, i) => ({ ID: 'cmp' + i, CHAVE: k, VALOR_JSON: cfgs.CMP_CONFIG[k], VERSAO: 1 })),
    COM_CONFIG: Object.keys(cfgs.COM_CONFIG || {}).map((k, i) => ({ ID: 'com' + i, CHAVE: k, VALOR_JSON: cfgs.COM_CONFIG[k], VERSAO: 1 })),
    AUT_DISPOSITIVOS: [], AUT_PERMISSOES: [], REP_REPRESENTADAS: []
  };
  if (o.tabelas) Object.assign(tabelas, o.tabelas);
  const props = { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: o.gestoresPorArea || gestoresPorAreaReal() }) };
  if (o.props) Object.assign(props, o.props);
  const cache = {};
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  const trava = { presa: false };
  const copia = (r) => Object.assign({}, r);
  const ctxBase = () => ({
    console: { log() {}, error() {}, warn() {}, info() {} }, JSON, Math, Object, Array, String, Number, RegExp, Error, Date, isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Infinity,
    Utilities: criarUtilities({ computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() { if (trava.presa) throw new Error('TRAVA ANINHADA'); trava.presa = true; this._m = true; }, tryLock() { if (trava.presa) return false; trava.presa = true; this._m = true; return true; }, hasLock() { return !!this._m; }, releaseLock() { if (this._m) { trava.presa = false; this._m = false; } } }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }), getProjectTriggers: () => [] },
    MailApp: { sendEmail() {}, getRemainingDailyQuota: () => 100 },
    UrlFetchApp: { fetch: () => { throw new Error('rede desligada no teste'); } },
    HtmlService: { createHtmlOutputFromFile: () => ({ getContent: () => '' }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => null }) },
    CertCal_garantirTabela_: (t, cols) => { if (!tabelas[t]) { tabelas[t] = []; tabelas[t]._cols = cols.slice(); } },
    CertCal_garantirColuna_: () => {}, CertCal_forcarColunaTexto_: () => {}
  });
  const sgoData = {
    _headersCache: {}, _headerMapCache: {},
    getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
    getSheet: (n) => { if (!tabelas[n]) throw new Error('Aba não encontrada: ' + n); return {}; },
    getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map(copia); },
    getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? copia(r) : null; },
    update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
    insert: (t, d) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); const r = Object.assign({ ID: 'id' + (++seq) }, d); tabelas[t].push(r); return copia(r); },
    insertMany: (t, l) => { l.forEach((d) => tabelas[t].push(Object.assign({ ID: 'id' + (++seq) }, d))); },
    remove: (t, id) => { const l = tabelas[t] || [], i = l.findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; l.splice(i, 1); return true; },
    normalizarObjetoParaSheet: (t, x) => copia(x || {}), log() {}
  };
  // carga na ordem do servidor: alfabética não importa aqui; quem falha por depender de outro vai para o fim
  const arquivos = ARQUIVOS.filter((f) => !(o.semArquivos || []).includes(f));
  const fonte = {};
  arquivos.forEach((f) => { fonte[f] = fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'); });
  let ordem = arquivos.slice(), ctx = null;
  for (let volta = 0; volta < 40; volta++) {
    ctx = vm.createContext(ctxBase());
    ctx.SGO_DATA = sgoData;
    let falhou = null;
    for (let i = 0; i < ordem.length; i++) {
      try { vm.runInContext(fonte[ordem[i]], ctx, { filename: ordem[i] }); }
      catch (e) { if (e && e.name === 'ReferenceError' && i < ordem.length - 1) { falhou = i; break; } throw new Error('falha ao carregar ' + ordem[i] + ': ' + e.message); }
    }
    if (falhou === null) break;
    ordem = ordem.slice(0, falhou).concat(ordem.slice(falhou + 1), [ordem[falhou]]);
  }
  // o SGO_DATA real (SGO_Data.js) não é carregado: o de memória vale; sessão de teste por login
  vm.runInContext('SGO_DATA_REP_VISIVEL = false;', ctx);
  ctx.SGO_DATA = sgoData;
  ctx.exigirSessao = (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada.'); return Object.assign({}, sessoes[sid]); };
  ctx.validarSessao = (sid) => (sessoes[sid] ? { valid: true, data: Object.assign({}, sessoes[sid]) } : { valid: false, message: 'Sessão inválida ou expirada.' });
  const api = (login, acao, dados) => { const r = ctx.Poderes_api('s_' + login, acao, dados || {}); if (trava.presa) throw new Error('trava ficou presa depois de ' + acao); return r; };
  const idDe = (login) => (tabelas.CAD_USUARIOS.find((u) => u.USUARIO === login) || {}).ID;
  const limparMemo = () => { vm.runInContext('Poderes_memoLimpar_(); AST_MEMO = {}; AST_REGRAS_MEMO = null; CMP_REGRAS_MEMO = null;', ctx); Object.keys(cache).forEach((k) => delete cache[k]); };
  return { ctx, tabelas, props, cache, sessoes, api, idDe, limparMemo, contas, trava };
}

module.exports = { ambiente, contasReais, configsReais, gestoresPorAreaReal };
