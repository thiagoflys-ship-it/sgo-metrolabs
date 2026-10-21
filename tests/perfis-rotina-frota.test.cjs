// Rotina da empresa na Frota (21/10/2026, pedido do dono): RH e Financeiro fazem o que o Gestor faz na Frota
// (editar condutor e CNH, cadastrar condutor e veículo, multas, documentos, reservas e rastreamento).
// Código real do SGO+ (SGO_Auth.js: regra de perfil; SGO_Frota_*.js) num contexto isolado, só com dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); };

const SESSOES = {
  ADM: { userId: 'u_adm', usuario: 'adm', nome: 'ADMIN TESTE', perfil: 'ADMIN' },
  GES: { userId: 'u_ges', usuario: 'ges', nome: 'GESTOR TESTE', perfil: 'GESTOR' },
  RH: { userId: 'u_rh', usuario: 'rh', nome: 'RH TESTE', perfil: 'RH' },
  FIN: { userId: 'u_fin', usuario: 'fin', nome: 'FINANCEIRO TESTE', perfil: 'FINANCEIRO' },
  TEC: { userId: 'u_tec', usuario: 'tec', nome: 'TECNICO TESTE', perfil: 'TECNICO' },
  COM: { userId: 'u_com', usuario: 'com', nome: 'COMERCIAL TESTE', perfil: 'COMERCIAL' },
  CLI: { userId: 'u_cli', usuario: 'cli', nome: 'CLIENTE TESTE', perfil: 'CLIENTE' }
};

/** Regra de perfil real do SGO_Auth.js (isAdminSession, isAdminPerfilAuth_ e o bloco de RH/rotina). */
function carregarAuth(ctx) {
  const auth = ler('SGO_Auth.js');
  vm.runInContext(auth.match(/function isAdminSession[\s\S]*?\n}\n/)[0], ctx);
  vm.runInContext(auth.match(/function isAdminPerfilAuth_[\s\S]*?\n}\n/)[0], ctx);
  vm.runInContext(auth.match(/function SGO_ehPerfilRH_[\s\S]*?function SGO_bloquearRH_[\s\S]*?\n}\n/)[0], ctx);
}

function ambiente() {
  const tabelas = {
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A11', MODELO: 'Carro de teste', KM_ATUAL: 20000, STATUS: 'ATIVO' }],
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'CONDUTOR TESTE', USUARIO_ID: '', CNH: '000', TELEFONE: '11900000000', CNH_VALIDADE: dia(-5), STATUS: 'ATIVO' }],
    CAD_USUARIOS: Object.values(SESSOES).map((s) => ({ ID: s.userId, NOME: s.nome, USUARIO: s.usuario, PERFIL: s.perfil, STATUS: 'ATIVO' })),
    REG_FROTA_MOVIMENTACAO: [], REG_FROTA_MULTA: [], REG_FROTA_MANUTENCAO: [], REG_FROTA_DESPESA: [], REG_FROTA_PARADA: [],
    REG_FROTA_ABASTECIMENTO: [], REG_FROTA_DOCUMENTO: [], REG_FROTA_AUDITORIA: []
  };
  let seq = 0;
  const sessao = { atual: null };
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      gerarRegistroBase: (o) => Object.assign({ ID: 'g' + (++seq) }, o),
      normalizarObjetoParaSheet: (t, o) => o,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_MULTA: 'REG_FROTA_MULTA', REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA',
      REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO', REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO' } },
    exigirSessao: (sid) => { const s = SESSOES[sid]; if (!s) throw new Error('Sessão inválida'); return s; },
    validarSessao: (sid) => (SESSOES[sid] ? { valid: true, data: SESSOES[sid] } : { valid: false }),
    SGO_DocA4_num_: (v, c) => Number(v).toFixed(c).replace('.', ','), RELA4_CORES: {}
  });
  vm.runInContext(ler('SGO_Utilis.js'), ctx);
  carregarAuth(ctx);
  for (const f of ['SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Identificacao.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Reservas.js']) vm.runInContext(ler(f), ctx);
  return { ctx, tabelas, sessao };
}

test('RH e Financeiro editam o condutor (validade e número da CNH, telefone) como o Gestor', () => {
  for (const sid of ['RH', 'FIN', 'GES']) {
    const { ctx, tabelas } = ambiente();
    const r = ctx.Frota_apiAtualizarCondutor(sid, { id: 'c1', cnhValidade: '15/03/2031', cnh: '12345678900', telefone: '(11) 98888-7777' });
    assert.equal(r.ok, true, sid);
    const c = tabelas.CAD_CONDUTORES[0];
    assert.equal(c.CNH_VALIDADE, '15/03/2031', sid);
    assert.equal(c.CNH, '12345678900', sid);
    assert.equal(c.TELEFONE, '11988887777', sid);
  }
});

test('RH e Financeiro cadastram condutor (ligado ao login) e veículo', () => {
  for (const sid of ['RH', 'FIN']) {
    const { ctx, tabelas } = ambiente();
    const c = ctx.Frota_apiCriarCondutor(sid, { usuarioId: 'u_tec', cnh: '999', cnhValidade: dia(400), telefone: '11977776666' });
    assert.equal(c.ok, true);
    assert.equal(tabelas.CAD_CONDUTORES.length, 2);
    assert.equal(tabelas.CAD_CONDUTORES[1].NOME, 'TECNICO TESTE');
    const v = ctx.Frota_apiCriarVeiculo(sid, { placa: 'tst9z99', modelo: 'Utilitário de teste', kmAtual: '1.234' });
    assert.equal(v.ok, true);
    assert.equal(tabelas.CAD_VEICULOS[1].PLACA, 'TST9Z99');
  }
});

test('técnico, comercial e cliente continuam sem editar condutor; a mensagem diz quem pode e o que fazer', () => {
  for (const sid of ['TEC', 'COM']) {
    const { ctx, tabelas } = ambiente();
    assert.throws(() => ctx.Frota_apiAtualizarCondutor(sid, { id: 'c1', cnhValidade: '15/03/2031' }), /gestão \(Administrador, Diretoria, Gestor, RH ou Financeiro\)[\s\S]*Situação e retiradas/);
    assert.equal(tabelas.CAD_CONDUTORES[0].CNH, '000');
  }
  const { ctx } = ambiente();
  assert.throws(() => ctx.Frota_apiAtualizarCondutor('CLI', { id: 'c1', cnh: '1' }), /equipe interna/);
});

test('regra de perfil: rotina da empresa inclui RH e Financeiro; a gestão de decisões (isAdminPerfilAuth_) não muda', () => {
  const { ctx } = ambiente();
  for (const p of ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO', ' rh ']) assert.equal(ctx.SGO_ehGestaoRotina_(p), true, p);
  for (const p of ['TECNICO', 'METROLOGIA', 'COMERCIAL', 'CLIENTE', '', null]) assert.equal(ctx.SGO_ehGestaoRotina_(p), false, String(p));
  assert.equal(ctx.isAdminPerfilAuth_('RH'), false);
  assert.equal(ctx.isAdminPerfilAuth_('FINANCEIRO'), false);
  assert.equal(ctx.Frota_ehGestao_('RH'), true);
  assert.equal(ctx.Frota_ehGestao_('FIN'), true);
  assert.equal(ctx.Frota_ehGestao_('TEC'), false);
  assert.equal(ctx.Frota_ehGestao_('sessao-invalida'), false);
});

test('reservas: RH e Financeiro entram como gestão (manutenção programada, regras, indicadores); avisos à gestão não mudam', () => {
  const { ctx } = ambiente();
  assert.equal(ctx.FrotaRes_sessao_('RH').gestao, true);
  assert.equal(ctx.FrotaRes_sessao_('FIN').gestao, true);
  assert.equal(ctx.FrotaRes_sessao_('TEC').gestao, false);
  // Quem recebe aviso de reserva (sem matriz de avisos): a gestão de antes, sem RH/Financeiro.
  assert.deepEqual(Array.from(ctx.FrotaRes_gestores_()).sort(), ['u_adm', 'u_ges']);
});

test('tela da Frota: o botão de gestão (Editar condutor, cadastros) aparece para RH e Financeiro', () => {
  const tela = ler('SGO_Frota_ConteudoModulo.js');
  assert.match(tela, /function tplFrota_souGestor_\(\) \{[^}]*\['ADMIN', 'GESTOR', 'DIRETORIA', 'RH', 'FINANCEIRO'\]/);
  const ajuda = ler('SGO_Ajuda_Frota.js');
  assert.doesNotMatch(ajuda, /perfil: "ADMIN,GESTOR,DIRETORIA"/);
  assert.match(ajuda, /perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO"/);
});
