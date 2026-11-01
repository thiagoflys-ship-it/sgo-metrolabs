// Navegação e "voltar" únicos da casca do SGO+ (Programa de melhoria, Etapa 1, 01/11/2026): JS_Navegacao.html.
// Confere a pilha (cada tela é um passo no histórico, a mesma tela redesenhada não grava passo), o popstate (voltar reabre a
// tela anterior), a entrada-base (voltar no Início avisa e não sai na primeira vez), as janelas na pilha (voltar fecha a de cima,
// travas obrigatórias não fecham, texto digitado pergunta antes, trocar de módulo fecha as esquecidas), os sub-níveis
// (SGO_NAV.empilhar), recarregar reabre a mesma tela, a interceptação de window.open("") (só endereço vazio, só no celular) e a
// ligação com a casca (abrir, Voltar da barra, Index, ajuda e manual). Só lógica, com histórico simulado; sem dados reais.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function carregar() {
  const fonte = ler('JS_Navegacao.html').replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, Proxy, window: { __SGO_NAV_TESTE__: true } });
  vm.runInContext(fonte, ctx);
  return ctx;
}

/** Histórico do navegador simulado: pushState/replaceState/back/go; o popstate chega quando se chama entregar(). */
function criarHistorico() {
  const h = { entradas: [{ state: null, url: '/' }], i: 0, pendentes: [], aoPop: null };
  h.pushState = (st, _t, url) => { h.entradas.length = h.i + 1; h.entradas.push({ state: JSON.parse(JSON.stringify(st)), url }); h.i++; };
  h.replaceState = (st, _t, url) => { h.entradas[h.i] = { state: JSON.parse(JSON.stringify(st)), url }; };
  h.go = (n) => { const alvo = h.i + n; if (alvo < 0 || alvo >= h.entradas.length) return; h.pendentes.push(alvo); };
  h.back = () => h.go(-1);
  Object.defineProperty(h, 'state', { get: () => (h.entradas[h.i] ? h.entradas[h.i].state : null) });
  h.entregar = () => { let n = 0; while (h.pendentes.length && n++ < 50) { h.i = h.pendentes.shift(); h.aoPop(h.entradas[h.i].state); } };
  return h;
}

function montar(o) {
  o = o || {};
  const ctx = carregar();
  const hist = criarHistorico();
  const reg = { abertas: [], avisos: [], confirmar: [], fechadas: [], tela: o.inicial || 'mobile_home', relogio: 1000, agendados: [] };
  const janelas = new Map(); // el -> { aberta, trava, suja, fechavel }
  const nucleo = ctx.SGO_NAV_criarNucleo_({
    history: hist,
    urlBase: () => '/',
    abrirTela: (mod) => { reg.abertas.push(mod); reg.tela = mod; nucleo.aoAbrir(mod); },
    telaAtual: () => reg.tela,
    telaInicial: () => 'mobile_home',
    usuario: () => 'u1',
    aviso: (t) => reg.avisos.push(t),
    confirmar: (t) => { reg.confirmar.push(t); return reg.resposta !== false; },
    janelaAberta: (el) => !!(janelas.get(el) || {}).aberta,
    janelaTrava: (el) => !!(janelas.get(el) || {}).trava,
    janelaSuja: (el) => !!(janelas.get(el) || {}).suja,
    fecharJanela: (el, conf) => { const j = janelas.get(el); if (!j || j.fechavel === false) return false; j.aberta = false; reg.fechadas.push({ el, conf }); return true; },
    rotuloJanela: (el) => el,
    textoTrava: (el) => 'Resolva primeiro a janela "' + el + '"',
    conteudoSujo: () => !!reg.conteudoSujo,
    telaPermitida: (m) => m !== 'proibida',
    hashTela: () => reg.hash || '',
    agora: () => reg.relogio,
    agendar: (fn, ms) => { reg.agendados.push({ fn, ms }); }
  });
  hist.aoPop = (st) => nucleo.aoPop(st);
  // abrir() da casca: antesDeAbrir -> desenha -> aoAbrir
  const abrir = (mod) => { if (!nucleo.antesDeAbrir(mod)) return false; reg.tela = mod; nucleo.aoAbrir(mod); return true; };
  const janela = (nome, extra) => { janelas.set(nome, Object.assign({ aberta: true }, extra || {})); nucleo.janelasMudaram([...janelas].filter(([, j]) => j.aberta).map(([k]) => k)); };
  const sincronizarJanelas = () => nucleo.janelasMudaram([...janelas].filter(([, j]) => j.aberta).map(([k]) => k));
  const voltarCelular = () => { hist.back(); hist.entregar(); sincronizarJanelas(); hist.entregar(); };
  return { ctx, hist, reg, nucleo, abrir, janela, janelas, sincronizarJanelas, voltarCelular };
}

test('cada tela é um passo; a mesma tela redesenhada não grava passo; voltar reabre a tela anterior', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  assert.equal(t.hist.entradas.length, 2, 'entrada-base + Início');
  assert.equal(t.hist.entradas[0].state.tipo, 'base');
  assert.equal(t.hist.entradas[1].state.mod, 'mobile_home');
  t.abrir('mobile_home');
  assert.equal(t.hist.entradas.length, 2, 'Início de novo não grava passo');
  t.abrir('frota');
  t.abrir('frota'); // auto-refresh / redesenho
  t.abrir('comercial');
  assert.deepEqual(t.hist.entradas.map((e) => e.state.mod), ['', 'mobile_home', 'frota', 'comercial']);
  assert.equal(t.hist.entradas[3].url, '/#/comercial', 'endereço #/modulo');
  t.voltarCelular();
  assert.equal(t.reg.tela, 'frota');
  assert.deepEqual(t.reg.abertas, ['frota']);
  assert.equal(t.hist.entradas.length, 4, 'o passo da frente continua (avançar do navegador)');
  t.voltarCelular();
  assert.equal(t.reg.tela, 'mobile_home');
});

test('o Voltar da barra do topo faz o mesmo que o voltar do celular', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('frota'); t.abrir('avisos');
  assert.equal(t.nucleo.voltar(), true);
  t.hist.entregar();
  assert.equal(t.reg.tela, 'frota');
  t.nucleo.voltar(); t.hist.entregar();
  assert.equal(t.reg.tela, 'mobile_home');
  assert.equal(t.nucleo.voltar(), true, 'no Início não sai do sistema');
  assert.equal(t.hist.pendentes.length, 0);
  assert.match(t.reg.avisos.pop(), /já está no Início/);
});

test('entrada-base: no Início o primeiro voltar avisa e fica; o segundo, em até 3 s, sai', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.voltarCelular();
  assert.match(t.reg.avisos[0], /toque em voltar de novo/);
  assert.equal(t.hist.state.mod, 'mobile_home', 'o Início volta para o topo da pilha');
  assert.equal(t.hist.i, 1);
  t.reg.relogio += 1000;
  t.hist.back(); t.hist.entregar();
  assert.equal(t.hist.state.tipo, 'base');
  assert.equal(t.hist.pendentes.length, 0, 'pediu ao navegador para sair (não há página antes no simulado)');
  assert.equal(t.reg.avisos.length, 1, 'não repete o aviso');
  t.reg.agendados.pop().fn(); // ninguém saiu: o Início volta a ficar armado
  assert.equal(t.hist.state.mod, 'mobile_home');
});

test('janela entra na pilha: voltar fecha a janela de cima e não sai da tela', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('minhas_atividades');
  t.janela('detalhe');
  assert.equal(t.hist.state.tipo, 'janela');
  t.janela('pedido'); // janela por cima de janela
  t.voltarCelular();
  assert.deepEqual(t.reg.fechadas.map((f) => f.el), ['pedido']);
  assert.equal(t.reg.tela, 'minhas_atividades');
  assert.deepEqual(t.reg.abertas, [], 'não redesenha a tela');
  t.voltarCelular();
  assert.deepEqual(t.reg.fechadas.map((f) => f.el), ['pedido', 'detalhe']);
  assert.equal(t.hist.state.mod, 'minhas_atividades');
  assert.equal(t.hist.state.tipo, 'tela');
});

test('janela fechada pelo próprio botão sai da pilha sem voltar duas vezes', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('compras');
  t.janela('novo pedido');
  t.janelas.get('novo pedido').aberta = false; // "×" da janela
  t.sincronizarJanelas();
  t.hist.entregar();
  assert.equal(t.hist.state.tipo, 'tela');
  assert.equal(t.hist.state.mod, 'compras');
  t.voltarCelular();
  assert.equal(t.reg.tela, 'mobile_home', 'um voltar só leva à tela anterior');
});

test('janela redesenhada (troca do elemento) substitui o passo, sem empilhar', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('assistencia');
  t.janela('chamado v1');
  t.janelas.get('chamado v1').aberta = false;
  t.janela('chamado v2');
  t.hist.entregar();
  assert.equal(t.hist.entradas.filter((e) => e.state && e.state.tipo === 'janela').length, 1);
});

test('trava obrigatória (atividade atrasada, troca de senha) não fecha pelo voltar e explica o que fazer', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('frota');
  t.janela('Atividade com prazo vencido', { trava: true });
  t.voltarCelular();
  assert.equal(t.reg.fechadas.length, 0);
  assert.equal(t.janelas.get('Atividade com prazo vencido').aberta, true);
  assert.match(t.reg.avisos.pop(), /Resolva primeiro a janela "Atividade com prazo vencido"/);
  assert.equal(t.hist.state.tipo, 'janela', 'o passo da trava volta para o topo');
  assert.equal(t.hist.state.pos, t.hist.i, 'a posição gravada continua igual à do navegador');
  t.janelas.get('Atividade com prazo vencido').aberta = false; // resolvida pelos botões dela
  t.sincronizarJanelas(); t.hist.entregar();
  assert.equal(t.hist.state.mod, 'frota'); assert.equal(t.hist.state.tipo, 'tela'); assert.equal(t.hist.state.pos, t.hist.i);
  t.janela('Atividade com prazo vencido', { trava: true });
  assert.equal(t.reg.tela, 'frota');
  // trocar de módulo também não fecha a trava
  t.abrir('avisos');
  assert.equal(t.janelas.get('Atividade com prazo vencido').aberta, true);
});

test('formulário com texto digitado: voltar pergunta "Descartar o que foi digitado?"', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('comercial_catalogo');
  t.janela('novo item', { suja: true });
  t.reg.resposta = false;
  t.voltarCelular();
  assert.match(t.reg.confirmar[0], /Descartar o que foi digitado\?/);
  assert.equal(t.janelas.get('novo item').aberta, true, 'Cancelar mantém a janela e o texto');
  assert.equal(t.hist.state.tipo, 'janela');
  assert.equal(t.hist.state.pos, t.hist.i);
  t.reg.resposta = true;
  t.voltarCelular();
  assert.equal(t.janelas.get('novo item').aberta, false);
  assert.equal(t.reg.fechadas[0].conf, true, 'a confirmação do módulo não pergunta de novo');
  // texto digitado na própria tela (sem janela): pergunta antes de sair
  t.reg.conteudoSujo = true; t.reg.resposta = false;
  t.voltarCelular();
  assert.equal(t.reg.tela, 'comercial_catalogo');
  assert.equal(t.hist.state.mod, 'comercial_catalogo');
});

test('trocar de módulo fecha as janelas esquecidas (ex.: "Nova assinatura" do E-mail)', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('email');
  t.janela('Nova assinatura');
  assert.equal(t.abrir('declaracao_qiqo'), true);
  assert.equal(t.janelas.get('Nova assinatura').aberta, false);
  assert.equal(t.hist.state.mod, 'declaracao_qiqo');
  // voltar pula o passo da janela que já fechou e chega no E-mail
  t.voltarCelular();
  assert.equal(t.reg.tela, 'email');
  // janela com texto: a pessoa pode preferir ficar
  t.janela('Nova assinatura 2', { suja: true });
  t.reg.resposta = false;
  assert.equal(t.abrir('frota'), false);
  assert.equal(t.janelas.get('Nova assinatura 2').aberta, true);
});

test('sub-nível (SGO_NAV.empilhar): voltar chama aoVoltar e fica no módulo; substituir e chave não empilham de novo', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('lavadora_ciclos');
  const chamadas = [];
  t.nucleo.empilhar('Busca', () => chamadas.push('painel'));
  t.nucleo.empilhar('Busca 2', () => chamadas.push('busca 1'));
  t.voltarCelular();
  assert.deepEqual(chamadas, ['busca 1']);
  assert.deepEqual(t.reg.abertas, []);
  t.voltarCelular();
  assert.deepEqual(chamadas, ['busca 1', 'painel']);
  assert.equal(t.hist.state.tipo, 'tela');
  // certificado: "+ Novo cliente" vira o passo "Equipamento" ao salvar (substituir)
  t.abrir('certificado_calibracao');
  const cc = [];
  t.nucleo.empilhar('Novo cliente', () => cc.push('passo 1'));
  t.nucleo.empilhar('Equipamento', () => cc.push('passo 1 (substituído)'), { substituir: true });
  t.nucleo.empilhar('Dados', () => cc.push('passo 2'), { chave: 'cc-dados' });
  t.nucleo.empilhar('Dados', () => cc.push('passo 2 de novo'), { chave: 'cc-dados' });
  assert.equal(t.hist.entradas.filter((e) => e.state && e.state.tipo === 'sub').length, 2);
  t.voltarCelular(); t.voltarCelular();
  assert.deepEqual(cc, ['passo 2 de novo', 'passo 1 (substituído)']);
  assert.equal(t.reg.tela, 'certificado_calibracao', 'volta ao certificado, não à lista de Clientes');
});

test('voltarOu e limparSubniveis: botões "Voltar" dos módulos usam a mesma pilha', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('gestao_decisoes');
  const ch = [];
  t.nucleo.voltarOu(() => ch.push('direto')); // sem sub-nível: roda a função
  assert.deepEqual(ch, ['direto']);
  t.nucleo.empilhar('Regras', () => ch.push('caixa'));
  t.nucleo.voltarOu(() => ch.push('direto 2'));
  t.hist.entregar();
  assert.deepEqual(ch, ['direto', 'caixa']);
  t.nucleo.empilhar('A', () => {}); t.nucleo.empilhar('B', () => {});
  t.nucleo.limparSubniveis(); // "Voltar ao painel"
  t.hist.entregar();
  assert.equal(t.hist.state.tipo, 'tela');
  assert.equal(t.hist.state.mod, 'gestao_decisoes');
});

test('empilhar não grava passo durante a restauração (voltar) nem antes de entrar', () => {
  const t = montar();
  assert.equal(t.nucleo.empilhar('x', () => {}), null, 'sem sessão');
  t.nucleo.iniciarSessao();
  t.abrir('lavadora_ciclos');
  t.nucleo.empilhar('Busca', () => { t.nucleo.empilhar('Busca de dentro do voltar', () => {}); });
  t.voltarCelular();
  assert.equal(t.hist.state.tipo, 'tela');
});

test('recarregar reabre a mesma tela (se ainda está no menu da pessoa); senão, o Início', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('comercial_oportunidades');
  t.janela('ficha');
  // recarregou: o navegador guarda o histórico; a casca começa de novo
  const t2 = montar();
  t2.hist.entradas = t.hist.entradas; t2.hist.i = t.hist.i;
  const r = t2.nucleo.iniciarSessao();
  assert.deepEqual({ mod: r.mod, mesma: r.mesmaEntrada }, { mod: 'comercial_oportunidades', mesma: true });
  t2.hist.entregar(); t2.reg.tela = r.mod;
  assert.equal(t2.hist.state.tipo, 'tela', 'a janela não é refeita: volta ao passo da tela');
  assert.equal(t2.hist.state.mod, 'comercial_oportunidades');
  // voltar depois de recarregar continua dentro do sistema
  t2.hist.back(); t2.hist.entregar();
  assert.equal(t2.reg.tela, 'mobile_home');
  // tela fora do menu: Início
  const t3 = montar();
  t3.nucleo.iniciarSessao(); t3.abrir('proibida');
  const t4 = montar(); t4.hist.entradas = t3.hist.entradas; t4.hist.i = t3.hist.i;
  assert.equal(t4.nucleo.iniciarSessao().mod, 'mobile_home');
  // link copiado (#/frota) numa aba nova
  const t5 = montar(); t5.reg.hash = 'frota';
  assert.deepEqual(JSON.parse(JSON.stringify(t5.nucleo.iniciarSessao())), { mod: 'frota', mesmaEntrada: false });
  // sair (logout) zera a pilha
  t.nucleo.encerrarSessao();
  assert.equal(t.hist.state.tipo, 'base');
  assert.equal(t.nucleo.ativo(), false);
});

test('window.open: só endereço vazio vira documento; links reais (Drive, wa.me, mailto, download) seguem fora', () => {
  const { SGO_NAV_ehDocumentoVazio_: vazio, SGO_NAV_mesmaOrigem_: origem } = carregar();
  assert.equal(vazio('', '_blank'), true);
  assert.equal(vazio(undefined), true);
  assert.equal(vazio('about:blank', '_blank'), true);
  assert.equal(vazio('', '_self'), false);
  for (const u of ['https://drive.google.com/file/d/x/view', 'https://wa.me/5511999999999?text=oi', 'mailto:a@b.test', '/arquivos/x.pdf?baixar=1', 'blob:http://x/1']) assert.equal(vazio(u, '_blank'), false, u);
  assert.equal(origem('/arquivos/rel.html', 'sgo.test'), true);
  assert.equal(origem('https://sgo.test/arquivos/rel.html', 'sgo.test'), true);
  assert.equal(origem('https://drive.google.com/x', 'sgo.test'), false);
  assert.equal(origem('blob:https://sgo.test/1', 'sgo.test'), false);
  assert.equal(origem('mailto:a@b.test', 'sgo.test'), false);
});

test('janela falsa do visualizador: document.write, close, closed, location e print', () => {
  const { SGO_NAV_criarJanelaFalsa_: criar } = carregar();
  const escrito = [];
  const cw = { document: { open() { escrito.length = 0; }, write(h) { escrito.push(h); }, close() {}, title: '' }, location: { href: 'about:blank' }, alerta: function () { return this === cw; } };
  const ctl = { f: false, nav: [], imp: 0, fechar() { this.f = true; }, fechado() { return this.f; }, imprimir() { this.imp++; }, navegar(u) { this.nav.push(u); } };
  const w = criar(cw, ctl);
  w.opener = null;
  assert.equal(w.opener, null);
  w.document.write('<p>Gerando…</p>');
  w.document.open(); w.document.write('<html>A4</html>'); w.document.close();
  assert.deepEqual(escrito, ['<html>A4</html>']);
  w.focus(); w.print();
  assert.equal(ctl.imp, 1);
  assert.equal(w.alerta(), true, 'funções da janela de verdade rodam ligadas a ela');
  w.location.href = 'https://drive.google.com/file/d/1/view';
  w.location = '/arquivos/r.html';
  assert.deepEqual(ctl.nav, ['https://drive.google.com/file/d/1/view', '/arquivos/r.html']);
  assert.equal(w.closed, false);
  w.close();
  assert.equal(w.closed, true);
});

test('casca: abrir(), Voltar da barra, entrada, saída, Index e estilos ligados à navegação', () => {
  const core = ler('JS_Core.html'), idx = ler('Index.html'), css = ler('UI_Estilos.html'), nav = ler('JS_Navegacao.html');
  const abrirFn = core.slice(core.indexOf('  function abrir(mod) {'), core.indexOf('  function abrirModulo_(mod) {'));
  assert.match(abrirFn, /SGO_NAV\.antesDeAbrir\(mod\)\) return;/);
  assert.match(abrirFn, /SGO_NAV\.aoAbrir\(mod\)/);
  assert.ok(abrirFn.indexOf('trocar_senha') < abrirFn.indexOf('antesDeAbrir'), 'Trocar minha senha abre por cima, sem passar pela pilha');
  const voltarFn = core.slice(core.indexOf('  function voltarMobile_() {'), core.indexOf('  function mobileBuscarComDebounce_'));
  assert.match(voltarFn, /SGO_NAV\.voltar\(\)\) return;/);
  assert.match(core, /SGO_NAV\.iniciarSessao\(\)/);
  assert.match(core, /SGO_NAV\.encerrarSessao\(\)/);
  assert.match(core, /function SGO_irTelaDeEntrada_\(\)/);
  assert.ok(idx.indexOf("include('JS_Navegacao')") > idx.indexOf("include('JS_Core')"), 'JS_Navegacao depois de JS_Core');
  assert.ok(idx.indexOf("include('JS_Navegacao')") < idx.indexOf("include('JS_LavCiclo')"));
  assert.match(css, /html\.sgo-movel \.app-shell\.modo-mobile \.mobile-topbar \{ z-index: 100650; \}/, 'barra do topo por cima das janelas no celular');
  assert.match(css, /\.sgo-nav-janela:not\(\.sgo-visor\) \{ top: var\(--mobile-topbar-h/);
  assert.match(css, /\.sgo-visor-btn \{[^}]*min-width: 44px; min-height: 44px;/, 'botões do visualizador com 44 px');
  // visualizador só no celular (decisão do dono, 01/11/2026); travas reconhecidas
  assert.match(nav, /if \(nucleo\.ativo\(\) && ehCelular\(\) && SGO_NAV_ehDocumentoVazio_\(u, alvo\)\) return abrirVisor/);
  assert.match(nav, /if \(!nucleo\.ativo\(\) \|\| !ehCelular\(\)\) return false;/);
  assert.match(nav, /classList\.contains\("bloqueante"\)/);
  assert.match(nav, /SegAcesso_fecharEtapas_/);
  assert.match(nav, /@media screen \{ html \{ zoom:/, 'ajuste à largura só na tela; a impressão continua A4');
  assert.match(nav, /SGO_NAV_DESLIGADO/, 'chave para desligar');
  // ninguém apaga o estado da pilha com replaceState(null)
  for (const f of fs.readdirSync(pasta).filter((x) => /^JS_.*\.html$/.test(x))) {
    if (f === 'JS_SegurancaAcesso.html') continue; // roda antes da entrada (limpa o token do link de senha)
    assert.doesNotMatch(ler(f), /history\.replaceState\(null/, f);
  }
});

test('módulos com gancho: relatório do ciclo, caixa de decisões e certificado do celular', () => {
  const lc = ler('JS_LavCiclo.html'), gd = ler('JS_Gestao.html'), core = ler('JS_Core.html');
  assert.match(lc, /SGO_NAV\.abrirDocumento\(\{ url: u, titulo: "Relatório do ciclo"/);
  assert.match(lc, /if \(baixar\) u = comBaixar\(u\);/, 'Baixar continua indo direto ao arquivo');
  assert.match(lc, /SGO_NAV\.empilhar\("Busca"/);
  assert.match(lc, /SGO_NAV\.limparSubniveis\(\)/);
  assert.match(lc, /SGO_NAV\.empilhar\("Gerar relatório", volta\)/);
  assert.match(gd, /SGO_NAV\.empilhar\("Regras e responsáveis"/);
  assert.match(gd, /SGO_voltarOu_\(Gestao_renderCaixa_\)/);
  assert.match(core, /SGO_NAV\.empilhar\("Novo cliente", function \(\) \{ MOBILE_CERTCAL_RETORNO = null; renderMobileCertCalCliente_\(\); \}\)/);
  assert.match(core, /SGO_NAV\.empilhar\("Equipamento", renderMobileCertCalCliente_, \{ substituir: true \}\)/);
  assert.match(core, /SGO_NAV\.empilhar\("Tela completa", function \(\) \{ delete SGO_MOVEL_LIBERADAS\[tipoMotor\]; abrir\(modLib\); \}\)/, 'Abrir a tela completa volta ao resumo');
});

test('ajuda e manual explicam o Voltar e o visualizador', () => {
  const ajuda = ler('SGO_Ajuda_Principal.js');
  assert.match(ajuda, /voltar do celular/i);
  assert.match(ajuda, /visualizador/i);
  const dev = fs.readFileSync(path.join(__dirname, '../docs/NAVEGACAO_VOLTAR_SGO.md'), 'utf8');
  assert.match(dev, /SGO_NAV\.empilhar/, 'como usar o gancho nos módulos');
  assert.match(ler('SGO_AssistenteManuais.js'), /MANUAL_NAVEGACAO_VOLTAR/, 'base do assistente gerada de novo');
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_NAVEGACAO_VOLTAR.md'), 'utf8');
  assert.match(manual, /Descartar o que foi digitado/);
  assert.match(manual, /900 px/);
});
