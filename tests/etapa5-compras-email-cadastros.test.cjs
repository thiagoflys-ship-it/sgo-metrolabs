// Programa de melhoria do SGO+, Etapa 5 (01/11/2026): Compras, E-mail, Cadastros e Gestão. Confere: as janelas do E-mail fecham
// pelo "×" (que a casca usa no voltar), pelo fundo, pela tecla Esc, com pergunta quando há algo digitado; o perfil Cliente
// sem o filtro "Todos os clientes" e sem as pendências internas; as travas do servidor que recortam pelo cliente da sessão;
// as listas vazias que dizem o que fazer; os textos da Gestão sem jargão; ajudas e manuais. Só lógica; sem dados reais.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const docs = path.join(__dirname, '../docs');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const lerDoc = (f) => fs.readFileSync(path.join(docs, f), 'utf8').replace(/\r\n/g, '\n');

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

// DOM mínimo para a janela do E-mail
function domFalso() {
  const doc = { ouvintes: {}, porId: {} };
  const elemento = () => {
    const el = { ouvintes: {}, id: '', className: '', innerHTML: '', isConnected: false,
      addEventListener(t, f) { (el.ouvintes[t] = el.ouvintes[t] || []).push(f); },
      disparar(t, ev) { (el.ouvintes[t] || []).forEach((f) => f(Object.assign({ target: el }, ev || {}))); },
      remove() { el.isConnected = false; if (doc.porId[el.id] === el) delete doc.porId[el.id]; } };
    return el;
  };
  doc.createElement = elemento;
  doc.body = { appendChild(el) { el.isConnected = true; if (el.id) doc.porId[el.id] = el; } };
  doc.getElementById = (id) => doc.porId[id] || null;
  doc.addEventListener = (t, f) => { (doc.ouvintes[t] = doc.ouvintes[t] || []).push(f); };
  doc.tecla = (key) => (doc.ouvintes.keydown || []).forEach((f) => f({ key, stopPropagation() {} }));
  return doc;
}
function janelaEmail(confirma) {
  const fonte = ler('JS_Email.html');
  const document = domFalso();
  const perguntas = [];
  const ctx = vm.createContext({ document, EM: { comp: null }, descartou: 0,
    confirm: (t) => { perguntas.push(t); return confirma; } });
  vm.runInContext([funcao(fonte, 'Email_janela_'), funcao(fonte, 'Email_fecharJanela_'), funcao(fonte, 'Email_fecharPeloUsuario_'),
    'function Email_descartar_() { descartou++; EM.comp = null; Email_fecharJanela_(); }'].join('\n'), ctx);
  return { ctx, document, perguntas };
}

test('E-mail: toda janela tem o "×" no alto, marcado para o voltar da casca', () => {
  const { ctx, document } = janelaEmail(true);
  const o = ctx.Email_janela_('<h3>Nova assinatura</h3>');
  assert.equal(document.getElementById('emOverlay'), o);
  assert.match(o.innerHTML, /<button type="button" class="em-fechar" data-sgo-fechar aria-label="Fechar a janela"[^>]*onclick="Email_fecharPeloUsuario_\(\)">&times;<\/button>/);
  assert.ok(o.innerHTML.indexOf('em-janela-topo') < o.innerHTML.indexOf('<h3>'), 'o "×" vem antes do título');
  ctx.Email_fecharPeloUsuario_();
  assert.equal(document.getElementById('emOverlay'), null, 'fecha sem nada digitado, sem perguntar');
});

test('E-mail: fundo fecha só quando o toque começa e termina no fundo; Esc fecha; digitado pergunta antes', () => {
  let t = janelaEmail(true);
  let o = t.ctx.Email_janela_('<h3>x</h3>');
  o.disparar('mousedown', { target: {} }); o.disparar('click', { target: o });
  assert.ok(t.document.getElementById('emOverlay'), 'arrastar a seleção de dentro para o fundo não fecha');
  o.disparar('click', { target: {} });
  assert.ok(t.document.getElementById('emOverlay'), 'clique dentro da janela não fecha');
  o.disparar('mousedown', { target: o }); o.disparar('click', { target: o });
  assert.equal(t.document.getElementById('emOverlay'), null, 'toque no fundo fecha');
  o = t.ctx.Email_janela_('<h3>x</h3>');
  t.document.tecla('Escape');
  assert.equal(t.document.getElementById('emOverlay'), null, 'Esc fecha');
  t.document.tecla('Escape'); // sem janela: nada acontece

  t = janelaEmail(false);
  o = t.ctx.Email_janela_('<h3>x</h3>');
  o.disparar('input', {});
  t.ctx.Email_fecharPeloUsuario_();
  assert.equal(t.perguntas.length, 1);
  assert.match(t.perguntas[0], /^Fechar sem salvar\?/);
  assert.ok(t.document.getElementById('emOverlay'), 'respondeu "não": a janela fica com o que foi digitado');
  o.disparar('change', { target: { id: 'emAssSel' } });
  assert.equal(t.perguntas.length, 1);
});

test('E-mail: na janela de escrever, fechar usa o Descartar de sempre (que já pergunta)', () => {
  const t = janelaEmail(true);
  t.ctx.Email_janela_('<h3>Escrever e-mail</h3>');
  t.ctx.EM.comp = { sujo: true };
  t.ctx.Email_fecharPeloUsuario_();
  assert.equal(t.ctx.descartou, 1);
  assert.equal(t.perguntas.length, 0, 'não pergunta duas vezes');
  assert.equal(t.document.getElementById('emOverlay'), null);
});

test('E-mail: celular com espaço para os botões redondos e casca reconhece a janela', () => {
  const fonte = ler('JS_Email.html');
  assert.match(fonte, /\.em-janela \{ border-radius: 0; min-height: 100vh; max-width: none; padding-bottom: 96px; \}/);
  assert.match(fonte, /\.em-janela-topo \{ position: sticky; top: 0;/);
  assert.match(fonte, /\.em-fechar \{ width: 44px; height: 44px;/);
  const nav = ler('JS_Navegacao.html');
  assert.match(nav, /\.em-overlay/);
  assert.match(nav, /b\.hasAttribute\("data-sgo-fechar"\)/, 'o voltar clica primeiro no botão marcado data-sgo-fechar');
  // a lista não se redesenha sozinha com a janela aberta
  assert.match(funcao(fonte, 'Email_emEdicao_'), /document\.querySelector\("\.em-overlay"\)/);
});

test('Cadastros: perfil Cliente sem "Todos os clientes" e sem pendências internas', () => {
  const fonte = ler('JS_Cadastros.html');
  const montar = funcao(fonte, 'CadTela_montar_');
  const bloco = /if \(CadUI_ehCliente_\(\)\) \{\n\s+cfg\.filtros = [^\n]+\n\s+cfg\.resumo = [^\n]+\n\s+\}/.exec(montar);
  assert.ok(bloco, 'recorte do perfil Cliente no começo de CadTela_montar_');
  const rodaRecorte = (cliente) => {
    const cfg = { filtros: [{ id: 'cliente' }, { id: 'tipo' }], resumo: [{ id: 'todos' }, { id: 'incompleto' }, { id: 'vinculo' }, { id: 'docs' }] };
    vm.runInContext(bloco[0], vm.createContext({ cfg, CadUI_ehCliente_: () => cliente }));
    return cfg;
  };
  const c = rodaRecorte(true);
  assert.deepEqual(c.filtros.map((f) => f.id), ['tipo']);
  assert.deepEqual(c.resumo.map((r) => r.id), ['todos', 'docs']);
  const e = rodaRecorte(false);
  assert.equal(e.filtros.length, 2); assert.equal(e.resumo.length, 4);

  const ctx = vm.createContext({ perfil: 'CLIENTE' });
  vm.runInContext(['var CADUI_PENDENCIAS = ' + /var CADUI_PENDENCIAS = (\{[\s\S]*?\});/.exec(fonte)[1] + ';',
    /var CADUI_PEND_INTERNAS = [^\n]+/.exec(fonte)[0],
    'function CadUI_ehCliente_() { return perfil === "CLIENTE"; }', 'function CadUI_esc_(v) { return String(v); }',
    funcao(fonte, 'CadUI_pendencias_'), funcao(fonte, 'CadUI_chips_')].join('\n'), ctx);
  const item = { PENDENCIAS: ['incompleto', 'vinculo_pendente', 'sem_documento'], FALTAM: ['TAG'] };
  assert.deepEqual(Array.from(ctx.CadUI_pendencias_(item)), ['sem_documento']);
  assert.doesNotMatch(ctx.CadUI_chips_(item), /Cadastro incompleto|Vínculo pendente/);
  assert.match(ctx.CadUI_chips_(item), /Sem documento/);
  ctx.perfil = 'TECNICO';
  assert.match(ctx.CadUI_chips_(item), /Cadastro incompleto[\s\S]*Vínculo pendente/, 'a equipe continua vendo');
  // faixas da ficha da unidade e do equipamento passam pelo mesmo recorte
  const eq = ler('JS_Equipamentos.html');
  assert.equal((eq.match(/if \(CadUI_pendencias_\(e\)\.indexOf\("(vinculo_pendente|incompleto)"\) >= 0\) faixas \+=/g) || []).length, 2);
  assert.equal((fonte.match(/if \(CadUI_pendencias_\(u\)\.indexOf\("(vinculo_pendente|incompleto)"\) >= 0\) faixas \+=/g) || []).length, 2);
  // as duas telas do cliente usam CadTela_montar_ com o filtro de id "cliente"
  assert.match(eq, /\{ id: "cliente", rotulo: "Todos os clientes"/);
  assert.match(fonte, /\{ id: "cliente", rotulo: "Todos os clientes"/);
});

test('Servidor: listas e fichas de cadastro recortadas pelo cliente da sessão (sem vazamento)', () => {
  const painel = ler('SGO_CadastrosPainel.js');
  const base = funcao(painel, 'CadPainel_base_');
  ['C = C.filter(function (r) { return CadPainel_txt_(r.ID) === cid; });', 'U = U.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });',
    'E = E.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });', 'D = D.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });']
    .forEach((t) => assert.ok(base.includes(t), t));
  assert.match(funcao(painel, 'CadPainel_detalhe_'), /CadPainel_base_\(/, 'a ficha lê a base já recortada');
  const eq = ler('SGO_Equipamentos.js');
  assert.match(eq, /if \(perfil !== "CLIENTE"\) return true;[\s\S]{0,200}return SGO_UTILS\.safe\(equipamento\.CLIENTE_ID\) === idClienteReal;/);
  assert.match(eq, /equipamentos = equipamentos\.filter\(e => SGO_UTILS\.safe\(e\.CLIENTE_ID\) === idClienteReal\);/);
  assert.match(eq, /clientes = clientes\.filter\(c => SGO_UTILS\.safe\(c\.ID\) === idClienteReal\);/);
  const q = ler('SGO_QualifEquipamento.js');
  assert.match(funcao(q, 'SGO_QEQ_equipamentoVisivel_'), /SGO_QEQ_ehCliente_\(sessao\) && SGO_QEQ_s_\(e\.CLIENTE_ID\) !== SGO_QEQ_s_\(sessao\.clienteId\)/);
  const vin = fs.readdirSync(pasta).filter((f) => /^SGO_Vinculos.*\.js$/.test(f)).map((f) => ler(f)).join('\n');
  assert.match(vin, /function units\(sessionId,clienteId\) \{\n\s+const s=exigirSessao\(sessionId\);\n\s+if\(text\(s\.perfil\)\.toUpperCase\(\)==='CLIENTE'&&text\(s\.clienteId\)!==text\(clienteId\)\)throw new Error\('Acesso negado\.'\);/);
});

test('Compras: listas vazias dizem o que fazer', () => {
  const f = ler('JS_Compras.html');
  assert.match(f, /nesta situação\. Toque em outra situação acima \(ou em «Todas»\) para ver os demais pedidos\./);
  assert.match(f, /com essa busca nesta situação\. Apague a busca ou toque em «Todas»\./);
  assert.match(f, /Nenhuma compra com esses filtros\. Troque o mês, apague o final do cartão ou escolha «Todas» em Situação\./);
  assert.match(f, /Nada a pagar agora\. Para ver o que já foi pago, escolha «Pagos nos últimos 60 dias» em Mostrar\./);
  assert.doesNotMatch(f, /cp-vazio">Nada nesta lista\.<\/div>/);
  assert.doesNotMatch(f, /cp-vazio">Nenhum pedido nesta situação\.<\/div>/);
});

test('Gestão: "Como funciona" recolhido no celular, textos sem jargão, conta da nota intacta', () => {
  const g = ler('JS_Gestao.html');
  const des = funcao(g, 'Gestao_desenharCaixa_');
  assert.match(des, /<details class="gd-faixa info gd-como"' \+ \(ehMobileModo_\(\) \? '' : ' open'\) \+ '><summary>Como funciona a caixa<\/summary>/);
  assert.match(des, /<\/div><\/details>'\);/);
  assert.match(des, /Quando um módulo precisar de você, o item aparece aqui na hora/);
  assert.match(des, /Toque em outra aba acima para ver os demais\./);
  // o único "reserva da Diretoria" que sobra é o que a tela troca no motivo vindo do servidor (o servidor e o A4 não mudam)
  assert.equal((g.match(/reserva da Diretoria/g) || []).length, 1);
  const motivo = /Gestao_esc_\(String\(i\.motivoRota\)\.replace\((\/[^\n]+?\/), "([^"]+)"\)\)/.exec(funcao(g, 'Gestao_cartao_'));
  assert.ok(motivo);
  const re = eval(motivo[1]);
  assert.equal('A área TECNICA não tem gestor responsável configurado (ou o único é a pessoa envolvida): reserva da Diretoria.'.replace(re, motivo[2]),
    'A área TECNICA não tem gestor responsável configurado (ou o único é a pessoa envolvida): fica com a Diretoria.');
  assert.equal('Item sem área: reserva da Diretoria.'.replace(re, motivo[2]), 'Item sem área: fica com a Diretoria.');
  assert.match(funcao(g, 'Gestao_cartao_'), /"com a Diretoria \(a área não tem gestor\)"/);
  const cart = funcao(g, 'Gestao_cartaoGestor_');
  assert.match(cart, /item\("Vezes que subiu para a Diretoria", String\(i\.escalonamentos\), comp\.escalonamentos\)/);
  assert.match(cart, /item\("Decisões desfeitas na conferência", i\.revertidas \+ " de " \+ i\.homologou \+ " conferidas", comp\.revertidas\)/);
  assert.match(cart, /não entra na nota: sem dado no mês/);
  const regra = funcao(g, 'Gestao_htmlRegraNota_');
  assert.doesNotMatch(regra.replace(/r\.farol\.(verde|amarelo)|data-gd-[a-z]+|gdPeso_|k\.chave/g, ''), /ponderada|Componente|[Ff]arol|escalonamentos/);
  assert.doesNotMatch(funcao(g, 'Gestao_renderDesempenho_'), /escalonamentos|revertidas/);
  // a nota, os pesos e o envio ao servidor não mudaram
  assert.match(funcao(g, 'Gestao_salvarPesos_'), /Gestao_apiConfigAvaliacao/);
  assert.match(cart, /comp\.prazo\)/);
});

test('ajudas e manuais da Etapa 5', () => {
  const email = ler('SGO_Ajuda_Email.js');
  assert.match(email, /Como fecho uma janela do E-mail/);
  const cad = ler('SGO_Ajuda_Cadastros.js');
  assert.match(cad, /A lista não tem filtro de cliente \(só aparece a sua empresa\) e não mostra \\"Cadastro incompleto\\" nem \\"Vínculo pendente\\"/);
  assert.match(ler('SGO_Ajuda_Compras.js'), /A lista está vazia \(Fila, Conferência do Financeiro, A pagar\)/);
  const ges = ler('SGO_Ajuda_Gestao.js');
  assert.doesNotMatch(ges, /Farol|reserva da Diretoria/);
  assert.match(ges, /Ler a caixa no celular/);
  for (const f of ['SGO_Ajuda_Email.js', 'SGO_Ajuda_Cadastros.js', 'SGO_Ajuda_Compras.js', 'SGO_Ajuda_Gestao.js']) assert.doesNotThrow(() => new Function(ler(f)), f);
  assert.match(lerDoc('MANUAL_MODULO_EMAIL.md'), /## Etapa 5 do programa de melhoria \(01\/11\/2026\): fechar as janelas/);
  assert.match(lerDoc('MANUAL_MODULO_GESTAO_DECISOES.md'), /## Etapa 5 do programa de melhoria \(01\/11\/2026\): textos da caixa e do desempenho/);
  assert.match(lerDoc('MANUAL_MODULO_COMPRAS.md'), /## Etapa 5 do programa de melhoria \(01\/11\/2026\): listas vazias/);
  const cli = lerDoc('MANUAL_CLIENTES_UNIDADES_VINCULOS.md');
  assert.match(cli, /O filtro na tela era só aparência: não havia vazamento\./);
  assert.match(lerDoc('MANUAL_NAVEGACAO_VOLTAR.md'), /## Etapa 5 \(01\/11\/2026\): Compras, E-mail, Cadastros e Gestão/);
  const base = ler('SGO_AssistenteManuais.js');
  assert.match(base, /fechar as janelas/);
});

test('arquivos que não podem mudar nesta etapa continuam sem as marcas dela', () => {
  for (const f of ['AssistenteWidget.html', 'ComunicacaoWidget.html']) assert.doesNotMatch(ler(f), /Etapa 5/);
});
