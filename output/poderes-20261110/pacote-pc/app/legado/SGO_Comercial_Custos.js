/****************************************************
 * COMERCIAL — CUSTO COM COTAÇÃO DO FORNECEDOR, VALIDADE E PREÇO SUGERIDO (11/11/2026)
 *
 * Pedido do dono (11/11/2026), depois da PROP-2026-0028 (produto sem custo, proposta R$ 5.942 abaixo do mínimo):
 *  1. Custo do catálogo só se grava com a cotação do fornecedor anexada (PDF ou imagem): fornecedor, data da cotação, validade,
 *     valor unitário e quem anexou. Vale para PRODUTO e para SERVIÇO/CONTRATO com custo digitado (terceiro ou insumo). O serviço
 *     cujo custo vem da ficha de custo (horas x custo da hora da política, SGO_Comercial_Ficha.js) não precisa de cotação: o custo é
 *     calculado na hora pela política em vigor e nunca fica "velho".
 *  2. Validade: até a validade da cotação, limitada ao teto da gestão (padrão 90 dias a partir da data da cotação; teto por
 *     categoria opcional). A validade calculada fica gravada na versão (VALIDO_ATE): mudar o teto vale para as cotações novas.
 *  3. Situação do custo de cada item (ComCu_situacao_): VIGENTE, VENCENDO (dentro do aviso antecipado, padrão 15 dias), VENCIDO,
 *     SEM_ANEXO (custo antigo sem cotação, ou custo mudado por outro caminho: o valor não confere com o da cotação) e SEM_CUSTO.
 *     VENCIDO e SEM_ANEXO são "sem custo válido": a proposta com o item vai para a aprovação da Diretoria (pendência
 *     CUSTO_SEM_COTACAO em ComP_pendenciasPreco_, o mesmo fluxo do item sem custo). A reconferência antes do documento, do
 *     envio, do link e do aceite pega o custo que venceu depois da conclusão; a proposta concluída antes de 11/11/2026 (sem o
 *     retrato dos custos) não é barrada pelo custo antigo sem anexo, só pelo que vencer.
 *  4. Histórico por item (COM_CUSTOS_COTACOES, uma linha por versão; nada é apagado), painel "Custos a atualizar" com a
 *     prioridade pelo uso em propostas abertas, avisos aos responsáveis (sistema; e-mail só no expediente; nunca WhatsApp; sem
 *     valores) e sinal à gestão quando o preço de tabela fica abaixo do piso com o custo novo (o preço não muda sozinho).
 *  5. Ampliação (11/11/2026): guia de preço da proposta (ComCu_guiaPrecos_): por item, o preço mínimo (sobra mínima) e o preço
 *     sugerido (margem alvo da política), onde o preço digitado está, e as opções antes de concluir: usar o sugerido, ajustar
 *     ao mínimo, manter e pedir autorização (fluxo existente) ou pedir a atualização do custo.
 *
 * Quem grava custo (sem mudança de permissão): gestão comercial, Diretoria, Administrador e Financeiro (catálogo completo) em
 * qualquer item; a equipe comercial só no PRODUTO novo que ela cadastra (custo obrigatório). A cotação é exigida de todos.
 * Fórmula e percentuais da política não mudam: mínimo e sugerido usam ComPr_precoProduto_ e ComPr_precoServicoConta_.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var COM_PASTA_COTACOES = 'Comercial - Cotações de custo';
var COM_CU_MAX_BYTES = 10 * 1024 * 1024;
// carenciaLegadoAte (11/11/2026, decisão do dono na implantação): custo cadastrado antes da cotação obrigatória, sem cotação anexada,
// continua valendo para o cálculo do mínimo até esta data (situação LEGADO, com aviso); depois vira SEM_ANEXO (sem custo válido).
var COM_CU_PADRAO = { tetoDias: 90, avisoDias: 15, carenciaLegadoAte: '2026-12-11' };
var COM_CU_NOMES = { VIGENTE: 'Custo vigente', VENCENDO: 'Custo vencendo', VENCIDO: 'Custo vencido', SEM_ANEXO: 'Custo sem cotação', LEGADO: 'Custo sem cotação (prazo para anexar)', SEM_CUSTO: 'Sem custo', FICHA: 'Custo pela ficha' };
var COM_CU_ABERTAS = ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA'];
var COM_CU_MEMO = null;

// ------------------------------------------------------------
// CONFIGURAÇÃO (COM_CONFIG, CHAVE 'CUSTOS', uma linha por versão)
// ------------------------------------------------------------
function ComCu_inteiro_(v, min, max, padrao) { var n = Math.round(Number(v)); return isFinite(n) && n >= min && n <= max ? n : padrao; }

/** { tetoDias, avisoDias, tetoPorCategoria: { categoriaNormalizada: { nome, dias } }, responsaveis: [ids], versao, em, por } */
function ComCu_config_() {
  if (COM_CU_MEMO && Date.now() - COM_CU_MEMO.em < 20000) return COM_CU_MEMO.cfg;
  var l = Com_ler_(COM_ABAS.CONFIG).filter(function (r) { return Com_s_(r.CHAVE) === 'CUSTOS'; }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
  var v = l[0] ? (Com_json_(l[0].VALOR_JSON, {}) || {}) : {};
  var cats = {};
  (Array.isArray(v.tetoPorCategoria) ? v.tetoPorCategoria : []).forEach(function (x) { var k = Com_normBusca_(x && x.categoria); var d = ComCu_inteiro_(x && x.dias, 1, 730, 0); if (k && d) cats[k] = { nome: Com_s_(x.categoria), dias: d }; });
  var cfg = { carenciaLegadoAte: /^\d{4}-\d{2}-\d{2}$/.test(Com_s_(v.carenciaLegadoAte)) ? Com_s_(v.carenciaLegadoAte) : COM_CU_PADRAO.carenciaLegadoAte, tetoDias: ComCu_inteiro_(v.tetoDias, 1, 730, COM_CU_PADRAO.tetoDias), avisoDias: ComCu_inteiro_(v.avisoDias, 1, 120, COM_CU_PADRAO.avisoDias), tetoPorCategoria: cats,
    responsaveis: (Array.isArray(v.responsaveis) ? v.responsaveis : []).map(Com_s_).filter(Boolean), versao: l[0] ? Number(l[0].VERSAO) || 1 : 0,
    em: l[0] ? Com_br_(l[0].ATUALIZADO_EM || l[0].CRIADO_EM) : '', por: l[0] ? Com_s_(l[0].ATUALIZADO_POR_NOME) : '' };
  COM_CU_MEMO = { em: Date.now(), cfg: cfg };
  return cfg;
}

/** Teto de validade (dias desde a data da cotação) do item: o da categoria, se houver; senão o padrão. */
function ComCu_tetoDe_(p, cfg) {
  cfg = cfg || ComCu_config_();
  var c = cfg.tetoPorCategoria[Com_normBusca_(p && p.CATEGORIA)];
  return c ? c.dias : cfg.tetoDias;
}

/** Quem mantém os custos e recebe os avisos: os configurados (ativos e com o catálogo completo); sem ninguém, a gestão comercial. */
function ComCu_responsaveis_(cfg) {
  cfg = cfg || ComCu_config_();
  var us = Com_usuarios_(), gest = Com_gestoresConfigurados_();
  var l = cfg.responsaveis.filter(function (id) { var u = us[id]; return u && u.ativo && Com_nivelDe_(u, gest).catalogo; });
  return l.length ? l : Com_idsGestaoComercial_();
}

// ------------------------------------------------------------
// SITUAÇÃO DO CUSTO DE UM ITEM
// ------------------------------------------------------------
/**
 * Situação do custo de uma linha de COM_PRODUTOS. { codigo, nome, valido, validoAte (aaaa-mm-dd), validoAteTxt, dias, texto }.
 * valido: o custo pode ser usado sem a aprovação da Diretoria (VIGENTE, VENCENDO, FICHA).
 */
function ComCu_situacao_(p, cfg, hoje) {
  cfg = cfg || ComCu_config_(); hoje = hoje || Com_hoje_();
  var r = function (codigo, texto, extra) { return Object.assign({ codigo: codigo, nome: COM_CU_NOMES[codigo], valido: ['VIGENTE', 'VENCENDO', 'FICHA', 'LEGADO'].indexOf(codigo) >= 0, validoAte: '', validoAteTxt: '', dias: null, texto: texto }, extra || {}); };
  if (!p) return r('SEM_CUSTO', 'item fora do catálogo (sem custo)');
  if (typeof ComF_fichaVale_ === 'function' && ComF_fichaVale_(p)) return r('FICHA', 'custo calculado pela ficha de custo com a política em vigor');
  var custo = Com_s_(p.CUSTO) === '' ? null : Number(p.CUSTO);
  if (!(custo > 0)) return r('SEM_CUSTO', 'sem custo cadastrado');
  var ate = Com_dia_(p.CUSTO_VALIDO_ATE);
  // custo antigo (sem nenhuma cotação): vale até a carência, com aviso; custo mudado por outro caminho (cotação não confere) não tem carência
  var car = Com_dia_(cfg.carenciaLegadoAte);
  if (!Com_s_(p.CUSTO_COTACAO_ID) && car && Com_diasEntre_(hoje, car) >= 0) {
    var dl = Com_diasEntre_(hoje, car);
    return r('LEGADO', 'custo cadastrado antes da cotação obrigatória: anexe a cotação do fornecedor até ' + Com_brDia_(car) + ' (' + Com_plural_(dl, 'dia', 'dias') + '); depois disso o item passa a precisar da aprovação da Diretoria', { validoAte: car, validoAteTxt: Com_brDia_(car), dias: dl });
  }
  if (!Com_s_(p.CUSTO_COTACAO_ID) || !ate || Math.abs((Number(p.CUSTO_COTACAO_VALOR) || 0) - custo) > 0.004)
    return r('SEM_ANEXO', Com_s_(p.CUSTO_COTACAO_ID) ? 'o custo cadastrado não confere com o da última cotação anexada (foi mudado por outro caminho)' : 'custo sem a cotação do fornecedor anexada (cadastro anterior a 11/11/2026)');
  var dias = Com_diasEntre_(hoje, ate), x = { validoAte: ate, validoAteTxt: Com_brDia_(ate), dias: dias };
  if (dias < 0) return r('VENCIDO', 'cotação vencida em ' + Com_brDia_(ate), x);
  if (dias <= cfg.avisoDias) return r('VENCENDO', 'cotação vence em ' + Com_brDia_(ate) + (dias === 0 ? ' (hoje)' : ' (' + Com_plural_(dias, 'dia', 'dias') + ')'), x);
  return r('VIGENTE', 'cotação válida até ' + Com_brDia_(ate), x);
}

/** Parte da situação do custo para a tela. Sem valores para quem não vê custo; quem vê custo recebe fornecedor e data da cotação. */
function ComCu_paraTela_(p, eu, cfg, hoje) {
  var s = ComCu_situacao_(p, cfg, hoje), t = { codigo: s.codigo, nome: s.nome, valido: s.valido, validoAte: s.validoAteTxt, texto: s.texto };
  if (eu && eu.veCusto && Com_s_(p && p.CUSTO_COTACAO_ID)) { t.fornecedor = Com_s_(p.CUSTO_FORNECEDOR); t.cotacaoEm = Com_brDia_(p.CUSTO_COTACAO_EM); t.por = Com_s_(p.CUSTO_POR_NOME); t.em = Com_br_(p.CUSTO_EM); }
  return t;
}

// ------------------------------------------------------------
// COTAÇÃO: CONFERÊNCIA E GRAVAÇÃO DA VERSÃO
// ------------------------------------------------------------
function ComCu_sha_(bytes) { return typeof ComAss_sha_ === 'function' ? ComAss_sha_(bytes) : ''; }
/** Tipo do arquivo pelos primeiros bytes: PDF, PNG ou JPG ('' = outro). */
function ComCu_tipoDosBytes_(bytes) {
  var b = function (i) { return (Number(bytes[i]) || 0) & 255; };
  if (bytes.length > 4 && b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'application/pdf';
  if (bytes.length > 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4E && b(3) === 0x47) return 'image/png';
  if (bytes.length > 3 && b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF) return 'image/jpeg';
  return '';
}

/** Linha de COM_PRODUTOS de outro módulo (Compras) pode não existir: leitura que não lança. */
function ComCu_lerSeguro_(aba) { try { return Com_ler_(aba); } catch (e) { return []; } }

/** Orçamentos de Compras com arquivo, ativos e na validade, de pedidos que têm este item do catálogo. [{ id, itemId, fornecedor, valor, data, validade, ... }] */
function ComCu_orcamentosCompras_(produtoId, hoje) {
  hoje = hoje || Com_hoje_();
  var itens = ComCu_lerSeguro_('CMP_ITENS').filter(function (i) { return Com_s_(i.PRODUTO_ID) === Com_s_(produtoId) && Com_up_(i.ATIVO || 'SIM') !== 'NAO'; });
  if (!itens.length) return [];
  var cots = ComCu_lerSeguro_('CMP_COTACOES'), l = [];
  itens.forEach(function (it) {
    cots.filter(function (c) { return Com_s_(c.REQUISICAO_ID) === Com_s_(it.REQUISICAO_ID) && Com_up_(c.SITUACAO) !== 'RETIRADA' && Com_s_(c.ARQUIVO_ID); }).forEach(function (c) {
      var pr = (Com_json_(c.PRECOS_JSON, []) || []).filter(function (x) { return Com_s_(x.itemId) === Com_s_(it.ID); })[0];
      var pu = pr ? Number(pr.precoUnitario) : NaN, sub = Number(c.SUBTOTAL) || 0;
      if (!(pu > 0)) return;
      // custo do item = preço unitário + frete e impostos do orçamento rateados pelo valor (custo posto na Metrolabs)
      var extra = (Number(c.FRETE) || 0) + (Number(c.IMPOSTOS) || 0), valor = Com_r2_(pu + (sub > 0 ? extra * pu / sub : 0));
      var validade = Com_dia_(c.VALIDADE);
      l.push({ id: Com_s_(c.ID), itemId: Com_s_(it.ID), fornecedor: Com_s_(c.FORNECEDOR_NOME), fornecedorId: Com_s_(c.FORNECEDOR_ID), valor: valor, valorTxt: Com_moeda_(valor), precoUnitarioTxt: Com_moeda_(pu),
        data: Com_dia_(c.CRIADO_EM), dataTxt: Com_brDia_(c.CRIADO_EM), validade: validade, validadeTxt: Com_brDia_(validade), vencida: !validade || validade < hoje, arquivoNome: Com_s_(c.ARQUIVO_NOME), referencia: Com_s_(c.REFERENCIA) });
    });
  });
  return l;
}

/**
 * Confere a cotação da tela ANTES de gravar (nada é gravado se faltar algo). c: { fornecedor, fornecedorId, numero, data, validade,
 * arquivo: { nome, tipo, base64 }, comprasCotacaoId, comprasItemId, obs }. p: linha do item (ou { CATEGORIA, TIPO } do item novo).
 * custo: valor unitário que vai ser gravado. Devolve a cotação normalizada com o arquivo lido. Lança no padrão do operador.
 */
function ComCu_conferirCotacao_(c, p, custo, acao) {
  var cfg = ComCu_config_(), hoje = Com_hoje_(), pre = 'Não foi possível ' + (acao || 'gravar o custo') + ': ';
  var nada = '. Nada foi gravado';
  c = c || {};
  if (!(Number(custo) > 0)) throw new Error(pre + 'informe o valor unitário da cotação (por exemplo 9.200,00, o valor por unidade que o fornecedor cobra)' + nada);
  var r = { numero: Com_texto_(c.numero, 60), obs: Com_texto_(c.obs, 500), cfg: cfg };
  if (!Com_s_(c.comprasCotacaoId) && !(c.arquivo && Com_s_(c.arquivo.base64))) throw new Error(pre + 'anexe a cotação ou proposta do fornecedor (PDF ou imagem), com o fornecedor, a data e a validade. Por quê: sem o documento ninguém confere de onde veio o custo, e o custo errado deixa a venda sair com prejuízo. Como resolver: toque em "Escolher arquivo", selecione a cotação, preencha os dados e grave de novo' + nada);
  if (Com_s_(c.comprasCotacaoId)) {
    var orc = p && p.ID ? ComCu_orcamentosCompras_(p.ID, hoje).filter(function (o) { return o.id === Com_s_(c.comprasCotacaoId) && (!Com_s_(c.comprasItemId) || o.itemId === Com_s_(c.comprasItemId)); })[0] : null;
    if (!orc) throw new Error(pre + 'o orçamento escolhido de Compras não foi encontrado para este item (retirado, sem arquivo ou de outro produto). Atualize a janela ou anexe a cotação do fornecedor' + nada);
    if (Math.abs(orc.valor - Com_r2_(Number(custo))) > 0.01) throw new Error(pre + 'o custo informado (' + Com_moeda_(custo) + ') não é o do orçamento de ' + orc.fornecedor + ' em Compras (' + orc.valorTxt + ' por unidade, com frete e impostos rateados). Por quê: o custo gravado precisa ser o que a cotação comprova. Como resolver: use o valor do orçamento ou anexe outra cotação' + nada);
    var bytesC;
    try { var cotRow = ComCu_lerSeguro_('CMP_COTACOES').filter(function (x) { return Com_s_(x.ID) === orc.id; })[0]; r.arquivoId = Com_s_(cotRow.ARQUIVO_ID); var fC = DriveApp.getFileById(r.arquivoId); bytesC = fC.getBlob().getBytes(); r.arquivoNome = fC.getName(); }
    catch (e) { throw new Error(pre + 'o arquivo do orçamento de Compras não abriu. Anexe a cotação do fornecedor nesta janela' + nada); }
    r.arquivoTipo = ComCu_tipoDosBytes_(bytesC) || 'application/octet-stream'; r.sha = ComCu_sha_(bytesC); r.tamanho = bytesC.length;
    r.fornecedor = orc.fornecedor; r.fornecedorId = orc.fornecedorId; r.data = orc.data; r.validade = orc.validade; r.compras = orc.id; r.numero = r.numero || orc.referencia;
  } else {
    var fid = Com_s_(c.fornecedorId), forn = null;
    if (fid) forn = ComCu_lerSeguro_('CMP_FORNECEDORES').filter(function (f) { return Com_s_(f.ID) === fid && Com_up_(f.ATIVO || 'SIM') !== 'NAO'; })[0] || null;
    r.fornecedor = forn ? (Com_s_(forn.NOME_FANTASIA) || Com_s_(forn.RAZAO_SOCIAL)) : Com_texto_(c.fornecedor, 160);
    r.fornecedorId = forn ? fid : '';
    if (r.fornecedor.length < 3) throw new Error(pre + 'informe o fornecedor da cotação (nome ou razão social, pelo menos 3 letras; se ele está em Compras > Fornecedores, escolha da lista)' + nada);
    r.data = Com_dia_(c.data); r.validade = Com_dia_(c.validade);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) throw new Error(pre + 'informe a data da cotação (a data que está no documento do fornecedor)' + nada);
    if (r.data > hoje) throw new Error(pre + 'a data da cotação (' + Com_brDia_(r.data) + ') está no futuro. Confira a data no documento do fornecedor' + nada);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.validade)) throw new Error(pre + 'informe a validade da cotação (até quando o fornecedor garante o preço; está na cotação. Se não estiver, pergunte ao fornecedor e anote)' + nada);
    if (r.validade < r.data) throw new Error(pre + 'a validade (' + Com_brDia_(r.validade) + ') é anterior à data da cotação (' + Com_brDia_(r.data) + '). Confira as duas datas' + nada);
    var a = c.arquivo;
    if (!a || !Com_s_(a.base64) || !Com_s_(a.nome)) throw new Error(pre + 'anexe a cotação ou proposta do fornecedor (PDF ou imagem). Por quê: sem o documento ninguém confere de onde veio o custo, e o custo errado deixa a venda sair com prejuízo. Como resolver: toque em "Escolher arquivo", selecione a cotação e grave de novo' + nada);
    var b64 = String(a.base64).replace(/^data:[^,]+,/, '');
    if (b64.length > Math.ceil(COM_CU_MAX_BYTES / 3) * 4 + 8) throw new Error(pre + 'o arquivo da cotação passa de 10 MB. Salve em PDF menor ou envie a foto reduzida' + nada);
    if (!/\.(pdf|png|jpe?g)$/i.test(Com_s_(a.nome))) throw new Error(pre + 'a cotação precisa ser PDF ou imagem (PNG ou JPG). Salve o e-mail ou a planilha do fornecedor em PDF e anexe' + nada);
    var bytes = Utilities.base64Decode(b64), tipo = ComCu_tipoDosBytes_(bytes);
    if (!tipo) throw new Error(pre + 'o arquivo "' + Com_s_(a.nome) + '" não é um PDF ou imagem válido (o conteúdo não confere com o tipo). Abra o arquivo, salve de novo em PDF e anexe' + nada);
    r.bytes = bytes; r.arquivoTipo = tipo; r.arquivoNome = Com_s_(a.nome).slice(0, 120); r.sha = ComCu_sha_(bytes); r.tamanho = bytes.length;
  }
  if (r.validade && r.validade < hoje) throw new Error(pre + 'a cotação de ' + r.fornecedor + ' venceu em ' + Com_brDia_(r.validade) + '. Por quê: custo de cotação vencida não garante o preço de hoje. Como resolver: peça ao fornecedor a cotação atualizada e anexe' + nada);
  r.tetoDias = ComCu_tetoDe_(p, cfg);
  var limite = Com_somarDias_(r.data, r.tetoDias);
  r.validoAte = !r.validade || limite < r.validade ? limite : r.validade;
  if (r.validoAte < hoje) throw new Error(pre + 'a cotação é de ' + Com_brDia_(r.data) + ' e o prazo máximo aceito pela gestão é de ' + r.tetoDias + ' dias a partir da data da cotação (venceu em ' + Com_brDia_(r.validoAte) + '), mesmo que o fornecedor tenha dado validade maior. Como resolver: peça ao fornecedor uma cotação atualizada' + nada);
  return r;
}

/**
 * Grava a versão do custo (dentro da trava do Comercial) e devolve os campos do item. p: linha do item já gravada (com ID).
 * A versão anterior fica SUBSTITUIDA. O arquivo anexado vai para a pasta privada; o orçamento de Compras é referenciado (não copiado).
 */
function ComCu_gravarVersao_(p, cot, custo, eu, origem) {
  var agora = Com_agora_(), custoAnt = Com_s_(p.CUSTO);
  var arqId = cot.arquivoId || '', arqNome = cot.arquivoNome || '';
  if (cot.bytes) {
    var pasta = SGO_DocSalvar_pastaPersistente_('COM_PASTA_COTACOES_ID', COM_PASTA_COTACOES, '');
    var ext = cot.arquivoTipo === 'application/pdf' ? 'pdf' : cot.arquivoTipo === 'image/png' ? 'png' : 'jpg';
    var nome = SGO_DocSalvar_sanitizarNome_('Cotação ' + Com_s_(p.CODIGO) + ' - ' + cot.fornecedor + ' - ' + cot.data + ' - ' + agora.replace(/[^0-9]/g, '').slice(0, 12) + '.' + ext);
    var f = pasta.createFile(Utilities.newBlob(cot.bytes, cot.arquivoTipo, nome));
    if (typeof ComAss_privado_ === 'function') ComAss_privado_(f);
    arqId = f.getId(); arqNome = f.getName();
  }
  var anteriores = Com_ler_(COM_ABAS.CUSTOS).filter(function (v) { return Com_s_(v.PRODUTO_ID) === Com_s_(p.ID); });
  anteriores.filter(function (v) { return Com_up_(v.SITUACAO) === 'VIGENTE'; }).forEach(function (v) { SGO_DATA.update(COM_ABAS.CUSTOS, v.ID, { SITUACAO: 'SUBSTITUIDA', SUBSTITUIDA_EM: agora }); });
  var pol = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null;
  var piso = pol ? ComPr_pisoItem_({ tipo: Com_up_(p.TIPO) || 'SERVICO', custoUnitario: Com_r2_(custo) }, pol) : null, preco = Number(p.PRECO) || 0;
  var abaixo = piso !== null && preco > 0 && preco < piso - 0.004;
  var v = SGO_DATA.insert(COM_ABAS.CUSTOS, { PRODUTO_ID: Com_s_(p.ID), CODIGO: Com_s_(p.CODIGO), NOME: Com_s_(p.NOME), TIPO: Com_up_(p.TIPO) || 'SERVICO', VERSAO: anteriores.length + 1,
    CUSTO: Com_r2_(custo), CUSTO_ANTERIOR: custoAnt === '' ? '' : Com_r2_(Number(custoAnt) || 0), FORNECEDOR: cot.fornecedor, FORNECEDOR_ID: cot.fornecedorId || '', COTACAO_NUMERO: cot.numero || '',
    COTACAO_DATA: cot.data, COTACAO_VALIDADE: cot.validade || '', TETO_DIAS: cot.tetoDias, VALIDO_ATE: cot.validoAte, ARQUIVO_ID: arqId, ARQUIVO_NOME: arqNome, ARQUIVO_TIPO: cot.arquivoTipo,
    SHA256: cot.sha, TAMANHO: cot.tamanho || '', ORIGEM: origem || 'CATALOGO', COMPRAS_COTACAO_ID: cot.compras || '', PRECO_NA_DATA: Com_r2_(preco), PISO_NA_DATA: piso === null ? '' : piso,
    PRECO_ABAIXO_PISO: abaixo ? 'SIM' : 'NAO', OBS: cot.obs || '', SITUACAO: 'VIGENTE', ANEXADO_POR_ID: Com_s_(eu.id), ANEXADO_POR_NOME: Com_s_(eu.nome), ANEXADO_EM: agora });
  return { versao: v, piso: piso, abaixoPiso: abaixo, campos: { CUSTO: Com_r2_(custo), CUSTO_COTACAO_ID: Com_s_(v.ID), CUSTO_COTACAO_VALOR: Com_r2_(custo), CUSTO_VALIDO_ATE: cot.validoAte, CUSTO_FORNECEDOR: cot.fornecedor,
    CUSTO_COTACAO_EM: cot.data, CUSTO_POR_NOME: Com_s_(eu.nome), CUSTO_EM: agora, CUSTO_AVISO_SIT: '' } };
}

/** Depois de gravar: histórico do item e, com o preço de tabela abaixo do piso, o aviso à gestão comercial (sem R$). */
function ComCu_depoisDeGravar_(p, g, cot, eu) {
  Com_historico_('PRODUTO', p.ID, 'CUSTO', eu, { de: g.versao.CUSTO_ANTERIOR === '' ? 'sem custo' : Com_moeda_(g.versao.CUSTO_ANTERIOR), para: Com_moeda_(g.versao.CUSTO),
    texto: 'Custo de ' + Com_s_(p.CODIGO) + ' ' + (g.versao.CUSTO_ANTERIOR === '' ? 'cadastrado' : 'atualizado') + ': ' + Com_moeda_(g.versao.CUSTO) + ' (versão ' + g.versao.VERSAO + '), cotação de ' + cot.fornecedor + ' de ' + Com_brDia_(cot.data) +
      (cot.validade ? ', validade ' + Com_brDia_(cot.validade) : '') + '; vale até ' + Com_brDia_(cot.validoAte) + ' (teto de ' + cot.tetoDias + ' dias). Arquivo: ' + Com_s_(g.versao.ARQUIVO_NOME) + (cot.compras ? ' (orçamento de Compras)' : '') + '.' +
      (g.abaixoPiso ? ' O preço de tabela (' + Com_moeda_(g.versao.PRECO_NA_DATA) + ') ficou abaixo do preço mínimo com este custo (' + Com_moeda_(g.piso) + '): a gestão comercial foi avisada para revisar.' : '') });
  if (g.abaixoPiso) {
    var ids = Com_idsGestaoComercial_([]);
    ids.forEach(function (id) {
      Com_avisar_(id, 'PRECO_ABAIXO_PISO', 'Preço a revisar: ' + Com_s_(p.CODIGO), 'O custo de "' + Com_s_(p.NOME) + '" foi atualizado por ' + eu.nome + ' com a cotação de ' + cot.fornecedor + ', e o preço de tabela ficou abaixo do preço mínimo que garante a sobra. O preço não muda sozinho. Abra Comercial > Produtos e serviços > Custos a atualizar (situação "Preço abaixo do mínimo"), confira e ajuste o preço com o motivo.', { tipo: 'catalogo', id: Com_s_(p.ID) }, { email: true });
    });
  }
}

/**
 * Gravar o custo de um item com a cotação (gestão comercial, Diretoria, Administrador e Financeiro). d: { produtoId, custo, cotacao }.
 */
function ComCu_salvarCusto_(eu, d) {
  if (!eu.catalogo) Com_exigir_(eu, 'GESTAO', 'gravar o custo do item');
  if (!eu.catalogo) throw new Error('Não foi possível gravar o custo: o custo é mantido pela gestão comercial, pela Diretoria e pelo Financeiro. Peça a um deles (Produtos e serviços > Custos a atualizar)');
  d = d || {};
  var p0 = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.produtoId));
  if (!p0) throw new Error('Não foi possível gravar o custo: o item não existe mais. Atualize a lista');
  if (typeof ComF_fichaVale_ === 'function' && ComF_fichaVale_(p0)) throw new Error('Não foi possível gravar o custo: ' + Com_s_(p0.CODIGO) + ' tem o custo calculado pela ficha de custo (horas e política em vigor). Para mudar o custo, ajuste a ficha em Produtos e serviços > Ficha de custo. Nada foi gravado');
  var custo = Com_num_(d.custo);
  if (Com_s_(d.custo) === '' && d.cotacao && Com_s_(d.cotacao.comprasCotacaoId)) { var o = ComCu_orcamentosCompras_(p0.ID).filter(function (x) { return x.id === Com_s_(d.cotacao.comprasCotacaoId); })[0]; if (o) custo = o.valor; }
  var cot = ComCu_conferirCotacao_(d.cotacao, p0, custo, 'gravar o custo de ' + Com_s_(p0.CODIGO));
  Com_garantirAbas_();
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, p0.ID);
    var g = ComCu_gravarVersao_(p, cot, custo, eu, cot.compras ? 'COMPRAS' : 'CATALOGO');
    var campos = Object.assign({}, g.campos, { ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() });
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, campos);
    var novo = Object.assign({}, p, campos);
    ComCu_depoisDeGravar_(novo, g, cot, eu);
    return { produto: ComP_produtoParaTela_(novo, eu), precoAbaixoPiso: g.abaixoPiso,
      message: 'Custo de ' + Com_s_(p.CODIGO) + ' gravado: ' + Com_moeda_(custo) + ', cotação de ' + cot.fornecedor + ', válido até ' + Com_brDia_(cot.validoAte) + '. A versão anterior ficou no histórico do item.' +
        (g.abaixoPiso ? ' Atenção: com este custo o preço de tabela (' + Com_moeda_(p.PRECO) + ') ficou abaixo do mínimo (' + Com_moeda_(g.piso) + '). O preço não mudou; a gestão comercial foi avisada para revisar.' : '') };
  });
}

// ------------------------------------------------------------
// FICHA DO CUSTO DO ITEM (histórico das versões) E ARQUIVO
// ------------------------------------------------------------
function ComCu_exigirVer_(eu, acao) { if (!eu.veCusto) throw new Error('Não foi possível ' + acao + ': custos e cotações são vistos pela gestão comercial, pela Diretoria e pelo Financeiro'); }

function ComCu_versaoParaTela_(v) {
  return { id: Com_s_(v.ID), versao: Number(v.VERSAO) || 0, custo: Number(v.CUSTO) || 0, custoTxt: Com_moeda_(v.CUSTO), anteriorTxt: Com_s_(v.CUSTO_ANTERIOR) === '' ? 'sem custo' : Com_moeda_(v.CUSTO_ANTERIOR),
    fornecedor: Com_s_(v.FORNECEDOR), numero: Com_s_(v.COTACAO_NUMERO), data: Com_brDia_(v.COTACAO_DATA), validade: Com_brDia_(v.COTACAO_VALIDADE), validoAte: Com_brDia_(v.VALIDO_ATE), tetoDias: Number(v.TETO_DIAS) || 0,
    arquivoNome: Com_s_(v.ARQUIVO_NOME), origem: Com_s_(v.ORIGEM), situacao: Com_up_(v.SITUACAO) === 'VIGENTE' ? 'Em uso' : 'Substituída', por: Com_s_(v.ANEXADO_POR_NOME), em: Com_br_(v.ANEXADO_EM),
    abaixoPiso: Com_up_(v.PRECO_ABAIXO_PISO) === 'SIM', pisoTxt: Com_s_(v.PISO_NA_DATA) === '' ? '' : Com_moeda_(v.PISO_NA_DATA), precoTxt: Com_moeda_(v.PRECO_NA_DATA), obs: Com_s_(v.OBS), sha: Com_s_(v.SHA256).slice(0, 16) };
}

/** Janela do custo do item: situação, versões (mais nova primeiro), fornecedores de Compras e orçamentos de Compras do item. */
function ComCu_item_(eu, d) {
  ComCu_exigirVer_(eu, 'abrir o custo do item');
  var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d && d.produtoId));
  if (!p) throw new Error('Não foi possível abrir: o item não existe mais. Atualize a lista');
  var cfg = ComCu_config_();
  var versoes = Com_ler_(COM_ABAS.CUSTOS).filter(function (v) { return Com_s_(v.PRODUTO_ID) === Com_s_(p.ID); }).sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); }).map(ComCu_versaoParaTela_);
  var forn = ComCu_lerSeguro_('CMP_FORNECEDORES').filter(function (f) { return Com_up_(f.ATIVO || 'SIM') !== 'NAO'; }).map(function (f) { return { id: Com_s_(f.ID), nome: Com_s_(f.NOME_FANTASIA) || Com_s_(f.RAZAO_SOCIAL) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  return { produto: ComP_produtoParaTela_(p, eu), situacao: ComCu_paraTela_(p, eu, cfg), versoes: versoes, fornecedores: forn, orcamentosCompras: ComCu_orcamentosCompras_(p.ID).filter(function (o) { return !o.vencida; }),
    tetoDias: ComCu_tetoDe_(p, cfg), avisoDias: cfg.avisoDias, ficha: typeof ComF_fichaVale_ === 'function' && ComF_fichaVale_(p), podeGravar: !!eu.catalogo, custoAtual: Com_s_(p.CUSTO) === '' ? null : Number(p.CUSTO) || 0 };
}

/** Arquivo de uma versão (download), com o SHA-256 conferido. d: { versaoId } */
function ComCu_arquivo_(eu, d) {
  ComCu_exigirVer_(eu, 'abrir a cotação');
  var v = SGO_DATA.getById(COM_ABAS.CUSTOS, Com_s_(d && d.versaoId));
  if (!v || !Com_s_(v.ARQUIVO_ID)) throw new Error('Não foi possível abrir a cotação: a versão não tem arquivo (atualize a janela)');
  var bytes;
  try { bytes = DriveApp.getFileById(Com_s_(v.ARQUIVO_ID)).getBlob().getBytes(); } catch (e) { throw new Error('Não foi possível abrir a cotação: o arquivo não está mais na pasta "' + COM_PASTA_COTACOES + '" (ou em Compras). Avise o Administrador; o registro da versão continua no histórico'); }
  var sha = ComCu_sha_(bytes);
  if (Com_s_(v.SHA256) && sha && sha !== Com_s_(v.SHA256)) throw new Error('Não foi possível abrir a cotação: o arquivo guardado não confere com o registrado (SHA-256 diferente). Ele pode ter sido trocado fora do sistema; avise o Administrador');
  return { nome: Com_s_(v.ARQUIVO_NOME), tipo: Com_s_(v.ARQUIVO_TIPO) || 'application/octet-stream', base64: Utilities.base64Encode(bytes) };
}

// ------------------------------------------------------------
// PAINEL "CUSTOS A ATUALIZAR"
// ------------------------------------------------------------
/** Uso dos itens do catálogo nas propostas abertas: { produtoId: { propostas, valor, rotulos[] } }. */
function ComCu_usoEmAbertas_() {
  var m = {};
  (typeof ComP_lerPropostas_ === 'function' ? ComP_lerPropostas_() : []).forEach(function (p) {
    if (COM_CU_ABERTAS.indexOf(Com_up_(p.SITUACAO)) < 0) return;
    var vistos = {};
    (Com_json_(p.ITENS_JSON, []) || []).forEach(function (i) {
      if (!i || i.auto || !i.produtoId) return;
      var k = Com_s_(i.produtoId), u = m[k] = m[k] || { propostas: 0, valor: 0, rotulos: [] };
      u.valor = Com_r2_(u.valor + (Number(i.precoUnitario) || 0) * (Number(i.quantidade) || 0));
      if (!vistos[k]) { vistos[k] = 1; u.propostas++; if (u.rotulos.length < 8) u.rotulos.push(Com_s_(p.NUMERO) + (Com_up_(p.SITUACAO) === 'PRONTA' ? ' (pronta)' : '')); }
    });
  });
  return m;
}

/** Levantamento de todos os itens ativos (núcleo do painel e da rotina de avisos). */
function ComCu_levantar_(cfg, hoje) {
  cfg = cfg || ComCu_config_(); hoje = hoje || Com_hoje_();
  var uso = ComCu_usoEmAbertas_(), pol = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null;
  return Com_ler_(COM_ABAS.PRODUTOS).filter(function (p) { return Com_s_(p.ID) && Com_up_(p.ATIVO || 'SIM') !== 'NAO'; }).map(function (p) {
    var s = ComCu_situacao_(p, cfg, hoje), u = uso[Com_s_(p.ID)] || { propostas: 0, valor: 0, rotulos: [] };
    var custo = typeof ComP_custoCatalogo_ === 'function' ? ComP_custoCatalogo_(p, pol) : (Number(p.CUSTO) || null);
    var piso = pol && custo ? ComPr_pisoItem_({ tipo: Com_up_(p.TIPO) || 'SERVICO', custoUnitario: custo }, pol) : null, preco = Number(p.PRECO) || 0;
    return { p: p, s: s, uso: u, custo: custo, piso: piso, abaixoPiso: piso !== null && preco > 0 && preco < piso - 0.004 };
  });
}

/**
 * Painel da gestão. d: { situacao: 'PROBLEMAS'|'VENCIDO'|'VENCENDO'|'SEM_CUSTO'|'SEM_ANEXO'|'ABAIXO_PISO'|'EM_ABERTAS'|'TODOS', tipo, busca,
 * ordem: 'USO'|'VALIDADE'|'NOME', limite }. Ordem padrão: os usados em propostas abertas primeiro (mais propostas, maior valor).
 */
function ComCu_painel_(eu, d) {
  ComCu_exigirVer_(eu, 'abrir os custos a atualizar');
  d = d || {};
  var cfg = ComCu_config_(), hoje = Com_hoje_(), todos = ComCu_levantar_(cfg, hoje);
  var problema = function (x) { return !x.s.valido || x.s.codigo === 'VENCENDO' || x.s.codigo === 'LEGADO' || x.abaixoPiso; };
  var k = { VENCIDO: 0, VENCENDO: 0, SEM_CUSTO: 0, SEM_ANEXO: 0, LEGADO: 0, ABAIXO_PISO: 0, EM_ABERTAS: 0, VIGENTE: 0, FICHA: 0 };
  todos.forEach(function (x) { k[x.s.codigo] = (k[x.s.codigo] || 0) + 1; if (x.abaixoPiso) k.ABAIXO_PISO++; if (problema(x) && x.uso.propostas) k.EM_ABERTAS++; });
  var sit = Com_up_(d.situacao) || 'PROBLEMAS', tipo = Com_up_(d.tipo), termos = Com_termosBusca_(d.busca);
  var l = todos.filter(function (x) {
    if (sit === 'PROBLEMAS' && !problema(x)) return false;
    if (sit === 'ABAIXO_PISO' && !x.abaixoPiso) return false;
    if (sit === 'EM_ABERTAS' && !(problema(x) && x.uso.propostas)) return false;
    if (['VENCIDO', 'VENCENDO', 'SEM_CUSTO', 'SEM_ANEXO', 'LEGADO', 'VIGENTE', 'FICHA'].indexOf(sit) >= 0 && x.s.codigo !== sit) return false;
    if (tipo && (Com_up_(x.p.TIPO) || 'SERVICO') !== tipo) return false;
    return Com_casaBusca_(termos, [Com_s_(x.p.CODIGO), Com_s_(x.p.NOME), Com_s_(x.p.CATEGORIA), Com_s_(x.p.CUSTO_FORNECEDOR)]);
  });
  var gravidade = { VENCIDO: 0, SEM_ANEXO: 1, SEM_CUSTO: 2, LEGADO: 3, VENCENDO: 4, VIGENTE: 5, FICHA: 6 }, ordem = Com_up_(d.ordem) || 'USO';
  l.sort(function (a, b) {
    if (ordem === 'NOME') return Com_s_(a.p.NOME).localeCompare(Com_s_(b.p.NOME), 'pt-BR');
    if (ordem === 'VALIDADE') return String(a.s.validoAte || '9999').localeCompare(String(b.s.validoAte || '9999')) || gravidade[a.s.codigo] - gravidade[b.s.codigo];
    return (b.uso.propostas - a.uso.propostas) || (b.uso.valor - a.uso.valor) || (gravidade[a.s.codigo] - gravidade[b.s.codigo]) || Com_s_(a.p.NOME).localeCompare(Com_s_(b.p.NOME), 'pt-BR');
  });
  var limite = Math.max(1, Math.min(1000, Math.floor(Number(d.limite) || 300)));
  var us = Com_usuarios_();
  return { kpis: k, total: todos.length, encontrados: l.length, limitado: l.length > limite,
    itens: l.slice(0, limite).map(function (x) {
      return { id: Com_s_(x.p.ID), codigo: Com_s_(x.p.CODIGO), nome: Com_s_(x.p.NOME), tipo: Com_up_(x.p.TIPO) || 'SERVICO', tipoNome: COM_TIPOS_ITEM[Com_up_(x.p.TIPO)] || 'Serviço', categoria: Com_s_(x.p.CATEGORIA),
        situacao: ComCu_paraTela_(x.p, eu, cfg, hoje), custoTxt: x.custo ? Com_moeda_(x.custo) : '—', precoTxt: Com_moeda_(x.p.PRECO), pisoTxt: x.piso === null ? '' : Com_moeda_(x.piso), abaixoPiso: x.abaixoPiso,
        propostas: x.uso.propostas, valorAbertasTxt: x.uso.propostas ? Com_moeda_(x.uso.valor) : '', rotulos: x.uso.rotulos };
    }),
    config: { tetoDias: cfg.tetoDias, avisoDias: cfg.avisoDias, tetoPorCategoria: Object.keys(cfg.tetoPorCategoria).map(function (c) { return { categoria: cfg.tetoPorCategoria[c].nome, dias: cfg.tetoPorCategoria[c].dias }; }),
      responsaveis: cfg.responsaveis, responsaveisNomes: ComCu_responsaveis_(cfg).map(function (id) { return us[id] ? us[id].nome : id; }), versao: cfg.versao, em: cfg.em, por: cfg.por },
    podeGravar: !!eu.catalogo, podeConfigurar: !!eu.gestao,
    candidatos: eu.gestao ? Object.keys(us).filter(function (id) { return us[id].ativo && Com_nivelDe_(us[id]).catalogo; }).map(function (id) { return { id: id, nome: us[id].nome }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }) : [] };
}

/** Gestão grava a regra: d: { tetoDias, avisoDias, tetoPorCategoria: [{ categoria, dias }], responsaveis: [ids], motivo (>= 10) } */
function ComCu_salvarConfig_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'mudar a validade dos custos');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o motivo da mudança (pelo menos 10 letras). Ele fica no histórico da regra');
  var teto = Math.round(Com_num_(d.tetoDias)), aviso = Math.round(Com_num_(d.avisoDias));
  if (!(teto >= 1 && teto <= 730)) throw new Error('Não foi possível salvar: o prazo máximo da cotação precisa ser de 1 a 730 dias (padrão 90)');
  if (!(aviso >= 1 && aviso <= 120)) throw new Error('Não foi possível salvar: o aviso antecipado precisa ser de 1 a 120 dias antes do vencimento (padrão 15)');
  var cats = (Array.isArray(d.tetoPorCategoria) ? d.tetoPorCategoria : []).filter(function (x) { return x && Com_s_(x.categoria); }).map(function (x) {
    var dias = Math.round(Com_num_(x.dias));
    if (!(dias >= 1 && dias <= 730)) throw new Error('Não foi possível salvar: o prazo da categoria "' + Com_s_(x.categoria) + '" precisa ser de 1 a 730 dias');
    return { categoria: Com_texto_(x.categoria, 80), dias: dias };
  });
  var us = Com_usuarios_(), gest = Com_gestoresConfigurados_();
  var resp = (Array.isArray(d.responsaveis) ? d.responsaveis : []).map(Com_s_).filter(Boolean);
  resp.forEach(function (id) {
    var u = us[id];
    if (!u || !u.ativo) throw new Error('Não foi possível salvar: um dos responsáveis escolhidos não está ativo. Atualize a janela e escolha de novo');
    if (!Com_nivelDe_(u, gest).catalogo) throw new Error('Não foi possível salvar: ' + u.nome + ' não tem o catálogo completo do Comercial (gestão comercial, Diretoria, Administrador ou Financeiro) e não conseguiria gravar o custo. Escolha outra pessoa ou peça ao Administrador para ajustar o perfil');
  });
  return Com_comTrava_(function () {
    var atual = ComCu_config_(), versao = (atual.versao || 0) + 1, agora = Com_agora_();
    var valor = { tetoDias: teto, avisoDias: aviso, tetoPorCategoria: cats, responsaveis: resp };
    SGO_DATA.insert(COM_ABAS.CONFIG, { CHAVE: 'CUSTOS', VALOR_JSON: JSON.stringify(valor), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    COM_CU_MEMO = null;
    Com_historico_('CONFIG', 'CUSTOS', 'CUSTOS_REGRA', eu, { texto: 'Validade dos custos (versão ' + versao + '): prazo máximo de ' + teto + ' dias desde a data da cotação, aviso ' + aviso + ' dias antes' + (cats.length ? ', por categoria: ' + cats.map(function (c) { return c.categoria + ' ' + c.dias + ' dias'; }).join(', ') : '') +
      '; responsáveis: ' + (resp.length ? resp.map(function (id) { return us[id].nome; }).join(', ') : 'a gestão comercial') + '. Motivo: ' + motivo });
    return { message: 'Regra dos custos salva (versão ' + versao + '). O prazo novo vale para as cotações gravadas daqui em diante; as já gravadas mantêm a validade calculada na época.' };
  });
}

// ------------------------------------------------------------
// AVISOS AOS RESPONSÁVEIS (rotina do Comercial; uma vez por dia útil, no expediente)
// ------------------------------------------------------------
var COM_CU_PROP_DIA = 'COM_CUSTOS_AVISO_DIA', COM_CU_PROP_ATV = 'COM_CUSTOS_ATIVIDADES';

function ComCu_linhaAviso_(x) { return Com_s_(x.p.CODIGO) + ' ' + Com_s_(x.p.NOME).slice(0, 60) + ': ' + x.s.texto + (x.uso.propostas ? ' (em ' + Com_plural_(x.uso.propostas, 'proposta aberta', 'propostas abertas') + ')' : ''); }

/**
 * Avisa os responsáveis: itens que passaram a VENCENDO ou VENCIDO desde o último aviso (e, às segundas, o lembrete dos itens sem custo
 * válido usados em propostas abertas). Aviso no sistema + e-mail no expediente (notificador comum), sem valores. Itens vencidos em
 * propostas abertas viram uma atividade em Minhas atividades para cada responsável (uma aberta por vez). Nunca lança.
 */
function ComCu_rotinaAvisos_(quando, forcar) {
  try {
    var hoje = Com_hoje_(), props = PropertiesService.getScriptProperties();
    if (!forcar && props.getProperty(COM_CU_PROP_DIA) === hoje) return { fora: 'já avisou hoje' };
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true };
    if (!forcar && !ex.dentro) return { fora: 'fora do expediente' };
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(COM_ABAS.PRODUTOS)) return { fora: 'catálogo ainda sem uso' };
  } catch (e) { if (!forcar) return { fora: 'sem catálogo' }; }
  hoje = hoje || Com_hoje_(); props = props || PropertiesService.getScriptProperties();
  try {
    var cfg = ComCu_config_(), todos = ComCu_levantar_(cfg, hoje), resp = ComCu_responsaveis_(cfg);
    props.setProperty(COM_CU_PROP_DIA, hoje);
    var prior = function (a, b) { return (b.uso.propostas - a.uso.propostas) || (b.uso.valor - a.uso.valor); };
    var novos = todos.filter(function (x) { return (x.s.codigo === 'VENCENDO' || x.s.codigo === 'VENCIDO') && Com_s_(x.p.CUSTO_AVISO_SIT) !== x.s.codigo + '|' + x.s.validoAte; }).sort(prior);
    var semValidoAbertas = todos.filter(function (x) { return !x.s.valido && x.s.codigo !== 'SEM_CUSTO' && x.uso.propostas; }).sort(prior);
    var semCustoAbertas = todos.filter(function (x) { return x.s.codigo === 'SEM_CUSTO' && x.uso.propostas; }).length;
    var segunda = new Date().getDay() === 1;
    var r = { novos: novos.length, avisados: 0, atividades: 0 };
    if (novos.length || (segunda && (semValidoAbertas.length || semCustoAbertas))) {
      var venc = todos.filter(function (x) { return x.s.codigo === 'VENCIDO'; }).length, vcd = todos.filter(function (x) { return x.s.codigo === 'VENCENDO'; }).length;
      var lista = (novos.length ? novos : semValidoAbertas).slice(0, 12);
      var texto = (novos.length ? Com_plural_(novos.length, 'item mudou', 'itens mudaram') + ' de situação desde o último aviso. ' : 'Lembrete semanal. ') +
        'Hoje: ' + Com_plural_(venc, 'custo vencido', 'custos vencidos') + ', ' + Com_plural_(vcd, 'vencendo', 'vencendo') + ' em até ' + cfg.avisoDias + ' dias, ' + Com_plural_(semValidoAbertas.length, 'item sem cotação válida', 'itens sem cotação válida') + ' e ' + Com_plural_(semCustoAbertas, 'item sem custo', 'itens sem custo') + ' em propostas abertas. ' +
        'Prioridade (mais usados em propostas abertas primeiro): ' + lista.map(ComCu_linhaAviso_).join('; ') + '. Enquanto o custo não for atualizado com a cotação do fornecedor, a proposta com o item vai para a aprovação da Diretoria. Abra Comercial > Produtos e serviços > Custos a atualizar.';
      resp.forEach(function (id) { Com_avisar_(id, 'CUSTOS_ATUALIZAR', 'Custos a atualizar: ' + (novos.length ? Com_plural_(novos.length, 'item novo', 'itens novos') : 'lembrete semanal'), texto, { tipo: 'custos', id: '' }, { email: true }); r.avisados++; });
      novos.forEach(function (x) { SGO_DATA.update(COM_ABAS.PRODUTOS, x.p.ID, { CUSTO_AVISO_SIT: x.s.codigo + '|' + x.s.validoAte }); });
    }
    var vencAbertas = todos.filter(function (x) { return x.s.codigo === 'VENCIDO' && x.uso.propostas; }).sort(prior);
    if (vencAbertas.length && typeof Com_criarAtividade_ === 'function') {
      var mapa = Com_json_(props.getProperty(COM_CU_PROP_ATV), {}) || {};
      resp.forEach(function (id) {
        if (mapa[id] && Com_atividadeAberta_(Com_atividade_(mapa[id]))) return;
        try {
          mapa[id] = Com_criarAtividade_({ responsavelId: id, titulo: 'Atualizar custos vencidos usados em propostas abertas (' + vencAbertas.length + ')', prazo: Com_prazo_(Com_somarDiasUteis_(hoje, 1), '17:00'), prioridade: 'Alta',
            descricao: 'Itens com a cotação do fornecedor vencida e usados em propostas abertas: ' + vencAbertas.slice(0, 15).map(ComCu_linhaAviso_).join('; ') + '. Peça a cotação atualizada ao fornecedor e grave em Comercial > Produtos e serviços > Custos a atualizar (botão "Atualizar custo", com o arquivo).',
            porQue: 'Com o custo vencido, a proposta vai para a aprovação da Diretoria e o preço mínimo pode estar errado.', onde: 'Comercial > Produtos e serviços > Custos a atualizar', como: 'Atualizar custo com a cotação do fornecedor (PDF ou imagem), data e validade.' });
          r.atividades++;
        } catch (eA) { console.error('Comercial, atividade de custos: ' + ((eA && eA.message) || eA)); }
      });
      props.setProperty(COM_CU_PROP_ATV, JSON.stringify(mapa));
    }
    return r;
  } catch (e) { console.error('Comercial, avisos de custo: ' + ((e && e.message) || e)); return { erro: String((e && e.message) || e) }; }
}

/**
 * O vendedor (ou a gestão) pede a atualização do custo de um item da proposta. d: { propostaId, produtoId, texto }. Aviso (sistema e
 * e-mail no expediente) a cada responsável e uma atividade para o primeiro, ligada ao item e à proposta. Um pedido por item e proposta por dia.
 */
function ComCu_pedirAtualizacao_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir a atualização do custo');
  d = d || {};
  var p = ComP_obter_(eu, d.propostaId, 'pedir a atualização do custo');
  if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível pedir: a proposta é de ' + Com_s_(p.RESPONSAVEL_NOME) + '. Quem pede é o responsável pela proposta ou a gestão comercial');
  var it = (Com_json_(p.ITENS_JSON, []) || []).filter(function (i) { return i && Com_s_(i.produtoId) === Com_s_(d.produtoId); })[0];
  if (!it) throw new Error('Não foi possível pedir: o item não está nesta proposta. Atualize a tela');
  var pr = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.produtoId));
  if (!pr) throw new Error('Não foi possível pedir: o item não existe mais no catálogo. Troque o item na proposta');
  var s = ComCu_situacao_(pr);
  if (s.valido && s.codigo !== 'VENCENDO' && s.codigo !== 'LEGADO') throw new Error('Não foi possível pedir: o custo de ' + Com_s_(pr.CODIGO) + ' já está válido (' + s.texto + '). Atualize a tela e conclua de novo');
  var rot = ComP_rotulo_(p), hoje = Com_hoje_();
  var ja = Com_ler_(COM_ABAS.AVISOS).filter(function (v) { return Com_s_(v.TIPO) === 'CUSTO_PEDIDO' && Com_s_(v.REF_ID) === Com_s_(pr.ID) && Com_dia_(v.DATA) === hoje && Com_s_(v.TEXTO).indexOf(rot) >= 0; })[0];
  var us = Com_usuarios_(), resp = ComCu_responsaveis_().filter(function (id) { return id !== eu.id; });
  if (!resp.length) resp = ComCu_responsaveis_();
  var nomes = resp.map(function (id) { return us[id] ? us[id].nome : id; });
  if (ja) return { jaPedido: true, message: 'O pedido de atualização do custo de ' + Com_s_(pr.CODIGO) + ' para a proposta ' + rot + ' já foi feito hoje (' + nomes.join(', ') + ' foram avisados). Você é avisado quando o custo for gravado; enquanto isso, pode concluir e pedir a autorização da Diretoria.' };
  var txt = Com_texto_(d.texto, 500);
  var texto = eu.nome + ' precisa do custo atualizado de "' + Com_s_(pr.NOME) + '" (' + Com_s_(pr.CODIGO) + '; ' + s.texto + ') para a proposta ' + rot + ' (' + Com_s_(p.CLIENTE_NOME) + ').' + (txt ? ' Observação: ' + txt + '.' : '') +
    ' Peça a cotação ao fornecedor e grave em Comercial > Produtos e serviços > Custos a atualizar (botão "Atualizar custo", com o arquivo).';
  resp.forEach(function (id) { Com_avisar_(id, 'CUSTO_PEDIDO', 'Custo a atualizar para proposta: ' + Com_s_(pr.CODIGO), texto, { tipo: 'catalogo', id: Com_s_(pr.ID) }, { email: true }); });
  var atv = '';
  try { atv = Com_criarAtividade_({ responsavelId: resp[0], titulo: 'Atualizar o custo de ' + Com_s_(pr.CODIGO) + ' (proposta ' + rot + ')', descricao: texto, prazo: Com_prazo_(Com_somarDiasUteis_(hoje, 1), '17:00'), prioridade: 'Alta',
    porQue: 'Sem o custo válido a proposta vai para a aprovação da Diretoria.', onde: 'Comercial > Produtos e serviços > Custos a atualizar', como: 'Gravar o custo com a cotação do fornecedor anexada.' }); } catch (e) { atv = ''; }
  Com_historico_('PROPOSTA', p.ID, 'CUSTO_PEDIDO', eu, { texto: 'Pedida a atualização do custo de ' + Com_s_(pr.CODIGO) + ' (' + s.texto + ') a ' + nomes.join(', ') + (atv ? '; atividade criada para ' + nomes[0] : '') + '.' });
  return { atividadeId: atv, message: 'Pedido enviado: ' + nomes.join(', ') + (nomes.length > 1 ? ' foram avisados' : ' foi avisado(a)') + (atv ? ' e ' + nomes[0] + ' recebeu a atividade' : '') + ' para atualizar o custo de ' + Com_s_(pr.CODIGO) + '. Quando o custo for gravado, abra a proposta e conclua: com o custo válido e a sobra mínima, ela fica pronta sem aprovação. Se não puder esperar, conclua com a justificativa e a proposta vai para a Diretoria.' };
}

// ------------------------------------------------------------
// GUIA DE PREÇO DA PROPOSTA (ampliação de 11/11/2026)
// ------------------------------------------------------------
/** Preço que garante a margem m (null = a mínima) para um item com custo; null sem custo ou conta que não fecha. */
function ComCu_precoPara_(i, pol, m) {
  var c = Number(i && i.custoUnitario) || 0;
  if (!(c > 0) || i.auto) return null;
  if (i.tipo === 'PRODUTO') { var v = ComPr_precoProduto_(c, pol, m); return v === null ? null : v; }
  var s = ComPr_precoServicoConta_(c, pol, m);
  return s === null ? null : ComPr_arredondarCima_(s, 0.01);
}

/**
 * Guia de preço de uma proposta (com o custo atual do catálogo). Por item: preço de tabela, mínimo (sobra mínima), sugerido (margem
 * alvo) e onde o preço digitado está. No total: a situação da sobra, as opções (usar o sugerido, ajustar ao mínimo, pedir
 * autorização e quem aprova, pedir a atualização do custo) e a alçada de desconto. Vendedor: mínimo e sugerido em R$ (sem custo nem
 * percentual de sobra); quem vê custo recebe também o custo e a sobra. av: avaliação pronta (opcional).
 */
function ComCu_guiaPrecos_(eu, p, av) {
  av = av || ComP_avaliarProposta_(p);
  var x = av.x, pol = x && x.pol ? x.pol : ComPr_politica_(), a = av.analise, cat = ComP_mapaCatalogo_(), cfg = ComCu_config_(), hoje = Com_hoje_(), ve = !!(eu && eu.veCusto);
  var alvo = pol.margemAlvoPct === null || pol.margemAlvoPct === undefined ? null : pol.margemAlvoPct;
  var itens = [], sug = [], min = [];
  av.itens.forEach(function (i, k) {
    if (!i || i.auto) return;
    var pr = i.produtoId ? cat[Com_s_(i.produtoId)] : null, s = i.produtoId ? ComCu_situacao_(pr, cfg, hoje) : null;
    var temC = ComP_temCusto_(i.custoUnitario), mn = temC ? ComCu_precoPara_(i, pol, null) : null, sg = temC ? (alvo === null ? mn : ComCu_precoPara_(i, pol, alvo)) : null;
    if (sg !== null && mn !== null && sg < mn) sg = mn;
    var pu = Number(i.precoUnitario) || 0, faixa;
    if (!temC) faixa = 'SEM_CUSTO';
    else if (mn !== null && pu < mn - 0.004) faixa = 'ABAIXO_MIN';
    else if (sg !== null && pu < sg - 0.004) faixa = 'ENTRE';
    else faixa = 'OK';
    var custoInvalido = !!(s && temC && !s.valido);
    var o = { ordem: k + 1, produtoId: Com_s_(i.produtoId), codigo: Com_s_(i.codigo), descricao: Com_s_(i.descricao).slice(0, 80), quantidade: Number(i.quantidade) || 0, preco: Com_r2_(pu), precoTxt: Com_moeda_(pu),
      tabelaTxt: Number(i.precoTabela) > 0 ? Com_moeda_(i.precoTabela) : '', minimo: mn, minimoTxt: mn === null ? '' : Com_moeda_(mn), sugerido: sg, sugeridoTxt: sg === null ? '' : Com_moeda_(sg), faixa: faixa,
      faixaTxt: { SEM_CUSTO: 'sem custo: o sistema não calcula o mínimo nem o sugerido', ABAIXO_MIN: 'abaixo do preço mínimo', ENTRE: 'entre o mínimo e o sugerido', OK: 'no preço sugerido ou acima' }[faixa],
      custo: s ? { codigo: s.codigo, nome: s.nome, valido: s.valido, texto: s.texto } : { codigo: 'AVULSO', nome: 'Item avulso', valido: false, texto: 'item fora do catálogo: não tem custo' }, custoInvalido: custoInvalido, podePedirCusto: !!(i.produtoId && s && (!s.valido || s.codigo === 'VENCENDO')) };
    if (ve && temC) { o.custoTxt = Com_moeda_(i.custoUnitario); }
    itens.push(o);
    if (sg !== null && pu < sg - 0.004) sug.push(o);
    if (mn !== null && pu < mn - 0.004) min.push(o);
  });
  var totalCom = function (lista, campo) {
    if (!lista.length) return null;
    var idx = {}; lista.forEach(function (o) { idx[o.ordem] = o[campo]; });
    var its = av.itens.map(function (i, k) { return idx[k + 1] !== undefined ? Object.assign({}, i, { precoUnitario: idx[k + 1] }) : i; });
    var c = ComP_calcular_(its, p.DESCONTO_GERAL), an = null;
    if (typeof ComPr_daProposta_ === 'function') { try { an = ComPr_daProposta_(p, null, its).analise; } catch (e) { an = null; } }
    var r = { itens: lista.length, total: c.total, totalTxt: Com_moeda_(c.total), situacaoTxt: an ? an.situacaoTxt : '', dentro: an ? !an.abaixoMin : null };
    if (ve && an && an.margemPct !== null) r.sobraTxt = Com_pct_(an.margemPct);
    return r;
  };
  var polA = av.pol, us = Com_usuarios_();
  var quemIds = polA.exigeDiretoria ? Object.keys(us).filter(function (id) { return us[id].ativo && (us[id].perfil === 'DIRETORIA' || Com_ehDono_(us[id].login)); }) : Com_idsGestaoComercial_([Com_s_(p.RESPONSAVEL_ID)]);
  var calc = av.calc, descontoSem = null;
  if (Number(p.DESCONTO_GERAL) > 0 && typeof ComPr_daProposta_ === 'function') { try { descontoSem = ComPr_daProposta_(Object.assign({}, p, { DESCONTO_GERAL: 0 }), null, av.itens).analise; } catch (e) { descontoSem = null; } }
  var r = {
    itens: itens,
    resumo: { total: calc.total, totalTxt: Com_moeda_(calc.total), situacao: a ? a.situacao : 'SEM_VALOR', situacaoTxt: a ? (a.completa ? a.situacaoTxt : 'sobra incompleta: ' + Com_plural_(a.itensSemCusto, 'item sem custo', 'itens sem custo') + ' (o mínimo não é conferido)') : '',
      dentro: polA.dentro, abaixoMin: !!(a && a.abaixoMin) },
    opcoes: {
      sugerido: totalCom(sug, 'sugerido'),
      minimo: totalCom(min, 'minimo'),
      autorizacao: { precisa: !polA.dentro, quem: polA.exigeDiretoria ? 'a Diretoria' : 'o gestor comercial', nomes: quemIds.map(function (id) { return us[id] ? us[id].nome : id; }), oQue: polA.motivos },
      custos: itens.filter(function (o) { return o.podePedirCusto || o.custo.codigo === 'AVULSO' || (o.faixa === 'SEM_CUSTO' && o.produtoId); }).map(function (o) { return { produtoId: o.produtoId, codigo: o.codigo, descricao: o.descricao, texto: o.custo.texto, podePedir: !!o.produtoId }; })
    },
    desconto: { alcadaPct: polA.limite, alcadaTxt: Com_pct_(polA.limite, 0), descontoPct: calc.descontoPct, descontoPctTxt: Com_pct_(calc.descontoPct), dentro: calc.descontoPct <= polA.limite + 1e-9,
      efeito: Number(p.DESCONTO_GERAL) > 0 && descontoSem && a ? (a.abaixoMin && !descontoSem.abaixoMin ? 'o desconto geral leva a sobra para abaixo da mínima: sem ele a proposta passaria sem a Diretoria' : 'o desconto geral reduz a sobra, mas ' + (a.abaixoMin ? 'mesmo sem ele a sobra fica abaixo da mínima' : 'ela continua acima da mínima')) : '' }
  };
  if (ve && a) {
    r.resumo.sobraTxt = a.margemPct === null ? '—' : Com_pct_(a.margemPct); r.resumo.minimaTxt = a.margemMinPct === null ? '' : Com_pct_(a.margemMinPct, 1); r.resumo.alvoTxt = a.margemAlvoPct === null ? '' : Com_pct_(a.margemAlvoPct, 1);
    if (descontoSem && descontoSem.margemPct !== null) r.desconto.sobraSemDescontoTxt = Com_pct_(descontoSem.margemPct);
  }
  return r;
}

/**
 * Aplica o preço sugerido (modo SUGERIDO, nos itens abaixo dele) ou o mínimo (modo MINIMO, só nos itens abaixo do mínimo) no rascunho.
 * d: { id, modo }. Só o responsável ou a gestão, com a proposta em rascunho. Preço nunca desce. Grava o histórico.
 */
function ComCu_aplicarPrecos_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ajustar os preços da proposta');
  d = d || {};
  var modo = Com_up_(d.modo);
  if (modo !== 'SUGERIDO' && modo !== 'MINIMO') throw new Error('Não foi possível ajustar: escolha "Usar preço sugerido" ou "Ajustar para o mínimo"');
  return Com_comTrava_(function () {
    var p = ComP_obter_(eu, d.id, 'ajustar os preços da proposta');
    if (Com_up_(p.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível ajustar: a proposta ' + ComP_rotulo_(p) + ' não está em rascunho. Toque em "Voltar para rascunho" antes');
    if (!eu.gestao && Com_s_(p.RESPONSAVEL_ID) !== eu.id) throw new Error('Não foi possível ajustar: a proposta é de ' + Com_s_(p.RESPONSAVEL_NOME));
    var av = ComP_avaliarProposta_(p), g = ComCu_guiaPrecos_(eu, p, av), alvo = {};
    g.itens.forEach(function (o) { var v = modo === 'SUGERIDO' ? o.sugerido : o.minimo; if (v !== null && o.preco < v - 0.004) alvo[o.ordem] = v; });
    var n = Object.keys(alvo).length;
    if (!n) return { proposta: ComP_paraTela_(eu, p, true), guia: g, message: modo === 'SUGERIDO' ? 'Nenhum preço mudou: os itens com custo já estão no preço sugerido ou acima.' : 'Nenhum preço mudou: nenhum item com custo está abaixo do mínimo.' };
    var antes = Com_r2_(Number(p.TOTAL) || 0), mudados = [];
    var itens = (Com_json_(p.ITENS_JSON, []) || []).map(function (i, k) {
      if (alvo[k + 1] === undefined) return i;
      var novo = Object.assign({}, i, { precoUnitario: alvo[k + 1] });
      novo.precoDiferente = !!(i.produtoId && Number(i.precoTabela) > 0 && Math.abs(novo.precoUnitario - Number(i.precoTabela)) > 0.004);
      mudados.push((Com_s_(i.codigo) || Com_s_(i.descricao).slice(0, 30)) + ' ' + Com_moeda_(i.precoUnitario) + ' → ' + Com_moeda_(alvo[k + 1]));
      return novo;
    });
    var calc = ComP_calcular_(itens, p.DESCONTO_GERAL), agora = Com_agora_();
    var campos = { ITENS_JSON: JSON.stringify(itens), SUBTOTAL: calc.subtotal, DESCONTO_GERAL: calc.descontoGeral, TOTAL: calc.total, DESCONTO_PCT: calc.descontoPct, MARGEM_PCT: calc.margemPct === null ? '' : calc.margemPct, CUSTO_TOTAL: calc.custoTotal, ATUALIZADO_EM: agora };
    SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, campos);
    var novo = Object.assign({}, p, campos);
    Com_historico_('PROPOSTA', p.ID, modo === 'SUGERIDO' ? 'PRECO_SUGERIDO' : 'PRECO_MINIMO', eu, { de: Com_moeda_(antes), para: Com_moeda_(calc.total), texto: (modo === 'SUGERIDO' ? 'Preço sugerido aplicado' : 'Preços ajustados ao mínimo') + ' em ' + Com_plural_(n, 'item', 'itens') + ': ' + mudados.join('; ') + '. Total de ' + Com_moeda_(antes) + ' para ' + Com_moeda_(calc.total) + '.' });
    var av2 = ComP_avaliarProposta_(novo);
    return { proposta: ComP_paraTela_(eu, novo, true), guia: ComCu_guiaPrecos_(eu, novo, av2), politica: { dentro: av2.pol.dentro, motivos: av2.pol.motivos, exigeDiretoria: av2.pol.exigeDiretoria },
      message: (modo === 'SUGERIDO' ? 'Preço sugerido aplicado em ' : 'Preço mínimo aplicado em ') + Com_plural_(n, 'item', 'itens') + '. Novo total: ' + Com_moeda_(calc.total) + ' (antes ' + Com_moeda_(antes) + ').' + (av2.pol.dentro ? ' A proposta está dentro da política: ao concluir, fica pronta.' : ' Ainda falta: ' + av2.pol.motivos.join('; ') + '.') };
  });
}

/**
 * O que mudou no custo desde a conclusão da proposta pronta (para a tela antes do documento e do envio). [{ produtoId, codigo, descricao, texto }]
 * Sem valores: o vendedor vê o que mudou e as opções.
 */
function ComCu_mudancasDesdeConclusao_(p) {
  if (Com_up_(p.SITUACAO) !== 'PRONTA') return [];
  var cat = ComP_mapaCatalogo_(), pol = typeof ComPr_politica_ === 'function' ? ComPr_politica_() : null, cfg = ComCu_config_(), hoje = Com_hoje_(), l = [];
  (Com_json_(p.ITENS_JSON, []) || []).forEach(function (i) {
    if (!i || i.auto || !i.produtoId) return;
    var pr = cat[Com_s_(i.produtoId)]; if (!pr) return;
    var atual = ComP_custoCatalogo_(pr, pol), s = ComCu_situacao_(pr, cfg, hoje), txt = [];
    if (atual !== null && ComP_temCusto_(i.custoUnitario) && atual > Number(i.custoUnitario) + 0.004) txt.push('o custo subiu depois da conclusão');
    if (s.codigo === 'VENCIDO') txt.push('a cotação do fornecedor venceu (' + s.texto + ')');
    if (txt.length) l.push({ produtoId: Com_s_(i.produtoId), codigo: Com_s_(i.codigo), descricao: Com_s_(i.descricao).slice(0, 80), texto: txt.join(' e ') });
  });
  return l;
}
