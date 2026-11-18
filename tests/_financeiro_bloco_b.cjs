'use strict';
// 18/11/2026 (Financeiro, Bloco B da onda 3: E6 régua de cobrança, E7 agenda e previsão, E8/E9 relatório semanal com IA).
// Ambiente comum dos testes do bloco: o código REAL do SGO+ (tests/_financeiro_simulado.cjs) com o OMIE SIMULADO de números conhecidos
// (o mesmo de tests/financeiro-onda2-e1e5.test.cjs, mais títulos para a régua), a IA (Gemini) SIMULADA e a página completa. Nada sai para
// a rede: nenhum Omie, Caju, Gemini ou e-mail real.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('./_financeiro_simulado.cjs');
const { montar, PASTA } = S;

const NOVOS = ['SGO_Financeiro_Saude.js', 'SGO_Financeiro_Foto.js', 'SGO_Financeiro_Indicadores.js', 'SGO_Financeiro_Cobranca.js', 'SGO_Financeiro_Agenda.js', 'SGO_Financeiro_RelatorioIA.js', 'SGO_Financeiro_Relatorio.js', 'SGO_AssistenteNucleo.js'];
const em = (iso) => Date.parse(iso);
const br = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

// R = a receber, P = a pagar. ab = saldo em aberto, pg = pago (data pgEm), em = emissão. Hoje = 16/11/2026 (segunda-feira).
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
  // régua (bloco B): a vencer em 3 dias, pago com atraso na semana passada, um a vencer daqui a 40 dias com previsão
  { id: 14, n: 'R', cli: 60, venc: '2026-11-19', ab: 800 },
  { id: 15, n: 'R', cli: 70, venc: '2026-11-10', ab: 0, pg: 1200, pgEm: '2026-11-14', em: '2026-10-10' },
  { id: 21, n: 'P', cli: 90, venc: '2026-11-10', ab: 1500, cat: '2.03' },
  { id: 22, n: 'P', cli: 90, venc: '2026-11-30', ab: 6000, cat: '2.10' },
  { id: 23, n: 'P', cli: 91, venc: '2027-01-20', ab: 4000, cat: '2.10' },
  { id: 31, n: 'P', cli: 90, venc: '2026-11-03', ab: 0, pg: 5000, pgEm: '2026-11-03', em: '2026-10-04', cat: '2.03' },
  { id: 32, n: 'P', cli: 92, venc: '2026-11-04', ab: 0, pg: 2000, pgEm: '2026-11-04', em: '2026-11-04', cat: '9.01' },
  { id: 33, n: 'P', cli: 91, venc: '2026-10-10', ab: 0, pg: 7000, pgEm: '2026-10-10', em: '2026-09-10', cat: '2.10' },
  { id: 34, n: 'P', cli: 90, venc: '2026-09-20', ab: 0, pg: 9000, pgEm: '2026-09-20', em: '2026-08-21', cat: '2.03' },
  { id: 35, n: 'P', cli: 91, venc: '2026-08-10', ab: 0, pg: 3000, pgEm: '2026-08-10', em: '2026-07-11', cat: '2.10' }
];
const NOMES = { 10: 'Hospital Dez Fictício', 20: 'Clínica Vinte Fictícia', 30: 'Laboratório Trinta Fictício', 40: 'Cliente Quarenta', 60: 'Cliente Sessenta', 70: 'Cliente Setenta', 90: 'Posto Noventa Fictício', 91: 'Terceiros Noventa e Um', 92: 'Banco Interno' };
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
  const hojeIso = () => new a.ctx.Date().toISOString().slice(0, 10);
  const mov = (t) => ({ detalhes: { nCodTitulo: t.id, cNatureza: t.n, nCodCliente: t.cli, dDtVenc: brDe(t.venc), dDtPagamento: brDe(t.pgEm), dDtEmissao: brDe(t.em), dDtPrevisao: brDe(t.prev),
    cStatus: t.status || (t.ab > 0 ? (t.venc < hojeIso() ? 'ATRASADO' : 'A VENCER') : 'RECEBIDO'), cCodCateg: t.cat || (t.n === 'R' ? '1.01' : ''), cNumDocFiscal: String(1000 + t.id), cNumParcela: '001' },
    resumo: { nValAberto: t.ab, nValPago: t.pg || 0 } });
  a.ia = []; a.iaResposta = null;
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/generativelanguage/.test(url)) {
      const corpo = JSON.parse(op.payload), prompt = corpo.contents[0].parts[0].text; a.ia.push(prompt);
      const texto = a.iaResposta ? a.iaResposta(prompt) : '';
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) };
    }
    if (!/app\.omie\.com\.br/.test(url)) return anterior(url, op);
    const b = JSON.parse(op.payload), p = b.param[0];
    const f = a.falharRico[b.call];
    if (f && f.length) { a.rico.push({ call: b.call, param: p, falhou: true }); return resp(500, f.shift()); }
    if (b.call === 'ListarMovimentos' && p.nCodTitulo) return anterior(url, op);
    if (b.call === 'ListarMovimentos') {
      a.rico.push({ call: b.call, param: p });
      const tipo = p.cTpLancamento || 'CPCR';
      let l = a.titulos.filter((t) => (tipo === 'CPCR' || (tipo === 'CR' ? t.n === 'R' : t.n === 'P')));
      if (p.dDtVencDe) l = l.filter((t) => t.venc >= isoDe(p.dDtVencDe) && t.venc <= isoDe(p.dDtVencAte));
      if (p.dDtPagtoDe) l = l.filter((t) => t.pg > 0 && t.pgEm >= isoDe(p.dDtPagtoDe) && t.pgEm <= isoDe(p.dDtPagtoAte));
      if (!l.length) return vazio();
      const tot = Math.ceil(l.length / a.tamPag), pag = Number(p.nPagina) || 1;
      if (pag > tot) return vazio();
      return resp(200, { nPagina: pag, nTotPaginas: tot, nTotRegistros: l.length, movimentos: l.slice((pag - 1) * a.tamPag, pag * a.tamPag).map(mov) });
    }
    if (b.call === 'ObterResumoFinancas') { a.rico.push({ call: b.call, param: p }); return resp(200, { contaCorrente: { vTotal: a.saldoContas, vLimiteCredito: 5000 }, contaPagar: { vTotal: 11500, vAtraso: 1500, nTotal: 3 }, contaReceber: { vTotal: 21000, vAtraso: 9000, nTotal: 7 } }); }
    if (b.call === 'ListarOrcamentos') { a.rico.push({ call: b.call, param: p }); return resp(200, { ListaOrcamentos: a.orcamento }); }
    if (b.call === 'ListarClientes' && p.clientesPorCodigo) {
      a.rico.push({ call: b.call, param: p });
      return resp(200, { total_de_paginas: 1, clientes_cadastro: p.clientesPorCodigo.filter((c) => NOMES[c.codigo_cliente_omie]).map((c) => ({ codigo_cliente_omie: c.codigo_cliente_omie, razao_social: NOMES[c.codigo_cliente_omie] })) });
    }
    if (b.call === 'ListarCategorias') a.rico.push({ call: b.call, param: p });
    return anterior(url, op);
  };
}
/** Ambiente do bloco B: Financeiro + arquivos novos, relógio controlado e Omie rico. */
function montarB(o) {
  o = o || {};
  const a = montar(o);
  for (const f of NOVOS.concat(o.extras || [])) if (fs.existsSync(path.join(PASTA, f))) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  vm.runInContext('PODERES_CATALOGO_MEMO = null;', a.ctx);
  a.relogio.agora = em(o.agora || '2026-11-16T06:15:00-03:00');
  omieRico(a, o);
  a.rodada = () => JSON.parse(JSON.stringify(a.ctx.FinFoto_rodada_(new a.ctx.Date())));
  a.foto = () => { let r; for (let i = 0; i < 12; i++) { r = a.rodada(); if (r.concluida || r.fora) break; } return r; };
  a.limpar = () => Object.keys(a.cache).filter((k) => /^OMIE_RESP_/.test(k)).forEach((k) => delete a.cache[k]);
  a.em = (iso) => { a.relogio.agora = em(iso); };
  a.j = (x) => JSON.parse(JSON.stringify(x));
  return a;
}

async function abrirPagina(browser, a, largura, login) {
  login = login || 'wanessa';
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (/^(Omie|OmieOps|OmieRegras|Fin_api|FinCob_api|FinAg_api|FinRel_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

module.exports = { S, montarB, TITULOS, NOMES, em, br, abrirPagina, semRolagem, PASTA };
