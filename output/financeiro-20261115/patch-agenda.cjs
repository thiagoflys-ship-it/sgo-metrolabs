// Painel financeiro (15/11/2026): Agenda de vencimentos na Visão geral — o que vence nos próximos 7, 15 ou 30 dias, em ordem de
// data, com o nome do cliente ou fornecedor e o valor em aberto. Somente leitura do Omie:
// - ListarMovimentos (financas/mf) com dDtVencDe/Ate, todas as páginas (até 20); fora: cancelados e sem saldo em aberto;
// - nomes por ListarClientes com clientesPorCodigo (até 50 códigos por chamada; conferido no Omie real em 15/11: 27 de 27).
// ListarMovimentos fica fora do espaço de 5 s entre chamadas (as páginas seguidas passaram no Omie real em 14/11).
// Uso: node patch-agenda.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
let arq = '', t = '';
function abrir(f) { arq = path.join(pasta, f); t = fs.readFileSync(arq, 'utf8'); }
function gravar() { fs.writeFileSync(arq, t); }
function trocar(de, para, rotulo) {
  const tentativas = [[de, para], [de.replace(/\r?\n/g, '\r\n'), para.replace(/\r?\n/g, '\r\n')]];
  for (const [a, b] of tentativas) {
    const n = t.split(a).length - 1;
    if (n === 1) { t = t.replace(a, () => b); return; }
    if (n > 1) throw new Error('trecho repetido: ' + rotulo);
  }
  throw new Error('trecho não encontrado: ' + rotulo + ' em ' + arq);
}

abrir('SGO_Omie.js');
trocar(`var OMIE_INTERVALO_MS = 5000;
function Omie_aguardarVez_(chamada) {
  try {`, `var OMIE_INTERVALO_MS = 5000;
// 15/11/2026: páginas seguidas de ListarMovimentos passaram no Omie real sem recusa (resumo do mês e agenda): sem espera.
var OMIE_SEM_ESPACO = /^ListarMovimentos$/;
function Omie_aguardarVez_(chamada) {
  if (OMIE_SEM_ESPACO.test(chamada)) return;
  try {`, 'semEspaco');
gravar();

abrir('SGO_Omie_Gestao.js');
trocar(`function Omie_apiContasCorrentes(sessionId) {`, `/**
 * 15/11/2026: Agenda de vencimentos — títulos com vencimento de hoje até hoje + dias (7, 15 ou 30), com saldo em aberto,
 * em ordem de data. Nomes pelo cadastro do Omie (ListarClientes por código, 50 por chamada). Somente leitura.
 */
function Omie_apiAgenda(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {}, dias = Number(p.dias || 7), natureza = String(p.natureza || 'todos');
    if ([7, 15, 30].indexOf(dias) < 0 || ['todos', 'P', 'R'].indexOf(natureza) < 0) throw new Error('Escolha o período e o tipo da agenda.');
    var agora = new Date(), hoje = Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyy-MM-dd');
    var fim = Utilities.formatDate(new Date(agora.getTime() + dias * 86400000), 'America/Sao_Paulo', 'yyyy-MM-dd');
    var br = function (s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); };
    var tipo = natureza === 'P' ? 'CP' : natureza === 'R' ? 'CR' : 'CPCR';
    var itens = [], vistos = {}, pagina = 1, paginas = 1;
    do {
      var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 50, cTpLancamento: tipo, dDtVencDe: br(hoje), dDtVencAte: br(fim) });
      if (Object.keys(r).length && !Array.isArray(r.movimentos)) throw new Error('O Omie não devolveu os títulos esperados para a agenda.');
      paginas = Number(r.nTotPaginas) || 0;
      if (paginas > 20) throw new Error('O período tem mais de 1.000 títulos. Escolha um período menor ou só a pagar ou só a receber.');
      (r.movimentos || []).forEach(function (m) {
        var d = m.detalhes || {}, s = m.resumo || {}, nat = String(d.cNatureza || '');
        if (nat !== 'P' && nat !== 'R') return;
        var chave = nat + ':' + String(d.nCodTitulo || '');
        if (!d.nCodTitulo || vistos[chave]) return;
        vistos[chave] = true;
        if (String(d.cStatus || '').toUpperCase() === 'CANCELADO') return;
        var aberto = Number(s.nValAberto);
        if (!isFinite(aberto) || aberto <= 0) return;
        var v = String(d.dDtVenc || '').match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
        if (!v) return;
        itens.push({ id: String(d.nCodTitulo), natureza: nat, vencimento: v[3] + '-' + v[2] + '-' + v[1], pessoaId: Number(d.nCodCliente) || 0,
          documento: String(d.cNumDocFiscal || d.cNumTitulo || ''), parcela: String(d.cNumParcela || ''), valor: Math.round(aberto * 100) / 100,
          situacao: String(d.cStatus || ''), cnpj: String(d.cCPFCNPJCliente || '') });
      });
      pagina++;
    } while (pagina <= paginas);
    // nomes: cadastro do Omie por código (50 por chamada)
    var codigos = [], nomes = {};
    itens.forEach(function (i) { if (i.pessoaId && codigos.indexOf(i.pessoaId) < 0) codigos.push(i.pessoaId); });
    for (var k = 0; k < codigos.length; k += 50) {
      var lote = codigos.slice(k, k + 50);
      try {
        var c = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 50, apenas_importado_api: 'N', clientesPorCodigo: lote.map(function (x) { return { codigo_cliente_omie: x }; }) });
        (c.clientes_cadastro || []).forEach(function (x) { nomes[String(x.codigo_cliente_omie)] = String(x.nome_fantasia || x.razao_social || '').slice(0, 120); });
      } catch (e) { break; } // sem os nomes a agenda continua útil (mostra o CNPJ)
    }
    var totais = { pagar: 0, receber: 0 };
    itens.forEach(function (i) {
      i.nome = nomes[String(i.pessoaId)] || '';
      if (i.natureza === 'P') totais.pagar += Math.round(i.valor * 100); else totais.receber += Math.round(i.valor * 100);
      delete i.pessoaId;
    });
    itens.sort(function (a, b) { return a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.natureza < b.natureza ? -1 : a.natureza > b.natureza ? 1 : b.valor - a.valor; });
    return { ok: true, de: hoje, ate: fim, itens: itens, totais: { pagar: totais.pagar / 100, receber: totais.receber / 100 }, semNome: itens.filter(function (i) { return !i.nome; }).length, atualizadoEm: new Date().toISOString() };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiContasCorrentes(sessionId) {`, 'agenda');
gravar();

abrir('JS_Omie_Gestao.html');
trocar(`<p id="omieGestAtualizado"></p><p>Para movimentações e saldos bancários, consulte Fluxo de caixa.</p></section>';
    OmieGest_datas_();
    OmieGest_atualizarResumo_();`, `<p id="omieGestAtualizado"></p><p>Para movimentações e saldos bancários, consulte Fluxo de caixa.</p></section>' +
      '<section class="omie-agenda"><h3>Agenda de vencimentos</h3><p>O que vence de hoje em diante, em ordem de data, com o valor que ainda está em aberto. Os vencidos ficam em Contas a pagar e receber, situação Vencidos.</p>' +
      '<form class="omie-barra" onsubmit="event.preventDefault();OmieGest_agenda_()"><label for="omieAgDias">Período<select class="cadx-input" id="omieAgDias"><option value="7">Próximos 7 dias</option><option value="15">Próximos 15 dias</option><option value="30">Próximos 30 dias</option></select></label>' +
      '<label for="omieAgNat">Mostrar<select class="cadx-input" id="omieAgNat"><option value="todos">A pagar e a receber</option><option value="P">Só a pagar</option><option value="R">Só a receber</option></select></label>' +
      '<button class="cadx-btn" type="submit">Ver agenda</button></form><p id="omieAgStatus" role="status" aria-live="polite"></p><div id="omieAgTotais" class="cadx-resumo bc-resumo"></div><div id="omieAgLista"></div></section>';
    OmieGest_datas_();
    OmieGest_atualizarResumo_();
    OmieGest_agenda_();`, 'resumoHtml');
trocar(`  function OmieGest_fluxo_() {`, `  // 15/11/2026: agenda de vencimentos (Omie_apiAgenda). Chamada própria: não divide o aviso nem a ordem das respostas do resumo.
  var OMIE_AG_SERIAL = 0;
  function OmieGest_dataBr_(s) { var m = String(s || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/); if (!m) return s; var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()] + ' ' + m[3] + '/' + m[2]; }
  function OmieGest_agenda_() {
    var lista = document.getElementById('omieAgLista'), st = document.getElementById('omieAgStatus'), tot = document.getElementById('omieAgTotais');
    if (!lista) return;
    var serial = ++OMIE_AG_SERIAL, pedido = OMIE_TELA.pedido, sessao = SGO_getSessionId();
    function atual() { return serial === OMIE_AG_SERIAL && pedido === OMIE_TELA.pedido && sessao === SGO_getSessionId() && lista === document.getElementById('omieAgLista'); }
    var dias = document.getElementById('omieAgDias').value, nat = document.getElementById('omieAgNat').value;
    st.textContent = 'Consultando a agenda no Omie…'; tot.innerHTML = ''; lista.innerHTML = CadUI_esqueleto_(3);
    google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;
      if (!r || !r.ok) { st.textContent = (r && r.mensagem) || 'Não foi possível consultar a agenda.'; lista.innerHTML = ''; return; }
      var esc = CadUI_esc_;
      tot.innerHTML = (nat !== 'R' ? '<div class="cadx-num bc-resumo-item"><span class="bc-resumo-num">' + esc(OmieGest_moeda_(r.totais.pagar)) + '</span><span>A pagar no período</span></div>' : '') +
        (nat !== 'P' ? '<div class="cadx-num bc-resumo-item"><span class="bc-resumo-num">' + esc(OmieGest_moeda_(r.totais.receber)) + '</span><span>A receber no período</span></div>' : '');
      st.textContent = r.itens.length + ' título(s) de ' + OmieGest_dataBr_(r.de) + ' a ' + OmieGest_dataBr_(r.ate) + '.' + (r.semNome ? ' ' + r.semNome + ' sem nome no cadastro do Omie (aparece o CPF ou CNPJ).' : '') +
        ' Atualizado em ' + new Date(r.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + '.';
      if (!r.itens.length) { lista.innerHTML = '<div class="cadx-vazio bc-vazio">Nada vence neste período.</div>'; return; }
      var dia = '', linhas = [];
      r.itens.forEach(function (i) {
        if (i.vencimento !== dia) {
          dia = i.vencimento;
          var doDia = r.itens.filter(function (x) { return x.vencimento === dia; }), p = 0, rc = 0;
          doDia.forEach(function (x) { if (x.natureza === 'P') p += x.valor; else rc += x.valor; });
          linhas.push('<tr class="omie-ag-dia"><td colspan="5"><b>' + esc(OmieGest_dataBr_(dia)) + '</b>' + (p ? ' · a pagar ' + esc(OmieGest_moeda_(p)) : '') + (rc ? ' · a receber ' + esc(OmieGest_moeda_(rc)) : '') + '</td></tr>');
        }
        linhas.push('<tr><td data-r="Tipo"><span class="omie-ag-tipo omie-ag-' + (i.natureza === 'P' ? 'pagar' : 'receber') + '">' + (i.natureza === 'P' ? 'A pagar' : 'A receber') + '</span></td>' +
          '<td data-r="Cliente ou fornecedor">' + esc(i.nome || i.cnpj || 'Sem cadastro') + '</td><td data-r="Documento">' + esc([i.documento, i.parcela ? 'parcela ' + i.parcela : ''].filter(Boolean).join(' · ')) + '</td>' +
          '<td data-r="Em aberto">' + esc(OmieGest_moeda_(i.valor)) + '</td><td data-r="Situação">' + esc(i.situacao) + '</td></tr>');
      });
      lista.innerHTML = '<div class="omie-lista"><table><thead><tr><th>Tipo</th><th>Cliente ou fornecedor</th><th>Documento</th><th>Em aberto</th><th>Situação</th></tr></thead><tbody>' + linhas.join('') + '</tbody></table></div>';
    }).withFailureHandler(function () { if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiAgenda(sessao, { dias: Number(dias), natureza: nat });
  }
  function OmieGest_fluxo_() {`, 'agendaJs');
trocar(`  @media(max-width:400px) { #omieTela .bc-resumo-num { font-size:15px; } }`, `  @media(max-width:400px) { #omieTela .bc-resumo-num { font-size:15px; } }
  /* 15/11/2026: agenda de vencimentos */
  #omieTela .omie-agenda { margin-top:28px; }
  #omieTela .omie-ag-dia td { background:var(--bc-soft, #f1f5f9); padding-top:10px; }
  #omieTela .omie-ag-tipo { display:inline-block; padding:2px 8px; border-radius:10px; font-size:13px; font-weight:600; white-space:nowrap; }
  #omieTela .omie-ag-pagar { background:#fdecec; color:#9b1c1c; }
  #omieTela .omie-ag-receber { background:#e7f6ec; color:#1e6b3a; }
  @media(max-width:700px) { #omieTela .omie-ag-dia td { display:block; } #omieTela .omie-ag-dia td:before { content:none; } }`, 'css');
gravar();
console.log('ok');
