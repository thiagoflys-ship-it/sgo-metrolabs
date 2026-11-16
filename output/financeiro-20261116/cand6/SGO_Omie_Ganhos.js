/**
 * SGO_Omie_Ganhos.js — recebimentos do Omie como sugestões em Ganhos dos vendedores (15/11/2026, etapa 2 combinada em 12/11:
 * "Omie automático = próxima etapa"). SOMENTE LEITURA do Omie: nada é lançado sozinho. O Financeiro escolhe a proposta e lança
 * pelo formulário de sempre (GV_lancarRecebimento_), com todas as travas (proposta aprovada, ninguém lança a própria venda,
 * duplicidade, total da proposta, mês congelado). A referência OMIE:<código do título> impede lançar o mesmo título duas vezes.
 * Ligação: CNPJ do título no Omie -> cliente do SGO+ (CAD_CLIENTES.CNPJ) -> propostas aprovadas desse cliente com saldo.
 * Omie: ListarMovimentos (financas/mf) com cTpLancamento CR e dDtPagtoDe/Ate (conferido no Omie real em 15/11: 49 de 49 com
 * CNPJ e data de pagamento); nomes por ListarClientes com clientesPorCodigo.
 */
function GV_omieDisponivel_() {
  try {
    if (typeof Omie_requisitar_ !== 'function') return false;
    var p = PropertiesService.getScriptProperties();
    return !!(String(p.getProperty('OMIE_APP_KEY') || '').trim() && String(p.getProperty('OMIE_APP_SECRET') || '').trim());
  } catch (e) { return false; }
}
// Omie_nomesClientes_ fica em SGO_Omie.js (15/11/2026: usado também pela agenda e pelos vencidos).
function GV_omieRecebimentos_(eu, d) {
  d = d || {};
  GV_exigir_(eu, 'GANHOS_RECEBIMENTOS', 'ver os recebimentos do Omie');
  // 15/11/2026 (revisão): ler o Omie exige também a caixa de consulta do Painel financeiro
  // 16/11/2026: sigilo do Financeiro antes da caixa (a trava registra a recusa)
  if (typeof Omie_exigirSigilo_ !== 'function') throw new Error('O Financeiro é sigiloso. Nada foi consultado.');
  Omie_exigirSigilo_({ userId: eu && (eu.userId || eu.id), usuario: eu && (eu.usuario || eu.login), nome: eu && eu.nome }, 'GV_omieRecebimentos_');
  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function' && !SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) throw new Error(Poderes_msgSemPoder_(Poderes_poder_('FIN_OMIE_CONSULTAR'), 'ver os recebimentos do Omie'));
  if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_({ userId: eu && (eu.userId || eu.id), usuario: eu && (eu.usuario || eu.login), nome: eu && eu.nome }, 'PERMITIDO', 'GV_omieRecebimentos_');
  if (!GV_omieDisponivel_()) throw new Error('Não foi possível consultar o Omie: a conexão com o Omie não está configurada. Avise o responsável pelo sistema; enquanto isso, lance pelo formulário.');
  var comp = GV_comp_(d.competencia) || GV_compAtual_();
  if (comp > GV_compAtual_()) throw new Error('Não foi possível consultar: o mês ' + GV_compBr_(comp) + ' ainda não começou.');
  var m = /^(\d{4})-(\d{2})$/.exec(comp), ultimo = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  var de = '01/' + m[2] + '/' + m[1], ateIso = comp + '-' + GV_2_(ultimo);
  if (ateIso > GV_hoje_()) ateIso = GV_hoje_();
  var ate = ateIso.slice(8, 10) + '/' + ateIso.slice(5, 7) + '/' + ateIso.slice(0, 4);
  var itens = [], vistos = {}, pagina = 1, paginas = 1;
  do {
    var r = Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: pagina, nRegPorPagina: 50, cTpLancamento: 'CR', dDtPagtoDe: de, dDtPagtoAte: ate });
    if (Object.keys(r).length && !Array.isArray(r.movimentos)) throw new Error('O Omie não devolveu os recebimentos esperados. Tente de novo em um minuto.');
    paginas = Number(r.nTotPaginas) || 0;
    if (paginas > 20) throw new Error('O mês tem mais de 1.000 recebimentos no Omie; esta lista mostra até 1.000. Avise o responsável pelo sistema.');
    (r.movimentos || []).forEach(function (mv) {
      var x = mv.detalhes || {}, s = mv.resumo || {};
      if (String(x.cNatureza || '') !== 'R' || !x.nCodTitulo || vistos[x.nCodTitulo]) return;
      vistos[x.nCodTitulo] = true;
      if (GV_up_(x.cStatus) === 'CANCELADO') return;
      var pago = Number(s.nValPago), pg = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(x.dDtPagamento || ''));
      if (!(pago > 0) || !pg) return;
      var dia = pg[3] + '-' + pg[2] + '-' + pg[1];
      if (dia.slice(0, 7) !== comp) return;
      var doc = GV_s_(x.cNumDocFiscal) ? 'NF ' + GV_s_(x.cNumDocFiscal) : GV_s_(x.cNumTitulo) || ('título ' + x.nCodTitulo);
      if (GV_s_(x.cNumParcela) && GV_s_(x.cNumParcela) !== '001/001') doc += ' parcela ' + GV_s_(x.cNumParcela);
      // retenções (PIS, COFINS, CSLL, IR, ISS, INSS) e desconto explicam a diferença entre o título e o recebido: não é parcial
      var ret = 0;
      ['PIS', 'COFINS', 'CSLL', 'IR', 'ISS', 'INSS'].forEach(function (k) { if (GV_up_(x['cRet' + k]) === 'S') ret += Number(x['nValor' + k]) || 0; });
      var abat = ret + (Number(x.nDesconto) || 0);
      itens.push({ ref: 'OMIE:' + x.nCodTitulo + ':' + dia, titulo: String(x.nCodTitulo), retencoes: GV_r2_(ret), retencoesBr: ret > 0 ? GV_moeda_(ret) : '', codigoCliente: Number(x.nCodCliente) || 0, cnpj: GV_s_(x.cCPFCNPJCliente).replace(/\D/g, ''), data: dia, dataBr: GV_brDia_(dia),
        valor: GV_r2_(pago), valorBr: GV_moeda_(pago), documento: doc.slice(0, 120), parcial: GV_cent_(pago) + GV_cent_(abat) < GV_cent_(Number(x.nValorTitulo) || 0) - 1 });
    });
    pagina++;
  } while (pagina <= paginas);
  var codigos = [];
  itens.forEach(function (i) { if (i.codigoCliente && codigos.indexOf(i.codigoCliente) < 0) codigos.push(i.codigoCliente); });
  var nomes = codigos.length ? Omie_nomesClientes_(codigos) : {};
  // clientes do SGO+ por CNPJ e propostas aprovadas por cliente
  var porCnpj = {};
  GV_ler_('CAD_CLIENTES').forEach(function (c) { var k = GV_s_(c.CNPJ).replace(/\D/g, ''); if (k) (porCnpj[k] = porCnpj[k] || []).push(GV_s_(c.ID)); });
  var props = GV_propostas_(), porCliente = {};
  Object.keys(props).forEach(function (id) {
    var p = props[id];
    if (GV_up_(p.SITUACAO) !== 'APROVADA' || GV_s_(p.EXCLUIDA_EM) || !GV_s_(p.CLIENTE_ID)) return;
    (porCliente[GV_s_(p.CLIENTE_ID)] = porCliente[GV_s_(p.CLIENTE_ID)] || []).push(p);
  });
  // 15/11/2026: referência por pagamento (OMIE:<título>:<data>); o que já foi lançado do mesmo título (em qualquer data, inclusive
  // a referência antiga OMIE:<título>) é descontado da sugestão, porque o Omie dá o valor pago acumulado do título.
  var lancados = {}, porTitulo = {}, ultimoDoTitulo = {};
  GV_recebimentos_().forEach(function (x) {
    var r = GV_s_(x.REF_EXTERNA), m = /^OMIE:(\d+)/.exec(r);
    if (GV_up_(x.SITUACAO) === 'ANULADO' || !m) return;
    lancados[r] = x; porTitulo[m[1]] = (porTitulo[m[1]] || 0) + GV_cent_(x.VALOR); ultimoDoTitulo[m[1]] = x;
  });
  var totais = { recebido: 0, lancado: 0, pendente: 0 };
  itens.forEach(function (i) {
    i.cliente = nomes[String(i.codigoCliente)] || '';
    delete i.codigoCliente;
    var ja = lancados[i.ref], antes = porTitulo[i.titulo] || 0;
    if (!ja && antes > 0) {
      i.jaLancadoAntes = GV_moeda_(antes / 100);
      i.valor = GV_r2_(Math.max(0, GV_cent_(i.valor) - antes) / 100); i.valorBr = GV_moeda_(i.valor);
      if (!(i.valor > 0)) ja = ultimoDoTitulo[i.titulo] || { PROPOSTA_NUMERO: '', SITUACAO: 'VALIDO', LANCADO_POR_NOME: 'lançamentos anteriores deste título' };
    }
    delete i.titulo;
    i.jaLancado = ja ? { proposta: GV_s_(ja.PROPOSTA_NUMERO), situacao: GV_recParaTela_(ja).situacaoNome, lancadoPor: GV_s_(ja.LANCADO_POR_NOME) } : null;
    var idsCli = porCnpj[i.cnpj] || [], cand = [];
    idsCli.forEach(function (cid) { (porCliente[cid] || []).forEach(function (p) { cand.push(p); }); });
    i.clienteNoSgo = idsCli.length > 0;
    i.propostas = cand.map(function (p) {
      var v = GV_vendedorDaProposta_(p), rec = GV_recebidoDaProposta_(p.ID, ''), saldo = Math.max(0, GV_r2_(p.TOTAL) - rec);
      return { id: GV_s_(p.ID), numero: GV_rotuloProposta_(p), cliente: GV_s_(p.CLIENTE_NOME), titulo: GV_s_(p.TITULO), total: GV_r2_(p.TOTAL), totalBr: GV_moeda_(p.TOTAL),
        recebido: rec, recebidoBr: GV_moeda_(rec), saldo: saldo, saldoBr: GV_moeda_(saldo), vendedor: v ? v.nome : '', semVendedor: !v, cabe: GV_cent_(saldo) >= GV_cent_(i.valor),
        _ord: GV_iso_(p.RESPOSTA_EM || p.ASSINADA_EM || p.ATUALIZADO_EM) };
    }).sort(function (a, b) { return a.cabe !== b.cabe ? (a.cabe ? -1 : 1) : (a._ord < b._ord ? 1 : -1); }).slice(0, 5).map(function (x) { delete x._ord; return x; });
    totais.recebido += GV_cent_(i.valor);
    if (ja) totais.lancado += GV_cent_(i.valor); else totais.pendente += GV_cent_(i.valor);
  });
  itens.sort(function (a, b) { return (a.jaLancado ? 1 : 0) - (b.jaLancado ? 1 : 0) || (a.data < b.data ? -1 : a.data > b.data ? 1 : 0); });
  return { competencia: comp, competenciaBr: GV_compBr_(comp), de: GV_brDia_(comp + '-01'), ate: GV_brDia_(ateIso), itens: itens,
    totais: { recebidoBr: GV_moeda_(totais.recebido / 100), lancadoBr: GV_moeda_(totais.lancado / 100), pendenteBr: GV_moeda_(totais.pendente / 100) },
    pendentes: itens.filter(function (i) { return !i.jaLancado; }).length, atualizadoEm: GV_br_(GV_agora_()) };
}
