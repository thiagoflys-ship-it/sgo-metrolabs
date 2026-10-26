// Piloto do WhatsApp no SGO+ (21/10/2026): só as pessoas da lista recebem WhatsApp (as demais ficam RETIDO, e o e-mail
// segue); cliente e contato externo retidos salvo telefone da lista; telefone com ou sem o 9; Z-API fora com o piloto
// ou com o provedor meta (envio e documentos); modelo não aprovado não é usado; lista de telefones gravada para o
// servidor; tela (só Administrador e Diretoria; telefone só para o Administrador); relatório do dia e e-mail das 18h.
// Nenhuma mensagem real sai daqui e nenhum dado real é usado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00');
const META = { META_WA_TOKEN: 'TOKEN-META-TESTE', META_WA_PHONE_ID: '123456' };
const ZAPI = { ZAPI_INSTANCIA: 'INSTANCIA-TESTE-123', ZAPI_TOKEN: 'TOKEN-TESTE-456', ZAPI_CLIENT_TOKEN: 'CLIENT-TESTE-789' };

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
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', CELULAR: '6299990002', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_m3', USUARIO: 'mara', NOME: 'MARA SOUZA', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', CELULAR: '62999990003', VINCULO_TRABALHO: 'PJ' },
      { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', CELULAR: '62999990004', VINCULO_TRABALHO: 'CLT' },
      { ID: 'u_ina', USUARIO: 'ivo', NOME: 'IVO INATIVO', PERFIL: 'TECNICO', STATUS: 'INATIVO', EMAIL: 'ivo@exemplo.test', CELULAR: '62999990005' }
    ],
    CAD_CONDUTORES: [], CAD_TECNICOS: [], NTF_ENVIOS: [], SYS_LOGS: []
  };
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const cache = {}, pedidos = [], emails = [], logs = [], gatilhos = [];
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt,
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }),
      getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.funcao })),
      newTrigger: (funcao) => { const g = { funcao }; const tb = { timeBased: () => tb, everyDays: (n) => ((g.dias = n), tb), atHour: (h) => ((g.hora = h), tb), nearMinute: () => tb, inTimezone: () => tb, create: () => { gatilhos.push(g); return g; } }; return tb; }
    },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    UrlFetchApp: {
      fetch: (url, op) => {
        const corpo = op && op.payload ? JSON.parse(op.payload) : null;
        pedidos.push({ url, corpo });
        const r = /graph\.facebook\.com/.test(url) ? { cod: 200, corpo: { messages: [{ id: 'wamid.T' + pedidos.length }] } } : { cod: 200, corpo: { messageId: 'MSG' + pedidos.length } };
        return { getResponseCode: () => r.cod, getContentText: () => JSON.stringify(r.corpo) };
      }
    },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => (tabelas[t] || []).find((r) => r.ID === id) || null,
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return r; },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))); },
      log: (a, u, m) => logs.push([a, u, m])
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    validarSessao: (sid) => (sid === 's_dono' ? { valid: true, data: { userId: 'u_adm', usuario: 'admin', nome: 'ANA ADMIN', perfil: 'ADMIN' } }
      : sid === 's_dir' ? { valid: true, data: { userId: 'u_dir', usuario: 'dora', nome: 'DORA DIRETORA', perfil: 'DIRETORIA' } }
      : sid === 's_tec' ? { valid: true, data: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO', perfil: 'TECNICO' } } : { valid: false }),
    exigirSessao: (sid) => { const v = ctx.validarSessao(sid); if (!v.valid) throw new Error('Sessão inválida.'); return v.data; }
  });
  if (o.servidor) ctx.SGO_WHATSAPP = o.servidor;
  for (const f of ['SGO_Utilis.js', 'SGO_Notificar.js', 'SGO_Zapi.js', 'SGO_Chaves.js', 'SGO_WhatsappPiloto.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, tabelas, props, pedidos, emails, logs, gatilhos, relogio, metas: () => pedidos.filter((p) => /graph\.facebook\.com/.test(p.url)), zapis: () => pedidos.filter((p) => /z-api\.io/.test(p.url)) };
}
const aviso = (usuarios, extra) => Object.assign({ usuarios, canais: ['email', 'whatsapp'], origem: 'AVISOS', refId: 'A' + Math.random(), titulo: 'Aviso de teste', texto: 'Texto do aviso de teste.' }, extra || {});
const situacoes = (a, canal) => a.tabelas.NTF_ENVIOS.filter((l) => l.CANAL === canal).map((l) => l.USUARIO_ID + ':' + l.SITUACAO);

test('sem configuração gravada: piloto ligado e só o responsável pelo sistema recebe WhatsApp; os outros ficam RETIDO e o e-mail sai', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  const r = a.ctx.SGO_notificar_(aviso(['u_adm', 'u_tec', 'u_m3']));
  assert.deepEqual(situacoes(a, 'whatsapp').sort(), ['u_adm:OK', 'u_m3:RETIDO', 'u_tec:RETIDO']);
  assert.deepEqual(situacoes(a, 'email').sort(), ['u_adm:OK', 'u_m3:OK', 'u_tec:OK']);
  assert.equal(a.metas().length, 1);
  assert.equal(a.metas()[0].corpo.to, '5562999990001');
  const retida = a.tabelas.NTF_ENVIOS.find((l) => l.SITUACAO === 'RETIDO');
  assert.match(retida.MOTIVO, /Retida pelo piloto do WhatsApp/);
  assert.equal(r.ok, 4);
  // a lista de telefones foi gravada para o servidor conferir (sem o 9)
  const cfg = JSON.parse(a.props.WA_PILOTO);
  assert.equal(cfg.ligado, true);
  assert.deepEqual(cfg.usuarios, ['u_adm']);
  assert.deepEqual(cfg.telefones, ['556299990001']);
});

test('lista gravada pela tela: quem está na lista recebe, quem não está fica RETIDO; inativo e cliente não entram', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  const g = a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_adm', 'u_tec'], areas: [] });
  assert.equal(g.ok, true, g.message);
  assert.match(g.mensagem, /2 pessoa\(s\) recebem WhatsApp/);
  const cfg = JSON.parse(a.props.WA_PILOTO);
  assert.deepEqual(cfg.telefones.sort(), ['556299990001', '556299990002']);   // celular de 8 dígitos e de 9 viram a mesma chave
  a.ctx.SGO_notificar_(aviso(['u_adm', 'u_tec', 'u_m3', 'u_dir']));
  assert.deepEqual(situacoes(a, 'whatsapp').sort(), ['u_adm:OK', 'u_dir:RETIDO', 'u_m3:RETIDO', 'u_tec:OK']);
  // pessoa inativa não pode ser marcada
  const ruim = a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_ina'] });
  assert.equal(ruim.ok, false);
  assert.match(ruim.message, /não está mais ativa/);
  // liberar por área: todo o perfil METROLOGIA entra, sem marcar um a um
  a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_adm'], areas: ['METROLOGIA'] });
  a.tabelas.NTF_ENVIOS.length = 0;
  a.ctx.SGO_notificar_(aviso(['u_tec', 'u_m3'], { canais: ['whatsapp'] }));
  assert.deepEqual(situacoes(a, 'whatsapp').sort(), ['u_m3:OK', 'u_tec:RETIDO']);
});

test('piloto 2.0 (26/10/2026): para cada pessoa, o que ela recebe; o resto fica RETIDO com o motivo; teste só para quem está no piloto', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  // Tiago só recebe "Atividades e pendências"; Ana (sem escolha) recebe tudo
  let g = a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_adm', 'u_tec'], grupos: { u_tec: ['ATIVIDADES'], u_adm: ['PONTO', 'GERAIS', 'ATIVIDADES', 'SETOR'] } });
  assert.equal(g.ok, true, g.message);
  const cfg = JSON.parse(a.props.WA_PILOTO);
  assert.deepEqual(cfg.grupos, { u_tec: ['ATIVIDADES'] }); // todos marcados = nada gravado (vale tudo)
  assert.deepEqual(Array.from(g.pessoas.find((p) => p.id === 'u_tec').grupos), ['ATIVIDADES']);
  assert.equal(g.gruposPossiveis.length, 4);
  a.tabelas.NTF_ENVIOS.length = 0;
  a.ctx.SGO_notificar_(aviso(['u_adm', 'u_tec'], { canais: ['whatsapp'], origem: 'AVISOS' }));                       // aviso geral
  a.ctx.SGO_notificar_(aviso(['u_tec'], { canais: ['whatsapp'], origem: 'FROTA', refId: 'F1' }));                    // setor
  a.ctx.SGO_notificar_(aviso(['u_tec'], { canais: ['whatsapp'], origem: 'ATIVIDADES', categoria: '', refId: 'AT1' }));  // atividades
  assert.deepEqual(situacoes(a, 'whatsapp'), ['u_adm:OK', 'u_tec:RETIDO', 'u_tec:RETIDO', 'u_tec:OK']);
  assert.match(a.tabelas.NTF_ENVIOS[1].MOTIVO, /não recebe "Avisos gerais" pelo WhatsApp/);
  assert.match(a.tabelas.NTF_ENVIOS[2].MOTIVO, /não recebe "Avisos do setor"/);
  // classificação das origens
  const G = (o) => a.ctx.SGO_waPilotoGrupoDe_(o);
  assert.equal(G({ categoria: 'PONTO' }), 'PONTO'); assert.equal(G({ origem: 'AVISOS' }), 'GERAIS'); assert.equal(G({ origem: 'RESUMO_DIA' }), 'ATIVIDADES');
  assert.equal(G({ origem: 'GESTAO_RESUMO' }), 'ATIVIDADES'); assert.equal(G({ origem: 'COMPRAS' }), 'SETOR'); assert.equal(G({ origem: 'WA_PILOTO' }), '');
  // pessoa marcada sem nenhum tipo: recusa com o que fazer
  g = a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_adm', 'u_tec'], grupos: { u_tec: [] } });
  assert.equal(g.ok, false); assert.match(g.message, /TIAGO TECNICO está sem nenhum tipo de aviso marcado/);
  // teste: sai para quem está no piloto (mesmo sem o grupo da mensagem), uma vez a cada 2 minutos; quem não está é recusado
  const antes = a.metas().length;
  let t = a.ctx.SGO_WaPiloto_api('s_dono', 'testar', { usuarioId: 'u_tec' });
  assert.equal(t.ok, true, t.message); assert.match(t.mensagem, /Teste enviado para TIAGO TECNICO/);
  assert.equal(a.metas().length, antes + 1);
  t = a.ctx.SGO_WaPiloto_api('s_dono', 'testar', { usuarioId: 'u_tec' });
  assert.equal(t.ok, false); assert.match(t.message, /há menos de 2 minutos/);
  t = a.ctx.SGO_WaPiloto_api('s_dono', 'testar', { usuarioId: 'u_m3' });
  assert.equal(t.ok, false); assert.match(t.message, /não está no piloto/);
  assert.equal(a.ctx.SGO_WaPiloto_api('s_tec', 'testar', { usuarioId: 'u_tec' }).ok, false); // técnico não usa a tela
});

test('cliente e contato externo ficam retidos durante o piloto, salvo telefone da lista (com ou sem o 9)', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: ['u_adm', 'u_tec'] });
  a.ctx.SGO_notificar_({ contatos: [{ id: 'CLI1', nome: 'Responsável Exemplo', telefone: '62988887777', email: 'cliente@exemplo.test', cadastro: 'cliente' }],
    canais: ['email', 'whatsapp'], semLink: true, origem: 'AUVO_OS', refId: 'T1:ABERTURA', titulo: 'Chamado aberto', texto: 'x', modelo: { nome: 'sgo_chamado_aberto', parametros: ['Clínica Exemplo', 'Nº 1', '21/10/2026'] } });
  assert.deepEqual(situacoes(a, 'whatsapp'), ['EXT:CLI1:RETIDO']);
  assert.deepEqual(situacoes(a, 'email'), ['EXT:CLI1:OK']);
  assert.match(a.tabelas.NTF_ENVIOS[0].MOTIVO + a.tabelas.NTF_ENVIOS[1].MOTIVO, /cliente e contato externo não recebem WhatsApp durante o piloto/);
  assert.equal(a.metas().length, 0);
  // contato externo com o celular de quem está na lista (aqui com o 9 a mais) passa
  a.tabelas.NTF_ENVIOS.length = 0;
  a.ctx.SGO_notificar_({ contatos: [{ id: 'CLI2', nome: 'Teste', telefone: '62999990002', cadastro: 'cliente' }], canais: ['whatsapp'], origem: 'AUVO_OS', refId: 'T2', titulo: 't', texto: 'x' });
  assert.deepEqual(situacoes(a, 'whatsapp'), ['EXT:CLI2:OK']);
  assert.equal(a.ctx.SGO_waPilotoCanon_('5562999990002'), a.ctx.SGO_waPilotoCanon_('556299990002'));
  assert.equal(a.ctx.SGO_waPilotoTelefoneLiberado_('(62) 9999-0002'), true);
  assert.equal(a.ctx.SGO_waPilotoTelefoneLiberado_('62988887777'), false);
});

test('Z-API fora: com o piloto ligado o provedor é a Meta mesmo com zapi escolhido; nada sai pela Z-API (texto, documento, teste)', () => {
  const a = ambiente({ props: Object.assign({ WHATSAPP_PROVEDOR: 'zapi' }, META, ZAPI) });
  assert.equal(a.ctx.Notificar_provedorWhatsapp_().provedor, 'meta');
  assert.equal(a.ctx.Notificar_whatsappSemModelo_(), false);
  a.ctx.SGO_notificar_(aviso(['u_adm']));
  assert.equal(a.zapis().length, 0);
  assert.equal(a.metas().length, 1);
  const z = a.ctx.SGO_zapiEnviarTexto_('5562999990001', 'oi', { tipo: 'TESTE' });
  assert.equal(z.ok, false);
  assert.match(z.motivo, /Z-API desligada/);
  assert.equal(a.ctx.Notificar_enviarWhatsapp_(a.ctx.Notificar_credenciaisZapi_(), '5562999990001', 'oi').ok, false);
  assert.equal(a.zapis().length, 0);
  // sem as chaves da Meta, não cai para a Z-API: fica sem WhatsApp, com o motivo
  delete a.props.META_WA_TOKEN;
  const p = a.ctx.Notificar_provedorWhatsapp_();
  assert.equal(p.provedor, '');
  assert.match(p.motivo, /META_WA_TOKEN.*Z-API está desligada/);
  // piloto desligado mas provedor meta: Z-API continua fora
  a.props.META_WA_TOKEN = 'TOKEN-META-TESTE';
  a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: false, usuarios: [] });
  a.props.WHATSAPP_PROVEDOR = 'meta';
  assert.equal(a.ctx.SGO_waZapiFora_(), true);
  // piloto desligado e zapi escolhido de propósito: volta a ser possível (decisão futura do dono)
  a.props.WHATSAPP_PROVEDOR = 'zapi';
  assert.equal(a.ctx.SGO_waZapiFora_(), false);
  assert.equal(a.ctx.Notificar_provedorWhatsapp_().provedor, 'zapi');
});

test('documento pelo WhatsApp (Z-API) não sai durante o piloto', () => {
  const a = ambiente({ props: Object.assign({}, ZAPI) });
  vm.runInContext(fs.readFileSync(path.join(pastaLegado, 'SGO_EnviarDoc.js'), 'utf8'), a.ctx, { filename: 'SGO_EnviarDoc.js' });
  const r = a.ctx.EnviarDoc_zapiDocumento_('5562999990001', { nome: 'x.pdf', mime: 'application/pdf', blob: { getBytes: () => [1, 2] } }, '');
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Envie este documento por e-mail/);
  assert.equal(a.pedidos.length, 0);
});

test('modelo da Meta não aprovado não é usado: vai o aviso geral aprovado; sem modelo aprovado, fica PULADO com o motivo', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  a.props.NTF_MODELOS_SITUACAO = JSON.stringify({ em: 'x', modelos: { sgo_missao_nova: 'PENDING', sgo_aviso_geral: 'APPROVED' } });
  a.ctx.SGO_notificar_(aviso(['u_adm'], { canais: ['whatsapp'], modelo: { nome: 'sgo_missao_nova', parametros: ['@NOME', 'Destino', '21/10/2026', '@LINK'] } }));
  assert.equal(a.metas().length, 1);
  assert.equal(a.metas()[0].corpo.template.name, 'sgo_aviso_geral');
  a.props.NTF_MODELOS_SITUACAO = JSON.stringify({ em: 'x', modelos: { sgo_missao_nova: 'PENDING', sgo_aviso_geral: 'REJECTED' } });
  a.tabelas.NTF_ENVIOS.length = 0;
  a.ctx.SGO_notificar_(aviso(['u_adm'], { canais: ['whatsapp'], refId: 'B2', modelo: { nome: 'sgo_missao_nova', parametros: ['@NOME', 'Destino', '21/10/2026', '@LINK'] } }));
  assert.equal(a.metas().length, 1);
  assert.equal(a.tabelas.NTF_ENVIOS[0].SITUACAO, 'PULADO');
  assert.match(a.tabelas.NTF_ENVIOS[0].MOTIVO, /não aprovado na Meta/);
  // Chaves e senhas guarda a situação lida da Meta
  a.ctx.SGO_waModelosGuardar_([{ nome: 'sgo_chamado_aberto', status: 'APPROVED' }, { nome: 'sgo_chamado_concluido', falta: true }]);
  assert.equal(a.ctx.SGO_waModeloSituacao_('sgo_chamado_aberto'), 'APPROVED');
  assert.equal(a.ctx.SGO_waModeloSituacao_('sgo_chamado_concluido'), 'NAO_CADASTRADO');
});

test('teste de WhatsApp em Chaves e senhas só para celular da lista do piloto', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  const fora = a.ctx.Chaves_testarWhatsapp_('62988887777');
  assert.equal(fora.funcionou, false);
  assert.match(fora.texto, /piloto do WhatsApp/);
  assert.equal(a.metas().length, 0);
  assert.equal(a.ctx.Chaves_testarWhatsapp_('(62) 99999-0001').funcionou, true);
});

test('tela: só a gestão (ligar e desligar: Administrador e Diretoria); telefone completo só para o Administrador; gatilho das 18h instalado', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  const tec = a.ctx.SGO_WaPiloto_api('s_tec', 'carregar', {});
  assert.equal(tec.ok, false);
  assert.match(tec.message, /gestão \(Administrador, Diretoria, Gestor, RH e Financeiro\)/);
  const adm = a.ctx.SGO_WaPiloto_api('s_dono', 'carregar', {});
  assert.equal(adm.ok, true, adm.message);
  assert.equal(adm.ligado, true);
  assert.ok(adm.pessoas.find((p) => p.id === 'u_adm').naLista);
  assert.equal(adm.pessoas.find((p) => p.id === 'u_tec').celular, '(62) 9999-0002');
  assert.ok(!adm.pessoas.some((p) => p.id === 'u_ina'));
  assert.equal(adm.zapiFora, true);
  assert.equal(adm.provedorEmUso, 'WhatsApp oficial (Meta)');
  const dir = a.ctx.SGO_WaPiloto_api('s_dir', 'carregar', {});
  assert.equal(dir.ok, true);
  assert.ok(dir.pessoas.every((p) => !p.celular || /^\(final \d{4}\)$/.test(p.celular)));
  assert.deepEqual(a.gatilhos.map((g) => [g.funcao, g.hora]), [['SGO_waPilotoResumoDiario', 18]]);
  assert.equal(a.ctx.SGO_WaPiloto_api('s_dono', 'gravar', { ligado: true, usuarios: [], areas: [] }).ok, false);
});

test('relatório do dia: SGO+ (NTF_ENVIOS) e COMMAND (registro do servidor), por pessoa, sem telefone para quem não é Administrador', () => {
  const servidor = {
    reservar: () => ({ ok: true, esperarMs: 0 }),
    pilotoRegistros: () => [
      { em: '2026-10-19T13:05:00.000Z', sistema: 'command', provedor: 'meta', destino: '5562999990002', modelo: 'text', situacao: 'BLOQUEADO', motivo: 'destino fora da lista do piloto', origem: '', nome: '', camada: 'servidor' },
      { em: '2026-10-19T13:06:00.000Z', sistema: 'command', provedor: 'meta', destino: '5511977776666', modelo: 'text', situacao: 'BLOQUEADO', motivo: 'destino fora da lista do piloto', origem: '', nome: '', camada: 'servidor' },
      { em: '2026-10-19T13:07:00.000Z', sistema: 'sgo', provedor: 'meta', destino: '5562999990001', modelo: 'sgo_aviso_geral', situacao: 'ENVIADO', motivo: 'aceito', origem: '', nome: '', camada: 'servidor' }
    ]
  };
  const a = ambiente({ props: Object.assign({}, META), servidor });
  a.ctx.SGO_notificar_(aviso(['u_adm', 'u_tec'], { canais: ['whatsapp'] }));
  const r = a.ctx.SGO_WaPiloto_api('s_dono', 'relatorio', { dia: '2026-10-19' });
  assert.equal(r.ok, true, r.message);
  // 2 do SGO+ (NTF_ENVIOS) + 2 do COMMAND; o ENVIADO do SGO+ no servidor não duplica
  assert.equal(r.linhas.length, 4);
  assert.deepEqual(r.contagem, { enviadas: 1, retidas: 1, bloqueadas: 2, falhas: 0, puladas: 0, total: 4 });
  const doCommand = r.linhas.filter((l) => l.sistema === 'COMMAND');
  assert.deepEqual(doCommand.map((l) => l.pessoa).sort(), ['Fora do cadastro de usuários (cliente ou contato)', 'TIAGO TECNICO']);
  assert.ok(r.linhas.some((l) => l.telefone === '(62) 99999-0001'));
  const dir = a.ctx.SGO_WaPiloto_api('s_dir', 'relatorio', { dia: '2026-10-19' });
  assert.ok(dir.linhas.every((l) => l.telefone === ''));
  const so = a.ctx.SGO_WaPiloto_api('s_dono', 'relatorio', { dia: '2026-10-19', pessoa: 'u_tec' });
  assert.deepEqual(so.linhas.map((l) => l.sistema + ':' + l.situacao).sort(), ['COMMAND:BLOQUEADO', 'SGO+:RETIDO']);
});

test('e-mail diário das 18h ao responsável pelo sistema: contagem do dia, sem telefone, uma vez por dia', () => {
  const a = ambiente({ props: Object.assign({}, META) });
  a.ctx.SGO_notificar_(aviso(['u_adm', 'u_tec', 'u_m3'], { canais: ['whatsapp'] }));
  a.emails.length = 0;
  const r = a.ctx.SGO_waPilotoResumoDiario();
  assert.equal(r.enviado, true, JSON.stringify(r));
  assert.equal(a.emails.length, 1);
  assert.equal(a.emails[0].to, 'ana@exemplo.test');
  assert.match(a.emails[0].subject, /Piloto do WhatsApp: resumo de 19\/10/);
  assert.match(a.emails[0].body, /Enviadas: 1/);
  assert.match(a.emails[0].body, /Retidas pelo piloto .*: 2/);
  assert.ok(!/9999[0-9-]{3,}/.test(a.emails[0].body), 'o e-mail não leva telefone');
  assert.equal(a.ctx.SGO_waPilotoResumoDiario().enviado, false);   // segunda vez no mesmo dia
  assert.equal(a.emails.length, 1);
});
