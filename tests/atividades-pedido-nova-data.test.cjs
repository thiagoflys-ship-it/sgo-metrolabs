// Pedido de nova data no lugar da justificativa de atraso (31/10/2026, caso real: 6 justificativas diárias da mesma atividade
// viraram 6 itens "Avaliar a justificativa" na caixa do dono). O responsável pede a data; quem lançou (ou a gestão) aceita ou
// recusa; enquanto o pedido espera, não há cobrança diária e a caixa tem UM item por atividade. "Quem age agora", motivo neutro
// para a outra prioridade (com quem pediu), datas absurdas barradas e compatibilidade com as justificativas antigas.
// Código real do SGO+ num contexto isolado (mesmo ambiente de tests/gestao-decisoes.test.cjs). Só dados de teste.
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
    s_met: { userId: 'u_met', usuario: 'mara', nome: 'MARA METROLOGIA TESTE', perfil: 'METROLOGIA' },
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


// ------------------------------------------------------------------ apoio
/** Gil (gestor) lança para o Tiago às 08:00 de segunda com prazo às 09:00; às 10:00 ela está vencida. */
function vencidaDoTiago(amb, extra) {
  amb.mudar('2026-10-19T08:00:00-03:00');
  const r = amb.ctx.Atividades_apiCriar('s_gt', Object.assign({ titulo: 'Finalização da lavadora de teste', responsavelId: 'u_tec', prazo: '2026-10-19T09:00' }, extra || {}));
  assert.equal(r.ok, true, r.message);
  amb.mudar('2026-10-19T10:00:00-03:00');
  return r.item.ID;
}
const pedir = (amb, id, extra, sid) => amb.ctx.Atividades_apiJustificar(sid || 's_tec', Object.assign({ id, categoria: 'Aguardando peça ou material', motivo: 'A peça do fornecedor de teste chega amanhã.', novaPrevisao: '2026-10-21T18:00' }, extra || {}));
const linha = (amb, id) => amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === id);
const agirDe = (amb, sid, id) => { const d = amb.ctx.Atividades_apiDetalhe(sid, { id }); assert.equal(d.ok, true, d.message); return d.item.AGIR; };
const avisos = (amb, uid, tipo) => amb.tabelas.ATV_AVISOS.filter((v) => v.DESTINATARIO_ID === uid && (!tipo || v.TIPO === tipo));
const atrasoNaCentral = (amb, uid) => { const l = []; amb.ctx.Pend_fonteAtividades_((i) => l.push(i), { userId: uid, interno: false }); return l.filter((i) => i.tipo === 'atividade_atrasada'); };

// ------------------------------------------------------------------ pedido
test('pedido de nova data: o responsável propõe; fica pendente com quem lançou; a previsão só muda na decisão; "quem age agora" nas duas visões', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  assert.equal(agirDe(amb, 's_tec', id).frase, 'Você precisa: pedir nova data (justificar) ou concluir');
  assert.equal(agirDe(amb, 's_gt', id).frase, 'Nada a fazer agora');
  assert.match(agirDe(amb, 's_gt', id).detalhe, /TIAGO TECNICO TESTE precisa pedir nova data ou concluir/);
  // só o responsável pede
  assert.match(pedir(amb, id, {}, 's_gt').message, /só o responsável pela atividade \(TIAGO TECNICO TESTE\) pede nova data/);
  const r = pedir(amb, id);
  assert.equal(r.ok, true, r.message);
  assert.match(r.message, /Pedido enviado: nova data 21\/10\/2026 18:00\. Agora GIL GESTOR TESTE aceita ou recusa; você não será cobrado/);
  const a = linha(amb, id);
  assert.equal(a.PEDIDO_SITUACAO, 'PENDENTE'); assert.equal(a.PEDIDO_DATA, '2026-10-21T18:00');
  assert.equal(a.PREVISAO_ATUAL, '2026-10-19T09:00', 'a previsão não muda antes da decisão');
  assert.equal(a.PEDIDO_DECISOR_ID, 'u_gt'); assert.equal(a.QTD_JUSTIFICATIVAS, 1);
  const h = amb.tabelas.ATV_HISTORICO.filter((x) => x.ATIVIDADE_ID === id && x.TIPO === 'JUSTIFICATIVA');
  assert.equal(h.length, 1); assert.equal(h[0].PARA, 'PENDENTE'); assert.equal(h[0].PREVISAO_NOVA, '2026-10-21T18:00');
  const av = avisos(amb, 'u_gt', 'JUSTIFICATIVA');
  assert.equal(av.length, 1); assert.match(av[0].TITULO, /Nova data pedida/); assert.ok(av[0].EMAIL_SITUACAO, 'o pedido também vai por e-mail (no expediente)');
  assert.equal(agirDe(amb, 's_tec', id).frase, 'Aguardando GIL GESTOR TESTE decidir sua nova data; você não será cobrado enquanto isso');
  assert.equal(agirDe(amb, 's_tec', id).acao, 'mudarPedido');
  const gil = amb.ctx.Atividades_apiDetalhe('s_gt', { id }).item;
  assert.equal(gil.AGIR.frase, 'Você precisa: aceitar ou recusar a nova data proposta por TIAGO TECNICO TESTE');
  assert.equal(gil.PODE_DECIDIR, true);
  assert.equal(gil.PEDIDO_MOTIVO_TEXTO, 'Aguardando peça ou material');
  // quem só acompanha: nada a fazer, sem o texto do pedido
  const mara = amb.ctx.Atividades_apiDetalhe('s_met', { id }).item;
  assert.equal(mara.AGIR.frase, 'Nada a fazer agora'); assert.equal(mara.PEDIDO_TEXTO, ''); assert.equal(mara.PODE_DECIDIR, false);
  // compacto nas listas: o mesmo AGIR vem em Minhas atividades e na equipe
  assert.equal(amb.ctx.Atividades_apiListarMinhas('s_tec', {}).itens.find((x) => x.ID === id).AGIR.codigo, 'AGUARDANDO');
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_gt', {}).itens.find((x) => x.ID === id).AGIR.codigo, 'DECIDIR');
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_gt', {}).indicadores.pedidosPendentes, 1);
});

test('aceitar: a data proposta vira a previsão (o prazo original fica); só quem lançou ou a gestão decide; não decide duas vezes', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id).ok, true);
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_tec', { id, decisao: 'ACEITAR' }).message, /o pedido é seu/);
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_met', { id, decisao: 'ACEITAR' }).message, /quem lançou a atividade \(GIL GESTOR TESTE\) ou pela gestão/);
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id }).message, /Toque em "Aceitar nova data" ou em "Recusar"/);
  const r = amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'ACEITAR' });
  assert.equal(r.ok, true, r.message);
  const a = linha(amb, id);
  assert.equal(a.PEDIDO_SITUACAO, 'ACEITO'); assert.equal(a.PREVISAO_ATUAL, '2026-10-21T18:00'); assert.equal(a.PRAZO, '2026-10-19T09:00');
  assert.equal(a.PEDIDO_DECIDIDO_POR_NOME, 'GIL GESTOR TESTE');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id && h.TIPO === 'PEDIDO_ACEITO' && h.PREVISAO_NOVA === '2026-10-21T18:00'));
  assert.equal(avisos(amb, 'u_tec', 'PEDIDO_ACEITO').length, 1);
  assert.equal(agirDe(amb, 's_tec', id).frase, 'Nada a fazer agora');
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_dir', { id, decisao: 'RECUSAR', motivo: 'Tarde demais' }).message, /já foi aceito por GIL GESTOR TESTE/);
  // a Diretoria (gestão) também decide um pedido de atividade lançada por outra pessoa
  amb.mudar('2026-10-22T10:00:00-03:00');
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-23T18:00' }).ok, true);
  assert.equal(amb.ctx.Atividades_apiDecidirPedido('s_dir', { id, decisao: 'ACEITAR' }).ok, true);
  // data proposta que passou enquanto esperava não pode ser aceita: o gestor recusa ou muda o prazo
  amb.mudar('2026-10-24T10:00:00-03:00');
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-24T11:00' }).ok, true);
  amb.mudar('2026-10-24T12:00:00-03:00');
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'ACEITAR' }).message, /a data proposta \(24\/10\/2026 11:00\) já passou.*Recuse.*Editar/);
});

test('recusar: exige motivo curto; a previsão continua vencida; o responsável vê o motivo, volta a ser cobrado e pede outra data', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id).ok, true);
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'RECUSAR', motivo: '' }).message, /escreva em poucas palavras por que a data não serve/);
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'RECUSAR', motivo: 'x'.repeat(301) }).message, /passou de 300 letras/);
  const r = amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'RECUSAR', motivo: 'O cliente precisa até amanhã cedo' });
  assert.equal(r.ok, true, r.message);
  const a = linha(amb, id);
  assert.equal(a.PEDIDO_SITUACAO, 'RECUSADO'); assert.equal(a.PREVISAO_ATUAL, '2026-10-19T09:00'); assert.equal(a.PEDIDO_RESPOSTA, 'O cliente precisa até amanhã cedo');
  const rec = avisos(amb, 'u_tec', 'PEDIDO_RECUSADO');
  assert.equal(rec.length, 1); assert.match(rec[0].TEXTO, /Motivo: O cliente precisa até amanhã cedo/); assert.ok(rec[0].EMAIL_SITUACAO);
  const v = amb.ctx.Atividades_apiVerificar('s_tec', {});
  assert.equal(v.pendentes.length, 1, 'volta para a janela de cobrança');
  assert.equal(v.pendentes[0].PEDIDO_RESPOSTA, 'O cliente precisa até amanhã cedo'); assert.equal(v.pendentes[0].PEDIDO_DECIDIDO_POR_NOME, 'GIL GESTOR TESTE');
  const ag = agirDe(amb, 's_tec', id);
  assert.equal(ag.codigo, 'JUSTIFICAR'); assert.match(ag.detalhe, /GIL GESTOR TESTE recusou a nova data pedida \(21\/10\/2026 18:00\): O cliente precisa até amanhã cedo/);
  assert.equal(atrasoNaCentral(amb, 'u_tec').length, 1);
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-20T08:00' }).ok, true);
  assert.equal(linha(amb, id).PEDIDO_SITUACAO, 'PENDENTE'); assert.equal(linha(amb, id).PEDIDO_RESPOSTA, '');
});

test('enquanto o pedido espera: nenhuma cobrança diária, nenhum aviso de atraso novo, fora da janela, da central e do resumo, mesmo dias depois', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  amb.ctx.Atividades_rotinaAtrasos();
  assert.equal(avisos(amb, 'u_tec', 'ATRASO').length, 1, 'o primeiro atraso é avisado uma vez');
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 1);
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-20T18:00' }).ok, true);
  for (const dia of ['2026-10-19T18:05', '2026-10-20T09:00', '2026-10-20T18:05', '2026-10-21T18:05', '2026-10-22T18:05', '2026-10-23T18:05']) {
    amb.mudar(dia + ':00-03:00');
    amb.ctx.Atividades_rotinaAtrasos();
    const v = amb.ctx.Atividades_apiVerificar('s_tec', {});
    assert.equal(v.pendentes.length, 0, 'sem janela de cobrança em ' + dia);
    assert.equal(atrasoNaCentral(amb, 'u_tec').length, 0, 'sem cobrança na central em ' + dia);
    assert.equal(amb.ctx.Atividades_vencida_(amb.ctx.Atividades_obter_(id), amb.ctx.Atividades_agora_()), false);
  }
  assert.equal(avisos(amb, 'u_tec', 'ATRASO').length, 1, 'nenhum aviso de atraso novo enquanto espera a decisão');
  assert.equal(amb.tabelas.ATV_HISTORICO.filter((h) => h.ATIVIDADE_ID === id && h.TIPO === 'JUSTIFICATIVA').length, 1, 'nenhuma justificativa nova');
  assert.match(amb.ctx.Ges_textoAtividadesDe_('u_tec'), /nenhuma atrasada/);
  // o atraso continua visível nos números da equipe (atraso de fato)
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_gt', {}).indicadores.vencidas, 1);
  // aceita para uma data futura que depois vence: a cobrança volta, com um aviso novo
  amb.mudar('2026-10-26T09:00:00-03:00');
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-26T12:00' }).ok, true);
  assert.equal(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'ACEITAR' }).ok, true);
  amb.mudar('2026-10-26T13:00:00-03:00');
  amb.ctx.Atividades_rotinaAtrasos();
  assert.equal(avisos(amb, 'u_tec', 'ATRASO').length, 2);
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 1);
});

test('uma decisão por atividade: mudar o pedido atualiza o mesmo item; dias seguidos não criam outro; decidido, sai; novo pedido, um item de novo', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  const item = 'ATV:PEDIDO:' + id;
  assert.equal(pedir(amb, id).ok, true);
  amb.ctx.Ges_sincronizar_();
  const doGil = () => caixaDe(amb, 's_gt', 'todas').itens.filter((i) => i.id.indexOf(id) >= 0);
  assert.deepEqual(doGil().map((i) => i.id), [item], 'só o pedido (a atividade atrasada não vira um segundo item)');
  assert.deepEqual(caixaDe(amb, 's_gt').itens.filter((i) => i.id === item).map((i) => i.id), [item], 'na caixa de quem lançou');
  // mudar o pedido: mesmo item, título com a data nova, sem contar outra justificativa
  const m = pedir(amb, id, { novaPrevisao: '2026-10-22T12:00', motivo: 'O fornecedor de teste adiou a entrega da peça.' });
  assert.equal(m.ok, true, m.message); assert.match(m.message, /Pedido alterado/);
  assert.equal(linha(amb, id).QTD_JUSTIFICATIVAS, 1);
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id && h.TIPO === 'PEDIDO_ALTERADO' && h.PREVISAO_NOVA === '2026-10-22T12:00'));
  assert.equal(avisos(amb, 'u_gt', 'PEDIDO_ALTERADO').length, 1);
  assert.match(pedir(amb, id, { novaPrevisao: '2026-10-22T12:00', motivo: 'O fornecedor de teste adiou a entrega da peça.' }).message, /Nada mudou no pedido/);
  for (const dia of ['2026-10-20T10:00', '2026-10-21T10:00', '2026-10-22T10:00']) { amb.mudar(dia + ':00-03:00'); amb.ctx.Ges_sincronizar_(); }
  const regs = amb.tabelas.GES_DECISOES.filter((r) => r.ITEM_ID.indexOf(id) >= 0);
  assert.equal(regs.length, 1, 'uma linha de decisão para a atividade');
  assert.match(regs[0].TITULO, /22\/10\/2026 12:00/);
  assert.deepEqual(doGil().map((i) => i.id), [item]);
  // recusado: o pedido sai; a atividade volta como atrasada; o novo pedido é um item só de novo
  assert.equal(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'RECUSAR', motivo: 'Precisa sair nesta semana' }).ok, true);
  assert.equal(amb.tabelas.GES_DECISOES.find((r) => r.ITEM_ID === item).SITUACAO, 'RESOLVIDA');
  amb.ctx.Ges_sincronizar_();
  assert.deepEqual(doGil().map((i) => i.id), ['ATV:' + id]);
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-23T12:00' }).ok, true);
  amb.ctx.Ges_sincronizar_();
  assert.deepEqual(doGil().map((i) => i.id), [item]);
  assert.equal(amb.tabelas.GES_DECISOES.filter((r) => r.ITEM_ID === item && r.SITUACAO === 'ABERTA').length, 1);
});

test('"Outra prioridade, a pedido de alguém": exige qual prioridade e quem pediu (pessoa ativa, não a própria); a gestão lê um texto neutro', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  const pri = 'Outra prioridade, a pedido de alguém';
  assert.ok(amb.ctx.ATV_MOTIVOS_ATRASO.includes(pri)); assert.ok(!amb.ctx.ATV_MOTIVOS_ATRASO.includes('Outra prioridade definida pela gestão'));
  assert.match(pedir(amb, id, { categoria: pri }).message, /diga qual prioridade você atendeu/);
  assert.match(pedir(amb, id, { categoria: pri, prioridade: 'Atendimento de urgência no Hospital Teste' }).message, /escolha na lista "Quem pediu"/);
  assert.match(pedir(amb, id, { categoria: pri, prioridade: 'Atendimento de urgência no Hospital Teste', pedidoPorId: 'u_tec' }).message, /não você/);
  assert.match(pedir(amb, id, { categoria: pri, prioridade: 'Atendimento de urgência no Hospital Teste', pedidoPorId: 'u_sai' }).message, /não está ativa/);
  // o nome antigo do motivo (COMMAND, telas antigas) vale como o novo e também exige quem pediu
  assert.match(pedir(amb, id, { categoria: 'Outra prioridade definida pela gestão' }).message, /diga qual prioridade/);
  const r = pedir(amb, id, { categoria: pri, prioridade: 'Atendimento de urgência no Hospital Teste', pedidoPorId: 'u_ga', motivo: 'Fui deslocado para a urgência o dia todo.' });
  assert.equal(r.ok, true, r.message);
  const a = linha(amb, id);
  assert.equal(a.PEDIDO_A_PEDIDO_DE_NOME, 'ANA GESTORA TESTE'); assert.equal(a.PEDIDO_PRIORIZOU, 'Atendimento de urgência no Hospital Teste');
  const h = amb.tabelas.ATV_HISTORICO.find((x) => x.ATIVIDADE_ID === id && x.TIPO === 'JUSTIFICATIVA');
  assert.equal(h.TEXTO, 'Priorizou: Atendimento de urgência no Hospital Teste, a pedido de ANA GESTORA TESTE. Fui deslocado para a urgência o dia todo.');
  assert.equal(amb.ctx.Atividades_apiDetalhe('s_gt', { id }).item.PEDIDO_MOTIVO_TEXTO, 'Priorizou: Atendimento de urgência no Hospital Teste, a pedido de ANA GESTORA TESTE');
  amb.ctx.Ges_sincronizar_();
  const it = caixaDe(amb, 's_gt').itens.find((i) => i.id === 'ATV:PEDIDO:' + id);
  assert.match(it.detalhe, /^Priorizou: Atendimento de urgência no Hospital Teste, a pedido de ANA GESTORA TESTE\./);
  assert.ok(!/definida pela gestão/.test(it.detalhe + it.titulo + avisos(amb, 'u_gt', 'JUSTIFICATIVA')[0].TEXTO));
  // as opções da tela trazem a lista de pessoas para "Quem pediu"
  const op = amb.ctx.Atividades_apiOpcoes('s_tec', {});
  assert.ok(op.pessoas.some((p) => p.id === 'u_ga')); assert.ok(!op.pessoas.some((p) => p.id === 'u_tec')); assert.equal(op.motivoPrioridade, pri);
});

test('datas absurdas: ano fora de [ano atual - 1, ano atual + 2], início depois do prazo e nova data no passado são barrados com o que fazer', () => {
  const amb = ambiente();
  const criar = (p) => amb.ctx.Atividades_apiCriar('s_gt', Object.assign({ titulo: 'Teste de datas', responsavelId: 'u_tec', prazo: '2026-10-23T18:00' }, p));
  let r = criar({ inicioPrevisto: '2023-10-19T08:00' });
  assert.equal(r.ok, false); assert.match(r.message, /Início previsto \(19\/10\/2023 08:00\) está com o ano 2023, fora do período aceito \(2025 a 2028\).*Corrija o ano/);
  assert.match(criar({ prazo: '2029-01-10T18:00' }).message, /ano 2029, fora do período aceito \(2025 a 2028\)/);
  assert.match(criar({ prazo: '2024-12-31T18:00' }).message, /ano 2024/);
  assert.equal(criar({ prazo: '2025-01-02T18:00' }).ok, true, 'ano anterior ainda vale');
  assert.equal(criar({ prazo: '2028-12-30T18:00' }).ok, true, 'até dois anos à frente vale');
  assert.match(criar({ inicioPrevisto: '2026-10-25T08:00' }).message, /início previsto \(25\/10\/2026 08:00\) está depois do prazo \(23\/10\/2026 18:00\).*não pode começar depois de terminar/);
  // edição: barra o valor novo; registro antigo com ano errado não impede mudar outro campo
  const ok = criar({});
  assert.equal(ok.ok, true, ok.message);
  assert.match(amb.ctx.Atividades_apiEditar('s_gt', { id: ok.item.ID, inicioPrevisto: '2023-10-19T08:00' }).message, /ano 2023/);
  linha(amb, ok.item.ID).INICIO_PREVISTO = '2023-10-19T08:00'; // como o caso real, gravado antes da trava
  assert.equal(amb.ctx.Atividades_apiEditar('s_gt', { id: ok.item.ID, titulo: 'Teste de datas (corrigido)', inicioPrevisto: '2023-10-19T08:00' }).ok, true);
  // pedido de nova data: no passado e com ano fora do período
  const id = vencidaDoTiago(amb);
  assert.match(pedir(amb, id, { novaPrevisao: '2026-10-19T09:30' }).message, /a nova data \(19\/10\/2026 09:30\) já passou\. A data proposta precisa ser depois de agora/);
  assert.match(pedir(amb, id, { novaPrevisao: '2030-10-21T18:00' }).message, /Nova data \(21\/10\/2030 18:00\) está com o ano 2030/);
  assert.match(pedir(amb, id, { novaPrevisao: '' }).message, /a nova data não foi informada/);
  assert.equal(linha(amb, id).PEDIDO_SITUACAO || '', '', 'nada foi gravado nas tentativas barradas');
});

test('compatibilidade: justificativas antigas continuam no histórico e nos números; atividade lançada pela própria pessoa ou por rotina do sistema muda na hora', () => {
  const amb = ambiente();
  // linha antiga, sem as colunas novas, com 6 justificativas (como o caso real) e o motivo com o nome antigo
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'antiga', TITULO: 'Finalização lavadora e autoclave (teste)', RESPONSAVEL_ID: 'u_tec', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', CRIADO_POR_ID: 'u_dir', CRIADO_POR_NOME: 'DORA DIRETORA TESTE',
    PRAZO: '2026-10-16T18:00', PREVISAO_ATUAL: '2026-10-18T18:00', SITUACAO: 'Em andamento', PRIORIDADE: 'Normal', QTD_JUSTIFICATIVAS: 6 });
  for (let i = 1; i <= 6; i++) amb.tabelas.ATV_HISTORICO.push({ ID: 'hj' + i, ATIVIDADE_ID: 'antiga', TIPO: 'JUSTIFICATIVA', USUARIO_ID: 'u_tec', USUARIO_NOME: 'TIAGO TECNICO TESTE', DATA: '2026-10-1' + (2 + i) + 'T18:10', TEXTO: 'Relatório do dia ' + i + ' de teste.', CATEGORIA: 'Outra prioridade definida pela gestão', PREVISAO_ANTERIOR: '', PREVISAO_NOVA: '2026-10-18T18:00' });
  const det = amb.ctx.Atividades_apiDetalhe('s_tec', { id: 'antiga' });
  assert.equal(det.ok, true, det.message);
  assert.equal(det.item.PEDIDO_SITUACAO, ''); assert.equal(det.item.QTD_JUSTIFICATIVAS, 6);
  assert.equal(det.historico.filter((h) => h.TIPO === 'JUSTIFICATIVA').length, 6);
  assert.equal(det.item.AGIR.codigo, 'JUSTIFICAR');
  amb.ctx.Ges_sincronizar_();
  assert.ok(!caixaDe(amb, 's_dir', 'todas').itens.some((i) => i.tipo === 'atividade_justificativa'), 'as 6 antigas não viram itens');
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_dir', {}).indicadores.porMotivo.find((m) => m.motivo === 'Outra prioridade, a pedido de alguém').qtd, 6);
  // o pedido novo na linha antiga funciona e conta a 7ª vez
  assert.equal(pedir(amb, 'antiga').ok, true);
  assert.equal(linha(amb, 'antiga').QTD_JUSTIFICATIVAS, 7); assert.equal(linha(amb, 'antiga').PEDIDO_DECISOR_ID, 'u_dir');
  amb.ctx.Ges_sincronizar_();
  assert.match(caixaDe(amb, 's_dir').itens.find((i) => i.id === 'ATV:PEDIDO:antiga').detalhe, /é a 7ª vez que a data desta atividade é adiada/);
  // lançada pela própria pessoa: a nova data vale na hora, sem pedido e sem item na caixa
  amb.mudar('2026-10-19T08:00:00-03:00');
  const propria = amb.ctx.Atividades_apiCriar('s_met', { titulo: 'Atividade da própria Mara', prazo: '2026-10-19T09:00' });
  amb.mudar('2026-10-19T10:00:00-03:00');
  const d = amb.ctx.Atividades_apiDetalhe('s_met', { id: propria.item.ID });
  assert.equal(d.decisor.direto, true);
  const rp = amb.ctx.Atividades_apiJustificar('s_met', { id: propria.item.ID, categoria: 'Outro motivo', motivo: 'Precisei refazer a medição de teste.', novaPrevisao: '2026-10-20T18:00' });
  assert.equal(rp.ok, true, rp.message); assert.match(rp.message, /vale na hora/);
  assert.equal(linha(amb, propria.item.ID).PREVISAO_ATUAL, '2026-10-20T18:00'); assert.equal(linha(amb, propria.item.ID).PEDIDO_SITUACAO, 'ACEITO');
  assert.equal(amb.tabelas.ATV_HISTORICO.find((h) => h.ATIVIDADE_ID === propria.item.ID && h.TIPO === 'JUSTIFICATIVA').PARA, 'APLICADA');
  // lançada por rotina do sistema (identificação fora do cadastro de usuários): também na hora, como antes
  amb.tabelas.ATV_ATIVIDADES.push({ ID: 'rotina', TITULO: 'Retornar ao cliente de teste', RESPONSAVEL_ID: 'u_tec', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', CRIADO_POR_ID: 'COMERCIAL', CRIADO_POR_NOME: 'Comercial (rotina)',
    PRAZO: '2026-10-19T09:00', PREVISAO_ATUAL: '2026-10-19T09:00', SITUACAO: 'A fazer', PRIORIDADE: 'Normal' });
  assert.equal(pedir(amb, 'rotina').ok, true);
  assert.equal(linha(amb, 'rotina').PREVISAO_ATUAL, '2026-10-21T18:00');
  // a ponte do COMMAND decide com as mesmas regras
  const pc = amb.ponte('atividades.decidir', { sgoUsuarioId: 'u_dir', payload: { id: 'antiga', decisao: 'ACEITAR' } });
  assert.equal(pc.ok, true, pc.message || pc.erro);
  assert.equal(linha(amb, 'antiga').PREVISAO_ATUAL, '2026-10-21T18:00');
});

test('concluir, cancelar ou replanejar encerra o pedido aberto (sai da caixa); andamento do dia fica no histórico sem pedir data nem ir para a gestão', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  // andamento do dia: relatório técnico, não pedido
  assert.match(amb.ctx.Atividades_apiAndamento('s_tec', { id, texto: 'curto' }).message, /mínimo 10 letras/);
  assert.match(amb.ctx.Atividades_apiAndamento('s_tec', { id, percentual: '120' }).message, /entre 0 e 100/);
  assert.match(amb.ctx.Atividades_apiAndamento('s_met', { id, texto: 'Tentativa de quem só acompanha' }).message, /só o responsável/);
  const avisosAntes = avisos(amb, 'u_gt').length;
  const an = amb.ctx.Atividades_apiAndamento('s_tec', { id, texto: 'Montei o painel e testei a bomba; falta a calibração do sensor.', percentual: '60' });
  assert.equal(an.ok, true, an.message);
  assert.equal(linha(amb, id).PERCENTUAL, 60);
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id && h.TIPO === 'ANDAMENTO' && h.PARA === '60%' && /calibração do sensor/.test(h.TEXTO)));
  assert.equal(avisos(amb, 'u_gt').length, avisosAntes, 'o andamento não avisa nem cobra a gestão');
  assert.equal(linha(amb, id).PEDIDO_SITUACAO || '', '');
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 1, 'andamento não tira a cobrança do atraso');
  // concluir com pedido aberto
  assert.equal(pedir(amb, id).ok, true);
  amb.ctx.Ges_sincronizar_();
  assert.equal(amb.ctx.Atividades_apiMudarSituacao('s_tec', { id, situacao: 'Concluída', observacao: '' }).ok, true);
  assert.equal(linha(amb, id).PEDIDO_SITUACAO, 'ENCERRADO');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id && h.TIPO === 'PEDIDO_ENCERRADO' && /concluída/.test(h.TEXTO)));
  assert.ok(!caixaDe(amb, 's_gt', 'todas').itens.some((i) => i.id === 'ATV:PEDIDO:' + id));
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'ACEITAR' }).message, /foi encerrado/);
  // replanejamento da gestão com pedido aberto
  const id2 = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id2).ok, true);
  assert.equal(amb.ctx.Atividades_apiEditar('s_gt', { id: id2, prazo: '2026-10-22T18:00' }).ok, true);
  assert.equal(linha(amb, id2).PEDIDO_SITUACAO, 'ENCERRADO');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id2 && h.TIPO === 'PEDIDO_ENCERRADO' && /replanejou o prazo para 22\/10\/2026 18:00/.test(h.TEXTO)));
  assert.equal(agirDe(amb, 's_tec', id2).frase, 'Nada a fazer agora');
});

// ------------------------------------------------------------------ revisão 01/11/2026
test('revisão: trocar o responsável com pedido pendente encerra o pedido; o novo responsável é cobrado e a caixa não fica com um pedido órfão', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id).ok, true);
  amb.ctx.Ges_sincronizar_();
  // passa para quem lançou (Gil): antes o pedido seguia PENDENTE e o Gil, agora responsável, não podia mais decidir
  const r = amb.ctx.Atividades_apiEditar('s_gt', { id, responsavelId: 'u_gt' });
  assert.equal(r.ok, true, r.message);
  const a = linha(amb, id);
  assert.equal(a.PEDIDO_SITUACAO, 'ENCERRADO');
  assert.ok(amb.tabelas.ATV_HISTORICO.some((h) => h.ATIVIDADE_ID === id && h.TIPO === 'PEDIDO_ENCERRADO' && /passou a atividade para GIL GESTOR TESTE/.test(h.TEXTO)));
  assert.equal(amb.ctx.Atividades_vencida_(amb.ctx.Atividades_obter_(id), amb.ctx.Atividades_agora_()), true, 'o novo responsável volta a ser cobrado');
  assert.equal(agirDe(amb, 's_gt', id).codigo, 'JUSTIFICAR');
  amb.ctx.Ges_sincronizar_();
  assert.ok(!caixaDe(amb, 's_dir', 'todas').itens.some((i) => i.id === 'ATV:PEDIDO:' + id), 'o item do pedido sai da caixa');
  // troca de responsável e de prazo juntas: uma linha de histórico só, com as duas causas
  const id2 = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id2).ok, true);
  assert.equal(amb.ctx.Atividades_apiEditar('s_gt', { id: id2, responsavelId: 'u_met', prazo: '2026-10-22T18:00' }).ok, true);
  const enc = amb.tabelas.ATV_HISTORICO.filter((h) => h.ATIVIDADE_ID === id2 && h.TIPO === 'PEDIDO_ENCERRADO');
  assert.equal(enc.length, 1); assert.match(enc[0].TEXTO, /replanejou o prazo para 22\/10\/2026 18:00 e passou a atividade para MARA METROLOGIA TESTE\./);
});

test('revisão: data proposta que passou sem decisão: o decisor vê só "Recusar" (aceitar é barrado) e o responsável é orientado a mudar o pedido', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb);
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-19T16:00' }).ok, true);
  const antes = agirDe(amb, 's_gt', id);
  assert.equal(antes.dataPassou, undefined); assert.match(antes.frase, /aceitar ou recusar/);
  amb.mudar('2026-10-20T09:00:00-03:00');
  const ag = agirDe(amb, 's_gt', id);
  assert.equal(ag.codigo, 'DECIDIR'); assert.equal(ag.dataPassou, true);
  assert.equal(ag.frase, 'Você precisa: recusar ou replanejar a nova data proposta por TIAGO TECNICO TESTE');
  assert.match(ag.detalhe, /A data proposta \(19\/10\/2026 16:00\) já passou sem decisão e não pode mais ser aceita\. Recuse com o motivo/);
  const tec = agirDe(amb, 's_tec', id);
  assert.equal(tec.codigo, 'AGUARDANDO'); assert.match(tec.detalhe, /A data que você propôs \(19\/10\/2026 16:00\) já passou e ainda não houve decisão\. Se precisar de mais tempo, toque em "Mudar o pedido"/);
  amb.ctx.Ges_sincronizar_();
  const it = caixaDe(amb, 's_gt').itens.find((i) => i.id === 'ATV:PEDIDO:' + id);
  assert.equal(it.pedido.passou, true);
  assert.match(it.oQueFazer, /já passou sem decisão e não pode mais ser aceita\. Toque em "Recusar"/);
  // o responsável muda o pedido para uma data futura: volta a poder ser aceito
  assert.equal(pedir(amb, id, { novaPrevisao: '2026-10-21T18:00' }).ok, true);
  assert.equal(agirDe(amb, 's_gt', id).dataPassou, undefined);
  amb.ctx.Ges_sincronizar_();
  assert.equal(caixaDe(amb, 's_gt').itens.find((i) => i.id === 'ATV:PEDIDO:' + id).pedido.passou, false);
});

test('revisão: a janela de cobrança traz RESPONSAVEL_ID (Concluir diz "sua lista") e a atrasada com pedido pendente não entra em "vence hoje"', () => {
  const amb = ambiente();
  const id = vencidaDoTiago(amb); // previsão 19/10 09:00, agora 19/10 10:00
  const v1 = amb.ctx.Atividades_apiVerificar('s_tec', {});
  assert.equal(v1.pendentes[0].RESPONSAVEL_ID, 'u_tec');
  assert.equal(pedir(amb, id).ok, true);
  const v2 = amb.ctx.Atividades_apiVerificar('s_tec', {});
  assert.equal(v2.pendentes.length, 0);
  assert.ok(!v2.venceHoje.some((x) => x.ID === id), 'já venceu às 09:00: não "vence hoje"');
});

test('revisão: os textos de cobrança usam o pedido de nova data (sem "justificativa com a nova previsão")', () => {
  const amb = ambiente();
  vencidaDoTiago(amb);
  amb.ctx.Atividades_rotinaAtrasos();
  const av = avisos(amb, 'u_tec', 'ATRASO');
  assert.equal(av.length, 1);
  assert.match(av[0].TEXTO, /Peça nova data \(motivo e data proposta\) em Minhas atividades ou, se já terminou, conclua/);
  assert.ok(!/justificativa/i.test(av[0].TEXTO));
  assert.match(amb.ctx.PEND_TIPOS.atividade_atrasada.fazer, /peça nova data/);
});

test('revisão: quem lançou e não é da gestão não decide o pedido (a decisão vai para a gestão), como diz o manual', () => {
  const amb = ambiente();
  amb.mudar('2026-10-19T08:00:00-03:00');
  const c = amb.ctx.Atividades_apiCriar('s_met', { titulo: 'Atividade da Mara passada ao Tiago', prazo: '2026-10-19T09:00' });
  assert.equal(c.ok, true, c.message);
  const id = c.item.ID;
  assert.equal(amb.ctx.Atividades_apiEditar('s_gt', { id, responsavelId: 'u_tec' }).ok, true);
  amb.mudar('2026-10-19T10:00:00-03:00');
  const r = pedir(amb, id);
  assert.equal(r.ok, true, r.message);
  assert.match(r.message, /Agora a gestão aceita ou recusa/);
  assert.equal(linha(amb, id).PEDIDO_DECISOR_ID || '', '');
  assert.equal(agirDe(amb, 's_met', id).codigo, 'NADA', 'a colega que lançou só acompanha');
  assert.match(amb.ctx.Atividades_apiDecidirPedido('s_met', { id, decisao: 'ACEITAR' }).message, /ou pela gestão/);
  assert.equal(agirDe(amb, 's_gt', id).codigo, 'DECIDIR');
  assert.equal(amb.ctx.Atividades_apiDecidirPedido('s_gt', { id, decisao: 'ACEITAR' }).ok, true);
});
