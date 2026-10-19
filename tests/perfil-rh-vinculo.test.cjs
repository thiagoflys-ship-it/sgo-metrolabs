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

test('perfil RH: consulta a lista de usuários, não cria nem altera; Técnico não consulta', () => {
  const { s, tabelas } = contexto(equipe(), sessoes);
  const lista = s.SGO_USUARIOS.pesquisar('R', '');
  assert.equal(lista.success, true);
  assert.ok(lista.items.every((x) => x.SENHA === undefined));
  assert.equal(lista.items.find((x) => x.ID === 'u2').VINCULO_TRABALHO, 'PJ');
  assert.throws(() => s.SGO_USUARIOS.atualizar('R', 'u2', { NOME: 'x' }), /Acesso negado/);
  assert.throws(() => s.SGO_USUARIOS.criar('R', { USUARIO: 'z', NOME: 'Z', EMAIL: 'z@x.com.br', PERFIL: 'ADMIN', SENHA: '123456' }), /Acesso negado/);
  assert.throws(() => s.SGO_USUARIOS.inativar('R', 'u2'), /Acesso negado/);
  assert.throws(() => s.SGO_USUARIOS.pesquisar('T', ''), /Acesso negado/);
  assert.equal(tabelas.CAD_USUARIOS.find((x) => x.ID === 'u2').NOME, 'BIA PJ');
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
