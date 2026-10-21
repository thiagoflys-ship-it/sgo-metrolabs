// Ambiente de teste do módulo Lavadoras (SGO_LavRel_*): usa o ambiente da autoclave (simulacros do Apps Script)
// e carrega por cima os arquivos da lavadora, no mesmo contexto (confere também que os nomes não colidem).
// Só dados de teste: nada de cliente real.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const A = require('./_autoclave_ambiente.cjs');

const ARQUIVOS_LAV = [
  'SGO_LavRel_Config.js', 'SGO_LavRel_Parser.js', 'SGO_LavRel_AnaliseCiclo.js', 'SGO_LavRel_Main.js', 'SGO_LavRel_Simulador.js',
  'SGO_LavRel_CertificadoIA.js', 'SGO_LavRel_CertificadoRelatorio.js', 'SGO_LavRel_PlanilhaDados.js',
  'SGO_QualifEquipamento.js', 'SGO_LavRel_ModeloOficialDoc.js', 'SGO_LavRel_ModeloOficialNovo.js'
];

function ler(nome) { return fs.readFileSync(path.join(A.BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

const STUBS = [
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: "pdf" + a.getId(), pdfUrl: "/arquivos/pdf" + a.getId(), html: h }; };',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  'var SESSOES_TESTE = { tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec" }, rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt" }, adm: { perfil: "ADMIN", nome: "Administrador Teste", usuario: "adm" }, cli: { perfil: "CLIENTE", nome: "Cliente Teste", usuario: "cli", clienteId: "cli1" }, cli2: { perfil: "CLIENTE", nome: "Outro Cliente", usuario: "cli2", clienteId: "cli2" } };',
  'var __lerLav = LavRel_lerDadosEntradaRich_;',
  'LavRel_lerDadosEntradaRich_ = function (p) { if (String(p.modoEntrada || "FILE_ID").toUpperCase() === "FILE_ID") { var t = DriveApp.getFileById(LavRel_extrairDriveIdSeguro_(p.fileId)).getBlob().getDataAsString(); return __lerLav({ modoEntrada: "COLAR", textoColado: t, delimManual: p.delimManual }); } return __lerLav(p); };',
  'var REGISTRADOR_TESTE = { itens: [{ tag: "DTL-T1", descricao: "Registrador de teste", certificado: "CAL-T-1", validade: "01/01/2027", situacao: "Válido na data do ensaio", conforme: true, encontrado: true, incertezaU95: 0.3 }], observacoes: [] };',
  'SGO_DocA4_registradores_ = function (t) { return String(t || "").trim() === "DTL-T1" ? JSON.parse(JSON.stringify(REGISTRADOR_TESTE)) : (String(t || "").trim() ? { itens: [{ tag: t, encontrado: false, conforme: null }], observacoes: [] } : { itens: [], observacoes: [] }); };'
].join('\n');

// Cadastro em memória (clientes, unidades, equipamentos e Arquivo de documentos), só com dados fictícios.
const CADASTRO = [
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
  'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli1", RAZAO_SOCIAL: "HOSPITAL MODELO TESTE LTDA", NOME_FANTASIA: "HOSPITAL MODELO TESTE", CNPJ: "11222333000181", ENDERECO: "Rua de Teste, 100", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni1", CLIENTE_ID: "cli1", NOME_UNIDADE: "CME CENTRAL TESTE", ENDERECO: "Rua de Teste, 100", CIDADE: "Goiânia", UF: "GO", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq1", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "LAVADORA TERMODESINFECTORA", FABRICANTE: "MARCAFICTICIA", MODELO: "MODELOXYZ", SERIE: "SN-LAV-0001", TAG: "LAV-TESTE-01", SETOR: "CME", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq3", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "LAVADORA ULTRASSONICA", SERIE: "SN-US-0001", TAG: "LUS-TESTE-01", SETOR: "CME", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_CLIENTES", { ID: "cli2", RAZAO_SOCIAL: "CLINICA OUTRA TESTE LTDA", NOME_FANTASIA: "CLINICA OUTRA TESTE", CNPJ: "99888777000166", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_UNIDADES", { ID: "uni2", CLIENTE_ID: "cli2", NOME_UNIDADE: "CME OUTRA", STATUS: "ATIVO" });',
  'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq2", CLIENTE_ID: "cli2", UNIDADE_ID: "uni2", TIPO: "LAVADORA TERMODESINFECTORA", SERIE: "SN-OUTRA", TAG: "LAV-OUTRA-01", STATUS: "ATIVO" });'
].join('\n');

function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const env = A.criarAmbiente(Object.assign({}, opcoes, { extra: '' }));
  for (const nome of ARQUIVOS_LAV) {
    if (!fs.existsSync(path.join(A.BASE, nome))) continue;
    vm.runInContext(ler(nome), env.ctx, { filename: nome });
  }
  vm.runInContext(STUBS, env.ctx);
  if (opcoes.cadastro) vm.runInContext(CADASTRO, env.ctx);
  if (opcoes.extra) vm.runInContext(opcoes.extra, env.ctx);
  env.lav = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('LavRel_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.oficial = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('LavOficial_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  return env;
}

/** CSV em blocos: [n leituras, temperatura (número ou função(s, i))], intervalo dtSeg. */
function csvBlocos(blocos, dtSeg, nSensores, inicio) {
  const cab = ['Data', 'Hora'].concat(Array.from({ length: nSensores }, (_, i) => 'S' + (i + 1)));
  const out = [cab.join(';')];
  let k = 0;
  const t0 = (inicio || new Date(2026, 9, 10, 9, 0, 0)).getTime();
  blocos.forEach(([n, temp]) => {
    for (let i = 0; i < n; i++, k++) {
      const d = new Date(t0 + k * dtSeg * 1000);
      const dd = x => String(x).padStart(2, '0');
      const ts = Array.from({ length: nSensores }, (_, s) => (typeof temp === 'function' ? temp(s, i) : temp)).map(v => String(v).replace('.', ','));
      out.push([dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(), dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds())].concat(ts).join(';'));
    }
  });
  return out.join('\n');
}

/**
 * Ciclo sintético de termodesinfectora: pré-lavagem fria, lavagem aquecida, enxágue, aquecimento,
 * patamar de desinfecção, drenagem e secagem. o: { inicio, dtSeg, nSensores, tPatamar, patamarMin,
 * desvios:[°C], atraso:[s], tPre, tLavagem, tSecagem }. Devolve linhas { data, hora, t:[...] }.
 */
function cicloTermo(o) {
  o = Object.assign({ inicio: new Date(2026, 9, 10, 8, 0, 0), dtSeg: 10, nSensores: 4, tPatamar: 91, patamarMin: 5, desvios: [], atraso: [], tPre: 30, tLavagem: 55, tSecagem: 78 }, o || {});
  const fases = [
    [0, 3 * 60, s => o.tPre - 2 + 2 * Math.min(1, s / 60)],                               // pré-lavagem (água fria)
    [3 * 60, 4 * 60, s => 22 + (o.tLavagem - 22) * (s / 240)],                             // água nova da lavagem e aquecimento
    [7 * 60, 5 * 60, () => o.tLavagem],                                                     // lavagem
    [12 * 60, 2 * 60, s => 30 + 2 * Math.min(1, s / 60)],                                   // enxágue (água nova, fria)
    [14 * 60, 6 * 60, s => 32 + (o.tPatamar - 32) * (s / 360)],                             // aquecimento para a desinfecção
    [20 * 60, o.patamarMin * 60, s => o.tPatamar + 0.2 * Math.sin(s / 29)],                 // patamar
    [20 * 60 + o.patamarMin * 60, 60, s => o.tPatamar - (o.tPatamar - 60) * (s / 60)],      // drenagem
    [21 * 60 + o.patamarMin * 60, 6 * 60, s => 60 + (o.tSecagem - 60) * Math.min(1, s / 120)], // secagem
    [27 * 60 + o.patamarMin * 60, 3 * 60, s => o.tSecagem - (o.tSecagem - 45) * (s / 180)]  // resfriamento
  ];
  const fim = fases[fases.length - 1][0] + fases[fases.length - 1][1];
  const linhas = [];
  const dd = x => String(x).padStart(2, '0');
  for (let t = 0; t <= fim; t += o.dtSeg) {
    const temps = [];
    for (let k = 0; k < o.nSensores; k++) {
      const tt = Math.max(0, t - (o.atraso[k] || 0));
      let f = fases[0];
      for (const fx of fases) if (tt >= fx[0]) f = fx;
      let v = f[2](tt - f[0]);
      // O desvio de cada sensor vale no aquecimento e no patamar (sensor mais frio da carga).
      if (tt >= 14 * 60 && tt < 20 * 60 + o.patamarMin * 60) v += (o.desvios[k] || 0);
      temps.push(Math.round((v - 0.03 * k) * 100) / 100);
    }
    const d = new Date(o.inicio.getTime() + t * 1000);
    linhas.push({ data: dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(), hora: dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds()), t: temps });
  }
  return linhas;
}

/** Ciclo sintético de lavadora ultrassônica: pré-enxágue frio, aquecimento do banho, patamar e drenagem. */
function cicloUltra(o) {
  o = Object.assign({ inicio: new Date(2026, 9, 11, 10, 0, 0), dtSeg: 10, nSensores: 3, tBanho: 45, banhoMin: 12, desvios: [], tPre: 26 }, o || {});
  const fases = [
    [0, 3 * 60, () => o.tPre],
    [3 * 60, 60, s => o.tPre - 6 * (s / 60)],
    [4 * 60, 8 * 60, s => o.tPre - 6 + (o.tBanho - o.tPre + 6) * (s / 480)],
    [12 * 60, o.banhoMin * 60, s => o.tBanho + 0.3 * Math.sin(s / 41)],
    [12 * 60 + o.banhoMin * 60, 4 * 60, s => o.tBanho - (o.tBanho - 28) * Math.min(1, s / 120)]
  ];
  const fim = fases[fases.length - 1][0] + fases[fases.length - 1][1];
  const linhas = [];
  const dd = x => String(x).padStart(2, '0');
  for (let t = 0; t <= fim; t += o.dtSeg) {
    let f = fases[0];
    for (const fx of fases) if (t >= fx[0]) f = fx;
    const base = f[2](t - f[0]);
    const temps = Array.from({ length: o.nSensores }, (_, k) => Math.round((base + (t >= 12 * 60 && t < 12 * 60 + o.banhoMin * 60 ? (o.desvios[k] || 0) : 0) - 0.05 * k) * 100) / 100);
    const d = new Date(o.inicio.getTime() + t * 1000);
    linhas.push({ data: dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(), hora: dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds()), t: temps });
  }
  return linhas;
}

/** CSV completo no formato do registrador (Data;Horário;ST-01..), vírgula decimal. */
function csvCompleto(linhas) {
  const n = linhas[0].t.length;
  const cab = ['Data', 'Horário'].concat(Array.from({ length: n }, (_, i) => 'ST-' + String(i + 1).padStart(2, '0')));
  return [cab.join(';')].concat(linhas.map(l => [l.data, l.hora].concat(l.t.map(v => String(v.toFixed(2)).replace('.', ','))).join(';'))).join('\n');
}

/** CSV de um registrador individual: Nº;Data;Hora;Temperatura (°C). deslocSeg: relógio adiantado. */
function csvIndividual(linhas, k, deslocSeg) {
  deslocSeg = deslocSeg || 0;
  return ['Nº;Data;Hora;Temperatura (°C)'].concat(linhas.map((l, i) => {
    let hora = l.hora;
    if (deslocSeg) {
      const [h, m, s] = hora.split(':').map(Number);
      const tot = h * 3600 + m * 60 + s + deslocSeg;
      hora = [Math.floor(tot / 3600), Math.floor(tot / 60) % 60, tot % 60].map(x => String(x).padStart(2, '0')).join(':');
    }
    return [i + 1, l.data, hora, String(l.t[k].toFixed(2)).replace('.', ',')].join(';');
  })).join('\n');
}

module.exports = { criarAmbiente, csvBlocos, cicloTermo, cicloUltra, csvCompleto, csvIndividual, BASE: A.BASE };
