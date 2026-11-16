// Painel financeiro (15/11/2026): "Posição de hoje" no alto da Visão geral, pelo resumo do próprio Omie (ObterResumoFinancas,
// uma chamada, somente leitura; estrutura e coerência conferidas no Omie real em 15/11): saldo somado das contas, a pagar e a
// receber em aberto e em atraso, e o fluxo dos próximos 10 dias com o saldo previsto como o Omie calcula.
// Uso: node patch-posicao.cjs <pasta do legado>
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
trocar(`/** 15/11/2026: vencidos a receber agrupados por cliente`, `/** 15/11/2026: posição de hoje pelo resumo do Omie (ObterResumoFinancas): saldos, abertos, atrasados e fluxo de 10 dias. */
function Omie_apiPosicao(sessionId) {
  try {
    Omie_exigirAcesso_(sessionId);
    var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
    var r = Omie_requisitar_('financas/resumo/', 'ObterResumoFinancas', { dDia: hoje, lApenasResumo: true, lExibirCategoria: false });
    var n = function (v) { var x = Number(v); return isFinite(x) ? Math.round(x * 100) / 100 : 0; };
    var cc = r.contaCorrente || {}, cp = r.contaPagar || {}, cr = r.contaReceber || {};
    if (!r.contaCorrente || !r.contaPagar || !r.contaReceber) throw new Error('O Omie não devolveu o resumo esperado. Tente de novo em um minuto.');
    var fluxo = (Array.isArray(r.fluxoCaixa) ? r.fluxoCaixa : []).map(function (d) {
      var m = String(d.dDia || '').match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
      return m ? { dia: m[3] + '-' + m[2] + '-' + m[1], pagar: n(d.vPagar), receber: n(d.vReceber), saldo: n(d.vSaldo) } : null;
    }).filter(Boolean);
    return { ok: true, saldoContas: n(cc.vTotal), limite: n(cc.vLimiteCredito), pagar: { aberto: n(cp.vTotal), atraso: n(cp.vAtraso), titulos: Number(cp.nTotal) || 0 },
      receber: { aberto: n(cr.vTotal), atraso: n(cr.vAtraso), titulos: Number(cr.nTotal) || 0 }, fluxo: fluxo, atualizadoEm: new Date().toISOString() };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/** 15/11/2026: vencidos a receber agrupados por cliente`, 'api');
gravar();

abrir('JS_Omie_Gestao.html');
trocar(`  function OmieGest_resumo_() {
    document.getElementById('omieCorpo').innerHTML = '<section><h3>Visão geral do Financeiro</h3>`, `  function OmieGest_resumo_() {
    document.getElementById('omieCorpo').innerHTML = '<section class="omie-posicao"><h3>Posição de hoje</h3><p>Pelo resumo do próprio Omie: o saldo somado das contas e o que entra e sai nos próximos 10 dias, com o saldo previsto ao fim de cada dia.</p><p id="omiePosStatus" role="status" aria-live="polite"></p><div id="omiePosCartoes" class="cadx-resumo bc-resumo"></div><div id="omiePosFluxo"></div></section>' +
      '<section class="omie-agenda"><h3>Visão geral do Financeiro</h3>`, 'html');
trocar(`    OmieGest_datas_();
    OmieGest_atualizarResumo_();
    OmieGest_agenda_();`, `    OmieGest_datas_();
    OmieGest_posicao_();
    OmieGest_atualizarResumo_();
    OmieGest_agenda_();`, 'carga');
trocar(`  // 15/11/2026: vencidos a receber por cliente (Omie_apiVencidosClientes), sob pedido`, `  // 15/11/2026: posição de hoje (Omie_apiPosicao)
  var OMIE_POS_SERIAL = 0;
  function OmieGest_posicao_() {
    var cart = document.getElementById('omiePosCartoes'), st = document.getElementById('omiePosStatus'), fl = document.getElementById('omiePosFluxo'); if (!cart) return;
    var serial = ++OMIE_POS_SERIAL, pedido = OMIE_TELA.pedido, sessao = SGO_getSessionId();
    function atual() { return serial === OMIE_POS_SERIAL && pedido === OMIE_TELA.pedido && sessao === SGO_getSessionId() && cart === document.getElementById('omiePosCartoes'); }
    st.textContent = 'Consultando o resumo do Omie…'; cart.innerHTML = ''; fl.innerHTML = '';
    google.script.run.withSuccessHandler(function (r) {
      if (!atual()) return;
      if (!r || !r.ok) { st.textContent = (r && r.mensagem) || 'Não foi possível consultar o resumo.'; return; }
      var esc = CadUI_esc_, c = function (v, rot, extra) { return '<div class="cadx-num bc-resumo-item"><span class="bc-resumo-num">' + esc(OmieGest_moeda_(v)) + '</span><span>' + esc(rot) + '</span>' + (extra ? '<span class="cadx-sub">' + esc(extra) + '</span>' : '') + '</div>'; };
      // Só o saldo das contas e o fluxo: os totais de aberto e atraso do resumo do Omie usam um recorte próprio (no ensaio real de
      // 15/11, 87,5% do saldo em aberto dos títulos vencidos); os da tela vêm dos títulos (agenda e vencidos por cliente).
      cart.innerHTML = c(r.saldoContas, 'Saldo nas contas hoje', r.limite ? 'limite ' + OmieGest_moeda_(r.limite) : 'soma das contas no Omie');
      st.textContent = 'Atualizado em ' + new Date(r.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + '. Os valores seguem os critérios do Omie (o saldo previsto considera o que o Omie tem como previsto em cada dia).';
      fl.innerHTML = r.fluxo.length ? OmieGest_tabela_(['Dia', 'A receber', 'A pagar', 'Saldo previsto (Omie)'], r.fluxo.map(function (d) { return [OmieGest_dataBr_(d.dia), OmieGest_moeda_(d.receber), OmieGest_moeda_(d.pagar), OmieGest_moeda_(d.saldo)]; })) : '';
    }).withFailureHandler(function () { if (atual()) st.textContent = 'Não foi possível comunicar com o servidor. Tente novamente.'; })
      .Omie_apiPosicao(sessao);
  }
  // 15/11/2026: vencidos a receber por cliente (Omie_apiVencidosClientes), sob pedido`, 'js');
gravar();
console.log('ok');
