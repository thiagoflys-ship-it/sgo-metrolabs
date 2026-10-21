/****************************************************
 * COMPRAS — PEDIDO DE COMPRA A4, ENVIO AO FORNECEDOR, RECEBIMENTO E ENTREGA (21/10/2026)
 *
 * Pedido de compra (CMP_PEDIDOS): número anual PC-2026-0001, revisão 00, 01... Folha A4 retrato no padrão do SGO+
 * (SGO_DocA4 + blocos de SGO_Documentos_RelatorioA4), salva em HTML e PDF na pasta "Compras - Pedidos de compra/<AAAA-MM>":
 * dados da Metrolabs (entrega e faturamento, em Regras de compras), fornecedor, itens com a especificação e a
 * quantidade, preço unitário, frete, impostos e total, prazo, condição e forma de pagamento, referência do orçamento
 * do fornecedor, quem emitiu e quem aprovou. O vínculo aparece só pelo código interno (sem o nome do cliente). Texto
 * justificado, sem marcação de sistema, sem fabricante. Marca de conferência do conteúdo (SHA-256).
 * Envio: sempre ação do comprador, pela janela "Enviar documento" (classe FORNECEDOR: e-mail do fornecedor como
 * destinatário sugerido), que guarda o histórico; o envio registrado marca o pedido como enviado. "Peça pedida" é só
 * histórico (matriz de avisos, C034).
 *
 * Recebimento com conferência obrigatória: quantidade de cada item, especificação, dano (foto obrigatória), nota fiscal.
 * Qualquer divergência segura a peça em "Recebida com divergência" com o motivo, até o comprador resolver. Sem
 * divergência: "Disponível", quem pediu é avisado (no sistema e no resumo de e-mail), o comprador recebe a atividade de
 * entrega e, no pedido do Comercial, o vendedor é avisado e a atividade do setor Compras é concluída quando todas as
 * compras daquele pedido chegaram. Entrega a quem pediu com evidência (ou confirmação de quem pediu) encerra.
 *
 * Integração com o Comercial: Compras_doPedidoComercial_ é chamada por "Passar aos setores" (SGO_Comercial_Propostas.js)
 * e abre a requisição com os produtos do pedido aprovado, sem o valor de venda.
 ****************************************************/

var CMP_PASTA_PEDIDOS = 'Compras - Pedidos de compra';

function CmpP_pastaRaiz_() { return SGO_DocSalvar_pastaPersistente_('CMP_PASTA_PEDIDOS_ID', CMP_PASTA_PEDIDOS, ''); }
function CmpP_pastaMes_() { return RelA4_subpasta_(CmpP_pastaRaiz_(), Cmp_hoje_().slice(0, 7)); }
function CmpP_rotulo_(p) { return Cmp_s_(p.NUMERO) + ' rev.' + (typeof SGO_DocA4_revisao_ === 'function' ? SGO_DocA4_revisao_(p.REVISAO) : Cmp_s_(p.REVISAO)); }
function CmpP_esc_(s) { return typeof RelA4_esc_ === 'function' ? RelA4_esc_(s) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function CmpP_pedidoDe_(r) { return Cmp_s_(r.PEDIDO_ID) ? SGO_DATA.getById(CMP_ABAS.PEDIDOS, Cmp_s_(r.PEDIDO_ID)) : null; }

/** Forma de pagamento da tela -> campos (confere o que cada forma exige). */
function CmpP_formaPagamento_(d) {
  d = d || {};
  var f = Cmp_up_(d.formaPagamento);
  if (!CMP_FORMAS_PAGAMENTO[f]) throw new Error('Não foi possível registrar: escolha a forma de pagamento (cartão, PIX, boleto, transferência, faturado ou reembolso). O Financeiro confere a compra por ela');
  var c = { FORMA_PAGAMENTO: f, CARTAO_FINAL: '', PARCELAS: '', BOLETO_VENCIMENTO: '', CONDICAO: Cmp_texto_(d.condicao, 200), REEMBOLSO_PARA_ID: '', REEMBOLSO_PARA_NOME: '' };
  if (f === 'CARTAO_CREDITO' || f === 'CARTAO_DEBITO') {
    c.CARTAO_FINAL = Cmp_digitos_(d.cartaoFinal);
    if (c.CARTAO_FINAL.length !== 4) throw new Error('Não foi possível registrar: informe os 4 últimos números do cartão usado. É assim que o Financeiro bate a fatura (nunca digite o número inteiro do cartão)');
    var n = f === 'CARTAO_CREDITO' ? Cmp_num_(d.parcelas || 1) : 1;
    if (!(n >= 1 && n <= 24) || Math.round(n) !== n) throw new Error('Não foi possível registrar: informe o número de parcelas (de 1 a 24)');
    c.PARCELAS = n;
  } else if (f === 'BOLETO') {
    c.BOLETO_VENCIMENTO = Cmp_dia_(d.boletoVencimento);
    if (!c.BOLETO_VENCIMENTO) throw new Error('Não foi possível registrar: informe o vencimento do boleto');
  } else if (f === 'FATURADO') {
    if (c.CONDICAO.length < 3) throw new Error('Não foi possível registrar: escreva a condição do faturamento (por exemplo "28 dias da nota fiscal")');
  } else if (f === 'REEMBOLSO') {
    var us = Cmp_usuarios_(), id = Cmp_s_(d.reembolsoParaId);
    if (!us[id]) throw new Error('Não foi possível registrar: escolha quem pagou e vai receber o reembolso');
    c.REEMBOLSO_PARA_ID = id; c.REEMBOLSO_PARA_NOME = us[id].nome;
  }
  return c;
}
function CmpP_formaTexto_(p, comCartao) {
  var f = Cmp_up_(p.FORMA_PAGAMENTO), t = CMP_FORMAS_PAGAMENTO[f] || '';
  if (f === 'CARTAO_CREDITO' && Number(p.PARCELAS) > 1) t += ' em ' + p.PARCELAS + ' parcelas';
  if ((f === 'CARTAO_CREDITO' || f === 'CARTAO_DEBITO') && comCartao && Cmp_s_(p.CARTAO_FINAL)) t += ' (final ' + Cmp_s_(p.CARTAO_FINAL) + ')';
  if (f === 'BOLETO' && Cmp_s_(p.BOLETO_VENCIMENTO)) t += ' com vencimento em ' + Cmp_brDia_(p.BOLETO_VENCIMENTO);
  if (f === 'REEMBOLSO' && comCartao) t += ' a ' + Cmp_s_(p.REEMBOLSO_PARA_NOME);
  if (Cmp_s_(p.CONDICAO)) t += (t ? ' · ' : '') + Cmp_s_(p.CONDICAO);
  return t;
}

/** Dados do momento da emissão (ficam no pedido). */
function CmpP_congelar_(r, c, f, regras, eu) {
  var itens = CmpR_itensDe_(r.ID), precos = Cmp_json_(c.PRECOS_JSON, []), mapaEq = {}, emp = typeof RelA4_empresa_ === 'function' ? RelA4_empresa_() : { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  return {
    empresa: { nome: emp.nome, cnpj: emp.cnpj, entrega: Cmp_s_(regras.empresa.enderecoEntrega), faturamento: Cmp_s_(regras.empresa.enderecoFaturamento), observacao: Cmp_s_(regras.empresa.observacaoPedido) },
    fornecedor: { nome: CmpF_nome_(f), razao: Cmp_s_(f.RAZAO_SOCIAL), documento: CmpF_docFmt_(f.DOCUMENTO), endereco: [Cmp_s_(f.ENDERECO), [Cmp_s_(f.CIDADE), Cmp_s_(f.UF)].filter(Boolean).join('/')].filter(Boolean).join(' · '),
      contato: Cmp_s_(f.CONTATO), email: Cmp_s_(f.EMAIL_PEDIDOS), telefone: Cmp_s_(f.TELEFONE) },
    itens: itens.map(function (i) {
      var p = precos.filter(function (x) { return Cmp_s_(x.itemId) === Cmp_s_(i.ID); })[0] || {};
      var espec = [Cmp_s_(i.PART_NUMBER) ? 'Nº da peça ' + Cmp_s_(i.PART_NUMBER) : '', Cmp_s_(i.MARCA) ? 'Marca ' + Cmp_s_(i.MARCA) : '', CmpR_equipTextoItem_(i, mapaEq) ? 'Equipamento ' + CmpR_equipTextoItem_(i, mapaEq) : '',
        Cmp_s_(i.TENSAO), Cmp_s_(i.CORRENTE), Cmp_s_(i.PRESSAO), Cmp_s_(i.ROSCA), Cmp_s_(i.DIMENSAO), Cmp_s_(i.MATERIAL), Cmp_s_(i.OUTRAS_ESPEC)].filter(Boolean).join(' · ');
      return { descricao: Cmp_s_(i.DESCRICAO), especificacao: espec, quantidade: Number(i.QUANTIDADE) || 0, unidade: Cmp_s_(i.UNIDADE), precoUnitario: Number(p.precoUnitario) || 0 };
    }),
    subtotal: Number(c.SUBTOTAL) || 0, frete: Number(c.FRETE) || 0, impostos: Number(c.IMPOSTOS) || 0, total: Number(c.TOTAL) || 0, prazoDias: Cmp_s_(c.PRAZO_DIAS),
    referenciaFornecedor: Cmp_s_(c.REFERENCIA), condicaoFornecedor: Cmp_s_(c.CONDICAO_PAGAMENTO), compatibilidade: CMP_COMPATIBILIDADE[Cmp_up_(c.COMPATIBILIDADE)] || '',
    referenciaInterna: Cmp_s_(r.NUMERO), vinculo: CmpR_vinculoTexto_(r, false).replace(/^Uso interno: .*/, 'Uso interno'),
    emitidoPor: eu.nome, aprovadoPor: Cmp_s_(r.APROVADA_POR_NOME), aprovadoEm: Cmp_br_(r.APROVADA_EM), aprovadorNivel: CMP_NIVEIS_APROVACAO[Cmp_up_(r.APROVADOR_NIVEL)] || '', em: Cmp_agora_()
  };
}

/** HTML A4 do pedido de compra (sem salvar). p: linha de CMP_PEDIDOS (com os campos novos); cong: dados congelados. */
function CmpP_html_(p, cong, marca) {
  var e = cong.empresa, f = cong.fornecedor, corpo = '';
  corpo += RelA4_secao_('Fornecedor', RelA4_identificacao_([['Razão social', f.razao || f.nome], ['CNPJ/CPF', f.documento || '—'], ['Endereço', f.endereco || '—', { largo: true }],
    ['Contato', f.contato || '—'], ['E-mail', f.email || '—'], ['Telefone', f.telefone || '—', { largo: true }]]));
  corpo += RelA4_secao_('Comprador', RelA4_identificacao_([['Empresa', e.nome + (e.cnpj ? ' · CNPJ ' + e.cnpj : ''), { largo: true }], ['Endereço de entrega', e.entrega || 'A combinar com o comprador', { largo: true }],
    ['Endereço de faturamento', e.faturamento || 'O mesmo da entrega', { largo: true }], ['Comprador responsável', cong.emitidoPor], ['Referência interna', cong.referenciaInterna + ' · ' + cong.vinculo]]));
  var linhas = cong.itens.map(function (i, k) {
    return [String(k + 1), { html: '<b>' + CmpP_esc_(i.descricao) + '</b>' + (i.especificacao ? '<span class="sub">' + CmpP_esc_(i.especificacao) + '</span>' : '') }, Cmp_qtd_(i.quantidade), i.unidade || 'un.', Cmp_moeda_(i.precoUnitario), Cmp_moeda_(i.precoUnitario * i.quantidade)];
  });
  var tabela = RelA4_tabela_([{ t: 'Nº', cen: true, w: '7mm' }, { t: 'Descrição e especificação' }, { t: 'Qtd.', num: true }, { t: 'Un.', cen: true }, { t: 'Preço unit.', num: true }, { t: 'Total', num: true }], linhas, { legenda: 'Itens do pedido de compra ' + CmpP_rotulo_(p), vazio: 'Sem itens.' });
  var resumo = [['Subtotal', Cmp_moeda_(cong.subtotal)]];
  if (cong.frete) resumo.push(['Frete', Cmp_moeda_(cong.frete)]);
  if (cong.impostos) resumo.push(['Impostos', Cmp_moeda_(cong.impostos)]);
  resumo.push(['Total do pedido', Cmp_moeda_(cong.total)]);
  tabela += '<table class="t compacta manter" style="width:auto;margin-left:auto;min-width:80mm"><tbody>' + resumo.map(function (x, k) { return '<tr' + (k === resumo.length - 1 ? ' class="total"' : '') + '><th>' + CmpP_esc_(x[0]) + '</th><td class="num">' + CmpP_esc_(x[1]) + '</td></tr>'; }).join('') + '</tbody></table>';
  corpo += RelA4_secao_('Itens e valores', tabela);
  var cond = [['Previsão de entrega', Cmp_brDia_(p.PREVISAO_ENTREGA) + (cong.prazoDias !== '' ? ' (prazo informado no orçamento: ' + Cmp_plural_(cong.prazoDias, 'dia', 'dias') + ')' : '')],
    ['Forma de pagamento', CmpP_formaTexto_(p, false) || '—'], ['Condição do orçamento', cong.condicaoFornecedor || '—'], ['Orçamento do fornecedor', cong.referenciaFornecedor || '—']];
  if (cong.compatibilidade) cond.push(['Peça', cong.compatibilidade]);
  corpo += RelA4_secao_('Condições', RelA4_identificacao_(cond.map(function (x) { return [x[0], x[1], { largo: true }]; })) + (Cmp_s_(p.OBS) ? RelA4_subsecao_('Observações do comprador', RelA4_paragrafos_(p.OBS)) : '') +
    (e.observacao ? RelA4_paragrafos_(e.observacao) : ''));
  corpo += RelA4_secao_('Emissão e aprovação', '<p>Pedido emitido por ' + CmpP_esc_(cong.emitidoPor) + ' e aprovado por ' + CmpP_esc_(cong.aprovadoPor || '—') + (cong.aprovadorNivel ? ' (' + CmpP_esc_(cong.aprovadorNivel.toLowerCase()) + ')' : '') +
    (cong.aprovadoEm ? ' em ' + CmpP_esc_(cong.aprovadoEm) : '') + ', conforme as regras de aprovação de compras da empresa.</p>' +
    '<div class="assinaturas manter"><div class="assinatura"><div class="img"></div><div class="linha">' + CmpP_esc_(cong.emitidoPor) + '</div><div class="cargo">Comprador</div></div>' +
    '<div class="assinatura"><div class="img"></div><div class="linha">' + CmpP_esc_(cong.aprovadoPor || '—') + '</div><div class="cargo">Aprovação</div></div></div>' +
    '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + CmpP_esc_(marca) + '. Qualquer alteração no conteúdo deste pedido muda esta marca.</p>');
  return RelA4_documento_({
    titulo: 'Pedido de compra', subtitulo: f.nome, tituloCurto: 'Pedido de compra', tituloArquivo: 'Pedido de compra', numero: Cmp_s_(p.NUMERO), revisao: Number(p.REVISAO) || 0,
    identificacao: f.nome, rotuloIdentificacao: 'Fornecedor', ficha: [['Total', Cmp_moeda_(cong.total)], ['Previsão de entrega', Cmp_brDia_(p.PREVISAO_ENTREGA)], ['Referência interna', cong.referenciaInterna]],
    corpo: corpo, capa: false, sumario: false
  });
}

/**
 * Emitir o pedido de compra (ou uma nova revisão). d: { requisicaoId, previsaoEntrega, formaPagamento, cartaoFinal, parcelas, boletoVencimento, condicao,
 *   reembolsoParaId, obs, novaRevisao (bool), motivo (nova revisão) }
 */
function CmpP_emitir_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'emitir o pedido de compra');
  d = d || {};
  var r0 = CmpR_obter_(eu, d.requisicaoId, 'emitir o pedido de compra'), s0 = Cmp_up_(r0.SITUACAO), nova = !!d.novaRevisao;
  if (!nova && s0 !== 'APROVADA') throw new Error('Não foi possível emitir: o pedido ' + r0.NUMERO + ' está "' + CMP_SITUACOES[s0] + '". O pedido de compra sai depois da aprovação' + (s0 === 'PEDIDO_FEITO' ? '; para mudar o pedido já emitido, use "Nova revisão do pedido"' : ''));
  if (nova && s0 !== 'PEDIDO_FEITO') throw new Error('Não foi possível fazer nova revisão: o pedido de compra ainda não foi emitido');
  var motivo = Cmp_texto_(d.motivo, 500);
  if (nova && motivo.length < 10) throw new Error('Não foi possível fazer nova revisão: escreva o que mudou e por quê (pelo menos 10 letras). O fornecedor recebe a revisão nova');
  var prev = Cmp_dia_(d.previsaoEntrega);
  if (!prev) throw new Error('Não foi possível emitir: informe a previsão de entrega combinada com o fornecedor. Ela vai no pedido e é cobrada se atrasar');
  if (prev < Cmp_hoje_()) throw new Error('Não foi possível emitir: a previsão de entrega ' + Cmp_brDia_(prev) + ' já passou. Combine a data com o fornecedor');
  var pag = CmpP_formaPagamento_(d);
  var c = SGO_DATA.getById(CMP_ABAS.COTACOES, Cmp_s_(r0.COTACAO_ID));
  if (!c) throw new Error('Não foi possível emitir: o orçamento escolhido não foi encontrado. Atualize a ficha');
  var f = SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(c.FORNECEDOR_ID)) || { RAZAO_SOCIAL: c.FORNECEDOR_NOME };
  var regras = Cmp_regras_();
  // documento fora da trava (gerar o PDF demora); a gravação confere a situação de novo
  var atual = nova ? CmpP_pedidoDe_(r0) : null;
  var numero = atual ? Cmp_s_(atual.NUMERO) : Cmp_comTrava_(function () { return Cmp_proximoNumero_('PC', CMP_ABAS.PEDIDOS, 'NUMERO'); });
  var revisao = atual ? (Number(atual.REVISAO) || 0) + 1 : 0;
  var base = Object.assign({ NUMERO: numero, REVISAO: revisao, PREVISAO_ENTREGA: prev, OBS: Cmp_texto_(d.obs, 1000) }, pag);
  var cong = CmpP_congelar_(r0, c, f, regras, eu);
  var marca = Cmp_marca_(JSON.stringify({ numero: numero, revisao: revisao, cong: cong, previsao: prev, forma: pag.FORMA_PAGAMENTO, obs: base.OBS }));
  var html = CmpP_html_(base, cong, marca);
  var nome = 'Pedido de compra - ' + CmpP_rotulo_(base) + ' - ' + cong.fornecedor.nome + ' - ' + Utilities.formatDate(new Date(), CMP_FUSO, 'yyyy-MM-dd HHmm');
  var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
  var pasta = CmpP_pastaMes_();
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: false, pdfBlob: fin.pdfBlob } : { compartilhar: false });
  var pastaUrl = ''; try { pastaUrl = pasta.getUrl(); } catch (e) {}
  return Cmp_comTrava_(function () {
    var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, r0.ID);
    if (Cmp_up_(r.SITUACAO) !== s0) throw new Error('Não foi possível registrar o pedido: a compra mudou de situação enquanto o documento era gerado. Atualize a ficha');
    var agora = Cmp_agora_();
    var campos = Object.assign({}, base, { REQUISICAO_ID: r.ID, REQUISICAO_NUMERO: r.NUMERO, FORNECEDOR_ID: Cmp_s_(c.FORNECEDOR_ID), FORNECEDOR_NOME: Cmp_s_(c.FORNECEDOR_NOME), COTACAO_ID: Cmp_s_(c.ID),
      VALOR_TOTAL: Number(c.TOTAL) || 0, ENDERECO_ENTREGA: cong.empresa.entrega, CONGELADO_JSON: JSON.stringify(cong), MARCA_CONTEUDO: marca, PDF_ID: g.pdfId, HTML_ID: g.htmlId, PDF_URL: g.pdfUrl,
      HTML_URL: g.htmlUrl, PASTA_URL: pastaUrl, ARQUIVO_NOME: g.pdfNome, EMITIDO_EM: agora, EMITIDO_POR_ID: eu.id, EMITIDO_POR_NOME: eu.nome, ENVIADO_EM: '', ENVIO_COMO: '', SITUACAO: 'EMITIDO', ATUALIZADO_EM: agora });
    var ped;
    if (atual) { SGO_DATA.update(CMP_ABAS.PEDIDOS, atual.ID, campos); ped = Object.assign({}, atual, campos); }
    else { campos.FIN_SITUACAO = ''; campos.SEM_PEDIDO = ''; ped = SGO_DATA.insert(CMP_ABAS.PEDIDOS, campos); }
    var rc = { SITUACAO: 'PEDIDO_FEITO', PEDIDO_ID: ped.ID, PEDIDO_NUMERO: numero, PREVISAO_ENTREGA: prev, ATUALIZADO_EM: agora };
    if (!atual) { Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Concluída', 'Pedido de compra ' + numero + ' emitido.'); rc.ATIVIDADE_ID = ''; }
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, rc);
    Cmp_historico_('REQUISICAO', r.ID, atual ? 'PEDIDO_REVISAO' : 'PEDIDO_FEITO', eu, { de: CMP_SITUACOES[s0], para: 'Pedido feito', publico: true,
      texto: atual ? 'Pedido de compra revisado (' + CmpP_rotulo_(campos) + '). Previsão de entrega: ' + Cmp_brDia_(prev) + '. ' + motivo : 'Pedido feito ao fornecedor. Previsão de entrega: ' + Cmp_brDia_(prev) + '.' });
    Cmp_historico_('REQUISICAO', r.ID, 'PEDIDO_DOCUMENTO', eu, { texto: 'Folha A4 salva: ' + g.pdfNome + ' · ' + Cmp_moeda_(c.TOTAL) + ' · ' + CmpP_formaTexto_(campos, true) + '. Marca de conferência ' + marca.slice(0, 16) + '.' });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, rc), true), pdfId: g.pdfId, htmlId: g.htmlId,
      message: 'Pedido de compra ' + CmpP_rotulo_(campos) + ' salvo (PDF e HTML A4 na pasta Compras - Pedidos de compra). Agora toque em "Enviar ao fornecedor".' };
  });
}

/** Proposta enviada (Enviar documento ou marcada à mão). Dentro da trava. */
function CmpP_aoEnviar_(ped, quando, como, eu) {
  SGO_DATA.update(CMP_ABAS.PEDIDOS, ped.ID, { ENVIADO_EM: Cmp_iso_(quando) || Cmp_agora_(), ENVIO_COMO: Cmp_texto_(como, 300), SITUACAO: 'ENVIADO', ATUALIZADO_EM: Cmp_agora_() });
  Cmp_historico_('REQUISICAO', ped.REQUISICAO_ID, 'PEDIDO_ENVIADO', eu || { id: 'COMPRAS', nome: 'Compras (rotina)' }, { texto: 'Pedido de compra ' + CmpP_rotulo_(ped) + ' enviado ao fornecedor: ' + Cmp_texto_(como, 300) });
}

/** Envios registrados no "Enviar documento" (DOC_ENVIOS) marcam o pedido como enviado. Nunca lança. */
function CmpP_sincronizarEnvios_() {
  try {
    var pend = Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (p) { return Cmp_s_(p.PDF_ID) && !Cmp_s_(p.ENVIADO_EM) && Cmp_up_(p.SITUACAO) !== 'CANCELADO'; });
    if (!pend.length) return 0;
    var envios = Cmp_ler_(typeof ENVDOC_ABA !== 'undefined' ? ENVDOC_ABA : 'DOC_ENVIOS').filter(function (e) { return Cmp_up_(e.SITUACAO) === 'ENVIADO'; });
    var n = 0;
    pend.forEach(function (p) {
      var e = envios.filter(function (x) { return Cmp_s_(x.ARQUIVO_ID) === Cmp_s_(p.PDF_ID) || Cmp_s_(x.ARQUIVO_ID) === Cmp_s_(p.HTML_ID); })[0];
      if (!e) return;
      Cmp_comTrava_(function () { CmpP_aoEnviar_(p, e.QUANDO, (Cmp_up_(e.CANAL) === 'WHATSAPP' ? 'WhatsApp para ' : 'E-mail para ') + Cmp_s_(e.DESTINO_NOME || e.DESTINO) + ' por ' + Cmp_s_(e.USUARIO_NOME), { id: Cmp_s_(e.USUARIO_ID), nome: Cmp_s_(e.USUARIO_NOME) }); });
      n++;
    });
    return n;
  } catch (e) { console.error('Compras, envios: ' + ((e && e.message) || e)); return 0; }
}

function CmpP_marcarEnviado_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'marcar o pedido como enviado');
  var como = Cmp_texto_(d && d.como, 300);
  if (como.length < 10) throw new Error('Não foi possível marcar como enviado: escreva como o fornecedor recebeu o pedido (pelo menos 10 letras), por exemplo "Enviado pelo portal de compras do fornecedor". O caminho normal é o botão "Enviar ao fornecedor", que registra sozinho');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'marcar como enviado'), p = CmpP_pedidoDe_(r);
    if (!p) throw new Error('Não foi possível marcar como enviado: o pedido de compra ainda não foi emitido');
    CmpP_aoEnviar_(p, Cmp_agora_(), 'Marcado à mão: ' + como, eu);
    return { requisicao: CmpR_paraTela_(eu, r, true), message: 'Pedido marcado como enviado ao fornecedor.' };
  });
}

/** Mudar a previsão de entrega (com o motivo) e o código de rastreio. */
function CmpP_previsao_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'mudar a previsão de entrega');
  d = d || {};
  var prev = Cmp_dia_(d.previsaoEntrega), motivo = Cmp_texto_(d.motivo, 500);
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'mudar a previsão'), p = CmpP_pedidoDe_(r);
    if (Cmp_up_(r.SITUACAO) !== 'PEDIDO_FEITO' || !p) throw new Error('Não foi possível mudar a previsão: o pedido ' + r.NUMERO + ' não está com o pedido de compra feito');
    var muda = prev && prev !== Cmp_dia_(r.PREVISAO_ENTREGA);
    if (muda && prev < Cmp_hoje_()) throw new Error('Não foi possível mudar a previsão: a data ' + Cmp_brDia_(prev) + ' já passou');
    if (muda && motivo.length < 10) throw new Error('Não foi possível mudar a previsão: escreva o motivo (pelo menos 10 letras), por exemplo "Fornecedor sem estoque; nova data confirmada por telefone". Quem pediu vê a nova data');
    var campos = { RASTREIO: Cmp_texto_(d.rastreio, 120), ATUALIZADO_EM: Cmp_agora_() };
    if (muda) campos.PREVISAO_ENTREGA = prev;
    SGO_DATA.update(CMP_ABAS.PEDIDOS, p.ID, campos);
    if (muda) {
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { PREVISAO_ENTREGA: prev, ATUALIZADO_EM: Cmp_agora_() });
      Cmp_historico_('REQUISICAO', r.ID, 'PREVISAO', eu, { publico: true, texto: 'Nova previsão de entrega: ' + Cmp_brDia_(prev) + ' (antes ' + Cmp_brDia_(r.PREVISAO_ENTREGA) + '). ' + motivo });
    } else Cmp_historico_('REQUISICAO', r.ID, 'RASTREIO', eu, { texto: 'Código de rastreio: ' + campos.RASTREIO });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, muda ? { PREVISAO_ENTREGA: prev } : {}), true), message: muda ? 'Previsão de entrega atualizada.' : 'Código de rastreio salvo.' };
  });
}

/** Peça disponível: aviso a quem pediu e ao vendedor, atividade de entrega e conclusão da atividade do Comercial. Dentro da trava. */
function CmpP_disponivel_(r, eu, campos) {
  var agora = Cmp_agora_();
  campos.SITUACAO = 'DISPONIVEL'; campos.DISPONIVEL_EM = agora;
  Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Concluída', 'Peça recebida e conferida.');
  try {
    campos.ATIVIDADE_ID = Cmp_criarAtividade_({ responsavelId: Cmp_s_(r.COMPRADOR_ID), comoPessoa: eu, titulo: 'Entregar ' + Cmp_s_(r.NUMERO) + ' a ' + Cmp_s_(r.SOLICITANTE_NOME) + ': ' + Cmp_s_(r.TITULO).slice(0, 90),
      descricao: 'A compra chegou e foi conferida. Entregue a quem pediu (' + Cmp_s_(r.SOLICITANTE_NOME) + ') e registre a entrega com a evidência (protocolo, retirada assinada ou foto) em Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) + '. Quem pediu também pode confirmar o recebimento em Meus pedidos de compra.',
      prazo: Cmp_prazoPorUrgencia_('NORMAL', Number(Cmp_regras_().prazos.entregaDiasUteis) || 1), clienteId: Cmp_s_(r.CLIENTE_ID), unidadeId: Cmp_s_(r.UNIDADE_ID),
      porQue: 'Peça disponível: quem pediu está esperando.', onde: 'Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) });
  } catch (e) { console.error('Compras, atividade de entrega: ' + ((e && e.message) || e)); campos.ATIVIDADE_ID = ''; }
  SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
  Cmp_avisar_(r.SOLICITANTE_ID, 'DISPONIVEL', 'Peça disponível: ' + Cmp_s_(r.NUMERO), 'Chegou e foi conferido: "' + Cmp_s_(r.TITULO).slice(0, 90) + '". Retire com Compras (' + Cmp_s_(r.COMPRADOR_NOME) + ') ou confirme o recebimento em Compras > Meus pedidos de compra.', r.ID, { email: true, autorId: eu && eu.id });
  if (Cmp_s_(r.COMERCIAL_VENDEDOR_ID)) {
    Cmp_avisar_(r.COMERCIAL_VENDEDOR_ID, 'DISPONIVEL', 'Compra do pedido ' + Cmp_s_(r.PROPOSTA_NUMERO) + ' disponível (' + Cmp_s_(r.NUMERO) + ')', 'Os produtos comprados para o pedido aprovado ' + Cmp_s_(r.PROPOSTA_NUMERO) + ' chegaram e foram conferidos. Combine a entrega com o cliente.', r.ID, { email: true, autorId: eu && eu.id });
    CmpP_concluirComercial_(r, eu);
  }
}

/** Todas as compras do pedido do Comercial chegaram: conclui a atividade do setor Compras (o vendedor é avisado pela rotina do Comercial). */
function CmpP_concluirComercial_(r, eu) {
  try {
    var prop = Cmp_s_(r.PROPOSTA_ID);
    if (!prop) return;
    var irmas = Cmp_ler_(CMP_ABAS.REQUISICOES).filter(function (x) { return Cmp_s_(x.PROPOSTA_ID) === prop && Cmp_up_(x.ORIGEM) === 'COMERCIAL' && Cmp_up_(x.SITUACAO) !== 'CANCELADA'; });
    var faltam = irmas.filter(function (x) { return x.ID !== r.ID && ['DISPONIVEL', 'ENTREGUE'].indexOf(Cmp_up_(x.SITUACAO)) < 0; });
    if (faltam.length) return;
    var atv = Cmp_s_(r.COMERCIAL_ATIVIDADE_ID);
    if (atv && Cmp_mudarAtividade_(atv, 'Concluída', 'Compras concluiu: ' + irmas.map(function (x) { return Cmp_s_(x.NUMERO); }).join(', ') + ' disponível para entrega (Compras > Fila de compras).')) {
      irmas.forEach(function (x) { SGO_DATA.update(CMP_ABAS.REQUISICOES, x.ID, { COMERCIAL_CONCLUIDA_EM: Cmp_agora_() }); });
    }
  } catch (e) { console.error('Compras, conclusão do Comercial: ' + ((e && e.message) || e)); }
}

/**
 * Recebimento com conferência. d: { requisicaoId, itens:[{itemId, qtdRecebida}], especificacaoConfere (bool), semDano (bool), nfNumero, nfArquivo,
 *   semNotaMotivo, fotos:[{nome,tipo,base64}], obs }
 */
function CmpP_receber_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'registrar o recebimento');
  d = d || {};
  var r0 = CmpR_obter_(eu, d.requisicaoId, 'registrar o recebimento');
  if (Cmp_up_(r0.SITUACAO) !== 'PEDIDO_FEITO') throw new Error('Não foi possível registrar o recebimento: o pedido ' + r0.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r0.SITUACAO)] + '"');
  var itens = CmpR_itensDe_(r0.ID), lidos = Array.isArray(d.itens) ? d.itens : [];
  var conf = itens.map(function (i) {
    var x = lidos.filter(function (l) { return Cmp_s_(l.itemId) === Cmp_s_(i.ID); })[0], q = x ? Cmp_num_(x.qtdRecebida) : NaN;
    if (!(q >= 0)) throw new Error('Não foi possível registrar o recebimento: conte e informe a quantidade recebida de "' + Cmp_s_(i.DESCRICAO).slice(0, 50) + '" (0 se não veio)');
    return { item: i, recebida: q, pedida: Number(i.QUANTIDADE) || 0 };
  });
  if (typeof d.especificacaoConfere !== 'boolean' || typeof d.semDano !== 'boolean') throw new Error('Não foi possível registrar o recebimento: responda se a especificação confere com o pedido e se a peça chegou sem dano. A conferência é obrigatória');
  var nf = Cmp_texto_(d.nfNumero, 60), semNota = Cmp_texto_(d.semNotaMotivo, 300);
  if (!nf && !(d.nfArquivo && d.nfArquivo.base64) && semNota.length < 10) throw new Error('Não foi possível registrar o recebimento: informe o número da nota fiscal (ou anexe a nota). Se a compra veio sem nota, escreva o motivo (pelo menos 10 letras)');
  var fotos = (Array.isArray(d.fotos) ? d.fotos : []).filter(function (f) { return f && f.base64; });
  if (!d.semDano && !fotos.length) throw new Error('Não foi possível registrar o recebimento: peça com dano exige foto. Tire a foto do dano e anexe');
  var difQtd = conf.filter(function (c) { return Math.abs(c.recebida - c.pedida) > 1e-9; });
  var diverg = difQtd.length || !d.especificacaoConfere || !d.semDano;
  var obs = Cmp_texto_(d.obs, 1000);
  if (diverg && obs.length < 10) throw new Error('Não foi possível registrar o recebimento: há divergência (' + [difQtd.length ? 'quantidade diferente do pedido' : '', !d.especificacaoConfere ? 'especificação não confere' : '', !d.semDano ? 'dano' : ''].filter(Boolean).join(', ') + '). Descreva o que aconteceu (pelo menos 10 letras): a peça fica segura até resolver com o fornecedor');
  return Cmp_comTrava_(function () {
    var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, r0.ID);
    if (Cmp_up_(r.SITUACAO) !== 'PEDIDO_FEITO') throw new Error('Não foi possível registrar: a compra mudou de situação. Atualize a ficha');
    var p = CmpP_pedidoDe_(r) || {};
    var salvasFotos = fotos.map(function (f, k) { return Cmp_salvarArquivo_(f, r.NUMERO, 'Recebimento foto ' + (k + 1), CMP_RX_IMAGEM, 'da foto do recebimento'); });
    var nfArq = d.nfArquivo && d.nfArquivo.base64 ? Cmp_salvarArquivo_(d.nfArquivo, r.NUMERO, 'Nota fiscal', CMP_RX_PDF_IMG, 'da nota fiscal') : null;
    var agora = Cmp_agora_();
    conf.forEach(function (c) { SGO_DATA.update(CMP_ABAS.ITENS, c.item.ID, { QTD_RECEBIDA: c.recebida, ATUALIZADO_EM: agora }); });
    if (p.ID) {
      var pc = { NF_NUMERO: nf, ATUALIZADO_EM: agora, SITUACAO: 'RECEBIDO' };
      if (nfArq) { pc.NF_ARQUIVO_ID = nfArq.id; pc.NF_ARQUIVO_NOME = nfArq.nome; pc.NF_ARQUIVO_URL = nfArq.url; }
      SGO_DATA.update(CMP_ABAS.PEDIDOS, p.ID, pc);
    }
    var receb = { em: agora, por: eu.nome, itens: conf.map(function (c) { return { itemId: c.item.ID, pedida: c.pedida, recebida: c.recebida }; }), especificacaoConfere: d.especificacaoConfere, semDano: d.semDano,
      nf: nf, semNota: semNota, fotos: salvasFotos, obs: obs };
    var campos = { RECEBIDA_EM: agora, RECEBIDA_POR_NOME: eu.nome, RECEBIMENTO_JSON: JSON.stringify(receb), ATUALIZADO_EM: agora };
    var resumo = conf.map(function (c) { return Cmp_s_(c.item.DESCRICAO).slice(0, 40) + ': ' + Cmp_qtd_(c.recebida) + ' de ' + Cmp_qtd_(c.pedida); }).join('; ');
    if (diverg) {
      campos.SITUACAO = 'RECEBIDA_DIVERGENCIA'; campos.DIVERGENCIA_TEXTO = obs;
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
      Cmp_historico_('REQUISICAO', r.ID, 'RECEBIDA_DIVERGENCIA', eu, { de: 'Pedido feito', para: 'Recebida com divergência', publico: true, texto: 'Chegou com divergência: ' + obs + ' Compras está resolvendo com o fornecedor.' });
      Cmp_historico_('REQUISICAO', r.ID, 'CONFERENCIA', eu, { texto: 'Conferência: ' + resumo + '; especificação ' + (d.especificacaoConfere ? 'confere' : 'NÃO confere') + '; ' + (d.semDano ? 'sem dano' : 'COM dano') + '; nota ' + (nf || 'sem nota: ' + semNota) + '.' });
      return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Recebimento registrado com divergência: a peça fica segura até resolver. Combine com o fornecedor e depois toque em "Divergência resolvida" (ou cancele com o motivo).' };
    }
    Cmp_historico_('REQUISICAO', r.ID, 'CONFERENCIA', eu, { texto: 'Conferência sem divergência: ' + resumo + '; nota ' + (nf || 'sem nota: ' + semNota) + '.' });
    CmpP_disponivel_(r, eu, campos);
    Cmp_historico_('REQUISICAO', r.ID, 'DISPONIVEL', eu, { de: 'Pedido feito', para: 'Disponível', publico: true, texto: 'Chegou e foi conferida. Disponível para entrega a ' + Cmp_s_(r.SOLICITANTE_NOME) + '.' });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Recebimento conferido: peça disponível. Quem pediu foi avisado e a entrega está em Minhas atividades.' };
  });
}

/** Divergência resolvida (reposição recebida, fornecedor trocou, aceita com desconto...). d: { requisicaoId, texto } */
function CmpP_resolverDivergencia_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'resolver a divergência');
  var texto = Cmp_texto_(d && d.texto, 1000);
  if (texto.length < 10) throw new Error('Não foi possível registrar: escreva como a divergência foi resolvida (pelo menos 10 letras), por exemplo "Fornecedor trocou a peça; conferida e sem dano". Se a compra não serve mais, cancele com o motivo');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'resolver a divergência');
    if (Cmp_up_(r.SITUACAO) !== 'RECEBIDA_DIVERGENCIA') throw new Error('Não foi possível registrar: o pedido ' + r.NUMERO + ' não está com divergência');
    var campos = { DIVERGENCIA_TEXTO: Cmp_s_(r.DIVERGENCIA_TEXTO) + ' | Resolvida: ' + texto, ATUALIZADO_EM: Cmp_agora_() };
    CmpP_disponivel_(r, eu, campos);
    Cmp_historico_('REQUISICAO', r.ID, 'DIVERGENCIA_RESOLVIDA', eu, { de: 'Recebida com divergência', para: 'Disponível', publico: true, texto: 'Divergência resolvida: ' + texto + ' Disponível para entrega.' });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Divergência resolvida: peça disponível. Quem pediu foi avisado.' };
  });
}

/** Entrega com evidência (comprador) ou confirmação de quem pediu. d: { requisicaoId, entregueAId, evidencia, foto } */
function CmpP_entregar_(eu, d) {
  d = d || {};
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'registrar a entrega');
    if (Cmp_up_(r.SITUACAO) !== 'DISPONIVEL') throw new Error('Não foi possível registrar a entrega: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r.SITUACAO)] + '"');
    var meu = Cmp_s_(r.SOLICITANTE_ID) === eu.id || Cmp_s_(r.COMERCIAL_VENDEDOR_ID) === eu.id, us = Cmp_usuarios_();
    var para = Cmp_s_(d.entregueAId) || Cmp_s_(r.SOLICITANTE_ID), evid = Cmp_texto_(d.evidencia, 500);
    if (!eu.comprador) {
      if (!meu) Cmp_exigir_(eu, 'COMPRADOR', 'registrar a entrega');
      para = eu.id; evid = 'Recebimento confirmado por ' + eu.nome + ' em Meus pedidos de compra.';
    } else {
      if (!us[para]) throw new Error('Não foi possível registrar a entrega: escolha quem recebeu a peça');
      var foto = d.foto && d.foto.base64 ? Cmp_salvarArquivo_(d.foto, r.NUMERO, 'Entrega', CMP_RX_IMAGEM, 'da foto da entrega') : null;
      if (evid.length < 10 && !foto) throw new Error('Não foi possível registrar a entrega: escreva a evidência (pelo menos 10 letras, por exemplo "Retirada assinada no protocolo da Logística") ou anexe a foto da entrega');
      if (foto) evid = (evid ? evid + ' ' : '') + 'Foto: ' + foto.nome + '.';
    }
    var agora = Cmp_agora_(), campos = { SITUACAO: 'ENTREGUE', ENTREGUE_EM: agora, ENTREGUE_A_ID: para, ENTREGUE_A_NOME: us[para] ? us[para].nome : eu.nome, ENTREGA_EVIDENCIA: evid, ENTREGUE_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Concluída', 'Entregue a ' + campos.ENTREGUE_A_NOME + '. ' + evid);
    Cmp_historico_('REQUISICAO', r.ID, 'ENTREGUE', eu, { de: 'Disponível', para: 'Entregue', publico: true, texto: 'Entregue a ' + campos.ENTREGUE_A_NOME + '. ' + evid });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Entrega registrada. Pedido encerrado.' };
  });
}

// ------------------------------------------------------------
// COMERCIAL: pedido aprovado abre a requisição (chamado por "Passar aos setores")
// ------------------------------------------------------------
/**
 * p: linha de COM_PROPOSTAS aprovada; info: { setorResponsavelId, atividadeId }. Cria (uma vez) a requisição com os PRODUTOS do
 * pedido, sem o valor de venda, ligada à proposta; a atividade do setor Compras (Comercial) é a tarefa do comprador e é
 * concluída quando as peças ficam disponíveis. Sem trava própria: roda dentro da trava do Comercial. Devolve o número ou ''.
 */
function Compras_doPedidoComercial_(p, info) {
  info = info || {};
  if (!p || Cmp_up_(p.SITUACAO) !== 'APROVADA') return '';
  var produtos = Cmp_json_(p.ITENS_JSON, []).filter(function (i) { return Cmp_up_(i.tipo) === 'PRODUTO'; });
  if (!produtos.length) return '';
  try { Cmp_garantirAbas_(); } catch (e) {}
  var ja = Cmp_ler_(CMP_ABAS.REQUISICOES).filter(function (r) { return Cmp_s_(r.PROPOSTA_ID) === Cmp_s_(p.ID) && Cmp_up_(r.ORIGEM) === 'COMERCIAL'; })[0];
  if (ja) return Cmp_s_(ja.NUMERO);
  var us = Cmp_usuarios_(), vend = us[Cmp_s_(p.RESPONSAVEL_ID)] || { id: Cmp_s_(p.RESPONSAVEL_ID), nome: Cmp_s_(p.RESPONSAVEL_NOME), area: 'COMERCIAL' };
  var regras = Cmp_regras_(), resp = Cmp_s_(info.setorResponsavelId), lista = Cmp_compradoresAtivos_(regras, us).concat(Cmp_gestoresCompras_(regras, us));
  var comp = resp && lista.indexOf(resp) >= 0 && us[resp] ? { id: resp, nome: us[resp].nome } : Cmp_compradorPara_();
  var agora = Cmp_agora_();
  var r = SGO_DATA.insert(CMP_ABAS.REQUISICOES, { NUMERO: Cmp_proximoNumero_('REQ', CMP_ABAS.REQUISICOES, 'NUMERO'), SOLICITANTE_ID: vend.id, SOLICITANTE_NOME: vend.nome, SOLICITANTE_AREA: vend.area || 'COMERCIAL',
    URGENCIA: 'NORMAL', FINALIDADE: 'Pedido aprovado pelo cliente: fornecer os produtos do pedido ' + Cmp_s_(p.NUMERO) + ' (' + Cmp_s_(p.CLIENTE_NOME) + ').', VINCULO_TIPO: 'COMERCIAL',
    PROPOSTA_ID: Cmp_s_(p.ID), PROPOSTA_NUMERO: Cmp_s_(p.NUMERO), CLIENTE_ID: Cmp_s_(p.CLIENTE_ID), CLIENTE_NOME: Cmp_s_(p.CLIENTE_NOME), UNIDADE_ID: Cmp_s_(p.UNIDADE_ID), UNIDADE_NOME: Cmp_s_(p.UNIDADE_NOME),
    SITUACAO: 'SOLICITADA', COMPRADOR_ID: comp.id, COMPRADOR_NOME: comp.nome, ORIGEM: 'COMERCIAL', COMERCIAL_ATIVIDADE_ID: Cmp_s_(info.atividadeId), COMERCIAL_VENDEDOR_ID: vend.id,
    REPROVACOES: 0, CRIADO_POR_ID: 'COMERCIAL', CRIADO_POR_NOME: 'Comercial (passagem aos setores)', ATUALIZADO_EM: agora });
  var itens = produtos.slice(0, 30).map(function (i, k) {
    return SGO_DATA.insert(CMP_ABAS.ITENS, { REQUISICAO_ID: r.ID, ORDEM: k + 1, CATEGORIA: 'REVENDA', DESCRICAO: Cmp_texto_(i.descricao, 300) + (Cmp_s_(i.detalhe) ? ' (' + Cmp_texto_(i.detalhe, 200) + ')' : ''),
      QUANTIDADE: Number(i.quantidade) || 1, UNIDADE: Cmp_texto_(i.unidade, 20) || 'un.', EQUIPAMENTO_ID: Cmp_s_(i.equipamentoId), EQUIPAMENTO_TEXTO: Cmp_texto_(i.equipamentoTexto, 160),
      PRODUTO_ID: Cmp_s_(i.produtoId), FOTOS_JSON: '[]', ATIVO: 'SIM', ATUALIZADO_EM: agora });
  });
  var falta = CmpR_falta_(r, itens);
  var campos = { TITULO: CmpR_tituloDe_(itens), ESPEC_FALTA: JSON.stringify(falta), ESPEC_INCOMPLETA: falta.length ? 'SIM' : '' };
  SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
  Object.assign(r, campos);
  if (!falta.length) { var a = CmpR_atividadeCotar_(r, itens); if (a) SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { ATIVIDADE_ID: a }); }
  Cmp_historico_('REQUISICAO', r.ID, 'CRIACAO', { id: 'COMERCIAL', nome: 'Comercial' }, { para: 'Solicitada', publico: true, texto: 'Pedido de compra aberto pela passagem do pedido aprovado ' + Cmp_s_(p.NUMERO) + ' aos setores. Comprador: ' + comp.nome + '.' });
  return Cmp_s_(r.NUMERO);
}

// ------------------------------------------------------------
// ENVIAR DOCUMENTO: o e-mail do fornecedor como destinatário sugerido (classe FORNECEDOR)
// ------------------------------------------------------------
function Compras_contatosEnvio_(arquivoId) {
  try {
    var p = Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (x) { return Cmp_s_(x.PDF_ID) === Cmp_s_(arquivoId) || Cmp_s_(x.HTML_ID) === Cmp_s_(arquivoId); })[0];
    if (!p) return [];
    var f = SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(p.FORNECEDOR_ID));
    if (!f) return [];
    var cel = Cmp_digitos_(f.WHATSAPP);
    return [{ ref: 'f0', nome: Cmp_s_(f.CONTATO) || CmpF_nome_(f), email: CmpF_emailOk_(f.EMAIL_PEDIDOS) ? Cmp_s_(f.EMAIL_PEDIDOS).toLowerCase() : '', celular: cel.length >= 10 ? (cel.indexOf('55') === 0 ? cel : '55' + cel) : '',
      telefone: Cmp_s_(f.TELEFONE), whatsOk: cel.length >= 10, notaFone: '', origem: 'Fornecedor ' + CmpF_nome_(f) + ' (Compras > Fornecedores)' }].filter(function (c) { return c.email || c.celular; });
  } catch (e) { return []; }
}

// ------------------------------------------------------------
// TELA E PENDÊNCIAS
// ------------------------------------------------------------
function CmpP_paraTela_(eu, r, t) {
  var p = CmpP_pedidoDe_(r), receb = Cmp_json_(r.RECEBIMENTO_JSON, null);
  if (p) {
    t.pedido = { numero: Cmp_s_(p.NUMERO), rotulo: CmpP_rotulo_(p), previsao: Cmp_brDia_(p.PREVISAO_ENTREGA), previsaoIso: Cmp_dia_(p.PREVISAO_ENTREGA), rastreio: Cmp_s_(p.RASTREIO), enviado: Cmp_br_(p.ENVIADO_EM), envioComo: Cmp_s_(p.ENVIO_COMO), situacao: Cmp_up_(p.SITUACAO) };
    if (eu.veValores) {
      Object.assign(t.pedido, { id: Cmp_s_(p.ID), fornecedor: Cmp_s_(p.FORNECEDOR_NOME), valorTxt: Cmp_moeda_(p.VALOR_TOTAL), forma: CmpP_formaTexto_(p, true), formaCodigo: Cmp_up_(p.FORMA_PAGAMENTO),
        emitido: Cmp_br_(p.EMITIDO_EM) + ' por ' + Cmp_s_(p.EMITIDO_POR_NOME), pdfId: Cmp_s_(p.PDF_ID), htmlId: Cmp_s_(p.HTML_ID), pdfUrl: Cmp_s_(p.PDF_URL), htmlUrl: Cmp_s_(p.HTML_URL), pastaUrl: Cmp_s_(p.PASTA_URL),
        nf: Cmp_s_(p.NF_NUMERO), nfUrl: Cmp_s_(p.NF_ARQUIVO_URL), obs: Cmp_s_(p.OBS), semPedido: Cmp_sim_(p.SEM_PEDIDO) });
    }
  }
  if (receb) t.recebimento = { em: Cmp_br_(receb.em), por: receb.por, especificacaoConfere: receb.especificacaoConfere, semDano: receb.semDano, nf: receb.nf, semNota: receb.semNota, obs: receb.obs,
    fotos: eu.veValores ? (receb.fotos || []) : [], itens: receb.itens };
  t.entrega = Cmp_s_(r.ENTREGUE_EM) ? { em: Cmp_br_(r.ENTREGUE_EM), a: Cmp_s_(r.ENTREGUE_A_NOME), por: Cmp_s_(r.ENTREGUE_POR_NOME), evidencia: Cmp_s_(r.ENTREGA_EVIDENCIA) } : null;
}

function CmpP_acoes_(eu, r, a) {
  var s = Cmp_up_(r.SITUACAO), meu = Cmp_s_(r.SOLICITANTE_ID) === eu.id || Cmp_s_(r.COMERCIAL_VENDEDOR_ID) === eu.id;
  a.emitir = s === 'APROVADA' && eu.comprador;
  a.novaRevisao = s === 'PEDIDO_FEITO' && eu.comprador;
  a.enviar = s === 'PEDIDO_FEITO' && eu.comprador;
  a.previsao = s === 'PEDIDO_FEITO' && eu.comprador;
  a.receber = s === 'PEDIDO_FEITO' && eu.comprador;
  a.resolverDivergencia = s === 'RECEBIDA_DIVERGENCIA' && eu.comprador;
  a.entregar = s === 'DISPONIVEL' && eu.comprador;
  a.confirmarRecebimento = s === 'DISPONIVEL' && meu && !Cmp_sim_(r.SEM_PEDIDO);
}

/** Caixa: área de Compras; sem responsável configurado na área, o Gestor de Compras do cadastro decide (nunca o próprio comprador). */
function CmpP_extraGestor_(o, comp, desde) {
  var area = Cmp_up_(o.regras.areaCompras), ex = { area: area, desde: desde, naoPode: [comp] }, conf = [];
  try { conf = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {})[area] || []; } catch (e) { conf = []; }
  if (!conf.length) { var g = Cmp_gestoresCompras_(o.regras, o.usuarios()).filter(function (id) { return id !== comp; })[0]; if (g) { ex.decisor = g; ex.motivoDecisor = 'Gestor da área de Compras (cadastro; a área ainda não tem responsável em Regras e responsáveis).'; } }
  return ex;
}

/** Aprovada sem pedido e entrega atrasada (comprador; depois, gestor de Compras na Caixa); recebida com divergência. Sem valor. */
function CmpP_pendencias_(add, ctx, r, o) {
  var s = Cmp_up_(r.SITUACAO), num = Cmp_s_(r.NUMERO), comp = Cmp_s_(r.COMPRADOR_ID), tit = Cmp_s_(r.TITULO).slice(0, 60);
  var pz = o.regras.prazos || {}, lim1 = Number(pz.paradoDiasUteis) || 1, lim2 = Number(pz.gestorAposDiasUteis) || 2;
  var parado = null;
  if (s === 'APROVADA') {
    var du = Cmp_diasUteisEntre_(Cmp_dia_(r.APROVADA_EM), o.hoje);
    if (du >= lim1) parado = { dias: du, titulo: 'Compra ' + num + ' (' + tit + ') aprovada sem pedido há ' + Cmp_plural_(du, 'dia útil', 'dias úteis'), detalhe: 'Aprovada em ' + Cmp_br_(r.APROVADA_EM) + ' por ' + Cmp_s_(r.APROVADA_POR_NOME) + '. O fornecedor ainda não recebeu o pedido de compra.', fazer: 'Abra a ficha em Compras > Fila de compras e toque em "Emitir o pedido de compra".', desde: Cmp_dia_(r.APROVADA_EM) };
  } else if (s === 'PEDIDO_FEITO' && Cmp_dia_(r.PREVISAO_ENTREGA) && Cmp_dia_(r.PREVISAO_ENTREGA) < o.hoje) {
    var at = Cmp_diasUteisEntre_(Cmp_dia_(r.PREVISAO_ENTREGA), o.hoje);
    if (at >= 1) parado = { dias: at, titulo: 'Entrega da compra ' + num + ' (' + tit + ') atrasada há ' + Cmp_plural_(at, 'dia útil', 'dias úteis'), detalhe: 'Previsão era ' + Cmp_brDia_(r.PREVISAO_ENTREGA) + ' (pedido ' + Cmp_s_(r.PEDIDO_NUMERO) + ').', fazer: 'Cobre o fornecedor; registre a nova previsão (com o motivo) ou o recebimento em Compras > Fila de compras.', desde: Cmp_dia_(r.PREVISAO_ENTREGA) };
  }
  if (parado) {
    var gestao = parado.dias >= lim2;
    add(Pend_item_(gestao ? 'compras_parado_gestao' : 'compras_parado', {
      id: 'CMP:PARADO:' + r.ID, nome: num, publico: gestao ? 'GESTAO' : 'PESSOA', paraUsuarios: [comp], responsavel: Cmp_s_(r.COMPRADOR_NOME), responsavelId: comp,
      gravidade: gestao || Cmp_up_(r.URGENCIA) === 'CRITICA' ? 'CRITICO' : 'ATENCAO', dias: null, titulo: parado.titulo, detalhe: parado.detalhe, oQueFazer: parado.fazer,
      oQueFazerOutro: 'Cobre de ' + Cmp_s_(r.COMPRADOR_NOME) + ' o pedido ou a entrega hoje (Compras > Fila de compras).', tela: CMP_PEND_TELA('compras', Cmp_s_(r.ID)),
      extra: gestao ? CmpP_extraGestor_(o, comp, parado.desde) : null
    }));
  }
  if (s === 'RECEBIDA_DIVERGENCIA') add(Pend_item_('compras_divergencia', {
    id: 'CMP:DIVERG:' + r.ID, nome: num, publico: 'PESSOA', paraUsuarios: [comp], responsavel: Cmp_s_(r.COMPRADOR_NOME), responsavelId: comp, gravidade: 'ATENCAO', dias: null,
    titulo: 'Compra ' + num + ' (' + tit + ') recebida com divergência', detalhe: Cmp_s_(r.DIVERGENCIA_TEXTO).slice(0, 220),
    oQueFazer: 'Resolva com o fornecedor e toque em "Divergência resolvida" na ficha (ou cancele com o motivo).', tela: CMP_PEND_TELA('compras', Cmp_s_(r.ID))
  }));
}
