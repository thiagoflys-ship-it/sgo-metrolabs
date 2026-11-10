// Ambiente de teste do módulo Cadeia de Frio (SGO_CadeiaFrioRel_*): carrega os arquivos do legado num contexto
// isolado com simulacros do Apps Script (reaproveita _autoclave_ambiente.cjs: Utilities, Drive, propriedades,
// HtmlService) e acrescenta um banco em memória (cadastros, padrões e Arquivo de documentos) e as sessões de teste.
// Só dados de teste: nada de cliente real, nenhum nome de pessoa nem fabricante.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const A = require('./_autoclave_ambiente.cjs');

const ARQUIVOS = [
  'SGO_QualifEquipamento.js',
  'SGO_CadeiaFrioRel_Config.js', 'SGO_CadeiaFrioRel_Datas.js', 'SGO_CadeiaFrioRel_Parser.js', 'SGO_CadeiaFrioRel_Engine.js',
  'SGO_CadeiaFrioRel_Main.js', 'SGO_CadeiaFrioRel_Simulador.js', 'SGO_CadeiaFrioRel_CertificadoIA.js', 'SGO_CadeiaFrioRel_CertificadoRelatorio.js',
  'SGO_CadeiaFrioRel_Planilha.js', 'SGO_CadeiaFrioRel_Graficos.js',
  'SGO_CadeiaFrioRel_Qualificacao.js', 'SGO_CadeiaFrioRel_Emissao.js', 'SGO_CadeiaFrioRel_RelatorioEnsaio.js', 'SGO_CadeiaFrioRel_PlanilhaDados.js',
  'SGO_CadeiaFrioRel_ModeloOficial.js', 'SGO_CadeiaFrioRel_ModeloOficialDoc.js'
];

const STUBS = [
  // PDF e paginação ficam fora do teste unitário (o ensaio no servidor cobre o PDF real).
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h, o) { var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), html: h }; };',
  'var SESSOES_TESTE = {',
  '  tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec", userId: "u_tec" },',
  '  rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt", userId: "u_rt" },',
  '  adm: { perfil: "ADMIN", nome: "Administrador Teste", usuario: "adm", userId: "u_adm" },',
  '  rh: { perfil: "RH", nome: "Pessoas Teste", usuario: "rh", userId: "u_rh" },',
  '  cli: { perfil: "CLIENTE", nome: "Cliente Teste", usuario: "cli", userId: "u_cli", clienteId: "cli1" },',
  '  cli2: { perfil: "CLIENTE", nome: "Outro Cliente", usuario: "cli2", userId: "u_cli2", clienteId: "cli2" }',
  '};',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  // Arquivo do registrador (FILE_ID): lê o arquivo de teste e passa pelo mesmo leitor de texto.
  'var __lerOriginal = CadeiaFrioRel_lerDadosEntradaRich_;',
  'CadeiaFrioRel_lerDadosEntradaRich_ = function (p) { if (String(p.modoEntrada || "FILE_ID").toUpperCase() === "FILE_ID") { var t = DriveApp.getFileById(CadeiaFrioRel_extrairDriveIdSeguro_(p.fileId)).getBlob().getDataAsString(); return __lerOriginal({ modoEntrada: "COLAR", textoColado: t, delimManual: p.delimManual }); } return __lerOriginal(p); };',
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
  'var SGO_DOCUMENTOS = { registrarDocumentoExistente: function (sid, p) { var s = exigirSessao(sid); if (s.perfil === "CLIENTE") return { success: false, message: "Acesso negado" };',
  '  SGO_QEQ_identificacao_(sid, p.CLIENTE_ID, p.UNIDADE_ID, p.EQUIPAMENTO_ID);',
  '  SGO_DATA.insert("DOC_DOCUMENTOS", { CLIENTE_ID: p.CLIENTE_ID, UNIDADE_ID: p.UNIDADE_ID, EQUIPAMENTO_ID: p.EQUIPAMENTO_ID, TIPO_DOCUMENTO: String(p.TIPO_DOCUMENTO).toUpperCase(), NOME_ARQUIVO: String(p.NOME_ARQUIVO).toUpperCase(), LINK_ARQUIVO: p.LINK_ARQUIVO, DATA_EMISSAO: "2026-10-21T12:00:00Z", DATA_VENCIMENTO: p.DATA_VENCIMENTO, STATUS: "ATIVO" });',
  '  return { success: true }; } };',
  'function SGO_bloquearRH_(s, oQue) { if (s && s.perfil === "RH") throw new Error("O perfil RH não acessa " + oQue + "."); }'
].join('\n');

function ler(nome) { return fs.readFileSync(path.join(A.BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const env = A.criarAmbiente(Object.assign({}, opcoes, { extra: undefined }));
  // Utilities.parseCsv (aspas duplas e separador informado), como no Apps Script.
  env.ctx.Utilities.parseCsv = function (texto, sep) {
    const linhas = [];
    let campo = '', linha = [], aspas = false;
    const t = String(texto || '');
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (aspas) {
        if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else if (c !== '\r') campo += c;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  };
  for (const f of ARQUIVOS) { if (fs.existsSync(path.join(A.BASE, f))) env.run(ler(f)); }
  env.run(STUBS);
  if (opcoes.extra) env.run(opcoes.extra);
  env.run([
    'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli1", RAZAO_SOCIAL: "HOSPITAL MODELO TESTE LTDA", NOME_FANTASIA: "HOSPITAL MODELO TESTE", CNPJ: "11222333000181", ENDERECO: "Rua de Teste, 100", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni1", CLIENTE_ID: "cli1", NOME_UNIDADE: "FARMÁCIA CENTRAL TESTE", ENDERECO: "Rua de Teste, 100", CIDADE: "Goiânia", UF: "GO", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq1", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "CÂMARA DE CONSERVAÇÃO", FABRICANTE: "MARCAFICTICIA", MODELO: "MODELOXYZ", SERIE: "SN-FRIO-0001", TAG: "CF-TESTE-01", SETOR: "Farmácia", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq3", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "FREEZER", SERIE: "SN-FRIO-0003", TAG: "CF-TESTE-03", SETOR: "Laboratório", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli2", RAZAO_SOCIAL: "CLINICA OUTRA TESTE LTDA", NOME_FANTASIA: "CLINICA OUTRA TESTE", CNPJ: "99888777000166", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni2", CLIENTE_ID: "cli2", NOME_UNIDADE: "UNIDADE OUTRA", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq2", CLIENTE_ID: "cli2", UNIDADE_ID: "uni2", TIPO: "REFRIGERADOR", SERIE: "SN-OUTRA", TAG: "CF-OUTRA-01", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_PADROES", { TAG: "DTL-T1", DESCRICAO: "Registrador de temperatura (teste)", CERTIFICADO_NUMERO: "CAL-T-1", VALIDADE: "31/12/2027", INCERTEZA_U95: 0.2, FATOR_K: 2, STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_PADROES", { TAG: "DTL-VENC", DESCRICAO: "Registrador vencido (teste)", CERTIFICADO_NUMERO: "CAL-T-2", VALIDADE: "01/01/2025", INCERTEZA_U95: 0.2, STATUS: "ATIVO" });'
  ].join('\n'));
  env.dispatch = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('CadeiaFrioRel_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.oficial = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('CadeiaFrioOficial_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.chamar = (nome, ...args) => env.fn(nome)(...args);
  return env;
}

/* ------------------------------------------------------------------
 * Gerador de leituras de teste (formato do registrador: Data;Hora;S1..Sn, vírgula decimal)
 * ------------------------------------------------------------------ */

const dd = x => String(x).padStart(2, '0');
function dataTxt(d) { return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(); }
function horaTxt(d) { return dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds()); }
function quando(d) { return dataTxt(d) + ' ' + horaTxt(d); }

/**
 * Leituras: n linhas a cada dtSeg a partir de inicio; temp(s, k) dá a temperatura do sensor s na leitura k
 * (null = célula vazia). pular(k) → true remove a linha (lacuna).
 */
function leituras(o) {
  o = Object.assign({ inicio: new Date(2026, 9, 12, 8, 0, 0), dtSeg: 60, n: 61, nSensores: 3, temp: () => 5, pular: () => false }, o || {});
  const linhas = [];
  for (let k = 0; k < o.n; k++) {
    if (o.pular(k)) continue;
    const d = new Date(o.inicio.getTime() + k * o.dtSeg * 1000);
    const t = [];
    for (let s = 0; s < o.nSensores; s++) { const v = o.temp(s, k); t.push(v === null ? null : Math.round(v * 100) / 100); }
    linhas.push({ d, t });
  }
  return linhas;
}

function csv(linhas) {
  const n = linhas[0].t.length;
  const cab = ['Data', 'Hora'].concat(Array.from({ length: n }, (_, i) => 'S' + (i + 1)));
  return [cab.join(';')].concat(linhas.map(l => [dataTxt(l.d), horaTxt(l.d)].concat(l.t.map(v => (v === null ? '' : String(v.toFixed(2)).replace('.', ',')))).join(';'))).join('\n');
}

/** Payload da tela com o vínculo do cadastro (câmara de conservação de imunobiológicos, 2 a 8 °C). */
function payload(extra) {
  return Object.assign({
    perfil: 'CAMARA_VACINA_2_8', nSensores: 3, dateStyle: 'BR', modoEntrada: 'COLAR', delimManual: 'AUTO',
    cliente: 'NOME DIGITADO QUE NÃO VALE', cnpj: '00.000.000/0000-00', tagEquipamento: 'TAG-DIGITADA', responsavelTecnico: 'Técnico Teste',
    certNumero: 'CF-T-0001', certRevisao: '0', certDataLogger: 'DTL-T1',
    clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1',
    grandezas: { umidade: { medida: false, justificativa: 'Registrador só de temperatura; a umidade não é controlada neste equipamento.' },
      aberturaPorta: { justificativa: 'Estudo de abertura de porta feito em outra data, em relatório próprio.' },
      quedaEnergia: { justificativa: 'Estudo de queda de energia feito em outra data, em relatório próprio.' } },
    estudos: {}
  }, extra || {});
}

module.exports = { criarAmbiente, leituras, csv, payload, quando, A };
