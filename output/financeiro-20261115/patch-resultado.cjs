// Painel financeiro (15/11/2026): aba "Resultado do mês" (regime de caixa), somente leitura do Omie. O que foi pago e recebido no
// mês (ListarMovimentos CPCR com dDtPagtoDe/Ate), por categoria do plano de contas do Omie (ListarCategorias, com a categoria
// superior); transferências entre contas ficam fora do resultado e aparecem à parte. Conferido no Omie real em 15/11: outubro com
// 596 pagamentos em 12 páginas; 215 categorias com categoria_superior e o campo transferencia.
// Uso: node patch-resultado.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
function ed(f, a, b) {
  f = path.join(pasta, f);
  let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
  a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl);
  if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez em ' + f + ': ' + a.slice(0, 80));
  fs.writeFileSync(f, t.replace(a, () => b));
}
ed('SGO_Omie_Gestao.js', `/** 15/11/2026: posição de hoje pelo resumo do Omie`, `/** 15/11/2026: plano de contas do Omie { código: { descricao, superior, transferencia } } (todas as páginas, 100 por vez). */
function Omie_categorias_() {
  var mapa = {}, pagina = 1, paginas = 1;
  do {
    var r = Omie_requisitar_('geral/categorias/', 'ListarCategorias', { pagina: pagina, registros_por_pagina: 100 });
    paginas = Number(r.total_de_paginas) || 0;
    if (paginas > 20) throw new Error('O plano de contas do Omie tem categorias demais para esta consulta.');
    (r.categoria_cadastro || []).forEach(function (c) {
      mapa[String(c.codigo)] = { descricao: String(c.descricao || c.descricao_padrao || c.codigo), superior: String(c.categoria_superior || ''), transferencia: String(c.transferencia || '') === 'S' };
    });
    pagina++;
  } while (pagina <= paginas);
  return mapa;
}
/** 15/11/2026: resultado do mês pelo regime de caixa: pago e recebido no mês, por categoria; transferências à parte. */
function Omie_apiResultado(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var m = String((payload || {}).mes || '').match(/^(\\d{4})-(\\d{2})$/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) < 2015) throw new Error('Escolha o mês.');
    var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'), mes = m[1] + '-' + m[2];
    if (mes > hoje.slice(0, 7)) throw new Error('O mês escolhido ainda não começou.');
    var ultimo = new Date(Number(m[1]), Number(m[2]), 0).getDate(), ateIso = mes + '-' + (ultimo < 10 ? '0' : '') + ultimo;
    if (ateIso > hoje) ateIso = hoje;
    var de = '01/' + m[2] + '/' + m[1], ate = ateIso.slice(8, 10) + '/' + m[2] + '/' + m[1];
    var linhas = {}, vistos = {}, pagina = 1, paginas = 1, titulos = 0, semCategoria = 0;
    do {
      var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 50, cTpLancamento: 'CPCR', dDtPagtoDe: de, dDtPagtoAte: ate });
      if (Object.keys(r).length && !Array.isArray(r.movimentos)) throw new Error('O Omie não devolveu os pagamentos esperados. Tente de novo em um minuto.');
      paginas = Number(r.nTotPaginas) || 0;
      if (paginas > 40) throw new Error('O mês tem mais de 2.000 pagamentos e recebimentos; esta consulta mostra até 2.000.');
      (r.movimentos || []).forEach(function (mv) {
        var d = mv.detalhes || {}, s = mv.resumo || {}, nat = String(d.cNatureza || '');
        var chave = nat + ':' + String(d.nCodTitulo || '');
        if ((nat !== 'P' && nat !== 'R') || !d.nCodTitulo || vistos[chave]) return;
        vistos[chave] = true;
        if (String(d.cStatus || '').toUpperCase() === 'CANCELADO') return;
        var pago = Number(s.nValPago), pg = String(d.dDtPagamento || '').match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
        if (!(pago > 0) || !pg || (pg[3] + '-' + pg[2]) !== mes) return;
        var cat = String(d.cCodCateg || ''); if (!cat) semCategoria++;
        var k = nat + '|' + cat, l = linhas[k] || (linhas[k] = { natureza: nat, codigo: cat, titulos: 0, centavos: 0 });
        l.titulos++; l.centavos += Math.round(pago * 100); titulos++;
      });
      pagina++;
    } while (pagina <= paginas);
    var cats = Omie_categorias_(), tot = { R: 0, P: 0, T: 0 }, receitas = [], despesas = [], transferencias = [];
    Object.keys(linhas).forEach(function (k) {
      var l = linhas[k], c = cats[l.codigo] || {}, sup = cats[c.superior] || {};
      var item = { codigo: l.codigo || 'sem categoria', descricao: c.descricao || (l.codigo ? 'Categoria ' + l.codigo : 'Sem categoria'), grupo: sup.descricao || '', titulos: l.titulos, valor: l.centavos / 100 };
      if (c.transferencia) { transferencias.push(item); tot.T += l.centavos; return; }
      if (l.natureza === 'R') { receitas.push(item); tot.R += l.centavos; } else { despesas.push(item); tot.P += l.centavos; }
    });
    var ord = function (a, b) { return b.valor - a.valor; };
    return { ok: true, mes: mes, de: mes + '-01', ate: ateIso, titulos: titulos, semCategoria: semCategoria,
      receitas: receitas.sort(ord), despesas: despesas.sort(ord), transferencias: transferencias.sort(ord),
      totais: { receitas: tot.R / 100, despesas: tot.P / 100, resultado: (tot.R - tot.P) / 100, transferencias: tot.T / 100 }, atualizadoEm: new Date().toISOString() };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/** 15/11/2026: posição de hoje pelo resumo do Omie`);
ed('JS_Omie_Gestao.html', `['fluxo','Fluxo de caixa'],`, `['fluxo','Fluxo de caixa'], ['resultado','Resultado do mês'],`);
ed('JS_Omie_Gestao.html', `    if (aba === 'fluxo') { OmieGest_fluxo_(); return; }`, `    if (aba === 'fluxo') { OmieGest_fluxo_(); return; }
    if (aba === 'resultado') { OmieGest_resultado_(); return; } // 15/11/2026`);
ed('JS_Omie_Gestao.html', `  function OmieGest_fluxo_() {`, `  // 15/11/2026: resultado do mês (regime de caixa) por categoria do Omie (Omie_apiResultado), na fila dos movimentos
  var OMIE_RES_SERIAL = 0;
  function OmieGest_resultado_() {
    document.getElementById('omieCorpo').innerHTML = '<section><h3>Resultado do mês</h3><p>O que foi recebido e pago no mês (regime de caixa), por categoria do plano de contas do Omie. Transferências entre contas ficam fora do resultado e aparecem à parte. É uma visão de gestão; o resultado contábil continua com o contador.</p>' +
      '<form class="omie-barra" onsubmit="event.preventDefault();OmieGest_consultarResultado_()"><label for="omieResMes">Mês<input class="cadx-input" type="month" id="omieResMes" required></label><button class="cadx-btn" type="submit">Ver resultado</button></form>' +
      '<p id="omieResStatus" role="status" aria-live="polite"></p><div id="omieResCartoes" class="cadx-resumo bc-resumo"></div><div id="omieResTabelas"></div></section>';
    var hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date()), d = {};
    hoje.forEach(function (p) { d[p.type] = p.value; });
    document.getElementById('omieResMes').value = d.year + '-' + d.month;
    OmieGest_consultarResultado_();
  }
  function OmieGest_consultarResultado_() {
    var st = document.getElementById('omieResStatus'), cart = document.getElementById('omieResCartoes'), tab = document.getElementById('omieResTabelas'); if (!st) return;
    var serial = ++OMIE_RES_SERIAL, pedido = OMIE_TELA.pedido, sessao = SGO_getSessionId(), mes = document.getElementById('omieResMes').value;
    function atual() { return serial === OMIE_RES_SERIAL && pedido === OMIE_TELA.pedido && sessao === SGO_getSessionId() && st === document.getElementById('omieResStatus'); }
    st.textContent = OMIE_MOV.ocupado ? 'Aguardando a consulta anterior ao Omie terminar…' : 'Consultando o Omie (pode levar alguns segundos)…'; cart.innerHTML = ''; tab.innerHTML = CadUI_esqueleto_(4);
    OmieGest_movFila_(function (liberar) {
      if (!atual()) { liberar(); return; }
      st.textContent = 'Consultando o Omie (pode levar alguns segundos)…';
      google.script.run.withSuccessHandler(function (r) {
        liberar();
        if (!atual()) return;
        if (!r || !r.ok) { st.textContent = (r && r.mensagem) || 'Não foi possível consultar.'; tab.innerHTML = ''; return; }
        var esc = CadUI_esc_, t = r.totais, c = function (v, rot) { return '<div class="cadx-num bc-resumo-item"><span class="bc-resumo-num">' + esc(OmieGest_moeda_(v)) + '</span><span>' + esc(rot) + '</span></div>'; };
        cart.innerHTML = c(t.receitas, 'Recebido') + c(t.despesas, 'Pago') + c(t.resultado, t.resultado < 0 ? 'Resultado (negativo)' : 'Resultado');
        st.textContent = r.titulos + ' título(s) de ' + OmieGest_dataBr_(r.de).replace(/^\\S+ /, '') + ' a ' + OmieGest_dataBr_(r.ate).replace(/^\\S+ /, '') + '.' + (r.semCategoria ? ' ' + r.semCategoria + ' sem categoria no Omie.' : '') +
          ' Atualizado em ' + new Date(r.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + '.';
        var tabela = function (titulo, lista, total) {
          if (!lista.length) return '<h4>' + esc(titulo) + '</h4><div class="cadx-vazio bc-vazio">Nada neste mês.</div>';
          return '<h4>' + esc(titulo) + '</h4>' + OmieGest_tabela_(['Categoria', 'Grupo', 'Títulos', 'Valor', '% do total'], lista.map(function (i) {
            return [i.descricao + (i.codigo && i.codigo !== 'sem categoria' ? ' (' + i.codigo + ')' : ''), i.grupo, String(i.titulos), OmieGest_moeda_(i.valor), total ? (Math.round(i.valor / total * 1000) / 10).toLocaleString('pt-BR') + '%' : ''];
          }));
        };
        tab.innerHTML = tabela('Recebido por categoria', r.receitas, t.receitas) + tabela('Pago por categoria', r.despesas, t.despesas) +
          (r.transferencias.length ? tabela('Transferências entre contas (fora do resultado)', r.transferencias, t.transferencias) : '');
      }).withFailureHandler(function () { liberar(); if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; tab.innerHTML = ''; } })
        .Omie_apiResultado(sessao, { mes: mes });
    });
  }
  function OmieGest_fluxo_() {`);
ed('SGO_Ajuda_Financeiro.js', `        { titulo: 'Provisões', itens: [`, `        { titulo: 'Resultado do mês', itens: ['Abra "Resultado do mês" e escolha o mês. Aparecem o total recebido, o total pago e o resultado (recebido menos pago), pelo dia do pagamento (regime de caixa).', 'Abaixo, o recebido e o pago por categoria do plano de contas do Omie, com o grupo, a quantidade de títulos e a parte de cada uma no total.', 'Transferências entre contas da empresa não entram no resultado e aparecem à parte.', 'É uma visão de gestão do caixa; o resultado contábil (competência, impostos, depreciação) continua com o contador.'] },
        { titulo: 'Provisões', itens: [`);
console.log('ok');
