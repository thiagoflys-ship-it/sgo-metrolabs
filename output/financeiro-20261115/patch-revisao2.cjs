// Correções da 2ª revisão independente (15/11/2026, ~00:55). Uso: node patch-revisao2.cjs <pasta do legado>
//  1) OmieGest_chamar_: resposta para tela que já mudou também chama o "fim" (antes a fila ficava presa até o tempo de segurança).
//  2) OmieGest_chamar_: erro ao desenhar (ok) não impede o "fim"; o resumo na fila só roda se o bloco do resumo ainda existe.
//  3) CSV: a proteção contra fórmula não atinge números (valor negativo continua número no Excel).
//  4) Tempo de segurança da fila: 300 s (o limite das chamadas do servidor), para não soltar uma consulta longa em andamento.
//  6) Ganhos: só a referência exata do pagamento marca "já lançado"; lançamento com a referência antiga OMIE:<título> entra no
//     desconto (o pagamento seguinte do mesmo título continua sugerido com o valor descontado).
//  7) Gravação: depois da releitura na confirmação, a espera de 1 minuto conta a partir dela (nova confirmação após "ocupado").
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
ed('JS_Omie_Gestao.html', `    var runner = google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;
      if (!r || !r.ok) { if (status) status.textContent = r && r.mensagem || 'Não foi possível concluir.'; acabou(); return; }
      if (status) status.textContent = r.mensagem || '';
      ok(r);
      acabou();
    })`, `    var runner = google.script.run.withSuccessHandler(function (r) {
      if (!atual()) { acabou(); return; }
      if (!r || !r.ok) { if (status) status.textContent = r && r.mensagem || 'Não foi possível concluir.'; acabou(); return; }
      if (status) status.textContent = r.mensagem || '';
      try { ok(r); } finally { acabou(); }
    })`);
ed('JS_Omie_Gestao.html', `    setTimeout(liberar, 90000); // segurança: resposta perdida não prende a fila`, `    setTimeout(liberar, 300000); // segurança: resposta perdida não prende a fila (300 s = limite das chamadas do servidor)`);
ed('JS_Omie_Gestao.html', `    OmieGest_movFila_(function (liberar) { OmieGest_chamar_('Omie_apiResumo',`, `    OmieGest_movFila_(function (liberar) { if (!document.getElementById('omieGestResumo') || !document.getElementById('omieGestInicio')) { liberar(); return; } OmieGest_chamar_('Omie_apiResumo',`);
let t = fs.readFileSync(path.join(pasta, 'JS_Omie_Gestao.html'), 'utf8');
const a = `if (/^[=+@\\-]/.test(s)) s = "'" + s;`;
if (t.split(a).length !== 2) throw new Error('proteção do CSV não encontrada');
t = t.replace(a, () => `if (/^[=+@\\-]/.test(s) && !/^-?\\d+(,\\d+)?$/.test(s)) s = "'" + s;`);
fs.writeFileSync(path.join(pasta, 'JS_Omie_Gestao.html'), t);
ed('SGO_Omie_Ganhos.js', `    var ja = lancados[i.ref] || lancados['OMIE:' + i.titulo], antes = porTitulo[i.titulo] || 0;`, `    var ja = lancados[i.ref], antes = porTitulo[i.titulo] || 0;`);
ed('SGO_Omie_Operacoes.js', `        if (OmieOps_snapshot_(atual) !== op.snapshot) OmieOps_erro_('O título mudou no Omie desde a prévia. Atualize os dados e confira uma nova prévia antes de confirmar.');`,
  `        if (OmieOps_snapshot_(atual) !== op.snapshot) OmieOps_erro_('O título mudou no Omie desde a prévia. Atualize os dados e confira uma nova prévia antes de confirmar.');
        op.consultaEm = Date.now(); // 15/11/2026: a próxima releitura (nova confirmação após "ocupado") espera 1 minuto desta`);
console.log('ok');
