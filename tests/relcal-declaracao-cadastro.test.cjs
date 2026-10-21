// Relatório de calibração, Declaração de execução e Relatório de qualificação QI/QO/QD ligados ao cadastro (21/10/2026):
// "Buscar no cadastro" (cliente, unidade, equipamento) preenche cliente, CNPJ, endereço, TAG, modelo e localização só
// quando vazios ou postos automaticamente (a leitura do certificado pela IA continua, mas o cadastro tem prioridade);
// o que foi digitado não muda; a marca não vem do cadastro; o nº de série vai no envio e sai no documento. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./_modelo_oficial_ambiente.cjs');
const gas = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8').replace(/\r\n/g, '\n');

test('servidor: busca no cadastro lista todos os tipos e a identificação traz o modelo (sem fabricante)', () => {
  const env = M.criarAmbiente();
  const f = env.fn('SGO_QEQ_apiBuscaCadastro_');
  const cli = JSON.parse(JSON.stringify(f('apiPesquisarClientes', { termo: '' }, 'tec')));
  assert.equal(cli.ok, true);
  assert.ok(cli.items.some(c => c.id === 'cli1'));
  const eqs = JSON.parse(JSON.stringify(f('apiListarEquipamentos', { clienteId: 'cli1', unidadeId: 'uni1' }, 'tec')));
  assert.ok(eqs.items.length >= 1);
  assert.ok(eqs.items.every(e => e.compativel === true), 'sem filtro de tipo: nada marcado como "outro tipo"');
  const id = JSON.parse(JSON.stringify(f('apiIdentificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' }, 'tec')));
  assert.equal(id.ok, true);
  assert.equal(id.tipoCompativel, true);
  assert.equal(id.identificacao.tag, 'AUT-TESTE-01');
  assert.equal(id.identificacao.numeroSerie, 'SN-TESTE-0001');
  assert.ok('modelo' in id.identificacao);
  assert.ok(!('fabricante' in id.identificacao) && !('_nomesProibidos' in id.identificacao));
  assert.throws(() => f('apiApagarTudo', {}, 'tec'), /Operação desconhecida/);
  // Os roteadores do RelCal e da Declaração (declaração e QI/QO/QD) aceitam as rotas.
  for (const arq of ['SGO_RelCal_Main.js', 'SGO_DeclaracaoExec_Main.js']) {
    assert.match(ler(arq), /if\(typeof SGO_QEQ_rotasBuscaCadastro_==="function"\)\{var rotasCad=SGO_QEQ_rotasBuscaCadastro_\(\);Object\.keys\(rotasCad\)\.forEach\(function\(k\)\{allow\[k\]=rotasCad\[k\]\}\)\}/, arq);
  }
  const rotas = env.fn('SGO_QEQ_rotasBuscaCadastro_')();
  assert.deepEqual(Object.keys(rotas).sort(), ['apiIdentificacao', 'apiListarEquipamentos', 'apiListarUnidades', 'apiPesquisarClientes', 'apiPreencherCadastro', 'apiSugestoesCadastro']);
});

test('documentos: nº de série do cadastro no relatório de calibração e no texto da declaração, só quando informado', () => {
  const s = { Session: gas.criarSession(), Utilities: gas.criarUtilities() };
  vm.createContext(s);
  for (const f of ['SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_RelCal_Config.js', 'SGO_RelCal_IA.js', 'SGO_RelCal_Documento.js']) vm.runInContext(ler(f), s);
  const base = { instrumentoLabel: 'Termômetro', numeroDocumento: '1', dataEmissao: '08/10/2026', tag: 'TERM-T1', textos: { introducao: 'a', resultadosExplicados: 'b', conclusao: 'c' }, certificados: [], fotos: [] };
  assert.match(s.RelCalDoc_montarDocumentoHtml_(Object.assign({ numeroSerie: 'SN-T-77' }, base)), /Nº de série<\/th><td>SN-T-77/);
  assert.doesNotMatch(s.RelCalDoc_montarDocumentoHtml_(base), /Nº de série/);
  assert.match(ler('SGO_RelCal_Main.js'), /numeroSerie:String\(payload\.numeroSerie\|\|""\)\.trim\(\)\.slice\(0,80\)/);
  const main = ler('SGO_DeclaracaoExec_Main.js');
  assert.equal(main.split('numeroSerie:String(payload.numeroSerie||"").trim().slice(0,80)').length - 1, 2, 'declaração e QI/QO/QD');
  assert.equal(main.split('tag:dados.tag,numeroSerie:dados.numeroSerie,').length - 1, 2);
  const d = {}; vm.createContext(d); vm.runInContext(main, d);
  assert.equal(d.DeclExec_identificacao_({ equipamentoLabel: 'Autoclave', tag: 'AC-1', numeroSerie: 'SN-9', modelo: 'M' }), 'Autoclave, TAG AC-1, nº de série SN-9, M');
  assert.equal(d.DeclExec_identificacao_({ equipamentoLabel: 'Autoclave', tag: 'AC-1' }), 'Autoclave, TAG AC-1');
});

// Componente comum (JS_QualifVinculo.html) com um documento mínimo.
function componente(campos) {
  const els = {};
  Object.keys(campos).forEach(id => {
    const a = {};
    els[id] = { id, value: campos[id], getAttribute: k => (k in a ? a[k] : null), setAttribute: (k, v) => { a[k] = String(v); } };
  });
  const c = { document: { getElementById: id => els[id] || null }, console };
  vm.createContext(c);
  const html = ler('JS_QualifVinculo.html');
  vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'), c);
  return { Q: c.SGO_QVinc, els };
}

test('preenchimento: vazio recebe; digitado não muda; valor da leitura do certificado cede ao cadastro', () => {
  const { Q, els } = componente({ tag: '', modelo: 'DIGITADO', cliente: 'Da IA' });
  els.cliente.setAttribute('data-auto', 'Da IA'); // como a leitura do certificado marca o que preencheu
  assert.equal(Q.preencherAuto('tag', 'AC-1', true), true);
  assert.equal(els.tag.value, 'AC-1');
  assert.equal(Q.preencherAuto('modelo', 'DO CADASTRO', true), false);
  assert.equal(els.modelo.value, 'DIGITADO');
  assert.equal(Q.preencherAuto('cliente', 'Cliente do cadastro', true), true, 'cadastro tem prioridade sobre a IA');
  assert.equal(els.cliente.value, 'Cliente do cadastro');
  // Sem forçar (como a leitura do certificado): não troca o que já está preenchido.
  assert.equal(Q.preencherAuto('cliente', 'Outro da IA', false), false);
  assert.equal(Q.preencherAuto('tag', '', true), false, 'valor vazio não apaga');
  // Envio: série e ligação ao cadastro só enquanto a TAG da tela for a do equipamento escolhido.
  const busca = { ident: () => ({ tag: 'AC-1', numeroSerie: 'SN-9', clienteId: 'c', unidadeId: 'u', equipamentoId: 'e' }) };
  assert.equal(Q.dadosDoCadastro(busca, 'ac-1').numeroSerie, 'SN-9');
  assert.deepEqual(JSON.parse(JSON.stringify(Q.dadosDoCadastro(busca, 'OUTRA'))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(Q.dadosDoCadastro(busca, ''))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(Q.dadosDoCadastro(null, 'AC-1'))), {});
});

function decodificado(arq, getter) {
  const c = { HtmlService: { createHtmlOutputFromFile: () => ({ getContent: () => '' }) } };
  vm.createContext(c);
  vm.runInContext(ler(arq), c);
  assert.equal(typeof c[getter], 'function', getter + ' continua no arquivo');
  const js = [...c[getter]().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.doesNotThrow(() => new vm.Script(js), arq);
  return js;
}

test('telas: quadro "Buscar no cadastro" no RelCal, na Declaração e no QI/QO/QD, sem marca e sem travar campos', () => {
  for (const [arq, getter, px, despacho, payloadFn] of [
    ['SGO_RelCal_ConteudoModulo.js', 'RelCal_obterConteudoModulo', 'tplRelCal', 'RelCal_apiDispatch', 'tplRelCal_montarPayload_'],
    ['SGO_DeclaracaoExec_ConteudoModulo.js', 'DeclExec_obterConteudoModulo', 'tplDeclExec', 'DeclExec_apiDispatch', 'tplDeclExec_montarPayloadBase'],
    ['SGO_DeclaracaoExecQIQO_ConteudoModulo.js', 'DeclExecQIQO_obterConteudoModulo', 'tplDeclExecQIQO', 'DeclExec_apiDispatch', 'tplDeclExecQIQO_montarPayloadBaseQIQO_']]) {
    const js = decodificado(arq, getter);
    assert.ok(js.includes('SGO_QVinc.montarBusca(primeiro, { prefixo: "' + px + 'Cad", despacho: "' + despacho + '"') || js.includes("SGO_QVinc.montarBusca(primeiro, { prefixo: '" + px + "Cad', despacho: '" + despacho + "'"), arq);
    assert.ok(new RegExp(px + '_inicializar\\(\\);\\s+' + px + '_montarBuscaCadastro_\\(\\);').test(js), arq + ': monta ao abrir a tela');
    assert.ok(new RegExp('function ' + payloadFn + '\\(\\) \\{\\s+return Object\\.assign\\(' + px + '_dadosCadastro_\\(\\), \\{').test(js), arq + ': série e ids no envio');
    const bloco = js.slice(js.indexOf('function ' + px + '_montarBuscaCadastro_'), js.indexOf('function ' + px + '_dadosCadastro_'));
    assert.doesNotMatch(bloco, /marca/i, arq + ': a marca não vem do cadastro');
  }
  const rc = decodificado('SGO_RelCal_ConteudoModulo.js', 'RelCal_obterConteudoModulo');
  assert.match(rc, /if \(el && valor && !el\.value\) \{ el\.value = valor; el\.setAttribute\("data-auto", valor\); \}/, 'leitura do certificado marca o automático');
  assert.match(rc, /tplRelCal_montarBuscaCadastro_\(\);\s+tplRelCal_writeLog\('Tela limpa automaticamente/, 'próximo relatório recomeça o quadro');
  // O componente não trava os campos de digitação livre destas telas (camposCadastro vazio).
  assert.match(ler('JS_QualifVinculo.html'), /prefixo: px, camposCadastro: \[\], chamar: chamar,/);
});

test('ajuda e manuais das três telas explicam a busca no cadastro', () => {
  for (const [arq, getter] of [['SGO_RelCal_ConteudoModulo.js', 'RelCal_obterConteudoModulo'], ['SGO_DeclaracaoExec_ConteudoModulo.js', 'DeclExec_obterConteudoModulo'], ['SGO_DeclaracaoExecQIQO_ConteudoModulo.js', 'DeclExecQIQO_obterConteudoModulo']]) {
    assert.match(decodificado(arq, getter), /<li><strong>Buscar no cadastro \(opcional\):<\/strong> no quadro acima da Seção 1/, arq + ': manual do módulo');
  }
  for (const f of ['SGO_Ajuda_Calibracao.js', 'SGO_Ajuda_Documentos.js', 'SGO_Ajuda_Qualificacao.js']) assert.match(ler(f), /Opcional: no quadro \\"Buscar no cadastro\\"/, f);
  for (const m of ['MANUAL_MODULO_RELATORIO_CALIBRACAO.md', 'MANUAL_MODULO_DECLARACAO_EXECUCAO.md', 'MANUAL_MODULO_RELATORIO_QUALIFICACAO_QIQOQD.md']) {
    assert.match(fs.readFileSync(path.resolve(__dirname, '../docs', m), 'utf8'), /## O que mudou em 21\/10\/2026 \(busca no cadastro\)/, m);
  }
});
