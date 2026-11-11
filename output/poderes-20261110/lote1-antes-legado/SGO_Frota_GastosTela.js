/****************************************************
 * FROTA — TELAS DA LEVA 2 (30/10/2026): CONFERÊNCIA DE GASTOS, EXTRATO DO PEDÁGIO, PARADAS, CHECKLIST E RELATÓRIO MENSAL
 *
 * Código do navegador (nunca executado no servidor): Frota_telaGastos_ devolve o CSS e o texto da função
 * FrotaGas_telaNavegador_, que vem junto com a tela do rastreamento (Frota_obterTelaRastreamento), como a da leva 1.
 *  - aba "Abastecimentos e despesas" (só gestão): quadro "Conferência de gastos" (filtros, totais por veículo e por tipo,
 *    custo por km, lista com o comprovante ao lado, conferido / a conferir / divergente com o motivo, conferência em lote,
 *    lançar despesa com comprovante, importar o extrato do pedágio, relatório mensal A4);
 *  - aba "Manutenção e paradas" (só gestão): "Paradas agendadas" (agendar a partir do plano, concluir com a nota,
 *    cancelar) e "Problemas informados na retirada" (resolver com o que foi feito).
 * Nada é redesenhado sozinho: os quadros só carregam ao abrir a aba ou ao tocar em Consultar/Atualizar, e nunca com um
 * formulário aberto. No celular as tabelas viram cartões (classe frr-tabela) e o comprovante abre por cima da lista.
 * Servidor: SGO_Frota_Gastos.js, SGO_Frota_Paradas.js, SGO_Frota_Checklist.js e SGO_Frota_RelatorioMensal.js.
 ****************************************************/

var FROTAGAS_TELA_CSS = [
  '.frg-grade{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px;align-items:start}',
  '.frg-lado{position:sticky;top:8px;border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:10px;background:var(--bc-surface,#fff);min-height:200px}',
  '.frg-lado iframe,.frg-lado img{width:100%;height:360px;border:1px solid var(--border,#d9e0e7);border-radius:6px;background:#f7f9fb;object-fit:contain}',
  '.frg-lado .frg-fechar{display:none}',
  '.frg-kpis{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}',
  '.frg-kpi{flex:1 1 130px;border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:8px 10px;background:var(--bc-surface-2,#f7f9fb)}',
  '.frg-kpi b{display:block;font-size:17px}',
  '.frg-kpi span{font-size:12px;color:var(--muted,#5b6b7a)}',
  'tr.frg-sel td{background:#eef6ff}',
  '.frg-lista tr{cursor:pointer}',
  '.frg-caixa{border:1px solid var(--border,#d9e0e7);border-radius:8px;padding:12px;margin:10px 0;background:var(--bc-surface-2,#f7f9fb)}',
  '.frg-caixa h4{margin:0 0 8px;font-size:14px}',
  '.frg-itens label{display:block;margin:4px 0}',
  '@media (max-width:900px){.frg-grade{grid-template-columns:1fr}.frg-lado{display:none}.frg-lado.aberto{display:block;position:fixed;inset:8px;z-index:9999;overflow:auto}.frg-lado .frg-fechar{display:inline-block}.frg-lado iframe,.frg-lado img{height:55vh}}'
].join('\n');

function Frota_telaGastos_() {
  return { css: FROTAGAS_TELA_CSS, js: '(' + FrotaGas_telaNavegador_.toString() + ')();' };
}

function FrotaGas_telaNavegador_() {
  var G = { dados: null, sel: null, marcados: {}, editando: false, enviando: false, paradas: null, chk: null, extrato: null };
  function esc(v) { return tplFrota_esc(v == null ? '' : v); }
  function el(id) { return document.getElementById(id); }
  function num(v, c) { return v === null || v === undefined || v === '' ? '—' : tplFrota_num_(v, c || 0); }
  function moeda(v) { return tplFrota_moeda_(v); }
  function apiC(fn, p) { return tplFrota_chamarApi(fn, p || {}); }
  function api(fn, p) { return tplFrota_chamarApiSilencioso_(fn, p || {}); }
  function gestor() { return typeof tplFrota_souGestor_ === 'function' && tplFrota_souGestor_(); }
  function erroHtml(err) { return '<div class="alert-box error" role="alert">' + esc((err && err.message) || String(err)) + '</div>'; }
  function okHtml(t) { return '<div class="alert-box success" role="status">' + esc(t) + '</div>'; }
  function infoHtml(t) { return '<div class="alert-box info" role="status">' + esc(t) + '</div>'; }
  function marca(t, tipo) { return '<span class="frr-marca ' + (tipo || 'cinza') + '">' + esc(t) + '</span>'; }
  function tabela(cols, linhas, vazio, cls) {
    if (!linhas.length) return '<p class="muted">' + esc(vazio) + '</p>';
    return '<div class="frr-rolar"><table class="frr-tabela ' + (cls || '') + '"><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { var attr = l.attr || ''; var cel = l.cel || l; return '<tr' + attr + '>' + cel.map(function (v, i) { return '<td data-rot="' + esc((cols[i] && cols[i].t) || '') + '"' + (cols[i] && cols[i].num ? ' class="num"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var SIT = { PENDENTE: ['Pendente de conferência', 'cinza'], A_CONFERIR: ['A conferir', 'alerta'], CONFERIDO: ['Conferido', 'ok'], DIVERGENTE: ['Divergente', 'critico'], CORRIGIDO: ['Corrigido', 'ok'] };
  function sitMarca(s) { var x = SIT[s] || SIT.PENDENTE; return marca(x[0], x[1]); }
  function litrosTxt(l) { return tplFrota_num_(l, 3).replace(/(,\d*?[1-9])0+$/, '$1').replace(/,000$/, ',0'); }
  function hojeBr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function inicioMesBr() { var d = new Date(); return '01/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function rot(placa) { return typeof tplFrota_rotuloRapido_ === 'function' ? tplFrota_rotuloRapido_(placa) : placa; }
  /** Arquivo -> { base64, mimeType, nomeArquivo }; foto reduzida no navegador quando possível. */
  function lerArquivo(arq) {
    if (!arq) return Promise.resolve(null);
    if (/^image\//.test(arq.type) && typeof frotaComprimirImagem_ === 'function') return Promise.resolve(frotaComprimirImagem_(arq, 1600, 0.72));
    return new Promise(function (ok, falha) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ''); ok({ base64: s.slice(s.indexOf(',') + 1), mimeType: arq.type || 'application/octet-stream', nomeArquivo: arq.name }); };
      r.onerror = function () { falha(new Error('Não foi possível ler o arquivo. Escolha de novo.')); };
      r.readAsDataURL(arq);
    });
  }
  function lerTexto(arq, cod) {
    return new Promise(function (ok, falha) {
      var r = new FileReader();
      r.onload = function () { var t = String(r.result || ''); if (!cod && t.indexOf('�') >= 0) lerTexto(arq, 'ISO-8859-1').then(ok, falha); else ok(t); };
      r.onerror = function () { falha(new Error('Não foi possível ler o arquivo. Escolha de novo.')); };
      r.readAsText(arq, cod || 'UTF-8');
    });
  }
  function visualizar(link) {
    if (!link) return '<p class="muted">Sem comprovante anexado.</p>';
    var src = String(link).replace(/\/view(\?.*)?$/, '/preview');
    return '<iframe src="' + esc(src) + '" title="Comprovante" loading="lazy"></iframe><div class="frr-meta"><a href="' + esc(link) + '" target="_blank" rel="noopener">Abrir o comprovante em outra aba</a></div>';
  }

  // ---------------- montagem nas abas ----------------
  function abaSec(id) { return document.querySelector('#tplFrotaContainer .frota-aba[data-aba="' + id + '"]'); }
  function garantirPainel(aba, id, titulo, depoisDe) {
    var sec = abaSec(aba);
    if (!sec) return null;
    var p = el(id);
    if (!p) {
      p = document.createElement('div');
      p.className = 'panel so-gestor'; p.id = id;
      p.innerHTML = '<h2>' + esc(titulo) + '</h2><div id="' + id + '_corpo" class="muted">Carregando...</div>';
      var ref = depoisDe && el(depoisDe);
      if (ref && ref.parentNode === sec) sec.insertBefore(p, ref.nextSibling); else sec.insertBefore(p, sec.firstChild);
    }
    return p;
  }
  function aoMostrar(id) {
    if (!gestor()) return;
    if (id === 'despesas') { garantirPainel('despesas', 'frg_painel', 'Conferência de gastos', 'frab_painel'); if (!G.editando && !G.dados) desenharFiltros(); }
    if (id === 'manutencao') {
      garantirPainel('manutencao', 'frg_paradas', 'Paradas agendadas', 'frab_plano');
      garantirPainel('manutencao', 'frg_chk', 'Problemas informados na retirada', 'frg_paradas');
      if (!G.editando) { carregarParadas(); carregarChecklist(); }
    }
  }
  var anterior = window.tplFrotaRes_aoMostrarAba_;
  window.tplFrotaRes_aoMostrarAba_ = function (id) { if (typeof anterior === 'function') { try { anterior(id); } catch (e) {} } aoMostrar(id); };
  setTimeout(function () { var ativa = document.querySelector('#tplFrotaContainer .frota-aba.ativa'); if (ativa) aoMostrar(ativa.getAttribute('data-aba')); }, 400);

  // ---------------- conferência de gastos ----------------
  function desenharFiltros() {
    var c = el('frg_painel_corpo');
    if (!c) return;
    c.classList.remove('muted');
    c.innerHTML = '<div class="frr-faixa"><strong>Como usar:</strong> escolha o período e toque em Consultar. Toque numa linha para ver o comprovante ao lado e marcar "Conferido", "A conferir" ou "Divergente" (os dois últimos pedem o motivo, que fica na trilha). ' +
      '"Conferir em lote" marca de uma vez os lançamentos pendentes sem apontamento e com comprovante. Lançamento divergente fica fora dos totais e das médias.</div>' +
      '<div class="frr-form">' +
      '<div><label for="frg_de">De</label><input id="frg_de" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(inicioMesBr()) + '"></div>' +
      '<div><label for="frg_ate">Até</label><input id="frg_ate" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(hojeBr()) + '"></div>' +
      '<div><label for="frg_veic">Veículo</label><select id="frg_veic"><option value="">Todos</option></select></div>' +
      '<div><label for="frg_cond">Condutor</label><select id="frg_cond"><option value="">Todos</option></select></div>' +
      '<div><label for="frg_cat">Tipo</label><select id="frg_cat"><option value="">Todos</option><option value="COMBUSTIVEL">Combustível</option><option value="PEDAGIO">Pedágio</option><option value="ESTACIONAMENTO">Estacionamento</option><option value="LAVAGEM">Lavagem</option><option value="PECAS_SERVICOS">Peças e serviços</option><option value="OFICINA">Oficina e manutenção</option><option value="OUTRO">Outro</option></select></div>' +
      '<div><label for="frg_sit">Situação</label><select id="frg_sit"><option value="">Todas</option><option value="PENDENTE">Pendente de conferência</option><option value="A_CONFERIR">A conferir</option><option value="DIVERGENTE">Divergente</option><option value="CONFERIDO">Conferido</option><option value="CORRIGIDO">Corrigido</option></select></div>' +
      '</div><div class="frr-botoes"><button type="button" class="btn btn-primary btn-sm" id="frg_consultar">Consultar</button></div><div id="frg_status"></div><div id="frg_res"></div>' +
      '<details id="frg_despDet"><summary>Lançar despesa com comprovante (pedágio, estacionamento, lavagem, peças e serviços)</summary><div id="frg_despForm"></div></details>' +
      '<details id="frg_extDet"><summary>Importar o extrato do pedágio (tag)</summary><div id="frg_extForm"></div></details>' +
      '<details id="frg_mesDet"><summary>Relatório mensal A4 da frota</summary><div class="frr-form"><div><label for="frg_mes">Mês</label><input type="month" id="frg_mes"></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frg_mesGerar">Gerar relatório mensal (A4 e PDF)</button></div><div id="frg_mesStatus"></div></details>';
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    el('frg_mes').value = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    el('frg_consultar').onclick = consultar;
    el('frg_mesGerar').onclick = gerarMensal;
    el('frg_despDet').addEventListener('toggle', function () { if (el('frg_despDet').open) formDespesa(); });
    el('frg_extDet').addEventListener('toggle', function () { if (el('frg_extDet').open) formExtrato(); });
    consultar();
  }
  function filtros() { var g = function (id) { var e = el(id); return e ? e.value : ''; }; return { dataInicio: g('frg_de'), dataFim: g('frg_ate'), veiculoId: g('frg_veic'), condutorId: g('frg_cond'), categoria: g('frg_cat'), situacao: g('frg_sit') }; }
  function status(html) { var s = el('frg_status'); if (s) s.innerHTML = html; }
  function consultar() {
    var r = el('frg_res'); if (!r) return;
    status(infoHtml('Consultando...'));
    api('apiGastosListar', filtros()).then(function (x) {
      G.dados = x; G.marcados = {}; status('');
      preencherSelects(x);
      if (!G.editando) desenharResultado();
    }).catch(function (err) { status(erroHtml(err)); });
  }
  function preencherSelects(x) {
    var sv = el('frg_veic'), sc = el('frg_cond');
    if (sv && sv.options.length <= 1) sv.innerHTML = '<option value="">Todos</option>' + x.veiculos.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.rotulo || v.placa) + '</option>'; }).join('');
    if (sc && sc.options.length <= 1) sc.innerHTML = '<option value="">Todos</option>' + x.condutores.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>'; }).join('');
  }
  function desenharResultado() {
    var x = G.dados, r = el('frg_res');
    if (!x || !r) return;
    var t = x.totais, ps = t.porSituacao || {};
    var h = '<div class="frg-kpis">' +
      '<div class="frg-kpi"><b>' + esc(moeda(t.geral)) + '</b><span>Total do período (' + t.quantidade + ' lançamentos)</span></div>' +
      '<div class="frg-kpi"><b>' + esc(num(t.km)) + ' km</b><span>Km das retiradas devolvidas</span></div>' +
      '<div class="frg-kpi"><b>' + esc(t.custoKm !== null ? moeda(t.custoKm) : '—') + '</b><span>Custo por km</span></div>' +
      '<div class="frg-kpi"><b>' + ((ps.A_CONFERIR || 0) + (ps.DIVERGENTE || 0)) + '</b><span>A conferir ou divergentes</span></div>' +
      '<div class="frg-kpi"><b>' + (ps.PENDENTE || 0) + '</b><span>Pendentes de conferência</span></div></div>';
    var cats = (t.porCategoria || []).map(function (c) { return c.categoria; });
    h += '<details open><summary>Totais por veículo e por tipo</summary>' + tabela([{ t: 'Veículo' }].concat(t.porCategoria.map(function (c) { return { t: c.rotulo, num: true }; })).concat([{ t: 'Total', num: true }, { t: 'Km', num: true }, { t: 'Custo/km', num: true }, { t: 'km/L', num: true }]),
      t.porVeiculo.map(function (v) { return ['<strong>' + esc(v.rotulo || v.placa) + '</strong>'].concat(cats.map(function (k) { return v.categorias[k] ? esc(moeda(v.categorias[k])) : '—'; })).concat([esc(moeda(v.total)), num(v.km), v.custoKm !== null ? esc(moeda(v.custoKm)) : '—', v.kmL !== null ? num(v.kmL, 1) : '—']); }), 'Nenhum gasto no período.') +
      ((t.combustivel || []).length ? '<p class="frr-meta">Combustível: ' + t.combustivel.map(function (c) { return esc(c.tipo) + ' ' + litrosTxt(c.litros) + ' L, ' + esc(moeda(c.valor)) + (c.precoMedio ? ' (média ' + esc(moeda(c.precoMedio)) + '/L)' : ''); }).join(' · ') + '</p>' : '') + '</details>';
    h += '<div class="frr-botoes"><button type="button" class="btn btn-sm" id="frg_loteSel">Conferido (marcados)</button><button type="button" class="btn btn-sm btn-primary" id="frg_lote">Conferir em lote (pendentes sem apontamento)</button></div>';
    h += '<div class="frg-grade"><div>' + tabela([{ t: '' }, { t: 'Data' }, { t: 'Veículo' }, { t: 'Condutor' }, { t: 'Tipo e descrição' }, { t: 'Valor', num: true }, { t: 'Situação' }],
      x.linhas.map(function (l) {
        return { attr: ' data-frg-linha="' + esc(l.chave) + '"' + (G.sel === l.chave ? ' class="frg-sel"' : ''), cel: ['<input type="checkbox" data-frg-marca="' + esc(l.chave) + '" aria-label="Marcar"' + (G.marcados[l.chave] ? ' checked' : '') + '>',
          esc(l.data + (l.hora ? ' ' + l.hora : '')), esc(l.rotulo), esc(l.condutor || '—'), '<strong>' + esc(l.categoriaRotulo) + '</strong><div class="frr-meta">' + esc(l.descricao) + (l.precoLitro ? ' · ' + esc(moeda(l.precoLitro)) + '/L' : '') + (l.km !== null ? ' · KM ' + num(l.km) : '') + '</div>' + (l.comprovante ? '' : marca('sem comprovante', 'critico')), esc(moeda(l.valor)),
          sitMarca(l.situacao) + ((l.apontamentos || []).length ? '<div class="frr-meta">' + l.apontamentos.map(function (a) { return esc(a.texto); }).join('<br>') + '</div>' : '')] };
      }), 'Nenhum lançamento no período com esses filtros.', 'frg-lista') + (x.limitado ? '<p class="frr-meta">Mostrando os 1.500 mais recentes: diminua o período.</p>' : '') + '</div>' +
      '<div class="frg-lado" id="frg_lado"><p class="muted">Toque numa linha para ver o comprovante aqui.</p></div></div>';
    r.innerHTML = h;
    Array.prototype.forEach.call(r.querySelectorAll('[data-frg-linha]'), function (tr) {
      tr.onclick = function (ev) { if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-frg-marca')) return; abrirLinha(tr.getAttribute('data-frg-linha')); };
    });
    Array.prototype.forEach.call(r.querySelectorAll('[data-frg-marca]'), function (cb) { cb.onchange = function () { if (cb.checked) G.marcados[cb.getAttribute('data-frg-marca')] = true; else delete G.marcados[cb.getAttribute('data-frg-marca')]; }; });
    el('frg_lote').onclick = function () {
      var itens = x.linhas.filter(function (l) { return l.situacao === 'PENDENTE' && !(l.apontamentos || []).length && l.comprovante; }).map(function (l) { return { origem: l.origem, id: l.id }; });
      if (!itens.length) { status(infoHtml('Nenhum lançamento pendente sem apontamento e com comprovante neste filtro.')); return; }
      if (!window.confirm('Marcar ' + itens.length + ' lançamentos pendentes, sem apontamento e com comprovante, como conferidos? O seu nome fica na trilha.')) return;
      conferir(itens, 'CONFERIDO', '', true);
    };
    el('frg_loteSel').onclick = function () {
      var itens = Object.keys(G.marcados).map(function (k) { var p = k.split(':'); return { origem: p[0], id: p.slice(1).join(':') }; });
      if (!itens.length) { status(infoHtml('Marque a caixa das linhas que você conferiu.')); return; }
      conferir(itens, 'CONFERIDO', '', false);
    };
    if (G.sel) abrirLinha(G.sel);
  }
  function abrirLinha(chave) {
    var l = ((G.dados && G.dados.linhas) || []).filter(function (x) { return x.chave === chave; })[0], lado = el('frg_lado');
    if (!l || !lado) return;
    G.sel = chave;
    Array.prototype.forEach.call(document.querySelectorAll('[data-frg-linha]'), function (tr) { tr.classList.toggle('frg-sel', tr.getAttribute('data-frg-linha') === chave); });
    lado.innerHTML = '<div class="frr-botoes"><button type="button" class="btn btn-sm frg-fechar" id="frg_fechar">Fechar</button></div>' +
      '<h4>' + esc(l.categoriaRotulo) + ' · ' + esc(l.rotulo) + ' · ' + esc(l.data + (l.hora ? ' ' + l.hora : '')) + '</h4>' +
      '<p>' + esc(l.descricao) + '<br><strong>' + esc(moeda(l.valor)) + '</strong>' + (l.litros ? ' · ' + litrosTxt(l.litros) + ' L · ' + esc(moeda(l.precoLitro)) + '/L' : '') + (l.km !== null ? ' · KM ' + num(l.km) : '') + '</p>' +
      '<p class="frr-meta">Condutor: ' + esc(l.condutor || '—') + ' · lançado por ' + esc(l.lancadoPor || ({ GESTAO: 'gestão', CONDUTOR: 'condutor', CONDUTOR_APP: 'condutor (Abasteci)', DEVOLUCAO: 'condutor na devolução', EXTRATO_TAG: 'extrato da tag' }[l.lancamento] || l.lancamento || '—')) +
        (l.conferidoPor ? '<br>Situação marcada por ' + esc(l.conferidoPor) + ' em ' + esc(l.conferidoEm) + (l.conferenciaMotivo ? ': ' + esc(l.conferenciaMotivo) : '') : '') + '</p>' +
      sitMarca(l.situacao) + ((l.apontamentos || []).length ? '<div class="frr-meta">' + l.apontamentos.map(function (a) { return esc(a.texto); }).join('<br>') + '</div>' : '') +
      visualizar(l.comprovante) + ((l.painel || []).length ? '<div class="frr-meta"><a href="' + esc(l.painel[0].link) + '" target="_blank" rel="noopener">Ver a foto do painel</a></div>' : '') +
      '<div><label for="frg_motivo">Motivo (obrigatório para "A conferir" e "Divergente", mínimo de 15 caracteres)</label><textarea id="frg_motivo" placeholder="Ex.: litros da nota não batem com o lançamento"></textarea></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" data-frg-sit="CONFERIDO">Conferido</button><button type="button" class="btn btn-sm" data-frg-sit="A_CONFERIR">A conferir</button><button type="button" class="btn btn-sm btn-danger" data-frg-sit="DIVERGENTE">Divergente</button>' +
      (l.origem === 'ABASTECIMENTO' ? '<button type="button" class="btn btn-sm" id="frg_corrigir">Corrigir campos</button>' : '') + '</div><div id="frg_ladoStatus"></div>';
    lado.classList.add('aberto');
    el('frg_fechar').onclick = function () { lado.classList.remove('aberto'); };
    Array.prototype.forEach.call(lado.querySelectorAll('[data-frg-sit]'), function (b) { b.onclick = function () { conferir([{ origem: l.origem, id: l.id }], b.getAttribute('data-frg-sit'), el('frg_motivo').value, false, 'frg_ladoStatus'); }; });
    var bc = el('frg_corrigir');
    if (bc) bc.onclick = function () { var b = document.querySelector('#frab_painel [data-frab-corr="' + l.id + '"]'); if (b) b.click(); else alert('Abra "Obrigatoriedade do abastecimento" (acima) e toque em Corrigir na linha deste abastecimento.'); };
  }
  function conferir(itens, situacao, motivo, lote, alvoId) {
    if (G.enviando) return;
    G.enviando = true;
    var alvo = function (h) { var s = el(alvoId || 'frg_status'); if (s) s.innerHTML = h; };
    alvo(infoHtml('Gravando...'));
    apiC('apiGastosConferir', { itens: itens, situacao: situacao, motivo: motivo, lote: !!lote }).then(function (x) { G.enviando = false; status(okHtml(x.mensagem)); consultar(); })
      .catch(function (err) { G.enviando = false; alvo(erroHtml(err)); });
  }

  // ---------------- lançar despesa ----------------
  function formDespesa() {
    var c = el('frg_despForm'); if (!c || c.getAttribute('data-ok')) return;
    var x = G.dados || { veiculos: [], condutores: [], tipos: [] };
    c.setAttribute('data-ok', '1');
    c.innerHTML = '<div class="frr-form">' +
      '<div><label for="frg_dVeic">Veículo</label><select id="frg_dVeic"><option value="">Escolha</option>' + x.veiculos.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.rotulo || v.placa) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="frg_dCond">Condutor (opcional)</label><select id="frg_dCond"><option value="">o da retirada no horário</option>' + x.condutores.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.nome) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="frg_dTipo">Tipo</label><select id="frg_dTipo">' + (x.tipos || []).map(function (t) { return '<option value="' + esc(t.codigo) + '">' + esc(t.rotulo) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="frg_dData">Data da nota</label><input id="frg_dData" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(hojeBr()) + '"></div>' +
      '<div><label for="frg_dHora">Hora (opcional)</label><input id="frg_dHora" inputmode="numeric" placeholder="hh:mm"></div>' +
      '<div><label for="frg_dValor">Valor (R$)</label><input id="frg_dValor" inputmode="decimal" placeholder="Ex.: 12,50"></div>' +
      '<div><label for="frg_dLocal">Local (praça, estacionamento, oficina)</label><input id="frg_dLocal"></div>' +
      '<div class="largo"><label for="frg_dDesc">O que foi pago (obrigatório em peças e serviços e em outro)</label><input id="frg_dDesc" placeholder="Ex.: troca da lâmpada do farol"></div>' +
      '<div class="largo"><label for="frg_dArq">Comprovante (foto ou PDF, obrigatório)</label><input type="file" id="frg_dArq" accept="image/*,application/pdf"></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frg_dGravar">Conferir e lançar</button></div><div id="frg_dStatus"></div>';
    el('frg_dGravar').onclick = function () {
      if (G.enviando) return;
      var st = el('frg_dStatus');
      var p = { veiculoId: el('frg_dVeic').value, condutorId: el('frg_dCond').value, tipo: el('frg_dTipo').value, data: el('frg_dData').value, hora: el('frg_dHora').value, valor: el('frg_dValor').value, local: el('frg_dLocal').value, descricao: el('frg_dDesc').value };
      var arq = el('frg_dArq').files && el('frg_dArq').files[0];
      if (!p.veiculoId) { st.innerHTML = erroHtml(new Error('Escolha o veículo.')); return; }
      G.enviando = true; G.editando = true;
      st.innerHTML = infoHtml('Conferindo...');
      lerArquivo(arq).then(function (f) {
        if (f) Object.assign(p, f);
        return apiC('apiDespesaPrevia', p).then(function (pr) {
          if (pr.erros && pr.erros.length) throw new Error(pr.mensagem);
          if (!window.confirm('Confira antes de lançar:\n\n' + pr.mensagem + '\n\nOK lança; Cancelar volta para corrigir.')) throw new Error('Nada foi gravado. Corrija e toque em "Conferir e lançar" de novo.');
          return apiC('apiDespesaLancar', p);
        });
      }).then(function (r) { G.enviando = false; G.editando = false; st.innerHTML = okHtml(r.mensagem); el('frg_dValor').value = ''; el('frg_dDesc').value = ''; el('frg_dArq').value = ''; consultar(); })
        .catch(function (err) { G.enviando = false; G.editando = false; st.innerHTML = erroHtml(err); });
    };
  }

  // ---------------- extrato do pedágio ----------------
  function formExtrato() {
    var c = el('frg_extForm'); if (!c || c.getAttribute('data-ok')) return;
    c.setAttribute('data-ok', '1');
    c.innerHTML = '<div class="frr-faixa">A operadora da tag não oferece API pública para empresas (a integração automática só existe por contrato comercial com ela). Por isso a conferência usa o extrato: no portal da operadora, exporte o extrato de passagens do mês em CSV (ou Excel .xlsx) e escolha o arquivo aqui. ' +
      'O SGO+ casa cada passagem com a retirada pela placa e pela data e hora; passagem sem retirada fica "a conferir"; linha já importada não entra de novo. O arquivo fica guardado como o comprovante das passagens.</div>' +
      '<div class="frr-form"><div class="largo"><label for="frg_eArq">Arquivo do extrato (CSV, TXT ou XLSX)</label><input type="file" id="frg_eArq" accept=".csv,.txt,.xlsx,text/csv"></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm" id="frg_ePrevia">Ver a prévia</button><button type="button" class="btn btn-sm btn-primary" id="frg_eGravar" disabled>Gravar as passagens</button></div><div id="frg_eStatus"></div><div id="frg_eLista"></div>';
    var montar = function () {
      var arq = el('frg_eArq').files && el('frg_eArq').files[0];
      if (!arq) return Promise.reject(new Error('Escolha o arquivo do extrato.'));
      var xlsx = /\.xlsx$/i.test(arq.name);
      return lerArquivo(arq).then(function (f) {
        var p = { base64: f.base64, mimeType: f.mimeType || (xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'), nomeArquivo: arq.name };
        if (xlsx) return p;
        return lerTexto(arq).then(function (t) { p.texto = t; return p; });
      });
    };
    el('frg_ePrevia').onclick = function () {
      var st = el('frg_eStatus');
      st.innerHTML = infoHtml('Lendo o arquivo...'); el('frg_eGravar').disabled = true;
      montar().then(function (p) { G.extrato = p; return apiC('apiExtratoTagImportar', Object.assign({ confirmar: false }, p)); }).then(function (r) {
        st.innerHTML = infoHtml(r.resumo);
        var S = { NOVA: ['com retirada', 'ok'], SEM_RETIRADA: ['sem retirada: a conferir', 'alerta'], REPETIDA: ['já importada', 'cinza'], SEM_VEICULO: ['placa fora da Frota', 'critico'] };
        el('frg_eLista').innerHTML = tabela([{ t: 'Linha', num: true }, { t: 'Placa' }, { t: 'Data' }, { t: 'Local' }, { t: 'Valor', num: true }, { t: 'O que acontece' }], r.linhas.map(function (l) {
          var s = S[l.status] || ['', 'cinza'];
          return [String(l.linha), esc(l.rotulo || l.placa), esc(l.data + (l.hora ? ' ' + l.hora : '')), esc(l.local || '—'), esc(moeda(l.valor)), marca(s[0], s[1]) + '<div class="frr-meta">' + esc(l.texto) + '</div>'];
        }), 'Nenhuma passagem lida.') + (r.ignoradas.length ? '<p class="frr-meta">Linhas ignoradas: ' + r.ignoradas.map(function (i) { return i.linha + ' (' + esc(i.motivo) + ')'; }).join('; ') + '</p>' : '');
        el('frg_eGravar').disabled = !(r.contagem.NOVA + r.contagem.SEM_RETIRADA);
      }).catch(function (err) { st.innerHTML = erroHtml(err); });
    };
    el('frg_eGravar').onclick = function () {
      if (G.enviando || !G.extrato) return;
      G.enviando = true;
      var st = el('frg_eStatus');
      st.innerHTML = infoHtml('Gravando...');
      apiC('apiExtratoTagImportar', Object.assign({ confirmar: true }, G.extrato)).then(function (r) { G.enviando = false; G.extrato = null; el('frg_eGravar').disabled = true; st.innerHTML = okHtml(r.mensagem); el('frg_eLista').innerHTML = ''; consultar(); })
        .catch(function (err) { G.enviando = false; st.innerHTML = erroHtml(err); });
    };
  }

  // ---------------- relatório mensal ----------------
  function gerarMensal() {
    var st = el('frg_mesStatus'), mes = el('frg_mes').value;
    var w = window.open('', '_blank');
    if (w) w.document.write('<p style="font-family:sans-serif">Gerando o relatório mensal da frota...</p>');
    st.innerHTML = infoHtml('Gerando o relatório (A4 e PDF)...');
    apiC('apiRelatorioMensal', { mes: mes }).then(function (r) {
      st.innerHTML = okHtml('Relatório gerado.' + (r.aviso ? ' ' + r.aviso : '')) + (r.link ? '<p><a href="' + esc(r.link) + '" target="_blank" rel="noopener">Abrir o PDF</a></p>' : '');
      if (w) { w.document.open(); w.document.write(r.html); w.document.close(); }
    }).catch(function (err) { st.innerHTML = erroHtml(err); if (w) w.close(); });
  }

  // ---------------- paradas agendadas ----------------
  function carregarParadas() {
    var c = el('frg_paradas_corpo'); if (!c) return;
    api('apiParadasListar').then(function (r) {
      G.paradas = r; window.FROTAGAS_PARADAS = r.agendadas;
      if (!G.editando) { desenharParadas(); if (typeof window.FrotaAb_redesenharPlano_ === 'function') window.FrotaAb_redesenharPlano_(); }
    }).catch(function (err) { c.innerHTML = erroHtml(err); });
  }
  function desenharParadas() {
    var r = G.paradas, c = el('frg_paradas_corpo'); if (!r || !c) return;
    c.classList.remove('muted');
    c.innerHTML = '<div class="frr-faixa"><strong>Como funciona:</strong> no Plano de manutenção (acima), toque em "Agendar parada" no item vencido ou perto de vencer. O veículo fica bloqueado para reserva e retirada no período e a atividade "Levar o veículo à oficina" entra na agenda de quem leva. ' +
      'Na volta, toque em "Concluir parada": marque o que foi feito, informe a data, o KM e o custo e anexe a nota. Cada item feito vira manutenção registrada e o plano conta a próxima a partir dela.</div>' +
      '<div id="frg_parForm"></div><div id="frg_parStatus"></div>' +
      tabela([{ t: 'Veículo' }, { t: 'Período' }, { t: 'O que fazer' }, { t: 'Oficina' }, { t: 'Quem leva' }, { t: '' }], r.agendadas.map(function (p) {
        return ['<strong>' + esc(p.rotulo) + '</strong><div class="frr-meta">' + esc(p.reservaCodigo) + '</div>', esc(p.inicio + ' a ' + p.fim), esc(p.oQueFazer), esc(p.oficina), esc(p.responsavel),
          '<div class="frab-acoes"><button type="button" class="btn btn-sm btn-primary" data-frg-pconc="' + esc(p.id) + '">Concluir parada</button><button type="button" class="btn btn-sm" data-frg-pcanc="' + esc(p.id) + '">Cancelar</button></div>'];
      }), 'Nenhuma parada agendada.') +
      (r.historico.length ? '<details><summary>Paradas concluídas e canceladas (' + r.historico.length + ')</summary>' + tabela([{ t: 'Veículo' }, { t: 'Período' }, { t: 'Situação' }, { t: 'Detalhe' }], r.historico.map(function (p) {
        return [esc(p.rotulo), esc(p.inicio), p.situacao === 'CONCLUIDA' ? marca('Concluída', 'ok') : marca('Cancelada', 'cinza'), p.situacao === 'CONCLUIDA' ? esc(p.itensTexto + ' · ' + p.dataRealizada + ' · KM ' + num(p.kmRealizada) + ' · ' + moeda(p.custo || 0)) + (p.nota ? ' · <a href="' + esc(p.nota) + '" target="_blank" rel="noopener">nota</a>' : '') : esc(p.canceladaMotivo)];
      }), '') + '</details>' : '');
    Array.prototype.forEach.call(c.querySelectorAll('[data-frg-pconc]'), function (b) { b.onclick = function () { formConcluir(b.getAttribute('data-frg-pconc')); }; });
    Array.prototype.forEach.call(c.querySelectorAll('[data-frg-pcanc]'), function (b) {
      b.onclick = function () {
        var m = window.prompt('Cancelar a parada (o veículo fica livre no período). Escreva o motivo (mínimo de 15 caracteres).\n\nExemplo: oficina remarcou para a semana que vem');
        if (m === null) return;
        apiC('apiParadaCancelar', { id: b.getAttribute('data-frg-pcanc'), motivo: m }).then(function (x) { el('frg_parStatus').innerHTML = okHtml(x.mensagem); carregarParadas(); }).catch(function (err) { el('frg_parStatus').innerHTML = erroHtml(err); });
      };
    });
  }
  window.FrotaGas_agendarParada_ = function (vid, codigo, rotulo) {
    garantirPainel('manutencao', 'frg_paradas', 'Paradas agendadas', 'frab_plano');
    var abrir = function () {
      var r = G.paradas;
      if (!el('frg_parForm')) desenharParadas();
      var alvo = el('frg_parForm'); if (!alvo || !r) return;
      G.editando = true;
      var amanha = new Date(Date.now() + 86400000), br = ('0' + amanha.getDate()).slice(-2) + '/' + ('0' + (amanha.getMonth() + 1)).slice(-2) + '/' + amanha.getFullYear();
      alvo.innerHTML = '<div class="frg-caixa"><h4>Agendar parada · ' + esc(rotulo) + '</h4><div class="frg-itens"><strong>O que será feito</strong>' + r.itensPlano.map(function (i) {
        return '<label><input type="checkbox" data-frg-pit="' + esc(i.codigo) + '"' + (i.codigo === codigo ? ' checked' : '') + '> ' + esc(i.rotulo) + '</label>'; }).join('') + '</div><div class="frr-form">' +
        '<div><label for="frg_pDi">Data</label><input id="frg_pDi" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(br) + '"></div>' +
        '<div><label for="frg_pHi">Hora de entrega</label><input id="frg_pHi" inputmode="numeric" value="08:00"></div>' +
        '<div><label for="frg_pDf">Volta (data)</label><input id="frg_pDf" inputmode="numeric" placeholder="vazio = mesmo dia"></div>' +
        '<div><label for="frg_pHf">Volta (hora)</label><input id="frg_pHf" inputmode="numeric" value="18:00"></div>' +
        '<div><label for="frg_pOf">Oficina</label><input id="frg_pOf" placeholder="Ex.: Oficina Centro Automotivo"></div>' +
        '<div><label for="frg_pResp">Quem leva e busca</label><select id="frg_pResp"><option value="">Eu</option>' + r.usuarios.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.nome) + '</option>'; }).join('') + '</select></div>' +
        '<div class="largo"><label for="frg_pOq">Observação para a oficina (opcional)</label><input id="frg_pOq" placeholder="Ex.: conferir ruído na roda dianteira"></div></div>' +
        '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frg_pGravar">Agendar parada</button><button type="button" class="btn btn-sm" id="frg_pCanc">Cancelar</button></div><div id="frg_pStatus"></div></div>';
      alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
      el('frg_pCanc').onclick = function () { G.editando = false; alvo.innerHTML = ''; };
      el('frg_pGravar').onclick = function () {
        if (G.enviando) return;
        var itens = Array.prototype.filter.call(alvo.querySelectorAll('[data-frg-pit]'), function (x) { return x.checked; }).map(function (x) { return x.getAttribute('data-frg-pit'); });
        var oq = el('frg_pOq').value;
        G.enviando = true;
        apiC('apiParadaAgendar', { veiculoId: vid, itens: itens, dataInicio: el('frg_pDi').value, horaInicio: el('frg_pHi').value, dataFim: el('frg_pDf').value, horaFim: el('frg_pHf').value, oficina: el('frg_pOf').value, oQueFazer: oq, responsavelId: el('frg_pResp').value })
          .then(function (x) {
            G.enviando = false;
            if (!x.ok) { el('frg_pStatus').innerHTML = erroHtml(new Error(x.message)); return; }
            G.editando = false; alvo.innerHTML = okHtml(x.mensagem); carregarParadas();
          }).catch(function (err) { G.enviando = false; el('frg_pStatus').innerHTML = erroHtml(err); });
      };
    };
    if (G.paradas) abrir(); else api('apiParadasListar').then(function (r) { G.paradas = r; window.FROTAGAS_PARADAS = r.agendadas; desenharParadas(); abrir(); });
  };
  function formConcluir(id) {
    var p = (G.paradas.agendadas || []).filter(function (x) { return x.id === id; })[0], alvo = el('frg_parForm');
    if (!p || !alvo) return;
    G.editando = true;
    alvo.innerHTML = '<div class="frg-caixa"><h4>Concluir parada · ' + esc(p.rotulo) + '</h4><div class="frg-itens"><strong>O que foi feito</strong>' + G.paradas.itensPlano.map(function (i) {
      return '<label><input type="checkbox" data-frg-cit="' + esc(i.codigo) + '"' + (p.itens.indexOf(i.codigo) >= 0 ? ' checked' : '') + '> ' + esc(i.rotulo) + '</label>'; }).join('') + '</div><div class="frr-form">' +
      '<div><label for="frg_cData">Data do serviço</label><input id="frg_cData" inputmode="numeric" placeholder="dd/mm/aaaa" value="' + esc(hojeBr()) + '"></div>' +
      '<div><label for="frg_cKm">KM no serviço</label><input id="frg_cKm" inputmode="numeric" placeholder="Ex.: 197850"></div>' +
      '<div><label for="frg_cCusto">Custo total (R$)</label><input id="frg_cCusto" inputmode="decimal" placeholder="Ex.: 385,90"></div>' +
      '<div><label for="frg_cOf">Oficina</label><input id="frg_cOf" value="' + esc(p.oficina) + '"></div>' +
      '<div class="largo"><label for="frg_cNota">Nota fiscal (obrigatória com custo)</label><input type="file" id="frg_cNota" accept="image/*,application/pdf"></div>' +
      '<div class="largo"><label for="frg_cObs">Observação (opcional)</label><input id="frg_cObs"></div></div>' +
      '<div class="frr-botoes"><button type="button" class="btn btn-sm btn-primary" id="frg_cGravar">Concluir parada</button><button type="button" class="btn btn-sm" id="frg_cCanc">Voltar</button></div><div id="frg_cStatus"></div></div>';
    alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
    el('frg_cCanc').onclick = function () { G.editando = false; alvo.innerHTML = ''; };
    el('frg_cGravar').onclick = function () {
      if (G.enviando) return;
      var itens = Array.prototype.filter.call(alvo.querySelectorAll('[data-frg-cit]'), function (x) { return x.checked; }).map(function (x) { return x.getAttribute('data-frg-cit'); });
      var arq = el('frg_cNota').files && el('frg_cNota').files[0];
      G.enviando = true;
      el('frg_cStatus').innerHTML = infoHtml('Gravando...');
      lerArquivo(arq).then(function (f) {
        return apiC('apiParadaConcluir', Object.assign({ id: p.id, itensFeitos: itens, dataRealizada: el('frg_cData').value, km: el('frg_cKm').value, custo: el('frg_cCusto').value, oficina: el('frg_cOf').value, observacao: el('frg_cObs').value }, f || {}));
      }).then(function (x) { G.enviando = false; G.editando = false; alvo.innerHTML = okHtml(x.mensagem); carregarParadas(); })
        .catch(function (err) { G.enviando = false; el('frg_cStatus').innerHTML = erroHtml(err); });
    };
  }

  // ---------------- problemas informados na retirada ----------------
  function carregarChecklist() {
    var c = el('frg_chk_corpo'); if (!c) return;
    api('apiChecklistPendencias').then(function (r) { G.chk = r; if (!G.editando) desenharChecklist(); }).catch(function (err) { c.innerHTML = erroHtml(err); });
  }
  function desenharChecklist() {
    var r = G.chk, c = el('frg_chk_corpo'); if (!r || !c) return;
    c.classList.remove('muted');
    c.innerHTML = '<p class="frr-meta">Itens marcados com problema no checklist da retirada (luz no painel, óleo, água, pneus, freio, avarias). Continuam aparecendo para quem retira o veículo até você resolver.</p><div id="frg_chkStatus"></div>' +
      tabela([{ t: 'Veículo' }, { t: 'Item' }, { t: 'O que o condutor viu' }, { t: 'Desde' }, { t: '' }], r.itens.map(function (p) {
        return ['<strong>' + esc(p.rotulo) + '</strong>', esc(p.item) + (p.critico ? ' ' + marca('urgente', 'critico') : ''), esc(p.observacao || '—') + '<div class="frr-meta">' + esc(p.condutor) + (p.ocorrencias > 1 ? ' · ' + p.ocorrencias + ' vezes' : '') + '</div>', esc(p.desde),
          '<button type="button" class="btn btn-sm btn-primary" data-frg-chk="' + esc(p.id) + '">Resolver</button>'];
      }), 'Nenhum problema em aberto.');
    Array.prototype.forEach.call(c.querySelectorAll('[data-frg-chk]'), function (b) {
      b.onclick = function () {
        var m = window.prompt('O que foi feito? (mínimo de 15 caracteres; fica na trilha)\n\nExemplo: completado o óleo na oficina; nível conferido');
        if (m === null) return;
        apiC('apiChecklistResolver', { id: b.getAttribute('data-frg-chk'), resolucao: m }).then(function (x) { el('frg_chkStatus').innerHTML = okHtml(x.mensagem); carregarChecklist(); }).catch(function (err) { el('frg_chkStatus').innerHTML = erroHtml(err); });
      };
    });
  }
}
