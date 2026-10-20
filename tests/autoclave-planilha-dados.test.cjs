// Autoclave a vapor — planilha de dados nova (A4 paisagem, 20/10/2026): modelo novo é o padrão, o anterior
// está preservado e só volta por configuração; emissão com aprovação (QUALIF_EMISSOES, AUTOCLAVE_DADOS);
// ensaio sem pressão não cita pressão; leituras paginadas com cabeçalho; números pt-BR; os mesmos valores do
// motor que o relatório de ensaio em retrato. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('./_autoclave_ambiente.cjs');

const STUBS = [
  'SGO_DocA4_paginar_ = function (h) { return { html: h, pdfBlob: null }; };',
  'SGO_DocSalvar_salvarHtmlEPdf_ = function (p, n, h) { var a = p.createFile(n + ".html", h, "text/html"); return { htmlId: a.getId(), htmlUrl: a.getUrl(), pdfId: "pdf" + a.getId(), pdfUrl: "/arquivos/pdf" + a.getId(), html: h }; };',
  'function exigirSessao(sid) { return SESSOES_TESTE[sid] || (function () { throw new Error("Sessão inválida"); })(); }',
  'var SESSOES_TESTE = { tec: { perfil: "TECNICO", nome: "Técnico Teste", usuario: "tec" }, rt: { perfil: "GESTOR", nome: "Responsável Teste", usuario: "rt" } };',
  'var REGISTRADOR_TESTE = { itens: [{ tag: "DTL-T1", descricao: "Registrador de teste", certificado: "CAL-T-1", validade: "01/01/2027", situacao: "Válido na data do ensaio", conforme: true, encontrado: true, incertezaU95: 0.3, fatorK: 2 }], observacoes: [] };',
  'SGO_DocA4_registradores_ = function (t) { return String(t || "").trim() === "DTL-T1" ? JSON.parse(JSON.stringify(REGISTRADOR_TESTE)) : { itens: [], observacoes: [] }; };'
].join('\n');

function ambiente(extra, props) { return A.criarAmbiente({ extra: STUBS + '\n' + (extra || ''), props: props || {} }); }

function payload(extra) {
  return Object.assign({
    modoEntrada: 'COLAR', nSensores: 3, setpoint: '134', motor: '134', dateStyle: 'BR',
    equipamento: { modoRemocaoAr: 'PRE_VACUO', unidadePressao: 'BAR_ABS' }, cliente: 'CLIENTE DE TESTE', cnpj: '11.222.333/0001-81',
    tag: 'AUT-TESTE-01', marca: 'MARCA DE TESTE', modelo: 'MOD-1', certNumero: 'AUT-T-0001', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste',
    ensaio: 'QO (Vazio)', cicloNum: '1', textoColado: A.csvCompleto(A.cicloSintetico({ dtSeg: 10, nSensores: 3, tPatamar: 134.6, patamarMin: 4 }))
  }, extra || {});
}

/** Texto visível do documento (inclui os textos dos gráficos), sem marcação. */
function texto(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}

/** Linhas (células em texto) da primeira tabela depois da legenda que contém `legenda`. */
function linhasTabela(html, legenda) {
  const i = html.indexOf(legenda);
  assert.ok(i >= 0, 'legenda não encontrada: ' + legenda);
  const tab = html.slice(html.indexOf('<table', i), html.indexOf('</table>', i));
  const corpo = tab.slice(tab.indexOf('<tbody>'));
  return [...corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1]).trim()));
}

test('modelo novo é o padrão; o anterior fica guardado e só volta pela configuração do responsável pelo sistema', () => {
  const env = ambiente('AutoRel_apiConverterModeloAnterior_ = function () { return { ok: true, modeloPlanilha: "ANTERIOR" }; };');
  assert.equal(env.fn('AutoRel_planilhaModelo_')(), 'NOVO');
  const D = env.fn('AutoRel_apiDispatch');
  const r = D({ sessionId: 'rt', fn: 'apiConverter', payload: payload({ confirmacaoRevisao: true }) });
  assert.equal(r.modeloPlanilha, 'NOVO');
  assert.match(r.html, /size:A4 landscape/);
  assert.match(r.html, /Planilha de dados do ensaio térmico/);
  // Ping informa o modelo e se a sessão aprova.
  const ping = D({ sessionId: 'rt', fn: 'apiPing', payload: {} });
  assert.equal(ping.planilhaModelo, 'NOVO');
  assert.equal(ping.podeAprovarEmissao, true);
  assert.equal(D({ sessionId: 'tec', fn: 'apiPing', payload: {} }).podeAprovarEmissao, false);

  const envAnt = ambiente('AutoRel_apiConverterModeloAnterior_ = function () { return { ok: true, modeloPlanilha: "ANTERIOR" }; };', { AUTOREL_PLANILHA_MODELO: 'ANTERIOR' });
  assert.equal(envAnt.fn('AutoRel_apiDispatch')({ sessionId: 'tec', fn: 'apiConverter', payload: payload() }).modeloPlanilha, 'ANTERIOR');
  // Valor desconhecido não desliga o modelo novo.
  assert.equal(ambiente('', { AUTOREL_PLANILHA_MODELO: 'outro' }).fn('AutoRel_planilhaModelo_')(), 'NOVO');

  // O gerador anterior continua inteiro no código e é ele que o modelo anterior chama.
  const base = A.BASE;
  const main = fs.readFileSync(path.join(base, 'SGO_AutoRel_Main.js'), 'utf8').replace(/\r\n/g, '\n');
  const corpoAnterior = main.slice(main.indexOf('function AutoRel_apiConverterModeloAnterior_'), main.indexOf('function AutoRel_aplicarOverrideSimulacaoNoPayload_'));
  assert.match(corpoAnterior, /AutoRel_gerarPlanilhaAuditoria\(dadosNormalizados, analise, payload\)/);
  assert.match(corpoAnterior, /AutoRel_gerarGraficosAuditoria\(ss, analise, nSensores\)/);
  assert.match(corpoAnterior, /AutoRel_apiConverterLeakTest_\(payload\)/);
  const planilha = fs.readFileSync(path.join(base, 'SGO_AutoRel_Planilha.js'), 'utf8');
  assert.match(planilha, /function AutoRel_gerarPlanilhaAuditoria\(dados, analise, payload\)/);
  assert.match(planilha, /function AutoRel_gerarPlanilhaLeakTest_\(dados, analiseLeak, payload\)/);
  // A escolha fica em Chaves e senhas (módulo exclusivo do responsável pelo sistema).
  const chaves = fs.readFileSync(path.join(base, 'SGO_Chaves.js'), 'utf8');
  assert.match(chaves, /chave: 'AUTOREL_PLANILHA_MODELO'[^\n]*\['ANTERIOR', /);
});

test('emissão pelo fluxo de aprovação: técnico envia (minuta), responsável confere e emite; revisões próprias da planilha', () => {
  const env = ambiente();
  const D = env.fn('AutoRel_apiDispatch');
  const p = payload();
  const envio = D({ sessionId: 'tec', fn: 'apiConverter', payload: p });
  assert.equal(envio.aguardandoAprovacao, true);
  assert.match(envio.html, /MINUTA PARA CONFERÊNCIA/);
  assert.match(envio.html, /Aguardando a aprovação do responsável técnico/);
  const reg = env.fn('SGO_QE_obter_')(envio.id);
  assert.equal(reg.MODULO, 'AUTOCLAVE_DADOS');
  assert.equal(reg.STATUS, 'AGUARDANDO_APROVACAO');
  const lista = D({ sessionId: 'rt', fn: 'apiListarAprovacoes', payload: {} });
  const item = lista.itens.filter(i => i.id === envio.id)[0];
  assert.equal(item.documento, 'Planilha de dados');
  assert.throws(() => D({ sessionId: 'tec', fn: 'apiPreverAprovacao', payload: { id: envio.id } }), /Somente o responsável técnico/);
  assert.match(D({ sessionId: 'rt', fn: 'apiPreverAprovacao', payload: { id: envio.id } }).html, /MINUTA PARA CONFERÊNCIA/);
  const e1 = D({ sessionId: 'rt', fn: 'apiAprovarEmitir', payload: { id: envio.id, confirmacaoRevisao: true } });
  assert.equal(e1.revisao, 0);
  assert.equal(e1.salvoNaPasta, true);
  assert.ok(e1.pdfId);
  assert.match(e1.html, /Revisado e aprovado para emissão por<\/b> Responsável Teste/);
  assert.doesNotMatch(e1.html, /MINUTA PARA CONFERÊNCIA/);
  assert.match(e1.html, /Enviar ao cliente/);
  assert.equal(env.fn('SGO_QE_obter_')(envio.id).STATUS, 'EMITIDO');
  // Responsável técnico emite direto, só com a confirmação; reemitir gera a revisão seguinte.
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiConverter', payload: p }), /Confirme que conferiu/);
  const e2 = D({ sessionId: 'rt', fn: 'apiConverter', payload: Object.assign({ confirmacaoRevisao: true }, p) });
  assert.equal(e2.emitido, true);
  assert.equal(e2.revisao, 1);
  assert.match(e2.html, /Revisão 01/);
  const regs = env.fn('SGO_QE_listar_')('AUTOCLAVE_DADOS');
  assert.deepEqual(JSON.parse(JSON.stringify(regs.map(x => x.STATUS).sort())), ['EMITIDO', 'SUBSTITUIDO']);
  // A planilha não mexe nas revisões do relatório de ensaio do mesmo número.
  assert.equal(env.fn('SGO_QE_proximaRevisao_')('AUTOCLAVE', 'AUT-T-0001', 0), 0);
  // Devolução funciona para a planilha.
  const envio2 = D({ sessionId: 'tec', fn: 'apiConverter', payload: p });
  D({ sessionId: 'rt', fn: 'apiDevolverAprovacao', payload: { id: envio2.id, motivo: 'Confira a identificação do registrador.' } });
  assert.equal(env.fn('SGO_QE_obter_')(envio2.id).STATUS, 'DEVOLVIDO');
  // Dados com problema: nada é gerado nem registrado.
  const antes = env.fn('SGO_QE_listar_')('AUTOCLAVE_DADOS').length;
  assert.throws(() => D({ sessionId: 'rt', fn: 'apiConverter', payload: Object.assign({}, p, { confirmacaoRevisao: true, certDataLogger: '' }) }), /Como corrigir/);
  assert.equal(env.fn('SGO_QE_listar_')('AUTOCLAVE_DADOS').length, antes);
});

test('seções do documento: capa, sumário, quadro-resumo, cálculos, gráficos e assinaturas; equipamento sem fabricante', () => {
  const env = ambiente();
  const r = env.fn('AutoRel_apiDispatch')({ sessionId: 'rt', fn: 'apiConverter', payload: payload({ confirmacaoRevisao: true }) });
  const h = r.html;
  ['class="capa"', 'data-sgo-sumario', '1. Quadro-resumo dos resultados', '2. Condições do ensaio', '3. Resultados por sensor e por fase do ciclo',
    '4. Gráficos', '5. Memória de cálculo', 'Letalidade térmica (F0)', 'Temperatura do vapor saturado × temperatura medida', 'Tempo de equilíbrio',
    'Incerteza de medição', '6. Não conformidades e observações', '7. Responsabilidade técnica', '8. Leituras da fase de exposição',
    'Anexo A — Leituras fora da fase de exposição', 'counter(pages)', 'Planilha de dados nº AUT-T-0001'].forEach(t => assert.ok(h.includes(t), 'faltou: ' + t));
  assert.ok((h.match(/<svg /g) || []).length >= 6, 'gráficos em SVG estático');
  assert.doesNotMatch(h, /<script/i);
  assert.doesNotMatch(texto(h), /MARCA DE TESTE/);
  assert.match(texto(h), /T ref = 121,1 °C e z = 10 °C|Tref = 121,1|121,1 °C/);
  assert.match(texto(h), /F 0 = \(\d+,\d ± \d+,\d\) min/);
});

test('"Analisar pressão" desligado: a planilha não cita pressão fora da frase do escopo', () => {
  const env = ambiente();
  const just = 'equipamento sem ponto para instalar o transmissor de pressão';
  const r = env.fn('AutoRel_apiDispatch')({ sessionId: 'rt', fn: 'apiConverter', payload: payload({ analisarPressao: false, justificativaSemPressao: just, confirmacaoRevisao: true }) });
  const t = texto(r.html);
  const frase = 'Este ensaio considerou somente a temperatura: ' + just + '.';
  assert.ok(t.includes(frase));
  const resto = t.split(frase).join(' ');
  const achado = resto.match(/.{0,60}(press[aã]o|press[oõ]es|\bkpa\b|\bm?bar\b|v[aá]cuo|estanqueidade|vapor saturado|pr[eé]-v[aá]cuo).{0,40}/i);
  assert.equal(achado && achado[0], null);
  assert.match(t, /pequeno porte \(cassete\)/);
});

test('leituras paginadas: uma tabela por folha, cabeçalho em todas, nenhuma leitura perdida; mais de 12 sensores em blocos', () => {
  const env = ambiente();
  const linhas = A.cicloSintetico({ dtSeg: 2, nSensores: 14, tPatamar: 134.6, patamarMin: 4 });
  const ctxInt = {};
  const p = payload({ nSensores: 14, textoColado: A.csvCompleto(linhas) });
  const ctx = env.fn('AutoRel_acMontarContextoCertificado_')(p, ctxInt);
  assert.equal(ctx.emissaoBloqueada, false, JSON.stringify(ctx.travas));
  const h = env.fn('AutoRel_pdMontarHtml_')(ctx, ctxInt, { aprovacao: { nome: 'Responsável Teste', perfil: 'GESTOR', em: '20/10/2026 10:00:00' } });
  const a = ctxInt.resultado.analise;
  const nExp = a.faseFimExp - a.faseInicioExp + 1;
  const sec8 = h.slice(h.indexOf('8. Leituras da fase de exposição'), h.indexOf('Anexo A — Leituras fora'));
  const folhas = sec8.split('<div class="pd-folha').slice(1);
  assert.ok(folhas.length >= 4, 'várias folhas: ' + folhas.length);
  folhas.forEach((f, i) => {
    assert.equal((f.match(/<thead>/g) || []).length, 1, 'folha ' + i + ' sem cabeçalho');
    const n = (f.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g) || []).length;
    assert.ok(n <= 36, 'folha ' + i + ' com ' + n + ' linhas');
  });
  // Dois blocos de sensores (S1–S12 e S13–S14), cada um com todas as leituras da exposição.
  assert.match(sec8, /sensores S1 a S12/);
  assert.match(sec8, /sensores S13 a S14/);
  const total = (sec8.match(/<tbody>[\s\S]*?<\/tbody>/g) || []).reduce((s, b) => s + (b.match(/<tr/g) || []).length, 0);
  assert.equal(total, 2 * nExp);
  // Folhas equilibradas: a última não fica com uma ou duas linhas.
  const ultima = (folhas[folhas.length - 1].match(/<tr/g) || []).length - 1;
  assert.ok(ultima >= 10, 'última folha com ' + ultima + ' linhas');
});

test('números em pt-BR (vírgula decimal) em todo o documento', () => {
  const env = ambiente();
  const r = env.fn('AutoRel_apiDispatch')({ sessionId: 'rt', fn: 'apiConverter', payload: payload({ confirmacaoRevisao: true }) });
  // Fora da conta: CNPJ, milhar pt-BR (1.013,00), números de seção ("seção 2.2", "5.1 Letalidade").
  const t = texto(r.html).replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, ' ').replace(/\b\d{1,3}(\.\d{3})+,\d+/g, ' ')
    .replace(/seç(ão|ões) \d+(\.\d+)*/g, ' ').replace(/\b\d\.\d+(?= [A-ZÀ-Ú])/g, ' ');
  const ponto = t.match(/.{0,40}\d\.\d.{0,20}/);
  assert.equal(ponto && ponto[0], null);
  assert.match(t, /\d+,\d{2} min/);
});

test('mesmos valores do motor que o relatório de ensaio em retrato (F0, mínima, média, máxima por sensor)', () => {
  const env = ambiente();
  const D = env.fn('AutoRel_apiDispatch');
  const p = payload();
  const rasc = D({ sessionId: 'rt', fn: 'apiGerarRascunhoCertificado', payload: p });
  const retrato = D({ sessionId: 'rt', fn: 'apiMontarCertificadoFinal', payload: Object.assign({}, p, { confirmacaoRevisao: true, assinaturaContextoCertificado: rasc.assinaturaContexto, textosCertificado: rasc.textos }) }).html;
  const plan = D({ sessionId: 'rt', fn: 'apiConverter', payload: Object.assign({ confirmacaoRevisao: true }, p) }).html;
  const conf = rasc.contexto.estudos[0].fatos.conformidadePorSensor;
  const num = env.fn('SGO_DocA4_num_');
  const lp = linhasTabela(plan, 'Estatísticas de cada sensor ativo');
  const lr = linhasTabela(retrato, 'Resultados por sensor');
  assert.equal(lp.length, conf.length);
  conf.forEach((c, i) => {
    // planilha: Sensor, Leituras, Mínima, Máxima, Média, Desvio, Tempo na faixa, Atingiu, Diferença, F0, situação
    assert.deepEqual([lp[i][2], lp[i][3], lp[i][4], lp[i][9]], [num(c.minTemp, 2), num(c.maxTemp, 2), num(c.mediaTemp, 2), num(c.f0, 2)]);
    // retrato: Sensor, Mínima, Média, Máxima, F0, situação
    assert.deepEqual([lr[i][1], lr[i][3], lr[i][2], lr[i][4]], [lp[i][2], lp[i][3], lp[i][4], lp[i][9]]);
  });
  // F0 do pior sensor e o quadro de critérios iguais aos do relatório.
  const fatos = rasc.contexto.estudos[0].fatos;
  assert.ok(plan.includes(env.fn('SGO_DocA4_val_')(fatos.minF0, 2, 'min') + ' (' + fatos.piorSensorF0.sensor + ')'));
  rasc.contexto.criterios.forEach(c => assert.ok(plan.includes(env.fn('SGO_DocA4_esc_')(c.obtido)), 'critério ' + c.chave));
});

test('teste de estanqueidade: planilha com a conta da taxa de vazamento e as leituras da janela', () => {
  const env = ambiente();
  const cab = 'Data;Hora;S1;Pressão';
  const t0 = new Date(2026, 9, 10, 9, 0, 0).getTime();
  const csv = [cab].concat(Array.from({ length: 80 }, (_, i) => {
    const d = new Date(t0 + i * 10000);
    const hh = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
    const pr = i < 8 ? 1013 - i * 120 : 50 + (i - 8) * 0.1;
    return ['10/10/2026', hh, '25,0', String(pr.toFixed(2)).replace('.', ',')].join(';');
  })).join('\n');
  const p = payload({ textoColado: csv, nSensores: 1, sensoresAtivos: [true], tipoRelatorio: 'LEAK_TEST', leakTest: { inicio: '10/10/2026 09:01:30', fim: '10/10/2026 09:12:30', unidadePressao: 'MBAR' }, confirmacaoRevisao: true });
  const r = env.fn('AutoRel_apiDispatch')({ sessionId: 'rt', fn: 'apiConverter', payload: p });
  assert.equal(r.tipoRelatorio, 'LEAK_TEST');
  const t = texto(r.html);
  assert.match(t, /taxa = \|p fim − p início \| \/ Δt/);
  assert.match(t, /Leituras da janela do teste/);
  assert.match(t, /\d+,\d{2} mbar\/min/);
  assert.equal(env.fn('SGO_QE_listar_')('AUTOCLAVE_DADOS')[0].STATUS, 'EMITIDO');
});
