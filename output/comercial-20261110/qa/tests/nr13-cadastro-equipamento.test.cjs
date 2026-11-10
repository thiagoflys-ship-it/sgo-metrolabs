// Laudo NR-13 (21/10/2026): ano de fabricação e volume vêm do cadastro do equipamento quando o campo está vazio
// (o volume só quando a capacidade do cadastro tem a unidade, L ou m³); a localização do laudo é unidade + setor.
// Confere o módulo como o Apps Script o entrega (string decodificada) e o servidor. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8').replace(/\r\n/g, '\n');

function moduloDecodificado() {
  const c = {};
  vm.createContext(c);
  vm.runInContext(ler('SGO_NR13_ConteudoModulo.js'), c);
  assert.equal(typeof c.NR13_obterConteudoModulo, 'function', 'função do módulo continua no arquivo');
  return c.NR13_obterConteudoModulo();
}

test('tela: ao escolher o equipamento, ano e volume do cadastro entram só nos campos vazios', () => {
  const html = moduloDecodificado();
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.doesNotThrow(() => new vm.Script(js), 'script do módulo com sintaxe válida');
  const ini = js.indexOf('function tplNR13_confirmarEquipamento_(eq)');
  const corpo = js.slice(ini, js.indexOf('\nfunction ', ini + 10));
  assert.match(corpo, /if \(elAno && !String\(elAno\.value \|\| ''\)\.trim\(\) && String\(eq\.ANO_FABRICACAO \|\| ''\)\.trim\(\)\)/);
  assert.match(corpo, /!String\(elVol\.value \|\| ''\)\.trim\(\) && mCap/);
  // A regra da capacidade: número com unidade reconhecida; sem unidade não preenche.
  const re = eval(corpo.match(/mCap = (\/\^.*?\/i)\.exec/)[1]);
  assert.deepEqual(Array.from(re.exec('150 L')).slice(1), ['150', 'L']);
  assert.deepEqual(Array.from(re.exec('1.000 litros')).slice(1), ['1.000', 'litros']);
  assert.deepEqual(Array.from(re.exec('0,08 m³')).slice(1), ['0,08', 'm³']);
  assert.equal(re.exec('150'), null);
  assert.equal(re.exec('duas câmaras'), null);
  assert.match(html, /Ano de fabricação e volume vêm do cadastro do equipamento/, 'manual do módulo atualizado');
});

test('servidor e documento: ano do cadastro quando o laudo não tem; localização com unidade e setor', () => {
  const main = ler('SGO_NR13_Main.js');
  assert.match(main, /anoFabricacao: dados\.ANO_FABRICACAO \|\| SGO_UTILS\.safe\(equipamento\.ANO_FABRICACAO\)/);
  assert.match(main, /localizacao: \[SGO_UTILS\.safe\(unidade\.NOME_UNIDADE\), SGO_UTILS\.safe\(equipamento\.SETOR\)\]\.filter\(Boolean\)\.join\(' — '\)/);
  assert.match(ler('SGO_NR13_Documento.js'), /\['Localização', vaso\.localizacao \|\| vaso\.setor \|\| '—'\]/);
  assert.match(ler('SGO_Ajuda_Qualificacao.js'), /Ano de fabricação e volume já vêm do cadastro do equipamento/);
});
