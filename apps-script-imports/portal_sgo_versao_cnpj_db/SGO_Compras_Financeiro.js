/****************************************************
 * COMPRAS — PAGAMENTO, CONFERÊNCIA DO FINANCEIRO, COMPRA SEM PEDIDO, PAINEL E RELATÓRIO MENSAL (21/10/2026)
 *
 * Pagamento (no pedido de compra): valor pago, data, forma (cartão com o final e as parcelas, PIX, boleto, transferência,
 * faturado, reembolso) e o comprovante. Registrado o pagamento, a compra entra na lista do Financeiro como "aguardando
 * conferência" (C037: Financeiro, no sistema até conferir; e-mail no resumo da manhã, sem valor).
 * Conferência (perfil ou área Financeiro, Diretoria, Administrador): o dossiê da compra (vínculo, cotações com os
 * arquivos, aprovação, pagamento, comprovante, nota) e "Conferida" ou "Divergente" com a observação. Quem registrou a
 * compra ou o pagamento não confere a própria. A divergência volta ao comprador (C038) até ele corrigir e reenviar.
 * Filtro por mês e pelo final do cartão (para bater a fatura) e planilha (CSV com ponto e vírgula, pt-BR).
 * Compra sem pedido (resposta do dono, pergunta 6): compra feita fora do sistema é registrada com a justificativa,
 * o comprovante e o vínculo; não bloqueia, entra na conferência do Financeiro e aparece na Caixa de decisões da
 * gestão até alguém marcar "Ciente".
 * Painel e relatório mensal A4 (pasta "Compras - Relatórios"): gasto por vínculo, área e fornecedor; compras fora do
 * prazo; menos cotações que o mínimo; divergências de recebimento e do Financeiro; compras sem pedido. O relatório do
 * mês anterior é gerado no primeiro dia útil pela rotina de Compras e avisado à Diretoria.
 ****************************************************/

var CMP_PASTA_RELATORIOS = 'Compras - Relatórios';

function CmpFin_pedidoPorId_(id) { return id ? SGO_DATA.getById(CMP_ABAS.PEDIDOS, Cmp_s_(id)) : null; }
function CmpFin_idsFinanceiro_(us, excluir) {
  excluir = excluir || [];
  return Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && (u.perfil === 'FINANCEIRO' || u.area === 'FINANCEIRO') && excluir.indexOf(id) < 0; });
}

/** Registrar (ou corrigir) o pagamento. d: { requisicaoId, valorPago, pagoEm, formaPagamento..., comprovante:{...}, correcao (texto, quando divergente) } */
function CmpFin_registrarPagamento_(eu, d) {
  d = d || {};
  var r0 = CmpR_obter_(eu, d.requisicaoId, 'registrar o pagamento');
  var semPedido = Cmp_sim_(r0.SEM_PEDIDO);
  if (!semPedido) Cmp_exigir_(eu, 'COMPRADOR', 'registrar o pagamento');
  else if (Cmp_s_(r0.SOLICITANTE_ID) !== eu.id && !eu.comprador) Cmp_exigir_(eu, 'COMPRADOR', 'registrar o pagamento');
  var p0 = CmpP_pedidoDe_(r0);
  if (!p0) throw new Error('Não foi possível registrar o pagamento: o pedido de compra ainda não foi emitido. Emita o pedido primeiro');
  if (Cmp_up_(p0.FIN_SITUACAO) === 'CONFERIDA') throw new Error('Não foi possível alterar: o Financeiro já conferiu esta compra. Se algo mudou, fale com o Financeiro');
  var valor = Cmp_num_(d.valorPago);
  if (!(valor > 0)) throw new Error('Não foi possível registrar: informe o valor pago (como está no comprovante)');
  var pagoEm = Cmp_dia_(d.pagoEm);
  if (!pagoEm) throw new Error('Não foi possível registrar: informe a data do pagamento');
  if (pagoEm > Cmp_hoje_()) throw new Error('Não foi possível registrar: a data do pagamento está no futuro. Para boleto ou faturado a vencer, registre quando pagar');
  var pag = d.formaPagamento ? CmpP_formaPagamento_(d) : null;
  var forma = pag ? pag.FORMA_PAGAMENTO : Cmp_up_(p0.FORMA_PAGAMENTO);
  var comp = d.comprovante && d.comprovante.base64 ? d.comprovante : null;
  if (!comp && !Cmp_s_(p0.COMPROVANTE_ID)) throw new Error('Não foi possível registrar: anexe o comprovante do pagamento (recibo, extrato, cupom ou boleto pago). O Financeiro confere por ele');
  var corrigindo = Cmp_up_(p0.FIN_SITUACAO) === 'DIVERGENTE', correcao = Cmp_texto_(d.correcao, 1000);
  if (corrigindo && correcao.length < 10) throw new Error('Não foi possível reenviar: escreva o que foi corrigido (pelo menos 10 letras). O Financeiro apontou: ' + Cmp_s_(p0.FIN_OBS));
  return Cmp_comTrava_(function () {
    var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, r0.ID), p = CmpFin_pedidoPorId_(p0.ID);
    var arq = comp ? Cmp_salvarArquivo_(comp, r.NUMERO, 'Comprovante de pagamento', CMP_RX_PDF_IMG, 'do comprovante') : null;
    var campos = Object.assign({}, pag || {}, { VALOR_PAGO: Cmp_r2_(valor), PAGO_EM: pagoEm, PAGAMENTO_POR_ID: eu.id, PAGAMENTO_POR_NOME: eu.nome, FIN_SITUACAO: 'AGUARDANDO', ATUALIZADO_EM: Cmp_agora_() });
    if (arq) { campos.COMPROVANTE_ID = arq.id; campos.COMPROVANTE_NOME = arq.nome; campos.COMPROVANTE_URL = arq.url; }
    if (corrigindo) campos.FIN_REENVIO_TEXTO = correcao;
    SGO_DATA.update(CMP_ABAS.PEDIDOS, p.ID, campos);
    Cmp_historico_('REQUISICAO', r.ID, corrigindo ? 'PAGAMENTO_CORRIGIDO' : 'PAGAMENTO', eu, { texto: (corrigindo ? 'Pagamento corrigido (' + correcao + '): ' : 'Pagamento registrado: ') + Cmp_moeda_(valor) + ' em ' + Cmp_brDia_(pagoEm) + ' · ' + CmpP_formaTexto_(Object.assign({}, p, campos), true) + '. Enviado à conferência do Financeiro.' });
    var us = Cmp_usuarios_();
    CmpFin_idsFinanceiro_(us, [eu.id]).forEach(function (id) {
      Cmp_avisar_(id, 'PARA_CONFERIR', (corrigindo ? 'Compra corrigida para conferir: ' : 'Compra para conferir: ') + Cmp_s_(r.NUMERO), 'Pagamento de ' + Cmp_s_(p.FORNECEDOR_NOME) + ' registrado por ' + eu.nome + ' (forma: ' + (CMP_FORMAS_PAGAMENTO[forma] || '') + '). Confira em Compras > Conferência do Financeiro.', r.ID, { email: true, autorId: eu.id });
    });
    return { requisicao: CmpR_paraTela_(eu, r, true), message: corrigindo ? 'Correção enviada ao Financeiro.' : 'Pagamento registrado. A compra entrou na conferência do Financeiro.' };
  });
}

/** Conferência do Financeiro. d: { pedidoId, resultado: 'CONFERIDA'|'DIVERGENTE', obs } */
function CmpFin_conferir_(eu, d) {
  Cmp_exigir_(eu, 'FINANCEIRO', 'conferir a compra');
  d = d || {};
  var res = Cmp_up_(d.resultado), obs = Cmp_texto_(d.obs, 1000);
  if (res !== 'CONFERIDA' && res !== 'DIVERGENTE') throw new Error('Não foi possível registrar: escolha "Conferida" ou "Divergente"');
  if (res === 'DIVERGENTE' && obs.length < 10) throw new Error('Não foi possível apontar a divergência: escreva o que não bate (pelo menos 10 letras), por exemplo "Valor da fatura do cartão diferente do comprovante". O comprador recebe o texto');
  return Cmp_comTrava_(function () {
    var p = CmpFin_pedidoPorId_(d.pedidoId);
    if (!p) throw new Error('Não foi possível conferir: a compra não foi encontrada. Atualize a lista');
    if (Cmp_up_(p.FIN_SITUACAO) !== 'AGUARDANDO') throw new Error('Não foi possível conferir: a compra está "' + CMP_FIN_SITUACOES[Cmp_up_(p.FIN_SITUACAO)] + '". Só se confere compra com o pagamento registrado e aguardando');
    if (eu.id === Cmp_s_(p.PAGAMENTO_POR_ID) || eu.id === Cmp_s_(p.EMITIDO_POR_ID)) throw new Error('Não foi possível conferir: foi você quem registrou esta compra ou o pagamento. Quem registra não confere a própria; outra pessoa do Financeiro (ou a Diretoria) confere');
    var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, Cmp_s_(p.REQUISICAO_ID)) || {};
    var campos = { FIN_SITUACAO: res, FIN_POR_ID: eu.id, FIN_POR_NOME: eu.nome, FIN_EM: Cmp_agora_(), FIN_OBS: obs, ATUALIZADO_EM: Cmp_agora_() };
    SGO_DATA.update(CMP_ABAS.PEDIDOS, p.ID, campos);
    Cmp_historico_('REQUISICAO', r.ID, 'FINANCEIRO_' + res, eu, { texto: (res === 'CONFERIDA' ? 'Conferida pelo Financeiro.' : 'Divergência apontada pelo Financeiro: ' + obs) + (res === 'CONFERIDA' && obs ? ' ' + obs : '') });
    if (res === 'DIVERGENTE') {
      var dest = Cmp_s_(p.PAGAMENTO_POR_ID) || Cmp_s_(r.COMPRADOR_ID);
      Cmp_avisar_(dest, 'DIVERGENCIA_FIN', 'Divergência do Financeiro na compra ' + Cmp_s_(r.NUMERO), eu.nome + ' apontou: ' + obs + ' Corrija o pagamento ou o comprovante na ficha da compra e reenvie.', r.ID, { email: true, autorId: eu.id });
    }
    return { message: res === 'CONFERIDA' ? 'Compra conferida.' : 'Divergência registrada: o comprador recebeu o aviso para corrigir.' };
  });
}

/** Lista da conferência. f: { mes: 'aaaa-mm', cartaoFinal, situacao } */
function CmpFin_lista_(eu, f) {
  Cmp_exigir_(eu, 'FINANCEIRO', 'ver a conferência das compras');
  f = f || {};
  var mes = /^\d{4}-\d{2}$/.test(Cmp_s_(f.mes)) ? Cmp_s_(f.mes) : '', fim = Cmp_digitos_(f.cartaoFinal), sit = Cmp_up_(f.situacao);
  var reqs = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { reqs[Cmp_s_(r.ID)] = r; });
  var lista = Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (p) {
    if (Cmp_up_(p.SITUACAO) === 'CANCELADO') return false;
    var dia = Cmp_dia_(p.PAGO_EM) || Cmp_dia_(p.EMITIDO_EM) || Cmp_dia_(p.CRIADO_EM);
    if (mes && dia.slice(0, 7) !== mes) return false;
    if (fim && Cmp_s_(p.CARTAO_FINAL) !== fim) return false;
    if (sit === 'SEM_PAGAMENTO') return !Cmp_s_(p.FIN_SITUACAO);
    if (sit && sit !== 'TODAS' && Cmp_up_(p.FIN_SITUACAO) !== sit) return false;
    return true;
  }).map(function (p) {
    var r = reqs[Cmp_s_(p.REQUISICAO_ID)] || {};
    return { id: Cmp_s_(p.ID), requisicaoId: Cmp_s_(r.ID), numero: Cmp_s_(p.NUMERO) || 'Compra sem pedido', requisicao: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO), fornecedor: Cmp_s_(p.FORNECEDOR_NOME),
      vinculo: CmpR_vinculoTexto_(r), valorTxt: Cmp_moeda_(p.VALOR_TOTAL), valorPagoTxt: Cmp_s_(p.VALOR_PAGO) !== '' ? Cmp_moeda_(p.VALOR_PAGO) : '', diferenca: Cmp_s_(p.VALOR_PAGO) !== '' && Math.abs((Number(p.VALOR_PAGO) || 0) - (Number(p.VALOR_TOTAL) || 0)) > 0.009,
      forma: CmpP_formaTexto_(p, true), cartaoFinal: Cmp_s_(p.CARTAO_FINAL), pagoEm: Cmp_brDia_(p.PAGO_EM), comprovanteUrl: Cmp_s_(p.COMPROVANTE_URL), nf: Cmp_s_(p.NF_NUMERO), nfUrl: Cmp_s_(p.NF_ARQUIVO_URL),
      pdfUrl: Cmp_s_(p.PDF_URL), situacao: Cmp_up_(p.FIN_SITUACAO), situacaoNome: CMP_FIN_SITUACOES[Cmp_up_(p.FIN_SITUACAO)] || '', obs: Cmp_s_(p.FIN_OBS), reenvio: Cmp_s_(p.FIN_REENVIO_TEXTO),
      conferidaPor: Cmp_s_(p.FIN_POR_NOME), conferidaEm: Cmp_br_(p.FIN_EM), registradoPor: Cmp_s_(p.PAGAMENTO_POR_NOME) || Cmp_s_(p.EMITIDO_POR_NOME), semPedido: Cmp_sim_(p.SEM_PEDIDO),
      menosCotacoes: !!Cmp_s_(r.COTACOES_JUSTIFICATIVA), cotacoesJustificativa: Cmp_s_(r.COTACOES_JUSTIFICATIVA), semPedidoJustificativa: Cmp_s_(r.SEM_PEDIDO_JUSTIFICATIVA),
      podeConferir: Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO' && eu.id !== Cmp_s_(p.PAGAMENTO_POR_ID) && eu.id !== Cmp_s_(p.EMITIDO_POR_ID), dia: Cmp_dia_(p.PAGO_EM) || Cmp_dia_(p.EMITIDO_EM) };
  }).sort(function (a, b) { return String(b.dia).localeCompare(String(a.dia)); });
  var tot = lista.reduce(function (s, x) { return s + (Number(String(x.valorPagoTxt || x.valorTxt).replace(/[^\d,]/g, '').replace(',', '.')) || 0); }, 0);
  return { compras: lista, totalTxt: Cmp_moeda_(tot), mes: mes };
}

/** Planilha (CSV ; pt-BR) da lista filtrada. */
function CmpFin_planilha_(eu, f) {
  var l = CmpFin_lista_(eu, f).compras;
  var esc = function (v) { var s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  var cab = ['Pedido', 'Requisição', 'Item', 'Fornecedor', 'Vínculo', 'Valor do pedido', 'Valor pago', 'Pago em', 'Forma', 'Final do cartão', 'Nota fiscal', 'Situação', 'Observação do Financeiro', 'Registrado por', 'Compra sem pedido', 'Menos cotações que o mínimo'];
  var linhas = l.map(function (x) { return [x.numero, x.requisicao, x.titulo, x.fornecedor, x.vinculo, x.valorTxt, x.valorPagoTxt, x.pagoEm, x.forma, x.cartaoFinal, x.nf, x.situacaoNome, x.obs, x.registradoPor, x.semPedido ? 'Sim' : '', x.menosCotacoes ? 'Sim' : ''].map(esc).join(';'); });
  return { csv: '﻿' + cab.join(';') + '\r\n' + linhas.join('\r\n'), nome: 'Compras - conferencia' + (f && f.mes ? ' - ' + f.mes : '') + '.csv', linhas: l.length };
}

/**
 * Compra feita sem pedido no sistema. d: { finalidade, vinculo:{...}, itens:[{descricao, quantidade, unidade}], fornecedorId | fornecedorNome, valor, pagoEm,
 *   formaPagamento..., comprovante, justificativa (>= 20) }
 */
function CmpFin_semPedido_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'registrar a compra sem pedido');
  d = d || {};
  var just = Cmp_texto_(d.justificativa, 1000);
  if (just.length < 20) throw new Error('Não foi possível registrar: explique por que a compra foi feita fora do sistema (pelo menos 20 letras), por exemplo "Peça comprada no balcão durante o atendimento; equipamento parado". Ela vai para a ciência da gestão');
  var fin = Cmp_texto_(d.finalidade, 500);
  if (fin.length < 10) throw new Error('Não foi possível registrar: escreva para que foi a compra (pelo menos 10 letras)');
  var vinc = CmpR_vinculo_(d.vinculo), itensTela = CmpR_itensDaTela_(d.itens);
  var f = Cmp_s_(d.fornecedorId) ? SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(d.fornecedorId)) : null, fNome = f ? CmpF_nome_(f) : Cmp_texto_(d.fornecedorNome, 160);
  if (fNome.length < 3) throw new Error('Não foi possível registrar: escolha o fornecedor do cadastro ou escreva o nome de onde foi comprado');
  var valor = Cmp_num_(d.valor);
  if (!(valor > 0)) throw new Error('Não foi possível registrar: informe o valor pago (como está no comprovante)');
  var pagoEm = Cmp_dia_(d.pagoEm);
  if (!pagoEm || pagoEm > Cmp_hoje_()) throw new Error('Não foi possível registrar: informe a data da compra (hoje ou antes)');
  var pag = CmpP_formaPagamento_(d);
  if (!(d.comprovante && d.comprovante.base64)) throw new Error('Não foi possível registrar: anexe o comprovante (cupom fiscal, nota ou recibo). O Financeiro confere por ele');
  return Cmp_comTrava_(function () {
    var agora = Cmp_agora_(), numero = Cmp_proximoNumero_('REQ', CMP_ABAS.REQUISICOES, 'NUMERO');
    var arq = Cmp_salvarArquivo_(d.comprovante, numero, 'Comprovante da compra sem pedido', CMP_RX_PDF_IMG, 'do comprovante');
    var r = SGO_DATA.insert(CMP_ABAS.REQUISICOES, Object.assign({}, vinc, { NUMERO: numero, SOLICITANTE_ID: eu.id, SOLICITANTE_NOME: eu.nome, SOLICITANTE_AREA: eu.area, URGENCIA: 'NORMAL', FINALIDADE: fin,
      SITUACAO: 'ENTREGUE', SEM_PEDIDO: 'SIM', SEM_PEDIDO_JUSTIFICATIVA: just, VALOR_TOTAL: Cmp_r2_(valor), ENTREGUE_EM: agora, ENTREGUE_A_ID: eu.id, ENTREGUE_A_NOME: eu.nome,
      ENTREGA_EVIDENCIA: 'Compra feita fora do sistema por ' + eu.nome + '.', ENTREGUE_POR_NOME: eu.nome, ORIGEM: 'SEM_PEDIDO', REPROVACOES: 0, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora }));
    var itens = CmpR_gravarItens_(r, itensTela, eu);
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { TITULO: CmpR_tituloDe_(itens), ESPEC_FALTA: '[]' });
    var ped = SGO_DATA.insert(CMP_ABAS.PEDIDOS, Object.assign({}, pag, { NUMERO: '', REVISAO: 0, REQUISICAO_ID: r.ID, REQUISICAO_NUMERO: numero, FORNECEDOR_ID: f ? Cmp_s_(f.ID) : '', FORNECEDOR_NOME: fNome,
      VALOR_TOTAL: Cmp_r2_(valor), VALOR_PAGO: Cmp_r2_(valor), PAGO_EM: pagoEm, COMPROVANTE_ID: arq.id, COMPROVANTE_NOME: arq.nome, COMPROVANTE_URL: arq.url, PAGAMENTO_POR_ID: eu.id, PAGAMENTO_POR_NOME: eu.nome,
      EMITIDO_EM: agora, EMITIDO_POR_ID: eu.id, EMITIDO_POR_NOME: eu.nome, FIN_SITUACAO: 'AGUARDANDO', SEM_PEDIDO: 'SIM', SITUACAO: 'SEM_PEDIDO', ATUALIZADO_EM: agora }));
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { PEDIDO_ID: ped.ID });
    Cmp_historico_('REQUISICAO', r.ID, 'SEM_PEDIDO', eu, { publico: true, para: 'Entregue', texto: 'Compra feita fora do sistema, registrada por ' + eu.nome + '. Justificativa: ' + just });
    Cmp_historico_('REQUISICAO', r.ID, 'PAGAMENTO', eu, { texto: 'Valor ' + Cmp_moeda_(valor) + ' em ' + Cmp_brDia_(pagoEm) + ' · ' + fNome + ' · ' + CmpP_formaTexto_(pag, true) + '.' });
    CmpFin_idsFinanceiro_(Cmp_usuarios_(), [eu.id]).forEach(function (id) {
      Cmp_avisar_(id, 'PARA_CONFERIR', 'Compra sem pedido para conferir: ' + numero, 'Compra feita fora do sistema por ' + eu.nome + ' (' + fNome + '). Confira em Compras > Conferência do Financeiro.', r.ID, { email: true, autorId: eu.id });
    });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, { PEDIDO_ID: ped.ID }), true), message: 'Compra sem pedido registrada (' + numero + '). Ela vai para a conferência do Financeiro e para a ciência da gestão. Da próxima vez, peça pelo sistema antes de comprar.' };
  });
}

/** Gestão marca ciência da compra sem pedido. d: { requisicaoId, texto } */
function CmpFin_ciente_(eu, d) {
  if (!(eu.gestor || eu.diretoria || eu.admin)) throw new Error('Não foi possível registrar a ciência: é da gestão (gestor, Diretoria ou Administrador)');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d && d.requisicaoId, 'registrar a ciência');
    if (!Cmp_sim_(r.SEM_PEDIDO) || Cmp_s_(r.GESTAO_CIENTE_EM)) throw new Error('Não foi possível registrar: não é compra sem pedido ou a ciência já foi registrada');
    if (Cmp_s_(r.SOLICITANTE_ID) === eu.id) throw new Error('Não foi possível registrar: a compra é sua. A ciência é de outro gestor ou da Diretoria');
    var campos = { GESTAO_CIENTE_EM: Cmp_agora_(), GESTAO_CIENTE_POR_NOME: eu.nome, GESTAO_CIENTE_TEXTO: Cmp_texto_(d.texto, 500), ATUALIZADO_EM: Cmp_agora_() };
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    Cmp_historico_('REQUISICAO', r.ID, 'GESTAO_CIENTE', eu, { texto: 'Gestão ciente da compra sem pedido.' + (campos.GESTAO_CIENTE_TEXTO ? ' ' + campos.GESTAO_CIENTE_TEXTO : '') });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Ciência registrada. A compra sai da Caixa de decisões.' };
  });
}

// ------------------------------------------------------------
// TELA E PENDÊNCIAS
// ------------------------------------------------------------
function CmpFin_paraTela_(eu, r, t) {
  var p = Cmp_s_(r.PEDIDO_ID) ? CmpFin_pedidoPorId_(r.PEDIDO_ID) : null;
  if (!p || !eu.veValores) return;
  t.finSituacao = Cmp_up_(p.FIN_SITUACAO);
  t.financeiro = { situacao: t.finSituacao, situacaoNome: CMP_FIN_SITUACOES[t.finSituacao] || '', valorPagoTxt: Cmp_s_(p.VALOR_PAGO) !== '' ? Cmp_moeda_(p.VALOR_PAGO) : '', pagoEm: Cmp_brDia_(p.PAGO_EM),
    forma: CmpP_formaTexto_(p, true), comprovanteUrl: Cmp_s_(p.COMPROVANTE_URL), comprovanteNome: Cmp_s_(p.COMPROVANTE_NOME), obs: Cmp_s_(p.FIN_OBS), por: Cmp_s_(p.FIN_POR_NOME), em: Cmp_br_(p.FIN_EM),
    reenvio: Cmp_s_(p.FIN_REENVIO_TEXTO), registradoPor: Cmp_s_(p.PAGAMENTO_POR_NOME), pedidoId: Cmp_s_(p.ID) };
}

function CmpFin_acoes_(eu, r, a) {
  var p = Cmp_s_(r.PEDIDO_ID) ? CmpFin_pedidoPorId_(r.PEDIDO_ID) : null, s = Cmp_up_(r.SITUACAO);
  a.pagamento = !!p && eu.comprador && ['PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA', 'DISPONIVEL', 'ENTREGUE'].indexOf(s) >= 0 && Cmp_up_(p.FIN_SITUACAO) !== 'CONFERIDA' && Cmp_up_(p.FIN_SITUACAO) !== 'AGUARDANDO';
  a.conferir = !!p && eu.financeiro && Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO' && eu.id !== Cmp_s_(p.PAGAMENTO_POR_ID) && eu.id !== Cmp_s_(p.EMITIDO_POR_ID);
  a.ciente = Cmp_sim_(r.SEM_PEDIDO) && !Cmp_s_(r.GESTAO_CIENTE_EM) && (eu.gestor || eu.diretoria || eu.admin) && eu.id !== Cmp_s_(r.SOLICITANTE_ID);
}

function CmpFin_pendencias_(add, ctx, r, o) {
  var p = Cmp_s_(r.PEDIDO_ID) ? CmpFin_pedidoPorId_(r.PEDIDO_ID) : null, num = Cmp_s_(r.NUMERO), tit = Cmp_s_(r.TITULO).slice(0, 60);
  if (p && Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO') {
    var fin = CmpFin_idsFinanceiro_(o.usuarios(), []);
    add(Pend_item_('compras_conferir', { id: 'CMP:CONFERIR:' + p.ID, nome: num, publico: 'PESSOA', paraUsuarios: fin, responsavel: 'Financeiro', responsavelId: '', gravidade: 'ATENCAO', dias: null,
      titulo: 'Conferir a compra ' + num + ' (' + tit + ')' + (Cmp_sim_(p.SEM_PEDIDO) ? ' — compra sem pedido' : ''), detalhe: 'Pagamento registrado por ' + Cmp_s_(p.PAGAMENTO_POR_NOME) + ' (' + (CMP_FORMAS_PAGAMENTO[Cmp_up_(p.FORMA_PAGAMENTO)] || '') + '). O valor e o comprovante estão na conferência.',
      oQueFazer: 'Abra Compras > Conferência do Financeiro, confira o dossiê e marque "Conferida" ou "Divergente". Quem registrou a compra não confere a própria.', tela: CMP_PEND_TELA('compras_financeiro', '') }));
  }
  if (p && Cmp_up_(p.FIN_SITUACAO) === 'DIVERGENTE') {
    var dest = Cmp_s_(p.PAGAMENTO_POR_ID) || Cmp_s_(r.COMPRADOR_ID);
    add(Pend_item_('compras_fin_divergente', { id: 'CMP:FINDIV:' + p.ID, nome: num, publico: 'PESSOA', paraUsuarios: [dest], responsavel: Cmp_s_(p.PAGAMENTO_POR_NOME), responsavelId: dest, gravidade: 'ATENCAO', dias: null,
      titulo: 'Corrigir a compra ' + num + ' (' + tit + '): divergência do Financeiro', detalhe: Cmp_s_(p.FIN_POR_NOME) + ' apontou: ' + Cmp_s_(p.FIN_OBS).slice(0, 220),
      oQueFazer: 'Abra a ficha da compra, toque em "Registrar o pagamento", corrija o valor, a forma ou o comprovante e escreva o que foi corrigido.', tela: CMP_PEND_TELA('compras', Cmp_s_(r.ID)) }));
  }
  if (Cmp_sim_(r.SEM_PEDIDO) && !Cmp_s_(r.GESTAO_CIENTE_EM)) {
    var sol = Cmp_s_(r.SOLICITANTE_ID), area = Cmp_up_(r.SOLICITANTE_AREA) || Cmp_up_(o.regras.areaCompras), extra = { area: area, naoPode: [sol], desde: Cmp_dia_(r.CRIADO_EM) || o.hoje };
    var conf = []; try { conf = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {})[area] || []; } catch (e) { conf = []; }
    if (!conf.length) { var us = o.usuarios(), g = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === area && id !== sol; })[0]; if (g) { extra.decisor = g; extra.motivoDecisor = 'Gestor da área de quem comprou (cadastro; a área ainda não tem responsável em Regras e responsáveis).'; } }
    add(Pend_item_('compras_sem_pedido', { id: 'CMP:SEMPED:' + r.ID, nome: num, publico: 'GESTAO', responsavel: Cmp_s_(r.SOLICITANTE_NOME), responsavelId: sol, gravidade: 'ATENCAO', dias: null,
      titulo: 'Compra feita sem pedido no sistema: ' + num + ' (' + tit + ') por ' + Cmp_s_(r.SOLICITANTE_NOME), detalhe: 'Justificativa: ' + Cmp_s_(r.SEM_PEDIDO_JUSTIFICATIVA).slice(0, 220),
      oQueFazer: 'Abra a ficha da compra em Compras > Fila de compras, leia a justificativa e toque em "Ciente". Converse com a pessoa para que a próxima compra passe pelo sistema.',
      tela: CMP_PEND_TELA('compras', Cmp_s_(r.ID)), extra: extra }));
  }
}

// ------------------------------------------------------------
// PAINEL E RELATÓRIO MENSAL
// ------------------------------------------------------------
function CmpFin_indicadores_(comp) {
  var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {}, hoje = Cmp_hoje_();
  var reqs = Cmp_ler_(CMP_ABAS.REQUISICOES), peds = Cmp_ler_(CMP_ABAS.PEDIDOS), porReq = {};
  reqs.forEach(function (r) { porReq[Cmp_s_(r.ID)] = r; });
  var doMes = peds.filter(function (p) { return Cmp_up_(p.SITUACAO) !== 'CANCELADO' && (Cmp_dia_(p.EMITIDO_EM) || Cmp_dia_(p.CRIADO_EM)).slice(0, 7) === comp; });
  var soma = function (l) { return Cmp_r2_(l.reduce(function (s, p) { return s + (Number(p.VALOR_TOTAL) || 0); }, 0)); };
  var agrupar = function (chave) {
    var m = {};
    doMes.forEach(function (p) { var k = chave(p, porReq[Cmp_s_(p.REQUISICAO_ID)] || {}); m[k] = m[k] || { nome: k, qtd: 0, valor: 0 }; m[k].qtd++; m[k].valor = Cmp_r2_(m[k].valor + (Number(p.VALOR_TOTAL) || 0)); });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.valor - a.valor; });
  };
  var abertas = ['SOLICITADA', 'EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA', 'DISPONIVEL'];
  var situacoes = abertas.map(function (s) { return { codigo: s, nome: CMP_SITUACOES[s], qtd: reqs.filter(function (r) { return Cmp_up_(r.SITUACAO) === s; }).length }; });
  var atrasadas = reqs.filter(function (r) { return Cmp_up_(r.SITUACAO) === 'PEDIDO_FEITO' && Cmp_dia_(r.PREVISAO_ENTREGA) && Cmp_dia_(r.PREVISAO_ENTREGA) < hoje; });
  var foraPrazo = reqs.filter(function (r) { return Cmp_dia_(r.RECEBIDA_EM).slice(0, 7) === comp && Cmp_dia_(r.PREVISAO_ENTREGA) && Cmp_dia_(r.RECEBIDA_EM) > Cmp_dia_(r.PREVISAO_ENTREGA); });
  var menos = reqs.filter(function (r) { return Cmp_s_(r.COTACOES_JUSTIFICATIVA) && Cmp_dia_(r.ESCOLHA_EM).slice(0, 7) === comp; });
  var divRec = reqs.filter(function (r) { return Cmp_s_(r.DIVERGENCIA_TEXTO) && Cmp_dia_(r.RECEBIDA_EM).slice(0, 7) === comp; });
  var divFin = peds.filter(function (p) { return Cmp_up_(p.FIN_SITUACAO) === 'DIVERGENTE' || Cmp_s_(p.FIN_REENVIO_TEXTO); }).filter(function (p) { return (Cmp_dia_(p.FIN_EM) || Cmp_dia_(p.PAGO_EM)).slice(0, 7) === comp; });
  var semPed = doMes.filter(function (p) { return Cmp_sim_(p.SEM_PEDIDO); });
  var conf = { aguardando: peds.filter(function (p) { return Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO'; }).length, divergentes: peds.filter(function (p) { return Cmp_up_(p.FIN_SITUACAO) === 'DIVERGENTE'; }).length,
    semPagamento: peds.filter(function (p) { return !Cmp_s_(p.FIN_SITUACAO) && Cmp_up_(p.SITUACAO) !== 'CANCELADO'; }).length };
  var lista = function (l, porPed) { return l.map(function (x) { var r = porPed ? porReq[Cmp_s_(x.REQUISICAO_ID)] || {} : x; return { numero: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO).slice(0, 80), quem: Cmp_s_(r.SOLICITANTE_NOME), comprador: Cmp_s_(r.COMPRADOR_NOME), previsao: Cmp_brDia_(r.PREVISAO_ENTREGA), recebida: Cmp_brDia_(r.RECEBIDA_EM), texto: Cmp_s_(r.COTACOES_JUSTIFICATIVA || r.DIVERGENCIA_TEXTO || r.SEM_PEDIDO_JUSTIFICATIVA || x.FIN_OBS).slice(0, 160) }; }); };
  return {
    comp: comp, pedidos: { qtd: doMes.length, valor: soma(doMes) }, porVinculo: agrupar(function (p, r) { return CMP_VINCULOS[Cmp_up_(r.VINCULO_TIPO)] ? CMP_VINCULOS[Cmp_up_(r.VINCULO_TIPO)].replace(/ \(.*\)$/, '') : 'Sem vínculo'; }),
    porArea: agrupar(function (p, r) { var a = Cmp_up_(r.SOLICITANTE_AREA); return a ? (nomesAreas[a] || a) : 'Sem área'; }), porFornecedor: agrupar(function (p) { return Cmp_s_(p.FORNECEDOR_NOME) || 'Sem fornecedor'; }),
    situacoes: situacoes, abertas: situacoes.reduce(function (s, x) { return s + x.qtd; }, 0), atrasadas: lista(atrasadas), foraPrazo: lista(foraPrazo), menosCotacoes: lista(menos), divergenciasRecebimento: lista(divRec),
    divergenciasFinanceiro: lista(divFin, true), semPedido: lista(semPed, true), conferencia: conf,
    entregues: reqs.filter(function (r) { return Cmp_dia_(r.ENTREGUE_EM).slice(0, 7) === comp; }).length, canceladas: reqs.filter(function (r) { return Cmp_dia_(r.CANCELADA_EM).slice(0, 7) === comp; }).length
  };
}

function CmpFin_painel_(eu, d) {
  Cmp_exigir_(eu, 'FILA', 'ver o painel de compras');
  var comp = /^\d{4}-\d{2}$/.test(Cmp_s_(d && d.competencia)) ? Cmp_s_(d.competencia) : Cmp_hoje_().slice(0, 7);
  var ind = CmpFin_indicadores_(comp);
  var fmt = function (l) { return l.map(function (x) { return { nome: x.nome, qtd: x.qtd, valorTxt: Cmp_moeda_(x.valor) }; }); };
  return { competencia: comp, competenciaNome: typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp, pedidos: { qtd: ind.pedidos.qtd, valorTxt: Cmp_moeda_(ind.pedidos.valor) },
    porVinculo: fmt(ind.porVinculo), porArea: fmt(ind.porArea), porFornecedor: fmt(ind.porFornecedor).slice(0, 15), situacoes: ind.situacoes, abertas: ind.abertas, atrasadas: ind.atrasadas,
    foraPrazo: ind.foraPrazo, menosCotacoes: ind.menosCotacoes, divergenciasRecebimento: ind.divergenciasRecebimento, divergenciasFinanceiro: ind.divergenciasFinanceiro, semPedido: ind.semPedido,
    conferencia: ind.conferencia, entregues: ind.entregues, canceladas: ind.canceladas, podeRelatorio: eu.gestao || eu.gestor || eu.diretoria };
}

function CmpFin_pastaRelatorios_() { return SGO_DocSalvar_pastaPersistente_('CMP_PASTA_RELATORIOS_ID', CMP_PASTA_RELATORIOS, ''); }

function CmpFin_relatorioHtml_(comp, ind, emitidoPor) {
  var t = function (cols, linhas, leg, vazio, total) { return RelA4_tabela_(cols, linhas, { legenda: leg, vazio: vazio, total: total }); };
  var grupo = function (l, rot) { return t([{ t: rot }, { t: 'Pedidos', num: true }, { t: 'Valor', num: true }], l.map(function (x) { return [x.nome, String(x.qtd), Cmp_moeda_(x.valor)]; }), 'Gasto do mês por ' + rot.toLowerCase(), 'Nenhuma compra no mês.', ['Total', String(ind.pedidos.qtd), Cmp_moeda_(ind.pedidos.valor)]); };
  var casos = function (l, leg, vazio) { return t([{ t: 'Pedido' }, { t: 'Item' }, { t: 'Responsável' }, { t: 'Detalhe' }], l.map(function (x) { return [x.numero, x.titulo, x.comprador || x.quem, x.texto || ('previsão ' + x.previsao + (x.recebida ? '; recebida ' + x.recebida : ''))]; }), leg, vazio); };
  var corpo = '';
  corpo += RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [Cmp_moeda_(ind.pedidos.valor), 'Comprado no mês (' + Cmp_plural_(ind.pedidos.qtd, 'pedido', 'pedidos') + ')', ''],
    [String(ind.abertas), 'Pedidos de compra em aberto', ''], [String(ind.entregues), 'Entregues no mês', 'ok'],
    [String(ind.atrasadas.length), 'Entregas atrasadas agora', ind.atrasadas.length ? 'critico' : 'ok'],
    [String(ind.foraPrazo.length), 'Recebidas fora do prazo no mês', ind.foraPrazo.length ? 'aviso' : 'ok'],
    [String(ind.menosCotacoes.length), 'Com menos cotações que o mínimo', ind.menosCotacoes.length ? 'aviso' : 'ok'],
    [String(ind.semPedido.length), 'Compras sem pedido no sistema', ind.semPedido.length ? 'critico' : 'ok'],
    [String(ind.conferencia.aguardando), 'Aguardando conferência do Financeiro', ind.conferencia.aguardando ? 'aviso' : 'ok']
  ]));
  corpo += RelA4_secao_('Gasto por vínculo', grupo(ind.porVinculo, 'Vínculo'));
  corpo += RelA4_secao_('Gasto por área de quem pediu', grupo(ind.porArea, 'Área'));
  corpo += RelA4_secao_('Gasto por fornecedor', grupo(ind.porFornecedor.slice(0, 20), 'Fornecedor'));
  corpo += RelA4_secao_('Prazo', RelA4_subsecao_('Recebidas fora do prazo no mês', casos(ind.foraPrazo, 'Compras recebidas depois da previsão', 'Nenhuma.')) + RelA4_subsecao_('Entregas atrasadas na data do relatório', casos(ind.atrasadas, 'Pedidos com a previsão vencida', 'Nenhuma.')));
  corpo += RelA4_secao_('Controles', RelA4_subsecao_('Menos cotações que o mínimo da faixa', casos(ind.menosCotacoes, 'Escolhas com justificativa de cotações', 'Nenhuma.')) +
    RelA4_subsecao_('Divergências de recebimento', casos(ind.divergenciasRecebimento, 'Recebimentos com divergência no mês', 'Nenhuma.')) +
    RelA4_subsecao_('Divergências do Financeiro', casos(ind.divergenciasFinanceiro, 'Conferências com divergência no mês', 'Nenhuma.')) +
    RelA4_subsecao_('Compras sem pedido no sistema', casos(ind.semPedido, 'Compras registradas depois de feitas', 'Nenhuma.')));
  corpo += RelA4_secao_('Situação das compras em aberto', RelA4_identificacao_(ind.situacoes.map(function (s) { return [s.nome, String(s.qtd)]; })));
  return RelA4_documento_({ titulo: 'Relatório mensal de compras', subtitulo: RelA4_competencia_(comp), tituloCurto: 'Relatório de compras', tituloArquivo: 'Relatorio de compras', sigla: 'CMP',
    identificacao: RelA4_competencia_(comp), rotuloIdentificacao: 'Competência', emitidoPor: emitidoPor || 'Rotina automática', corpo: corpo, tipoCapa: 'Relatório gerencial' });
}

/** Gera e salva o relatório da competência ('aaaa-mm'). */
function Compras_relatorioMes_(comp, quem) {
  try { Cmp_garantirAbas_(); } catch (e) {}
  var ind = CmpFin_indicadores_(comp);
  var html = CmpFin_relatorioHtml_(comp, ind, quem);
  var g = RelA4_salvar_(CmpFin_pastaRelatorios_, comp, html, { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, aviso: g.aviso, html: g.html, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, indicadores: ind };
}

/** Rotina: no primeiro dia útil do mês (a partir das 8 h), o relatório do mês anterior, uma vez, com aviso à Diretoria. */
function CmpFin_relatorioAutomatico_(quando) {
  var hoje = Cmp_hoje_(), cfgExp = Cmp_expediente_();
  var primeiro = typeof Ges_ehDiaDoMensal_ === 'function' ? Ges_ehDiaDoMensal_(hoje, cfgExp) : (Number(hoje.slice(8)) <= 3);
  if (!primeiro) return { fora: 'não é o primeiro dia útil do mês' };
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true };
  if (!ex.dentro) return { fora: 'fora do expediente' };
  var m = /^(\d{4})-(\d{2})/.exec(hoje), ano = Number(m[1]), mes = Number(m[2]) - 1;
  if (mes === 0) { ano--; mes = 12; }
  var comp = ano + '-' + Cmp_2_(mes), props = PropertiesService.getScriptProperties(), chave = 'CMP_RELMES_' + comp;
  if (props.getProperty(chave)) return { feito: comp };
  if (!Cmp_ler_(CMP_ABAS.REQUISICOES).length) { props.setProperty(chave, 'sem uso'); return { fora: 'Compras sem uso no mês' }; }
  var g = Compras_relatorioMes_(comp, 'Rotina automática');
  props.setProperty(chave, g.salvo ? g.pdfUrl || 'ok' : 'erro');
  // Com o e-mail mensal da Diretoria ligado (Caixa de decisões), o relatório já vai nele: aqui o aviso fica só no sistema.
  var noEmailGestao = false;
  try { var gc = typeof Ges_cfg_ === 'function' ? Ges_cfg_() : null; noEmailGestao = !!(gc && gc.escada && gc.escada.mensal && gc.automacoes && gc.automacoes.relatoriosMensais); } catch (eG) {}
  var us = Cmp_usuarios_();
  Cmp_diretoria_(us, []).forEach(function (id) {
    Cmp_avisar_(id, 'RELATORIO_MES', 'Relatório mensal de compras: ' + (typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp), g.salvo ? 'O relatório do mês está na pasta Compras - Relatórios e em Compras > Painel de compras.' : 'Não foi possível salvar o relatório: ' + g.aviso, '', { email: !(noEmailGestao && g.salvo) });
  });
  return { gerado: comp, salvo: g.salvo };
}
