// Comercial no celular (28/10/2026; dono: "no celular as mesmas ferramentas do comercial aparecem?", equipe: "não consegue
// ver nada sobre produto"). No celular o menu lateral fica escondido e o atalho "Comercial" só abria a tela Hoje: Produtos e
// serviços, Pedidos, Quadro, Gantt, Painel e Metodologia não tinham caminho. Confere a barra de seções com as mesmas regras do
// menu do computador, e que a tela desenha abaixo dela (inclusive ao recarregar o catálogo).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const html = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

// DOM mínimo: elementos por id, innerHTML e querySelectorAll de [data-cm-nav] e do menu
function ambiente(o) {
  const els = {}, menu = ['comercial', 'comercial_oportunidades', 'comercial_kanban', 'comercial_gantt', 'comercial_propostas', 'comercial_pedidos', 'comercial_catalogo', 'comercial_painel', 'comercial_metodologia']
    .map((m) => ({ m, style: {}, getAttribute: () => m }));
  const el = (id) => (els[id] = els[id] || { id, style: {}, _html: '', botoes: [],
    set innerHTML(v) { this._html = v; if (id === 'conteudo') { delete els.cmCorpoMob; if (v.includes('id="cmCorpoMob"')) el('cmCorpoMob'); this.botoes = [...v.matchAll(/data-cm-nav="([a-z_]+)"/g)].map((x) => ({ m: x[1], getAttribute: () => x[1], onclick: null })); } },
    get innerHTML() { return this._html; },
    querySelectorAll(sel) { return sel === '[data-cm-nav]' ? this.botoes : []; }, querySelector() { return null; } });
  el('conteudo');
  const abertos = [], desenhos = [];
  const ctx = vm.createContext({
    console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: (s) => (s.startsWith('#menu-grupo-itens-comercial') ? menu : []), querySelector: () => null, addEventListener() {} },
    escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir: (m) => abertos.push(m),
    google: { script: { run: {} } }
  });
  vm.runInContext(script, ctx);
  // servidor simulado: Com_chamar_("iniciar") devolve o nível; as telas só registram onde desenharam
  ctx.Com_chamar_ = (acao, d, ok) => ok({ nivel: o.nivel, avisos: [] });
  for (const f of ['Comercial_renderHoje_', 'Comercial_renderOportunidades_', 'Comercial_renderPropostas_', 'Comercial_renderPedidos_', 'Comercial_renderCatalogo_', 'Comercial_renderPainel_', 'Comercial_renderMetodologia_', 'Comercial_renderKanban_', 'Comercial_renderGantt_'])
    ctx[f] = (div) => desenhos.push({ f, onde: div && div.id });
  vm.runInContext('Comercial_renderHoje_=this.Comercial_renderHoje_;Comercial_renderOportunidades_=this.Comercial_renderOportunidades_;Comercial_renderPropostas_=this.Comercial_renderPropostas_;Comercial_renderPedidos_=this.Comercial_renderPedidos_;Comercial_renderCatalogo_=this.Comercial_renderCatalogo_;Comercial_renderPainel_=this.Comercial_renderPainel_;Comercial_renderMetodologia_=this.Comercial_renderMetodologia_;Comercial_renderKanban_=this.Comercial_renderKanban_;Comercial_renderGantt_=this.Comercial_renderGantt_;Com_chamar_=this.Com_chamar_;', ctx);
  return { ctx, els, abertos, desenhos, menu };
}

test('celular: toda tela do Comercial abre com a barra de seções (Produtos incluído) e desenha abaixo dela; tocar leva à seção', () => {
  const a = ambiente({ celular: true, nivel: 'VENDEDOR' });
  a.ctx.Comercial_render_('comercial');
  const c = a.els.conteudo;
  assert.match(c.innerHTML, /<nav class="cm-nav-mob" aria-label="Seções do Comercial">/);
  for (const r of ['Hoje', 'Oportunidades', 'Propostas', 'Pedidos', 'Produtos', 'Quadro', 'Gantt', 'Painel', 'Metodologia']) assert.match(c.innerHTML, new RegExp('>' + r + '</button>'));
  assert.match(c.innerHTML, /cm-nav-mob-btn ativo" aria-current="page" data-cm-nav="comercial"/);
  assert.deepEqual(a.desenhos.at(-1), { f: 'Comercial_renderHoje_', onde: 'cmCorpoMob' }, 'a tela desenha abaixo da barra');
  c.botoes.find((b) => b.m === 'comercial_catalogo').onclick();
  assert.deepEqual(a.abertos, ['comercial_catalogo']);
  a.ctx.Comercial_render_('comercial_catalogo');
  assert.match(c.innerHTML, /ativo" aria-current="page" data-cm-nav="comercial_catalogo"/);
  assert.deepEqual(a.desenhos.at(-1), { f: 'Comercial_renderCatalogo_', onde: 'cmCorpoMob' });
  c.botoes.find((b) => b.m === 'comercial_catalogo').onclick();
  assert.equal(a.abertos.length, 1, 'tocar na seção aberta não recarrega');
  assert.equal(a.ctx.Com_corpo_().id, 'cmCorpoMob', 'recarregar o catálogo (gravar produto) desenha abaixo da barra');
});

test('celular: Financeiro só vê Pedidos e Produtos (como no computador); sem Comercial não há barra; computador sem barra', () => {
  const f = ambiente({ celular: true, nivel: 'FINANCEIRO' });
  f.ctx.Comercial_render_('comercial_catalogo');
  const botoes = f.els.conteudo.botoes.map((b) => b.m);
  assert.deepEqual(botoes, ['comercial_pedidos', 'comercial_catalogo']);
  f.ctx.Comercial_render_('comercial_painel');
  assert.deepEqual(f.desenhos.at(-1), { f: 'Comercial_renderPedidos_', onde: 'cmCorpoMob' }, 'Financeiro cai em Pedidos');
  const n = ambiente({ celular: true, nivel: 'NENHUM' });
  n.ctx.Comercial_render_('comercial');
  assert.doesNotMatch(n.els.conteudo.innerHTML, /cm-nav-mob/); assert.match(n.els.conteudo.innerHTML, /O Comercial é da equipe comercial/);
  const pc = ambiente({ celular: false, nivel: 'GESTAO' });
  pc.ctx.Comercial_render_('comercial_catalogo');
  assert.doesNotMatch(pc.els.conteudo.innerHTML, /cm-nav-mob/);
  assert.deepEqual(pc.desenhos.at(-1), { f: 'Comercial_renderCatalogo_', onde: 'conteudo' });
  assert.equal(pc.ctx.Com_corpo_().id, 'conteudo');
});

test('a mesma regra no menu do computador e na barra do celular; barra com toque de 44 px', () => {
  const v = ambiente({ nivel: 'FINANCEIRO' });
  v.ctx.Comercial_mostrarMenu_({ nivel: 'FINANCEIRO' });
  assert.deepEqual(v.menu.filter((b) => b.style.display !== 'none').map((b) => b.m), ['comercial_pedidos', 'comercial_catalogo']);
  v.ctx.Comercial_mostrarMenu_({ nivel: 'VENDEDOR' });
  assert.equal(v.menu.filter((b) => b.style.display === 'none').length, 0);
  v.ctx.Comercial_mostrarMenu_(null);
  assert.equal(v.menu.filter((b) => b.style.display !== 'none').length, 0);
  assert.match(html, /\.cm-nav-mob-btn \{[^}]*min-height: 44px/);
  assert.doesNotMatch(html, /Comercial_renderCatalogo_\(Com_\$_\("conteudo"\)\)/);
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /barra de seções/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  assert.match(manual, /## Comercial no celular/);
});
