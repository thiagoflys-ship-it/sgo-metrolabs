// Ambiente de teste do Comercial nativo (21/10/2026): código real do SGO+ num contexto isolado, tabelas em memória,
// relógio controlado, Drive em memória, IA simulada (ou desligada) e envios simulados. Só dados de teste (nomes,
// CNPJs e contatos fictícios).
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
const SEG_10H = em('2026-10-19T10:00:00-03:00'); // segunda-feira, dia útil

const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['COMERCIAL', 'Comercial'], ['FINANCEIRO', 'Financeiro'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'],
  ['METROLOGIA', 'Metrologia'], ['TECNICA', 'Técnica/Campo'], ['LOGISTICA', 'Logística']];

const ARQUIVOS = ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_Alertas_Central.js',
  'SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_QualifIA_Verificador.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js', 'SGO_EnviarDoc.js',
  'SGO_Comercial_Config.js', 'SGO_Comercial_Contatos.js', 'SGO_Comercial_Oportunidades.js', 'SGO_Comercial_Propostas.js', 'SGO_Comercial_Documento.js', 'SGO_Comercial_Gestora.js', 'SGO_Comercial_Painel.js', 'SGO_Comercial_Quadro.js', 'SGO_Comercial_Precificacao.js'];

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG_10H };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'DIRETORIA' },
      { ID: 'u_gc', USUARIO: 'gaspar', NOME: 'GASPAR GESTOR COMERCIAL TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gaspar@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' },
      { ID: 'u_ven', USUARIO: 'vera', NOME: 'VERA VENDEDORA TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' },
      { ID: 'u_ven2', USUARIO: 'vito', NOME: 'VITO VENDEDOR TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vito@exemplo.test', VINCULO_TRABALHO: 'PJ', AREA: 'COMERCIAL' },
      { ID: 'u_gt', USUARIO: 'gil', NOME: 'GIL GESTOR TECNICO TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', AREA: 'TECNICA' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', AREA: 'TECNICA' },
      { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', AREA: 'METROLOGIA' },
      { ID: 'u_fin', USUARIO: 'fabio', NOME: 'FABIO FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', AREA: 'FINANCEIRO' },
      { ID: 'u_log', USUARIO: 'lia', NOME: 'LIA LOGISTICA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'lia@exemplo.test', AREA: 'LOGISTICA' },
      { ID: 'u_rh', USUARIO: 'rita', NOME: 'RITA RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO', EMAIL: 'rita@exemplo.test', AREA: 'RH' },
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' }
    ],
    CAD_AREAS: AREAS.map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [
      { ID: 'c1', RAZAO_SOCIAL: 'HOSPITAL TESTE ALFA LTDA', NOME_FANTASIA: 'Hospital Teste Alfa', CNPJ: '11.222.333/0001-81', ENDERECO: 'Rua de Teste, 100, Goiânia/GO', CONTATO: 'Carla Compras Teste', EMAIL: 'compras@alfa.exemplo.test', TELEFONE: '(62) 3333-0000', STATUS: 'ATIVO' },
      { ID: 'c2', RAZAO_SOCIAL: 'CLINICA TESTE BETA', NOME_FANTASIA: 'Clínica Teste Beta', CNPJ: '', ENDERECO: '', CONTATO: '', EMAIL: '', TELEFONE: '', STATUS: 'ATIVO' }
    ],
    CAD_UNIDADES: [
      { ID: 'un1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Centro', CNPJ_UNIDADE: '', ENDERECO: 'Rua de Teste, 100', CIDADE: 'Goiânia', UF: 'GO', RESPONSAVEL: 'Rui Responsável Teste', TELEFONE: '62988887777', EMAIL: 'rui@alfa.exemplo.test', STATUS: 'ATIVO' }
    ],
    CAD_EQUIPAMENTOS: [
      { ID: 'eq1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', FABRICANTE: 'FABRICANTE X', MODELO: 'M1', SERIE: 'S1', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO' },
      { ID: 'eq9', CLIENTE_ID: 'c2', UNIDADE_ID: '', TIPO: 'Lavadora', TAG: 'LV-09', SETOR: 'CME', STATUS: 'ATIVO' }
    ],
    CAD_CONDUTORES: [], CAD_TECNICOS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [], DOC_ENVIOS: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: {} }) }, o.props || {});
  const cache = {}, emails = [], whats = [], iaPrompts = [];
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  // Drive em memória
  const arquivos = {}, pastas = { raiz: { id: 'raiz', nome: 'raiz', arquivos: [] } };
  function objBlob(bytes, mime, nome) {
    let n = nome, b = bytes, m = mime;
    return {
      getBytes: () => Array.from(b), getDataAsString: () => Buffer.from(b).toString('utf8'), getContentType: () => m, getName: () => n,
      setName(x) { n = x; return this; }, setContentType(x) { m = x; return this; }, setDataFromString(t) { b = Buffer.from(String(t), 'utf8'); return this; },
      getAs: (tipo) => objBlob(Buffer.from('%PDF-1.4 teste ' + Buffer.from(b).toString('utf8').length), tipo, String(n).replace(/\.html?$/i, '.pdf')),
      get _bytes() { return b; }
    };
  }
  function objArquivo(a) {
    return { getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getMimeType: () => a.mime, getBlob: () => objBlob(a.bytes, a.mime, a.nome),
      getParents: () => { let usado = false; return { hasNext: () => !usado, next: () => { usado = true; return objPasta(pastas[a.pasta]); } }; }, setSharing() { return this; }, setDescription() { return this; } };
  }
  function objPasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id,
      createFile(blob) { const id = 'arq' + (++seq); arquivos[id] = { id, nome: blob.getName(), mime: blob.getContentType(), bytes: Buffer.from(blob._bytes || blob.getBytes()), pasta: p.id }; p.arquivos.push(id); return objArquivo(arquivos[id]); },
      createFolder(nome) { const id = 'pasta' + (++seq); pastas[id] = { id, nome, arquivos: [], pai: p.id }; return objPasta(pastas[id]); },
      getFoldersByName(nome) { const l = Object.values(pastas).filter((x) => x.pai === p.id && x.nome === nome); let i = 0; return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) }; },
      getParents: () => { const pai = pastas[p.pai]; let usado = !pai; return { hasNext: () => !usado, next: () => { usado = true; return objPasta(pai); } }; },
      setDescription() { return this; }
    };
  }
  const iaResposta = o.ia || null; // função (prompt) => texto, ou null = sem chave
  if (iaResposta) props.GEMINI_API_KEY = 'chave-de-teste';
  const utilities = criarUtilities({
    computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
    newBlob: (bytes, mime, nome) => objBlob(Buffer.from(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Array.from(bytes || [], (b) => b & 255)), mime, nome),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent, Buffer,
    Utilities: utilities, Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    MimeType: { PDF: 'application/pdf', HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }), everyMinutes: () => ({ create() {} }) }) }), getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    DriveApp: { getFolderById: (id) => { if (!pastas[id]) throw new Error('pasta inexistente'); return objPasta(pastas[id]); }, getFileById: (id) => { if (!arquivos[id]) throw new Error('arquivo inexistente'); return objArquivo(arquivos[id]); }, getRootFolder: () => objPasta(pastas.raiz), Access: {}, Permission: {} },
    UrlFetchApp: {
      fetch: (url, op) => {
        if (/generativelanguage/.test(url)) {
          const corpo = JSON.parse(op.payload); const prompt = corpo.contents[0].parts[0].text; iaPrompts.push(prompt);
          const texto = iaResposta ? iaResposta(prompt) : '';
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) };
        }
        whats.push({ url, corpo: JSON.parse(op.payload || '{}') });
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
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true
  });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  vm.runInContext("var CONDUTA_SHEETS = undefined; var CNDQ_SHEETS = undefined;", ctx);
  const api = (sid, acao, dados) => ctx.Comercial_api(sid, acao, dados || {});
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); };
  return { ctx, tabelas, props, cache, emails, whats, iaPrompts, relogio, api, mudar, arquivos, pastas, sessoes };
}

/** Cria um contato e uma oportunidade de teste para a vendedora (devolve { contato, oportunidade }). */
function oportunidadeDeTeste(amb, sid, extra) {
  const ct = amb.api(sid || 's_vera', 'salvarContato', { clienteId: 'c1', unidadeId: 'un1', nome: 'Ana Enfermeira Teste', cargo: 'Coordenadora da CME', papel: 'USA', email: 'ana@alfa.exemplo.test' });
  if (!ct.ok) throw new Error(ct.message);
  const r = amb.api(sid || 's_vera', 'salvarOportunidade', Object.assign({ titulo: 'Qualificação térmica da autoclave AC-01', clienteId: 'c1', unidadeId: 'un1', contatoId: ct.contato.id, equipamentos: ['eq1'],
    funil: 'ENGENHARIA', etapa: 'ENG_1', origem: 'Indicação', valor: '4.500,00', proxima: { acao: 'Ligar para entender o escopo', data: '2026-10-20', hora: '10:00', tipo: 'LIGACAO' } }, extra || {}));
  if (!r.ok) throw new Error(r.message);
  return { contato: ct.contato, oportunidade: r.oportunidade };
}

/** 29/10/2026: proposta de teste sem viagem e sem frete (o checklist de custos da precificação exige a resposta). */
const SEM_VIAGEM = { viagem: { ha: 'NAO', motivoSem: 'Teste: serviço executado no laboratório da Metrolabs' }, frete: { nsa: true, motivo: 'Teste: cliente retira na Metrolabs' } };

module.exports = { ambiente, oportunidadeDeTeste, em, SEG_10H, SEM_VIAGEM };
