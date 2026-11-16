// Secadora de traqueias (caso real de 11/11/2026, técnico Bento): fluxo completo NA PÁGINA COMPLETA (Index.html com todos os
// include() resolvidos, como o servidor monta), no navegador. O google.script.run fala com o ambiente de teste da Estufa
// (tests/_estufa_ambiente.cjs): EstufaBanhoRel_apiDispatch e EstufaOficial_apiDispatch rodam o código real do módulo;
// as demais funções respondem "indisponível". Sem rede, só dados de teste.
// Uso: DEST=<pasta legado> node --require output/secadora-20261111/fontes.cjs tests/secadora-ensaio-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const E = require('./_estufa_ambiente.cjs');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright');
const exe = process.env.CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pasta = E.MO.A.BASE;
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
const saida = process.env.SAIDA_TELAS || '';

function paginaCompleta() { return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')); }

function ambiente() {
  const env = E.criarAmbiente();
  env.run('SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eqS", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "SECADORA DE TRAQUEIAS", FABRICANTE: "MARCAFICTICIA", MODELO: "MODSEC", SERIE: "SN-SEC-0001", TAG: "SEC-TESTE-01", SETOR: "CME", STATUS: "ATIVO" });');
  env.run(ler('SGO_EstufaBanhoRel_ConteudoModulo.js'));
  env.run('SGO_DATA.insert("CAD_USUARIOS", { ID: "u_rt", NOME: "Responsável Teste", PERFIL: "GESTOR", STATUS: "ATIVO" });');
  // Série de 6 h, 4 sensores a 60 °C (dentro de 60 ± 2 °C), leitura a cada minuto.
  const serie = E.serieEstufa({ minutos: 6 * 60, n: 4, base: 60, dtSeg: 60 });
  return { env, serie };
}

async function abrir(browser, env, sid) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const erros = [], chamadas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => d.accept());
  page.on('popup', (p) => p.close().catch(() => {}));
  const html = paginaCompleta();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  const sessoes = JSON.parse(JSON.stringify(env.run('SESSOES_TESTE')));
  await page.exposeFunction('qaRun', (fn, args) => {
    try {
      if (fn === 'getPublicConfig') return { ok: true, valor: { motores: { ESTUFA_BANHOMARIA: 'nativo' } } };
      if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: sid, modulos: [] }, sessoes[sid]) } };
      if (fn === 'EstufaBanhoRel_obterConteudoModulo') return { ok: true, valor: env.fn('EstufaBanhoRel_obterConteudoModulo')() };
      if (fn === 'EstufaBanhoRel_apiDispatch' || fn === 'EstufaOficial_apiDispatch') {
        const req = Object.assign({}, args[0], { sessionId: sid });
        chamadas.push(fn + ':' + req.fn);
        return { ok: true, valor: JSON.parse(JSON.stringify(env.fn(fn)(req))) };
      }
      return { ok: false, erro: 'indisponível no ensaio: ' + fn };
    } catch (e) { return { ok: false, erro: String(e && e.message || e) }; }
  });
  await page.addInitScript((s) => {
    try { sessionStorage.setItem('SGO_SESSION', s); localStorage.setItem('SGO_SESSION', s); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), JSON.parse(JSON.stringify(args))).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
    window.SGO_getSessionId = () => s;
  }, sid);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => abrir('estufa_banhomaria'));
  try { await page.locator('#tplEstufaBanhoRel_btnRascunhoCertificado').waitFor({ state: 'attached', timeout: 20000 }); }
  catch (e) { throw new Error('o módulo não abriu: ' + erros.slice(0, 5).join(' | ') + ' | ' + (await page.evaluate(() => { const c = document.getElementById('tplEstufaBanhoRel_container') || document.getElementById('tplEstufaBanhoRelContainer'); return (c ? c.innerText : 'sem container (mod=' + window.SGO_MODULO_ATUAL + ', tplFn=' + typeof renderTplEstufaBanhoRel_ + '): ' + (document.getElementById('conteudo') || document.body).innerHTML.slice(0, 1500)) + ' | perfil=' + (typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT ? USER_CONTEXT.perfil : '?'); })).slice(0, 600)); }
  await page.waitForTimeout(600);
  return { page, erros, chamadas };
}

/** Escolhe cliente → unidade → equipamento no seletor do cadastro (JS_QualifVinculo: busca do cliente e três listas). */
async function escolherEquipamento(page, eqId) {
  const px = '#tplEstufaBanhoRelV';
  await page.locator(px + 'Busca').waitFor({ timeout: 15000 });
  await page.fill(px + 'Busca', 'HOSPITAL');
  await page.press(px + 'Busca', 'Enter');
  for (const [sufixo, val] of [['Cliente', 'cli1'], ['Unidade', 'uni1'], ['Equip', eqId]]) {
    await page.waitForFunction(([sel, v]) => { const s = document.querySelector(sel); return s && Array.from(s.options).some((o) => o.value === v); }, [px + sufixo, val], { timeout: 15000 });
    await setv(page, px + sufixo, val);
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => document.getElementById('tplEstufaBanhoRel_tagEquipamento').value !== '', null, { timeout: 15000 });
}

/** Valor no campo com os eventos que a tela escuta (input e change), como o operador digitando. */
async function setv(page, sel, valor) {
  await page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) throw new Error('campo não encontrado: ' + s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, valor]);
}

const isoLocal = (d) => { const p = (v) => String(v).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };

async function preencherSecadora(page, serie) {
  await setv(page, '#tplEstufaBanhoRel_perfil', 'SECADORA_TRAQUEIAS');
  await page.waitForTimeout(300);
  await setv(page, '#tplEstufaBanhoRel_secTrabalho', '60');
  await setv(page, '#tplEstufaBanhoRel_tolerancia', '2');
  await setv(page, '#tplEstufaBanhoRel_qSetpoint', '60');
  await setv(page, '#tplEstufaBanhoRel_qResolucao', '0,1');
  await setv(page, '#tplEstufaBanhoRel_responsavelTecnico', 'Técnico Teste');
  const t0 = serie.linhas[0].d.getTime();
  let h = 0;
  for (const cond of ['vazio', 'carga']) for (let i = 1; i <= 3; i++) {
    await setv(page, '#eb-sec-' + cond + '-' + i + '-inicio', isoLocal(new Date(t0 + h * 3600000)));
    await setv(page, '#eb-sec-' + cond + '-' + i + '-duracao', '50');
    h++;
  }
  // Sensores: 4 instalados, todos marcados.
  await setv(page, '#tplEstufaBanhoRel_nSensores', '4');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelectorAll('#tplEstufaBanhoRel_sensoresGrid input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); }));
  await setv(page, '#tplEstufaBanhoRel_dateStyle', 'BR');
  await setv(page, '#tplEstufaBanhoRel_modoEntrada', 'COLAR');
  await setv(page, '#tplEstufaBanhoRel_textoColado', serie.texto);
  await setv(page, '#tplEstufaBanhoRel_certDataLogger', 'DTL-T1');
}

async function texto(page, sel) { return (await page.locator(sel).innerText()).replace(/\s+/g, ' '); }

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const resultados = [];
  const passo = async (nome, f) => { try { await f(); resultados.push('ok   ' + nome); } catch (e) { resultados.push('FALHA ' + nome + ' :: ' + String(e && e.message || e).slice(0, 900)); } };
  try {
    const { env, serie } = ambiente();
    // 1) Técnico (Bento é TECNICO): rascunho do relatório de ensaio e envio para aprovação.
    const tec = await abrir(browser, env, 'tec');
    await passo('técnico: escolhe a secadora do cadastro', () => escolherEquipamento(tec.page, 'eqS'));
    await passo('técnico: preenche a secadora (6 estudos, 60 ± 2 °C, dados colados)', () => preencherSecadora(tec.page, serie));
    await passo('técnico: gera o rascunho do relatório de ensaio (seção 6)', async () => {
      await tec.page.click('#tplEstufaBanhoRel_btnRascunhoCertificado');
      await tec.page.waitForFunction(() => !document.getElementById('tplEstufaBanhoRel_certificadoRevisaoBox').classList.contains('hidden') || /alert-box error|não pode|problema/i.test(document.getElementById('tplEstufaBanhoRel_certificadoStatusArea').innerHTML), null, { timeout: 30000 });
      assert.ok(!(await tec.page.locator('#tplEstufaBanhoRel_certificadoRevisaoBox').getAttribute('class')).includes('hidden'), await texto(tec.page, '#tplEstufaBanhoRel_certificadoStatusArea'));
    });
    await passo('técnico: depois do rascunho a tela diz que nada foi gravado e qual é o próximo passo', async () => {
      const t = await texto(tec.page, '#tplEstufaBanhoRel_certificadoStatusArea');
      assert.match(t, /Próximo passo: o rascunho ainda não foi gravado nem enviado/, t);
      assert.match(t, /toque em "Enviar para aprovação"/);
    });
    await passo('técnico: a seção 8 lembra o rascunho ainda não enviado (antes: só "nenhum relatório")', async () => {
      await tec.page.evaluate(() => tplEstufaBanhoRel_qCarregarOficial_());
      await tec.page.waitForFunction(() => /ainda não o enviou para aprovação/.test(document.getElementById('tplEstufaBanhoRel_qOfEnsaios').innerText), null, { timeout: 15000 });
      if (saida) { await tec.page.locator('#tplEstufaBanhoRel_qOfEnsaios').screenshot({ path: path.join(saida, 'secadora-secao8-rascunho-nao-enviado.png') }); await tec.page.locator('#tplEstufaBanhoRel_certificadoStatusArea').screenshot({ path: path.join(saida, 'secadora-secao6-proximo-passo.png') }); }
    });
    await passo('técnico: botão "Enviar para aprovação" visível; "Emitir" escondido', async () => {
      assert.ok(await tec.page.locator('button', { hasText: 'Enviar para aprovação' }).first().isVisible());
      assert.ok(!(await tec.page.locator('#tplEstufaBanhoRel_certificadoRevisaoBox button', { hasText: 'Emitir o relatório' }).isVisible()));
    });
    await passo('técnico: envia o relatório de ensaio para aprovação', async () => {
      await tec.page.locator('#tplEstufaBanhoRel_certificadoRevisaoBox button', { hasText: 'Enviar para aprovação' }).click();
      await tec.page.waitForFunction(() => document.getElementById('tplEstufaBanhoRel_qRelatorioAcoes').innerText.trim() !== '', null, { timeout: 30000 });
      const t = await texto(tec.page, '#tplEstufaBanhoRel_qRelatorioAcoes');
      assert.match(t, /enviado para aprovação do responsável técnico \(Responsável Teste\)/, t);
      assert.equal(await tec.page.locator('#tplEstufaBanhoRel_qProximoPasso').count(), 0, 'o aviso de próximo passo sai depois do envio');
      const regs = JSON.parse(JSON.stringify(env.run('SGO_QE_listar_("ESTUFA")')));
      assert.equal(regs.length, 1, 'registro em QUALIF_EMISSOES');
      assert.equal(regs[0].STATUS, 'AGUARDANDO_APROVACAO');
      assert.equal(regs[0].EQUIPAMENTO_ID, 'eqS');
    });
    await passo('técnico: a seção 8 diz que o relatório aguarda aprovação, com o número e quem aprova', async () => {
      await tec.page.evaluate(() => tplEstufaBanhoRel_qCarregarOficial_());
      await tec.page.waitForFunction(() => /aguarda/i.test(document.getElementById('tplEstufaBanhoRel_qOfEnsaios').innerText), null, { timeout: 15000 });
      const t = await texto(tec.page, '#tplEstufaBanhoRel_qOfEnsaios');
      assert.doesNotMatch(t, /ainda não o enviou/);
      assert.match(t, /Responsável Teste/);
      assert.match(t, /REE-\d{4}-\d{5}/); assert.match(t, /responsável técnico/);
      if (saida) await tec.page.locator('#tplEstufaBanhoRel_qOfEnsaios').screenshot({ path: path.join(saida, 'secadora-secao8-aguardando.png') });
    });
    // 2) Responsável técnico: aprova e emite na seção 7.
    const rt = await abrir(browser, env, 'rt');
    await passo('responsável técnico: vê o envio em "Aguardando aprovação" e emite', async () => {
      await rt.page.waitForFunction(() => /Aprovar e emitir/.test(document.getElementById('tplEstufaBanhoRel_qAprovacoesArea').innerText), null, { timeout: 15000 });
      await rt.page.locator('#tplEstufaBanhoRel_qAprovacoesArea button', { hasText: 'Aprovar e emitir' }).click();
      await rt.page.waitForFunction(() => /Nada aguardando/.test(document.getElementById('tplEstufaBanhoRel_qAprovacoesArea').innerText), null, { timeout: 30000 });
      const regs = JSON.parse(JSON.stringify(env.run('SGO_QE_listar_("ESTUFA")')));
      assert.equal(regs[0].STATUS, 'EMITIDO'); assert.ok(regs[0].RESUMO_JSON);
    });
    // 3) Técnico: relatório de qualificação reconhece o ensaio emitido.
    await passo('técnico: seção 8 lista o relatório de ensaio emitido e o rascunho da qualificação não trava por falta de ensaio', async () => {
      await escolherEquipamento(rt.page, 'eqS').catch(() => {});
      await tec.page.evaluate(() => tplEstufaBanhoRel_qCarregarOficial_());
      await tec.page.waitForFunction(() => document.querySelectorAll('#tplEstufaBanhoRel_qOfEnsaios .eb-of-ensaio').length > 0, null, { timeout: 15000 });
      await tec.page.check('#tplEstufaBanhoRel_qOfQO');
      await tec.page.evaluate(() => { const s = document.getElementById('tplEstufaBanhoRel_qOfMotivo'); s.value = s.options[1].value; });
      await tec.page.evaluate(() => tplEstufaBanhoRel_qOficialRascunho_());
      await tec.page.waitForFunction(() => !/aguarde/.test(document.getElementById('tplEstufaBanhoRel_qOfStatus').innerText), null, { timeout: 30000 });
      const t = await texto(tec.page, '#tplEstufaBanhoRel_qOfStatus');
      assert.ok(!/relatório de ensaio/i.test(t) || /RESULTADO/.test(t), t);
      assert.match(t, /RESULTADO: APROVADO/, t);
    });
    await passo('sem erro de JavaScript na página', async () => { assert.deepEqual(tec.erros.concat(rt.erros).filter((m) => !/indisponível no ensaio/.test(m)), []); });
    resultados.push('chamadas do técnico: ' + tec.chamadas.join(', '));
  } finally { await browser.close(); }
  console.log(resultados.join('\n'));
  const falhas = resultados.filter((r) => r.startsWith('FALHA')).length;
  console.log(falhas ? 'RESULTADO: ' + falhas + ' FALHA(S)' : 'RESULTADO: PASS');
  process.exitCode = falhas ? 1 : 0;
})();
