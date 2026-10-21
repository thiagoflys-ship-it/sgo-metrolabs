/****************************************************
 * FROTA — TELA DAS RESERVAS (20/10/2026)
 *
 * Código do navegador (nunca executado no servidor): Frota_telaReservas_ devolve o CSS e o texto da função
 * FrotaRes_telaNavegador_; Frota_obterTelaRastreamento (SGO_Frota_RastreamentoTela.js) junta os dois e o
 * carregador JS_Frota.html executa logo depois do módulo da Frota (uma chamada só para abrir).
 * Aba "Reservas" (toda a equipe interna): Agenda (semana e dia, por veículo), Minhas reservas, Reservar
 * (veículo livre já sugerido pelo período) e, para a gestão, Todas as reservas, Indicadores e relatório A4 e Regras.
 * No celular a agenda da semana vira uma lista por dia (sem rolagem lateral). Nada se atualiza sozinho com
 * formulário aberto: a agenda só é relida depois de uma ação ou no botão "Atualizar".
 * A tela nunca faz conta de fuso: o servidor manda textos e minutos contados do início da agenda.
 * Servidor: SGO_Frota_Reservas.js.
 ****************************************************/

var FROTA_RES_TELA_CSS = [
  '.frs-topo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}',
  '.frs-topo .btn-primary{margin-top:0;min-height:44px}',
  '.frs-minhas-mini{font-size:12.5px;color:var(--muted,#52606d)}',
  '.frs-barra{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 10px}',
  '.frs-barra .btn{margin-top:0;min-height:36px;padding:7px 12px}',
  '.frs-barra .frs-periodo{font-weight:800;font-size:13.5px;margin:0 6px}',
  '.frs-sem{display:grid;grid-template-columns:120px repeat(7,minmax(0,1fr));border:1px solid var(--border,#d9e0e7);border-radius:8px;overflow:hidden;background:#fff}',
  '.frs-sem>div{border-bottom:1px solid #edf1f4;border-right:1px solid #edf1f4;padding:5px;min-height:46px;font-size:11.5px;min-width:0}',
  '.frs-sem .cab{background:var(--bc-surface-2,#f4f6f8);font-weight:800;min-height:0;text-align:center}',
  '.frs-sem .cab.hoje{background:#e8eefc;color:#1f3a7a}',
  '.frs-sem .veic{font-weight:800;font-size:12.5px;line-height:1.25;background:#fafbfc}',
  '.frs-sem .veic small{display:block;font-weight:400;color:var(--muted,#52606d)}',
  '.frs-sem .dia{cursor:pointer;display:flex;flex-direction:column;gap:3px}',
  '.frs-sem .dia:hover{background:#f7faff}',
  '.frs-sem .dia.hoje{background:#fbfcff}',
  '.frs-chip{display:block;border-radius:5px;padding:2px 5px;font-size:11px;line-height:1.3;cursor:pointer;border:1px solid transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;width:100%;box-sizing:border-box;font-family:inherit}',
  '.frs-chip.RESERVA{background:#e8eefc;color:#1f3a7a;border-color:#b9c9ee}',
  '.frs-chip.RESERVA.minha{background:#e3f5ec;color:#0f6b43;border-color:#9fd6b9;font-weight:700}',
  '.frs-chip.RESERVA.NAO_UTILIZADA{background:#f2f2f2;color:#6b7280;text-decoration:line-through}',
  '.frs-chip.MANUTENCAO{background:#fdecd8;color:#7a3c06;border-color:#f3c48f}',
  '.frs-chip.RETIRADA{background:#1f5fa8;color:#fff}',
  '.frs-chip.RETIRADA.atrasada{background:#a61b1b}',
  '.frs-chip.PARADA{background:#e5e7eb;color:#374151}',
  '.frs-livre{color:#9aa5b1;font-size:11px}',
  '.frs-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;margin:8px 0}',
  '.frs-leg i{display:inline-block;width:14px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;border:1px solid #cfd6dd}',
  '.frs-diaw{border:1px solid var(--border,#d9e0e7);border-radius:8px;background:#fff;overflow:hidden}',
  '.frs-dl{display:flex;border-bottom:1px solid #edf1f4;min-height:40px}',
  '.frs-dl .rot{flex:0 0 110px;padding:6px 8px;font-weight:800;font-size:12.5px;border-right:1px solid #edf1f4;background:#fafbfc;line-height:1.25}',
  '.frs-dl .rot small{display:block;font-weight:400;color:var(--muted,#52606d)}',
  '.frs-dl .trilho{position:relative;flex:1 1 auto;cursor:pointer;min-width:0}',
  '.frs-dl.cab .trilho span{position:absolute;top:10px;font-size:10.5px;color:#52606d;transform:translateX(-50%)}',
  '.frs-dl .trilho i.t{position:absolute;top:0;bottom:0;border-left:1px dashed #edf1f4}',
  '.frs-dl .trilho .agora{position:absolute;top:0;bottom:0;border-left:2px solid #a61b1b;z-index:2}',
  '.frs-dl .frs-chip{position:absolute;top:8px;height:24px;line-height:18px;width:auto;z-index:1}',
  '.frs-card{background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:11px 13px;margin-bottom:10px;font-size:13px;line-height:1.5}',
  '.frs-card h4{margin:0 0 4px;font-size:14px}',
  '.frs-card .acoes{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
  '.frs-card .acoes .btn,.frs-card .acoes .btn-primary{margin-top:0;min-height:38px}',
  '.frs-card.RESERVADA{border-left:5px solid #1f5fa8}.frs-card.INICIADA{border-left:5px solid #0f8b8d}.frs-card.CONCLUIDA{border-left:5px solid #1d6b3f}.frs-card.CANCELADA,.frs-card.NAO_UTILIZADA{border-left:5px solid #9aa5b1;opacity:.9}',
  '.frs-form{background:var(--bc-surface-2,#f4f6f8);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:12px;margin:0 0 12px}',
  '.frs-form h3{margin:0 0 8px;font-size:15px}',
  '.frs-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}',
  '.frs-grade label,.frs-campo label{font-size:12px;font-weight:700;display:block;margin-bottom:3px}',
  '.frs-grade input,.frs-grade select,.frs-grade textarea,.frs-campo input,.frs-campo select,.frs-campo textarea{width:100%;box-sizing:border-box;min-height:40px}',
  '.frs-campo{margin-top:8px}',
  '.frs-dica{font-size:12px;color:var(--muted,#52606d);margin-top:4px}',
  '.frs-livres{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
  '.frs-livres .btn{margin-top:0}',
  '.frs-det{border:1px solid #1f5fa8;background:#f7faff;border-radius:8px;padding:11px 13px;margin:10px 0;font-size:13px;line-height:1.5}',
  '.frs-hist{font-size:12px;color:#52606d;margin:6px 0 0;padding-left:18px}',
  '@media (max-width:760px){.frs-dl .rot{flex-basis:78px;font-size:11.5px}.frs-dl.cab .trilho span{font-size:9.5px}.frs-topo .btn-primary{width:100%}.frs-barra .btn{flex:1 1 auto}}',
  '.frs-semcel .frs-dia-card{border:1px solid var(--border,#d9e0e7);border-radius:8px;background:#fff;margin-bottom:8px;padding:8px 10px}',
  '.frs-semcel .frs-dia-card h4{margin:0 0 6px;font-size:13.5px}.frs-semcel .frs-dia-card.hoje{border-color:#1f5fa8}',
  '.frs-semcel .lin{display:flex;gap:8px;align-items:flex-start;padding:4px 0;border-top:1px solid #f0f2f5}',
  '.frs-semcel .lin b{flex:0 0 76px;font-size:12px}',
  '.frs-semcel .lin .itens{flex:1 1 auto;display:flex;flex-direction:column;gap:3px;min-width:0}'
].join('\n');

function Frota_telaReservas_() {
  return { css: FROTA_RES_TELA_CSS, js: 'try{(' + FrotaRes_telaNavegador_.toString() + ')();}catch(eRes){console.error("tplFrota: reservas não carregaram:", eRes);}' };
}

function FrotaRes_telaNavegador_() {
  var S = { sub: 'agenda', vista: '', de: '', dados: null, sel: null, form: null, carregando: false };
  var SUBS = [['agenda', 'Agenda'], ['minhas', 'Minhas reservas']];
  var SUBS_GESTAO = [['todas', 'Todas as reservas'], ['indicadores', 'Indicadores e relatório'], ['regras', 'Regras']];
  var NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function esc(v) { return tplFrota_esc(v); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function apiC(fn, p) { return tplFrota_chamarApi(fn, p || {}); }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function gestor() { return typeof tplFrota_souGestor_ === 'function' && tplFrota_souGestor_(); }
  function celular() { return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function infoHtml(t) { return '<div class="alert-box info" role="status">' + esc(t) + '</div>'; }
  function brParaIso(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function isoParaBr(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function somarDias(br, n) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br); if (!m) return br; var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]) + n, 12); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function hhmm(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }
  function marca(t, tipo) { return '<span class="frr-marca ' + (tipo || 'cinza') + '">' + esc(t) + '</span>'; }
  function corSit(s) { return { RESERVADA: 'alerta', INICIADA: 'ok', CONCLUIDA: 'ok', CANCELADA: 'cinza', NAO_UTILIZADA: 'critico' }[s] || 'cinza'; }

  window.tplFrotaRes_aoMostrarAba_ = function (id) { if (id === 'reservas') montar(); };

  function montar() {
    var raiz = el('tplFrotaRes_raiz');
    if (!raiz) return;
    if (!raiz.getAttribute('data-montado')) {
      raiz.setAttribute('data-montado', '1');
      raiz.classList.remove('muted');
      var subs = SUBS.concat(gestor() ? SUBS_GESTAO : []);
      raiz.innerHTML = '<div class="frr-faixa"><strong>Para que serve:</strong> garantir o veículo para quem já tem compromisso marcado. Reserve antes; no horário, retire normalmente em "Situação e retiradas". ' +
        'Quem retira um veículo informa a devolução prevista, e o sistema não deixa retirar se a devolução (mais a folga de 1 hora) passar do início da reserva de outra pessoa.</div>' +
        '<div class="frs-topo"><button type="button" class="btn-primary" id="frs_btnReservar">Reservar um veículo</button><span class="frs-minhas-mini" id="frs_minhasMini"></span></div>' +
        '<div id="frs_formWrap"></div>' +
        '<div class="frr-sub" role="tablist">' + subs.map(function (s) { return '<button type="button" role="tab" data-frs-sub="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>' +
        '<div id="frs_corpo"></div>';
      el('frs_btnReservar').onclick = function () { abrirForm({}); };
      Array.prototype.forEach.call(raiz.querySelectorAll('[data-frs-sub]'), function (b) { b.onclick = function () { mostrarSub(b.getAttribute('data-frs-sub')); }; });
      S.vista = celular() ? 'dia' : 'semana';
    }
    mostrarSub(S.sub);
  }

  function mostrarSub(s) {
    S.sub = s;
    Array.prototype.forEach.call(document.querySelectorAll('[data-frs-sub]'), function (b) { var on = b.getAttribute('data-frs-sub') === s; b.classList.toggle('ativo', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    var c = el('frs_corpo');
    if (!c) return;
    if (s === 'agenda' || s === 'minhas' || s === 'todas') { desenharCorpo(); carregar(); }
    else if (s === 'indicadores') telaIndicadores(c);
    else if (s === 'regras') telaRegras(c);
  }

  function carregar() {
    if (S.carregando) return;
    S.carregando = true;
    var c = el('frs_corpo');
    if (c && !S.dados) c.innerHTML = '<span class="muted">Carregando...</span>';
    api('apiReservaPainel', { de: S.de, dias: S.vista === 'dia' ? 1 : 7 }).then(function (r) {
      S.carregando = false; S.dados = r;
      if (!S.de) S.de = r.de;
      desenharMini();
      desenharCorpo();
    }).catch(function (err) { S.carregando = false; var x = el('frs_corpo'); if (x) x.innerHTML = erroHtml(err) + '<button type="button" class="btn" id="frs_tentar">Tentar de novo</button>'; var t = el('frs_tentar'); if (t) t.onclick = carregar; });
  }

  function desenharMini() {
    var m = el('frs_minhasMini'), d = S.dados;
    if (!m || !d) return;
    var ativas = d.minhas.filter(function (x) { return x.situacao === 'RESERVADA' || x.situacao === 'INICIADA'; });
    m.textContent = ativas.length ? 'Sua próxima reserva: ' + ativas[0].placa + ', ' + ativas[0].quando + (ativas.length > 1 ? ' (e mais ' + (ativas.length - 1) + ')' : '') + '.' :
      (d.condutor ? 'Você não tem reserva em aberto.' : (d.gestor ? 'Seu login não tem condutor vinculado: você reserva para outra pessoa escolhendo o condutor; para reservar em seu nome, vincule em Veículos e condutores > Condutores.' : 'Seu login não tem condutor vinculado: peça à gestão para vincular em Veículos e condutores > Condutores.'));
  }

  function desenharCorpo() {
    var c = el('frs_corpo'), d = S.dados;
    if (!c || !d) return;
    if (S.sub === 'agenda') desenharAgenda(c, d);
    else if (S.sub === 'minhas') desenharLista(c, d.minhas, 'Você ainda não tem reservas. Toque em "Reservar um veículo".', true);
    else if (S.sub === 'todas') desenharLista(c, d.todas, 'Nenhuma reserva em aberto ou dos últimos 7 dias.', false);
  }

  // ---------------- AGENDA ----------------
  function desenharAgenda(c, d) {
    var dia = d.dias === 1;
    var rotPer = dia ? d.diasLista[0].rotulo : d.diasLista[0].rotulo + ' a ' + d.diasLista[d.diasLista.length - 1].rotulo;
    var h = '<div class="frr-faixa"><strong>Como usar:</strong> cada linha é um veículo. Toque num espaço vazio para reservar aquele veículo naquele dia' + (dia ? ' e hora' : '') + '; toque numa reserva para ver o detalhe, cancelar ou trocar o veículo.</div>' +
      '<div class="frs-barra"><button type="button" class="btn" data-frs-vista="semana"' + (dia ? '' : ' aria-pressed="true" style="font-weight:800"') + '>Semana</button><button type="button" class="btn" data-frs-vista="dia"' + (dia ? ' aria-pressed="true" style="font-weight:800"' : '') + '>Dia</button>' +
      '<button type="button" class="btn" id="frs_ant">‹ Anterior</button><button type="button" class="btn" id="frs_hoje">Hoje</button><button type="button" class="btn" id="frs_prox">Próximo ›</button>' +
      '<span class="frs-periodo">' + esc(rotPer) + '</span><button type="button" class="btn" id="frs_atualizar">Atualizar</button></div>' +
      '<div class="frs-leg"><span><i style="background:#e3f5ec"></i>Minha reserva</span><span><i style="background:#e8eefc"></i>Reserva de outra pessoa</span><span><i style="background:#fdecd8"></i>Manutenção programada</span><span><i style="background:#1f5fa8"></i>Retirado agora</span><span><i style="background:#a61b1b"></i>Devolução atrasada</span><span><i style="background:#e5e7eb"></i>Parada</span></div>' +
      '<div id="frs_agenda"></div><div id="frs_detalhe" aria-live="polite"></div>';
    c.innerHTML = h;
    Array.prototype.forEach.call(c.querySelectorAll('[data-frs-vista]'), function (b) { b.onclick = function () { var v = b.getAttribute('data-frs-vista'); if (v === S.vista) return; S.vista = v; S.de = v === 'dia' ? d.hoje : ''; carregar(); }; });
    el('frs_ant').onclick = function () { S.de = d.anterior; carregar(); };
    el('frs_prox').onclick = function () { S.de = d.proximo; carregar(); };
    el('frs_hoje').onclick = function () { S.de = S.vista === 'dia' ? d.hoje : ''; carregar(); };
    el('frs_atualizar').onclick = carregar;
    var alvo = el('frs_agenda');
    if (!d.veiculos.length) { alvo.innerHTML = '<p class="muted">Nenhum veículo ativo cadastrado.</p>'; return; }
    if (dia) alvo.innerHTML = htmlDia(d); else alvo.innerHTML = celular() ? htmlSemanaCelular(d) : htmlSemana(d);
    ligarAgenda(alvo, d);
  }

  var itensPorK = [];
  function chip(it, extra) {
    var k = itensPorK.push(it) - 1;
    var cls = 'frs-chip ' + it.tipo + (it.minha ? ' minha' : '') + (it.situacao ? ' ' + it.situacao : '') + (it.atrasada ? ' atrasada' : '');
    return '<button type="button" class="' + cls + '" data-frs-item="' + k + '" title="' + esc(it.detalhe) + '"' + (extra || '') + '>' + esc(it.texto || it.rotulo) + '</button>';
  }
  function itensDoDia(v, i) {
    var a0 = i * 1440, b0 = a0 + 1440;
    return v.itens.filter(function (it) { return it.a < b0 && it.b > a0; }).map(function (it) {
      var ini = Math.max(it.a, a0), fim = Math.min(it.b, b0);
      return Object.assign({}, it, { texto: (it.a >= a0 ? hhmm(it.a) : '00:00') + '–' + (it.b <= b0 ? hhmm(it.b) : '24:00') + ' ' + it.rotulo, iniDia: ini - a0, fimDia: fim - a0 });
    });
  }
  function htmlSemana(d) {
    itensPorK = [];
    var h = '<div class="frs-sem"><div class="cab">Veículo</div>' + d.diasLista.map(function (x) { return '<div class="cab' + (x.hoje ? ' hoje' : '') + '">' + esc(x.rotulo) + '</div>'; }).join('');
    d.veiculos.forEach(function (v) {
      h += '<div class="veic">' + esc(v.placa) + '<small>' + esc(v.modelo) + (v.situacao === 'EM_USO' ? ' · em uso' : '') + '</small></div>';
      d.diasLista.forEach(function (x, i) {
        var its = itensDoDia(v, i);
        h += '<div class="dia' + (x.hoje ? ' hoje' : '') + '" data-frs-livre="' + esc(v.id) + '|' + esc(x.data) + '" role="button" tabindex="0" aria-label="Reservar ' + esc(v.placa) + ' em ' + esc(x.rotulo) + '">' + (its.length ? its.map(function (it) { return chip(it); }).join('') : '<span class="frs-livre">livre</span>') + '</div>';
      });
    });
    return h + '</div>';
  }
  function htmlSemanaCelular(d) {
    itensPorK = [];
    return '<div class="frs-semcel">' + d.diasLista.map(function (x, i) {
      return '<div class="frs-dia-card' + (x.hoje ? ' hoje' : '') + '"><h4>' + esc(x.rotulo) + (x.hoje ? ' (hoje)' : '') + '</h4>' + d.veiculos.map(function (v) {
        var its = itensDoDia(v, i);
        return '<div class="lin"><b>' + esc(v.placa) + '</b><div class="itens">' + (its.length ? its.map(function (it) { return chip(it); }).join('') : '') +
          '<button type="button" class="frs-chip" style="color:#1f5fa8;border:1px dashed #b9c9ee;background:#fff" data-frs-livre="' + esc(v.id) + '|' + esc(x.data) + '">' + (its.length ? 'Reservar outro horário' : 'Livre: reservar') + '</button></div></div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }
  function htmlDia(d) {
    itensPorK = [];
    var INI = 6 * 60, FIM = 22 * 60, TOT = FIM - INI;
    var pct = function (m) { return Math.max(0, Math.min(100, (m - INI) / TOT * 100)); };
    var passo = celular() ? 240 : 120, cab = '';
    for (var m = INI; m <= FIM; m += passo) cab += '<span style="left:' + pct(m).toFixed(2) + '%' + (m === INI ? ';transform:none' : m >= FIM ? ';transform:translateX(-100%)' : '') + '">' + hhmm(m) + '</span>';
    var ticks = ''; for (var t = INI; t <= FIM; t += 60) ticks += '<i class="t" style="left:' + pct(t).toFixed(2) + '%"></i>';
    var agora = d.agoraPos !== null && d.agoraPos !== undefined && d.agoraPos >= INI && d.agoraPos <= FIM ? '<span class="agora" style="left:' + pct(d.agoraPos).toFixed(2) + '%" title="Agora"></span>' : '';
    var h = '<div class="frs-diaw"><div class="frs-dl cab"><div class="rot">Veículo</div><div class="trilho" style="height:28px;cursor:default">' + cab + '</div></div>';
    d.veiculos.forEach(function (v) {
      var its = itensDoDia(v, 0);
      h += '<div class="frs-dl"><div class="rot">' + esc(v.placa) + '<small>' + esc(v.modelo) + '</small></div><div class="trilho" data-frs-livre-dia="' + esc(v.id) + '" role="button" tabindex="0" aria-label="Reservar ' + esc(v.placa) + ' neste dia">' + ticks + agora +
        its.map(function (it) { var l = pct(it.iniDia), w = Math.max(3, pct(it.fimDia) - l); return chip(Object.assign(it, { texto: it.rotulo }), ' style="left:' + l.toFixed(2) + '%;width:' + w.toFixed(2) + '%"'); }).join('') + '</div></div>';
    });
    return h + '</div><p class="frs-dica">Das 06:00 às 22:00. Reservas fora desse horário aparecem na visão da semana.</p>';
  }
  function ligarAgenda(alvo, d) {
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frs-item]'), function (b) {
      b.onclick = function (ev) { ev.stopPropagation(); mostrarDetalhe(itensPorK[Number(b.getAttribute('data-frs-item'))]); };
    });
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frs-livre]'), function (b) {
      var abrir = function () { var p = b.getAttribute('data-frs-livre').split('|'); var hoje = p[1] === d.hoje; abrirForm({ veiculoId: p[0], data: p[1], hora: hoje ? proximaHora(d.horaAgora) : '08:00' }); };
      b.onclick = abrir; b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };
    });
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frs-livre-dia]'), function (b) {
      b.onclick = function (ev) {
        var r = b.getBoundingClientRect(); var m = 360 + Math.round(((ev.clientX - r.left) / r.width) * 960 / 30) * 30;
        abrirForm({ veiculoId: b.getAttribute('data-frs-livre-dia'), data: d.de, hora: hhmm(Math.max(360, Math.min(1290, m))) });
      };
    });
  }
  function proximaHora(h) { var m = /^(\d{2}):(\d{2})$/.exec(h || ''); if (!m) return '08:00'; var x = Number(m[1]) * 60 + Number(m[2]) + 30; x = Math.ceil(x / 30) * 30; return hhmm(Math.min(x, 1410)); }

  function reservaPorId(id) {
    var d = S.dados || {};
    return (d.minhas || []).concat(d.todas || []).filter(function (r) { return r.id === id; })[0] || null;
  }
  function mostrarDetalhe(it) {
    var box = el('frs_detalhe');
    if (!box || !it) return;
    var r = it.id ? reservaPorId(it.id) : null;
    if (!r) { box.innerHTML = '<div class="frs-det">' + esc(it.detalhe) + '</div>'; box.scrollIntoView({ block: 'nearest' }); return; }
    box.innerHTML = '<div class="frs-det">' + cartao(r, true) + '</div>';
    ligarCartoes(box);
    box.scrollIntoView({ block: 'nearest' });
  }

  // ---------------- LISTAS ----------------
  function cartao(r, semMolde) {
    var h = '<h4>' + esc(r.codigo) + ' · ' + esc(r.placa) + ' ' + marca(r.situacaoTexto, corSit(r.situacao)) + (r.tipo === 'MANUTENCAO' ? ' ' + marca('Manutenção programada', 'alerta') : '') + '</h4>' +
      '<div><strong>' + esc(r.periodo) + '</strong> (' + esc(r.quando) + ')</div>' +
      (r.tipo === 'MANUTENCAO' ? '<div>' + esc(r.motivo) + '</div>' : '<div>Condutor: ' + esc(r.condutor) + (r.pelaGestao ? ' <span class="frr-meta">(reservado por ' + esc(r.criadaPor) + ')</span>' : '') + '</div>') +
      (r.destino ? '<div>Destino: ' + esc(r.destino) + '</div>' : '') + (r.tipo !== 'MANUTENCAO' && r.motivo ? '<div>Motivo: ' + esc(r.motivo) + '</div>' : '') +
      (r.passageiros ? '<div>Passageiros: ' + esc(r.passageiros) + '</div>' : '') + (r.vinculo ? '<div>Ligada a: ' + esc(r.vinculo) + '</div>' : '') +
      (r.liberada ? '<div class="alert-box error" style="margin-top:6px">A gestão (' + esc(r.liberadaPor) + ') liberou este veículo para outra retirada: ' + esc(r.liberadaJustificativa) + '. Para garantir, troque o veículo.</div>' : '') +
      (r.problemas ? '<div class="alert-box error" style="margin-top:6px">Conferência automática: ' + esc(r.problemas) + '. Troque o veículo ou fale com a gestão.</div>' : '') +
      (r.situacao === 'CANCELADA' ? '<div class="frr-meta">Cancelada por ' + esc(r.canceladaPor) + (r.motivoCancelamento ? ': ' + esc(r.motivoCancelamento) : '') + '</div>' : '') +
      ((r.podeCancelar || r.podeTrocar) ? '<div class="acoes">' + (r.podeTrocar ? '<button type="button" class="btn" data-frs-trocar="' + esc(r.id) + '">Trocar veículo</button>' : '') + (r.podeCancelar ? '<button type="button" class="btn" data-frs-cancelar="' + esc(r.id) + '">Cancelar reserva</button>' : '') + '</div>' : '') +
      '<div id="frs_acao_' + esc(r.id) + '"></div>' +
      (r.historico && r.historico.length ? '<details><summary class="frr-meta">Histórico</summary><ul class="frs-hist">' + r.historico.map(function (x) { return '<li>' + esc(x.em) + ' · ' + esc(x.por) + ': ' + esc(x.texto) + '</li>'; }).join('') + '</ul></details>' : '');
    return semMolde ? h : '<div class="frs-card ' + esc(r.situacao) + '">' + h + '</div>';
  }
  function desenharLista(c, lista, vazio, minhas) {
    c.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> ' + (minhas ? 'aqui ficam as suas reservas (as em aberto primeiro). Não vai usar? Cancele: o veículo fica livre para quem precisa. Reserva sem retirada até 1 hora depois do início vira "não utilizada".' : 'todas as reservas em aberto e as dos últimos 7 dias. A gestão cancela com justificativa (a pessoa é avisada) e troca o veículo quando há problema.') + '</div>' +
      (lista && lista.length ? lista.map(function (r) { return cartao(r); }).join('') : '<p class="muted">' + esc(vazio) + '</p>');
    ligarCartoes(c);
  }
  function ligarCartoes(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-frs-cancelar]'), function (b) { b.onclick = function () { formCancelar(b.getAttribute('data-frs-cancelar')); }; });
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-frs-trocar]'), function (b) { b.onclick = function () { formTrocar(b.getAttribute('data-frs-trocar')); }; });
  }
  function formCancelar(id) {
    var r = reservaPorId(id), box = el('frs_acao_' + id);
    if (!box || !r) return;
    var outro = !r.minha;
    box.innerHTML = '<div class="frs-campo"><label for="frs_cm_' + esc(id) + '">' + (outro ? 'Justificativa (mínimo de 15 caracteres; ' + esc(r.condutor || 'quem reservou') + ' recebe o motivo)' : 'Motivo do cancelamento') + '</label><textarea id="frs_cm_' + esc(id) + '" placeholder="' + (outro ? 'Ex.: veículo vai para a oficina por defeito no freio' : 'Ex.: visita remarcada') + '"></textarea></div>' +
      '<div class="acoes"><button type="button" class="btn-primary" id="frs_cmOk_' + esc(id) + '">Confirmar cancelamento</button><button type="button" class="btn" id="frs_cmNao_' + esc(id) + '">Voltar</button></div><div id="frs_cmSt_' + esc(id) + '"></div>';
    el('frs_cmNao_' + id).onclick = function () { box.innerHTML = ''; };
    el('frs_cmOk_' + id).onclick = function () {
      var bt = el('frs_cmOk_' + id); bt.disabled = true;
      apiC('apiReservaCancelar', { id: id, motivo: val('frs_cm_' + id) }).then(function (res) { box.innerHTML = okHtml(res.mensagem); S.dados = null; setTimeout(carregar, 600); })
        .catch(function (err) { bt.disabled = false; el('frs_cmSt_' + id).innerHTML = erroHtml(err); });
    };
  }
  function formTrocar(id) {
    var r = reservaPorId(id), box = el('frs_acao_' + id);
    if (!box || !r) return;
    box.innerHTML = '<span class="muted">Procurando veículos livres no mesmo período...</span>';
    api('apiReservaLivres', { dataInicio: r.dataInicio, horaInicio: r.horaInicio, dataFim: r.dataFim, horaFim: r.horaFim }).then(function (l) {
      var livres = l.livres.filter(function (x) { return x.id !== r.veiculoId; });
      if (!livres.length) { box.innerHTML = infoHtml('Nenhum outro veículo está livre de ' + r.periodo + '. Fale com a gestão.'); return; }
      box.innerHTML = '<div class="frs-dica">Livres de ' + esc(r.periodo) + ':</div><div class="frs-livres">' + livres.map(function (x) { return '<button type="button" class="btn" data-frs-para="' + esc(x.id) + '">Passar para ' + esc(x.placa) + (x.modelo ? ' (' + esc(x.modelo) + ')' : '') + '</button>'; }).join('') + '</div><div id="frs_trSt_' + esc(id) + '"></div>';
      Array.prototype.forEach.call(box.querySelectorAll('[data-frs-para]'), function (b) {
        b.onclick = function () {
          b.disabled = true;
          apiC('apiReservaTrocarVeiculo', { id: id, veiculoId: b.getAttribute('data-frs-para') }).then(function (res) {
            if (res.ok === false) { el('frs_trSt_' + id).innerHTML = erroHtml(new Error(res.message)); b.disabled = false; return; }
            box.innerHTML = okHtml(res.mensagem); S.dados = null; setTimeout(carregar, 600);
          }).catch(function (err) { b.disabled = false; el('frs_trSt_' + id).innerHTML = erroHtml(err); });
        };
      });
    }).catch(function (err) { box.innerHTML = erroHtml(err); });
  }

  // ---------------- RESERVAR ----------------
  function abrirForm(pre) {
    var wrap = el('frs_formWrap');
    if (!wrap) return;
    var d = S.dados;
    if (!d) { api('apiReservaPainel', { dias: 7 }).then(function (r) { S.dados = r; if (!S.de) S.de = r.de; desenharMini(); abrirForm(pre); }).catch(function (err) { wrap.innerHTML = erroHtml(err); }); return; }
    var g = !!d.gestor;
    var dataIni = pre.data || somarDias(d.hoje, 1), horaIni = pre.hora || '08:00';
    var hm = /^(\d{2}):(\d{2})$/.exec(horaIni), fimMin = hm ? Number(hm[1]) * 60 + Number(hm[2]) + 240 : 720;
    var dataFim = fimMin >= 1440 ? somarDias(dataIni, 1) : dataIni, horaFim = hhmm(fimMin);
    var vinc = d.vinculos || { tipos: {}, atividades: [], clientes: [] };
    var semCondutor = !d.condutor && !g;
    wrap.innerHTML = '<div class="frs-form" id="frs_form"><h3>Reservar um veículo</h3>' +
      (semCondutor ? '<div class="alert-box error">Seu login ainda não tem condutor vinculado, então a reserva não pode ser feita em seu nome. Peça à gestão (Administrador, Diretoria, Gestor, RH ou Financeiro) para vincular o seu usuário em Frota &gt; Veículos e condutores &gt; Condutores.</div>' : '') +
      (d.condutor && d.condutor.cnhProblema ? '<div class="alert-box error">Atenção: ' + esc(d.condutor.cnhProblema) + '. Sem CNH válida no período a reserva é recusada; peça à gestão para atualizar a validade.</div>' : '') +
      (g ? '<label style="display:flex;gap:8px;align-items:center;font-weight:700;margin-bottom:6px"><input type="checkbox" id="frs_fManut" style="width:auto;min-height:0"> Manutenção programada (bloqueia o veículo no período; sem condutor)</label>' : '') +
      '<div class="frs-grade">' +
      '<div><label for="frs_fDi">Início: data</label><input type="date" id="frs_fDi" value="' + esc(brParaIso(dataIni)) + '"></div>' +
      '<div><label for="frs_fHi">Início: hora</label><input type="time" id="frs_fHi" value="' + esc(horaIni) + '"></div>' +
      '<div><label for="frs_fDf">Devolução prevista: data</label><input type="date" id="frs_fDf" value="' + esc(brParaIso(dataFim)) + '"></div>' +
      '<div><label for="frs_fHf">Devolução prevista: hora</label><input type="time" id="frs_fHf" value="' + esc(horaFim) + '"></div>' +
      '</div>' +
      (g ? '<div class="frs-campo" id="frs_fCondW"><label for="frs_fCond">Condutor</label><select id="frs_fCond">' + (d.condutor ? '' : '<option value="">Escolha o condutor</option>') + (d.condutores || []).map(function (c) { return '<option value="' + esc(c.id) + '"' + (d.condutor && c.id === d.condutor.id ? ' selected' : '') + '>' + esc(c.nome) + (d.condutor && c.id === d.condutor.id ? ' (eu)' : '') + '</option>'; }).join('') + '</select><div class="frs-dica">Reservando em nome de outra pessoa, ela é avisada.</div></div>' : '') +
      '<div class="frs-campo"><label for="frs_fVeic">Veículo</label><select id="frs_fVeic"><option value="">Carregando os livres...</option></select><div class="frs-dica" id="frs_fVeicDica"></div></div>' +
      '<div class="frs-grade" id="frs_fUsoW">' +
      '<div><label for="frs_fDest" id="frs_fDestRot">Destino</label><input id="frs_fDest" maxlength="200" placeholder="Ex.: Hospital Exemplo, Anápolis"></div>' +
      '<div><label for="frs_fMot" id="frs_fMotRot">Motivo</label><input id="frs_fMot" maxlength="300" placeholder="Ex.: manutenção preventiva da autoclave"></div>' +
      '<div id="frs_fPassW"><label for="frs_fPass">Passageiros (opcional)</label><input id="frs_fPass" maxlength="300" placeholder="Nomes de quem vai junto"></div>' +
      '</div>' +
      '<div class="frs-grade" id="frs_fVincW" style="margin-top:8px"><div><label for="frs_fVt">Ligar a (opcional)</label><select id="frs_fVt"><option value="">Sem ligação</option>' +
      Object.keys(vinc.tipos || {}).map(function (k) { return '<option value="' + esc(k) + '">' + esc(vinc.tipos[k]) + '</option>'; }).join('') + '</select></div><div id="frs_fViW"></div></div>' +
      '<div class="acoes" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"><button type="button" class="btn-primary" id="frs_fOk"' + (semCondutor ? ' disabled' : '') + '>Reservar</button><button type="button" class="btn" id="frs_fNao">Fechar</button></div>' +
      '<div id="frs_fSt" aria-live="polite"></div></div>';
    S.form = { pre: pre };
    var recarregarLivres = function () { buscarLivres(pre.veiculoId); };
    ['frs_fDi', 'frs_fHi', 'frs_fDf', 'frs_fHf', 'frs_fCond'].forEach(function (id) { var e = el(id); if (e) e.onchange = recarregarLivres; });
    el('frs_fDi').addEventListener('change', function () { var df = el('frs_fDf'); if (df && (!df.value || df.value < el('frs_fDi').value)) df.value = el('frs_fDi').value; });
    el('frs_fVt').onchange = function () { campoVinculo(vinc); };
    el('frs_fNao').onclick = function () { wrap.innerHTML = ''; S.form = null; };
    el('frs_fOk').onclick = function () { enviarReserva(); };
    if (g) el('frs_fManut').onchange = function () {
      var m = el('frs_fManut').checked;
      el('frs_fCondW').style.display = m ? 'none' : ''; el('frs_fPassW').style.display = m ? 'none' : ''; el('frs_fVincW').style.display = m ? 'none' : '';
      el('frs_fMotRot').textContent = m ? 'Descrição da manutenção' : 'Motivo'; el('frs_fDestRot').textContent = m ? 'Oficina (opcional)' : 'Destino';
      el('frs_fOk').textContent = m ? 'Programar manutenção' : 'Reservar'; recarregarLivres();
    };
    buscarLivres(pre.veiculoId);
    el('frs_form').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function campoVinculo(vinc) {
    var t = val('frs_fVt'), w = el('frs_fViW');
    if (!w) return;
    if (t === 'AUVO') w.innerHTML = '<label for="frs_fVi">Número da O.S. no Auvo</label><input id="frs_fVi" inputmode="numeric" placeholder="Ex.: 12345">';
    else if (t === 'ATIVIDADE') w.innerHTML = '<label for="frs_fVi">Atividade</label><select id="frs_fVi"><option value="">Escolha uma das suas atividades abertas</option>' + (vinc.atividades || []).map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.texto) + '</option>'; }).join('') + '</select>';
    else if (t === 'CLIENTE') w.innerHTML = '<label for="frs_fVi">Cliente</label><select id="frs_fVi"><option value="">Escolha o cliente</option>' + (vinc.clientes || []).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.texto) + '</option>'; }).join('') + '</select>';
    else w.innerHTML = '';
  }
  function periodoForm() { return { dataInicio: isoParaBr(val('frs_fDi')), horaInicio: val('frs_fHi'), dataFim: isoParaBr(val('frs_fDf')), horaFim: val('frs_fHf') }; }
  function buscarLivres(preferido) {
    var s = el('frs_fVeic'), dica = el('frs_fVeicDica');
    if (!s) return;
    var p = periodoForm(); p.condutorId = val('frs_fCond');
    var escolhido = s.value || preferido || '';
    api('apiReservaLivres', p).then(function (l) {
      if (!el('frs_fVeic')) return;
      var manut = el('frs_fManut') && el('frs_fManut').checked;
      var ops = l.livres.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.placa) + (x.modelo ? ' — ' + esc(x.modelo) : '') + ' (livre)</option>'; }).join('') +
        l.ocupados.map(function (x) { return '<option value="' + esc(x.id) + '" disabled>' + esc(x.placa) + ' — ocupado: ' + esc(x.motivo).slice(0, 90) + '</option>'; }).join('');
      s.innerHTML = ops || '<option value="">Nenhum veículo ativo</option>';
      var ok = l.livres.some(function (x) { return x.id === escolhido; });
      s.value = ok ? escolhido : (l.livres[0] ? l.livres[0].id : '');
      dica.textContent = l.aviso ? l.aviso : (l.livres.length ? (ok || !escolhido ? (manut ? 'Veículos livres no período.' : 'Sugerido o primeiro veículo livre no período; troque se preferir.') : 'O veículo escolhido está ocupado nesse período; sugerimos ' + l.livres[0].placa + '.') + (l.ocupados.length ? ' Os ocupados aparecem na lista com o motivo.' : '') : 'Nenhum veículo está livre de ' + (l.periodo || 'neste período') + '. Mude o horário.');
    }).catch(function (err) { if (dica) dica.textContent = (err && err.message) || String(err); });
  }
  function enviarReserva() {
    var bt = el('frs_fOk'), st = el('frs_fSt');
    var manut = el('frs_fManut') && el('frs_fManut').checked;
    var p = periodoForm();
    p.veiculoId = val('frs_fVeic'); p.destino = val('frs_fDest'); p.motivo = val('frs_fMot'); p.passageiros = val('frs_fPass');
    p.condutorId = val('frs_fCond'); p.vinculoTipo = val('frs_fVt'); p.vinculoId = val('frs_fVi');
    if (manut) p.tipo = 'MANUTENCAO';
    bt.disabled = true; st.innerHTML = infoHtml('Gravando a reserva...');
    apiC('apiReservaCriar', p).then(function (r) {
      bt.disabled = false;
      if (r.ok === false) {
        st.innerHTML = erroHtml(new Error(r.message)) + (r.livres && r.livres.length ? '<div class="frs-livres">' + r.livres.slice(0, 6).map(function (x) { return '<button type="button" class="btn" data-frs-usar="' + esc(x.id) + '">Reservar o ' + esc(x.placa) + '</button>'; }).join('') + '</div>' : '');
        Array.prototype.forEach.call(st.querySelectorAll('[data-frs-usar]'), function (b) { b.onclick = function () { buscarLivres(b.getAttribute('data-frs-usar')); setTimeout(function () { var s = el('frs_fVeic'); if (s) s.value = b.getAttribute('data-frs-usar'); enviarReserva(); }, 900); }; });
        return;
      }
      el('frs_formWrap').innerHTML = okHtml(r.mensagem + ' No horário, retire o veículo em "Situação e retiradas".');
      S.form = null; S.dados = null; carregar();
    }).catch(function (err) { bt.disabled = false; st.innerHTML = erroHtml(err); });
  }

  // ---------------- INDICADORES E RELATÓRIO (gestão) ----------------
  function meses() { var out = [], d = new Date(); for (var i = 0; i < 12; i++) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2)); } return out; }
  function telaIndicadores(c) {
    var hoje = new Date(), de = '01/' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '/' + hoje.getFullYear(), ate = ('0' + hoje.getDate()).slice(-2) + '/' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '/' + hoje.getFullYear();
    c.innerHTML = '<div class="frr-faixa"><strong>Para que serve:</strong> ver se as reservas estão funcionando: quantas foram cumpridas, quantas ficaram sem uso, quantas retiradas foram bloqueadas por reserva, quantas a gestão liberou e quantos atrasos na devolução afetaram reserva. O copiloto (Gestão e melhoria) também sugere ações a partir destes números.</div>' +
      '<div class="frr-filtros"><div><label for="frs_iDe">De</label><input type="date" id="frs_iDe" value="' + brParaIso(de) + '"></div><div><label for="frs_iAte">Até</label><input type="date" id="frs_iAte" value="' + brParaIso(ate) + '"></div><div><button type="button" class="btn" id="frs_iOk" style="margin-top:0">Atualizar</button></div></div>' +
      '<div id="frs_iRes"><span class="muted">Carregando...</span></div>' +
      '<div class="frr-cartao" style="margin-top:12px"><h4>Relatório A4 de uso e reservas do mês</h4><p>Planejado (reservas) e realizado (retiradas) por veículo, situação das reservas, por condutor, liberações e atrasos. Abre numa aba nova, pronto para imprimir; uma cópia (PDF e HTML) fica na pasta "Frota - Relatorios Gerados/Reservas".</p>' +
      '<div class="frr-form"><div><label for="frs_rMes">Mês</label><select id="frs_rMes">' + meses().map(function (m) { return '<option value="' + m + '">' + NOMES_MES[Number(m.slice(5)) - 1] + ' de ' + m.slice(0, 4) + '</option>'; }).join('') + '</select></div></div><button type="button" class="btn" id="frs_rOk">Gerar relatório</button><div id="frs_rSt"></div></div>';
    var carregarInd = function () {
      el('frs_iRes').innerHTML = '<span class="muted">Carregando...</span>';
      api('apiReservaIndicadores', { de: isoParaBr(val('frs_iDe')), ate: isoParaBr(val('frs_iAte')) }).then(desenharInd).catch(function (err) { el('frs_iRes').innerHTML = erroHtml(err); });
    };
    el('frs_iOk').onclick = carregarInd;
    el('frs_rOk').onclick = gerarRelatorio;
    carregarInd();
  }
  function kpi(v, t, cls) { return '<div class="frr-kpi' + (cls ? ' ' + cls : '') + '"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>'; }
  function tabela(cols, linhas, vazio) {
    if (!linhas.length) return '<p class="muted">' + esc(vazio) + '</p>';
    return '<div class="frr-rolar"><table class="frr-tabela"><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (v, i) { return '<td data-rot="' + esc(cols[i].t) + '"' + (cols[i].num ? ' class="num"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function desenharInd(r) {
    var n = function (v, c) { return v === null || v === undefined ? '—' : tplFrota_num_(v, c || 0); };
    el('frs_iRes').innerHTML = '<p class="frr-meta">Período: ' + esc(r.periodo) + ' (reservas pelo início).</p><div class="frr-kpis">' +
      kpi(n(r.total), 'Reservas') + kpi(r.cumprimentoPct === null ? '—' : n(r.cumprimentoPct, 1) + '%', 'Cumpridas', r.cumprimentoPct !== null && r.cumprimentoPct < 80 ? 'alerta' : '') +
      kpi(n(r.naoUtilizadas), 'Não utilizadas', r.naoUtilizadas ? 'alerta' : '') + kpi(n(r.canceladas), 'Canceladas (' + n(r.canceladasGestao) + ' pela gestão)') +
      kpi(n(r.atrasosAfetaram), 'Atrasos que afetaram reserva', r.atrasosAfetaram ? 'critico' : '') + kpi(n(r.atrasosComReserva), 'Devoluções atrasadas com reserva a seguir') +
      kpi(n(r.bloqueadas), 'Retiradas bloqueadas por reserva') + kpi(n(r.liberacoes), 'Liberações pela gestão', r.liberacoes ? 'alerta' : '') + kpi(n(r.recusas), 'Pedidos recusados por sobreposição') + '</div>' +
      '<h3>Por veículo</h3>' + tabela([{ t: 'Veículo' }, { t: 'Reservas', num: true }, { t: 'Horas reservadas', num: true }, { t: 'Tempo reservado', num: true }, { t: 'Não utilizadas', num: true }, { t: 'Disputas', num: true }],
        r.veiculos.map(function (v) { return [esc(v.placa), n(v.reservas), n(v.horas, 1), n(v.ocupacaoPct, 1) + '%', n(v.naoUtilizadas), v.disputas ? marca(n(v.disputas), v.disputas >= 3 ? 'critico' : 'alerta') : '0']; }), 'Nenhum veículo.') +
      '<p class="frr-meta">Disputas = pedidos de reserva recusados por sobreposição + retiradas bloqueadas por reserva. Por dia da semana: ' + r.diasSemana.map(function (d, i) { return d + ' ' + (r.disputasPorDia[i] || 0); }).join(' · ') + '.</p>' +
      '<h3>Por condutor</h3>' + tabela([{ t: 'Condutor' }, { t: 'Reservas', num: true }, { t: 'Cumpridas', num: true }, { t: 'Não utilizadas', num: true }, { t: 'Canceladas', num: true }, { t: 'Atrasos que afetaram reserva', num: true }],
        r.condutores.map(function (c) { return [esc(c.nome), n(c.reservas), n(c.cumpridas), n(c.naoUtilizadas), n(c.canceladas), c.atrasosAfetaram ? marca(n(c.atrasosAfetaram), 'critico') : '0']; }), 'Nenhuma reserva no período.') +
      '<h3>Liberações pela gestão</h3>' + tabela([{ t: 'Quando' }, { t: 'Veículo' }, { t: 'Reserva' }, { t: 'Liberado por' }, { t: 'Reservante' }, { t: 'Justificativa' }],
        r.liberacoesLista.map(function (l) { return [esc(l.quando), esc(l.placa), esc(l.codigo), esc(l.por), esc(l.afetado), esc(l.justificativa)]; }), 'Nenhuma liberação no período.') +
      '<h3>Atrasos que afetaram reserva</h3>' + tabela([{ t: 'Quando' }, { t: 'Veículo' }, { t: 'Reserva' }, { t: 'Condutor em atraso' }, { t: 'O que houve' }],
        r.afetaramLista.map(function (l) { return [esc(l.quando), esc(l.placa), esc(l.codigo), esc(l.condutor), esc(l.detalhe)]; }), 'Nenhum atraso afetou reserva no período.');
  }
  function gerarRelatorio() {
    var janela = window.open('', '_blank');
    if (janela) janela.document.write('<p style="font-family:Arial,sans-serif;padding:40px;color:#374151;">Gerando o relatório, aguarde...</p>');
    el('frs_rSt').innerHTML = infoHtml('Gerando o relatório. Pode levar até um minuto.');
    apiC('apiReservaRelatorio', { competencia: val('frs_rMes') }).then(function (r) {
      var link = '';
      if (janela) { janela.document.open(); janela.document.write(r.html); janela.document.close(); }
      else { try { link = ' <a href="' + URL.createObjectURL(new Blob([r.html], { type: 'text/html' })) + '" target="_blank" rel="noopener">Abrir o relatório</a> (o navegador bloqueou a aba nova).'; } catch (e) {} }
      el('frs_rSt').innerHTML = '<div class="alert-box ' + (r.aviso ? 'info' : 'success') + '">Relatório gerado.' + link + (r.link ? ' Cópia guardada: <a href="' + esc(r.link) + '" target="_blank" rel="noopener">abrir o PDF</a>' + (r.pastaUrl ? ' · <a href="' + esc(r.pastaUrl) + '" target="_blank" rel="noopener">abrir a pasta</a>' : '') + '.' : '') + (r.aviso ? ' ' + esc(r.aviso) : '') + '</div>';
    }).catch(function (err) { if (janela) janela.close(); el('frs_rSt').innerHTML = erroHtml(err); });
  }

  // ---------------- REGRAS (gestão) ----------------
  function telaRegras(c) {
    c.innerHTML = '<div class="frr-faixa"><strong>Para que serve:</strong> ajustar as regras das reservas. A mudança vale para as próximas retiradas e rotinas e fica na trilha de auditoria da Frota.</div><div id="frs_cfg"><span class="muted">Carregando...</span></div>';
    api('apiReservaConfig').then(function (r) {
      var k = r.cfg, p = r.padrao;
      var campo = function (id, rot, v, dica, tipo) { return '<div><label for="frs_c' + id + '">' + esc(rot) + '</label><input id="frs_c' + id + '" ' + (tipo === 'hora' ? 'type="time"' : 'inputmode="numeric"') + ' value="' + esc(v) + '"><div class="frs-dica">' + esc(dica) + '</div></div>'; };
      el('frs_cfg').innerHTML = '<div class="frs-grade">' +
        campo('Folga', 'Folga entre a devolução prevista e a próxima reserva (min)', k.folgaMin, 'Padrão ' + p.folgaMin + ' (0 a 240).') +
        campo('Tol', 'Tolerância para não comparecimento (min)', k.toleranciaMin, 'Padrão ' + p.toleranciaMin + ' (15 a 240). Depois disso a reserva vira "não utilizada".') +
        campo('Ant', 'Antecipação: o reservante pode retirar antes do início (min)', k.antecipacaoMin, 'Padrão ' + p.antecipacaoMin + ' (0 a 480).') +
        campo('Hora', 'Hora do lembrete da véspera', k.horaVespera, 'Padrão ' + p.horaVespera + ' do último dia útil antes da reserva (e-mail só no expediente).', 'hora') +
        campo('Antec', 'Antecedência máxima para reservar (dias)', k.antecedenciaMaxDias, 'Padrão ' + p.antecedenciaMaxDias + ' (1 a 365).') +
        campo('Dur', 'Duração máxima de uma reserva (dias)', k.duracaoMaxDias, 'Padrão ' + p.duracaoMaxDias + ' (1 a 60).') +
        '</div><button type="button" class="btn-primary" id="frs_cOk">Gravar regras</button><div id="frs_cSt"></div>';
      el('frs_cOk').onclick = function () {
        apiC('apiReservaConfig', { salvar: true, cfg: { folgaMin: val('frs_cFolga'), toleranciaMin: val('frs_cTol'), antecipacaoMin: val('frs_cAnt'), horaVespera: val('frs_cHora'), antecedenciaMaxDias: val('frs_cAntec'), duracaoMaxDias: val('frs_cDur') } })
          .then(function (x) { el('frs_cSt').innerHTML = okHtml(x.mensagem); }).catch(function (err) { el('frs_cSt').innerHTML = erroHtml(err); });
      };
    }).catch(function (err) { el('frs_cfg').innerHTML = erroHtml(err); });
  }

  // aba já aberta antes de o código chegar (atalho do Início)
  if (typeof tplFrota_abaAtual_ !== 'undefined' && tplFrota_abaAtual_ === 'reservas') setTimeout(montar, 0);
}
