// Painel financeiro (14/11/2026): módulo Omie integrado à produção. Código REAL do SGO+ (caixas de acesso, sessões, Chaves) do
// ambiente da Conciliação Caju + SGO_Omie*.js, com um OMIE SIMULADO no lugar do UrlFetchApp (nada sai para a rede).
// Confere: caixas FIN_OMIE_* registradas e ligadas (padrão = Financeiro/Diretoria/Administrador); quem não tem a caixa é recusado
// sem consultar o Omie; gravação no Omie desligada por padrão (prévia sim, envio não) e ligada pela chave; teste da conexão em
// Chaves e senhas; e a PÁGINA COMPLETA (Index.html com include()): menu Financeiro, faixa da gravação, visão geral, 1366 e 390 px.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/financeiro-omie-20261114.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambienteCaju, PASTA } = require('./_caju_ambiente.cjs');
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/financeiro-20261114/capturas');
const ARQUIVOS = ['SGO_Omie.js', 'SGO_Omie_Gestao.js', 'SGO_Omie_Operacoes.js', 'SGO_Omie_Conciliacao.js', 'SGO_Omie_Faturamento.js', 'SGO_Omie_Pedidos.js', 'SGO_Omie_Sigilo.js']
  // 16/11/2026: identificação/marca, cadastro no Omie e notas recebidas (só quando existem na pasta testada)
  .concat(['SGO_Financeiro_Marca.js', 'SGO_Omie_Cadastro.js', 'SGO_Omie_Notas.js', 'SGO_Omie_Regras.js'].filter((f) => fs.existsSync(path.join(PASTA, f))));
const TITULO = { codigo_lancamento_omie: 101, numero_documento: 'NF-001', codigo_cliente_fornecedor: 12, codigo_categoria: '1.01', id_conta_corrente: 5, data_vencimento: '20/11/2026', data_previsao: '20/11/2026', valor_documento: 120.5, status_titulo: 'EMABERTO' };

function montar() {
  const a = ambienteCaju({ comChaves: true });
  for (const f of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  vm.runInContext('PODERES_CATALOGO_MEMO = null;', a.ctx);
  Object.assign(a.props, { OMIE_APP_KEY: 'chave-ficticia-omie', OMIE_APP_SECRET: 'segredo-ficticio-omie', OMIE_SIGILO_CONTAS: process.env.SIGILO_TESTE || '["u_adm","u_dir","u_dir2","u_fin","u_fin2"]' }); // 16/11/2026: lista de sigilo do Financeiro
  a.omie = []; a.ocupado = {}; a.esperas = [];
  a.ctx.Utilities.sleep = (ms) => a.esperas.push(ms);
  const anterior = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (!/app\.omie\.com\.br/.test(url)) return anterior(url, op);
    const b = JSON.parse(op.payload); a.omie.push({ url, call: b.call, param: b.param[0] });
    if (a.ocupado[b.call] > 0) { a.ocupado[b.call]--; return { getResponseCode: () => 500, getContentText: () => JSON.stringify({ faultstring: 'ERROR: Já existe uma requisição desse método sendo executada e você pode tentar novamente em alguns instantes. (1)', faultcode: 'SOAP-ENV:Client-' + b.app_key }) }; }
    const r = (() => {
      switch (b.call) {
        case 'ObterResumoFinancas': return { contaCorrente: { vTotal: 25000.4, vLimiteCredito: 0 }, contaPagar: { vTotal: 1, vAtraso: 1, nTotal: 1 }, contaReceber: { vTotal: 2, vAtraso: 2, nTotal: 2 },
          fluxoCaixa: [{ dDia: '19/10/2026', vPagar: 100, vReceber: 0, vSaldo: 24900.4 }, { dDia: '20/10/2026', vPagar: 0, vReceber: 1500, vSaldo: 26400.4 }] };
        case 'ListarCategorias': return { total_de_paginas: 1, categoria_cadastro: [
          { codigo: '1.01', descricao: 'Receitas de serviços', categoria_superior: '1', transferencia: 'N', conta_receita: 'S', conta_despesa: 'N' }, { codigo: '1', descricao: 'Receitas', categoria_superior: '', totalizadora: 'S' },
          { codigo: '2.03', descricao: 'Combustível', categoria_superior: '2', transferencia: 'N', conta_receita: 'N', conta_despesa: 'S' }, { codigo: '2', descricao: 'Despesas operacionais', categoria_superior: '', totalizadora: 'S' },
          { codigo: '9.01', descricao: 'Transferência entre contas', categoria_superior: '9', transferencia: 'S' }] };
        case 'ListarMovimentos': if (b.param[0].nCodTitulo) return { nTotPaginas: 1, movimentos: [{ detalhes: { nCodTitulo: b.param[0].nCodTitulo, cNatureza: 'R' }, resumo: { nValAberto: 120.5, nValPago: 0 } }] }; // 16/11/2026 (B2)
          if (b.param[0].dDtPagtoDe && a.resultado) return { nTotPaginas: 1, movimentos: [
          { detalhes: { nCodTitulo: 81, cNatureza: 'R', cCodCateg: '1.01', dDtPagamento: '05/10/2026', cStatus: 'RECEBIDO' }, resumo: { nValPago: 5000 } },
          { detalhes: { nCodTitulo: 82, cNatureza: 'R', cCodCateg: '1.01', dDtPagamento: '06/10/2026', cStatus: 'RECEBIDO' }, resumo: { nValPago: 2500 } },
          { detalhes: { nCodTitulo: 83, cNatureza: 'P', cCodCateg: '2.03', dDtPagamento: '07/10/2026', cStatus: 'PAGO' }, resumo: { nValPago: 1200.5 } },
          { detalhes: { nCodTitulo: 84, cNatureza: 'P', cCodCateg: '9.01', dDtPagamento: '08/10/2026', cStatus: 'PAGO' }, resumo: { nValPago: 9999 } },
          { detalhes: { nCodTitulo: 85, cNatureza: 'P', cCodCateg: '2.03', dDtPagamento: '09/10/2026', cStatus: 'CANCELADO' }, resumo: { nValPago: 77 } },
          { detalhes: { nCodTitulo: 86, cNatureza: 'P', cCodCateg: '2.03', dDtPagamento: '30/09/2026', cStatus: 'PAGO' }, resumo: { nValPago: 50 } }] };
          if (b.param[0].cStatus === 'ATRASADO' && a.vencidos) return { nTotPaginas: 1, movimentos: [
          { detalhes: { nCodTitulo: 71, cNatureza: 'R', nCodCliente: 12, dDtVenc: '10/10/2026', cNumDocFiscal: '10' }, resumo: { nValAberto: 1000, nValPago: 0 } },
          { detalhes: { nCodTitulo: 72, cNatureza: 'R', nCodCliente: 12, dDtVenc: '01/09/2026', cNumTitulo: 'BOL-9' }, resumo: { nValAberto: 500.5, nValPago: 0 } },
          { detalhes: { nCodTitulo: 73, cNatureza: 'R', nCodCliente: 13, dDtVenc: '15/10/2026', cNumDocFiscal: '11' }, resumo: { nValAberto: 2000, nValPago: 1000 } },
          { detalhes: { nCodTitulo: 74, cNatureza: 'R', nCodCliente: 13, dDtVenc: '15/10/2026' }, resumo: { nValAberto: 0, nValPago: 300 } }] };
          return { nTotPaginas: 1, movimentos: [
          { detalhes: { nCodTitulo: 1, cNatureza: 'R', dDtVenc: '05/11/2026', cStatus: 'ATRASADO', nCodCliente: 12, cNumParcela: '001/002' }, resumo: { nValAberto: 1500 } },
          { detalhes: { nCodTitulo: 2, cNatureza: 'P', dDtVenc: '28/11/2026', cStatus: 'A VENCER', nCodCliente: 13, cCPFCNPJCliente: '11.222.333/0001-81' }, resumo: { nValAberto: 300.5 } }].concat(a.agendaExtra ? [
          { detalhes: { nCodTitulo: 3, cNatureza: 'P', dDtVenc: '20/11/2026', cStatus: 'CANCELADO', nCodCliente: 13 }, resumo: { nValAberto: 50 } },
          { detalhes: { nCodTitulo: 4, cNatureza: 'R', dDtVenc: '21/11/2026', cStatus: 'RECEBIDO', nCodCliente: 12 }, resumo: { nValAberto: 0 } },
          { detalhes: { nCodTitulo: 5, cNatureza: 'P', dDtVenc: '05/11/2026', cStatus: 'ATRASADO', nCodCliente: 99 }, resumo: { nValAberto: 80 } }] : []) };
        case 'ListarClientes': if (b.param[0].clientesFiltro) return { total_de_paginas: 1, clientes_cadastro: b.param[0].clientesFiltro.cnpj_cpf === '11.222.333/0001-81' ? [{ codigo_cliente_omie: 12, razao_social: 'Hospital Simulado S.A.', cnpj_cpf: '11.222.333/0001-81', inativo: 'N' }] : [] };
          return { total_de_paginas: 1, clientes_cadastro: (b.param[0].clientesPorCodigo || []).filter((x) => x.codigo_cliente_omie !== 99).map((x) => ({ codigo_cliente_omie: x.codigo_cliente_omie, razao_social: x.codigo_cliente_omie === 12 ? 'Hospital Simulado S.A.' : 'Fornecedor Simulado Ltda', nome_fantasia: '' })) };
        case 'ListarContasReceber': if (b.param[0].filtrar_por_status === 'ATRASADO' && a.vencidos) return { total_de_paginas: 1, conta_receber_cadastro: [
          { codigo_lancamento_omie: 71, codigo_cliente_fornecedor: 12, data_vencimento: '10/10/2026', valor_documento: 1000, numero_documento: 'NF-10', status_titulo: 'ATRASADO' },
          { codigo_lancamento_omie: 72, codigo_cliente_fornecedor: 12, data_vencimento: '01/09/2026', valor_documento: 500.5, numero_documento: 'NF-09', status_titulo: 'ATRASADO' },
          { codigo_lancamento_omie: 73, codigo_cliente_fornecedor: 13, data_vencimento: '15/10/2026', valor_documento: 3000, numero_documento: 'NF-11', status_titulo: 'PAGTO PARCIAL' }] };
        // falls through
        case 'ListarContasPagar': return { total_de_paginas: 1, total_de_registros: 1, conta_receber_cadastro: [TITULO], conta_pagar_cadastro: [TITULO] };
        case 'ConsultarContaReceber': case 'ConsultarContaPagar': return Object.assign({}, TITULO);
        case 'ConsultarCliente': return { razao_social: 'Cliente Simulado Ltda' };
        case 'ConsultarCategoria': return b.param[0].codigo === '2.03' ? { descricao: 'Combustível', conta_despesa: 'S', conta_receita: 'N' } : { descricao: 'Serviços prestados', conta_receita: 'S', conta_despesa: 'N' }; // 16/11/2026 (B4)
        case 'ConsultarContaCorrente': return { descricao: 'Banco simulado' };
        case 'ListarContasCorrentes': return { total_de_paginas: 1, ListarContasCorrentes: [{ nCodCC: 5, descricao: 'Banco simulado' }] };
        default: return { codigo_status: '0', codigo_lancamento_omie: 999 };
      }
    })();
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
  };
  a.pedidos = () => {
    a.tabelas.COM_PROPOSTAS = [
      { ID: 'pp1', NUMERO: 'PROP-2026-0042', REVISAO: 1, SITUACAO: 'APROVADA', CLIENTE_ID: 'cc1', CLIENTE_NOME: 'Hospital Simulado', TITULO: 'Qualificação de autoclave', TOTAL: 4500, RESPOSTA_EM: '2026-11-10T10:00:00', OC_NUMERO: 'OC-77', CONDICOES_JSON: JSON.stringify({ pagamento: '30 dias após a emissão da nota' }), RESPONSAVEL_NOME: 'Vera' },
      { ID: 'pp2', NUMERO: 'PROP-2026-0043', REVISAO: 0, SITUACAO: 'ENVIADA', CLIENTE_ID: 'cc1', TOTAL: 100 },
      { ID: 'pp3', NUMERO: 'PROP-2026-0044', REVISAO: 0, SITUACAO: 'APROVADA', CLIENTE_ID: 'cc9', CLIENTE_NOME: 'Clínica sem CNPJ', TOTAL: 900, RESPOSTA_EM: '2026-11-01T10:00:00' }];
    a.tabelas.CAD_CLIENTES = (a.tabelas.CAD_CLIENTES || []).concat([{ ID: 'cc1', RAZAO_SOCIAL: 'Hospital Simulado S.A.', CNPJ: '11222333000181' }, { ID: 'cc9', RAZAO_SOCIAL: 'Clínica sem CNPJ', CNPJ: '' }]);
  };
  a.f = (fn, login, dados) => { vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx); return JSON.parse(JSON.stringify(a.ctx[fn]('s_' + login, dados || {}))); };
  a.escritas = () => a.omie.filter((c) => !/^(Listar|Consultar|Obter)/.test(c.call));
  return a;
}
const criar = { acao: 'criar', tipo: 'receber', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'NF-001', referencia: 'SGO-ENSAIO-001', vencimento: '2026-11-20', valor: '120.50' } };

test('caixas do Financeiro no SGO+ registradas e ligadas, lote 3, padrão espelho do perfil', () => {
  const a = montar();
  const cat = JSON.parse(JSON.stringify(a.ctx.SGO_poderesCatalogo_()));
  const fin = cat.lista.filter((p) => /^FIN_OMIE_/.test(p.codigo));
  assert.deepEqual(fin.map((p) => p.codigo).sort(), ['FIN_OMIE_COBRAR', 'FIN_OMIE_CONCILIAR', 'FIN_OMIE_CONSULTAR', 'FIN_OMIE_FATURAR', 'FIN_OMIE_LANCAR', 'FIN_OMIE_PROVISOES']);
  assert.ok(fin.every((p) => p.ligado && p.lote === 3 && p.modulo === 'Financeiro'));
  const w = a.f('Omie_apiIniciar', 'wanessa'), t = a.f('Omie_apiIniciar', 'tiago');
  assert.equal(w.ver, true); assert.ok(Object.values(w.poderes).every(Boolean)); assert.equal(w.gravacao, false); assert.equal(w.configurado, true);
  assert.equal(t.ver, false); assert.ok(Object.values(t.poderes).every((v) => !v));
});

test('sem a caixa: recusa com a permissão que falta e não consulta o Omie', () => {
  const a = montar();
  const r = a.f('Omie_apiResumo', 'tiago', { inicio: '2026-11-01', fim: '2026-11-14' });
  // 16/11/2026: fora da lista de sigilo do Financeiro, a recusa vem antes da caixa (tests/financeiro-sigilo-20261116.test.cjs)
  assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
  const p = a.f('OmieOps_apiPrevia', 'tiago', criar);
  assert.equal(p.ok, false); assert.match(p.mensagem, /O Financeiro é sigiloso/);
  assert.equal(a.omie.length, 0);
});

test('Financeiro consulta o Omie: visão geral, contas e títulos', () => {
  const a = montar();
  const r = a.f('Omie_apiResumo', 'wanessa', { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.totais.receber, 1500); assert.equal(r.totais.pagar, 300.5); assert.equal(r.totais.titulos, 2);
  const l = a.f('Omie_apiListar', 'wanessa', { tipo: 'pagar', pagina: 1 });
  assert.equal(l.ok, true); assert.equal(l.itens[0].documento, 'NF-001'); assert.equal(l.itens[0].pessoa, 'Hospital Simulado S.A.', 'nome no lugar do código');
  assert.equal(a.f('OmieOps_apiListar', 'wanessa', { tipo: 'receber', pagina: 1 }).itens[0].pessoaNome, 'Hospital Simulado S.A.');
  assert.ok(!JSON.stringify(r).includes('segredo-ficticio-omie') && !JSON.stringify(l).includes('segredo-ficticio-omie'));
  assert.equal(a.escritas().length, 0);
});

test('gravação desligada por padrão: prévia funciona, envio recusado sem escrever; ligada pela chave, a mesma prévia envia', () => {
  const a = montar();
  const p = a.f('OmieOps_apiPrevia', 'wanessa', criar);
  assert.equal(p.ok, true, p.mensagem); assert.ok(p.resumo.some((l) => l[1] === 'Cliente Simulado Ltda'));
  const c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /^Nada foi enviado ao Omie: a gravação pelo SGO\+ ainda está desligada/);
  const fat = a.f('OmieFat_apiConfirmar', 'wanessa', { token: 'qualquer', confirmacao: 'CONFIRMAR' });
  assert.equal(fat.ok, false); assert.match(fat.mensagem, /gravação pelo SGO\+ ainda está desligada/);
  assert.equal(a.escritas().length, 0);
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  assert.equal(a.f('Omie_apiIniciar', 'wanessa').gravacao, true);
  const ok = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(ok.ok, true, ok.mensagem); assert.deepEqual(a.escritas().map((e) => e.call), ['IncluirContaReceber']);
});

test('Chaves e senhas: cartão Omie com a chave da gravação e teste de conexão somente leitura', () => {
  const a = montar();
  const t = JSON.parse(JSON.stringify(a.ctx.Chaves_apiTestar('s_admin', { tipo: 'omie' })));
  assert.equal(t.funcionou, true, JSON.stringify(t)); assert.match(t.texto, /Funcionou/);
  assert.equal(a.escritas().length, 0);
  const lista = JSON.parse(JSON.stringify(a.ctx.Chaves_apiListar('s_admin', {})));
  const item = (lista.itens || []).find((i) => i.chave === 'OMIE_GRAVACAO_LIGADA');
  assert.ok(item, 'item da gravação na lista do dono');
});

test('página completa: menu Financeiro, faixa da gravação e visão geral (1366 e 390 px); técnico não vê', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); a.pedidos();
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [login, largura] of [['wanessa', 1366], ['wanessa', 390], ['wanessa', 320], ['tiago', 390]]) {
      const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
      const ordem = [];
      await page.exposeFunction('qaRun', async (fn, args) => {
        if (fn === 'getSessaoAtual') { const s = a.sessoes['s_' + login]; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_' + login }, s) } }; }
        if (/^(Omie|OmieOps|OmieFat|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
          vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
          // 15/11/2026: o resumo do mês demora; a agenda (mesmo método do Omie) só pode começar depois dele
          const mov = ['Omie_apiResumo', 'Omie_apiAgenda', 'Omie_apiVencidosClientes'].includes(fn);
          if (fn === 'Omie_apiAgenda') ordem.push('agenda-inicio');
          if (fn === 'Omie_apiVencidosClientes') ordem.push('vencidos-inicio');
          if (mov) { ordem.ativos = (ordem.ativos || 0) + 1; ordem.max = Math.max(ordem.max || 0, ordem.ativos); }
          if (fn === 'Omie_apiResumo') { ordem.push('resumo-inicio'); await new Promise((ok) => setTimeout(ok, 300)); }
          else if (mov) await new Promise((ok) => setTimeout(ok, 120));
          const valor = JSON.parse(JSON.stringify(a.ctx[fn](...args) || null));
          if (fn === 'Omie_apiResumo') ordem.push('resumo-fim');
          if (mov) ordem.ativos--;
          return { ok: true, valor };
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
      if (login === 'tiago') {
        await page.waitForTimeout(1500);
        assert.equal(await page.locator('#menu-btn-omie').evaluate((b) => b.style.display), 'none');
        assert.equal(await page.locator('#menu-secao-financeiro').evaluate((g) => g.style.display), 'none');
      } else {
        await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
        assert.notEqual(await page.locator('#menu-secao-financeiro').evaluate((g) => g.style.display), 'none');
        await page.evaluate(() => abrir('omie'));
        await page.locator('#omieFaixaGravacao').waitFor();
        await page.evaluate(() => OmieGest_vencidos_()); // tocado enquanto a Visão geral ainda carrega
        assert.match(await page.locator('#omieFaixaGravacao').innerText(), /gravação no Omie desligada/);
        await page.locator('#omieGestResumo .bc-resumo-item').first().waitFor({ timeout: 10000 });
        // 15/11/2026: posição de hoje pelo resumo do Omie
        await page.locator('#omiePosCartoes .bc-resumo-item').first().waitFor({ timeout: 10000 });
        assert.match(await page.locator('#omiePosCartoes').innerText(), /25\.000,40[\s\S]*Saldo nas contas hoje/);
        assert.match(await page.locator('#omiePosFluxo').innerText(), /26\.400,40/);
        const texto = await page.locator('#omieGestResumo').innerText();
        assert.match(texto, /1\.500,00/); assert.match(texto, /300,50/);
        // 15/11/2026: a agenda de vencimentos abre junto com a visão geral
        await page.locator('#omieAgLista table').waitFor({ timeout: 10000 });
        const ag = await page.locator('#omieAgLista').innerText();
        assert.match(ag, /Hospital Simulado S\.A\./); assert.match(ag, /Fornecedor Simulado Ltda/); assert.match(ag, /parcela 001\/002/);
        assert.ok(ordem.indexOf('agenda-inicio') > ordem.indexOf('resumo-fim') && ordem.indexOf('resumo-fim') > 0, 'agenda depois do resumo: ' + ordem.join(' > '));
        await page.locator('#omieVcLista table').waitFor({ timeout: 10000 });
        assert.match(await page.locator('#omieVcLista').innerText(), /Vencido há até 30 dias[\s\S]*Baixar planilha \(CSV\)/);
        const [baixa] = await Promise.all([page.waitForEvent('download'), page.locator('#omieVcLista button', { hasText: 'Baixar planilha' }).click()]);
        const csv = fs.readFileSync(await baixa.path(), 'utf8');
        // 16/11/2026 (seção 5): a planilha sai identificada (quem, quando, código único no começo e no fim)
        assert.match(csv, /^﻿Gerado por WANESSA FINANCEIRO TESTE \(wanessa\) em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · uso interno do Financeiro · código [0-9A-F]{4}-[0-9A-F]{4}\r\nCliente;Títulos;Em aberto;Vencido desde;Dias de atraso/);
        assert.match(csv, /\r\nFim da planilha · código [0-9A-F]{4}-[0-9A-F]{4}/); assert.equal(baixa.suggestedFilename(), 'vencidos-por-cliente.csv');
        assert.equal(ordem.max, 1, 'nunca duas consultas de movimentos ao mesmo tempo: ' + ordem.join(' > '));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral');
        await page.screenshot({ path: path.join(saida, largura + '-painel-financeiro.png'), fullPage: true });
        // 15/11/2026: Pedidos aprovados -> Preparar conta a receber -> formulário preenchido
        await page.evaluate(() => OmieTela_abrir_('pedidos'));
        await page.locator('[data-omie-ped="pp1"]').click();
        await page.locator('#omieOpsForm').waitFor({ timeout: 10000 });
        assert.equal(await page.inputValue('#omieOpsForm [name="referencia"]'), 'SGO-PROP-2026-0042-R1');
        assert.equal(await page.inputValue('#omieOpsForm [name="valor"]'), '4500');
        assert.match(await page.locator('#omieCadEscolhido').innerText(), /Hospital Simulado S.A./); // 16/11/2026 (B9): busca no lugar da lista
        assert.equal(await page.inputValue('#omieOpsPessoaId'), '12');
        assert.match(await page.locator('.omie-ped-aviso').innerText(), /30 dias após a emissão da nota/);
        assert.match(await page.locator('#omieOpsLista').innerText(), /Toque em Atualizar/);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral no pedido');
        await page.screenshot({ path: path.join(saida, largura + '-pedido-aprovado.png'), fullPage: true });
        await page.evaluate(() => OmieTela_abrir_('comissoes'));
        assert.match(await page.locator('#omieCorpo').innerText(), /Ganhos dos vendedores/);
      }
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
  assert.equal(a.escritas().length, 0);
});

test('limites do Omie: leitura guardada 60 s, espaço entre chamadas do mesmo método, ocupado não repete sozinho', () => {
  const a = montar();
  const l = a.f('Omie_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'ATRASADO', pagina: 1 });
  assert.equal(l.ok, true, l.mensagem);
  const listas = a.omie.filter((c) => c.call === 'ListarContasPagar');
  assert.equal(listas.length, 1); assert.equal(listas[0].param.filtrar_por_status, 'ATRASADO'); assert.deepEqual(a.esperas, []);
  a.f('Omie_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'ATRASADO', pagina: 1 });
  assert.equal(a.omie.filter((c) => c.call === 'ListarContasPagar').length, 1, 'a mesma consulta dentro de 60 s vem guardada');
  a.f('Omie_apiListar', 'wanessa', { tipo: 'pagar', situacao: '', pagina: 1 });
  const todos = a.omie.filter((c) => c.call === 'ListarContasPagar')[1].param;
  assert.equal(todos.ordem_descrescente, 'S'); assert.equal(todos.filtrar_por_status, undefined);
  assert.equal(a.esperas.length, 1); assert.ok(a.esperas[0] > 4000 && a.esperas[0] <= 5000, 'esperou o espaço do método: ' + a.esperas[0]);
  assert.equal(a.f('Omie_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'PAGO', pagina: 1 }).ok, false);
  a.ocupado.ListarContasReceber = 5;
  const r = a.f('Omie_apiListar', 'wanessa', { tipo: 'receber', pagina: 1 });
  assert.equal(r.ok, false); assert.match(r.mensagem, /ocupado.*aguarde um minuto/); assert.ok(!r.mensagem.includes('chave-ficticia-omie'));
  assert.equal(a.omie.filter((c) => c.call === 'ListarContasReceber').length, 1, 'ocupado: nenhuma repetição automática');
  // gravação: o Omie ocupado não executa; o envio volta a pendente e a mesma prévia confirma depois
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  const p = a.f('OmieOps_apiPrevia', 'wanessa', criar);
  a.ocupado.IncluirContaReceber = 1;
  const c1 = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c1.ok, false); assert.match(c1.mensagem, /não executou.*toque em Confirmar no Omie de novo/);
  const c2 = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c2.ok, true, c2.mensagem);
  assert.deepEqual(a.escritas().map((e) => e.call), ['IncluirContaReceber', 'IncluirContaReceber']);
});

test('15/11/2026: agenda de vencimentos — ordem de data, só saldo em aberto, sem cancelados, nomes do cadastro do Omie em lote', () => {
  const a = montar(); a.agendaExtra = true;
  const r = a.f('Omie_apiAgenda', 'wanessa', { dias: 30, natureza: 'todos' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(r.itens.map((i) => i.id), ['5', '1', '2']);
  assert.deepEqual(r.itens.map((i) => i.nome), ['', 'Hospital Simulado S.A.', 'Fornecedor Simulado Ltda']);
  assert.equal(r.totais.pagar, 380.5); assert.equal(r.totais.receber, 1500); assert.equal(r.semNome, 1);
  assert.equal(r.itens[1].parcela, '001/002'); assert.equal(r.itens[2].cnpj, '11.222.333/0001-81');
  const mov = a.omie.filter((c) => c.call === 'ListarMovimentos').pop().param;
  assert.equal(mov.cTpLancamento, 'CPCR'); assert.match(mov.dDtVencDe, /^\d{2}\/\d{2}\/\d{4}$/);
  const cli = a.omie.filter((c) => c.call === 'ListarClientes');
  assert.equal(cli.length, 1); assert.deepEqual(cli[0].param.clientesPorCodigo.map((x) => x.codigo_cliente_omie).sort((x, y) => x - y), [12, 13, 99]);
  assert.equal(a.f('Omie_apiAgenda', 'wanessa', { dias: 30, natureza: 'P' }).ok, true);
  assert.equal(a.omie.filter((c) => c.call === 'ListarMovimentos').pop().param.cTpLancamento, 'CP');
  assert.equal(a.f('Omie_apiAgenda', 'wanessa', { dias: 90 }).ok, false);
  assert.equal(a.f('Omie_apiAgenda', 'tiago', { dias: 7 }).ok, false);
  assert.deepEqual(a.esperas, [], 'ListarMovimentos sem espera entre páginas');
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026: Pedidos aprovados — lista sem Omie, preparo acha o cliente pelo CNPJ e preenche o lançamento; nada é enviado', () => {
  const a = montar(); a.pedidos();
  const l = a.f('OmiePed_apiListar', 'wanessa', {});
  assert.equal(l.ok, true, l.mensagem); assert.deepEqual(l.pedidos.map((p) => p.id), ['pp1', 'pp3']); assert.equal(a.omie.length, 0, 'a lista não chama o Omie');
  assert.equal(l.pedidos[0].cnpj, '11.222.333/0001-81'); assert.equal(l.pedidos[0].pagamento, '30 dias após a emissão da nota'); assert.equal(l.pedidos[0].numero, 'PROP-2026-0042 rev. 1');
  assert.deepEqual(a.f('OmiePed_apiListar', 'wanessa', { q: 'oc-77' }).pedidos.map((p) => p.id), ['pp1']);
  const r = a.f('OmiePed_apiPreparar', 'wanessa', { id: 'pp1' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(r.previo, { referencia: 'SGO-PROP-2026-0042-R1', documento: 'PROP-2026-0042-R1', pessoaId: '12', pessoaNome: 'Hospital Simulado S.A.', valor: 4500,
    observacao: 'Proposta PROP-2026-0042 rev. 1 aprovada em 10/11/2026 (SGO+). OC OC-77. Pagamento: 30 dias após a emissão da nota' });
  assert.equal(r.existentes.length, 1); assert.equal(r.jaComReferencia, false);
  assert.equal(a.omie.find((c) => c.call === 'ListarClientes').param.clientesFiltro.cnpj_cpf, '11.222.333/0001-81');
  assert.equal(a.omie.find((c) => c.call === 'ListarContasReceber').param.filtrar_por_cpf_cnpj, '11222333000181');
  assert.match(a.f('OmiePed_apiPreparar', 'wanessa', { id: 'pp3' }).mensagem, /sem CNPJ válido no SGO+/);
  assert.match(a.f('OmiePed_apiPreparar', 'wanessa', { id: 'pp2' }).mensagem, /não está aprovada/);
  assert.match(a.f('OmiePed_apiPreparar', 'tiago', { id: 'pp1' }).mensagem, /O Financeiro é sigiloso/); // 16/11/2026: sigilo
  assert.equal(a.f('OmiePed_apiListar', 'tiago', {}).ok, false);
  // o preparado vira prévia normal; com a gravação desligada, nada é enviado
  const p = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'receber', dados: Object.assign({}, r.previo, { categoria: '1.01', contaId: 5, vencimento: '2026-12-10' }) });
  assert.equal(p.ok, true, p.mensagem); assert.ok(p.resumo.some((x) => x[1] === 'PROP-2026-0042-R1'));
  assert.equal(a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).ok, false);
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026: vencidos a receber por cliente — agrupa, soma, mais antigo e dias, nomes em lote, só leitura', () => {
  const a = montar(); a.vencidos = true;
  const r = a.f('Omie_apiVencidosClientes', 'wanessa');
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.titulos, 3); assert.equal(r.total, 3500.5, 'soma do saldo em aberto, não do documento');
  assert.deepEqual(r.clientes.map((c) => [c.cliente, c.titulos, c.valor, c.maisAntigo, c.parciais]), [['Fornecedor Simulado Ltda', 1, 2000, '2026-10-15', 1], ['Hospital Simulado S.A.', 2, 1500.5, '2026-09-01', 0]]);
  assert.deepEqual(r.clientes[1].documentos, ['NF 10', 'BOL-9']);
  assert.deepEqual(r.faixas, { ate30: { titulos: 2, valor: 3000 }, de31a90: { titulos: 1, valor: 500.5 }, mais90: { titulos: 0, valor: 0 } }, 'faixas por título (relógio do ensaio em 19/10/2026)');
  assert.ok(r.clientes.every((c) => c.diasAtraso >= 0));
  const mv = a.omie.find((c) => c.call === 'ListarMovimentos').param; assert.equal(mv.cStatus, 'ATRASADO'); assert.equal(mv.cTpLancamento, 'CR');
  assert.equal(a.f('Omie_apiVencidosClientes', 'tiago').ok, false);
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026: posição de hoje — saldo das contas e fluxo de 10 dias do resumo do Omie, numa chamada', () => {
  const a = montar();
  const r = a.f('Omie_apiPosicao', 'wanessa');
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.saldoContas, 25000.4);
  assert.deepEqual(r.fluxo, [{ dia: '2026-10-19', pagar: 100, receber: 0, saldo: 24900.4 }, { dia: '2026-10-20', pagar: 0, receber: 1500, saldo: 26400.4 }]);
  assert.equal(a.omie.filter((c) => c.call === 'ObterResumoFinancas').length, 1);
  assert.equal(a.f('Omie_apiPosicao', 'tiago').ok, false);
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026: conta a receber confirmada a partir do pedido fica registrada; a lista mostra "lançado" e filtra os que faltam', () => {
  const a = montar(); a.pedidos(); a.props.OMIE_GRAVACAO_LIGADA = '1';
  const prep = a.f('OmiePed_apiPreparar', 'wanessa', { id: 'pp1' });
  const dados = Object.assign({}, prep.previo, { referencia: prep.previo.referencia + '-1', categoria: '1.01', contaId: 5, vencimento: '2026-12-10', valor: 2250 });
  const p = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'receber', dados });
  assert.equal(p.ok, true, p.mensagem);
  const c = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, true, c.mensagem);
  const env = a.escritas().find((e) => e.call === 'IncluirContaReceber');
  assert.equal(env.param.codigo_lancamento_integracao, 'SGO-PROP-2026-0042-R1-1');
  const vinc = a.tabelas.FIN_OMIE_PEDIDOS || [];
  assert.equal(vinc.length, 1); assert.equal(vinc[0].PROPOSTA_ID, 'pp1'); assert.equal(vinc[0].VALOR, 2250); assert.equal(vinc[0].TITULO_OMIE, '999');
  const l = a.f('OmiePed_apiListar', 'wanessa', {});
  const pp1 = l.pedidos.find((x) => x.id === 'pp1');
  assert.equal(pp1.lancado.titulos, 1); assert.equal(pp1.lancado.valor, 2250); assert.match(pp1.lancado.por, /WANESSA/i);
  assert.deepEqual(a.f('OmiePed_apiListar', 'wanessa', { soPendentes: true }).pedidos.map((x) => x.id), ['pp3']);
  // lançamento comum (sem referência de pedido) não cria vínculo
  const p2 = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'receber', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, documento: 'AVULSO', referencia: 'AVULSO-1', vencimento: '2026-12-10', valor: 10 } });
  assert.equal(a.f('OmieOps_apiConfirmar', 'wanessa', { token: p2.token }).ok, true);
  assert.equal((a.tabelas.FIN_OMIE_PEDIDOS || []).length, 1);
});

test('15/11/2026: todas as abas do Painel financeiro abrem na página completa sem erro e sem rolagem lateral (1366 e 390 px)', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); a.pedidos();
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
        if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
          vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
          return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
        }
        return { ok: false, erro: 'indisponível no ensaio: ' + fn };
      });
      await page.addInitScript(() => {
        try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
        const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
      await page.evaluate(() => abrir('omie'));
      const abas = await page.evaluate(() => OMIE_ABAS.map((x) => x[0]));
      assert.equal(abas.length, 17); // 16/11/2026: + Sigilo e acessos, + Ficha do cliente, + Regras do Financeiro, + Indicadores (Onda 2)
      for (const aba of abas) {
        await page.evaluate((x) => OmieTela_abrir_(x), aba);
        await page.waitForTimeout(700);
        const texto = await page.locator('#omieCorpo').innerText();
        assert.ok(texto.trim().length > 20, aba + ': aba vazia');
        const destaque = await page.locator('[data-omie-aba="' + aba + '"]').evaluate((b) => [b.getAttribute('aria-pressed'), getComputedStyle(b).color]);
        assert.deepEqual(destaque, ['true', 'rgb(255, 255, 255)'], aba + ': aba aberta destacada');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), aba + ': rolagem lateral em ' + largura);
        if (largura < 500) await page.screenshot({ path: path.join(saida, largura + '-aba-' + aba + '.png'), fullPage: true });
      }
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026 (revisão): confirmar alteração/baixa espera 1 minuto da leitura da prévia, sem chamar o Omie', () => {
  const a = montar(); a.props.OMIE_GRAVACAO_LIGADA = '1';
  const p = a.f('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 120.5, data: '2026-10-19' } });
  assert.equal(p.ok, true, p.mensagem);
  const consultas = a.omie.filter((c) => c.call === 'ConsultarContaReceber').length;
  const c1 = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c1.ok, false); assert.match(c1.mensagem, /exige 1 minuto[\s\S]*Confirmar de novo daqui a \d+ segundo/);
  assert.equal(a.omie.filter((c) => c.call === 'ConsultarContaReceber').length, consultas, 'não releu o título antes do minuto');
  assert.equal(a.escritas().length, 0);
  vm.runInContext('OMIE_ESPERA_RECONSULTA_MS = 0;', a.ctx);
  const c2 = a.f('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c2.ok, true, c2.mensagem); assert.deepEqual(a.escritas().map((e) => e.call), ['LancarRecebimento']);
});

test('15/11/2026 (revisão): vínculo pela referência exata — revisões aprovadas da mesma proposta não se confundem; excluída fica fora', () => {
  const a = montar(); a.pedidos();
  a.tabelas.COM_PROPOSTAS.unshift({ ID: 'pp0', NUMERO: 'PROP-2026-0042', REVISAO: 0, SITUACAO: 'APROVADA', CLIENTE_ID: 'cc1', TOTAL: 4000 });
  a.tabelas.COM_PROPOSTAS.push({ ID: 'ppx', NUMERO: 'PROP-2026-0050', REVISAO: 0, SITUACAO: 'APROVADA', CLIENTE_ID: 'cc1', TOTAL: 10, EXCLUIDA_EM: '2026-11-01' });
  const reg = (ref) => { const r = a.ctx.OmiePed_registrar_({ codigo_lancamento_integracao: ref, valor_documento: 1 }, { codigo_lancamento_omie: 9 }, { nome: 'Teste' }); return r ? r.PROPOSTA_ID : null; };
  assert.equal(reg('SGO-PROP-2026-0042-R1'), 'pp1', 'revisão 1 exata');
  assert.equal(reg('SGO-PROP-2026-0042-R1-2'), 'pp1', 'parcela da revisão 1');
  assert.equal(reg('SGO-PROP-2026-0042'), 'pp0', 'revisão 0 exata');
  assert.equal(reg('SGO-PROP-2026-0042-1'), 'pp0', 'parcela da revisão 0');
  assert.equal(reg('SGO-PROP-2026-0050'), null, 'proposta excluída não recebe vínculo');
  assert.equal(reg('AVULSO-1'), null);
});

test('15/11/2026: resultado do mês — recebido e pago por categoria, transferências à parte, cancelado e outro mês fora', () => {
  const a = montar(); a.resultado = true;
  const r = a.f('Omie_apiResultado', 'wanessa', { mes: '2026-10' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(r.totais, { receitas: 7500, despesas: 1200.5, resultado: 6299.5, transferencias: 9999 });
  assert.deepEqual(r.receitas.map((i) => [i.descricao, i.grupo, i.titulos, i.valor]), [['Receitas de serviços', 'Receitas', 2, 7500]]);
  assert.deepEqual(r.despesas.map((i) => [i.descricao, i.grupo, i.valor]), [['Combustível', 'Despesas operacionais', 1200.5]]);
  assert.equal(r.transferencias[0].descricao, 'Transferência entre contas');
  const mv = a.omie.find((c) => c.call === 'ListarMovimentos').param; assert.equal(mv.dDtPagtoDe, '01/10/2026'); assert.equal(mv.cTpLancamento, 'CPCR');
  assert.equal(a.f('Omie_apiResultado', 'wanessa', { mes: '2026-12' }).ok, false, 'mês futuro (relógio do ensaio em out/2026)');
  assert.equal(a.f('Omie_apiResultado', 'tiago', { mes: '2026-10' }).ok, false);
  assert.equal(a.escritas().length, 0);
});

test('15/11/2026 (2ª revisão): trocar de aba durante a consulta não prende a fila; CSV mantém número negativo como número', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); a.resultado = true;
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const erros = []; page.on('pageerror', (e) => erros.push(e.message));
    await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
    await page.exposeFunction('qaRun', async (fn, args) => {
      if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
      if (/^(Omie|OmieOps|OmieFat|OmiePed|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
        if (fn === 'Omie_apiResumo') await new Promise((ok) => setTimeout(ok, 800));
        return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
      }
      return { ok: false, erro: 'indisponível no ensaio: ' + fn };
    });
    await page.addInitScript(() => {
      try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
      const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
        (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
      window.google = { script: { run: corredor(null, null) } };
    });
    await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
    await page.evaluate(() => abrir('omie'));
    await page.evaluate(() => OmieTela_abrir_('resultado')); // troca de aba com o resumo ainda carregando
    await page.evaluate(() => { document.getElementById('omieResMes').value = '2026-10'; OmieGest_consultarResultado_(); });
    await page.waitForFunction(() => { const s = document.getElementById('omieResStatus'); return s && /título\(s\)/.test(s.textContent); }, null, { timeout: 6000 });
    // CSV com resultado negativo continua número
    // 16/11/2026: o arquivo só sai depois do registro no servidor (resposta assíncrona)
    await page.evaluate(() => { OMIE_CSV.teste = { cab: ['Tipo', 'Valor'], linhas: [['Resultado', OmieGest_csvNum_(-1234.5)], ['Fórmula', '=SOMA(A1)']] }; window.__csvTxt = ''; var orig = URL.createObjectURL; URL.createObjectURL = function (b) { return 'blob:x'; }; var B = window.Blob; window.Blob = function (p) { window.__csvTxt = p[0]; window.Blob = B; URL.createObjectURL = orig; return new B(p); }; OmieGest_csv_('teste', 't.csv'); });
    await page.waitForFunction(() => window.__csvTxt, null, { timeout: 6000 });
    const linha = await page.evaluate(() => window.__csvTxt);
    assert.match(linha, /Resultado;-1234,50/); assert.match(linha, /Fórmula;'=SOMA\(A1\)/);
    assert.deepEqual(erros, []);
  } finally { await browser.close(); }
});

// ---------------------------------------------------------------------------------------------------------------------
// 16/11/2026 (pedido do dono): SIGILO do Financeiro — só a Diretoria e o Financeiro autorizado (lista de sigilo).
// ---------------------------------------------------------------------------------------------------------------------
const SIGILO_REDUZIDO = '["u_adm","u_dir","u_fin"]'; // fabio (perfil FINANCEIRO) fica de fora, como qualquer outro perfil
test('16/11/2026 sigilo: fora da lista nada passa — nem perfil Financeiro, nem caixa liberada em Acessos, nem Ganhos', () => {
  const a = montar(); a.props.OMIE_SIGILO_CONTAS = SIGILO_REDUZIDO;
  const f = a.f('Omie_apiIniciar', 'fabio');
  assert.equal(f.ver, false); assert.deepEqual(f.poderes, {}); assert.equal(f.configurado, undefined, 'fora da lista nem sabe se o Omie está configurado');
  for (const [fn, dados] of [['Omie_apiResumo', { inicio: '2026-11-01', fim: '2026-11-30' }], ['Omie_apiListar', {}], ['Omie_apiAgenda', { dias: 7 }], ['Omie_apiVencidosClientes', {}], ['OmieOps_apiPrevia', criar], ['OmiePed_apiListar', {}], ['Omie_apiSigilo', {}]]) {
    const r = a.f(fn, 'fabio', dados);
    assert.equal(r.ok, false, fn); assert.match(r.mensagem, /O Financeiro é sigiloso/, fn);
  }
  // Acessos: liberar a caixa para quem está fora da lista é recusado
  vm.runInContext('Poderes_memoLimpar_();', a.ctx);
  const s = JSON.parse(JSON.stringify(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_mat', mudancas: [{ codigo: 'FIN_OMIE_CONSULTAR', valor: 'SIM' }], motivo: 'teste do sigilo do Financeiro' })));
  assert.match(JSON.stringify(s), /sigilosa/);
  assert.ok(!(a.tabelas.SYS_PODERES_EXCECOES || []).some((x) => x.USUARIO_ID === 'u_mat' && x.PODER === 'FIN_OMIE_CONSULTAR'), 'nada gravado');
  // mesmo uma exceção gravada direto na tabela não abre
  (a.tabelas.SYS_PODERES_EXCECOES = a.tabelas.SYS_PODERES_EXCECOES || []).push({ ID: 'x1', USUARIO_ID: 'u_mat', PODER: 'FIN_OMIE_CONSULTAR', VALOR: 'SIM', MOTIVO: 'forçado', ALTERADO_EM: '2026-11-16' });
  vm.runInContext('Poderes_memoLimpar_();', a.ctx);
  assert.equal(a.ctx.SGO_pode_('s_matheusgodoi', 'FIN_OMIE_CONSULTAR'), false);
  assert.match(a.f('Omie_apiListar', 'matheusgodoi').mensagem, /O Financeiro é sigiloso/);
  vm.runInContext('Poderes_memoLimpar_();', a.ctx);
  const tela = JSON.stringify(a.ctx.Poderes_api('s_admin', 'pessoa', { usuarioId: 'u_mat' }));
  const cx = tela.match(/"codigo":"FIN_OMIE_CONSULTAR"[^}]*?"origem":"(\w+)"/);
  assert.equal(cx && cx[1], 'sigilo', 'a tela de Acessos mostra a caixa como fora da lista de sigilo');
  // dentro da lista continua igual
  assert.equal(a.f('Omie_apiListar', 'wanessa').ok, true);
  assert.equal(a.escritas().length, 0);
});

test('16/11/2026 sigilo: consultas e recusas registradas sem valores; Diretoria vê o registro; repetição em 10 min não duplica', () => {
  const a = montar(); a.props.OMIE_SIGILO_CONTAS = SIGILO_REDUZIDO;
  assert.equal(a.f('Omie_apiListar', 'wanessa').ok, true);
  a.f('Omie_apiListar', 'wanessa'); a.f('Omie_apiListar', 'wanessa');
  a.f('Omie_apiListar', 'fabio'); a.f('Omie_apiAgenda', 'tiago', { dias: 7 });
  const reg = a.tabelas.FIN_OMIE_ACESSOS || [];
  assert.equal(reg.filter((r) => r.USUARIO === 'wanessa' && r.RESULTADO === 'PERMITIDO' && r.CONSULTA === 'Omie_apiListar').length, 1);
  assert.deepEqual(reg.filter((r) => r.RESULTADO === 'NEGADO').map((r) => r.USUARIO + ':' + r.CONSULTA).sort(), ['fabio:Omie_apiListar', 'tiago:Omie_apiAgenda']);
  assert.ok(!/120[.,]5|NF-001|Hospital/.test(JSON.stringify(reg)), 'o registro não guarda valores nem nomes do Omie');
  const d = a.f('Omie_apiSigilo', 'dora');
  assert.equal(d.ok, true, d.mensagem); assert.equal(d.diretoria, true); assert.equal(d.negados30, 2);
  assert.ok(d.registro.some((x) => x.consulta === 'Contas a pagar e receber' && x.resultado === 'PERMITIDO'));
  const w = a.f('Omie_apiSigilo', 'wanessa');
  assert.equal(w.ok, true); assert.equal(w.diretoria, false); assert.equal(w.registro, undefined, 'o Financeiro vê quem está na lista, não o registro');
  assert.deepEqual(w.autorizados.map((x) => x.usuario).sort(), ['admin', 'dora', 'wanessa']);
  assert.equal(w.contas, undefined, 'só o responsável recebe a lista de contas para alterar');
});

test('16/11/2026 sigilo: só o responsável altera a lista, com motivo; ele nunca sai; conta de fora não entra; lista vazia/ilegível = padrão', () => {
  const a = montar(); a.props.OMIE_SIGILO_CONTAS = SIGILO_REDUZIDO;
  assert.match(a.f('Omie_apiSigiloSalvar', 'wanessa', { ids: ['u_fin', 'u_fin2'], motivo: 'quero incluir' }).mensagem, /Só o responsável pelo sistema/);
  assert.match(a.f('Omie_apiSigiloSalvar', 'admin', { ids: ['u_fin'], motivo: '' }).mensagem, /motivo/);
  assert.match(a.f('Omie_apiSigiloSalvar', 'admin', { ids: ['u_fin', 'u_cli'], motivo: 'teste com cliente' }).mensagem, /(fora da empresa|não existe)/);
  assert.equal(a.props.OMIE_SIGILO_CONTAS, SIGILO_REDUZIDO, 'nada mudou nas recusas');
  const r = a.f('Omie_apiSigiloSalvar', 'admin', { ids: ['u_fin2'], motivo: 'troca no Financeiro' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(JSON.parse(a.props.OMIE_SIGILO_CONTAS).sort(), ['u_adm', 'u_fin2'], 'o responsável continua; dora e wanessa saem');
  assert.match(a.f('Omie_apiListar', 'wanessa').mensagem, /O Financeiro é sigiloso/);
  assert.equal(a.f('Omie_apiListar', 'fabio').ok, true);
  assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'LISTA_ALTERADA' && /Saiu: .*wanessa/.test(x.DETALHE) && /troca no Financeiro/.test(x.DETALHE)));
  for (const v of ['', '[]', 'lixo{', '{"a":1}']) {
    a.props.OMIE_SIGILO_CONTAS = v;
    assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.OmieSig_lista_())), JSON.parse(JSON.stringify(a.ctx.OMIE_SIGILO_PADRAO)), 'propriedade "' + v + '" = lista padrão');
    assert.match(a.f('Omie_apiListar', 'fabio').mensagem, /O Financeiro é sigiloso/, 'lista padrão nunca abre para contas de teste');
  }
});

test('16/11/2026 sigilo na tela: aba Sigilo e acessos; dados somem após 10 min sem uso e ao sair; planilha baixada fica registrada', { skip: !chromium }, async () => {
  const a = montar(); a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_dir","u_fin"]';
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
    await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
    await page.exposeFunction('qaRun', (fn, args) => {
      if (fn === 'getSessaoAtual') { const s = a.sessoes.s_admin; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_admin' }, s) } }; }
      if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
        vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
        return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
      }
      return { ok: false, erro: 'indisponível no ensaio: ' + fn };
    });
    await page.addInitScript(() => {
      try { sessionStorage.setItem('SGO_SESSION', 's_admin'); } catch (e) {}
      const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
        (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
      window.google = { script: { run: corredor(null, null) } };
    });
    await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
    await page.evaluate(() => abrir('omie'));
    await page.evaluate(() => OmieTela_abrir_('sigilo'));
    await page.waitForSelector('#omieSigCorpo table', { timeout: 5000 });
    const txt = await page.locator('#omieCorpo').innerText();
    assert.match(txt, /O Financeiro é sigiloso/); assert.match(txt, /Contas autorizadas/); assert.match(txt, /Registro de acessos/); assert.match(txt, /Alterar a lista/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral em 390 px');
    await page.screenshot({ path: path.join(saida, '390-aba-sigilo.png'), fullPage: true });
    // planilha: o download vira registro
    await page.evaluate(() => { OMIE_CSV.teste = { cab: ['a'], linhas: [['1']] }; OmieGest_csv_('teste', 'teste.csv'); });
    await page.waitForTimeout(600);
    assert.ok((a.tabelas.FIN_OMIE_ACESSOS || []).some((x) => x.RESULTADO === 'CSV' && /^teste\.csv · 1 linha\(s\) · código [0-9A-F]{4}-[0-9A-F]{4} · resumo [0-9a-f]{16}$/.test(x.DETALHE)), 'download registrado com o código, as linhas e o resumo');
    // 10 minutos sem uso: os dados saem da tela e da memória da planilha
    await page.evaluate(() => { OMIE_SIG.ultimo = Date.now() - 11 * 60 * 1000; OmieSig_conferir_(); });
    assert.equal(await page.locator('#omieCorpo').count(), 0);
    assert.match(await page.locator('#omieTela').innerText(), /Dados ocultados por sigilo/);
    assert.equal(await page.evaluate(() => Object.keys(OMIE_CSV).length), 0);
    await page.screenshot({ path: path.join(saida, '390-sigilo-ocultado.png'), fullPage: true });
    // mostrar de novo e sair: nada do Financeiro fica na página
    await page.evaluate(() => OmieTela_render_());
    await page.waitForSelector('#omieCorpo');
    await page.evaluate(() => logout());
    assert.equal(await page.locator('#omieTela').count(), 0, 'ao sair, o Painel financeiro some da página');
    assert.deepEqual(erros, []);
    await page.close();
  } finally { await browser.close(); }
  assert.equal(a.escritas().length, 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// 16/11/2026: Ficha do cliente (cobrança) — só leitura no Omie, sob o sigilo.
// ---------------------------------------------------------------------------------------------------------------------
function montarFicha() {
  const a = montar();
  a.ctx.CacheService = { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) }; // cada passo lê o Omie simulado de novo
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'SGO_Omie_Cliente.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Omie_Cliente.js' });
  a.tabelas.CAD_CLIENTES = (a.tabelas.CAD_CLIENTES || []).concat([{ ID: 'cc1', RAZAO_SOCIAL: 'Hospital Simulado S.A.', CNPJ: '11222333000181', STATUS: 'ATIVO' }, { ID: 'cc9', RAZAO_SOCIAL: 'Clínica sem CNPJ', CNPJ: '', STATUS: 'ATIVO' }]);
  a.tabelas.COM_PROPOSTAS = [{ ID: 'pp1', NUMERO: 'PROP-1', SITUACAO: 'APROVADA', CLIENTE_ID: 'cc1', TOTAL: 4500 }, { ID: 'pp2', NUMERO: 'PROP-2', SITUACAO: 'ENVIADA', CLIENTE_ID: 'cc1', TOTAL: 100 }];
  const hoje = vm.runInContext('OmieCli_hoje_()', a.ctx);
  const br = (iso) => iso.split('-').reverse().join('/');
  const menos = (d) => { const x = new Date(hoje + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - d); return x.toISOString().slice(0, 10); };
  a.fichaHoje = hoje; a.menos = menos;
  const anterior = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    const b = JSON.parse(op.payload);
    if (b.call === 'ListarClientes' && a.inativo) { a.omie.push({ url, call: b.call, param: b.param[0] }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ clientes_cadastro: [{ codigo_cliente_omie: 12, razao_social: 'Hospital Simulado S.A.', inativo: 'S' }] }) }; }
    if (b.call === 'ListarMovimentos' && b.param[0].nCodCliente !== undefined) {
      a.omie.push({ url, call: b.call, param: b.param[0] });
      const mov = a.misturado ? [{ detalhes: { nCodTitulo: 900, nCodCliente: 77, dDtVenc: br(menos(5)), cNatureza: 'R' }, resumo: { nValAberto: 10 } }] : [
        { detalhes: { nCodTitulo: 1, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(40)), cNumDocFiscal: '101', cNumParcela: '001/002' }, resumo: { nValAberto: 1000, nValPago: 0 } },
        { detalhes: { nCodTitulo: 2, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(10)), cNumDocFiscal: '102' }, resumo: { nValAberto: 300, nValPago: 200 } },
        { detalhes: { nCodTitulo: 3, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(-15)), cNumDocFiscal: '103' }, resumo: { nValAberto: 500, nValPago: 0 } },
        { detalhes: { nCodTitulo: 4, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(60)), dDtPagamento: br(menos(50)), cNumDocFiscal: '90', cStatus: 'RECEBIDO' }, resumo: { nValAberto: 0, nValPago: 800 } },
        { detalhes: { nCodTitulo: 5, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(30)), dDtPagamento: br(menos(30)), cNumDocFiscal: '91', cStatus: 'RECEBIDO' }, resumo: { nValAberto: 0, nValPago: 700 } },
        { detalhes: { nCodTitulo: 6, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(5)), cStatus: 'CANCELADO' }, resumo: { nValAberto: 999, nValPago: 0 } },
        { detalhes: { nCodTitulo: 7, nCodCliente: 12, cNatureza: 'R', dDtVenc: br(menos(500)), dDtPagamento: br(menos(400)), cStatus: 'RECEBIDO' }, resumo: { nValAberto: 0, nValPago: 50 } },
        { detalhes: { nCodTitulo: 8, nCodCliente: 77, cNatureza: 'R', dDtVenc: br(menos(5)) }, resumo: { nValAberto: 12345 } }];
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ nTotPaginas: 1, movimentos: mov }) };
    }
    return anterior(url, op);
  };
  return a;
}

test('16/11/2026 ficha do cliente: busca no SGO+ sem Omie; ficha pelo CNPJ com saldo em aberto, vencido, recebidos em 12 meses e atraso', () => {
  const a = montarFicha(); a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_dir","u_fin"]';
  const b = a.f('Omie_apiClienteBuscar', 'wanessa', { q: 'hospital' });
  assert.equal(b.ok, true, b.mensagem); assert.equal(b.clientes[0].cnpj, '11222333000181');
  assert.equal(a.omie.length, 0, 'a busca não chama o Omie');
  assert.match(a.f('Omie_apiClienteBuscar', 'wanessa', { q: 'ho' }).mensagem, /3 letras/);
  const r = a.f('Omie_apiClienteFicha', 'wanessa', { cnpj: '11222333000181' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.nomeOmie, 'Hospital Simulado S.A.'); assert.equal(r.cnpj, '11.222.333/0001-81');
  assert.equal(r.totais.aberto, 1800); assert.equal(r.totais.titulosAbertos, 3);
  assert.equal(r.totais.vencido, 1300); assert.equal(r.totais.titulosVencidos, 2); assert.equal(r.totais.maiorAtraso, 40); assert.equal(r.totais.maisAntigo, a.menos(40));
  assert.equal(r.totais.recebido12m, 1500, 'só os 12 últimos meses, sem cancelado e sem outro cliente'); assert.equal(r.totais.recebimentos12m, 2);
  assert.equal(r.totais.pagosComAtraso, 1); assert.equal(r.totais.mediaAtraso, 5);
  assert.deepEqual(r.abertos.map((x) => x.documento), ['101', '102', '103']); assert.equal(r.abertos[1].pagoParcial, true); assert.equal(r.abertos[2].atraso, 0);
  assert.ok(!JSON.stringify(r).includes('12345'), 'título de outro cliente fica fora');
  assert.equal(r.propostasAprovadas, 1); assert.equal(r.totalPropostas, 4500);
  const mov = a.omie.filter((c) => c.call === 'ListarMovimentos');
  assert.deepEqual(mov.map((c) => [c.param.cTpLancamento, c.param.nCodCliente]), [['CR', 12]]);
  assert.equal(a.escritas().length, 0);
});

test('16/11/2026 ficha do cliente: sem CNPJ, sem cadastro no Omie, Omie sem filtro e fora do sigilo — nada é mostrado', () => {
  const a = montarFicha(); a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_dir","u_fin"]';
  assert.match(a.f('Omie_apiClienteFicha', 'wanessa', { cnpj: '' }).mensagem, /sem CNPJ válido/);
  const s = a.f('Omie_apiClienteFicha', 'wanessa', { cnpj: '99888777000166' });
  assert.equal(s.ok, true); assert.equal(s.semCadastroOmie, true); assert.match(s.mensagem, /não tem cadastro no Omie/);
  a.misturado = true;
  assert.match(a.f('Omie_apiClienteFicha', 'wanessa', { cnpj: '11222333000181' }).mensagem, /não filtrou os títulos por cliente/);
  a.misturado = false;
  const movAntes = a.omie.filter((c) => c.call === 'ListarMovimentos' && c.param.nCodCliente !== undefined).length;
  a.inativo = true; // cliente inativo no Omie: os títulos continuam valendo e aparecem, com aviso
  const ina = a.f('Omie_apiClienteFicha', 'wanessa', { cnpj: '11222333000181' });
  assert.equal(ina.ok, true, ina.mensagem); assert.equal(ina.inativosOmie, 1); assert.equal(ina.porDocumento, true);
  assert.equal(ina.totais.titulosAbertos, 1); assert.equal(ina.abertos[0].aberto, 120.5, 'pelo valor do documento (ListarContasReceber pelo CNPJ)');
  assert.equal(a.omie.filter((c) => c.call === 'ListarMovimentos' && c.param.nCodCliente !== undefined).length, movAntes, 'código inativo não vai ao ListarMovimentos (o Omie recusa)');
  a.inativo = false;
  const antes = a.omie.length;
  assert.match(a.f('Omie_apiClienteFicha', 'fabio', { cnpj: '11222333000181' }).mensagem, /O Financeiro é sigiloso/);
  assert.match(a.f('Omie_apiClienteBuscar', 'tiago', { q: 'hospital' }).mensagem, /O Financeiro é sigiloso/);
  assert.equal(a.omie.length, antes, 'fora do sigilo, nenhuma chamada ao Omie');
});

test('16/11/2026 ficha do cliente na página completa (390 px): busca, ficha com cartões, tabelas e planilha', { skip: !chromium }, async () => {
  const a = montarFicha(); a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_dir","u_fin"]';
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
    await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
    await page.exposeFunction('qaRun', (fn, args) => {
      if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
      if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
        vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
        return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
      }
      return { ok: false, erro: 'indisponível no ensaio: ' + fn };
    });
    await page.addInitScript(() => {
      try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
      const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
        (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
      window.google = { script: { run: corredor(null, null) } };
    });
    await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
    await page.evaluate(() => abrir('omie'));
    await page.evaluate(() => OmieTela_abrir_('cliente'));
    await page.fill('#omieCliBusca', 'hospital');
    await page.click('#omieTela form.omie-barra button[type=submit]');
    await page.waitForSelector('.omie-cli-item', { timeout: 5000 });
    await page.click('.omie-cli-item');
    await page.waitForSelector('#omieCliFicha table', { timeout: 5000 });
    const txt = await page.locator('#omieCliFicha').innerText();
    assert.match(txt, /Hospital Simulado S\.A\. · 11\.222\.333\/0001-81/); assert.match(txt, /Vencido/); assert.match(txt, /Atraso médio ao pagar/);
    assert.match(txt, /40 dias/); assert.match(txt, /pago em parte/); assert.match(txt, /Baixar planilha/); assert.match(txt, /1 proposta\(s\) aprovada\(s\)/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral em 390 px');
    await page.screenshot({ path: path.join(saida, '390-ficha-cliente.png'), fullPage: true });
    assert.deepEqual(erros, []);
    await page.close();
  } finally { await browser.close(); }
  assert.equal(a.escritas().length, 0);
});

test('16/11/2026: "Como fazer nesta aba" em todas as abas e explicação embaixo de cada campo (lançamento, baixa, provisão, conciliação, notas), 390, 320 e 1366 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = montar(); a.pedidos();
  const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const HTML = ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(VER, '""');
  assert.match(HTML, /var OMIE_DICAS = \{/, 'JS_Omie_Ajuda incluído na página');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320, 1366]) {
      const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { erros.push('janela do navegador: ' + d.message()); d.dismiss().catch(() => {}); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') { const s = a.sessoes.s_wanessa; return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_wanessa' }, s) } }; }
        if (/^(Omie|OmieOps|OmieFat|OmieConc|OmiePed|Viagem_api|Poderes_api|CajuConc_api)/.test(fn) && typeof a.ctx[fn] === 'function') {
          vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
          return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn](...args) || null)) };
        }
        return { ok: false, erro: 'indisponível no ensaio: ' + fn };
      });
      await page.addInitScript(() => {
        try { sessionStorage.setItem('SGO_SESSION', 's_wanessa'); } catch (e) {}
        const corredor = (ok, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(ok, f) : k === 'withUserObject' ? () => corredor(ok, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (ok) ok(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 15000 });
      await page.evaluate(() => abrir('omie'));
      const abas = await page.evaluate(() => OMIE_ABAS.map((x) => x[0]));
      for (const aba of abas) {
        await page.evaluate((x) => OmieTela_abrir_(x), aba);
        await page.waitForTimeout(500);
        const guia = await page.evaluate(() => { const g = document.querySelector('#omieCorpo [data-omie-guia]'); return g ? [g.getAttribute('data-omie-guia'), g.open, g.querySelectorAll('li').length] : null; });
        assert.ok(guia && guia[0] === aba && guia[1] === true && guia[2] >= 1, aba + ': guia "Como fazer nesta aba" aberto: ' + JSON.stringify(guia));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), aba + ': rolagem lateral em ' + largura);
      }
      // campos sem explicação (as caixas de marcar da conciliação e do sigilo são explicadas no guia)
      const semDica = (sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s + ' input, ' + s + ' select, ' + s + ' textarea')).filter((el) => {
        if (el.type === 'hidden' || el.type === 'checkbox') return false;
        if ((el.getAttribute('aria-describedby') || '').trim()) return false;
        const b = el.closest('.omie-barra, .cadx-faixa');
        return !(b && b.nextElementSibling && b.nextElementSibling.classList.contains('omie-dica-barra'));
      }).map((el) => el.name || el.id), sel);
      await page.evaluate(() => OmieTela_abrir_('lancamentos'));
      await page.waitForTimeout(600);
      await page.evaluate(() => OmieOps_form_('criar'));
      await page.waitForSelector('#omieOpsForm');
      await page.waitForTimeout(400);
      assert.deepEqual(await semDica('#omieOpsForm'), [], 'novo lançamento: todo campo com explicação');
      const textos = await page.evaluate(() => Array.from(document.querySelectorAll('#omieOpsForm .omie-dica')).map((d) => d.textContent));
      assert.ok(textos.some((t) => /Buscar no Omie: digite o CNPJ/.test(t)) && textos.some((t) => /Só aparecem categorias de receita/.test(t)) && textos.some((t) => /Um código único/.test(t)), 'textos do lançamento a receber');
      assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#omieOpsForm .omie-dica')).textAlign === 'justify'), 'explicação justificada');
      assert.deepEqual(await semDica('#omieCorpo .cadx-faixa'), [], 'filtros da aba com a linha de explicação');
      if (largura < 500) await page.screenshot({ path: path.join(saida, largura + '-ajuda-novo-lancamento.png'), fullPage: true });
      await page.evaluate(() => OmieOps_form_('baixar', 101));
      await page.waitForFunction(() => document.querySelector('#omieOpsForm [name="desconto"]'), null, { timeout: 10000 });
      await page.waitForTimeout(400);
      assert.deepEqual(await semDica('#omieOpsForm'), [], 'baixa: todo campo com explicação');
      assert.match(await page.locator('#omieOpsForm').innerText(), /Valor da baixa: o valor que entrou ou saiu da conta/); // 16/11/2026 (B1)
      assert.match(await page.locator('#omieOpsForm').innerText(), /Baixa com acréscimo ou desconto: confirmar no primeiro uso acompanhado/);
      if (largura < 500) await page.screenshot({ path: path.join(saida, largura + '-ajuda-baixa.png'), fullPage: true });
      await page.evaluate(() => OmieTela_abrir_('provisoes'));
      await page.waitForTimeout(600);
      await page.evaluate(() => { const d = document.querySelector('#omieCorpo details:not([data-omie-guia])'); if (d) d.open = true; });
      assert.deepEqual(await semDica('#omieProvForm'), [], 'provisão: todo campo com explicação');
      assert.match(await page.locator('#omieProvForm').innerText(), /Despesa prevista" para algo que a empresa vai pagar/);
      await page.evaluate(() => OmieTela_abrir_('conciliacao'));
      await page.waitForTimeout(600);
      assert.deepEqual(await semDica('#omieCorpo'), [], 'conciliação: filtros explicados');
      await page.evaluate(() => OmieTela_abrir_('notas'));
      await page.waitForTimeout(500);
      assert.deepEqual(await semDica('#omieCorpo'), [], 'notas: campos explicados');
      // fechar o guia é lembrado na próxima vez
      await page.evaluate(() => { const g = document.querySelector('[data-omie-guia]'); g.open = false; });
      await page.waitForTimeout(200);
      await page.evaluate(() => OmieTela_abrir_('resumo')); await page.waitForTimeout(300);
      await page.evaluate(() => OmieTela_abrir_('notas')); await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => document.querySelector('[data-omie-guia]').open), false, 'guia fechado continua fechado');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral em ' + largura);
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
  assert.equal(a.escritas().length, 0);
});
