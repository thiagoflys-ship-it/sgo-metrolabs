// Autoclave a vapor — motor de qualificação térmica, travas, conferência da IA, emissão com aprovação
// e ensaio só de temperatura (20/10/2026). Casos com valor calculado à mão; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./_autoclave_ambiente.cjs');

const STUBS = [
  // PDF e paginação ficam fora do teste unitário (o ensaio no servidor cobre o PDF real).
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: "pdf" + a.getId(), pdfUrl: "/arquivos/pdf" + a.getId(), html: h }; };',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  'var SESSOES_TESTE = { tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec" }, rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt" } };',
  // FILE_ID: lê o arquivo de teste e passa pelo mesmo leitor de texto (a conversão de planilha real é coberta no ensaio do servidor).
  'var __lerOriginal = AutoRel_lerDadosEntradaRich_;',
  'AutoRel_lerDadosEntradaRich_ = function (p) { if (String(p.modoEntrada || "FILE_ID").toUpperCase() === "FILE_ID") { var t = DriveApp.getFileById(AutoRel_extrairDriveIdSeguro_(p.fileId)).getBlob().getDataAsString(); return __lerOriginal({ modoEntrada: "COLAR", textoColado: t, delimManual: p.delimManual }); } return __lerOriginal(p); };',
  'var REGISTRADOR_TESTE = { itens: [{ tag: "DTL-T1", descricao: "Registrador de teste", certificado: "CAL-T-1", validade: "01/01/2027", situacao: "Válido na data do ensaio", conforme: true, encontrado: true, incertezaU95: 0.3 }], observacoes: [] };',
  'SGO_DocA4_registradores_ = function (t) { return String(t || "").trim() === "DTL-T1" ? JSON.parse(JSON.stringify(REGISTRADOR_TESTE)) : (String(t || "").trim() ? { itens: [{ tag: t, encontrado: false, conforme: null }], observacoes: [] } : { itens: [], observacoes: [] }); };'
].join('\n');

function igual(a, b) { assert.deepEqual(JSON.parse(JSON.stringify(a)), b); }

function ambiente(opcoes) { return A.criarAmbiente(Object.assign({ extra: STUBS }, opcoes || {})); }

function payloadBase(extra) {
  return Object.assign({
    modoEntrada: 'COLAR', nSensores: 6, setpoint: '134', motor: '134', dateStyle: 'BR',
    equipamento: { modoRemocaoAr: 'AUTO', unidadePressao: 'BAR_ABS' }, cliente: 'CLIENTE DE TESTE', cnpj: '11.222.333/0001-81',
    tag: 'AUT-TESTE-01', certNumero: 'AUT-T-0001', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste', ensaio: 'QO (Vazio)', cicloNum: '1'
  }, extra || {});
}

/** CSV simples: blocos [n leituras, temperatura(s) por sensor ou função(i)], intervalo dtSeg. */
function csvBlocos(blocos, dtSeg, nSensores, pressao) {
  const cab = ['Data', 'Hora'].concat(Array.from({ length: nSensores }, (_, i) => 'S' + (i + 1))).concat(pressao ? ['Pressão'] : []);
  const out = [cab.join(';')];
  let k = 0;
  const t0 = new Date(2026, 9, 10, 9, 0, 0).getTime();
  blocos.forEach(([n, temp, p]) => {
    for (let i = 0; i < n; i++, k++) {
      const d = new Date(t0 + k * dtSeg * 1000);
      const hh = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
      const ts = Array.from({ length: nSensores }, (_, s) => (typeof temp === 'function' ? temp(s, i) : temp)).map(v => String(v).replace('.', ','));
      const pp = pressao ? [String(typeof p === 'function' ? p(i) : (p === undefined ? '' : p)).replace('.', ',')] : [];
      out.push(['10/10/2026', hh].concat(ts).concat(pp).join(';'));
    }
  });
  return out.join('\n');
}

function analisar(env, extra) {
  return env.fn('AutoRel_acExecutarAnaliseCompleta_')(payloadBase(extra)).analise;
}

function criterio(a, chave) { return a.criteriosPatamar.lista.filter(c => c.chave === chave)[0]; }
function travas(a) { return a.qualidadeDados.travas.map(t => t.codigo); }

/* ---------------------------------------------------------------- vapor saturado e F0 */
test('vapor saturado (IAPWS-IF97) confere com a tabela de vapor', () => {
  const env = ambiente();
  const T = env.fn('SGO_QT_tSatVaporC_'), P = env.fn('SGO_QT_pSatVaporBar_');
  assert.ok(Math.abs(T(1) - 99.61) < 0.01);
  assert.ok(Math.abs(T(2) - 120.21) < 0.01);
  assert.ok(Math.abs(T(3) - 133.52) < 0.01);
  assert.ok(Math.abs(T(P(134)) - 134) < 1e-6);
  assert.equal(T(-1), null);
});

test('F0 pela regra dos trapézios: casos calculados à mão', () => {
  const env = ambiente();
  const L = env.fn('SGO_QT_letalidadeTrapezio_');
  const pts = (n, dt, t) => Array.from({ length: n }, (_, i) => ({ ms: i * dt * 1000, t: typeof t === 'function' ? t(i) : t }));
  // 121,1 °C por 10 min (11 leituras a cada 60 s): F0 = 10 (o método antigo somava 11 intervalos: 11).
  assert.ok(Math.abs(L(pts(11, 60, 121.1), 121.1, 10).total - 10) < 1e-9);
  // 131,1 °C por 3 min a cada 30 s (7 leituras): 10 × 3 = 30.
  assert.ok(Math.abs(L(pts(7, 30, 131.1), 121.1, 10).total - 30) < 1e-9);
  // Um intervalo de 1 min de 121,1 °C a 131,1 °C: (1 + 10) / 2 × 1 = 5,5.
  assert.ok(Math.abs(L([{ ms: 0, t: 121.1 }, { ms: 60000, t: 131.1 }], 121.1, 10).total - 5.5) < 1e-9);
  // Lacuna maior que o permitido não soma e é devolvida.
  const r = L([{ ms: 0, t: 121.1 }, { ms: 60000, t: 121.1 }, { ms: 600000, t: 121.1 }], 121.1, 10, { maxIntervaloMs: 180000 });
  assert.ok(Math.abs(r.total - 1) < 1e-9);
  assert.equal(r.lacunas.length, 1);
  // Incerteza: F0 = 20, U(T) = 0,5 °C, z = 10 → 20 × ln10 / 10 × 0,5 = 2,3026.
  assert.ok(Math.abs(env.fn('SGO_QT_incertezaLetalidade_')(20, 0.5, 10) - 2.302585) < 1e-5);
});

test('motor: patamar de 4 min a 134,0 °C dá F0 = 4 × 10^1,29 (antes contava um intervalo a mais)', () => {
  const env = ambiente();
  const csv = csvBlocos([[20, 100], [25, 134.0], [10, 100]], 10, 3);
  const a = analisar(env, { textoColado: csv, nSensores: 3 });
  const esperado = 4 * Math.pow(10, (134 - 121.1) / 10); // 77,9935
  assert.ok(Math.abs(a.minF0 - esperado) < 1e-3, 'F0 ' + a.minF0 + ' esperado ' + esperado);
  assert.equal(a.statusAprovacao, 'APROVADO');
  assert.equal(criterio(a, 'tempoPatamar').situacao, 'CONFORME');
  assert.equal(criterio(a, 'tempoPatamar').valor, 4);
  // Memória do F0: soma das contribuições = F0 oficial; primeira leitura contribui com zero.
  const mem = a.memoriaF0PorSensor[0];
  assert.equal(mem[0].contribuicao, 0);
  assert.ok(Math.abs(mem.reduce((s, m) => s + m.contribuicao, 0) - a.f0PorSensor[0]) < 1e-3);
});

/* ---------------------------------------------------------------- critérios do patamar */
test('critérios: tempo de patamar curto, faixa, diferença entre sensores e equilíbrio', () => {
  const env = ambiente();
  // 2,5 min de patamar a 134,5 °C → tempo insuficiente (mínimo 3 min para 134 °C), F0 ainda acima de 15.
  let a = analisar(env, { textoColado: csvBlocos([[20, 100], [16, 134.5], [10, 100]], 10, 3), nSensores: 3 });
  assert.equal(criterio(a, 'tempoPatamar').situacao, 'NAO_CONFORME');
  assert.equal(a.statusAprovacao, 'REPROVADO');
  assert.ok(a.motivosReprovacao.some(m => /Tempo de patamar insuficiente/.test(m)));
  // Sensor 2 cai a 133,6 °C no meio do patamar (histerese mantém a exposição) → faixa não conforme.
  a = analisar(env, { textoColado: csvBlocos([[20, 100], [10, 134.5], [2, (s) => (s === 1 ? 133.6 : 134.5)], [13, 134.5], [10, 100]], 10, 3), nSensores: 3 });
  assert.equal(criterio(a, 'faixa').situacao, 'NAO_CONFORME');
  assert.match(criterio(a, 'faixa').motivo, /133,60 °C no sensor S2/);
  // Diferença de 2,5 °C entre sensores no patamar → não conforme (limite 2,0 °C).
  a = analisar(env, { textoColado: csvBlocos([[20, 100], [25, (s) => (s === 2 ? 136.6 : 134.1)], [10, 100]], 10, 3), nSensores: 3 });
  assert.equal(criterio(a, 'variacao').situacao, 'NAO_CONFORME');
  assert.equal(criterio(a, 'variacao').valor, 2.5);
  // Acima da faixa (137,0 °C) → não conforme.
  a = analisar(env, { textoColado: csvBlocos([[20, 100], [25, (s) => (s === 0 ? 137.3 : 136.0)], [10, 100]], 10, 3), nSensores: 3 });
  assert.equal(criterio(a, 'faixa').situacao, 'NAO_CONFORME');
  // Equilíbrio com intervalo de 30 s (> 15 s): não avaliado, sem reprovar.
  a = analisar(env, { textoColado: csvBlocos([[10, 100], [10, 134.5], [5, 100]], 30, 3), nSensores: 3 });
  assert.equal(criterio(a, 'equilibrio').situacao, 'NAO_AVALIADO');
  assert.equal(a.statusAprovacao, 'APROVADO');
  // Equilíbrio medido: o sensor 3 chega 20 s depois dos outros (intervalo 5 s) → 20 s > 15 s.
  const csvEq = csvBlocos([[40, 100], [4, (s) => (s === 2 ? 120 : 134.5)], [60, 134.5], [10, 100]], 5, 3);
  a = analisar(env, { textoColado: csvEq, nSensores: 3 });
  assert.equal(criterio(a, 'equilibrio').situacao, 'NAO_CONFORME');
  assert.equal(criterio(a, 'equilibrio').valor, 20);
});

test('critério do vapor saturado: pressão coerente é conforme; pressão relativa vira trava', () => {
  const env = ambiente();
  const p134 = A.pSatBar(134.5);
  let a = analisar(env, { textoColado: csvBlocos([[20, 100, 1.0], [25, 134.5, p134], [10, 100, 1.0]], 10, 3, true), nSensores: 3 });
  assert.equal(criterio(a, 'vaporSaturado').situacao, 'CONFORME');
  // 4 °C abaixo da saturação (ar na câmara): não conforme.
  a = analisar(env, { textoColado: csvBlocos([[20, 100, 1.0], [25, 134.5, A.pSatBar(138.5)], [10, 100, 1.0]], 10, 3, true), nSensores: 3 });
  assert.equal(criterio(a, 'vaporSaturado').situacao, 'NAO_CONFORME');
  assert.equal(a.statusAprovacao, 'REPROVADO');
  // Pressão relativa (bar g) no lugar de absoluta: diferença enorme → trava, nunca reprovação.
  a = analisar(env, { textoColado: csvBlocos([[20, 100, 0.0], [25, 134.5, p134 - 1.013], [10, 100, 0.0]], 10, 3, true), nSensores: 3 });
  assert.equal(criterio(a, 'vaporSaturado').situacao, 'NAO_AVALIADO');
  assert.ok(travas(a).includes('PRESSAO_INCOERENTE'));
});

/* ---------------------------------------------------------------- travas de qualidade */
test('travas: leitura impossível, sensor parado, pico no patamar, poucas leituras', () => {
  const env = ambiente();
  let a = analisar(env, { textoColado: csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 100], [25, 134.5], [10, 100]], 10, 3), nSensores: 3 });
  assert.ok(travas(a).includes('LEITURA_IMPOSSIVEL'));
  assert.ok(a.emissaoBloqueada);
  const rampa = (s, i) => (s === 2 ? 0 : 40 + i * 4);
  a = analisar(env, { textoColado: csvBlocos([[15, rampa], [25, (s) => (s === 2 ? 134.6 : 134.5)], [10, 100]], 10, 3), nSensores: 3 });
  assert.ok(travas(a).includes('SENSOR_PARADO'));
  a = analisar(env, { textoColado: csvBlocos([[20, 100], [10, 134.5], [1, (s) => (s === 0 ? 150 : 134.5)], [14, 134.5], [10, 100]], 10, 3), nSensores: 3 });
  assert.ok(travas(a).includes('PICO_NO_PATAMAR'));
  a = analisar(env, { textoColado: csvBlocos([[5, 100], [4, 134.5], [3, 100]], 60, 3), nSensores: 3 });
  assert.ok(travas(a).includes('POUCAS_LEITURAS'));
  // A mensagem diz o que corrigir.
  assert.ok(a.qualidadeDados.travas.every(t => t.oQue && t.porQue && t.comoCorrigir));
  // Desmarcar o sensor com falha libera a análise (a falha fica registrada como sensor desconsiderado).
  a = analisar(env, { textoColado: csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 100], [25, 134.5], [10, 100]], 10, 3), nSensores: 3, sensoresAtivos: [true, false, true] });
  igual(travas(a), []);
  igual(a.sensoresDesabilitados, ['S2']);
});

/* ---------------------------------------------------------------- leitura dos arquivos */
test('arquivo único no formato do registrador e um arquivo por sensor dão o mesmo resultado', () => {
  const env = ambiente();
  const linhas = A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const idCompleto = env.criarArquivo('ciclo completo.csv', 'text/csv', A.csvCompleto(linhas));
  const completo = analisar(env, { modoEntrada: 'FILE_ID', fileId: idCompleto, nSensores: 3 });
  assert.equal(completo.statusAprovacao, 'APROVADO');
  const ids = [0, 1, 2].map(k => env.criarArquivo('sensor ' + (k + 1) + '.csv', 'text/csv', A.csvIndividual(linhas, k, k === 1 ? 3 : 0)));
  const idP = env.criarArquivo('pressao.csv', 'text/csv', A.csvPressao(linhas));
  const r = env.fn('AutoRel_acExecutarAnaliseCompleta_')(payloadBase({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: ids, arquivoPressao: idP, nSensores: 3 }));
  const ind = r.analise;
  assert.equal(ind.statusAprovacao, 'APROVADO');
  igual(travas(ind), []);
  // Coluna "Nº" do registrador individual não vira temperatura nem pressão.
  assert.ok(Math.abs(ind.minF0 - completo.minF0) < 0.5, ind.minF0 + ' × ' + completo.minF0);
  assert.equal(criterio(ind, 'vaporSaturado').situacao, 'CONFORME');
  assert.equal(r.payload._mesclagem.sensores[1].maiorDefasagemSeg, 3);
  // Arquivo de um sensor que termina antes do fim da exposição → trava (leitura faltando).
  const curto = A.csvIndividual(linhas.slice(0, 75), 2);
  ids[2] = env.criarArquivo('sensor 3 curto.csv', 'text/csv', curto);
  const r2 = env.fn('AutoRel_acExecutarAnaliseCompleta_')(payloadBase({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: ids, arquivoPressao: idP, nSensores: 3 }));
  assert.ok(travas(r2.analise).includes('LEITURA_FALTANDO'));
  // Sensor ativo sem arquivo: mensagem diz o que fazer.
  assert.throws(() => env.fn('AutoRel_acExecutarAnaliseCompleta_')(payloadBase({ modoEntrada: 'ARQUIVO_POR_SENSOR', arquivosPorSensor: [ids[0], '', ids[2]], nSensores: 3 })), /S2.*Envie o arquivo/);
});

test('cabeçalho sem coluna de pressão não inventa pressão a partir de outra coluna', () => {
  const env = ambiente();
  const txt = 'Nº;Data;Hora;Temperatura (°C)\n1;10/10/2026;09:00:00;30,5\n2;10/10/2026;09:00:10;31,5\n3;10/10/2026;09:00:20;32,5\n4;10/10/2026;09:00:30;33,5';
  const rich = env.fn('AutoRel_lerDadosEntradaRich_')({ modoEntrada: 'COLAR', textoColado: txt });
  const linhas = env.fn('AutoRel_normalizarMatrizParaAnalise')(rich.matrix, rich.displayMatrix, 1, 'BR');
  assert.equal(linhas[0].temperaturas[0], 30.5);
  assert.equal(linhas[0].pressao, null);
});

test('envio do arquivo: pasta antiga inexistente usa a pasta própria; pasta de laudos idem', () => {
  const env = ambiente();
  const r = env.fn('AutoRel_apiDispatch')({ sessionId: 'tec', fn: 'apiUploadArquivo', payload: { fileName: 'registrador.csv', mimeType: 'text/csv', base64: Buffer.from('Data;Hora;S1\n').toString('base64') } });
  assert.ok(r.fileId);
  assert.ok(env.props.AUTOREL_UPLOAD_PASTA_ID);
  const pasta = env.fn('SGO_DocSalvar_pastaPersistente_')('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', '1FiWs9EmnnOBnFNqmXYF2oF-8flfRDgiQ');
  assert.equal(pasta.getName(), 'Autoclave - Laudos');
  const ping = env.fn('AutoRel_apiPing')();
  assert.doesNotMatch(ping.laudosUrl + ping.uploadsUrl, /drive\.google\.com/);
});

/* ---------------------------------------------------------------- conferência da IA */
test('verificador do texto da IA: número, norma, cláusula, veredito, termos proibidos', () => {
  const env = ambiente();
  const V = env.fn('SGO_QIAV_verificar_');
  const regras = { numeros: [77.99, 134, 15, 4, 121.1], normas: ['ABNT NBR ISO 17665-1 — Calor úmido', 'EN 285 — grande porte'], veredito: 'APROVADO', exigirVeredito: true };
  assert.ok(V('O F0 mínimo foi de 77,99 min a 134 °C, acima de 15 min (ABNT NBR ISO 17665-1). O ensaio está APROVADO.', regras).ok);
  assert.ok(V('O F0 foi de 78,0 min. O ensaio está APROVADO.', regras).ok, 'arredondamento mostrado é aceito');
  assert.match(V('O F0 foi de 81,24 min. O ensaio está APROVADO.', regras).problemas.join(), /81,24/);
  assert.match(V('Conforme a ABNT NBR 16328, o ensaio está APROVADO.', regras).problemas.join(), /16328/);
  assert.match(V('Conforme a cláusula 8.3 da EN 285, o ensaio está APROVADO.', regras).problemas.join(), /cláusula/);
  assert.match(V('O ensaio está REPROVADO.', regras).problemas.join(), /afirma reprovação/);
  assert.match(V('O ensaio está aprovado com ressalvas.', regras).problemas.join(), /proibida/);
  assert.match(V('Os resultados indicam boa condição.', regras).problemas.join(), /não declara/);
  assert.match(V('A pressão ficou estável. O ensaio está APROVADO.', Object.assign({}, regras, { termosProibidos: [/press[aã]o/i] })).problemas.join(), /fora do escopo/);
});

function respostaIA(texto) {
  return () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] } }] }) });
}

test('rascunho: texto da IA com número inventado é trocado pelo texto padrão; texto correto é aceito', () => {
  const linhas = A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const p = payloadBase({ textoColado: A.csvCompleto(linhas), nSensores: 3 });
  const ruim = '###ANALISE:CICLO_TERMICO###\nO F0 foi de 999,99 min.\n###CONCLUSAO_TECNICA###\nO ensaio está APROVADO.\n###CONCLUSAO_LEIGO###\nTudo certo, aprovado.\n###FIM###';
  let env = ambiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: respostaIA(ruim) });
  let r = env.fn('AutoRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' });
  assert.equal(r.origemTexto, 'PADRAO');
  assert.match(r.avisoIA, /999,99/);
  assert.match(r.textos.conclusaoGeral, /O ensaio está APROVADO/);
  // O texto padrão passa na própria conferência (números, normas e veredito).
  assert.ok(env.fn('AutoRel_acConferirTextos_')(r.contexto, r.textos, true).ok);
  const minF0 = env.fn('SGO_DocA4_num_')(r.contexto.estudos[0].fatos.minF0, 2);
  const bom = '###ANALISE:CICLO_TERMICO###\nO menor F0 da exposição foi de ' + minF0 + ' min, acima do mínimo de 15,00 min.\n###CONCLUSAO_TECNICA###\nCom F0 mínimo de ' + minF0 + ' min, o ensaio está APROVADO.\n###CONCLUSAO_LEIGO###\nO calor foi suficiente em todos os pontos. O resultado é aprovado.\n###FIM###';
  env = ambiente({ props: { GEMINI_API_KEY: 'chave-de-teste' }, fetch: respostaIA(bom) });
  r = env.fn('AutoRel_apiGerarRascunhoCertificado')(p, { perfil: 'TECNICO' });
  assert.equal(r.origemTexto, 'IA', r.avisoIA);
});

/* ---------------------------------------------------------------- emissão com aprovação */
test('emissão: só o aprovador emite, com confirmação; reemissão gera revisão; fluxo enviar/aprovar/devolver', () => {
  const env = ambiente();
  const D = env.fn('AutoRel_apiDispatch');
  const linhas = A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const p = payloadBase({ textoColado: A.csvCompleto(linhas), nSensores: 3 });
  const r = D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: p });
  assert.equal(r.podeAprovar, false);
  const final = Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos });
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) }), /Enviar para aprovação/);
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: final }), /Conferi os dados/);
  // Texto revisado que contradiz o resultado é recusado.
  const contraditorio = Object.assign({}, final, { confirmacaoRevisao: true, textosCertificado: Object.assign({}, r.textos, { conclusaoGeral: 'O ensaio está REPROVADO.' }) });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: contraditorio }), /resultado calculado é APROVADO/);
  const e1 = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) });
  assert.equal(e1.revisao, 0);
  assert.match(e1.html, /Revisado e aprovado para emissão por<\/b> Responsável Teste/);
  const e2 = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({ confirmacaoRevisao: true }, final) });
  assert.equal(e2.revisao, 1);
  const regs = env.fn('SGO_QE_listar_')('AUTOCLAVE');
  igual(regs.map(x => x.STATUS).sort(), ['EMITIDO', 'SUBSTITUIDO']);
  // Técnico envia; aprovador vê a prévia (minuta), aprova e emite.
  const env2 = env; // mesmo banco de registros
  const envio = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: final });
  const lista = D({ sessionId: 'rt', fn: 'apiListarAprovacoes', payload: {} });
  assert.ok(lista.itens.some(i => i.id === envio.id && i.status === 'AGUARDANDO_APROVACAO'));
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiPreverAprovacao', payload: { id: envio.id } }), /Somente o responsável técnico/);
  const prev = D({ sessionId: 'rt', fn: 'apiPreverAprovacao', payload: { id: envio.id } });
  assert.match(prev.html, /MINUTA PARA CONFERÊNCIA/);
  const e3 = D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: envio.id, confirmacaoRevisao: true } });
  assert.equal(e3.revisao, 2);
  assert.equal(env2.fn('SGO_QE_obter_')(envio.id).STATUS, 'EMITIDO');
  // Devolução exige motivo.
  const envio2 = D({ sessionId: 'tec', fn: 'apiEnviarParaAprovacao', payload: final });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiDevolverAprovacao', payload: { id: envio2.id, motivo: 'não' } }), /motivo/);
  D({ sessionId: 'rt', fn: 'apiDevolverAprovacao', payload: { id: envio2.id, motivo: 'Confira a posição do sensor 2 na carga.' } });
  assert.equal(env.fn('SGO_QE_obter_')(envio2.id).STATUS, 'DEVOLVIDO');
});

test('travas impedem rascunho e emissão; registrador fora do cadastro também', () => {
  const env = ambiente();
  const csv = csvBlocos([[2, (s) => (s === 1 ? -54.61 : 30)], [18, 100], [25, 134.5], [10, 100]], 10, 3);
  const r = env.fn('AutoRel_apiGerarRascunhoCertificado')(payloadBase({ textoColado: csv, nSensores: 3 }), { perfil: 'GESTOR' });
  assert.equal(r.bloqueado, true);
  assert.ok(r.travas.some(t => t.codigo === 'LEITURA_IMPOSSIVEL'));
  const r2 = env.fn('AutoRel_apiGerarRascunhoCertificado')(payloadBase({ textoColado: csvBlocos([[20, 100], [25, 134.5], [10, 100]], 10, 3), nSensores: 3, certDataLogger: 'DTL-XX' }), { perfil: 'GESTOR' });
  assert.ok(r2.travas.some(t => t.codigo === 'REGISTRADOR_NAO_CADASTRADO'));
  // Planilha de dados também não sai.
  assert.throws(() => env.fn('AutoRel_apiConverter')(payloadBase({ textoColado: csv, nSensores: 3 })), /Como corrigir/);
});

/* ---------------------------------------------------------------- ensaio só de temperatura */
test('"Analisar pressão" desligado: justificativa obrigatória; documento sem pressão fora do escopo', () => {
  const env = ambiente();
  const D = env.fn('AutoRel_apiDispatch');
  const linhas = A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 });
  const base = payloadBase({ textoColado: A.csvCompleto(linhas), nSensores: 3, analisarPressao: false });
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiGerarRascunhoCertificado', payload: base }), /justificativa/);
  const just = 'equipamento sem ponto para instalar o transmissor de pressão';
  const p = Object.assign({}, base, { justificativaSemPressao: just });
  const r = D({ sessionId: 'rt', fn: 'apiGerarRascunhoCertificado', payload: p });
  assert.equal(r.bloqueado, false);
  assert.ok(!r.contexto.criterios.some(c => c.chave === 'vaporSaturado'));
  assert.ok(!r.contexto.travas.length, 'falta de pressão não é acusada');
  assert.ok(r.contexto.criterios.filter(c => c.conforme !== null).every(c => c.conforme === true));
  const e = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({}, p, { confirmacaoRevisao: true, assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos }) });
  const texto = e.html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const fraseEscopo = 'Este ensaio considerou somente a temperatura: ' + just + '.';
  assert.ok(texto.includes(fraseEscopo));
  const resto = texto.split(fraseEscopo).join(' ');
  const achado = resto.match(/.{0,80}(press[aã]o|\bkpa\b|\bbar\b|v[aá]cuo|estanqueidade).{0,40}/i);
  assert.equal(achado && achado[0], null);
  assert.match(texto, /pequeno porte \(cassete\)/);
  // A IA (ou o técnico) não pode citar pressão neste ensaio.
  const comPressao = Object.assign({}, p, { confirmacaoRevisao: true, assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: Object.assign({}, r.textos, { conclusaoGeral: r.textos.conclusaoGeral + ' A pressão ficou estável.' }) });
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: comPressao }), /fora do escopo/);
  // Teste de estanqueidade depende da pressão: recusado com explicação.
  assert.throws(() => env.fn('AutoRel_acExecutarAnaliseLeakTestCompleta_')(Object.assign({}, p, { tipoRelatorio: 'LEAK_TEST', leakTest: { inicio: '10/10/2026 08:00:00', fim: '10/10/2026 08:10:00' } })), /estanqueidade é avaliado pela pressão/);
});

/* ---------------------------------------------------------------- estanqueidade */
test('teste de estanqueidade: pressão caindo e janela curta viram travas', () => {
  const env = ambiente();
  const blocoP = (p0, taxa) => (i) => (p0 + taxa * i / 6).toFixed(2);
  const csv = (taxa, n) => csvBlocos([[n, 25, blocoP(50, taxa)]], 10, 2, true);
  const leak = (txt, ini, fim) => env.fn('AutoRel_acExecutarAnaliseLeakTestCompleta_')(payloadBase({ textoColado: txt, nSensores: 2, tipoRelatorio: 'LEAK_TEST', leakTest: { inicio: ini, fim: fim, unidadePressao: 'MBAR' } })).analiseLeak;
  let a = leak(csv(0.8, 70), '10/10/2026 09:00:00', '10/10/2026 09:11:00');
  assert.equal(a.statusAprovacao, 'APROVADO');
  assert.ok(Math.abs(a.taxaVazamentoMbarMin - 0.8) < 0.01);
  igual(a.qualidadeDados.travas, []);
  a = leak(csv(-0.8, 70), '10/10/2026 09:00:00', '10/10/2026 09:11:00');
  assert.ok(a.qualidadeDados.travas.some(t => t.codigo === 'PRESSAO_CAIU'));
  a = leak(csv(0.8, 70), '10/10/2026 09:00:00', '10/10/2026 09:05:00');
  assert.ok(a.qualidadeDados.travas.some(t => t.codigo === 'JANELA_CURTA'));
});

test('data guardada como data de planilha vale antes do texto exibido (servidor mostra m/d/aa)', () => {
  const env = ambiente();
  const m = [['Data', 'Hora', 'S1']], d = [['Data', 'Hora', 'S1']];
  for (let i = 0; i < 5; i++) {
    m.push([new Date(2026, 9, 5), '08:00:' + String(i * 10).padStart(2, '0'), 30 + i]);
    d.push(['10/5/26', '08:00:' + String(i * 10).padStart(2, '0'), String(30 + i)]);
  }
  const linhas = env.fn('AutoRel_normalizarMatrizParaAnalise')(m, d, 1, 'AUTO');
  assert.equal(linhas[0].tempoStr, '05/10/2026 08:00:00');
  assert.equal(linhas[4].tempoStr, '05/10/2026 08:00:40');
});

test('duração em minutos não é arredondada a 1 casa antes da taxa de vazamento', () => {
  const env = ambiente();
  const f = env.fn('AutoRel_calcularDiferencaTempo');
  assert.equal(f('', '', new Date(2026, 0, 1, 8, 0, 0), new Date(2026, 0, 1, 8, 3, 50)), 3.8333);
});
