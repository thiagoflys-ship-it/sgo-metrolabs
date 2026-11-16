// Janela de decisão do preço do catálogo (11/11/2026, pedido do dono: "por que na tela do Charles não abriu algo bem detalhado mostrando
// preço e os cálculos para ele decidir?"). Página real do Comercial (JS_Comercial.html) num navegador sem tela, com o servidor real do SGO+
// em memória (tests/_comercial_ambiente.cjs) atendendo as chamadas. Cinco itens fictícios no molde dos reais (custo / preço): 5.100 / 11.100;
// 25,26 / 49,99; 4.049 / 9.450; 1.187 / 3.250; 134,75 / 400. Capturas em 390 px e 1280 px em output/diretoria-avisos/telas/.
// Nada sai de verdade; nenhuma chamada à produção. Uso: node --require <fontes.cjs> tests/diretoria-preco-decisao-navegador.cjs
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), { createRequire } = require('module');
const { chromium } = createRequire('C:/Users/venda/projetos/sgo_servidor/package.json')('playwright');
const { ambiente } = require('./_comercial_ambiente.cjs');

const OUT = path.join(__dirname, '../output/diretoria-avisos/telas');
const ITENS = [['QT-AUTOCLAVE', 'Qualificação térmica de autoclave (modelo)', 'PRODUTO', 5100, 11100], ['FONTE-9V', 'Fonte 9 V para registrador (modelo)', 'PRODUTO', 25.26, 49.99],
  ['BOMBA-VAC', 'Bomba de vácuo de reposição (modelo)', 'PRODUTO', 4049, 9450], ['SENSOR-PT100', 'Sensor PT100 com certificado (modelo)', 'PRODUTO', 1187, 3250], ['VERIF-BALANCA', 'Verificação de balança (modelo)', 'SERVICO', 134.75, 400]];

(async () => {
  const a = ambiente({ agora: Date.parse('2026-10-19T10:46:00-03:00') });
  a.tabelas.COM_PRODUTOS = ITENS.map(([cod, nome, tipo, custo, preco], i) => ({ ID: 'p' + i, CODIGO: cod, NOME: nome, TIPO: tipo, UNIDADE_MEDIDA: 'un', PRECO: preco, CUSTO: custo, ATIVO: 'SIM',
    PRECO_PEDIDO: preco, PRECO_PEDIDO_SITUACAO: 'PENDENTE', PRECO_PEDIDO_POR_ID: 'u_ven', PRECO_PEDIDO_POR_NOME: 'VERA VENDEDORA TESTE', PRECO_PEDIDO_EM: '2026-10-19T09:40:00',
    PRECO_PEDIDO_MOTIVO: 'Cadastro novo pela equipe comercial: cliente pediu o item na proposta desta semana', CUSTO_COTACAO_ID: 'cot' + i, CUSTO_COTACAO_VALOR: custo, CUSTO_VALIDO_ATE: '2026-12-31', CUSTO_FORNECEDOR: 'Distribuidora Teste Ltda',
    CRIADO_EM: '2026-10-19T12:40:00.000Z' }));
  a.tabelas.COM_CUSTOS_COTACOES = ITENS.map(([cod, , , custo], i) => ({ ID: 'cot' + i, PRODUTO_ID: 'p' + i, VERSAO: 1, CUSTO: custo, CUSTO_ANTERIOR: '', FORNECEDOR: 'Distribuidora Teste Ltda', COTACAO_NUMERO: 'COT-' + (70 + i),
    COTACAO_DATA: '2026-10-15', COTACAO_VALIDADE: '2026-12-31', VALIDO_ATE: '2026-12-31', ARQUIVO_ID: '', ARQUIVO_NOME: 'cotacao-' + cod.toLowerCase() + '.pdf', SITUACAO: 'VIGENTE', ANEXADO_POR_NOME: 'GASPAR GESTOR COMERCIAL TESTE', ANEXADO_EM: '2026-10-15T14:00:00' }));
  const ini = a.api('s_dora', 'iniciar'); assert(ini.ok, ini.message);
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 390, height: 900 } }), erros = [], dialogos = [], acoes = [];
  try {
    p.on('pageerror', (e) => erros.push(e.message));
    p.on('dialog', (d) => { dialogos.push(d.type() + ': ' + d.message()); d.dismiss(); });
    await p.exposeFunction('qaComercial', async (acao, dados) => { acoes.push(acao); const r = a.api('s_dora', acao, dados); if (!r.ok) throw new Error(r.message); return r; });
    await p.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--border:#cfd6d1;--card:#fff;--text:#24362c;--muted:#5b6860;--bg:#f8faf8;--danger:#b3261e;--danger-bg:#fdecea;--warning:#9a5b00;--warning-bg:#fff4e0;--success:#1e7a3c;--success-bg:#e6f4ea}' +
      'body{margin:0;font:14px Arial;background:var(--bg);color:var(--text)}button{padding:10px 12px;max-width:100%;min-height:40px}.btn-primary{background:#1f5f3c;color:#fff;border:0;border-radius:6px}.btn-secondary{background:#fff;border:1px solid var(--border);border-radius:6px}' +
      '.atv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);overflow:auto;padding:8px}.atv-modal{background:var(--card);border-radius:10px;margin:0 auto;box-sizing:border-box;width:100%}.atv-modal-cab{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)}' +
      '.atv-modal-cab h3{margin:0;font-size:16px}.atv-modal-corpo{padding:12px 14px}.atv-modal-rod{padding:10px 14px;border-top:1px solid var(--border);text-align:right}textarea,input{width:100%;box-sizing:border-box;padding:8px;font:inherit}label{font-weight:700;font-size:12.5px}</style><div id="conteudo"></div>');
    const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
    await p.addStyleTag({ content: html.match(/<style>([\s\S]*?)<\/style>/)[1] });
    await p.addScriptTag({ content: 'window.escapeHtml_=v=>String(v??"").replace(/[&<>"\x27]/g,c=>"&#"+c.charCodeAt(0)+";");window.USER_CONTEXT={perfil:"DIRETORIA",userId:"u_dir"};window.SGO_iniciarCarregamento_=()=>{};window.SGO_finalizarCarregamento_=()=>{};' });
    await p.addScriptTag({ content: html.match(/<script>([\s\S]*?)<\/script>/)[1] });
    await p.evaluate((ini) => { CM.ini = ini; Com_chamar_ = (acao, d, ok, falha) => window.qaComercial(acao, d).then(ok).catch((e) => (falha ? falha(String(e.message).replace(/^Error: /, '')) : Promise.reject(e))); }, ini);
    const abrir = async (i) => {
      await p.evaluate(() => document.querySelectorAll('.atv-overlay').forEach((x) => x.remove()));
      await p.evaluate((id) => Comercial_decidirPreco_({ id }), 'p' + i);
      await p.getByText('A conta do preço pedido').waitFor();
    };
    const relatorio = [];
    for (let i = 0; i < ITENS.length; i++) {
      await abrir(i);
      const txt = await p.locator('.atv-modal').innerText();
      assert.match(txt, /− Impostos/); assert.match(txt, /− Comissão/); assert.match(txt, /= Sobra/); assert.match(txt, /Preço mínimo/); assert.match(txt, /Preço sugerido/); assert.match(txt, /Distribuidora Teste Ltda/);
      const selo = await p.locator('.cm-dp-conta .l.t').getAttribute('class');
      relatorio.push({ item: ITENS[i][0], custo: ITENS[i][3], preco: ITENS[i][4], selo: selo.replace('l t ', ''), conta: (txt.match(/R\$ [\d.,]+ − impostos[^\n]*/) || [''])[0] });
      for (const w of [390, 1280]) {
        await p.setViewportSize({ width: w, height: 900 });
        assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral em ' + w + ' px');
        await p.screenshot({ path: path.join(OUT, 'decidir-preco-' + (i + 1) + '-' + ITENS[i][0].toLowerCase() + '-' + w + '.png'), fullPage: true });
      }
    }
    // outro preço: a conta do preço informado, sem gravar
    await p.setViewportSize({ width: 390, height: 900 });
    await abrir(3);
    await p.locator('input[name="cmDpOp"][value="OUTRO"]').check();
    await p.locator('#cmDpOutro').fill('3.300,00');
    await p.getByRole('button', { name: 'Ver a conta deste preço' }).click();
    await p.locator('#cmDpOutroConta .cm-dp-conta').waitFor();
    await p.screenshot({ path: path.join(OUT, 'decidir-preco-outro-preco-390.png'), fullPage: true });
    assert.equal(a.tabelas.COM_PRODUTOS[3].PRECO_PEDIDO_SITUACAO, 'PENDENTE', 'ver a conta não decide');
    // fundamentação curta: a mensagem aparece na tela, nada é gravado
    await p.getByRole('button', { name: /Aprovar com o outro preço/ }).click();
    await p.locator('#cmDpMsg .cm-faixa').waitFor();
    assert.match(await p.locator('#cmDpMsg').innerText(), /fundamentação/);
    // aprovar o primeiro item com o preço sugerido
    await abrir(0);
    await p.locator('input[name="cmDpOp"][value="SUGERIDO"]').check();
    await p.locator('#cmDpTexto').fill('Preço do pedido deixava a sobra abaixo da mínima; vale o sugerido da política');
    await p.locator('#cmDpAprovar').click();
    await p.getByText(/Preço aprovado com o preço sugerido/).waitFor();
    await p.screenshot({ path: path.join(OUT, 'decidir-preco-aprovado-sugerido-390.png'), fullPage: true });
    const p0 = a.tabelas.COM_PRODUTOS[0];
    assert.equal(p0.PRECO_PEDIDO_SITUACAO, 'APROVADO'); assert.equal(Number(p0.PRECO), 13970);
    assert.deepEqual(dialogos, [], 'nenhum alert, confirm ou prompt');
    assert.deepEqual(erros, []);
    fs.writeFileSync(path.join(OUT, 'relatorio.json'), JSON.stringify({ situacao: 'NAVEGADOR_SINTETICO_PASS', larguras: [390, 1280], itens: relatorio, acoes, dialogos, erros, chamadasProducao: 0 }, null, 2));
    console.log('Navegador PASS'); console.log(JSON.stringify(relatorio, null, 1));
  } catch (e) {
    await p.screenshot({ path: path.join(OUT, 'falha.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT, 'falha.json'), JSON.stringify({ erro: e.message, erros, dialogos, acoes }));
    throw e;
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
