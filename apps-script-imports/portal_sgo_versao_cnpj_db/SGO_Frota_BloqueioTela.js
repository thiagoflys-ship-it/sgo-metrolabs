/****************************************************
 * FROTA — TELA DO BLOQUEIO DA PARTIDA (21/10/2026)
 *
 * Código do navegador (nunca executado no servidor): Frota_telaBloqueio_ devolve o CSS e o texto da função
 * FrotaBlq_telaNavegador_; Frota_obterTelaRastreamento junta com as outras telas. Parte "Bloqueio da partida"
 * da aba Rastreamento (só a gestão): estado de cada carro (responsável, relé, sinal, último comando, modo, pendências),
 * decisões pendentes, emergência, bloqueio de roubo (Diretoria), odômetro, áreas das bases, registro e relatório do dia.
 * Nada se atualiza sozinho com formulário aberto: a tela só relê depois de uma ação ou no botão "Atualizar".
 * Servidor: SGO_Frota_Bloqueio.js.
 ****************************************************/

var FROTA_BLQ_TELA_CSS = [
  '.fbq-topo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 10px}',
  '.fbq-chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;margin:0 4px 3px 0}',
  '.fbq-chip.ativo{background:#fde8e8;color:#9b1c1c}.fbq-chip.sim{background:#e8eefc;color:#1e3a8a}.fbq-chip.desl{background:#eceff1;color:#41505c}',
  '.fbq-chip.ok{background:#e3f5ec;color:#0f6b43}.fbq-chip.alerta{background:#fff1d6;color:#8a5300}',
  '.fbq-linha{display:flex;gap:8px;justify-content:space-between;border-bottom:1px solid var(--border,#eef1f4);padding:3px 0}',
  '.fbq-linha span:first-child{color:var(--muted,#52606d);flex:0 0 38%}',
  '.fbq-linha span:last-child{text-align:right;min-width:0;overflow-wrap:anywhere}',
  '.fbq-acoes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
  '.fbq-acoes button{min-height:36px}',
  '.fbq-form{background:var(--bc-surface-2,#f4f6f8);border-radius:8px;padding:10px;margin-top:8px}',
  '.fbq-form label{display:block;font-size:12px;font-weight:700;margin:6px 0 3px}',
  '.fbq-form input,.fbq-form select,.fbq-form textarea{width:100%;box-sizing:border-box;min-height:36px}',
  '.fbq-form .fbq-check{display:flex;gap:8px;align-items:flex-start;font-weight:600;margin:8px 0}',
  '.fbq-form .fbq-check input{width:auto;min-height:0;margin-top:3px}',
  '.fbq-perigo{border:1px solid #d64545;background:#fff5f5;border-radius:8px;padding:8px 10px;font-size:12.5px;margin:6px 0}',
  '.fbq-sec{margin:18px 0 8px;font-size:14.5px}',
  '.fbq-pre{white-space:pre-wrap;font-size:12.5px;background:var(--card,#fff);border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:10px;max-height:420px;overflow:auto}',
  '@media (max-width:760px){.fbq-linha span:first-child{flex-basis:45%}}'
].join('\n');

function Frota_telaBloqueio_() {
  return { css: FROTA_BLQ_TELA_CSS, js: 'try{(' + FrotaBlq_telaNavegador_.toString() + ')();}catch(eBlq){console.error("tplFrota: bloqueio não carregou:", eBlq);}' };
}

function FrotaBlq_telaNavegador_() {
  var B = { dados: null, aberto: '', carregando: false };
  function esc(v) { return tplFrota_esc(v); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function marcado(id) { var e = el(id); return !!(e && e.checked); }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function infoHtml(t) { return '<div class="alert-box info" role="status">' + esc(t) + '</div>'; }
  function rotV(x) { return (x && (x.rotuloVeiculo || x.placa)) || ''; }
  function chipModo(m) { return '<span class="fbq-chip ' + (m === 'ATIVO' ? 'ativo' : m === 'DESLIGADO' ? 'desl' : 'sim') + '">' + esc(m === 'ATIVO' ? 'Ativo' : m === 'DESLIGADO' ? 'Desligado' : 'Simulação') + '</span>'; }
  function chipTri(t) { return '<span class="fbq-chip ' + (t === 'SO_AVISA' ? 'alerta' : t === 'BLOQUEIO_ATIVO' ? 'ok' : 'desl') + '">' + esc(t === 'SO_AVISA' ? 'Só avisa' : t === 'BLOQUEIO_ATIVO' ? 'Bloqueio ativo' : 'Triagem sem dados') + '</span>'; }
  function rele(t) { return t === 'BLOQUEADO' ? 'bloqueada' : t === 'LIBERADO' ? 'liberada' : 'não informado'; }
  function linha(a, b) { return b ? '<div class="fbq-linha"><span>' + esc(a) + '</span><span>' + esc(b) + '</span></div>' : ''; }

  window.tplFrotaBlq_montar_ = function (corpo) {
    B.aberto = '';
    corpo.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> cada cartão é um carro com rastreador. A retirada libera a partida e a devolução pede o bloqueio, que só sai com o carro ' +
      'conectado, parado e desligado (nunca andando). <b>Ativo</b> manda o comando de verdade; <b>Simulação</b> só registra o que teria feito; <b>Desligado</b> não faz nada. ' +
      'Decisões pendentes aparecem no topo e na Caixa de decisões. A tela não se atualiza sozinha: use "Atualizar".</div>' +
      '<div class="fbq-topo"><button type="button" class="btn" id="fbq_atualizar">Atualizar</button><span class="muted" id="fbq_hora"></span></div>' +
      '<div id="fbq_msg" aria-live="polite"></div><div id="fbq_corpo"><span class="muted">Carregando...</span></div>';
    el('fbq_atualizar').onclick = function () { carregar(); };
    carregar();
  };

  function carregar(msg) {
    if (B.carregando) return;
    B.carregando = true;
    api('apiBloqueioPainel', {}).then(function (r) {
      B.carregando = false; B.dados = r; B.aberto = '';
      desenhar();
      if (msg) el('fbq_msg').innerHTML = msg;
    }).catch(function (err) { B.carregando = false; var c = el('fbq_corpo'); if (c) c.innerHTML = erroHtml(err); });
  }

  function desenhar() {
    var d = B.dados, c = el('fbq_corpo');
    if (!c || !d) return;
    el('fbq_hora').textContent = 'Lido às ' + d.agora.slice(-5);
    var cfg = d.config;
    var h = cfg.podeEnviar ? infoHtml('Comandos reais ligados: os carros em modo Ativo recebem bloquear e liberar de verdade.')
      : '<div class="frr-faixa alerta"><strong>Nenhum comando real sai agora</strong> (todos os carros trabalham em simulação): ' + esc(cfg.faltas.join('; ')) + '. O responsável pelo sistema liga em Chaves e senhas > Rastreador da frota.</div>';
    // decisões pendentes
    var pend = [];
    d.veiculos.forEach(function (v, i) {
      if (v.pedidoSituacao === 'AGUARDANDO_GESTAO') pend.push(cartaoDecisao(v, i, 'fora'));
      if (v.esquecidaGestao) pend.push(cartaoDecisao(v, i, 'esq'));
      if (v.odoDivergencia) pend.push(cartaoDecisao(v, i, 'odo'));
    });
    d.passagens.forEach(function (p, i) { pend.push(cartaoPassagem(p, i)); });
    h += '<h3 class="fbq-sec">Decisões pendentes (' + pend.length + ')</h3>' + (pend.length ? '<div class="frr-cartoes">' + pend.join('') + '</div>' : '<p class="muted">Nada esperando a gestão.</p>');
    h += '<h3 class="fbq-sec">Carros</h3>' + (d.veiculos.length ? '<div class="frr-cartoes">' + d.veiculos.map(cartaoVeiculo).join('') + '</div>' : '<p class="muted">Nenhum carro com aparelho do rastreador ligado (Rastreamento > Aparelhos e alertas).</p>');
    h += '<h3 class="fbq-sec">Áreas das bases</h3>' + htmlAreas(d);
    h += '<h3 class="fbq-sec">Registro (inviolável)</h3><div class="fbq-acoes"><button type="button" class="btn" data-fbq="integridade">Conferir a integridade</button><button type="button" class="btn" data-fbq="relatorio">Relatório de hoje</button></div><div id="fbq_reg_msg"></div>' + htmlEventos(d.eventos);
    c.innerHTML = h;
    c.onclick = clique;
  }

  function cartaoVeiculo(v, i) {
    return '<div class="frr-cartao" id="fbq_v' + i + '"><h4>' + esc(rotV(v)) + '</h4><div>' + chipModo(v.modoEfetivo) + (v.modo !== v.modoEfetivo ? '<span class="fbq-chip alerta">Ativo aguardando liberação</span>' : '') + chipTri(v.triagem) + '</div>' +
      linha('Responsável', v.responsavel ? v.responsavel + ' (desde ' + v.desde + ')' : 'ninguém (sem retirada)') +
      linha('Partida no carro', rele(v.releReal) + (v.releRealEm ? ' (lido ' + v.releRealEm.slice(-5) + ')' : '')) +
      (v.modoEfetivo === 'SIMULACAO' ? linha('Partida simulada', rele(v.releSimulado)) : '') +
      linha('Sinal', v.sinal) + linha('Situação', v.situacaoCarro) + linha('Base', v.baseTexto) +
      linha('Último comando', v.ultimoComando || 'nenhum') + linha('Pendência', v.pedido) + linha('Emergência', v.emergencia) + linha('Retirada', v.esquecida) +
      linha('Odômetro do rastreador', v.odometroAtual !== null ? tplFrota_num_(v.odometroAtual) + ' km' : '') + linha('Último acerto', v.odoAcerto) +
      (v.modoAviso ? '<p class="muted" style="font-size:12px">' + esc(v.modoAviso) + '</p>' : '') +
      '<div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="modo" data-i="' + i + '">Modo</button><button type="button" class="btn btn-sm" data-fbq="triagem" data-i="' + i + '">Triagem do sinal</button>' +
      (B.dados.podeLiberar ? '<button type="button" class="btn btn-sm" data-fbq="liberar" data-i="' + i + '">Liberar agora</button>' : '') +
      (v.emergencia ? '<button type="button" class="btn btn-sm" data-fbq="fimEmerg" data-i="' + i + '">Encerrar emergência</button>' : '') +
      (B.dados.podeOdometro ? '<button type="button" class="btn btn-sm" data-fbq="odo" data-i="' + i + '">Acertar o odômetro do rastreador</button>' : '') +
      (B.dados.podeRoubo ? '<button type="button" class="btn btn-sm btn-danger" data-fbq="roubo" data-i="' + i + '">Bloqueio de roubo</button>' : '') +
      '</div><div id="fbq_f' + i + '"></div></div>';
  }

  function cartaoDecisao(v, i, tipo) {
    var t = tipo === 'fora' ? 'Devolvido fora da base: bloquear?' : tipo === 'esq' ? 'Retirada esquecida' : 'Odômetro diferente do painel';
    var txt = tipo === 'fora' ? v.pedido : tipo === 'esq' ? v.esquecida + '. Responsável: ' + v.responsavel + '.' :
      'Painel na devolução: ' + tplFrota_num_(v.odoDivergencia.painel) + ' km; rastreador: ' + tplFrota_num_(v.odoDivergencia.rastreador) + ' km (' + v.odoDivergencia.em + ').';
    var bt = tipo === 'fora' ? '<button type="button" class="btn btn-sm" data-fbq="foraSim" data-i="' + i + '">Bloquear</button><button type="button" class="btn btn-sm" data-fbq="foraNao" data-i="' + i + '">Não bloquear</button>'
      : tipo === 'esq' ? '<button type="button" class="btn btn-sm" data-fbq="esqEncerrar" data-i="' + i + '">Encerrar a retirada</button>'
      : (B.dados.podeOdometro ? '<button type="button" class="btn btn-sm" data-fbq="odo" data-i="' + i + '">Acertar o odômetro do rastreador</button>' : '<span class="muted">Gestor ou Administrador acerta.</span>');
    return '<div class="frr-cartao alta"><h4>' + esc(t) + ' · ' + esc(rotV(v)) + '</h4><p>' + esc(txt) + '</p>' +
      (tipo === 'odo' && v.odoDivergencia.foto ? '<p><a href="' + esc(v.odoDivergencia.foto) + '" target="_blank" rel="noopener">Ver a foto do painel</a></p>' : '') +
      '<div class="fbq-acoes">' + bt + '</div><div id="fbq_d' + tipo + i + '"></div></div>';
  }

  function cartaoPassagem(p, i) {
    return '<div class="frr-cartao media"><h4>Passar o carro · ' + esc(rotV(p)) + '</h4><p>' + esc(p.situacao === 'AGUARDANDO_ATUAL' ? p.para + ' pediu para assumir o carro de ' + p.de + '.' : p.de + ' quer passar o carro para ' + p.para + ' (falta quem recebe confirmar).') +
      ' Pedido em ' + esc(p.pedidoEm) + '.</p><div class="fbq-acoes"><button type="button" class="btn btn-sm" data-fbq="passAut" data-i="' + i + '">Autorizar</button><button type="button" class="btn btn-sm" data-fbq="passRec" data-i="' + i + '">Recusar</button></div><div id="fbq_p' + i + '"></div></div>';
  }

  function htmlAreas(d) {
    var nomes = d.bases || [];
    var linhas = nomes.map(function (b) {
      var a = d.areas[b];
      return '<tr><td data-rot="Base">' + esc(b) + '</td><td data-rot="Centro">' + (a ? esc(String(a.lat).replace('.', ',') + '; ' + String(a.lon).replace('.', ',')) : '<span class="muted">não configurada</span>') + '</td><td data-rot="Raio" class="num">' + (a ? tplFrota_num_(a.raioM) + ' m' : '—') + '</td></tr>';
    }).join('');
    return '<p class="muted" style="font-size:12.5px">Sem a área da base, toda devolução vai para a decisão da gestão (o SGO+ não bloqueia sozinho fora da base).</p>' +
      '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Base</th><th>Centro (latitude; longitude)</th><th class="num">Raio</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="fbq-form"><label for="fbq_aBase">Base</label><select id="fbq_aBase">' + nomes.map(function (b) { return '<option>' + esc(b) + '</option>'; }).join('') + '</select>' +
      '<label for="fbq_aVeic">Usar a posição atual de um carro estacionado na base (opcional)</label><select id="fbq_aVeic"><option value="">Informar latitude e longitude</option>' +
      d.veiculos.map(function (v) { return '<option value="' + esc(v.veiculoId) + '">' + esc(rotV(v)) + '</option>'; }).join('') + '</select>' +
      '<label for="fbq_aLat">Latitude</label><input id="fbq_aLat" inputmode="decimal" placeholder="Ex.: -16,6869"><label for="fbq_aLon">Longitude</label><input id="fbq_aLon" inputmode="decimal" placeholder="Ex.: -49,2648">' +
      '<label for="fbq_aRaio">Raio (metros)</label><input id="fbq_aRaio" inputmode="numeric" value="' + esc(d.raioPadrao) + '">' +
      '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="areaGravar">Gravar a área</button><button type="button" class="btn" data-fbq="areaRemover">Remover a área desta base</button></div><div id="fbq_aMsg"></div></div>';
  }

  function htmlEventos(ev) {
    if (!ev.length) return '<p class="muted">Nada registrado ainda.</p>';
    return '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Quando</th><th>Carro</th><th>Modo</th><th>O quê</th><th>Quem</th><th>Detalhe</th></tr></thead><tbody>' + ev.map(function (e) {
      return '<tr><td data-rot="Quando">' + esc(e.quando) + '</td><td data-rot="Carro">' + esc(rotV(e)) + '</td><td data-rot="Modo">' + esc(e.modo === 'SIMULACAO' ? 'Simulação' : e.modo === 'ATIVO' ? 'Ativo' : e.modo) + '</td><td data-rot="O quê">' + esc((e.tipo + ' ' + e.acao).toLowerCase().replace(/_/g, ' ')) +
        (e.http ? ' (HTTP ' + esc(e.http) + ')' : '') + '</td><td data-rot="Quem">' + esc(e.quem) + '</td><td data-rot="Detalhe">' + esc(e.detalhe) + (e.condicao ? '<br><span class="muted">' + esc(e.condicao) + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  // ---------------- formulários (um por vez, dentro do cartão) ----------------
  function abrirForm(alvoId, html) {
    Array.prototype.forEach.call(document.querySelectorAll('[id^="fbq_f"],[id^="fbq_d"],[id^="fbq_p"]'), function (x) { if (x.id !== alvoId) x.innerHTML = ''; });
    var a = el(alvoId); if (!a) return;
    a.innerHTML = '<div class="fbq-form">' + html + '<div id="' + alvoId + '_msg"></div></div>';
    B.aberto = alvoId;
    var primeiro = a.querySelector('select,input,textarea'); if (primeiro) primeiro.focus();
  }
  function enviar(alvoId, fn, payload, botao) {
    var m = el(alvoId + '_msg') || el(alvoId);
    if (botao) botao.disabled = true;
    if (m) m.innerHTML = infoHtml('Enviando...');
    return api(fn, payload).then(function (r) {
      if (r && r.precisaAceitarRisco) { if (m) m.innerHTML = '<div class="fbq-perigo">' + esc(r.texto) + '</div>'; if (botao) botao.disabled = false; return; }
      carregar(okHtml((r && r.texto) || 'Feito.'));
    }).catch(function (err) { if (m) m.innerHTML = erroHtml(err); if (botao) botao.disabled = false; });
  }
  function campoMotivo(id, rotulo, ex) { return '<label for="' + id + '">' + esc(rotulo) + '</label><textarea id="' + id + '" rows="2" placeholder="' + esc(ex) + '"></textarea>'; }

  function clique(ev) {
    var b = ev.target.closest('[data-fbq]');
    if (!b) return;
    var acao = b.getAttribute('data-fbq'), i = Number(b.getAttribute('data-i'));
    var d = B.dados, v = d.veiculos[i];
    if (acao === 'integridade') { var mi = el('fbq_reg_msg'); mi.innerHTML = infoHtml('Conferindo...'); api('apiBloqueioIntegridade').then(function (r) { mi.innerHTML = r.ok ? okHtml(r.texto) : erroHtml(new Error(r.texto)); }).catch(function (e) { mi.innerHTML = erroHtml(e); }); return; }
    if (acao === 'relatorio') { var mr = el('fbq_reg_msg'); mr.innerHTML = infoHtml('Montando...'); api('apiBloqueioRelatorio', {}).then(function (r) { mr.innerHTML = '<div class="fbq-pre">' + esc(r.texto) + '</div>'; }).catch(function (e) { mr.innerHTML = erroHtml(e); }); return; }
    if (acao === 'areaGravar' || acao === 'areaRemover') {
      var mA = el('fbq_aMsg'); mA.innerHTML = infoHtml('Gravando...');
      api('apiBloqueioAreaBase', { base: val('fbq_aBase'), veiculoId: val('fbq_aVeic'), lat: val('fbq_aLat'), lon: val('fbq_aLon'), raioM: val('fbq_aRaio'), remover: acao === 'areaRemover' })
        .then(function (r) { carregar(okHtml(r.texto)); }).catch(function (e) { mA.innerHTML = erroHtml(e); });
      return;
    }
    var f = 'fbq_f' + i;
    if (acao === 'modo') {
      abrirForm(f, '<label for="' + f + 'm">Modo do bloqueio deste carro</label><select id="' + f + 'm">' + Object.keys(d.modos).map(function (k) { return '<option value="' + k + '"' + (k === v.modo ? ' selected' : '') + '>' + esc(d.modos[k]) + '</option>'; }).join('') + '</select>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: piloto aprovado pela diretoria até segunda-feira') + '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="modoOk" data-i="' + i + '">Gravar o modo</button></div>');
    } else if (acao === 'modoOk') enviar(f, 'apiBloqueioModo', { veiculoId: v.veiculoId, modo: val(f + 'm'), motivo: val(f + 'j') }, b);
    else if (acao === 'triagem') {
      abrirForm(f, '<p style="font-size:12.5px">' + esc(v.triagemMotivo || 'Sem triagem calculada ainda.') + (v.triagemEm ? ' (calculada em ' + esc(v.triagemEm) + ')' : '') + '</p>' +
        (v.triagemLocais.length ? '<div class="frr-rolar"><table class="frr-tabela"><thead><tr><th>Local</th><th class="num">Horas parado</th><th class="num">Com sinal</th><th class="num">Reconexão (90%)</th></tr></thead><tbody>' + v.triagemLocais.map(function (l) {
          return '<tr><td data-rot="Local">' + esc(l.local) + (l.ruim ? ' <span class="fbq-chip alerta">sinal fraco</span>' : '') + '</td><td data-rot="Horas parado" class="num">' + tplFrota_num_(l.horas, 1) + '</td><td data-rot="Com sinal" class="num">' + esc(l.pctSinal) + '%</td><td data-rot="Reconexão (90%)" class="num">' + esc(l.reconexaoP90Min) + ' min</td></tr>';
        }).join('') + '</tbody></table></div>' : '') +
        '<label for="' + f + 't">Valer para este carro</label><select id="' + f + 't"><option value="">Automática (pelo histórico)</option><option value="BLOQUEIO_ATIVO"' + (v.triagemManual === 'BLOQUEIO_ATIVO' ? ' selected' : '') + '>Bloqueio ativo</option><option value="SO_AVISA"' + (v.triagemManual === 'SO_AVISA' ? ' selected' : '') + '>Só avisa (nunca envia bloqueio)</option></select>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório para gravar a escolha)', 'Ex.: carro dorme na garagem subterrânea do cliente') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="triOk" data-i="' + i + '">Gravar a escolha</button><button type="button" class="btn" data-fbq="triRefazer" data-i="' + i + '">Refazer a triagem agora</button></div>');
    } else if (acao === 'triOk') enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, triagemManual: val(f + 't'), motivo: val(f + 'j') }, b);
    else if (acao === 'triRefazer') enviar(f, 'apiBloqueioTriagem', { veiculoId: v.veiculoId, refazer: true }, b);
    else if (acao === 'liberar') {
      abrirForm(f, '<p style="font-size:12.5px">Libera a partida agora (emergência). Vale 24 horas ou até a próxima devolução e fica no registro com o seu nome.</p>' + campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: condutor sem sinal no celular, retirada confirmada por telefone') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="liberarOk" data-i="' + i + '">Liberar agora</button></div>');
    } else if (acao === 'liberarOk') enviar(f, 'apiBloqueioLiberarAgora', { veiculoId: v.veiculoId, motivo: val(f + 'j') }, b);
    else if (acao === 'fimEmerg') { if (confirm('Encerrar a liberação de emergência do ' + rotV(v) + '? Sem retirada aberta, o bloqueio é pedido (só sai com o carro parado, desligado e na base).')) enviar(f, 'apiBloqueioEncerrarEmergencia', { veiculoId: v.veiculoId }, b); }
    else if (acao === 'odo') {
      var alvo = el(f) ? f : f;
      var sug = v.odoDivergencia ? v.odoDivergencia.painel : v.kmPainel;
      abrirForm(alvo, '<p style="font-size:12.5px">O rastreador conta os km pelo GPS. Acerte só depois de conferir o painel (foto). O SGO+ nunca acerta sozinho e não acerta com o carro andando.' + (v.odometroAtual !== null ? ' Hoje o rastreador marca ' + tplFrota_num_(v.odometroAtual) + ' km.' : '') + '</p>' +
        '<label for="' + f + 'k">KM do painel</label><input id="' + f + 'k" inputmode="numeric" value="' + esc(sug || '') + '">' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'c"> Confirmo que conferi o painel e o odômetro do rastreador passa a ser este KM</label>' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'menor"> O valor menor que o atual está certo (só se for menor)</label>' + campoMotivo(f + 'j', 'Motivo (obrigatório se o valor for menor)', 'Ex.: aparelho trocado, painel conferido na revisão') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="odoOk" data-i="' + i + '">Acertar o odômetro do rastreador</button></div>');
    } else if (acao === 'odoOk') enviar(f, 'apiBloqueioHodometro', { veiculoId: v.veiculoId, km: val(f + 'k'), confirmado: marcado(f + 'c'), confirmacaoMenor: marcado(f + 'menor'), motivo: val(f + 'j') }, b);
    else if (acao === 'roubo') {
      abrirForm(f, '<div class="fbq-perigo"><b>Bloqueio de roubo (só a Diretoria).</b> O comando corta a bomba de combustível. O SGO+ só envia com o carro conectado, parado e desligado; com o carro andando, só se você aceitar o risco. Avise também a central 24 h da iTracker.</div>' +
        campoMotivo(f + 'j', 'Motivo (obrigatório)', 'Ex.: carro levado do estacionamento do cliente; boletim em andamento') +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'c1"> Confirmo que é roubo ou furto</label>' +
        '<label for="' + f + 'c2">Digite BLOQUEAR ' + esc(v.placa) + '</label><input id="' + f + 'c2" autocomplete="off">' +
        '<label class="fbq-check"><input type="checkbox" id="' + f + 'risco"> Aceito o risco de enviar com o carro andando (só se o SGO+ avisar)</label>' +
        '<div class="fbq-acoes"><button type="button" class="btn btn-danger" data-fbq="rouboOk" data-i="' + i + '">Bloquear</button></div>');
    } else if (acao === 'rouboOk') enviar(f, 'apiBloqueioRoubo', { veiculoId: v.veiculoId, motivo: val(f + 'j'), confirmacao1: marcado(f + 'c1'), confirmacao2: val(f + 'c2'), aceitarRisco: marcado(f + 'risco') }, b);
    else if (acao === 'foraSim' || acao === 'foraNao') {
      var fd = 'fbq_dfora' + i;
      abrirForm(fd, campoMotivo(fd + 'j', 'Justificativa (obrigatória)', acao === 'foraSim' ? 'Ex.: carro ficou no cliente, chave com o porteiro' : 'Ex.: equipe segue com o carro amanhã cedo') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="' + acao + 'Ok" data-i="' + i + '">' + (acao === 'foraSim' ? 'Bloquear' : 'Não bloquear') + '</button></div>');
    } else if (acao === 'foraSimOk' || acao === 'foraNaoOk') enviar('fbq_dfora' + i, 'apiBloqueioDecidirForaBase', { veiculoId: v.veiculoId, decisao: acao === 'foraSimOk' ? 'BLOQUEAR' : 'NAO_BLOQUEAR', justificativa: val('fbq_dfora' + i + 'j') }, b);
    else if (acao === 'esqEncerrar') {
      var fe = 'fbq_desq' + i;
      abrirForm(fe, '<p style="font-size:12.5px">Só funciona com o carro parado, desligado, na base e com sinal. O KM de chegada vem do rastreador e fica para conferir no painel; depois o bloqueio é pedido. Se alguém precisa do carro agora, prefira autorizar "Passar o carro".</p>' +
        campoMotivo(fe + 'j', 'Justificativa (obrigatória)', 'Ex.: condutor esqueceu de devolver; carro na base desde a tarde') + '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="esqOk" data-i="' + i + '">Encerrar a retirada</button></div>');
    } else if (acao === 'esqOk') enviar('fbq_desq' + i, 'apiBloqueioEncerrarEsquecida', { movimentacaoId: v.movimentacaoId, justificativa: val('fbq_desq' + i + 'j') }, b);
    else if (acao === 'passAut' || acao === 'passRec') {
      var p = d.passagens[i], fp = 'fbq_p' + i;
      abrirForm(fp, (acao === 'passAut' && p.situacao === 'AGUARDANDO_RECEBEDOR' && !p.km ? '<label for="' + fp + 'k">KM do painel (se souber)</label><input id="' + fp + 'k" inputmode="numeric">' : '') +
        campoMotivo(fp + 'j', acao === 'passAut' ? 'Justificativa (obrigatória)' : 'Motivo (opcional)', 'Ex.: condutor sem sinal no celular, confirmado por telefone') +
        '<div class="fbq-acoes"><button type="button" class="btn-primary" data-fbq="' + acao + 'Ok" data-i="' + i + '">' + (acao === 'passAut' ? 'Autorizar a passagem' : 'Recusar') + '</button></div>');
    } else if (acao === 'passAutOk' || acao === 'passRecOk') {
      var pp = d.passagens[i], fq = 'fbq_p' + i;
      enviar(fq, 'apiPassagemDecidir', { passagemId: pp.id, decisao: acao === 'passAutOk' ? 'AUTORIZAR' : 'RECUSAR', justificativa: val(fq + 'j'), motivo: val(fq + 'j'), km: val(fq + 'k') }, b);
    }
  }
}
