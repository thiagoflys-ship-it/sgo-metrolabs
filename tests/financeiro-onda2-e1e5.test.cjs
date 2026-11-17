// Onda 2 do Financeiro, etapas E1 a E5 (16/11/2026). Especificação: output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md.
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_simulado.cjs, ampliado aqui com títulos, pagamentos, resumo e
// orçamento de números conhecidos). Nada sai para a rede. Confere:
//  E1  atividade do Financeiro invisível ao RH e à gestão fora da lista de sigilo; Conduta como antes; responsável fora da lista
//      recusado; assistente geral sem a ajuda nem os manuais do Financeiro (17/11/2026: o do Painel só na base da lista de sigilo).
//  E2  as api antigas devolvem o mesmo de antes (equivalência com a cópia anterior, cand4) e a rotina usa os mesmos miolos.
//  E3  a rotina grava a fotografia, não repete no mesmo dia, respeita o limite de páginas por rodada, não repete a mesma consulta,
//      não disputa o Omie com a tela no expediente e o pedido "Atualizar agora".
//  E4/E5 cada indicador com números conhecidos, "a definir" sem saldo mínimo, nota de saúde com os critérios e a explicação,
//      pesos configurados, sigilo, e a página completa a 1366, 390 e 320 px (capturas em capturas-onda2).
// Decisão do dono (16/11/2026): só o dono do sistema e a Diretoria aprovam operações acima da alçada; o Financeiro não.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('./_financeiro_simulado.cjs');
const { montar, PASTA } = S;
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_ONDA2 || path.join(__dirname, '../output/financeiro-20261116/capturas-onda2');
const ANTES = path.join(__dirname, '../output/financeiro-20261116/cand4/SGO_Omie_Gestao.js');
const NOVOS = ['SGO_Financeiro_Saude.js', 'SGO_Financeiro_Foto.js', 'SGO_Financeiro_Indicadores.js'];
const em = (iso) => Date.parse(iso);
const br = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

// ---------------------------------------------------------------- Omie simulado com números conhecidos
// R = a receber, P = a pagar. ab = saldo em aberto, pg = pago (data pgEm), em = emissão. Hoje = 16/11/2026.
const TITULOS = [
  { id: 1, n: 'R', cli: 10, venc: '2026-11-26', ab: 10000 },
  { id: 2, n: 'R', cli: 10, venc: '2026-11-01', ab: 4000, pg: 1000, pgEm: '2026-10-30', em: '2026-10-01' },
  { id: 3, n: 'R', cli: 20, venc: '2026-09-01', ab: 3000 },
  { id: 4, n: 'R', cli: 30, venc: '2026-06-01', ab: 2000 },
  { id: 5, n: 'R', cli: 40, venc: '2027-01-10', ab: 1000 },
  { id: 6, n: 'R', cli: 50, venc: '2026-11-20', ab: 9999, status: 'CANCELADO' },
  { id: 7, n: 'R', cli: 20, venc: '2026-10-20', ab: 0, pg: 6000, pgEm: '2026-10-25', em: '2026-09-20' },
  { id: 8, n: 'R', cli: 60, venc: '2026-12-05', ab: 500 },
  { id: 9, n: 'R', cli: 70, venc: '2026-12-06', ab: 500 },
  { id: 11, n: 'R', cli: 10, venc: '2026-11-01', ab: 0, pg: 8000, pgEm: '2026-11-05', em: '2026-10-02' },
  { id: 12, n: 'R', cli: 20, venc: '2026-09-10', ab: 0, pg: 10000, pgEm: '2026-09-15', em: '2026-08-11' },
  { id: 13, n: 'R', cli: 30, venc: '2026-08-15', ab: 0, pg: 5000, pgEm: '2026-08-20', em: '2026-07-16' },
  { id: 21, n: 'P', cli: 90, venc: '2026-11-10', ab: 1500, cat: '2.03' },
  { id: 22, n: 'P', cli: 90, venc: '2026-11-30', ab: 6000, cat: '2.10' },
  { id: 23, n: 'P', cli: 91, venc: '2027-01-20', ab: 4000, cat: '2.10' },
  { id: 31, n: 'P', cli: 90, venc: '2026-11-03', ab: 0, pg: 5000, pgEm: '2026-11-03', em: '2026-10-04', cat: '2.03' },
  { id: 32, n: 'P', cli: 92, venc: '2026-11-04', ab: 0, pg: 2000, pgEm: '2026-11-04', em: '2026-11-04', cat: '9.01' },
  { id: 33, n: 'P', cli: 91, venc: '2026-10-10', ab: 0, pg: 7000, pgEm: '2026-10-10', em: '2026-09-10', cat: '2.10' },
  { id: 34, n: 'P', cli: 90, venc: '2026-09-20', ab: 0, pg: 9000, pgEm: '2026-09-20', em: '2026-08-21', cat: '2.03' },
  { id: 35, n: 'P', cli: 91, venc: '2026-08-10', ab: 0, pg: 3000, pgEm: '2026-08-10', em: '2026-07-11', cat: '2.10' }
];
const NOMES = { 10: 'Hospital Dez Fictício', 20: 'Clínica Vinte Fictícia', 30: 'Laboratório Trinta Fictício', 40: 'Cliente Quarenta', 60: 'Cliente Sessenta', 70: 'Cliente Setenta' };
const isoDe = (t) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(t || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
const brDe = (iso) => (iso ? br(iso) : '');

function omieRico(a, o) {
  o = o || {};
  a.tamPag = o.tamPag || 50; a.titulos = (o.titulos || TITULOS).map((t) => Object.assign({}, t)); a.saldoContas = o.saldoContas === undefined ? 30000 : o.saldoContas;
  a.orcamento = o.orcamento || [{ cCodCateg: '2.03', cDesCateg: 'Combustível', nValorPrevisto: 6000, nValorRealilzado: 5000 }, { cCodCateg: '2.10', cDesCateg: 'Serviços de terceiros', nValorPrevisto: 4000, nValorRealilzado: 0 }];
  a.rico = []; a.falharRico = {};
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  const vazio = () => resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' });
  const mov = (t) => ({ detalhes: { nCodTitulo: t.id, cNatureza: t.n, nCodCliente: t.cli, dDtVenc: brDe(t.venc), dDtPagamento: brDe(t.pgEm), dDtEmissao: o.semEmissao ? undefined : brDe(t.em),
    cStatus: t.status || (t.ab > 0 ? (t.venc < '2026-11-16' ? 'ATRASADO' : 'A VENCER') : 'RECEBIDO'), cCodCateg: t.cat || (t.n === 'R' ? '1.01' : ''), cNumDocFiscal: String(1000 + t.id), cNumParcela: '001' },
    resumo: { nValAberto: t.ab, nValPago: t.pg || 0 } });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (!/app\.omie\.com\.br/.test(url)) return anterior(url, op);
    const b = JSON.parse(op.payload), p = b.param[0];
    const f = a.falharRico[b.call];
    if (f && f.length) { a.rico.push({ call: b.call, param: p, em: Date.now(), falhou: true }); const x = f.shift(); return resp(500, x); }
    if (b.call === 'ListarMovimentos' && p.nCodTitulo) return anterior(url, op); // saldo de um título (baixa): o simulador base
    if (b.call === 'ListarMovimentos') {
      a.rico.push({ call: b.call, param: p, em: Date.now() });
      const tipo = p.cTpLancamento || 'CPCR';
      let l = a.titulos.filter((t) => (tipo === 'CPCR' || (tipo === 'CR' ? t.n === 'R' : t.n === 'P')));
      if (p.dDtVencDe) l = l.filter((t) => t.venc >= isoDe(p.dDtVencDe) && t.venc <= isoDe(p.dDtVencAte));
      if (p.dDtPagtoDe) l = l.filter((t) => t.pg > 0 && t.pgEm >= isoDe(p.dDtPagtoDe) && t.pgEm <= isoDe(p.dDtPagtoAte));
      if (p.cStatus === 'ATRASADO') l = l.filter((t) => t.ab > 0 && t.venc < '2026-11-16' && t.status !== 'CANCELADO');
      if (!l.length) return vazio();
      const tot = Math.ceil(l.length / a.tamPag), pag = Number(p.nPagina) || 1;
      if (pag > tot) return vazio();
      return resp(200, { nPagina: pag, nTotPaginas: tot, nTotRegistros: l.length, movimentos: l.slice((pag - 1) * a.tamPag, pag * a.tamPag).map(mov) });
    }
    if (b.call === 'ObterResumoFinancas') {
      a.rico.push({ call: b.call, param: p, em: Date.now() });
      return resp(200, { contaCorrente: { vTotal: a.saldoContas, vLimiteCredito: 5000 }, contaPagar: { vTotal: 11500, vAtraso: 1500, nTotal: 3 }, contaReceber: { vTotal: 21000, vAtraso: 9000, nTotal: 7 }, fluxoCaixa: [{ dDia: '17/11/2026', vPagar: 0, vReceber: 0, vSaldo: a.saldoContas }] });
    }
    if (b.call === 'ListarOrcamentos') { a.rico.push({ call: b.call, param: p, em: Date.now() }); return resp(200, { ListaOrcamentos: a.orcamento }); }
    if (b.call === 'ListarClientes' && p.clientesPorCodigo) {
      a.rico.push({ call: b.call, param: p, em: Date.now() });
      return resp(200, { total_de_paginas: 1, clientes_cadastro: p.clientesPorCodigo.filter((c) => NOMES[c.codigo_cliente_omie]).map((c) => ({ codigo_cliente_omie: c.codigo_cliente_omie, razao_social: NOMES[c.codigo_cliente_omie] })) });
    }
    if (b.call === 'ListarCategorias') a.rico.push({ call: b.call, param: p, em: Date.now() });
    return anterior(url, op);
  };
}
/** Ambiente: Financeiro + arquivos novos, relógio em 16/11/2026, Omie rico. */
function montarOnda2(o) {
  o = o || {};
  const a = montar(o);
  for (const f of NOVOS.concat(o.extras || [])) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.relogio.agora = em(o.agora || '2026-11-16T06:15:00-03:00');
  omieRico(a, o);
  a.rodada = () => JSON.parse(JSON.stringify(a.ctx.FinFoto_rodada_(new a.ctx.Date())));
  a.ind = (login, dados) => a.f('Fin_apiIndicadores', login, dados || {});
  a.porCodigo = (r) => { const m = {}; (r.indicadores || []).forEach((c) => { m[c.codigo] = c; }); return m; };
  return a;
}
const limparLeituras = (a) => Object.keys(a.cache).filter((k) => /^OMIE_RESP_/.test(k)).forEach((k) => delete a.cache[k]);
const fotoCompleta = (a) => { let r; for (let i = 0; i < 10; i++) { r = a.rodada(); if (r.concluida || r.fora) break; } return r; };

// ================================================================= E1
test('E1: atividade do Financeiro só para a lista de sigilo; RH e gestão fora da lista não veem; Conduta continua como antes', () => {
  const a = montarOnda2({ agora: '2026-11-16T10:00:00-03:00', extras: ['SGO_Sedna.js'] });
  // perfil RH como em SGO_Auth.js (o ambiente de teste não carrega o login)
  if (typeof a.ctx.SGO_ehPerfilRH_ !== 'function') a.ctx.SGO_ehPerfilRH_ = (p) => String(p || '').toUpperCase() === 'RH';
  const criar = (login, d) => JSON.parse(JSON.stringify(a.ctx.Atividades_apiCriar('s_' + login, Object.assign({ prazo: '2026-11-20T18:00', titulo: 'Cobrar NF 1234 do Hospital Dez (R$ 4.000,00)' }, d))));
  const fin = criar('wanessa', { modulo: 'financeiro', moduloNome: 'Financeiro', responsavelId: 'u_fin' });
  assert.equal(fin.ok !== false, true, fin.message);
  const id = fin.item.ID;
  assert.equal(fin.item.RESTRITA, 'SIM', 'atividade do Financeiro sempre restrita');
  // responsável fora da lista de sigilo: recusado com o que fazer
  const fora = criar('wanessa', { modulo: 'financeiro', responsavelId: 'u_tec' });
  assert.equal(fora.ok, false); assert.match(fora.message, /só pode ser de alguém da lista de sigilo[\s\S]*fora do Financeiro/);
  const lista = (login) => JSON.parse(JSON.stringify(a.ctx.Atividades_apiListarModulo('s_' + login, { modulo: 'financeiro' })));
  const detalhe = (login) => JSON.parse(JSON.stringify(a.ctx.Atividades_apiDetalhe('s_' + login, { id })));
  for (const login of ['rita', 'gil', 'matheusgodoi', 'tiago']) {
    assert.equal(lista(login).itens.length, 0, login + ' (fora da lista) não vê a atividade do Financeiro');
    assert.equal(detalhe(login).ok, false, login + ' não abre o detalhe');
  }
  for (const login of ['dora', 'admin', 'wanessa', 'fabio']) assert.equal(lista(login).itens.length, 1, login + ' (na lista) vê');
  // troca de responsável para fora da lista: recusada
  const ed = JSON.parse(JSON.stringify(a.ctx.Atividades_apiEditar('s_dora', { id, responsavelId: 'u_tec' })));
  assert.equal(ed.ok, false); assert.match(ed.message, /lista de sigilo/);
  // Conduta: o RH continua vendo a restrita de outra pessoa; o técnico não
  const cnd = criar('admin', { modulo: 'conduta', moduloNome: 'Programa de conduta', responsavelId: 'u_tec2', titulo: 'Plano de ação da ocorrência' });
  const listaC = (login) => JSON.parse(JSON.stringify(a.ctx.Atividades_apiListarModulo('s_' + login, { modulo: 'conduta' }))).itens.length;
  assert.equal(listaC('rita'), 1, 'RH vê a do Conduta'); assert.equal(listaC('gil'), 1, 'gestão vê a do Conduta'); assert.equal(listaC('tiago'), 0, 'técnico não vê');
  // SEDNA: cobrança de gestor só para quem pode ver
  const us = (id2) => ({ id: id2, perfil: a.tabelas.CAD_USUARIOS.find((u) => u.ID === id2).PERFIL });
  const aFin = a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id), aCnd = a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === cnd.item.ID);
  assert.equal(a.ctx.Sedna_veEsta_(us('u_rh'), aFin), false); assert.equal(a.ctx.Sedna_veEsta_(us('u_gt'), aFin), false);
  assert.equal(a.ctx.Sedna_veEsta_(us('u_dir'), aFin), true); assert.equal(a.ctx.Sedna_veEsta_(us('u_rh'), aCnd), true);
  // central de pendências e Caixa de decisões: o item da atividade do Financeiro leva a marca e só a lista de sigilo vê
  const it = { id: 'ATV:' + id, publico: 'GESTAO', paraUsuarios: ['u_fin'], extra: { sigiloFin: true } };
  assert.equal(a.ctx.Pend_podeVer_(it, { userId: 'u_gt', perfil: 'GESTOR', gestao: true }), false, 'gestor fora da lista');
  assert.equal(a.ctx.Pend_podeVer_(it, { userId: 'u_rh', perfil: 'RH', gestao: true }), false, 'RH');
  assert.equal(a.ctx.Pend_podeVer_(it, { userId: 'u_dir', perfil: 'DIRETORIA', gestao: true, diretoria: true }), true, 'Diretoria na lista');
  const rot = a.ctx.Ges_rotear_({ modulo: 'atividades', publico: 'GESTAO', responsavelId: 'u_fin', extra: { sigiloFin: true, area: 'TECNICA' } }, { gestoresPorArea: { TECNICA: ['u_gt'] } }, a.ctx.Ges_usuarios_());
  assert.ok(!rot.ids.includes('u_gt'), 'não vai para o gestor fora da lista');
});

test('E1: o assistente geral "Tire sua dúvida" não tem a ajuda nem os manuais do Financeiro', () => {
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n');
  const ctx = vm.createContext({ console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent,
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    HtmlService: { createHtmlOutputFromFile: (n) => ({ getContent: () => ler(n + '.html') }) },
    SGO_DATA: { getAll: () => [], getById: () => null, insert: (t, d) => d, update: () => true }, SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } } });
  const arquivos = ['SGO_Utilis.js', 'SGO_Ajuda.js'].concat(fs.readdirSync(PASTA).filter((f) => /^SGO_Ajuda_.*\.js$/.test(f)).sort(), ['SGO_EnviarDoc_Ajuda.js', 'SGO_AssistenteNucleo.js', 'SGO_AssistenteManuais.js', 'SGO_Assistente.js']);
  for (const f of arquivos) if (fs.existsSync(path.join(PASTA, f))) vm.runInContext(ler(f), ctx, { filename: f });
  // 17/11/2026 (decisão do dono): o manual do Painel financeiro entra no assistente, só para a lista de sigilo (OMIE_SIGILO_CONTAS);
  // Ganhos dos vendedores e Portal do cliente entram para quem abre a tela, com as partes do Financeiro marcadas "sigilo". A base
  // GERAL (sem nível, e a da Diretoria fora da lista) continua sem nada do Financeiro; só a base da lista de sigilo ('S') tem o Painel.
  for (const nivel of ['', 'D']) {
    const base = ctx.SGO_Assist_base_(nivel);
    assert.ok(base.trechos.length > 200, 'a base continua com o resto do SGO+');
    const fin = base.trechos.filter((t) => ['omie', 'conciliacao_caju', 'compras_financeiro'].includes(String(t.modulo).split('/')[0]) || /MANUAL_(COMPRAS_FINANCEIRO|CONCILIACAO_CAJU|PAINEL_FINANCEIRO)/.test(t.id));
    assert.equal(JSON.stringify(fin.map((t) => t.id)), '[]', 'nenhum trecho do Financeiro na base geral (' + (nivel || 'geral') + ')');
    assert.ok(!base.trechos.some((t) => /Painel financeiro/.test(t.titulo + ' ' + t.texto) && /lista de sigilo/.test(t.texto)), 'nem texto da ajuda do Painel');
    assert.ok(!base.trechos.some((t) => (t.acesso || []).includes('sigilo')), 'nenhuma seção marcada para a lista de sigilo');
    assert.ok(!base.trechos.some((t) => /^man:MANUAL_(MODULO_PORTAL_CLIENTE|GANHOS_VENDEDORES)/.test(t.id) && /Painel financeiro|Recebimentos do Omie/.test(t.titulo + ' ' + t.texto)), 'nem o Painel financeiro nem os recebimentos do Omie nos manuais do Portal e dos Ganhos');
    assert.ok(base.trechos.some((t) => t.modulo === 'deposito_viagem'), 'o Depósito de viagem (do colaborador) continua');
  }
  const sig = ctx.SGO_Assist_base_('S');
  assert.ok(sig.trechos.some((t) => /^man:MANUAL_PAINEL_FINANCEIRO#/.test(t.id)), 'a lista de sigilo tem o manual do Painel financeiro');
  assert.ok(sig.trechos.filter((t) => /^man:MANUAL_PAINEL_FINANCEIRO#/.test(t.id)).every((t) => (t.acesso || []).includes('sigilo')), 'marcado como sigilo');
  // a ajuda das telas do Financeiro e os outros manuais do Financeiro continuam fora de todas as bases
  assert.ok(!sig.trechos.some((t) => t.tipo !== 'manual' && ['omie', 'conciliacao_caju', 'compras_financeiro'].includes(String(t.modulo).split('/')[0])), 'ajuda do Financeiro fora');
  assert.ok(!sig.trechos.some((t) => /MANUAL_(COMPRAS_FINANCEIRO|CONCILIACAO_CAJU)/.test(t.id)), 'outros manuais do Financeiro fora');
});

// ================================================================= E2
test('E2: as api antigas devolvem exatamente o mesmo de antes da refatoração (mesmo Omie simulado)', { skip: !fs.existsSync(ANTES) && 'cópia anterior (cand4) indisponível' }, () => {
  const chamadas = [['Omie_apiResumo', { inicio: '2026-06-01', fim: '2026-12-31' }], ['Omie_apiAgenda', { dias: 30 }], ['Omie_apiAgenda', { dias: 15, natureza: 'R' }],
    ['Omie_apiResultado', { mes: '2026-11' }], ['Omie_apiResultado', { mes: '2026-09' }], ['Omie_apiPosicao', {}], ['Omie_apiVencidosClientes', {}], ['Omie_apiOrcamento', { mes: '2026-11' }],
    ['Omie_apiResumo', { inicio: '2026-11-20', fim: '2026-11-01' }], ['Omie_apiResultado', { mes: '2027-01' }]];
  const rodar = (antes) => {
    const a = montarOnda2({ agora: '2026-11-16T10:00:00-03:00' });
    if (antes) vm.runInContext(fs.readFileSync(ANTES, 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Omie_Gestao_antes.js' });
    return { saida: chamadas.map((c) => a.f(c[0], 'wanessa', c[1])), omie: a.rico.map((x) => x.call + JSON.stringify(x.param)) };
  };
  const antes = rodar(true), depois = rodar(false);
  assert.deepEqual(depois.saida, antes.saida);
  assert.deepEqual(depois.omie, antes.omie, 'as mesmas chamadas ao Omie, na mesma ordem e com os mesmos parâmetros');
  assert.equal(antes.saida[0].ok, true); assert.equal(antes.saida[0].totais.receber, 20000);
  assert.equal(depois.saida[8].ok, false); assert.equal(depois.saida[9].ok, false);
  // sem sessão de quem está fora da lista, nada é lido (o miolo só é chamado depois da trava)
  const a = montarOnda2(); const n = a.rico.length;
  assert.equal(a.f('Omie_apiPosicao', 'rita').ok, false); assert.equal(a.rico.length, n);
});

// ================================================================= E3
test('E3: a rotina grava a fotografia (só números agregados), não repete no mesmo dia e respeita a hora de início', () => {
  const a = montarOnda2({ agora: '2026-11-16T05:30:00-03:00' });
  assert.match(a.rodada().fora, /antes do horário da fotografia \(06:00\)/);
  assert.equal(a.rico.length, 0, 'antes das 06:00 nada é lido');
  a.relogio.agora = em('2026-11-16T06:15:00-03:00');
  const r = fotoCompleta(a);
  assert.equal(r.concluida, 'COMPLETA', JSON.stringify(r));
  const fotos = a.tabelas.FIN_FOTOS; assert.equal(fotos.length, 1); assert.equal(fotos[0].DIA, '2026-11-16'); assert.equal(fotos[0].ORIGEM, 'ROTINA');
  // nada de nome de cliente, CNPJ nem documento na tabela; os maiores clientes vão por código do Omie
  const txt = JSON.stringify(fotos[0]) + JSON.stringify(a.tabelas.FIN_FOTO_MES);
  for (const nome of Object.values(NOMES)) assert.ok(!txt.includes(nome), 'sem o nome ' + nome);
  assert.ok(!/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|NF 10\d\d/.test(txt), 'sem CNPJ nem número de documento');
  assert.deepEqual(JSON.parse(fotos[0].TOP_CLIENTES_JSON).vencido.map((c) => c.codigo), [10, 20, 30]);
  // nomes só na memória do servidor
  assert.ok(a.cache['FIN_FOTO_NOMES_2026-11-16'] && a.cache['FIN_FOTO_NOMES_2026-11-16'].includes('Hospital Dez'));
  // FIN_FOTO_MES: 12 meses, com os números do mês
  const nov = a.tabelas.FIN_FOTO_MES.find((m) => m.MES === '2026-11'); assert.equal(nov.RECEBIDO, 8000); assert.equal(nov.PAGO, 5000); assert.equal(nov.TRANSFERENCIAS, 2000);
  assert.equal(a.tabelas.FIN_FOTO_MES.length, 12);
  // a mesma consulta não foi feita duas vezes
  const chaves = a.rico.filter((x) => !x.falhou).map((x) => x.call + JSON.stringify(x.param));
  assert.equal(new Set(chaves).size, chaves.length, 'nenhuma consulta repetida');
  assert.equal(a.rico.filter((x) => x.call === 'ListarCategorias').length, 1, 'plano de contas uma vez por dia');
  // não repete no mesmo dia
  const n = a.rico.length;
  a.relogio.agora = em('2026-11-16T07:00:00-03:00');
  assert.match(a.rodada().fora, /já foi feita/); assert.equal(a.rico.length, n, 'nenhuma chamada nova ao Omie');
  assert.equal(a.props.FIN_FOTO_CURSOR || '', '', 'cursor limpo');
  // log sem valores
  const logs = JSON.stringify(a.tabelas.LOGS || a.tabelas.SGO_LOG || []);
  assert.ok(!/30\.?000|21\.?000/.test(logs), 'nenhum valor no log');
  // no dia seguinte: nova fotografia, só os 4 meses recentes (os demais já estão na tabela)
  a.relogio.agora = em('2026-11-17T06:10:00-03:00');
  limparLeituras(a);
  const n2 = a.rico.length; fotoCompleta(a);
  const meses = a.rico.slice(n2).filter((x) => x.call === 'ListarMovimentos' && x.param.dDtPagtoDe).map((x) => x.param.dDtPagtoDe);
  assert.deepEqual(meses.sort(), ['01/08/2026', '01/09/2026', '01/10/2026', '01/11/2026']);
  assert.equal(a.tabelas.FIN_FOTOS.length, 2);
});

test('E3: limite de páginas por rodada, cursor entre rodadas sem contar o mesmo título duas vezes e Omie ocupado', () => {
  const um = montarOnda2(); fotoCompleta(um);
  const ref = JSON.parse(um.tabelas.FIN_FOTOS[0].INDICADORES_JSON);
  const a = montarOnda2({ tamPag: 2 });
  vm.runInContext('FIN_FOTO_PAGINAS_RODADA = 3;', a.ctx);
  a.falharRico.ObterResumoFinancas = [{ faultstring: 'ERROR: Já existe uma requisição desse método sendo executada', faultcode: 'SOAP-ENV:Client-8' }];
  const r1 = a.rodada();
  assert.match(r1.espera || '', /ocupado/); assert.equal(r1.passo, 'posicao', 'Omie ocupado: tenta de novo na próxima rodada');
  let rodadas = 1, r;
  do {
    const antes = a.rico.length; r = a.rodada(); rodadas++;
    const lidas = a.rico.slice(antes).filter((x) => x.call === 'ListarMovimentos').length;
    // o limite vale antes de cada página de títulos e antes de cada mês; um mês começado é lido inteiro (aqui, até 2 páginas)
    assert.ok(lidas <= 4, 'no máximo 3 páginas por rodada, mais o fim de um mês já começado (veio ' + lidas + ')');
  } while (!r.concluida && rodadas < 40);
  assert.equal(r.concluida, 'COMPLETA');
  assert.ok(rodadas > 4, 'a fotografia precisou de várias rodadas');
  const ind = JSON.parse(a.tabelas.FIN_FOTOS[0].INDICADORES_JSON);
  for (const k of ['I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I09', 'I10', 'I12', 'I13', 'I14']) assert.deepEqual(ind[k].valor, ref[k].valor, k + ' igual à fotografia de uma rodada só');
  // no expediente: não disputa com a tela; e o limite cai para 8 páginas
  const b = montarOnda2({ agora: '2026-11-16T10:00:00-03:00', tamPag: 1 });
  b.cache.FIN_OMIE_TELA_EM = String(Date.parse('2026-11-16T09:59:00-03:00'));
  const ad = b.rodada(); assert.match(ad.adiada || '', /tela do Financeiro/); assert.equal(b.rico.length, 0);
  delete b.cache.FIN_OMIE_TELA_EM;
  const antes = b.rico.length; b.rodada();
  assert.ok(b.rico.slice(antes).filter((x) => x.call === 'ListarMovimentos').length <= 8, 'no expediente, até 8 páginas');
  assert.ok(!b.cache.FIN_OMIE_TELA_EM, 'a própria rotina não marca a tela como em uso');
  // a tela (com sessão) marca o uso
  limparLeituras(b); b.f('Omie_apiPosicao', 'wanessa'); assert.ok(b.cache.FIN_OMIE_TELA_EM, 'chamada real da tela ao Omie marca o uso (leitura guardada não marca)');
});

test('E3: fonte que falha deixa o indicador "não calculado" com o motivo (nunca zero) e a fotografia INCOMPLETA', () => {
  const a = montarOnda2();
  a.falharRico.ListarOrcamentos = [{ faultstring: 'ERROR: Serviço indisponível', faultcode: 'SOAP-ENV:Server' }];
  a.falharRico.ObterResumoFinancas = [{ faultstring: 'ERROR: Falha interna', faultcode: 'SOAP-ENV:Server' }];
  const r = fotoCompleta(a);
  assert.equal(r.concluida, 'INCOMPLETA');
  const ind = JSON.parse(a.tabelas.FIN_FOTOS[0].INDICADORES_JSON);
  assert.equal(ind.I01.valor, null); assert.match(ind.I01.motivo, /saldos das contas/);
  assert.equal(ind.I12.valor, null); assert.equal(ind.I13.valor, null);
  assert.equal(ind.I15.valor, null); assert.match(ind.I15.motivo, /orçamento/);
  assert.equal(ind.I02.valor, 21000, 'o que não depende da fonte que falhou continua');
});

test('E3: "Atualizar agora" só registra o pedido (nunca chama o Omie), espera 15 minutos e é só da lista de sigilo', () => {
  const a = montarOnda2(); fotoCompleta(a);
  a.relogio.agora = em('2026-11-16T06:20:00-03:00');
  const n = a.rico.length;
  const cedo = a.f('Fin_apiFotoPedir', 'wanessa'); assert.equal(cedo.ok, false); assert.match(cedo.mensagem, /Nada foi pedido: A última fotografia foi às [\d:]+[\s\S]*libera 15 minutos depois, às [\d:]+/);
  const fora = a.f('Fin_apiFotoPedir', 'rita'); assert.equal(fora.ok, false); assert.match(fora.mensagem, /sigiloso/);
  a.relogio.agora = em('2026-11-16T10:00:00-03:00');
  const ok = a.f('Fin_apiFotoPedir', 'wanessa'); assert.equal(ok.ok, true, ok.mensagem); assert.match(ok.mensagem, /próxima rodada automática/);
  assert.equal(a.rico.length, n, 'o botão não chamou o Omie');
  assert.equal(a.f('Fin_apiFotoPedir', 'dora').ok, false, 'pedido já feito');
  a.titulos.find((t) => t.id === 3).ab = 0; // o cliente 20 pagou
  limparLeituras(a); // passou mais de 1 minuto: a leitura guardada de 60 s venceu
  const r = fotoCompleta(a); assert.equal(r.concluida, 'COMPLETA');
  assert.equal(a.tabelas.FIN_FOTOS.length, 1, 'a fotografia do dia é substituída');
  assert.equal(a.tabelas.FIN_FOTOS[0].ORIGEM, 'PEDIDO');
  assert.equal(JSON.parse(a.tabelas.FIN_FOTOS[0].INDICADORES_JSON).I02.valor, 18000);
  assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === 'Fin_apiFotoPedir' && x.RESULTADO === 'NEGADO'));
});

// ================================================================= E4 e E5
test('E4: cada indicador com os números conhecidos, "como é calculado", "o que é e como ler" e a comparação com 7 dias atrás', () => {
  const a = montarOnda2(); fotoCompleta(a);
  // fotografia de 7 dias atrás (inadimplência maior, saldo menor)
  const atual = a.tabelas.FIN_FOTOS[0], velho = JSON.parse(atual.INDICADORES_JSON);
  velho.I04.valor = 50; velho.I04.texto = '50,0 %'; velho.I01.valor = 20000; velho.I01.texto = 'R$ 20.000,00';
  a.tabelas.FIN_FOTOS.push(Object.assign({}, atual, { ID: 'antiga', DIA: '2026-11-09', CONCLUIDA_EM: '2026-11-09T09:20:00.000Z', INDICADORES_JSON: JSON.stringify(velho) }));
  a.relogio.agora = em('2026-11-16T10:00:00-03:00');
  const r = a.ind('wanessa'); assert.equal(r.ok, true, r.mensagem);
  const c = a.porCodigo(r);
  const esperado = { I01: 30000, I02: 21000, I03: 9000, I04: 42.9, I05: 23.8, I06: 11500, I07: 3000, I08: 37.5, I09: 34.5, I10: 4.6, I11: 30, I12: 128.6, I13: 4.05, I14: 97.6, I15: 50, I18: 0, I19: 0 };
  for (const k of Object.keys(esperado)) assert.equal(c[k].valor, esperado[k], k + ': ' + JSON.stringify(c[k]));
  assert.equal(c.I01.texto, 'R$ 30.000,00'); assert.equal(c.I04.texto, '42,9 %'); assert.equal(c.I12.texto, '129 dias'); assert.equal(c.I13.texto, '4,05 vezes');
  assert.match(c.I01.detalhe, /Limite de crédito à parte \(não somado\): R\$ 5\.000,00/);
  assert.match(c.I06.detalhe, /Vencido: R\$ 1\.500,00 \(deveria ser zero\)/);
  assert.match(c.I08.detalhe, /Três últimos meses fechados: 13,6 %/);
  assert.match(c.I13.detalhe, /Taxa de realização: 3,1 %/);
  // sem fonte: "não calculado" com o motivo, nunca zero
  assert.equal(c.I16.valor, null); assert.match(c.I16.motivo, /régua de cobrança/);
  assert.equal(c.I17.valor, null); assert.match(c.I17.motivo, /Conciliação bancária/);
  // saldo mínimo não definido: "a definir"
  assert.equal(c.I01M.texto, 'a definir'); assert.equal(c.I01M.aDefinir, true); assert.match(c.I01M.motivo, /Chaves e senhas > Regras do Financeiro/);
  assert.equal(r.config.saldoMinimo, 'a definir');
  // explicações
  for (const x of r.indicadores) { assert.ok(x.comoCalculado.length > 30, x.codigo); assert.ok(x.comoLer.length > 30, x.codigo); }
  // comparação: inadimplência caiu (melhor), saldo subiu (melhor)
  assert.equal(r.comparadoCom.diaBr, '09/11/2026');
  assert.equal(c.I04.tendencia, 'desce'); assert.equal(c.I04.leitura, 'melhor'); assert.equal(c.I04.anteriorTexto, '50,0 %');
  assert.equal(c.I01.tendencia, 'sobe'); assert.equal(c.I01.leitura, 'melhor');
  // gráficos G1 a G8, SVG com rótulos em pt-BR, nomes só da memória do servidor
  assert.deepEqual(r.graficos.map((g) => g.id), ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']);
  const g = {}; r.graficos.forEach((x) => { g[x.id] = x; assert.ok(x.frase.length > 20, x.id + ' com a frase'); });
  assert.match(g.G1.svg, /<svg[\s\S]*Recebido[\s\S]*Pago/); assert.match(g.G3.svg, /R\$ 21\.000,00/); assert.match(g.G6.svg, /Hospital Dez Fictício[\s\S]*R\$ 4\.000,00/);
  assert.match(g.G7.svg, /Combustível · previsto/); assert.match(g.G4.svg, /<svg/); assert.match(g.G2.svg, /próxima etapa/);
  assert.ok(!/data-rela4-fig/.test(JSON.stringify(r.graficos)));
  // saldo mínimo definido
  a.props.FIN_SALDO_MINIMO = '35000.00';
  const r2 = a.ind('wanessa'), c2 = a.porCodigo(r2);
  assert.equal(c2.I01M.valor, -5000); assert.equal(c2.I01M.texto, '-R$ 5.000,00'); assert.match(c2.I01M.detalhe, /ABAIXO do mínimo/);
  // sigilo: fora da lista, recusa e registro
  const fora = a.ind('rita'); assert.equal(fora.ok, false); assert.match(fora.mensagem, /sigiloso/);
  assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === 'Fin_apiIndicadores' && x.RESULTADO === 'NEGADO'));
  assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === 'Fin_apiIndicadores' && x.RESULTADO === 'PERMITIDO'));
  // sem fotografia
  const v = montarOnda2(); const sem = v.ind('wanessa'); assert.equal(sem.ok, true); assert.equal(sem.foto, null); assert.match(sem.mensagem, /a partir das 06:00/);
});

test('E4: sem data de emissão no Omie, os prazos médios dizem o motivo e o atraso médio continua', () => {
  const a = montarOnda2({ semEmissao: true }); fotoCompleta(a);
  const c = a.porCodigo(a.ind('wanessa'));
  assert.equal(c.I09.valor, null); assert.match(c.I09.motivo, /data de emissão[\s\S]*atraso médio/);
  assert.equal(c.I11.valor, null); assert.equal(c.I10.valor, 4.6);
});

test('E5: nota de saúde com os seis critérios, a explicação de cada um, reescala quando falta critério e pesos configurados', () => {
  const a = montarOnda2(); fotoCompleta(a);
  const s = a.ind('wanessa').saude;
  // C1 129 dias ≥ 60: 25; C2 4,05 ≥ 1,3: 20; C3 23,8 % ≥ 15 %: 0; C4 13,6 % → 18,1; C5 97,6 % ≥ 70 %: 0; C6 2 de 3 conferências: 6,7
  assert.deepEqual(s.criterios.map((c) => c.pontos), [25, 20, 0, 18.1, 0, 6.7]);
  assert.equal(s.nota, 70); assert.equal(s.faixa, 'Atenção');
  assert.match(s.criterios[0].explicacao, /o saldo de hoje paga 129 dias de despesas[\s\S]*Entre 10 dias \(0 ponto\) e 60 dias \(pontuação cheia\)[\s\S]*25 de 25 pontos/);
  assert.match(s.criterios[3].explicacao, /sobraram R\$ 13,60[\s\S]*18,1 de 20 pontos/);
  assert.match(s.criterios[5].explicacao, /2 de 3 conferência\(s\) em dia \(falhou: nenhum título a pagar vencido\); fora da conta: conciliação bancária/);
  assert.equal(s.calculados, 6); assert.match(s.texto, /Nota 70 de 100 \(Atenção\), calculada com 6 de 6 critérios/);
  assert.equal(s.config.pesos, 'padrão');
  // casos-limite da função pura
  const F = (ind, cfg) => JSON.parse(JSON.stringify(a.ctx.FinSaude_calcular_(ind, cfg)));
  const cfg = a.ctx.FinSaude_config_();
  const base = { I12: { valor: 10 }, I13: { valor: 1.3 }, I05: { valor: 9 }, I08: { margem3m: 15 }, I14: { valor: 35 }, disciplina: [{ nome: 'x', ok: true }] };
  assert.deepEqual(F(base, cfg).criterios.map((c) => c.pontos), [0, 20, 10, 20, 5, 10]);
  assert.equal(F(Object.assign({}, base, { I12: { valor: 200 } }), cfg).criterios[0].pontos, 25, 'acima do bom: cheio');
  assert.equal(F(Object.assign({}, base, { I13: { valor: null, infinito: true } }), cfg).criterios[1].pontos, 20, 'sem contas a pagar: cheio');
  // critério faltando: fica fora e os pesos são reescalados
  const falta = F(Object.assign({}, base, { I12: { valor: null, motivo: 'a leitura do Omie falhou' } }), cfg);
  assert.equal(falta.calculados, 5); assert.equal(falta.nota, Math.round(65 / 75 * 100)); assert.match(falta.texto, /5 de 6 critérios: C1 Fôlego do caixa: a leitura do Omie falhou/);
  assert.match(falta.criterios[0].explicacao, /não calculado[\s\S]*reescalados/);
  assert.equal(F({}, cfg).nota, null);
  // faixas
  assert.equal(a.ctx.FinSaude_faixa_(80).nome, 'Saudável'); assert.equal(a.ctx.FinSaude_faixa_(79).nome, 'Atenção'); assert.equal(a.ctx.FinSaude_faixa_(40).nome, 'Alerta'); assert.equal(a.ctx.FinSaude_faixa_(39).nome, 'Crítica');
  // configuração em Chaves e senhas: validação e efeito
  const item = (k) => a.ctx.CHV_ITENS.find((i) => i.chave === k), valida = (k, v) => a.ctx.Chaves_validarValor_(item(k), v);
  for (const k of ['FIN_SALDO_MINIMO', 'FIN_SAUDE_PESOS', 'FIN_SAUDE_LIMITES', 'FIN_FOTO_HORA', 'FIN_FOTO_ROTINA']) { assert.equal(item(k).grupo, 'Regras do Financeiro', k); assert.ok(item(k).ajuda.length > 80, k); assert.equal(a.props[k], undefined, k + ' sem valor'); }
  assert.equal(valida('FIN_SALDO_MINIMO', 'R$ 50.000,00'), '50000.00'); assert.equal(valida('FIN_SALDO_MINIMO', '0'), '0.00');
  assert.throws(() => valida('FIN_SALDO_MINIMO', '-1'), /zero ou mais/);
  assert.equal(valida('FIN_SAUDE_PESOS', '30; 20; 20; 20; 0; 10'), '30;20;20;20;0;10');
  assert.throws(() => valida('FIN_SAUDE_PESOS', '25;20;20;20;5;15'), /somar 100 \(a soma deu 105\)/);
  assert.throws(() => valida('FIN_SAUDE_PESOS', '25;20;20'), /seis números/);
  assert.equal(valida('FIN_SAUDE_LIMITES', 'c3: 20 a 5; C1: 15 a 90'), 'C1: 15 a 90; C3: 20 a 5');
  assert.throws(() => valida('FIN_SAUDE_LIMITES', 'C1: 10 a 10'), /dois números diferentes/);
  assert.throws(() => valida('FIN_SAUDE_LIMITES', 'C6: 1 a 2'), /formato/);
  assert.equal(valida('FIN_FOTO_HORA', '5:30'), '05:30'); assert.throws(() => valida('FIN_FOTO_HORA', '25:00'), /hh:mm/);
  a.props.FIN_SAUDE_PESOS = '40;20;20;10;0;10'; a.props.FIN_SAUDE_LIMITES = 'C3: 30 a 10';
  const s2 = a.ind('wanessa').saude;
  assert.equal(s2.config.pesos, 'Chaves e senhas');
  assert.deepEqual(s2.criterios.map((c) => c.peso), [40, 20, 20, 10, 0, 10]);
  assert.equal(s2.criterios[2].pontos, 6.2, 'C3 com o limite novo: (23,8 − 30) ÷ (10 − 30) × 20');
  a.props.FIN_SAUDE_PESOS = 'lixo'; assert.equal(a.ind('wanessa').saude.config.pesos, 'padrão', 'valor estranho = padrão');
  // fotografia desligada
  a.props.FIN_FOTO_ROTINA = 'DESLIGADA'; assert.match(a.rodada().fora, /desligada/);
  assert.match(a.ind('wanessa').estado.motivo, /desligada/);
});

// ================================================================= alçada: só dono e Diretoria aprovam (decisão do dono, 16/11/2026)
test('Alçada: o Financeiro não aprova; a Diretoria aprova; quem preparou não aprova; o dono aprova o que a Diretoria preparou', () => {
  const a = montarOnda2({ agora: '2026-11-16T10:00:00-03:00' }); a.saldo = 50000; a.props.OMIE_ALCADA_APROVACAO = '1000';
  const previa = (login) => { const p = a.f('OmieOps_apiPrevia', login, { acao: 'baixar', tipo: 'pagar', id: 101, dados: { contaId: 5, valor: 2000, data: '2026-11-16' } }); assert.equal(p.ok, true, p.mensagem); return p; };
  previa('wanessa');
  const it = a.f('OmieRegras_apiAprovacoes', 'fabio', {}).itens[0];
  assert.equal(it.podeDecidir, false, 'Financeiro vê, mas não decide');
  const fin = a.f('OmieRegras_apiDecidir', 'fabio', { chave: it.chave, decisao: 'aprovar' });
  assert.equal(fin.ok, false); assert.match(fin.mensagem, /Você não aprova nem recusa operações do Financeiro[\s\S]*só o dono do sistema e a Diretoria[\s\S]*Nada foi alterado[\s\S]*Peça ao dono ou à Diretoria/);
  assert.equal(a.f('OmieRegras_apiDecidir', 'fabio', { chave: it.chave, decisao: 'recusar', motivo: 'valor diferente do combinado' }).ok, false, 'nem recusa');
  assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === 'OmieRegras_apiDecidir' && x.RESULTADO === 'NEGADO'));
  assert.equal(a.f('Omie_apiIniciar', 'fabio').aprovacoesPendentes, 0, 'a faixa "aguardando a sua aprovação" não aparece para o Financeiro');
  assert.equal(a.f('Omie_apiIniciar', 'dora').aprovacoesPendentes, 1);
  assert.equal(a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens[0].podeDecidir, true);
  const ok = a.f('OmieRegras_apiDecidir', 'dora', { chave: it.chave, decisao: 'aprovar' }); assert.equal(ok.ok, true, ok.mensagem);
  // a Diretoria prepara: ela mesma não aprova; o dono aprova
  previa('dora');
  const it2 = a.f('OmieRegras_apiAprovacoes', 'admin', {}).itens.find((x) => x.preparadoPor.startsWith('DORA'));
  const auto = a.f('OmieRegras_apiDecidir', 'dora', { chave: it2.chave, decisao: 'aprovar' });
  assert.equal(auto.ok, false); assert.match(auto.mensagem, /Quem preparou a operação não aprova a própria operação/);
  assert.equal(a.f('OmieRegras_apiDecidir', 'admin', { chave: it2.chave, decisao: 'aprovar' }).ok, true, 'o dono aprova o que a Diretoria preparou');
  // e o dono prepara: a Diretoria aprova
  previa('admin');
  const it3 = a.f('OmieRegras_apiAprovacoes', 'dora', {}).itens.find((x) => x.preparadoPor.startsWith('DONO'));
  assert.equal(a.f('OmieRegras_apiDecidir', 'admin', { chave: it3.chave, decisao: 'aprovar' }).ok, false);
  assert.equal(a.f('OmieRegras_apiDecidir', 'dora', { chave: it3.chave, decisao: 'aprovar' }).ok, true);
  assert.equal(a.f('OmieRegras_apiTela', 'wanessa').podeAprovar, false); assert.equal(a.f('OmieRegras_apiTela', 'dora').podeAprovar, true);
});

// ================================================================= página completa
async function abrirPagina(browser, a, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
    if (/^(Omie|OmieOps|OmieRegras|Fin_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}

test('Página completa: aba Indicadores a 1366, 390 e 320 px, com guia, explicações, nota de saúde e gráficos, sem rolagem lateral', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montarOnda2(); fotoCompleta(a);
  const atual = a.tabelas.FIN_FOTOS[0], velho = JSON.parse(atual.INDICADORES_JSON); velho.I04.valor = 50; velho.I04.texto = '50,0 %';
  a.tabelas.FIN_FOTOS.push(Object.assign({}, atual, { ID: 'antiga', DIA: '2026-11-09', CONCLUIDA_EM: '2026-11-09T09:20:00.000Z', INDICADORES_JSON: JSON.stringify(velho) }));
  a.relogio.agora = em('2026-11-16T10:00:00-03:00');
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
      await page.evaluate(() => OmieTela_abrir_('indicadores'));
      await page.locator('.fin-ind-card').first().waitFor({ timeout: 10000 });
      await page.locator('.fin-ind-graf svg').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      const t = await page.locator('#omieCorpo').innerText();
      assert.match(t, /Como fazer nesta aba/); assert.match(t, /Saúde financeira/); assert.match(t, /70\s*de 100\s*Atenção/);
      assert.match(t, /O que é e como ler:/); assert.match(t, /Como é calculado:/); assert.match(t, /a definir/i);
      assert.match(t, /R\$ 30\.000,00/); assert.match(t, /42,9 %/); assert.match(t, /Fotografia de 09\/11\/2026: 50,0 %/);
      assert.equal(await page.locator('.fin-ind-card').count(), 20);
      assert.equal(await page.locator('.fin-ind-graf').count(), 8);
      const dica = await page.evaluate(() => { const p = document.querySelector('.omie-dica-barra'); return p ? p.textContent : ''; });
      assert.match(dica, /^Comparar com:/);
      assert.ok(await S.semRolagem(page), 'sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-indicadores.png'), fullPage: true });
      // trocar para 30 dias e pedir nova fotografia (recusada: a última foi há menos de 15 minutos? não: foi às 06:1x; o pedido passa)
      await page.selectOption('#finIndComparar', '30');
      await page.waitForFunction(() => /comparados|Indicadores de/.test((document.getElementById('finIndCorpo') || {}).textContent || ''), null, { timeout: 10000 });
      if (largura === 1366) {
        await page.click('#finIndAtualizar');
        await page.waitForFunction(() => /Pedido registrado/.test((document.getElementById('finIndAviso') || {}).textContent || ''), null, { timeout: 10000 });
        assert.equal(await page.locator('#finIndAtualizar').isDisabled(), true, 'botão parado depois do pedido');
        assert.match(await page.locator('#finIndEstadoTxt').innerText(), /já foi pedida/);
      }
      assert.ok(await S.semRolagem(page), 'sem rolagem lateral depois em ' + largura);
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});
