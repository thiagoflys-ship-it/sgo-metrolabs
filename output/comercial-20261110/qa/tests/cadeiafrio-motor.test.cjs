// Cadeia de frio — motor revisado (21/10/2026): estudos de distribuição, abertura de porta, queda de energia e
// autonomia com casos calculados à mão, critérios com a fonte, conferência do método do Anexo G, travas que
// impedem a emissão e estatísticas (incluindo a temperatura cinética média). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./_cadeiafrio_ambiente.cjs');

const T0 = new Date(2026, 9, 12, 8, 0, 0);
function ctxDe(env, extra) { return env.fn('CadeiaFrioRel_qContexto_')(C.payload(extra)); }
function igual(a, b) { assert.deepEqual(JSON.parse(JSON.stringify(a)), b); }
function codigos(ctx) { return ctx.travas.map(t => t.codigo); }
function crit(ctx, chave, tipo) { return ctx.criterios.filter(c => c.chave === chave && (!tipo || c.tipoEstudo === tipo))[0]; }

/** Distribuição de 24 h a cada 60 s (1441 leituras), temperatura por sensor. */
function distribuicao(env, temp, extra, opcoes) {
  const L = C.leituras(Object.assign({ inicio: T0, n: 1441, temp }, opcoes || {}));
  return ctxDe(env, Object.assign({ textoColado: C.csv(L), estudos: { distribuicao: Object.assign({ tipo: 'DISTRIBUICAO_VAZIO', inicio: C.quando(L[0].d), fim: C.quando(L[L.length - 1].d) }, (extra && extra.dist) || {}) } }, extra && extra.payload));
}

/**
 * Abertura de porta a cada 10 s: 30 leituras estáveis a 5,0 °C; a porta abre na leitura 30; S1 sobe 0,05 °C por
 * leitura; a porta fecha 90 leituras depois (15 min) e S1 desce 0,10 °C por leitura até 5,0 °C; 60 leituras depois do fechamento.
 */
function porta(o) {
  o = Object.assign({ k0: 30, aberta: 90, depois: 60, tempoAlvo: '', tipo: 'ABERTURA_PORTA', s3: null, s2Inicio: null }, o || {});
  const n = o.k0 + o.aberta + o.depois;
  const L = C.leituras({ inicio: T0, dtSeg: 10, n, temp: (s, k) => {
    if (s === 2 && o.s3 !== null) return o.s3(k);
    if (s === 1 && o.s2Inicio !== null && k <= o.k0) return o.s2Inicio;
    if (s !== 0 && !(s === 1 && o.s2Sobe)) return 5;
    if (k < o.k0) return 5;
    if (k <= o.k0 + o.aberta) return 5 + 0.05 * (k - o.k0);
    return Math.max(5, 5 + 0.05 * o.aberta - 0.1 * (k - o.k0 - o.aberta));
  } });
  const inicio = C.quando(new Date(T0.getTime() + o.k0 * 10000));
  const fim = C.quando(new Date(T0.getTime() + (o.k0 + o.aberta) * 10000));
  const chave = o.tipo === 'ABERTURA_PORTA' ? 'aberturaPorta' : 'quedaEnergia';
  const estudos = {}; estudos[chave] = { habilitado: true, inicioEvento: o.inicioEvento || inicio, fimEvento: fim, tempoAlvoMinutos: o.tempoAlvo, tipoAbertura: 'TOTAL' };
  return { textoColado: C.csv(L), estudos };
}

/* ---------------------------------------------------------------- distribuição */
test('distribuição de 24 h estável: aprovado, estatísticas e indicações do Anexo G calculadas à mão', () => {
  const env = C.criarAmbiente();
  const ctx = distribuicao(env, (s) => [4, 5, 6][s]);
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  igual(codigos(ctx), []);
  const f = ctx.estudos[0].fatos, e = f.estatisticas;
  // 3 sensores × 1441 leituras: mínima 4, máxima 6, média 5, desvio populacional √(2/3) = 0,8165.
  assert.equal(e.n, 4323);
  igual([e.min, e.max, e.media, e.mediana, e.desvio, e.maxMin, e.mediaMin, e.maxMedia], [4, 6, 5, 5, 0.82, 2, 1, 1]);
  // MKT de 4, 5 e 6 °C em partes iguais, ΔH/R = 10 000 K.
  const hr = 83144 / 8.3144;
  const esperado = hr / -Math.log([4, 5, 6].reduce((a, t) => a + Math.exp(-hr / (t + 273.15)), 0) / 3) - 273.15;
  assert.ok(Math.abs(f.mkt - Math.round(esperado * 100) / 100) < 1e-9, 'MKT ' + f.mkt + ' esperado ' + esperado);
  assert.equal(crit(ctx, 'faixa').conforme, true);
  assert.equal(crit(ctx, 'duracao').conforme, true);
  assert.match(crit(ctx, 'intervalo').obtido, /^60\s*s$/);
  // Volume não informado: vale o mínimo de 12 sensores (antes virava 3); 3 sensores é desvio do método, sem reprovar.
  assert.equal(crit(ctx, 'sensores').conforme, false);
  assert.equal(crit(ctx, 'sensores').metodo, true);
  assert.match(ctx.estudos[0].desviosMetodo[0], /Quantidade de sensores/);
});

test('MKT: dois valores (5 °C e 15 °C) pela fórmula de Haynes', () => {
  const env = C.criarAmbiente();
  const hr = 10000;
  const esperado = hr / -Math.log((Math.exp(-hr / 278.15) + Math.exp(-hr / 288.15)) / 2) - 273.15;
  assert.ok(Math.abs(env.fn('CadeiaFrioRel_qMkt_')([5, 15]) - esperado) < 1e-9);
  assert.ok(esperado > 10, 'a MKT fica acima da média aritmética');
  assert.equal(env.fn('CadeiaFrioRel_qMkt_')([]), null);
});

test('distribuição: afastamento além da tolerância reprova; dentro da tolerância aprova com observação (sem "aprovado com alerta")', () => {
  const env = C.criarAmbiente();
  let ctx = distribuicao(env, (s, k) => (s === 1 && k === 700 ? 8.6 : 5));
  assert.equal(ctx.statusConsolidado, 'REPROVADO');
  assert.equal(crit(ctx, 'faixa').conforme, false);
  assert.match(crit(ctx, 'faixa').obtido, /maior afastamento de 0,60\s°C no sensor S2/);
  assert.match(ctx.estudos[0].motivosReprovacao[0], /registrou 8,60 °C/);
  ctx = distribuicao(env, (s, k) => (s === 1 && k === 700 ? 8.4 : 5));
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  assert.equal(ctx.estudos[0].statusAprovacao, 'APROVADO');
  assert.ok(ctx.estudos[0].alertasAnalise.some(a => /dentro da tolerância/.test(a)));
  assert.ok(!JSON.stringify(ctx).includes('APROVADO_COM_ALERTA'));
});

test('distribuição com rampa de estabilização: excluída do julgamento; fim da rampa fora dos dados vira trava', () => {
  const env = C.criarAmbiente();
  const temp = (s, k) => (k < 60 ? 14 - 9 * k / 60 : 5);
  const L = C.leituras({ inicio: T0, n: 1501, temp });
  let ctx = distribuicao(env, temp, { dist: {} }, { n: 1501 });
  assert.equal(ctx.statusConsolidado, 'REPROVADO');
  ctx = distribuicao(env, temp, { dist: { fimRampaEstabilizacao: C.quando(L[60].d) } }, { n: 1501 });
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  assert.equal(ctx.estudos[0].fatos.rampa.fim, C.quando(L[60].d));
  assert.equal(ctx.estudos[0].fatos.estatisticas.max, 5);
  assert.ok(ctx.escopo.some(t => /estabilização inicial/.test(t)));
  ctx = distribuicao(env, temp, { dist: { fimRampaEstabilizacao: '20/10/2026 08:00:00' } }, { n: 1501 });
  assert.ok(codigos(ctx).includes('RAMPA_FORA_DOS_DADOS'));
  assert.equal(ctx.emissaoBloqueada, true);
});

test('distribuição curta e intervalo longo: desvio do método, sem mudar o resultado', () => {
  const env = C.criarAmbiente();
  const ctx = distribuicao(env, () => 5, null, { n: 400, dtSeg: 120 });
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  assert.equal(crit(ctx, 'duracao').conforme, false);
  assert.equal(crit(ctx, 'intervalo').conforme, false);
  assert.match(crit(ctx, 'intervalo').obtido, /^120\s*s$/);
  assert.ok(ctx.estudos[0].desviosMetodo.length >= 2);
});

/* ---------------------------------------------------------------- abertura de porta e queda de energia */
test('abertura de porta: tempo até sair da faixa e retorno calculados à mão; tempo-alvo decide', () => {
  const env = C.criarAmbiente();
  // S1 passa de 8,0 °C na 61ª leitura depois da abertura (8,05 °C): 61 × 10 s = 10,1667 min.
  let ctx = ctxDe(env, porta({ tempoAlvo: '10' }));
  const f = ctx.estudos[0].fatos;
  assert.equal(f.rompeu, true);
  assert.equal(f.tempoAteRupturaMinutos, 10.17);
  assert.equal(f.ruptura.sensor, 'S1');
  // Fechada com 9,5 °C, S1 desce 0,10 °C por leitura: volta a 8,0 °C 15 leituras depois = 2,5 min.
  assert.equal(f.recuperouTotalmente, true);
  assert.equal(f.tempoAteRecuperacaoMinutos, 2.5);
  assert.equal(f.duracaoEventoMinutos, 15);
  assert.equal(ctx.estudos[0].statusAprovacao, 'APROVADO');
  assert.equal(crit(ctx, 'intervalo').conforme, true);
  assert.equal(crit(ctx, 'monitoramento').conforme, true);
  ctx = ctxDe(env, porta({ tempoAlvo: '15' }));
  assert.equal(ctx.estudos[0].statusAprovacao, 'REPROVADO');
  assert.equal(crit(ctx, 'tempoAlvo').conforme, false);
  // Sem tempo-alvo: caracterização (não avaliado), resultado informativo.
  ctx = ctxDe(env, porta({}));
  assert.equal(ctx.statusConsolidado, 'INFORMATIVO');
  assert.equal(crit(ctx, 'tempoAlvo').naoAvaliado, true);
});

test('evento iniciado com sensor fora da faixa e início do evento fora dos dados viram travas', () => {
  const env = C.criarAmbiente();
  let ctx = ctxDe(env, porta({ tipo: 'QUEDA_ENERGIA', tempoAlvo: '10', s2Inicio: 8.6 }));
  assert.ok(codigos(ctx).includes('EVENTO_INICIADO_FORA_DA_FAIXA'));
  const t = ctx.travas.filter(x => x.codigo === 'EVENTO_INICIADO_FORA_DA_FAIXA')[0];
  assert.match(t.oQue, /S2 \(8,60 °C\)/);
  assert.ok(t.comoCorrigir.length > 20);
  // Início 30 min depois da última leitura (ainda dentro da margem de 60 min do recorte).
  const fimDados = new Date(T0.getTime() + 179 * 10000);
  const pFora = porta({ tempoAlvo: '10', inicioEvento: C.quando(new Date(fimDados.getTime() + 30 * 60000)) });
  pFora.estudos.aberturaPorta.fimEvento = '';
  ctx = ctxDe(env, pFora);
  assert.ok(codigos(ctx).includes('EVENTO_FORA_DOS_DADOS'));
});

test('queda de energia sem fim informado: busca a saída da faixa até o fim dos dados', () => {
  const env = C.criarAmbiente();
  const p = porta({ tipo: 'QUEDA_ENERGIA', tempoAlvo: '12' });
  p.estudos.quedaEnergia.fimEvento = '';
  const ctx = ctxDe(env, p);
  assert.equal(ctx.estudos[0].fatos.tempoAteRupturaMinutos, 10.17);
  assert.equal(ctx.estudos[0].statusAprovacao, 'REPROVADO');
});

/* ---------------------------------------------------------------- autonomia (caixa térmica) */
test('autonomia da caixa térmica: tempo até sair da faixa; autonomia mínima opcional decide', () => {
  const env = C.criarAmbiente();
  const L = C.leituras({ inicio: T0, n: 120, temp: (s, k) => 5 + 0.05 * k });
  const base = { perfil: 'CAIXA_TERMICA_2_8', textoColado: C.csv(L), grandezas: { umidade: { medida: false, justificativa: 'Registrador só de temperatura no transporte.' } } };
  let ctx = ctxDe(env, Object.assign({}, base, { estudos: { autonomia: { habilitado: true, inicio: C.quando(L[0].d), fim: C.quando(L[L.length - 1].d) } } }));
  // 5,0 + 0,05 k passa de 8,0 °C em k = 61 → 61 min.
  assert.equal(ctx.estudos[0].fatos.autonomiaMinutos, 61);
  assert.equal(ctx.statusConsolidado, 'INFORMATIVO');
  igual(codigos(ctx), []);
  assert.ok(!ctx.normas.some(n => /16328/.test(n)), 'caixa térmica fora do Anexo G');
  ctx = ctxDe(env, Object.assign({}, base, { estudos: { autonomia: { habilitado: true, inicio: C.quando(L[0].d), fim: C.quando(L[L.length - 1].d), tempoAlvoMinutos: '60' } } }));
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  ctx = ctxDe(env, Object.assign({}, base, { estudos: { autonomia: { habilitado: true, inicio: C.quando(L[0].d), fim: C.quando(L[L.length - 1].d), tempoAlvoMinutos: '90' } } }));
  assert.equal(ctx.statusConsolidado, 'REPROVADO');
});

test('resultado do conjunto: estudo de caracterização não aprova nem reprova os demais', () => {
  const env = C.criarAmbiente();
  const st = env.fn('CadeiaFrioRel_cfConsolidarStatus_');
  assert.equal(st([{ statusAprovacao: 'APROVADO' }, { statusAprovacao: 'INFORMATIVO' }]), 'APROVADO');
  assert.equal(st([{ statusAprovacao: 'APROVADO_COM_ALERTA' }]), 'APROVADO');
  assert.equal(st([{ statusAprovacao: 'APROVADO' }, { statusAprovacao: 'REPROVADO' }]), 'REPROVADO');
  assert.equal(st([{ statusAprovacao: 'CARACTERIZACAO' }]), 'INFORMATIVO');
});

/* ---------------------------------------------------------------- travas de qualidade dos dados */
test('travas: leitura impossível, sensor parado, lacuna e leitura faltando', () => {
  const env = C.criarAmbiente();
  let ctx = distribuicao(env, (s, k) => (s === 0 && k === 300 ? -150 : 5));
  assert.ok(codigos(ctx).includes('LEITURA_IMPOSSIVEL'));
  // S3 parado em 5,00 °C enquanto S1 e S2 sobem 4,5 °C com a porta aberta (a média dos três varia 3,0 °C).
  ctx = ctxDe(env, porta({ tempoAlvo: '10', s2Sobe: true }));
  assert.ok(codigos(ctx).includes('SENSOR_PARADO'));
  ctx = distribuicao(env, () => 5, null, { pular: k => k >= 500 && k < 516 });
  assert.ok(codigos(ctx).includes('LACUNA'));
  ctx = distribuicao(env, (s, k) => (s === 1 && k >= 100 && k < 120 ? null : 5));
  assert.ok(codigos(ctx).includes('LEITURA_FALTANDO'), JSON.stringify(codigos(ctx)));
  const t = ctx.travas.filter(x => x.codigo === 'LEITURA_FALTANDO')[0];
  assert.match(t.oQue, /S2 não tem 20 de 1441/);
});

test('travas: registrador não informado, fora do cadastro ou vencido', () => {
  const env = C.criarAmbiente();
  const temp = () => 5;
  assert.ok(codigos(distribuicao(env, temp, { payload: { certDataLogger: '' } })).includes('REGISTRADOR_NAO_INFORMADO'));
  assert.ok(codigos(distribuicao(env, temp, { payload: { certDataLogger: 'DTL-QUALQUER' } })).includes('REGISTRADOR_NAO_CADASTRADO'));
  assert.ok(codigos(distribuicao(env, temp, { payload: { certDataLogger: 'DTL-VENC' } })).includes('REGISTRADOR_VENCIDO'));
  const ok = distribuicao(env, temp);
  assert.equal(ok.registradores.itens[0].incertezaU95, 0.2);
  // Relatório interno (dados reconstituídos): sem trava do registrador.
  assert.ok(!codigos(distribuicao(env, temp, { payload: { certDataLogger: '', modoRelatorioSimulado: true } })).includes('REGISTRADOR_NAO_INFORMADO'));
});

test('grandezas e estudos não realizados: justificativa obrigatória e frase no escopo', () => {
  const env = C.criarAmbiente();
  const temp = () => 5;
  let ctx = distribuicao(env, temp, { payload: { grandezas: {} } });
  igual(codigos(ctx).sort(), ['ESTUDO_SEM_JUSTIFICATIVA', 'ESTUDO_SEM_JUSTIFICATIVA', 'GRANDEZA_SEM_JUSTIFICATIVA']);
  ctx = distribuicao(env, temp);
  igual(codigos(ctx), []);
  assert.ok(ctx.escopo.some(t => /umidade relativa não foi medida/.test(t)));
  assert.ok(ctx.escopo.some(t => /abertura de porta não foi realizado/.test(t)));
  ctx = distribuicao(env, temp, { payload: { grandezas: { umidade: { medida: true, min: '40', max: '62' }, aberturaPorta: { justificativa: 'Feito em outra data, em relatório próprio.' }, quedaEnergia: { justificativa: 'Feito em outra data, em relatório próprio.' } } } });
  igual(codigos(ctx), []);
  assert.ok(ctx.escopo.some(t => /mínima de 40\s% e máxima de 62\s%/.test(t)));
  ctx = distribuicao(env, temp, { payload: { grandezas: { umidade: { medida: true, min: '70', max: '20' }, aberturaPorta: { justificativa: 'Feito em outra data, em relatório próprio.' }, quedaEnergia: { justificativa: 'Feito em outra data, em relatório próprio.' } } } });
  assert.ok(codigos(ctx).includes('UMIDADE_INCOMPLETA'));
});

test('sensor desconsiderado: só com justificativa, que vai para o escopo', () => {
  const env = C.criarAmbiente();
  let ctx = distribuicao(env, () => 5, { payload: { sensoresAtivos: [true, false, true] } });
  assert.ok(codigos(ctx).includes('SENSOR_DESCONSIDERADO_SEM_JUSTIFICATIVA'));
  ctx = distribuicao(env, () => 5, { payload: { sensoresAtivos: [true, false, true], justificativaSensores: 'S2 desconectou no início do ensaio (falha registrada).' } });
  igual(codigos(ctx), []);
  assert.ok(ctx.escopo.some(t => /S2 — S2 desconectou/.test(t)));
  assert.equal(ctx.estudos[0].fatos.porSensor.length, 2);
});

test('normas: ABNT NBR 16328:2024 (não 2023), RDC 430/2020 e o manual do PNI só para imunobiológicos', () => {
  const env = C.criarAmbiente();
  let ctx = distribuicao(env, () => 5);
  assert.ok(ctx.normas.some(n => /NBR 16328:2024/.test(n)));
  assert.ok(ctx.normas.some(n => /Rede de Frio/.test(n)));
  assert.ok(!JSON.stringify(ctx.normas).includes('2023'));
  ctx = distribuicao(env, () => -20, { payload: { perfil: 'FREEZER_MENOS20' } });
  assert.ok(!ctx.normas.some(n => /Rede de Frio/.test(n)));
  assert.equal(ctx.statusConsolidado, 'APROVADO');
  assert.equal(ctx.estudos[0].fatos.mkt, null, 'MKT só nos perfis configurados');
});
