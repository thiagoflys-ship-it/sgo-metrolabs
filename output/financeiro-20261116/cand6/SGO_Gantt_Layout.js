/****************************************************
 * GANTT — RÉGUA E EMPILHAMENTO COMUNS (21/10/2026)
 *
 * Funções puras (sem planilha, sem tela) que qualquer Gantt do SGO+ usa para:
 *  - escala(): a régua do período em três vistas (Dia: uma marca por hora; Semana: um rótulo por dia;
 *    Mês: um rótulo por semana, começando na segunda), fins de semana, meses, a posição de hoje e se o
 *    quadro precisa rolar para o lado (largura mínima por dia de cada vista);
 *  - empilhar(): põe cada evento numa sub-linha sem nunca encostar em outro (barras e losangos), com a
 *    largura mínima visível das barras curtas, e decide onde vai o texto: dentro da barra só quando cabe
 *    inteiro; senão à direita, se houver espaço até o próximo evento; senão nenhum (o detalhe fica no
 *    balão ao tocar/passar o mouse). Texto nunca fica cortado nem por cima de outro.
 * O código roda no servidor (testes) e no navegador: a tela recebe '(' + SGOGantt_fabrica_.toString() + ')()'.
 * Datas em horário de Brasília (UTC-3, sem horário de verão desde 2019), como o resto da Frota.
 * Usado hoje pelo Gantt da frota (SGO_Frota_RastreamentoTela.js).
 ****************************************************/

function SGOGantt_fabrica_() {
  var DIA = 86400000, HORA = 3600000, FUSO = -3 * HORA;
  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  /** Largura mínima de um dia (px) em cada vista: abaixo disso o quadro rola dentro da moldura. */
  var MIN_DIA = { dia: 24 * 36, semana: 40, mes: 14 };

  function p2(n) { return ('0' + n).slice(-2); }
  function partes(ms) { var d = new Date(ms + FUSO); return { a: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), s: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; }
  function inicioDia(ms) { return Math.floor((ms + FUSO) / DIA) * DIA - FUSO; }
  function dataCurta(ms) { var q = partes(ms); return p2(q.d) + '/' + p2(q.m + 1); }
  function hora(ms) { var q = partes(ms); return p2(q.h) + ':' + p2(q.mi); }

  /**
   * o: { de, ate (ms; ate é o fim do último dia), largura (px disponíveis para o trilho), modo: 'dia'|'semana'|'mes', hoje (ms) }
   * Devolve { pxDia, largura, rolar, x(ms), ticks[{x, rot, sub, forte}], linhas[{x, forte}], fds[{x, w}], meses[{x, rot}], hojeX, hojeDia{x, w} }.
   */
  function escala(o) {
    var modo = MIN_DIA[o.modo] ? o.modo : 'semana';
    var de = inicioDia(o.de), ate = Math.max(o.ate, de + DIA - 1);
    var dias = Math.max(1, Math.round((inicioDia(ate) - de) / DIA) + 1);
    var disp = Math.max(1, Math.floor(o.largura || 0));
    var pxDia = Math.max(MIN_DIA[modo], disp / dias);
    var largura = Math.round(pxDia * dias);
    var x = function (ms) { return Math.max(0, Math.min(largura, (ms - de) / DIA * pxDia)); };
    var r = { modo: modo, de: de, ate: de + dias * DIA - 1, dias: dias, pxDia: pxDia, largura: largura, rolar: largura > disp + 1, x: x,
      ticks: [], linhas: [], fds: [], meses: [], hojeX: null, hojeDia: null };
    for (var i = 0; i < dias; i++) {
      var ms = de + i * DIA, q = partes(ms), xx = i * pxDia;
      if (q.s === 0 || q.s === 6) r.fds.push({ x: xx, w: pxDia });
      if (i === 0 || q.d === 1) r.meses.push({ x: xx, rot: MESES[q.m] + '/' + q.a });
      if (modo === 'dia') {
        var passoH = pxDia / 24 >= 40 ? 1 : pxDia / 24 >= 22 ? 2 : 3;
        r.linhas.push({ x: xx, forte: true });
        r.ticks.push({ x: xx, rot: SEMANA[q.s] + ' ' + p2(q.d) + '/' + p2(q.m + 1), forte: true });
        for (var hh = passoH; hh < 24; hh += passoH) { r.linhas.push({ x: xx + hh * pxDia / 24, forte: false }); if (hh * pxDia / 24 >= 70) r.ticks.push({ x: xx + hh * pxDia / 24, rot: p2(hh) + 'h', forte: false }); }
      } else if (modo === 'semana') {
        r.linhas.push({ x: xx, forte: q.s === 1 });
        r.ticks.push({ x: xx, rot: p2(q.d) + '/' + p2(q.m + 1), sub: SEMANA[q.s], forte: q.s === 1, w: pxDia });
      } else {
        if (q.s === 1 || i === 0) { r.linhas.push({ x: xx, forte: true }); r.ticks.push({ x: xx, rot: p2(q.d) + '/' + p2(q.m + 1), sub: q.s === 1 ? 'seg' : SEMANA[q.s], forte: true, w: 7 * pxDia }); }
      }
    }
    if (o.hoje !== undefined && o.hoje !== null && o.hoje >= de && o.hoje <= r.ate) {
      r.hojeX = x(o.hoje);
      if (modo !== 'dia') r.hojeDia = { x: x(inicioDia(o.hoje)), w: pxDia };
    }
    return r;
  }

  /** "Maria da Silva Souza" -> "Maria S."; uma palavra fica como está. */
  function nomeCurto(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (p.length < 2) return p.join('');
    return p[0] + ' ' + p[p.length - 1].charAt(0).toUpperCase() + '.';
  }

  function medirPadrao(t) { return String(t || '').length * 6.4; }

  /**
   * itens: [{ ini, fim, rotulo, curto? }] (ini === fim, ou marco: true, é um ponto no tempo).
   * o: { x(ms) -> px, larguraMin (10), folga (4), medir(texto) -> px, pad (12: margem do texto dentro da barra),
   *      marco (22: largura do losango), foraMax (170: texto de fora mais largo que isso usa o curto), ehMarco(item),
   *      agrupar(item) -> chave e rotuloGrupo(chave, n) -> texto (opcionais: juntam barras curtas que se encostam) }
   * Devolve { faixas: n, itens: [{ item, x, w, faixa, marco, curta, agrupado, texto, posTexto: 'dentro'|'fora'|'nenhum', fim }] }
   * (um bloco agrupado tem item.grupo = lista dos eventos juntados).
   * Garantia: dentro de uma faixa, nenhum par de eventos (barra + texto de fora) se encosta: fim + folga <= início do próximo.
   */
  function empilhar(itens, o) {
    o = o || {};
    var medir = o.medir || medirPadrao, min = o.larguraMin || 10, folga = o.folga === undefined ? 4 : o.folga, pad = o.pad || 12, mw = o.marco || 22, foraMax = o.foraMax || 170;
    var ehMarco = o.ehMarco || function (it) { return it.marco === true || it.ini === it.fim; };
    var prep = (itens || []).map(function (it, idx) {
      var marco = ehMarco(it), x0, w, curta = false;
      if (marco) { x0 = o.x(it.ini) - mw / 2; w = mw; }
      else { x0 = o.x(it.ini); var x1 = o.x(Math.max(it.fim, it.ini)); w = x1 - x0; if (w < min) { curta = true; w = min; } }
      var cands = [];
      [it.rotulo, it.curto === undefined ? nomeCurto(it.rotulo) : it.curto].forEach(function (t) { t = String(t || '').trim(); if (t && cands.indexOf(t) < 0) cands.push(t); });
      return { item: it, idx: idx, x: x0, w: w, marco: marco, curta: curta, cands: cands };
    }).sort(function (a, b) { return a.x - b.x || b.w - a.w || a.idx - b.idx; });
    // o.agrupar(item) -> chave: barras curtas (menores que a largura mínima) da mesma chave que se encostam na tela viram
    // um bloco só ("7 retiradas"), com a lista no balão; evita uma pilha de sub-linhas de poucos pixels.
    if (o.agrupar) {
      var juntos = [], aberto = {};
      prep.forEach(function (p) {
        var ch = p.curta && !p.marco ? o.agrupar(p.item) : null;
        if (ch === null || ch === undefined || ch === '') { juntos.push(p); return; }
        var g = aberto[ch];
        if (g && p.x <= g.x + g.w + folga) { g.membros.push(p); g.w = Math.max(g.w, p.x + p.w - g.x); return; }
        g = aberto[ch] = { x: p.x, w: p.w, membros: [p], chave: ch, idx: p.idx };
        juntos.push(g);
      });
      prep = juntos.map(function (p) {
        if (!p.membros) return p;
        if (p.membros.length === 1) return p.membros[0];
        var its = p.membros.map(function (m) { return m.item; });
        var rot = o.rotuloGrupo ? o.rotuloGrupo(p.chave, its.length) : its.length + ' eventos';
        var grupo = { tipo: its[0].tipo, ini: Math.min.apply(null, its.map(function (i) { return i.ini; })), fim: Math.max.apply(null, its.map(function (i) { return i.fim; })), rotulo: rot, grupo: its };
        return { item: grupo, idx: p.idx, x: p.x, w: Math.max(p.w, min), marco: false, curta: false, agrupado: true, cands: [rot, String(its.length)] };
      }).sort(function (a, b) { return a.x - b.x || b.w - a.w || a.idx - b.idx; });
    }
    var fins = [];
    var cabe = function (ext) { for (var f = 0; f < fins.length; f++) if (fins[f] + folga <= ext.de) return f; return -1; };
    var out = prep.map(function (p) {
      var dentro = null, fora = null;
      var nCands = p.agrupado ? 1 : p.cands.length; // bloco agrupado: "7 retiradas" dentro ou fora; só o número quando não houver espaço
      if (!p.marco) for (var c = 0; c < nCands && !dentro; c++) if (medir(p.cands[c]) + pad <= p.w) dentro = p.cands[c];
      if (!dentro && p.cands.length) {
        fora = p.cands[0];
        if (medir(fora) > foraMax && p.cands.length > 1) fora = p.cands[1];
        if (medir(fora) > foraMax) fora = null;
      }
      var barra = { de: p.x, ate: p.x + p.w };
      var r = { item: p.item, x: p.x, w: p.w, faixa: -1, marco: p.marco, curta: p.curta, agrupado: !!p.agrupado, texto: '', posTexto: 'nenhum', fim: barra.ate };
      var comTexto = fora ? { de: p.x, ate: p.x + p.w + 5 + medir(fora) } : null;
      if (comTexto && o.limite && comTexto.ate > o.limite) { fora = null; comTexto = null; } // passaria do fim do quadro: fica só no balão
      var numero = p.agrupado && medir(p.cands[1]) + pad <= p.w ? p.cands[1] : '';
      if (dentro) { r.faixa = cabe(barra); r.texto = dentro; r.posTexto = 'dentro'; }
      else if (fora && cabe(comTexto) >= 0) { r.faixa = cabe(comTexto); r.texto = fora; r.posTexto = 'fora'; r.fim = comTexto.ate; }
      else if (cabe(barra) >= 0 || !fora) { r.faixa = cabe(barra); if (numero) { r.texto = numero; r.posTexto = 'dentro'; } }
      else { r.texto = fora; r.posTexto = 'fora'; r.fim = comTexto.ate; } // sub-linha nova, com o texto
      if (r.faixa < 0) { r.faixa = fins.length; fins.push(r.fim); } else fins[r.faixa] = r.fim;
      return r;
    });
    return { faixas: Math.max(1, fins.length), itens: out };
  }

  return { DIA: DIA, HORA: HORA, escala: escala, empilhar: empilhar, nomeCurto: nomeCurto, inicioDia: inicioDia, partes: partes, dataCurta: dataCurta, hora: hora, semana: SEMANA, meses: MESES };
}

/** Texto para a tela: define window.SGOGantt (uma vez) com as funções acima. */
function SGOGantt_codigoNavegador_() {
  return 'if(!window.SGOGantt){window.SGOGantt=(' + SGOGantt_fabrica_.toString() + ')();}';
}
