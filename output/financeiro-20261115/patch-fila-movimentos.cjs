// Painel financeiro (15/11/2026, item 6 da revisão): resumo do período, agenda e vencidos por cliente usam o mesmo método do Omie
// (ListarMovimentos), que recusa chamadas simultâneas. Uma fila na tela faz uma de cada vez (inclusive quando a pessoa toca em
// "Ver vencidos" enquanto a Visão geral carrega). A espera aparece no aviso de cada bloco.
// Uso: node patch-fila-movimentos.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const f = path.join(process.argv[2], 'JS_Omie_Gestao.html');
let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
function ed(a, b) { a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl); if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez: ' + a.slice(0, 80)); t = t.replace(a, () => b); }
// fila
ed(`  // 15/11/2026: fim (opcional) roda ao terminar, com sucesso ou não, para encadear consultas do mesmo método do Omie
  function OmieGest_chamar_(fn, payload, ok, fim) {`, `  // 15/11/2026: fila das consultas que usam ListarMovimentos no Omie (resumo, agenda, vencidos): uma de cada vez.
  var OMIE_MOV = { ocupado: false, fila: [] };
  function OmieGest_movFila_(executar) { OMIE_MOV.fila.push(executar); OmieGest_movProximo_(); }
  function OmieGest_movProximo_() {
    if (OMIE_MOV.ocupado || !OMIE_MOV.fila.length) return;
    OMIE_MOV.ocupado = true;
    var f = OMIE_MOV.fila.shift(), feito = false;
    var liberar = function () { if (feito) return; feito = true; OMIE_MOV.ocupado = false; OmieGest_movProximo_(); };
    setTimeout(liberar, 90000); // segurança: resposta perdida não prende a fila
    try { f(liberar); } catch (e) { liberar(); }
  }
  // 15/11/2026: fim (opcional) roda sempre ao terminar, com sucesso ou não; recebe true se a tela ainda é a mesma
  function OmieGest_chamar_(fn, payload, ok, fim) {`);
ed(`    var acabou = function () { if (fim && atual()) { try { fim(); } catch (e) {} } };`, `    var acabou = function () { if (fim) { try { fim(atual()); } catch (e) {} } };`);
// resumo e agenda entram na fila; a agenda não precisa mais esperar pelo "depois"
ed(`    // 15/11/2026: resumo e agenda usam o mesmo método do Omie (ListarMovimentos), que recusa chamadas simultâneas: a agenda
    // começa quando o resumo termina. A posição usa outro método e vai junto.
    OmieGest_atualizarResumo_(OmieGest_agenda_);`, `    // 15/11/2026: resumo e agenda usam o mesmo método do Omie (ListarMovimentos), que recusa chamadas simultâneas: os dois
    // entram na fila (OmieGest_movFila_), um depois do outro. A posição usa outro método e vai junto.
    OmieGest_atualizarResumo_();
    OmieGest_agenda_();`);
ed(`    document.getElementById('omieGestAtualizado').textContent = '';
    OmieGest_chamar_('Omie_apiResumo',`, `    document.getElementById('omieGestAtualizado').textContent = '';
    var stR = document.getElementById('omieGestStatus'); if (stR && OMIE_MOV.ocupado) stR.textContent = 'Aguardando a consulta anterior ao Omie terminar…';
    OmieGest_movFila_(function (liberar) { OmieGest_chamar_('Omie_apiResumo',`);
ed(`    }, depois);
  }`, `    }, function (vale) { liberar(); if (vale && depois) depois(); }); });
  }`);
ed(`    st.textContent = 'Consultando a agenda no Omie…'; tot.innerHTML = ''; lista.innerHTML = CadUI_esqueleto_(3);
    google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;`, `    st.textContent = OMIE_MOV.ocupado ? 'Aguardando a consulta anterior ao Omie terminar…' : 'Consultando a agenda no Omie…'; tot.innerHTML = ''; lista.innerHTML = CadUI_esqueleto_(3);
    OmieGest_movFila_(function (liberar) {
    if (!atual()) { liberar(); return; }
    st.textContent = 'Consultando a agenda no Omie…';
    google.script.run.withSuccessHandler(function (r) {
      liberar();
      if (!atual()) return;`);
ed(`    }).withFailureHandler(function () { if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiAgenda(sessao, { dias: Number(dias), natureza: nat });
  }`, `    }).withFailureHandler(function () { liberar(); if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiAgenda(sessao, { dias: Number(dias), natureza: nat });
    });
  }`);
ed(`    st.textContent = 'Consultando os vencidos no Omie…'; lista.innerHTML = CadUI_esqueleto_(3);
    google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;`, `    st.textContent = OMIE_MOV.ocupado ? 'Aguardando a consulta anterior ao Omie terminar…' : 'Consultando os vencidos no Omie…'; lista.innerHTML = CadUI_esqueleto_(3);
    OmieGest_movFila_(function (liberar) {
    if (!atual()) { liberar(); return; }
    st.textContent = 'Consultando os vencidos no Omie…';
    google.script.run.withSuccessHandler(function (r) {
      liberar();
      if (!atual()) return;`);
ed(`    }).withFailureHandler(function () { if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiVencidosClientes(sessao);
  }`, `    }).withFailureHandler(function () { liberar(); if (atual()) { st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; lista.innerHTML = ''; } })
      .Omie_apiVencidosClientes(sessao);
    });
  }`);
fs.writeFileSync(f, t);
console.log('ok');
