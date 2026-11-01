// Programa de melhoria do SGO+, Etapa 2 (01/11/2026): ganchos de voltar nos sub-níveis dos módulos mais usados.
// Confere, na pilha da casca (JS_Navegacao.html): a rolagem guardada no passo de onde a pessoa saiu e devolvida no voltar; a ficha
// aberta por cima de outra que reabre a anterior (janelaVolta); descartar um sub-nível que deixou de valer; o texto digitado dentro
// de uma janela, que pergunta antes e responde sozinho o "confirm" do módulo; os painéis do bate-papo e do "Tire sua dúvida"
// (persistentes ao trocar de tela). E confere que os módulos usam os ganchos (Comercial, Assistência, Compras, Frota, cadastros,
// Padrões, Vínculos), o "Voltar ao SGO+" do documento A4, as ajudas com a frase do celular e o manual. Só lógica; sem dados reais.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function carregar() {
  const fonte = ler('JS_Navegacao.html').replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, Proxy, window: { __SGO_NAV_TESTE__: true } });
  vm.runInContext(fonte, ctx);
  return ctx;
}
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
function montar() {
  const ctx = carregar();
  const hist = criarHistorico();
  const reg = { avisos: [], confirmar: [], fechadas: [], tela: 'mobile_home', relogio: 1000, rol: 0, restaurou: [], semPerguntar: 0, persistentes: new Set() };
  const janelas = new Map();
  const nucleo = ctx.SGO_NAV_criarNucleo_({
    history: hist, urlBase: () => '/',
    abrirTela: (mod) => { reg.tela = mod; nucleo.aoAbrir(mod); },
    telaAtual: () => reg.tela, telaInicial: () => 'mobile_home', usuario: () => 'u1',
    aviso: (t) => reg.avisos.push(t),
    confirmar: (t) => { reg.confirmar.push(t); return reg.resposta !== false; },
    janelaAberta: (el) => !!(janelas.get(el) || {}).aberta,
    janelaTrava: () => false,
    janelaSuja: (el) => !!(janelas.get(el) || {}).suja,
    fecharJanela: (el, conf) => { const j = janelas.get(el); if (!j) return false; j.aberta = false; reg.fechadas.push({ el, conf }); return true; },
    rotuloJanela: (el) => el, textoTrava: (el) => el,
    conteudoSujo: () => !!reg.conteudoSujo,
    telaPermitida: () => true, hashTela: () => '',
    agora: () => reg.relogio, agendar: () => {},
    rolagem: () => reg.rol,
    restaurarRolagem: (y) => { reg.restaurou.push(y); reg.rol = y; },
    semPerguntar: (fn) => { reg.semPerguntar++; fn(); },
    janelaPersistente: (el) => reg.persistentes.has(el)
  });
  hist.aoPop = (st) => nucleo.aoPop(st);
  const abrir = (mod) => { if (!nucleo.antesDeAbrir(mod)) return false; reg.tela = mod; nucleo.aoAbrir(mod); return true; };
  const sincronizar = () => nucleo.janelasMudaram([...janelas].filter(([, j]) => j.aberta).map(([k]) => k));
  const janela = (nome, extra) => { janelas.set(nome, Object.assign({ aberta: true }, extra || {})); sincronizar(); };
  const voltar = () => { hist.back(); hist.entregar(); sincronizar(); hist.entregar(); };
  return { hist, reg, nucleo, abrir, janela, janelas, sincronizar, voltar };
}

test('rolagem: o passo guarda a altura da lista ao sair e o voltar devolve a mesma altura', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('clientes');
  t.reg.rol = 640; // a pessoa rolou a lista
  t.abrir('unidades');
  t.reg.rol = 0;
  t.voltar();
  assert.equal(t.reg.tela, 'clientes');
  assert.deepEqual(t.reg.restaurou, [640], 'voltou à altura em que saiu da lista');
  // sub-nível: a rolagem medida no toque vale (passo automático) e volta junto
  t.reg.rol = 900;
  t.nucleo.empilhar('Ficha', () => { t.reg.desfez = true; }, { rol: 420 });
  t.voltar();
  assert.equal(t.reg.desfez, true);
  assert.equal(t.reg.restaurou[1], 420);
});

test('janelaVolta: a ficha aberta por cima de outra (O.S. do chamado) reabre a anterior quando o voltar a fecha', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('assistencia');
  t.janela('chamado');
  // o chamado é trocado pela O.S. (mesma gaveta, elemento novo): o passo é substituído e ganha o "reabrir o chamado"
  t.janelas.get('chamado').aberta = false;
  t.nucleo.janelaVolta('os', () => { t.reg.reabriu = (t.reg.reabriu || 0) + 1; t.janela('chamado2'); });
  t.janela('os');
  const n = t.hist.entradas.length;
  t.voltar();
  assert.equal(t.reg.reabriu, 1, 'reabriu o chamado');
  assert.equal(t.janelas.get('os').aberta, false, 'a O.S. fechou');
  assert.equal(t.reg.tela, 'assistencia', 'ficou no módulo');
  assert.equal(t.hist.entradas[t.hist.i].state.tipo, 'janela', 'o chamado reaberto é de novo um passo (voltar fecha o chamado)');
  assert.ok(t.hist.entradas.length <= n, 'não sobra passo a mais');
  // fechada pelo próprio botão, a O.S. não reabre nada
  t.nucleo.janelaVolta('os3', () => { t.reg.indevido = true; });
  t.janelas.get('chamado2').aberta = false; t.janela('os3');
  t.janelas.get('os3').aberta = false; t.sincronizar(); t.hist.entregar();
  assert.equal(t.reg.indevido, undefined);
});

test('descartar: o sub-nível que deixou de valer ("Cancelar" do formulário) sai da pilha sem desfazer nada', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('clientes');
  t.janela('painel');
  const pos = t.hist.i;
  const id = t.nucleo.empilhar('Painel: Editar', () => { t.reg.desfez = true; });
  assert.equal(t.hist.i, pos + 1);
  t.nucleo.descartar(id);
  t.hist.entregar();
  assert.equal(t.hist.i, pos, 'voltou um passo sem tratar');
  assert.equal(t.reg.desfez, undefined, 'não chamou o aoVoltar');
  assert.equal(t.janelas.get('painel').aberta, true, 'o painel continua aberto');
  t.voltar();
  assert.equal(t.janelas.get('painel').aberta, false, 'o próximo voltar fecha o painel');
});

test('texto digitado dentro da janela: o voltar de um sub-nível pergunta antes e responde sozinho o confirm do módulo', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('padroes');
  t.janela('painel');
  t.nucleo.empilhar('Padrão: cadastro', () => { t.reg.desfez = true; });
  t.reg.conteudoSujo = true;
  t.reg.resposta = false;
  t.voltar();
  assert.equal(t.reg.desfez, undefined, 'Cancelar mantém o formulário');
  assert.equal(t.reg.confirmar.length, 1);
  t.reg.resposta = true;
  t.voltar();
  assert.equal(t.reg.desfez, true);
  assert.equal(t.reg.semPerguntar, 1, 'o confirm do módulo foi respondido sozinho');
  // mantemTexto: não pergunta
  t.reg.confirmar = [];
  t.nucleo.empilhar('Resultado', () => {}, { mantemTexto: true });
  t.voltar();
  assert.equal(t.reg.confirmar.length, 0);
});

test('painéis do bate-papo e do "Tire sua dúvida": fecham com o voltar e continuam abertos ao trocar de tela', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('frota');
  t.reg.persistentes.add('aswPainel');
  t.janela('aswPainel');
  t.abrir('clientes');
  assert.equal(t.janelas.get('aswPainel').aberta, true, 'trocar de tela não fecha o painel');
  t.sincronizar(); // o painel entra de novo na pilha, por cima da tela nova
  t.voltar();
  assert.equal(t.janelas.get('aswPainel').aberta, false, 'o voltar fecha o painel');
  assert.equal(t.reg.tela, 'clientes', 'e fica na tela');
  t.voltar();
  assert.equal(t.reg.tela, 'frota', 'o voltar seguinte volta à tela anterior');
});

test('janela morta no meio da pilha: o voltar desfaz o sub-nível de cima e segue até o passo vivo', () => {
  const t = montar();
  t.nucleo.iniciarSessao();
  t.abrir('assistencia');
  t.nucleo.empilhar('Chamados: Triagem', () => { t.reg.aba = 'Todos'; });
  t.janela('aviso'); // uma janela abre e é tirada da tela sem o voltar
  t.nucleo.empilhar('Chamados: Todos', () => { t.reg.aba = 'Triagem'; });
  t.janelas.get('aviso').aberta = false; // fechou "por fora", mas o passo dela ficou abaixo do sub-nível
  t.voltar();
  assert.equal(t.reg.aba, 'Triagem', 'desfez a aba de cima');
  assert.equal(t.reg.tela, 'assistencia');
  t.voltar();
  assert.equal(t.reg.aba, 'Todos', 'o voltar seguinte desfaz a aba de baixo (não sai do módulo)');
  assert.equal(t.reg.tela, 'assistencia');
});

test('casca: janelas marcadas (data-sgo-janela), painéis dos dois componentes, rolagem e API nova; componentes sem mudança', () => {
  const n = ler('JS_Navegacao.html');
  assert.match(n, /\[data-sgo-janela='1'\]/);
  assert.match(n, /aswPainel/);
  assert.match(n, /comw-painel/);
  assert.match(n, /function restaurarRolagem\(y\)/);
  assert.match(n, /descartar: function \(id\) \{ nucleo\.descartar\(id\); \}/);
  assert.match(n, /janelaVolta: function \(el, fn\) \{ nucleo\.janelaVolta\(el, fn\); \}/);
  assert.match(n, /restaurando: function \(\) \{ return nucleo\.restaurando\(\); \}/);
  assert.match(n, /descartar: function \(\) \{\}, janelaVolta: function \(\) \{\}, restaurando: vazio/, 'chave de desligar tem as funções novas vazias');
  for (const w of ['AssistenteWidget.html', 'ComunicacaoWidget.html']) assert.doesNotMatch(ler(w), /SGO_NAV/, w + ' não muda');
});

test('módulos com gancho: Comercial, Assistência, Compras, Frota, cadastros, Padrões e Vínculos', () => {
  const cad = ler('JS_Cadastros.html');
  assert.match(cad, /p\.setAttribute\("data-sgo-janela", "1"\)/, 'painel do cadastro é janela da pilha');
  assert.match(cad, /function CadUI_painelPasso_\(anterior, nova\)/, 'aba e formulário do painel são passos');
  assert.match(cad, /SGO_NAV\.descartar\(x\.id\)/, 'fechar o painel tira os passos de dentro dele');
  assert.match(cad, /SGO_NAV\.restaurando && SGO_NAV\.restaurando\(\)/, 'a busca e os filtros da lista ficam ao voltar para a tela');
  const com = ler('JS_Comercial.html');
  assert.match(com, /function Comercial_abrirPropostaDaOportunidade_\(propId, opoId, aviso\)/);
  assert.match(com, /SGO_NAV\.janelaVolta\(g, function \(\) \{ if \(CM\.voltaOpo === v\) CM\.voltaOpo = null; Comercial_abrirOportunidade_\(v\.opo\); \}\)/);
  assert.doesNotMatch(com, /g\.remove\(\); abrir\("comercial_propostas"\)/, 'a proposta da oportunidade não troca mais de tela');
  const at = ler('JS_Assistencia.html');
  assert.match(at, /AT\.voltaChamado = \{ os: r\.os\.id, ch: c\.id \}/);
  assert.match(at, /SGO_NAV\.empilhar\("Chamados: "/);
  assert.match(at, /SGO_NAV\.empilhar\("O\.S\.: "/);
  const cp = ler('JS_Compras.html');
  assert.match(cp, /SGO_NAV\.empilhar\("Fila de compras: "/);
  assert.match(cp, /SGO_NAV\.empilhar\("Informar compra: "/);
  assert.match(cp, /SGO_NAV\.janelaVolta\(gf, function \(\) \{ Cp_abrirFornecedor_\(f\.id, depois\); \}\)/);
  const fr = ler('JS_Frota.html');
  assert.match(fr, /function tplFrota_ligarVoltarAbas_\(\)/);
  assert.match(fr, /ev\.isTrusted && ev\.type === 'click'/, 'só o toque da pessoa grava passo de aba');
  const core = ler('JS_Core.html');
  assert.match(core, /function fsEntrarForm_\(rotulo\)/);
  ['Retirar veículo', 'Abasteci', 'Passar o carro', 'Ajustar KM do veículo', 'Partida do veículo', 'Registrar abastecimento'].forEach((r) => assert.ok(core.indexOf(r) > 0, r));
  assert.match(core, /SGO_NAV\.empilhar\("Frota: tela completa"/);
  assert.match(ler('JS_Vinculos.html'), /function vincPasso_\(rotulo\)/);
  assert.match(ler('JS_Padroes_Documentos.html'), /function pdrPassoPainel_\(novo\)/);
  assert.doesNotMatch(ler('SGO_Frota_ConteudoModulo.js'), /SGO_NAV/, 'o módulo da Frota (texto gerado) não muda');
});

test('documento A4: "Voltar ao SGO+" só pelo link direto e fora da impressão', () => {
  const ctx = { Utilities: { base64Encode: (s) => Buffer.from(String(s)).toString('base64') } };
  vm.runInNewContext(ler('SGO_DocA4.js'), ctx);
  const h = ctx.SGO_DocA4_inicioDocumento_({ titulo: 'Teste' });
  assert.match(h, /<a class="barra-voltar" id="sgoDocVoltar" href="\/" hidden>Voltar ao SGO\+<\/a>/);
  const m = /<script>([\s\S]*?)<\/script>/.exec(h);
  assert.ok(m, 'tem o script que decide se mostra');
  assert.doesNotThrow(() => new Function(m[1]));
  assert.match(m[1], /window\.top===window&&!window\.opener/);
  assert.match(m[1], /location\.pathname\.indexOf\("\/arquivos\/"\)===0/);
  // o botão fica dentro da barra da tela, que some na impressão
  assert.match(h, /@media print\{[^}]*\}[^@]*\.barra-tela/);
});

test('ajudas: documento que abre em aba nova diz o que acontece no celular; manual e base do assistente atualizados', () => {
  const ajudas = fs.readdirSync(pasta).filter((f) => /^SGO_Ajuda_.*\.js$/.test(f));
  const texto = ajudas.map((f) => ler(f)).join('\n');
  const n = (texto.match(/No celular, o documento abre dentro do SGO\+/g) || []).length;
  assert.ok(n >= 35, 'frase do celular nas ajudas dos módulos: ' + n);
  // nenhuma linha que fala de documento/relatório abrindo em aba nova ficou sem a frase do celular
  const semFrase = [];
  ajudas.forEach((f) => ler(f).split('\n').forEach((l, i) => {
    if (/(documento|relat[óo]rio|certificado|planilha|minuta|prévia)[^."]{0,40}abre[^."]{0,30}(aba nova|nova aba|outra aba)/i.test(l) && !/No celular/.test(l)) semFrase.push(f + ':' + (i + 1));
  }));
  assert.deepEqual(semFrase, []);
  const princ = ler('SGO_Ajuda_Principal.js');
  assert.match(princ, /bate-papo/i);
  assert.match(princ, /Voltar ao SGO\+/);
  const man = fs.readFileSync(path.join(raiz, 'docs/MANUAL_NAVEGACAO_VOLTAR.md'), 'utf8');
  assert.match(man, /Etapa 2/);
  assert.match(man, /Voltar ao SGO\+/);
  const tec = fs.readFileSync(path.join(raiz, 'docs/NAVEGACAO_VOLTAR_SGO.md'), 'utf8');
  assert.match(tec, /janelaVolta/);
  assert.match(tec, /data-sgo-janela/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Voltar ao SGO\+/);
});

test('revisão: formulário alterado sem texto digitado também pergunta; Frota no computador e volta à oportunidade sem sobra', () => {
  const nav = ler('JS_Navegacao.html');
  assert.match(nav, /function marcadoSujo\(el\)/);
  assert.match(nav, /querySelectorAll\("\[data-sgo-sujo\]"\)/);
  assert.match(ler('JS_Cadastros.html'), /setAttribute\("data-sgo-sujo", sim \? "1" : "0"\)/);
  const pdr = ler('JS_Padroes_Documentos.html');
  assert.match(pdr, /function pdrNavSujo_\(\)/);
  assert.equal((pdr.match(/pdrNavSujo_\(\);corpo\.oninput/g) || []).length, 2);
  const core = ler('JS_Core.html');
  assert.match(core, /FS\.navForm = SGO_NAV\.empilhar\(/);
  assert.match(core, /SGO_NAV\.descartar\(FS\.navForm\)/);
  const com = ler('JS_Comercial.html');
  assert.match(com, /CM\.voltaOpoNova = \{ prop: propId, opo: opoId \}/);
  assert.match(com, /CM\.voltaOpo = nova && nova\.prop === id \? nova : null/);
});
