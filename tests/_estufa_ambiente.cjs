// Ambiente de teste da qualificação térmica de estufa, banho-maria e secadora (modelo novo, 21/10/2026).
// Reaproveita o ambiente do relatório oficial da autoclave (_modelo_oficial_ambiente.cjs: banco em memória,
// sessões, registrador de teste DTL-T1 com U = 0,3 °C, emissão com aprovação) e carrega os arquivos do
// módulo SGO_EstufaBanhoRel_*. Só dados de teste: nada de cliente real. Sem depender da hora real.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const MO = require('./_modelo_oficial_ambiente.cjs');

const ARQUIVOS = ['SGO_EstufaBanhoRel_Config.js', 'SGO_EstufaBanhoRel_Datas.js', 'SGO_EstufaBanhoRel_Parser.js', 'SGO_EstufaBanhoRel_Flex.js',
  'SGO_EstufaBanhoRel_Engine.js', 'SGO_EstufaBanhoRel_Simulador.js', 'SGO_EstufaBanhoRel_Planilha.js', 'SGO_EstufaBanhoRel_Graficos.js',
  'SGO_EstufaBanhoRel_CertificadoIA.js', 'SGO_EstufaBanhoRel_CertificadoRelatorio.js', 'SGO_EstufaBanhoRel_Main.js',
  'SGO_EstufaBanhoRel_Qualif.js', 'SGO_EstufaBanhoRel_RelatorioEnsaio.js', 'SGO_EstufaBanhoRel_PlanilhaDados.js', 'SGO_EstufaBanhoRel_ModeloOficialNovo.js'];

function ler(nome) { return fs.readFileSync(path.join(MO.A.BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

function criarAmbiente(opcoes) {
  const env = MO.criarAmbiente(opcoes);
  // Utilities.parseDate (só o formato usado pelo módulo: yyyy-MM-dd HH:mm:ss, horário civil no fuso informado).
  // formatDate com o formatador de fuso em cache (mesmo resultado do simulacro comum; a série de 24 h tem milhares de leituras).
  const fmtCache = {};
  env.ctx.Utilities.formatDate = function (data, fuso, formato) {
    if (!(data instanceof Date) && !(data && typeof data.getTime === 'function')) throw new Error('Exception: Invalid argument: date');
    if (!isFinite(data.getTime())) throw new Error('Exception: Invalid argument: date');
    const z = fuso || 'America/Sao_Paulo';
    const f = fmtCache[z] || (fmtCache[z] = new Intl.DateTimeFormat('en-GB', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }));
    const p = {};
    for (const x of f.formatToParts(data)) p[x.type] = x.value;
    const mapa = { yyyy: p.year, yy: p.year.slice(-2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second };
    return String(formato).replace(/'([^']*)'|yyyy|yy|MM|dd|HH|mm|ss/g, (m, lit) => (lit !== undefined ? lit : mapa[m]));
  };
  env.ctx.__fmtData = env.ctx.Utilities.formatDate;
  env.ctx.Utilities.parseDate = function (texto, fuso, formato) {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(texto));
    if (!m || formato !== 'yyyy-MM-dd HH:mm:ss') throw new Error('parseDate: formato não simulado ' + formato);
    const base = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const ordem = [-3, -2]; for (let h = -14; h <= 14; h++) if (ordem.indexOf(h) < 0) ordem.push(h);
    for (const h of ordem) { const d = new Date(base - h * 3600000); if (env.ctx.__fmtData(d, fuso, formato) === texto) return d; }
    return new Date(base);
  };
  // Utilities.parseCsv (aspas duplas e separador informado), como no Apps Script.
  env.ctx.Utilities.parseCsv = function (texto, sep) {
    return String(texto).split('\n').map(function (linha) {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < linha.length; i++) {
        const c = linha[i];
        if (q) { if (c === '"' && linha[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
        else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
      }
      out.push(cur);
      return out;
    });
  };
  for (const f of ARQUIVOS) if (fs.existsSync(path.join(MO.A.BASE, f))) env.run(ler(f));
  env.run([
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq3", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "ESTUFA DE INCUBAÇÃO", FABRICANTE: "MARCAFICTICIA", MODELO: "MODELOEST", SERIE: "SN-EST-0001", TAG: "EST-TESTE-01", SETOR: "LABORATÓRIO", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq4", CLIENTE_ID: "cli2", UNIDADE_ID: "uni2", TIPO: "ESTUFA DE INCUBAÇÃO", SERIE: "SN-EST-OUTRA", TAG: "EST-OUTRA-01", STATUS: "ATIVO" });',
    'SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq5", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "ESTUFA DE ESTERILIZAÇÃO", SERIE: "SN-EST-0002", TAG: "EST-TESTE-02", STATUS: "ATIVO" });',
    // A IA nunca é chamada nos testes (sem chave): vale o texto padrão.
    'SGO_DocA4_chamarGemini_ = function () { throw new Error("a chave da IA não está cadastrada"); };'
  ].join('\n'));
  env.estufa = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('EstufaBanhoRel_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  env.oficialEstufa = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('EstufaOficial_apiDispatch')({ sessionId: sid, fn, payload: payload || {} })));
  return env;
}

const dd = x => String(x).padStart(2, '0');
function fmt(d) { return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds()); }

/**
 * Série sintética de estufa: n sensores, intervalo dtSeg, duração em minutos, temperatura base com oscilação
 * pequena e deslocamento por sensor. o.evento(minuto, sensor, t) → t permite simular porta/queda/defeito.
 * Devolve { texto, linhas:[{d, t:[...]}] } no formato do registrador (Data;Hora;S1..;Umidade opcional).
 */
function serieEstufa(o) {
  o = Object.assign({ inicio: new Date(2026, 9, 5, 8, 0, 0), dtSeg: 60, minutos: 24 * 60 + 30, n: 12, base: 35, amplitude: 0.15, desvios: [], umidade: false, evento: null, rampaMin: 0, inicioRampa: 25 }, o || {});
  const linhas = [];
  for (let s = 0; s <= o.minutos * 60; s += o.dtSeg) {
    const min = s / 60;
    const t = [];
    for (let k = 0; k < o.n; k++) {
      let v = o.base + (o.desvios[k] !== undefined ? o.desvios[k] : (k % 4) * 0.1 - 0.15) + o.amplitude * Math.sin(min / 17 + k);
      if (o.rampaMin && min < o.rampaMin) v = o.inicioRampa + (v - o.inicioRampa) * (min / o.rampaMin);
      if (o.evento) v = o.evento(min, k, v);
      t.push(Math.round(v * 100) / 100);
    }
    linhas.push({ d: new Date(o.inicio.getTime() + s * 1000), t, ur: Math.round((50 + 2 * Math.sin(min / 30)) * 10) / 10 });
  }
  const cab = ['Data', 'Hora'].concat(Array.from({ length: o.n }, (_, i) => 'S' + (i + 1))).concat(o.umidade ? ['Umidade (%)'] : []);
  const texto = [cab.join(';')].concat(linhas.map(l => {
    const dt = fmt(l.d).split(' ');
    return [dt[0], dt[1]].concat(l.t.map(v => v.toFixed(2).replace('.', ','))).concat(o.umidade ? [l.ur.toFixed(1).replace('.', ',')] : []).join(';');
  })).join('\n');
  return { texto, linhas, inicio: fmt(linhas[0].d), fim: fmt(linhas[linhas.length - 1].d), fmt };
}

/** Payload da tela para estufa de incubação (distribuição em vazio), já com o vínculo do cadastro. */
function payloadIncubacao(serie, extra) {
  const n = serie.linhas[0].t.length;
  const base = {
    perfil: 'ESTUFA_INCUBACAO', nSensores: n, sensoresAtivos: Array.from({ length: n }, () => true),
    faixaTMin: '33', faixaTMax: '37', tolerancia: '', modoEntrada: 'COLAR', textoColado: serie.texto, dateStyle: 'BR', delimManual: 'AUTO',
    estudos: { distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: serie.inicio, fim: serie.fim, fimRampaEstabilizacao: '' }, aberturaPorta: { habilitado: false }, quedaEnergia: { habilitado: false }, autonomia: { habilitado: false }, distribuicaoE: { habilitado: false }, penetracaoE: { habilitado: false } },
    certDataLogger: 'DTL-T1', responsavelTecnico: 'Técnico Teste', clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3',
    qualif: { setpoint: '35', resolucao: '0,1' }
  };
  return Object.assign(base, extra || {});
}

module.exports = { criarAmbiente, serieEstufa, payloadIncubacao, fmt, MO };
