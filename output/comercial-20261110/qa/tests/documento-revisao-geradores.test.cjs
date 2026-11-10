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

test('NR-13: laudo emitido antes do registro abre para corrigir pela planilha; correção mantém o número, Rev. 01 e o laudo antigo fica SUBSTITUIDO', () => {
  const env = A.criarAmbiente({
    arquivos: BASE_A4.concat(['SGO_NR13_Config.js', 'SGO_NR13_Calculo.js', 'SGO_NR13_Documento.js', 'SGO_NR13_Main.js'].filter(f => require('node:fs').existsSync(require('node:path').join(A.BASE, f)))),
    extra: SALVAR_SIMPLES + [
      'var __L = {}; var __S = 0;',
      'SGO_DATA = { log: function () {}, getById: function (aba, id) { var l = (__L[aba] || {})[id]; return l ? Object.assign({}, l) : null; },',
      '  update: function (aba, id, campos) { __L[aba] = __L[aba] || {}; __L[aba][id] = Object.assign(__L[aba][id] || {}, campos); },',
      '  insert: function (aba, o) { o = Object.assign({}, o); o.ID = o.ID || ("L" + (++__S)); __L[aba] = __L[aba] || {}; __L[aba][o.ID] = o; return o; },',
      '  normalizarObjetoParaSheet: function (aba, o) { return o; }, gerarRegistroBase: function (o) { return Object.assign({ ID: "L" + (++__S) }, o); } };',
      'var SGO_UTILS = { safe: function (v) { return v == null ? "" : String(v).trim(); }, safeUpper: function (v) { return v == null ? "" : String(v).trim().toUpperCase(); }, formatCnpj: function (v) { return String(v || ""); } };',
      'var SGO_CFG = { SHEETS: { CAD_CLIENTES: "CAD_CLIENTES", CAD_UNIDADES: "CAD_UNIDADES", CAD_EQUIPAMENTOS: "CAD_EQUIPAMENTOS" } };',
      'var SGO_VINCULOS = { relation: function () {} }; var SGO_DOCUMENTOS = { registrarDocumentoExistente: function () { return { success: true }; } };',
      'Auvo_criarTarefa_ = function () {}; NR13_bootstrap_ = function () {}; NR13IA_gerarTextosLaudo_ = function () { throw new Error("sem IA no teste"); };',
      'SGO_DocA4_pdfDeHtml_ = function () { throw new Error("sem PDF no teste"); }; NR13_obterPastaCliente_ = function () { return DriveApp.getRootFolder(); };',
      'var CadeiaFrioRel_CFCFG = { ASSINATURAS_PADRAO: [{ nome: "Responsável Técnico Teste", cargo: "Engenheiro" }] };',
      'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli1", RAZAO_SOCIAL: "HOSPITAL MODELO TESTE LTDA", CNPJ: "11222333000181" });',
      'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni1", NOME_UNIDADE: "UNIDADE TESTE" });',
      'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq1", TAG: "VP-TESTE-01", SETOR: "CME", UNIDADE_ID: "uni1" });'
    ].join('\n')
  });
  const disp = (sid, fn, payload) => env.fn('NR13_apiDispatch')({ sessionId: sid, fn, payload });
  const formulario = {
    clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', tipoVaso: 'Autoclave', fabricante: 'MARCAFICTICIA', modelo: 'M1', numeroSerie: 'SN-1',
    pmtaValor: 0.25, pmtaUnidade: 'MPa', volumeValor: 0.1, volumeUnidade: 'm³', classeFluido: 'C', fluidoServico: 'Vapor', tipoInspecao: 'Periódica',
    dataInicioInspecao: '01/10/2026', dataTerminoInspecao: '02/10/2026', descricaoInspecoes: 'Exame externo e interno.', parecerConclusivo: 'Apto a operar.',
    veredito: 'APROVADO', assinantePh: 'Responsável Técnico Teste', fotos: [], valvulas: [], manometros: []
  };
  // Laudo emitido "antes" do registro de revisões: grava direto na planilha simulada, sem passar pelo registro.
  const rasc = disp('tec', 'apiSalvarRascunho', formulario);
  const e0 = disp('tec', 'apiEmitirLaudo', Object.assign({}, formulario, { laudoId: rasc.laudoId }));
  assert.equal(e0.ok, true);
  env.run('SGO_DOCREV_MEMORIA_ = [];'); // esquece o registro: simula laudo antigo
  const prep = disp('tec', 'apiPrepararCorrecao', { laudoId: rasc.laudoId });
  const ab = env.api('tec', 'abrir', { id: prep.id, modo: 'CORRIGIR' });
  assert.equal(ab.payload._laudoId, rasc.laudoId, 'o formulário é carregado da própria planilha');
  assert.equal(ab.info.numero, e0.numeroLaudo);
  const corr = Object.assign({}, formulario, { parecerConclusivo: 'Apto a operar, com a válvula recalibrada.', _docRev: { modo: 'CORRIGIR', origemId: prep.id, motivo: 'Parecer conclusivo completado com a válvula' } });
  const rasc2 = disp('tec', 'apiSalvarRascunho', corr);
  const e1 = disp('tec', 'apiEmitirLaudo', Object.assign({}, corr, { laudoId: rasc2.laudoId }));
  assert.equal(e1.numeroLaudo, e0.numeroLaudo, 'mesmo número');
  assert.equal(e1.revisao, 'Rev. 01');
  assert.match(e1.html, /Revisão 01/);
  assert.match(e1.html, /Parecer conclusivo completado com a válvula/);
  assert.equal(env.run('SGO_DATA.getById("NR13_LAUDOS", "' + rasc.laudoId + '").STATUS'), 'SUBSTITUIDO');
  const lista = env.api('tec', 'listar', { modulo: 'NR13' }).itens;
  assert.equal(lista.length, 2);
  assert.equal(lista.filter(i => i.revisao === 0)[0].substituidaPor, 'Rev. 01');
});

test('Certificado de calibração: certificado antigo remontado do snapshot pede só temperatura e umidade; correção sai como Rev. 01 do mesmo número e o anterior fica SUBSTITUIDO', () => {
  const motor = require(require('node:path').join(A.BASE, 'SGO_CertCal_Calculo.js'));
  const env = A.criarAmbiente({
    arquivos: ['SGO_Utilis.js'].concat(BASE_A4, ['SGO_CertCal_Revisao.js', 'SGO_CertCal_Main.js']),
    extra: [
      'var __C = { clientes: { c: { ID: "c", RAZAO_SOCIAL: "HOSPITAL MODELO TESTE LTDA", CNPJ: "11222333000181" } }, equipamentos: { e: { ID: "e", CLIENTE_ID: "c", UNIDADE_ID: "un", TAG: "CENT-01", TIPO: "Centrífuga" } }, unidades: { un: { ID: "un", CLIENTE_ID: "c" } }, certificados: {} }; var __N = 0;',
      'var SGO_CFG = { SHEETS: { CAD_CLIENTES: "clientes", CAD_EQUIPAMENTOS: "equipamentos", CAD_UNIDADES: "unidades", CAD_TECNICOS: "tecnicos", CERT_CALIBRACAO: "certificados" } };',
      'var SGO_VINCULOS = { relation: function () {} }; var SGO_DOCUMENTOS = { registrarDocumentoExistente: function () {} }; Auvo_criarTarefa_ = function () {};',
      'var SGO_DATA = { getById: function (a, id) { var r = (__C[a] || {})[id]; return r ? Object.assign({}, r) : null; }, normalizarObjetoParaSheet: function (_, r) { return r; },',
      '  gerarRegistroBase: function (r) { return Object.assign({ ID: "cert" + (++__N) }, r); }, insert: function (a, r) { __C[a][r.ID] = Object.assign({}, r); return r; },',
      '  update: function (a, id, campos) { Object.assign(__C[a][id], campos); }, getSheet: function () { return { getLastRow: function () { return 1; }, getMaxRows: function () { return 10; }, getRange: function () { return { setNumberFormat: function () {} }; } }; },',
      '  getHeaders: function () { return ["NUMERO_CERTIFICADO"]; }, log: function () {} };',
      'CertCal_bootstrap_ = function () {}; CertCal_mapaPadroesAtivos_ = function () { return {}; }; var __SEQ = 0; CertCal_proximoNumero_ = function () { return "2026000" + (++__SEQ + 50); };',
      'CertCal_calcularBlocos_ = function (b) { return b.map(function (x) { return { titulo: x.titulo, unidade: x.unidade, resolucao: 1, resolucaoInferida: false, padroesUsados: [], resultados: x.pontos.map(function (p) { return { nominal: p.nominal, leituras: p.leituras }; }) }; }); };',
      'CertCalDoc_capturarDocumento_ = function () { return {}; }; CertCalDoc_montarDocumentoHtml_ = function (ctx) { return "<html><body><main>Certificado " + ctx.numeroCertificado + " Revisão " + ctx.revisao + "</main></body></html>"; };',
      'RelTecA4_paginar_ = function (h) { return { html: h, pdfBlob: Utilities.newBlob("%PDF", "application/pdf", "c.pdf") }; };',
      'CertCal_obterPastaCliente_ = function () { return DriveApp.getRootFolder(); }; CertCal_exigirAcessoCliente_ = function () {};',
      'SGO_DocSalvar_htmlAoLado_ = function (p, n, h) { var a = p.createFile(n.replace(/pdf$/, "html"), h, "text/html"); return { htmlId: a.getId(), htmlUrl: a.getUrl() }; };'
    ].join('\n')
  });
  env.ctx.CertCalCalculo = motor;
  env.run('Utilities.newBlob = (function (orig) { return function (c, m, n) { var b = orig(c, m, n); b.getAs = function () { return b; }; return b; }; })(Utilities.newBlob);');
  const formulario = { clienteId: 'c', equipamentoId: 'e', tecnicoExecutorLivre: 'Executor Teste', dataCalibracao: '08/10/2026', localCalibracao: 'LABORATORIO', temperaturaAmbiente: '22', umidadeRelativa: '50',
    blocos: [{ titulo: 'Rotação', unidade: 'rpm', resolucao: '1', padroesIds: [], pontos: [{ nominal: '1000', leituras: ['1001', '1000', '999'] }] }], fotos: [], proximaCalibracao: { solicitada: false } };
  const disp = (fn, p) => JSON.parse(JSON.stringify(env.fn(fn === 'apiGerarCertificado' ? 'CertCal_apiGerarCertificado' : 'CertCal_apiPrepararCorrecao')('tec', p)));
  const c0 = disp('apiGerarCertificado', Object.assign({ _docRev: { modo: '' } }, formulario));
  assert.equal(c0.ok, true);
  env.run('SGO_DOCREV_MEMORIA_ = [];'); // esquece o registro: certificado "antigo"
  const prep = disp('apiPrepararCorrecao', { certificadoId: c0.certificadoId });
  const ab = env.api('tec', 'abrir', { id: prep.id, modo: 'CORRIGIR' });
  assert.equal(ab.payload.blocos[0].pontos[0].leituras[2], '999', 'leituras remontadas do snapshot');
  assert.equal(ab.payload._equipamento.TAG, 'CENT-01');
  assert.equal(ab.payload.temperaturaAmbiente, '');
  assert.match(ab.info.aviso, /Falta só preencher: temperatura ambiente e umidade relativa/);
  const corr = Object.assign({}, ab.payload, { temperaturaAmbiente: '22', umidadeRelativa: '50', blocos: [{ titulo: 'Rotação', unidade: 'rpm', resolucao: '1', padroesIds: [], pontos: [{ nominal: '1000', leituras: ['1001', '1000', '998'] }] }],
    _docRev: { modo: 'CORRIGIR', origemId: prep.id, motivo: 'Terceira leitura do ponto de 1000 rpm digitada errada' } });
  const c1 = disp('apiGerarCertificado', corr);
  assert.equal(c1.numeroCertificado, c0.numeroCertificado);
  assert.equal(c1.revisao, 'Rev. 01');
  assert.match(c1.html, /Revisão 01/);
  assert.match(c1.html, /Terceira leitura do ponto de 1000 rpm digitada errada/);
  assert.equal(env.run('__C.certificados["' + c0.certificadoId + '"].STATUS'), 'SUBSTITUIDO');
  assert.equal(env.run('__C.certificados["' + c1.certificadoId + '"].STATUS'), 'ATIVO');
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
