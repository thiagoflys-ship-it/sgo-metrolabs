// Estufa, banho-maria e secadora — qualificação térmica, modelo novo (21/10/2026): motor conferido contra
// casos calculados à mão, critérios com fonte, travas, aprovação do responsável técnico e revisões,
// conferência dos textos, vínculo com o cadastro e relatório de qualificação do equipamento.
// Só dados de teste; sem depender da hora real (datas fixas nos dados).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('./_estufa_ambiente.cjs');

function rascunho(env, sid, p) { return env.estufa(sid, 'apiQGerarRascunho', p); }
function codigos(r) { return (r.travas || []).map(t => t.codigo); }

test('estatística por sensor, uniformidade e estabilidade batem com o cálculo à mão', () => {
  const env = E.criarAmbiente();
  // 3 sensores, 4 leituras: S1 = 35, 35.2, 35.4, 35.2; S2 = 34.8 constante; S3 = 35.6, 35.6, 35.0, 35.6
  const t0 = new Date(2026, 9, 5, 8, 0, 0).getTime();
  const linhas = [[35, 34.8, 35.6], [35.2, 34.8, 35.6], [35.4, 34.8, 35.0], [35.2, 34.8, 35.6]].map((t, i) => ({ tempoDate: new Date(t0 + i * 60000), tempoStr: 'L' + i, temperaturas: t }));
  env.ctx.__l = linhas;
  const r = JSON.parse(JSON.stringify(env.run('EstufaQ_estatistica_(__l, [0,1,2], { tMin: 34.9, tMax: 36 })')));
  const s1 = r.porSensor[0];
  assert.strictEqual(s1.min, 35); assert.strictEqual(s1.max, 35.4); assert.strictEqual(s1.media, 35.2);
  // desvio-padrão amostral de S1: √[(0,04 + 0 + 0,04 + 0) / 3] = 0,1633
  assert.strictEqual(s1.desvioPadrao, 0.163);
  assert.strictEqual(s1.estabilidade, 0.2);
  // uniformidade: maior (máx − mín) no instante = 35,6 − 34,8 = 0,8 (leituras 0, 1 e 3)
  assert.strictEqual(r.uniformidade.max, 0.8);
  assert.strictEqual(r.uniformidade.instante, 'L0');
  // média das diferenças: (0,8 + 0,8 + 0,6 + 0,8) / 4 = 0,75
  assert.strictEqual(r.uniformidade.media, 0.75);
  assert.deepStrictEqual(r.piorEstabilidade, { sensor: 'S3', valor: 0.3 });
  // S2 ficou 3 minutos abaixo de 34,9 (4 leituras; a última não abre intervalo)
  assert.strictEqual(r.porSensor[1].minutosForaFaixa, 3);
  assert.strictEqual(r.global.min, 34.8); assert.strictEqual(r.global.sensorMin, 'S2');
});

test('incerteza: U do registrador, resolução e componentes do volume útil (k = 2)', () => {
  const env = E.criarAmbiente();
  const r = JSON.parse(JSON.stringify(env.run('EstufaQ_incerteza_({ itens: [{ tag: "R", incertezaU95: 0.3, fatorK: 2 }] }, 0.1, { piorEstabilidade: { valor: 0.15 }, uniformidade: { max: 0.6 } })')));
  // u_cal = 0,15; u_res = 0,1/(2√3) = 0,0289; U = 2·√(0,0225 + 0,000833) = 0,3055
  assert.strictEqual(r.uCal, 0.15); assert.strictEqual(r.uRes, 0.029); assert.strictEqual(r.Umedicao, 0.31);
  // u_estab = 0,15/√3 = 0,0866; u_unif = 0,6/(2√3) = 0,1732; U = 2·√(0,023333 + 0,0075 + 0,03) = 0,4933
  assert.strictEqual(r.uEstab, 0.087); assert.strictEqual(r.uUnif, 0.173); assert.strictEqual(r.Uvolume, 0.49);
  assert.strictEqual(env.run('EstufaQ_incerteza_({ itens: [{ tag: "R" }] }, 0.1, null)'), null);
});

test('letalidade pela regra dos trapézios: temperatura constante na de referência soma os minutos', () => {
  const env = E.criarAmbiente();
  const t0 = new Date(2026, 9, 5, 8, 0, 0).getTime();
  env.ctx.__l = [0, 30, 60, 90].map(s => ({ tempoDate: new Date(t0 + s * 1000), tempoStr: String(s), temperaturas: [250, 250 + 46.4] }));
  const r = JSON.parse(JSON.stringify(env.run('EstufaQ_letalidadeRepeticao_(__l, [0, 1], { tBase: 250, z: 46.4 })')));
  assert.strictEqual(r.porSensor[0].valor, 1.5); // 90 s a 250 °C = 1,5 min
  assert.strictEqual(r.porSensor[1].valor, 15); // um z acima: fator 10
  assert.strictEqual(r.pior.sensor, 'S1');
});

test('motor antigo: na letalidade, leitura anterior vazia não entra como 0 °C', () => {
  const env = E.criarAmbiente();
  const t0 = new Date(2026, 9, 5, 8, 0, 0).getTime();
  env.ctx.__r = [[0, [250]], [60, [null]], [120, [250]], [180, [250]]].map(([s, t]) => ({ tempoDate: new Date(t0 + s * 1000), tempoStr: String(s), temperaturas: t }));
  // Sem validar a seleção (a leitura vazia é proposital): chama a integração direto.
  env.run('EstufaBanhoRel_ebValidarDadosSelecionados_ = function () {};');
  const r = JSON.parse(JSON.stringify(env.run('EstufaBanhoRel_ebAnalisarPenetracaoELetalidade_([__r], { tMin: 200, tMax: 300, tolerancia: 0 }, [true], { tBase: 250, z: 46.4, valorLabel: "FD", usaIndicadorBiologico: false, fdMinimoNormativo: 1 }, { valorMinimoExigido: 0.5 })')));
  assert.strictEqual(r.repeticoes[0].letalidadePorSensor[0], 1); // só o intervalo 120–180 s soma
});

test('estufa de incubação conforme: aprovado, critérios com fonte e sem travas', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const r = rascunho(env, 'tec', E.payloadIncubacao(s));
  assert.strictEqual(r.bloqueado, false, JSON.stringify(r.travas));
  assert.strictEqual(r.contexto.statusConsolidado, 'APROVADO');
  const faixa = r.contexto.criterios.find(c => c.chave === 'FAIXA');
  assert.strictEqual(faixa.conforme, true);
  assert.match(faixa.obtido.replace(/ /g, ' '), /34,70 °C \(S5\).*35,30 °C \(S8\)/);
  r.contexto.criterios.forEach(c => assert.ok(c.referencia, 'critério sem referência: ' + c.criterio));
  assert.ok(r.contexto.normas[0].indexOf('ABNT NBR 16328:2024 — Esterilização de produtos para saúde') === 0);
  // Identificação vem do cadastro (o payload não trouxe TAG nem CNPJ).
  assert.strictEqual(r.contexto.identificacao.tag, 'EST-TESTE-01');
  assert.strictEqual(r.contexto.identificacao.cnpj, '11.222.333/0001-81');
  // Fabricante do cadastro não aparece no documento (nem na descrição do registrador).
  assert.ok(!/MARCAFICTICIA|MODELOEST/.test(JSON.stringify(r.contexto)));
  assert.match(r.avisoIA, /texto padrão/);
});

test('uma leitura fora da faixa reprova: sem "aprovado com observação"', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({ evento: (min, k, v) => (k === 3 && min >= 600 && min < 603 ? 37.2 : v) });
  const r = rascunho(env, 'tec', E.payloadIncubacao(s, { tolerancia: '0,5' }));
  assert.strictEqual(r.contexto.statusConsolidado, 'REPROVADO');
  assert.match(r.contexto.naoConformidades[0], /temperatura em todos os pontos/);
  assert.ok(!/COM_ALERTA|com observação/i.test(JSON.stringify(r.contexto.estudos.map(e => e.statusAprovacao))));
  assert.match(r.textos.conclusaoGeral, /REPROVADO/);
});

test('limites do protocolo: uniformidade, estabilidade e desvio da temperatura programada', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const r = rascunho(env, 'tec', E.payloadIncubacao(s, { qualif: { setpoint: '35', resolucao: '0,1', limUniformidade: '0,5', limEstabilidade: '0,5', limDesvioSetpoint: '0,2' } }));
  const c = k => r.contexto.criterios.find(x => x.chave === k);
  assert.strictEqual(c('UNIFORMIDADE').conforme, false); // 0,60 > 0,50
  assert.strictEqual(c('ESTABILIDADE').conforme, true);
  assert.strictEqual(c('SETPOINT').conforme, true);
  assert.strictEqual(r.contexto.statusConsolidado, 'REPROVADO');
});

test('travas: duração menor que 24 h e intervalo maior que 60 s (Anexo F), liberadas só com justificativa', () => {
  const env = E.criarAmbiente();
  const curta = E.serieEstufa({ minutos: 6 * 60, dtSeg: 120 });
  const r = rascunho(env, 'tec', E.payloadIncubacao(curta));
  assert.ok(codigos(r).includes('DURACAO_INSUFICIENTE'));
  assert.ok(codigos(r).includes('INTERVALO_REGISTRO'));
  assert.strictEqual(r.bloqueado, true);
  assert.strictEqual(r.textos.conclusaoGeral, '');
  const t = r.travas.find(x => x.codigo === 'DURACAO_INSUFICIENTE');
  assert.ok(t.oQue && t.porQue && t.comoCorrigir);
  const j = rascunho(env, 'tec', E.payloadIncubacao(curta, { qualif: { setpoint: '35', justificativaProtocolo: 'Protocolo do cliente define 6 h com registro a cada 2 min.' } }));
  assert.deepStrictEqual(codigos(j), []);
  assert.ok(j.contexto.escopo.some(x => /Justificativa: Protocolo do cliente/.test(x)));
});

test('travas de dado ruim: leitura impossível, sensor parado e pico', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({ evento: (min, k, v) => {
    if (k === 0 && min === 300) return 150; // impossível para estufa de incubação
    if (k === 1 && min >= 100 && min < 160) return 35.07; // parado enquanto os outros variam
    if (k === 2 && min === 700) return 36.9; // pico isolado de ~1,8 °C (abaixo do limite de pico de 5 °C: não trava)
    if (k === 4 && min === 900) return 42; // pico isolado de 7 °C
    return v;
  }});
  const r = rascunho(env, 'tec', E.payloadIncubacao(s, { faixaTMax: '200' }));
  const c = codigos(r);
  assert.ok(c.includes('LEITURA_IMPOSSIVEL'), c.join());
  assert.ok(c.includes('PICO'), c.join());
  assert.ok(r.travas.some(t => t.codigo === 'PICO' && /sensor S5/.test(t.oQue)));
  assert.ok(!r.travas.some(t => t.codigo === 'PICO' && /sensor S3/.test(t.oQue)));
  // Sensor parado: valor fixo enquanto a câmara aquece (a referência varia vários graus).
  const aq = E.serieEstufa({ rampaMin: 60, inicioRampa: 25, evento: (min, k, v) => (k === 1 && min < 40 ? 30 : v) });
  const rp = rascunho(env, 'tec', E.payloadIncubacao(aq, { faixaTMin: '20' }));
  assert.ok(rp.travas.some(t => t.codigo === 'SENSOR_PARADO' && /sensor S2/.test(t.oQue)), codigos(rp).join());
});

test('travas: registrador sem cadastro e sensores abaixo do mínimo do anexo', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const sem = rascunho(env, 'tec', E.payloadIncubacao(s, { certDataLogger: '' }));
  assert.ok(codigos(sem).includes('REGISTRADOR_NAO_INFORMADO'));
  const outro = rascunho(env, 'tec', E.payloadIncubacao(s, { certDataLogger: 'XYZ-9' }));
  assert.ok(codigos(outro).some(c => /^REGISTRADOR_/.test(c)));
  const poucos = rascunho(env, 'tec', E.payloadIncubacao(s, { sensoresAtivos: Array.from({ length: 12 }, (_, i) => i < 6) }));
  assert.ok(codigos(poucos).includes('SENSORES_ABAIXO_MINIMO'));
  assert.match(poucos.travas.find(t => t.codigo === 'SENSORES_ABAIXO_MINIMO').oQue, /mínimo para este equipamento é 12 \(ABNT NBR 16328:2024, Anexo F\)/);
});

test('umidade: coluna no arquivo exige avaliar ou justificar; avaliada, entra como critério', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({ umidade: true });
  // A coluna de umidade não vira sensor de temperatura.
  const r0 = rascunho(env, 'tec', E.payloadIncubacao(s));
  assert.strictEqual(r0.contexto.sensores.instalados, 12);
  assert.ok(codigos(r0).includes('UMIDADE_SEM_JUSTIFICATIVA'));
  const j = rascunho(env, 'tec', E.payloadIncubacao(s, { qualif: { setpoint: '35', justificativaSemUmidade: 'Equipamento sem controle de umidade.' } }));
  assert.deepStrictEqual(codigos(j), []);
  assert.ok(j.contexto.escopo[0].includes('Umidade relativa não avaliada: Equipamento sem controle de umidade'));
  const a = rascunho(env, 'tec', E.payloadIncubacao(s, { qualif: { setpoint: '35', avaliarUmidade: true, urMin: '45', urMax: '55' } }));
  const cu = a.contexto.criterios.find(c => c.chave === 'UMIDADE');
  assert.strictEqual(cu.conforme, true);
  assert.match(cu.obtido.replace(/ /g, ' '), /48,0 % a 52,0 %/);
  // Sem a grandeza avaliada, o texto que falar de umidade é recusado.
  const v = JSON.parse(JSON.stringify(env.run('(function(){ var c = EstufaQ_montarContexto_(__p); var t = EstufaQ_textosPadrao_(c); t.conclusaoGeral += " A umidade ficou estável."; return EstufaQ_conferirTextos_(c, t, false); })()'.replace('__p', JSON.stringify(E.payloadIncubacao(s, { qualif: { setpoint: '35', justificativaSemUmidade: 'Equipamento sem controle de umidade.' }, tagEquipamento: 'X', cliente: 'HOSPITAL MODELO TESTE LTDA' }))))));
  assert.strictEqual(v.ok, false);
  assert.ok(v.problemas.some(p => /umidade/i.test(p)));
});

test('vínculo: equipamento de outro cliente é recusado; sem equipamento, a tela diz o que fazer', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({ minutos: 60 });
  assert.throws(() => rascunho(env, 'tec', E.payloadIncubacao(s, { equipamentoId: 'eq4' })), /pertence a outro cliente/);
  assert.throws(() => rascunho(env, 'tec', E.payloadIncubacao(s, { equipamentoId: '' })), /Escolha o cliente, a unidade e o equipamento/);
});

test('aprovação: técnico envia, responsável técnico confere a prévia e emite; nova emissão gera revisão', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s, { certNumero: 'REE-TESTE-1' });
  const r = rascunho(env, 'tec', p);
  const pe = Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true });
  assert.throws(() => env.estufa('tec', 'apiQEmitir', pe), /aprovação do responsável técnico/);
  const envio = env.estufa('tec', 'apiQEnviarParaAprovacao', pe);
  assert.throws(() => env.estufa('tec', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }), /Somente o responsável técnico/);
  const lista = env.estufa('rt', 'apiQListarAprovacoes', {});
  assert.strictEqual(lista.itens.length, 1);
  const prev = env.estufa('rt', 'apiQPreverAprovacao', { id: envio.id });
  assert.match(prev.html, /MINUTA PARA CONFERÊNCIA/);
  const em = env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.strictEqual(em.revisao, 0);
  assert.match(em.html, /Revisado e aprovado para emissão por<\/b> Responsável Teste/);
  // Reemissão do mesmo número: revisão 1, a anterior fica substituída (o arquivo antigo continua na pasta).
  const r2 = rascunho(env, 'rt', p);
  const em2 = env.estufa('rt', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r2.assinaturaContexto, textosCertificado: r2.textos, confirmacaoRevisao: true }));
  assert.strictEqual(em2.revisao, 1);
  const regs = env.run('SGO_QE_listar_("ESTUFA")').map(x => x.STATUS + ':' + x.REVISAO);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(regs)).sort(), ['EMITIDO:1', 'SUBSTITUIDO:0']);
  // Pasta do equipamento dentro da pasta do cliente.
  const nomes = Object.values(env.pastas).map(x => x.nome);
  ['11222333000181', 'EST-TESTE-01 - Estufa de incubação', 'Qualificação'].forEach(n => assert.ok(nomes.includes(n), n));
});

test('textos revisados: número inventado, veredito trocado e "aprovado com alerta" são recusados', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s);
  const r = rascunho(env, 'rt', p);
  function emitir(t) { return env.estufa('rt', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: t, confirmacaoRevisao: true })); }
  assert.throws(() => emitir(Object.assign({}, r.textos, { conclusaoGeral: 'O ensaio está REPROVADO.' })), /afirma reprovação/);
  assert.throws(() => emitir(Object.assign({}, r.textos, { conclusaoLeigo: 'Aprovado com alerta.' })), /expressão proibida/);
  assert.throws(() => emitir(Object.assign({}, r.textos, { conclusaoGeral: r.textos.conclusaoGeral + ' Conforme a cláusula 5.3 da norma.' })), /cláusula/);
  // Dado mudou depois do rascunho: emissão recusada.
  const p2 = Object.assign({}, p, { faixaTMax: '36,5' });
  assert.throws(() => env.estufa('rt', 'apiQEmitir', Object.assign({}, p2, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true })), /mudaram desde o rascunho/);
});

test('planilha de dados: técnico recebe a minuta; responsável técnico emite com confirmação', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s, { certNumero: 'REE-TESTE-2' });
  const m = env.estufa('tec', 'apiGerarPlanilhaDados', p);
  assert.strictEqual(m.emitido, false);
  assert.match(m.html, /size:A4 landscape/);
  assert.match(m.html, /Anexo A — Leituras do registrador/);
  assert.match(m.html, /Memória de cálculo/);
  const envio = env.estufa('tec', 'apiQEnviarParaAprovacao', Object.assign({}, p, { documento: 'DADOS', assinaturaContexto: m.assinaturaContexto }));
  const em = env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.strictEqual(em.numero, 'REE-TESTE-2');
  const d = env.estufa('rt', 'apiGerarPlanilhaDados', Object.assign({}, p, { confirmacaoRevisao: true }));
  assert.strictEqual(d.emitido, true);
  assert.strictEqual(d.revisao, 1);
});

test('modelo anterior desativado por configuração; volta só com ESTUFA_DOCUMENTOS_MODELO = ANTERIOR', () => {
  const env = E.criarAmbiente();
  assert.throws(() => env.estufa('tec', 'apiConverter', {}), /modelo anterior dos documentos, que está desativado/);
  assert.strictEqual(env.estufa('tec', 'apiQSituacao', {}).modelo, 'NOVO');
  assert.throws(() => env.estufa('tec', 'apiQDefinirModelo', { modelo: 'ANTERIOR' }), /Somente o Administrador/);
  env.estufa('adm', 'apiQDefinirModelo', { modelo: 'ANTERIOR' });
  assert.throws(() => env.estufa('tec', 'apiConverter', {}), (e) => !/desativado/.test(e.message));
});

test('abertura de porta: tempo até sair da faixa e recuperação com limite do protocolo', () => {
  const env = E.criarAmbiente();
  // Porta aberta 10:00 a 10:02; temperatura cai 3 °C por minuto aberta e volta 1 °C por minuto depois.
  const s = E.serieEstufa({ minutos: 4 * 60, dtSeg: 10, evento: (min, k, v) => {
    const t = min - 120;
    if (t >= 0 && t < 2) return v - 3 * t;
    if (t >= 2 && t < 8) return Math.min(v, v - 6 + (t - 2));
    return v;
  }});
  const p = E.payloadIncubacao(s, { estudos: { distribuicao: { tipo: '' }, aberturaPorta: { habilitado: true, tipoAbertura: 'TOTAL', inicioEvento: '05/10/2026 10:00:00', fimEvento: '05/10/2026 10:02:00', tempoAlvoMinutos: '' }, quedaEnergia: { habilitado: false }, autonomia: { habilitado: false }, distribuicaoE: { habilitado: false }, penetracaoE: { habilitado: false } },
    qualif: { setpoint: '35', recuperacaoMaxMin: '10' } });
  const r = rascunho(env, 'tec', p);
  assert.deepStrictEqual(codigos(r), []);
  const rec = r.contexto.criterios.find(c => c.chave === 'RECUPERACAO');
  assert.strictEqual(rec.conforme, true, rec.obtido);
  const ev = r.contexto.estudos[0].fatos.evento;
  assert.ok(ev.rompeu && ev.recuperou);
  const r2 = rascunho(env, 'tec', Object.assign({}, p, { qualif: { setpoint: '35', recuperacaoMaxMin: '2' } }));
  assert.strictEqual(r2.contexto.criterios.find(c => c.chave === 'RECUPERACAO').conforme, false);
});

function serieEsterilizacao(o) {
  // 3 repetições de 70 min (rampa de 10 min de 200 a 260 °C, patamar a 260 °C), separadas por 30 min.
  return E.serieEstufa(Object.assign({ dtSeg: 30, minutos: 300, base: 260, amplitude: 0.3, evento: (min, k, v) => {
    const fase = min % 100;
    if (fase >= 70) return 180; // intervalo entre as repetições
    if (fase < 10) return 200 + (v - 200) * fase / 10;
    return v;
  } }, o || {}));
}

test('estufa de despirogenização: 3 repetições, letalidade FD e resultado do laboratório', () => {
  const env = E.criarAmbiente();
  const s = serieEsterilizacao();
  const rep = i => ({ inicio: E.fmt(new Date(2026, 9, 5, 8, i * 100, 0)), fim: E.fmt(new Date(2026, 9, 5, 8, i * 100 + 69, 0)) });
  const p = E.payloadIncubacao(s, { perfil: 'ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO', equipamentoId: 'eq5', faixaTMin: '150', faixaTMax: '280', qualif: { setpoint: '260', resolucao: '0,1' },
    estudos: { distribuicao: { tipo: '' }, aberturaPorta: { habilitado: false }, quedaEnergia: { habilitado: false }, autonomia: { habilitado: false }, distribuicaoE: { habilitado: false },
      penetracaoE: { habilitado: true, tipoLetalidade: 'DESPIROGENIZACAO', valorMinimoExigido: '', repeticoes: [0, 1, 2].map(i => Object.assign(rep(i), { indicador: { tipo: 'ENDOTOXINA', aprovado: i !== 2, laboratorio: 'Laboratório Teste', lote: 'L' + i }, registroCicloFileId: 'reg' + i })) } } });
  const r = rascunho(env, 'tec', p);
  assert.deepStrictEqual(codigos(r), []);
  const let1 = r.contexto.criterios.find(c => c.chave === 'R1_LETALIDADE');
  assert.strictEqual(let1.conforme, true);
  assert.match(let1.requisito.replace(/ /g, ' '), /30,00 min \(T ref\. 250,0 °C, z 46,4 °C\)/);
  assert.strictEqual(r.contexto.criterios.find(c => c.chave === 'R3_INDICADOR').conforme, false);
  assert.strictEqual(r.contexto.statusConsolidado, 'REPROVADO');
  const f = r.contexto.estudos[0].fatos.repeticoes[0].letalidade;
  assert.ok(f.pior.valor > 30 && f.incerteza > 0);
});
