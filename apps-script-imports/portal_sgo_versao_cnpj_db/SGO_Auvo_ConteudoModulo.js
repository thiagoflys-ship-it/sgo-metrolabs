var AUVO_CONTEUDO_MODULO = `<style>
#tplAuvoContainer {
  color-scheme: light;
  --bg: var(--bc-bg);
  --card: var(--bc-surface);
  --panel: var(--bc-surface);
  --input: #FFFFFF;
  --input-hover: var(--bc-surface-2);
  --text: var(--bc-text);
  --text-strong: var(--bc-text);
  --muted: var(--bc-text-3);
  --muted-2: var(--bc-text-3);
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
#tplAuvoContainer * { box-sizing: border-box; }
#tplAuvoContainer, #tplAuvoContainer body {
  font-family: var(--bc-sans);
  background: transparent !important;
  color: var(--text) !important;
}
#tplAuvoContainer .wrap { max-width: 1100px; margin: 0 auto; padding: 18px; }
#tplAuvoContainer .header-card {
  background: #FFFFFF !important; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px 18px; box-shadow: var(--shadow-soft); margin-bottom: 14px;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
}
#tplAuvoContainer .title-area h1 { margin: 0; font-size: 19px; color: var(--text-strong); font-weight: 800; }
#tplAuvoContainer .title-area p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
#tplAuvoContainer .panel {
  background: #FFFFFF !important; border-radius: var(--radius); padding: 18px;
  box-shadow: var(--shadow-soft); border: 1px solid var(--border); margin-bottom: 14px;
}
#tplAuvoContainer .panel h2 {
  margin: 0 0 6px; font-size: 14px; color: var(--text-strong) !important;
  border-bottom: 1px solid var(--border); padding-bottom: 10px; text-transform: uppercase;
}
#tplAuvoContainer .muted { color: var(--muted); font-size: 12px; }
#tplAuvoContainer input[type="text"], #tplAuvoContainer input:not([type]) {
  background: var(--input) !important; color: var(--text) !important; border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 6px 8px; font-size: 12.5px;
}
#tplAuvoContainer .btn, #tplAuvoContainer .btn-primary {
  border: 1px solid var(--border-strong); background: var(--input); color: var(--text);
  border-radius: var(--radius-sm); padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: pointer; margin-top: 10px;
}
#tplAuvoContainer .btn:hover { background: var(--input-hover); }
#tplAuvoContainer .btn-primary { background: var(--accent); color: #FFFFFF; border-color: var(--accent); }
#tplAuvoContainer .btn-primary:hover { filter: brightness(1.08); }
#tplAuvoContainer .btn-sm { padding: 5px 10px; font-size: 11.5px; margin-top: 0; }
#tplAuvoContainer .alert-box { border-radius: var(--radius-sm); padding: 10px 12px; font-size: 12.5px; margin-top: 10px; }
#tplAuvoContainer .alert-box.success { background: var(--success-bg); color: var(--bc-text-2); border: 1px solid var(--bc-action-line); }
#tplAuvoContainer .alert-box.error { background: var(--danger-bg); color: var(--bc-danger); border: 1px solid var(--bc-danger-line); }
#tplAuvoContainer .alert-box.info { background: var(--info-bg); color: var(--bc-info); border: 1px solid var(--bc-info-line); }
#tplAuvoContainer .alert-box.warning { background: var(--warning-bg); color: var(--bc-warn); border: 1px solid var(--bc-warn-line); }
#tplAuvoContainer table.tabela-resultado { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
#tplAuvoContainer table.tabela-resultado th, #tplAuvoContainer table.tabela-resultado td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: middle; }
#tplAuvoContainer table.tabela-resultado th { background: #FFFFFF; color: var(--muted); font-weight: 700; }
#tplAuvoContainer .status-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
#tplAuvoContainer .status-pill.OK { background: var(--success-bg); color: var(--bc-text-2); }
#tplAuvoContainer .status-pill.ERRO { background: var(--danger-bg); color: var(--bc-danger); }
#tplAuvoContainer .status-pill.PENDENTE { background: var(--warning-bg); color: var(--bc-warn); }
#tplAuvoContainer .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; vertical-align: middle; }
#tplAuvoContainer .toggle-switch input { opacity: 0; width: 0; height: 0; }
#tplAuvoContainer .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--border-strong); border-radius: 999px; transition: .2s; }
#tplAuvoContainer .toggle-slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
#tplAuvoContainer .toggle-switch input:checked + .toggle-slider { background: var(--accent); }
#tplAuvoContainer .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }
#tplAuvoContainer .toggle-linha { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
#tplAuvoContainer .avancado-toggle-btn { background: none; border: 1px solid var(--border); color: var(--muted); }
#tplAuvoContainer .busca-linha { display: flex; gap: 8px; margin-top: 8px; }
#tplAuvoContainer .busca-linha input[type="text"] { flex: 1; }
#tplAuvoContainer select { background: var(--input) !important; color: var(--text) !important; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 12.5px; }
#tplAuvoContainer .badge-evidencia { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
#tplAuvoContainer .badge-evidencia.sim { background: var(--bc-action-bg); color: var(--bc-action); }
#tplAuvoContainer .badge-evidencia.nao { background: var(--danger-bg); color: var(--bc-danger); }
#tplAuvoContainer .tabela-acoes { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; }
#tplAuvoContainer .modal-overlay-auvo { display: none; position: fixed; inset: 0; background: rgba(28,31,29,.42); z-index: 99997; align-items: center; justify-content: center; padding: 20px; }
#tplAuvoContainer .modal-overlay-auvo.aberto { display: flex; }
#tplAuvoContainer .modal-auvo { background: #FFFFFF; border: 1px solid var(--border); border-radius: 12px; max-width: 480px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 20px; box-shadow: 0 20px 60px rgba(28,31,29,0.1); }
#tplAuvoContainer .modal-auvo h3 { margin: 0 0 4px; font-size: 15px; color: var(--text-strong); }
#tplAuvoContainer .modal-auvo .muted { color: var(--muted); font-size: 12px; margin-bottom: 14px; }
#tplAuvoContainer .modal-auvo label { display: block; font-size: 11.5px; color: var(--muted); font-weight: 700; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: .03em; }
#tplAuvoContainer .modal-auvo textarea {
  width: 100%; background: var(--input); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; font-family: inherit; min-height: 90px; resize: vertical;
}
#tplAuvoContainer .modal-auvo .modal-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
#tplAuvoContainer .modal-auvo .btn-cancelar { background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: var(--radius-sm); padding: 8px 14px; cursor: pointer; }
#tplAuvoContainer .modal-auvo .btn-salvar { background: var(--accent); color: #FFFFFF; border: none; border-radius: var(--radius-sm); padding: 8px 16px; font-weight: 700; cursor: pointer; }

#tplAuvoContainer .manual-wrap { max-width: 900px; margin: 0 auto; padding: 18px 18px 60px; line-height: 1.6; }
#tplAuvoContainer .manual-wrap h1 { font-size: 26px; margin-bottom: 4px; }
#tplAuvoContainer .manual-wrap .subtitulo { color: var(--muted); margin-top: 0; margin-bottom: 22px; }
#tplAuvoContainer .manual-wrap h2 { font-size: 19px; margin-top: 40px; padding-bottom: 8px; border-bottom: 1px solid var(--border); color: var(--text-strong); }
#tplAuvoContainer .manual-wrap h3 { font-size: 15px; margin-top: 26px; color: var(--accent-2); }
#tplAuvoContainer .manual-wrap p { color: var(--text); }
#tplAuvoContainer .manual-wrap table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 13.5px; }
#tplAuvoContainer .manual-wrap th, #tplAuvoContainer .manual-wrap td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
#tplAuvoContainer .manual-wrap th { background: #FFFFFF; color: var(--text-strong); }
#tplAuvoContainer .manual-wrap tr:nth-child(even) td { background: var(--bc-surface-2); }
#tplAuvoContainer .callout { background: var(--bc-action-bg); border: 1px solid var(--bc-action-line); border-left: 4px solid var(--accent); border-radius: var(--radius-sm); padding: 12px 14px; margin: 14px 0; font-size: 13.5px; }
#tplAuvoContainer .callout strong { color: var(--text-strong); }
#tplAuvoContainer .manual-wrap ol, #tplAuvoContainer .manual-wrap ul { padding-left: 22px; }
#tplAuvoContainer .manual-wrap ol li, #tplAuvoContainer .manual-wrap ul li { margin-bottom: 6px; }
#tplAuvoContainer .toc { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 30px; }
#tplAuvoContainer .toc h2 { margin-top: 0; border-bottom: none; font-size: 15px; }
#tplAuvoContainer .toc a { text-decoration: none; color: var(--accent-2); cursor: pointer; }
#tplAuvoContainer .toc a:hover { text-decoration: underline; }
#tplAuvoContainer .topo-link { display: inline-block; margin-top: 30px; }

@media (max-width: 640px) {
  #tplAuvoContainer .wrap { padding: 10px; }
  #tplAuvoContainer .header-card { flex-direction: column; align-items: flex-start; }
  #tplAuvoContainer table.tabela-resultado { display: block; overflow-x: auto; }
}
</style>
<script>
function tplAuvo_chamarApi(fn, payload) {
  return new Promise(function(resolve, reject) {
    if (typeof SGO_iniciarCarregamento_ === 'function') SGO_iniciarCarregamento_();
    google.script.run
      .withSuccessHandler(function(res) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); resolve(res); })
      .withFailureHandler(function(err) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); reject(err); })
      .Auvo_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  });
}

function tplAuvo_msg(containerId, tipo, texto) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="alert-box ' + tipo + '">' + texto + '</div>';
}

function tplAuvo_erro(containerId, err) {
  var msg = (err && err.message) ? err.message : String(err);
  tplAuvo_msg(containerId, 'error', msg);
}

function tplAuvo_esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function tplAuvo_renderReal_() {
  var container = document.getElementById('tplAuvoContainer');
  if (!container) return;

  container.innerHTML =
    '<div id="tplAuvo_viewPainel">' + tplAuvo_paintPainel_() + '</div>' +
    '<div id="tplAuvo_viewManual" style="display:none">' + tplAuvo_manualHtml_() + '</div>' +
    '<div class="modal-overlay-auvo" id="tplAuvo_modalCobranca"></div>';

  tplAuvo_carregarStatusReverso_();
  tplAuvo_carregarStatusIncremental_();
  tplAuvo_carregarPendencias_();
  tplAuvo_pendCarregarStatusDiario_();
  tplAuvo_carregarColaboradoresRelatorio_();
}

function tplAuvo_toggleAvancado() {
  var el = document.getElementById('tplAuvo_avancado');
  var btn = document.getElementById('tplAuvo_avancadoBtn');
  if (!el) return;
  var abrindo = el.style.display === 'none';
  el.style.display = abrindo ? '' : 'none';
  if (btn) btn.textContent = abrindo ? 'Ocultar ferramentas avançadas' : 'Mostrar ferramentas avançadas';
}

// ---------------- Conexão ----------------
function tplAuvo_testarConexao() {
  document.getElementById('tplAuvo_conexaoResultado').innerHTML = '';
  tplAuvo_chamarApi('apiTestarConexao', {})
    .then(function() { tplAuvo_msg('tplAuvo_conexaoResultado', 'success', 'Conexão com o Auvo estabelecida com sucesso.'); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_conexaoResultado', err); });
}

// ---------------- Clientes (busca — nunca lista tudo, a base só cresce) ----------------
function tplAuvo_buscarClientes() {
  var input = document.getElementById('tplAuvo_buscaClienteInput');
  var termo = input ? input.value.trim() : '';
  var body = document.getElementById('tplAuvo_clientesBody');
  if (!body) return;
  if (termo.length < 2) { body.innerHTML = '<tr><td colspan="5" class="muted">Digite ao menos 2 letras pra buscar.</td></tr>'; return; }
  body.innerHTML = '<tr><td colspan="5" class="muted">Buscando...</td></tr>';
  tplAuvo_chamarApi('apiBuscarClienteParaSync', { termo: termo })
    .then(function(res) { tplAuvo_renderClientesTabela_(res.items || []); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_clientesResultado', err); });
}

function tplAuvo_renderClientesTabela_(items) {
  var body = document.getElementById('tplAuvo_clientesBody');
  if (!body) return;
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5" class="muted">Nenhum cliente encontrado com esse termo.</td></tr>';
    return;
  }
  body.innerHTML = items.map(function(c) {
    return '<tr>' +
      '<td>' + tplAuvo_esc(c.nome) + '</td>' +
      '<td>' + tplAuvo_esc(c.cnpj) + '</td>' +
      '<td><span class="status-pill ' + tplAuvo_esc(c.status) + '">' + tplAuvo_esc(c.status) + '</span></td>' +
      '<td class="muted">' + tplAuvo_esc(c.ultimoErro) + '</td>' +
      '<td><button type="button" class="btn btn-sm" onclick="tplAuvo_sincronizarCliente(\\'' + c.id + '\\')">Sincronizar</button></td>' +
      '</tr>';
  }).join('');
}

function tplAuvo_sincronizarCliente(id) {
  tplAuvo_chamarApi('apiSincronizarCliente', { clienteId: id })
    .then(function() { tplAuvo_buscarClientes(); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_clientesResultado', err); });
}

function tplAuvo_sincronizarTodosClientes() {
  document.getElementById('tplAuvo_clientesResultado').innerHTML = '';
  tplAuvo_chamarApi('apiSincronizarTodosClientes', {})
    .then(function(res) {
      var tipo = res.erro ? 'warning' : 'success';
      tplAuvo_msg('tplAuvo_clientesResultado', tipo, res.sucesso + ' sincronizado(s), ' + res.erro + ' com erro.' +
        (res.erros && res.erros.length ? ('<br>' + res.erros.map(tplAuvo_esc).join('<br>')) : ''));
    })
    .catch(function(err) { tplAuvo_erro('tplAuvo_clientesResultado', err); });
}

// ---------------- Técnicos / Usuários (busca) ----------------
function tplAuvo_buscarTecnicos() {
  var input = document.getElementById('tplAuvo_buscaTecnicoInput');
  var termo = input ? input.value.trim() : '';
  var body = document.getElementById('tplAuvo_tecnicosBody');
  if (!body) return;
  if (termo.length < 2) { body.innerHTML = '<tr><td colspan="6" class="muted">Digite ao menos 2 letras pra buscar.</td></tr>'; return; }
  body.innerHTML = '<tr><td colspan="6" class="muted">Buscando...</td></tr>';
  tplAuvo_chamarApi('apiBuscarTecnicoParaSync', { termo: termo })
    .then(function(res) { tplAuvo_renderTecnicosTabela_(res.items || []); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_tecnicosResultado', err); });
}

function tplAuvo_renderTecnicosTabela_(items) {
  var body = document.getElementById('tplAuvo_tecnicosBody');
  if (!body) return;
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="6" class="muted">Nenhum usuário encontrado com esse termo.</td></tr>';
    return;
  }
  body.innerHTML = items.map(function(u) {
    var campoEmail = u.email
      ? tplAuvo_esc(u.email)
      : '<input type="text" id="tplAuvo_email_' + u.id + '" placeholder="email@exemplo.com" style="width:160px">' +
        ' <button type="button" class="btn btn-sm" onclick="tplAuvo_salvarEmail(\\'' + u.id + '\\')">Salvar</button>';
    return '<tr>' +
      '<td>' + tplAuvo_esc(u.nome) + '</td>' +
      '<td>' + tplAuvo_esc(u.perfil) + '</td>' +
      '<td>' + campoEmail + '</td>' +
      '<td><span class="status-pill ' + tplAuvo_esc(u.status) + '">' + tplAuvo_esc(u.status) + '</span></td>' +
      '<td class="muted">' + tplAuvo_esc(u.ultimoErro) + '</td>' +
      '<td><button type="button" class="btn btn-sm" onclick="tplAuvo_sincronizarTecnico(\\'' + u.id + '\\')">Sincronizar</button></td>' +
      '</tr>';
  }).join('');
}

function tplAuvo_salvarEmail(id) {
  var input = document.getElementById('tplAuvo_email_' + id);
  var email = input ? input.value.trim() : '';
  if (!email) { tplAuvo_erro('tplAuvo_tecnicosResultado', new Error('Informe um e-mail.')); return; }
  tplAuvo_chamarApi('apiDefinirEmailUsuario', { usuarioId: id, email: email })
    .then(function() { tplAuvo_buscarTecnicos(); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_tecnicosResultado', err); });
}

function tplAuvo_sincronizarTecnico(id) {
  tplAuvo_chamarApi('apiSincronizarTecnico', { usuarioId: id })
    .then(function() { tplAuvo_buscarTecnicos(); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_tecnicosResultado', err); });
}

function tplAuvo_sincronizarTodosTecnicos() {
  document.getElementById('tplAuvo_tecnicosResultado').innerHTML = '';
  tplAuvo_chamarApi('apiSincronizarTodosTecnicos', {})
    .then(function(res) {
      var tipo = res.erro ? 'warning' : 'success';
      tplAuvo_msg('tplAuvo_tecnicosResultado', tipo, res.sucesso + ' sincronizado(s), ' + res.erro + ' com erro.' +
        (res.erros && res.erros.length ? ('<br>' + res.erros.map(tplAuvo_esc).join('<br>')) : ''));
    })
    .catch(function(err) { tplAuvo_erro('tplAuvo_tecnicosResultado', err); });
}

// ---------------- Auditoria (só leitura, nunca grava) ----------------
function tplAuvo_auditarNomesParecidos() {
  document.getElementById('tplAuvo_auditoriaResultado').innerHTML = '<div class="alert-box info">Analisando nomes de clientes do Auvo, pode levar alguns segundos...</div>';
  tplAuvo_chamarApi('apiAuditarNomesParecidos', {})
    .then(tplAuvo_renderAuditoriaNomes_)
    .catch(function(err) { tplAuvo_erro('tplAuvo_auditoriaResultado', err); });
}

function tplAuvo_renderAuditoriaNomes_(res) {
  var el = document.getElementById('tplAuvo_auditoriaResultado');
  if (!el) return;
  if (!res.achados.length) {
    el.innerHTML = '<div class="alert-box success">Nenhum nome parecido encontrado entre CNPJs diferentes, em ' + res.totalGruposAnalisados + ' cliente(s) do Auvo analisado(s).</div>';
    return;
  }
  var linhas = res.achados.map(function(a) {
    var nomes = a.itens.map(function(it) {
      return tplAuvo_esc(it.nome) + ' <span class="muted">(CNPJ ' + tplAuvo_esc(it.cnpjRaiz) + ', ' + it.qtdUnidadesAuvo + ' unidade(s) no Auvo)</span>';
    }).join('<br>');
    var tipoLabel = a.tipo === 'NOME_IDENTICO_CNPJ_DIFERENTE' ? 'Nome idêntico, CNPJ diferente' : 'Nome parecido';
    return '<tr><td>' + a.similaridade + '%</td><td>' + tipoLabel + '</td><td>' + nomes + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="alert-box warning">' + res.totalAchados + ' possível(is) duplicata(s) por nome, em ' + res.totalGruposAnalisados + ' cliente(s) analisado(s) — isso é SÓ leitura, nada foi alterado. Revise e me diga o que fazer com cada caso.</div>' +
    '<table class="tabela-resultado"><thead><tr><th>Similaridade</th><th>Tipo</th><th>Nomes (CNPJ raiz)</th></tr></thead><tbody>' + linhas + '</tbody></table>';
}

// ---------------- Sincronização diária incremental (Tarefas) ----------------
function tplAuvo_carregarStatusIncremental_() {
  tplAuvo_chamarApi('apiStatusSincronizacaoIncremental', {})
    .then(function(res) { tplAuvo_renderStatusIncremental_(res.checkpoint, res.ativo); })
    .catch(function() {});
}

function tplAuvo_renderStatusIncremental_(cp, ativo) {
  var el = document.getElementById('tplAuvo_statusIncremental');
  var toggle = document.getElementById('tplAuvo_toggleSincAuto');
  if (toggle) toggle.checked = !!ativo;
  if (!el) return;
  var ultima = (cp && cp.ultimaExecucao) ? ('Última execução: ' + tplAuvo_esc(cp.ultimaExecucao)) : 'Nunca rodou ainda.';
  el.innerHTML = '<span class="muted">' + ultima + '</span>';
}

function tplAuvo_toggleSincAuto() {
  var toggle = document.getElementById('tplAuvo_toggleSincAuto');
  var ligar = toggle ? toggle.checked : false;
  var fn = ligar ? 'apiAtivarSincronizacaoIncremental' : 'apiDesativarSincronizacaoIncremental';
  tplAuvo_chamarApi(fn, {})
    .then(function(res) { tplAuvo_msg('tplAuvo_incrementalResultado', 'success', tplAuvo_esc(res.message)); })
    .catch(function(err) { if (toggle) toggle.checked = !ligar; tplAuvo_erro('tplAuvo_incrementalResultado', err); });
}

function tplAuvo_rodarSincIncremental() {
  document.getElementById('tplAuvo_incrementalResultado').innerHTML = '<div class="alert-box info">Buscando Tarefas recentes no Auvo...</div>';
  tplAuvo_chamarApi('apiRodarSincronizacaoIncremental', {})
    .then(function(res) {
      var linha = 'Janela: ' + tplAuvo_esc(res.janelaDesde) + ' a ' + tplAuvo_esc(res.janelaAte) + '<br>' +
        res.totalTarefasEncontradas + ' tarefa(s) encontrada(s) no Auvo, ' + res.processadas + ' processada(s), ' +
        res.clientesNovos + ' cliente(s) novo(s) trazido(s) sob demanda.' +
        (res.erros && res.erros.length ? ('<br><span style="color:var(--danger)">' + res.erros.length + ' erro(s): ' + res.erros.slice(0, 5).map(tplAuvo_esc).join(' | ') + '</span>') : '');
      document.getElementById('tplAuvo_incrementalResultado').innerHTML = '<div class="alert-box success">' + linha + '</div>';
      tplAuvo_carregarStatusIncremental_();
    })
    .catch(function(err) { tplAuvo_erro('tplAuvo_incrementalResultado', err); });
}

function tplAuvo_carregarColaboradoresRelatorio_() {
  var sel = document.getElementById('tplAuvo_colaboradoresRelatorio');
  if (!sel) return;
  tplAuvo_chamarApi('apiListarColaboradoresRelatorio', {}).then(function(res) {
    sel.innerHTML = (res.items || []).map(function(i) {
      return '<option value="' + tplAuvo_esc(i.id) + '">' + tplAuvo_esc(i.nome) + '</option>';
    }).join('');
  }).catch(function(err) { tplAuvo_erro('tplAuvo_relatorioResultado', err); });
}

function tplAuvo_gerarRelatorio(filtrarColaboradores) {
  var sel = document.getElementById('tplAuvo_periodoRelatorio');
  var periodoDias = sel ? Number(sel.value) : 30;
  var selColabs = document.getElementById('tplAuvo_colaboradoresRelatorio');
  var tecnicosIds = filtrarColaboradores && selColabs
    ? Array.prototype.slice.call(selColabs.selectedOptions || []).map(function(o) { return o.value; })
    : [];
  if (filtrarColaboradores && !tecnicosIds.length) {
    tplAuvo_msg('tplAuvo_relatorioResultado', 'warning', 'Selecione ao menos um colaborador para gerar o relatório individual ou em grupo.');
    return;
  }

  var janela = window.open('', '_blank');
  if (janela) {
    janela.document.write('<html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#555">' +
      '<h2>Gerando relatório...</h2><p>Isso pode levar até 1 minuto (a IA está escrevendo a interpretação).</p></body></html>');
  }

  tplAuvo_chamarApi('apiGerarRelatorio', { periodoDias: periodoDias, tecnicosIds: tecnicosIds })
    .then(function(res) {
      if (!janela || janela.closed) { alert('A janela do relatório foi fechada antes de terminar. Tente de novo.'); return; }
      janela.document.open();
      janela.document.write(res.html);
      janela.document.close();
    })
    .catch(function(err) {
      if (janela && !janela.closed) {
        janela.document.write('<p style="color:red">Erro ao gerar relatório: ' + tplAuvo_esc(err && err.message ? err.message : err) + '</p>');
      }
      tplAuvo_erro('tplAuvo_relatorioResultado', err);
    });
}

// ---------------- Pendências de Fechamento (O.S. abertas) ----------------
var tplAuvo_pendItensCache_ = [];

function tplAuvo_carregarPendencias_() {
  var body = document.getElementById('tplAuvo_pendBody');
  if (body) body.innerHTML = '<tr><td colspan="5" class="muted">Carregando...</td></tr>';
  tplAuvo_chamarApi('apiListarPendencias', {})
    .then(function(res) {
      tplAuvo_pendItensCache_ = res.items || [];
      tplAuvo_pendPreencherFiltroTecnicos_(tplAuvo_pendItensCache_);
      tplAuvo_pendRenderResumo_(res);
      tplAuvo_renderPendenciasTabela_(tplAuvo_pendItensCache_);
    })
    .catch(function(err) {
      if (body) body.innerHTML = '<tr><td colspan="5" class="muted">Erro ao carregar: ' + tplAuvo_esc(err && err.message ? err.message : err) + '</td></tr>';
    });
}

function tplAuvo_pendRenderResumo_(res) {
  var el = document.getElementById('tplAuvo_pendResumo');
  if (!el) return;
  var linha = res.total + ' O.S. em aberto — ' + res.comEvidencia + ' com evidência de execução, ' + res.semEvidencia + ' sem nenhuma evidência.';
  linha += res.ultimaAtualizacao ? (' Última atualização: ' + tplAuvo_esc(res.ultimaAtualizacao) + '.') : ' Ainda não atualizado — clique em "Atualizar agora".';
  if (res.atualizando) linha += ' <strong style="color:var(--warning)">Atualização em andamento em segundo plano...</strong>';
  el.innerHTML = linha;
}

function tplAuvo_pendPreencherFiltroTecnicos_(itens) {
  var sel = document.getElementById('tplAuvo_pendFiltroTecnico');
  if (!sel) return;
  var nomes = {};
  itens.forEach(function(i) { if (i.TECNICO_NOME) nomes[i.TECNICO_NOME] = true; });
  var atual = sel.value;
  sel.innerHTML = '<option value="">Todos os técnicos</option>' +
    Object.keys(nomes).sort().map(function(n) { return '<option value="' + tplAuvo_esc(n) + '">' + tplAuvo_esc(n) + '</option>'; }).join('');
  sel.value = atual;
}

function tplAuvo_filtrarPendencias_() {
  var selTecnico = document.getElementById('tplAuvo_pendFiltroTecnico');
  var selEvidencia = document.getElementById('tplAuvo_pendFiltroEvidencia');
  var tecnico = selTecnico ? selTecnico.value : '';
  var evidencia = selEvidencia ? selEvidencia.value : '';
  var filtrado = tplAuvo_pendItensCache_.filter(function(i) {
    if (tecnico && i.TECNICO_NOME !== tecnico) return false;
    if (evidencia && i.TEM_EVIDENCIA !== evidencia) return false;
    return true;
  });
  tplAuvo_renderPendenciasTabela_(filtrado);
}

function tplAuvo_renderPendenciasTabela_(itens) {
  var body = document.getElementById('tplAuvo_pendBody');
  if (!body) return;
  if (!itens.length) {
    body.innerHTML = '<tr><td colspan="5" class="muted">Nenhuma O.S. pendente encontrada.</td></tr>';
    return;
  }
  body.innerHTML = itens.map(function(i) {
    var pendenciaTxt = (i.TEM_EVIDENCIA === 'NAO')
      ? '<span class="badge-evidencia nao">Sem evidência de execução</span>'
      : '<span class="badge-evidencia sim">Aberta há ' + tplAuvo_esc(i.DIAS_ABERTA) + ' dias</span>';
    var tarefaTxt = tplAuvo_esc(i.TASK_TYPE_DESCRICAO) + '<br><span class="muted">' + tplAuvo_esc(i.CLIENTE_NOME) + ' · ' + tplAuvo_esc(i.TASK_DATE) + '</span>';
    var verNoAuvo = i.TASK_URL ? ('<a href="' + tplAuvo_esc(i.TASK_URL) + '" target="_blank" rel="noopener" class="btn btn-sm">Ver no Auvo</a>') : '';
    var cobrarBtn = i.TECNICO_ID_SGO
      ? ('<button type="button" class="btn btn-sm" onclick="tplAuvo_abrirModalCobranca_(&#39;' +
          tplAuvo_esc(i.TECNICO_ID_SGO).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.TECNICO_NOME).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.TASK_TYPE_DESCRICAO).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.CLIENTE_NOME).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.DIAS_ABERTA).replace(/'/g, '&#39;') + '&#39;)">Cobrar</button>')
      : '<span class="muted" title="Esse técnico não tem login no Portal — a cobrança fica sem como notificar">Sem login</span>';
    return '<tr>' +
      '<td>' + tplAuvo_esc(i.TECNICO_NOME) + '</td>' +
      '<td>' + tarefaTxt + '</td>' +
      '<td>' + pendenciaTxt + '</td>' +
      '<td>' + (Number(i.OCORRENCIAS_ABERTAS) > 0 ? ('<span class="status-pill PENDENTE">' + i.OCORRENCIAS_ABERTAS + '</span>') : '<span class="muted">—</span>') + '</td>' +
      '<td><div class="tabela-acoes">' + verNoAuvo + cobrarBtn + '</div></td>' +
      '</tr>';
  }).join('');
}

function tplAuvo_pendCarregarStatusDiario_() {
  tplAuvo_chamarApi('apiStatusSincronizacaoDiariaPendencias', {})
    .then(function(res) {
      var toggle = document.getElementById('tplAuvo_pendToggleDiario');
      if (toggle) toggle.checked = !!res.ativo;
    })
    .catch(function() {});
}

function tplAuvo_pendToggleDiario_() {
  var toggle = document.getElementById('tplAuvo_pendToggleDiario');
  var ligar = toggle ? toggle.checked : false;
  var fn = ligar ? 'apiAtivarSincronizacaoDiariaPendencias' : 'apiDesativarSincronizacaoDiariaPendencias';
  tplAuvo_chamarApi(fn, {})
    .catch(function(err) { if (toggle) toggle.checked = !ligar; alert(err && err.message ? err.message : String(err)); });
}

function tplAuvo_atualizarPendenciasAgora_() {
  var el = document.getElementById('tplAuvo_pendResumo');
  if (el) el.innerHTML = 'Atualizando — isso pode levar alguns minutos (varre o histórico completo de tarefas do Auvo). Aguarde...';
  tplAuvo_chamarApi('apiAtualizarPendenciasAgora', {})
    .then(function(res) {
      if (!res.concluido && el) {
        el.innerHTML = 'A varredura é grande e não coube numa execução só — continua sozinha em segundo plano nos próximos ' +
          'minutos. Clique em "Atualizar agora" de novo daqui a pouco pra ver o resultado completo.';
      }
      tplAuvo_carregarPendencias_();
    })
    .catch(function(err) {
      if (el) el.innerHTML = '<span style="color:var(--danger)">Erro: ' + tplAuvo_esc(err && err.message ? err.message : err) + '</span>';
    });
}

// Chama o backend de ocorrência do módulo Qualidade diretamente — não
// depende do módulo Qualidade já ter sido aberto nesta sessão do navegador
// (o script dele só é injetado no DOM quando alguém abre aquele módulo).
function tplAuvo_chamarQualidadeApi_(fn, payload) {
  return new Promise(function(resolve, reject) {
    if (typeof SGO_iniciarCarregamento_ === 'function') SGO_iniciarCarregamento_();
    google.script.run
      .withSuccessHandler(function(res) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); resolve(res); })
      .withFailureHandler(function(err) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); reject(err); })
      .Qualidade_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  });
}

function tplAuvo_abrirModalCobranca_(tecnicoId, tecnicoNome, tipoTarefa, cliente, diasAberta) {
  var overlay = document.getElementById('tplAuvo_modalCobranca');
  if (!overlay) return;
  var descricaoSugerida = 'O.S. de ' + tipoTarefa + ' (' + cliente + ') aberta há ' + diasAberta + ' dias no Auvo sem fechamento.';
  overlay.innerHTML =
    '<div class="modal-auvo">' +
      '<h3>Cobrar técnico</h3>' +
      '<p class="muted">' + tplAuvo_esc(tecnicoNome) + '</p>' +
      '<label>Descrição</label>' +
      '<textarea id="tplAuvo_cobDescricao">' + tplAuvo_esc(descricaoSugerida) + '</textarea>' +
      '<div id="tplAuvo_cobStatus"></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn-cancelar" onclick="tplAuvo_fecharModalCobranca_()">Cancelar</button>' +
        '<button type="button" class="btn-salvar" onclick="tplAuvo_salvarCobranca_(&#39;' +
          tplAuvo_esc(tecnicoId).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(tecnicoNome).replace(/'/g, '&#39;') + '&#39;)">Salvar</button>' +
      '</div>' +
    '</div>';
  overlay.classList.add('aberto');
}

function tplAuvo_fecharModalCobranca_() {
  var overlay = document.getElementById('tplAuvo_modalCobranca');
  if (overlay) { overlay.classList.remove('aberto'); overlay.innerHTML = ''; }
}

function tplAuvo_salvarCobranca_(tecnicoId, tecnicoNome) {
  var campo = document.getElementById('tplAuvo_cobDescricao');
  var descricao = campo ? campo.value : '';
  if (!descricao || !descricao.trim()) {
    var statusEl = document.getElementById('tplAuvo_cobStatus');
    if (statusEl) statusEl.innerHTML = '<p style="color:var(--danger);font-size:12px;margin-top:6px">Descreva o motivo antes de salvar.</p>';
    return;
  }
  tplAuvo_chamarQualidadeApi_('apiRegistrarOcorrencia', {
    area: 'AUVO', tipo: 'COBRANCA', pessoaTipo: 'TECNICO', pessoaId: tecnicoId, pessoaNome: tecnicoNome, descricao: descricao
  }).then(function() {
    tplAuvo_fecharModalCobranca_();
    tplAuvo_carregarPendencias_();
  }).catch(function(err) {
    var statusEl = document.getElementById('tplAuvo_cobStatus');
    if (statusEl) statusEl.innerHTML = '<p style="color:var(--danger);font-size:12px;margin-top:6px">' + tplAuvo_esc(err && err.message ? err.message : err) + '</p>';
  });
}

// ---------------- Sincronização reversa (Auvo -> Portal) ----------------
function tplAuvo_carregarStatusReverso_() {
  tplAuvo_chamarApi('apiStatusSincronizacaoReversa', {})
    .then(function(res) { tplAuvo_renderStatusReverso_(res.checkpoint); })
    .catch(function() {});
}

function tplAuvo_renderStatusReverso_(cp) {
  var el = document.getElementById('tplAuvo_statusReverso');
  if (!el || !cp) return;
  if (cp.fase === 'CONCLUIDO' || !cp.fase) {
    el.innerHTML = '<span class="muted">Nenhuma sincronização em andamento no momento.</span>';
    return;
  }
  el.innerHTML = '<span class="muted">Em andamento — fase <strong>' + tplAuvo_esc(cp.fase) + '</strong>' +
    (cp.indice ? (', a partir do item ' + tplAuvo_esc(cp.indice)) : '') +
    '. Continua sozinha em segundo plano (gatilho automático); pode fechar esta tela.</span>';
}

function tplAuvo_simularSincReversa() {
  document.getElementById('tplAuvo_reversoResultado').innerHTML = '<div class="alert-box info">Consultando o Auvo, pode levar alguns segundos (varre todas as páginas de Clientes e Equipamentos)...</div>';
  tplAuvo_chamarApi('apiSimularSincronizacaoReversa', {})
    .then(function(res) { tplAuvo_renderSimulacao_(res); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_reversoResultado', err); });
}

function tplAuvo_renderSimulacao_(res) {
  var c = res.clientes, e = res.equipamentos;
  var amostra = (c.amostraGrupos || []).map(function(g) {
    return '<tr><td>' + tplAuvo_esc(g.cnpjRaiz) + '</td><td>' + g.qtdUnidades + '</td><td>' + tplAuvo_esc(g.nomes.join(' / ')) + '</td></tr>';
  }).join('');
  var protegidos = c.clientesProtegidos || 0;
  var protegidosAmostra = (c.amostraProtegidos || []).map(function(p) {
    return tplAuvo_esc(p.nomePortal) + ' (Auvo: ' + tplAuvo_esc(p.nomeAuvo) + ')';
  }).join('<br>');

  var html = '<div class="alert-box warning">' +
    '<strong>Prévia — nada foi gravado ainda.</strong><br><br>' +
    '<strong>Clientes/Unidades:</strong> ' + c.totalGrupos + ' grupo(s) no Auvo (' + c.clientesCriar + ' cliente(s) novo(s), ' +
    c.clientesAtualizar + ' já existente(s) — só campo vazio será preenchido, ' + protegidos + ' cadastrado(s) manualmente — protegido, ' +
    'nenhum campo alterado) &mdash; ' + c.unidadesCriar + ' unidade(s) nova(s), ' +
    c.unidadesAtualizar + ' unidade(s) atualizada(s). ' + c.gruposSemCnpj + ' cliente(s) do Auvo sem CNPJ (nunca mesclados automaticamente).<br>' +
    '<strong>Equipamentos:</strong> ' + e.total + ' no Auvo (' + e.criar + ' novo(s), ' + e.atualizar + ' atualizado(s), ' + (e.protegidos || 0) + ' protegido(s)). ' +
    (e.ignoradosSemDado ? (e.ignoradosSemDado + ' ignorado(s) por não ter nenhum dado útil preenchido (sem TAG/fabricante/modelo/série) — não entram no Portal. ') : '') +
    (e.semClienteMapeado ? (e.semClienteMapeado + ' sem cliente/unidade correspondente ainda (serão importados sem vínculo até a unidade ser sincronizada).') : '') +
    '</div>' +
    (amostra ? ('<table class="tabela-resultado"><thead><tr><th>CNPJ raiz</th><th>Qtd. unidades</th><th>Nomes (Auvo)</th></tr></thead><tbody>' + amostra + '</tbody></table>') : '') +
    (protegidos ? ('<div class="alert-box info"><strong>' + protegidos + ' cliente(s) cadastrado(s) manualmente</strong> vão ser reconhecidos (vinculados ao Auvo) mas NENHUM campo deles será alterado. Exemplos:<br>' +
      protegidosAmostra + '</div>') : '') +
    '<button type="button" class="btn btn-primary" onclick="tplAuvo_iniciarSincReversa()">Confirmar e executar de verdade</button>';

  document.getElementById('tplAuvo_reversoResultado').innerHTML = html;
}

function tplAuvo_iniciarSincReversa() {
  document.getElementById('tplAuvo_reversoResultado').innerHTML = '<div class="alert-box info">Iniciando sincronização real...</div>';
  tplAuvo_chamarApi('apiIniciarSincronizacaoReversa', {})
    .then(tplAuvo_processarLoteReverso_)
    .catch(function(err) { tplAuvo_erro('tplAuvo_reversoResultado', err); });
}

function tplAuvo_continuarSincReversa() {
  document.getElementById('tplAuvo_reversoResultado').innerHTML = '<div class="alert-box info">Continuando sincronização...</div>';
  tplAuvo_chamarApi('apiContinuarSincronizacaoReversa', {})
    .then(tplAuvo_processarLoteReverso_)
    .catch(function(err) { tplAuvo_erro('tplAuvo_reversoResultado', err); });
}

function tplAuvo_processarLoteReverso_(res) {
  var linha = '[' + tplAuvo_esc(res.fase) + '] progresso ' + tplAuvo_esc(res.progresso || '') +
    (res.criados !== undefined ? (' — ' + res.criados + ' criado(s), ' + res.atualizados + ' atualizado(s), ' + (res.protegidos || 0) + ' protegido(s) sem alteração') : '') +
    (res.unidadesCriadas !== undefined ? (', ' + res.unidadesCriadas + ' unidade(s) nova(s), ' + res.unidadesAtualizadas + ' unidade(s) atualizada(s)' + (res.unidadesProtegidas ? (', ' + res.unidadesProtegidas + ' unidade(s) protegida(s)') : '')) : '') +
    (res.ignoradosSemDado ? (', ' + res.ignoradosSemDado + ' ignorado(s) sem dado útil') : '') +
    (res.erros && res.erros.length ? ('<br><span style="color:var(--danger)">' + res.erros.length + ' erro(s): ' + res.erros.slice(0, 5).map(tplAuvo_esc).join(' | ') + '</span>') : '');

  var el = document.getElementById('tplAuvo_reversoResultado');
  if (el) el.innerHTML = '<div class="alert-box ' + (res.concluido ? 'success' : 'info') + '">' + linha + '</div>';

  if (res.concluido || res.fase === 'CONCLUIDO') {
    if (el) el.innerHTML += '<div class="alert-box success">Sincronização concluída.</div>';
    tplAuvo_carregarStatusReverso_();
    return;
  }
  // continua automaticamente enquanto a tela estiver aberta (lote seguinte)
  tplAuvo_chamarApi('apiContinuarSincronizacaoReversa', {}).then(tplAuvo_processarLoteReverso_).catch(function(err) { tplAuvo_erro('tplAuvo_reversoResultado', err); });
}

// ---------------- Envio de cadastro pendente (Portal -> Auvo) ----------------
function tplAuvo_simularEnvioCadastro() {
  document.getElementById('tplAuvo_envioResultado').innerHTML = '<div class="alert-box info">Calculando o que está pendente...</div>';
  tplAuvo_chamarApi('apiSimularEnvioCadastro', {})
    .then(function(res) { tplAuvo_renderSimulacaoEnvio_(res); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_envioResultado', err); });
}

function tplAuvo_renderSimulacaoEnvio_(res) {
  var u = res.unidades, e = res.equipamentos;
  var amostraU = (res.amostraUnidades || []).map(function(x) {
    return '<tr><td>' + tplAuvo_esc(x.nome) + '</td><td>' + tplAuvo_esc(x.cnpj || '-') + '</td></tr>';
  }).join('');
  var amostraE = (res.amostraEquipamentos || []).map(function(x) {
    return '<tr><td>' + tplAuvo_esc(x.tipo || '-') + '</td><td>' + tplAuvo_esc(x.tag || '-') + '</td></tr>';
  }).join('');

  var html = '<div class="alert-box warning">' +
    '<strong>Prévia — nada foi gravado ainda.</strong><br><br>' +
    '<strong>Unidades:</strong> ' + u.total + ' ativa(s), ' + u.pendentes + ' pendente(s) de envio.<br>' +
    '<strong>Equipamentos:</strong> ' + e.total + ' ativo(s), ' + e.pendentes + ' pendente(s) de envio' +
    (e.semVinculo ? (', ' + e.semVinculo + ' sem Cliente/Unidade vinculado (não é possível enviar sem um pai — ficarão marcados com erro).') : '.') +
    '</div>' +
    (amostraU ? ('<table class="tabela-resultado"><thead><tr><th>Unidade (amostra)</th><th>CNPJ</th></tr></thead><tbody>' + amostraU + '</tbody></table>') : '') +
    (amostraE ? ('<table class="tabela-resultado"><thead><tr><th>Equipamento (amostra)</th><th>TAG</th></tr></thead><tbody>' + amostraE + '</tbody></table>') : '') +
    ((u.pendentes || e.pendentes) ? '<button type="button" class="btn btn-primary" onclick="tplAuvo_confirmarEnvioCadastro()">Confirmar e enviar de verdade</button>' :
      '<div class="alert-box success">Nada pendente — Unidades e Equipamentos ativos já estão todos no Auvo.</div>');

  document.getElementById('tplAuvo_envioResultado').innerHTML = html;
}

function tplAuvo_confirmarEnvioCadastro() {
  document.getElementById('tplAuvo_envioResultado').innerHTML = '<div class="alert-box info">Enviando Unidades pendentes...</div>';
  tplAuvo_chamarApi('apiEnviarUnidadesPendentes', {})
    .then(function(resUnidades) {
      var el = document.getElementById('tplAuvo_envioResultado');
      var linhaU = '<div class="alert-box ' + (resUnidades.erros && resUnidades.erros.length ? 'warning' : 'success') + '">' +
        'Unidades: ' + resUnidades.sincronizadas + ' de ' + resUnidades.total + ' enviada(s).' +
        (resUnidades.erros && resUnidades.erros.length ? ('<br>' + resUnidades.erros.slice(0, 5).map(tplAuvo_esc).join('<br>')) : '') +
        '</div>';
      if (el) el.innerHTML = linhaU + '<div class="alert-box info">Enviando Equipamentos (em lotes)...</div>';
      return tplAuvo_chamarApi('apiIniciarEnvioEquipamentos', {}).then(function(res) { tplAuvo_processarLoteEnvio_(res, linhaU); });
    })
    .catch(function(err) { tplAuvo_erro('tplAuvo_envioResultado', err); });
}

function tplAuvo_processarLoteEnvio_(res, prefixoHtml) {
  var linha = (prefixoHtml || '') + '<div class="alert-box ' + (res.concluido ? 'success' : 'info') + '">' +
    'Equipamentos: ' + res.indiceAtual + ' de ' + res.totalAtivos + ' processado(s) — ' +
    res.criados + ' criado(s), ' + res.atualizados + ' atualizado(s), ' + (res.vinculados || 0) + ' reconhecido(s) já cadastrado(s) no Auvo (sem duplicar), ' +
    (res.desambiguados ? (res.desambiguados + ' criado(s) com TAG+série (TAG já usada por outro cliente no Auvo), ') : '') +
    res.jaMapeados + ' já mapeado(s), ' + res.semVinculo + ' sem vínculo.' +
    (res.erros && res.erros.length ? ('<br><span style="color:var(--danger)">' + res.erros.length + ' erro(s): ' + res.erros.slice(0, 5).map(tplAuvo_esc).join(' | ') + '</span>') : '') +
    '</div>';

  var el = document.getElementById('tplAuvo_envioResultado');
  if (el) el.innerHTML = linha;

  if (res.concluido) {
    if (el) el.innerHTML += '<div class="alert-box success">Envio concluído.</div>';
    return;
  }
  // continua automaticamente enquanto a tela estiver aberta (lote seguinte)
  tplAuvo_chamarApi('apiContinuarEnvioEquipamentos', {}).then(function(res2) { tplAuvo_processarLoteEnvio_(res2, ''); }).catch(function(err) { tplAuvo_erro('tplAuvo_envioResultado', err); });
}

// ---------------- Manual ----------------
function tplAuvo_abrirManual_() {
  var viewPainel = document.getElementById('tplAuvo_viewPainel');
  var viewManual = document.getElementById('tplAuvo_viewManual');
  if (viewPainel) viewPainel.style.display = 'none';
  if (viewManual) viewManual.style.display = '';
}

function tplAuvo_voltarDoManual_() {
  var viewPainel = document.getElementById('tplAuvo_viewPainel');
  var viewManual = document.getElementById('tplAuvo_viewManual');
  if (viewManual) viewManual.style.display = 'none';
  if (viewPainel) viewPainel.style.display = '';
}

function tplAuvo_manualHtml_() {
  return '<div class="wrap manual-wrap">' +
    '<h1>Integração Auvo — Manual do Operador</h1>' +
    '<p class="subtitulo">Acesso restrito a Gestor/Administrador.</p>' +

    '<div class="toc"><h2>Índice</h2><ol>' +
    '<li><a onclick="document.getElementById(\\'ma-1\\').scrollIntoView({behavior:\\'smooth\\'})">O que esta tela faz</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-2\\').scrollIntoView({behavior:\\'smooth\\'})">Como configurar as credenciais</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-3\\').scrollIntoView({behavior:\\'smooth\\'})">Sincronizar Clientes</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-4\\').scrollIntoView({behavior:\\'smooth\\'})">Sincronizar Técnicos</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-5\\').scrollIntoView({behavior:\\'smooth\\'})">Como as Tarefas são criadas</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-5b\\').scrollIntoView({behavior:\\'smooth\\'})">Sincronização diária (Tarefas)</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-5c\\').scrollIntoView({behavior:\\'smooth\\'})">Importação completa (manual)</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-6\\').scrollIntoView({behavior:\\'smooth\\'})">O que ainda não está incluído</a></li>' +
    '<li><a onclick="document.getElementById(\\'ma-7\\').scrollIntoView({behavior:\\'smooth\\'})">Erros comuns</a></li>' +
    '</ol></div>' +

    '<h2 id="ma-1">1. O que esta tela faz</h2>' +
    '<p>Sincroniza dados nos dois sentidos com o Auvo. Portal &rarr; Auvo: Clientes, Técnicos/Usuários e Tarefas (sempre que um ' +
    'documento oficial é emitido). Auvo &rarr; Portal: Clientes/Unidades e Equipamentos, trazidos automaticamente pra dentro do ' +
    'Portal (ver seção 5b). Em ambos os sentidos, o Portal nunca cria registro duplicado — sempre casa com o que já existe antes ' +
    'de criar algo novo.</p>' +

    '<h2 id="ma-2">2. Como configurar as credenciais</h2>' +
    '<p>Gere a API Key e o API Token na conta Auvo, em <strong>Menu &gt; Integração</strong>. Depois, no editor do Apps Script ' +
    'deste projeto, acesse <strong>Configurações do projeto &gt; Propriedades do script</strong> e crie duas propriedades: ' +
    '<strong>AUVO_API_KEY</strong> e <strong>AUVO_API_TOKEN</strong>, com os valores gerados. Use o botão "Testar Conexão" ' +
    'nesta tela pra confirmar que ficou certo.</p>' +

    '<h2 id="ma-3">3. Sincronizar Clientes (Ferramentas avançadas)</h2>' +
    '<p>Dentro de "Ferramentas avançadas", em "Consultar Cliente": busque pelo nome ou CNPJ (a lista não aparece inteira — ' +
    'a base só cresce, então é sempre busca). O botão "Sincronizar" no resultado envia aquele cliente pro Auvo — se já ' +
    'tiver sido sincronizado antes, os dados são atualizados lá; se não, um novo cadastro é criado. O status (OK / ERRO / ' +
    'PENDENTE) mostra o resultado da última tentativa. "Sincronizar todos os clientes ativos" faz isso em lote, sem precisar ' +
    'buscar um por um.</p>' +

    '<h2 id="ma-4">4. Sincronizar Técnicos</h2>' +
    '<p>São considerados "técnicos" os usuários ativos do Portal com perfil Técnico, Metrologia, Gestor ou Administrador. ' +
    'O Auvo exige e-mail pra cada usuário — se o Portal não tiver o e-mail cadastrado, um campo aparece no próprio ' +
    'resultado da busca pra preencher e salvar antes de sincronizar.</p>' +

    '<div class="callout"><strong>Nota:</strong> a sincronização usa os usuários reais do Portal (login), que são quem de ' +
    'fato executa o serviço — não uma aba interna separada de técnicos.</div>' +

    '<h2 id="ma-5">5. Como as Tarefas são criadas</h2>' +
    '<p>Toda vez que um Certificado de Calibração, Laudo NR-13, Registro Operacional ou documento de PGT/POP é emitido no ' +
    'Portal, uma Tarefa concluída é criada automaticamente no Auvo pra registrar esse atendimento — sem nenhuma ação manual. ' +
    'Se o cliente ou o técnico responsável ainda não tiverem sido sincronizados antes, isso acontece automaticamente na hora, ' +
    'sem precisar passar por esta tela primeiro. Se o Auvo estiver fora do ar ou mal configurado no momento da emissão, o ' +
    'documento é emitido normalmente mesmo assim — a Tarefa simplesmente não é criada.</p>' +

    '<h2 id="ma-5b">5b. Sincronização diária (Tarefas) — fluxo padrão</h2>' +
    '<p>Todo dia, o Portal pergunta ao Auvo quais Tarefas/atendimentos aconteceram recentemente. Pra cada Tarefa nova, o ' +
    'Cliente correspondente é trazido pro Portal <strong>só se ainda não estiver aqui</strong> — sob demanda, não a base ' +
    'inteira do Auvo de uma vez. Isso alimenta a aba AUVO_TAREFAS (histórico de atendimentos), base do futuro módulo de ' +
    'indicadores. Usa a mesma proteção de sempre: nunca sobrescreve dado que você já digitou (ver 5c). Equipamento não entra ' +
    'por esse caminho — o Auvo não vincula equipamento a Tarefa por ID; equipamento continua só na Importação completa manual.</p>' +
    '<p>O histórico é só a partir da data em que essa sincronização foi ligada — atendimentos antigos do Auvo (antes disso) ' +
    'não entram automaticamente. O botão "Rodar agora" testa manualmente; a chave (toggle) liga/desliga a sincronização ' +
    'automática a cada 30 minutos — é essa cadência que alimenta o alerta de atendimento no dashboard principal.</p>' +

    '<h2 id="ma-5c">5c. Importação completa (manual, opcional)</h2>' +
    '<p>Traz Clientes e Equipamentos cadastrados no Auvo pra dentro do Portal <strong>de uma vez só</strong> — ferramenta ' +
    'separada, não roda automaticamente (é pesada pra API do Auvo). Como o Auvo não tem o conceito de "Unidade" ' +
    '(só Cliente), a regra é: clientes do Auvo com o mesmo CNPJ (8 primeiros dígitos, ignorando filial/DV) viram <strong>1 ' +
    'Cliente no Portal + 1 Unidade pra cada endereço diferente</strong>. Clientes do Auvo sem CNPJ preenchido nunca são ' +
    'mesclados automaticamente (fica 1 Cliente + 1 Unidade própria, pra revisão manual).</p>' +
    '<p><strong>Nunca duplica</strong>: antes de criar qualquer registro novo, o sistema verifica se aquele Cliente/Unidade/' +
    'Equipamento do Auvo já foi trazido antes (e só atualiza) e, se não, tenta casar com um cadastro manual já existente pelo ' +
    'CNPJ (Cliente) ou pela TAG (Equipamento) antes de criar algo novo.</p>' +
    '<p><strong>Nunca sobrescreve dado que você já digitou</strong>: um registro cadastrado manualmente é sempre protegido — ' +
    'quando casa com um Cliente/Equipamento do Auvo, só ganha o vínculo (pra runs futuras reconhecerem), nenhum campo dele é ' +
    'alterado. Só um registro que já foi criado por uma sincronização anterior (marcado ORIGEM=AUVO) recebe atualização, e ' +
    'mesmo assim só preenche campo que estava vazio — nunca troca um valor já preenchido por outro.</p>' +
    '<p><strong>Sempre clique em "Simular" primeiro</strong> — mostra uma prévia (quantos Clientes/Unidades/Equipamentos ' +
    'seriam criados ou atualizados, incluindo os grupos com mais de uma Unidade) sem gravar nada no Portal. Só depois de ' +
    'revisar essa prévia, clique em "Confirmar e executar de verdade".</p>' +
    '<p>Bases grandes (milhares de registros) são processadas em lotes — a tela mostra o progresso e continua sozinha em ' +
    'segundo plano mesmo se você fechar a aba (um gatilho automático retoma de onde parou).</p>' +
    '<div class="callout"><strong>Nota:</strong> registros trazidos do Auvo ganham <strong>ORIGEM = AUVO</strong> (visível na ' +
    'planilha de Clientes/Unidades/Equipamentos), pra diferenciar do que foi cadastrado manualmente (ORIGEM = MANUAL).</div>' +

    '<h2 id="ma-6">6. O que ainda não está incluído</h2>' +
    '<p>Equipes não são sincronizadas (o Portal não tem esse conceito hoje). Usuários/Técnicos do Auvo não são trazidos de ' +
    'volta pro Portal (só o sentido Portal &rarr; Auvo existe pra Técnicos). Documentos gerados por Relatório de Calibração, ' +
    'Declaração de Execução, Cronograma de Execução, Planejamento CME, Autoclave, Cadeia de Frio, Estufa/Banho-maria e ' +
    'Lavadora ainda não criam Tarefa automaticamente — fica como uma próxima etapa a decidir.</p>' +

    '<h2 id="ma-7">7. Erros comuns</h2>' +
    '<table><tr><th>Situação</th><th>O que fazer</th></tr>' +
    '<tr><td>"Credenciais do Auvo não configuradas"</td><td>Crie AUVO_API_KEY e AUVO_API_TOKEN nas Propriedades do script.</td></tr>' +
    '<tr><td>"Credenciais do Auvo inválidas"</td><td>Confira se a API Key/Token gerados no Auvo foram colados corretamente, sem espaços.</td></tr>' +
    '<tr><td>"não tem e-mail cadastrado"</td><td>Preencha o e-mail do usuário na tabela de Técnicos antes de sincronizar.</td></tr>' +
    '<tr><td>"Limite de requisições do Auvo atingido"</td><td>Aguarde alguns minutos e tente novamente — não é um erro de configuração.</td></tr>' +
    '</table>' +

    '<button type="button" class="btn topo-link" onclick="tplAuvo_voltarDoManual_()">&larr; Voltar ao painel</button>' +
    '</div>';
}

function tplAuvo_paintPainel_() {
  return '<div class="wrap">' +
    '<div class="header-card">' +
      '<div class="title-area">' +
        '<h1>Integração Auvo</h1>' +
        '<p>Uso diário: sincronização automática de Tarefas e relatório de atendimentos. O resto (buscar cliente/técnico, ' +
        'auditoria, importação completa) fica nas ferramentas avançadas, abaixo.</p>' +
      '</div>' +
      '<div><button type="button" class="btn" onclick="tplAuvo_abrirManual_()">Manual do Operador</button></div>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Conexão</h2>' +
      '<p class="muted">Confirma se AUVO_API_KEY/AUVO_API_TOKEN estão configurados corretamente.</p>' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_testarConexao()">Testar Conexão</button>' +
      '<div id="tplAuvo_conexaoResultado"></div>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Sincronização automática de Tarefas</h2>' +
      '<p class="muted">Verifica quais atendimentos aconteceram recentemente no Auvo e traz o Cliente correspondente pro ' +
      'Portal <strong>só quando ele aparece numa Tarefa de verdade</strong> — nunca a base inteira do Auvo de uma vez. É ' +
      'essa sincronização que alimenta o dashboard principal e o alerta de atendimento.</p>' +
      '<div class="toggle-linha">' +
        '<label class="toggle-switch"><input type="checkbox" id="tplAuvo_toggleSincAuto" onchange="tplAuvo_toggleSincAuto()"><span class="toggle-slider"></span></label>' +
        '<span>Sincronizar automaticamente a cada 30 minutos</span>' +
      '</div>' +
      '<div id="tplAuvo_statusIncremental" class="muted" style="margin:6px 0"></div>' +
      '<button type="button" class="btn btn-sm" onclick="tplAuvo_rodarSincIncremental()">Rodar agora (manual)</button>' +
      '<div id="tplAuvo_incrementalResultado"></div>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Pendências de Fechamento (O.S. abertas no Auvo)</h2>' +
      '<p class="muted">O Auvo não permite fechar tarefa por API (testado e confirmado) — essa lista existe pra tornar o ' +
      'fechamento manual gerenciável: quem é o técnico responsável, o que falta, e o link direto pra resolver lá dentro.</p>' +
      '<div id="tplAuvo_pendResumo" class="muted" style="margin:8px 0"></div>' +
      '<div class="busca-linha" style="flex-wrap:wrap">' +
        '<select id="tplAuvo_pendFiltroTecnico"><option value="">Todos os técnicos</option></select>' +
        '<select id="tplAuvo_pendFiltroEvidencia">' +
          '<option value="">Todas as pendências</option>' +
          '<option value="NAO">Só sem evidência de execução</option>' +
        '</select>' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_filtrarPendencias_()">Filtrar</button>' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_atualizarPendenciasAgora_()">Atualizar agora</button>' +
      '</div>' +
      '<div class="toggle-linha">' +
        '<label class="toggle-switch"><input type="checkbox" id="tplAuvo_pendToggleDiario" onchange="tplAuvo_pendToggleDiario_()"><span class="toggle-slider"></span></label>' +
        '<span>Atualizar automaticamente todo dia às 5h</span>' +
      '</div>' +
      '<table class="tabela-resultado"><thead><tr><th>Técnico responsável</th><th>Tarefa</th><th>Pendência</th><th>Cobranças</th><th></th></tr></thead>' +
      '<tbody id="tplAuvo_pendBody"><tr><td colspan="5" class="muted">Carregando...</td></tr></tbody></table>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Relatório de Atendimentos (A4)</h2>' +
      '<p class="muted">O relatório geral e o relatório por colaborador/grupo são gerados em HTML A4, com número da O.S., indicadores e interpretação por IA.</p>' +
      '<select id="tplAuvo_periodoRelatorio">' +
        '<option value="7">Últimos 7 dias</option>' +
        '<option value="30" selected>Últimos 30 dias</option>' +
        '<option value="90">Últimos 90 dias</option>' +
      '</select> ' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_gerarRelatorio(false)">Gerar relatório geral</button>' +
      '<div style="margin-top:12px"><label class="muted" for="tplAuvo_colaboradoresRelatorio">Colaborador ou grupo de colaboradores (Ctrl/Cmd + clique para selecionar vários)</label><br>' +
      '<select id="tplAuvo_colaboradoresRelatorio" multiple size="6" style="width:100%;max-width:520px;margin-top:6px"></select> ' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_gerarRelatorio(true)">Gerar relatório dos selecionados</button></div>' +
      '<div id="tplAuvo_relatorioResultado"></div>' +
    '</div>' +

    '<button type="button" id="tplAuvo_avancadoBtn" class="btn avancado-toggle-btn" onclick="tplAuvo_toggleAvancado()">Mostrar ferramentas avançadas</button>' +

    '<div id="tplAuvo_avancado" style="display:none;margin-top:14px">' +

      '<div class="panel">' +
        '<h2>Consultar Cliente (Portal &rarr; Auvo)</h2>' +
        '<p class="muted">Busca em vez de listar tudo — a base de clientes só cresce. Perfis com login "Sincronizar" mandam ' +
        'o cadastro do Portal pro Auvo (criando ou atualizando lá).</p>' +
        '<div class="busca-linha">' +
          '<input type="text" id="tplAuvo_buscaClienteInput" placeholder="Nome ou CNPJ do cliente..." onkeydown="if(event.key===\\'Enter\\')tplAuvo_buscarClientes()">' +
          '<button type="button" class="btn btn-sm" onclick="tplAuvo_buscarClientes()">Buscar</button>' +
        '</div>' +
        '<button type="button" class="btn btn-sm" style="margin-top:10px" onclick="tplAuvo_sincronizarTodosClientes()">Sincronizar todos os clientes ativos (lote)</button>' +
        '<div id="tplAuvo_clientesResultado"></div>' +
        '<table class="tabela-resultado"><thead><tr><th>Cliente</th><th>CNPJ</th><th>Status</th><th>Último erro</th><th></th></tr></thead>' +
        '<tbody id="tplAuvo_clientesBody"><tr><td colspan="5" class="muted">Busque um cliente acima.</td></tr></tbody></table>' +
      '</div>' +

      '<div class="panel">' +
        '<h2>Consultar Técnico / Usuário (Portal &rarr; Auvo)</h2>' +
        '<p class="muted">Perfis considerados: Técnico, Metrologia, Gestor, Administrador. O Auvo exige e-mail.</p>' +
        '<div class="busca-linha">' +
          '<input type="text" id="tplAuvo_buscaTecnicoInput" placeholder="Nome do técnico/usuário..." onkeydown="if(event.key===\\'Enter\\')tplAuvo_buscarTecnicos()">' +
          '<button type="button" class="btn btn-sm" onclick="tplAuvo_buscarTecnicos()">Buscar</button>' +
        '</div>' +
        '<button type="button" class="btn btn-sm" style="margin-top:10px" onclick="tplAuvo_sincronizarTodosTecnicos()">Sincronizar todos (lote)</button>' +
        '<div id="tplAuvo_tecnicosResultado"></div>' +
        '<table class="tabela-resultado"><thead><tr><th>Nome</th><th>Perfil</th><th>E-mail</th><th>Status</th><th>Último erro</th><th></th></tr></thead>' +
        '<tbody id="tplAuvo_tecnicosBody"><tr><td colspan="6" class="muted">Busque um usuário acima.</td></tr></tbody></table>' +
      '</div>' +

      '<div class="panel">' +
        '<h2>Auditoria do cadastro do Auvo</h2>' +
        '<p class="muted">Só leitura — nunca grava nada. Aponta nomes parecidos com CNPJ diferente no Auvo, pra você decidir ' +
        'se é duplicata de cadastro ou empresa diferente mesmo. Recomendado antes de rodar a importação completa abaixo.</p>' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_auditarNomesParecidos()">Auditar nomes parecidos</button>' +
        '<div id="tplAuvo_auditoriaResultado"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h2>Importação completa (manual, rara)</h2>' +
        '<p class="muted">Traz de uma vez TODOS os Clientes/Unidades/Equipamentos que existem no Auvo, não só os usados no ' +
        'dia a dia — pesado pra API do Auvo, por isso não roda automaticamente. Use só pra uma "foto" completa do que ' +
        'existe lá. Mesma proteção de sempre: nunca duplica, <strong>nunca sobrescreve campo já preenchido</strong>. ' +
        '<strong>Sempre rode "Simular" primeiro</strong>.</p>' +
        '<div id="tplAuvo_statusReverso" class="muted" style="margin-bottom:8px"></div>' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_simularSincReversa()">Simular (não grava nada)</button> ' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_continuarSincReversa()">Retomar sincronização em andamento</button>' +
        '<div id="tplAuvo_reversoResultado"></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h2>Enviar cadastro pendente pro Auvo (Portal &rarr; Auvo)</h2>' +
        '<p class="muted">Garante que Unidade/Equipamento que já existem no Portal também existam no Auvo (Cliente/Técnico já ' +
        'sincronizam sozinhos quando geram um documento). Cada Unidade vira um Cliente próprio no Auvo; Equipamento fica ' +
        'vinculado à Unidade dele. <strong>Sempre rode "Simular" primeiro.</strong> Documento não é enviado retroativamente — ' +
        'só os gerados a partir de agora entram automaticamente.</p>' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_simularEnvioCadastro()">Simular (não grava nada)</button>' +
        '<div id="tplAuvo_envioResultado"></div>' +
      '</div>' +

    '</div>' +
  '</div>';
}
</script>
`;
