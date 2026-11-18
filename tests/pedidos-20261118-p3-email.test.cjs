'use strict';
// 18/11/2026 (pacote 3, item 11, pedido do Matheus): "ao clicar para ver um e-mail recebido, a página de leitura seja mais nítida, ela fica
// muito pequena só na lateral esquerda; ao criar ou responder um e-mail novo, a página de e-mail fique maior; que dentro do campo tenha mais
// funções: cor de destaque do texto, fontes e tamanho da fonte, cor da fonte; ao anexar o arquivo, que ele fique nítido, próximo ao assunto
// do e-mail, e não na parte de baixo; a opção de anexar fica acima, próxima à aba de assuntos."
// Confere: leitura na área principal (pastas saem, lista estreita) e "Tela cheia" (só a mensagem, com Voltar), no celular a tela toda; janela
// de escrever larga com "Maximizar"; fonte, tamanho, cor da fonte e cor de destaque gerando HTML com style em linha; HTML seguro antes de
// ir ao servidor; "Anexar" ao lado do assunto e os anexos logo abaixo dele, com nome, tamanho e Remover. Sem rolagem lateral nem erro de JS.
// Só dados de teste. Capturas em output/pedidos-20261118/p3/capturas (ou CAPTURAS_P3).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, ler, copia } = require('./_p3_email_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_P3 || path.join(__dirname, '../output/pedidos-20261118/p3/capturas');

function telaVm() {
  const html = ler('JS_Email.html');
  const ctx = vm.createContext({ console, window: {}, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: { appendChild() {} } },
    setTimeout, clearTimeout, USER_CONTEXT: { perfil: 'TECNICO' }, google: { script: { run: {} } }, escapeHtml_: (v) => String(v || '') });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), ctx, { filename: 'JS_Email.html' });
  return ctx;
}

test('CSS seguro: fica a aparência (cor, destaque, fonte, tamanho); saem url() externo, expression, javascript: e posição', () => {
  const ctx = telaVm();
  assert.equal(ctx.Email_cssSeguro_('color: rgb(192, 0, 0); background-color: rgb(255, 255, 0); font-family: Georgia, serif; font-size: 18px'),
    'color: rgb(192, 0, 0); background-color: rgb(255, 255, 0); font-family: Georgia, serif; font-size: 18px');
  assert.equal(ctx.Email_cssSeguro_('position: fixed; top: 0; color: red'), 'color: red');
  assert.equal(ctx.Email_cssSeguro_('background: url(https://rastreio.exemplo.test/p.gif); color: blue'), 'color: blue');
  assert.equal(ctx.Email_cssSeguro_('width: expression(alert(1)); font-weight: bold'), 'font-weight: bold');
  assert.equal(ctx.Email_cssSeguro_('background-image: url(data:image/png;base64,AAAA)'), '', 'background-image fora da lista');
  // sem DOMParser (ambiente sem navegador): o mínimo sai mesmo assim
  assert.equal(ctx.Email_htmlSeguro_('<p onclick="x()">a</p><script>alert(1)</script>'), '<p>a</p>');
});

test('tela: ajuda, manual e textos do pacote 3 (leitura, janela maior, formatação, anexos); trava com o quê, por quê e o que fazer', () => {
  const tela = ler('JS_Email.html'), ajuda = ler('SGO_Ajuda_Email.js');
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_EMAIL.md'), 'utf8');
  for (const t of ['Ler a mensagem em tela larga ou cheia', 'Escrever em janela grande', 'Fonte, tamanho e cores do texto', 'Anexos logo abaixo do assunto'])
    assert.ok(ajuda.includes("titulo: '" + t + "'"), 'ajuda: ' + t);
  assert.match(manual, /## 6D\. Leitura, janela de escrever, formatação e anexos \(18\/11\/2026\)/);
  assert.match(tela, /onchange="Email_fonte_\(this\.value\); this\.value=\\'\\'"/);
  assert.match(tela, /id="emCorDestaque" value="#ffff00" aria-label="Cor de destaque"/);
  // os avisos de limite de anexo continuam dizendo o que fazer
  assert.match(tela, /o limite por arquivo é .* Compacte, divida em partes ou mande um link de compartilhamento/);
  assert.doesNotMatch(tela, /antiburro/i);
});

// ---------------- página completa ----------------
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function abrirPagina(browser, a, largura) {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const celular = largura < 500;
  const page = await browser.newPage(Object.assign({ viewport: { width: largura, height: celular ? 844 : 900 } }, celular ? { isMobile: true, hasTouch: true } : {}));
  const erros = [], dialogos = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_ana' }, a.sessoes.s_ana) } };
    if (/^Email_api/.test(fn) && typeof a.ctx[fn] === 'function') return { ok: true, valor: copia(a.ctx[fn].apply(null, args)) };
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_ana'); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.evaluate(() => { abrir('email'); });
  await page.waitForFunction(() => document.querySelectorAll('#emLista .em-item').length > 0, null, { timeout: 15000 });
  return { page, erros, dialogos };
}
/** Mensagem 30 com texto longo e dois anexos, para a leitura. */
function comMensagemRica(a) {
  const chamar = a.srv.SGO_EMAIL.chamar;
  a.srv.SGO_EMAIL.chamar = (acao, usuario, dados) => {
    const r = chamar(acao, usuario, dados);
    if (acao === 'ler' && Number(dados.uid) === 30) {
      r.html = '<p>Prezada Ana,</p><p>Segue a <b>proposta revisada</b> da qualificação da autoclave, com o cronograma das visitas de dezembro e a lista dos instrumentos que serão usados.</p>' +
        '<p>Peço que confira os valores do item 3 e a data da segunda visita. Se estiver tudo certo, basta responder este e-mail com o aceite.</p><p>Atenciosamente,<br>Remetente 30</p>';
      r.anexos = [{ parte: '2', nome: 'Proposta-revisada.pdf', tamanho: 482133, tipo: 'application/pdf' }, { parte: '3', nome: 'Cronograma-dezembro.xlsx', tamanho: 38211, tipo: 'application/vnd.ms-excel' }];
    }
    return r;
  };
}
const caixa = (page, sel) => page.locator(sel).first().boundingBox();

test('1366 px: leitura na área principal e em tela cheia; janela de escrever grande e maximizada; formatação; anexos abaixo do assunto; HTML seguro no envio',
  { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const a = ambiente();
  comMensagemRica(a);
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 1366);
    const antes = await caixa(page, '.em-col-leitor');
    await page.locator('#emLista .em-item[data-uid="30"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 30);
    await page.waitForTimeout(400);
    const larga = await caixa(page, '.em-col-leitor');
    assert.ok(larga.width > antes.width + 150, 'a leitura ganha a largura das pastas: ' + antes.width + ' -> ' + larga.width);
    assert.equal(await page.locator('.em-col-pastas').isVisible(), false, 'pastas saem durante a leitura');
    assert.equal(await page.locator('.em-col-lista').isVisible(), true, 'lista estreita continua ao lado');
    assert.ok(await page.locator('#emLeitor .em-voltar').isVisible(), 'Voltar à lista à vista no computador');
    assert.equal(await page.locator('#emLeitor h3').evaluate((h) => getComputedStyle(h).fontSize), '19px');
    assert.equal(await page.locator('#emLeitor .em-anexo').count(), 2);
    await page.screenshot({ path: path.join(saida, '1366-email-leitura.png'), fullPage: true });
    // Tela cheia: só a mensagem
    await page.locator('#emBtnLeitura').click();
    await page.waitForFunction(() => document.getElementById('emGrade').classList.contains('cheia'));
    assert.equal(await page.locator('.em-col-lista').isVisible(), false);
    const cheia = await caixa(page, '.em-col-leitor');
    const grade = await caixa(page, '#emGrade');
    assert.ok(cheia.width >= grade.width - 2, 'leitura ocupa a área toda');
    assert.match(await page.locator('#emBtnLeitura').innerText(), /Mostrar a lista/);
    await page.screenshot({ path: path.join(saida, '1366-email-leitura-tela-cheia.png'), fullPage: true });
    // a escolha fica guardada; Voltar à lista devolve pastas e lista
    await page.locator('#emLeitor .em-voltar').click();
    assert.equal(await page.locator('.em-col-pastas').isVisible(), true);
    assert.equal(await page.locator('.em-col-lista').isVisible(), true);
    await page.locator('#emLista .em-item[data-uid="29"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 29 && document.getElementById('emGrade').classList.contains('cheia'));
    await page.locator('#emBtnLeitura').click();
    await page.waitForFunction(() => !document.getElementById('emGrade').classList.contains('cheia'));
    await page.locator('#emLeitor .em-voltar').click();

    // responder a mensagem 30: janela grande
    await page.locator('#emLista .em-item[data-uid="30"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 30);
    await page.locator('#emLeitor button', { hasText: /^\s*Responder$/ }).click();
    await page.locator('#emEditor').waitFor();
    const jan = await caixa(page, '.em-janela.em-comp');
    assert.ok(jan.width >= 1080, 'janela de escrever larga: ' + jan.width);
    assert.ok((await caixa(page, '#emEditor')).height >= 318, 'área de texto alta');
    // anexar: o botão fica na linha do assunto; os anexos aparecem logo abaixo do assunto, antes da barra e do texto
    const assunto = await caixa(page, '#emAssunto'), botaoAnexar = await caixa(page, '.em-assunto-linha .em-botao-arquivo');
    assert.ok(Math.abs(botaoAnexar.y + botaoAnexar.height / 2 - (assunto.y + assunto.height / 2)) < 6, 'Anexar na mesma linha do assunto');
    await page.setInputFiles('#emArquivo', [{ name: 'Laudo-autoclave.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(245760, 32) },
      { name: 'Fotos da visita.zip', mimeType: 'application/zip', buffer: Buffer.alloc(51200, 1) }]);
    await page.waitForFunction(() => document.querySelectorAll('#emAnexosComp .em-anexo-chip:not(.orig)').length === 2, null, { timeout: 5000 });
    const chip = await caixa(page, '#emAnexosComp .em-anexo-chip:not(.orig)');
    const barra = await caixa(page, '.em-barra');
    assert.ok(chip.y > assunto.y && chip.y < barra.y, 'anexo entre o assunto e a barra de formatação');
    const textoChip = await page.locator('#emAnexosComp .em-anexo-chip:not(.orig)').first().innerText();
    assert.match(textoChip, /Laudo-autoclave\.pdf[\s\S]*240 KB[\s\S]*Remover/);
    assert.equal(await page.locator('#emAnexosComp .em-anexo-chip.orig').count(), 2, 'anexos da original (responder: desmarcados, como no Outlook)');
    // formatação: fonte, tamanho, cor da fonte e cor de destaque
    await page.evaluate(() => {
      const ed = document.getElementById('emEditor');
      ed.innerHTML = '<p id="t1">Prazo da segunda visita confirmado.</p><p>Texto normal.</p>' + ed.innerHTML;
      ed.focus();
      const r = document.createRange(); r.selectNodeContents(document.getElementById('t1'));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await page.waitForTimeout(50);
    await page.selectOption('#emFonte', '3');                     // Georgia
    await page.selectOption('#emTamanho', '18');
    await page.evaluate(() => { const i = document.getElementById('emCorFonte'); i.value = '#c00000'; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.evaluate(() => { const i = document.getElementById('emCorDestaque'); i.value = '#ffff00'; i.dispatchEvent(new Event('change', { bubbles: true })); });
    const fmt = await page.evaluate(() => { const t = document.getElementById('t1'), el = t.querySelector('span span, span') || t; const st = (x) => getComputedStyle(x); const fundo = (x) => { while (x && x !== t.parentNode) { const b = st(x).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)') return b; x = x.parentNode; } return ''; };
      const folha = (function achar(n) { return n.nodeType === 3 && n.textContent.trim() ? n.parentNode : Array.prototype.map.call(n.childNodes, achar).filter(Boolean)[0]; })(t);
      return { familia: st(folha).fontFamily, tamanho: st(folha).fontSize, cor: st(folha).color, destaque: fundo(folha), html: t.innerHTML }; });
    assert.match(fmt.familia, /Georgia/, fmt.html);
    assert.equal(fmt.tamanho, '18px', fmt.html);
    assert.equal(fmt.cor, 'rgb(192, 0, 0)', fmt.html);
    assert.equal(fmt.destaque, 'rgb(255, 255, 0)', fmt.html);
    assert.doesNotMatch(fmt.html, /<font/i, 'tamanho em px, sem <font size>');
    await page.screenshot({ path: path.join(saida, '1366-email-responder-anexos-formatacao.png') });
    // Remover tira o anexo
    await page.locator('#emAnexosComp .em-anexo-chip:not(.orig)', { hasText: 'Fotos da visita.zip' }).locator('button', { hasText: 'Remover' }).click();
    assert.equal(await page.locator('#emAnexosComp .em-anexo-chip:not(.orig)').count(), 1);
    // Maximizar: a janela ocupa a tela toda; a escolha fica guardada
    await page.locator('#emBtnMax').click();
    assert.ok(await page.evaluate(() => document.getElementById('emOverlay').classList.contains('em-max')));
    const max = await caixa(page, '.em-janela.em-comp');
    assert.ok(max.width >= 1366 - 20, 'maximizada: ' + max.width);
    assert.match(await page.locator('#emBtnMax').innerText(), /Restaurar/);
    fs.writeFileSync(path.join(saida, 'medidas-email-1366.json'), JSON.stringify({ leituraAntes: Math.round(antes.width), leituraAmpla: Math.round(larga.width), leituraTelaCheia: Math.round(cheia.width), janelaEscrever: Math.round(jan.width), janelaMaximizada: Math.round(max.width) }, null, 1));
    await page.screenshot({ path: path.join(saida, '1366-email-maximizada.png') });
    // HTML seguro: o que foi colado com script, evento e link perigoso sai; a formatação fica
    await page.evaluate(() => { document.getElementById('emEditor').insertAdjacentHTML('beforeend', '<p>colado<img src="x" onerror="alert(1)"><script>alert(2)<\/script><a href="javascript:alert(3)">link</a><span style="position:fixed;color:#0000ff">azul</span></p>'); });
    const limpo = await page.evaluate(() => Email_dadosComp_().html);
    assert.doesNotMatch(limpo, /onerror|<script|javascript:|position/i);
    assert.match(limpo, /font-size: 18px/);
    assert.match(limpo, /color: rgb\(0, 0, 255\)|color: #0000ff/i);
    // enviar: o servidor recebe o HTML formatado e seguro, com o anexo
    await page.locator('#emBtnEnviar').click();
    await page.waitForFunction(() => !document.getElementById('emOverlay'), null, { timeout: 5000 });
    const env = a.srv.st.enviados.at(-1);
    assert.match(env.html, /font-family: Georgia/);
    assert.match(env.html, /background-color: rgb\(255, 255, 0\)/);
    assert.doesNotMatch(env.html, /onerror|<script/i);
    assert.deepEqual(env.anexos.map((x) => x.nome), ['Laudo-autoclave.pdf']);
    assert.ok(await semRolagem(page));
    assert.deepEqual(erros, []);
    // a próxima janela de escrever já abre maximizada (escolha guardada no navegador); Restaurar volta
    await page.evaluate(() => Email_escrever_({}));
    await page.locator('#emEditor').waitFor();
    assert.ok(await page.evaluate(() => document.getElementById('emOverlay').classList.contains('em-max')));
    await page.locator('#emBtnMax').click();
    assert.ok(!(await page.evaluate(() => document.getElementById('emOverlay').classList.contains('em-max'))));
    await page.evaluate(() => { EM.comp.sujo = false; Email_descartar_(); });
    await page.close();
  } finally { await browser.close(); }
});

test('390 px (celular): leitura na tela toda com Voltar; escrever com Anexar no assunto, anexos à vista e barra de formatação sem rolagem lateral',
  { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const a = ambiente();
  comMensagemRica(a);
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 390);
    await page.locator('#emLista .em-item[data-uid="30"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 30);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.em-col-lista').isVisible(), false, 'no celular a leitura é a tela toda');
    assert.equal(await page.locator('#emBtnLeitura').isVisible(), false, '"Tela cheia" só no computador');
    const leitor = await caixa(page, '.em-col-leitor');
    assert.ok(leitor.width >= 350, 'leitura ocupa a largura: ' + leitor.width);
    assert.ok(await semRolagem(page));
    await page.screenshot({ path: path.join(saida, '390-email-leitura.png') });
    await page.locator('#emLeitor button', { hasText: /^\s*Responder$/ }).click();
    await page.locator('#emEditor').waitFor();
    await page.setInputFiles('#emArquivo', [{ name: 'Relatório da visita técnica com nome comprido.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(130000, 32) }]);
    await page.waitForFunction(() => document.querySelectorAll('#emAnexosComp .em-anexo-chip:not(.orig)').length === 1, null, { timeout: 5000 });
    const assunto = await caixa(page, '#emAssunto'), chip = await caixa(page, '#emAnexosComp .em-anexo-chip:not(.orig)'), ed = await caixa(page, '#emEditor');
    assert.ok(chip.y > assunto.y && chip.y < ed.y, 'anexo logo abaixo do assunto, antes do texto');
    assert.ok(chip.x >= 0 && chip.x + chip.width <= 391, 'anexo cabe na tela');
    const barra = await caixa(page, '.em-barra');
    assert.ok(barra.x >= 0 && barra.x + barra.width <= 391, 'barra de formatação cabe na tela');
    assert.ok(await semRolagem(page), 'janela de escrever sem rolagem lateral');
    await page.evaluate(() => document.getElementById('emAssunto').scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(saida, '390-email-responder-anexo.png') });
    await page.evaluate(() => { EM.comp.sujo = false; Email_descartar_(); });
    assert.deepEqual(erros, []);
    await page.close();
  } finally { await browser.close(); }
});
