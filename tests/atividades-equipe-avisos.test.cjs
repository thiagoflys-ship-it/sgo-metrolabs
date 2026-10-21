// Minhas atividades (19/10/2026): equipe inteira vê (só envolvidos e gestão alteram), COMMAND pela ponte
// assinada (uma fonte só), cobrança persistente no sistema, e-mail só no expediente e WhatsApp sutil
// (no máximo um resumo por pessoa por dia, dia útil, horário de trabalho, vínculo liberado).
// Código real do SGO+ num contexto isolado, com tabelas em memória e relógio controlado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

// segunda-feira, 19/10/2026 10:00 em Brasília
const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00');
const em = (iso) => Date.parse(iso);

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG_10H };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = Object.assign({
    CAD_USUARIOS: [
      { ID: 'u_ges', USUARIO: 'gil', NOME: 'GIL GESTOR', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', CELULAR: '62999990001', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', CELULAR: '62999990002', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', CELULAR: '62999990003', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_pj', USUARIO: 'paulo', NOME: 'PAULO PJ', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'paulo@exemplo.test', CELULAR: '62999990004', VINCULO_TRABALHO: 'PJ' },
      { ID: 'u_sem', USUARIO: 'sara', NOME: 'SARA SEM VINCULO', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'sara@exemplo.test', CELULAR: '62999990005', VINCULO_TRABALHO: '' },
      { ID: 'u_adm', USUARIO: 'ana', NOME: 'ANA ADMIN', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'ana@exemplo.test', CELULAR: '', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_cli', USUARIO: 'cli', NOME: 'CLIENTE EXEMPLO', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'cli@exemplo.test' },
      { ID: 'u_ina', USUARIO: 'ina', NOME: 'INATIVO', PERFIL: 'TECNICO', STATUS: 'INATIVO' }
    ],
    CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_CONDUTORES: [], CAD_TECNICOS: [],
    ATV_ATIVIDADES: [], ATV_HISTORICO: [], ATV_AVISOS: [], ATV_RESUMOS: [], NTF_ENVIOS: [], qual_plano_acao: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({ META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', PONTE_COMMAND_SEGREDO: 'segredo-da-ponte' }, o.props || {});
  const cache = {}, emails = [], whats = [];
  const sessoes = {
    s_ges: { userId: 'u_ges', usuario: 'gil', nome: 'GIL GESTOR', perfil: 'GESTOR' },
    s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO', perfil: 'TECNICO' },
    s_met: { userId: 'u_met', usuario: 'mara', nome: 'MARA METROLOGIA', perfil: 'METROLOGIA' },
    s_adm: { userId: 'u_adm', usuario: 'ana', nome: 'ANA ADMIN', perfil: 'ADMIN' },
    s_cli: { userId: 'u_cli', usuario: 'cli', nome: 'CLIENTE EXEMPLO', perfil: 'CLIENTE' }
  };
  const utilities = criarUtilities({
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt,
    Utilities: utilities, Session: Object.assign(criarSession(), { getActiveUser: () => ({ getEmail: () => 'dono@exemplo.test' }) }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }) }) }), getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    UrlFetchApp: { fetch: (url, op) => { whats.push({ url, corpo: JSON.parse(op.payload) }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + whats.length }] }) }; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t }) },
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
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    SGO_execucaoInterna_: () => true
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Notificar.js', 'SGO_Atividades.js', 'SGO_Atividades_Avisos.js', 'SGO_PonteCommand.js', 'SGO_Alertas_Central.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8'), ctx, { filename: f });
  }
  const ponte = (acao, dados, extra) => {
    const ts = (extra && extra.ts) || relogio.agora;
    const segredo = (extra && extra.segredo) || props.PONTE_COMMAND_SEGREDO;
    const ass = crypto.createHmac('sha256', segredo).update(String(ts) + '|' + acao + '|' + JSON.stringify(dados || {}), 'utf8').digest('hex');
    return ctx.PonteCmd_tratar_({ acao, dados, ts, usuario: 'login-command', assinatura: (extra && extra.assinatura) || ass });
  };
  const amanha18 = '2026-10-20T18:00';
  return { ctx, tabelas, props, cache, emails, whats, relogio, ponte, amanha18 };
}

const criar = (amb, sid, p) => {
  const r = amb.ctx.Atividades_apiCriar(sid, Object.assign({ titulo: 'Atividade de teste', prazo: amb.amanha18 }, p || {}));
  assert.equal(r.ok, true, r.message);
  return r.item;
};

// ------------------------------------------------------------------ expediente
test('expediente: dia útil, horário, fim de semana, feriados fixos e móveis, feriado cadastrado', () => {
  const amb = ambiente();
  const d = (iso) => amb.ctx.SGO_dentroDoExpediente_(new Date(em(iso)));
  assert.equal(d('2026-10-19T10:00:00-03:00').dentro, true);
  assert.equal(d('2026-10-19T07:59:00-03:00').dentro, false);
  assert.match(d('2026-10-19T17:30:00-03:00').motivo, /depois do fim/);
  assert.match(d('2026-10-24T10:00:00-03:00').motivo, /sábado/);
  assert.match(d('2026-10-25T10:00:00-03:00').motivo, /domingo/);
  assert.match(d('2026-10-12T10:00:00-03:00').motivo, /feriado nacional/); // N. Sra. Aparecida (segunda)
  assert.equal(d('2027-02-08T10:00:00-03:00').dentro, false); // Carnaval 2027 (segunda)
  assert.equal(d('2026-04-03T10:00:00-03:00').dentro, false); // Sexta-feira Santa 2026
  assert.equal(d('2026-06-04T10:00:00-03:00').dentro, false); // Corpus Christi 2026
  // fuso: 02:00 UTC de terça é 23:00 de segunda em Brasília (fora do horário), não 02:00 de terça
  assert.match(d('2026-10-20T02:00:00Z').motivo, /depois do fim/);
  amb.ctx.SGO_expedienteGravar_({ ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '24/10, 21/10/2026' });
  assert.match(d('2026-10-21T10:00:00-03:00').motivo, /feriado cadastrado/);
  assert.throws(() => amb.ctx.SGO_expedienteGravar_({ ini: '18:00', fim: '08:00', dias: [1] }), /início antes do fim/);
  assert.throws(() => amb.ctx.SGO_expedienteGravar_({ ini: '08:00', fim: '18:00', dias: [1], feriados: '32/13' }), /formato dd\/mm/);
});

// ------------------------------------------------------------------ WhatsApp: limite diário e janela
test('WhatsApp de atividades: no máximo uma mensagem por pessoa por dia (o notificador barra a segunda)', () => {
  const amb = ambiente();
  const enviar = () => amb.ctx.SGO_notificar_({ usuarios: ['u_tec'], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'r' + Math.random(), titulo: 'Resumo', texto: 'x',
    modelo: { nome: 'sgo_atividade_atribuida', parametros: ['@NOME', 'Atividade', '20/10/2026 18:00', '@LINK'] } });
  assert.equal(enviar().ok, 1);
  const r2 = enviar();
  assert.equal(r2.ok, 0); assert.equal(r2.pulado, 1);
  assert.match(r2.motivo, /uma mensagem de atividades por dia/);
  assert.equal(amb.whats.length, 1);
  // dia seguinte (terça, 10h): libera de novo
  amb.relogio.agora = em('2026-10-20T10:00:00-03:00');
  assert.equal(enviar().ok, 1);
  assert.equal(amb.whats.length, 2);
  // outra categoria (ex.: Avisos) não entra na conta das atividades
  const outro = amb.ctx.SGO_notificar_({ usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'AVISOS', refId: 'av1', titulo: 'Aviso', texto: 'y' });
  assert.equal(outro.ok, 1);
});

test('WhatsApp de atividades: só em dia útil e no horário; nunca à noite, fim de semana ou feriado', () => {
  for (const [iso, motivo] of [['2026-10-19T20:00:00-03:00', /fora do expediente.*depois do fim/], ['2026-10-19T06:30:00-03:00', /antes do início/],
    ['2026-10-24T10:00:00-03:00', /sábado/], ['2026-10-25T10:00:00-03:00', /domingo/], ['2026-11-02T10:00:00-03:00', /feriado/]]) {
    const amb = ambiente({ agora: em(iso) });
    const r = amb.ctx.SGO_notificar_({ usuarios: ['u_tec'], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'x', titulo: 'Resumo', texto: 'x',
      modelo: { nome: 'sgo_atividade_atribuida', parametros: ['@NOME', 'A', 'B', '@LINK'] } });
    assert.equal(r.ok, 0, iso); assert.match(r.motivo, motivo, iso);
    assert.equal(amb.whats.length, 0);
  }
});

test('WhatsApp de atividades: PJ e vínculo vazio não recebem (padrão só CLT); a configuração pode incluir', () => {
  const amb = ambiente();
  const enviar = (uid) => amb.ctx.SGO_notificar_({ usuarios: [uid], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'x' + uid, titulo: 'Resumo', texto: 'x',
    modelo: { nome: 'sgo_atividade_atribuida', parametros: ['@NOME', 'A', 'B', '@LINK'] } });
  let r = enviar('u_pj'); assert.equal(r.ok, 0); assert.match(r.motivo, /^PJ/);
  r = enviar('u_sem'); assert.equal(r.ok, 0); assert.match(r.motivo, /vínculo de trabalho não informado/);
  amb.props.ATV_AVISOS_CFG = JSON.stringify({ whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT', 'PJ'] });
  assert.equal(enviar('u_pj').ok, 1);
  assert.equal(enviar('u_sem').ok, 0);
  // categoria PONTO segue a regra própria; mensagem sem categoria não é afetada
  assert.equal(amb.ctx.SGO_notificar_({ usuarios: ['u_sem'], canais: ['whatsapp'], origem: 'AVISOS', refId: 'a', titulo: 'Aviso', texto: 'z' }).ok, 1);
});

// ------------------------------------------------------------------ resumo do dia
test('resumo do dia: avaliado uma vez por dia por pessoa, com modelo aprovado de reserva e só com novidade', () => {
  const amb = ambiente({ agora: em('2026-10-19T08:30:00-03:00') });
  criar(amb, 's_ges', { titulo: 'Calibrar estufa', responsavelId: 'u_tec' });
  criar(amb, 's_ges', { titulo: 'Emitir certificado', responsavelId: 'u_tec' });
  assert.equal(amb.whats.length, 0, 'lançar atividade não manda WhatsApp na hora');
  // 08:30: antes da hora do resumo (09:00) nada é avaliado
  assert.match(amb.ctx.Atividades_resumoDiario_().fora, /antes da hora do resumo/);
  amb.relogio.agora = em('2026-10-19T09:10:00-03:00');
  const r1 = amb.ctx.Atividades_resumoDiario_();
  assert.equal(r1.enviados, 1);
  assert.equal(amb.whats.length, 1);
  const msg = amb.whats[0].corpo;
  assert.equal(msg.template.name, 'sgo_atividade_atribuida'); // modelo próprio ainda não aprovado
  assert.match(msg.template.components[0].parameters[1].text, /e mais 1 atividade nova/);
  const tiago = amb.tabelas.ATV_RESUMOS.find((x) => x.USUARIO_ID === 'u_tec');
  assert.equal(tiago.SITUACAO, 'ENVIADO'); assert.equal(Number(tiago.NOVAS), 2);
  assert.equal(amb.tabelas.ATV_RESUMOS.find((x) => x.USUARIO_ID === 'u_met').SITUACAO, 'SEM_NOVIDADE');
  // nova rodada no mesmo dia, mesmo com novidade: ninguém é avaliado de novo
  amb.relogio.agora = em('2026-10-19T11:00:00-03:00');
  criar(amb, 's_ges', { titulo: 'Outra atividade', responsavelId: 'u_met' });
  assert.equal(amb.ctx.Atividades_resumoDiario_().avaliados, 0);
  assert.equal(amb.whats.length, 1);
  // terça 09:10 (modelo próprio aprovado): Mara tem 1 nova; as 2 do Tiago não contam de novo como novas, mas vencem hoje
  amb.relogio.agora = em('2026-10-20T09:10:00-03:00');
  amb.props.ATV_RESUMO_MODELO_APROVADO = 'SIM';
  amb.ctx.Atividades_resumoDiario_();
  assert.equal(amb.whats.length, 3);
  const param = (w) => w.corpo.template.components[0].parameters.map((p) => p.text).slice(1, 4);
  const paraMara = amb.whats.slice(1).find((w) => w.corpo.to === '5562999990003');
  const paraTiago = amb.whats.slice(1).find((w) => w.corpo.to === '5562999990002');
  assert.equal(paraMara.corpo.template.name, 'sgo_atividades_resumo_dia');
  assert.deepEqual(param(paraMara), ['1', '1', '0']); // nova e vence hoje (prazo terça 18h)
  assert.deepEqual(param(paraTiago), ['0', '2', '0']);
  // quarta: as atividades venceram ontem às 18h, depois do último resumo -> o atraso entra uma vez
  amb.relogio.agora = em('2026-10-21T09:10:00-03:00');
  amb.ctx.Atividades_resumoDiario_();
  assert.equal(amb.whats.length, 5);
  assert.deepEqual(param(amb.whats.slice(3).find((w) => w.corpo.to === '5562999990002')), ['0', '0', '2']);
  assert.deepEqual(param(amb.whats.slice(3).find((w) => w.corpo.to === '5562999990003')), ['0', '0', '1']);
  amb.relogio.agora = em('2026-10-22T09:10:00-03:00');
  amb.ctx.Atividades_resumoDiario_();
  assert.equal(amb.whats.length, 5, 'atraso já resumido não volta pelo WhatsApp');
  const doDia = amb.tabelas.ATV_RESUMOS.filter((x) => x.DIA === '2026-10-22');
  assert.ok(doDia.every((x) => x.SITUACAO === 'SEM_NOVIDADE'));
  // sábado: nada é avaliado
  amb.relogio.agora = em('2026-10-24T10:00:00-03:00');
  assert.match(amb.ctx.Atividades_resumoDiario_().fora, /sábado/);
});

test('resumo do dia: atraso vira mensagem uma vez; atraso que continua não é cobrado de novo pelo WhatsApp', () => {
  const amb = ambiente({ agora: em('2026-10-19T09:30:00-03:00') });
  const a = criar(amb, 's_tec', { titulo: 'Relatório da autoclave', prazo: '2026-10-19T12:00' });
  amb.ctx.Atividades_resumoDiario_(); // segunda: vence hoje -> modelo de reserva não cobre "vence hoje": não manda
  assert.equal(amb.whats.length, 0);
  assert.match(amb.tabelas.ATV_RESUMOS.find((x) => x.USUARIO_ID === 'u_tec').MOTIVO, /ainda não foi aprovado/);
  amb.relogio.agora = em('2026-10-20T09:30:00-03:00'); // terça: venceu desde o último resumo
  amb.ctx.Atividades_resumoDiario_();
  assert.equal(amb.whats.length, 1);
  assert.equal(amb.whats[0].corpo.template.name, 'sgo_atividade_atrasada');
  amb.relogio.agora = em('2026-10-21T09:30:00-03:00'); // quarta: continua vencida, mas já foi resumida
  amb.ctx.Atividades_resumoDiario_();
  assert.equal(amb.whats.length, 1);
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 1, 'no sistema a cobrança continua');
  assert.ok(a.ID);
});

// ------------------------------------------------------------------ cobrança persistente
test('cobrança persistente: atividade vencida segue na janela e na central até ser concluída ou justificada', () => {
  const amb = ambiente({ agora: em('2026-10-19T09:00:00-03:00') });
  const a = criar(amb, 's_ges', { titulo: 'Trocar padrão', responsavelId: 'u_tec', prazo: '2026-10-19T12:00' });
  const b = criar(amb, 's_ges', { titulo: 'Ligar para o cliente', responsavelId: 'u_tec', prazo: '2026-10-19T12:00' });
  amb.relogio.agora = em('2026-10-19T15:00:00-03:00');
  const central = () => { const itens = []; amb.ctx.Pend_fonteAtividades_((i) => itens.push(i), { userId: 'u_tec', nome: 'TIAGO', interno: false }); return itens.filter((i) => i.tipo === 'atividade_atrasada').map((i) => i.id); };
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 2);
  assert.deepEqual(central().sort(), ['ATV:' + a.ID, 'ATV:' + b.ID].sort());
  // horas depois continua cobrando (nada some sozinho)
  amb.relogio.agora = em('2026-10-20T15:00:00-03:00');
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 2);
  // justificar exige o motivo escolhido na lista
  let r = amb.ctx.Atividades_apiJustificar('s_tec', { id: a.ID, motivo: 'Aguardando a peça chegar do fornecedor', novaPrevisao: '2026-10-22T18:00' });
  assert.equal(r.ok, false); assert.match(r.message, /escolha o motivo do atraso/);
  r = amb.ctx.Atividades_apiJustificar('s_tec', { id: a.ID, motivo: 'Aguardando a peça chegar do fornecedor', novaPrevisao: '2026-10-22T18:00', categoria: 'Aguardando peça ou material' });
  assert.equal(r.ok, true, r.message);
  assert.equal(amb.ctx.Atividades_apiMudarSituacao('s_tec', { id: b.ID, situacao: 'Concluída', observacao: '' }).ok, true);
  assert.equal(amb.ctx.Atividades_apiVerificar('s_tec', {}).pendentes.length, 0);
  assert.deepEqual(central(), []);
  // indicadores: justificativa por motivo
  const eq = amb.ctx.Atividades_apiPainelEquipe('s_ges', {});
  assert.deepEqual(JSON.parse(JSON.stringify(eq.indicadores.porMotivo)), [{ motivo: 'Aguardando peça ou material', qtd: 1 }]);
});

// ------------------------------------------------------------------ e-mail no expediente
test('e-mail de atividade: dentro do horário sai na hora; fora dele fica guardado e sai num e-mail só na abertura do expediente', () => {
  const amb = ambiente({ agora: em('2026-10-19T10:00:00-03:00') });
  criar(amb, 's_ges', { titulo: 'Dentro do horário', responsavelId: 'u_tec' });
  assert.equal(amb.emails.length, 1);
  assert.equal(amb.emails[0].to, 'tiago@exemplo.test');
  amb.relogio.agora = em('2026-10-19T21:00:00-03:00');
  criar(amb, 's_ges', { titulo: 'Fora do horário 1', responsavelId: 'u_tec' });
  criar(amb, 's_ges', { titulo: 'Fora do horário 2', responsavelId: 'u_tec' });
  assert.equal(amb.emails.length, 1, 'à noite nada sai');
  assert.equal(amb.tabelas.ATV_AVISOS.filter((v) => v.EMAIL_SITUACAO === 'PENDENTE').length, 2);
  amb.relogio.agora = em('2026-10-20T08:05:00-03:00');
  amb.ctx.Atividades_rotinaAtrasos();
  assert.equal(amb.emails.length, 2);
  assert.match(amb.emails[1].subject, /Avisos de atividades \(2\)/);
  assert.equal(amb.tabelas.ATV_AVISOS.filter((v) => v.EMAIL_SITUACAO === 'PENDENTE').length, 0);
  amb.ctx.Atividades_rotinaAtrasos();
  assert.equal(amb.emails.length, 2, 'não repete');
  assert.equal(amb.whats.filter((w) => w.corpo.template && /atribuida|resumo/.test(w.corpo.template.name)).length, 0, 'antes das 09:00 o resumo não sai');
});

// ------------------------------------------------------------------ quem vê, quem altera
test('equipe: todos veem (menos restritas e do Conduta); só responsável, quem lançou e gestão alteram; cliente nunca vê', () => {
  const amb = ambiente();
  const daTec = criar(amb, 's_ges', { titulo: 'Atividade do Tiago', responsavelId: 'u_tec' });
  const restrita = criar(amb, 's_ges', { titulo: 'Assunto reservado', responsavelId: 'u_tec', restrita: true });
  const conduta = criar(amb, 's_ges', { titulo: 'PA-2026-001: ação do plano', responsavelId: 'u_tec', modulo: 'conduta', moduloNome: 'Programa de conduta' });
  // Mara (Metrologia) vê a equipe, sem as restritas
  const eqMara = amb.ctx.Atividades_apiPainelEquipe('s_met', {});
  assert.equal(eqMara.ok, true, eqMara.message);
  const ids = eqMara.itens.map((i) => i.ID);
  assert.ok(ids.includes(daTec.ID)); assert.ok(!ids.includes(restrita.ID)); assert.ok(!ids.includes(conduta.ID));
  assert.equal(eqMara.itens.find((i) => i.ID === daTec.ID).PODE_ALTERAR, false);
  assert.equal(amb.ctx.Atividades_apiDetalhe('s_met', { id: daTec.ID }).ok, true);
  assert.match(amb.ctx.Atividades_apiDetalhe('s_met', { id: conduta.ID }).message, /restrita/);
  // Mara não altera a do Tiago
  let r = amb.ctx.Atividades_apiMudarSituacao('s_met', { id: daTec.ID, situacao: 'Em andamento' });
  assert.equal(r.ok, false); assert.match(r.message, /só acompanham/);
  assert.equal(amb.ctx.Atividades_apiComentar('s_met', { id: daTec.ID, texto: 'oi' }).ok, false);
  // Tiago (responsável) e Gil (gestão, quem lançou) alteram
  assert.equal(amb.ctx.Atividades_apiMudarSituacao('s_tec', { id: daTec.ID, situacao: 'Em andamento' }).ok, true);
  assert.equal(amb.ctx.Atividades_apiComentar('s_ges', { id: daTec.ID, texto: 'Combinado com o cliente' }).ok, true);
  // gestão vê tudo, inclusive as restritas
  const eqGil = amb.ctx.Atividades_apiPainelEquipe('s_ges', {});
  assert.ok(eqGil.itens.some((i) => i.ID === conduta.ID) && eqGil.itens.some((i) => i.ID === restrita.ID));
  // cliente nunca vê
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_cli', {}).ok, false);
  assert.equal(amb.ctx.Atividades_apiListarModulo('s_cli', { modulo: 'frota' }).ok, false);
  // texto da justificativa só para envolvidos e gestão
  amb.relogio.agora = em('2026-10-21T10:00:00-03:00');
  assert.equal(amb.ctx.Atividades_apiJustificar('s_tec', { id: daTec.ID, motivo: 'Cliente pediu para remarcar a visita', novaPrevisao: '2026-10-23T18:00', categoria: 'Aguardando cliente' }).ok, true);
  const hMara = amb.ctx.Atividades_apiDetalhe('s_met', { id: daTec.ID }).historico.find((h) => h.TIPO === 'JUSTIFICATIVA');
  assert.equal(hMara.TEXTO, ''); assert.equal(hMara.OCULTO, true);
  const hGil = amb.ctx.Atividades_apiDetalhe('s_ges', { id: daTec.ID }).historico.find((h) => h.TIPO === 'JUSTIFICATIVA');
  assert.match(hGil.TEXTO, /remarcar/); assert.equal(hGil.CATEGORIA, 'Aguardando cliente');
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_met', {}).justificativas.length, 0);
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_ges', {}).justificativas.length, 1);
  // só quem lançou (ou gestão) muda a visibilidade
  amb.relogio.agora = SEG_10H;
  const propria = criar(amb, 's_met', { titulo: 'Minha atividade' });
  assert.equal(amb.ctx.Atividades_apiEditar('s_met', { id: propria.ID, restrita: true }).ok, true);
  assert.equal(amb.ctx.Atividades_apiPainelEquipe('s_tec', {}).itens.some((i) => i.ID === propria.ID), false);
});

// ------------------------------------------------------------------ ponte do COMMAND
test('ponte: COMMAND lê e grava com assinatura, em nome do usuário ligado e com as regras do SGO+', () => {
  const amb = ambiente();
  // assinatura errada, segredo errado e pedido velho são recusados
  assert.match(amb.ponte('atividades.minhas', { sgoUsuarioId: 'u_tec', payload: {} }, { assinatura: 'ab'.repeat(32) }).erro, /Assinatura inválida/);
  assert.match(amb.ponte('atividades.minhas', { sgoUsuarioId: 'u_tec', payload: {} }, { segredo: 'outro' }).erro, /Assinatura inválida/);
  assert.match(amb.ponte('atividades.minhas', { sgoUsuarioId: 'u_tec', payload: {} }, { ts: SEG_10H - 10 * 60000 }).erro, /expirado/);
  // conta não ligada, usuário inativo e cliente
  assert.match(amb.ponte('atividades.minhas', { payload: {} }).erro, /não está ligada a um usuário do SGO\+/);
  assert.match(amb.ponte('atividades.minhas', { sgoUsuarioId: 'u_ina', payload: {} }).erro, /inativo/);
  assert.match(amb.ponte('atividades.equipe', { sgoUsuarioId: 'u_cli', payload: {} }).erro, /Cliente/);
  assert.match(amb.ponte('atividades.apagar', { sgoUsuarioId: 'u_tec', payload: {} }).erro, /desconhecida/);
  // técnico lança para si pelo COMMAND: marcado com o sistema de origem
  let r = amb.ponte('atividades.criar', { sgoUsuarioId: 'u_tec', payload: { titulo: 'Preventiva no cliente', prazo: amb.amanha18, modulo: 'cmd_assistencia', moduloNome: 'COMMAND · Assistência Técnica', porQue: 'Contrato de manutenção' } });
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.item.SISTEMA_ORIGEM, 'COMMAND'); assert.equal(r.item.CRIADO_POR_ID, 'u_tec'); assert.equal(r.item.POR_QUE, 'Contrato de manutenção');
  const id = r.item.ID;
  // não lança para outra pessoa (regra do SGO+ vale na ponte)
  r = amb.ponte('atividades.criar', { sgoUsuarioId: 'u_tec', payload: { titulo: 'Para a Mara', prazo: amb.amanha18, responsavelId: 'u_met' } });
  assert.equal(r.ok, false); assert.match(r.erro, /Administrador, Diretoria, Gestor, RH e Financeiro/);
  // a mesma lista nos dois sistemas: aparece no SGO+ para o Tiago e na equipe para a Mara (que não altera)
  assert.ok(amb.ctx.Atividades_apiListarMinhas('s_tec', {}).itens.some((i) => i.ID === id));
  r = amb.ponte('atividades.situacao', { sgoUsuarioId: 'u_met', payload: { id, situacao: 'Concluída' } });
  assert.equal(r.ok, false); assert.match(r.erro, /só acompanham/);
  r = amb.ponte('atividades.equipe', { sgoUsuarioId: 'u_met', payload: {} });
  assert.equal(r.ok, true); assert.equal(r.itens.find((i) => i.ID === id).PODE_ALTERAR, false);
  // gestor pelo COMMAND lança para o técnico; o técnico conclui pelo SGO+
  r = amb.ponte('atividades.criar', { sgoUsuarioId: 'u_ges', payload: { titulo: 'Cotação de peças', prazo: amb.amanha18, responsavelId: 'u_tec' } });
  assert.equal(r.ok, true, r.erro);
  assert.equal(amb.ctx.Atividades_apiMudarSituacao('s_tec', { id: r.item.ID, situacao: 'Concluída', observacao: 'ok' }).ok, true);
  assert.equal(amb.ponte('atividades.detalhe', { sgoUsuarioId: 'u_ges', payload: { id: r.item.ID } }).item.SITUACAO, 'Concluída');
  // o identificador da ponte não serve depois da chamada (o navegador não consegue reaproveitar)
  assert.equal(amb.ctx.ATV_PONTE_CTX, null);
  assert.equal(amb.ctx.Atividades_apiListarMinhas('PONTE-qualquer', {}).ok, false);
  // avisos e justificativa pela ponte (a janela de atraso do COMMAND)
  const v = amb.ponte('atividades.verificar', { sgoUsuarioId: 'u_tec', payload: {} });
  assert.equal(v.ok, true); assert.ok(Array.isArray(v.motivosAtraso) && v.motivosAtraso.length > 3);
});

test('configuração de avisos: só Admin e Diretoria; hora do resumo dentro do horário', () => {
  const amb = ambiente();
  assert.equal(amb.ctx.Atividades_apiConfigAvisos('s_ges', {}).ok, false);
  let r = amb.ctx.Atividades_apiConfigAvisos('s_adm', {});
  assert.equal(r.ok, true); assert.equal(r.avisos.horaResumo, '09:00'); assert.deepEqual(JSON.parse(JSON.stringify(r.avisos.vinculosWhatsapp)), ['CLT']);
  r = amb.ctx.Atividades_apiConfigAvisos('s_adm', { salvar: { expediente: { ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5] }, avisos: { whatsappResumo: true, horaResumo: '18:00', vinculosWhatsapp: ['CLT'] } } });
  assert.equal(r.ok, false); assert.match(r.message, /dentro do horário de trabalho/);
  r = amb.ctx.Atividades_apiConfigAvisos('s_adm', { salvar: { expediente: { ini: '07:30', fim: '17:00', dias: [1, 2, 3, 4, 5], feriados: '20/01' }, avisos: { whatsappResumo: false, horaResumo: '08:00', vinculosWhatsapp: ['CLT', 'PJ'] } } });
  assert.equal(r.ok, true, r.message);
  assert.equal(amb.ctx.SGO_expediente_().fim, '17:00');
  assert.match(amb.ctx.Atividades_resumoDiario_().fora, /desligado/);
});

test('modelo novo do resumo segue as regras da Meta', () => {
  const amb = ambiente();
  assert.deepEqual(Array.from(amb.ctx.Notificar_validarModeloMeta_('sgo_atividades_resumo_dia', amb.ctx.NTF_MODELOS_META.sgo_atividades_resumo_dia)), []);
});
