'use strict';
// 19/11/2026 (Financeiro v2 no celular): o SGO+ de verdade (Index.html + includes de DEST) aberto como um iPhone (390 x 844, escala 3,
// toque, Safari), no MODO CELULAR do app (a classe "modo-mobile" que o JS_Core põe em #app quando a tela tem até 900 px), com o servidor
// simulado do Financeiro (tests/_financeiro_onda_a.cjs) e valores grandes (milhões), e um detector de defeito visual que olha a página
// como o dono olha: texto empilhado letra por letra, valores sobrepostos, rolagem lateral da página e botão cortado.
// Usado por tests/financeiro-v2-celular-20261119.test.cjs e pelas capturas de output/financeiro-v2-celular-20261119.
const vm = require('node:vm');
const { montarA } = require('./_financeiro_onda_a.cjs');
const S = require('./_financeiro_simulado.cjs');

const EXTRAS = ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Espelho.js', 'SGO_Financeiro_Contas.js', 'SGO_Financeiro_V2.js'];
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

/** Omie simulado com seis contas correntes (nomes longos como os reais) e a fotografia do dia pronta. */
function ambiente() {
  const a = montarA({ foto: false, extras: EXTRAS, agora: '2026-11-16T10:00:00-03:00' });
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.contasOmie = [{ nCodCC: 5, descricao: 'Sicredi matriz', codigo_banco: '748', codigo_agencia: '0101', numero_conta_corrente: '12345-6' },
    { nCodCC: 6, descricao: 'Itaú Unibanco Prestadora', codigo_banco: '341', codigo_agencia: '0202', numero_conta_corrente: '9876-5' },
    { nCodCC: 7, descricao: 'CAIXA FILIAL', codigo_banco: '104', codigo_agencia: '0303', numero_conta_corrente: '555-1' },
    { nCodCC: 9, descricao: 'Banco do Brasil', codigo_banco: '001', codigo_agencia: '1841-4', numero_conta_corrente: '70685-2' },
    { nCodCC: 10, descricao: 'Sicredi prestadora aplicação', codigo_banco: '748', codigo_agencia: '0101', numero_conta_corrente: '98765-4' },
    { nCodCC: 8, descricao: 'Itaú LATAM', codigo_banco: '341', inativo: 'S' }];
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (b.call === 'ListarContasCorrentes') return resp(200, { pagina: 1, total_de_paginas: 1, ListarContasCorrentes: a.contasOmie });
      if (b.call === 'ListarEmpresas') return resp(200, { pagina: 1, total_de_paginas: 1, empresas_cadastro: [{ cnpj: S.EMPRESA, razao_social: 'EMPRESA FICTICIA DE TESTE LTDA', cidade: 'GOIANIA', estado: 'GO' }] });
      const r = anterior(url, op);
      if (b.call === 'ListarMovimentos' && !p.nCodTitulo) {
        const j = JSON.parse(r.getContentText());
        (j.movimentos || []).forEach((m) => { m.detalhes.nCodCC = Number(m.detalhes.nCodTitulo) % 2 === 0 ? 5 : 6; });
        return resp(r.getResponseCode(), j);
      }
      return r;
    }
    return anterior(url, op);
  };
  a.em('2026-11-16T06:15:00-03:00'); a.limpar(); const f = a.foto(); if (!f.concluida) throw new Error('fotografia: ' + JSON.stringify(f));
  a.em('2026-11-16T10:00:00-03:00');
  a.tabelas.FIN_PAG_ITENS = [{ ID: 'p1', SITUACAO: 'AGUARDANDO', VALOR: 1234.56, ENVIADO_POR_ID: 'u_fin', ENVIADO_EM: '2026-11-15T19:40:00.000Z', TITULO_OMIE: 21 }];
  a.F('Fin_apiEmpresas', 'admin', { acao: 'salvarContas', motivo: 'contas conferidas com o gerente do banco', vinculos: [{ id: '5', empresa: 'MATRIZ', apelido: 'Sicredi Matriz' }, { id: '6', empresa: 'PRESTADORA' }] });
  return a;
}

// Valores grandes (como os reais do dono: R$ 1.018.867,93): multiplica os valores em reais da resposta do Painel. Quantidades,
// percentuais, taxas, prazos e indicadores ficam como estão.
const PULA = /^(qtd|pct|pctMais30|taxa|taxas|atraso|atrasoMedio|ms|meses|variacao|prazoMedio|prazoPagamento|realizacao90|ind|papel|estadoFoto|foto|filtro|lista|empresas|riscos|contas|doCache|geradoEm|meus|parcial|dia|diaBr|hoje|hojeBr)$/;
function inflar(o, fator, chave) {
  if (Array.isArray(o)) {
    if (o.length === 2 && typeof o[0] === 'string' && Array.isArray(o[1])) return /Margem|%/.test(o[0]) ? o : [o[0], inflar(o[1], fator)]; // linha da DRE
    return o.map((x) => inflar(x, fator));
  }
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[k] = PULA.test(k) && !(chave === 'receber' || chave === 'pagar') ? o[k] : inflar(o[k], fator, k); return r; }
  return typeof o === 'number' ? Math.round(o * fator * 100) / 100 : o;
}

/** Abre o SGO+ como iPhone (largura < 500) ou computador, logado como `login`, com o servidor simulado `a`. */
async function abrirCelular(browser, a, largura, login, o) {
  o = o || {};
  const movel = largura < 500;
  const ctx = await browser.newContext(movel
    ? { viewport: { width: largura, height: 844 }, deviceScaleFactor: o.escala || 3, isMobile: true, hasTouch: true, userAgent: IPHONE_UA }
    : { viewport: { width: largura, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = S.htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (typeof a.ctx[fn] === 'function' && /^(Omie|Fin|RecargaCaju|Poderes|Ganhos|Contratos|Caju|Compras)/.test(fn)) {
      vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx);
      try {
        let v = JSON.parse(JSON.stringify(a.ctx[fn](...args) || null));
        if (fn === 'Fin_apiPainel' && v && v.ok && o.fator !== 1) v = inflar(v, o.fator || 37.33);
        return { ok: true, valor: v };
      } catch (e) { return { ok: false, erro: String(e.message) }; }
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); localStorage.clear(); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
  const modo = await page.evaluate(() => document.getElementById('app').classList.contains('modo-mobile'));
  if (movel && !modo) throw new Error('o SGO+ não entrou no modo celular (#app.modo-mobile) em ' + largura + ' px');
  return { page, ctx, erros, modoCelular: modo };
}

/** Espera a tela assentar: sem esqueleto de carregamento e sem "Carregando" por até `ms`. */
async function assentar(page, ms) {
  const fim = Date.now() + (ms || 4000);
  await page.waitForTimeout(250);
  while (Date.now() < fim) {
    const ocupado = await page.evaluate(() => { const t = document.getElementById('omieTela'); if (!t) return false; return !!t.querySelector('.fv-esqueleto, [aria-busy="true"]'); });
    if (!ocupado) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(200);
}

/**
 * Detector (roda na página). Dentro de #omieTela, com as tabelas "Ver em tabela" abertas:
 *  - estreito: elemento com texto próprio de 4+ letras, com menos de 60 px de largura e quebrado em mais de uma linha, ou texto quebrado
 *    em mais linhas do que tem palavras (palavra partida letra por letra);
 *  - sobreposto: dois textos (ou texto e controle) cujos retângulos VISÍVEIS se cruzam (mais de 3 x 3 px);
 *  - rolagemPagina: a página rola para o lado;
 *  - cortado: botão que passa da tela ou cujo texto não cabe nele.
 */
function detectar() {
  const raiz = document.getElementById('omieTela') || document.getElementById('conteudo');
  const res = { estreito: [], sobreposto: [], rolagemPagina: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth : 0, cortado: [] };
  if (!raiz) return res;
  raiz.querySelectorAll('details').forEach((d) => { d.open = true; });
  const W = window.innerWidth;
  const visivel = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false; if (cs.clip && cs.clip !== 'auto' && /rect\(0/.test(cs.clip)) return false; } return true; };
  // recorte pelos ancestrais com overflow (rolagem dentro da caixa); para texto, também pela própria caixa
  const recorte = (el, r, proprio) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let e = proprio ? el : el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const c = e.getBoundingClientRect(); x1 = Math.max(x1, c.left); y1 = Math.max(y1, c.top); x2 = Math.min(x2, c.right); y2 = Math.min(y2, c.bottom); }
    }
    return x2 - x1 > 0.5 && y2 - y1 > 0.5 ? { x1, y1, x2, y2 } : null;
  };
  const nome = (el) => { const t = (el.textContent || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + t.slice(0, 50) + '"'; };
  const itens = [];
  const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const vistos = new Set();
  for (let n = andar.nextNode(); n; n = andar.nextNode()) {
    const txt = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, .sr-only, option, select, .fv-marca, [hidden]')) continue;
    if (!visivel(el)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const rects = Array.from(rg.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    // linhas do texto: retângulos com topos diferentes
    const tops = []; rects.forEach((r) => { if (!tops.some((t) => Math.abs(t - r.top) < 3)) tops.push(r.top); });
    const letras = txt.replace(/\s/g, '').length, palavras = txt.split(' ').length;
    const caixa = el.getBoundingClientRect();
    if (!vistos.has(el) && letras > 3) {
      if ((caixa.width < 60 && tops.length > 1) || tops.length > palavras + 1) { vistos.add(el); res.estreito.push({ el: nome(el), largura: Math.round(caixa.width), linhas: tops.length, palavras }); }
    }
    rects.forEach((r) => { const v = recorte(el, r, true); if (v) itens.push({ v, el, n, txt }); }); // o texto também é cortado pela própria caixa (reticências)
  }
  raiz.querySelectorAll('input:not([type=hidden]), select, textarea, button').forEach((el) => {
    if (!visivel(el) || el.closest('.sr-only')) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const v = recorte(el, r); if (v) itens.push({ v, el, controle: true });
    if (el.tagName === 'BUTTON') {
      const dentroDeRolagem = (() => { for (let e = el.parentElement; e && e !== raiz; e = e.parentElement) { const cs = getComputedStyle(e); if (/auto|scroll/.test(cs.overflowX)) return true; } return false; })();
      if (!dentroDeRolagem && (r.right > W + 1 || r.left < -1)) res.cortado.push({ el: nome(el), motivo: 'passa da tela', direita: Math.round(r.right) });
      else if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible') res.cortado.push({ el: nome(el), motivo: 'texto não cabe' });
    }
  });
  // sobreposição: pares de itens de elementos diferentes, sem relação de ancestralidade (texto do rótulo x seu campo é permitido)
  itens.sort((p, q) => p.v.y1 - q.v.y1);
  const chave = new Set();
  for (let i = 0; i < itens.length; i++) {
    const p = itens[i];
    for (let j = i + 1; j < itens.length; j++) {
      const q = itens[j];
      if (q.v.y1 >= p.v.y2) break;
      if (p.el === q.el || p.el.contains(q.el) || q.el.contains(p.el)) continue;
      if (p.controle && q.controle) { /* controles colados (barra de botões) contam só se cruzarem de verdade */ }
      const ix = Math.min(p.v.x2, q.v.x2) - Math.max(p.v.x1, q.v.x1), iy = Math.min(p.v.y2, q.v.y2) - Math.max(p.v.y1, q.v.y1);
      if (ix > 3 && iy > 3) {
        const k = nome(p.el) + ' x ' + nome(q.el);
        if (!chave.has(k)) { chave.add(k); res.sobreposto.push({ a: nome(p.el), b: nome(q.el), area: Math.round(ix) + 'x' + Math.round(iy) }); }
      }
    }
  }
  return res;
}

const total = (r) => r.estreito.length + r.sobreposto.length + (r.rolagemPagina ? 1 : 0) + r.cortado.length;

module.exports = { ambiente, inflar, abrirCelular, assentar, detectar, total, IPHONE_UA, S };
