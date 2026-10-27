// Integração Auvo (27/10/2026): o SGO+ reconhece cliente/unidade/equipamento que já existe no Auvo
// antes de criar (caso real IMED - URUAÇU: POST 400 "ExternalId: External id already exists."), e o
// envio do cadastro pendente pode ser filtrado por cliente/unidade, separa criar × ligar × atualizar e
// trata TAG "N/P" e afins como "sem TAG". Código real (Main, Reverso e Push) num contexto isolado;
// a API do Auvo é uma simulação em memória (nenhuma chamada real).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');

function erroAuvo(codigo, corpo) { return { codigo, corpo }; }

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const tabelas = {
    AUVO_SYNC: (opcoes.sync || []).map((r) => Object.assign({}, r)),
    CAD_CLIENTES: (opcoes.clientes || []).map((r) => Object.assign({}, r)),
    CAD_UNIDADES: (opcoes.unidades || []).map((r) => Object.assign({}, r)),
    CAD_EQUIPAMENTOS: (opcoes.equipamentos || []).map((r) => Object.assign({}, r))
  };
  const auvo = {
    customers: (opcoes.auvoCustomers || []).map((r) => Object.assign({}, r)),
    equipments: (opcoes.auvoEquipments || []).map((r) => Object.assign({}, r)),
    filtroFunciona: opcoes.filtroFunciona !== false,
    proximoId: 30000000
  };
  const chamadas = [];
  let escritasSgo = 0;
  const props = { AUVO_API_KEY: 'k', AUVO_API_TOKEN: 't' };
  const cache = {};

  function responder(codigo, corpo) {
    return { getResponseCode: () => codigo, getContentText: () => JSON.stringify(corpo) };
  }
  function listar(lista, url) {
    const q = new URL('https://x' + url.replace('https://api.auvo.com.br/v2', '')).searchParams;
    const pagina = Number(q.get('page') || 1), tam = Number(q.get('pageSize') || 100);
    let itens = lista;
    if (q.get('paramFilter')) {
      if (!auvo.filtroFunciona) itens = [];
      else {
        const f = JSON.parse(q.get('paramFilter'));
        itens = lista.filter((c) => Object.keys(f).every((k) => String(c[k] || '').indexOf(String(f[k])) !== -1));
      }
    }
    return { result: { entityList: itens.slice((pagina - 1) * tam, pagina * tam), pagedSearchReturnData: { totalItems: itens.length } } };
  }
  const UrlFetchApp = {
    fetch(url, op) {
      const metodo = String(op.method || 'get').toLowerCase();
      const caminho = url.replace('https://api.auvo.com.br/v2', '');
      const corpo = op.payload ? JSON.parse(op.payload) : null;
      if (caminho === '/login') return responder(200, { result: { accessToken: 'tok' } });
      chamadas.push({ metodo, caminho, corpo });
      const recurso = caminho.startsWith('/customers') ? 'customers' : 'equipments';
      const lista = auvo[recurso];
      if (metodo === 'get') return responder(200, listar(lista, url));
      if (metodo === 'post') {
        if (corpo.externalId && lista.some((c) => String(c.externalId || '') === String(corpo.externalId))) {
          return responder(400, [{ message: 'Validation', target: 'ExternalId', errors: ['External id already exists.'] }]);
        }
        const novo = Object.assign({ id: auvo.proximoId++ }, corpo);
        lista.push(novo);
        return responder(200, { result: novo });
      }
      if (metodo === 'patch') {
        const id = caminho.split('/')[2];
        const alvo = lista.find((c) => String(c.id) === id);
        if (!alvo) return responder(404, { message: 'not found' });
        for (const op2 of corpo) {
          const campo = op2.path.slice(1);
          if (campo === 'externalId' && op2.value && lista.some((c) => c !== alvo && String(c.externalId || '') === String(op2.value))) {
            return responder(400, [{ message: 'Validation', target: 'ExternalId', errors: ['External id already exists.'] }]);
          }
        }
        corpo.forEach((op2) => { alvo[op2.path.slice(1)] = op2.value; });
        return responder(200, { result: alvo });
      }
      return responder(400, { message: 'metodo' });
    }
  };

  const SGO_DATA = {
    getAll: (t) => tabelas[t].map((r) => Object.assign({}, r)),
    getById: (t, id) => { const r = tabelas[t].find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
    upsertByField: (t, campo, valor, dados) => {
      escritasSgo++;
      const r = tabelas[t].find((x) => String(x[campo]) === String(valor));
      if (r) Object.assign(r, dados); else tabelas[t].push(Object.assign({ [campo]: valor }, dados));
    },
    update: (t, id, dados) => { escritasSgo++; const r = tabelas[t].find((x) => String(x.ID) === String(id)); if (r) Object.assign(r, dados); return !!r; },
    insertMany: (t, linhas) => { escritasSgo++; tabelas[t].push(...linhas); }
  };

  const ctx = vm.createContext({
    UrlFetchApp,
    SGO_DATA,
    SGO_CFG: {
      SHEETS: { AUVO_SYNC: 'AUVO_SYNC', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS', CAD_USUARIOS: 'CAD_USUARIOS' },
      STATUS: { ATIVO: 'ATIVO', INATIVO: 'INATIVO' }
    },
    Utilities: { getUuid: () => 'uuid-' + Math.random().toString(16).slice(2), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, putAll: (o) => Object.assign(cache, o), remove: (k) => { delete cache[k]; } }) },
    CertCal_garantirTabela_: () => {},
    CertCal_garantirColuna_: () => {},
    isAdminSession: () => true,
    console
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Auvo_Config.js', 'SGO_Auvo_Main.js', 'SGO_Auvo_Reverso.js', 'SGO_Auvo_Push.js']) {
    vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, tabelas, auvo, chamadas, escritas: () => escritasSgo };
}

const URUACU = { ID: '4927263411', NOME_FANTASIA: 'IMED - URUAÇU', RAZAO_SOCIAL: 'IMED', CNPJ: '19.324.171/0008-70', STATUS: 'ATIVO' };
const ORIGINAL = { id: 17402556, description: 'IMED URUAÇU', cpfCnpj: '19324171000870', externalId: '4927263411', active: true };
const REPETIDO = { id: 24442090, description: 'IMED - URUAÇU', cpfCnpj: '19.324.171/0008-70', externalId: '', active: true };

test('caso real: POST 400 "External id already exists" → adota 17402556 e atualiza, sem criar', () => {
  const amb = ambiente({
    clientes: [URUACU],
    // linha de erro antiga, sem nº do Auvo (o que levava o SGO+ a tentar criar)
    sync: [{ ID: 's1', CHAVE: 'CLIENTE:4927263411', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: '4927263411', AUVO_ID: '', STATUS: 'ERRO', ULTIMO_ERRO: 'x' }],
    auvoCustomers: [ORIGINAL, REPETIDO, { id: 1, description: 'Outro', cpfCnpj: '11222333000181', externalId: 'abc' }],
    filtroFunciona: false // a busca direcionada não acha nada: o SGO+ chega ao POST, como em produção
  });
  const r = amb.ctx.Auvo_sincronizarCliente_('4927263411');
  assert.equal(r.ok, true);
  assert.equal(r.acao, 'ligado');
  assert.equal(r.auvoId, '17402556');
  assert.match(r.mensagem, /já existia no Auvo \(nº 17402556\)/);
  assert.match(r.mensagem, /24442090/, 'o repetido é citado para desativar no Auvo');
  const posts = amb.chamadas.filter((c) => c.metodo === 'post');
  assert.equal(posts.length, 1, 'só a tentativa que voltou 400; nenhum cliente novo');
  assert.equal(amb.auvo.customers.length, 3);
  const patch = amb.chamadas.find((c) => c.metodo === 'patch');
  assert.equal(patch.caminho, '/customers/17402556');
  const linha = amb.tabelas.AUVO_SYNC.find((m) => m.ENTIDADE_ID === '4927263411');
  assert.equal(String(linha.AUVO_ID), '17402556');
  assert.equal(linha.STATUS, 'OK');
  assert.equal(amb.tabelas.AUVO_SYNC.length, 1, 'atualiza a mesma linha, não cria outra');
  // segunda vez: já ligado, só PATCH
  amb.chamadas.length = 0;
  const r2 = amb.ctx.Auvo_sincronizarCliente_('4927263411');
  assert.equal(r2.acao, 'atualizado');
  assert.deepEqual(amb.chamadas.map((c) => c.metodo), ['patch']);
});

test('antes de criar procura por código e CNPJ; com repetido vale o original e o externalId do repetido não é tocado', () => {
  const amb = ambiente({
    clientes: [Object.assign({}, URUACU, { ID: 'c-uru' })],
    auvoCustomers: [
      { id: 24453873, description: 'IMED - URUAÇU', cpfCnpj: '19324171000870', externalId: 'c-uru', active: true },
      { id: 17402556, description: 'IMED URUAÇU', cpfCnpj: '19324171000870', externalId: '', active: true }
    ]
  });
  const r = amb.ctx.Auvo_sincronizarCliente_('c-uru');
  assert.equal(r.acao, 'ligado');
  assert.equal(r.auvoId, '17402556');
  assert.equal(amb.chamadas.filter((c) => c.metodo === 'post').length, 0);
  const patch = amb.chamadas.find((c) => c.metodo === 'patch');
  assert.equal(patch.caminho, '/customers/17402556');
  assert.ok(!patch.corpo.some((op) => op.path === '/externalId'), 'não tenta gravar o código que já está no repetido');
  assert.match(r.mensagem, /24453873/);
});

test('cliente do Auvo ligado a OUTRO cadastro do SGO+: não cria, não toma e diz o que fazer', () => {
  const amb = ambiente({
    clientes: [Object.assign({}, URUACU, { ID: 'c-novo' })],
    sync: [{ ID: 's9', CHAVE: 'CLIENTE:AUVOID:17402556', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'c-matriz', AUVO_ID: '17402556', STATUS: 'OK' }],
    auvoCustomers: [Object.assign({}, ORIGINAL, { externalId: '' })]
  });
  assert.throws(() => amb.ctx.Auvo_sincronizarCliente_('c-novo'), (e) => /Não enviado ao Auvo/.test(e.message) && /Por quê/.test(e.message) && /O que fazer/.test(e.message) && /Vínculos/.test(e.message));
  assert.equal(amb.chamadas.filter((c) => c.metodo !== 'get').length, 0);
});

test('mapeamento: linha de erro sem nº do Auvo não esconde a ligação que existe', () => {
  const amb = ambiente();
  const m = amb.ctx.Auvo_escolherMapeamento_([
    { CHAVE: 'CLIENTE:x', AUVO_ID: '', STATUS: 'ERRO' },
    { CHAVE: 'CLIENTE:AUVOID:15526531', AUVO_ID: '15526531' },
    { CHAVE: 'CLIENTE:AUVOID:17402556', AUVO_ID: '17402556' }
  ]);
  assert.equal(m.AUVO_ID, '15526531');
  assert.equal(amb.ctx.Auvo_escolherMapeamento_([{ CHAVE: 'CLIENTE:x', AUVO_ID: '' }, { CHAVE: 'CLIENTE:AUVOID:9', AUVO_ID: '9' }]).AUVO_ID, '9');
  assert.equal(amb.ctx.Auvo_escolherMapeamento_([]), null);
});

test('TAG N/P e afins são "sem TAG"; identificador cai para série, patrimônio ou código do SGO+', () => {
  const { ctx } = ambiente();
  for (const v of ['N/P', 'NP', 'n/p', 'N/A', 'n.a.', '-', '--', 'S/N', 'SN', '', '  ', 'SEM TAG', 'Sem identificação', 'Não possui', '0', '000', 'X', '?', null, undefined]) {
    assert.equal(ctx.Auvo_identificadorValido_(v), '', JSON.stringify(v));
  }
  assert.equal(ctx.Auvo_identificadorValido_('AUT-01'), 'AUT-01');
  assert.equal(ctx.Auvo_identificadorValido_('TH-123'), 'TH-123');
  assert.equal(ctx.Auvo_identificadorEquipamento_({ ID: 'e1', TAG: 'TH-1' }).identifier, 'TH-1');
  assert.equal(ctx.Auvo_identificadorEquipamento_({ ID: 'e1', TAG: 'N/P', SERIE: 'A123' }).identifier, 'Série A123');
  assert.equal(ctx.Auvo_identificadorEquipamento_({ ID: 'e1', TAG: 'N/P', SERIE: 'N/A', PATRIMONIO: '778' }).identifier, 'Patrimônio 778');
  assert.equal(ctx.Auvo_identificadorEquipamento_({ ID: 'ab12cd34-ef56', TAG: '-', SERIE: '' }).identifier, 'SGO-AB12CD34');
  const p = ctx.Auvo_montarPayloadEquipamentoParaAuvo_({ ID: 'e9', TIPO: 'TERMOHIGRÔMETRO', TAG: 'N/P', SERIE: 'S/N', STATUS: 'ATIVO' }, '17402556');
  assert.equal(p.identifier, 'SGO-E9');
  assert.ok(!p.equipmentSpecifications.some((s) => s.name === 'SÉRIE'), '"S/N" não vai como série');
});

test('reconhecer equipamento existente: código, TAG válida, série; nunca por "N/P"; série repetida não casa', () => {
  const { ctx } = ambiente();
  const idx = ctx.Auvo_indiceEquipamentosVazio_();
  [
    { id: 1, associatedCustomerId: 17402556, identifier: 'N/P', name: 'TERMOHIGRÔMETRO - X' },
    { id: 2, associatedCustomerId: 17402556, identifier: 'TH-07', name: 'TERMOHIGRÔMETRO - Y' },
    { id: 3, associatedCustomerId: 17402556, identifier: 'N/P', name: 'TERMÔMETRO', equipmentSpecifications: [{ name: 'SÉRIE', specification: 'S-99' }] },
    { id: 4, associatedCustomerId: 99, identifier: 'Z', externalId: 'eq-sgo-4' },
    { id: 5, associatedCustomerId: 17402556, identifier: 'A', equipmentSpecifications: [{ name: 'SERIE', specification: 'DUP' }] },
    { id: 6, associatedCustomerId: 17402556, identifier: 'B', equipmentSpecifications: [{ name: 'SERIE', specification: 'DUP' }] }
  ].forEach((e) => ctx.Auvo_indexarEquipamentoAuvo_(idx, e));
  const achar = (eq) => ctx.Auvo_acharEquipamentoNoAuvo_(idx, eq, '17402556');
  assert.equal(achar({ ID: 'a', TIPO: 'TERMOHIGRÔMETRO', TAG: 'N/P' }), null);
  assert.equal(achar({ ID: 'b', TIPO: 'TERMOHIGRÔMETRO', TAG: 'TH-07' }).id, '2');
  assert.deepEqual(Object.assign({}, achar({ ID: 'c', TIPO: 'TERMÔMETRO', TAG: 'NP', SERIE: 'S-99' })), { id: '3', por: 'serie' });
  assert.equal(achar({ ID: 'eq-sgo-4', TIPO: 'X' }).por, 'codigo');
  assert.equal(achar({ ID: 'd', TIPO: 'X', TAG: '', SERIE: 'DUP' }), null);
});

function baseEnvio() {
  return {
    clientes: [
      { ID: 'c-imed', NOME_FANTASIA: 'IMED - URUAÇU', CNPJ: '19324171000870', STATUS: 'ATIVO' },
      { ID: 'c-outro', NOME_FANTASIA: 'HOSPITAL B', CNPJ: '11222333000181', STATUS: 'ATIVO' }
    ],
    unidades: [
      { ID: 'u-imed', CLIENTE_ID: 'c-imed', NOME_UNIDADE: 'Matriz', CNPJ_UNIDADE: '19324171000870', STATUS: 'ATIVO' },
      { ID: 'u-outro', CLIENTE_ID: 'c-outro', NOME_UNIDADE: 'Central', CNPJ_UNIDADE: '11222333000181', STATUS: 'ATIVO' }
    ],
    sync: [
      // IMED: a unidade tem duas ligações; vale a original vinda do Auvo (17402556), não a repetida criada pelo SGO+
      { ID: 's1', CHAVE: 'UNIDADE:u-imed', ENTIDADE_TIPO: 'UNIDADE', ENTIDADE_ID: 'u-imed', AUVO_ID: '24442090', STATUS: 'OK' },
      { ID: 's2', CHAVE: 'UNIDADE:AUVOID:17402556', ENTIDADE_TIPO: 'UNIDADE', ENTIDADE_ID: 'u-imed', AUVO_ID: '17402556', STATUS: 'OK' },
      { ID: 's3', CHAVE: 'UNIDADE:AUVOID:500', ENTIDADE_TIPO: 'UNIDADE', ENTIDADE_ID: 'u-outro', AUVO_ID: '500', STATUS: 'OK' },
      // equipamento já ligado, mas pendurado no cliente repetido do Auvo
      { ID: 's4', CHAVE: 'EQUIPAMENTO:e-movido', ENTIDADE_TIPO: 'EQUIPAMENTO', ENTIDADE_ID: 'e-movido', AUVO_ID: '7001', STATUS: 'OK' }
    ],
    equipamentos: [
      { ID: 'e-np', CLIENTE_ID: 'c-imed', UNIDADE_ID: 'u-imed', TIPO: 'TERMOHIGRÔMETRO', TAG: 'N/P', SERIE: '123', STATUS: 'ATIVO' },
      { ID: 'e-existe', CLIENTE_ID: 'c-imed', UNIDADE_ID: 'u-imed', TIPO: 'TERMÔMETRO', TAG: 'N/P', SERIE: 'S-99', STATUS: 'ATIVO' },
      { ID: 'e-movido', CLIENTE_ID: 'c-imed', UNIDADE_ID: 'u-imed', TIPO: 'AUTOCLAVE', TAG: 'AUT-01', STATUS: 'ATIVO' },
      { ID: 'e-outro', CLIENTE_ID: 'c-outro', UNIDADE_ID: 'u-outro', TIPO: 'ESTUFA', TAG: 'EST-01', STATUS: 'ATIVO' },
      { ID: 'e-solto', CLIENTE_ID: '', UNIDADE_ID: '', TIPO: 'BALANÇA', TAG: '', STATUS: 'ATIVO' }
    ],
    auvoEquipments: [
      { id: 7000, associatedCustomerId: 17402556, identifier: 'N/P', name: 'TERMÔMETRO', equipmentSpecifications: [{ name: 'SÉRIE', specification: 'S-99' }] },
      { id: 7001, associatedCustomerId: 24442090, identifier: 'AUT-01', name: 'AUTOCLAVE', externalId: 'e-movido' },
      { id: 7002, associatedCustomerId: 17402556, identifier: 'N/P', name: 'TERMOHIGRÔMETRO' }
    ]
  };
}

test('simulação: por cliente/unidade, criar × ligar × atualizar, sem TAG, filtro por cliente; não grava nada', () => {
  const amb = ambiente(baseEnvio());
  const r = amb.ctx.Auvo_apiSimularEnvioCadastro('s', {});
  assert.equal(r.ok, true);
  assert.equal(r.equipamentos.total, 5);
  assert.equal(r.equipamentos.pendentes, 4);
  assert.equal(r.equipamentos.criar, 2, 'e-np (N/P não casa com o 7002) e e-outro');
  assert.equal(r.equipamentos.ligar, 1, 'e-existe pela série');
  assert.equal(r.equipamentos.atualizar, 1, 'e-movido está no repetido 24442090');
  assert.equal(r.equipamentos.semVinculo, 1);
  assert.equal(r.equipamentos.semTag, 3);
  const imed = r.grupos.find((g) => g.clienteId === 'c-imed');
  assert.deepEqual([imed.pendentes, imed.criar, imed.ligar, imed.atualizar, imed.semTag], [2, 1, 1, 1, 2]);
  assert.ok(r.clientes.some((c) => c.id === 'c-imed') && r.clientes.some((c) => c.id === 'c-outro'));
  const amostraNp = r.amostraEquipamentos.find((x) => x.id === 'e-np');
  assert.equal(amostraNp.semTag, true);
  assert.equal(amostraNp.identificador, 'Série 123');

  const so = amb.ctx.Auvo_apiSimularEnvioCadastro('s', { clienteId: 'c-outro' });
  assert.equal(so.filtro.rotulo, 'HOSPITAL B');
  assert.equal(so.equipamentos.total, 1);
  assert.equal(so.equipamentos.criar, 1);
  assert.equal(so.grupos.length, 1);
  assert.deepEqual(so.unidadesDoCliente.map((u) => u.id), ['u-outro']);

  assert.equal(amb.chamadas.filter((c) => c.metodo !== 'get').length, 0, 'simulação não grava no Auvo');
  assert.equal(amb.escritas(), 0, 'simulação não grava no SGO+');
  assert.throws(() => amb.ctx.Auvo_apiSimularEnvioCadastro('s', { clienteId: 'nao-existe' }), /O que fazer/);
});

test('envio só de um cliente (IMED): cria sem TAG com a série, liga o existente, move o pendurado; outro cliente intocado', () => {
  const amb = ambiente(baseEnvio());
  const r = amb.ctx.Auvo_apiIniciarEnvioEquipamentos('s', { clienteId: 'c-imed' });
  assert.equal(r.concluido, true);
  assert.equal(r.totalAtivos, 3);
  assert.deepEqual([r.criados, r.vinculados, r.atualizados, r.jaMapeados], [1, 1, 1, 0]);
  assert.deepEqual(Array.from(r.erros), []);
  const posts = amb.chamadas.filter((c) => c.metodo === 'post');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].corpo.identifier, 'Série 123');
  assert.equal(String(posts[0].corpo.associatedCustomerId), '17402556', 'vai para o cliente original do IMED');
  const patches = amb.chamadas.filter((c) => c.metodo === 'patch').map((c) => c.caminho).sort();
  assert.deepEqual(patches, ['/equipments/7000', '/equipments/7001']);
  assert.equal(String(amb.auvo.equipments.find((e) => e.id === 7001).associatedCustomerId), '17402556');
  assert.ok(!amb.chamadas.some((c) => c.corpo && JSON.stringify(c.corpo).includes('e-outro')), 'HOSPITAL B não foi tocado');
  assert.equal(String(amb.tabelas.AUVO_SYNC.find((m) => m.ENTIDADE_ID === 'e-existe').AUVO_ID), '7000');
  // rodar de novo não cria nada
  amb.chamadas.length = 0;
  const r2 = amb.ctx.Auvo_apiIniciarEnvioEquipamentos('s', { clienteId: 'c-imed' });
  assert.equal(r2.jaMapeados, 3);
  assert.equal(amb.chamadas.filter((c) => c.metodo !== 'get').length, 0);
});

test('unidade sem ligação que já existe no Auvo pelo CNPJ é ligada, não criada', () => {
  const amb = ambiente({
    clientes: [{ ID: 'c1', NOME_FANTASIA: 'X', CNPJ: '11222333000181', STATUS: 'ATIVO' }],
    unidades: [{ ID: 'u1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'Central', CNPJ_UNIDADE: '11222333000181', STATUS: 'ATIVO' }],
    auvoCustomers: [{ id: 800, description: 'X Central', cpfCnpj: '11.222.333/0001-81', externalId: '', active: true }]
  });
  const r = amb.ctx.Auvo_apiEnviarUnidadesPendentes('s', { clienteId: 'c1' });
  assert.deepEqual([r.total, r.sincronizadas, r.ligadas, r.criadas], [1, 1, 1, 0]);
  assert.equal(amb.chamadas.filter((c) => c.metodo === 'post').length, 0);
});

test('a tela mantém data-rot nas tabelas novas, tem o filtro por cliente e o manual explica sem TAG e o original', () => {
  const c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Auvo_ConteudoModulo.js'), 'utf8'), c);
  const html = c.AUVO_CONTEUDO_MODULO;
  for (const rot of ['data-rot="Ligar a existente"', 'data-rot="Sem TAG"', 'data-rot="Vai ao Auvo como"', 'data-rot="O que acontece"']) assert.ok(html.includes(rot), rot);
  assert.ok(html.includes('tplAuvo_envioCliente') && html.includes("tplAuvo_chamarApi('apiIniciarEnvioEquipamentos', filtro)"));
  assert.match(html, /Equipamento sem TAG:<\/strong> "N\/P"/);
  assert.match(html, /External id already exists/);
  const ajuda = fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8');
  assert.match(ajuda, /Só este cliente/);
  assert.match(ajuda, /já existia no Auvo/i);
});
