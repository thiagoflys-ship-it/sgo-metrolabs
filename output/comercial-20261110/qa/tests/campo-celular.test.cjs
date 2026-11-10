// Programa de melhoria do SGO+, Etapa 3 (01/11/2026): campo e celular (Atividades, Frota, O.S., Relatório do ciclo, Ponto, Avisos).
// Confere a lógica nova (botões redondos ao rolar, seções recolhíveis da Frota, índice da gaveta da O.S., janela alterada em
// Atividades, pergunta própria da casca) e que os módulos, as ajudas e os manuais têm os ganchos. Só lógica; sem dados reais.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const docs = path.join(__dirname, '../docs');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const lerDoc = (f) => fs.readFileSync(path.join(docs, f), 'utf8').replace(/\r\n/g, '\n');

/** Recorta "function nome(...) { ... }" do arquivo, contando as chaves (ignora chaves dentro de textos simples). */
function funcao(fonte, nome) {
  const i = fonte.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, 'função ' + nome + ' não encontrada');
  let j = fonte.indexOf('{', i), n = 0, aspas = null;
  for (let k = j; k < fonte.length; k++) {
    const c = fonte[k];
    if (aspas) { if (c === '\\') { k++; continue; } if (c === aspas) aspas = null; continue; }
    if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
    if (c === '/' && fonte[k + 1] === '/') { k = fonte.indexOf('\n', k); continue; }
    if (c === '{') n++;
    else if (c === '}') { n--; if (n === 0) return fonte.slice(i, k + 1); }
  }
  throw new Error('fim de ' + nome);
}
function rodar(fontes, extra) {
  const ctx = vm.createContext(Object.assign({ console, Math, JSON, Object, Array, String, Number, RegExp, isFinite }, extra || {}));
  vm.runInContext(fontes.join('\n'), ctx);
  return ctx;
}

test('botões redondos: somem rolando para baixo, voltam para cima, no topo e no fim', () => {
  const ctx = rodar([funcao(ler('JS_Core.html'), 'SGO_flutAoRolar_')]);
  const f = ctx.SGO_flutAoRolar_;
  let e = { ultimo: 0, oculto: false };
  e = f(e, 300, 3000); assert.equal(e.oculto, true, 'desceu 300 px');
  e = f(e, 305, 3000); assert.equal(e.oculto, true, 'movimento pequeno não muda');
  assert.equal(e.ultimo, 300, 'movimento pequeno mantém a referência');
  e = f(e, 200, 3000); assert.equal(e.oculto, false, 'subiu');
  e = f(e, 900, 3000); assert.equal(e.oculto, true);
  assert.equal(f(e, 2995, 3000).oculto, false, 'no fim da rolagem voltam');
  assert.equal(f({ ultimo: 500, oculto: true }, 20, 3000).oculto, false, 'no topo voltam');
  assert.equal(f(null, 100, 0).oculto, false, 'sem rolagem nada some');
});

test('casca: ouvinte de rolagem só no celular, classe no html e regra no estilo; abrir() devolve os botões', () => {
  const core = ler('JS_Core.html'), est = ler('UI_Estilos.html');
  assert.match(core, /document\.addEventListener\("scroll"[\s\S]{0,900}#app\.modo-mobile[\s\S]{0,900}sgo-flut-recolhido/);
  assert.match(core, /function abrir\(mod\) \{\n\s+try \{ document\.documentElement\.classList\.remove\("sgo-flut-recolhido"\)/);
  assert.match(est, /html\.sgo-flut-recolhido body \.comw-botao, html\.sgo-flut-recolhido body \.asw-botao \{ translate: [^}]*pointer-events: none; \}/);
  assert.match(est, /prefers-reduced-motion: reduce\) \{ html body \.comw-botao, html body \.asw-botao \{ transition: none/);
});

test('Frota: toda pendência do Confirmar leva a uma seção que existe', () => {
  const core = ler('JS_Core.html');
  const ctx = rodar([funcao(core, 'fsSecaoDaPendencia_')]);
  const pend = funcao(core, 'fsPendencias_');
  const textos = [...pend.matchAll(/p\.push\(("[^"]+")/g)].map((m) => JSON.parse(m[1]));
  textos.push('o KM do painel', 'o KM de chegada');
  assert.ok(textos.length >= 14, 'achou as pendências: ' + textos.length);
  const secoes = new Set(['fsPassoKm', 'fsPassoFotos', 'fsPassoVist', 'fsPassoAbast', 'fsPassoPrev', 'fs_gestao']);
  textos.forEach((t) => assert.ok(secoes.has(ctx.fsSecaoDaPendencia_(t)), t + ' -> ' + ctx.fsSecaoDaPendencia_(t)));
  assert.equal(ctx.fsSecaoDaPendencia_('a foto da nota do abastecimento'), 'fsPassoAbast');
  assert.equal(ctx.fsSecaoDaPendencia_('a foto do painel'), 'fsPassoKm');
  const fluxo = funcao(core, 'fsDesenharFluxo_');
  ['fsPassoKm', 'fsPassoFotos', 'fsPassoVist', 'fsPassoPrev', 'fs_gestao'].forEach((id) => assert.ok(fluxo.includes('id="' + id + '"'), id));
  assert.ok(funcao(core, 'fsAbastHtml_').includes('id="fsPassoAbast"'));
});

test('Frota: resumo da seção recolhida em pt-BR', () => {
  const core = ler('JS_Core.html');
  const ctx = rodar([funcao(core, 'fsResumoPasso_'), funcao(core, 'fsKm_'), funcao(core, 'fsDiaHora_')], {
    frotaNumCliente_: (v) => Number(String(v).replace(/\./g, '').replace(',', '.')),
    SGO_qtd_: (n, um, varios) => n + ' ' + (n === 1 ? um : varios)
  });
  const f = { km: '45210', painel: [{}], fotos: [{}, { removida: true }, {}], vistoria: 'problema', problemas: { a: {}, b: {} }, abast: 'SIM', abastModo: 'depois', prevData: '02/11/2026', prevHora: '17:30' };
  assert.equal(ctx.fsResumoPasso_('fsPassoKm', f), 'KM 45.210 · foto do painel');
  assert.equal(ctx.fsResumoPasso_('fsPassoFotos', f), '2 fotos');
  assert.equal(ctx.fsResumoPasso_('fsPassoVist', f), '2 itens com problema');
  assert.equal(ctx.fsResumoPasso_('fsPassoAbast', f), 'Abasteci (lançar depois)');
  assert.equal(ctx.fsResumoPasso_('fsPassoPrev', f), '02/11 às 17:30');
  const vazio = { km: '', painel: [], fotos: [], vistoria: '', problemas: {}, abast: '', prevData: '', prevHora: '' };
  assert.equal(ctx.fsResumoPasso_('fsPassoKm', vazio), 'falta o KM');
  assert.equal(ctx.fsResumoPasso_('fsPassoVist', vazio), 'falta a vistoria');
  assert.equal(ctx.fsResumoPasso_('fsPassoAbast', vazio), 'falta responder');
});

test('Frota: seções recolhíveis montadas no fluxo e no abastecimento redesenhado; Confirmar com pendência mostra a seção', () => {
  const core = ler('JS_Core.html');
  assert.ok(funcao(core, 'fsDesenharFluxo_').includes('fsSecoes_();'));
  assert.ok(funcao(core, 'fsRedesenharAbast_').includes('fsSecoes_();'));
  assert.match(funcao(core, 'fsConfirmar_'), /"Para confirmar, falta: " \+ p\.join\(", "\) \+ "\."\); fsIrFalta_\(p\); return;/);
  assert.match(funcao(core, 'fsClique_'), /acao === "recolher"[\s\S]*acao === "irFalta"/);
  assert.match(funcao(core, 'fsAtualizarBarra_'), /Ir para o que falta/);
  assert.match(funcao(core, 'fsSecoes_'), /aria-controls/);
  assert.match(funcao(core, 'fsAplicarRecolher_'), /aria-expanded/);
});

test('Frota: Abasteci e Outra despesa perguntam antes de perder a foto da nota', () => {
  const core = ler('JS_Core.html');
  const abrirG = funcao(core, 'fsGastoAbrir_');
  assert.match(abrirG, /setAttribute\("data-sgo-sujo", ""\)/);
  assert.match(abrirG, /setAttribute\("data-sgo-sujo-texto", FSG_TEXTO_DESCARTAR\)/);
  assert.match(abrirG, /__sgoSujo = fsGastoSujo_/);
  assert.match(funcao(core, 'fsGastoClique_'), /g === "voltar"\) \{ if \(fsGastoSujo_\(\) && !confirm\(FSG_TEXTO_DESCARTAR\)\) return;/);
  const els = { fsRaiz: { getAttribute: () => 'gasto' } };
  const ctx = rodar([funcao(core, 'fsGastoSujo_'), 'var FSG = { nota: null, painel: null, enviando: false };'], {
    fsRaiz_: () => els.fsRaiz, document: { getElementById: (id) => els[id] || null }
  });
  assert.equal(ctx.fsGastoSujo_(), false, 'nada preenchido');
  ctx.FSG.nota = { base64: 'x' };
  assert.equal(ctx.fsGastoSujo_(), true, 'com a foto da nota');
  ctx.FSG.enviando = true;
  assert.equal(ctx.fsGastoSujo_(), false, 'enviando não pergunta');
  ctx.FSG.enviando = false; ctx.FSG.nota = null; els.fsg_valor = { value: '12,50' };
  assert.equal(ctx.fsGastoSujo_(), true, 'com valor digitado');
  assert.match(core, /FSG_TEXTO_DESCARTAR = "Voltar sem lançar\?\\n\\nA foto da nota/);
});

test('casca: pergunta própria do painel alterado (data-sgo-sujo-texto) no lugar da padrão', () => {
  const nav = ler('JS_Navegacao.html');
  assert.match(nav, /confirmar: function \(t\) \{ try \{ return window\.confirm\(t === SGO_NAV_TEXTOS\.descartar \? \(textoSujoProprio\(\) \|\| t\) : t\);/);
  assert.match(funcao(nav, 'textoSujoProprio'), /visivel\(l\[i\]\) && marcadoSujo\(l\[i\]\)/);
});

test('O.S.: índice das seções (rótulo curto, seção atual) e gaveta que guarda a altura e esquece a volta ao chamado', () => {
  const a = ler('JS_Assistencia.html');
  const ctx = rodar([funcao(a, 'At_rotuloSecao_'), funcao(a, 'At_slugSecao_'), funcao(a, 'At_secaoAtual_')]);
  assert.equal(ctx.At_rotuloSecao_('Compras ligadas ao chamado · custo R$ 1.200,00'), 'Compras ligadas ao chamado');
  assert.equal(ctx.At_rotuloSecao_('Representação: Empresa X'), 'Representação');
  assert.equal(ctx.At_rotuloSecao_('  Assinatura   do cliente '), 'Assinatura do cliente');
  assert.equal(ctx.At_slugSecao_('Relato e conferência'), 'relato-e-conferencia');
  assert.equal(ctx.At_slugSecao_('Peças'), 'pecas');
  assert.equal(ctx.At_secaoAtual_([200, 600, 900], 150), -1, 'antes da primeira');
  assert.equal(ctx.At_secaoAtual_([100, 600, 900], 150), 0);
  assert.equal(ctx.At_secaoAtual_([-900, -300, 120], 150), 2);
  const g = funcao(a, 'At_gaveta_');
  assert.match(g, /At_indiceSecoes_\(cn, "Seções de " \+ titulo\)/);
  assert.match(g, /ta\.textContent === titulo\) rol = ca\.scrollTop/);
  assert.match(g, /\[data-at-fechar\]"\)\.onclick = function \(\) \{ AT\.voltaChamado = null; g\.remove\(\); \}/);
  assert.match(g, /e\.target === g\) \{ AT\.voltaChamado = null; g\.remove\(\); \}/);
  const ind = funcao(a, 'At_indiceSecoes_');
  assert.match(ind, /secs\.length < 4\) return/);
  assert.match(ind, /Próxima: /);
  assert.match(a, /#atGaveta \.atv-drawer-corpo \{ padding-bottom: calc\(96px/);
  assert.match(funcao(a, 'At_desenharOs_'), /msg && g\.__rolMantido/);
  assert.ok(!/prazos e SLA/.test(a), 'sem "SLA" para a equipe e o cliente');
  assert.match(a, /Kanban: os seus chamados em colunas, uma por etapa\. Gantt: os atendimentos numa linha do tempo\./);
});

test('Atividades: abas são passo do voltar, ficha volta da O.S., janela alterada pergunta, ficha guarda a altura', () => {
  const t = ler('JS_Atividades.html');
  assert.match(funcao(t, 'Atividades_trocarAba_'), /Atividades_passoAba_\("Minhas atividades: " \+ aba, de, aba/);
  assert.match(funcao(t, 'Atividades_trocarAbaEquipe_'), /Atividades_passoAba_\("Atividades da equipe: " \+ aba, de, aba/);
  const pilha = [];
  const ctx = rodar([funcao(t, 'Atividades_passoAba_')], (() => { const n = { empilhar: (r) => pilha.push(r) }; return { window: { SGO_NAV: n }, SGO_NAV: n }; })());
  ctx.Atividades_passoAba_('x', 'lista', 'lista', () => {});
  ctx.Atividades_passoAba_('x', '', 'kanban', () => {});
  assert.equal(pilha.length, 0, 'mesma aba ou primeira abertura não grava passo');
  ctx.Atividades_passoAba_('Minhas atividades: kanban', 'lista', 'kanban', () => {});
  assert.deepEqual(pilha, ['Minhas atividades: kanban']);
  assert.match(funcao(t, 'Atividades_abrirOS_'), /ATV\.fichaVolta = \{ id: ov\.dataset\.id, mod: window\.SGO_MODULO_ATUAL/);
  assert.match(funcao(t, 'Atividades_aoAbrirModulo_'), /SGO_NAV\.restaurando\(\)\) setTimeout\(function \(\) \{ Atividades_abrirDetalhe_\(fv\.id\)/);
  assert.match(funcao(t, 'Atividades_abrirDetalhe_'), /cRol\.scrollTop = rolAntes/);
  assert.match(funcao(t, 'Atividades_modal_'), /Atividades_vigiarSujo_\(ov\);/);
  // janela alterada: só conta o campo que a pessoa tocou e mudou
  const ouvintes = {};
  const campo = (tag, v, extra) => Object.assign({ tagName: tag, value: v, type: 'text', id: '' }, extra || {});
  const sel = campo('SELECT', ''), txt = campo('TEXTAREA', ''), busca = campo('INPUT', '', { id: 'atvF_cli_busca' }), chk = campo('INPUT', '', { type: 'checkbox', checked: false });
  const ov = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(ev, fn) { ouvintes[ev] = fn; }, querySelectorAll: () => [sel, txt, busca, chk] };
  const c2 = rodar([funcao(t, 'Atividades_campoValor_'), funcao(t, 'Atividades_vigiarSujo_')]);
  c2.Atividades_vigiarSujo_(ov);
  assert.equal(ov.attrs['data-sgo-sujo'], '');
  sel.value = 'carregado pelo sistema';
  assert.equal(ov.__sgoSujo(), false, 'preenchido pelo sistema sem toque não conta');
  ouvintes.focusin({ target: sel }); sel.value = 'Aguardando peça ou material';
  assert.equal(ov.__sgoSujo(), true, 'motivo escolhido conta');
  sel.value = 'carregado pelo sistema';
  assert.equal(ov.__sgoSujo(), false, 'voltou ao valor de antes');
  ouvintes.focusin({ target: busca }); busca.value = 'Hospital';
  assert.equal(ov.__sgoSujo(), false, 'busca não conta');
  ouvintes.focusin({ target: chk }); chk.checked = true;
  assert.equal(ov.__sgoSujo(), true, 'caixa de marcar conta');
  assert.match(t, /Kanban: um quadro com uma coluna por situação\./);
  assert.match(t, /Gantt: cada atividade é uma barra do início à previsão de entrega/);
  assert.match(funcao(t, 'Atividades_agendaHtml_'), /Nenhuma atividade ' \+ \(ATV\.agendaModo === "semana" \? "nesta semana" : "neste mês"\)/);
});

test('Ponto, Relatório do ciclo e Avisos: abas no voltar e estados vazios que dizem o que fazer', () => {
  const p = ler('JS_Ponto.html'), lc = ler('JS_LavCiclo.html'), av = ler('JS_Avisos.html');
  assert.match(funcao(p, 'Ponto_aba_'), /SGO_NAV\.empilhar\("Ponto: " \+ a, function \(\) \{ if \(Pto_\$_\("ptCorpo"\)\) Ponto_aba_\(de\); \}\)/);
  assert.match(p, /Ninguém para mostrar neste dia\. ' \+ \(p\.motivoDia \? "Por quê: "/);
  assert.match(p, /O que fazer: escolha outro dia no campo Dia/);
  assert.match(lc, /SGO_NAV\.empilhar\("Relatório do ciclo: " \+ a/);
  assert.match(lc, /Kanban: um quadro com uma coluna por situação do relatório\./);
  assert.match(av, /Nenhum aviso para você por enquanto\. Quando a gestão ou o RH publicar/);
});

test('ajudas, manuais e base do assistente acompanham a Etapa 3', () => {
  const aj = (f) => ler(f);
  assert.match(aj('SGO_Ajuda_Principal.js'), /Trocar de aba \(Lista, Agenda, Kanban\) é um passo do voltar/);
  assert.match(aj('SGO_Ajuda_Principal.js'), /O que são Gantt e Kanban\?/);
  assert.match(aj('SGO_Ajuda_Frota.js'), /Ir para o que falta/);
  assert.match(aj('SGO_Ajuda_Frota.js'), /perdi a foto da nota/);
  assert.match(aj('SGO_Ajuda_Assistencia.js'), /A ficha da O\.S\. é longa no celular\./);
  assert.match(aj('SGO_Ajuda_Assistencia.js'), /O que são Kanban e Gantt\?/);
  assert.match(aj('SGO_Ajuda_Ponto.js'), /Ninguém para mostrar neste dia/);
  assert.match(aj('SGO_Ajuda_LavCiclo.js'), /O que é o Kanban dos relatórios\?/);
  [['MANUAL_MINHAS_ATIVIDADES.md', /No celular e o voltar \(01\/11\/2026\)/], ['MANUAL_MODULO_FROTA.md', /Retirada e devolução no celular \(01\/11\/2026\)/],
    ['MANUAL_MODULO_ASSISTENCIA.md', /Ficha da O\.S\. e do chamado no celular/], ['MANUAL_RELATORIO_CICLO_LAVADORA.md', /No celular e o voltar/],
    ['MANUAL_MODULO_PONTO.md', /No celular e o voltar/], ['MANUAL_NAVEGACAO_VOLTAR.md', /Etapa 3 \(01\/11\/2026\): campo e celular/]].forEach(([f, re]) => assert.match(lerDoc(f), re, f));
  const base = ler('SGO_AssistenteManuais.js');
  assert.ok(base.includes('Ir para o que falta'), 'base do assistente regenerada');
  assert.ok(base.includes('Próxima: ...'), 'base do assistente com o índice da O.S.');
});

test('revisão da Etapa 3: botões redondos voltam quando a tela encolhe; sem "SLA" na ajuda; Frota do computador sem seções; lista carregada não conta como alteração', () => {
  const fs2 = require('node:fs'), path2 = require('node:path');
  const p = (f) => fs2.readFileSync(path2.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db', f), 'utf8');
  const core = p('JS_Core.html');
  assert.match(core, /let quem = null;/);
  assert.match(core, /if \(sumiu\) \{ raiz\.classList\.remove\("sgo-flut-recolhido"\)/);
  assert.match(core, /if \(fsNoComputador_\(\)\) return; \/\/ revisão da Etapa 3/);
  assert.doesNotMatch(p('SGO_Ajuda_Assistencia.js'), /SLA/);
  assert.match(p('JS_Atividades.html'), /sel\.__sgoIni = Atividades_campoValor_\(sel\)/);
});
