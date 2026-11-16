// Secadora de traqueias (relato do técnico Bento, 11/11/2026): "gero o relatório de ensaio e o relatório de qualificação
// diz que nenhum foi gerado". Fluxo ponta a ponta com perfil TECNICO + responsável técnico, o que a tela diz em cada passo,
// o aviso para quem aprova e o mesmo caminho no banho-maria. Só dados de teste; datas fixas nos dados.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('./_estufa_ambiente.cjs');

const VINC = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eqS' };
const BASE = E.MO.A.BASE;
// Só roda onde a fonte testada já tem a correção (QA_FORCAR=1 roda mesmo assim, para ver o que falha na produção atual).
const temCorrecao = process.env.QA_FORCAR === '1' || fs.readFileSync(path.join(BASE, 'SGO_EstufaBanhoRel_ModeloOficialNovo.js'), 'utf8').includes('EstufaOficial_cfgDiagnostico_');

function ambiente() {
  const env = E.criarAmbiente();
  env.run([
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eqS", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "SECADORA DE TRAQUEIAS", FABRICANTE: "MARCAFICTICIA", MODELO: "MODSEC", SERIE: "SN-SEC-0001", TAG: "SEC-TESTE-01", SETOR: "CME", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eqB", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "BANHO-MARIA", SERIE: "SN-BM-0001", TAG: "BM-TESTE-01", SETOR: "LABORATÓRIO", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_USUARIOS", { ID: "u_rt", NOME: "Responsável Teste", PERFIL: "GESTOR", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_USUARIOS", { ID: "u_tec", NOME: "Técnico Teste", PERFIL: "TECNICO", STATUS: "ATIVO" });'
  ].join('\n'));
  return env;
}

/** Secadora: 4 sensores a 60 °C (60 ± 2 °C), três estudos em vazio e três com carga de 50 min. */
function payloadSecadora(extra) {
  const s = E.serieEstufa({ minutos: 6 * 60, n: 4, base: 60, dtSeg: 60 });
  const t0 = s.linhas[0].d.getTime();
  const per = (h) => ({ inicio: s.fmt(new Date(t0 + h * 3600000)), fim: s.fmt(new Date(t0 + h * 3600000 + 50 * 60000)) });
  return Object.assign({ perfil: 'SECADORA_TRAQUEIAS', nSensores: 4, sensoresAtivos: [true, true, true, true], faixaTMin: '60', faixaTMax: '60', tolerancia: '2',
    modoEntrada: 'COLAR', textoColado: s.texto, dateStyle: 'BR', delimManual: 'AUTO',
    estudos: { secadora: { vazio: [per(0), per(1), per(2)], carga: [per(3), per(4), per(5)] } },
    certDataLogger: 'DTL-T1', responsavelTecnico: 'Técnico Teste', qualif: { setpoint: '60', resolucao: '0,1' } }, VINC, extra || {});
}

function payloadBanho(extra) {
  const s = E.serieEstufa({ minutos: 3 * 60, n: 6, base: 37, dtSeg: 30 });
  return Object.assign(E.payloadIncubacao(s, { perfil: 'BANHO_MARIA', faixaTMin: '36', faixaTMax: '38', equipamentoId: 'eqB', qualif: { setpoint: '37', resolucao: '0,1' } }), extra || {});
}

function rascunhoEEnvio(env, p) {
  const r = env.estufa('tec', 'apiQGerarRascunho', p);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  return env.estufa('tec', 'apiQEnviarParaAprovacao', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, documento: 'ENSAIO' }));
}

function qualifPayload(env, ensaios, extra) {
  return Object.assign({}, VINC, { perfil: 'SECADORA_TRAQUEIAS', etapas: { QO: true, QD: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: ensaios }, extra || {});
}

test('secadora ponta a ponta: técnico envia, a qualificação diz que aguarda aprovação, o responsável técnico emite e a qualificação reconhece o ensaio', { skip: !temCorrecao }, () => {
  const env = ambiente();
  const envio = rascunhoEEnvio(env, payloadSecadora());
  assert.equal(envio.ok, true);
  assert.match(envio.mensagem, /^Relatório de ensaio REE-\d{4}-00001 enviado para aprovação do responsável técnico \(Responsável Teste\)/);
  assert.match(envio.mensagem, /aviso no Início/);
  assert.match(envio.mensagem, /aparece na seção 8/);
  // Técnico não emite direto e não aprova.
  assert.throws(() => env.estufa('tec', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }), /Somente o responsável técnico/);

  // Seção 8 antes da aprovação: diagnóstico com número, quem enviou e quem aprova (não "nenhum relatório").
  const eq = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(eq.ensaios.length, 0);
  const ag = eq.diagnostico.itens.find((i) => i.codigo === 'ENSAIO_AGUARDANDO_APROVACAO');
  assert.ok(ag, JSON.stringify(eq.diagnostico));
  assert.match(ag.texto, new RegExp(envio.numero + ' foi enviado por Técnico Teste'));
  assert.match(ag.texto, /Responsável Teste/);

  // Rascunho do relatório de qualificação sem ensaio: a trava diz o motivo real, com número e quem aprova.
  const q0 = env.oficialEstufa('tec', 'apiGerarRascunho', qualifPayload(env, []));
  const t0 = q0.travas.find((t) => t.codigo === 'SEM_ENSAIO');
  assert.ok(t0, JSON.stringify(q0.travas));
  assert.match(t0.texto, new RegExp(envio.numero + '.*aguarda a aprovação do responsável técnico \\(Responsável Teste\\)'));
  assert.doesNotMatch(t0.texto, /^Nenhum relatório de ensaio foi escolhido\.$/);

  // Responsável técnico aprova e emite: o registro fica EMITIDO, ligado ao equipamento, com o resumo.
  const lista = env.estufa('rt', 'apiQListarAprovacoes', {});
  assert.equal(lista.itens.length, 1);
  const em = env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(em.numero, envio.numero);
  const reg = env.run('SGO_QE_obter_("' + envio.id + '")');
  assert.equal(reg.STATUS, 'EMITIDO'); assert.equal(reg.EQUIPAMENTO_ID, 'eqS'); assert.ok(reg.RESUMO_JSON);

  // Seção 8 reconhece o relatório de ensaio; a qualificação (QO + QD) sai aprovada e segue para aprovação.
  const eq2 = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(eq2.ensaios.length, 1);
  assert.equal(eq2.diagnostico, null);
  const p = qualifPayload(env, [eq2.ensaios[0].id]);
  const q = env.oficialEstufa('tec', 'apiGerarRascunho', p);
  assert.equal(q.bloqueado, false, JSON.stringify(q.travas));
  assert.equal(q.resumo.statusConsolidado, 'APROVADO');
  const envQ = env.oficialEstufa('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { assinaturaContexto: q.assinaturaContexto, textos: q.textos }));
  assert.equal(envQ.ok, true, envQ.erro);
  const emQ = env.oficialEstufa('rt', 'apiAprovarEmitir', { id: envQ.id, confirmacaoRevisao: true });
  assert.equal(emQ.ok, true, emQ.erro);
});

test('secadora: nada enviado (só rascunho ou prévia) — a trava da qualificação explica que o rascunho não fica gravado e dá o passo a passo', { skip: !temCorrecao }, () => {
  const env = ambiente();
  const p = payloadSecadora();
  const r = env.estufa('tec', 'apiQGerarRascunho', p);
  env.estufa('tec', 'apiQPrevia', Object.assign({}, p, { textosCertificado: r.textos }));
  assert.equal(env.run('SGO_QE_listar_("ESTUFA")').length, 0, 'rascunho e prévia não gravam');
  const q0 = env.oficialEstufa('tec', 'apiGerarRascunho', qualifPayload(env, []));
  const t0 = q0.travas.find((t) => t.codigo === 'SEM_ENSAIO');
  assert.match(t0.texto, /rascunho e a prévia não ficam gravados/);
  assert.match(t0.comoCorrigir, /^1\) .*2\) .*Enviar para aprovação.*3\) .*4\) /);
  const eq = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(eq.diagnostico.passos.length, 4);
  assert.match(eq.diagnostico.passos[1], /O rascunho e a prévia não ficam gravados/);
  assert.match(eq.diagnostico.passos[1], /planilha de dados sozinha não basta/);
});

test('secadora: relatório de ensaio da simulação didática (SIM-) não conta e a tela diz por quê, com o passo a passo', { skip: !temCorrecao }, () => {
  const env = ambiente();
  env.run('SGO_QSIM_registrar_({ MODULO: "ESTUFA", TIPO: "ENSAIO", NUMERO: "SIM-2026-0007-E", TAG: "SEC-TESTE-01", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", EQUIPAMENTO_ID: "eqS", RESULTADO: "APROVADO", CRIADO_POR: "Técnico Teste", CRIADO_EM: "11/11/2026 09:00:00" });');
  const eq = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  const it = eq.diagnostico.itens.find((i) => i.codigo === 'SIMULACAO_NAO_CONTA');
  assert.ok(it, JSON.stringify(eq.diagnostico));
  assert.match(it.texto, /SIM-2026-0007-E.*simulação didática.*não entra no relatório de qualificação/);
  assert.equal(eq.diagnostico.passos.length, 4, 'só simulação: mostra também o passo a passo');
  // Simulação de outro equipamento não aparece.
  const outro = env.oficialEstufa('tec', 'apiEquipamento', Object.assign({}, VINC, { equipamentoId: 'eqB' }));
  assert.ok(!outro.diagnostico.itens.some((i) => i.codigo === 'SIMULACAO_NAO_CONTA'));
});

test('quem aprova recebe o aviso no Início (central de pendências); o técnico não; some depois da emissão', { skip: !temCorrecao }, () => {
  const env = ambiente();
  env.run(fs.readFileSync(path.join(BASE, 'SGO_Alertas_Central.js'), 'utf8').replace(/\r\n/g, '\n'));
  env.run('var SGO_UTILS = typeof SGO_UTILS !== "undefined" ? SGO_UTILS : { safe: function (v) { return v === null || v === undefined ? "" : String(v).trim(); }, safeUpper: function (v) { return (v === null || v === undefined ? "" : String(v)).trim().toUpperCase(); } };');
  const envio = rascunhoEEnvio(env, payloadSecadora());
  const ver = (sid) => JSON.parse(JSON.stringify(env.run('Pend_calcular_(Pend_contextoDaSessao_(SESSOES_TESTE["' + sid + '"])).itens'))).filter((i) => i.tipo === 'relatorio_aprovar');
  const doRt = ver('rt');
  assert.equal(doRt.length, 1);
  assert.match(doRt[0].titulo, new RegExp('Relatório de ensaio ' + envio.numero + ' \\(HOSPITAL MODELO TESTE LTDA, TAG SEC-TESTE-01\\) aguardando aprovação'));
  assert.match(doRt[0].detalhe, /Enviado por Técnico Teste/);
  assert.match(doRt[0].oQueFazer, /seção 7/);
  assert.deepEqual(doRt[0].tela, { tipo: 'modulo', mod: 'estufa_banhomaria' });
  assert.equal(ver('tec').length, 0, 'o técnico que enviou não recebe o aviso de aprovar');
  env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(ver('rt').length, 0);
});

test('banho-maria: o mesmo caminho (técnico envia, responsável técnico emite, qualificação reconhece)', { skip: !temCorrecao }, () => {
  const env = ambiente();
  const envio = rascunhoEEnvio(env, payloadBanho());
  assert.equal(envio.ok, true);
  env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  const eq = env.oficialEstufa('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eqB' });
  assert.equal(eq.ensaios.length, 1);
  assert.equal(eq.diagnostico, null);
});

test('planilha de dados enviada: a mensagem lembra que ela não substitui o relatório de ensaio', { skip: !temCorrecao }, () => {
  const env = ambiente();
  const p = payloadSecadora();
  const m = env.estufa('tec', 'apiGerarPlanilhaDados', p);
  assert.equal(m.emitido, false);
  const envio = env.estufa('tec', 'apiQEnviarParaAprovacao', Object.assign({}, p, { documento: 'DADOS', assinaturaContexto: m.assinaturaContexto }));
  assert.match(envio.mensagem, /^Planilha de dados .* não substitui o relatório de ensaio/);
});

test('tela: rascunho mostra o próximo passo; a seção 8 lembra o rascunho não enviado; envio atualiza a seção 8', { skip: !temCorrecao }, () => {
  const l = fs.readFileSync(path.join(BASE, 'SGO_EstufaBanhoRel_ConteudoModulo.js'), 'utf8').split(/\r?\n/)[0];
  const t = JSON.parse(l.slice(l.indexOf('= ') + 2).replace(/;\s*$/, ''));
  const js = t.match(/<script>([\s\S]*?)<\/script>/)[1];
  new (require('node:vm').Script)(js);
  assert.match(js, /function tplEstufaBanhoRel_qProximoPassoHtml_\(\)/);
  assert.match(js, /o rascunho ainda não foi gravado nem enviado/);
  assert.match(js, /tplEstufaBanhoRel_Q\.rascunhoPendente \? '<div class="alert-box warning"/);
  assert.match(js, /if \(documento !== 'DADOS'\) \{ tplEstufaBanhoRel_Q\.rascunhoPendente = false;/);
  assert.match(js, /A minuta não fica gravada/);
});
