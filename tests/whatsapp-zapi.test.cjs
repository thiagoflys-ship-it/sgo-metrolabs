// WhatsApp pela Z-API no SGO+ (20/10/2026): escolha do provedor, texto pronto de cada tipo de mensagem (sem modelo),
// envio único com proteção do número (só celular, intervalo, limites, fila do servidor), resumo de atividades sem
// esperar aprovação da Meta e os três botões de Chaves e senhas com a Z-API simulada. Nenhuma mensagem real sai daqui.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00');
const ZAPI = { WHATSAPP_PROVEDOR: 'zapi', ZAPI_INSTANCIA: 'INSTANCIA-TESTE-123', ZAPI_TOKEN: 'TOKEN-TESTE-456', ZAPI_CLIENT_TOKEN: 'CLIENT-TESTE-789' };

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG_10H };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = {
    CAD_USUARIOS: [
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'ANA ADMIN', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'ana@exemplo.test', CELULAR: '(62) 99999-0001', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', CELULAR: '62999990002', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_fixo', USUARIO: 'fabio', NOME: 'FABIO FIXO', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', CELULAR: '6232220000', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_m3', USUARIO: 'mara', NOME: 'MARA SOUZA', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', CELULAR: '62999990003', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_m4', USUARIO: 'nina', NOME: 'NINA LIMA', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'nina@exemplo.test', CELULAR: '62999990004', VINCULO_TRABALHO: 'CLT' }
    ],
    CAD_CONDUTORES: [], CAD_TECNICOS: [], NTF_ENVIOS: [], SYS_LOGS: []
  };
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const cache = {}, pedidos = [], sonos = [], logs = [];
  const responder = o.responder || ((url) => {
    if (/graph\.facebook\.com/.test(url)) return { cod: 200, corpo: { messages: [{ id: 'wamid.T' + pedidos.length }] } };
    if (/\/send-text$/.test(url)) return { cod: 200, corpo: { zaapId: 'z' + pedidos.length, messageId: 'MSG' + pedidos.length } };
    return { cod: 404, corpo: { error: 'não simulado' } };
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt,
    Utilities: Object.assign(criarUtilities(), { sleep: (ms) => { sonos.push(ms); } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail() {}, getRemainingDailyQuota: () => 100 },
    UrlFetchApp: {
      fetch: (url, op) => {
        const corpo = op && op.payload ? JSON.parse(op.payload) : null;
        pedidos.push({ url, metodo: String((op && op.method) || 'get').toLowerCase(), cabecalhos: (op && op.headers) || {}, corpo });
        const r = responder(url, String((op && op.method) || 'get').toLowerCase(), corpo);
        return { getResponseCode: () => r.cod, getContentText: () => JSON.stringify(r.corpo) };
      }
    },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return r; },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))); },
      log: (a, u, m) => logs.push([a, u, m])
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    validarSessao: (sid) => (sid === 's_dono' ? { valid: true, data: { userId: 'u_adm', usuario: 'admin', nome: 'ANA ADMIN', perfil: 'ADMIN' } }
      : sid === 's_tec' ? { valid: true, data: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO', perfil: 'TECNICO' } } : { valid: false })
  });
  if (o.servidor) ctx.SGO_WHATSAPP = o.servidor;
  for (const f of ['SGO_Utilis.js', 'SGO_Notificar.js', 'SGO_Zapi.js', 'SGO_Chaves.js', 'SGO_Atividades_Avisos.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, tabelas, props, pedidos, sonos, logs, relogio, envios: () => pedidos.filter((p) => /\/send-text$/.test(p.url)) };
}

const semEmoji = (t) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t);

test('escolha do provedor: zapi com as 3 chaves; meta quando escolhida; sem modelo só na Z-API', () => {
  const a = ambiente({ props: Object.assign({ META_WA_TOKEN: 'tok', META_WA_PHONE_ID: '123456' }, ZAPI) });
  assert.equal(a.ctx.Notificar_provedorWhatsapp_().provedor, 'zapi');
  assert.equal(a.ctx.Notificar_whatsappSemModelo_(), true);
  a.props.WHATSAPP_PROVEDOR = 'meta';
  assert.equal(a.ctx.Notificar_provedorWhatsapp_().provedor, 'meta');
  assert.equal(a.ctx.Notificar_whatsappSemModelo_(), false);
  delete a.props.ZAPI_CLIENT_TOKEN; a.props.WHATSAPP_PROVEDOR = 'zapi';
  const p = a.ctx.Notificar_provedorWhatsapp_();
  assert.equal(p.provedor, '');
  assert.match(p.motivo, /ZAPI_CLIENT_TOKEN/);
});

test('texto pronto de cada tipo de mensagem pela Z-API (sem modelo, sem "modelo não aprovado")', () => {
  const a = ambiente({ props: ZAPI });
  const casos = [
    { nome: 'Minhas atividades: resumo do dia', o: { usuarios: ['u_tec'], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'R1', titulo: 'Resumo das suas atividades', texto: 'x', modelo: { nome: 'sgo_atividades_resumo_dia', parametros: ['@NOME', '2', '1', '0', '@LINK'] } },
      espera: ['Olá, Tiago. Este é o resumo das suas atividades no SGO+.', 'Novas para você: 2', 'Vencem hoje: 1', 'Venceram desde o último resumo: 0', 'acesse Minhas atividades: https://sgo.exemplo.test', 'Metrolabs — SGO+'] },
    { nome: 'Programa de conduta: missão nova', o: { usuarios: ['u_m3'], canais: ['whatsapp'], origem: 'CONDUTA', refId: 'M1', titulo: 'Missão cadastrada', texto: 'x', modelo: { nome: 'sgo_missao_nova', parametros: ['@NOME', 'Hospital Exemplo - Anápolis', '21/10/2026', '@LINK'] } },
      espera: ['Olá, Mara. Uma missão em que você é executante foi cadastrada no SGO+.', 'Destino: Hospital Exemplo - Anápolis', 'Data: 21/10/2026', 'Programa de conduta: https://sgo.exemplo.test'] },
    { nome: 'Chamado do Auvo aberto (cliente, sem link)', o: { contatos: [{ id: 'CLI1', nome: 'Responsável Exemplo', telefone: '62988887777', cadastro: 'cliente' }], canais: ['whatsapp'], semLink: true, origem: 'AUVO_OS', refId: 'T1:ABERTURA', titulo: 'Chamado aberto', texto: 'x', modelo: { nome: 'sgo_chamado_aberto', parametros: ['Clínica Exemplo Ltda.', 'Nº 1234 — manutenção', '21/10/2026, técnico Carlos'] } },
      espera: ['Chamado técnico aberto.', 'Cliente: Clínica Exemplo Ltda.', 'Chamado: Nº 1234 — manutenção', 'Agendamento: 21/10/2026, técnico Carlos', 'avisaremos a conclusão'] },
    { nome: 'Chamado do Auvo concluído', o: { usuarios: ['u_tec'], canais: ['whatsapp'], origem: 'AUVO_OS', refId: 'T1:FECHAMENTO', titulo: 'Chamado concluído', texto: 'x', modelo: { nome: 'sgo_chamado_concluido', parametros: ['Clínica Exemplo Ltda.', 'Nº 1234', '21/10/2026'] } },
      espera: ['Chamado técnico concluído.', 'Concluído em: 21/10/2026'] },
    { nome: 'Avisos (texto próprio do módulo)', o: { usuarios: ['u_m4'], canais: ['whatsapp'], origem: 'AVISOS', refId: 'A1', titulo: 'Aviso importante: limpeza', texto: 'Texto completo', textoWhatsapp: 'SGO+ Metrolabs - Aviso importante: limpeza\n\nResumo do aviso.\n\nLeia o aviso completo e confirme a leitura no SGO+.', modelo: { nome: 'sgo_aviso_geral', parametros: ['t', 'r', '@LINK'] } },
      espera: ['SGO+ Metrolabs - Aviso importante: limpeza', 'Resumo do aviso.', 'Abra o SGO+: https://sgo.exemplo.test'] },
    { nome: 'Frota (sem modelo: aviso geral)', o: { usuarios: ['u_adm'], canais: ['whatsapp'], origem: 'FROTA', refId: 'F1', titulo: 'Comprovante de abastecimento pedido', texto: 'A gestão pediu o comprovante do abastecimento de 18/10/2026 do veículo ABC1D23.\nEnvie em Frota > Abastecimentos.' },
      espera: ['Olá, Ana.', 'Comprovante de abastecimento pedido', 'veículo ABC1D23.', 'Para ver os detalhes, acesse o SGO+: https://sgo.exemplo.test', 'Metrolabs — SGO+'] },
    { nome: 'Caixa de decisões (sem modelo aprovado: aviso geral com o link da tela)', o: { usuarios: ['u_m3'], canais: ['whatsapp'], categoria: 'GESTAO', origem: 'GESTAO_RESUMO', refId: 'G1', titulo: 'Decisões aguardando você', texto: 'Decisões aguardando você: 4. Paradas há 2 dias úteis ou mais: 2.', link: 'https://sgo.exemplo.test/?tela=gestao_decisoes' },
      espera: ['Olá, Mara.', 'Decisões aguardando você: 4.', '?tela=gestao_decisoes'] }
  ];
  casos.forEach((c, i) => {
    const antes = a.envios().length;
    const r = a.ctx.SGO_notificar_(c.o);
    assert.equal(r.ok, 1, c.nome + ': ' + JSON.stringify(r));
    const env = a.envios();
    assert.equal(env.length, antes + 1, c.nome);
    const msg = env[env.length - 1].corpo.message;
    c.espera.forEach((t) => assert.ok(msg.includes(t), c.nome + ' sem "' + t + '":\n' + msg));
    assert.ok(!/\{\{\d+\}\}/.test(msg) && semEmoji(msg) && !/modelo/i.test(msg), c.nome + ': ' + msg);
    assert.equal(env[env.length - 1].cabecalhos['Client-Token'], 'CLIENT-TESTE-789');
    assert.ok(env[env.length - 1].url.indexOf('/instances/INSTANCIA-TESTE-123/token/TOKEN-TESTE-456/send-text') > 0);
  });
  assert.ok(a.tabelas.NTF_ENVIOS.every((l) => l.SITUACAO === 'OK' && l.MOTIVO === 'Aceito pela Z-API.'));
  // chamado do cliente: sem link do SGO+
  assert.ok(!/sgo\.exemplo/.test(a.envios()[2].corpo.message));
});

test('proteção do número: telefone fixo nunca recebe; intervalo sorteado entre 3 e 8 s; limite por hora', () => {
  const a = ambiente({ props: Object.assign({ ZAPI_LIMITE_HORA: '2' }, ZAPI) });
  const r0 = a.ctx.SGO_notificar_({ usuarios: ['u_fixo'], canais: ['whatsapp'], titulo: 'Aviso', texto: 't', origem: 'TESTE', refId: 'x0' });
  assert.equal(r0.pulado, 1);
  assert.equal(a.envios().length, 0);
  assert.match(a.tabelas.NTF_ENVIOS[0].MOTIVO, /celular válido.*fixo/);
  const r = a.ctx.SGO_notificar_({ usuarios: ['u_tec', 'u_m3', 'u_m4'], canais: ['whatsapp'], titulo: 'Aviso', texto: 't', origem: 'TESTE', refId: 'x1' });
  assert.deepEqual([r.ok, r.pulado], [2, 1]);
  assert.equal(a.envios().length, 2);
  assert.equal(a.sonos.length, 1);
  assert.ok(a.sonos[0] >= 3000 && a.sonos[0] <= 8000, String(a.sonos[0]));
  const ult = a.tabelas.NTF_ENVIOS[a.tabelas.NTF_ENVIOS.length - 1];
  assert.equal(ult.SITUACAO, 'PULADO');
  assert.match(ult.MOTIVO, /limite de 2 mensagens por hora/);
  // a pulada pelo limite não fica marcada como "já enviada" (sai na próxima vez)
  a.relogio.agora += 3600 * 1000 + 1000;
  assert.equal(a.ctx.SGO_notificar_({ usuarios: ['u_m4'], canais: ['whatsapp'], titulo: 'Aviso', texto: 't', origem: 'TESTE', refId: 'x1' }).ok, 1);
});

test('no servidor a fila é a do servidor (SGO+ e COMMAND juntos): reserva com o celular e o tipo; recusa vira pulado', () => {
  const reservas = [];
  let liberar = true;
  const servidor = { reservar: (o) => { reservas.push(o); return liberar ? { ok: true, esperarMs: 4200 } : { ok: false, motivo: 'limite de 40 mensagens por hora pelo WhatsApp da empresa (SGO+ e COMMAND juntos) atingido' }; }, situacao: () => ({ hora: 3, dia: 9, cfg: {} }) };
  const a = ambiente({ props: ZAPI, servidor });
  assert.equal(a.ctx.SGO_notificar_({ usuarios: ['u_tec'], canais: ['whatsapp'], titulo: 'A', texto: 't', origem: 'TESTE', refId: 's1' }).ok, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(reservas[0])), { destino: '5562999990002', tipo: 'AVISO' });
  assert.deepEqual(a.sonos, [4200]);
  liberar = false;
  const r = a.ctx.SGO_notificar_({ usuarios: ['u_m3'], canais: ['whatsapp'], titulo: 'B', texto: 't', origem: 'TESTE', refId: 's2' });
  assert.equal(r.pulado, 1);
  assert.match(r.motivo, /SGO\+ e COMMAND juntos/);
  assert.equal(a.envios().length, 1);
  assert.equal(a.props.ZAPI_FILA_LOCAL, undefined);   // não usou a fila local
});

test('caminho da Meta continua igual (modelo) quando o provedor volta para meta', () => {
  const a = ambiente({ props: Object.assign({}, ZAPI, { WHATSAPP_PROVEDOR: 'meta', META_WA_TOKEN: 'tok', META_WA_PHONE_ID: '123456' }) });
  const r = a.ctx.SGO_notificar_({ usuarios: ['u_tec'], canais: ['whatsapp'], titulo: 'Missão', texto: 'x', origem: 'CONDUTA', refId: 'm', modelo: { nome: 'sgo_missao_nova', parametros: ['@NOME', 'Destino', '21/10/2026', '@LINK'] } });
  assert.equal(r.ok, 1);
  const p = a.pedidos[0];
  assert.match(p.url, /graph\.facebook\.com/);
  assert.equal(p.corpo.type, 'template');
  assert.equal(p.corpo.template.name, 'sgo_missao_nova');
  assert.equal(a.envios().length, 0);
});

test('resumo de atividades: pela Z-API não espera aprovação de modelo da Meta', () => {
  const a = ambiente({ props: ZAPI });
  assert.equal(a.ctx.Atividades_modeloResumoAprovado_(), true);
  assert.equal(a.pedidos.length, 0);   // nem consultou a Meta
  const m = a.ctx.Atividades_modeloDoResumo_({ novas: [], venceHoje: [{}], vencidasNovas: [] }, true);
  assert.equal(m.nome, 'sgo_atividades_resumo_dia');
});

test('Chaves e senhas: Conferir conexão, Configurar recebimento e Enviar teste para mim, com a Z-API simulada', () => {
  const urlSecreta = 'https://command.metrolabs.com.br/webhook/whatsapp?wh=0123456789abcdef0123456789abcdef01234567';
  const servidor = { reservar: () => ({ ok: true, esperarMs: 0 }), situacao: () => ({ hora: 2, dia: 5, cfg: {} }), webhookCommand: () => ({ url: urlSecreta, gerado: true }) };
  const responder = (url, metodo, corpo) => {
    if (/\/status$/.test(url)) return { cod: 200, corpo: { connected: true, smartphoneConnected: true, error: '' } };
    if (/\/device$/.test(url)) return { cod: 200, corpo: { phone: '5562982417106', name: 'Metrolabs' } };
    if (/update-webhook-(received|message-status)$/.test(url)) return { cod: 200, corpo: { value: true } };
    if (/\/send-text$/.test(url)) return { cod: 200, corpo: { zaapId: 'z1', messageId: 'MSG1' } };
    return { cod: 404, corpo: {} };
  };
  const a = ambiente({ props: ZAPI, servidor, responder });
  // só o responsável pelo sistema
  assert.equal(a.ctx.Chaves_apiZapiConferir('s_tec', {}).ok, false);
  const c = a.ctx.Chaves_apiZapiConferir('s_dono', {});
  assert.equal(c.ok, true);
  assert.equal(c.funcionou, true);
  assert.match(c.texto, /Conectada.*\(62\) 98241-7106/);
  assert.match(c.fila, /Na última hora: 2/);
  const rec = a.ctx.Chaves_apiZapiReceber('s_dono', {});
  assert.equal(rec.funcionou, true, rec.texto);
  const puts = a.pedidos.filter((p) => p.metodo === 'put');
  assert.deepEqual(puts.map((p) => p.url.split('/').pop()), ['update-webhook-received', 'update-webhook-message-status']);
  assert.ok(puts.every((p) => p.corpo.value === urlSecreta && p.cabecalhos['Client-Token'] === 'CLIENT-TESTE-789'));
  assert.ok(!JSON.stringify(rec).includes('0123456789abcdef'), 'o segredo não volta para a tela');
  assert.ok(!JSON.stringify(a.logs).includes('0123456789abcdef'), 'o segredo não vai para o log');
  assert.match(rec.texto, /segredo do endereço foi criado agora/);
  const t = a.ctx.Chaves_apiZapiTesteParaMim('s_dono', {});
  assert.equal(t.funcionou, true, t.texto);
  const env = a.envios();
  assert.equal(env.length, 1);
  assert.equal(env[0].corpo.phone, '5562999990001');
  assert.match(env[0].corpo.message, /^Olá, Ana\. Esta é uma mensagem de teste do SGO\+/);
  assert.ok(!JSON.stringify([c, rec, t]).match(/TOKEN-TESTE|CLIENT-TESTE|INSTANCIA-TESTE/));
  // desconectada: diz o que fazer
  const b = ambiente({ props: ZAPI, responder: (url) => (/\/status$/.test(url) ? { cod: 200, corpo: { connected: false, error: 'You are not connected.' } } : { cod: 404, corpo: {} }) });
  const d = b.ctx.Chaves_apiZapiConferir('s_dono', {});
  assert.equal(d.funcionou, false);
  assert.match(d.texto, /leia o QR Code/);
  // sem o servidor próprio, o recebimento é configurado pelo COMMAND
  assert.match(b.ctx.Chaves_apiZapiReceber('s_dono', {}).texto, /COMMAND, Integrações/);
});

test('Chaves e senhas: limites da Z-API só aceitam número na faixa', () => {
  const a = ambiente({ props: ZAPI });
  const g = a.ctx.Chaves_apiGravar('s_dono', { chave: 'ZAPI_LIMITE_HORA', valor: '25' });
  assert.equal(g.ok, true, g.message);
  assert.equal(a.props.ZAPI_LIMITE_HORA, '25');
  assert.equal(a.ctx.SGO_zapiCfg_().limiteHora, 25);
  assert.equal(a.ctx.Chaves_apiGravar('s_dono', { chave: 'ZAPI_INTERVALO_MIN_S', valor: '1' }).ok, false);
  assert.equal(a.ctx.Chaves_apiGravar('s_dono', { chave: 'ZAPI_LIMITE_DIA', valor: 'muito' }).ok, false);
});
