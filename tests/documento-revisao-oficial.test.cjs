// Relatório de qualificação (modelo oficial, com aprovação): "Usar como base" (21/10/2026, SGO_DocRevisao.js).
// O relatório novo sai com número novo, sem motivo de revisão, e o de origem não muda. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('./_modelo_oficial_ambiente.cjs');

const V = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' };
function base(env, extra) {
  return Object.assign({}, V, { etapas: { QI: true, QO: true, QD: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, qi: M.qiTudoConforme(env), dataQi: '10/10/2026', responsavelCliente: 'Responsável do serviço (teste)' }, extra || {});
}

test('relatório oficial da autoclave: usar como base gera relatório novo com número novo; o de origem continua vigente', () => {
  const env = M.criarAmbiente();
  env.run(fs.readFileSync(path.join(M.BASE || path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db'), 'SGO_DocRevisao.js'), 'utf8'));
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', programa: 'Instrumental 134 °C', certNumero: 'AUT-T-0001' });
  const c2 = M.emitirCiclo(env, { ensaio: 'QD (Carga)', programa: 'Instrumental 134 °C', certNumero: 'AUT-T-0002', cicloNum: '2' });
  const p = base(env, { ciclos: [c1, c2] });
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  const emi = env.oficial('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(emi.ok, true, emi.erro);
  const ab = env.oficial('tec', 'apiAbrir', { id: envio.id, modo: 'BASE' });
  assert.equal(ab.ok, true, ab.erro);
  assert.equal(ab.modo, 'BASE');
  assert.equal(ab.dados.numero, '', 'sem número: o novo recebe outro no envio');
  assert.equal(ab.dados.motivoRevisao, '');
  assert.equal(ab.dados.equipamentoId, 'eq1');
  const p2 = Object.assign({}, ab.dados, { observacoes: 'Requalificação do ano seguinte (teste).' });
  const r2 = env.oficial('tec', 'apiGerarRascunho', p2);
  const envio2 = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p2, { textos: r2.textos, assinaturaContexto: r2.assinaturaContexto }));
  assert.equal(envio2.ok, true, envio2.erro);
  assert.notEqual(envio2.numero, emi.numero);
  assert.equal(env.fn('SGO_QE_obter_')(envio.id).STATUS, 'EMITIDO', 'o de origem não muda');
  // envio devolvido não serve de base (corrige-se pelo próprio envio)
  const dev = env.oficial('rt', 'apiDevolver', { id: envio2.id, motivo: 'Conferir as observações do relatório.' });
  assert.equal(dev.ok, true, dev.erro);
  assert.match(env.oficial('tec', 'apiAbrir', { id: envio2.id, modo: 'BASE' }).erro, /Só um relatório emitido pode ser usado como base/);
});

test('telas dos relatórios oficiais: "Abrir para corrigir" e "Usar como base" nas quatro (autoclave, lavadora, estufa e cadeia de frio)', () => {
  const B = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const ler = n => fs.readFileSync(path.join(B, n), 'utf8');
  for (const f of ['JS_TemplateAutoclave.html', 'JS_TemplateLavadora.html']) {
    const s = ler(f);
    assert.match(s, />Abrir para corrigir</);
    assert.match(s, /,\\'BASE\\'\)">Usar como base</);
  }
  for (const [f, v] of [['SGO_EstufaBanhoRel_ConteudoModulo.js', 'ESTUFABANHOREL_CONTEUDO_MODULO'], ['SGO_CadeiaFrioRel_ConteudoModulo.js', 'CADEIAFRIOREL_CONTEUDO_MODULO']]) {
    const s = new Function(ler(f) + ';return ' + v)();
    assert.ok(s.includes('Abrir para corrigir') && s.includes('Usar como base'), f);
    for (const m of s.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Function(m[1]);
  }
  for (const f of ['SGO_AutoRel_ModeloOficialNovo.js', 'SGO_LavRel_ModeloOficialNovo.js', 'SGO_EstufaBanhoRel_ModeloOficialNovo.js', 'SGO_CadeiaFrioRel_ModeloOficial.js']) {
    assert.match(ler(f), /=== 'BASE'\) return SGO_DocRev_qeComoBase_\(c\)/, f);
  }
});
