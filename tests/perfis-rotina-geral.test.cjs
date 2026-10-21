// Rotina da empresa (21/10/2026, pedido do dono): Gestor, RH e Financeiro cadastram e organizam como o Administrador;
// o que é importante do sistema fica com o Administrador (e a Diretoria onde já era); privacidade e negócio continuam.
// Código real do SGO+ (SGO_Auth.js, SGO_Usuarios.js, Caixa de decisões, Matriz de avisos, Atividades, Comercial e Chaves)
// num contexto isolado, só com dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const matriz = require('./_matriz_ambiente.cjs');
const comercial = require('./_comercial_ambiente.cjs');

const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8').replace(/\r\n/g, '\n');
const AUTH = ler('SGO_Auth.js');
const blocoRotina = () => AUTH.match(/function SGO_ehPerfilRH_[\s\S]*?function SGO_bloquearRH_[\s\S]*?\n}\n/)[0];

// ---------------------------------------------------------------- usuários
const EQUIPE = () => [
  { ID: 'u_adm', USUARIO: 'adm', NOME: 'ADMIN TESTE', PERFIL: 'ADMIN', EMAIL: 'adm@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_adm2', USUARIO: 'adm2', NOME: 'ADMIN DOIS TESTE', PERFIL: 'ADMIN', EMAIL: 'adm2@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_dir', USUARIO: 'dir', NOME: 'DIRETORIA TESTE', PERFIL: 'DIRETORIA', EMAIL: 'dir@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_ges', USUARIO: 'ges', NOME: 'GESTOR TESTE', PERFIL: 'GESTOR', EMAIL: 'ges@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_rh', USUARIO: 'rh', NOME: 'RH TESTE', PERFIL: 'RH', EMAIL: 'rh@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_fin', USUARIO: 'fin', NOME: 'FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', EMAIL: 'fin@exemplo.test', STATUS: 'ATIVO' },
  { ID: 'u_tec', USUARIO: 'tec', NOME: 'TECNICO TESTE', PERFIL: 'TECNICO', EMAIL: 'tec@exemplo.test', STATUS: 'ATIVO' }
];
const SESSOES = {};
EQUIPE().forEach((u) => { SESSOES[u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });

function usuarios() {
  const tabelas = { CAD_USUARIOS: EQUIPE(), CAD_CLIENTES: [] };
  const s = {
    console,
    Utilities: { getUuid: () => 'id-' + Math.random().toString(36).slice(2), formatDate: () => '2026-10-21T10:00:00', sleep() {} },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    gerarHashSenhaAuth_: (x) => 'hash:' + x,
    exigirSessao: (sid) => { const x = SESSOES[sid]; if (!x) throw new Error('Sessão inválida'); return x; },
    validarSessao: (sid) => (SESSOES[sid] ? { valid: true, data: SESSOES[sid] } : { valid: false })
  };
  vm.createContext(s);
  vm.runInContext(ler('SGO_Utilis.js'), s);
  vm.runInContext(`var SGO_CFG = { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', SYS_LOGS: 'SYS_LOGS' }, STATUS: { ATIVO: 'ATIVO' },
    PROFILES: ['ADMIN','DIRETORIA','GESTOR','TECNICO','METROLOGIA','COMERCIAL','FINANCEIRO','RH','CLIENTE'] };`, s);
  s.SGO_DATA = {
    _headersCache: {}, _headerMapCache: {},
    getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
    getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
    update: (t, id, d) => { const r = tabelas[t].find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
    insert: (t, d) => { tabelas[t].push(d); },
    remove: (t, id) => { const i = tabelas[t].findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; tabelas[t].splice(i, 1); return true; },
    log() {}, normalizarObjetoParaSheet: (t, o) => o, gerarRegistroBase: (o) => Object.assign({ ID: 'novo-' + o.USUARIO }, o)
  };
  vm.runInContext(ler('SGO_Data.js').match(/SGO_DATA\.mesclarCampos_ = function[\s\S]*?\n};/)[0], s);
  vm.runInContext(AUTH.match(/function isAdminSession[\s\S]*?\n}\n/)[0], s);
  vm.runInContext(AUTH.match(/function isAdminPerfilAuth_[\s\S]*?\n}\n/)[0], s);
  vm.runInContext(blocoRotina(), s);
  vm.runInContext(ler('SGO_Usuarios.js').replace('const SGO_USUARIOS =', 'var SGO_USUARIOS ='), s);
  return { s, tabelas };
}
const novo = (login, perfil) => ({ USUARIO: login, NOME: 'PESSOA ' + login.toUpperCase() + ' TESTE', EMAIL: login + '@exemplo.test', PERFIL: perfil, SENHA: '123456', VINCULO_TRABALHO: 'CLT' });

test('RH cria técnico (e os outros perfis operacionais), mas não cria Administrador nem Diretoria', () => {
  const { s, tabelas } = usuarios();
  for (const p of ['TECNICO', 'COMERCIAL', 'METROLOGIA', 'FINANCEIRO', 'RH', 'GESTOR']) {
    const r = s.SGO_USUARIOS.criar('rh', novo('rh' + p.toLowerCase(), p));
    assert.equal(r.success, true, p + ': ' + r.message);
  }
  const adm = s.SGO_USUARIOS.criar('rh', novo('outroadm', 'ADMIN'));
  assert.equal(adm.success, false);
  assert.match(adm.message, /só podem ser criadas ou alteradas por um Administrador/);
  const dir = s.SGO_USUARIOS.criar('rh', novo('outradir', 'DIRETORIA'));
  assert.equal(dir.success, false);
  assert.match(dir.message, /Diretoria só é dado ou alterado por um Administrador ou pela Diretoria/);
  assert.ok(!tabelas.CAD_USUARIOS.some((u) => u.USUARIO === 'outroadm' || u.USUARIO === 'outradir'));
  // RH não promove ninguém a Administrador nem mexe na conta de Administrador
  assert.equal(s.SGO_USUARIOS.atualizar('rh', 'u_tec', { PERFIL: 'ADMIN' }).success, false);
  assert.equal(s.SGO_USUARIOS.atualizar('rh', 'u_adm', { NOME: 'OUTRO NOME' }).success, false);
});

test('Financeiro e Gestor também cadastram e alteram contas operacionais (área, vínculo, celular); técnico não', () => {
  const { s, tabelas } = usuarios();
  assert.equal(s.SGO_USUARIOS.criar('fin', novo('novogestor', 'GESTOR')).success, true);
  const r = s.SGO_USUARIOS.atualizar('fin', 'u_tec', { CELULAR: '(11) 98888-7777', VINCULO_TRABALHO: 'PJ' });
  assert.equal(r.success, true, r.message);
  const tec = tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_tec');
  assert.equal(tec.VINCULO_TRABALHO, 'PJ');
  assert.equal(String(tec.CELULAR).replace(/\D/g, '').slice(-8), '88887777');
  assert.equal(s.SGO_USUARIOS.inativar('ges', 'u_tec').success, true);
  assert.equal(s.SGO_USUARIOS.reativar('rh', 'u_tec').success, true);
  assert.throws(() => s.SGO_USUARIOS.criar('tec', novo('x', 'TECNICO')), /gestão \(Administrador, Diretoria, Gestor, RH ou Financeiro\)/);
});

test('ninguém aumenta (nem muda) o próprio perfil; os outros dados da própria conta podem mudar', () => {
  const { s, tabelas } = usuarios();
  for (const [login, id, para] of [['rh', 'u_rh', 'GESTOR'], ['fin', 'u_fin', 'GESTOR'], ['ges', 'u_ges', 'DIRETORIA'], ['dir', 'u_dir', 'ADMIN']]) {
    const r = s.SGO_USUARIOS.atualizar(login, id, { PERFIL: para });
    assert.equal(r.success, false, login);
    assert.match(r.message, /ninguém muda o próprio perfil|Administrador/, login);
  }
  assert.equal(tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_rh').PERFIL, 'RH');
  assert.equal(tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_ges').PERFIL, 'GESTOR');
  const proprio = s.SGO_USUARIOS.atualizar('rh', 'u_rh', { CELULAR: '(11) 97777-6666' });
  assert.equal(proprio.success, true, proprio.message);
});

test('excluir conta de vez: só Administrador e Diretoria; os demais da gestão usam Inativar', () => {
  const { s, tabelas } = usuarios();
  for (const login of ['rh', 'fin', 'ges']) {
    const r = s.SGO_USUARIOS.excluir(login, 'u_tec');
    assert.equal(r.success, false, login);
    assert.match(r.message, /Administrador e da Diretoria[\s\S]*Inativar/);
  }
  assert.ok(tabelas.CAD_USUARIOS.some((u) => u.ID === 'u_tec'), 'nada foi apagado');
  assert.equal(s.SGO_USUARIOS.excluir('dir', 'u_tec').success, true);
});

// ---------------------------------------------------------------- Matriz, Caixa de decisões, avaliação, atividades
function comRotina(amb) { vm.runInContext(blocoRotina(), amb.ctx); return amb; }

test('RH não abre a Matriz de avisos (regras); Administrador e Diretoria abrem', () => {
  const amb = comRotina(matriz.ambiente());
  const r = amb.ctx.SGO_AvisosMatriz_api('s_rh', 'carregar', {});
  assert.equal(r.ok, false);
  assert.match(r.message, /Administrador e da Diretoria/);
  assert.equal(amb.ctx.SGO_AvisosMatriz_api('s_dir', 'carregar', {}).ok, true);
});

test('Caixa de decisões: RH abre e vê só os itens da área em que é responsável; Desempenho da gestão continua restrito', () => {
  const amb = comRotina(matriz.ambiente({ props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'], RH: ['u_rh'] } }) } }));
  matriz.atividade(amb, 'a_tec', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-10T18:00');
  const todas = amb.ctx.Gestao_apiCaixa('s_rh', { filtro: 'todas' });
  assert.equal(todas.ok, true, todas.message);
  assert.ok(todas.itens.every((i) => i.meu), 'RH não vê os itens das outras áreas');
  assert.ok(!todas.itens.some((i) => i.id === 'ATV:a_tec'));
  const gestor = amb.ctx.Gestao_apiCaixa('s_ga', { filtro: 'todas' });
  assert.ok(gestor.itens.some((i) => i.id === 'ATV:a_tec'), 'o Gestor continua vendo a lista da gestão toda');
  assert.equal(amb.ctx.Gestao_apiCaixa('s_tec', {}).ok, false);
  // avaliação do gestor: só o próprio e a Diretoria
  const aval = amb.ctx.Gestao_apiAvaliacao('s_tec', {});
  assert.equal(aval.ok, false);
  assert.match(aval.message, /só pelo próprio gestor e pela Diretoria/);
  const dir = amb.ctx.Gestao_apiAvaliacao('s_dir', {});
  assert.equal(dir.ok, true, dir.message);
  const gil = amb.ctx.Gestao_apiAvaliacao('s_gt', {});
  assert.ok(gil.gestores.every((g) => g.id === 'u_gt'), 'o gestor vê só a própria avaliação');
  // Regras e responsáveis: RH pode ser escolhido, mas não muda as regras
  const cfg = amb.ctx.Gestao_apiConfig('s_rh', {});
  assert.equal(cfg.ok, true, cfg.message);
  assert.equal(cfg.podeConfigurar, false);
  assert.ok(cfg.gestao.some((p) => p.id === 'u_rh'));
});

test('Atividades: RH lança para outra pessoa; atividade restrita (conduta) de outra pessoa não é do Financeiro', () => {
  const amb = comRotina(matriz.ambiente());
  const r = amb.ctx.Atividades_apiCriar('s_rh', { titulo: 'Entregar documento admissional', prazo: '2026-10-22T18:00', responsavelId: 'u_tec' });
  assert.equal(r.ok, true, r.message || r.erro);
  const tec = amb.ctx.Atividades_apiCriar('s_tec', { titulo: 'Para outra pessoa', prazo: '2026-10-22T18:00', responsavelId: 'u_met' });
  assert.equal(tec.ok, false);
  const fin = { id: 'u_fin', gestor: amb.ctx.Atividades_ehGestorPerfil_('FINANCEIRO'), veRestritas: amb.ctx.Atividades_veRestritasPerfil_('FINANCEIRO') };
  const rh = { id: 'u_rh', gestor: amb.ctx.Atividades_ehGestorPerfil_('RH'), veRestritas: amb.ctx.Atividades_veRestritasPerfil_('RH') };
  const restrita = { ID: 'x', MODULO: 'conduta', RESPONSAVEL_ID: 'u_tec', CRIADO_POR_ID: 'u_dir' };
  const comum = { ID: 'y', MODULO: '', RESPONSAVEL_ID: 'u_tec', CRIADO_POR_ID: 'u_dir' };
  assert.equal(fin.gestor, true);
  assert.equal(amb.ctx.Atividades_podeVer_(fin, restrita), false);
  assert.equal(amb.ctx.Atividades_podeEditar_(fin, restrita), false);
  assert.equal(amb.ctx.Atividades_podeEditar_(fin, comum), true);
  assert.equal(amb.ctx.Atividades_podeVer_(rh, restrita), true);
});

// ---------------------------------------------------------------- Comercial
test('RH não vê valores do Comercial; Financeiro mantém o catálogo e vê os pedidos aprovados', () => {
  const amb = comercial.ambiente();
  vm.runInContext(blocoRotina(), amb.ctx);
  const rh = amb.ctx.Comercial_api('s_rita', 'catalogo', {});
  assert.equal(rh.ok, false);
  assert.equal(amb.ctx.Com_nivelDe_({ perfil: 'RH', area: 'RH', id: 'u_rh' }).veValores, false);
  const acessoRh = amb.ctx.Comercial_api('s_rita', 'acesso', {});
  assert.equal(acessoRh.nivel, 'NENHUM');
  const fin = amb.ctx.Comercial_api('s_fabio', 'catalogo', {});
  assert.equal(fin.ok, true, fin.message);
  const salvo = amb.ctx.Comercial_api('s_fabio', 'salvarProduto', { codigo: 'QT-TESTE', nome: 'Serviço de teste', tipo: 'SERVICO', preco: '1.250,00' });
  assert.equal(salvo.ok, true, salvo.message);
  assert.equal(amb.ctx.Comercial_api('s_fabio', 'acesso', {}).catalogo, true);
  assert.equal(amb.ctx.Comercial_api('s_fabio', 'oportunidades', {}).ok, false, 'Financeiro continua fora das oportunidades');
});

// ---------------------------------------------------------------- Chaves e senhas
test('RH não abre Chaves e senhas (só a conta do responsável pelo sistema)', () => {
  const chaves = ler('SGO_Chaves.js');
  const ctx = vm.createContext({
    console, SGO_DATA: { log() {} }, SGO_UTILS: { safe: (v) => String(v == null ? '' : v).trim() },
    validarSessao: (sid) => (SESSOES[sid] ? { valid: true, data: SESSOES[sid] } : { valid: false })
  });
  vm.runInContext(chaves.match(/var SGO_DONOS = [^\n]*\n/)[0], ctx);
  vm.runInContext(chaves.match(/var CHV_MSG_EXCLUSIVO[\s\S]*?;\n/)[0], ctx);
  for (const f of ['Chaves_ehDonoUsuario_', 'Chaves_exigirDono_', 'Chaves_resposta_']) {
    vm.runInContext(chaves.match(new RegExp('function ' + f + '[\\s\\S]*?\\n}\\n'))[0], ctx);
  }
  for (const login of ['rh', 'fin', 'ges']) {
    assert.throws(() => ctx.Chaves_exigirDono_(login), /./, login);
  }
});

// ---------------------------------------------------------------- telas
test('menu: RH ganha os cadastros e a rotina; Chaves e senhas, Matriz de avisos e Comercial continuam fora', () => {
  const core = ler('JS_Core.html');
  const lista = JSON.parse(core.match(/var SGO_TELAS_RH = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  for (const t of ['usuarios', 'clientes', 'unidades', 'equipamentos', 'vinculos', 'frota', 'gestao_decisoes', 'ponto', 'compras_regras', 'whatsapp_piloto']) assert.ok(lista.includes(t), t);
  for (const t of ['chaves', 'avisos_matriz', 'comercial', 'comercial_catalogo', 'admin', 'auvo', 'documentos', 'certificado_calibracao']) assert.ok(!lista.includes(t), t);
  assert.match(ler('JS_AvisosMatriz.html'), /function Mtz_podeMatriz_\(\) \{ var p = Mtz_perfil_\(\); return p === "ADMIN" \|\| p === "DIRETORIA"/);
  assert.match(ler('JS_Cadastros.html'), /function CadUI_podeExcluir_\(\) \{ var p = CadUI_perfil_\(\); return p === "ADMIN" \|\| p === "GESTOR" \|\| p === "DIRETORIA"; \}/);
  assert.match(ler('JS_Comercial.html'), /p === "RH"\) \{ Comercial_mostrarMenu_\(null\)/);
  // a cópia do assistente acompanha o menu
  const assist = ler('SGO_Assistente.js');
  const copia = JSON.parse(assist.match(/var SGO_ASSIST_TELAS_RH = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  assert.deepEqual(copia, lista);
});
