/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — CONTEÚDO DA TELA (21/10/2026)
 *
 * O carregador JS_BaixaTemp.html busca BaixaTemp_obterConteudoModulo() na
 * primeira abertura (mesmo padrão dos outros módulos: <style> + <script>).
 * O código do navegador fica escrito como função comum (BaixaTempTela_cliente_)
 * e vai para a tela pelo próprio texto da função: nada de texto escapado à mão.
 * Não usar a sequência de fechamento de script dentro da função.
 ****************************************************/

var BAIXATEMP_CSS = [
  '#btApp{font-size:14px;color:var(--bc-text)}',
  '#btApp *{box-sizing:border-box}',
  '#btApp .bt-msg{display:none;margin:0 0 12px;padding:10px 12px;border-radius:6px;border:1px solid var(--bc-line);white-space:pre-line;overflow-wrap:anywhere;font-size:13.5px}',
  '#btApp .bt-msg.ok{display:block;background:var(--bc-action-bg);border-color:var(--bc-action-line);color:var(--bc-action)}',
  '#btApp .bt-msg.erro{display:block;background:var(--bc-danger-bg);border-color:var(--bc-danger-line);color:var(--bc-danger)}',
  '#btApp .bt-msg.aviso{display:block;background:var(--bc-warn-bg);border-color:var(--bc-warn-line);color:var(--bc-warn)}',
  '#btApp .bt-msg.info{display:block;background:var(--bc-info-bg);border-color:var(--bc-info-line);color:var(--bc-info)}',
  '#btApp .bt-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}',
  '#btApp .bt-barra .bt-esp{flex:1 1 auto}',
  '#btApp .bt-abas{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--bc-line);margin:0 0 14px;padding-bottom:0;-webkit-overflow-scrolling:touch}',
  '#btApp .bt-aba{flex:0 0 auto;border:1px solid transparent;border-bottom:0;background:none;padding:9px 12px;font:600 13px var(--bc-sans);color:var(--bc-text-2);cursor:pointer;border-radius:6px 6px 0 0;min-height:40px}',
  '#btApp .bt-aba.ativa{background:var(--bc-surface);border-color:var(--bc-line);color:var(--bc-action);margin-bottom:-1px}',
  '#btApp .bt-aba .n{display:inline-flex;width:20px;height:20px;border-radius:50%;align-items:center;justify-content:center;background:var(--bc-surface-3);font-size:11.5px;margin-right:6px}',
  '#btApp .bt-aba.ativa .n{background:var(--bc-action-bg);color:var(--bc-action)}',
  '#btApp .bt-painel{background:var(--bc-surface);border:1px solid var(--bc-line);border-radius:8px;padding:14px 16px;margin:0 0 14px}',
  '#btApp .bt-painel h3{margin:0 0 10px;font:700 15px var(--bc-sans);color:var(--bc-text)}',
  '#btApp .bt-painel h4{margin:14px 0 8px;font:700 13.5px var(--bc-sans);color:var(--bc-text)}',
  '#btApp .bt-nota{font-size:12.5px;color:var(--bc-text-3);margin:4px 0 8px}',
  '#btApp .bt-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}',
  '#btApp .bt-campo{display:flex;flex-direction:column;gap:4px;min-width:0}',
  '#btApp .bt-campo.largo{grid-column:1/-1}',
  '#btApp .bt-campo>span{font:600 12.5px var(--bc-sans);color:var(--bc-text-2)}',
  '#btApp input[type=text],#btApp input[type=number],#btApp select,#btApp textarea{width:100%;border:1px solid var(--bc-line-2);border-radius:4px;padding:8px 9px;font:14px/1.4 var(--bc-sans);color:var(--bc-text);background:#fff;min-height:38px}',
  '#btApp textarea{min-height:90px;resize:vertical}',
  '#btApp textarea.alto{min-height:200px}',
  '#btApp input[disabled],#btApp select[disabled],#btApp textarea[disabled]{background:var(--bc-surface-2);color:var(--bc-text-2)}',
  '#btApp .bt-check{display:flex;gap:8px;align-items:center;font-size:14px;min-height:36px}',
  '#btApp .bt-check input{width:18px;height:18px;accent-color:var(--bc-action)}',
  '#btApp .bt-opcoes{display:flex;flex-wrap:wrap;gap:8px 18px}',
  '#btApp .bt-rolagem{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}',
  '#btApp table.bt-t{width:100%;border-collapse:collapse;font-size:13px}',
  '#btApp table.bt-t th,#btApp table.bt-t td{border-bottom:1px solid var(--bc-line-soft);padding:6px 8px;text-align:left;vertical-align:top}',
  '#btApp table.bt-t th{background:var(--bc-surface-2);font-weight:700;color:var(--bc-text-2);white-space:nowrap}',
  '#btApp table.bt-t td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
  '#btApp table.bt-t td input,#btApp table.bt-t td select{min-width:90px}',
  '#btApp table.bt-previa{font:12px var(--bc-mono)}#btApp table.bt-previa td{white-space:nowrap}',
  '#btApp .bt-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;border:1px solid var(--bc-line);background:var(--bc-surface-2);font-size:12.5px;color:var(--bc-text-2);white-space:nowrap}',
  '#btApp .bt-chip.ok{background:var(--bc-action-bg);border-color:var(--bc-action-line);color:var(--bc-action)}',
  '#btApp .bt-chip.nok{background:var(--bc-danger-bg);border-color:var(--bc-danger-line);color:var(--bc-danger)}',
  '#btApp .bt-chip.aviso{background:var(--bc-warn-bg);border-color:var(--bc-warn-line);color:var(--bc-warn)}',
  '#btApp .bt-chip.info{background:var(--bc-info-bg);border-color:var(--bc-info-line);color:var(--bc-info)}',
  '#btApp .bt-ciclo{border:1px solid var(--bc-line-2);border-radius:8px;padding:12px 14px;margin:0 0 14px;background:var(--bc-surface-2)}',
  '#btApp .bt-ciclo-cab{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}',
  '#btApp .bt-ciclo-cab b{font-size:15px}',
  '#btApp .bt-lista{margin:6px 0 0 18px;padding:0}#btApp .bt-lista li{margin:0 0 6px;overflow-wrap:anywhere}',
  '#btApp .bt-grafico{background:#fff;border:1px solid var(--bc-line);border-radius:6px;padding:6px;margin:8px 0}',
  '#btApp .bt-grafico svg{width:100%;height:auto;display:block}',
  '#btApp .bt-resultado{border:1px solid var(--bc-line-2);border-left:5px solid var(--bc-line-2);border-radius:6px;padding:10px 14px;margin:0 0 12px;background:var(--bc-surface)}',
  '#btApp .bt-resultado.ok{border-left-color:var(--bc-action)}#btApp .bt-resultado.nok{border-left-color:var(--bc-danger)}#btApp .bt-resultado.pend{border-left-color:var(--bc-warn)}',
  '#btApp .bt-resultado .v{font:700 18px var(--bc-sans)}',
  '#btApp .bt-cartoes{display:none}',
  '#btApp .bt-cartao{border:1px solid var(--bc-line);border-radius:8px;padding:10px 12px;margin:0 0 10px;background:var(--bc-surface)}',
  '#btApp .bt-cartao b{display:block;font-size:14.5px;margin:0 0 2px}',
  '#btApp .bt-cartao .l{font-size:13px;color:var(--bc-text-2);margin:2px 0;overflow-wrap:anywhere}',
  '#btApp .bt-rodape{position:sticky;bottom:0;background:var(--bc-bg);border-top:1px solid var(--bc-line);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;z-index:5}',
  '#btApp .btn-primary,#btApp .btn-secondary{min-height:40px}',
  '#btApp .bt-mini{padding:4px 10px;min-height:32px;font-size:12.5px}',
  '@media (max-width:760px){#btApp .bt-tabela-lista{display:none}#btApp .bt-cartoes{display:block}#btApp .bt-painel{padding:12px}#btApp .bt-grade{grid-template-columns:1fr}#btApp .bt-barra .btn-primary,#btApp .bt-barra .btn-secondary{flex:1 1 auto}}'
].join('\n');

function BaixaTemp_obterConteudoModulo() {
  return '<style>' + BAIXATEMP_CSS + '</style><script>(' + BaixaTempTela_cliente_.toString() + ')();</script>';
}

/* eslint-disable */
function BaixaTempTela_cliente_() {
  var BT = { cfg: null, lista: [], e: null, d: null, aba: 1, av: null, graficos: {}, previas: {}, sujo: false, ocupado: false, padroes: [], clientes: [], unidades: [], equipamentos: [], textosAviso: '' };
  var ABAS = ['Identificação', 'Ciclo e critérios', 'Instrumentos', 'Instalação (QI)', 'Operação (QO)', 'Desempenho (QD)', 'Resultado e textos', 'Revisão e emissão'];
  var GRANDEZAS = [['TEMPERATURA', 'Temperatura'], ['PRESSAO', 'Pressão'], ['UMIDADE', 'Umidade'], ['CONCENTRACAO', 'Concentração']];
  var PAPEIS_COL = [['IGNORAR', 'Ignorar'], ['DATAHORA', 'Data e hora'], ['DATA', 'Data'], ['HORA', 'Hora'], ['DECORRIDO', 'Tempo decorrido'], ['TEMPERATURA', 'Temperatura'], ['PRESSAO', 'Pressão'], ['UMIDADE', 'Umidade'], ['CONCENTRACAO', 'Concentração']];
  var UNID_P = [['MBAR', 'mbar'], ['HPA', 'hPa'], ['KPA', 'kPa'], ['PA', 'Pa'], ['BAR', 'bar'], ['PSI', 'psi'], ['MMHG', 'mmHg'], ['TORR', 'Torr']];
  var SECOES = [['analiseQI', 'Análise da qualificação de instalação', 'QI'], ['analiseQO', 'Análise da qualificação de operação', 'QO'], ['analiseQD', 'Análise da qualificação de desempenho', 'QD'], ['conclusaoTecnica', 'Conclusão técnica', ''], ['conclusaoLeigo', 'Conclusão em linguagem de fácil compreensão', '']];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function num(v, c) { if (v === null || v === undefined || v === '' || !isFinite(v)) return '—'; var n = Number(v); var p = Math.abs(n).toFixed(c === undefined ? 2 : c).split('.'); return (n < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); }
  function hojeBr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function novoId() { return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function editavel() { return !!(BT.cfg && BT.cfg.podeEditar && BT.e && BT.e.status === 'RASCUNHO'); }
  function dis() { return editavel() ? '' : ' disabled'; }

  function msg(tipo, texto) {
    var m = $('btMsg');
    if (!m) return;
    m.className = 'bt-msg' + (texto ? ' ' + tipo : '');
    m.textContent = texto || '';
    if (texto && tipo === 'erro') try { m.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  function api(fn, payload, ok, opcoes) {
    opcoes = opcoes || {};
    if (BT.ocupado && !opcoes.paralelo) { msg('aviso', 'Aguarde: a operação anterior ainda está em andamento.'); return; }
    if (!opcoes.paralelo) BT.ocupado = true;
    if (opcoes.espera) msg('info', opcoes.espera);
    google.script.run
      .withSuccessHandler(function (r) {
        if (!opcoes.paralelo) BT.ocupado = false;
        try { ok(r || {}); } catch (e) { msg('erro', 'Erro ao mostrar o resultado: ' + (e && e.message ? e.message : e) + '. Recarregue a tela e tente de novo.'); }
      })
      .withFailureHandler(function (e) {
        if (!opcoes.paralelo) BT.ocupado = false;
        msg('erro', String(e && e.message ? e.message : e));
        if (opcoes.falha) opcoes.falha(e);
      })
      .BaixaTemp_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  }

  /* ---------------- caminho dentro dos dados ---------------- */
  function obter(obj, caminho) { return caminho.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function definir(obj, caminho, valor) {
    var p = caminho.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; }
    o[p[p.length - 1]] = valor;
  }
  function campo(rotulo, caminho, opcoes) {
    opcoes = opcoes || {};
    var v = obter(BT.d, caminho);
    var cls = 'bt-campo' + (opcoes.largo ? ' largo' : '');
    var attrs = ' data-k="' + esc(caminho) + '"' + (opcoes.livre ? '' : dis()) + (opcoes.ph ? ' placeholder="' + esc(opcoes.ph) + '"' : '');
    var ctl;
    if (opcoes.lista) ctl = '<select' + attrs + '>' + opcoes.lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v == null ? '' : v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else if (opcoes.area) ctl = '<textarea' + attrs + (opcoes.alto ? ' class="alto"' : '') + '>' + esc(v == null ? '' : v) + '</textarea>';
    else ctl = '<input type="text" inputmode="' + (opcoes.numero ? 'decimal' : 'text') + '"' + attrs + ' value="' + esc(v == null ? '' : v) + '">';
    return '<label class="' + cls + '"><span>' + esc(rotulo) + '</span>' + ctl + (opcoes.ajuda ? '<small class="bt-nota">' + esc(opcoes.ajuda) + '</small>' : '') + '</label>';
  }
  function marca(rotulo, caminho) {
    var v = !!obter(BT.d, caminho);
    return '<label class="bt-check"><input type="checkbox" data-k="' + esc(caminho) + '"' + (v ? ' checked' : '') + dis() + '>' + esc(rotulo) + '</label>';
  }

  /* ---------------- dados novos ---------------- */
  function dadosNovos() {
    return {
      tipo: 'PEROXIDO', etapas: { QI: true, QO: true, QD: true },
      identificacao: { tecnicoExecutor: BT.cfg.usuario || '', dataInicio: hojeBr(), motivo: 'Qualificação inicial' },
      programa: {}, instrumentos: [], qi: { itens: [] }, qo: { itens: [], estanqueidade: { aplicavel: false } }, ciclos: [], textos: {}, observacoes: ''
    };
  }

  /* ---------------- início ---------------- */
  window.tplBaixaTemp_renderReal_ = function () {
    var c = $('tplBaixaTempContainer');
    if (!c) return;
    c.innerHTML = '<div id="btApp"><div id="btMsg" class="bt-msg" role="status" aria-live="polite"></div><div id="btCorpo">Carregando…</div></div>';
    $('btApp').addEventListener('change', aoMudar);
    $('btApp').addEventListener('click', aoClicar);
    api('apiPing', {}, function (r) { BT.cfg = r; listar(); }, { espera: 'Carregando…' });
  };

  function listar() {
    BT.e = null; BT.d = null; BT.av = null; BT.graficos = {}; BT.previas = {};
    api('apiListar', { termo: BT.filtro || '', status: BT.filtroStatus || '' }, function (r) { BT.lista = r.items || []; msg('', ''); desenharLista(); }, { espera: 'Carregando a lista de ensaios…' });
  }

  function chipResultado(res) {
    if (res === 'CONFORME') return '<span class="bt-chip ok">Conforme</span>';
    if (res === 'NAO_CONFORME') return '<span class="bt-chip nok">Não conforme</span>';
    return '<span class="bt-chip">Sem resultado</span>';
  }
  function chipStatus(s, rot) {
    var cls = { RASCUNHO: '', EM_REVISAO: 'aviso', APROVADO: 'info', EMITIDO: 'ok' }[s] || '';
    return '<span class="bt-chip ' + cls + '">' + esc(rot || s) + '</span>';
  }
  function rotTipo(t) { return BT.cfg && BT.cfg.tipos[t] ? BT.cfg.tipos[t].rotulo : t; }

  function desenharLista() {
    var h = [];
    h.push('<div class="bt-barra">' + (BT.cfg.podeEditar ? '<button type="button" class="btn-primary" data-acao="novo">Novo ensaio</button>' : '') +
      '<span class="bt-esp"></span><input type="text" id="btFiltro" placeholder="Buscar por número, cliente, CNPJ ou TAG" value="' + esc(BT.filtro || '') + '" style="max-width:320px">' +
      '<select id="btFiltroStatus" style="max-width:240px"><option value="">Todas as situações</option>' + [['RASCUNHO', 'Rascunho'], ['EM_REVISAO', 'Aguardando revisão'], ['APROVADO', 'Aprovado'], ['EMITIDO', 'Emitido']].map(function (o) { return '<option value="' + o[0] + '"' + (BT.filtroStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn-secondary" data-acao="buscar">Buscar</button></div>');
    if (!BT.lista.length) {
      h.push('<div class="bt-painel"><p>Nenhum ensaio encontrado.' + (BT.cfg.podeEditar ? ' Toque em "Novo ensaio" para começar a qualificação de um esterilizador a peróxido de hidrogênio ou a vapor a baixa temperatura com formaldeído.' : '') + '</p></div>');
    } else {
      h.push('<div class="bt-painel bt-tabela-lista"><div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Relatório</th><th>Cliente</th><th>TAG</th><th>Processo</th><th>Etapas</th><th>Situação</th><th>Resultado</th><th></th></tr></thead><tbody>' +
        BT.lista.map(function (x) {
          return '<tr><td>' + esc(x.numero || 'ainda sem número') + (x.revisao && x.revisao !== '0' ? ' rev. ' + esc(x.revisao) : '') + '</td><td>' + esc(x.cliente || '—') + '</td><td>' + esc(x.tag || '—') + '</td><td>' + esc(rotTipo(x.tipo)) + '</td><td>' + esc(x.etapas || '—') + '</td><td>' + chipStatus(x.status, x.statusRotulo) + '</td><td>' + chipResultado(x.resultado) + '</td>' +
            '<td style="white-space:nowrap"><button type="button" class="btn-secondary bt-mini" data-acao="abrir" data-id="' + esc(x.id) + '">Abrir</button>' + (x.doc && x.doc.pdf ? ' <a class="btn-secondary bt-mini" href="' + esc(x.doc.pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>');
      h.push('<div class="bt-cartoes">' + BT.lista.map(function (x) {
        return '<div class="bt-cartao"><b>' + esc(x.cliente || 'Cliente não escolhido') + '</b><div class="l">' + esc(x.numero || 'Ainda sem número') + ' · TAG ' + esc(x.tag || '—') + '</div><div class="l">' + esc(rotTipo(x.tipo)) + ' · ' + esc(x.etapas || '—') + '</div><div class="l">' + chipStatus(x.status, x.statusRotulo) + ' ' + chipResultado(x.resultado) + '</div>' +
          '<div class="bt-barra" style="margin:8px 0 0"><button type="button" class="btn-secondary" data-acao="abrir" data-id="' + esc(x.id) + '">Abrir</button>' + (x.doc && x.doc.pdf ? '<a class="btn-secondary" href="' + esc(x.doc.pdf) + '" target="_blank" rel="noopener">Abrir PDF</a>' : '') + '</div></div>';
      }).join('') + '</div>');
    }
    $('btCorpo').innerHTML = h.join('');
  }

  function abrirEnsaio(id, aba) {
    api('apiObter', { id: id }, function (r) {
      var lk = (r.arquivos && r.arquivos.emitido && r.arquivos.emitido.links) || {};
      r.linkPdf = lk.pdf; r.linkHtml = lk.html; r.pastaUrl = lk.pasta; r.pdfId = lk.idPdf; r.htmlId = lk.idHtml;
      BT.e = r; BT.d = r.dados || dadosNovos(); BT.av = null; BT.graficos = {}; BT.previas = {}; BT.sujo = false; BT.aba = aba || BT.aba || 1;
      msg('', '');
      desenharEditor();
      if (BT.d.ciclos && BT.d.ciclos.length && (r.status !== 'RASCUNHO' || aba === 7)) calcular(true);
    }, { espera: 'Abrindo o ensaio…' });
  }

  function novoEnsaio() {
    BT.e = { id: '', status: 'RASCUNHO', statusRotulo: 'Rascunho', numero: '', versaoDados: 0, historico: [] };
    BT.d = dadosNovos(); BT.av = null; BT.aba = 1; BT.sujo = true; BT.graficos = {}; BT.previas = {};
    msg('info', 'Preencha a identificação e toque em "Salvar". Você pode salvar a qualquer momento e continuar depois.');
    desenharEditor();
  }

  /* ---------------- editor ---------------- */
  function desenharEditor() {
    var e = BT.e, h = [];
    h.push('<div class="bt-barra"><button type="button" class="btn-secondary" data-acao="lista">Voltar à lista</button><b style="font-size:15px">' + esc(e.numero ? 'Relatório ' + e.numero : 'Ensaio sem número (rascunho)') + '</b> ' + chipStatus(e.status, e.statusRotulo) + (BT.sujo ? ' <span class="bt-chip aviso" id="btSujo">Alterações não salvas</span>' : '') + '<span class="bt-esp"></span>' +
      (editavel() ? '<button type="button" class="btn-primary" data-acao="salvar">Salvar</button>' : '') + '</div>');
    if (e.parecerRt && e.status === 'RASCUNHO') h.push('<div class="bt-msg aviso" style="display:block">Observação do responsável técnico na última revisão: ' + esc(e.parecerRt) + '</div>');
    h.push('<div class="bt-abas" role="tablist">' + ABAS.map(function (t, i) { return '<button type="button" role="tab" class="bt-aba' + (BT.aba === i + 1 ? ' ativa' : '') + '" data-acao="aba" data-aba="' + (i + 1) + '"><span class="n">' + (i + 1) + '</span>' + esc(t) + '</button>'; }).join('') + '</div>');
    h.push('<div id="btAba">' + conteudoAba() + '</div>');
    h.push('<div class="bt-rodape">' + (BT.aba > 1 ? '<button type="button" class="btn-secondary" data-acao="aba" data-aba="' + (BT.aba - 1) + '">Anterior</button>' : '') + (BT.aba < ABAS.length ? '<button type="button" class="btn-secondary" data-acao="aba" data-aba="' + (BT.aba + 1) + '">Próximo</button>' : '') + (editavel() ? '<button type="button" class="btn-primary" data-acao="salvar">Salvar</button>' : '') + '</div>');
    $('btCorpo').innerHTML = h.join('');
  }

  function conteudoAba() {
    switch (BT.aba) {
      case 1: return abaIdentificacao();
      case 2: return abaCiclo();
      case 3: return abaInstrumentos();
      case 4: return abaQI();
      case 5: return abaQO();
      case 6: return abaQD();
      case 7: return abaResultado();
      default: return abaRevisao();
    }
  }

  function abaIdentificacao() {
    var d = BT.d, id = d.identificacao || (d.identificacao = {});
    var tipos = Object.keys(BT.cfg.tipos).map(function (k) { return [k, BT.cfg.tipos[k].rotuloLongo]; });
    var h = '<div class="bt-painel"><h3>Processo e etapas</h3><div class="bt-grade">' + campo('Tipo de processo', 'tipo', { lista: tipos, largo: true }) + '</div>' +
      '<h4>Etapas executadas</h4><div class="bt-opcoes">' + marca('Qualificação de instalação (QI)', 'etapas.QI') + marca('Qualificação de operação (QO)', 'etapas.QO') + marca('Qualificação de desempenho (QD)', 'etapas.QD') + '</div></div>';
    h += '<div class="bt-painel"><h3>Cliente, unidade e equipamento</h3>';
    if (editavel()) h += '<div class="bt-barra"><input type="text" id="btBuscaCliente" placeholder="Nome ou CNPJ do cliente" style="max-width:360px"><button type="button" class="btn-secondary" data-acao="buscarCliente">Buscar cliente</button></div>' +
      (BT.clientes.length ? '<label class="bt-campo"><span>Escolha o cliente</span><select id="btSelCliente"><option value="">—</option>' + BT.clientes.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome + (c.cnpj ? ' — ' + c.cnpj : '')) + '</option>'; }).join('') + '</select></label>' : '');
    h += '<div class="bt-grade" style="margin-top:10px"><div class="bt-campo largo"><span>Cliente</span><div>' + esc(id.cliente || 'Nenhum cliente escolhido') + (id.cnpj ? ' — CNPJ ' + esc(id.cnpj) : '') + '</div></div>';
    h += '<label class="bt-campo"><span>Unidade</span><select id="btSelUnidade"' + dis() + '><option value="">' + (id.clienteId ? 'Escolha a unidade' : 'Escolha o cliente primeiro') + '</option>' + BT.unidades.map(function (u) { return '<option value="' + esc(u.id) + '"' + (u.id === id.unidadeId ? ' selected' : '') + '>' + esc(u.nome) + '</option>'; }).join('') + (id.unidadeId && !BT.unidades.length ? '<option value="' + esc(id.unidadeId) + '" selected>' + esc(id.unidade || id.unidadeId) + '</option>' : '') + '</select></label>';
    h += '<label class="bt-campo"><span>Equipamento (TAG — tipo — nº de série)</span><select id="btSelEquip"' + dis() + '><option value="">' + (id.unidadeId ? 'Escolha o esterilizador' : 'Escolha a unidade primeiro') + '</option>' + BT.equipamentos.map(function (q) { return '<option value="' + esc(q.id) + '"' + (q.id === id.equipamentoId ? ' selected' : '') + '>' + esc([q.tag || 'sem TAG', q.tipo, q.serie].filter(Boolean).join(' — ')) + '</option>'; }).join('') + (id.equipamentoId && !BT.equipamentos.length ? '<option value="' + esc(id.equipamentoId) + '" selected>' + esc([id.tag, id.tipoEquipamento, id.numeroSerie].filter(Boolean).join(' — ') || id.equipamentoId) + '</option>' : '') + '</select></label></div>';
    h += '<p class="bt-nota">O cliente, a unidade e o equipamento vêm do cadastro, e o relatório só pode ser feito para equipamento do próprio cliente. Se algo não aparecer, cadastre pelos botões abaixo (abrem o cadastro em outra aba; este ensaio continua aqui) e depois toque em "Buscar cliente" de novo. O relatório não cita fabricante nem modelo.</p>' +
      (editavel() ? '<div class="bt-barra"><button type="button" class="btn-secondary bt-mini" data-acao="cadastro" data-tela="clientes">Cadastrar cliente</button><button type="button" class="btn-secondary bt-mini" data-acao="cadastro" data-tela="unidades">Cadastrar unidade</button><button type="button" class="btn-secondary bt-mini" data-acao="cadastro" data-tela="equipamentos">Cadastrar equipamento</button></div>' : '') + '</div>';
    h += '<div class="bt-painel"><h3>Ensaio</h3><div class="bt-grade">' + campo('Data de início (dd/mm/aaaa)', 'identificacao.dataInicio', { ph: 'dd/mm/aaaa' }) + campo('Data de término (dd/mm/aaaa)', 'identificacao.dataFim', { ph: 'em branco se foi um dia só' }) +
      campo('Técnico executor', 'identificacao.tecnicoExecutor') + campo('Acompanhado por (cliente)', 'identificacao.responsavelCliente') +
      campo('Motivo', 'identificacao.motivo', { lista: [['Qualificação inicial', 'Qualificação inicial'], ['Requalificação periódica', 'Requalificação periódica'], ['Requalificação após manutenção', 'Requalificação após manutenção'], ['Requalificação após mudança de local', 'Requalificação após mudança de local'], ['Requalificação após mudança de programa ou carga', 'Requalificação após mudança de programa ou carga']] }) +
      campo('Observações gerais (saem no relatório)', 'observacoes', { area: true, largo: true }) + '</div></div>';
    return h;
  }

  function abaCiclo() {
    var t = BT.cfg.tipos[BT.d.tipo] || {};
    var h = '<div class="bt-painel"><h3>Ciclo programado (especificação do fabricante do equipamento)</h3><p class="bt-nota">Copie os valores da especificação do ciclo do fabricante (manual de operação ou tela de programas). Eles são os limites de aceitação: o sistema não usa valor de norma que não esteja confirmado.</p><div class="bt-grade">' +
      campo('Nome do programa', 'programa.nomePrograma') +
      campo('Origem dos parâmetros', 'programa.fonteParametros', { ph: 'Ex.: manual de operação do fabricante, revisão 3' }) +
      campo('Temperatura programada (°C)', 'programa.temperaturaProgramada', { numero: true }) +
      campo('Tolerância inferior (°C)', 'programa.tolInf', { numero: true, ajuda: 'Ex.: 3 para "−3 °C"' }) +
      campo('Tolerância superior (°C)', 'programa.tolSup', { numero: true }) +
      campo('Tempo de exposição programado (min)', 'programa.tempoExposicaoMin', { numero: true }) +
      campo('Número de pulsos programado', 'programa.pulsosProgramados', { numero: true, ajuda: 'Deixe em branco se o fabricante não declara' }) +
      campo('Pressão de vácuo programada (mbar)', 'programa.pressaoVacuoMbar', { numero: true, ajuda: 'Deixe em branco se não for avaliar o vácuo' }) +
      campo('Tolerância da pressão de vácuo (mbar)', 'programa.tolVacuoMbar', { numero: true }) +
      campo('Diferença máxima entre sensores (°C)', 'programa.uniformidadeMax', { numero: true, ajuda: 'Em branco: informativo' }) +
      campo('Concentração ou umidade mínima', 'programa.concentracaoMin', { numero: true, ajuda: 'Só se o registrador mede' }) +
      campo('Unidade da concentração ou umidade', 'programa.unidadeConcentracao', { ph: 'ppm, mg/L ou %' }) + '</div>' +
      '<h4>Ajuste da identificação dos pulsos</h4><div class="bt-grade">' + campo('Elevação mínima de pressão para contar um pulso (mbar)', 'programa.elevacaoPulsoMbar', { numero: true, ajuda: 'Padrão deste processo: ' + num(t.elevacaoPulsoMbar, 0) + ' mbar. Não é critério de aceitação; altere só com orientação do responsável técnico.' }) + '</div></div>';
    h += '<div class="bt-painel"><h3>Critérios avaliados pelo sistema</h3><div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Código</th><th>Critério</th><th>Etapas</th><th>Fonte</th></tr></thead><tbody>' +
      BT.cfg.criterios.map(function (c) { return '<tr><td>' + esc(c.codigo) + '</td><td>' + esc(c.titulo) + (c.opcional ? ' <span class="bt-chip">opcional</span>' : '') + '</td><td>' + esc(c.etapas.join(', ')) + '</td><td>' + esc(c.fonte) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="bt-nota">Ciclos de desempenho exigidos: ' + BT.cfg.ciclosQDMinimos + '. Regra de decisão: ' + (BT.cfg.regraDecisao === 'BANDA_GUARDA' ? 'limites reduzidos pela incerteza' : 'aceitação simples (a incerteza é declarada)') + '.</p></div>';
    h += '<div class="bt-painel"><h3>Normas de referência deste processo</h3><ul class="bt-lista">' + BT.cfg.normas.filter(function (n) { return n.tipos.indexOf(BT.d.tipo) >= 0; }).map(function (n) {
      return '<li><b>' + esc(n.codigo) + '</b> — ' + esc(n.titulo) + ' ' + (n.confirmada ? '' : '<span class="bt-chip aviso">a confirmar</span> ') + (n.usarNoDocumento ? '' : '<span class="bt-chip">não sai no relatório</span>') + (n.observacao ? '<div class="bt-nota">' + esc(n.observacao) + '</div>' : '') + '</li>';
    }).join('') + '</ul></div>';
    return h;
  }

  function abaInstrumentos() {
    var l = BT.d.instrumentos || (BT.d.instrumentos = []);
    var h = '<div class="bt-painel"><h3>Instrumentos e certificados de calibração</h3><p class="bt-nota">Escolha os registradores e transdutores no cadastro de padrões (Calibração > Padrões de referência). A validade do certificado é conferida com o período do ensaio. Informe a resolução do registrador para o cálculo da incerteza.</p>';
    if (editavel()) h += '<div class="bt-barra"><select id="btSelPadrao" style="max-width:420px"><option value="">' + (BT.padroes.length ? 'Escolha o padrão' : 'Toque em "Carregar padrões"') + '</option>' + BT.padroes.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.tag + ' — ' + p.descricao + ' (validade ' + (p.validade || '—') + ')') + '</option>'; }).join('') + '</select>' +
      (BT.padroes.length ? '<button type="button" class="btn-secondary" data-acao="addPadrao">Acrescentar</button>' : '<button type="button" class="btn-secondary" data-acao="carregarPadroes">Carregar padrões</button>') + '</div>';
    if (!l.length) h += '<p>Nenhum instrumento informado.</p>';
    else h += '<div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Identificação</th><th>Descrição</th><th>Grandeza</th><th>Certificado</th><th>Validade</th><th>U do certificado</th><th>k</th><th>Resolução</th><th></th></tr></thead><tbody>' + l.map(function (x, i) {
      var p = 'instrumentos.' + i + '.';
      return '<tr><td>' + esc(x.tag) + '</td><td>' + esc(x.descricao) + '</td><td>' + celSel(p + 'grandeza', GRANDEZAS) + '</td><td>' + celTxt(p + 'certificado') + '</td><td>' + celTxt(p + 'validade') + '</td><td>' + celTxt(p + 'U') + '</td><td>' + celTxt(p + 'k') + '</td><td>' + celTxt(p + 'resolucao') + '</td><td>' + (editavel() ? '<button type="button" class="btn-secondary bt-mini" data-acao="remover" data-lista="instrumentos" data-i="' + i + '">Remover</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return h + '</div>';
  }
  function celTxt(caminho, ph) { var v = obter(BT.d, caminho); return '<input type="text" data-k="' + esc(caminho) + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + dis() + '>'; }
  function celSel(caminho, opcoes) { var v = obter(BT.d, caminho); return '<select data-k="' + esc(caminho) + '"' + dis() + '>' + opcoes.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v == null ? '' : v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }

  function checklist(lista, base, modelo) {
    var itens = obter(BT.d, base) || [];
    var mapa = {}; itens.forEach(function (x, i) { mapa[x.codigo] = i; });
    modelo.forEach(function (m) { if (mapa[m[0]] === undefined) { itens.push({ codigo: m[0], resposta: '', observacao: '' }); mapa[m[0]] = itens.length - 1; } });
    definir(BT.d, base, itens);
    return '<div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Verificação</th><th>Resposta</th><th>Observação</th></tr></thead><tbody>' + modelo.map(function (m) {
      var i = mapa[m[0]], p = base + '.' + i + '.';
      return '<tr><td>' + esc(m[1]) + '</td><td>' + celSel(p + 'resposta', [['', '—'], ['SIM', 'Sim'], ['NAO', 'Não'], ['NA', 'Não se aplica']]) + '</td><td>' + celTxt(p + 'observacao', 'obrigatória em "Não se aplica"') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function abaQI() {
    if (!BT.d.etapas.QI) return '<div class="bt-painel"><p>A qualificação de instalação (QI) não está marcada em 1. Identificação.</p></div>';
    var t = BT.cfg.tipos[BT.d.tipo];
    return '<div class="bt-painel"><h3>Verificações de instalação</h3><p class="bt-nota">Responda cada item depois de conferir no local. "Não" vira não conformidade no relatório; "Não se aplica" exige observação.</p>' + checklist('qi', 'qi.itens', t.checklistQI) + '</div>';
  }

  function abaQO() {
    if (!BT.d.etapas.QO) return '<div class="bt-painel"><p>A qualificação de operação (QO) não está marcada em 1. Identificação.</p></div>';
    var t = BT.cfg.tipos[BT.d.tipo];
    var h = '<div class="bt-painel"><h3>Verificações funcionais</h3>' + checklist('qo', 'qo.itens', t.checklistQO) + '</div>';
    h += '<div class="bt-painel"><h3>Estanqueidade da câmara</h3>' + marca('Estanqueidade aplicável a este equipamento', 'qo.estanqueidade.aplicavel') +
      (obter(BT.d, 'qo.estanqueidade.aplicavel') ? '<div class="bt-grade">' + campo('Pressão no início da espera (mbar)', 'qo.estanqueidade.pressaoInicial', { numero: true }) + campo('Pressão no fim da espera (mbar)', 'qo.estanqueidade.pressaoFinal', { numero: true }) + campo('Duração da espera (min)', 'qo.estanqueidade.tempoMin', { numero: true }) + campo('Limite declarado pelo fabricante (mbar/min)', 'qo.estanqueidade.limite', { numero: true }) + '</div>' : '') + '</div>';
    h += ciclosDaEtapa('QO');
    return h;
  }

  function abaQD() {
    if (!BT.d.etapas.QD) return '<div class="bt-painel"><p>A qualificação de desempenho (QD) não está marcada em 1. Identificação.</p></div>';
    return ciclosDaEtapa('QD');
  }

  function ciclosDaEtapa(etapa) {
    var ciclos = (BT.d.ciclos || []).map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return String(x.c.etapa) === etapa; });
    var minimo = etapa === 'QD' ? BT.cfg.ciclosQDMinimos : BT.cfg.ciclosQOMinimos;
    var h = '<div class="bt-painel"><h3>Ciclos de ' + (etapa === 'QD' ? 'desempenho (com carga)' : 'operação (câmara vazia)') + '</h3><p class="bt-nota">Mínimo exigido: ' + minimo + ' ciclo(s). Para cada ciclo, envie o arquivo do registrador (completo ou um arquivo por sensor), confira as colunas na prévia e registre os indicadores.</p>';
    h += ciclos.map(function (x) { return cartaoCiclo(x.c, x.i); }).join('');
    if (editavel()) h += '<button type="button" class="btn-primary" data-acao="addCiclo" data-etapa="' + etapa + '">' + (etapa === 'QD' ? 'Acrescentar ciclo de desempenho' : 'Acrescentar ciclo de operação') + '</button>';
    return h + '</div>';
  }

  function cartaoCiclo(c, i) {
    var p = 'ciclos.' + i + '.', a = BT.av && (BT.av.ciclos || []).filter(function (x) { return x.cicloId === c.id; })[0];
    var h = '<div class="bt-ciclo" id="btCiclo_' + esc(c.id) + '"><div class="bt-ciclo-cab"><b>Ciclo ' + esc(c.etapa) + ' nº ' + esc(c.numero || '—') + '</b>' + (a ? chipResultado(a.resultado) : '') + '<span class="bt-esp" style="flex:1"></span>' + (editavel() ? '<button type="button" class="btn-secondary bt-mini" data-acao="removerCiclo" data-i="' + i + '">Remover ciclo</button>' : '') + '</div>';
    h += '<div class="bt-grade">' + campo('Nº do ciclo no equipamento', p + 'numero') + campo('Data do ciclo (dd/mm/aaaa)', p + 'data', { ph: 'dd/mm/aaaa' }) +
      campo('Carga', p + 'carga.tipo', { lista: c.etapa === 'QO' ? [['VAZIA', 'Câmara vazia']] : [['REFERENCIA', 'Carga de referência'], ['REAL', 'Carga de rotina']] }) + campo('Descrição da carga', p + 'carga.descricao') + '</div>';
    // arquivos
    h += '<h4>Arquivos do registrador</h4>';
    (c.arquivos || []).forEach(function (arq, k) {
      var pv = BT.previas[arq.fileId];
      h += '<div class="bt-painel" style="padding:10px 12px"><div class="bt-barra" style="margin:0 0 6px"><b>' + esc(arq.nome) + '</b>' + (arq.leituras ? '<span class="bt-chip">' + arq.leituras + ' leituras</span>' : '') + '<span class="bt-esp"></span>' +
        '<button type="button" class="btn-secondary bt-mini" data-acao="previa" data-i="' + i + '" data-k="' + k + '">' + (pv ? 'Ler de novo com as colunas abaixo' : 'Ver prévia e colunas') + '</button>' + (editavel() ? ' <button type="button" class="btn-secondary bt-mini" data-acao="removerArquivo" data-i="' + i + '" data-k="' + k + '">Remover</button>' : '') + '</div>';
      if (pv) h += previaArquivo(pv, i, k);
      h += '</div>';
    });
    if (editavel()) h += '<label class="bt-campo"><span>Enviar arquivo(s) — planilha (XLSX, XLS) ou texto (CSV, TXT)</span><input type="file" multiple data-acao-arquivo="' + i + '" accept=".xlsx,.xls,.ods,.csv,.txt,.tsv,.dat,.log"></label>';
    // sensores
    var sens = c.sensores || [];
    if (sens.length) {
      h += '<h4>Sensores do ciclo</h4><div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Sensor</th><th>Local</th><th>Posição</th><th>Ativo</th><th>Instrumento</th></tr></thead><tbody>' + sens.map(function (s, k) {
        var q = p + 'sensores.' + k + '.';
        return '<tr><td>' + esc(s.nome) + '</td><td>' + celSel(q + 'papel', [['CARGA', 'Carga'], ['CAMARA', 'Câmara']]) + '</td><td>' + celTxt(q + 'posicao', 'ex.: centro, porta, fundo') + '</td><td><input type="checkbox" data-k="' + esc(q + 'ativo') + '"' + (s.ativo !== false ? ' checked' : '') + dis() + '></td><td>' + celSel(q + 'instrumento', [['', '—']].concat((BT.d.instrumentos || []).map(function (x) { return [x.tag, x.tag]; }))) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="bt-nota">Sensor desmarcado não entra no cálculo; registre o motivo nas observações do ciclo.</p>';
    }
    // janela
    h += '<h4>Janela de exposição</h4><div class="bt-grade">' + campo('Como identificar', p + 'janela.modo', { lista: [['AUTO', 'Automática (pelos dados)'], ['MANUAL', 'Manual (registro do equipamento)']] }) +
      (obter(BT.d, p + 'janela.modo') === 'MANUAL' ? campo('Início (hh:mm:ss)', p + 'janela.inicio', { ph: 'hh:mm:ss' }) + campo('Fim (hh:mm:ss)', p + 'janela.fim', { ph: 'hh:mm:ss' }) + campo('Justificativa', p + 'janela.justificativa', { largo: true, ph: 'Ex.: horários do registro impresso do equipamento' }) : '') + '</div>';
    // indicadores
    h += '<h4>Indicadores químicos</h4>' + tabelaIndicadores(p + 'iqs', [['posicao', 'Posição'], ['tipo', 'Tipo (conforme o fabricante)'], ['lote', 'Lote'], ['validade', 'Validade']], [['', '—'], ['CONFORME', 'Conforme'], ['NAO_CONFORME', 'Não conforme']]);
    if (c.etapa === 'QD') {
      h += '<h4>Indicadores biológicos</h4>' + tabelaIndicadores(p + 'ibs', [['posicao', 'Posição'], ['microrganismo', 'Microrganismo'], ['lote', 'Lote'], ['validade', 'Validade']], [['', '—'], ['PENDENTE', 'Pendente'], ['SEM_CRESCIMENTO', 'Sem crescimento'], ['CRESCIMENTO', 'Com crescimento']]);
      h += '<div class="bt-grade">' + campo('Controle positivo — lote', p + 'controlePositivo.lote') + campo('Controle positivo — validade', p + 'controlePositivo.validade', { ph: 'dd/mm/aaaa' }) + campo('Controle positivo — resultado', p + 'controlePositivo.resultado', { lista: [['', '—'], ['CRESCIMENTO', 'Com crescimento'], ['SEM_CRESCIMENTO', 'Sem crescimento']] }) +
        campo('Incubação (horas)', p + 'incubacao.horas', { numero: true }) + campo('Temperatura de incubação (°C)', p + 'incubacao.temperatura', { numero: true }) + '</div>' + marca('Incubação concluída', p + 'incubacao.concluida');
    }
    h += '<div class="bt-grade" style="margin-top:8px">' + campo('Observações do ciclo', p + 'observacoes', { area: true, largo: true }) + '</div>';
    if (a) h += resultadoCiclo(a);
    return h + '</div>';
  }

  function tabelaIndicadores(base, colunas, resultados) {
    var l = obter(BT.d, base) || [];
    var h = '';
    if (l.length) h += '<div class="bt-rolagem"><table class="bt-t"><thead><tr>' + colunas.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '<th>Resultado</th><th></th></tr></thead><tbody>' + l.map(function (x, i) {
      var q = base + '.' + i + '.';
      return '<tr>' + colunas.map(function (c) { return '<td>' + celTxt(q + c[0], c[0] === 'validade' ? 'dd/mm/aaaa' : '') + '</td>'; }).join('') + '<td>' + celSel(q + 'resultado', resultados) + '</td><td>' + (editavel() ? '<button type="button" class="btn-secondary bt-mini" data-acao="remover" data-lista="' + esc(base) + '" data-i="' + i + '">Remover</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    else h += '<p class="bt-nota">Nenhum indicador registrado.</p>';
    if (editavel()) h += '<button type="button" class="btn-secondary bt-mini" data-acao="addIndicador" data-lista="' + esc(base) + '">Acrescentar</button>';
    return h;
  }

  function previaArquivo(pv, i, k) {
    var arq = BT.d.ciclos[i].arquivos[k];
    var cols = arq.colunas || pv.colunas || [];
    var h = '';
    if (pv.erros && pv.erros.length) h += '<div class="bt-msg erro" style="display:block">' + esc(pv.erros.join('\n')) + '</div>';
    if (pv.avisos && pv.avisos.length) h += '<div class="bt-msg aviso" style="display:block">' + esc(pv.avisos.join('\n')) + '</div>';
    if (pv.resumo) h += '<p class="bt-nota">' + esc(pv.resumo.leituras + ' leituras de ' + pv.resumo.inicio + ' a ' + pv.resumo.fim + '; intervalo típico de ' + num(pv.resumo.intervaloS, 0) + ' s; sensores: ' + pv.resumo.sensores.join(', ') + (pv.resumo.temPressao ? '; com pressão' : '; sem pressão') + '.') + '</p>';
    h += '<div class="bt-grade" style="margin:6px 0">' + campo('Formato da data no arquivo', 'ciclos.' + i + '.arquivos.' + k + '.estiloData', { lista: [['AUTO', 'Detectar'], ['BR', 'Brasil (dd/mm/aaaa)'], ['US', 'Americano (mm/dd/aaaa)']] }) +
      campo('Tempo decorrido em', 'ciclos.' + i + '.arquivos.' + k + '.unidadeDecorrido', { lista: [['S', 'segundos'], ['MIN', 'minutos']] }) +
      campo('Hora de início (só com tempo decorrido)', 'ciclos.' + i + '.arquivos.' + k + '.horaBase', { ph: 'hh:mm:ss' }) + '</div>';
    h += '<div class="bt-rolagem"><table class="bt-t bt-previa"><thead><tr>' + cols.map(function (c, ci) {
      var q = 'ciclos.' + i + '.arquivos.' + k + '.colunas.' + ci + '.';
      return '<th>' + esc(c.nome) + '<br>' + celSel(q + 'papel', PAPEIS_COL) + (c.papel === 'PRESSAO' ? celSel(q + 'unidade', UNID_P) : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + (pv.previa || []).slice(1).map(function (l) { return '<tr>' + cols.map(function (c, ci) { return '<td>' + esc(l[ci]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    return h;
  }

  function resultadoCiclo(a) {
    var h = '<h4>Resultado calculado</h4>';
    if (a.travas && a.travas.length) h += '<div class="bt-msg aviso" style="display:block">' + esc(a.travas.join('\n')) + '</div>';
    if (a.janela) h += '<p class="bt-nota">Exposição de ' + esc(a.janela.inicioTxt) + ' a ' + esc(a.janela.fimTxt) + ' (' + num(a.janela.duracaoMin, 2) + ' min). ' + (a.pressao ? 'Pressão mínima ' + num(a.pressao.minCiclo, 2) + ' mbar; ' + a.pressao.pulsosJanela + ' pulso(s) na exposição.' : 'Sem pressão no arquivo.') + '</p>';
    if (a.criterios && a.criterios.length) h += '<div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Critério</th><th>Requisito</th><th>Obtido</th><th>Situação</th></tr></thead><tbody>' + a.criterios.map(function (c) { return '<tr><td>' + esc(c.codigo + ' ' + c.titulo) + '</td><td>' + esc(c.requisito) + '</td><td>' + esc(c.obtido) + '</td><td>' + (c.conforme === true ? '<span class="bt-chip ok">Conforme</span>' : c.conforme === false ? '<span class="bt-chip nok">Não conforme</span>' : '<span class="bt-chip">Informativo</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var g = BT.graficos[a.cicloId];
    if (g && g.temperatura) h += '<div class="bt-grafico">' + g.temperatura + '</div>';
    if (g && g.pressao) h += '<div class="bt-grafico">' + g.pressao + '</div>';
    return h;
  }

  function abaResultado() {
    var h = '<div class="bt-painel"><h3>Resultado do ensaio</h3><div class="bt-barra"><button type="button" class="btn-primary" data-acao="calcular">Calcular resultado</button>' + (editavel() ? '<button type="button" class="btn-secondary" data-acao="redigir">Redigir textos</button>' : '') + '</div>';
    var av = BT.av;
    if (!av) h += '<p class="bt-nota">Toque em "Calcular resultado" para ler os arquivos, aplicar os critérios e ver o que falta.</p>';
    else {
      var cls = av.resultado === 'CONFORME' ? 'ok' : (av.resultado === 'NAO_CONFORME' ? 'nok' : 'pend');
      h += '<div class="bt-resultado ' + cls + '"><div class="bt-nota">Resultado calculado pelo sistema</div><div class="v">' + (av.resultado === 'CONFORME' ? 'Conforme' : av.resultado === 'NAO_CONFORME' ? 'Não conforme' : 'Ainda sem resultado') + '</div><div>' + esc(av.resumo) + '</div></div>';
      if (av.travas.length) h += '<h4>O que falta (impede a emissão)</h4><ul class="bt-lista">' + av.travas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      if (av.avisos.length) h += '<h4>Avisos (confira)</h4><ul class="bt-lista">' + av.avisos.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      var todos = (av.criteriosEnsaio || []).map(function (c) { return [c.etapa, c]; });
      (av.ciclos || []).forEach(function (a) { a.criterios.forEach(function (c) { todos.push([a.rotulo, c]); }); });
      if (todos.length) h += '<h4>Critérios</h4><div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Etapa ou ciclo</th><th>Critério</th><th>Obtido</th><th>Situação</th></tr></thead><tbody>' + todos.map(function (x) { var c = x[1]; return '<tr><td>' + esc(x[0]) + '</td><td>' + esc(c.codigo + ' ' + c.titulo) + '</td><td>' + esc(c.obtido) + '</td><td>' + (c.conforme === true ? '<span class="bt-chip ok">Conforme</span>' : c.conforme === false ? '<span class="bt-chip nok">Não conforme</span>' : '<span class="bt-chip">Informativo</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (av.incertezas && av.incertezas.temperatura) h += '<p class="bt-nota">Incerteza expandida da temperatura: ' + num(av.incertezas.temperatura.U, 2) + ' °C (k = 2). Tempo de exposição: ' + num(av.incertezas.tempo.Umin, 2) + ' min (k = 2).</p>';
    }
    h += '</div>';
    var t = BT.d.textos || (BT.d.textos = {});
    h += '<div class="bt-painel"><h3>Textos do relatório</h3><p class="bt-nota">"Redigir textos" monta as análises e as conclusões a partir do resultado calculado. O texto é conferido: número que não está nos resultados, norma fora da lista ou resultado diferente do calculado fazem o sistema usar o texto padrão. Revise e ajuste antes de enviar para revisão.</p>' + (BT.textosAviso ? '<div class="bt-msg aviso" style="display:block">' + esc(BT.textosAviso) + '</div>' : '');
    SECOES.forEach(function (s) { if (s[2] && !BT.d.etapas[s[2]]) return; h += campo(s[1], 'textos.' + s[0], { area: true, alto: true, largo: true }); });
    return h + '</div>';
  }

  function abaRevisao() {
    var e = BT.e, h = '<div class="bt-painel"><h3>Situação: ' + esc(e.statusRotulo || e.status) + '</h3>';
    if (!e.id) return h + '<p>Salve o ensaio primeiro.</p></div>';
    h += '<div class="bt-barra"><button type="button" class="btn-secondary" data-acao="previaDoc">Ver prévia do relatório</button>';
    if (e.status === 'RASCUNHO' && BT.cfg.podeEditar) h += '<button type="button" class="btn-primary" data-acao="enviarRevisao">Enviar para revisão</button>';
    if (e.status === 'APROVADO' && BT.cfg.podeEditar) h += '<button type="button" class="btn-primary" data-acao="emitir">Emitir relatório</button>';
    if (e.status === 'EMITIDO') {
      if (e.linkPdf) h += '<a class="btn-secondary" href="' + esc(e.linkPdf) + '" target="_blank" rel="noopener">Abrir PDF</a>';
      if (e.linkHtml) h += '<a class="btn-secondary" href="' + esc(e.linkHtml) + '" target="_blank" rel="noopener">Abrir HTML (A4)</a>';
      if (e.pastaUrl) h += '<a class="btn-secondary" href="' + esc(e.pastaUrl) + '" target="_blank" rel="noopener">Pasta do cliente</a>';
      if (e.pdfId) h += '<button type="button" class="btn-primary" data-acao="enviarCliente">Enviar ao cliente</button>';
      if (BT.cfg.podeEditar) h += '<button type="button" class="btn-secondary" data-acao="novaRevisao">Nova revisão</button>';
    }
    h += '</div>';
    if (e.status === 'RASCUNHO') h += '<p class="bt-nota">Antes de enviar: calcule o resultado (7. Resultado e textos), resolva o que falta, redija e revise os textos e salve. O responsável técnico revisa e aprova; só então o relatório pode ser emitido.</p>';
    if ((e.status === 'EM_REVISAO' || e.status === 'APROVADO') && BT.cfg.podeAprovar) {
      var mesmo = BT.cfg.exigirAprovadorDiferente && e.elaboradoPorId && e.elaboradoPorId === BT.cfg.userId;
      h += '<h4>Revisão do responsável técnico</h4>' + (mesmo ? '<p class="bt-msg aviso" style="display:block">Você elaborou este ensaio. A aprovação precisa ser de outro responsável técnico.</p>' : '');
      h += '<div class="bt-grade"><label class="bt-campo"><span>Responsável técnico que assina</span><select id="btRt">' + (BT.cfg.responsaveisTecnicos || []).map(function (r) { return '<option value="' + esc(r.nome) + '">' + esc(r.nome + ' — ' + r.cargo) + '</option>'; }).join('') + '</select></label>' +
        '<label class="bt-campo largo"><span>Parecer da revisão (o que foi conferido, ou o que corrigir)</span><textarea id="btParecer"></textarea></label></div>' +
        '<div class="bt-barra">' + (e.status === 'EM_REVISAO' ? '<button type="button" class="btn-primary" data-acao="aprovar"' + (mesmo ? ' disabled' : '') + '>Aprovar</button>' : '') + '<button type="button" class="btn-secondary" data-acao="devolver"' + (mesmo ? ' disabled' : '') + '>Devolver ao técnico</button></div>';
    } else if (e.status === 'EM_REVISAO') h += '<p class="bt-nota">Aguardando a revisão do responsável técnico (Administrador, Diretoria ou Gestor).</p>';
    if (e.aprovadoRt) h += '<p>Aprovado por ' + esc(e.aprovadoPor) + '; assina: ' + esc(e.aprovadoRt) + '.' + (e.parecerRt ? ' Parecer: ' + esc(e.parecerRt) : '') + '</p>';
    h += '<h4>Histórico</h4>' + ((e.historico || []).length ? '<div class="bt-rolagem"><table class="bt-t"><thead><tr><th>Quando</th><th>Ação</th><th>Quem</th><th>Detalhe</th></tr></thead><tbody>' + e.historico.map(function (x) { return '<tr><td style="white-space:nowrap">' + esc(x.quando) + '</td><td>' + esc(x.acao) + '</td><td>' + esc(x.usuario) + '</td><td>' + esc(x.detalhe) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="bt-nota">Sem registros.</p>');
    return h + '</div>';
  }

  /* ---------------- eventos ---------------- */
  function marcarSujo() {
    BT.sujo = true;
    if (!$('btSujo')) { var b = document.querySelector('#btCorpo .bt-barra'); if (b) { var s = document.createElement('span'); s.className = 'bt-chip aviso'; s.id = 'btSujo'; s.textContent = 'Alterações não salvas'; b.insertBefore(s, b.querySelector('.bt-esp')); } }
  }

  function aoMudar(ev) {
    var el = ev.target;
    if (el.getAttribute('data-acao-arquivo') !== null) { enviarArquivos(Number(el.getAttribute('data-acao-arquivo')), el.files); el.value = ''; return; }
    if (el.id === 'btSelCliente') return escolherCliente(el.value);
    if (el.id === 'btSelUnidade') return escolherUnidade(el.value);
    if (el.id === 'btSelEquip') return escolherEquipamento(el.value);
    if (el.id === 'btFiltroStatus') { BT.filtroStatus = el.value; return; }
    var k = el.getAttribute('data-k');
    if (!k || !BT.d) return;
    var v = el.type === 'checkbox' ? el.checked : el.value;
    definir(BT.d, k, v);
    marcarSujo();
    if (/\.colunas\.\d+\.papel$/.test(k)) { var cols = obter(BT.d, k.replace(/\.\d+\.papel$/, '')); var ix = Number(k.match(/\.colunas\.(\d+)\.papel$/)[1]); if (v === 'PRESSAO' && !cols[ix].unidade) cols[ix].unidade = 'MBAR'; redesenharAba(); return; }
    if (/^(tipo|etapas\.|qo\.estanqueidade\.aplicavel|ciclos\.\d+\.janela\.modo)/.test(k)) redesenharAba();
  }

  function redesenharAba() { var y = window.scrollY; var a = $('btAba'); if (a) a.innerHTML = conteudoAba(); window.scrollTo(0, y); }

  function aoClicar(ev) {
    var b = ev.target.closest('[data-acao]');
    if (!b || b.disabled) return;
    var acao = b.getAttribute('data-acao');
    if (acao === 'novo') return novoEnsaio();
    if (acao === 'buscar') { BT.filtro = ($('btFiltro') || {}).value || ''; return listar(); }
    if (acao === 'abrir') return abrirEnsaio(b.getAttribute('data-id'), 1);
    if (acao === 'lista') { if (BT.sujo && editavel() && !confirm('Há alterações não salvas. Voltar à lista sem salvar?')) return; return listar(); }
    if (acao === 'aba') { BT.aba = Number(b.getAttribute('data-aba')); desenharEditor(); if (BT.aba === 1 && BT.d.identificacao.clienteId && !BT.unidades.length) carregarUnidades(true); window.scrollTo(0, 0); return; }
    if (acao === 'salvar') return salvar();
    if (acao === 'buscarCliente') return buscarCliente();
    if (acao === 'cadastro') { try { window.open(String(window.location.href || '').replace(/[?#].*$/, '') + '?tela=' + encodeURIComponent(b.getAttribute('data-tela')), '_blank'); } catch (eCad) {} return msg('info', 'O cadastro abriu em outra aba. Depois de salvar, volte para esta aba e toque em "Buscar cliente" de novo: o ensaio continua como está.'); }
    if (acao === 'carregarPadroes') return api('apiListarPadroes', {}, function (r) { BT.padroes = r.items || []; msg('', BT.padroes.length ? '' : 'Nenhum padrão ativo no cadastro.'); redesenharAba(); });
    if (acao === 'addPadrao') return addPadrao();
    if (acao === 'remover') { var l = obter(BT.d, b.getAttribute('data-lista')); l.splice(Number(b.getAttribute('data-i')), 1); marcarSujo(); return redesenharAba(); }
    if (acao === 'addIndicador') { var base = b.getAttribute('data-lista'); var l2 = obter(BT.d, base) || []; var micro = /ibs$/.test(base) ? (BT.cfg.tipos[BT.d.tipo] || {}).microrganismoSugerido || '' : ''; l2.push(micro ? { microrganismo: micro, resultado: 'PENDENTE' } : {}); definir(BT.d, base, l2); marcarSujo(); return redesenharAba(); }
    if (acao === 'addCiclo') return addCiclo(b.getAttribute('data-etapa'));
    if (acao === 'removerCiclo') { if (!confirm('Remover este ciclo e os arquivos ligados a ele deste ensaio? Os arquivos continuam guardados na pasta do módulo.')) return; BT.d.ciclos.splice(Number(b.getAttribute('data-i')), 1); marcarSujo(); return redesenharAba(); }
    if (acao === 'removerArquivo') { var c = BT.d.ciclos[Number(b.getAttribute('data-i'))]; c.arquivos.splice(Number(b.getAttribute('data-k')), 1); atualizarSensores(c); marcarSujo(); return redesenharAba(); }
    if (acao === 'previa') return lerArquivo(Number(b.getAttribute('data-i')), Number(b.getAttribute('data-k')));
    if (acao === 'calcular') return calcular(false);
    if (acao === 'redigir') return redigir();
    if (acao === 'previaDoc') return previaDoc();
    if (acao === 'enviarRevisao') return fluxo('apiEnviarRevisao', {}, 'Enviando para revisão…', 'Enviado para revisão do responsável técnico.');
    if (acao === 'aprovar') return fluxo('apiAprovar', { rtNome: ($('btRt') || {}).value, parecer: ($('btParecer') || {}).value }, 'Conferindo e aprovando…', 'Ensaio aprovado. Agora o relatório pode ser emitido.');
    if (acao === 'devolver') return fluxo('apiDevolver', { motivo: ($('btParecer') || {}).value }, 'Devolvendo…', 'Ensaio devolvido ao técnico, com o seu parecer.');
    if (acao === 'emitir') return emitir();
    if (acao === 'enviarCliente') { if (window.SGO_EnviarDoc && SGO_EnviarDoc.abrir) SGO_EnviarDoc.abrir({ arquivoId: BT.e.pdfId, htmlId: BT.e.htmlId, dica: { clienteId: BT.d.identificacao.clienteId, numero: BT.e.numero, titulo: 'Relatório de qualificação ' + BT.e.numero } }); else msg('aviso', 'A janela "Enviar documento" não está disponível nesta tela. Abra o Arquivo de documentos e use "Enviar".'); return; }
    if (acao === 'novaRevisao') { if (!confirm('Criar uma nova revisão deste ensaio? O relatório emitido continua guardado; a nova revisão começa como rascunho com os mesmos dados.')) return; return api('apiNovaRevisao', { id: BT.e.id }, function (r) { msg('ok', 'Nova revisão ' + r.revisao + ' criada como rascunho.'); abrirEnsaio(r.id, 1); }); }
  }

  /* ---------------- ações ---------------- */
  function salvar(depois) {
    if (!editavel()) return;
    api('apiSalvar', { id: BT.e.id || '', versaoDados: BT.e.versaoDados || 0, dados: BT.d }, function (r) {
      var novo = !BT.e.id;
      BT.e.id = r.id; BT.e.versaoDados = r.versaoDados; BT.e.status = r.status; BT.sujo = false;
      msg(r.aviso ? 'aviso' : 'ok', r.aviso || ('Ensaio salvo' + (novo ? '. Continue preenchendo as próximas abas.' : '.')));
      if (depois) depois(); else abrirEnsaioSilencioso();
    }, { espera: 'Salvando…' });
  }
  function abrirEnsaioSilencioso() {
    api('apiObter', { id: BT.e.id }, function (r) { var lk = (r.arquivos && r.arquivos.emitido && r.arquivos.emitido.links) || {}; r.linkPdf = lk.pdf; r.linkHtml = lk.html; r.pastaUrl = lk.pasta; r.pdfId = lk.idPdf; r.htmlId = lk.idHtml; BT.e = r; BT.d = r.dados; desenharEditor(); }, { paralelo: true });
  }

  function buscarCliente() {
    var t = ($('btBuscaCliente') || {}).value || '';
    if (t.trim().length < 2) { msg('aviso', 'Digite pelo menos 2 letras do nome ou do CNPJ do cliente.'); return; }
    api('apiPesquisarClientes', { termo: t }, function (r) { BT.clientes = r.items || []; msg(BT.clientes.length ? 'info' : 'aviso', BT.clientes.length ? 'Escolha o cliente na lista abaixo.' : 'Nenhum cliente ativo encontrado com "' + t + '". Confira a grafia ou cadastre em Cadastros > Clientes.'); redesenharAba(); });
  }
  function escolherCliente(id) {
    var c = BT.clientes.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var i = BT.d.identificacao;
    i.clienteId = c.id; i.cliente = c.razao || c.nome; i.cnpj = c.cnpj; i.unidadeId = ''; i.unidade = ''; i.equipamentoId = ''; i.tag = '';
    BT.unidades = []; BT.equipamentos = []; marcarSujo();
    carregarUnidades();
  }
  function carregarUnidades(silencioso) {
    api('apiListarUnidades', { clienteId: BT.d.identificacao.clienteId }, function (r) {
      BT.unidades = r.items || [];
      if (!silencioso) msg(BT.unidades.length ? '' : 'aviso', BT.unidades.length ? '' : 'Este cliente não tem unidade ativa. Cadastre em Cadastros > Unidades e volte aqui.');
      if (BT.d.identificacao.unidadeId) carregarEquipamentos(true); else redesenharAba();
    }, { paralelo: !!silencioso });
  }
  function escolherUnidade(id) {
    var u = BT.unidades.filter(function (x) { return x.id === id; })[0];
    var i = BT.d.identificacao;
    i.unidadeId = id; i.unidade = u ? u.nome : ''; i.equipamentoId = ''; i.tag = '';
    marcarSujo(); carregarEquipamentos();
  }
  function carregarEquipamentos(silencioso) {
    api('apiListarEquipamentos', { clienteId: BT.d.identificacao.clienteId, unidadeId: BT.d.identificacao.unidadeId }, function (r) {
      BT.equipamentos = r.items || [];
      if (!silencioso) msg(BT.equipamentos.length ? '' : 'aviso', BT.equipamentos.length ? '' : 'Nenhum equipamento ativo nesta unidade. Cadastre o esterilizador em Cadastros > Equipamentos e volte aqui.');
      redesenharAba();
    }, { paralelo: !!silencioso });
  }
  function escolherEquipamento(id) {
    var q = BT.equipamentos.filter(function (x) { return x.id === id; })[0];
    var i = BT.d.identificacao;
    i.equipamentoId = id; i.tag = q ? q.tag : ''; i.numeroSerie = q ? q.serie : ''; i.tipoEquipamento = q ? q.tipo : '';
    marcarSujo();
  }

  function addPadrao() {
    var id = ($('btSelPadrao') || {}).value;
    var p = BT.padroes.filter(function (x) { return x.id === id; })[0];
    if (!p) { msg('aviso', 'Escolha um padrão na lista.'); return; }
    var g = /press|vacu|mbar|kpa/i.test(p.descricao) ? 'PRESSAO' : (/umid/i.test(p.descricao) ? 'UMIDADE' : 'TEMPERATURA');
    BT.d.instrumentos.push({ padraoId: p.id, tag: p.tag, descricao: p.descricao, certificado: p.certificado, validade: p.validade, U: p.U, k: p.k || '2', resolucao: '', grandeza: g });
    marcarSujo(); redesenharAba();
  }

  function addCiclo(etapa) {
    var n = (BT.d.ciclos || []).filter(function (c) { return c.etapa === etapa; }).length + 1;
    BT.d.ciclos.push({ id: novoId(), etapa: etapa, numero: String(n), data: BT.d.identificacao.dataInicio || '', carga: { tipo: etapa === 'QO' ? 'VAZIA' : 'REFERENCIA', descricao: '' }, arquivos: [], sensores: [], janela: { modo: 'AUTO' }, iqs: [], ibs: [], controlePositivo: {}, incubacao: {} });
    marcarSujo(); redesenharAba();
  }

  function enviarArquivos(i, files) {
    var lista = Array.prototype.slice.call(files || []);
    if (!lista.length) return;
    var c = BT.d.ciclos[i];
    if ((c.arquivos || []).length + lista.length > BT.cfg.leitura.maxArquivos) { msg('aviso', 'No máximo ' + BT.cfg.leitura.maxArquivos + ' arquivos por ciclo.'); return; }
    var proximo = function () {
      var f = lista.shift();
      if (!f) { atualizarSensores(c); marcarSujo(); redesenharAba(); msg('ok', 'Arquivo(s) lido(s). Confira a prévia e as colunas; depois toque em "Salvar".'); return; }
      if (f.size > 15 * 1024 * 1024) { msg('erro', 'O arquivo "' + f.name + '" tem mais de 15 MB. Exporte do registrador só o período do ciclo e envie de novo.'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var b64 = String(rd.result).split(',')[1] || '';
        api('apiUploadArquivo', { fileName: f.name, mimeType: f.type || 'application/octet-stream', base64: b64 }, function (r) {
          api('apiLerArquivo', { fileId: r.fileId, dataBase: c.data }, function (pv) {
            c.arquivos.push({ fileId: r.fileId, nome: r.nome, colunas: pv.colunas, linhaCabecalho: pv.linhaCabecalho, estiloData: 'AUTO', unidadeDecorrido: 'S', horaBase: '', leituras: pv.resumo ? pv.resumo.leituras : 0, sensores: pv.resumo ? pv.resumo.sensores : [] });
            BT.previas[r.fileId] = pv;
            proximo();
          }, { espera: 'Lendo "' + f.name + '"…' });
        }, { espera: 'Enviando "' + f.name + '"…' });
      };
      rd.onerror = function () { msg('erro', 'Não foi possível ler o arquivo "' + f.name + '" no seu computador. Tente de novo.'); };
      rd.readAsDataURL(f);
    };
    proximo();
  }

  function lerArquivo(i, k) {
    var c = BT.d.ciclos[i], a = c.arquivos[k];
    api('apiLerArquivo', { fileId: a.fileId, colunas: BT.previas[a.fileId] ? a.colunas : null, linhaCabecalho: a.linhaCabecalho, estiloData: a.estiloData, dataBase: c.data, horaBase: a.horaBase, unidadeDecorrido: a.unidadeDecorrido }, function (pv) {
      BT.previas[a.fileId] = pv; a.colunas = pv.colunas; a.leituras = pv.resumo ? pv.resumo.leituras : 0; a.sensores = pv.resumo ? pv.resumo.sensores : [];
      atualizarSensores(c); marcarSujo(); redesenharAba(); msg(pv.erros && pv.erros.length ? 'erro' : 'ok', pv.erros && pv.erros.length ? pv.erros.join('\n') : 'Prévia atualizada.');
    }, { espera: 'Lendo o arquivo…' });
  }

  /** Lista de sensores do ciclo com os nomes na mesma ordem e com a mesma regra de nome único do servidor. */
  function atualizarSensores(c) {
    var vistos = {}, nomes = [];
    (c.arquivos || []).forEach(function (a) { (a.sensores || []).forEach(function (n) { var x = n, k = 2; while (vistos[x]) { x = n + ' (' + k + ')'; k++; } vistos[x] = 1; nomes.push(x); }); });
    var antigos = {}; (c.sensores || []).forEach(function (s) { antigos[s.nome] = s; });
    c.sensores = nomes.map(function (n) { return antigos[n] || { nome: n, papel: c.etapa === 'QO' ? 'CAMARA' : 'CARGA', posicao: '', ativo: true, instrumento: '' }; });
  }

  function calcular(silencioso) {
    api('apiCalcular', { dados: BT.d }, function (r) {
      BT.av = r.avaliacao; BT.graficos = r.graficos || {};
      Object.keys(r.leituras || {}).forEach(function (fid) { (BT.d.ciclos || []).forEach(function (c) { (c.arquivos || []).forEach(function (a) { if (a.fileId === fid) a.leituras = r.leituras[fid]; }); }); });
      if (!silencioso) msg(BT.av.travas.length ? 'aviso' : 'ok', BT.av.travas.length ? 'Resultado calculado com ' + BT.av.travas.length + ' pendência(s). Veja "O que falta" abaixo.' : 'Resultado calculado: ' + (BT.av.resultado === 'CONFORME' ? 'conforme' : 'não conforme') + '.');
      redesenharAba();
    }, silencioso ? { paralelo: true } : { espera: 'Lendo os arquivos e calculando… pode levar até um minuto.' });
  }

  function redigir() {
    api('apiRedigir', { dados: BT.d }, function (r) {
      BT.av = r.avaliacao || BT.av;
      if (r.bloqueado) { BT.textosAviso = r.aviso; msg('aviso', r.aviso); redesenharAba(); return; }
      BT.d.textos = r.textos || {}; BT.textosAviso = r.aviso || (r.origem === 'IA' ? '' : '');
      marcarSujo(); msg(r.aviso ? 'aviso' : 'ok', r.aviso || 'Textos redigidos e conferidos. Revise e salve.'); redesenharAba();
    }, { espera: 'Redigindo e conferindo os textos… pode levar até dois minutos.' });
  }

  function abrirHtml(html) {
    var w = window.open('', '_blank');
    if (!w) { msg('aviso', 'O navegador bloqueou a nova aba. Permita janelas deste site e tente de novo.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  function previaDoc() {
    var go = function () { api('apiPrevia', { id: BT.e.id, dados: editavel() ? BT.d : null }, function (r) { msg('ok', 'A prévia abriu em outra aba.'); abrirHtml(r.html); }, { espera: 'Montando a prévia…' }); };
    if (BT.sujo && editavel()) salvar(go); else go();
  }

  function fluxo(fn, extra, espera, ok) {
    var go = function () {
      var p = { id: BT.e.id }; Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
      api(fn, p, function (r) { msg('ok', ok + (r.avisos && r.avisos.length ? '\nAvisos: ' + r.avisos.join('\n') : '')); abrirEnsaio(BT.e.id, 8); }, { espera: espera });
    };
    if (BT.sujo && editavel()) salvar(go); else go();
  }

  function emitir() {
    if (!confirm('Emitir o relatório? Depois de emitido, o ensaio não pode mais ser alterado (correções viram nova revisão).')) return;
    api('apiEmitir', { id: BT.e.id }, function (r) {
      msg('ok', 'Relatório ' + r.numero + ' emitido e salvo na pasta do cliente (PDF e HTML A4).' + (r.avisoArquivo ? '\n' + r.avisoArquivo : '') + '\nUse "Enviar ao cliente" para mandar por e-mail ou WhatsApp.');
      if (r.html) abrirHtml(r.html);
      abrirEnsaio(BT.e.id, 8);
    }, { espera: 'Emitindo: conferindo os dados, gerando o PDF e salvando na pasta do cliente…' });
  }
}
