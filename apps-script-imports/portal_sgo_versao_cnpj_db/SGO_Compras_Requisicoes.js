/****************************************************
 * COMPRAS — "PEDIR PEÇA OU MATERIAL", ESPECIFICAÇÃO, VÍNCULO, FILA E MEUS PEDIDOS (21/10/2026)
 *
 * Requisição de compra (CMP_REQUISICOES, itens em CMP_ITENS), número anual REQ-2026-0001:
 *  - Um pedido pode ter vários itens (um pedido do Comercial com cinco produtos não vira cinco requisições).
 *  - Vínculo obrigatório (pedido do dono de 14/10/2026: nenhuma compra sem saber para que é): cliente (com a unidade e,
 *    se houver, o número da O.S. do Auvo), pedido aprovado do Comercial, veículo da Frota ou uso interno (com a explicação
 *    de pelo menos 20 letras). Finalidade obrigatória.
 *  - Especificação: para material simples (papel, ferramenta comum) basta descrição, quantidade e unidade. Para PEÇA
 *    (de equipamento ou de veículo) o sistema exige o equipamento de origem, o número de peça ou dois dados técnicos,
 *    foto quando não há número de peça e a marca quando há. O que falta aparece na hora; o pedido pode ser enviado
 *    assim mesmo, mas fica marcado "especificação incompleta": não é cotado nem aprovado, e quem pediu vê o que falta
 *    (Meus pedidos e Início) até completar. O comprador também pode devolver a especificação com o que está ambíguo.
 *  - Quem pediu acompanha em Meus pedidos de compra, SEM valores. O comprador recebe a atividade "Conferir e cotar".
 ****************************************************/

function CmpR_categoria_(c) { return CMP_CATEGORIAS_ITEM.filter(function (x) { return x.codigo === Cmp_up_(c); })[0] || CMP_CATEGORIAS_ITEM[CMP_CATEGORIAS_ITEM.length - 1]; }

function CmpR_itensDe_(reqId) {
  return Cmp_ler_(CMP_ABAS.ITENS).filter(function (i) { return Cmp_s_(i.REQUISICAO_ID) === Cmp_s_(reqId) && Cmp_up_(i.ATIVO || 'SIM') !== 'NAO'; })
    .sort(function (a, b) { return (Number(a.ORDEM) || 0) - (Number(b.ORDEM) || 0); });
}

/** O que falta na especificação de um item (lista vazia = completa). veiculo: a requisição é de veículo (o veículo é a origem). */
function CmpR_faltaItem_(i, veiculo) {
  var f = [], cat = CmpR_categoria_(i.CATEGORIA);
  if (Cmp_s_(i.DESCRICAO).length < 5) f.push('descrição do item');
  if (!(Number(i.QUANTIDADE) > 0)) f.push('quantidade');
  if (!Cmp_s_(i.UNIDADE)) f.push('unidade (un., m, kg, caixa...)');
  if (!cat.tecnica) return f;
  if (!Cmp_s_(i.EQUIPAMENTO_ID) && Cmp_s_(i.EQUIPAMENTO_TEXTO).length < 3 && !(veiculo && cat.codigo === 'PECA_VEICULO')) f.push('equipamento de origem (escolha do cadastro ou escreva o tipo e o modelo)');
  var pn = Cmp_s_(i.PART_NUMBER);
  var nTec = ['TENSAO', 'CORRENTE', 'PRESSAO', 'ROSCA', 'DIMENSAO', 'MATERIAL'].filter(function (k) { return Cmp_s_(i[k]); }).length + (Cmp_s_(i.OUTRAS_ESPEC).length >= 20 ? 1 : 0);
  if (!pn && nTec < 2) f.push('número da peça (part number) ou pelo menos dois dados técnicos (tensão, corrente ou potência, pressão, rosca, dimensão, material)');
  if (!pn && !Cmp_json_(i.FOTOS_JSON, []).length) f.push('foto da peça (obrigatória quando não há o número da peça)');
  if (pn && !Cmp_s_(i.MARCA)) f.push('marca ou fabricante da peça (o número da peça sozinho é ambíguo)');
  return f;
}

/** Lista do que falta na requisição inteira, com o item: ["Item 1 (Resistência): foto da peça", ...]. */
function CmpR_falta_(r, itens) {
  var l = [], veic = Cmp_up_(r.VINCULO_TIPO) === 'VEICULO';
  itens.forEach(function (i, k) {
    var f = CmpR_faltaItem_(i, veic);
    if (f.length) l.push('Item ' + (k + 1) + ' (' + (Cmp_s_(i.DESCRICAO).slice(0, 40) || 'sem descrição') + '): ' + f.join('; '));
  });
  return l;
}

function CmpR_vinculoTexto_(r, comCliente) {
  var t = Cmp_up_(r.VINCULO_TIPO);
  if (t === 'CLIENTE') return (comCliente === false ? 'Atendimento a cliente' : 'Cliente: ' + Cmp_s_(r.CLIENTE_NOME) + (Cmp_s_(r.UNIDADE_NOME) ? ' (' + Cmp_s_(r.UNIDADE_NOME) + ')' : '')) + (Cmp_s_(r.OS_AUVO) ? ' · O.S. do Auvo ' + Cmp_s_(r.OS_AUVO) : '');
  if (t === 'COMERCIAL') return 'Pedido aprovado do Comercial ' + Cmp_s_(r.PROPOSTA_NUMERO) + (comCliente === false ? '' : ' (' + Cmp_s_(r.CLIENTE_NOME) + ')');
  if (t === 'VEICULO') return 'Veículo da Frota ' + Cmp_s_(r.VEICULO_PLACA);
  if (t === 'INTERNO') return 'Uso interno: ' + Cmp_s_(r.USO_INTERNO_MOTIVO);
  return 'Sem vínculo';
}

/** Confere e resolve o vínculo da tela. Lança no padrão da tela. Devolve os campos da requisição. */
function CmpR_vinculo_(v) {
  v = v || {};
  var tipo = Cmp_up_(v.tipo), c = { VINCULO_TIPO: tipo, CLIENTE_ID: '', CLIENTE_NOME: '', UNIDADE_ID: '', UNIDADE_NOME: '', PROPOSTA_ID: '', PROPOSTA_NUMERO: '', VEICULO_ID: '', VEICULO_PLACA: '', OS_AUVO: '', USO_INTERNO_MOTIVO: '' };
  if (!CMP_VINCULOS[tipo]) throw new Error('Não foi possível enviar: diga a que a compra está ligada (cliente, pedido do Comercial, veículo ou uso interno). É regra da empresa: nenhuma compra sem saber para que é');
  if (tipo === 'CLIENTE') {
    var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Cmp_s_(v.clienteId));
    if (!cli) throw new Error('Não foi possível enviar: escolha o cliente na lista (busque pelo nome). Se ele não existir, cadastre em Cadastros > Clientes e volte aqui');
    c.CLIENTE_ID = Cmp_s_(cli.ID); c.CLIENTE_NOME = Cmp_s_(cli.NOME_FANTASIA) || Cmp_s_(cli.RAZAO_SOCIAL);
    if (Cmp_s_(v.unidadeId)) {
      var un = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Cmp_s_(v.unidadeId));
      if (!un || Cmp_s_(un.CLIENTE_ID) !== c.CLIENTE_ID) throw new Error('Não foi possível enviar: a unidade escolhida não é deste cliente. Escolha a unidade de novo');
      c.UNIDADE_ID = Cmp_s_(un.ID); c.UNIDADE_NOME = Cmp_s_(un.NOME_UNIDADE);
    }
    c.OS_AUVO = Cmp_texto_(v.osAuvo, 40);
  } else if (tipo === 'COMERCIAL') {
    var p = null;
    try { p = SGO_DATA.getById(typeof COM_ABAS !== 'undefined' ? COM_ABAS.PROPOSTAS : 'COM_PROPOSTAS', Cmp_s_(v.propostaId)); } catch (e) { p = null; }
    if (!p) throw new Error('Não foi possível enviar: escolha o pedido aprovado do Comercial na lista');
    if (Cmp_up_(p.SITUACAO) !== 'APROVADA') throw new Error('Não foi possível enviar: a proposta ' + Cmp_s_(p.NUMERO) + ' ainda não foi aprovada pelo cliente. A compra só se liga a pedido aprovado; até lá, use o vínculo "Cliente"');
    c.PROPOSTA_ID = Cmp_s_(p.ID); c.PROPOSTA_NUMERO = Cmp_s_(p.NUMERO); c.CLIENTE_ID = Cmp_s_(p.CLIENTE_ID); c.CLIENTE_NOME = Cmp_s_(p.CLIENTE_NOME); c.UNIDADE_ID = Cmp_s_(p.UNIDADE_ID); c.UNIDADE_NOME = Cmp_s_(p.UNIDADE_NOME);
  } else if (tipo === 'VEICULO') {
    var vei = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS || 'CAD_VEICULOS', Cmp_s_(v.veiculoId));
    if (!vei) throw new Error('Não foi possível enviar: escolha o veículo da Frota na lista');
    c.VEICULO_ID = Cmp_s_(vei.ID); c.VEICULO_PLACA = Cmp_s_(vei.PLACA) + (Cmp_s_(vei.MODELO) ? ' (' + Cmp_s_(vei.MODELO) + ')' : '');
  } else {
    c.USO_INTERNO_MOTIVO = Cmp_texto_(v.motivoInterno, 500);
    if (c.USO_INTERNO_MOTIVO.length < 20) throw new Error('Não foi possível enviar: para uso interno, explique para que é a compra (pelo menos 20 letras), por exemplo "Reposição da maleta de ferramentas da equipe de campo". Assim o Financeiro e a gestão sabem o motivo');
  }
  return c;
}

function CmpR_podeVer_(eu, r) {
  return eu.veFila || eu.financeiro || Cmp_s_(r.SOLICITANTE_ID) === eu.id || Cmp_s_(r.COMERCIAL_VENDEDOR_ID) === eu.id;
}
function CmpR_obter_(eu, id, acao) {
  var r = id ? SGO_DATA.getById(CMP_ABAS.REQUISICOES, Cmp_s_(id)) : null;
  if (!r) throw new Error('Não foi possível ' + acao + ': o pedido de compra não foi encontrado. Atualize a lista');
  if (!CmpR_podeVer_(eu, r)) throw new Error('Não foi possível ' + acao + ': o pedido ' + Cmp_s_(r.NUMERO) + ' é de ' + Cmp_s_(r.SOLICITANTE_NOME) + '. Cada pessoa acompanha os próprios pedidos; a fila completa é de Compras');
  return r;
}

function CmpR_itemParaTela_(i, eu, comFotosDeTodos, k) {
  var cat = CmpR_categoria_(i.CATEGORIA);
  var fotos = Cmp_json_(i.FOTOS_JSON, []).filter(function (f) { return comFotosDeTodos || Cmp_s_(f.porId) === eu.id; });
  return { id: Cmp_s_(i.ID), ordem: k + 1, categoria: cat.codigo, categoriaNome: cat.nome, tecnica: cat.tecnica, descricao: Cmp_s_(i.DESCRICAO), quantidade: Number(i.QUANTIDADE) || 0,
    quantidadeTxt: Cmp_qtd_(i.QUANTIDADE), unidade: Cmp_s_(i.UNIDADE), partNumber: Cmp_s_(i.PART_NUMBER), marca: Cmp_s_(i.MARCA), equipamentoId: Cmp_s_(i.EQUIPAMENTO_ID),
    equipamentoTexto: Cmp_s_(i.EQUIPAMENTO_TEXTO), tensao: Cmp_s_(i.TENSAO), corrente: Cmp_s_(i.CORRENTE), pressao: Cmp_s_(i.PRESSAO), rosca: Cmp_s_(i.ROSCA), dimensao: Cmp_s_(i.DIMENSAO),
    material: Cmp_s_(i.MATERIAL), outras: Cmp_s_(i.OUTRAS_ESPEC), fotos: fotos.map(function (f) { return { id: f.id, nome: f.nome, url: f.url }; }),
    qtdRecebida: Cmp_s_(i.QTD_RECEBIDA) === '' ? '' : Number(i.QTD_RECEBIDA), falta: CmpR_faltaItem_(i, false) };
}

/** Linhas públicas do histórico (Meus pedidos) ou todas (fila). */
function CmpR_historico_(id, todas) {
  return Cmp_ler_(CMP_ABAS.HISTORICO).filter(function (h) { return Cmp_s_(h.ENTIDADE) === 'REQUISICAO' && Cmp_s_(h.ENTIDADE_ID) === Cmp_s_(id) && (todas || Cmp_up_(h.PUBLICO) === 'SIM'); })
    .sort(function (a, b) { return String(a.DATA).localeCompare(String(b.DATA)); })
    .map(function (h) { return { em: Cmp_br_(h.DATA), tipo: Cmp_s_(h.TIPO), de: Cmp_s_(h.DE), para: Cmp_s_(h.PARA), texto: Cmp_s_(h.TEXTO), por: Cmp_s_(h.USUARIO_NOME) }; });
}

/** O que a tela mostra. Sem valores para quem não pode ver (solicitante, vendedor). completo: itens e histórico. */
function CmpR_paraTela_(eu, r, completo) {
  var s = Cmp_up_(r.SITUACAO), valores = eu.veValores;
  var t = {
    id: Cmp_s_(r.ID), numero: Cmp_s_(r.NUMERO), titulo: Cmp_s_(r.TITULO), situacao: s, situacaoNome: CMP_SITUACOES[s] || s, situacaoTexto: CMP_SITUACOES_SOLICITANTE[s] || '',
    urgencia: Cmp_up_(r.URGENCIA), urgenciaNome: (CMP_URGENCIAS[Cmp_up_(r.URGENCIA)] || '').replace(/ \(.*\)$/, ''), finalidade: Cmp_s_(r.FINALIDADE), precisaAte: Cmp_brDia_(r.PRECISA_ATE),
    precisaAteIso: Cmp_dia_(r.PRECISA_ATE), vinculo: { tipo: Cmp_up_(r.VINCULO_TIPO), tipoNome: CMP_VINCULOS[Cmp_up_(r.VINCULO_TIPO)] || '', texto: CmpR_vinculoTexto_(r),
      clienteId: Cmp_s_(r.CLIENTE_ID), clienteNome: Cmp_s_(r.CLIENTE_NOME), unidadeId: Cmp_s_(r.UNIDADE_ID), propostaId: Cmp_s_(r.PROPOSTA_ID), propostaNumero: Cmp_s_(r.PROPOSTA_NUMERO),
      veiculoId: Cmp_s_(r.VEICULO_ID), osAuvo: Cmp_s_(r.OS_AUVO), motivoInterno: Cmp_s_(r.USO_INTERNO_MOTIVO) },
    solicitante: { id: Cmp_s_(r.SOLICITANTE_ID), nome: Cmp_s_(r.SOLICITANTE_NOME) }, comprador: { id: Cmp_s_(r.COMPRADOR_ID), nome: Cmp_s_(r.COMPRADOR_NOME) },
    especIncompleta: Cmp_sim_(r.ESPEC_INCOMPLETA), falta: Cmp_json_(r.ESPEC_FALTA, []), devolvida: Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO) ? { texto: Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO), em: Cmp_br_(r.ESPEC_DEVOLVIDA_EM), por: Cmp_s_(r.ESPEC_DEVOLVIDA_POR_NOME) } : null,
    criadoEm: Cmp_br_(r.CRIADO_EM), atualizadoEm: Cmp_br_(r.ATUALIZADO_EM), previsaoEntrega: Cmp_brDia_(r.PREVISAO_ENTREGA), pedidoNumero: Cmp_s_(r.PEDIDO_NUMERO),
    origem: Cmp_up_(r.ORIGEM) || 'TELA', semPedido: Cmp_sim_(r.SEM_PEDIDO), canceladaMotivo: Cmp_s_(r.CANCELADA_MOTIVO), entregueA: Cmp_s_(r.ENTREGUE_A_NOME), entregueEm: Cmp_br_(r.ENTREGUE_EM),
    divergencia: Cmp_s_(r.DIVERGENCIA_TEXTO), meu: Cmp_s_(r.SOLICITANTE_ID) === eu.id, veValores: !!valores
  };
  if (valores) {
    t.valorTotal = Number(r.VALOR_TOTAL) || 0; t.valorTxt = Cmp_s_(r.VALOR_TOTAL) !== '' ? Cmp_moeda_(r.VALOR_TOTAL) : '';
    t.faixa = Cmp_s_(r.FAIXA); t.aprovadorNivel = Cmp_s_(r.APROVADOR_NIVEL); t.aprovadorNivelNome = CMP_NIVEIS_APROVACAO[Cmp_up_(r.APROVADOR_NIVEL)] || '';
    t.aprovadaPor = Cmp_s_(r.APROVADA_POR_NOME); t.aprovadaEm = Cmp_br_(r.APROVADA_EM); t.aprovacaoTexto = Cmp_s_(r.APROVACAO_TEXTO);
    t.escolhaJustificativa = Cmp_s_(r.ESCOLHA_JUSTIFICATIVA); t.cotacoesJustificativa = Cmp_s_(r.COTACOES_JUSTIFICATIVA); t.minimoCotacoes = Cmp_s_(r.MINIMO_COTACOES);
    t.reprovacoes = Number(r.REPROVACOES) || 0; t.semPedidoJustificativa = Cmp_s_(r.SEM_PEDIDO_JUSTIFICATIVA); t.gestaoCiente = Cmp_s_(r.GESTAO_CIENTE_EM) ? Cmp_br_(r.GESTAO_CIENTE_EM) + ' por ' + Cmp_s_(r.GESTAO_CIENTE_POR_NOME) : '';
  }
  if (typeof CmpFin_paraTela_ === 'function' && valores) CmpFin_paraTela_(eu, r, t);
  if (completo) {
    var itens = CmpR_itensDe_(r.ID);
    var todasFotos = eu.veFila || eu.comprador;
    t.itens = itens.map(function (i, k) { return CmpR_itemParaTela_(i, eu, todasFotos, k); });
    t.historico = CmpR_historico_(r.ID, eu.veFila || eu.financeiro);
    t.acoes = CmpR_acoes_(eu, r);
    if (typeof CmpC_paraTela_ === 'function' && valores) CmpC_paraTela_(eu, r, t);
    if (typeof CmpP_paraTela_ === 'function') CmpP_paraTela_(eu, r, t);
  }
  return t;
}

/** O que a pessoa pode fazer agora (a tela mostra só esses botões; o servidor confere de novo em cada ação). */
function CmpR_acoes_(eu, r) {
  var s = Cmp_up_(r.SITUACAO), meu = Cmp_s_(r.SOLICITANTE_ID) === eu.id, a = {};
  a.editar = s === 'SOLICITADA' && (meu || eu.comprador);
  a.cancelar = (s === 'SOLICITADA' && (meu || eu.comprador)) || (['EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA'].indexOf(s) >= 0 && eu.comprador);
  a.devolver = ['SOLICITADA', 'EM_COTACAO'].indexOf(s) >= 0 && eu.comprador;
  a.iniciarCotacao = s === 'SOLICITADA' && eu.comprador && !Cmp_sim_(r.ESPEC_INCOMPLETA);
  if (typeof CmpC_acoes_ === 'function') CmpC_acoes_(eu, r, a);
  if (typeof CmpP_acoes_ === 'function') CmpP_acoes_(eu, r, a);
  if (typeof CmpFin_acoes_ === 'function') CmpFin_acoes_(eu, r, a);
  return a;
}

/** Itens da tela -> linhas (validação dura: descrição, quantidade). Devolve [{ dados, fotosNovas, id }]. */
function CmpR_itensDaTela_(lista) {
  if (!Array.isArray(lista) || !lista.length) throw new Error('Não foi possível enviar: acrescente pelo menos um item (o que precisa ser comprado)');
  if (lista.length > 30) throw new Error('Não foi possível enviar: o pedido tem mais de 30 itens. Divida em dois pedidos');
  return lista.map(function (i, k) {
    var desc = Cmp_texto_(i.descricao, 300), q = Cmp_num_(i.quantidade);
    if (desc.length < 3) throw new Error('Não foi possível enviar: o item ' + (k + 1) + ' está sem descrição. Escreva o que é (por exemplo "Resistência da câmara da autoclave") ou tire o item');
    if (!(q > 0)) throw new Error('Não foi possível enviar: o item ' + (k + 1) + ' (' + desc.slice(0, 40) + ') está sem quantidade. Informe quantos são necessários');
    var cat = CmpR_categoria_(i.categoria);
    var fotosNovas = (Array.isArray(i.fotosNovas) ? i.fotosNovas : []).filter(function (f) { return f && f.base64; });
    if (fotosNovas.length > 4) throw new Error('Não foi possível enviar: o item ' + (k + 1) + ' tem mais de 4 fotos novas. Escolha as melhores (até 4 por item)');
    return { id: Cmp_s_(i.id), fotosNovas: fotosNovas, fotosManter: Array.isArray(i.fotosManter) ? i.fotosManter.map(Cmp_s_) : null, dados: {
      ORDEM: k + 1, CATEGORIA: cat.codigo, DESCRICAO: desc, QUANTIDADE: q, UNIDADE: Cmp_texto_(i.unidade, 20) || 'un.', PART_NUMBER: Cmp_texto_(i.partNumber, 80), MARCA: Cmp_texto_(i.marca, 80),
      EQUIPAMENTO_ID: Cmp_s_(i.equipamentoId), EQUIPAMENTO_TEXTO: Cmp_texto_(i.equipamentoTexto, 160), TENSAO: Cmp_texto_(i.tensao, 60), CORRENTE: Cmp_texto_(i.corrente, 60),
      PRESSAO: Cmp_texto_(i.pressao, 60), ROSCA: Cmp_texto_(i.rosca, 60), DIMENSAO: Cmp_texto_(i.dimensao, 120), MATERIAL: Cmp_texto_(i.material, 80), OUTRAS_ESPEC: Cmp_texto_(i.outras, 2000),
      PRODUTO_ID: Cmp_s_(i.produtoId) } };
  });
}

/** Grava os itens da requisição (atualiza, acrescenta e marca como inativo o que saiu; nada é apagado). Dentro da trava. */
function CmpR_gravarItens_(r, itensTela, eu) {
  var atuais = CmpR_itensDe_(r.ID), porId = {};
  atuais.forEach(function (i) { porId[Cmp_s_(i.ID)] = i; });
  var agora = Cmp_agora_(), mantidos = {}, resultado = [];
  itensTela.forEach(function (it) {
    var base = it.id && porId[it.id] ? porId[it.id] : null;
    var fotos = base ? Cmp_json_(base.FOTOS_JSON, []) : [];
    if (base && it.fotosManter) fotos = fotos.filter(function (f) { return it.fotosManter.indexOf(Cmp_s_(f.id)) >= 0 || Cmp_s_(f.porId) !== eu.id && !eu.comprador; });
    it.fotosNovas.forEach(function (fn, k) {
      var s = Cmp_salvarArquivo_(fn, r.NUMERO, 'Foto item ' + it.dados.ORDEM + (k ? '-' + (k + 1) : ''), CMP_RX_IMAGEM, 'da foto do item ' + it.dados.ORDEM);
      fotos.push({ id: s.id, nome: s.nome, url: s.url, porId: eu.id, porNome: eu.nome, em: agora });
    });
    var campos = Object.assign({}, it.dados, { FOTOS_JSON: JSON.stringify(fotos), ATIVO: 'SIM', ATUALIZADO_EM: agora });
    if (base) { SGO_DATA.update(CMP_ABAS.ITENS, base.ID, campos); mantidos[base.ID] = true; resultado.push(Object.assign({}, base, campos)); }
    else { campos.REQUISICAO_ID = r.ID; resultado.push(SGO_DATA.insert(CMP_ABAS.ITENS, campos)); }
  });
  atuais.forEach(function (i) { if (!mantidos[Cmp_s_(i.ID)]) SGO_DATA.update(CMP_ABAS.ITENS, i.ID, { ATIVO: 'NAO', ATUALIZADO_EM: agora }); });
  return resultado;
}

function CmpR_tituloDe_(itens) {
  if (!itens.length) return 'Pedido de compra';
  var t = Cmp_s_(itens[0].dados ? itens[0].dados.DESCRICAO : itens[0].DESCRICAO).slice(0, 90);
  return itens.length > 1 ? t + ' e mais ' + Cmp_plural_(itens.length - 1, 'item', 'itens') : t;
}

/** Descrição da atividade do comprador (sem valores). */
function CmpR_descricaoAtividade_(r, itens) {
  return 'Pedido de compra ' + Cmp_s_(r.NUMERO) + ' de ' + Cmp_s_(r.SOLICITANTE_NOME) + '. Urgência: ' + ((CMP_URGENCIAS[Cmp_up_(r.URGENCIA)] || '').replace(/ \(.*\)$/, '') || 'normal') +
    (Cmp_dia_(r.PRECISA_ATE) ? '; precisa até ' + Cmp_brDia_(r.PRECISA_ATE) : '') + '.\nPara que é: ' + Cmp_s_(r.FINALIDADE) + '\nVínculo: ' + CmpR_vinculoTexto_(r) +
    '\n\nItens:\n' + itens.map(function (i, k) { return (k + 1) + '. ' + Cmp_qtd_(i.QUANTIDADE) + ' ' + Cmp_s_(i.UNIDADE) + ' · ' + Cmp_s_(i.DESCRICAO) + (Cmp_s_(i.PART_NUMBER) ? ' (nº da peça ' + Cmp_s_(i.PART_NUMBER) + ')' : ''); }).join('\n') +
    '\n\nAbra em Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) + '.';
}

/** Cria a atividade "Conferir e cotar" do comprador quando a especificação está completa e não há outra aberta. Dentro da trava. */
function CmpR_atividadeCotar_(r, itens) {
  if (Cmp_atividadeAberta_(Cmp_atividade_(r.ATIVIDADE_ID))) return Cmp_s_(r.ATIVIDADE_ID);
  if (Cmp_up_(r.ORIGEM) === 'COMERCIAL' && Cmp_atividadeAberta_(Cmp_atividade_(r.COMERCIAL_ATIVIDADE_ID))) return ''; // a atividade do setor Compras (Comercial) já cobre
  try {
    return Cmp_criarAtividade_({ responsavelId: Cmp_s_(r.COMPRADOR_ID), titulo: 'Conferir e cotar ' + Cmp_s_(r.NUMERO) + ': ' + Cmp_s_(r.TITULO).slice(0, 120),
      descricao: CmpR_descricaoAtividade_(r, itens), prazo: Cmp_prazoPorUrgencia_(r.URGENCIA), prioridade: Cmp_up_(r.URGENCIA) === 'CRITICA' ? 'Urgente' : (Cmp_up_(r.URGENCIA) === 'ALTA' ? 'Alta' : 'Normal'),
      clienteId: Cmp_s_(r.CLIENTE_ID), unidadeId: Cmp_s_(r.UNIDADE_ID), porQue: 'Pedido de peça ou material com a especificação completa: confira e peça os orçamentos.',
      onde: 'Compras > Fila de compras > ' + Cmp_s_(r.NUMERO), como: 'Confira a especificação; se algo estiver ambíguo, devolva ao solicitante dizendo o que falta. Depois toque em "Iniciar cotação" e lance os orçamentos com o arquivo de cada fornecedor.' });
  } catch (e) { console.error('Compras, atividade do comprador: ' + ((e && e.message) || e)); return ''; }
}

/**
 * Pedir peça ou material (novo) ou editar enquanto "Solicitada". d: { id, urgencia, finalidade, precisaAte, vinculo:{...}, itens:[...] }
 */
function CmpR_salvar_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'enviar o pedido de compra');
  d = d || {};
  var urg = Cmp_up_(d.urgencia) || 'NORMAL';
  if (!CMP_URGENCIAS[urg]) throw new Error('Não foi possível enviar: escolha a urgência (crítica, alta, normal ou baixa)');
  var fin = Cmp_texto_(d.finalidade, 500);
  if (fin.length < 10) throw new Error('Não foi possível enviar: escreva para que é a compra e onde será usada (pelo menos 10 letras), por exemplo "Troca da resistência da autoclave AC-01 parada na CME"');
  var precisa = Cmp_dia_(d.precisaAte);
  if (Cmp_s_(d.precisaAte) && !precisa) throw new Error('Não foi possível enviar: a data "precisa até" não é válida. Escolha no calendário ou deixe em branco');
  var vinc = CmpR_vinculo_(d.vinculo);
  var itensTela = CmpR_itensDaTela_(d.itens);
  return Cmp_comTrava_(function () {
    var agora = Cmp_agora_(), id = Cmp_s_(d.id), r, novo = !id;
    if (id) {
      r = CmpR_obter_(eu, id, 'alterar o pedido');
      if (Cmp_up_(r.SITUACAO) !== 'SOLICITADA') throw new Error('Não foi possível alterar: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r.SITUACAO)] + '". Depois que a cotação começa, só o comprador ajusta (fale com ' + (Cmp_s_(r.COMPRADOR_NOME) || 'Compras') + ')');
      if (Cmp_s_(r.SOLICITANTE_ID) !== eu.id && !eu.comprador) throw new Error('Não foi possível alterar: o pedido é de ' + Cmp_s_(r.SOLICITANTE_NOME) + '. Quem altera é quem pediu ou o comprador');
    } else {
      var comp = Cmp_compradorPara_();
      r = SGO_DATA.insert(CMP_ABAS.REQUISICOES, { NUMERO: Cmp_proximoNumero_('REQ', CMP_ABAS.REQUISICOES, 'NUMERO'), SOLICITANTE_ID: eu.id, SOLICITANTE_NOME: eu.nome, SOLICITANTE_AREA: eu.area,
        SITUACAO: 'SOLICITADA', COMPRADOR_ID: comp.id, COMPRADOR_NOME: comp.nome, ORIGEM: 'TELA', REPROVACOES: 0, CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    }
    var itens = CmpR_gravarItens_(r, itensTela, eu);
    var campos = Object.assign({}, vinc, { URGENCIA: urg, FINALIDADE: fin, PRECISA_ATE: precisa, TITULO: CmpR_tituloDe_(itens), ATUALIZADO_EM: agora });
    var tmp = Object.assign({}, r, campos);
    var falta = CmpR_falta_(tmp, itens);
    campos.ESPEC_FALTA = JSON.stringify(falta);
    campos.ESPEC_INCOMPLETA = falta.length ? 'SIM' : '';
    var estavaDevolvida = !!Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO);
    if (!falta.length && estavaDevolvida && !novo) { campos.ESPEC_DEVOLVIDA_TEXTO = ''; campos.ESPEC_DEVOLVIDA_EM = ''; campos.ESPEC_DEVOLVIDA_POR_NOME = ''; }
    tmp = Object.assign(tmp, campos);
    if (!falta.length && !Cmp_s_(tmp.ESPEC_DEVOLVIDA_TEXTO)) campos.ATIVIDADE_ID = CmpR_atividadeCotar_(tmp, itens) || Cmp_s_(r.ATIVIDADE_ID);
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    if (novo) Cmp_historico_('REQUISICAO', r.ID, 'CRIACAO', eu, { para: 'Solicitada', publico: true, texto: 'Pedido enviado a Compras' + (falta.length ? ' com a especificação incompleta. Falta: ' + falta.join('; ') + '.' : ' com a especificação completa. Comprador: ' + Cmp_s_(r.COMPRADOR_NOME) + '.') });
    else Cmp_historico_('REQUISICAO', r.ID, 'EDICAO', eu, { publico: true, texto: falta.length ? 'Pedido alterado. Ainda falta: ' + falta.join('; ') + '.' : 'Pedido alterado; especificação completa.' });
    var final = Object.assign({}, r, campos);
    return { requisicao: CmpR_paraTela_(eu, final, true), falta: falta,
      message: (novo ? 'Pedido ' + final.NUMERO + ' enviado a Compras. ' : 'Pedido ' + final.NUMERO + ' alterado. ') +
        (falta.length ? 'A especificação está incompleta e o pedido não é cotado até completar. Falta: ' + falta.join('; ') + '. Complete em Compras > Meus pedidos de compra.' : 'O comprador (' + Cmp_s_(final.COMPRADOR_NOME) + ') recebeu a atividade para conferir e cotar. Acompanhe em Meus pedidos de compra.') };
  });
}

/** Comprador devolve a especificação a quem pediu, dizendo o que falta ou está ambíguo. d: { id, texto } */
function CmpR_devolverEspec_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'devolver a especificação');
  var texto = Cmp_texto_(d && d.texto, 1000);
  if (texto.length < 10) throw new Error('Não foi possível devolver: escreva o que falta ou está ambíguo (pelo menos 10 letras), por exemplo "Falta a foto da etiqueta da resistência e a tensão". Quem pediu recebe esse texto');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.id, 'devolver a especificação'), s = Cmp_up_(r.SITUACAO);
    if (['SOLICITADA', 'EM_COTACAO'].indexOf(s) < 0) throw new Error('Não foi possível devolver: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[s] + '". A especificação é devolvida antes da escolha do orçamento');
    var campos = { SITUACAO: 'SOLICITADA', ESPEC_INCOMPLETA: 'SIM', ESPEC_DEVOLVIDA_TEXTO: texto, ESPEC_DEVOLVIDA_EM: Cmp_agora_(), ESPEC_DEVOLVIDA_POR_NOME: eu.nome, ATUALIZADO_EM: Cmp_agora_() };
    var falta = Cmp_json_(r.ESPEC_FALTA, []);
    if (falta.indexOf('Compras pediu: ' + texto) < 0) falta = falta.filter(function (x) { return !/^Compras pediu: /.test(x); }).concat(['Compras pediu: ' + texto]);
    campos.ESPEC_FALTA = JSON.stringify(falta);
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Concluída', 'Especificação devolvida a ' + Cmp_s_(r.SOLICITANTE_NOME) + ': ' + texto);
    Cmp_historico_('REQUISICAO', r.ID, 'ESPEC_DEVOLVIDA', eu, { de: CMP_SITUACOES[s], para: 'Solicitada (especificação incompleta)', publico: true, texto: 'Compras pediu para completar a especificação: ' + texto });
    Cmp_avisar_(r.SOLICITANTE_ID, 'ESPEC_DEVOLVIDA', 'Complete a especificação do pedido ' + r.NUMERO, eu.nome + ' (Compras) precisa de mais informação para comprar certo: ' + texto + ' Abra Compras > Meus pedidos de compra e toque em "Completar a especificação".', r.ID, { email: true, autorId: eu.id });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Especificação devolvida a ' + Cmp_s_(r.SOLICITANTE_NOME) + '. Quando completar, a atividade de cotar volta para o comprador.' };
  });
}

/** Comprador confere a especificação e começa a cotar. */
function CmpR_iniciarCotacao_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'iniciar a cotação');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d && d.id, 'iniciar a cotação');
    if (Cmp_up_(r.SITUACAO) !== 'SOLICITADA') throw new Error('Não foi possível iniciar a cotação: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r.SITUACAO)] + '"');
    var itens = CmpR_itensDe_(r.ID), falta = CmpR_falta_(r, itens);
    if (falta.length || Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO)) throw new Error('Não foi possível iniciar a cotação: a especificação está incompleta (' + (falta.length ? falta.join('; ') : 'devolvida a quem pediu') + '). Especificação incompleta não é cotada, para não comprar errado. Complete os itens (botão Editar) ou devolva a quem pediu dizendo o que falta');
    var campos = { SITUACAO: 'EM_COTACAO', ESPEC_INCOMPLETA: '', ESPEC_FALTA: '[]', ESPEC_CONFERIDA_POR_ID: eu.id, ESPEC_CONFERIDA_POR_NOME: eu.nome, ESPEC_CONFERIDA_EM: Cmp_agora_(), ATUALIZADO_EM: Cmp_agora_() };
    if (!Cmp_atividadeAberta_(Cmp_atividade_(r.ATIVIDADE_ID))) campos.ATIVIDADE_ID = CmpR_atividadeCotar_(Object.assign({}, r, campos), itens) || '';
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    Cmp_historico_('REQUISICAO', r.ID, 'EM_COTACAO', eu, { de: 'Solicitada', para: 'Em cotação', publico: true, texto: 'Especificação conferida por ' + eu.nome + '. Compras está pedindo orçamentos.' });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Especificação conferida. Lance os orçamentos em "Cotações" (cada um com o arquivo do fornecedor).' };
  });
}

/** Cancelar com motivo. Quem pediu cancela o próprio pedido enquanto "Solicitada"; depois, só o comprador (até a peça chegar). */
function CmpR_cancelar_(eu, d) {
  var motivo = Cmp_texto_(d && d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (pelo menos 10 letras), por exemplo "O cliente desistiu do conserto". O pedido fica no histórico');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.id, 'cancelar o pedido'), s = Cmp_up_(r.SITUACAO), meu = Cmp_s_(r.SOLICITANTE_ID) === eu.id;
    var ok = (s === 'SOLICITADA' && (meu || eu.comprador)) || (['EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA'].indexOf(s) >= 0 && eu.comprador);
    if (!ok) {
      if (['DISPONIVEL', 'ENTREGUE', 'CANCELADA'].indexOf(s) >= 0) throw new Error('Não foi possível cancelar: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[s] + '". Depois que a peça chega, não há o que cancelar; se ela não serve, fale com o comprador para a devolução ao fornecedor');
      throw new Error('Não foi possível cancelar: o pedido ' + r.NUMERO + ' já está com Compras ("' + CMP_SITUACOES[s] + '"). Peça o cancelamento a ' + (Cmp_s_(r.COMPRADOR_NOME) || 'Compras') + ', que avisa o fornecedor se preciso');
    }
    var agora = Cmp_agora_(), campos = { SITUACAO: 'CANCELADA', CANCELADA_EM: agora, CANCELADA_POR_NOME: eu.nome, CANCELADA_MOTIVO: motivo, ATUALIZADO_EM: agora };
    SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
    Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Cancelada', 'Pedido de compra cancelado: ' + motivo);
    var aviso = '';
    if (Cmp_s_(r.PEDIDO_ID)) {
      try { SGO_DATA.update(CMP_ABAS.PEDIDOS, r.PEDIDO_ID, { SITUACAO: 'CANCELADO', ATUALIZADO_EM: agora }); } catch (e) {}
      aviso = ' O pedido de compra ' + Cmp_s_(r.PEDIDO_NUMERO) + ' já tinha sido feito: avise o fornecedor do cancelamento.';
    }
    Cmp_historico_('REQUISICAO', r.ID, 'CANCELADA', eu, { de: CMP_SITUACOES[s], para: 'Cancelada', publico: true, texto: motivo });
    Cmp_avisar_(r.SOLICITANTE_ID, 'CANCELADA', 'Pedido de compra ' + r.NUMERO + ' cancelado', eu.nome + ' cancelou o pedido "' + Cmp_s_(r.TITULO).slice(0, 80) + '". Motivo: ' + motivo, r.ID, { autorId: eu.id });
    if (Cmp_s_(r.COMERCIAL_VENDEDOR_ID)) Cmp_avisar_(r.COMERCIAL_VENDEDOR_ID, 'CANCELADA', 'Compra do pedido ' + Cmp_s_(r.PROPOSTA_NUMERO) + ' cancelada (' + r.NUMERO + ')', eu.nome + ' cancelou a compra. Motivo: ' + motivo, r.ID, { autorId: eu.id });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: 'Pedido ' + r.NUMERO + ' cancelado.' + aviso };
  });
}

/** Meus pedidos de compra: os que eu pedi e (vendedor) os do meu pedido aprovado. Nunca com valor. */
function CmpR_meus_(eu) {
  var semValor = Object.assign({}, eu, { veValores: false, veFila: false, comprador: false, financeiro: false });
  return Cmp_ler_(CMP_ABAS.REQUISICOES).filter(function (r) { return Cmp_s_(r.SOLICITANTE_ID) === eu.id || Cmp_s_(r.COMERCIAL_VENDEDOR_ID) === eu.id; })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); })
    .map(function (r) {
      var t = CmpR_paraTela_(semValor, r, false);
      t.itens = CmpR_itensDe_(r.ID).map(function (i, k) { return CmpR_itemParaTela_(i, semValor, false, k); });
      t.historico = CmpR_historico_(r.ID, false);
      t.acoes = CmpR_acoes_(semValor, r);
      return t;
    });
}

/** Fila do comprador (com valores). filtro: { situacao: 'ABERTAS'|codigo|'TODAS', busca } */
function CmpR_fila_(eu, filtro) {
  Cmp_exigir_(eu, 'FILA', 'ver a fila de compras');
  var f = filtro || {}, s = Cmp_up_(f.situacao) || 'ABERTAS', q = Cmp_s_(f.busca).toLowerCase();
  var abertas = ['SOLICITADA', 'EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PEDIDO_FEITO', 'RECEBIDA_DIVERGENCIA', 'DISPONIVEL'];
  var contagem = {};
  var lista = Cmp_ler_(CMP_ABAS.REQUISICOES).filter(function (r) {
    var sr = Cmp_up_(r.SITUACAO);
    contagem[sr] = (contagem[sr] || 0) + 1;
    if (s === 'ABERTAS' && abertas.indexOf(sr) < 0) return false;
    if (s !== 'ABERTAS' && s !== 'TODAS' && sr !== s) return false;
    if (q && (Cmp_s_(r.NUMERO) + ' ' + Cmp_s_(r.TITULO) + ' ' + Cmp_s_(r.SOLICITANTE_NOME) + ' ' + Cmp_s_(r.CLIENTE_NOME) + ' ' + Cmp_s_(r.PEDIDO_NUMERO)).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }).sort(function (a, b) {
    var ua = ['CRITICA', 'ALTA', 'NORMAL', 'BAIXA'].indexOf(Cmp_up_(a.URGENCIA)), ub = ['CRITICA', 'ALTA', 'NORMAL', 'BAIXA'].indexOf(Cmp_up_(b.URGENCIA));
    if (ua !== ub) return ua - ub;
    return String(a.CRIADO_EM).localeCompare(String(b.CRIADO_EM));
  }).map(function (r) { return CmpR_paraTela_(eu, r, false); });
  return { requisicoes: lista, contagem: contagem };
}

function CmpR_detalhe_(eu, id) {
  var r = CmpR_obter_(eu, id, 'abrir o pedido');
  var olhar = eu.veFila || eu.financeiro ? eu : Object.assign({}, eu, { veValores: false, veFila: false, comprador: false });
  return CmpR_paraTela_(olhar, r, true);
}

// ------------------------------------------------------------
// ESCOLHAS DO FORMULÁRIO (cliente, unidade e equipamentos, pedidos aprovados, veículos)
// ------------------------------------------------------------
function CmpR_buscarClientes_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'buscar clientes');
  var q = Cmp_s_(d && d.busca).toLowerCase(), dig = q.replace(/\D/g, '');
  if (q.length < 2) return [];
  return Cmp_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) {
    if (Cmp_up_(c.STATUS || 'ATIVO') === 'INATIVO') return false;
    var t = (Cmp_s_(c.NOME_FANTASIA) + ' ' + Cmp_s_(c.RAZAO_SOCIAL)).toLowerCase();
    return t.indexOf(q) >= 0 || (dig.length >= 4 && Cmp_digitos_(c.CNPJ).indexOf(dig) >= 0);
  }).slice(0, 30).map(function (c) { return { id: Cmp_s_(c.ID), nome: Cmp_s_(c.NOME_FANTASIA) || Cmp_s_(c.RAZAO_SOCIAL), cnpj: Cmp_s_(c.CNPJ) }; });
}

function CmpR_doCliente_(eu, d) {
  Cmp_exigir_(eu, 'INTERNO', 'ver as unidades do cliente');
  var cid = Cmp_s_(d && d.clienteId);
  var unidades = Cmp_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Cmp_s_(u.CLIENTE_ID) === cid && Cmp_up_(u.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (u) { return { id: Cmp_s_(u.ID), nome: Cmp_s_(u.NOME_UNIDADE) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  var equipamentos = Cmp_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Cmp_s_(e.CLIENTE_ID) === cid && Cmp_up_(e.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (e) { return { id: Cmp_s_(e.ID), unidadeId: Cmp_s_(e.UNIDADE_ID), texto: [Cmp_s_(e.TIPO), Cmp_s_(e.MODELO), Cmp_s_(e.TAG) ? 'TAG ' + Cmp_s_(e.TAG) : '', Cmp_s_(e.SETOR)].filter(Boolean).join(' · ') }; });
  return { unidades: unidades, equipamentos: equipamentos };
}

/** Pedidos aprovados do Comercial (só número e cliente; sem valor). */
function CmpR_pedidosComercial_() {
  var aba = typeof COM_ABAS !== 'undefined' ? COM_ABAS.PROPOSTAS : 'COM_PROPOSTAS';
  return Cmp_ler_(aba).filter(function (p) { return Cmp_up_(p.SITUACAO) === 'APROVADA'; })
    .map(function (p) { return { id: Cmp_s_(p.ID), numero: Cmp_s_(p.NUMERO), cliente: Cmp_s_(p.CLIENTE_NOME), titulo: Cmp_s_(p.TITULO).slice(0, 80) }; })
    .sort(function (a, b) { return b.numero.localeCompare(a.numero); }).slice(0, 100);
}

function CmpR_veiculos_() {
  return Cmp_ler_(SGO_CFG.SHEETS.CAD_VEICULOS || 'CAD_VEICULOS').filter(function (v) { return Cmp_up_(v.STATUS) !== 'INATIVO' && Cmp_up_(v.STATUS) !== 'VENDIDO'; })
    .map(function (v) { return { id: Cmp_s_(v.ID), placa: Cmp_s_(v.PLACA), modelo: Cmp_s_(v.MODELO) }; }).sort(function (a, b) { return a.placa.localeCompare(b.placa); });
}
