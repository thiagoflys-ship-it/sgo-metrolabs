// Pacote 1 de 18/11/2026 — as telas alteradas na página completa do SGO+ (Index.html com os include() resolvidos), a 1366 e 390 px:
//  - Painel financeiro > Lançamentos e baixas e Aprovação de pagamentos com o período de vencimento (Wanessa);
//  - Compras > ficha da compra com o prazo do dono e da Diretoria e o aprovador delegado (antes e depois do prazo), "Pedir novo orçamento",
//    Regras de compras (quadro do aprovador delegado) e Informar compra com as duas perguntas juntas (Matheus);
//  - Comercial > proposta com o prazo do aprovador delegado e Metodologia (quadro do aprovador delegado do preço).
// Confere: sem erro de JavaScript, sem rolagem lateral, texto justificado. Capturas em output/pedidos-20261118/p1/capturas (ou CAPTURAS_P1).
// Código REAL do SGO+ com dados fictícios e o Omie simulado; nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('./_compras_ambiente.cjs');
const COM = require('./_comercial_ambiente.cjs');
const { montarB1C3, brDe } = require('./_financeiro_b1c3.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const saida = process.env.CAPTURAS_P1 || path.join(__dirname, '../output/pedidos-20261118/p1/capturas');
const ok = (r) => { assert.equal(r.ok, true, r.message || r.mensagem); return r; };
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const htmlCompleto = () => ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const justificado = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).textAlign === 'justify'; }, sel);
const AVISOS = ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js'];
const carregarAvisos = (ctx) => { for (const f of AVISOS) vm.runInContext(ler(f).replace(/\r\n/g, '\n'), ctx, { filename: f }); };

/** Abre a página completa como "login"; rota: (fn, args) => resultado | undefined (indisponível). */
async function abrirPagina(browser, largura, login, sessao, rota) {
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
  const HTML = htmlCompleto();
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, sessao) } };
    const v = rota(fn, args);
    return v === undefined ? { ok: false, erro: 'indisponível no ensaio: ' + fn } : { ok: true, valor: JSON.parse(JSON.stringify(v)) };
  });
  await page.addInitScript((lg) => {
    try { sessionStorage.setItem('SGO_SESSION', 's_' + lg); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  }, login);
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  return { page, erros };
}
const cap = (page, largura, nome) => page.screenshot({ path: path.join(saida, largura + '-' + nome + '.png'), fullPage: true });

// ------------------------------------------------------------------ cenários
function financeiro() {
  const a = montarB1C3();
  const base = Date.UTC(2026, 9, 1), lista = [];
  for (let i = 0; i < 120; i++) lista.push({ codigo_lancamento_omie: 5000 + i, numero_documento: 'DOC-' + (5000 + i), codigo_cliente_fornecedor: 90, codigo_categoria: '2.10', id_conta_corrente: 5, venc: new Date(base + (i % 92) * 864e5).toISOString().slice(0, 10), valor_documento: 100 + i * 3, status_titulo: 'EMABERTO' });
  const anterior = a.ctx.UrlFetchApp.fetch, resp = (h, j) => ({ getResponseCode: () => h, getContentText: () => JSON.stringify(j) });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (b.call === 'ListarContasPagar' || b.call === 'ListarContasReceber') {
        const hoje = '2026-11-16', l = lista.filter((t) => !p.filtrar_por_status || (p.filtrar_por_status === 'ATRASADO' ? t.venc < hoje : p.filtrar_por_status === 'VENCEHOJE' ? t.venc === hoje : t.venc > hoje));
        const tam = Number(p.registros_por_pagina) || 50, pg = Number(p.pagina) || 1, fat = l.slice((pg - 1) * tam, pg * tam).map((t) => Object.assign({}, t, { data_vencimento: brDe(t.venc), data_previsao: brDe(t.venc) }));
        if (!fat.length) return resp(500, { faultstring: 'ERROR: Não existem registros para a página [' + pg + ']!' });
        return resp(200, { pagina: pg, total_de_paginas: Math.ceil(l.length / tam), [b.call === 'ListarContasPagar' ? 'conta_pagar_cadastro' : 'conta_receber_cadastro']: fat });
      }
    }
    return anterior(url, op);
  };
  return a;
}
function compras(agora) {
  const amb = C.ambiente({ agora: agora || C.SEG_10H, props: { APROVACAO_SO_DIRETORIA: 'SIM', META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456' } });
  const us = amb.tabelas.CAD_USUARIOS, u = (id) => us.find((x) => x.ID === id);
  Object.assign(u('u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099', AREA: 'DIRETORIA' });
  u('u_dir').CELULAR = '62999990010';
  us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE' });
  amb.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
  carregarAvisos(amb.ctx);
  amb.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  amb.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  C.regrasDeTeste(amb);
  // 19/11/2026: o padrão da espera passou a 0 (tests/avisos-matheus-20261119.test.cjs); as telas do Pacote 1 ficam no cenário de 30 minutos
  const g0 = ok(amb.api('s_dora', 'regras', {})).regras;
  ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, g0, { delegado: Object.assign({}, g0.delegado, { esperaMinutos: 30 }) }), motivo: 'Espera de 30 minutos do cenário do Pacote 1' }));
  amb.fs = C.fornecedoresDeTeste(amb);
  const r = C.pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: 'Alicate amperímetro digital', quantidade: 1, unidade: 'un.' }] });
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  let q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  ['380,00', '412,50', '455,90'].forEach((p, i) => { q = ok(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: amb.fs[i].id, precos: [{ itemId: q.itens[0].id, precoUnitario: p }], prazoDias: 3 + i, validade: '2026-11-30', arquivo: C.PDF })).requisicao; });
  ok(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: q.cotacoes.sort((a, b) => a.total - b.total)[0].id }));
  amb.reqId = q.id;
  return amb;
}
const rotaCompras = (amb) => (fn, args) => (fn === 'Compras_api' ? amb.ctx.Compras_api(args[0], args[1], args[2]) : undefined);

test('telas do Pacote 1 a 1366 e 390 px: sem erro de JavaScript, sem rolagem lateral, com capturas', { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      // ---------------- 1. Painel financeiro: Lançamentos e baixas e Aprovação de pagamentos com o período
      {
        const a = financeiro();
        const { page, erros } = await abrirPagina(browser, largura, 'wanessa', a.sessoes.s_wanessa, (fn, args) => {
          if (/^(Omie|Fin|Compras_api|Poderes_api)/.test(fn) && typeof a.ctx[fn] === 'function') { vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx); return a.ctx[fn](...args) || null; }
          return undefined;
        });
        await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
        await page.evaluate(() => abrir('omie'));
        await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
        await page.evaluate(() => OmieTela_abrir_('lancamentos'));
        await page.locator('#omieOpsVencDe').waitFor({ timeout: 10000 });
        await page.selectOption('#omieOpsTipo', 'pagar');
        await page.selectOption('#omieOpsSituacao', 'AVENCER');
        await page.locator('#omieOpsVencDe').fill('01122026');
        assert.equal(await page.inputValue('#omieOpsVencDe'), '01/12/2026', 'a barra entra sozinha');
        await page.locator('#omieOpsVencAte').fill('31/12/2026');
        await page.locator('button', { hasText: 'Aplicar o período' }).first().click();
        await page.waitForFunction(() => /Período: vencimento de 01\/12\/2026 a 31\/12\/2026/.test(document.getElementById('omieOpsLista').innerText), null, { timeout: 15000 });
        const t = await page.locator('#omieOpsLista').innerText();
        assert.match(t, /\d+ título\(s\) nesta situação, total R\$/);
        assert.ok(await page.evaluate(() => Array.from(document.querySelectorAll('#omieOpsLista td[data-r="Vencimento"]')).every((td) => /\/12\/2026$/.test(td.textContent))));
        assert.ok(await page.evaluate(() => !!document.querySelector('#omieOpsVencDe').getAttribute('aria-describedby')), 'explicação embaixo do campo');
        assert.ok(await semRolagem(page), 'lançamentos: rolagem lateral em ' + largura);
        await cap(page, largura, 'financeiro-lancamentos-periodo');
        // atalho "Próximo mês" (com a data real do navegador) e "Sem período"
        await page.locator('button', { hasText: 'Próximo mês' }).first().click();
        await page.waitForFunction(() => /Período: vencimento de 01\//.test(document.getElementById('omieOpsLista').innerText), null, { timeout: 15000 });
        await page.locator('button', { hasText: 'Sem período' }).first().click();
        await page.waitForFunction(() => !/Período:/.test(document.getElementById('omieOpsLista').innerText) && document.querySelector('#omieOpsLista table, #omieOpsLista .cadx-vazio'), null, { timeout: 15000 });
        // Aprovação de pagamentos
        await page.evaluate(() => OmieTela_abrir_('pagamentos'));
        await page.locator('#finPagVencDe').waitFor({ timeout: 10000 });
        await page.locator('#finPagVencDe').fill('01/01/2027'); await page.locator('#finPagVencAte').fill('15/01/2027');
        await page.locator('.fin-pag button', { hasText: 'Aplicar o período' }).click();
        await page.waitForFunction(() => /A pagar no período \(vencimento de 01\/01\/2027 a 15\/01\/2027\)/.test(document.getElementById('finPagCorpo').innerText), null, { timeout: 15000 });
        assert.match(await page.locator('#finPagCorpo').innerText(), /Período aplicado: vencimento de 01\/01\/2027 a 15\/01\/2027/);
        assert.ok(await semRolagem(page), 'aprovação de pagamentos: rolagem lateral em ' + largura);
        await cap(page, largura, 'financeiro-aprovacao-pagamentos-periodo');
        // data inválida: mensagem, nada quebra
        await page.locator('#finPagVencDe').fill('31/02/2027');
        await page.locator('.fin-pag button', { hasText: 'Aplicar o período' }).click();
        await page.waitForFunction(() => /não é válida/.test(document.getElementById('finPagCorpo').innerText), null, { timeout: 15000 });
        assert.deepEqual(erros, [], 'erros de JavaScript (Financeiro) em ' + largura);
        await page.close();
      }
      // ---------------- 2. Compras: ficha (antes do prazo e depois), novo orçamento, regras e informar
      {
        const amb = compras();
        amb.mudar('2026-10-19T10:18:00-03:00');
        let { page, erros } = await abrirPagina(browser, largura, 'matheusgodoi', amb.sessoes.s_matheusgodoi, rotaCompras(amb));
        await page.evaluate(() => abrir('compras'));
        await page.waitForTimeout(500);
        await page.evaluate((id) => Compras_abrirFicha_(id), amb.reqId);
        await page.locator('.cp-delegado').waitFor({ timeout: 10000 });
        const f1 = await page.locator('.cp-delegado').innerText();
        assert.match(f1, /Vai até 19\/10\/2026 10:30[\s\S]*Faltam 12 min[\s\S]*MATHEUS GODOI pode decidir/);
        assert.match(await page.locator('#cpGavetaCorpo').innerText(), /O prazo do dono e da Diretoria vai até 19\/10\/2026 10:30 \(faltam 12 min\)/);
        assert.ok(await justificado(page, '.cp-delegado p'), 'texto justificado');
        assert.ok(await semRolagem(page), 'ficha antes do prazo: rolagem lateral em ' + largura);
        await cap(page, largura, 'compras-ficha-prazo-delegado');
        await page.close();
        amb.mudar('2026-10-19T10:31:00-03:00');
        ({ page, erros } = await abrirPagina(browser, largura, 'matheusgodoi', amb.sessoes.s_matheusgodoi, rotaCompras(amb)));
        await page.evaluate(() => abrir('compras'));
        await page.waitForTimeout(500);
        await page.evaluate((id) => Compras_abrirFicha_(id), amb.reqId);
        await page.locator('[data-f="novoorc"]').waitFor({ timeout: 10000 });
        assert.match(await page.locator('.cp-delegado').innerText(), /Venceu em 19\/10\/2026 10:30[\s\S]*já pode decidir/);
        assert.ok(await semRolagem(page), 'ficha depois do prazo: rolagem lateral em ' + largura);
        await cap(page, largura, 'compras-ficha-delegado-decide');
        await page.locator('[data-f="novoorc"]').click();
        await page.locator('#noForn').waitFor({ timeout: 10000 });
        await page.locator('#noTxt').fill('Pedir o mesmo alicate com entrega em 2 dias');
        assert.ok(await semRolagem(page), 'novo orçamento: rolagem lateral em ' + largura);
        await cap(page, largura, 'compras-pedir-novo-orcamento');
        assert.deepEqual(erros, [], 'erros de JavaScript (Compras, Matheus) em ' + largura);
        await page.close();
        // Regras de compras (Diretoria)
        ({ page, erros } = await abrirPagina(browser, largura, 'dora', amb.sessoes.s_dora, rotaCompras(amb)));
        await page.evaluate(() => abrir('compras_regras'));
        await page.locator('#rgDlPrazo').waitFor({ timeout: 10000 });
        assert.match(await page.locator('.cp-delegado').first().innerText(), /MATHEUS GODOI \(Aprovador delegado\): WhatsApp a qualquer hora \(celular final 0077\)/);
        await page.locator('.cp-delegado').first().scrollIntoViewIfNeeded();
        assert.ok(await semRolagem(page), 'regras: rolagem lateral em ' + largura);
        await cap(page, largura, 'compras-regras-aprovador-delegado');
        assert.deepEqual(erros, [], 'erros de JavaScript (Regras) em ' + largura);
        await page.close();
        // Informar compra com as duas perguntas juntas
        const amb2 = compras();
        ok(amb2.api('s_tiago', 'informar', { finalidade: 'Peças para a manutenção do equipamento do cliente', vinculo: { tipo: 'INTERNO', motivoInterno: 'Ferramentas da equipe de campo, reposição' }, itens: [{ descricao: 'Rolamento 6204', quantidade: 2, unidade: 'un.' }],
          fornecedorNome: 'Loja de Peças Teste', valor: '80,00', formaPagamento: 'CARTAO_CREDITO', cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-09', comprovante: { nome: 'c1.jpg', tipo: 'image/jpeg', base64: Buffer.from('c1').toString('base64') }, nfNumero: '1', recebido: true, atrasoMotivo: 'Registro antigo do ensaio' }));
        ({ page, erros } = await abrirPagina(browser, largura, 'tiago', amb2.sessoes.s_tiago, rotaCompras(amb2)));
        await page.evaluate(() => abrir('compras_informar'));
        await page.locator('#ciFin').waitFor({ timeout: 10000 });
        await page.locator('#ciFin').fill('Peças para a manutenção do equipamento do cliente');
        await page.locator('input[name="ciVinc"][value="INTERNO"]').check();
        await page.waitForTimeout(200);
        await page.evaluate(() => { const cc = document.getElementById('ciCc'); if (cc && cc.options && cc.options.length > 1) cc.selectedIndex = 1; const i = document.getElementById('ciInt'); if (i) i.value = 'Ferramentas da equipe de campo, reposição'; });
        await page.evaluate(() => { const el = document.querySelector('#ciItens input, #ciItens textarea'); if (el) { el.value = 'Rolamento 6204'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } });
        await page.locator('#ciForn').fill('Loja de Peças Teste'); await page.locator('#ciValor').fill('80,00'); await page.locator('#ciData').fill('2026-10-09');
        await page.selectOption('#ciForma', 'CARTAO_CREDITO'); await page.locator('#ciFinal').fill('4321');
        await page.locator('#ciComp').setInputFiles({ name: 'c2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('c2') });
        await page.locator('#ciNfNum').fill('2');
        await page.locator('#ciEnviar').click();
        await page.locator('.cp-pergunta').first().waitFor({ timeout: 10000 });
        await page.locator('#ciAtraso').fill('Estava em campo sem sinal, voltei hoje');
        await page.locator('#ciEnviar').click();
        await page.waitForTimeout(600);
        assert.equal(await page.inputValue('#ciAtraso'), 'Estava em campo sem sinal, voltei hoje', 'a resposta do atraso continua na tela');
        assert.equal(await page.locator('#ciDup').count(), 1, 'a pergunta da duplicidade aparece junto');
        await page.locator('#ciDup').fill('Uma é para a matriz e a outra para a filial');
        await page.locator('#ciConf').scrollIntoViewIfNeeded();
        assert.ok(await semRolagem(page), 'informar: rolagem lateral em ' + largura);
        await cap(page, largura, 'compras-informar-duas-perguntas');
        await page.locator('#ciEnviar').click();
        await page.waitForFunction(() => false, null, { timeout: 1500 }).catch(() => {});
        assert.ok(erros.some((e) => /janela do navegador: Compra REQ-2026-\d+ informada/.test(e)), 'gravou sem voltar às perguntas: ' + erros.join(' | '));
        assert.deepEqual(erros.filter((e) => !/^janela do navegador: Compra REQ-2026-\d+ informada/.test(e)), [], 'erros de JavaScript (Informar) em ' + largura);
        await page.close();
      }
      // ---------------- 3. Comercial: proposta com o prazo do aprovador delegado e o quadro na Metodologia
      {
        const a = COM.ambiente({ agora: Date.parse('2026-10-19T10:46:00-03:00'), props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_gc', 'u_mat'] } }) } });
        const us = a.tabelas.CAD_USUARIOS;
        Object.assign(us.find((x) => x.ID === 'u_adm'), { NOME: 'DONO DO SISTEMA TESTE', EMAIL: 'dono@exemplo.test', CELULAR: '62999990099' });
        us.push({ ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GODOI', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', CELULAR: '62999990077', AREA: 'QUALIDADE' });
        a.sessoes.s_matheusgodoi = { userId: 'u_mat', usuario: 'matheusgodoi', nome: 'MATHEUS GODOI', perfil: 'GESTOR' };
        carregarAvisos(a.ctx);
        a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
        // 19/11/2026: cenário do Pacote 1 (espera de 15 minutos gravada); o padrão novo (0) está em tests/avisos-matheus-20261119.test.cjs
        a.tabelas.COM_CONFIG = (a.tabelas.COM_CONFIG || []).concat([{ ID: 'cfg_del_p1', CHAVE: 'DELEGADO_PRECO', VALOR_JSON: JSON.stringify({ prazoMinutos: 15 }), VERSAO: 1, MOTIVO: 'Cenário do Pacote 1: espera de 15 minutos', ATUALIZADO_POR_ID: 'u_dir', ATUALIZADO_POR_NOME: 'DORA DIRETORA TESTE', ATUALIZADO_EM: '2026-10-19T09:00:00' }]);
        a.tabelas.COM_PRODUTOS = [{ ID: 'prod_bat', CODIGO: 'BAT-01', NOME: 'Bateria estacionária de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un', PRECO: 2100, CUSTO: 900, ATIVO: 'SIM', PRECO_PEDIDO_SITUACAO: 'PENDENTE', PRECO_PEDIDO: 2100, PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T09:00', CRIADO_EM: '2026-10-19T12:00:00.000Z' }];
        const { oportunidade, contato } = COM.oportunidadeDeTeste(a);
        const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
        ok(a.api('s_vera', 'salvarProposta', { id, deslocamento: COM.SEM_VIAGEM, escopo: 'Troca da bateria do equipamento de teste do cliente.', contatoId: contato.id,
          itens: [{ produtoId: 'prod_bat', descricao: 'Bateria estacionária de teste', quantidade: 1, precoUnitario: '2.447,00' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' } }));
        ok(a.api('s_vera', 'concluirProposta', { id, justificativa: 'Cliente recebeu orçamento de outro equipamento esta semana' }));
        a.mudar('2026-10-19T10:52:00-03:00');
        const rota = (fn, args) => (fn === 'Comercial_api' ? a.api(args[0], args[1], args[2]) : undefined);
        let { page, erros } = await abrirPagina(browser, largura, 'matheusgodoi', a.sessoes.s_matheusgodoi, rota);
        await page.evaluate(() => abrir('comercial_propostas'));
        await page.waitForTimeout(600);
        await page.evaluate((x) => Comercial_abrirProposta_(x), id);
        await page.locator('.cm-delegado').waitFor({ timeout: 10000 });
        assert.match(await page.locator('.cm-delegado').innerText(), /Vai até 19\/10\/2026 11:01[\s\S]*Faltam 9 min[\s\S]*MATHEUS GODOI pode autorizar/);
        assert.ok(await justificado(page, '.cm-delegado p:not(.cm-sec)'), 'texto justificado');
        await page.locator('.cm-delegado').scrollIntoViewIfNeeded();
        assert.ok(await semRolagem(page), 'proposta: rolagem lateral em ' + largura);
        await cap(page, largura, 'comercial-proposta-prazo-delegado');
        assert.deepEqual(erros, [], 'erros de JavaScript (proposta) em ' + largura);
        await page.close();
        ({ page, erros } = await abrirPagina(browser, largura, 'dora', a.sessoes.s_dora, rota));
        await page.evaluate(() => abrir('comercial_metodologia'));
        await page.locator('#cmDelPreco details').waitFor({ timeout: 10000 });
        await page.locator('#cmDelPreco summary').click();
        await page.locator('#cmDlPrazo').waitFor({ timeout: 5000 });
        assert.match(await page.locator('#cmDelPreco').innerText(), /MATHEUS GODOI \(Aprovador delegado\): WhatsApp a qualquer hora \(celular final 0077\)/);
        assert.ok(await semRolagem(page), 'metodologia: rolagem lateral em ' + largura);
        await cap(page, largura, 'comercial-metodologia-aprovador-delegado');
        assert.deepEqual(erros, [], 'erros de JavaScript (metodologia) em ' + largura);
        await page.close();
      }
    }
  } finally { await browser.close(); }
});
