// Lavadoras (termodesinfectora e ultrassônica) — motor revisado no molde da autoclave (21/10/2026): A0 pela regra
// dos trapézios com caso feito à mão, fases pelo perfil de temperatura, critérios decisivos e informativos, travas,
// conferência da IA, emissão com aprovação do responsável técnico e grandeza complementar (pressão). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./_lavadora_ambiente.cjs');

function igual(a, b) { assert.deepEqual(JSON.parse(JSON.stringify(a)), b); }

function payload(extra) {
  return Object.assign({
    modoEntrada: 'COLAR', nSensores: 3, setpoint: '90', motor: 'TERMO', classeArtigo: 'SEMICRITICO', dateStyle: 'BR',
    cliente: 'CLIENTE DE TESTE', cnpj: '11.222.333/0001-81', tag: 'LAV-TESTE-01', certNumero: 'LAV-T-0001', certDataLogger: 'DTL-T1',
    respTecnico: 'Técnico Teste', ensaio: 'QO (Vazio)', cicloNum: '1', programa: 'Instrumental 90 °C'
  }, extra || {});
}

function analisar(env, extra) { return env.fn('LavRel_lvExecutarAnaliseCompleta_')(payload(extra)).analise; }
function criterio(a, chave) { return a.criterios.filter(c => c.chave === chave)[0]; }
function travas(a) { return a.qualidadeDados.travas.map(t => t.codigo); }

/* ---------------------------------------------------------------- A0: casos calculados à mão */
test('A0 pela regra dos trapézios: casos calculados à mão e limite de 65 °C', () => {
  const env = L.criarAmbiente();
  const T = env.fn('SGO_QT_letalidadeTrapezio_');
  const pts = (n, dt, t) => Array.from({ length: n }, (_, i) => ({ ms: i * dt * 1000, t: typeof t === 'function' ? t(i) : t }));
  // 90 °C por 10 min (61 leituras a cada 10 s): L = 10^((90 − 80)/10) = 10 → A0 = 10 × 600 s = 6.000 s.
  assert.ok(Math.abs(T(pts(61, 10, 90), 80, 10, { tMinContagem: 65 }).total * 60 - 6000) < 1e-6);
  // Um intervalo de 60 s de 80 °C (L = 1) a 90 °C (L = 10): (1 + 10)/2 × 60 = 330 s.
  assert.ok(Math.abs(T([{ ms: 0, t: 80 }, { ms: 60000, t: 90 }], 80, 10, { tMinContagem: 65 }).total * 60 - 330) < 1e-9);
  // Abaixo de 65 °C a taxa letal é zero: de 60 °C a 90 °C em 60 s → (0 + 10)/2 × 60 = 300 s.
  assert.ok(Math.abs(T([{ ms: 0, t: 60 }, { ms: 60000, t: 90 }], 80, 10, { tMinContagem: 65 }).total * 60 - 300) < 1e-9);
  // Sem a opção (autoclave), o comportamento não muda: 60 °C conta com L = 10^-2.
  assert.ok(Math.abs(T([{ ms: 0, t: 60 }, { ms: 60000, t: 90 }], 80, 10).total * 60 - (0.01 + 10) / 2 * 60) < 1e-9);
});

test('motor: patamar de 10 min a 90 °C dá A0 = 6.000 s (o método antigo somava um intervalo a mais: 6.100 s)', () => {
  const env = L.criarAmbiente();
  const a = analisar(env, { textoColado: L.csvBlocos([[20, 50], [61, 90], [10, 50]], 10, 3) });
  assert.equal(a.minA0, 6000);
  assert.equal(a.statusAprovacao, 'APROVADO');
  igual(a.criterios.filter(c => c.decisivo).map(c => c.chave + ':' + c.situacao), ['fase:CONFORME', 'a0:CONFORME', 'faixa:CONFORME']);
  assert.equal(criterio(a, 'tempoPatamar').situacao, 'INFORMATIVO');
  assert.equal(criterio(a, 'tempoPatamar').valor, 10);
  // Memória do A0: soma das contribuições = A0 oficial; primeira leitura contribui com zero.
  const mem = a.memoriaA0PorSensor[0];
  assert.equal(mem[0].contribuicao, 0);
  assert.ok(Math.abs(mem.reduce((s, m) => s + m.contribuicao, 0) - a.a0PorSensor[0]) < 1e-6);
  // Artigo crítico: mínimo de 3.000 s; 4 min a 90 °C (2.400 s) reprova, semicrítico aprova.
  const csv4 = L.csvBlocos([[20, 50], [25, 90], [10, 50]], 10, 3);
  let b = analisar(env, { textoColado: csv4 });
  assert.equal(b.minA0, 2400);
  assert.equal(b.statusAprovacao, 'APROVADO');
  b = analisar(env, { textoColado: csv4, classeArtigo: 'CRITICO' });
  assert.equal(b.statusAprovacao, 'REPROVADO');
  assert.match(b.motivosReprovacao.join(' '), /A0 insuficiente: o pior sensor \(S\d\) acumulou 2\.400,00 s, abaixo do mínimo de 3\.000 s exigido para artigo crítico/);
});

test('A0 soma o aquecimento a partir de 65 °C e para no fim do patamar (secagem fora)', () => {
  const env = L.criarAmbiente();
  // 60 s a 70 °C (L = 0,1) antes do patamar de 2 min a 90 °C, depois secagem a 92 °C após queda (outro trecho).
  const csv = L.csvBlocos([[6, 40], [7, 70], [13, 90], [6, 60], [12, 92], [3, 40]], 10, 2);
  const a = analisar(env, { textoColado: csv, nSensores: 2 });
  // 70 °C: 6 intervalos × 10 s × 0,1 = 6 s; 70 → 90: (0,1 + 10)/2 × 10 = 50,5 s; 90 °C: 12 × 10 × 10 = 1.200 s → 1.256,5 s.
  assert.ok(Math.abs(a.minA0 - 1256.5) < 1e-6, String(a.minA0));
  assert.match(a.observacoesAnalise.join(' '), /Foi considerado o primeiro trecho/);
});

/* ---------------------------------------------------------------- critérios */
test('critérios: temperatura abaixo da programada reprova; acima da faixa de referência só registra', () => {
  const env = L.criarAmbiente();
  let a = analisar(env, { textoColado: L.csvBlocos([[20, 50], [20, 90.4], [2, (s) => (s === 1 ? 89.7 : 90.4)], [20, 90.4], [10, 50]], 10, 3) });
  assert.equal(criterio(a, 'faixa').situacao, 'NAO_CONFORME');
  assert.match(criterio(a, 'faixa').motivo, /89,70 °C no sensor S2/);
  assert.equal(a.statusAprovacao, 'REPROVADO');
  a = analisar(env, { textoColado: L.csvBlocos([[20, 50], [40, (s) => (s === 0 ? 96 : 91)], [10, 50]], 10, 3) });
  assert.equal(criterio(a, 'faixaAcima').situacao, 'NAO_CONFORME');
  assert.equal(criterio(a, 'faixaAcima').decisivo, false);
  assert.equal(a.statusAprovacao, 'APROVADO');
  assert.ok(a.alertasAnalise.some(t => /não decide o resultado/.test(t)));
  // Uniformidade e equilíbrio: medidos e informativos (limite a definir pelo responsável técnico).
  assert.equal(criterio(a, 'variacao').situacao, 'INFORMATIVO');
  assert.equal(criterio(a, 'variacao').valor, 5);
});

test('temperatura programada é obrigatória; a correção de letalidade digitada não altera o A0', () => {
  const env = L.criarAmbiente();
  assert.throws(() => analisar(env, { textoColado: L.csvBlocos([[20, 50], [61, 90]], 10, 3), setpoint: '' }), /Informe a temperatura programada/);
  const a = analisar(env, { textoColado: L.csvBlocos([[20, 50], [61, 90], [10, 50]], 10, 3), offsetParametro: '500' });
  assert.equal(a.minA0, 6000);
  assert.ok(a.alertasAnalise.some(t => /correção de letalidade informada na tela \(500,00\) não foi aplicada/.test(t)));
});

test('fases pelo perfil de temperatura (sem proporções fixas) e pré-lavagem informativa', () => {
  const env = L.criarAmbiente();
  const linhas = L.cicloTermo({ nSensores: 4 });
  const a = analisar(env, { textoColado: L.csvCompleto(linhas), nSensores: 4 });
  const seg = a.fasesProcesso.segmentos.map(s => s.codigo + ' ' + s.inicio.slice(11) + '-' + s.fim.slice(11));
  igual(seg, [
    'PRE_LAVAGEM 08:00:00-08:02:50', 'LAVAGEM_AQUECIMENTO 08:03:00-08:11:50', 'AQUECIMENTO_DESINFECCAO 08:12:00-08:19:50',
    'DESINFECCAO_TERMICA 08:20:00-08:25:00', 'SECAGEM_RESFRIAMENTO 08:25:10-08:35:00'
  ]);
  assert.equal(a.fasesProcesso.segmentos.filter(s => !s.estimada).length, 1);
  assert.equal(criterio(a, 'preLavagem').situacao, 'CONFORME');
  assert.equal(criterio(a, 'preLavagem').decisivo, false);
  assert.match(criterio(a, 'aquecimento').obtido, /taxa média de/);
  // Pré-lavagem quente: fora da referência, sem reprovar.
  const quente = analisar(env, { textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 4, tPre: 50 })), nSensores: 4 });
  assert.equal(criterio(quente, 'preLavagem').situacao, 'NAO_CONFORME');
  assert.equal(quente.statusAprovacao, 'APROVADO');
});

test('lavadora ultrassônica: tempo no patamar do banho e tolerância de ±3 °C', () => {
  const env = L.criarAmbiente();
  const u = extra => analisar(env, Object.assign({ motor: 'ULTRASSOM', setpoint: '45', nSensores: 3 }, extra));
  let a = u({ textoColado: L.csvCompleto(L.cicloUltra({})) });
  assert.equal(a.statusAprovacao, 'APROVADO');
  igual(a.criterios.filter(c => c.decisivo).map(c => c.chave + ':' + c.situacao), ['fase:CONFORME', 'tempoBanho:CONFORME', 'faixaBanho:CONFORME']);
  assert.equal(criterio(a, 'preLavagem').situacao, 'CONFORME');
  // Banho curto: 8 min no patamar (com a subida de 42 a 45 °C) → abaixo de 10 min.
  a = u({ textoColado: L.csvCompleto(L.cicloUltra({ banhoMin: 8 })) });
  assert.equal(criterio(a, 'tempoBanho').situacao, 'NAO_CONFORME');
  assert.equal(a.statusAprovacao, 'REPROVADO');
  // Um sensor 4 °C acima da programada no patamar → fora da tolerância.
  a = u({ textoColado: L.csvCompleto(L.cicloUltra({ desvios: [4.2, 0, 0] })) });
  assert.equal(criterio(a, 'faixaBanho').situacao, 'NAO_CONFORME');
  assert.match(criterio(a, 'faixaBanho').motivo, /acima da tolerância: 49,\d\d °C no sensor S1/);
  // Caso feito à mão: patamar de 45 °C das 09:03:20 às 09:13:20 (61 leituras a cada 10 s) = 10,00 min → atende.
  a = u({ textoColado: L.csvBlocos([[20, 25], [61, 45], [10, 25]], 10, 3) });
  assert.equal(criterio(a, 'tempoBanho').valor, 10);
  assert.equal(criterio(a, 'tempoBanho').situacao, 'CONFORME');
});

/* ---------------------------------------------------------------- travas de qualidade */
test('travas: leitura impossível, sensor parado, pico na fase, poucas leituras, lacuna', () => {
  const env = L.criarAmbiente();
  let a = analisar(env, { textoColado: L.csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 50], [40, 90], [10, 50]], 10, 3) });
  assert.ok(travas(a).includes('LEITURA_IMPOSSIVEL'));
  assert.ok(a.emissaoBloqueada);
  const rampa = (s, i) => (s === 2 ? 22 : 30 + i * 4);
  a = analisar(env, { textoColado: L.csvBlocos([[15, rampa], [40, (s) => (s === 2 ? 22 : 90.5)], [10, 50]], 10, 3) });
  assert.ok(travas(a).includes('SENSOR_PARADO'));
  // Patamar estável com sensores alguns segundos atrasados na queda seguinte não é sensor parado (achado do ensaio local).
  igual(travas(analisar(env, { textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 6, atraso: [0, 10, 20, 0, 30, 10] })), nSensores: 6 })), []);
  a = analisar(env, { textoColado: L.csvBlocos([[20, 50], [10, 90.5], [1, (s) => (s === 0 ? 105 : 90.5)], [20, 90.5], [10, 50]], 10, 3) });
  assert.ok(travas(a).includes('PICO_NA_FASE'));
  a = analisar(env, { textoColado: L.csvBlocos([[5, 50], [4, 90.5], [3, 50]], 60, 3) });
  assert.ok(travas(a).includes('POUCAS_LEITURAS'));
  // Lacuna: 3 min sem leitura dentro do patamar (intervalo normal de 10 s).
  const linhas = L.csvBlocos([[20, 50], [40, 90.5], [10, 50]], 10, 3).split('\n');
  const semLacuna = linhas.slice(0, 41).concat(linhas.slice(59));
  a = analisar(env, { textoColado: semLacuna.join('\n') });
  assert.ok(travas(a).includes('LACUNA_NA_FASE'));
  assert.ok(a.qualidadeDados.travas.every(t => t.oQue && t.porQue && t.comoCorrigir));
  // Desmarcar o sensor com falha libera a análise.
  a = analisar(env, { textoColado: L.csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 50], [40, 90], [10, 50]], 10, 3), sensoresAtivos: [true, false, true] });
  igual(travas(a), []);
  igual(a.sensoresDesabilitados, ['S2']);
});

/* ---------------------------------------------------------------- leitura dos arquivos */
test('arquivo único e um arquivo por sensor dão o mesmo A0; coluna Nº não vira temperatura', () => {
  const env = L.criarAmbiente();
  const linhas = L.cicloTermo({ nSensores: 3 });
  const idCompleto = env.criarArquivo('ciclo.csv', 'text/csv', L.csvCompleto(linhas));
  const completo = analisar(env, { modoEntrada: 'FILE_ID', fileId: idCompleto });
  assert.equal(completo.statusAprovacao, 'APROVADO');
  const ids = [0, 1, 2].map(k => env.criarArquivo('sensor ' + (k + 1) + '.csv', 'text/csv', L.csvIndividual(linhas, k, k === 1 ? 3 : 0)));
  const r = env.fn('LavRel_lvExecutarAnaliseCompleta_')(payload({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: ids }));
  assert.equal(r.analise.statusAprovacao, 'APROVADO');
  igual(travas(r.analise), []);
  assert.ok(Math.abs(r.analise.minA0 - completo.minA0) < 0.5, r.analise.minA0 + ' × ' + completo.minA0);
  assert.equal(r.payload._mesclagem.sensores[1].maiorDefasagemSeg, 3);
  // Arquivo de um sensor que termina antes do fim da fase → trava (leitura faltando).
  ids[2] = env.criarArquivo('sensor 3 curto.csv', 'text/csv', L.csvIndividual(linhas.slice(0, 125), 2));
  const r2 = env.fn('LavRel_lvExecutarAnaliseCompleta_')(payload({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: ids }));
  assert.ok(travas(r2.analise).includes('LEITURA_FALTANDO'));
  assert.throws(() => env.fn('LavRel_lvExecutarAnaliseCompleta_')(payload({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: [ids[0], '', ids[2]] })), /S2.*Envie o arquivo/);
  // Data guardada como data de planilha vale antes do texto exibido (no servidor aparece m/d/aa).
  const m = [['Data', 'Hora', 'S1']], d = [['Data', 'Hora', 'S1']];
  for (let i = 0; i < 5; i++) { m.push([new Date(2026, 9, 5), '08:00:' + String(i * 10).padStart(2, '0'), 30 + i]); d.push(['10/5/26', '08:00:' + String(i * 10).padStart(2, '0'), String(30 + i)]); }
  assert.equal(env.fn('LavRel_normalizarMatrizParaAnalise')(m, d, 1, 'AUTO')[0].tempoStr, '05/10/2026 08:00:00');
  const rich = env.fn('LavRel_lerDadosEntradaRich_')({ modoEntrada: 'COLAR', textoColado: 'Nº;Data;Hora;Temperatura (°C)\n1;10/10/2026;09:00:00;30,5\n2;10/10/2026;09:00:10;31,5\n3;10/10/2026;09:00:20;32,5' });
  const ln = env.fn('LavRel_normalizarMatrizParaAnalise')(rich.matrix, rich.displayMatrix, 1, 'BR');
  assert.equal(ln[0].temperaturas[0], 30.5);
  assert.equal(ln[0].pressao, null);
});

/* ---------------------------------------------------------------- conferência da IA */
function respostaIA(texto) {
  return () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) });
}

test('rascunho: texto da IA com número inventado ou norma fora da lista vira texto padrão; texto correto é aceito', () => {
  const p = payload({ textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3 })) });
  const ruim = '###ANALISE:TERMO###\nO A0 foi de 9.999,99 s.\n###CONCLUSAO_TECNICA###\nO ensaio está APROVADO.\n###CONCLUSAO_LEIGO###\nTudo certo, aprovado.\n###FIM###';
  let env = L.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: respostaIA(ruim) });
  let r = env.fn('LavRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' });
  assert.equal(r.origemTexto, 'PADRAO');
  assert.match(r.avisoIA, /9\.999,99/);
  assert.match(r.textos.conclusaoGeral, /O ensaio está APROVADO/);
  assert.ok(env.fn('LavRel_lvConferirTextos_')(r.contexto, r.textos, true).ok, 'o texto padrão passa na própria conferência');
  const minA0 = env.fn('SGO_DocA4_num_')(r.contexto.estudos[0].fatos.minA0, 2);
  const norma = '###ANALISE:TERMO###\nO menor A0 foi de ' + minA0 + ' s, conforme a EN 15883.\n###CONCLUSAO_TECNICA###\nO ensaio está APROVADO.\n###CONCLUSAO_LEIGO###\nResultado aprovado.\n###FIM###';
  env = L.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: respostaIA(norma) });
  assert.equal(env.fn('LavRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' }).origemTexto, 'PADRAO');
  const bom = '###ANALISE:TERMO###\nO menor A0 da fase de desinfecção foi de ' + minA0 + ' s, acima do mínimo de 600 s.\n###CONCLUSAO_TECNICA###\nCom A0 mínimo de ' + minA0 + ' s, o ensaio está APROVADO.\n###CONCLUSAO_LEIGO###\nA água quente foi suficiente em todos os pontos. O resultado é aprovado.\n###FIM###';
  env = L.criarAmbiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: respostaIA(bom) });
  r = env.fn('LavRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' });
  assert.equal(r.origemTexto, 'IA', r.avisoIA);
  // Ensaio só de temperatura: a IA não pode falar de pressão.
  const comPressao = Object.assign({}, r.textos, { conclusaoGeral: r.textos.conclusaoGeral + ' A pressão de aspersão ficou estável.' });
  assert.match(env.fn('LavRel_lvConferirTextos_')(r.contexto, comPressao, false).problemas.join(), /fora do escopo/);
});

test('texto padrão com critério informativo fora da referência não contradiz o APROVADO', () => {
  const env = L.criarAmbiente();
  const p = payload({ textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3, tPre: 50 })) });
  const r = env.fn('LavRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' });
  assert.equal(r.contexto.statusConsolidado, 'APROVADO');
  assert.match(r.textos.analisePorEstudo.TERMO, /fora do valor de referência, sem efeito no resultado: temperatura da pré-lavagem/);
  assert.ok(env.fn('LavRel_lvConferirTextos_')(r.contexto, r.textos, true).ok);
});

/* ---------------------------------------------------------------- emissão com aprovação */
test('emissão: só o aprovador emite, com confirmação; reemissão gera revisão; enviar, prévia, aprovar e devolver', () => {
  const env = L.criarAmbiente({ props: { QUALIF_VINCULO_OBRIGATORIO: 'NAO' } });
  const D = env.fn('LavRel_apiDispatch');
  const p = payload({ textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3 })) });
  const r = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: p });
  assert.equal(r.podeAprovar, false);
  const final = Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos });
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) }), /Enviar para aprovação/);
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: final }), /Conferi os dados/);
  const contraditorio = Object.assign({}, final, { confirmacaoRevisao: true, textosCertificado: Object.assign({}, r.textos, { conclusaoGeral: 'O ensaio está REPROVADO.' }) });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: contraditorio }), /resultado calculado é APROVADO/);
  const e1 = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) });
  assert.equal(e1.revisao, 0);
  assert.match(e1.html, /Revisado e aprovado para emissão por<\/b> Responsável Teste/);
  assert.match(e1.html, /Memória de cálculo do A0/);
  assert.match(e1.html, /Fases do ciclo/);
  const e2 = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) });
  assert.equal(e2.revisao, 1);
  igual(env.fn('SGO_QE_listar_')('LAVADORA').map(x => x.STATUS).sort(), ['EMITIDO', 'SUBSTITUIDO']);
  assert.ok(JSON.parse(env.fn('SGO_QE_listar_')('LAVADORA', 'EMITIDO')[0].RESUMO_JSON).fatos.minA0 > 0, 'resumo guardado para o relatório de qualificação');
  const envio = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: final });
  assert.ok(D({ sessionId: 'rt', fn: 'apiListarAprovacoes', payload: {} }).itens.some(i => i.id === envio.id && i.status === 'AGUARDANDO_APROVACAO'));
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiPreverAprovacao', payload: { id: envio.id } }), /Somente o responsável técnico/);
  assert.match(D({ sessionId: 'rt', fn: 'apiPreverAprovacao', payload: { id: envio.id } }).html, /MINUTA PARA CONFERÊNCIA/);
  assert.equal(D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: envio.id, confirmacaoRevisao: true } }).revisao, 2);
  const envio2 = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: final });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiDevolverAprovacao', payload: { id: envio2.id, motivo: 'não' } }), /motivo/);
  D({ sessionId: 'rt', fn: 'apiDevolverAprovacao', payload: { id: envio2.id, motivo: 'Confira a posição do sensor 2 na carga.' } });
  assert.equal(env.fn('SGO_QE_obter_')(envio2.id).STATUS, 'DEVOLVIDO');
});

test('travas impedem rascunho, emissão e planilha; registrador fora do cadastro também', () => {
  const env = L.criarAmbiente();
  const csv = L.csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 50], [40, 90], [10, 50]], 10, 3);
  const r = env.fn('LavRel_apiGerarRascunhoCertificado')(payload({ textoColado: csv }), { perfil: 'GESTOR' });
  assert.equal(r.bloqueado, true);
  assert.ok(r.travas.some(t => t.codigo === 'LEITURA_IMPOSSIVEL'));
  const r2 = env.fn('LavRel_apiGerarRascunhoCertificado')(payload({ textoColado: L.csvBlocos([[20, 50], [40, 90], [10, 50]], 10, 3), certDataLogger: 'DTL-XX' }), { perfil: 'GESTOR' });
  assert.ok(r2.travas.some(t => t.codigo === 'REGISTRADOR_NAO_CADASTRADO'));
  assert.throws(() => env.fn('LavRel_apiConverter')(payload({ textoColado: csv }), { perfil: 'GESTOR' }), /Como corrigir/);
});

test('grandeza complementar: sem "Analisar pressão" nada de pressão no documento fora do escopo; ligado, aparece como informação', () => {
  const env = L.criarAmbiente({ props: { QUALIF_VINCULO_OBRIGATORIO: 'NAO' } });
  const D = env.fn('LavRel_apiDispatch');
  const linhas = L.cicloTermo({ nSensores: 3 });
  const csvP = L.csvCompleto(linhas).split('\n').map((l, i) => l + ';' + (i === 0 ? 'Pressão' : '1,5')).join('\n');
  const p = payload({ textoColado: csvP });
  const r = D({ sessionId: 'rt', fn: 'apiGerarRascunhoCertificado', payload: p });
  const e = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({}, p, { confirmacaoRevisao: true, assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }) });
  const texto = e.html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const frase = 'Este ensaio considerou somente a temperatura; pressão de aspersão, dosagem de produtos químicos e qualidade da água não foram medidas nesta análise.';
  assert.ok(texto.includes(frase));
  assert.equal((texto.split(frase).join(' ').match(/.{0,60}press[aã]o.{0,30}/i) || [null])[0], null);
  const p2 = Object.assign({}, p, { analisarPressao: true, certNumero: 'LAV-T-0002' });
  const r2 = D({ sessionId: 'rt', fn: 'apiGerarRascunhoCertificado', payload: p2 });
  const e2 = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({}, p2, { confirmacaoRevisao: true, assinaturaContextoCertificado: r2.assinaturaContexto, textosCertificado: r2.textos }) });
  assert.match(e2.html, /Pressão registrada ao longo do ciclo, apresentada para informação/);
});

/* ---------------------------------------------------------------- planilha de dados (paisagem) */
test('planilha de dados nova: responsável emite em paisagem; técnico envia e recebe a minuta; modelo anterior só por propriedade', () => {
  const env = L.criarAmbiente({ props: { QUALIF_VINCULO_OBRIGATORIO: 'NAO' } });
  const D = env.fn('LavRel_apiDispatch');
  const p = payload({ textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3 })) });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiConverter', payload: p }), /Confirme que conferiu/);
  const e = D({ sessionId: 'rt', fn: 'apiConverter', payload: Object.assign({ confirmacaoRevisao: true }, p) });
  assert.equal(e.emitido, true);
  assert.equal(e.revisao, 0);
  const html = e.html;
  ['Quadro-resumo dos resultados', 'Condições do ensaio', 'Resultados por sensor e por fase do ciclo', 'Gráficos', 'Memória de cálculo',
    'Letalidade térmica (A0)', 'Incerteza de medição', 'Leituras da fase de desinfecção', 'Anexo A — Leituras fora da fase de desinfecção'].forEach(t => assert.ok(html.includes(t), t));
  assert.match(html, /orientacao|paisagem|landscape/i);
  assert.match(html, /A<sub>0<\/sub> = \(/);
  const t = D({ sessionId: 'tec', fn: 'apiConverter', payload: Object.assign({}, p, { certNumero: 'LAV-T-0009' }) });
  assert.equal(t.aguardandoAprovacao, true);
  assert.match(t.html, /MINUTA/);
  assert.match(D({ sessionId: 'rt', fn: 'apiListarAprovacoes', payload: {} }).itens.map(i => i.documento).join(), /Planilha de dados/);
  assert.equal(D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: t.id, confirmacaoRevisao: true } }).revisao, 0);
  // Modelo anterior (Google Planilhas) volta só com a propriedade; o código antigo continua no lugar.
  const env2 = L.criarAmbiente({ props: { LAVREL_PLANILHA_MODELO: 'ANTERIOR' }, extra: 'LavRel_apiConverterModeloAnterior_ = function () { return { ok: true, modeloAnterior: true }; };' });
  assert.equal(env2.fn('LavRel_apiConverter')(p, { perfil: 'GESTOR' }).modeloAnterior, true);
  // Ultrassônica: memória do tempo do banho, sem A0.
  const u = D({ sessionId: 'rt', fn: 'apiConverter', payload: Object.assign({ confirmacaoRevisao: true }, payload({ motor: 'ULTRASSOM', setpoint: '45', certNumero: 'LUS-T-1', textoColado: L.csvCompleto(L.cicloUltra({})) })) });
  assert.match(u.html, /Tempo e temperatura do banho/);
  assert.doesNotMatch(u.html, /Letalidade térmica \(A0\)/);
});

/* ---------------------------------------------------------------- vínculo com o cadastro */
test('relatório de ensaio exige o equipamento do cadastro e recusa equipamento de outro cliente', () => {
  const env = L.criarAmbiente({ cadastro: true });
  const p = payload({ textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3 })), cliente: 'DIGITADO', tag: 'X' });
  assert.throws(() => env.lav('tec', 'apiGerarRascunhoCertificado', p), /Escolha o cliente, a unidade e o equipamento/);
  assert.throws(() => env.lav('tec', 'apiGerarRascunhoCertificado', Object.assign({}, p, { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq2' })), /pertence a outro cliente/);
  const r = env.lav('tec', 'apiGerarRascunhoCertificado', Object.assign({}, p, { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' }));
  assert.equal(r.contexto.identificacao.cliente, 'HOSPITAL MODELO TESTE LTDA');
  assert.equal(r.contexto.identificacao.tag, 'LAV-TESTE-01');
  assert.equal(r.contexto.identificacao.numeroSerie, 'SN-LAV-0001');
  assert.equal(r.contexto.identificacao.marca, '');
});

/* ---------------------------------------------------------------- relatório de qualificação (modelo oficial novo) */
function emitirCicloCadastro(env, extra, ciclo) {
  const p = payload(Object.assign({ textoColado: L.csvCompleto(L.cicloTermo(Object.assign({ nSensores: 3 }, ciclo || {}))), clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' }, extra || {}));
  const r = env.lav('tec', 'apiGerarRascunhoCertificado', p);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  const envio = env.lav('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }));
  env.lav('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  return envio.id;
}

test('relatório de qualificação: consolida os ciclos, decide por regra, emite com aprovação e entra na ficha do equipamento', () => {
  const env = L.criarAmbiente({ cadastro: true });
  const c1 = emitirCicloCadastro(env, { ensaio: 'QO (Vazio)', certNumero: 'LAV-T-0101' });
  const c2 = emitirCicloCadastro(env, { ensaio: 'QD (Carga)', certNumero: 'LAV-T-0102', cicloNum: '2' });
  const qi = {};
  env.fn('LAVOFICIAL_CFG').QI_ITENS.forEach(it => { qi[it.id] = { situacao: 'C' }; });
  const p = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QI: true, QO: true, QD: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, qi: qi, dataQi: '10/10/2026', ciclos: [c1, c2] };
  const r = env.oficial('tec', 'apiGerarRascunho', p);
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  assert.equal(r.resumo.statusConsolidado, 'APROVADO');
  assert.equal(r.resumo.validadeAte, '10/10/2027');
  assert.match(r.textos.conclusao, /APROVADO/);
  assert.match(r.textos.conclusao, /menor A0/);
  assert.ok(!('cesto' in Object.fromEntries((r.travas || []).map(t => [t.codigo, 1]))));
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { textos: r.textos, assinaturaContexto: r.assinaturaContexto }));
  assert.equal(envio.ok, true, envio.erro);
  assert.match(envio.numero, /^RQL-\d{4}-00001$/);
  const emi = env.oficial('rt', 'apiAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.equal(emi.ok, true, emi.erro);
  const html = env.ctx.DriveApp.getFileById(emi.htmlId).getBlob().getDataAsString();
  assert.match(html, /Relatório de qualificação de lavadora termodesinfectora/);
  const texto = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/data:[^"')]+/g, ' ').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(texto, /MARCAFICTICIA|MODELOXYZ|autoclave|F0/);
  const ficha = JSON.parse(JSON.stringify(env.fn('SGO_QEQ_listarParaSessao_')({ perfil: 'GESTOR' }, 'eq1')));
  assert.equal(ficha.situacao.situacao, 'QUALIFICADO');
  assert.ok(ficha.itens.some(i => /qualificação — lavadora/.test(i.titulo)));
  assert.ok(env.fn('SGO_DATA').getAll('DOC_DOCUMENTOS').some(d => d.EQUIPAMENTO_ID === 'eq1' && d.DATA_VENCIMENTO === '2027-10-10'));
  // Ciclo reprovado reprova a qualificação; ciclo de outro equipamento vira trava.
  const c3 = emitirCicloCadastro(env, { ensaio: 'QD (Carga)', certNumero: 'LAV-T-0103', classeArtigo: 'CRITICO' }, { patamarMin: 2 });
  const r2 = env.oficial('tec', 'apiGerarRascunho', Object.assign({}, p, { ciclos: [c1, c3] }));
  assert.equal(r2.resumo.statusConsolidado, 'REPROVADO');
  assert.match(r2.textos.conclusao, /REPROVADO/);
  const r3 = env.oficial('tec', 'apiGerarRascunho', Object.assign({}, p, { equipamentoId: 'eq3', ciclos: [c1] }));
  assert.ok(r3.travas.some(t => t.codigo === 'CICLO_OUTRO_EQUIPAMENTO'));
});

test('ultrassônica: a tolerância do banho vem da configuração, não dos ajustes avançados da tela', () => {
  const env = L.criarAmbiente();
  const a = analisar(env, { motor: 'ULTRASSOM', setpoint: '45', textoColado: L.csvCompleto(L.cicloUltra({})), robustez: { toleranciaEntrada: '0', toleranciaSaida: '0' } });
  assert.equal(a.configuracaoDeteccaoExposicao.limiteInicio, 42);
  assert.equal(a.statusAprovacao, 'APROVADO');
});
