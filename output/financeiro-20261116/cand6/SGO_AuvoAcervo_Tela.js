/****************************************************
 * SGO_AuvoAcervo_Tela.js
 * Parte "Acervo do Auvo" da tela Integração Auvo (21/10/2026).
 * Servida por AuvoAcervo_obterConteudo (SGO_AuvoAcervo.js) só para Administrador
 * e Diretoria; montada por JS_Auvo.html no topo da tela, depois do painel do Auvo.
 * Sem barra invertida e sem crase dentro do texto (vai num template literal).
 ****************************************************/
var AUVO_ACERVO_CONTEUDO = `<style>
#acvCard { background: var(--bc-surface, #fff); border: 1px solid var(--bc-line, #d9dee5); border-radius: 6px; padding: 14px 18px; margin: 0 0 14px; color: var(--bc-text, #1f2933); font-family: var(--bc-sans, inherit); }
#acvCard h3 { margin: 0; font-size: 16px; font-weight: 800; }
#acvCard .acv-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
#acvCard .acv-sub { margin: 6px 0 12px; color: var(--bc-text-3, #5f6b7a); font-size: 13px; line-height: 1.45; }
#acvCard .acv-linha { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
#acvCard label { font-size: 13px; display: inline-flex; gap: 6px; align-items: center; }
#acvCard input { border: 1px solid var(--bc-line-2, #c5ccd6); border-radius: 4px; padding: 6px 8px; font-size: 13px; background: #fff; color: inherit; }
#acvCard .acv-btn { border: 1px solid var(--bc-action, #0b6e4f); background: var(--bc-action, #0b6e4f); color: #fff; border-radius: 4px; padding: 7px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
#acvCard .acv-btn.sec { background: #fff; color: var(--bc-action, #0b6e4f); }
#acvCard .acv-btn[disabled] { opacity: .45; cursor: not-allowed; }
#acvCard .acv-caixa { border-radius: 4px; padding: 9px 12px; font-size: 13px; margin: 8px 0; line-height: 1.45; }
#acvCard .acv-caixa.info { background: var(--bc-info-bg, #eaf2fb); }
#acvCard .acv-caixa.ok { background: var(--bc-action-bg, #e6f4ee); }
#acvCard .acv-caixa.aviso { background: var(--bc-warn-bg, #fff4e0); }
#acvCard .acv-caixa.erro { background: var(--bc-danger-bg, #fdecec); }
#acvCard .acv-grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 8px 0; }
#acvCard .acv-num { border: 1px solid var(--bc-line, #d9dee5); border-radius: 4px; padding: 8px 10px; }
#acvCard .acv-num b { display: block; font-size: 18px; }
#acvCard .acv-num span { font-size: 12px; color: var(--bc-text-3, #5f6b7a); }
#acvCard table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
#acvCard th, #acvCard td { border-bottom: 1px solid var(--bc-line, #e3e7ec); padding: 5px 6px; text-align: left; vertical-align: top; }
#acvCard td.n, #acvCard th.n { text-align: right; white-space: nowrap; }
#acvCard details { margin-top: 8px; }
#acvCard summary { cursor: pointer; font-weight: 700; font-size: 13px; padding: 4px 0; }
#acvCard .acv-tabela { overflow-x: auto; }
#acvCard pre { white-space: pre-wrap; word-break: break-all; max-height: 260px; overflow: auto; background: var(--bc-surface-2, #f5f7f9); padding: 8px; font-size: 11.5px; border-radius: 4px; }
@media (max-width: 640px) { #acvCard { padding: 12px; } #acvCard .acv-btn { flex: 1 1 100%; } }
</style>
<script>
var ACV = { timer: null, ultimo: null };

function acv_esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function acv_n(v) { return Number(v || 0).toLocaleString('pt-BR'); }
function acv_bytes(b) {
  b = Number(b || 0);
  if (b >= 1073741824) return (b / 1073741824).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' GB';
  if (b >= 1048576) return (b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';
  if (b >= 1024) return (b / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' KB';
  return acv_n(b) + ' bytes';
}
function acv_data(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR');
}
function acv_mes(m) { return m ? String(m).slice(5, 7) + '/' + String(m).slice(0, 4) : ''; }

var ACV_FASES = {
  CATALOGOS: 'Listas de apoio (usuários, tipos de tarefa, questionários, clientes, equipamentos e equipes)',
  TAREFAS: 'Leitura das tarefas, mês a mês',
  VERIFICAR: 'Segunda passada (pega o que entrou ou mudou durante a cópia)',
  ARQUIVOS: 'Cópia das fotos, assinaturas e anexos',
  CONFERENCIA: 'Conferência dos arquivos copiados (impressão digital)',
  FIM: 'Fechando o relatório'
};
var ACV_SITUACAO = { RODANDO: 'Em andamento', PAUSADO: 'Pausada', CONCLUIDO: 'Concluída', ERRO: 'Parada por erro', PARADO: 'Não iniciada' };
var ACV_TIPOS = { FOTO: 'Fotos', ASSINATURA_QUESTIONARIO: 'Assinaturas do questionário', ASSINATURA_TAREFA: 'Assinaturas da tarefa', ANEXO: 'Anexos' };

function acv_chamar(fn, payload) {
  return new Promise(function (ok, falhou) {
    google.script.run
      .withSuccessHandler(ok)
      .withFailureHandler(function (e) { falhou(e && e.message ? e.message : String(e)); })
      .AuvoAcervo_apiDispatch({ sessionId: SGO_getSessionId(), fn: fn, payload: payload || {} });
  });
}

function acv_msg(tipo, texto) {
  var el = document.getElementById('acvMsg');
  if (el) el.innerHTML = texto ? '<div class="acv-caixa ' + tipo + '">' + texto + '</div>' : '';
}

function AuvoAcervo_montarNaTela_() {
  var casa = document.getElementById('tplAuvo_viewPainel') || document.getElementById('tplAuvoContainer');
  if (!casa || document.getElementById('acvCard')) return;
  var div = document.createElement('div');
  div.innerHTML =
    '<div id="acvCard">' +
      '<div class="acv-cab"><h3>Acervo do Auvo (cópia de segurança)</h3>' +
        '<button type="button" class="acv-btn sec" onclick="acv_ajuda()">Como usar esta parte</button></div>' +
      '<p class="acv-sub">Copia para o servidor do SGO+ tudo o que está no Auvo: o registro completo de cada tarefa, as fotos, as assinaturas e os anexos. ' +
        'Só lê o Auvo: não altera nada lá nem nos atendimentos que o SGO+ já mostra. Visível só para o Administrador e a Diretoria.</p>' +
      '<div class="acv-linha">' +
        '<label>Começar em <input type="month" id="acvInicio" value="2022-01"></label>' +
        '<button type="button" class="acv-btn sec" id="acvBtnContar" onclick="acv_contar()">Contar o acervo</button>' +
        '<button type="button" class="acv-btn" id="acvBtnCopiar" onclick="acv_copiar()">Iniciar cópia</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnPausar" onclick="acv_acao(&quot;apiPausar&quot;)">Pausar</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnContinuar" onclick="acv_acao(&quot;apiContinuar&quot;)">Continuar</button>' +
      '</div>' +
      '<div class="acv-linha">' +
        '<button type="button" class="acv-btn sec" id="acvBtnRepetir" onclick="acv_repetir()">Tentar de novo as falhas</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnConferir" onclick="acv_acao(&quot;apiConferir&quot;)">Conferir arquivos</button>' +
        '<button type="button" class="acv-btn sec" onclick="acv_atualizar()">Atualizar</button>' +
      '</div>' +
      '<div id="acvMsg"></div>' +
      '<div id="acvSituacao"><div class="acv-caixa info">Carregando a situação do acervo...</div></div>' +
      '<div id="acvContagem"></div>' +
      '<div id="acvRelatorio"></div>' +
      '<details id="acvFalhasBloco"><summary>Falhas de cópia</summary><div id="acvFalhas"></div></details>' +
      '<details><summary>Consultar uma tarefa do acervo</summary>' +
        '<div class="acv-linha" style="margin-top:6px"><label>Número da tarefa no Auvo <input type="text" inputmode="numeric" id="acvTaskId" size="12"></label>' +
        '<button type="button" class="acv-btn sec" onclick="acv_consultar()">Consultar</button></div>' +
        '<div id="acvTarefa"></div></details>' +
    '</div>';
  casa.insertBefore(div.firstChild, casa.firstChild);
  var d = document.getElementById('acvFalhasBloco');
  if (d) d.addEventListener('toggle', function () { if (d.open) acv_falhas(); });
  acv_atualizar();
}

function acv_ajuda() {
  if (typeof Ajuda_abrir_ === 'function') Ajuda_abrir_('auvo/acervo');
}

function acv_inicio() {
  var v = (document.getElementById('acvInicio') || {}).value || '';
  return /^[0-9]{4}-[0-9]{2}$/.test(v) ? v : '2022-01';
}

function acv_atualizar() {
  return acv_chamar('apiStatus').then(acv_render).catch(function (e) { acv_msg('erro', acv_esc(e)); });
}

function acv_contar() {
  acv_msg('info', 'Iniciando a contagem...');
  acv_chamar('apiIniciarContagem', { inicio: acv_inicio() })
    .then(function (st) { acv_msg('ok', 'Contagem iniciada. Ela roda sozinha em lotes; acompanhe abaixo. Pode fechar a tela.'); acv_render(st); })
    .catch(function (e) { acv_msg('erro', acv_esc(e)); });
}

function acv_copiar() {
  if (!window.confirm('A cópia roda sozinha, em lotes de poucos minutos, até terminar (pode levar horas). Ela só lê o Auvo. Iniciar agora?')) return;
  acv_msg('info', 'Iniciando a cópia...');
  acv_chamar('apiIniciarCopia', { inicio: acv_inicio() })
    .then(function (st) { acv_msg('ok', 'Cópia iniciada. Acompanhe abaixo. Pode fechar a tela: ela continua no servidor.'); acv_render(st); })
    .catch(function (e) { acv_msg('erro', acv_esc(e)); });
}

function acv_repetir() {
  acv_chamar('apiTentarDeNovo')
    .then(function (st) { acv_msg('ok', acv_n(st.devolvidos) + ' arquivo(s) voltaram para a fila. A cópia retoma em instantes.'); acv_render(st); })
    .catch(function (e) { acv_msg('erro', acv_esc(e)); });
}

function acv_acao(fn) {
  acv_chamar(fn)
    .then(function (st) {
      var txt = { apiPausar: 'Pausa pedida. O lote em andamento termina o passo atual e para.', apiContinuar: 'Retomada pedida. O próximo lote começa em instantes.', apiConferir: 'Conferência iniciada.' }[fn] || '';
      acv_msg('ok', txt); acv_render(st);
    })
    .catch(function (e) { acv_msg('erro', acv_esc(e)); });
}

function acv_num(rotulo, valor) { return '<div class="acv-num"><b>' + valor + '</b><span>' + rotulo + '</span></div>'; }

function acv_render(st) {
  if (!document.getElementById('acvCard')) { if (ACV.timer) { clearInterval(ACV.timer); ACV.timer = null; } return; }
  ACV.ultimo = st;
  var e = (st && st.estado) || {};
  var sit = e.situacao || 'PARADO';
  var rodando = sit === 'RODANDO';
  var set = function (id, on) { var b = document.getElementById(id); if (b) b.disabled = !on; };
  set('acvBtnContar', !rodando); set('acvBtnCopiar', !rodando); set('acvBtnPausar', rodando && !e.pausaPedida);
  set('acvBtnContinuar', (sit === 'PAUSADO' || sit === 'ERRO') && !!e.modo);
  set('acvBtnRepetir', !rodando && e.modo === 'COPIA'); set('acvBtnConferir', !rodando && e.modo === 'COPIA');
  if (e.inicio) { var ip = document.getElementById('acvInicio'); if (ip && !ip.dataset.mexido) ip.value = e.inicio; }

  var h = '';
  if (!e.modo) {
    h += '<div class="acv-caixa info">Nada foi iniciado ainda. Comece por "Contar o acervo": mostra quantas tarefas, fotos e assinaturas existem e quanto espaço a cópia vai ocupar, sem baixar nada.</div>';
  } else {
    var tipoCaixa = sit === 'ERRO' ? 'erro' : (sit === 'CONCLUIDO' ? 'ok' : (sit === 'PAUSADO' ? 'aviso' : 'info'));
    h += '<div class="acv-caixa ' + tipoCaixa + '"><b>' + (e.modo === 'CONTAGEM' ? 'Contagem' : 'Cópia') + ': ' + acv_esc(ACV_SITUACAO[sit] || sit) + '</b>';
    if (sit === 'RODANDO' || sit === 'PAUSADO' || sit === 'ERRO') h += ' · etapa: ' + acv_esc(ACV_FASES[e.fase] || e.fase);
    if ((e.fase === 'TAREFAS' || e.fase === 'VERIFICAR') && e.cursor) h += ' · mês ' + acv_mes(e.cursor.mes) + ', página ' + acv_n(e.cursor.pagina);
    h += '<br>Período: ' + acv_mes(e.inicio) + ' a ' + acv_mes(e.fim) + ' · iniciada em ' + acv_esc(acv_data(e.iniciadoEm)) + (e.iniciadoPor ? ' por ' + acv_esc(e.iniciadoPor) : '');
    if (e.atualizadoEm) h += ' · última atualização ' + acv_esc(acv_data(e.atualizadoEm));
    if (e.pausaPedida) h += '<br>Pausa pedida: o lote em andamento termina o passo atual e para.';
    if (sit === 'ERRO') h += '<br>O Auvo ou o servidor falhou ' + acv_n(e.lotesComErro) + ' vezes seguidas. Confira a conexão em "Testar conexão" e toque em "Continuar": a cópia retoma de onde parou.';
    if (e.ultimoErro) h += '<br>Último erro: ' + acv_esc(e.ultimoErro);
    h += '</div>';
    h += '<div class="acv-grade">';
    if (e.tarefas) {
      h += acv_num('tarefas lidas nesta passada', acv_n(e.tarefas.lidas));
      if (e.modo === 'COPIA') h += acv_num('tarefas novas no acervo', acv_n(e.tarefas.novas)) + acv_num('tarefas com versão nova', acv_n(e.tarefas.novaVersao));
    }
    if (e.modo === 'COPIA' && e.arquivos && e.arquivos.esperados !== undefined) {
      h += acv_num('arquivos copiados de ' + acv_n(e.arquivos.esperados), acv_n(e.arquivos.copiados)) +
        acv_num('aguardando cópia', acv_n(e.arquivos.pendentes)) + acv_num('com falha', acv_n(e.arquivos.falhas)) +
        acv_num('espaço ocupado', acv_bytes(e.arquivos.bytes));
    } else if (e.modo === 'COPIA' && e.arquivos) {
      h += acv_num('arquivos registrados para baixar', acv_n(e.arquivos.registrados));
    }
    if (e.contagemParcial) h += acv_num('arquivos encontrados até agora', acv_n(e.contagemParcial.arquivos));
    h += '</div>';
  }
  document.getElementById('acvSituacao').innerHTML = h;
  document.getElementById('acvContagem').innerHTML = acv_htmlContagem(st && st.contagem);
  document.getElementById('acvRelatorio').innerHTML = acv_htmlRelatorio(st && st.relatorio);

  if (rodando && !ACV.timer) ACV.timer = setInterval(function () {
    if (!document.getElementById('acvCard')) { clearInterval(ACV.timer); ACV.timer = null; return; }
    acv_atualizar();
  }, 15000);
  if (!rodando && ACV.timer) { clearInterval(ACV.timer); ACV.timer = null; }
}

function acv_tabelaObj(obj, rotulo) {
  var chaves = Object.keys(obj || {}).sort(function (a, b) { return Number(obj[b] && obj[b].tarefas !== undefined ? obj[b].tarefas : obj[b]) - Number(obj[a] && obj[a].tarefas !== undefined ? obj[a].tarefas : obj[a]); });
  if (!chaves.length) return '';
  return '<div class="acv-tabela"><table><thead><tr><th>' + rotulo + '</th><th class="n">Tarefas</th></tr></thead><tbody>' +
    chaves.map(function (k) { var v = obj[k]; var nome = v && v.nome !== undefined ? (v.nome || k) : k; var q = v && v.tarefas !== undefined ? v.tarefas : v;
      return '<tr><td>' + acv_esc(nome) + '</td><td class="n">' + acv_n(q) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

function acv_htmlContagem(c) {
  if (!c) return '';
  var h = '<details open><summary>Resultado da contagem (' + acv_esc(acv_data(c.geradoEm)) + ')</summary>';
  h += '<div class="acv-grade">' +
    acv_num('tarefas no Auvo', acv_n(c.tarefas)) + acv_num('tipos de tarefa', acv_n(c.tiposDeTarefa)) +
    acv_num('questionários usados', acv_n(c.qtdQuestionarios)) + acv_num('respostas com foto', acv_n(c.respostasComImagem)) +
    acv_num('assinaturas do questionário', acv_n(c.assinaturasQuestionario)) + acv_num('assinaturas da tarefa', acv_n(c.assinaturasTarefa)) +
    acv_num('anexos', acv_n(c.anexos)) + acv_num('arquivos a copiar', acv_n(c.arquivos)) +
    acv_num('espaço estimado', acv_bytes(c.estimativaComJsonBytes)) + acv_num('tempo estimado da cópia', acv_n(c.estimativaMinutosCopia) + ' min') +
    '</div>';
  h += '<div class="acv-caixa info">Estimativa de espaço pela média de ' + acv_n(c.amostra && c.amostra.imagensMedidas) + ' imagens medidas (média ' + acv_bytes(c.amostra && c.amostra.tamanhoMedio) + ' por arquivo)' +
    (c.amostra && c.amostra.falhas ? '; ' + acv_n(c.amostra.falhas) + ' imagens da amostra não responderam' : '') + '. Endereços que não são arquivo (links): ' + acv_n(c.links) + '.</div>';
  h += acv_tabelaObj(c.porAno, 'Ano') + acv_tabelaObj(c.porTipo, 'Tipo de tarefa') + acv_tabelaObj(c.questionarios, 'Questionário');
  if (c.listasDeApoio) h += '<div class="acv-tabela"><table><thead><tr><th>Lista de apoio</th><th class="n">Itens no Auvo</th></tr></thead><tbody>' +
    Object.keys(c.listasDeApoio).map(function (k) { var v = c.listasDeApoio[k]; return '<tr><td>' + acv_esc(k.replace(/_/g, ' ')) + '</td><td class="n">' + (typeof v === 'number' ? acv_n(v) : acv_esc(v)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  return h + '</details>';
}

function acv_htmlRelatorio(r) {
  if (!r) return '';
  var a = r.arquivos || {}, t = r.tarefas || {}, conf = a.conferencia || {};
  var zero = r.conclusao === 'ZERO_FALTAS';
  var h = '<details open><summary>Relatório de conferência da cópia (' + acv_esc(acv_data(r.geradoEm)) + ')</summary>';
  h += '<div class="acv-caixa ' + (zero ? 'ok' : 'aviso') + '"><b>' + (zero ? 'Zero faltas: tudo o que o Auvo informou está no acervo e foi conferido.' : 'Há faltas: veja abaixo o que falta e o motivo.') + '</b></div>';
  h += '<div class="acv-grade">' +
    acv_num('tarefas no Auvo', acv_n(t.auvo)) + acv_num('tarefas no acervo', acv_n(t.noAcervo)) + acv_num('tarefas faltando', acv_n(t.faltando)) +
    acv_num('arquivos esperados', acv_n(a.esperados)) + acv_num('arquivos copiados', acv_n(a.copiados)) + acv_num('falhas', acv_n(a.falhas)) +
    acv_num('conferidos sem diferença', acv_n(conf.ok)) + acv_num('com diferença ou sumidos', acv_n((conf.divergentes || 0) + (conf.naoEncontrados || 0))) +
    acv_num('espaço ocupado', acv_bytes(a.bytes)) + '</div>';
  var tipos = Object.keys(a.porTipo || {});
  if (tipos.length) h += '<div class="acv-tabela"><table><thead><tr><th>Tipo</th><th class="n">Esperados</th><th class="n">Copiados</th><th class="n">Falhas</th><th class="n">Aguardando</th></tr></thead><tbody>' +
    tipos.map(function (k) { var p = a.porTipo[k]; return '<tr><td>' + acv_esc(ACV_TIPOS[k] || k) + '</td><td class="n">' + acv_n(p.esperados) + '</td><td class="n">' + acv_n(p.copiados) + '</td><td class="n">' + acv_n(p.falhas) + '</td><td class="n">' + acv_n(p.pendentes) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  var motivos = Object.keys(a.falhasPorMotivo || {});
  if (motivos.length) h += '<div class="acv-tabela"><table><thead><tr><th>Motivo da falha</th><th class="n">Arquivos</th></tr></thead><tbody>' +
    motivos.map(function (k) { return '<tr><td>' + acv_esc(k) + '</td><td class="n">' + acv_n(a.falhasPorMotivo[k]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  var meses = (r.porMes || []).filter(function (m) { return m.auvo || m.acervo; });
  if (meses.length) h += '<details><summary>Tarefas por mês (Auvo e acervo)</summary><div class="acv-tabela"><table><thead><tr><th>Mês</th><th class="n">Auvo</th><th class="n">Acervo</th><th class="n">Diferença</th></tr></thead><tbody>' +
    meses.map(function (m) { return '<tr><td>' + acv_mes(m.mes) + '</td><td class="n">' + acv_n(m.auvo) + '</td><td class="n">' + acv_n(m.acervo) + '</td><td class="n">' + acv_n(m.diferenca) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  return h + '</details>';
}

function acv_falhas() {
  var el = document.getElementById('acvFalhas');
  if (!el) return;
  el.innerHTML = '<div class="acv-caixa info">Carregando as falhas...</div>';
  acv_chamar('apiListarFalhas', { limite: 200 }).then(function (r) {
    if (!r.total) { el.innerHTML = '<div class="acv-caixa ok">Nenhuma falha de cópia.</div>'; return; }
    el.innerHTML = '<div class="acv-caixa aviso">' + acv_n(r.total) + ' arquivo(s) com falha' + (r.total > r.itens.length ? ' (mostrando os ' + acv_n(r.itens.length) + ' primeiros)' : '') +
      '. Toque em "Tentar de novo as falhas" para colocá-los de volta na fila.</div>' +
      '<div class="acv-tabela"><table><thead><tr><th>Tarefa</th><th>Tipo</th><th>Motivo</th><th class="n">Tentativas</th><th>Endereço no Auvo</th></tr></thead><tbody>' +
      r.itens.map(function (f) { return '<tr><td>' + acv_esc(f.tarefa) + '</td><td>' + acv_esc(ACV_TIPOS[f.tipo] || f.tipo) + (f.pergunta ? '<br><small>' + acv_esc(f.pergunta) + '</small>' : '') + '</td><td>' + acv_esc(f.motivo) +
        (f.repeteSozinho ? '<br><small>tenta de novo sozinha</small>' : '') + '</td><td class="n">' + acv_n(f.tentativas) + '</td><td><small>' + acv_esc(f.endereco) + '</small></td></tr>'; }).join('') +
      '</tbody></table></div>';
  }).catch(function (e) { el.innerHTML = '<div class="acv-caixa erro">' + acv_esc(e) + '</div>'; });
}

function acv_consultar() {
  var el = document.getElementById('acvTarefa');
  var id = ((document.getElementById('acvTaskId') || {}).value || '').replace(/[^0-9]/g, '');
  if (!id) { el.innerHTML = '<div class="acv-caixa aviso">Digite o número da tarefa no Auvo (só números).</div>'; return; }
  el.innerHTML = '<div class="acv-caixa info">Procurando a tarefa ' + acv_esc(id) + ' no acervo...</div>';
  acv_chamar('apiConsultarTarefa', { taskId: id }).then(function (r) {
    if (!r.achou) { el.innerHTML = '<div class="acv-caixa aviso">A tarefa ' + acv_esc(id) + ' ainda não está no acervo. Se a cópia não terminou, espere; se terminou, confira o número no Auvo.</div>'; return; }
    var t = r.tarefa;
    var h = '<div class="acv-caixa info"><b>Tarefa ' + acv_esc(r.taskId) + '</b> · ' + acv_esc(t.tipo) + ' · ' + acv_esc(t.data) + '<br>Cliente: ' + acv_esc(t.cliente) + ' · Técnico: ' + acv_esc(t.tecnico) +
      ' · Finalizada: ' + (t.finalizada === 'SIM' ? 'sim' : 'não') + '<br>Registro completo: versão ' + acv_n(t.versao) + ', ' + acv_bytes(t.tamanho) +
      (t.conferencia ? ', conferência ' + acv_esc(t.conferencia === 'OK' ? 'sem diferença' : t.conferencia) : '') +
      (r.jsonLink ? ' · <a href="' + acv_esc(r.jsonLink) + '" target="_blank" rel="noopener">abrir o registro completo</a>' : '') + '</div>';
    h += r.arquivos.length ? '<div class="acv-tabela"><table><thead><tr><th>Tipo</th><th>Situação</th><th>Arquivo</th><th class="n">Tamanho</th></tr></thead><tbody>' +
      r.arquivos.map(function (f) {
        var sit = { COPIADO: 'copiado', PENDENTE: 'aguardando', FALHA: 'falha: ' + f.motivo, LINK: 'link (não é arquivo)' }[f.situacao] || f.situacao;
        return '<tr><td>' + acv_esc(ACV_TIPOS[f.tipo] || f.tipo) + (f.pergunta ? '<br><small>' + acv_esc(f.pergunta) + '</small>' : '') + '</td><td>' + acv_esc(sit) + '</td><td>' +
          (f.link ? '<a href="' + acv_esc(f.link) + '" target="_blank" rel="noopener">' + acv_esc(f.nome) + '</a>' : '<small>' + acv_esc(f.endereco) + '</small>') + '</td><td class="n">' + (f.tamanho ? acv_bytes(f.tamanho) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="acv-caixa info">Esta tarefa não tem fotos, assinaturas nem anexos.</div>';
    if (r.jsonPrevia) h += '<details><summary>Ver o registro da tarefa (início)</summary><pre>' + acv_esc(r.jsonPrevia) + '</pre></details>';
    el.innerHTML = h;
  }).catch(function (e) { el.innerHTML = '<div class="acv-caixa erro">' + acv_esc(e) + '</div>'; });
}

document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'acvInicio') ev.target.dataset.mexido = '1'; });
</script>`;
