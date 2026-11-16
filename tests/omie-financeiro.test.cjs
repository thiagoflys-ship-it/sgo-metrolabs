const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
function ambiente(op = {}) {
  const props = { OMIE_APP_KEY: 'teste-key-1234', OMIE_APP_SECRET: 'teste-secret-5678', OMIE_SIGILO_CONTAS: '["u-fin"]' }, pedidos = [], rows = [], acessos = [];
  const ctx = vm.createContext({ console, Date, Number, isFinite,
    Utilities: { formatDate: () => '2026-11-06', DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (alg, s) => [...crypto.createHash(alg).update(String(s)).digest()] },
    validarSessao: () => ({ valid: op.valida !== false, data: { userId: op.userId || 'u-fin', usuario: 'financeiro', perfil: op.perfil || 'FINANCEIRO' } }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    UrlFetchApp: { fetch: (url, options) => {
      pedidos.push({ url, body: JSON.parse(options.payload) });
      if (op.rede) throw new Error(JSON.stringify(props));
      return { getResponseCode: () => op.http || 200, getContentText: () => op.invalido ? 'html' : JSON.stringify(typeof op.resposta === 'function' ? op.resposta(pedidos[pedidos.length - 1].body) : op.resposta || { total_de_paginas: 1, total_de_registros: 1, conta_receber_cadastro: [{ codigo_lancamento_omie: 3, valor_documento: 10, app_secret: props.OMIE_APP_SECRET }] }) };
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SGO_DATA: {
      getDB: () => ({ getSheetByName: () => ({}) }), getAll: () => rows,
      getById: (aba, id) => rows.find(r => r.ID === id), insert: (aba, r) => (aba === 'FIN_OMIE_ACESSOS' ? acessos : rows).push(r),
      update: (aba, id, r) => Object.assign(rows.find(r => r.ID === id), r), log() {}
    }
  });
  for (const f of ['SGO_Omie.js', 'SGO_Omie_Gestao.js', 'SGO_Omie_Sigilo.js']) vm.runInContext(fs.readFileSync(path.join(pasta, f), 'utf8'), ctx);
  return { ctx, props, pedidos, rows };
}
test('sessão e perfil bloqueiam dados financeiros antes de chamar Omie', () => {
  for (const op of [{ valida: false }, { perfil: 'CLIENTE' }, { perfil: 'TECNICO' }, { perfil: 'RH' }, { perfil: 'GESTOR' }]) {
    const { ctx, pedidos } = ambiente(op);
    assert.equal(ctx.Omie_apiListar('s', {}).ok, false);
    assert.equal(ctx.Omie_apiFluxo('s', {}).ok, false);
    assert.equal(pedidos.length, 0);
  }
});
test('consulta usa servidor, campos permitidos e paginação explícita', () => {
  const { ctx, pedidos } = ambiente(); const r = ctx.Omie_apiListar('s', { tipo: 'receber', pagina: 2 });
  assert.equal(r.ok, true); assert.equal(r.itens[0].id, '3');
  assert.equal(pedidos[0].url, 'https://app.omie.com.br/api/v1/financas/contareceber/');
  assert.equal(pedidos[0].body.param[0].pagina, 2);
  assert.equal(JSON.stringify(r).includes('teste-secret'), false);
});
test('erros de rede/provedor e respostas inválidas não revelam credenciais', () => {
  for (const op of [{ rede: true }, { http: 403, resposta: { faultstring: 'teste-secret-5678' } }, { invalido: true }]) {
    const { ctx } = ambiente(op); const r = ctx.Omie_apiListar('s', {});
    assert.equal(r.ok, false); assert.equal(JSON.stringify(r).includes('teste-secret'), false);
    assert.equal(JSON.stringify(r).includes('teste-key'), false);
  }
});
test('faltam chaves: nenhuma chamada de rede, sem aceitar endpoint do navegador', () => {
  const { ctx, props, pedidos } = ambiente(); delete props.OMIE_APP_SECRET;
  assert.equal(ctx.Omie_apiListar('s', {}).ok, false); assert.equal(pedidos.length, 0);
  assert.throws(() => ctx.Omie_requisitar_('https://outro/', 'Listar', {}), /inválida/);
});
test('datas e páginas inválidas são recusadas', () => {
  const { ctx, pedidos } = ambiente();
  for (const pagina of [0, -1, 1.5, 'xxx']) assert.equal(ctx.Omie_apiListar('s', { pagina }).ok, false);
  assert.throws(() => ctx.Omie_dia_('2026-02-30'), /válida/);
  assert.throws(() => ctx.Omie_periodo_({ inicio: '2026-11-10', fim: '2026-11-01' }), /anterior/);
  assert.equal(pedidos.length, 0);
});
test('provisão é idempotente, preserva histórico e não gera título no Omie', () => {
  const { ctx, pedidos, rows } = ambiente();
  const p = { id: 'af453a0f-4141-4545-8989-111111111111', tipo: 'P', valor: 10.12, vencimento: '2026-11-20', descricao: 'Despesa prevista' };
  assert.equal(ctx.Omie_apiSalvarProvisao('s', p).ok, true);
  assert.equal(ctx.Omie_apiSalvarProvisao('s', p).ok, true); assert.equal(rows.length, 1); assert.equal(pedidos.length, 0);
  assert.equal(ctx.Omie_apiCancelarProvisao('s', { id: p.id }).ok, true);
  assert.equal(rows[0].SITUACAO, 'CANCELADA'); assert.equal(rows.length, 1);
});
test('comissões apontam para Ganhos dos vendedores (regra decidida em 12/11/2026)', () => {
  const { ctx, pedidos } = ambiente(); const r = ctx.Omie_apiComissoes('s');
  assert.equal(r.configurada, true); assert.match(r.mensagem, /Ganhos dos vendedores/); assert.equal(pedidos.length, 0);
});
test('provisões isolam empresa, neutralizam fórmula e incluem último dia', () => {
  const { ctx, props, rows } = ambiente();
  const p = { id: 'af453a0f-4141-4545-8989-222222222222', tipo: 'R', valor: 9, vencimento: '2026-11-30', descricao: '=HYPERLINK("x")' };
  assert.equal(ctx.Omie_apiSalvarProvisao('s', p).ok, true);
  assert.equal(rows[0].DESCRICAO.startsWith("'="), true);
  rows[0].VENCIMENTO += 'T00:00:00';
  assert.equal(ctx.Omie_apiProvisoes('s', { origem: 'LOCAL', inicio: '2026-11-01', fim: '2026-11-30' }).itens.length, 1);
  props.OMIE_APP_KEY = 'outra-empresa';
  assert.equal(ctx.Omie_apiProvisoes('s', { origem: 'LOCAL', inicio: '2026-11-01', fim: '2026-11-30' }).itens.length, 0);
  assert.equal(ctx.Omie_apiCancelarProvisao('s', { id: p.id }).ok, false);
});
test('fontes frontend e backend novas têm sintaxe válida', () => {
  for (const f of ['JS_Omie.html','JS_Omie_Gestao.html']) {
    const s = fs.readFileSync(path.join(pasta,f),'utf8');
    for (const match of s.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new vm.Script(match[1]), f);
  }
});
test('fluxo respeita conta e período e não confunde saldo atual com saldo do período', () => {
  const { ctx, pedidos } = ambiente({ resposta: { cDescricao: 'Banco', nSaldoAnterior: 100, nSaldoAtual: 110, nSaldoAtualPrevisto: 90, nSaldoConciliado: 105, listaMovimentos: [] } });
  const r = ctx.Omie_apiFluxo('s', { contaId: '7', inicio: '2026-11-01', fim: '2026-11-06' });
  assert.equal(r.ok, true); assert.equal(r.saldoAnterior, 100); assert.equal(r.saldoAtual, 110);
  assert.equal(pedidos[0].body.param[0].dPeriodoFinal, '06/11/2026'); assert.equal(pedidos[0].body.param[0].nCodCC, 7);
});
test('14/11/2026: cartão Omie em Chaves e senhas tem a chave da gravação e o CNPJ da empresa (credenciais no cofre do servidor)', () => {
  const { ctx } = ambiente();
  vm.runInContext(fs.readFileSync(path.join(pasta, 'SGO_Chaves.js'), 'utf8'), ctx);
  assert.ok(ctx.CHV_GRUPOS.includes('Omie'));
  const itens = ctx.CHV_ITENS.filter(i => i.grupo === 'Omie');
  // 16/11/2026 (B6): CNPJ da empresa no Omie entra no cartão, aberto e sem valor (o dono preenche)
  assert.equal(JSON.stringify(itens.map(i => i.chave)), JSON.stringify(['OMIE_GRAVACAO_LIGADA', 'OMIE_EMPRESA_CNPJ']));
  assert.equal(itens[1].tipo, 'aberto'); assert.match(itens[1].ajuda, /14 números/);
  assert.equal(itens[0].tipo, 'aberto'); assert.equal(itens[0].teste, 'omie'); assert.match(itens[0].vazio, /Desligada/);
  assert.ok(!ctx.CHV_ITENS.some(i => /OMIE_APP_(KEY|SECRET)/.test(i.chave)), 'as credenciais não voltam para a planilha de chaves');
});
test('resumo soma todas as páginas em centavos, exclui cancelados e usa saldo remanescente', () => {
  const { ctx, pedidos } = ambiente({ resposta: body => ({ nTotPaginas: 2, movimentos: body.param[0].nPagina === 1 ? [
    { detalhes: { nCodTitulo: 1, cNatureza: 'P', dDtVenc: '01/11/2026' }, resumo: { nValAberto: 10.10 } },
    { detalhes: { nCodTitulo: 2, cNatureza: 'R', dDtVenc: '30/11/2026', cStatus: 'CANCELADO' }, resumo: { nValAberto: 999 } }
  ] : [{ detalhes: { nCodTitulo: 3, cNatureza: 'R', dDtVenc: '30/11/2026' }, resumo: { nValAberto: 20.20 } }] }) });
  const r = ctx.Omie_apiResumo('s', { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.equal(r.completo,true); assert.equal(pedidos.length,2);
  assert.equal(r.totais.pagar,10.10); assert.equal(r.totais.pagarVencido,10.10); assert.equal(r.totais.receber,20.20); assert.equal(r.totais.receberVencido,0);
  assert.equal(r.totais.titulos,2);
});
test('resumo não entrega totais parciais se há excesso, saldo inválido ou título repetido', () => {
  for (const resposta of [{ nTotPaginas: 51, movimentos: [] }, { nTotPaginas:1,movimentos:[{ detalhes:{nCodTitulo:1,cNatureza:'P'},resumo:{} }] },
    { nTotPaginas:1,movimentos:[1,1].map(id=>({ detalhes:{nCodTitulo:id,cNatureza:'P',dDtVenc:'01/11/2026'},resumo:{nValAberto:10} })) }]) {
    const { ctx } = ambiente({ resposta }); const r=ctx.Omie_apiResumo('s',{inicio:'2026-11-01',fim:'2026-11-30'});
    assert.equal(r.ok,false); assert.equal(r.totais,undefined);
  }
});
