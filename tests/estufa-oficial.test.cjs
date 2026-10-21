// Estufa, banho-maria e secadora — relatório de qualificação do equipamento (modelo oficial novo, 21/10/2026):
// consolida os relatórios de ensaio emitidos, QI, decisão por regra, aprovação, pasta do equipamento,
// Arquivo de documentos com vencimento, ficha do equipamento e QR code. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('./_estufa_ambiente.cjs');

function emitirEnsaio(env, extra, serieOpcoes) {
  const s = E.serieEstufa(serieOpcoes || {});
  const p = E.payloadIncubacao(s, extra);
  const r = env.estufa('rt', 'apiQGerarRascunho', p);
  if (r.bloqueado) throw new Error(JSON.stringify(r.travas));
  return env.estufa('rt', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true }));
}

function qiConforme(env) {
  const o = {};
  env.oficialEstufa('tec', 'apiSituacao', {}).qiItens.forEach(it => { o[it.id] = { situacao: 'C' }; });
  return o;
}

const VINC = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3' };

test('relatório de qualificação: QI + QO aprovado, emitido com aprovação, registrado com vencimento e visível no QR', () => {
  const env = E.criarAmbiente();
  const ens = emitirEnsaio(env, { certNumero: 'REE-T-1' });
  const lista = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.strictEqual(lista.ok, true, lista.erro);
  assert.strictEqual(lista.ensaios.length, 1);
  const p = Object.assign({}, VINC, { etapas: { QI: true, QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: [ens.emissaoId], qi: qiConforme(env), dataQi: '05/10/2026', responsavelCliente: 'Responsável Cliente Teste' });
  const r = env.oficialEstufa('tec', 'apiGerarRascunho', p);
  assert.strictEqual(r.bloqueado, false, JSON.stringify(r.travas));
  assert.strictEqual(r.resumo.statusConsolidado, 'APROVADO');
  assert.strictEqual(r.resumo.validadeAte, '05/10/2027');
  const envio = env.oficialEstufa('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  assert.match(envio.numero, /^RQE-\d{4}-00001$/);
  const prev = env.oficialEstufa('rt', 'apiPreverAprovacao', { id: envio.id });
  assert.match(prev.html, /MINUTA PARA CONFERÊNCIA/);
  assert.ok(!/MARCAFICTICIA|MODELOEST/.test(prev.html));
  const em = env.oficialEstufa('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.strictEqual(em.ok, true, em.erro);
  assert.strictEqual(em.avisoArquivo, '');
  const docs = env.run('SGO_DATA.getAll("DOC_DOCUMENTOS")');
  assert.strictEqual(docs.length, 1);
  assert.strictEqual(docs[0].DATA_VENCIMENTO, '2027-10-05');
  assert.strictEqual(docs[0].EQUIPAMENTO_ID, 'eq3');
  // Ficha do equipamento e QR code: só o emitido; situação qualificado.
  const qr = JSON.parse(JSON.stringify(env.fn('qrcodeQualificacao')('cli', 'eq3')));
  assert.strictEqual(qr.success, true);
  assert.ok(qr.itens.some(i => /Relatório de qualificação térmica/.test(i.titulo) && i.situacao === 'VIGENTE'));
  assert.ok(!qr.itens.some(i => i.situacao === 'MINUTA'));
  assert.ok(['QUALIFICADO', 'VENCIDO', 'VENCENDO'].includes(qr.situacao.situacao));
  const outro = JSON.parse(JSON.stringify(env.fn('qrcodeQualificacao')('cli2', 'eq3')));
  assert.strictEqual(outro.success, false);
});

test('relatório de qualificação: travas (sem etapa, ensaio de outro equipamento, QI incompleta) e reprovação por regra', () => {
  const env = E.criarAmbiente();
  const ens = emitirEnsaio(env, { certNumero: 'REE-T-2' });
  const r0 = env.oficialEstufa('tec', 'apiGerarRascunho', Object.assign({}, VINC, { motivo: 'Qualificação inicial', periodicidadeMeses: 12 }));
  assert.ok(r0.travas.some(t => t.codigo === 'SEM_ETAPA'));
  const r1 = env.oficialEstufa('tec', 'apiGerarRascunho', Object.assign({}, VINC, { equipamentoId: 'eq5', etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: [ens.emissaoId] }));
  assert.ok(r1.travas.some(t => t.codigo === 'ENSAIO_OUTRO_EQUIPAMENTO'));
  const r2 = env.oficialEstufa('tec', 'apiGerarRascunho', Object.assign({}, VINC, { etapas: { QI: true, QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: [ens.emissaoId], qi: { documentacao: { situacao: 'NC', observacao: 'curta' } }, dataQi: '05/10/2026' }));
  assert.ok(r2.travas.some(t => t.codigo === 'QI_INCOMPLETA'));
  assert.ok(r2.travas.some(t => t.codigo === 'QI_NC_SEM_OBS'));
  const qi = qiConforme(env);
  qi.vedacao = { situacao: 'NC', observacao: 'Borracha da porta ressecada.' };
  const r3 = env.oficialEstufa('tec', 'apiGerarRascunho', Object.assign({}, VINC, { etapas: { QI: true, QO: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, ensaios: [ens.emissaoId], qi: qi, dataQi: '05/10/2026' }));
  assert.strictEqual(r3.resumo.statusConsolidado, 'REPROVADO');
  assert.strictEqual(r3.resumo.validadeAte, '');
  assert.match(r3.textos.conclusao, /REPROVADO/);
  // Equipe só; cliente não acessa a tela do relatório.
  assert.strictEqual(env.oficialEstufa('cli', 'apiSituacao', {}).ok, false);
});
