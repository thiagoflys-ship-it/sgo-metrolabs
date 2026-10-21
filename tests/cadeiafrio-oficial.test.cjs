// Cadeia de frio — relatório de qualificação (modelo oficial novo) e fluxo cliente → unidade → equipamento →
// qualificação → pasta → ficha/QR → requalificação (21/10/2026). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_cadeiafrio_ambiente.cjs');

const T0 = new Date(2026, 9, 12, 8, 0, 0);

function igual(a, b) { assert.deepEqual(JSON.parse(JSON.stringify(a)), b); }

/** Emite um relatório de ensaio de distribuição pelo fluxo real (rascunho → envio → aprovação). Devolve o id da emissão. */
function emitirEnsaio(env, o) {
  o = Object.assign({ numero: 'CF-T-0001', tipo: 'DISTRIBUICAO_VAZIO', temp: (s) => [4.5, 5, 5.5][s], equipamentoId: 'eq1' }, o || {});
  const L = C.leituras({ inicio: T0, n: 1441, temp: o.temp });
  const p = C.payload({ certNumero: o.numero, equipamentoId: o.equipamentoId, textoColado: C.csv(L), estudos: { distribuicao: { tipo: o.tipo, inicio: C.quando(L[0].d), fim: C.quando(L[L.length - 1].d) } } });
  const r = env.dispatch('tec', 'apiGerarRascunhoCertificado', p);
  if (r.bloqueado) throw new Error('ensaio de teste bloqueado: ' + JSON.stringify(r.travas));
  const envio = env.dispatch('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }));
  env.dispatch('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  return envio.id;
}

function qiConforme(env) { const o = {}; env.fn('CFOFICIAL_CFG').QI_ITENS.forEach(it => { o[it.id] = { situacao: 'C' }; }); return o; }

function base(extra) {
  return Object.assign({ clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QI: true, QO: true, QD: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, dataQi: '12/10/2026' }, extra || {});
}

test('relatório de qualificação: consolida ensaios emitidos, QI, aprovação, pasta do equipamento, Arquivo de documentos e situação', () => {
  const env = C.criarAmbiente();
  const vazio = emitirEnsaio(env, { numero: 'CF-T-0001', tipo: 'DISTRIBUICAO_VAZIO' });
  const carga = emitirEnsaio(env, { numero: 'CF-T-0002', tipo: 'DISTRIBUICAO_CARGA' });
  const eq = env.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(eq.ok, true);
  assert.equal(eq.ensaios.length, 2);
  assert.equal(eq.situacao.situacao, 'SEM_QUALIFICACAO');
  // Travas: sem etapa marcada e QI incompleta.
  let r = env.oficial('tec', 'apiGerarRascunho', base({ etapas: {}, ensaios: [] }));
  assert.equal(r.bloqueado, true);
  assert.ok(r.travas.some(t => t.codigo === 'SEM_ETAPA'));
  r = env.oficial('tec', 'apiGerarRascunho', base({ ensaios: [vazio, carga], qi: {} }));
  assert.ok(r.travas.some(t => t.codigo === 'QI_INCOMPLETA'));
  // Só o estudo em vazio para QO e QD: falta o de carga.
  r = env.oficial('tec', 'apiGerarRascunho', base({ ensaios: [vazio], qi: qiConforme(env) }));
  assert.ok(r.travas.some(t => t.codigo === 'SEM_ENSAIO_QD'));
  r = env.oficial('tec', 'apiGerarRascunho', base({ ensaios: [vazio, carga], qi: qiConforme(env) }));
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  assert.equal(r.resumo.statusConsolidado, 'APROVADO');
  assert.equal(r.resumo.validadeAte, '12/10/2027');
  assert.match(r.textos.conclusao, /APROVADO/);
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', base({ ensaios: [vazio, carga], qi: qiConforme(env), assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  assert.equal(envio.ok, true, envio.erro);
  assert.match(envio.numero, /^RQF-\d{4}-00001$/);
  assert.equal(env.oficial('tec', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }).ok, false, 'técnico não aprova');
  const prev = env.oficial('rt', 'apiPreverAprovacao', { id: envio.id });
  assert.match(prev.html, /MINUTA/);
  const em = env.oficial('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(em.ok, true, em.erro);
  assert.equal(em.revisao, 0);
  assert.equal(em.avisoArquivo, '');
  const docs = env.fn('SGO_DATA').getAll('DOC_DOCUMENTOS');
  assert.equal(docs.length, 1);
  assert.equal(docs[0].EQUIPAMENTO_ID, 'eq1');
  assert.equal(docs[0].DATA_VENCIMENTO, '2027-10-12');
  // Ficha do equipamento e QR: qualificado; o cliente vê só o emitido (nunca a minuta).
  const sit = env.fn('SGO_QEQ_listarParaSessao_')(env.fn('SESSOES_TESTE').rt, 'eq1');
  assert.equal(sit.situacao.situacao, 'QUALIFICADO');
  assert.ok(sit.itens.some(i => /Relatório de qualificação — cadeia de frio/.test(i.titulo) && i.situacao === 'VIGENTE'));
  const cli = env.fn('SGO_QEQ_listarParaSessao_')(env.fn('SESSOES_TESTE').cli, 'eq1');
  assert.ok(cli.itens.every(i => i.situacao !== 'MINUTA'));
  assert.throws(() => env.fn('SGO_QEQ_listarParaSessao_')(env.fn('SESSOES_TESTE').cli2, 'eq1'), /Acesso negado/);
  // Documento: sem fabricante, com as seções do molde.
  const html = prev.html.replace(/data:[^"')]+/g, '');
  ['Objetivo', 'Escopo e limitações', 'Definições', 'Responsabilidades', 'Metodologia', 'Critérios de aceitação', 'Resultados', 'Recomendações e requalificação', 'Anexo A', 'Registro de revisões'].forEach(t => assert.ok(html.includes(t), 'falta ' + t));
  assert.ok(!/MARCAFICTICIA|MODELOXYZ|undefined|NaN/.test(html));
});

test('relatório de qualificação reprovado: ensaio reprovado vira não conformidade, sem validade; nova revisão substitui', () => {
  const env = C.criarAmbiente();
  const rep = emitirEnsaio(env, { numero: 'CF-T-0005', temp: (s, k) => (s === 0 && k === 500 ? 9.2 : 5) });
  let r = env.oficial('tec', 'apiGerarRascunho', base({ etapas: { QO: true }, ensaios: [rep] }));
  assert.equal(r.resumo.statusConsolidado, 'REPROVADO');
  assert.equal(r.resumo.validadeAte, '');
  assert.match(r.resumo.naoConformidades[0].texto, /temperatura na faixa de aceitação/);
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', base({ etapas: { QO: true }, ensaios: [rep], assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  env.oficial('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  const sit = env.fn('SGO_QEQ_listarParaSessao_')(env.fn('SESSOES_TESTE').rt, 'eq1');
  assert.equal(sit.situacao.situacao, 'REPROVADO');
  // Nova revisão do mesmo número, com motivo.
  const ok = emitirEnsaio(env, { numero: 'CF-T-0006' });
  r = env.oficial('tec', 'apiGerarRascunho', base({ etapas: { QO: true }, ensaios: [ok], numero: envio.numero }));
  const semMotivo = env.oficial('tec', 'apiEnviarParaAprovacao', base({ etapas: { QO: true }, ensaios: [ok], numero: envio.numero, assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  assert.match(semMotivo.erro, /motivo da nova revisão/);
  const e2 = env.oficial('tec', 'apiEnviarParaAprovacao', base({ etapas: { QO: true }, ensaios: [ok], numero: envio.numero, motivoRevisao: 'Repetido o estudo depois da troca da vedação da porta.', assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  const em2 = env.oficial('rt', 'apiAprovarEmitir', { id: e2.id, confirmacaoRevisao: true });
  assert.equal(em2.revisao, 1);
  assert.equal(env.fn('SGO_QE_obter_')(envio.id).STATUS, 'SUBSTITUIDO');
  assert.equal(env.fn('SGO_QEQ_listarParaSessao_')(env.fn('SESSOES_TESTE').rt, 'eq1').situacao.situacao, 'QUALIFICADO');
});

test('relatório de qualificação: ensaio de outro equipamento, ensaio não emitido e conclusão adulterada são recusados', () => {
  const env = C.criarAmbiente();
  const ok = emitirEnsaio(env, { numero: 'CF-T-0010' });
  const outro = emitirEnsaio(env, { numero: 'CF-T-0011', equipamentoId: 'eq3' });
  let r = env.oficial('tec', 'apiGerarRascunho', base({ etapas: { QO: true }, ensaios: [ok, outro] }));
  assert.ok(r.travas.some(t => t.codigo === 'ENSAIO_OUTRO_EQUIPAMENTO'));
  r = env.oficial('tec', 'apiGerarRascunho', base({ etapas: { QO: true }, ensaios: [ok] }));
  const t = { conclusao: r.textos.conclusao.replace('APROVADO', 'APROVADO com ressalvas'), conclusaoSimples: r.textos.conclusaoSimples };
  const env1 = env.oficial('tec', 'apiEnviarParaAprovacao', base({ etapas: { QO: true }, ensaios: [ok], assinaturaContexto: r.assinaturaContexto, textos: t }));
  assert.match(env1.erro, /não pode ser emitida/);
  // Outro cliente: o equipamento não pertence ao cliente escolhido.
  const x = env.oficial('tec', 'apiGerarRascunho', base({ clienteId: 'cli2', unidadeId: 'uni2', ensaios: [ok] }));
  assert.equal(x.ok, false);
  assert.match(x.erro, /outro cliente/);
  // Perfil sem acesso.
  assert.equal(env.oficial('cli', 'apiSituacao', {}).ok, false);
});
