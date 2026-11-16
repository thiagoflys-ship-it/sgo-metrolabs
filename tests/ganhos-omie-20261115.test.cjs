// Ganhos dos vendedores + Omie (15/11/2026): recebimentos do Omie como SUGESTÕES. Código real (Comercial, caixas, Ganhos,
// SGO_Omie.js, SGO_Omie_Ganhos.js) com um OMIE SIMULADO; nada sai para a rede. Confere: só quem lança recebimentos consulta;
// mês pelo dia do pagamento; cancelados e de outro mês fora; ligação CNPJ -> cliente do SGO+ -> propostas aprovadas com saldo;
// nada é lançado sozinho; lançar pelo formulário com a referência do Omie marca a origem e impede o mesmo título duas vezes;
// e a PÁGINA COMPLETA: Ver recebimentos do Omie -> Usar esta proposta -> formulário preenchido -> Lançar (1366 e 390 px).
// Uso: DEST=<legado> node --require <fontes.cjs> tests/ganhos-omie-20261115.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente, PASTA } = require('./_ganhos_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/financeiro-20261115/capturas');

const MOV = [
  { detalhes: { nCodTitulo: 1, cNatureza: 'R', cStatus: 'RECEBIDO', dDtPagamento: '10/11/2026', nCodCliente: 501, cCPFCNPJCliente: '11.222.333/0001-81', cNumDocFiscal: '123', cNumParcela: '001/001', nValorTitulo: 5000 }, resumo: { nValPago: 5000 } },
  { detalhes: { nCodTitulo: 2, cNatureza: 'R', cStatus: 'RECEBIDO', dDtPagamento: '05/11/2026', nCodCliente: 502, cCPFCNPJCliente: '99.999.999/0001-91', cNumDocFiscal: '124', cNumParcela: '001/002', nValorTitulo: 4000 }, resumo: { nValPago: 2000 } },
  { detalhes: { nCodTitulo: 3, cNatureza: 'R', cStatus: 'RECEBIDO', dDtPagamento: '31/10/2026', nCodCliente: 501, cCPFCNPJCliente: '11.222.333/0001-81', cNumDocFiscal: '120', nValorTitulo: 700 }, resumo: { nValPago: 700 } },
  { detalhes: { nCodTitulo: 4, cNatureza: 'R', cStatus: 'CANCELADO', dDtPagamento: '06/11/2026', nCodCliente: 501, cCPFCNPJCliente: '11.222.333/0001-81', nValorTitulo: 900 }, resumo: { nValPago: 900 } },
  { detalhes: { nCodTitulo: 5, cNatureza: 'R', cStatus: 'RECEBIDO', dDtPagamento: '11/11/2026', nCodCliente: 503, cCPFCNPJCliente: '22.333.444/0001-55', cNumTitulo: 'BOL-77', nValorTitulo: 1300, cRetPIS: 'S', nValorPIS: 65, cRetCOFINS: 'S', nValorCOFINS: 35, cRetIR: 'N', nValorIR: 15 }, resumo: { nValPago: 1200 } }
];
function montar(o) {
  o = o || {};
  const a = ambiente({ tabelas: { CAD_CLIENTES: [{ ID: 'c1', CNPJ: '11.222.333/0001-81', RAZAO_SOCIAL: 'HOSPITAL TESTE ALFA LTDA' }, { ID: 'c2', CNPJ: '22333444000155', RAZAO_SOCIAL: 'CLINICA TESTE BETA' }] } });
  a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_dir","u_dir2","u_fin","u_fin2"]'; // 16/11/2026: lista de sigilo do Financeiro
  for (const f of ['SGO_Omie.js', 'SGO_Omie_Ganhos.js', 'SGO_Omie_Sigilo.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  vm.runInContext('if (typeof PODERES_CATALOGO_MEMO !== "undefined") PODERES_CATALOGO_MEMO = null;', a.ctx);
  if (o.credenciais !== false) Object.assign(a.props, { OMIE_APP_KEY: 'chave-ficticia', OMIE_APP_SECRET: 'segredo-ficticio' });
  a.omie = [];
  a.ctx.Utilities.sleep = () => {};
  const anterior = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (!/app\.omie\.com\.br/.test(url)) return anterior(url, op);
    const b = JSON.parse(op.payload); a.omie.push({ call: b.call, param: b.param[0] });
    let r = { codigo_status: '0' };
    if (b.call === 'ListarMovimentos') r = { nTotPaginas: 1, movimentos: MOV };
    if (b.call === 'ListarClientes') r = { clientes_cadastro: b.param[0].clientesPorCodigo.map((x) => ({ codigo_cliente_omie: x.codigo_cliente_omie, razao_social: { 501: 'HOSPITAL ALFA (OMIE)', 502: 'EMPRESA SEM CADASTRO', 503: 'CLINICA BETA (OMIE)' }[x.codigo_cliente_omie] })) };
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
  };
  return a;
}

test('lista do mês: pelo dia do pagamento, sem cancelados nem outro mês, com propostas do mesmo cliente', () => {
  const a = montar();
  const r = a.ok(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' }));
  assert.deepEqual(r.itens.map((i) => i.ref), ['OMIE:2:2026-11-05', 'OMIE:1:2026-11-10', 'OMIE:5:2026-11-11']);
  const t1 = r.itens[1], t2 = r.itens[0], t5 = r.itens[2];
  assert.equal(t1.cliente, 'HOSPITAL ALFA (OMIE)'); assert.equal(t1.documento, 'NF 123'); assert.equal(t1.data, '2026-11-10'); assert.equal(t1.valor, 5000);
  assert.ok(t1.propostas.length >= 3 && t1.propostas.every((p) => p.cliente === 'HOSPITAL TESTE ALFA LTDA'), JSON.stringify(t1.propostas.map((p) => p.numero)));
  assert.ok(!t1.propostas.some((p) => p.numero === 'PROP-2026-0005'), 'proposta não aprovada fica fora');
  assert.equal(t2.clienteNoSgo, false); assert.equal(t2.propostas.length, 0); assert.equal(t2.parcial, true); assert.equal(t2.documento, 'NF 124 parcela 001/002');
  assert.deepEqual(t5.propostas.map((p) => p.numero), ['PROP-2026-0002']); assert.equal(t5.propostas[0].vendedor, 'VERA VENDEDORA TESTE'); assert.equal(t5.documento, 'BOL-77');
  assert.equal(t5.parcial, false, 'retenções não são pagamento parcial'); assert.equal(t5.retencoes, 100); assert.equal(t1.parcial, false);
  const mov = a.omie.find((c) => c.call === 'ListarMovimentos').param;
  assert.equal(mov.cTpLancamento, 'CR'); assert.equal(mov.dDtPagtoDe, '01/11/2026'); assert.equal(mov.dDtPagtoAte, '12/11/2026');
  assert.equal(r.pendentes, 3);
  assert.equal(a.tabelas.GAN_RECEBIMENTOS ? a.tabelas.GAN_RECEBIMENTOS.length : 0, 0, 'nada é lançado sozinho');
  assert.ok(a.omie.every((c) => /^Listar/.test(c.call)), 'só leitura no Omie');
});

test('lançar pela sugestão marca a origem OMIE e o mesmo título não entra duas vezes', () => {
  const a = montar();
  const l = a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p1', data: '2026-11-10', valor: '5.000,00', documento: 'NF 123', refExterna: 'OMIE:1' }));
  assert.equal(l.recebimento.origem, 'OMIE');
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p3', data: '2026-11-10', valor: '5.000,00', documento: 'NF 123-b', refExterna: 'OMIE:1' }), /já foi lançado na proposta PROP-2026-0001/);
  const r = a.ok(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' }));
  const t1 = r.itens.find((i) => i.ref === 'OMIE:1:2026-11-10');
  assert.equal(t1.jaLancado.proposta, 'PROP-2026-0001'); assert.equal(r.pendentes, 2);
  assert.equal(r.itens[r.itens.length - 1].ref, 'OMIE:1:2026-11-10', 'já lançados vão para o fim');
  // anulado libera o título de novo
  const id = l.recebimento.id;
  a.ok(a.g('fabio', 'anularRecebimento', { id, motivo: 'Lançado na proposta errada, refazer.' }));
  a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p3', data: '2026-11-10', valor: '5.000,00', documento: 'NF 123', refExterna: 'OMIE:1' }));
  // referência que não é do Omie é ignorada (lançamento manual)
  const m = a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p2', data: '2026-11-11', valor: 10, documento: 'NF 9', refExterna: 'qualquer' }));
  assert.equal(m.recebimento.origem, 'MANUAL');
});

test('quem não lança recebimentos não consulta o Omie; sem conexão configurada, a tela diz o que fazer', () => {
  const a = montar();
  a.recusa(a.g('vera', 'omieRecebimentos', { competencia: '2026-11' }), /permissão «Lançar recebimentos/);
  a.recusa(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-12' }), /ainda não começou/);
  assert.equal(a.omie.length, 0);
  const b = montar({ credenciais: false });
  a.recusa(b.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' }), /conexão com o Omie não está configurada/);
  assert.equal(b.ok(b.g('wanessa', 'recebimentos', {})).omie, false);
  assert.equal(a.ok(a.g('wanessa', 'recebimentos', {})).omie, true);
  assert.equal(a.ok(a.g('vera', 'recebimentos', {})).omie, false);
});

test('página completa: Ver recebimentos do Omie, Usar esta proposta, formulário preenchido e Lançar (1366 e 390 px)', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=[\s\S]*?\?>/g, 'null');
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      const a = montar();
      const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
        if (fn === 'GanhosVendedores_api') return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) };
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
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-ganhos_vendedores'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('ganhos_vendedores'));
      await page.locator('#gvAbas .vg-aba').first().waitFor({ timeout: 10000 });
      await page.evaluate(() => GvT_irAba_('recebimentos'));
      await page.locator('#gvOmieBloco').waitFor({ timeout: 10000 });
      await page.locator('[data-gv="omieVer"]').click();
      await page.locator('[data-gv="omieUsar"]').first().waitFor({ timeout: 10000 });
      const lista = await page.locator('#gvOmieLista').innerText();
      assert.match(lista, /HOSPITAL ALFA \(OMIE\)/); assert.match(lista, /não está no cadastro de clientes do SGO\+/); assert.match(lista, /falta lançar R\$ 8\.200,00 \(3\)/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral');
      await page.screenshot({ path: path.join(saida, largura + '-ganhos-omie.png'), fullPage: true });
      // Usar a proposta PROP-2026-0001 para o recebimento NF 123
      await page.locator('[data-gv="omieUsar"]', { hasText: 'PROP-2026-0001' }).first().click();
      assert.equal(await page.inputValue('#gvRecData'), '2026-11-10');
      assert.equal(await page.inputValue('#gvRecValor'), '5.000,00');
      assert.equal(await page.inputValue('#gvRecDoc'), 'NF 123');
      assert.match(await page.locator('#gvCorpo').innerText(), /Proposta escolhida: PROP-2026-0001/);
      await page.locator('[data-gv="lancar"]').click();
      await page.locator('#gvMsg', { hasText: 'Recebimento lançado' }).first().waitFor({ timeout: 10000 });
      const rec = a.tabelas.GAN_RECEBIMENTOS.find((x) => x.REF_EXTERNA === 'OMIE:1:2026-11-10');
      assert.ok(rec && rec.ORIGEM === 'OMIE' && rec.PROPOSTA_ID === 'p1', 'lançado com a origem do Omie');
      assert.deepEqual(erros, []);
      assert.ok(a.omie.every((c) => /^Listar/.test(c.call)), 'só leitura no Omie');
      await page.close();
    }
  } finally { await browser.close(); }
});

test('15/11/2026 (revisão): título pago em meses diferentes — a sugestão desconta o que já foi lançado do mesmo título', () => {
  const a = montar();
  a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p1', data: '2026-10-20', valor: '3.000,00', documento: 'NF 123 1ª parte', refExterna: 'OMIE:1:2026-10-20' }));
  const r = a.ok(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' }));
  const t1 = r.itens.find((i) => i.ref === 'OMIE:1:2026-11-10');
  assert.equal(t1.jaLancado, null); assert.equal(t1.valor, 2000, 'R$ 5.000 acumulado no Omie menos R$ 3.000 já lançados'); assert.equal(t1.jaLancadoAntes, 'R$ 3.000,00');
  a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p1', data: '2026-11-10', valor: '2.000,00', documento: 'NF 123 2ª parte', refExterna: t1.ref }));
  const r2 = a.ok(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' }));
  assert.ok(r2.itens.find((i) => i.ref === 'OMIE:1:2026-11-10').jaLancado);
});

test('15/11/2026 (2ª revisão): lançamento com a referência antiga OMIE:<título> só desconta; o restante continua sugerido', () => {
  const a = montar();
  a.ok(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p1', data: '2026-10-20', valor: '3.000,00', documento: 'NF 123 parte', refExterna: 'OMIE:1' }));
  const t1 = a.ok(a.g('wanessa', 'omieRecebimentos', { competencia: '2026-11' })).itens.find((i) => i.ref === 'OMIE:1:2026-11-10');
  assert.equal(t1.jaLancado, null); assert.equal(t1.valor, 2000);
});
