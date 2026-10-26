// Perfil RH, vínculo de trabalho (CLT/PJ) e categoria PONTO do notificador (19/10/2026).
// Carrega o código real do SGO+ num contexto isolado, sem planilha, sem e-mail e sem WhatsApp de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
// Fim de linha normalizado: a cópia do git (git archive) pode vir com CRLF e as extrações por expressão esperam LF.
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8').replace(/\r\n/g, '\n');

function contexto(usuarios, sessoes) {
  const tabelas = { CAD_USUARIOS: usuarios, NTF_ENVIOS: [] };
  const emails = [];
  const cache = {};
  const s = {
    console,
    Utilities: { getUuid: () => 'id-' + Math.random().toString(36).slice(2), formatDate: () => '2026-10-19T10:00:00', sleep() {} },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (o) => emails.push(o.to) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.teste' }) },
    CertCal_garantirTabela_() {}, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    gerarHashSenhaAuth_: (x) => 'hash:' + x,
    exigirSessao: (sid) => { const x = sessoes[sid]; if (!x) throw new Error('Sessão inválida'); return x; },
    validarSessao: (sid) => (sessoes[sid] ? { valid: true, data: sessoes[sid] } : { valid: false }),
  };
  vm.createContext(s);
  vm.runInContext(ler('SGO_Utilis.js'), s);
  vm.runInContext(`var SGO_CFG = { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', NTF_ENVIOS: 'NTF_ENVIOS', CAD_CLIENTES: 'CAD_CLIENTES', SYS_LOGS: 'SYS_LOGS' }, STATUS: { ATIVO: 'ATIVO' },
    PROFILES: ['ADMIN','DIRETORIA','GESTOR','TECNICO','METROLOGIA','COMERCIAL','FINANCEIRO','RH','CLIENTE'] };`, s);
  s.SGO_DATA = {
    _headersCache: {}, _headerMapCache: {},
    getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
    getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
    update: (t, id, d) => { const r = tabelas[t].find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
    insert: (t, d) => { tabelas[t].push(d); },
    insertMany: (t, l) => { (tabelas[t] = tabelas[t] || []).push(...l); },
    log() {}, normalizarObjetoParaSheet: (t, o) => o, gerarRegistroBase: (o) => Object.assign({ ID: 'novo' }, o),
  };
  vm.runInContext(ler('SGO_Data.js').match(/SGO_DATA\.mesclarCampos_ = function[\s\S]*?\n};/)[0], s);
  // Só as funções de perfil do SGO_Auth.js (isAdminPerfilAuth_ e o bloco do perfil RH).
  const auth = ler('SGO_Auth.js');
  vm.runInContext(auth.match(/function isAdminSession[\s\S]*?\n}\n/)[0], s);
  vm.runInContext(auth.match(/function isAdminPerfilAuth_[\s\S]*?\n}\n/)[0], s);
  vm.runInContext(auth.match(/function SGO_ehPerfilRH_[\s\S]*?function SGO_bloquearRH_[\s\S]*?\n}\n/)[0], s);
  vm.runInContext(ler('SGO_Notificar.js'), s);
  vm.runInContext(ler('SGO_Usuarios.js').replace('const SGO_USUARIOS =', 'var SGO_USUARIOS ='), s);
  return { s, tabelas, emails };
}

const equipe = () => [
  { ID: 'u1', USUARIO: 'ana', NOME: 'ANA CLT', PERFIL: 'TECNICO', EMAIL: 'ana@x.com.br', CELULAR: '5511987654321', STATUS: 'ATIVO', VINCULO_TRABALHO: 'CLT' },
  { ID: 'u2', USUARIO: 'bia', NOME: 'BIA PJ', PERFIL: 'TECNICO', EMAIL: 'bia@x.com.br', CELULAR: '5511987654322', STATUS: 'ATIVO', VINCULO_TRABALHO: 'PJ' },
  { ID: 'u3', USUARIO: 'caio', NOME: 'CAIO SEM', PERFIL: 'TECNICO', EMAIL: 'caio@x.com.br', CELULAR: '5511987654323', STATUS: 'ATIVO', VINCULO_TRABALHO: '' },
  { ID: 'g1', USUARIO: 'gestor', NOME: 'GESTOR', PERFIL: 'GESTOR', EMAIL: 'g@x.com.br', STATUS: 'ATIVO' },
  { ID: 'r1', USUARIO: 'rh', NOME: 'RH', PERFIL: 'RH', EMAIL: 'rh@x.com.br', STATUS: 'ATIVO' },
];
const sessoes = { G: { userId: 'g1', usuario: 'gestor', perfil: 'GESTOR' }, R: { userId: 'r1', usuario: 'rh', perfil: 'RH' }, T: { userId: 'u1', usuario: 'ana', perfil: 'TECNICO' } };

test('categoria PONTO: só CLT recebe; PJ e vínculo vazio ficam PULADO com o motivo', () => {
  const { s, tabelas, emails } = contexto(equipe(), sessoes);
  const r = s.SGO_notificar_({ usuarios: ['u1', 'u2', 'u3'], titulo: 'Marcação do ponto', texto: 'Teste', canais: ['email', 'whatsapp'], categoria: 'PONTO', origem: 'PONTO', refId: 'p1' });
  assert.deepEqual(emails, ['ana@x.com.br']);
  const motivo = (uid, canal) => tabelas.NTF_ENVIOS.find((l) => l.USUARIO_ID === uid && l.CANAL === canal);
  assert.equal(motivo('u2', 'email').SITUACAO, 'PULADO');
  assert.equal(motivo('u2', 'email').MOTIVO, 'PJ: mensagens do ponto não são enviadas');
  assert.equal(motivo('u2', 'whatsapp').MOTIVO, 'PJ: mensagens do ponto não são enviadas');
  assert.equal(motivo('u3', 'email').MOTIVO, 'vínculo de trabalho não informado');
  assert.equal(motivo('u1', 'email').SITUACAO, 'OK');
  assert.equal(r.ok, 1);
});

test('outras categorias (ou nenhuma) continuam para todos, inclusive PJ', () => {
  const { s, emails } = contexto(equipe(), sessoes);
  s.SGO_notificar_({ usuarios: ['u1', 'u2', 'u3'], titulo: 'Aviso geral', texto: 'Teste', canais: ['email'], refId: 'a1' });
  s.SGO_notificar_({ usuarios: ['u2'], titulo: 'Aviso de frota', texto: 'Teste', canais: ['email'], categoria: 'FROTA', refId: 'a2' });
  assert.deepEqual(emails, ['ana@x.com.br', 'bia@x.com.br', 'caio@x.com.br', 'bia@x.com.br']);
  assert.equal(s.Notificar_motivoCategoria_('PONTO', { externo: true, vinculo: 'CLT' }), 'vínculo de trabalho não informado');
  assert.equal(s.Notificar_motivoCategoria_('ponto', { vinculo: 'clt' }), '');
});

test('vínculo de trabalho: grava CLT/PJ, editar outro campo ou a senha não apaga, valor estranho é recusado', () => {
  const { s, tabelas } = contexto(equipe(), sessoes);
  const u = (id) => tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u3', { NOME: 'Caio', USUARIO: 'caio', EMAIL: 'caio@x.com.br', PERFIL: 'TECNICO', VINCULO_TRABALHO: 'PJ' }).success, true);
  assert.equal(u('u3').VINCULO_TRABALHO, 'PJ');
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u3', { NOME: 'Caio Novo' }).success, true);
  assert.equal(u('u3').VINCULO_TRABALHO, 'PJ');
  assert.equal(u('u3').NOME, 'CAIO NOVO');
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u3', { SENHA: 'nova123' }).success, true);
  assert.equal(u('u3').VINCULO_TRABALHO, 'PJ');
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u3', { VINCULO_TRABALHO: 'Não informado' }).success, true);
  assert.equal(u('u3').VINCULO_TRABALHO, '');
  const ruim = s.SGO_USUARIOS.atualizar('G', 'u3', { VINCULO_TRABALHO: 'estagio' });
  assert.equal(ruim.success, false);
  assert.match(ruim.message, /Vínculo de trabalho inválido/);
  assert.equal(s.SGO_USUARIOS.criar('G', { USUARIO: 'davi', NOME: 'Davi', EMAIL: 'davi@x.com.br', PERFIL: 'RH', SENHA: '123456', VINCULO_TRABALHO: 'clt' }).success, true);
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.USUARIO === 'davi').VINCULO_TRABALHO, 'CLT');
});

// 21/10/2026 (pedido do dono): o RH faz a rotina de usuários como o Gestor (perfis-rotina-geral.test.cjs cobre o resto).
test('perfil RH: consulta e altera contas operacionais, não dá Administrador; Técnico não consulta', () => {
  const { s, tabelas } = contexto(equipe(), sessoes);
  const lista = s.SGO_USUARIOS.pesquisar('R', '');
  assert.equal(lista.success, true);
  assert.ok(lista.items.every((x) => x.SENHA === undefined));
  assert.equal(lista.items.find((x) => x.ID === 'u2').VINCULO_TRABALHO, 'PJ');
  assert.equal(s.SGO_USUARIOS.atualizar('R', 'u2', { NOME: 'BIA PJ ALTERADA' }).success, true);
  assert.equal(s.SGO_USUARIOS.criar('R', { USUARIO: 'z', NOME: 'Z', EMAIL: 'z@x.com.br', PERFIL: 'ADMIN', SENHA: '123456' }).success, false);
  assert.throws(() => s.SGO_USUARIOS.pesquisar('T', ''), /Acesso negado/);
  assert.throws(() => s.SGO_USUARIOS.atualizar('T', 'u2', { NOME: 'x' }), /Acesso negado/);
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.ID === 'u2').NOME, 'BIA PJ ALTERADA');
  // Gestor dá o perfil RH, mas continua sem dar Administrador.
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u1', { PERFIL: 'RH' }).success, true);
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'u1', { PERFIL: 'ADMIN' }).success, false);
});

test('perfil RH: helpers de permissão', () => {
  const { s } = contexto(equipe(), sessoes);
  assert.equal(s.SGO_ehPerfilRH_(' rh '), true);
  assert.equal(s.SGO_podeConsultarPessoas_('RH'), true);
  assert.equal(s.SGO_podeConsultarPessoas_('TECNICO'), false);
  assert.equal(s.isAdminPerfilAuth_('RH'), false);
  assert.throws(() => s.SGO_bloquearRH_({ perfil: 'RH' }, 'o Laudo NR-13'), /perfil RH não tem acesso/);
  assert.doesNotThrow(() => s.SGO_bloquearRH_({ perfil: 'TECNICO' }, 'o Laudo NR-13'));
});

test('módulos técnicos recusam o perfil RH no despacho (Relatório de calibração)', () => {
  const s = {
    exigirSessao: (sid) => ({ perfil: sid }),
    DriveApp: new Proxy({}, { get() { throw Error('Drive não deveria ser acessado'); } }),
    UrlFetchApp: { fetch() { throw Error('HTTP não deveria ser acessado'); } },
  };
  vm.createContext(s);
  vm.runInContext(ler('SGO_Auth.js').match(/function SGO_ehPerfilRH_[\s\S]*?function SGO_bloquearRH_[\s\S]*?\n}\n/)[0], s);
  for (const f of ['Config', 'Main']) vm.runInContext(ler(`SGO_RelCal_${f}.js`), s);
  assert.throws(() => s.RelCal_apiDispatch({ fn: 'apiPing', sessionId: 'RH', payload: {} }), /perfil RH/);
  assert.equal(s.RelCal_apiDispatch({ fn: 'apiPing', sessionId: 'TECNICO' }).ok, true);
});

test('perfil Diretoria (19/10/2026): Administrador e Diretoria dão; Gestor não dá nem altera conta da Diretoria', () => {
  const usuarios = equipe().concat([
    { ID: 'a1', USUARIO: 'admin', NOME: 'ADMIN', PERFIL: 'ADMIN', EMAIL: 'a@x.com.br', STATUS: 'ATIVO' },
    { ID: 'd1', USUARIO: 'dir', NOME: 'DIRETORA', PERFIL: 'DIRETORIA', EMAIL: 'd@x.com.br', STATUS: 'ATIVO' },
  ]);
  const ses = Object.assign({}, sessoes, { A: { userId: 'a1', usuario: 'admin', perfil: 'ADMIN' }, D: { userId: 'd1', usuario: 'dir', perfil: 'DIRETORIA' } });
  const { s, tabelas } = contexto(usuarios, ses);
  const u = (id) => tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  const negadoGestor = s.SGO_USUARIOS.atualizar('G', 'u1', { PERFIL: 'DIRETORIA' });
  assert.equal(negadoGestor.success, false);
  assert.match(negadoGestor.message, /perfil Diretoria só é dado ou alterado por um Administrador ou pela Diretoria/);
  assert.equal(s.SGO_USUARIOS.atualizar('G', 'd1', { NOME: 'Outra' }).success, false);
  assert.equal(s.SGO_USUARIOS.criar('G', { USUARIO: 'eva', NOME: 'Eva', EMAIL: 'eva@x.com.br', PERFIL: 'DIRETORIA', SENHA: '123456' }).success, false);
  assert.equal(s.SGO_USUARIOS.atualizar('A', 'u1', { PERFIL: 'DIRETORIA' }).success, true);
  assert.equal(u('u1').PERFIL, 'DIRETORIA');
  assert.equal(s.SGO_USUARIOS.criar('D', { USUARIO: 'eva', NOME: 'Eva', EMAIL: 'eva@x.com.br', PERFIL: 'DIRETORIA', SENHA: '123456' }).success, true);
  assert.equal(s.SGO_USUARIOS.atualizar('D', 'u2', { PERFIL: 'ADMIN' }).success, false);
});

// ------------------------------------------------------------
// Vínculo DIRETORIA (22/10/2026, pedido do dono): a empresa tem CLT, PJ e Diretoria.
// ------------------------------------------------------------
// Listas vindas do contexto isolado têm outro Array: comparar pelo conteúdo.
const j = (x) => JSON.parse(JSON.stringify(x));
function contextoDiretoria(extra) {
  const usuarios = equipe().concat([
    { ID: 'a1', USUARIO: 'admin', NOME: 'THIAGO', PERFIL: 'ADMIN', EMAIL: 'a@x.com.br', STATUS: 'ATIVO', VINCULO_TRABALHO: '' },
    { ID: 'd1', USUARIO: 'charles', NOME: 'CHARLES', PERFIL: 'DIRETORIA', EMAIL: 'c@x.com.br', CELULAR: '5511987654324', STATUS: 'ATIVO', VINCULO_TRABALHO: '' },
    { ID: 'd2', USUARIO: 'dirclt', NOME: 'DIRETORA CLT', PERFIL: 'DIRETORIA', EMAIL: 'dc@x.com.br', STATUS: 'ATIVO', VINCULO_TRABALHO: 'CLT' },
    { ID: 'd3', USUARIO: 'dirok', NOME: 'DIRETOR JA INFORMADO', PERFIL: 'DIRETORIA', EMAIL: 'do@x.com.br', CELULAR: '5511987654325', STATUS: 'ATIVO', VINCULO_TRABALHO: 'DIRETORIA' },
    { ID: 'c1', USUARIO: 'cli', NOME: 'CLIENTE', PERFIL: 'CLIENTE', CLIENTE_ID: 'x', EMAIL: 'cli@x.com.br', STATUS: 'ATIVO', VINCULO_TRABALHO: '' },
  ].concat(extra || []));
  const ses = Object.assign({}, sessoes, { A: { userId: 'a1', usuario: 'admin', perfil: 'ADMIN' }, D: { userId: 'd1', usuario: 'charles', perfil: 'DIRETORIA' } });
  const amb = contexto(usuarios, ses);
  const props = {}, logs = [];
  amb.s.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) };
  amb.s.SGO_DATA.log = (acao, usuario, detalhe, modulo) => logs.push({ acao, usuario, detalhe, modulo });
  return Object.assign(amb, { props, logs });
}

test('DIRETORIA: aceito na normalização (qualquer caixa), rótulo "Diretoria", valor estranho continua recusado', () => {
  const { s, tabelas } = contextoDiretoria();
  const u = (id) => tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  assert.equal(s.SGO_USUARIOS.atualizar('A', 'u3', { VINCULO_TRABALHO: 'Diretoria' }).success, true);
  assert.equal(u('u3').VINCULO_TRABALHO, 'DIRETORIA');
  assert.equal(s.SGO_USUARIOS.criar('A', { USUARIO: 'novo.dir', NOME: 'Novo', EMAIL: 'nd@x.com.br', PERFIL: 'DIRETORIA', SENHA: '123456', VINCULO_TRABALHO: ' diretoria ' }).success, true);
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.USUARIO === 'novo.dir').VINCULO_TRABALHO, 'DIRETORIA');
  const ruim = s.SGO_USUARIOS.atualizar('A', 'u3', { VINCULO_TRABALHO: 'DIRETOR' });
  assert.equal(ruim.success, false);
  assert.match(ruim.message, /escolha CLT, PJ, Diretoria ou Não informado/);
  assert.equal(u('u3').VINCULO_TRABALHO, 'DIRETORIA');
  assert.deepEqual(j(s.SGO_VINCULOS_TRABALHO), ['CLT', 'PJ', 'DIRETORIA']);
  assert.equal(s.SGO_rotuloVinculo_('DIRETORIA'), 'Diretoria');
  assert.equal(s.SGO_rotuloVinculo_(' diretoria '), 'Diretoria');
  assert.equal(s.SGO_rotuloVinculo_('PJ'), 'PJ');
  assert.equal(s.SGO_rotuloVinculo_(''), 'Não informado');
  assert.equal(s.SGO_rotuloVinculo_('XYZ'), 'Não informado');
});

test('DIRETORIA: categoria PONTO não vai (como PJ), com o motivo próprio; as outras categorias vão', () => {
  const { s, tabelas, emails } = contextoDiretoria();
  s.SGO_notificar_({ usuarios: ['u1', 'd3'], titulo: 'Marcação do ponto', texto: 'Teste', canais: ['email', 'whatsapp'], categoria: 'PONTO', origem: 'PONTO', refId: 'p9' });
  assert.deepEqual(emails, ['ana@x.com.br']);
  const l = tabelas.NTF_ENVIOS.find((x) => x.USUARIO_ID === 'd3' && x.CANAL === 'whatsapp');
  assert.equal(l.SITUACAO, 'PULADO');
  assert.equal(l.MOTIVO, 'Diretoria: mensagens do ponto não são enviadas');
  assert.equal(s.Notificar_motivoCategoria_('PONTO', { vinculo: 'DIRETORIA' }), 'Diretoria: mensagens do ponto não são enviadas');
  assert.equal(s.Notificar_motivoCategoria_('FROTA', { vinculo: 'DIRETORIA' }), '');
  s.SGO_notificar_({ usuarios: ['d3'], titulo: 'Relatório da gestão', texto: 'Teste', canais: ['email'], categoria: 'GESTAO_RELATORIO', refId: 'g9' });
  assert.deepEqual(emails, ['ana@x.com.br', 'do@x.com.br']);
});

test('DIRETORIA: WhatsApp de atividades, gestão e Frota só se a gestão liberar o vínculo (padrão só CLT)', () => {
  const { s } = contextoDiretoria();
  const dir = { id: 'd3', vinculo: 'DIRETORIA' };
  s.Atividades_avisosCfg_ = () => ({ whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT'] });
  assert.match(s.Notificar_motivoAtividadesWhatsapp_(dir, {}, new Date()), /^Diretoria: atividades não são cobradas pelo WhatsApp/);
  assert.match(s.Notificar_motivoGestaoWhatsapp_(dir, {}, new Date()), /^Diretoria: o resumo da gestão não vai pelo WhatsApp/);
  assert.match(s.Notificar_motivoFrotaReservasWhatsapp_(dir, {}, new Date()), /^Diretoria: avisos de reserva da Frota não vão pelo WhatsApp/);
  s.Atividades_avisosCfg_ = () => ({ whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT', 'DIRETORIA'] });
  assert.equal(s.Notificar_motivoAtividadesWhatsapp_(dir, {}, new Date()), '');
  assert.equal(s.Notificar_motivoGestaoWhatsapp_(dir, {}, new Date()), '');
  assert.equal(s.Notificar_motivoFrotaReservasWhatsapp_(dir, {}, new Date()), '');
  assert.match(s.Notificar_motivoAtividadesWhatsapp_({ id: 'u2', vinculo: 'PJ' }, {}, new Date()), /^PJ: /);
  // A configuração real (SGO_Atividades_Avisos.js) aceita DIRETORIA na lista e descarta o que não existe. Desde 26/10/2026 o padrão
  // é CLT e PJ, e a configuração gravada antes dessa decisão ganha o PJ uma vez.
  const atv = ler('SGO_Atividades_Avisos.js');
  const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => JSON.stringify({ vinculosWhatsapp: ['clt', 'DIRETORIA', 'ESTAGIO'] }) }) }, SGO_expedienteHoraValida_: () => false };
  vm.createContext(ctx);
  vm.runInContext(atv.match(/var ATV_AVISOS_CFG_PADRAO[\s\S]*?var ATV_VINCULOS_OPCOES = [^\n]*\n/)[0], ctx);
  vm.runInContext(atv.match(/function Atividades_avisosCfg_\(\) \{[\s\S]*?\n\}\n/)[0], ctx);
  assert.deepEqual(j(ctx.ATV_VINCULOS_OPCOES), ['CLT', 'PJ', 'DIRETORIA', 'VAZIO']);
  assert.deepEqual(j(ctx.Atividades_avisosCfg_().vinculosWhatsapp), ['CLT', 'DIRETORIA', 'PJ']);
  assert.deepEqual(j(ctx.ATV_AVISOS_CFG_PADRAO.vinculosWhatsapp), ['CLT', 'PJ']);
});

test('DIRETORIA: o Assistente do ponto não lembra (como PJ), com texto próprio', () => {
  const src = ler('SGO_Ponto_Config.js');
  const ctx = { Pto_s_: (v) => (v === null || v === undefined ? '' : String(v).trim()), Pto_verdade_: (v) => v === true || /^(SIM|TRUE|1)$/i.test(String(v)) };
  vm.createContext(ctx);
  vm.runInContext(src.match(/var PONTO_FORA_TEXTO = \{[\s\S]*?\n\};\n/)[0], ctx);
  vm.runInContext(src.match(/function Ponto_motivoFora_\([\s\S]*?\n\}\n/)[0], ctx);
  const base = { ativo: true, sistema: false, celular: '5511999999999' };
  assert.equal(ctx.Ponto_motivoFora_(Object.assign({}, base, { vinculo: 'DIRETORIA' }), null, null, {}), 'DIRETORIA');
  assert.equal(ctx.PONTO_FORA_TEXTO.DIRETORIA, 'Diretoria: não recebe nada do ponto');
  assert.equal(ctx.Ponto_motivoFora_(Object.assign({}, base, { vinculo: 'PJ' }), null, null, {}), 'PJ');
  assert.equal(ctx.Ponto_motivoFora_(Object.assign({}, base, { vinculo: '' }), null, null, {}), 'SEM_VINCULO');
  assert.match(ctx.PONTO_FORA_TEXTO.SEM_VINCULO, /CLT, PJ ou Diretoria/);
  assert.equal(ctx.Ponto_motivoFora_(Object.assign({}, base, { vinculo: 'CLT' }), null, null, {}), '');
});

test('DIRETORIA: saneamento preenche só o vínculo vazio de quem tem perfil Diretoria (ou é o responsável pelo sistema), uma vez, com auditoria', () => {
  const { s, tabelas, props, logs } = contextoDiretoria();
  const u = (id) => tabelas.CAD_USUARIOS.find((x) => x.ID === id);
  assert.equal(s.Usuarios_vinculoSugerido_(u('d1')), 'DIRETORIA');
  assert.equal(s.Usuarios_vinculoSugerido_(u('a1')), 'DIRETORIA');   // login admin = responsável pelo sistema (SGO_DONOS)
  assert.equal(s.Usuarios_vinculoSugerido_(u('d2')), '');            // já informado (CLT): nunca sobrescreve
  assert.equal(s.Usuarios_vinculoSugerido_(u('u3')), '');            // técnico sem vínculo: não é da Diretoria
  assert.equal(s.Usuarios_vinculoSugerido_(u('c1')), '');            // cliente: não se aplica
  const r = s.Usuarios_saneamentoVinculoDiretoria_();
  assert.equal(r.aplicado, true);
  assert.deepEqual(j(r.logins).sort(), ['admin', 'charles']);
  assert.equal(u('d1').VINCULO_TRABALHO, 'DIRETORIA');
  assert.equal(u('a1').VINCULO_TRABALHO, 'DIRETORIA');
  assert.equal(u('d2').VINCULO_TRABALHO, 'CLT');
  assert.equal(u('d3').VINCULO_TRABALHO, 'DIRETORIA');
  assert.equal(u('u3').VINCULO_TRABALHO, '');
  assert.equal(u('c1').VINCULO_TRABALHO, '');
  assert.equal(u('d1').NOME, 'CHARLES');   // só o vínculo muda
  const aud = logs.filter((l) => l.acao === 'USUARIOS_VINCULO_AUTO');
  assert.ok(aud.every((l) => l.usuario === 'sistema' && l.modulo === 'USUARIOS'));
  assert.ok(aud.some((l) => /charles/.test(l.detalhe) && /perfil Diretoria/.test(l.detalhe)));
  assert.ok(aud.some((l) => /admin/.test(l.detalhe) && /responsável pelo sistema/.test(l.detalhe)));
  assert.equal(props.USR_VINCULO_DIRETORIA_20261022, '1');
  // Segunda chamada: não roda de novo (nem mexe em quem ficou sem vínculo depois).
  tabelas.CAD_USUARIOS.push({ ID: 'd4', USUARIO: 'dirdepois', NOME: 'DEPOIS', PERFIL: 'DIRETORIA', EMAIL: 'dd@x.com.br', STATUS: 'ATIVO', VINCULO_TRABALHO: '' });
  const r2 = s.Usuarios_saneamentoVinculoDiretoria_();
  assert.equal(r2.aplicado, false);
  assert.deepEqual(j(r2.logins), []);
  assert.equal(u('d4').VINCULO_TRABALHO, '');
  assert.equal(s.Usuarios_vinculoSugerido_(u('d4')), 'DIRETORIA');   // a tela continua sugerindo
});

test('DIRETORIA: a tela Usuários (usuariosPainel) aplica o saneamento ao abrir, devolve o rótulo e a sugestão', () => {
  const { s, tabelas } = contextoDiretoria();
  const r = s.usuariosPainel('A');
  assert.equal(r.success, true);
  const it = (id) => r.items.find((x) => x.ID === id);
  assert.equal(it('d1').VINCULO_TRABALHO, 'DIRETORIA');
  assert.equal(it('d1').VINCULO_ROTULO, 'Diretoria');
  assert.equal(it('d1').VINCULO_SUGERIDO, '');
  assert.equal(it('u2').VINCULO_ROTULO, 'PJ');
  assert.equal(it('u3').VINCULO_ROTULO, 'Não informado');
  assert.equal(it('u3').VINCULO_SUGERIDO, '');
  assert.ok(r.items.every((x) => x.SENHA === undefined));
  // Diretoria criada depois do saneamento, sem vínculo: a lista sugere "Diretoria".
  tabelas.CAD_USUARIOS.push({ ID: 'd4', USUARIO: 'dirdepois', NOME: 'DEPOIS', PERFIL: 'DIRETORIA', EMAIL: 'dd@x.com.br', STATUS: 'ATIVO', VINCULO_TRABALHO: '' });
  const r2 = s.usuariosPainel('A');
  assert.equal(r2.items.find((x) => x.ID === 'd4').VINCULO_SUGERIDO, 'DIRETORIA');
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.ID === 'd4').VINCULO_TRABALHO, '');
});

test('DIRETORIA na tela (JS_Admin.html): select com Diretoria, filtro de vínculos, rótulo e "Sem vínculo (ativos)" sem contar a Diretoria', () => {
  const html = fs.readFileSync(path.join(base, 'JS_Admin.html'), 'utf8').replace(/\r\n/g, '\n');
  const ctx = { CadUI_esc_: (v) => String(v) };
  vm.createContext(ctx);
  vm.runInContext(html.match(/var USUARIOS_VINCULOS = [^\n]*\n/)[0], ctx);
  vm.runInContext(html.match(/function Usuarios_rotuloVinculo_\(v\) \{[^\n]*\n/)[0], ctx);
  vm.runInContext(html.match(/function Usuarios_seloVinculo_\(u\) \{[\s\S]*?\n  \}\n/)[0], ctx);
  assert.deepEqual(j(ctx.USUARIOS_VINCULOS), [['CLT', 'CLT'], ['PJ', 'PJ'], ['DIRETORIA', 'Diretoria']]);
  assert.equal(ctx.Usuarios_rotuloVinculo_('DIRETORIA'), 'Diretoria');
  assert.equal(ctx.Usuarios_rotuloVinculo_(''), 'Não informado');
  assert.match(ctx.Usuarios_seloVinculo_({ VINCULO_TRABALHO: 'DIRETORIA', PERFIL: 'DIRETORIA' }), />Diretoria</);
  assert.match(ctx.Usuarios_seloVinculo_({ VINCULO_TRABALHO: '', VINCULO_SUGERIDO: 'DIRETORIA', PERFIL: 'DIRETORIA' }), /Diretoria\?/);
  assert.match(ctx.Usuarios_seloVinculo_({ VINCULO_TRABALHO: '', PERFIL: 'TECNICO' }), /Não informado/);
  const filtro = vm.runInContext('(' + html.match(/id: "semvinculo"[^\n]*?filtro: (function \(u\) \{[^\n]*?\})/)[1] + ')', ctx);
  assert.equal(filtro({ STATUS: 'ATIVO', PERFIL: 'DIRETORIA', VINCULO_TRABALHO: 'DIRETORIA' }), false);
  assert.equal(filtro({ STATUS: 'ATIVO', PERFIL: 'DIRETORIA', VINCULO_TRABALHO: '', VINCULO_SUGERIDO: 'DIRETORIA' }), false);
  assert.equal(filtro({ STATUS: 'ATIVO', PERFIL: 'TECNICO', VINCULO_TRABALHO: '', VINCULO_SUGERIDO: '' }), true);
  assert.equal(filtro({ STATUS: 'ATIVO', PERFIL: 'CLIENTE', VINCULO_TRABALHO: '' }), false);
  const opcoes = vm.runInContext('(' + html.match(/id: "vinculo", rotulo: "Todos os vínculos", opcoes: (function \(\) \{[^\n]*?\}), aplicar/)[1] + ')()', ctx);
  assert.deepEqual(j(opcoes).map((o) => o[0]), ['CLT', 'PJ', 'DIRETORIA', 'NI']);
  assert.match(html, /\[\["", "Não informado"\]\]\.concat\(USUARIOS_VINCULOS\)/);   // select do formulário
  assert.match(html, /perfilSel\.value === "DIRETORIA"\) \{ v\.value = "DIRETORIA"/);   // sugestão ao escolher o perfil
});
