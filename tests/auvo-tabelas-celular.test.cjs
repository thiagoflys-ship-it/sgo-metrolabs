// Integração Auvo (27/10/2026, print do dono no iPhone): no celular a tabela "Pendências de fechamento" ficava
// espremida (nome e tarefa uma letra por linha, botão "Ver no Auvo" fora da tela). Agora, até 760 px, cada linha
// das tabelas da tela vira um cartão com o nome da coluna acima do valor (data-rot) e botões de 44 px.
// Código real da tela (SGO_Auvo_ConteudoModulo.js) num contexto isolado; o documento é simulado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');

function tela() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Auvo_ConteudoModulo.js'), 'utf8'), ctx, { filename: 'SGO_Auvo_ConteudoModulo.js' });
  return ctx.AUVO_CONTEUDO_MODULO;
}

function scriptDaTela(html) {
  const ini = html.indexOf('<script>');
  const fim = html.lastIndexOf('</script>');
  assert.ok(ini !== -1 && fim > ini, 'a tela tem o bloco <script>');
  const elementos = {};
  const ctx = vm.createContext({
    document: { getElementById: (id) => (elementos[id] = elementos[id] || { innerHTML: '', value: '', id }) },
    window: {}, console
  });
  vm.runInContext(html.slice(ini + 8, fim), ctx, { filename: 'tela-auvo.js' });
  return { ctx, elementos };
}

function celulas(html) {
  return html.match(/<td\b[^>]*>/g) || [];
}

test('pendências: cada célula leva o nome da coluna e a de ações não leva rótulo', () => {
  const { ctx, elementos } = scriptDaTela(tela());
  ctx.tplAuvo_renderPendenciasTabela_([{
    TECNICO_NOME: 'Bruno', TECNICO_ID_SGO: 'u1', TASK_TYPE_DESCRICAO: "RELATÓRIO METROLAB'S", CLIENTE_NOME: 'RESÍDUO ZERO AMBIENTAL S.A.',
    TASK_DATE: '2024-04-09T08:00:00', DIAS_ABERTA: 901, TEM_EVIDENCIA: 'SIM', OCORRENCIAS_ABERTAS: 0, TASK_URL: 'https://app.auvo.com.br/x'
  }]);
  const html = elementos.tplAuvo_pendBody.innerHTML;
  const tds = celulas(html);
  assert.equal(tds.length, 5);
  assert.deepEqual(tds.map((t) => (t.match(/data-rot="([^"]*)"/) || [])[1]),
    ['Técnico responsável', 'Tarefa', 'Pendência', 'Cobranças', '']);
  assert.match(tds[4], /class="celula-acoes"/);
  assert.match(html, /Ver no Auvo/);
  assert.match(html, /Aberta há 901 dias/);
});

test('clientes, usuários, auditoria e amostras também viram cartão no celular', () => {
  const { ctx, elementos } = scriptDaTela(tela());
  ctx.tplAuvo_renderClientesTabela_([{ id: 'c1', nome: 'Hospital X', cnpj: '00.000.000/0001-00', status: 'ERRO', ultimoErro: 'falhou' },
    { id: 'c2', nome: 'Hospital Y', cnpj: '', status: 'OK', ultimoErro: '' }]);
  const cli = celulas(elementos.tplAuvo_clientesBody.innerHTML);
  assert.equal(cli.length, 10);
  assert.ok(cli.every((t) => /data-rot="/.test(t)), 'toda célula de cliente tem data-rot');
  assert.match(elementos.tplAuvo_clientesBody.innerHTML, /data-rot="Último erro">falhou/);
  // sem erro, a célula não mostra o rótulo vazio
  assert.match(elementos.tplAuvo_clientesBody.innerHTML, /class="muted" data-rot=""><\/td>/);

  ctx.tplAuvo_renderTecnicosTabela_([{ id: 't1', nome: 'Ana', perfil: 'TECNICO', email: 'a@b.c', status: 'OK', ultimoErro: '' }]);
  const tec = celulas(elementos.tplAuvo_tecnicosBody.innerHTML);
  assert.equal(tec.length, 6);
  assert.ok(tec.every((t) => /data-rot="/.test(t)));

  ctx.tplAuvo_renderAuditoriaNomes_({ achados: [{ similaridade: 92, tipo: 'NOME_PARECIDO', itens: [{ nome: 'A', cnpjRaiz: '1', qtdUnidadesAuvo: 1 }] }], totalAchados: 1, totalGruposAnalisados: 3 });
  const aud = celulas(elementos.tplAuvo_auditoriaResultado.innerHTML);
  assert.equal(aud.length, 3);
  assert.ok(aud.every((t) => /data-rot="[^"]+"/.test(t)));
});

test('nenhuma célula de dados da tela fica sem data-rot no código', () => {
  const html = tela();
  const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
  // células montadas em JS (strings entre aspas simples): '<td>' cru não é aceito; as do manual (HTML fixo) não contam
  const cru = script.match(/'<tr><td>|'<td>|<\/td><td>'/g) || [];
  assert.deepEqual(cru, []);
});

test('CSS: até 760 px a tabela vira cartão; no computador fica como estava', () => {
  const html = tela();
  const m = html.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'existe o bloco @media (max-width: 760px)');
  const css = m[1];
  assert.match(css, /table\.tabela-resultado thead \{ display: none; \}/);
  assert.match(css, /table\.tabela-resultado td \{ display: block; width: 100%; box-sizing: border-box; \}|tr, #tplAuvoContainer table\.tabela-resultado td \{ display: block;/);
  assert.match(css, /td\[data-rot\]::before \{ content: attr\(data-rot\); display: block;/);
  assert.match(css, /td\[data-rot=""\]::before \{ display: none; \}/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /\.btn \{ min-height: 44px;/);
  // a rolagem horizontal antiga (que espremia as colunas) saiu
  assert.doesNotMatch(html, /tabela-resultado \{ display: block; overflow-x: auto; \}/);
  // regra do computador intacta
  assert.match(html, /#tplAuvoContainer table\.tabela-resultado \{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; \}/);
});

test('ajuda e manual explicam o cartão no celular e a contagem de dias', () => {
  const ctxA = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8'), ctxA);
  const ajuda = JSON.stringify(ctxA.SGO_ajudaTelas_Auvo_().auvo);
  assert.match(ajuda, /tabelas da tela viram cartões/);
  assert.match(ajuda, /Aberta há N dias/);
  const html = tela();
  assert.match(html, /No celular, cada O\.S\. aparece como um cartão/);
  assert.match(html, /cerca de 3 anos para trás/);
});
