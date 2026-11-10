// Tela comum de "Abrir para corrigir" / "Usar como base" (JS_DocRevisao.html, 21/10/2026): campos guardados e devolvidos
// (com lista que carrega depois), motivo exigido, chamada ao servidor observada sem mudar as outras, e ligação nas telas.
// DOM mínimo simulado; só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8');

function criarTela() {
  const els = {};
  function campo(id, tagName, extra) {
    const e = Object.assign({ id, tagName, type: '', value: '', checked: false, readOnly: false, title: '', eventos: [], options: [], multiple: false,
      dispatchEvent(ev) { this.eventos.push(ev.type); return true; }, focus() {}, scrollIntoView() {}, getAttribute() { return null; },
      addEventListener() {} }, extra || {});
    els[id] = e;
    return e;
  }
  const raiz = { id: 'raiz', filhos: [], querySelectorAll: () => raiz.filhos, insertBefore(d) { els[d.id] = d; }, appendChild(d) { els[d.id] = d; }, firstChild: null };
  els.raiz = raiz;
  const document = {
    getElementById: id => els[id] || null,
    createElement: () => ({ id: '', innerHTML: '', style: {}, parentNode: { removeChild() {} } }),
    querySelectorAll: () => []
  };
  return { els, raiz, campo, document };
}

function carregar(tela, extra) {
  const chamadas = [];
  const runner = (cadeia) => new Proxy({}, {
    get(_, nome) {
      if (nome === 'withSuccessHandler' || nome === 'withFailureHandler' || nome === 'withUserObject') return f => runner(cadeia.concat([[nome, f]]));
      return (...args) => { chamadas.push({ nome, args, cadeia }); const ok = (cadeia.filter(c => c[0] === 'withSuccessHandler').pop() || [])[1]; if (ok) ok({ ok: true, id: 'X1', resposta: nome }); };
    }
  });
  const window = { console, alertas: [] };
  const ctx = vm.createContext(Object.assign({
    window, document: tela.document, console, setTimeout: (f) => { f(); return 1; }, Event: function (t) { this.type = t; }, Proxy,
    alert: m => window.alertas.push(m), confirm: () => true, google: { script: { run: runner([]) } }, SGO_getSessionId: () => 'sessao-teste'
  }, extra || {}));
  window.google = ctx.google;
  const html = ler('JS_DocRevisao.html');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], ctx);
  return { ctx, window, chamadas, API: window.SGO_DocRev };
}

test('campos: guarda todos com id (menos senha e arquivo) e devolve, esperando a lista carregar', () => {
  const t = criarTela();
  const a = t.campo('nome', 'INPUT', { type: 'text', value: 'Hospital Teste' });
  const b = t.campo('lab', 'INPUT', { type: 'checkbox', checked: true });
  const c = t.campo('lista', 'SELECT', { value: 'u2', options: [{ value: '' }, { value: 'u2' }] });
  const d = t.campo('modoPersonalizadoSenha', 'INPUT', { type: 'text', value: 'segredo' });
  const e = t.campo('arq', 'INPUT', { type: 'file', value: 'C:\\x' });
  const g = t.campo('grande', 'TEXTAREA', { value: 'x'.repeat(5000) });
  t.raiz.filhos = [a, b, c, d, e, g];
  const { API } = carregar(t);
  const f = API.capturar('raiz');
  assert.deepEqual(Object.keys(f).sort(), ['grande', 'lab', 'lista', 'nome']);
  assert.equal(API.capturar('raiz', 4000).grande, undefined, 'campo grande fica de fora quando há limite');
  // devolver: a lista ainda não tem a opção; ela "carrega" na segunda tentativa
  a.value = ''; b.checked = false; c.value = ''; c.options = [{ value: '' }];
  let tentativas = 0;
  const tela2 = Object.assign({}, t);
  const orig = t.document.getElementById;
  t.document.getElementById = id => { if (id === 'lista' && ++tentativas === 2) c.options.push({ value: 'u2' }); return orig(id); };
  let faltaram = null;
  API.restaurar('raiz', f, r => { faltaram = r; });
  assert.equal(a.value, 'Hospital Teste');
  assert.equal(b.checked, true);
  assert.equal(c.value, 'u2');
  assert.deepEqual(Array.from(faltaram), []);
  assert.ok(a.eventos.includes('change'), 'a tela recebe o aviso de mudança');
});

test('motivo exigido na correção; pedido leva modo, origem, motivo e campos', () => {
  const t = criarTela();
  const n = t.campo('numero', 'INPUT', { type: 'text', value: '' });
  t.raiz.filhos = [n];
  const respostaAbrir = { ok: true, id: 'DR-1', modo: 'CORRIGIR', payload: { a: 1 }, form: { numero: 'N-9' }, info: { numero: 'N-9', rotuloOrigem: 'Rev. 00', rotuloProxima: 'Rev. 01' } };
  const { API, ctx } = carregar(t);
  ctx.google.script.run = new Proxy({}, { get(_, nome) { if (/^with/.test(nome)) return f => { if (nome === 'withSuccessHandler') ctx.__ok = f; return ctx.google.script.run; }; return () => ctx.__ok(respostaAbrir); } });
  API.registrar('MOD', { raiz: 'raiz', faixa: 'raiz', campoNumero: 'numero' });
  assert.equal(API.validar('MOD'), '', 'sem correção, nada a exigir');
  API.abrir('MOD', 'DR-1', 'CORRIGIR');
  assert.equal(API.ativo('MOD'), 'CORRIGIR');
  assert.equal(n.value, 'N-9');
  assert.equal(n.readOnly, true, 'número travado na correção');
  assert.match(API.validar('MOD'), /motivo da revisão \(ao menos 10 caracteres\)/);
  t.els.sgoDocRevMotivo_MOD = { value: 'Correção do número de série' };
  assert.equal(API.validar('MOD'), '');
  const p = API.pedido('MOD');
  assert.equal(p.modo, 'CORRIGIR');
  assert.equal(p.origemId, 'DR-1');
  assert.equal(p.motivo, 'Correção do número de série');
  assert.equal(p.form.numero, 'N-9');
  API.concluido('MOD');
  assert.equal(API.ativo('MOD'), '');
  assert.equal(n.readOnly, false, 'número livre de novo');
});

test('observar: só a chamada indicada ganha o aviso; as demais e a resposta da tela passam iguais', () => {
  const t = criarTela();
  const { API, chamadas, ctx } = carregar(t);
  const avisos = [];
  API.observar('X_apiDispatch', ['apiEmitir'], (req, res) => avisos.push([req.fn, res.resposta]), 'MOD');
  API.observar('X_apiDispatch', ['apiEmitir'], (req, res) => avisos.push(['de novo', res.resposta]), 'MOD'); // mesma chave: troca
  const recebidas = [];
  ctx.google.script.run.withSuccessHandler(r => recebidas.push(r)).withFailureHandler(() => {}).X_apiDispatch({ fn: 'apiEmitir', payload: {} });
  ctx.google.script.run.withSuccessHandler(r => recebidas.push(r)).X_apiDispatch({ fn: 'apiOutra', payload: {} });
  ctx.google.script.run.Y_outra('a', 'b');
  assert.equal(recebidas.length, 2, 'a tela recebe as duas respostas');
  assert.deepEqual(avisos, [['de novo', 'X_apiDispatch']]);
  assert.deepEqual(chamadas.map(c => c.nome), ['X_apiDispatch', 'X_apiDispatch', 'Y_outra']);
  assert.deepEqual(chamadas[2].args, ['a', 'b']);
  assert.deepEqual(chamadas[0].cadeia.map(c => c[0]), ['withSuccessHandler', 'withFailureHandler'], 'cadeia repetida na mesma ordem');
});

test('ligação nas telas: núcleo incluído no Index e cada gerador liga a correção', () => {
  assert.match(ler('Index.html'), /include\('JS_DocRevisao'\)/);
  const telas = {
    'JS_RelCal.html': 'RELATORIO_CALIBRACAO', 'JS_DeclaracaoExec.html': 'DECLARACAO_EXECUCAO', 'JS_DeclaracaoExecQIQO.html': 'DECLARACAO_QIQO',
    'JS_CronExec.html': 'CRONOGRAMA_EXECUCAO', 'JS_PlanejamentoCME.html': 'PLANEJAMENTO_CME', 'JS_RegOp.html': 'REGISTROS_OPERACIONAIS', 'JS_PgtPop.html': 'PGT_POP',
    'JS_NR13.html': 'NR13', 'JS_CertCal.html': 'CERTIFICADO_CALIBRACAO', 'JS_AutoclaveRelatorio.html': 'AUTOCLAVE', 'JS_LavadoraRelatorio.html': 'LAVADORA',
    'JS_EstufaBanhoRelatorio.html': 'ESTUFA', 'JS_CadeiaFrioRelatorio.html': 'CADEIA_FRIO'
  };
  for (const [f, mod] of Object.entries(telas)) {
    const s = ler(f);
    assert.match(s, /_ligarRevisao_\(\)/, f);
    assert.ok(s.includes("'" + mod + "'"), f + ' registra ' + mod);
    for (const m of s.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
  }
  // os módulos que o servidor registra existem na lista de nomes da tela
  const nucleo = ler('SGO_DocRevisao.js');
  for (const mod of ['RELATORIO_CALIBRACAO', 'DECLARACAO_EXECUCAO', 'DECLARACAO_QIQO', 'CRONOGRAMA_EXECUCAO', 'PLANEJAMENTO_CME', 'REGISTROS_OPERACIONAIS', 'PGT_POP', 'NR13', 'CERTIFICADO_CALIBRACAO', 'BAIXA_TEMPERATURA']) assert.ok(nucleo.includes(mod + ':'), mod);
});
