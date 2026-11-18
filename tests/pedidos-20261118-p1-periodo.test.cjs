// Pacote 1 de 18/11/2026 — item 1 da fila (output/pedidos-20261118/FILA.md), pedido da Wanessa: em Painel financeiro > Lançamentos e
// baixas e em Aprovação de pagamentos, escolher o PERÍODO de vencimento (de/até, dd/mm/aaaa, com atalhos), combinável com a situação,
// lendo do Omie todas as páginas da situação (não só as primeiras). Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs),
// aqui com paginação de verdade (vários títulos por página); nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { montarB1C3, brDe } = require('./_financeiro_b1c3.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

/** 230 contas a pagar em aberto (hoje = 16/11/2026), espalhadas de 01/10/2026 a 31/01/2027, com paginação real no Omie simulado. */
function montar() {
  const a = montarB1C3();
  const base = Date.UTC(2026, 9, 1), lista = [];
  for (let i = 0; i < 230; i++) {
    const venc = new Date(base + (i % 123) * 864e5).toISOString().slice(0, 10);
    lista.push({ codigo_lancamento_omie: 5000 + i, numero_documento: 'DOC-' + (5000 + i), codigo_cliente_fornecedor: 90, codigo_categoria: '2.10', id_conta_corrente: 5, venc, valor_documento: 100 + i, status_titulo: 'EMABERTO' });
  }
  a.grande = lista; a.chamadas = [];
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (b.call === 'ListarContasPagar' || b.call === 'ListarContasReceber') {
        a.chamadas.push({ call: b.call, pagina: p.pagina, tam: p.registros_por_pagina, status: p.filtrar_por_status || '' });
        const hoje = '2026-11-16';
        const l = a.grande.filter((t) => !p.filtrar_por_status || (p.filtrar_por_status === 'ATRASADO' ? t.venc < hoje : p.filtrar_por_status === 'VENCEHOJE' ? t.venc === hoje : t.venc > hoje));
        const tam = Number(p.registros_por_pagina) || 50, pags = Math.max(1, Math.ceil(l.length / tam)), pg = Number(p.pagina) || 1;
        const fatia = l.slice((pg - 1) * tam, pg * tam).map((t) => Object.assign({}, t, { data_vencimento: brDe(t.venc), data_previsao: brDe(t.venc) }));
        if (!fatia.length) return resp(500, { faultstring: 'ERROR: Não existem registros para a página [' + pg + ']!', faultcode: 'SOAP-ENV:Client-5113' });
        const chave = b.call === 'ListarContasPagar' ? 'conta_pagar_cadastro' : 'conta_receber_cadastro';
        return resp(200, { pagina: pg, total_de_paginas: pags, total_de_registros: l.length, [chave]: fatia });
      }
    }
    return anterior(url, op);
  };
  return a;
}
const noPeriodo = (a, de, ate, status) => a.grande.filter((t) => t.venc >= de && t.venc <= ate && (!status || (status === 'AVENCER' ? t.venc > '2026-11-16' : status === 'ATRASADO' ? t.venc < '2026-11-16' : true)));

test('P1-1a: Lançamentos e baixas: período de vencimento combinado com a situação, lendo TODAS as páginas do Omie, em ordem de vencimento, com total', () => {
  const a = montar();
  // sem período: continua como antes (uma página de 50, a pedida)
  const s = a.F('OmieOps_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'AVENCER', pagina: 1 });
  assert.equal(s.ok, true, s.mensagem); assert.equal(s.periodo, undefined); assert.equal(a.chamadas.length, 1);
  a.chamadas = []; a.limparCache();
  const r = a.F('OmieOps_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'AVENCER', pagina: 1, vencDe: '01/12/2026', vencAte: '31/12/2026' });
  assert.equal(r.ok, true, r.mensagem);
  const esperados = noPeriodo(a, '2026-12-01', '2026-12-31', 'AVENCER');
  assert.ok(a.chamadas.length >= 2 && a.chamadas.every((c) => c.status === 'AVENCER' && c.tam === 100), 'leu as páginas todas da situação: ' + JSON.stringify(a.chamadas));
  assert.equal(r.total, esperados.length);
  assert.ok(r.itens.every((i) => /\/12\/2026$/.test(i.vencimento)), 'só dezembro');
  const vencs = r.itens.map((i) => i.vencimento.split('/').reverse().join('-'));
  assert.deepEqual(vencs, vencs.slice().sort(), 'em ordem de vencimento');
  assert.equal(r.periodo.texto, 'vencimento de 01/12/2026 a 31/12/2026');
  assert.equal(Math.round(r.valorTotal * 100), Math.round(esperados.reduce((s2, t) => s2 + t.valor_documento, 0) * 100));
  assert.equal(r.incompleto, false);
  // ponta aberta: "a partir de" e "até"
  a.limparCache();
  const r2 = a.F('OmieOps_apiListar', 'wanessa', { tipo: 'pagar', situacao: '', vencDe: '', vencAte: '05/10/2026' });
  assert.equal(r2.ok, true, r2.mensagem); assert.equal(r2.periodo.texto, 'vencimento até 05/10/2026');
  assert.equal(r2.total, a.grande.filter((t) => t.venc <= '2026-10-05').length);
  // paginação local de 50 em 50 quando o período tem mais
  a.limparCache();
  const r3 = a.F('OmieOps_apiListar', 'wanessa', { tipo: 'pagar', situacao: '', vencDe: '01/10/2026', vencAte: '31/01/2027', pagina: 2 });
  assert.equal(r3.total, 230); assert.equal(r3.paginas, 5); assert.equal(r3.pagina, 2); assert.equal(r3.itens.length, 50);
});

test('P1-1b: datas inválidas, invertidas ou intervalo longo demais: mensagem que diz o quê e o que fazer, sem ler o Omie', () => {
  const a = montar();
  const casos = [[{ vencDe: '31/02/2026' }, /a data "de" \(31\/02\/2026\) não é válida\. Digite no formato dd\/mm\/aaaa/],
    [{ vencAte: '2026/12/01' }, /a data "até" .* não é válida/],
    [{ vencDe: '10/12/2026', vencAte: '01/12/2026' }, /a data "de" \(10\/12\/2026\) é depois da data "até" \(01\/12\/2026\)\. Troque as datas/],
    [{ vencDe: '01/01/2026', vencAte: '31/12/2027' }, /o intervalo tem 729 dias e o máximo é 400[\s\S]*Divida em períodos menores/]];
  for (const [p, re] of casos) {
    a.chamadas = [];
    const r = a.F('OmieOps_apiListar', 'wanessa', Object.assign({ tipo: 'pagar', situacao: 'AVENCER' }, p));
    assert.equal(r.ok, false); assert.match(r.mensagem, re); assert.equal(a.chamadas.length, 0);
  }
});

test('P1-1c: Aprovação de pagamentos: com o período, aparecem as contas em aberto que vencem nele (sem o limite dos 30 dias), e o envio aceita as do período', () => {
  const a = montar();
  const r = a.F('OmiePag_apiTela', 'wanessa', { vencDe: '01/01/2027', vencAte: '15/01/2027' });
  assert.equal(r.ok, true, r.mensagem);
  const esperados = noPeriodo(a, '2027-01-01', '2027-01-15');
  assert.equal(r.candidatos.length, esperados.length);
  assert.ok(r.candidatos.every((c) => /\/01\/2027$/.test(c.vencimento) && c.marcado === false && c.podeEnviar), 'a vencer: escolha da Wanessa');
  assert.equal(r.periodo.texto, 'vencimento de 01/01/2027 a 15/01/2027');
  assert.ok(!a.chamadas.some((c) => c.status === 'ATRASADO' || c.status === 'VENCEHOJE'), 'período só no futuro: não lê vencidos nem os de hoje');
  // o envio confere de novo no Omie com o mesmo período: aceita conta de janeiro (fora dos 30 dias)
  const e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [r.candidatos[0].id], vencDe: '01/01/2027', vencAte: '15/01/2027' });
  assert.equal(e.ok, true, e.mensagem);
  // a lista de decisões também respeita o período
  const r2 = a.F('OmiePag_apiTela', 'dora', { vencDe: '01/10/2026', vencAte: '31/10/2026' });
  assert.equal(r2.aguardando.length, 0, 'o enviado é de janeiro: fora do período de outubro');
  const r3 = a.F('OmiePag_apiTela', 'dora', { vencDe: '01/01/2027', vencAte: '31/01/2027' });
  assert.equal(r3.aguardando.length, 1);
  // sem período: tudo como antes (vencidas e de hoje)
  const r4 = a.F('OmiePag_apiTela', 'wanessa', {});
  assert.equal(r4.periodo, null);
  assert.ok(r4.candidatos.every((c) => c.origem === 'VENCIMENTO'));
});

test('P1-1d: as telas têm o período com atalhos (esta semana, este mês, próximo mês), a explicação embaixo e a ajuda atualizada', () => {
  const omie = fs.readFileSync(path.join(PASTA, 'JS_Omie.html'), 'utf8');
  assert.match(omie, /function OmieTela_periodoHtml_\(pref, de, ate, aplicar\)/);
  assert.match(omie, /'Esta semana'\) \+ at\('mes', 'Este mês'\) \+ at\('proximo', 'Próximo mês'\)/);
  assert.match(omie, /Período de vencimento: mostra só os títulos que vencem entre as duas datas \(dd\/mm\/aaaa\), junto com a situação escolhida/);
  const ops = fs.readFileSync(path.join(PASTA, 'JS_Omie_Operacoes.html'), 'utf8');
  assert.match(ops, /OmieTela_periodoHtml_\('omieOpsVenc'/);
  const pag = fs.readFileSync(path.join(PASTA, 'JS_Financeiro_Pagamentos.html'), 'utf8');
  assert.match(pag, /OmieTela_periodoHtml_\('finPagVenc'/);
  assert.match(pag, /vencDe: FIN_PAG_TELA\.vencDe, vencAte: FIN_PAG_TELA\.vencAte/);
  const aj = fs.readFileSync(path.join(PASTA, 'JS_Omie_Ajuda.html'), 'utf8');
  for (const k of ['omieOpsVencDe', 'omieOpsVencAte', 'finPagVencDe', 'finPagVencAte']) assert.match(aj, new RegExp(k + ': \''));
  assert.match(aj, /Para ver o que vence num período/);
  assert.match(aj, /Para montar a lista de um período/);
});
