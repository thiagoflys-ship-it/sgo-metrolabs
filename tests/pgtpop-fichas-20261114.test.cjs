// PGT e POP — geração pelas fichas técnicas do especialista (14/11/2026).
// Servidor: código real (Config, Fichas, IA, Documento, Main, SGO_DocRevisao e base A4) num contexto isolado, com a IA
// simulada. Confere: o pedido de cada documento traz a ficha certa e só as normas da ficha; Referências, glossário e
// documentos relacionados montados pelo sistema; norma fora da lista vira "Conferir"; item mínimo ausente vira "Falta";
// número e setor não informados viram "Conferir"; dado obrigatório faltando bloqueia com mensagem completa; POP
// condicional com "não tem" não é gerado; PGT em 6 blocos pelas seções da ficha; a correção preserva as respostas.
// Página completa (Index.html com os include(), servidor simulado com a conferência real de dados) em 1366, 390 e 320 px.
// Os dados de hospital são fictícios. Uso: DEST=<legado candidato> node --require <fontes.cjs> tests/pgtpop-fichas-20261114.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('./_docrev_ambiente.cjs');

let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }

const PASTA = process.env.DEST ? path.resolve(process.env.DEST) : path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ESPEC = path.join(__dirname, '../output/pgtpop-refacao-20261114/especialista');
const SAIDA = path.join(__dirname, '../output/pgtpop-refacao-20261114/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const FICHAS_J = JSON.parse(fs.readFileSync(path.join(ESPEC, 'FICHAS_TECNICAS.json'), 'utf8'));
const NORMAS_J = JSON.parse(fs.readFileSync(path.join(ESPEC, 'NORMAS_VERIFICADAS.json'), 'utf8'));
const NORMA = {}; NORMAS_J.forEach((n) => { NORMA[n.id] = n; });
const FJ = {}; FICHAS_J.fichas.forEach((f) => { FJ[f.codigo] = f; });

// ======================================================================= servidor
const BASE_A4 = ['SGO_Documento_LogoCompartilhado.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js'];
const ARQS = BASE_A4.concat(['SGO_PgtPop_Config.js', 'SGO_PgtPop_Fichas.js', 'SGO_PgtPop_IA.js', 'SGO_PgtPop_Documento.js', 'SGO_PgtPop_Main.js']);
const EXTRA = [
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), pdfNome: n + ".pdf", htmlNome: n + ".html", html: h }; };',
  'SGO_DocSalvar_pastaClienteEm_ = function (raiz) { return raiz; };',
  'Auvo_resolverClientePorCnpj_ = function () { return null; };',
  'var SGO_DATA = { log: function () {} };',
  'PgtPop_getDB_ = function () { return SpreadsheetApp.openById("db"); };',
  'PgtPop_gerarId_ = function () { return Utilities.getUuid(); };'
].join('\n');

function fichasServidor() { const ctx = {}; vm.createContext(ctx); vm.runInContext(ler('SGO_PgtPop_Fichas.js'), ctx); return JSON.parse(JSON.stringify(ctx.PGTPOP_FICHAS)); }
const FS = fichasServidor();
// Respostas fictícias para todas as perguntas (recursos "sim", natureza pública: todas as normas condicionais valem).
function respostasCompletas(sobre) {
  const r = {};
  FS.perguntas.forEach((p) => {
    if (p.tipo === 'simnao') r[p.id] = 'sim';
    else if (p.tipo === 'opcoes') r[p.id] = p.opcoes[0][0];
    else r[p.id] = 'Resposta fictícia de ensaio para ' + p.rotulo.toLowerCase();
  });
  r.natureza = 'publico_direta';
  r.ec_modelo = 'contratada';
  r.setores = 'Internação clínica; ambulatório; almoxarifado (fictícios)';
  return Object.assign(r, sobre || {});
}
const HOSP = (resp) => ({ razaoSocial: 'HOSPITAL FICTÍCIO DE ENSAIO LTDA', cnpj: '11.222.333/0001-81', cidade: 'Cidade Fictícia', uf: 'GO', aprovadorNome: 'Maria Exemplo da Silva', aprovadorCargo: 'Responsável Técnico', respostas: resp || respostasCompletas() });
const ASSIN = { elaboradoPorNome: 'João Exemplo Souza', elaboradoPorCargo: 'Engenheiro Clínico', elaboradoPorRegistro: 'CREA-UF 000000/D' };
const resposta = (titulo, corpo) => '###TITULO###\n' + titulo + '\n###CORPO###\n' + corpo + '\n###FIM###';
// Texto completo: as seções da ficha, na ordem, com todas as expressões de verificação (nenhum "Falta").
function corpoCompleto(cod, secoes) {
  const f = FS.docs[cod];
  const exps = f.conteudoMinimo.map((c) => c.item + ': ' + c.verificacao.join(', ') + '.').join(' ');
  return (secoes || f.secoes).map((s, i) => '## ' + s + ' ##\n' + (i === 0 ? exps : 'Texto técnico da seção, sem número inventado.')).join('\n\n');
}

function ambiente() {
  const env = A.criarAmbiente({ arquivos: ARQS, extra: EXTRA });
  env.props.PGTPOP_PASTA_PDF_ID = 'raiz';
  env.props.GEMINI_API_KEY = 'chave-teste';
  const prompts = [];
  const estado = { popRespostas: {}, blocoRespostas: {} };
  env.ctx.UrlFetchApp = {
    fetch: (url, op) => {
      const prompt = JSON.parse(op.payload).contents[0].parts[0].text;
      prompts.push(prompt);
      let texto;
      const bloco = /bloco (\d) de 6/.exec(prompt);
      if (bloco) {
        const secs = /SEÇÕES DESTE BLOCO[^\n]*\n((?: {2}- [^\n]+\n)+)/.exec(prompt)[1].trim().split('\n').map((l) => l.trim().replace(/^- /, ''));
        const itens = (/CONTEÚDO MÍNIMO DESTE BLOCO[^\n]*\n((?: {2}- [^\n]+\n)+)/.exec(prompt) || ['', ''])[1];
        const exps = FS.docs.PGTS.conteudoMinimo.filter((c) => itens.indexOf(c.item + ':') >= 0).map((c) => c.verificacao.join(', ')).join('; ');
        texto = estado.blocoRespostas[bloco[1]] || resposta('Plano', secs.map((s, i) => '## ' + s + ' ##\n' + (i === 0 ? 'Itens: ' + exps + '.' : 'Texto do bloco ' + bloco[1] + '.')).join('\n\n'));
      } else {
        const cod = (/CÓDIGO DO POP: (\S+)/.exec(prompt) || [])[1] || '';
        texto = estado.popRespostas[cod] || resposta('Título qualquer', cod && FS.docs[cod] ? corpoCompleto(cod) : '## Objetivo ##\nTexto do avulso.');
      }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) };
    }
  };
  const disp = (fn, payload) => JSON.parse(JSON.stringify(env.fn('PgtPop_apiDispatch')({ sessionId: 'tec', fn, payload }))); // fora do contexto do vm (comparação estrita)
  const gerar = (p) => disp('apiGerarDocumento', Object.assign({ hospital: HOSP(), roteiro: '', imagens: [] }, ASSIN, p));
  const linhas = (aba) => (env.planilhas.abas[env.run('PGTPOP_CFG.PLANILHA.ABAS.' + aba)] || [[]]).length - 1;
  const htmlDe = (r) => {
    const a = Object.values(env.drive.arquivos).filter((x) => x.mime === 'text/html' && x.nome.indexOf(' rev ' + r.versaoAtual + '.0') >= 0 && x.nome.indexOf(r.codigoDocumento) >= 0).pop();
    return a ? a.bytes.toString('utf8') : '';
  };
  return { env, prompts, estado, disp, gerar, linhas, htmlDe };
}
const baseNormativa = (prompt) => { const i = prompt.indexOf('BASE NORMATIVA DESTE DOCUMENTO (lista fechada'); return prompt.slice(i, prompt.indexOf('\n\n', i)); };
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('fichas no servidor: geradas dos JSON do especialista, só normas VIGENTE, catálogo com os nomes recomendados', () => {
  assert.equal(Object.keys(FS.docs).length, 29);
  const { env } = ambiente();
  const cat = env.run('JSON.stringify(PGTPOP_CFG.CATALOGO_POPS)');
  const catalogo = JSON.parse(cat);
  assert.equal(catalogo.length, 28, 'os mesmos 28 códigos');
  catalogo.forEach((p) => assert.equal(p.nome, FJ[p.codigo].nomeRecomendado, p.codigo));
  assert.deepEqual(catalogo.map((p) => p.codigo), FICHAS_J.fichas.slice(1).map((f) => f.codigo));
  Object.keys(FS.docs).forEach((cod) => {
    assert.deepEqual(FS.docs[cod].normas, FJ[cod].normas, 'normas da ficha ' + cod);
    FS.docs[cod].normas.forEach((id) => assert.equal(NORMA[id].status, 'VIGENTE', id));
  });
  Object.keys(FS.normas).forEach((id) => assert.equal(FS.normas[id].comoCitar, NORMA[id].comoCitar));
  assert.equal(FS.glossario.length, 60);
  assert.deepEqual(FS.docs.POP023.condicao.pergunta, 'rec_gerador');
  assert.deepEqual(FS.docs.POP024.condicao.pergunta, 'rec_cilindros');
  assert.deepEqual(FS.docs.POP026.condicao.pergunta, 'rec_area_guarda');
  // a geração é reprodutível: o arquivo gerado é o que o script produz
  assert.match(ler('SGO_PgtPop_Fichas.js'), /GERADO por output\/pgtpop-refacao-20261114\/dev\/gerar-fichas\.cjs/);
  // suspensão intacta (o instante é gravado na publicação)
  assert.match(env.run('PGTPOP_GERACAO_NOVA_DESDE'), /^2026-11-14T\d{2}:\d{2}:\d{2}$/, 'corte gravado na publicação da geração revisada');
  // bootstrap leva à tela só o necessário
  const boot = env.fn('PgtPop_getAppBootstrap')();
  assert.ok(boot.fichas && boot.fichas.perguntas.length === FS.perguntas.length);
  assert.equal(boot.fichas.docs.POP003.nome, FJ.POP003.nomeRecomendado);
  assert.equal(boot.fichas.docs.POP003.nomeAnterior, 'Inventário de Equipamento');
  assert.equal(boot.fichas.docs.POP003.conteudoMinimo, undefined, 'conteúdo técnico não vai para a tela');
  assert.match(boot.baseNormativa, /normas aplicáveis listadas nas Referências/);
});

test('pedido de cada documento: a ficha certa, as normas da ficha (e só elas), os dados informados e sem as instruções antigas', () => {
  const { prompts, gerar } = ambiente();
  const r = gerar({ tipo: 'PGT', popsRelacionados: [{ codigo: 'POP003', nome: 'x' }] });
  assert.equal(r.ok, true, r.mensagem);
  for (const f of FICHAS_J.fichas.slice(1)) {
    prompts.length = 0;
    const outro = f.codigo === 'POP001' ? 'POP002' : 'POP001';
    const rp = gerar({ tipo: 'POP', pop: { codigo: f.codigo, nome: 'nome da tela' }, popsRelacionados: [{ codigo: outro, nome: 'x' }, { codigo: f.codigo, nome: 'x' }] });
    assert.equal(rp.ok, true, f.codigo + ': ' + rp.mensagem);
    assert.equal(prompts.length, 1);
    const p = prompts[0];
    assert.match(p, new RegExp('NOME DO POP: ' + reEsc(f.nomeRecomendado)));
    assert.ok(p.indexOf('OBJETIVO: ' + f.objetivo) >= 0, f.codigo + ' objetivo');
    assert.ok(p.indexOf('ABRANGÊNCIA: ' + f.escopo) >= 0, f.codigo + ' escopo');
    f.conteudoMinimo.forEach((c) => assert.ok(p.indexOf('  - ' + c.item + ': ' + c.descricao) >= 0, f.codigo + ' item ' + c.item));
    f.passosEssenciais.forEach((s, i) => assert.ok(p.indexOf('  ' + (i + 1) + '. ' + s) >= 0, f.codigo + ' passo ' + (i + 1)));
    f.secoes.filter((s) => !/montad/.test(s)).forEach((s) => assert.ok(p.indexOf('  - ' + s + '\n') >= 0, f.codigo + ' seção ' + s));
    const bn = baseNormativa(p);
    f.normas.forEach((id) => assert.ok(bn.indexOf(NORMA[id].comoCitar) >= 0, f.codigo + ' cita ' + id));
    NORMAS_J.filter((n) => n.status === 'VIGENTE' && f.normas.indexOf(n.id) < 0 && !/^n[ãa]o citar/i.test(n.comoCitar))
      .forEach((n) => assert.ok(bn.indexOf(n.comoCitar) < 0, f.codigo + ' não cita ' + n.id));
    assert.match(p, /DADOS INFORMADOS PELO ESTABELECIMENTO/);
    assert.match(p, /Modelo da engenharia clínica: Contratada \(empresa especializada\)/);
    assert.match(p, /DEFINIÇÕES PADRONIZADAS/);
    assert.match(p, new RegExp('POPS DO CONJUNTO[^\\n]*\\n {2}- ' + outro + ' — ' + reEsc(FJ[outro].nomeRecomendado)));
    assert.doesNotMatch(p.slice(p.indexOf('POPS DO CONJUNTO')), new RegExp('- ' + f.codigo + ' —'), 'o próprio POP não entra na lista de remissão');
    assert.match(p, /especialista sênior no assunto "/, 'especialista mantido (regra do dono)');
    assert.doesNotMatch(p, /cite o nome real do hospital|ROBUSTO, LONGO|ESTRUTURA-PADRÃO SUGERIDA|monte a estrutura você mesmo/);
    assert.equal(rp.titulo, f.nomeRecomendado, 'título = nome do catálogo');
  }
});

test('referências, glossário e documentos relacionados montados pelo sistema; PGT em 6 blocos pelas seções da ficha', () => {
  const { prompts, gerar, htmlDe, estado } = ambiente();
  // a IA "escreve" um glossário e uma seção de referências no bloco 1: saem
  estado.blocoRespostas['1'] = resposta('Plano', '## Escopo do plano ##\nEquipamentos gerais excluídos; médico-assistenciais, infraestrutura; medicamentos em plano próprio.\n\n## Finalidade e objetivos ##\nTexto.\n\n## Justificativa e base legal ##\nTexto.\n\n## Termos e definições ##\nRisco: definição inventada pela IA.\n\n## Referências ##\nISO 13485:2016.');
  const resp = respostasCompletas({ rec_gerador: 'nao', rec_central_gases: 'nao', rec_cilindros: 'nao' });
  const r = gerar({ tipo: 'PGT', hospital: HOSP(resp), popsRelacionados: [{ codigo: 'POP013', nome: 'x' }, { codigo: '', nome: 'POP fictício avulso' }] });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(prompts.length, 6, 'PGT em 6 chamadas');
  const secoesPedidas = prompts.map((p) => /SEÇÕES DESTE BLOCO[^\n]*\n((?: {2}- [^\n]+\n)+)/.exec(p)[1].trim().split('\n').map((l) => l.trim().replace(/^- /, '')));
  assert.deepEqual(secoesPedidas[0], ['Escopo do plano', 'Finalidade e objetivos', 'Justificativa e base legal']);
  assert.equal(secoesPedidas[2].length + secoesPedidas[3].length, 13, 'as 13 etapas do ciclo de vida (9.1 a 9.13)');
  assert.deepEqual(secoesPedidas[4], ['Gerenciamento de risco, eventos adversos, queixas técnicas e alertas sanitários', 'Indicadores, monitoramento e avaliação anual da efetividade'], 'sem utilidades críticas: o estabelecimento não tem gerador nem gases');
  assert.match(prompts[4], /Não escreva a seção de utilidades críticas/);
  // cada item mínimo do PGTS vai a algum bloco; mapa da RDC 509 em todos
  FJ.PGTS.conteudoMinimo.forEach((c) => assert.ok(prompts.some((p) => p.indexOf('  - ' + c.item + ': ') >= 0), 'item ' + c.item));
  assert.ok(prompts.every((p) => /MAPA DA RDC 509/.test(p) && /Art\. 16 \(guarda da documentação/.test(p)));
  // equipe mínima e metragens do PGT original: nenhuma seção pede isso, e a ficha manda não inventar
  assert.doesNotMatch(secoesPedidas.flat().join(' | '), /recursos humanos|equipe m[íi]nima|metragem|[áa]reas m[íi]nimas|material/i, 'equipe mínima e metragens fora do PGT');
  assert.ok(prompts.every((p) => /ERROS A EVITAR:[\s\S]*Inventar dimensionamento de equipe e metragem de áreas como exigência normativa\./.test(p)));
  const t = r.textoGerado;
  // glossário fixo logo depois do bloco 1 e antes do bloco 2
  const iG = t.indexOf('## Termos e definições ##'), iJ = t.indexOf('## Justificativa e base legal ##'), iO = t.indexOf('## Organização, responsabilidades e terceirização ##');
  assert.ok(iJ < iG && iG < iO, 'glossário entre o bloco 1 e o bloco 2');
  assert.equal(t.split('## Termos e definições ##').length, 2, 'um glossário só');
  FS.glossario.forEach((g) => assert.ok(t.indexOf(g.termo + ': ' + g.definicao) >= 0, 'termo ' + g.termo));
  assert.doesNotMatch(t, /definição inventada pela IA|ISO 13485|\[\[SGO:GLOSSARIO\]\]/);
  assert.ok(r.conferir.some((p) => p.tipo === 'SECAO_SISTEMA' && /ISO 13485/.test(p.texto)));
  // documentos relacionados e referências
  assert.match(t, /## Documentos relacionados ##\n\nCódigo \| Título \| Situação\n\nPOP013 \| Chamado Técnico de Equipamentos de Saúde \| Selecionado nesta geração\n\nAvulso \| POP fictício avulso \| Selecionado nesta geração/);
  const refs = t.slice(t.indexOf('## Referências normativas ##'));
  FJ.PGTS.normas.forEach((id, i) => assert.ok(refs.indexOf((i + 1) + '. ' + NORMA[id].comoCitar + '.') >= 0, 'referência ' + id));
  // documento A4: capa com o escopo, glossário em termos, tabela de documentos relacionados, referências numeradas
  const html = htmlDe(r);
  assert.match(html, /<h1>Plano de Gerenciamento de Tecnologias em Saúde \(PGTS\)<\/h1><p class="sub escopo">Equipamentos de saúde<\/p>/);
  assert.match(html, /<p class="termo"><b>Ação de campo:<\/b>/);
  assert.match(html, /<th>Código<\/th><th>Título<\/th><th>Situação<\/th>[\s\S]*<td>POP013<\/td><td>Chamado Técnico de Equipamentos de Saúde<\/td>/);
  assert.match(html, /<h3>\d+\.1 Planejamento e seleção<\/h3>/, 'etapas como subseções numeradas');
  assert.match(html, /Referências normativas<\/h2><ol class="passos" start="1"><li>Resolução da Diretoria Colegiada \(RDC\) nº 509/);
  assert.match(html, /de acordo com a RDC nº 509, de 27 de maio de 2021 \(Anvisa\), a ABNT NBR 15943:2011 e as demais normas aplicáveis listadas na seção Referências normativas/);
  // POP: referências da ficha (POP010 sem radiologia nem fonte radioativa: a RDC 611 sai)
  prompts.length = 0;
  const r10 = gerar({ tipo: 'POP', pop: { codigo: 'POP010', nome: 'x' }, hospital: HOSP(respostasCompletas({ rec_radiologia: 'nao', rec_fonte_radioativa: 'nao', rec_area_guarda: 'nao' })) });
  assert.equal(r10.ok, true, r10.mensagem);
  assert.match(r10.textoGerado, /## Referências normativas ##\n1\. Resolução da Diretoria Colegiada \(RDC\) nº 509[^\n]*\n2\. ABNT NBR 15943:2011[^\n]*$/);
  assert.doesNotMatch(baseNormativa(prompts[0]), /nº 611/);
  assert.match(prompts[0], /SEM ÁREA PRÓPRIA DE GUARDA[\s\S]*Proibição \(/, 'sem área própria, o conteúdo do POP026 vai para o POP010');
});

test('conferência: item mínimo ausente vira "Falta"; norma fora da lista, edição substituída, número e setor não informados viram "Conferir"', () => {
  const { gerar, estado } = ambiente();
  estado.popRespostas.POP003 = resposta('x', [
    '## Objetivo ##', 'Manter o inventário dos equipamentos próprios e cedidos em comodato, com número de série, fabricante, modelo, setor e regularização na Anvisa.',
    '## Procedimento ##', '1. Atualizar a cada entrada e baixa.', '2. Rastreabilidade: localizar cada item.', '3. Conferência semestral, com meta de 98% e prazo de 10 dias na UTI.',
    'Atende à RDC nº 509/2021, à ABNT NBR 15943:2011, à ISO 13485:2016, à ABNT NBR 10004:2004 e à LGPD.'
  ].join('\n'));
  const r = gerar({ tipo: 'POP', pop: { codigo: 'POP003', nome: 'x' } });
  assert.equal(r.ok, true, r.mensagem);
  const tipos = r.conferir.map((p) => p.tipo);
  const falta = r.conferir.filter((p) => p.tipo === 'FALTA').map((p) => p.texto);
  assert.deepEqual(falta, ['Falta: Auditoria (Conferência física periódica (total ou por amostragem) com tratamento das divergências: não encontrado, sem etiqueta, sem cadastro).'], 'só a auditoria ficou de fora do texto');
  const norma = r.conferir.filter((p) => p.tipo === 'NORMA_FORA_BASE')[0];
  assert.ok(norma, 'norma fora da lista');
  assert.match(norma.texto, /ISO 13485/);
  assert.match(norma.texto, /NBR 10004:2004 \(substituída/);
  assert.match(norma.texto, /LGPD/);
  assert.doesNotMatch(norma.texto, /RDC 509|NBR 15943/);
  const num = r.conferir.filter((p) => p.tipo === 'NUMERO')[0];
  assert.ok(num && /98%/.test(num.texto) && /10 dias/.test(num.texto), 'número não informado: ' + JSON.stringify(num));
  const setor = r.conferir.filter((p) => p.tipo === 'SETOR')[0];
  assert.ok(setor && /UTI/.test(setor.texto), 'setor não informado');
  assert.ok(tipos.indexOf('PENDENCIA') < 0, 'todas as opcionais respondidas: sem pendência');
  // a LGPD vale no POP001 (ficha com a Lei 13.709): não vira ponto
  estado.popRespostas.POP001 = resposta('x', corpoCompleto('POP001') + '\n\nDados pessoais tratados conforme a LGPD e a Lei nº 13.709/2018.');
  const r1 = gerar({ tipo: 'POP', pop: { codigo: 'POP001', nome: 'x' } });
  assert.equal(r1.ok, true, r1.mensagem);
  assert.deepEqual(r1.conferir.filter((p) => p.tipo === 'NORMA_FORA_BASE' || p.tipo === 'FALTA'), [], 'texto completo e normas da lista: nada a conferir');
  // a resposta do estabelecimento libera o número e o setor
  estado.popRespostas.POP015 = resposta('x', corpoCompleto('POP015') + '\n\nRonda a cada 15 dias na UTI.');
  const r15 = gerar({ tipo: 'POP', pop: { codigo: 'POP015', nome: 'x' }, hospital: HOSP(respostasCompletas({ ronda_freq: 'UTI a cada 15 dias', setores: 'UTI adulto; internação (fictícios)' })) });
  assert.deepEqual(r15.conferir.filter((p) => p.tipo === 'NUMERO' || p.tipo === 'SETOR'), []);
});

test('dado obrigatório faltando bloqueia antes da IA, com o quê, por quê e o que fazer; opcional vira pendência', () => {
  const { prompts, gerar, linhas } = ambiente();
  const resp = respostasCompletas();
  delete resp.inv_auditoria_freq; delete resp.setores; delete resp.impl_descarte;
  const nIA = prompts.length, nPops = linhas('POPS');
  const r = gerar({ tipo: 'POP', pop: { codigo: 'POP003', nome: 'x' }, hospital: HOSP(resp) });
  assert.equal(r.ok, false);
  assert.match(r.mensagem, /^O POP003 \(Inventário de Equipamentos de Saúde\) não foi gerado: faltam dados obrigatórios do estabelecimento\. Faltam: /);
  assert.match(r.mensagem, /unidades e setores assistenciais e de apoio existentes \(etapa 1, caixa 1\.5\)/);
  assert.match(r.mensagem, /descarte \(etapa 1, caixa 1\.5\)/);
  assert.match(r.mensagem, /frequência da auditoria do inventário escolhida pelo estabelecimento \(etapa 3, cartão do POP003\)/);
  assert.match(r.mensagem, /Por quê: o texto descreve a realidade deste estabelecimento e não pode presumir esses dados\. O que fazer: preencha esses campos e toque de novo em "Gerar tudo"\. Nada foi gravado\.$/);
  assert.deepEqual(r.faltamDados.sort(), ['impl_descarte', 'inv_auditoria_freq', 'setores']);
  assert.equal(prompts.length, nIA, 'a IA nem foi chamada');
  assert.equal(linhas('POPS'), nPops, 'nada gravado');
  // PGT sem o plano das demais tecnologias
  const rp = gerar({ tipo: 'PGT', hospital: HOSP(Object.assign(respostasCompletas(), { pgt_demais_planos: '  ' })) });
  assert.equal(rp.ok, false);
  assert.match(rp.mensagem, /^O PGT não foi gerado: faltam dados obrigatórios[\s\S]*\(etapa 2, caixa 2\.1\)/);
  // engenharia clínica contratada sem o nome da empresa (obrigatória só nesse caso)
  const re = gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' }, hospital: HOSP(Object.assign(respostasCompletas(), { ec_empresa: '' })) });
  assert.match(re.mensagem, /nome da empresa contratada \(etapa 1, caixa 1\.5\)/);
  const rProp = gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' }, hospital: HOSP(Object.assign(respostasCompletas(), { ec_modelo: 'propria', ec_empresa: '' })) });
  assert.equal(rProp.ok, true, 'equipe própria não precisa da empresa: ' + rProp.mensagem);
  // avulso: só as comuns
  const av = gerar({ tipo: 'POP', pop: { codigo: '', nome: 'POP fictício avulso' }, roteiro: 'Rotina fictícia.', hospital: HOSP(Object.assign(respostasCompletas(), { natureza: '' })) });
  assert.match(av.mensagem, /^O POP avulso \(POP fictício avulso\) não foi gerado: faltam dados obrigatórios[\s\S]*natureza jurídica/);
  // opcional faltando: gera e aparece como pendência
  const resp2 = respostasCompletas(); delete resp2.cod_setor; delete resp2.parque;
  const r4 = gerar({ tipo: 'POP', pop: { codigo: 'POP004', nome: 'x' }, hospital: HOSP(resp2) });
  assert.equal(r4.ok, true, r4.mensagem);
  const pend = r4.conferir.filter((p) => p.tipo === 'PENDENCIA').map((p) => p.texto);
  assert.equal(pend.length, 2);
  assert.match(pend.join(' '), /não informou "O código inclui o setor\?" \(etapa 3, cartão do POP004\)[\s\S]*"a definir pelo estabelecimento"/);
  assert.match(r4.textoGerado, /## Referências normativas ##/);
  // resposta desconhecida ou fora das opções não entra
  const r5 = gerar({ tipo: 'POP', pop: { codigo: 'POP005', nome: 'x' }, hospital: HOSP(Object.assign(respostasCompletas(), { inventada: 'x', rec_cme: 'talvez' })) });
  assert.equal(r5.ok, true, r5.mensagem);
  assert.equal(r5.hospital.respostas.inventada, undefined);
  assert.equal(r5.hospital.respostas.rec_cme, undefined);
});

test('POP condicional: com "não tem" não é gerado; sem resposta pede a resposta; com "sim" sai', () => {
  const { prompts, gerar } = ambiente();
  const nIA = prompts.length;
  const nao = gerar({ tipo: 'POP', pop: { codigo: 'POP023', nome: 'x' }, hospital: HOSP(respostasCompletas({ rec_gerador: 'nao' })) });
  assert.equal(nao.ok, false);
  assert.match(nao.mensagem, /^O POP023 \(Verificação e Teste Periódico de Grupos Geradores de Energia Elétrica\) não foi gerado: o estabelecimento informou que não tem grupo gerador de energia elétrica \(etapa 1, caixa 1\.6\)\. Por quê: [^.]+\. O que fazer: [^.]+desmarque este POP\. Nada foi gravado\.$/);
  assert.equal(nao.naoSeAplica, true);
  const n26 = gerar({ tipo: 'POP', pop: { codigo: 'POP026', nome: 'x' }, hospital: HOSP(respostasCompletas({ rec_area_guarda: 'nao' })) });
  assert.match(n26.mensagem, /entram no POP010/);
  const sem = gerar({ tipo: 'POP', pop: { codigo: 'POP024', nome: 'x' }, hospital: HOSP(respostasCompletas({ rec_cilindros: '' })) });
  assert.match(sem.mensagem, /faltam dados obrigatórios[\s\S]*usa cilindros de gases medicinais\? \(etapa 1, caixa 1\.6\)/i);
  assert.equal(prompts.length, nIA, 'nenhum dos três foi à IA');
  const sim = gerar({ tipo: 'POP', pop: { codigo: 'POP023', nome: 'x' } });
  assert.equal(sim.ok, true, sim.mensagem);
  // normas condicionais: Lei 14.133 só para o público; RDC 15 só com CME
  prompts.length = 0;
  gerar({ tipo: 'POP', pop: { codigo: 'POP007', nome: 'x' }, hospital: HOSP(respostasCompletas({ natureza: 'privado' })) });
  gerar({ tipo: 'POP', pop: { codigo: 'POP022', nome: 'x' }, hospital: HOSP(respostasCompletas({ rec_cme: 'nao', rec_radiologia: 'nao', rec_fonte_radioativa: 'nao' })) });
  assert.doesNotMatch(baseNormativa(prompts[0]), /14\.133/);
  assert.doesNotMatch(baseNormativa(prompts[1]), /nº 15, de 15 de março de 2012|nº 611/);
});

test('correção: "Abrir para corrigir" devolve as respostas do estabelecimento e a revisão sai com elas', () => {
  const { env, gerar, disp } = ambiente();
  const resp = respostasCompletas({ inv_auditoria_freq: 'Anual (resposta fictícia)' });
  const r0 = gerar({ tipo: 'POP', pop: { codigo: 'POP003', nome: 'x' }, hospital: HOSP(resp), popsRelacionados: [{ codigo: 'POP003', nome: 'x' }], _docRev: { modo: '' } });
  assert.equal(r0.ok, true, r0.mensagem);
  const item = env.api('tec', 'listar', { modulo: 'PGT_POP' }).itens.filter((i) => i.id === r0.docRevId)[0];
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  assert.deepEqual(ab.payload.hospital.respostas, r0.hospital.respostas, 'o painel de revisões guardou as respostas');
  assert.equal(ab.payload.hospital.respostas.inv_auditoria_freq, 'Anual (resposta fictícia)');
  const c = gerar(Object.assign({}, ab.payload, { _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Correção da frequência de auditoria (ensaio).' } }));
  assert.equal(c.ok, true, c.mensagem);
  assert.equal(c.versaoAtual, 2);
  const doc = JSON.parse(disp('apiObterDocumentoPorId', { tipo: 'POP', registroId: c.registroId }).documentoJson);
  assert.deepEqual(doc.hospital.respostas, r0.hospital.respostas, 'o registro guarda as respostas');
  // documento antigo, sem respostas: a correção pede os dados
  const semResp = gerar(Object.assign({}, ab.payload, { hospital: Object.assign({}, ab.payload.hospital, { respostas: {} }), _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Correção de documento antigo (ensaio).' } }));
  assert.equal(semResp.ok, false);
  assert.match(semResp.mensagem, /faltam dados obrigatórios/);
});

// ======================================================================= página completa
function conteudoModulo() { const ctx = {}; vm.createContext(ctx); vm.runInContext(ler('SGO_PgtPop_ConteudoModulo.js'), ctx); return ctx.PgtPop_obterConteudoModulo(); }
function servidorReal() {
  const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } }; vm.createContext(ctx);
  ['SGO_PgtPop_Config.js', 'SGO_PgtPop_Fichas.js', 'SGO_PgtPop_IA.js'].forEach((f) => vm.runInContext(ler(f), ctx));
  const main = ler('SGO_PgtPop_Main.js');
  for (const nome of ['PgtPop_getAppBootstrap', 'PgtPop_fichasTela_', 'PgtPop_respostasLimpas_', 'PgtPop_conferirDados_', 'PgtPop_msgDados_'])
    vm.runInContext(new RegExp('function ' + nome + '\\([^)]*\\) \\{[\\s\\S]*?\\r?\\n\\}').exec(main)[0], ctx);
  vm.runInContext(/var PGTPOP_RESPOSTA_MAX = \d+;/.exec(main)[0] + "\nvar PGTPOP_GERACAO_NOVA_DESDE = '2026-01-01T00:00:00';", ctx);
  return ctx;
}
function montarIndex() {
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
}
function servidorTela() {
  const real = servidorReal();
  const boot = JSON.parse(JSON.stringify(real.PgtPop_getAppBootstrap()));
  const conteudo = conteudoModulo();
  const chamadas = [], abrir = [], gerados = {};
  let seq = 0;
  const ok = (v) => ({ ok: true, valor: v });
  function gerar(p) {
    // a mesma conferência do servidor real (dados obrigatórios e POP condicional), sem a IA
    const h = Object.assign({}, p.hospital, { respostas: real.PgtPop_respostasLimpas_((p.hospital || {}).respostas) });
    const cod = p.tipo === 'PGT' ? 'PGTS' : String((p.pop || {}).codigo || '');
    const conf = real.PgtPop_conferirDados_(cod, h);
    const msg = real.PgtPop_msgDados_(p.tipo, cod, p.tipo === 'PGT' ? '' : (p.pop || {}).nome, conf);
    if (msg) return { ok: false, mensagem: msg };
    const id = 'dr-' + (++seq);
    gerados[id] = JSON.parse(JSON.stringify(p));
    return { ok: true, tipo: p.tipo, hospital: h, roteiro: p.roteiro, pop: p.pop || null, textoGerado: 'Texto.', imagens: [], historico: [], pdfUrl: 'http://sgo.ensaio.test/arquivos/' + id + '.pdf',
      registroId: 'r' + seq, codigoDocumento: cod || 'AV-ENSAIO1', versaoAtual: 1, titulo: p.tipo === 'PGT' ? 'Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — ' + h.razaoSocial : p.pop.nome,
      docRevId: id, conferir: [{ tipo: 'PENDENCIA', texto: 'Pendência: o estabelecimento não informou "Cores de etiqueta já adotadas" (etapa 3, cartão do POP005).' }] };
  }
  function despacho(req) {
    const p = req.payload || {};
    switch (req.fn) {
      case 'apiConsultarCnpj': return { ok: true, cnpj: '11.222.333/0001-81', razaoSocial: 'HOSPITAL FICTÍCIO DE ENSAIO LTDA', logradouro: 'Rua Fictícia, 1', bairro: 'Centro', municipio: 'Cidade Fictícia', uf: 'GO' };
      case 'apiListarArquivosPdf': return { ok: true, arquivos: [] };
      case 'apiListarDocumentos': return { ok: true, documentosJson: '[]' };
      case 'apiGerarDocumento': return gerar(p);
      default: return { ok: false, mensagem: 'indisponível no ensaio: ' + req.fn };
    }
  }
  function docRev(r) {
    const p = r.payload || {};
    if (r.fn === 'listar') return { ok: true, itens: [], total: 0 };
    if (r.fn === 'abrir') {
      abrir.push(p.id);
      const pay = gerados[p.id];
      const cod = pay.tipo === 'PGT' ? 'PGTS' : pay.pop.codigo;
      return { ok: true, id: p.id, modo: 'CORRIGIR', modulo: 'PGT_POP', payload: pay, form: {},
        info: { numero: cod + ' · 11.222.333/0001-81', rotuloOrigem: 'Rev. 01', proximaRevisao: 2, rotuloProxima: 'Rev. 02', vigente: true, titulo: 'POP', cliente: 'HOSPITAL FICTÍCIO DE ENSAIO LTDA', aviso: '', semDados: false, historico: [] } };
    }
    return { ok: false, erro: 'indisponível no ensaio' };
  }
  async function run(fn, args) {
    if (fn === 'getSessaoAtual') return ok({ success: true, session: { sessionId: 's_adm', userId: 'u1', usuario: 'admin', nome: 'Admin Ensaio', perfil: 'ADMIN' } });
    if (fn === 'getPublicConfig') return ok({ motores: { PGT_POP: 'nativo' }, idleSecondsDefault: 3600 });
    if (fn === 'PgtPop_obterConteudoModulo') return ok(conteudo);
    if (fn === 'PgtPop_getAppBootstrap') return ok(boot);
    if (fn === 'PgtPop_apiDispatch') { chamadas.push(JSON.parse(JSON.stringify(args[0]))); return ok(despacho(args[0])); }
    if (fn === 'DocRev_api') return ok(docRev(args[0] || {}));
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  }
  return { run, chamadas, abrir, boot };
}

async function abrirPagina(browser, largura) {
  const srv = servidorTela();
  const html = montarIndex();
  const page = await browser.newPage({ viewport: { width: largura, height: largura < 500 ? 844 : 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { erros.push('diálogo: ' + d.message()); d.dismiss().catch(() => {}); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => srv.run(fn, args));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_adm'); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
    window.alert = (m) => { throw new Error('alert chamado: ' + m); };
    window.confirm = (m) => { throw new Error('confirm chamado: ' + m); };
    window.prompt = (m) => { throw new Error('prompt chamado: ' + m); };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 20000 });
  await page.evaluate(() => abrir('pgt_pop'));
  await page.waitForFunction(() => !!document.getElementById('tplPgtPop_chk_POP028') && !!document.getElementById('tplPgtPop_q_ec_modelo'), null, { timeout: 15000 });
  return { page, erros, srv };
}
async function conferirTela(page, largura, onde) {
  const m = await page.evaluate(() => {
    const cont = document.getElementById('tplPgtPopContainer');
    const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const sel = 'button, .pp-btn, summary, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea, select, .pp-pop-head';
    const pequenos = Array.prototype.filter.call(cont.querySelectorAll(sel), vis).filter((el) => el.getBoundingClientRect().height < 43.5)
      .map((el) => el.tagName + '.' + String(el.className) + ' "' + String(el.textContent || el.placeholder || '').trim().slice(0, 40) + '" ' + el.getBoundingClientRect().height.toFixed(1));
    const naoJustificados = Array.prototype.filter.call(cont.querySelectorAll('.pp-q-dica, .pp-q-ref, .pp-cond, .pp-faltas p, .pp-faltas li, #tplPgtPop_caixaDados .pp-caixa-sub, #tplPgtPop_caixaRecursos .pp-caixa-sub, #tplPgtPop_caixaDadosPgt .pp-caixa-sub, #tplPgtPop_caixaDadosPops .pp-caixa-sub'), vis)
      .filter((p) => getComputedStyle(p).textAlign !== 'justify').map((p) => p.className + ': ' + p.textContent.slice(0, 40));
    return { lateral: document.documentElement.scrollWidth - window.innerWidth, pequenos, naoJustificados };
  });
  assert.ok(m.lateral <= 1, 'sem rolagem lateral em ' + largura + ' (' + onde + '): ' + m.lateral);
  assert.deepEqual(m.pequenos, [], 'toques de 44 px em ' + largura + ' (' + onde + ')');
  assert.deepEqual(m.naoJustificados, [], 'texto corrido justificado em ' + largura + ' (' + onde + ')');
}
const foto = (page, largura, nome) => page.locator('#tplPgtPopContainer').screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png') });
const etapaAtiva = (page) => page.evaluate(() => [1, 2, 3, 4, 5].find((i) => document.getElementById('tplPgtPop_step' + i).classList.contains('active')));
// responde pela tela (dispara input/change como o operador)
async function responder(page, valores) {
  await page.evaluate((v) => {
    Object.keys(v).forEach((id) => {
      const el = document.getElementById('tplPgtPop_q_' + id);
      if (!el) throw new Error('campo ausente: ' + id);
      el.value = v[id];
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  }, valores);
}

test('página completa: perguntas das fichas, POPs condicionais, bloqueio claro e correção com as respostas (1366, 390 e 320 px)', { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const { page, erros, srv } = await abrirPagina(browser, largura);
      // ---------- etapa 1: caixas 1.5 (3 grupos com contador) e 1.6 (8 recursos)
      assert.equal(await page.locator('#tplPgtPop_dadosComuns details.pp-dados-grupo').count(), 3);
      assert.equal(await page.locator('#tplPgtPop_dadosRecursos select').count(), 8);
      assert.match(await page.locator('[data-pp-cont-sub="impl"]').innerText(), /faltam 13 obrigatórias/);
      assert.equal(await page.locator('#tplPgtPop_q_ec_modelo option').count(), 4);
      await page.fill('#tplPgtPop_hospital', 'HOSPITAL FICTÍCIO DE ENSAIO LTDA');
      await page.fill('#tplPgtPop_cnpj', '11.222.333/0001-81');
      await page.fill('#tplPgtPop_aprovadorNome', 'Maria Exemplo da Silva');
      await page.fill('#tplPgtPop_aprovadorCargo', 'Responsável Técnico');
      await page.fill('#tplPgtPop_elaboradoPorNome', 'João Exemplo Souza');
      await page.fill('#tplPgtPop_elaboradoPorCargo', 'Engenheiro Clínico');
      // o operador responde pela tela: abre o grupo, escolhe e digita
      await page.locator('details[data-pp-sub="ec"] > summary').click();
      await page.selectOption('#tplPgtPop_q_ec_modelo', 'contratada');
      await page.fill('#tplPgtPop_q_resp_nome', 'Ana Fictícia');
      await page.selectOption('#tplPgtPop_q_rec_gerador', 'nao');
      await conferirTela(page, largura, 'etapa 1 perguntas');
      await foto(page, largura, 'e1-perguntas');
      // ---------- etapa 3: POP condicional e perguntas do POP
      await page.locator('#tplPgtPop_nav3').click();
      assert.equal(await etapaAtiva(page), 3, 'a etapa 1 não exige as perguntas para avançar (só a geração)');
      await page.getByRole('button', { name: 'Abrir todos os grupos' }).click();
      assert.equal(await page.isDisabled('#tplPgtPop_chk_POP023'), true, 'sem gerador: POP023 indisponível');
      assert.match(await page.locator('.pp-pop[data-pop="POP023"] [data-pp-cond]').innerText(), /^Não se aplica: na caixa 1\.6 o estabelecimento informou que não tem grupo gerador/);
      assert.match(await page.locator('.pp-pop[data-pop="POP024"] [data-pp-cond]').innerText(), /^Só é gerado se o estabelecimento tiver cilindros de gases medicinais\. Responda na etapa 1, caixa 1\.6/);
      assert.equal(await page.locator('.pp-pop[data-pop="POP003"] .pp-pop-head b').innerText(), 'Inventário de Equipamentos de Saúde', 'nome novo do catálogo');
      await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP003"] > .pp-pop-head').click();
      await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP013"] > .pp-pop-head').click();
      assert.equal(await page.locator('#tplPgtPop_extra_POP003 [data-pp-qw]').count(), 3, 'as 3 perguntas só do POP003');
      assert.match(await page.locator('[data-pp-cont-pop="POP003"]').innerText(), /faltam \d+ obrigatórias para este POP/);
      assert.equal(await page.isVisible('#tplPgtPop_q_tempos_resposta'), true, 'pergunta usada pelo POP013 e pelo POP020 aparece na 3.3');
      assert.equal(await page.isVisible('#tplPgtPop_q_infra_responsavel'), false, 'POP009/POP027 não marcados: pergunta escondida');
      await page.locator('.pp-pop[data-pop="POP003"] details.pp-dados-pop > summary').click();
      await conferirTela(page, largura, 'etapa 3 perguntas');
      await foto(page, largura, 'e3-condicional');
      // gerador "sim" libera o POP023 sem redesenhar o que foi digitado
      await page.fill('#tplPgtPop_q_inv_meio', 'Planilha eletrônica (fictício)');
      await page.locator('#tplPgtPop_nav1').click();
      await page.selectOption('#tplPgtPop_q_rec_gerador', 'sim');
      await page.locator('#tplPgtPop_nav3').click();
      assert.equal(await page.isDisabled('#tplPgtPop_chk_POP023'), false);
      assert.equal(await page.inputValue('#tplPgtPop_q_inv_meio'), 'Planilha eletrônica (fictício)');
      // ---------- etapa 4: bloqueio claro antes de gerar
      await page.getByRole('button', { name: 'Conferir e gerar', exact: true }).click();
      await page.waitForSelector('#tplPgtPop_faltasDados');
      const faltas = await page.locator('#tplPgtPop_faltasDados').innerText();
      assert.match(faltas, /Faltam dados obrigatórios do estabelecimento: 3 documentos não vão ser gerados\./);
      assert.match(faltas, /Todos os documentos da rodada: Etapa 1, caixa 1\.5: [^\n]*situação de implantação de 13 etapas/);
      assert.equal((faltas.match(/Unidades e setores assistenciais/g) || []).length, 1, 'pergunta comum listada uma vez só');
      assert.match(faltas, /PGT: Etapa 2, caixa 2\.1: Onde estão os planos das demais tecnologias/);
      assert.match(faltas, /POP003: Etapa 3, cartão do POP003: [^\n]*Frequência da auditoria do inventário/);
      assert.match(faltas, /Por quê: [\s\S]*O que fazer: /);
      assert.match(await page.locator('#tplPgtPop_conf41').innerText(), /DADOS DO ESTABELECIMENTO\s+Faltam dados obrigatórios para 3 documentos/i);
      await conferirTela(page, largura, 'etapa 4 faltas');
      await foto(page, largura, 'e4-faltas');
      // gerar assim mesmo: o servidor recusa cada documento com a mensagem completa; nenhum documento passa
      const antes = srv.chamadas.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'), null, { timeout: 10000 });
      const ger = srv.chamadas.slice(antes).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(ger.length, 3);
      assert.equal(ger[0].payload.hospital.respostas.ec_modelo, 'contratada', 'as respostas vão no hospital');
      assert.equal(ger[0].payload.hospital.respostas.inv_meio, 'Planilha eletrônica (fictício)');
      assert.deepEqual(ger[1].payload.popsRelacionados.map((p) => p.codigo), ['POP003', 'POP013'], 'o POP leva os POPs do conjunto');
      const falha = page.locator('#tplPgtPop_listaDocumentos .pp-doc.falhou').first();
      assert.match(await falha.innerText(), /não foi gerado: faltam dados obrigatórios do estabelecimento[\s\S]*O que fazer: Responda as perguntas citadas/);
      await conferirTela(page, largura, 'etapa 5 recusa');
      await foto(page, largura, 'e5-recusa');
      await falha.getByRole('button', { name: 'Preencher os dados' }).click();
      assert.equal(await etapaAtiva(page), 1, 'o PGT falta dado da etapa 1');
      assert.equal(await page.locator('[data-pp-qw="setores"]').evaluate((el) => el.classList.contains('falta')), true, 'campo que falta em vermelho');
      assert.equal(await page.locator('details[data-pp-sub="impl"]').evaluate((el) => el.open), true, 'o grupo com falta abre');
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.closest('.pp-q.falta') !== null), true, 'o cursor vai para o primeiro campo que falta');
      await conferirTela(page, largura, 'etapa 1 faltas marcadas');
      await foto(page, largura, 'e1-faltas');
      // ---------- responde tudo (valores fictícios) e gera
      const tudo = await page.evaluate(() => {
        const v = {};
        document.querySelectorAll('[data-pp-q]').forEach((el) => { v[el.getAttribute('data-pp-q')] = el.tagName === 'SELECT' ? el.options[1].value : 'Resposta fictícia de ensaio'; });
        return v;
      });
      tudo.ec_modelo = 'contratada';
      await responder(page, Object.fromEntries(Object.entries(tudo).filter(([k]) => !/^(inv_|tempos_resposta|chamado_)/.test(k) && k !== 'ec_modelo')));
      await page.locator('#tplPgtPop_nav3').click();
      await responder(page, { inv_meio: 'Planilha eletrônica (fictício)', inv_auditoria_freq: 'Anual (fictício)', inv_terceiros: 'Não há (fictício)', tempos_resposta: '4 horas (fictício)', chamado_canais: 'Ramal (fictício)' });
      assert.equal(await page.locator('[data-pp-qw="setores"]').evaluate((el) => el.classList.contains('falta')), false, 'a marca sai ao responder');
      await page.locator('#tplPgtPop_nav4').click();
      assert.equal(await page.locator('#tplPgtPop_faltasDados').count(), 0, 'sem faixa: tudo respondido');
      const antes2 = srv.chamadas.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'), null, { timeout: 10000 });
      const ok2 = srv.chamadas.slice(antes2).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(ok2.length, 3);
      assert.equal(await page.locator('#tplPgtPop_listaDocumentos .pp-doc.falhou').count(), 0, 'os 3 gerados');
      // ---------- correção: as respostas voltam aos campos
      await page.evaluate(() => document.querySelectorAll('[data-pp-q]').forEach((el) => { el.value = ''; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }));
      const c13 = page.locator('#tplPgtPop_listaDocumentos [data-pp-doc="1"]');
      await c13.getByRole('button', { name: 'Abrir para corrigir' }).click();
      await page.waitForSelector('#sgoDocRevQuadro_PGT_POP');
      assert.equal(await page.inputValue('#tplPgtPop_q_ec_modelo'), 'contratada', 'resposta comum restaurada');
      assert.equal(await page.inputValue('#tplPgtPop_q_inv_auditoria_freq'), 'Anual (fictício)', 'resposta do POP restaurada');
      assert.equal(await page.inputValue('#tplPgtPop_q_rec_gerador'), 'sim');
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP003'), true);
      await page.fill('#sgoDocRevMotivo_PGT_POP', 'Correção fictícia da frequência de auditoria.');
      const antes3 = srv.chamadas.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => !document.getElementById('sgoDocRevQuadro_PGT_POP'), null, { timeout: 10000 });
      const corr = srv.chamadas.slice(antes3).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(corr.length, 1, 'só o documento aberto');
      assert.equal(corr[0].payload._docRev.modo, 'CORRIGIR');
      assert.equal(corr[0].payload.hospital.respostas.inv_auditoria_freq, 'Anual (fictício)');
      assert.equal(corr[0].payload._docRev.form.tplPgtPop_q_ec_modelo, 'contratada', 'os campos com id vão no formulário guardado pela correção');
      await conferirTela(page, largura, 'correção');
      assert.deepEqual(erros, [], 'sem erro de JavaScript nem diálogo do navegador em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('código da tela e ajuda: sem alert/confirm/prompt, guia e ajuda com as perguntas e os POPs condicionais', () => {
  const s = conteudoModulo();
  const sc = s.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(sc);
  assert.doesNotMatch(sc, /\balert\(|\bconfirm\(|\bprompt\(/);
  for (const t of ['1.5</span> Dados do estabelecimento', '1.6</span> Recursos do estabelecimento', '2.1</span> Dados do estabelecimento para o PGT', '3.3</span> Dados usados por mais de um POP', 'Faltam dados obrigatórios do estabelecimento'])
    assert.ok(s.indexOf(t) >= 0, 'tela: ' + t);
  const ajuda = ler('SGO_Ajuda_Documentos.js');
  const bloco = ajuda.slice(ajuda.indexOf('"pgt_pop"'), ajuda.indexOf('"reg_op"'));
  for (const t of ['ficha técnica', 'Dados do estabelecimento', 'Recursos do estabelecimento', 'Faltam dados obrigatórios', 'POP023', 'Referências normativas'])
    assert.ok(bloco.indexOf(t) >= 0, 'ajuda: ' + t);
  assert.doesNotMatch(bloco, /\balert\(/);
});
