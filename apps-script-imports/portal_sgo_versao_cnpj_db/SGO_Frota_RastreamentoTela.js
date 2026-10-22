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
  // 21/10/2026: Gantt da frota refeito (régua Dia/Semana/Mês, sub-linhas Planejado/Realizado/Marcos sem sobreposição,
  // texto só quando cabe, balão de detalhe, lista no celular). Disposição comum: SGO_Gantt_Layout.js.
  '.frg-barra{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end;margin:4px 0 8px}',
  '.frg-seg{display:inline-flex;border:1px solid #b8c2cc;border-radius:8px;overflow:hidden;background:#fff}',
  '.frg-seg button{border:0;border-right:1px solid #b8c2cc;background:#fff;color:#1f2933;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:700;min-height:36px;cursor:pointer}',
  '.frg-seg button:last-child{border-right:0}',
  '.frg-seg button[aria-pressed="true"]{background:#1f2933;color:#fff}',
  '.frg-nav{display:inline-flex;gap:4px;flex-wrap:wrap}',
  '.frg-nav .btn{margin-top:0;min-height:36px;padding:7px 12px}',
  '.frg-per{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap}',
  '.frg-per label{font-size:12px;font-weight:700;display:block;margin-bottom:3px}',
  '.frg-per input{width:116px;min-height:36px;box-sizing:border-box}',
  '.frg-per .btn{margin-top:0;min-height:36px}',
  '.frg-resumo{font-size:12.5px;color:#3e4c59;margin:2px 0 6px}',
  '.frg-resumo b{color:#1f2933}',
  '.frg-leg{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:12px;margin:4px 0 10px;align-items:center;color:#1f2933}',
  '.frg-leg-g{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}',
  '.frg-leg-g>b{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#52606d}',
  '.frg-leg-g span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
  '.frg-sw{display:inline-block;flex:0 0 auto;width:20px;height:13px;border-radius:3px;box-sizing:border-box}',
  '.frg-sw.losango{width:11px;height:11px;transform:rotate(45deg);border-radius:2px;margin:0 3px;border:0}',
  '.frg-sw.linha{width:3px;height:15px;border-radius:0;background:#c81e1e}',
  // cores (as mesmas nas barras, na legenda e na lista do celular); texto escuro em fundo claro, branco em fundo escuro (contraste 4,5:1 ou mais)
  '.frg-RESERVA{background:#dfe8fb;border:1.5px dashed #1f5fa8;color:#17325e}',
  '.frg-RESERVA.ok{background:#d8f0e2;border-color:#1d6b3f;color:#0f4d2c}',
  '.frg-RESERVA.vencida{background:#fbe2e2;border-color:#a61b1b;color:#7d1313}',
  '.frg-MANUT_PROG{background:#fde6cc;border:1.5px dashed #b45309;color:#6b3005}',
  '.frg-RETIRADA{background:#1f5fa8;border:1.5px solid #1f5fa8;color:#fff}',
  '.frg-RETIRADA.andamento{background:repeating-linear-gradient(135deg,#1f5fa8 0 6px,#174a85 6px 11px);border-color:#0f325c}',
  '.frg-PARADA{background:#556270;border:1.5px solid #556270;color:#fff}',
  '.frg-ACAO{background:#6b3fa0;border:1.5px solid #6b3fa0;color:#fff}',
  '.frg-ACAO.ok{background:#1d6b3f;border-color:#1d6b3f}.frg-ACAO.vencida{background:#a61b1b;border-color:#a61b1b}',
  '.frg-MANUTENCAO{background:#b45309}.frg-DOCUMENTO{background:#0f7c7e}.frg-MANUTENCAO.vencida,.frg-DOCUMENTO.vencida{background:#a61b1b}',
  // quadro: rola para o lado só dentro da moldura, com o nome do veículo fixo à esquerda
  '.frg-quadro{border:1px solid #d9e0e7;border-radius:8px;background:#fff;overflow-x:auto;overflow-y:hidden;max-width:100%;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}',
  '.frg-conteudo{position:relative}',
  '.frg-fundo{position:absolute;top:0;bottom:0;pointer-events:none}',
  '.frg-fundo .fds{position:absolute;top:0;bottom:0;background:#f0f2f5}',
  '.frg-fundo .ln{position:absolute;top:0;bottom:0;border-left:1px solid #eef1f4}',
  '.frg-fundo .ln.forte{border-left-color:#d5dce3}',
  '.frg-fundo .hojecol{position:absolute;top:0;bottom:0;background:rgba(200,30,30,.06)}',
  '.frg-fundo .hoje{position:absolute;top:0;bottom:0;border-left:2px solid #c81e1e}',
  '.frg-linha{display:flex;position:relative;border-bottom:1px solid #d9e0e7}',
  '.frg-linha:last-child{border-bottom:0}',
  '.frg-rot{position:sticky;left:0;z-index:5;background:#fff;flex:0 0 auto;display:flex;border-right:1px solid #d9e0e7;box-sizing:border-box}',
  '.frg-nome{flex:1 1 auto;min-width:0;padding:6px 8px;font-weight:800;font-size:12.5px;line-height:1.25;overflow-wrap:anywhere}',
  '.frg-nome small{display:block;font-weight:400;color:#52606d;font-size:11px}',
  '.frg-tags{flex:0 0 76px;border-left:1px solid #eef1f4}',
  '.frg-tag{display:flex;align-items:center;padding:0 7px;font-size:10.5px;font-weight:700;color:#3e4c59;box-sizing:border-box;border-top:1px dashed #dfe5ea}',
  '.frg-tag:first-child,.frg-grupo:first-child{border-top:0}',
  '.frg-trilhos{position:relative;flex:0 0 auto}',
  '.frg-grupo{position:relative;border-top:1px dashed #dfe5ea;box-sizing:border-box}',
  '.frg-b{position:absolute;height:20px;border-radius:5px;padding:0 6px;margin:0;font:inherit;font-size:11.5px;font-weight:600;line-height:17px;white-space:nowrap;overflow:hidden;cursor:pointer;box-sizing:border-box;z-index:3;text-align:left;min-height:0}',
  '.frg-b.curta::after{content:"";position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:currentColor}',
  '.frg-b:focus-visible,.frg-m:focus-visible,.frg-ev:focus-visible{outline:2px solid #111;outline-offset:2px}',
  '.frg-b:hover{filter:brightness(1.08)}',
  '.frg-fora{position:absolute;font-size:11.5px;font-weight:600;color:#1f2933;white-space:nowrap;line-height:20px;pointer-events:none;z-index:3;background:rgba(255,255,255,.88);padding:0 3px;margin-left:-3px;border-radius:3px}',
  '.frg-b.grupo{box-shadow:3px -3px 0 -1px #fff,3px -3px 0 0 currentColor}',
  '.frg-balao ol{margin:4px 0 0;padding-left:18px}.frg-balao li{margin:1px 0}',
  '.frg-balao .ver{margin-top:8px;border:1px solid #fff;background:transparent;color:#fff;border-radius:6px;padding:5px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;min-height:32px}',
  '.frg-m{position:absolute;width:22px;height:22px;padding:0;margin:0;border:0;background:transparent;cursor:pointer;z-index:3;display:flex;align-items:center;justify-content:center;min-height:0}',
  '.frg-m i{display:block;width:13px;height:13px;transform:rotate(45deg);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);border-radius:2px}',
  '.frg-regua .frg-nome{display:flex;align-items:flex-end;font-size:12px}',
  '.frg-regua .frg-trilhos{height:46px}',
  '.frg-mes{position:absolute;top:3px;font-size:11px;font-weight:800;color:#1f2933;padding-left:4px;white-space:nowrap}',
  '.frg-tk{position:absolute;top:18px;font-size:11px;color:#3e4c59;line-height:1.2;white-space:nowrap;box-sizing:border-box;text-align:center}',
  '.frg-tk small{display:block;font-size:10px;color:#6b7785}',
  '.frg-tk.forte{font-weight:800;color:#1f2933}',
  '.frg-tk.esq{text-align:left;padding-left:4px}',
  '.frg-hoje-selo{position:absolute;top:2px;transform:translateX(-50%);background:#c81e1e;color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;padding:1px 7px;z-index:4;white-space:nowrap}',
  '.frg-vazios{font-size:12px;color:#52606d;margin:8px 0 0}',
  '.frg-balao{position:fixed;z-index:10050;max-width:310px;background:#1f2933;color:#fff;border-radius:8px;padding:9px 12px;font-size:12.5px;line-height:1.45;box-shadow:0 8px 22px rgba(0,0,0,.28);pointer-events:none}',
  '.frg-balao.fixo{pointer-events:auto}',
  '.frg-balao .t{display:block;font-weight:800;font-size:13px;margin:0 22px 4px 0}',
  '.frg-balao dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px}',
  '.frg-balao dt{color:#c4cdd5}.frg-balao dd{margin:0;overflow-wrap:anywhere}',
  '.frg-balao .fechar{position:absolute;top:4px;right:4px;border:0;background:transparent;color:#fff;font-size:18px;line-height:1;cursor:pointer;padding:4px 7px;min-height:0}',
  // celular: lista por veículo e dia (sem rolagem lateral)
  '.frg-card{background:#fff;border:1px solid #d9e0e7;border-radius:8px;margin-bottom:10px;overflow:hidden}',
  '.frg-card h4{margin:0;padding:9px 12px;font-size:14px;background:#f4f6f8;border-bottom:1px solid #e3e8ee}',
  '.frg-card h4 small{font-weight:400;color:#52606d;font-size:12px;margin-left:6px}',
  '.frg-dia{padding:4px 10px 8px;border-top:1px solid #eef1f4}.frg-dia:first-of-type{border-top:0}',
  '.frg-dia h5{margin:6px 2px 2px;font-size:12px;color:#3e4c59}',
  '.frg-dia.hoje h5{color:#c81e1e}',
  '.frg-ev{display:flex;width:100%;gap:8px;align-items:flex-start;text-align:left;background:#fff;border:1px solid #e3e8ee;border-radius:6px;padding:7px 8px;margin:4px 0 0;font:inherit;font-size:12.5px;cursor:pointer;color:#1f2933;min-height:40px;box-sizing:border-box;flex-wrap:wrap}',
  '.frg-ev .frg-sw{margin-top:2px}.frg-ev .frg-sw.losango{margin:4px 5px 0}',
  '.frg-ev .h{flex:0 0 auto;font-weight:700;font-variant-numeric:tabular-nums;min-width:84px}',
  '.frg-ev .d{flex:1 1 140px;min-width:0;overflow-wrap:anywhere}',
  '.frg-ev dl{flex:1 1 100%;margin:6px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;font-size:12px}',
  '.frg-ev dt{color:#52606d}.frg-ev dd{margin:0;overflow-wrap:anywhere}',
  '@media (max-width:760px){.frg-tag{padding:0 5px;font-size:10px}.frg-nome{font-size:12px;padding:6px}.frg-per input{width:104px}.frg-seg button{padding:7px 11px}.frg-leg{gap:6px 14px}}',
  '.frr-pedido{border:1px solid #f0c36d;background:#fffaf0;border-radius:8px;padding:10px 12px;margin:0 0 12px;font-size:12.5px}',
  '.leaflet-container .frr-tt{font-weight:700;font-size:11px;padding:1px 5px}',
  // celular: cada linha da tabela vira um cartão com o nome da coluna ao lado do valor (sem rolagem lateral)
  '@media (max-width:760px){.frr-tabela thead{display:none}.frr-tabela,.frr-tabela tbody,.frr-tabela tr,.frr-tabela td{display:block;width:100%;box-sizing:border-box}.frr-tabela tr{border:1px solid var(--border,#d9e0e7);border-radius:8px;margin-bottom:8px;padding:4px 8px;background:var(--card,#fff)}.frr-tabela td{border:0;padding:3px 0;display:flex;gap:10px;justify-content:space-between;text-align:right}.frr-tabela td.num{white-space:normal}.frr-tabela td::before{content:attr(data-rot);font-weight:700;text-align:left;color:var(--muted,#52606d);flex:0 0 42%}.frr-tabela td[data-rot=""]::before{display:none}}',
  '@media (max-width:760px){.frr-mapa-wrap{grid-template-columns:minmax(0,1fr)}.frr-mapa{height:320px}.frr-mapa.pequeno{height:300px}.frr-lista{max-height:none}.frr-sub button{flex:1 1 auto}}'
].join('\n');

function Frota_obterTelaRastreamento() {
  var t = { css: FROTAR_TELA_CSS, js: (typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() + '\n' : '') + '(' + FrotaR_telaNavegador_.toString() + ')();' };
  // 20/10/2026: a tela das reservas (SGO_Frota_ReservasTela.js) vem junto, na mesma chamada.
  if (typeof Frota_telaReservas_ === 'function') { var r = Frota_telaReservas_(); t.css += '\n' + r.css; t.js += '\n' + r.js; }
  // 21/10/2026: a tela do bloqueio da partida (SGO_Frota_BloqueioTela.js), parte da aba Rastreamento.
  if (typeof Frota_telaBloqueio_ === 'function') { var b = Frota_telaBloqueio_(); t.css += '\n' + b.css; t.js += '\n' + b.js; }
  return t;
}

function FrotaR_telaNavegador_() {
  var R = { sub: 'mapa', mapa: null, marcadores: {}, timer: null, dados: null, veiculos: null, condutores: null, rotaMapa: null, rotaCamada: null,
    leaflet: null, ajustou: false, enviando: false, gantt: { de: '', ate: '', modo: 'semana', vista: '', dados: null }, cop: { dias: 30, ia: false, dados: null } };
  var LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var CENTRO = [-16.6869, -49.2648];
  var SUBS = [['mapa', 'Mapa ao vivo'], ['rotas', 'Rotas'], ['combustivel', 'Combustível e KM'], ['relatorios', 'Relatórios'], ['aparelhos', 'Aparelhos e alertas'], ['bloqueio', 'Bloqueio da partida'], ['config', 'Privacidade e configuração']];

  function esc(v) { return tplFrota_esc(v); }
  // 21/10/2026: identificação dos veículos (apelido e base). O servidor manda rotuloVeiculo/identVeiculo em cada veículo;
  // o filtro de base usa a mesma escolha guardada no navegador da tela de veículos (funções do módulo da Frota).
  function rotV(x, completo) { return (x && (completo ? x.identVeiculo : x.rotuloVeiculo)) || (typeof tplFrota_rotuloVeic_ === 'function' ? tplFrota_rotuloVeic_(x, completo) : (x && (x.placa || x.PLACA)) || ''); }
  function passaBase(x) { return typeof tplFrota_passaBase_ === 'function' ? tplFrota_passaBase_(x) : true; }
  function seletorBase(id) { return typeof tplFrota_seletorBaseHtml_ === 'function' ? tplFrota_seletorBaseHtml_(id) : ''; }
  function ligarBase(id, f) { if (typeof tplFrota_ligarSeletorBase_ === 'function') tplFrota_ligarSeletorBase_(id, f); }
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
      (lista || []).map(function (v) { return '<option value="' + esc(v.ID) + '">' + esc(v.IDENT_VEICULO || (v.PLACA + (v.MODELO ? ' — ' + v.MODELO : ''))) + '</option>'; }).join('');
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
    // 21/10/2026: bloqueio e liberação da partida (SGO_Frota_BloqueioTela.js)
    else if (s === 'bloqueio') { if (typeof window.tplFrotaBlq_montar_ === 'function') window.tplFrotaBlq_montar_(corpo); else corpo.innerHTML = '<p class="muted">A tela do bloqueio da partida não carregou. Atualize a página e abra de novo.</p>'; }
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
      '<div class="frota-ident-topo">' + seletorBase('frr_mBase') + '</div><div id="frr_mapaAviso"></div><div class="frr-mapa-wrap"><div id="frr_mapa" class="frr-mapa" role="region" aria-label="Mapa dos veículos"></div><div id="frr_lista" class="frr-lista" aria-live="polite"><span class="muted">Carregando...</span></div></div>' +
      '<div class="frr-legenda" id="frr_legenda"></div><div class="frr-rodape"><span id="frr_atualizado"></span><button type="button" class="btn btn-sm" id="frr_atualizar">Atualizar agora</button></div>';
    el('frr_atualizar').onclick = function () { carregarMapa(false); };
    ligarBase('frr_mBase', function () {
      var r = R.dados;
      if (!r || !r.veiculos) return;
      R.ajustou = false;
      desenharLista(r.veiculos.filter(passaBase));
      garantirLeaflet().then(function (L) { desenharMarcadores(L, r.veiculos.filter(passaBase)); }).catch(function () {});
    });
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
      desenharLista(r.veiculos.filter(passaBase));
      el('frr_atualizado').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR') + ' · próxima leitura em ' + r.intervaloSeg + ' s';
      garantirLeaflet().then(function (L) { desenharMarcadores(L, r.veiculos.filter(passaBase)); }).catch(function () {
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
      return '<button type="button" class="frr-veic" data-frr-veic="' + esc(v.id) + '" style="border-left-color:' + esc(v.cor) + '"><strong>' + esc(rotV(v)) + '</strong>' +
        '<span class="frr-chip" style="background:' + esc(v.cor) + '">' + esc(v.situacaoTexto) + '</span>' +
        (v.alertaUsoSemRegistro && v.situacao !== 'USO_SEM_REGISTRO' ? '<span class="frr-chip" style="background:#a61b1b">Alerta aberto</span>' : '') +
        '<div>' + (v.condutorNome ? 'Condutor: ' + esc(v.condutorNome) + (v.retiradaDesde ? ' (desde ' + esc(v.retiradaDesde) + ')' : '') : '<span class="frr-meta">Sem retirada aberta</span>') + '</div>' +
        '<div>' + (v.kmh !== null ? num(v.kmh) + ' km/h · ' : '') + esc(v.estadoTexto) + '</div>' +
        (v.local ? '<div class="frr-meta">' + esc(v.local) + '</div>' : '') +
        (v.baseFrota ? '<div class="frr-meta">Base ' + esc(v.baseFrota) + '</div>' : '') +
        '<div class="frr-meta">' + (v.atualizadoEm ? 'Posição de ' + esc(v.atualizadoEm) + (v.idadeMin !== null ? ' (há ' + dur(v.idadeMin) + ')' : '') : 'Sem posição') +
        (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">abrir no mapa</a>' : '') + '</div></button>';
    }).join('') : '<span class="muted">Nenhum veículo com aparelho ligado.</span>';
    Array.prototype.forEach.call(lista.querySelectorAll('[data-frr-veic]'), function (b) {
      b.onclick = function () { var m = R.marcadores[b.getAttribute('data-frr-veic')]; if (m && R.mapa) { R.mapa.setView(m.getLatLng(), Math.max(R.mapa.getZoom(), 15)); m.openPopup(); } };
    });
  }

  function popupVeic(v) {
    return '<strong>' + esc(rotV(v)) + '</strong> ' + esc(v.modelo) + (v.baseFrota ? ' · ' + esc(v.baseFrota) : '') + '<br>' + esc(v.situacaoTexto) + (v.condutorNome ? '<br>Condutor: ' + esc(v.condutorNome) : '') +
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
        m.bindTooltip(esc(v.apelido || v.placa), { permanent: true, direction: 'top', offset: [0, -8], className: 'frr-tt' });
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
          return [esc(x.saida), esc(x.chegada), esc(rotV(x)), esc(x.condutor), x.km === null ? '—' : num(x.km), esc(x.finalidade || '—'),
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
      var tit = r.tipo === 'RETIRADA' ? 'Rota da retirada: ' + rotV(r.retirada) + ' — ' + r.retirada.condutor : 'Rota do veículo ' + rotV(r);
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
          return ['<strong>' + esc(rotV(c)) + '</strong><div class="frr-meta">' + esc(c.modelo) + '</div>', String(c.abastecimentos), num(c.litros, 2), moeda(c.valor), num(c.kmInformado), c.kmRastreador === null ? '—' : num(c.kmRastreador, 1),
            c.custoPorKm === null ? '—' : moeda(c.custoPorKm), c.kmLPeriodo === null ? '—' : num(c.kmLPeriodo, 2), c.kmLReferencia === null ? '<span class="frr-meta">poucos dados</span>' : num(c.kmLReferencia, 2),
            c.desvioPct === null ? '—' : marca((c.desvioPct > 0 ? '+' : '') + num(c.desvioPct, 1) + '%', c.alertaConsumo ? 'critico' : 'ok'),
            '<div style="display:flex;gap:4px;min-width:130px"><input aria-label="Capacidade do tanque de ' + esc(c.placa) + '" data-frr-tq="' + esc(c.veiculoId) + '" value="' + (c.capacidadeTanque === null ? '' : esc(c.capacidadeTanque)) + '" inputmode="decimal" style="width:62px"><button type="button" class="btn btn-sm" data-frr-tqg="' + esc(c.veiculoId) + '">Gravar</button></div>'];
        }), 'Nenhum veículo ativo.') +
        '<h3>Abastecimentos a conferir</h3>' + tabela([{ t: 'Veículo' }, { t: 'Data' }, { t: 'Litros', num: true }, { t: 'KM', num: true }, { t: 'Comprovante' }, { t: 'Apontamento' }],
          aConferir.map(function (a) { return [esc(rotV(a)), esc(a.data + (a.hora ? ' ' + a.hora : '')), num(a.litros, 2), num(a.km), a.comprovante ? '<a href="' + esc(a.comprovante) + '" target="_blank" rel="noopener">ver</a>' : marca('sem', 'critico'), a.apontamentos.map(function (p) { return esc(p.texto); }).join('<br>')]; }),
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
            return [esc(p.pedidoEm), esc(rotV(p)), esc(p.condutor), esc(p.motivo), esc(p.prazo), sit, p.situacao === 'PENDENTE' ? '<button type="button" class="btn btn-sm" data-frr-canc="' + esc(p.id) + '">Cancelar</button>' : ''];
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
        r.itens.map(function (x) { return [esc(x.quando), esc(x.quem) + ' <span class="frr-meta">' + esc(x.perfil) + '</span>', esc(x.acao), esc(x.placa ? rotV(x) : '—'), esc(x.periodo || '—'), esc(x.origem)]; }), 'Ninguém consultou ainda.');
    }).catch(function (err) { el('frr_trilha').innerHTML = erroHtml(err); });
  }

  // ---------------- GANTT (Gestão e melhoria) ----------------
  // 21/10/2026: refeito. Vistas Dia / Semana / Mês; em cada veículo as sub-linhas "Planejado" (reservas, manutenção
  // programada), "Realizado" (retiradas, paradas) e "Marcos" (manutenção prevista, documento que vence); o que acontece
  // ao mesmo tempo fica um embaixo do outro (SGOGantt.empilhar, SGO_Gantt_Layout.js). Texto só quando cabe inteiro;
  // o detalhe fica no balão (passar o mouse ou tocar). No celular, lista por veículo e dia (ou o gráfico rolando
  // dentro do quadro). Só visualização: os dados e as regras são os do servidor (Frota_apiRastrGantt).
  var GT_NOMES = { RETIRADA: 'Retirada', PARADA: 'Parada', RESERVA: 'Reserva', MANUT_PROG: 'Manutenção programada', MANUTENCAO: 'Manutenção prevista', DOCUMENTO: 'Documento vence', ACAO: 'Ação de plano' };
  var GT_GRUPOS = { RESERVA: 'plan', MANUT_PROG: 'plan', RETIRADA: 'real', PARADA: 'real', MANUTENCAO: 'marco', DOCUMENTO: 'marco', ACAO: 'acao' };
  var GT_MODOS = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']];
  var GT_PLURAL = { RETIRADA: 'retiradas', PARADA: 'paradas', RESERVA: 'reservas', MANUT_PROG: 'manutenções', ACAO: 'ações' };
  var GT_LANE = 26, GT_BARRA = 20;
  var gtItens = [], gtBalao = null, gtFixo = null, gtMedidor = null, gtRedim = null;

  function gtParse(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim()); if (!m) return null; var d = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(d.getTime()) ? null : d.getTime(); }
  function gtPadrao(modo) { return modo === 'dia' ? [diasBr(0), diasBr(0)] : modo === 'mes' ? [diasBr(-30), diasBr(60)] : [diasBr(-7), diasBr(14)]; }
  function gtCelular() { try { if (typeof ehMobileModo_ === 'function' && ehMobileModo_()) return true; } catch (e) {} return window.matchMedia ? window.matchMedia('(max-width: 760px)').matches : window.innerWidth <= 760; }
  function gtClasse(it) { return 'frg-' + it.tipo + (it.emAndamento ? ' andamento' : '') + (it.concluida ? ' ok' : '') + (it.vencida ? ' vencida' : ''); }
  function gtMedir(t) {
    try {
      if (!gtMedidor) { gtMedidor = document.createElement('canvas').getContext('2d'); gtMedidor.font = '600 11.5px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif'); }
      return Math.ceil(gtMedidor.measureText(String(t || '')).width) + 1;
    } catch (e) { return String(t || '').length * 6.6; }
  }

  window.tplFrotaR_gantt_ = function (corpo) {
    if (!corpo) return;
    corpo.classList.remove('muted');
    var G = R.gantt;
    if (!G.modo) G.modo = 'semana';
    if (!G.de || !G.ate) { var p = gtPadrao(G.modo); G.de = p[0]; G.ate = p[1]; }
    var cel = gtCelular();
    if (!G.vista) G.vista = cel ? 'lista' : 'grafico';
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> cada veículo tem a sub-linha <b>Planejado</b> (reservas e manutenção programada), <b>Realizado</b> (retiradas e paradas) e, quando houver, <b>Marcos</b> (losangos: manutenção prevista e documento que vence). O que acontece ao mesmo tempo fica um embaixo do outro. ' +
      'Escolha Dia, Semana ou Mês e use Anterior, Hoje e Próximo para andar no tempo. Passe o mouse ou toque numa barra para ver condutor, saída, devolução, KM e situação. A linha vermelha é agora.</div>' +
      '<div class="frg-barra"><div class="frg-seg" role="group" aria-label="Escala">' + GT_MODOS.map(function (m) { return '<button type="button" data-frg-modo="' + m[0] + '" aria-pressed="' + (G.modo === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<div class="frg-nav"><button type="button" class="btn" id="frg_ant">‹ Anterior</button><button type="button" class="btn" id="frg_hoje">Hoje</button><button type="button" class="btn" id="frg_prox">Próximo ›</button></div>' +
      '<div class="frg-per"><div><label for="frr_gDe">De</label><input id="frr_gDe" value="' + esc(G.de) + '" inputmode="numeric" placeholder="dd/mm/aaaa"></div><div><label for="frr_gAte">Até</label><input id="frr_gAte" value="' + esc(G.ate) + '" inputmode="numeric" placeholder="dd/mm/aaaa"></div><button type="button" class="btn" id="frr_gAtualizar">Atualizar</button></div>' +
      (cel ? '<div class="frg-seg" role="group" aria-label="Como ver"><button type="button" data-frg-vista="lista" aria-pressed="' + (G.vista === 'lista') + '">Lista</button><button type="button" data-frg-vista="grafico" aria-pressed="' + (G.vista === 'grafico') + '">Gráfico</button></div>' : '') + '</div>' +
      '<div class="frota-ident-topo">' + seletorBase('frr_gBase') + '</div><div id="frr_gRes"><span class="muted">Carregando...</span></div><div id="frr_gDetalhe" class="frr-meta" aria-live="polite" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"></div>';
    var recarregar = function () { window.tplFrotaR_gantt_(corpo); };
    ligarBase('frr_gBase', function () { if (G.dados) desenharGantt(G.dados); });
    Array.prototype.forEach.call(corpo.querySelectorAll('[data-frg-modo]'), function (b) {
      b.onclick = function () { var m = b.getAttribute('data-frg-modo'); if (m === G.modo) return; G.modo = m; var p = gtPadrao(m); G.de = p[0]; G.ate = p[1]; recarregar(); };
    });
    Array.prototype.forEach.call(corpo.querySelectorAll('[data-frg-vista]'), function (b) {
      b.onclick = function () { G.vista = b.getAttribute('data-frg-vista'); recarregar(); };
    });
    var andar = function (sinal) {
      var a = gtParse(G.de), b = gtParse(G.ate);
      if (a === null || b === null || b < a) { var p = gtPadrao(G.modo); G.de = p[0]; G.ate = p[1]; recarregar(); return; }
      var n = Math.round((b - a) / 86400000) + 1;
      G.de = br(a + sinal * n * 86400000 + 43200000); G.ate = br(b + sinal * n * 86400000 + 43200000); recarregar();
    };
    el('frg_ant').onclick = function () { andar(-1); };
    el('frg_prox').onclick = function () { andar(1); };
    el('frg_hoje').onclick = function () { var p = gtPadrao(G.modo); G.de = p[0]; G.ate = p[1]; recarregar(); };
    el('frr_gAtualizar').onclick = function () { G.de = val('frr_gDe'); G.ate = val('frr_gAte'); recarregar(); };
    api('apiRastrGantt', { de: G.de, ate: G.ate }).then(function (r) { G.dados = r; desenharGantt(r); }).catch(function (err) { el('frr_gRes').innerHTML = erroHtml(err); });
    if (!gtRedim) {
      gtRedim = function () {
        clearTimeout(gtRedim.t);
        gtRedim.t = setTimeout(function () { if (R.gantt.dados && el('frr_gRes') && el('frr_gRes').offsetParent !== null) desenharGantt(R.gantt.dados); }, 200);
      };
      window.addEventListener('resize', gtRedim);
    }
  };

  function gtLegenda() {
    var sw = function (cls, t, forma) { return '<span><i class="frg-sw ' + (forma || '') + ' ' + cls + '"></i>' + esc(t) + '</span>'; };
    return '<div class="frg-leg" aria-label="Legenda">' +
      '<div class="frg-leg-g"><b>Planejado</b>' + sw('frg-RESERVA', 'Reserva') + sw('frg-RESERVA ok', 'cumprida') + sw('frg-RESERVA vencida', 'não utilizada') + sw('frg-MANUT_PROG', 'Manutenção programada') + sw('frg-ACAO', 'Ação de plano') + '</div>' +
      '<div class="frg-leg-g"><b>Realizado</b>' + sw('frg-RETIRADA', 'Retirada') + sw('frg-RETIRADA andamento', 'em andamento') + sw('frg-PARADA', 'Parada') + '</div>' +
      '<div class="frg-leg-g"><b>Marcos</b>' + sw('frg-MANUTENCAO', 'Manutenção prevista', 'losango') + sw('frg-DOCUMENTO', 'Documento vence', 'losango') + sw('frg-DOCUMENTO vencida', 'vencido', 'losango') + '<span><i class="frg-sw linha"></i>Agora</span></div></div>';
  }

  function gtGuardar(it, linha) { return gtItens.push({ it: it, placa: linha.veiculoId ? rotV(linha) : '' }) - 1; }

  function desenharGantt(r) {
    var alvo = el('frr_gRes');
    if (!alvo) return;
    gtFechar(true);
    gtItens = [];
    var G = R.gantt, S = window.SGOGantt;
    r = Object.assign({}, r, { linhas: (r.linhas || []).filter(function (l) { return !l.veiculoId || passaBase(l); }) }); // 21/10/2026: filtro por base
    var com = r.linhas.filter(function (l) { return l.itens.length; });
    var sem = r.linhas.filter(function (l) { return !l.itens.length && l.veiculoId; });
    var nEv = com.reduce(function (s, l) { return s + l.itens.length; }, 0);
    var topo = '<p class="frg-resumo"><b>' + esc(r.periodo || '') + '</b> · ' + com.filter(function (l) { return l.veiculoId; }).length + ' veículo(s) com eventos · ' + nEv + ' evento(s)</p>' + gtLegenda();
    var vaz = sem.length ? '<p class="frg-vazios">Sem eventos no período: ' + sem.map(function (l) { return esc(rotV(l)) + (l.modelo ? ' (' + esc(l.modelo) + ')' : ''); }).join(', ') + '.</p>' : '';
    if (!S) { alvo.innerHTML = erroHtml({ message: 'O desenho do Gantt não carregou. Recarregue a página (F5).' }); return; }
    if (!com.length) { alvo.innerHTML = topo + '<p class="muted">Nada no período escolhido.</p>' + vaz + '<p class="frr-meta">' + esc(r.nota) + '</p>'; return; }
    var corpoHtml = gtCelular() && G.vista === 'lista' ? gtLista(r, com, S) : gtGrafico(r, com, S, alvo);
    alvo.innerHTML = topo + corpoHtml + vaz + '<p class="frr-meta">' + esc(r.nota) + '</p>';
    gtLigar(alvo);
    var q = alvo.querySelector('.frg-quadro');
    if (q && q.scrollWidth > q.clientWidth) { var h = q.querySelector('[data-frg-hojex]'); if (h) q.scrollLeft = Math.max(0, Number(h.getAttribute('data-frg-hojex')) - q.clientWidth / 3); }
  }

  function gtGrafico(r, com, S, alvo) {
    var cel = gtCelular();
    var rotW = cel ? 152 : 204, tagW = cel ? 66 : 76;
    var disp = Math.max(240, (alvo.clientWidth || 900) - 2 - rotW);
    var e = S.escala({ de: r.de, ate: r.ate, largura: disp, modo: R.gantt.modo, hoje: r.hoje });
    var W = e.largura;
    var fundo = '<div class="frg-fundo" style="left:' + rotW + 'px;width:' + W + 'px">' +
      e.fds.map(function (f) { return '<div class="fds" style="left:' + f.x.toFixed(1) + 'px;width:' + f.w.toFixed(1) + 'px"></div>'; }).join('') +
      e.linhas.map(function (l) { return '<div class="ln' + (l.forte ? ' forte' : '') + '" style="left:' + l.x.toFixed(1) + 'px"></div>'; }).join('') +
      (e.hojeDia ? '<div class="hojecol" style="left:' + e.hojeDia.x.toFixed(1) + 'px;width:' + e.hojeDia.w.toFixed(1) + 'px"></div>' : '') +
      (e.hojeX !== null ? '<div class="hoje" data-frg-hojex="' + Math.round(e.hojeX) + '" style="left:' + (e.hojeX - 1).toFixed(1) + 'px"></div>' : '') + '</div>';
    var regua = '<div class="frg-linha frg-regua"><div class="frg-rot" style="width:' + rotW + 'px"><div class="frg-nome">Veículo</div></div><div class="frg-trilhos" style="width:' + W + 'px">' +
      e.meses.map(function (m) { return '<span class="frg-mes" style="left:' + m.x.toFixed(1) + 'px">' + esc(m.rot) + '</span>'; }).join('') +
      e.ticks.map(function (t) {
        var largo = t.w ? 'width:' + t.w.toFixed(1) + 'px;' : '';
        var esq = e.modo !== 'semana';
        return '<span class="frg-tk' + (t.forte ? ' forte' : '') + (esq ? ' esq' : '') + '" style="left:' + t.x.toFixed(1) + 'px;' + largo + '">' + (t.sub && e.modo === 'semana' ? '<small>' + esc(t.sub) + '</small>' : '') + esc(t.rot) + '</span>';
      }).join('') +
      (e.hojeX !== null ? '<span class="frg-hoje-selo" style="left:' + e.hojeX.toFixed(1) + 'px">agora ' + esc(S.hora(r.hoje)) + '</span>' : '') + '</div></div>';
    var opc = { x: e.x, limite: W - 2, medir: gtMedir, larguraMin: 10, folga: 4, pad: 13, marco: 22, ehMarco: function (it) { return GT_GRUPOS[it.tipo] === 'marco'; },
      agrupar: function (it) { return it.tipo + (it.emAndamento ? '|a' : '') + (it.concluida ? '|ok' : '') + (it.vencida ? '|v' : ''); },
      rotuloGrupo: function (ch, n) { return n + ' ' + (GT_PLURAL[ch.split('|')[0]] || 'eventos'); } };
    var linhas = com.map(function (l) {
      var grupos = l.veiculoId ? [['plan', 'Planejado'], ['real', 'Realizado']] : [['acao', 'Ações']];
      if (l.itens.some(function (it) { return GT_GRUPOS[it.tipo] === 'marco'; })) grupos.push(['marco', 'Marcos']);
      var tags = '', trilhos = '';
      grupos.forEach(function (g) {
        var its = l.itens.filter(function (it) { return (GT_GRUPOS[it.tipo] || 'real') === g[0]; });
        // nome curto ("Ana T.") só para pessoas; título de ação, motivo e documento aparecem inteiros ou ficam no balão
        its.forEach(function (it) { if (it.tipo !== 'RETIRADA' && it.tipo !== 'RESERVA' && it.curto === undefined) it.curto = ''; });
        var emp = S.empilhar(its, opc), h = emp.faixas * GT_LANE + 6;
        tags += '<div class="frg-tag" style="height:' + h + 'px">' + esc(g[1]) + '</div>';
        trilhos += '<div class="frg-grupo" style="height:' + h + 'px">' + emp.itens.map(function (p) {
          var k = gtGuardar(p.item, l), top = 3 + p.faixa * GT_LANE + (GT_LANE - GT_BARRA) / 2;
          var aria = esc((GT_NOMES[p.item.tipo] || '') + ': ' + (p.item.detalhe || p.item.rotulo || ''));
          var fora = p.posTexto === 'fora' ? '<span class="frg-fora" style="left:' + (p.x + p.w + 5).toFixed(1) + 'px;top:' + (top - 1) + 'px">' + esc(p.texto) + '</span>' : '';
          if (p.marco) return '<button type="button" class="frg-m" data-frg="' + k + '" style="left:' + p.x.toFixed(1) + 'px;top:' + (top - 1) + 'px" aria-label="' + aria + '"><i class="' + gtClasse(p.item) + '"></i></button>' + fora;
          return '<button type="button" class="frg-b ' + gtClasse(p.item.grupo ? p.item.grupo[0] : p.item) + (p.curta ? ' curta' : '') + (p.agrupado ? ' grupo' : '') + '" data-frg="' + k + '" style="left:' + p.x.toFixed(1) + 'px;top:' + top + 'px;width:' + p.w.toFixed(1) + 'px" aria-label="' + aria + '">' + (p.posTexto === 'dentro' ? esc(p.texto) : '') + '</button>' + fora;
        }).join('') + '</div>';
      });
      return '<div class="frg-linha"><div class="frg-rot" style="width:' + rotW + 'px"><div class="frg-nome">' + esc(rotV(l)) + (cel ? '' : '<small>' + esc(l.modelo) + '</small>') + '</div><div class="frg-tags" style="flex-basis:' + tagW + 'px">' + tags + '</div></div>' +
        '<div class="frg-trilhos" style="width:' + W + 'px">' + trilhos + '</div></div>';
    }).join('');
    return (e.rolar ? '<p class="frr-meta" style="margin:0 0 4px">Deslize o quadro para os lados para ver o período inteiro; o nome do veículo fica fixo.</p>' : '') +
      '<div class="frg-quadro"><div class="frg-conteudo" style="width:' + (rotW + W) + 'px">' + fundo + regua + linhas + '</div></div>';
  }

  function gtLista(r, com, S) {
    var hojeIni = S.inicioDia(r.hoje);
    var quando = function (it) {
      if (GT_GRUPOS[it.tipo] === 'marco') return 'no dia';
      var a = S.hora(it.ini), mesmoDia = S.inicioDia(it.ini) === S.inicioDia(it.fim);
      return a + (mesmoDia ? '–' + S.hora(it.fim) : ' até ' + S.dataCurta(it.fim) + ' ' + S.hora(it.fim));
    };
    return '<div class="frg-lista">' + com.map(function (l) {
      var dias = {}, ordem = [];
      l.itens.slice().sort(function (a, b) { return a.ini - b.ini; }).forEach(function (it) {
        var d = S.inicioDia(Math.max(it.ini, r.de));
        if (!dias[d]) { dias[d] = []; ordem.push(d); }
        dias[d].push(it);
      });
      return '<div class="frg-card"><h4>' + esc(rotV(l)) + '<small>' + esc(l.modelo) + '</small></h4>' + ordem.map(function (d) {
        var q = S.partes(d);
        return '<div class="frg-dia' + (d === hojeIni ? ' hoje' : '') + '"><h5>' + esc(S.semana[q.s] + ', ' + S.dataCurta(d) + (d === hojeIni ? ' (hoje)' : '')) + '</h5>' + dias[d].map(function (it) {
          var k = gtGuardar(it, l), marco = GT_GRUPOS[it.tipo] === 'marco';
          var inicioAntes = it.ini < r.de && !marco;
          return '<button type="button" class="frg-ev" data-frg="' + k + '" data-frg-lista="1" aria-expanded="false"><i class="frg-sw ' + (marco ? 'losango ' : '') + gtClasse(it) + '"></i><span class="h">' + esc(inicioAntes ? 'desde ' + S.dataCurta(it.ini) : quando(it)) + '</span>' +
            '<span class="d"><b>' + esc(GT_NOMES[it.tipo] || it.tipo) + (it.emAndamento ? ' (em andamento)' : '') + '</b> · ' + esc(it.rotulo || '') + '</span></button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function gtConteudo(g) {
    if (g.it.grupo) {
      var S = window.SGOGantt, gs = g.it.grupo;
      var li = gs.map(function (x) { return '<li>' + esc(S.dataCurta(x.ini) + ' ' + S.hora(x.ini) + '–' + (S.inicioDia(x.ini) === S.inicioDia(x.fim) ? '' : S.dataCurta(x.fim) + ' ') + S.hora(x.fim) + ' · ' + (x.rotulo || '')) + '</li>'; }).join('');
      return { titulo: g.it.rotulo + (g.placa ? ' · ' + g.placa : ''), dl: '<ol>' + li + '</ol>', dia: S.inicioDia(g.it.ini), texto: g.it.rotulo + ': ' + gs.map(function (x) { return S.hora(x.ini) + ' ' + (x.rotulo || ''); }).join('; ') };
    }
    var it = g.it, campos = it.campos && it.campos.length ? it.campos : null;
    var sit = it.emAndamento ? ' (em andamento)' : it.tipo === 'RESERVA' && it.concluida ? ' (cumprida)' : it.tipo === 'RESERVA' && it.vencida ? ' (não utilizada)' : it.vencida ? ' (vencido)' : '';
    var dl = campos ? '<dl>' + (g.placa ? '<dt>Veículo</dt><dd>' + esc(g.placa) + '</dd>' : '') + campos.map(function (c) { return '<dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd>'; }).join('') + '</dl>'
      : '<dl>' + (g.placa ? '<dt>Veículo</dt><dd>' + esc(g.placa) + '</dd>' : '') + '<dt>Detalhe</dt><dd>' + esc(it.detalhe || it.rotulo || '') + '</dd></dl>';
    return { titulo: (GT_NOMES[it.tipo] || it.tipo) + sit, dl: dl, texto: (GT_NOMES[it.tipo] || '') + sit + '. ' + (campos ? campos.map(function (c) { return c[0] + ': ' + c[1]; }).join('; ') : (it.detalhe || '')) };
  }

  function gtFechar(tudo) {
    if (gtBalao && (tudo || !gtFixo)) { gtBalao.remove(); gtBalao = null; gtFixo = null; }
  }

  function gtMostrar(b, fixo) {
    var g = gtItens[Number(b.getAttribute('data-frg'))];
    if (!g) return;
    var c = gtConteudo(g);
    if (gtBalao) gtBalao.remove();
    gtBalao = document.createElement('div');
    gtBalao.className = 'frg-balao' + (fixo ? ' fixo' : '');
    gtBalao.setAttribute('role', fixo ? 'dialog' : 'tooltip');
    gtBalao.innerHTML = (fixo ? '<button type="button" class="fechar" aria-label="Fechar">×</button>' : '') + '<span class="t">' + esc(c.titulo) + '</span>' + c.dl +
      (c.dia !== undefined ? (fixo ? '<button type="button" class="ver">Ver este dia um a um</button>' : '<div style="margin-top:6px;color:#c4cdd5">Toque para abrir e ver o dia um a um.</div>') : '');
    document.body.appendChild(gtBalao);
    gtFixo = fixo ? b : null;
    if (fixo) gtBalao.querySelector('.fechar').onclick = function () { gtFechar(true); b.focus(); };
    var ver = gtBalao.querySelector('.ver');
    if (ver) ver.onclick = function () { var d = br(c.dia + 43200000); gtFechar(true); R.gantt.modo = 'dia'; R.gantt.de = d; R.gantt.ate = d; var corpo = el('frr_gRes') && el('frr_gRes').parentNode; if (corpo) window.tplFrotaR_gantt_(corpo); };
    var rb = b.getBoundingClientRect(), bw = gtBalao.offsetWidth, bh = gtBalao.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.max(8, Math.min(vw - bw - 8, rb.left + Math.min(rb.width, 40) / 2 - 20));
    var top = rb.bottom + 8 + bh <= vh - 8 ? rb.bottom + 8 : Math.max(8, rb.top - bh - 8);
    gtBalao.style.left = left + 'px'; gtBalao.style.top = top + 'px';
    var det = el('frr_gDetalhe'); if (det && fixo) det.textContent = c.texto;
  }

  function gtLigar(alvo) {
    var pairar = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frg]'), function (b) {
      if (b.getAttribute('data-frg-lista')) {
        b.onclick = function () {
          var aberto = b.getAttribute('aria-expanded') === 'true', dl = b.querySelector('dl');
          if (aberto) { if (dl) dl.remove(); b.setAttribute('aria-expanded', 'false'); return; }
          var c = gtConteudo(gtItens[Number(b.getAttribute('data-frg'))]);
          b.insertAdjacentHTML('beforeend', c.dl); b.setAttribute('aria-expanded', 'true');
          var det = el('frr_gDetalhe'); if (det) det.textContent = c.texto;
        };
        return;
      }
      if (pairar) {
        b.onmouseenter = function () { if (!gtFixo) gtMostrar(b, false); };
        b.onmouseleave = function () { if (!gtFixo) gtFechar(false); };
      }
      b.onfocus = function () { if (!gtFixo) gtMostrar(b, false); };
      b.onblur = function () { if (!gtFixo) gtFechar(false); };
      b.onclick = function (ev) { ev.stopPropagation(); if (gtFixo === b) { gtFechar(true); return; } gtMostrar(b, true); };
    });
    var q = alvo.querySelector('.frg-quadro');
    if (q) q.addEventListener('scroll', function () { gtFechar(true); }, { passive: true });
    if (!window.__frgFora) {
      window.__frgFora = true;
      document.addEventListener('click', function (ev) { if (gtBalao && gtFixo && !gtBalao.contains(ev.target)) gtFechar(true); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && gtBalao) { var f = gtFixo; gtFechar(true); if (f) f.focus(); } });
      window.addEventListener('scroll', function () { if (gtBalao) gtFechar(true); }, { passive: true, capture: true });
    }
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
        return '<div class="frr-pedido" data-frr-ped="' + id + '"><strong>Comprovante pedido a você: veículo ' + esc(rotV(p)) + (p.dataRef ? ' (' + esc(p.dataRef) + ')' : '') + '</strong>' +
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
