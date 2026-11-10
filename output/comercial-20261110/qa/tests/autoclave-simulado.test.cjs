// Autoclave — relatório interno (dados reconstituídos, 23/10/2026): o ciclo simulado passa nas regras do
// motor (aprovado) ou cai pelo ponto frio (reprovado); ciclo de baixa temperatura com formaldeído nas 7 fases
// da fita do equipamento; o simulado não exige o equipamento do cadastro. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_autoclave_ambiente.cjs');

const STUBS = [
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: "pdf" + a.getId(), pdfUrl: "/arquivos/pdf" + a.getId(), html: h }; };',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  'var SESSOES_TESTE = { tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec" }, rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt" } };',
  'SGO_DocA4_registradores_ = function (t) { return { itens: [{ tag: t, descricao: "Registrador de teste", certificado: "CAL-T-1", validade: "01/01/2027", situacao: "Válido na data do ensaio", conforme: true, encontrado: true, incertezaU95: 0.3 }], observacoes: [] }; };',
  // Vínculo com o cadastro: só o equipamento escolhido vale (cliente sai do cadastro).
  'function SGO_QEQ_aplicarVinculoPayload_(s, p) { if (!p.equipamentoId) throw new Error("Escolha o equipamento no cadastro."); return Object.assign({}, p, { cliente: "CLIENTE DO CADASTRO" }); }'
].join('\n');

function ambiente() { return A.criarAmbiente({ extra: STUBS, props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } }); }

function vapor(alvo, sim, extra) {
  return Object.assign({
    modoEntrada: 'SIMULADO_ADMIN', nSensores: 12, setpoint: alvo, motor: alvo, dateStyle: 'BR',
    equipamento: { modoRemocaoAr: 'AUTO', unidadePressao: 'BAR_ABS' }, cliente: 'CLIENTE DE TESTE', tag: 'AUT-TESTE-01',
    certNumero: 'AUT-T-0001', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste', ensaio: 'QO (Vazio)', cicloNum: '1', simulacaoSenha: 'senha-teste',
    simulacao: Object.assign({
      inicioCiclo: '22/01/2026 05:00:00', fimCiclo: '22/01/2026 06:20:00', inicioPreVacuo: '22/01/2026 05:03:00', fimPreVacuo: '22/01/2026 05:25:00',
      pulsosPreVacuo: '3', pressaoPulsoPositiva: '1.50', pressaoVacuoMin: '0.35', inicioEsterilizacao: '22/01/2026 05:42:00', fimEsterilizacao: '22/01/2026 05:57:00',
      inicioSecagem: '22/01/2026 05:58:00', fimSecagem: '22/01/2026 06:15:00', temperaturaAlvo: alvo, intervaloSegundos: '10', resultadoDesejado: 'APROVADO'
    }, sim || {})
  }, extra || {});
}

function formaldeido(sim) {
  return vapor('60', Object.assign({
    processo: 'FORMALDEIDO', inicioCiclo: '20/10/2026 23:15:57', fimCiclo: '', inicioEsterilizacao: '', fimEsterilizacao: '', intervaloSegundos: '30',
    fases: { verificacao: 15, aquecimento: 33, condicionamento: 33, esterilizacao: 60, lavagem: 34, secagem: 32, aeracao: 30 }, pulsosCondicionamento: 4
  }, sim || {}));
}

function analisar(env, p) { return env.fn('AutoRel_acExecutarAnaliseCompleta_')(p).analise; }

test('vapor simulado: aprovado passa em todos os critérios (121, 127 e 134 °C, várias datas)', () => {
  const env = ambiente();
  for (const alvo of ['121', '127', '134']) {
    for (const dia of ['22/01/2026', '05/07/2026', '30/12/2026']) {
      const base = vapor(alvo).simulacao;
      const sim = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v).replace('22/01/2026', dia)]));
      const a = analisar(env, vapor(alvo, sim));
      assert.equal(a.statusAprovacao, 'APROVADO', alvo + ' ' + dia + ': ' + a.motivosReprovacao.join(' / '));
      const naoConformes = Array.from(a.criteriosPatamar.lista).filter(c => c.situacao !== 'CONFORME').map(c => c.chave);
      assert.deepEqual(naoConformes, [], alvo + ' ' + dia);
    }
  }
});

test('vapor simulado com leituras a 30 s: aprovado; equilíbrio fica "Não avaliado" (intervalo maior que 15 s)', () => {
  const a = analisar(ambiente(), vapor('134', { intervaloSegundos: '30' }));
  assert.equal(a.statusAprovacao, 'APROVADO');
  assert.deepEqual(Array.from(a.criteriosPatamar.lista).filter(c => c.situacao !== 'CONFORME').map(c => c.chave + ':' + c.situacao), ['equilibrio:NAO_AVALIADO']);
});

test('vapor simulado reprovado: o ponto frio fica abaixo da faixa no meio da exposição', () => {
  const env = ambiente();
  for (const alvo of ['121', '127', '134']) {
    const a = analisar(env, vapor(alvo, { resultadoDesejado: 'REPROVADO' }));
    assert.equal(a.statusAprovacao, 'REPROVADO');
    assert.ok(a.motivosReprovacao.some(m => /abaixo da faixa de esterilização no patamar: .* no sensor S7/.test(m)), a.motivosReprovacao.join(' / '));
  }
});

test('formaldeído simulado: 7 fases da fita, 60 min de esterilização e 237 min no total', () => {
  const env = ambiente();
  const p = formaldeido();
  const linhas = env.fn('AutoRel_gerarDadosSimuladosAdmin_')(p, {});
  assert.equal(linhas[0].tempoStr, '20/10/2026 23:15:57');
  assert.equal(linhas[linhas.length - 1].tempoStr, '21/10/2026 03:12:57');
  assert.equal(p._simulacaoMeta.duracaoTotalMin, 237);
  assert.deepEqual(Array.from(p._simulacaoMeta.fases, f => f.inicio.slice(11)), ['23:15:57', '23:30:57', '00:03:57', '00:36:57', '01:36:57', '02:10:57', '02:42:57']);
  const naFase = (ini, fim) => linhas.filter(r => r.tempoDate.getTime() >= new Date(ini).getTime() && r.tempoDate.getTime() <= new Date(fim).getTime());
  // Esterilização: câmara abaixo da atmosfera, perto do vapor saturado a ~61 °C (0,20–0,22 bar), todos os sensores entre 60 e 65 °C.
  const ester = naFase('2026-10-21T00:36:57', '2026-10-21T01:36:57');
  ester.forEach(r => {
    assert.ok(r.pressao > 0.19 && r.pressao < 0.23, r.tempoStr + ' pressão ' + r.pressao);
    r.temperaturas.forEach(t => assert.ok(t >= 60 && t <= 65, r.tempoStr + ' ' + t));
  });
  // Secagem em vácuo profundo; aeração termina na pressão atmosférica.
  assert.ok(naFase('2026-10-21T02:20:00', '2026-10-21T02:40:00').every(r => r.pressao < 0.06));
  assert.ok(Math.abs(linhas[linhas.length - 1].pressao - 1.013) < 0.01);
  const a = analisar(env, formaldeido());
  assert.equal(a.statusAprovacao, 'APROVADO', a.motivosReprovacao.join(' / '));
  assert.equal(a.tempoExposicaoMinutos, 60);
});

test('formaldeído simulado reprovado: um sensor não atinge a temperatura de esterilização', () => {
  const a = analisar(ambiente(), formaldeido({ resultadoDesejado: 'REPROVADO' }));
  assert.equal(a.statusAprovacao, 'REPROVADO');
  assert.ok(a.motivosReprovacao.some(m => /Exposição não identificada/.test(m)));
});

test('simulado é determinístico (rascunho e emissão geram as mesmas leituras)', () => {
  const env = ambiente();
  for (const p of [vapor('134'), formaldeido()]) {
    const ass = () => env.fn('AutoRel_acAssinatura_')(env.fn('AutoRel_acMontarContextoCertificado_')(JSON.parse(JSON.stringify(p))));
    assert.equal(ass(), ass());
  }
});

test('simulado não exige o equipamento do cadastro; com equipamento escolhido, a identificação vem do cadastro', () => {
  const env = ambiente();
  const D = env.fn('AutoRel_apiDispatch');
  const r = D({ sessionId: 'tec', fn: 'apiConverter', payload: vapor('134') });
  assert.equal(r.statusAprovacao, 'APROVADO');
  assert.equal(r.emitido, false);
  const f = D({ sessionId: 'tec', fn: 'apiConverter', payload: formaldeido() });
  assert.equal(f.statusAprovacao, 'APROVADO');
  const comEq = D({ sessionId: 'rt', fn: 'apiGerarRascunhoCertificado', payload: vapor('134', {}, { equipamentoId: 'EQ-1' }) });
  assert.equal(comEq.contexto.identificacao.cliente, 'CLIENTE DO CADASTRO');
  // Dados reais continuam exigindo o equipamento.
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiConverter', payload: vapor('134', {}, { modoEntrada: 'COLAR', textoColado: 'x' }) }), /Escolha o equipamento/);
});
