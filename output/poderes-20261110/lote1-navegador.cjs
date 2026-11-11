// Conferência no navegador do LOTE 1 (Contas, senhas e acessos) na PÁGINA COMPLETA (Index.html com todos os include()
// resolvidos, como o servidor monta). O google.script.run da página fala com o ambiente de teste (tests/_poderes_ambiente.cjs
// com SGO_Usuarios.js, SGO_SegurancaAcesso.js, SGO_Areas.js e SGO_ModoPersonalizado.js reais); funções que não existem no
// ensaio respondem "indisponível". Sem rede.
// Uso: FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs output/poderes-20261110/lote1-navegador.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const raiz = path.resolve(__dirname, '../..');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/venda/AppData/Local/Temp/claude/b22c3c2c767b0e1f/b760404d-992d-45e4-81c0-9f25b85efac9/scratchpad/pw/node_modules/playwright-core');
const { ambiente } = require(path.join(raiz, 'tests/_poderes_ambiente.cjs'));
const pastaLegado = path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const saida = path.join(__dirname, 'lote1-telas');
fs.mkdirSync(saida, { recursive: true });
const exe = process.env.CHROMIUM || path.join(process.env.LOCALAPPDATA || 'C:/Users/venda/AppData/Local', 'ms-playwright/chromium-1248/chrome-win64/chrome.exe');
const paginaCompleta = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html'));

function amb() {
  const a = ambiente({ extras: ['SGO_Clientes.js', 'SGO_Usuarios.js', 'SGO_ModoPersonalizado.js'] });
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, normal, payload, campos) => { const o = Object.assign({}, normal); campos.forEach((c) => { o[c] = Object.prototype.hasOwnProperty.call(payload || {}, c) ? normal[c] : atual[c]; }); return o; };
  a.ctx.SGO_DATA.log = () => {};
  return a;
}
const exc = (a, login, mud) => { const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: 'Conferência do lote 1', mudancas: mud }); assert.ok(r.ok, JSON.stringify(r)); a.limparMemo(); };

async function abrir(browser, a, login, largura) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => d.accept());
  const html = paginaCompleta();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
    if (/^(usuarios|areas|Poderes_api|SegAcesso_api|SGO_MP_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
      try { return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args))) }; } catch (e) { return { ok: false, erro: String(e.message) }; }
    }
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript((sid) => {
    try { sessionStorage.setItem('SGO_SESSION', sid); } catch (e) {}
    const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, 's_' + login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 }); } catch (e) { throw new Error('a página não entrou: ' + erros.slice(0, 5).join(' | ')); }
  await page.waitForFunction(() => typeof SGO_MEUS_PODERES !== 'undefined' && SGO_MEUS_PODERES, null, { timeout: 10000 });
  await page.waitForTimeout(200);
  return { page, erros };
}
const menuUsuarios = (page) => page.evaluate(() => document.getElementById('menu-btn-usuarios').style.display !== 'none');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const checks = [];
  try {
    const a = amb();
    exc(a, 'joaopedro', [{ codigo: 'CONTAS_VER', valor: 'SIM' }, { codigo: 'CONTAS_ALTERAR_OUTROS', valor: 'SIM' }]);
    exc(a, 'elisa', [{ codigo: 'CONTAS_VER', valor: 'NAO' }]);
    exc(a, 'ricardo', [{ codigo: 'CONTAS_REDEFINIR_SENHA', valor: 'NAO' }, { codigo: 'CONTAS_INATIVAR', valor: 'NAO' }, { codigo: 'CONTAS_CRIAR', valor: 'NAO' }]);

    // 1. gestor sem exceção (charles, Diretoria): menu, Novo usuário e Áreas como antes
    {
      const { page } = await abrir(browser, a, 'charles', 1280);
      assert.equal(await menuUsuarios(page), true);
      await page.evaluate(() => abrir('usuarios'));
      await page.locator('#cadxAcao_usuarios').waitFor();
      await page.waitForFunction(() => CADUI.telas.usuarios && CADUI.telas.usuarios.carregado);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#cadxAcao_usuarios').isVisible(), true);
      assert.equal(await page.locator('#usrBtnAreas').isVisible(), true);
      checks.push('charles (Diretoria, sem exceção): menu Usuários, "Novo usuário" e "Áreas" visíveis, como antes');
      await page.close();
    }
    // 2. técnico com exceção SIM (ver + alterar dados): vê o menu, a lista e Editar; não vê Novo usuário nem Áreas; senha e inativar apagados com o motivo
    {
      const { page, erros } = await abrir(browser, a, 'joaopedro', 1280);
      assert.equal(await menuUsuarios(page), true, 'menu Usuários pela caixa');
      await page.evaluate(() => abrir('usuarios'));
      await page.waitForFunction(() => CADUI.telas.usuarios && CADUI.telas.usuarios.carregado);
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#cadxAcao_usuarios').isVisible(), false, 'sem Novo usuário');
      assert.equal(await page.locator('#usrBtnAreas').isVisible(), false, 'sem Áreas');
      const r = await page.evaluate(() => {
        const its = CADUI.telas.usuarios.itens;
        const g = its.find((u) => u.NOME === 'GABRIELDIAS'), adm = its.find((u) => u.PERFIL === 'ADMIN');
        const m = Usuarios_menu_(g).filter((x) => x !== '-');
        return { editarG: g.PODE_ALTERAR, editarAdm: adm.PODE_ALTERAR, link: m.find((x) => /link/.test(x.texto)), inativar: m.find((x) => /Inativar/.test(x.texto)) };
      });
      assert.equal(r.editarG, true); assert.equal(r.editarAdm, false);
      assert.equal(r.link.desabilitado, true); assert.match(r.link.nota, /Você não tem a caixa «Redefinir senha de outra pessoa»/);
      assert.equal(r.inativar.desabilitado, true); assert.match(r.inativar.nota, /«Inativar e reativar conta»/);
      await page.screenshot({ path: path.join(saida, 'tecnico-com-caixa-usuarios.png') });
      assert.equal(erros.length, 0, erros.join(' | '));
      checks.push('joaopedro (Técnico + exceção SIM ver/alterar): menu e lista; Editar em conta comum e não na do Administrador; sem "Novo usuário" e "Áreas"; link de senha e inativar apagados com "Você não tem a caixa «...»"');
      await page.close();
    }
    // 3. gestor com exceção NÃO na lista: menu some; abrir direto mostra o aviso; o servidor recusa
    {
      const { page } = await abrir(browser, a, 'elisa', 1280);
      assert.equal(await menuUsuarios(page), false);
      await page.evaluate(() => abrir('usuarios'));
      await page.getByText('A gestão de usuários é feita pelos perfis').waitFor();
      const r = a.ctx.usuariosListar('s_elisa');
      assert.equal(r.success, false); assert.match(r.message, /«Ver a lista de contas»/);
      checks.push('elisa (Gestor + exceção NÃO ver): menu Usuários escondido; abrir direto mostra o aviso; o servidor recusa com a caixa');
      await page.close();
    }
    // 4. gestor sem criar/senha/inativar: lista e Editar, sem Novo usuário; Mais ações com os motivos; celular 390 px sem rolagem lateral
    {
      const { page } = await abrir(browser, a, 'ricardo', 390);
      await page.evaluate(() => abrir('usuarios'));
      await page.waitForFunction(() => CADUI.telas.usuarios && CADUI.telas.usuarios.carregado);
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#cadxAcao_usuarios').isVisible(), false);
      const r = await page.evaluate(() => { const g = CADUI.telas.usuarios.itens.find((u) => u.NOME === 'GUILHERME'); return { alt: g.PODE_ALTERAR, menu: Usuarios_menu_(g).filter((x) => x !== '-').map((x) => [x.texto, !!x.desabilitado, x.nota || '']) }; });
      assert.equal(r.alt, true);
      assert.ok(r.menu.some((x) => /Inativar/.test(x[0]) && x[1] && /caixa/.test(x[2])), JSON.stringify(r.menu));
      const larg = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(larg <= 392, 'rolagem lateral: ' + larg);
      await page.screenshot({ path: path.join(saida, 'celular-gestor-sem-caixas.png') });
      checks.push('ricardo (Gestor + exceção NÃO criar/senha/inativar), celular 390 px: sem "Novo usuário", Editar mantido, Inativar apagado com o motivo, sem rolagem lateral');
      await page.close();
    }
    // 5. comercial sem exceção: como antes, sem o menu
    {
      const { page } = await abrir(browser, a, 'monica', 1280);
      assert.equal(await menuUsuarios(page), false);
      checks.push('monica (Comercial, sem exceção): menu Usuários escondido, como antes');
      await page.close();
    }
  } finally { await browser.close(); }
  const txt = 'Conferência no navegador — lote 1 (página completa, ' + new Date().toISOString() + ')\n' + checks.map((c) => '  OK ' + c).join('\n') + '\n';
  fs.writeFileSync(path.join(__dirname, 'lote1-navegador.txt'), txt);
  console.log(txt);
})().catch((e) => { console.error('FALHOU:', e && e.stack || e); process.exit(1); });
