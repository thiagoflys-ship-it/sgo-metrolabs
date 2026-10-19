const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
// Session/Utilities fiéis (o documento formata datas no fuso do script).
const gas = require('./_simulacros_gas.cjs');
const s = { Session: gas.criarSession(), Utilities: gas.criarUtilities() };
vm.createContext(s);
// Moldura A4 comum (SGO_DocA4.js, SGO_RelTecA4.js: RelTecA4_revisao_, numerador, CSS), carregada junto em produção.
for (const f of ['SGO_DocA4.js', 'SGO_RelTecA4.js']) vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), s);
for (const f of ['Config', 'IA', 'Documento']) vm.runInContext(fs.readFileSync(path.join(base, `SGO_RelCal_${f}.js`), 'utf8'), s);
const markers = ['###INTRODUCAO###', '###RESULTADOS_EXPLICADOS###', '###CONCLUSAO###'];
const map = Object.fromEntries(markers.map((m, i) => [m, ['introducao','resultadosExplicados','conclusao'][i]]));
const response = markers.map((m, i) => `${m}\n${['Origem anexada','Nominal | Média | Número certificado\n1,23456 | 2 | 202600250','Decisão de uso pelo cliente'][i]}`).join('\n') + '\n###FIM###';
test('resposta truncada, duplicada, fora de ordem ou com veredito não emite relatório', () => {
 assert.equal(s.RelCalIA_extrairPorMarcadores_(response, markers, map).conclusao, 'Decisão de uso pelo cliente');
 for (const bad of [response.replace('###FIM###',''), response+'\n###FIM###', response.replace(markers[0],markers[1]), response.replace('Decisão de uso pelo cliente','Equipamento aprovado')]) assert.throws(() => s.RelCalIA_extrairPorMarcadores_(bad, markers, map));
});
test('nove instrumentos preservam origem, identidade e decisão do cliente no documento', () => {
 assert.equal(Object.keys(s.RELCAL_CFG.INSTRUMENTOS).length, 9);
 for (const instrument of Object.values(s.RELCAL_CFG.INSTRUMENTOS)) {
  const html = s.RelCalDoc_montarDocumentoHtml_({instrumentoLabel:instrument.label,numeroDocumento:'202600250',dataEmissao:'08/10/2026',tag:'QA-0108',textos:s.RelCalIA_extrairPorMarcadores_(response,markers,map),certificados:[],fotos:[]});
  assert.ok(html.includes(instrument.label)); assert.ok(html.includes('202600250')); assert.ok(html.includes('08/10/2026')); assert.ok(html.includes('<td>1,23</td>'));
  assert.ok(html.includes('não estabelece validade')); assert.ok(html.includes('não substitui os certificados originais, que prevalecem em caso de divergência')); assert.ok(!/aprova[dç]|reprova[dç]/i.test(html));
 }
 // Defeito corrigido em 19/10: em 18/10 (157d735) a frase saiu da nota para não repetir o texto padrão, e o relatório redigido
 // pela IA ficava sem dizer que o certificado prevalece. Agora aparece uma vez só, com o texto da IA ou com o texto padrão.
 const conclusaoPadrao = 'Compare com o erro admissível. Este relatório não substitui o certificado de calibração, que prevalece em caso de divergência.';
 const comPadrao = s.RelCalDoc_montarDocumentoHtml_({instrumentoLabel:'Termômetro',numeroDocumento:'1',dataEmissao:'08/10/2026',textos:{introducao:'a',resultadosExplicados:'b',conclusao:conclusaoPadrao},certificados:[],fotos:[]});
 assert.equal((comPadrao.match(/prevalece/g) || []).length, 1);
});
test('milhar brasileiro, científico e unidades formatam somente medições', () => {
 const html = s.RelCalDoc_renderizarResultados_('Referência | Indicação | Incerteza | K | Série | Data\n1.234,567 rpm | 2.3456e-3 s | 0.122 s | 2 | 202600250 | 08/10/2026');
 // Padrão A4 de 18/10 (157d735): da segunda coluna em diante as células saem com class="num" (alinhadas à direita).
 assert.ok(html.includes('<td>1234,57 rpm</td>'));
 for (const x of ['0,00 s','0,12 s','2,00','202600250','08/10/2026']) assert.ok(html.includes('<td class="num">'+x+'</td>'));
 assert.equal(s.RelCalDoc_formatarMedicao_('Não informado'),'Não informado');
 assert.equal(s.RelCalDoc_formatarMedicao_('Infinity'),'Infinity');
});
test('medições também são formatadas na prosa sem alterar identificação', () => {
 const text = 'Certificado 202600250 de 08/10/2026, TAG QA-0108: tendência -0.1234 °C; rotação 1.234,567 rpm; U 2.3456e-3 s.';
 const formatted = s.RelCalDoc_formatarProsaMedicoes_(text);
 for (const x of ['202600250','08/10/2026','QA-0108','-0,12 °C','1234,57 rpm','0,00 s.']) assert.ok(formatted.includes(x), formatted);
 assert.ok(s.RelCalDoc_paragrafosHtml_(text).includes('-0,12 °C'));
 assert.ok(s.RelCalDoc_renderizarResultados_(text).includes('-0,12 °C'));
 for (const untouched of ['Modelo 5s, TAG ABC-20rpm','Temperatura 10–20 °C','Temperatura 10-20 °C','Data 08/10/2026','Norma ISO 17025','Tempo 10 s–20 s']) assert.equal(s.RelCalDoc_formatarProsaMedicoes_(untouched), untouched);
});
test('neutralidade também bloqueia aptidão e conformidade sem impedir referência à fonte', () => {
 for (const text of ['Equipamento aprovado','Instrumento está conforme','Equipamento não conforme','Instrumento apto para uso']) assert.throws(() => s.RelCalIA_extrairPorMarcadores_(response.replace('Decisão de uso pelo cliente',text), markers, map));
 assert.equal(s.RelCalIA_temVeredito_('Dados conforme certificado de origem. Decisão de adequação pelo cliente.'),false);
 assert.equal(s.RelCalIA_temVeredito_('Não emitimos declaração de conformidade. A decisão cabe ao cliente.'),false);
});
test('análise de foto não inclui veredito recebido da IA', () => {
 const isolated = {}; vm.createContext(isolated);
 vm.runInContext(fs.readFileSync(path.join(base,'SGO_RelCal_IA.js'),'utf8'),isolated);
 isolated.RelCalIA_obterConfig_=()=>({geminiKey:'fixture',modelo:'fixture'});
 isolated.RelCalIA_obterListaModelos_=()=>['fixture'];
 isolated.UrlFetchApp={fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:'Equipamento aprovado'}]}}]})})};
 const result=isolated.RelCalIA_analisarFoto_('fixture','image/jpeg','Termômetro');
 assert.ok(!result.includes('aprovado')); assert.ok(result.includes('confira a imagem manualmente'));
});
