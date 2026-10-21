// Gantt comum (SGO_Gantt_Layout.js) e Gantt da frota: régua Dia/Semana/Mês e empilhamento sem sobreposição.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const pasta = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
const ctx = vm.createContext({ console });
vm.runInContext(ler('SGO_Gantt_Layout.js'), ctx);
const G = ctx.SGOGantt_fabrica_();

const H = 3600000, D = 86400000;
// 00:00 de 14/10/2026 em Brasília (UTC-3)
const DE = Date.UTC(2026, 9, 14, 3, 0);
const ATE = Date.UTC(2026, 10, 5, 3, 0) - 1; // 04/11 23:59:59
const HOJE = Date.UTC(2026, 9, 21, 14, 0); // 21/10 11:00
const t = (dia, hora) => Date.UTC(2026, 9, dia, 3, 0) + hora * H; // dia de outubro, hora de Brasília

function semSobreposicao(res, folga) {
  const porFaixa = {};
  res.itens.forEach((p) => { (porFaixa[p.faixa] = porFaixa[p.faixa] || []).push(p); });
  Object.keys(porFaixa).forEach((f) => {
    const l = porFaixa[f].sort((a, b) => a.x - b.x);
    for (let i = 1; i < l.length; i++) {
      assert.ok(l[i - 1].fim + folga <= l[i].x + 1e-9, 'sub-linha ' + f + ': "' + (l[i - 1].item.rotulo) + '" encosta em "' + l[i].item.rotulo + '"');
      assert.ok(l[i - 1].x + l[i - 1].w <= l[i].x, 'barras sobrepostas na sub-linha ' + f);
    }
  });
}

// veículo de teste: 6 retiradas curtas no mesmo dia, uma sobreposta no tempo e uma longa
const RETIRADAS = [
  { ini: t(20, 7.5), fim: t(20, 8.5), rotulo: 'Ana Teste' }, { ini: t(20, 8.75), fim: t(20, 10), rotulo: 'Bruno Exemplo' },
  { ini: t(20, 10.25), fim: t(20, 11), rotulo: 'Carla Modelo' }, { ini: t(20, 11.5), fim: t(20, 13), rotulo: 'Davi Ficticio' },
  { ini: t(20, 13.25), fim: t(20, 15), rotulo: 'Elisa Ensaio' }, { ini: t(20, 15.5), fim: t(20, 17.75), rotulo: 'Fabio Amostra' },
  { ini: t(20, 9), fim: t(20, 12), rotulo: 'Gustavo Simulado' }, { ini: t(15, 8), fim: t(19, 18), rotulo: 'Helena Prova Longa' }
].map((x) => Object.assign({ tipo: 'RETIRADA' }, x));

test('régua da semana: período padrão (7 antes, 14 depois) cabe em 1366 px sem rolar, um rótulo por dia e fins de semana', () => {
  const e = G.escala({ de: DE, ate: ATE, largura: 1130, modo: 'semana', hoje: HOJE });
  assert.equal(e.dias, 22);
  assert.equal(e.rolar, false);
  assert.equal(e.ticks.length, 22, 'um rótulo por dia');
  assert.deepEqual([...e.ticks.slice(0, 3).map((x) => x.rot)], ['14/10', '15/10', '16/10']);
  assert.equal(e.ticks[0].sub, 'qua');
  assert.ok(e.pxDia >= 40);
  assert.equal(e.fds.length, 6, 'sáb/dom de 17-18/10, 24-25/10 e 31/10-01/11');
  assert.deepEqual([...e.meses.map((m) => m.rot)], ['out/2026', 'nov/2026']);
  assert.ok(Math.abs(e.hojeX - (7 + 11 / 24) * e.pxDia) < 0.01, 'linha de hoje no instante certo');
  assert.ok(e.hojeDia && Math.abs(e.hojeDia.x - 7 * e.pxDia) < 0.01);
});

test('régua do mês: um rótulo por semana (segunda-feira); régua do dia: marcas por hora; tela estreita rola dentro do quadro', () => {
  const m = G.escala({ de: DE, ate: DE + 91 * D - 1, largura: 1130, modo: 'mes', hoje: HOJE });
  assert.ok(m.ticks.length >= 13 && m.ticks.length <= 14);
  m.ticks.slice(1).forEach((x) => assert.equal(x.sub, 'seg'));
  for (let i = 2; i < m.ticks.length; i++) assert.ok(Math.abs(m.ticks[i].x - m.ticks[i - 1].x - 7 * m.pxDia) < 0.01, 'uma semana entre rótulos');
  const d = G.escala({ de: t(20, 0), ate: t(21, 0) - 1, largura: 1130, modo: 'dia' });
  assert.equal(d.dias, 1);
  assert.ok(d.ticks.some((x) => x.rot === '08h') && d.ticks.some((x) => x.rot === '12h'));
  assert.equal(d.ticks[0].rot, 'ter 20/10');
  const ticksX = d.ticks.map((x) => x.x);
  for (let i = 1; i < ticksX.length; i++) assert.ok(ticksX[i] - ticksX[i - 1] >= 40, 'rótulos da hora não se encostam');
  const cel = G.escala({ de: DE, ate: ATE, largura: 200, modo: 'semana' });
  assert.equal(cel.rolar, true);
  assert.ok(cel.pxDia >= 40, 'no celular o dia não fica espremido');
});

test('empilhar: retiradas do mesmo dia e sobrepostas nunca se encostam e o texto só fica dentro quando cabe inteiro', () => {
  const medir = (s) => String(s).length * 6.4;
  for (const modo of ['dia', 'semana', 'mes']) {
    const e = modo === 'dia' ? G.escala({ de: t(20, 0), ate: t(21, 0) - 1, largura: 1130, modo }) : G.escala({ de: DE, ate: ATE, largura: 1130, modo });
    const r = G.empilhar(RETIRADAS, { x: e.x, medir, folga: 4, pad: 13, limite: e.largura });
    semSobreposicao(r, 4);
    r.itens.forEach((p) => {
      assert.ok(p.w >= 10, 'largura mínima visível');
      if (p.posTexto === 'dentro') assert.ok(medir(p.texto) + 13 <= p.w, 'texto dentro cabe inteiro: ' + p.texto);
      if (p.posTexto === 'fora') assert.ok(p.fim <= e.largura, 'texto de fora não passa do fim do quadro');
    });
    if (modo === 'dia') {
      const g = r.itens.find((p) => p.item.rotulo === 'Gustavo Simulado'), b = r.itens.find((p) => p.item.rotulo === 'Bruno Exemplo');
      assert.notEqual(g.faixa, b.faixa, 'sobrepostas no tempo vão para sub-linhas diferentes');
      assert.ok(r.faixas >= 2);
    }
  }
  // barras de poucas horas ficam com a largura mínima e marcador; nome curto quando o inteiro não cabe
  const e = G.escala({ de: DE, ate: ATE, largura: 1130, modo: 'semana' });
  const r = G.empilhar([{ ini: t(16, 8), fim: t(16, 9), rotulo: 'Maria da Silva Souza' }], { x: e.x, medir });
  assert.equal(r.itens[0].curta, true);
  assert.equal(r.itens[0].posTexto, 'fora');
  assert.equal(G.nomeCurto('Maria da Silva Souza'), 'Maria S.');
});

test('empilhar com agrupar: barras curtas que se encostam viram um bloco "7 retiradas" com a lista', () => {
  const e = G.escala({ de: DE, ate: ATE, largura: 1130, modo: 'semana' });
  const r = G.empilhar(RETIRADAS, { x: e.x, medir: (s) => String(s).length * 6.4, agrupar: (it) => it.tipo, rotuloGrupo: (ch, n) => n + ' retiradas', limite: e.largura });
  semSobreposicao(r, 4);
  const bloco = r.itens.find((p) => p.agrupado);
  assert.ok(bloco, 'bloco agrupado');
  assert.equal(bloco.item.grupo.length, 7);
  assert.equal(bloco.item.rotulo, '7 retiradas');
  assert.equal(r.itens.length, 2, 'o bloco e a retirada longa');
  assert.equal(r.faixas, 1);
  // na vista do dia nada é agrupado: cada retirada aparece
  const d = G.escala({ de: t(20, 0), ate: t(21, 0) - 1, largura: 1130, modo: 'dia' });
  const r2 = G.empilhar(RETIRADAS.slice(0, 7), { x: d.x, agrupar: (it) => it.tipo });
  assert.equal(r2.itens.filter((p) => p.agrupado).length, 0);
  assert.equal(r2.itens.length, 7);
});

test('marcos no mesmo dia (manutenção e documento) ficam em sub-linhas diferentes', () => {
  const e = G.escala({ de: DE, ate: ATE, largura: 1130, modo: 'semana' });
  const r = G.empilhar([{ tipo: 'MANUTENCAO', ini: t(25, 0), fim: t(25, 0), rotulo: 'Troca de óleo' }, { tipo: 'DOCUMENTO', ini: t(25, 0), fim: t(25, 0), rotulo: 'CRLV' }], { x: e.x });
  semSobreposicao(r, 4);
  assert.equal(r.faixas, 2);
  r.itens.forEach((p) => { assert.equal(p.marco, true); assert.equal(p.w, 22); });
});

test('tela da frota leva a régua comum e o novo Gantt (sem o desenho antigo)', () => {
  const c = vm.createContext({ console });
  vm.runInContext(ler('SGO_Gantt_Layout.js'), c);
  vm.runInContext(ler('SGO_Frota_RastreamentoTela.js'), c);
  const tela = c.Frota_obterTelaRastreamento();
  assert.doesNotThrow(() => new Function(tela.js));
  assert.match(tela.js, /window\.SGOGantt=/);
  assert.match(tela.js, /SGOGantt\.empilhar|S\.empilhar\(/);
  assert.match(tela.js, /data-frg-modo/);
  assert.match(tela.css, /\.frg-quadro\{[^}]*overflow-x:auto/);
  assert.doesNotMatch(tela.css, /frr-g-barra/);
  // a mesma classe de cor serve barra, legenda e lista
  ['RESERVA', 'MANUT_PROG', 'RETIRADA', 'PARADA', 'ACAO', 'MANUTENCAO', 'DOCUMENTO'].forEach((k) => assert.match(tela.css, new RegExp('\\.frg-' + k + '\\{')));
});
