// Cadeia de frio (21/10/2026): arquivo do registrador com uma aba por estudo (24 h, abertura de porta, queda de
// energia), horário do evento entre duas leituras ou colado com tabulação, trava de horário fora das leituras com o
// período importado e a leitura mais próxima, registrador com certificado renovado cadastrado à parte e a
// conferência antecipada da tela (apiConferirDados). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('./_cadeiafrio_ambiente.cjs');

const T0 = new Date(2026, 8, 17, 11, 10, 0);
const dd = x => String(x).padStart(2, '0');
const data = d => dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear();
const hora = d => dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds());

/** Aba no formato do registrador: DATA | HORA | ST-01 (C) ... (cabeçalho que antes não era reconhecido). */
function aba(nome, inicio, dtSeg, n, temp) {
  const m = [['DATA', 'HORA', 'ST-01 (C)', 'ST-02 (C)', 'ST-03 (C)']];
  for (let k = 0; k < n; k++) {
    const d = new Date(inicio.getTime() + k * dtSeg * 1000);
    m.push([data(d), hora(d)].concat([0, 1, 2].map(s => String(temp(s, k)))));
  }
  return { nome, matrix: m, displayMatrix: m };
}

const PORTA0 = new Date(2026, 8, 18, 11, 20, 0);
const ENERGIA0 = new Date(2026, 8, 18, 11, 45, 0);
function abasDoEnsaio() {
  return [
    aba('Ensaio 24h', T0, 60, 1441, () => 5),
    aba('Porta Aberta', PORTA0, 10, 121, (s, k) => Math.min(7.5, 4 + 0.03 * k + s * 0.1)),
    aba('Queda de Energia', ENERGIA0, 10, 181, (s, k) => Math.min(7.6, 4.5 + 0.015 * k + s * 0.1))
  ];
}

/** Ambiente em que o arquivo do registrador (FILE_ID) chega com várias abas, como um XLSX de três abas. */
function ambienteComAbas(abas) {
  const env = C.criarAmbiente();
  env.ctx.__ABAS_TESTE = abas;
  env.run('CadeiaFrioRel_lerDadosEntradaRich_ = function (p) { var a = __ABAS_TESTE.map(function (x) { var t = CadeiaFrioRel_prepararTabelaDatas_(x.matrix, x.displayMatrix); return { nome: x.nome, matrix: t.matrix, displayMatrix: t.displayMatrix }; });' +
    ' return { matrix: a[0].matrix, displayMatrix: a[0].displayMatrix, diagnostico: {}, abas: p.permitirVariasAbas && a.length > 1 ? a : null }; };');
  return env;
}

function payloadEnsaio(extra) {
  return C.payload(Object.assign({
    modoEntrada: 'FILE_ID', fileId: 'arquivo-teste', nSensores: 3, dateStyle: 'AUTO',
    estudos: {
      distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: '17/09/2026 11:10:00', fim: '18/09/2026 11:10:00' },
      // Horários colados da planilha: data e hora separadas por tabulação e espaços duplos.
      aberturaPorta: { habilitado: true, tipoAbertura: 'TOTAL', inicioEvento: '18/09/2026\t 11:20:00', fimEvento: '18/09/2026  11:25:00' },
      quedaEnergia: { habilitado: true, inicioEvento: '18/09/2026  11:45:00', fimEvento: '' }
    }
  }, extra || {}));
}

test('cabeçalho "DATA | HORA | ST-01 (C)" é reconhecido como aba de leituras', () => {
  const env = C.criarAmbiente();
  const sensor = env.fn('CadeiaFrioRel_ehCabecalhoSensor_');
  ['st-01 (c)', 's-01', 't1 (°c)', 'temperatura', 's1', 'sensor 3'].forEach(v => assert.ok(sensor(v), v));
  ['data', 'hora', 'umidade', 'observacao'].forEach(v => assert.ok(!sensor(v), v));
  assert.ok(env.fn('CadeiaFrioRel_abaTemLeituras_')(abasDoEnsaio()[1].matrix));
});

test('arquivo com uma aba por estudo: cada estudo usa a sua aba e o evento colado com tabulação é aceito', () => {
  const env = ambienteComAbas(abasDoEnsaio());
  const r = env.fn('CadeiaFrioRel_cfExecutarAnaliseCompleta_')(payloadEnsaio());
  assert.equal(r.dadosCompletos._abas.length, 3);
  const porTipo = {};
  r.analises.forEach(a => { porTipo[a.tipoEstudo] = a; });
  assert.ok(!porTipo.ABERTURA_PORTA.janelaInvalida, 'porta dentro das leituras');
  assert.ok(!porTipo.QUEDA_ENERGIA.janelaInvalida, 'energia dentro das leituras');
  assert.equal(porTipo.ABERTURA_PORTA.tempoInicioEvento, '18/09/2026 11:20:00');
  assert.equal(porTipo.QUEDA_ENERGIA.tempoInicioEvento, '18/09/2026 11:45:00');
  assert.ok(porTipo.ABERTURA_PORTA._dadosFatia.every(l => l.aba === 'Porta Aberta'));
  assert.ok(porTipo.QUEDA_ENERGIA._dadosFatia.every(l => l.aba === 'Queda de Energia'));
  assert.ok(porTipo.DISTRIBUICAO_VAZIO._dadosFatia.every(l => l.aba === 'Ensaio 24h'));
  assert.equal(porTipo.DISTRIBUICAO_VAZIO._dadosFatia.length, 1441);
  // Sem lacuna entre abas nas travas (cada estudo fica na sua aba).
  const ctx = env.fn('CadeiaFrioRel_qContexto_')(payloadEnsaio());
  assert.equal(JSON.stringify(ctx.travas.map(t => t.codigo).filter(c => /LACUNA|EVENTO_FORA/.test(c))), "[]");
});

test('abas com horários sobrepostos são recusadas com o período de cada aba', () => {
  const abas = abasDoEnsaio();
  abas[2] = aba('Repetida', new Date(2026, 8, 18, 11, 30, 0), 10, 30, () => 5);
  const env = ambienteComAbas(abas);
  assert.throws(() => env.fn('CadeiaFrioRel_cfExecutarAnaliseCompleta_')(payloadEnsaio()), /"Porta Aberta" \(de 18\/09\/2026 11:20:00 a 18\/09\/2026 11:40:00\) e "Repetida".*mesmo período/);
});

test('arquivo só com a aba de 24 h: a trava mostra o período importado e a leitura mais próxima', () => {
  const env = ambienteComAbas([abasDoEnsaio()[0]]);
  const ctx = env.fn('CadeiaFrioRel_qContexto_')(payloadEnsaio());
  const t = ctx.travas.filter(x => x.codigo === 'EVENTO_FORA_DOS_DADOS');
  assert.equal(t.length, 2);
  assert.match(t[0].oQue, /\(18\/09\/2026 11:20:00\)/, 'horário sem a tabulação');
  assert.match(t[0].oQue, /vão de 17\/09\/2026 11:10:00 a 18\/09\/2026 11:10:00/);
  assert.match(t[0].oQue, /leitura mais próxima do horário informado é 18\/09\/2026 11:10:00, 10 min antes/);
  assert.match(t[1].oQue, /18\/09\/2026 11:10:00, 35 min antes/);
  assert.match(t[0].comoCorrigir, /seção 3/);
});

test('horário do evento entre duas leituras usa a leitura mais próxima', () => {
  const env = ambienteComAbas(abasDoEnsaio());
  const p = payloadEnsaio();
  p.estudos.aberturaPorta.inicioEvento = '18/09/2026 11:20:03';
  p.estudos.quedaEnergia.inicioEvento = '18/09/2026 11:45:08';
  const r = env.fn('CadeiaFrioRel_cfExecutarAnaliseCompleta_')(p);
  const porTipo = {};
  r.analises.forEach(a => { porTipo[a.tipoEstudo] = a; });
  assert.equal(porTipo.ABERTURA_PORTA.tempoInicioEvento, '18/09/2026 11:20:00');
  assert.equal(porTipo.QUEDA_ENERGIA.tempoInicioEvento, '18/09/2026 11:45:10');
  // Até um intervalo depois da última leitura também vale a mais próxima; além disso, null.
  const dados = r.dadosCompletos.filter(l => l.aba === 'Porta Aberta');
  const achar = env.fn('CadeiaFrioRel_cfLocalizarIndiceMaisProximo_');
  assert.equal(achar(dados, '18/09/2026 11:40:05'), dados.length - 1);
  assert.equal(achar(dados, '18/09/2026 11:41:00'), null);
  assert.equal(achar(dados, '18/09/2026 11:19:00'), null);
});

test('registrador: vale o certificado válido na data do ensaio; vencido diz o caminho na tela', () => {
  const env = C.criarAmbiente();
  env.run('SGO_DATA.insert("CAD_PADROES", { TAG: "DTL-REN", CERTIFICADO_NUMERO: "CAL-ANTIGO", VALIDADE: "15/09/2026", STATUS: "ATIVO" });' +
    'SGO_DATA.insert("CAD_PADROES", { TAG: "DTL-REN", CERTIFICADO_NUMERO: "CAL-NOVO", VALIDADE: "15/09/2027", STATUS: "ATIVO" });');
  const reg = env.fn('SGO_DocA4_registradores_')('DTL-REN', '17/09/2026');
  assert.equal(reg.itens[0].certificado, 'CAL-NOVO');
  assert.equal(reg.itens[0].conforme, true);
  const venc = env.fn('SGO_DocA4_registradores_')('DTL-VENC', '17/09/2026');
  const trava = env.fn('CadeiaFrioRel_qTravasRegistrador_')(venc, false)[0];
  assert.equal(trava.codigo, 'REGISTRADOR_VENCIDO');
  assert.equal(trava.campo, 'certDataLogger');
  assert.match(trava.oQue, /ensaio em 17\/09\/2026, validade 01\/01\/2025/);
  assert.match(trava.comoCorrigir, /Calibração › Padrões de referência, procure DTL-VENC, clique em Editar/);
});

test('conferência antecipada: travas com o campo da tela, sem gerar documento e sem lançar', () => {
  const env = ambienteComAbas(abasDoEnsaio());
  const p = payloadEnsaio({ grandezas: { umidade: { medida: false, justificativa: '' } }, certDataLogger: 'DTL-VENC' });
  const r = env.dispatch('tec', 'apiConferirDados', p);
  assert.equal(r.ok, true);
  const porCodigo = {};
  r.travas.forEach(t => { porCodigo[t.codigo] = t; });
  assert.equal(porCodigo.GRANDEZA_SEM_JUSTIFICATIVA.campo, 'umidadeJustificativa');
  assert.match(porCodigo.GRANDEZA_SEM_JUSTIFICATIVA.comoCorrigir, /Por que a umidade não foi medida/);
  assert.equal(porCodigo.REGISTRADOR_VENCIDO.campo, 'certDataLogger');
  assert.match(r.periodo, /3 abas/);
  assert.equal(r.abas.length, 3);
  // Erro de leitura volta como texto, sem lançar.
  const sem = env.dispatch('tec', 'apiConferirDados', Object.assign(payloadEnsaio(), { perfil: 'NAO_EXISTE' }));
  assert.equal(sem.ok, true);
  assert.match(sem.erro, /Perfil/);
});

test('tela: conferência antecipada ligada e script do módulo compila', () => {
  const src = fs.readFileSync(path.join(C.A.BASE, 'SGO_CadeiaFrioRel_ConteudoModulo.js'), 'utf8').replace(/\r\n/g, '\n');
  const l1 = src.split('\n')[0];
  const conteudo = JSON.parse(l1.slice(l1.indexOf('=') + 2, l1.length - 1));
  const script = conteudo.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /fn: 'apiConferirDados'/);
  assert.match(script, /tplCadeiaFrioRel_ligarConferencia_\(\);/);
  assert.match(script, /Abas com leituras no arquivo/);
});

test('estufa e banho-maria: evento até um intervalo depois da última leitura usa a última; fora, a mensagem mostra o período', () => {
  const E = require('./_estufa_ambiente.cjs');
  const env = E.criarAmbiente();
  env.run("var __d = []; for (var k = 0; k < 60; k++) { var d = new Date(2026, 8, 18, 11, 20, k * 10); __d.push({ tempoDate: d, tempoStr: Utilities.formatDate(d, EstufaBanhoRel_EBCFG.TZ, 'dd/MM/yyyy HH:mm:ss'), temperaturas: [37, 37] }); }");
  const analisar = h => env.run("EstufaBanhoRel_ebAnalisarEventoRuptura(__d, { tMin: 35, tMax: 39, tolerancia: 0 }, [true, true], { inicioEvento: '" + h + "' }, 'ABERTURA_PORTA', {})");
  assert.equal(analisar('18/09/2026 11:29:55').tempoInicioEvento, '18/09/2026 11:29:50');
  assert.throws(() => analisar('18/09/2026 12:30:00'), /vão de 18\/09\/2026 11:20:00 a 18\/09\/2026 11:29:50; a leitura mais próxima é 18\/09\/2026 11:29:50/);
});
