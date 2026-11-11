/****************************************************
 * PROGRAMA DE CONDUTA — TELA DAS SUGESTÕES E DA QUALIDADE (19/10/2026)
 *
 * Duas abas novas no módulo, só para a gestão e o RH (consulta):
 *  - "Sugestões": fila das sugestões de ocorrência vindas dos outros
 *    módulos (aceitar ou descartar, com o link para a origem);
 *  - "Qualidade e planos": Kanban das ocorrências, planos de ação 5W2H
 *    com o ciclo PDCA, análises de causa (5 Porquês e Ishikawa) e os
 *    indicadores por área.
 *
 * O código do navegador fica na função CondutaQ_telaNavegador_ (nunca é
 * executada no servidor): Conduta_obterTelaQualidade devolve o texto dela
 * e o carregador JS_Conduta.html a executa logo depois do módulo, ligando
 * as abas novas às funções do módulo (tplConduta_*), sem mudar o resto da
 * tela. Servidor: SGO_Conduta_Qualidade.js.
 ****************************************************/

var CONDUTA_TELA_QUALIDADE_CSS = [
  '.cndq-faixa{background:var(--bc-surface-2,#f4f6f8);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}',
  '.cndq-faixa.alerta{background:var(--bc-warning-bg,#fff7e6);border-color:var(--bc-warning-line,#f0c36d)}',
  '.cndq-sub{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
  '.cndq-sub button{border:1px solid var(--bc-line-2);background:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;color:var(--bc-text)}',
  '.cndq-sub button.ativo{background:var(--bc-text);color:#fff;border-color:var(--bc-text)}',
  '.cndq-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}',
  '.cndq-cartao{background:var(--card,#fff);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.45;min-width:0}',
  '.cndq-cartao h4{margin:0 0 4px;font-size:13.5px;line-height:1.35}',
  '.cndq-meta{color:var(--text-muted,var(--bc-text-3));font-size:11.5px;margin-bottom:6px}',
  '.cndq-chip{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10.5px;font-weight:700;background:var(--bc-surface-2,#eef1f4);color:var(--bc-text);margin:0 4px 4px 0}',
  '.cndq-chip.alerta{background:#fff1d6;color:#8a5300}.cndq-chip.ok{background:#e3f5ec;color:#0f6b43}.cndq-chip.info{background:#e6efff;color:#0b4ea2}.cndq-chip.cinza{background:#eceff1;color:#5b6670}',
  '.cndq-acoes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
  '.cndq-acoes .conduta-btn{padding:6px 10px;font-size:12px}',
  '.cndq-kanban{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}',
  '.cndq-col{flex:1 0 230px;min-width:230px;max-width:340px;background:var(--bc-surface-2,#f4f6f8);border:1px solid var(--border);border-radius:8px;padding:8px}',
  '.cndq-col h5{margin:0 0 2px;font-size:12.5px}.cndq-col .cndq-meta{margin-bottom:8px}',
  '.cndq-col .cndq-cartao{margin-bottom:8px;padding:10px}',
  '.cndq-pdca{display:flex;gap:4px;margin:6px 0 8px}.cndq-pdca span{flex:1;text-align:center;font-size:10.5px;font-weight:700;padding:4px 2px;border-radius:4px;background:#eceff1;color:#5b6670}',
  '.cndq-pdca span.feito{background:#e3f5ec;color:#0f6b43}.cndq-pdca span.atual{background:var(--bc-text);color:#fff}',
  '.cndq-5w2h{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}.cndq-5w2h th,.cndq-5w2h td{border:1px solid var(--border);padding:4px 6px;text-align:left;vertical-align:top}.cndq-5w2h th{width:78px;background:var(--card-soft,#f7f8fa)}',
  '.cndq-tabela-ind{width:100%;border-collapse:collapse;font-size:12px}.cndq-tabela-ind th,.cndq-tabela-ind td{border:1px solid var(--border);padding:6px 8px;text-align:right}.cndq-tabela-ind th:first-child,.cndq-tabela-ind td:first-child{text-align:left}',
  '.cndq-tabela-ind thead th{background:var(--card-soft,#f7f8fa);font-size:11px}',
  '.cndq-ind-cartoes{display:none}',
  '.cndq-filtros{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}',
  '.cndq-filtros select,.cndq-filtros label{font-size:12.5px}.cndq-filtros select{padding:7px 10px;border:1px solid var(--border);border-radius:6px;max-width:100%}',
  '@media (max-width:640px){.cndq-lista{grid-template-columns:1fr}.cndq-tabela-wrap{display:none}.cndq-ind-cartoes{display:grid;gap:8px}.cndq-col{flex-basis:78vw;min-width:78vw}.conduta-modal-box{width:94vw;padding:14px}}'
].join('\n');

function Conduta_obterTelaQualidade() {
  return { css: CONDUTA_TELA_QUALIDADE_CSS, js: '(' + CondutaQ_telaNavegador_.toString() + ')();' };
}

/* eslint-disable no-undef */
function CondutaQ_telaNavegador_() {
  if (window.CNDQ && window.CNDQ.ligado) return;
  var Q = window.CNDQ = { ligado: true, sub: 'kanban', dados: {}, emVoo: {}, filtros: { status: 'PENDENTE', area: '', dias: 90, areaK: '', encerradas: false } };
  var ABAS = { sugestoes: 'Sugestões', qualidade: 'Qualidade e planos' };

  function esc(v) { return typeof escapeHtml_ === 'function' ? escapeHtml_(v === null || v === undefined ? '' : String(v)) : String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function dataBr(v) { var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || ''); }
  function dataHoraBr(v) { var d = new Date(v); return isNaN(d.getTime()) ? dataBr(v) : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function num(v, casas) { if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '—'; return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
  function pct(v) { return v === null || v === undefined ? '—' : num(v, 1) + '%'; }
  function gestao() { return typeof tplConduta_podeGerir_ === 'function' && tplConduta_podeGerir_(); }
  function consulta() { return typeof tplConduta_consultaGeral_ === 'function' && tplConduta_consultaGeral_(); }
  function corpo() { return document.getElementById('condutaTabBody'); }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function erroHtml(m) { return '<div class="conduta-erro" role="alert">Não foi possível concluir: ' + esc(String(m || '').replace(/[.\s]+$/, '')) + '.</div>'; }

  /** Chamada ao servidor com trava contra clique duplo e aviso de carregamento. */
  function api(fn, payload, ok, erro, salvando) {
    if (salvando && Q.emVoo[fn]) return;
    if (salvando) Q.emVoo[fn] = true;
    if (typeof SGO_iniciarCarregamento_ === 'function') SGO_iniciarCarregamento_(salvando ? 'Aguarde, salvando...' : 'Aguarde, carregando...');
    var fim = function () { delete Q.emVoo[fn]; if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); };
    google.script.run
      .withSuccessHandler(function (r) { fim(); ok && ok(r); if (salvando && typeof Conduta_farolAposChamada_ === 'function') { try { Conduta_farolAposChamada_(fn); } catch (e) {} } })
      .withFailureHandler(function (e) { fim(); var m = String((e && e.message) || e || 'falha não identificada'); if (erro) erro(m); else if (typeof tplConduta_mostrarErro_ === 'function') tplConduta_mostrarErro_(m); else alert(m); })
      .Conduta_apiDispatch({ sessionId: SESSION, fn: fn, payload: payload || {} });
  }
  function erroNoModal(m) {
    var box = document.getElementById('condutaModalBox');
    if (!box) { alert(m); return; }
    var av = box.querySelector('.conduta-erro');
    if (!av) { av = document.createElement('div'); av.className = 'conduta-erro'; av.setAttribute('role', 'alert'); box.insertBefore(av, box.children[1] || null); }
    av.textContent = 'Não foi possível concluir: ' + String(m).replace(/[.\s]+$/, '') + '. Corrija e tente de novo.';
  }
  function aviso(m) {
    var c = corpo(); if (!c) return;
    var el = document.createElement('div'); el.className = 'cndq-faixa'; el.setAttribute('role', 'status'); el.textContent = m;
    c.insertBefore(el, c.firstChild);
    setTimeout(function () { if (el.isConnected) el.remove(); }, 8000);
  }
  function abrirOrigem(tela, link) {
    if (link && /^https?:\/\//.test(link)) { window.open(link, '_blank', 'noopener'); return; }
    if (tela && typeof abrir === 'function') abrir(tela);
  }
  function opcoesCatalogo(sel) {
    var porGrupo = {};
    ((window.CONDUTA_ESTADO && CONDUTA_ESTADO.catalogo) || []).forEach(function (t) { (porGrupo[t.GRUPO] = porGrupo[t.GRUPO] || []).push(t); });
    return '<option value="">Escolha o código</option>' + Object.keys(porGrupo).sort().map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + porGrupo[g].map(function (t) {
        return '<option value="' + esc(t.CODIGO) + '"' + (String(t.CODIGO).toUpperCase() === String(sel || '').toUpperCase() ? ' selected' : '') + '>' + esc(t.CODIGO + ' — ' + t.DESCRICAO + ' (' + t.NIVEL + ')') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }
  function opcoesColegas(sel) {
    return '<option value="">Escolha a pessoa</option>' + ((window.CONDUTA_ESTADO && CONDUTA_ESTADO.colegas) || []).map(function (c) {
      return '<option value="' + esc(c.ID) + '"' + (String(c.ID) === String(sel || '') ? ' selected' : '') + '>' + esc(c.NOME + (c.AREA_NOME ? ' (' + c.AREA_NOME + ')' : '')) + '</option>';
    }).join('');
  }
  function opcoesAreas(sel, comSem) {
    var vistos = {}, lista = [];
    ((window.CONDUTA_ESTADO && CONDUTA_ESTADO.colegas) || []).forEach(function (c) { if (c.AREA && !vistos[c.AREA]) { vistos[c.AREA] = 1; lista.push([c.AREA, c.AREA_NOME]); } });
    ((Q.dados.ind && Q.dados.ind.areas) || []).forEach(function (a) { if (a.area && !vistos[a.area]) { vistos[a.area] = 1; lista.push([a.area, a.nome]); } });
    lista.sort(function (a, b) { return String(a[1]).localeCompare(String(b[1]), 'pt-BR'); });
    return '<option value="">Todas as áreas</option>' + lista.map(function (a) { return '<option value="' + esc(a[0]) + '"' + (a[0] === sel ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('') +
      (comSem ? '<option value="-"' + (sel === '-' ? ' selected' : '') + '>Sem área definida</option>' : '');
  }
  function base(cb) { if (typeof tplConduta_carregarListasBase_ === 'function') tplConduta_carregarListasBase_(cb); else cb(); }

  // ---------------------------------------------------------------- ligação com o módulo
  var origRender = window.tplConduta_renderReal_, origAbrir = window.tplConduta_abrirTab_, origLabel = window.tplConduta_labelDoId_;
  window.tplConduta_labelDoId_ = function (id) { return ABAS[id] || (origLabel ? origLabel(id) : ''); };
  window.tplConduta_renderReal_ = function () {
    // celular: os botões da tela rápida (JS_Core, mobileCondutaAbrirQualidade_) pedem a aba de entrada
    if (window.CNDQ_ABA_INICIAL && window.CONDUTA_ESTADO) { CONDUTA_ESTADO.tab = window.CNDQ_ABA_INICIAL; window.CNDQ_ABA_INICIAL = ''; }
    if (!consulta() && ABAS[window.CONDUTA_ESTADO && CONDUTA_ESTADO.tab]) CONDUTA_ESTADO.tab = 'farol';
    origRender.apply(this, arguments);
    inserirAbas();
  };
  window.tplConduta_abrirTab_ = function (id) {
    if (!ABAS[id]) return origAbrir.apply(this, arguments);
    if (!consulta()) return origAbrir('farol');
    CONDUTA_ESTADO.tab = id;
    var ajudaAnterior = document.getElementById('condutaAjudaContextual'); if (ajudaAnterior) ajudaAnterior.remove();
    document.querySelectorAll('.conduta-tab-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-cndq') === id); });
    var c = corpo(); if (c) c.innerHTML = '<div class="conduta-vazio">Carregando...</div>';
    if (id === 'sugestoes') renderSugestoes(); else renderQualidade();
  };
  function inserirAbas() {
    if (!consulta()) return;
    var barra = document.querySelector('#tplCondutaContainer .conduta-tabs');
    if (!barra || barra.querySelector('[data-cndq]')) return;
    var ref = Array.prototype.filter.call(barra.querySelectorAll('.conduta-tab-btn'), function (b) { return b.textContent === 'Fechamentos'; })[0] || null;
    Object.keys(ABAS).forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'conduta-tab-btn' + (CONDUTA_ESTADO.tab === id ? ' active' : ''); b.setAttribute('data-cndq', id); b.textContent = ABAS[id];
      b.onclick = function () { window.tplConduta_abrirTab_(id); };
      barra.insertBefore(b, ref);
    });
    atualizarContador();
  }
  function atualizarContador() {
    api('apiListarSugestoes', { status: 'PENDENTE' }, function (r) {
      var b = document.querySelector('.conduta-tab-btn[data-cndq="sugestoes"]');
      if (b) b.textContent = 'Sugestões' + (r && r.contagem && r.contagem.PENDENTE ? ' (' + r.contagem.PENDENTE + ')' : '');
    }, function () {});
  }
  Q.abrirSugestoes = function () { window.tplConduta_abrirTab_('sugestoes'); };

  // ---------------------------------------------------------------- SUGESTÕES
  var ROT_STATUS = { PENDENTE: 'Pendente', ACEITA: 'Aceita', DESCARTADA: 'Descartada', SUPERADA: 'Saiu da fila' };
  function renderSugestoes() {
    var c = corpo(); if (!c) return;
    var f = Q.filtros;
    base(function () {
      api('apiListarSugestoes', { status: f.status, area: f.area }, function (r) {
        if (CONDUTA_ESTADO.tab !== 'sugestoes') return;
        Q.dados.sug = r;
        var cont = r.contagem || {};
        var b = document.querySelector('.conduta-tab-btn[data-cndq="sugestoes"]');
        if (b) b.textContent = 'Sugestões' + (cont.PENDENTE ? ' (' + cont.PENDENTE + ')' : '');
        c.innerHTML =
          '<div class="cndq-faixa">Sugestões geradas pela Frota, pelo Auvo, pelo Painel de qualidade, por Minhas atividades, pelos Avisos e pelo Assistente do ponto do COMMAND. <b>Nada vira ocorrência sozinho</b>: ' +
            (r.podeDecidir ? 'aceite (você vira o fiscal e outra pessoa da gestão homologa) ou descarte com o motivo.' : 'a gestão aceita ou descarta; o RH consulta.') + ' ' + esc((r.regraPrazo && r.regraPrazo.texto) || '') +
            '<br><span class="cndq-meta">Última busca nos módulos: ' + (r.ultimaColeta ? esc(dataHoraBr(r.ultimaColeta)) : 'ainda não feita') + '. A busca é automática (todo dia às 6h e ao abrir esta aba, no máximo a cada 3 horas).</span></div>' +
          (r.coleta && r.coleta.avisos && r.coleta.avisos.length ? '<div class="cndq-faixa alerta">' + r.coleta.avisos.map(esc).join('<br>') + '</div>' : '') +
          '<div class="cndq-filtros">' +
            '<select id="cndqSugStatus" aria-label="Situação">' + ['PENDENTE', 'ACEITA', 'DESCARTADA', 'SUPERADA', 'TODAS'].map(function (s) {
              return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + (s === 'TODAS' ? 'Todas' : ROT_STATUS[s] + (s === 'PENDENTE' ? 's' : s === 'SUPERADA' ? '' : 's')) + (cont[s] !== undefined ? ' (' + num(cont[s]) + ')' : '') + '</option>';
            }).join('') + '</select>' +
            '<select id="cndqSugArea" aria-label="Área">' + opcoesAreas(f.area, true) + '</select>' +
            (r.podeDecidir ? '<button type="button" class="conduta-btn cinza" id="cndqColetar">Buscar sugestões agora</button>' : '') +
          '</div>' +
          (r.itens.length ? '<div class="cndq-lista">' + r.itens.map(cartaoSugestao).join('') + '</div>'
            : '<div class="conduta-vazio">' + (f.status === 'PENDENTE' ? 'Nenhuma sugestão aguardando decisão. Os módulos são consultados sozinhos; para buscar agora, use "Buscar sugestões agora".' : 'Nenhuma sugestão nesta situação.') + '</div>');
        document.getElementById('cndqSugStatus').onchange = function () { f.status = this.value; renderSugestoes(); };
        document.getElementById('cndqSugArea').onchange = function () { f.area = this.value; renderSugestoes(); };
        var bc = document.getElementById('cndqColetar');
        if (bc) bc.onclick = function () { api('apiColetarSugestoesAgora', {}, function (x) { renderSugestoes(); setTimeout(function () { aviso(x.message + ((x.avisos || []).length ? ' ' + x.avisos.join(' ') : '')); }, 400); }, null, true); };
        c.querySelectorAll('[data-sug-aceitar]').forEach(function (bt) { bt.onclick = function () { abrirAceitar(bt.getAttribute('data-sug-aceitar')); }; });
        c.querySelectorAll('[data-sug-descartar]').forEach(function (bt) { bt.onclick = function () { abrirDescartar(bt.getAttribute('data-sug-descartar')); }; });
        c.querySelectorAll('[data-origem-tela]').forEach(function (bt) { bt.onclick = function () { abrirOrigem(bt.getAttribute('data-origem-tela'), bt.getAttribute('data-origem-link')); }; });
      }, function (m) { c.innerHTML = erroHtml(m + '. Abra a aba de novo; se repetir, avise o administrador'); });
    });
  }
  function cartaoSugestao(s) {
    var origemBotao = (s.ORIGEM_LINK || s.ORIGEM_TELA) ? '<button type="button" class="conduta-btn cinza" data-origem-tela="' + esc(s.ORIGEM_TELA) + '" data-origem-link="' + esc(s.ORIGEM_LINK) + '">' + (s.ORIGEM_LINK ? 'Abrir no Auvo' : 'Abrir ' + esc(s.ORIGEM_NOME)) + '</button>' : '';
    var acoes = '';
    if (s.STATUS === 'PENDENTE') {
      if (s.PODE_DECIDIR) acoes = '<button type="button" class="conduta-btn verde" data-sug-aceitar="' + esc(s.ID) + '">Aceitar e registrar</button><button type="button" class="conduta-btn cinza" data-sug-descartar="' + esc(s.ID) + '">Descartar</button>';
      else if (s.SOU_O_ENVOLVIDO) acoes = '<span class="cndq-meta">É sobre você: outra pessoa da gestão decide.</span>';
      else acoes = '<span class="cndq-meta">Consulta: a gestão decide.</span>';
    } else {
      acoes = '<span class="cndq-meta">' + esc(ROT_STATUS[s.STATUS] || s.STATUS) + (s.DECIDIDA_POR_NOME ? ' por ' + esc(s.DECIDIDA_POR_NOME) : '') + (s.DECIDIDA_EM ? ' em ' + esc(dataBr(s.DECIDIDA_EM)) : '') + (s.MOTIVO ? '. Motivo: ' + esc(s.MOTIVO) : '') + '</span>';
    }
    return '<div class="cndq-cartao"><h4>' + esc(s.TITULO) + '</h4>' +
      '<div class="cndq-meta">' + esc(s.COLABORADOR_NOME) + ' · ' + esc(s.AREA_NOME) + ' · fato em ' + esc(dataBr(s.DATA_FATO)) + ' · encontrada em ' + esc(dataBr(s.DETECTADA_EM)) + '</div>' +
      '<div><span class="cndq-chip info">' + esc(s.ORIGEM_NOME) + '</span>' + (s.TIPO_CODIGO ? '<span class="cndq-chip">Código sugerido ' + esc(s.TIPO_CODIGO) + '</span>' : '<span class="cndq-chip cinza">Sem código sugerido</span>') +
        (s.INFORMATIVA ? '<span class="cndq-chip alerta">Informativa</span>' : '') + '</div>' +
      '<div style="margin-top:4px">' + esc(s.DETALHE) + '</div>' +
      '<div class="cndq-meta" style="margin-top:4px">Origem: ' + esc(s.ORIGEM_ROTULO) + '</div>' +
      '<div class="cndq-acoes">' + acoes + origemBotao + '</div></div>';
  }
  function sugestao(id) { return ((Q.dados.sug && Q.dados.sug.itens) || []).filter(function (s) { return s.ID === id; })[0]; }
  function abrirAceitar(id) {
    var s = sugestao(id); if (!s) return;
    base(function () {
      tplConduta_abrirModal_('Aceitar e registrar a ocorrência',
        '<div class="cndq-faixa">' + esc(s.TITULO) + '<br><span class="cndq-meta">' + esc(s.ORIGEM_NOME + ': ' + s.ORIGEM_ROTULO) + '</span></div>' +
        '<div class="conduta-campo"><label for="cndqAcColab">Colaborador envolvido</label><select id="cndqAcColab">' + opcoesColegas(s.COLABORADOR_ID) + '</select></div>' +
        '<div class="conduta-campo"><label for="cndqAcTipo">Código da ocorrência</label><select id="cndqAcTipo">' + opcoesCatalogo(s.TIPO_CODIGO) + '</select></div>' +
        '<div class="conduta-campo"><label for="cndqAcData">Data do fato</label><input type="date" id="cndqAcData" value="' + esc(s.DATA_FATO) + '" max="' + hoje() + '"></div>' +
        '<div class="conduta-campo"><label for="cndqAcDesc">O que aconteceu (vai para a ocorrência)</label><textarea id="cndqAcDesc" rows="4" maxlength="2000">' + esc(s.TITULO + '. ' + s.DETALHE) + '</textarea></div>' +
        '<p class="cndq-meta">Você fica como fiscal desta ocorrência: outra pessoa da gestão homologa, e o colaborador é avisado e pode contestar no prazo.</p>' +
        '<div class="conduta-modal-acoes"><button type="button" class="conduta-btn cinza" onclick="tplConduta_fecharModal_()">Cancelar</button><button type="button" class="conduta-btn verde" id="cndqAcOk">Registrar ocorrência</button></div>');
      document.getElementById('cndqAcOk').onclick = function () {
        var p = { id: id, colaboradorId: getValue_('cndqAcColab'), tipoCodigo: getValue_('cndqAcTipo'), dataFato: getValue_('cndqAcData'), descricao: getValue_('cndqAcDesc') };
        if (!p.colaboradorId) return erroNoModal('escolha o colaborador envolvido');
        if (!p.tipoCodigo) return erroNoModal('escolha o código da ocorrência no catálogo');
        if (!p.dataFato) return erroNoModal('informe a data do fato');
        api('apiAceitarSugestao', p, function (r) { tplConduta_fecharModal_(); renderSugestoes(); setTimeout(function () { aviso(r.message || 'Ocorrência registrada.'); }, 400); }, erroNoModal, true);
      };
    });
  }
  function abrirDescartar(id) {
    var s = sugestao(id); if (!s) return;
    tplConduta_abrirModal_('Descartar a sugestão',
      '<div class="cndq-faixa">' + esc(s.TITULO) + '</div>' +
      '<div class="conduta-campo"><label for="cndqDsMotivo">Por que não vira ocorrência (obrigatório)</label><textarea id="cndqDsMotivo" rows="3" maxlength="1000" placeholder="Ex.: KM conferido, a foto do painel confirma o valor digitado."></textarea></div>' +
      '<p class="cndq-meta">A sugestão sai da fila, não volta e fica no histórico com o motivo, o seu nome e a data.</p>' +
      '<div class="conduta-modal-acoes"><button type="button" class="conduta-btn cinza" onclick="tplConduta_fecharModal_()">Cancelar</button><button type="button" class="conduta-btn" id="cndqDsOk">Descartar</button></div>');
    document.getElementById('cndqDsOk').onclick = function () {
      var motivo = getValue_('cndqDsMotivo');
      if (String(motivo).trim().length < 10) return erroNoModal('escreva o motivo do descarte (pelo menos 10 caracteres)');
      api('apiDescartarSugestao', { id: id, motivo: motivo }, function (r) { tplConduta_fecharModal_(); renderSugestoes(); setTimeout(function () { aviso(r.message); }, 400); }, erroNoModal, true);
    };
  }

  // ---------------------------------------------------------------- QUALIDADE E PLANOS
  var SUBS = { kanban: 'Kanban das ocorrências', planos: 'Planos de ação (5W2H e PDCA)', analises: 'Análises de causa', indicadores: 'Indicadores por área' };
  function renderQualidade() {
    var c = corpo(); if (!c) return;
    c.innerHTML = '<div class="cndq-sub" role="tablist">' + Object.keys(SUBS).map(function (k) {
      return '<button type="button" role="tab" aria-selected="' + (Q.sub === k) + '" class="' + (Q.sub === k ? 'ativo' : '') + '" data-sub="' + k + '">' + esc(SUBS[k]) + '</button>';
    }).join('') + '</div><div id="cndqSubCorpo"><div class="conduta-vazio">Carregando...</div></div>';
    c.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { Q.sub = b.getAttribute('data-sub'); renderQualidade(); }; });
    base(function () {
      if (Q.sub === 'kanban') renderKanban();
      else if (Q.sub === 'planos') renderPlanos();
      else if (Q.sub === 'analises') renderAnalises();
      else renderIndicadores();
    });
  }
  function sub() { return document.getElementById('cndqSubCorpo'); }
  function filtrosPeriodo(idPeriodo, idArea, extra) {
    var f = Q.filtros;
    return '<div class="cndq-filtros"><select id="' + idPeriodo + '" aria-label="Período">' + [30, 90, 180, 365].map(function (d) { return '<option value="' + d + '"' + (Number(f.dias) === d ? ' selected' : '') + '>Últimos ' + d + ' dias</option>'; }).join('') + '</select>' +
      (idArea ? '<select id="' + idArea + '" aria-label="Área">' + opcoesAreas(f.areaK, true) + '</select>' : '') + (extra || '') + '</div>';
  }
  function ligarPeriodo(idPeriodo, idArea, refazer) {
    var p = document.getElementById(idPeriodo); if (p) p.onchange = function () { Q.filtros.dias = Number(this.value); refazer(); };
    var a = idArea && document.getElementById(idArea); if (a) a.onchange = function () { Q.filtros.areaK = this.value; refazer(); };
  }

  // Kanban ------------------------------------------------------------
  function renderKanban() {
    var s = sub(); if (!s) return;
    api('apiKanbanQualidade', { dias: Q.filtros.dias, area: Q.filtros.areaK, comEncerradas: Q.filtros.encerradas }, function (r) {
      if (Q.sub !== 'kanban' || !sub()) return;
      Q.dados.kanban = r;
      s.innerHTML = filtrosPeriodo('cndqKbDias', 'cndqKbArea', '<label><input type="checkbox" id="cndqKbEnc"' + (Q.filtros.encerradas ? ' checked' : '') + '> Mostrar as encerradas sem efeito (rejeitadas, anuladas, descartadas: ' + num(r.encerradasSemEfeito) + ')</label>') +
        '<div class="cndq-faixa">A ocorrência anda pelas colunas conforme o fluxo do programa (homologação, defesa, julgamento); aqui não se arrasta cartão. Ocorrência grave ou reincidente aparece com <b>plano recomendado</b>: faça a análise de causa e o plano 5W2H. As ações do plano viram atividades em Minhas atividades (botão "Atividades do módulo").</div>' +
        '<div class="cndq-kanban">' + r.colunas.map(function (col) {
          return '<section class="cndq-col" aria-label="' + esc(col.nome) + '"><h5>' + esc(col.nome) + ' (' + num(col.itens.length) + ')</h5><div class="cndq-meta">' + esc(col.ajuda) + '</div>' +
            (col.itens.length ? col.itens.map(function (o) { return cartaoKanban(o, r.podeGerir); }).join('') : '<div class="cndq-meta">Nenhuma.</div>') + '</section>';
        }).join('') + '</div>';
      ligarPeriodo('cndqKbDias', 'cndqKbArea', renderKanban);
      document.getElementById('cndqKbEnc').onchange = function () { Q.filtros.encerradas = this.checked; renderKanban(); };
      ligarAcoesCartao(s);
    }, function (m) { s.innerHTML = erroHtml(m); });
  }
  var ROT_ST = { REGISTRADA: 'Registrada', HOMOLOGADA: 'Homologada, prazo de contestação', CONTESTADA: 'Contestada', EM_RECURSO: 'Em recurso', FIRME: 'Firme', REJEITADA: 'Rejeitada', ANULADA: 'Anulada', DESCARTADA: 'Descartada' };
  function cartaoKanban(o, podeGerir) {
    var acoes = [];
    if (podeGerir && !o.ENCERRADA_SEM_EFEITO) {
      acoes.push('<button type="button" class="conduta-btn cinza" data-analise-oc="' + esc(o.ID) + '">' + (o.ANALISE_ID ? 'Ver análise' : 'Análise de causa') + '</button>');
      if (o.PLANO) acoes.push('<button type="button" class="conduta-btn cinza" data-plano-abrir="' + esc(o.PLANO.ID) + '">Abrir ' + esc(o.PLANO.CODIGO) + '</button>');
      else if (o.STATUS === 'FIRME') acoes.push('<button type="button" class="conduta-btn' + (o.EXIGE_PLANO ? ' verde' : ' cinza') + '" data-plano-oc="' + esc(o.ID) + '">Criar plano 5W2H</button>');
    }
    return '<div class="cndq-cartao"><h4>' + esc(o.TIPO_CODIGO) + ' — ' + esc(o.TIPO_DESCRICAO) + '</h4>' +
      '<div class="cndq-meta">' + esc(o.COLABORADOR_NOME) + ' · ' + esc(o.AREA_NOME) + ' · ' + esc(dataBr(o.DATA_FATO)) + '</div>' +
      '<div><span class="cndq-chip">' + esc(ROT_ST[o.STATUS] || o.STATUS) + (o.STATUS === 'HOMOLOGADA' && o.PRAZO_CONTESTACAO ? ' até ' + esc(dataBr(o.PRAZO_CONTESTACAO)) : '') + '</span>' +
        (o.EXIGE_PLANO && !o.PLANO ? '<span class="cndq-chip alerta">Plano recomendado (' + esc(o.EXIGE_PLANO) + ')</span>' : '') +
        (o.PLANO ? '<span class="cndq-chip ' + (o.PLANO.FASE === 'CONCLUIDO' ? 'ok' : 'info') + '">' + esc(o.PLANO.CODIGO + ' · ' + o.PLANO.FASE_NOME) + '</span>' : '') +
        (o.ORIGEM_ROTULO ? '<span class="cndq-chip cinza" title="' + esc(o.ORIGEM_ROTULO) + '">Veio de sugestão</span>' : '') + '</div>' +
      (acoes.length ? '<div class="cndq-acoes">' + acoes.join('') + '</div>' : '') + '</div>';
  }
  function ligarAcoesCartao(raiz) {
    raiz.querySelectorAll('[data-analise-oc]').forEach(function (b) { b.onclick = function () { abrirAnalise({ ocorrenciaId: b.getAttribute('data-analise-oc') }); }; });
    raiz.querySelectorAll('[data-plano-oc]').forEach(function (b) { b.onclick = function () { abrirNovoPlano({ ocorrenciaId: b.getAttribute('data-plano-oc') }); }; });
    raiz.querySelectorAll('[data-plano-abrir]').forEach(function (b) { b.onclick = function () { Q.sub = 'planos'; Q.planoFoco = b.getAttribute('data-plano-abrir'); renderQualidade(); }; });
    raiz.querySelectorAll('[data-analise-cod]').forEach(function (b) { b.onclick = function () { abrirAnalise({ tipoCodigo: b.getAttribute('data-analise-cod') }); }; });
    raiz.querySelectorAll('[data-plano-cod]').forEach(function (b) { b.onclick = function () { abrirNovoPlano({ tipoCodigo: b.getAttribute('data-plano-cod') }); }; });
  }
  function ocorrenciaDoKanban(id) {
    var achada = null;
    ((Q.dados.kanban && Q.dados.kanban.colunas) || []).forEach(function (c) { c.itens.forEach(function (o) { if (o.ID === id) achada = o; }); });
    return achada;
  }

  // Planos ------------------------------------------------------------
  function carregarPlanos(cb) { api('apiListarPlanos', { todos: !!Q.filtros.planosTodos }, function (r) { Q.dados.planos = r; cb(r); }, function (m) { var s = sub(); if (s) s.innerHTML = erroHtml(m); }); }
  function renderPlanos() {
    var s = sub(); if (!s) return;
    carregarPlanos(function (r) {
      if (Q.sub !== 'planos' || !sub()) return;
      s.innerHTML = '<div class="cndq-filtros">' + (r.podeGerir ? '<button type="button" class="conduta-btn" id="cndqNovoPlano">+ Novo plano de ação</button>' : '') +
        '<label><input type="checkbox" id="cndqPlTodos"' + (Q.filtros.planosTodos ? ' checked' : '') + '> Mostrar concluídos e cancelados antigos</label></div>' +
        '<div class="cndq-faixa">PDCA: <b>P</b>lanejar (análise de causa e 5W2H), <b>D</b>o/Executar (as ações em Minhas atividades), <b>C</b>heck/Verificar (o problema voltou?) e <b>A</b>gir (padronizar). Se a verificação mostrar que não foi eficaz, o plano volta para Planejar em um novo ciclo.</div>' +
        (r.planos.length ? '<div class="cndq-lista">' + r.planos.map(function (p) { return cartaoPlano(p, r.podeGerir); }).join('') + '</div>' : '<div class="conduta-vazio">Nenhum plano de ação. Crie pelo Kanban (ocorrência firme), pelos indicadores (código recorrente) ou pelo botão "+ Novo plano de ação".</div>');
      var bn = document.getElementById('cndqNovoPlano'); if (bn) bn.onclick = function () { abrirNovoPlano({}); };
      document.getElementById('cndqPlTodos').onchange = function () { Q.filtros.planosTodos = this.checked; renderPlanos(); };
      s.querySelectorAll('[data-pl]').forEach(function (b) { b.onclick = function () { acaoPlano(b.getAttribute('data-pl'), b.getAttribute('data-acao')); }; });
      s.querySelectorAll('[data-atv]').forEach(function (b) { b.onclick = function () { if (typeof Atividades_abrirDetalhe_ === 'function') Atividades_abrirDetalhe_(b.getAttribute('data-atv')); else abrir('atividades_equipe'); }; });
      if (Q.planoFoco) { var alvo = s.querySelector('[data-plano-id="' + Q.planoFoco + '"]'); if (alvo) { alvo.scrollIntoView({ block: 'center' }); alvo.style.outline = '2px solid var(--bc-action)'; } Q.planoFoco = ''; }
    });
  }
  function pdca(fase) {
    var ordem = ['PLANEJAR', 'EXECUTAR', 'VERIFICAR', 'AGIR'], i = fase === 'CONCLUIDO' ? 4 : ordem.indexOf(fase);
    return '<div class="cndq-pdca" aria-label="Ciclo PDCA">' + ['P Planejar', 'D Executar', 'C Verificar', 'A Agir'].map(function (t, k) { return '<span class="' + (k < i ? 'feito' : k === i ? 'atual' : '') + '">' + t + '</span>'; }).join('') + '</div>';
  }
  function cartaoPlano(p, podeGerir) {
    var botoes = [];
    if (podeGerir) {
      if (p.FASE === 'PLANEJAR' || p.FASE === 'EXECUTAR') botoes.push('<button type="button" class="conduta-btn cinza" data-pl="' + esc(p.ID) + '" data-acao="acao">+ Ação</button>');
      if (p.FASE === 'EXECUTAR') botoes.push('<button type="button" class="conduta-btn" data-pl="' + esc(p.ID) + '" data-acao="verificar">Passar para Verificar</button>');
      if (p.FASE === 'VERIFICAR') botoes.push('<button type="button" class="conduta-btn" data-pl="' + esc(p.ID) + '" data-acao="eficacia">Registrar a verificação</button>');
      if (p.FASE === 'AGIR') botoes.push('<button type="button" class="conduta-btn verde" data-pl="' + esc(p.ID) + '" data-acao="concluir">Concluir (padronizar)</button>');
      if (p.FASE !== 'CONCLUIDO' && p.FASE !== 'CANCELADO') botoes.push('<button type="button" class="conduta-btn cinza" data-pl="' + esc(p.ID) + '" data-acao="cancelar">Cancelar plano</button>');
    }
    var linha = function (k, v) { return '<tr><th>' + k + '</th><td>' + esc(v) + '</td></tr>'; };
    return '<div class="cndq-cartao" data-plano-id="' + esc(p.ID) + '"><h4>' + esc(p.CODIGO) + ' · ' + esc(p.TITULO) + '</h4>' +
      '<div class="cndq-meta">' + esc(p.AREA_NOME) + (p.TIPO_CODIGO ? ' · código ' + esc(p.TIPO_CODIGO) : '') + ' · ciclo ' + num(p.CICLO) + ' · criado por ' + esc(p.CRIADO_POR_NOME) + ' em ' + esc(dataBr(p.CRIADO_EM)) + '</div>' +
      '<div><span class="cndq-chip ' + (p.FASE === 'CONCLUIDO' ? 'ok' : p.FASE === 'CANCELADO' ? 'cinza' : 'info') + '">' + esc(p.FASE_NOME) + '</span>' + (p.ATRASADO ? '<span class="cndq-chip alerta">Prazo vencido</span>' : '') +
        (p.ACOES_ATRASADAS ? '<span class="cndq-chip alerta">' + num(p.ACOES_ATRASADAS) + ' ação(ões) atrasada(s)</span>' : '') + (p.EFICAZ ? '<span class="cndq-chip ' + (p.EFICAZ === 'SIM' ? 'ok' : 'alerta') + '">' + (p.EFICAZ === 'SIM' ? 'Eficaz' : 'Não eficaz') + '</span>' : '') + '</div>' +
      (p.FASE !== 'CANCELADO' ? pdca(p.FASE) : '') +
      '<table class="cndq-5w2h">' + linha('O quê', p.O_QUE) + linha('Por quê', p.POR_QUE) + linha('Onde', p.ONDE) + linha('Quando', dataBr(p.QUANDO)) + linha('Quem', p.QUEM_NOME) + linha('Como', p.COMO) + linha('Quanto', p.QUANTO) + '</table>' +
      '<div><b>Ações em Minhas atividades</b></div>' + (p.ACOES.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + p.ACOES.map(function (a) {
        return '<li><button type="button" class="conduta-ajuda-link" style="all:unset;cursor:pointer;text-decoration:underline" data-atv="' + esc(a.ID) + '">' + esc(a.TITULO) + '</button> — ' + esc(a.RESPONSAVEL_NOME || '') + ', ' + esc(a.SITUACAO) + (a.PRAZO ? ', prazo ' + esc(dataBr(a.PRAZO)) : '') + '</li>';
      }).join('') + '</ul>' : '<div class="cndq-meta">Nenhuma ação ainda.</div>') +
      (p.VERIFICACAO_TEXTO ? '<div style="margin-top:6px"><b>Verificação (' + esc(dataBr(p.VERIFICADO_EM)) + '):</b> ' + esc(p.VERIFICACAO_TEXTO) + '</div>' : '') +
      (p.PADRONIZACAO_TEXTO ? '<div style="margin-top:6px"><b>Padronização:</b> ' + esc(p.PADRONIZACAO_TEXTO) + '</div>' : '') +
      (p.CANCELADO_MOTIVO ? '<div style="margin-top:6px"><b>Cancelado:</b> ' + esc(p.CANCELADO_MOTIVO) + '</div>' : '') +
      (botoes.length ? '<div class="cndq-acoes">' + botoes.join('') + '</div>' : '') + '</div>';
  }
  function plano(id) { return ((Q.dados.planos && Q.dados.planos.planos) || []).filter(function (p) { return p.ID === id; })[0]; }
  function acaoPlano(id, acao) {
    var p = plano(id); if (!p) return;
    var fim = function (r) { tplConduta_fecharModal_(); renderPlanos(); setTimeout(function () { aviso(r.message); }, 400); };
    if (acao === 'acao') {
      tplConduta_abrirModal_('Nova ação do plano ' + p.CODIGO,
        campoTexto('cndqAcOque', 'O quê (ação)', '', 'Ex.: treinar a equipe no checklist de devolução') + campoSelect('cndqAcQuem', 'Quem (responsável)', opcoesColegas('')) +
        '<div class="conduta-campo"><label for="cndqAcQuando">Quando (prazo)</label><input type="date" id="cndqAcQuando" min="' + hoje() + '"></div>' + campoArea('cndqAcComo', 'Como (opcional)', '') +
        rodape('cndqAcSalvar', 'Lançar a ação'));
      document.getElementById('cndqAcSalvar').onclick = function () {
        api('apiAdicionarAcaoPlano', { planoId: id, oQue: getValue_('cndqAcOque'), quemId: getValue_('cndqAcQuem'), quando: getValue_('cndqAcQuando'), como: getValue_('cndqAcComo') }, fim, erroNoModal, true);
      };
    } else if (acao === 'verificar') {
      if (!confirm('Passar o plano ' + p.CODIGO + ' para Verificar? Todas as ações precisam estar concluídas ou canceladas em Minhas atividades.')) return;
      api('apiAvancarPlano', { planoId: id, para: 'VERIFICAR' }, fim, function (m) { aviso('Não foi possível passar para Verificar: ' + m); }, true);
    } else if (acao === 'eficacia') {
      tplConduta_abrirModal_('Verificação da eficácia — ' + p.CODIGO,
        '<p class="cndq-meta">Confira se o problema voltou a acontecer depois das ações (por exemplo, nenhuma ocorrência do código ' + esc(p.TIPO_CODIGO || '') + ' em 30 dias).</p>' +
        campoArea('cndqVerTexto', 'O que foi conferido, em que período e o resultado', '') +
        '<div class="conduta-modal-acoes"><button type="button" class="conduta-btn cinza" onclick="tplConduta_fecharModal_()">Cancelar</button><button type="button" class="conduta-btn cinza" id="cndqVerNao">Não foi eficaz (novo ciclo)</button><button type="button" class="conduta-btn verde" id="cndqVerSim">Foi eficaz</button></div>');
      var enviar = function (para) { api('apiAvancarPlano', { planoId: id, para: para, texto: getValue_('cndqVerTexto') }, fim, erroNoModal, true); };
      document.getElementById('cndqVerSim').onclick = function () { enviar('AGIR'); };
      document.getElementById('cndqVerNao').onclick = function () { enviar('NOVO_CICLO'); };
    } else if (acao === 'concluir') {
      tplConduta_abrirModal_('Concluir o plano ' + p.CODIGO, campoArea('cndqPadTexto', 'O que foi padronizado (procedimento, treinamento, checklist)', '') + rodape('cndqPadOk', 'Concluir o plano'));
      document.getElementById('cndqPadOk').onclick = function () { api('apiAvancarPlano', { planoId: id, para: 'CONCLUIDO', texto: getValue_('cndqPadTexto') }, fim, erroNoModal, true); };
    } else if (acao === 'cancelar') {
      tplConduta_abrirModal_('Cancelar o plano ' + p.CODIGO, campoArea('cndqCanTexto', 'Motivo do cancelamento (obrigatório)', '') + '<p class="cndq-meta">Nada é apagado: o plano fica no histórico como cancelado.</p>' + rodape('cndqCanOk', 'Cancelar o plano'));
      document.getElementById('cndqCanOk').onclick = function () { api('apiAvancarPlano', { planoId: id, para: 'CANCELADO', texto: getValue_('cndqCanTexto') }, fim, erroNoModal, true); };
    }
  }
  function campoTexto(id, rotulo, valor, ph) { return '<div class="conduta-campo"><label for="' + id + '">' + esc(rotulo) + '</label><input id="' + id + '" value="' + esc(valor) + '" placeholder="' + esc(ph || '') + '" maxlength="1500"></div>'; }
  function campoArea(id, rotulo, valor, ph) { return '<div class="conduta-campo"><label for="' + id + '">' + esc(rotulo) + '</label><textarea id="' + id + '" rows="3" maxlength="1500" placeholder="' + esc(ph || '') + '">' + esc(valor) + '</textarea></div>'; }
  function campoSelect(id, rotulo, opcoes) { return '<div class="conduta-campo"><label for="' + id + '">' + esc(rotulo) + '</label><select id="' + id + '">' + opcoes + '</select></div>'; }
  function rodape(id, texto) { return '<div class="conduta-modal-acoes"><button type="button" class="conduta-btn cinza" onclick="tplConduta_fecharModal_()">Cancelar</button><button type="button" class="conduta-btn verde" id="' + id + '">' + esc(texto) + '</button></div>'; }

  function abrirNovoPlano(o) {
    base(function () {
      var oc = o.ocorrenciaId ? ocorrenciaDoKanban(o.ocorrenciaId) : null;
      var analises = ((Q.dados.planos && Q.dados.planos.analises) || []);
      var abrirForm = function (analises) {
        var ligadas = analises.filter(function (a) { return oc ? a.OCORRENCIA_ID === oc.ID || a.TIPO_CODIGO === oc.TIPO_CODIGO : (!o.tipoCodigo || a.TIPO_CODIGO === o.tipoCodigo); });
        var cabec = oc ? 'Ocorrência ' + oc.TIPO_CODIGO + ' de ' + oc.COLABORADOR_NOME + ' (' + dataBr(oc.DATA_FATO) + ')' : (o.tipoCodigo ? 'Código recorrente ' + o.tipoCodigo : 'Plano livre (escolha o código, se houver)');
        tplConduta_abrirModal_('Novo plano de ação 5W2H',
          '<div class="cndq-faixa">' + esc(cabec) + '</div>' +
          (!oc && !o.tipoCodigo ? campoSelect('cndqPlCod', 'Código do catálogo (opcional)', opcoesCatalogo('')) : '') +
          campoSelect('cndqPlAnalise', 'Análise de causa ligada', '<option value="">Sem análise ligada</option>' + ligadas.map(function (a) { return '<option value="' + esc(a.ID) + '">' + esc(a.TIPO_CODIGO + ' · ' + a.CAUSA_RAIZ.slice(0, 70)) + '</option>'; }).join('')) +
          campoTexto('cndqPlOque', 'O quê (ação)', '', 'Ex.: incluir a foto do painel no checklist de devolução') +
          campoArea('cndqPlPorque', 'Por quê (a causa que a ação ataca)', ligadas[0] ? ligadas[0].CAUSA_RAIZ : '') +
          campoTexto('cndqPlOnde', 'Onde (opcional)', '', 'Ex.: oficina, veículos, laboratório') +
          '<div class="conduta-campo"><label for="cndqPlQuando">Quando (prazo)</label><input type="date" id="cndqPlQuando" min="' + hoje() + '"></div>' +
          campoSelect('cndqPlQuem', 'Quem (responsável)', opcoesColegas('')) +
          campoArea('cndqPlComo', 'Como (passos)', '') +
          campoTexto('cndqPlQuanto', 'Quanto (custo, opcional)', '', 'Ex.: R$ 150,00 ou Sem custo previsto') +
          '<p class="cndq-meta">A ação vira uma atividade em Minhas atividades para o responsável, com o prazo, e aparece em "Atividades do módulo".</p>' + rodape('cndqPlOk', 'Criar o plano'));
        if (ligadas[0]) document.getElementById('cndqPlAnalise').value = ligadas[0].ID;
        document.getElementById('cndqPlOk').onclick = function () {
          var p = { ocorrenciaId: oc ? oc.ID : '', tipoCodigo: oc ? oc.TIPO_CODIGO : (o.tipoCodigo || getValue_('cndqPlCod')), analiseId: getValue_('cndqPlAnalise'), oQue: getValue_('cndqPlOque'), porQue: getValue_('cndqPlPorque'),
            onde: getValue_('cndqPlOnde'), quando: getValue_('cndqPlQuando'), quemId: getValue_('cndqPlQuem'), como: getValue_('cndqPlComo'), quanto: getValue_('cndqPlQuanto') };
          if (!p.quemId) return erroNoModal('escolha o responsável (Quem)');
          if (!p.quando) return erroNoModal('informe o prazo (Quando)');
          api('apiCriarPlanoAcao', p, function (r) { tplConduta_fecharModal_(); Q.sub = 'planos'; Q.planoFoco = r.id; renderQualidade(); setTimeout(function () { aviso(r.message); }, 600); }, erroNoModal, true);
        };
      };
      if (Q.dados.planos) abrirForm(analises); else api('apiListarPlanos', {}, function (r) { Q.dados.planos = r; abrirForm(r.analises || []); });
    });
  }

  // Análises de causa -------------------------------------------------
  var ISH = { METODO: 'Método', MAO_DE_OBRA: 'Mão de obra', MATERIAL: 'Material', MAQUINA: 'Máquina', MEDIDA: 'Medida', MEIO_AMBIENTE: 'Meio ambiente' };
  function renderAnalises() {
    var s = sub(); if (!s) return;
    carregarPlanos(function (r) {
      if (Q.sub !== 'analises' || !sub()) return;
      s.innerHTML = '<div class="cndq-filtros">' + (r.podeGerir ? '<button type="button" class="conduta-btn" id="cndqNovaAnalise">+ Nova análise de causa</button>' : '') + '</div>' +
        '<div class="cndq-faixa">5 Porquês: escreva o problema e pergunte "por quê?" até chegar a uma causa que a empresa controla (processo, treinamento, ferramenta). Ishikawa (opcional) organiza as causas em 6M: método, mão de obra, material, máquina, medida e meio ambiente.</div>' +
        (r.analises.length ? '<div class="cndq-lista">' + r.analises.map(function (a) {
          return '<div class="cndq-cartao"><h4>' + esc(a.TIPO_CODIGO) + (a.OCORRENCIA_ID ? ' · ocorrência' : ' · código recorrente') + '</h4><div class="cndq-meta">' + esc(a.REGISTRADO_POR_NOME) + ' · ' + esc(dataBr(a.ATUALIZADO_EM || a.CRIADO_EM)) + '</div>' +
            '<div><b>Problema:</b> ' + esc(a.PROBLEMA) + '</div><ol style="margin:4px 0 4px 18px;padding:0">' + a.PORQUES.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' +
            '<div><b>Causa raiz:</b> ' + esc(a.CAUSA_RAIZ) + '</div>' +
            (Object.keys(a.ISHIKAWA || {}).length ? '<div style="margin-top:4px">' + Object.keys(a.ISHIKAWA).map(function (k) { return '<span class="cndq-chip">' + esc(ISH[k] || k) + '</span> ' + esc(a.ISHIKAWA[k]); }).join('<br>') + '</div>' : '') +
            (r.podeGerir ? '<div class="cndq-acoes"><button type="button" class="conduta-btn cinza" data-an-editar="' + esc(a.ID) + '">Editar</button><button type="button" class="conduta-btn" data-plano-cod="' + esc(a.TIPO_CODIGO) + '">Criar plano</button></div>' : '') + '</div>';
        }).join('') + '</div>' : '<div class="conduta-vazio">Nenhuma análise de causa registrada.</div>');
      var bn = document.getElementById('cndqNovaAnalise'); if (bn) bn.onclick = function () { abrirAnalise({}); };
      s.querySelectorAll('[data-an-editar]').forEach(function (b) { b.onclick = function () { abrirAnalise({ id: b.getAttribute('data-an-editar') }); }; });
      ligarAcoesCartao(s);
    });
  }
  function abrirAnalise(o) {
    var montar = function (lista) {
      var a = o.id ? lista.filter(function (x) { return x.ID === o.id; })[0] : (o.ocorrenciaId ? lista.filter(function (x) { return x.OCORRENCIA_ID === o.ocorrenciaId; })[0] : null);
      var oc = o.ocorrenciaId ? ocorrenciaDoKanban(o.ocorrenciaId) : null;
      a = a || { PORQUES: [], ISHIKAWA: {} };
      var cab = oc ? 'Ocorrência ' + oc.TIPO_CODIGO + ' — ' + oc.TIPO_DESCRICAO + ' (' + oc.COLABORADOR_NOME + ', ' + dataBr(oc.DATA_FATO) + ')' : (a.TIPO_CODIGO || o.tipoCodigo ? 'Código ' + (a.TIPO_CODIGO || o.tipoCodigo) : '');
      tplConduta_abrirModal_(a.ID ? 'Editar a análise de causa' : 'Análise de causa (5 Porquês)',
        (cab ? '<div class="cndq-faixa">' + esc(cab) + '</div>' : campoSelect('cndqAnCod', 'Código do catálogo', opcoesCatalogo(''))) +
        campoArea('cndqAnProb', 'Problema (o que aconteceu, onde, quantas vezes)', a.PROBLEMA || '') +
        [0, 1, 2, 3, 4].map(function (i) { return campoTexto('cndqAnPq' + i, (i + 1) + 'º por quê' + (i >= 3 ? ' (opcional)' : ''), a.PORQUES[i] || '', i === 0 ? 'Por que o problema aconteceu?' : 'Por que a resposta anterior aconteceu?'); }).join('') +
        campoArea('cndqAnCausa', 'Causa raiz', a.CAUSA_RAIZ || '') +
        '<details' + (Object.keys(a.ISHIKAWA || {}).length ? ' open' : '') + '><summary style="cursor:pointer;font-weight:700;font-size:12.5px;margin:6px 0">Ishikawa (6M), opcional</summary>' +
          Object.keys(ISH).map(function (k) { return campoTexto('cndqAnIsh_' + k, ISH[k], (a.ISHIKAWA || {})[k] || ''); }).join('') + '</details>' +
        rodape('cndqAnOk', 'Salvar a análise'));
      document.getElementById('cndqAnOk').onclick = function () {
        var ish = {}; Object.keys(ISH).forEach(function (k) { ish[k] = getValue_('cndqAnIsh_' + k); });
        var p = { id: a.ID || '', ocorrenciaId: o.ocorrenciaId || a.OCORRENCIA_ID || '', tipoCodigo: a.TIPO_CODIGO || o.tipoCodigo || getValue_('cndqAnCod'), problema: getValue_('cndqAnProb'),
          porques: [0, 1, 2, 3, 4].map(function (i) { return getValue_('cndqAnPq' + i); }), causaRaiz: getValue_('cndqAnCausa'), ishikawa: ish };
        api('apiSalvarAnaliseCausa', p, function (r) { tplConduta_fecharModal_(); Q.dados.planos = null; renderQualidade(); setTimeout(function () { aviso(r.message); }, 600); }, erroNoModal, true);
      };
    };
    base(function () { if (Q.dados.planos) montar(Q.dados.planos.analises || []); else api('apiListarPlanos', {}, function (r) { Q.dados.planos = r; montar(r.analises || []); }); });
  }

  // Indicadores -------------------------------------------------------
  function renderIndicadores() {
    var s = sub(); if (!s) return;
    api('apiIndicadoresQualidade', { dias: Q.filtros.dias }, function (r) {
      if (Q.sub !== 'indicadores' || !sub()) return;
      Q.dados.ind = r;
      var colunas = [['pessoas', 'Pessoas', function (a) { return num(a.pessoas); }], ['registradas', 'Registradas', function (a) { return num(a.registradas); }], ['firmes', 'Firmes', function (a) { return num(a.firmes); }],
        ['reinc', 'Reincidência', function (a) { return pct(a.reincidenciaPct); }], ['tempo', 'Tempo de homologação (dias úteis)', function (a) { return num(a.tempoMedioHomologacao, 1); }],
        ['noPrazo', 'Homologadas no prazo', function (a) { return pct(a.homologacaoNoPrazoPct); }], ['desc', 'Descartadas por prazo', function (a) { return num(a.descartadasPrazo); }],
        ['planos', 'Planos (concluídos/total)', function (a) { return num(a.planosConcluidos) + '/' + num(a.planos); }], ['planosPct', '% planos concluídos', function (a) { return pct(a.planosConcluidosPct); }],
        ['atras', 'Planos atrasados', function (a) { return num(a.planosAtrasados); }], ['efic', 'Eficácia', function (a) { return pct(a.eficaciaPct); }], ['sug', 'Sugestões pendentes', function (a) { return num(a.sugestoesPendentes); }]];
      var linhas = r.areas.concat([r.total]);
      s.innerHTML = filtrosPeriodo('cndqIndDias', '', '') +
        (r.semArea ? '<div class="cndq-faixa alerta">' + num(r.semArea) + ' pessoa(s) ativa(s) sem área: elas aparecem em "Sem área definida". Corrija em Administração > Usuários > Áreas. <button type="button" class="conduta-btn cinza" id="cndqIrAreas">Abrir Usuários</button></div>' : '') +
        '<div class="cndq-faixa">Período: desde ' + esc(dataBr(r.desde)) + ' (pela data do fato). Reincidência = firmes que repetem o mesmo código da mesma pessoa na janela do programa. Tempo de homologação = dias úteis do registro à homologação. Eficácia = planos verificados como eficazes.</div>' +
        '<div class="cndq-tabela-wrap" style="overflow-x:auto"><table class="cndq-tabela-ind"><thead><tr><th>Área</th>' + colunas.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          linhas.map(function (a, i) { return '<tr' + (i === linhas.length - 1 ? ' style="font-weight:700"' : '') + '><td>' + esc(a.nome) + '</td>' + colunas.map(function (c) { return '<td>' + c[2](a) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="cndq-ind-cartoes">' + linhas.map(function (a) { return '<div class="cndq-cartao"><h4>' + esc(a.nome) + '</h4>' + colunas.map(function (c) { return '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc(c[1]) + '</span><b>' + c[2](a) + '</b></div>'; }).join('') + '</div>'; }).join('') + '</div>' +
        '<h4 style="margin:16px 0 6px">Códigos recorrentes (' + num(r.minimoRecorrente) + ' ou mais firmes no período)</h4>' +
        (r.recorrentes.length ? '<div class="cndq-lista">' + r.recorrentes.map(function (c) {
          return '<div class="cndq-cartao"><h4>' + esc(c.codigo) + ' — ' + esc(c.descricao) + '</h4><div class="cndq-meta">' + num(c.firmes) + ' firmes · áreas: ' + esc(c.areas.join(', ')) + '</div>' +
            (c.planoAberto ? '<span class="cndq-chip info">Plano ' + esc(c.planoAberto) + ' em andamento</span>' : '') +
            (gestao() ? '<div class="cndq-acoes"><button type="button" class="conduta-btn cinza" data-analise-cod="' + esc(c.codigo) + '">Análise de causa</button>' + (c.planoAberto ? '' : '<button type="button" class="conduta-btn" data-plano-cod="' + esc(c.codigo) + '">Criar plano</button>') + '</div>' : '') + '</div>';
        }).join('') + '</div>' : '<div class="conduta-vazio">Nenhum código com ' + num(r.minimoRecorrente) + ' ou mais ocorrências firmes no período.</div>');
      ligarPeriodo('cndqIndDias', '', renderIndicadores);
      var ir = document.getElementById('cndqIrAreas'); if (ir) ir.onclick = function () { if (typeof abrir === 'function') abrir('usuarios'); };
      ligarAcoesCartao(s);
    }, function (m) { s.innerHTML = erroHtml(m); });
  }
}
/* eslint-enable no-undef */
