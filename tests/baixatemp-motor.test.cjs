// Esterilização a baixa temperatura — motor determinístico, travas e incertezas (21/10/2026).
// Cada valor esperado foi calculado à mão a partir dos ciclos sintéticos de _baixatemp_ambiente.cjs. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_baixatemp_ambiente.cjs');

const amb = A.criarAmbiente();
const P = amb.ctx;
const j = (x) => JSON.parse(JSON.stringify(x));

function serieDe(texto) {
  const m = P.BaixaTempParser_textoParaMatriz_(texto);
  const prop = P.BaixaTempParser_proporMapa_(m.matriz, m.decimalVirgula);
  return P.BaixaTempParser_normalizar_(m.matriz, P.BaixaTempParser_mapaDeColunas_(prop.colunas), { linhaCabecalho: prop.linhaCabecalho, decimalVirgula: m.decimalVirgula });
}

const IB_OK = [{ posicao: 'centro', lote: 'IB-T1', validade: '01/12/2027', microrganismo: 'Microrganismo de teste', resultado: 'SEM_CRESCIMENTO' }];
const IQ_OK = [{ posicao: 'centro', tipo: 'tipo de teste', lote: 'IQ-T1', validade: '01/12/2027', resultado: 'CONFORME' }];
function ciclo(id, etapa, extra) {
  return Object.assign({ id, etapa, numero: id, data: '20/10/2026', janela: { modo: 'AUTO' }, iqs: IQ_OK, ibs: etapa === 'QD' ? IB_OK : [], controlePositivo: { lote: 'IB-T1', validade: '01/12/2027', resultado: 'CRESCIMENTO' }, incubacao: { horas: '24', temperatura: '56', concluida: true } }, extra || {});
}
function dadosPeroxido(extra) {
  return Object.assign({
    tipo: 'PEROXIDO', etapas: { QO: true, QD: true },
    identificacao: { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', dataInicio: '20/10/2026', tecnicoExecutor: 'TECNICO DE TESTE' },
    programa: { temperaturaProgramada: '50', tolInf: '3', tolSup: '3', tempoExposicaoMin: '15', pulsosProgramados: '4', pressaoVacuoMbar: '1', fonteParametros: 'especificação de teste' },
    instrumentos: [{ tag: 'DTL-T1', grandeza: 'TEMPERATURA', certificado: 'CAL-T1', validade: '01/01/2027', U: '0,2', k: '2', resolucao: '0,1' }, { tag: 'PT-T1', grandeza: 'PRESSAO', certificado: 'CAL-T2', validade: '01/01/2027', U: '0,05', k: '2', resolucao: '0,01' }],
    qo: { itens: ['QO_PORTA', 'QO_ALARME', 'QO_CANCELAR', 'QO_PROGRAMAS'].map((c) => ({ codigo: c, resposta: 'SIM' })) },
    ciclos: [ciclo('o1', 'QO'), ciclo('d1', 'QD'), ciclo('d2', 'QD'), ciclo('d3', 'QD')]
  }, extra || {});
}
function avaliar(dados, series) {
  const an = {};
  dados.ciclos.forEach((c) => { an[c.id] = P.BaixaTempMotor_analisarCiclo_(series[c.id] || series._ || null, c, dados); });
  return j(P.BaixaTempMotor_avaliarEnsaio_(dados, an));
}

test('peróxido: janela pelos pulsos, 15,00 min, 4 pulsos, vácuo 0,40 mbar, uniformidade 0,90 °C (calculado à mão)', () => {
  const s = serieDe(A.cicloPeroxido());
  const d = dadosPeroxido();
  const a = j(P.BaixaTempMotor_analisarCiclo_(s, d.ciclos[1], d));
  assert.equal(a.travas.length, 0, a.travas.join('\n'));
  assert.equal(a.janela.origem, 'pulsos');
  assert.equal(a.janela.inicioTxt, '10:07:00');   // i = 14 → 14 × 30 s
  assert.equal(a.janela.fimTxt, '10:22:00');      // i = 44, volta ao vácuo depois do 4º pulso
  assert.equal(a.janela.duracaoMin, 15);          // 30 intervalos × 30 s
  assert.equal(a.pressao.pulsosJanela, 4);
  assert.equal(a.pressao.minCiclo, 0.4);
  assert.equal(a.pressao.vacuos, 5);              // vácuo inicial + 4 retornos ao vácuo (o último segue até a ventilação)
  assert.equal(Math.round(a.temperatura.uniformidade.valor * 100) / 100, 0.9); // 50,50 − 49,60
  assert.equal(a.temperatura.carga.min, 49.6);
  assert.equal(a.temperatura.carga.max, 50.5);
  assert.equal(Math.round(a.temperatura.carga.media * 1000) / 1000, 50.033); // (50 + 50,5 + 49,6) / 3
  assert.deepEqual(a.fases.map((f) => f.nome + ' ' + f.inicio + '-' + f.fim), ['Preparação e vácuo 10:02:00-10:07:00', 'Injeção e difusão do agente (exposição) 10:07:00-10:22:00', 'Fase final (plasma, ventilação ou aeração) 10:22:00-10:25:00']);
  assert.equal(a.resultado, 'CONFORME');
  const ch = Object.fromEntries(a.criterios.map((c) => [c.chave, c]));
  assert.equal(ch.TEMP_CARGA.conforme, true);
  assert.equal(ch.TEMP_CARGA.requisito, 'Todas as leituras dos sensores da carga na faixa de 47,0 °C a 53,0 °C');
  assert.equal(ch.TEMPO_EXPOSICAO.conforme, true);
  assert.equal(ch.PULSOS.conforme, true);
  assert.equal(ch.VACUO.obtido, '0,40 mbar às 10:23:00');
  assert.equal(ch.UNIFORMIDADE.conforme, null);    // sem limite declarado: informativo
  assert.equal(ch.IB.conforme, true);
});

test('incertezas (k = 2): temperatura 0,21 °C, pressão 0,05 mbar, tempo 0,41 min (calculado à mão)', () => {
  const inc = j(P.BaixaTempMotor_incertezas_(dadosPeroxido(), 30));
  // u = √((0,2/2)² + (0,1/(2√3))²) = √(0,01 + 0,000833) = 0,104083; U = 0,208167
  assert.equal(Math.round(inc.temperatura.U * 1e6) / 1e6, 0.208167);
  // u = √((0,05/2)² + (0,01/(2√3))²) = √(0,000625 + 0,00000833) = 0,025166; U = 0,050332
  assert.equal(Math.round(inc.pressao.U * 1e6) / 1e6, 0.050332);
  // Δt = 30 s: u por limite = 30/(2√3) = 8,660 s; dois limites: U = 2·√2·8,660 = 24,495 s = 0,408 min
  assert.equal(Math.round(inc.tempo.U * 1000) / 1000, 24.495);
  assert.equal(Math.round(inc.tempo.Umin * 1000) / 1000, 0.408);
});

test('ensaio completo de peróxido conforme (QO + 3 QD), com estanqueidade 0,30 mbar/min', () => {
  const s = serieDe(A.cicloPeroxido());
  const d = dadosPeroxido({ qo: { itens: ['QO_PORTA', 'QO_ALARME', 'QO_CANCELAR', 'QO_PROGRAMAS'].map((c) => ({ codigo: c, resposta: 'SIM' })), estanqueidade: { aplicavel: true, pressaoInicial: '1', pressaoFinal: '4', tempoMin: '10', limite: '1,3' } } });
  const av = avaliar(d, { _: s });
  assert.deepEqual(av.travas, []);
  assert.equal(av.resultado, 'CONFORME');
  const est = av.criteriosEnsaio.find((c) => c.chave === 'ESTANQUEIDADE');
  assert.equal(est.obtido, '0,30 mbar/min (de 1,00 mbar a 4,00 mbar em 10,00 min)'); // (4 − 1) / 10
  assert.equal(est.conforme, true);
  const qd = av.criteriosEnsaio.find((c) => c.chave === 'CICLOS_QD');
  assert.equal(qd.obtido, '3 de 3 ciclo(s) conforme(s)');
  assert.equal(av.ciclos.length, 4);
});

test('não conformidades: temperatura fora da faixa, exposição curta, pulsos a menos, vácuo alto, IB com crescimento', () => {
  // sensor 2 com +3,6 °C em 3 leituras da exposição → 54,10 °C > 53,0 °C
  const quente = serieDe(A.cicloPeroxido({ ajuste: (i, k) => (k === 1 && i >= 20 && i < 23 ? 3.6 : 0) }));
  const d = dadosPeroxido();
  let a = j(P.BaixaTempMotor_analisarCiclo_(quente, d.ciclos[1], d));
  const c1 = a.criterios.find((c) => c.chave === 'TEMP_CARGA');
  assert.equal(c1.conforme, false);
  assert.equal(c1.obtido, 'Mínima 49,60 °C e máxima 54,10 °C; 3 leitura(s) fora da faixa');
  assert.equal(a.sensores[1].foraFaixa, 3);
  assert.equal(a.sensores[1].minutosForaFaixa, 1.5); // 3 leituras × 30 s
  assert.equal(a.resultado, 'NAO_CONFORME');
  // 3 pulsos: janela de 10:07:00 a 10:18:00 = 11 min < 15 min; pulsos 3 ≠ 4
  const curto = serieDe(A.cicloPeroxido({ pulsos: 3 }));
  a = j(P.BaixaTempMotor_analisarCiclo_(curto, d.ciclos[1], d));
  assert.equal(a.janela.duracaoMin, 11);
  assert.equal(a.criterios.find((c) => c.chave === 'TEMPO_EXPOSICAO').conforme, false);
  assert.equal(a.criterios.find((c) => c.chave === 'PULSOS').obtido, '3 pulso(s) identificado(s)');
  // vácuo exigido ≤ 0,30 mbar; obtido 0,40
  const d2 = dadosPeroxido({ programa: Object.assign({}, d.programa, { pressaoVacuoMbar: '0,3' }) });
  a = j(P.BaixaTempMotor_analisarCiclo_(serieDe(A.cicloPeroxido()), d2.ciclos[1], d2));
  assert.equal(a.criterios.find((c) => c.chave === 'VACUO').conforme, false);
  // IB com crescimento
  const d3 = dadosPeroxido();
  d3.ciclos[1].ibs = [IB_OK[0], Object.assign({}, IB_OK[0], { posicao: 'porta', resultado: 'CRESCIMENTO' })];
  a = j(P.BaixaTempMotor_analisarCiclo_(serieDe(A.cicloPeroxido()), d3.ciclos[1], d3));
  const ib = a.criterios.find((c) => c.chave === 'IB');
  assert.equal(ib.conforme, false);
  assert.match(ib.obtido, /^1 de 2 sem crescimento; crescimento na\(s\) posição\(ões\) porta/);
  // um ciclo QD não conforme torna o ensaio não conforme e o C13 não atendido
  const av = avaliar(d3, { _: serieDe(A.cicloPeroxido()) });
  assert.equal(av.resultado, 'NAO_CONFORME');
  assert.equal(av.criteriosEnsaio.find((c) => c.chave === 'CICLOS_QD').conforme, false);
  assert.ok(av.naoConformidades.some((x) => /Ciclo QD nº d1 — Indicadores biológicos/.test(x)));
});

test('VBTF: janela pelo patamar de temperatura, 59,00 min; 6 pulsos de 200 mbar; pressão em kPa', () => {
  const s = serieDe(A.cicloFormaldeido());
  const d = { tipo: 'FORMALDEIDO', etapas: { QD: true }, identificacao: dadosPeroxido().identificacao, instrumentos: dadosPeroxido().instrumentos,
    programa: { temperaturaProgramada: '60', tolInf: '2', tolSup: '2', tempoExposicaoMin: '55', pulsosProgramados: '6', pressaoVacuoMbar: '60', fonteParametros: 'especificação de teste', uniformidadeMax: '1,5' },
    ciclos: [ciclo('f1', 'QD', { data: '21/10/2026' })] };
  const a = j(P.BaixaTempMotor_analisarCiclo_(s, d.ciclos[0], d));
  assert.deepEqual(a.travas, []);
  assert.equal(a.janela.origem, 'temperatura');
  assert.equal(a.janela.inicioTxt, '08:05:00');
  assert.equal(a.janela.fimTxt, '09:04:00');
  assert.equal(a.janela.duracaoMin, 59);
  assert.equal(a.pressao.pulsosJanela, 6);
  assert.equal(a.pressao.minCiclo, 50);
  assert.equal(Math.round(a.temperatura.uniformidade.valor * 100) / 100, 1.1); // 60,8 − 59,7
  assert.equal(a.criterios.find((c) => c.chave === 'UNIFORMIDADE').conforme, true);
  assert.equal(a.resultado, 'CONFORME');
});

test('travas do ensaio: identificação, parâmetros, instrumento vencido, sem incerteza, ciclos a menos, checklist incompleto', () => {
  const d = dadosPeroxido({ identificacao: { dataInicio: '32/13/2026' }, programa: { temperaturaProgramada: '50' },
    instrumentos: [{ tag: 'DTL-V', grandeza: 'TEMPERATURA', certificado: 'CAL-V', validade: '01/01/2026', U: '' }],
    etapas: { QI: true, QO: true, QD: true }, qi: { itens: [{ codigo: 'QI_LOCAL', resposta: 'NA' }] }, ciclos: [ciclo('d1', 'QD')] });
  const av = avaliar(d, { _: serieDe(A.cicloPeroxido()) });
  const t = av.travas.join('\n');
  assert.equal(av.resultado, null);
  for (const rx of [/cliente não foi escolhido/, /data de início do ensaio/, /técnico executor/, /tolerâncias/, /tempo de exposição programado/, /origem dos parâmetros/,
    /incerteza expandida \(U\) do instrumento DTL-V/, /sem resposta ou sem a observação obrigatória/, /há 0 ciclo\(s\) de operação/, /há 1 ciclo\(s\) de desempenho/]) assert.match(t, rx);
  // cada trava diz onde corrigir
  assert.ok(av.travas.every((x) => /Em |em |Corrija|Preencha|Atualize|Responda|Toque|Informe|Use|Escolha|Copie|Confira|Marque/.test(x)), t);
  const d2 = dadosPeroxido({ instrumentos: [{ tag: 'DTL-V', grandeza: 'TEMPERATURA', certificado: 'CAL-V', validade: '01/10/2026', U: '0,2', k: '2' }] });
  assert.match(avaliar(d2, { _: serieDe(A.cicloPeroxido()) }).travas.join('\n'), /estava vencido no período do ensaio \(validade 01\/10\/2026\)/);
});

test('travas do ciclo: indicadores pendente/vencido, controle positivo, janela manual sem justificativa, pulsos sem pressão', () => {
  const d = dadosPeroxido();
  const c = d.ciclos[1];
  c.ibs = [Object.assign({}, IB_OK[0], { resultado: 'PENDENTE' })];
  c.iqs = [Object.assign({}, IQ_OK[0], { validade: '01/10/2026' })];
  c.controlePositivo = { lote: 'IB-T1', resultado: 'SEM_CRESCIMENTO' };
  c.janela = { modo: 'MANUAL', inicio: '10:07:00', fim: '10:22:00' };
  const a = j(P.BaixaTempMotor_analisarCiclo_(serieDe(A.cicloPeroxido()), c, d));
  const t = a.travas.join('\n');
  assert.equal(a.resultado, null);
  assert.match(t, /incubação dos indicadores biológicos ainda não terminou ou há resultado pendente \(posição centro\)/);
  assert.match(t, /indicador químico do lote IQ-T1 .* estava vencido na data do ciclo/);
  assert.match(t, /controle positivo dos indicadores biológicos não apresentou crescimento/);
  assert.match(t, /sem justificativa/);
  assert.equal(a.janela.duracaoMin, 15); // a janela manual digitada é a mesma da automática
  // sem coluna de pressão e com pulsos programados
  const semP = serieDe(A.cicloPeroxido().split('\n').map((l) => l.split(';').slice(0, 5).join(';')).join('\n'));
  const b = j(P.BaixaTempMotor_analisarCiclo_(semP, d.ciclos[2], d));
  assert.equal(b.janela.origem, 'temperatura'); // reserva: patamar de temperatura
  assert.match(b.travas.join('\n'), /número de pulsos programado foi informado, mas o arquivo do ciclo não tem pressão/);
});

test('janela não identificável e intervalo fora da faixa travam com instrução', () => {
  const d = dadosPeroxido({ programa: Object.assign({}, dadosPeroxido().programa, { temperaturaProgramada: '80' }) });
  const frio = serieDe(A.cicloPeroxido().split('\n').map((l) => l.split(';').slice(0, 5).join(';')).join('\n'));
  const a = j(P.BaixaTempMotor_analisarCiclo_(frio, d.ciclos[1], d));
  assert.match(a.travas.join('\n'), /janela de exposição não foi identificada pelos dados/);
  const lento = serieDe(['Data;Hora;T1', '20/10/2026;10:00:00;50', '20/10/2026;10:20:00;50', '20/10/2026;10:40:00;50'].join('\n'));
  assert.match(j(P.BaixaTempMotor_analisarCiclo_(lento, d.ciclos[1], d)).travas.join('\n'), /intervalo típico entre leituras é de 1\.200 s/);
});

test('checklist: "Não" é não conformidade; banda de guarda reduz o limite pela incerteza', () => {
  const d = dadosPeroxido({ etapas: { QI: true } });
  d.qi = { itens: P.BAIXATEMP_CFG.TIPOS.PEROXIDO.checklistQI.map((m, i) => ({ codigo: m[0], resposta: i === 0 ? 'NAO' : 'SIM', observacao: i === 0 ? 'sem espaço de serviço' : '' })) };
  const av = avaliar(d, {});
  assert.equal(av.resultado, 'NAO_CONFORME');
  assert.match(av.criteriosEnsaio[0].obtido, /6 atendido\(s\), 1 não atendido\(s\), 0 não se aplica: Local de instalação.*\(sem espaço de serviço\)/);
  // banda de guarda: limite superior 53 − 0,208 = 52,79; leitura de 52,90 passa a não conforme
  P.BAIXATEMP_CFG.REGRA_DECISAO = 'BANDA_GUARDA';
  try {
    const s = serieDe(A.cicloPeroxido({ ajuste: (i, k) => (k === 1 && i === 25 ? 2.4 : 0) }));
    const dd = dadosPeroxido();
    const a = j(P.BaixaTempMotor_analisarCiclo_(s, dd.ciclos[1], dd));
    assert.equal(a.criterios.find((c) => c.chave === 'TEMP_CARGA').conforme, false);
    assert.match(a.criterios.find((c) => c.chave === 'TEMPO_EXPOSICAO').requisito, /≥ 15,41 min/); // 15 + 0,408
  } finally { P.BAIXATEMP_CFG.REGRA_DECISAO = 'SIMPLES'; }
});
