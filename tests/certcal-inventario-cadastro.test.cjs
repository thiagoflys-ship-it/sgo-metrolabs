// Certificado de calibração e relatório do Inventário com os campos novos do cadastro do equipamento (21/10/2026):
// patrimônio no certificado (só quando preenchido) e no "Cadastrar Equipamento" rápido; no Inventário, coluna de
// patrimônio quando algum equipamento tem, capacidade e ano junto do tipo. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8').replace(/\r\n/g, '\n');

function certcal() {
  const sb = {};
  vm.createContext(sb);
  for (const f of ['SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_RelTecIA.js', 'SGO_CertCal_Config.js', 'SGO_CertCal_Calculo.js', 'SGO_CertCal_Documento.js', 'SGO_CertCal_IA.js']) vm.runInContext(ler(f), sb);
  return sb;
}
function ctxTeste(sb, equipamento) {
  const bloco = Object.assign(sb.CertCalCalculo.calcularBloco([{ nominal: 3000, leituras: [2999, 3000, 3001] }], [{ codigo: 'RPM-01', incertezaU95: 0.1, fatorK: 2, veff: 0 }]),
    { titulo: 'Rotação', unidade: 'rpm', numLeituras: 3, fontesIncerteza: [{ codigo: 'RPM-01', incertezaU95: 0.1, fatorK: 2, veff: 0 }], padroesUsados: [] });
  return { cliente: { razaoSocial: 'Cliente de teste' }, equipamento: equipamento, blocos: [bloco], numeroCertificado: 'TESTE-2026', dataCalibracao: '08/10/2026', dataEmissao: '08/10/2026', localCalibracao: 'CLIENTE', veredito: 'APROVADO' };
}

test('certificado de calibração: patrimônio do cadastro só quando preenchido', () => {
  const sb = certcal();
  const com = sb.CertCalDoc_montarDocumentoHtml_(ctxTeste(sb, { descricao: 'Centrífuga', tag: 'CENT-TESTE', serie: 'SN-T1', patrimonio: 'PAT-TESTE-9' }));
  assert.match(com, /Patrimônio/);
  assert.match(com, /PAT-TESTE-9/);
  const sem = sb.CertCalDoc_montarDocumentoHtml_(ctxTeste(sb, { descricao: 'Centrífuga', tag: 'CENT-TESTE', serie: 'SN-T1' }));
  assert.doesNotMatch(sem, /Patrimônio/);
  assert.match(ler('SGO_CertCal_Main.js'), /serie:equipamento\.SERIE\|\|"",patrimonio:equipamento\.PATRIMONIO\|\|"",localizacao:/);
});

test('Cadastrar Equipamento rápido do certificado grava o patrimônio', () => {
  assert.match(ler('SGO_CertCal_Main.js'), /TAG:payload\.tag,SETOR:payload\.setor,PATRIMONIO:payload\.patrimonio\}\)/);
  const c = { HtmlService: { createHtmlOutputFromFile: () => ({ getContent: () => '' }) } };
  vm.createContext(c);
  vm.runInContext(ler('SGO_CertCal_ConteudoModulo.js'), c);
  const html = c.CertCal_obterConteudoModulo();
  assert.match(html, /<input id="certcal-eq-patrimonio">/);
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /patrimonio: \(document\.getElementById\('certcal-eq-patrimonio'\) \|\| \{\}\)\.value \|\| ''/);
});

test('relatório do Inventário: coluna de patrimônio quando algum tem; capacidade e ano junto do tipo', () => {
  const inv = ler('SGO_Inventario_Main.js');
  for (const c of ['PATRIMONIO', 'ANO_FABRICACAO', 'CAPACIDADE']) assert.match(inv, new RegExp(c + ': SGO_UTILS\\.safe\\(e\\.' + c + '\\)'));
  assert.match(inv, /const invTemPat = dados\.itens\.some\(e => e\.PATRIMONIO\);/);
  // A célula do tipo, como o relatório monta.
  const celula = e => [e.TIPO || '—', [e.CAPACIDADE, e.ANO_FABRICACAO ? 'fabricação ' + e.ANO_FABRICACAO : ''].filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
  assert.ok(inv.includes('[e.TIPO || "—", [e.CAPACIDADE, e.ANO_FABRICACAO ? "fabricação " + e.ANO_FABRICACAO : ""].filter(Boolean).join(" · ")].filter(Boolean).join(" — ")'));
  assert.equal(celula({ TIPO: 'AUTOCLAVE', CAPACIDADE: '150 L', ANO_FABRICACAO: '2019' }), 'AUTOCLAVE — 150 L · fabricação 2019');
  assert.equal(celula({ TIPO: 'AUTOCLAVE' }), 'AUTOCLAVE');
});
