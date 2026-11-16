// PGT e POP — redesenho da tela (13/11/2026, dono: "no padrão que merecemos, ensinando a preencher, como no Comercial").
// Página completa (Index.html com os include() resolvidos; o módulo chega pelo caminho real: renderTplPgtPop_ busca
// PgtPop_obterConteudoModulo pelo google.script.run simulado), nas larguras 1366, 390 e 320 px. Confere as 5 etapas,
// as três falhas corrigidas (resumo da etapa 4, roteiro preservado ao redesenhar o catálogo, aviso do preenchimento
// automático), a fila de geração com respostas de sucesso e de falha, "Abrir para corrigir", 44 px, rolagem lateral,
// erros de JavaScript e diálogos do navegador, e compara os pedidos ao servidor com a versão anterior (base).
// Uso: DEST=<legado candidato> [BASE=<legado base>] node --require <fontes.cjs> tests/pgtpop-redesenho-20261113.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

const PASTA_CAND = process.env.DEST ? path.resolve(process.env.DEST) : path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const PASTA_BASE = process.env.BASE ? path.resolve(process.env.BASE) : path.join(__dirname, '../output/pgtpop-redesenho-20261113/base');
const SAIDA = process.env.CAPTURAS || path.join(__dirname, '../output/pgtpop-redesenho-20261113/capturas');
const ler = (pasta, f) => fs.readFileSync(path.join(pasta, f), 'utf8');

function conteudoModulo(pasta) {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(ler(pasta, 'SGO_PgtPop_ConteudoModulo.js'), ctx);
  return ctx.PgtPop_obterConteudoModulo();
}
function bootstrapReal(pasta) {
  const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } }; vm.createContext(ctx);
  vm.runInContext(ler(pasta, 'SGO_PgtPop_Config.js') + '\n;this.__cfg = PGTPOP_CFG;', ctx);
  const fn = /function PgtPop_getAppBootstrap\(\) \{[\s\S]*?\n\}/.exec(ler(pasta, 'SGO_PgtPop_Main.js'))[0];
  vm.runInContext(fn, ctx);
  return JSON.parse(JSON.stringify(ctx.PgtPop_getAppBootstrap()));
}
function montarIndex(pasta) {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  return ler(pasta, 'Index.html').replace(INC, (m, f) => ler(pasta, f + '.html')).replace(VER, '""');
}

test('conteúdo do módulo: getter, primeiro <style> e primeiro <script> completos, nomes do contrato', () => {
  const src = ler(PASTA_CAND, 'SGO_PgtPop_ConteudoModulo.js');
  assert.ok(src.startsWith('var PGTPOP_CONTEUDO_MODULO = "'), 'declaração com aspas duplas');
  const s = conteudoModulo(PASTA_CAND);
  const st = s.match(/<style>([\s\S]*?)<\/style>/), sc = s.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(st && sc);
  assert.match(st[1], /@media \(max-width: 600px\)/);
  new vm.Script(sc[1]);
  for (const nome of ['tplPgtPop_gerarTudo', 'tplPgtPop_dispatch_', 'tplPgtPop_renderReal_', 'tplPgtPop_aplicarRevisao_', 'tplPgtPop_irParaEtapa', 'tplPgtPop_renderCatalogoPops'])
    assert.match(sc[1], new RegExp('\\n  (async )?function ' + nome + '\\('), nome);
  // dentro do gerarTudo a chamada ao servidor é pelo nome global (o SGO_DocRev troca window.tplPgtPop_dispatch_)
  const gerar = sc[1].slice(sc[1].indexOf('async function tplPgtPop_gerarTudo('), sc[1].indexOf('// PASSO 5'));
  assert.equal((gerar.match(/await tplPgtPop_dispatch_\('apiGerarDocumento'/g) || []).length, 2);
  assert.doesNotMatch(sc[1], /\balert\(|\bconfirm\(|\bprompt\(/, 'sem diálogos do navegador');
  // a ajuda global cita os botões novos
  const ajuda = ler(PASTA_CAND, 'SGO_Ajuda_Documentos.js');
  const bloco = ajuda.slice(ajuda.indexOf('"pgt_pop"'), ajuda.indexOf('"reg_op"'));
  for (const t of ['Buscar no cadastro público', 'Avançar para o PGT', 'Conferir e gerar', 'Gerar tudo', 'Ver os documentos', 'Fila de geração', 'Revisar texto', 'Falta salvar na pasta', 'Não gerado'])
    assert.ok(bloco.includes(t), 'ajuda: ' + t);
  assert.doesNotMatch(bloco, /Gerar Tudo|"Buscar\\"|Ver Documentos|\+ Adicionar/);
});

// 14/11/2026 (correções da auditoria): Main, IA, Documento, Config e JS_DocRevisao mudaram de propósito; o resto do servidor
// continua idêntico. As mudanças do servidor são cobertas por tests/pgtpop-correcoes-20261114.test.cjs.
test('servidor do PGT e POP idêntico ao da base (fora o que as correções de 14/11/2026 mudaram)', { skip: !fs.existsSync(PASTA_BASE) && 'sem base' }, () => {
  for (const f of ['SGO_PgtPop_Setup.js'])
    assert.ok(fs.readFileSync(path.join(PASTA_CAND, f)).equals(fs.readFileSync(path.join(PASTA_BASE, f))), f);
});

// ------------------------------------------------------------------ servidor simulado
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const AVISO_TEXTO_PADRAO = 'O POP saiu com o texto padrão montado a partir do roteiro informado, sem a redação da IA (serviço de IA indisponível). Revise o documento antes de enviar ao cliente.';
const AVISO_SEM_PASTA = 'O documento foi gerado e gravado no histórico, mas não foi salvo na pasta do cliente (tempo esgotado ao gravar o PDF). Abra o documento e use "Salvar na pasta do cliente".';
const FALHA_POP = 'O POP não foi gerado e nada foi gravado (a revisão continua a mesma): a IA não respondeu depois de 3 tentativas.';
const HOSP_ANTERIOR = { razaoSocial: 'HOSPITAL MODELO ANTERIOR LTDA', cnpj: '11.222.333/0001-81', logradouro: 'Rua Antiga, 1', bairro: 'Centro', cidade: 'Goiânia', uf: 'GO', porte: 'Hospital geral de médio porte', leitos: '120', aprovadorNome: 'Maria Exemplo da Silva', aprovadorCargo: 'Responsável Técnico' };
const CONTROLE = [
  { tipo: 'PGT', registroId: 'pgt-0', codigoDocumento: 'PGTS', versaoAtual: 1, titulo: 'Plano de Gerenciamento de Tecnologias em Saúde', hospital: HOSP_ANTERIOR, data: '03/11/2026 09:12:00' },
  { tipo: 'POP', registroId: 'pop-av', codigoDocumento: '', versaoAtual: 1, titulo: 'POP de Controle de Temperatura de Refrigeradores', hospital: HOSP_ANTERIOR, data: '03/11/2026 09:20:00' }
];
const PAYLOAD_CORRIGIR = { tipo: 'POP', hospital: Object.assign({}, HOSP_ANTERIOR, { razaoSocial: 'HOSPITAL CORRIGIDO LTDA' }), roteiro: 'Chamado aberto pelo setor no sistema do hospital.',
  pop: { codigo: 'POP013', nome: 'Chamado Técnico de Equipamento' }, pgtId: 'pgt-0', imagens: [], elaboradoPorNome: 'João Exemplo Souza', elaboradoPorCargo: 'Engenheiro Clínico', elaboradoPorRegistro: 'CREA-UF 000000/D' };

function servidor(pasta) {
  const boot = bootstrapReal(pasta);
  const conteudo = conteudoModulo(pasta);
  const chamadas = [];
  let trava = null;
  const estado = { falharBoot: false };
  const ok = (v) => ({ ok: true, valor: v });
  async function gerar(p) {
    const pop = p.pop || {};
    const base = { ok: true, tipo: p.tipo, hospital: p.hospital, roteiro: p.roteiro, pop: p.pop, elaboradoPorNome: p.elaboradoPorNome, textoGerado: 'Texto de ensaio.', imagens: [], historico: [] };
    if (p._docRev) return ok(Object.assign(base, { registroId: 'pop-13b', codigoDocumento: pop.codigo, versaoAtual: 2, titulo: pop.nome, pdfUrl: 'https://arquivos.exemplo.test/pop13-r2.pdf' }));
    if (p.tipo === 'PGT') {
      if (trava) await trava.promessa;
      return ok(Object.assign(base, { registroId: 'pgt-1', codigoDocumento: 'PGTS', versaoAtual: 2, titulo: 'Plano de Gerenciamento de Tecnologias em Saúde', pdfUrl: 'https://arquivos.exemplo.test/pgt.pdf' }));
    }
    if (pop.codigo === 'POP001') return ok(Object.assign(base, { registroId: 'pop-1', codigoDocumento: 'POP001', versaoAtual: 1, titulo: pop.nome, pdfUrl: 'https://arquivos.exemplo.test/pop1.pdf', avisoHtml: AVISO_TEXTO_PADRAO }));
    if (pop.codigo === 'POP013') return ok({ ok: false, mensagem: FALHA_POP });
    if (pop.codigo === 'POP022') return ok(Object.assign(base, { registroId: 'pop-22', codigoDocumento: 'POP022', versaoAtual: 3, titulo: pop.nome, pdfUrl: '', avisoHtml: AVISO_SEM_PASTA }));
    return { ok: false, erro: 'tempo esgotado no servidor' }; // avulso: exceção (withFailureHandler)
  }
  async function despacho(req) {
    const p = req.payload || {};
    switch (req.fn) {
      case 'apiConsultarCnpj': return ok({ ok: true, fonte: 'consulta pública', cnpj: '11.222.333/0001-81', razaoSocial: 'HOSPITAL MODELO FICTICIO LTDA', cliente: 'HOSPITAL MODELO', logradouro: 'Rua Exemplo, 100', bairro: 'Setor Central', municipio: 'Goiânia', uf: 'GO' });
      case 'apiListarArquivosPdf': return ok({ ok: true, pastaUrl: '', arquivos: [
        { nome: 'PGT - PGTS rev 1.0 - Plano de Gerenciamento de Tecnologias em Saude - 2026-11-03 0912.pdf', url: 'https://arquivos.exemplo.test/a1', data: '03/11/2026 09:12' },
        { nome: 'POP - POP013 rev 1.0 - Chamado Tecnico de Equipamento - 2026-11-03 0920.pdf', url: 'https://arquivos.exemplo.test/a2?x=1&y=2', data: '03/11/2026 09:20' }] });
      case 'apiListarDocumentos': return ok({ ok: true, documentosJson: JSON.stringify(CONTROLE) });
      case 'apiGerarDocumento': return gerar(p);
      case 'apiMontarDocumentoFinal': return ok({ ok: true, html: '<!doctype html><html><body><h1>Documento de ensaio</h1></body></html>' });
      case 'apiSalvarDocumento': return ok({ ok: true, url: 'https://arquivos.exemplo.test/salvo.pdf', fileName: 'POP - POP022 rev 3.0.pdf' });
      default: return { ok: false, erro: 'indisponível no ensaio: ' + req.fn };
    }
  }
  async function run(fn, args) {
    if (fn === 'getSessaoAtual') return ok({ success: true, session: { sessionId: 's_adm', userId: 'u1', usuario: 'admin', nome: 'Admin Ensaio', perfil: 'ADMIN' } });
    if (fn === 'getPublicConfig') return ok({ motores: { PGT_POP: 'nativo' }, idleSecondsDefault: 3600 });
    if (fn === 'PgtPop_obterConteudoModulo') return ok(conteudo);
    if (fn === 'PgtPop_getAppBootstrap') return estado.falharBoot ? { ok: false, erro: 'Tempo esgotado' } : ok(boot);
    if (fn === 'PgtPop_apiDispatch') { chamadas.push(JSON.parse(JSON.stringify(args[0]))); return despacho(args[0]); }
    if (fn === 'DocRev_api') {
      const r = args[0] || {};
      if (r.fn === 'listar') return ok({ ok: true, total: 1, itens: [{ id: 'dr1', numero: 'POP013', rotulo: 'Rev. 00', vigente: true, titulo: 'Chamado Técnico de Equipamento', cliente: 'HOSPITAL MODELO ANTERIOR LTDA', emitidoPor: 'admin', emitidoEm: '03/11/2026' }] });
      if (r.fn === 'abrir') return ok({ ok: true, modo: 'CORRIGIR', id: 'dr1', info: { numero: 'POP013', rotuloOrigem: 'Rev. 00', rotuloProxima: 'Rev. 01' }, payload: PAYLOAD_CORRIGIR, form: {} });
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  }
  return { run, chamadas, estado, travar() { let lib; trava = { promessa: new Promise((r) => { lib = r; }) }; trava.liberar = lib; return trava; }, soltar() { if (trava) trava.liberar(); trava = null; } };
}

async function abrirPagina(browser, pasta, largura, opcoes) {
  opcoes = opcoes || {};
  const srv = servidor(pasta);
  if (opcoes.falharBoot) srv.estado.falharBoot = true;
  const html = montarIndex(pasta);
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo: ' + d.message()); d.dismiss().catch(() => {}); });
  page.on('popup', (p) => { p.on('pageerror', (e) => erros.push('aba: ' + e.message)); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => srv.run(fn, args));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_adm'); } catch (e) {}
    window.__ordem = [];
    const abrirOrig = window.open;
    window.open = function () { window.__ordem.push('window.open'); return abrirOrig.apply(this, arguments); };
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.__ordem.push(String(k) + ':' + String((args[0] && args[0].fn) || '')); window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 20000 });
  await page.evaluate(() => abrir('pgt_pop'));
  try {
    if (opcoes.falharBoot) await page.waitForSelector('#tplPgtPop_faixaBoot .pp-faixa', { timeout: 15000 });
    else await page.waitForFunction(() => !!document.getElementById('tplPgtPop_chk_POP028'), null, { timeout: 15000 });
  } catch (e) {
    const tela = await page.evaluate(() => String((document.getElementById('conteudo') || document.body).innerText || '').slice(0, 600));
    throw new Error('o módulo não abriu: ' + tela + ' | erros: ' + erros.join(' | ') + ' | pedidos: ' + JSON.stringify(await page.evaluate(() => window.__ordem.slice(0, 40))));
  }
  return { page, erros, srv };
}

async function medir(page) {
  return page.evaluate(() => {
    const cont = document.getElementById('tplPgtPopContainer');
    const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const sel = 'button, .pp-btn, .btn, summary, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea, select, .pp-pop-head';
    const pequenos = Array.prototype.filter.call(cont.querySelectorAll(sel), vis)
      .filter((el) => el.getBoundingClientRect().height < 43.5)
      .map((el) => el.tagName + '.' + String(el.className) + ' "' + String(el.textContent || el.placeholder || '').trim().slice(0, 40) + '" ' + el.getBoundingClientRect().height.toFixed(1));
    return { lateral: document.documentElement.scrollWidth - window.innerWidth, pequenos };
  });
}
async function conferirTela(page, largura, onde) {
  const m = await medir(page);
  assert.ok(m.lateral <= 1, 'sem rolagem lateral em ' + largura + ' (' + onde + '): ' + m.lateral);
  assert.deepEqual(m.pequenos, [], 'toques de 44 px em ' + largura + ' (' + onde + ')');
}
const etapaAtiva = (page) => page.evaluate(() => [1, 2, 3, 4, 5].find((i) => document.getElementById('tplPgtPop_step' + i).classList.contains('active')));
const foto = (page, largura, nome) => page.locator('#tplPgtPopContainer').screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png') });

test('página completa: as 5 etapas, falhas corrigidas, fila de geração e correção (1366, 390 e 320 px)', { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const { page, erros, srv } = await abrirPagina(browser, PASTA_CAND, largura);
      const cont = page.locator('#tplPgtPopContainer');
      await page.waitForSelector('#tplPgtPop_catalogoPops .pp-pop[data-pop]', { state: 'attached' });
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop]').count(), 28, '28 POPs do catálogo real');
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-grupo').count(), 8, '8 grupos');
      await page.waitForSelector('.module-header .sgo-btn-manual', { timeout: 5000 });
      assert.equal(await page.locator('.module-header .sgo-btn-manual').count(), 1, 'o casco levou o "Manual do operador" ao cabeçalho do portal');
      assert.equal(await cont.locator('.header-card').first().isVisible(), false, 'cabeçalho interno escondido pelo casco');
      assert.equal(await cont.locator('.sgo-detalhes-tecnicos').count(), 0, 'histórico já está num details próprio');
      await conferirTela(page, largura, 'etapa 1');
      await page.locator('#tplPgtPop_guia > summary').click();
      await foto(page, largura, 'guia');
      await page.locator('#tplPgtPop_guia > summary').click();

      // ---------- Etapa 1: avançar vazio
      await page.getByRole('button', { name: 'Avançar para o PGT' }).click();
      const aviso1 = await page.locator('#tplPgtPop_avisoEtapa1').innerText();
      // 14/11/2026: os dois cargos passaram a ser obrigatórios (sem cargo padrão).
      assert.match(aviso1, /Para avançar, preencha: razão social do cliente; nome do responsável técnico do cliente; cargo de quem aprova; nome de quem elaborou; cargo de quem elaborou\./);
      assert.equal(await cont.locator('.pp-campo.falta').count(), 5);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'tplPgtPop_hospital', 'foco no primeiro que falta');
      assert.equal(await etapaAtiva(page), 1);
      await foto(page, largura, 'e1-falta');

      // ---------- Consulta por CNPJ (razão social vazia: preenche e avisa) e busca (troca e avisa)
      await page.fill('#tplPgtPop_cnpj', '11222333000181');
      await page.locator('#tplPgtPop_btnConsultarDocs').click();
      await page.waitForFunction(() => /Dados do cliente preenchidos pelo último documento gerado/.test(document.getElementById('tplPgtPop_docsExistentesWrap').innerText));
      const consulta = await page.locator('#tplPgtPop_docsExistentesWrap').innerText();
      // 14/11/2026: a consulta conta os documentos vigentes e leva à busca; a lista solta de PDFs da pasta saiu.
      assert.match(consulta, /Este CNPJ já tem 2 documentos vigentes: 1 PGT e 1 POP\./);
      assert.match(consulta, /Campos preenchidos: razão social, logradouro, bairro, cidade, UF, porte, leitos, responsável técnico, cargo de quem aprova\. Vieram do documento de 03\/11\/2026\./);
      assert.equal(await page.inputValue('#tplPgtPop_hospital'), 'HOSPITAL MODELO ANTERIOR LTDA');
      assert.equal(await page.locator('#tplPgtPop_docsExistentesWrap button', { hasText: 'Ver documentos deste cliente' }).count(), 1);
      assert.equal(await cont.locator('.pp-campo.falta').count(), 2, 'nome e cargo de quem elaborou ainda faltam; os preenchidos saíram do vermelho');
      assert.match(await page.locator('#tplPgtPop_avisoEtapa1').innerText(), /^Para avançar, preencha: nome de quem elaborou; cargo de quem elaborou./);
      await page.locator('#tplPgtPop_btnBuscarCnpj').click();
      await page.waitForFunction(() => /Cliente encontrado no cadastro público/.test(document.getElementById('tplPgtPop_alertaCnpj').innerText));
      const busca = await page.locator('#tplPgtPop_alertaCnpj').innerText();
      assert.match(busca, /Valores que você já tinha digitado e foram trocados pela busca: razão social, logradouro, bairro\./, 'a busca diz o que trocou');
      assert.equal(await page.inputValue('#tplPgtPop_hospital'), 'HOSPITAL MODELO FICTICIO LTDA');
      assert.equal(await page.inputValue('#tplPgtPop_cnpj'), '11.222.333/0001-81');
      assert.equal(await page.locator('#tplPgtPop_btnBuscarCnpj').innerText(), 'Buscar no cadastro público');
      assert.ok(await page.locator('#tplPgtPop_hospital').evaluate((el) => el.closest('.pp-campo').classList.contains('auto')), 'campo preenchido em amarelo claro');
      await page.fill('#tplPgtPop_logradouro', 'Rua Exemplo, 100 - Quadra 1');
      assert.equal(await page.locator('#tplPgtPop_logradouro').evaluate((el) => el.closest('.pp-campo').classList.contains('auto')), false, 'editou: sai o amarelo');
      await page.fill('#tplPgtPop_elaboradoPorNome', 'João Exemplo Souza');
      await page.fill('#tplPgtPop_elaboradoPorCargo', 'Engenheiro Clínico');
      await page.fill('#tplPgtPop_elaboradoPorRegistro', 'CREA-UF 000000/D');
      assert.equal(await page.locator('#tplPgtPop_avisoEtapa1').innerText(), '', 'a faixa some quando não falta mais nada');
      await foto(page, largura, 'e1-cliente');
      await page.getByRole('button', { name: 'Avançar para o PGT' }).click();
      assert.equal(await etapaAtiva(page), 2);
      assert.equal(await page.locator('#tplPgtPop_avisoEtapa1').innerText(), '');

      // ---------- Etapa 2: trechos prontos, contador e imagens (um botão por anexo)
      await page.locator('#tplPgtPop_chipsPgt .pp-chip', { hasText: 'Engenharia clínica terceirizada' }).click();
      await page.locator('#tplPgtPop_roteiroPgt').press('End');
      await page.locator('#tplPgtPop_roteiroPgt').type(' Visitas semanais.');
      await page.locator('#tplPgtPop_chipsPgt .pp-chip', { hasText: 'CME própria' }).click();
      await page.locator('#tplPgtPop_chipsPgt .pp-chip', { hasText: 'Engenharia clínica terceirizada' }).click();
      const roteiroPgt = await page.inputValue('#tplPgtPop_roteiroPgt');
      assert.equal(roteiroPgt, 'A engenharia clínica é prestada por empresa contratada, com visitas programadas. Visitas semanais.\nO estabelecimento tem Central de Material e Esterilização própria; incluir autoclaves e lavadoras no plano de manutenção.');
      assert.match(await page.locator('#tplPgtPop_contRoteiroPgt').innerText(), /^\d+ caracteres$/);
      assert.equal(await page.locator('#tplPgtPop_chipsPgt .pp-chip.usado').count(), 2);
      await page.locator('#tplPgtPop_step2 input[type=file]').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.png', mimeType: 'image/png', buffer: PNG }]);
      await page.waitForFunction(() => document.querySelectorAll('#tplPgtPop_imagensPgtWrap .pp-img').length === 2);
      await page.locator('#tplPgtPop_imagensPgtWrap .pp-img input').first().fill('Sala de guarda de equipamentos');
      await page.locator('#tplPgtPop_imagensPgtWrap .pp-img').nth(1).getByRole('button', { name: 'Remover' }).click();
      assert.equal(await page.locator('#tplPgtPop_imagensPgtWrap .pp-img').count(), 1);
      assert.equal(await page.locator('#tplPgtPop_step2 .sgo-arquivo').count(), 0, 'o portal não duplicou o botão do anexo');
      assert.match(await page.locator('#tplPgtPop_nav2 small').innerText(), /com roteiro · 1 imagem/);
      await conferirTela(page, largura, 'etapa 2');
      await foto(page, largura, 'e2-pgt');
      await page.getByRole('button', { name: 'Avançar para os POPs' }).click();
      assert.equal(await etapaAtiva(page), 3);

      // ---------- Etapa 3: marcar, roteiro, redesenhar, desmarcar todos, busca, avulso
      await page.getByRole('button', { name: 'Abrir todos os grupos' }).click();
      const head = (c) => page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="' + c + '"] > .pp-pop-head');
      const rot13 = page.locator('#tplPgtPop_extra_POP013 textarea');
      await head('POP013').click();
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP013'), true);
      await rot13.fill('Chamado aberto pelo setor; atendimento em até 2 horas para equipamentos críticos.');
      await head('POP013').click();
      await head('POP013').click();
      assert.equal(await rot13.inputValue(), 'Chamado aberto pelo setor; atendimento em até 2 horas para equipamentos críticos.', 'desmarcar e marcar de novo mantém o roteiro');
      await page.evaluate(() => tplPgtPop_renderCatalogoPops());
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP013'), true, 'redesenho mantém a marcação');
      assert.equal(await rot13.inputValue(), 'Chamado aberto pelo setor; atendimento em até 2 horas para equipamentos críticos.', 'redesenho do catálogo mantém o roteiro digitado');
      assert.equal(await page.locator('#tplPgtPop_extra_POP013').evaluate((el) => el.classList.contains('hidden')), false);
      await page.getByRole('button', { name: 'Desmarcar todos' }).click();
      assert.match(await page.locator('#tplPgtPop_confirmaDesmarcar').innerText(), /Desmarcar todos os POPs\?/);
      await page.locator('#tplPgtPop_confirmaDesmarcar').getByRole('button', { name: 'Desmarcar todos' }).click();
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP013'), false);
      assert.match(await page.locator('#tplPgtPop_catTotal').innerText(), /^0 de 28 marcados$/);
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-grupo:not([open])').count(), 0, 'o redesenho mantém os grupos abertos');
      assert.equal(await page.locator('#tplPgtPop_btnGrupos').innerText(), 'Fechar todos os grupos');
      await head('POP013').click();
      assert.equal(await rot13.inputValue(), 'Chamado aberto pelo setor; atendimento em até 2 horas para equipamentos críticos.', 'roteiro guardado depois de desmarcar todos');
      await head('POP001').click();
      await page.locator('#tplPgtPop_extra_POP001 textarea').fill('Lista mestra de documentos mantida pela engenharia clínica.');
      await head('POP022').click();
      await page.locator('#tplPgtPop_extra_POP022 input[type=file]').setInputFiles([{ name: 'c.png', mimeType: 'image/png', buffer: PNG }]);
      await page.waitForFunction(() => document.querySelectorAll('#tplPgtPop_imgs_POP022 .pp-img').length === 1);
      assert.match(await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP022"] [data-pp-resumo-pop]').innerText(), /1 imagem/);
      assert.match(await page.locator('#tplPgtPop_catTotal').innerText(), /^3 de 28 marcados$/);
      const busca3 = page.locator('#tplPgtPop_step3 input[data-pp-busca]');
      await busca3.fill('chamado');
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-pop:not(.hidden)').count(), 1);
      await busca3.fill('xyzw');
      assert.match(await page.locator('#tplPgtPop_catalogoPops').innerText(), /Nenhum POP do catálogo com "xyzw"/);
      await busca3.fill('');
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-pop:not(.hidden)').count(), 28);
      await page.getByRole('button', { name: 'Adicionar POP avulso' }).click();
      assert.match(await page.locator('#tplPgtPop_avisoAvulso').innerText(), /Digite o nome do POP avulso antes de adicionar\./);
      await page.fill('#tplPgtPop_avulsoNome', 'POP de Controle de Temperatura de Refrigeradores de Medicamentos');
      await page.getByRole('button', { name: 'Adicionar POP avulso' }).click();
      assert.match(await page.locator('#tplPgtPop_avisoAvulso').innerText(), /POP avulso adicionado\./);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.closest('[data-avulso="0"]') !== null), true, 'foco no roteiro do avulso');
      await page.keyboard.type('Leitura de temperatura duas vezes ao dia pela farmácia.');
      await conferirTela(page, largura, 'etapa 3');
      await foto(page, largura, 'e3-pops');
      assert.equal(await page.evaluate(() => document.querySelectorAll('#tplPgtPop_viewModulo [data-pp-busca][id]').length), 0, 'busca sem id (fora do pedido do SGO_DocRev)');
      await page.getByRole('button', { name: 'Conferir e gerar', exact: true }).click();
      assert.equal(await etapaAtiva(page), 4);

      // ---------- Etapa 4: o resumo é preenchido (antes ficava vazio)
      const resumo = await page.locator('#tplPgtPop_resumoGeracao').innerText();
      assert.match(resumo, /HOSPITAL MODELO FICTICIO LTDA/);
      assert.match(resumo, /CNPJ 11\.222\.333\/0001-81 · Goiânia\/GO · 120 leitos/);
      assert.match(resumo, /Aprova: Maria Exemplo da Silva/);
      assert.match(resumo, /Elabora: João Exemplo Souza \(CREA-UF 000000\/D\)/);
      assert.match(resumo, /Com roteiro/);
      assert.match(resumo, /1 imagem anexada · redigido em 6 partes/);
      assert.match(resumo, /4 documentos/);
      assert.match(resumo, /POP001, POP013, POP022 e 1 avulso\. Com roteiro: 3\./);
      assert.match(resumo, /Serão gerados 1 PGT e 4 POPs para HOSPITAL MODELO FICTICIO LTDA/);
      assert.equal(await page.locator('#tplPgtPop_fila li').count(), 5);
      assert.equal(await page.locator('#tplPgtPop_btnGerar').innerText(), 'Gerar tudo');
      assert.ok((await page.locator('#tplPgtPop_btnGerar').boundingBox()).height >= 52, 'Gerar tudo com 52 px');
      await conferirTela(page, largura, 'etapa 4');
      await foto(page, largura, 'e4-gerar');

      // 14/11/2026: o PGTS já existe para o CNPJ (rev. 1.0): sai como revisão e o motivo da rodada é obrigatório.
      await page.fill('#tplPgtPop_motivoRodada', 'Inclusão da CME própria e revisão das rotinas de chamado.');
      // geração: o PGT fica "Gerando…" até o servidor responder
      const antes = srv.chamadas.length;
      const trava = srv.travar();
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForSelector('#tplPgtPop_fila li.gerando');
      assert.equal(await page.locator('#tplPgtPop_btnGerar').isDisabled(), true);
      assert.equal(await page.locator('#tplPgtPop_btnGerar').innerText(), 'Gerando…');
      assert.match(await page.locator('#tplPgtPop_avisoGerar').innerText(), /Gerando 1 de 5: Plano de Gerenciamento de Tecnologias em Saúde\./);
      assert.equal(await page.locator('#tplPgtPop_barraProg [role=progressbar]').count(), 1);
      assert.match(await page.locator('#tplPgtPop_fila li.gerando').innerText(), /Redigindo o PGT em 6 partes/);
      assert.match(await page.locator('#tplPgtPop_nav4 small').innerText(), /gerando 1 de 5/);
      await foto(page, largura, 'e4-gerando');
      trava.liberar(); srv.soltar();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'), null, { timeout: 10000 });
      const gerados = srv.chamadas.slice(antes).filter((c) => c.fn === 'apiGerarDocumento');
      assert.deepEqual(gerados.map((c) => c.payload.tipo + ':' + ((c.payload.pop && (c.payload.pop.codigo || c.payload.pop.nome)) || '')),
        ['PGT:', 'POP:POP001', 'POP:POP013', 'POP:POP022', 'POP:POP de Controle de Temperatura de Refrigeradores de Medicamentos'], 'ordem: PGT, catálogo na ordem do catálogo, avulsos');
      assert.ok(gerados.slice(1).every((c) => c.payload.pgtId === 'pgt-1'), 'pgtId do PGT vai nos POPs');
      // situação de cada documento na fila (etapa 4) e nos cartões (etapa 5)
      assert.deepEqual(await page.$$eval('#tplPgtPop_fila li', (ls) => ls.map((l) => l.className)), ['ok', 'aviso', 'erro', 'aviso', 'erro']);
      const fila = await page.locator('#tplPgtPop_fila').innerText();
      assert.match(fila, /Gerado · rev\. 2\.0/); assert.match(fila, /A revisão anterior continua guardada\./);
      assert.match(fila, /a IA não respondeu depois de 3 tentativas\. Os outros documentos continuam\. Escreva o roteiro deste POP na etapa 3/);
      assert.match(fila, /O servidor não respondeu a este documento\. Recarregue a página \(F5\)/);
      const docs = page.locator('#tplPgtPop_listaDocumentos');
      const txt5 = await docs.innerText();
      assert.match(txt5, /Geração concluída: 3 de 5 documentos gerados\./);
      assert.match(txt5, /2 documentos não foram gerados e 2 pedem atenção\./);
      assert.deepEqual(await page.$$eval('#tplPgtPop_listaDocumentos [data-pp-sit]', (s) => s.map((x) => x.textContent)), ['Salvo na pasta', 'Revisar texto', 'Falta salvar na pasta']);
      assert.equal(await page.locator('#tplPgtPop_listaDocumentos .pp-doc.falhou').count(), 2);
      assert.match(await page.locator('#tplPgtPop_falha_0').innerText(), /Não gerado[\s\S]*Escrever o roteiro[\s\S]*Motivo: O POP não foi gerado e nada foi gravado/);
      assert.match(await page.locator('#tplPgtPop_falha_1').innerText(), /Motivo: o servidor não respondeu a este documento\./);
      assert.match(txt5, /sem a redação da IA/);
      assert.match(await page.locator('#tplPgtPop_nav5 small').innerText(), /3 gerados · 2 falharam/);
      await page.waitForSelector('#tplPgtPop_listaControle table');
      assert.equal(await page.locator('#tplPgtPop_listaControle tbody tr').count(), 2);
      assert.equal(await page.locator('#tplPgtPop_listaControle .pp-selo.avulso').count(), 1, 'código vazio vira "Avulso"');
      assert.match(await page.locator('#tplPgtPop_listaControle').innerText(), /2 documentos registrados para este CNPJ\. Atualizado às \d\d:\d\d\./);
      assert.match(await page.locator('#tplPgtPop_histSelos').innerText(), /erro/);
      await conferirTela(page, largura, 'etapa 5');
      await foto(page, largura, 'e5-documentos');

      // salvar sem abrir; abrir (aba em branco antes de qualquer espera); salvar
      const card22 = page.locator('#tplPgtPop_listaDocumentos [data-pp-doc="2"]');
      await card22.getByRole('button', { name: 'Salvar na pasta do cliente' }).click();
      assert.match(await page.locator('#tplPgtPop_statusDoc_2').innerText(), /Abra o documento antes de salvar\./);
      if (largura === 1366) {
        await page.evaluate(() => { window.__ordem = []; });
        const [aba] = await Promise.all([page.waitForEvent('popup'), card22.getByRole('button', { name: 'Abrir' }).click()]);
        await page.waitForFunction(() => window.__ordem.indexOf('PgtPop_apiDispatch:apiMontarDocumentoFinal') >= 0);
        await page.waitForFunction(() => document.getElementById('tplPgtPop_statusDoc_2').innerText.trim() === '');
        const ordem = await page.evaluate(() => window.__ordem);
        assert.ok(ordem.indexOf('window.open') >= 0 && ordem.indexOf('window.open') < ordem.indexOf('PgtPop_apiDispatch:apiMontarDocumentoFinal'), 'window.open antes do pedido: ' + ordem.join(', '));
        await aba.close();
      } else {
        // no celular o "Abrir" usa o visualizador do SGO+ (JS_Navegacao); aqui basta o documento já montado para salvar
        await page.evaluate(() => { const d = document.querySelector('#tplPgtPop_listaDocumentos [data-pp-doc="2"]'); return d && true; });
        await page.evaluate(() => tplPgtPop_abrirDocumento_(2));
        await page.waitForFunction(() => window.__ordem.indexOf('PgtPop_apiDispatch:apiMontarDocumentoFinal') >= 0);
        await page.evaluate(() => { const v = document.querySelector('.sgo-visor, [data-sgo-visor], #sgoVisorDoc'); const b = v && Array.prototype.find.call(v.querySelectorAll('button'), (x) => /voltar|fechar/i.test(x.textContent)); if (b) b.click(); });
      }
      await card22.getByRole('button', { name: 'Salvar na pasta do cliente' }).click();
      await page.waitForFunction(() => /Documento salvo na pasta do cliente/.test(document.getElementById('tplPgtPop_statusDoc_2').innerText));
      assert.equal(await card22.locator('[data-pp-sit]').innerText(), 'Salvo na pasta');
      assert.equal(await card22.locator('a.pp-btn', { hasText: 'PDF salvo' }).getAttribute('href'), 'https://arquivos.exemplo.test/salvo.pdf');

      // ---------- Abrir para corrigir (SGO_DocRev): só o documento aberto é gerado
      // 14/11/2026: o painel compartilhado virou a busca "Documentos emitidos" (Mais ações → Abrir para corrigir).
      await page.fill('#sgoDocRevPainel_PGT_POP_termo', 'POP013');
      await page.locator('#sgoDocRevPainel_PGT_POP_buscar').click();
      await page.waitForSelector('#tplPgtPop_buscaDocsRes .pp-res-doc');
      await page.locator('#tplPgtPop_buscaDocsRes .pp-res-doc').first().getByRole('button', { name: 'Mais ações' }).click();
      await page.waitForSelector('#tplPgtPopContainer button:has-text("Abrir para corrigir")');
      await conferirTela(page, largura, 'painel de documentos');
      await page.locator('#tplPgtPopContainer button:has-text("Abrir para corrigir")').first().click();
      await page.waitForSelector('#sgoDocRevQuadro_PGT_POP');
      assert.equal(await etapaAtiva(page), 4, 'a correção abre em "Conferir e gerar"');
      assert.equal(await page.inputValue('#tplPgtPop_hospital'), 'HOSPITAL CORRIGIDO LTDA');
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP013'), true);
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP001'), false);
      assert.equal(await page.locator('#tplPgtPop_extra_POP013 textarea').inputValue(), 'Chamado aberto pelo setor no sistema do hospital.');
      assert.match(await page.locator('#tplPgtPop_resumoGeracao').innerText(), /1 documento[\s\S]*POP013\. Com roteiro: 1\./);
      assert.match(await page.locator('#sgoDocRevQuadro_PGT_POP').innerText(), /Gerar tudo/);
      await page.fill('#sgoDocRevMotivo_PGT_POP', 'Correção do prazo de atendimento informado no roteiro.');
      const antesCorr = srv.chamadas.length;
      await conferirTela(page, largura, 'correção');
      await foto(page, largura, 'correcao');
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'));
      const corr = srv.chamadas.slice(antesCorr).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(corr.length, 1, 'só o documento aberto foi ao servidor');
      assert.equal(corr[0].payload._docRev.modo, 'CORRIGIR');
      assert.equal(corr[0].payload.pop.codigo, 'POP013');
      // 14/11/2026 (DESENHO_V2, seção 6.1): na correção a fila mostra só o documento aberto.
      assert.deepEqual(await page.$$eval('#tplPgtPop_fila li', (ls) => ls.map((l) => l.className)), ['ok']);
      assert.doesNotMatch(await page.locator('#tplPgtPop_fila').innerText(), /Não gerado nesta rodada/);
      assert.match(await docs.innerText(), /Geração concluída: 1 documento gerado e salvo na pasta do cliente\./);

      // ---------- trilha: as 5 etapas tocáveis, voltar livre
      for (const n of [1, 2, 3, 4, 5]) {
        await page.locator('#tplPgtPop_nav' + n).click();
        assert.equal(await etapaAtiva(page), n);
        await conferirTela(page, largura, 'trilha ' + n);
      }
      if (largura < 600) assert.match(await page.locator('#tplPgtPop_passoAtual').innerText(), /^Etapa 5 de 5 · Documentos · /);
      assert.deepEqual(erros, [], 'sem erro de JavaScript nem diálogo do navegador em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('catálogo que não carregou: faixa com motivo e o que fazer, e o avulso continua disponível', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, PASTA_CAND, 390, { falharBoot: true });
    await page.waitForSelector('#tplPgtPop_faixaBoot .pp-faixa.erro');
    const t = await page.locator('#tplPgtPop_faixaBoot').innerText();
    assert.match(t, /O catálogo de POPs e os padrões do módulo não carregaram\./);
    assert.match(t, /Motivo: Tempo esgotado\./);
    assert.match(t, /O que fazer: recarregue a página \(F5\)/);
    assert.match(await page.locator('#tplPgtPop_catalogoPops').innerText(), /O catálogo de POPs não carregou\./);
    for (const [id, v] of [['#tplPgtPop_hospital', 'HOSPITAL MODELO FICTICIO LTDA'], ['#tplPgtPop_aprovadorNome', 'Maria Exemplo da Silva'], ['#tplPgtPop_aprovadorCargo', 'Responsável Técnico'],
      ['#tplPgtPop_elaboradoPorNome', 'João Exemplo Souza'], ['#tplPgtPop_elaboradoPorCargo', 'Engenheiro Clínico']]) await page.fill(id, v);
    await page.locator('#tplPgtPop_nav3').click();
    assert.equal(await page.isVisible('#tplPgtPop_avulsoNome'), true);
    await page.fill('#tplPgtPop_avulsoNome', 'POP de Controle de Temperatura');
    await page.getByRole('button', { name: 'Adicionar POP avulso' }).click();
    assert.equal(await page.locator('#tplPgtPop_listaAvulsos [data-avulso]').count(), 1);
    await conferirTela(page, 390, 'catálogo com erro');
    await page.locator('#tplPgtPopContainer').screenshot({ path: path.join(SAIDA, '390-catalogo-erro.png') });
    assert.deepEqual(erros, []);
  } finally { await browser.close(); }
});

// ------------------------------------------------------------------ mesmos pedidos ao servidor que a versão anterior
async function roteiroChamadas(browser, pasta) {
  const { page, erros, srv } = await abrirPagina(browser, pasta, 1366);
  await page.fill('#tplPgtPop_cnpj', '11222333000181');
  await page.evaluate(() => tplPgtPop_consultarDocumentosExistentes_());
  await page.evaluate(() => tplPgtPop_buscarCNPJ());
  await page.evaluate(() => {
    const v = { tplPgtPop_porte: 'Hospital geral de médio porte', tplPgtPop_leitos: '120', tplPgtPop_aprovadorNome: 'Maria Exemplo da Silva', tplPgtPop_aprovadorCargo: 'Responsável Técnico',
      // 14/11/2026: cargo preenchido (a base aplicava o padrão "Gestor de Engenharia Clínica" ao vazio; a versão nova recusa vazio).
      tplPgtPop_elaboradoPorNome: 'João Exemplo Souza', tplPgtPop_elaboradoPorCargo: 'Engenheiro Clínico', tplPgtPop_elaboradoPorRegistro: 'CREA-UF 000000/D', tplPgtPop_roteiroPgt: 'CME própria com duas autoclaves.' };
    Object.keys(v).forEach((id) => { document.getElementById(id).value = v[id]; });
  });
  await page.evaluate(async (b64) => {
    const arq = (n) => new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], n, { type: 'image/png' });
    await tplPgtPop_addImagensPgt_({ files: [arq('a.png'), arq('b.png')], value: '' });
    tplPgtPop_atualizarLegendaPgt_(0, 'Sala de guarda');
    ['POP001', 'POP013', 'POP022'].forEach((c) => { document.getElementById('tplPgtPop_chk_' + c).checked = true; tplPgtPop_togglePop_(c, true); });
    tplPgtPop_atualizarRoteiroPop_('POP013', 'Chamado aberto pelo setor.');
    await tplPgtPop_addImagensCatalogo_('POP022', { files: [arq('c.png')], value: '' });
    tplPgtPop_atualizarLegendaCatalogo_('POP022', 0, 'Bancada');
    document.getElementById('tplPgtPop_avulsoNome').value = 'POP de Controle de Temperatura';
    tplPgtPop_addPopAvulso();
    tplPgtPop_atualizarRoteiroAvulso_(0, 'Leitura duas vezes ao dia.');
    tplPgtPop_irParaEtapa(2); tplPgtPop_irParaEtapa(3); tplPgtPop_irParaEtapa(4);
    // 14/11/2026: o PGTS já existe para o CNPJ; a versão nova pede o motivo da rodada (a base não tem o campo).
    const motivo = document.getElementById('tplPgtPop_motivoRodada');
    if (motivo) { motivo.value = 'Inclusão da CME própria no plano.'; motivo.dispatchEvent(new Event('input', { bubbles: true })); }
  }, PNG.toString('base64'));
  await page.evaluate(() => tplPgtPop_gerarTudo());
  await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'));
  await page.evaluate(() => tplPgtPop_salvarDocumento_(2));
  const [aba] = await Promise.all([page.waitForEvent('popup'), page.evaluate(() => { tplPgtPop_abrirDocumento_(2); })]);
  await page.waitForFunction(() => window.__ordem.indexOf('PgtPop_apiDispatch:apiMontarDocumentoFinal') >= 0);
  await new Promise((r) => setTimeout(r, 200));
  await aba.close();
  await page.evaluate(() => tplPgtPop_salvarDocumento_(2));
  await page.evaluate(() => tplPgtPop_carregarListaControle_());
  await new Promise((r) => setTimeout(r, 200));
  // correção pelo SGO_DocRev
  await page.evaluate(() => SGO_DocRev.abrir('PGT_POP', 'dr1', 'CORRIGIR'));
  await page.waitForSelector('#sgoDocRevMotivo_PGT_POP');
  await page.fill('#sgoDocRevMotivo_PGT_POP', 'Correção do prazo de atendimento informado no roteiro.');
  await page.evaluate(() => tplPgtPop_gerarTudo());
  await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'));
  await new Promise((r) => setTimeout(r, 300));
  await page.close();
  return { chamadas: srv.chamadas, erros };
}

test('os pedidos ao servidor têm os mesmos nomes e os mesmos argumentos da versão anterior', { skip: (!chromium && 'Playwright indisponível') || (!fs.existsSync(PASTA_BASE) && 'sem base'), timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const base = await roteiroChamadas(browser, PASTA_BASE);
    const cand = await roteiroChamadas(browser, PASTA_CAND);
    fs.mkdirSync(SAIDA, { recursive: true });
    fs.writeFileSync(path.join(SAIDA, 'chamadas-base-x-candidato.json'), JSON.stringify({ base: base.chamadas.map((c) => c.fn), candidato: cand.chamadas.map((c) => c.fn) }, null, 1));
    assert.deepEqual(cand.erros, []);
    assert.ok(base.chamadas.length >= 12, 'o roteiro passou por todas as chamadas: ' + base.chamadas.length);
    assert.deepEqual(cand.chamadas.map((c) => c.fn), base.chamadas.map((c) => c.fn), 'mesma sequência de pedidos');
    // 14/11/2026: diferenças de propósito, e só elas: o motivo da rodada (descricaoRevisao), o título e o painel no
    // "Salvar na pasta do cliente" (pop, titulo, docRevId) e o campo novo do motivo no formulário guardado pela correção.
    const semNovos = (lista) => lista.map((c) => {
      const p = JSON.parse(JSON.stringify(c));
      if (p.payload) {
        delete p.payload.descricaoRevisao;
        if (p.fn === 'apiSalvarDocumento') { delete p.payload.pop; delete p.payload.titulo; delete p.payload.docRevId; }
        if (p.payload._docRev && p.payload._docRev.form) delete p.payload._docRev.form.tplPgtPop_motivoRodada;
        // 14/11/2026 (fichas técnicas, de propósito): respostas do estabelecimento no hospital e nos campos guardados pela
        // correção, POPs do conjunto também no pedido do POP e os nomes novos do catálogo (o código não muda).
        if (p.payload.hospital) delete p.payload.hospital.respostas;
        if (p.fn === 'apiGerarDocumento' && p.payload.tipo === 'POP') delete p.payload.popsRelacionados;
        if (p.payload._docRev && p.payload._docRev.form) Object.keys(p.payload._docRev.form).forEach((k) => { if (/^tplPgtPop_q_/.test(k)) delete p.payload._docRev.form[k]; });
        const semNome = (x) => { if (x && x.codigo) delete x.nome; };
        semNome(p.payload.pop);
        if (p.fn === 'apiMontarDocumentoFinal' && p.payload.pop && p.payload.pop.codigo) delete p.payload.titulo;
        (p.payload.popsRelacionados || []).forEach(semNome);
      }
      return p;
    });
    assert.ok(cand.chamadas.filter((c) => c.fn === 'apiGerarDocumento' && !(c.payload._docRev && c.payload._docRev.modo)).every((c) => c.payload.descricaoRevisao === 'Inclusão da CME própria no plano.'), 'o motivo da rodada vai em todos os documentos');
    assert.deepEqual(semNovos(cand.chamadas), semNovos(base.chamadas), 'mesmos argumentos (sessão, fn e payload, inclusive o _docRev da correção)');
    const fns = new Set(base.chamadas.map((c) => c.fn));
    for (const f of ['apiListarArquivosPdf', 'apiListarDocumentos', 'apiConsultarCnpj', 'apiGerarDocumento', 'apiMontarDocumentoFinal', 'apiSalvarDocumento']) assert.ok(fns.has(f), f);
    assert.ok(base.chamadas.some((c) => c.payload && c.payload._docRev && c.payload._docRev.modo === 'CORRIGIR'));
  } finally { await browser.close(); }
});
