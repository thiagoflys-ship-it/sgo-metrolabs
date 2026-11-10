'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ambiente, OP, ler } = require('./_licitacoes_alertas_ambiente.cjs');

function combinado(ops) {
  const a = ambiente({ ops, agora: '2026-11-03T08:00:30-03:00' });
  vm.runInContext(ler('SGO_Licitacoes_Ramo.js'), a.ctx);
  return a;
}

test('resumo diário continua funcionando com o filtro do ramo carregado no mesmo contexto', () => {
  const a = combinado([OP('op_1234')]);
  const r = a.rodada();
  assert.equal(r.resumoRadar.enviados, 2, JSON.stringify(r.resumoRadar));
  assert.equal(a.rodada().resumoRadar.enviados, 0, 'não repete no mesmo dia');
});

test('candidata descartada pela IA não entra no resumo; análise e prazo curto continuam visíveis', () => {
  const baixa = OP('op_1234', { ANALISE_VERSAO: 1, NOTA: 10 });
  const curta = OP('op_5678');
  const a = combinado([baixa, curta]);
  // Disponibilidade controlada: não há chamada externa à IA neste teste.
  a.ctx.Lic_ramoCtx_ = () => ({ ativo: true, cfg: { notaMinima: 40 }, agoraMs: Date.parse('2026-11-03T11:00:30Z') });
  const itens = a.ctx.Lic_radarCandidatas_(new a.ctx.Date(), a.ctx.Lic_alertasCfg_());
  assert.deepEqual(Array.from(itens, (it) => it.l.ID), ['op_5678']);
  assert.equal(a.ctx.Lic_opSemAlerta_({ ...baixa, SITUACAO: 'ANALISE' }, a.ctx.Lic_alertasCfg_()), '');
});
