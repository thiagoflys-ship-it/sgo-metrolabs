// PGT e POP — correções da auditoria de 13/11/2026 e desenho v2 (14/11/2026).
// Servidor: código real (Config, IA, Documento, Main, SGO_DocRevisao e base A4) num contexto isolado, com a IA simulada
// devolvendo os defeitos reais da auditoria (eco do pedido, persona, "Histórico de revisões" da IA, "[Inserir Data]",
// norma fora da base, marca, título fora do catálogo) e o registro com revisões substituídas. Confere o documento final
// limpo, os pontos para conferir, o motivo obrigatório, a revisão sob trava, a correção travada, o avulso que vira
// revisão, o cargo obrigatório, o texto padrão com imagens, a falha de rede e o "Salvar na pasta do cliente".
// Página completa (Index.html com os include() resolvidos, servidor simulado) em 1366, 390 e 320 px: busca "Documentos
// emitidos", motivo da rodada, selo "Conferir", correção travada, sem erro de JavaScript e sem diálogo do navegador.
// Uso: DEST=<legado candidato> node --require <fontes.cjs> tests/pgtpop-correcoes-20261114.test.cjs
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
const SAIDA = process.env.CAPTURAS || path.join(__dirname, '../output/pgtpop-correcoes-20261114/capturas');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');

// ======================================================================= servidor
const BASE_A4 = ['SGO_Documento_LogoCompartilhado.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js'];
const EXTRA = [
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { if (globalThis.__falharPasta) throw new Error("pasta indisponível no ensaio"); var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), pdfNome: n + ".pdf", htmlNome: n + ".html", html: h }; };',
  'SGO_DocSalvar_pastaClienteEm_ = function (raiz) { return raiz; };',
  'Auvo_resolverClientePorCnpj_ = function () { return null; };',
  'var SGO_DATA = { log: function () {} };',
  'PgtPop_getDB_ = function () { return SpreadsheetApp.openById("db"); };',
  'PgtPop_gerarId_ = function () { return Utilities.getUuid(); };'
].join('\n');

const HOSP = { razaoSocial: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11.222.333/0001-81', cidade: 'Goiânia', uf: 'GO', aprovadorNome: 'Maria Exemplo da Silva', aprovadorCargo: 'Responsável Técnico' };
const ASSIN = { elaboradoPorNome: 'João Exemplo Souza', elaboradoPorCargo: 'Engenheiro Clínico', elaboradoPorRegistro: 'CREA-UF 000000/D' };
const resposta = (titulo, corpo) => '###TITULO###\n' + titulo + '\n###CORPO###\n' + corpo + '\n###FIM###';
const LIMPO = (nome) => resposta(nome, '## Objetivo ##\nEstabelecer a rotina de ' + nome.toLowerCase() + ' no hospital.\n\n## Desenvolvimento ##\n1. Registrar a atividade.\n2. Arquivar o registro.');
// Defeitos reais da auditoria (C2, M2, A1, A2, M1): título fora do catálogo, persona, seção de revisões, campo em branco, norma e marca.
const POP_COM_DEFEITOS = resposta('POP026 - CONTROLE SANITÁRIO EM ÁREAS DE RECEBIMENTO - HOSPITAL MODELO TESTE LTDA', [
  '## Objetivo ##',
  'Estabelecer o controle sanitário nas áreas de recebimento do HOSPITAL MODELO TESTE LTDA, conforme estabelecido no roteiro fornecido, com registro diário.',
  '',
  '## Responsabilidades ##',
  'A limpeza cabe à equipe de higienização. A escolha de um especialista sênior garante que este procedimento seja tecnicamente robusto. Os chamados são abertos no AUVO pela equipe.',
  '',
  '## Referências ##',
  'RDC nº 509/2021, ABNT NBR 15943:2011, ISO 13485:2016 e LGPD.',
  '',
  '## Registros ##',
  'Os registros são guardados pelo responsável [Nome do Elaborador] da unidade, com **assinatura** do setor.',
  '',
  '## Histórico de Revisões ##',
  'Versão: 1.0',
  'Data da Elaboração: [Inserir Data]'
].join('\n'));
const PGT_FECHO_COM_DEFEITOS = resposta('Plano', [
  '## Documentos e Procedimentos Relacionados ##',
  'PROCEDIMENTOS OPERACIONAIS PADRÃO (POPs) SELECIONADOS PARA ESTE HOSPITAL NESTA GERAÇÃO:',
  'POP013 — Chamado Técnico de Equipamento: organiza a abertura e o atendimento dos chamados.',
  'DOCUMENTOS JÁ EXISTENTES (gerados anteriormente) PARA ESTE HOSPITAL:',
  'Os seguintes documentos já foram gerados e estão em vigor:',
  'POP - POP001 rev 1.0 - Controle de Documentos - 2026-10-26 1853.pdf (26/10/2026 18:53)',
  'POP001 — Controle de Documentos (revisão 2.0).',
  '',
  '## Responsável pela Elaboração do PGTS ##',
  'O plano é elaborado pela engenharia clínica da Metrolabs. A escolha de um especialista sênior garante que o PGTS seja robusto, conforme estabelecido no roteiro fornecido.'
].join('\n'));

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const env = A.criarAmbiente({ arquivos: BASE_A4.concat(['SGO_PgtPop_Config.js', 'SGO_PgtPop_IA.js', 'SGO_PgtPop_Documento.js', 'SGO_PgtPop_Main.js']), extra: EXTRA });
  env.props.PGTPOP_PASTA_PDF_ID = 'raiz';
  env.props.GEMINI_API_KEY = 'chave-teste';
  const prompts = [];
  const estado = { gatilho: null, popRespostas: {}, falharRede: 0, http: null };
  env.ctx.UrlFetchApp = {
    fetch: (url, op) => {
      const corpo = JSON.parse(op.payload);
      const prompt = corpo.contents[0].parts[0].text;
      prompts.push({ modelo: decodeURIComponent(url.split('/models/')[1].split(':')[0]), prompt });
      if (estado.gatilho) { const g = estado.gatilho; estado.gatilho = null; g(); }
      if (estado.falharRede > 0) { estado.falharRede--; throw new Error('Address unavailable'); }
      if (estado.http) return { getResponseCode: () => estado.http, getContentText: () => JSON.stringify({ error: { message: 'indisponível no ensaio' } }) };
      let texto;
      const bloco = /bloco (\d) de 6/.exec(prompt);
      if (bloco) texto = bloco[1] === '6' ? PGT_FECHO_COM_DEFEITOS : resposta('Plano', '## Seção do bloco ' + bloco[1] + ' ##\nTexto técnico do bloco ' + bloco[1] + ' para o hospital.');
      else { const nome = /NOME DO POP: (.+)/.exec(prompt)[1].trim(); texto = estado.popRespostas[nome] || LIMPO(nome); }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) };
    }
  };
  // Trava instrumentada: uma por vez, como o LockService.
  const trava = { ocupada: false, eventos: [] };
  env.ctx.LockService = { getScriptLock: () => ({
    waitLock() { if (trava.ocupada) throw new Error('trava ocupada'); trava.ocupada = true; trava.eventos.push('pega'); },
    tryLock() { return true; },
    releaseLock() { trava.ocupada = false; trava.eventos.push('solta'); }
  }) };
  const disp = (fn, payload, sid) => env.fn('PgtPop_apiDispatch')({ sessionId: sid || 'tec', fn, payload });
  const gerar = (p) => disp('apiGerarDocumento', Object.assign({ hospital: HOSP, roteiro: '', imagens: [] }, ASSIN, p));
  const htmlDe = (r) => {
    const a = Object.values(env.drive.arquivos).filter((x) => x.mime === 'text/html' && x.nome.indexOf(' rev ' + r.versaoAtual + '.0') >= 0 && x.nome.indexOf(r.codigoDocumento === 'PGTS' ? 'PGTS' : r.codigoDocumento) >= 0).pop();
    return a ? a.bytes.toString('utf8') : '';
  };
  const linhas = (aba) => (env.planilhas.abas[env.run('PGTPOP_CFG.PLANILHA.ABAS.' + aba)] || [[]]).length - 1;
  return { env, prompts, estado, trava, disp, gerar, htmlDe, linhas };
}

test('POP com os defeitos reais da IA: documento final limpo, título do catálogo e pontos para conferir', () => {
  const { prompts, estado, gerar, htmlDe, env } = ambiente();
  const nomeCat = env.run('PGTPOP_CFG.CATALOGO_POPS.filter(function (p) { return p.codigo === "POP026"; })[0].nome');
  estado.popRespostas[nomeCat] = POP_COM_DEFEITOS;
  const r = gerar({ tipo: 'POP', pop: { codigo: 'POP026', nome: 'Nome que a tela mandou' }, _docRev: { modo: '' } });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.titulo, nomeCat, 'A1: o título é o nome do catálogo, não o da IA nem o que veio da tela');
  assert.ok(r.docRevId, 'docRevId devolvido');
  // pedido: especialista mantido (regra do dono) + o que não entra no documento
  assert.match(prompts[0].prompt, /especialista sênior no assunto "/);
  assert.match(prompts[0].prompt, /O QUE NÃO ENTRA NO DOCUMENTO: 1\. Não mencione especialista/);
  const t = r.textoGerado;
  for (const proibido of [/especialista sênior/i, /roteiro fornecido/i, /\[Inserir/i, /\[Nome do Elaborador\]/, /Histórico de Revisões/, /Versão: 1\.0/, /\*\*/])
    assert.doesNotMatch(t, proibido, 'texto final sem ' + proibido);
  assert.match(t, /responsável ____________ da unidade/, 'campo em branco vira lacuna');
  assert.match(t, /Estabelecer o controle sanitário nas áreas de recebimento do HOSPITAL MODELO TESTE LTDA, com registro diário\./);
  const tipos = r.conferir.map((p) => p.tipo).sort();
  // 14/11/2026 (fichas técnicas): a seção "Referências" escrita pela IA sai (o sistema monta as referências) e o ponto
  // SECAO_SISTEMA diz quais normas fora da lista ela citava; antes isso saía como NORMA_FORA_BASE (tests/pgtpop-fichas-20261114).
  assert.deepEqual([...new Set(tipos)].sort(), ['BASTIDOR', 'CAMPO_EM_BRANCO', 'MARCA', 'SECAO_CONTROLE', 'SECAO_SISTEMA']);
  assert.ok(r.conferir.some((p) => p.tipo === 'SECAO_SISTEMA' && /ISO 13485/.test(p.texto) && /LGPD/.test(p.texto) && !/RDC|NBR/.test(p.texto)), 'só as normas fora da base');
  assert.ok(r.conferir.some((p) => p.tipo === 'MARCA' && /AUVO/.test(p.texto)));
  // documento A4 gravado na pasta
  const html = htmlDe(r);
  assert.ok(html.length > 1000, 'HTML gravado');
  assert.match(html, new RegExp('<h1>' + nomeCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</h1>'));
  for (const proibido of [/especialista sênior/i, /\[Inserir/i, /Versão: 1\.0/, /\*\*/, /POP026 - CONTROLE/]) assert.doesNotMatch(html, proibido);
});

test('PGT: documentos existentes vêm do registro (só vigentes, sem arquivo nem hora) e o eco do pedido sai do texto', () => {
  const { prompts, gerar, env } = ambiente();
  // 14/11/2026: com a geração revisada publicada (corte no passado), os POPs desta geração contam como existentes; os suspensos não (pgtpop-suspensao-20261114)
  env.run('PGTPOP_GERACAO_NOVA_DESDE = "2026-01-01T00:00:00"');
  // POP001 com duas revisões (a 1.0 fica substituída) e POP005 com uma
  assert.equal(gerar({ tipo: 'POP', pop: { codigo: 'POP001', nome: 'x' } }).versaoAtual, 1);
  const r2 = gerar({ tipo: 'POP', pop: { codigo: 'POP001', nome: 'x' }, descricaoRevisao: 'Inclusão da lista mestra de documentos.' });
  assert.equal(r2.versaoAtual, 2, r2.mensagem);
  assert.equal(r2.historico[1].descricao, 'Inclusão da lista mestra de documentos.', 'A3: o motivo vai para o controle de revisões');
  gerar({ tipo: 'POP', pop: { codigo: 'POP005', nome: 'x' } });
  prompts.length = 0;
  const r = gerar({ tipo: 'PGT', popsRelacionados: [{ codigo: 'POP013', nome: 'Chamado Técnico de Equipamento' }, { codigo: 'POP005', nome: 'x' }] });
  assert.equal(r.ok, true, r.mensagem);
  const fecho = prompts.filter((p) => /bloco 6 de 6/.test(p.prompt))[0].prompt;
  const lista = fecho.slice(fecho.indexOf('DOCUMENTOS JÁ EXISTENTES'));
  assert.match(lista, /POP001 — Controle de Documentos e Registros \(revisão 2\.0\)/); // 14/11/2026: nome novo do catálogo
  assert.doesNotMatch(lista, /revisão 1\.0\)[\s\S]*POP001|POP001[^\n]*revisão 1\.0/, 'C1: a revisão substituída não entra');
  assert.doesNotMatch(lista, /POP005/, 'POP desta rodada não se repete como existente');
  assert.doesNotMatch(fecho, /\.pdf|\d{2}:\d{2}\)/, 'C1: sem nome de arquivo nem hora');
  assert.doesNotMatch(lista, /PGTS/, 'sem o próprio PGT');
  const t = r.textoGerado;
  for (const proibido of [/PROCEDIMENTOS OPERACIONAIS PADRÃO \(POPs\) SELECIONADOS/, /DOCUMENTOS JÁ EXISTENTES/, /\.pdf/, /especialista sênior/i, /roteiro fornecido/i])
    assert.doesNotMatch(t, proibido, 'C2/M2: sem ' + proibido);
  // 14/11/2026 (fichas técnicas): "Documentos relacionados" é montado pelo sistema (código | título do catálogo | situação);
  // a seção que a IA escreveu sai, com ponto para conferir.
  assert.doesNotMatch(t, /POP013 — Chamado Técnico de Equipamento: organiza/);
  assert.match(t, /## Documentos relacionados ##[\s\S]*POP013 \| Chamado Técnico de Equipamentos de Saúde \| Selecionado nesta geração[\s\S]*POP001 \| Controle de Documentos e Registros \| Revisão vigente 2\.0/);
  assert.ok(r.conferir.some((p) => p.tipo === 'SECAO_SISTEMA' && /Documentos e Procedimentos Relacionados/.test(p.texto)));
  assert.match(t, /O plano é elaborado pela engenharia clínica da Metrolabs\./);
  assert.ok(r.conferir.some((p) => p.tipo === 'BASTIDOR'));
  assert.match(r.titulo, /^Plano de Gerenciamento de Tecnologias em Saúde \(PGTS\) — HOSPITAL MODELO TESTE LTDA$/);
});

test('revisão: motivo obrigatório (antes da IA), avulso com código próprio e cargo vazio recusado', () => {
  const { prompts, gerar, linhas } = ambiente();
  gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' } });
  const nPops = linhas('POPS'), nIA = prompts.length;
  const sem = gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' } });
  assert.equal(sem.ok, false);
  assert.match(sem.mensagem, /já tem a revisão 1\.0 para este CNPJ: esta geração sai como revisão 2\.0 e precisa do motivo\. Escreva o motivo desta revisão na caixa 4\.2/);
  assert.equal(linhas('POPS'), nPops, 'nada gravado');
  assert.equal(prompts.length, nIA, 'a IA nem foi chamada');
  const curto = gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' }, descricaoRevisao: 'ajuste' });
  assert.equal(curto.ok, false, 'motivo com menos de 10 caracteres');
  // cargo vazio (M7)
  const c1 = gerar({ tipo: 'POP', pop: { codigo: 'POP014', nome: 'x' }, elaboradoPorCargo: '' });
  assert.equal(c1.ok, false);
  assert.match(c1.mensagem, /^Informe o cargo de quem elaborou: ele sai abaixo do nome, nas assinaturas\./);
  const c2 = gerar({ tipo: 'POP', pop: { codigo: 'POP014', nome: 'x' }, hospital: Object.assign({}, HOSP, { aprovadorCargo: ' ' }), elaboradoPorCargo: '' });
  assert.match(c2.mensagem, /Informe o cargo de quem aprova pelo cliente e o cargo de quem elaborou: eles saem/);
  assert.equal(linhas('POPS'), nPops, 'cargo vazio não grava');
  // avulso: código próprio estável
  const av = gerar({ tipo: 'POP', pop: { codigo: '', nome: 'POP de Controle de Temperatura de Refrigeradores' }, roteiro: 'Leitura duas vezes ao dia.' });
  assert.equal(av.ok, true, av.mensagem);
  assert.match(av.codigoDocumento, /^AV-[0-9A-F]{8}$/);
  assert.equal(av.titulo, 'POP de Controle de Temperatura de Refrigeradores', 'A1: no avulso, o nome digitado');
});

test('revisão sob trava: duas gerações simultâneas não repetem o número; corrida da primeira emissão sem motivo é recusada', () => {
  const { gerar, estado, trava, linhas } = ambiente();
  gerar({ tipo: 'POP', pop: { codigo: 'POP022', nome: 'x' } });
  let rB = null;
  // A começa (rev. 1 existe), e enquanto a IA redige o A, o B é gerado inteiro.
  estado.gatilho = () => { rB = gerar({ tipo: 'POP', pop: { codigo: 'POP022', nome: 'x' }, descricaoRevisao: 'Geração B em paralelo, com motivo.' }); };
  const rA = gerar({ tipo: 'POP', pop: { codigo: 'POP022', nome: 'x' }, descricaoRevisao: 'Geração A, que começou antes.' });
  assert.equal(rB.ok, true, rB.mensagem);
  assert.equal(rA.ok, true, rA.mensagem);
  assert.deepEqual([rB.versaoAtual, rA.versaoAtual], [2, 3], 'B grava a 2.0 e A, que começou antes, a 3.0 (na base os dois sairiam 2.0)');
  assert.equal(rA.historico.length, 3);
  assert.deepEqual(rA.historico.map((h) => h.versao), [1, 2, 3]);
  assert.equal(trava.ocupada, false, 'trava solta no fim');
  assert.ok(trava.eventos.filter((e) => e === 'pega').length >= 3 && trava.eventos.join(',').indexOf('pega,pega') < 0, 'uma trava por vez');
  // primeira emissão em corrida: o segundo descobre na gravação que virou revisão e, sem motivo, é recusado
  const nAntes = linhas('POPS');
  let rD = null;
  estado.gatilho = () => { rD = gerar({ tipo: 'POP', pop: { codigo: 'POP007', nome: 'x' } }); };
  const rC = gerar({ tipo: 'POP', pop: { codigo: 'POP007', nome: 'x' } });
  assert.equal(rD.ok, true);
  assert.equal(rD.versaoAtual, 1);
  assert.equal(rC.ok, false);
  assert.match(rC.mensagem, /não foi gravado: enquanto ele era redigido, outra geração gravou a revisão 1\.0/);
  assert.equal(linhas('POPS'), nAntes + 1, 'só uma revisão 1.0 gravada');
});

test('correção: CNPJ ou código trocado é recusado; avulso corrigido vira revisão; "Usar como base" no mesmo CNPJ exige motivo', () => {
  const { env, gerar } = ambiente();
  const r0 = gerar({ tipo: 'POP', pop: { codigo: 'POP013', nome: 'x' }, _docRev: { modo: '' } });
  const item = env.api('tec', 'listar', { modulo: 'PGT_POP' }).itens.filter((i) => i.id === r0.docRevId)[0];
  assert.equal(item.numero, 'POP013 · 11.222.333/0001-81');
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  const pedido = { modo: 'CORRIGIR', origemId: item.id, motivo: 'Correção do prazo de atendimento.' };
  const outroCnpj = gerar(Object.assign({}, ab.payload, { hospital: Object.assign({}, ab.payload.hospital, { cnpj: '44.555.666/0001-77' }), _docRev: pedido }));
  assert.equal(outroCnpj.ok, false);
  assert.match(outroCnpj.mensagem, /O CNPJ ou o código foram trocados durante a correção do POP013\..*Cancele a correção/);
  const outroCod = gerar(Object.assign({}, ab.payload, { pop: { codigo: 'POP014', nome: 'x' }, _docRev: pedido }));
  assert.equal(outroCod.ok, false);
  assert.match(outroCod.mensagem, /trocados durante a correção/);
  const ok = gerar(Object.assign({}, ab.payload, { _docRev: pedido }));
  assert.equal(ok.ok, true, ok.mensagem);
  assert.equal(ok.versaoAtual, 2);
  assert.equal(ok.historico[1].descricao, 'Correção do prazo de atendimento.');
  // avulso corrigido (M4): mesma numeração AV-..., revisão 2.0, origem substituída
  const av = gerar({ tipo: 'POP', pop: { codigo: '', nome: 'POP de Lavagem de Carrinhos' }, roteiro: 'Lavagem semanal.', _docRev: { modo: '' } });
  const itAv = env.api('tec', 'listar', { modulo: 'PGT_POP' }).itens.filter((i) => i.id === av.docRevId)[0];
  assert.equal(itAv.numero, av.codigoDocumento + ' · 11.222.333/0001-81');
  const abAv = env.api('tec', 'abrir', { id: itAv.id, modo: 'CORRIGIR' });
  const avC = gerar(Object.assign({}, abAv.payload, { _docRev: { modo: 'CORRIGIR', origemId: itAv.id, motivo: 'Inclusão da frequência de lavagem.' } }));
  assert.equal(avC.ok, true, avC.mensagem);
  assert.equal(avC.codigoDocumento, av.codigoDocumento);
  assert.equal(avC.versaoAtual, 2);
  const lAv = env.api('tec', 'listar', { modulo: 'PGT_POP', termo: av.codigoDocumento }).itens;
  assert.deepEqual(lAv.map((i) => i.revisao + ':' + i.vigente).sort(), ['1:false', '2:true']);
  // usar como base no mesmo CNPJ (M3): sem motivo, recusa; com motivo, revisão seguinte
  const abB = env.api('tec', 'abrir', { id: item.id, modo: 'BASE' });
  const semMot = gerar(Object.assign({}, abB.payload, { _docRev: { modo: 'BASE', origemId: item.id } }));
  assert.equal(semMot.ok, false);
  assert.match(semMot.mensagem, /precisa do motivo/);
  const comMot = gerar(Object.assign({}, abB.payload, { descricaoRevisao: 'Revisão do fluxo de chamados críticos.', _docRev: { modo: 'BASE', origemId: item.id } }));
  assert.equal(comMot.versaoAtual, 3, comMot.mensagem);
});

test('sem a IA o POP leva as imagens; falha de rede vai ao modelo reserva; salvar na pasta atualiza o painel e o nome tem o título', () => {
  const { env, estado, prompts, gerar, disp } = ambiente();
  const img = { base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', mimeType: 'image/png', legenda: 'Bancada de testes' };
  estado.http = 503;
  const r = gerar({ tipo: 'POP', pop: { codigo: 'POP022', nome: 'x' }, roteiro: 'Teste de segurança elétrica anual.', imagens: [img] });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.imagens.length, 1, 'M6: a imagem continua');
  assert.equal(r.imagens[0].legenda, 'Bancada de testes');
  assert.match(r.avisoHtml, /As imagens entraram com a legenda, sem a interpretação técnica\./);
  estado.http = null;
  // B9: exceção de rede no fetch repete e passa ao reserva
  prompts.length = 0;
  estado.falharRede = 3;
  const r2 = gerar({ tipo: 'POP', pop: { codigo: 'POP023', nome: 'x' } });
  assert.equal(r2.ok, true, r2.mensagem);
  assert.deepEqual(prompts.map((p) => p.modelo), ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']);
  estado.falharRede = 99;
  const r3 = gerar({ tipo: 'POP', pop: { codigo: 'POP024', nome: 'x' } });
  assert.equal(r3.ok, false);
  assert.match(r3.mensagem, /falha de rede/);
  estado.falharRede = 0;
  // M11: o PDF automático falhou; "Salvar na pasta do cliente" grava com o título e completa a linha do painel
  env.ctx.__falharPasta = true;
  const r4 = gerar({ tipo: 'POP', pop: { codigo: 'POP005', nome: 'x' } });
  env.ctx.__falharPasta = false;
  assert.equal(r4.pdfUrl, '');
  assert.match(r4.avisoHtml, /não foi salvo na pasta do cliente/);
  const antes = env.api('tec', 'listar', { modulo: 'PGT_POP', termo: 'POP005' }).itens[0];
  assert.equal(antes.pdfId, '');
  const html = disp('apiMontarDocumentoFinal', Object.assign({}, r4)).html;
  const s = disp('apiSalvarDocumento', { html, hospital: HOSP.razaoSocial, cnpj: HOSP.cnpj, tipo: 'POP', codigoDocumento: 'POP005', versaoAtual: 1, registroId: r4.registroId, pop: r4.pop, titulo: r4.titulo, docRevId: r4.docRevId });
  assert.equal(s.ok, true, s.mensagem);
  assert.match(s.fileName, /^POP - POP005 rev 1\.0 - Etiquetagem e Identificação de Situação dos Equipame/); // 14/11/2026: nome novo do catálogo (corte em 60 caracteres)
  const depois = env.api('tec', 'listar', { modulo: 'PGT_POP', termo: 'POP005' }).itens[0];
  assert.ok(depois.pdfId && depois.pdfUrl, 'a linha do painel ganhou o PDF');
  // sem pop nem título (tela antiga): o nome vem do registro
  env.ctx.__falharPasta = true;
  const r5 = gerar({ tipo: 'POP', pop: { codigo: 'POP006', nome: 'x' } });
  env.ctx.__falharPasta = false;
  const s5 = disp('apiSalvarDocumento', { html, hospital: HOSP.razaoSocial, cnpj: HOSP.cnpj, tipo: 'POP', codigoDocumento: 'POP006', versaoAtual: 1, registroId: r5.registroId });
  assert.match(s5.fileName, /^POP - POP006 rev 1\.0 - Planejamento e Seleção de Equipamentos de Saúde - /); // 14/11/2026: nome novo do catálogo
});

test('montagem: markdown de texto antigo sai (M8) e o título do POP não é cortado (B7)', () => {
  const { env } = ambiente();
  const montar = env.fn('PgtPop_montarDocumentoHtml_');
  const html = montar({ tipo: 'POP', titulo: 'Procedimento Operacional Padrão — Teste — Etapa Final', textoGerado: '## Objetivo ##\n**Garantir** a rotina.\n* Item com marcador', hospital: HOSP, codigoDocumento: 'POP099', versaoAtual: 1, historico: [] });
  assert.match(html, /<h1>Teste — Etapa Final<\/h1>/);
  assert.doesNotMatch(html, /\*\*|>\* Item/);
  assert.match(html, /Garantir a rotina\./);
  const html2 = montar({ tipo: 'POP', titulo: 'Recebimento — HOSPITAL MODELO TESTE LTDA', textoGerado: '## A ##\nTexto.', hospital: HOSP, codigoDocumento: 'POP008', versaoAtual: 1, historico: [] });
  assert.match(html2, /<h1>Recebimento<\/h1>/);
});

// ======================================================================= página completa
function conteudoModulo() { const ctx = {}; vm.createContext(ctx); vm.runInContext(ler('SGO_PgtPop_ConteudoModulo.js'), ctx); return ctx.PgtPop_obterConteudoModulo(); }
function bootstrapReal() {
  const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } }; vm.createContext(ctx);
  vm.runInContext(ler('SGO_PgtPop_Config.js') + '\n;this.__cfg = PGTPOP_CFG;', ctx);
  vm.runInContext(/function PgtPop_getAppBootstrap\(\) \{[\s\S]*?\n\}/.exec(ler('SGO_PgtPop_Main.js'))[0], ctx);
  return JSON.parse(JSON.stringify(ctx.PgtPop_getAppBootstrap()));
}
function montarIndex() {
  return ler('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => ler(f + '.html')).replace(/<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/, '""');
}

const CNPJ_A = '11.444.777/0001-61', CLI_A = 'CLÍNICA MODELO ÉLE LTDA';
const CNPJ_B = '22.333.444/0001-05', CLI_B = 'HOSPITAL EXEMPLO SÃO JOSÉ LTDA';
const ARQ = (n) => 'http://sgo.ensaio.test/arquivos/' + n;
function itemRev(o) {
  return Object.assign({ status: o.vigente === false ? 'SUBSTITUIDO' : 'EMITIDO', vigente: true, substituidaPor: '', motivo: '', emitidoPor: 'Técnico Teste', temDados: true, htmlId: '', htmlUrl: '', pdfId: '', pdfUrl: '' }, o,
    { rotulo: 'Rev. ' + String(o.revisao).padStart(2, '0') });
}
const REGISTRO = [
  itemRev({ id: 'dr-p1', numero: 'PGTS · ' + CNPJ_A, revisao: 1, vigente: false, substituidaPor: 'Rev. 02', emitidoEm: '26/10/2026 18:00', titulo: 'PGT — Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — ' + CLI_A, cliente: CLI_A, cnpj: CNPJ_A, pdfId: 'pgt1', pdfUrl: ARQ('pgt1.pdf') }),
  itemRev({ id: 'dr-p2', numero: 'PGTS · ' + CNPJ_A, revisao: 2, emitidoEm: '10/11/2026 10:00', motivo: 'Inclusão da CME própria.', titulo: 'PGT — Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — ' + CLI_A, cliente: CLI_A, cnpj: CNPJ_A, pdfId: 'pgt2', pdfUrl: ARQ('pgt2.pdf'), htmlId: 'pgt2h', htmlUrl: ARQ('pgt2.html') }),
  itemRev({ id: 'dr-13', numero: 'POP013 · ' + CNPJ_A, revisao: 1, emitidoEm: '09/11/2026 09:00', titulo: 'POP — POP013 - CHAMADO TÉCNICO', cliente: CLI_A, cnpj: CNPJ_A, pdfId: 'p13', pdfUrl: ARQ('p13.pdf'), htmlId: 'p13h', htmlUrl: ARQ('p13.html') }),
  itemRev({ id: 'dr-26a', numero: 'POP026 · ' + CNPJ_A, revisao: 1, vigente: false, substituidaPor: 'Rev. 02', emitidoEm: '26/10/2026 18:10', titulo: 'POP — Controle Sanitário', cliente: CLI_A, cnpj: CNPJ_A, pdfId: 'p26a', pdfUrl: ARQ('p26a.pdf') }),
  itemRev({ id: 'dr-26b', numero: 'POP026 · ' + CNPJ_A, revisao: 2, emitidoEm: '10/11/2026 10:30', motivo: 'Atualização da rotina de higiene.', titulo: 'POP — Controle Sanitário', cliente: CLI_A, cnpj: CNPJ_A, pdfId: 'p26b', pdfUrl: ARQ('p26b.pdf'), htmlId: 'p26bh', htmlUrl: ARQ('p26b.html') }),
  itemRev({ id: 'dr-b26', numero: 'POP026 · ' + CNPJ_B, revisao: 1, emitidoEm: '05/11/2026 08:00', titulo: 'POP — Controle Sanitário', cliente: CLI_B, cnpj: CNPJ_B })
];
const HOSP_A = { razaoSocial: CLI_A, cnpj: CNPJ_A, logradouro: 'Rua Exemplo, 100', bairro: 'Centro', cidade: 'Goiânia', uf: 'GO', porte: 'Clínica', leitos: '20', aprovadorNome: 'Ana Exemplo', aprovadorCargo: 'Diretora Técnica' };
const PAYLOAD_13 = Object.assign({ tipo: 'POP', hospital: HOSP_A, roteiro: 'Chamado aberto no sistema.', pop: { codigo: 'POP013', nome: 'Chamado Técnico de Equipamento' }, imagens: [] }, { elaboradoPorNome: 'João Exemplo Souza', elaboradoPorCargo: 'Engenheiro Clínico', elaboradoPorRegistro: '' });
const PAYLOAD_26 = Object.assign({}, PAYLOAD_13, { roteiro: '', pop: { codigo: 'POP026', nome: 'Controle Sanitário' } });
const PONTOS = (n) => Array.from({ length: n }, (_, i) => ({ tipo: i ? 'CAMPO_EM_BRANCO' : 'NORMA_FORA_BASE', texto: i ? 'Ficou um campo para preencher: "[Inserir Data ' + i + ']".' : 'Cita norma fora da base informada: ISO 13485.' }));

function servidor() {
  const boot = bootstrapReal();
  // 14/11/2026: documentos emitidos antes da geração revisada ficam suspensos (pgtpop-suspensao-20261114); aqui o ensaio é o da geração revisada
  boot.geracaoNovaDesde = '2026-01-01T00:00:00';
  const conteudo = conteudoModulo();
  const chamadas = [], listar = [], abrir = [];
  const ok = (v) => ({ ok: true, valor: v });
  function gerar(p) {
    const base = { ok: true, tipo: p.tipo, hospital: p.hospital, roteiro: p.roteiro, pop: p.pop || null, textoGerado: 'Texto.', imagens: [], historico: [], pdfUrl: ARQ('novo.pdf') };
    if (p._docRev && p._docRev.modo === 'CORRIGIR') return Object.assign(base, { registroId: 'r13c', codigoDocumento: 'POP013', versaoAtual: 3, titulo: p.pop.nome, docRevId: 'dr-13c', conferir: [] });
    if (p.tipo === 'PGT') return Object.assign(base, { registroId: 'rp3', codigoDocumento: 'PGTS', versaoAtual: 3, titulo: 'Plano de Gerenciamento de Tecnologias em Saúde (PGTS) — ' + CLI_A, docRevId: 'dr-p3', conferir: [] });
    if (p.pop.codigo === 'POP013') return Object.assign(base, { registroId: 'r13b', codigoDocumento: 'POP013', versaoAtual: 2, titulo: p.pop.nome, docRevId: 'dr-13b', conferir: PONTOS(3) });
    return Object.assign(base, { registroId: 'r27', codigoDocumento: p.pop.codigo, versaoAtual: 1, titulo: p.pop.nome, docRevId: '', conferir: PONTOS(5) });
  }
  function despacho(req) {
    const p = req.payload || {};
    switch (req.fn) {
      case 'apiConsultarCnpj': return { ok: true, cnpj: CNPJ_A, razaoSocial: CLI_A, logradouro: 'Rua Exemplo, 100', bairro: 'Centro', municipio: 'Goiânia', uf: 'GO' };
      case 'apiListarArquivosPdf': return { ok: true, pastaUrl: 'http://sgo.ensaio.test/pastas/p1', arquivos: [{ nome: 'PGT - PGTS rev 1.0 - x.pdf', url: ARQ('a.pdf'), data: '26/10/2026 18:00' }] };
      case 'apiListarDocumentos': return { ok: true, documentosJson: JSON.stringify([
        { tipo: 'PGT', registroId: 'rp2', codigoDocumento: 'PGTS', versaoAtual: 2, titulo: 'Plano', hospital: HOSP_A, data: '10/11/2026 10:00:00' },
        { tipo: 'POP', registroId: 'r13', codigoDocumento: 'POP013', versaoAtual: 1, titulo: 'Chamado', hospital: HOSP_A, data: '09/11/2026 09:00:00', pop: { codigo: 'POP013', nome: 'Chamado' } }]) };
      case 'apiGerarDocumento': return gerar(p);
      case 'apiMontarDocumentoFinal': return { ok: true, html: '<!doctype html><html><body><h1>Documento de ensaio</h1></body></html>' };
      default: return { ok: false, mensagem: 'indisponível no ensaio: ' + req.fn };
    }
  }
  function docRev(r) {
    const p = r.payload || {};
    if (r.fn === 'listar') {
      listar.push(JSON.parse(JSON.stringify(p)));
      const termo = String(p.termo || '').toLowerCase(), cnpj = String(p.cnpj || '').replace(/\D/g, '');
      const l = REGISTRO.filter((i) => (!cnpj || i.cnpj.replace(/\D/g, '') === cnpj) && (!termo || [i.numero, i.titulo, i.cliente, i.cnpj].join(' ').toLowerCase().indexOf(termo) >= 0))
        .sort((a, b) => (b.emitidoEm.slice(6, 10) + b.emitidoEm.slice(3, 5) + b.emitidoEm.slice(0, 2) + b.emitidoEm.slice(11)).localeCompare(a.emitidoEm.slice(6, 10) + a.emitidoEm.slice(3, 5) + a.emitidoEm.slice(0, 2) + a.emitidoEm.slice(11)));
      return { ok: true, itens: l.slice(0, p.limite || 60), total: l.length };
    }
    if (r.fn === 'abrir') {
      abrir.push(JSON.parse(JSON.stringify(p)));
      const corrigir = p.modo !== 'BASE';
      const pay = /^dr-26/.test(p.id) ? PAYLOAD_26 : PAYLOAD_13;
      const cod = pay.pop.codigo;
      const prox = cod === 'POP026' ? 3 : 3;
      return { ok: true, id: p.id, modo: corrigir ? 'CORRIGIR' : 'BASE', modulo: 'PGT_POP', payload: pay, form: {},
        info: { numero: cod + ' · ' + CNPJ_A, rotuloOrigem: 'Rev. 02', proximaRevisao: prox, rotuloProxima: 'Rev. 0' + prox, vigente: true, titulo: 'POP — ' + pay.pop.nome, cliente: CLI_A, aviso: '', semDados: false, historico: [] } };
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
  return { run, chamadas, listar, abrir };
}

async function abrirPagina(browser, largura) {
  const srv = servidor();
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
    // nenhum diálogo do navegador: se algum for chamado, o teste falha
    window.alert = (m) => { throw new Error('alert chamado: ' + m); };
    window.confirm = (m) => { throw new Error('confirm chamado: ' + m); };
    window.prompt = (m) => { throw new Error('prompt chamado: ' + m); };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 20000 });
  await page.evaluate(() => abrir('pgt_pop'));
  await page.waitForFunction(() => !!document.getElementById('tplPgtPop_chk_POP028'), null, { timeout: 15000 });
  return { page, erros, srv };
}
async function conferirTela(page, largura, onde) {
  const m = await page.evaluate(() => {
    const cont = document.getElementById('tplPgtPopContainer');
    const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const sel = 'button, .pp-btn, .btn, summary, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea, select, .pp-pop-head';
    const pequenos = Array.prototype.filter.call(cont.querySelectorAll(sel), vis).filter((el) => el.getBoundingClientRect().height < 43.5)
      .map((el) => el.tagName + '.' + String(el.className) + ' "' + String(el.textContent || el.placeholder || '').trim().slice(0, 40) + '" ' + el.getBoundingClientRect().height.toFixed(1));
    const naoJustificados = Array.prototype.filter.call(cont.querySelectorAll('#tplPgtPop_buscaDocs .pp-mais-item p, #tplPgtPop_buscaDocs .pp-caixa-sub, .pp-conferir p, #tplPgtPop_revisoesRodada .pp-caixa-sub'), vis)
      .filter((p) => getComputedStyle(p).textAlign !== 'justify').length;
    return { lateral: document.documentElement.scrollWidth - window.innerWidth, pequenos, naoJustificados };
  });
  assert.ok(m.lateral <= 1, 'sem rolagem lateral em ' + largura + ' (' + onde + '): ' + m.lateral);
  assert.deepEqual(m.pequenos, [], 'toques de 44 px em ' + largura + ' (' + onde + ')');
  assert.equal(m.naoJustificados, 0, 'texto corrido justificado em ' + largura + ' (' + onde + ')');
}
const foto = (page, largura, nome) => page.locator('#tplPgtPopContainer').screenshot({ path: path.join(SAIDA, largura + '-' + nome + '.png') });
const etapaAtiva = (page) => page.evaluate(() => [1, 2, 3, 4, 5].find((i) => document.getElementById('tplPgtPop_step' + i).classList.contains('active')));
async function buscar(page, termo) {
  await page.fill('#sgoDocRevPainel_PGT_POP_termo', termo);
  await page.locator('#sgoDocRevPainel_PGT_POP_buscar').click();
  await page.waitForFunction(() => document.getElementById('tplPgtPop_buscaDocsRes').getAttribute('aria-busy') === 'false' && !document.querySelector('#tplPgtPop_buscaDocsRes .pp-carregando'));
}

test('página completa: busca, motivo da rodada, selo Conferir e correção travada (1366, 390 e 320 px)', { skip: !chromium && 'Playwright indisponível', timeout: 300000 }, async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const { page, erros, srv } = await abrirPagina(browser, largura);
      const busca = page.locator('#tplPgtPop_buscaDocs');
      const res = page.locator('#tplPgtPop_buscaDocsRes');

      // ---------- abrir o módulo: nada listado, nenhuma chamada 'listar'
      await page.waitForTimeout(400);
      assert.equal(srv.listar.length, 0, 'sem pesquisa, nada é pedido ao servidor');
      assert.match(await res.innerText(), /Nenhuma lista à vista até você pesquisar\./);
      assert.equal(await page.locator('#sgoDocRevPainelBox_PGT_POP').count(), 0, 'o painel compartilhado não é anexado neste módulo');
      await conferirTela(page, largura, 'busca inicial');
      await busca.screenshot({ path: path.join(SAIDA, largura + '-busca-inicial.png') });

      // termo curto
      await buscar(page, 'ab');
      assert.match(await res.innerText(), /Digite ao menos 3 caracteres\./);
      assert.equal(srv.listar.length, 0);

      // ---------- CNPJ só com números (B6): trecho com máscara e sem; depois as revisões de cada documento pelo CNPJ
      await buscar(page, '11444777');
      assert.deepEqual(srv.listar.splice(0).map((p) => p.termo || p.cnpj), ['11.444.777', '11444777', '11444777000161']);
      assert.match(await res.innerText(), /3 documentos vigentes de 1 cliente para "11444777"\./);
      assert.equal(await res.locator('details.pp-cli').count(), 1);
      assert.deepEqual(await res.locator('.pp-res-doc .t .pp-selo').allInnerTexts(), ['PGTS', 'POP013', 'POP026'], 'agrupado por código, PGTS primeiro');
      assert.deepEqual(await res.locator('.pp-res-rev > summary').allInnerTexts(), ['Revisões anteriores (1)', 'Revisões anteriores (1)']);
      assert.equal(await res.locator('.pp-res-rev[open]').count(), 0, 'revisões anteriores recolhidas');
      assert.match(await res.locator('.pp-res-doc').nth(1).innerText(), /Chamado Técnico de Equipamento[\s\S]*Rev\. 1\.0 · emitido em 09\/11\/2026/, 'nome do catálogo');
      await page.waitForTimeout(800); // o JS_EnviarDoc decora os links a cada 350 ms
      assert.equal(await busca.locator('.envdoc-mini').count(), 0, 'nenhum "Enviar" automático pendurado nos links');
      assert.equal(await busca.locator('[data-sgo-enviar]').count(), 3, 'um "Enviar" por documento');
      assert.equal(await busca.locator('[data-sgo-enviar]:visible').count(), 0, 'o "Enviar" fica em "Mais ações"');
      assert.equal(await busca.locator('.pp-res-acoes').first().locator('a, button').count(), 2, 'só "Abrir PDF" e "Mais ações" à vista');
      await conferirTela(page, largura, 'busca resultado');
      await busca.screenshot({ path: path.join(SAIDA, largura + '-busca-resultado.png') });
      // Mais ações: um por vez
      const doc13 = res.locator('.pp-res-doc').nth(1);
      await doc13.getByRole('button', { name: 'Mais ações' }).click();
      assert.equal(await doc13.getByRole('button', { name: 'Fechar ações' }).count(), 1);
      const mais13 = doc13.locator('.pp-res-mais');
      assert.deepEqual(await mais13.locator('.pp-mais-item > .pp-btn').allInnerTexts(), ['Enviar', 'Abrir para imprimir', 'Abrir para corrigir', 'Usar como base']);
      assert.match(await mais13.innerText(), /Título impresso no documento: "POP013 - CHAMADO TÉCNICO"/);
      assert.match(await mais13.innerText(), /Sai a Rev\. 2\.0 do mesmo código, para o mesmo CNPJ/);
      await conferirTela(page, largura, 'mais ações');
      await busca.screenshot({ path: path.join(SAIDA, largura + '-busca-mais.png') });
      await res.locator('.pp-res-doc').nth(0).getByRole('button', { name: 'Mais ações' }).click();
      assert.equal(await mais13.isVisible(), false, 'abrir outro fecha o anterior');
      await res.locator('.pp-res-doc').nth(2).locator('.pp-res-rev > summary').click();
      assert.match(await res.locator('.pp-res-doc').nth(2).locator('.pp-rev-lista').innerText(), /Rev\. 1\.0 · 26\/10\/2026 · substituída pela Rev\. 2\.0/);

      // ---------- CNPJ com pontuação: uma chamada por CNPJ, sem completar
      await buscar(page, CNPJ_A);
      assert.deepEqual(srv.listar.splice(0), [{ modulo: 'PGT_POP', limite: 300, cnpj: '11444777000161' }]);
      // ---------- texto sem acento acha o cliente com acento (filtro da tela)
      await buscar(page, 'clinica modelo ele');
      assert.deepEqual(srv.listar.splice(0), [{ modulo: 'PGT_POP', limite: 300 }]);
      assert.match(await res.innerText(), /CLÍNICA MODELO ÉLE LTDA/);
      // ---------- código: "pop 26" vira POP026; dois clientes; sem PDF
      await buscar(page, 'pop 26');
      assert.equal(srv.listar[0].termo, 'POP026');
      srv.listar.splice(0);
      assert.match(await res.innerText(), /2 documentos vigentes de 2 clientes para "pop 26"\./);
      assert.match(await res.locator('details.pp-cli').nth(1).innerText(), /PDF não salvo/);

      // ---------- etapa 1: cargos obrigatórios; consulta leva à busca
      await page.fill('#tplPgtPop_cnpj', CNPJ_A);
      await page.locator('#tplPgtPop_btnConsultarDocs').click();
      await page.waitForFunction(() => /Este CNPJ já tem 2 documentos vigentes: 1 PGT e 1 POP\./.test(document.getElementById('tplPgtPop_docsExistentesWrap').innerText));
      await page.locator('#tplPgtPop_docsExistentesWrap').getByRole('button', { name: 'Ver documentos deste cliente' }).click();
      await page.waitForFunction(() => /para "11\.444\.777\/0001-61"/.test(document.getElementById('tplPgtPop_buscaDocsRes').innerText));
      assert.equal(await page.inputValue('#tplPgtPop_elaboradoPorCargo'), '', 'cargo começa vazio');
      await page.fill('#tplPgtPop_elaboradoPorNome', 'João Exemplo Souza');
      await page.locator('#tplPgtPop_nav2').click();
      assert.equal(await etapaAtiva(page), 1);
      assert.match(await page.locator('#tplPgtPop_avisoEtapa1').innerText(), /Para avançar, preencha: cargo de quem elaborou\./);
      await page.fill('#tplPgtPop_elaboradoPorCargo', 'Engenheiro Clínico');
      await page.locator('#tplPgtPop_nav3').click();
      assert.equal(await etapaAtiva(page), 3);
      await page.getByRole('button', { name: 'Abrir todos os grupos' }).click();
      await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP013"] > .pp-pop-head').click();
      await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP027"] > .pp-pop-head').click();
      await page.getByRole('button', { name: 'Conferir e gerar', exact: true }).click();

      // ---------- etapa 4: revisões da rodada e motivo obrigatório
      await page.waitForSelector('#tplPgtPop_revsCorpo .pp-revs-rodada');
      const revs = await page.locator('#tplPgtPop_revisoesRodada').innerText();
      assert.match(revs, /PGTS[\s\S]*Rev\. 2\.0 → sai a Rev\. 3\.0/);
      assert.match(revs, /POP013[\s\S]*Rev\. 1\.0 → sai a Rev\. 2\.0/);
      assert.match(revs, /Saem como Rev\. 1\.0 \(emissão inicial\): POP027\./);
      assert.equal(await page.isVisible('#tplPgtPop_motivoRodada'), true);
      assert.match(await page.locator('#tplPgtPop_conf41').innerText(), /Sem registro profissional: a assinatura sai sem o número do conselho/);
      assert.match(await page.locator('#tplPgtPop_conf41').innerText(), /POP013 · sai Rev\. 2\.0/);
      const antesGerar = srv.chamadas.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => /Falta o motivo desta revisão\./.test(document.getElementById('tplPgtPop_avisoGerar').innerText));
      assert.match(await page.locator('#tplPgtPop_avisoGerar').innerText(), /2 documentos desta rodada saem como revisão \(PGTS e POP013\)/);
      assert.equal(srv.chamadas.slice(antesGerar).filter((c) => c.fn === 'apiGerarDocumento').length, 0, 'nada enviado sem o motivo');
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'tplPgtPop_motivoRodada');
      assert.equal(await page.locator('#tplPgtPop_motivoWrap').evaluate((el) => el.classList.contains('falta')), true);
      await conferirTela(page, largura, 'etapa 4 motivo');
      await foto(page, largura, 'e4-motivo');
      await page.fill('#tplPgtPop_motivoRodada', 'Inclusão do POP027 e revisão das rotinas de chamado.');
      assert.match(await page.locator('#tplPgtPop_contMotivo').innerText(), /^52 de 400 caracteres/);
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'), null, { timeout: 10000 });
      const gerados = srv.chamadas.slice(antesGerar).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(gerados.length, 3);
      assert.ok(gerados.every((c) => c.payload.descricaoRevisao === 'Inclusão do POP027 e revisão das rotinas de chamado.'), 'o motivo vai em descricaoRevisao');
      assert.ok(gerados.every((c) => c.payload.elaboradoPorCargo === 'Engenheiro Clínico'));

      // ---------- etapa 5: selo Conferir com os pontos do servidor
      assert.match(await page.locator('#tplPgtPop_fila').innerText(), /Gerado · conferir[\s\S]*3 pontos para conferir na etapa 5\./);
      const docs = page.locator('#tplPgtPop_listaDocumentos');
      assert.match(await docs.innerText(), /2 documentos com pontos para conferir\./);
      const c13 = docs.locator('[data-pp-doc="1"]');
      assert.equal(await c13.locator('[data-pp-conferir]').innerText(), 'Conferir');
      assert.equal(await c13.locator('.pp-conferir li').count(), 3);
      const c27 = docs.locator('[data-pp-doc="2"]');
      assert.equal(await c27.locator('.pp-conferir > ul > li').count(), 4, 'até 4 pontos à vista');
      assert.match(await c27.locator('.pp-conferir details > summary').innerText(), /Ver todos \(e mais 1 ponto\)/);
      assert.equal(await c27.getByRole('button', { name: 'Encontrar na busca' }).count(), 1, 'sem docRevId');
      await conferirTela(page, largura, 'etapa 5 conferir');
      await foto(page, largura, 'e5-conferir');

      // ---------- correção travada (a partir do cartão)
      await c13.getByRole('button', { name: 'Abrir para corrigir' }).click();
      await page.waitForSelector('#sgoDocRevQuadro_PGT_POP');
      assert.deepEqual(srv.abrir.splice(0).map((a) => a.id + ':' + a.modo), ['dr-13b:CORRIGIR']);
      assert.equal(await etapaAtiva(page), 4);
      assert.equal(await page.locator('#tplPgtPop_cnpj').evaluate((el) => el.readOnly), true, 'CNPJ travado');
      assert.equal(await page.locator('#tplPgtPop_btnBuscarCnpj').isDisabled(), true);
      assert.equal(await page.isDisabled('#tplPgtPop_chk_POP013'), true);
      assert.equal(await page.isChecked('#tplPgtPop_chk_POP013'), true);
      assert.equal(await page.isDisabled('#tplPgtPop_chk_POP027'), true);
      assert.equal(await page.locator('#tplPgtPop_catalogoPops .pp-pop[data-pop="POP013"] [data-pp-em-correcao]').innerText(), 'Em correção');
      assert.match(await page.locator('#tplPgtPop_travaCatalogo').innerText(), /Correção do POP013: só este documento é gerado nesta rodada\./);
      assert.equal(await page.locator('#tplPgtPop_fila li').count(), 1, 'na correção a fila mostra só o documento aberto');
      assert.match(await page.locator('#tplPgtPop_revsCorpo').innerText(), /Correção de POP013: sai a Rev\. 3\.0 para o CNPJ 11\.444\.777\/0001-61\./);
      await conferirTela(page, largura, 'correção etapa 4');
      // sem motivo no quadro amarelo: faixa na tela, sem alert
      const antesCorr = srv.chamadas.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => /Falta o motivo da correção\./.test(document.getElementById('tplPgtPop_avisoGerar').innerText));
      assert.equal(srv.chamadas.length, antesCorr);
      // outro documento com a correção aberta: confirmação dentro da tela
      await buscar(page, CNPJ_A);
      const pgtBusca = res.locator('.pp-res-doc').first();
      await pgtBusca.getByRole('button', { name: 'Mais ações' }).click();
      await pgtBusca.getByRole('button', { name: 'Abrir para corrigir' }).click();
      assert.match(await pgtBusca.locator('.pp-conf-inline').innerText(), /Já há um documento aberto no formulário \(POP013\)\./);
      assert.equal(srv.abrir.length, 0, 'nada aberto antes de confirmar');
      await conferirTela(page, largura, 'confirmação na tela');
      await busca.screenshot({ path: path.join(SAIDA, largura + '-busca-confirma.png') });
      await pgtBusca.getByRole('button', { name: 'Manter o atual' }).click();
      assert.equal(await pgtBusca.locator('.pp-conf-inline').innerText(), '');
      await page.locator('#tplPgtPop_nav1').click();
      assert.match(await page.locator('#tplPgtPop_travaCnpj').innerText(), /Travado na correção: a revisão pertence a este CNPJ\./);
      await conferirTela(page, largura, 'correção etapa 1');
      await foto(page, largura, 'correcao-travada');
      await page.locator('#tplPgtPop_nav4').click();
      await page.fill('#sgoDocRevMotivo_PGT_POP', 'Correção do prazo de atendimento informado no roteiro.');
      const listarAntes = srv.listar.length;
      await page.locator('#tplPgtPop_btnGerar').click();
      await page.waitForFunction(() => document.getElementById('tplPgtPop_step5').classList.contains('active'));
      const corr = srv.chamadas.slice(antesCorr).filter((c) => c.fn === 'apiGerarDocumento');
      assert.equal(corr.length, 1);
      assert.equal(corr[0].payload._docRev.modo, 'CORRIGIR');
      assert.equal(corr[0].payload.descricaoRevisao, undefined, 'na correção vale o motivo do quadro amarelo');
      await page.waitForFunction(() => !document.getElementById('sgoDocRevQuadro_PGT_POP'));
      assert.equal(await page.locator('#tplPgtPop_cnpj').evaluate((el) => el.readOnly), false, 'travas desfeitas ao concluir');
      assert.equal(await page.isDisabled('#tplPgtPop_chk_POP027'), false);
      await page.waitForTimeout(300);
      assert.ok(srv.listar.length > listarAntes, 'a busca é refeita sozinha depois da correção');
      assert.equal(await page.inputValue('#tplPgtPop_cnpj'), CNPJ_A, 'o formulário não muda');

      // ---------- usar como base no mesmo CNPJ: aviso da revisão
      const doc26 = res.locator('.pp-res-doc').nth(2);
      await doc26.getByRole('button', { name: 'Mais ações' }).click();
      await doc26.getByRole('button', { name: 'Usar como base' }).click();
      await page.waitForSelector('#sgoDocRevQuadro_PGT_POP');
      await page.locator('#tplPgtPop_nav1').click();
      assert.match(await page.locator('#tplPgtPop_avisoBase').innerText(), /Mesmo CNPJ do documento de origem: vai sair a Rev\. 3\.0 de POP026\./);
      assert.match(await page.locator('#sgoDocRevQuadro_PGT_POP').innerText(), /No mesmo CNPJ, sai a revisão seguinte de POP026 e o motivo é pedido na etapa 4\./);
      await page.fill('#tplPgtPop_cnpj', CNPJ_B);
      assert.match(await page.locator('#tplPgtPop_avisoBase').innerText(), /Outro CNPJ: documento novo para este cliente\./);
      await page.evaluate(() => SGO_DocRev.cancelar('PGT_POP'));
      await page.waitForFunction(() => !!document.getElementById('tplPgtPop_chk_POP028'));
      assert.equal(await page.inputValue('#sgoDocRevPainel_PGT_POP_termo'), CNPJ_A, 'o termo da busca volta depois do cancelamento');

      assert.deepEqual(erros, [], 'sem erro de JavaScript nem diálogo do navegador em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('código da tela: sem alert/confirm/prompt e nomes externos mantidos; componente compartilhado só com parâmetros opcionais', () => {
  const s = conteudoModulo();
  const sc = s.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(sc);
  assert.doesNotMatch(sc, /\balert\(|\bconfirm\(|\bprompt\(/);
  for (const nome of ['tplPgtPop_gerarTudo', 'tplPgtPop_dispatch_', 'tplPgtPop_renderReal_']) assert.match(sc, new RegExp('\\n  (async )?function ' + nome + '\\('));
  const loader = ler('JS_PgtPop.html');
  assert.doesNotMatch(loader, /\balert\(|anexarPainel\(/);
  const comp = ler('JS_DocRevisao.html');
  assert.match(comp, /abrir: function \(modulo, id, modo, aoAbrir, opcoes\)/);
  assert.match(comp, /!opcoes\.semConfirmar && !confirm\(/, 'sem opções, o confirm continua');
  assert.match(comp, /function \(msg\) \{ alert\(msg\); \}/, 'sem aoFalhar, o alert continua');
});
