// Painel financeiro (15/11/2026): vencidos a receber por faixa de atraso (título a título: até 30, 31 a 90, mais de 90 dias) e
// "Baixar planilha (CSV)" nos vencidos por cliente, na agenda e no resultado do mês (gerada no navegador com o que está na tela;
// separador ";" e vírgula decimal, como o Excel em português abre; sem nova consulta ao Omie).
// Uso: node patch-faixas-csv.cjs <pasta do legado>
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
// servidor: faixas de atraso por título
ed('SGO_Omie_Gestao.js', `        g.titulos++; titulos++; g.centavos += Math.round(aberto * 100);
        if (dia < g.maisAntigo) g.maisAntigo = dia;`, `        g.titulos++; titulos++; g.centavos += Math.round(aberto * 100);
        var atraso = Math.round((Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10)) - Date.UTC(+v[3], +v[2] - 1, +v[1])) / 86400000);
        var fx = atraso <= 30 ? 'ate30' : atraso <= 90 ? 'de31a90' : 'mais90';
        faixas[fx].titulos++; faixas[fx].centavos += Math.round(aberto * 100);
        if (dia < g.maisAntigo) g.maisAntigo = dia;`);
ed('SGO_Omie_Gestao.js', `    return { ok: true, clientes: lista, titulos: titulos, total: total / 100, atualizadoEm: new Date().toISOString() };`,
  `    Object.keys(faixas).forEach(function (k) { faixas[k].valor = faixas[k].centavos / 100; delete faixas[k].centavos; });
    return { ok: true, clientes: lista, titulos: titulos, total: total / 100, faixas: faixas, atualizadoEm: new Date().toISOString() };`);
let g = fs.readFileSync(path.join(pasta, 'SGO_Omie_Gestao.js'), 'utf8');
const ancora = /function Omie_apiVencidosClientes\(sessionId\) \{\r?\n  try \{\r?\n    Omie_exigirAcesso_\(sessionId\);\r?\n    var hoje = [^\r\n]*\r?\n/;
const mm = g.match(ancora);
if (!mm) throw new Error('âncora dos vencidos não encontrada');
const nl = g.includes('\r\n') ? '\r\n' : '\n';
g = g.replace(ancora, (x) => x + "    var faixas = { ate30: { titulos: 0, centavos: 0 }, de31a90: { titulos: 0, centavos: 0 }, mais90: { titulos: 0, centavos: 0 } }; // 15/11/2026" + nl);
fs.writeFileSync(path.join(pasta, 'SGO_Omie_Gestao.js'), g);
// tela: CSV
ed('JS_Omie_Gestao.html', `  // 15/11/2026: vencidos a receber por cliente (Omie_apiVencidosClientes), sob pedido`, `  // 15/11/2026: planilha CSV do que está na tela (";" e vírgula decimal, para o Excel em português); sem nova consulta
  var OMIE_CSV = {};
  function OmieGest_csvNum_(v) { return (Math.round(Number(v || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function OmieGest_csv_(chave, nome) {
    var d = OMIE_CSV[chave]; if (!d) return;
    var cel = function (v) { var s = String(v == null ? '' : v); if (/^[=+@\\-]/.test(s)) s = "'" + s; return /[;"\\r\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var txt = '\\ufeff' + [d.cab].concat(d.linhas).map(function (l) { return l.map(cel).join(';'); }).join('\\r\\n');
    var url = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function OmieGest_botaoCsv_(chave, nome) { return '<p><button type="button" class="cadx-btn" onclick="OmieGest_csv_(\\'' + chave + '\\', \\'' + nome + '\\')">Baixar planilha (CSV)</button></p>'; }
  // 15/11/2026: vencidos a receber por cliente (Omie_apiVencidosClientes), sob pedido`);
ed('JS_Omie_Gestao.html', `      lista.innerHTML = OmieGest_tabela_(['Cliente', 'Títulos', 'Em aberto', 'Vencido desde', 'Dias', 'Documentos'], r.clientes.map(function (c) {
        return [c.cliente || 'Sem nome no Omie', c.titulos + (c.parciais ? ' (' + c.parciais + ' com pagamento parcial)' : ''), OmieGest_moeda_(c.valor), OmieGest_dataBr_(c.maisAntigo).replace(/^\\S+ /, '') + '/' + c.maisAntigo.slice(0, 4), String(c.diasAtraso), c.documentos.join(', ')];
      }));`, `      var fx = r.faixas || {}, cf = function (k, rot) { var x = fx[k] || { titulos: 0, valor: 0 }; return '<div class="cadx-num bc-resumo-item"><span class="bc-resumo-num">' + CadUI_esc_(OmieGest_moeda_(x.valor)) + '</span><span>' + rot + '</span><span class="cadx-sub">' + x.titulos + ' título(s)</span></div>'; };
      OMIE_CSV.vencidos = { cab: ['Cliente', 'Títulos', 'Em aberto', 'Vencido desde', 'Dias de atraso', 'Com pagamento parcial', 'Documentos'],
        linhas: r.clientes.map(function (c) { return [c.cliente || 'Sem nome no Omie', c.titulos, OmieGest_csvNum_(c.valor), c.maisAntigo.split('-').reverse().join('/'), c.diasAtraso, c.parciais, c.documentos.join(', ')]; }) };
      lista.innerHTML = '<div class="cadx-resumo bc-resumo">' + cf('ate30', 'Vencido há até 30 dias') + cf('de31a90', 'De 31 a 90 dias') + cf('mais90', 'Há mais de 90 dias') + '</div>' +
        OmieGest_tabela_(['Cliente', 'Títulos', 'Em aberto', 'Vencido desde', 'Dias', 'Documentos'], r.clientes.map(function (c) {
        return [c.cliente || 'Sem nome no Omie', c.titulos + (c.parciais ? ' (' + c.parciais + ' com pagamento parcial)' : ''), OmieGest_moeda_(c.valor), OmieGest_dataBr_(c.maisAntigo).replace(/^\\S+ /, '') + '/' + c.maisAntigo.slice(0, 4), String(c.diasAtraso), c.documentos.join(', ')];
      })) + OmieGest_botaoCsv_('vencidos', 'vencidos-por-cliente.csv');`);
ed('JS_Omie_Gestao.html', `        tab.innerHTML = tabela('Recebido por categoria', r.receitas, t.receitas) + tabela('Pago por categoria', r.despesas, t.despesas) +
          (r.transferencias.length ? tabela('Transferências entre contas (fora do resultado)', r.transferencias, t.transferencias) : '');`, `        var csvL = [];
        [['Recebido', r.receitas], ['Pago', r.despesas], ['Transferência (fora do resultado)', r.transferencias]].forEach(function (b) { b[1].forEach(function (i) { csvL.push([b[0], i.codigo, i.descricao, i.grupo, i.titulos, OmieGest_csvNum_(i.valor)]); }); });
        csvL.push(['Resultado', '', '', '', '', OmieGest_csvNum_(t.resultado)]);
        OMIE_CSV.resultado = { cab: ['Tipo', 'Código', 'Categoria', 'Grupo', 'Títulos', 'Valor'], linhas: csvL };
        tab.innerHTML = tabela('Recebido por categoria', r.receitas, t.receitas) + tabela('Pago por categoria', r.despesas, t.despesas) +
          (r.transferencias.length ? tabela('Transferências entre contas (fora do resultado)', r.transferencias, t.transferencias) : '') + OmieGest_botaoCsv_('resultado', 'resultado-' + r.mes + '.csv');`);
ed('JS_Omie_Gestao.html', `      lista.innerHTML = '<div class="omie-lista"><table><thead><tr><th>Tipo</th><th>Cliente ou fornecedor</th><th>Documento</th><th>Em aberto</th><th>Situação</th></tr></thead><tbody>' + linhas.join('') + '</tbody></table></div>';`,
  `      OMIE_CSV.agenda = { cab: ['Vencimento', 'Tipo', 'Cliente ou fornecedor', 'CPF/CNPJ', 'Documento', 'Parcela', 'Em aberto', 'Situação'],
        linhas: r.itens.map(function (i) { return [i.vencimento.split('-').reverse().join('/'), i.natureza === 'P' ? 'A pagar' : 'A receber', i.nome, i.cnpj, i.documento, i.parcela, OmieGest_csvNum_(i.valor), i.situacao]; }) };
      lista.innerHTML = '<div class="omie-lista"><table><thead><tr><th>Tipo</th><th>Cliente ou fornecedor</th><th>Documento</th><th>Em aberto</th><th>Situação</th></tr></thead><tbody>' + linhas.join('') + '</tbody></table></div>' + OmieGest_botaoCsv_('agenda', 'agenda-de-vencimentos.csv');`);
ed('SGO_Ajuda_Financeiro.js', `É o ponto de partida da cobrança.'`, `É o ponto de partida da cobrança. Os cartões no alto separam o que está vencido há até 30 dias, de 31 a 90 e há mais de 90.', 'A agenda, os vencidos por cliente e o resultado do mês têm o botão "Baixar planilha (CSV)", que abre no Excel com o que está na tela.'`);
console.log('ok');
