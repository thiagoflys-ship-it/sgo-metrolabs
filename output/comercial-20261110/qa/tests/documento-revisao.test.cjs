// Corrigir um documento já gerado e emitir a revisão (SGO_DocRevisao.js, 21/10/2026).
// Gerar → abrir para corrigir → mudar um campo → gerar a Rev. 01 (anterior preservada e marcada substituída,
// motivo exigido, mesmo número); usar como base → número novo. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_docrev_ambiente.cjs');

const DECL = ['SGO_Documento_LogoCompartilhado.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js', 'SGO_DeclaracaoExec_Config.js', 'SGO_DeclaracaoExec_Documento.js', 'SGO_DeclaracaoExec_DocumentoQIQO.js', 'SGO_DeclaracaoExec_Main.js'];
// O PDF não é gerado no teste: grava só o HTML e um PDF simbólico, com o mesmo nome.
const SEM_PDF = [
  'SGO_DocA4_pdfDeHtml_ = function () { throw new Error("sem PDF no teste"); };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); var pdf = p.createFile(n + ".pdf", "%PDF teste", "application/pdf"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), pdfNome: n + ".pdf", htmlNome: n + ".html", html: h }; };',
  'DeclExec_obterPastaCliente_ = function () { return DriveApp.getRootFolder(); };'
].join('\n');

function payloadDeclaracao(extra) {
  return Object.assign({
    cliente: 'HOSPITAL MODELO TESTE LTDA', endereco: 'Rua de Teste, 100', perfil: 'AUTOCLAVE_VAPOR', tagEquipamento: 'AUT-TESTE-01',
    marca: 'MARCAFICTICIA', modelo: 'MODELOXYZ', localizacao: 'CME', dataInicio: '20/10/2026', dataFim: '', tecnicoExecutor: 'Técnico Teste',
    localAtendimento: 'CLIENTE', metodologia: 'Verificação conforme procedimento interno de teste.', calibracoes: [], numeroDocumento: '',
    textos: { introducao: 'Introdução de teste.', metodologia: 'Metodologia de teste.', calibracoes: '', declaracaoFinal: 'Declaração final de teste.' }, fotos: []
  }, extra || {});
}

function gerarEDeclarar(env, sid, payload) {
  const disp = env.fn('DeclExec_apiDispatch');
  const m = disp({ sessionId: sid, fn: 'apiMontarDocumentoFinal', payload });
  const s = disp({ sessionId: sid, fn: 'apiSalvarDocumento', payload: { html: m.html, tipoDocumento: 'declaracao', cliente: payload.cliente, tag: payload.tagEquipamento, numeroDocumento: payload.numeroDocumento } });
  return { montagem: m, salvo: s };
}

test('núcleo: rótulo, nome do arquivo e histórico no HTML', () => {
  const env = A.criarAmbiente();
  assert.equal(env.fn('SGO_DocRev_rotulo_')(0), 'Rev. 00');
  assert.equal(env.fn('SGO_DocRev_rotulo_')(12), 'Rev. 12');
  assert.equal(env.fn('SGO_DocRev_nomeArquivo_')('Relatório X - Rev. 00', 3), 'Relatório X - Rev. 03');
  const bloco = env.fn('SGO_DocRev_injetarHtml_')('<html><body><main>conteúdo</main></body></html>', { ehRevisao: true, numero: 'N-1', rotulo: 'Rev. 01', historico: [{ rotulo: 'Rev. 00', em: '20/10/2026', motivo: 'Emissão inicial', por: 'A' }, { rotulo: 'Rev. 01', em: '21/10/2026', motivo: 'Correção da TAG informada', por: 'B' }] });
  assert.match(bloco, /Histórico de revisões — documento N-1, Rev\. 01/);
  assert.ok(bloco.indexOf('sgo-docrev') < bloco.indexOf('</main>'), 'o bloco fica dentro do documento');
  assert.equal(env.fn('SGO_DocRev_injetarHtml_')('<body>x</body>', { ehRevisao: false }), '<body>x</body>', 'emissão inicial não muda o modelo');
});

test('Declaração: gerar, abrir para corrigir, Rev. 01 com motivo, anterior preservada; usar como base sai com número novo', () => {
  const env = A.criarAmbiente({ arquivos: DECL, extra: SEM_PDF });
  // 1) Documento original (número automático)
  const p0 = payloadDeclaracao();
  p0._docRev = { modo: '', form: { tplDeclExec_tag: 'AUT-TESTE-01', tplDeclExec_metodologia: p0.metodologia } };
  const g0 = gerarEDeclarar(env, 'tec', p0);
  assert.equal(g0.salvo.ok, true);
  assert.equal(g0.salvo.revisao, 'Rev. 00');
  assert.equal(g0.salvo.avisoRevisao, '');
  assert.doesNotMatch(env.drive.arquivos[g0.salvo.htmlId].bytes.toString('utf8'), /sgo-docrev-dados/, 'o arquivo do cliente não leva a marca interna');
  const lista0 = env.api('tec', 'listar', { modulo: 'DECLARACAO_EXECUCAO' });
  assert.equal(lista0.itens.length, 1);
  const orig = lista0.itens[0];
  assert.match(orig.numero, /^DEX-/);
  assert.equal(orig.vigente, true);
  assert.equal(orig.temDados, true);

  // 2) Abrir para corrigir: volta tudo o que foi usado
  const ab = env.api('tec', 'abrir', { id: orig.id, modo: 'CORRIGIR' });
  assert.equal(ab.ok, true);
  assert.equal(ab.payload.tagEquipamento, 'AUT-TESTE-01');
  assert.equal(ab.payload.textos.declaracaoFinal, 'Declaração final de teste.');
  assert.equal(ab.form.tplDeclExec_tag, 'AUT-TESTE-01');
  assert.equal(ab.info.rotuloProxima, 'Rev. 01');
  assert.equal(ab.info.numero, orig.numero);

  // 3) Sem motivo: recusa e diz onde escrever
  const p1 = Object.assign({}, ab.payload, { tagEquipamento: 'AUT-TESTE-02', numeroDocumento: orig.numero });
  p1._docRev = { modo: 'CORRIGIR', origemId: orig.id, motivo: 'curto', form: ab.form };
  assert.throws(() => env.fn('DeclExec_apiDispatch')({ sessionId: 'tec', fn: 'apiMontarDocumentoFinal', payload: p1 }), /motivo da revisão \(ao menos 10 caracteres\)/);

  // 4) Com motivo: Rev. 01, mesmo número, histórico no documento
  p1._docRev.motivo = 'Correção da TAG do equipamento informada errada';
  const g1 = gerarEDeclarar(env, 'tec', p1);
  assert.equal(g1.salvo.revisao, 'Rev. 01');
  const html1 = env.drive.arquivos[g1.salvo.htmlId].bytes.toString('utf8');
  assert.match(html1, /Histórico de revisões/);
  assert.match(html1, /Correção da TAG do equipamento informada errada/);
  assert.match(html1, /AUT-TESTE-02/);
  assert.match(env.drive.arquivos[g1.salvo.fileId].nome, new RegExp(orig.numero + ' Rev\\. 01'), 'nome do arquivo com a revisão');
  const lista1 = env.api('tec', 'listar', { modulo: 'DECLARACAO_EXECUCAO' });
  assert.equal(lista1.itens.length, 2, 'a revisão anterior continua registrada');
  const r0 = lista1.itens.filter(i => i.revisao === 0)[0], r1 = lista1.itens.filter(i => i.revisao === 1)[0];
  assert.equal(r0.numero, r1.numero);
  assert.equal(r0.vigente, false);
  assert.equal(r0.substituidaPor, 'Rev. 01');
  assert.equal(r1.vigente, true);
  assert.equal(r1.motivo, 'Correção da TAG do equipamento informada errada');
  assert.ok(env.drive.arquivos[g0.salvo.fileId], 'o PDF anterior não foi apagado');
  assert.match(env.drive.arquivos[g0.salvo.fileId].descricao || '', /Substituído pela Rev\. 01/);
  assert.match(env.drive.arquivos[g0.salvo.htmlId].bytes.toString('utf8'), /AUT-TESTE-01/, 'o conteúdo anterior não foi sobrescrito');

  // 5) Número digitado de documento existente sem pedir correção: recusa e explica o caminho
  const pDup = payloadDeclaracao({ numeroDocumento: orig.numero });
  assert.throws(() => env.fn('DeclExec_apiDispatch')({ sessionId: 'tec', fn: 'apiMontarDocumentoFinal', payload: pDup }), /Abrir para corrigir/);

  // 6) Usar como base: documento novo, número novo, origem intacta
  const ab2 = env.api('tec', 'abrir', { id: r1.id, modo: 'BASE' });
  assert.equal(ab2.modo, 'BASE');
  const p2 = Object.assign({}, ab2.payload, { numeroDocumento: '', dataInicio: '20/10/2027' });
  p2._docRev = { modo: 'BASE', origemId: r1.id, form: ab2.form };
  const g2 = gerarEDeclarar(env, 'tec', p2);
  assert.equal(g2.salvo.revisao, 'Rev. 00');
  const lista2 = env.api('tec', 'listar', { modulo: 'DECLARACAO_EXECUCAO' });
  assert.equal(lista2.itens.length, 3);
  const novo = lista2.itens.filter(i => i.id !== r0.id && i.id !== r1.id)[0];
  assert.notEqual(novo.numero, orig.numero);
  assert.equal(novo.vigente, true);
  assert.equal(lista2.itens.filter(i => i.id === r1.id)[0].vigente, true, 'a origem continua vigente');

  // 7) Cliente não abre nem lista
  assert.equal(env.api('cli', 'listar', { modulo: 'DECLARACAO_EXECUCAO' }).ok, false);
});

test('dados grandes vão para arquivo privado, não para a célula', () => {
  const env = A.criarAmbiente();
  const grande = 'x'.repeat(60000);
  const r = env.fn('SGO_DocRev_registrar_')('RELATORIO_CALIBRACAO', { revisao: 0 }, { numero: 'RCL-T-1', payload: { fotos: [{ base64: grande }] } }, { nome: 'Técnico Teste', usuario: 'tec' });
  assert.equal(r.ok, true);
  const lista = env.api('tec', 'listar', { modulo: 'RELATORIO_CALIBRACAO' });
  assert.equal(lista.itens[0].temDados, true);
  const celula = env.run('SGO_DOCREV_MEMORIA_[0].PAYLOAD_JSON');
  assert.ok(celula.length < 200, 'a célula guarda só o identificador do arquivo');
  const ab = env.api('tec', 'abrir', { id: r.id, modo: 'CORRIGIR' });
  assert.equal(ab.payload.fotos[0].base64.length, 60000, 'os dados voltam inteiros');
});

test('documento sem dados guardados: explica o que falta e não pede para refazer o que existe', () => {
  const env = A.criarAmbiente();
  const id = env.fn('SGO_DocRev_registrarAntigo_')('NR13', { numero: '202600010', tag: 'VP-01', payload: { tag: 'VP-01' } }, { nome: 'Técnico Teste' });
  const ab = env.api('tec', 'abrir', { id, modo: 'CORRIGIR' });
  assert.equal(ab.ok, true);
  assert.equal(ab.info.semDados, false);
  const id2 = env.fn('SGO_DocRev_registrarAntigo_')('NR13', { numero: '202600011' }, { nome: 'Técnico Teste' });
  const ab2 = env.api('tec', 'abrir', { id: id2, modo: 'CORRIGIR' });
  assert.equal(ab2.info.semDados, true);
  assert.match(ab2.info.aviso, /antes de o sistema guardar os dados do formulário/);
  assert.match(ab2.info.aviso, /Rev\. 01 do mesmo número/);
});
