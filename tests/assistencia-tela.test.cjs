// Assistência técnica (21/10/2026): casca da tela (menu, include, rota, ganchos, celular), ajuda de todas as telas, manual
// na base do assistente, e-mail com "Abrir chamado", ficha do equipamento com a fonte única. Leitura do código, sem dados.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const MODS = ['assistencia', 'assistencia_abrir', 'assistencia_os', 'assistencia_agenda', 'assistencia_solicitacoes', 'assistencia_casos', 'assistencia_indicadores', 'assistencia_regras', 'assistencia_transicao', 'assistencia_portal'];

test('casca: grupo do menu com as 10 telas, include, rota em abrir(), ganchos de login e saída, atalhos do celular e do Início', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html'), ini = ler('JS_Inicio.html');
  assert.match(idx, /id="menu-secao-assistencia" style="display:none;"/);
  MODS.forEach((m) => assert.match(idx, new RegExp('data-mod="' + m + '"[^>]*onclick="abrir\\(\'' + m + '\'\\)"'), m));
  assert.ok(idx.indexOf("include('JS_Compras')") < idx.indexOf("include('JS_Assistencia')"));
  assert.match(core, /mod === "assistencia" \|\| mod\.indexOf\("assistencia_"\) === 0\) && typeof Assistencia_render_ === "function"/);
  assert.equal((core.match(/Assistencia_iniciar_\(\)/g) || []).length, 2, 'gancho nos dois caminhos do login');
  assert.match(core, /Assistencia_parar_\(\)/);
  assert.match(core, /legenda: "Ordens de serviço", mod: "assistencia_os"/);
  assert.match(core, /legenda: "Meus chamados", mod: "assistencia_portal"/);
  assert.match(ini, /case "assistencia":[\s\S]{0,200}Assistencia_irPara_\(acao\)/);
  const h = ler('JS_Assistencia.html');
  const js = h.match(/<script>([\s\S]*)<\/script>/)[1];
  new vm.Script(js);
  ['Assistencia_iniciar_', 'Assistencia_parar_', 'Assistencia_render_', 'Assistencia_irPara_', 'Assistencia_abrirDeEmail_', 'Assistencia_mostrarMenu_'].forEach((f) => assert.match(js, new RegExp('function ' + f + '\\(')));
  assert.match(js, /\.Assistencia_api\(SGO_getSessionId\(\), acao, dados \|\| \{\}\)/);
  assert.ok(!/\p{Extended_Pictographic}/u.test(h + ler('SGO_Ajuda_Assistencia.js')), 'sem emoji');
});

test('ajuda: todas as telas com passos, quem pode e o registro no SGO_Ajuda.js; manual do módulo na base do assistente', () => {
  const ctx = vm.createContext({});
  vm.runInContext(ler('SGO_Ajuda_Assistencia.js'), ctx);
  const a = ctx.SGO_ajudaTelas_Assistencia_();
  MODS.forEach((m) => { assert.ok(a[m], m); assert.ok(a[m].passos.length >= 1 && a[m].quemPode.length >= 1 && a[m].paraQueServe, m); });
  const aj = ler('SGO_Ajuda.js');
  assert.match(aj, /SGO_ajudaTelas_Assistencia_ === 'function'\) fontes\.push\(\['Assistencia'/);
  MODS.forEach((m) => assert.match(aj, new RegExp(m + ': \'')));
  assert.match(fs.readFileSync(path.join(__dirname, '../_tools/gerar_base_assistente.cjs'), 'utf8'), /"MANUAL_MODULO_ASSISTENCIA\.md": \{ tela: "assistencia" \}/);
  assert.match(ler('SGO_AssistenteManuais.js'), /MANUAL_MODULO_ASSISTENCIA/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_ASSISTENCIA.md'), 'utf8');
  ['Prazos (SLA)', 'Ordem de serviço', 'Transição do Auvo', 'Orçamento do chamado', 'Fonte única'].forEach((t) => assert.match(man, new RegExp(t.replace(/[()]/g, '\\$&'))));
  assert.doesNotMatch(man + JSON.stringify(a), /burr/i);
});

test('e-mail com "Abrir chamado" e ficha do equipamento com a fonte única (O.S. do SGO+, Auvo e acervo)', () => {
  const em = ler('JS_Email.html');
  assert.match(em, /typeof Assistencia_abrirDeEmail_ === "function" \? '<button[^>]*Email_abrirChamado_\(\)/);
  assert.match(em, /function Email_abrirChamado_\(\)/);
  new vm.Script(em.match(/<script>([\s\S]*?)<\/script>/)[1]);
  const eq = ler('JS_Equipamentos.html');
  assert.match(eq, /Ver O\.S\. do SGO\+/);
  assert.match(eq, /data-acervo=/);
  assert.match(eq, /Relatório da O\.S\./);
});
