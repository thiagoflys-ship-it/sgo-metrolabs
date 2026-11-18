'use strict';
// 18/11/2026 (Onda A do Financeiro: A1 contas fixas, A3 fechamento do mês, A4 trilha das operações e estorno de baixa).
// Ambiente comum dos testes da onda: o código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_bloco_b.cjs e _financeiro_simulado.cjs),
// mais os três arquivos novos. Nada sai para a rede: nenhum Omie, Caju, Gemini ou e-mail real.
const vm = require('node:vm');
const B = require('./_financeiro_bloco_b.cjs');

const EXTRAS = ['SGO_Financeiro_Trilha.js', 'SGO_Financeiro_ContasFixas.js', 'SGO_Financeiro_Fechamento.js'];

/**
 * Ambiente da onda A. o.agora (ISO, padrão segunda 16/11/2026 10:00), o.foto (true: fotografia de 16/11 pronta).
 * Respostas do Omie simulado para as chamadas novas: LancarRecebimento/LancarPagamento devolvem codigo_baixa (a.proximaBaixa);
 * CancelarRecebimento/CancelarPagamento/ExcluirContaPagar respondem "0" (ou o que estiver em a.falhas[chamada]).
 */
function montarA(o) {
  o = o || {};
  const a = B.montarB({ extras: EXTRAS.concat(o.extras || []) });
  if (typeof a.ctx.SGO_ehPerfilRH_ !== 'function') a.ctx.SGO_ehPerfilRH_ = (p) => String(p || '').toUpperCase() === 'RH';
  if (o.foto) { a.em('2026-11-16T06:15:00-03:00'); a.limpar(); const r = a.foto(); if (!r.concluida) throw new Error('fotografia: ' + JSON.stringify(r)); }
  a.em(o.agora || '2026-11-16T10:00:00-03:00');
  a.proximaBaixa = 7001;
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (!(a.falhas[b.call] && a.falhas[b.call].length)) {
        if (b.call === 'LancarRecebimento' || b.call === 'LancarPagamento') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { codigo_lancamento: p.codigo_lancamento, codigo_baixa: a.proximaBaixa++, codigo_status: '0', descricao_status: 'Baixa registrada com sucesso!' }); }
        if (/^Cancelar(Pagamento|Recebimento)$/.test(b.call)) { a.omie.push({ url, call: b.call, param: p }); return resp(200, { codigo_baixa: p.codigo_baixa, codigo_status: '0', descricao_status: 'Baixa cancelada com sucesso!' }); }
        if (b.call === 'ExcluirContaPagar') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { codigo_lancamento_omie: p.codigo_lancamento_omie, codigo_status: '0', descricao_status: 'Lançamento excluído com sucesso!' }); }
      }
    }
    return anterior(url, op);
  };
  a.F = (fn, login, dados) => { vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_();', a.ctx); return JSON.parse(JSON.stringify(a.ctx[fn]('s_' + login, dados || {}))); };
  a.trilha = () => a.tabelas.FIN_OMIE_OPERACOES || [];
  a.pedidos = () => a.tabelas.FIN_OMIE_PEDIDOS || [];
  a.acessos = () => a.tabelas.FIN_OMIE_ACESSOS || [];
  a.pend = (login) => {
    const u = a.tabelas.CAD_USUARIOS.find((x) => x.USUARIO === login);
    return a.j(a.ctx.Pend_calcular_({ userId: u.ID, perfil: u.PERFIL, gestao: ['ADMIN', 'DIRETORIA', 'GESTOR'].includes(u.PERFIL) })).itens;
  };
  a.pendInterno = () => a.j(a.ctx.Pend_calcular_(a.ctx.Pend_contextoInterno_())).itens;
  return a;
}
/** Uma baixa a receber confirmada no Omie pelo SGO+ (título 101, R$ 400,00), feita pela Wanessa. Devolve a linha da trilha. */
function baixaConfirmada(a, valor) {
  const p = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: valor || 400, data: '2026-11-16', observacao: 'Recebimento PIX' } });
  if (!p.ok) throw new Error('prévia: ' + p.mensagem);
  const c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  if (!c.ok) throw new Error('confirmar: ' + c.mensagem);
  return a.trilha().filter((l) => l.ACAO === 'BAIXA').slice(-1)[0];
}
module.exports = Object.assign({}, B, { montarA, baixaConfirmada, EXTRAS });
