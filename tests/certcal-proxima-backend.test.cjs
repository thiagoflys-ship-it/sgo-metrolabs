const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const gas = require('./_simulacros_gas.cjs');
const motor = require(path.join(base, 'SGO_CertCal_Calculo.js'));
const sessao = { userId: 'u-autenticado', usuario: 'tecnico', nome: 'Colaborador real' };
const sim = { solicitada: true, data: '08/10/2027', solicitante: 'Cliente responsável', cargoSetor: 'Qualidade', referencia: 'E-mail cliente de 08/10/2026', observacao: '' };
function ambiente() {
  const registros = [], logs = [], documentos = [];
  const cadastro = { clientes: { c: { ID: 'c', RAZAO_SOCIAL: 'Cliente' } }, equipamentos: { e: { ID: 'e', CLIENTE_ID: 'c', UNIDADE_ID: 'un', TAG: 'CENT' } }, unidades: { un: { ID: 'un', CLIENTE_ID: 'c' } } };
  const ctx = vm.createContext({
    CertCalCalculo: motor, exigirSessao: () => sessao,
    SGO_UTILS: { safe: v => String(v ?? '').trim(), formatCnpj: v => v || '' },
    SGO_CFG: { SHEETS: { CAD_CLIENTES: 'clientes', CAD_EQUIPAMENTOS: 'equipamentos', CAD_UNIDADES: 'unidades', CAD_TECNICOS: 'tecnicos', CERT_CALIBRACAO: 'certificados' } },
    SGO_VINCULOS: { relation() {} }, Session: gas.criarSession(),
    // formatDate fiel: o antigo devolvia sempre '08/10/2026' e a trava de data no futuro (compara 'yyyy-MM-dd') recusava a emissão.
    Utilities: gas.criarUtilities({ newBlob: () => ({ getAs: () => ({ setName() { return this; } }) }) }), MimeType: { PDF: 'pdf' },
    SGO_DATA: {
      getById: (aba, id) => cadastro[aba]?.[id], normalizarObjetoParaSheet: (_, r) => r,
      gerarRegistroBase: r => ({ ID: 'cert1', ...r }), insert: (_, r) => registros.push(r),
      getSheet: () => ({ getLastRow: () => 1, getMaxRows: () => 10, getRange: () => ({ setNumberFormat() {} }) }),
      getHeaders: () => ['DATA_CALIBRACAO', 'DATA_EMISSAO', 'DATA_VALIDADE', 'NUMERO_CERTIFICADO'],
      log: (...args) => logs.push(args)
    },
    SGO_DOCUMENTOS: { registrarDocumentoExistente: (_, r) => documentos.push(r) },
    DriveApp: { Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' } }, Auvo_criarTarefa_() {}
  });
  // Em produção todos os .js são carregados juntos: SGO_UTILS real, moldura A4 (RelTecA4_paginar_) e cópia HTML (SGO_DocSalvar_htmlAoLado_).
  for (const f of ['SGO_Utilis.js', 'SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js', 'SGO_DocRevisao.js', 'SGO_CertCal_Revisao.js', 'SGO_CertCal_Main.js']) vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx);
  ctx.CertCal_bootstrap_ = () => {};
  ctx.CertCal_mapaPadroesAtivos_ = () => ({});
  ctx.CertCal_calcularBlocos_ = () => [{ titulo: 'Rotação' }];
  ctx.CertCal_proximoNumero_ = () => '202600251';
  ctx.CertCalDoc_capturarDocumento_ = () => ({ versao: 'teste' });
  ctx.CertCalDoc_montarDocumentoHtml_ = () => '<html>Certificado</html>';
  ctx.CertCal_obterPastaCliente_ = () => ({ createFile: () => ({ setSharing() {}, getUrl: () => 'https://example.invalid/cert.pdf' }) });
  return { ctx, registros, logs, documentos };
}
const payload = (proximaCalibracao) => ({ clienteId: 'c', equipamentoId: 'e', tecnicoExecutorLivre: 'Executor QA', dataCalibracao: '08/10/2026', blocos: [{}], validadeMeses: 12, proximaCalibracao });
test('omissão e NÃO nunca geram validade ou próxima data a partir dos 12 meses legados', () => {
  for (const entrada of [undefined, { solicitada: false }]) {
    const { ctx } = ambiente();
    const r = ctx.CertCal_montarContexto_('session', payload(entrada), {});
    assert.equal(r.dataValidade, ''); assert.equal(r.proximaCalibracao.solicitada, false);
    assert.equal(r.proximaCalibracao.data, '');
  }
});
test('SIM exige data real posterior à calibração e identificação completa da origem', () => {
  const { ctx } = ambiente();
  for (const campo of ['data', 'solicitante', 'cargoSetor', 'referencia']) assert.throws(() => ctx.CertCal_validarProximaCalibracao_({ ...sim, [campo]: '' }, '08/10/2026', sessao));
  for (const data of ['31/02/2027', '08/10/2026', '07/10/2026', '2027-10-08T00:00:00Z', 47000]) assert.throws(() => ctx.CertCal_validarProximaCalibracao_({ ...sim, data }, '08/10/2026', sessao));
  assert.equal(ctx.CertCal_validarProximaCalibracao_({ ...sim, data: '2026-10-09' }, '08/10/2026', sessao).data, '09/10/2026');
  // Atendimento passado pode registrar uma data posterior à calibração e anterior à emissão.
  assert.equal(ctx.CertCal_validarProximaCalibracao_({ ...sim, data: '09/01/2020' }, '08/01/2020', sessao).data, '09/01/2020');
});
test('booleano estrito e NÃO com campos residuais são bloqueados no servidor', () => {
  const { ctx } = ambiente();
  for (const entrada of [null, [], {}, { solicitada: 'false' }, { solicitada: 'true' }, { solicitada: 1 }, { solicitada: 0 }]) assert.throws(() => ctx.CertCal_validarProximaCalibracao_(entrada, '08/10/2026', sessao));
  for (const campo of ['data', 'solicitante', 'cargoSetor', 'referencia', 'observacao']) assert.throws(() => ctx.CertCal_validarProximaCalibracao_({ solicitada: false, [campo]: 'resíduo' }, '08/10/2026', sessao));
});
test('colaborador e horário são server side; metadados falsos do payload não são aceitos', () => {
  const { ctx } = ambiente();
  const inicio = Date.now();
  const r = ctx.CertCal_validarProximaCalibracao_({ ...sim, registradoPor: { usuario: 'falso' }, registradoEm: '1990-01-01' }, '08/10/2026', sessao);
  assert.equal(r.registradoPor.usuario, sessao.usuario); assert.equal(r.registradoPor.userId, sessao.userId);
  assert.ok(Date.parse(r.registradoEm) >= inicio && Date.parse(r.registradoEm) <= Date.now());
  assert.throws(() => ctx.CertCal_validarProximaCalibracao_(sim, '08/10/2026', {}));
});
test('emissão grava solicitação auditável no snapshot e log, sem vencimento na integração', () => {
  for (const entrada of [sim, { solicitada: false }]) {
    const { ctx, registros, documentos, logs } = ambiente();
    ctx.CertCal_apiGerarCertificado('session', payload(entrada));
    assert.equal(registros.length, 1); assert.equal(registros[0].DATA_VALIDADE, '');
    assert.equal(registros[0].VEREDITO, ''); assert.equal(documentos[0].DATA_VENCIMENTO, '');
    const snapshot = JSON.parse(registros[0].DADOS_JSON);
    assert.equal(snapshot.proximaCalibracao.solicitada, entrada.solicitada);
    assert.equal(snapshot.proximaCalibracao.registradoPor.usuario, sessao.usuario);
    assert.equal(logs.filter(l => l[0] === 'CERTCAL_PROXIMA_CALIBRACAO').length, 1);
  }
});
test('memória auditável reconstrói uc a partir das componentes sem alterar resultados', () => {
  const r = motor.calcularPonto(3000, [2990, 3000, 3010], [{ codigo: 'RPM', incertezaU95: 4, fatorK: 2, veff: 0 }]);
  const m = r.memoriaCalculo;
  assert.equal(m.probabilidadeAbrangencia, 0.9545); assert.equal(m.numeroLeituras, 3);
  assert.equal(m.componentes[0].tipo, 'A'); assert.equal(m.componentes[0].grausLiberdade, 2);
  assert.equal(m.componentes[1].tipo, 'B'); assert.equal(m.componentes[1].incertezaPadrao, 2);
  assert.equal(m.componentes[1].grausLiberdadeInfinitos, true);
  const uc = Math.sqrt(m.componentes.reduce((s, c) => s + (c.incertezaPadrao * c.coeficienteSensibilidade) ** 2, 0));
  assert.ok(Math.abs(uc - r.incertezaPadraoCombinada) < 1e-10);
  assert.ok(Math.abs(r.k * uc - r.incertezaU95) < 1e-10);
  // Versão do motor atualizada em 17/10 (resolução do instrumento como componente tipo B, commit 36e3757).
  assert.equal(m.versaoMotor, 'certcal-gum-2026-10-17');
});
