/****************************************************
 * FROTA — RASTREAMENTO: VISÃO GERAL, CONFIGURAÇÃO E REGISTRO DO BLOQUEIO (21/10/2026; redesenho 31/10/2026)
 *
 * Código do navegador (nunca executado no servidor): Frota_telaBloqueio_ devolve o CSS e o texto da função
 * FrotaBlq_telaNavegador_; Frota_obterTelaRastreamento junta com as outras telas.
 *
 * 31/10/2026 (pedido do dono: "quero que o especialista redesenhe essa função lá no frota para ficar mais fácil ativar e
 * desativar, cadastrar e outras ferramentas, está muito confusa"). Só tela e organização; as chamadas ao servidor, os
 * dados enviados e as regras do bloqueio (SGO_Frota_Bloqueio.js) são os mesmos de antes:
 *  - tplFrotaBlq_montar_  (aba "Visão geral"): o que precisa da gestão (decisões, alertas de uso sem registro, aparelho
 *    sugerido) e um cartão por veículo ativo (com ou sem aparelho) com aparelho, sinal, com quem está, partida e modo do
 *    bloqueio; as ações ficam no cartão: modo Ativo / Simulação / Desligado (com motivo), Liberar agora (emergência),
 *    Ver no mapa, Ligar ou trocar aparelho e, em "Mais ações", triagem do sinal, odômetro, fim da emergência e roubo;
 *  - tplFrotaBlq_config_  (aba "Configuração"): "O que falta para funcionar" (lista de verificação com um botão por item),
 *    "Aparelhos" (ligar aparelho a veículo) e "Áreas das bases" (cadastrar, editar, remover e ver no mapa);
 *  - tplFrotaBlq_registro_ ("Consultas e relatórios > Registro do bloqueio"): registro inviolável, integridade, relatório
 *    do dia e o histórico dos comandos da versão anterior.
 * Botão que a pessoa não pode usar aparece apagado e, ao tocar, diz por quê e o que fazer (a regra continua no servidor).
 * Nada se atualiza sozinho: a tela só relê depois de uma ação ou no botão "Atualizar" (nenhum formulário aberto é redesenhado).
 * Leituras em sequência (painel do bloqueio e depois a lista de aparelhos), por causa do limite do rastreador.
 * Servidor: SGO_Frota_Bloqueio.js (apiBloqueio*, apiPassagemDecidir) e SGO_Frota_Rastreador.js (apiListarRastreador,
 * apiRastreadorVincular, apiRastreadorConferirComandos, apiRastreadorConferirAlerta, apiRastreadorAtualizarAgora).
 ****************************************************/

var FROTA_BLQ_TELA_CSS = [
  '.fbq-topo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 10px}',
  '.fbq-topo .btn,.fbq-topo .btn-primary{margin-top:0}',
  '.fbq-chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;margin:0 4px 3px 0}',
  '.fbq-chip.ativo{background:#fde8e8;color:#9b1c1c}.fbq-chip.sim{background:#e8eefc;color:#1e3a8a}.fbq-chip.desl{background:#eceff1;color:#41505c}',
  '.fbq-chip.ok{background:#e3f5ec;color:#0f6b43}.fbq-chip.alerta{background:#fff1d6;color:#8a5300}',
  '.fbq-linha{display:flex;gap:8px;justify-content:space-between;border-bottom:1px solid var(--border,#eef1f4);padding:3px 0;font-size:12.5px}',
  '.fbq-linha:last-child{border-bottom:0}',
  '.fbq-linha span:first-child{color:var(--muted,#52606d);flex:0 0 36%}',
  '.fbq-linha span:last-child{text-align:right;min-width:0;overflow-wrap:anywhere}',
  '.fbq-acoes{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
  '.fbq-acoes button{min-height:38px;margin-top:0}',
  '.fbq-form{background:var(--bc-surface-2,#f4f6f8);border:1px solid var(--bc-line-soft,#eceae3);border-radius:8px;padding:10px;margin-top:8px;font-size:12.5px}',
  '.fbq-form label{display:block;font-size:12px;font-weight:700;margin:6px 0 3px}',
  '.fbq-form input,.fbq-form select,.fbq-form textarea{width:100%;box-sizing:border-box;min-height:38px}',
  '.fbq-form .fbq-check{display:flex;gap:8px;align-items:flex-start;font-weight:600;margin:8px 0}',
  '.fbq-form .fbq-check input{width:auto;min-height:0;margin-top:3px}',
  '.fbq-form p{margin:0 0 6px;line-height:1.5}',
  '.fbq-perigo{border:1px solid #d64545;background:#fff5f5;border-radius:8px;padding:8px 10px;font-size:12.5px;margin:6px 0}',
  '.fbq-sec{margin:18px 0 8px;font-size:15px}',
  '.fbq-pre{white-space:pre-wrap;font-size:12.5px;background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:10px;max-height:420px;overflow:auto}',
  // estado geral (faixa no topo da Visão geral)
  '.fbq-estado{display:flex;gap:10px;align-items:flex-start;border-radius:8px;padding:10px 12px;margin:0 0 10px;font-size:13px;line-height:1.5;border:1px solid}',
  '.fbq-estado.ok{background:var(--bc-action-bg,#e8f2e5);border-color:var(--bc-action-line,#b9d3b3)}',
  '.fbq-estado.alerta{background:var(--bc-warn-bg,#faf0d7);border-color:var(--bc-warn-line,#e6d3a2)}',
  '.fbq-estado.critico{background:var(--bc-danger-bg,#fbebe8);border-color:var(--bc-danger-line,#ebc2bc)}',
  '.fbq-estado>div{flex:1 1 auto;min-width:0}.fbq-estado .btn{margin-top:6px}',
  // cartões dos veículos
  '.fbq-cab{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between;margin:18px 0 8px}',
  '.fbq-cab .fbq-sec{margin:0}',
  '.fbq-cartoes{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;align-items:start}',
  '.fbq-v{background:var(--bc-surface,#fff);border:1px solid var(--bc-line,#e2e0d8);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:9px;min-width:0}',
  '.fbq-v.sem{border-style:dashed;background:var(--bc-surface-2,#faf9f6)}',
  '.fbq-v.atencao{border-left:5px solid #c98a12}',
  '.fbq-vcab{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}',
  '.fbq-vcab h4{margin:0;font-size:17px;line-height:1.25}',
  '.fbq-vsub{font-size:12px;color:var(--bc-text-3,#5f645f);margin-top:2px}',
  '.fbq-part{border-radius:999px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;border:1px solid}',
  '.fbq-part.lib{background:#e3f5ec;color:#0f6b43;border-color:#a7d8bd}.fbq-part.blq{background:#fde8e8;color:#9b1c1c;border-color:#f0b4b4}.fbq-part.ni{background:#eceff1;color:#41505c;border-color:#cfd6dd}',
  '.fbq-grade{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
  '.fbq-dado{background:var(--bc-surface-2,#faf9f6);border:1px solid var(--bc-line-soft,#eceae3);border-radius:6px;padding:6px 8px;min-width:0}',
  '.fbq-dado span{display:block;font-size:10.5px;font-weight:700;color:var(--bc-text-3,#5f645f);text-transform:uppercase;letter-spacing:.04em}',
  '.fbq-dado b{display:block;font-size:13px;line-height:1.35;overflow-wrap:anywhere}',
  '.fbq-dado small{display:block;font-size:11.5px;color:var(--bc-text-3,#5f645f);overflow-wrap:anywhere}',
  '.fbq-dado.ok b{color:#0f6b43}.fbq-dado.alerta b{color:#8a5300}.fbq-dado.critico b{color:#9b1c1c}',
  '.fbq-modo{border-top:1px solid var(--bc-line-soft,#eceae3);padding-top:9px}',
  '.fbq-rot{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:700;margin-bottom:5px}',
  '.fbq-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--bc-line-2,#cfccc1);border-radius:8px;overflow:hidden}',
  '.fbq-seg button{border:0;border-right:1px solid var(--bc-line-2,#cfccc1);background:#fff;padding:8px 4px;margin:0;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:40px;color:var(--bc-text,#1c1f1d);border-radius:0}',
  '.fbq-seg button:last-child{border-right:0}',
  '.fbq-seg button:hover{background:var(--bc-surface-3,#f1efe9)}',
  '.fbq-seg button[aria-pressed="true"].m-ATIVO{background:#9b1c1c;color:#fff}.fbq-seg button[aria-pressed="true"].m-SIMULACAO{background:#1e4f7a;color:#fff}.fbq-seg button[aria-pressed="true"].m-DESLIGADO{background:#52606d;color:#fff}',
  '.fbq-seg button:focus-visible,.fbq-acoes button:focus-visible{outline:2px solid #111;outline-offset:2px}',
  '.fbq-modo p{margin:5px 0 0;font-size:12px;color:var(--bc-text-2,#4a4f4b);line-height:1.45}',
  '.fbq-indisp{opacity:.55;cursor:help}',
  '.fbq-mais{border-top:1px solid var(--bc-line-soft,#eceae3);padding-top:4px}',
  '.fbq-mais summary{cursor:pointer;font-size:12.5px;font-weight:700;padding:6px 0;color:var(--bc-text-2,#4a4f4b);min-height:32px}',
  '.fbq-legenda{font-size:12px;color:var(--bc-text-2,#4a4f4b);margin:0 0 10px;line-height:1.5}',
  // lista de verificação (Configuração > O que falta para funcionar)
  '.fbq-veredito{border-radius:8px;padding:12px 14px;margin:0 0 12px;font-size:14px;font-weight:700;border:1px solid}',
  '.fbq-veredito.ok{background:var(--bc-action-bg,#e8f2e5);border-color:var(--bc-action-line,#b9d3b3);color:#14501f}',
  '.fbq-veredito.alerta{background:var(--bc-warn-bg,#faf0d7);border-color:var(--bc-warn-line,#e6d3a2);color:#5c3d00}',
  '.fbq-veredito span{display:block;font-weight:400;font-size:12.5px;margin-top:3px}',
  '.fbq-itens{display:flex;flex-direction:column;gap:8px}',
  '.fbq-item{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:start;background:var(--bc-surface,#fff);border:1px solid var(--bc-line,#e2e0d8);border-radius:8px;padding:10px 12px}',
  '.fbq-ico{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;margin-top:1px}',
  '.fbq-ico.ok{background:#1d6b3f}.fbq-ico.falta{background:#a61b1b}.fbq-ico.aviso{background:#b45309}.fbq-ico.info{background:#52606d}',
  '.fbq-item h4{margin:0;font-size:14px;line-height:1.35}',
  '.fbq-item h4 small{font-weight:700;font-size:12px;margin-left:6px}',
  '.fbq-item p{margin:3px 0 0;font-size:12.5px;color:var(--bc-text-2,#4a4f4b);line-height:1.45}',
  '.fbq-item .fbq-acoes{margin-top:0;justify-content:flex-end}',
  // aparelhos e áreas
  '.fbq-ap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:10px;align-items:start;background:var(--bc-surface,#fff);border:1px solid var(--bc-line,#e2e0d8);border-radius:8px;padding:10px 12px;margin-bottom:8px}',
  '.fbq-ap.sugestao{border-color:var(--bc-action,#1f6b2a);background:var(--bc-action-bg,#e8f2e5)}',
  '.fbq-ap h4{margin:0;font-size:14px}.fbq-ap p{margin:3px 0 0;font-size:12.5px;color:var(--bc-text-2,#4a4f4b)}',
  '.fbq-ap .fbq-form{margin-top:0}',
  '.fbq-mapa{height:340px;border:1px solid var(--border,#d9e0e7);border-radius:8px;background:#eef2f5;margin:8px 0}',
  '.fbq-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 10px}',
  '@media (max-width:760px){.fbq-cartoes{grid-template-columns:minmax(0,1fr)}.fbq-linha span:first-child{flex-basis:42%}' +
    '.fbq-item{grid-template-columns:30px minmax(0,1fr)}.fbq-item .fbq-acoes{grid-column:1/-1;justify-content:flex-start}' +
    '.fbq-acoes>button{flex:1 1 calc(50% - 6px);min-height:44px}.fbq-seg button,.fbq-topo button,.frr-sub button{min-height:44px}' +
    '.fbq-ap{grid-template-columns:minmax(0,1fr)}.fbq-mapa{height:280px}}'
].join('\n');

function Frota_telaBloqueio_() {
  return { css: FROTA_BLQ_TELA_CSS, js: 'try{(' + FrotaBlq_telaNavegador_.toString() + ')();}catch(eBlq){console.error("tplFrota: bloqueio não carregou:", eBlq);}' };
}

function FrotaBlq_telaNavegador_() {
  var B = { dados: null, rt: null, rtErro: '', lista: [], lidoMs: 0, vista: '', interna: '', aberto: '', carregando: false, mapaAreas: null, camadaAreas: null, previa: null };
  var MODOS_TXT = {
    ATIVO: 'Ativo: a retirada libera e a devolução pede o bloqueio, enviado de verdade só com o carro conectado, parado e desligado.',
    SIMULACAO: 'Simulação: o SGO+ faz tudo e só registra o que teria feito. Nada vai para o carro.',
    DESLIGADO: 'Desligado: o SGO+ não faz nada com a partida deste carro.'
  };
  var MODOS_CURTO = { ATIVO: 'Ativo', SIMULACAO: 'Simulação', DESLIGADO: 'Desligado' };
  function esc(v) { return tplFrota_esc(v); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function marcado(id) { var e = el(id); return !!(e && e.checked); }
  function num(v, c) { return v === null || v === undefined || v === '' ? '—' : tplFrota_num_(v, c || 0); }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function infoHtml(t) { return '<div class="alert-box info" role="status">' + esc(t) + '</div>'; }
  function rotV(x) { return (x && (x.rotuloVeiculo || x.placa)) || ''; }
  function nomeV(x) { return (x && (x.apelido || x.placa)) || ''; }
  function passaBase(x) { return typeof tplFrota_passaBase_ === 'function' ? tplFrota_passaBase_(x) : true; }
  function seletorBase(id) { return typeof tplFrota_seletorBaseHtml_ === 'function' ? tplFrota_seletorBaseHtml_(id) : ''; }
  function ligarBase(id, f) { if (typeof tplFrota_ligarSeletorBase_ === 'function') tplFrota_ligarSeletorBase_(id, f); }
  function chipModo(m) { return '<span class="fbq-chip ' + (m === 'ATIVO' ? 'ativo' : m === 'DESLIGADO' ? 'desl' : 'sim') + '">' + esc(MODOS_CURTO[m] || 'Simulação') + '</span>'; }
  function chipTri(t) { return '<span class="fbq-chip ' + (t === 'SO_AVISA' ? 'alerta' : t === 'BLOQUEIO_ATIVO' ? 'ok' : 'desl') + '">' + esc(t === 'SO_AVISA' ? 'Só avisa' : t === 'BLOQUEIO_ATIVO' ? 'Bloqueio ativo' : 'Triagem sem dados') + '</span>'; }
  function rele(t) { return t === 'BLOQUEADO' ? 'bloqueada' : t === 'LIBERADO' ? 'liberada' : 'não informado'; }
  function linha(a, b) { return b ? '<div class="fbq-linha"><span>' + esc(a) + '</span><span>' + esc(b) + '</span></div>' : ''; }
  function ehDono() { try { return typeof ChavesTela_ehDono_ === 'function' && !!ChavesTela_ehDono_(); } catch (e) { return false; } }
  function conectado(v) { return !!(v && /^conectado agora/.test(String(v.sinal || ''))); }
  function temAparelho(x) { return !!(x.v || (x.r && x.r.deviceId)); }
  function btnIndisp(rotulo, porque, i, extra) { return '<button type="button" class="btn btn-sm fbq-indisp" aria-disabled="true" data-fbq="porque" data-i="' + i + '" data-msg="' + esc(porque) + '"' + (extra || '') + '>' + esc(rotulo) + '</button>'; }

  // ---------------- carga (painel do bloqueio e depois a lista do rastreador) ----------------
  function montarLista() {
    var d = B.dados || { veiculos: [] }, porId = {}, vistos = {};
    (d.veiculos || []).forEach(function (v, p) { v._p = p; porId[String(v.veiculoId)] = v; });
    var lista = ((B.rt && B.rt.veiculos) || []).map(function (r) { vistos[String(r.id)] = 1; return { id: String(r.id), r: r, v: porId[String(r.id)] || null }; });
    (d.veiculos || []).forEach(function (v) { if (!vistos[String(v.veiculoId)]) lista.push({ id: String(v.veiculoId), r: null, v: v }); });
    lista.sort(function (a, b) { var ta = temAparelho(a) ? 0 : 1, tb = temAparelho(b) ? 0 : 1; return ta - tb || nomeV(a.v || a.r).localeCompare(nomeV(b.v || b.r), 'pt-BR'); });
    lista.forEach(function (x, i) { x.idx = i; });
    B.lista = lista;
  }
  function carregar(msg) {
    if (B.carregando) return;
    B.carregando = true;
    var lendo = el('fbq_hora'); if (lendo) lendo.textContent = 'Lendo...';
    api('apiBloqueioPainel', {}).then(function (r) {
      B.dados = r;
      return api('apiListarRastreador').then(function (rt) { B.rt = rt; B.rtErro = ''; }).catch(function (e) { B.rt = null; B.rtErro = (e && e.message) || String(e); });
    }).then(function () {
      B.carregando = false; B.aberto = ''; B.lidoMs = Date.now();
      montarLista();
      desenhar();
      if (msg) { var m = el('fbq_msg'); if (m) m.innerHTML = msg; }
    }).catch(function (err) { B.carregando = false; var c = el('fbq_corpo'); if (c) c.innerHTML = erroHtml(err); });
  }
  function prepararVista(corpo, vista, interna, intro, comLer) {
    B.vista = vista; B.interna = interna || ''; B.aberto = ''; B.mapaAreas = null; B.camadaAreas = null; B.previa = null;
    corpo.innerHTML = '<div class="fbq-raiz">' + (intro ? '<div class="frr-faixa">' + intro + '</div>' : '') +
      '<div class="fbq-topo"><button type="button" class="btn" data-fbq="atualizar">Atualizar</button>' +
      (comLer ? '<button type="button" class="btn" data-fbq="lerAgora">Ler o rastreador agora</button>' : '') + '<span class="muted" id="fbq_hora"></span></div>' +
      '<div id="fbq_msg" aria-live="polite"></div><div id="fbq_corpo"><span class="muted">Carregando...</span></div></div>';
    corpo.querySelector('.fbq-raiz').onclick = clique;
    // dados lidos há menos de 1 minuto: desenha na hora (trocar de parte não relê o rastreador)
    if (B.dados && Date.now() - B.lidoMs < 60000) desenhar(); else carregar();
  }
  function desenhar() {
    var c = el('fbq_corpo');
    if (!c || !B.dados) return;
    var h = el('fbq_hora'); if (h) h.textContent = 'Lido às ' + String(B.dados.agora || '').slice(-5);
    if (B.vista === 'geral') desenharGeral(c);
    else if (B.vista === 'registro') desenharRegistro(c);
    else if (B.interna === 'aparelhos') desenharAparelhos(c);
    else if (B.interna === 'areas') desenharAreas(c);
    else desenharSituacao(c);
  }

  window.tplFrotaBlq_montar_ = function (corpo) {
    prepararVista(corpo, 'geral', '', '<strong>Como usar:</strong> cada cartão é um veículo, com tudo o que a gestão precisa ver e fazer nele. ' +
      'A retirada libera a partida e a devolução pede o bloqueio, que só sai com o carro conectado, parado e desligado (nunca andando). ' +
      'Para ativar ou desativar o bloqueio de um carro, toque em <b>Ativo</b>, <b>Simulação</b> ou <b>Desligado</b> no cartão e escreva o motivo. ' +
      'O que precisa da gestão aparece no topo. A tela não se atualiza sozinha: use "Atualizar".', true);
  };
  window.tplFrotaBlq_config_ = function (corpo, interna) {
    var intro = interna === 'aparelhos' ? '<strong>Aparelhos:</strong> o aparelho é o rastreador instalado no carro. Ligado ao veículo, ele faz o carro aparecer no mapa, guarda as rotas, confere o KM e permite o bloqueio da partida. Escolha o aparelho de cada veículo e toque em "Gravar". O nome do aparelho costuma ter a placa: o SGO+ sugere pela placa.'
      : interna === 'areas' ? '<strong>Áreas das bases:</strong> a área (centro e raio) diz ao SGO+ onde fica cada base. Devolução dentro da área pede o bloqueio sozinha; fora dela, ou sem área cadastrada, a gestão decide (Bloquear ou Não bloquear) na Visão geral e na Caixa de decisões.'
      : '<strong>O que falta para funcionar:</strong> cada linha é uma condição do rastreamento e do bloqueio da partida, com a situação de agora e o botão para resolver. As chaves de acesso nunca aparecem na tela: só "gravada" ou "faltando".';
    prepararVista(corpo, 'config', interna || 'situacao', intro, interna !== 'areas');
  };
  window.tplFrotaBlq_registro_ = function (corpo) {
    prepararVista(corpo, 'registro', '', '<strong>Registro do bloqueio:</strong> cada pedido, comando, simulação, confirmação e decisão, com quem, quando e a condição do carro. Nada pode ser apagado. "Conferir a integridade" mostra se alguma linha foi alterada; "Relatório de hoje" é o mesmo que vai por e-mail às 18h para a gestão da Frota e a Diretoria.', false);
  };

  // ---------------- VISÃO GERAL ----------------
  function faixaEstado() {
    var d = B.dados, cfg = d.config, rt = B.rt || {};
    var leitura = rt.ultimaRodada ? ' Última leitura: ' + rt.ultimaRodada + (rt.ultimaLeituraOk && rt.ultimaLeituraOk !== rt.ultimaRodada ? ' (a última que deu certo: ' + rt.ultimaLeituraOk + ')' : '') + '.' : '';
    var ver = '<button type="button" class="btn btn-sm" data-fbq="irConfig" data-int="situacao">Ver o que falta para funcionar</button>';
    var h;
    if (!cfg.rastreadorLigado) h = '<div class="fbq-estado critico"><div><strong>Rastreador desligado no SGO+.</strong> Nada é lido, o mapa fica vazio e nenhum comando sai. A retirada e a devolução funcionam normalmente.<br>' + ver + '</div></div>';
    else if (cfg.podeEnviar) h = '<div class="fbq-estado ok"><div><strong>Rastreamento e bloqueio da partida funcionando.</strong> Os carros em <b>Ativo</b> recebem bloquear e liberar de verdade; os em Simulação só registram.' + esc(leitura) + '</div></div>';
    else h = '<div class="fbq-estado alerta"><div><strong>Nenhum comando real sai agora</strong> (todos os carros trabalham em simulação): ' + esc((cfg.faltas || []).join('; ')) + '.' + esc(leitura) + '<br>' + ver + '</div></div>';
    var erro = B.rtErro || rt.dispositivosErro;
    if (erro) h += '<div class="fbq-estado alerta"><div><strong>Leitura do rastreador com problema:</strong> ' + esc(erro) + ' A tela mostra o que já estava guardado. Toque em "Ler o rastreador agora" em alguns minutos; se continuar, avise o responsável pelo sistema.</div></div>';
    return h;
  }

  function pendencias() {
    var d = B.dados, pend = [];
    d.veiculos.forEach(function (v, p) {
      if (v.pedidoSituacao === 'AGUARDANDO_GESTAO') pend.push(cartaoDecisao(v, p, 'fora'));
      if (v.esquecidaGestao) pend.push(cartaoDecisao(v, p, 'esq'));
      if (v.odoDivergencia) pend.push(cartaoDecisao(v, p, 'odo'));
    });
    d.passagens.forEach(function (ps, i) { pend.push(cartaoPassagem(ps, i)); });
    ((B.rt && B.rt.alertas) || []).forEach(function (a, i) { pend.push(cartaoAlerta(a, i)); });
    B.lista.forEach(function (x) {
      if (temAparelho(x) || !x.r || !x.r.sugestao) return;
      pend.push('<div class="frr-cartao media"><h4>Aparelho sugerido · ' + esc(rotV(x.r)) + '</h4><p>O aparelho "' + esc(x.r.sugestao.nome) + '" (ID ' + esc(x.r.sugestao.id) + ') tem a placa deste veículo no nome. Confira e grave para o carro aparecer no mapa e entrar no bloqueio.</p>' +
        '<div class="fbq-acoes"><button type="button" class="btn-primary btn-sm" data-fbq="aparelho" data-i="' + x.idx + '">Ligar o aparelho</button></div></div>');
    });
    return pend;
  }

  function desenharGeral(c) {
    var pend = pendencias();
    var vis = B.lista.filter(function (x) { return passaBase(x.v || x.r); });
    var h = faixaEstado() +
      '<h3 class="fbq-sec">Precisa da gestão (' + pend.length + ')</h3>' + (pend.length ? '<div class="frr-cartoes">' + pend.join('') + '</div>' : '<p class="muted">Nada esperando a gestão agora.</p>') +
      '<div class="fbq-cab"><h3 class="fbq-sec">Veículos (' + vis.length + ')</h3>' + seletorBase('fbq_base') + '</div>' +
      '<p class="fbq-legenda"><b>Partida</b>: o que o rastreador do carro informa agora (liberada ou bloqueada). <b>Bloqueio da partida</b>: Ativo manda o comando de verdade; Simulação só registra; Desligado não faz nada. Botão apagado: toque nele para saber por quê.</p>' +
      (vis.length ? '<div class="fbq-cartoes">' + vis.map(cartaoVeiculo).join('') + '</div>' : '<p class="muted">Nenhum veículo ativo nesta base. Escolha "Todas as bases" ou cadastre o veículo em Veículos e condutores.</p>');
    c.innerHTML = h;
    ligarBase('fbq_base', function () { desenhar(); });
  }

  function cartaoVeiculo(x) {
    var v = x.v, r = x.r || {}, i = x.idx, d = B.dados, base = v || r;
    var tem = temAparelho(x);
    var sub = [base.apelido ? base.placa : '', r.modeloLimpo || r.modelo || '', base.baseFrota ? 'Base ' + base.baseFrota : ''].filter(Boolean).join(' · ');
    var cab = '<div class="fbq-vcab"><div><h4>' + esc(nomeV(base)) + '</h4>' + (sub ? '<div class="fbq-vsub">' + esc(sub) + '</div>' : '') + '</div>';
    if (!tem) {
      var sug = r.sugestao ? 'Sugestão pela placa: ' + r.sugestao.nome + ' (ID ' + r.sugestao.id + ').' : '';
      return '<div class="fbq-v sem" id="fbq_v' + i + '">' + cab + '<span class="fbq-part ni">Sem rastreador</span></div>' +
        '<p style="margin:0;font-size:12.5px">Sem aparelho do rastreador: o carro não aparece no mapa, não tem rota nem KM conferido e não entra no bloqueio da partida. ' + esc(sug) + '</p>' +
        linha('Com quem está', r.situacao === 'EM_USO' ? (r.condutorNome || 'condutor não localizado') : 'ninguém (sem retirada)') +
        '<div class="fbq-acoes"><button type="button" class="' + (r.sugestao ? 'btn-primary' : 'btn') + ' btn-sm" data-fbq="aparelho" data-i="' + i + '">Ligar aparelho</button></div><div class="fbq-slot" id="fbq_f' + i + '"></div></div>';
    }
    var partida = v ? v.releReal : '';
    cab += '<span class="fbq-part ' + (partida === 'BLOQUEADO' ? 'blq' : partida === 'LIBERADO' ? 'lib' : 'ni') + '">Partida ' + esc(partida === 'BLOQUEADO' ? 'bloqueada' : partida === 'LIBERADO' ? 'liberada' : 'não informada') + '</span></div>';
    var on = conectado(v);
    var pos = r.posicao;
    var onde = pos ? (pos.estadoTexto || (pos.parado ? 'parado' : 'andando')) + (pos.local ? ', ' + pos.local : '') : (v && v.situacaoCarro) || 'sem posição lida';
    var resp = v ? v.responsavel : (r.situacao === 'EM_USO' ? r.condutorNome : '');
    var grade = '<div class="fbq-grade">' +
      '<div class="fbq-dado ' + (resp ? '' : 'ok') + '"><span>Com quem está</span><b>' + esc(resp || 'Ninguém (sem retirada)') + '</b>' + (v && v.desde ? '<small>desde ' + esc(v.desde) + '</small>' : '') + '</div>' +
      '<div class="fbq-dado ' + (v ? (on ? 'ok' : 'alerta') : '') + '"><span>Sinal</span><b>' + esc(v ? (on ? 'Conectado' : 'Sem conexão agora') : 'Sem leitura') + '</b><small>' + esc(v ? String(v.sinal || '').replace(/^conectado agora: /, '') : '') + '</small></div>' +
      '<div class="fbq-dado"><span>Onde está</span><b>' + esc(onde) + '</b><small>' + esc(pos && pos.quando ? 'posição de ' + pos.quando : (v ? 'última posição: ' + v.ultimaPosicao : '')) + '</small></div>' +
      '<div class="fbq-dado"><span>Aparelho</span><b>' + esc('ID ' + ((v && v.deviceId) || r.deviceId)) + '</b><small>' + esc(r.deviceNome || '') + '</small></div></div>';
    var extras = '';
    if (v) {
      extras = linha('Base agora', v.baseTexto) + linha('Último comando', v.ultimoComando || 'nenhum') + linha('Pendência', v.pedido) + linha('Emergência', v.emergencia) + linha('Retirada', v.esquecida) +
        (v.modoEfetivo === 'SIMULACAO' ? linha('Partida simulada', rele(v.releSimulado)) : '') +
        linha('Odômetro do rastreador', v.odometroAtual !== null ? num(v.odometroAtual) + ' km' : '') + linha('Último acerto', v.odoAcerto);
    }
    var atencao = v && (v.emergencia || v.pedidoSituacao === 'AGUARDANDO_GESTAO' || v.esquecidaGestao || v.odoDivergencia || !on);
    // modo do bloqueio (ativar / simulação / desligar)
    var modo = '';
    if (v) {
      modo = '<div class="fbq-modo"><div class="fbq-rot"><span>Bloqueio da partida neste carro</span><span>' + (v.modo !== v.modoEfetivo ? '<span class="fbq-chip alerta">Ativo aguardando liberação</span>' : '') + (v.triagem === 'SO_AVISA' ? chipTri(v.triagem) : '') + '</span></div>' +
        '<div class="fbq-seg" role="group" aria-label="Modo do bloqueio do ' + esc(nomeV(base)) + '">' + ['ATIVO', 'SIMULACAO', 'DESLIGADO'].map(function (m) {
          return '<button type="button" class="m-' + m + '" aria-pressed="' + (v.modo === m ? 'true' : 'false') + '" data-fbq="modoEsc" data-modo="' + m + '" data-i="' + i + '">' + esc(MODOS_CURTO[m]) + '</button>';
        }).join('') + '</div><p>' + esc(MODOS_TXT[v.modo] || MODOS_TXT.SIMULACAO) + (v.modoAviso ? ' ' + esc(v.modoAviso) : '') + '</p></div>';
    } else {
      modo = '<p class="muted" style="margin:0;font-size:12px">O modo do bloqueio aparece depois da próxima leitura (toque em "Atualizar").</p>';
    }
    // ações do cartão
    var lib;
    if (!v) lib = btnIndisp('Liberar agora (emergência)', 'O painel do bloqueio ainda não tem este carro. Toque em "Atualizar"; se continuar, confira o aparelho em Configuração > Aparelhos.', i);
    else if (!d.podeLiberar) lib = btnIndisp('Liberar agora (emergência)', '"Liberar agora" é do Administrador, da Diretoria, do Gestor e do RH. Peça a uma dessas pessoas ou ligue para a central 24 h do rastreador.', i);
    else if (v.modoEfetivo === 'DESLIGADO') lib = btnIndisp('Liberar agora (emergência)', 'O bloqueio está Desligado neste carro: o SGO+ não manda comando. Se o carro não pega, ligue para a central 24 h do rastreador.', i);
    else lib = '<button type="button" class="btn-primary btn-sm" data-fbq="liberar" data-i="' + i + '">Liberar agora (emergência)</button>';
    var acoes = '<div class="fbq-acoes">' + lib +
      '<button type="button" class="btn btn-sm" data-fbq="mapa" data-i="' + i + '">Ver no mapa</button>' +
      '<button type="button" class="btn btn-sm" data-fbq="aparelho" data-i="' + i + '">Trocar aparelho</button></div>';
    var mais = '';
    if (v) {
      mais = '<details class="fbq-mais"><summary>Mais ações: triagem do sinal, odômetro, emergência e roubo</summary><div class="fbq-acoes">' +
        '<button type="button" class="btn btn-sm" data-fbq="triagem" data-i="' + i + '">Triagem do sinal</button>' +
        (d.podeOdometro ? '<button type="button" class="btn btn-sm" data-fbq="odo" data-i="' + i + '">Acertar o odômetro do rastreador</button>' : btnIndisp('Acertar o odômetro do rastreador', 'O acerto do odômetro é do Gestor e do Administrador. Peça a uma dessas pessoas.', i)) +
        (v.emergencia ? '<button type="button" class="btn btn-sm" data-fbq="fimEmerg" data-i="' + i + '">Encerrar emergência</button>' : btnIndisp('Encerrar emergência', 'Não há liberação de emergência valendo neste carro. Ela aparece quando alguém usa "Liberar agora".', i)) +
        (d.podeRoubo ? '<button type="button" class="btn btn-sm btn-danger" data-fbq="roubo" data-i="' + i + '">Bloqueio de roubo</button>' : btnIndisp('Bloqueio de roubo', 'O bloqueio de roubo é só da Diretoria. Em caso de roubo, ligue para a Diretoria e para a central 24 h do rastreador e registre o boletim de ocorrência.', i, ' style="color:#9b1c1c"')) +
        '</div></details>';
    }
    return '<div class="fbq-v' + (atencao ? ' atencao' : '') + '" id="fbq_v' + i + '">' + cab + grade + (extras ? '<div>' + extras + '</div>' : '') + modo + acoes + mais + '<div class="fbq-slot" id="fbq_f' + i + '"></div></div>';
  }

  function cartaoDecisao(v, p, tipo) {
    var t = tipo === 'fora' ? 'Devolvido fora da base: bloquear?' : tipo === 'esq' ? 'Retirada esquecida' : 'Odômetro diferente do painel';
    var txt = tipo === 'fora' ? v.pedido : tipo === 'esq' ? v.esquecida + '. Responsável: ' + v.responsavel + '.' :
      'Painel na devolução: ' + num(v.odoDivergencia.painel) + ' km; rastreador: ' + num(v.odoDivergencia.rastreador) + ' km (' + v.odoDivergencia.em + ').';
    var fd = 'fbq_d' + tipo + p;
    var bt = tipo === 'fora' ? '<button type="button" class="btn btn-sm" data-fbq="foraSim" data-p="' + p + '">Bloquear</button><button type="button" class="btn btn-sm" data-fbq="foraNao" data-p="' + p + '">Não bloquear</button>'
      : tipo === 'esq' ? '<button type="button" class="btn btn-sm" data-fbq="esqEncerrar" data-p="' + p + '">Encerrar a retirada</button>'
      : (B.dados.podeOdometro ? '<button type="button" class="btn btn-sm" data-fbq="odo" data-p="' + p + '" data-f="' + fd + '">Acertar o odômetro do rastreador</button>' : '<span class="muted">O Gestor ou o Administrador acerta.</span>');
    return '<div class="frr-cartao alta"><h4>' + esc(t) + ' · ' + esc(rotV(v)) + '</h4><p>' + esc(txt) + '</p>' +
      (tipo === 'odo' && v.odoDivergencia.foto ? '<p><a href="' + esc(v.odoDivergencia.foto) + '" target="_blank" rel="noopener">Ver a foto do painel</a></p>' : '') +
      '<div class="fbq-acoes">' + bt + '</div><div class="fbq-slot" id="' + fd + '"></div></div>';
  }

  function cartaoPassagem(ps, i) {
    return '<div class="frr-cartao media"><h4>Passar o carro · ' + esc(rotV(ps)) + '</h4><p>' + esc(ps.situacao === 'AGUARDANDO_ATUAL' ? ps.para + ' pediu para assumir o carro de ' + ps.de + '.' : ps.de + ' quer passar o carro para ' + ps.para + ' (falta quem recebe confirmar).') +
      ' Pedido em ' + esc(ps.pedidoEm) + '.</p><div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="passAut" data-s="' + i + '">Autorizar</button><button type="button" class="btn btn-sm" data-fbq="passRec" data-s="' + i + '">Recusar</button></div><div class="fbq-slot" id="fbq_p' + i + '"></div></div>';
  }

  function cartaoAlerta(a, i) {
    if (a.tipo !== 'USO_SEM_REGISTRO') {
      return '<div class="frr-cartao media"><h4>Sem comunicação com o rastreador</h4><p>' + esc(a.detalhe) + '</p><p class="muted">Não precisa fazer nada na tela. Se continuar por mais de 1 hora, avise o responsável pelo sistema (Chaves e senhas > Rastreador da frota > Testar conexão).</p></div>';
    }
    return '<div class="frr-cartao alta"><h4>Uso sem registro · ' + esc(rotV(a)) + '</h4><p>' + esc(a.detalhe) + (a.ocorrencias > 1 ? ' Visto em ' + num(a.ocorrencias) + ' leituras.' : '') +
      (a.link ? ' <a href="' + esc(a.link) + '" target="_blank" rel="noopener">Ver no mapa</a>' : '') + '</p>' +
      '<p class="muted">Descubra quem estava com o veículo. Se foi esquecimento, registre a retirada no lugar do condutor (Opções da gestão) e depois toque em "Conferido".</p>' +
      '<div class="fbq-acoes"><button type="button" class="btn-primary btn-sm" data-fbq="alertaConf" data-a="' + i + '">Conferido</button></div><div class="fbq-slot" id="fbq_a' + i + '"></div></div>';
  }

  // ---------------- CONFIGURAÇÃO > O QUE FALTA PARA FUNCIONAR ----------------
  function botaoChaves(rotulo) {
    return ehDono() ? '<button type="button" class="btn btn-sm" data-fbq="chaves">' + esc(rotulo || 'Abrir Chaves e senhas') + '</button>' : '';
  }
  function quemMuda() { return ehDono() ? '' : ' Quem muda é o responsável pelo sistema, em Chaves e senhas > Rastreador da frota.'; }
  function itemHtml(it) {
    var cls = it.tipo || (it.ok ? 'ok' : 'falta');
    var ico = cls === 'ok' ? 'fa-check' : cls === 'falta' ? 'fa-xmark' : cls === 'aviso' ? 'fa-exclamation' : 'fa-info';
    var rotEst = cls === 'ok' ? 'ok' : cls === 'falta' ? 'falta' : cls === 'aviso' ? 'atenção' : 'informação';
    return '<div class="fbq-item"><span class="fbq-ico ' + cls + '" role="img" aria-label="' + rotEst + '"><i class="fas ' + ico + '" aria-hidden="true"></i></span><div><h4>' + esc(it.titulo) +
      '<small style="color:' + (cls === 'ok' ? '#0f6b43' : cls === 'falta' ? '#9b1c1c' : cls === 'aviso' ? '#8a5300' : '#41505c') + '">' + esc(it.estado) + '</small></h4><p>' + it.texto + '</p></div>' +
      '<div class="fbq-acoes">' + (it.acao || '') + '</div></div>';
  }
  function desenharSituacao(c) {
    var d = B.dados, cfg = d.config, rt = B.rt || {};
    var semAp = B.lista.filter(function (x) { return !temAparelho(x); });
    var bases = d.bases || [], semArea = bases.filter(function (b) { return !(d.areas || {})[b]; });
    var cont = { ATIVO: 0, SIMULACAO: 0, DESLIGADO: 0 };
    d.veiculos.forEach(function (v) { cont[v.modo] = (cont[v.modo] || 0) + 1; });
    var erroLeitura = B.rtErro || rt.dispositivosErro;
    var itens = [
      { ok: !!cfg.rastreadorLigado, titulo: 'Rastreador ligado no SGO+', estado: cfg.rastreadorLigado ? 'Ligado' : 'Desligado',
        texto: esc(cfg.rastreadorLigado ? 'O SGO+ lê o rastreador a cada 2 minutos: mapa, rotas, KM conferido e alerta de uso sem registro.' : 'Nada é lido: o mapa fica vazio e nenhum comando sai. A retirada e a devolução funcionam normalmente.') + esc(quemMuda()),
        acao: botaoChaves(cfg.rastreadorLigado ? 'Desligar em Chaves e senhas' : 'Ligar em Chaves e senhas') },
      { ok: !!rt.configurado, titulo: 'Chave de acesso de leitura', estado: rt.configurado ? 'Gravada' : (B.rt ? 'Faltando' : 'Sem informação'),
        texto: esc('Permite ler as posições e a lista de aparelhos. O valor da chave nunca aparece na tela.') + esc(quemMuda()), acao: rt.configurado ? '' : botaoChaves('Gravar em Chaves e senhas') },
      { ok: !erroLeitura && !!rt.ultimaLeituraOk, tipo: !cfg.rastreadorLigado ? 'info' : '', titulo: 'Leitura do rastreador', estado: erroLeitura ? 'Com problema' : (rt.ultimaLeituraOk ? 'Funcionando' : 'Sem leitura ainda'),
        texto: esc(erroLeitura ? erroLeitura : (rt.ultimaLeituraOk ? 'Última leitura certa: ' + rt.ultimaLeituraOk + '. A rotina lê sozinha a cada 2 minutos.' : 'A primeira leitura acontece na próxima rodada (a cada 2 minutos) ou em "Ler o rastreador agora".')),
        acao: cfg.rastreadorLigado ? '<button type="button" class="btn btn-sm" data-fbq="lerAgora">Ler o rastreador agora</button>' : '' },
      { ok: !!cfg.chaveComandos, titulo: 'Chave de acesso dos comandos', estado: cfg.chaveComandos ? 'Gravada' : 'Faltando',
        texto: esc('Necessária para bloquear e liberar a partida e para acertar o odômetro. O valor da chave nunca aparece na tela.' + (cfg.chaveComandos ? '' : ' Sem ela, todos os carros trabalham em simulação.')) + esc(quemMuda()), acao: cfg.chaveComandos ? '' : botaoChaves('Gravar em Chaves e senhas') },
      { ok: !!cfg.bloqueioLigado, titulo: 'Bloqueio da partida pelo SGO+ (chave geral)', estado: cfg.bloqueioLigado ? 'Ligado' : 'Desligado',
        texto: esc(cfg.bloqueioLigado ? 'Os carros em Ativo recebem os comandos de verdade. Desligar aqui põe todos os carros em simulação de uma vez (o modo de cada carro fica guardado).' : 'Desligado: todos os carros trabalham em simulação, mesmo os que estão em Ativo.') + esc(quemMuda()),
        acao: botaoChaves(cfg.bloqueioLigado ? 'Desligar em Chaves e senhas' : 'Ligar em Chaves e senhas') },
      { ok: !semAp.length && B.lista.length > 0, tipo: semAp.length ? 'aviso' : '', titulo: 'Aparelhos ligados aos veículos', estado: (B.lista.length - semAp.length) + ' de ' + B.lista.length + ' veículos',
        texto: esc(semAp.length ? 'Sem aparelho: ' + semAp.map(function (x) { return rotV(x.r || x.v); }).join(', ') + '. Esses carros não aparecem no mapa e não entram no bloqueio. Se o carro não tem rastreador, está certo deixar sem aparelho.' : 'Todos os veículos ativos estão ligados ao aparelho do rastreador.'),
        acao: '<button type="button" class="btn btn-sm" data-fbq="irConfig" data-int="aparelhos">' + (semAp.length ? 'Ligar aparelhos' : 'Ver aparelhos') + '</button>' },
      { ok: !semArea.length, tipo: semArea.length ? 'aviso' : '', titulo: 'Áreas das bases', estado: (bases.length - semArea.length) + ' de ' + bases.length + ' bases',
        texto: esc(semArea.length ? 'Sem área: ' + semArea.join(', ') + '. Toda devolução dessas bases vai para a decisão da gestão (o SGO+ não bloqueia sozinho fora da base).' : 'Todas as bases têm centro e raio: devolução dentro da área pede o bloqueio sozinha.'),
        acao: '<button type="button" class="btn btn-sm" data-fbq="irConfig" data-int="areas">' + (semArea.length ? 'Cadastrar área' : 'Ver áreas') + '</button>' },
      { tipo: 'info', titulo: 'Modo do bloqueio de cada carro', estado: 'Ativo ' + cont.ATIVO + ' · Simulação ' + cont.SIMULACAO + ' · Desligado ' + cont.DESLIGADO,
        texto: esc('Muda no cartão de cada carro, na Visão geral (Ativo, Simulação ou Desligado, com o motivo). O motivo fica no registro.'),
        acao: '<button type="button" class="btn btn-sm" data-fbq="irGeral">Abrir a Visão geral</button>' },
      { tipo: 'info', titulo: 'Regras de alerta', estado: '', texto: esc('Limite de velocidade, expediente da frota, desvio de consumo aceito e prazo de guarda das rotas.'),
        acao: '<button type="button" class="btn btn-sm" data-fbq="irConfig" data-int="regras">Abrir as regras</button>' }
    ];
    if (d.kmNoturno) {
      var kn = d.kmNoturno;
      itens.push({ tipo: kn.ligado ? 'ok' : 'info', titulo: 'Conferência noturna do KM · ' + kn.horario, estado: kn.ligado ? 'Ligada' : 'Desligada',
        texto: esc(kn.ligado ? 'Ajusta o odômetro do rastreador somente com foto confirmada, veículo devolvido, parado e desligado, sem uso posterior à foto.' : 'Desligada.') +
          (kn.dia ? '<br>Última rodada: ' + esc(kn.dia) + kn.resultados.map(function (x) { return '<br><b>' + esc(x.placa) + ' · ' + esc(x.situacao) + '</b>: ' + esc(x.motivo); }).join('') : '<br>Primeira conferência programada para depois das 22h.') + esc(quemMuda()),
        acao: botaoChaves(kn.ligado ? 'Desligar em Chaves e senhas' : 'Ligar em Chaves e senhas') });
    }
    var faltam = itens.slice(0, 5).filter(function (it) { return !it.ok && it.tipo !== 'info'; }).length;
    c.innerHTML = (cfg.podeEnviar && !faltam
      ? '<div class="fbq-veredito ok">Tudo pronto: o rastreamento e o bloqueio da partida estão funcionando.<span>Os carros em Ativo recebem os comandos de verdade. Para ativar ou desativar o bloqueio de um carro, use o cartão dele na Visão geral.</span></div>'
      : '<div class="fbq-veredito alerta">' + (cfg.podeEnviar ? 'O bloqueio funciona, mas há itens para conferir.' : 'Nenhum comando real sai agora: os carros trabalham em simulação.') +
        '<span>' + esc(cfg.podeEnviar ? 'Veja as linhas em vermelho ou laranja abaixo.' : 'Por quê: ' + (cfg.faltas || []).join('; ') + '.') + '</span></div>') +
      '<div class="fbq-itens">' + itens.map(itemHtml).join('') + '</div>';
  }

  // ---------------- CONFIGURAÇÃO > APARELHOS ----------------
  function campoAparelho(x, f) {
    var r = x.r || {}, devs = (B.rt && B.rt.dispositivos) || [];
    var atual = String((x.v && x.v.deviceId) || r.deviceId || '');
    if (!devs.length) return '<label for="' + f + 'dev">ID do aparelho no rastreador (vazio = sem aparelho)</label><input id="' + f + 'dev" inputmode="numeric" placeholder="Ex.: 1039" value="' + esc(atual) + '">';
    var opcoes = '<option value="">Sem aparelho (o veículo sai do rastreamento)</option>' + devs.map(function (dv) {
      var outro = dv.vinculadoA && dv.vinculadoA !== r.placa ? ' (já ligado ao ' + dv.vinculadoA + ')' : '';
      var sug = !atual && r.sugestao && r.sugestao.id === dv.id ? ' (sugerido pela placa)' : '';
      var sel = atual ? dv.id === atual : (r.sugestao && r.sugestao.id === dv.id);
      return '<option value="' + esc(dv.id) + '"' + (sel ? ' selected' : '') + (outro ? ' disabled' : '') + '>' + esc((dv.nome || 'sem nome') + ' — ID ' + dv.id + sug + outro) + '</option>';
    }).join('');
    if (atual && !devs.some(function (dv) { return dv.id === atual; })) opcoes += '<option value="' + esc(atual) + '" selected>ID ' + esc(atual) + ' (não está na lista do rastreador)</option>';
    return '<label for="' + f + 'dev">Aparelho do rastreador</label><select id="' + f + 'dev">' + opcoes + '</select>';
  }
  function formAparelho(x, f, comCancelar) {
    return '<p>' + esc(temAparelho(x) ? 'Trocar o aparelho: escolha o novo e toque em "Gravar". Para tirar o veículo do rastreamento, escolha "Sem aparelho". Trocar ou tirar o aparelho cancela os comandos pendentes do aparelho antigo.'
      : 'Escolha o aparelho instalado neste veículo e toque em "Gravar". O carro passa a aparecer no mapa, a ter rota e KM conferidos e a entrar no bloqueio da partida (carro novo no bloqueio começa em Simulação).') + '</p>' +
      campoAparelho(x, f) + (B.rt && B.rt.dispositivosErro ? '<p class="muted">' + esc(B.rt.dispositivosErro) + ' Você pode digitar o ID do aparelho.</p>' : '') +
      '<div class="fbq-acoes"><button type="button" class="btn-primary btn-sm" data-fbq="aparelhoOk" data-i="' + x.idx + '" data-f="' + f + '">Gravar</button>' +
      (comCancelar ? '<button type="button" class="btn btn-sm" data-fbq="fechar" data-f="' + f + '">Cancelar</button>' : '') + '</div>';
  }
  function desenharAparelhos(c) {
    var rt = B.rt || {}, cfg = B.dados.config;
    var livres = (rt.dispositivos || []).filter(function (dv) { return !dv.vinculadoA; });
    var h = (B.rtErro ? erroHtml(new Error(B.rtErro)) : '') + (rt.dispositivosErro ? '<div class="fbq-estado alerta"><div>' + esc(rt.dispositivosErro) + ' Você ainda pode digitar o ID do aparelho.</div></div>' : '') +
      (!cfg.rastreadorLigado ? '<div class="fbq-estado alerta"><div>Rastreador desligado no SGO+: o vínculo é gravado sem conferir o aparelho na plataforma do rastreador.</div></div>' : '');
    h += B.lista.map(function (x) {
      var r = x.r || {}, f = 'fbq_ap' + x.idx;
      var sug = !temAparelho(x) && r.sugestao;
      var marca = '';
      if (temAparelho(x) && cfg.chaveComandos && x.r) {
        marca = '<p>Anotação do teste no pátio: <b>' + esc(r.aceitaBloqueio === 'SIM' ? 'usa o bloqueio' + (r.comandosConferidosEm ? ' (marcado em ' + r.comandosConferidosEm + ')' : '') : r.aceitaBloqueio === 'NAO' ? 'só monitoramento' : 'não testado') + '</b>. ' +
          'É só uma anotação: quem decide se o carro bloqueia é o modo do bloqueio no cartão da Visão geral.</p>' +
          '<div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="usoMarcar" data-i="' + x.idx + '" data-aceita="' + (r.aceitaBloqueio === 'SIM' ? 'NAO' : 'SIM') + '">' + (r.aceitaBloqueio === 'SIM' ? 'Anotar: só monitoramento' : 'Anotar: usa o bloqueio') + '</button></div>';
      }
      return '<div class="fbq-ap' + (sug ? ' sugestao' : '') + '"><div><h4>' + esc(nomeV(x.v || r)) + '</h4><p>' + esc([(x.v || r).apelido ? (x.v || r).placa : '', r.modeloLimpo || r.modelo || '', (x.v || r).baseFrota ? 'Base ' + (x.v || r).baseFrota : ''].filter(Boolean).join(' · ')) + '</p>' +
        '<p>' + (temAparelho(x) ? 'Aparelho: <b>' + esc(r.deviceNome || ('ID ' + ((x.v && x.v.deviceId) || r.deviceId))) + '</b>' : (sug ? '<b>Sugestão: ' + esc(r.sugestao.nome) + ' (ID ' + esc(r.sugestao.id) + ').</b> Confira e toque em "Gravar".' : 'Sem aparelho do rastreador.')) + '</p>' + marca + '</div>' +
        '<div class="fbq-form" id="' + f + '">' + formAparelho(x, f, false) + '<div id="' + f + '_msg"></div></div></div>';
    }).join('');
    if (livres.length) h += '<h3 class="fbq-sec">Aparelhos do rastreador sem veículo (' + livres.length + ')</h3><p class="muted">' + esc(livres.map(function (dv) { return (dv.nome || 'sem nome') + ' (ID ' + dv.id + ')'; }).join('; ')) + '</p>';
    c.innerHTML = h || '<p class="muted">Nenhum veículo ativo. Cadastre em Veículos e condutores.</p>';
  }

  // ---------------- CONFIGURAÇÃO > ÁREAS DAS BASES ----------------
  function coord(n) { return String(n).replace('.', ','); }
  function desenharAreas(c) {
    var d = B.dados, nomes = d.bases || [], areas = d.areas || {};
    var linhas = nomes.map(function (b) {
      var a = areas[b];
      return '<tr><td data-rot="Base"><b>' + esc(b) + '</b></td><td data-rot="Situação">' + (a ? '<span class="fbq-chip ok">Cadastrada</span>' : '<span class="fbq-chip alerta">Sem área</span>') + '</td><td data-rot="Centro">' + (a ? esc(coord(a.lat) + '; ' + coord(a.lon)) : '—') + '</td><td data-rot="Raio" class="num">' + (a ? num(a.raioM) + ' m' : '—') + '</td>' +
        '<td data-rot=""><div class="fbq-acoes" style="margin-top:0"><button type="button" class="btn btn-sm" data-fbq="areaEditar" data-base="' + esc(b) + '">' + (a ? 'Editar' : 'Cadastrar') + '</button>' +
        (a ? '<button type="button" class="btn btn-sm" data-fbq="areaRemover" data-base="' + esc(b) + '">Remover</button>' : '') + '</div></td></tr>';
    }).join('');
    c.innerHTML = '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Base</th><th>Situação</th><th>Centro (latitude; longitude)</th><th class="num">Raio</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<h3 class="fbq-sec" id="fbq_aTit">Cadastrar ou editar a área</h3><div class="fbq-form" id="fbq_aForm">' +
      '<p>1. Escolha a base. 2. Marque o centro: toque no mapa, use a posição de um carro estacionado na base ou digite a latitude e a longitude. 3. Confira o raio (padrão de ' + esc(num(d.raioPadrao)) + ' m, de 50 a 3.000 m) e toque em "Gravar a área". A mudança fica no registro do bloqueio.</p>' +
      '<div class="fbq-grid2"><div><label for="fbq_aBase">Base</label><select id="fbq_aBase">' + nomes.map(function (b) { return '<option>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="fbq_aVeic">Usar a posição atual de um carro (opcional)</label><select id="fbq_aVeic"><option value="">Não: marcar no mapa ou digitar</option>' +
      d.veiculos.map(function (v) { return '<option value="' + esc(v.veiculoId) + '">' + esc(rotV(v)) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="fbq_aLat">Latitude</label><input id="fbq_aLat" inputmode="decimal" placeholder="Ex.: -16,6869"></div><div><label for="fbq_aLon">Longitude</label><input id="fbq_aLon" inputmode="decimal" placeholder="Ex.: -49,2648"></div>' +
      '<div><label for="fbq_aRaio">Raio (metros)</label><input id="fbq_aRaio" inputmode="numeric" value="' + esc(d.raioPadrao) + '"></div></div>' +
      '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="areaGravar">Gravar a área</button></div><div id="fbq_aMsg"></div></div>' +
      '<h3 class="fbq-sec">Mapa das áreas</h3><p class="muted" style="font-size:12.5px">Os círculos verdes são as áreas gravadas. Toque no mapa para marcar o centro da área que está editando (o círculo tracejado é a prévia).</p>' +
      '<div id="fbq_aMapa" class="fbq-mapa" role="region" aria-label="Mapa das áreas das bases"><p class="muted" style="padding:14px">Carregando o mapa...</p></div>';
    ['fbq_aLat', 'fbq_aLon', 'fbq_aRaio'].forEach(function (id) { var e = el(id); if (e) e.oninput = desenharPrevia; });
    var vs = el('fbq_aVeic'); if (vs) vs.onchange = function () { if (vs.value) { el('fbq_aLat').value = ''; el('fbq_aLon').value = ''; desenharPrevia(); } };
    mapaAreas();
  }
  function mapaAreas() {
    if (typeof window.tplFrotaR_mapaBase_ !== 'function') return;
    window.tplFrotaR_mapaBase_().then(function (m) {
      var box = el('fbq_aMapa'); if (!box) return;
      box.innerHTML = '';
      var L = m.L, d = B.dados, areas = d.areas || {}, lim = [];
      var mapa = L.map(box).setView(m.centro, 11);
      m.camada.addTo(mapa);
      Object.keys(areas).forEach(function (b) {
        var a = areas[b];
        L.circle([a.lat, a.lon], { radius: a.raioM, color: '#1d6b3f', weight: 2, fillOpacity: 0.15 }).addTo(mapa).bindTooltip(esc(b) + ' (' + num(a.raioM) + ' m)', { permanent: true, direction: 'top', className: 'frr-tt' });
        lim.push([a.lat, a.lon]);
      });
      if (lim.length === 1) mapa.setView(lim[0], 15); else if (lim.length > 1) mapa.fitBounds(lim, { padding: [40, 40], maxZoom: 15 });
      mapa.on('click', function (ev) {
        el('fbq_aLat').value = coord(Math.round(ev.latlng.lat * 1e6) / 1e6);
        el('fbq_aLon').value = coord(Math.round(ev.latlng.lng * 1e6) / 1e6);
        el('fbq_aVeic').value = '';
        desenharPrevia();
      });
      B.mapaAreas = mapa; B.camadaAreas = L;
      setTimeout(function () { mapa.invalidateSize(); }, 60);
    }).catch(function () { var box = el('fbq_aMapa'); if (box) box.innerHTML = '<p class="muted" style="padding:14px">O mapa de fundo não carregou (internet ou bloqueio da rede). Use a posição de um carro ou digite a latitude e a longitude.</p>'; });
  }
  function desenharPrevia() {
    var mapa = B.mapaAreas, L = B.camadaAreas;
    if (!mapa || !L) return;
    if (B.previa) { mapa.removeLayer(B.previa); B.previa = null; }
    var lat = Number(val('fbq_aLat').replace(',', '.')), lon = Number(val('fbq_aLon').replace(',', '.')), raio = Number(val('fbq_aRaio')) || B.dados.raioPadrao;
    if (!val('fbq_aLat') || !val('fbq_aLon') || !isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    B.previa = L.circle([lat, lon], { radius: raio, color: '#1f5fa8', weight: 2, dashArray: '6 6', fillOpacity: 0.1 }).addTo(mapa);
    mapa.setView([lat, lon], Math.max(mapa.getZoom(), 15));
  }

  // ---------------- REGISTRO DO BLOQUEIO ----------------
  var RT_ACAO = { LIBERAR: 'Liberar partida', BLOQUEAR: 'Bloquear partida' };
  var RT_ORIGEM = { RETIRADA: 'na retirada', DEVOLUCAO: 'na devolução', GESTAO: 'pela gestão' };
  var RT_SITUACAO = { PENDENTE: 'Pendente', ENVIADO: 'Enviado', CANCELADO: 'Cancelado', FALHOU: 'Não enviado' };
  function htmlEventos(ev) {
    if (!ev.length) return '<p class="muted">Nada registrado ainda.</p>';
    return '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Quando</th><th>Carro</th><th>Modo</th><th>O quê</th><th>Quem</th><th>Detalhe</th></tr></thead><tbody>' + ev.map(function (e) {
      return '<tr><td data-rot="Quando">' + esc(e.quando) + '</td><td data-rot="Carro">' + esc(rotV(e)) + '</td><td data-rot="Modo">' + esc(e.modo === 'SIMULACAO' ? 'Simulação' : e.modo === 'ATIVO' ? 'Ativo' : e.modo) + '</td><td data-rot="O quê">' + esc((e.tipo + ' ' + e.acao).toLowerCase().replace(/_/g, ' ')) +
        (e.http ? ' (HTTP ' + esc(e.http) + ')' : '') + '</td><td data-rot="Quem">' + esc(e.quem) + '</td><td data-rot="Detalhe">' + esc(e.detalhe) + (e.condicao ? '<br><span class="muted">' + esc(e.condicao) + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function desenharRegistro(c) {
    var cmds = (B.rt && B.rt.comandos) || [];
    c.innerHTML = '<div class="fbq-acoes"><button type="button" class="btn" data-fbq="integridade">Conferir a integridade</button><button type="button" class="btn" data-fbq="relatorio">Relatório de hoje</button></div><div id="fbq_reg_msg"></div>' +
      '<h3 class="fbq-sec">Registro (inviolável), últimos ' + B.dados.eventos.length + '</h3>' + htmlEventos(B.dados.eventos) +
      '<details style="margin-top:14px"><summary>Comandos da versão anterior, até 21/10/2026 (' + cmds.length + ')</summary>' + (cmds.length ? cmds.map(function (cm) {
        var obs = [cm.motivo, cm.situacao !== 'PENDENTE' ? cm.encerramento : '', cm.justificativa ? 'Justificativa: ' + cm.justificativa : ''].filter(Boolean).join(' ');
        return '<div class="linha-lista"><span><strong>' + esc(rotV(cm)) + '</strong> — ' + esc(RT_ACAO[cm.acao] || cm.acao) + ' ' + esc(RT_ORIGEM[cm.origem] || '') + ' (' + esc(cm.pedidoPor) + ', ' + esc(cm.pedidoEm) + ') — <strong>' + esc(RT_SITUACAO[cm.situacao] || cm.situacao) + '</strong>' +
          (cm.enviadoEm ? ' em ' + esc(cm.enviadoEm) : '') + (obs ? '<br><span class="muted">' + esc(obs) + '</span>' : '') + '</span></div>';
      }).join('') : '<p class="muted">Nenhum comando registrado.</p>') + '</details>';
  }

  // ---------------- formulários (um por vez) ----------------
  function abrirForm(alvoId, html) {
    Array.prototype.forEach.call(document.querySelectorAll('.fbq-slot'), function (x) { if (x.id !== alvoId) x.innerHTML = ''; });
    var a = el(alvoId); if (!a) return;
    a.innerHTML = '<div class="fbq-form">' + html + '<div id="' + alvoId + '_msg"></div></div>';
    B.aberto = alvoId;
    var primeiro = a.querySelector('select,input,textarea'); if (primeiro) primeiro.focus();
    try { a.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  }
  function enviar(alvoId, fn, payload, botao, textoOk) {
    var m = el(alvoId + '_msg') || el(alvoId);
    if (botao) botao.disabled = true;
    if (m) m.innerHTML = infoHtml('Enviando...');
    return api(fn, payload).then(function (r) {
      if (r && r.precisaAceitarRisco) { if (m) m.innerHTML = '<div class="fbq-perigo">' + esc(r.texto) + '</div>'; if (botao) botao.disabled = false; return; }
      carregar(okHtml(textoOk ? textoOk(r) : ((r && r.texto) || 'Feito.')));
    }).catch(function (err) { if (m) m.innerHTML = erroHtml(err); if (botao) botao.disabled = false; });
  }
  function campoMotivo(id, rotulo, ex) { return '<label for="' + id + '">' + esc(rotulo) + '</label><textarea id="' + id + '" rows="2" placeholder="' + esc(ex) + '"></textarea>'; }
  function botaoOk(acao, rotulo, i, f, extra, classe) { return '<div class="fbq-acoes"><button type="button" class="' + (classe || 'btn-primary') + '" data-fbq="' + acao + '" data-i="' + i + '" data-f="' + f + '"' + (extra || '') + '>' + esc(rotulo) + '</button><button type="button" class="btn" data-fbq="fechar" data-f="' + f + '">Cancelar</button></div>'; }

  function clique(ev) {
    var b = ev.target.closest('[data-fbq]');
    if (!b) return;
    var acao = b.getAttribute('data-fbq'), d = B.dados || {};
    var i = Number(b.getAttribute('data-i')), x = B.lista[i] || null;
    var pAttr = b.getAttribute('data-p');
    var v = pAttr !== null ? d.veiculos[Number(pAttr)] : (x && x.v);
    var f = b.getAttribute('data-f') || (pAttr !== null ? '' : 'fbq_f' + i);
    if (acao === 'atualizar') { var mt = el('fbq_msg'); if (mt) mt.innerHTML = ''; carregar(); return; }
    if (acao === 'fechar') { var fx = el(b.getAttribute('data-f')); if (fx && !/^fbq_ap/.test(fx.id)) fx.innerHTML = ''; B.aberto = ''; return; }
    if (acao === 'porque') {
      if (!el('fbq_f' + i)) { var mp = el('fbq_msg'); if (mp) mp.innerHTML = infoHtml(b.getAttribute('data-msg')); return; }
      abrirForm('fbq_f' + i, '<p>' + esc(b.getAttribute('data-msg')) + '</p><div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="fechar" data-f="fbq_f' + i + '">Entendi</button></div>');
      return;
    }
    if (acao === 'irConfig') { if (typeof window.tplFrotaR_irPara_ === 'function') window.tplFrotaR_irPara_('config', b.getAttribute('data-int')); return; }
    if (acao === 'irGeral') { if (typeof window.tplFrotaR_irPara_ === 'function') window.tplFrotaR_irPara_('geral'); return; }
    if (acao === 'chaves') { if (typeof abrir === 'function') abrir('chaves'); return; }
    if (acao === 'lerAgora') {
      var ml = el('fbq_msg'); if (ml) ml.innerHTML = infoHtml('Lendo o rastreador. Aguarde.');
      b.disabled = true;
      api('apiRastreadorAtualizarAgora').then(function (r) { b.disabled = false; carregar(okHtml(r.texto)); }).catch(function (e) { b.disabled = false; if (ml) ml.innerHTML = erroHtml(e); });
      return;
    }
    if (acao === 'integridade') { var mi = el('fbq_reg_msg'); mi.innerHTML = infoHtml('Conferindo...'); api('apiBloqueioIntegridade').then(function (r) { mi.innerHTML = r.ok ? okHtml(r.texto) : erroHtml(new Error(r.texto)); }).catch(function (e) { mi.innerHTML = erroHtml(e); }); return; }
    if (acao === 'relatorio') { var mr = el('fbq_reg_msg'); mr.innerHTML = infoHtml('Montando...'); api('apiBloqueioRelatorio', {}).then(function (r) { mr.innerHTML = '<div class="fbq-pre">' + esc(r.texto) + '</div>'; }).catch(function (e) { mr.innerHTML = erroHtml(e); }); return; }
    if (acao === 'areaEditar') {
      var ba = b.getAttribute('data-base'), ar = (d.areas || {})[ba];
      el('fbq_aBase').value = ba; el('fbq_aVeic').value = '';
      el('fbq_aLat').value = ar ? coord(ar.lat) : ''; el('fbq_aLon').value = ar ? coord(ar.lon) : ''; el('fbq_aRaio').value = ar ? ar.raioM : d.raioPadrao;
      el('fbq_aTit').textContent = (ar ? 'Editar a área de ' : 'Cadastrar a área de ') + ba;
      el('fbq_aMsg').innerHTML = '';
      desenharPrevia();
      try { el('fbq_aTit').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      return;
    }
    if (acao === 'areaGravar' || acao === 'areaRemover') {
      var baseA = acao === 'areaRemover' ? b.getAttribute('data-base') : val('fbq_aBase');
      if (acao === 'areaRemover' && !confirm('Remover a área da base ' + baseA + '?\n\nSem a área, toda devolução dessa base vai para a decisão da gestão (o SGO+ não bloqueia sozinho).')) return;
      var mA = el('fbq_aMsg'); if (mA) mA.innerHTML = infoHtml('Gravando...');
      api('apiBloqueioAreaBase', { base: baseA, veiculoId: acao === 'areaRemover' ? '' : val('fbq_aVeic'), lat: val('fbq_aLat'), lon: val('fbq_aLon'), raioM: val('fbq_aRaio'), remover: acao === 'areaRemover' })
        .then(function (r) { carregar(okHtml(r.texto)); }).catch(function (e) { if (mA) mA.innerHTML = erroHtml(e); else { var mm = el('fbq_msg'); if (mm) mm.innerHTML = erroHtml(e); } });
      return;
    }
    if (acao === 'alertaConf' || acao === 'alertaOk') {
      var ai = Number(b.getAttribute('data-a')), al = ((B.rt && B.rt.alertas) || [])[ai], fa = 'fbq_a' + ai;
      if (!al) return;
      if (acao === 'alertaConf') {
        abrirForm(fa, campoMotivo(fa + 'j', 'O que foi conferido (mínimo de 10 caracteres)', 'Ex.: gestor levou o veículo à oficina; retirada registrada depois') +
          '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="alertaOk" data-a="' + ai + '">Gravar a conferência</button><button type="button" class="btn" data-fbq="fechar" data-f="' + fa + '">Cancelar</button></div>');
      } else {
        var obs = val(fa + 'j');
        if (obs.length < 10) { el(fa + '_msg').innerHTML = erroHtml(new Error('Escreva o que foi conferido, com pelo menos 10 caracteres (foram ' + obs.length + '). Nada foi gravado.')); return; }
        enviar(fa, 'apiRastreadorConferirAlerta', { alertaId: al.id, observacao: obs }, b, function () { return 'Alerta conferido: ' + rotV(al) + '.'; });
      }
      return;
    }
    if (acao === 'aparelho') {
      if (!x) return;
      var alvoAp = el('fbq_f' + i) ? 'fbq_f' + i : '';
      if (!alvoAp) { if (typeof window.tplFrotaR_irPara_ === 'function') window.tplFrotaR_irPara_('config', 'aparelhos'); return; }
      abrirForm(alvoAp, formAparelho(x, alvoAp, true));
      return;
    }
    if (acao === 'aparelhoOk') {
      if (!x) return;
      var r0 = x.r || {}, dev = val(f + 'dev'), atual = String((x.v && x.v.deviceId) || r0.deviceId || ''), rot = rotV(x.r || x.v);
      var mAp = el(f + '_msg') || el(f);
      // gravar de novo o mesmo aparelho é confirmação, não erro
      if (dev === atual) { if (mAp) mAp.innerHTML = okHtml(dev ? 'Vínculo já estava gravado: o veículo ' + rot + ' continua ligado ao aparelho ' + (r0.deviceNome || ('ID ' + dev)) + '.' : 'O veículo ' + rot + ' já estava sem aparelho. Para ligar, escolha o aparelho e toque em Gravar.'); return; }
      if (!dev && !confirm('Desligar o veículo ' + rot + ' do aparelho ' + (r0.deviceNome || atual) + '?\n\nO veículo deixa de ser acompanhado pelo rastreador no SGO+ e os comandos pendentes dele são cancelados.')) return;
      enviar(f, 'apiRastreadorVincular', { veiculoId: x.id, deviceId: dev }, b, function (res) {
        try { if (typeof tplFrota_carregarVeiculos_ === 'function') tplFrota_carregarVeiculos_(); } catch (e) {}
        return (res.semMudanca ? res.mensagem : 'Vínculo gravado: o veículo ' + rot + (res.deviceId ? ' está ligado ao aparelho ' + (res.deviceNome || res.deviceId) + '.' : ' ficou sem aparelho.')) + (res.aviso ? ' ' + res.aviso : '');
      });
      return;
    }
    if (acao === 'usoMarcar') {
      if (!x) return;
      var aceita = b.getAttribute('data-aceita'), rotU = rotV(x.r || x.v);
      if (!confirm(aceita === 'SIM' ? 'Anotar que o veículo ' + rotU + ' usa o bloqueio da partida (teste no pátio feito)?' : 'Anotar o veículo ' + rotU + ' como só monitoramento?\n\nÉ uma anotação: o modo do bloqueio no cartão da Visão geral continua valendo.')) return;
      enviar('fbq_ap' + i, 'apiRastreadorConferirComandos', { veiculoId: x.id, aceita: aceita }, b, function (res) { return 'Veículo ' + (res.rotuloVeiculo || res.placa) + ': ' + (res.aceitaBloqueio === 'SIM' ? 'anotado que usa o bloqueio da partida.' : 'anotado como só monitoramento.'); });
      return;
    }
    if (acao === 'mapa') {
      if (!x) return;
      if (typeof window.tplFrotaR_irPara_ === 'function') window.tplFrotaR_irPara_('mapa', 'vivo', { focar: x.id });
      return;
    }
    // ---- ações do bloqueio (as mesmas de antes; o servidor confere perfil, condição do carro e justificativa) ----
    if (!v && !/^pass/.test(acao)) return;
    if (acao === 'modoEsc') {
      var novo = b.getAttribute('data-modo');
      if (novo === v.modo) { abrirForm(f, '<p>Este carro já está em <b>' + esc(MODOS_CURTO[novo]) + '</b>. ' + esc(MODOS_TXT[novo]) + (v.modoPor ? ' Mudado por ' + esc(v.modoPor) + (v.modoMotivo ? ': ' + esc(v.modoMotivo) : '') + '.' : '') + '</p><div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="fechar" data-f="' + f + '">Entendi</button></div>'); return; }
      var avisoRele = (novo !== 'ATIVO' && v.releReal === 'BLOQUEADO') ? '<div class="fbq-perigo"><b>Atenção:</b> a partida deste carro está bloqueada agora no rastreador. Em ' + esc(MODOS_CURTO[novo]) + ' o SGO+ não manda mais a liberação na retirada. Se alguém vai usar o carro, libere antes com "Liberar agora" (com o carro ainda em Ativo) ou pela central 24 h do rastreador.</div>' : '';
      var avisoCfg = (novo === 'ATIVO' && !d.config.podeEnviar) ? '<div class="fbq-perigo">Hoje nenhum comando real sai (' + esc((d.config.faltas || []).join('; ')) + '). O carro fica em "Ativo aguardando liberação" e trabalha em simulação até isso ser resolvido.</div>' : '';
      abrirForm(f, '<p><b>Mudar para ' + esc(MODOS_CURTO[novo]) + '.</b> ' + esc(MODOS_TXT[novo]) + '</p>' + avisoRele + avisoCfg +
        campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: piloto aprovado pela diretoria até segunda-feira') + botaoOk('modoOk', 'Confirmar: ' + MODOS_CURTO[novo], i, f, ' data-modo="' + novo + '"'));
    } else if (acao === 'modoOk') enviar(f, 'apiBloqueioModo', { veiculoId: v.veiculoId, modo: b.getAttribute('data-modo'), motivo: val(f + 'j') }, b);
    else if (acao === 'triagem') {
      abrirForm(f, '<p>' + esc(v.triagemMotivo || 'Sem triagem calculada ainda.') + (v.triagemEm ? ' (calculada em ' + esc(v.triagemEm) + ')' : '') + ' Agora vale: ' + chipTri(v.triagem) + '</p>' +
        '<p class="muted">A triagem mede, nos locais onde o carro costuma ficar parado, a parte do tempo em que o aparelho estava conectado. "Só avisa" = o SGO+ nunca manda bloqueio para este carro (por exemplo, carro que dorme em garagem subterrânea).</p>' +
        (v.triagemLocais.length ? '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Local</th><th class="num">Horas parado</th><th class="num">Conectado</th><th class="num">Reconexão (média)</th></tr></thead><tbody>' + v.triagemLocais.map(function (l) {
          return '<tr><td data-rot="Local">' + esc(l.local) + (l.ruim ? ' <span class="fbq-chip alerta">conexão fraca</span>' : '') + '</td><td data-rot="Horas parado" class="num">' + num(l.horas, 1) + '</td><td data-rot="Conectado" class="num">' + esc(l.pctSinal) + '%</td><td data-rot="Reconexão (média)" class="num">' + (l.reconexoes ? esc(l.reconexaoMin) + ' min' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '') +
        '<label for="' + f + 't">Valer para este carro</label><select id="' + f + 't"><option value="">Automática (pelo histórico)</option><option value="BLOQUEIO_ATIVO"' + (v.triagemManual === 'BLOQUEIO_ATIVO' ? ' selected' : '') + '>Bloqueio ativo</option><option value="SO_AVISA"' + (v.triagemManual === 'SO_AVISA' ? ' selected' : '') + '>Só avisa (nunca envia bloqueio)</option></select>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório para gravar a escolha)', 'Ex.: carro dorme na garagem subterrânea do cliente') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="triOk" data-i="' + i + '" data-f="' + f + '">Gravar a escolha</button><button type="button" class="btn" data-fbq="triRefazer" data-i="' + i + '" data-f="' + f + '">Refazer a triagem agora</button><button type="button" class="btn" data-fbq="fechar" data-f="' + f + '">Cancelar</button></div>');
    } else if (acao === 'triOk') enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, triagemManual: val(f + 't'), motivo: val(f + 'j') }, b);
    else if (acao === 'triRefazer') enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, refazer: true }, b);
    else if (acao === 'liberar') {
      abrirForm(f, '<p><b>Liberar agora (emergência).</b> Libera a partida na hora. Vale 24 horas ou até a próxima devolução e fica no registro com o seu nome.' + (v.modoEfetivo === 'SIMULACAO' ? ' Este carro está em Simulação: nada vai para o carro, só fica registrado o que teria sido feito.' : '') + '</p>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: condutor sem sinal no celular, retirada confirmada por telefone') + botaoOk('liberarOk', 'Liberar agora', i, f));
    } else if (acao === 'liberarOk') enviar(f, 'apiBloqueioLiberarAgora', { veiculoId: v.veiculoId, motivo: val(f + 'j') }, b);
    else if (acao === 'fimEmerg') { if (confirm('Encerrar a liberação de emergência do ' + rotV(v) + '? Sem retirada aberta, o bloqueio é pedido (só sai com o carro parado, desligado e na base).')) enviar(f, 'apiBloqueioEncerrarEmergencia', { veiculoId: v.veiculoId }, b); }
    else if (acao === 'odo') {
      var sug = v.odoDivergencia ? v.odoDivergencia.painel : v.kmPainel;
      abrirForm(f, '<p>O rastreador conta os km pelo GPS. Acerte só depois de conferir o painel (foto). O SGO+ nunca acerta sozinho e não acerta com o carro andando.' + (v.odometroAtual !== null ? ' Hoje o rastreador marca ' + num(v.odometroAtual) + ' km.' : '') + '</p>' +
        '<label for="' + f + 'k">KM do painel</label><input id="' + f + 'k" inputmode="numeric" value="' + esc(sug || '') + '">' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'c"> Confirmo que conferi o painel e o odômetro do rastreador passa a ser este KM</label>' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'menor"> O valor menor que o atual está certo (só se for menor)</label>' + campoMotivo(f + 'j', 'Motivo (obrigatório se o valor for menor)', 'Ex.: aparelho trocado, painel conferido na revisão') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="odoOk" data-f="' + f + '"' + (pAttr !== null ? ' data-p="' + pAttr + '"' : ' data-i="' + i + '"') + '>Acertar o odômetro do rastreador</button><button type="button" class="btn" data-fbq="fechar" data-f="' + f + '">Cancelar</button></div>');
    } else if (acao === 'odoOk') enviar(f, 'apiBloqueioHodometro', { veiculoId: v.veiculoId, km: val(f + 'k'), confirmado: marcado(f + 'c'), confirmacaoMenor: marcado(f + 'menor'), motivo: val(f + 'j') }, b);
    else if (acao === 'roubo') {
      abrirForm(f, '<div class="fbq-perigo"><b>Bloqueio de roubo (só a Diretoria).</b> O comando corta a bomba de combustível. O SGO+ só envia com o carro conectado, parado e desligado; com o carro andando, só se você aceitar o risco. Avise também a central 24 h da iTracker.</div>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: carro levado do estacionamento do cliente; boletim em andamento') +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'c1"> Confirmo que é roubo ou furto</label>' +
        '<label for="' + f + 'c2">Digite BLOQUEAR ' + esc(v.placa) + '</label><input id="' + f + 'c2" autocomplete="off">' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'risco"> Aceito o risco de enviar com o carro andando (só se o SGO+ avisar)</label>' +
        botaoOk('rouboOk', 'Bloquear', i, f, '', 'btn btn-danger'));
    } else if (acao === 'rouboOk') enviar(f, 'apiBloqueioRoubo', { veiculoId: v.veiculoId, motivo: val(f + 'j'), confirmacao1: marcado(f + 'c1'), confirmacao2: val(f + 'c2'), aceitarRisco: marcado(f + 'risco') }, b);
    else if (acao === 'foraSim' || acao === 'foraNao') {
      var fd = 'fbq_dfora' + pAttr;
      abrirForm(fd, campoMotivo(fd + 'j', 'Justificativa (obrigatória)', acao === 'foraSim' ? 'Ex.: carro ficou no cliente, chave com o porteiro' : 'Ex.: equipe segue com o carro amanhã cedo') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="' + acao + 'Ok" data-p="' + pAttr + '">' + (acao === 'foraSim' ? 'Bloquear' : 'Não bloquear') + '</button><button type="button" class="btn" data-fbq="fechar" data-f="' + fd + '">Cancelar</button></div>');
    } else if (acao === 'foraSimOk' || acao === 'foraNaoOk') enviar('fbq_dfora' + pAttr, 'apiBloqueioDecidirForaBase', { veiculoId: v.veiculoId, decisao: acao === 'foraSimOk' ? 'BLOQUEAR' : 'NAO_BLOQUEAR', justificativa: val('fbq_dfora' + pAttr + 'j') }, b);
    else if (acao === 'esqEncerrar') {
      var fe = 'fbq_desq' + pAttr;
      abrirForm(fe, '<p>Só funciona com o carro parado, desligado, na base e com sinal. O KM de chegada vem do rastreador e fica para conferir no painel; depois o bloqueio é pedido. Se alguém precisa do carro agora, prefira autorizar "Passar o carro".</p>' +
        campoMotivo(fe + 'j', 'Justificativa (obrigatória)', 'Ex.: condutor esqueceu de devolver; carro na base desde a tarde') + '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="esqOk" data-p="' + pAttr + '">Encerrar a retirada</button><button type="button" class="btn" data-fbq="fechar" data-f="' + fe + '">Cancelar</button></div>');
    } else if (acao === 'esqOk') enviar('fbq_desq' + pAttr, 'apiBloqueioEncerrarEsquecida', { movimentacaoId: v.movimentacaoId, justificativa: val('fbq_desq' + pAttr + 'j') }, b);
    else if (acao === 'passAut' || acao === 'passRec') {
      var si = b.getAttribute('data-s'), ps = d.passagens[Number(si)], fp = 'fbq_p' + si;
      abrirForm(fp, (acao === 'passAut' && ps.situacao === 'AGUARDANDO_RECEBEDOR' && !ps.km ? '<label for="' + fp + 'k">KM do painel (se souber)</label><input id="' + fp + 'k" inputmode="numeric">' : '') +
        campoMotivo(fp + 'j', acao === 'passAut' ? 'Justificativa (obrigatória)' : 'Motivo (opcional)', 'Ex.: condutor sem sinal no celular, confirmado por telefone') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="' + acao + 'Ok" data-s="' + si + '">' + (acao === 'passAut' ? 'Autorizar a passagem' : 'Recusar') + '</button><button type="button" class="btn" data-fbq="fechar" data-f="' + fp + '">Cancelar</button></div>');
    } else if (acao === 'passAutOk' || acao === 'passRecOk') {
      var sj = b.getAttribute('data-s'), pp = d.passagens[Number(sj)], fq = 'fbq_p' + sj;
      enviar(fq, 'apiPassagemDecidir', { passagemId: pp.id, decisao: acao === 'passAutOk' ? 'AUTORIZAR' : 'RECUSAR', justificativa: val(fq + 'j'), motivo: val(fq + 'j'), km: val(fq + 'k') }, b);
    }
  }
}
