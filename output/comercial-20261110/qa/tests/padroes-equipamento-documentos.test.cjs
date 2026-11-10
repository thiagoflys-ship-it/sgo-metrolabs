// Pedido do dono (22/10/2026): (A) todo gerador traz do cadastro TODA a identificação do equipamento (inclusive fabricante
// e modelo) e o documento não sai com campo em branco quando o cadastro tem o dado; (B) o operador marca quantos padrões de
// referência usou (1, 20 ou mais) e o documento traz todos, com o que o cadastro de padrões tem sobre cada um, conferindo a
// validade de cada um na data do ensaio. Rascunhos antigos com um padrão só continuam iguais. Só dados de teste (fictícios).
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
const SAIDA = process.env.SGO_SALVAR_DOCS || '';
function salvar(nome, html) { if (SAIDA) { fs.mkdirSync(SAIDA, { recursive: true }); fs.writeFileSync(path.join(SAIDA, nome), html); } }

/** Fonte de uma função de um arquivo (para devolver ao ambiente a versão real que outro teste simula). */
function fonteFuncao(arq, nome) {
  const s = ler(arq), i = s.indexOf('function ' + nome + '(');
  let n = 0, j = s.indexOf('{', i);
  for (; j < s.length; j++) { if (s[j] === '{') n++; else if (s[j] === '}' && --n === 0) break; }
  return s.slice(i, j + 1);
}

/** n padrões fictícios: cadastro (CAD_PADROES) + controle documental (fabricante, modelo, série, laboratório, calibração). */
function padroes(n, o) {
  o = o || {};
  const cad = [], ctl = [];
  for (let k = 1; k <= n; k++) {
    const tag = 'PAD-T' + String(k).padStart(2, '0');
    cad.push({ ID: 'p' + k, TAG: tag, DESCRICAO: 'Registrador de teste ' + k + ' — termopar tipo T, -50 a 150 °C', INCERTEZA_U95: k === 1 ? 0.006 : 0.25, FATOR_K: 2, VEFF: 0,
      CERTIFICADO_NUMERO: 'CERT-T-' + (1000 + k), VALIDADE: (o.vencidos || []).indexOf(k) >= 0 ? '01/01/2026' : '31/12/2027', STATUS: 'ATIVO' });
    ctl.push({ ID: 'p' + k, DADOS_JSON: JSON.stringify({ MARCA: 'FABRICANTE FICTICIO ' + k, MODELO: 'MOD-F' + k, SERIE: 'SER-' + k, LABORATORIO: 'Laboratório Fictício de Calibração ' + k,
      DATA_CALIBRACAO: '15/01/2026', RASTREABILIDADE: 'Rastreável a padrões nacionais (teste)', RESOLUCAO: '0,01 °C', UNIDADE: '°C' }) });
  }
  return { cad, ctl };
}

function ctxDocA4(n, o) {
  const p = padroes(n, o);
  const c = { Session: gas.criarSession(), Utilities: gas.criarUtilities(), console };
  vm.createContext(c);
  vm.runInContext('var __ABAS = ' + JSON.stringify({ CAD_PADROES: p.cad, PADROES_CONTROLE_DOCUMENTAL: p.ctl }) + ';' +
    'var SGO_CFG = { SHEETS: { CAD_PADROES: "CAD_PADROES" } };' +
    'var SGO_DATA = { getAll: function (n) { return (__ABAS[n] || []).map(function (x) { return Object.assign({}, x); }); } };', c);
  vm.runInContext(ler('SGO_DocA4.js'), c);
  return c;
}
const tags = n => Array.from({ length: n }, (_, k) => 'PAD-T' + String(k + 1).padStart(2, '0'));

test('padrões: 1 e 20 marcados saem todos no documento, com tudo o que o cadastro tem sobre cada um', () => {
  for (const n of [1, 20]) {
    const c = ctxDocA4(n);
    const reg = c.SGO_DocA4_registradores_(tags(n).join(', '), '10/10/2026');
    assert.equal(reg.itens.length, n);
    assert.ok(reg.itens.every(it => it.encontrado && it.conforme === true), 'todos válidos na data do ensaio');
    const html = c.SGO_DocA4_tabelaRegistradores_(reg);
    salvar('padroes_' + n + '.html', '<!doctype html><meta charset="utf-8"><style>' + c.SGO_DocA4_estilos_({}) + '</style>' + html);
    assert.equal((html.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g) || []).length, n, 'uma linha por padrão');
    for (let k = 1; k <= n; k++) {
      ['PAD-T' + String(k).padStart(2, '0'), 'FABRICANTE FICTICIO ' + k + ' · MOD-F' + k, 'Nº de série SER-' + k, 'CERT-T-' + (1000 + k), 'Laboratório Fictício de Calibração ' + k]
        .forEach(t => assert.ok(html.includes(t), 'falta ' + t));
    }
    assert.match(html, /Calibrado em 15\/01\/2026<br>Válido até 31\/12\/2027/);
    assert.match(html, /0,006 °C/, 'incerteza em pt-BR, com as casas que o valor pede');
    if (n > 1) assert.match(html, /0,25 °C/);
    assert.match(html, /<thead>/, 'cabeçalho repetido em cada página');
    assert.ok(ler('SGO_DocA4.js').includes("'table.t tr{break-inside:avoid;page-break-inside:avoid}'"), 'linha não se parte entre páginas (CSS do documento A4)');
    assert.match(html, n === 1 ? /Padrão de referência informado no ensaio/ : /20 padrões de referência informados no ensaio/);
    assert.doesNotMatch(html, /undefined|NaN|null/);
  }
});

test('padrões: validade conferida em cada um na data do ensaio; um vencido entre 20 aparece e trava', () => {
  const c = ctxDocA4(20, { vencidos: [7] });
  const reg = c.SGO_DocA4_registradores_(tags(20).join(', '), '10/10/2026');
  const venc = reg.itens.filter(it => it.conforme === false);
  assert.deepEqual(JSON.parse(JSON.stringify(venc.map(it => it.tag))), ['PAD-T07']);
  assert.match(reg.observacoes.join(' '), /PAD-T07 \(CERT-T-1007\) estava vencido na data do ensaio/);
  assert.match(c.SGO_DocA4_tabelaRegistradores_(reg), /<span class="nok-txt">Vencido na data do ensaio<\/span>/);
  // Telas de digitação livre (calibração, declaração, QI/QO/QD): padrão vencido, fora do cadastro ou sem validade é recusado com o que fazer.
  assert.throws(() => c.SGO_DocA4_exigirPadroesValidos_('PAD-T01, PAD-T07', '10/10/2026', 'data do atendimento'), /PAD-T07 estava com o certificado vencido na data do atendimento.*Cadastros › Padrões de referência/);
  assert.throws(() => c.SGO_DocA4_exigirPadroesValidos_('PAD-X99', '10/10/2026'), /PAD-X99 não está em Cadastros › Padrões de referência/);
  assert.equal(c.SGO_DocA4_exigirPadroesValidos_(' PAD-T01, PAD-T02 ', '10/10/2026'), 'PAD-T01, PAD-T02');
  assert.equal(c.SGO_DocA4_exigirPadroesValidos_('', '10/10/2026'), '', 'nada marcado: nada exigido (documentos antigos)');
  // Com o certificado renovado depois, o mesmo padrão volta a valer.
  assert.equal(c.SGO_DocA4_registradores_('PAD-T07', '31/12/2025').itens[0].conforme, true);
});

test('padrões: resumo antigo (só TAG e certificado) é completado pelo mesmo certificado; outro certificado não recebe laboratório', () => {
  const c = ctxDocA4(2);
  const r = JSON.parse(JSON.stringify(c.SGO_DocA4_completarPadroes_([{ tag: 'PAD-T01', certificado: 'CERT-T-1001', validade: '31/12/2027' }, { tag: 'PAD-T02', certificado: 'CERT-ANTIGO', validade: '01/01/2025' }])));
  assert.equal(r[0].laboratorio, 'Laboratório Fictício de Calibração 1');
  assert.equal(r[0].marca, 'FABRICANTE FICTICIO 1');
  assert.equal(r[1].laboratorio, undefined, 'calibração antiga não leva o laboratório do certificado atual');
  assert.equal(r[1].marca, 'FABRICANTE FICTICIO 2', 'fabricante e série são do instrumento, valem para qualquer certificado');
});

test('identificação do equipamento: helper comum só traz linha preenchida, inclusive fabricante e modelo', () => {
  const c = ctxDocA4(0);
  assert.deepEqual(JSON.parse(JSON.stringify(c.SGO_DocA4_linhasEquipamento_({ tipo: 'Autoclave', fabricante: 'MARCAFICTICIA', modelo: 'MODELOXYZ', numeroSerie: 'SN-1', tag: 'T-1', patrimonio: '', capacidade: '150 L' }))),
    [['Tipo', 'Autoclave'], ['Fabricante (marca)', 'MARCAFICTICIA'], ['Modelo', 'MODELOXYZ'], ['Número de série', 'SN-1'], ['TAG', 'T-1'], ['Capacidade ou volume', '150 L']]);
});

function ambienteComPadroes(n, o) {
  const env = M.criarAmbiente();
  const p = padroes(n, o);
  env.run(fonteFuncao('SGO_DocA4.js', 'SGO_DocA4_registradores_'));
  env.run('__ABAS.CAD_PADROES = ' + JSON.stringify(p.cad) + '; __ABAS.PADROES_CONTROLE_DOCUMENTAL = ' + JSON.stringify(p.ctl) + ';');
  return env;
}

test('autoclave (Bento): fabricante e modelo do cadastro saem no relatório de ensaio, na planilha e no relatório de qualificação, com 20 padrões', () => {
  const env = ambienteComPadroes(20);
  env.run('SGO_DATA.update = function (n, id, o) { var l = (__ABAS[n] || []).filter(function (x) { return String(x.ID) === String(id); })[0]; if (!l) return false; Object.assign(l, o); return true; };');
  env.run('SGO_DATA.update("CAD_EQUIPAMENTOS", "eq1", { PATRIMONIO: "PAT-T-9", CAPACIDADE: "300 L", NUM_CAMARAS: "2", ANO_FABRICACAO: "2018" });');
  // A tela recebe a identificação completa (o quadro "Cliente e equipamento" preenche e trava fabricante e modelo).
  const ident = env.oficial('tec', 'apiIdentificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(ident.identificacao.fabricante, 'MARCAFICTICIA');
  assert.equal(ident.identificacao.modelo, 'MODELOXYZ');
  assert.ok(!('_nomesProibidos' in ident.identificacao));
  const linhas = M.A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const p = M.payloadCiclo({ textoColado: M.A.csvCompleto(linhas), certDataLogger: tags(20).join(', '), certNumero: 'AUT-T-2001', ensaio: 'QO (Vazio)', marca: '', modelo: '' });
  const D = env.fn('AutoRel_apiDispatch');
  const r = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: p });
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  assert.equal(r.contexto.identificacao.marca, 'MARCAFICTICIA', 'a tela mandou vazio, o cadastro preenche');
  assert.equal(r.contexto.registradores.itens.length, 20);
  const envio = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }) });
  const prev = JSON.parse(JSON.stringify(D({ sessionId: 'rt', fn: 'apiPreverAprovacao', payload: { id: envio.id } })));
  salvar('autoclave_ensaio_20_padroes.html', prev.html);
  assert.match(prev.html, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/);
  assert.match(prev.html, /Modelo<\/th><td>MODELOXYZ/);
  assert.match(prev.html, /Patrimônio<\/th><td>PAT-T-9/);
  assert.match(prev.html, /Capacidade ou volume<\/th><td>300 L/);
  tags(20).forEach(t => assert.ok(prev.html.includes('<b>' + t + '</b>'), 'falta o padrão ' + t));
  assert.match(prev.html, /Laboratório Fictício de Calibração 20/);
  D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: envio.id, confirmacaoRevisao: true } });
  // Relatório de qualificação: fabricante e modelo e todos os padrões dos ensaios.
  const base = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, ciclos: [envio.id] };
  const of = env.oficial('tec', 'apiPrevia', base);
  assert.equal(of.ok, true, of.erro);
  salvar('autoclave_qualificacao_20_padroes.html', of.html);
  assert.match(of.html, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/);
  assert.match(of.html, /Modelo<\/th><td>MODELOXYZ/);
  assert.doesNotMatch(of.html, /não registra marca nem modelo/);
  tags(20).forEach(t => assert.ok(of.html.includes('<b>' + t + '</b>'), 'qualificação sem o padrão ' + t));
});

test('autoclave: ensaio antigo com um padrão só continua gerando igual; um vencido entre 20 trava com explicação', () => {
  const env = ambienteComPadroes(20, { vencidos: [13] });
  const linhas = M.A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const D = env.fn('AutoRel_apiDispatch');
  const um = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: M.payloadCiclo({ textoColado: M.A.csvCompleto(linhas), certDataLogger: 'PAD-T01', certNumero: 'AUT-T-2002' }) });
  assert.equal(um.bloqueado, false, JSON.stringify(um.travas));
  assert.equal(um.contexto.registradores.itens.length, 1);
  const vinte = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: M.payloadCiclo({ textoColado: M.A.csvCompleto(linhas), certDataLogger: tags(20).join(', '), certNumero: 'AUT-T-2003' }) });
  assert.equal(vinte.bloqueado, true);
  assert.ok(vinte.travas.some(t => /PAD-T13/.test(JSON.stringify(t))), 'a trava diz qual padrão está vencido');
});

test('relatório de calibração, declaração e QI/QO/QD: fabricante, modelo, série e todos os padrões marcados', () => {
  const c = ctxDocA4(20);
  for (const f of ['SGO_RelTecA4.js', 'SGO_RelCal_Config.js', 'SGO_RelCal_IA.js', 'SGO_RelCal_Documento.js', 'SGO_DeclaracaoExec_Documento.js']) vm.runInContext(ler(f), c);
  const base = { instrumentoLabel: 'Termômetro', numeroDocumento: '1', dataEmissao: '08/10/2026', dataCalibracao: '08/10/2026', tag: 'TERM-T1', numeroSerie: 'SN-T-77', marca: 'MARCAFICTICIA', modelo: 'MODELOXYZ',
    textos: { introducao: 'a', resultadosExplicados: 'b', conclusao: 'c' }, certificados: [], fotos: [] };
  const rc = c.RelCalDoc_montarDocumentoHtml_(Object.assign({ padroesUsados: tags(20).join(', ') }, base));
  salvar('relcal_20_padroes.html', rc);
  assert.match(rc, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/);
  assert.match(rc, /Modelo<\/th><td>MODELOXYZ/);
  assert.match(rc, /Padrões de referência utilizados/);
  tags(20).forEach(t => assert.ok(rc.includes('<b>' + t + '</b>'), t));
  assert.doesNotMatch(c.RelCalDoc_montarDocumentoHtml_(base), /Padrões de referência utilizados/, 'documento antigo, sem padrões marcados, continua igual');
  const id = c.DeclExecA4_identificacao_({ equipamentoLabel: 'Autoclave', tag: 'AC-1', numeroSerie: 'SN-9', marca: 'MARCAFICTICIA', modelo: 'MODELOXYZ', padroesUsados: 'PAD-T01', padroesDataRef: '10/10/2026' });
  assert.match(id, /Nº de série<\/th><td>SN-9/);
  assert.match(id, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/);
  assert.match(id, /<b>PAD-T01<\/b>/);
  assert.match(id, /Padrão de referência usado no serviço/);
  // Servidor: o padrão vencido na data do serviço é recusado antes de gerar (calibração e declarações).
  assert.match(ler('SGO_RelCal_Main.js'), /padroesUsados:\(typeof SGO_DocA4_exigirPadroesValidos_==="function"\?SGO_DocA4_exigirPadroesValidos_\(payload\.padroesUsados,payload\.dataCalibracao,"data da calibração"\)/);
  assert.equal(ler('SGO_DeclaracaoExec_Main.js').split('SGO_DocA4_exigirPadroesValidos_(payload.padroesUsados,(payload.dataFim||payload.dataInicio),"data do atendimento")').length - 1, 2, 'declaração e QI/QO/QD');
});

test('certificado de calibração: a tabela de padrões traz fabricante, série, laboratório, calibração e incerteza de cada um', () => {
  const c = ctxDocA4(3);
  vm.runInContext(ler('SGO_CertCal_Documento.js'), c);
  const fonte = ler('SGO_CertCal_Documento.js');
  assert.match(fonte, /<th>Fabricante, modelo e nº de série<\/th><th>Certificado do padrão e laboratório<\/th><th>Calibração e validade<\/th><th>Incerteza do certificado \(U\)<\/th>/);
  const completos = c.SGO_DocA4_completarPadroes_([1, 2, 3].map(k => ({ tag: 'PAD-T0' + k, certificado: 'CERT-T-' + (1000 + k) })));
  assert.equal(completos.filter(p => p.laboratorio && p.serie && p.dataCalibracao).length, 3);
});

test('tela: escolha de vários padrões com busca, ligada sozinha ao campo do registrador e às telas de digitação livre', () => {
  const comp = ler('JS_QualifVinculo.html');
  assert.match(comp, /function ligarPadroes\(input, opcoes\)/);
  assert.match(comp, /querySelectorAll\('input\[id\$="_certDataLogger"\]'\)/);
  assert.match(comp, /\.padroesParaSelecao\(SGO_getSessionId\(\)\)/);
  assert.match(comp, /Buscar por TAG, descrição, fabricante ou certificado/);
  assert.match(comp, /Padrões de referência utilizados \(opcional\)/);
  assert.doesNotMatch(comp, /uso interno/, 'fabricante e modelo não são mais "uso interno"');
  // O componente continua carregando num documento mínimo (sem querySelectorAll).
  const ctx = { document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  vm.runInContext([...comp.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'), ctx);
  assert.equal(typeof ctx.SGO_QVinc.ligarPadroes, 'function');
  // O include do componente continua na página principal (lista de liberados do include).
  assert.match(ler('Index.html'), /include\('JS_QualifVinculo'\)/);
});

test('servidor: lista de padrões para a tela (ativos, com fabricante, certificado e situação de hoje); perfil Cliente não acessa', () => {
  const env = ambienteComPadroes(3, { vencidos: [2] });
  env.run('__ABAS.CAD_PADROES.push({ ID: "p9", TAG: "PAD-INATIVO", DESCRICAO: "x", CERTIFICADO_NUMERO: "C", VALIDADE: "31/12/2027", STATUS: "INATIVO" });');
  const r = env.chamar('padroesParaSelecao', 'tec');
  assert.equal(r.ok, true, r.erro);
  assert.deepEqual(r.itens.map(i => i.tag), ['PAD-T01', 'PAD-T02', 'PAD-T03']);
  assert.equal(r.itens[1].situacao, 'VENCIDO');
  assert.equal(r.itens[0].marca, 'FABRICANTE FICTICIO 1');
  assert.equal(r.itens[0].laboratorio, 'Laboratório Fictício de Calibração 1');
  const cli = env.chamar('padroesParaSelecao', 'cli');
  assert.equal(cli.ok, false);
  assert.match(cli.erro, /Acesso negado/);
});

test('cadastro: fabricante e modelo vazios podem ser completados pela tela do ensaio (só o vazio)', () => {
  const env = M.criarAmbiente();
  env.run('SGO_DATA.update = function (n, id, o) { var l = (__ABAS[n] || []).filter(function (x) { return String(x.ID) === String(id); })[0]; if (!l) return false; Object.assign(l, o); return true; };');
  env.run('SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq9", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "AUTOCLAVE", SERIE: "SN-9", TAG: "AUT-T-9", SETOR: "CME", STATUS: "ATIVO" });');
  const V = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq9' };
  const id = env.oficial('tec', 'apiIdentificacao', V).identificacao;
  assert.deepEqual(id.vazios.filter(v => ['FABRICANTE', 'MODELO'].includes(v.campo)).map(v => v.campo), ['FABRICANTE', 'MODELO']);
  const g = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { FABRICANTE: 'FAB TESTE', MODELO: 'M-1' }, origem: 'teste' }, V));
  assert.equal(g.gravados, 2);
  assert.equal(g.identificacao.fabricante, 'FAB TESTE');
  const g2 = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { FABRICANTE: 'OUTRO' }, origem: 'teste' }, V));
  assert.equal(g2.gravados, 0, 'valor já gravado não é trocado pela tela');
  assert.match(g2.mensagem, /Cadastros › Equipamentos › Editar/);
});
