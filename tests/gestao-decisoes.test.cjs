// Caixa de decisões da gestão, escada de cobrança, avaliação do gestor e automações (20/10/2026).
// Código real do SGO+ num contexto isolado, com tabelas em memória, relógio controlado e envios simulados.
// Só dados de teste (nomes e contatos fictícios).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const em = (iso) => Date.parse(iso);
const SEG_10H = em('2026-10-19T10:00:00-03:00'); // segunda-feira, dia útil

const AREAS = [['DIRETORIA', 'Diretoria'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICA', 'Técnica/Campo'], ['METROLOGIA', 'Metrologia'], ['RH', 'RH'], ['QUALIDADE', 'Qualidade'], ['COMERCIAL', 'Comercial']];

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
      { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', CELULAR: '', VINCULO_TRABALHO: 'CLT', AREA: 'METROLOGIA' },
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' },
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
    s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO TESTE', perfil: 'TECNICO' },
    s_adm: { userId: 'u_adm', usuario: 'admin', nome: 'Administrador', perfil: 'ADMIN' },
    s_rh: { userId: 'u_rh', usuario: 'rita', nome: 'RITA RH TESTE', perfil: 'RH' },
    s_gq: { userId: 'u_gq', usuario: 'quintino', nome: 'QUINTINO QUALIDADE TESTE', perfil: 'GESTOR' }
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
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    CONDUTA_SHEETS: { OCORRENCIA: 'qual_ocorrencia', MISSAO: 'qual_missao', OCORRENCIA_TIPO: 'qual_ocorrencia_tipo' },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    isAdminSession: (sid) => !!sessoes[sid] && ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid].perfil),
    Chaves_ehDonoUsuario_: () => false,
    SGO_execucaoInterna_: () => true,
    SGO_DocSalvar_pastaPersistente_: () => { throw new Error('Drive indisponível no teste'); }
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Areas.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_PonteCommand.js', 'SGO_Alertas_Central.js',
    'SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Gestao_Decisoes.js', 'SGO_Gestao_Escada.js', 'SGO_Gestao_Avaliacao.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
  }
  // CNDQ_SHEETS só existe com o Programa de conduta carregado; aqui basta o nome das abas
  vm.runInContext("var CNDQ_SHEETS = { SUGESTAO: 'qual_sugestao', PLANO: 'qual_plano_acao', ANALISE: 'qual_analise_causa' };", ctx);
  const ponte = (acao, dados) => {
    const ts = relogio.agora;
    const ass = crypto.createHmac('sha256', props.PONTE_COMMAND_SEGREDO).update(String(ts) + '|' + acao + '|' + JSON.stringify(dados || {}), 'utf8').digest('hex');
    return ctx.PonteCmd_tratar_({ acao, dados, ts, usuario: 'login-command', assinatura: ass });
  };
  const mudar = (iso) => { relogio.agora = em(iso); Object.keys(cache).forEach((k) => delete cache[k]); };
  return { ctx, tabelas, props, cache, emails, whats, relogio, ponte, mudar };
}

/** Atividade aberta com previsão já vencida (prazo na data informada). */
function atividadeAtrasada(amb, id, resp, nome, prazo, criadoPor) {
  amb.tabelas.ATV_ATIVIDADES.push({ ID: id, TITULO: 'Atividade de teste ' + id, RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: nome, CRIADO_POR_ID: criadoPor || 'u_dir', CRIADO_POR_NOME: 'DORA DIRETORA TESTE',
    PRAZO: prazo, PREVISAO_ATUAL: prazo, SITUACAO: 'A fazer', PRIORIDADE: 'Normal', ATRASO_AVISADO_PREV: prazo });
}

function caixaDe(amb, sid, filtro) {
  const r = amb.ctx.Gestao_apiCaixa(sid, { filtro: filtro || 'minhas' });
  assert.equal(r.ok, true, r.message);
  return r;
}

// ------------------------------------------------------------------ quem recebe
test('quem recebe: gestor da área da pessoa; ninguém decide sobre si; área sem gestor e conduta de gestor vão para a Diretoria', () => {
  const amb = ambiente();
  atividadeAtrasada(amb, 'a_tec', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  atividadeAtrasada(amb, 'a_gil', 'u_gt', 'GIL GESTOR TESTE', '2026-10-16T18:00');
  atividadeAtrasada(amb, 'a_met', 'u_met', 'MARA METROLOGIA TESTE', '2026-10-16T18:00');
  amb.tabelas.qual_ocorrencia.push({ ID: 'oc1', TIPO_CODIGO: 'TEC-01', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_gt', STATUS: 'REGISTRADA', DATA_FATO: '2026-10-16', PRAZO_HOMOLOGACAO: '2026-10-21', CRIADO_EM: '2026-10-19T09:00:00-03:00' });
  amb.tabelas.qual_ocorrencia.push({ ID: 'oc2', TIPO_CODIGO: 'ADM-01', COLABORADOR_ID: 'u_ga', FISCAL_ID: 'u_tec', STATUS: 'REGISTRADA', DATA_FATO: '2026-10-16', PRAZO_HOMOLOGACAO: '2026-10-21' });
  const gil = caixaDe(amb, 's_gt'), dir = caixaDe(amb, 's_dir'), ana = caixaDe(amb, 's_ga');
  const ids = (c) => c.itens.map((i) => i.id).sort();
  assert.deepEqual(ids(gil), ['ATV:a_tec'], 'Gil recebe só a atividade do técnico da área dele');
  assert.deepEqual(ids(ana), [], 'Ana não tem nada da área Administrativa');
  assert.deepEqual(ids(dir), ['ATV:a_gil', 'ATV:a_met', 'CONDUTA:OC:oc1', 'CONDUTA:OC:oc2'].sort(), 'Diretoria: a do próprio gestor, área sem gestor, ocorrência em que o gestor é o fiscal e ocorrência de gestor');
  const met = dir.itens.find((i) => i.id === 'ATV:a_met');
  assert.equal(met.reserva, true);
  assert.match(met.motivoRota, /Metrologia não tem gestor responsável/);
  assert.match(dir.itens.find((i) => i.id === 'CONDUTA:OC:oc2').motivoRota, /Envolve alguém da gestão/);
  // toda a gestão vê a lista inteira (só leitura do que é de outro); técnico e RH não abrem.
  // 28/10/2026 (sigilo do envolvido): as 2 ocorrências só a Diretoria e o Gestor de Qualidade veem, nem em "todas".
  assert.equal(caixaDe(amb, 's_ga', 'todas').itens.length, 3);
  assert.equal(caixaDe(amb, 's_dir', 'todas').itens.length, 5);
  assert.ok(!amb.ctx.SGO_Pendencias_listar('s_ga', { semCache: true }).itens.some((i) => i.tipo === 'conduta_homologar'), 'gestora de outra área não vê no Início');
  assert.match(amb.ctx.Gestao_apiCaixa('s_tec', {}).message, /Caixa de decisões é da gestão/);
  assert.equal(amb.ctx.Gestao_apiCaixa('s_rh', {}).ok, false);
  // o item novo também aparece no Início da gestão (central de pendências), não no do técnico
  const inicioDir = amb.ctx.SGO_Pendencias_listar('s_dir', { semCache: true });
  assert.ok(inicioDir.itens.some((i) => i.tipo === 'conduta_homologar'));
  const inicioTec = amb.ctx.SGO_Pendencias_listar('s_tec', { semCache: true });
  assert.ok(!inicioTec.itens.some((i) => i.tipo === 'conduta_homologar'));
});

test('sigilo do envolvido (28/10/2026): ocorrência vai para o Gestor de Qualidade, não para o gestor da área; fiscal Qualidade cai na Diretoria', () => {
  const amb = ambiente();
  amb.tabelas.CAD_USUARIOS.push({ ID: 'u_gq', USUARIO: 'quintino', NOME: 'QUINTINO QUALIDADE TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'q@exemplo.test', AREA: 'QUALIDADE' });
  amb.tabelas.qual_ocorrencia.push({ ID: 'oc1', TIPO_CODIGO: 'TEC-01', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_met', STATUS: 'REGISTRADA', DATA_FATO: '2026-10-16', PRAZO_HOMOLOGACAO: '2026-10-21' });
  amb.tabelas.qual_ocorrencia.push({ ID: 'oc2', TIPO_CODIGO: 'TEC-01', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_gq', STATUS: 'REGISTRADA', DATA_FATO: '2026-10-16', PRAZO_HOMOLOGACAO: '2026-10-21' });
  const caixaQ = amb.ctx.Gestao_apiCaixa('s_gq', { filtro: 'minhas' });
  assert.equal(caixaQ.ok, true, caixaQ.message);
  assert.deepEqual(caixaQ.itens.map((i) => i.id), ['CONDUTA:OC:oc1'], 'Qualidade recebe a ocorrência; a que ele registrou não');
  const gil = amb.ctx.Gestao_apiCaixa('s_gt', { filtro: 'todas' });
  assert.ok(!gil.itens.some((i) => /^CONDUTA:OC:/.test(i.id)), 'o gestor da área do técnico não vê nem em todas');
  const dir = amb.ctx.Gestao_apiCaixa('s_dir', { filtro: 'minhas' });
  assert.ok(dir.itens.some((i) => i.id === 'CONDUTA:OC:oc2'), 'Diretoria decide a que o Gestor de Qualidade registrou');
  assert.ok(!amb.ctx.SGO_Pendencias_listar('s_gt', { semCache: true }).itens.some((i) => i.tipo === 'conduta_homologar'));
  assert.ok(amb.ctx.SGO_Pendencias_listar('s_gq', { semCache: true }).itens.some((i) => i.tipo === 'conduta_homologar'));
});

// ------------------------------------------------------------------ escada
test('escada: 2 dias úteis parado = WhatsApp, 5 = Diretoria (fim de semana e feriado não contam); escalonamento registrado uma vez', () => {
  const amb = ambiente();
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  amb.ctx.Ges_sincronizar_();
  const reg = () => amb.tabelas.GES_DECISOES.find((r) => r.ITEM_ID === 'ATV:a1');
  assert.equal(reg().SITUACAO, 'ABERTA');
  assert.equal(reg().ENTROU_EM, '2026-10-19T10:00');
  const etapa = () => caixaDe(amb, 's_gt').itens[0];
  assert.equal(etapa().etapa, 'NA_HORA');
  amb.mudar('2026-10-20T10:00:00-03:00');
  assert.equal(etapa().etapa, 'EMAIL');
  amb.mudar('2026-10-21T10:00:00-03:00');
  assert.equal(etapa().etapa, 'WHATSAPP');
  assert.equal(etapa().diasParado, 2);
  amb.mudar('2026-10-25T10:00:00-03:00'); // domingo: sexta foi o 4º dia útil
  assert.equal(etapa().diasParado, 4);
  assert.equal(etapa().etapa, 'WHATSAPP');
  amb.mudar('2026-10-26T10:00:00-03:00'); // segunda: 5º dia útil
  amb.ctx.Ges_sincronizar_();
  assert.equal(etapa().etapa, 'DIRETORIA');
  const esc = reg().ESCALADO_EM;
  assert.equal(esc, '2026-10-26T10:00');
  amb.mudar('2026-10-27T10:00:00-03:00');
  amb.ctx.Ges_sincronizar_();
  assert.equal(reg().ESCALADO_EM, esc, 'escalonamento não se repete');
  // Diretoria vê o escalado na caixa dela
  assert.ok(caixaDe(amb, 's_dir').itens.some((i) => i.id === 'ATV:a1' && i.escalado));
  // feriado: entrada na sexta 30/10, segunda 02/11 (Finados) não conta
  const amb2 = ambiente({ agora: em('2026-10-30T10:00:00-03:00') });
  atividadeAtrasada(amb2, 'a2', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-29T18:00');
  amb2.ctx.Ges_sincronizar_();
  amb2.mudar('2026-11-03T10:00:00-03:00');
  assert.equal(caixaDe(amb2, 's_gt').itens[0].diasParado, 1, 'só terça conta (02/11 é feriado)');
  // resolvido na origem: sai da caixa
  amb.tabelas.ATV_ATIVIDADES[0].SITUACAO = 'Concluída';
  amb.tabelas.ATV_ATIVIDADES[0].CONCLUIDA_EM = '2026-10-27T11:00';
  amb.mudar('2026-10-27T11:30:00-03:00');
  amb.ctx.Ges_sincronizar_();
  assert.equal(reg().SITUACAO, 'RESOLVIDA');
  assert.equal(caixaDe(amb, 's_gt').itens.length, 0);
});

test('ocorrência descartada pelo prazo de homologação conta como "venceu sem decisão"', () => {
  const amb = ambiente();
  amb.tabelas.qual_ocorrencia.push({ ID: 'oc1', TIPO_CODIGO: 'TEC-01', COLABORADOR_ID: 'u_tec', FISCAL_ID: 'u_ga', STATUS: 'REGISTRADA', DATA_FATO: '2026-10-16', PRAZO_HOMOLOGACAO: '2026-10-21' });
  amb.ctx.Ges_sincronizar_();
  const r = amb.tabelas.GES_DECISOES.find((x) => x.ITEM_ID === 'CONDUTA:OC:oc1');
  assert.equal(r.PRAZO_DECISAO, '2026-10-21', 'prazo da própria regra (homologação)');
  Object.assign(amb.tabelas.qual_ocorrencia[0], { STATUS: 'DESCARTADA', HISTORICO_JSON: '[{"acao":"DESCARTE_PRAZO"}]' });
  amb.mudar('2026-10-22T07:00:00-03:00');
  amb.ctx.Ges_sincronizar_();
  assert.equal(amb.tabelas.GES_DECISOES.find((x) => x.ITEM_ID === 'CONDUTA:OC:oc1').SITUACAO, 'PERDIDA');
});

// ------------------------------------------------------------------ e-mail diário
test('e-mail diário: um por pessoa da gestão por dia útil, a partir das 08:00, só com algo a dizer; nunca fim de semana', () => {
  const amb = ambiente({ agora: em('2026-10-20T07:40:00-03:00') });
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  let r = amb.ctx.Ges_rodada_();
  assert.equal(amb.emails.length, 0, 'antes do expediente nada sai');
  amb.mudar('2026-10-20T08:10:00-03:00');
  amb.ctx.Ges_rodada_();
  const paraGil = amb.emails.filter((m) => m.to === 'gil@exemplo.test');
  assert.equal(paraGil.length, 1);
  assert.match(paraGil[0].subject, /Decisões aguardando você \(1\)/);
  assert.match(paraGil[0].body, /O que fazer:/);
  assert.match(paraGil[0].body, /tela=/);
  assert.equal(amb.emails.filter((m) => m.to === 'ana@exemplo.test').length, 0, 'sem item, sem e-mail');
  amb.mudar('2026-10-20T11:00:00-03:00');
  amb.ctx.Ges_rodada_();
  assert.equal(amb.emails.filter((m) => m.to === 'gil@exemplo.test').length, 1, 'não repete no mesmo dia');
  amb.mudar('2026-10-24T09:00:00-03:00'); // sábado
  amb.ctx.Ges_rodada_();
  assert.equal(amb.emails.filter((m) => m.to === 'gil@exemplo.test').length, 1, 'sábado não manda');
  amb.mudar('2026-10-26T08:30:00-03:00'); // segunda: o semanal vai no e-mail da Diretoria (item com 4 dias úteis, ainda não escalado)
  amb.ctx.Ges_rodada_();
  let dir = amb.emails.filter((m) => m.to === 'dora@exemplo.test');
  assert.equal(dir.length, 1, 'Diretoria recebe um e-mail só');
  assert.match(dir[0].body, /RELATÓRIOS/);
  assert.doesNotMatch(dir[0].body, /ESCALADAS/);
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'SEMANAL').length, 1);
  amb.mudar('2026-10-27T08:30:00-03:00'); // terça: 5 dias úteis parado (entrou na terça 20/10)
  amb.ctx.Ges_rodada_();
  dir = amb.emails.filter((m) => m.to === 'dora@exemplo.test');
  assert.equal(dir.length, 2, 'um por dia');
  assert.match(dir[1].body, /ESCALADAS PARA A DIRETORIA/);
  assert.match(dir[1].body, /Com GIL GESTOR TESTE, parado há 5 dias úteis/);
  assert.equal(amb.emails.filter((m) => m.to === 'gil@exemplo.test').length, 3);
});

// ------------------------------------------------------------------ WhatsApp
test('WhatsApp: só com item parado há 2 dias úteis, um por dia somando atividades e gestão, vínculo liberado, nunca à noite', () => {
  const amb = ambiente({ props: { ATV_AVISOS_CFG: JSON.stringify({ whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT'], pjDecisao20261026: true }) },  agora: em('2026-10-19T10:00:00-03:00') });
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  atividadeAtrasada(amb, 'a2', 'u_met', 'MARA METROLOGIA TESTE', '2026-10-16T18:00'); // Metrologia sem gestor: reserva da Diretoria
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'a3', TITULO: 'Atividade nova do gestor', RESPONSAVEL_ID: 'u_gt', RESPONSAVEL_NOME: 'GIL GESTOR TESTE', CRIADO_POR_ID: 'u_dir', PRAZO: '2026-10-21T15:00', PREVISAO_ATUAL: '2026-10-21T15:00', SITUACAO: 'A fazer' });
  amb.ctx.Ges_sincronizar_();
  amb.mudar('2026-10-20T09:30:00-03:00');
  assert.equal(amb.ctx.Gestao_whatsDiario_().enviados, 0, 'só 1 dia útil parado');
  amb.mudar('2026-10-21T20:00:00-03:00');
  assert.match(amb.ctx.Gestao_whatsDiario_().fora, /fora do expediente|depois do fim/);
  amb.mudar('2026-10-21T09:30:00-03:00');
  // a rotina de atividades chama o resumo da gestão primeiro e não manda um segundo WhatsApp a quem já recebeu
  amb.ctx.Atividades_resumoDiario_();
  const paraGil = amb.whats.filter((w) => w.corpo.to === '5562999990011');
  assert.equal(paraGil.length, 1, 'um WhatsApp para o Gil');
  assert.equal(paraGil[0].corpo.template.name, 'sgo_aviso_geral', 'até a Meta aprovar sgo_gestao_resumo_dia');
  const resumoAtv = amb.tabelas.ATV_RESUMOS.find((r) => r.USUARIO_ID === 'u_gt');
  assert.equal(resumoAtv.SITUACAO, 'NO_RESUMO_DA_GESTAO');
  assert.equal(amb.ctx.Gestao_whatsDiario_().avaliados, 0, 'não repete no mesmo dia');
  // o notificador também barra a segunda mensagem de atividades do dia
  const seg = amb.ctx.SGO_notificar_({ usuarios: ['u_gt'], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'x', titulo: 'Resumo', texto: 'x',
    modelo: { nome: 'sgo_atividade_atribuida', parametros: ['@NOME', 'A', '21/10/2026', '@LINK'] } });
  assert.equal(seg.pulado, 1);
  assert.equal(amb.whats.filter((w) => w.corpo.to === '5562999990011').length, 1);
  // Diretoria (reserva) com vínculo CLT também recebe o dela; PJ não recebe (fica no e-mail)
  assert.equal(amb.whats.filter((w) => w.corpo.to === '5562999990010').length, 1);
  const pj = amb.ctx.SGO_notificar_({ usuarios: ['u_ga'], canais: ['whatsapp'], categoria: 'GESTAO', origem: 'GESTAO_RESUMO', refId: 'y', titulo: 'Decisões', texto: 'x' });
  assert.equal(pj.pulado, 1);
  assert.match(pj.motivo, /PJ/);
  // modelo próprio dentro das regras da Meta
  assert.equal(JSON.stringify(amb.ctx.Notificar_validarModeloMeta_('sgo_gestao_resumo_dia', amb.ctx.NTF_MODELOS_META.sgo_gestao_resumo_dia)), '[]');
});

// ------------------------------------------------------------------ providência
test('providência: só o responsável (ou a Diretoria), texto e data obrigatórios, pausa a escada; "Ciente" resolve a justificativa', () => {
  const amb = ambiente();
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  amb.tabelas.ATV_HISTORICO.push({ ID: 'h1', ATIVIDADE_ID: 'a1', TIPO: 'JUSTIFICATIVA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DATA: '2026-10-19T09:00', TEXTO: 'Aguardando peça do fornecedor de teste.', CATEGORIA: 'Aguardando peça ou material', PREVISAO_NOVA: '2026-10-23T18:00' });
  amb.ctx.Ges_sincronizar_();
  assert.match(amb.ctx.Gestao_apiProvidencia('s_ga', { itemId: 'ATV:a1', texto: 'Tentativa de outra gestora', acompanharAte: '2026-10-22' }).message, /é de GIL GESTOR TESTE/);
  assert.match(amb.ctx.Gestao_apiProvidencia('s_gt', { itemId: 'ATV:a1', texto: 'curto', acompanharAte: '2026-10-22' }).message, /pelo menos 10 letras/);
  assert.match(amb.ctx.Gestao_apiProvidencia('s_gt', { itemId: 'ATV:a1', texto: 'Conversei com o técnico hoje', acompanharAte: '2026-11-30' }).message, /no máximo 10 dias/);
  const ok = amb.ctx.Gestao_apiProvidencia('s_gt', { itemId: 'ATV:a1', texto: 'Conversei com o técnico hoje', acompanharAte: '2026-10-23' });
  assert.equal(ok.ok, true, ok.message);
  amb.mudar('2026-10-22T10:00:00-03:00');
  const it = caixaDe(amb, 's_gt').itens.find((i) => i.id === 'ATV:a1');
  assert.equal(it.etapa, 'PAUSADO');
  assert.equal(it.providencia, 'Conversei com o técnico hoje');
  amb.mudar('2026-10-28T10:00:00-03:00'); // pausa venceu em 23/10: conta de novo a partir dela (26, 27, 28)
  assert.equal(caixaDe(amb, 's_gt').itens.find((i) => i.id === 'ATV:a1').diasParado, 3);
  const reg = amb.tabelas.GES_DECISOES.find((r) => r.ITEM_ID === 'ATV:a1');
  assert.equal(reg.PRIMEIRA_ACAO_EM, '2026-10-19T10:00');
  // justificativa: "Ciente" só vale para ela e tira da caixa
  const just = caixaDe(amb, 's_gt').itens.find((i) => i.tipo === 'atividade_justificativa');
  assert.ok(just, 'justificativa do técnico entra na caixa do gestor');
  assert.match(amb.ctx.Gestao_apiProvidencia('s_gt', { itemId: 'ATV:a1', texto: 'Ciente indevido aqui', ciente: true }).message, /só vale para justificativa/);
  const c = amb.ctx.Gestao_apiProvidencia('s_gt', { itemId: just.id, texto: 'Justificativa procede, peça confirmada', ciente: true });
  assert.equal(c.ok, true, c.message);
  assert.ok(!caixaDe(amb, 's_gt').itens.some((i) => i.id === just.id));
});

test('justificativas: só a mais recente de cada atividade entra na caixa, e atividade concluída ou cancelada não entra (29/10/2026: 261 pendências para 121 atividades)', () => {
  const amb = ambiente();
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  atividadeAtrasada(amb, 'a2', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  const j = (id, atv, data, texto) => amb.tabelas.ATV_HISTORICO.push({ ID: id, ATIVIDADE_ID: atv, TIPO: 'JUSTIFICATIVA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DATA: data, TEXTO: texto, CATEGORIA: 'Outro', PREVISAO_NOVA: '2026-10-23T18:00' });
  j('h1', 'a1', '2026-10-17T09:00', 'Primeira justificativa de teste.');
  j('h2', 'a1', '2026-10-19T09:00', 'Segunda justificativa de teste.');
  j('h3', 'a2', '2026-10-19T09:00', 'Justificativa da atividade que foi concluída.');
  amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'a2').SITUACAO = 'Concluída';
  amb.ctx.Ges_sincronizar_();
  const just = caixaDe(amb, 's_gt').itens.filter((i) => i.tipo === 'atividade_justificativa');
  assert.deepEqual(just.map((i) => i.id), ['ATV:JUST:h2']);
});

// ------------------------------------------------------------------ avaliação
test('avaliação do gestor: prazo, tempo médio, vencidos, escalonamentos, acesso, revertidas, equipe, planos, nota e farol', () => {
  const amb = ambiente({ agora: em('2026-11-03T10:00:00-03:00'),
    props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'] }, implantadoEm: '2026-10-01T08:00' }) } });
  const d = (o) => Object.assign({ ID: 'g' + Math.random(), TIPO: 'ATIVIDADE_ATRASADA', MODULO: 'atividades', TITULO: 'Item de teste', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'RESOLVIDA', ACOMPANHAMENTO: '' }, o);
  amb.tabelas.GES_DECISOES = [
    d({ ENTROU_EM: '2026-10-05T09:00', PRAZO_DECISAO: '2026-10-07', PRIMEIRA_ACAO_EM: '2026-10-06T10:00' }),                 // 1 dia útil, no prazo
    d({ ENTROU_EM: '2026-10-05T09:00', PRAZO_DECISAO: '2026-10-07', RESOLVIDO_EM: '2026-10-07T16:00' }),                     // 2 dias úteis, no prazo
    d({ ENTROU_EM: '2026-10-13T09:00', PRAZO_DECISAO: '2026-10-14', RESOLVIDO_EM: '2026-10-19T16:00', ESCALADO_EM: '2026-10-19T08:00' }), // fora do prazo, escalado
    d({ ENTROU_EM: '2026-10-20T09:00', PRAZO_DECISAO: '2026-10-22', SITUACAO: 'PERDIDA', RESOLVIDO_EM: '2026-10-23T06:00' }),  // venceu sem decisão
    d({ ENTROU_EM: '2026-10-20T09:00', PRAZO_DECISAO: '2026-10-22', ACOMPANHAMENTO: 'SIM' }),                               // acompanhamento não conta
    d({ RESPONSAVEIS_IDS: 'u_ga', ENTROU_EM: '2026-10-05T09:00', PRAZO_DECISAO: '2026-10-06', RESOLVIDO_EM: '2026-10-06T09:00' })
  ];
  // acesso: todos os dias úteis de outubro, menos 3
  const faltas = ['2026-10-08', '2026-10-09', '2026-10-27'];
  amb.tabelas.GES_ACESSOS = [];
  for (let dia = 1; dia <= 31; dia++) { const x = '2026-10-' + String(dia).padStart(2, '0'); if (!faltas.includes(x)) amb.tabelas.GES_ACESSOS.push({ ID: 'ac' + dia, USUARIO_ID: 'u_gt', DIA: x }); }
  amb.tabelas.qual_ocorrencia.push({ ID: 'o1', HOMOLOGADA_POR: 'u_gt', HOMOLOGADA_EM: '2026-10-10', STATUS: 'ANULADA', ANULADA_EM: '2026-10-20', TIPO_CODIGO: 'TEC-01', DATA_FATO: '2026-10-08' });
  amb.tabelas.qual_ocorrencia.push({ ID: 'o2', HOMOLOGADA_POR: 'u_gt', HOMOLOGADA_EM: '2026-10-12', STATUS: 'FIRME', TIPO_CODIGO: 'TEC-02', DATA_FATO: '2026-10-09' });
  // equipe (área Técnica): 2 com prazo em outubro, 1 com atraso
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 't1', TITULO: 'Equipe 1', RESPONSAVEL_ID: 'u_tec', PRAZO: '2026-10-10T18:00', PREVISAO_ATUAL: '2026-10-10T18:00', SITUACAO: 'Concluída', CONCLUIDA_EM: '2026-10-09T10:00' });
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 't2', TITULO: 'Equipe 2', RESPONSAVEL_ID: 'u_tec', PRAZO: '2026-10-15T18:00', PREVISAO_ATUAL: '2026-10-15T18:00', SITUACAO: 'Concluída', CONCLUIDA_EM: '2026-10-17T10:00' });
  amb.tabelas.qual_plano_acao.push({ ID: 'p1', CODIGO: 'PA-2026-001', CRIADO_POR_ID: 'u_gt', QUEM_ID: 'u_tec', QUANDO: '2026-10-20', FASE: 'CONCLUIDO', CONCLUIDO_EM: '2026-10-18' });
  amb.tabelas.qual_plano_acao.push({ ID: 'p2', CODIGO: 'PA-2026-002', CRIADO_POR_ID: 'u_gt', QUEM_ID: 'u_tec', QUANDO: '2026-10-25', FASE: 'EXECUTAR' });
  const a = amb.ctx.Ges_avaliarMes_('2026-10');
  const g = a.gestores.find((x) => x.id === 'u_gt');
  const i = g.indicadores;
  assert.equal(i.decididos, 3);
  assert.equal(i.noPrazo, 2);
  assert.equal(i.basePrazo, 4, '3 decididos + 1 que venceu sem decisão');
  assert.equal(i.pctPrazo, 50);
  assert.equal(i.tempoMedio, 2.3, '(1 + 2 + 4 dias úteis) / 3, uma casa');
  assert.equal(i.vencidos, 2, 'o decidido depois do prazo e o que se perdeu');
  assert.equal(i.escalonamentos, 1);
  assert.equal(i.diasSemAcesso, 3);
  assert.equal(i.diasUteis, 21, 'dias úteis de outubro de 2026 (12/10 é feriado)');
  assert.equal(i.revertidas, 1);
  assert.equal(i.homologou, 2);
  assert.equal(i.equipe, 2); assert.equal(i.equipeAtrasadas, 1);
  assert.equal(i.planos, 2); assert.equal(i.planosOk, 1);
  // componentes e nota pelos pesos padrão (30, 15, 15, 15, 10, 5, 5, 5)
  assert.deepEqual(JSON.parse(JSON.stringify(g.componentes)), { prazo: 50, tempo: 67.5, vencidos: 60, escalonamentos: 75, acesso: 55, revertidas: 75, equipe: 50, planos: 50 });
  const esperado = Math.round((50 * 30 + 67.5 * 15 + 60 * 15 + 75 * 15 + 55 * 10 + 75 * 5 + 50 * 5 + 50 * 5) / 100 * 10) / 10;
  assert.equal(g.nota, esperado);
  assert.equal(g.farol, 'VERMELHO');
  // pesos da Diretoria mudam a nota
  amb.props.GESTAO_DECISOES_CFG = JSON.stringify(Object.assign(JSON.parse(amb.props.GESTAO_DECISOES_CFG), { pesos: { prazo: 100, tempo: 0, vencidos: 0, escalonamentos: 0, acesso: 0, revertidas: 0, equipe: 0, planos: 0 } }));
  assert.equal(amb.ctx.Ges_avaliarMes_('2026-10').gestores.find((x) => x.id === 'u_gt').nota, 50);
  // Ana: 1 decisão no prazo, sem acesso registrado em nenhum dia útil
  const ana = a.gestores.find((x) => x.id === 'u_ga');
  assert.equal(ana.indicadores.pctPrazo, 100);
  assert.equal(ana.componentes.acesso, 0);
});

test('avaliação: o gestor vê só a dele, a Diretoria vê todas, os demais não veem (tela e ponte do COMMAND)', () => {
  const amb = ambiente();
  const gil = amb.ctx.Gestao_apiAvaliacao('s_gt', {});
  assert.equal(gil.ok, true, gil.message);
  assert.deepEqual(gil.gestores.map((g) => g.id), ['u_gt']);
  assert.equal(gil.diretoria, false);
  const dir = amb.ctx.Gestao_apiAvaliacao('s_dir', {});
  assert.deepEqual(dir.gestores.map((g) => g.id).sort(), ['u_ga', 'u_gt']);
  assert.match(amb.ctx.Gestao_apiAvaliacao('s_tec', {}).message, /só pelo próprio gestor e pela Diretoria/);
  assert.equal(amb.ctx.Gestao_apiAvaliacao('s_rh', {}).ok, false);
  assert.equal(amb.ctx.Gestao_apiAvaliacao('s_adm', {}).ok, false, 'Administrador comum (sem área) não vê a avaliação dos gestores');
  // pesos: só a Diretoria
  assert.match(amb.ctx.Gestao_apiConfigAvaliacao('s_gt', { salvar: { pesos: {}, farol: {} } }).message, /Diretoria/);
  assert.equal(amb.ctx.Gestao_apiConfigAvaliacao('s_dir', { salvar: { pesos: { prazo: 40, tempo: 10, vencidos: 10, escalonamentos: 10, acesso: 10, revertidas: 10, equipe: 5, planos: 5 }, farol: { verde: 90, amarelo: 75 } } }).ok, true);
  // relatório de todos só da Diretoria; o gestor gera o dele
  assert.match(amb.ctx.Gestao_apiRelatorio('s_gt', { tipo: 'desempenho' }).message, /é da Diretoria/);
  assert.match(amb.ctx.Gestao_apiRelatorio('s_gt', { tipo: 'desempenho', gestorId: 'u_ga' }).message, /é da Diretoria/);
  assert.equal(amb.ctx.Gestao_apiRelatorio('s_gt', { tipo: 'desempenho', gestorId: 'u_gt' }).ok, true);
  // ponte
  const p1 = amb.ponte('gestao.avaliacao', { sgoUsuarioId: 'u_ga', payload: {} });
  assert.equal(p1.ok, true); assert.deepEqual(p1.gestores.map((g) => g.id), ['u_ga']);
  assert.equal(amb.ponte('gestao.avaliacao', { sgoUsuarioId: 'u_tec', payload: {} }).ok, false);
  assert.match(amb.ponte('gestao.caixa', { sgoUsuarioId: 'u_tec', payload: {} }).erro, /gestão do SGO\+/);
  const cx = amb.ponte('gestao.caixa', { sgoUsuarioId: 'u_gt', payload: {} });
  assert.equal(cx.ok, true);
  assert.match(cx.linkSgo, /tela=gestao_decisoes/);
  assert.equal(amb.ponte('gestao.resumo', { sgoUsuarioId: 'u_gt' }).ok, true);
});

// ------------------------------------------------------------------ relatórios A4
test('relatórios A4: Desempenho da gestão, semanal e Atividades da equipe saem no padrão, com números pt-BR e uso restrito', () => {
  const amb = ambiente();
  atividadeAtrasada(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T18:00');
  amb.tabelas.ATV_HISTORICO.push({ ID: 'h1', ATIVIDADE_ID: 'a1', TIPO: 'JUSTIFICATIVA', USUARIO_ID: 'u_tec', DATA: '2026-10-16T19:00', CATEGORIA: 'Aguardando cliente', TEXTO: 'Cliente de teste remarcou.' });
  amb.ctx.Ges_sincronizar_();
  const des = amb.ctx.Gestao_apiRelatorio('s_dir', { tipo: 'desempenho', competencia: '2026-10' });
  assert.equal(des.ok, true, des.message);
  assert.match(des.html, /Desempenho da gestão/);
  assert.match(des.html, /GIL GESTOR TESTE/);
  assert.match(des.html, /Restrito: o próprio gestor e a Diretoria/);
  assert.match(des.html, /Regra da nota/);
  assert.match(des.html, /não foi gravada na pasta/, 'sem Drive no teste: avisa e mostra o documento');
  const sem = amb.ctx.Gestao_apiRelatorio('s_dir', { tipo: 'semanal' });
  assert.equal(sem.ok, true, sem.message);
  assert.match(sem.html, /Relatório semanal da gestão/);
  assert.match(sem.html, /Por gestor/);
  assert.equal(amb.ctx.Gestao_apiRelatorio('s_gt', { tipo: 'semanal' }).ok, false);
  const atv = amb.ctx.Gestao_apiRelatorio('s_gt', { tipo: 'atividades', competencia: '2026-10' });
  assert.equal(atv.ok, true, atv.message);
  assert.match(atv.html, /Atividades da equipe/);
  assert.match(atv.html, /Aguardando cliente/);
  const texto = (des.html + sem.html + atv.html).replace(/<style[\s\S]*?<\/style>/g, '').replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(texto, /\b\d+\.\d+ ?%/, 'percentual com ponto decimal');
});

test('mensal: no primeiro dia útil do mês gera um relatório por rodada, congela a avaliação e o e-mail da Diretoria espera os relatórios', () => {
  const amb = ambiente({ agora: em('2026-11-03T08:05:00-03:00') }); // 01/11 domingo, 02/11 feriado: primeiro dia útil é 03/11
  atividadeAtrasada(amb, 'a1', 'u_met', 'MARA METROLOGIA TESTE', '2026-10-30T18:00'); // reserva da Diretoria
  assert.equal(amb.ctx.Ges_ehDiaDoMensal_('2026-11-03', amb.ctx.SGO_expediente_()), true);
  assert.equal(amb.ctx.Ges_ehDiaDoMensal_('2026-11-02', amb.ctx.SGO_expediente_()), false);
  amb.ctx.Ges_rodada_();
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'MENSAL').length, 1);
  assert.ok(amb.tabelas.GES_AVALIACOES.length >= 2, 'avaliação de outubro congelada');
  assert.equal(amb.emails.filter((m) => m.to === 'dora@exemplo.test').length, 0, 'Diretoria espera os relatórios');
  for (let k = 0; k < 4; k++) { amb.relogio.agora += 15 * 60000; amb.ctx.Ges_rodada_(); }
  assert.equal(amb.tabelas.GES_ENVIOS.filter((e) => e.TIPO === 'MENSAL').length, 4);
  const dir = amb.emails.filter((m) => m.to === 'dora@exemplo.test');
  assert.equal(dir.length, 1);
  assert.match(dir[0].body, /Desempenho da gestão — outubro de 2026/);
  assert.match(dir[0].body, /Atividades da equipe — outubro de 2026/);
  // congelado não muda depois
  const antes = amb.tabelas.GES_AVALIACOES.length;
  amb.ctx.Ges_congelarAvaliacoes_('2026-10');
  assert.equal(amb.tabelas.GES_AVALIACOES.length, antes);
  assert.equal(amb.ctx.Ges_avaliarMes_('2026-10').congelada, true);
});

// ------------------------------------------------------------------ sugestão no Programa de conduta
test('falha grave recorrente vira sugestão no Programa de conduta só para a Diretoria (nunca ocorrência)', () => {
  const amb = ambiente({ agora: em('2026-11-03T09:00:00-03:00'),
    props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'] }, implantadoEm: '2026-09-01T08:00' }) } });
  const esc = (mes, n) => { for (let k = 0; k < n; k++) amb.tabelas.GES_DECISOES = (amb.tabelas.GES_DECISOES || []).concat([{ ID: 'e' + mes + k, RESPONSAVEIS_IDS: 'u_gt', ENTROU_EM: '2026-' + mes + '-05T09:00', PRAZO_DECISAO: '2026-' + mes + '-06', ESCALADO_EM: '2026-' + mes + '-13T09:00', SITUACAO: 'ABERTA' }]); };
  esc('10', 3);
  // a Ana acessou todos os dias (sem item, sem falha): não vira sugestão
  for (let dd = 1; dd <= 31; dd++) for (const mm of ['09', '10']) amb.tabelas.GES_ACESSOS = (amb.tabelas.GES_ACESSOS || []).concat([{ ID: 'ac' + mm + dd, USUARIO_ID: 'u_ga', DIA: '2026-' + mm + '-' + String(dd).padStart(2, '0') }]);
  const r = amb.ctx.Ges_sugestoesConduta_('2026-10');
  assert.equal(r.novas, 1);
  const s = amb.tabelas.qual_sugestao[0];
  assert.equal(s.ORIGEM_MODULO, 'GESTAO');
  assert.equal(s.COLABORADOR_ID, 'u_gt');
  assert.equal(s.INFORMATIVA, 'SIM');
  assert.equal(s.STATUS, 'PENDENTE');
  assert.equal(amb.tabelas.qual_ocorrencia.length, 0, 'nada vira ocorrência sozinho');
  assert.equal(amb.ctx.Ges_sugestoesConduta_('2026-10').novas, 0, 'não repete');
  // na caixa: só a Diretoria vê; o gestor avaliado e os outros gestores não
  assert.ok(caixaDe(amb, 's_dir').itens.some((i) => i.id === 'CONDUTA:SUG:' + s.ID));
  assert.ok(!caixaDe(amb, 's_ga', 'todas').itens.some((i) => i.id === 'CONDUTA:SUG:' + s.ID));
  assert.ok(!amb.ctx.SGO_Pendencias_listar('s_gt', { semCache: true }).itens.some((i) => i.id === 'CONDUTA:SUG:' + s.ID));
  // Programa de conduta: só a Diretoria decide a sugestão vinda da avaliação
  const stubs = "function Conduta_exigirGestor_(sid){ var s = exigirSessao(sid); if (['ADMIN','GESTOR','DIRETORIA'].indexOf(s.perfil) < 0) throw new Error('restrito'); return s; }" +
    "function Conduta_exigirDecisor_(sid, acao){ var s = Conduta_exigirGestor_(sid); if (s.perfil !== 'DIRETORIA') throw new Error('Não foi possível ' + acao + ': por sigilo do colaborador, quem decide é a Diretoria e o Gestor de Qualidade.'); return s; }" +
    "function Conduta_ehDiretoriaOuDono_(s){ return !!s && s.perfil === 'DIRETORIA'; } function Conduta_setup_(){} function Conduta_obterParametros_(){ return {}; } function Conduta_hojeISO_(){ return '2026-11-03'; }";
  vm.runInContext(stubs, amb.ctx);
  vm.runInContext(fs.readFileSync(path.join(pastaLegado, 'SGO_Conduta_Qualidade.js'), 'utf8').replace(/\r\n/g, '\n'), amb.ctx);
  assert.throws(() => amb.ctx.Conduta_apiDescartarSugestao('s_ga', { id: s.ID, motivo: 'Tentativa de outra gestora sem poder' }), /sigilo do colaborador|só a Diretoria decide/);
  const d = amb.ctx.Conduta_apiDescartarSugestao('s_dir', { id: s.ID, motivo: 'Conversado com o gestor; plano de melhoria acordado' });
  assert.equal(d.success, true);
});

// ------------------------------------------------------------------ automações
test('automações: CNH avisada ao condutor com 30, 15 e 7 dias (uma de cada); atividade sem responsável ativo volta para quem lançou', () => {
  const amb = ambiente({ agora: em('2026-10-19T09:00:00-03:00') });
  amb.tabelas.CAD_CONDUTORES.push({ ID: 'c1', NOME: 'TIAGO TECNICO TESTE', USUARIO_ID: 'u_tec', CNH_VALIDADE: '2026-11-15', STATUS: 'ATIVO' }); // 27 dias
  const ex = () => amb.ctx.SGO_dentroDoExpediente_();
  assert.equal(amb.ctx.Ges_autoCnhCondutor_(ex()).enviados, 1);
  assert.equal(amb.ctx.Ges_autoCnhCondutor_(ex()).enviados, 0, 'o aviso dos 30 dias sai uma vez');
  assert.match(amb.emails[0].subject, /Sua CNH vence em 15\/11\/2026/);
  assert.equal(amb.emails[0].to, 'tiago@exemplo.test');
  amb.mudar('2026-11-02T09:00:00-03:00'); // 13 dias (feriado: a rotina não roda fora do expediente)
  assert.equal(amb.ctx.Ges_rodada_().fora, 'feriado nacional');
  amb.mudar('2026-11-03T09:00:00-03:00'); // 12 dias: limiar de 15
  assert.equal(amb.ctx.Ges_autoCnhCondutor_(ex()).enviados, 1);
  amb.mudar('2026-11-09T09:00:00-03:00'); // 6 dias: limiar de 7
  assert.equal(amb.ctx.Ges_autoCnhCondutor_(ex()).enviados, 1);
  assert.equal(amb.emails.length, 3);
  // CNH só entra na caixa do gestor com 7 dias ou menos
  amb.ctx.SGO_CFG.SHEETS.CAD_VEICULOS = 'CAD_VEICULOS';
  // atividade de quem saiu da empresa
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'x1', TITULO: 'Atividade órfã de teste', RESPONSAVEL_ID: 'u_sai', RESPONSAVEL_NOME: 'PESSOA INATIVA TESTE', CRIADO_POR_ID: 'u_gt', CRIADO_POR_NOME: 'GIL GESTOR TESTE', PRAZO: '2026-11-20T18:00', PREVISAO_ATUAL: '2026-11-20T18:00', SITUACAO: 'A fazer' });
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'x2', TITULO: 'Atividade sem ninguém', RESPONSAVEL_ID: '', CRIADO_POR_ID: 'u_sai', PRAZO: '2026-11-20T18:00', PREVISAO_ATUAL: '2026-11-20T18:00', SITUACAO: 'A fazer' });
  const r = amb.ctx.Ges_autoAtividadeSemResponsavel_();
  assert.equal(r.devolvidas, 2);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'x1').RESPONSAVEL_ID, 'u_gt', 'volta para quem lançou');
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'x2').RESPONSAVEL_ID, 'u_dir', 'quem lançou saiu: vai para a Diretoria');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === 'x1' && h.TIPO === 'RESPONSAVEL' && /PESSOA INATIVA TESTE está inativo/.test(h.TEXTO)));
  assert.ok(amb.tabelas.ATV_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_gt' && v.ATIVIDADE_ID === 'x1'));
  assert.equal(amb.ctx.Ges_autoAtividadeSemResponsavel_().devolvidas, 0);
});

test('automação: manutenção prevista vira atividade do gestor da Frota (uma por veículo e tipo a cada 60 dias)', () => {
  const amb = ambiente({ props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { ADMINISTRATIVO: ['u_ga'] } }) } });
  amb.ctx.SGO_CFG.SHEETS.CAD_VEICULOS = 'CAD_VEICULOS';
  amb.ctx.Frota_calcularAlertasManutencao_ = () => [
    { veiculoId: 'v1', veiculoPlaca: 'TST1A23', tipo: 'OLEO', tipoLabel: 'Troca de óleo', status: 'VENCENDO', categoria: 'MANUTENCAO', vencimento: '' },
    { veiculoId: 'v1', veiculoPlaca: 'TST1A23', tipo: 'DOC_CRLV', tipoLabel: 'CRLV', status: 'VENCENDO', categoria: 'DOCUMENTO', vencimento: '30/10/2026' }
  ];
  const r = amb.ctx.Ges_autoManutencaoAgenda_();
  assert.equal(r.criadas, 1);
  const a = amb.tabelas.ATV_ATIVIDADES[0];
  assert.equal(a.RESPONSAVEL_ID, 'u_ga');
  assert.equal(a.MODULO, 'frota');
  assert.match(a.TITULO, /Agendar troca de óleo do veículo TST1A23/);
  assert.match(a.DESCRICAO, /pela quilometragem/);
  assert.equal(amb.ctx.Ges_autoManutencaoAgenda_().criadas, 0, 'não repete');
});

test('regras e responsáveis: só Administrador e Diretoria salvam; validações com mensagem que diz o que fazer', () => {
  const amb = ambiente();
  assert.match(amb.ctx.Gestao_apiConfig('s_gt', { salvar: { gestoresPorArea: {} } }).message, /definidos pelo Administrador ou pela Diretoria/);
  const base = { gestoresPorArea: { METROLOGIA: ['u_gt', 'u_tec'] }, areaPorModulo: { frota: 'TECNICA' }, escada: { whatsDiasUteis: 3, diretoriaDiasUteis: 3, horaEmail: '08:00', horaSemanal: '08:00' } };
  assert.match(amb.ctx.Gestao_apiConfig('s_dir', { salvar: base }).message, /Diretoria precisa entrar depois do WhatsApp/);
  base.escada.diretoriaDiasUteis = 6; base.escada.horaEmail = '19:00';
  assert.match(amb.ctx.Gestao_apiConfig('s_dir', { salvar: base }).message, /dentro do horário de trabalho/);
  base.escada.horaEmail = '08:30';
  const ok = amb.ctx.Gestao_apiConfig('s_adm', { salvar: base });
  assert.equal(ok.ok, true, ok.message);
  assert.deepEqual(JSON.parse(JSON.stringify(ok.cfg.gestoresPorArea)), { METROLOGIA: ['u_gt'] }, 'técnico não entra como gestor (só perfil de gestão)');
  assert.equal(ok.cfg.areaPorModulo.frota, 'TECNICA');
  assert.equal(ok.cfg.escada.whatsDiasUteis, 3);
  assert.equal(ok.cfg.escada.horaEmail, '08:30');
});

test('tela: menu, include, ganchos da casca, link ?tela= e ajuda das duas telas', () => {
  const idx = fs.readFileSync(path.join(pastaLegado, 'Index.html'), 'utf8');
  const core = fs.readFileSync(path.join(pastaLegado, 'JS_Core.html'), 'utf8');
  const js = fs.readFileSync(path.join(pastaLegado, 'JS_Gestao.html'), 'utf8');
  assert.match(idx, /data-mod="gestao_decisoes"/);
  assert.match(idx, /data-mod="gestao_desempenho"/);
  assert.match(idx, /include\('JS_Gestao'\)/);
  assert.match(core, /mod === "gestao_decisoes"/);
  assert.equal((core.match(/Gestao_iniciar_\(\)/g) || []).length, 2, 'login e entrada automática');
  assert.match(core, /Gestao_parar_\(\)/);
  assert.match(core, /location\.parameters\.tela/);
  assert.doesNotMatch(js, /setInterval\([^)]*Gestao_carregarCaixa_/, 'a caixa não se redesenha sozinha');
  const amb = ambiente();
  vm.runInContext(fs.readFileSync(path.join(pastaLegado, 'SGO_Ajuda_Gestao.js'), 'utf8'), amb.ctx);
  const aj = amb.ctx.SGO_ajudaTelas_Gestao_();
  assert.ok(aj.gestao_decisoes.passos.length >= 4 && aj.gestao_desempenho.passos.length >= 2);
  assert.doesNotMatch(JSON.stringify(aj) + js, /[\u{1F300}-\u{1FAFF}]/u, 'sem emoji');
});

test('WhatsApp pela Z-API: não espera aprovação da Meta e usa o resumo próprio da gestão', () => {
  const amb = ambiente({ agora: em('2026-10-19T10:00:00-03:00') });
  assert.equal(amb.ctx.Ges_modeloWhatsAprovado_(), false, 'Meta sem o modelo aprovado');
  amb.ctx.Notificar_whatsappSemModelo_ = () => true;
  amb.cache && Object.keys(amb.cache).forEach((k) => delete amb.cache[k]);
  assert.equal(amb.ctx.Ges_modeloWhatsAprovado_(), true);
});
