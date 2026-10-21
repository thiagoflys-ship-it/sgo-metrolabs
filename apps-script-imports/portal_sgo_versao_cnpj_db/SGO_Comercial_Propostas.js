/****************************************************
 * COMERCIAL — CATÁLOGO, PROPOSTA, RESPOSTA DO CLIENTE E PASSAGEM AOS SETORES (21/10/2026)
 *
 * Catálogo (COM_PRODUTOS): começa vazio; a gestão cadastra (código, nome, tipo, unidade, preço; custo opcional,
 * visto só pela gestão). Item arquivado sai da escolha, nunca do banco.
 *
 * Proposta (COM_PROPOSTAS, itens em ITENS_JSON):
 *  - Número anual PROP-2026-0001 (decisão do dono; a solicitação de orçamento dos padrões continua com ORC-),
 *    revisão 00, 01... A revisão nova mantém o número; a anterior fica "Substituída".
 *  - Só o RASCUNHO é editado. "Concluir" confere a proposta (regras da gestora) e a política de desconto:
 *    dentro do limite (padrão 15% sobre o preço de tabela, margem mínima quando o item tem custo) fica PRONTA;
 *    acima, AGUARDANDO APROVAÇÃO: entra na Caixa de decisões do gestor comercial e não pode ser enviada até a
 *    decisão, que é tomada na tela da proposta (quem pediu não aprova o próprio desconto).
 *  - "Gerar documento": congela os dados do cliente, calcula a marca de conferência do conteúdo e salva a folha
 *    A4 (HTML e PDF) na pasta do cliente (Comercial - Propostas/<CNPJ>). A proposta interna com custo e margem
 *    nunca vai para essa pasta (fica só na tela da gestão).
 *  - Envio: sempre ação do vendedor, pela janela "Enviar documento" que já existe (e-mail pela caixa dele).
 *    Quando o envio é registrado (DOC_ENVIOS), a proposta passa a "Enviada", a oportunidade vai para a etapa de
 *    proposta (60%) se estava antes, e o retorno ao cliente vira atividade para o 2º dia útil. Vencida é marcada
 *    pela rotina mesmo sem ninguém abrir nada (falha do COMMAND corrigida).
 *  - Resposta do cliente: registro manual. Aprovação exige o arquivo do aceite (e-mail salvo, pedido de compra
 *    ou proposta assinada), guardado na pasta do cliente; recusa exige o motivo.
 *  - Pedido aprovado: "Passar aos setores" cria atividades para a Área técnica (aparece também no Kanban do
 *    Cronograma de execução, para o planejamento), Compras e Financeiro, com prazo e lista de conferência, sem
 *    valor. O Financeiro vê o valor em Comercial > Pedidos aprovados. Sem passagem há 1 dia útil, o pedido entra
 *    na Caixa de decisões. O vendedor é avisado quando cada setor conclui.
 ****************************************************/

var COM_PASTA_PROPOSTAS = 'Comercial - Propostas';
var COM_TIPOS_ITEM = { SERVICO: 'Serviço', PRODUTO: 'Produto', CONTRATO: 'Contrato' };

// ------------------------------------------------------------
// CATÁLOGO
// ------------------------------------------------------------
function ComP_produtoParaTela_(p, eu) {
  var t = { id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), tipo: Com_up_(p.TIPO) || 'SERVICO', tipoNome: COM_TIPOS_ITEM[Com_up_(p.TIPO)] || 'Serviço',
    categoria: Com_s_(p.CATEGORIA), unidade: Com_s_(p.UNIDADE_MEDIDA) || 'un.', descricao: Com_s_(p.DESCRICAO), preco: Number(p.PRECO) || 0, precoTxt: Com_moeda_(p.PRECO),
    ativo: Com_up_(p.ATIVO || 'SIM') !== 'NAO' };
  if (eu && eu.veCusto) { t.custo = Com_s_(p.CUSTO) === '' ? null : Number(p.CUSTO) || 0; t.custoTxt = t.custo === null ? '' : Com_moeda_(t.custo); }
  return t;
}

function ComP_catalogo_(eu, incluirArquivados) {
  Com_exigir_(eu, 'VENDEDOR', 'ver o catálogo');
  return Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return incluirArquivados ? eu.gestao : Com_up_(p.ATIVO || 'SIM') !== 'NAO'; })
    .map(function (p) { return ComP_produtoParaTela_(p, eu); }).sort(function (a, b) { return (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** Gestão cadastra ou altera. d: { id?, codigo, nome, tipo, categoria, unidade, descricao, preco, custo } */
function ComP_salvarProduto_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'salvar o produto ou serviço');
  d = d || {};
  var nome = Com_texto_(d.nome, 200);
  if (nome.length < 3) throw new Error('Não foi possível salvar: escreva o nome do produto ou serviço (pelo menos 3 letras)');
  var codigo = Com_up_(d.codigo).replace(/\s+/g, '-').slice(0, 40);
  if (!codigo) throw new Error('Não foi possível salvar: informe um código curto (por exemplo QT-AUTOCLAVE). Ele aparece na proposta e evita itens repetidos');
  var tipo = COM_TIPOS_ITEM[Com_up_(d.tipo)] ? Com_up_(d.tipo) : 'SERVICO';
  var preco = Com_num_(d.preco);
  if (!(preco >= 0)) throw new Error('Não foi possível salvar: informe o preço de venda (por exemplo 1.250,00)');
  var custo = Com_s_(d.custo) === '' ? '' : Com_num_(d.custo);
  if (custo !== '' && !(custo >= 0)) throw new Error('Não foi possível salvar: o custo precisa ser um valor (por exemplo 600,00) ou ficar em branco');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var outro = Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Com_up_(p.CODIGO) === codigo && Com_s_(p.ID) !== Com_s_(d.id); })[0];
    if (outro) throw new Error('Não foi possível salvar: o código ' + codigo + ' já é do item "' + Com_s_(outro.NOME) + '". Use outro código ou edite aquele item');
    var campos = { CODIGO: codigo, NOME: nome, TIPO: tipo, CATEGORIA: Com_texto_(d.categoria, 80), UNIDADE_MEDIDA: Com_texto_(d.unidade, 20) || 'un.', DESCRICAO: Com_texto_(d.descricao, 2000),
      PRECO: Com_r2_(preco), CUSTO: custo === '' ? '' : Com_r2_(custo), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() };
    var reg;
    if (Com_s_(d.id)) {
      var atual = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id));
      if (!atual) throw new Error('Não foi possível salvar: o item não existe mais. Atualize o catálogo');
      SGO_DATA.update(COM_ABAS.PRODUTOS, atual.ID, campos);
      Com_historico_('PRODUTO', atual.ID, 'EDICAO', eu, { texto: 'Preço ' + Com_moeda_(atual.PRECO) + ' para ' + Com_moeda_(preco) + (Com_s_(atual.NOME) !== nome ? '; nome alterado' : '') });
      reg = Object.assign({}, atual, campos);
    } else {
      campos.ATIVO = 'SIM';
      reg = SGO_DATA.insert(COM_ABAS.PRODUTOS, campos);
      Com_historico_('PRODUTO', reg.ID, 'CRIACAO', eu, { texto: nome + ' (' + codigo + ')' });
    }
    return { produto: ComP_produtoParaTela_(reg, eu), message: 'Item ' + codigo + ' salvo no catálogo.' };
  });
}

function ComP_arquivarProduto_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'arquivar o item');
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d && d.id));
    if (!p) throw new Error('Não foi possível arquivar: o item não existe mais. Atualize o catálogo');
    var ativo = !(d && d.reativar);
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { ATIVO: ativo ? 'NAO' : 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() });
    Com_historico_('PRODUTO', p.ID, ativo ? 'ARQUIVADO' : 'REATIVADO', eu, { texto: Com_texto_(d && d.motivo, 300) });
    return { message: ativo ? 'Item arquivado: não aparece mais na escolha das propostas (as propostas antigas continuam como estão).' : 'Item reativado.' };
  });
}

// ------------------------------------------------------------
// CÁLCULO E POLÍTICA
// ------------------------------------------------------------
/**
 * Totais e política. itens: [{quantidade, precoUnitario, precoTabela, custoUnitario}], descontoGeral (R$).
 * bruto = soma pelo preço de tabela (ou o digitado, sem tabela); desconto % = (bruto - total) / bruto;
 * margem só dos itens com custo (o desconto geral é rateado).
 */
function ComP_calcular_(itens, descontoGeral) {
  var bruto = 0, liquidoItens = 0, custo = 0, receitaComCusto = 0, semCusto = 0;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0, pt = Number(i.precoTabela) > 0 ? Number(i.precoTabela) : pu;
    bruto += q * Math.max(pt, pu);
    liquidoItens += q * pu;
  });
  var dg = Math.max(0, Number(descontoGeral) || 0);
  var total = Com_r2_(liquidoItens - dg);
  var fator = liquidoItens > 0 ? total / liquidoItens : 1;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0;
    if (i.custoUnitario !== null && i.custoUnitario !== undefined && i.custoUnitario !== '') { custo += q * Number(i.custoUnitario); receitaComCusto += q * pu * fator; }
    else semCusto++;
  });
  return {
    subtotal: Com_r2_(liquidoItens), bruto: Com_r2_(bruto), descontoGeral: Com_r2_(dg), total: total,
    descontoPct: bruto > 0 ? Math.round((bruto - total) / bruto * 10000) / 100 : 0,
    margemPct: receitaComCusto > 0 ? Math.round((receitaComCusto - custo) / receitaComCusto * 10000) / 100 : null,
    custoTotal: Com_r2_(custo), itensSemCusto: semCusto
  };
}

/** Limite de desconto do vendedor (por vendedor, quando a gestão definir; senão o geral). */
function ComP_limiteDe_(uid, met) {
  met = met || Com_metodologia_();
  var por = (met.politica && met.politica.descontoPorVendedor) || {};
  var v = Com_num_(por[uid]);
  return v >= 0 ? v : Number(met.politica.descontoMaxPct) || 0;
}

/** { dentro, motivos[], limite, margemMin }. */
function ComP_avaliarPolitica_(calc, uid, met) {
  met = met || Com_metodologia_();
  var limite = ComP_limiteDe_(uid, met), mm = Number(met.politica.margemMinPct) || 0, motivos = [];
  if (calc.descontoPct > limite + 1e-9) motivos.push('desconto de ' + Com_pct_(calc.descontoPct) + ' acima do limite de ' + Com_pct_(limite, 0) + ' sem aprovação');
  if (mm > 0 && calc.margemPct !== null && calc.margemPct < mm - 1e-9) motivos.push('margem de ' + Com_pct_(calc.margemPct) + ' abaixo da mínima de ' + Com_pct_(mm, 0));
  return { dentro: !motivos.length, motivos: motivos, limite: limite, margemMin: mm };
}

// ------------------------------------------------------------
// LEITURA
// ------------------------------------------------------------
function ComP_podeVer_(eu, p) {
  if (!eu) return false;
  if (eu.gestao) return true;
  if (eu.vendedor) return Com_s_(p.RESPONSAVEL_ID) === eu.id;
  if (eu.financeiro) return Com_up_(p.SITUACAO) === 'APROVADA';
  return false;
}

function ComP_obter_(eu, id, acao) {
  var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, Com_s_(id));
  if (!p) throw new Error('Não foi possível ' + acao + ': a proposta não foi encontrada. Atualize a lista de propostas');
  if (!ComP_podeVer_(eu, p)) throw new Error('Não foi possível ' + acao + ': a proposta ' + Com_s_(p.NUMERO) + ' é de ' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa') + '. O vendedor vê só as próprias; o Financeiro vê só as aprovadas');
  return p;
}

function ComP_rotulo_(p) { return Com_s_(p.NUMERO) + ' rev.' + (typeof SGO_DocA4_revisao_ === 'function' ? SGO_DocA4_revisao_(p.REVISAO) : Com_s_(p.REVISAO)); }

function ComP_paraTela_(eu, p, completo) {
  var s = Com_up_(p.SITUACAO);
  var itens = Com_json_(p.ITENS_JSON, []);
  var t = {
    id: Com_s_(p.ID), numero: Com_s_(p.NUMERO), revisao: typeof SGO_DocA4_revisao_ === 'function' ? SGO_DocA4_revisao_(p.REVISAO) : Com_s_(p.REVISAO), rotulo: ComP_rotulo_(p),
    oportunidadeId: Com_s_(p.OPORTUNIDADE_ID), clienteId: Com_s_(p.CLIENTE_ID), cliente: Com_s_(p.CLIENTE_NOME), unidadeId: Com_s_(p.UNIDADE_ID), unidade: Com_s_(p.UNIDADE_NOME),
    contatoId: Com_s_(p.CONTATO_ID), contato: Com_s_(p.CONTATO_NOME), responsavelId: Com_s_(p.RESPONSAVEL_ID), responsavel: Com_s_(p.RESPONSAVEL_NOME), titulo: Com_s_(p.TITULO),
    situacao: s, situacaoNome: COM_SITUACOES_PROP[s] || s, validaAte: Com_brDia_(p.VALIDA_ATE), validaAteIso: Com_dia_(p.VALIDA_ATE), validadeDias: Number(p.VALIDADE_DIAS) || 0,
    descontoSituacao: Com_up_(p.DESCONTO_SITUACAO), descontoMotivo: Com_s_(p.DESCONTO_MOTIVO), descontoDecisao: Com_s_(p.DESCONTO_DECISAO_TEXTO), descontoDecisaoPor: Com_s_(p.DESCONTO_DECISAO_POR_NOME),
    geradaEm: Com_br_(p.GERADA_EM), enviadaEm: Com_br_(p.ENVIADA_EM), envioComo: Com_s_(p.ENVIO_COMO), respostaEm: Com_br_(p.RESPOSTA_EM), respostaTexto: Com_s_(p.RESPOSTA_TEXTO),
    motivoRecusa: Com_s_(p.MOTIVO_RECUSA), aceiteNome: Com_s_(p.ACEITE_ARQUIVO_NOME), aceiteId: Com_s_(p.ACEITE_ARQUIVO_ID), pdfId: Com_s_(p.PDF_ID), htmlId: Com_s_(p.HTML_ID),
    pdfUrl: Com_s_(p.PDF_URL), htmlUrl: Com_s_(p.HTML_URL), pastaUrl: Com_s_(p.PASTA_URL), arquivoNome: Com_s_(p.ARQUIVO_NOME),
    pedidoSituacao: Com_up_(p.PEDIDO_SITUACAO), passagem: Com_json_(p.PASSAGEM_JSON, []), canceladaMotivo: Com_s_(p.CANCELADA_MOTIVO), criadaEm: Com_brDia_(p.CRIADO_EM),
    editavel: s === 'RASCUNHO' && (eu.gestao || Com_s_(p.RESPONSAVEL_ID) === eu.id), qtdItens: itens.length
  };
  if (eu.veValores) {
    t.subtotal = Number(p.SUBTOTAL) || 0; t.descontoGeral = Number(p.DESCONTO_GERAL) || 0; t.total = Number(p.TOTAL) || 0; t.descontoPct = Number(p.DESCONTO_PCT) || 0;
    t.totalTxt = Com_moeda_(p.TOTAL); t.subtotalTxt = Com_moeda_(p.SUBTOTAL); t.descontoTxt = Com_moeda_(p.DESCONTO_GERAL); t.descontoPctTxt = Com_pct_(p.DESCONTO_PCT);
  }
  if (eu.veCusto && Com_s_(p.MARGEM_PCT) !== '') { t.margemPct = Number(p.MARGEM_PCT); t.margemTxt = Com_pct_(p.MARGEM_PCT); t.custoTxt = Com_moeda_(p.CUSTO_TOTAL); }
  if (completo) {
    t.escopo = Com_s_(p.ESCOPO); t.apresentacao = Com_s_(p.APRESENTACAO); t.condicoes = Com_json_(p.CONDICOES_JSON, {}); t.modelo = Com_s_(p.MODELO);
    t.itens = itens.map(function (i) {
      var o = { ordem: i.ordem, produtoId: i.produtoId || '', codigo: i.codigo || '', tipo: i.tipo || 'SERVICO', descricao: i.descricao || '', detalhe: i.detalhe || '',
        equipamentoId: i.equipamentoId || '', equipamentoTexto: i.equipamentoTexto || '', unidade: i.unidade || 'un.', quantidade: Number(i.quantidade) || 0 };
      if (eu.veValores) { o.precoUnitario = Number(i.precoUnitario) || 0; o.precoTabela = Number(i.precoTabela) || 0; o.total = Com_r2_((Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0)); }
      if (eu.veCusto && i.custoUnitario !== undefined && i.custoUnitario !== null && i.custoUnitario !== '') o.custoUnitario = Number(i.custoUnitario);
      return o;
    });
    t.revisaoGestora = Com_json_(p.REVISAO_GESTORA_JSON, null);
    if (eu.financeiro || eu.gestao) t.faturamento = ComP_dadosFaturamento_(p);
  }
  return t;
}

/** Dados do cliente para faturar (congelados no documento; senão o cadastro atual). */
function ComP_dadosFaturamento_(p) {
  var c = Com_json_(p.CONGELADO_JSON, null);
  if (c && c.cliente) return { razao: c.cliente.razao, cnpj: c.cliente.cnpj, endereco: c.cliente.endereco, email: c.contato ? c.contato.email : '', pagamento: (Com_json_(p.CONDICOES_JSON, {}) || {}).pagamento || '' };
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  return { razao: Com_s_(cli.RAZAO_SOCIAL), cnpj: Com_s_(cli.CNPJ), endereco: Com_s_(cli.ENDERECO), email: Com_s_(cli.EMAIL), pagamento: (Com_json_(p.CONDICOES_JSON, {}) || {}).pagamento || '' };
}

/** filtro: { situacao ('ABERTAS' padrão | 'TODAS' | código), oportunidadeId, responsavelId, busca } */
function ComP_listar_(eu, filtro) {
  Com_exigir_(eu, 'FINANCEIRO', 'ver as propostas');
  var f = filtro || {}, sit = Com_up_(f.situacao) || (eu.financeiro ? 'APROVADA' : 'ABERTAS'), busca = Com_s_(f.busca).toLowerCase();
  ComP_sincronizarEnvios_();
  var abertas = ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA', 'VENCIDA'];
  return Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) {
    if (!ComP_podeVer_(eu, p)) return false;
    var s = Com_up_(p.SITUACAO);
    if (sit === 'ABERTAS' ? abertas.indexOf(s) < 0 : (sit !== 'TODAS' && s !== sit)) return false;
    if (f.oportunidadeId && Com_s_(p.OPORTUNIDADE_ID) !== Com_s_(f.oportunidadeId)) return false;
    if (f.responsavelId && eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== Com_s_(f.responsavelId)) return false;
    if (busca && (Com_s_(p.NUMERO) + ' ' + Com_s_(p.CLIENTE_NOME) + ' ' + Com_s_(p.TITULO)).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  }).map(function (p) { return ComP_paraTela_(eu, p, false); })
    .sort(function (a, b) { return String(b.numero + b.revisao).localeCompare(String(a.numero + a.revisao)); });
}

function ComP_detalhe_(eu, id) {
  Com_exigir_(eu, 'FINANCEIRO', 'abrir a proposta');
  ComP_sincronizarEnvios_();
  var p = ComP_obter_(eu, id, 'abrir a proposta');
  var t = ComP_paraTela_(eu, p, true);
  var met = Com_metodologia_();
  t.historico = Com_ler_(COM_ABAS.HISTORICO).filter(function (h) { return Com_s_(h.ENTIDADE) === 'PROPOSTA' && Com_s_(h.ENTIDADE_ID) === t.id; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); }).slice(0, 60)
    .map(function (h) { return { em: Com_br_(h.DATA), tipo: Com_s_(h.TIPO), de: Com_s_(h.DE), para: Com_s_(h.PARA), texto: Com_s_(h.TEXTO), por: Com_s_(h.USUARIO_NOME) }; });
  t.revisoes = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.NUMERO) === t.numero && Com_s_(x.ID) !== t.id && ComP_podeVer_(eu, x); })
    .map(function (x) { return { id: Com_s_(x.ID), rotulo: ComP_rotulo_(x), situacaoNome: COM_SITUACOES_PROP[Com_up_(x.SITUACAO)] || '' }; });
  if (eu.veValores) {
    var calc = ComP_calcular_(Com_json_(p.ITENS_JSON, []), p.DESCONTO_GERAL);
    var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID), met);
    t.politica = { limite: pol.limite, limiteTxt: Com_pct_(pol.limite, 0), dentro: pol.dentro, motivos: pol.motivos, descontoPctTxt: Com_pct_(calc.descontoPct) };
  }
  t.podeDecidirDesconto = eu.gestao && t.situacao === 'AGUARDANDO_APROVACAO' && (t.responsavelId !== eu.id || eu.diretoria);
  t.contatosCliente = (eu.gestao || eu.vendedor) ? ComCt_listar_(t.clienteId, t.unidadeId) : [];
  if (t.passagem && t.passagem.length) t.passagem = ComP_situacaoPassagem_(t.passagem);
  t.motivosRecusa = met.motivosPerda;
  return t;
}

// ------------------------------------------------------------
// CRIAÇÃO E RASCUNHO
// ------------------------------------------------------------
/** Itens da tela -> itens gravados (preço de tabela e custo vêm do catálogo; equipamento conferido na unidade). */
function ComP_itensDaTela_(lista, prop, eu) {
  var cat = {};
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { cat[Com_s_(p.ID)] = p; });
  var eqs = {};
  Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { eqs[Com_s_(e.ID)] = e; });
  var anteriores = {};
  Com_json_(prop.ITENS_JSON, []).forEach(function (i) { if (i.produtoId) anteriores[i.produtoId] = i; });
  return (lista || []).slice(0, 80).map(function (i, k) {
    var desc = Com_texto_(i.descricao, 400);
    if (desc.length < 3) throw new Error('Não foi possível salvar a proposta: o item ' + (k + 1) + ' está sem descrição. Escreva o que será fornecido (ou escolha do catálogo)');
    var q = Com_num_(i.quantidade);
    if (!(q > 0)) throw new Error('Não foi possível salvar a proposta: a quantidade do item ' + (k + 1) + ' (' + desc.slice(0, 40) + ') precisa ser maior que zero');
    var pu = Com_num_(i.precoUnitario);
    if (!(pu >= 0)) throw new Error('Não foi possível salvar a proposta: o preço unitário do item ' + (k + 1) + ' (' + desc.slice(0, 40) + ') não é um valor. Use por exemplo 1.250,00');
    var p = i.produtoId ? cat[Com_s_(i.produtoId)] : null;
    var eqId = Com_s_(i.equipamentoId), eqTxt = '';
    if (eqId) {
      var e = eqs[eqId];
      if (!e || Com_s_(e.CLIENTE_ID) !== Com_s_(prop.CLIENTE_ID) || (Com_s_(prop.UNIDADE_ID) && Com_s_(e.UNIDADE_ID) && Com_s_(e.UNIDADE_ID) !== Com_s_(prop.UNIDADE_ID)))
        throw new Error('Não foi possível salvar a proposta: o equipamento do item ' + (k + 1) + ' não é desta unidade do cliente. Escolha um equipamento da unidade ou deixe sem equipamento');
      eqTxt = [Com_s_(e.TIPO), Com_s_(e.TAG) ? 'TAG ' + Com_s_(e.TAG) : '', Com_s_(e.SETOR)].filter(Boolean).join(' · ');
    }
    var ant = p ? anteriores[Com_s_(p.ID)] : null;
    var item = { ordem: k + 1, produtoId: p ? Com_s_(p.ID) : '', codigo: p ? Com_s_(p.CODIGO) : Com_texto_(i.codigo, 40), tipo: COM_TIPOS_ITEM[Com_up_(i.tipo)] ? Com_up_(i.tipo) : (p ? Com_up_(p.TIPO) || 'SERVICO' : 'SERVICO'),
      descricao: desc, detalhe: Com_texto_(i.detalhe, 800), equipamentoId: eqId, equipamentoTexto: eqTxt, unidade: Com_texto_(i.unidade, 20) || (p ? Com_s_(p.UNIDADE_MEDIDA) : '') || 'un.',
      quantidade: q, precoUnitario: Com_r2_(pu),
      precoTabela: p ? (ant && ant.precoTabela !== undefined ? Number(ant.precoTabela) : Number(p.PRECO) || 0) : 0,
      custoUnitario: p && Com_s_(p.CUSTO) !== '' ? (ant && ant.custoUnitario !== undefined ? ant.custoUnitario : Number(p.CUSTO)) : null };
    return item;
  });
}

function ComP_modeloDosItens_(itens) {
  var t = {};
  itens.forEach(function (i) { t[i.tipo === 'PRODUTO' ? 'P' : 'S'] = true; });
  return t.P && t.S ? 'MISTO' : (t.P ? 'PRODUTOS' : 'SERVICOS');
}

/** Nova proposta a partir da oportunidade aberta. d: { oportunidadeId } */
function ComP_nova_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'criar a proposta');
  var met = Com_metodologia_();
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var o = ComOpo_obter_(eu, d && d.oportunidadeId, 'criar a proposta');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível criar a proposta: a oportunidade ' + o.CODIGO + ' está encerrada. Peça a reabertura à gestão comercial');
    var rasc = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(Com_up_(p.SITUACAO)) >= 0; })[0];
    if (rasc) throw new Error('Não foi possível criar outra proposta: a ' + ComP_rotulo_(rasc) + ' desta oportunidade ainda não foi enviada (' + COM_SITUACOES_PROP[Com_up_(rasc.SITUACAO)].toLowerCase() + '). Abra e continue nela');
    var validade = Number(met.proposta.validadeDias) || 15;
    var reg = SGO_DATA.insert(COM_ABAS.PROPOSTAS, {
      NUMERO: Com_proximoNumero_('PROP', COM_ABAS.PROPOSTAS, 'NUMERO'), REVISAO: 0, OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, CLIENTE_NOME: o.CLIENTE_NOME, UNIDADE_ID: o.UNIDADE_ID,
      UNIDADE_NOME: o.UNIDADE_NOME, CONTATO_ID: o.CONTATO_ID, CONTATO_NOME: o.CONTATO_NOME, RESPONSAVEL_ID: o.RESPONSAVEL_ID, RESPONSAVEL_NOME: o.RESPONSAVEL_NOME, MODELO: 'SERVICOS',
      TITULO: Com_s_(o.TITULO), ESCOPO: '', APRESENTACAO: met.proposta.apresentacao, ITENS_JSON: '[]', CONDICOES_JSON: JSON.stringify(met.proposta.condicoes), VALIDADE_DIAS: validade,
      VALIDA_ATE: Com_somarDias_(Com_hoje_(), validade), SUBTOTAL: 0, DESCONTO_GERAL: 0, TOTAL: 0, DESCONTO_PCT: 0, SITUACAO: 'RASCUNHO', DESCONTO_SITUACAO: 'DENTRO', PEDIDO_SITUACAO: '',
      ATUALIZADO_EM: Com_agora_(), CRIADO_POR_ID: eu.id
    });
    Com_historico_('PROPOSTA', reg.ID, 'CRIACAO', eu, { para: 'Rascunho', texto: 'Proposta ' + reg.NUMERO + ' criada para a oportunidade ' + o.CODIGO + '.' });
    return { proposta: ComP_paraTela_(eu, reg, true), message: 'Proposta ' + reg.NUMERO + ' criada como rascunho. Acrescente os itens e o escopo.' };
  });
}

/** Salvar o rascunho. d: { id, titulo, escopo, apresentacao, contatoId, itens[], descontoGeral | descontoPct, validadeDias, condicoes{} } */
function ComP_salvar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'salvar a proposta');
  d = d || {};
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'salvar a proposta');
    if (Com_up_(p.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível salvar: a proposta ' + ComP_rotulo_(p) + ' está "' + COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] + '". Só o rascunho é editado: use "Voltar para rascunho" (antes do envio) ou "Nova revisão" (depois do envio)');
    if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível salvar: a proposta é de ' + p.RESPONSAVEL_NOME);
    var itens = ComP_itensDaTela_(d.itens, p, eu);
    var liquido = itens.reduce(function (s, i) { return s + i.quantidade * i.precoUnitario; }, 0);
    var dg = Com_s_(d.descontoPct) !== '' && Com_s_(d.descontoGeral) === '' ? liquido * (Com_num_(d.descontoPct) || 0) / 100 : Com_num_(d.descontoGeral);
    if (!(dg >= 0)) dg = 0;
    if (dg > liquido) throw new Error('Não foi possível salvar: o desconto geral (' + Com_moeda_(dg) + ') é maior que a soma dos itens (' + Com_moeda_(liquido) + '). Corrija o desconto');
    var calc = ComP_calcular_(itens, dg);
    var val = Com_num_(d.validadeDias);
    if (!(val >= 1 && val <= 365)) val = Number(p.VALIDADE_DIAS) || 15;
    var cond = {};
    var padrao = Com_metodologia_().proposta.condicoes;
    var condAtual = Com_json_(p.CONDICOES_JSON, {}) || {};
    // campo que a tela não mandou fica como estava (salvar nunca apaga o que não veio)
    Object.keys(padrao).concat(['observacoes']).forEach(function (k) { var v = (d.condicoes || {})[k]; cond[k] = v === undefined ? Com_s_(condAtual[k]) : Com_texto_(v, 2000); });
    var ct = Com_s_(d.contatoId) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(d.contatoId)) : null;
    if (Com_s_(d.contatoId) && (!ct || Com_s_(ct.CLIENTE_ID) !== Com_s_(p.CLIENTE_ID))) throw new Error('Não foi possível salvar: o contato escolhido não é deste cliente. Escolha de novo');
    var campos = { TITULO: Com_texto_(d.titulo, 200) || Com_s_(p.TITULO), ESCOPO: d.escopo === undefined ? Com_s_(p.ESCOPO) : Com_texto_(d.escopo, 8000), APRESENTACAO: d.apresentacao === undefined ? Com_s_(p.APRESENTACAO) : Com_texto_(d.apresentacao, 4000), ITENS_JSON: JSON.stringify(itens),
      CONDICOES_JSON: JSON.stringify(cond), VALIDADE_DIAS: val, VALIDA_ATE: Com_somarDias_(Com_hoje_(), val), MODELO: ComP_modeloDosItens_(itens),
      SUBTOTAL: calc.subtotal, DESCONTO_GERAL: calc.descontoGeral, TOTAL: calc.total, DESCONTO_PCT: calc.descontoPct, MARGEM_PCT: calc.margemPct === null ? '' : calc.margemPct, CUSTO_TOTAL: calc.custoTotal,
      ATUALIZADO_EM: Com_agora_() };
    if (ct) { campos.CONTATO_ID = ct.ID; campos.CONTATO_NOME = Com_s_(ct.NOME); }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, 'RASCUNHO', eu, { texto: Com_plural_(itens.length, 'item', 'itens') + '; total ' + Com_moeda_(calc.total) + '; desconto ' + Com_pct_(calc.descontoPct) + '.' });
    var novo = Object.assign({}, p, campos);
    var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID));
    return { proposta: ComP_paraTela_(eu, novo, true), politica: { dentro: pol.dentro, motivos: pol.motivos },
      message: 'Rascunho salvo.' + (pol.dentro ? '' : ' Atenção: ' + pol.motivos.join('; ') + '. Ao concluir, a proposta vai para a aprovação do gestor comercial.') };
  });
}

/**
 * Concluir o rascunho: revisão pela gestora (regras; erros impedem) e política de desconto.
 * d: { id, justificativa (obrigatória quando passa do limite) }
 */
function ComP_concluir_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'concluir a proposta');
  d = d || {};
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'concluir a proposta');
    if (Com_up_(p.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível concluir: a proposta ' + ComP_rotulo_(p) + ' não está em rascunho');
    var rev = typeof ComG_revisarPropostaRegras_ === 'function' ? ComG_revisarPropostaRegras_(p) : { erros: [], alertas: [] };
    if (rev.erros.length) throw new Error('Não foi possível concluir a proposta ' + ComP_rotulo_(p) + '. A revisão encontrou: ' + rev.erros.join('; ') + '. Corrija no rascunho e toque em Concluir de novo');
    var calc = ComP_calcular_(Com_json_(p.ITENS_JSON, []), p.DESCONTO_GERAL);
    var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID));
    var agora = Com_agora_(), campos = { REVISAO_GESTORA_JSON: JSON.stringify({ em: agora, erros: rev.erros, alertas: rev.alertas }), ATUALIZADO_EM: agora };
    var msg;
    if (pol.dentro) {
      campos.SITUACAO = 'PRONTA'; campos.DESCONTO_SITUACAO = 'DENTRO';
      msg = 'Proposta pronta. Toque em "Gerar documento" para salvar a folha A4 na pasta do cliente e depois em "Enviar ao cliente".';
    } else if (eu.gestao && (Com_s_(p.RESPONSAVEL_ID) !== eu.id || eu.diretoria || eu.perfil === 'ADMIN')) {
      var just = Com_texto_(d.justificativa, 1000);
      if (just.length < 10) throw new Error('Não foi possível concluir: ' + pol.motivos.join('; ') + '. Como gestão comercial, você pode passar do limite, mas o motivo da exceção fica registrado. Escreva o motivo (pelo menos 10 letras) e toque em Concluir de novo');
      campos.SITUACAO = 'PRONTA'; campos.DESCONTO_SITUACAO = 'EXCECAO_GESTAO'; campos.DESCONTO_MOTIVO = just; campos.DESCONTO_DECISAO_POR_ID = eu.id; campos.DESCONTO_DECISAO_POR_NOME = eu.nome; campos.DESCONTO_DECISAO_EM = agora; campos.DESCONTO_DECISAO_TEXTO = 'Exceção da gestão comercial: ' + just;
      msg = 'Proposta pronta, com a exceção da gestão registrada.';
    } else {
      var j = Com_texto_(d.justificativa, 1000);
      if (j.length < 10) throw new Error('A proposta tem ' + pol.motivos.join(' e ') + '. Ela pode seguir, mas precisa da aprovação do gestor comercial antes do envio. Escreva por que este desconto é necessário (pelo menos 10 letras, por exemplo "Cliente com 3 propostas de concorrentes; contrato anual") e toque em Concluir de novo');
      campos.SITUACAO = 'AGUARDANDO_APROVACAO'; campos.DESCONTO_SITUACAO = 'PEDIDO'; campos.DESCONTO_MOTIVO = j; campos.DESCONTO_PEDIDO_EM = agora;
      msg = 'Pedido de aprovação enviado à gestão comercial (Caixa de decisões). A proposta não pode ser enviada até a decisão; você é avisado no sistema.';
    }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, campos.SITUACAO, eu, { de: 'Rascunho', para: COM_SITUACOES_PROP[campos.SITUACAO], texto: (pol.dentro ? 'Dentro da política (' + Com_pct_(calc.descontoPct) + ').' : pol.motivos.join('; ') + '. ' + (campos.DESCONTO_MOTIVO || '')) + (rev.alertas.length ? ' Alertas da revisão: ' + rev.alertas.join('; ') : '') });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), alertas: rev.alertas, message: msg };
  });
}

/** Gestão decide o desconto. d: { id, aprovar (bool), texto (>= 10) } */
function ComP_decidirDesconto_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'decidir o desconto');
  d = d || {};
  var texto = Com_texto_(d.texto, 1000);
  if (texto.length < 10) throw new Error('Não foi possível registrar a decisão: escreva a fundamentação (pelo menos 10 letras). Ela fica na proposta e o vendedor recebe o aviso');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'decidir o desconto');
    if (Com_up_(p.SITUACAO) !== 'AGUARDANDO_APROVACAO') throw new Error('Não foi possível decidir: a proposta ' + ComP_rotulo_(p) + ' não está aguardando aprovação (situação: ' + COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] + ')');
    if (Com_s_(p.RESPONSAVEL_ID) === eu.id && !eu.diretoria) throw new Error('Não foi possível decidir: a proposta é sua. Quem decide o seu desconto é outro gestor comercial ou a Diretoria');
    var agora = Com_agora_(), aprovar = d.aprovar === true;
    var campos = { SITUACAO: aprovar ? 'PRONTA' : 'RASCUNHO', DESCONTO_SITUACAO: aprovar ? 'APROVADO' : 'NEGADO', DESCONTO_DECISAO_POR_ID: eu.id, DESCONTO_DECISAO_POR_NOME: eu.nome,
      DESCONTO_DECISAO_EM: agora, DESCONTO_DECISAO_TEXTO: texto, ATUALIZADO_EM: agora };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, aprovar ? 'DESCONTO_APROVADO' : 'DESCONTO_NEGADO', eu, { de: 'Aguardando aprovação', para: aprovar ? 'Pronta para enviar' : 'Rascunho', texto: texto });
    Com_avisar_(p.RESPONSAVEL_ID, aprovar ? 'DESCONTO_APROVADO' : 'DESCONTO_NEGADO', (aprovar ? 'Desconto aprovado: ' : 'Desconto não aprovado: ') + ComP_rotulo_(p),
      eu.nome + (aprovar ? ' aprovou o desconto da proposta. Ela está pronta para gerar o documento e enviar. ' : ' não aprovou o desconto. A proposta voltou para rascunho para ajuste. ') + 'Fundamentação: ' + texto, { tipo: 'proposta', id: p.ID });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), message: aprovar ? 'Desconto aprovado. O vendedor foi avisado.' : 'Desconto não aprovado: a proposta voltou para rascunho e o vendedor foi avisado.' };
  });
}

/** Voltar para rascunho (antes do envio). */
function ComP_voltarRascunho_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'voltar a proposta para rascunho');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d && d.id, 'voltar para rascunho');
    var s = Com_up_(p.SITUACAO);
    if (['AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(s) < 0) throw new Error('Não foi possível voltar para rascunho: a proposta está "' + COM_SITUACOES_PROP[s] + '". Depois do envio, use "Nova revisão"');
    var campos = { SITUACAO: 'RASCUNHO', DESCONTO_SITUACAO: 'DENTRO', DESCONTO_PEDIDO_EM: '', ATUALIZADO_EM: Com_agora_() };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, 'RASCUNHO', eu, { de: COM_SITUACOES_PROP[s], para: 'Rascunho', texto: 'Voltou para rascunho' + (Com_s_(p.PDF_ID) ? ' (o documento gerado antes continua na pasta; ao gerar de novo, sai um arquivo novo)' : '') + '.' });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), message: 'A proposta voltou para rascunho. Ao concluir de novo, a política de desconto é conferida outra vez.' };
  });
}

// ------------------------------------------------------------
// DOCUMENTO E ENVIO
// ------------------------------------------------------------
function ComP_pastaRaiz_() { return SGO_DocSalvar_pastaPersistente_('COM_PASTA_PROPOSTAS_ID', COM_PASTA_PROPOSTAS, ''); }

/** Dados do cliente, da unidade, do contato e do vendedor no momento da geração (ficam na proposta). */
function ComP_congelar_(p) {
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var un = Com_s_(p.UNIDADE_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || {} : {};
  var ct = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) || {} : {};
  var vend = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, Com_s_(p.RESPONSAVEL_ID)) || {};
  var cnpj = Com_s_(un.CNPJ_UNIDADE) || Com_s_(cli.CNPJ);
  return {
    cliente: { razao: Com_s_(cli.RAZAO_SOCIAL) || Com_s_(cli.NOME_FANTASIA), fantasia: Com_s_(cli.NOME_FANTASIA), cnpj: Com_s_(cli.CNPJ), endereco: Com_s_(cli.ENDERECO) },
    unidade: { nome: Com_s_(un.NOME_UNIDADE), cnpj: Com_s_(un.CNPJ_UNIDADE), endereco: Com_s_(un.ENDERECO), cidade: Com_s_(un.CIDADE), uf: Com_s_(un.UF) },
    contato: { nome: Com_s_(ct.NOME), cargo: Com_s_(ct.CARGO), email: Com_s_(ct.EMAIL), telefone: Com_s_(ct.CELULAR) || Com_s_(ct.TELEFONE) },
    vendedor: { nome: Com_s_(vend.NOME) || Com_s_(p.RESPONSAVEL_NOME), email: Com_s_(vend.EMAIL), telefone: Com_s_(vend.CELULAR) },
    pastaCnpj: cnpj, em: Com_agora_()
  };
}

/** Gerar (ou gerar de novo) a folha A4 na pasta do cliente. Só PRONTA. */
function ComP_gerarDocumento_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'gerar o documento da proposta');
  var p = ComP_obter_(eu, d && d.id, 'gerar o documento');
  var s = Com_up_(p.SITUACAO);
  if (s !== 'PRONTA') throw new Error('Não foi possível gerar o documento: a proposta ' + ComP_rotulo_(p) + ' está "' + COM_SITUACOES_PROP[s] + '". ' +
    (s === 'RASCUNHO' ? 'Conclua o rascunho primeiro (botão Concluir).' : s === 'AGUARDANDO_APROVACAO' ? 'Ela aguarda a aprovação do desconto pelo gestor comercial (Caixa de decisões).' : 'Para mudar uma proposta enviada, faça uma nova revisão.'));
  var rev = typeof ComG_revisarPropostaRegras_ === 'function' ? ComG_revisarPropostaRegras_(p) : { erros: [], alertas: [] };
  if (rev.erros.length) throw new Error('Não foi possível gerar o documento: ' + rev.erros.join('; ') + '. Volte para rascunho, corrija e conclua de novo');
  var cong = ComP_congelar_(p);
  var conteudo = { numero: p.NUMERO, revisao: p.REVISAO, itens: Com_json_(p.ITENS_JSON, []), condicoes: Com_json_(p.CONDICOES_JSON, {}), escopo: Com_s_(p.ESCOPO), apresentacao: Com_s_(p.APRESENTACAO),
    total: Number(p.TOTAL), desconto: Number(p.DESCONTO_GERAL), validaAte: Com_dia_(p.VALIDA_ATE), cliente: cong.cliente, unidade: cong.unidade, contato: cong.contato };
  var marca = Com_marca_(JSON.stringify(conteudo));
  var html = ComDoc_propostaHtml_(p, cong, marca);
  var nome = 'Proposta comercial - ' + ComP_rotulo_(p) + ' - ' + (cong.cliente.fantasia || cong.cliente.razao || 'cliente') + ' - ' + Utilities.formatDate(new Date(), COM_FUSO, 'yyyy-MM-dd HHmm');
  var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
  var raiz = ComP_pastaRaiz_();
  var pasta = SGO_DocSalvar_pastaClienteEm_(raiz, cong.pastaCnpj, cong.cliente.razao || Com_s_(p.CLIENTE_NOME));
  var op = { compartilhar: false };
  if (fin.pdfBlob) op.pdfBlob = fin.pdfBlob;
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, op);
  var pastaUrl = '';
  try { pastaUrl = pasta.getUrl(); } catch (e) {}
  return Com_comTrava_(function () {
    var atual = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID);
    if (Com_up_(atual.SITUACAO) !== 'PRONTA') throw new Error('Não foi possível registrar o documento: a proposta mudou de situação enquanto o documento era gerado. Atualize a tela');
    var campos = { CONGELADO_JSON: JSON.stringify(cong), MARCA_CONTEUDO: marca, PDF_ID: g.pdfId, HTML_ID: g.htmlId, PDF_URL: g.pdfUrl, HTML_URL: g.htmlUrl, PASTA_URL: pastaUrl,
      ARQUIVO_NOME: g.pdfNome, GERADA_EM: Com_agora_(), ATUALIZADO_EM: Com_agora_() };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, 'DOCUMENTO', eu, { texto: 'Folha A4 salva na pasta do cliente: ' + g.pdfNome + '. Marca de conferência ' + marca.slice(0, 16) + '.' });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, atual, campos), true), alertas: rev.alertas, pdfId: g.pdfId, htmlId: g.htmlId,
      message: 'Documento salvo na pasta do cliente (PDF e HTML A4). Agora toque em "Enviar ao cliente".' };
  });
}

/** Proposta enviada (pelo Enviar documento ou marcada à mão): situação, etapa da oportunidade e o retorno agendado. Dentro da trava. */
function ComP_aoEnviar_(p, quando, como, eu) {
  var met = Com_metodologia_(), agora = Com_agora_();
  var campos = { SITUACAO: 'ENVIADA', ENVIADA_EM: Com_iso_(quando) || agora, ENVIO_COMO: Com_texto_(como, 300), ATUALIZADO_EM: agora };
  var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
  var quem = eu || { id: 'COMERCIAL', nome: 'Comercial (rotina)' };
  if (o && Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') {
    var oc = { ULTIMO_CONTATO_EM: campos.ENVIADA_EM, ATUALIZADO_EM: agora };
    var f = Com_funil_(Com_s_(o.FUNIL), met), et = Com_etapa_(f, Com_s_(o.ETAPA), met);
    var alvo = f ? f.etapas.filter(function (e) { return Number(e.probabilidade) >= 60; })[0] : null;
    if (alvo && et && Number(et.probabilidade) < Number(alvo.probabilidade)) { oc.ETAPA = alvo.codigo; oc.ETAPA_DESDE = agora; Com_historico_('OPORTUNIDADE', o.ID, 'ETAPA', quem, { de: et.nome, para: alvo.nome, texto: 'Proposta ' + ComP_rotulo_(p) + ' enviada: a oportunidade foi para a etapa ' + alvo.nome + '.' }); }
    var dias = Number(met.cadencia.propostaLembreteDiaUtil) || 2;
    var prazo = Com_somarDiasUteis_(campos.ENVIADA_EM.slice(0, 10), dias) + 'T10:00';
    if (prazo < agora) prazo = Com_somarDiasUteis_(Com_hoje_(), 1) + 'T10:00';
    try {
      if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Proposta ' + ComP_rotulo_(p) + ' enviada ao cliente; o próximo passo é o retorno sobre a proposta.');
      var atv = Com_criarAtividade_({ comoPessoa: eu || null, responsavelId: Com_s_(o.RESPONSAVEL_ID), titulo: 'Retorno sobre a proposta ' + ComP_rotulo_(p) + ': ' + Com_s_(o.CLIENTE_NOME),
        descricao: 'Ligue para o cliente e combine a data de decisão da proposta ' + ComP_rotulo_(p) + ' (enviada em ' + Com_br_(campos.ENVIADA_EM) + ').\nRegistre o contato na oportunidade ' + o.CODIGO + ' (Comercial > Oportunidades).',
        prazo: prazo, clienteId: Com_s_(o.CLIENTE_ID), unidadeId: Com_s_(o.UNIDADE_ID), porQue: 'Regra do Comercial: toda proposta enviada tem retorno agendado. Enviar a proposta e sumir costuma ser venda perdida.',
        onde: 'Comercial > Oportunidades > ' + o.CODIGO, como: 'Ligação ou mensagem ao contato; pergunte se ficou dúvida técnica, de prazo ou de condição.', restrita: true });
      campos.RETORNO_ATIVIDADE_ID = atv;
      oc.ATIVIDADE_ID = atv; oc.PROXIMA_ACAO = 'Retorno sobre a proposta ' + ComP_rotulo_(p); oc.PROXIMA_ACAO_TIPO = 'LIGACAO'; oc.PROXIMA_ACAO_EM = prazo;
    } catch (e) { console.error('Comercial, retorno da proposta: ' + ((e && e.message) || e)); }
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, oc);
    SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: 'EMAIL', RESPONDEU: 'NAO', RESUMO: 'Proposta ' + ComP_rotulo_(p) + ' enviada (' + Com_texto_(como, 200) + ').',
      CONTATO_ID: Com_s_(p.CONTATO_ID), CONTATO_NOME: Com_s_(p.CONTATO_NOME), USUARIO_ID: quem.id, USUARIO_NOME: quem.nome, DATA: campos.ENVIADA_EM });
  }
  SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
  Com_historico_('PROPOSTA', p.ID, 'ENVIADA', quem, { de: 'Pronta para enviar', para: 'Enviada ao cliente', texto: Com_texto_(como, 300) });
  return campos;
}

/**
 * Envios registrados pelo "Enviar documento" (DOC_ENVIOS) viram "Enviada" (o PDF da proposta foi para o cliente).
 * Leve: só lê quando há proposta pronta com documento. Nunca lança.
 */
function ComP_sincronizarEnvios_() {
  try {
    var prontas = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_up_(p.SITUACAO) === 'PRONTA' && Com_s_(p.PDF_ID); });
    if (!prontas.length) return 0;
    var envios = Com_ler_(typeof ENVDOC_ABA !== 'undefined' ? ENVDOC_ABA : 'DOC_ENVIOS').filter(function (r) { return Com_up_(r.SITUACAO) === 'ENVIADO'; });
    if (!envios.length) return 0;
    var n = 0;
    prontas.forEach(function (p) {
      var es = envios.filter(function (r) { return Com_s_(r.ARQUIVO_ID) === Com_s_(p.PDF_ID) || Com_s_(r.ARQUIVO_ID) === Com_s_(p.HTML_ID); })
        .sort(function (a, b) { return String(a.QUANDO).localeCompare(String(b.QUANDO)); });
      if (!es.length) return;
      var e = es[0];
      if (Com_iso_(e.QUANDO) && Com_s_(p.GERADA_EM) && Com_iso_(e.QUANDO) < Com_iso_(p.GERADA_EM).slice(0, 16)) return;
      Com_comTrava_(function () {
        var atual = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p.ID);
        if (Com_up_(atual.SITUACAO) !== 'PRONTA') return;
        ComP_aoEnviar_(atual, e.QUANDO, (Com_up_(e.CANAL) === 'WHATSAPP' ? 'WhatsApp para ' : 'E-mail para ') + Com_s_(e.DESTINO_NOME || e.DESTINO) + ' por ' + Com_s_(e.USUARIO_NOME), { id: Com_s_(e.USUARIO_ID), nome: Com_s_(e.USUARIO_NOME) });
        n++;
      });
    });
    return n;
  } catch (e) { console.error('Comercial, envios: ' + ((e && e.message) || e)); return 0; }
}

/** Marcar como enviada à mão (entregue em mãos, enviada por outro meio). d: { id, como (>= 10 letras) } */
function ComP_marcarEnviada_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'marcar a proposta como enviada');
  var como = Com_texto_(d && d.como, 300);
  if (como.length < 10) throw new Error('Não foi possível marcar como enviada: escreva como a proposta chegou ao cliente (pelo menos 10 letras), por exemplo "Entregue em mãos na reunião com a coordenação da CME". O caminho normal é o botão "Enviar ao cliente", que registra sozinho');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'marcar como enviada');
    if (Com_up_(p.SITUACAO) !== 'PRONTA') throw new Error('Não foi possível marcar como enviada: a proposta está "' + COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] + '"');
    if (!Com_s_(p.PDF_ID)) throw new Error('Não foi possível marcar como enviada: gere o documento primeiro (botão "Gerar documento"). O cliente precisa receber a folha numerada que fica guardada na pasta dele');
    var c = ComP_aoEnviar_(p, Com_agora_(), 'Marcada à mão: ' + como, eu);
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, c), true), message: 'Proposta marcada como enviada. O retorno ao cliente está em Minhas atividades.' };
  });
}

/** Nova revisão (mesmo número). */
function ComP_novaRevisao_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'fazer nova revisão');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d && d.id, 'fazer nova revisão');
    var s = Com_up_(p.SITUACAO);
    if (['ENVIADA', 'RECUSADA', 'VENCIDA', 'PRONTA', 'AGUARDANDO_APROVACAO'].indexOf(s) < 0) throw new Error('Não foi possível fazer nova revisão: a proposta está "' + COM_SITUACOES_PROP[s] + '"' + (s === 'RASCUNHO' ? '; edite o rascunho' : ''));
    var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
    if (!o || Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível fazer nova revisão: a oportunidade está encerrada. Peça a reabertura à gestão comercial');
    var outra = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.NUMERO) === Com_s_(p.NUMERO) && Com_up_(x.SITUACAO) === 'RASCUNHO'; })[0];
    if (outra) throw new Error('Não foi possível: já existe a ' + ComP_rotulo_(outra) + ' em rascunho. Continue nela');
    var maior = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.NUMERO) === Com_s_(p.NUMERO); }).reduce(function (m, x) { return Math.max(m, Number(x.REVISAO) || 0); }, 0);
    var met = Com_metodologia_(), val = Number(p.VALIDADE_DIAS) || Number(met.proposta.validadeDias) || 15, agora = Com_agora_();
    var copia = {};
    ['NUMERO', 'OPORTUNIDADE_ID', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'CONTATO_ID', 'CONTATO_NOME', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'MODELO', 'TITULO', 'ESCOPO', 'APRESENTACAO',
      'ITENS_JSON', 'CONDICOES_JSON', 'VALIDADE_DIAS', 'SUBTOTAL', 'DESCONTO_GERAL', 'TOTAL', 'DESCONTO_PCT', 'MARGEM_PCT', 'CUSTO_TOTAL'].forEach(function (k) { copia[k] = p[k]; });
    copia.REVISAO = maior + 1; copia.SITUACAO = 'RASCUNHO'; copia.DESCONTO_SITUACAO = 'DENTRO'; copia.VALIDA_ATE = Com_somarDias_(Com_hoje_(), val); copia.REVISAO_DE = p.ID; copia.PEDIDO_SITUACAO = '';
    copia.ATUALIZADO_EM = agora; copia.CRIADO_POR_ID = eu.id;
    var nova = SGO_DATA.insert(COM_ABAS.PROPOSTAS, copia);
    var antiga = { SUBSTITUIDA_POR: nova.ID, ATUALIZADO_EM: agora };
    if (s !== 'RECUSADA') antiga.SITUACAO = 'SUBSTITUIDA';
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, antiga);
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Concluída', 'A proposta foi substituída pela ' + ComP_rotulo_(nova) + '.');
    Com_historico_('PROPOSTA', p.ID, 'SUBSTITUIDA', eu, { de: COM_SITUACOES_PROP[s], para: s === 'RECUSADA' ? 'Recusada' : 'Substituída', texto: 'Nova revisão: ' + ComP_rotulo_(nova) + '.' });
    Com_historico_('PROPOSTA', nova.ID, 'CRIACAO', eu, { para: 'Rascunho', texto: 'Revisão criada a partir da ' + ComP_rotulo_(p) + '.' });
    return { proposta: ComP_paraTela_(eu, nova, true), message: 'Revisão ' + ComP_rotulo_(nova) + ' criada como rascunho. A anterior ficou marcada como substituída.' };
  });
}

function ComP_cancelar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'cancelar a proposta');
  var motivo = Com_texto_(d && d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (pelo menos 10 letras). A proposta fica no histórico');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'cancelar');
    var s = Com_up_(p.SITUACAO);
    if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA', 'VENCIDA'].indexOf(s) < 0) throw new Error('Não foi possível cancelar: a proposta está "' + COM_SITUACOES_PROP[s] + '"');
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'CANCELADA', CANCELADA_MOTIVO: motivo, ATUALIZADO_EM: Com_agora_() });
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Cancelada', 'Proposta cancelada: ' + motivo);
    Com_historico_('PROPOSTA', p.ID, 'CANCELADA', eu, { de: COM_SITUACOES_PROP[s], para: 'Cancelada', texto: motivo });
    return { message: 'Proposta cancelada. Ela continua no histórico da oportunidade.' };
  });
}

// ------------------------------------------------------------
// RESPOSTA DO CLIENTE
// ------------------------------------------------------------
/**
 * Registrar a resposta. d: { id, resposta: 'APROVADA'|'RECUSADA', texto, motivo (recusa), data, marcarGanha (padrão true),
 *   arquivo: { nome, tipo, base64 } (obrigatório na aprovação) }
 */
function ComP_registrarResposta_(eu, sessionId, d) {
  Com_exigir_(eu, 'VENDEDOR', 'registrar a resposta do cliente');
  d = d || {};
  var resp = Com_up_(d.resposta);
  if (resp !== 'APROVADA' && resp !== 'RECUSADA') throw new Error('Não foi possível registrar: escolha se o cliente aprovou ou recusou');
  var texto = Com_texto_(d.texto, 2000);
  var met = Com_metodologia_();
  if (resp === 'RECUSADA') {
    if (met.motivosPerda.indexOf(Com_s_(d.motivo)) < 0) throw new Error('Não foi possível registrar a recusa: escolha o motivo na lista. Ele alimenta o relatório de perdas');
    if (texto.length < 10) throw new Error('Não foi possível registrar a recusa: escreva o que o cliente disse (pelo menos 10 letras)');
  }
  var arq = d.arquivo || null;
  if (resp === 'APROVADA') {
    if (!arq || !Com_s_(arq.base64) || !Com_s_(arq.nome)) throw new Error('Não foi possível registrar a aprovação: anexe o arquivo do aceite do cliente (o e-mail de aprovação salvo em PDF, o pedido de compra ou a proposta assinada). Ele fica guardado na pasta do cliente e é a prova do pedido');
    if (String(arq.base64).length > 14 * 1024 * 1024) throw new Error('Não foi possível registrar a aprovação: o arquivo do aceite passa de 10 MB. Salve em PDF com tamanho menor e anexe de novo');
    if (!/\.(pdf|png|jpe?g|eml|msg|txt|docx?)$/i.test(Com_s_(arq.nome))) throw new Error('Não foi possível registrar a aprovação: o aceite precisa ser PDF, imagem (PNG ou JPG), e-mail (EML ou MSG), texto ou Word');
  }
  var p0 = ComP_obter_(eu, d.id, 'registrar a resposta');
  var s0 = Com_up_(p0.SITUACAO);
  if (s0 !== 'ENVIADA' && s0 !== 'VENCIDA') throw new Error('Não foi possível registrar a resposta: a proposta está "' + COM_SITUACOES_PROP[s0] + '". A resposta do cliente se registra em proposta enviada (ou vencida)');
  var salvo = null;
  if (resp === 'APROVADA') {
    var cong = Com_json_(p0.CONGELADO_JSON, {}) || {};
    var pastaCli = SGO_DocSalvar_pastaClienteEm_(ComP_pastaRaiz_(), cong.pastaCnpj || '', (cong.cliente && cong.cliente.razao) || Com_s_(p0.CLIENTE_NOME));
    var sub = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(pastaCli, 'Aceites') : pastaCli;
    var nomeArq = SGO_DocSalvar_sanitizarNome_('Aceite - ' + ComP_rotulo_(p0) + ' - ' + Com_s_(arq.nome));
    var blob = Utilities.newBlob(Utilities.base64Decode(String(arq.base64).replace(/^data:[^,]+,/, '')), Com_s_(arq.tipo) || 'application/octet-stream', nomeArq);
    var f = sub.createFile(blob);
    salvo = { id: f.getId(), nome: f.getName(), url: f.getUrl() };
  }
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p0.ID);
    if (Com_up_(p.SITUACAO) !== s0) throw new Error('Não foi possível registrar: a proposta mudou de situação. Atualize a tela');
    var agora = Com_agora_(), quando = Com_dia_(d.data) ? Com_dia_(d.data) + agora.slice(10) : agora;
    var campos = { SITUACAO: resp, RESPOSTA_EM: quando, RESPOSTA_POR_NOME: eu.nome, RESPOSTA_TEXTO: texto, ATUALIZADO_EM: agora };
    if (resp === 'RECUSADA') campos.MOTIVO_RECUSA = Com_s_(d.motivo);
    if (salvo) { campos.ACEITE_ARQUIVO_ID = salvo.id; campos.ACEITE_ARQUIVO_NOME = salvo.nome; campos.ACEITE_ARQUIVO_URL = salvo.url; campos.PEDIDO_SITUACAO = 'SEM_PASSAGEM'; }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Concluída', 'Cliente ' + (resp === 'APROVADA' ? 'aprovou' : 'recusou') + ' a proposta.');
    Com_historico_('PROPOSTA', p.ID, resp, eu, { de: COM_SITUACOES_PROP[s0], para: COM_SITUACOES_PROP[resp], texto: (resp === 'RECUSADA' ? Com_s_(d.motivo) + '. ' : '') + texto + (salvo ? ' Aceite: ' + salvo.nome + '.' : '') });
    var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
    if (o) {
      SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: 'EMAIL', RESPONDEU: 'SIM', RESUMO: 'Cliente ' + (resp === 'APROVADA' ? 'aprovou' : 'recusou') + ' a proposta ' + ComP_rotulo_(p) + '. ' + texto,
        CONTATO_ID: Com_s_(p.CONTATO_ID), CONTATO_NOME: Com_s_(p.CONTATO_NOME), USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: quando });
      SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ULTIMO_CONTATO_EM: quando, TENTATIVAS_SEM_RESPOSTA: 0, ATUALIZADO_EM: agora });
    }
    var ganhou = false, aviso = '';
    if (resp === 'APROVADA' && o && Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA' && d.marcarGanha !== false) {
      if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Proposta aprovada pelo cliente.');
      SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { SITUACAO: 'GANHA', GANHA_EM: agora, PROXIMA_ACAO: 'Passar o pedido aprovado aos setores', ATUALIZADO_EM: agora });
      Com_historico_('OPORTUNIDADE', o.ID, 'GANHA', eu, { de: 'Aberta', para: 'Ganha', texto: 'Cliente aprovou a proposta ' + ComP_rotulo_(p) + '.' });
      ganhou = true;
    }
    if (resp === 'RECUSADA' && o && Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') {
      try {
        var prazo = Com_somarDiasUteis_(Com_hoje_(), 1) + 'T10:00';
        if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Cliente recusou a proposta.');
        var atv = Com_criarAtividade_({ comoPessoa: eu, responsavelId: Com_s_(o.RESPONSAVEL_ID), titulo: 'Decidir após a recusa da proposta ' + ComP_rotulo_(p) + ': ' + Com_s_(o.CLIENTE_NOME),
          descricao: 'O cliente recusou (' + Com_s_(d.motivo) + '). Entenda a recusa e decida: nova revisão da proposta ou registrar a perda na oportunidade ' + o.CODIGO + '.', prazo: prazo,
          clienteId: Com_s_(o.CLIENTE_ID), unidadeId: Com_s_(o.UNIDADE_ID), porQue: 'Toda recusa tem um próximo passo: revisar ou encerrar com o motivo real.', onde: 'Comercial > Oportunidades > ' + o.CODIGO, restrita: true });
        SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ATIVIDADE_ID: atv, PROXIMA_ACAO: 'Decidir após a recusa: nova revisão ou perda', PROXIMA_ACAO_TIPO: 'LIGACAO', PROXIMA_ACAO_EM: prazo });
      } catch (e) { aviso = ' Não foi possível criar a atividade de decisão: ' + String((e && e.message) || e) + '.'; }
    }
    var titulo = (resp === 'APROVADA' ? 'Cliente aprovou a proposta ' : 'Cliente recusou a proposta ') + ComP_rotulo_(p);
    var txt = Com_s_(p.CLIENTE_NOME) + ': ' + (resp === 'APROVADA' ? 'aprovada. ' + (ganhou ? 'A oportunidade foi marcada como ganha. ' : '') + 'Próximo passo: passar o pedido aos setores.' : 'recusada (' + Com_s_(d.motivo) + ').') + ' Registrado por ' + eu.nome + '.';
    var avisar = Com_idsGestaoComercial_([eu.id]);
    if (Com_s_(p.RESPONSAVEL_ID) !== eu.id) avisar.push(Com_s_(p.RESPONSAVEL_ID));
    avisar.forEach(function (uid) { Com_avisar_(uid, 'RESPOSTA_' + resp, titulo, txt, { tipo: 'proposta', id: p.ID }, { email: true }); });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), ganhou: ganhou,
      message: (resp === 'APROVADA' ? 'Aprovação registrada' + (ganhou ? ' e oportunidade ganha' : '') + '. Agora toque em "Passar aos setores".' : 'Recusa registrada. A decisão (nova revisão ou perda) está em Minhas atividades para amanhã.') + aviso };
  });
}

// ------------------------------------------------------------
// PASSAGEM AOS SETORES
// ------------------------------------------------------------
/** Setores obrigatórios pelos itens: serviço ou contrato -> Área técnica; produto -> Compras; Financeiro sempre. */
function ComP_setoresObrigatorios_(p) {
  var s = { FINANCEIRO: true };
  Com_json_(p.ITENS_JSON, []).forEach(function (i) { if (i.tipo === 'PRODUTO') s.COMPRAS = true; else s.TECNICA = true; });
  return Object.keys(s);
}

/** Quem recebe no setor: o escolhido, o configurado, o gestor da área (Caixa de decisões) ou Gestor da área; sem ninguém, a Diretoria. */
function ComP_responsavelSetor_(setor, escolhido, met) {
  var us = Com_usuarios_();
  if (escolhido && us[escolhido] && us[escolhido].ativo) return { id: escolhido, nome: us[escolhido].nome, motivo: 'escolhido por quem passou o pedido' };
  var conf = ((met.posVenda.destinatarios || {})[setor] || []).filter(function (id) { return us[id] && us[id].ativo; });
  if (conf.length) return { id: conf[0], nome: us[conf[0]].nome, motivo: 'responsável configurado para o setor' };
  var area = (met.posVenda.areaDoSetor || {})[setor] || setor;
  var areas = [area];
  if (setor === 'COMPRAS') areas.push('ADMINISTRATIVO');
  for (var k = 0; k < areas.length; k++) {
    var g = [];
    try { g = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {})[areas[k]] || []; } catch (e) { g = []; }
    g = g.filter(function (id) { return us[id] && us[id].ativo; });
    if (g.length) return { id: g[0], nome: us[g[0]].nome, motivo: 'gestor da área na Caixa de decisões' };
    var gs = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === areas[k]; });
    if (gs.length) return { id: gs[0], nome: us[gs[0]].nome, motivo: 'gestor da área no cadastro' };
    if (setor === 'FINANCEIRO') { var fi = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'FINANCEIRO'; }); if (fi.length) return { id: fi[0], nome: us[fi[0]].nome, motivo: 'perfil Financeiro' }; }
  }
  var dir = Com_idsGestaoComercial_([]).filter(function (id) { return us[id] && (us[id].perfil === 'DIRETORIA' || us[id].perfil === 'ADMIN'); });
  var d = dir.length ? dir[0] : Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'DIRETORIA'; })[0];
  if (d) return { id: d, nome: us[d].nome, motivo: 'setor sem responsável: Diretoria' };
  throw new Error('não há responsável para o setor ' + COM_SETORES[setor] + '. Configure em Comercial > Metodologia > Pós-venda (ou o gestor da área na Caixa de decisões) e tente de novo');
}

/** Opções da janela "Passar aos setores": setores obrigatórios, sugestão de responsável e a equipe. */
function ComP_opcoesPassagem_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'passar o pedido aos setores');
  var p = ComP_obter_(eu, d && d.id, 'passar aos setores');
  var met = Com_metodologia_(), obrig = ComP_setoresObrigatorios_(p);
  var setores = Object.keys(COM_SETORES).map(function (s) {
    var r = null; try { r = ComP_responsavelSetor_(s, '', met); } catch (e) { r = null; }
    return { codigo: s, nome: COM_SETORES[s], obrigatorio: obrigatorio(s), prazoDiasUteis: met.posVenda[s].prazoDiasUteis, checklist: met.posVenda[s].checklist, sugerido: r };
  });
  function obrigatorio(s) { return obrig.indexOf(s) >= 0; }
  var usP = Com_usuarios_();
  var equipe = Object.keys(usP).map(function (id) { var u = usP[id]; return u.ativo ? { id: id, nome: u.nome } : null; }).filter(Boolean).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  return { setores: setores, equipe: equipe };
}

/**
 * Pedido aprovado vira atividades para os setores. d: { id, setores: [...], responsaveis: { SETOR: uid }, observacao }
 * Sem valores nas atividades. A atividade da Área técnica vai para o Kanban do Cronograma de execução.
 */
function ComP_passarSetores_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'passar o pedido aos setores');
  d = d || {};
  var met = Com_metodologia_();
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'passar aos setores');
    if (Com_up_(p.SITUACAO) !== 'APROVADA') throw new Error('Não foi possível passar aos setores: só pedido aprovado pelo cliente (registre a aprovação com o aceite primeiro)');
    var ja = Com_json_(p.PASSAGEM_JSON, []), jaSet = ja.map(function (x) { return x.setor; });
    var obrig = ComP_setoresObrigatorios_(p);
    var pedidos = (Array.isArray(d.setores) ? d.setores : []).map(Com_up_).filter(function (s) { return COM_SETORES[s]; });
    obrig.forEach(function (s) { if (pedidos.indexOf(s) < 0 && jaSet.indexOf(s) < 0) pedidos.push(s); });
    pedidos = pedidos.filter(function (s, i, l) { return l.indexOf(s) === i && jaSet.indexOf(s) < 0; });
    if (!pedidos.length) throw new Error('Não foi possível passar: os setores escolhidos já receberam este pedido. Acompanhe o andamento na proposta');
    var obs = Com_texto_(d.observacao, 1500);
    var itensTxt = Com_json_(p.ITENS_JSON, []).map(function (i) { return '- ' + i.quantidade + ' ' + (i.unidade || 'un.') + ' · ' + i.descricao + (i.equipamentoTexto ? ' (' + i.equipamentoTexto + ')' : ''); }).join('\n');
    var cond = Com_json_(p.CONDICOES_JSON, {}) || {};
    var hoje = Com_hoje_(), novos = [];
    pedidos.forEach(function (s) {
      var cfgS = met.posVenda[s] || {}, r = ComP_responsavelSetor_(s, Com_s_((d.responsaveis || {})[s]), met);
      var prazo = Com_somarDiasUteis_(hoje, Number(cfgS.prazoDiasUteis) || 2) + 'T17:00';
      var desc = 'Pedido aprovado ' + ComP_rotulo_(p) + ' de ' + Com_s_(p.CLIENTE_NOME) + (Com_s_(p.UNIDADE_NOME) ? ' (' + Com_s_(p.UNIDADE_NOME) + ')' : '') + '. Vendedor: ' + Com_s_(p.RESPONSAVEL_NOME) + '.\n\n' +
        'Lista de conferência:\n' + (cfgS.checklist || []).map(function (c) { return '[ ] ' + c; }).join('\n') + '\n\nItens do pedido:\n' + itensTxt +
        (s === 'TECNICA' && cond.prazoExecucao ? '\n\nPrazo de execução combinado: ' + cond.prazoExecucao : '') +
        (s === 'FINANCEIRO' ? '\n\nValor, condição de pagamento e dados de faturamento: Comercial > Pedidos aprovados > ' + ComP_rotulo_(p) + '.' : '') +
        (obs ? '\n\nObservação do vendedor: ' + obs : '') + '\n\nAo concluir, conte o que foi feito (número da O.S., do pedido de compra ou da nota fiscal).';
      var atv = Com_criarAtividade_({ responsavelId: r.id, titulo: 'Pedido aprovado ' + ComP_rotulo_(p) + ' · ' + COM_SETORES[s] + ': ' + Com_s_(p.CLIENTE_NOME), descricao: desc, prazo: prazo, prioridade: 'Alta',
        modulo: cfgS.modulo || 'comercial', moduloNome: cfgS.modulo === 'cronograma_execucao' ? 'Cronograma de execução' : 'Comercial', clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID),
        porQue: 'Pedido aprovado pelo cliente: o setor ' + COM_SETORES[s] + ' executa a sua parte.', onde: s === 'TECNICA' ? 'Cronograma de execução e Minhas atividades' : 'Minhas atividades',
        como: (cfgS.checklist || []).join('; '), restrita: s !== 'TECNICA' });
      // 21/10/2026: Compras nativo: o pedido aprovado também abre a requisição de compra com os produtos, sem o valor de venda (SGO_Compras_Pedido.js).
      if (s === 'COMPRAS' && typeof Compras_doPedidoComercial_ === 'function') { try { Compras_doPedidoComercial_(p, { setorResponsavelId: r.id, atividadeId: atv }); } catch (eCmp) { console.error('Comercial -> Compras: ' + ((eCmp && eCmp.message) || eCmp)); } }
      novos.push({ setor: s, setorNome: COM_SETORES[s], responsavelId: r.id, responsavelNome: r.nome, motivo: r.motivo, atividadeId: atv, prazo: prazo, avisadoConclusao: false });
    });
    var passagem = ja.concat(novos), agora = Com_agora_();
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { PEDIDO_SITUACAO: 'EM_ANDAMENTO', PASSAGEM_EM: Com_s_(p.PASSAGEM_EM) || agora, PASSAGEM_JSON: JSON.stringify(passagem), ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'PASSAGEM', eu, { texto: novos.map(function (n) { return n.setorNome + ': ' + n.responsavelNome + ' até ' + Com_br_(n.prazo); }).join('; ') + (obs ? '. Observação: ' + obs : '') });
    return { message: 'Pedido passado aos setores: ' + novos.map(function (n) { return n.setorNome + ' (' + n.responsavelNome + ')'; }).join(', ') + '. Cada um recebeu a atividade com prazo; você é avisado quando concluírem.', passagem: ComP_situacaoPassagem_(passagem) };
  });
}

/** Andamento de cada setor (pela atividade). */
function ComP_situacaoPassagem_(passagem) {
  return (passagem || []).map(function (x) {
    var a = Com_atividade_(x.atividadeId);
    return { setor: x.setor, setorNome: x.setorNome, responsavel: x.responsavelNome, prazo: Com_br_(x.prazo), atividadeId: x.atividadeId,
      situacao: a ? Com_s_(a.SITUACAO) : 'Atividade não encontrada', concluidaEm: a ? Com_br_(a.CONCLUIDA_EM) : '', obs: a ? Com_s_(a.OBS_CONCLUSAO) : '' };
  });
}

/** Rotina: setor concluiu -> aviso ao vendedor; todos concluídos -> pedido concluído. Nunca lança. */
function ComP_acompanharPassagens_() {
  var n = 0;
  try {
    Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) {
      if (Com_up_(p.PEDIDO_SITUACAO) !== 'EM_ANDAMENTO') return;
      var l = Com_json_(p.PASSAGEM_JSON, []), mudou = false, todas = l.length > 0;
      l.forEach(function (x) {
        var a = Com_atividade_(x.atividadeId);
        var concl = a && a.SITUACAO === 'Concluída';
        if (!concl) todas = false;
        if (concl && !x.avisadoConclusao) {
          Com_avisar_(p.RESPONSAVEL_ID, 'SETOR_CONCLUIU', x.setorNome + ' concluiu o pedido ' + ComP_rotulo_(p), x.responsavelNome + ' concluiu a parte do setor ' + x.setorNome + ' (' + Com_s_(p.CLIENTE_NOME) + ')' + (Com_s_(a.OBS_CONCLUSAO) ? ': ' + Com_s_(a.OBS_CONCLUSAO).slice(0, 300) : '.'), { tipo: 'proposta', id: p.ID });
          x.avisadoConclusao = true; mudou = true;
        }
      });
      if (mudou || todas) {
        var c = { PASSAGEM_JSON: JSON.stringify(l), ATUALIZADO_EM: Com_agora_() };
        if (todas) { c.PEDIDO_SITUACAO = 'CONCLUIDO'; c.PASSAGEM_CONCLUIDA_EM = Com_agora_(); Com_historico_('PROPOSTA', p.ID, 'PEDIDO_CONCLUIDO', { id: 'COMERCIAL', nome: 'Comercial (rotina)' }, { texto: 'Todos os setores concluíram.' }); }
        SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, c);
        n++;
      }
    });
  } catch (e) { console.error('Comercial, passagens: ' + ((e && e.message) || e)); }
  return n;
}

/** Rotina: enviada com validade passada -> vencida; vencendo em N dias -> atividade "confirmar decisão" (uma vez). */
function ComP_rotinaValidade_() {
  var met = Com_metodologia_(), hoje = Com_hoje_(), r = { vencidas: 0, avisadas: 0 };
  Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) {
    if (Com_up_(p.SITUACAO) !== 'ENVIADA') return;
    var ate = Com_dia_(p.VALIDA_ATE);
    if (!ate) return;
    if (ate < hoje) {
      Com_comTrava_(function () {
        SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'VENCIDA', ATUALIZADO_EM: Com_agora_() });
        Com_historico_('PROPOSTA', p.ID, 'VENCIDA', { id: 'COMERCIAL', nome: 'Comercial (rotina)' }, { de: 'Enviada ao cliente', para: 'Vencida sem resposta', texto: 'Validade até ' + Com_brDia_(ate) + ' sem resposta registrada.' });
      });
      r.vencidas++;
      return;
    }
    var falta = Com_diasEntre_(hoje, ate);
    if (falta <= (Number(met.cadencia.propostaVencendoDias) || 3) && !Com_s_(p.VENCIMENTO_AVISADO_EM)) {
      try {
        Com_criarAtividade_({ responsavelId: Com_s_(p.RESPONSAVEL_ID), titulo: 'Proposta ' + ComP_rotulo_(p) + ' vence em ' + Com_brDia_(ate) + ': ' + Com_s_(p.CLIENTE_NOME),
          descricao: 'Confirme a decisão do cliente ou renove a validade com uma nova revisão. Se não houver mais interesse, registre a perda com o motivo real.', prazo: hoje + 'T17:00',
          clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID), porQue: 'A proposta está perto de vencer sem resposta do cliente.', onde: 'Comercial > Propostas > ' + ComP_rotulo_(p), restrita: true });
      } catch (e) { console.error('Comercial, aviso de validade: ' + ((e && e.message) || e)); }
      SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { VENCIMENTO_AVISADO_EM: Com_agora_() });
      r.avisadas++;
    }
  });
  return r;
}

/** Pedidos aprovados (Financeiro, vendedor dono e gestão). */
function ComP_pedidos_(eu, filtro) {
  Com_exigir_(eu, 'FINANCEIRO', 'ver os pedidos aprovados');
  var f = filtro || {};
  return Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) {
    return Com_up_(p.SITUACAO) === 'APROVADA' && ComP_podeVer_(eu, p) && (!f.situacao || Com_up_(p.PEDIDO_SITUACAO) === Com_up_(f.situacao));
  }).map(function (p) {
    var t = ComP_paraTela_(eu, p, false);
    t.faturamento = ComP_dadosFaturamento_(p);
    t.passagem = ComP_situacaoPassagem_(Com_json_(p.PASSAGEM_JSON, []));
    return t;
  }).sort(function (a, b) { return String(b.respostaEm.split(' ')[0].split('/').reverse().join('')).localeCompare(String(a.respostaEm.split(' ')[0].split('/').reverse().join(''))); });
}
