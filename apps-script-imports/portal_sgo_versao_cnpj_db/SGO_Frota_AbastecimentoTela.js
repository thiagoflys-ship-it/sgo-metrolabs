/****************************************************
 * FROTA — TELAS DO ABASTECIMENTO OBRIGATÓRIO E DO PLANO DE MANUTENÇÃO (30/10/2026)
 *
 * Código do navegador (nunca executado no servidor): Frota_telaAbastecimento_ devolve o CSS e o texto da função
 * FrotaAb_telaNavegador_, que vem junto com a tela do rastreamento (Frota_obterTelaRastreamento).
 *  - aba "Abastecimentos e despesas" (só gestão): quadro "Obrigatoriedade do abastecimento" com os veículos (KM desde o
 *    último abastecimento x limite, capacidade do tanque), pendências (liberar), "Não abasteci" a conferir, lançamentos
 *    a conferir (corrigir, conferido, divergente), correção de abastecimento e de retirada, configuração;
 *  - na mesma aba, o formulário "Registrar abastecimento" passa a mostrar o resumo calculado antes de gravar e a
 *    tabela de abastecimentos ganha a situação da conferência e o botão "Corrigir";
 *  - aba "Manutenção e paradas" (só gestão): quadro "Plano de manutenção" por veículo (informar a última vez, intervalo,
 *    liberar uso com óleo/freio vencido).
 * Nada é redesenhado sozinho: os quadros só carregam ao abrir a aba ou ao tocar em Atualizar, e nunca com um
 * formulário de correção aberto. No celular as tabelas viram cartões (classe frr-tabela).
 * Servidor: SGO_Frota_Abastecimento.js e SGO_Frota_PlanoManutencao.js.
 ****************************************************/

var FROTAAB_TELA_CSS = [
  '.frab-barra{height:8px;border-radius:999px;background:#eceff1;overflow:hidden;min-width:90px}',
  '.frab-barra i{display:block;height:100%;background:#2f855a}',
  '.frab-barra.alerta i{background:#c05621}',
  '.frab-barra.critico i{background:#c53030}',
  '.frab-acoes{display:flex;flex-wrap:wrap;gap:6px}',
  '.frab-acoes button{min-height:36px}',
  '.frab-caixa{border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:12px;margin:10px 0;background:var(--bc-surface-2,#f7f9fb)}',
  '.frab-caixa h4{margin:0 0 8px;font-size:14px}',
  '.frab-resumo{font-size:13px;margin:8px 0;padding:8px 10px;border-radius:6px;background:#fff;border:1px dashed var(--border,#d9e0e7)}',
  '.frab-veic{margin:0 0 12px}',
  '.frab-veic summary{cursor:pointer;font-weight:700;padding:8px 0;font-size:14px}',
  '.frab-cont{display:inline-block;margin-left:6px;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;background:#c53030;color:#fff}',
  '.frab-cont.alerta{background:#c05621}',
  '@media (max-width:760px){.frab-acoes button{flex:1 1 auto}}'
].join('\n');

function Frota_telaAbastecimento_() {
  return { css: FROTAAB_TELA_CSS, js: '(' + FrotaAb_telaNavegador_.toString() + ')();' };
}

function FrotaAb_telaNavegador_() {
  var A = { dados: null, plano: null, editando: false, enviando: false };
  function esc(v) { return tplFrota_esc(v == null ? '' : v); }
  function el(id) { return document.getElementById(id); }
  function num(v, c) { return v === null || v === undefined || v === '' ? '—' : tplFrota_num_(v, c || 0); }
  function moeda(v) { return tplFrota_moeda_(v); }
  function apiC(fn, p) { return tplFrota_chamarApi(fn, p || {}); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function gestor() { return typeof tplFrota_souGestor_ === 'function' && tplFrota_souGestor_(); }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function marca(t, tipo) { return '<span class="frr-marca ' + (tipo || 'cinza') + '">' + esc(t) + '</span>'; }
  function rot(placa) { return typeof tplFrota_rotuloRapido_ === 'function' ? tplFrota_rotuloRapido_(placa) : placa; }
  function tabela(cols, linhas, vazio) {
    if (!linhas.length) return '<p class="muted">' + esc(vazio) + '</p>';
    return '<div class="frr-rolar"><table class="frr-tabela"><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (v, i) { return '<td data-rot="' + esc((cols[i] && cols[i].t) || '') + '"' + (cols[i] && cols[i].num ? ' class="num"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var SIT = { PENDENTE: ['Pendente de conferência', 'cinza'], A_CONFERIR: ['A conferir', 'alerta'], CONFERIDO: ['Conferido', 'ok'], DIVERGENTE: ['Divergente', 'critico'], CORRIGIDO: ['Corrigido', 'ok'] };
  // litros com a vírgula decimal sempre visível: 35591 sai 35.591,0 (nunca 35.591, que se confunde com 35,591)
  function litrosTxt(l) { return tplFrota_num_(l, 3).replace(/(,\d*?[1-9])0+$/, '$1').replace(/,000$/, ',0'); }
  function sitMarca(s) { var x = SIT[s] || SIT.PENDENTE; return marca(x[0], x[1]); }

  // ---------------- montagem nas abas ----------------
  function abaSec(id) { return document.querySelector('#tplFrotaContainer .frota-aba[data-aba="' + id + '"]'); }
  function garantirPainel(aba, id, titulo) {
    var sec = abaSec(aba);
    if (!sec) return null;
    var p = el(id);
    if (!p) {
      p = document.createElement('div');
      p.className = 'panel so-gestor'; p.id = id;
      p.innerHTML = '<h2>' + esc(titulo) + '</h2><div id="' + id + '_corpo" class="muted">Carregando...</div>';
      sec.insertBefore(p, sec.firstChild);
    }
    return p;
  }
  function aoMostrar(id) {
    if (!gestor()) return;
    if (id === 'despesas') { garantirPainel('despesas', 'frab_painel', 'Obrigatoriedade do abastecimento'); ajustarFormGestao(); if (!A.editando) carregarPainel(); }
    if (id === 'manutencao') { garantirPainel('manutencao', 'frab_plano', 'Plano de manutenção'); if (!A.editando) carregarPlano(); }
  }
  var anterior = window.tplFrotaRes_aoMostrarAba_;
  window.tplFrotaRes_aoMostrarAba_ = function (id) { if (typeof anterior === 'function') { try { anterior(id); } catch (e) {} } aoMostrar(id); };
  setTimeout(function () { var ativa = document.querySelector('#tplFrotaContainer .frota-aba.ativa'); if (ativa) aoMostrar(ativa.getAttribute('data-aba')); }, 300);

  // ---------------- formulário da gestão: resumo antes de gravar ----------------
  function ajustarFormGestao() {
    var l = el('tplFrota_ab_litros');
    if (l && !l.getAttribute('data-frab')) { l.setAttribute('data-frab', '1'); l.setAttribute('inputmode', 'decimal'); l.setAttribute('placeholder', 'Como na nota, ex.: 35,591'); }
    var v = el('tplFrota_ab_valor'); if (v) { v.setAttribute('inputmode', 'decimal'); v.setAttribute('placeholder', 'Ex.: 125,99'); }
    var k = el('tplFrota_ab_km'); if (k) { k.setAttribute('inputmode', 'numeric'); k.setAttribute('placeholder', 'Ex.: 197277'); }
  }
  if (typeof window.tplFrota_registrarAbastecimento === 'function' && !window.tplFrota_registrarAbastecimento._frab) {
    var gravarOriginal = window.tplFrota_registrarAbastecimento;
    window.tplFrota_registrarAbastecimento = function () {
      var g = function (id) { var e = el(id); return e ? e.value : ''; };
      var p = { veiculoId: g('tplFrota_ab_veiculo'), data: g('tplFrota_ab_data'), hora: g('tplFrota_ab_hora'), km: g('tplFrota_ab_km'), tipoCombustivel: g('tplFrota_ab_tipo'), litros: g('tplFrota_ab_litros'), valor: g('tplFrota_ab_valor') };
      var st = el('tplFrota_abastecimentoStatus');
      if (st) st.innerHTML = '<div class="alert-box info">Conferindo o lançamento...</div>';
      apiC('apiAbastPrevia', p).then(function (r) {
        if (r.erros && r.erros.length) { if (st) st.innerHTML = erroHtml(new Error(r.mensagem)); return; }
        var txt = 'Confira antes de gravar:\n\n' + r.resumo + (r.apontamentos.length ? '\n\nVai gravar como "a conferir":\n- ' + r.apontamentos.map(function (x) { return x.texto; }).join('\n- ') : '') + '\n\nOK grava; Cancelar volta para corrigir.';
        if (!window.confirm(txt)) { if (st) st.innerHTML = '<div class="alert-box info">Nada foi gravado. Corrija os campos e toque em Registrar de novo.</div>'; return; }
        if (st) st.innerHTML = '';
        gravarOriginal.apply(window, []);
      }).catch(function (err) { if (st) st.innerHTML = erroHtml(err); });
    };
    window.tplFrota_registrarAbastecimento._frab = true;
  }

  // ---------------- tabela de abastecimentos: situação e Corrigir ----------------
  window.tplFrota_renderAbastecimentosTabela_ = function () {
    var alvo = el('tplFrota_abastecimentosTabela');
    if (!alvo) return;
    var itens = (typeof frotaState !== 'undefined' && frotaState.abastecimentos) || [];
    if (!itens.length) { alvo.innerHTML = '<span class="muted">Nenhum abastecimento registrado ainda.</span>'; return; }
    var g = gestor();
    var linhas = itens.map(function (a) {
      var litros = Number(a.LITROS || 0), valor = Number(a.VALOR || 0), preco = litros > 0 ? valor / litros : 0;
      var acoes = '';
      if (a.COMPROVANTE_LINK) acoes += '<a href="' + esc(a.COMPROVANTE_LINK) + '" target="_blank" rel="noopener">Ver comprovante</a> ';
      if (g) acoes += '<button type="button" class="btn btn-sm" data-frab-corr="' + esc(a.ID) + '">Corrigir</button> <button class="btn btn-sm btn-danger" onclick="tplFrota_excluirAbastecimento(\'' + esc(a.ID) + '\')">Excluir</button>';
      return [esc(a.veiculoRotulo || a.veiculoPlaca), esc(a.DATA), a.KM ? tplFrota_num_(a.KM) : '-', esc(a.TIPO_COMBUSTIVEL), litrosTxt(litros) + ' L', moeda(valor), 'R$ ' + tplFrota_num_(preco, 3) + '/L',
        esc(a.condutorNome || '-'), sitMarca(String(a.SITUACAO_CONFERENCIA || 'PENDENTE').toUpperCase()), '<div class="tabela-acoes">' + acoes + '</div>'];
    });
    alvo.innerHTML = tabela([{ t: 'Veículo' }, { t: 'Data' }, { t: 'KM', num: true }, { t: 'Combustível' }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'Preço/L', num: true }, { t: 'Condutor' }, { t: 'Situação' }, { t: 'Ações' }], linhas, '');
    Array.prototype.forEach.call(alvo.querySelectorAll('[data-frab-corr]'), function (b) { b.onclick = function () { abrirCorrecao(b.getAttribute('data-frab-corr')); }; });
  };

  // ---------------- painel da obrigatoriedade ----------------
  function carregarPainel() {
    var c = el('frab_painel_corpo');
    if (!c) return;
    api('apiAbastPainel', { dias: 120 }).then(function (r) { A.dados = r; if (!A.editando) desenharPainel(); })
      .catch(function (err) { c.innerHTML = erroHtml(err); });
  }
  function barra(desde, limite) {
    if (desde === null || desde === undefined) return '<span class="muted">sem base ainda</span>';
    var pct = Math.min(100, Math.round(desde / Math.max(1, limite) * 100));
    return '<div class="frab-barra' + (pct >= 100 ? ' critico' : pct >= 80 ? ' alerta' : '') + '" title="' + pct + '% do limite"><i style="width:' + pct + '%"></i></div><div class="frr-meta">' + num(desde) + ' de ' + num(limite) + ' km</div>';
  }
  function desenharPainel() {
    var r = A.dados, c = el('frab_painel_corpo');
    if (!r || !c) return;
    c.classList.remove('muted');
    var h = '<div class="frr-faixa"><strong>Como funciona:</strong> 1. Na devolução, o condutor responde "Abasteceu durante este uso?": lança ali (litros, valor e foto da nota) ou fica com prazo de 1 dia útil. ' +
      '2. Se o veículo rodar mais que o limite (' + Math.round(r.cfg.fracaoAutonomia * 100) + '% da autonomia; sem a capacidade do tanque, ' + num(r.cfg.limiteKmSemTanque) + ' km) sem abastecimento lançado, quem devolveu recebe a pendência. ' +
      '3. Pendência do limite, ou prazo vencido, trava a próxima retirada da pessoa até ela enviar o comprovante ou responder "Não abasteci" (você confere aqui). 4. Você pode liberar, com o motivo.' +
      (r.cfg.ligado ? '' : ' <strong>A obrigatoriedade está desligada (Configuração, abaixo).</strong>') + '</div>';
    h += '<div class="frr-botoes"><button type="button" class="btn btn-sm" data-frab="atualizar">Atualizar</button></div><div id="frab_status"></div>';
    h += '<h3>Veículos</h3>' + tabela([{ t: 'Veículo' }, { t: 'KM atual', num: true }, { t: 'Último abastecimento' }, { t: 'Rodado desde então' }, { t: 'Tanque (L)' }],
      r.veiculos.map(function (v) {
        return ['<strong>' + esc(rot(v.placa)) + '</strong><div class="frr-meta">' + esc(v.modelo) + '</div>', num(v.kmAtual), v.ultimo ? esc(v.ultimo.data) + ' · KM ' + num(v.ultimo.km) : '<span class="muted">nenhum registrado</span>',
          barra(v.kmDesde, v.limite) + '<div class="frr-meta">' + esc(v.origemLimite) + (v.origemBase ? '; desde o ' + esc(v.origemBase) : '') + '</div>',
          '<div class="frab-acoes"><input type="text" inputmode="decimal" style="width:70px" data-frab-cap="' + esc(v.veiculoId) + '" value="' + esc(v.capacidade === null ? '' : v.capacidade) + '" placeholder="ex.: 54" aria-label="Capacidade do tanque em litros"><button type="button" class="btn btn-sm" data-frab-capg="' + esc(v.veiculoId) + '">Gravar</button></div>'];
      }), 'Nenhum veículo ativo.');
    h += '<h3>Pendências de abastecimento (' + r.pendencias.length + ')</h3>' + tabela([{ t: 'Condutor' }, { t: 'Veículo' }, { t: 'O quê' }, { t: 'Prazo' }, { t: 'Ação' }],
      r.pendencias.map(function (p) {
        return [esc(p.condutor), esc(rot(p.placa)), (p.tipo === 'DETECTOR' ? marca('não lançado', 'critico') : marca('a lançar', 'alerta')) + ' ' + esc(p.motivo) + (p.trava ? '<div>' + marca('próxima retirada travada', 'critico') + '</div>' : ''),
          esc(p.prazo) + (p.atrasado ? ' ' + marca('vencido', 'critico') : ''), '<button type="button" class="btn btn-sm" data-frab-lib="' + esc(p.id) + '">Liberar</button>'];
      }), 'Nenhuma pendência de abastecimento.');
    h += '<h3>"Não abasteci" a conferir (' + r.justificativas.length + ')</h3>' + tabela([{ t: 'Condutor' }, { t: 'Veículo' }, { t: 'Motivo do condutor' }, { t: 'Pendência' }, { t: 'Decisão' }],
      r.justificativas.map(function (p) {
        return [esc(p.condutor), esc(rot(p.placa)), esc(p.justificativa) + '<div class="frr-meta">' + esc(p.justificadoEm) + '</div>', esc(p.motivo),
          '<div class="frab-acoes"><button type="button" class="btn btn-sm btn-primary" data-frab-jok="' + esc(p.id) + '">Aceitar</button><button type="button" class="btn btn-sm" data-frab-jno="' + esc(p.id) + '">Não aceitar</button></div>'];
      }), 'Nenhuma justificativa aguardando.');
    h += '<h3>Lançamentos a conferir (' + r.aConferir.length + ')</h3>' + tabelaLanc(r.aConferir, true, 'Nenhum lançamento a conferir.');
    h += '<details><summary>Todos os lançamentos dos últimos 120 dias (' + r.lancamentos.length + ')</summary>' + tabelaLanc(r.lancamentos, false, 'Nenhum lançamento.') + '</details>';
    h += '<div id="frab_corrigir"></div>';
    h += '<details id="frab_retDet"><summary>Corrigir data, hora ou KM de uma retirada</summary><div class="frr-form"><div><label for="frab_retVeic">Veículo</label><select id="frab_retVeic"><option value="">Escolha</option>' +
      r.veiculos.map(function (v) { return '<option value="' + esc(v.veiculoId) + '">' + esc(rot(v.placa)) + '</option>'; }).join('') + '</select></div></div><div id="frab_retLista"></div></details>';
    h += '<details><summary>Configuração da obrigatoriedade</summary><div class="frr-form">' +
      '<div><label for="frab_cfgFr">Limite: % da autonomia</label><input id="frab_cfgFr" inputmode="numeric" value="' + Math.round(r.cfg.fracaoAutonomia * 100) + '"></div>' +
      '<div><label for="frab_cfgKml">Consumo padrão (km/L) sem histórico</label><input id="frab_cfgKml" inputmode="decimal" value="' + esc(String(r.cfg.kmLPadrao).replace('.', ',')) + '"></div>' +
      '<div><label for="frab_cfgLim">Limite sem tanque cadastrado (km)</label><input id="frab_cfgLim" inputmode="numeric" value="' + esc(r.cfg.limiteKmSemTanque) + '"></div>' +
      '<div><label class="fs-check"><input type="checkbox" id="frab_cfgLig"' + (r.cfg.ligado ? ' checked' : '') + '> Obrigatoriedade ligada (trava a próxima retirada)</label></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" data-frab="cfg">Gravar configuração</button></div></details>';
    c.innerHTML = h;
    ligarPainel(c);
  }
  function tabelaLanc(lista, comConferir, vazio) {
    return tabela([{ t: 'Data' }, { t: 'Veículo' }, { t: 'Litros', num: true }, { t: 'Valor', num: true }, { t: 'R$/L', num: true }, { t: 'KM', num: true }, { t: 'Condutor / origem' }, { t: 'Situação' }, { t: 'Ações' }],
      lista.map(function (a) {
        var orig = { GESTAO: 'lançado pela gestão', CONDUTOR: 'resposta ao pedido', DEVOLUCAO: 'na devolução' }[a.origem] || a.origem.toLowerCase();
        var fotos = (a.comprovante ? '<a href="' + esc(a.comprovante) + '" target="_blank" rel="noopener">comprovante</a>' : marca('sem comprovante', 'critico')) +
          ((a.painel || []).length ? ' · <a href="' + esc(a.painel[0].link) + '" target="_blank" rel="noopener">painel</a>' : '');
        return [esc(a.data + (a.hora ? ' ' + a.hora : '')), esc(rot(a.placa)), litrosTxt(a.litros), moeda(a.valor), a.precoLitro ? num(a.precoLitro, 2) : '—', num(a.km), esc(a.condutor || '—') + '<div class="frr-meta">' + esc(orig) + '</div>',
          sitMarca(a.situacao) + (a.apontamentos.length ? '<div class="frr-meta">' + a.apontamentos.map(function (x) { return esc(x.texto); }).join('<br>') + '</div>' : '') + (a.corrigidoEm ? '<div class="frr-meta">corrigido por ' + esc(a.corrigidoPor) + '</div>' : ''),
          '<div class="frab-acoes">' + fotos + '</div><div class="frab-acoes"><button type="button" class="btn btn-sm" data-frab-corr="' + esc(a.id) + '">Corrigir</button>' +
          (comConferir ? '<button type="button" class="btn btn-sm btn-primary" data-frab-conf="' + esc(a.id) + '">Conferido</button><button type="button" class="btn btn-sm" data-frab-div="' + esc(a.id) + '">Divergente</button>' : '') + '</div>'];
      }), vazio);
  }
  function status(html) { var s = el('frab_status'); if (s) { s.innerHTML = html; s.scrollIntoView({ block: 'nearest' }); } }
  function acao(fn, p, depois) {
    if (A.enviando) return;
    A.enviando = true;
    status('<div class="alert-box info">Gravando...</div>');
    return apiC(fn, p).then(function (x) { A.enviando = false; A.editando = false; status(okHtml(x.mensagem)); if (depois) depois(x); else carregarPainel(); return x; })
      .catch(function (err) { A.enviando = false; status(erroHtml(err)); });
  }
  function pedir(texto, exemplo) { var t = window.prompt(texto + (exemplo ? '\n\nExemplo: ' + exemplo : '')); return t === null ? null : String(t).trim(); }
  function ligarPainel(c) {
    var q = function (sel, f) { Array.prototype.forEach.call(c.querySelectorAll(sel), f); };
    q('[data-frab="atualizar"]', function (b) { b.onclick = function () { A.editando = false; carregarPainel(); }; });
    q('[data-frab-capg]', function (b) { b.onclick = function () { var id = b.getAttribute('data-frab-capg'); var i = c.querySelector('[data-frab-cap="' + id + '"]'); acao('apiRastrCapacidadeTanque', { veiculoId: id, litros: i ? i.value : '' }); }; });
    q('[data-frab-lib]', function (b) { b.onclick = function () { var m = pedir('Liberar a pendência sem o comprovante. Escreva o motivo (mínimo de 15 caracteres); fica na trilha.', 'comprovante entregue em papel ao financeiro'); if (m !== null) acao('apiAbastLiberar', { pedidoId: b.getAttribute('data-frab-lib'), motivo: m }); }; });
    q('[data-frab-jok]', function (b) { b.onclick = function () { acao('apiAbastDecidirJustificativa', { pedidoId: b.getAttribute('data-frab-jok'), decisao: 'ACEITA', motivo: '' }); }; });
    q('[data-frab-jno]', function (b) { b.onclick = function () { var m = pedir('Não aceitar o "Não abasteci". Escreva o motivo (mínimo de 15 caracteres); o condutor recebe o motivo e a próxima retirada dele fica travada até enviar o comprovante.', 'o painel da devolução mostra o tanque na reserva'); if (m !== null) acao('apiAbastDecidirJustificativa', { pedidoId: b.getAttribute('data-frab-jno'), decisao: 'NAO_ACEITA', motivo: m }); }; });
    q('[data-frab-conf]', function (b) { b.onclick = function () { acao('apiAbastConferir', { id: b.getAttribute('data-frab-conf'), situacao: 'CONFERIDO', motivo: '' }); }; });
    q('[data-frab-div]', function (b) { b.onclick = function () { var m = pedir('Marcar como divergente (fica fora das médias). Escreva o motivo (mínimo de 15 caracteres).', 'litros da nota não batem com o lançamento'); if (m !== null) acao('apiAbastConferir', { id: b.getAttribute('data-frab-div'), situacao: 'DIVERGENTE', motivo: m }); }; });
    q('[data-frab-corr]', function (b) { b.onclick = function () { abrirCorrecao(b.getAttribute('data-frab-corr')); }; });
    q('[data-frab="cfg"]', function (b) { b.onclick = function () { acao('apiAbastConfig', { fracaoAutonomiaPct: el('frab_cfgFr').value, kmLPadrao: el('frab_cfgKml').value, limiteKmSemTanque: el('frab_cfgLim').value, ligado: !!el('frab_cfgLig').checked }); }; });
    var sv = el('frab_retVeic');
    if (sv) sv.onchange = function () { listarRetiradas(sv.value); };
  }

  // ---------------- correção de abastecimento ----------------
  function abrirCorrecao(id) {
    var achar = function () { return ((A.dados && A.dados.lancamentos) || []).filter(function (a) { return a.id === id; })[0]; };
    var a = achar();
    if (!a) {
      // veio da tabela antiga: carrega o painel e abre depois
      garantirPainel('despesas', 'frab_painel', 'Obrigatoriedade do abastecimento');
      return api('apiAbastPainel', { dias: 400 }).then(function (r) { A.dados = r; desenharPainel(); var b = achar(); if (b) abrirCorrecao(id); else status(erroHtml(new Error('Lançamento não encontrado (pode ter sido excluído). Atualize a tela.'))); });
    }
    var alvo = el('frab_corrigir');
    if (!alvo) return;
    A.editando = true;
    var tipos = (A.dados.tiposCombustivel || []).concat(['Outro']);
    var campo = function (k, rot, v, extra) { return '<div><label for="frab_c_' + k + '">' + esc(rot) + '</label><input id="frab_c_' + k + '" value="' + esc(v) + '"' + (extra || '') + '></div>'; };
    alvo.innerHTML = '<div class="frab-caixa"><h4>Corrigir abastecimento de ' + esc(a.data) + ' · ' + esc(rot(a.placa)) + '</h4>' +
      '<p class="frr-meta">Só os campos que você mudar são gravados; o comprovante continua o mesmo; o valor antigo, o novo, quem e quando ficam na trilha. Litros e valor com vírgula: 35,591 e 125,99.</p>' +
      '<div class="frr-form">' + campo('litros', 'Litros', String(a.litros).replace('.', ','), ' inputmode="decimal"') + campo('valor', 'Valor (R$)', String(a.valor).replace('.', ','), ' inputmode="decimal"') +
      campo('km', 'KM', a.km === null ? '' : a.km, ' inputmode="numeric"') + campo('data', 'Data', a.data, ' inputmode="numeric" placeholder="dd/mm/aaaa"') + campo('hora', 'Hora', a.hora, ' inputmode="numeric" placeholder="hh:mm"') +
      '<div><label for="frab_c_tipoCombustivel">Combustível</label><select id="frab_c_tipoCombustivel">' + tipos.map(function (t) { return '<option' + (t === a.tipoCombustivel ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      campo('posto', 'Posto', a.posto) +
      '<div><label for="frab_c_condutorId">Condutor</label><select id="frab_c_condutorId"><option value="">—</option>' + (A.dados.condutores || []).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === a.condutorId ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="frab_c_tanqueCheio">Completou o tanque?</label><select id="frab_c_tanqueCheio"><option value="">não informado</option><option value="SIM"' + (a.tanqueCheio === 'SIM' ? ' selected' : '') + '>Sim</option><option value="NAO"' + (a.tanqueCheio === 'NAO' ? ' selected' : '') + '>Não</option></select></div>' +
      '<div class="largo"><label for="frab_c_just">Justificativa (obrigatória, mínimo de 15 caracteres)</label><textarea id="frab_c_just" placeholder="Ex.: conferido com o comprovante: a nota mostra 35,591 L"></textarea></div></div>' +
      '<div class="frab-resumo" id="frab_c_resumo">' + (a.comprovante ? '<a href="' + esc(a.comprovante) + '" target="_blank" rel="noopener">Abrir o comprovante</a> para conferir.' : 'Sem comprovante anexado.') + '</div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm" id="frab_c_previa">Ver o resumo</button><button type="button" class="btn btn-sm btn-primary" id="frab_c_gravar">Gravar correção</button><button type="button" class="btn btn-sm" id="frab_c_cancelar">Cancelar</button></div><div id="frab_c_status"></div></div>';
    alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
    var ler = function () { var o = {}; ['litros', 'valor', 'km', 'data', 'hora', 'tipoCombustivel', 'posto', 'condutorId', 'tanqueCheio'].forEach(function (k) { var e = el('frab_c_' + k); if (e) o[k] = e.value; }); return o; };
    el('frab_c_previa').onclick = function () {
      var c = ler();
      apiC('apiAbastPrevia', Object.assign({ veiculoId: a.veiculoId, ignorarId: a.id }, c)).then(function (r) { el('frab_c_resumo').innerHTML = r.erros.length ? erroHtml(new Error(r.mensagem)) : esc(r.mensagem); })
        .catch(function (err) { el('frab_c_resumo').innerHTML = erroHtml(err); });
    };
    el('frab_c_cancelar').onclick = function () { A.editando = false; alvo.innerHTML = ''; };
    el('frab_c_gravar').onclick = function () {
      if (A.enviando) return;
      A.enviando = true;
      el('frab_c_status').innerHTML = '<div class="alert-box info">Gravando...</div>';
      apiC('apiAbastCorrigir', { id: a.id, campos: ler(), justificativa: el('frab_c_just').value }).then(function (x) {
        A.enviando = false; A.editando = false;
        alvo.innerHTML = okHtml(x.mensagem);
        carregarPainel();
        if (typeof tplFrota_carregarAbastecimentos_ === 'function') tplFrota_carregarAbastecimentos_();
      }).catch(function (err) { A.enviando = false; el('frab_c_status').innerHTML = erroHtml(err); });
    };
  }

  // ---------------- correção de retirada ----------------
  function listarRetiradas(vid) {
    var alvo = el('frab_retLista');
    if (!alvo) return;
    if (!vid) { alvo.innerHTML = ''; return; }
    alvo.innerHTML = '<p class="muted">Carregando...</p>';
    api('apiRetiradasParaCorrigir', { veiculoId: vid }).then(function (r) {
      A.retiradas = r.itens;
      alvo.innerHTML = tabela([{ t: 'Condutor' }, { t: 'Saída' }, { t: 'Chegada' }, { t: 'KM' }, { t: '' }], r.itens.map(function (m) {
        return [esc(m.condutor), esc(m.dataSaida + ' ' + m.horaSaida), esc(m.dataChegada + ' ' + m.horaChegada), num(m.kmSaida) + ' → ' + num(m.kmChegada) + (m.dataDaPlanilha ? '<div>' + marca('data da planilha antiga: confira dia e mês', 'alerta') + '</div>' : ''),
          '<button type="button" class="btn btn-sm" data-frab-ret="' + esc(m.id) + '">Corrigir</button>'];
      }), 'Nenhuma retirada devolvida deste veículo.') + '<div id="frab_retForm"></div>';
      Array.prototype.forEach.call(alvo.querySelectorAll('[data-frab-ret]'), function (b) { b.onclick = function () { formRetirada(b.getAttribute('data-frab-ret')); }; });
    }).catch(function (err) { alvo.innerHTML = erroHtml(err); });
  }
  function formRetirada(id) {
    var m = (A.retiradas || []).filter(function (x) { return x.id === id; })[0], alvo = el('frab_retForm');
    if (!m || !alvo) return;
    A.editando = true;
    var campo = function (k, rot, v, extra) { return '<div><label for="frab_r_' + k + '">' + esc(rot) + '</label><input id="frab_r_' + k + '" value="' + esc(v) + '"' + (extra || '') + '></div>'; };
    alvo.innerHTML = '<div class="frab-caixa"><h4>Corrigir a retirada de ' + esc(m.condutor) + ' (' + esc(m.dataSaida) + ')</h4><p class="frr-meta">Só os campos alterados são gravados, com a trilha. O KM do veículo não muda por aqui (use Ajustar KM).</p><div class="frr-form">' +
      campo('dataSaida', 'Data de saída', m.dataSaida, ' inputmode="numeric" placeholder="dd/mm/aaaa"') + campo('horaSaida', 'Hora de saída', m.horaSaida, ' inputmode="numeric" placeholder="hh:mm"') + campo('kmSaida', 'KM de saída', m.kmSaida, ' inputmode="numeric"') +
      campo('dataChegada', 'Data de chegada', m.dataChegada, ' inputmode="numeric" placeholder="dd/mm/aaaa"') + campo('horaChegada', 'Hora de chegada', m.horaChegada, ' inputmode="numeric" placeholder="hh:mm"') + campo('kmChegada', 'KM de chegada', m.kmChegada, ' inputmode="numeric"') +
      '<div class="largo"><label for="frab_r_just">Justificativa (obrigatória, mínimo de 15 caracteres)</label><textarea id="frab_r_just" placeholder="Ex.: data gravada com dia e mês trocados pela planilha antiga"></textarea></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frab_r_gravar">Gravar correção</button><button type="button" class="btn btn-sm" id="frab_r_cancelar">Cancelar</button></div><div id="frab_r_status"></div></div>';
    el('frab_r_cancelar').onclick = function () { A.editando = false; alvo.innerHTML = ''; };
    el('frab_r_gravar').onclick = function () {
      if (A.enviando) return;
      var c = {}; ['dataSaida', 'horaSaida', 'kmSaida', 'dataChegada', 'horaChegada', 'kmChegada'].forEach(function (k) { c[k] = el('frab_r_' + k).value; });
      A.enviando = true;
      apiC('apiRetiradaCorrigir', { id: m.id, campos: c, justificativa: el('frab_r_just').value }).then(function (x) { A.enviando = false; A.editando = false; alvo.innerHTML = okHtml(x.mensagem); listarRetiradas(el('frab_retVeic').value); })
        .catch(function (err) { A.enviando = false; el('frab_r_status').innerHTML = erroHtml(err); });
    };
  }

  // ---------------- plano de manutenção ----------------
  var SITP = { OK: ['Em dia', 'ok'], AVISO: ['Faltam até 1.000 km ou 30 dias', 'cinza'], VENCENDO: ['A vencer', 'alerta'], VENCIDO: ['Vencido', 'critico'], SEM_HISTORICO: ['Sem a última vez', 'critico'], SEM_INTERVALO: ['Informe o intervalo', 'cinza'] };
  function carregarPlano() {
    var c = el('frab_plano_corpo');
    if (!c) return;
    api('apiPlanoListar').then(function (r) { A.plano = r; if (!A.editando) desenharPlano(); }).catch(function (err) { c.innerHTML = erroHtml(err); });
  }
  function desenharPlano() {
    var r = A.plano, c = el('frab_plano_corpo');
    if (!r || !c) return;
    c.classList.remove('muted');
    var h = '<div class="frr-faixa"><strong>Como usar:</strong> para cada veículo, toque em "Informar" e preencha a data e o KM da última vez de cada item (estão na nota ou na etiqueta da oficina). ' +
      'Vence o que chegar primeiro: o KM ou a data. Aviso com ' + num(r.limites.avisoKm) + ' km ou ' + r.limites.avisoDias + ' dias de antecedência; "a vencer" com ' + num(r.limites.pertoKm) + ' km ou ' + r.limites.pertoDias + ' dias. ' +
      'Óleo ou freio vencido há mais de ' + num(r.limites.travaKm) + ' km trava a retirada do veículo até você liberar. Ao registrar uma manutenção em "Registrar manutenção", o item se atualiza sozinho. ' +
      'Os intervalos padrão são de uso severo (cidade, partidas curtas): ajuste pelo manual do veículo.</div><div id="frab_pl_status"></div>';
    h += r.veiculos.map(function (v) {
      var venc = v.itens.filter(function (i) { return i.situacao === 'VENCIDO'; }).length;
      return '<details class="frab-veic"' + (v.incompletos || venc ? ' open' : '') + '><summary>' + esc(rot(v.placa)) + ' · ' + esc(v.modelo) + ' · KM ' + num(v.kmAtual) +
        (v.incompletos ? '<span class="frab-cont">' + v.incompletos + ' sem a última vez</span>' : '') + (venc ? '<span class="frab-cont alerta">' + venc + ' vencido' + (venc > 1 ? 's' : '') + '</span>' : '') + '</summary>' +
        tabela([{ t: 'Item' }, { t: 'Última vez' }, { t: 'Intervalo' }, { t: 'Próxima' }, { t: 'Situação' }, { t: '' }], v.itens.map(function (i) {
          var s = SITP[i.situacao] || SITP.OK;
          var falta = i.faltamKm !== null ? (i.faltamKm < 0 ? 'passou ' + num(-i.faltamKm) + ' km' : 'faltam ' + num(i.faltamKm) + ' km') : '';
          var faltaD = i.faltamDias !== null ? (i.faltamDias < 0 ? 'venceu há ' + (-i.faltamDias) + ' dias' : 'faltam ' + i.faltamDias + ' dias') : '';
          return ['<strong>' + esc(i.rotulo) + '</strong>' + (i.critico ? '<div class="frr-meta">trava a retirada se vencer há mais de ' + num(r.limites.travaKm) + ' km</div>' : ''),
            (i.ultimaData || i.ultimaKm !== null ? esc(i.ultimaData || 'sem data') + ' · ' + (i.ultimaKm !== null ? 'KM ' + num(i.ultimaKm) : 'sem KM') + '<div class="frr-meta">' + esc(i.ultimaOrigem) + '</div>' : '<span class="muted">não informada</span>'),
            esc([i.intervaloKm ? num(i.intervaloKm) + ' km' : '', i.intervaloMeses ? i.intervaloMeses + ' meses' : ''].filter(Boolean).join(' ou ') || '—') + '<div class="frr-meta">' + esc(i.fonteIntervalo) + '</div>',
            esc([i.proximaKm !== null ? 'KM ' + num(i.proximaKm) : '', i.proximaData].filter(Boolean).join(' ou ') || '—') + '<div class="frr-meta">' + esc([falta, faltaD].filter(Boolean).join('; ')) + '</div>',
            marca(s[0], s[1]) + (i.incompleto && i.situacao !== 'SEM_HISTORICO' ? '<div class="frr-meta">falta ' + esc(i.faltaInfo.join(' e ')) + '</div>' : '') + (i.trava ? '<div>' + marca('retirada travada', 'critico') + '</div>' : '') +
              (i.liberadoAteKm !== null ? '<div class="frr-meta">uso liberado até KM ' + num(i.liberadoAteKm) + ' por ' + esc(i.liberadoPor) + '</div>' : ''),
            '<div class="frab-acoes"><button type="button" class="btn btn-sm" data-frab-pl="' + esc(v.id) + '|' + esc(i.codigo) + '">Informar</button>' + (i.trava ? '<button type="button" class="btn btn-sm btn-primary" data-frab-pll="' + esc(v.id) + '|' + esc(i.codigo) + '">Liberar uso</button>' : '') + '</div>'];
        }), '') +
        '<p class="frr-meta">Documentos: ' + v.documentos.map(function (d) { return esc(d.tipo) + ' ' + (d.validade ? esc(d.validade) + ' (' + esc({ OK: 'em dia', VENCENDO: 'a vencer', VENCIDO: 'vencido' }[d.situacao] || d.situacao.toLowerCase()) + ')' : 'sem documento cadastrado'); }).join(' · ') + ' (cadastre em Documentos e multas).</p>' +
        '<div data-frab-plform="' + esc(v.id) + '"></div></details>';
    }).join('');
    c.innerHTML = h;
    Array.prototype.forEach.call(c.querySelectorAll('[data-frab-pl]'), function (b) { b.onclick = function () { var p = b.getAttribute('data-frab-pl').split('|'); formPlano(p[0], p[1]); }; });
    Array.prototype.forEach.call(c.querySelectorAll('[data-frab-pll]'), function (b) {
      b.onclick = function () {
        var p = b.getAttribute('data-frab-pll').split('|');
        var m = window.prompt('Liberar o uso do veículo por mais 500 km com o item vencido. Escreva o motivo (mínimo de 15 caracteres).\n\nExemplo: troca agendada para amanhã às 8h; uso só na cidade até lá');
        if (m === null) return;
        apiC('apiPlanoLiberar', { veiculoId: p[0], item: p[1], motivo: m }).then(function (x) { el('frab_pl_status').innerHTML = okHtml(x.mensagem); carregarPlano(); }).catch(function (err) { el('frab_pl_status').innerHTML = erroHtml(err); });
      };
    });
  }
  function formPlano(vid, codigo) {
    var v = (A.plano.veiculos || []).filter(function (x) { return x.id === vid; })[0];
    var i = v && v.itens.filter(function (x) { return x.codigo === codigo; })[0];
    var alvo = document.querySelector('[data-frab-plform="' + vid + '"]');
    if (!i || !alvo) return;
    A.editando = true;
    alvo.innerHTML = '<div class="frab-caixa"><h4>' + esc(i.rotulo) + ' · ' + esc(rot(v.placa)) + '</h4><p class="frr-meta">Informe quando foi feita a última vez (data e KM). Deixe o intervalo vazio para usar o padrão (' +
      esc([i.intervaloKm ? num(i.intervaloKm) + ' km' : '', i.intervaloMeses ? i.intervaloMeses + ' meses' : ''].filter(Boolean).join(' ou ') || 'sem padrão') + ').</p><div class="frr-form">' +
      '<div><label for="frab_p_data">Data da última vez</label><input id="frab_p_data" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(i.ultimaOrigem === 'informado pela gestão' ? i.ultimaData : '') + '"></div>' +
      '<div><label for="frab_p_km">KM da última vez</label><input id="frab_p_km" inputmode="numeric" placeholder="ex.: 194601" value="' + esc(i.ultimaOrigem === 'informado pela gestão' && i.ultimaKm !== null ? i.ultimaKm : '') + '"></div>' +
      '<div><label for="frab_p_ik">Intervalo (km)</label><input id="frab_p_ik" inputmode="numeric" placeholder="padrão" value="' + esc(i.intervaloPadrao ? '' : (i.intervaloKm || '')) + '"></div>' +
      '<div><label for="frab_p_im">Intervalo (meses)</label><input id="frab_p_im" inputmode="numeric" placeholder="padrão" value="' + esc(i.intervaloPadrao ? '' : (i.intervaloMeses || '')) + '"></div>' +
      '<div class="largo"><label for="frab_p_fonte">De onde vem o intervalo (opcional)</label><input id="frab_p_fonte" placeholder="Ex.: manual do veículo, uso severo" value="' + esc(i.intervaloPadrao ? '' : i.fonteIntervalo) + '"></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frab_p_gravar">Gravar</button><button type="button" class="btn btn-sm" id="frab_p_cancelar">Cancelar</button></div><div id="frab_p_status"></div></div>';
    alvo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el('frab_p_cancelar').onclick = function () { A.editando = false; alvo.innerHTML = ''; };
    el('frab_p_gravar').onclick = function () {
      if (A.enviando) return;
      A.enviando = true;
      apiC('apiPlanoSalvarItem', { veiculoId: vid, item: codigo, ultimaData: el('frab_p_data').value, ultimaKm: el('frab_p_km').value, intervaloKm: el('frab_p_ik').value, intervaloMeses: el('frab_p_im').value, fonteIntervalo: el('frab_p_fonte').value })
        .then(function (x) { A.enviando = false; A.editando = false; el('frab_pl_status').innerHTML = okHtml(x.mensagem); carregarPlano(); })
        .catch(function (err) { A.enviando = false; el('frab_p_status').innerHTML = erroHtml(err); });
    };
  }
}
