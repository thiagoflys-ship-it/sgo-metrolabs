// Ambiente de teste da Assistência técnica nativa (21/10/2026), feito a partir do ambiente do Compras: código real do SGO+
// num contexto isolado, tabelas em memória, relógio controlado, Drive em memória e envios simulados. Só dados de teste
// (nomes, CNPJs e contatos fictícios). O relógio começa numa segunda-feira às 10h (dia útil).
// A trava (LockService) imita a do servidor próprio: NÃO é reentrante. Pegar de novo dentro da mesma chamada é erro —
// o teste pega o aninhamento que no servidor esperaria por si mesmo até estourar o tempo.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
const SEG_10H = em('2026-10-19T10:00:00-03:00');

const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['COMERCIAL', 'Comercial'], ['FINANCEIRO', 'Financeiro'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'],
  ['METROLOGIA', 'Metrologia'], ['TECNICA', 'Técnica/Campo'], ['LOGISTICA', 'Logística']];

const ARQUIVOS = ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_Alertas_Central.js',
  'SGO_Avisos_Matriz.js', 'SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_QualifIA_Verificador.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js',
  'SGO_EnviarDoc.js', 'SGO_Compras_Config.js', 'SGO_Compras_Cotacoes.js', 'SGO_Compras_Financeiro.js', 'SGO_Compras_Fornecedores.js', 'SGO_Compras_Painel.js', 'SGO_Compras_Pedido.js',
  'SGO_Compras_Requisicoes.js', 'SGO_Pendencias_Compras.js', 'SGO_Qualidade_Auvo.js',
  'SGO_Assistencia_Agenda.js', 'SGO_Assistencia_App.js', 'SGO_Assistencia_Chamados.js', 'SGO_Assistencia_Config.js', 'SGO_Assistencia_Fonte.js', 'SGO_Assistencia_OS.js',
  'SGO_Assistencia_Painel.js', 'SGO_Assistencia_Relatorio.js', 'SGO_Pendencias_Assistencia.js'].filter((f) => fs.existsSync(path.join(pastaLegado, f)));

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
      { ID: 'u_gt', USUARIO: 'gil', NOME: 'GIL GESTOR TECNICO TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
      { ID: 'u_gc', USUARIO: 'gaspar', NOME: 'GASPAR GESTOR COMERCIAL TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gaspar@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
      { ID: 'u_tec2', USUARIO: 'tales', NOME: 'TALES TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tales@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
      { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', AREA: 'METROLOGIA' },
      { ID: 'u_ven', USUARIO: 'vera', NOME: 'VERA VENDEDORA TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', AREA: 'COMERCIAL' },
      { ID: 'u_cmp', USUARIO: 'carlos', NOME: 'CARLOS COMPRADOR TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'carlos@exemplo.test', AREA: 'LOGISTICA' },
      { ID: 'u_cli', USUARIO: 'cliente.alfa', NOME: 'CLIENTE ALFA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'cli@alfa.exemplo.test', CLIENTE_ID: 'c1' },
      { ID: 'u_cli2', USUARIO: 'cliente.beta', NOME: 'CLIENTE BETA TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'cli@beta.exemplo.test', CLIENTE_ID: 'c2' },
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' }
    ],
    CAD_AREAS: AREAS.map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [
      { ID: 'c1', RAZAO_SOCIAL: 'HOSPITAL TESTE ALFA LTDA', NOME_FANTASIA: 'Hospital Teste Alfa', CNPJ: '11.222.333/0001-81', ENDERECO: 'Rua de Teste, 100, Goiânia/GO', EMAIL: 'compras@alfa.exemplo.test', TELEFONE: '(62) 3333-0000', STATUS: 'ATIVO' },
      { ID: 'c2', RAZAO_SOCIAL: 'CLINICA TESTE BETA', NOME_FANTASIA: 'Clínica Teste Beta', CNPJ: '', ENDERECO: 'Avenida Exemplo, 50', EMAIL: '', TELEFONE: '', STATUS: 'ATIVO' }
    ],
    CAD_UNIDADES: [
      { ID: 'un1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Unidade Centro', ENDERECO: 'Rua de Teste, 100', CIDADE: 'Goiânia', UF: 'GO', RESPONSAVEL: 'Rui Responsável Teste', TELEFONE: '62988887777', EMAIL: 'rui@alfa.exemplo.test', STATUS: 'ATIVO', LATITUDE: -16.6869, LONGITUDE: -49.2648 },
      { ID: 'un2', CLIENTE_ID: 'c2', NOME_UNIDADE: 'Sede Beta', ENDERECO: 'Avenida Exemplo, 50', CIDADE: 'Anápolis', UF: 'GO', RESPONSAVEL: '', TELEFONE: '', EMAIL: '', STATUS: 'ATIVO' }
    ],
    CAD_EQUIPAMENTOS: [
      { ID: 'eq1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', MODELO: 'M1', SERIE: 'S-100', TAG: 'AC-01', SETOR: 'CME', STATUS: 'ATIVO' },
      { ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Lavadora', MODELO: 'L2', SERIE: 'S-200', TAG: 'LV-02', SETOR: 'CME', STATUS: 'ATIVO' },
      { ID: 'eq3', CLIENTE_ID: 'c2', UNIDADE_ID: 'un2', TIPO: 'Estufa', MODELO: 'E3', SERIE: 'S-300', TAG: 'ES-03', SETOR: 'Laboratório', STATUS: 'ATIVO' }
    ],
    CAD_VEICULOS: [], CAD_CONDUTORES: [], CAD_TECNICOS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [], DOC_ENVIOS: [], DOC_DOCUMENTOS: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'] } }) }, o.props || {});
  const cache = {}, emails = [], whats = [];
  const sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, clienteId: u.CLIENTE_ID || '' }; });
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
    return { getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getMimeType: () => a.mime, getBlob: () => objBlob(a.bytes, a.mime, a.nome), getSize: () => a.bytes.length,
      getDateCreated: () => new DataFalsa(), getParents: () => { let usado = false; return { hasNext: () => !usado, next: () => { usado = true; return objPasta(pastas[a.pasta]); } }; },
      setSharing(acc) { a.compartilhado = acc; return this; }, setDescription() { return this; } };
  }
  function objPasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id,
      createFile(blob) { const id = 'arquivo' + String(++seq).padStart(6, '0'); arquivos[id] = { id, nome: blob.getName(), mime: blob.getContentType(), bytes: Buffer.from(blob._bytes || blob.getBytes()), pasta: p.id }; p.arquivos.push(id); return objArquivo(arquivos[id]); },
      createFolder(nome) { const id = 'pasta' + (++seq); pastas[id] = { id, nome, arquivos: [], pai: p.id }; return objPasta(pastas[id]); },
      getFoldersByName(nome) { const l = Object.values(pastas).filter((x) => x.pai === p.id && x.nome === nome); let i = 0; return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) }; },
      getFiles() { const l = p.arquivos.slice(); let i = 0; return { hasNext: () => i < l.length, next: () => objArquivo(arquivos[l[i++]]) }; },
      getParents: () => { const pai = pastas[p.pai]; let usado = !pai; return { hasNext: () => !usado, next: () => { usado = true; return objPasta(pai); } }; },
      setDescription() { return this; }, setSharing() { return this; }
    };
  }
  const utilities = criarUtilities({
    computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
    newBlob: (bytes, mime, nome) => objBlob(Buffer.from(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Array.from(bytes || [], (b) => b & 255)), mime, nome),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
  });
  const gatilhos = [];
  const trava = { presa: false, aninhamentos: 0 };
  const lockService = {
    getScriptLock: () => ({
      waitLock() { if (trava.presa) { trava.aninhamentos++; throw new Error('TRAVA ANINHADA: a trava já está presa nesta chamada (no servidor próprio isto esperaria por si mesmo)'); } trava.presa = true; this._minha = true; },
      tryLock() { if (trava.presa) { trava.aninhamentos++; return false; } trava.presa = true; this._minha = true; return true; },
      hasLock() { return !!this._minha; },
      releaseLock() { if (this._minha) { trava.presa = false; this._minha = false; } }
    })
  };
  const ctx = vm.createContext({
    console: { log() {}, error() {}, warn() {}, info() {} }, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, isNaN, parseInt, encodeURIComponent, Buffer, Infinity,
    Utilities: utilities, Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    MimeType: { PDF: 'application/pdf', HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: lockService,
    ScriptApp: { getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g })), newTrigger: (fn) => ({ timeBased: () => ({ everyHours: () => ({ create() { gatilhos.push(fn); } }), everyMinutes: () => ({ create() { gatilhos.push(fn); } }) }) }), getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    DriveApp: { getFolderById: (id) => { if (!pastas[id]) throw new Error('pasta inexistente'); return objPasta(pastas[id]); }, getFileById: (id) => { if (!arquivos[id]) throw new Error('arquivo inexistente'); return objArquivo(arquivos[id]); }, getRootFolder: () => objPasta(pastas.raiz), Access: { PRIVATE: 'PRIVATE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { NONE: 'NONE', VIEW: 'VIEW' } },
    UrlFetchApp: { fetch: (url, op) => { whats.push({ url, corpo: JSON.parse((op && op.payload) || '{}') }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + whats.length }] }) }; } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getSheet: (n) => { if (!tabelas[n]) throw new Error('Aba não encontrada: ' + n); return {}; },
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d))); },
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS',
      CAD_VEICULOS: 'CAD_VEICULOS', NTF_ENVIOS: 'NTF_ENVIOS', AUVO_TAREFAS: 'AUVO_TAREFAS', AUVO_SYNC: 'AUVO_SYNC', AUVO_PENDENCIAS: 'AUVO_PENDENCIAS', DOC_DOCUMENTOS: 'DOC_DOCUMENTOS', CAD_PADROES: 'CAD_PADROES' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada.'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    SGO_ehGestaoRotina_: (p) => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].includes(String(p).toUpperCase()),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true
  });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  vm.runInContext("var CONDUTA_SHEETS = undefined; var CNDQ_SHEETS = undefined;", ctx);
  const api = (sid, acao, dados) => { const r = ctx.Assistencia_api(sid, acao, dados || {}); if (trava.presa) throw new Error('trava ficou presa depois de ' + acao); return r; };
  const app = (fn, sid, payload) => { const r = ctx[fn](sid, payload || {}); if (trava.presa) throw new Error('trava ficou presa depois de ' + fn); return r; };
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); if (ctx.SGO_Atendimentos_invalidar_) ctx.SGO_Atendimentos_invalidar_(); };
  const pend = (sid) => ctx.SGO_Pendencias_listar(sid, { semCache: true }).itens;
  return { ctx, tabelas, props, cache, emails, whats, relogio, api, app, mudar, pend, arquivos, pastas, sessoes, gatilhos, trava };
}

const ok = (r, assert) => { if (!r || r.ok !== true) throw new Error('esperava ok: ' + JSON.stringify(r && (r.message || r)).slice(0, 400)); return r; };
const FOTO = Buffer.alloc(900, 7).toString('base64');
const ASSINATURA = 'data:image/png;base64,' + Buffer.alloc(1200, 3).toString('base64');

/** Chamado aberto pelo gestor técnico para o equipamento eq1 (P2). */
function abrirChamado(amb, extra, sid) {
  const r = amb.api(sid || 's_gil', 'abrir', Object.assign({ clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', sintoma: 'Autoclave não completa o ciclo e apita no final', solicitante: 'Rui Responsável Teste',
    contato: '62988887777', prioridade: 'P2', parada: 'PARCIAL', canal: 'TELEFONE' }, extra || {}));
  return ok(r).chamado;
}
/** Triagem completa com a decisão de visita. */
function triarVisita(amb, chamadoId, tipo) {
  return ok(amb.api('s_gil', 'triagem', { id: chamadoId, checklist: { sintomas_confirmados: 'Confirmado por telefone com o responsável', risco_operar: 'Médio: não usar até o conserto',
    diagnostico_preliminar: 'Provável falha na resistência' }, tipoCodigo: tipo || 'MANUTENCAO_CORRETIVA', acao: 'PLANEJADO' })).chamado;
}
const PREPARO = { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: true, risco: 'Baixo' };
function agendar(amb, chamadoId, inicio, extra) {
  return amb.api('s_gil', 'agendar', Object.assign({ id: chamadoId, tecnicoId: 'u_tec', inicio: inicio || '2026-10-20T09:00', duracaoMin: 120, preparo: PREPARO }, extra || {}));
}
/** Chamado pronto para campo: aberto, triado e agendado (amanhã 9h). Devolve { chamado, os }. */
function chamadoAgendado(amb, extra) {
  const c = abrirChamado(amb, extra);
  triarVisita(amb, c.id, extra && extra.tipoCodigo);
  const a = ok(agendar(amb, c.id, extra && extra.inicio));
  return { chamado: a.chamado, os: a.os };
}

module.exports = { ambiente, em, SEG_10H, ok, FOTO, ASSINATURA, abrirChamado, triarVisita, agendar, chamadoAgendado, PREPARO };
