/****************************************************
 * RELATÓRIO DO CICLO DA LAVADORA — DOCUMENTO A4 DE UMA FOLHA (31/10/2026)
 *
 * Pedido do dono (31/10/2026): relatório A4 de uma única folha com a fita da impressora reproduzida "como se estivesse
 * escaneada", gráfico, indicadores, conclusão do ciclo e o campo de aprovação com a assinatura feita na tela.
 *
 *  - Moldura: a mesma dos documentos A4 do SGO+ (SGO_DocA4: cabeçalho e rodapé corridos com logo, nº, revisão, empresa
 *    e "Página X de Y"; blocos de indicadores e caixas de SGO_Documentos_RelatorioA4.js). Nada de estilo novo de cor.
 *  - Fita: reconstrução do comprovante que a lavadora imprime, linha por linha como impressora_imprimirTicket() do
 *    firmware da IHM (32 colunas, "TÉRMINO DE CICLO" ou "CICLO CANCELADO", fases com duração e temperatura máxima,
 *    só os 8 últimos eventos). O documento diz que é reprodução montada a partir do arquivo, não a digitalização do papel.
 *  - Gráfico: temperatura máxima registrada em cada fase ao longo do tempo (o arquivo não traz a curva contínua; a
 *    legenda diz isso). Faixas por grupo de fase; a desinfecção em destaque; a referência da receita, quando cadastrada.
 *  - Indicadores: só o que o arquivo sustenta (resultado, desinfecção: tempo e temperatura máxima, tempo total,
 *    temperatura final, falha, manutenção preventiva, fases e pausas). Sem critério normativo e sem A0.
 *  - Conclusão: a IA (Gemini, chave configurada pelo usuário) só redige a partir dos dados do arquivo; o texto volta
 *    conferido contra os números (temperaturas, tempos, contagens, datas) e o resultado. Se não bater, ou sem chave, vale a
 *    conclusão por regra fixa. O documento registra qual das duas foi usada.
 * Dados do cliente e do equipamento: sempre do cadastro do SGO+ (instantâneo gravado na geração), nunca do arquivo.
 * Nenhuma função devolve Date: só texto e número.
 ****************************************************/

var LAVCIC_LARGURA_FITA = 32;
var LAVCIC_FITA_EVENTOS = 8;
var LAVCIC_CORES_GRUPO = { LAVAGEM: '#dbe7f5', ENXAGUE: '#d7ecec', PREPARO_DESINFECCAO: '#f7e7d2', DESINFECCAO: '#f3d3b3', FINAL: '#e6e9ed', CANCELAMENTO: '#f6dada' };
var LAVCIC_NOMES_GRUPO = { LAVAGEM: 'Lavagem', ENXAGUE: 'Enxágue', PREPARO_DESINFECCAO: 'Preparo da desinfecção', DESINFECCAO: 'Desinfecção térmica', FINAL: 'Drenagem e arrefecimento', CANCELAMENTO: 'Cancelamento' };

function LavCicD_esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

/** Número no formato brasileiro (vírgula decimal). */
function LavCicD_num_(v, casas) {
  if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '—';
  var c = casas === undefined ? 1 : casas;
  var s = Number(v).toFixed(c).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s.join(',');
}
function LavCicD_temp_(v) { return v === null || v === undefined ? 'indisponível' : LavCicD_num_(v, 1) + ' °C'; }
/** Duração por extenso curto: 47 s, 16 min 00 s, 1 h 05 min. */
function LavCicD_dur_(seg) {
  var s = Math.max(0, Math.round(Number(seg) || 0));
  if (s < 60) return s + ' s';
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return h ? h + ' h ' + p2(m) + ' min' + (r ? ' ' + p2(r) + ' s' : '') : m + ' min ' + p2(r) + ' s';
}

// ------------------------------------------------------------
// FITA DA IMPRESSORA (reprodução de impressora_imprimirTicket do firmware)
// ------------------------------------------------------------
function LavCicD_padDir_(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function LavCicD_padEsq_(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
function LavCicD_chaveValor_(chave, valor) {
  var esp = LAVCIC_LARGURA_FITA - String(chave).length - String(valor).length;
  return chave + new Array(Math.max(1, esp) + 1).join(' ') + valor;
}
/** dd/mm HH:MM (o formato "%d/%m %H:%M" do firmware). */
function LavCicD_ddmmhhmm_(ponto) {
  if (!ponto) return 'INDISPONIVEL';
  return ponto.data.slice(0, 5) + ' ' + ponto.hora.slice(0, 5);
}

/** Linhas da fita: [{ t: texto, c: centralizado, b: negrito, g: altura dupla }]. A quebra em 32 colunas é feita aqui. */
function LavCicD_linhasFita_(ciclo) {
  var L = [], add = function (t, o) { o = o || {}; L.push({ t: String(t), c: !!o.c, b: !!o.b, g: !!o.g }); };
  var tracos = '------------------------', iguais = '========================';
  add('METROLABS', { c: 1, b: 1, g: 1 });
  add('SOLUÇÕES EM', { c: 1, b: 1 }); add('ENGENHARIA CLÍNICA', { c: 1, b: 1 }); add('SGO+ MEDICAL WASHER', { c: 1, b: 1 });
  add(iguais, { c: 1, b: 1 });
  add(ciclo.resultadoClasse === 'APROVADO' ? 'TÉRMINO DE CICLO' : 'CICLO CANCELADO', { c: 1, b: 1 });
  add(iguais, { c: 1, b: 1 });
  add(LavCicD_chaveValor_('LOTE:', ciclo.lote)); add(LavCicD_chaveValor_('OPERADOR:', ciclo.operador)); add(LavCicD_chaveValor_('RECEITA:', ciclo.receita));
  add(tracos);
  add(LavCicD_chaveValor_('INÍCIO:', ciclo.inicio && !ciclo.inicio.estimado ? LavCicD_ddmmhhmm_(ciclo.inicio) : 'INDISPONIVEL'));
  add(LavCicD_chaveValor_('TÉRMINO:', LavCicD_ddmmhhmm_(ciclo.fim)));
  var d = Math.round(Number(ciclo.duracaoSeg) || 0);
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  add(LavCicD_chaveValor_('DURAÇÃO:', d ? p2(Math.floor(d / 3600)) + ':' + p2(Math.floor((d % 3600) / 60)) + ':' + p2(d % 60) : 'INDISPONIVEL'));
  add(LavCicD_chaveValor_('TEMP FINAL:', ciclo.tempFinal === null ? 'INDISPONIVEL' : Number(ciclo.tempFinal).toFixed(1) + ' C'));
  add(tracos);
  add('[ ' + (ciclo.resultadoClasse === 'APROVADO' ? 'APROVADO' : ciclo.resultado || 'CANCELADO') + ' ]', { c: 1, b: 1 });
  if (ciclo.codFalha) add(ciclo.falha || ('FALHA CÓDIGO ' + ciclo.codFalha), { c: 1, b: 1 });
  if (ciclo.manutVencida) add('[ MANUTENÇÃO VENCIDA ]', { c: 1, b: 1 });
  add(tracos);
  if (ciclo.fases.length) {
    add('FASES DO PROCESSO', { c: 1, b: 1 });
    add('FASE           DUR   TMAX');
    ciclo.fases.forEach(function (f) {
      add(LavCicD_padDir_(f.nome, 14) + ' ' + LavCicD_padEsq_(f.duracaoSeg, 4) + 's ' + (f.tempMax === null ? 'INDISP' : LavCicD_padEsq_(Number(f.tempMax).toFixed(1), 5) + 'C'));
    });
    add(tracos);
  }
  if (ciclo.eventos.length) {
    add('ÚLTIMOS EVENTOS', { c: 1, b: 1 });
    ciclo.eventos.slice(-LAVCIC_FITA_EVENTOS).forEach(function (e) { add(e.hora.slice(0, 5) + ' ' + e.texto); });
    add(tracos);
  }
  add('____________________', { c: 1 }); add('ASSINATURA RESPONSÁVEL', { c: 1, b: 1 }); add('DOCUMENTO GERADO VIA SGO+', { c: 1 }); add('* FIM DE IMPRESSÃO *', { c: 1 });
  // a impressora quebra a linha na 33ª coluna
  var saida = [];
  L.forEach(function (l) {
    var t = l.t;
    if (t.length <= LAVCIC_LARGURA_FITA) { saida.push(l); return; }
    for (var i = 0; i < t.length; i += LAVCIC_LARGURA_FITA) saida.push({ t: t.slice(i, i + LAVCIC_LARGURA_FITA), c: l.c, b: l.b, g: l.g });
  });
  return saida;
}

function LavCicD_fitaHtml_(ciclo) {
  return '<div class="lc-fita" aria-label="Reprodução da fita impressa pela lavadora"><div class="lc-papel">' + LavCicD_linhasFita_(ciclo).map(function (l) {
    return '<div class="l' + (l.c ? ' c' : '') + (l.b ? ' b' : '') + (l.g ? ' g' : '') + '">' + (LavCicD_esc_(l.t) || '&nbsp;') + '</div>';
  }).join('') + '</div></div>';
}

// ------------------------------------------------------------
// GRÁFICO (SVG)
// ------------------------------------------------------------
function LavCicD_graficoSvg_(ciclo, ref) {
  var fases = ciclo.fases || [];
  if (!fases.length) return '<div class="lc-sem-grafico">O arquivo não traz fases registradas: o ciclo foi encerrado antes da primeira fase. Não há temperatura para mostrar.</div>';
  var W = 460, H = 148, ml = 34, mr = 8, mt = 10, mb = 26, pw = W - ml - mr, ph = H - mt - mb;
  var total = Math.max(1, ciclo.somaFasesSeg || fases.reduce(function (s, f) { return s + f.duracaoSeg; }, 0));
  var temps = fases.map(function (f) { return f.tempMax; }).filter(function (t) { return t !== null; });
  if (ref && ref.tempMin) temps.push(Number(ref.tempMin));
  if (ciclo.tempFinal !== null) temps.push(ciclo.tempFinal);
  var tMin = temps.length ? Math.floor((Math.min.apply(null, temps) - 5) / 10) * 10 : 20, tMax = temps.length ? Math.ceil((Math.max.apply(null, temps) + 5) / 10) * 10 : 80;
  if (tMax - tMin < 20) tMax = tMin + 20;
  var x = function (s) { return ml + (s / total) * pw; }, y = function (t) { return mt + ph - ((t - tMin) / (tMax - tMin)) * ph; };
  var r = function (n) { return Math.round(n * 10) / 10; };
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Temperatura máxima por fase ao longo do ciclo" font-family="Arial,Helvetica,sans-serif">';
  fases.forEach(function (f) {
    svg += '<rect x="' + r(x(f.inicioRelSeg)) + '" y="' + mt + '" width="' + r(Math.max(0.6, x(f.inicioRelSeg + f.duracaoSeg) - x(f.inicioRelSeg))) + '" height="' + ph + '" fill="' + (LAVCIC_CORES_GRUPO[f.grupo] || '#eef2f6') + '"/>';
  });
  for (var t = tMin; t <= tMax; t += 10) {
    svg += '<line x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + r(y(t)) + '" y2="' + r(y(t)) + '" stroke="#9aa5b1" stroke-width=".4" stroke-dasharray="' + (t === tMin ? '0' : '2 2') + '"/>';
    svg += '<text x="' + (ml - 4) + '" y="' + r(y(t) + 3) + '" font-size="8" fill="#3e4c59" text-anchor="end">' + t + '</text>';
  }
  svg += '<text x="9" y="' + r(mt + ph / 2) + '" font-size="8" fill="#3e4c59" text-anchor="middle" transform="rotate(-90 9 ' + r(mt + ph / 2) + ')">°C</text>';
  var passoMin = total > 5400 ? 20 : total > 2400 ? 10 : total > 900 ? 5 : 2;
  for (var m = 0; m * 60 <= total; m += passoMin) {
    svg += '<line x1="' + r(x(m * 60)) + '" x2="' + r(x(m * 60)) + '" y1="' + (mt + ph) + '" y2="' + (mt + ph + 3) + '" stroke="#52606d" stroke-width=".6"/>';
    svg += '<text x="' + r(x(m * 60)) + '" y="' + (mt + ph + 12) + '" font-size="8" fill="#3e4c59" text-anchor="middle">' + m + '</text>';
  }
  svg += '<text x="' + (ml + pw) + '" y="' + (H - 2) + '" font-size="8" fill="#3e4c59" text-anchor="end">minutos desde o início do ciclo</text>';
  if (ref && ref.tempMin) {
    svg += '<line x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + r(y(ref.tempMin)) + '" y2="' + r(y(ref.tempMin)) + '" stroke="#7b4fb0" stroke-width=".9" stroke-dasharray="5 3"/>';
    svg += '<text x="' + (ml + 3) + '" y="' + r(y(ref.tempMin) - 3) + '" font-size="7.5" fill="#5b3a86">referência ' + LavCicD_esc_(LavCicD_num_(ref.tempMin, 1)) + ' °C</text>';
  }
  // degraus: temperatura máxima de cada fase sobre a duração da fase
  var caminho = '', aberto = false;
  fases.forEach(function (f) {
    if (f.tempMax === null) { aberto = false; return; }
    var x0 = r(x(f.inicioRelSeg)), x1 = r(x(f.inicioRelSeg + f.duracaoSeg)), yy = r(y(f.tempMax));
    caminho += (aberto ? ' L' : ' M') + x0 + ' ' + yy + ' L' + x1 + ' ' + yy;
    aberto = true;
  });
  if (caminho) svg += '<path d="' + caminho.trim() + '" fill="none" stroke="#1f5fa8" stroke-width="1.6" stroke-linejoin="round"/>';
  fases.forEach(function (f) {
    if (f.grupo !== 'DESINFECCAO' || f.tempMax === null) return;
    var x0 = r(x(f.inicioRelSeg)), x1 = r(x(f.inicioRelSeg + f.duracaoSeg)), yy = r(y(f.tempMax));
    svg += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + yy + '" y2="' + yy + '" stroke="#b45309" stroke-width="3"/>';
    var lx = Math.min(x1, ml + pw - 2);
    svg += '<text x="' + r((x0 + x1) / 2) + '" y="' + r(yy - 5) + '" font-size="8" font-weight="700" fill="#8a4b00" text-anchor="' + (lx > ml + pw - 60 ? 'end' : 'middle') + '">' + LavCicD_esc_(LavCicD_num_(f.tempMax, 1)) + ' °C · ' + LavCicD_esc_(LavCicD_dur_(f.duracaoSeg)) + '</text>';
  });
  svg += '<rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#52606d" stroke-width=".6"/>';
  svg += '</svg>';
  var grupos = [];
  fases.forEach(function (f) { if (grupos.indexOf(f.grupo) < 0) grupos.push(f.grupo); });
  var leg = '<div class="leg-grafico">' + grupos.map(function (g) { return '<span><i style="background:' + LAVCIC_CORES_GRUPO[g] + ';border:.4pt solid #9aa5b1"></i>' + LavCicD_esc_(LAVCIC_NOMES_GRUPO[g]) + '</span>'; }).join('') +
    '<span><i style="background:#1f5fa8;height:.7mm"></i>Temperatura máxima da fase</span>' + (ref && ref.tempMin ? '<span><i class="tracejado" style="color:#7b4fb0;width:5mm"></i>Referência da receita</span>' : '') + '</div>';
  return svg + leg;
}

// ------------------------------------------------------------
// INDICADORES E REFERÊNCIA
// ------------------------------------------------------------
/** Avaliação contra a referência da receita (só quando cadastrada). Devolve { tem, atendeTemp, atendeTempo, texto }. */
function LavCicD_avaliarRef_(ciclo, ref) {
  if (!ref || (!ref.tempMin && !ref.tempoMinSeg)) return { tem: false };
  var d = ciclo.desinfeccao, out = { tem: true, confirmada: !!ref.confirmado, atendeTemp: null, atendeTempo: null };
  if (d && ref.tempMin && d.tempMax !== null) out.atendeTemp = d.tempMax >= Number(ref.tempMin);
  if (d && ref.tempoMinSeg) out.atendeTempo = d.duracaoSeg >= Number(ref.tempoMinSeg);
  return out;
}
function LavCicD_textoRef_(ref) {
  if (!ref || (!ref.tempMin && !ref.tempoMinSeg)) return '';
  var p = [];
  if (ref.tempMin) p.push('temperatura máxima na desinfecção de pelo menos ' + LavCicD_num_(ref.tempMin, 1) + ' °C');
  if (ref.tempoMinSeg) p.push('duração da desinfecção de pelo menos ' + LavCicD_dur_(ref.tempoMinSeg));
  return p.join(' e ');
}

/** Indicadores: [[valor, rótulo, situação]] no formato de RelA4_kpis_. */
function LavCicD_indicadores_(ciclo, ref) {
  var d = ciclo.desinfeccao, av = LavCicD_avaliarRef_(ciclo, ref);
  var res = ciclo.resultadoClasse;
  var k = [];
  k.push([ciclo.resultado || '—', 'Resultado registrado pela lavadora', res === 'APROVADO' ? 'ok' : 'critico']);
  k.push([d ? LavCicD_temp_(d.tempMax) : 'Sem desinfecção', d ? 'Desinfecção térmica: temperatura máxima' : 'Fase de desinfecção térmica', d ? (av.atendeTemp === false ? 'critico' : av.atendeTemp ? 'ok' : '') : (res === 'APROVADO' ? '' : 'aviso')]);
  k.push([d ? LavCicD_dur_(d.duracaoSeg) : '—', 'Desinfecção térmica: duração', d ? (av.atendeTempo === false ? 'critico' : av.atendeTempo ? 'ok' : '') : '']);
  k.push([LavCicD_dur_(ciclo.duracaoSeg), 'Tempo total do ciclo' + (ciclo.duracaoFonte === 'FASES' ? ' (soma das fases)' : ''), '']);
  k.push([LavCicD_temp_(ciclo.tempFinal), 'Temperatura no término', '']);
  k.push([ciclo.codFalha ? 'Código ' + ciclo.codFalha : (ciclo.codFalha === 0 ? 'Nenhuma' : (res === 'APROVADO' ? 'Nenhuma' : 'Não informada')), 'Falha registrada', ciclo.codFalha ? 'critico' : (res === 'APROVADO' ? 'ok' : 'aviso')]);
  k.push([ciclo.manutVencida === null ? 'Não informada' : ciclo.manutVencida ? 'Vencida' : 'Em dia', 'Manutenção preventiva no ciclo', ciclo.manutVencida ? 'aviso' : ciclo.manutVencida === false ? 'ok' : '']);
  k.push([String(ciclo.fases.length) + (ciclo.pausas ? ' · ' + ciclo.pausas + (ciclo.pausas === 1 ? ' pausa' : ' pausas') : ''), 'Fases registradas' + (ciclo.pausas ? ' e pausas' : ' (sem pausa)'), ciclo.pausas ? 'aviso' : '']);
  return k;
}

// ------------------------------------------------------------
// CONCLUSÃO: REGRA FIXA E IA CONFERIDA
// ------------------------------------------------------------
function LavCicD_periodoTexto_(ciclo) {
  var i = ciclo.inicio, f = ciclo.fim;
  if (i && f && !i.estimado) return (i.data === f.data ? 'em ' + i.data + ', das ' + i.hora.slice(0, 5) + ' às ' + f.hora.slice(0, 5) : 'de ' + i.data + ' ' + i.hora.slice(0, 5) + ' a ' + f.data + ' ' + f.hora.slice(0, 5));
  return f ? 'com término em ' + f.data + ' às ' + f.hora.slice(0, 5) : 'em ' + ciclo.data;
}

/** Conclusão por regra fixa, só com os números do arquivo e a referência cadastrada. */
function LavCicD_conclusaoRegra_(ciclo, ref) {
  var p = [], d = ciclo.desinfeccao, av = LavCicD_avaliarRef_(ciclo, ref);
  var ident = 'O ciclo do lote ' + ciclo.lote + ', receita ' + ciclo.receita + ', executado ' + LavCicD_periodoTexto_(ciclo);
  if (ciclo.resultadoClasse === 'APROVADO') {
    p.push(ident + ', foi concluído pela lavadora com o resultado APROVADO e sem registro de falha. Foram registradas ' + ciclo.fases.length + ' fases em ' + LavCicD_dur_(ciclo.duracaoSeg) + ' de duração total' + (ciclo.pausas ? ', com ' + ciclo.pausas + (ciclo.pausas === 1 ? ' pausa' : ' pausas') + ' durante o processo' : '') + '.');
    if (d) {
      var t = 'Na desinfecção térmica, a temperatura máxima registrada foi de ' + LavCicD_temp_(d.tempMax) + ', com duração de ' + LavCicD_dur_(d.duracaoSeg) + '.';
      if (av.tem) {
        var partes = [];
        if (av.atendeTemp !== null) partes.push('a temperatura máxima ' + (av.atendeTemp ? 'atingiu' : 'não atingiu') + ' o valor de referência de ' + LavCicD_num_(ref.tempMin, 1) + ' °C');
        if (av.atendeTempo !== null) partes.push('a duração ' + (av.atendeTempo ? 'atendeu' : 'não atendeu') + ' ao tempo de referência de ' + LavCicD_dur_(ref.tempoMinSeg));
        if (partes.length) t += ' Em relação à referência cadastrada para a receita' + (av.confirmada ? '' : ' (a confirmar pelo responsável técnico)') + ', ' + partes.join(' e ') + '.';
      }
      p.push(t);
    } else {
      p.push('A receita executada não teve fase de desinfecção térmica registrada; o ciclo corresponde à lavagem e ao enxágue.');
    }
  } else {
    var falha = ciclo.codFalha ? 'A falha registrada foi "' + ciclo.falha + '" (código ' + ciclo.codFalha + ')' : 'O arquivo não traz o código da falha que encerrou o ciclo';
    p.push(ident + ', foi encerrado pela lavadora com o resultado ' + ciclo.resultado + '. ' + falha + (ciclo.ultimaFase ? ', e a última fase registrada foi ' + ciclo.ultimaFase : ', antes do registro da primeira fase') + ', após ' + LavCicD_dur_(ciclo.duracaoSeg) + ' de processo.');
    if (d) p.push('A fase de desinfecção térmica chegou a ser registrada, com temperatura máxima de ' + LavCicD_temp_(d.tempMax) + ' por ' + LavCicD_dur_(d.duracaoSeg) + ', mas o ciclo não foi concluído.');
    p.push('Como o ciclo não chegou ao fim, a carga não deve ser liberada com base neste processamento e deve seguir o procedimento da unidade para ciclo interrompido.');
  }
  if (ciclo.manutVencida) p.push('No momento do ciclo, a lavadora indicava manutenção preventiva vencida; recomenda-se regularizar a manutenção.');
  p.push('O arquivo registra a temperatura máxima de cada fase, e não a curva contínua; o patamar mantido durante a desinfecção depende de medição independente e da avaliação do responsável técnico.');
  return p.join(' ');
}

/** Contexto enviado à IA: só dados do arquivo e a referência cadastrada. */
function LavCicD_contextoIa_(ciclo, ref) {
  var d = ciclo.desinfeccao;
  return {
    lote: ciclo.lote, receita: ciclo.receita, resultado: ciclo.resultado, inicio: ciclo.inicio ? ciclo.inicio.data + ' ' + ciclo.inicio.hora : '', termino: ciclo.fim ? ciclo.fim.data + ' ' + ciclo.fim.hora : '',
    duracaoTotal: LavCicD_dur_(ciclo.duracaoSeg), temperaturaNoTermino: LavCicD_temp_(ciclo.tempFinal), codigoFalha: ciclo.codFalha, falha: ciclo.falha || 'nenhuma',
    manutencaoPreventivaVencida: ciclo.manutVencida, pausas: ciclo.pausas, quantidadeFases: ciclo.fases.length, ultimaFase: ciclo.ultimaFase,
    fases: ciclo.fases.map(function (f) { return f.nome + ': ' + LavCicD_dur_(f.duracaoSeg) + ', máxima ' + LavCicD_temp_(f.tempMax); }),
    desinfeccao: d ? { temperaturaMaxima: LavCicD_temp_(d.tempMax), duracao: LavCicD_dur_(d.duracaoSeg) } : 'não houve fase de desinfecção térmica',
    referenciaDaReceita: LavCicD_textoRef_(ref) ? LavCicD_textoRef_(ref) + (ref.confirmado ? ' (confirmada pelo responsável técnico)' : ' (a confirmar pelo responsável técnico)') : 'não cadastrada'
  };
}
function LavCicD_promptIa_(ciclo, ref) {
  return 'Você redige a conclusão de um relatório técnico de um ciclo de lavadora ultrassônica de instrumental de CME. ' +
    'Escreva um único parágrafo de 3 a 5 frases, em português do Brasil, com os dados abaixo e somente eles. ' +
    'Diga o resultado registrado pela lavadora com a mesma palavra do dado (' + ciclo.resultado + '), o período, a duração total e, se houver, a temperatura máxima e a duração da desinfecção térmica. ' +
    'Se o ciclo não foi aprovado, diga a falha registrada e que a carga não deve ser liberada com base neste processamento. ' +
    'Se houver referência da receita, compare com ela e diga se está confirmada ou a confirmar pelo responsável técnico. ' +
    'Diga que o arquivo registra a temperatura máxima de cada fase e não a curva contínua. ' +
    'Não cite norma, parâmetro A0, valor de referência que não esteja nos dados, fabricante ou marca. Use os números exatamente como estão escritos nos dados (vírgula decimal, unidades iguais). ' +
    'Dados do ciclo (JSON): ' + JSON.stringify(LavCicD_contextoIa_(ciclo, ref));
}

/** Todos os números que o texto pode citar (como texto normalizado: "61.3", "16", "2026"...). */
function LavCicD_numerosPermitidos_(ciclo, ref) {
  var ok = {};
  var poe = function (v) { if (v === null || v === undefined || v === '') return; (String(v).replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || []).forEach(function (n) { ok[LavCicD_normNum_(n)] = 1; }); };
  var dur = function (s) { poe(LavCicD_dur_(s)); poe(s); poe(Math.round(s / 60)); poe((s / 60).toFixed(1)); };
  poe(ciclo.lote); poe(ciclo.receita); poe(ciclo.data); poe(ciclo.hora); poe(ciclo.codFalha); poe(ciclo.falha); poe(ciclo.pausas); poe(ciclo.fases.length); poe(ciclo.eventos.length);
  if (ciclo.inicio) { poe(ciclo.inicio.data); poe(ciclo.inicio.hora); poe(ciclo.inicio.hora.slice(0, 5)); }
  if (ciclo.fim) { poe(ciclo.fim.data); poe(ciclo.fim.hora); poe(ciclo.fim.hora.slice(0, 5)); }
  if (ciclo.tempFinal !== null) poe(Number(ciclo.tempFinal).toFixed(1));
  dur(ciclo.duracaoSeg);
  ciclo.fases.forEach(function (f) { if (f.tempMax !== null) poe(Number(f.tempMax).toFixed(1)); dur(f.duracaoSeg); });
  if (ciclo.desinfeccao) { dur(ciclo.desinfeccao.duracaoSeg); if (ciclo.desinfeccao.tempMax !== null) poe(Number(ciclo.desinfeccao.tempMax).toFixed(1)); }
  if (ref) { if (ref.tempMin) poe(Number(ref.tempMin).toFixed(1)); if (ref.tempoMinSeg) dur(Number(ref.tempoMinSeg)); }
  return ok;
}
function LavCicD_normNum_(n) { var s = String(n); if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, ''); s = s.replace(/^0+(?=\d)/, ''); return s; }

/**
 * Confere o texto da IA contra os dados. Devolve { ok, motivo }.
 *  - todo número citado precisa existir nos dados (temperatura, tempo, contagem, data, hora, lote, código);
 *  - o resultado precisa aparecer com a palavra certa, e nenhum resultado contrário;
 *  - com desinfecção, a temperatura máxima e a duração dela precisam estar no texto.
 */
function LavCicD_conferirIa_(texto, ciclo, ref) {
  var t = String(texto || '').trim();
  if (t.length < 120) return { ok: false, motivo: 'texto curto demais' };
  if (t.length > 1800) return { ok: false, motivo: 'texto longo demais para a folha' };
  if (/\bA0\b|\bNBR\b|\bISO\b|\bRDC\b|norma/i.test(t)) return { ok: false, motivo: 'citou norma ou parâmetro que o arquivo não sustenta' };
  var ok = LavCicD_numerosPermitidos_(ciclo, ref);
  var achados = (t.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').match(/\d+(?:,\d+)?(?:\.\d+)?/g) || []);
  for (var i = 0; i < achados.length; i++) {
    var n = LavCicD_normNum_(achados[i].replace(',', '.'));
    if (!ok[n]) return { ok: false, motivo: 'citou o número ' + achados[i] + ', que não está nos dados do arquivo' };
  }
  var baixo = t.toLowerCase();
  var classe = ciclo.resultadoClasse;
  if (classe === 'APROVADO') {
    if (!/aprovad/.test(baixo)) return { ok: false, motivo: 'não disse o resultado (aprovado)' };
    if (/reprovad|cancelad/.test(baixo)) return { ok: false, motivo: 'escreveu um resultado diferente do registrado (aprovado)' };
  } else {
    if (baixo.indexOf(String(ciclo.resultado).toLowerCase().slice(0, 7)) < 0) return { ok: false, motivo: 'não disse o resultado registrado (' + ciclo.resultado + ')' };
    if (/(?<!não\s(foi\s)?)\baprovad[oa]\b/.test(baixo)) return { ok: false, motivo: 'escreveu "aprovado" para um ciclo ' + ciclo.resultado.toLowerCase() };
  }
  var d = ciclo.desinfeccao;
  if (d && d.tempMax !== null && t.indexOf(LavCicD_num_(d.tempMax, 1)) < 0) return { ok: false, motivo: 'não citou a temperatura máxima da desinfecção (' + LavCicD_num_(d.tempMax, 1) + ' °C)' };
  if (d && classe === 'APROVADO' && t.indexOf(LavCicD_dur_(d.duracaoSeg)) < 0 && t.indexOf(String(Math.round(d.duracaoSeg / 60)) + ' min') < 0) return { ok: false, motivo: 'não citou a duração da desinfecção' };
  return { ok: true };
}

/**
 * Conclusão do ciclo: tenta a IA e confere; sem chave, com falha ou texto que não confere, vale a regra fixa.
 * Devolve { texto, origem: 'IA'|'REGRA', motivo }.
 */
function LavCicD_conclusao_(ciclo, ref) {
  var regra = LavCicD_conclusaoRegra_(ciclo, ref);
  if (typeof RelA4_gemini_ !== 'function') return { texto: regra, origem: 'REGRA', motivo: 'IA indisponível neste ambiente' };
  var bruto;
  try {
    bruto = RelA4_gemini_(LavCicD_promptIa_(ciclo, ref) + (typeof RELA4_REGRAS_REDACAO === 'string' ? '\n\n' + RELA4_REGRAS_REDACAO : ''), { tokens: 900, raciocinio: 2048, temperatura: 0.2 });
  } catch (e) {
    return { texto: regra, origem: 'REGRA', motivo: e && e.semChave ? 'a chave da IA não está cadastrada' : 'a IA não respondeu (' + String((e && e.message) || e).replace(/[.\s]+$/, '').slice(0, 160) + ')' };
  }
  var texto = typeof RelA4_limparTextoIa_ === 'function' ? RelA4_limparTextoIa_(bruto) : String(bruto || '').trim();
  texto = texto.replace(/\s*\n+\s*/g, ' ').trim();
  var c = LavCicD_conferirIa_(texto, ciclo, ref);
  if (!c.ok) return { texto: regra, origem: 'REGRA', motivo: 'o texto da IA foi recusado na conferência: ' + c.motivo };
  return { texto: texto, origem: 'IA', motivo: '' };
}

// ------------------------------------------------------------
// DOCUMENTO
// ------------------------------------------------------------
/** "30/10/2026, 18:42:04 a 19:35:54" (data só uma vez quando o ciclo começa e termina no mesmo dia). */
function LavCicD_inicioFim_(c) {
  var i = c.inicio, f = c.fim;
  if (!f) return '—';
  if (!i) return 'término ' + f.data + ' ' + f.hora;
  return (i.data === f.data ? i.data + ', ' + i.hora + ' a ' + f.hora : i.data + ' ' + i.hora + ' a ' + f.data + ' ' + f.hora) + (i.estimado ? ' (início calculado)' : '');
}

function LavCicD_estilos_() {
  // ruído leve de papel (SVG) para a fita reproduzida; nada de filtro CSS (o PDF rasterizaria a folha inteira)
  var ruido = 'data:image/svg+xml;base64,' + (typeof Utilities !== 'undefined' && Utilities.base64Encode ? Utilities.base64Encode('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .43  0 0 0 0 .38  0 0 0 .10 0"/></filter><rect width="140" height="140" filter="url(#n)"/></svg>') : '');
  return '' +
    '@media screen{.folha{padding-top:10mm}}h1{font-size:14pt;margin-bottom:.6mm}.subtitulo{font-size:9.4pt;margin-bottom:2mm}' +
    'table.lc-ficha{font-size:7.4pt;line-height:1.25;margin:0 0 2mm;table-layout:fixed}table.lc-ficha th,table.lc-ficha td{padding:.55mm 1.4mm;width:auto}table.lc-ficha th{white-space:nowrap}table.lc-ficha col.r{width:10.8%}table.lc-ficha col.v{width:22.5%}' +
    '.resultado.lc-res{display:flex;flex-wrap:wrap;align-items:baseline;gap:1mm 3mm;margin:0 0 2.4mm;padding:1.4mm 3.2mm}.lc-res .rot{font-size:7.8pt;color:#52606d}.lc-res .val{font-size:11.5pt;font-weight:700}.lc-res .mot{font-size:8.2pt;color:#1f2933}' +
    '.resultado.lc-res.ok .val{color:#1d6b3f}.resultado.lc-res.nok .val{color:#a61b1b}' +
    '.lc-grade{display:grid;grid-template-columns:53mm 1fr;gap:5mm;align-items:start}' +
    '.lc-tit{font-size:8.6pt;font-weight:700;color:#0b3d6e;text-transform:uppercase;letter-spacing:.02em;margin:0 0 1.2mm;padding-bottom:.6mm;border-bottom:.6pt solid #0b3d6e}' +
    '.lc-fita{padding:1.2mm 0 0}' +
    '.lc-papel{width:50mm;margin:0 auto;background:#fbfaf5' + (ruido ? ' url(' + ruido + ')' : '') + ';color:#262626;font:5.95pt/1.1 "Courier New",Courier,monospace;padding:2.6mm 2mm 3mm;' +
      'transform:rotate(-.55deg);box-shadow:0 .3mm 1.1mm rgba(0,0,0,.28),inset 0 0 3mm rgba(120,110,90,.10);' +
      '-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.lc-papel{clip-path:polygon(0 1.2mm,5% 0,10% 1.1mm,15% .1mm,20% 1mm,25% .2mm,30% 1.1mm,35% 0,40% 1mm,45% .2mm,50% 1.2mm,55% 0,60% .9mm,65% .1mm,70% 1.1mm,75% 0,80% 1mm,85% .2mm,90% 1.1mm,95% 0,100% 1mm,' +
      '100% calc(100% - 1mm),95% 100%,90% calc(100% - 1.1mm),85% calc(100% - .1mm),80% calc(100% - 1mm),75% 100%,70% calc(100% - 1.2mm),65% calc(100% - .2mm),60% calc(100% - 1mm),55% 100%,50% calc(100% - 1.1mm),45% calc(100% - .2mm),40% calc(100% - 1mm),35% 100%,30% calc(100% - 1.2mm),25% calc(100% - .1mm),20% calc(100% - 1mm),15% 100%,10% calc(100% - 1.1mm),5% calc(100% - .2mm),0 calc(100% - 1mm))}' +
    '.lc-papel .l{white-space:pre;text-shadow:0 0 .12mm rgba(0,0,0,.45);overflow:hidden}.lc-papel .c{text-align:center}.lc-papel .b{font-weight:700}' +
    '.lc-papel .g{font-size:9.8pt;line-height:1.12;letter-spacing:.04em;margin:.4mm 0 .6mm}' +
    '.lc-papel .l:nth-child(7n+3){opacity:.86}.lc-papel .l:nth-child(11n+5){opacity:.92}' +
    '.lc-nota-fita{font-size:6.6pt;color:#52606d;line-height:1.25;margin:0 0 1.2mm;text-align:left}' +
    '.lc-dir .kpis{grid-template-columns:repeat(4,1fr);gap:1.3mm;margin:0 0 1.4mm}.lc-dir .kpi{padding:1mm 1.5mm .9mm}.lc-dir .kpi .v{font-size:9.6pt;white-space:normal;line-height:1.15}.lc-dir .kpi .r{font-size:6.8pt;line-height:1.2}' +
    '.lc-ref{font-size:7.4pt;color:#3e4c59;margin:0 0 2mm;text-align:left;line-height:1.3}' +
    '.lc-dir figure{margin:0 0 1.6mm}.lc-dir figure svg{width:100%;height:auto;display:block}.lc-dir .leg-grafico{font-size:6.9pt;gap:.6mm 3mm}.lc-dir .leg-grafico i{width:2.6mm;height:2.6mm}' +
    '.lc-dir figcaption{font-size:6.9pt;margin-top:.8mm;line-height:1.3}' +
    '.lc-ocor{font-size:7.4pt;color:#3e4c59;margin:0 0 2mm;text-align:left}' +
    '.lc-conclusao{margin-top:1.6mm}.lc-conclusao p{font-size:8.1pt;line-height:1.36;margin:0 0 .8mm}.lc-origem{font-size:6.9pt;color:#52606d;text-align:left !important}' +
    '.lc-aprov{margin-top:2.4mm;border:.6pt solid #9aa5b1;display:grid;grid-template-columns:50mm 1fr;break-inside:avoid;page-break-inside:avoid}' +
    '.lc-aprov .cab{grid-column:1/3;background:#eef2f6;color:#243b53;font-weight:700;font-size:8.2pt;padding:.9mm 2.4mm;border-bottom:.6pt solid #9aa5b1}' +
    '.lc-aprov .ass{border-right:.6pt solid #bcc5cf;padding:1.2mm 2.4mm;display:flex;flex-direction:column;justify-content:flex-end;min-height:19mm}' +
    '.lc-aprov .ass img{max-height:14mm;max-width:100%;display:block;margin:0 auto}' +
    '.lc-aprov .ass .linha{border-top:.6pt solid #3e4c59;margin-top:1mm;padding-top:.8mm;font-size:7.4pt;color:#52606d;text-align:center}' +
    '.lc-aprov .pend{font-size:7.8pt;color:#8a4b00;text-align:center;margin:auto 0 2mm}' +
    '.lc-aprov table{width:100%;border-collapse:collapse;font-size:7.5pt;table-layout:fixed}.lc-aprov td,.lc-aprov th{padding:.5mm 2.2mm;border-bottom:.4pt solid #e1e5ea;text-align:left;vertical-align:top}' +
    '.lc-aprov th{width:20mm;white-space:nowrap;color:#3e4c59;font-weight:600}.lc-aprov td.hash{font:6.6pt/1.25 "Courier New",monospace;word-break:break-all}' +
    '.lc-rastro{font-size:6.7pt;color:#616e7c;line-height:1.3;margin:1.8mm 0 0;text-align:left}' +
    '.lc-falha{border:1pt solid #a61b1b;background:#fcf3f3;color:#a61b1b;font-weight:700;font-size:8.6pt;padding:1.4mm 3mm;margin:0 0 2.4mm}' +
    '.lc-sem-grafico{border:.5pt dashed #9aa5b1;padding:6mm 3mm;font-size:8pt;color:#52606d;text-align:center;margin:0 0 2mm}' +
    '.lc-miolo.lc-n1{zoom:.93}.lc-miolo.lc-n2{zoom:.86}.lc-miolo.lc-n3{zoom:.78}' +
    '@media screen and (max-width:640px){.lc-grade{grid-template-columns:1fr}.lc-dir .kpis{grid-template-columns:repeat(2,1fr)}.lc-aprov{grid-template-columns:1fr}.lc-aprov .cab{grid-column:1}.lc-aprov .ass{border-right:0;border-bottom:.6pt solid #bcc5cf}}';
}

/**
 * Monta o HTML A4.
 * d: { numero, versao, ciclo, cadastro: { cliente, cnpj, unidade, setor, equipamento, fabricante, modelo, serie, patrimonio, tag },
 *      referencia, conclusao: { texto, origem, motivo }, emitidoEm, emitidoPor, arquivo: { nome, sha256, importadoPor, importadoEm },
 *      versaoAnterior: { versao, motivo }, assinatura: { imagem (data URI), nome, cargo, data, hora, usuario, hashDocumento } }
 */
function LavCicD_html_(d) {
  var c = d.ciclo, cad = d.cadastro || {}, ref = d.referencia || null;
  var aprovado = c.resultadoClasse === 'APROVADO';
  var vazio = function (v) { return String(v == null ? '' : v).trim() || '—'; };
  var idEq = [cad.patrimonio ? 'Patrimônio ' + cad.patrimonio : '', cad.tag ? 'TAG ' + cad.tag : ''].filter(Boolean).join(' · ');
  // ficha em 3 pares por linha; cliente e unidade ocupam duas colunas (nomes longos), com CNPJ e setor ao lado
  var cel = function (rot, val, largo) { return '<th>' + LavCicD_esc_(rot) + '</th><td' + (largo ? ' colspan="3"' : '') + '>' + LavCicD_esc_(val) + '</td>'; };
  var fichaHtml = '<table class="t ident ficha lc-ficha"><colgroup><col class="r"><col class="v"><col class="r"><col class="v"><col class="r"><col class="v"></colgroup><tbody>' +
    '<tr>' + cel('Cliente', vazio(cad.cliente), true) + cel('CNPJ', vazio(cad.cnpj)) + '</tr>' +
    '<tr>' + cel('Unidade', vazio(cad.unidade), true) + cel('Setor', vazio(cad.setor)) + '</tr>' +
    '<tr>' + cel('Equipamento', vazio(cad.equipamento)) + cel('Fabricante', vazio(cad.fabricante)) + cel('Modelo', vazio(cad.modelo)) + '</tr>' +
    '<tr>' + cel('Nº de série', vazio(cad.serie)) + cel('Identificação', vazio(idEq)) + cel('Lote', c.lote) + '</tr>' +
    '<tr>' + cel('Receita', c.receita) + cel('Operador', vazio(c.operador)) + cel('Período', LavCicD_inicioFim_(c)) + '</tr></tbody></table>';
  var doc = {
    titulo: 'Relatório do ciclo de lavagem e desinfecção', subtitulo: 'Lote ' + c.lote + ' · ' + c.data + ' · Receita ' + c.receita,
    tituloCurto: 'Relatório do ciclo da lavadora', rotuloNumero: 'Nº', numero: d.numero, revisao: Math.max(0, (Number(d.versao) || 1) - 1),
    empresa: typeof RelA4_empresa_ === 'function' ? RelA4_empresa_() : { nome: 'Metrolab Soluções em Engenharia Clínica LTDA' }, orientacao: 'retrato'
  };
  // resultado numa linha: a folha é uma só (A4 retrato)
  var textoRes = aprovado ? 'Ciclo concluído pela lavadora sem falha registrada.' : (c.codFalha ? 'Falha: ' + c.falha + ' (código ' + c.codFalha + ')' + (c.ultimaFase ? ', na fase ' + c.ultimaFase : '') + '.' : 'Ciclo encerrado sem o código da falha no arquivo.') + ' A carga não deve ser liberada com base neste ciclo.';
  var topo = fichaHtml +
    '<div class="resultado lc-res ' + (aprovado ? 'ok' : 'nok') + '"><span class="rot">Resultado registrado pela lavadora</span><span class="val">' + LavCicD_esc_(c.resultado || '—') + '</span><span class="mot">' + LavCicD_esc_(textoRes) + '</span></div>';
  var h = SGO_DocA4_inicioDocumento_(doc);
  h = h.replace('</head>', '<style>' + (typeof RelA4_estilosExtra_ === 'function' ? RelA4_estilosExtra_(false) : '') + LavCicD_estilos_() + '</style></head>');
  h = h.replace('<main class="folha">', '<!--LAVCIC_AVISOS--><main class="folha">');
  var corpo = topo;
  // encaixe na folha (LavCic_montar_): nível 1 a 3 reduz a escala do miolo (fita, gráfico, indicadores e conclusão) quando o PDF passa de uma página
  var nivel = Math.max(0, Math.min(3, Number(d.encaixe) || 0));
  corpo += '<div class="lc-miolo' + (nivel ? ' lc-n' + nivel : '') + '">';
  corpo += '<div class="lc-grade"><div class="lc-esq"><div class="lc-tit">Fita impressa pela lavadora</div>' +
    '<p class="lc-nota-fita">Reprodução do comprovante impresso, montada a partir do arquivo do ciclo (mesmo conteúdo e ordem; como no papel, só os ' + LAVCIC_FITA_EVENTOS + ' últimos eventos).</p>' + LavCicD_fitaHtml_(c) + '</div>';
  corpo += '<div class="lc-dir"><div class="lc-tit">Indicadores do ciclo</div>' + (typeof RelA4_kpis_ === 'function' ? RelA4_kpis_(LavCicD_indicadores_(c, ref)) : '');
  var tRef = LavCicD_textoRef_(ref);
  corpo += '<p class="lc-ref">' + (tRef ? 'Referência cadastrada para a receita ' + LavCicD_esc_(c.receita) + ': ' + LavCicD_esc_(tRef) + (ref.confirmado ? ', confirmada por ' + LavCicD_esc_(ref.confirmadoPor || 'responsável técnico') + (ref.confirmadoEm ? ' em ' + LavCicD_esc_(ref.confirmadoEm) : '') + '.' : ' (a confirmar pelo responsável técnico).') :
    'Sem valor de referência cadastrado para a receita ' + LavCicD_esc_(c.receita) + ': os indicadores mostram o que a lavadora registrou, sem comparação.') + '</p>';
  corpo += '<div class="lc-tit">Temperatura ao longo do ciclo</div><figure class="grafico">' + LavCicD_graficoSvg_(c, ref) +
    '<figcaption><b>Figura 1</b> — Temperatura máxima registrada em cada fase, sobre a duração da fase. O arquivo não traz a leitura contínua do sensor.</figcaption></figure>';
  var ocor = (c.ocorrencias || []).filter(function (o) { return !/FIM DE FASE/.test(o); });
  if (ocor.length) corpo += '<p class="lc-ocor"><b>Ocorrências registradas:</b> ' + LavCicD_esc_(ocor.slice(0, 6).join('; ')) + (ocor.length > 6 ? '; e mais ' + (ocor.length - 6) : '') + '.</p>';
  var conc = d.conclusao || { texto: '', origem: 'REGRA' };
  var blocoConc = '<div class="lc-conclusao"><div class="lc-tit">Conclusão</div><p>' + LavCicD_esc_(conc.texto) + '</p>' +
    '<p class="lc-origem">' + (conc.origem === 'IA' ? 'Redação assistida por inteligência artificial a partir dos dados do arquivo e conferida automaticamente com eles (temperaturas, tempos, contagens e resultado).' : 'Conclusão escrita por regra fixa do sistema a partir dos dados do arquivo.') + '</p></div>';
  // fita curta (ciclo cancelado no começo): a conclusão vai para a largura toda, abaixo; fita longa: ao lado, embaixo do gráfico
  var concLarga = LavCicD_linhasFita_(c).length < 44;
  corpo += (concLarga ? '' : blocoConc) + '</div></div>' + (concLarga ? blocoConc : '') + '</div>';
  // aprovação
  var a = d.assinatura;
  corpo += '<div class="lc-aprov"><div class="cab">Aprovação do responsável pelo local</div><div class="ass">' +
    (a && a.imagem ? '<img src="' + LavCicD_esc_(a.imagem) + '" alt="Assinatura de ' + LavCicD_esc_(a.nome) + '"><div class="linha">' + LavCicD_esc_(a.nome) + '</div>' : '<div class="pend">Aguardando a assinatura do responsável pelo local.</div><div class="linha">Assinatura</div>') + '</div>' +
    '<table><tr><th>Nome</th><td>' + LavCicD_esc_(a ? a.nome : '') + '</td><th>Cargo</th><td>' + LavCicD_esc_(a ? a.cargo : '') + '</td></tr>' +
    '<tr><th>Data e hora</th><td>' + LavCicD_esc_(a ? a.data + ' às ' + a.hora : '') + '</td><th>Registrado por</th><td>' + LavCicD_esc_(a ? a.usuario : '') + '</td></tr>' +
    '<tr><th>Documento</th><td class="hash" colspan="3">' + (a ? 'SHA-256 ' + LavCicD_esc_(a.hashDocumento) + ' (versão conferida antes da assinatura)' : '') + '</td></tr></table></div>';
  var arq = d.arquivo || {};
  corpo += '<p class="lc-rastro">Emissão: ' + LavCicD_esc_(vazio(d.emitidoEm)) + (d.emitidoPor ? ' por ' + LavCicD_esc_(d.emitidoPor) : '') + '. Dados do ciclo: arquivo ' + LavCicD_esc_(arq.nome || (c.lote + '.sgolav')) + ' gravado pela lavadora (formato SGOLAV1' + (c.formato === 'ANTIGO' ? ', revisão anterior do firmware' : '') + ')' +
    (arq.sha256 ? ', resumo SHA-256 ' + LavCicD_esc_(arq.sha256) : '') + (arq.importadoPor && arq.importadoPor !== d.emitidoPor ? ', importado por ' + LavCicD_esc_(arq.importadoPor) : '') +
    '. Dados do cliente e do equipamento: cadastro do SGO+.' + (d.versaoAnterior ? ' Versão ' + (Number(d.versao) || 1) + ', substitui a versão ' + LavCicD_esc_(d.versaoAnterior.versao) + ' (motivo: ' + LavCicD_esc_(d.versaoAnterior.motivo) + ').' : '') +
    (a && a.imagem ? ' Assinado na tela do SGO+; documento travado, correção só em nova versão.' : '') + '</p>';
  return h + corpo + SGO_DocA4_fimDocumento_();
}
