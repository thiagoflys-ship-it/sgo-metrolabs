const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const raiz = join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');
const fonte = readFileSync(join(raiz, 'SGO_Omie_Operacoes.js'), 'utf8');
function ambiente() {
  const valores = new Map([['OMIE_APP_KEY', 'fake-company-key']]), chamadas = [], logs = [];
  let autorizado = true, falhar = false, travado = false, uuid = 0;
  const titulo = { codigo_lancamento_omie: 101, numero_documento: 'NF-001', codigo_cliente_fornecedor: 12, codigo_categoria: '1.01', id_conta_corrente: 5, data_vencimento: '20/11/2026', data_previsao: '20/11/2026', valor_documento: 120.50, status_titulo: 'EMABERTO' };
  const ctx = vm.createContext({
    console, Date, Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, s) => Array.from(crypto.createHash('sha256').update(s).digest()), getUuid: () => '12345678-1234-1234-1234-' + String(++uuid).padStart(12, '0') },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => valores.get(k) || null, setProperty: (k, v) => valores.set(k, v), deleteProperty: k => valores.delete(k), getKeys: () => Array.from(valores.keys()) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(travado, false); travado = true; }, releaseLock: () => { assert.equal(travado, true); travado = false; } }) },
    Omie_exigirAcesso_: sessao => { if (!autorizado) throw new Error('secret server message'); return { usuario: 'vanessa', userId: sessao === 'outraPessoa' ? '2' : '1' }; },
    SGO_DATA: { log: (...a) => logs.push(a) },
    Omie_requisitar_: (caminho, call, param) => {
      chamadas.push({ caminho, call, param: JSON.parse(JSON.stringify(param)), travado });
      if (/^ConsultarConta(Pagar|Receber)$/.test(call)) return { ...titulo };
      if (call === 'ConsultarCliente') return { razao_social: 'Cliente real' };
      if (call === 'ConsultarCategoria') return { descricao: 'Categoria real' };
      if (call === 'ConsultarContaCorrente') return { descricao: 'Banco real' };
      if (/^ListarContas(Pagar|Receber)$/.test(call)) return { total_de_paginas: 3, conta_pagar_cadastro: [titulo], conta_receber_cadastro: [titulo] };
      if (call === 'ListarClientes') return { total_de_paginas: 2, clientes_cadastro: [{ codigo_cliente_omie: 12, razao_social: 'Cliente real', app_secret: 'never' }] };
      if (call === 'ListarContasCorrentes') return { total_de_paginas: 1, ListarContasCorrentes: [{ nCodCC: 5, descricao: 'Banco real', cCodCCInt: 'internal' }] };
      if (call === 'ObterBoleto') return { cLinkBoleto: 'https://boleto.omie.com.br/doc', cCodBarras: '123456', app_secret: 'never' };
      if (falhar) throw new Error('upstream app_secret=never');
      return { codigo_status: '0', codigo_lancamento_omie: 101 };
    }
  });
  vm.runInContext(fonte, ctx);
  return { ctx, valores, chamadas, logs, titulo, negar: () => autorizado = false, falhar: () => falhar = true };
}
function criar(tipo = 'receber') { return { acao: 'criar', tipo, dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'NF-001', referencia: 'SGO-TEST-001', vencimento: '2026-11-20', valor: '120.50' } }; }
function mutacoes(a) { return a.chamadas.filter(c => !/^(Consultar|Listar|Obter)/.test(c.call)); }
test('prévia não escreve e usa rótulos conferidos no servidor', () => {
  const a = ambiente(), p = criar(); p.dados.pessoaNome = 'Nome adulterado'; p.dados.app_secret = 'inventado';
  const r = a.ctx.OmieOps_apiPrevia('sessao', p);
  assert.equal(r.ok, true); assert.equal(mutacoes(a).length, 0);
  assert(r.resumo.some(l => l[1] === 'Cliente real')); assert(!JSON.stringify(r).includes('adulterado'));
  assert(!JSON.stringify(r).includes('param')); assert(!JSON.stringify(r).includes('app_secret'));
});
test('confirmação usa dados guardados, trava e idempotência do token', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar());
  const ok = a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token, dados: { valor: 999 }, call: 'ExcluirContaReceber' });
  assert.equal(ok.ok, true); assert.equal(mutacoes(a).length, 1); const c = mutacoes(a)[0];
  assert.equal(c.call, 'IncluirContaReceber'); assert.equal(c.caminho, 'financas/contareceber/'); assert.equal(c.param.valor_documento, 120.5); assert.equal(c.param.data_vencimento, '20/11/2026'); assert.equal(c.travado, true);
  assert.equal(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).jaConfirmada, true); assert.equal(mutacoes(a).length, 1);
  assert.equal(a.ctx.OmieOps_apiPrevia('sessao', criar()).ok, false);
});
test('token vinculado à sessão, ainda que o usuário seja o mesmo', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar());
  assert.equal(a.ctx.OmieOps_apiConfirmar('outraSessao', { token: r.token }).ok, false); assert.equal(mutacoes(a).length, 0);
});
test('troca de empresa Omie após a prévia bloqueia a confirmação sem envio', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar()); assert(r.ok);
  const raw = a.valores.get('OMIE_OPS_' + r.token); assert(!raw.includes('fake-company-key'));
  a.valores.set('OMIE_APP_KEY', 'different-company-key');
  const resultado = a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }); assert.equal(resultado.ok, false); assert.match(resultado.mensagem, /conexão Omie mudou/); assert.equal(mutacoes(a).length, 0);
  const nova = a.ctx.OmieOps_apiPrevia('sessao', criar()); assert(nova.ok); assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: nova.token }).ok);
});
test('permissão é conferida em leitura, prévia e confirmação', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar()); a.negar();
  for (const [f, p] of [['OmieOps_apiListar', { tipo: 'pagar' }], ['OmieOps_apiBoleto', { id: 101 }], ['OmieOps_apiApoios', { tipo: 'pessoas' }], ['OmieOps_apiPrevia', criar()], ['OmieOps_apiConfirmar', { token: r.token }]]) {
    const result = a.ctx[f]('sessao', p); assert.equal(result.ok, false); assert(!JSON.stringify(result).includes('secret server'));
  }
  assert.equal(mutacoes(a).length, 0);
});
test('dois tokens iguais abertos antes do envio não duplicam a escrita', () => {
  const a = ambiente(), r1 = a.ctx.OmieOps_apiPrevia('sessao', criar()), r2 = a.ctx.OmieOps_apiPrevia('sessao', criar());
  assert(r1.ok && r2.ok); assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: r1.token }).ok);
  assert.equal(a.ctx.OmieOps_apiConfirmar('sessao', { token: r2.token }).ok, false); assert.equal(mutacoes(a).length, 1);
});
test('outro usuário ou outra sessão não reenviam a mesma operação', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar());
  assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok);
  assert.equal(a.ctx.OmieOps_apiPrevia('outraPessoa', criar()).ok, false);
  assert.equal(mutacoes(a).length, 1);
});
test('falha de transporte fica incerta e bloqueia reenvio e nova prévia idêntica', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar()); a.falhar();
  const falha = a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }); assert.equal(falha.ok, false); assert.match(falha.mensagem, /pode ter sido processada/); assert(!falha.mensagem.includes('never'));
  assert.equal(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok, false); assert.equal(a.ctx.OmieOps_apiPrevia('sessao', criar()).ok, false); assert.equal(mutacoes(a).length, 1);
});
test('token expirado não produz escrita', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', criar()), k = 'OMIE_OPS_' + r.token, op = JSON.parse(a.valores.get(k)); op.expira = Date.now() - 1; a.valores.set(k, JSON.stringify(op));
  assert.equal(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok, false); assert.equal(mutacoes(a).length, 0);
});
test('datas inexistentes, valores inválidos e tipo/ação arbitrários são recusados', () => {
  for (const alterar of [p => p.dados.vencimento = '2026-02-30', p => p.dados.valor = -1, p => p.dados.valor = Infinity, p => p.dados.contaId = 'https://evil', p => p.tipo = '../../evil', p => p.acao = 'ExcluirContaReceber', p => p.dados.referencia = '']) {
    const a = ambiente(), p = criar(); alterar(p); assert.equal(a.ctx.OmieOps_apiPrevia('sessao', p).ok, false); assert.equal(mutacoes(a).length, 0);
  }
});
test('edição identifica título existente e não envia baixa automática', () => {
  const a = ambiente(), p = criar('pagar'); p.acao = 'editar'; p.id = 101;
  const r = a.ctx.OmieOps_apiPrevia('sessao', p); assert(r.ok); assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok);
  const c = mutacoes(a)[0]; assert.equal(c.call, 'AlterarContaPagar'); assert.equal(c.param.codigo_lancamento_omie, 101); assert.equal(c.param.baixar_documento, undefined);
});
test('edição e baixa bloqueiam se o título mudar depois da prévia', () => {
  for (const acao of ['editar', 'baixar']) {
    const a = ambiente(), p = acao === 'editar' ? { ...criar('pagar'), acao, id: 101 } : { acao, tipo: 'receber', id: 101, dados: { contaId: 5, valor: 50, data: '2026-11-06' } };
    const r = a.ctx.OmieOps_apiPrevia('sessao', p); assert(r.ok);
    // Outra baixa parcial pode manter o mesmo status; campos adicionais também contam.
    a.titulo.valor_pago = 35;
    const result = a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }); assert.equal(result.ok, false); assert.match(result.mensagem, /título mudou/); assert.equal(mutacoes(a).length, 0);
  }
});
for (const tipo of ['pagar', 'receber']) test('baixa ' + tipo + ' envia método e campos documentados', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', { acao: 'baixar', tipo, id: 101, dados: { contaId: 5, valor: 50, data: '2026-11-06', juros: 2, desconto: 1, multa: 0 } });
  assert(r.ok); assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok); const c = mutacoes(a)[0];
  assert.equal(c.call, tipo === 'pagar' ? 'LancarPagamento' : 'LancarRecebimento'); assert.equal(c.param.codigo_lancamento, 101); assert.equal(c.param.codigo_conta_corrente, 5); assert.equal(c.param.data, '06/11/2026'); assert.equal(c.param.valor, 50); assert(c.param.codigo_baixa_integracao.length <= 20);
});
test('gerar/prorrogar boleto tem prévia e payload exato', () => {
  for (const acao of ['gerarBoleto', 'prorrogarBoleto']) {
    const a = ambiente(), r = a.ctx.OmieOps_apiPrevia('sessao', { acao, tipo: 'receber', id: 101, dados: { vencimento: '2026-12-01' } }); assert(r.ok); assert(r.resumo.some(l => l[0] === 'Tarifas')); assert(a.ctx.OmieOps_apiConfirmar('sessao', { token: r.token }).ok);
    const c = mutacoes(a)[0]; assert.equal(c.caminho, 'financas/contareceberboleto/'); assert.equal(c.param.nCodTitulo, 101); assert.equal(c.call, acao === 'gerarBoleto' ? 'GerarBoleto' : 'ProrrogarBoleto'); if (acao === 'prorrogarBoleto') assert.equal(c.param.dDtVenc, '01/12/2026');
  }
});
test('boleto de contas a pagar é recusado e consulta não vaza campos extras', () => {
  const a = ambiente(); assert.equal(a.ctx.OmieOps_apiPrevia('sessao', { acao: 'gerarBoleto', tipo: 'pagar', id: 101 }).ok, false);
  const r = a.ctx.OmieOps_apiBoleto('sessao', { id: 101 }); assert(r.ok); assert.equal(r.url, 'https://boleto.omie.com.br/doc'); assert.equal(r.linhaDigitavel, '123456'); assert(!JSON.stringify(r).includes('never'));
});
test('apoios e lista paginam e projetam campos sem resposta bruta', () => {
  const a = ambiente(), r = a.ctx.OmieOps_apiApoios('sessao', { tipo: 'pessoas', pagina: 2 }); assert(r.ok); assert.equal(r.itens[0].nome, 'Cliente real'); assert.equal(r.paginas, 2); assert(!JSON.stringify(r).includes('never'));
  const lista = a.ctx.OmieOps_apiListar('sessao', { tipo: 'pagar', pagina: 3 }); assert(lista.ok); assert.equal(lista.paginas, 3); assert.equal(lista.itens[0].id, 101); assert.equal(a.chamadas.at(-1).param.pagina, 3);
  const contas = a.ctx.OmieOps_apiApoios('sessao', { tipo: 'contas' }); assert(contas.ok); assert.equal(contas.itens[0].id, '5'); assert.equal(contas.itens[0].nome, 'Banco real');
});
test('callback da aba antiga é ignorado mesmo se omieCorpo for preservado', () => {
  const s = readFileSync(join(raiz, 'JS_Omie_Operacoes.html'), 'utf8').replace(/^<script>\s*/, '').replace(/<\/script>\s*$/, ''); let sucesso, chamada = false; const corpo = {}, editorAntigo = {}; let editor = editorAntigo;
  const runner = { withSuccessHandler: f => { sucesso = f; return runner; }, withFailureHandler: () => runner, OmieOps_apiListar: () => {} };
  const ctx = vm.createContext({ google: { script: { run: runner } }, document: { getElementById: id => id === 'omieCorpo' ? corpo : editor }, SGO_getSessionId: () => 'sessao', CadUI_esc_: x => x, OMIE_TELA: { pedido: 1 } }); vm.runInContext(s, ctx);
  ctx.OmieOps_rpc_('OmieOps_apiListar', {}, () => chamada = true); ctx.OMIE_TELA.pedido++; sucesso({ ok: true }); assert.equal(chamada, false);
  ctx.OmieOps_rpc_('OmieOps_apiListar', {}, () => chamada = true); editor = {}; sucesso({ ok: true }); assert.equal(chamada, false);
});
test('frontend tem sintaxe válida e ignora callback de sessão antiga', () => {
  const s = readFileSync(join(raiz, 'JS_Omie_Operacoes.html'), 'utf8').replace(/^<script>\s*/, '').replace(/<\/script>\s*$/, ''); let sucesso, chamada = false, sessao = 's1'; const alvo = {};
  const runner = { withSuccessHandler: f => { sucesso = f; return runner; }, withFailureHandler: () => runner, OmieOps_apiListar: () => {} };
  const ctx = vm.createContext({ google: { script: { run: runner } }, document: { getElementById: () => alvo }, SGO_getSessionId: () => sessao, CadUI_esc_: x => x }); vm.runInContext(s, ctx);
  ctx.OmieOps_rpc_('OmieOps_apiListar', {}, () => chamada = true); sessao = 's2'; sucesso({ ok: true }); assert.equal(chamada, false);
});
