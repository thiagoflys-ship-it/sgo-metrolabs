/****************************************************
 * COMPRAS — "INFORMAR COMPRA JÁ FEITA", PARCELAS E A FATURA DE CADA PARCELA (31/10/2026)
 *
 * Pedido do dono (31/10/2026): "Hoje várias pessoas compram com os cartões da empresa e colocam no grupo do WhatsApp
 * 'compra minha para X cliente'. Quero que crie no módulo de compra: informar compra, informar o orçamento ou pedido de
 * compra, informar cliente, informar o produto, comprovante e dados de como a compra foi feita, qual cartão ou faturado,
 * à vista ou parcelas [...] precisa ter rastreabilidade". Estudo: ESTUDO_COMPRAS_20261031 (decisões pela recomendação).
 *
 * A compra informada entra no MESMO cadastro das compras do fluxo normal (CMP_REQUISICOES + CMP_PEDIDOS, número REQ-AAAA-NNNN,
 * ORIGEM = INFORMADA), para todo relatório e a conferência do Financeiro verem tudo. Ela substitui o antigo "Registrar
 * compra feita fora do sistema" (decisão 1): até o limite da compra direta (padrão R$ 1.000) não vai à ciência da gestão;
 * acima, vai (INF_CIENCIA = SIM). As conferências na hora são as da Frota (leva 2): o que é impossível é recusado com o
 * motivo; o resto grava com o apontamento ("duplicidade possível", "acima do comum", "informada com atraso").
 *
 * Parcelas (CMP_PARCELAS): toda compra paga (informada ou do fluxo normal, ao registrar o pagamento) ganha as suas parcelas:
 *  - cartão de crédito: uma por parcela, cada uma com a fatura em que cai (COMPETENCIA = mês do vencimento da fatura), pela
 *    regra do fechamento do cartão cadastrado: compra antes do dia do fechamento entra na fatura que fecha no mesmo mês; no
 *    dia do fechamento ou depois, na seguinte; vencimento no mesmo mês do fechamento se o dia do vencimento for maior, senão
 *    no mês seguinte. A diferença de centavos fica na primeira parcela. Cartão ainda não cadastrado: fatura estimada (mês
 *    seguinte ao da compra, ESTIMADA = SIM), recalculada quando o cartão for cadastrado (CmpCart_religar_);
 *  - faturado e boleto: uma parcela "A pagar" no vencimento informado; reembolso: "A pagar" ao colaborador em 5 dias úteis;
 *  - Pix, transferência, débito e dinheiro do caixa: uma parcela já paga na data da compra (confere pelo comprovante).
 * Nenhuma função devolve Date cru.
 ****************************************************/

var CMP_ORIGEM_INFORMADA = 'INFORMADA';
var CMP_PARC_SIT = { A_CONCILIAR: 'A conciliar', CONCILIADA: 'Conciliada', NAO_ESTA_NA_FATURA: 'Não está na fatura', DIVERGENTE: 'Divergente', A_PAGAR: 'A pagar', PAGA: 'Paga', CANCELADA: 'Cancelada' };
/** Vínculos da tela "Informar compra" (CHAMADO vira CLIENTE + número do chamado; os demais são os de CMP_VINCULOS). */
var CMP_VINCULOS_INFORMAR = { CHAMADO: 'Chamado da Assistência técnica', CLIENTE: 'Cliente (atendimento ou O.S.)', COMERCIAL: 'Pedido aprovado do Comercial', VEICULO: 'Veículo da Frota', INTERNO: 'Uso interno ou centro de custo' };
var CMP_VALOR_MAX_INFORMAR = 500000;
var CMP_RX_COMPROVANTE = /\.(pdf|png|jpe?g|webp|heic)$/i;

function CmpI_ms_(dia, hora) { var d = Cmp_dia_(dia); return d ? Date.parse(d + 'T' + (hora || '12:00') + ':00-03:00') : null; }
function CmpI_addMes_(comp, n) {
  var m = /^(\d{4})-(\d{2})/.exec(Cmp_s_(comp));
  if (!m) return '';
  var t = Number(m[1]) * 12 + (Number(m[2]) - 1) + (n || 0);
  return Math.floor(t / 12) + '-' + Cmp_2_(t % 12 + 1);
}
function CmpI_ultimoDia_(comp) { var m = /^(\d{4})-(\d{2})/.exec(comp); return new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate(); }
function CmpI_diaNoMes_(comp, dia) { return comp + '-' + Cmp_2_(Math.min(Number(dia) || 1, CmpI_ultimoDia_(comp))); }
function CmpI_competenciaNome_(comp) { return typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp; }

/**
 * Fatura em que cai a compra de um dia num cartão. cartao: linha de CMP_CARTOES (ou null).
 * Devolve { competencia: 'aaaa-mm' (mês do vencimento), fechamento: 'aaaa-mm-dd', vencimento: 'aaaa-mm-dd', estimada }.
 */
function CmpI_faturaDe_(diaCompra, cartao) {
  var dia = Cmp_dia_(diaCompra);
  var fech = Number(cartao && cartao.DIA_FECHAMENTO) || 0, venc = Number(cartao && cartao.DIA_VENCIMENTO) || 0;
  if (!dia) return { competencia: '', fechamento: '', vencimento: '', estimada: true };
  var mesCompra = dia.slice(0, 7);
  if (!(fech >= 1 && fech <= 31) || !(venc >= 1 && venc <= 31)) {
    var compE = CmpI_addMes_(mesCompra, 1);
    return { competencia: compE, fechamento: '', vencimento: CmpI_diaNoMes_(compE, 10), estimada: true };
  }
  var mesFech = Number(dia.slice(8, 10)) < Math.min(fech, CmpI_ultimoDia_(mesCompra)) ? mesCompra : CmpI_addMes_(mesCompra, 1);
  var mesVenc = venc > fech ? mesFech : CmpI_addMes_(mesFech, 1);
  return { competencia: mesVenc, fechamento: CmpI_diaNoMes_(mesFech, fech), vencimento: CmpI_diaNoMes_(mesVenc, venc), estimada: false };
}

/** Valores das parcelas em centavos: iguais, com a diferença do arredondamento na primeira. */
function CmpI_valoresParcelas_(total, n) {
  n = Math.max(1, Math.round(Number(n) || 1));
  var cent = Math.round((Number(total) || 0) * 100), base = Math.floor(cent / n), resto = cent - base * n, l = [];
  for (var i = 0; i < n; i++) l.push((base + (i === 0 ? resto : 0)) / 100);
  return l;
}

/** Formas que ficam "A pagar" até o Financeiro baixar; as demais nascem pagas (exceto o crédito, que vai para a fatura). */
var CMP_FORMAS_A_PAGAR = ['FATURADO', 'BOLETO', 'REEMBOLSO'];

/**
 * Monta (sem gravar) as parcelas de um pagamento. p: campos do pedido (FORMA_PAGAMENTO, CARTAO_FINAL, PARCELAS, BOLETO_VENCIMENTO,
 * REEMBOLSO_PARA_ID/NOME, VALOR_PAGO ou VALOR_TOTAL); diaCompra: 'aaaa-mm-dd'; cartoes: linhas de CMP_CARTOES.
 */
function CmpI_montarParcelas_(p, diaCompra, cartoes) {
  var f = Cmp_up_(p.FORMA_PAGAMENTO), total = Cmp_r2_(Cmp_s_(p.VALOR_PAGO) !== '' ? p.VALOR_PAGO : p.VALOR_TOTAL), dia = Cmp_dia_(diaCompra) || Cmp_hoje_();
  var base = { FORMA: f, CARTAO_FINAL: Cmp_s_(p.CARTAO_FINAL), CARTAO_ID: '', DATA_COMPRA: dia, ESTIMADA: '', BENEFICIARIO_ID: '', BENEFICIARIO_NOME: '' };
  if (f === 'CARTAO_CREDITO') {
    var cart = CmpCart_porFinal_(p.CARTAO_FINAL, cartoes);
    if (cart) base.CARTAO_ID = Cmp_s_(cart.ID);
    var fat = CmpI_faturaDe_(dia, cart), n = Math.max(1, Number(p.PARCELAS) || 1);
    return CmpI_valoresParcelas_(total, n).map(function (v, i) {
      var comp = CmpI_addMes_(fat.competencia, i);
      return Object.assign({}, base, { PARCELA: i + 1, PARCELAS: n, VALOR: v, COMPETENCIA: comp, VENCIMENTO: fat.vencimento ? CmpI_diaNoMes_(comp, Number(fat.vencimento.slice(8, 10))) : '',
        ESTIMADA: fat.estimada ? 'SIM' : '', SITUACAO: 'A_CONCILIAR' });
    });
  }
  var um = Object.assign({}, base, { PARCELA: 1, PARCELAS: 1, VALOR: total, COMPETENCIA: dia.slice(0, 7) });
  if (f === 'FATURADO' || f === 'BOLETO') { var v = Cmp_dia_(p.BOLETO_VENCIMENTO) || dia; um.VENCIMENTO = v; um.COMPETENCIA = v.slice(0, 7); um.SITUACAO = 'A_PAGAR'; }
  else if (f === 'REEMBOLSO') {
    var dias = Number(Cmp_regras_().informar.reembolsoDiasUteis) || 5, vr = Cmp_somarDiasUteis_(Cmp_hoje_() > dia ? Cmp_hoje_() : dia, dias);
    um.VENCIMENTO = vr; um.COMPETENCIA = vr.slice(0, 7); um.SITUACAO = 'A_PAGAR'; um.BENEFICIARIO_ID = Cmp_s_(p.REEMBOLSO_PARA_ID); um.BENEFICIARIO_NOME = Cmp_s_(p.REEMBOLSO_PARA_NOME);
  } else { um.VENCIMENTO = dia; um.SITUACAO = 'PAGA'; um.PAGO_EM = dia; um.PAGO_POR_NOME = 'Pago na compra (' + (CMP_FORMAS_PAGAMENTO[f] || f) + ')'; }
  return [um];
}

/**
 * (Re)gera as parcelas de um pedido. As parcelas que já andaram (conciliadas ou pagas) ficam; as outras são marcadas
 * CANCELADA (nada é apagado) e nascem de novo pelo pagamento atual. Chamar dentro da trava. Devolve as parcelas novas.
 */
function CmpI_gerarParcelas_(ped, req, eu) {
  if (!ped || !Cmp_s_(ped.FORMA_PAGAMENTO)) return [];
  var agora = Cmp_agora_(), atuais = Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) { return Cmp_s_(x.PEDIDO_ID) === Cmp_s_(ped.ID) && Cmp_up_(x.SITUACAO) !== 'CANCELADA'; });
  if (atuais.some(function (x) { return ['CONCILIADA', 'PAGA'].indexOf(Cmp_up_(x.SITUACAO)) >= 0 && !/^Pago na compra/.test(Cmp_s_(x.PAGO_POR_NOME)); })) return [];
  atuais.forEach(function (x) { SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, { SITUACAO: 'CANCELADA', MOTIVO: 'Pagamento alterado em ' + Cmp_br_(agora) + (eu ? ' por ' + eu.nome : '') + '.', ATUALIZADO_EM: agora }); });
  var dia = Cmp_dia_(ped.DATA_COMPRA) || Cmp_dia_(ped.PAGO_EM) || Cmp_hoje_();
  return CmpI_montarParcelas_(ped, dia, CmpCart_lista_()).map(function (x) {
    return SGO_DATA.insert(CMP_ABAS.PARCELAS, Object.assign(x, { PEDIDO_ID: Cmp_s_(ped.ID), REQUISICAO_ID: Cmp_s_(req && req.ID) || Cmp_s_(ped.REQUISICAO_ID), REQUISICAO_NUMERO: Cmp_s_(req && req.NUMERO) || Cmp_s_(ped.REQUISICAO_NUMERO),
      MOTIVO: '', ATUALIZADO_POR_NOME: eu ? eu.nome : 'Compras', ATUALIZADO_EM: agora }));
  });
}
/** Para o fluxo normal (registrar o pagamento, compra sem pedido): nunca impede o pagamento. */
function CmpI_gerarParcelasSeguro_(pedidoId, eu) {
  try { var p = SGO_DATA.getById(CMP_ABAS.PEDIDOS, pedidoId); if (p) CmpI_gerarParcelas_(p, SGO_DATA.getById(CMP_ABAS.REQUISICOES, Cmp_s_(p.REQUISICAO_ID)), eu); }
  catch (e) { console.error('Compras, parcelas: ' + ((e && e.message) || e)); }
}
/** Compra cancelada: as parcelas que não andaram são canceladas. */
function CmpI_cancelarParcelas_(reqId, motivo) {
  try {
    Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) {
      if (Cmp_s_(x.REQUISICAO_ID) !== Cmp_s_(reqId) || ['A_CONCILIAR', 'A_PAGAR', 'NAO_ESTA_NA_FATURA', 'DIVERGENTE'].indexOf(Cmp_up_(x.SITUACAO)) < 0) return;
      SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, { SITUACAO: 'CANCELADA', MOTIVO: Cmp_texto_(motivo, 300) || 'Compra cancelada.', ATUALIZADO_EM: Cmp_agora_() });
    });
  } catch (e) { console.error('Compras, cancelar parcelas: ' + ((e && e.message) || e)); }
}

function CmpI_parcelaParaTela_(x, comValor) {
  var s = Cmp_up_(x.SITUACAO);
  var t = { id: Cmp_s_(x.ID), parcela: Number(x.PARCELA) || 1, parcelas: Number(x.PARCELAS) || 1, forma: Cmp_up_(x.FORMA), formaNome: CMP_FORMAS_PAGAMENTO[Cmp_up_(x.FORMA)] || '', cartaoFinal: Cmp_s_(x.CARTAO_FINAL),
    competencia: Cmp_s_(x.COMPETENCIA), competenciaNome: Cmp_s_(x.COMPETENCIA) ? CmpI_competenciaNome_(Cmp_s_(x.COMPETENCIA)) : '', vencimento: Cmp_brDia_(x.VENCIMENTO), vencimentoIso: Cmp_dia_(x.VENCIMENTO),
    estimada: Cmp_sim_(x.ESTIMADA), situacao: s, situacaoNome: CMP_PARC_SIT[s] || s, motivo: Cmp_s_(x.MOTIVO), beneficiario: Cmp_s_(x.BENEFICIARIO_NOME), pagoEm: Cmp_brDia_(x.PAGO_EM),
    pagoPor: Cmp_s_(x.PAGO_POR_NOME), comprovantePagoUrl: Cmp_s_(x.PAGO_COMPROVANTE_URL), requisicaoId: Cmp_s_(x.REQUISICAO_ID), requisicaoNumero: Cmp_s_(x.REQUISICAO_NUMERO), dataCompra: Cmp_brDia_(x.DATA_COMPRA) };
  if (comValor) { t.valor = Number(x.VALOR) || 0; t.valorTxt = Cmp_moeda_(x.VALOR); }
  return t;
}

// ------------------------------------------------------------
// CONFERÊNCIAS NA HORA (iguais às da Frota: impossível recusa; o resto vira apontamento)
// ------------------------------------------------------------
/** Compras parecidas (mesmo cartão ou mesma pessoa, mesmo valor, data até 1 dia; ou o mesmo arquivo de comprovante). */
function CmpI_duplicadas_(o) {
  var reqs = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { reqs[Cmp_s_(r.ID)] = r; });
  return Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (p) {
    var r = reqs[Cmp_s_(p.REQUISICAO_ID)] || {};
    if (Cmp_up_(p.SITUACAO) === 'CANCELADO' || Cmp_up_(r.SITUACAO) === 'CANCELADA') return false;
    if (o.hash && Cmp_s_(p.COMPROVANTE_HASH) === o.hash) return true;
    var dia = Cmp_dia_(p.DATA_COMPRA) || Cmp_dia_(p.PAGO_EM);
    if (!dia || Math.abs(Cmp_diasEntre_(dia, o.dia)) > 1) return false;
    if (Math.abs((Number(p.VALOR_PAGO || p.VALOR_TOTAL) || 0) - o.valor) > 0.009) return false;
    if (o.final && Cmp_s_(p.CARTAO_FINAL) === o.final) return true;
    return !o.final && Cmp_s_(r.COMPRADO_POR_ID || r.SOLICITANTE_ID) === o.quem;
  }).slice(0, 5).map(function (p) {
    var r = reqs[Cmp_s_(p.REQUISICAO_ID)] || {};
    return { numero: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO).slice(0, 80), quem: Cmp_s_(r.COMPRADO_POR_NOME || r.SOLICITANTE_NOME), dia: Cmp_brDia_(p.DATA_COMPRA || p.PAGO_EM),
      valorTxt: Cmp_moeda_(p.VALOR_PAGO || p.VALOR_TOTAL), mesmoArquivo: !!o.hash && Cmp_s_(p.COMPROVANTE_HASH) === o.hash };
  });
}
/** Média das compras de uma pessoa nos últimos 90 dias (null com menos de 5 compras). */
function CmpI_mediaDe_(quemId) {
  var limite = Cmp_somarDias_(Cmp_hoje_(), -90), reqs = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { if (Cmp_s_(r.COMPRADO_POR_ID || r.SOLICITANTE_ID) === quemId && Cmp_up_(r.SITUACAO) !== 'CANCELADA') reqs[Cmp_s_(r.ID)] = 1; });
  var l = Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (p) { return reqs[Cmp_s_(p.REQUISICAO_ID)] && (Cmp_dia_(p.DATA_COMPRA) || Cmp_dia_(p.PAGO_EM)) >= limite; })
    .map(function (p) { return Number(p.VALOR_PAGO || p.VALOR_TOTAL) || 0; });
  return l.length >= 5 ? l.reduce(function (s, v) { return s + v; }, 0) / l.length : null;
}

/** Resolve o vínculo da tela "Informar compra" (CHAMADO -> CLIENTE + número). Devolve { campos, chamado, centroCusto }. */
function CmpI_vinculo_(v) {
  v = Object.assign({}, v || {});
  var tipo = Cmp_up_(v.tipo), chamado = null;
  if (tipo === 'CHAMADO') {
    var num = Cmp_up_(v.chamadoNumero).replace(/\s/g, '');
    if (!/^CH-\d{4}-\d+$/.test(num)) throw new Error('Não foi possível informar: escolha o chamado da Assistência na lista (número CH-ano-número). Se a compra não é de um chamado, escolha "Cliente" ou outro vínculo');
    var aba = typeof AST_ABAS !== 'undefined' ? AST_ABAS.CHAMADOS : 'ATEC_CHAMADOS';
    chamado = Cmp_ler_(aba).filter(function (c) { return Cmp_up_(c.NUMERO) === num; })[0];
    if (!chamado) throw new Error('Não foi possível informar: o chamado ' + num + ' não foi encontrado. Confira o número em Assistência técnica > Chamados e escolha de novo');
    v = { tipo: 'CLIENTE', clienteId: chamado.CLIENTE_ID, unidadeId: chamado.UNIDADE_ID, osAuvo: Cmp_s_(chamado.NUMERO) };
  }
  if (Cmp_up_(v.tipo) === 'INTERNO' && Cmp_s_(v.centroCusto) && Cmp_texto_(v.motivoInterno, 500).length < 20) v.motivoInterno = (Cmp_s_(v.centroCusto) + ': ' + Cmp_s_(v.motivoInterno)).trim();
  var campos;
  try { campos = CmpR_vinculo_(v); } catch (e) { throw new Error(String((e && e.message) || e).replace(/^Não foi possível enviar/, 'Não foi possível informar')); }
  return { campos: campos, chamado: chamado, centroCusto: Cmp_up_(v.tipo) === 'INTERNO' ? Cmp_texto_(v.centroCusto, 60) : '' };
}

/**
 * Confere tudo o que a tela mandou. Lança no padrão "o quê + por quê + o que fazer" para o impossível; devolve os campos e
 * os apontamentos. d: ver CmpI_informar_.
 */
function CmpI_conferir_(eu, d) {
  d = d || {};
  var us = Cmp_usuarios_(), regras = Cmp_regras_(), inf = regras.informar || CMP_REGRAS_PADRAO.informar, hoje = Cmp_hoje_();
  var quemId = Cmp_s_(d.compradoPorId) || eu.id;
  var podeOutro = eu.comprador || eu.financeiro || eu.gestao;
  if (quemId !== eu.id && !podeOutro) throw new Error('Não foi possível informar: cada pessoa informa as próprias compras. Quem informa em nome de outra pessoa é o comprador, o Financeiro ou a gestão. Peça a quem comprou para informar pelo celular ou pelo computador');
  var quem = us[quemId];
  if (!quem || !quem.ativo) throw new Error('Não foi possível informar: escolha quem comprou na lista (pessoa ativa no cadastro de usuários)');
  var fin = Cmp_texto_(d.finalidade, 500);
  if (fin.length < 10) throw new Error('Não foi possível informar: escreva para que foi a compra (pelo menos 10 letras), por exemplo "Vedação da porta da autoclave do cliente, troca no atendimento de hoje"');
  var vinc = CmpI_vinculo_(d.vinculo);
  var itensTela;
  try { itensTela = CmpR_itensDaTela_((d.itens || []).map(function (i) { return Object.assign({ categoria: 'OUTRO', unidade: 'un.' }, i); })); }
  catch (e) { throw new Error(String((e && e.message) || e).replace(/^Não foi possível enviar/, 'Não foi possível informar')); }
  var f = Cmp_s_(d.fornecedorId) ? SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(d.fornecedorId)) : null, fNome = f ? CmpF_nome_(f) : Cmp_texto_(d.fornecedorNome, 160);
  if (fNome.length < 3) throw new Error('Não foi possível informar: escreva onde foi comprado (nome da loja ou do fornecedor) ou escolha do cadastro de fornecedores');
  var valor = Cmp_num_(d.valor);
  if (!(valor > 0)) throw new Error('Não foi possível informar: digite o valor total pago, como está no comprovante (por exemplo 1.234,56)');
  if (valor > CMP_VALOR_MAX_INFORMAR) throw new Error('Não foi possível informar: o valor ' + Cmp_moeda_(valor) + ' passa do teto de ' + Cmp_moeda_(CMP_VALOR_MAX_INFORMAR) + ' para compra informada. Confira o valor (vírgula para os centavos); compra desse tamanho vai pelo pedido de compra');
  var dia = Cmp_dia_(d.dataCompra);
  if (!dia) throw new Error('Não foi possível informar: escolha a data da compra (como está no comprovante)');
  if (dia > hoje) throw new Error('Não foi possível informar: a data da compra está no futuro. Use a data do comprovante');
  var diasAtras = Cmp_diasEntre_(dia, hoje), soGestao = eu.financeiro || eu.gestao;
  if (diasAtras > (Number(inf.maxDiasAtras) || 90) && !soGestao) throw new Error('Não foi possível informar: a compra é de ' + Cmp_brDia_(dia) + ', mais de ' + (Number(inf.maxDiasAtras) || 90) + ' dias atrás. Compra tão antiga é informada pelo Financeiro: envie o comprovante a ele');
  // forma de pagamento (as mesmas regras do pedido de compra), com o que a compra informada exige a mais
  var fp = Cmp_up_(d.formaPagamento), dPag = Object.assign({}, d);
  if (fp === 'REEMBOLSO' && !Cmp_s_(dPag.reembolsoParaId)) dPag.reembolsoParaId = quemId;
  if ((fp === 'FATURADO' || fp === 'BOLETO') && !Cmp_dia_(d.boletoVencimento)) throw new Error('Não foi possível informar: para ' + (fp === 'BOLETO' ? 'boleto' : 'compra faturada') + ', escolha a data do vencimento. É por ela que o Financeiro paga em dia');
  if (fp === 'FATURADO' && Cmp_texto_(dPag.condicao, 200).length < 3) dPag.condicao = 'Faturado com vencimento em ' + Cmp_brDia_(d.boletoVencimento);
  var pag;
  try { pag = CmpP_formaPagamento_(dPag); } catch (e) { throw new Error(String((e && e.message) || e).replace(/^Não foi possível registrar/, 'Não foi possível informar')); }
  if (fp === 'REEMBOLSO' && pag.REEMBOLSO_PARA_ID !== quemId && !podeOutro) throw new Error('Não foi possível informar: o reembolso é para quem pagou com o próprio dinheiro (' + quem.nome + ')');
  // comprovante e nota
  var comp = d.comprovante && d.comprovante.base64 ? d.comprovante : null;
  if (!comp) throw new Error('Não foi possível informar: tire a foto do comprovante (cupom, recibo, comprovante do cartão ou do Pix) e anexe. Sem ele o Financeiro não consegue conferir');
  if (!CMP_RX_COMPROVANTE.test(Cmp_s_(comp.nome))) throw new Error('Não foi possível informar: o comprovante precisa ser foto (JPG, PNG) ou PDF. Converta e anexe de novo');
  var nfArq = d.nfArquivo && d.nfArquivo.base64 ? d.nfArquivo : null, nfNum = Cmp_texto_(d.nfNumero, 60), nfSem = Cmp_texto_(d.nfSemMotivo, 300);
  if (!nfArq && !nfNum && nfSem.length < 10) throw new Error('Não foi possível informar: anexe a nota fiscal (foto ou PDF) ou digite o número dela. Se a loja não deu nota, escreva o motivo (pelo menos 10 letras), por exemplo "compra em feira, só recibo"');
  var recebido = d.recebido !== false;
  var prev = Cmp_dia_(d.previsaoEntrega);
  if (!recebido && (!prev || prev < hoje)) throw new Error('Não foi possível informar: se a mercadoria ainda não chegou, escolha a previsão de entrega (hoje ou depois). Compras recebe, confere e avisa você quando chegar');
  // apontamentos
  var ap = [], hash = Cmp_marca_(String(comp.base64).replace(/^data:[^,]+,/, ''));
  var atraso = Cmp_diasUteisEntre_(dia, hoje), prazo = Number(inf.prazoDiasUteis);
  if (!(prazo >= 0)) prazo = 2;
  var atrasoMotivo = Cmp_texto_(d.atrasoMotivo, 500);
  if (atraso > prazo) {
    if (atrasoMotivo.length < 10) return { precisa: 'ATRASO', message: 'A compra é de ' + Cmp_brDia_(dia) + ': ' + Cmp_plural_(atraso, 'dia útil', 'dias úteis') + ' até hoje (o prazo para informar é de ' + Cmp_plural_(prazo, 'dia útil', 'dias úteis') + '). Escreva por que só agora (pelo menos 10 letras) e envie de novo. A compra vai marcada "informada com atraso".', atrasoDias: atraso };
    ap.push({ tipo: 'ATRASO', texto: 'Informada com atraso: ' + Cmp_plural_(atraso, 'dia útil', 'dias úteis') + ' depois da compra. Motivo: ' + atrasoMotivo });
  }
  var dup = CmpI_duplicadas_({ hash: hash, dia: dia, valor: Cmp_r2_(valor), final: pag.CARTAO_FINAL, quem: quemId });
  var dupMotivo = Cmp_texto_(d.duplicidadeMotivo, 500);
  if (dup.length) {
    if (dupMotivo.length < 10) return { precisa: 'DUPLICIDADE', duplicadas: dup, message: (dup.some(function (x) { return x.mesmoArquivo; }) ? 'Este mesmo arquivo de comprovante já foi usado em outra compra. ' : 'Já existe compra parecida (mesmo ' + (pag.CARTAO_FINAL ? 'cartão' : 'comprador') + ', mesmo valor e data próxima). ') + 'Confira se não é a mesma compra. Se for outra, escreva o motivo (pelo menos 10 letras) e envie de novo: ela vai marcada "duplicidade possível" para o Financeiro.' };
    ap.push({ tipo: 'DUPLICIDADE', texto: 'Duplicidade possível com ' + dup.map(function (x) { return x.numero; }).join(', ') + '. Motivo de quem informou: ' + dupMotivo });
  }
  var lim = Number(inf.limiteDireta) || 0, ciencia = lim > 0 && valor > lim + 1e-9;
  if (ciencia) ap.push({ tipo: 'ACIMA_LIMITE', texto: 'Valor acima do limite da compra direta (' + Cmp_moeda_(lim) + '): vai à ciência da gestão.' });
  var media = CmpI_mediaDe_(quemId), mult = Number(inf.multiploMedia) || 3;
  if (media && valor > media * mult) ap.push({ tipo: 'ACIMA_MEDIA', texto: 'Valor ' + RelA4_num_(valor / media, 1) + ' vezes a média das compras de ' + quem.nome + ' nos últimos 90 dias (' + Cmp_moeda_(media) + ').' });
  var cart = pag.CARTAO_FINAL ? CmpCart_porFinal_(pag.CARTAO_FINAL) : null;
  if (pag.CARTAO_FINAL && !cart) ap.push({ tipo: 'CARTAO_SEM_CADASTRO', texto: 'Cartão final ' + pag.CARTAO_FINAL + ' ainda não está cadastrado em Compras > Cartões da empresa: a fatura das parcelas é estimada até o cadastro.' });
  var ext = null;
  if (Cmp_s_(d.extratoId)) {
    ext = SGO_DATA.getById(CMP_ABAS.EXTRATO, Cmp_s_(d.extratoId));
    if (!ext || Cmp_up_(ext.SITUACAO) !== 'NAO_INFORMADA') throw new Error('Não foi possível ligar ao lançamento da fatura: ele já foi conciliado ou justificado. Atualize a lista de cobranças');
  }
  return { ok: true, quem: quem, fin: fin, vinc: vinc, itensTela: itensTela, f: f, fNome: fNome, valor: Cmp_r2_(valor), dia: dia, pag: pag, comp: comp, nfArq: nfArq, nfNum: nfNum, nfSem: nfSem,
    recebido: recebido, prev: prev, ap: ap, hash: hash, ciencia: ciencia, atraso: atraso, atrasoMotivo: atraso > prazo ? atrasoMotivo : '', dupMotivo: dup.length ? dupMotivo : '', cart: cart, ext: ext,
    orcRef: Cmp_texto_(d.orcamentoRef, 120), orcArq: d.orcamentoArquivo && d.orcamentoArquivo.base64 ? d.orcamentoArquivo : null };
}

/**
 * Informar compra já feita. d: { compradoPorId, finalidade, vinculo:{ tipo (CHAMADO|CLIENTE|COMERCIAL|VEICULO|INTERNO), chamadoNumero,
 *   clienteId, unidadeId, osAuvo, propostaId, veiculoId, motivoInterno, centroCusto }, orcamentoRef, orcamentoArquivo, itens:[{descricao,
 *   quantidade, unidade, categoria}], fornecedorId | fornecedorNome, valor, formaPagamento, cartaoFinal, parcelas, boletoVencimento,
 *   condicao, reembolsoParaId, dataCompra, comprovante, nfArquivo | nfNumero | nfSemMotivo, recebido (bool), previsaoEntrega,
 *   atrasoMotivo, duplicidadeMotivo, extratoId (lançamento da fatura que esta compra explica), simular }
 * Com simular: só confere e devolve os apontamentos (nada é gravado).
 */
function CmpI_informar_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'informar a compra');
  var c = CmpI_conferir_(eu, d);
  if (c.precisa) return { gravada: false, precisa: c.precisa, duplicadas: c.duplicadas || [], message: c.message, atrasoDias: c.atrasoDias || 0 };
  if (d && d.simular) return { gravada: false, simulada: true, apontamentos: c.ap, ciencia: c.ciencia, message: c.ap.length ? 'Confira os apontamentos antes de enviar.' : 'Tudo certo para enviar.' };
  var res = Cmp_comTrava_(function () {
    var agora = Cmp_agora_(), numero = Cmp_proximoNumero_('REQ', CMP_ABAS.REQUISICOES, 'NUMERO'), quem = c.quem;
    var arq = Cmp_salvarArquivo_(c.comp, numero, 'Comprovante da compra', CMP_RX_COMPROVANTE, 'do comprovante');
    var nf = c.nfArq ? Cmp_salvarArquivo_(c.nfArq, numero, 'Nota fiscal', CMP_RX_PDF_IMG, 'da nota fiscal') : null;
    var orc = c.orcArq ? Cmp_salvarArquivo_(c.orcArq, numero, 'Orçamento', CMP_RX_DOC, 'do orçamento') : null;
    var comprador = null;
    if (!c.recebido) { try { comprador = Cmp_compradorPara_(); } catch (eC) { comprador = null; } }
    var req = Object.assign({}, c.vinc.campos, { NUMERO: numero, SOLICITANTE_ID: quem.id, SOLICITANTE_NOME: quem.nome, SOLICITANTE_AREA: quem.area, URGENCIA: 'NORMAL', FINALIDADE: c.fin,
      SITUACAO: c.recebido ? 'ENTREGUE' : 'PEDIDO_FEITO', SEM_PEDIDO: 'SIM', SEM_PEDIDO_JUSTIFICATIVA: 'Compra informada depois de feita por ' + eu.nome + (c.atrasoMotivo ? '. Atraso: ' + c.atrasoMotivo : '') + '.',
      VALOR_TOTAL: c.valor, PREVISAO_ENTREGA: c.recebido ? '' : c.prev, ORIGEM: CMP_ORIGEM_INFORMADA, REPROVACOES: 0, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora,
      COMPRADO_POR_ID: quem.id, COMPRADO_POR_NOME: quem.nome, ORCAMENTO_REF: c.orcRef, ORCAMENTO_ARQUIVO_URL: orc ? orc.url : '', CENTRO_CUSTO: c.vinc.centroCusto, CHAMADO_NUMERO: c.vinc.chamado ? Cmp_s_(c.vinc.chamado.NUMERO) : '',
      INF_APONTAMENTOS: c.ap.length ? JSON.stringify(c.ap) : '', INF_CIENCIA: c.ciencia ? 'SIM' : '', INF_ATRASO_DIAS: c.atraso, INF_ATRASO_MOTIVO: c.atrasoMotivo });
    if (c.recebido) Object.assign(req, { ENTREGUE_EM: agora, ENTREGUE_A_ID: quem.id, ENTREGUE_A_NOME: quem.nome, ENTREGA_EVIDENCIA: 'Compra informada por ' + eu.nome + ' com a mercadoria já em mãos.', ENTREGUE_POR_NOME: eu.nome, RECEBIDA_EM: agora, RECEBIDA_POR_NOME: quem.nome });
    else if (comprador) Object.assign(req, { COMPRADOR_ID: comprador.id, COMPRADOR_NOME: comprador.nome });
    var r = SGO_DATA.insert(CMP_ABAS.REQUISICOES, req);
    var itens = CmpR_gravarItens_(r, c.itensTela, eu);
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { TITULO: CmpR_tituloDe_(itens), ESPEC_FALTA: '[]' });
    r.TITULO = CmpR_tituloDe_(itens);
    var ped = SGO_DATA.insert(CMP_ABAS.PEDIDOS, Object.assign({}, c.pag, { NUMERO: '', REVISAO: 0, REQUISICAO_ID: r.ID, REQUISICAO_NUMERO: numero, FORNECEDOR_ID: c.f ? Cmp_s_(c.f.ID) : '', FORNECEDOR_NOME: c.fNome,
      VALOR_TOTAL: c.valor, VALOR_PAGO: c.valor, PAGO_EM: c.dia, DATA_COMPRA: c.dia, COMPROVANTE_ID: arq.id, COMPROVANTE_NOME: arq.nome, COMPROVANTE_URL: arq.url, COMPROVANTE_HASH: c.hash,
      NF_NUMERO: c.nfNum, NF_ARQUIVO_ID: nf ? nf.id : '', NF_ARQUIVO_NOME: nf ? nf.nome : '', NF_ARQUIVO_URL: nf ? nf.url : '', NF_SEM_MOTIVO: c.nfSem, DUPLICIDADE_MOTIVO: c.dupMotivo,
      CARTAO_ID: c.cart ? Cmp_s_(c.cart.ID) : '', PREVISAO_ENTREGA: c.recebido ? '' : c.prev, PAGAMENTO_POR_ID: eu.id, PAGAMENTO_POR_NOME: eu.nome, EMITIDO_EM: agora, EMITIDO_POR_ID: eu.id, EMITIDO_POR_NOME: eu.nome,
      FIN_SITUACAO: 'AGUARDANDO', SEM_PEDIDO: 'SIM', SITUACAO: 'INFORMADA', ATUALIZADO_EM: agora }));
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { PEDIDO_ID: ped.ID });
    r.PEDIDO_ID = ped.ID;
    var parcelas = CmpI_gerarParcelas_(ped, r, eu);
    var forma = CmpP_formaTexto_(ped, true);
    Cmp_historico_('REQUISICAO', r.ID, 'INFORMADA', eu, { publico: true, para: c.recebido ? 'Entregue' : 'Pedido feito',
      texto: 'Compra informada por ' + eu.nome + (quem.id !== eu.id ? ' em nome de ' + quem.nome : '') + ': ' + c.fNome + ' em ' + Cmp_brDia_(c.dia) + ' · ' + forma + '.' + (c.recebido ? ' Mercadoria já em mãos.' : ' Previsão de entrega: ' + Cmp_brDia_(c.prev) + '.') });
    Cmp_historico_('REQUISICAO', r.ID, 'PAGAMENTO', eu, { texto: 'Valor ' + Cmp_moeda_(c.valor) + ' · ' + forma + ' · ' + Cmp_plural_(parcelas.length, 'parcela', 'parcelas') + (parcelas[0] && parcelas[0].COMPETENCIA && Cmp_up_(parcelas[0].FORMA) === 'CARTAO_CREDITO' ? ' (primeira na fatura de ' + CmpI_competenciaNome_(parcelas[0].COMPETENCIA) + (Cmp_sim_(parcelas[0].ESTIMADA) ? ', estimada' : '') + ')' : '') + '.' });
    if (c.ap.length) Cmp_historico_('REQUISICAO', r.ID, 'APONTAMENTOS', eu, { texto: c.ap.map(function (x) { return x.texto; }).join(' ') });
    // lançamento da fatura que esta compra explica: casa na hora com a parcela de mesmo valor (ou a primeira)
    if (c.ext && typeof CmpFat_casarLinha_ === 'function') {
      var alvo = parcelas.filter(function (x) { return Math.abs((Number(x.VALOR) || 0) - (Number(c.ext.VALOR) || 0)) < 0.051; })[0] || parcelas[0];
      if (alvo) CmpFat_casarLinha_(c.ext, alvo, eu, 'Compra informada a partir da cobrança do lançamento da fatura.');
    }
    CmpFin_idsFinanceiro_(Cmp_usuarios_(), [eu.id]).forEach(function (id) {
      Cmp_avisar_(id, 'PARA_CONFERIR', 'Compra informada para conferir: ' + numero, 'Compra informada por ' + eu.nome + (quem.id !== eu.id ? ' (comprou: ' + quem.nome + ')' : '') + ' em ' + c.fNome + ' (forma: ' + (CMP_FORMAS_PAGAMENTO[c.pag.FORMA_PAGAMENTO] || '') + '). Confira em Compras > Conferência do Financeiro.', r.ID, { email: true, autorId: eu.id });
    });
    if (quem.id !== eu.id) Cmp_avisar_(quem.id, 'INFORMADA_POR_OUTRO', 'Compra informada em seu nome: ' + numero, eu.nome + ' informou a sua compra em ' + c.fNome + ' de ' + Cmp_brDia_(c.dia) + '. Confira em Compras > Informar compra já feita > Minhas compras informadas.', r.ID, { autorId: eu.id });
    if (!c.recebido && comprador) Cmp_avisar_(comprador.id, 'INFORMADA_A_RECEBER', 'Compra informada a receber: ' + numero, quem.nome + ' comprou em ' + c.fNome + ' e a entrega está prevista para ' + Cmp_brDia_(c.prev) + '. Quando chegar, registre o recebimento em Compras > Fila de compras.', r.ID, { email: true, autorId: eu.id });
    return { r: r, parcelas: parcelas, numero: numero };
  });
  var msg = 'Compra ' + res.numero + ' informada. ' + (c.ciencia ? 'O valor passa do limite da compra direta: a gestão vai dar ciência. ' : '') + (c.recebido ? '' : 'Compras confere o recebimento e avisa quando chegar. ') +
    (c.ap.length ? 'Apontamentos registrados para o Financeiro: ' + c.ap.map(function (x) { return x.tipo === 'ATRASO' ? 'informada com atraso' : x.tipo === 'DUPLICIDADE' ? 'duplicidade possível' : x.tipo === 'CARTAO_SEM_CADASTRO' ? 'cartão ainda não cadastrado' : 'acima do comum'; }).filter(function (x, i, l) { return l.indexOf(x) === i; }).join(', ') + '.' : 'Ela foi para a conferência do Financeiro.');
  return { gravada: true, requisicao: CmpR_paraTela_(Object.assign({}, eu, { veValores: true }), Object.assign({}, res.r), true), message: msg, numero: res.numero };
}

/** Minhas compras informadas (com valor: é o dinheiro que a pessoa gastou). */
function CmpI_minhas_(eu) {
  var peds = {}, parc = {};
  Cmp_ler_(CMP_ABAS.PEDIDOS).forEach(function (p) { peds[Cmp_s_(p.ID)] = p; });
  Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) { if (Cmp_up_(x.SITUACAO) !== 'CANCELADA') (parc[Cmp_s_(x.REQUISICAO_ID)] = parc[Cmp_s_(x.REQUISICAO_ID)] || []).push(x); });
  return Cmp_ler_(CMP_ABAS.REQUISICOES).filter(function (r) { return Cmp_up_(r.ORIGEM) === CMP_ORIGEM_INFORMADA && (Cmp_s_(r.COMPRADO_POR_ID) === eu.id || Cmp_s_(r.CRIADO_POR_ID) === eu.id); })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); }).slice(0, 100)
    .map(function (r) {
      var p = peds[Cmp_s_(r.PEDIDO_ID)] || {}, fs = Cmp_up_(p.FIN_SITUACAO);
      return { id: Cmp_s_(r.ID), numero: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO), situacao: Cmp_up_(r.SITUACAO), situacaoNome: CMP_SITUACOES[Cmp_up_(r.SITUACAO)] || '', fornecedor: Cmp_s_(p.FORNECEDOR_NOME),
        dataCompra: Cmp_brDia_(p.DATA_COMPRA || p.PAGO_EM), valorTxt: Cmp_moeda_(p.VALOR_PAGO || p.VALOR_TOTAL), forma: CmpP_formaTexto_(p, true), vinculo: CmpR_vinculoTexto_(r), quem: Cmp_s_(r.COMPRADO_POR_NOME),
        finSituacao: fs, finSituacaoNome: CMP_FIN_SITUACOES[fs] || '', finObs: Cmp_s_(p.FIN_OBS), comprovanteUrl: Cmp_s_(p.COMPROVANTE_URL), apontamentos: Cmp_json_(r.INF_APONTAMENTOS, []),
        parcelas: (parc[Cmp_s_(r.ID)] || []).sort(function (a, b) { return (Number(a.PARCELA) || 0) - (Number(b.PARCELA) || 0); }).map(function (x) { return CmpI_parcelaParaTela_(x, true); }) };
    });
}

/** Opções do formulário: equipe (para quem pode informar por outra pessoa), centros de custo, cartões cadastrados (final e apelido). */
function CmpI_opcoes_(eu) {
  var us = Cmp_usuarios_(), podeOutro = eu.comprador || eu.financeiro || eu.gestao;
  var areas = [];
  try { areas = typeof Areas_todas_ === 'function' ? Areas_todas_().map(function (a) { return Cmp_s_(a.NOME || a.nome); }).filter(Boolean) : []; } catch (e) { areas = []; }
  if (!areas.length) areas = ['Administrativo', 'Técnica/Campo', 'Metrologia', 'Comercial', 'Logística', 'Financeiro', 'Diretoria'];
  return { podeOutro: podeOutro, vinculos: CMP_VINCULOS_INFORMAR, centrosCusto: areas.concat(['Sede (manutenção e limpeza)', 'Frota']),
    equipe: podeOutro ? Object.keys(us).filter(function (id) { return us[id].ativo && !Cmp_ehContaSistema_(us[id]); }).map(function (id) { return { id: id, nome: us[id].nome }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }) : [],
    cartoes: CmpCart_lista_().filter(CmpCart_ativo_).map(function (k) { return { final: Cmp_s_(k.FINAL), apelido: Cmp_s_(k.APELIDO), tipo: Cmp_up_(k.TIPO) }; }),
    prazoDiasUteis: Number((Cmp_regras_().informar || {}).prazoDiasUteis), limiteDireta: Number((Cmp_regras_().informar || {}).limiteDireta) || 0 };
}

/** Chamados da Assistência para escolher (número, cliente e equipamento; abertos primeiro). */
function CmpI_chamados_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'buscar chamados');
  var q = Cmp_s_(d && d.busca).toLowerCase(), aba = typeof AST_ABAS !== 'undefined' ? AST_ABAS.CHAMADOS : 'ATEC_CHAMADOS';
  var fechados = ['ENCERRADO', 'CANCELADO', 'EXCLUIDO'];
  return Cmp_ler_(aba).filter(function (c) {
    if (Cmp_up_(c.SITUACAO) === 'EXCLUIDO') return false;
    if (!q) return fechados.indexOf(Cmp_up_(c.SITUACAO)) < 0;
    return (Cmp_s_(c.NUMERO) + ' ' + Cmp_s_(c.CLIENTE_NOME) + ' ' + Cmp_s_(c.EQUIPAMENTO_TEXTO)).toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) { return String(b.NUMERO).localeCompare(String(a.NUMERO)); }).slice(0, 40)
    .map(function (c) { return { numero: Cmp_s_(c.NUMERO), cliente: Cmp_s_(c.CLIENTE_NOME), equipamento: Cmp_s_(c.EQUIPAMENTO_TEXTO).slice(0, 80), situacao: Cmp_s_(c.SITUACAO) }; });
}
