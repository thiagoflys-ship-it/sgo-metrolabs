// Painel financeiro (15/11/2026): "Vencidos a receber por cliente" na Visão geral (sob pedido: botão). Somente leitura do Omie:
// ListarContasReceber com filtrar_por_status ATRASADO (conferido no Omie real: 80 títulos), agrupado por cliente, com o nome do
// cadastro do Omie em lote (Omie_nomesClientes_, SGO_Omie_Ganhos.js). Valor = valor do documento (o Omie não dá o saldo nesta lista;
// título com pagamento parcial aparece marcado).
// Uso: node patch-vencidos.cjs <pasta do legado>
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

abrir('SGO_Omie_Gestao.js');
trocar(`function Omie_apiContasCorrentes(sessionId) {`, `/** 15/11/2026: vencidos a receber agrupados por cliente (ListarContasReceber, situação ATRASADO, todas as páginas até 20). */
function Omie_apiVencidosClientes(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'), grupos = {}, vistos = {}, pagina = 1, paginas = 1, titulos = 0;
    do {
      var r = Omie_requisitar_('financas/contareceber/', 'ListarContasReceber', { pagina: pagina, registros_por_pagina: 50, apenas_importado_api: 'N', filtrar_por_status: 'ATRASADO' });
      paginas = Number(r.total_de_paginas) || 0;
      if (paginas > 20) throw new Error('Há mais de 1.000 títulos vencidos. Consulte por cliente em Contas a pagar e receber.');
      (r.conta_receber_cadastro || []).forEach(function (x) {
        var id = String(x.codigo_lancamento_omie || ''); if (!id || vistos[id]) return; vistos[id] = true;
        var v = String(x.data_vencimento || '').match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/); if (!v) return;
        var dia = v[3] + '-' + v[2] + '-' + v[1], cli = String(x.codigo_cliente_fornecedor || '0');
        var g = grupos[cli] || (grupos[cli] = { codigo: Number(cli) || 0, titulos: 0, centavos: 0, maisAntigo: dia, parciais: 0, documentos: [] });
        g.titulos++; titulos++; g.centavos += Math.round((Number(x.valor_documento) || 0) * 100);
        if (dia < g.maisAntigo) g.maisAntigo = dia;
        if (/PARCIAL/i.test(String(x.status_titulo || ''))) g.parciais++;
        if (g.documentos.length < 5) g.documentos.push(String(x.numero_documento || x.numero_documento_fiscal || '').slice(0, 30));
      });
      pagina++;
    } while (pagina <= paginas);
    var lista = Object.keys(grupos).map(function (k) { return grupos[k]; });
    var nomes = typeof Omie_nomesClientes_ === 'function' ? Omie_nomesClientes_(lista.map(function (g) { return g.codigo; }).filter(Boolean)) : {};
    var dias = function (d) { return Math.max(0, Math.round((Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10)) - Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))) / 86400000)); };
    var total = 0;
    lista = lista.map(function (g) { total += g.centavos; return { cliente: nomes[String(g.codigo)] || '', titulos: g.titulos, valor: g.centavos / 100, maisAntigo: g.maisAntigo, diasAtraso: dias(g.maisAntigo), parciais: g.parciais, documentos: g.documentos.filter(Boolean) }; })
      .sort(function (a, b) { return b.valor - a.valor; });
    return { ok: true, clientes: lista, titulos: titulos, total: total / 100, atualizadoEm: new Date().toISOString() };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiContasCorrentes(sessionId) {`, 'api');
gravar();

abrir('JS_Omie_Gestao.html');
trocar(`'<button class="cadx-btn" type="submit">Ver agenda</button></form><p id="omieAgStatus" role="status" aria-live="polite"></p><div id="omieAgTotais" class="cadx-resumo bc-resumo"></div><div id="omieAgLista"></div></section>';`,
  `'<button class="cadx-btn" type="submit">Ver agenda</button></form><p id="omieAgStatus" role="status" aria-live="polite"></p><div id="omieAgTotais" class="cadx-resumo bc-resumo"></div><div id="omieAgLista"></div></section>' +
      '<section class="omie-agenda"><h3>Vencidos a receber por cliente</h3><p>Quem está devendo, quantos títulos, o total e há quantos dias venceu o mais antigo. Para a cobrança; o detalhe de cada título fica em Contas a pagar e receber, situação Vencidos.</p>' +
      '<button class="cadx-btn" type="button" onclick="OmieGest_vencidos_()">Ver vencidos por cliente</button><p id="omieVcStatus" role="status" aria-live="polite"></p><div id="omieVcLista"></div></section>';`, 'html');
trocar(`  function OmieGest_fluxo_() {`, `  // 15/11/2026: vencidos a receber por cliente (Omie_apiVencidosClientes), sob pedido
  var OMIE_VC_SERIAL = 0;
  function OmieGest_vencidos_() {
    var lista = document.getElementById('omieVcLista'), st = document.getElementById('omieVcStatus'); if (!lista) return;
    var serial = ++OMIE_VC_SERIAL, pedido = OMIE_TELA.pedido, sessao = SGO_getSessionId();
    function atual() { return serial === OMIE_VC_SERIAL && pedido === OMIE_TELA.pedido && sessao === SGO_getSessionId() && lista === document.getElementById('omieVcLista'); }
    st.textContent = 'Consultando os vencidos no Omie…'; lista.innerHTML = CadUI_esqueleto_(3);
    google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;
      if (!r || !r.ok) { st.textContent = (r && r.mensagem) || 'Não foi possível consultar.'; lista.innerHTML = ''; return; }
      st.textContent = r.titulos + ' título(s) vencido(s) de ' + r.clientes.length + ' cliente(s), ' + OmieGest_moeda_(r.total) + ' no total (valor dos documentos). Atualizado em ' + new Date(r.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + '.';
      lista.innerHTML = OmieGest_tabela_(['Cliente', 'Títulos', 'Valor dos documentos', 'Vencido desde', 'Dias', 'Documentos'], r.clientes.map(function (c) {
        return [c.cliente || 'Sem nome no Omie', c.titulos + (c.parciais ? ' (' + c.parciais + ' com pagamento parcial)' : ''), OmieGest_moeda_(c.valor), OmieGest_dataBr_(c.maisAntigo).replace(/^\\S+ /, '') + '/' + c.maisAntigo.slice(0, 4), String(c.diasAtraso), c.documentos.join(', ')];
      }));
    }).withFailureHandler(function () { if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiVencidosClientes(sessao);
  }
  function OmieGest_fluxo_() {`, 'js');
gravar();

abrir('SGO_Ajuda_Financeiro.js');
trocar(`A agenda de 30 dias pode levar uns 15 segundos.'`, `A agenda de 30 dias pode levar uns 15 segundos.', 'Mais abaixo, "Ver vencidos por cliente" mostra quem está devendo: quantos títulos vencidos, o total (valor dos documentos), desde quando e há quantos dias. É o ponto de partida da cobrança.'`, 'ajuda');
gravar();
console.log('ok');
