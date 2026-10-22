// "Abrir para corrigir" e "Usar como base" nos geradores (SGO_DocRevisao.js, 21/10/2026): Cronograma de execução,
// Registros operacionais e PGT/POP. Gerar → abrir para corrigir → mudar um campo → Rev. 01 (mesmo número, motivo
// exigido, anterior preservada e marcada substituída). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_docrev_ambiente.cjs');

const BASE_A4 = ['SGO_Documento_LogoCompartilhado.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js'];
const SALVAR_SIMPLES = [
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), pdfNome: n + ".pdf", htmlNome: n + ".html", html: h }; };',
  'SGO_DocSalvar_pastaClienteEm_ = function (raiz) { return raiz; };',
  'Auvo_resolverClientePorCnpj_ = function () { return null; };',
  'var SGO_DATA = { log: function () {} };'
].join('\n');
const conteudo = (env, id) => env.drive.arquivos[id].bytes.toString('utf8');
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('Cronograma: correção sai como Rev. 01 do mesmo CRN, com equipamentos e grupos guardados', () => {
  const env = A.criarAmbiente({
    arquivos: BASE_A4.concat(['SGO_CronExec_Config.js', 'SGO_CronExec_Grupos.js', 'SGO_CronExec_Documento.js', 'SGO_CronExec_Main.js']),
    extra: SALVAR_SIMPLES + '\nCronExec_gerarTextosIA_ = function () { throw new Error("sem IA no teste"); };\nCronExec_salvarCronograma_ = function () { return { ok: true, cronogramaId: "c1" }; };\nCronExec_registrarDocumento_ = function () {};\nCronExecDoc_sumarioSeLongo_ = function (h) { return h; };'
  });
  env.props.CRONEXEC_PASTA_PDF_ID = 'raiz';
  const disp = (sid, fn, payload) => env.fn('CronExec_apiDispatch')({ sessionId: sid, fn, payload });
  const entrada = {
    cliente: { cnpj: '11222333000181', razaoSocial: 'HOSPITAL MODELO TESTE LTDA', cidade: 'Goiânia', uf: 'GO' },
    equipamentos: [{ id: 'e1', tipo: 'Autoclave', marca: 'MARCAFICTICIA', modelo: 'M1', quantidade: 2 }], grupos: null,
    params: { dataInicioGrupo1: '2026-11-03', maxUnidadesPorGrupo: 6, diasUteisPorGrupo: 5, gapDiasUteisEntreGrupos: 0, limiarUnidadeUnicoGrupo: 3 },
    _docRev: { modo: '', form: { tplCronExec_cliente: 'HOSPITAL MODELO TESTE LTDA' } }
  };
  const f0 = disp('tec', 'apiFinalizar', entrada);
  assert.equal(f0.ok, true, f0.mensagem);
  const m0 = disp('tec', 'apiMontarDocumentoFinal', f0.resultado);
  assert.equal(m0.ok, true, m0.mensagem);
  const s0 = disp('tec', 'apiSalvarDocumento', { html: m0.html, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' });
  assert.equal(s0.ok, true, s0.mensagem);
  assert.equal(s0.revisao, 'Rev. 00');
  const item = env.api('tec', 'listar', { modulo: 'CRONOGRAMA_EXECUCAO' }).itens[0];
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  assert.equal(ab.payload.equipamentos[0].quantidade, 2);
  assert.ok(ab.payload.agrupamento && ab.payload.agrupamento.grupos.length, 'os grupos voltam');
  const e1 = Object.assign({}, entrada, { equipamentos: [{ id: 'e1', tipo: 'Autoclave', marca: 'MARCAFICTICIA', modelo: 'M1', quantidade: 3 }], grupos: null });
  assert.equal(disp('tec', 'apiFinalizar', Object.assign({}, e1, { _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'curto' } })).ok, false, 'sem motivo não segue');
  const f1 = disp('tec', 'apiFinalizar', Object.assign({}, e1, { _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Quantidade de autoclaves corrigida para 3', form: ab.form } }));
  assert.equal(f1.ok, true, f1.mensagem);
  assert.equal(f1.resultado.numeroDocumento, item.numero);
  const m1 = disp('tec', 'apiMontarDocumentoFinal', f1.resultado);
  assert.match(m1.html, /Revisão 01/);
  assert.match(m1.html, /Quantidade de autoclaves corrigida para 3/);
  const s1 = disp('tec', 'apiSalvarDocumento', { html: m1.html, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' });
  assert.equal(s1.revisao, 'Rev. 01');
  assert.match(s1.fileName, new RegExp(escRe(item.numero + ' Rev. 01')));
  const lista = env.api('tec', 'listar', { modulo: 'CRONOGRAMA_EXECUCAO' }).itens;
  assert.equal(lista.length, 2);
  assert.equal(lista.filter(i => i.revisao === 0)[0].substituidaPor, 'Rev. 01');
  assert.doesNotMatch(conteudo(env, s1.htmlId), /sgo-docrev-dados/);
  // usar como base: número novo
  const ab2 = env.api('tec', 'abrir', { id: item.id, modo: 'BASE' });
  const f2 = disp('tec', 'apiFinalizar', Object.assign({}, ab2.payload, { grupos: null, _docRev: { modo: 'BASE', origemId: item.id } }));
  assert.notEqual(f2.resultado.numeroDocumento, item.numero);
});

test('Planejamento CME: correção mantém o número PLC, Rev. 01 no documento e no nome do arquivo; cópia sai com número novo', () => {
  const env = A.criarAmbiente({
    arquivos: BASE_A4.concat(['SGO_PlanCME_Config.js', 'SGO_PlanCME_Calculo.js', 'SGO_PlanCME_IA.js', 'SGO_PlanCME_Documento.js', 'SGO_PlanCME_Main.js']),
    extra: SALVAR_SIMPLES + '\nPlanCMEDoc_sumarioSeLongo_ = function (h) { return h; };\nPlanCME_registrarDocumento_ = function () {};'
  });
  env.props.PLANCME_PASTA_PDF_ID = 'raiz';
  const disp = (fn, p) => env.fn('PlanCME_apiDispatch')({ sessionId: 'tec', fn, payload: p });
  const dados = { cliente: { cnpj: '11222333000181', razaoSocial: 'HOSPITAL MODELO TESTE LTDA' }, equipamento: { tipo: 'Autoclave', tipoProcesso: 'Autoclave a Vapor', volume: '300', bombaVacuo: true },
    servicos: { qi: true, qo: true, qd: false, bowieDick: false }, ciclos: ['Instrumental 134 °C'], observacoes: '', resultado: { insumos: [], checklistQI: [], textosIA: {} } };
  const m0 = disp('apiMontarDocumentoFinal', Object.assign({ _docRev: { modo: '' } }, dados));
  assert.equal(m0.ok, true, m0.mensagem);
  const s0 = disp('apiSalvarDocumento', { html: m0.html, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' });
  assert.equal(s0.revisao, 'Rev. 00');
  const item = env.api('tec', 'listar', { modulo: 'PLANEJAMENTO_CME' }).itens[0];
  assert.match(item.numero, /^PLC-/);
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  assert.deepEqual(ab.payload.ciclos, ['Instrumental 134 °C']);
  const m1 = disp('apiMontarDocumentoFinal', Object.assign({}, ab.payload, { observacoes: 'Volume conferido na placa.', _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Observação sobre o volume acrescentada' } }));
  assert.equal(m1.ok, true, m1.mensagem);
  assert.match(m1.html, new RegExp(escRe('Nº ' + item.numero + ' · Revisão 01')));
  const s1 = disp('apiSalvarDocumento', { html: m1.html, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' });
  assert.equal(s1.revisao, 'Rev. 01');
  assert.match(s1.fileName, new RegExp(escRe(item.numero + ' Rev. 01')));
  const m2 = disp('apiMontarDocumentoFinal', Object.assign({}, ab.payload, { _docRev: { modo: 'BASE', origemId: item.id } }));
  const numeroCopia = (/Nº (PLC-[0-9-]+)/.exec(m2.html) || [])[1];
  assert.ok(numeroCopia && numeroCopia !== item.numero, 'a cópia não usa o número de origem (no mesmo minuto ganha -2)');
  assert.doesNotMatch(m2.html, /Histórico de revisões/, 'a cópia é a emissão inicial de um documento novo');
});

test('Registros operacionais: correção mantém o número REG, revisão 01 no documento e a pendência passa para a revisão nova', () => {
  const env = A.criarAmbiente({
    arquivos: BASE_A4.concat(['SGO_RegOp_Config.js', 'SGO_RegOp_Documento.js', 'SGO_RegOp_Main.js', 'SGO_RegOp_Setup.js']),
    extra: SALVAR_SIMPLES + '\nRegOp_obterPastaPorCnpj_ = function () { return DriveApp.getRootFolder(); };\nRegOp_registrarDocumento_ = function () {};'
  });
  env.props.REGOP_DB_ID = 'db';
  env.run('RegOp_getDB_().getSheetByName(REGOP_CFG.PLANILHA.ABAS.TIPOS_DOCUMENTO).appendRow(["t1", "Checklist de teste", "[]", "[]", "[]", "", "", true, ""])');
  const disp = (sid, fn, payload) => env.fn('RegOp_apiDispatch')({ sessionId: sid, fn, payload });
  const base = {
    hospital: { razaoSocial: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' }, tipoDocumentoId: 't1', tipoDocumentoNome: 'Checklist de teste', data: '20/10/2026',
    respostas: [{ rotulo: 'Item 1', tipo: 'texto', secao: '', valor: 'conforme' }], assinaturas: [{ papel: 'Responsável', nome: 'Pessoa Teste', cargo: 'Técnico' }], observacoesGerais: '', imagens: []
  };
  const r0 = disp('tec', 'apiGerarRegistro', Object.assign({ _docRev: { modo: '' } }, base));
  assert.equal(r0.ok, true, r0.mensagem);
  assert.equal(r0.revisao, 'Rev. 00');
  const item = env.api('tec', 'listar', { modulo: 'REGISTROS_OPERACIONAIS' }).itens[0];
  assert.match(item.numero, /^REG-/);
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  const r1 = disp('tec', 'apiGerarRegistro', Object.assign({}, ab.payload, {
    respostas: [{ rotulo: 'Item 1', tipo: 'texto', secao: '', valor: 'não conforme' }],
    _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Resposta do item 1 registrada errada' }
  }));
  assert.equal(r1.ok, true, r1.mensagem);
  assert.equal(r1.revisao, 'Rev. 01');
  assert.match(r1.html, new RegExp(escRe('Nº ' + item.numero + ' · Revisão 01')));
  assert.match(r1.html, /Resposta do item 1 registrada errada/);
  const linhas = env.run('RegOp_getDB_().getSheetByName(REGOP_CFG.PLANILHA.ABAS.REGISTROS).getDataRange().getValues()');
  const status = id => linhas.filter(l => l[0] === id)[0][11];
  assert.equal(status(r0.registroId), 'substituido', 'a pendência do registro corrigido passa para a revisão nova');
  assert.equal(status(r1.registroId), 'aberto');
});

test('PGT/POP: correção vira a revisão seguinte do mesmo código, com o motivo no controle de revisões', () => {
  const env = A.criarAmbiente({
    arquivos: BASE_A4.concat(['SGO_PgtPop_Config.js', 'SGO_PgtPop_Documento.js', 'SGO_PgtPop_Main.js']),
    extra: SALVAR_SIMPLES + '\nPgtPop_getDB_ = function () { return SpreadsheetApp.openById("db"); };\nPgtPop_gerarId_ = function () { return Utilities.getUuid(); };\n' +
      'PgtPop_gerarTextoPGT_ = function () { return { titulo: "Plano de Gerenciamento de Tecnologias", textoGerado: "Texto de teste.", imagensComInterpretacao: [] }; };\n' +
      'PgtPop_salvarPdfAutomatico_ = function (r) { var p = DriveApp.getRootFolder().createFile("PGT " + r.versaoAtual + ".pdf", "%PDF", "application/pdf"); return { url: p.getUrl(), pdfId: p.getId(), htmlId: "", fileName: "PGT.pdf" }; };'
  });
  const disp = (sid, fn, payload) => env.fn('PgtPop_apiDispatch')({ sessionId: sid, fn, payload });
  const base = { tipo: 'PGT', hospital: { razaoSocial: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11222333000181' }, roteiro: 'Roteiro de teste', imagens: [], popsRelacionados: [] };
  const r0 = disp('tec', 'apiGerarDocumento', Object.assign({ _docRev: { modo: '' } }, base));
  assert.equal(r0.ok, true, r0.mensagem);
  assert.equal(r0.versaoAtual, 1);
  const item = env.api('tec', 'listar', { modulo: 'PGT_POP' }).itens[0];
  const ab = env.api('tec', 'abrir', { id: item.id, modo: 'CORRIGIR' });
  assert.equal(ab.payload.roteiro, 'Roteiro de teste');
  assert.equal(disp('tec', 'apiGerarDocumento', Object.assign({}, ab.payload, { _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'x' } })).ok, false, 'motivo exigido');
  const r1 = disp('tec', 'apiGerarDocumento', Object.assign({}, ab.payload, { _docRev: { modo: 'CORRIGIR', origemId: item.id, motivo: 'Inclusão do parque de ventiladores no escopo' } }));
  assert.equal(r1.ok, true, r1.mensagem);
  assert.equal(r1.versaoAtual, 2);
  assert.equal(r1.historico[1].descricao, 'Inclusão do parque de ventiladores no escopo');
  const lista = env.api('tec', 'listar', { modulo: 'PGT_POP' }).itens;
  assert.equal(lista.length, 2);
  assert.equal(lista.filter(i => i.revisao === 1)[0].vigente, false);
  assert.equal(lista.filter(i => i.revisao === 2)[0].vigente, true);
});
