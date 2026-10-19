const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const gas = require('./_simulacros_gas.cjs');
function ambiente(opts = {}) {
  const eventos = [];
  const snapshot = { numeroCertificado: '202600250', cliente: { id: 'C', razaoSocial: 'Cliente' }, equipamento: { id: 'E', tag: 'CENT' }, fotos: [], blocos: [] };
  let registro = opts.existente || { ID: 'CERT', NUMERO_CERTIFICADO: snapshot.numeroCertificado, DADOS_JSON: JSON.stringify(snapshot) };
  let leituras = 0;
  const arquivo = { getId: () => 'novo', getName: () => 'documento', getUrl: () => 'https://drive.google.com/file/d/novo/view', setSharing() { eventos.push('publicar'); if (opts.falhaPublicar) throw Error('Drive indisponível'); }, setTrashed() { eventos.push('limpar'); if (opts.falhaLimpar) throw Error('Limpeza indisponível'); } };
  const ctx = vm.createContext({
    exigirSessao: () => ({ usuario: 'QA', userId: 'QA' }), SGO_UTILS: { safe: v => String(v || '').trim() },
    SGO_CFG: { SHEETS: { CERT_CALIBRACAO: 'cert' } },
    SGO_DATA: {
      getById() { leituras++; if (opts.concorrente && leituras > 1) registro.LINK_PDF_RELATORIO_INTERPRETATIVO = 'https://drive.google.com/file/d/primeiro/view'; return registro; },
      normalizarObjetoParaSheet: (_, r) => r, gerarRegistroBase: r => ({ ID: 'CERT', ...r }),
      getSheet: () => ({ getLastRow: () => 1, getMaxRows: () => 10 }), getHeaders: () => [],
      insert(_, r) { eventos.push('persistir'); if (opts.escritaAntesErro) registro = r; if (opts.falhaPersistir) throw Error('Sheets indisponível'); registro = r; return r; },
      update(_, id, dados) { eventos.push('persistir'); if (opts.falhaPersistir) return false; Object.assign(registro, dados); return true; }, log() {}
    },
    // Session/Utilities.formatDate fiéis (nome do documento com data/hora no fuso do script, CertCal_nomeDocumento_).
    Session: gas.criarSession(),
    Utilities: gas.criarUtilities({ newBlob: (dados, mime) => ({ mime, getAs(tipo) { eventos.push('converter'); this.mime = tipo; return this; }, setName() { return this; }, setDataFromString() { return this; }, setContentType() { return this; } }) }), MimeType: { PDF: 'pdf', HTML: 'text/html' },
    DriveApp: { Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' } },
    LockService: { getScriptLock: () => ({ waitLock() { eventos.push('lock'); }, releaseLock() { eventos.push('unlock'); } }) },
    CertCalIA_gerarRelatorioInterpretativo_: () => { eventos.push('IA'); return {}; },
    CertCalDoc_montarRelatorioInterpretativoHtml_: () => '<html>Relatório</html>', CertCalDoc_montarDocumentoHtml_: () => '<html>Certificado</html>',
    CertCalDoc_capturarDocumento_: () => ({ versao: 'teste' }),
    SGO_DOCUMENTOS: { registrarDocumentoExistente() {} }, Auvo_criarTarefa_() {}
  });
  // Em produção todos os .js são carregados juntos: SGO_UTILS real, moldura A4 (RelTecA4_paginar_) e cópia HTML (SGO_DocSalvar_htmlAoLado_).
  for (const f of ['SGO_Utilis.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js', 'SGO_CertCal_Main.js']) vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx);
  ctx.CertCal_bootstrap_ = () => {};
  ctx.CertCal_mapaPadroesAtivos_ = () => ({});
  ctx.CertCal_montarContexto_ = () => ({ ...snapshot, proximaCalibracao: { solicitada: false } });
  ctx.CertCal_proximoNumero_ = () => snapshot.numeroCertificado;
  // 'criar' = PDF; a cópia .html ao lado (SGO_DocSalvar_htmlAoLado_, padrão de 16-18/10) é contada à parte.
  ctx.CertCal_obterPastaCliente_ = () => ({ createFile(blob) { eventos.push(blob && blob.mime === 'text/html' ? 'criar-html' : 'criar'); return arquivo; } });
  return { ctx, arquivo, eventos, registro: () => registro };
}
test('certificado: persistir vem antes de publicar', () => {
  const a = ambiente(); a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.ok(a.eventos.indexOf('persistir') < a.eventos.indexOf('publicar'));
  assert.equal(a.registro().LINK_PDF_CERTIFICADO, a.arquivo.getUrl());
});
test('certificado: erro de persistência limpa PDF privado e não declara sucesso', () => {
  const a = ambiente({ falhaPersistir: true });
  assert.throws(() => a.ctx.CertCal_apiGerarCertificado('QA', {}), /Emissão interrompida/);
  assert.ok(a.eventos.includes('limpar')); assert.ok(!a.eventos.includes('publicar'));
});
test('escrita concluída antes da exceção é confirmada e evita apagar PDF registrado', () => {
  const a = ambiente({ falhaPersistir: true, escritaAntesErro: true });
  assert.equal(a.ctx.CertCal_apiGerarCertificado('QA', {}).ok, true);
  assert.ok(a.eventos.includes('publicar')); assert.ok(!a.eventos.includes('limpar'));
});
test('falha de limpeza é informada sem publicar; falha de compartilhar preserva registro', () => {
  const a = ambiente({ falhaPersistir: true, falhaLimpar: true });
  assert.throws(() => a.ctx.CertCal_apiGerarCertificado('QA', {}), /limpeza automática falhou/);
  assert.ok(!a.eventos.includes('publicar'));
  const b = ambiente({ falhaPublicar: true });
  assert.throws(() => b.ctx.CertCal_apiGerarCertificado('QA', {}), /Documento persistido/);
  assert.equal(b.registro().LINK_PDF_CERTIFICADO, b.arquivo.getUrl()); assert.ok(!b.eventos.includes('limpar'));
});
test('relatório existente é reutilizado sem IA, novo PDF ou alteração de snapshot', () => {
  const registro = { ID: 'CERT', LINK_PDF_RELATORIO_INTERPRETATIVO: 'https://drive.google.com/file/d/original/view', DADOS_JSON: '{}' };
  const a = ambiente({ existente: registro });
  const res = a.ctx.CertCal_apiGerarRelatorioInterpretativo('QA', { certificadoId: 'CERT' });
  assert.equal(res.reutilizado, true); assert.equal(res.linkPdf, registro.LINK_PDF_RELATORIO_INTERPRETATIVO);
  assert.deepEqual(a.eventos, []); assert.equal(registro.DADOS_JSON, '{}');
});
test('relatório: update false limpa privado, não publica e libera lock', () => {
  const a = ambiente({ falhaPersistir: true });
  assert.throws(() => a.ctx.CertCal_apiGerarRelatorioInterpretativo('QA', { certificadoId: 'CERT' }), /persistência/);
  assert.ok(a.eventos.includes('limpar')); assert.ok(!a.eventos.includes('publicar')); assert.equal(a.eventos.at(-1), 'unlock');
});
test('relatório: concorrência preserva a primeira emissão e descarta segunda privada', () => {
  const a = ambiente({ concorrente: true });
  const res = a.ctx.CertCal_apiGerarRelatorioInterpretativo('QA', { certificadoId: 'CERT' });
  assert.equal(res.reutilizado, true); assert.match(res.linkPdf, /primeiro/);
  assert.ok(a.eventos.includes('limpar')); assert.ok(!a.eventos.includes('persistir')); assert.ok(!a.eventos.includes('publicar'));
});

test('auditoria indisponível após persistência retorna certificado salvo e avisos, sem induzir reemissão', () => {
  const a = ambiente();
  a.ctx.SGO_DATA.log = () => { throw Error('Logs indisponíveis'); };
  const res = a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.equal(res.ok, true);
  assert.equal(res.certificadoId, 'CERT');
  assert.equal(res.linkPdf, a.registro().LINK_PDF_CERTIFICADO);
  assert.ok(res.avisos.some(v => v.includes('evento de auditoria CERTCAL_GERAR')));
  assert.ok(res.avisos.every(v => v.includes('não emita novamente') || v.includes('não emita novamente.')));
  assert.equal(a.eventos.filter(e => e === 'persistir').length, 1);
});

test('retorno false do logger compartilhado torna a falha de auditoria visível', () => {
  const a = ambiente();
  a.ctx.SGO_DATA.log = () => false;
  const res = a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.equal(res.ok, true);
  assert.ok(res.avisos.some(v => v.includes('evento de auditoria CERTCAL_GERAR')));
});

test('falhas de integrações auxiliares e do log preservam certificado e identificam pendências', () => {
  const a = ambiente();
  a.ctx.SGO_DATA.log = () => { throw Error('Logs indisponíveis'); };
  a.ctx.SGO_DOCUMENTOS.registrarDocumentoExistente = () => { throw Error('Inventário indisponível'); };
  a.ctx.Auvo_criarTarefa_ = () => { throw Error('Auvo indisponível'); };
  const res = a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.equal(res.ok, true);
  assert.ok(res.avisos.some(v => v.includes('Inventário de Documentos')));
  assert.ok(res.avisos.some(v => v.includes('Auvo não foi concluída')));
  assert.equal(a.registro().LINK_PDF_CERTIFICADO, res.linkPdf);
  assert.ok(!a.eventos.includes('limpar'));
});

test('interpretativo salvo retorna sucesso com aviso quando o log falha e é reutilizado na próxima chamada', () => {
  const a = ambiente();
  a.ctx.SGO_DATA.log = () => { throw Error('Logs indisponíveis'); };
  const res = a.ctx.CertCal_apiGerarRelatorioInterpretativo('QA', { certificadoId: 'CERT' });
  assert.equal(res.ok, true);
  assert.ok(res.avisos.some(v => v.includes('CERTCAL_RELATORIO_INTERPRETATIVO')));
  const reutilizado = a.ctx.CertCal_apiGerarRelatorioInterpretativo('QA', { certificadoId: 'CERT' });
  assert.equal(reutilizado.reutilizado, true);
  assert.equal(reutilizado.linkPdf, res.linkPdf);
  assert.equal(a.eventos.filter(e => e === 'criar').length, 1);
});
