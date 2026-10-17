var QUALIDADE_CONTEUDO_MODULO = `<style>
#tplQualidadeContainer {
  color-scheme: light;
  --bg: var(--bc-bg);
  --card: var(--bc-surface);
  --panel: var(--bc-surface);
  --input: #FFFFFF;
  --text: var(--bc-text);
  --text-strong: var(--bc-text);
  --muted: var(--bc-text-3);
  --border: var(--bc-line);
  --border-strong: var(--bc-line-2);
  --accent: var(--bc-action);
  --accent-2: var(--bc-action);
  --warning: var(--bc-warn);
  --danger: var(--bc-danger);
  --success-bg: var(--bc-action-bg);
  --info-bg: var(--bc-info-bg);
  --warning-bg: var(--bc-warn-bg);
  --danger-bg: var(--bc-danger-bg);
  --shadow-soft: none;
  --radius: 6px;
  --radius-sm: 4px;
}
#tplQualidadeContainer * { box-sizing: border-box; }
#tplQualidadeContainer, #tplQualidadeContainer body {
  font-family: var(--bc-sans);
  background: transparent !important;
  color: var(--text) !important;
}
#tplQualidadeContainer .wrap { padding: 18px; }
#tplQualidadeContainer .toolbar { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
#tplQualidadeContainer .toolbar select { width: auto; flex: 0 0 auto; }
#tplQualidadeContainer .vazio-orienta { color: var(--muted); font-size: 12.5px; line-height: 1.5; margin: 6px 0 0; }
#tplQualidadeContainer .btn { border: 1px solid var(--border-strong); background: var(--input); color: var(--text); border-radius: var(--radius-sm); padding: 8px 14px; font-weight: 700; font-size: 12.5px; cursor: pointer; }
#tplQualidadeContainer .btn:hover { background: #FFFFFF; }
#tplQualidadeContainer .btn-mini { border: 1px solid var(--border-strong); background: var(--input); color: var(--text); border-radius: 6px; padding: 3px 9px; font-weight: 700; font-size: 10.5px; cursor: pointer; white-space: nowrap; }
#tplQualidadeContainer .btn-mini:hover { background: #FFFFFF; }
#tplQualidadeContainer .btn-mini.elogio { border-color: var(--bc-action-line); color: var(--accent); }
#tplQualidadeContainer .btn-mini.cobranca { border-color: var(--bc-danger-line); color: var(--danger); }

#tplQualidadeContainer .secao-titulo { font-size: 14px; color: var(--text-strong); font-weight: 700; margin: 22px 0 10px; }
#tplQualidadeContainer .secao-titulo:first-child { margin-top: 0; }

#tplQualidadeContainer .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
#tplQualidadeContainer .panel {
  background: #FFFFFF !important; border-radius: var(--radius); padding: 16px 18px;
  box-shadow: var(--shadow-soft); border: 1px solid var(--border);
}
#tplQualidadeContainer .panel h2 {
  margin: 0 0 4px; font-size: 13.5px; color: var(--text-strong) !important;
  display: flex; align-items: center; gap: 8px;
}
#tplQualidadeContainer .panel .fonte { margin: 0 0 12px; color: var(--muted); font-size: 11.5px; }
#tplQualidadeContainer .stat-row { display: flex; align-items: baseline; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
#tplQualidadeContainer .stat-row:last-child { border-bottom: none; }
#tplQualidadeContainer .stat-num { font-size: 20px; font-weight: 800; color: var(--text-strong); min-width: 40px; }
#tplQualidadeContainer .stat-num.ok { color: var(--accent); }
#tplQualidadeContainer .stat-num.alerta { color: var(--warning); }
#tplQualidadeContainer .stat-num.critico { color: var(--danger); }
#tplQualidadeContainer .stat-label { color: var(--muted); font-size: 12.5px; }

#tplQualidadeContainer .rank-list { list-style: none; margin: 0; padding: 0; }
#tplQualidadeContainer .rank-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 12.5px; }
#tplQualidadeContainer .rank-item:last-child { border-bottom: none; }
#tplQualidadeContainer .rank-info { flex: 1; min-width: 0; }
#tplQualidadeContainer .rank-nome { color: var(--text); display: block; }
#tplQualidadeContainer .rank-qtd { color: var(--text-strong); font-weight: 700; white-space: nowrap; }
#tplQualidadeContainer .rank-sub { color: var(--danger); font-size: 11px; display: block; }
#tplQualidadeContainer .rank-badge { color: var(--warning); font-size: 10.5px; font-weight: 700; }

#tplQualidadeContainer .lista-amostra { margin: 10px 0 0; padding: 0; list-style: none; font-size: 12px; color: var(--muted); }
#tplQualidadeContainer .lista-amostra li { padding: 4px 0; border-top: 1px dashed var(--border); }
#tplQualidadeContainer .vazio { color: var(--accent); font-size: 12.5px; padding: 4px 0; }
#tplQualidadeContainer .indisponivel { color: var(--muted); font-size: 13px; font-style: italic; }
#tplQualidadeContainer .badge-tag { display: inline-block; background: var(--danger-bg); color: var(--bc-danger); border-radius: 999px; padding: 1px 8px; font-size: 10.5px; font-weight: 700; margin-left: 4px; margin-top: 3px; }

#tplQualidadeContainer .modal-overlay-q { display: none; position: fixed; inset: 0; background: rgba(28,31,29,.42); z-index: 99997; align-items: center; justify-content: center; padding: 20px; }
#tplQualidadeContainer .modal-overlay-q.aberto { display: flex; }
#tplQualidadeContainer .modal-q { background: #FFFFFF; border: 1px solid var(--border); border-radius: 12px; max-width: 480px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 20px; box-shadow: 0 20px 60px rgba(28,31,29,0.1); }
#tplQualidadeContainer .modal-q h3 { margin: 0 0 4px; font-size: 15px; color: var(--text-strong); }
#tplQualidadeContainer .modal-q .muted { color: var(--muted); font-size: 12px; margin-bottom: 14px; }
#tplQualidadeContainer .modal-q label { display: block; font-size: 11.5px; color: var(--muted); font-weight: 700; margin: 10px 0 4px; }
#tplQualidadeContainer .modal-q select, #tplQualidadeContainer .modal-q textarea {
  width: 100%; background: var(--input); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; font-family: inherit;
}
#tplQualidadeContainer .modal-q textarea { min-height: 90px; resize: vertical; }
#tplQualidadeContainer .modal-q .modal-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
#tplQualidadeContainer .modal-q .btn-cancelar { background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: var(--radius-sm); padding: 8px 14px; cursor: pointer; }
#tplQualidadeContainer .modal-q .btn-salvar { background: var(--accent); color: #FFFFFF; border: none; border-radius: var(--radius-sm); padding: 8px 16px; font-weight: 700; cursor: pointer; }

#tplQualidadeContainer table.tabela-ocorrencias { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
#tplQualidadeContainer table.tabela-ocorrencias th, #tplQualidadeContainer table.tabela-ocorrencias td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
#tplQualidadeContainer table.tabela-ocorrencias th { color: var(--muted); font-weight: 700; }
#tplQualidadeContainer .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
#tplQualidadeContainer .pill.COBRANCA { background: var(--danger-bg); color: var(--bc-danger); }
#tplQualidadeContainer .pill.ELOGIO { background: var(--success-bg); color: var(--bc-text-2); }
#tplQualidadeContainer .pill.OBSERVACAO { background: var(--info-bg); color: var(--bc-info); }
#tplQualidadeContainer .pill.ABERTA { background: var(--warning-bg); color: var(--bc-warn); }
#tplQualidadeContainer .pill.RESOLVIDA { background: var(--success-bg); color: var(--bc-text-2); }

@media (max-width: 640px) {
  #tplQualidadeContainer .wrap { padding: 10px; }
  #tplQualidadeContainer .grid { grid-template-columns: 1fr; }
}
</style>
<script>
var QUALIDADE_API_EM_VOO = {};
function tplQualidade_chamarApi(fn, payload) {
  var altera=/Registrar|Resolver|Gerar|Marcar/.test(fn);
  if(altera&&QUALIDADE_API_EM_VOO[fn])return Promise.reject(new Error('Esta ação já está sendo processada. Aguarde a conclusão.'));
  if(altera)QUALIDADE_API_EM_VOO[fn]=true;
  return new Promise(function(resolve, reject) {
    if (typeof SGO_iniciarCarregamento_ === 'function') SGO_iniciarCarregamento_(altera?'Aguarde, gerando ou salvando...':'Aguarde, carregando o Painel da Qualidade...');
    google.script.run
      .withSuccessHandler(function(res) { if(altera)delete QUALIDADE_API_EM_VOO[fn];if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); resolve(res); })
      .withFailureHandler(function(err) { if(altera)delete QUALIDADE_API_EM_VOO[fn];if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); reject(err); })
      .Qualidade_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  });
}

function tplQualidade_esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// 16/10/2026: números no padrão brasileiro (1.234,56) em todo o painel.
function tplQualidade_num_(v, casas) {
  var n = Number(v);
  if (!isFinite(n)) return '-';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 });
}

// Fase 2 (16/10): plural de acordo com o número (sem "(s)" / "(ões)").
function tplQualidade_pl_(n, um, varios) { return (Number(n) === 1 ? um : varios); }

function tplQualidade_renderReal_() {
  var container = document.getElementById('tplQualidadeContainer');
  if (!container) return;
  // 16/10/2026: o painel é da gestão (o servidor recusa os outros perfis). Antes a
  // tela abria com os botões e só mostrava "Erro: acesso restrito" no corpo.
  var perfilQ = (typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil) ? String(USER_CONTEXT.perfil).toUpperCase() : '';
  if (['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(perfilQ) === -1) {
    container.innerHTML = '<div class="wrap"><div class="panel"><h2>Painel de qualidade</h2>' +
      '<p class="rank-sub">Este painel é usado pela gestão (Gestor, Administrador e Diretoria) para acompanhar a qualidade dos atendimentos e da frota. ' +
      'Cobranças e reconhecimentos registrados aqui aparecem para você ao entrar no SGO+, na janela de avisos. Em caso de dúvida, fale com o seu gestor.</p></div></div>';
    return;
  }
  container.innerHTML =
    '<div class="wrap">' +
      '<div class="toolbar">' +
        '<select id="tplQualidade_periodoRelatorio" class="btn" style="cursor:default" onchange="tplQualidade_carregar_()">' +
          '<option value="7">Últimos 7 dias</option>' +
          '<option value="30" selected>Últimos 30 dias</option>' +
          '<option value="90">Últimos 90 dias</option>' +
        '</select>' +
        '<button type="button" class="btn" onclick="tplQualidade_gerarRelatorio_()">Gerar relatório A4</button>' +
        '<button type="button" class="btn" onclick="tplQualidade_abrirHistorico_()">Histórico de cobranças e elogios</button>' +
        '<button type="button" class="btn" onclick="tplQualidade_carregar_()">Atualizar</button>' +
      '</div>' +
      '<div id="tplQualidade_corpo"><p class="indisponivel">Carregando...</p></div>' +
      '<div class="modal-overlay-q" id="tplQualidade_modalOcorrencia"></div>' +
      '<div class="modal-overlay-q" id="tplQualidade_modalHistorico"></div>' +
    '</div>';
  tplQualidade_carregar_();
}

function tplQualidade_carregar_() {
  var corpo = document.getElementById('tplQualidade_corpo');
  if (corpo) corpo.innerHTML = '<p class="indisponivel">Carregando...</p>';
  var sel=document.getElementById('tplQualidade_periodoRelatorio'),periodoDias=sel?Number(sel.value):30;
  tplQualidade_chamarApi('apiObterPainel', {periodoDias:periodoDias})
    .then(function(res) {
      if (!res || !res.ok) { if (corpo) corpo.innerHTML = '<p class="indisponivel">Não foi possível carregar o painel. Clique em Atualizar; se continuar, avise o administrador.</p>'; return; }
      var r=res.resumo||{},saude=r.areasIndisponiveis?'<span class="stat-num critico">'+r.areasIndisponiveis+'</span> '+tplQualidade_pl_(r.areasIndisponiveis,'integração com falha','integrações com falha'):(res.auvoConfigurado===false?'<span class="stat-num alerta">!</span> Auvo: conexão não configurada — peça ao administrador (Chaves e senhas)':'<span class="stat-num ok">OK</span> integrações respondendo');
      var falhas=(res.auvo&&res.auvo.indisponivel?'<div class="panel"><h2>Auvo indisponível</h2><p class="rank-sub">'+tplQualidade_esc(res.auvo.erro||'Falha não identificada')+'</p></div>':'')+(res.frota&&res.frota.indisponivel?'<div class="panel"><h2>Frota indisponível</h2><p class="rank-sub">'+tplQualidade_esc(res.frota.erro||'Falha não identificada')+'</p></div>':'');
      if (corpo) corpo.innerHTML =
        '<div class="secao-titulo">Visão executiva — últimos '+res.periodoDias+' dias</div><div class="grid"><div class="panel"><h2>Itens que exigem ação</h2><div class="stat-row"><span class="stat-num '+(r.pendencias?'critico':'ok')+'">'+(r.pendencias||0)+'</span><span class="stat-label">pendências detectadas nas fontes</span></div><div class="stat-row">'+saude+'</div><p class="fonte">Atualizado em '+tplQualidade_esc(res.geradoEm)+'</p></div><div class="panel"><h2>Volume analisado</h2><div class="stat-row"><span class="stat-num">'+(r.atendimentos||0)+'</span><span class="stat-label">atendimentos Auvo</span></div><div class="stat-row"><span class="stat-num">'+(r.movimentacoes||0)+'</span><span class="stat-label">movimentações da Frota</span></div></div>'+falhas+'</div>'+
        '<div class="secao-titulo">Auvo — técnicos e atendimentos</div>' +
        '<div class="grid">' + tplQualidade_montarAuvo_(res.auvo) + '</div>' +
        '<div class="secao-titulo">Frota — veículos e condutores</div>' +
        '<div class="grid">' + tplQualidade_montarFrota_(res.frota) + '</div>';
    })
    .catch(function(err) {
      if (corpo) corpo.innerHTML = '<p class="indisponivel">Não foi possível carregar o painel: ' + tplQualidade_esc(String(err && err.message ? err.message : err).replace(/[.\\s]+$/, '')) + '. Clique em Atualizar; se continuar, avise o administrador.</p>';
    });
}

function tplQualidade_gerarRelatorio_() {
  var sel = document.getElementById('tplQualidade_periodoRelatorio');
  var periodoDias = sel ? Number(sel.value) : 30;

  var janela = window.open('', '_blank');
  if (janela) {
    janela.document.write('<html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#555">' +
      '<h2>Gerando relatório...</h2><p>Isso pode levar até 1 minuto (a IA está escrevendo a interpretação).</p></body></html>');
  }

  tplQualidade_chamarApi('apiGerarRelatorio', { periodoDias: periodoDias })
    .then(function(res) {
      if (!janela || janela.closed) { alert('A janela do relatório foi fechada antes de terminar. Tente de novo.'); return; }
      janela.document.open();
      janela.document.write(res.html);
      janela.document.close();
    })
    .catch(function(err) {
      if (janela && !janela.closed) {
        janela.document.write('<p style="color:#a3261b;font-family:sans-serif;padding:40px">Não foi possível gerar o relatório: ' + tplQualidade_esc(String(err && err.message ? err.message : err).replace(/[.\\s]+$/, '')) + '. Feche esta aba e tente de novo; se continuar, avise o administrador.</p>');
      }
    });
}

function tplQualidade_rankLista_(itens, montarLinha) {
  if (!itens || !itens.length) return '<p class="vazio">Sem dado suficiente.</p>';
  return '<ul class="rank-list">' + itens.map(montarLinha).join('') + '</ul>';
}

// Usa a entidade HTML &#39; (o navegador decodifica pra aspas simples ANTES
// de rodar o onclick) em vez de escapar aspas com backslash dentro da
// string JS que monta o HTML — evita depender de escaping de barra
// invertida sobrevivendo intacto até o navegador (achado real 2026-08-28:
// alguma etapa do deploy estava comendo os backslashes no meio do caminho).
function tplQualidade_botaoOcorrencia_(area, pessoaTipo, id, nome, tipo, rotulo) {
  var q = '&#39;';
  var idSeguro = tplQualidade_esc(id || '').replace(/'/g, '&#39;');
  var nomeSeguro = tplQualidade_esc(nome || '').replace(/'/g, '&#39;');
  return '<button type="button" class="btn-mini ' + (tipo === 'ELOGIO' ? 'elogio' : 'cobranca') + '" ' +
    'onclick="tplQualidade_abrirModalOcorrencia_(' + q + area + q + ',' + q + pessoaTipo + q + ',' + q + idSeguro + q + ',' + q + nomeSeguro + q + ',' + q + tipo + q + ')">' + rotulo + '</button>';
}

// ------------------------------------------------------------
// AUVO
// ------------------------------------------------------------
function tplQualidade_montarAuvo_(a) {
  if (!a || !a.total) {
    return '<div class="panel"><h2>Atendimentos do Auvo</h2><p class="indisponivel">Nenhum atendimento do Auvo no período.</p>' +
      '<p class="vazio-orienta">Os atendimentos chegam pela sincronização automática (Integração Auvo › Sincronização automática de tarefas). Se ela estiver desligada, ligue-a lá ou clique em Sincronizar agora.</p></div>';
  }
  var classeRelato = a.pctSemRelato >= 30 ? 'critico' : (a.pctSemRelato > 0 ? 'alerta' : 'ok');
  var classeFoto = a.pctSemFoto >= 30 ? 'critico' : (a.pctSemFoto > 0 ? 'alerta' : 'ok');
  var classeCheckin = a.pctSemCheckin >= 20 ? 'critico' : (a.pctSemCheckin > 0 ? 'alerta' : 'ok');
  var classeQuestionario = a.pctQuestionarioVazio >= 20 ? 'critico' : (a.pctQuestionarioVazio > 0 ? 'alerta' : 'ok');
  var classeCheckout = a.finalizadasSemCheckout > 0 ? 'alerta' : 'ok';
  var classeVinculo = a.semVinculo > 0 ? 'alerta' : 'ok';

  var painelResumo = '<div class="panel">' +
    '<h2>Preenchimento — ' + a.total + ' ' + tplQualidade_pl_(a.total, 'atendimento', 'atendimentos') + '</h2>' +
    '<p class="fonte">' + a.finalizadas + ' ' + tplQualidade_pl_(a.finalizadas, 'finalizado', 'finalizados') + '</p>' +
    '<div class="stat-row"><span class="stat-num ' + classeRelato + '">' + a.pctSemRelato + '%</span><span class="stat-label">sem relato de serviço</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeFoto + '">' + a.pctSemFoto + '%</span><span class="stat-label">sem nenhuma foto anexada</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeQuestionario + '">' + a.pctQuestionarioVazio + '%</span><span class="stat-label">com o questionário 100% vazio</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeCheckin + '">' + a.pctSemCheckin + '%</span><span class="stat-label">sem check-in registrado</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeCheckout + '">' + a.finalizadasSemCheckout + '</span><span class="stat-label">' + tplQualidade_pl_(a.finalizadasSemCheckout, 'finalizada sem check-out', 'finalizadas sem check-out') + '</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeVinculo + '">' + a.semVinculo + '</span><span class="stat-label">sem cliente ou técnico vinculado no SGO+</span></div>' +
  '</div>';

  var painelPior = '<div class="panel">' +
    '<h2>Registros incompletos por técnico</h2>' +
    '<p class="fonte">3+ atendimentos, pior % primeiro</p>' +
    tplQualidade_rankLista_(a.rankingPiorQualidade, function(r) {
      return '<li class="rank-item"><div class="rank-info"><span class="rank-nome">' + tplQualidade_esc(r.nome) + ' (' + r.qtd + ')</span>' +
        '<span class="rank-sub">' + r.pctSemRelato + '% sem relato · ' + r.pctSemFoto + '% sem foto' +
        (r.ocorrenciasAbertas ? ' · <span class="rank-badge">' + r.ocorrenciasAbertas + ' ' + tplQualidade_pl_(r.ocorrenciasAbertas, 'cobrança aberta', 'cobranças abertas') + '</span>' : '') + '</span></div>' +
        tplQualidade_botaoOcorrencia_('AUVO', 'TECNICO', r.id, r.nome, 'COBRANCA', 'Cobrar') + '</li>';
    }) +
  '</div>';

  var painelDestaques = '<div class="panel">' +
    '<h2>Atendimentos 100% completos</h2>' +
    '<p class="fonte">3+ atendimentos, sempre com relato e foto</p>' +
    tplQualidade_rankLista_(a.rankingDestaques, function(r) {
      return '<li class="rank-item"><div class="rank-info"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span></div>' +
        '<span class="rank-qtd">' + r.qtd + '</span>' +
        tplQualidade_botaoOcorrencia_('AUVO', 'TECNICO', r.id, r.nome, 'ELOGIO', 'Parabenizar') + '</li>';
    }) +
  '</div>';

  var painelVolume = '<div class="panel">' +
    '<h2>Técnicos com mais atendimentos</h2>' +
    '<p class="fonte">ranking por volume de atendimentos</p>' +
    tplQualidade_rankLista_(a.rankingVolume, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
    }) +
  '</div>';

  var painelTempo = '<div class="panel">' +
    '<h2>Tempo de atendimento</h2>' +
    '<p class="fonte">check-in → check-out, média em minutos (extremos)</p>' +
    (a.tempoRapidos && a.tempoRapidos.length ? '<p class="fonte" style="margin-bottom:2px">Mais rápidos:</p>' + tplQualidade_rankLista_(a.tempoRapidos, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.mediaMin + ' min</span></li>';
    }) : '') +
    (a.tempoLentos && a.tempoLentos.length ? '<p class="fonte" style="margin:8px 0 2px">Mais demorados:</p>' + tplQualidade_rankLista_(a.tempoLentos, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.mediaMin + ' min</span></li>';
    }) : '') +
    ((!a.tempoRapidos || !a.tempoRapidos.length) && (!a.tempoLentos || !a.tempoLentos.length) ? '<p class="vazio">Sem dado suficiente (precisa de check-in e check-out).</p>' : '') +
  '</div>';

  var painelPendencias = '<div class="panel"><h2>Pendências identificadas por O.S.</h2><p class="fonte">Mostra exatamente o que precisa ser corrigido</p>' + ((a.pendenciasDetalhadas||[]).length?'<ul class="lista-amostra">'+a.pendenciasDetalhadas.slice(0,15).map(function(p){return '<li><strong>O.S. '+tplQualidade_esc(p.os||'sem número')+'</strong> — '+tplQualidade_esc(p.tecnico)+' / '+tplQualidade_esc(p.cliente)+'<br><span class="rank-sub">'+tplQualidade_esc((p.motivos||[]).join('; '))+'</span>'+(p.link?' <a href="'+tplQualidade_esc(p.link)+'" target="_blank">Abrir O.S.</a>':'')+'</li>';}).join('')+'</ul>':'<p class="vazio">Nenhuma pendência nas O.S. finalizadas.</p>')+'</div>';

  var painelTipos = '<div class="panel">' +
    '<h2>Tipos mais atendidos</h2>' +
    '<p class="fonte">top 3</p>' +
    tplQualidade_rankLista_(a.tiposMaisComuns, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.tipo) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
    }) +
  '</div>';

  var painelClientes = '<div class="panel">' +
    '<h2>Clientes mais atendidos</h2>' +
    '<p class="fonte">top 5 por volume</p>' +
    tplQualidade_rankLista_(a.clientesMaisAtendidos, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
    }) +
  '</div>';

  return painelResumo + painelPendencias + painelPior + painelDestaques + painelVolume + painelTempo + painelTipos + painelClientes;
}

// ------------------------------------------------------------
// FROTA
// ------------------------------------------------------------
function tplQualidade_montarCnh_(f) {
  if (!f || !(f.cnhVencidas || f.cnhVencendo)) return '';
  var lista = (f.amostraCnh || []).map(function(c) {
    return '<li>' + tplQualidade_esc(c.condutorNome || '?') + ' — CNH ' + (c.status === 'VENCIDO' ? 'vencida' : 'vencendo') + ' em ' + tplQualidade_esc(c.vencimento || '?') + '</li>';
  }).join('');
  return '<div class="panel"><h2>CNH dos condutores</h2>' +
    '<div class="stat-row"><span class="stat-num ' + (f.cnhVencidas ? 'critico' : 'alerta') + '">' + (f.cnhVencidas || 0) + '</span><span class="stat-label">' + tplQualidade_pl_(f.cnhVencidas || 0, 'CNH vencida', 'CNHs vencidas') + ' · ' + (f.cnhVencendo || 0) + ' vencendo em 30 dias</span></div>' +
    (lista ? '<ul class="lista-amostra">' + lista + '</ul>' : '') + '<p class="fonte">Atualize a validade em Frota &gt; Condutores.</p></div>';
}

function tplQualidade_montarDocsMultasSemUso_(f) {
  return '<div class="panel"><h2>Documentos e multas</h2>' +
    '<div class="stat-row"><span class="stat-num ' + (f.documentosVencidos ? 'critico' : 'ok') + '">' + (f.documentosVencidos || 0) + '</span><span class="stat-label">' + tplQualidade_pl_(f.documentosVencidos || 0, 'documento vencido', 'documentos vencidos') + ' · ' + (f.documentosVencendo || 0) + ' vencendo</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + (f.multasSemCondutor ? 'critico' : 'ok') + '">' + (f.multasAbertas || 0) + '</span><span class="stat-label">' + tplQualidade_pl_(f.multasAbertas || 0, 'multa aberta', 'multas abertas') + ' · ' + (f.multasSemCondutor || 0) + ' sem condutor</span></div></div>';
}

function tplQualidade_montarFrota_(f) {
  // 16/10/2026: sem retirada no período o bloco sumia junto com CNH, documentos
  // e multas (que não dependem de retirada). Agora só o resumo de uso fica vazio.
  var cnh = tplQualidade_montarCnh_(f);
  if (!f || !f.totalMovimentacoes) {
    return '<div class="panel"><h2>Uso da frota</h2><p class="indisponivel">Nenhuma retirada ou devolução no período.</p>' +
      '<p class="vazio-orienta">As retiradas e devoluções são registradas na Frota (aba Situação e retiradas). Para ver outro intervalo, troque o período acima.</p></div>' + cnh +
      (f && (f.documentosVencidos || f.documentosVencendo || f.multasAbertas) ? tplQualidade_montarDocsMultasSemUso_(f) : '');
  }
  var classeIncompletas = f.totalIncompletas > 0 ? 'alerta' : 'ok';
  var classePendurada = f.viagensPenduradas > 0 ? 'critico' : 'ok';
  var classeMultaSemCondutor = f.multasSemCondutor > 0 ? 'critico' : 'ok';
  var classeDocVencido = f.documentosVencidos > 0 ? 'critico' : (f.documentosVencendo > 0 ? 'alerta' : 'ok');

  var amostraIncompletas = (f.amostraIncompletas || []).map(function(m) {
    var tags = (m.motivos || []).map(function(motivo) { return '<span class="badge-tag">' + tplQualidade_esc(motivo) + '</span>'; }).join('');
    return '<li>' + tplQualidade_esc(m.veiculoPlaca || '?') + ' · ' + tplQualidade_esc(m.condutorNome || '?') + ' — saída ' + tplQualidade_esc(m.dataSaida || '?') + tags + '</li>';
  }).join('');

  var amostraPenduradas = (f.amostraPenduradas || []).map(function(v) {
    return '<li>' + tplQualidade_esc(v.veiculoPlaca || '?') + ' · ' + tplQualidade_esc(v.condutorNome || '?') + ' — saiu ' + tplQualidade_esc(v.dataSaida || '?') + ', há ' + v.dias + ' ' + tplQualidade_pl_(v.dias, 'dia', 'dias') + '</li>';
  }).join('');

  var amostraDocumentos = (f.amostraDocumentos || []).map(function(d) {
    return '<li>' + tplQualidade_esc(d.veiculoPlaca || '?') + ' — ' + tplQualidade_esc(d.tipoLabel || '') + ' (' + (d.status === 'VENCIDO' ? 'vencido' : 'vencendo') + ' em ' + tplQualidade_esc(d.vencimento || '?') + ')</li>';
  }).join('');

  var painelResumo = '<div class="panel">' +
    '<h2>Movimentação — ' + f.totalMovimentacoes + ' ' + tplQualidade_pl_(f.totalMovimentacoes, 'retirada', 'retiradas') + '</h2>' +
    '<div class="stat-row"><span class="stat-num ' + classePendurada + '">' + f.viagensPenduradas + '</span><span class="stat-label">' + tplQualidade_pl_(f.viagensPenduradas, 'retirada aberta', 'retiradas abertas') + ' há 2 dias ou mais sem devolução</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeIncompletas + '">' + f.totalIncompletas + '</span><span class="stat-label">' + tplQualidade_pl_(f.totalIncompletas, 'retirada ou devolução', 'retiradas ou devoluções') + ' sem checklist ou sem foto</span></div>' +
    (amostraPenduradas ? '<ul class="lista-amostra">' + amostraPenduradas + '</ul>' : '') +
  '</div>';

  var painelCondutores = '<div class="panel">' +
    '<h2>Condutores com mais retiradas</h2>' +
    '<p class="fonte">ranking por retirada — badge = pendências dele</p>' +
    tplQualidade_rankLista_(f.rankingCondutores, function(r) {
      var detalhes = (r.pendenciasDetalhes || []).map(function(p) {
        return '<span class="rank-sub">' + tplQualidade_esc(p.veiculoPlaca || '?') + ' · ' + tplQualidade_esc(p.dataSaida || '?') + ': ' + tplQualidade_esc((p.motivos || []).join('; ')) + '</span>';
      }).join('');
      return '<li class="rank-item"><div class="rank-info"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span>' +
        (r.pendencias ? '<span class="rank-sub">' + r.pendencias + ' ' + tplQualidade_pl_(r.pendencias, 'movimentação com pendência', 'movimentações com pendência') + (r.ocorrenciasAbertas ? ' · <span class="rank-badge">' + r.ocorrenciasAbertas + ' ' + tplQualidade_pl_(r.ocorrenciasAbertas, 'cobrança aberta', 'cobranças abertas') + '</span>' : '') + '</span>' + detalhes : '') + '</div>' +
        '<span class="rank-qtd">' + r.qtd + '</span>' +
        (r.pendencias ? tplQualidade_botaoOcorrencia_('FROTA', 'CONDUTOR', r.id, r.nome, 'COBRANCA', 'Cobrar') : '') + '</li>';
    }) +
  '</div>';

  var painelCondutoresDestaque = '<div class="panel">' +
    '<h2>Condutores sem cobranças</h2>' +
    '<p class="fonte">3+ retiradas, zero pendência</p>' +
    tplQualidade_rankLista_(f.rankingCondutoresDestaque, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span>' +
        tplQualidade_botaoOcorrencia_('FROTA', 'CONDUTOR', r.id, r.nome, 'ELOGIO', 'Parabenizar') + '</li>';
    }) +
  '</div>';

  var painelVeiculos = '<div class="panel">' +
    '<h2>Veículos mais usados</h2>' +
    '<p class="fonte">ranking por retirada</p>' +
    tplQualidade_rankLista_(f.rankingVeiculos, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
    }) +
  '</div>';

  var painelManutencaoParadas = '<div class="panel">' +
    '<h2>Manutenção e confiabilidade</h2>' +
    '<p class="fonte">custo total de manutenção (top 5)</p>' +
    tplQualidade_rankLista_(f.rankingCustoManutencao, function(r) {
      return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">R$ ' + tplQualidade_num_(r.valor, 2) + '</span></li>';
    }) +
    (f.rankingParadasNaoPlanejadas && f.rankingParadasNaoPlanejadas.length ?
      '<p class="fonte" style="margin:10px 0 2px">Paradas por acidente/pane:</p>' + tplQualidade_rankLista_(f.rankingParadasNaoPlanejadas, function(r) {
        return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
      }) : '') +
  '</div>';

  var painelConsumo = '<div class="panel">' +
    '<h2>Consumo (km/L)</h2>' +
    '<p class="fonte">' + (f.mediaFrotaConsumo ? 'média da frota: ' + tplQualidade_num_(f.mediaFrotaConsumo, 2) + ' km/L' : 'sem dado suficiente ainda') + '</p>' +
    (f.consumoAbaixoDaMedia && f.consumoAbaixoDaMedia.length ?
      tplQualidade_rankLista_(f.consumoAbaixoDaMedia, function(r) {
        return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd stat-num alerta" style="font-size:13px;min-width:auto">' + tplQualidade_num_(r.kmPorLitro, 2) + ' km/L</span></li>';
      }) :
      (f.mediaFrotaConsumo ? '<p class="vazio">Nenhum veículo abaixo de 70% da média da frota.</p>' : '<p class="indisponivel">Precisa de pelo menos 2 abastecimentos por veículo pra calcular.</p>')) +
  '</div>';

  var painelDocsMultas = '<div class="panel">' +
    '<h2>Documentação e multas</h2>' +
    '<div class="stat-row"><span class="stat-num ' + classeDocVencido + '">' + f.documentosVencidos + '</span><span class="stat-label">' + tplQualidade_pl_(f.documentosVencidos, 'documento vencido', 'documentos vencidos') + ' (' + f.documentosVencendo + ' vencendo)</span></div>' +
    '<div class="stat-row"><span class="stat-num ' + classeMultaSemCondutor + '">' + f.multasSemCondutor + '</span><span class="stat-label">de ' + f.multasAbertas + ' ' + tplQualidade_pl_(f.multasAbertas, 'multa aberta', 'multas abertas') + ' sem condutor vinculado</span></div>' +
    (f.valorMultasAbertas ? '<p class="fonte" style="margin-top:8px">R$ ' + tplQualidade_num_(f.valorMultasAbertas, 2) + ' em multas abertas</p>' : '') +
    (f.rankingMultasCondutor && f.rankingMultasCondutor.length ?
      '<p class="fonte" style="margin:10px 0 2px">Multas por condutor:</p>' + tplQualidade_rankLista_(f.rankingMultasCondutor, function(r) {
        return '<li class="rank-item"><span class="rank-nome">' + tplQualidade_esc(r.nome) + '</span><span class="rank-qtd">' + r.qtd + '</span></li>';
      }) : '') +
    (amostraDocumentos ? '<ul class="lista-amostra">' + amostraDocumentos + '</ul>' : '') +
  '</div>';

  var painelIncompletasDetalhe = amostraIncompletas ? '<div class="panel">' +
    '<h2>Detalhes das pendências (amostra)</h2>' +
    '<ul class="lista-amostra">' + amostraIncompletas + '</ul>' +
  '</div>' : '';

  return painelResumo + cnh + painelCondutores + painelCondutoresDestaque + painelVeiculos + painelManutencaoParadas + painelConsumo + painelDocsMultas + painelIncompletasDetalhe;
}

// ------------------------------------------------------------
// MODAL — registrar ocorrência
// ------------------------------------------------------------
function tplQualidade_abrirModalOcorrencia_(area, pessoaTipo, pessoaId, pessoaNome, tipoSugerido) {
  var overlay = document.getElementById('tplQualidade_modalOcorrencia');
  if (!overlay) return;
  var opcoesTipo = ['COBRANCA', 'ELOGIO', 'OBSERVACAO'].map(function(t) {
    var rotulo = t === 'COBRANCA' ? 'Cobrança' : (t === 'ELOGIO' ? 'Elogio' : 'Observação');
    return '<option value="' + t + '"' + (t === tipoSugerido ? ' selected' : '') + '>' + rotulo + '</option>';
  }).join('');
  overlay.innerHTML =
    '<div class="modal-q">' +
      '<h3>Registrar cobrança ou elogio de campo</h3>' +
      '<p class="muted">' + tplQualidade_esc(pessoaNome) + ' · ' + tplQualidade_esc(area) + '</p>' +
      '<label>Tipo</label>' +
      '<select id="tplQualidade_oc_tipo">' + opcoesTipo + '</select>' +
      '<label>Descrição</label>' +
      '<textarea id="tplQualidade_oc_descricao" placeholder="Descreva o motivo — o que foi observado, o que se espera daqui pra frente..."></textarea>' +
      '<div id="tplQualidade_oc_status"></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-cancelar" onclick="tplQualidade_fecharModalOcorrencia_()">Cancelar</button>' +
        '<button type="button" class="btn-salvar" onclick="tplQualidade_salvarOcorrencia_(&#39;' + area + '&#39;,&#39;' + pessoaTipo + '&#39;,&#39;' + tplQualidade_esc(pessoaId).replace(/'/g, '&#39;') + '&#39;,&#39;' + tplQualidade_esc(pessoaNome).replace(/'/g, '&#39;') + '&#39;)">Salvar</button>' +
      '</div>' +
    '</div>';
  overlay.classList.add('aberto');
}

function tplQualidade_fecharModalOcorrencia_() {
  var overlay = document.getElementById('tplQualidade_modalOcorrencia');
  if (overlay) { overlay.classList.remove('aberto'); overlay.innerHTML = ''; }
}

function tplQualidade_salvarOcorrencia_(area, pessoaTipo, pessoaId, pessoaNome) {
  var tipo = document.getElementById('tplQualidade_oc_tipo').value;
  var descricao = document.getElementById('tplQualidade_oc_descricao').value;
  if (!descricao || !descricao.trim()) {
    var statusEl = document.getElementById('tplQualidade_oc_status');
    if (statusEl) statusEl.innerHTML = '<p style="color:var(--danger);font-size:12px;margin-top:6px">Descreva o motivo antes de salvar.</p>';
    return;
  }
  tplQualidade_chamarApi('apiRegistrarOcorrencia', {
    area: area, tipo: tipo, pessoaTipo: pessoaTipo, pessoaId: pessoaId, pessoaNome: pessoaNome, descricao: descricao
  }).then(function(res) {
    tplQualidade_fecharModalOcorrencia_();
    if (res && res.aviso) alert(res.aviso);
    tplQualidade_carregar_();
  }).catch(function(err) {
    var statusEl = document.getElementById('tplQualidade_oc_status');
    if (statusEl) statusEl.innerHTML = '<p style="color:var(--danger);font-size:12px;margin-top:6px">' + tplQualidade_esc(err && err.message ? err.message : err) + '</p>';
  });
}

// ------------------------------------------------------------
// MODAL — histórico de ocorrências
// ------------------------------------------------------------
function tplQualidade_abrirHistorico_() {
  var overlay = document.getElementById('tplQualidade_modalHistorico');
  if (!overlay) return;
  overlay.innerHTML =
    '<div class="modal-q" style="max-width:640px">' +
      '<h3>Histórico de cobranças e elogios de campo</h3>' +
      '<p class="muted">Cobranças, elogios e observações registrados</p>' +
      '<div class="modal-actions" style="justify-content:flex-start;margin-top:0;margin-bottom:10px">' +
        '<button type="button" class="btn-mini" onclick="tplQualidade_carregarHistorico_(&#39;&#39;)">Todas</button>' +
        '<button type="button" class="btn-mini" onclick="tplQualidade_carregarHistorico_(&#39;ABERTA&#39;)">Abertas</button>' +
        '<button type="button" class="btn-mini" onclick="tplQualidade_carregarHistorico_(&#39;RESOLVIDA&#39;)">Resolvidas</button>' +
      '</div>' +
      '<div id="tplQualidade_historicoLista"><p class="indisponivel">Carregando...</p></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-cancelar" onclick="tplQualidade_fecharHistorico_()">Fechar</button>' +
      '</div>' +
    '</div>';
  overlay.classList.add('aberto');
  tplQualidade_carregarHistorico_('');
}

function tplQualidade_fecharHistorico_() {
  var overlay = document.getElementById('tplQualidade_modalHistorico');
  if (overlay) { overlay.classList.remove('aberto'); overlay.innerHTML = ''; }
}

function tplQualidade_carregarHistorico_(status) {
  var lista = document.getElementById('tplQualidade_historicoLista');
  if (lista) lista.innerHTML = '<p class="indisponivel">Carregando...</p>';
  tplQualidade_chamarApi('apiListarOcorrencias', { status: status || '' })
    .then(function(res) {
      if (!lista) return;
      var itens = (res && res.items) || [];
      if (!itens.length) { lista.innerHTML = '<p class="vazio">Nenhuma cobrança ou elogio registrado com estes filtros. Para registrar, use os botões Cobrar e Elogiar nas listas do painel.</p>'; return; }
      var linhas = itens.map(function(o) {
        return '<tr>' +
          '<td><span class="pill ' + tplQualidade_esc(o.TIPO) + '">' + tplQualidade_esc(o.TIPO) + '</span></td>' +
          '<td>' + tplQualidade_esc(o.PESSOA_NOME) + '<br><span class="muted" style="font-size:10.5px">' + tplQualidade_esc(o.AREA) + '</span></td>' +
          '<td>' + tplQualidade_esc(o.DESCRICAO) + '</td>' +
          '<td>' + tplQualidade_esc(o.CRIADO_POR) + '</td>' +
          '<td><span class="pill ' + tplQualidade_esc(o.STATUS) + '">' + tplQualidade_esc(o.STATUS) + '</span>' +
          (o.STATUS === 'ABERTA' ? '<br><button type="button" class="btn-mini" style="margin-top:4px" onclick="tplQualidade_resolverOcorrencia_(&#39;' + o.ID + '&#39;)">Marcar resolvida</button>' : '') + '</td>' +
        '</tr>';
      }).join('');
      lista.innerHTML = '<div style="overflow-x:auto"><table class="tabela-ocorrencias">' +
        '<thead><tr><th>Tipo</th><th>Pessoa</th><th>Descrição</th><th>Por</th><th>Status</th></tr></thead>' +
        '<tbody>' + linhas + '</tbody></table></div>';
    })
    .catch(function(err) {
      if (lista) lista.innerHTML = '<p class="indisponivel">Não foi possível carregar o histórico: ' + tplQualidade_esc(String(err && err.message ? err.message : err).replace(/[.\\s]+$/, '')) + '. Feche e abra de novo; se continuar, avise o administrador.</p>';
    });
}

function tplQualidade_resolverOcorrencia_(id) {
  tplQualidade_chamarApi('apiResolverOcorrencia', { id: id })
    .then(function() { tplQualidade_carregarHistorico_(''); })
    .catch(function(err) { alert(err && err.message ? err.message : err); });
}
</script>
`;
