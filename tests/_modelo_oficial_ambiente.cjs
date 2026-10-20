// Ambiente de teste do relatório de qualificação da autoclave (modelo oficial novo) e do fluxo integrado
// cliente → unidade → equipamento → qualificação (20/10/2026). Reaproveita o ambiente da Autoclave
// (_autoclave_ambiente.cjs: motor, emissão com aprovação, documento A4) e acrescenta um banco em memória
// (cadastros e Arquivo de documentos), as sessões de teste e os arquivos novos. Só dados de teste.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const A = require('./_autoclave_ambiente.cjs');

const ARQUIVOS_NOVOS = ['SGO_QualifEquipamento.js', 'SGO_AutoRel_ModeloOficialNovo.js', 'SGO_AutoRel_ModeloOficialDoc.js'];

const STUBS = [
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h, o) { var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), html: h }; };',
  'var SESSOES_TESTE = {',
  '  tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec", userId: "u_tec" },',
  '  rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt", userId: "u_rt" },',
  '  adm: { perfil: "ADMIN", nome: "Administrador Teste", usuario: "adm", userId: "u_adm" },',
  '  com: { perfil: "COMERCIAL", nome: "Comercial Teste", usuario: "com", userId: "u_com" },',
  '  cli: { perfil: "CLIENTE", nome: "Cliente Teste", usuario: "cli", userId: "u_cli", clienteId: "cli1" },',
  '  cli2: { perfil: "CLIENTE", nome: "Outro Cliente", usuario: "cli2", userId: "u_cli2", clienteId: "cli2" }',
  '};',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  'var __lerOriginal = AutoRel_lerDadosEntradaRich_;',
  'AutoRel_lerDadosEntradaRich_ = function (p) { if (String(p.modoEntrada || "FILE_ID").toUpperCase() === "FILE_ID") { var t = DriveApp.getFileById(AutoRel_extrairDriveIdSeguro_(p.fileId)).getBlob().getDataAsString(); return __lerOriginal({ modoEntrada: "COLAR", textoColado: t, delimManual: p.delimManual }); } return __lerOriginal(p); };',
  'var REGISTRADOR_TESTE = { itens: [{ tag: "DTL-T1", descricao: "Registrador de temperatura e pressão MARCAFICTICIA", certificado: "CAL-T-1", validade: "01/01/2027", situacao: "Válido na data do ensaio", conforme: true, encontrado: true, incertezaU95: 0.3 }], observacoes: [] };',
  'SGO_DocA4_registradores_ = function (t) { return String(t || "").trim() === "DTL-T1" ? JSON.parse(JSON.stringify(REGISTRADOR_TESTE)) : { itens: [], observacoes: [] }; };',
  // Banco em memória (sem getDB: o registro de emissões fica na memória de SGO_QualifEmissao.js).
  'var __ABAS = {}; var __SEQ = 0; var LOGS_TESTE = [];',
  'var SGO_CFG = { SHEETS: { CAD_CLIENTES: "CAD_CLIENTES", CAD_UNIDADES: "CAD_UNIDADES", CAD_EQUIPAMENTOS: "CAD_EQUIPAMENTOS", DOC_DOCUMENTOS: "DOC_DOCUMENTOS", CAD_PADROES: "CAD_PADROES" } };',
  'var SGO_DATA = {',
  '  getAll: function (n) { return (__ABAS[n] || []).map(function (l) { return Object.assign({}, l); }); },',
  '  getById: function (n, id) { var l = (__ABAS[n] || []).filter(function (x) { return String(x.ID) === String(id); })[0]; return l ? Object.assign({}, l) : null; },',
  '  insert: function (n, o) { o = Object.assign({}, o); if (!o.ID) o.ID = "id" + (++__SEQ); (__ABAS[n] = __ABAS[n] || []).push(o); return o; },',
  '  log: function (acao, usuario, detalhe, modulo) { LOGS_TESTE.push({ acao: acao, usuario: usuario, detalhe: detalhe, modulo: modulo }); }',
  '};',
  'DriveApp.Access = { ANYONE_WITH_LINK: "ANYONE_WITH_LINK" }; DriveApp.Permission = { VIEW: "VIEW" };',
  // Arquivo de documentos: grava de verdade na aba em memória, com a mesma conferência de vínculo.
  'var SGO_DOCUMENTOS = { registrarDocumentoExistente: function (sid, p) { var s = exigirSessao(sid); if (s.perfil === "CLIENTE") return { success: false, message: "Acesso negado" };',
  '  SGO_QEQ_identificacao_(sid, p.CLIENTE_ID, p.UNIDADE_ID, p.EQUIPAMENTO_ID);',
  '  SGO_DATA.insert("DOC_DOCUMENTOS", { CLIENTE_ID: p.CLIENTE_ID, UNIDADE_ID: p.UNIDADE_ID, EQUIPAMENTO_ID: p.EQUIPAMENTO_ID, TIPO_DOCUMENTO: String(p.TIPO_DOCUMENTO).toUpperCase(), NOME_ARQUIVO: String(p.NOME_ARQUIVO).toUpperCase(), LINK_ARQUIVO: p.LINK_ARQUIVO, DATA_EMISSAO: "2026-10-20T12:00:00Z", DATA_VENCIMENTO: p.DATA_VENCIMENTO, STATUS: "ATIVO" });',
  '  return { success: true }; } };'
].join('\n');

function ler(nome) { return fs.readFileSync(path.join(A.BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const env = A.criarAmbiente(Object.assign({}, opcoes, { extra: STUBS + '\n' + (opcoes.extra || '') }));
  for (const f of ARQUIVOS_NOVOS) env.run(ler(f));
  env.run([
    'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli1", RAZAO_SOCIAL: "HOSPITAL MODELO TESTE LTDA", NOME_FANTASIA: "HOSPITAL MODELO TESTE", CNPJ: "11222333000181", ENDERECO: "Rua de Teste, 100", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni1", CLIENTE_ID: "cli1", NOME_UNIDADE: "CME CENTRAL TESTE", ENDERECO: "Rua de Teste, 100", CIDADE: "Goiânia", UF: "GO", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq1", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "AUTOCLAVE", FABRICANTE: "MARCAFICTICIA", MODELO: "MODELOXYZ", SERIE: "SN-TESTE-0001", TAG: "AUT-TESTE-01", SETOR: "CME", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli2", RAZAO_SOCIAL: "CLINICA OUTRA TESTE LTDA", NOME_FANTASIA: "CLINICA OUTRA TESTE", CNPJ: "99888777000166", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni2", CLIENTE_ID: "cli2", NOME_UNIDADE: "CME OUTRA", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq2", CLIENTE_ID: "cli2", UNIDADE_ID: "uni2", TIPO: "AUTOCLAVE", SERIE: "SN-OUTRA", TAG: "AUT-OUTRA-01", STATUS: "ATIVO" });'
  ].join('\n'));
  env.oficial = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('AutoOficial_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.ciclo = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('AutoRel_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.chamar = (nome, ...args) => JSON.parse(JSON.stringify(env.fn(nome)(...args)));
  return env;
}

/** Payload de ciclo da tela "Gerar relatório", já com o vínculo do cadastro. */
function payloadCiclo(extra) {
  return Object.assign({
    modoEntrada: 'COLAR', nSensores: 3, setpoint: '134', motor: '134', dateStyle: 'BR',
    equipamento: { modoRemocaoAr: 'AUTO', unidadePressao: 'BAR_ABS' }, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11.222.333/0001-81',
    tag: 'AUT-TESTE-01', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste', cicloNum: '1',
    clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1'
  }, extra || {});
}

/** Emite um relatório de ensaio de ciclo pelo fluxo real (rascunho → envio → aprovação). Devolve o id da emissão. */
function emitirCiclo(env, extra, opcoes) {
  opcoes = opcoes || {};
  const linhas = A.cicloSintetico(Object.assign({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 }, opcoes.ciclo || {}));
  const p = payloadCiclo(Object.assign({ textoColado: A.csvCompleto(linhas) }, extra || {}));
  const D = env.fn('AutoRel_apiDispatch');
  const r = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: p });
  if (r.bloqueado) throw new Error('ciclo de teste bloqueado: ' + JSON.stringify(r.travas));
  const envio = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }) });
  D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: envio.id, confirmacaoRevisao: true } });
  return envio.id;
}

function qiTudoConforme(env) {
  const o = {};
  env.fn('AUTOFICIAL_CFG').QI_ITENS.forEach(it => { o[it.id] = { situacao: 'C' }; });
  return o;
}

module.exports = { criarAmbiente, payloadCiclo, emitirCiclo, qiTudoConforme, A };
