/****************************************************
 * COMPRAS — COTAÇÕES E APROVAÇÃO POR FAIXA DE VALOR (21/10/2026)
 *
 * Cotação (CMP_COTACOES): um orçamento por fornecedor para a requisição inteira (preço unitário de cada item, frete,
 * impostos, prazo, validade, condição de pagamento, número do orçamento do fornecedor e compatibilidade da peça).
 * O total é calculado pelo sistema (preço x quantidade pedida + frete + impostos). O arquivo do orçamento é
 * obrigatório: é a prova do preço (fica na pasta "Compras - Anexos", visto só por quem vê valores).
 *
 * Escolha: só cotação com arquivo, dentro da validade e com a compatibilidade confirmada. Se não é a mais barata,
 * o comprador justifica. Se há menos cotações (de fornecedores diferentes) que o mínimo da faixa, justifica também
 * (fornecedor único, urgência) e a compra aparece marcada para o Financeiro.
 *
 * Aprovação (respostas do dono, 21/10/2026; tudo editável em Regras de compras):
 *   até R$ 1.000       o comprador (fica registrado; na escolha feita pelo comprador a aprovação é na hora)
 *   até R$ 10.000      o gestor da área de quem pediu (sem gestor configurado, a Diretoria)
 *   acima              a Diretoria
 * Quem pediu não aprova a própria compra. Acima da faixa do comprador, quem lançou ou escolheu a cotação também
 * não. Na faixa do comprador, se quem escolheu foi quem pediu, aprova o substituto (sem ele, o gestor da área).
 * A Diretoria pode aprovar qualquer faixa. A decisão é tomada na ficha da compra; a Caixa de decisões mostra o item
 * ao aprovador certo, conta o prazo (1 dia útil; crítica no mesmo dia), cobra pela escada e leva até a ficha.
 * Reprovar exige o motivo e devolve para cotação.
 ****************************************************/

function CmpC_cotacoesDe_(reqId, incluirRetiradas) {
  return Cmp_ler_(CMP_ABAS.COTACOES).filter(function (c) { return Cmp_s_(c.REQUISICAO_ID) === Cmp_s_(reqId) && (incluirRetiradas || Cmp_up_(c.SITUACAO) !== 'RETIRADA'); })
    .sort(function (a, b) { return (Number(a.TOTAL) || 0) - (Number(b.TOTAL) || 0); });
}

function CmpC_vencida_(c, hoje) { var v = Cmp_dia_(c.VALIDADE); return !!v && v < (hoje || Cmp_hoje_()); }
function CmpC_temTecnica_(itens) { return itens.some(function (i) { return CmpR_categoria_(i.CATEGORIA).tecnica; }); }

/** Pode ser escolhida? { ok, motivo } */
function CmpC_elegivel_(c, itens, hoje) {
  if (Cmp_up_(c.SITUACAO) === 'RETIRADA') return { ok: false, motivo: 'retirada' };
  if (!Cmp_s_(c.ARQUIVO_ID)) return { ok: false, motivo: 'sem o arquivo do orçamento' };
  if (CmpC_vencida_(c, hoje)) return { ok: false, motivo: 'validade vencida em ' + Cmp_brDia_(c.VALIDADE) };
  if (CmpC_temTecnica_(itens) && Cmp_up_(c.COMPATIBILIDADE) === 'A_CONFIRMAR') return { ok: false, motivo: 'compatibilidade da peça a confirmar' };
  return { ok: true, motivo: '' };
}

/** Total pelo sistema: soma(preço unitário x quantidade pedida) + frete + impostos. */
function CmpC_calcular_(precos, itens, frete, impostos) {
  var sub = 0, linhas = [];
  itens.forEach(function (i) {
    var p = (precos || []).filter(function (x) { return Cmp_s_(x.itemId) === Cmp_s_(i.ID); })[0];
    var pu = p ? Cmp_num_(p.precoUnitario) : NaN;
    linhas.push({ itemId: Cmp_s_(i.ID), precoUnitario: isFinite(pu) ? Cmp_r2_(pu) : null });
    if (isFinite(pu)) sub += pu * (Number(i.QUANTIDADE) || 0);
  });
  sub = Cmp_r2_(sub);
  return { precos: linhas, subtotal: sub, frete: Cmp_r2_(frete), impostos: Cmp_r2_(impostos), total: Cmp_r2_(sub + (Number(frete) || 0) + (Number(impostos) || 0)) };
}

/**
 * Lançar ou corrigir um orçamento. d: { requisicaoId, id, fornecedorId, precos:[{itemId, precoUnitario}], frete, impostos, prazoDias,
 *   validade, condicao, referencia, compatibilidade, obs, arquivo:{nome,tipo,base64} (obrigatório no lançamento) }
 */
function CmpC_salvar_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'lançar o orçamento');
  d = d || {};
  var r0 = CmpR_obter_(eu, d.requisicaoId, 'lançar o orçamento');
  if (Cmp_up_(r0.SITUACAO) !== 'EM_COTACAO') throw new Error('Não foi possível lançar o orçamento: o pedido ' + r0.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r0.SITUACAO)] + '". Orçamento se lança com o pedido em cotação' + (Cmp_up_(r0.SITUACAO) === 'SOLICITADA' ? ' (confira a especificação e toque em "iniciar cotação")' : ''));
  var f = SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(d.fornecedorId));
  if (!f || !CmpF_ativo_(f)) throw new Error('Não foi possível lançar o orçamento: escolha um fornecedor ativo da lista. Se ele não existir, cadastre em Compras > Fornecedores (com a consulta de CNPJ) e volte aqui');
  var itens = CmpR_itensDe_(r0.ID);
  var precos = Array.isArray(d.precos) ? d.precos : [];
  var faltaPreco = itens.filter(function (i) { var p = precos.filter(function (x) { return Cmp_s_(x.itemId) === Cmp_s_(i.ID); })[0]; var n = p ? Cmp_num_(p.precoUnitario) : NaN; return !(n > 0); });
  if (faltaPreco.length) throw new Error('Não foi possível lançar o orçamento: falta o preço unitário de ' + faltaPreco.map(function (i) { return '"' + Cmp_s_(i.DESCRICAO).slice(0, 40) + '"'; }).join(', ') + '. O orçamento precisa cobrir todos os itens do pedido; se o fornecedor não tem um item, divida o pedido com o comprador');
  var frete = Cmp_s_(d.frete) === '' ? 0 : Cmp_num_(d.frete), imp = Cmp_s_(d.impostos) === '' ? 0 : Cmp_num_(d.impostos);
  if (!(frete >= 0) || !(imp >= 0)) throw new Error('Não foi possível lançar o orçamento: frete e impostos são valores em reais, zero ou maiores (deixe em branco se não houver)');
  var prazo = Cmp_num_(d.prazoDias);
  if (!(prazo >= 0 && prazo <= 365)) throw new Error('Não foi possível lançar o orçamento: informe o prazo de entrega do fornecedor em dias (0 para pronta entrega)');
  var validade = Cmp_dia_(d.validade);
  if (!validade) throw new Error('Não foi possível lançar o orçamento: informe até quando o orçamento vale (está no orçamento do fornecedor; se não estiver, pergunte e anote)');
  if (validade < Cmp_hoje_()) throw new Error('Não foi possível lançar o orçamento: a validade ' + Cmp_brDia_(validade) + ' já passou. Peça ao fornecedor um orçamento atualizado');
  var tecnica = CmpC_temTecnica_(itens), compat = Cmp_up_(d.compatibilidade);
  if (tecnica && !CMP_COMPATIBILIDADE[compat]) throw new Error('Não foi possível lançar o orçamento: diga se a peça cotada é original (mesmo número), equivalente (especificação conferida) ou a confirmar');
  var calc = CmpC_calcular_(precos, itens, frete, imp);
  var arq = d.arquivo && d.arquivo.base64 ? d.arquivo : null;
  return Cmp_comTrava_(function () {
    var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, r0.ID);
    if (Cmp_up_(r.SITUACAO) !== 'EM_COTACAO') throw new Error('Não foi possível lançar: o pedido mudou de situação. Atualize a ficha');
    var id = Cmp_s_(d.id), atual = id ? SGO_DATA.getById(CMP_ABAS.COTACOES, id) : null;
    if (id && (!atual || Cmp_s_(atual.REQUISICAO_ID) !== r.ID || Cmp_up_(atual.SITUACAO) === 'RETIRADA')) throw new Error('Não foi possível corrigir: o orçamento não foi encontrado ou foi retirado. Atualize a ficha');
    if (!id) {
      var mesmo = CmpC_cotacoesDe_(r.ID).filter(function (c) { return Cmp_s_(c.FORNECEDOR_ID) === Cmp_s_(f.ID); })[0];
      if (mesmo) throw new Error('Não foi possível lançar: já existe orçamento de ' + CmpF_nome_(f) + ' neste pedido. Toque em "Corrigir" nesse orçamento (ou retire o antigo com o motivo)');
      if (!arq) throw new Error('Não foi possível lançar o orçamento: anexe o arquivo do orçamento do fornecedor (PDF, foto ou e-mail salvo). Só conta cotação com a prova do preço');
    }
    var salvo = arq ? Cmp_salvarArquivo_(arq, r.NUMERO, 'Orçamento ' + CmpF_nome_(f), CMP_RX_DOC, 'do orçamento') : null;
    var campos = { FORNECEDOR_ID: Cmp_s_(f.ID), FORNECEDOR_NOME: CmpF_nome_(f), PRECOS_JSON: JSON.stringify(calc.precos), SUBTOTAL: calc.subtotal, FRETE: calc.frete, IMPOSTOS: calc.impostos,
      TOTAL: calc.total, PRAZO_DIAS: Math.round(prazo), VALIDADE: validade, CONDICAO_PAGAMENTO: Cmp_texto_(d.condicao, 200), REFERENCIA: Cmp_texto_(d.referencia, 80),
      COMPATIBILIDADE: tecnica ? compat : '', OBS: Cmp_texto_(d.obs, 1000), ATUALIZADO_EM: Cmp_agora_() };
    if (salvo) { campos.ARQUIVO_ID = salvo.id; campos.ARQUIVO_NOME = salvo.nome; campos.ARQUIVO_URL = salvo.url; }
    if (atual) SGO_DATA.update(CMP_ABAS.COTACOES, atual.ID, campos);
    else { campos.REQUISICAO_ID = r.ID; campos.SITUACAO = 'ATIVA'; campos.LANCADA_POR_ID = eu.id; campos.LANCADA_POR_NOME = eu.nome; SGO_DATA.insert(CMP_ABAS.COTACOES, campos); }
    Cmp_historico_('REQUISICAO', r.ID, atual ? 'COTACAO_CORRIGIDA' : 'COTACAO', eu, { texto: (atual ? 'Orçamento corrigido: ' : 'Orçamento lançado: ') + CmpF_nome_(f) + ' · total ' + Cmp_moeda_(calc.total) + ' · prazo ' + Cmp_plural_(Math.round(prazo), 'dia', 'dias') + ' · válido até ' + Cmp_brDia_(validade) + '.' });
    return { requisicao: CmpR_paraTela_(eu, r, true), message: 'Orçamento de ' + CmpF_nome_(f) + ' ' + (atual ? 'corrigido' : 'lançado') + ': total ' + Cmp_moeda_(calc.total) + ' (calculado pelo sistema).' };
  });
}

/** Retirar um orçamento (com o motivo). */
function CmpC_retirar_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'retirar o orçamento');
  var motivo = Cmp_texto_(d && d.motivo, 500);
  if (motivo.length < 5) throw new Error('Não foi possível retirar: escreva o motivo (por exemplo "Fornecedor desistiu do preço")');
  return Cmp_comTrava_(function () {
    var c = SGO_DATA.getById(CMP_ABAS.COTACOES, Cmp_s_(d.id));
    if (!c || Cmp_up_(c.SITUACAO) === 'RETIRADA') throw new Error('Não foi possível retirar: o orçamento não foi encontrado. Atualize a ficha');
    var r = CmpR_obter_(eu, c.REQUISICAO_ID, 'retirar o orçamento');
    if (Cmp_up_(r.SITUACAO) !== 'EM_COTACAO') throw new Error('Não foi possível retirar: o pedido ' + r.NUMERO + ' não está em cotação');
    SGO_DATA.update(CMP_ABAS.COTACOES, c.ID, { SITUACAO: 'RETIRADA', RETIRADA_MOTIVO: motivo, ATUALIZADO_EM: Cmp_agora_() });
    Cmp_historico_('REQUISICAO', r.ID, 'COTACAO_RETIRADA', eu, { texto: 'Orçamento de ' + Cmp_s_(c.FORNECEDOR_NOME) + ' retirado: ' + motivo });
    return { requisicao: CmpR_paraTela_(eu, r, true), message: 'Orçamento retirado (fica no histórico).' };
  });
}

/** Quem lançou ou escolheu cotação neste pedido (não aprova acima da faixa do comprador). */
function CmpC_participantes_(r) {
  var ids = CmpC_cotacoesDe_(r.ID, true).map(function (c) { return Cmp_s_(c.LANCADA_POR_ID); });
  if (Cmp_s_(r.ESCOLHA_POR_ID)) ids.push(Cmp_s_(r.ESCOLHA_POR_ID));
  return ids.filter(function (id, i, l) { return id && l.indexOf(id) === i; });
}

/**
 * Quem aprova este pedido agora: { nivel, nivelNome, ids (elegíveis), nomes, naoPode, extra (para a Caixa), tipo (compras_aprovar | compras_aprovar_comprador), motivo }.
 * O mesmo cálculo serve à Caixa de decisões (roteamento) e à trava do servidor (quem pode decidir).
 */
function CmpC_rota_(r, regras, us) {
  regras = regras || Cmp_regras_(); us = us || Cmp_usuarios_();
  var sol = Cmp_s_(r.SOLICITANTE_ID), nivel = Cmp_up_(r.APROVADOR_NIVEL) || 'COMPRADOR';
  var participantes = CmpC_participantes_(r);
  var rota = { nivel: nivel, ids: [], naoPode: [sol], extra: {}, tipo: 'compras_aprovar', motivo: '' };
  if (nivel === 'COMPRADOR') {
    var compr = Cmp_compradoresAtivos_(regras, us).concat(Cmp_gestoresCompras_(regras, us)).filter(function (id, i, l) { return l.indexOf(id) === i && id !== sol; });
    if (compr.length) {
      rota.ids = compr; rota.tipo = 'compras_aprovar_comprador'; rota.motivo = 'Faixa do comprador: aprova o comprador ou o substituto (quem pediu não aprova a própria compra).';
      rota.nivelNome = CMP_NIVEIS_APROVACAO.COMPRADOR;
      rota.ids = rota.ids.concat(Cmp_diretoria_(us, rota.naoPode)).filter(function (id, i, l) { return l.indexOf(id) === i; });
      rota.nomes = rota.ids.map(function (id) { return us[id] ? us[id].nome : id; });
      return rota;
    }
    nivel = 'GESTOR_AREA'; // sem outro comprador: sobe para o gestor da área
    rota.motivo = 'Faixa do comprador, mas quem pediu é o único comprador: aprova o gestor da área. ';
  }
  rota.naoPode = [sol].concat(participantes).filter(function (id, i, l) { return id && l.indexOf(id) === i; });
  if (nivel === 'DIRETORIA') {
    rota.ids = Cmp_diretoria_(us, rota.naoPode);
    rota.extra = { soDiretoria: true, naoPode: rota.naoPode.slice() };
    rota.motivo += 'Faixa da Diretoria.';
  } else {
    var area = Cmp_up_(r.SOLICITANTE_AREA) || Cmp_up_(regras.areaCompras);
    var cfg = {};
    try { cfg = typeof Ges_cfg_ === 'function' ? Ges_cfg_() : {}; } catch (e) { cfg = {}; }
    var conf = (((cfg.gestoresPorArea || {})[area]) || []).map(Cmp_s_).filter(function (id) { return us[id] && us[id].ativo && rota.naoPode.indexOf(id) < 0; });
    rota.extra = { area: area, naoPode: rota.naoPode.slice() };
    if (conf.length) { rota.ids = conf; rota.motivo += 'Gestor responsável pela área de quem pediu.'; }
    else {
      var cad = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === area && rota.naoPode.indexOf(id) < 0; });
      if (cad.length) { rota.ids = [cad[0]]; rota.extra.decisor = cad[0]; rota.extra.motivoDecisor = 'Gestor da área de quem pediu (cadastro; a área ainda não tem responsável em Regras e responsáveis).'; rota.motivo += rota.extra.motivoDecisor; }
      else { rota.ids = Cmp_diretoria_(us, rota.naoPode); rota.motivo += 'A área de quem pediu não tem gestor: reserva da Diretoria.'; }
    }
    rota.ids = rota.ids.concat(Cmp_diretoria_(us, rota.naoPode)).filter(function (id, i, l) { return l.indexOf(id) === i; });
  }
  rota.nivel = nivel; rota.nivelNome = CMP_NIVEIS_APROVACAO[nivel] || nivel;
  rota.nomes = rota.ids.map(function (id) { return us[id] ? us[id].nome : id; });
  return rota;
}

/** A pessoa pode decidir a aprovação? { pode, motivo } */
function CmpC_podeAprovar_(eu, r, rota) {
  if (Cmp_up_(r.SITUACAO) !== 'AGUARDANDO_APROVACAO') return { pode: false, motivo: '' };
  rota = rota || CmpC_rota_(r);
  if (eu.id === Cmp_s_(r.SOLICITANTE_ID)) return { pode: false, motivo: 'Quem pediu não aprova a própria compra. Quem aprova: ' + rota.nomes.join(', ') + '.' };
  if (rota.naoPode.indexOf(eu.id) >= 0) return { pode: false, motivo: 'Você lançou ou escolheu orçamento desta compra; acima da faixa do comprador quem cota não aprova. Quem aprova: ' + rota.nomes.join(', ') + '.' };
  if (rota.ids.indexOf(eu.id) < 0) return { pode: false, motivo: 'Esta compra é da faixa "' + rota.nivelNome + '". Quem aprova: ' + (rota.nomes.join(', ') || 'a Diretoria') + '.' };
  return { pode: true, motivo: '' };
}

/** Prazo da atividade "Fazer o pedido de compra": crítica no mesmo dia; demais, 1 dia útil (configurável). */
function CmpC_atividadePedido_(r, eu) {
  try {
    var regras = Cmp_regras_(), dias = Number(regras.prazos.pedidoDiasUteis) || 1;
    var crit = Cmp_up_(r.URGENCIA) === 'CRITICA';
    return Cmp_criarAtividade_({ responsavelId: Cmp_s_(r.COMPRADOR_ID), comoPessoa: eu, titulo: 'Fazer o pedido de compra ' + Cmp_s_(r.NUMERO) + ': ' + Cmp_s_(r.TITULO).slice(0, 110),
      descricao: 'Compra aprovada. Emita o pedido de compra ao fornecedor escolhido (folha A4 numerada), envie pelo "Enviar documento" e registre a previsão de entrega.\nQuem pediu: ' + Cmp_s_(r.SOLICITANTE_NOME) + '.\nAbra em Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) + '.',
      prazo: crit ? Cmp_prazoPorUrgencia_('CRITICA') : Cmp_prazoPorUrgencia_('NORMAL', dias), prioridade: crit ? 'Urgente' : 'Alta', clienteId: Cmp_s_(r.CLIENTE_ID), unidadeId: Cmp_s_(r.UNIDADE_ID),
      porQue: 'Compra aprovada: o fornecedor precisa receber o pedido para a peça chegar no prazo.', onde: 'Compras > Fila de compras > ' + Cmp_s_(r.NUMERO), como: 'Na ficha, toque em "Emitir o pedido de compra", depois em "Enviar ao fornecedor".' });
  } catch (e) { console.error('Compras, atividade do pedido: ' + ((e && e.message) || e)); return ''; }
}

/**
 * Escolher o orçamento vencedor. d: { requisicaoId, cotacaoId, justificativaPreco, justificativaMinimo }
 * Na faixa do comprador, a escolha feita por um comprador (que não seja quem pediu) já é a aprovação registrada.
 */
function CmpC_escolher_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'escolher o orçamento');
  d = d || {};
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'escolher o orçamento');
    if (Cmp_up_(r.SITUACAO) !== 'EM_COTACAO') throw new Error('Não foi possível escolher: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r.SITUACAO)] + '"');
    var itens = CmpR_itensDe_(r.ID), hoje = Cmp_hoje_(), regras = Cmp_regras_();
    var cots = CmpC_cotacoesDe_(r.ID), c = cots.filter(function (x) { return Cmp_s_(x.ID) === Cmp_s_(d.cotacaoId); })[0];
    if (!c) throw new Error('Não foi possível escolher: o orçamento não foi encontrado. Atualize a ficha');
    var el = CmpC_elegivel_(c, itens, hoje);
    if (!el.ok) throw new Error('Não foi possível escolher o orçamento de ' + Cmp_s_(c.FORNECEDOR_NOME) + ': ' + el.motivo + '. ' + (/vencida/.test(el.motivo) ? 'Peça ao fornecedor a revalidação e corrija o orçamento.' : /arquivo/.test(el.motivo) ? 'Toque em "Corrigir" e anexe o arquivo do orçamento.' : 'Confirme com o fornecedor que a peça serve e corrija o orçamento.'));
    var validas = cots.filter(function (x) { return CmpC_elegivel_(x, itens, hoje).ok; });
    var fornecedores = validas.map(function (x) { return Cmp_s_(x.FORNECEDOR_ID); }).filter(function (x, i, l) { return l.indexOf(x) === i; });
    var fx = Cmp_faixaDe_(Number(c.TOTAL), regras);
    var maisBarata = validas.reduce(function (m, x) { return Math.min(m, Number(x.TOTAL) || 0); }, Infinity);
    var jPreco = Cmp_texto_(d.justificativaPreco, 1000), jMin = Cmp_texto_(d.justificativaMinimo, 1000);
    var faltas = [];
    if (Number(c.TOTAL) > maisBarata + 0.005 && jPreco.length < 15) faltas.push('este orçamento não é o mais barato (o mais barato é ' + Cmp_moeda_(maisBarata) + '): escreva por que ele foi escolhido (pelo menos 15 letras, por exemplo "prazo de entrega menor; equipamento parado")');
    if (fornecedores.length < fx.cotacoes && jMin.length < 15) faltas.push('a faixa ' + fx.nome + ' pede ' + Cmp_plural_(fx.cotacoes, 'cotação', 'cotações') + ' de fornecedores diferentes e há ' + fornecedores.length + ': lance os outros orçamentos ou justifique (pelo menos 15 letras, por exemplo "fornecedor único da peça original")');
    if (faltas.length) throw new Error('Não foi possível escolher: ' + faltas.join('; ') + '. Depois toque em "Escolher este orçamento" de novo');
    var agora = Cmp_agora_(), sol = Cmp_s_(r.SOLICITANTE_ID);
    var campos = { COTACAO_ID: Cmp_s_(c.ID), ESCOLHA_POR_ID: eu.id, ESCOLHA_POR_NOME: eu.nome, ESCOLHA_EM: agora, ESCOLHA_JUSTIFICATIVA: Number(c.TOTAL) > maisBarata + 0.005 ? jPreco : '',
      MINIMO_COTACOES: fx.cotacoes, COTACOES_VALIDAS: fornecedores.length, COTACOES_JUSTIFICATIVA: fornecedores.length < fx.cotacoes ? jMin : '', VALOR_TOTAL: Number(c.TOTAL), FAIXA: fx.indice,
      APROVADOR_NIVEL: fx.aprovador, APROVACAO_PEDIDA_EM: agora, APROVADA_POR_ID: '', APROVADA_POR_NOME: '', APROVADA_EM: '', APROVACAO_TEXTO: '', ATUALIZADO_EM: agora };
    cots.forEach(function (x) { if (Cmp_up_(x.SITUACAO) === 'ESCOLHIDA' && x.ID !== c.ID) SGO_DATA.update(CMP_ABAS.COTACOES, x.ID, { SITUACAO: 'ATIVA' }); });
    SGO_DATA.update(CMP_ABAS.COTACOES, c.ID, { SITUACAO: 'ESCOLHIDA', ATUALIZADO_EM: agora });
    Cmp_mudarAtividade_(r.ATIVIDADE_ID, 'Concluída', 'Orçamento escolhido: ' + Cmp_s_(c.FORNECEDOR_NOME) + '.');
    var autoAprova = fx.aprovador === 'COMPRADOR' && (eu.compradorLista || eu.gestao) && eu.id !== sol;
    var msg;
    if (autoAprova) {
      campos.SITUACAO = 'APROVADA'; campos.APROVADA_POR_ID = eu.id; campos.APROVADA_POR_NOME = eu.nome; campos.APROVADA_EM = agora;
      campos.APROVACAO_TEXTO = 'Aprovada pelo comprador na faixa ' + fx.nome + ' (registrado).';
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
      var rr = Object.assign({}, r, campos);
      campos.ATIVIDADE_ID = CmpC_atividadePedido_(rr, eu);
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { ATIVIDADE_ID: campos.ATIVIDADE_ID });
      SGO_DATA.insert(CMP_ABAS.APROVACOES, { REQUISICAO_ID: r.ID, FAIXA: fx.indice, NIVEL: 'COMPRADOR', VALOR: Number(c.TOTAL), DECISAO: 'APROVADA', TEXTO: campos.APROVACAO_TEXTO, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora });
      Cmp_historico_('REQUISICAO', r.ID, 'APROVADA', eu, { de: 'Em cotação', para: 'Aprovada', publico: true, texto: 'Orçamento escolhido e compra aprovada pelo comprador. O pedido ao fornecedor é o próximo passo.' });
      Cmp_historico_('REQUISICAO', r.ID, 'ESCOLHA', eu, { texto: 'Escolhido ' + Cmp_s_(c.FORNECEDOR_NOME) + ' · ' + Cmp_moeda_(c.TOTAL) + ' · faixa ' + fx.nome + '.' + (campos.ESCOLHA_JUSTIFICATIVA ? ' Não é o mais barato: ' + campos.ESCOLHA_JUSTIFICATIVA : '') + (campos.COTACOES_JUSTIFICATIVA ? ' Menos cotações que o mínimo: ' + campos.COTACOES_JUSTIFICATIVA : '') });
      msg = 'Orçamento escolhido e compra aprovada (faixa ' + fx.nome + ', aprovação do comprador registrada). Agora emita o pedido de compra.';
    } else {
      campos.SITUACAO = 'AGUARDANDO_APROVACAO';
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
      var rota = CmpC_rota_(Object.assign({}, r, campos), regras);
      Cmp_historico_('REQUISICAO', r.ID, 'ESCOLHA', eu, { de: 'Em cotação', para: 'Aguardando aprovação', texto: 'Escolhido ' + Cmp_s_(c.FORNECEDOR_NOME) + ' · ' + Cmp_moeda_(c.TOTAL) + ' · faixa ' + fx.nome + ' (' + rota.nivelNome + ').' + (campos.ESCOLHA_JUSTIFICATIVA ? ' Não é o mais barato: ' + campos.ESCOLHA_JUSTIFICATIVA : '') + (campos.COTACOES_JUSTIFICATIVA ? ' Menos cotações que o mínimo: ' + campos.COTACOES_JUSTIFICATIVA : '') });
      Cmp_historico_('REQUISICAO', r.ID, 'AGUARDANDO_APROVACAO', eu, { publico: true, para: 'Aguardando aprovação', texto: 'Orçamento escolhido; aguarda a aprovação de quem tem a alçada para o valor.' });
      msg = 'Orçamento escolhido. A compra aguarda a aprovação (' + rota.nivelNome + ': ' + rota.nomes.join(', ') + '); o item está na Caixa de decisões.';
    }
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: msg };
  });
}

/** Aprovar ou reprovar. d: { requisicaoId, aprovar (bool), texto } — reprovar exige o motivo (pelo menos 10 letras). */
function CmpC_decidir_(eu, d) {
  d = d || {};
  var aprovar = d.aprovar === true, texto = Cmp_texto_(d.texto, 1000);
  if (!aprovar && texto.length < 10) throw new Error('Não foi possível reprovar: escreva o motivo (pelo menos 10 letras). O comprador recebe o motivo e a compra volta para cotação');
  return Cmp_comTrava_(function () {
    var r = CmpR_obter_(eu, d.requisicaoId, 'decidir a compra');
    if (Cmp_up_(r.SITUACAO) !== 'AGUARDANDO_APROVACAO') throw new Error('Não foi possível decidir: o pedido ' + r.NUMERO + ' está "' + CMP_SITUACOES[Cmp_up_(r.SITUACAO)] + '"');
    var rota = CmpC_rota_(r), pa = CmpC_podeAprovar_(eu, r, rota);
    if (!pa.pode) throw new Error('Não foi possível decidir: ' + pa.motivo.replace(/\.$/, '') + '. A compra continua na Caixa de decisões de quem aprova');
    var c = SGO_DATA.getById(CMP_ABAS.COTACOES, Cmp_s_(r.COTACAO_ID)) || {};
    if (aprovar && CmpC_vencida_(c)) throw new Error('Não foi possível aprovar: o orçamento escolhido venceu em ' + Cmp_brDia_(c.VALIDADE) + '. Reprove com o motivo "orçamento vencido" para o comprador pedir a revalidação, ou peça a ele que atualize');
    var agora = Cmp_agora_(), campos;
    if (aprovar) {
      campos = { SITUACAO: 'APROVADA', APROVADA_POR_ID: eu.id, APROVADA_POR_NOME: eu.nome, APROVADA_EM: agora, APROVACAO_TEXTO: texto || 'Aprovada.', ATUALIZADO_EM: agora };
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
      campos.ATIVIDADE_ID = CmpC_atividadePedido_(Object.assign({}, r, campos), null);
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { ATIVIDADE_ID: campos.ATIVIDADE_ID });
      Cmp_historico_('REQUISICAO', r.ID, 'APROVADA', eu, { de: 'Aguardando aprovação', para: 'Aprovada', publico: true, texto: 'Compra aprovada por ' + eu.nome + '. O pedido ao fornecedor é o próximo passo.' + (texto ? ' ' + texto : '') });
      Cmp_avisar_(r.COMPRADOR_ID, 'APROVADA', 'Compra aprovada: faça o pedido ' + r.NUMERO, eu.nome + ' aprovou a compra "' + Cmp_s_(r.TITULO).slice(0, 80) + '". Emita o pedido de compra ao fornecedor (atividade em Minhas atividades).', r.ID, { email: true, autorId: eu.id });
    } else {
      campos = { SITUACAO: 'EM_COTACAO', COTACAO_ID: '', ESCOLHA_POR_ID: '', ESCOLHA_POR_NOME: '', ESCOLHA_EM: '', ESCOLHA_JUSTIFICATIVA: '', COTACOES_JUSTIFICATIVA: '', VALOR_TOTAL: '', FAIXA: '', APROVADOR_NIVEL: '',
        APROVACAO_PEDIDA_EM: '', APROVACAO_TEXTO: 'Reprovada por ' + eu.nome + ': ' + texto, REPROVACOES: (Number(r.REPROVACOES) || 0) + 1, ATUALIZADO_EM: agora };
      SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, campos);
      if (c.ID) SGO_DATA.update(CMP_ABAS.COTACOES, c.ID, { SITUACAO: 'ATIVA', ATUALIZADO_EM: agora });
      try {
        campos.ATIVIDADE_ID = Cmp_criarAtividade_({ responsavelId: Cmp_s_(r.COMPRADOR_ID), titulo: 'Rever a cotação de ' + Cmp_s_(r.NUMERO) + ' (reprovada)', descricao: 'Compra reprovada por ' + eu.nome + '. Motivo: ' + texto + '\nAbra em Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) + ', ajuste os orçamentos e escolha de novo.',
          prazo: Cmp_prazoPorUrgencia_(r.URGENCIA), clienteId: Cmp_s_(r.CLIENTE_ID), unidadeId: Cmp_s_(r.UNIDADE_ID), porQue: 'A compra foi reprovada e voltou para cotação.', onde: 'Compras > Fila de compras > ' + Cmp_s_(r.NUMERO) });
        SGO_DATA.update(CMP_ABAS.REQUISICOES, r.ID, { ATIVIDADE_ID: campos.ATIVIDADE_ID });
      } catch (e) { console.error('Compras, atividade da reprovação: ' + ((e && e.message) || e)); }
      Cmp_historico_('REQUISICAO', r.ID, 'REPROVADA', eu, { de: 'Aguardando aprovação', para: 'Em cotação', publico: true, texto: 'Compra reprovada por ' + eu.nome + '; voltou para cotação. Motivo: ' + texto });
      Cmp_avisar_(r.COMPRADOR_ID, 'REPROVADA', 'Compra reprovada: ' + r.NUMERO, eu.nome + ' reprovou a compra. Motivo: ' + texto + ' O pedido voltou para cotação.', r.ID, { autorId: eu.id });
    }
    SGO_DATA.insert(CMP_ABAS.APROVACOES, { REQUISICAO_ID: r.ID, FAIXA: Cmp_s_(r.FAIXA), NIVEL: rota.nivel, VALOR: Number(r.VALOR_TOTAL) || 0, DECISAO: aprovar ? 'APROVADA' : 'REPROVADA', TEXTO: texto, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora });
    return { requisicao: CmpR_paraTela_(eu, Object.assign({}, r, campos), true), message: aprovar ? 'Compra aprovada. O comprador recebeu a atividade para fazer o pedido.' : 'Compra reprovada: voltou para cotação e o comprador recebeu o motivo.' };
  });
}

// ------------------------------------------------------------
// TELA E PENDÊNCIAS
// ------------------------------------------------------------
/** Acrescenta à ficha (só para quem vê valores) as cotações, o comparativo e a aprovação. */
function CmpC_paraTela_(eu, r, t) {
  var itens = CmpR_itensDe_(r.ID), hoje = Cmp_hoje_(), regras = Cmp_regras_();
  var cots = CmpC_cotacoesDe_(r.ID, true);
  var validas = cots.filter(function (x) { return CmpC_elegivel_(x, itens, hoje).ok; });
  var fornValidos = validas.map(function (x) { return Cmp_s_(x.FORNECEDOR_ID); }).filter(function (x, i, l) { return l.indexOf(x) === i; }).length;
  var maisBarata = validas.reduce(function (m, x) { return Math.min(m, Number(x.TOTAL) || 0); }, Infinity);
  var porItem = {};
  itens.forEach(function (i) { porItem[Cmp_s_(i.ID)] = i; });
  t.cotacoes = cots.map(function (c) {
    var el = CmpC_elegivel_(c, itens, hoje), fx = Cmp_faixaDe_(Number(c.TOTAL), regras);
    return { id: Cmp_s_(c.ID), fornecedorId: Cmp_s_(c.FORNECEDOR_ID), fornecedor: Cmp_s_(c.FORNECEDOR_NOME), total: Number(c.TOTAL) || 0, totalTxt: Cmp_moeda_(c.TOTAL),
      subtotalTxt: Cmp_moeda_(c.SUBTOTAL), freteTxt: Cmp_moeda_(c.FRETE), impostosTxt: Cmp_moeda_(c.IMPOSTOS), frete: Number(c.FRETE) || 0, impostos: Number(c.IMPOSTOS) || 0,
      prazoDias: Cmp_s_(c.PRAZO_DIAS), validade: Cmp_brDia_(c.VALIDADE), validadeIso: Cmp_dia_(c.VALIDADE), vencida: CmpC_vencida_(c, hoje), condicao: Cmp_s_(c.CONDICAO_PAGAMENTO),
      referencia: Cmp_s_(c.REFERENCIA), compatibilidade: Cmp_s_(c.COMPATIBILIDADE), compatNome: CMP_COMPATIBILIDADE[Cmp_up_(c.COMPATIBILIDADE)] || '', obs: Cmp_s_(c.OBS),
      arquivo: Cmp_s_(c.ARQUIVO_ID) ? { nome: Cmp_s_(c.ARQUIVO_NOME), url: Cmp_s_(c.ARQUIVO_URL) } : null, situacao: Cmp_up_(c.SITUACAO), retiradaMotivo: Cmp_s_(c.RETIRADA_MOTIVO),
      lancadaPor: Cmp_s_(c.LANCADA_POR_NOME), elegivel: el.ok, motivoInelegivel: el.motivo, maisBarata: el.ok && Math.abs((Number(c.TOTAL) || 0) - maisBarata) < 0.005,
      faixaSeEscolhida: { nome: fx.nome, aprovador: CMP_NIVEIS_APROVACAO[fx.aprovador], cotacoes: fx.cotacoes }, precisaJustPreco: el.ok && (Number(c.TOTAL) || 0) > maisBarata + 0.005,
      precisaJustMinimo: fornValidos < fx.cotacoes, cotacoesValidas: fornValidos,
      precos: Cmp_json_(c.PRECOS_JSON, []).map(function (p) { var i = porItem[Cmp_s_(p.itemId)] || {}; var q = Number(i.QUANTIDADE) || 0; return { itemId: Cmp_s_(p.itemId), descricao: Cmp_s_(i.DESCRICAO), precoUnitario: p.precoUnitario, puTxt: Cmp_moeda_(p.precoUnitario), totalTxt: Cmp_moeda_((Number(p.precoUnitario) || 0) * q) }; }) };
  });
  t.temTecnica = CmpC_temTecnica_(itens);
  t.aprovacoes = Cmp_ler_(CMP_ABAS.APROVACOES).filter(function (a) { return Cmp_s_(a.REQUISICAO_ID) === Cmp_s_(r.ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); })
    .map(function (a) { return { decisao: Cmp_up_(a.DECISAO), nivel: CMP_NIVEIS_APROVACAO[Cmp_up_(a.NIVEL)] || Cmp_s_(a.NIVEL), valorTxt: Cmp_moeda_(a.VALOR), texto: Cmp_s_(a.TEXTO), por: Cmp_s_(a.POR_NOME), em: Cmp_br_(a.EM) }; });
  if (Cmp_up_(r.SITUACAO) === 'AGUARDANDO_APROVACAO') {
    var rota = CmpC_rota_(r, regras), pa = CmpC_podeAprovar_(eu, r, rota);
    t.aprovacao = { nivelNome: rota.nivelNome, quem: rota.nomes, motivoRota: rota.motivo, podeEu: pa.pode, motivoNaoPode: pa.motivo, pedidaEm: Cmp_br_(r.APROVACAO_PEDIDA_EM) };
  }
  var escolhida = cots.filter(function (c) { return Cmp_s_(c.ID) === Cmp_s_(r.COTACAO_ID); })[0];
  if (escolhida) t.escolhida = { fornecedor: Cmp_s_(escolhida.FORNECEDOR_NOME), totalTxt: Cmp_moeda_(escolhida.TOTAL), por: Cmp_s_(r.ESCOLHA_POR_NOME), em: Cmp_br_(r.ESCOLHA_EM) };
}

function CmpC_acoes_(eu, r, a) {
  var s = Cmp_up_(r.SITUACAO);
  a.cotar = s === 'EM_COTACAO' && eu.comprador;
  a.escolher = a.cotar;
  if (s === 'AGUARDANDO_APROVACAO' && eu.veValores) { var pa = CmpC_podeAprovar_(eu, r); a.decidir = pa.pode; }
}

/** Pendências de aprovação (Caixa de decisões e Início). Nenhum item leva valor. */
function CmpC_pendencias_(add, ctx, r, o) {
  if (Cmp_up_(r.SITUACAO) !== 'AGUARDANDO_APROVACAO') return;
  var rota = CmpC_rota_(r, o.regras, o.usuarios());
  var crit = Cmp_up_(r.URGENCIA) === 'CRITICA', num = Cmp_s_(r.NUMERO);
  var extra = Object.assign({}, rota.extra, { desde: Cmp_dia_(r.APROVACAO_PEDIDA_EM) || o.hoje });
  if (crit) extra.prazo = o.hoje;
  add(Pend_item_(rota.tipo, {
    id: 'CMP:APROVAR:' + r.ID, nome: num, publico: rota.tipo === 'compras_aprovar' ? 'GESTAO' : 'PESSOA', paraUsuarios: rota.ids, responsavel: Cmp_s_(r.SOLICITANTE_NOME), responsavelId: Cmp_s_(r.SOLICITANTE_ID),
    gravidade: crit ? 'CRITICO' : 'ATENCAO', dias: null,
    titulo: 'Aprovar a compra ' + num + ' (' + Cmp_s_(r.TITULO).slice(0, 60) + ')' + (crit ? ' — urgência crítica' : ''),
    detalhe: 'Faixa: ' + rota.nivelNome + '. Pedida por ' + Cmp_s_(r.SOLICITANTE_NOME) + '; orçamento escolhido por ' + Cmp_s_(r.ESCOLHA_POR_NOME) + ' em ' + Cmp_br_(r.ESCOLHA_EM) + '. O valor e os orçamentos estão na ficha da compra.',
    oQueFazer: 'Abra a ficha em Compras > Fila de compras, confira os orçamentos e toque em "Aprovar" ou "Reprovar" (com o motivo). Quem pediu não aprova a própria compra.',
    tela: CMP_PEND_TELA('compras', Cmp_s_(r.ID)), extra: extra
  }));
}
