/****************************************************
 * FROTA — TELA DO RASTREAMENTO (20/10/2026)
 *
 * Código do navegador (nunca executado no servidor): Frota_obterTelaRastreamento devolve o CSS e o texto da
 * função FrotaR_telaNavegador_, e o carregador JS_Frota.html a executa logo depois do módulo da Frota.
 *  - aba "Rastreamento" (só gestão): Mapa ao vivo, Rotas, Combustível e KM, Relatórios, Aparelhos e alertas
 *    (o painel do rastreador que já existia) e Privacidade e configuração;
 *  - aba "Gestão e melhoria": partes "Gantt da frota" e "Copiloto de sugestões";
 *  - aba "Abastecimentos e despesas" (toda a equipe): "Comprovantes pedidos a você".
 * Mapa: Leaflet 1.9.4 (cdnjs, a mesma CDN do Chart.js) com o mapa do OpenStreetMap, com a atribuição exigida
 * pela política de uso; com a tela aberta, uma leitura a cada 30 s; nada de formulário é redesenhado pela
 * atualização automática. Sem o Leaflet (rede bloqueada), a lista dos veículos continua funcionando.
 * Servidor: SGO_Frota_Rastreamento.js e SGO_Frota_RastreamentoGestao.js.
 ****************************************************/

var FROTAR_TELA_CSS = [
  '.frr-sub{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px}',
  '.frr-sub button{border:1px solid var(--bc-line-2,#cfd6dd);background:#fff;border-radius:999px;padding:7px 13px;font-size:12.5px;font-weight:700;cursor:pointer;color:var(--bc-text,#1f2933);min-height:36px}',
  '.frr-sub button.ativo{background:var(--bc-text,#1f2933);color:#fff;border-color:var(--bc-text,#1f2933)}',
  '.frr-faixa{background:var(--bc-surface-2,#f4f6f8);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}',
  '.frr-faixa.alerta{background:var(--bc-warn-bg,#fff7e6);border-color:#f0c36d}',
  '.frr-mapa-wrap{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:12px;align-items:start}',
  '.frr-mapa{height:460px;border:1px solid var(--border,#d9e0e7);border-radius:8px;background:#eef2f5;min-width:0}',
  '.frr-mapa.pequeno{height:380px}',
  '.frr-lista{display:flex;flex-direction:column;gap:8px;max-height:460px;overflow-y:auto;min-width:0}',
  '.frr-veic{display:block;width:100%;text-align:left;background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-left:6px solid #7b8794;border-radius:8px;padding:9px 11px;font-size:12.5px;line-height:1.45;cursor:pointer;color:inherit}',
  '.frr-veic strong{font-size:14px}',
  '.frr-chip{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;color:#fff;margin-left:6px;vertical-align:1px}',
  '.frr-chip.neutro{background:#eceff1;color:#41505c}',
  '.frr-meta{color:var(--muted,#52606d);font-size:11.5px}',
  '.frr-legenda{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;margin:10px 0}',
  '.frr-legenda i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:5px;vertical-align:-1px}',
  '.frr-rodape{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px;color:var(--muted,#52606d)}',
  '.frr-filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;margin-bottom:10px}',
  '.frr-filtros label{font-size:12px;font-weight:700;display:block;margin-bottom:3px}',
  '.frr-filtros input,.frr-filtros select,.frr-form input,.frr-form select,.frr-form textarea{width:100%;box-sizing:border-box;min-height:36px}',
  '.frr-botoes{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}',
  '.frr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}',
  '.frr-kpi{background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:8px 10px}',
  '.frr-kpi b{display:block;font-size:17px}',
  '.frr-kpi span{font-size:11.5px;color:var(--muted,#52606d)}',
  '.frr-kpi.alerta{border-color:#e3a008;background:#fffaf0}.frr-kpi.critico{border-color:#d64545;background:#fff5f5}',
  '.frr-tabela{width:100%;border-collapse:collapse;font-size:12.5px}',
  '.frr-tabela th,.frr-tabela td{border-bottom:1px solid var(--border,#e3e8ee);padding:6px 7px;text-align:left;vertical-align:top}',
  '.frr-tabela td.num,.frr-tabela th.num{text-align:right;white-space:nowrap}',
  '.frr-rolar{overflow-x:auto;max-width:100%}',
  '.frr-marca{display:inline-block;border-radius:6px;padding:1px 7px;font-size:11.5px;font-weight:700}',
  '.frr-marca.ok{background:#e3f5ec;color:#0f6b43}.frr-marca.alerta{background:#fff1d6;color:#8a5300}.frr-marca.critico{background:#fde8e8;color:#9b1c1c}.frr-marca.cinza{background:#eceff1;color:#41505c}',
  '.frr-cartoes{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}',
  '.frr-cartao{background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:11px 13px;font-size:12.5px;line-height:1.45;min-width:0}',
  '.frr-cartao h4{margin:0 0 5px;font-size:13.5px;line-height:1.35}',
  '.frr-cartao.alta{border-left:5px solid #a61b1b}.frr-cartao.media{border-left:5px solid #c98a12}.frr-cartao.baixa{border-left:5px solid #7b8794}',
  '.frr-reco{background:#f2f7ff;border-radius:6px;padding:6px 8px;margin:6px 0;font-size:12.5px}',
  '.frr-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:8px 0}',
  '.frr-form label{font-size:12px;font-weight:700;display:block;margin-bottom:3px}',
  '.frr-form .largo{grid-column:1/-1}',
  '.frr-gantt-rolar{overflow-x:auto;max-width:100%;border:1px solid var(--border,#d9e0e7);border-radius:8px;background:#fff}',
  '.frr-gantt{position:relative;font-size:11.5px}',
  '.frr-g-linha{display:flex;border-bottom:1px solid #edf1f4;min-height:34px}',
  '.frr-g-rot{flex:0 0 130px;position:sticky;left:0;background:#fff;z-index:2;padding:6px 8px;border-right:1px solid #e3e8ee;font-weight:700;line-height:1.25}',
  '.frr-g-rot small{display:block;font-weight:400;color:#52606d}',
  '.frr-g-trilho{position:relative;flex:1 1 auto}',
  '.frr-g-cab .frr-g-trilho span{position:absolute;top:6px;font-size:10.5px;color:#52606d;white-space:nowrap}',
  '.frr-g-cab .frr-g-trilho i{position:absolute;top:0;bottom:-2000px;border-left:1px dashed #e7ebef}',
  '.frr-g-barra{position:absolute;top:7px;height:20px;border-radius:5px;color:#fff;font-size:10.5px;line-height:20px;padding:0 5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;box-sizing:border-box;min-width:6px}',
  '.frr-g-barra.RETIRADA{background:#1f5fa8}.frr-g-barra.PARADA{background:#7b8794}.frr-g-barra.ACAO{background:#7b4fb0}.frr-g-barra.ACAO.ok{background:#1d6b3f}.frr-g-barra.ACAO.vencida{background:#a61b1b}',
  '.frr-g-barra.andamento{border:2px dashed #fff;outline:1px solid #1f5fa8}',
  '.frr-g-marco{position:absolute;top:9px;width:14px;height:14px;transform:translateX(-7px) rotate(45deg);cursor:pointer;border:1px solid #fff}',
  '.frr-g-marco.MANUTENCAO{background:#b45309}.frr-g-marco.DOCUMENTO{background:#0f8b8d}.frr-g-marco.vencida{background:#a61b1b}',
  '.frr-g-hoje{position:absolute;top:0;bottom:0;border-left:2px solid #a61b1b;z-index:1}',
  '.frr-leg-g{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0;font-size:12px}',
  '.frr-leg-g i{display:inline-block;width:14px;height:10px;border-radius:3px;margin-right:5px}',
  '.frr-pedido{border:1px solid #f0c36d;background:#fffaf0;border-radius:8px;padding:10px 12px;margin:0 0 12px;font-size:12.5px}',
  '.leaflet-container .frr-tt{font-weight:700;font-size:11px;padding:1px 5px}',
  // celular: cada linha da tabela vira um cartão com o nome da coluna ao lado do valor (sem rolagem lateral)
  '@media (max-width:760px){.frr-tabela thead{display:none}.frr-tabela,.frr-tabela tbody,.frr-tabela tr,.frr-tabela td{display:block;width:100%;box-sizing:border-box}.frr-tabela tr{border:1px solid var(--border,#d9e0e7);border-radius:8px;margin-bottom:8px;padding:4px 8px;background:var(--card,#fff)}.frr-tabela td{border:0;padding:3px 0;display:flex;gap:10px;justify-content:space-between;text-align:right}.frr-tabela td.num{white-space:normal}.frr-tabela td::before{content:attr(data-rot);font-weight:700;text-align:left;color:var(--muted,#52606d);flex:0 0 42%}.frr-tabela td[data-rot=""]::before{display:none}}',
  '@media (max-width:760px){.frr-mapa-wrap{grid-template-columns:minmax(0,1fr)}.frr-mapa{height:320px}.frr-mapa.pequeno{height:300px}.frr-lista{max-height:none}.frr-g-rot{flex-basis:92px}.frr-sub button{flex:1 1 auto}}'
].join('\n');

function Frota_obterTelaRastreamento() {
  return { css: FROTAR_TELA_CSS, js: '(' + FrotaR_telaNavegador_.toString() + ')();' };
}

function FrotaR_telaNavegador_() {
  var R = { sub: 'mapa', mapa: null, marcadores: {}, timer: null, dados: null, veiculos: null, condutores: null, rotaMapa: null, rotaCamada: null,
    leaflet: null, ajustou: false, enviando: false, gantt: { de: '', ate: '' }, cop: { dias: 30, ia: false, dados: null } };
  var LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var CENTRO = [-16.6869, -49.2648];
  var SUBS = [['mapa', 'Mapa ao vivo'], ['rotas', 'Rotas'], ['combustivel', 'Combustível e KM'], ['relatorios', 'Relatórios'], ['aparelhos', 'Aparelhos e alertas'], ['config', 'Privacidade e configuração']];

  function esc(v) { return tplFrota_esc(v); }
  function num(v, c) { return v === null || v === undefined || v === '' ? '—' : tplFrota_num_(v, c || 0); }
  function moeda(v) { return tplFrota_moeda_(v); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function apiC(fn, p) { return tplFrota_chamarApi(fn, p || {}); }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function br(ms) { var d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function diasBr(n) { return br(Date.now() + n * 86400000); }
  function dur(min) { min = Math.round(Number(min) || 0); if (min < 60) return min + ' min'; var h = Math.floor(min / 60), m = min % 60; if (h < 24) return h + ' h' + (m ? ' ' + m + ' min' : ''); var d = Math.floor(h / 24); return d + ' d ' + (h % 24) + ' h'; }
  function marca(t, tipo) { return '<span class="frr-marca ' + (tipo || 'cinza') + '">' + esc(t) + '</span>'; }
  function abaVisivel(id) { var s = document.querySelector('#tplFrotaContainer .frota-aba[data-aba="' + id + '"]'); return !!(s && s.classList.contains('ativa')); }
  function tabela(cols, linhas, vazio) {
    if (!linhas.length) return '<p class="muted">' + esc(vazio || 'Nada no período.') + '</p>';
    return '<div class="frr-rolar"><table class="frr-tabela"><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (v, i) { return '<td data-rot="' + esc((cols[i] && cols[i].t) || '') + '"' + (cols[i] && cols[i].num ? ' class="num"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function opcoesVeiculos(lista, comTodos) {
    return (comTodos ? '<option value="">' + esc(comTodos) + '</option>' : '<option value="">Escolha o veículo</option>') +
      (lista || []).map(function (v) { return '<option value="' + esc(v.ID) + '">' + esc(v.PLACA) + (v.MODELO ? ' — ' + esc(v.MODELO) : '') + '</option>'; }).join('');
  }
  function carregarVeiculos() {
    if (R.veiculos) return Promise.resolve(R.veiculos);
    return api('apiListarVeiculosAtivos').then(function (r) { R.veiculos = r.items || []; return R.veiculos; });
  }
  function carregarCondutores() {
    if (R.condutores) return Promise.resolve(R.condutores);
    return api('apiListarCondutoresAtivos').then(function (r) { R.condutores = r.items || []; return R.condutores; });
  }

  // ---------------- Leaflet (sob demanda) ----------------
  function garantirLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (R.leaflet) return R.leaflet;
    R.leaflet = new Promise(function (ok, falha) {
      if (!document.querySelector('link[data-frr-leaflet]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LEAFLET_CSS; l.setAttribute('data-frr-leaflet', '1'); l.crossOrigin = ''; document.head.appendChild(l);
      }
      var s = document.createElement('script'); s.src = LEAFLET_JS; s.async = true; s.crossOrigin = '';
      s.onload = function () { window.L ? ok(window.L) : falha(new Error('mapa não carregou')); };
      s.onerror = function () { R.leaflet = null; falha(new Error('mapa não carregou')); };
      document.head.appendChild(s);
    });
    return R.leaflet;
  }
  function camadaOsm(L) {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' });
  }

  // ---------------- montagem da aba ----------------
  // O painel antigo do rastreador (parte "Aparelhos e alertas") só lê a API quando essa parte está aberta: duas leituras
  // ao mesmo tempo esbarram no limite do rastreador (uma leitura de posições a cada 30 s).
  if (typeof window.tplFrota_rtCarregar === 'function' && !window.tplFrota_rtCarregar._frr) {
    var rtOriginal = window.tplFrota_rtCarregar;
    window.tplFrota_rtCarregar = function () { if (R.sub === 'aparelhos' || !el('tplFrotaR_raiz')) return rtOriginal.apply(this, arguments); };
    window.tplFrota_rtCarregar._frr = true;
  }
  window.tplFrotaR_aoMostrarAba_ = function (id) {
    if (id !== 'rastreador') pararTimer();
    if (id === 'rastreador' && tplFrota_souGestor_()) montar();
    if (id === 'despesas') carregarMeusPedidos();
  };

  function montar() {
    var raiz = el('tplFrotaR_raiz');
    if (!raiz) return;
    if (!raiz.getAttribute('data-montado')) {
      raiz.setAttribute('data-montado', '1');
      raiz.classList.remove('muted');
      raiz.innerHTML = '<div class="frr-sub" role="tablist">' + SUBS.map(function (s) {
        return '<button type="button" role="tab" data-frr-sub="' + s[0] + '">' + esc(s[1]) + '</button>';
      }).join('') + '</div><div id="frr_corpo"></div>';
      Array.prototype.forEach.call(raiz.querySelectorAll('[data-frr-sub]'), function (b) { b.onclick = function () { mostrarSub(b.getAttribute('data-frr-sub')); }; });
    }
    mostrarSub(R.sub);
  }

  function mostrarSub(s) {
    R.sub = s;
    pararTimer();
    Array.prototype.forEach.call(document.querySelectorAll('[data-frr-sub]'), function (b) { var on = b.getAttribute('data-frr-sub') === s; b.classList.toggle('ativo', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    var antigo = el('tplFrota_rtPainel'), corpo = el('frr_corpo');
    if (antigo) antigo.style.display = s === 'aparelhos' ? '' : 'none';
    if (!corpo) return;
    corpo.style.display = s === 'aparelhos' ? 'none' : '';
    if (s === 'aparelhos') { corpo.innerHTML = ''; if (typeof tplFrota_rtCarregar === 'function') tplFrota_rtCarregar(); return; }
    R.mapa = null; R.marcadores = {}; R.ajustou = false; R.rotaMapa = null;
    if (s === 'mapa') telaMapa(corpo);
    else if (s === 'rotas') telaRotas(corpo);
    else if (s === 'combustivel') telaCombustivel(corpo);
    else if (s === 'relatorios') telaRelatorios(corpo);
    else telaConfig(corpo);
  }

  // ---------------- MAPA AO VIVO ----------------
  function pararTimer() { if (R.timer) { clearTimeout(R.timer); R.timer = null; } }
  function agendar(seg) {
    pararTimer();
    R.timer = setTimeout(function () {
      R.timer = null;
      if (R.sub !== 'mapa' || !abaVisivel('rastreador') || !el('frr_mapa')) return;
      if (document.visibilityState === 'hidden') { agendar(seg); return; }
      carregarMapa(true);
    }, Math.max(30, seg || 30) * 1000);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && R.sub === 'mapa' && abaVisivel('rastreador') && el('frr_mapa') && !R.timer) carregarMapa(true); });

  function telaMapa(corpo) {
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> o mapa mostra onde está cada veículo com aparelho ligado e se atualiza sozinho a cada 30 segundos enquanto esta tela está aberta. ' +
      'Toque num veículo da lista para centralizar. As cores dizem a situação (legenda abaixo). Só a gestão vê; cada abertura fica registrada em "Quem consultou".</div>' +
      '<div id="frr_mapaAviso"></div><div class="frr-mapa-wrap"><div id="frr_mapa" class="frr-mapa" role="region" aria-label="Mapa dos veículos"></div><div id="frr_lista" class="frr-lista" aria-live="polite"><span class="muted">Carregando...</span></div></div>' +
      '<div class="frr-legenda" id="frr_legenda"></div><div class="frr-rodape"><span id="frr_atualizado"></span><button type="button" class="btn btn-sm" id="frr_atualizar">Atualizar agora</button></div>';
    el('frr_atualizar').onclick = function () { carregarMapa(false); };
    carregarMapa(false);
  }

  function carregarMapa(automatico) {
    api('apiRastrMapa').then(function (r) {
      R.dados = r;
      var aviso = el('frr_mapaAviso');
      if (!aviso) return;
      el('frr_legenda').innerHTML = Object.keys(r.situacoes || {}).map(function (k) { return '<span><i style="background:' + r.situacoes[k].cor + '"></i>' + esc(r.situacoes[k].rotulo) + '</span>'; }).join('');
      if (!r.pronto) {
        aviso.innerHTML = '<div class="frr-faixa alerta">' + esc(r.mensagem) + '</div>';
        el('frr_lista').innerHTML = '<span class="muted">Sem dados do rastreador.</span>';
        el('frr_mapa').innerHTML = '<p class="muted" style="padding:14px">O mapa aparece quando o rastreador estiver configurado.</p>';
        return;
      }
      aviso.innerHTML = (r.aviso ? '<div class="frr-faixa alerta">' + esc(r.aviso) + '</div>' : '') + (!r.veiculos.length ? '<div class="frr-faixa">Nenhum veículo tem aparelho do rastreador ligado. Ligue em "Aparelhos e alertas".</div>' : '');
      desenharLista(r.veiculos);
      el('frr_atualizado').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR') + ' · próxima leitura em ' + r.intervaloSeg + ' s';
      garantirLeaflet().then(function (L) { desenharMarcadores(L, r.veiculos); }).catch(function () {
        var m = el('frr_mapa');
        if (m && !R.mapa) m.innerHTML = '<p class="muted" style="padding:14px">O mapa de fundo não carregou (internet ou bloqueio da rede). A lista ao lado continua atualizada; use "abrir no mapa" de cada veículo.</p>';
      });
      agendar(r.intervaloSeg);
    }).catch(function (err) {
      var aviso = el('frr_mapaAviso');
      if (aviso) aviso.innerHTML = erroHtml(err);
      if (automatico) agendar(60);
    });
  }

  function desenharLista(vs) {
    var lista = el('frr_lista');
    if (!lista) return;
    lista.innerHTML = vs.length ? vs.map(function (v) {
      var link = v.lat !== null ? 'https://www.openstreetmap.org/?mlat=' + v.lat + '&mlon=' + v.lon + '#map=17/' + v.lat + '/' + v.lon : '';
      return '<button type="button" class="frr-veic" data-frr-veic="' + esc(v.id) + '" style="border-left-color:' + esc(v.cor) + '"><strong>' + esc(v.placa) + '</strong>' +
        '<span class="frr-chip" style="background:' + esc(v.cor) + '">' + esc(v.situacaoTexto) + '</span>' +
        (v.alertaUsoSemRegistro && v.situacao !== 'USO_SEM_REGISTRO' ? '<span class="frr-chip" style="background:#a61b1b">Alerta aberto</span>' : '') +
        '<div>' + (v.condutorNome ? 'Condutor: ' + esc(v.condutorNome) + (v.retiradaDesde ? ' (desde ' + esc(v.retiradaDesde) + ')' : '') : '<span class="frr-meta">Sem retirada aberta</span>') + '</div>' +
        '<div>' + (v.kmh !== null ? num(v.kmh) + ' km/h · ' : '') + esc(v.estadoTexto) + '</div>' +
        (v.local ? '<div class="frr-meta">' + esc(v.local) + '</div>' : '') +
        '<div class="frr-meta">' + (v.atualizadoEm ? 'Posição de ' + esc(v.atualizadoEm) + (v.idadeMin !== null ? ' (há ' + dur(v.idadeMin) + ')' : '') : 'Sem posição') +
        (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">abrir no mapa</a>' : '') + '</div></button>';
    }).join('') : '<span class="muted">Nenhum veículo com aparelho ligado.</span>';
    Array.prototype.forEach.call(lista.querySelectorAll('[data-frr-veic]'), function (b) {
      b.onclick = function () { var m = R.marcadores[b.getAttribute('data-frr-veic')]; if (m && R.mapa) { R.mapa.setView(m.getLatLng(), Math.max(R.mapa.getZoom(), 15)); m.openPopup(); } };
    });
  }

  function popupVeic(v) {
    return '<strong>' + esc(v.placa) + '</strong> ' + esc(v.modelo) + '<br>' + esc(v.situacaoTexto) + (v.condutorNome ? '<br>Condutor: ' + esc(v.condutorNome) : '') +
      '<br>' + (v.kmh !== null ? num(v.kmh) + ' km/h · ' : '') + esc(v.estadoTexto) + (v.local ? '<br>' + esc(v.local) : '') + '<br><small>Posição de ' + esc(v.atualizadoEm) + '</small>';
  }

  function desenharMarcadores(L, vs) {
    var box = el('frr_mapa');
    if (!box) return;
    if (!R.mapa || R.mapa.getContainer() !== box) {
      box.innerHTML = '';
      R.mapa = L.map(box, { zoomControl: true }).setView(CENTRO, 11);
      camadaOsm(L).addTo(R.mapa);
      R.marcadores = {}; R.ajustou = false;
    }
    setTimeout(function () { if (R.mapa) R.mapa.invalidateSize(); }, 50);
    var vistos = {}, limites = [];
    vs.forEach(function (v) {
      if (v.lat === null || v.lon === null) return;
      vistos[v.id] = 1;
      var m = R.marcadores[v.id];
      var estilo = { radius: 9, color: '#ffffff', weight: 2, fillColor: v.cor, fillOpacity: 0.95 };
      if (!m) {
        m = L.circleMarker([v.lat, v.lon], estilo).addTo(R.mapa);
        m.bindTooltip(v.placa, { permanent: true, direction: 'top', offset: [0, -8], className: 'frr-tt' });
        m.bindPopup(popupVeic(v));
        R.marcadores[v.id] = m;
      } else { m.setLatLng([v.lat, v.lon]); m.setStyle(estilo); m.setPopupContent(popupVeic(v)); }
      limites.push([v.lat, v.lon]);
    });
    Object.keys(R.marcadores).forEach(function (id) { if (!vistos[id]) { R.mapa.removeLayer(R.marcadores[id]); delete R.marcadores[id]; } });
    if (!R.ajustou && limites.length) { R.ajustou = true; if (limites.length === 1) R.mapa.setView(limites[0], 15); else R.mapa.fitBounds(limites, { padding: [30, 30], maxZoom: 15 }); }
  }

  // ---------------- ROTAS ----------------
  function telaRotas(corpo) {
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> 1. Escolha o período (e o veículo, se quiser) e toque em "Buscar retiradas". 2. Na lista, toque em "Ver rota" para ver o trajeto, as paradas e a velocidade, ou em "Relatório A4" para imprimir. ' +
      '3. Para ver tudo o que um veículo rodou no período (com ou sem retirada), escolha o veículo e toque em "Ver rota do período". Pontos com mais dias que o prazo de guarda já foram apagados.</div>' +
      '<div class="frr-filtros"><div><label for="frr_rVeic">Veículo</label><select id="frr_rVeic"><option value="">Carregando...</option></select></div>' +
      '<div><label for="frr_rDe">De</label><input id="frr_rDe" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + diasBr(-7) + '"></div>' +
      '<div><label for="frr_rAte">Até</label><input id="frr_rAte" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + diasBr(0) + '"></div>' +
      '<div class="frr-botoes"><button type="button" class="btn" id="frr_rBuscar">Buscar retiradas</button><button type="button" class="btn" id="frr_rPeriodo">Ver rota do período</button></div></div>' +
      '<div id="frr_rStatus"></div><div id="frr_retiradas"></div><div id="frr_rotaRes"></div>';
    carregarVeiculos().then(function (vs) { var s = el('frr_rVeic'); if (s) s.innerHTML = opcoesVeiculos(vs, 'Todos os veículos'); }).catch(function () {});
    el('frr_rBuscar').onclick = buscarRetiradas;
    el('frr_rPeriodo').onclick = function () {
      if (!val('frr_rVeic')) { el('frr_rStatus').innerHTML = erroHtml(new Error('Escolha o veículo para ver a rota do período (a rota do período é de um veículo por vez).')); return; }
      verRota({ veiculoId: val('frr_rVeic'), de: val('frr_rDe'), ate: val('frr_rAte') });
    };
    buscarRetiradas();
  }

  function buscarRetiradas() {
    var alvo = el('frr_retiradas');
    if (!alvo) return;
    el('frr_rStatus').innerHTML = '';
    alvo.innerHTML = '<span class="muted">Carregando...</span>';
    api('apiRastrRetiradas', { veiculoId: val('frr_rVeic'), de: val('frr_rDe'), ate: val('frr_rAte') }).then(function (r) {
      alvo.innerHTML = '<h3>Retiradas no período</h3>' + tabela([{ t: 'Saída' }, { t: 'Chegada' }, { t: 'Veículo' }, { t: 'Condutor' }, { t: 'KM', num: true }, { t: 'Finalidade' }, { t: '' }],
        r.itens.map(function (x) {
          return [esc(x.saida), esc(x.chegada), esc(x.placa), esc(x.condutor), x.km === null ? '—' : num(x.km), esc(x.finalidade || '—'),
            '<div class="frr-botoes"><button type="button" class="btn btn-sm" data-frr-rota="' + esc(x.id) + '">Ver rota</button><button type="button" class="btn btn-sm" data-frr-relrota="' + esc(x.id) + '">Relatório A4</button></div>'];
        }), 'Nenhuma retirada no período.');
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-rota]'), function (b) { b.onclick = function () { verRota({ movimentacaoId: b.getAttribute('data-frr-rota') }); }; });
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-relrota]'), function (b) { b.onclick = function () { gerarRelatorio({ tipo: 'ROTA', movimentacaoId: b.getAttribute('data-frr-relrota') }, 'frr_rStatus'); }; });
    }).catch(function (err) { alvo.innerHTML = erroHtml(err); });
  }

  function verRota(p) {
    var alvo = el('frr_rotaRes');
    if (!alvo) return;
    alvo.innerHTML = '<span class="muted">Carregando a rota...</span>';
    apiC('apiRastrRota', p).then(function (r) {
      var a = r.analise, lim = r.limiteKmh;
      var tit = r.tipo === 'RETIRADA' ? 'Rota da retirada: ' + r.retirada.placa + ' — ' + r.retirada.condutor : 'Rota do veículo ' + r.placa;
      var h = '<h3>' + esc(tit) + '</h3><p class="frr-meta">' + esc(r.periodo) + (r.tipo === 'RETIRADA' && r.retirada.finalidade ? ' · ' + esc(r.retirada.finalidade) : '') + '</p>';
      if (r.vazio) { alvo.innerHTML = h + '<div class="frr-faixa alerta">' + esc(r.vazio) + '</div>'; return; }
      var kpis = [[num(a.distanciaKm, 1) + ' km', 'Trajeto medido pela rota', '']];
      if (r.tipo === 'RETIRADA' && r.retirada.kmInformado !== null) kpis.push([num(r.retirada.kmInformado) + ' km', 'KM informado no painel', '']);
      kpis.push([dur(a.movimentoMin), 'Em movimento', ''], [dur(a.paradoMin), 'Parado', ''], [num(a.velMaxKmh) + ' km/h', 'Velocidade máxima', a.velMaxKmh > lim ? 'alerta' : ''],
        [String(a.excessos.length), 'Trechos acima de ' + lim + ' km/h', a.excessos.length ? 'critico' : ''], [String(a.paradas.length), 'Paradas de 5 min ou mais', ''], [num(a.foraExpediente.km, 1) + ' km', 'Fora do expediente', a.foraExpediente.km ? 'alerta' : '']);
      h += '<div class="frr-kpis">' + kpis.map(function (k) { return '<div class="frr-kpi ' + k[2] + '"><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>'; }).join('') + '</div>' +
        '<div id="frr_rotaMapa" class="frr-mapa pequeno" role="region" aria-label="Mapa da rota"></div>' +
        '<div class="frr-legenda"><span><i style="background:#1f5fa8"></i>Trajeto</span><span><i style="background:#a61b1b"></i>Acima de ' + lim + ' km/h</span><span><i style="background:#b45309"></i>Parada (número da tabela)</span><span><i style="background:#1d6b3f"></i>Saída</span><span><i style="background:#1f2933"></i>Chegada</span></div>' +
        (r.tipo === 'RETIRADA' ? '<div class="frr-botoes"><button type="button" class="btn" id="frr_rotaRel">Relatório A4 desta retirada</button></div>' : '') +
        '<h3>Paradas</h3>' + tabela([{ t: 'Nº' }, { t: 'Início' }, { t: 'Fim' }, { t: 'Duração', num: true }, { t: 'Ignição' }, { t: 'Local' }],
          a.paradas.map(function (pa, i) { return [String(i + 1), esc(pa.inicio), esc(pa.fim || 'em curso'), dur(pa.duracaoMin), pa.ligado ? 'ligada' : 'desligada', esc(pa.endereco || (num(pa.lat, 5) + ', ' + num(pa.lon, 5)))]; }), 'Nenhuma parada de 5 minutos ou mais.') +
        '<h3>Velocidade acima do limite</h3>' + tabela([{ t: 'Início' }, { t: 'Duração', num: true }, { t: 'Máxima', num: true }],
          a.excessos.map(function (e) { return [esc(e.inicio), dur(e.duracaoMin), num(e.velMaxKmh) + ' km/h']; }), 'Nenhum trecho acima de ' + lim + ' km/h.') +
        (r.atendimentos && r.atendimentos.length ? '<h3>Atendimentos do condutor (Auvo)</h3>' + tabela([{ t: 'O.S.' }, { t: 'Cliente' }, { t: 'Check-in' }, { t: 'Check-out' }, { t: 'Deslocamento', num: true }, { t: 'Km até o local', num: true }],
          r.atendimentos.map(function (x) { return [esc(x.os), esc(x.cliente), esc(x.checkin), esc(x.checkout || '—'), dur(Math.max(0, x.deslocamentoMin)), x.deslocamentoKm === null ? '—' : num(x.deslocamentoKm, 1)]; })) : '');
      alvo.innerHTML = h;
      if (el('frr_rotaRel')) el('frr_rotaRel').onclick = function () { gerarRelatorio({ tipo: 'ROTA', movimentacaoId: r.retirada.id }, 'frr_rStatus'); };
      garantirLeaflet().then(function (L) { desenharRota(L, a, lim); }).catch(function () { var m = el('frr_rotaMapa'); if (m) m.innerHTML = '<p class="muted" style="padding:14px">O mapa de fundo não carregou. As tabelas abaixo têm as paradas e os trechos; o relatório A4 traz o desenho do trajeto.</p>'; });
      try { alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }).catch(function (err) { alvo.innerHTML = erroHtml(err); });
  }

  function desenharRota(L, a, lim) {
    var box = el('frr_rotaMapa');
    if (!box || !a.desenho.length) return;
    var mapa = L.map(box).setView([a.desenho[0][0], a.desenho[0][1]], 13);
    camadaOsm(L).addTo(mapa);
    var seg = [], cor = null, todos = [];
    var fechar = function () { if (seg.length > 1) L.polyline(seg, { color: cor, weight: 4, opacity: 0.9 }).addTo(mapa); };
    a.desenho.forEach(function (p, i) {
      var c = p[2] !== null && p[2] > lim ? '#a61b1b' : '#1f5fa8';
      if (c !== cor) { fechar(); seg = i ? [seg[seg.length - 1]] : []; cor = c; }
      seg.push([p[0], p[1]]); todos.push([p[0], p[1]]);
    });
    fechar();
    a.paradas.forEach(function (pa, i) {
      L.circleMarker([pa.lat, pa.lon], { radius: 9, color: '#fff', weight: 2, fillColor: '#b45309', fillOpacity: 1 }).addTo(mapa)
        .bindTooltip(String(i + 1), { permanent: true, direction: 'center', className: 'frr-tt' }).bindPopup('Parada ' + (i + 1) + ': ' + esc(pa.inicio) + ' (' + dur(pa.duracaoMin) + ')' + (pa.endereco ? '<br>' + esc(pa.endereco) : ''));
    });
    var ini = a.desenho[0], fim = a.desenho[a.desenho.length - 1];
    L.circleMarker([ini[0], ini[1]], { radius: 8, color: '#fff', weight: 2, fillColor: '#1d6b3f', fillOpacity: 1 }).addTo(mapa).bindTooltip('Saída');
    L.circleMarker([fim[0], fim[1]], { radius: 8, color: '#fff', weight: 2, fillColor: '#1f2933', fillOpacity: 1 }).addTo(mapa).bindTooltip('Chegada');
    if (todos.length > 1) mapa.fitBounds(todos, { padding: [20, 20] });
    setTimeout(function () { mapa.invalidateSize(); }, 60);
  }

  // ---------------- COMBUSTÍVEL E KM ----------------
  function telaCombustivel(corpo) {
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> escolha o período e toque em "Calcular". Vermelho em "Desvio" = o veículo gastou mais que a própria média além do limite; revise. ' +
      'Informe a capacidade do tanque de cada veículo para o SGO+ apontar litros acima dela. Para cobrar a nota de um abastecimento, use "Pedir comprovante" no fim da tela.</div>' +
      '<div class="frr-filtros"><div><label for="frr_cDe">De</label><input id="frr_cDe" inputmode="numeric" value="' + diasBr(-30) + '"></div><div><label for="frr_cAte">Até</label><input id="frr_cAte" inputmode="numeric" value="' + diasBr(0) + '"></div>' +
      '<div><label><input type="checkbox" id="frr_cPos"> Conferir com a posição do veículo</label></div><div><button type="button" class="btn" id="frr_cCalc">Calcular</button></div></div>' +
      '<div id="frr_cStatus"></div><div id="frr_cRes"><span class="muted">Carregando...</span></div><div id="frr_cPedidos"></div>';
    el('frr_cCalc').onclick = calcularCombustivel;
    calcularCombustivel();
  }

  function calcularCombustivel() {
    var alvo = el('frr_cRes');
    if (!alvo) return;
    alvo.innerHTML = '<span class="muted">Calculando...</span>';
    api('apiRastrCombustivel', { de: val('frr_cDe'), ate: val('frr_cAte'), comPosicao: !!(el('frr_cPos') && el('frr_cPos').checked) }).then(function (r) {
      R.comb = r;
      var aConferir = r.abastecimentos.filter(function (a) { return a.apontamentos.length; });
      alvo.innerHTML = '<p class="frr-meta">' + esc(r.metodo) + '</p>' +
        '<h3>Consumo por veículo (' + esc(r.periodo) + ')</h3>' + tabela([{ t: 'Veículo' }, { t: 'Abastec.', num: true }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'KM informado', num: true }, { t: 'KM pela rota', num: true },
          { t: 'Custo/km', num: true }, { t: 'km/L no período', num: true }, { t: 'Média do veículo', num: true }, { t: 'Desvio', num: true }, { t: 'Tanque (L)' }],
        r.consumo.map(function (c) {
          return ['<strong>' + esc(c.placa) + '</strong><div class="frr-meta">' + esc(c.modelo) + '</div>', String(c.abastecimentos), num(c.litros, 2), moeda(c.valor), num(c.kmInformado), c.kmRastreador === null ? '—' : num(c.kmRastreador, 1),
            c.custoPorKm === null ? '—' : moeda(c.custoPorKm), c.kmLPeriodo === null ? '—' : num(c.kmLPeriodo, 2), c.kmLReferencia === null ? '<span class="frr-meta">poucos dados</span>' : num(c.kmLReferencia, 2),
            c.desvioPct === null ? '—' : marca((c.desvioPct > 0 ? '+' : '') + num(c.desvioPct, 1) + '%', c.alertaConsumo ? 'critico' : 'ok'),
            '<div style="display:flex;gap:4px;min-width:130px"><input aria-label="Capacidade do tanque de ' + esc(c.placa) + '" data-frr-tq="' + esc(c.veiculoId) + '" value="' + (c.capacidadeTanque === null ? '' : esc(c.capacidadeTanque)) + '" inputmode="decimal" style="width:62px"><button type="button" class="btn btn-sm" data-frr-tqg="' + esc(c.veiculoId) + '">Gravar</button></div>'];
        }), 'Nenhum veículo ativo.') +
        '<h3>Abastecimentos a conferir</h3>' + tabela([{ t: 'Veículo' }, { t: 'Data' }, { t: 'Litros', num: true }, { t: 'KM', num: true }, { t: 'Comprovante' }, { t: 'Apontamento' }],
          aConferir.map(function (a) { return [esc(a.placa), esc(a.data + (a.hora ? ' ' + a.hora : '')), num(a.litros, 2), num(a.km), a.comprovante ? '<a href="' + esc(a.comprovante) + '" target="_blank" rel="noopener">ver</a>' : marca('sem', 'critico'), a.apontamentos.map(function (p) { return esc(p.texto); }).join('<br>')]; }),
          'Nenhum abastecimento com apontamento no período (' + r.abastecimentos.length + ' conferidos).') +
        '<h3>KM por condutor</h3>' + tabela([{ t: 'Condutor' }, { t: 'Retiradas', num: true }, { t: 'KM informado', num: true }],
          r.kmPorCondutor.map(function (c) { return [esc(c.nome), String(c.retiradas), num(c.km)]; }), 'Nenhuma retirada concluída no período.');
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-tqg]'), function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-frr-tqg'), inp = alvo.querySelector('[data-frr-tq="' + id + '"]');
          apiC('apiRastrCapacidadeTanque', { veiculoId: id, litros: inp ? inp.value : '' }).then(function (x) { el('frr_cStatus').innerHTML = okHtml(x.mensagem); }).catch(function (err) { el('frr_cStatus').innerHTML = erroHtml(err); });
        };
      });
      desenharPedidos(r.pedidos);
    }).catch(function (err) { alvo.innerHTML = erroHtml(err); });
  }

  function desenharPedidos(pedidos) {
    var alvo = el('frr_cPedidos');
    if (!alvo) return;
    Promise.all([carregarVeiculos(), carregarCondutores()]).then(function (x) {
      var vs = x[0], cs = x[1];
      alvo.innerHTML = '<h3>Pedir comprovante de abastecimento</h3><p class="frr-meta">O condutor recebe uma atividade em Minhas atividades e envia a nota pela Frota. O pedido fecha sozinho quando o comprovante chega.</p>' +
        '<div class="frr-form"><div><label for="frr_pVeic">Veículo</label><select id="frr_pVeic">' + opcoesVeiculos(vs) + '</select></div>' +
        '<div><label for="frr_pCond">Condutor</label><select id="frr_pCond"><option value="">Escolha o condutor</option>' + cs.map(function (c) { return '<option value="' + esc(c.ID) + '">' + esc(c.NOME) + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="frr_pData">Data do abastecimento (se souber)</label><input id="frr_pData" inputmode="numeric" placeholder="dd/mm/aaaa"></div>' +
        '<div><label for="frr_pValor">Valor (se souber)</label><input id="frr_pValor" placeholder="R$"></div>' +
        '<div><label for="frr_pPrazo">Prazo (dias)</label><select id="frr_pPrazo"><option>1</option><option selected>2</option><option>3</option><option>5</option></select></div>' +
        '<div class="largo"><label for="frr_pMotivo">O que pedir</label><textarea id="frr_pMotivo" rows="2" placeholder="Ex.: nota do abastecimento de 18/10 no cartão da empresa, R$ 250,00"></textarea></div></div>' +
        '<div class="frr-botoes"><button type="button" class="btn-primary" id="frr_pEnviar">Pedir comprovante</button></div><div id="frr_pStatus"></div>' +
        '<h3>Pedidos de comprovante</h3>' + tabela([{ t: 'Pedido em' }, { t: 'Veículo' }, { t: 'Condutor' }, { t: 'O que pedir' }, { t: 'Prazo' }, { t: 'Situação' }, { t: '' }],
          (pedidos || []).map(function (p) {
            var sit = p.situacao === 'PENDENTE' ? marca(p.atrasado ? 'Atrasado' : 'Pendente', p.atrasado ? 'critico' : 'alerta') : p.situacao === 'ENVIADO' ? marca('Enviado ' + p.enviadoEm, 'ok') : marca('Cancelado', 'cinza');
            return [esc(p.pedidoEm), esc(p.placa), esc(p.condutor), esc(p.motivo), esc(p.prazo), sit, p.situacao === 'PENDENTE' ? '<button type="button" class="btn btn-sm" data-frr-canc="' + esc(p.id) + '">Cancelar</button>' : ''];
          }), 'Nenhum pedido ainda.');
      el('frr_pEnviar').onclick = function () {
        if (R.enviando) return;
        R.enviando = true;
        apiC('apiRastrPedirComprovante', { veiculoId: val('frr_pVeic'), condutorId: val('frr_pCond'), dataRef: val('frr_pData'), valorRef: val('frr_pValor'), prazoDias: val('frr_pPrazo'), motivo: val('frr_pMotivo') })
          .then(function (x) { R.enviando = false; el('frr_pStatus').innerHTML = okHtml(x.mensagem); setTimeout(calcularCombustivel, 600); })
          .catch(function (err) { R.enviando = false; el('frr_pStatus').innerHTML = erroHtml(err); });
      };
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-canc]'), function (b) {
        b.onclick = function () {
          var motivo = prompt('Motivo do cancelamento (mínimo de 10 caracteres). Exemplo: comprovante entregue em papel à gestão.');
          if (motivo === null) return;
          apiC('apiRastrCancelarPedido', { id: b.getAttribute('data-frr-canc'), motivo: motivo }).then(function (x) { el('frr_pStatus').innerHTML = okHtml(x.mensagem); calcularCombustivel(); }).catch(function (err) { el('frr_pStatus').innerHTML = erroHtml(err); });
        };
      });
    }).catch(function (err) { alvo.innerHTML = erroHtml(err); });
  }

  // ---------------- RELATÓRIOS ----------------
  function meses() {
    var out = [], d = new Date();
    for (var i = 0; i < 12; i++) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2)); }
    return out;
  }
  var NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function telaRelatorios(corpo) {
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> escolha o relatório, preencha e toque em "Gerar". O relatório abre numa aba nova, pronto para imprimir, e uma cópia em PDF e HTML fica na pasta "Frota - Relatorios Gerados/Rastreamento". Pode levar até um minuto.</div>' +
      '<div class="frr-cartoes">' +
      '<div class="frr-cartao"><h4>Rota da retirada</h4><p>Trajeto desenhado, paradas, velocidade, horários e atendimentos do condutor.</p><button type="button" class="btn" id="frr_relIrRotas">Escolher a retirada em Rotas</button></div>' +
      '<div class="frr-cartao"><h4>Mensal do veículo</h4><p>KM, consumo, custos, paradas, excessos e manutenção do mês.</p><div class="frr-form"><div><label for="frr_relVeic">Veículo</label><select id="frr_relVeic"><option value="">Carregando...</option></select></div>' +
      '<div><label for="frr_relMes">Mês</label><select id="frr_relMes">' + meses().map(function (m) { return '<option value="' + m + '">' + NOMES_MES[Number(m.slice(5)) - 1] + ' de ' + m.slice(0, 4) + '</option>'; }).join('') + '</select></div></div><button type="button" class="btn" id="frr_relMesGerar">Gerar</button></div>' +
      '<div class="frr-cartao"><h4>Consumo da frota</h4><p>km/L de cada veículo contra a média dele e os abastecimentos a conferir.</p><div class="frr-form"><div><label for="frr_relCDe">De</label><input id="frr_relCDe" value="' + diasBr(-30) + '"></div><div><label for="frr_relCAte">Até</label><input id="frr_relCAte" value="' + diasBr(0) + '"></div></div><button type="button" class="btn" id="frr_relCGerar">Gerar</button></div>' +
      '<div class="frr-cartao"><h4>Uso fora do expediente</h4><p>Trechos rodados fora do horário da frota, com ou sem retirada, e alertas de uso sem registro.</p><div class="frr-form"><div><label for="frr_relFDe">De</label><input id="frr_relFDe" value="' + diasBr(-30) + '"></div><div><label for="frr_relFAte">Até</label><input id="frr_relFAte" value="' + diasBr(0) + '"></div></div><button type="button" class="btn" id="frr_relFGerar">Gerar</button></div>' +
      '</div><div id="frr_relStatus"></div>';
    carregarVeiculos().then(function (vs) { var s = el('frr_relVeic'); if (s) s.innerHTML = opcoesVeiculos(vs); }).catch(function () {});
    el('frr_relIrRotas').onclick = function () { mostrarSub('rotas'); };
    el('frr_relMesGerar').onclick = function () { gerarRelatorio({ tipo: 'VEICULO_MES', veiculoId: val('frr_relVeic'), competencia: val('frr_relMes') }, 'frr_relStatus'); };
    el('frr_relCGerar').onclick = function () { gerarRelatorio({ tipo: 'CONSUMO', de: val('frr_relCDe'), ate: val('frr_relCAte') }, 'frr_relStatus'); };
    el('frr_relFGerar').onclick = function () { gerarRelatorio({ tipo: 'FORA_EXPEDIENTE', de: val('frr_relFDe'), ate: val('frr_relFAte') }, 'frr_relStatus'); };
  }

  function gerarRelatorio(payload, statusId) {
    if (payload.tipo === 'VEICULO_MES' && !payload.veiculoId) { el(statusId).innerHTML = erroHtml(new Error('Escolha o veículo do relatório mensal.')); return; }
    var janela = window.open('', '_blank');
    if (janela) janela.document.write('<p style="font-family:Arial,sans-serif;padding:40px;color:#374151;">Gerando o relatório, aguarde...</p>');
    el(statusId).innerHTML = '<div class="alert-box info">Gerando o relatório. Pode levar até um minuto.</div>';
    apiC('apiRastrRelatorio', payload).then(function (r) {
      var link = '';
      if (janela) { janela.document.open(); janela.document.write(r.html); janela.document.close(); }
      else { try { link = ' <a href="' + URL.createObjectURL(new Blob([r.html], { type: 'text/html' })) + '" target="_blank" rel="noopener">Abrir o relatório</a> (o navegador bloqueou a aba nova).'; } catch (e) {} }
      el(statusId).innerHTML = '<div class="alert-box ' + (r.aviso ? 'info' : 'success') + '">Relatório gerado.' + link + (r.link ? ' Cópia guardada: <a href="' + esc(r.link) + '" target="_blank" rel="noopener">abrir o PDF</a>' + (r.pastaUrl ? ' · <a href="' + esc(r.pastaUrl) + '" target="_blank" rel="noopener">abrir a pasta</a>' : '') + '.' : '') + (r.aviso ? ' ' + esc(r.aviso) : '') + '</div>';
    }).catch(function (err) { if (janela) janela.close(); el(statusId).innerHTML = erroHtml(err); });
  }

  // ---------------- PRIVACIDADE E CONFIGURAÇÃO ----------------
  function telaConfig(corpo) {
    corpo.innerHTML = '<div class="frr-faixa"><strong>Para que serve:</strong> definir por quanto tempo as rotas ficam guardadas, o limite de velocidade, o horário da frota e o desvio de consumo aceito, e ver quem consultou a localização dos veículos (a trilha não pode ser apagada).</div><div id="frr_cfg"><span class="muted">Carregando...</span></div><h3>Quem consultou</h3><div id="frr_trilha"><span class="muted">Carregando...</span></div>';
    api('apiRastrConfig').then(function (r) {
      var c = r.cfg;
      el('frr_cfg').innerHTML = (r.rotasGuardadas ? '<p class="frr-meta">Rotas guardadas: ' + num(r.armazem ? r.armazem.total : 0) + ' pontos' + (r.armazem && r.armazem.maisAntigo ? ', o mais antigo de ' + esc(r.armazem.maisAntigo) : '') + '.</p>' : '<div class="frr-faixa alerta">Nesta instalação as rotas não ficam guardadas (só no servidor próprio do SGO+).</div>') +
        '<div class="frr-form"><div><label for="frr_cfRet">Guardar as rotas por (dias)</label><input id="frr_cfRet" inputmode="numeric" value="' + esc(c.retencaoDias) + '"></div>' +
        '<div><label for="frr_cfLim">Limite de velocidade (km/h)</label><input id="frr_cfLim" inputmode="numeric" value="' + esc(c.limiteKmh) + '"></div>' +
        '<div><label for="frr_cfIni">Expediente da frota: início</label><input id="frr_cfIni" value="' + esc(c.expedienteInicio) + '" placeholder="hh:mm"></div>' +
        '<div><label for="frr_cfFim">Expediente da frota: fim</label><input id="frr_cfFim" value="' + esc(c.expedienteFim) + '" placeholder="hh:mm"></div>' +
        '<div><label for="frr_cfDes">Desvio de consumo aceito (%)</label><input id="frr_cfDes" inputmode="numeric" value="' + esc(c.desvioConsumoPct) + '"></div>' +
        '<div><label><input type="checkbox" id="frr_cfSab"' + (c.sabadoExpediente ? ' checked' : '') + '> Sábado é dia de expediente</label></div></div>' +
        '<p class="frr-meta">Prazo menor apaga os pontos mais velhos na próxima limpeza (uma vez por dia). Feriados do SGO+ contam como fora do expediente.</p>' +
        '<div class="frr-botoes"><button type="button" class="btn-primary" id="frr_cfGravar">Gravar configuração</button></div><div id="frr_cfStatus"></div>';
      el('frr_cfGravar').onclick = function () {
        apiC('apiRastrConfig', { gravar: true, retencaoDias: val('frr_cfRet'), limiteKmh: val('frr_cfLim'), expedienteInicio: val('frr_cfIni'), expedienteFim: val('frr_cfFim'), desvioConsumoPct: val('frr_cfDes'), sabadoExpediente: !!el('frr_cfSab').checked })
          .then(function (x) { el('frr_cfStatus').innerHTML = okHtml(x.mensagem); }).catch(function (err) { el('frr_cfStatus').innerHTML = erroHtml(err); });
      };
    }).catch(function (err) { el('frr_cfg').innerHTML = erroHtml(err); });
    api('apiRastrConsultas').then(function (r) {
      el('frr_trilha').innerHTML = tabela([{ t: 'Quando' }, { t: 'Quem' }, { t: 'O quê' }, { t: 'Veículo' }, { t: 'Período' }, { t: 'Onde' }],
        r.itens.map(function (x) { return [esc(x.quando), esc(x.quem) + ' <span class="frr-meta">' + esc(x.perfil) + '</span>', esc(x.acao), esc(x.placa || '—'), esc(x.periodo || '—'), esc(x.origem)]; }), 'Ninguém consultou ainda.');
    }).catch(function (err) { el('frr_trilha').innerHTML = erroHtml(err); });
  }

  // ---------------- GANTT (Gestão e melhoria) ----------------
  window.tplFrotaR_gantt_ = function (corpo) {
    if (!corpo) return;
    corpo.classList.remove('muted');
    var de = R.gantt.de || diasBr(-7), ate = R.gantt.ate || diasBr(30);
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> cada linha é um veículo. Barras azuis são retiradas (tracejada: em andamento), cinzas são paradas; losangos marcam manutenção prevista (pela data ou pelo KM) e documento que vence; a última linha mostra as ações dos planos. Toque numa barra para ver o detalhe. A linha vermelha é hoje.</div>' +
      '<div class="frr-filtros"><div><label for="frr_gDe">De</label><input id="frr_gDe" value="' + esc(de) + '"></div><div><label for="frr_gAte">Até</label><input id="frr_gAte" value="' + esc(ate) + '"></div><div><button type="button" class="btn" id="frr_gAtualizar">Atualizar</button></div></div>' +
      '<div id="frr_gRes"><span class="muted">Carregando...</span></div><div id="frr_gDetalhe" class="frr-meta" aria-live="polite"></div>';
    el('frr_gAtualizar').onclick = function () { R.gantt.de = val('frr_gDe'); R.gantt.ate = val('frr_gAte'); window.tplFrotaR_gantt_(corpo); };
    api('apiRastrGantt', { de: de, ate: ate }).then(function (r) { desenharGantt(r); }).catch(function (err) { el('frr_gRes').innerHTML = erroHtml(err); });
  };

  function desenharGantt(r) {
    var alvo = el('frr_gRes');
    if (!alvo) return;
    var total = r.ate - r.de, dias = Math.max(1, Math.round(total / 86400000));
    var pct = function (ms) { return Math.max(0, Math.min(100, (ms - r.de) / total * 100)); };
    var passo = dias > 120 ? 14 : dias > 45 ? 7 : dias > 14 ? 2 : 1;
    var cab = '';
    for (var i = 0; i <= dias; i += passo) { var ms = r.de + i * 86400000; var d = new Date(ms); cab += '<i style="left:' + pct(ms).toFixed(2) + '%"></i><span style="left:calc(' + pct(ms).toFixed(2) + '% + 3px)">' + ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '</span>'; }
    var hoje = r.hoje >= r.de && r.hoje <= r.ate ? '<div class="frr-g-hoje" style="left:' + pct(r.hoje).toFixed(2) + '%"></div>' : '';
    var detalhes = [];
    var linhas = r.linhas.map(function (l) {
      return '<div class="frr-g-linha"><div class="frr-g-rot">' + esc(l.placa) + '<small>' + esc(l.modelo) + '</small></div><div class="frr-g-trilho">' + hoje +
        l.itens.map(function (it) {
          var k = detalhes.push(it.detalhe) - 1;
          if (it.ini === it.fim) return '<span class="frr-g-marco ' + it.tipo + (it.vencida ? ' vencida' : '') + '" style="left:' + pct(it.ini).toFixed(2) + '%" title="' + esc(it.detalhe) + '" data-frr-gd="' + k + '" tabindex="0" role="button" aria-label="' + esc(it.detalhe) + '"></span>';
          var l0 = pct(it.ini), w = Math.max(0.6, pct(it.fim) - l0);
          return '<span class="frr-g-barra ' + it.tipo + (it.emAndamento ? ' andamento' : '') + (it.concluida ? ' ok' : '') + (it.vencida ? ' vencida' : '') + '" style="left:' + l0.toFixed(2) + '%;width:' + w.toFixed(2) + '%" title="' + esc(it.detalhe) + '" data-frr-gd="' + k + '" tabindex="0" role="button">' + esc(it.rotulo) + '</span>';
        }).join('') + '</div></div>';
    }).join('');
    alvo.innerHTML = '<div class="frr-leg-g"><span><i style="background:#1f5fa8"></i>Retirada</span><span><i style="background:#7b8794"></i>Parada</span><span><i style="background:#b45309"></i>Manutenção prevista</span><span><i style="background:#0f8b8d"></i>Documento vence</span><span><i style="background:#7b4fb0"></i>Ação de plano</span><span><i style="background:#a61b1b"></i>Vencido / hoje</span></div>' +
      '<div class="frr-gantt-rolar"><div class="frr-gantt" style="min-width:' + Math.max(600, 130 + dias * 22) + 'px"><div class="frr-g-linha frr-g-cab"><div class="frr-g-rot">Veículo</div><div class="frr-g-trilho">' + cab + '</div></div>' +
      (linhas || '<p class="muted" style="padding:10px">Nenhum veículo ativo.</p>') + '</div></div><p class="frr-meta">' + esc(r.nota) + '</p>';
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-gd]'), function (b) {
      var mostrar = function () { el('frr_gDetalhe').textContent = detalhes[Number(b.getAttribute('data-frr-gd'))]; };
      b.onclick = mostrar; b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrar(); } };
    });
  }

  // ---------------- COPILOTO (Gestão e melhoria) ----------------
  var DESTINOS = { CASO: 'Abrir caso no Kanban', ATIVIDADE: 'Lançar atividade', COMPROVANTE: 'Pedir comprovante' };
  window.tplFrotaR_copiloto_ = function (corpo) {
    if (!corpo) return;
    corpo.classList.remove('muted');
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> o copiloto lê os dados da frota e do rastreador e sugere ações. Toda sugestão é só sugestão: escolha o que fazer (abrir caso, lançar atividade ou pedir comprovante) ou descarte com o motivo. ' +
      'Marque "Pedir ajuda da IA" para ordenar por prioridade e escrever a recomendação com os mesmos números (texto da IA com número fora dos dados é descartado).</div>' +
      '<div class="frr-filtros"><div><label for="frr_cpDias">Período</label><select id="frr_cpDias">' + [30, 60, 90].map(function (d) { return '<option value="' + d + '"' + (R.cop.dias === d ? ' selected' : '') + '>Últimos ' + d + ' dias</option>'; }).join('') + '</select></div>' +
      '<div><label><input type="checkbox" id="frr_cpIa"' + (R.cop.ia ? ' checked' : '') + '> Pedir ajuda da IA</label></div><div><button type="button" class="btn" id="frr_cpAtualizar">Atualizar</button></div></div>' +
      '<div id="frr_cpStatus"></div><div id="frr_cpRes"><span class="muted">Analisando os dados...</span></div>';
    el('frr_cpAtualizar').onclick = function () { R.cop.dias = Number(val('frr_cpDias')) || 30; R.cop.ia = !!el('frr_cpIa').checked; window.tplFrotaR_copiloto_(corpo); };
    api('apiRastrCopiloto', { dias: R.cop.dias, ia: R.cop.ia }).then(function (r) { R.cop.dados = r; desenharCopiloto(r); }).catch(function (err) { el('frr_cpRes').innerHTML = erroHtml(err); });
  };

  function desenharCopiloto(r) {
    var alvo = el('frr_cpRes');
    if (!alvo) return;
    var gr = { ALTA: ['Alta', 'critico'], MEDIA: ['Média', 'alerta'], BAIXA: ['Baixa', 'cinza'] };
    alvo.innerHTML = (r.aviso ? '<div class="frr-faixa alerta">' + esc(r.aviso) + '</div>' : '') + (!r.rotasGuardadas ? '<div class="frr-faixa">Sem rotas guardadas nesta instalação: as sugestões de velocidade e de uso fora do expediente não aparecem.</div>' : '') +
      (r.sugestoes.length ? '<div class="frr-cartoes">' + r.sugestoes.map(function (s, i) {
        var g = gr[s.gravidade] || gr.BAIXA;
        return '<div class="frr-cartao ' + s.gravidade.toLowerCase() + '" data-frr-cp="' + i + '"><h4>' + esc(s.titulo) + '</h4><div>' + marca('Prioridade ' + g[0], g[1]) + (s.prioridadeIa ? ' ' + marca('IA: ' + s.prioridadeIa + ' de 5', 'cinza') : '') + '</div>' +
          '<p>' + esc(s.detalhe) + '</p><div class="frr-reco"><strong>Recomendação:</strong> ' + esc(s.textoIa || s.acao) + '</div>' +
          '<div class="frr-botoes">' + s.destinos.map(function (d) { return '<button type="button" class="btn btn-sm" data-frr-cpd="' + d + '">' + esc(DESTINOS[d]) + '</button>'; }).join('') +
          '<button type="button" class="btn btn-sm" data-frr-cpd="DESCARTAR">Descartar</button></div><div class="frr-cp-form"></div></div>';
      }).join('') + '</div>' : '<div class="alert-box success">Nenhuma sugestão nova no período. Bom sinal.</div>') +
      (r.decididas.length ? '<details style="margin-top:12px"><summary>Sugestões já decididas (' + r.decididas.length + ')</summary>' + tabela([{ t: 'Quando' }, { t: 'Sugestão' }, { t: 'Decisão' }, { t: 'Quem' }],
        r.decididas.map(function (d) { return [esc(d.em), esc(d.titulo), d.situacao === 'ACEITA' ? marca(DESTINOS[d.destino] || 'Aceita', 'ok') : marca('Descartada: ' + d.motivo, 'cinza'), esc(d.por)]; })) + '</details>' : '');
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-cp]'), function (card) {
      var s = r.sugestoes[Number(card.getAttribute('data-frr-cp'))];
      Array.prototype.forEach.call(card.querySelectorAll('[data-frr-cpd]'), function (b) {
        b.onclick = function () { abrirDecisao(card, s, b.getAttribute('data-frr-cpd'), r); };
      });
    });
  }

  function abrirDecisao(card, s, destino, r) {
    var f = card.querySelector('.frr-cp-form');
    if (destino === 'CASO' || destino === 'COMPROVANTE') { decidir(card, { chave: s.chave, decisao: 'ACEITAR', destino: destino }); return; }
    if (destino === 'ATIVIDADE') {
      f.innerHTML = '<div class="frr-form"><div><label>Responsável</label><select data-frr-resp>' + (r.usuarios || []).map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>'; }).join('') + '</select></div>' +
        '<div><label>Prazo</label><input data-frr-prazo value="' + diasBr(7) + '" inputmode="numeric"></div></div><div class="frr-botoes"><button type="button" class="btn-primary btn-sm" data-frr-ok>Lançar</button></div>';
      var sel = f.querySelector('[data-frr-resp]');
      try { if (typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.userId) sel.value = USER_CONTEXT.userId; } catch (e) {}
      f.querySelector('[data-frr-ok]').onclick = function () { decidir(card, { chave: s.chave, decisao: 'ACEITAR', destino: 'ATIVIDADE', responsavelId: sel.value, prazo: f.querySelector('[data-frr-prazo]').value }); };
      return;
    }
    f.innerHTML = '<div class="frr-form"><div class="largo"><label>Motivo do descarte (mínimo de 10 caracteres)</label><textarea data-frr-motivo rows="2" placeholder="Ex.: viagem autorizada para atendimento em outra cidade"></textarea></div></div><div class="frr-botoes"><button type="button" class="btn btn-sm" data-frr-ok>Descartar</button></div>';
    f.querySelector('[data-frr-ok]').onclick = function () { decidir(card, { chave: s.chave, decisao: 'DESCARTAR', motivo: f.querySelector('[data-frr-motivo]').value }); };
  }

  function decidir(card, payload) {
    if (R.enviando) return;
    R.enviando = true;
    payload.dias = R.cop.dias;
    apiC('apiRastrCopilotoDecidir', payload).then(function (x) {
      R.enviando = false;
      card.innerHTML = okHtml(x.mensagem);
    }).catch(function (err) { R.enviando = false; var f = card.querySelector('.frr-cp-form'); if (f) f.innerHTML = erroHtml(err); });
  }

  // ---------------- COMPROVANTES PEDIDOS A VOCÊ (toda a equipe) ----------------
  function carregarMeusPedidos() {
    var alvo = el('tplFrotaR_meusPedidos');
    if (!alvo) return;
    api('apiRastrMeusPedidos').then(function (r) {
      if (!r.itens.length) { alvo.innerHTML = ''; return; }
      var tipos = ['Gasolina', 'Etanol', 'Diesel', 'Diesel S10', 'GNV', 'Outro'];
      alvo.innerHTML = r.itens.map(function (p) {
        var id = esc(p.id);
        return '<div class="frr-pedido" data-frr-ped="' + id + '"><strong>Comprovante pedido a você: veículo ' + esc(p.placa) + (p.dataRef ? ' (' + esc(p.dataRef) + ')' : '') + '</strong>' +
          '<div>' + esc(p.motivo) + '</div><div class="frr-meta">Pedido por ' + esc(p.pedidoPor) + ' em ' + esc(p.pedidoEm) + ' · prazo ' + esc(p.prazo) + (p.atrasado ? ' · ' : '') + (p.atrasado ? marca('prazo vencido', 'critico') : '') + '</div>' +
          '<div class="frr-form"><div><label>Data</label><input data-c="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(p.dataRef) + '"></div><div><label>Hora (se souber)</label><input data-c="hora" inputmode="numeric" placeholder="hh:mm"></div>' +
          '<div><label>KM do painel</label><input data-c="km" inputmode="numeric"></div><div><label>Litros</label><input data-c="litros" inputmode="decimal"></div><div><label>Valor (R$)</label><input data-c="valor" inputmode="decimal"></div>' +
          '<div><label>Combustível</label><select data-c="tipoCombustivel">' + tipos.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div><div><label>Posto</label><input data-c="posto"></div>' +
          '<div><label>Foto da nota ou PDF</label><input type="file" data-c="arquivo" accept="image/*,application/pdf"></div></div>' +
          '<div class="frr-botoes"><button type="button" class="btn-primary" data-frr-env>Enviar comprovante</button></div><div data-frr-st></div></div>';
      }).join('');
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frr-ped]'), function (box) {
        box.querySelector('[data-frr-env]').onclick = function () {
          var st = box.querySelector('[data-frr-st]');
          var c = function (k) { var e = box.querySelector('[data-c="' + k + '"]'); return e ? e.value : ''; };
          var arq = box.querySelector('[data-c="arquivo"]').files[0];
          if (!arq) { st.innerHTML = erroHtml(new Error('Anexe a foto da nota ou o PDF do comprovante.')); return; }
          if (R.enviando) return;
          R.enviando = true;
          st.innerHTML = '<div class="alert-box info">Enviando...</div>';
          tplFrota_lerArquivoComoBase64_(arq).then(function (lido) {
            if (!lido) throw new Error('Não foi possível ler o arquivo. Tire a foto de novo.');
            return apiC('apiRastrEnviarComprovante', { pedidoId: box.getAttribute('data-frr-ped'), data: c('data'), hora: c('hora'), km: c('km'), litros: c('litros'), valor: c('valor'), tipoCombustivel: c('tipoCombustivel'), posto: c('posto'),
              base64: lido.base64, mimeType: lido.mimeType, nomeArquivo: lido.nomeArquivo });
          }).then(function (x) {
            R.enviando = false;
            box.innerHTML = okHtml(x.mensagem);
            if (typeof tplFrota_carregarAbastecimentos_ === 'function') tplFrota_carregarAbastecimentos_();
          }).catch(function (err) { R.enviando = false; st.innerHTML = erroHtml(err); });
        };
      });
    }).catch(function () { alvo.innerHTML = ''; });
  }
}
