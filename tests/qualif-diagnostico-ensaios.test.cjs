// "O que falta" no relatório completo de qualificação (11/11/2026, caso real da secadora de 10/11/2026):
// quando o equipamento não tem relatório de ensaio emitido, a tela explica o motivo exato. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./_estufa_ambiente.cjs');
const C = require('./_cadeiafrio_ambiente.cjs');
const L = require('./_lavadora_ambiente.cjs');
const MO = require('./_modelo_oficial_ambiente.cjs');

const VINC = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3' };
// Só roda onde a fonte testada já tem o diagnóstico (na produção atual ainda não existe).
const temDiag = require('node:fs').readFileSync(require('node:path').join(E.MO.A.BASE, 'SGO_QualifEquipamento.js'), 'utf8').includes('SGO_QEQ_diagnosticoEnsaios_');

function registrar(env, campos) {
  return env.fn('SGO_QE_registrar_')(Object.assign({ CLIENTE: 'HOSPITAL MODELO TESTE LTDA', CNPJ: '11.222.333/0001-81', ENVIADO_POR: 'Técnico Teste', ENVIADO_EM: '10/11/2026 14:30:00' }, campos));
}

test('estufa: planilha de dados emitida sem relatório de ensaio vira diagnóstico com número, data e botão para a seção 6', { skip: !temDiag }, () => {
  const env = E.criarAmbiente();
  registrar(env, { MODULO: 'ESTUFA_DADOS', STATUS: 'EMITIDO', NUMERO: 'REE-2026-00002', REVISAO: '0', TAG: 'EST-TESTE-01', APROVADO_EM: '10/11/2026 15:00:00', CLIENTE_ID: 'cli1', UNIDADE_ID: 'uni1', EQUIPAMENTO_ID: 'eq3' });
  const r = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.ensaios.length, 0);
  assert.ok(r.diagnostico, 'sem diagnóstico');
  const it = r.diagnostico.itens.find(x => x.codigo === 'PLANILHA_SEM_RELATORIO');
  assert.ok(it, JSON.stringify(r.diagnostico));
  assert.match(it.texto, /Você emitiu a planilha de dados REE-2026-00002 em 10\/11\/2026, mas o relatório de ensaio deste equipamento ainda não foi emitido/);
  assert.equal(it.acao.alvo, 'EMITIR_ENSAIO');
  assert.equal(r.diagnostico.passos.length, 0);
});

test('estufa: envio aguardando aprovação diz quem aprova; devolvido diz o motivo', { skip: !temDiag }, () => {
  const env = E.criarAmbiente();
  registrar(env, { MODULO: 'ESTUFA', STATUS: 'AGUARDANDO_APROVACAO', NUMERO: 'REE-2026-00003', TAG: 'EST-TESTE-01', EQUIPAMENTO_ID: 'eq3' });
  registrar(env, { MODULO: 'ESTUFA', STATUS: 'DEVOLVIDO', NUMERO: 'REE-2026-00004', TAG: 'EST-TESTE-01', EQUIPAMENTO_ID: 'eq3', DEVOLVIDO_MOTIVO: 'Faltou o certificado do registrador' });
  env.run('SGO_DATA.insert("CAD_USUARIOS", { ID: "u9", NOME: "Engenheira Responsável Teste", PERFIL: "GESTOR", STATUS: "ATIVO" });');
  const r = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  const ag = r.diagnostico.itens.find(x => x.codigo === 'ENSAIO_AGUARDANDO_APROVACAO');
  assert.ok(ag);
  assert.match(ag.texto, /REE-2026-00003 foi enviado por Técnico Teste em 10\/11\/2026/);
  assert.match(ag.texto, /Engenheira Responsável Teste/);
  assert.match(ag.texto, /perfis ADMIN, DIRETORIA, GESTOR, METROLOGIA/);
  assert.equal(ag.acao.alvo, 'APROVACOES');
  const dv = r.diagnostico.itens.find(x => x.codigo === 'ENSAIO_DEVOLVIDO');
  assert.match(dv.texto, /Faltou o certificado do registrador/);
});

test('estufa: relatório de ensaio sem vínculo e ligado a outro equipamento com a mesma TAG', { skip: !temDiag }, () => {
  const env = E.criarAmbiente();
  registrar(env, { MODULO: 'ESTUFA', STATUS: 'EMITIDO', NUMERO: 'REE-2026-00005', TAG: 'EST-TESTE-01', APROVADO_EM: '09/11/2026 10:00:00' });
  registrar(env, { MODULO: 'ESTUFA', STATUS: 'EMITIDO', NUMERO: 'REE-2026-00006', TAG: 'EST-TESTE-01', APROVADO_EM: '09/11/2026 11:00:00', EQUIPAMENTO_ID: 'eq5' });
  const r = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  const sv = r.diagnostico.itens.find(x => x.codigo === 'ENSAIO_SEM_VINCULO');
  assert.ok(sv);
  assert.match(sv.texto, /REE-2026-00005/);
  assert.equal(sv.acao.alvo, 'VINCULAR');
  assert.equal(sv.acao.confirmarTag, false);
  const ou = r.diagnostico.itens.find(x => x.codigo === 'ENSAIO_OUTRO_EQUIPAMENTO');
  assert.match(ou.texto, /REE-2026-00006.*outro equipamento/);
  assert.match(ou.texto, /Cadastros › Vínculos/);
  // o vínculo pela tela continua funcionando e o diagnóstico some
  const v = env.oficialEstufa('tec', 'apiVincular', Object.assign({ emissaoId: sv.acao.emissaoId }, VINC));
  assert.equal(v.ok, true, v.erro);
  const r2 = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(r2.ensaios.length, 1);
  assert.equal(r2.diagnostico, null);
});

test('estufa: nada emitido mostra passo a passo curto; outro cliente não aparece', { skip: !temDiag }, () => {
  const env = E.criarAmbiente();
  registrar(env, { MODULO: 'ESTUFA_DADOS', STATUS: 'EMITIDO', NUMERO: 'REE-2026-00099', CLIENTE: 'CLINICA OUTRA TESTE LTDA', CNPJ: '99.888.777/0001-66', TAG: 'EST-TESTE-01' });
  const r = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(r.diagnostico.itens.length, 0);
  assert.equal(r.diagnostico.passos.length, 4);
  assert.match(r.diagnostico.passos.join(' '), /seção 6/);
  assert.match(r.diagnostico.passos.join(' '), /planilha de dados sozinha não basta/);
});

test('estufa: a planilha de dados se identifica como planilha (não "Relatório nº")', { skip: !temDiag }, () => {
  const fs = require('node:fs'), path = require('node:path');
  const src = fs.readFileSync(path.join(E.MO.A.BASE, 'SGO_EstufaBanhoRel_PlanilhaDados.js'), 'utf8');
  assert.match(src, /rotuloNumero: 'Planilha de dados nº'/);
});

test('cadeia de frio, autoclave e lavadora: o mesmo diagnóstico na tela do relatório de qualificação', { skip: !temDiag }, () => {
  const c = C.criarAmbiente();
  c.fn('SGO_QE_registrar_')({ MODULO: 'CADEIA_FRIO_DADOS', STATUS: 'EMITIDO', NUMERO: 'RCF-T-1', CNPJ: '11222333000181', TAG: 'CF-TESTE-01', APROVADO_EM: '08/11/2026 09:00:00', EQUIPAMENTO_ID: 'eq1' });
  const rc = c.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(rc.ok, true, rc.erro);
  assert.match(rc.diagnostico.itens[0].texto, /planilha de dados RCF-T-1 em 08\/11\/2026/);
  assert.match(rc.diagnostico.itens[0].texto, /seção 6/);

  const a = MO.criarAmbiente();
  a.fn('SGO_QE_registrar_')({ MODULO: 'AUTOCLAVE', STATUS: 'AGUARDANDO_APROVACAO', NUMERO: 'RA-T-1', CNPJ: '11222333000181', TAG: 'AUT-TESTE-01', ENVIADO_POR: 'Técnico Teste', ENVIADO_EM: '07/11/2026 08:00:00', EQUIPAMENTO_ID: 'eq1' });
  const ra = a.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(ra.ok, true, ra.erro);
  assert.equal(ra.diagnostico.itens[0].codigo, 'ENSAIO_AGUARDANDO_APROVACAO');
  assert.match(ra.diagnostico.itens[0].texto, /RA-T-1/);

  const l = L.criarAmbiente({ cadastro: true });
  const rl = l.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(rl.ok, true, rl.erro);
  assert.equal(rl.diagnostico.passos.length, 4);
  assert.match(rl.diagnostico.passos[0], /aba "Gerar relatório"/);
});

test('telas: os quatro módulos desenham o diagnóstico (texto justificado) e mantêm o aviso antigo como reserva', { skip: !temDiag }, () => {
  const fs = require('node:fs'), path = require('node:path');
  const base = E.MO.A.BASE;
  const ler = n => fs.readFileSync(path.join(base, n), 'utf8');
  const decod = n => { const l = ler(n).split(/\r?\n/)[0]; return JSON.parse(l.slice(l.indexOf('= ') + 2).replace(/;\s*$/, '')); };
  const est = decod('SGO_EstufaBanhoRel_ConteudoModulo.js'), cad = decod('SGO_CadeiaFrioRel_ConteudoModulo.js');
  assert.match(est, /r\.diagnostico \? tplEstufaBanhoRel_qDiagHtml_\(r\.diagnostico\)/);
  assert.match(est, /function tplEstufaBanhoRel_qDiagIr_/);
  assert.match(cad, /Q\.diagnostico \? tplCadeiaFrioRel_ofDiagHtml_\(Q\.diagnostico\)/);
  assert.match(ler('JS_TemplateAutoclave.html'), /r\.diagnostico \? tplAutOf_diagHtml\(r\.diagnostico\)/);
  assert.match(ler('JS_TemplateLavadora.html'), /r\.diagnostico \? tplLavOf_diagHtml\(r\.diagnostico\)/);
  for (const t of [est, cad, ler('JS_TemplateAutoclave.html'), ler('JS_TemplateLavadora.html')]) assert.match(t, /text-align:justify/);
});
