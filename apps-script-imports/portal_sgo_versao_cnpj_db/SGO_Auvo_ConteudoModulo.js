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
  border-bottom: 1px solid var(--border); padding-bottom: 10px;
}
#tplAuvoContainer .colab-caixas { max-width: 560px; max-height: 220px; overflow: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px; margin-top: 6px; background: #FFFFFF; }
#tplAuvoContainer .colab-caixas label { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text); padding: 3px 0; cursor: pointer; }
#tplAuvoContainer .colab-caixas input { width: auto; }
#tplAuvoContainer .colab-busca { max-width: 560px; margin-top: 6px; }
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
#tplAuvoContainer .modal-auvo label { display: block; font-size: 11.5px; color: var(--muted); font-weight: 700; margin: 10px 0 4px; }
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
}
/* 27/10/2026 (print do dono no iPhone): no celular cada linha das tabelas vira um cartão, com o nome da coluna
   acima do valor (data-rot, mesmo padrão da Frota > Rastreamento). Nada quebra letra a letra e os botões ficam
   com 44 px de altura. No computador a tabela continua igual. */
@media (max-width: 760px) {
  #tplAuvoContainer table.tabela-resultado thead { display: none; }
  #tplAuvoContainer table.tabela-resultado, #tplAuvoContainer table.tabela-resultado tbody,
  #tplAuvoContainer table.tabela-resultado tr, #tplAuvoContainer table.tabela-resultado td { display: block; width: 100%; box-sizing: border-box; }
  #tplAuvoContainer table.tabela-resultado { font-size: 13px; }
  #tplAuvoContainer table.tabela-resultado tr { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; padding: 6px 12px; background: var(--card); }
  #tplAuvoContainer table.tabela-resultado td { border: 0; padding: 5px 0; overflow-wrap: anywhere; word-break: normal; }
  #tplAuvoContainer table.tabela-resultado td[data-rot]::before { content: attr(data-rot); display: block; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 2px; }
  #tplAuvoContainer table.tabela-resultado td[data-rot=""]::before { display: none; }
  #tplAuvoContainer table.tabela-resultado td.celula-acoes { padding-top: 8px; }
  #tplAuvoContainer table.tabela-resultado .tabela-acoes { display: flex; width: 100%; justify-content: stretch; }
  #tplAuvoContainer table.tabela-resultado .btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
  #tplAuvoContainer table.tabela-resultado .tabela-acoes .btn, #tplAuvoContainer table.tabela-resultado td.celula-acoes > .btn { flex: 1 1 auto; width: 100%; }
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

// 16/10/2026: datas na tela no formato brasileiro (o servidor manda ISO).
// Com fuso (Z/+hh:mm) converte para o horário local; sem fuso mostra como veio.
function tplAuvo_dataBr_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (/(Z|[+-]\\d{2}:?\\d{2})$/i.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  var m = /^(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2}))?/.exec(s);
  if (!m) return s;
  return m[3] + '/' + m[2] + '/' + m[1] + (m[4] && (m[4] + m[5]) !== '0000' ? ' ' + m[4] + ':' + m[5] : '');
}

function tplAuvo_rotuloSituacao_(v) {
  var m = { OK: 'Sincronizado', ERRO: 'Com erro', PENDENTE: 'Pendente', NAO_SINCRONIZADO: 'Não sincronizado' };
  var k = String(v || '').toUpperCase();
  return m[k] || (v ? String(v).charAt(0).toUpperCase() + String(v).slice(1).toLowerCase().replace(/_/g, ' ') : '—');
}

function tplAuvo_esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function tplAuvo_renderReal_() {
  var container = document.getElementById('tplAuvoContainer');
  if (!container) return;

  // 16/10/2026: a integração é da gestão (o servidor recusa os outros perfis);
  // antes a tela abria inteira e cada painel mostrava um erro de acesso.
  var perfilA = (typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil) ? String(USER_CONTEXT.perfil).toUpperCase() : '';
  if (['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(perfilA) === -1) {
    container.innerHTML = '<div class="wrap"><div class="panel"><h2>Integração Auvo</h2>' +
      '<p>Esta tela é usada pela gestão (Gestor, Administrador e Diretoria) para sincronizar o Auvo com o SGO+ e acompanhar as O.S. em aberto. ' +
      'Suas O.S. continuam no aplicativo do Auvo; pendências e cobranças registradas pela gestão aparecem para você ao entrar no SGO+.</p></div></div>';
    return;
  }

  container.innerHTML =
    '<div id="tplAuvo_viewPainel">' + tplAuvo_paintPainel_() + '</div>' +
    '<div id="tplAuvo_viewManual" style="display:none">' + tplAuvo_manualHtml_() + '</div>' +
    '<div class="modal-overlay-auvo" id="tplAuvo_modalCobranca"></div>';

  tplAuvo_cascoManual_();
  if (tplAuvo_ehAdmin_()) tplAuvo_carregarStatusReverso_();
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
  if (btn) btn.textContent = abrindo ? 'Ocultar ferramentas de implantação' : 'Mostrar ferramentas de implantação (administrador)';
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
      '<td data-rot="Cliente">' + tplAuvo_esc(c.nome) + '</td>' +
      '<td data-rot="CNPJ">' + tplAuvo_esc(c.cnpj) + '</td>' +
      '<td data-rot="Situação"><span class="status-pill ' + tplAuvo_esc(c.status) + '">' + tplAuvo_esc(tplAuvo_rotuloSituacao_(c.status)) + '</span></td>' +
      '<td class="muted" data-rot="' + (c.ultimoErro ? 'Último erro' : '') + '">' + tplAuvo_esc(c.ultimoErro) + '</td>' +
      '<td class="celula-acoes" data-rot=""><button type="button" class="btn btn-sm" onclick="tplAuvo_sincronizarCliente(\\'' + c.id + '\\')">Sincronizar</button></td>' +
      '</tr>';
  }).join('');
}

function tplAuvo_sincronizarCliente(id) {
  if (!confirm('Enviar o cadastro deste cliente para o Auvo? Se ele já existe lá, os dados do Auvo serão atualizados com os do SGO+.')) return;
  document.getElementById('tplAuvo_clientesResultado').innerHTML = '<div class="alert-box info">Enviando para o Auvo...</div>';
  tplAuvo_chamarApi('apiSincronizarCliente', { clienteId: id })
    .then(function() { tplAuvo_msg('tplAuvo_clientesResultado', 'success', 'Cliente enviado para o Auvo. A situação na lista abaixo foi atualizada.'); tplAuvo_buscarClientes(); })
    .catch(function(err) { tplAuvo_erro('tplAuvo_clientesResultado', err); });
}

function tplAuvo_sincronizarTodosClientes() {
  // 16/10/2026 (auditoria): envio em lote grava no Auvo — confirmar antes
  if (!confirm('Enviar todos os clientes ativos para o Auvo? Os cadastros que já existem lá serão atualizados com os dados do SGO+.')) return;
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
      '<td data-rot="Nome">' + tplAuvo_esc(u.nome) + '</td>' +
      '<td data-rot="Perfil">' + tplAuvo_esc(u.perfil) + '</td>' +
      '<td data-rot="E-mail">' + campoEmail + '</td>' +
      '<td data-rot="Situação"><span class="status-pill ' + tplAuvo_esc(u.status) + '">' + tplAuvo_esc(tplAuvo_rotuloSituacao_(u.status)) + '</span></td>' +
      '<td class="muted" data-rot="' + (u.ultimoErro ? 'Último erro' : '') + '">' + tplAuvo_esc(u.ultimoErro) + '</td>' +
      '<td class="celula-acoes" data-rot=""><button type="button" class="btn btn-sm" onclick="tplAuvo_sincronizarTecnico(\\'' + u.id + '\\')">Sincronizar</button></td>' +
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
  if (!confirm('Enviar todos os técnicos ativos para o Auvo? Os usuários que já existem lá serão atualizados com os dados do SGO+.')) return;
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
    return '<tr><td data-rot="Similaridade">' + a.similaridade + '%</td><td data-rot="Tipo">' + tipoLabel + '</td><td data-rot="Nomes (CNPJ raiz)">' + nomes + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="alert-box warning">' + res.totalAchados + ' possível(is) duplicata(s) por nome, em ' + res.totalGruposAnalisados + ' cliente(s) analisado(s) — isso é SÓ leitura, nada foi alterado. Confira cada caso e decida se é a mesma empresa (juntar) ou empresas diferentes (manter).</div>' +
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
  var ultima = (cp && cp.ultimaExecucao) ? ('Última execução: ' + tplAuvo_esc(tplAuvo_dataBr_(cp.ultimaExecucao))) : 'Nunca rodou ainda.';
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
      var linha = 'Janela: ' + tplAuvo_esc(tplAuvo_dataBr_(res.janelaDesde)) + ' a ' + tplAuvo_esc(tplAuvo_dataBr_(res.janelaAte)) + '<br>' +
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
    tplAuvo_montarCaixasColaboradores_();
  }).catch(function(err) { tplAuvo_erro('tplAuvo_relatorioResultado', err); });
}

// Fase 2 (16/10): marcação por caixas, com busca, no lugar do Ctrl+clique no select múltiplo.
function tplAuvo_montarCaixasColaboradores_() {
  var sel = document.getElementById('tplAuvo_colaboradoresRelatorio');
  var box = document.getElementById('tplAuvo_colabCaixas');
  if (!sel || !box) return;
  var ops = Array.prototype.slice.call(sel.options);
  if (!ops.length) { box.innerHTML = '<span class="muted">Nenhum colaborador com atendimento sincronizado ainda. Os nomes aparecem depois da primeira sincronização de tarefas.</span>'; return; }
  box.innerHTML = ops.map(function(op, i) {
    return '<label data-nome="' + tplAuvo_esc(String(op.text).toLowerCase()) + '"><input type="checkbox" data-i="' + i + '"> ' + tplAuvo_esc(op.text) + '</label>';
  }).join('');
  Array.prototype.forEach.call(box.querySelectorAll('input[type=checkbox]'), function(cb) {
    cb.addEventListener('change', function() { var op = sel.options[Number(cb.getAttribute('data-i'))]; if (op) op.selected = cb.checked; });
  });
}
function tplAuvo_filtrarColaboradores_() {
  var q = String((document.getElementById('tplAuvo_colabBusca') || {}).value || '').toLowerCase().trim();
  Array.prototype.forEach.call(document.querySelectorAll('#tplAuvo_colabCaixas label'), function(l) {
    l.style.display = !q || String(l.getAttribute('data-nome') || '').indexOf(q) >= 0 ? '' : 'none';
  });
}

function tplAuvo_gerarRelatorio(filtrarColaboradores) {
  var sel = document.getElementById('tplAuvo_periodoRelatorio');
  var periodoDias = sel ? Number(sel.value) : 30;
  var selColabs = document.getElementById('tplAuvo_colaboradoresRelatorio');
  var tecnicosIds = filtrarColaboradores && selColabs
    ? Array.prototype.slice.call(selColabs.selectedOptions || []).map(function(o) { return o.value; })
    : [];
  if (filtrarColaboradores && !tecnicosIds.length) {
    tplAuvo_msg('tplAuvo_relatorioResultado', 'warning', 'Marque ao menos um colaborador na lista para gerar o relatório individual ou do grupo.');
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
  linha += res.ultimaAtualizacao ? (' Última atualização: ' + tplAuvo_esc(tplAuvo_dataBr_(res.ultimaAtualizacao)) + '.') : ' Ainda não atualizado — clique em "Atualizar agora".';
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
    var tarefaTxt = tplAuvo_esc(i.TASK_TYPE_DESCRICAO) + '<br><span class="muted">' + tplAuvo_esc(i.CLIENTE_NOME) + ' · ' + tplAuvo_esc(tplAuvo_dataBr_(i.TASK_DATE)) + '</span>';
    var verNoAuvo = i.TASK_URL ? ('<a href="' + tplAuvo_esc(i.TASK_URL) + '" target="_blank" rel="noopener" class="btn btn-sm">Ver no Auvo</a>') : '';
    var cobrarBtn = i.TECNICO_ID_SGO
      ? ('<button type="button" class="btn btn-sm" onclick="tplAuvo_abrirModalCobranca_(&#39;' +
          tplAuvo_esc(i.TECNICO_ID_SGO).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.TECNICO_NOME).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.TASK_TYPE_DESCRICAO).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.CLIENTE_NOME).replace(/'/g, '&#39;') + '&#39;,&#39;' +
          tplAuvo_esc(i.DIAS_ABERTA).replace(/'/g, '&#39;') + '&#39;)">Cobrar</button>')
      : '<span class="muted" title="Esse técnico não tem login no SGO+ — a cobrança fica sem como notificar">Sem login</span>';
    return '<tr>' +
      '<td data-rot="Técnico responsável">' + tplAuvo_esc(i.TECNICO_NOME) + '</td>' +
      '<td data-rot="Tarefa">' + tarefaTxt + '</td>' +
      '<td data-rot="Pendência">' + pendenciaTxt + '</td>' +
      '<td data-rot="Cobranças">' + (Number(i.OCORRENCIAS_ABERTAS) > 0 ? ('<span class="status-pill PENDENTE">' + i.OCORRENCIAS_ABERTAS + '</span>') : '<span class="muted">—</span>') + '</td>' +
      '<td class="celula-acoes" data-rot=""><div class="tabela-acoes">' + verNoAuvo + cobrarBtn + '</div></td>' +
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
    .then(function(res) { tplAuvo_renderStatusReverso_(res.checkpoint, res); })
    .catch(function() {});
}

// Fase 2 (16/10): diz se há importação, desde quando está parada, o motivo e como retomar.
function tplAuvo_renderStatusReverso_(cp, info) {
  var el = document.getElementById('tplAuvo_statusReverso');
  if (!el || !cp) return;
  info = info || {};
  var nomesFase = { CLIENTES: 'Clientes e unidades', EQUIPAMENTOS: 'Equipamentos' };
  if (info.existe === false || !cp.fase) {
    el.innerHTML = '<span class="muted">Nenhuma importação completa foi feita ainda. Para começar, clique em Simular e confira a prévia.</span>';
    return;
  }
  if (cp.fase === 'CONCLUIDO') {
    el.innerHTML = '<span class="muted">Última importação completa concluída' + (cp.concluidoEm ? ' em ' + tplAuvo_esc(tplAuvo_dataBr_(cp.concluidoEm)) : '') + '.</span>';
    return;
  }
  var fase = nomesFase[cp.fase] || String(cp.fase).toLowerCase();
  var desde = cp.erroEm || cp.atualizadoEm || '';
  var item = cp.indice ? ', a partir do item ' + tplAuvo_esc(cp.indice) : '';
  if (info.agendado && !cp.ultimoErro) {
    el.innerHTML = '<span class="muted">Em andamento na fase ' + tplAuvo_esc(fase) + item + (desde ? ' (último lote em ' + tplAuvo_esc(tplAuvo_dataBr_(desde)) + ')' : '') + '. Continua sozinha em segundo plano; pode fechar esta tela.</span>';
    return;
  }
  var motivo = cp.ultimoErro ? tplAuvo_esc(cp.ultimoErro)
    : (info.credenciais === false ? 'a conexão com o Auvo não está configurada (Chaves e senhas)' : 'a continuação automática não está agendada');
  el.innerHTML = '<div class="alert-box warning">Importação parada' + (desde ? ' desde ' + tplAuvo_esc(tplAuvo_dataBr_(desde)) : '') + ' na fase ' + tplAuvo_esc(fase) + item + '. Motivo: ' + motivo + '. ' +
    (info.credenciais === false ? 'Grave as chaves do Auvo em Chaves e senhas e depois clique em Retomar.' : 'Para continuar, clique em Retomar sincronização em andamento.') + '</div>';
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
    return '<tr><td data-rot="CNPJ raiz">' + tplAuvo_esc(g.cnpjRaiz) + '</td><td data-rot="Qtd. unidades">' + g.qtdUnidades + '</td><td data-rot="Nomes (Auvo)">' + tplAuvo_esc(g.nomes.join(' / ')) + '</td></tr>';
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
    (e.ignoradosSemDado ? (e.ignoradosSemDado + ' ignorado(s) por não ter nenhum dado útil preenchido (sem TAG/fabricante/modelo/série) — não entram no SGO+. ') : '') +
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
    return '<tr><td data-rot="Unidade">' + tplAuvo_esc(x.nome) + '</td><td data-rot="CNPJ">' + tplAuvo_esc(x.cnpj || '-') + '</td></tr>';
  }).join('');
  var amostraE = (res.amostraEquipamentos || []).map(function(x) {
    return '<tr><td data-rot="Equipamento">' + tplAuvo_esc(x.tipo || '-') + '</td><td data-rot="TAG">' + tplAuvo_esc(x.tag || '-') + '</td></tr>';
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
  if (!confirm('Enviar ao Auvo as unidades e os equipamentos pendentes mostrados na prévia?')) return;
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
  function ir(id, txt) { return '<li><a onclick="document.getElementById(\\'' + id + '\\').scrollIntoView({behavior:\\'smooth\\'})">' + txt + '</a></li>'; }
  return \`<div class="wrap manual-wrap">
<h1>Integração Auvo — Manual do operador</h1>
<p class="subtitulo">Uso diário pela gestão (Gestor, Administrador e Diretoria), incluindo enviar ao Auvo a correção de um cliente e o cadastro pendente. Ferramentas de implantação só pelo Administrador.</p>

<div class="toc"><h2>Índice</h2><ol>\` +
    ir('ma-1', 'O que esta tela faz') +
    ir('ma-2', 'Antes de começar: as chaves do Auvo') +
    ir('ma-3', 'Trazer os atendimentos do Auvo') +
    ir('ma-4', 'O.S. abertas: pendências e cobrança') +
    ir('ma-5', 'Relatório de atendimentos (A4)') +
    ir('ma-6', 'Ver uma O.S. pelo Início') +
    ir('ma-7', 'Tarefas criadas sozinhas pelo SGO+') +
    ir('ma-8', 'Ferramentas de implantação (Administrador)') +
    ir('ma-9', 'Cores e selos') +
    ir('ma-10', 'Erros comuns e o que fazer') +
    ir('ma-11', 'O que ainda não está incluído') +
\`</ol></div>

<h2 id="ma-1">1. O que esta tela faz</h2>
<p>Liga o SGO+ ao Auvo. Traz para o SGO+ os atendimentos (O.S.) feitos no Auvo, mostra as O.S. que ainda não foram encerradas e gera o relatório de atendimentos.</p>
<div class="callout"><strong>Quem usa:</strong> Administrador, Gestor e Diretoria. O técnico continua usando o aplicativo do Auvo. As cobranças que a gestão registra aparecem para ele ao entrar no SGO+.</div>

<h2 id="ma-2">2. Antes de começar: as chaves do Auvo</h2>
<ol>
<li>No Auvo, gere a chave e o código de acesso em Menu &gt; Integração.</li>
<li>No SGO+, o Administrador grava AUVO_API_KEY e AUVO_API_TOKEN em "Chaves e senhas" (grupo Auvo).</li>
<li>Volte a esta tela e toque em "Testar conexão".</li>
<li>Caixa verde "Conexão com o Auvo estabelecida com sucesso.": está pronto.</li>
</ol>

<h2 id="ma-3">3. Trazer os atendimentos do Auvo</h2>
<p>O quadro "Sincronização automática de Tarefas" traz os atendimentos recentes (e os ainda abertos dos últimos 7 dias). O cliente só vem para o SGO+ quando aparece numa tarefa. Equipamentos não vêm por aqui.</p>
<ol>
<li>Ligue a chave "Sincronizar automaticamente a cada 30 minutos".</li>
<li>Para trazer na hora, toque em "Sincronizar agora".</li>
<li>Espere terminar e leia o resultado: tarefas encontradas e clientes novos.</li>
<li>Confira a linha "Última execução".</li>
</ol>
<div class="callout"><strong>O histórico começa no dia em que a sincronização foi ligada.</strong> É ela que alimenta o Início (atendimentos abertos, concluídos, O.S. sem relato, últimos atendimentos) e o aviso "Atendimento iniciado" / "Atendimento concluído" no canto da tela do computador.</div>

<h2 id="ma-4">4. O.S. abertas: pendências e cobrança</h2>
<p>O Auvo não deixa o SGO+ encerrar a O.S. O quadro "Pendências de fechamento (O.S. abertas no Auvo)" mostra quem é o técnico, o que falta e o link para encerrar no Auvo.</p>
<ol>
<li>Se aparecer "Ainda não atualizado", toque em "Atualizar agora". Pode levar alguns minutos.</li>
<li>Para ver um técnico só, escolha o nome em "Todos os técnicos".</li>
<li>Para ver só as mais graves, escolha "Só sem evidência de execução".</li>
<li>Toque em "Filtrar".</li>
<li>Para encerrar, toque em "Ver no Auvo" e encerre lá.</li>
<li>Para cobrar o técnico, toque em "Cobrar", confira a "Descrição" e toque em "Salvar".</li>
</ol>
<p>A cobrança fica registrada no Painel de qualidade. Para atualizar a lista todo dia sozinho, ligue "Atualizar automaticamente todo dia às 5h".</p>
<p>"Aberta há N dias" conta desde a data da tarefa no Auvo até a última atualização da lista. A busca olha até cerca de 3 anos para trás, de propósito: O.S. esquecidas há mais de 2 anos aparecem com centenas de dias e devem ser encerradas no Auvo (ou cobradas).</p>
<p>No celular, cada O.S. aparece como um cartão, com o nome do campo acima do valor ("Técnico responsável", "Tarefa", "Pendência", "Cobranças") e os botões "Ver no Auvo" e "Cobrar" embaixo, na largura do cartão. As outras tabelas da tela (clientes, usuários, auditoria e amostras) seguem o mesmo formato.</p>
<div class="callout"><strong>"Atualização em andamento em segundo plano..."</strong> quer dizer que a varredura é grande e continua sozinha. Volte em alguns minutos e toque em "Atualizar agora" de novo.</div>

<h2 id="ma-5">5. Relatório de atendimentos (A4)</h2>
<ol>
<li>No quadro "Relatório de atendimentos (A4)", escolha o período: "Últimos 7 dias", "Últimos 30 dias" ou "Últimos 90 dias".</li>
<li>Para todos, toque em "Gerar relatório geral".</li>
<li>Para uma pessoa ou um grupo, procure em "Buscar pelo nome", marque um ou mais nomes e toque em "Gerar relatório dos selecionados".</li>
<li>Aguarde até 1 minuto. O relatório abre numa aba nova. Não feche a aba antes de terminar.</li>
</ol>
<p>O relatório traz o número de cada O.S., os indicadores e uma interpretação escrita a partir dos números.</p>

<h2 id="ma-6">6. Ver uma O.S. pelo Início</h2>
<ol>
<li>No Início, em "Últimos atendimentos", toque na linha da O.S.</li>
<li>Leia técnico, tipo, data, situação, endereço, relato, checklist, fotos e assinatura.</li>
<li>Toque em "Abrir no Auvo" para ver lá, ou em "Fechar".</li>
</ol>

<h2 id="ma-7">7. Tarefas criadas sozinhas pelo SGO+</h2>
<p>Ao emitir certificado de calibração, laudo NR-13, registro operacional ou PGT e POP, o SGO+ cria uma tarefa concluída no Auvo. O cliente e o técnico são enviados na hora, se ainda não estiverem lá. Se o Auvo falhar, o documento sai do mesmo jeito.</p>

<h2 id="ma-8">8. Enviar correções ao Auvo e ferramentas de implantação</h2>
<h3>Enviar a correção de um cliente (toda a gestão)</h3>
<ol>
<li>Corrija o cliente no SGO+ (Cadastros &gt; Clientes ou Vínculos).</li>
<li>Em "Enviar correção de cliente para o Auvo (SGO+ → Auvo)", digite pelo menos 2 letras do nome ou o CNPJ e toque em "Buscar".</li>
<li>Toque em "Sincronizar" na linha do cliente e confirme. O cadastro do SGO+ vai para o Auvo (cria ou atualiza lá).</li>
</ol>
<p>O envio de unidades e equipamentos pendentes (fim desta seção) também é de toda a gestão. As ferramentas abaixo, não: toque em "Mostrar ferramentas de implantação (administrador)". Use sempre "Simular (não grava nada)" antes de confirmar.</p>
<h3>Enviar técnico ao Auvo e envio em lote (Administrador)</h3>
<ol>
<li>Em "Consultar técnico / usuário (SGO+ → Auvo)", digite pelo menos 2 letras e toque em "Buscar".</li>
<li>Se o técnico não tiver e-mail, preencha e toque em "Salvar". O Auvo exige e-mail.</li>
<li>Toque em "Sincronizar" na linha. Para todos de uma vez, use o botão de lote e confirme.</li>
</ol>
<h3>Procurar clientes repetidos</h3>
<p>Em "Auditoria do cadastro do Auvo", toque em "Auditar nomes parecidos". Nada é alterado: a lista só mostra os pares para você conferir.</p>
<h3>Importação completa (Auvo → SGO+, rara)</h3>
<ol>
<li>Toque em "Simular (não grava nada)" e leia a prévia.</li>
<li>Toque em "Confirmar e executar de verdade".</li>
<li>A importação anda em lotes e continua sozinha. Pode fechar a tela.</li>
<li>Se aparecer "Importação parada", siga o que a caixa diz e toque em "Retomar sincronização em andamento".</li>
</ol>
<div class="callout"><strong>Regras que protegem o cadastro:</strong> os 8 primeiros números do CNPJ agrupam o cliente e suas unidades. Nada é duplicado. Cadastro feito no SGO+ é protegido: só ganha a ligação com o Auvo. Campo já preenchido não é trocado.</div>
<h3>Enviar cadastro pendente (SGO+ → Auvo, toda a gestão)</h3>
<ol>
<li>Em "Enviar cadastro pendente para o Auvo (SGO+ → Auvo)", toque em "Simular (não grava nada)".</li>
<li>Confira quantas unidades e equipamentos faltam.</li>
<li>Toque em "Confirmar e enviar de verdade" e espere "Envio concluído.".</li>
</ol>
<p>Cada unidade vira um cliente no Auvo. Equipamento sem unidade não pode ser enviado.</p>

<h2 id="ma-9">9. Cores e selos</h2>
<table>
<tr><th>O que aparece</th><th>O que quer dizer</th></tr>
<tr><td>Vermelho "Sem evidência de execução"</td><td>O.S. aberta sem relato, questionário, check-in nem assinatura. Pode não ter sido feita</td></tr>
<tr><td>Verde "Aberta há N dias"</td><td>Tem sinais de que foi feita, mas não foi encerrada</td></tr>
<tr><td>Amarelo com número em "Cobranças"</td><td>Cobranças em aberto do técnico</td></tr>
<tr><td>"Sem login"</td><td>O técnico não tem login no SGO+; a cobrança não chegaria até ele</td></tr>
<tr><td>Verde "Sincronizado" / amarelo "Pendente" / vermelho "Com erro"</td><td>Situação do envio de cliente ou técnico</td></tr>
<tr><td>Caixa verde / vermelha / azul / amarela</td><td>Deu certo / deu erro / em andamento / atenção ou prévia</td></tr>
</table>

<h2 id="ma-10">10. Erros comuns e o que fazer</h2>
<table>
<tr><th>O que aparece</th><th>O que fazer</th></tr>
<tr><td>"Credenciais do Auvo não configuradas"</td><td>O Administrador grava AUVO_API_KEY e AUVO_API_TOKEN em "Chaves e senhas"</td></tr>
<tr><td>"Credenciais do Auvo inválidas"</td><td>Gere as chaves de novo no Auvo e grave em "Chaves e senhas"</td></tr>
<tr><td>"Limite de requisições do Auvo atingido"</td><td>Espere alguns minutos e tente de novo</td></tr>
<tr><td>"Auvo temporariamente indisponível" ou "Falha ao comunicar com o Auvo"</td><td>Tente mais tarde. Nada se perde</td></tr>
<tr><td>"não tem e-mail cadastrado"</td><td>Preencha o e-mail do técnico nas ferramentas de implantação e sincronize de novo</td></tr>
<tr><td>Mensagem com "painel do gestor" ou "painel de vínculos"</td><td>Há cliente ou unidade repetidos ou ligados errado. Corrija em "Vínculos" e sincronize de novo</td></tr>
<tr><td>"Chave GEMINI_API_KEY não configurada"</td><td>O Administrador grava a chave da IA em "Chaves e senhas"</td></tr>
<tr><td>"A janela do relatório foi fechada antes de terminar"</td><td>Gere de novo e deixe a aba aberta</td></tr>
</table>

<h2 id="ma-11">11. O que ainda não está incluído</h2>
<ul>
<li>Equipes do Auvo e técnicos criados no Auvo não voltam para o SGO+.</li>
<li>Relatório de calibração, declaração de execução, cronograma, planejamento CME, autoclave, cadeia de frio, estufa e banho-maria e lavadora ainda não criam tarefa no Auvo.</li>
</ul>

<button type="button" class="btn topo-link" onclick="tplAuvo_voltarDoManual_()">&larr; Voltar ao painel</button>
</div>\`;
}

function tplAuvo_paintPainel_() {
  var ehAdminAuvo = tplAuvo_ehAdmin_();
  return '<div class="wrap">' +
    '<div id="tplAuvo_barraLocal" style="display:none;justify-content:flex-end;margin-bottom:10px"><button type="button" class="btn" onclick="tplAuvo_abrirManual_()">Manual do operador</button></div>' +

    '<div class="panel">' +
      '<h2>Conexão</h2>' +
      '<p class="muted">Confere se a conta do Auvo está conectada ao SGO+. As chaves de acesso são gravadas pelo administrador em Chaves e senhas.</p>' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_testarConexao()">Testar conexão</button>' +
      '<div id="tplAuvo_conexaoResultado"></div>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Sincronização automática de Tarefas</h2>' +
      '<p class="muted">Verifica os atendimentos recentes no Auvo (e os ainda abertos dos últimos 7 dias) e traz o cliente para o ' +
      'SGO+ <strong>só quando ele aparece numa tarefa</strong>, nunca a base inteira do Auvo de uma vez. É ' +
      'essa sincronização que alimenta o Início e o alerta de atendimento.</p>' +
      '<div class="toggle-linha">' +
        '<label class="toggle-switch"><input type="checkbox" id="tplAuvo_toggleSincAuto" onchange="tplAuvo_toggleSincAuto()"><span class="toggle-slider"></span></label>' +
        '<span>Sincronizar automaticamente a cada 30 minutos</span>' +
      '</div>' +
      '<div id="tplAuvo_statusIncremental" class="muted" style="margin:6px 0"></div>' +
      '<button type="button" class="btn btn-sm" onclick="tplAuvo_rodarSincIncremental()">Sincronizar agora</button>' +
      '<div id="tplAuvo_incrementalResultado"></div>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Pendências de fechamento (O.S. abertas no Auvo)</h2>' +
      '<p class="muted">O Auvo não permite encerrar a O.S. pelo SGO+; esta lista mostra o técnico responsável, o que falta ' +
      'e o link para encerrar no Auvo.</p>' +
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
      '<h2>Relatório de atendimentos (A4)</h2>' +
      '<p class="muted">O relatório geral e o relatório por colaborador/grupo são gerados em HTML A4, com número da O.S., indicadores e interpretação por IA.</p>' +
      '<select id="tplAuvo_periodoRelatorio">' +
        '<option value="7">Últimos 7 dias</option>' +
        '<option value="30" selected>Últimos 30 dias</option>' +
        '<option value="90">Últimos 90 dias</option>' +
      '</select> ' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_gerarRelatorio(false)">Gerar relatório geral</button>' +
      '<div style="margin-top:12px"><label class="muted" for="tplAuvo_colabBusca">Colaborador ou grupo de colaboradores (marque um ou mais)</label>' +
      '<input type="text" id="tplAuvo_colabBusca" class="colab-busca" placeholder="Buscar pelo nome" oninput="tplAuvo_filtrarColaboradores_()">' +
      '<div id="tplAuvo_colabCaixas" class="colab-caixas"><span class="muted">Carregando...</span></div>' +
      '<select id="tplAuvo_colaboradoresRelatorio" multiple style="display:none"></select> ' +
      '<button type="button" class="btn btn-primary" onclick="tplAuvo_gerarRelatorio(true)">Gerar relatório dos selecionados</button></div>' +
      '<div id="tplAuvo_relatorioResultado"></div>' +
    '</div>' +

    // 26/10/2026 (pedido do dono): enviar a correção de um cliente e o cadastro pendente é da gestão.
    '<div class="panel">' +
      '<h2>Enviar correção de cliente para o Auvo (SGO+ &rarr; Auvo)</h2>' +
      '<p class="muted">Depois de corrigir um cliente no SGO+, busque pelo nome ou CNPJ e toque em "Sincronizar": ' +
      'o cadastro do SGO+ vai para o Auvo (cria ou atualiza lá). Um cliente por vez.</p>' +
      '<div class="busca-linha">' +
        '<input type="text" id="tplAuvo_buscaClienteInput" placeholder="Nome ou CNPJ do cliente..." onkeydown="if(event.key===\\'Enter\\')tplAuvo_buscarClientes()">' +
        '<button type="button" class="btn btn-sm" onclick="tplAuvo_buscarClientes()">Buscar</button>' +
      '</div>' +
      (ehAdminAuvo ? '<button type="button" class="btn btn-sm" style="margin-top:10px" onclick="tplAuvo_sincronizarTodosClientes()">Sincronizar todos os clientes ativos (lote, administrador)</button>' : '') +
      '<div id="tplAuvo_clientesResultado"></div>' +
      '<table class="tabela-resultado"><thead><tr><th>Cliente</th><th>CNPJ</th><th>Situação</th><th>Último erro</th><th></th></tr></thead>' +
      '<tbody id="tplAuvo_clientesBody"><tr><td colspan="5" class="muted">Busque um cliente acima.</td></tr></tbody></table>' +
    '</div>' +

    '<div class="panel">' +
      '<h2>Enviar cadastro pendente para o Auvo (SGO+ &rarr; Auvo)</h2>' +
      '<p class="muted">Garante que Unidade/Equipamento que já existem no SGO+ também existam no Auvo (Cliente/Técnico já ' +
      'sincronizam sozinhos quando geram um documento). Cada Unidade vira um Cliente próprio no Auvo; Equipamento fica ' +
      'vinculado à Unidade dele. Só envia o que ainda falta lá. <strong>Sempre rode "Simular" primeiro.</strong> Documento não é enviado retroativamente — ' +
      'só os gerados a partir de agora entram automaticamente.</p>' +
      '<button type="button" class="btn btn-sm" onclick="tplAuvo_simularEnvioCadastro()">Simular (não grava nada)</button>' +
      '<div id="tplAuvo_envioResultado"></div>' +
    '</div>' +

    (!ehAdminAuvo ? '<p class="muted" style="margin-top:4px">As ferramentas de implantação (envio em lote, técnicos, importação completa e auditoria do cadastro) ficam com o Administrador.</p>' : '') +
    (!ehAdminAuvo ? '' : '<button type="button" id="tplAuvo_avancadoBtn" class="btn avancado-toggle-btn" onclick="tplAuvo_toggleAvancado()">Mostrar ferramentas de implantação (administrador)</button>' +

    '<div id="tplAuvo_avancado" style="display:none;margin-top:14px">' +

      '<div class="panel">' +
        '<h2>Consultar técnico / usuário (SGO+ &rarr; Auvo)</h2>' +
        '<p class="muted">Perfis considerados: Técnico, Metrologia, Gestor, Administrador. O Auvo exige e-mail.</p>' +
        '<div class="busca-linha">' +
          '<input type="text" id="tplAuvo_buscaTecnicoInput" placeholder="Nome do técnico/usuário..." onkeydown="if(event.key===\\'Enter\\')tplAuvo_buscarTecnicos()">' +
          '<button type="button" class="btn btn-sm" onclick="tplAuvo_buscarTecnicos()">Buscar</button>' +
        '</div>' +
        '<button type="button" class="btn btn-sm" style="margin-top:10px" onclick="tplAuvo_sincronizarTodosTecnicos()">Sincronizar todos (lote)</button>' +
        '<div id="tplAuvo_tecnicosResultado"></div>' +
        '<table class="tabela-resultado"><thead><tr><th>Nome</th><th>Perfil</th><th>E-mail</th><th>Situação</th><th>Último erro</th><th></th></tr></thead>' +
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

    '</div>') +
  '</div>';
}

function tplAuvo_ehAdmin_() {
  try { return String((typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil) || '').toUpperCase() === 'ADMIN'; } catch (e) { return false; }
}

// O casco já mostra o título; o manual vai para a barra do casco, ao lado de "Atividades do módulo".
function tplAuvo_cascoManual_() {
  try {
    var cab = document.querySelector('#conteudo .module-header');
    if (!cab) { var l = document.getElementById('tplAuvo_barraLocal'); if (l) l.style.display = 'flex'; return; }
    if (cab.querySelector('.tplAuvo-btn-manual')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn-secondary sgo-btn-manual tplAuvo-btn-manual';
    b.innerHTML = '<i class="fas fa-book" aria-hidden="true"></i>&nbsp;Manual do operador';
    b.onclick = function () { tplAuvo_abrirManual_(); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
    var atv = cab.querySelector('.atv-btn-modulo');
    var dir = cab.querySelector('.module-header-right');
    if (!dir) { dir = document.createElement('div'); dir.className = 'module-header-right'; dir.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto;'; if (atv && atv.parentNode === cab) cab.insertBefore(dir, atv); else cab.appendChild(dir); }
    if (atv && atv.parentNode === cab) dir.appendChild(atv);
    dir.insertBefore(b, dir.firstChild);
  } catch (e) {}
}
</script>
`;
