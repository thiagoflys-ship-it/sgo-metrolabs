'use strict';
// Pacote 4 de 18/11/2026 — telas reais (Index.html com os include() resolvidos, código REAL do SGO+, dados fictícios) a 1366 e 390 px,
// sem rolagem lateral e sem erro de JavaScript: Depósito de viagem (combustível pelo veículo, recarga fixa, "sem combustível", política
// e a sobra a recolher na visão do Financeiro) e Minha recarga Caju (recarga semanal com a programação puxada da agenda) com a
// aprovação da Diretoria no Painel financeiro > Recarga Caju.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const SAIDA = process.env.CAPTURAS_P4 || path.join(__dirname, '../output/pedidos-20261118/p4/capturas');
const QUATRO = [{ DATA: '01/10/2026', KM: 100000, LITROS: 40, VALOR: 240 }, { DATA: '08/10/2026', KM: 100420, LITROS: 40, VALOR: 244 },
  { DATA: '15/10/2026', KM: 100860, LITROS: 40, VALOR: 248 }, { DATA: '17/10/2026', KM: 101300, LITROS: 40, VALOR: 251.6 }];

function cenario() {
  const S = require('./_financeiro_simulado.cjs');
  const a = S.montar();
  a.ctx.SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO = 'REG_FROTA_ABASTECIMENTO';
  for (const f of ['SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Frota_Abastecimento.js']) vm.runInContext(fs.readFileSync(path.join(S.PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.tabelas.REG_FROTA_ABASTECIMENTO = QUATRO.map((x, i) => Object.assign({ ID: 'ab' + i, VEICULO_ID: 'v1', HORA: '08:00', TIPO_COMBUSTIVEL: 'Gasolina', EXCLUIDO_EM: '' }, x));
  a.r = (login, acao, dados) => { vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null; RCJ_MEMO = {};', a.ctx); return JSON.parse(JSON.stringify(a.ctx.RecargaCaju_api('s_' + login, acao, dados || {}))); };
  a.vincularEquipe();
  a.ok(a.r('wanessa', 'habilitar', { usuarioId: 'u_tec', habilitar: true, motivo: 'técnico de campo da rotina de Goiânia' }));
  a.ok(a.r('tiago', 'aceitarTermo', { aceito: true }));
  a.tabelas.ATEC_OS = [
    { ID: 'os1', NUMERO: 'OS-2026-0101', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-27T08:00:00', CLIENTE_NOME: 'Hospital Teste Alfa', TIPO_NOME: 'Manutenção preventiva', ENDERECO: 'Rua A, 100, Anápolis/GO', SITUACAO: 'AGENDADA' },
    { ID: 'os2', NUMERO: 'OS-2026-0102', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-29T13:00:00', CLIENTE_NOME: 'Clínica Teste Beta', TIPO_NOME: 'Calibração', ENDERECO: 'Rua B, 20, Itumbiara/GO', SITUACAO: 'AGENDADA' }];
  return { a, S };
}

test('pacote 4: telas reais a 1366 e 390 px (viagem e recarga semanal), sem rolagem lateral nem erro de JavaScript', { skip: !chromium && 'Playwright indisponível', timeout: 900000 }, async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390]) {
      const { a, S } = cenario();
      const HTML = S.htmlCompleto();
      const abrir = async (login) => {
        const celular = largura < 500;
        const page = await browser.newPage(Object.assign({ viewport: { width: largura, height: celular ? 844 : 900 } }, celular ? { isMobile: true, hasTouch: true } : {}));
        const erros = [];
        page.on('pageerror', (e) => erros.push(e.message));
        page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
        await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
        await page.exposeFunction('qaRun', (fn, args) => {
          if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, a.sessoes['s_' + login]) } };
          if (/^(RecargaCaju_api|Omie|OmieOps|OmieFat|OmieConc|OmiePed|OmieCad|OmieNota|OmieRegras|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
            vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null; RCJ_MEMO = {};', a.ctx);
            return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
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
        await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
        return { page, erros };
      };
      const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      const esperar = async (page, sel, re) => {
        try { await page.waitForFunction(([s, r]) => new RegExp(r).test((document.querySelector(s) || {}).innerText || ''), [sel, re.source], { timeout: 15000 }); }
        catch (e) { throw new Error('esperava ' + re + ' em ' + sel + '; a tela mostrou: ' + (await page.evaluate((s) => ((document.querySelector(s) || {}).innerText || '(vazio)').slice(0, 700), sel))); }
      };
      const foto = (page, nome) => page.screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png'), fullPage: true });
      const abrirViagem = async (page) => {
        await page.waitForFunction(() => { const b = document.getElementById('menu-btn-deposito_viagem'); return b && b.style.display === ''; }, null, { timeout: 15000 });
        await page.evaluate(() => abrir('deposito_viagem'));
        await page.waitForFunction(() => typeof VG !== 'undefined' && VG.ini, null, { timeout: 15000 });
      };

      // 1. gestor monta a viagem: combustível pelo veículo e recarga fixa (formulário real)
      const base = require('./_viagem_ambiente.cjs').solicitacaoBase(a);
      base.linhas = base.linhas.map((l) => (l.categoria === 'COMBUSTIVEL' ? { id: 'Lcomb', categoria: 'COMBUSTIVEL', q1: 600, q2: null, unitario: null } : l));
      const sid = a.ok(a.v('gil', 'salvar', base)).solicitacao.id;
      a.ok(a.v('gil', 'anexar', { id: sid, linhaId: 'Lhotel', arquivo: a.pdf('hotel.pdf') }));
      {
        const { page, erros } = await abrir('gil');
        await abrirViagem(page);
        await page.evaluate((id) => VgT_abrir_(id), sid);
        await page.waitForFunction(() => VG.vista === 'detalhe' || !!document.querySelector('#vgCorpo .vg-numeros'), null, { timeout: 15000 });
        await page.evaluate(() => VgT_editar_());
        await page.locator('#vgCat_COMBUSTIVEL').waitFor();
        await page.locator('#vgCat_COMBUSTIVEL button', { hasText: 'Calcular pelo veículo' }).click();
        await esperar(page, '#vgCat_COMBUSTIVEL', /Como foi calculado: Consumo real do veículo ABC1D23 · Strada · Onça: 11,00 km\/L/);
        await esperar(page, '#vgCat_COMBUSTIVEL', /R\$ 343,09/);
        assert.match(await page.locator('#vgCat_COMBUSTIVEL .vg-semcomb').innerText(), /Sem combustível nesta viagem\?[\s\S]*Abastece pelo cartão da frota \(Itaú\)/);
        await page.selectOption('#vgRecModo', 'FIXO');
        await page.locator('#vgRecValor').fill('1.500,00');
        await page.locator('#vgRecJust').fill('hotel pago pela empresa direto ao fornecedor');
        await esperar(page, '#vgRecAviso', /Vai para o cartão: R\$ 1\.500,00 \(valor fixo informado\)/);
        assert.ok(await semRolagem(page), 'formulário sem rolagem lateral');
        await page.locator('#vgRecarga').scrollIntoViewIfNeeded();
        await foto(page, 'viagem-formulario-combustivel-recarga');
        await page.getByRole('button', { name: 'Salvar rascunho' }).click();
        await esperar(page, '#vgCorpo', /Recarga no cartão Caju: R\$ 1\.500,00/);
        await esperar(page, '#vgCorpo', /Como foi calculado: Consumo real/);
        assert.ok(await semRolagem(page));
        await foto(page, 'viagem-solicitacao-com-recarga');
        // "sem combustível" pelo atalho
        await page.evaluate(() => VgT_editar_());
        await page.locator('#vgCat_COMBUSTIVEL .vg-semcomb button', { hasText: 'Abastece pelo cartão da frota' }).click();
        await esperar(page, '#vgCat_COMBUSTIVEL', /Não se aplica/);
        assert.equal(await page.inputValue('#vgCat_COMBUSTIVEL .vg-na input[type="text"]'), 'Abastecimento pelo cartão da frota (Itaú), uma vez por semana: sem combustível nesta recarga');
        await page.locator('#vgCat_COMBUSTIVEL').scrollIntoViewIfNeeded();
        await foto(page, 'viagem-sem-combustivel');
        assert.deepEqual(erros, [], 'erros de JavaScript (gestor) a ' + largura);
        await page.close();
      }
      assert.equal(a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === sid).RECARGA_VALOR, 1500);
      // 2. Diretoria vê a política de viagem com os campos novos (percentual vazio)
      {
        const { page, erros } = await abrir('dora');
        await abrirViagem(page);
        await page.evaluate(() => { VG.aba = 'politica'; VgT_politica_(); });
        await esperar(page, '#vgCorpo', /Recarga no cartão[\s\S]*percentual da recarga proporcional vazio/);
        await esperar(page, '#vgCorpo', /Prazo para recolher a sobra do cartão/);
        assert.ok(await semRolagem(page));
        await page.locator('#vgPolRecModo').scrollIntoViewIfNeeded();
        await foto(page, 'viagem-politica');
        assert.deepEqual(erros, []);
        await page.close();
      }
      // 3. Financeiro: viagem com sobra no cartão a recolher
      const s = require('./_viagem_ambiente.cjs').criarCompleta(a, 'gil', { destinoCidade: 'Catalão' });
      a.ok(a.v('gil', 'enviar', { id: s.id }));
      a.ok(a.v('dora', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
      a.ok(a.v('fabio', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: a.pdf('caju.pdf') }));
      a.mudar('2026-10-30T10:00:00-03:00');
      a.ok(a.v('tiago', 'lancarGasto', { id: s.id, categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', data: '2026-10-27', valor: '1.500,00', estabelecimento: 'Hotel Centro', pagoCom: 'CAJU', arquivo: a.pdf('nota.pdf'), descricao: 'hotel da equipe no atendimento do Hospital Teste Alfa' }));
      a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
      {
        const { page, erros } = await abrir('wanessa');
        await abrirViagem(page);
        await page.evaluate((id) => VgT_abrir_(id), s.id);
        await esperar(page, '#vgCorpo', /Recolher a sobra de R\$ 1\.160,00 do cartão Caju de TIAGO TECNICO TESTE/);
        assert.ok(await semRolagem(page));
        await page.locator('#vgPrest').scrollIntoViewIfNeeded();
        await foto(page, 'viagem-sobra-a-recolher');
        assert.deepEqual(erros, []);
        await page.close();
      }
      a.mudar('2026-10-19T10:00:00-03:00');
      // 4. técnico: recarga semanal com a programação puxada da agenda
      {
        const { page, erros } = await abrir('tiago');
        await page.waitForFunction(() => { const b = document.getElementById('menu-btn-recarga_caju'); return b && b.style.display === ''; }, null, { timeout: 15000 });
        await page.evaluate(() => abrir('recarga_caju'));
        await page.locator('#rcjPedidoDet').waitFor();
        await page.evaluate(() => RcjT_tipo_('SEMANAL'));
        await page.getByRole('button', { name: 'Puxar da minha agenda' }).click();
        await page.locator('#rcjSem_valor_1').waitFor();
        assert.equal(await page.inputValue('#rcjSem_cidade_0'), 'Anápolis');
        assert.equal(await page.inputValue('#rcjSem_ref_1'), 'O.S. OS-2026-0102');
        await page.selectOption('#rcjSem_finalidade_0', 'COMBUSTIVEL'); await page.fill('#rcjSem_valor_0', '120,00');
        await page.selectOption('#rcjSem_finalidade_1', 'PEDAGIO'); await page.fill('#rcjSem_valor_1', '35,00');
        await esperar(page, '#rcjSemValor', /R\$ 155,00/);
        assert.ok(await semRolagem(page), 'recarga semanal sem rolagem lateral');
        await page.locator('#rcjPedidoDet').scrollIntoViewIfNeeded();
        await foto(page, 'recarga-semanal-programacao');
        await page.getByRole('button', { name: 'Enviar a recarga semanal' }).click();
        await esperar(page, '#rcjMsg', /Recarga semanal RC-2026-0001 enviada: semana de 26\/10\/2026 a 01\/11\/2026, previsto R\$ 155,00 = R\$ 155,00/);
        await esperar(page, '#rcjCorpo', /Recarga semanal, semana de 26\/10\/2026 a 01\/11\/2026: 2 itens/);
        assert.ok(await semRolagem(page));
        await foto(page, 'recarga-semanal-enviada');
        assert.deepEqual(erros, []);
        await page.close();
      }
      // 5. Diretoria decide pelo Painel financeiro > Recarga Caju, vendo a programação
      const rid = a.tabelas.RCJ_SOLICITACOES[0].ID;
      {
        const { page, erros } = await abrir('dora');
        await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
        await page.evaluate(() => abrir('omie'));
        await page.evaluate(() => OmieTela_abrir_('recarga'));
        await page.locator('#rcjgPed_' + rid).waitFor();
        await esperar(page, '#rcjgPed_' + rid, /Recarga semanal: semana de 26\/10\/2026 a 01\/11\/2026[\s\S]*Hospital Teste Alfa · O\.S\. OS-2026-0101/);
        assert.ok(await semRolagem(page));
        await page.locator('#rcjgPed_' + rid).scrollIntoViewIfNeeded();
        await foto(page, 'gestao-recarga-semanal');
        await page.locator('#rcjAprFundamentacao_' + rid).fill('programação conferida com a agenda da semana');
        await page.locator('#rcjgPed_' + rid).getByRole('button', { name: 'Aprovar' }).click();
        await esperar(page, '#rcjgAviso', /aprovada/i);
        await page.evaluate(() => RcjG_aba_('politica'));
        await esperar(page, '#rcjgCorpo', /Recarga semanal com a programação da semana/);
        assert.ok(await semRolagem(page));
        await page.locator('#rcjPolSemTeto').scrollIntoViewIfNeeded();
        await foto(page, 'gestao-politica-semanal');
        assert.deepEqual(erros, []);
        await page.close();
      }
      assert.equal(a.tabelas.RCJ_SOLICITACOES[0].SITUACAO, 'APROVADA');
    }
  } finally { await browser.close(); }
});
