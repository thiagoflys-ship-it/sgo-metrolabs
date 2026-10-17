var NR13_CONTEUDO_MODULO = `<style>
#tplNR13Container {
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
#tplNR13Container * { box-sizing: border-box; }
#tplNR13Container .hidden { display: none !important; }
#tplNR13Container, #tplNR13Container body {
  font-family: var(--bc-sans);
  background: transparent !important;
  color: var(--text) !important;
}
#tplNR13Container .wrap { max-width: 1100px; margin: 0 auto; padding: 18px; }
#tplNR13Container .header-card {
  background: #FFFFFF !important; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px 18px; box-shadow: var(--shadow-soft); margin-bottom: 14px;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
}
#tplNR13Container .title-area h1 { margin: 0; font-size: 19px; color: var(--text-strong); font-weight: 800; }
#tplNR13Container .title-area p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
#tplNR13Container .panel {
  background: #FFFFFF !important; border-radius: var(--radius); padding: 18px;
  box-shadow: var(--shadow-soft); border: 1px solid var(--border); margin-bottom: 14px;
}
#tplNR13Container .panel h2 {
  margin: 0 0 14px; font-size: 14px; color: var(--text-strong) !important;
  border-bottom: 1px solid var(--border); padding-bottom: 10px; text-transform: uppercase;
}
#tplNR13Container label { display: block; font-size: 12px; color: var(--muted); margin: 10px 0 4px; }
#tplNR13Container input[type="text"], #tplNR13Container input:not([type]), #tplNR13Container input[type="number"],
#tplNR13Container input[type="file"], #tplNR13Container select, #tplNR13Container textarea {
  width: 100%; background: var(--input) !important; color: var(--text) !important; border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 10px; font-size: 13px;
}
#tplNR13Container textarea { min-height: 70px; resize: vertical; }
#tplNR13Container .form-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
#tplNR13Container .form-row > * { flex: 1; min-width: 180px; }
#tplNR13Container .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
#tplNR13Container .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
#tplNR13Container .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
#tplNR13Container .btn, #tplNR13Container .btn-primary {
  border: 1px solid var(--border-strong); background: var(--input); color: var(--text);
  border-radius: var(--radius-sm); padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: pointer; margin-top: 10px;
}
#tplNR13Container .btn:hover { background: var(--input-hover); }
#tplNR13Container .btn-primary { background: var(--accent); color: #FFFFFF; border-color: var(--accent); }
#tplNR13Container .btn-primary:hover { filter: brightness(1.08); }
#tplNR13Container .btn-danger { background: var(--danger-bg); color: var(--bc-danger); border-color: var(--bc-danger-line); }
#tplNR13Container .btn-warning { background: var(--warning-bg); color: var(--bc-warn); border-color: var(--bc-warn-line); }
#tplNR13Container .btn-sm { padding: 5px 10px; font-size: 11.5px; margin-top: 0; }
#tplNR13Container .alert-box { border-radius: var(--radius-sm); padding: 10px 12px; font-size: 12.5px; margin-top: 10px; }
#tplNR13Container .alert-box.success { background: var(--success-bg); color: var(--bc-text-2); border: 1px solid var(--bc-action-line); }
#tplNR13Container .alert-box.error { background: var(--danger-bg); color: var(--bc-danger); border: 1px solid var(--bc-danger-line); }
#tplNR13Container .alert-box.info { background: var(--info-bg); color: var(--bc-info); border: 1px solid var(--bc-info-line); }
#tplNR13Container .alert-box.warning { background: var(--warning-bg); color: var(--bc-warn); border: 1px solid var(--bc-warn-line); }
#tplNR13Container .cliente-card, #tplNR13Container .equip-card {
  background: var(--success-bg); border: 1px solid var(--bc-action-line); border-radius: var(--radius-sm);
  padding: 10px 12px; margin-top: 10px; font-size: 13px;
}
#tplNR13Container .checkbox-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
#tplNR13Container .checkbox-row label { margin: 0; color: var(--text); font-size: 13px; }
#tplNR13Container .radio-veredito { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; margin: 6px 0; cursor: pointer; display: flex; align-items: center; gap: 8px; }
#tplNR13Container .radio-veredito.selecionado-aprovado { border-color: var(--accent); background: var(--success-bg); }
#tplNR13Container .radio-veredito.selecionado-ressalvas { border-color: var(--warning); background: var(--warning-bg); }
#tplNR13Container .radio-veredito.selecionado-reprovado { border-color: var(--danger); background: var(--danger-bg); }
#tplNR13Container .categoria-preview { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
#tplNR13Container .categoria-box { flex: 1; min-width: 130px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; text-align: center; background: var(--input); }
#tplNR13Container .categoria-box .valor { font-size: 22px; font-weight: 800; color: var(--accent); }
#tplNR13Container .categoria-box .rotulo-mini { font-size: 10.5px; color: var(--muted); text-transform: uppercase; }
#tplNR13Container .foto-card { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px; background: #FFFFFF; display: flex; gap: 12px; flex-wrap: wrap; }
#tplNR13Container .foto-card img { width: 140px; height: 105px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border); }
#tplNR13Container .foto-card .foto-campos { flex: 1; min-width: 220px; }
#tplNR13Container .foto-card .interpretacao-ia-preview { background: var(--info-bg); border: 1px solid var(--bc-info-line); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 12px; margin-top: 8px; }
#tplNR13Container .cert-item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12.5px; gap: 8px; flex-wrap: wrap; }
#tplNR13Container .cert-item-row:last-child { border-bottom: none; }
#tplNR13Container .muted { color: var(--muted); font-size: 12px; }
#tplNR13Container table.tabela-resultado { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
#tplNR13Container table.tabela-resultado th, #tplNR13Container table.tabela-resultado td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; }
#tplNR13Container table.tabela-resultado th { background: #FFFFFF; color: var(--muted); font-weight: 700; }
#tplNR13Container .terminal-wrap { margin-top: 12px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); box-shadow: inset 0 1px 0 rgba(255,255,255,.02); }
#tplNR13Container .terminal-header { background: #FFFFFF; color: var(--bc-text-3); padding: 10px 12px; font-size: 11px; font-weight: 800; }
#tplNR13Container .terminal { background: #FFFFFF; color: var(--bc-action); padding: 14px; font-family: var(--bc-mono); font-size: 12px; height: 260px; overflow-y: auto; white-space: pre-wrap; line-height: 1.55; }
#tplNR13Container .terminal .success { color: var(--bc-action); font-weight: 800; }
#tplNR13Container .terminal .error { color: var(--bc-danger); font-weight: 800; }
#tplNR13Container .terminal .warn { color: var(--bc-warn); font-weight: 800; }

@media (max-width: 640px) {
  #tplNR13Container .wrap { padding: 10px; }
  #tplNR13Container .grid-2, #tplNR13Container .grid-3, #tplNR13Container .grid-4 { grid-template-columns: 1fr; }
  #tplNR13Container .header-card { flex-direction: column; align-items: flex-start; }
  #tplNR13Container .foto-card { flex-direction: column; }
  #tplNR13Container .foto-card img { width: 100%; height: 180px; }
  #tplNR13Container .toc ol { columns: 1; }
}

#tplNR13Container .manual-wrap { max-width: 900px; margin: 0 auto; padding: 18px 18px 60px; line-height: 1.6; }
#tplNR13Container .manual-wrap h1 { font-size: 26px; margin-bottom: 4px; }
#tplNR13Container .manual-wrap .subtitulo { color: var(--muted); margin-top: 0; margin-bottom: 22px; }
#tplNR13Container .manual-wrap h2 { font-size: 19px; margin-top: 40px; padding-bottom: 8px; border-bottom: 1px solid var(--border); color: var(--text-strong); }
#tplNR13Container .manual-wrap h3 { font-size: 15px; margin-top: 26px; color: var(--accent-2); }
#tplNR13Container .manual-wrap p { color: var(--text); }
#tplNR13Container .manual-wrap table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 13.5px; }
#tplNR13Container .manual-wrap th, #tplNR13Container .manual-wrap td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
#tplNR13Container .manual-wrap th { background: #FFFFFF; color: var(--text-strong); }
#tplNR13Container .manual-wrap tr:nth-child(even) td { background: var(--bc-surface-2); }
#tplNR13Container .callout { background: var(--bc-action-bg); border: 1px solid var(--bc-action-line); border-left: 4px solid var(--accent); border-radius: var(--radius-sm); padding: 12px 14px; margin: 14px 0; font-size: 13.5px; }
#tplNR13Container .callout strong { color: var(--text-strong); }
#tplNR13Container .manual-wrap ol, #tplNR13Container .manual-wrap ul { padding-left: 22px; }
#tplNR13Container .manual-wrap ol li, #tplNR13Container .manual-wrap ul li { margin-bottom: 6px; }
#tplNR13Container .toc { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 30px; }
#tplNR13Container .toc h2 { margin-top: 0; border-bottom: none; font-size: 15px; }
#tplNR13Container .toc ol { columns: 2; column-gap: 30px; }
#tplNR13Container .toc a { text-decoration: none; color: var(--accent-2); cursor: pointer; }
#tplNR13Container .toc a:hover { text-decoration: underline; }
#tplNR13Container .topo-link { display: inline-block; margin-top: 30px; }
</style>
<script>
var nr13State = {
  cliente: null,
  unidadeSelecionadaId: null,
  equipamentos: [],
  equipamentoSelecionado: null,
  laudoId: null,
  registroOrigemId: null,
  fotos: [],
  categoriaCalculada: null,
  valvulas: [],
  manometros: []
};

var NR13_ASSINANTES = ['Charles Hytley Santos Teixeira', 'Douglas Silva dos Santos Souza'];
var NR13_TIPOS_VASO = ['Autoclave', 'Compressor', 'Central de Ar Comprimido', 'Central de Vácuo', 'Reservatório', 'Trocador de Calor', 'Outro'];
var NR13_TIPOS_INSPECAO = ['Inicial', 'Periódica', 'Extraordinária'];
var NR13_UNIDADES_PRESSAO = { MPa: 1, bar: 0.1, 'kgf/cm²': 0.0980665 };
var NR13_UNIDADES_VOLUME = { 'm³': 1, L: 0.001 };
var NR13_RESULTADOS_ITEM = ['Aprovado', 'Reprovado'];

function tplNR13_chamarApi(fn, payload) {
  return new Promise(function(resolve, reject) {
    if (typeof SGO_iniciarCarregamento_ === 'function') SGO_iniciarCarregamento_();
    google.script.run
      .withSuccessHandler(function(res) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); resolve(res); })
      .withFailureHandler(function(err) { if (typeof SGO_finalizarCarregamento_ === 'function') SGO_finalizarCarregamento_(); reject(err); })
      .NR13_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  });
}

function tplNR13_msg(containerId, tipo, texto) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="alert-box ' + tipo + '">' + texto + '</div>';
}

function tplNR13_erro(containerId, err) {
  var msg = (err && err.message) ? err.message : String(err);
  tplNR13_msg(containerId, 'error', msg);
  var contorno = document.getElementById('nr13-contorno-emitido');
  if (contorno && /já foi emitido/i.test(msg)) contorno.classList.remove('hidden');
  tplNR13_writeLog(msg, 'ERRO');
}

// ---------------- Console Operacional (log em tempo real) ----------------
function tplNR13_writeLog(text, tipo) {
  var term = document.getElementById('tplNR13_terminalLog');
  if (!term) return;
  var time = new Date().toLocaleTimeString('pt-BR');
  var line = document.createElement('div');
  line.textContent = '[' + time + '] ' + String(text || '');
  if (tipo === 'SUCESSO') line.className = 'success';
  else if (tipo === 'ERRO') line.className = 'error';
  else if (tipo === 'AVISO') line.className = 'warn';
  term.appendChild(line);
  term.scrollTop = term.scrollHeight;
}

function tplNR13_limparLog() {
  var term = document.getElementById('tplNR13_terminalLog');
  if (term) term.innerHTML = '';
  tplNR13_writeLog('Histórico limpo.', 'SUCESSO');
}

function tplNR13_contextoVaso_() {
  var tipo = document.getElementById('nr13-eq-tipo-atual') ? document.getElementById('nr13-eq-tipo-atual').textContent : '';
  return (tipo || 'Vaso de pressão') + (nr13State.equipamentoSelecionado ? (' — TAG ' + (nr13State.equipamentoSelecionado.TAG || '')) : '');
}

function tplNR13_lerArquivoComoBase64_(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var resultado = reader.result || '';
      var base64 = String(resultado).replace(/^data:[^;]+;base64,/, '');
      resolve({ base64: base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = function() { reject(new Error('Falha ao ler o arquivo.')); };
    reader.readAsDataURL(file);
  });
}

function tplNR13_abrirHtmlEmNovaAba_(janela, html) {
  if (!janela) return;
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

// ================================================================
// RENDER PRINCIPAL
// ================================================================
function tplNR13_renderReal_() {
  var container = document.getElementById('tplNR13Container');
  if (!container) return;

  container.innerHTML =
    '<div id="tplNR13_viewModulo">' +
    '<div class="wrap">' +

    '  <div class="panel">' +
    '    <h2>Consultar laudos já emitidos ou continuar rascunho salvo (por CNPJ)</h2>' +
    '    <div class="form-row">' +
    '      <input id="nr13-busca-cnpj" placeholder="CNPJ do cliente">' +
    '      <button class="btn" onclick="tplNR13_buscarPorCnpj()">Buscar laudos emitidos</button>' +
    '      <button class="btn" onclick="tplNR13_buscarRascunhos_()">Buscar rascunhos salvos</button>' +
    '    </div>' +
    '    <p class="muted">Se você já salvou um rascunho e a página recarregou (ou a aba fechou), use "Buscar rascunhos salvos" pra continuar de onde parou, sem digitar tudo de novo.</p>' +
    '    <div id="nr13-busca-resultado"></div>' +
    '    <div id="nr13-rascunhos-resultado"></div>' +
    '  </div>' +

    '  <div class="panel">' +
    '    <h2>1. Cliente</h2>' +
    '    <div class="form-row">' +
    '      <input id="nr13-cnpj" placeholder="CNPJ do cliente (só números)">' +
    '      <button class="btn" onclick="tplNR13_buscarCliente()">Buscar / Selecionar Cliente</button>' +
    '    </div>' +
    '    <div id="nr13-cliente-status"></div>' +
    '    <div id="nr13-cliente-novo" class="hidden">' +
    '      <div class="grid-2">' +
    '        <div><label>Razão social</label><input id="nr13-novo-razaoSocial"></div>' +
    '        <div><label>Nome fantasia</label><input id="nr13-novo-nomeFantasia"></div>' +
    '      </div>' +
    '      <label>Endereço</label><input id="nr13-novo-endereco">' +
    '      <div class="grid-3">' +
    '        <div><label>Contato</label><input id="nr13-novo-contato"></div>' +
    '        <div><label>E-mail</label><input id="nr13-novo-email"></div>' +
    '        <div><label>Telefone</label><input id="nr13-novo-telefone"></div>' +
    '      </div>' +
    '      <button class="btn-primary" onclick="tplNR13_criarCliente()">Cadastrar Cliente</button>' +
    '    </div>' +
    '    <div id="nr13-cliente-selecionado" class="hidden cliente-card"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-equipamento">' +
    '    <h2>2. Equipamento (vaso de pressão)</h2>' +
    '    <label>Equipamento já cadastrado</label>' +
    '    <div class="form-row">' +
    '      <select id="nr13-equipamento-existente"><option value="">— selecione —</option></select>' +
    '      <button class="btn" onclick="tplNR13_selecionarEquipamentoExistente()">Usar este equipamento</button>' +
    '    </div>' +
    '    <button class="btn btn-sm hidden" id="nr13-btn-novo-equip" onclick="tplNR13_mostrarFormNovoEquip_()">+ Cadastrar equipamento novo</button>' +
    '    <div id="nr13-form-novo-equip">' +
    '    <p class="muted">ou cadastre um novo:</p>' +
    '    <label>Unidade</label>' +
    '    <select id="nr13-unidade"></select>' +
    '    <div class="grid-3">' +
    '      <div><label>Tipo de vaso</label><select id="nr13-eq-tipo-novo">' + NR13_TIPOS_VASO.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div>' +
    '      <div><label>Fabricante</label><input id="nr13-eq-fabricante"></div>' +
    '      <div><label>Modelo</label><input id="nr13-eq-modelo"></div>' +
    '    </div>' +
    '    <div class="grid-3">' +
    '      <div><label>Nº de série</label><input id="nr13-eq-serie"></div>' +
    '      <div><label>TAG</label><input id="nr13-eq-tag"></div>' +
    '      <div><label>Setor</label><input id="nr13-eq-setor"></div>' +
    '    </div>' +
    '    <button class="btn-primary" onclick="tplNR13_criarEquipamento()">Cadastrar equipamento</button>' +
    '    </div>' +
    '    <div id="nr13-equipamento-status"></div>' +
    '    <div id="nr13-equipamento-selecionado" class="hidden equip-card"></div>' +
    '    <div id="nr13-pendencias-alerta"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-vaso">' +
    '    <h2>3. Dados técnicos do vaso</h2>' +
    '    <span id="nr13-eq-tipo-atual" class="hidden"></span>' +
    '    <div class="grid-4"><div><label>Tipo de vaso</label><select id="nr13-eq-tipo">' + NR13_TIPOS_VASO.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div></div>' +
    '    <p class="muted">Informe os valores exatamente como estão na plaqueta de identificação do fabricante — escolha a unidade correspondente, o sistema converte sozinho.</p>' +
    '    <div class="grid-4">' +
    '      <div><label>PMTA — Pressão Máx. de Trabalho Admissível</label><input id="nr13-pmta" placeholder="Ex.: 6" oninput="tplNR13_recalcularCategoria_()"></div>' +
    '      <div><label>Unidade da PMTA</label><select id="nr13-pmta-unidade" onchange="tplNR13_recalcularCategoria_()">' +
    Object.keys(NR13_UNIDADES_PRESSAO).map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') +
    '      </select></div>' +
    '      <div><label>Volume do vaso</label><input id="nr13-volume" placeholder="Ex.: 80" oninput="tplNR13_recalcularCategoria_()"></div>' +
    '      <div><label>Unidade do Volume</label><select id="nr13-volume-unidade" onchange="tplNR13_recalcularCategoria_()">' +
    Object.keys(NR13_UNIDADES_VOLUME).map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') +
    '      </select></div>' +
    '    </div>' +
    '    <div class="grid-3">' +
    '      <div><label>Ano de fabricação</label><input id="nr13-ano-fabricacao"></div>' +
    '      <div><label>Classe do fluido</label><select id="nr13-classe-fluido" onchange="tplNR13_recalcularCategoria_()"><option value="">— selecione —</option>' +
    NR13_CLASSES_FLUIDO_OPTIONS_() +
    '      </select></div>' +
    '      <div><label>Fluido de serviço</label><input id="nr13-fluido-servico" placeholder="Ex.: Vapor d\\'água / Ar comprimido"></div>' +
    '    </div>' +
    '    <label>Código de construção</label><input id="nr13-codigo-construcao" placeholder="Ex.: ASME VIII Div.1" style="max-width:340px;">' +
    '    <div id="nr13-categoria-status"></div>' +
    '    <div id="nr13-conversao-preview"></div>' +
    '    <div id="nr13-categoria-preview" class="categoria-preview hidden"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-inspecao">' +
    '    <h2>4. Dados da inspeção</h2>' +
    '    <div class="grid-3">' +
    '      <div><label>Tipo de inspeção</label><select id="nr13-tipo-inspecao">' + NR13_TIPOS_INSPECAO.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div>' +
    '      <div><label>Data de início (dd/mm/aaaa)</label><input id="nr13-data-inicio"></div>' +
    '      <div><label>Data de término (dd/mm/aaaa)</label><input id="nr13-data-termino" oninput="tplNR13_sugerirProximaInspecao_()"></div>' +
    '    </div>' +
    '    <label>Data prevista da próxima inspeção (dd/mm/aaaa)</label>' +
    '    <input id="nr13-data-proxima-inspecao" placeholder="Sugestão automática: 1 ano após a data de término" style="max-width:260px;">' +
    '    <p class="muted">Preenchida sozinha com 1 ano após a data de término — pode apagar e digitar outra data manualmente a qualquer momento (ex.: se a categoria do vaso permitir um prazo maior, ou se o cliente pedir um prazo menor).</p>' +
    '    <label>Profissional Legalmente Habilitado (PLH) responsável</label><select id="nr13-assinante-ph" style="max-width:340px;"><option value="">— selecione —</option>' +
    NR13_ASSINANTES.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('') +
    '      </select>' +

    '    <h3 style="margin-top:22px;color:var(--text-strong);font-size:13px;">Válvulas de segurança</h3>' +
    '    <p class="muted">Cada vaso pode ter mais de uma válvula, com resultados diferentes — adicione quantas forem inspecionadas.</p>' +
    '    <div id="nr13-valvulas-lista"></div>' +
    '    <button type="button" class="btn btn-sm" onclick="tplNR13_adicionarValvula_()">+ Adicionar válvula de segurança</button>' +

    '    <h3 style="margin-top:22px;color:var(--text-strong);font-size:13px;">Manômetros</h3>' +
    '    <p class="muted">Manômetros utilizados na inspeção (ex.: leitura da pressão de teste).</p>' +
    '    <div id="nr13-manometros-lista"></div>' +
    '    <button type="button" class="btn btn-sm" onclick="tplNR13_adicionarManometro_()">+ Adicionar manômetro</button>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-th">' +
    '    <h2>5. Teste hidrostático (TH)</h2>' +
    '    <div class="checkbox-row"><input type="checkbox" id="nr13-th-realizado" onchange="tplNR13_toggleTH_()"><label for="nr13-th-realizado">Foi realizado teste hidrostático nesta inspeção?</label></div>' +
    '    <div id="nr13-th-campos" class="hidden">' +
    '      <div class="grid-3">' +
    '        <div><label>Unidade de pressão do teste</label><select id="nr13-th-unidade" onchange="tplNR13_recalcularTH_()">' +
    Object.keys(NR13_UNIDADES_PRESSAO).map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') +
    '        </select></div>' +
    '        <div><label>Pressão de teste (sugestão: 1,5 × PMTA)</label><input id="nr13-th-pressao-teste" oninput="tplNR13_recalcularTH_()"></div>' +
    '        <div><label>Tempo de subida até a pressão de teste (min)</label><input id="nr13-th-tempo-subida" oninput="tplNR13_recalcularTH_()"></div>' +
    '      </div>' +
    '      <div class="grid-3">' +
    '        <div><label>Pressão inicial do patamar</label><input id="nr13-th-pressao-inicial" oninput="tplNR13_recalcularTH_()"></div>' +
    '        <div><label>Tempo de ensaio / patamar (min) — ex.: 30</label><input id="nr13-th-tempo-ensaio" oninput="tplNR13_recalcularTH_()"></div>' +
    '        <div><label>Pressão final do patamar</label><input id="nr13-th-pressao-final" oninput="tplNR13_recalcularTH_()"></div>' +
    '      </div>' +
    '      <label>Tempo de descida / despressurização (min)</label><input id="nr13-th-tempo-descida" oninput="tplNR13_recalcularTH_()" style="max-width:260px;">' +
    '      <div id="nr13-th-preview"></div>' +
    '    </div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-fotos">' +
    '    <h2>6. Registro fotográfico</h2>' +
    '    <p class="muted">Anexe as fotos do exame. Diga o que cada foto representa e clique em "Interpretar com IA" — a IA aprofunda tecnicamente em cima do que você descreveu.</p>' +
    '    <input type="file" id="nr13-fotos-input" multiple accept="image/*" onchange="tplNR13_onFotosSelecionadas()">' +
    '    <div id="nr13-fotos-lista" style="margin-top:10px;"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-textos">' +
    '    <h2>7. Descrição das inspeções, resultado e recomendações</h2>' +
    '    <label>Descrição das inspeções, exames e testes executados</label>' +
    '    <textarea id="nr13-descricao-inspecoes" placeholder="Ex.: Realizado exame visual externo e interno, verificação de espessura por ultrassom nos pontos críticos, teste de estanqueidade..."></textarea>' +
    '    <button class="btn btn-sm" onclick="tplNR13_melhorarTexto_(\\'nr13-descricao-inspecoes\\', \\'Descrição das inspeções\\')">Revisar texto (IA)</button>' +
    '    <div id="nr13-status-descricao"></div>' +

    '    <label>Resultado das inspeções e intervenções executadas</label>' +
    '    <textarea id="nr13-resultado-inspecoes"></textarea>' +
    '    <button class="btn btn-sm" onclick="tplNR13_melhorarTexto_(\\'nr13-resultado-inspecoes\\', \\'Resultado das inspeções\\')">Revisar texto (IA)</button>' +
    '    <div id="nr13-status-resultado"></div>' +

    '    <label>Recomendações e providências necessárias</label>' +
    '    <textarea id="nr13-recomendacoes"></textarea>' +
    '    <button class="btn btn-sm" onclick="tplNR13_melhorarTexto_(\\'nr13-recomendacoes\\', \\'Recomendações e providências\\')">Revisar texto (IA)</button>' +
    '    <div id="nr13-status-recomendacoes"></div>' +

    '    <label>Observações adicionais (opcional)</label>' +
    '    <textarea id="nr13-observacoes"></textarea>' +
    '    <button class="btn btn-sm" onclick="tplNR13_melhorarTexto_(\\'nr13-observacoes\\', \\'Observações\\')">Revisar texto (IA)</button>' +
    '    <div id="nr13-status-observacoes"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-veredito">' +
    '    <h2>8. Veredito e parecer conclusivo</h2>' +
    '    <div class="radio-veredito" id="nr13-radio-aprovado" onclick="tplNR13_selecionarVeredito_(\\'APROVADO\\')"><input type="radio" name="nr13-veredito" value="APROVADO"><strong>Aprovado</strong></div>' +
    '    <div class="radio-veredito" id="nr13-radio-ressalvas" onclick="tplNR13_selecionarVeredito_(\\'APROVADO_COM_RESSALVAS\\')"><input type="radio" name="nr13-veredito" value="APROVADO_COM_RESSALVAS"><strong>Aprovado com Ressalvas</strong> <span class="muted">— integridade mantida, condicionada às recomendações; recomenda-se reinspeção</span></div>' +
    '    <div class="radio-veredito" id="nr13-radio-reprovado" onclick="tplNR13_selecionarVeredito_(\\'REPROVADO\\')"><input type="radio" name="nr13-veredito" value="REPROVADO"><strong>Reprovado</strong> <span class="muted">— vaso não deve permanecer em operação</span></div>' +
    '    <label>Parecer conclusivo quanto à integridade do vaso até a próxima inspeção</label>' +
    '    <textarea id="nr13-parecer-conclusivo" style="min-height:110px;"></textarea>' +
    '    <button class="btn btn-sm" onclick="tplNR13_sugerirParecer_()">Sugerir parecer com IA</button>' +
    '    <div id="nr13-status-parecer"></div>' +
    '  </div>' +

    '  <div class="panel hidden" id="nr13-panel-gerar">' +
    '    <h2>9. Salvar / Emitir</h2>' +
    '    <button class="btn" onclick="tplNR13_salvarRascunho()">Salvar rascunho</button>' +
    '    <button class="btn-primary" onclick="tplNR13_emitirLaudo()">Emitir laudo final</button>' +
    '    <div id="nr13-status-gerar"></div>' +
    '    <div id="nr13-contorno-emitido" class="hidden"><p class="muted" style="margin-top:14px;">Esta tela ainda aponta para um laudo já emitido, que não pode mais ser alterado. Para salvar os dados atuais como um laudo novo (os campos preenchidos continuam na tela), clique abaixo.</p>' +
    '    <button class="btn btn-warning btn-sm" onclick="tplNR13_novoLaudo_()">Começar novo laudo com estes dados</button></div>' +
    '  </div>' +

    '  <details class="panel sgo-detalhes-tecnicos">' +
    '    <summary>Detalhes técnicos da operação</summary>' +
    '    <div class="terminal-wrap">' +
    '      <div id="tplNR13_terminalLog" class="terminal"></div>' +
    '    </div>' +
    '    <button class="btn btn-sm" style="margin-top:8px;" onclick="tplNR13_limparLog()">Limpar histórico</button>' +
    '  </details>' +
    '</div>' +
    '</div>' +
    '<div id="tplNR13_viewManual" style="display:none">' + tplNR13_manualHtml_() + '</div>';

  tplNR13_selecionarVeredito_('');
  
  
}

function tplNR13_abrirManual_() {
  var viewModulo = document.getElementById('tplNR13_viewModulo');
  var viewManual = document.getElementById('tplNR13_viewManual');
  if (viewModulo) viewModulo.style.display = 'none';
  if (viewManual) viewManual.style.display = '';
}

function tplNR13_voltarDoManual_() {
  var viewModulo = document.getElementById('tplNR13_viewModulo');
  var viewManual = document.getElementById('tplNR13_viewManual');
  if (viewManual) viewManual.style.display = 'none';
  if (viewModulo) viewModulo.style.display = '';
}

function tplNR13_irParaSecao_(id) {
  var el = document.getElementById(id);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function NR13_CLASSES_FLUIDO_OPTIONS_() {
  var classes = [
    { valor: 'A', label: 'A — Inflamáveis, combustíveis ≥200°C, tóxicos ≤20ppm, hidrogênio, acetileno' },
    { valor: 'B', label: 'B — Combustíveis <200°C, tóxicos >20ppm' },
    { valor: 'C', label: 'C — Vapor d\\'água, gases asfixiantes simples, ar comprimido' },
    { valor: 'D', label: 'D — Outros fluidos' }
  ];
  return classes.map(function(c) { return '<option value="' + c.valor + '">' + c.label + '</option>'; }).join('');
}

// ---------------- Cliente ----------------
function tplNR13_buscarCliente() {
  var cnpjInput = document.getElementById('nr13-cnpj').value;
  var cnpjDigitos = String(cnpjInput || '').replace(/\\D/g, '');
  if (cnpjDigitos.length !== 14) { tplNR13_msg('nr13-cliente-status', 'error', 'Informe um CNPJ válido (14 dígitos).'); return; }

  tplNR13_msg('nr13-cliente-status', 'info', 'Buscando...');
  tplNR13_writeLog('Buscando cliente pelo CNPJ ' + cnpjDigitos + '...', 'SUCESSO');
  tplNR13_chamarApi('apiPesquisarClientes', { termo: cnpjDigitos }).then(function(res) {
    var achado = (res.items || []).filter(function(c) { return String(c.CNPJ || '').replace(/\\D/g, '') === cnpjDigitos; })[0];
    if (achado) {
      tplNR13_writeLog('Cliente encontrado no cadastro: ' + (achado.RAZAO_SOCIAL || '-'), 'SUCESSO');
      tplNR13_selecionarCliente({ ID: achado.ID, RAZAO_SOCIAL: achado.RAZAO_SOCIAL, CNPJ: achado.CNPJ, ENDERECO: achado.ENDERECO });
      document.getElementById('nr13-cliente-status').innerHTML = '';
      return;
    }
    document.getElementById('nr13-cliente-status').innerHTML = '';
    document.getElementById('nr13-cliente-novo').classList.remove('hidden');
    document.getElementById('nr13-novo-razaoSocial').value = '';
    tplNR13_writeLog('Cliente não cadastrado ainda — consultando dados públicos do CNPJ...', 'AVISO');
    tplNR13_chamarApi('apiConsultarCnpjPublico', { cnpj: cnpjDigitos }).then(function(dados) {
      document.getElementById('nr13-novo-razaoSocial').value = dados.razaoSocial || '';
      document.getElementById('nr13-novo-nomeFantasia').value = dados.nomeFantasia || '';
      document.getElementById('nr13-novo-endereco').value = dados.endereco || '';
      document.getElementById('nr13-novo-telefone').value = dados.telefone || '';
      document.getElementById('nr13-novo-email').value = dados.email || '';
      tplNR13_writeLog('Dados públicos preenchidos automaticamente — confira e cadastre.', 'SUCESSO');
    }).catch(function() { tplNR13_writeLog('Não foi possível consultar dados públicos do CNPJ — preencha manualmente.', 'AVISO'); });
  }).catch(function(err) { tplNR13_erro('nr13-cliente-status', err); });
}

function tplNR13_criarCliente() {
  var cnpjDigitos = String(document.getElementById('nr13-cnpj').value || '').replace(/\\D/g, '');
  var payload = {
    cnpj: cnpjDigitos,
    razaoSocial: document.getElementById('nr13-novo-razaoSocial').value,
    nomeFantasia: document.getElementById('nr13-novo-nomeFantasia').value,
    endereco: document.getElementById('nr13-novo-endereco').value,
    contato: document.getElementById('nr13-novo-contato').value,
    email: document.getElementById('nr13-novo-email').value,
    telefone: document.getElementById('nr13-novo-telefone').value
  };
  if (!payload.razaoSocial) { tplNR13_msg('nr13-cliente-status', 'error', 'Informe a razão social.'); return; }

  tplNR13_writeLog('Cadastrando novo cliente: ' + payload.razaoSocial + '...', 'SUCESSO');
  tplNR13_chamarApi('apiCriarClienteComUnidade', payload).then(function(res) {
    document.getElementById('nr13-cliente-novo').classList.add('hidden');
    nr13State.unidadeSelecionadaId = res.unidade.ID;
    tplNR13_writeLog('Cliente cadastrado com sucesso: ' + payload.razaoSocial, 'SUCESSO');
    tplNR13_selecionarCliente(res.cliente);
  }).catch(function(err) { tplNR13_erro('nr13-cliente-status', err); });
}

function tplNR13_selecionarCliente(cliente) {
  nr13State.cliente = cliente;
  var el = document.getElementById('nr13-cliente-selecionado');
  el.classList.remove('hidden');
  el.innerHTML = '<strong>' + (cliente.RAZAO_SOCIAL || '') + '</strong><br>CNPJ: ' + (cliente.CNPJ || '') + '<br>' + (cliente.ENDERECO || '');
  document.getElementById('nr13-panel-equipamento').classList.remove('hidden');
  tplNR13_carregarUnidades();
  tplNR13_carregarEquipamentos();
}

// ---------------- Equipamento ----------------
function tplNR13_carregarUnidades() {
  tplNR13_chamarApi('apiListarUnidadesCliente', { clienteId: nr13State.cliente.ID }).then(function(res) {
    var sel = document.getElementById('nr13-unidade');
    sel.innerHTML = (res.items || []).map(function(u) { return '<option value="' + u.ID + '">' + u.NOME_UNIDADE + '</option>'; }).join('');
    if (nr13State.unidadeSelecionadaId) sel.value = nr13State.unidadeSelecionadaId;
  }).catch(function(err) { console.error(err); });
}

function tplNR13_carregarEquipamentos() {
  tplNR13_chamarApi('apiListarEquipamentosCliente', { clienteId: nr13State.cliente.ID }).then(function(res) {
    nr13State.equipamentos = res.items || [];
    var sel = document.getElementById('nr13-equipamento-existente');
    sel.innerHTML = '<option value="">— selecione —</option>' + nr13State.equipamentos.map(function(e) {
      return '<option value="' + e.ID + '">' + (e.TIPO || '') + ' — TAG ' + (e.TAG || '') + '</option>';
    }).join('');
  }).catch(function(err) { console.error(err); });
}

function tplNR13_selecionarEquipamentoExistente() {
  var id = document.getElementById('nr13-equipamento-existente').value;
  var eq = nr13State.equipamentos.filter(function(e) { return e.ID === id; })[0];
  if (!eq) { tplNR13_msg('nr13-equipamento-status', 'error', 'Selecione um equipamento da lista.'); return; }
  tplNR13_writeLog('Equipamento selecionado: ' + (eq.TIPO || '') + ' — TAG ' + (eq.TAG || ''), 'SUCESSO');
  tplNR13_confirmarEquipamento_(eq);
}

function tplNR13_criarEquipamento() {
  var payload = {
    clienteId: nr13State.cliente.ID,
    unidadeId: document.getElementById('nr13-unidade').value,
    tipo: document.getElementById('nr13-eq-tipo-novo').value,
    fabricante: document.getElementById('nr13-eq-fabricante').value,
    modelo: document.getElementById('nr13-eq-modelo').value,
    serie: document.getElementById('nr13-eq-serie').value,
    tag: document.getElementById('nr13-eq-tag').value,
    setor: document.getElementById('nr13-eq-setor').value
  };
  if (!payload.tipo || !payload.tag) { tplNR13_msg('nr13-equipamento-status', 'error', 'Informe ao menos o Tipo de vaso e a TAG.'); return; }

  tplNR13_writeLog('Cadastrando novo equipamento: ' + payload.tipo + ' — TAG ' + payload.tag + '...', 'SUCESSO');
  tplNR13_chamarApi('apiCriarEquipamento', payload).then(function(res) {
    document.getElementById('nr13-equipamento-status').innerHTML = '';
    tplNR13_writeLog('Equipamento cadastrado com sucesso.', 'SUCESSO');
    tplNR13_confirmarEquipamento_(res.equipamento);
    tplNR13_carregarEquipamentos();
  }).catch(function(err) { tplNR13_erro('nr13-equipamento-status', err); });
}

function tplNR13_mostrarFormNovoEquip_() {
  var f = document.getElementById('nr13-form-novo-equip');
  if (f) f.classList.remove('hidden');
  var b = document.getElementById('nr13-btn-novo-equip');
  if (b) b.classList.add('hidden');
}

function tplNR13_confirmarEquipamento_(eq) {
  nr13State.equipamentoSelecionado = eq;
  // Equipamento escolhido: o formulário de cadastro fecha (fica atrás do botão
  // "+ Cadastrar equipamento novo") e os campos dele são limpos, para não
  // misturar dados digitados ali com os do equipamento escolhido.
  ['nr13-eq-fabricante', 'nr13-eq-modelo', 'nr13-eq-serie', 'nr13-eq-tag', 'nr13-eq-setor'].forEach(function(idCampo) {
    var c = document.getElementById(idCampo);
    if (c) c.value = '';
  });
  var formNovo = document.getElementById('nr13-form-novo-equip');
  if (formNovo) formNovo.classList.add('hidden');
  var btnNovo = document.getElementById('nr13-btn-novo-equip');
  if (btnNovo) btnNovo.classList.remove('hidden');
  var el = document.getElementById('nr13-equipamento-selecionado');
  el.classList.remove('hidden');
  el.innerHTML = '<strong>' + (eq.TIPO || '') + '</strong> — TAG ' + (eq.TAG || '') + '<br>' + (eq.FABRICANTE || '') + ' / ' + (eq.MODELO || '');

  document.getElementById('nr13-eq-tipo-atual').textContent = eq.TIPO || '';
  var elTipo = document.getElementById('nr13-eq-tipo');
  if (elTipo) {
    // O cadastro grava o tipo em maiúsculas ("AUTOCLAVE") e a lista usa
    // "Autoclave": atribuir direto deixava o campo vazio e a emissão parava em
    // "Informe o tipo de vaso". Casa sem diferenciar maiúsculas; se o tipo do
    // cadastro não estiver na lista, acrescenta-o como opção.
    var tipoEq = String(eq.TIPO || '').trim();
    if (tipoEq) {
      var opcaoTipo = Array.prototype.filter.call(elTipo.options, function(o) { return o.value.toUpperCase() === tipoEq.toUpperCase(); })[0];
      if (!opcaoTipo) {
        opcaoTipo = document.createElement('option');
        opcaoTipo.value = tipoEq.charAt(0) + tipoEq.slice(1).toLowerCase();
        opcaoTipo.textContent = opcaoTipo.value;
        elTipo.appendChild(opcaoTipo);
      }
      elTipo.value = opcaoTipo.value;
    }
  }
  var elFab = document.getElementById('nr13-eq-fabricante-atual');

  ['nr13-panel-vaso', 'nr13-panel-inspecao', 'nr13-panel-th', 'nr13-panel-fotos', 'nr13-panel-textos', 'nr13-panel-veredito', 'nr13-panel-gerar'].forEach(function(id) {
    var p = document.getElementById(id);
    if (p) p.classList.remove('hidden');
  });

  tplNR13_renderValvulas_();
  tplNR13_renderManometros_();
  tplNR13_carregarPendencias_(eq.ID);
}

function tplNR13_carregarPendencias_(equipamentoId) {
  tplNR13_chamarApi('apiListarPendenciasAbertas', { equipamentoId: equipamentoId }).then(function(res) {
    var alertaEl = document.getElementById('nr13-pendencias-alerta');
    var itens = res.items || [];
    if (!itens.length) { alertaEl.innerHTML = ''; return; }
    var l = itens[0];
    alertaEl.innerHTML = '<div class="alert-box warning">Este equipamento tem o Laudo NR13 nº ' + l.NUMERO_LAUDO +
      ' com veredito "Aprovado com Ressalvas" ainda em aberto. <button class="btn btn-sm" style="margin-left:8px;" onclick="tplNR13_iniciarReinspecao_(\\'' + l.ID + '\\')">Registrar Reinspeção</button></div>';
    tplNR13_writeLog('Atenção: laudo nº ' + l.NUMERO_LAUDO + ' com pendência aberta (Aprovado com Ressalvas) pra este equipamento.', 'AVISO');
  }).catch(function(err) { console.error(err); });
}

function tplNR13_iniciarReinspecao_(laudoOrigemId) {
  // A reinspeção SEMPRE cria um laudo novo (nunca edita o antigo, que já
  // pode estar emitido) — sem isso, se a tela ainda tivesse um laudoId
  // de um laudo já emitido "grudado" no estado, salvar/emitir a
  // reinspeção falhava com "Este laudo já foi emitido e não pode mais
  // ser editado" (achado real 2026-08-24).
  nr13State.laudoId = null;
  nr13State.registroOrigemId = laudoOrigemId;
  document.getElementById('nr13-tipo-inspecao').value = 'Extraordinária';
  document.getElementById('nr13-pendencias-alerta').innerHTML = '<div class="alert-box info">Reinspeção vinculada ao Laudo NR13 anterior — preencha os dados da nova inspeção e emita normalmente.</div>';
  tplNR13_writeLog('Reinspeção iniciada — vinculada ao laudo anterior nº referência ' + laudoOrigemId + '.', 'SUCESSO');
  tplNR13_irParaSecao_('nr13-panel-vaso');
}

// ---------------- Categorização (preview em tempo real) ----------------
function tplNR13_numeroBr_(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? valor : 0;
  // pt-BR: "1.000,5" = 1000,5 e "1.000" = 1000 (antes virava 1, e um vaso de
  // 1.000 L entrava como 1 L). Vírgula é sempre a casa decimal.
  var s = String(valor || '').trim().split(' ').join('');
  if (s.indexOf(',') !== -1) s = s.split('.').join('').replace(',', '.');
  else if (/^[0-9]{1,3}([.][0-9]{3})+$/.test(s)) s = s.split('.').join('');
  var n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

/** Padrão único de exibição de número em todo o módulo: 2 casas decimais, vírgula (nunca ponto) — mesmo padrão de NR13Doc_num_ no documento final, pra tela e PDF nunca divergirem. */
function tplNR13_fmt_(valor, casas) {
  var n = Number(valor);
  if (!isFinite(n)) return '—';
  return n.toFixed(casas === undefined ? 2 : casas).replace('.', ',');
}

/** Igual a tplNR13_fmt_, mas com até maxCasas (padrão 4) quando o valor tem mais precisão (mesmo critério de NR13Doc_numVar_ no laudo): P.V pequeno não vira 0,00. */
function tplNR13_fmtVar_(valor, maxCasas) {
  var n = Number(valor);
  if (!isFinite(n)) return '—';
  var max = maxCasas === undefined ? 4 : maxCasas;
  var casas = 2;
  while (casas < max && Math.abs(Number(n.toFixed(casas)) - n) > Math.abs(n) * 1e-9) casas++;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Soma N anos a uma data dd/mm/aaaa — só matemática de data, sem chamada ao servidor. */
function tplNR13_somarAnosData_(dataBr, anos) {
  var m = /^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/.exec(String(dataBr || '').trim());
  if (!m) return '';
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  d.setFullYear(d.getFullYear() + anos);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

/**
 * Sugestão automática (1 ano após a data de término da inspeção) —
 * NUNCA sobrescreve se o usuário já digitou/editou a data manualmente
 * (mesmo princípio não-destrutivo da sugestão de pressão de teste do TH).
 */
function tplNR13_sugerirProximaInspecao_() {
  var proximaEl = document.getElementById('nr13-data-proxima-inspecao');
  if (!proximaEl || proximaEl.value) return;
  var dataTermino = document.getElementById('nr13-data-termino').value;
  var sugestao = tplNR13_somarAnosData_(dataTermino, 1);
  if (sugestao) proximaEl.value = sugestao;
}

function tplNR13_recalcularCategoria_() {
  var pmtaValor = tplNR13_numeroBr_(document.getElementById('nr13-pmta').value);
  var pmtaUnidade = document.getElementById('nr13-pmta-unidade').value;
  var volumeValor = tplNR13_numeroBr_(document.getElementById('nr13-volume').value);
  var volumeUnidade = document.getElementById('nr13-volume-unidade').value;
  var classe = document.getElementById('nr13-classe-fluido').value;
  var previewEl = document.getElementById('nr13-categoria-preview');
  var conversaoEl = document.getElementById('nr13-conversao-preview');
  var statusEl = document.getElementById('nr13-categoria-status');

  if (!pmtaValor || !volumeValor || !classe) {
    previewEl.classList.add('hidden');
    conversaoEl.innerHTML = '';
    statusEl.innerHTML = '';
    return;
  }

  tplNR13_chamarApi('apiCalcularCategoria', {
    pmtaValor: pmtaValor, pmtaUnidade: pmtaUnidade, volumeValor: volumeValor, volumeUnidade: volumeUnidade, classeFluido: classe
  }).then(function(res) {
    nr13State.categoriaCalculada = res.resultado;
    var r = res.resultado;
    statusEl.innerHTML = '';

    conversaoEl.innerHTML =
      '<div class="alert-box info">' +
      'PMTA: ' + tplNR13_fmtVar_(pmtaValor) + ' ' + pmtaUnidade + (pmtaUnidade !== 'MPa' ? (' = <strong>' + tplNR13_fmtVar_(r.pmtaMpaConvertido) + ' MPa</strong>') : '') + '<br>' +
      'Volume: ' + tplNR13_fmtVar_(volumeValor) + ' ' + volumeUnidade + (volumeUnidade !== 'm³' ? (' = <strong>' + tplNR13_fmtVar_(r.volumeM3Convertido) + ' m³</strong>') : '') + '<br>' +
      'P.V = ' + tplNR13_fmtVar_(r.pmtaMpaConvertido) + ' × ' + tplNR13_fmtVar_(r.volumeM3Convertido) + ' = <strong>' + tplNR13_fmtVar_(r.pv, 6) + ' MPa·m³</strong>' +
      (r.foraDoCampoAplicacao ? '<br><strong>Atenção:</strong> com a PMTA em kPa, P.V = ' + tplNR13_fmtVar_(r.pvKpa) + ' kPa·m³ (não superior a 8) e o fluido não é da classe A. Pelo item 13.2.1 da NR-13 este vaso não se enquadra obrigatoriamente na norma. Pode emitir o laudo; ele sairá com essa observação.' : '') +
      '</div>';

    previewEl.classList.remove('hidden');
    previewEl.innerHTML =
      '<div class="categoria-box"><div class="valor">' + r.categoria + '</div><div class="rotulo-mini">Categoria</div></div>' +
      '<div class="categoria-box"><div class="valor">' + r.grupo + '</div><div class="rotulo-mini">Grupo de Risco</div></div>' +
      '<div class="categoria-box"><div class="valor">' + tplNR13_fmtVar_(r.pv, 6) + '</div><div class="rotulo-mini">P.V (MPa·m³)</div></div>' +
      '<div class="categoria-box"><div class="valor">' + r.periodicidade.externo + ' / ' + r.periodicidade.interno + '</div><div class="rotulo-mini">Prazo (anos) Ext. / Int.</div></div>';

    // Sugestão de pressão de teste hidrostático (1,5x a PMTA, na mesma
    // unidade escolhida pro PMTA) — só preenche se o campo ainda estiver vazio.
    var thPressaoEl = document.getElementById('nr13-th-pressao-teste');
    var thUnidadeEl = document.getElementById('nr13-th-unidade');
    if (thPressaoEl && thUnidadeEl && !thPressaoEl.value) {
      thUnidadeEl.value = pmtaUnidade;
      thPressaoEl.value = tplNR13_fmt_(pmtaValor * 1.5);
      tplNR13_recalcularTH_();
    }
  }).catch(function(err) { previewEl.classList.add('hidden'); conversaoEl.innerHTML = ''; tplNR13_erro('nr13-categoria-status', err); });
}

// ---------------- Teste Hidrostático (TH) ----------------
function tplNR13_toggleTH_() {
  var checked = document.getElementById('nr13-th-realizado').checked;
  document.getElementById('nr13-th-campos').classList.toggle('hidden', !checked);
}

function tplNR13_recalcularTH_() {
  var payload = {
    pressaoTeste: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-teste').value),
    tempoSubidaMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-subida').value),
    pressaoInicial: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-inicial').value),
    tempoEnsaioMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-ensaio').value),
    pressaoFinal: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-final').value),
    tempoDescidaMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-descida').value)
  };
  var previewEl = document.getElementById('nr13-th-preview');
  if (!payload.pressaoInicial || !payload.pressaoFinal) { previewEl.innerHTML = ''; return; }

  var unidade = document.getElementById('nr13-th-unidade').value;
  tplNR13_chamarApi('apiCalcularTH', payload).then(function(res) {
    var r = res.resultado;
    previewEl.innerHTML =
      '<div class="alert-box info">' +
      'Rampa de subida: <strong>' + tplNR13_fmt_(r.rampaSubida) + ' ' + unidade + '/min</strong> &nbsp;|&nbsp; ' +
      'Rampa de descida: <strong>' + tplNR13_fmt_(r.rampaDescida) + ' ' + unidade + '/min</strong> &nbsp;|&nbsp; ' +
      'Perda no patamar: <strong>' + tplNR13_fmt_(r.perda) + ' ' + unidade + ' (' + tplNR13_fmt_(r.perdaPercentual) + '%)</strong>' +
      '</div>';
  }).catch(function() { previewEl.innerHTML = ''; });
}

// ---------------- Válvulas de segurança (lista dinâmica) ----------------
function tplNR13_adicionarValvula_() {
  nr13State.valvulas.push({ identificacao: '', certificado: '', pressaoAbertura: '', resultado: 'Aprovado' });
  tplNR13_renderValvulas_();
}

function tplNR13_removerValvula_(idx) {
  nr13State.valvulas.splice(idx, 1);
  tplNR13_renderValvulas_();
}

function tplNR13_atualizarValvula_(idx, campo, valor) {
  nr13State.valvulas[idx][campo] = valor;
}

function tplNR13_renderValvulas_() {
  var el = document.getElementById('nr13-valvulas-lista');
  if (!nr13State.valvulas.length) { el.innerHTML = '<span class="muted">Nenhuma válvula adicionada ainda.</span>'; return; }
  el.innerHTML = nr13State.valvulas.map(function(v, idx) {
    return '<div class="form-row" style="align-items:center;background:var(--bc-surface-2);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;">' +
      '<div><label>Identificação/TAG</label><input value="' + (v.identificacao || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarValvula_(' + idx + ',\\'identificacao\\',this.value)"></div>' +
      '<div><label>Nº certificado</label><input value="' + (v.certificado || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarValvula_(' + idx + ',\\'certificado\\',this.value)"></div>' +
      '<div><label>Pressão de abertura ajustada</label><input value="' + (v.pressaoAbertura || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarValvula_(' + idx + ',\\'pressaoAbertura\\',this.value)"></div>' +
      '<div><label>Resultado</label><select onchange="tplNR13_atualizarValvula_(' + idx + ',\\'resultado\\',this.value)">' +
      NR13_RESULTADOS_ITEM.map(function(r) { return '<option value="' + r + '"' + (r === v.resultado ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn btn-sm btn-danger" onclick="tplNR13_removerValvula_(' + idx + ')">Remover</button>' +
      '</div>';
  }).join('');
}

// ---------------- Manômetros (lista dinâmica) ----------------
function tplNR13_adicionarManometro_() {
  nr13State.manometros.push({ identificacao: '', faixaIndicacao: '', certificado: '', resultado: 'Aprovado' });
  tplNR13_renderManometros_();
}

function tplNR13_removerManometro_(idx) {
  nr13State.manometros.splice(idx, 1);
  tplNR13_renderManometros_();
}

function tplNR13_atualizarManometro_(idx, campo, valor) {
  nr13State.manometros[idx][campo] = valor;
}

function tplNR13_renderManometros_() {
  var el = document.getElementById('nr13-manometros-lista');
  if (!nr13State.manometros.length) { el.innerHTML = '<span class="muted">Nenhum manômetro adicionado ainda.</span>'; return; }
  el.innerHTML = nr13State.manometros.map(function(m, idx) {
    return '<div class="form-row" style="align-items:center;background:var(--bc-surface-2);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;">' +
      '<div><label>Identificação/TAG</label><input value="' + (m.identificacao || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarManometro_(' + idx + ',\\'identificacao\\',this.value)"></div>' +
      '<div><label>Faixa de indicação</label><input value="' + (m.faixaIndicacao || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarManometro_(' + idx + ',\\'faixaIndicacao\\',this.value)"></div>' +
      '<div><label>Nº certificado de aferição</label><input value="' + (m.certificado || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarManometro_(' + idx + ',\\'certificado\\',this.value)"></div>' +
      '<div><label>Resultado</label><select onchange="tplNR13_atualizarManometro_(' + idx + ',\\'resultado\\',this.value)">' +
      NR13_RESULTADOS_ITEM.map(function(r) { return '<option value="' + r + '"' + (r === m.resultado ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn btn-sm btn-danger" onclick="tplNR13_removerManometro_(' + idx + ')">Remover</button>' +
      '</div>';
  }).join('');
}

// ---------------- Fotos ----------------
function tplNR13_onFotosSelecionadas() {
  var input = document.getElementById('nr13-fotos-input');
  var files = Array.from(input.files || []);
  tplNR13_writeLog('Enviando ' + files.length + ' foto(s)...', 'SUCESSO');
  var promessas = files.map(function(file) {
    return tplNR13_lerArquivoComoBase64_(file).then(function(lido) {
      var item = { base64: lido.base64, mimeType: lido.mimeType, legendaUsuario: '', interpretacaoIA: '', fileId: '', link: '', enviando: true };
      nr13State.fotos.push(item);
      tplNR13_renderFotosLista_();
      var idx = nr13State.fotos.length - 1;
      return tplNR13_chamarApi('apiUploadFoto', {
        base64: lido.base64, mimeType: lido.mimeType, nomeArquivo: file.name,
        nomeCliente: nr13State.cliente ? nr13State.cliente.RAZAO_SOCIAL : ''
      }).then(function(res) {
        nr13State.fotos[idx].fileId = res.fileId;
        nr13State.fotos[idx].link = res.link;
        nr13State.fotos[idx].enviando = false;
        tplNR13_writeLog('Foto "' + file.name + '" enviada com sucesso.', 'SUCESSO');
        tplNR13_renderFotosLista_();
      }).catch(function(err) {
        nr13State.fotos[idx].enviando = false;
        nr13State.fotos[idx].erroUpload = (err && err.message) ? err.message : String(err);
        tplNR13_writeLog('Falha ao enviar a foto "' + file.name + '": ' + nr13State.fotos[idx].erroUpload, 'ERRO');
        tplNR13_renderFotosLista_();
      });
    });
  });
  Promise.all(promessas).then(function() { input.value = ''; });
}

function tplNR13_renderFotosLista_() {
  var el = document.getElementById('nr13-fotos-lista');
  if (!nr13State.fotos.length) { el.innerHTML = '<span class="muted">Nenhuma foto anexada ainda.</span>'; return; }

  el.innerHTML = nr13State.fotos.map(function(f, idx) {
    var statusUpload = f.enviando ? '<span class="muted">Enviando...</span>' : (f.erroUpload ? '<span style="color:var(--danger);">Falha no upload: ' + f.erroUpload + '</span>' : '');
    // Foto restaurada de um rascunho salvo não tem base64 local (nunca é
    // guardado na planilha) — usa o link direto do Drive como imagem.
    var srcImg = f.base64 ? ('data:' + f.mimeType + ';base64,' + f.base64) : ((f.link && f.link.indexOf('drive.google.com') === -1) ? f.link : ('/arquivos/' + encodeURIComponent(f.fileId || '')));
    return '<div class="foto-card">' +
      '<img src="' + srcImg + '" alt="Foto">' +
      '<div class="foto-campos">' +
      '<label>O que esta foto representa?</label>' +
      '<input value="' + (f.legendaUsuario || '').replace(/"/g, '&quot;') + '" oninput="tplNR13_atualizarLegendaFoto_(' + idx + ', this.value)" placeholder="Ex.: Corrosão externa próxima ao dreno inferior">' +
      (f.base64
        ? '<button class="btn btn-sm" style="margin-top:8px;" onclick="tplNR13_interpretarFotoIA_(' + idx + ')">Interpretar com IA</button>'
        : '<span class="muted" style="display:block;margin-top:8px;">Foto restaurada do rascunho — remova e reanexe se precisar interpretar de novo com IA.</span>') +
      '<button class="btn btn-sm btn-danger" style="margin-top:8px;" onclick="tplNR13_removerFoto_(' + idx + ')">Remover</button>' +
      '<div>' + statusUpload + '</div>' +
      '<div id="nr13-foto-status-' + idx + '"></div>' +
      (f.interpretacaoIA ? '<div class="interpretacao-ia-preview"><strong>Interpretação técnica:</strong> ' + f.interpretacaoIA + '</div>' : '') +
      '</div>' +
      '</div>';
  }).join('');
}

function tplNR13_atualizarLegendaFoto_(idx, valor) {
  nr13State.fotos[idx].legendaUsuario = valor;
}

function tplNR13_interpretarFotoIA_(idx) {
  var foto = nr13State.fotos[idx];
  if (!foto) return;
  tplNR13_msg('nr13-foto-status-' + idx, 'info', 'Analisando com IA...');
  tplNR13_writeLog('Analisando foto ' + (idx + 1) + ' com IA...', 'SUCESSO');
  tplNR13_chamarApi('apiAnalisarFoto', {
    base64: foto.base64, mimeType: foto.mimeType, legendaUsuario: foto.legendaUsuario, contextoVaso: tplNR13_contextoVaso_()
  }).then(function(res) {
    nr13State.fotos[idx].interpretacaoIA = res.interpretacao;
    document.getElementById('nr13-foto-status-' + idx).innerHTML = '';
    tplNR13_writeLog('Interpretação da foto ' + (idx + 1) + ' concluída.', 'SUCESSO');
    tplNR13_renderFotosLista_();
  }).catch(function(err) { tplNR13_erro('nr13-foto-status-' + idx, err); });
}

function tplNR13_removerFoto_(idx) {
  nr13State.fotos.splice(idx, 1);
  tplNR13_renderFotosLista_();
}

// ---------------- Melhoria de texto por IA ----------------
function tplNR13_melhorarTexto_(campoId, rotulo) {
  var el = document.getElementById(campoId);
  var texto = el.value;
  if (!texto || !texto.trim()) { return; }
  var statusId = 'nr13-status-' + campoId.replace('nr13-', '');
  tplNR13_msg(statusId, 'info', 'Melhorando com IA...');
  tplNR13_writeLog('Melhorando texto de "' + rotulo + '" com IA...', 'SUCESSO');
  tplNR13_chamarApi('apiMelhorarTexto', { rotulo: rotulo, texto: texto, contextoVaso: tplNR13_contextoVaso_() }).then(function(res) {
    el.value = res.texto;
    document.getElementById(statusId).innerHTML = '';
    tplNR13_writeLog('Texto de "' + rotulo + '" melhorado.', 'SUCESSO');
  }).catch(function(err) { tplNR13_erro(statusId, err); });
}

// ---------------- Veredito / Parecer ----------------
function tplNR13_selecionarVeredito_(valor) {
  // Fase 2 (16/10): o laudo começa sem veredito; o PH escolhe (antes vinha "Aprovado" marcado).
  ['aprovado', 'ressalvas', 'reprovado'].forEach(function(k) {
    var r = document.getElementById('nr13-radio-' + k);
    if (r) r.classList.remove('selecionado-' + k);
  });
  var mapa = { APROVADO: 'aprovado', APROVADO_COM_RESSALVAS: 'ressalvas', REPROVADO: 'reprovado' };
  if (!mapa[valor]) {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="nr13-veredito"]'), function(i) { i.checked = false; });
    return;
  }
  document.querySelector('input[name="nr13-veredito"][value="' + valor + '"]').checked = true;
  document.getElementById('nr13-radio-' + mapa[valor]).classList.add('selecionado-' + mapa[valor]);
}

function tplNR13_vereditoSelecionado_() {
  var el = document.querySelector('input[name="nr13-veredito"]:checked');
  return el ? el.value : '';
}

function tplNR13_sugerirParecer_() {
  var payload = {
    veredito: tplNR13_vereditoSelecionado_(),
    contextoVaso: tplNR13_contextoVaso_(),
    categoria: nr13State.categoriaCalculada ? nr13State.categoriaCalculada.categoria : '',
    descricaoInspecoes: document.getElementById('nr13-descricao-inspecoes').value,
    resultadoInspecoes: document.getElementById('nr13-resultado-inspecoes').value,
    recomendacoes: document.getElementById('nr13-recomendacoes').value,
    observacoes: document.getElementById('nr13-observacoes').value
  };
  tplNR13_msg('nr13-status-parecer', 'info', 'Redigindo sugestão com IA...');
  tplNR13_writeLog('Redigindo sugestão de parecer conclusivo com IA (veredito: ' + payload.veredito + ')...', 'SUCESSO');
  tplNR13_chamarApi('apiGerarParecerConclusivo', payload).then(function(res) {
    document.getElementById('nr13-parecer-conclusivo').value = res.texto;
    document.getElementById('nr13-status-parecer').innerHTML = '';
    tplNR13_writeLog('Sugestão de parecer conclusivo pronta — revise antes de emitir.', 'SUCESSO');
  }).catch(function(err) { tplNR13_erro('nr13-status-parecer', err); });
}

// ---------------- Coleta do payload / Salvar / Emitir ----------------
function tplNR13_montarPayload_() {
  return {
    laudoId: nr13State.laudoId,
    registroOrigemId: nr13State.registroOrigemId,
    clienteId: nr13State.cliente ? nr13State.cliente.ID : '',
    unidadeId: (nr13State.equipamentoSelecionado && nr13State.equipamentoSelecionado.UNIDADE_ID) || (document.getElementById('nr13-unidade') ? document.getElementById('nr13-unidade').value : ''),
    equipamentoId: nr13State.equipamentoSelecionado ? nr13State.equipamentoSelecionado.ID : '',
    tipoVaso: document.getElementById('nr13-eq-tipo').value,
    fabricante: document.getElementById('nr13-eq-fabricante').value || (nr13State.equipamentoSelecionado ? nr13State.equipamentoSelecionado.FABRICANTE : ''),
    modelo: document.getElementById('nr13-eq-modelo').value || (nr13State.equipamentoSelecionado ? nr13State.equipamentoSelecionado.MODELO : ''),
    numeroSerie: document.getElementById('nr13-eq-serie').value || (nr13State.equipamentoSelecionado ? nr13State.equipamentoSelecionado.SERIE : ''),
    anoFabricacao: document.getElementById('nr13-ano-fabricacao').value,
    codigoConstrucao: document.getElementById('nr13-codigo-construcao').value,
    pmtaValor: tplNR13_numeroBr_(document.getElementById('nr13-pmta').value),
    pmtaUnidade: document.getElementById('nr13-pmta-unidade').value,
    volumeValor: tplNR13_numeroBr_(document.getElementById('nr13-volume').value),
    volumeUnidade: document.getElementById('nr13-volume-unidade').value,
    classeFluido: document.getElementById('nr13-classe-fluido').value,
    fluidoServico: document.getElementById('nr13-fluido-servico').value,
    tipoInspecao: document.getElementById('nr13-tipo-inspecao').value,
    dataInicioInspecao: document.getElementById('nr13-data-inicio').value,
    dataTerminoInspecao: document.getElementById('nr13-data-termino').value,
    dataProximaInspecao: document.getElementById('nr13-data-proxima-inspecao').value,
    descricaoInspecoes: document.getElementById('nr13-descricao-inspecoes').value,
    resultadoInspecoes: document.getElementById('nr13-resultado-inspecoes').value,
    recomendacoes: document.getElementById('nr13-recomendacoes').value,
    observacoes: document.getElementById('nr13-observacoes').value,
    fotos: nr13State.fotos.filter(function(f) { return f.fileId; }).map(function(f) {
      return { fileId: f.fileId, link: f.link, legendaUsuario: f.legendaUsuario, interpretacaoIA: f.interpretacaoIA };
    }),
    thRealizado: document.getElementById('nr13-th-realizado').checked,
    thUnidadePressao: document.getElementById('nr13-th-unidade').value,
    thPressaoTeste: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-teste').value),
    thTempoSubidaMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-subida').value),
    thPressaoInicial: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-inicial').value),
    thTempoEnsaioMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-ensaio').value),
    thPressaoFinal: tplNR13_numeroBr_(document.getElementById('nr13-th-pressao-final').value),
    thTempoDescidaMin: tplNR13_numeroBr_(document.getElementById('nr13-th-tempo-descida').value),
    valvulas: nr13State.valvulas,
    manometros: nr13State.manometros,
    veredito: tplNR13_vereditoSelecionado_(),
    parecerConclusivo: document.getElementById('nr13-parecer-conclusivo').value,
    assinantePh: document.getElementById('nr13-assinante-ph').value
  };
}

/**
 * Solta o vínculo com o laudoId atual (que pode estar apontando pra um
 * laudo já EMITIDO, travando "Salvar Rascunho"/"Emitir" com o erro "já
 * foi emitido e não pode mais ser editado") — os campos preenchidos na
 * tela continuam intactos, só o próximo Salvar/Emitir cria um registro
 * novo em vez de tentar atualizar o antigo.
 */
function tplNR13_novoLaudo_() {
  nr13State.laudoId = null;
  nr13State.registroOrigemId = null;
  document.getElementById('nr13-status-gerar').innerHTML = '';
  tplNR13_writeLog('Vínculo com o laudo anterior removido — o próximo Salvar/Emitir cria um laudo novo.', 'AVISO');
}

function tplNR13_salvarRascunho() {
  var payload = tplNR13_montarPayload_();
  tplNR13_msg('nr13-status-gerar', 'info', 'Salvando rascunho...');
  tplNR13_writeLog('Salvando rascunho do laudo...', 'SUCESSO');
  tplNR13_chamarApi('apiSalvarRascunho', payload).then(function(res) {
    nr13State.laudoId = res.laudoId;
    tplNR13_msg('nr13-status-gerar', 'success', 'Rascunho salvo.');
    tplNR13_writeLog('Rascunho salvo com sucesso (ID ' + res.laudoId + ').', 'SUCESSO');
  }).catch(function(err) { tplNR13_erro('nr13-status-gerar', err); });
}

function tplNR13_emitirLaudo() {
  var payload = tplNR13_montarPayload_();
  var veredito = tplNR13_vereditoSelecionado_();
  var nomesVeredito = { APROVADO: 'APROVADO', APROVADO_COM_RESSALVAS: 'APROVADO COM RESSALVAS', REPROVADO: 'REPROVADO' };
  if (!veredito) {
    tplNR13_msg('nr13-status-gerar', 'error', 'Falta o veredito. Na seção 8 (Veredito e parecer conclusivo), escolha Aprovado, Aprovado com ressalvas ou Reprovado e clique em "Emitir laudo final" de novo.');
    var pv = document.getElementById('nr13-panel-veredito'); if (pv && pv.scrollIntoView) pv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  var ph = (document.getElementById('nr13-assinante-ph') || {}).value || '';
  var eqSel = nr13State.equipamentoSelecionado || {};
  var vaso = (payload.tipoVaso || 'vaso de pressão') + (eqSel.TAG ? ' TAG ' + eqSel.TAG : '');
  if (!confirm('Emitir o laudo do ' + vaso + ' como ' + nomesVeredito[veredito] + (ph ? ', assinado por ' + ph : '') + '?\\n\\nDepois de emitido, o laudo recebe número e não pode mais ser alterado. Para revisar antes, clique em Cancelar e use "Salvar rascunho".')) return;

  var novaJanela = window.open('', '_blank');
  if (!novaJanela) {
    tplNR13_writeLog('O navegador bloqueou a nova aba do laudo — libere pop-ups para este site e clique em "Emitir Laudo Final" de novo.', 'AVISO');
    tplNR13_msg('nr13-status-gerar', 'error', 'O navegador bloqueou a abertura de uma nova aba. Libere pop-ups para este site e tente novamente.');
    return;
  }
  tplNR13_abrirHtmlEmNovaAba_(novaJanela, '<p style="font-family:sans-serif;padding:40px;">Gerando laudo, aguarde...</p>');

  tplNR13_msg('nr13-status-gerar', 'info', 'Salvando e emitindo laudo...');
  tplNR13_writeLog('Emitindo laudo final — salvando dados...', 'SUCESSO');
  tplNR13_chamarApi('apiSalvarRascunho', payload).then(function(res) {
    nr13State.laudoId = res.laudoId;
    payload.laudoId = res.laudoId;
    tplNR13_writeLog('Dados salvos. Calculando categoria, gerando PDF e textos com IA (pode levar alguns segundos)...', 'SUCESSO');
    return tplNR13_chamarApi('apiEmitirLaudo', payload);
  }).then(function(res) {
    tplNR13_abrirHtmlEmNovaAba_(novaJanela, res.html);
    tplNR13_msg('nr13-status-gerar', 'success', 'Laudo nº ' + res.numeroLaudo + ' emitido com sucesso.');
    tplNR13_writeLog('Laudo nº ' + res.numeroLaudo + ' emitido e salvo na pasta do cliente.', 'SUCESSO');
  }).catch(function(err) {
    if (novaJanela) novaJanela.close();
    tplNR13_erro('nr13-status-gerar', err);
  });
}

// ---------------- Busca por CNPJ / Reabertura ----------------
function tplNR13_buscarPorCnpj() {
  var cnpjDigitos = String(document.getElementById('nr13-busca-cnpj').value || '').replace(/\\D/g, '');
  if (cnpjDigitos.length !== 14) { tplNR13_msg('nr13-busca-resultado', 'error', 'Informe um CNPJ válido (14 dígitos).'); return; }

  tplNR13_msg('nr13-busca-resultado', 'info', 'Buscando...');
  tplNR13_writeLog('Buscando laudos NR13 emitidos pro CNPJ ' + cnpjDigitos + '...', 'SUCESSO');
  tplNR13_chamarApi('apiBuscarLaudosPorCnpj', { cnpj: cnpjDigitos }).then(function(res) {
    if (!res.cliente) { tplNR13_msg('nr13-busca-resultado', 'error', 'Nenhum cliente encontrado com este CNPJ.'); tplNR13_writeLog('Nenhum cliente encontrado com este CNPJ.', 'AVISO'); return; }
    if (!res.items.length) { tplNR13_msg('nr13-busca-resultado', 'info', 'Cliente encontrado, mas sem laudos NR13 emitidos ainda.'); tplNR13_writeLog('Cliente encontrado, sem laudos NR13 emitidos ainda.', 'AVISO'); return; }

    var mapaVeredito = { APROVADO: 'Aprovado', APROVADO_COM_RESSALVAS: 'Aprovado com Ressalvas', REPROVADO: 'Reprovado' };
    var html = '<div style="margin-top:10px;">' + res.items.map(function(it) {
      return '<div class="cert-item-row">' +
        '<span><strong>Laudo nº ' + it.numeroLaudo + '</strong> — ' + (it.equipamentoTipo || '') + ' (TAG ' + (it.equipamentoTag || '—') + ') — ' +
        (mapaVeredito[it.veredito] || it.veredito) + (it.statusPendencia === 'aberto' ? ' <span style="color:var(--warning);">(pendência aberta)</span>' : '') + '</span>' +
        '<span><button class="btn btn-sm" onclick="tplNR13_reabrirLaudo_(\\'' + it.id + '\\')">Reabrir laudo</button></span>' +
        '</div>';
    }).join('') + '</div>';
    document.getElementById('nr13-busca-resultado').innerHTML = html;
    tplNR13_writeLog(res.items.length + ' laudo(s) encontrado(s).', 'SUCESSO');
  }).catch(function(err) { tplNR13_erro('nr13-busca-resultado', err); });
}

function tplNR13_reabrirLaudo_(laudoId) {
  var novaJanela = window.open('', '_blank');
  if (!novaJanela) {
    tplNR13_writeLog('O navegador bloqueou a nova aba do laudo — libere pop-ups para este site e clique em "Reabrir laudo" de novo.', 'AVISO');
    return;
  }
  tplNR13_abrirHtmlEmNovaAba_(novaJanela, '<p style="font-family:sans-serif;padding:40px;">Carregando laudo...</p>');
  tplNR13_writeLog('Reabrindo laudo ID ' + laudoId + '...', 'SUCESSO');
  tplNR13_chamarApi('apiReabrirLaudo', { laudoId: laudoId }).then(function(res) {
    tplNR13_abrirHtmlEmNovaAba_(novaJanela, res.html);
  }).catch(function(err) {
    if (novaJanela) novaJanela.close();
    tplNR13_erro('nr13-busca-resultado', err);
  });
}

// ---------------- Continuar rascunho salvo (nunca perder o preenchimento) ----------------
function tplNR13_buscarRascunhos_() {
  var cnpjDigitos = String(document.getElementById('nr13-busca-cnpj').value || '').replace(/\\D/g, '');
  if (cnpjDigitos.length !== 14) { tplNR13_msg('nr13-rascunhos-resultado', 'error', 'Informe um CNPJ válido (14 dígitos).'); return; }

  tplNR13_msg('nr13-rascunhos-resultado', 'info', 'Buscando rascunhos salvos...');
  tplNR13_writeLog('Buscando rascunhos salvos pro CNPJ ' + cnpjDigitos + '...', 'SUCESSO');
  tplNR13_chamarApi('apiListarRascunhosPorCnpj', { cnpj: cnpjDigitos }).then(function(res) {
    if (!res.items.length) {
      tplNR13_msg('nr13-rascunhos-resultado', 'info', 'Nenhum rascunho salvo encontrado pra este CNPJ.');
      tplNR13_writeLog('Nenhum rascunho salvo encontrado.', 'AVISO');
      return;
    }
    var html = '<div style="margin-top:10px;">' + res.items.map(function(it) {
      return '<div class="cert-item-row">' +
        '<span>' + (it.tipoVaso || 'Vaso de pressão') + (it.equipamentoTag ? (' — TAG ' + it.equipamentoTag) : '') + '</span>' +
        '<span><button class="btn btn-sm btn-primary" onclick="tplNR13_carregarRascunho_(\\'' + it.id + '\\')">Continuar preenchendo</button></span>' +
        '</div>';
    }).join('') + '</div>';
    document.getElementById('nr13-rascunhos-resultado').innerHTML = html;
    tplNR13_writeLog(res.items.length + ' rascunho(s) salvo(s) encontrado(s).', 'SUCESSO');
  }).catch(function(err) { tplNR13_erro('nr13-rascunhos-resultado', err); });
}

function tplNR13_carregarRascunho_(laudoId) {
  tplNR13_writeLog('Carregando rascunho salvo...', 'SUCESSO');
  tplNR13_chamarApi('apiObterLaudo', { laudoId: laudoId }).then(function(res) {
    var laudo = res.laudo;
    nr13State.laudoId = laudo.ID;
    nr13State.registroOrigemId = laudo.REGISTRO_ORIGEM_ID || null;
    nr13State.unidadeSelecionadaId = laudo.UNIDADE_ID || null;

    if (res.cliente) tplNR13_selecionarCliente(res.cliente);
    if (res.equipamento) tplNR13_confirmarEquipamento_(res.equipamento);

    document.getElementById('nr13-ano-fabricacao').value = laudo.ANO_FABRICACAO || '';
    document.getElementById('nr13-codigo-construcao').value = laudo.CODIGO_CONSTRUCAO || '';
    document.getElementById('nr13-pmta').value = laudo.PMTA_VALOR ? tplNR13_fmtVar_(laudo.PMTA_VALOR, 6) : '';
    document.getElementById('nr13-pmta-unidade').value = laudo.PMTA_UNIDADE || 'MPa';
    document.getElementById('nr13-volume').value = laudo.VOLUME_VALOR ? tplNR13_fmtVar_(laudo.VOLUME_VALOR, 6) : '';
    document.getElementById('nr13-volume-unidade').value = laudo.VOLUME_UNIDADE || 'm³';
    document.getElementById('nr13-classe-fluido').value = laudo.CLASSE_FLUIDO || '';
    document.getElementById('nr13-fluido-servico').value = laudo.FLUIDO_SERVICO || '';
    tplNR13_recalcularCategoria_();

    document.getElementById('nr13-tipo-inspecao').value = laudo.TIPO_INSPECAO || 'Periódica';
    document.getElementById('nr13-data-inicio').value = laudo.DATA_INICIO_INSPECAO || '';
    document.getElementById('nr13-data-termino').value = laudo.DATA_TERMINO_INSPECAO || '';
    document.getElementById('nr13-data-proxima-inspecao').value = laudo.DATA_PROXIMA_INSPECAO || '';
    document.getElementById('nr13-assinante-ph').value = laudo.ASSINANTE_PH || '';

    nr13State.valvulas = laudo.valvulas || [];
    tplNR13_renderValvulas_();
    nr13State.manometros = laudo.manometros || [];
    tplNR13_renderManometros_();

    document.getElementById('nr13-th-realizado').checked = laudo.TH_REALIZADO === 'S';
    tplNR13_toggleTH_();
    if (laudo.TH_REALIZADO === 'S') {
      document.getElementById('nr13-th-unidade').value = laudo.TH_UNIDADE_PRESSAO || laudo.PMTA_UNIDADE || 'MPa';
      document.getElementById('nr13-th-pressao-teste').value = laudo.TH_PRESSAO_TESTE ? tplNR13_fmtVar_(laudo.TH_PRESSAO_TESTE, 6) : '';
      document.getElementById('nr13-th-tempo-subida').value = laudo.TH_TEMPO_SUBIDA_MIN || '';
      document.getElementById('nr13-th-pressao-inicial').value = laudo.TH_PRESSAO_INICIAL ? tplNR13_fmtVar_(laudo.TH_PRESSAO_INICIAL, 6) : '';
      document.getElementById('nr13-th-tempo-ensaio').value = laudo.TH_TEMPO_ENSAIO_MIN || '';
      document.getElementById('nr13-th-pressao-final').value = laudo.TH_PRESSAO_FINAL ? tplNR13_fmtVar_(laudo.TH_PRESSAO_FINAL, 6) : '';
      document.getElementById('nr13-th-tempo-descida').value = laudo.TH_TEMPO_DESCIDA_MIN || '';
      tplNR13_recalcularTH_();
    }

    nr13State.fotos = (laudo.fotos || []).map(function(f) {
      return { fileId: f.fileId || '', link: f.link || '', legendaUsuario: f.legendaUsuario || '', interpretacaoIA: f.interpretacaoIA || '', base64: '', mimeType: 'image/jpeg', enviando: false };
    });
    tplNR13_renderFotosLista_();

    document.getElementById('nr13-descricao-inspecoes').value = laudo.DESCRICAO_INSPECOES || '';
    document.getElementById('nr13-resultado-inspecoes').value = laudo.RESULTADO_INSPECOES || '';
    document.getElementById('nr13-recomendacoes').value = laudo.RECOMENDACOES || '';
    document.getElementById('nr13-observacoes').value = laudo.OBSERVACOES || '';

    tplNR13_selecionarVeredito_(laudo.VEREDITO || '');
    document.getElementById('nr13-parecer-conclusivo').value = laudo.PARECER_CONCLUSIVO || '';

    document.getElementById('nr13-busca-resultado').innerHTML = '';
    document.getElementById('nr13-rascunhos-resultado').innerHTML = '';
    tplNR13_writeLog('Rascunho carregado com sucesso — pode continuar de onde parou.', 'SUCESSO');
    tplNR13_irParaSecao_('nr13-panel-vaso');
  }).catch(function(err) { tplNR13_erro('nr13-rascunhos-resultado', err); });
}

// ================================================================
// MANUAL DO OPERADOR
// ================================================================
function tplNR13_manualHtml_() {
  return '<div class="wrap manual-wrap">' +
  '<header class="header-card" style="position:static; margin-bottom:24px;">' +
  '  <div class="title-area"><h1 style="margin-bottom:4px;">Manual do Operador</h1><p style="margin:0;">Laudo de Inspeção NR-13 — Vaso de Pressão</p></div>' +
  '  <button type="button" class="btn" onclick="tplNR13_voltarDoManual_()">← Voltar ao sistema</button>' +
  '</header>' +

  '<div class="toc" id="tplNR13_topoManual">' +
  '  <h2>Índice</h2>' +
  '  <ol>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms1\\')">O que este sistema faz</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms2\\')">Mapa da tela</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms3\\')">Categorização automática (Tabela 1 e 2 da NR-13)</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms4\\')">Registro fotográfico com IA</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms5\\')">Veredito e o que acontece com "Aprovado com Ressalvas"</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms6\\')">Rascunho x Emissão final</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms7\\')">Consultar laudos já emitidos</a></li>' +
  '    <li><a onclick="tplNR13_irParaSecao_(\\'tplNR13_ms8\\')">Erros comuns</a></li>' +
  '  </ol>' +
  '</div>' +

  '<h2 id="tplNR13_ms1">1. O que este sistema faz</h2>' +
  '<p>Este módulo emite o <strong>Laudo de Inspeção de Segurança de Vaso de Pressão</strong>, documento exigido pela NR-13 ' +
  '(item 13.5) sempre que um vaso de pressão — autoclave, compressor, central de ar comprimido, central de vácuo, ' +
  'reservatório, entre outros — é inspecionado. O sistema calcula sozinho a categoria de risco do vaso e o prazo até a ' +
  'próxima inspeção, e usa Inteligência Artificial pra ajudar a redigir a interpretação técnica das fotos e a lapidar os ' +
  'textos do laudo — mas quem decide o resultado final (Aprovado, Aprovado com Ressalvas ou Reprovado) é sempre o ' +
  'engenheiro Profissional Legalmente Habilitado (PLH), nunca a IA.</p>' +

  '<h2 id="tplNR13_ms2">2. Mapa da tela</h2>' +
  '<ol>' +
  '  <li><strong>Consultar laudos já emitidos</strong> — pra reabrir um laudo antigo pelo CNPJ do cliente.</li>' +
  '  <li><strong>1. Cliente</strong> — quem é o dono do vaso inspecionado.</li>' +
  '  <li><strong>2. Equipamento</strong> — qual vaso foi inspecionado.</li>' +
  '  <li><strong>3. Dados técnicos do vaso</strong> — PMTA, volume, fluido — aqui a categoria é calculada sozinha.</li>' +
  '  <li><strong>4. Dados da inspeção</strong> — tipo, datas, PH responsável.</li>' +
  '  <li><strong>5. Registro fotográfico</strong> — fotos com legenda e interpretação por IA.</li>' +
  '  <li><strong>6. Descrição/Resultado/Recomendações</strong> — texto livre, com botão de melhoria por IA.</li>' +
  '  <li><strong>7. Veredito e parecer conclusivo</strong> — a decisão do engenheiro.</li>' +
  '  <li><strong>8. Salvar/Emitir</strong> — rascunho a qualquer momento, ou emissão final.</li>' +
  '</ol>' +

  '<h2 id="tplNR13_ms3">3. Categorização automática (Tabela 1 e 2 da NR-13)</h2>' +
  '<p>Assim que você preenche <strong>PMTA</strong> (Pressão Máxima de Trabalho Admissível, em MPa), <strong>Volume</strong> ' +
  '(em m³) e a <strong>Classe do fluido</strong>, o sistema calcula automaticamente:</p>' +
  '<table><tr><th>Campo calculado</th><th>Como é calculado</th></tr>' +
  '<tr><td>P.V (Grupo de Potencial de Risco)</td><td>Produto entre PMTA e Volume — quanto maior, maior o grupo de risco (1 a 5)</td></tr>' +
  '<tr><td>Categoria (I a V)</td><td>Cruza o Grupo de Risco com a Classe do Fluido, na Tabela 1 oficial da norma</td></tr>' +
  '<tr><td>Prazo até a próxima inspeção</td><td>Depende só da Categoria, na Tabela 2 oficial (prazo do exame interno, o mais restritivo)</td></tr>' +
  '</table>' +
  '<div class="callout"><strong>Classes de fluido:</strong> A = inflamáveis/tóxicos graves/hidrogênio/acetileno; B = combustíveis/tóxicos moderados; ' +
  'C = vapor d\\'água, gases asfixiantes simples, ar comprimido (o caso mais comum em autoclaves e compressores); D = outros fluidos.</div>' +

  '<h2 id="tplNR13_ms4">4. Registro fotográfico com IA</h2>' +
  '<p>Anexe as fotos tiradas durante o exame. Pra cada foto, escreva rapidamente o que ela representa (ex.: "corrosão ' +
  'externa próxima ao dreno") e clique em <strong>"Interpretar com IA"</strong> — a IA lê sua legenda e a própria imagem, e ' +
  'escreve um parágrafo técnico mais completo pro laudo, sempre baseado no que você disse. A IA nunca decide se aquilo ' +
  'é motivo de reprovação — isso é sempre uma decisão sua, no Veredito.</p>' +

  '<h2 id="tplNR13_ms5">5. Veredito e o que acontece com "Aprovado com Ressalvas"</h2>' +
  '<p>Existem 3 opções de veredito:</p>' +
  '<table><tr><th>Veredito</th><th>O que significa</th></tr>' +
  '<tr><td>Aprovado</td><td>Vaso íntegro, sem restrições até a próxima inspeção calculada</td></tr>' +
  '<tr><td>Aprovado com Ressalvas</td><td>Vaso pode continuar operando, mas há pendências que precisam ser corrigidas — o sistema abre uma pendência ligada a este equipamento</td></tr>' +
  '<tr><td>Reprovado</td><td>Vaso não deve continuar em operação até que as providências sejam tomadas</td></tr>' +
  '</table>' +
  '<div class="callout"><strong>Como fechar uma pendência de "Aprovado com Ressalvas"?</strong> Depois que as correções forem feitas no vaso, volte no cadastro deste ' +
  'mesmo equipamento — a tela mostra um aviso amarelo com o botão <strong>"Registrar Reinspeção"</strong>. Isso abre um novo laudo (inspeção ' +
  'extraordinária) já vinculado ao laudo anterior; ao emitir esse novo laudo, a pendência do laudo antigo é fechada automaticamente.</div>' +

  '<h2 id="tplNR13_ms6">6. Rascunho × Emissão final</h2>' +
  '<p>Clique em <strong>"Salvar Rascunho"</strong> a qualquer momento — os dados ficam salvos e você pode continuar depois. ' +
  'O rascunho pode ser editado livremente. Quando estiver tudo pronto e revisado, clique em <strong>"Emitir Laudo Final"</strong>: ' +
  'o sistema gera o PDF oficial, numera o laudo, salva na pasta do cliente, e a partir daí o laudo <strong>não pode mais ser editado</strong> — ' +
  'exatamente como os outros certificados e laudos oficiais do Portal.</p>' +

  '<h2 id="tplNR13_ms7">7. Consultar laudos já emitidos</h2>' +
  '<p>No topo da tela, digite o CNPJ do cliente e clique em Buscar — aparece a lista de laudos NR13 já emitidos, com um ' +
  'botão "Reabrir laudo" pra reimprimir/revisualizar o PDF sem recalcular nada.</p>' +

  '<h2 id="tplNR13_ms8">8. Erros comuns</h2>' +
  '<table><tr><th>O que aconteceu</th><th>O que fazer</th></tr>' +
  '<tr><td>A categoria não aparece</td><td>Confira se PMTA, Volume e Classe do fluido estão todos preenchidos</td></tr>' +
  '<tr><td>"Selecione o Profissional Legalmente Habilitado (PLH) responsável"</td><td>Escolha um assinante na Seção 4 antes de emitir</td></tr>' +
  '<tr><td>A foto não sobe</td><td>Aguarde — o upload acontece em segundo plano; se falhar, aparece o motivo abaixo da foto</td></tr>' +
  '<tr><td>Quero corrigir um laudo já emitido</td><td>Não é possível — emita um novo laudo (reinspeção, se for o caso de uma ressalva)</td></tr>' +
  '</table>' +

  '<a class="topo-link" onclick="tplNR13_irParaSecao_(\\'tplNR13_topoManual\\')">↑ Topo</a>' +
  '</div>';
}
</script>
`;

function NR13_obterConteudoModulo() {
  return NR13_CONTEUDO_MODULO;
}
