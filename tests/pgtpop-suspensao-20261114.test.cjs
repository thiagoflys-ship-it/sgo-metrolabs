// PGT e POP — documentos existentes suspensos (14/11/2026, dono: "isso tudo iremos refazer, não vou querer que ninguém use
// esses documentos existentes"). Só código, nenhum dado alterado: documento emitido antes de PGTPOP_GERACAO_NOVA_DESDE
// (vazio = geração revisada ainda não publicada = tudo suspenso) aparece "Suspenso" na busca, não sai pelo "Enviar
// documento" e não entra como documento existente no PGT novo.
// Servidor: código real (Config, Main, IA, EnviarDoc) num contexto isolado. Página completa (Index.html com os include()
// resolvidos, servidor simulado) em 1366 e 390 px.
// Uso: DEST=<legado candidato> node --require <fontes.cjs> tests/pgtpop-suspensao-20261114.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');

let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

const PASTA = process.env.DEST ? path.resolve(process.env.DEST) : path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const SAIDA = process.env.CAPTURAS || path.join(__dirname, '../output/pgtpop-refacao-20261114/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');

function servidorReal(corte) {
  const ctx = vm.createContext({
    console, JSON, Math, Object, Array, String, Number, RegExp, Error, Date, parseInt, isNaN,
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    SGO_DATA: { getAll: () => [], getById: () => null, log() {} },
    SGO_CFG: { SHEETS: { DOC_DOCUMENTOS: 'DOC_DOCUMENTOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } }
  });
  for (const f of ['SGO_PgtPop_Config.js', 'SGO_PgtPop_Main.js', 'SGO_PgtPop_IA.js', 'SGO_EnviarDoc.js']) vm.runInContext(ler(f), ctx, { filename: f });
  if (corte !== undefined) vm.runInContext('PGTPOP_GERACAO_NOVA_DESDE = ' + JSON.stringify(corte) + ';', ctx);
  return ctx;
}

test('sem corte (geração revisada ainda não publicada) tudo o que existe está suspenso; a produção tem o corte da publicação', () => {
  // 14/11/2026: a geração revisada (fichas técnicas) foi publicada; o corte gravado é um instante válido
  assert.match(servidorReal().PgtPop_getAppBootstrap().geracaoNovaDesde, /^2026-11-14T\d{2}:\d{2}:\d{2}$/);
  const ctx = servidorReal('');
  assert.equal(ctx.PgtPop_getAppBootstrap().geracaoNovaDesde, '');
  for (const d of ['26/10/2026 18:53:00', '14/11/2026 09:00', '2026-11-14T10:00:00', '', null, 'data estranha']) assert.equal(ctx.PgtPop_documentoSuspenso_(d), true, String(d));
});

test('corte definido: antes do corte suspenso, a partir dele liberado; data ilegível conta como suspensa', () => {
  const ctx = servidorReal('2026-11-20T10:00:00');
  assert.equal(ctx.PgtPop_getAppBootstrap().geracaoNovaDesde, '2026-11-20T10:00:00');
  assert.equal(ctx.PgtPop_documentoSuspenso_('20/11/2026 09:59:59'), true);
  assert.equal(ctx.PgtPop_documentoSuspenso_('20/11/2026 10:00'), false);
  assert.equal(ctx.PgtPop_documentoSuspenso_('2026-11-21T08:00:00'), false);
  assert.equal(ctx.PgtPop_documentoSuspenso_(new Date('2026-11-25T12:00:00-03:00')), false);
  assert.equal(ctx.PgtPop_documentoSuspenso_(new Date('2026-11-01T12:00:00-03:00')), true);
  assert.equal(ctx.PgtPop_documentoSuspenso_('sem data'), true);
});

test('PGT novo: POP suspenso não é citado como documento existente', () => {
  const docs = [
    { tipo: 'PGT', codigoDocumento: 'PGTS', versaoAtual: 2, data: '10/11/2026 10:00:00' },
    { tipo: 'POP', codigoDocumento: 'POP001', versaoAtual: 2, titulo: 'x', data: '26/10/2026 18:53:00' },
    { tipo: 'POP', codigoDocumento: 'POP002', versaoAtual: 1, titulo: 'y', data: '21/11/2026 08:00:00' }
  ];
  for (const [corte, esperado] of [['', []], ['2026-11-20T10:00:00', ['POP002']]]) {
    const ctx = servidorReal(corte);
    ctx.PgtPop_apiListarDocumentos = () => ({ ok: true, documentosJson: JSON.stringify(docs) });
    const r = ctx.PgtPopIA_documentosVigentes_({ cnpj: '11.222.333/0001-81' }, []);
    assert.deepEqual(r.map((d) => d.rotulo), esperado, 'corte ' + corte);
    const txt = ctx.PgtPopIA_montarContextoDocumentos_({ cnpj: '11.222.333/0001-81' }, []);
    if (!esperado.length) assert.match(txt, /DOCUMENTOS JÁ EXISTENTES PARA ESTE HOSPITAL: NENHUM/);
  }
});

test('Enviar documento: PGT/POP suspenso é bloqueado com o motivo; o mesmo arquivo depois do corte e os outros módulos seguem normais', () => {
  const arquivo = (raiz, criadoEm) => ({ id: 'ARQ1', nome: 'POP - POP001 rev 2.0 - Controle de Documentos.pdf', mime: 'application/pdf', tamanho: 10, url: 'u', criadoEm, pastaId: 'P1',
    pastas: [{ id: 'P1', nome: '11222333000181', descricao: '' }, { id: 'P2', nome: 'PDFS_GERADOS', descricao: '' }, { id: 'P3', nome: raiz, descricao: '' }] });
  let ctx = servidorReal();
  ctx.EnviarDoc_arquivo_ = () => arquivo('METROLABS_PGTPOP_SISTEMA', '2026-11-14T08:00:00');
  let doc = ctx.EnviarDoc_documento_('ARQ1', {});
  assert.equal(doc.classe, 'BLOQUEADO');
  const msg = ctx.EnviarDoc_textoBloqueado_(doc);
  assert.match(msg, /^Este PGT\/POP está suspenso e não é enviado pelo sistema\. Por quê: .*serão refeitos.* O que fazer: não entregue este arquivo ao cliente; gere o documento de novo/);
  assert.doesNotMatch(msg, /LGPD/);
  // conduta (dado pessoal) mantém o texto antigo
  assert.match(ctx.EnviarDoc_textoBloqueado_({ tipo: 'Relatório do Programa de conduta' }), /LGPD/);
  // outro módulo não é afetado
  ctx.EnviarDoc_arquivo_ = () => arquivo('Autoclave - Laudos', '2026-11-14T08:00:00');
  assert.equal(ctx.EnviarDoc_documento_('ARQ1', {}).classe, 'CLIENTE');
  // depois do corte, o PGT/POP novo sai normalmente
  ctx = servidorReal('2026-11-20T10:00:00');
  ctx.EnviarDoc_arquivo_ = () => arquivo('METROLABS_PGTPOP_SISTEMA', '2026-11-21T08:00:00');
  doc = ctx.EnviarDoc_documento_('ARQ1', {});
  assert.equal(doc.classe, 'CLIENTE');
  assert.equal(doc.textoBloqueio, '');
  ctx.EnviarDoc_arquivo_ = () => arquivo('METROLABS_PGTPOP_SISTEMA', '2026-11-19T08:00:00');
  assert.equal(ctx.EnviarDoc_documento_('ARQ1', {}).classe, 'BLOQUEADO');
});

// ======================================================================= página completa
function conteudoModulo() { const ctx = {}; vm.createContext(ctx); vm.runInContext(ler('SGO_PgtPop_ConteudoModulo.js'), ctx); return ctx.PgtPop_obterConteudoModulo(); }
function montarIndex() {
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
}
const CNPJ = '11.444.777/0001-61', CLI = 'CLÍNICA MODELO ÉLE LTDA';
const ARQ = (n) => 'http://sgo.ensaio.test/arquivos/' + n;
const item = (o) => Object.assign({ status: 'EMITIDO', vigente: true, substituidaPor: '', motivo: '', emitidoPor: 'Técnico Teste', temDados: true, cliente: CLI, cnpj: CNPJ }, o, { rotulo: 'Rev. 0' + o.revisao });
const REGISTRO = [
  item({ id: 'p1', numero: 'PGTS · ' + CNPJ, revisao: 1, vigente: false, status: 'SUBSTITUIDO', substituidaPor: 'Rev. 02', emitidoEm: '26/10/2026 18:00', titulo: 'PGT', pdfId: 'pp1', pdfUrl: ARQ('pp1.pdf') }),
  item({ id: 'p2', numero: 'PGTS · ' + CNPJ, revisao: 2, emitidoEm: '10/11/2026 10:00', titulo: 'PGT', pdfId: 'pp2', pdfUrl: ARQ('pp2.pdf'), htmlId: 'pp2h', htmlUrl: ARQ('pp2.html') }),
  item({ id: 'p13', numero: 'POP013 · ' + CNPJ, revisao: 1, emitidoEm: '09/11/2026 09:00', titulo: 'POP — POP013 - CHAMADO TÉCNICO', pdfId: 'p13', pdfUrl: ARQ('p13.pdf'), htmlId: 'p13h', htmlUrl: ARQ('p13.html') })
];

function servidorPagina(corte) {
  const ctx = servidorReal(corte);
  const boot = JSON.parse(JSON.stringify(ctx.PgtPop_getAppBootstrap()));
  const conteudo = conteudoModulo();
  const ok = (v) => ({ ok: true, valor: v });
  return async function (fn, args) {
    if (fn === 'getSessaoAtual') return ok({ success: true, session: { sessionId: 's_adm', userId: 'u1', usuario: 'admin', nome: 'Admin Ensaio', perfil: 'ADMIN' } });
    if (fn === 'getPublicConfig') return ok({ motores: { PGT_POP: 'nativo' }, idleSecondsDefault: 3600 });
    if (fn === 'PgtPop_obterConteudoModulo') return ok(conteudo);
    if (fn === 'PgtPop_getAppBootstrap') return ok(boot);
    if (fn === 'PgtPop_apiDispatch') {
      const req = args[0] || {};
      if (req.fn === 'apiListarArquivosPdf') return ok({ ok: true, pastaUrl: '', arquivos: [] });
      if (req.fn === 'apiListarDocumentos') return ok({ ok: true, documentosJson: JSON.stringify([
        { tipo: 'PGT', registroId: 'rp2', codigoDocumento: 'PGTS', versaoAtual: 2, titulo: 'Plano', data: '10/11/2026 10:00:00' },
        { tipo: 'POP', registroId: 'r13', codigoDocumento: 'POP013', versaoAtual: 1, titulo: 'Chamado', data: '09/11/2026 09:00:00', pop: { codigo: 'POP013', nome: 'Chamado' } }]) });
      return ok({ ok: false, mensagem: 'indisponível no ensaio' });
    }
    if (fn === 'DocRev_api') {
      const p = (args[0] || {}).payload || {};
      const cnpj = String(p.cnpj || '').replace(/\D/g, ''), termo = String(p.termo || '').toLowerCase();
      const l = REGISTRO.filter((i) => (!cnpj || i.cnpj.replace(/\D/g, '') === cnpj) && (!termo || [i.numero, i.titulo, i.cliente, i.cnpj].join(' ').toLowerCase().indexOf(termo) >= 0));
      return ok({ ok: true, itens: l, total: l.length });
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  };
}

async function abrirPagina(browser, largura, corte) {
  const run = servidorPagina(corte);
  const html = montarIndex();
  const page = await browser.newPage({ viewport: { width: largura, height: 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo: ' + d.message()); d.dismiss().catch(() => {}); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => run(fn, args));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_adm'); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 20000 });
  await page.evaluate(() => abrir('pgt_pop'));
  await page.waitForFunction(() => !!document.getElementById('tplPgtPop_chk_POP028'), null, { timeout: 15000 });
  await page.waitForTimeout(500); // configuração do módulo (bootstrap) carregada
  return { page, erros };
}
async function buscar(page, termo) {
  await page.fill('#sgoDocRevPainel_PGT_POP_termo', termo);
  await page.locator('#sgoDocRevPainel_PGT_POP_buscar').click();
  await page.waitForFunction(() => document.getElementById('tplPgtPop_buscaDocsRes').getAttribute('aria-busy') === 'false' && !document.querySelector('#tplPgtPop_buscaDocsRes .pp-carregando'));
}

test('página completa: documentos suspensos marcados, sem "Enviar"; com corte, só os antigos suspensos (1366 e 390 px)', { skip: !chromium && 'Playwright indisponível', timeout: 180000 }, async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      // ---------- produção hoje: tudo suspenso
      let { page, erros } = await abrirPagina(browser, largura);
      const res = page.locator('#tplPgtPop_buscaDocsRes');
      await buscar(page, CNPJ);
      assert.match(await res.locator('.pp-faixa.erro').first().innerText(), /Todos os documentos abaixo estão suspensos\.[\s\S]*Por quê: a auditoria encontrou erros[\s\S]*O que fazer: não use nem envie/);
      assert.equal(await res.locator('.pp-res-doc .pp-selo.erro', { hasText: 'Suspenso' }).count(), 2);
      assert.equal(await res.locator('.pp-suspenso').count(), 2);
      await page.waitForTimeout(800); // o JS_EnviarDoc decora os links a cada 350 ms
      assert.equal(await page.locator('#tplPgtPop_buscaDocs [data-sgo-enviar]').count(), 0, 'nenhum "Enviar"');
      assert.equal(await page.locator('#tplPgtPop_buscaDocs .envdoc-mini').count(), 0, 'nenhum "Enviar" automático nos links');
      assert.equal(await res.locator('.pp-btn.pri', { hasText: 'Abrir PDF' }).count(), 0);
      assert.equal(await res.locator('a.pp-btn', { hasText: 'Ver PDF (consulta interna)' }).count(), 3, 'os 2 vigentes e a revisão anterior do PGT');
      const doc13 = res.locator('.pp-res-doc').nth(1);
      await doc13.getByRole('button', { name: 'Mais ações' }).click();
      const mais = doc13.locator('.pp-res-mais');
      assert.deepEqual(await mais.locator('.pp-mais-item > .pp-btn').allInnerTexts(), ['Abrir para corrigir', 'Usar como base']);
      assert.match(await mais.innerText(), /Envio bloqueado: este documento está suspenso e será refeito\./);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1), true, 'sem rolagem lateral');
      assert.equal(await res.locator('.pp-suspenso').first().evaluate((p) => getComputedStyle(p).textAlign), 'justify');
      await page.locator('#tplPgtPop_buscaDocs').screenshot({ path: path.join(SAIDA, largura + '-busca-suspensos.png') });
      // etapa 1: consulta do CNPJ avisa
      await page.fill('#tplPgtPop_cnpj', CNPJ);
      await page.locator('#tplPgtPop_btnConsultarDocs').click();
      await page.waitForFunction(() => /Todos estão suspensos e serão refeitos\./.test(document.getElementById('tplPgtPop_docsExistentesWrap').innerText));
      await page.locator('#tplPgtPop_docsExistentesWrap').screenshot({ path: path.join(SAIDA, largura + '-etapa1-suspensos.png') });
      assert.deepEqual(erros, []);
      await page.close();

      // ---------- depois da geração revisada (corte 10/11/2026 00:00): só o POP013 de 09/11 continua suspenso
      ({ page, erros } = await abrirPagina(browser, largura, '2026-11-10T00:00:00'));
      const res2 = page.locator('#tplPgtPop_buscaDocsRes');
      await buscar(page, CNPJ);
      assert.match(await res2.locator('.pp-faixa.erro').first().innerText(), /1 documento abaixo está suspenso\./);
      assert.equal(await res2.locator('.pp-res-doc').nth(0).locator('.pp-selo.erro').count(), 0, 'PGT novo liberado');
      assert.equal(await res2.locator('.pp-res-doc').nth(0).locator('.pp-btn.pri', { hasText: 'Abrir PDF' }).count(), 1);
      assert.equal(await res2.locator('.pp-res-doc').nth(1).locator('.pp-selo.erro', { hasText: 'Suspenso' }).count(), 1);
      assert.equal(await page.locator('#tplPgtPop_buscaDocs [data-sgo-enviar]').count(), 1, 'só o documento novo tem "Enviar"');
      // a revisão anterior do PGT (26/10) é consulta interna
      await res2.locator('.pp-res-doc').nth(0).locator('.pp-res-rev > summary').click();
      assert.match(await res2.locator('.pp-res-doc').nth(0).locator('.pp-rev-lista').innerText(), /Ver PDF \(consulta interna\)/);
      await page.fill('#tplPgtPop_cnpj', CNPJ);
      await page.locator('#tplPgtPop_btnConsultarDocs').click();
      await page.waitForFunction(() => /1 documento está suspenso e será refeito\./.test(document.getElementById('tplPgtPop_docsExistentesWrap').innerText));
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
