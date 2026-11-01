// Programa de melhoria do SGO+, Etapa 4 (01/11/2026): documentos técnicos no celular. Confere a lógica nova da casca (índice
// das seções, "Próxima", seção atual, quando mostrar), a marca de formulário alterado, as regras só de celular, a tabela larga
// do visualizador só na tela, a ajuda comum e os manuais. Confere também que nenhum gerador de documento A4 foi tocado por estas
// regras (o documento impresso tem valor legal). Só lógica; sem dados reais.
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
const MODULOS = ['autoclave', 'lavadora', 'cadeia_frio', 'estufa_banhomaria', 'baixa_temperatura', 'declaracao_exec', 'declaracao_qiqo',
  'relatorio_calibracao', 'certificado_calibracao', 'padroes', 'pgt_pop', 'reg_op', 'planejamento_cme', 'cronograma_execucao', 'nr13'];

test('índice: rótulo curto sem a explicação, seção atual e quando aparece', () => {
  const core = ler('JS_Core.html');
  const ctx = rodar([funcao(core, 'SGO_docRotulo_'), funcao(core, 'SGO_docSecaoAtual_'), funcao(core, 'SGO_docPrecisaIndice_')]);
  assert.equal(ctx.SGO_docRotulo_('  3. Qualificação de Instalação / Operação (QI/QO)  '), '3. Qualificação de Instalação /…');
  assert.equal(ctx.SGO_docRotulo_('Buscar no cadastro (opcional)'), 'Buscar no cadastro');
  assert.equal(ctx.SGO_docRotulo_('Documentos gerados: corrigir ou usar como base'), 'Documentos gerados');
  assert.equal(ctx.SGO_docRotulo_('5. Planilha de dados — A4 paisagem'), '5. Planilha de dados');
  assert.equal(ctx.SGO_docRotulo_('1. Cliente'), '1. Cliente');
  assert.equal(ctx.SGO_docSecaoAtual_([200, 900, 1800], 130), -1, 'antes da primeira seção');
  assert.equal(ctx.SGO_docSecaoAtual_([-500, 100, 900], 130), 1);
  assert.equal(ctx.SGO_docSecaoAtual_([-3000, -2000, -100], 130), 2, 'última seção');
  assert.equal(ctx.SGO_docPrecisaIndice_(4, 9430, 844), true, 'Relatório QI/QO/QD');
  assert.equal(ctx.SGO_docPrecisaIndice_(3, 9430, 844), false, 'menos de 4 seções');
  assert.equal(ctx.SGO_docPrecisaIndice_(5, 1800, 844), false, 'tela curta (Registros, Cronograma)');
});

test('casca: só nos 15 módulos de documento técnico, só no celular e por fora do formulário', () => {
  const core = ler('JS_Core.html');
  const lista = /const SGO_DOC_MODULOS = (\[[^\]]+\])/.exec(core);
  assert.ok(lista);
  assert.deepEqual(JSON.parse(lista[1].replace(/\s+/g, ' ')), MODULOS);
  MODULOS.forEach((m) => assert.match(core, new RegExp('mod === "' + m + '"'), 'abrir() conhece ' + m));
  const atualizar = funcao(core, 'SGO_docAtualizar_');
  assert.match(atualizar, /ehMobileModo_\(\) && SGO_docEhModulo_\(window\.SGO_MODULO_ATUAL\)/);
  assert.match(atualizar, /if \(!ok\) \{[^\n]*sgo-doc-indice-lugar[^\n]*remove\(\)/, 'no computador o índice sai');
  assert.match(atualizar, /shell\.insertBefore\(lugar, bloco\)/, 'o índice entra como irmão do bloco do módulo, não dentro do formulário');
  const html = atualizar.match(/[\w."()-]+\.innerHTML = /g) || [];
  assert.deepEqual(html, ['lugar.innerHTML = ', 'lugar.querySelector(".sgo-doc-indice-lista").innerHTML = '], 'só o próprio índice é desenhado');
  // seções: blocos com título e as divisórias numeradas da Autoclave e da Lavadora; o manual embutido fica de fora
  const secoes = funcao(core, 'SGO_docSecoes_');
  assert.match(secoes, /\.panel, \.qvinc, \.bt-painel/);
  assert.match(secoes, /\.manual-wrap/);
  assert.match(secoes, /\.section-divider/);
  assert.match(secoes, /\^\\d\+\\\.\\s/);
  // índice preso abaixo da barra do topo (o #conteudo não rola: sticky não prende)
  const marcar = funcao(core, 'SGO_docMarcar_');
  assert.match(marcar, /nav\.classList\.toggle\("fixo", prender\)/);
  assert.match(marcar, /lugar\.style\.minHeight = prender \? nav\.offsetHeight/);
  assert.match(marcar, /Próxima/);
  // as mudanças do próprio índice não disparam o observador (sem laço)
  assert.match(core, /closest\("\.sgo-doc-indice-lugar"\)\)\) \{ agendarDoc\(\); return; \}/);
});

test('formulário alterado: lista, caixa de marcar e arquivo importado marcam data-sgo-sujo com a pergunta própria', () => {
  const core = ler('JS_Core.html');
  const i = core.indexOf('document.addEventListener("change", function (e) {\n      try {\n        const t = e.target;\n        if (!e.isTrusted || !t || !SGO_docEhModulo_');
  assert.ok(i > 0, 'ouvinte de change da Etapa 4');
  const trecho = core.slice(i, i + 1400);
  assert.match(trecho, /checkbox\|radio\|file/);
  assert.match(trecho, /t\.type === "file" && !\(t\.files && t\.files\.length\)/, 'arquivo só conta quando foi escolhido');
  assert.match(trecho, /SGO_DOC_NAO_CONTA\.test/, 'busca e filtro não contam');
  assert.match(trecho, /setAttribute\("data-sgo-sujo", "1"\)/);
  assert.match(trecho, /data-sgo-sujo-texto", "Sair deste formulário\?/);
  assert.match(core, /const SGO_DOC_NAO_CONTA = \/busca\|buscar\|pesquis\|filtro\|search\|procurar\/i;/);
  // a casca lê a marca no voltar (Etapa 2/3)
  const nav = ler('JS_Navegacao.html');
  assert.match(nav, /function marcadoSujo\(el\)/);
  assert.match(nav, /conteudoSujo: function \(\) \{\n\s+if \(sujoEm\(document\.getElementById\("conteudo"\)\)\) return true;/);
});

test('estilo: alvos de toque maiores só no celular e só nos documentos técnicos; nada em impressão nem na folha A4', () => {
  const est = ler('UI_Estilos.html');
  const ini = est.indexOf('/* Etapa 4 (01/11/2026): documentos técnicos no celular');
  assert.ok(ini > 0);
  const bloco = est.slice(ini, est.indexOf('\n\n', est.indexOf('.sgo-doc-movel div[style*="display:flex"] > input.form-control', ini)));
  assert.doesNotMatch(bloco, /@media print|\.folha|@page/);
  bloco.split('\n').filter((l) => /^\s+#app/.test(l)).forEach((l) => assert.match(l, /^\s+#app\.modo-mobile #conteudo /, 'regra só no celular: ' + l.trim().slice(0, 60)));
  assert.match(bloco, /\.sgo-doc-movel :is\(input\[type="checkbox"\], input\[type="radio"\]\) \{ width: 28px; height: 28px;/);
  assert.match(bloco, /:has\(> input:first-child \+ label:last-child\) > label::after \{ content: ""; position: absolute; inset: 0; \}/, 'linha inteira tocável');
  assert.match(bloco, /input\.sensor-ativo[^{]*\{ width: 40px !important; height: 40px !important;/);
  assert.match(bloco, /label:has\(> input\[type="checkbox"\]\)[^{]*\{ min-height: 44px !important; \}/);
  assert.match(bloco, /\.motores-tabs \.motores-tab-btn \{ flex: 0 0 auto; \}/, 'abas sem os 140 px de altura');
  assert.match(bloco, /\.sgo-doc-indice\.fixo \{\n\s+position: fixed;/);
  assert.match(bloco, /\.sgo-doc-indice-bt \{\n\s+flex: 0 0 auto; min-height: 40px !important;/);
  assert.match(bloco, /\.sgo-doc-indice-prox \{\n\s+flex: 0 0 auto; min-height: 40px !important;/);
  // fim da tela acima dos botões redondos (já valia desde 17/10 e 31/10)
  assert.match(est, /\.app-shell\.modo-mobile #conteudo \{ padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\); \}/);
});

test('visualizador do celular: tabela larga rola na própria caixa só em @media screen; o HTML do documento não muda', () => {
  const nav = ler('JS_Navegacao.html');
  const aj = funcao(nav, 'ajustarLargura');
  assert.match(aj, /var REGRA_LARGA = "@media screen \{ table\[data-sgo-visor-largo\] \{ display: block; max-width: 100%; overflow-x: auto;/);
  assert.match(aj, /t\.setAttribute\("data-sgo-visor-largo", "1"\)/);
  const semComentario = aj.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.doesNotMatch(semComentario, /@media print|innerHTML|outerHTML|document\.write/);
  assert.match(aj, /st\.textContent = REGRA_LARGA \+ "\\n@media screen \{ html \{ zoom: "/);
  // só no celular: o window.open vazio vira visualizador apenas com ehCelular() (no computador, aba nova como antes)
  assert.match(nav, /if \(nucleo\.ativo\(\) && ehCelular\(\) && SGO_NAV_ehDocumentoVazio_\(u, alvo\)\) return abrirVisor/);
});

test('documento A4: geradores sem nenhuma regra da Etapa 4', () => {
  const geradores = fs.readdirSync(pasta).filter((f) => /^SGO_.*\.js$/.test(f) && !/^SGO_Ajuda|^SGO_AssistenteManuais/.test(f));
  assert.ok(geradores.length > 100);
  geradores.forEach((f) => {
    const s = ler(f);
    assert.doesNotMatch(s, /sgo-doc-movel|sgo-doc-indice|data-sgo-visor-largo|SGO_docAtualizar_/, f);
  });
  // a regra de impressão comum do A4 continua a mesma
  assert.match(ler('SGO_DocA4.js'), /'@media print\{body\{background:#fff\}\.folha\{width:auto;margin:0;padding:0;box-shadow:none\}\.cab-tela,\.barra-tela,\.so-tela\{display:none!important\}\}'/);
});

test('ajuda: complemento comum dos documentos no celular, sem repetir e só nas telas certas', () => {
  const aj = ler('SGO_Ajuda.js');
  assert.match(aj, /try \{ SGO_ajudaDocCelular_\(todas\); \}/);
  const ctx = rodar([/var SGO_AJUDA_DOC_COM_INDICE = [^\n]+/.exec(aj)[0], /var SGO_AJUDA_DOC_TODAS = [^\n]+/.exec(aj)[0], funcao(aj, 'SGO_ajudaDocCelular_')]);
  const telas = { declaracao_qiqo: { problemas: [{ situacao: 'x', oQueFazer: 'y' }] }, pgt_pop: {}, certificado_calibracao: { problemas: [] }, frota: { problemas: [] } };
  ctx.SGO_ajudaDocCelular_(telas);
  ctx.SGO_ajudaDocCelular_(telas);
  const s = (k) => telas[k].problemas.map((p) => p.situacao);
  assert.equal(s('declaracao_qiqo').length, 5, 'a existente + 4, sem repetir na segunda chamada');
  assert.ok(s('declaracao_qiqo').some((t) => /formulário é muito longo/.test(t)));
  assert.equal(s('pgt_pop').length, 2, 'tela curta: voltar e tabela larga, sem índice');
  assert.deepEqual(s('certificado_calibracao'), [], 'o certificado no celular tem assistente próprio');
  assert.deepEqual(s('frota'), []);
  telas.declaracao_qiqo.problemas.forEach((p) => { assert.doesNotMatch(p.oQueFazer, /SLA|Kanban|Gantt|sticky|z-index|undefined/); });
  assert.doesNotMatch(aj, /item do menu\) e o sistema pergunta/, 'o menu não pergunta: a ajuda não promete');
});

test('manuais: seção "No celular" nos módulos e Etapa 4 no manual de navegação; base do assistente em dia', () => {
  ['MANUAL_MODULO_AUTOCLAVE.md', 'MANUAL_MODULO_LAVADORA.md', 'MANUAL_MODULO_CADEIA_FRIO.md', 'MANUAL_MODULO_ESTUFA_BANHOMARIA.md',
    'MANUAL_MODULO_RELATORIO_QUALIFICACAO_QIQOQD.md', 'MANUAL_MODULO_DECLARACAO_EXECUCAO.md', 'MANUAL_MODULO_RELATORIO_CALIBRACAO.md'].forEach((f) => {
    const s = lerDoc(f);
    assert.match(s, /## No celular \(01\/11\/2026\)[\s\S]*Índice das seções[\s\S]*Próxima[\s\S]*O documento A4 não muda/, f);
  });
  ['MANUAL_MODULO_BAIXA_TEMPERATURA.md', 'MANUAL_MODULO_CERTIFICADO_CALIBRACAO.md', 'MANUAL_MODULO_PGT_POP.md', 'MANUAL_MODULO_REGISTROS_OPERACIONAIS.md',
    'MANUAL_MODULO_PLANEJAMENTO_CME.md', 'MANUAL_MODULO_CRONOGRAMA_EXECUCAO.md'].forEach((f) => assert.match(lerDoc(f), /## No celular \(01\/11\/2026\)[\s\S]*Pré-visualização do documento/, f));
  assert.match(lerDoc('MANUAL_NAVEGACAO_VOLTAR.md'), /## Etapa 4 \(01\/11\/2026\): documentos técnicos no celular/);
  const base = ler('SGO_AssistenteManuais.js');
  assert.match(base, /Etapa 4 \(01\/11\/2026\)/);
  assert.match(base, /No celular \(01\/11\/2026\)/);
});
