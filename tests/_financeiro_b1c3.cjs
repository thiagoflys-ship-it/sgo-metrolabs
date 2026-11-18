'use strict';
// 18/11/2026 (Financeiro: B1 aprovação de pagamentos, C3 orçamento anual e as pendências da onda 1: lançamento avulso na conta corrente e
// parcelamento). Ambiente comum: o código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_a.cjs, sobre o bloco B), mais os três
// arquivos novos. Nada sai para a rede: nenhum Omie, Caju, Gemini ou e-mail real (SGO_notificar_ é trocado por um registro na memória).
const vm = require('node:vm');
const A = require('./_financeiro_onda_a.cjs');

const EXTRAS_B1C3 = ['SGO_Financeiro_Pagamentos.js', 'SGO_Financeiro_Orcamento.js', 'SGO_Financeiro_ContaCorrente.js'];
const brDe = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

// contas a pagar em aberto no Omie simulado (hoje = 16/11/2026): 101 vencida (o título que a ConsultarContaPagar devolve), 102 vence
// hoje, 103 vence em 10 dias, 104 em 60 dias (fora dos 30 dias), 105 pequena (para a dispensa) vencida
const PAGAR = [
  { codigo_lancamento_omie: 101, numero_documento: 'NF-001', codigo_cliente_fornecedor: 90, codigo_categoria: '2.10', id_conta_corrente: 5, venc: '2026-11-10', valor_documento: 1000, status_titulo: 'ATRASADO' },
  { codigo_lancamento_omie: 102, numero_documento: 'BOL-102', codigo_cliente_fornecedor: 91, codigo_categoria: '2.03', id_conta_corrente: 5, venc: '2026-11-16', valor_documento: 2500.5, status_titulo: 'VENCE HOJE' },
  { codigo_lancamento_omie: 103, numero_documento: 'BOL-103', codigo_cliente_fornecedor: 90, codigo_categoria: '2.10', id_conta_corrente: 5, venc: '2026-11-26', valor_documento: 800, status_titulo: 'A VENCER' },
  { codigo_lancamento_omie: 104, numero_documento: 'BOL-104', codigo_cliente_fornecedor: 92, codigo_categoria: '2.10', id_conta_corrente: 5, venc: '2027-01-15', valor_documento: 300, status_titulo: 'A VENCER' },
  { codigo_lancamento_omie: 105, numero_documento: 'TAR-105', codigo_cliente_fornecedor: 92, codigo_categoria: '2.03', id_conta_corrente: 5, venc: '2026-11-12', valor_documento: 45.9, status_titulo: 'ATRASADO' }
];

/** Ambiente: o.agora (padrão segunda 16/11/2026 10:00), o.foto, o.expediente (padrão true). */
function montarB1C3(o) {
  o = o || {};
  const a = A.montarA({ agora: o.agora, foto: o.foto, extras: EXTRAS_B1C3.concat(o.extras || []) });
  a.pagar = PAGAR.map((x) => Object.assign({}, x));
  a.avisos = []; a.expediente = o.expediente !== false; a.seqLcc = 5000; a.orcPorMes = {}; a.falharNa = {}; a.contagem = {};
  a.ctx.SGO_notificar_ = (op) => { a.avisos.push(JSON.parse(JSON.stringify(op))); return { ok: 1 }; };
  a.ctx.SGO_dentroDoExpediente_ = () => (a.expediente ? { dentro: true, hora: '10:00' } : { dentro: false, motivo: 'fora do expediente' });
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  const hojeIso = () => new a.ctx.Date().toISOString().slice(0, 10);
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      // falha na N-ésima chamada de um método (ex.: a 2ª parcela): a.falharNa.IncluirContaPagar = { n: 2, erro: {...} | 'transporte' }
      a.contagem[b.call] = (a.contagem[b.call] || 0) + 1;
      const fn = a.falharNa[b.call];
      if (fn && fn.n === a.contagem[b.call]) { a.omie.push({ url, call: b.call, param: p, falhou: true }); if (fn.erro === 'transporte') throw new Error('rede caiu'); return resp(500, fn.erro); }
      const falha = a.falhas[b.call];
      if (!(falha && falha.length)) {
        if (b.call === 'ListarContasPagar' && p.filtrar_por_status) {
          a.omie.push({ url, call: b.call, param: p });
          const hoje = hojeIso();
          const l = a.pagar.filter((t) => (p.filtrar_por_status === 'ATRASADO' ? t.venc < hoje : p.filtrar_por_status === 'VENCEHOJE' ? t.venc === hoje : t.venc > hoje))
            .map((t) => Object.assign({}, t, { data_vencimento: brDe(t.venc), data_previsao: brDe(t.venc) }));
          if (!l.length) return resp(500, { faultstring: 'ERROR: Não existem registros para a página [1]!', faultcode: 'SOAP-ENV:Client-5113' });
          return resp(200, { pagina: 1, total_de_paginas: 1, conta_pagar_cadastro: l });
        }
        // os outros títulos a pagar da lista (o 101 continua sendo o a.titulo do ambiente base)
        const outro = b.call === 'ConsultarContaPagar' && Number(p.codigo_lancamento_omie) !== 101 && a.pagar.find((t) => t.codigo_lancamento_omie === Number(p.codigo_lancamento_omie));
        if (outro) { a.omie.push({ url, call: b.call, param: p }); return resp(200, Object.assign({}, outro, { data_vencimento: brDe(outro.venc), data_previsao: brDe(outro.venc), status_titulo: 'EMABERTO' })); }
        if (b.call === 'IncluirLancCC') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { nCodLanc: ++a.seqLcc, cCodIntLanc: p.cCodIntLanc, cCodStatus: '0', cDesStatus: 'Lançamento incluído com sucesso!' }); }
        if (b.call === 'ConsultarCategoria' && p.codigo === '9.01') { a.omie.push({ url, call: b.call, param: p }); return resp(200, { codigo: '9.01', descricao: 'Transferência', transferencia: 'S', conta_despesa: 'S' }); }
        if (b.call === 'ListarOrcamentos' && a.orcPorMes[p.nAno + '-' + ('0' + p.nMes).slice(-2)]) {
          a.omie.push({ url, call: b.call, param: p });
          return resp(200, { nAno: p.nAno, nMes: p.nMes, ListaOrcamentos: a.orcPorMes[p.nAno + '-' + ('0' + p.nMes).slice(-2)] });
        }
      }
    }
    return anterior(url, op);
  };
  a.itensPag = () => a.tabelas.FIN_PAG_ITENS || [];
  a.versoes = () => a.tabelas.FIN_ORC_VERSOES || [];
  a.limparCache = () => { Object.keys(a.cache).filter((k) => /^OMIE_RESP_|^OMIE_ULT_/.test(k)).forEach((k) => delete a.cache[k]); };
  return a;
}
/** Wanessa envia a lista; o dono ou a Diretoria aprova todos. Devolve os itens. */
function listaAprovada(a, ids, quemAprova) {
  const e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: ids || [101] });
  if (!e.ok) throw new Error('enviar: ' + e.mensagem);
  const d = a.F('OmiePag_apiDecidir', quemAprova || 'dora', { decisao: 'aprovar_todos' });
  if (!d.ok) throw new Error('aprovar: ' + d.mensagem);
  return a.itensPag();
}
module.exports = Object.assign({}, A, { montarB1C3, listaAprovada, EXTRAS_B1C3, PAGAR, brDe });
