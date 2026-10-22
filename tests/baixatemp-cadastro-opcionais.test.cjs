// Esterilização a baixa temperatura (21/10/2026): patrimônio e capacidade preenchíveis na aba Identificação quando estão
// vazios no cadastro do equipamento ("Completar no cadastro", opcional), gravando no cadastro só o vazio, e o relatório
// mostra os dois quando preenchidos. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('./_baixatemp_ambiente.cjs');

const ler = n => fs.readFileSync(path.join(B.BASE, n), 'utf8').replace(/\r\n/g, '\n');

test('patrimônio e capacidade: lista do equipamento traz, preencher grava só o vazio, valor gravado não muda', () => {
  const bt = B.criarAmbiente({ extra: fs.readFileSync(path.join(B.BASE, 'SGO_QualifEquipamento.js'), 'utf8') });
  bt.run('SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eqC", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "ESTERILIZADOR BAIXA TEMPERATURA", TAG: "EST-T03", SERIE: "SN-T3", SETOR: "CME", PATRIMONIO: "", CAPACIDADE: "100 L", STATUS: "ATIVO" });');
  const D = p => JSON.parse(JSON.stringify(bt.ctx.BaixaTemp_apiDispatch(p)));
  const lista = D({ sessionId: 'tec', fn: 'apiListarEquipamentos', payload: { clienteId: 'cli1', unidadeId: 'uni1' } }).items.filter(q => q.id === 'eqC')[0];
  assert.equal(lista.patrimonio, '');
  assert.equal(lista.capacidade, '100 L');
  const r = D({ sessionId: 'tec', fn: 'apiPreencherCadastro', payload: { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eqC', campos: { PATRIMONIO: 'pat-t-3', CAPACIDADE: '999 L' } } });
  assert.equal(r.ok, true);
  assert.equal(r.gravados, 1, 'só o patrimônio estava vazio');
  const e = bt.ctx.SGO_DATA.getById('CAD_EQUIPAMENTOS', 'eqC');
  assert.equal(e.PATRIMONIO, 'PAT-T-3');
  assert.equal(e.CAPACIDADE, '100 L', 'capacidade já gravada não muda');
  assert.equal(r.identificacao.patrimonio, 'PAT-T-3');
});

test('tela: "Completar no cadastro" com patrimônio e capacidade; a tela guarda o que foi gravado', () => {
  const tela = ler('SGO_BaixaTemp_Tela.js');
  // 22/10/2026: fabricante e modelo também entram nos opcionais (saem no relatório quando preenchidos).
  assert.match(tela, /var opcionais = \[\['FABRICANTE', 'Fabricante \(marca\)', q\.fabricante, [^\]]*\], \['MODELO', 'Modelo', q\.modelo, [^\]]*\], \['PATRIMONIO', 'Patrimônio', q\.patrimonio, [^\]]*\], \['CAPACIDADE', 'Capacidade ou volume', q\.capacidade, [^\]]*\]\]/);
  assert.match(tela, /'Completar no cadastro do equipamento \(opcional\): '/);
  assert.match(tela, /faltam\.concat\(opcionais\)\.map/);
  assert.match(tela, /q\.patrimonio = d\.patrimonio \|\| q\.patrimonio; q\.capacidade = d\.capacidade \|\| q\.capacidade;/);
  assert.match(tela, /if \(d\.patrimonio\) i\.patrimonio = d\.patrimonio;/);
  // O conteúdo vai para o navegador como script: continua com sintaxe válida.
  const c = {};
  require('node:vm').createContext(c);
  require('node:vm').runInContext(ler('SGO_BaixaTemp_Tela.js'), c);
  const html = c.BaixaTemp_obterConteudoModulo();
  assert.doesNotThrow(() => new (require('node:vm').Script)(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))));
  assert.match(ler('SGO_BaixaTemp_Documento.js'), /\['Patrimônio', id\.patrimonio\]/);
  assert.match(ler('SGO_Ajuda_BaixaTemp.js'), /Completar no cadastro do equipamento \(opcional\)/);
});
