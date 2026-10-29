// Cadastro completo, "Ciente" e Correções de cadastro (29/10/2026, pedido do dono: "Coloca como obrigatoriedade o
// preenchimento correto do cliente [...] coloca um botão 'Ciente' para quando fizermos a rastreabilidade do problema
// identificarmos quem foi, e mostrar os erros em relatório" e "um campo para mostrar erros de clientes e produtos
// cadastrados errados ou duplicados, onde mostra para tomar a ação de correção").
// Código real (SGO_Utilis, SGO_Clientes, SGO_Unidades, SGO_Vinculos, SGO_CadastroQualidade) sobre abas em memória; dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

const CNPJ_A = '11222333000181', CNPJ_B = '11444777000161', CNPJ_C = '44555666000181', CPF_OK = '52998224725';

function ambiente(tabelasIniciais) {
  const tabelas = Object.assign({ CAD_CLIENTES: [], CAD_UNIDADES: [], CAD_EQUIPAMENTOS: [], CAD_CONTATOS: [], SYS_LOGS: [] }, tabelasIniciais || {});
  let seq = 0;
  const sessoes = {
    s_ana: { userId: 'u_ana', usuario: 'ana', nome: 'Ana Cadastro', perfil: 'GESTOR' },
    s_bia: { userId: 'u_bia', usuario: 'bia', nome: 'Bia Técnica', perfil: 'TECNICO' },
    s_dir: { userId: 'u_dir', usuario: 'dir', nome: 'Diretor Teste', perfil: 'DIRETORIA' }
  };
  const cache = {};
  const SGO_DATA = {
    _headersCache: {}, _headerMapCache: {},
    getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
    getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
    update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
    insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: '2026-10-29T10:00:00.000Z' }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
    remove: (t, id) => { const l = tabelas[t] || [], i = l.findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; l.splice(i, 1); return true; },
    gerarRegistroBase: (extra) => Object.assign({ ID: 'id' + (++seq), CRIADO_EM: '2026-10-29T10:00:00.000Z' }, extra || {}),
    normalizarObjetoParaSheet: (t, obj) => Object.assign({}, obj || {}),
    log() {}
  };
  const ctx = vm.createContext({
    console: { log() {}, error() {}, warn() {} }, JSON, Math, Object, Array, String, Number, RegExp, Error, Date, isFinite,
    Utilities: { getUuid: () => 'uuid-' + (++seq), base64EncodeWebSafe: (b) => Buffer.from(String(b)).toString('base64'), computeDigest: (a, s) => String(s).length, DigestAlgorithm: { SHA_256: 'x' } },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ waitLock() { this._m = true; }, hasLock() { return !!this._m; }, releaseLock() { this._m = false; } }) },
    SpreadsheetApp: { flush() {} },
    SGO_CFG: { SHEETS: { CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    SGO_DATA,
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada.'); return sessoes[sid]; },
    isAdminSession: (sid) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessoes[sid] && sessoes[sid].perfil),
    SGO_rotinaSessao_: (sid) => ['ADMIN', 'GESTOR', 'DIRETORIA', 'RH', 'FINANCEIRO'].includes(sessoes[sid] && sessoes[sid].perfil),
    SGO_textoFalhaOperador_: (acao, e) => 'Não foi possível ' + acao + ': ' + String((e && e.message) || e)
  });
  const dataSrc = ler('SGO_Data.js'), ini = dataSrc.indexOf('SGO_DATA.mesclarCampos_ = function');
  for (const f of ['SGO_Utilis.js', 'SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Vinculos.js', 'SGO_CadastroQualidade.js', 'SGO_CadastrosPainel.js']) vm.runInContext(ler(f), ctx, { filename: f });
  vm.runInContext(dataSrc.slice(ini, dataSrc.indexOf('\n};', ini) + 3), ctx);
  vm.runInContext('this.SGO_VINCULOS = SGO_VINCULOS; this.SGO_CLIENTES = SGO_CLIENTES; this.SGO_UTILS = SGO_UTILS;', ctx);
  return { ctx, tabelas, sessoes };
}

const COMPLETO = {
  RAZAO_SOCIAL: 'Hospital Fictício Alfa Ltda', NOME_FANTASIA: 'Hospital Alfa', CNPJ: CNPJ_A, CEP: '13010-000', LOGRADOURO: 'Rua das Flores', NUMERO: '100',
  BAIRRO: 'Centro', CIDADE: 'Campinas', UF: 'SP', CONTATO: 'Maria Responsável', EMAIL: 'maria@alfa.test', TELEFONE: '19999998888'
};

test('CPF: dígitos verificadores conferidos (SGO_UTILS.isCpf)', () => {
  const { ctx } = ambiente();
  assert.equal(ctx.SGO_UTILS.isCpf('529.982.247-25'), true);
  assert.equal(ctx.SGO_UTILS.isCpf('529.982.247-24'), false);
  assert.equal(ctx.SGO_UTILS.isCpf('111.111.111-11'), false);
  assert.equal(ctx.SGO_UTILS.formatCpf(CPF_OK), '529.982.247-25');
});

test('cliente novo incompleto não salva e a resposta diz cada campo que falta; nada é gravado', () => {
  const a = ambiente();
  const r = a.ctx.clientesCriar('s_ana', { RAZAO_SOCIAL: 'Clínica Teste', CNPJ: CNPJ_A, EMAIL: 'x@y.test', CIENTE: true });
  assert.equal(r.success, false);
  assert.equal(r.codigo, 'CADASTRO_INCOMPLETO');
  const campos = r.faltam.map((f) => f.campo);
  for (const c of ['CEP', 'LOGRADOURO', 'NUMERO', 'BAIRRO', 'CIDADE', 'UF', 'CONTATO', 'TELEFONE']) assert.ok(campos.includes(c), c);
  assert.match(r.message, /Peça esses dados ao cliente \(não use informação buscada na internet\)/);
  assert.equal(a.tabelas.CAD_CLIENTES.length, 0);
  const cpfRuim = a.ctx.clientesCriar('s_ana', Object.assign({}, COMPLETO, { CNPJ: '', CPF: '529.982.247-24', CIENTE: true }));
  assert.equal(cpfRuim.success, false);
  assert.ok(cpfRuim.faltam.some((f) => f.campo === 'CPF'), 'CPF com dígito errado');
});

test('sem o "Ciente" não salva; com ele grava quem e quando, monta o endereço e cria a unidade principal com cidade/UF', () => {
  const a = ambiente();
  const semCiente = a.ctx.clientesCriar('s_ana', Object.assign({}, COMPLETO));
  assert.equal(semCiente.success, false);
  assert.equal(semCiente.codigo, 'SEM_CIENTE');
  assert.match(semCiente.message, /Ciente — os dados foram informados pelo cliente/);
  assert.equal(a.tabelas.CAD_CLIENTES.length, 0);
  const r = a.ctx.clientesCriar('s_ana', Object.assign({}, COMPLETO, { CIENTE: true }));
  assert.equal(r.success, true, r.message);
  const c = a.tabelas.CAD_CLIENTES[0];
  assert.equal(c.CRIADO_POR_ID, 'u_ana');
  assert.equal(c.CIENTE_POR_NOME, 'Ana Cadastro');
  assert.ok(c.CIENTE_EM);
  assert.equal(c.ENDERECO, 'RUA DAS FLORES, 100 - CENTRO - CAMPINAS/SP - CEP 13010-000');
  const u = a.tabelas.CAD_UNIDADES[0];
  assert.equal(u.CLIENTE_ID, c.ID);
  assert.equal(u.CIDADE, 'CAMPINAS');
  assert.equal(u.UF, 'SP');
  assert.equal(u.CIENTE_POR_NOME, 'Ana Cadastro');
  const h = a.tabelas.HIST_CADASTROS;
  assert.deepEqual(h.map((x) => x.ENTIDADE + ':' + x.ACAO + ':' + x.CIENTE), ['CLIENTE:CRIAR:SIM', 'UNIDADE:CRIAR:SIM']);
  assert.equal(h[0].USUARIO_NOME, 'Ana Cadastro');
  assert.ok(JSON.parse(h[0].CAMPOS_JSON).some((x) => x.campo === 'CNPJ' && x.para === CNPJ_A));
});

test('cliente pessoa física: CPF válido sem CNPJ cria o cliente e a unidade principal sem CNPJ', () => {
  const a = ambiente();
  const r = a.ctx.clientesCriar('s_ana', Object.assign({}, COMPLETO, { CNPJ: '', CPF: CPF_OK, RAZAO_SOCIAL: 'João da Silva', CIENTE: true }));
  assert.equal(r.success, true, r.message);
  assert.equal(a.tabelas.CAD_CLIENTES[0].CPF, '529.982.247-25');
  assert.equal(a.tabelas.CAD_UNIDADES.length, 1);
  assert.equal(a.tabelas.CAD_UNIDADES[0].CNPJ_UNIDADE, '');
  const dup = a.ctx.clientesCriar('s_ana', Object.assign({}, COMPLETO, { CNPJ: '', CPF: '529.982.247-25', RAZAO_SOCIAL: 'Outro Nome', CIENTE: true, CRIAR_UNIDADE_PRINCIPAL: false }));
  assert.equal(dup.success, false);
  assert.match(dup.message, /CPF/);
});

test('cadastro antigo incompleto funciona, mas para salvar uma alteração precisa completar (merge, nada é apagado)', () => {
  const antigo = { ID: 'c_old', RAZAO_SOCIAL: 'HOSPITAL ANTIGO', CNPJ: CNPJ_B, ENDERECO: 'RUA VELHA 10, CENTRO', CONTATO: '', EMAIL: '', TELEFONE: '', STATUS: 'ATIVO', CRIADO_EM: '2025-05-01T10:00:00Z' };
  const a = ambiente({ CAD_CLIENTES: [Object.assign({}, antigo)] });
  const r1 = a.ctx.clientesAtualizar('s_ana', 'c_old', { TELEFONE: '1933334444', CIENTE: true });
  assert.equal(r1.success, false);
  assert.match(r1.message, /^Este cadastro é antigo e está incompleto: para salvar a alteração, complete:/);
  assert.equal(a.tabelas.CAD_CLIENTES[0].TELEFONE, '', 'nada gravado');
  const r2 = a.ctx.clientesAtualizar('s_bia', 'c_old', Object.assign({}, COMPLETO, { CNPJ: CNPJ_B, RAZAO_SOCIAL: 'HOSPITAL ANTIGO', CIENTE: true }));
  assert.equal(r2.success, true, r2.message);
  const c = a.tabelas.CAD_CLIENTES[0];
  assert.equal(c.CIENTE_POR_NOME, 'Bia Técnica');
  assert.equal(c.CRIADO_EM, antigo.CRIADO_EM);
  const h = a.tabelas.HIST_CADASTROS.at(-1);
  assert.equal(h.ACAO, 'ALTERAR');
  assert.match(h.PROBLEMAS_ANTES, /ENDERECO_INCOMPLETO/);
  assert.equal(h.PROBLEMAS_DEPOIS, '');
  assert.ok(JSON.parse(h.CAMPOS_JSON).some((x) => x.campo === 'ENDERECO' && x.de === 'RUA VELHA 10, CENTRO'), 'de/para do endereço');
});

test('unidade: cidade, UF e "Ciente" obrigatórios pela tela', () => {
  const a = ambiente({ CAD_CLIENTES: [{ ID: 'c1', RAZAO_SOCIAL: 'CLIENTE UM', CNPJ: CNPJ_A, STATUS: 'ATIVO' }] });
  const r1 = a.ctx.unidadesCriar('s_ana', { CLIENTE_ID: 'c1', NOME_UNIDADE: 'Anexo Norte', CIENTE: true });
  assert.equal(r1.success, false);
  assert.deepEqual(r1.faltam.map((f) => f.campo), ['CIDADE', 'UF']);
  const r2 = a.ctx.unidadesCriar('s_ana', { CLIENTE_ID: 'c1', NOME_UNIDADE: 'Anexo Norte', CIDADE: 'Campinas', UF: 'SP' });
  assert.equal(r2.codigo, 'SEM_CIENTE');
  const r3 = a.ctx.unidadesCriar('s_ana', { CLIENTE_ID: 'c1', NOME_UNIDADE: 'Anexo Norte', CIDADE: 'Campinas', UF: 'SP', CIENTE: true });
  assert.equal(r3.success, true, r3.message);
  assert.equal(a.tabelas.CAD_UNIDADES[0].CRIADO_POR_NOME, 'Ana Cadastro');
  assert.equal(a.tabelas.HIST_CADASTROS.at(-1).ENTIDADE, 'UNIDADE');
});

test('correções: a completar, duplicados por CNPJ e por nome parecido, filiais (CNPJs diferentes) fora, produtos e recorte por quem cadastrou', () => {
  const a = ambiente();
  const Q = a.ctx;
  const ok = Object.assign({}, COMPLETO, { STATUS: 'ATIVO' });
  const dados = {
    clientes: [
      Object.assign({}, ok, { ID: 'c1', CRIADO_POR_ID: 'u_ana', CRIADO_POR_NOME: 'Ana', CIENTE_EM: '2026-10-29T10:00:00Z', CIENTE_POR_NOME: 'Ana' }),
      Object.assign({}, ok, { ID: 'c2', RAZAO_SOCIAL: 'HOSPITAL FICTICIO ALFA - LTDA.', CRIADO_POR_ID: 'u_bia', CRIADO_POR_NOME: 'Bia' }),
      { ID: 'c3', RAZAO_SOCIAL: 'Clínica São Lucas ME', CNPJ: '', STATUS: 'ATIVO', CRIADO_POR_ID: 'u_bia', CRIADO_POR_NOME: 'Bia' },
      { ID: 'c4', RAZAO_SOCIAL: 'CLINICA SAO LUCAS', CNPJ: '123', STATUS: 'ATIVO' },
      Object.assign({}, ok, { ID: 'c5', RAZAO_SOCIAL: 'Rede Beta Saúde', CNPJ: CNPJ_B }),
      Object.assign({}, ok, { ID: 'c6', RAZAO_SOCIAL: 'Rede Beta Saude', CNPJ: CNPJ_C }),
      Object.assign({}, ok, { ID: 'c7', RAZAO_SOCIAL: 'INATIVO REPETIDO', STATUS: 'INATIVO' })
    ],
    unidades: [{ ID: 'u1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Matriz', CIDADE: '', UF: '', STATUS: 'ATIVO', CRIADO_POR_ID: 'u_bia' }],
    produtos: [
      { ID: 'p1', CODIGO: 'QT-1', NOME: 'Qualificação térmica', PRECO: 0, UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' },
      { ID: 'p2', CODIGO: 'QT-2', NOME: 'Qualificacao Termica', PRECO: 900, CUSTO: 1000, UNIDADE_MEDIDA: '', ATIVO: 'SIM' },
      { ID: 'p3', CODIGO: 'QT-3', NOME: 'Qualificação térmica', PRECO: 800, ATIVO: 'NAO' }
    ],
    criadoresProdutos: { p2: { id: 'u_bia', nome: 'Bia' } },
    hist: []
  };
  const dir = Q.CadQ_montarCorrecoes_({ podeJuntar: true, userId: 'u_dir', veProdutos: true, veCusto: true }, dados);
  const dups = dir.filter((i) => i.duplicado).map((i) => i.chave + ' ' + i.motivos.join('+'));
  assert.ok(dups.some((d) => /^CLIENTE:c1\|c2 /.test(d) && /Mesmo CNPJ/.test(d)), dups.join(' | '));
  assert.ok(dups.some((d) => /^CLIENTE:c3\|c4 Nome muito parecido/.test(d)), 'sem acento, pontuação e ME');
  assert.ok(!dups.some((d) => /c5\|c6/.test(d)), 'CNPJs válidos diferentes = filiais, não entram');
  assert.ok(!dups.some((d) => /c7/.test(d)), 'inativo não entra');
  assert.ok(dups.some((d) => /^PRODUTO:p1\|p2 Mesmo nome/.test(d)), 'produto: mesmo nome (o arquivado não entra)');
  const c4 = dir.find((i) => i.ID === 'CLIENTE:c4');
  assert.ok(c4.problemasTexto.some((t) => /CNPJ inválido/.test(t)));
  assert.ok(dir.find((i) => i.ID === 'UNIDADE:u1').problemasTexto.some((t) => /cidade e UF/.test(t)));
  const p2 = dir.find((i) => i.ID === 'PRODUTO:p2').problemasTexto;
  assert.ok(p2.includes('Preço de venda abaixo do custo cadastrado') && p2.some((t) => /Sem unidade/.test(t)));
  assert.ok(dir.find((i) => i.ID === 'PRODUTO:p1').problemasTexto.includes('Sem preço de venda'));
  // vendedor (não vê custo) e só os próprios
  const bia = Q.CadQ_montarCorrecoes_({ podeJuntar: false, userId: 'u_bia', veProdutos: true, veCusto: false }, dados);
  assert.ok(bia.every((i) => i.duplicado ? [i.a, i.b].some((r) => r.criadoPorId === 'u_bia') : i.registro.criadoPorId === 'u_bia'), 'só os cadastros dela');
  assert.ok(!bia.find((i) => i.ID === 'PRODUTO:p2').problemasTexto.includes('Preço de venda abaixo do custo cadastrado'), 'sem custo para quem não vê custo');
  assert.ok(bia.filter((i) => i.duplicado).every((i) => i.podeJuntar === false), 'só a Diretoria e o Administrador juntam');
  // "Não é duplicado": o par não volta
  dados.hist = [{ ACAO: 'NAO_DUPLICADO', REGISTRO_ID: 'CLIENTE:c3|c4' }];
  assert.ok(!Q.CadQ_montarCorrecoes_({ podeJuntar: true, veProdutos: false }, dados).some((i) => i.chave === 'CLIENTE:c3|c4'));
});

test('juntar clientes (Vínculos): oportunidades e propostas do Comercial acompanham; origem sem CNPJ só com a marca da Diretoria', () => {
  const H = { CAD_CLIENTES: ['ID', 'RAZAO_SOCIAL', 'CNPJ', 'STATUS'], CAD_UNIDADES: ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CNPJ_UNIDADE', 'STATUS'], CAD_EQUIPAMENTOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TAG', 'STATUS'],
    COM_OPORTUNIDADES: ['ID', 'CLIENTE_ID', 'UNIDADE_ID'], COM_PROPOSTAS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID'], CAD_CONTATOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'STATUS'], AUVO_SYNC: ['ID', 'ENTIDADE_TIPO', 'ENTIDADE_ID', 'AUVO_ID'] };
  const t = {
    CAD_CLIENTES: [{ ID: 'cA', RAZAO_SOCIAL: 'HOSPITAL A', CNPJ: CNPJ_A, STATUS: 'ATIVO' }, { ID: 'cB', RAZAO_SOCIAL: 'HOSPITAL A (REPETIDO)', CNPJ: CNPJ_A, STATUS: 'ATIVO' }, { ID: 'cC', RAZAO_SOCIAL: 'HOSPITAL A', CNPJ: '', STATUS: 'ATIVO' }],
    CAD_UNIDADES: [{ ID: 'uB', CLIENTE_ID: 'cB', NOME_UNIDADE: 'ANEXO', CNPJ_UNIDADE: '', STATUS: 'ATIVO' }], CAD_EQUIPAMENTOS: [],
    COM_OPORTUNIDADES: [{ ID: 'o1', CLIENTE_ID: 'cB', UNIDADE_ID: 'uB' }, { ID: 'o2', CLIENTE_ID: 'cC', UNIDADE_ID: '' }], COM_PROPOSTAS: [{ ID: 'pp1', CLIENTE_ID: 'cB', UNIDADE_ID: '' }], CAD_CONTATOS: [], AUVO_SYNC: []
  };
  const snap = () => { const tables = {}, schema = {}; Object.keys(t).forEach((n, i) => { schema[n] = { sheetId: i + 1, headers: H[n] }; tables[n] = t[n].map((r, j) => Object.assign({ _row: j + 2 }, r)); }); return { tables, schema }; };
  const { ctx } = ambiente();
  const p = JSON.parse(JSON.stringify(ctx.SGO_VINCULOS._build(snap(), { tipo: 'CLIENTE', acao: 'CONSOLIDAR', origem: 'cB', destino: 'cA', motivo: 'Cliente repetido pelo CRM' })));
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  const m = p.changes.filter((c) => /^COM_/.test(c.table)).map((c) => c.table + ':' + c.id + ':' + c.after).sort();
  assert.deepEqual(m, ['COM_OPORTUNIDADES:o1:cA', 'COM_PROPOSTAS:pp1:cA']);
  assert.ok(p.changes.some((c) => c.table === 'CAD_CLIENTES' && c.id === 'cB' && c.field === 'STATUS' && c.after === 'INATIVO'), 'o que sai fica inativo (não é apagado)');
  assert.throws(() => ctx.SGO_VINCULOS._build(snap(), { tipo: 'CLIENTE', acao: 'CONSOLIDAR', origem: 'cC', destino: 'cA', motivo: 'Cadastro antigo sem CNPJ' }), /mesmo CNPJ/);
  const p2 = JSON.parse(JSON.stringify(ctx.SGO_VINCULOS._build(snap(), { tipo: 'CLIENTE', acao: 'CONSOLIDAR', origem: 'cC', destino: 'cA', motivo: 'Cadastro antigo sem CNPJ', semCnpj: true })));
  assert.deepEqual(p2.blocks, []);
  assert.ok(p2.changes.some((c) => c.table === 'COM_OPORTUNIDADES' && c.id === 'o2' && c.after === 'cA'));
  // CNPJ diferente continua proibido mesmo com a marca
  t.CAD_CLIENTES[2].CNPJ = CNPJ_B;
  assert.throws(() => ctx.SGO_VINCULOS._build(snap(), { tipo: 'CLIENTE', acao: 'CONSOLIDAR', origem: 'cC', destino: 'cA', motivo: 'Cadastro antigo sem CNPJ', semCnpj: true }), /mesmo CNPJ/);
});

test('juntar: só Diretoria e Administrador; a prévia lado a lado barra quem fica sem CNPJ quando o outro tem', () => {
  const a = ambiente({ CAD_CLIENTES: [{ ID: 'c1', RAZAO_SOCIAL: 'A', CNPJ: CNPJ_A, STATUS: 'ATIVO' }, { ID: 'c2', RAZAO_SOCIAL: 'A', CNPJ: '', STATUS: 'ATIVO' }] });
  const g = a.ctx.cadastroJuntarPrevia('s_ana', { tipo: 'CLIENTE', ficaId: 'c1', saiId: 'c2' });
  assert.equal(g.success, false);
  assert.match(g.message, /Diretoria e do Administrador/);
  const d = a.ctx.cadastroJuntarPrevia('s_dir', { tipo: 'CLIENTE', ficaId: 'c2', saiId: 'c1' });
  assert.equal(d.success, true, d.message);
  assert.match(d.bloqueios.join(' '), /Escolha como "fica" o cadastro com o CNPJ/);
  assert.ok(d.campos.some((c) => c.campo === 'RAZAO_SOCIAL' && c.iguais));
  const n = a.ctx.cadastroNaoDuplicado('s_ana', { tipo: 'CLIENTE', chave: 'CLIENTE:c1|c2', motivo: 'Filial diferente' });
  assert.equal(n.success, false);
});

test('juntar produtos: propostas e itens de compra passam a apontar o item que fica; o que sai fica arquivado com a marca; valor escolhido campo a campo', () => {
  const a = ambiente({
    COM_PRODUTOS: [{ ID: 'p1', CODIGO: 'CRM-1', NOME: 'Fonte 9V', PRECO: 50, UNIDADE_MEDIDA: 'un.', ATIVO: 'SIM' }, { ID: 'p2', CODIGO: 'CRM-2', NOME: 'Fonte 9v', PRECO: 65, UNIDADE_MEDIDA: 'un.', DESCRICAO: 'Fonte bivolt', ATIVO: 'SIM' }],
    COM_PROPOSTAS: [{ ID: 'pr1', SITUACAO: 'RASCUNHO', ITENS_JSON: JSON.stringify([{ produtoId: 'p2', codigo: 'CRM-2', precoUnitario: 65 }, { produtoId: '', descricao: 'avulso' }]) },
      { ID: 'pr2', SITUACAO: 'ENVIADA', ITENS_JSON: JSON.stringify([{ produtoId: 'p2', codigo: 'CRM-2', precoUnitario: 60 }]) }, { ID: 'pr3', SITUACAO: 'RASCUNHO', ITENS_JSON: '[]' }],
    CMP_ITENS: [{ ID: 'i1', PRODUTO_ID: 'p2' }, { ID: 'i2', PRODUTO_ID: 'p9' }]
  });
  const r = a.ctx.cadastroJuntar('s_dir', { tipo: 'PRODUTO', ficaId: 'p1', saiId: 'p2', valores: { PRECO: 'SAI', DESCRICAO: 'SAI', NOME: 'FICA' }, motivo: 'Mesmo item vindo do CRM' });
  assert.equal(r.success, true, r.message);
  const [p1, p2] = a.tabelas.COM_PRODUTOS;
  assert.equal(p1.PRECO, 65);
  assert.equal(p1.DESCRICAO, 'Fonte bivolt');
  assert.equal(p1.NOME, 'Fonte 9V');
  assert.equal(p2.ATIVO, 'NAO');
  assert.equal(p2.JUNTADO_COM_ID, 'p1');
  assert.equal(p2.JUNTADO_POR_NOME, 'Diretor Teste');
  const it1 = JSON.parse(a.tabelas.COM_PROPOSTAS[0].ITENS_JSON), it2 = JSON.parse(a.tabelas.COM_PROPOSTAS[1].ITENS_JSON);
  assert.deepEqual([it1[0].produtoId, it1[0].codigo, it1[0].precoUnitario], ['p1', 'CRM-1', 65], 'rascunho: aponta o item que fica (preço gravado não muda)');
  assert.deepEqual([it2[0].produtoId, it2[0].codigo, it2[0].precoUnitario], ['p1', 'CRM-2', 60], 'enviada: só a referência muda');
  assert.deepEqual(a.tabelas.CMP_ITENS.map((i) => i.PRODUTO_ID), ['p1', 'p9']);
  assert.equal(r.propostas, 2);
  assert.equal(a.tabelas.HIST_CADASTROS.at(-1).ACAO, 'JUNTAR');
  const de = a.ctx.cadastroJuntar('s_ana', { tipo: 'PRODUTO', ficaId: 'p1', saiId: 'p2' });
  assert.equal(de.success, false);
});

test('relatório "Qualidade dos cadastros": erros por pessoa, Ciente e correções feitas por outros', () => {
  const { ctx } = ambiente();
  const ok = Object.assign({}, COMPLETO, { STATUS: 'ATIVO' });
  const r = ctx.CadQ_relatorioDados_({
    clientes: [
      { ID: 'c1', RAZAO_SOCIAL: 'X', STATUS: 'ATIVO', CRIADO_POR_NOME: 'Bia', CRIADO_EM: '2026-10-10T10:00:00Z' },
      Object.assign({}, ok, { ID: 'c2', CRIADO_POR_NOME: 'Bia', CRIADO_EM: '2026-10-11T10:00:00Z', CIENTE_EM: '2026-10-11T10:00:00Z' }),
      Object.assign({}, ok, { ID: 'c3', CRIADO_POR_NOME: 'Ana', CRIADO_EM: '2025-01-01T10:00:00Z' })
    ],
    unidades: [],
    hist: [{ ACAO: 'ALTERAR', ENTIDADE: 'CLIENTE', REGISTRO_ID: 'c2', REGISTRO_NOME: 'Y', USUARIO_NOME: 'Ana', DATA: '2026-10-20T10:00:00Z', PROBLEMAS_ANTES: 'EMAIL_FALTA,CEP', PROBLEMAS_DEPOIS: '' }]
  }, '2026-10-01', '2026-10-31');
  const bia = r.pessoas.find((p) => p.nome === 'Bia'), ana = r.pessoas.find((p) => p.nome === 'Ana');
  assert.deepEqual([bia.cadastrou, bia.cadastrouComProblema, bia.comCiente, bia.corrigidosPorOutros], [2, 1, 1, 1]);
  assert.deepEqual([ana.cadastrou, ana.corrigiuDeOutros], [0, 1], 'o cadastro de 2025 fica fora do período');
  assert.equal(r.correcoes[0].cadastrou, 'Bia');
  assert.equal(r.pessoas[0].nome, 'Bia', 'quem mais errou primeiro');
});

test('telas: aviso fixo e "Ciente" no computador e no celular; menu, rota, include e perfil RH; produto juntado não é reativado', () => {
  const aviso = 'Os dados devem ser pedidos ao cliente, completos e corretos. Não use informação buscada na internet. Cadastro incompleto ou errado pode causar problemas futuros (nota fiscal, certificado, cobrança e documentos com dados errados).';
  const cad = ler('JS_Cadastros.html'), core = ler('JS_Core.html'), idx = ler('Index.html'), srv = ler('SGO_CadastroQualidade.js');
  for (const s of [cad, core, srv]) assert.ok(s.includes(aviso), 'aviso fixo');
  assert.ok(cad.includes('Ciente — os dados foram informados pelo cliente') && core.includes('Ciente — os dados foram informados pelo cliente'));
  assert.match(cad, /CadQ_cienteHtml_\("cli_ciente"\)/);
  assert.match(cad, /CadQ_cienteHtml_\("uni_ciente"\)/);
  assert.match(core, /mobileCadqCienteHtml_\("mob_cli_ciente"\)/);
  assert.match(core, /mobileCadqCienteHtml_\("mob_uni_ciente"\)/);
  assert.ok(!/apiCriarClienteComUnidade', \{/.test(core), 'o novo cliente do assistente do certificado passa pela mesma regra (clientesCriar)');
  assert.match(idx, /data-mod="cadastro_correcoes"[^>]*id="menu-btn-cadastro_correcoes"/);
  assert.ok(idx.indexOf("include('JS_CadastroCorrecoes')") > idx.indexOf("include('JS_Cadastros')"));
  assert.match(core, /mod === "cadastro_correcoes" && typeof renderCadastroCorrecoesModulo_ === "function"/);
  assert.match(core, /var SGO_TELAS_RH = \[[\s\S]*?"cadastro_correcoes"\];/);
  assert.match(ler('SGO_Assistente.js'), /var SGO_ASSIST_TELAS_RH = \[[\s\S]*?'cadastro_correcoes'\];/);
  assert.match(ler('SGO_Ajuda_Cadastros.js'), /"cadastro_correcoes": \{/);
  assert.match(ler('SGO_Comercial_Propostas.js'), /if \(!ativo && Com_s_\(p\.JUNTADO_COM_ID\)\)/);
  assert.match(ler('SGO_Comercial_Config.js'), /'JUNTADO_COM_ID', 'JUNTADO_EM', 'JUNTADO_POR_NOME'\]/);
});
