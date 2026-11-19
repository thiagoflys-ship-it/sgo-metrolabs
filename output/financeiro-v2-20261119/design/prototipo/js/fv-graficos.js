/* =====================================================================
   FINANCEIRO v2 — gráficos leves em SVG próprio (sem biblioteca).
   Por quê: o Chart.js da casca vem de CDN sob demanda (carregarChartJs_);
   no Financeiro os gráficos são poucos e simples, e o SVG próprio desenha
   na hora, imprime no A4 e não some quando a CDN cai.
   Regras: uma escala só (nunca dois eixos), linhas de 2 px, barras finas
   com ponta arredondada de 4 px, 2 px de folga entre barras, grade discreta,
   rótulos seletivos, dica ao passar o dedo/mouse e "Ver em tabela".
   ===================================================================== */

function Graf_svg_(l, a, conteudo, rotulo) { return '<svg viewBox="0 0 ' + l + " " + a + '" role="img" aria-label="' + Fin_esc_(rotulo) + '">' + conteudo + "</svg>"; }
function Graf_escala_(min, max, a, b) { return function (v) { return max === min ? a : a + (v - min) * (b - a) / (max - min); }; }
/** Passos "redondos" para o eixo (0, 100 mil, 200 mil…). */
function Graf_passos_(min, max, n) {
  var bruto = (max - min) / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(Math.abs(bruto) || 1))), p = [1, 2, 2.5, 5, 10].map(function (x) { return x * mag; }).filter(function (x) { return x >= bruto; })[0] || bruto;
  var lista = [], v = Math.floor(min / p) * p; while (v <= max + p * 0.001) { lista.push(v); v += p; } return lista;
}
/** Dica (tooltip) que segue o ponteiro; texto em tinta, nunca na cor da série. */
function Graf_dica_(caixa) { var d = caixa.querySelector(".fv-dica"); if (!d) { d = document.createElement("div"); d.className = "fv-dica"; d.hidden = true; caixa.appendChild(d); } return d; }
function Graf_tabela_(cab, linhas) {
  return '<details class="fv-graf-tab"><summary>Ver em tabela</summary><table class="cm-tabela"><thead><tr>' + cab.map(function (c, i) { return "<th" + (i ? ' class="n"' : "") + ">" + Fin_esc_(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
    linhas.map(function (l) { return "<tr>" + l.map(function (v, i) { return "<td" + (i ? ' class="n"' : "") + ' data-r="' + Fin_esc_(cab[i]) + '">' + Fin_esc_(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></details>";
}

/**
 * Previsão de caixa: linha do saldo projetado (2 px) + faixa de incerteza + linha do zero.
 * Marca o dia de menor saldo. Abaixo de zero a faixa fica vermelha (situação, com texto).
 */
function Graf_previsao_(alvo, serie, dias) {
  var s = serie.slice(0, dias + 1), L = Math.max(300, Math.round(alvo.clientWidth || 720)), A = 230, me = 64, md = 14, mt = 14, mb = 26;
  var vmin = Math.min(0, Math.min.apply(null, s.map(function (p) { return p.min; }))), vmax = Math.max.apply(null, s.map(function (p) { return p.max; }));
  var pass = Graf_passos_(vmin, vmax, 4); vmin = Math.min(vmin, pass[0]); vmax = Math.max(vmax, pass[pass.length - 1]);
  var x = Graf_escala_(0, dias, me, L - md), y = Graf_escala_(vmin, vmax, A - mb, mt);
  var h = pass.map(function (v) { return '<line class="grade" x1="' + me + '" x2="' + (L - md) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (me - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Fin_moedaCurta_(v) + "</text>"; }).join("");
  var marcas = [0, 15, 30, 45, 60, 75, 90].filter(function (d) { return d <= dias; });
  if (dias === 30) marcas = [0, 7, 14, 21, 30];
  if (L < 520) marcas = dias === 90 ? [0, 30, 60, 90] : dias === 60 ? [0, 30, 60] : [0, 15, 30];
  h += marcas.map(function (d) { var dt = FV_DADOS.dia(d); return '<text x="' + x(d) + '" y="' + (A - 6) + '" text-anchor="' + (d === 0 ? "start" : d === dias ? "end" : "middle") + '">' + (d === 0 ? "hoje" : Fin_data_(dt)) + "</text>"; }).join("");
  var faixa = s.map(function (p) { return x(p.d) + "," + y(p.max); }).join(" ") + " " + s.slice().reverse().map(function (p) { return x(p.d) + "," + y(p.min); }).join(" ");
  h += '<polygon points="' + faixa + '" fill="#1f3b57" opacity=".08"/>';
  if (vmin < 0) h += '<rect x="' + me + '" y="' + y(0) + '" width="' + (L - md - me) + '" height="' + (y(vmin) - y(0)) + '" fill="#FBEBE8" opacity=".7"/>';
  h += '<line class="zero" x1="' + me + '" x2="' + (L - md) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
  h += '<polyline points="' + s.map(function (p) { return x(p.d) + "," + y(p.saldo); }).join(" ") + '" fill="none" stroke="#1f3b57" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  var menor = s.reduce(function (a, p) { return p.saldo < a.saldo ? p : a; }, s[0]);
  h += '<circle cx="' + x(menor.d) + '" cy="' + y(menor.saldo) + '" r="5" fill="' + (menor.saldo < 0 ? "#A3261B" : "#7A5200") + '" stroke="#fff" stroke-width="2"/>';
  var aDireita = x(menor.d) > L * 0.6;
  h += '<text class="v" text-anchor="' + (aDireita ? "end" : "start") + '" x="' + (aDireita ? x(menor.d) - 8 : x(menor.d) + 8) + '" y="' + (y(menor.saldo) + 18) + '">menor saldo ' + Fin_moedaCurta_(menor.saldo) + " em " + Fin_data_(FV_DADOS.dia(menor.d)) + "</text>";
  h += '<line class="cursor" x1="0" x2="0" y1="' + mt + '" y2="' + (A - mb) + '" stroke="#4A4F4B" stroke-dasharray="3 3" opacity="0"/><circle class="cursor-pt" r="4" fill="#1f3b57" stroke="#fff" stroke-width="2" opacity="0"/>';
  h += '<rect class="alvo" x="' + me + '" y="' + mt + '" width="' + (L - md - me) + '" height="' + (A - mb - mt) + '" fill="transparent"/>';
  alvo.innerHTML = '<div class="fv-graf">' + Graf_svg_(L, A, h, "Saldo projetado para " + dias + " dias") + "</div>" +
    '<div class="fv-legenda"><span><i class="linha" style="background:#1f3b57"></i>Saldo projetado</span><span><i style="background:#1f3b57;opacity:.15"></i>Faixa provável (taxa de realização 67,7 %)</span><span><i style="background:#A3261B;border-radius:50%"></i>Dia de menor saldo</span></div>' +
    Graf_tabela_(["Data", "Saldo projetado", "Mínimo provável", "Máximo provável"], s.filter(function (p) { return p.d % 7 === 0; }).map(function (p) { return [Fin_dataLonga_(FV_DADOS.dia(p.d)), Fin_moeda_(p.saldo), Fin_moeda_(p.min), Fin_moeda_(p.max)]; }));
  var caixa = alvo.querySelector(".fv-graf"), svg = caixa.querySelector("svg"), dica = Graf_dica_(caixa), cur = svg.querySelector(".cursor"), pt = svg.querySelector(".cursor-pt");
  var mover = function (ev) {
    var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * L, d = Math.max(0, Math.min(dias, Math.round((px - me) / (L - md - me) * dias))), p = s[d];
    cur.setAttribute("x1", x(d)); cur.setAttribute("x2", x(d)); cur.setAttribute("opacity", "1"); pt.setAttribute("cx", x(d)); pt.setAttribute("cy", y(p.saldo)); pt.setAttribute("opacity", "1");
    dica.hidden = false; dica.style.left = (x(d) / L * r.width) + "px"; dica.style.top = (y(p.saldo) / A * r.height) + "px";
    dica.innerHTML = Fin_diaSemana_(FV_DADOS.dia(d)) + ", " + Fin_dataLonga_(FV_DADOS.dia(d)) + "<br>Saldo projetado <b>" + Fin_moeda_(p.saldo) + "</b><br>Faixa " + Fin_moedaCurta_(p.min) + " a " + Fin_moedaCurta_(p.max);
  };
  svg.querySelector(".alvo").addEventListener("pointermove", mover);
  svg.querySelector(".alvo").addEventListener("pointerleave", function () { dica.hidden = true; cur.setAttribute("opacity", "0"); pt.setAttribute("opacity", "0"); });
}

/**
 * Barras pareadas por mês (entradas × saídas) na mesma escala, com o resultado escrito embaixo.
 * itens: [{ rot, a, b, parcial }]; nomes: ["Recebido", "Pago"].
 */
function Graf_pareadas_(alvo, itens, nomes, cores) {
  cores = cores || ["var(--fv-entrada)", "var(--fv-saida)"];
  var L = Math.max(300, Math.round(alvo.clientWidth || 520)), A = 210, me = 56, md = 6, mt = 10, mb = 44, n = itens.length;
  var vmax = Math.max.apply(null, itens.map(function (i) { return Math.max(i.a, i.b); })); var pass = Graf_passos_(0, vmax, 4); vmax = pass[pass.length - 1];
  var y = Graf_escala_(0, vmax, A - mb, mt), larg = (L - me - md) / n, bw = Math.min(22, larg * 0.3);
  var h = pass.map(function (v) { return '<line class="grade" x1="' + me + '" x2="' + (L - md) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (me - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Fin_moedaCurta_(v) + "</text>"; }).join("");
  var barra = function (cx, v, cor, op) { var t = y(v), b = A - mb, r = Math.min(4, (b - t) / 2); return '<path d="M' + cx + "," + b + "V" + (t + r) + "q0,-" + r + " " + r + ",-" + r + "h" + (bw - 2 * r) + "q" + r + ",0 " + r + "," + r + "V" + b + 'Z" fill="' + cor + '" opacity="' + (op || 1) + '"/>'; };
  itens.forEach(function (it, i) {
    var cx = me + larg * i + larg / 2, res = it.a - it.b;
    h += barra(cx - bw - 1, it.a, cores[0], it.parcial ? 0.55 : 1) + barra(cx + 1, it.b, cores[1], it.parcial ? 0.55 : 1);
    h += '<text x="' + cx + '" y="' + (A - mb + 15) + '" text-anchor="middle">' + Fin_esc_(it.rot) + (it.parcial ? "*" : "") + "</text>";
    h += '<text class="v" x="' + cx + '" y="' + (A - mb + 31) + '" text-anchor="middle" style="fill:' + (res < 0 ? "var(--bc-danger)" : "var(--bc-action)") + '">' + (res < 0 ? "−" : "+") + Fin_moedaCurta_(Math.abs(res)).replace("R$ ", "") + "</text>";
    h += '<rect class="alvo" data-i="' + i + '" x="' + (cx - larg / 2) + '" y="' + mt + '" width="' + larg + '" height="' + (A - mt) + '" fill="transparent"/>';
  });
  h += '<line class="zero" x1="' + me + '" x2="' + (L - md) + '" y1="' + (A - mb) + '" y2="' + (A - mb) + '"/>';
  alvo.innerHTML = '<div class="fv-graf">' + Graf_svg_(L, A, h, nomes[0] + " e " + nomes[1] + " por mês") + "</div>" +
    '<div class="fv-legenda"><span><i style="background:' + cores[0] + '"></i>' + nomes[0] + '</span><span><i style="background:' + cores[1] + '"></i>' + nomes[1] + "</span><span>Linha de baixo: resultado do mês" + (itens.some(function (i) { return i.parcial; }) ? " · * mês em andamento" : "") + "</span></div>" +
    Graf_tabela_(["Mês", nomes[0], nomes[1], "Resultado"], itens.map(function (i) { return [i.rot, Fin_moeda_(i.a), Fin_moeda_(i.b), Fin_moeda_(i.a - i.b)]; }));
  var caixa = alvo.querySelector(".fv-graf"), svg = caixa.querySelector("svg"), dica = Graf_dica_(caixa);
  svg.querySelectorAll(".alvo").forEach(function (r) {
    r.addEventListener("pointerenter", function () {
      var it = itens[+r.getAttribute("data-i")], bb = svg.getBoundingClientRect(), cx = (+r.getAttribute("x") + larg / 2) / L * bb.width;
      dica.hidden = false; dica.style.left = cx + "px"; dica.style.top = (y(Math.max(it.a, it.b)) / A * bb.height) + "px";
      dica.innerHTML = Fin_esc_(it.rot) + (it.parcial ? " (até hoje)" : "") + "<br>" + nomes[0] + " <b>" + Fin_moeda_(it.a) + "</b><br>" + nomes[1] + " <b>" + Fin_moeda_(it.b) + "</b><br>Resultado <b>" + Fin_moeda_(it.a - it.b) + "</b>";
    });
    r.addEventListener("pointerleave", function () { dica.hidden = true; });
  });
}

/** Barras horizontais em HTML (categorias, maiores clientes). itens: [{ nome, v, extra, var }] */
function Graf_hbar_(itens, classe) {
  var max = Math.max.apply(null, itens.map(function (i) { return i.v; })) || 1;
  return itens.map(function (i) {
    return '<div class="fv-hbar" title="' + Fin_esc_(i.nome + ": " + Fin_moeda_(i.v)) + '"><span class="nome">' + Fin_esc_(i.nome) + '</span><span class="trilho ' + (classe || "") + '"><i style="width:' + (i.v / max * 100).toFixed(1) + '%"></i></span><span class="val">' + Fin_moedaCurta_(i.v) + (i.extra ? "<small>" + i.extra + "</small>" : "") + "</span></div>";
  }).join("");
}

/** Barra empilhada 100 % (empresas ou faixas de atraso), sempre com legenda e valores escritos. */
function Graf_pilha_(partes) {
  var tot = partes.reduce(function (s, p) { return s + p.v; }, 0) || 1;
  return '<div class="fv-pilha" role="img" aria-label="' + Fin_esc_(partes.map(function (p) { return p.nome + " " + Fin_moeda_(p.v); }).join(", ")) + '">' + partes.map(function (p) { return '<i class="' + p.c + '" style="width:' + (p.v / tot * 100).toFixed(2) + '%" title="' + Fin_esc_(p.nome + ": " + Fin_moeda_(p.v)) + '"></i>'; }).join("") + "</div>" +
    '<div class="fv-legenda">' + partes.map(function (p) { return '<span><i class="' + p.c + '" style="background:var(--fv-' + (p.c.indexOf("s") === 0 ? "seq-" + p.c.slice(1) : p.c) + ')"></i>' + Fin_esc_(p.nome) + " <b>" + Fin_moedaCurta_(p.v) + "</b> (" + Fin_pct_(p.v / tot * 100, 0) + ")</span>"; }).join("") + "</div>";
}

/** Orçado × realizado: duas barras finas por grupo (orçado em contorno, realizado cheio), mesma escala. */
function Graf_orcamento_(itens) {
  var max = Math.max.apply(null, itens.map(function (i) { return Math.max(i.orc, i.real); }));
  return itens.map(function (i) {
    var dif = (i.real - i.orc) / i.orc * 100, ruim = i.despesa ? dif > 10 : dif < -10;
    return '<div style="padding:6px 0;border-top:1px solid var(--bc-line-soft)"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span>' + Fin_esc_(i.g) + '</span><span class="fv-num" style="font-weight:600">' + Fin_moedaCurta_(i.real) + ' <small style="color:var(--muted);font-weight:400">de ' + Fin_moedaCurta_(i.orc) + "</small> " +
      (ruim ? '<span class="cm-selo ' + (Math.abs(dif) > 30 ? "vermelho" : "laranja") + '"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' + (dif > 0 ? "+" : "") + Fin_pct_(dif, 0) + "</span>" : '<span class="cm-selo verde">' + (dif > 0 ? "+" : "") + Fin_pct_(dif, 0) + "</span>") + "</span></div>" +
      '<div style="position:relative;height:16px;margin-top:4px"><i style="position:absolute;left:0;top:0;height:6px;width:' + (i.orc / max * 100) + '%;border:1px solid var(--fv-previsto);border-radius:0 3px 3px 0;box-sizing:border-box"></i><i style="position:absolute;left:0;top:8px;height:7px;width:' + (i.real / max * 100) + '%;background:var(--fv-entrada);border-radius:0 3px 3px 0"></i></div></div>';
  }).join("") + '<div class="fv-legenda"><span><i style="border:1px solid var(--fv-previsto);background:transparent"></i>Orçado</span><span><i style="background:var(--fv-entrada)"></i>Realizado</span><span>Selo: diferença sobre o orçado (despesa acima ou receita abaixo vira aviso)</span></div>';
}

/** Mini linha (saldo da conta nos últimos 30 dias). */
function Graf_sparkline_(vals) {
  var L = 120, A = 30, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), x = Graf_escala_(0, vals.length - 1, 1, L - 3), y = Graf_escala_(min, max, A - 3, 3);
  return '<svg viewBox="0 0 ' + L + " " + A + '" width="' + L + '" height="' + A + '" aria-hidden="true"><polyline points="' + vals.map(function (v, i) { return x(i) + "," + y(v); }).join(" ") + '" fill="none" stroke="#1f3b57" stroke-width="1.6"/><circle cx="' + x(vals.length - 1) + '" cy="' + y(vals[vals.length - 1]) + '" r="2.5" fill="#1f3b57"/></svg>';
}
