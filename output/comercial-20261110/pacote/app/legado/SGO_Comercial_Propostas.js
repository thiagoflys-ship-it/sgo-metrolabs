/****************************************************
 * COMERCIAL — CATÁLOGO, PROPOSTA, RESPOSTA DO CLIENTE E PASSAGEM AOS SETORES (21/10/2026)
 *
 * Catálogo (COM_PRODUTOS): começa vazio; a gestão cadastra (código, nome, tipo, unidade, preço; custo opcional,
 * visto só pela gestão). Item arquivado sai da escolha, nunca do banco.
 * 29/10/2026 (pedido do dono): o vendedor também cadastra e altera (descrição, unidade, categoria e preço), com limites:
 * preço nunca abaixo do custo cadastrado; redução acima da alçada de desconto dele (acumulada desde o último preço
 * definido pela gestão) vira pedido para a gestão comercial ou a Diretoria (Caixa de decisões); aumento grava direto;
 * não vê nem altera o custo; só arquiva (reativar é da gestão). Toda mudança de preço fica em COM_HISTORICO (de, para,
 * quem, quando).
 * 29/10/2026: proposta que nunca foi ao cliente pode ser EXCLUÍDA pelo responsável ou pela gestão (motivo obrigatório):
 * SITUACAO EXCLUIDA + EXCLUIDA_EM; sai das listas, do quadro, do painel e da gestora; o registro e o histórico ficam e o
 * número não é reaproveitado. Proposta já enviada só é cancelada (com motivo).
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
 *    10/11/2026 (etapa 1 da assinatura): a assinatura do cliente pelo link aprova a proposta e ganha a oportunidade sozinha
 *    (ComP_aplicarAprovacao_, o mesmo núcleo do registro manual), com a confirmação imediata por e-mail ao vendedor e ao
 *    cliente. Tipo do aceite (proposta assinada, ordem de compra, e-mail) e os dados da OC. Proposta assinada pelo cliente
 *    não é cancelada, substituída, excluída, vencida pela rotina nem cancelada pela perda da oportunidade.
 *    10/11/2026 (etapa 2): "Minha assinatura" (imagem PNG ou JPG cadastrada, ComAss_*) pode substituir o desenho ao assinar pela
 *    Metrolab; voltar para rascunho com link ativo exige confirmar o cancelamento do link (D14); o mesmo item do catálogo duas
 *    vezes na proposta é recusado (ComP_conferirRepetidos_); "Excluir repetido" do catálogo exige outro item ativo de mesmo
 *    nome e qual fica (JUNTADO_COM_ID).
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
function ComP_produtoParaTela_(p, eu, corteReajuste, polFicha) {
  var t = { id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), tipo: Com_up_(p.TIPO) || 'SERVICO', tipoNome: COM_TIPOS_ITEM[Com_up_(p.TIPO)] || 'Serviço',
    categoria: Com_s_(p.CATEGORIA), unidade: Com_s_(p.UNIDADE_MEDIDA) || 'un.', descricao: Com_s_(p.DESCRICAO), preco: Number(p.PRECO) || 0, precoTxt: Com_moeda_(p.PRECO),
    ativo: Com_up_(p.ATIVO || 'SIM') !== 'NAO', atualizadoPor: Com_s_(p.ATUALIZADO_POR_NOME), atualizadoEm: Com_br_(p.ATUALIZADO_EM),
    origem: /importa[çc][ãa]o do crm/i.test(Com_s_(p.ATUALIZADO_POR_NOME)) || /^CRM-/i.test(Com_s_(p.CODIGO)) ? 'CRM' : '' };
  if (eu && eu.veCusto) { t.custo = Com_s_(p.CUSTO) === '' ? null : Number(p.CUSTO) || 0; t.custoTxt = t.custo === null ? '' : Com_moeda_(t.custo); }
  // 01/11/2026 (Comercial C2): ficha de custo, preço sugerido pela política em vigor e as referências de mercado e do histórico
  if (typeof ComF_paraTela_ === 'function') {
    var fi = ComF_paraTela_(p, eu, polFicha);
    if (fi) { t.ficha = fi; if (eu && eu.veCusto && fi.conta && fi.vale) { t.custo = fi.conta.custo; t.custoTxt = Com_moeda_(fi.conta.custo) + ' (ficha)'; } }
  }
  // 01/11/2026: catálogo oficial da Diretoria (regra, versão, vigência e parâmetros técnicos; sem custo) e a descrição gerada
  if (typeof ComCat_paraTela_ === 'function') { var of = ComCat_paraTela_(p); if (of) t.oficial = of; }
  if (eu && (eu.gestao || eu.catalogo) && Com_s_(p.DESCRICAO_GERADA)) t.descricaoGerada = Com_s_(p.DESCRICAO_GERADA);
  // 29/10/2026: redução de preço pedida pelo vendedor (acima da alçada) e a última decisão
  var sitPed = Com_up_(p.PRECO_PEDIDO_SITUACAO);
  if (sitPed === 'PENDENTE') t.precoPedido = { preco: Number(p.PRECO_PEDIDO) || 0, precoTxt: Com_moeda_(p.PRECO_PEDIDO), por: Com_s_(p.PRECO_PEDIDO_POR_NOME), porId: Com_s_(p.PRECO_PEDIDO_POR_ID),
    em: Com_br_(p.PRECO_PEDIDO_EM), motivo: Com_s_(p.PRECO_PEDIDO_MOTIVO), podeDecidir: !!(eu && eu.gestao && Com_s_(p.PRECO_PEDIDO_POR_ID) !== Com_s_(eu.id)) };
  else if (sitPed === 'APROVADO' || sitPed === 'NEGADO') t.precoDecisao = { situacao: sitPed, precoTxt: Com_moeda_(p.PRECO_PEDIDO), por: Com_s_(p.PRECO_DECISAO_POR_NOME), em: Com_br_(p.PRECO_DECISAO_EM), texto: Com_s_(p.PRECO_DECISAO_TEXTO), pedidoPor: Com_s_(p.PRECO_PEDIDO_POR_NOME) };
  // 29/10/2026: data do último preço (reajuste ou edição); "sem reajuste" pela política de precificação
  if (eu && (eu.gestao || eu.catalogo) && typeof ComPr_desdePreco_ === 'function') {
    var desde = ComPr_desdePreco_(p), lim = corteReajuste || ComPr_corteMeses_(12);
    t.precoDesde = Com_brDia_(desde);
    t.semReajuste = t.ativo && t.preco > 0 && !!desde && desde < lim;
  }
  return t;
}

/** Catálogo (COM_PRODUTOS). d: { incluirArquivados, busca, tipo, categoria, situacao ('ATIVOS'|'ARQUIVADOS'|'TODOS'), limite }.
 * 27/10/2026: com 1.330 itens importados do CRM a lista inteira não servia para achar nada; a busca vem do banco, sem acento e
 * por partes, no código, nome, descrição, categoria, tipo e unidade; resultados mais parecidos primeiro (código igual, começo do
 * código ou do nome). Devolve { produtos, total (itens que a pessoa pode ver), encontrados, limitado, categorias }. */
function ComP_catalogo_(eu, d) {
  if (!eu.catalogo) Com_exigir_(eu, 'VENDEDOR', 'ver o catálogo');
  d = d || {};
  var gere = !!(eu.gestao || eu.catalogo), incluirArq = !!d.incluirArquivados && gere;
  // antes, quem não era da gestão e pedia os arquivados recebia a lista vazia; agora recebe os ativos
  var visiveis = Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Com_s_(p.ID) || Com_s_(p.NOME); }).filter(function (p) { return incluirArq || Com_up_(p.ATIVO || 'SIM') !== 'NAO'; });
  var categorias = {};
  visiveis.forEach(function (p) { var c = Com_s_(p.CATEGORIA); if (c) categorias[c] = 1; });
  var termos = Com_termosBusca_(d.busca), tipo = Com_up_(d.tipo), cat = Com_normBusca_(d.categoria), sit = Com_up_(d.situacao) || 'TODOS';
  // 28/10/2026: "Possíveis duplicados" (gestão): itens ATIVOS com o mesmo nome (sem acento, maiúscula e pontuação). Na
  // importação do CRM, 25 nomes vieram em mais de um código (53 itens, produção em 28/10/2026); a gestão confere e arquiva o que sobra.
  var mesmoNome = ComP_nomesRepetidos_(visiveis);
  if ((sit === 'DUPLICADOS' || sit === 'SEM_REAJUSTE' || sit === 'DESCRICAO_GERADA') && !gere) sit = 'ATIVOS';
  var oficial = function (p) { return typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(p); };
  // 29/10/2026: preço aguardando aprovação (redução pedida pelo vendedor acima da alçada)
  var pendente = function (p) { return Com_up_(p.PRECO_PEDIDO_SITUACAO) === 'PENDENTE'; };
  // 29/10/2026: "Sem reajuste há mais de N meses" (política de precificação; padrão 12)
  var polF = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null;
  var mesesReaj = polF ? (polF.reajusteAlertaMeses || 12) : 12;
  var corte = typeof ComPr_corteMeses_ === 'function' ? ComPr_corteMeses_(mesesReaj) : '';
  var achados = visiveis.filter(function (p) {
    if (sit === 'SEM_REAJUSTE') { var dd = typeof ComPr_desdePreco_ === 'function' ? ComPr_desdePreco_(p) : ''; if (!(Com_up_(p.ATIVO || 'SIM') !== 'NAO' && Number(p.PRECO) > 0 && dd && dd < corte)) return false; }
    if (tipo && Com_up_(p.TIPO || 'SERVICO') !== tipo) return false;
    if (cat && Com_normBusca_(p.CATEGORIA) !== cat) return false;
    var ativo = Com_up_(p.ATIVO || 'SIM') !== 'NAO';
    if (sit === 'ATIVOS' && !ativo) return false;
    if (sit === 'ARQUIVADOS' && ativo) return false;
    if (sit === 'DUPLICADOS' && !(ativo && mesmoNome[Com_normBusca_(p.NOME)] > 1)) return false;
    if (sit === 'PRECO_PENDENTE' && !pendente(p)) return false;
    // 01/11/2026: os 26 da tabela oficial da Diretoria e os itens com descrição criada pelo sistema (revisar)
    if (sit === 'OFICIAL' && !(oficial(p) && ativo)) return false;
    if (sit === 'DESCRICAO_GERADA' && !Com_s_(p.DESCRICAO_GERADA)) return false;
    return Com_casaBusca_(termos, [Com_s_(p.CODIGO), Com_s_(p.NOME), Com_s_(p.DESCRICAO), Com_s_(p.CATEGORIA), COM_TIPOS_ITEM[Com_up_(p.TIPO)] || '', Com_s_(p.UNIDADE_MEDIDA)]);
  }).map(function (p) { return ComP_produtoParaTela_(p, eu, corte, polF); });
  var q = termos.join(' '), qJunto = termos.join('');
  var peso = function (x) {
    if (!termos.length) return 0;
    var cod = Com_normBusca_(x.codigo), nome = Com_normBusca_(x.nome);
    if (cod === q || cod.replace(/ /g, '') === qJunto) return 0;
    if (cod.indexOf(q) === 0 || cod.replace(/ /g, '').indexOf(qJunto) === 0) return 1;
    if (nome.indexOf(q) === 0) return 2;
    if (Com_casaBusca_(termos, [x.codigo, x.nome])) return 3;
    return 4; // achou só na descrição, categoria ou tipo
  };
  // 10/11/2026 (etapa 2, D18): o item repetido traz os outros ativos de mesmo nome, para a tela perguntar qual fica
  var porNome = {};
  if (gere) visiveis.forEach(function (p) { if (Com_up_(p.ATIVO || 'SIM') === 'NAO') return; var k = Com_normBusca_(p.NOME); (porNome[k] = porNome[k] || []).push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME) }); });
  achados.forEach(function (x) { x._peso = sit === 'DUPLICADOS' ? 0 : peso(x); if (gere && x.ativo && mesmoNome[Com_normBusca_(x.nome)] > 1) { x.duplicado = true; x.repetidoCom = (porNome[Com_normBusca_(x.nome)] || []).filter(function (y) { return y.id !== x.id; }); } });
  achados.sort(function (a, b) { return (a._peso - b._peso) || (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR') || a.codigo.localeCompare(b.codigo, 'pt-BR'); });
  achados.forEach(function (x) { delete x._peso; });
  var limite = Math.max(0, Math.min(2000, Math.floor(Number(d.limite) || 0)));
  var lista = limite && achados.length > limite ? achados.slice(0, limite) : achados;
  var dupGrupos = 0; Object.keys(mesmoNome).forEach(function (k) { if (mesmoNome[k] > 1) dupGrupos++; });
  var semReaj = 0;
  if (gere && corte && typeof ComPr_desdePreco_ === 'function') visiveis.forEach(function (p) { var dd = ComPr_desdePreco_(p); if (Com_up_(p.ATIVO || 'SIM') !== 'NAO' && Number(p.PRECO) > 0 && dd && dd < corte) semReaj++; });
  return { produtos: lista, total: visiveis.length, encontrados: achados.length, limitado: lista.length < achados.length,
    categorias: Object.keys(categorias).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }), duplicados: gere ? dupGrupos : 0,
    semReajuste: semReaj, reajusteMeses: mesesReaj, podeReajustar: typeof ComPr_podeReajustar_ === 'function' && ComPr_podeReajustar_(eu),
    precosPendentes: visiveis.filter(pendente).length, oficiais: visiveis.filter(function (p) { return oficial(p) && Com_up_(p.ATIVO || 'SIM') !== 'NAO'; }).length,
    descricoesGeradas: gere ? visiveis.filter(function (p) { return !!Com_s_(p.DESCRICAO_GERADA); }).length : 0, comFicha: typeof ComF_temFicha_ === 'function' ? visiveis.filter(ComF_temFicha_).length : 0, podeImportarC1: !!eu.gestao, podeCadastrar: !!(eu.catalogo || eu.catalogoVenda), acessoLimitado: !!eu.catalogoVenda, alcadaPreco: eu.catalogoVenda ? ComP_alcadaPreco_(eu) : null };
}

/** { nomeNormalizado: quantidade de itens ATIVOS com esse nome } */
function ComP_nomesRepetidos_(lista) {
  var m = {};
  (lista || []).forEach(function (p) { if (Com_up_(p.ATIVO || 'SIM') === 'NAO') return; var k = Com_normBusca_(p.NOME); if (k) m[k] = (m[k] || 0) + 1; });
  return m;
}

/** Alçada do vendedor para reduzir preço do catálogo: a alçada de desconto dele na metodologia (por vendedor ou a geral); sem número, 10%. */
function ComP_alcadaPreco_(eu, met) {
  var v = ComP_limiteDe_(Com_s_(eu && eu.id), met);
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 10;
}

/** Base da alçada de preço: o maior entre o preço atual e o preço antes da primeira redução feita pelo vendedor. */
function ComP_basePreco_(p) { return Math.max(Number(p && p.PRECO) || 0, Number(p && p.PRECO_REFERENCIA) || 0); }

/** Avisa a gestão comercial (e, sem ela, a Diretoria ou o Administrador) do pedido de preço. Sem R$ (avisos não levam valor). */
function ComP_avisarPedidoPreco_(eu, p, reducao) {
  try {
    Com_idsGestaoComercial_([Com_s_(eu.id)]).forEach(function (id) {
      Com_avisar_(id, 'PRECO_PEDIDO', 'Preço do catálogo aguardando a sua decisão: ' + Com_s_(p.CODIGO), eu.nome + ' pediu para reduzir em ' + Com_pct_(reducao) + ' o preço de venda de "' + Com_s_(p.NOME) +
        '" (acima da alçada do vendedor). Abra Comercial > Produtos e serviços, Situação "Preço aguardando aprovação", e aprove ou negue com a fundamentação.', { tipo: 'catalogo', id: Com_s_(p.ID) });
    });
  } catch (e) { console.error('Comercial, aviso do preço: ' + ((e && e.message) || e)); }
}

/**
 * Cadastra ou altera. d: { id?, codigo, nome, tipo, categoria, unidade, descricao, preco, custo, motivoPreco }
 * Gestão e Financeiro: tudo, sem limite. Vendedor (29/10/2026): cadastra item novo; no item existente altera descrição,
 * unidade, categoria e preço de venda (código, nome e tipo ficam com a gestão); não informa custo; preço nunca abaixo do
 * custo cadastrado; redução acima da alçada (acumulada sobre PRECO_REFERENCIA) não grava o preço: vira pedido pendente.
 */
function ComP_salvarProduto_(eu, d) {
  if (!eu.catalogo && !eu.catalogoVenda) Com_exigir_(eu, 'GESTAO', 'salvar o produto ou serviço');
  var limitado = !eu.catalogo;
  d = d || {};
  var nome = Com_texto_(d.nome, 200);
  if (nome.length < 3) throw new Error('Não foi possível salvar: escreva o nome do produto ou serviço (pelo menos 3 letras)');
  var codigo = Com_up_(d.codigo).replace(/\s+/g, '-').slice(0, 40);
  if (!codigo) throw new Error('Não foi possível salvar: informe um código curto (por exemplo QT-AUTOCLAVE). Ele aparece na proposta e evita itens repetidos');
  var tipo = COM_TIPOS_ITEM[Com_up_(d.tipo)] ? Com_up_(d.tipo) : 'SERVICO';
  var preco = Com_num_(d.preco);
  if (!(preco >= 0)) throw new Error('Não foi possível salvar: informe o preço de venda (por exemplo 1.250,00)');
  if (limitado && Com_s_(d.custo) !== '') throw new Error('Não foi possível salvar: o custo do item é cadastrado pela gestão comercial ou pelo Financeiro. Deixe o custo em branco e salve de novo; se o item precisa de custo, peça a um deles');
  var custo = limitado || Com_s_(d.custo) === '' ? '' : Com_num_(d.custo);
  if (custo !== '' && !(custo >= 0)) throw new Error('Não foi possível salvar: o custo precisa ser um valor (por exemplo 600,00) ou ficar em branco');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var outro = Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Com_up_(p.CODIGO) === codigo && Com_s_(p.ID) !== Com_s_(d.id); })[0];
    if (outro) throw new Error('Não foi possível salvar: o código ' + codigo + ' já é do item "' + Com_s_(outro.NOME) + '". Use outro código ou edite aquele item');
    var atual = Com_s_(d.id) ? SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id)) : null;
    if (Com_s_(d.id) && !atual) throw new Error('Não foi possível salvar: o item não existe mais. Atualize o catálogo');
    // 01/11/2026: item da tabela oficial da Diretoria. Vendedor não altera; a gestão muda descrição, unidade e categoria; preço-base e
    // nome só a Diretoria ou o Administrador (com o histórico); o código e o tipo identificam o serviço e não mudam por aqui.
    if (atual && typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(atual)) {
      if (!eu.gestao) throw new Error('Não foi possível salvar: ' + Com_s_(atual.CODIGO) + ' é da tabela oficial da Diretoria. A equipe comercial usa o serviço nas propostas (com os parâmetros técnicos), mas não altera o cadastro; peça à gestão comercial ou à Diretoria. Nada foi gravado');
      if (Com_up_(atual.CODIGO) !== codigo || (Com_up_(atual.TIPO) || 'SERVICO') !== tipo) throw new Error('Não foi possível salvar: o código e o tipo de ' + Com_s_(atual.CODIGO) + ' identificam o serviço da tabela oficial e não mudam. Nada foi gravado');
      var podeDir = typeof ComCat_podeMudarPreco_ === 'function' && ComCat_podeMudarPreco_(eu);
      if (!podeDir && Math.abs((Number(atual.PRECO) || 0) - Com_r2_(preco)) > 0.004) throw new Error('Não foi possível salvar: o preço-base de ' + Com_s_(atual.CODIGO) + ' é da tabela oficial e só a Diretoria ou o Administrador mudam (Produtos e serviços > Catálogo oficial). Mantenha o preço de ' + Com_moeda_(atual.PRECO) + ' para salvar o resto. Nada foi gravado');
      // revisão 01/11/2026: nem a Diretoria muda o preço oficial por aqui: este caminho não grava o lote de reajuste, a vigência nem a
      // versão da tabela (as propostas novas congelariam o preço novo com a versão antiga). O caminho é o Catálogo oficial.
      if (podeDir && Math.abs((Number(atual.PRECO) || 0) - Com_r2_(preco)) > 0.004) throw new Error('Não foi possível salvar: o preço-base de ' + Com_s_(atual.CODIGO) + ' é da tabela oficial e muda em Produtos e serviços > Catálogo oficial > Editar (com a vigência, a versão da tabela e o lote de reajuste). Mantenha o preço de ' + Com_moeda_(atual.PRECO) + ' para salvar o resto aqui. Nada foi gravado');
      if (!podeDir && Com_normBusca_(atual.NOME) !== Com_normBusca_(nome)) throw new Error('Não foi possível salvar: o nome de ' + Com_s_(atual.CODIGO) + ' é da tabela oficial e só a Diretoria ou o Administrador mudam. Nada foi gravado');
    }
    if (atual && limitado) {
      var mudou = [];
      if (Com_up_(atual.CODIGO) !== codigo) mudou.push('o código');
      if (Com_normBusca_(atual.NOME) !== Com_normBusca_(nome)) mudou.push('o nome');
      if ((Com_up_(atual.TIPO) || 'SERVICO') !== tipo) mudou.push('o tipo');
      if (mudou.length) throw new Error('Não foi possível salvar: ' + mudou.join(', ').replace(/, ([^,]*)$/, ' e $1') + ' de um item já cadastrado ' + (mudou.length > 1 ? 'são alterados' : 'é alterado') + ' pela gestão comercial ou pelo Financeiro (identificam o item nas propostas). Você pode mudar a descrição, a unidade, a categoria e o preço de venda. Se o item está errado, arquive-o e cadastre o certo');
    }
    // 28/10/2026: cadastro único. Item novo (ou nome alterado) com o mesmo nome de outro item ativo vira duplicidade na
    // escolha das propostas. O que já veio repetido do CRM continua editável sem trocar o nome.
    var atualNome = atual ? Com_s_(atual.NOME) : '';
    if (Com_normBusca_(atualNome) !== Com_normBusca_(nome)) {
      var xara = Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Com_s_(p.ID) !== Com_s_(d.id) && Com_up_(p.ATIVO || 'SIM') !== 'NAO' && Com_normBusca_(p.NOME) === Com_normBusca_(nome); })[0];
      if (xara) throw new Error('Não foi possível salvar: já existe o item ativo "' + Com_s_(xara.NOME) + '" (código ' + Com_s_(xara.CODIGO) + ', ' + Com_moeda_(xara.PRECO) + '). O catálogo é um cadastro único: edite aquele item (preço, descrição, unidade) ou, se for outro produto, diferencie o nome (modelo, tamanho ou capacidade)');
    }
    var agora = Com_agora_();
    var campos = { CODIGO: codigo, NOME: nome, TIPO: tipo, CATEGORIA: Com_texto_(d.categoria, 80), UNIDADE_MEDIDA: Com_texto_(d.unidade, 20) || 'un.', DESCRICAO: Com_texto_(d.descricao, 2000),
      PRECO: Com_r2_(preco), CUSTO: custo === '' ? '' : Com_r2_(custo), ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    if (limitado) delete campos.CUSTO; // o vendedor nunca mexe no custo (nem apaga)
    // 01/11/2026: descrição criada pelo sistema (DESCRICAO_GERADA) deixa de estar "para revisar" quando alguém da gestão a altera
    if (atual && Com_s_(atual.DESCRICAO_GERADA) && !limitado && Com_s_(campos.DESCRICAO) !== Com_s_(atual.DESCRICAO)) campos.DESCRICAO_GERADA = '';
    var reg, pedido = null, msg = 'Item ' + codigo + ' salvo no catálogo.';
    if (atual) {
      var antes = Com_r2_(Number(atual.PRECO) || 0), mudouPreco = Math.abs(antes - campos.PRECO) > 0.004;
      if (limitado && mudouPreco) {
        var custoAt = Com_s_(atual.CUSTO) === '' ? null : Number(atual.CUSTO) || 0;
        if (custoAt !== null && campos.PRECO < custoAt - 0.004) throw new Error('Não foi possível salvar: o preço de venda de ' + Com_moeda_(campos.PRECO) + ' ficou abaixo do custo cadastrado deste item (o custo é visto só pela gestão e pelo Financeiro). Vender abaixo do custo é decisão da gestão comercial ou da Diretoria: mantenha um preço maior ou peça a um deles. Nada foi gravado');
        var base = ComP_basePreco_(atual), alcada = ComP_alcadaPreco_(eu);
        var reducao = base > 0 && campos.PRECO < base - 0.004 ? Math.round((base - campos.PRECO) / base * 10000) / 100 : 0;
        if (campos.PRECO < antes && reducao > alcada + 1e-9) {
          var pend = Com_up_(atual.PRECO_PEDIDO_SITUACAO) === 'PENDENTE';
          if (pend && Com_s_(atual.PRECO_PEDIDO_POR_ID) !== Com_s_(eu.id)) throw new Error('Não foi possível pedir a redução: o preço deste item já aguarda a decisão sobre o pedido de ' + Com_s_(atual.PRECO_PEDIDO_POR_NOME) + ' (' + Com_br_(atual.PRECO_PEDIDO_EM) + '). Aguarde a decisão da gestão comercial ou da Diretoria (Caixa de decisões) e salve de novo depois. Nada foi gravado');
          var motivo = Com_texto_(d.motivoPreco, 500);
          if (motivo.length < 10) throw new Error('A redução de ' + Com_pct_(reducao) + ' no preço (de ' + Com_moeda_(base) + ' para ' + Com_moeda_(campos.PRECO) + ') passa da sua alçada de ' + Com_pct_(alcada, 0) + '. O preço novo pode ser pedido, mas só vale depois da aprovação da Diretoria ou da gestão comercial. Escreva o motivo da redução (pelo menos 10 letras) em "Motivo da mudança de preço" e salve de novo. Nada foi gravado ainda');
          pedido = { preco: campos.PRECO, reducao: reducao, motivo: motivo, substitui: pend };
          campos.PRECO = antes; // o preço atual continua valendo até a decisão
          campos.PRECO_PEDIDO = pedido.preco; campos.PRECO_PEDIDO_SITUACAO = 'PENDENTE'; campos.PRECO_PEDIDO_POR_ID = eu.id; campos.PRECO_PEDIDO_POR_NOME = eu.nome; campos.PRECO_PEDIDO_EM = agora; campos.PRECO_PEDIDO_MOTIVO = motivo;
          campos.PRECO_DECISAO_POR_NOME = ''; campos.PRECO_DECISAO_EM = ''; campos.PRECO_DECISAO_TEXTO = '';
          mudouPreco = false;
        } else if (campos.PRECO < antes) {
          if (!(Number(atual.PRECO_REFERENCIA) > 0)) campos.PRECO_REFERENCIA = base; // de onde a redução partiu (a alçada conta o acumulado)
        } else if (Number(atual.PRECO_REFERENCIA) > 0 && campos.PRECO >= Number(atual.PRECO_REFERENCIA) - 0.004) campos.PRECO_REFERENCIA = '';
      } else if (mudouPreco) campos.PRECO_REFERENCIA = ''; // preço da gestão ou do Financeiro é a nova referência
      // 29/10/2026: preço mudado à mão também conta como reajuste do item (data do último preço)
      if (mudouPreco) campos.PRECO_DESDE = Com_hoje_();
      SGO_DATA.update(COM_ABAS.PRODUTOS, atual.ID, campos);
      if (mudouPreco) Com_historico_('PRODUTO', atual.ID, 'PRECO', eu, { de: Com_moeda_(antes), para: Com_moeda_(campos.PRECO), texto: 'Preço de venda de ' + codigo + ' alterado de ' + Com_moeda_(antes) + ' para ' + Com_moeda_(campos.PRECO) + (limitado ? ' (equipe comercial, dentro da alçada)' : '') + '.' + (Com_s_(d.motivoPreco) ? ' Motivo: ' + Com_texto_(d.motivoPreco, 500) : '') });
      if (pedido) Com_historico_('PRODUTO', atual.ID, 'PRECO_PEDIDO', eu, { de: Com_moeda_(antes), para: Com_moeda_(pedido.preco), texto: 'Pedido de redução do preço de venda de ' + codigo + ' de ' + Com_moeda_(antes) + ' para ' + Com_moeda_(pedido.preco) + ' (' + Com_pct_(pedido.reducao) + ', acima da alçada) aguardando aprovação' + (pedido.substitui ? '; substitui o pedido anterior' : '') + '. Motivo: ' + pedido.motivo });
      var rotulos = { CATEGORIA: 'categoria', UNIDADE_MEDIDA: 'unidade', DESCRICAO: 'descrição', NOME: 'nome', CODIGO: 'código', TIPO: 'tipo', CUSTO: 'custo' };
      var outros = Object.keys(rotulos).filter(function (k) { return campos[k] !== undefined && Com_s_(campos[k]) !== Com_s_(atual[k]); });
      if (outros.length) Com_historico_('PRODUTO', atual.ID, 'EDICAO', eu, { texto: 'Alterado: ' + outros.map(function (k) { return rotulos[k]; }).join(', ') + '.' });
      reg = Object.assign({}, atual, campos);
      if (pedido) {
        ComP_avisarPedidoPreco_(eu, reg, pedido.reducao);
        msg = 'Item ' + codigo + ' salvo. O preço novo de ' + Com_moeda_(pedido.preco) + ' (redução de ' + Com_pct_(pedido.reducao) + ') passa da sua alçada de ' + Com_pct_(ComP_alcadaPreco_(eu), 0) +
          ': está aguardando aprovação da Diretoria ou da gestão comercial (Caixa de decisões). Até a decisão, as propostas usam o preço atual de ' + Com_moeda_(antes) + '. Você recebe o aviso da decisão no sistema.';
      }
    } else {
      campos.ATIVO = 'SIM'; campos.PRECO_DESDE = Com_hoje_();
      reg = SGO_DATA.insert(COM_ABAS.PRODUTOS, campos);
      Com_historico_('PRODUTO', reg.ID, 'CRIACAO', eu, { para: Com_moeda_(campos.PRECO), texto: nome + ' (' + codigo + ') cadastrado com preço de venda de ' + Com_moeda_(campos.PRECO) + (limitado ? ' pela equipe comercial' : '') + '.' });
    }
    return { produto: ComP_produtoParaTela_(reg, eu), pendente: !!pedido, message: msg };
  });
}

/** Gestão decide a redução de preço pedida pelo vendedor. d: { id, aprovar (bool), texto (>= 10) } */
function ComP_decidirPreco_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'decidir o preço do item');
  d = d || {};
  var texto = Com_texto_(d.texto, 1000);
  if (texto.length < 10) throw new Error('Não foi possível registrar a decisão: escreva a fundamentação (pelo menos 10 letras). Ela fica no histórico do item e o vendedor recebe o aviso');
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id));
    if (!p) throw new Error('Não foi possível decidir: o item não existe mais. Atualize o catálogo');
    if (Com_up_(p.PRECO_PEDIDO_SITUACAO) !== 'PENDENTE') throw new Error('Não foi possível decidir: o preço do item ' + Com_s_(p.CODIGO) + ' não tem pedido aguardando aprovação (já foi decidido). Atualize o catálogo');
    if (Com_s_(p.PRECO_PEDIDO_POR_ID) === eu.id) throw new Error('Não foi possível decidir: o pedido é seu. Quem decide é outra pessoa da gestão comercial ou a Diretoria');
    var agora = Com_agora_(), aprovar = d.aprovar === true, antes = Number(p.PRECO) || 0, novo = Number(p.PRECO_PEDIDO) || 0;
    var campos = { PRECO_PEDIDO_SITUACAO: aprovar ? 'APROVADO' : 'NEGADO', PRECO_DECISAO_POR_NOME: eu.nome, PRECO_DECISAO_EM: agora, PRECO_DECISAO_TEXTO: texto, ATUALIZADO_EM: agora };
    if (aprovar) { campos.PRECO = Com_r2_(novo); campos.PRECO_DESDE = Com_hoje_(); campos.PRECO_REFERENCIA = ''; campos.ATUALIZADO_POR_NOME = eu.nome + ' (aprovou o pedido de ' + Com_s_(p.PRECO_PEDIDO_POR_NOME) + ')'; }
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, campos);
    Com_historico_('PRODUTO', p.ID, aprovar ? 'PRECO_APROVADO' : 'PRECO_NEGADO', eu, { de: Com_moeda_(antes), para: Com_moeda_(aprovar ? novo : antes),
      texto: (aprovar ? 'Redução aprovada: preço de venda de ' + Com_s_(p.CODIGO) + ' de ' + Com_moeda_(antes) + ' para ' + Com_moeda_(novo) : 'Redução negada: o preço de venda de ' + Com_s_(p.CODIGO) + ' continua ' + Com_moeda_(antes) + ' (pedido: ' + Com_moeda_(novo) + ')') +
        '. Pedido de ' + Com_s_(p.PRECO_PEDIDO_POR_NOME) + '. Fundamentação: ' + texto });
    var red = antes > 0 ? Math.round((antes - novo) / antes * 10000) / 100 : 0;
    Com_avisar_(p.PRECO_PEDIDO_POR_ID, aprovar ? 'PRECO_APROVADO' : 'PRECO_NEGADO', (aprovar ? 'Preço aprovado: ' : 'Preço não aprovado: ') + Com_s_(p.CODIGO),
      eu.nome + (aprovar ? ' aprovou a redução de ' + Com_pct_(red) + ' no preço de "' + Com_s_(p.NOME) + '"; o preço novo já vale para as propostas montadas daqui em diante. ' : ' não aprovou a redução de ' + Com_pct_(red) + ' no preço de "' + Com_s_(p.NOME) + '"; o preço atual continua valendo. ') + 'Fundamentação: ' + texto, { tipo: 'catalogo', id: Com_s_(p.ID) });
    return { produto: ComP_produtoParaTela_(Object.assign({}, p, campos), eu), message: aprovar ? 'Preço aprovado: o item ' + Com_s_(p.CODIGO) + ' passou a ' + Com_moeda_(novo) + '. O vendedor foi avisado.' : 'Redução negada: o item ' + Com_s_(p.CODIGO) + ' continua com ' + Com_moeda_(antes) + '. O vendedor foi avisado.' };
  });
}

/** Histórico de preço e de cadastro de um item (quem, quando, de quanto para quanto), mais recente primeiro. */
function ComP_historicoProduto_(eu, d) {
  if (!eu.catalogo && !eu.catalogoVenda) Com_exigir_(eu, 'GESTAO', 'ver o histórico do item');
  var id = Com_s_(d && d.id);
  var l = Com_ler_(COM_ABAS.HISTORICO).filter(function (h) { return Com_s_(h.ENTIDADE) === 'PRODUTO' && Com_s_(h.ENTIDADE_ID) === id; });
  // os reajustes do catálogo (SGO_Comercial_Precificacao.js) ficam em COM_REAJUSTES
  Com_ler_(COM_ABAS.REAJUSTES).filter(function (r) { return Com_s_(r.PRODUTO_ID) === id && ['APLICADO', 'DESFEITO'].indexOf(Com_up_(r.SITUACAO)) >= 0; }).forEach(function (r) {
    l.push({ TIPO: 'REAJUSTE', DE: Com_moeda_(r.PRECO_ANTERIOR), PARA: Com_moeda_(r.PRECO_NOVO), TEXTO: 'Reajuste do catálogo ' + Com_s_(r.LOTE) + ': de ' + Com_moeda_(r.PRECO_ANTERIOR) + ' para ' + Com_moeda_(r.PRECO_NOVO) + (Com_up_(r.SITUACAO) === 'DESFEITO' ? ' (desfeito em ' + Com_br_(r.DESFEITO_EM) + ')' : '') + '.', USUARIO_NOME: Com_s_(r.USUARIO_NOME), DATA: Com_s_(r.APLICADO_EM) || Com_s_(r.DATA) });
  });
  return { historico: l.sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); }).slice(0, 60)
    .map(function (h) { return { em: Com_br_(h.DATA), tipo: Com_s_(h.TIPO), de: Com_s_(h.DE), para: Com_s_(h.PARA), texto: Com_s_(h.TEXTO), por: Com_s_(h.USUARIO_NOME) }; }) };
}

/**
 * Excluir item repetido do catálogo. d: { id (o que sai), manterId (o que fica), motivo (>= 10 letras) }.
 * 10/11/2026 (etapa 2, pedido a / D18): só para item com outro ATIVO de mesmo nome (sem acento, maiúscula e pontuação); o servidor
 * confere a repetição e pede qual fica. O que sai é arquivado com a marca JUNTADO_COM_ID/EM/POR_NOME (não volta a ser reativado,
 * ComP_arquivarProduto_) e nunca apagado: propostas antigas apontam para ele. Histórico nos dois itens. Gestão comercial ou Financeiro.
 */
function ComP_excluirDuplicado_(eu, d) {
  d = d || {};
  // mesma permissão de antes (quem arquiva itens do catálogo de venda também exclui o repetido)
  if (!eu.gestao && !eu.catalogo && !eu.catalogoVenda) Com_exigir_(eu, 'GESTAO', 'excluir item repetido do catálogo');
  var motivo = Com_texto_(d.motivo, 300);
  if (motivo.length < 10) throw new Error('Não foi possível excluir o item repetido: informe o motivo (pelo menos 10 letras, por exemplo "Mesmo serviço cadastrado duas vezes na importação do CRM")');
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id));
    if (!p) throw new Error('Não foi possível excluir o item repetido: o item não existe mais. Atualize o catálogo');
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO') throw new Error('Não foi possível excluir o item repetido: ' + Com_s_(p.CODIGO) + ' já está arquivado. Atualize o catálogo');
    if (typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(p) && !eu.gestao) throw new Error('Não foi possível excluir: ' + Com_s_(p.CODIGO) + ' é da tabela oficial da Diretoria; isso é da gestão comercial. Peça a ela');
    var nome = Com_normBusca_(p.NOME);
    var iguais = Com_ler_(COM_ABAS.PRODUTOS).filter(function (x) { return Com_s_(x.ID) !== Com_s_(p.ID) && Com_up_(x.ATIVO || 'SIM') !== 'NAO' && Com_normBusca_(x.NOME) === nome; });
    if (!iguais.length) throw new Error('Não foi possível excluir: "' + Com_s_(p.NOME) + '" (código ' + Com_s_(p.CODIGO) + ') não tem outro item ativo com o mesmo nome, então não é repetido. Se o item não é mais vendido, use "Arquivar"');
    var fica = iguais.filter(function (x) { return Com_s_(x.ID) === Com_s_(d.manterId); })[0];
    if (!fica) throw new Error('Não foi possível excluir: escolha qual item fica no catálogo. Itens ativos com o mesmo nome: ' + iguais.map(function (x) { return Com_s_(x.CODIGO) + ' (' + Com_s_(x.NOME) + ')'; }).join('; ') + '. O que sai é arquivado e as propostas antigas continuam como estão');
    var agora = Com_agora_();
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { ATIVO: 'NAO', JUNTADO_COM_ID: Com_s_(fica.ID), JUNTADO_EM: agora, JUNTADO_POR_NOME: eu.nome, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Com_historico_('PRODUTO', p.ID, 'ARQUIVADO', eu, { texto: 'Exclusão de duplicado: ' + motivo + ' Fica o item ' + Com_s_(fica.CODIGO) + ' (' + Com_s_(fica.NOME) + '); este saiu da escolha das propostas e não volta a ser reativado.' });
    Com_historico_('PRODUTO', fica.ID, 'REPETIDO_JUNTADO', eu, { texto: 'O item repetido ' + Com_s_(p.CODIGO) + ' (' + Com_s_(p.NOME) + ') foi excluído e este ficou no catálogo. Motivo: ' + motivo });
    return { message: 'Item repetido excluído: ' + Com_s_(p.CODIGO) + ' saiu da escolha das propostas e fica ' + Com_s_(fica.CODIGO) + '. As propostas antigas continuam como estão; o registro fica no histórico do item.' };
  });
}

function ComP_arquivarProduto_(eu, d) {
  if (!eu.catalogo && !eu.catalogoVenda) Com_exigir_(eu, 'GESTAO', 'arquivar o item');
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d && d.id));
    if (!p) throw new Error('Não foi possível arquivar: o item não existe mais. Atualize o catálogo');
    var ativo = !(d && d.reativar);
    if (typeof ComCat_ehOficial_ === 'function' && ComCat_ehOficial_(p) && !eu.gestao) throw new Error('Não foi possível arquivar: ' + Com_s_(p.CODIGO) + ' é da tabela oficial da Diretoria; ativar e desativar é da gestão comercial. Peça a ela');
    // 29/10/2026: o vendedor não exclui nem reativa: só arquiva (o item sai da escolha das propostas novas)
    if (!ativo && !eu.catalogo) throw new Error('Não foi possível reativar: reativar um item arquivado é da gestão comercial ou do Financeiro. Peça a um deles; o item continua no catálogo, só fora da escolha das propostas');
    // 29/10/2026: item repetido que foi juntado em outro (Cadastros > Correções de cadastro) não volta: reativar recriaria a duplicidade
    if (!ativo && Com_s_(p.JUNTADO_COM_ID)) { var dest = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(p.JUNTADO_COM_ID)); throw new Error('Não foi possível reativar: este item foi juntado em ' + (dest ? '"' + Com_s_(dest.NOME) + '" (código ' + Com_s_(dest.CODIGO) + ')' : 'outro item') + ' em ' + Com_br_(p.JUNTADO_EM) + (Com_s_(p.JUNTADO_POR_NOME) ? ' por ' + Com_s_(p.JUNTADO_POR_NOME) : '') + '. Use o item que ficou; se a junção foi um erro, cadastre o item de novo com um nome que o diferencie') }
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { ATIVO: ativo ? 'NAO' : 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() });
    Com_historico_('PRODUTO', p.ID, ativo ? 'ARQUIVADO' : 'REATIVADO', eu, { texto: Com_texto_(d && d.motivo, 300) });
    return { message: ativo ? 'Item arquivado: não aparece mais na escolha das propostas (as propostas antigas continuam como estão).' + (eu.catalogo ? '' : ' Para reativar, peça à gestão comercial ou ao Financeiro.') : 'Item reativado.' };
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
  var bruto = 0, liquidoItens = 0, liquidoVenda = 0, brutoVenda = 0, reducaoAuto = 0, custo = 0, receitaComCusto = 0, semCusto = 0;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0, pt = Number(i.precoTabela) > 0 ? Number(i.precoTabela) : pu;
    bruto += q * Math.max(pt, pu);
    liquidoItens += q * pu;
    if (!i.auto) { liquidoVenda += q * pu; brutoVenda += q * Math.max(pt, pu); }
    else reducaoAuto += q * Math.max(0, pt - pu);
  });
  var dg = Math.max(0, Number(descontoGeral) || 0);
  var total = Com_r2_(liquidoItens - dg);
  // 01/11/2026 (decisão do dono, MAN-VIA-001 item 6.1): o desconto geral sai só dos serviços e produtos. O item de deslocamento e o
  // frete automáticos são repasse a custo mais impostos e ficam com o preço inteiro.
  var fator = liquidoVenda > 0 ? Math.max(0, liquidoVenda - dg) / liquidoVenda : 1;
  (itens || []).forEach(function (i) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0;
    if (i.custoUnitario !== null && i.custoUnitario !== undefined && i.custoUnitario !== '') { custo += q * Number(i.custoUnitario); receitaComCusto += q * pu * (i.auto ? 1 : fator); }
    else semCusto++;
  });
  return {
    subtotal: Com_r2_(liquidoItens), subtotalItens: Com_r2_(liquidoVenda), fatorItens: fator, bruto: Com_r2_(bruto), descontoGeral: Com_r2_(dg), total: total,
    // 01/11/2026: o percentual é sobre a tabela dos serviços e produtos (o deslocamento não recebe desconto; se o vendedor digitar o
    // deslocamento abaixo do calculado, a diferença conta como desconto)
    descontoPct: brutoVenda > 0 ? Math.round(((brutoVenda - liquidoVenda) + dg + reducaoAuto) / brutoVenda * 10000) / 100 : (bruto > 0 ? Math.round((bruto - total) / bruto * 10000) / 100 : 0),
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

/**
 * { dentro, motivos[], limite, margemMin, exigeDiretoria }. 29/10/2026: analise (ComPr_analise_, opcional) traz a margem da
 * política de precificação (depois de impostos e da viagem): abaixo da mínima, a proposta vai para a mesma aprovação do
 * desconto, mas só a Diretoria (ou o Administrador) aprova.
 */
function ComP_avaliarPolitica_(calc, uid, met, analise) {
  met = met || Com_metodologia_();
  // 01/11/2026 (Comercial C2): uma margem mínima só, a da política de precificação (depois de impostos, comissão e viagem).
  // A margem bruta antiga (politica.margemMinPct sobre os itens com custo, sem impostos) deixou de ser conferida à parte.
  var limite = ComP_limiteDe_(uid, met), mm = Number(met.precificacao && met.precificacao.margemMinPct) || 0, motivos = [], exigeDiretoria = false;
  if (calc.descontoPct > limite + 1e-9) motivos.push('desconto de ' + Com_pct_(calc.descontoPct) + ' acima do limite de ' + Com_pct_(limite, 0) + ' sem aprovação');
  if (analise && analise.abaixoMin) {
    // 01/11/2026 (decisão do dono): sobra mínima de 35%; vale qualquer que seja o limite de desconto de quem vende
    motivos.push('sobra de ' + Com_pct_(analise.margemPct) + ' (depois de impostos, comissão e custos diretos; o deslocamento em item próprio fica fora' + (analise.completa ? '' : '; sem o custo de ' + Com_plural_(analise.itensSemCusto, 'item', 'itens')) + ') abaixo da mínima de ' + Com_pct_(analise.margemMinPct, 1) + ' da política de precificação; só a Diretoria aprova');
    exigeDiretoria = true;
  }
  return { dentro: !motivos.length, motivos: motivos, limite: limite, margemMin: mm, exigeDiretoria: exigeDiretoria };
}

/** Análise de precificação de uma linha (ou null se o módulo não estiver carregado). */
function ComP_analise_(p, itens) {
  if (typeof ComPr_daProposta_ !== 'function') return null;
  try { return ComPr_daProposta_(p, null, itens).analise; } catch (e) { console.error('Comercial, precificação: ' + ((e && e.message) || e)); return null; }
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
  if (ComP_excluida_(p)) throw new Error('Não foi possível ' + acao + ': a proposta ' + ComP_rotulo_(p) + ' foi excluída em ' + Com_br_(p.EXCLUIDA_EM) + ' por ' + (Com_s_(p.EXCLUIDA_POR_NOME) || 'alguém da equipe') +
    ' (motivo: ' + Com_s_(p.EXCLUIDA_MOTIVO) + '). Ela não aparece mais nas listas; o registro fica no histórico da oportunidade. Atualize a lista de propostas');
  if (!ComP_podeVer_(eu, p)) throw new Error('Não foi possível ' + acao + ': a proposta ' + Com_s_(p.NUMERO) + ' é de ' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa') + '. O vendedor vê só as próprias; o Financeiro vê só as aprovadas');
  return p;
}

/**
 * 28/10/2026: as cláusulas fixas ("1. DO OBJETO ... testemunhas.") que os vendedores colavam na descrição dos orçamentos do
 * CRM (859 das 971 propostas importadas) agora vão fixas na seção "Termos e condições da contratação". Ao abrir, editar ou
 * gerar o documento, o bloco sai da descrição para não sair duas vezes; o que vem antes e depois (texto próprio, "Condições:",
 * "Frete:", "Entrega:") fica. Só sai quando o bloco é essencialmente o texto padrão (palavras em comum >= 95%); texto
 * cortado no fim (a importação limitou a 4.000 letras) conta pelo trecho que existe. O banco não é alterado aqui: a
 * descrição só muda se o vendedor salvar o rascunho. { texto, tinha }.
 */
function ComP_separarTermosLegado_(texto) {
  var s = Com_s_(texto).replace(/\r\n?/g, '\n');
  var ini = /(?:observa[çc][õo]es\s*:?\s*)?(?:\d+\s*)?[.)\-]?\s*do objeto\s*:/i.exec(s);
  if (!ini) return { texto: s, tinha: false };
  var re = /testemunhas\s*\.?/ig;
  re.lastIndex = ini.index;
  var fim = re.exec(s), ate = fim ? fim.index + fim[0].length : s.length;
  var palavras = function (t) { return Com_normBusca_(t).split(' ').filter(Boolean); };
  var bloco = palavras(s.slice(ini.index, ate));
  if (bloco[0] === 'observacoes') bloco.shift();
  if (bloco.length < 40) return { texto: s, tinha: false };
  var conta = {}, comum = 0;
  palavras(COM_METODOLOGIA_PADRAO.proposta.termos).forEach(function (w) { conta[w] = (conta[w] || 0) + 1; });
  var total = 0; Object.keys(conta).forEach(function (k) { total += conta[k]; });
  bloco.forEach(function (w) { if (conta[w] > 0) { conta[w]--; comum++; } });
  var sim = fim ? 2 * comum / (total + bloco.length) : comum / bloco.length;
  if (sim < 0.95) return { texto: s, tinha: false };
  var resto = (s.slice(0, ini.index) + '\n' + s.slice(ate)).replace(/\n[ \t]*[-_=]{5,}[ \t]*(?=\n|$)/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
  return { texto: resto, tinha: true };
}
/** Descrição (ESCOPO) sem o bloco antigo das cláusulas. */
function ComP_escopo_(p) { return ComP_separarTermosLegado_(p && p.ESCOPO).texto; }

/** Termos da proposta: os congelados no documento gerado; sem documento, os vigentes. { versao, texto, concordancia, congelado } */
function ComP_termosDa_(p) {
  var c = Com_json_(p && p.CONGELADO_JSON, null);
  if (c && c.termos && typeof c.termos.texto === 'string') return Object.assign({ congelado: true }, c.termos);
  var v = Com_termosVigentes_();
  return { versao: v.versao, texto: v.texto, concordancia: v.concordancia, desde: v.desde, congelado: false };
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
    pdfAssinadoUrl: '', aceiteTipo: Com_up_(p.ACEITE_TIPO), aceiteTipoNome: COM_TIPOS_ACEITE[Com_up_(p.ACEITE_TIPO)] || '', ocNumero: Com_s_(p.OC_NUMERO), ocData: Com_brDia_(p.OC_DATA),
    linkEmail: Com_s_(p.LINK_EMAIL), linkEnviadoEm: Com_br_(p.LINK_ENVIADO_EM),
    marcaConteudo: Com_s_(p.MARCA_CONTEUDO), pdfUrl: Com_s_(p.PDF_URL), htmlUrl: Com_s_(p.HTML_URL), pastaUrl: Com_s_(p.PASTA_URL), arquivoNome: Com_s_(p.ARQUIVO_NOME),
    pedidoSituacao: Com_up_(p.PEDIDO_SITUACAO), passagem: Com_json_(p.PASSAGEM_JSON, []), canceladaMotivo: Com_s_(p.CANCELADA_MOTIVO), criadaEm: Com_brDia_(p.CRIADO_EM),
    editavel: s === 'RASCUNHO' && (eu.gestao || Com_s_(p.RESPONSAVEL_ID) === eu.id), qtdItens: itens.length
  };
  if (completo && t.pdfId) {
    var ass = ComP_assRegistro_(p.ID);
    if (ass && ass.pdfId === t.pdfId && ass.marca === t.marcaConteudo) {
      t.pdfAssinadoUrl = Com_s_(ass.finalPdfUrl);
      // 10/11/2026 (etapa 1): assinatura da Metrolab, último link e a assinatura do cliente (com o e-mail convidado)
      t.assinadaMetrolab = true; t.assinadaMetrolabEm = Com_br_(ass.em);
      if (!t.linkEmail && ass.linkHash) { t.linkEmail = Com_s_(ass.clienteEmailEsperado); t.linkEnviadoEm = Com_br_(ass.linkEnviadoEm); }
      t.linkAtivo = !!ass.linkHash && !ass.finalPdfId;
      if (ass.finalPdfId) t.assinaturaCliente = { em: Com_br_(ass.clienteEm), nome: Com_s_(ass.clienteNome), cargo: Com_s_(ass.clienteCargo), email: Com_s_(ass.clienteEmail),
        emailConvidado: Com_s_(ass.clienteEmailEsperado), emailDiferente: !!Com_s_(ass.clienteEmailEsperado) && Com_s_(ass.clienteEmail) !== Com_s_(ass.clienteEmailEsperado) };
    }
  }
  var to = ComP_tipoOrcamento_(p, itens);
  t.investimento = ComP_investimento_(p);
  t.tipoOrcamento = to.tipo; t.tipoOrcamentoNome = to.nome; t.tipoOrcamentoEscolhido = to.escolhido; t.tipoOrcamentoSugerido = to.sugerido; t.tiposOrcamento = COM_TIPOS_ORCAMENTO;
  if (eu.veValores) {
    t.subtotal = Number(p.SUBTOTAL) || 0; t.descontoGeral = Number(p.DESCONTO_GERAL) || 0; t.total = Number(p.TOTAL) || 0; t.descontoPct = Number(p.DESCONTO_PCT) || 0;
    t.totalTxt = Com_moeda_(p.TOTAL); t.subtotalTxt = Com_moeda_(p.SUBTOTAL); t.descontoTxt = Com_moeda_(p.DESCONTO_GERAL); t.descontoPctTxt = Com_pct_(p.DESCONTO_PCT);
  }
  if (eu.veCusto && Com_s_(p.MARGEM_PCT) !== '') { t.margemPct = Number(p.MARGEM_PCT); t.margemTxt = Com_pct_(p.MARGEM_PCT); t.custoTxt = Com_moeda_(p.CUSTO_TOTAL); }
  if (completo) {
    var sep = ComP_separarTermosLegado_(p.ESCOPO);
    t.escopo = sep.texto; t.escopoTermosLegado = sep.tinha; t.apresentacao = Com_s_(p.APRESENTACAO);
    var tm = ComP_termosDa_(p);
    t.termos = { versao: tm.versao, texto: tm.texto, concordancia: tm.concordancia, congelado: !!tm.congelado,
      foraDoDocumento: !tm.congelado && !!Com_s_(p.GERADA_EM) }; t.condicoes = Com_json_(p.CONDICOES_JSON, {}); t.modelo = Com_s_(p.MODELO);
    // 01/11/2026 (Comercial C2): faixa de prazo da proposta e de cada item
    t.prazo = Com_json_(p.PRAZO_JSON, null) || { faixa: 'NORMAL', licitacao: false };
    if (typeof ComPr_textoPrazo_ === 'function') { try { t.prazoTexto = ComPr_textoPrazo_(ComPr_politicaDoPrazo_(t.prazo), t.prazo, itens); } catch (eP) { t.prazoTexto = ''; } }
    delete t.prazo.politica;
    t.itens = itens.map(function (i) {
      var o = { ordem: i.ordem, produtoId: i.produtoId || '', codigo: i.codigo || '', tipo: i.tipo || 'SERVICO', descricao: i.descricao || '', detalhe: i.detalhe || '',
        equipamentoId: i.equipamentoId || '', equipamentoTexto: i.equipamentoTexto || '', unidade: i.unidade || 'un.', quantidade: Number(i.quantidade) || 0, auto: i.auto || '', faixa: i.faixa || '' };
      if (eu.veValores) { o.precoUnitario = Number(i.precoUnitario) || 0; o.precoTabela = Number(i.precoTabela) || 0; o.precoTabelaNormal = i.precoTabelaNormal !== undefined ? Number(i.precoTabelaNormal) || 0 : o.precoTabela; o.total = Com_r2_((Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0)); o.precoDiferente = !!i.precoDiferente; }
      if (eu.veCusto && i.custoUnitario !== undefined && i.custoUnitario !== null && i.custoUnitario !== '') o.custoUnitario = Number(i.custoUnitario);
      // 01/11/2026: cópia congelada do catálogo oficial (regra, parâmetros, pontos, receitas; sem custo)
      if (i.catalogo) { o.catalogo = i.catalogo; if (!eu.veValores) { o.catalogo = Com_copia_(i.catalogo); delete o.catalogo.precoBase; delete o.catalogo.unitarioCentavos; delete o.catalogo.subtotalCentavos; } }
      return o;
    });
    t.revisaoGestora = Com_json_(p.REVISAO_GESTORA_JSON, null);
    if (eu.financeiro || eu.gestao) t.faturamento = ComP_dadosFaturamento_(p);
    // 29/10/2026: custos da viagem e do frete (checklist), repasse e margem (a margem em número só para quem vê custo)
    if (eu.veValores && typeof ComPr_paraTela_ === 'function') {
      try { t.deslocamento = ComPr_paraTela_(eu, p, itens, t.editavel); } catch (eD) { t.deslocamentoErro = String((eD && eD.message) || eD); }
    }
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
// 27/10/2026: busca sem acento e por partes (Com_casaBusca_) no número, cliente, unidade, contato, responsável, título
// e nos itens (descrição e código do produto ou serviço). info.foraDoFiltro: quantas a busca acha em outras situações
// (a maior parte das propostas importadas está cancelada ou aprovada, fora de "Em andamento").
function ComP_textoBusca_(p) {
  var t = [Com_s_(p.NUMERO), ComP_rotulo_(p), Com_s_(p.CLIENTE_NOME), Com_s_(p.UNIDADE_NOME), Com_s_(p.CONTATO_NOME), Com_s_(p.RESPONSAVEL_NOME), Com_s_(p.TITULO)];
  var itens = Com_json_(p.ITENS_JSON, []);
  if (Array.isArray(itens)) itens.forEach(function (i) { if (i) t.push(Com_s_(i.descricao), Com_s_(i.codigo)); });
  return t;
}
function ComP_listar_(eu, filtro, info) {
  Com_exigir_(eu, 'FINANCEIRO', 'ver as propostas');
  var f = filtro || {}, sit = Com_up_(f.situacao) || (eu.financeiro ? 'APROVADA' : 'ABERTAS'), termos = Com_termosBusca_(f.busca), fora = 0;
  ComP_sincronizarEnvios_();
  var abertas = ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA', 'VENCIDA'];
  var l = ComP_lerPropostas_().filter(function (p) {
    if (!ComP_podeVer_(eu, p)) return false;
    if (f.oportunidadeId && Com_s_(p.OPORTUNIDADE_ID) !== Com_s_(f.oportunidadeId)) return false;
    if (f.responsavelId && eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== Com_s_(f.responsavelId)) return false;
    if (termos.length && !Com_casaBusca_(termos, ComP_textoBusca_(p))) return false;
    var s = Com_up_(p.SITUACAO);
    // 01/11/2026 (Comercial C4): AGUARDANDO_RESPOSTA = enviada ao cliente ou vencida sem resposta (caminho da entrada do Comercial)
    var fora_ = sit === 'ABERTAS' ? abertas.indexOf(s) < 0 : sit === 'AGUARDANDO_RESPOSTA' ? ['ENVIADA', 'VENCIDA'].indexOf(s) < 0 : (sit !== 'TODAS' && s !== sit);
    if (fora_) { if (termos.length) fora++; return false; }
    return true;
  });
  if (info) info.foraDoFiltro = fora;
  return l.map(function (p) { return ComP_paraTela_(eu, p, false); })
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
  t.revisoes = ComP_lerPropostas_().filter(function (x) { return Com_s_(x.NUMERO) === t.numero && Com_s_(x.ID) !== t.id && ComP_podeVer_(eu, x); })
    .map(function (x) { return { id: Com_s_(x.ID), rotulo: ComP_rotulo_(x), situacaoNome: COM_SITUACOES_PROP[Com_up_(x.SITUACAO)] || '' }; });
  var pol = null;
  if (eu.veValores) {
    var itensD = Com_json_(p.ITENS_JSON, []);
    var calc = ComP_calcular_(itensD, p.DESCONTO_GERAL);
    pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID), met, ComP_analise_(p, itensD));
    t.politica = { limite: pol.limite, limiteTxt: Com_pct_(pol.limite, 0), dentro: pol.dentro, motivos: pol.motivos, descontoPctTxt: Com_pct_(calc.descontoPct), exigeDiretoria: pol.exigeDiretoria };
  }
  t.podeDecidirDesconto = eu.gestao && t.situacao === 'AGUARDANDO_APROVACAO' && (t.responsavelId !== eu.id || eu.diretoria);
  t.podeAprovarDesconto = t.podeDecidirDesconto && (!(pol && pol.exigeDiretoria) || eu.diretoria || eu.perfil === 'ADMIN');
  t.decisaoSoDiretoria = !!(pol && pol.exigeDiretoria);
  t.contatosCliente = (eu.gestao || eu.vendedor) ? ComCt_listar_(t.clienteId, t.unidadeId) : [];
  if (t.passagem && t.passagem.length) t.passagem = ComP_situacaoPassagem_(t.passagem);
  // 31/10/2026 (pedido do dono, Compras): compras ligadas a este pedido e o custo (valor só para quem vê valor em Compras)
  if (typeof Compras_doComercial_ === 'function') t.compras = Compras_doComercial_(eu.id, t.id);
  t.motivosRecusa = met.motivosPerda;
  // 29/10/2026: excluir (nunca foi ao cliente) ou só cancelar (já foi); a tela mostra o botão e, sem ele, o porquê
  if (eu.gestao || eu.vendedor) { var pe = ComP_podeExcluir_(eu, p); t.podeExcluir = pe.pode; if (!pe.pode && (eu.gestao || t.responsavelId === eu.id)) t.motivoSemExcluir = pe.motivo; }
  // 10/11/2026 (etapa 1): janela do link (e-mail do contato da proposta e os e-mails conhecidos do cliente) e a assinatura do
  // cliente feita antes desta versão, que ainda não mudou a proposta (botão "Registrar a assinatura do cliente")
  if (eu.gestao || eu.vendedor) { t.linkEmailSugerido = ComP_emailSugerido_(p); t.emailsDoCliente = ComCt_emailsDoCliente_(t.clienteId); }
  var acli = ComP_assinadaCliente_(p);
  t.assinadaCliente = !!acli;
  t.podeRegistrarAssinatura = !!acli && ['PRONTA', 'ENVIADA', 'VENCIDA'].indexOf(t.situacao) >= 0 && (eu.gestao || t.responsavelId === eu.id);
  t.tiposAceite = { PROPOSTA_ASSINADA: COM_TIPOS_ACEITE.PROPOSTA_ASSINADA, ORDEM_COMPRA: COM_TIPOS_ACEITE.ORDEM_COMPRA, EMAIL_APROVACAO: COM_TIPOS_ACEITE.EMAIL_APROVACAO };
  // 10/11/2026 (etapa 2, D16 e g): só o responsável assina pela Metrolab e envia o link; na hora de assinar, a assinatura cadastrada
  // dele ("Minha assinatura") aparece como opção, com a pré-visualização
  t.souResponsavel = t.responsavelId === eu.id;
  if (t.souResponsavel && t.situacao === 'PRONTA' && t.pdfId && !t.assinadaMetrolab) {
    try { var cadA = ComAss_ativa_(eu.id); if (cadA) { var cc = ComAss_conferida_(eu.id, 'mostrar a sua assinatura'); t.assinaturaCadastrada = { imagem: 'data:' + cc.tipo + ';base64,' + Utilities.base64Encode(cc.bytes), em: Com_br_(cadA.ENVIADA_EM), sha: cc.sha.slice(0, 16) }; } }
    catch (eA) { t.assinaturaCadastradaErro = String((eA && eA.message) || eA); }
  }
  return t;
}

// ------------------------------------------------------------
// CRIAÇÃO E RASCUNHO
// ------------------------------------------------------------
/** Itens da tela -> itens gravados (preço de tabela e custo vêm do catálogo; equipamento conferido na unidade). */
function ComP_itensDaTela_(lista, prop, eu, prazo) {
  var cat = {}, polIt = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null, pz = prazo || {};
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) { cat[Com_s_(p.ID)] = p; });
  var eqs = {};
  Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { eqs[Com_s_(e.ID)] = e; });
  var anteriores = {};
  Com_json_(prop.ITENS_JSON, []).forEach(function (i) { if (i.produtoId) anteriores[i.produtoId] = i; });
  var itens = (lista || []).slice(0, 80).map(function (i, k) {
    var desc = Com_texto_(i.descricao, 400);
    if (desc.length < 3) throw new Error('Não foi possível salvar a proposta: o item ' + (k + 1) + ' está sem descrição. Escreva o que será fornecido (ou escolha do catálogo)');
    var q = Com_num_(i.quantidade);
    if (!(q > 0)) throw new Error('Não foi possível salvar a proposta: a quantidade do item ' + (k + 1) + ' (' + desc.slice(0, 40) + ') precisa ser maior que zero');
    var pu = Com_num_(i.precoUnitario);
    // 01/11/2026: serviço com regra de preço (catálogo oficial) aceita o preço em branco: vale o da tabela pela regra
    var pRegra = i.produtoId && cat[Com_s_(i.produtoId)] && typeof ComCat_temRegra_ === 'function' && ComCat_temRegra_(cat[Com_s_(i.produtoId)]);
    if (!(pu >= 0) && pRegra && Com_s_(i.precoUnitario) === '') pu = 0;
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
    var tipoIt = COM_TIPOS_ITEM[Com_up_(i.tipo)] ? Com_up_(i.tipo) : (p ? Com_up_(p.TIPO) || 'SERVICO' : 'SERVICO');
    // 01/11/2026 (Comercial C2): faixa de prazo do item ('' = a da proposta). Prioritária desligada não entra.
    var faixa = Com_up_(i.faixa);
    if (faixa && polIt) {
      var fxIt = polIt.prazo.faixas.filter(function (x) { return x.codigo === faixa; })[0];
      if (!fxIt) throw new Error('Não foi possível salvar a proposta: a faixa de prazo "' + Com_s_(i.faixa) + '" do item ' + (k + 1) + ' não existe. Escolha Normal' + (polIt.prazo.faixas.some(function (x) { return x.ativa && x.codigo === 'URGENTE'; }) ? ' ou Urgente' : ''));
      if (!fxIt.ativa) throw new Error('Não foi possível salvar a proposta: a faixa ' + fxIt.nome + ' (item ' + (k + 1) + ') está desligada até a Diretoria aprovar (Metodologia > Preço e desconto). Escolha outra faixa para o item');
    }
    // preço de tabela normal guardado na época (a revisão não muda o preço de tabela); o da faixa sai dele
    var normal = p ? (ant && ant.precoTabelaNormal !== undefined ? Number(ant.precoTabelaNormal) : (ant && ant.precoTabela !== undefined ? Number(ant.precoTabela) : Number(p.PRECO) || 0)) : 0;
    var custoCat = p ? (typeof ComF_custoProduto_ === 'function' ? ComF_custoProduto_(p, polIt) : (Com_s_(p.CUSTO) === '' ? null : Number(p.CUSTO))) : null;
    var item = { ordem: k + 1, produtoId: p ? Com_s_(p.ID) : '', codigo: p ? Com_s_(p.CODIGO) : Com_texto_(i.codigo, 40), tipo: tipoIt,
      descricao: desc, detalhe: Com_texto_(i.detalhe, 800), equipamentoId: eqId, equipamentoTexto: eqTxt, unidade: Com_texto_(i.unidade, 20) || (p ? Com_s_(p.UNIDADE_MEDIDA) : '') || 'un.',
      quantidade: q, precoUnitario: Com_r2_(pu), faixa: faixa,
      precoTabelaNormal: normal,
      precoTabela: p ? (polIt ? ComPr_precoNaFaixa_(normal, polIt, faixa || pz.faixa, pz.licitacao, tipoIt) : normal) : 0,
      custoUnitario: custoCat !== null && custoCat !== undefined ? (ant && ant.custoUnitario !== undefined && ant.custoUnitario !== null ? ant.custoUnitario : custoCat) : null };
    // 28/10/2026: preço diferente da tabela do catálogo fica marcado no item (e no histórico, ComP_salvar_); abaixo da
    // tabela já conta como desconto na política. Item sem catálogo (avulso) não tem tabela para comparar.
    item.precoDiferente = !!(p && item.precoTabela > 0 && Math.abs(item.precoUnitario - item.precoTabela) > 0.004);
    // 01/11/2026: serviço do catálogo oficial (ou com parâmetros técnicos): preço pela regra, descrição gerada e a cópia congelada
    if (p && typeof ComCat_temRegra_ === 'function' && ComCat_temRegra_(p)) ComCat_aplicarNoItem_(item, i, p, ant, k, polIt, pz);
    return item;
  });
  ComP_conferirRepetidos_(itens);
  return itens;
}

/**
 * 10/11/2026 (etapa 2, pedido a / D19): o mesmo item do catálogo duas vezes na proposta (mesmo produto, mesmo equipamento, mesma
 * faixa de prazo e os mesmos parâmetros técnicos) não é aceito: a tela oferece somar à quantidade. Lança no padrão do operador.
 */
function ComP_conferirRepetidos_(itens) {
  var vistos = {};
  (itens || []).forEach(function (it, k) {
    if (!it.produtoId) return;
    var chave = [it.produtoId, Com_s_(it.equipamentoId), Com_up_(it.faixa), it.catalogo && it.catalogo.sel ? JSON.stringify(it.catalogo.sel) : ''].join('|');
    if (vistos[chave] === undefined) { vistos[chave] = k; return; }
    var j = vistos[chave];
    throw new Error('Não foi possível salvar a proposta: o item ' + (k + 1) + ' repete o item ' + (j + 1) + ' (' + (Com_s_(it.codigo) ? Com_s_(it.codigo) + ', ' : '') + Com_s_(it.descricao).slice(0, 60) + ')' +
      (it.equipamentoTexto ? ' para o mesmo equipamento (' + it.equipamentoTexto + ')' : ', sem equipamento') + ' e com o mesmo prazo. Por quê: o mesmo serviço duas vezes sai em duplicidade no documento e confunde o cliente e o faturamento. ' +
      'Como corrigir: some a quantidade no item ' + (j + 1) + ' e exclua o item ' + (k + 1) + ' (botão "Excluir item"); se for outro equipamento ou outro prazo, escolha-o no item');
  });
}

function ComP_modeloDosItens_(itens) {
  var t = {};
  // 29/10/2026: o item automático da viagem ou do frete não decide o tipo de orçamento
  itens.forEach(function (i) { if (!i.auto) t[i.tipo === 'PRODUTO' ? 'P' : 'S'] = true; });
  return t.P && t.S ? 'MISTO' : (t.P ? 'PRODUTOS' : 'SERVICOS');
}

/**
 * 28/10/2026 (dono): tipo de orçamento. O vendedor escolhe Serviço, Produto ou Serviço e produto (misto); sem escolha, vale o
 * automático pelos itens (como era: só produto = Produto; produto e serviço = Misto; senão Serviço). Proposta antiga (sem a
 * coluna TIPO_ORCAMENTO) deduz pelos itens. Devolve { tipo, nome, escolhido ('' = automático), sugerido }.
 */
var COM_TIPOS_ORCAMENTO = { SERVICOS: 'Serviço', PRODUTOS: 'Produto', MISTO: 'Serviço e produto (misto)' };
function ComP_tipoOrcamento_(p, itens) {
  itens = itens || Com_json_(p && p.ITENS_JSON, []) || [];
  var escolhido = COM_TIPOS_ORCAMENTO[Com_up_(p && p.TIPO_ORCAMENTO)] ? Com_up_(p.TIPO_ORCAMENTO) : '';
  var sugerido = itens.some(function (i) { return i && !i.auto; }) ? ComP_modeloDosItens_(itens) : (COM_TIPOS_ORCAMENTO[Com_up_(p && p.MODELO)] ? Com_up_(p.MODELO) : 'SERVICOS');
  var tipo = escolhido || sugerido;
  return { tipo: tipo, nome: COM_TIPOS_ORCAMENTO[tipo], escolhido: escolhido, sugerido: sugerido };
}

/**
 * Textos padrão do modelo (metodologia): { apresentacao, condicoes{}, responsabilidades, textoAceite }. SERVICOS usa os
 * textos de sempre; PRODUTOS e MISTO, as versões próprias (condição ausente no modelo vale a do serviço).
 */
function Com_modeloProposta_(tipo, met) {
  var pr = (met || Com_metodologia_()).proposta || {};
  var suf = tipo === 'PRODUTOS' ? 'Produto' : (tipo === 'MISTO' ? 'Misto' : '');
  var cond = Com_copia_(pr.condicoes || {});
  if (suf && pr['condicoes' + suf] && typeof pr['condicoes' + suf] === 'object') Object.keys(pr['condicoes' + suf]).forEach(function (k) { cond[k] = pr['condicoes' + suf][k]; });
  var t = function (k) { return suf && typeof pr[k + suf] === 'string' && Com_s_(pr[k + suf]) ? pr[k + suf] : Com_s_(pr[k]); };
  return { apresentacao: t('apresentacao'), condicoes: cond, responsabilidades: t('responsabilidades'), textoAceite: t('textoAceite') };
}

/**
 * Troca para o modelo do tipo os textos da proposta que ainda são o padrão de OUTRO modelo (apresentação e cada condição).
 * Texto mexido pelo vendedor (diferente de todos os padrões) e campo em branco ficam como estão. Devolve a lista do que trocou.
 */
function ComP_trocarTextosDoModelo_(tipo, campos, cond, met) {
  var norm = function (s) { return Com_s_(s).replace(/\s+/g, ' ').trim(); };
  var alvo = Com_modeloProposta_(tipo, met), outros = Object.keys(COM_TIPOS_ORCAMENTO).filter(function (k) { return k !== tipo; }).map(function (k) { return Com_modeloProposta_(k, met); });
  var trocou = [];
  var ehDeOutro = function (v, pega) { var n = norm(v); return !!n && outros.some(function (m) { var x = norm(pega(m)); return x === n && x !== norm(pega(alvo)); }); };
  if (ehDeOutro(campos.APRESENTACAO, function (m) { return m.apresentacao; })) { campos.APRESENTACAO = alvo.apresentacao; trocou.push('apresentação'); }
  var rot = { pagamento: 'pagamento', prazoExecucao: 'prazo', garantia: 'garantia', frete: 'frete', impostos: 'impostos', local: 'local', gerais: 'condições gerais' };
  Object.keys(alvo.condicoes).forEach(function (k) {
    if (ehDeOutro(cond[k], function (m) { return m.condicoes[k]; })) { cond[k] = Com_s_(alvo.condicoes[k]); trocou.push(rot[k] || k); }
  });
  return trocou;
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
    // 29/10/2026: custos da viagem e do frete (SGO_Comercial_Precificacao.js). Os itens automáticos ("Despesas de deslocamento
    // e estadia", "Frete e entrega") são refeitos aqui a cada gravação a partir do cálculo: a tela não manda nem muda esses itens.
    var polPr = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null;
    // 01/11/2026 (Comercial C2): faixa de prazo da proposta inteira ({ faixa, licitacao }); não veio = como estava
    var prazoAnt = Com_json_(p.PRAZO_JSON, null), prazo = prazoAnt ? Com_copia_(prazoAnt) : { faixa: 'NORMAL', licitacao: false };
    if (d.prazo && typeof d.prazo === 'object') {
      if (d.prazo.faixa !== undefined) {
        var fxP = polPr ? polPr.prazo.faixas.filter(function (x) { return x.codigo === Com_up_(d.prazo.faixa); })[0] : { codigo: Com_up_(d.prazo.faixa) || 'NORMAL', ativa: true };
        if (!fxP) throw new Error('Não foi possível salvar: a faixa de prazo "' + Com_s_(d.prazo.faixa) + '" não existe. Escolha Normal ou Urgente');
        if (!fxP.ativa) throw new Error('Não foi possível salvar: a faixa ' + fxP.nome + ' está desligada até a Diretoria aprovar (Metodologia > Preço e desconto). Escolha outra faixa');
        prazo.faixa = fxP.codigo;
      }
      if (d.prazo.licitacao !== undefined) prazo.licitacao = d.prazo.licitacao === true || Com_up_(d.prazo.licitacao) === 'SIM' || Com_up_(d.prazo.licitacao) === 'TRUE';
    }
    var itens = ComP_itensDaTela_((d.itens || []).filter(function (i) { return !(i && i.auto); }), p, eu, prazo);
    var desl = null, deslAnt = Com_json_(p.DESLOCAMENTO_JSON, null);
    if (polPr && (d.deslocamento !== undefined || deslAnt)) {
      desl = ComPr_normalizar_(d.deslocamento, deslAnt, polPr, { eu: eu });
      itens = itens.concat(ComPr_itensAuto_(desl, polPr));
      itens.forEach(function (i, k) { i.ordem = k + 1; });
    }
    // 01/11/2026 (decisão do dono): o desconto geral é sobre os serviços e produtos; o deslocamento e o frete (repasse) ficam fora
    var liquido = itens.reduce(function (s, i) { return s + (i.auto ? 0 : i.quantidade * i.precoUnitario); }, 0);
    var dg = Com_s_(d.descontoPct) !== '' && Com_s_(d.descontoGeral) === '' ? liquido * (Com_num_(d.descontoPct) || 0) / 100 : Com_num_(d.descontoGeral);
    if (!(dg >= 0)) dg = 0;
    if (dg > liquido + 0.004) throw new Error('Não foi possível salvar: o desconto geral (' + Com_moeda_(dg) + ') é maior que a soma dos serviços e produtos (' + Com_moeda_(liquido) + '). O deslocamento e o frete são repasse de custo e não recebem desconto. Corrija o desconto');
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
    // 28/10/2026: tipo de orçamento (Serviço | Produto | Misto; '' ou AUTO = automático pelos itens). Não veio: fica como estava.
    var tipoEsc = d.tipoOrcamento === undefined ? Com_up_(p.TIPO_ORCAMENTO) : Com_up_(d.tipoOrcamento);
    if (tipoEsc === 'AUTO' || tipoEsc === 'AUTOMATICO') tipoEsc = '';
    if (tipoEsc && !COM_TIPOS_ORCAMENTO[tipoEsc]) throw new Error('Não foi possível salvar: o tipo de orçamento "' + tipoEsc + '" não existe. Escolha Serviço, Produto, Serviço e produto (misto) ou Automático pelos itens');
    var tipoAntes = ComP_tipoOrcamento_(p), tipoNovo = ComP_tipoOrcamento_({ TIPO_ORCAMENTO: tipoEsc, MODELO: p.MODELO }, itens);
    var campos = { TITULO: Com_texto_(d.titulo, 200) || Com_s_(p.TITULO), ESCOPO: d.escopo === undefined ? Com_s_(p.ESCOPO) : Com_texto_(d.escopo, 8000), APRESENTACAO: d.apresentacao === undefined ? Com_s_(p.APRESENTACAO) : Com_texto_(d.apresentacao, 4000), ITENS_JSON: JSON.stringify(itens),
      CONDICOES_JSON: '', VALIDADE_DIAS: val, VALIDA_ATE: Com_somarDias_(Com_hoje_(), val), MODELO: tipoNovo.tipo, TIPO_ORCAMENTO: tipoEsc,
      SUBTOTAL: calc.subtotal, DESCONTO_GERAL: calc.descontoGeral, TOTAL: calc.total, DESCONTO_PCT: calc.descontoPct, MARGEM_PCT: calc.margemPct === null ? '' : calc.margemPct, CUSTO_TOTAL: calc.custoTotal,
      ATUALIZADO_EM: Com_agora_() };
    // texto que ainda é o padrão de outro modelo vira o padrão do modelo do tipo (o que o vendedor escreveu fica)
    var trocados = ComP_trocarTextosDoModelo_(tipoNovo.tipo, campos, cond);
    // 01/11/2026 (Comercial C2): o prazo de execução segue a faixa escolhida. Texto escrito pelo vendedor (diferente do padrão de
    // todos os modelos e do texto automático anterior) fica como está.
    if (polPr) {
      var txtPrazo = ComP_tipoOrcamento_({ TIPO_ORCAMENTO: tipoEsc, MODELO: p.MODELO }, itens).tipo === 'PRODUTOS' ? '' : ComPr_textoPrazo_(polPr, prazo, itens);
      var normP = function (x) { return Com_s_(x).replace(/\s+/g, ' ').trim(); };
      var padroesPrazo = Object.keys(COM_TIPOS_ORCAMENTO).map(function (k) { return normP(Com_modeloProposta_(k).condicoes.prazoExecucao); });
      var ehAuto = function (x) { return /^Prazo (normal|urgente|priorit[aá]ria)/i.test(normP(x)); };
      if (txtPrazo && (!normP(cond.prazoExecucao) || padroesPrazo.indexOf(normP(cond.prazoExecucao)) >= 0 || ehAuto(cond.prazoExecucao))) cond.prazoExecucao = txtPrazo;
    }
    campos.CONDICOES_JSON = JSON.stringify(cond);
    // revisão da C2: retrato das faixas em vigor na gravação (nome, dias úteis, acréscimo, até onde o prazo conta). O documento e a
    // tela da proposta usam o retrato: a Diretoria mudar as faixas depois não muda o prazo de proposta já gravada ou enviada.
    if (polPr) prazo.politica = ComPr_retratoPrazo_(polPr);
    campos.PRAZO_JSON = JSON.stringify(prazo);
    if (ct) { campos.CONTATO_ID = ct.ID; campos.CONTATO_NOME = Com_s_(ct.NOME); }
    if (desl) campos.DESLOCAMENTO_JSON = JSON.stringify(desl);
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    var avisoTipo = '';
    if (tipoNovo.tipo !== tipoAntes.tipo || tipoEsc !== Com_up_(p.TIPO_ORCAMENTO)) {
      avisoTipo = ' Tipo de orçamento: ' + tipoNovo.nome + (tipoEsc ? '' : ' (automático pelos itens)') + '.' + (trocados.length ? ' Textos padrão trocados para o modelo de ' + tipoNovo.nome.toLowerCase() + ': ' + trocados.join(', ') + '.' : '');
      Com_historico_('PROPOSTA', p.ID, 'TIPO_ORCAMENTO', eu, { de: tipoAntes.nome, para: tipoNovo.nome, texto: Com_s_(avisoTipo) });
    } else if (trocados.length) avisoTipo = ' Textos padrão ajustados ao modelo de ' + tipoNovo.nome.toLowerCase() + ': ' + trocados.join(', ') + '.';
    var difs = itens.filter(function (i) { return i.precoDiferente; }), avulsos = itens.filter(function (i) { return !i.produtoId; }).length;
    Com_historico_('PROPOSTA', p.ID, 'RASCUNHO', eu, { texto: Com_plural_(itens.length, 'item', 'itens') + '; total ' + Com_moeda_(calc.total) + '; desconto ' + Com_pct_(calc.descontoPct) + '.' +
      (difs.length ? ' Preço diferente do catálogo: ' + difs.slice(0, 10).map(function (i) { return (i.codigo || i.descricao.slice(0, 40)) + ' (tabela ' + Com_moeda_(i.precoTabela) + ', proposta ' + Com_moeda_(i.precoUnitario) + ')'; }).join('; ') + (difs.length > 10 ? '; e mais ' + (difs.length - 10) : '') + '.' : '') +
      (avulsos ? ' ' + Com_plural_(avulsos, 'item avulso', 'itens avulsos') + ' (fora do catálogo).' : '') });
    var novo = Object.assign({}, p, campos);
    var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID), null, ComP_analise_(novo, itens));
    if (desl) {
      var cv = ComPr_calcularViagem_(desl, polPr), cvAnt = deslAnt ? ComPr_calcularViagem_(deslAnt, polPr) : { custo: -1 };
      if (cv.ha && (Math.abs(cv.custo - cvAnt.custo) > 0.004 || !deslAnt || deslAnt.repasse !== desl.repasse)) Com_historico_('PROPOSTA', p.ID, 'CUSTOS_VIAGEM', eu, { texto: 'Custos da viagem: ' + Com_moeda_(cv.custo) + ' (' + Com_plural_(cv.pessoas, 'pessoa', 'pessoas') + ', ' + Com_plural_(desl.viagem.viagens, 'viagem', 'viagens') + ', ' +
        (desl.viagem.kmTrecho === null ? 'km a informar' : desl.viagem.kmTrecho + ' km o trecho') + '); repasse: ' + (desl.repasse === 'ITEM' ? 'item separado' : 'diluído nos serviços') + '.' });
    }
    var ck = desl || polPr ? (typeof ComPr_checklist_ === 'function' ? ComPr_checklist_(desl, tipoNovo.tipo, polPr) : { ok: true, faltas: [] }) : { ok: true, faltas: [] };
    return { proposta: ComP_paraTela_(eu, novo, true), politica: { dentro: pol.dentro, motivos: pol.motivos, exigeDiretoria: pol.exigeDiretoria }, checklist: ck,
      message: 'Rascunho salvo.' + avisoTipo + (pol.dentro ? '' : ' Atenção: ' + pol.motivos.join('; ') + '. Ao concluir, a proposta vai para a aprovação ' + (pol.exigeDiretoria ? 'da Diretoria.' : 'do gestor comercial.')) +
        (ck.ok ? '' : ' Custos da viagem e do frete: ' + Com_plural_(ck.faltas.length, 'item do checklist falta', 'itens do checklist faltam') + ' (a proposta só conclui com o checklist completo).') };
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
    var itensC = Com_json_(p.ITENS_JSON, []);
    // 01/11/2026: catálogo oficial: escopo além do pacote-base precisa do motivo do ajuste; receita obrigatória escolhida
    var errCat = typeof ComCat_errosConcluir_ === 'function' ? ComCat_errosConcluir_(itensC) : [];
    if (errCat.length) throw new Error('Não foi possível concluir a proposta ' + ComP_rotulo_(p) + ': ' + errCat.join('; ') + '. Ajuste no passo 1 (Itens), salve e toque em Concluir de novo');
    var calc = ComP_calcular_(itensC, p.DESCONTO_GERAL);
    // 29/10/2026: margem da política de precificação (impostos e viagem) entra na mesma alçada; abaixo da mínima, só a Diretoria
    var xPr = typeof ComPr_daProposta_ === 'function' ? ComPr_daProposta_(p, null, itensC) : null;
    var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID), null, xPr && xPr.analise);
    var agora = Com_agora_(), campos = { REVISAO_GESTORA_JSON: JSON.stringify({ em: agora, erros: rev.erros, alertas: rev.alertas }), ATUALIZADO_EM: agora };
    if (xPr) campos.PRECIFICACAO_JSON = JSON.stringify(ComPr_fotografia_(xPr, ComPr_politica_()));
    var podeExcecao = eu.gestao && (Com_s_(p.RESPONSAVEL_ID) !== eu.id || eu.diretoria || eu.perfil === 'ADMIN') && (!pol.exigeDiretoria || eu.diretoria || eu.perfil === 'ADMIN');
    var msg;
    if (pol.dentro) {
      campos.SITUACAO = 'PRONTA'; campos.DESCONTO_SITUACAO = 'DENTRO';
      msg = 'Proposta pronta. Toque em "Gerar documento" para salvar a folha A4 na pasta do cliente e depois em "Enviar ao cliente".';
    } else if (podeExcecao) {
      var just = Com_texto_(d.justificativa, 1000);
      if (just.length < 10) throw new Error('Não foi possível concluir: ' + pol.motivos.join('; ') + '. Como ' + (pol.exigeDiretoria ? 'Diretoria' : 'gestão comercial') + ', você pode passar do limite, mas o motivo da exceção fica registrado. Escreva o motivo (pelo menos 10 letras) e toque em Concluir de novo');
      campos.SITUACAO = 'PRONTA'; campos.DESCONTO_SITUACAO = 'EXCECAO_GESTAO'; campos.DESCONTO_MOTIVO = just; campos.DESCONTO_DECISAO_POR_ID = eu.id; campos.DESCONTO_DECISAO_POR_NOME = eu.nome; campos.DESCONTO_DECISAO_EM = agora;
      campos.DESCONTO_DECISAO_TEXTO = (pol.exigeDiretoria ? 'Exceção da Diretoria (margem abaixo da mínima): ' : 'Exceção da gestão comercial: ') + just;
      msg = 'Proposta pronta, com a exceção ' + (pol.exigeDiretoria ? 'da Diretoria' : 'da gestão') + ' registrada.';
    } else {
      var j = Com_texto_(d.justificativa, 1000);
      var quem = pol.exigeDiretoria ? 'da Diretoria (a margem ficou abaixo da mínima da política de precificação)' : 'do gestor comercial';
      if (j.length < 10) throw new Error('A proposta tem ' + pol.motivos.join(' e ') + '. Ela pode seguir, mas precisa da aprovação ' + quem + ' antes do envio. Escreva por que ' + (pol.exigeDiretoria ? 'este preço' : 'este desconto') + ' é necessário (pelo menos 10 letras, por exemplo "Cliente com 3 propostas de concorrentes; contrato anual") e toque em Concluir de novo' +
        (pol.exigeDiretoria ? '. Se preferir, ajuste o preço dos serviços ou o repasse da viagem e conclua de novo' : ''));
      campos.SITUACAO = 'AGUARDANDO_APROVACAO'; campos.DESCONTO_SITUACAO = 'PEDIDO'; campos.DESCONTO_MOTIVO = j; campos.DESCONTO_PEDIDO_EM = agora;
      msg = pol.exigeDiretoria ? 'Pedido de aprovação enviado à Diretoria (margem abaixo da mínima). A proposta não pode ser enviada até a decisão; você é avisado no sistema.'
        : 'Pedido de aprovação enviado à gestão comercial (Caixa de decisões). A proposta não pode ser enviada até a decisão; você é avisado no sistema.';
      if (pol.exigeDiretoria) {
        var usD = Com_usuarios_();
        Object.keys(usD).filter(function (id) { return usD[id].ativo && (usD[id].perfil === 'DIRETORIA' || Com_ehDono_(usD[id].login)) && id !== eu.id; }).forEach(function (id) {
          Com_avisar_(id, 'MARGEM_DIRETORIA', 'Margem abaixo da mínima: ' + ComP_rotulo_(p) + ' aguarda a sua decisão', Com_s_(p.CLIENTE_NOME) + ': ' + eu.nome + ' pediu aprovação. Motivo: ' + j + ' Abra a proposta em Comercial > Propostas e aprove ou negue com a fundamentação.', { tipo: 'proposta', id: p.ID }, { email: true });
        });
      }
    }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    // 01/11/2026 (Comercial C3): proposta concluída entra no banco de preços (em aberto); nunca impede a conclusão
    if (typeof ComBP_registrarProposta_ === 'function') ComBP_registrarProposta_(Object.assign({}, p, campos), 'EM_ABERTO');
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
    // 29/10/2026: margem abaixo da mínima da política de precificação: só a Diretoria (ou o Administrador) aprova
    if (d.aprovar === true && !(eu.diretoria || eu.perfil === 'ADMIN')) {
      var itensDD = Com_json_(p.ITENS_JSON, []);
      var polDD = ComP_avaliarPolitica_(ComP_calcular_(itensDD, p.DESCONTO_GERAL), Com_s_(p.RESPONSAVEL_ID), null, ComP_analise_(p, itensDD));
      if (polDD.exigeDiretoria) throw new Error('Não foi possível aprovar: a margem da proposta ficou abaixo da mínima da política de precificação, e essa exceção é da Diretoria. Você pode negar (a proposta volta para o vendedor ajustar) ou pedir à Diretoria para decidir');
    }
    var agora = Com_agora_(), aprovar = d.aprovar === true;
    var campos = { SITUACAO: aprovar ? 'PRONTA' : 'RASCUNHO', DESCONTO_SITUACAO: aprovar ? 'APROVADO' : 'NEGADO', DESCONTO_DECISAO_POR_ID: eu.id, DESCONTO_DECISAO_POR_NOME: eu.nome,
      DESCONTO_DECISAO_EM: agora, DESCONTO_DECISAO_TEXTO: texto, ATUALIZADO_EM: agora };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, aprovar ? 'DESCONTO_APROVADO' : 'DESCONTO_NEGADO', eu, { de: 'Aguardando aprovação', para: aprovar ? 'Pronta para enviar' : 'Rascunho', texto: texto });
    Com_avisar_(p.RESPONSAVEL_ID, aprovar ? 'DESCONTO_APROVADO' : 'DESCONTO_NEGADO', (aprovar ? 'Desconto aprovado: ' : 'Desconto não aprovado: ') + ComP_rotulo_(p),
      eu.nome + (aprovar ? ' aprovou o desconto da proposta. Ela está pronta para gerar o documento e enviar. ' : ' não aprovou o desconto. A proposta voltou para rascunho para ajuste. ') + 'Fundamentação: ' + texto, { tipo: 'proposta', id: p.ID });
    // 01/11/2026: ato irreversível avisa na hora o gestor da área e a Diretoria (SGO_Avisos_Gestao.js), depois de soltar a trava do módulo
    if (!aprovar) Com_depois_(function () { if (typeof SGO_avisoGestaoIrreversivel_ === 'function') SGO_avisoGestaoIrreversivel_({ evento: 'GI01', modulo: 'comercial', quem: eu, oque: 'Desconto não aprovado', item: 'proposta ' + ComP_rotulo_(p) + (Com_s_(p.CLIENTE_NOME) ? ' (' + Com_s_(p.CLIENTE_NOME) + ')' : ''), motivo: texto,
      tela: { tipo: 'comercial', aba: 'propostas', id: p.ID }, refId: 'PROP-DESC-NEG-' + p.ID + '-' + agora }); });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), message: aprovar ? 'Desconto aprovado. O vendedor foi avisado.' : 'Desconto não aprovado: a proposta voltou para rascunho e o vendedor foi avisado.' };
  });
}

/** Voltar para rascunho (antes do envio). */
// 29/10/2026: é o "Editar" da proposta aguardando aprovação ou pronta (ainda não enviada). Só o responsável ou a gestão.
function ComP_voltarRascunho_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'voltar a proposta para rascunho');
  ComP_sincronizarEnvios_(); // envio registrado há pouco pelo "Enviar documento" conta
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d && d.id, 'voltar para rascunho');
    var s = Com_up_(p.SITUACAO);
    if (['AGUARDANDO_APROVACAO', 'PRONTA'].indexOf(s) < 0) throw new Error('Não foi possível editar: a proposta está "' + (COM_SITUACOES_PROP[s] || s) + '". ' + (s === 'RASCUNHO' ? 'O rascunho já está aberto para edição' : 'Depois do envio ao cliente, use "Nova revisão" (o número continua o mesmo)'));
    if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível editar: a proposta é de ' + p.RESPONSAVEL_NOME + '. Só o responsável ou a gestão comercial editam');
    var assinatura = ComP_assinadaCliente_(p);
    if (assinatura) throw new Error(ComP_msgAssinada_(p, assinatura, 'editar'));
    // 10/11/2026 (etapa 2, D14): link de assinatura ativo e ainda não assinado: voltar para rascunho cancela o link (o documento muda).
    // Exige a confirmação explícita (d.cancelarLink) e registra no histórico para quem o link tinha ido.
    var props = PropertiesService.getScriptProperties(), chaveA = 'COM_ASS_RESP_' + p.ID, aL = Com_s_(p.PDF_ID) ? ComP_assRegistro_(p.ID) : null;
    var linkAtivo = aL && aL.linkHash && !aL.finalPdfId && Com_s_(aL.pdfId) === Com_s_(p.PDF_ID) ? { email: Com_s_(p.LINK_EMAIL) || Com_s_(aL.clienteEmailEsperado) || 'o cliente', em: Com_s_(p.LINK_ENVIADO_EM) || Com_s_(aL.linkEnviadoEm) } : null;
    if (linkAtivo && !(d && d.cancelarLink === true)) throw new Error('Não foi possível voltar para rascunho sem a sua confirmação: há um link de assinatura ativo, enviado para ' + linkAtivo.email + (linkAtivo.em ? ' em ' + Com_br_(linkAtivo.em) : '') +
      '. Ao voltar para rascunho, o link enviado para ' + linkAtivo.email + ' deixa de abrir (o cliente vê "link indisponível"). Confirme na janela para continuar; depois de corrigir, gere o documento, assine e envie um link novo');
    var agoraR = Com_agora_();
    if (linkAtivo) {
      props.deleteProperty('COM_ASS_LINK_' + aL.linkHash);
      aL.linkHash = ''; aL.linkCanceladoEm = agoraR; aL.linkCanceladoPorId = eu.id; aL.linkCanceladoMotivo = 'Proposta voltou para rascunho';
      props.setProperty(chaveA, JSON.stringify(aL));
    }
    var campos = { SITUACAO: 'RASCUNHO', DESCONTO_SITUACAO: 'DENTRO', DESCONTO_PEDIDO_EM: '', ATUALIZADO_EM: agoraR,
      PDF_ID: '', PDF_URL: '', HTML_ID: '', HTML_URL: '', MARCA_CONTEUDO: '', CONGELADO_JSON: '', GERADA_EM: '', ARQUIVO_NOME: '' };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    var txtLink = linkAtivo ? ' O link de assinatura enviado para ' + linkAtivo.email + (linkAtivo.em ? ' em ' + Com_br_(linkAtivo.em) : '') + ' foi cancelado e deixa de abrir (confirmado por ' + eu.nome + ').' : '';
    Com_historico_('PROPOSTA', p.ID, 'RASCUNHO', eu, { de: COM_SITUACOES_PROP[s], para: 'Rascunho', texto: 'Voltou para rascunho' + (Com_s_(p.PDF_ID) ? ' (o documento gerado antes continua na pasta; ao gerar de novo, sai um arquivo novo)' : '') + '.' + txtLink });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), message: 'A proposta voltou para rascunho. Ao concluir de novo, a política de desconto é conferida outra vez.' + txtLink };
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
  // 28/10/2026: os termos e condições vigentes vão congelados no documento (a versão e o texto). O documento só é gerado
  // antes do envio (proposta pronta); depois de enviada, a proposta guarda esta cópia, e mudar o padrão não a altera.
  var tv = Com_termosVigentes_();
  cong.termos = { versao: tv.versao, texto: tv.texto, concordancia: tv.concordancia, desde: tv.desde };
  var conteudo = { numero: p.NUMERO, revisao: p.REVISAO, itens: Com_json_(p.ITENS_JSON, []), condicoes: Com_json_(p.CONDICOES_JSON, {}), escopo: ComP_escopo_(p), apresentacao: Com_s_(p.APRESENTACAO), tipoOrcamento: ComP_tipoOrcamento_(p).tipo,
    total: Number(p.TOTAL), desconto: Number(p.DESCONTO_GERAL), validaAte: Com_dia_(p.VALIDA_ATE), cliente: cong.cliente, unidade: cong.unidade, contato: cong.contato, termos: cong.termos };
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
    var ass = Com_json_(PropertiesService.getScriptProperties().getProperty('COM_ASS_RESP_' + p.ID), null);
    if (ass && ass.pdfId === atual.PDF_ID) throw new Error('Já existe uma assinatura para este documento. Use Nova revisão.');
    if (Com_up_(atual.SITUACAO) !== 'PRONTA') throw new Error('Não foi possível registrar o documento: a proposta mudou de situação enquanto o documento era gerado. Atualize a tela');
    var campos = { CONGELADO_JSON: JSON.stringify(cong), MARCA_CONTEUDO: marca, PDF_ID: g.pdfId, HTML_ID: g.htmlId, PDF_URL: g.pdfUrl, HTML_URL: g.htmlUrl, PASTA_URL: pastaUrl,
      ARQUIVO_NOME: g.pdfNome, GERADA_EM: Com_agora_(), ATUALIZADO_EM: Com_agora_() };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, 'DOCUMENTO', eu, { texto: 'Folha A4 salva na pasta do cliente: ' + g.pdfNome + '. Marca de conferência ' + marca.slice(0, 16) + '.' +
      (Com_s_(cong.termos.texto) ? ' Termos e condições da contratação: versão ' + cong.termos.versao + ' (fica com esta proposta).' : '') });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, atual, campos), true), alertas: rev.alertas, pdfId: g.pdfId, htmlId: g.htmlId,
      message: 'Documento salvo na pasta do cliente (PDF e HTML A4). Agora toque em "Enviar ao cliente".' };
  });
}

// ------------------------------------------------------------
// MINHA ASSINATURA (imagem cadastrada) — 10/11/2026, etapa 2 (pedido g)
// ------------------------------------------------------------
/**
 * Cada pessoa do Comercial guarda a própria assinatura em imagem (PNG ou JPG, até 300 KB) em Comercial > Hoje > "Minha
 * assinatura". O arquivo fica privado na pasta "Comercial - Assinaturas"; COM_ASSINATURAS_USUARIO guarda uma linha por versão
 * (ATIVA, SUBSTITUIDA ou REMOVIDA) com o SHA-256 e a data. Nada é apagado. Na janela "Assinar pela Metrolab" o responsável pode
 * usar a assinatura cadastrada no lugar do desenho: o SHA é conferido de novo e o histórico registra que foi a cadastrada.
 */
var COM_ASS_MAX_BYTES = 300 * 1024;
var COM_PASTA_ASSINATURAS = 'Comercial - Assinaturas';

function ComAss_sha_(bytes) {
  if (typeof AstL_shaBytes_ === 'function') return AstL_shaBytes_(bytes);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function ComAss_privado_(arquivo) {
  if (typeof Ast_privado_ === 'function') { Ast_privado_(arquivo); return; }
  try { if (DriveApp.Access && DriveApp.Access.PRIVATE && arquivo.setSharing) arquivo.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
}
/** Tipo da imagem pelos primeiros bytes (não pelo nome): 'image/png', 'image/jpeg' ou ''. */
function ComAss_tipoDosBytes_(bytes) {
  var b = function (i) { return (Number(bytes[i]) || 0) & 255; };
  if (bytes.length > 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4E && b(3) === 0x47) return 'image/png';
  if (bytes.length > 3 && b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF) return 'image/jpeg';
  return '';
}
/** Linha ATIVA da pessoa (a mais recente) ou null. */
function ComAss_ativa_(usuarioId) {
  return Com_ler_(COM_ABAS.ASSINATURAS).filter(function (r) { return Com_s_(r.USUARIO_ID) === Com_s_(usuarioId) && Com_up_(r.SITUACAO) === 'ATIVA'; })
    .sort(function (a, b) { return String(b.ENVIADA_EM).localeCompare(String(a.ENVIADA_EM)); })[0] || null;
}
/**
 * Bytes da assinatura ativa com o SHA conferido. { linha, bytes, tipo, sha }. Lança no padrão do operador se não houver
 * assinatura ou se o arquivo mudou (o SHA não confere).
 */
function ComAss_conferida_(usuarioId, acao) {
  var l = ComAss_ativa_(usuarioId);
  if (!l) throw new Error('Não foi possível ' + acao + ': você não tem assinatura cadastrada. Cadastre em Comercial > Hoje > "Minha assinatura" ou assine no quadro');
  var bytes;
  try { bytes = DriveApp.getFileById(Com_s_(l.ARQUIVO_ID)).getBlob().getBytes(); } catch (e) { throw new Error('Não foi possível ' + acao + ': o arquivo da sua assinatura cadastrada não abriu. Envie a imagem de novo em "Minha assinatura" ou assine no quadro'); }
  var sha = ComAss_sha_(bytes);
  if (sha !== Com_s_(l.SHA256)) throw new Error('Não foi possível ' + acao + ': o arquivo da sua assinatura cadastrada não confere com o registrado (SHA-256 diferente). Por segurança ele não é usado. Envie a imagem de novo em "Minha assinatura" ou assine no quadro');
  return { linha: l, bytes: bytes, tipo: Com_s_(l.TIPO) === 'image/jpeg' ? 'image/jpeg' : 'image/png', sha: sha };
}
/** Tela "Minha assinatura": a ativa (com a imagem) e o histórico das versões. */
function ComAss_minha_(eu) {
  Com_exigir_(eu, 'VENDEDOR', 'abrir a sua assinatura');
  var l = Com_ler_(COM_ABAS.ASSINATURAS).filter(function (r) { return Com_s_(r.USUARIO_ID) === eu.id; }).sort(function (a, b) { return String(b.ENVIADA_EM).localeCompare(String(a.ENVIADA_EM)); });
  var atual = null, ativa = l.filter(function (r) { return Com_up_(r.SITUACAO) === 'ATIVA'; })[0];
  if (ativa) {
    try { var c = ComAss_conferida_(eu.id, 'mostrar a sua assinatura'); atual = { id: Com_s_(ativa.ID), tipo: c.tipo, em: Com_br_(ativa.ENVIADA_EM), sha: c.sha, tamanhoKb: Math.ceil((Number(ativa.TAMANHO) || c.bytes.length) / 1024), imagem: 'data:' + c.tipo + ';base64,' + Utilities.base64Encode(c.bytes) }; }
    catch (e) { atual = { id: Com_s_(ativa.ID), em: Com_br_(ativa.ENVIADA_EM), erro: String((e && e.message) || e) }; }
  }
  var nomes = { ATIVA: 'Em uso', SUBSTITUIDA: 'Substituída', REMOVIDA: 'Removida' };
  return { assinatura: atual, maxKb: COM_ASS_MAX_BYTES / 1024, historico: l.map(function (r) { return { em: Com_br_(r.ENVIADA_EM), situacao: nomes[Com_up_(r.SITUACAO)] || Com_s_(r.SITUACAO), tipo: Com_s_(r.TIPO) === 'image/jpeg' ? 'JPG' : 'PNG', sha: Com_s_(r.SHA256).slice(0, 16),
    fim: Com_br_(r.SUBSTITUIDA_EM || r.REMOVIDA_EM) }; }) };
}
/** Enviar (ou trocar) a assinatura. d: { imagem: 'data:image/png;base64,...' ou 'data:image/jpeg;base64,...' }. A anterior fica SUBSTITUIDA. */
function ComAss_salvar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'cadastrar a sua assinatura');
  var img = Com_s_(d && d.imagem), m = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(img);
  if (!m) throw new Error('Não foi possível guardar a assinatura: envie uma imagem PNG ou JPG (foto ou digitalização da sua assinatura em fundo branco)');
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > COM_ASS_MAX_BYTES) throw new Error('Não foi possível guardar a assinatura: a imagem tem ' + Math.ceil(bytes.length / 1024) + ' KB e o limite é ' + (COM_ASS_MAX_BYTES / 1024) + ' KB. Recorte só a assinatura ou salve com qualidade menor e envie de novo');
  var tipo = ComAss_tipoDosBytes_(bytes);
  if (!tipo) throw new Error('Não foi possível guardar a assinatura: o arquivo não é uma imagem PNG ou JPG válida (o conteúdo não confere com o tipo). Salve a imagem de novo como PNG ou JPG e envie');
  Com_garantirAbas_();
  return Com_comTrava_(function () {
    var agora = Com_agora_(), sha = ComAss_sha_(bytes), ext = tipo === 'image/jpeg' ? 'jpg' : 'png';
    var pasta = SGO_DocSalvar_pastaPersistente_('COM_PASTA_ASSINATURAS_ID', COM_PASTA_ASSINATURAS, '');
    var arq = pasta.createFile(Utilities.newBlob(bytes, tipo, 'Assinatura - ' + eu.nome + ' - ' + agora.replace(/[^0-9]/g, '') + '.' + ext));
    ComAss_privado_(arq);
    var anteriores = Com_ler_(COM_ABAS.ASSINATURAS).filter(function (r) { return Com_s_(r.USUARIO_ID) === eu.id && Com_up_(r.SITUACAO) === 'ATIVA'; });
    anteriores.forEach(function (r) { SGO_DATA.update(COM_ABAS.ASSINATURAS, r.ID, { SITUACAO: 'SUBSTITUIDA', SUBSTITUIDA_EM: agora }); });
    var l = SGO_DATA.insert(COM_ABAS.ASSINATURAS, { USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, ARQUIVO_ID: arq.getId(), ARQUIVO_NOME: arq.getName(), TIPO: tipo, SHA256: sha, TAMANHO: bytes.length, SITUACAO: 'ATIVA', ENVIADA_EM: agora });
    Com_historico_('ASSINATURA_USUARIO', eu.id, anteriores.length ? 'ASSINATURA_TROCADA' : 'ASSINATURA_CADASTRADA', eu, { texto: (anteriores.length ? 'Assinatura em imagem trocada' : 'Assinatura em imagem cadastrada') + ' (' + ext.toUpperCase() + ', ' + Math.ceil(bytes.length / 1024) + ' KB, SHA-256 ' + sha.slice(0, 16) + '…).' + (anteriores.length ? ' A anterior ficou guardada como substituída.' : '') });
    return { id: Com_s_(l.ID), message: (anteriores.length ? 'Assinatura trocada.' : 'Assinatura cadastrada.') + ' Ela aparece na janela "Assinar pela Metrolab" como opção; você continua podendo assinar no quadro. A versão anterior fica guardada no histórico.' };
  });
}
/** Remover a assinatura em uso (fica REMOVIDA; o arquivo e o registro continuam guardados). */
function ComAss_remover_(eu) {
  Com_exigir_(eu, 'VENDEDOR', 'remover a sua assinatura');
  return Com_comTrava_(function () {
    var agora = Com_agora_(), l = Com_ler_(COM_ABAS.ASSINATURAS).filter(function (r) { return Com_s_(r.USUARIO_ID) === eu.id && Com_up_(r.SITUACAO) === 'ATIVA'; });
    if (!l.length) throw new Error('Não foi possível remover: você não tem assinatura cadastrada em uso');
    l.forEach(function (r) { SGO_DATA.update(COM_ABAS.ASSINATURAS, r.ID, { SITUACAO: 'REMOVIDA', REMOVIDA_EM: agora, REMOVIDA_POR_NOME: eu.nome }); });
    Com_historico_('ASSINATURA_USUARIO', eu.id, 'ASSINATURA_REMOVIDA', eu, { texto: 'Assinatura em imagem removida (SHA-256 ' + Com_s_(l[0].SHA256).slice(0, 16) + '…). O registro e o arquivo continuam guardados; as propostas já assinadas não mudam.' });
    return { message: 'Assinatura removida. As propostas já assinadas não mudam; para assinar, use o quadro ou cadastre uma nova imagem.' };
  });
}

/**
 * Registra a assinatura do responsável sobre a cópia conferida na tela. d: { id, pdfId, marca, concordo, assinatura (PNG do quadro) }
 * ou, 10/11/2026 (etapa 2, pedido g), d.usarCadastrada = true: usa a imagem de "Minha assinatura" (PNG ou JPG), com o SHA-256
 * conferido de novo; "Li e concordo" e a conferência do PDF e da marca continuam obrigatórios. O histórico diz qual foi usada.
 */
function ComP_assinarResponsavel_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'assinar pela Metrolab');
  d = d || {};
  var cadastrada = d.usarCadastrada === true;
  var imagem = Com_s_(d.assinatura);
  if (d.concordo !== true || (!cadastrada && (imagem.length > 200000 || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$/.test(imagem)))) {
    throw new Error(cadastrada ? 'Confira a proposta e marque a concordância antes de usar a sua assinatura cadastrada.' : 'Confira a proposta, marque a concordância e assine no quadro.');
  }
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'assinar pela Metrolab');
    if (Com_s_(p.RESPONSAVEL_ID) !== Com_s_(eu.id)) throw new Error('A assinatura é do responsável comercial desta proposta.');
    var pdf = Com_s_(p.PDF_ID), marca = Com_s_(p.MARCA_CONTEUDO);
    if (Com_up_(p.SITUACAO) !== 'PRONTA' || !pdf || !marca || pdf !== Com_s_(d.pdfId) || marca !== Com_s_(d.marca)) {
      throw new Error('Abra o PDF atualizado da proposta pronta antes de assinar.');
    }
    var props = PropertiesService.getScriptProperties();
    var chave = 'COM_ASS_RESP_' + p.ID;
    var anterior = Com_json_(props.getProperty(chave), null);
    if (anterior && anterior.pdfId === pdf && anterior.marca === marca) return { em: anterior.em };
    var arquivo = DriveApp.getFileById(pdf);
    var cad = cadastrada ? ComAss_conferida_(eu.id, 'usar a sua assinatura cadastrada') : null;
    var bytes = cad ? cad.bytes : Utilities.base64Decode(imagem.slice('data:image/png;base64,'.length));
    var tipo = cad ? cad.tipo : 'image/png', ext = tipo === 'image/jpeg' ? 'jpg' : 'png';
    var pasta = arquivo.getParents().next();
    var img = pasta.createFile(Utilities.newBlob(bytes, tipo, 'Assinatura Metrolab - ' + ComP_rotulo_(p) + '.' + ext));
    Ast_privado_(img);
    var registro = { pdfId: pdf, marca: marca, revisao: p.REVISAO, usuarioId: eu.id, nome: eu.nome, em: Com_agora_(),
      assinaturaId: img.getId(), assinaturaSha: AstL_shaBytes_(bytes), assinaturaTipo: tipo, origem: cad ? 'CADASTRADA' : 'DESENHO', pdfSha: AstL_shaBytes_(arquivo.getBlob().getBytes()) };
    if (cad) { registro.cadastradaId = Com_s_(cad.linha.ID); registro.cadastradaSha = cad.sha; }
    props.setProperty(chave, JSON.stringify(registro));
    Com_historico_('PROPOSTA', p.ID, 'ASSINATURA_METROLAB', eu, { texto: 'Responsável assinou ' + ComP_rotulo_(p) + (cad ? ' com a assinatura cadastrada em "Minha assinatura" (' + ext.toUpperCase() + ' enviada em ' + Com_br_(cad.linha.ENVIADA_EM) + ', SHA-256 ' + cad.sha + '), depois de marcar "Li e concordo".' : ' (desenho no quadro).') });
    return { em: registro.em, cadastrada: !!cad };
  });
}

// ------------------------------------------------------------
// ASSINATURA PELO LINK (10/11/2026, etapa 1)
// ------------------------------------------------------------
/** Registro da assinatura guardado em Properties (COM_ASS_RESP_<id>): Metrolab, link e, depois, o cliente. null se não houver. */
function ComP_assRegistro_(id) {
  try { return Com_json_(PropertiesService.getScriptProperties().getProperty('COM_ASS_RESP_' + Com_s_(id)), null); } catch (e) { return null; }
}

/**
 * Assinatura do cliente pelo link sobre o documento atual da proposta: o registro (com finalPdfId) ou null. Vale também a
 * coluna ASSINATURA_PDF_ID, gravada quando a assinatura é aplicada na proposta.
 */
function ComP_assinadaCliente_(p) {
  if (!p) return null;
  var a = ComP_assRegistro_(p.ID);
  if (a && a.finalPdfId && Com_s_(a.pdfId) === Com_s_(p.PDF_ID)) return a;
  if (Com_s_(p.ASSINATURA_PDF_ID)) return a && a.finalPdfId ? a : { finalPdfId: Com_s_(p.ASSINATURA_PDF_ID), clienteNome: Com_s_(p.ASSINADA_POR_NOME), clienteEm: Com_s_(p.ASSINADA_EM), clienteEmail: Com_s_(p.ASSINADA_POR_EMAIL), clienteCargo: Com_s_(p.ASSINADA_POR_CARGO) };
  return null;
}

/**
 * 10/11/2026 (etapa 2, D5): por que a proposta fica com quem a assinou ou enviou na troca de responsável da oportunidade
 * ('' = pode passar): assinada pela Metrolab no documento atual, link de assinatura enviado ou proposta já enviada ao cliente.
 */
function ComP_motivoFicaComResponsavel_(p) {
  var a = Com_s_(p.PDF_ID) ? ComP_assRegistro_(p.ID) : null;
  if (a && Com_s_(a.pdfId) === Com_s_(p.PDF_ID) && Com_s_(a.marca) === Com_s_(p.MARCA_CONTEUDO)) return 'já foi assinada pela Metrolab por ' + (Com_s_(a.nome) || Com_s_(p.RESPONSAVEL_NOME));
  if (Com_s_(p.LINK_ENVIADO_EM) || (a && a.linkHash)) return 'o link de assinatura já foi enviado ao cliente';
  var env = ComP_foiEnviada_(p);
  if (env.enviada) return 'já foi enviada ao cliente (' + env.como + ')';
  return '';
}

/** Mensagem única para o que não se faz com proposta assinada pelo cliente (o quê, por quê e o que fazer). */
function ComP_msgAssinada_(p, a, acao) {
  var aprovada = Com_up_(p.SITUACAO) === 'APROVADA';
  return 'Não foi possível ' + acao + ': a proposta ' + ComP_rotulo_(p) + ' foi assinada pelo cliente' + (a.clienteEm ? ' em ' + Com_br_(a.clienteEm) : '') + (a.clienteNome ? ' (' + a.clienteNome + ')' : '') +
    '. O documento assinado é o aceite do cliente e fica guardado como está. ' +
    (aprovada ? '' : 'Registre a assinatura na proposta (botão "Registrar a assinatura do cliente"): a proposta fica aprovada e a oportunidade, ganha. ') +
    'Se o cliente pediu mudança ou desistiu depois de assinar, registre o contato na oportunidade e combine com a gestão comercial o que fazer antes de qualquer alteração';
}

/** Nome para remetente e assinatura de e-mail: o cadastro em maiúsculas vira "Vera Vendedora Teste". */
function ComP_nomeBonito_(nome) {
  var s = Com_s_(nome);
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/\s+/).map(function (w, i) { return i > 0 && /^(da|de|do|das|dos|e)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

/** Vendedor responsável pela proposta: { id, nome, email, telefone } (cadastro atual; sem cadastro, o congelado no documento). */
function ComP_vendedor_(p) {
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, Com_s_(p.RESPONSAVEL_ID)); } catch (e) { u = null; }
  var cong = (Com_json_(p.CONGELADO_JSON, {}) || {}).vendedor || {};
  var email = Com_s_(u && u.EMAIL).toLowerCase() || Com_s_(cong.email).toLowerCase();
  return { id: Com_s_(p.RESPONSAVEL_ID), nome: ComP_nomeBonito_(Com_s_(u && u.NOME) || Com_s_(cong.nome) || Com_s_(p.RESPONSAVEL_NOME)) || 'Comercial',
    email: ComCt_emailOk_(email) ? email : '', telefone: Com_s_(u && (u.CELULAR || u.TELEFONE)) || Com_s_(cong.telefone) };
}

/** E-mail sugerido para o link: o contato congelado no documento; sem ele, o contato da proposta no cadastro. */
function ComP_emailSugerido_(p) {
  var cong = Com_json_(p.CONGELADO_JSON, {}) || {};
  var e = Com_s_(cong.contato && cong.contato.email).toLowerCase();
  if (!ComCt_emailOk_(e) && Com_s_(p.CONTATO_ID)) { var ct = SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) || {}; e = Com_s_(ct.EMAIL).toLowerCase(); }
  return ComCt_emailOk_(e) ? e : '';
}

/** Escapa texto para o HTML do e-mail. */
function ComP_escEmail_(s) { return Com_s_(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/**
 * Corpo do e-mail em texto e HTML a partir dos mesmos blocos (as duas versões dizem a mesma coisa).
 * blocos: [{ p: texto } | { aviso: texto } | { tabela: [[rótulo, valor], ...] } | { link: { url, texto } } | { assinatura: [linhas] }]
 */
function ComP_emailCorpo_(blocos) {
  var txt = [], html = [];
  (blocos || []).forEach(function (b) {
    if (!b) return;
    if (b.p) { txt.push(b.p); html.push('<p style="margin:0 0 12px;text-align:justify">' + ComP_escEmail_(b.p).replace(/\n/g, '<br>') + '</p>'); }
    else if (b.aviso) { txt.push('ATENÇÃO: ' + b.aviso); html.push('<p style="margin:0 0 12px;padding:8px 10px;border-left:4px solid #b26a00;background:#fff6e5;text-align:justify"><b>Atenção:</b> ' + ComP_escEmail_(b.aviso) + '</p>'); }
    else if (b.tabela) {
      txt.push(b.tabela.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n'));
      html.push('<table style="border-collapse:collapse;margin:0 0 14px;font-size:14px">' + b.tabela.map(function (l) { return '<tr><td style="padding:3px 14px 3px 0;color:#55605a;vertical-align:top">' + ComP_escEmail_(l[0]) + '</td><td style="padding:3px 0;vertical-align:top"><b>' + ComP_escEmail_(l[1]) + '</b></td></tr>'; }).join('') + '</table>');
    } else if (b.link) {
      txt.push(b.link.texto + ':\n' + b.link.url);
      html.push('<p style="margin:4px 0 16px"><a href="' + ComP_escEmail_(b.link.url) + '" style="display:inline-block;padding:10px 18px;background:#1F6B2A;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">' + ComP_escEmail_(b.link.texto) + '</a></p>' +
        '<p style="margin:0 0 12px;font-size:12px;color:#55605a">Se o botão não abrir, copie este endereço no navegador: ' + ComP_escEmail_(b.link.url) + '</p>');
    } else if (b.assinatura) { txt.push(b.assinatura.filter(Boolean).join('\n')); html.push('<p style="margin:16px 0 0">' + b.assinatura.filter(Boolean).map(ComP_escEmail_).join('<br>') + '</p>'); }
  });
  return { texto: txt.join('\n\n'), html: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2a24;max-width:640px">' + html.join('') + '</div>' };
}

/** Linhas de assinatura do vendedor no fim dos e-mails. */
function ComP_assinaturaEmail_(v) {
  return [v.nome, 'Comercial · Metrolabs', [v.email, v.telefone].filter(Boolean).join(' · ')];
}

/**
 * Enviar o link de assinatura ao cliente. d: { id, email, substituir (true = cancelar o link anterior, confirmado na janela) }.
 * Só o responsável (o documento leva a assinatura dele pela Metrolab). A ordem protege o link anterior: o novo é gravado,
 * o e-mail sai e só então o anterior é cancelado; se o e-mail não sair, o novo é desfeito e o anterior continua valendo.
 * Grava LINK_EMAIL e LINK_ENVIADO_EM, histórico e contato registrado; proposta pronta passa a enviada (o link é um envio).
 */
function ComP_linkAssinatura_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'enviar o link de assinatura');
  d = d || {};
  var email = Com_s_(d.email).toLowerCase();
  if (!ComCt_emailOk_(email)) throw new Error('Não foi possível enviar o link: informe um e-mail completo do cliente (nome@empresa.com.br)');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'enviar o link de assinatura');
    if (Com_s_(p.RESPONSAVEL_ID) !== Com_s_(eu.id)) throw new Error('Não foi possível enviar o link: só o responsável pela proposta (' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa') + ') envia o link, porque o documento vai com a assinatura dele pela Metrolab');
    var props = PropertiesService.getScriptProperties(), chave = 'COM_ASS_RESP_' + p.ID;
    var a = Com_json_(props.getProperty(chave), null);
    if (a && a.finalPdfId) throw new Error('Não foi possível enviar o link: o cliente já assinou esta proposta' + (a.clienteEm ? ' em ' + Com_br_(a.clienteEm) : '') + (a.clienteNome ? ' (' + a.clienteNome + ')' : '') + '. O PDF com as duas assinaturas está na proposta');
    if (!a || a.pdfId !== p.PDF_ID || a.marca !== p.MARCA_CONTEUDO || ['PRONTA', 'ENVIADA'].indexOf(Com_up_(p.SITUACAO)) < 0 || Com_dia_(p.VALIDA_ATE) < Com_hoje_()) {
      throw new Error('Não foi possível enviar o link: é preciso uma proposta pronta ou enviada, dentro da validade, com o documento atual assinado pelo responsável (botão "Assinar pela Metrolab")');
    }
    var anterior = a.linkHash ? { email: Com_s_(p.LINK_EMAIL) || Com_s_(a.clienteEmailEsperado), em: Com_s_(p.LINK_ENVIADO_EM) || Com_s_(a.linkEnviadoEm) } : null;
    if (anterior && d.substituir !== true) throw new Error('Não foi possível enviar: já existe um link ativo enviado para ' + (anterior.email || 'outro e-mail') + (anterior.em ? ' em ' + Com_br_(anterior.em) : '') +
      '. Ao gerar outro, esse link é cancelado e deixa de abrir. Confirme o cancelamento na janela e envie de novo');
    var token = AstL_novoToken_(), hash = Com_marca_(token);
    var url = AstL_url_(token).replace('/orcamento/#', '/assinar-proposta/#');
    var rot = ComP_rotulo_(p), cong = Com_json_(p.CONGELADO_JSON, {}) || {}, v = ComP_vendedor_(p);
    var cliente = Com_s_((cong.cliente || {}).fantasia) || Com_s_((cong.cliente || {}).razao) || Com_s_(p.CLIENTE_NOME);
    var ct = ComCt_listar_(p.CLIENTE_ID, '').filter(function (c) { return Com_s_(c.email).toLowerCase() === email; })[0];
    var conhecidos = ComCt_emailsDoCliente_(p.CLIENTE_ID), fora = conhecidos.indexOf(email) < 0;
    var corpo = ComP_emailCorpo_([
      { p: ct && ct.nome ? 'Prezado(a) ' + ComP_nomeBonito_(ct.nome) + ',' : 'Prezados(as),' },
      { p: 'Segue a proposta comercial ' + rot + ' da Metrolabs para ' + cliente + (Com_s_(p.TITULO) ? ', referente a ' + Com_s_(p.TITULO) : '') + '.' },
      { tabela: [['Proposta', rot], ['Cliente', cliente], ['Valor total', Com_moeda_(p.TOTAL)], ['Válida até', Com_brDia_(p.VALIDA_ATE)]] },
      { p: 'Para aprovar, abra a proposta pelo botão abaixo, confira os itens, os valores e as condições, informe o seu nome completo, o cargo e o e-mail e assine na tela, com o dedo ou o mouse. Ao concluir, a proposta com as assinaturas da Metrolabs e do cliente é enviada por e-mail.' },
      { link: { url: url, texto: 'Abrir a proposta ' + rot } },
      { p: 'O PDF da proposta segue em anexo para leitura. Se outra pessoa da sua instituição for a responsável pela assinatura, encaminhe esta mensagem a ela. Em caso de dúvida, responda este e-mail ou fale comigo pelo telefone abaixo.' },
      { p: 'Atenciosamente,' },
      { assinatura: ComP_assinaturaEmail_(v) }
    ]);
    var msg = { to: email, subject: 'Proposta comercial ' + rot + ' | ' + cliente + ' | Metrolabs', body: corpo.texto, htmlBody: corpo.html, name: v.nome + ' — Metrolabs' };
    if (v.email) { msg.replyTo = v.email; if (v.email !== email) msg.bcc = v.email; }
    var anexo = false;
    try { var blob = DriveApp.getFileById(Com_s_(p.PDF_ID)).getBlob(); try { blob.setName('Proposta ' + rot + '.pdf'); } catch (eN) {} msg.attachments = [blob]; anexo = true; } catch (eA) { anexo = false; }
    props.setProperty('COM_ASS_LINK_' + hash, p.ID); // o novo link já abre quando o e-mail chegar
    try { MailApp.sendEmail(msg); } catch (eM) {
      props.deleteProperty('COM_ASS_LINK_' + hash);
      throw new Error('Não foi possível enviar o link: o e-mail não saiu (' + String((eM && eM.message) || eM).replace(/[.\s]+$/, '').slice(0, 200) + '). Nada mudou: ' +
        (anterior ? 'o link anterior, enviado para ' + anterior.email + ', continua valendo' : 'nenhum link foi criado') + '. Confira o endereço e tente de novo');
    }
    if (a.linkHash) props.deleteProperty('COM_ASS_LINK_' + a.linkHash);
    var agora = Com_agora_();
    a.clienteEmailEsperado = email; a.linkHash = hash; a.linkEnviadoEm = agora; a.linkEnviadoPorId = eu.id;
    props.setProperty(chave, JSON.stringify(a));
    var campos = { LINK_EMAIL: email, LINK_ENVIADO_EM: agora, ATUALIZADO_EM: agora };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    var cancelado = anterior ? ' O link anterior, enviado para ' + (anterior.email || 'outro e-mail') + (anterior.em ? ' em ' + Com_br_(anterior.em) : '') + ', foi cancelado.' : '';
    Com_historico_('PROPOSTA', p.ID, 'LINK_ASSINATURA', eu, { texto: 'Link de assinatura enviado para ' + email + (ct ? ' (' + ct.nome + ')' : '') + (fora ? '. Atenção: o e-mail não é de nenhum contato cadastrado do cliente' : '') + '.' + cancelado +
      (anexo ? ' O PDF da proposta foi anexado para leitura.' : ' O PDF não foi anexado (arquivo indisponível); o cliente baixa pelo link.') });
    var envio = null;
    if (Com_up_(p.SITUACAO) === 'PRONTA') envio = ComP_aoEnviar_(p, agora, 'Link de assinatura enviado para ' + email + ' por ' + eu.nome, eu);
    else {
      var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
      if (o) {
        SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: 'EMAIL', RESPONDEU: 'NAO', RESUMO: 'Link de assinatura da proposta ' + rot + ' enviado para ' + email + '.' + cancelado,
          CONTATO_ID: ct ? ct.id : '', CONTATO_NOME: ct ? ct.nome : '', USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: agora });
        if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ULTIMO_CONTATO_EM: agora, ATUALIZADO_EM: agora });
      }
    }
    return { caminho: '/assinar-proposta/#' + token, email: email, enviadoEm: Com_br_(agora), foraDosContatos: fora, anteriorCancelado: anterior ? anterior.email : '',
      proposta: ComP_paraTela_(eu, Object.assign({}, p, campos, envio || {}), true),
      message: 'Link enviado para ' + email + '.' + cancelado + (envio ? ' A proposta passou a "Enviada ao cliente" e o retorno está em Minhas atividades.' : '') + (fora ? ' Atenção: o e-mail não é de nenhum contato cadastrado do cliente.' : '') };
  });
}

/**
 * Abre o link. Assinada pelo cliente: continua abrindo (ver e baixar o PDF assinado) em qualquer situação, menos excluída.
 * Sem assinatura do cliente: só proposta pronta ou enviada, na validade, do mesmo responsável que assinou pela Metrolab.
 */
function ComP_abrirAssinatura_(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  var props = PropertiesService.getScriptProperties(), hash = Com_marca_(token);
  var id = props.getProperty('COM_ASS_LINK_' + hash);
  if (!id) return null;
  var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, id), chave = 'COM_ASS_RESP_' + id;
  var a = Com_json_(props.getProperty(chave), null);
  if (!p || !a || a.linkHash !== hash || a.pdfId !== p.PDF_ID || a.marca !== p.MARCA_CONTEUDO || ComP_excluida_(p)) return null;
  if (a.finalPdfId) return { p: p, a: a, props: props, chave: chave };
  if (a.usuarioId !== p.RESPONSAVEL_ID || ['PRONTA', 'ENVIADA'].indexOf(Com_up_(p.SITUACAO)) < 0 || Com_dia_(p.VALIDA_ATE) < Com_hoje_()) return null;
  return { p: p, a: a, props: props, chave: chave };
}

function ComP_assinaturaVer_(token) {
  var x = ComP_abrirAssinatura_(token);
  if (!x) return { ok: false, codigo: 'INDISPONIVEL' };
  var p = x.p, a = x.a, v = ComP_vendedor_(p);
  return { ok: true, orcamento: {
    comercial: true, numero: p.NUMERO, revisao: String(p.REVISAO), emitidoEm: Com_br_(p.GERADA_EM),
    cliente: p.CLIENTE_NOME, totalTxt: Com_moeda_(p.TOTAL), validade: Com_brDia_(p.VALIDA_ATE),
    estado: a.finalPdfId ? 'RESPONDIDO' : 'ABERTO', temPdf: true,
    resposta: a.finalPdfId ? { em: Com_br_(a.clienteEm), por: a.clienteNome, decisao: 'APROVADO', decisaoNome: 'Assinada', canal: 'link de assinatura' } : null,
    contato: { nome: v.nome, telefone: v.telefone, email: v.email },
    itens: Com_json_(p.ITENS_JSON, []).map(function (i) {
      return { descricao: i.descricao, tipo: i.tipo, quantidadeTxt: i.quantidade, unitarioTxt: Com_moeda_(i.precoUnitario), totalTxt: Com_moeda_(i.quantidade * i.precoUnitario) };
    })
  } };
}

function ComP_assinaturaPdf_(token) {
  var x = ComP_abrirAssinatura_(token);
  if (!x) return { ok: false, codigo: 'INDISPONIVEL' };
  var bytes = DriveApp.getFileById(x.a.finalPdfId || x.a.pdfId).getBlob().getBytes();
  if (!x.a.finalPdfId && AstL_shaBytes_(bytes) !== x.a.pdfSha) return { ok: false, codigo: 'INDISPONIVEL' };
  return { ok: true, nome: ComP_rotulo_(x.p) + (x.a.finalPdfId ? ' assinada' : '') + '.pdf', base64: Utilities.base64Encode(bytes) };
}

/** PDF com as duas assinaturas (fora da trava). Devolve { id, url, sha } ou null se o documento ou a assinatura da Metrolab mudaram. */
function ComP_gerarPdfAssinado_(p, a, cliente, agora) {
  var original = DriveApp.getFileById(a.pdfId), bytes = original.getBlob().getBytes();
  var png = DriveApp.getFileById(a.assinaturaId).getBlob().getBytes();
  if (AstL_shaBytes_(bytes) !== a.pdfSha || AstL_shaBytes_(png) !== a.assinaturaSha) return null;
  // 10/11/2026 (etapa 2): a assinatura cadastrada pode ser JPG (assinaturaTipo); o desenho do quadro é PNG
  var assinaturas = { metrolab: { imagem: 'data:' + (a.assinaturaTipo === 'image/jpeg' ? 'image/jpeg' : 'image/png') + ';base64,' + Utilities.base64Encode(png), em: a.em },
    cliente: { imagem: cliente.assinatura, nome: cliente.nome, cargo: cliente.cargo, em: agora } };
  var nome = 'Proposta assinada - ' + ComP_rotulo_(p);
  var html = ComDoc_propostaHtml_(p, Com_json_(p.CONGELADO_JSON, {}), a.marca, assinaturas);
  var fin = RelA4_finalizar_(html, nome);
  if (!fin.pdfBlob) throw new Error('O PDF assinado não foi gerado.');
  var arquivo = original.getParents().next().createFile(fin.pdfBlob.setName(nome + '.pdf'));
  Ast_privado_(arquivo);
  return { id: arquivo.getId(), url: arquivo.getUrl(), sha: AstL_shaBytes_(fin.pdfBlob.getBytes()), nome: nome + '.pdf' };
}

/**
 * Cliente assina pelo link (rota pública). O PDF assinado é gerado fora da trava (D22); dentro dela tudo é conferido de
 * novo (outra assinatura pode ter chegado no meio). A assinatura é guardada primeiro (é um fato) e depois aplicada na
 * proposta: aprovada, oportunidade ganha e a confirmação imediata por e-mail ao vendedor com o cliente em cópia.
 * O e-mail digitado não precisa ser o do convite (link repassado na empresa do cliente): os dois ficam registrados.
 * Segunda chamada com o mesmo link só devolve a situação (nada se repete).
 */
function ComP_assinaturaResponder_(token, dados, ctx) {
  if (!dados || dados.decisao !== 'APROVADO') return { ok: false, message: 'Use a opção de assinar a proposta.' };
  var v = AstL_validar_(dados);
  if (v.erro) return { ok: false, codigo: 'ENTRADA', campo: v.erro.campo, message: v.erro.message };
  var x0 = ComP_abrirAssinatura_(token);
  if (!x0) return { ok: false, codigo: 'INDISPONIVEL' };
  if (x0.a.finalPdfId) return ComP_assinaturaVer_(token);
  var cliente = v.x, agora = Com_agora_();
  var pdf = ComP_gerarPdfAssinado_(x0.p, x0.a, cliente, agora);
  if (!pdf) return { ok: false, codigo: 'INDISPONIVEL' };
  var r = Com_comTrava_(function () {
    var x = ComP_abrirAssinatura_(token);
    if (!x) return { ok: false, codigo: 'INDISPONIVEL' };
    if (x.a.finalPdfId) return { ja: true };
    if (x.a.pdfId !== x0.a.pdfId || x.a.marca !== x0.a.marca || x.a.pdfSha !== x0.a.pdfSha || x.a.assinaturaSha !== x0.a.assinaturaSha) return { ok: false, codigo: 'INDISPONIVEL' };
    var a = x.a;
    a.finalPdfId = pdf.id; a.finalPdfUrl = pdf.url; a.finalPdfSha = pdf.sha; a.finalPdfNome = pdf.nome;
    a.clienteEm = agora; a.clienteNome = cliente.nome; a.clienteEmail = cliente.email; a.clienteCargo = cliente.cargo; a.clienteDocumento = cliente.documento;
    a.clienteEmailDiferente = !!Com_s_(a.clienteEmailEsperado) && cliente.email !== Com_s_(a.clienteEmailEsperado);
    a.clienteContexto = AstL_ctx_(ctx);
    x.props.setProperty(x.chave, JSON.stringify(a));
    ComP_aplicarAssinatura_(x.p, a, {});
    var pid = x.p.ID;
    Com_depois_(function () { ComP_confirmarAssinatura_(pid, {}); });
    return { ok: true };
  });
  if (r && r.ok === false) return r;
  return ComP_assinaturaVer_(token);
}

/**
 * Aplica a assinatura do cliente na proposta (dentro da trava): colunas ASSINADA_*, histórico na proposta e na oportunidade
 * e a aprovação (ComP_aplicarAprovacao_). op: { eu (registro posterior: quem registrou), posterior }.
 * Na assinatura pelo link nunca lança: a assinatura já está guardada; se a aprovação falhar, o histórico e o aviso ao
 * vendedor dizem o que fazer ("Registrar a assinatura do cliente"). No registro posterior, a falha volta para a tela.
 */
function ComP_aplicarAssinatura_(p, a, op) {
  op = op || {};
  var rot = ComP_rotulo_(p), s = Com_up_(p.SITUACAO), agora = Com_agora_();
  var quem = op.eu ? { id: op.eu.id, nome: op.eu.nome } : { id: 'COMERCIAL', nome: 'Assinatura eletrônica: ' + Com_s_(a.clienteNome) };
  if (op.posterior && ['PRONTA', 'ENVIADA', 'VENCIDA'].indexOf(s) < 0) throw new Error('Não foi possível registrar a assinatura: a proposta ' + rot + ' está "' + (COM_SITUACOES_PROP[s] || s) + '"');
  var dif = !!Com_s_(a.clienteEmailEsperado) && Com_s_(a.clienteEmail) !== Com_s_(a.clienteEmailEsperado);
  var desc = 'Proposta ' + rot + ' assinada pelo cliente pelo link em ' + Com_br_(a.clienteEm) + ' por ' + Com_s_(a.clienteNome) + (Com_s_(a.clienteCargo) ? ' (' + Com_s_(a.clienteCargo) + ')' : '') +
    ', e-mail ' + Com_s_(a.clienteEmail) + (dif ? '; assinado com e-mail diferente do convidado (' + Com_s_(a.clienteEmailEsperado) + ')' : '') + '.' +
    (op.posterior ? ' Registro posterior no SGO+ feito por ' + op.eu.nome + ' em ' + Com_br_(agora) + ' (assinatura anterior a esta versão do sistema).' : '');
  var campos = { ASSINADA_EM: Com_s_(a.clienteEm), ASSINADA_POR_NOME: Com_s_(a.clienteNome), ASSINADA_POR_CARGO: Com_s_(a.clienteCargo), ASSINADA_POR_EMAIL: Com_s_(a.clienteEmail),
    ASSINATURA_PDF_ID: Com_s_(a.finalPdfId), ATUALIZADO_EM: agora };
  SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
  Com_historico_('PROPOSTA', p.ID, 'ASSINATURA_CLIENTE', quem, { texto: desc });
  if (Com_s_(p.OPORTUNIDADE_ID)) Com_historico_('OPORTUNIDADE', p.OPORTUNIDADE_ID, 'ASSINATURA_CLIENTE', quem, { texto: desc });
  var atual = Object.assign({}, p, campos);
  try {
    if (s === 'APROVADA') return { aprovada: true, ja: true };
    if (['PRONTA', 'ENVIADA', 'VENCIDA'].indexOf(s) < 0) throw new Error('a proposta está "' + (COM_SITUACOES_PROP[s] || s) + '"');
    if (s === 'PRONTA') Object.assign(atual, ComP_aoEnviar_(atual, Com_s_(a.linkEnviadoEm) || Com_s_(a.clienteEm), 'Link de assinatura enviado para ' + (Com_s_(a.clienteEmailEsperado) || Com_s_(a.clienteEmail)), quem, { semRetorno: true }));
    var r = ComP_aplicarAprovacao_(atual, quem, { quando: a.clienteEm, ganhaEm: a.clienteEm, via: 'ASSINATURA', aceiteTipo: 'ASSINATURA_ELETRONICA',
      texto: 'Assinada pelo link por ' + Com_s_(a.clienteNome) + (Com_s_(a.clienteCargo) ? ' (' + Com_s_(a.clienteCargo) + ')' : '') + ', e-mail ' + Com_s_(a.clienteEmail) + (dif ? ' (diferente do convidado: ' + Com_s_(a.clienteEmailEsperado) + ')' : '') + '.',
      arquivo: { id: Com_s_(a.finalPdfId), nome: Com_s_(a.finalPdfNome) || 'Proposta assinada - ' + rot + '.pdf', url: Com_s_(a.finalPdfUrl) },
      textoHistorico: 'Aprovada pela assinatura eletrônica do cliente (' + Com_s_(a.clienteNome) + ', ' + Com_br_(a.clienteEm) + '). Aceite: PDF com as duas assinaturas.' + (dif ? ' Assinado com e-mail diferente do convidado (' + Com_s_(a.clienteEmailEsperado) + ').' : '') + (op.posterior ? ' Registro posterior feito por ' + op.eu.nome + '.' : ''),
      resumoContato: 'Cliente assinou a proposta ' + rot + ' pelo link (' + Com_s_(a.clienteNome) + ', ' + Com_s_(a.clienteEmail) + ').',
      textoGanha: 'Cliente assinou a proposta ' + rot + ' pelo link em ' + Com_br_(a.clienteEm) + '.',
      tituloAviso: 'Cliente assinou a proposta ' + rot, emailResponsavel: false });
    return { aprovada: true, ganhou: r.ganhou };
  } catch (e) {
    var m = String((e && e.message) || e).replace(/^Não foi possível [^:]+:\s*/, '').replace(/[.\s]+$/, '');
    if (op.posterior) throw new Error('Não foi possível registrar a assinatura: ' + m);
    console.error('Comercial, aprovação pela assinatura: ' + m);
    Com_historico_('PROPOSTA', p.ID, 'ASSINATURA_SEM_APROVACAO', quem, { texto: 'A assinatura do cliente foi guardada, mas a aprovação automática não foi aplicada (' + m + '). Abra a proposta e toque em "Registrar a assinatura do cliente".' });
    Com_avisar_(p.RESPONSAVEL_ID, 'ASSINATURA_PENDENTE', 'Cliente assinou a proposta ' + rot + ': registre a assinatura', Com_s_(p.CLIENTE_NOME) + ': ' + Com_s_(a.clienteNome) + ' assinou a proposta pelo link, mas a aprovação automática não foi aplicada (' + m + '). Abra a proposta e toque em "Registrar a assinatura do cliente".', { tipo: 'proposta', id: p.ID }, { email: true });
    return { aprovada: false, erro: m };
  }
}

/**
 * Confirmação imediata da assinatura por e-mail (fora da trava, Com_depois_): para o vendedor responsável, com o cliente
 * em cópia (o e-mail digitado na assinatura e o e-mail convidado, se diferente) e o PDF com as duas assinaturas anexado.
 * op: { semCliente (registro posterior: só o vendedor), posterior, por }. Falha: aviso no sistema ao vendedor e histórico.
 * Nunca lança. Devolve { ok, para, copia }.
 */
function ComP_confirmarAssinatura_(pid, op) {
  op = op || {};
  var sistema = { id: 'COMERCIAL', nome: 'Comercial (confirmação da assinatura)' };
  var p = null, a = null;
  try { p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, pid); a = ComP_assRegistro_(pid); } catch (e0) { p = null; }
  if (!p || !a || !a.finalPdfId) return { ok: false, para: [], copia: [] };
  var rot = ComP_rotulo_(p), v = ComP_vendedor_(p), copia = [];
  if (!op.semCliente) [a.clienteEmail, a.clienteEmailEsperado].forEach(function (e) { e = Com_s_(e).toLowerCase(); if (ComCt_emailOk_(e) && copia.indexOf(e) < 0 && e !== v.email) copia.push(e); });
  var para = v.email ? [v.email] : copia.splice(0, copia.length);
  var falhou = function (motivo) {
    Com_historico_('PROPOSTA', pid, 'CONFIRMACAO_ASSINATURA', sistema, { texto: 'A confirmação da assinatura não saiu por e-mail (' + motivo + '). Envie o PDF com as duas assinaturas ao cliente pelo "Enviar documento".' });
    Com_avisar_(p.RESPONSAVEL_ID, 'CONFIRMACAO_NAO_SAIU', 'Confirmação da assinatura não saiu: ' + rot, Com_s_(p.CLIENTE_NOME) + ': ' + Com_s_(a.clienteNome) + ' assinou a proposta ' + rot + ', mas o e-mail de confirmação não saiu (' + motivo + '). Envie o PDF com as duas assinaturas ao cliente pelo "Enviar documento".', { tipo: 'proposta', id: pid });
    return { ok: false, para: [], copia: [] };
  };
  if (!para.length) return falhou('o vendedor responsável não tem e-mail no cadastro');
  var dif = !!Com_s_(a.clienteEmailEsperado) && Com_s_(a.clienteEmail).toLowerCase() !== Com_s_(a.clienteEmailEsperado).toLowerCase();
  var cliente = Com_s_(p.CLIENTE_NOME);
  var corpo = ComP_emailCorpo_([
    { p: 'Prezados(as),' },
    { p: 'A proposta comercial ' + rot + (Com_s_(p.TITULO) ? ' (' + Com_s_(p.TITULO) + ')' : '') + ' para ' + cliente + ' foi assinada eletronicamente pelo cliente em ' + Com_br_(a.clienteEm) + ' (horário de Brasília).' +
      (op.posterior ? ' Esta confirmação foi gerada no registro posterior da assinatura no SGO+' + (op.por ? ', feito por ' + op.por : '') + '.' : '') },
    { tabela: [['Proposta', rot], ['Cliente', cliente], ['Valor total', Com_moeda_(p.TOTAL)], ['Assinada em', Com_br_(a.clienteEm)], ['Assinada por', Com_s_(a.clienteNome) + (Com_s_(a.clienteCargo) ? ' (' + Com_s_(a.clienteCargo) + ')' : '')], ['E-mail informado', Com_s_(a.clienteEmail)]] },
    dif ? { aviso: 'assinado com e-mail diferente do convidado (' + Com_s_(a.clienteEmailEsperado) + '). O link foi enviado para esse endereço e a assinatura foi feita informando ' + Com_s_(a.clienteEmail) + '.' } : null,
    { p: 'O PDF com as assinaturas da Metrolabs e do cliente segue em anexo e fica guardado na pasta do cliente.' },
    { p: 'Próximos passos: a Metrolabs registra o pedido e o encaminha aos setores responsáveis pela execução e pelo faturamento. O responsável comercial entra em contato para combinar as datas e qualquer detalhe que falte.' },
    { tabela: [['Responsável comercial', v.nome], ['E-mail', v.email || 'não cadastrado'], ['Telefone', v.telefone || 'não cadastrado']] },
    { p: 'Atenciosamente,' },
    { assinatura: ComP_assinaturaEmail_(v) }
  ]);
  var msg = { to: para.join(','), subject: 'Proposta ' + rot + ' assinada por ' + Com_s_(a.clienteNome) + ' (' + cliente + ')', body: corpo.texto, htmlBody: corpo.html, name: v.nome + ' — Metrolabs' };
  if (copia.length) msg.cc = copia.join(',');
  if (v.email) msg.replyTo = v.email;
  try {
    var blob = DriveApp.getFileById(a.finalPdfId).getBlob();
    try { blob.setName(Com_s_(a.finalPdfNome) || 'Proposta assinada - ' + rot + '.pdf'); } catch (eN) {}
    msg.attachments = [blob];
    MailApp.sendEmail(msg);
  } catch (e) { return falhou(String((e && e.message) || e).replace(/[.\s]+$/, '').slice(0, 200)); }
  Com_historico_('PROPOSTA', pid, 'CONFIRMACAO_ASSINATURA', sistema, { texto: 'Confirmação da assinatura enviada por e-mail para ' + para.join(', ') + (copia.length ? ', com cópia para ' + copia.join(', ') : '') + ' (PDF com as duas assinaturas anexado).' });
  return { ok: true, para: para, copia: copia };
}

/**
 * 10/11/2026 (etapa 1): assinatura do cliente feita antes desta versão (ficou só guardada, sem mudar a proposta). O
 * responsável ou a gestão aplica a aprovação; a confirmação vai só ao vendedor (o cliente não recebe e-mail novo). d: { id }.
 */
function ComP_registrarAssinaturaCliente_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'registrar a assinatura do cliente');
  d = d || {};
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'registrar a assinatura do cliente');
    if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível registrar a assinatura: a proposta é de ' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa') + '. Só o responsável ou a gestão comercial registram');
    var a = ComP_assinadaCliente_(p);
    if (!a || !Com_s_(a.finalPdfId)) throw new Error('Não foi possível registrar a assinatura: o cliente ainda não assinou esta proposta pelo link. Para aceite por outro meio, use "Registrar resposta do cliente" com o arquivo do aceite');
    if (Com_up_(p.SITUACAO) === 'APROVADA') throw new Error('Não foi possível registrar a assinatura: ela já está registrada; a proposta está aprovada desde ' + Com_br_(p.RESPOSTA_EM) + '. Atualize a tela');
    var r = ComP_aplicarAssinatura_(p, a, { posterior: true, eu: eu });
    var pid = p.ID, nome = eu.nome;
    Com_depois_(function () { ComP_confirmarAssinatura_(pid, { semCliente: true, posterior: true, por: nome }); });
    var atual = SGO_DATA.getById(COM_ABAS.PROPOSTAS, pid);
    return { proposta: ComP_paraTela_(eu, atual, true), ganhou: !!r.ganhou,
      message: 'Assinatura do cliente registrada: a proposta está aprovada' + (r.ganhou ? ' e a oportunidade foi marcada como ganha' : '') + '. A confirmação foi enviada ao vendedor responsável (o cliente não recebe e-mail novo). Agora toque em "Passar aos setores".' };
  });
}

/**
 * Aprovação da proposta, comum ao registro manual (resposta do cliente com o aceite anexado) e à assinatura pelo link.
 * Dentro da trava. p: linha atual, ENVIADA ou VENCIDA (a PRONTA passa antes por ComP_aoEnviar_). quem: { id, nome }.
 * op: { quando, ganhaEm, texto, arquivo: { id, nome, url }, aceiteTipo, ocNumero, ocData, via (MANUAL|ACEITE|ASSINATURA|OC),
 *   marcarGanha (padrão true), textoHistorico, resumoContato, textoGanha, tituloAviso, emailResponsavel (padrão true) }.
 * Grava RESPOSTA_*, ACEITE_*, PEDIDO_SITUACAO; banco de preços; conclui o retorno e o aviso de vencimento (D9); histórico e
 * contato; oportunidade ganha (GANHA_EM com hora, GANHA_VIA) na etapa de 100% do funil, se houver; avisa gestão e responsável.
 * Proposta já aprovada não muda de novo. Devolve { campos, ganhou, oportunidade, ja }.
 */
function ComP_aplicarAprovacao_(p, quem, op) {
  op = op || {};
  var s0 = Com_up_(p.SITUACAO), rot = ComP_rotulo_(p);
  if (s0 === 'APROVADA') return { campos: {}, ganhou: false, oportunidade: null, ja: true };
  if (s0 !== 'ENVIADA' && s0 !== 'VENCIDA') throw new Error('Não foi possível registrar a aprovação: a proposta ' + rot + ' está "' + (COM_SITUACOES_PROP[s0] || s0) + '"');
  var agora = Com_agora_(), quando = Com_iso_(op.quando) || agora, arq = op.arquivo || {}, via = COM_GANHA_VIA[Com_up_(op.via)] ? Com_up_(op.via) : 'ACEITE';
  var campos = { SITUACAO: 'APROVADA', RESPOSTA_EM: quando, RESPOSTA_POR_NOME: Com_s_(quem.nome), RESPOSTA_TEXTO: Com_texto_(op.texto, 2000), ATUALIZADO_EM: agora, PEDIDO_SITUACAO: 'SEM_PASSAGEM' };
  if (Com_s_(arq.id)) { campos.ACEITE_ARQUIVO_ID = Com_s_(arq.id); campos.ACEITE_ARQUIVO_NOME = Com_s_(arq.nome); campos.ACEITE_ARQUIVO_URL = Com_s_(arq.url); }
  if (COM_TIPOS_ACEITE[Com_up_(op.aceiteTipo)]) campos.ACEITE_TIPO = Com_up_(op.aceiteTipo);
  if (Com_s_(op.ocNumero)) { campos.OC_NUMERO = Com_texto_(op.ocNumero, 60); campos.OC_DATA = Com_dia_(op.ocData); }
  SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
  if (typeof ComBP_registrarProposta_ === 'function') ComBP_registrarProposta_(Object.assign({}, p, campos), 'GANHO', { concorrente: '', valorVencedor: null });
  if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Concluída', 'Cliente aprovou a proposta.');
  if (Com_atividadeAberta_(Com_atividade_(p.VENCIMENTO_ATIVIDADE_ID))) Com_mudarAtividade_(p.VENCIMENTO_ATIVIDADE_ID, 'Concluída', 'Cliente aprovou a proposta ' + rot + '.');
  Com_historico_('PROPOSTA', p.ID, 'APROVADA', quem, { de: COM_SITUACOES_PROP[s0], para: COM_SITUACOES_PROP.APROVADA, texto: Com_s_(op.textoHistorico) || campos.RESPOSTA_TEXTO });
  var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID)), ganhou = false;
  if (o) {
    SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: 'EMAIL', RESPONDEU: 'SIM', RESUMO: Com_texto_(Com_s_(op.resumoContato) || ('Cliente aprovou a proposta ' + rot + '. ' + campos.RESPOSTA_TEXTO), 2000),
      CONTATO_ID: Com_s_(p.CONTATO_ID), CONTATO_NOME: Com_s_(p.CONTATO_NOME), USUARIO_ID: Com_s_(quem.id), USUARIO_NOME: Com_s_(quem.nome), DATA: quando });
    var oc = { ULTIMO_CONTATO_EM: quando, TENTATIVAS_SEM_RESPOSTA: 0, ATUALIZADO_EM: agora };
    if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA' && op.marcarGanha !== false) {
      if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Proposta aprovada pelo cliente.');
      oc.SITUACAO = 'GANHA'; oc.GANHA_EM = Com_iso_(op.ganhaEm) || agora; oc.GANHA_VIA = via; oc.PROXIMA_ACAO = 'Passar o pedido aprovado aos setores';
      var met = Com_metodologia_(), f = Com_funil_(Com_s_(o.FUNIL), met), et = Com_etapa_(f, Com_s_(o.ETAPA), met);
      var alvo = f ? f.etapas.filter(function (e) { return Number(e.probabilidade) >= 100; })[0] : null;
      if (alvo && alvo.codigo !== Com_s_(o.ETAPA)) {
        oc.ETAPA = alvo.codigo; oc.ETAPA_DESDE = agora;
        Com_historico_('OPORTUNIDADE', o.ID, 'ETAPA', quem, { de: et ? et.nome : Com_s_(o.ETAPA), para: alvo.nome, texto: 'Proposta ' + rot + ' aprovada pelo cliente: a oportunidade foi para a etapa ' + alvo.nome + '.' });
      }
      ganhou = true;
    }
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, oc);
    // 10/11/2026 (etapa 2, D7): ganhou pela proposta: as atividades abertas da gestão na oportunidade são canceladas
    if (ganhou && typeof ComOpo_encerrarAtividadesGestao_ === 'function') ComOpo_encerrarAtividadesGestao_(o, 'Cancelada', 'Oportunidade ' + Com_s_(o.CODIGO) + ' ganha (proposta ' + rot + ' aprovada).');
    if (ganhou) Com_historico_('OPORTUNIDADE', o.ID, 'GANHA', quem, { de: 'Aberta', para: 'Ganha', texto: (Com_s_(op.textoGanha) || 'Cliente aprovou a proposta ' + rot + '.') + ' Ganha em ' + Com_br_(oc.GANHA_EM) + ' (' + COM_GANHA_VIA[via].toLowerCase() + ').' });
  }
  var titulo = Com_s_(op.tituloAviso) || 'Cliente aprovou a proposta ' + rot;
  var txt = Com_s_(p.CLIENTE_NOME) + ': aprovada' + (campos.ACEITE_TIPO ? ' (' + COM_TIPOS_ACEITE[campos.ACEITE_TIPO].toLowerCase() + (campos.OC_NUMERO ? ' nº ' + campos.OC_NUMERO : '') + ')' : '') + '. ' +
    (ganhou ? 'A oportunidade foi marcada como ganha. ' : '') + 'Próximo passo: passar o pedido aos setores. Registrado por ' + Com_s_(quem.nome) + '.';
  var avisar = Com_idsGestaoComercial_([Com_s_(quem.id)]), resp = Com_s_(p.RESPONSAVEL_ID);
  avisar.forEach(function (uid) { Com_avisar_(uid, 'RESPOSTA_APROVADA', titulo, txt, { tipo: 'proposta', id: p.ID }, { email: !(uid === resp && op.emailResponsavel === false) }); });
  if (resp && resp !== Com_s_(quem.id) && avisar.indexOf(resp) < 0) Com_avisar_(resp, 'RESPOSTA_APROVADA', titulo, txt, { tipo: 'proposta', id: p.ID }, { email: op.emailResponsavel !== false });
  return { campos: campos, ganhou: ganhou, oportunidade: o, ja: false };
}

/**
 * Proposta enviada (pelo Enviar documento ou marcada à mão): situação, etapa da oportunidade e o retorno agendado. Dentro da trava.
 * 10/11/2026: opcoes.semRetorno = o envio é registrado junto com a aprovação (assinatura pelo link, OC na proposta pronta):
 * não cria o "Retorno sobre a proposta", que ficaria aberto depois da aprovação.
 */
function ComP_aoEnviar_(p, quando, como, eu, opcoes) {
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
    if (!ComP_investimento_(p) && !(opcoes && opcoes.semRetorno)) try {
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
  var tmE = ComP_termosDa_(p);
  Com_historico_('PROPOSTA', p.ID, 'ENVIADA', quem, { de: 'Pronta para enviar', para: 'Enviada ao cliente', texto: Com_texto_(como, 300) +
    (tmE.congelado ? (Com_s_(tmE.texto) ? '. Termos e condições da contratação enviados no documento: versão ' + tmE.versao + '.' : '') : '. Documento gerado antes dos termos fixos (sem a seção de termos e condições).') });
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
    var assR = ComP_assinadaCliente_(p);
    if (assR) throw new Error(ComP_msgAssinada_(p, assR, 'fazer nova revisão'));
    var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
    if (!o || Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível fazer nova revisão: a oportunidade está encerrada. Peça a reabertura à gestão comercial');
    var outra = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.NUMERO) === Com_s_(p.NUMERO) && Com_up_(x.SITUACAO) === 'RASCUNHO'; })[0];
    if (outra) throw new Error('Não foi possível: já existe a ' + ComP_rotulo_(outra) + ' em rascunho. Continue nela');
    var maior = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.NUMERO) === Com_s_(p.NUMERO); }).reduce(function (m, x) { return Math.max(m, Number(x.REVISAO) || 0); }, 0);
    var met = Com_metodologia_(), val = Number(p.VALIDADE_DIAS) || Number(met.proposta.validadeDias) || 15, agora = Com_agora_();
    var copia = {};
    // 29/10/2026: a revisão leva os custos da viagem e do frete (DESLOCAMENTO_JSON); o checklist é conferido de novo ao concluir
    ['NUMERO', 'OPORTUNIDADE_ID', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'CONTATO_ID', 'CONTATO_NOME', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'MODELO', 'TIPO_ORCAMENTO', 'INVESTIMENTO', 'TITULO', 'ESCOPO', 'APRESENTACAO',
      'DESLOCAMENTO_JSON', 'PRAZO_JSON', 'ITENS_JSON', 'CONDICOES_JSON', 'VALIDADE_DIAS', 'SUBTOTAL', 'DESCONTO_GERAL', 'TOTAL', 'DESCONTO_PCT', 'MARGEM_PCT', 'CUSTO_TOTAL'].forEach(function (k) { copia[k] = p[k]; });
    copia.REVISAO = maior + 1; copia.SITUACAO = 'RASCUNHO'; copia.DESCONTO_SITUACAO = 'DENTRO'; copia.VALIDA_ATE = Com_somarDias_(Com_hoje_(), val); copia.REVISAO_DE = p.ID; copia.PEDIDO_SITUACAO = '';
    copia.ATUALIZADO_EM = agora; copia.CRIADO_POR_ID = eu.id;
    var nova = SGO_DATA.insert(COM_ABAS.PROPOSTAS, copia);
    var antiga = { SUBSTITUIDA_POR: nova.ID, ATUALIZADO_EM: agora };
    if (s !== 'RECUSADA') antiga.SITUACAO = 'SUBSTITUIDA';
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, antiga);
    // 01/11/2026 (Comercial C3): a revisão substituída sai das contas do banco de preços (a recusada fica como perda)
    if (s !== 'RECUSADA' && typeof ComBP_marcarProposta_ === 'function') ComBP_marcarProposta_(p.ID, 'SUBSTITUIDO', 'Substituída pela revisão ' + ComP_rotulo_(nova) + '.');
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
    var assC = ComP_assinadaCliente_(p);
    if (assC) throw new Error(ComP_msgAssinada_(p, assC, 'cancelar'));
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'CANCELADA', CANCELADA_MOTIVO: motivo, ATUALIZADO_EM: Com_agora_() });
    if (typeof ComBP_marcarProposta_ === 'function') ComBP_marcarProposta_(p.ID, 'CANCELADO', 'Proposta cancelada: ' + motivo);
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Cancelada', 'Proposta cancelada: ' + motivo);
    if (Com_atividadeAberta_(Com_atividade_(p.VENCIMENTO_ATIVIDADE_ID))) Com_mudarAtividade_(p.VENCIMENTO_ATIVIDADE_ID, 'Cancelada', 'Proposta cancelada: ' + motivo);
    Com_historico_('PROPOSTA', p.ID, 'CANCELADA', eu, { de: COM_SITUACOES_PROP[s], para: 'Cancelada', texto: motivo });
    // 01/11/2026: ato irreversível avisa na hora o gestor da área e a Diretoria (SGO_Avisos_Gestao.js), depois de soltar a trava do módulo
    Com_depois_(function () { if (typeof SGO_avisoGestaoIrreversivel_ === 'function') SGO_avisoGestaoIrreversivel_({ evento: 'GI01', modulo: 'comercial', quem: eu, oque: 'Proposta cancelada', item: 'proposta ' + ComP_rotulo_(p) + (Com_s_(p.CLIENTE_NOME) ? ' (' + Com_s_(p.CLIENTE_NOME) + ')' : ''), motivo: motivo,
      tela: { tipo: 'comercial', aba: 'propostas', id: p.ID }, refId: 'PROP-CANC-' + p.ID }); });
    return { message: 'Proposta cancelada: saiu do funil e das propostas em andamento. Ela continua no histórico da oportunidade e no filtro "Cancelada".' };
  });
}


// ------------------------------------------------------------
// EXCLUSÃO (proposta que nunca foi ao cliente) — 29/10/2026
// ------------------------------------------------------------
/**
 * A proposta já foi ao cliente? Vale o envio registrado na proposta (ENVIADA_EM, situação depois do envio) e qualquer
 * envio do documento dela pela janela "Enviar documento" (DOC_ENVIOS: e-mail, WhatsApp ou link). { enviada, como }
 */
function ComP_foiEnviada_(p) {
  if (Com_s_(p.ENVIADA_EM)) return { enviada: true, como: 'enviada em ' + Com_br_(p.ENVIADA_EM) + (Com_s_(p.ENVIO_COMO) ? ' (' + Com_s_(p.ENVIO_COMO) + ')' : '') };
  var s = Com_up_(p.SITUACAO);
  if (['ENVIADA', 'APROVADA', 'RECUSADA', 'VENCIDA'].indexOf(s) >= 0) return { enviada: true, como: 'situação "' + COM_SITUACOES_PROP[s] + '"' };
  // 10/11/2026: o link de assinatura também é envio (inclusive o enviado antes desta versão, que só ficou em Properties)
  if (Com_s_(p.LINK_ENVIADO_EM)) return { enviada: true, como: 'link de assinatura enviado para ' + Com_s_(p.LINK_EMAIL) + ' em ' + Com_br_(p.LINK_ENVIADO_EM) };
  var aL = Com_s_(p.PDF_ID) ? ComP_assRegistro_(p.ID) : null;
  if (aL && Com_s_(aL.pdfId) === Com_s_(p.PDF_ID) && (aL.linkHash || aL.finalPdfId)) return { enviada: true, como: 'link de assinatura enviado' + (Com_s_(aL.clienteEmailEsperado) ? ' para ' + Com_s_(aL.clienteEmailEsperado) : '') };
  var ids = [Com_s_(p.PDF_ID), Com_s_(p.HTML_ID)].filter(Boolean);
  if (ids.length) {
    var e = Com_ler_(typeof ENVDOC_ABA !== 'undefined' ? ENVDOC_ABA : 'DOC_ENVIOS').filter(function (r) { return ids.indexOf(Com_s_(r.ARQUIVO_ID)) >= 0 && Com_up_(r.SITUACAO) === 'ENVIADO'; })[0];
    if (e) return { enviada: true, como: 'o documento saiu pelo "Enviar documento" (' + (Com_up_(e.CANAL) === 'WHATSAPP' ? 'WhatsApp' : Com_up_(e.CANAL) === 'EMAIL' ? 'e-mail' : Com_s_(e.CANAL).toLowerCase() || 'envio') + ' para ' + Com_s_(e.DESTINO_NOME || e.DESTINO) + (Com_iso_(e.QUANDO) ? ' em ' + Com_br_(e.QUANDO) : '') + ')' };
  }
  return { enviada: false, como: '' };
}

var COM_PROP_EXCLUIVEIS = ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'CANCELADA'];

/** Pode excluir? { pode, motivo (por que não, com o que fazer) }. Quem: o responsável pela proposta ou a gestão. */
function ComP_podeExcluir_(eu, p) {
  if (!eu || !(eu.gestao || eu.vendedor)) return { pode: false, motivo: 'Excluir proposta é da equipe comercial (o responsável pela proposta) e da gestão comercial.' };
  if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) return { pode: false, motivo: 'A proposta é de ' + (Com_s_(p.RESPONSAVEL_NOME) || 'outra pessoa') + ': só o responsável ou a gestão comercial excluem.' };
  var assE = ComP_assinadaCliente_(p);
  if (assE) return { pode: false, motivo: ComP_msgAssinada_(p, assE, 'excluir').replace(/^Não foi possível excluir: /, '') + '.' };
  var env = ComP_foiEnviada_(p);
  var s = Com_up_(p.SITUACAO);
  if (env.enviada) return { pode: false, motivo: 'A proposta já foi ao cliente (' + env.como + '): documento que o cliente recebeu não é excluído. ' +
    (s === 'CANCELADA' ? 'Ela já está cancelada: fora do funil, fica só no histórico e no filtro "Cancelada".' : ['APROVADA', 'RECUSADA', 'SUBSTITUIDA'].indexOf(s) >= 0 ? 'Ela fica no histórico da oportunidade.' : 'Use "Cancelar proposta" (com o motivo); ela sai do funil e fica no histórico.') };
  if (s === 'SUBSTITUIDA') return { pode: false, motivo: 'Esta revisão foi substituída por outra e faz parte da sequência de revisões da proposta. Para desfazer a revisão nova, abra a revisão nova e exclua aquela.' };
  if (COM_PROP_EXCLUIVEIS.indexOf(s) < 0) return { pode: false, motivo: 'A proposta está "' + (COM_SITUACOES_PROP[s] || s) + '" e não pode ser excluída.' };
  return { pode: true, motivo: '' };
}

/** Situação da revisão anterior antes de ser substituída (pelo histórico; sem registro, pela data de envio). */
function ComP_situacaoAntesDaRevisao_(ant) {
  var nomes = {};
  Object.keys(COM_SITUACOES_PROP).forEach(function (k) { nomes[COM_SITUACOES_PROP[k]] = k; });
  var h = Com_ler_(COM_ABAS.HISTORICO).filter(function (x) { return Com_s_(x.ENTIDADE) === 'PROPOSTA' && Com_s_(x.ENTIDADE_ID) === Com_s_(ant.ID) && Com_s_(x.TIPO) === 'SUBSTITUIDA'; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); })[0];
  var s = h ? nomes[Com_s_(h.DE)] : '';
  if (!s || s === 'SUBSTITUIDA') s = Com_s_(ant.ENVIADA_EM) ? 'ENVIADA' : 'RASCUNHO';
  if (s === 'ENVIADA' && Com_dia_(ant.VALIDA_ATE) && Com_dia_(ant.VALIDA_ATE) < Com_hoje_()) s = 'VENCIDA';
  return s;
}

/**
 * Excluir proposta que nunca foi ao cliente. d: { id, motivo (>= 10 letras) }.
 * Exclusão lógica: SITUACAO EXCLUIDA + EXCLUIDA_EM/POR/MOTIVO (o número não volta a ser usado). Registro no histórico da
 * proposta e da oportunidade. Revisão nova excluída devolve a anterior à situação que ela tinha.
 */
function ComP_excluir_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'excluir a proposta');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível excluir: escreva o motivo (pelo menos 10 letras, por exemplo "Proposta montada com o cliente errado"). O motivo fica registrado no histórico da oportunidade');
  ComP_sincronizarEnvios_(); // envio registrado há pouco pelo "Enviar documento" conta
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'excluir a proposta');
    var pe = ComP_podeExcluir_(eu, p);
    if (!pe.pode) throw new Error('Não foi possível excluir a proposta ' + ComP_rotulo_(p) + ': ' + pe.motivo.replace(/\.$/, ''));
    var s = Com_up_(p.SITUACAO), agora = Com_agora_(), rot = ComP_rotulo_(p);
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'EXCLUIDA', EXCLUIDA_EM: agora, EXCLUIDA_POR_ID: eu.id, EXCLUIDA_POR_NOME: eu.nome, EXCLUIDA_MOTIVO: motivo, ATUALIZADO_EM: agora });
    var texto = 'Proposta ' + rot + ' excluída por ' + eu.nome + ' em ' + Com_br_(agora) + ' (nunca foi enviada ao cliente; estava "' + (COM_SITUACOES_PROP[s] || s) + '"). Motivo: ' + motivo + ' O número ' + Com_s_(p.NUMERO) + ' não volta a ser usado.';
    Com_historico_('PROPOSTA', p.ID, 'EXCLUIDA', eu, { de: COM_SITUACOES_PROP[s] || s, para: 'Excluída', texto: texto });
    if (Com_s_(p.OPORTUNIDADE_ID)) Com_historico_('OPORTUNIDADE', p.OPORTUNIDADE_ID, 'PROPOSTA_EXCLUIDA', eu, { texto: texto });
    // 01/11/2026: ato irreversível avisa na hora o gestor da área e a Diretoria (SGO_Avisos_Gestao.js), depois de soltar a trava do módulo
    Com_depois_(function () { if (typeof SGO_avisoGestaoIrreversivel_ === 'function') SGO_avisoGestaoIrreversivel_({ evento: 'GI01', modulo: 'comercial', quem: eu, oque: 'Proposta excluída (nunca foi ao cliente)', item: 'proposta ' + rot + (Com_s_(p.CLIENTE_NOME) ? ' (' + Com_s_(p.CLIENTE_NOME) + ')' : ''), motivo: motivo,
      tela: Com_s_(p.OPORTUNIDADE_ID) ? { tipo: 'comercial', aba: 'oportunidades', id: p.OPORTUNIDADE_ID } : { tipo: 'comercial', aba: 'propostas' }, refId: 'PROP-EXC-' + p.ID }); });
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Cancelada', 'Proposta ' + rot + ' excluída: ' + motivo);
    if (Com_atividadeAberta_(Com_atividade_(p.VENCIMENTO_ATIVIDADE_ID))) Com_mudarAtividade_(p.VENCIMENTO_ATIVIDADE_ID, 'Cancelada', 'Proposta ' + rot + ' excluída: ' + motivo);
    var extra = '';
    var ant = Com_s_(p.REVISAO_DE) ? SGO_DATA.getById(COM_ABAS.PROPOSTAS, Com_s_(p.REVISAO_DE)) : null;
    if (ant && Com_s_(ant.SUBSTITUIDA_POR) === Com_s_(p.ID)) {
      var volta = { SUBSTITUIDA_POR: '', ATUALIZADO_EM: agora };
      if (Com_up_(ant.SITUACAO) === 'SUBSTITUIDA') volta.SITUACAO = ComP_situacaoAntesDaRevisao_(ant);
      SGO_DATA.update(COM_ABAS.PROPOSTAS, ant.ID, volta);
      var sitAnt = COM_SITUACOES_PROP[volta.SITUACAO || Com_up_(ant.SITUACAO)] || '';
      Com_historico_('PROPOSTA', ant.ID, 'REVISAO_EXCLUIDA', eu, { de: volta.SITUACAO ? 'Substituída' : sitAnt, para: sitAnt, texto: 'A revisão ' + rot + ' foi excluída; esta volta a ser a proposta em vigor (' + sitAnt.toLowerCase() + ').' });
      extra = ' A ' + ComP_rotulo_(ant) + ' voltou a ser a proposta em vigor (' + sitAnt.toLowerCase() + ').' + (Com_s_(ant.ENVIADA_EM) ? ' O retorno ao cliente sobre ela não volta sozinho: marque a próxima ação na oportunidade.' : '');
    }
    return { message: 'Proposta ' + rot + ' excluída: saiu das listas, do quadro e do painel. O registro (quem, quando e o motivo) fica no histórico da oportunidade.' + extra +
      (Com_s_(p.PDF_ID) ? ' O documento gerado continua guardado na pasta do cliente, mas não foi enviado e não vale como proposta.' : '') };
  });
}

/** Propostas que valem (sem as excluídas). Leitura para listas, quadro, painel e gestora. */
function ComP_excluida_(p) { return Com_up_(p && p.SITUACAO) === 'EXCLUIDA' || !!Com_s_(p && p.EXCLUIDA_EM); }
function ComP_lerPropostas_() { return Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return !ComP_excluida_(p); }); }

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
  // 01/11/2026 (Comercial C3): na recusa, quem ganhou e por quanto (opcional; alimenta o banco de preços)
  var vencedor = resp === 'RECUSADA' && typeof ComBP_vencedorDaTela_ === 'function' ? ComBP_vencedorDaTela_(d) : { concorrente: '', valorVencedor: null };
  var arq = d.arquivo || null;
  // 10/11/2026 (etapa 1): tipo do aceite (proposta assinada, ordem de compra ou e-mail de aprovação); na ordem de compra,
  // número, data e o arquivo da OC são obrigatórios. Chamada sem o tipo (telas antigas) continua aceita.
  var tipo = Com_up_(d.aceiteTipo), ocNumero = '', ocData = '';
  if (resp === 'APROVADA') {
    if (tipo && ['PROPOSTA_ASSINADA', 'ORDEM_COMPRA', 'EMAIL_APROVACAO'].indexOf(tipo) < 0) throw new Error('Não foi possível registrar a aprovação: escolha o tipo do aceite (proposta assinada, ordem de compra ou e-mail de aprovação)');
    if (tipo === 'ORDEM_COMPRA') {
      ocNumero = Com_texto_(d.ocNumero, 60).replace(/\s+/g, ' ').trim();
      ocData = Com_dia_(d.ocData);
      if (!ocNumero) throw new Error('Não foi possível registrar a aprovação: informe o número da ordem de compra do cliente. Ele vai para o histórico e para a passagem aos setores (o Financeiro fatura por ele)');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ocData)) throw new Error('Não foi possível registrar a aprovação: informe a data da ordem de compra (a data que está no documento do cliente)');
      if (ocData > Com_hoje_()) throw new Error('Não foi possível registrar a aprovação: a data da ordem de compra (' + Com_brDia_(ocData) + ') está no futuro. Confira a data no documento do cliente');
      if (!arq || !Com_s_(arq.base64) || !Com_s_(arq.nome)) throw new Error('Não foi possível registrar a aprovação: anexe o arquivo da ordem de compra do cliente (PDF ou imagem). Ele fica guardado na pasta do cliente e é a prova do pedido');
    }
    if (!arq || !Com_s_(arq.base64) || !Com_s_(arq.nome)) throw new Error('Não foi possível registrar a aprovação: anexe o arquivo do aceite do cliente (o e-mail de aprovação salvo em PDF, o pedido de compra ou a proposta assinada). Ele fica guardado na pasta do cliente e é a prova do pedido');
    if (String(arq.base64).length > 14 * 1024 * 1024) throw new Error('Não foi possível registrar a aprovação: o arquivo do aceite passa de 10 MB. Salve em PDF com tamanho menor e anexe de novo');
    if (!/\.(pdf|png|jpe?g|eml|msg|txt|docx?)$/i.test(Com_s_(arq.nome))) throw new Error('Não foi possível registrar a aprovação: o aceite precisa ser PDF, imagem (PNG ou JPG), e-mail (EML ou MSG), texto ou Word');
  }
  var p0 = ComP_obter_(eu, d.id, 'registrar a resposta');
  var s0 = Com_up_(p0.SITUACAO);
  // 10/11/2026: a aprovação também se registra na proposta pronta (o cliente recebeu por outro meio e mandou a OC ou o aceite):
  // antes ela passa a enviada; a recusa continua só na enviada ou vencida
  var prontaAprovada = s0 === 'PRONTA' && resp === 'APROVADA';
  if (s0 !== 'ENVIADA' && s0 !== 'VENCIDA' && !prontaAprovada) throw new Error('Não foi possível registrar a resposta: a proposta está "' + COM_SITUACOES_PROP[s0] + '". ' + (s0 === 'PRONTA' ? 'Na proposta pronta só se registra a aprovação (com o aceite ou a ordem de compra); a recusa se registra depois do envio' : 'A resposta do cliente se registra em proposta enviada (ou vencida)'));
  if (prontaAprovada && !Com_s_(p0.PDF_ID)) throw new Error('Não foi possível registrar a aprovação: gere o documento da proposta primeiro (botão "Gerar documento"). O aceite vale sobre a folha numerada que fica na pasta do cliente');
  if (resp === 'RECUSADA') { var ac0 = ComP_assinadaCliente_(p0); if (ac0) throw new Error(ComP_msgAssinada_(p0, ac0, 'registrar a recusa')); }
  var salvo = null;
  if (resp === 'APROVADA') {
    var cong = Com_json_(p0.CONGELADO_JSON, {}) || {};
    var pastaCli = SGO_DocSalvar_pastaClienteEm_(ComP_pastaRaiz_(), cong.pastaCnpj || '', (cong.cliente && cong.cliente.razao) || Com_s_(p0.CLIENTE_NOME));
    var sub = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(pastaCli, 'Aceites') : pastaCli;
    var nomeArq = SGO_DocSalvar_sanitizarNome_((tipo === 'ORDEM_COMPRA' ? 'Ordem de compra ' + ocNumero + ' - ' : 'Aceite - ') + ComP_rotulo_(p0) + ' - ' + Com_s_(arq.nome));
    var blob = Utilities.newBlob(Utilities.base64Decode(String(arq.base64).replace(/^data:[^,]+,/, '')), Com_s_(arq.tipo) || 'application/octet-stream', nomeArq);
    var f = sub.createFile(blob);
    salvo = { id: f.getId(), nome: f.getName(), url: f.getUrl() };
  }
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, p0.ID);
    if (Com_up_(p.SITUACAO) !== s0) throw new Error('Não foi possível registrar: a proposta mudou de situação. Atualize a tela');
    var agora = Com_agora_(), quando = Com_dia_(d.data) ? Com_dia_(d.data) + agora.slice(10) : agora;
    var tmR = ComP_termosDa_(p);
    if (resp === 'APROVADA') {
      var tipoNome = tipo ? COM_TIPOS_ACEITE[tipo] : '';
      var ocTxt = tipo === 'ORDEM_COMPRA' ? 'Ordem de compra nº ' + ocNumero + ' de ' + Com_brDia_(ocData) : '';
      if (prontaAprovada) Object.assign(p, ComP_aoEnviar_(p, quando, tipo === 'ORDEM_COMPRA' ? 'Aceite por ordem de compra (nº ' + ocNumero + ' de ' + Com_brDia_(ocData) + '), registrado por ' + eu.nome
        : 'Aceite do cliente registrado com a proposta pronta (' + (tipoNome ? tipoNome.toLowerCase() : 'aceite anexado') + '), por ' + eu.nome, eu, { semRetorno: true }));
      // 28/10/2026: a aprovação registrada pelo vendedor, com o aceite anexado. O histórico diz qual versão dos termos e
      // condições o cliente recebeu no documento. 10/11/2026: a assinatura pelo link usa o mesmo núcleo (ComP_aplicarAprovacao_).
      var notaTermos = tmR.congelado && Com_s_(tmR.texto) ? ' Aprovado por fora (registro de ' + eu.nome + '): termos e condições da contratação da versão ' + tmR.versao + ' enviados no documento.'
        : ' Aprovado por fora (registro de ' + eu.nome + '): o documento enviado é anterior aos termos fixos e não trazia a seção de termos e condições.';
      var r = ComP_aplicarAprovacao_(p, eu, { quando: quando, texto: texto, arquivo: salvo, aceiteTipo: tipo, ocNumero: ocNumero, ocData: ocData, via: tipo === 'ORDEM_COMPRA' ? 'OC' : 'ACEITE', marcarGanha: d.marcarGanha !== false,
        textoHistorico: texto + (tipoNome ? ' Tipo do aceite: ' + tipoNome.toLowerCase() + '.' : '') + (ocTxt ? ' ' + ocTxt + '.' : '') + (salvo ? ' Aceite: ' + salvo.nome + '.' : '') + notaTermos,
        resumoContato: 'Cliente aprovou a proposta ' + ComP_rotulo_(p) + (ocTxt ? ' (' + ocTxt.charAt(0).toLowerCase() + ocTxt.slice(1) + ')' : '') + '. ' + texto });
      return { proposta: ComP_paraTela_(eu, Object.assign({}, p, r.campos), true), ganhou: r.ganhou,
        message: 'Aprovação registrada' + (ocTxt ? ' (' + ocTxt.charAt(0).toLowerCase() + ocTxt.slice(1) + ')' : '') + (r.ganhou ? ' e oportunidade ganha' : '') + '. Agora toque em "Passar aos setores".' };
    }
    var campos = { SITUACAO: resp, RESPOSTA_EM: quando, RESPOSTA_POR_NOME: eu.nome, RESPOSTA_TEXTO: texto, ATUALIZADO_EM: agora, MOTIVO_RECUSA: Com_s_(d.motivo) };
    if (vencedor.concorrente) campos.CONCORRENTE_VENCEDOR = vencedor.concorrente;
    if (vencedor.valorVencedor) campos.VALOR_VENCEDOR = Com_r2_(vencedor.valorVencedor);
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    if (typeof ComBP_registrarProposta_ === 'function') ComBP_registrarProposta_(Object.assign({}, p, campos), 'PERDIDO', vencedor);
    if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Concluída', 'Cliente recusou a proposta.');
    // 10/11/2026 (D9): o aviso "Proposta vence em ..." também se encerra com a resposta
    if (Com_atividadeAberta_(Com_atividade_(p.VENCIMENTO_ATIVIDADE_ID))) Com_mudarAtividade_(p.VENCIMENTO_ATIVIDADE_ID, 'Concluída', 'Cliente recusou a proposta.');
    Com_historico_('PROPOSTA', p.ID, resp, eu, { de: COM_SITUACOES_PROP[s0], para: COM_SITUACOES_PROP[resp], texto: Com_s_(d.motivo) + '. ' + texto });
    var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
    if (o) {
      SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: 'EMAIL', RESPONDEU: 'SIM', RESUMO: 'Cliente recusou a proposta ' + ComP_rotulo_(p) + '. ' + texto,
        CONTATO_ID: Com_s_(p.CONTATO_ID), CONTATO_NOME: Com_s_(p.CONTATO_NOME), USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: quando });
      SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ULTIMO_CONTATO_EM: quando, TENTATIVAS_SEM_RESPOSTA: 0, ATUALIZADO_EM: agora });
    }
    var aviso = '';
    if (o && Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') {
      try {
        var prazo = Com_somarDiasUteis_(Com_hoje_(), 1) + 'T10:00';
        if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Cliente recusou a proposta.');
        var atv = Com_criarAtividade_({ comoPessoa: eu, responsavelId: Com_s_(o.RESPONSAVEL_ID), titulo: 'Decidir após a recusa da proposta ' + ComP_rotulo_(p) + ': ' + Com_s_(o.CLIENTE_NOME),
          descricao: 'O cliente recusou (' + Com_s_(d.motivo) + '). Entenda a recusa e decida: nova revisão da proposta ou registrar a perda na oportunidade ' + o.CODIGO + '.', prazo: prazo,
          clienteId: Com_s_(o.CLIENTE_ID), unidadeId: Com_s_(o.UNIDADE_ID), porQue: 'Toda recusa tem um próximo passo: revisar ou encerrar com o motivo real.', onde: 'Comercial > Oportunidades > ' + o.CODIGO, restrita: true });
        SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ATIVIDADE_ID: atv, PROXIMA_ACAO: 'Decidir após a recusa: nova revisão ou perda', PROXIMA_ACAO_TIPO: 'LIGACAO', PROXIMA_ACAO_EM: prazo });
      } catch (e) { aviso = ' Não foi possível criar a atividade de decisão: ' + String((e && e.message) || e) + '.'; }
    }
    var titulo = 'Cliente recusou a proposta ' + ComP_rotulo_(p);
    var txt = Com_s_(p.CLIENTE_NOME) + ': recusada (' + Com_s_(d.motivo) + '). Registrado por ' + eu.nome + '.';
    var avisar = Com_idsGestaoComercial_([eu.id]);
    if (Com_s_(p.RESPONSAVEL_ID) !== eu.id) avisar.push(Com_s_(p.RESPONSAVEL_ID));
    avisar.forEach(function (uid) { Com_avisar_(uid, 'RESPOSTA_' + resp, titulo, txt, { tipo: 'proposta', id: p.ID }, { email: true }); });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), ganhou: false,
      message: 'Recusa registrada' + (vencedor.concorrente || vencedor.valorVencedor ? ', com quem ganhou e por quanto (vai para o banco de preços)' : '') + '. A decisão (nova revisão ou perda) está em Minhas atividades para amanhã.' + aviso };
  });
}

// ------------------------------------------------------------
// PASSAGEM AOS SETORES
// ------------------------------------------------------------
/** Setores obrigatórios pelos itens: serviço ou contrato -> Área técnica; produto -> Compras; Financeiro sempre. */
function ComP_setoresObrigatorios_(p) {
  var s = { FINANCEIRO: true };
  Com_json_(p.ITENS_JSON, []).forEach(function (i) { if (i.auto) return; if (i.tipo === 'PRODUTO') s.COMPRAS = true; else s.TECNICA = true; });
  return Object.keys(s);
}

/** Quem recebe no setor: o escolhido, o configurado, o gestor da área (Caixa de decisões) ou Gestor da área; sem ninguém, a Diretoria. */
function ComP_responsavelSetor_(setor, escolhido, met) {
  var us = Com_usuarios_();
  if (escolhido && us[escolhido] && us[escolhido].ativo) return { id: escolhido, nome: us[escolhido].nome, motivo: 'escolhido por quem passou o pedido' };
  var conf = ((met.posVenda.destinatarios || {})[setor] || []).filter(function (id) { return us[id] && us[id].ativo; });
  if (conf.length) return { id: conf[0], nome: us[conf[0]].nome, motivo: 'responsável configurado para o setor' };
  // 21/10/2026: Compras: o comprador das Regras de compras (é ele quem cota e faz o pedido de compra); sem comprador na lista,
  // segue a regra da área (gestor de Logística). Antes ia ao gestor da área e o comprador não recebia nada.
  if (setor === 'COMPRAS' && typeof Cmp_regras_ === 'function' && typeof Cmp_compradoresAtivos_ === 'function' && typeof Cmp_usuarios_ === 'function') {
    try {
      var compradores = Cmp_compradoresAtivos_(Cmp_regras_(), Cmp_usuarios_()).filter(function (id) { return us[id] && us[id].ativo; });
      if (compradores.length) return { id: compradores[0], nome: us[compradores[0]].nome, motivo: 'comprador das Regras de compras' };
    } catch (eC) { /* sem Compras: segue a regra da área */ }
  }
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
    // 01/11/2026: o escopo técnico de cada item do catálogo oficial (pontos, receitas, parâmetros, NR-13) vai junto, sem valores
    var itensTxt = Com_json_(p.ITENS_JSON, []).filter(function (i) { return !i.auto; }).map(function (i) { var esc = typeof ComCat_escopoTexto_ === 'function' ? ComCat_escopoTexto_(i) : ''; return '- ' + i.quantidade + ' ' + (i.unidade || 'un.') + ' · ' + (i.codigo ? i.codigo + ' ' : '') + i.descricao + (i.equipamentoTexto ? ' (' + i.equipamentoTexto + ')' : '') + (esc ? '\n  Escopo técnico: ' + esc : ''); }).join('\n');
    var cond = Com_json_(p.CONDICOES_JSON, {}) || {};
    var hoje = Com_hoje_(), novos = [];
    pedidos.forEach(function (s) {
      var cfgS = met.posVenda[s] || {}, r = ComP_responsavelSetor_(s, Com_s_((d.responsaveis || {})[s]), met);
      var prazo = Com_somarDiasUteis_(hoje, Number(cfgS.prazoDiasUteis) || 2) + 'T17:00';
      var desc0 = 'Pedido aprovado ' + ComP_rotulo_(p) + ' de ' + Com_s_(p.CLIENTE_NOME) + (Com_s_(p.UNIDADE_NOME) ? ' (' + Com_s_(p.UNIDADE_NOME) + ')' : '') + '. Vendedor: ' + Com_s_(p.RESPONSAVEL_NOME) + '.' +
        // 10/11/2026 (etapa 1): como o cliente aceitou e o número da ordem de compra (o Financeiro fatura por ele)
        (COM_TIPOS_ACEITE[Com_up_(p.ACEITE_TIPO)] ? '\nAceite do cliente: ' + COM_TIPOS_ACEITE[Com_up_(p.ACEITE_TIPO)].toLowerCase() + '.' : '') +
        (Com_s_(p.OC_NUMERO) ? '\nOrdem de compra do cliente: nº ' + Com_s_(p.OC_NUMERO) + (Com_dia_(p.OC_DATA) ? ' de ' + Com_brDia_(p.OC_DATA) : '') + ' (arquivo na pasta do cliente, em Aceites).' : '') + '\n\n' +
        'Lista de conferência:\n' + (cfgS.checklist || []).map(function (c) { return '[ ] ' + c; }).join('\n') + '\n\nItens do pedido:\n' + itensTxt +
        (s === 'TECNICA' && cond.prazoExecucao ? '\n\nPrazo de execução combinado: ' + cond.prazoExecucao : '') +
        (s === 'FINANCEIRO' ? '\n\nValor, condição de pagamento e dados de faturamento: Comercial > Pedidos aprovados > ' + ComP_rotulo_(p) + '.' : '') +
        // 29/10/2026: viagem prevista na proposta (equipe, destino, dias), sem valores
        ((s === 'TECNICA' || s === 'FINANCEIRO') && typeof ComPr_resumoSemValor_ === 'function' && ComPr_resumoSemValor_(p, s) ? '\n\n' + ComPr_resumoSemValor_(p, s) : '') +
        (obs ? '\n\nObservação do vendedor: ' + obs : '') + '\n\nAo concluir, conte o que foi feito (número da O.S., do pedido de compra ou da nota fiscal).';
      // a atividade guarda até 4.000 letras: com escopo técnico longo, o final aponta para a proposta (onde está o escopo inteiro)
      var desc = desc0.length > 3990 ? desc0.slice(0, 3800) + '\n\n(continua: o escopo técnico completo de cada item está na proposta ' + ComP_rotulo_(p) + ', Comercial > Pedidos aprovados)' : desc0;
      var atv = Com_criarAtividade_({ responsavelId: r.id, titulo: 'Pedido aprovado ' + ComP_rotulo_(p) + ' · ' + COM_SETORES[s] + ': ' + Com_s_(p.CLIENTE_NOME), descricao: desc, prazo: prazo, prioridade: 'Alta',
        modulo: cfgS.modulo || 'comercial', moduloNome: cfgS.modulo === 'cronograma_execucao' ? 'Cronograma de execução' : 'Comercial', clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID),
        porQue: 'Pedido aprovado pelo cliente: o setor ' + COM_SETORES[s] + ' executa a sua parte.', onde: s === 'TECNICA' ? 'Cronograma de execução e Minhas atividades' : 'Minhas atividades',
        como: (cfgS.checklist || []).join('; '), restrita: s !== 'TECNICA' });
      // 21/10/2026: Compras nativo: o pedido aprovado também abre a requisição de compra com os produtos, sem o valor de venda (SGO_Compras_Pedido.js).
      if (s === 'COMPRAS' && typeof Compras_doPedidoComercial_ === 'function') { try { Compras_doPedidoComercial_(p, { setorResponsavelId: r.id, atividadeId: atv }); } catch (eCmp) { console.error('Comercial -> Compras: ' + ((eCmp && eCmp.message) || eCmp)); } }
      // 21/10/2026: Assistência técnica nativa: o pedido aprovado com serviço técnico também abre o chamado da Técnica (sem valores, SGO_Assistencia_Chamados.js).
      if (s === 'TECNICA' && typeof Assistencia_doPedidoComercial_ === 'function') { try { Assistencia_doPedidoComercial_(p, { responsavelId: r.id, atividadeId: atv }); } catch (eAst) { console.error('Comercial -> Assistência: ' + ((eAst && eAst.message) || eAst)); } }
      novos.push({ setor: s, setorNome: COM_SETORES[s], responsavelId: r.id, responsavelNome: r.nome, motivo: r.motivo, atividadeId: atv, prazo: prazo, avisadoConclusao: false });
    });
    var passagem = ja.concat(novos), agora = Com_agora_();
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { PEDIDO_SITUACAO: 'EM_ANDAMENTO', PASSAGEM_EM: Com_s_(p.PASSAGEM_EM) || agora, PASSAGEM_JSON: JSON.stringify(passagem), ATUALIZADO_EM: agora });
    Com_historico_('PROPOSTA', p.ID, 'PASSAGEM', eu, { texto: novos.map(function (n) { return n.setorNome + ': ' + n.responsavelNome + ' até ' + Com_br_(n.prazo); }).join('; ') + (Com_s_(p.OC_NUMERO) ? '. Ordem de compra nº ' + Com_s_(p.OC_NUMERO) + ' informada aos setores' : '') + (obs ? '. Observação: ' + obs : '') });
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
    // 10/11/2026: proposta assinada pelo cliente não vence nem gera aviso de vencimento (a assinatura é o aceite)
    if (ComP_assinadaCliente_(p)) return;
    if (ate < hoje) {
      Com_comTrava_(function () {
        SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'VENCIDA', ATUALIZADO_EM: Com_agora_() });
        Com_historico_('PROPOSTA', p.ID, 'VENCIDA', { id: 'COMERCIAL', nome: 'Comercial (rotina)' }, { de: 'Enviada ao cliente', para: 'Vencida sem resposta', texto: 'Validade até ' + Com_brDia_(ate) + ' sem resposta registrada.' });
      });
      r.vencidas++;
      return;
    }
    var falta = Com_diasEntre_(hoje, ate);
    if (!ComP_investimento_(p) && falta <= (Number(met.cadencia.propostaVencendoDias) || 3) && !Com_s_(p.VENCIMENTO_AVISADO_EM)) {
      try {
        var avisoAtividade = Com_criarAtividade_({ responsavelId: Com_s_(p.RESPONSAVEL_ID), titulo: 'Proposta ' + ComP_rotulo_(p) + ' vence em ' + Com_brDia_(ate) + ': ' + Com_s_(p.CLIENTE_NOME),
          descricao: 'Confirme a decisão do cliente ou renove a validade com uma nova revisão. Se não houver mais interesse, registre a perda com o motivo real.', prazo: hoje + 'T17:00',
          clienteId: Com_s_(p.CLIENTE_ID), unidadeId: Com_s_(p.UNIDADE_ID), porQue: 'A proposta está perto de vencer sem resposta do cliente.', onde: 'Comercial > Propostas > ' + ComP_rotulo_(p), restrita: true });
      } catch (e) { console.error('Comercial, aviso de validade: ' + ((e && e.message) || e)); }
      SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { VENCIMENTO_AVISADO_EM: Com_agora_(), VENCIMENTO_ATIVIDADE_ID: avisoAtividade || '' });
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


/** Investimento suspende apenas a cadência comercial; não altera validade, preço ou recebíveis. */
function ComP_investimento_(p) { return Com_up_(p && p.INVESTIMENTO) === 'SIM'; }
function ComP_opInvestimento_(o, propostas) {
  var l = (propostas || ComP_lerPropostas_()).filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && !Com_s_(p.SUBSTITUIDA_POR) && ['RASCUNHO', 'PRONTA', 'ENVIADA', 'VENCIDA', 'AGUARDANDO_APROVACAO'].indexOf(Com_up_(p.SITUACAO)) >= 0; });
  return l.length > 0 && l.every(ComP_investimento_);
}
function ComP_marcarInvestimento_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'definir orçamento para investimento');
  if (!d || typeof d.investimento !== 'boolean') throw new Error('Informe se o orçamento é para investimento.');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'definir orçamento para investimento');
    if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Somente o responsável ou a gestão pode mudar esta opção.');
    if (['RASCUNHO', 'PRONTA', 'ENVIADA', 'VENCIDA', 'AGUARDANDO_APROVACAO'].indexOf(Com_up_(p.SITUACAO)) < 0 || Com_s_(p.SUBSTITUIDA_POR)) throw new Error('Esta proposta está encerrada ou substituída. Use a revisão atual.');
    if (ComP_investimento_(p) === d.investimento) return { proposta: ComP_paraTela_(eu, p, true), message: 'A opção já estava aplicada.' };
    var campos = { INVESTIMENTO: d.investimento ? 'SIM' : 'NAO', ATUALIZADO_EM: Com_agora_() }, canceladas = [];
    if (d.investimento) {
      ['RETORNO_ATIVIDADE_ID', 'VENCIMENTO_ATIVIDADE_ID'].forEach(function (k) {
        var id = Com_s_(p[k]), a = Com_atividade_(id);
        // Somente o vínculo guardado pela própria proposta e seu responsável atual; nenhuma busca/cancelamento por título.
        if (id && Com_atividadeAberta_(a) && Com_s_(a.RESPONSAVEL_ID) === Com_s_(p.RESPONSAVEL_ID) && Com_s_(a.CLIENTE_ID) === Com_s_(p.CLIENTE_ID)) {
          if (!Com_mudarAtividade_(id, 'Cancelada', 'Orçamento para investimento: cadência comercial suspensa na proposta ' + ComP_rotulo_(p) + '.')) throw new Error('Não foi possível suspender a atividade automática vinculada. Tente novamente.');
          canceladas.push(id); campos[k] = '';
        }
      });
      var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
      if (o && canceladas.indexOf(Com_s_(o.ATIVIDADE_ID)) >= 0) SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ATIVIDADE_ID: '', PROXIMA_ACAO: '', PROXIMA_ACAO_TIPO: '', PROXIMA_ACAO_EM: '', ATUALIZADO_EM: Com_agora_() });
    }
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    Com_historico_('PROPOSTA', p.ID, 'INVESTIMENTO', eu, { de: ComP_investimento_(p) ? 'Investimento' : 'Fluxo normal', para: d.investimento ? 'Investimento' : 'Fluxo normal', texto: d.investimento ? 'Aguardando aprovação de investimento; sem cobranças automáticas de retorno. Preços e validade preservados.' : 'Fluxo comercial normal retomado por decisão do responsável.' });
    return { proposta: ComP_paraTela_(eu, Object.assign({}, p, campos), true), message: d.investimento ? 'Orçamento marcado como investimento. Cobranças automáticas de retorno suspensas; a validade dos preços permanece.' : 'Orçamento voltou ao fluxo comercial normal. Confira a próxima ação na oportunidade.' };
  });
}
