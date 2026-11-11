/****************************************************
 * COMPRAS — CARTÕES DA EMPRESA, FATURAS, EXTRATO, CONCILIAÇÃO E A PAGAR (31/10/2026)
 *
 * Pedido do dono (31/10/2026): "conciliação de caixa para o financeiro, deixar tudo fácil e organizado para conferências do
 * financeiro". Os dados reais dos cartões são preenchidos depois por um colaborador: tudo funciona sem eles (a compra aceita
 * os 4 últimos dígitos e se liga ao cartão quando ele for cadastrado; "O que falta" diz o que ainda não está pronto).
 *
 *  - Cartões (CMP_CARTOES): só o final (4 dígitos; nunca o número inteiro), apelido, crédito ou débito, responsável, dia de
 *    fechamento e de vencimento, limite (opcional), ativo. Financeiro, Diretoria e Administrador cadastram; compradores
 *    consultam. Final repetido entre cartões ativos é recusado. Toda mudança vai para o histórico com antes e depois.
 *  - Fatura (CMP_FATURAS): um cartão (final) num mês de vencimento. Nasce quando alguém abre ou importa.
 *  - Extrato (CMP_EXTRATO, CMP_IMPORTACOES): o arquivo que o banco exporta (CSV, Excel .xlsx ou OFX). As colunas são
 *    reconhecidas pelo nome (a leitura do CSV e do Excel é a da Frota: FrotaGas_lerCsv_, FrotaGas_matrizDoArquivo_).
 *    Primeiro a prévia; nada é gravado sem confirmar. Linha já importada (mesma chave) não entra duas vezes.
 *  - Casamento: mesmo final, valor com diferença até R$ 0,05, data da compra até 3 dias e, quando o extrato traz "02/03",
 *    a mesma parcela. Casou: Conciliada. Na fatura e não informado: "Não informada" (cobrança ao responsável do cartão).
 *    Informado e não está na fatura: "Não está na fatura" (passar para a próxima ou Divergente com motivo).
 *  - Ações manuais com motivo (15 letras) e trilha; quem comprou não concilia a própria compra.
 *  - Fechar a fatura: tudo conciliado ou justificado; senão "fechar com ressalva" com motivo. Reabrir: Diretoria.
 *  - A pagar: faturado, boleto e reembolso por vencimento; "Marcar como pago" com data e comprovante (ninguém baixa o
 *    próprio reembolso).
 * Nenhuma função devolve Date cru.
 ****************************************************/

var CMP_EXT_SIT = { CONCILIADA: 'Conciliada', NAO_INFORMADA: 'Não informada', JUSTIFICADA: 'Justificada', IGNORADA: 'Ignorada' };
var CMP_FAT_SIT = { ABERTA: 'Aberta', FECHADA: 'Fechada', FECHADA_RESSALVA: 'Fechada com ressalva' };
var CMP_CARTAO_TIPOS = { CREDITO: 'Crédito', DEBITO: 'Débito', MULTIPLO: 'Crédito e débito' };
var CMP_TOL_VALOR = 0.051;
var CMP_TOL_DIAS = 3;
var CMP_RX_EXTRATO = /\.(csv|txt|ofx|qfx|xlsx)$/i;

// ------------------------------------------------------------
// CARTÕES
// ------------------------------------------------------------
function CmpCart_lista_() { return Cmp_ler_(CMP_ABAS.CARTOES); }
function CmpCart_ativo_(k) { return Cmp_up_(k && k.ATIVO || 'SIM') !== 'NAO'; }
function CmpCart_porFinal_(final, lista) {
  var f = Cmp_digitos_(final);
  if (f.length !== 4) return null;
  return (lista || CmpCart_lista_()).filter(function (k) { return CmpCart_ativo_(k) && Cmp_s_(k.FINAL) === f; })[0] || null;
}
function CmpCart_rotulo_(k, final) { return k ? (Cmp_s_(k.APELIDO) ? Cmp_s_(k.APELIDO) + ' (final ' + Cmp_s_(k.FINAL) + ')' : 'final ' + Cmp_s_(k.FINAL)) : 'final ' + Cmp_s_(final) + ' (não cadastrado)'; }
function CmpCart_paraTela_(k) {
  return { id: Cmp_s_(k.ID), final: Cmp_s_(k.FINAL), apelido: Cmp_s_(k.APELIDO), tipo: Cmp_up_(k.TIPO) || 'CREDITO', tipoNome: CMP_CARTAO_TIPOS[Cmp_up_(k.TIPO) || 'CREDITO'] || '', responsavelId: Cmp_s_(k.RESPONSAVEL_ID),
    responsavel: Cmp_s_(k.RESPONSAVEL_NOME), diaFechamento: Cmp_s_(k.DIA_FECHAMENTO), diaVencimento: Cmp_s_(k.DIA_VENCIMENTO), limite: Cmp_s_(k.LIMITE) !== '' ? Number(k.LIMITE) : '',
    limiteTxt: Cmp_s_(k.LIMITE) !== '' ? Cmp_moeda_(k.LIMITE) : '', ativo: CmpCart_ativo_(k), obs: Cmp_s_(k.OBS), atualizado: [Cmp_br_(k.ATUALIZADO_EM), Cmp_s_(k.ATUALIZADO_POR_NOME)].filter(Boolean).join(' · ') };
}
function CmpCart_podeEditar_(eu) { return !!(eu.financeiro || eu.diretoria || eu.admin); }
function CmpCart_podeVer_(eu) { return !!(eu.financeiro || eu.comprador || eu.gestao || eu.gestor); }

/** "O que falta" para a conciliação funcionar: uma linha por condição, com a situação e o que fazer. */
function CmpCart_oQueFalta_() {
  var l = [], cartoes = CmpCart_lista_().filter(CmpCart_ativo_), us = Cmp_usuarios_();
  if (!cartoes.length) l.push({ grave: true, texto: 'Nenhum cartão da empresa cadastrado.', fazer: 'Toque em "Novo cartão" e cadastre cada cartão: final, apelido, responsável, dia de fechamento e de vencimento.' });
  cartoes.forEach(function (k) {
    var r = CmpCart_rotulo_(k);
    if (!Cmp_s_(k.RESPONSAVEL_ID) || !us[Cmp_s_(k.RESPONSAVEL_ID)] || !us[Cmp_s_(k.RESPONSAVEL_ID)].ativo) l.push({ grave: true, cartaoId: Cmp_s_(k.ID), texto: 'Cartão ' + r + ' sem responsável ativo.', fazer: 'Edite o cartão e escolha o responsável: é ele quem recebe a cobrança do que está na fatura e não foi informado.' });
    if (Cmp_up_(k.TIPO || 'CREDITO') !== 'DEBITO' && !(Number(k.DIA_FECHAMENTO) >= 1 && Number(k.DIA_VENCIMENTO) >= 1)) l.push({ grave: true, cartaoId: Cmp_s_(k.ID), texto: 'Cartão ' + r + ' sem dia de fechamento ou de vencimento.', fazer: 'Edite o cartão e informe os dois dias (estão na fatura). Sem eles, a fatura de cada parcela é estimada.' });
  });
  var usados = {};
  Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) {
    var f = Cmp_s_(x.CARTAO_FINAL);
    if (!f || Cmp_up_(x.SITUACAO) === 'CANCELADA' || CmpCart_porFinal_(f, cartoes)) return;
    usados[f] = usados[f] || { final: f, compras: {} }; usados[f].compras[Cmp_s_(x.REQUISICAO_ID)] = 1;
  });
  Object.keys(usados).sort().forEach(function (f) {
    var n = Object.keys(usados[f].compras).length;
    l.push({ grave: true, final: f, texto: 'Final ' + f + ' usado em ' + Cmp_plural_(n, 'compra', 'compras') + ', mas não está cadastrado.', fazer: 'Cadastre o cartão com este final: as compras já informadas se ligam a ele sozinhas e a fatura das parcelas é recalculada.' });
  });
  if (!CmpFin_idsFinanceiro_(us, []).length) l.push({ grave: false, texto: 'Ninguém com o perfil ou a área Financeiro no cadastro de usuários.', fazer: 'O Administrador escolhe quem é do Financeiro em Administração > Usuários. Até lá, a Diretoria faz a conciliação.' });
  return l;
}

function CmpCart_listar_(eu) {
  if (!CmpCart_podeVer_(eu)) Cmp_exigir_(eu, 'FINANCEIRO', 'ver os cartões da empresa');
  var us = Cmp_usuarios_();
  return { cartoes: CmpCart_lista_().map(CmpCart_paraTela_).sort(function (a, b) { return (b.ativo - a.ativo) || a.final.localeCompare(b.final); }), oQueFalta: CmpCart_oQueFalta_(),
    podeEditar: CmpCart_podeEditar_(eu), tipos: CMP_CARTAO_TIPOS,
    equipe: Object.keys(us).filter(function (id) { return us[id].ativo && !Cmp_ehContaSistema_(us[id]); }).map(function (id) { return { id: id, nome: us[id].nome }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }) };
}

/**
 * Cadastra ou edita um cartão. d: { id, final, apelido, tipo, responsavelId, diaFechamento, diaVencimento, limite, ativo, obs, motivo }.
 * Na edição, só os campos que vieram mudam (nunca sobrescreve sem juntar). Mudança de dia ou de final recalcula as parcelas abertas.
 */
function CmpCart_salvar_(eu, d) {
  if (!CmpCart_podeEditar_(eu)) throw new Error('Não foi possível salvar o cartão: o cadastro dos cartões é do Financeiro, da Diretoria e do Administrador. Peça a eles');
  d = d || {};
  var atual = Cmp_s_(d.id) ? SGO_DATA.getById(CMP_ABAS.CARTOES, Cmp_s_(d.id)) : null;
  if (Cmp_s_(d.id) && !atual) throw new Error('Não foi possível salvar: o cartão não foi encontrado. Atualize a lista');
  var tem = function (k) { return Object.prototype.hasOwnProperty.call(d, k) && d[k] !== undefined; };
  var novo = {};
  if (!atual || tem('final')) {
    var digs = Cmp_digitos_(d.final);
    if (Cmp_s_(d.final).replace(/[\s.\-*]/g, '').length > 4 || digs.length !== 4) throw new Error('Não foi possível salvar: digite só os 4 últimos números do cartão (nunca o número inteiro)');
    novo.FINAL = digs;
  }
  if (!atual || tem('apelido')) { novo.APELIDO = Cmp_texto_(d.apelido, 60); if (novo.APELIDO.length < 2) throw new Error('Não foi possível salvar: dê um apelido ao cartão (por exemplo "Cartão da Logística"), para todos reconhecerem'); }
  if (!atual || tem('tipo')) { novo.TIPO = Cmp_up_(d.tipo) || 'CREDITO'; if (!CMP_CARTAO_TIPOS[novo.TIPO]) throw new Error('Não foi possível salvar: escolha se o cartão é de crédito, débito ou os dois'); }
  if (tem('responsavelId')) {
    var us = Cmp_usuarios_(), rid = Cmp_s_(d.responsavelId);
    if (rid && (!us[rid] || !us[rid].ativo)) throw new Error('Não foi possível salvar: o responsável escolhido não está ativo no cadastro de usuários. Escolha outra pessoa');
    novo.RESPONSAVEL_ID = rid; novo.RESPONSAVEL_NOME = rid ? us[rid].nome : '';
  }
  ['diaFechamento', 'diaVencimento'].forEach(function (k) {
    if (!tem(k)) return;
    var col = k === 'diaFechamento' ? 'DIA_FECHAMENTO' : 'DIA_VENCIMENTO', v = Cmp_s_(d[k]);
    if (v === '') { novo[col] = ''; return; }
    var n = Cmp_num_(v);
    if (!(n >= 1 && n <= 31) || Math.round(n) !== n) throw new Error('Não foi possível salvar: o dia ' + (k === 'diaFechamento' ? 'do fechamento' : 'do vencimento') + ' precisa ser de 1 a 31 (está na fatura do cartão)');
    novo[col] = n;
  });
  if (tem('limite')) { var lv = Cmp_s_(d.limite); if (lv === '') novo.LIMITE = ''; else { var ln = Cmp_num_(lv); if (!(ln >= 0)) throw new Error('Não foi possível salvar: o limite precisa ser um valor em reais (por exemplo 5.000,00) ou ficar em branco'); novo.LIMITE = Cmp_r2_(ln); } }
  if (tem('obs')) novo.OBS = Cmp_texto_(d.obs, 500);
  if (tem('ativo')) novo.ATIVO = d.ativo === false || Cmp_up_(d.ativo) === 'NAO' ? 'NAO' : 'SIM';
  var motivo = Cmp_texto_(d.motivo, 500);
  if (atual && motivo.length < 5) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 5 letras). Fica no histórico do cartão');
  return Cmp_comTrava_(function () {
    var base = atual ? SGO_DATA.getById(CMP_ABAS.CARTOES, atual.ID) : {};
    var final = novo.FINAL || Cmp_s_(base.FINAL), ativo = (novo.ATIVO || base.ATIVO || 'SIM') !== 'NAO';
    if (ativo && CmpCart_lista_().some(function (k) { return k.ID !== base.ID && CmpCart_ativo_(k) && Cmp_s_(k.FINAL) === final; })) throw new Error('Não foi possível salvar: já existe cartão ativo com o final ' + final + '. Confira se é o mesmo cartão (edite o existente) ou desative o antigo');
    var agora = Cmp_agora_(), mud = [];
    Object.keys(novo).forEach(function (k) { if (Cmp_s_(base[k]) !== Cmp_s_(novo[k])) mud.push(k.toLowerCase().replace(/_/g, ' ') + ': ' + (Cmp_s_(base[k]) || '—') + ' → ' + (Cmp_s_(novo[k]) || '—')); });
    var k;
    if (atual) {
      if (!mud.length) return { cartao: CmpCart_paraTela_(base), religadas: 0, message: 'Nada mudou no cartão.' };
      SGO_DATA.update(CMP_ABAS.CARTOES, base.ID, Object.assign({}, novo, { ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora }));
      k = Object.assign({}, base, novo);
    } else {
      k = SGO_DATA.insert(CMP_ABAS.CARTOES, Object.assign({ RESPONSAVEL_ID: '', RESPONSAVEL_NOME: '', DIA_FECHAMENTO: '', DIA_VENCIMENTO: '', LIMITE: '', OBS: '', ATIVO: 'SIM' }, novo,
        { CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora }));
    }
    Cmp_historico_('CARTAO', k.ID, atual ? 'CARTAO_ALTERADO' : 'CARTAO_NOVO', eu, { texto: (atual ? 'Cartão ' + CmpCart_rotulo_(k) + ' alterado: ' + mud.join('; ') + '. Motivo: ' + motivo : 'Cartão ' + CmpCart_rotulo_(k) + ' cadastrado.') });
    var n = CmpCart_ativo_(k) ? CmpCart_religar_(k, eu) : 0;
    return { cartao: CmpCart_paraTela_(k), religadas: n, message: (atual ? 'Cartão alterado.' : 'Cartão cadastrado.') + (n ? ' ' + Cmp_plural_(n, 'parcela já informada foi ligada', 'parcelas já informadas foram ligadas') + ' a ele, com a fatura recalculada.' : '') };
  });
}

/**
 * Liga ao cartão as compras e parcelas com o mesmo final e recalcula a fatura das parcelas que ainda não foram conciliadas
 * (a parcela k vai para a fatura da compra + k-1 meses). Chamar dentro da trava. Devolve quantas parcelas mudaram.
 */
function CmpCart_religar_(k, eu) {
  var final = Cmp_s_(k.FINAL), agora = Cmp_agora_(), n = 0;
  Cmp_ler_(CMP_ABAS.PEDIDOS).forEach(function (p) { if (Cmp_s_(p.CARTAO_FINAL) === final && Cmp_s_(p.CARTAO_ID) !== Cmp_s_(k.ID)) SGO_DATA.update(CMP_ABAS.PEDIDOS, p.ID, { CARTAO_ID: k.ID }); });
  Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) {
    if (Cmp_s_(x.CARTAO_FINAL) !== final || ['A_CONCILIAR', 'NAO_ESTA_NA_FATURA'].indexOf(Cmp_up_(x.SITUACAO)) < 0 || Cmp_up_(x.FORMA) !== 'CARTAO_CREDITO') return;
    var fat = CmpI_faturaDe_(x.DATA_COMPRA, k), comp = CmpI_addMes_(fat.competencia, (Number(x.PARCELA) || 1) - 1);
    var c = { CARTAO_ID: k.ID, COMPETENCIA: comp, VENCIMENTO: fat.vencimento ? CmpI_diaNoMes_(comp, Number(fat.vencimento.slice(8, 10))) : '', ESTIMADA: fat.estimada ? 'SIM' : '', ATUALIZADO_POR_NOME: eu ? eu.nome : 'Compras', ATUALIZADO_EM: agora };
    if (Cmp_s_(x.CARTAO_ID) === c.CARTAO_ID && Cmp_s_(x.COMPETENCIA) === comp && Cmp_s_(x.ESTIMADA) === c.ESTIMADA) return;
    if (Cmp_s_(x.COMPETENCIA) !== comp) { c.SITUACAO = 'A_CONCILIAR'; Cmp_historico_('PARCELA', x.ID, 'FATURA_RECALCULADA', eu, { de: Cmp_s_(x.COMPETENCIA), para: comp, texto: 'Parcela ' + x.PARCELA + '/' + x.PARCELAS + ' de ' + Cmp_s_(x.REQUISICAO_NUMERO) + ': fatura recalculada pelo cadastro do cartão ' + CmpCart_rotulo_(k) + '.' }); }
    SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, c);
    n++;
  });
  return n;
}

// ------------------------------------------------------------
// FATURAS
// ------------------------------------------------------------
function CmpFat_faturas_() { return Cmp_ler_(CMP_ABAS.FATURAS); }
function CmpFat_achar_(final, comp) { return CmpFat_faturas_().filter(function (f) { return Cmp_s_(f.CARTAO_FINAL) === final && Cmp_s_(f.COMPETENCIA) === comp; })[0] || null; }
/** Fatura do final no mês (cria quando não existe; chamar dentro da trava para criar). */
function CmpFat_obter_(final, comp, criar) {
  var f = CmpFat_achar_(final, comp);
  if (f || !criar) return f;
  var k = CmpCart_porFinal_(final);
  return SGO_DATA.insert(CMP_ABAS.FATURAS, { CARTAO_FINAL: final, CARTAO_ID: k ? Cmp_s_(k.ID) : '', COMPETENCIA: comp, SITUACAO: 'ABERTA', TOTAL_EXTRATO: '', TOTAL_SISTEMA: '', ATUALIZADO_EM: Cmp_agora_() });
}
function CmpFat_fechada_(f) { return !!f && /^FECHADA/.test(Cmp_up_(f.SITUACAO)); }
function CmpFat_exigirFin_(eu, acao) {
  if (!(eu.financeiro || eu.diretoria || eu.admin || eu.gestao)) Cmp_exigir_(eu, 'FINANCEIRO', acao);
}
/** Parcelas de crédito do final num mês de fatura (sem as canceladas). */
function CmpFat_parcelasDe_(final, comp) {
  return Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) { return Cmp_up_(x.FORMA) === 'CARTAO_CREDITO' && Cmp_s_(x.CARTAO_FINAL) === final && Cmp_s_(x.COMPETENCIA) === comp && Cmp_up_(x.SITUACAO) !== 'CANCELADA'; });
}
function CmpFat_linhasDe_(faturaId) { return Cmp_ler_(CMP_ABAS.EXTRATO).filter(function (l) { return Cmp_s_(l.FATURA_ID) === Cmp_s_(faturaId); }); }

function CmpFat_linhaParaTela_(l, reqs) {
  var s = Cmp_up_(l.SITUACAO);
  return { id: Cmp_s_(l.ID), linha: Number(l.LINHA) || 0, data: Cmp_brDia_(l.DATA), dataIso: Cmp_dia_(l.DATA), descricao: Cmp_s_(l.DESCRICAO), valor: Number(l.VALOR) || 0, valorTxt: Cmp_moeda_(l.VALOR),
    parcela: Number(l.PARCELA) || 0, parcelas: Number(l.PARCELAS) || 0, final: Cmp_s_(l.CARTAO_FINAL), situacao: s, situacaoNome: CMP_EXT_SIT[s] || s, motivo: Cmp_s_(l.MOTIVO),
    parcelaId: Cmp_s_(l.PARCELA_ID), cobradoEm: Cmp_br_(l.COBRADO_EM), importadaEm: Cmp_br_(l.CRIADO_EM) };
}

/** Situação de um mês de fatura (tela da conciliação). d: { final, competencia } */
function CmpFat_tela_(eu, d) {
  CmpFat_exigirFin_(eu, 'ver a conciliação das faturas');
  d = d || {};
  var final = Cmp_digitos_(d.final), comp = /^\d{4}-\d{2}$/.test(Cmp_s_(d.competencia)) ? Cmp_s_(d.competencia) : CmpI_addMes_(Cmp_hoje_().slice(0, 7), 0);
  var cartoes = CmpCart_lista_();
  // finais conhecidos: cartões cadastrados e finais usados em compras
  var finais = {};
  cartoes.forEach(function (k) { finais[Cmp_s_(k.FINAL)] = { final: Cmp_s_(k.FINAL), rotulo: CmpCart_rotulo_(k), ativo: CmpCart_ativo_(k), cadastrado: true }; });
  Cmp_ler_(CMP_ABAS.PARCELAS).forEach(function (x) { var f = Cmp_s_(x.CARTAO_FINAL); if (f && Cmp_up_(x.FORMA) === 'CARTAO_CREDITO' && !finais[f]) finais[f] = { final: f, rotulo: CmpCart_rotulo_(null, f), ativo: true, cadastrado: false }; });
  var lista = Object.keys(finais).map(function (k) { return finais[k]; }).sort(function (a, b) { return (b.ativo - a.ativo) || a.final.localeCompare(b.final); });
  var base = { finais: lista, competencia: comp, competenciaNome: CmpI_competenciaNome_(comp), final: final, podeAgir: true, situacoesLinha: CMP_EXT_SIT, situacoesParcela: CMP_PARC_SIT };
  if (!final) return base;
  var k = CmpCart_porFinal_(final, cartoes), fat = CmpFat_achar_(final, comp);
  var reqs = {}, peds = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { reqs[Cmp_s_(r.ID)] = r; });
  Cmp_ler_(CMP_ABAS.PEDIDOS).forEach(function (p) { peds[Cmp_s_(p.ID)] = p; });
  var parcelas = CmpFat_parcelasDe_(final, comp).map(function (x) {
    var t = CmpI_parcelaParaTela_(x, true), r = reqs[Cmp_s_(x.REQUISICAO_ID)] || {}, p = peds[Cmp_s_(x.PEDIDO_ID)] || {};
    t.titulo = Cmp_s_(r.TITULO).slice(0, 80); t.quem = Cmp_s_(r.COMPRADO_POR_NOME || r.SOLICITANTE_NOME); t.fornecedor = Cmp_s_(p.FORNECEDOR_NOME); t.vinculo = CmpR_vinculoTexto_(r);
    t.comprovanteUrl = Cmp_s_(p.COMPROVANTE_URL); t.extratoId = Cmp_s_(x.EXTRATO_ID); t.minha = Cmp_s_(r.COMPRADO_POR_ID || r.SOLICITANTE_ID) === eu.id;
    return t;
  }).sort(function (a, b) { return String(a.dataCompra.split('/').reverse().join('')).localeCompare(b.dataCompra.split('/').reverse().join('')); });
  var linhas = fat ? CmpFat_linhasDe_(fat.ID).map(function (l) { return CmpFat_linhaParaTela_(l, reqs); }).sort(function (a, b) { return a.linha - b.linha; }) : [];
  var soma = function (l, f) { return Cmp_r2_(l.filter(f || function () { return true; }).reduce(function (s, x) { return s + (Number(x.valor) || 0); }, 0)); };
  var conta = function (l, s) { return l.filter(function (x) { return x.situacao === s; }).length; };
  var totExt = soma(linhas, function (x) { return x.situacao !== 'IGNORADA'; }), totSis = soma(parcelas);
  var imps = fat ? Cmp_ler_(CMP_ABAS.IMPORTACOES).filter(function (i) { return Cmp_s_(i.FATURA_ID) === Cmp_s_(fat.ID); }).sort(function (a, b) { return String(b.EM).localeCompare(String(a.EM)); })
    .map(function (i) { return { arquivo: Cmp_s_(i.ARQUIVO_NOME), url: Cmp_s_(i.ARQUIVO_URL), formato: Cmp_s_(i.FORMATO), linhas: Number(i.LINHAS) || 0, gravadas: Number(i.GRAVADAS) || 0, casadas: Number(i.CASADAS) || 0, naoInformadas: Number(i.NAO_INFORMADAS) || 0, por: Cmp_s_(i.POR_NOME), em: Cmp_br_(i.EM) }; }) : [];
  var abertos = conta(linhas, 'NAO_INFORMADA') + parcelas.filter(function (x) { return ['NAO_ESTA_NA_FATURA', 'DIVERGENTE'].indexOf(x.situacao) >= 0 || (x.situacao === 'A_CONCILIAR' && linhas.length); }).length;
  return Object.assign(base, { cartao: k ? CmpCart_paraTela_(k) : null, cartaoRotulo: CmpCart_rotulo_(k, final),
    fatura: fat ? { id: Cmp_s_(fat.ID), situacao: Cmp_up_(fat.SITUACAO), situacaoNome: CMP_FAT_SIT[Cmp_up_(fat.SITUACAO)] || '', fechada: CmpFat_fechada_(fat), fechadaPor: Cmp_s_(fat.FECHADA_POR_NOME), fechadaEm: Cmp_br_(fat.FECHADA_EM), obs: Cmp_s_(fat.FECHAMENTO_OBS) } : null,
    vencimento: k ? CmpI_diaNoMes_(comp, Number(k.DIA_VENCIMENTO) || 10).split('-').reverse().join('/') : '',
    parcelas: parcelas, linhas: linhas, importacoes: imps,
    resumo: { totalExtratoTxt: Cmp_moeda_(totExt), totalSistemaTxt: Cmp_moeda_(totSis), diferencaTxt: Cmp_moeda_(Cmp_r2_(totExt - totSis)), diferenca: Math.abs(totExt - totSis) > 0.009 && linhas.length > 0,
      linhas: linhas.length, conciliadas: conta(linhas, 'CONCILIADA'), naoInformadas: conta(linhas, 'NAO_INFORMADA'), justificadas: conta(linhas, 'JUSTIFICADA'), ignoradas: conta(linhas, 'IGNORADA'),
      parcelas: parcelas.length, parcelasConciliadas: conta(parcelas, 'CONCILIADA'), foraDaFatura: conta(parcelas, 'NAO_ESTA_NA_FATURA'), divergentes: conta(parcelas, 'DIVERGENTE'), aConciliar: conta(parcelas, 'A_CONCILIAR'),
      estimadas: parcelas.filter(function (x) { return x.estimada; }).length, abertos: abertos } });
}

// ------------------------------------------------------------
// LEITURA DO EXTRATO (CSV, Excel, OFX) — colunas pelo nome
// ------------------------------------------------------------
function CmpFat_sem_(v) { return Cmp_up_(v).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
/** OFX (SGML ou XML): cada <STMTTRN> vira [data, descrição, valor]. Compra no OFX vem negativa; aqui vira positiva. */
function CmpFat_lerOfx_(texto) {
  var t = String(texto || ''), m, re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi, linhas = [['DATA', 'DESCRICAO', 'VALOR', 'ID']];
  var tag = function (b, n) { var x = new RegExp('<' + n + '>([^<\\r\\n]*)', 'i').exec(b); return x ? x[1].trim() : ''; };
  while ((m = re.exec(t))) {
    var b = m[1], dt = tag(b, 'DTPOSTED') || tag(b, 'DTUSER'), v = Cmp_num_(tag(b, 'TRNAMT'));
    var dm = /^(\d{4})(\d{2})(\d{2})/.exec(dt);
    linhas.push([dm ? dm[3] + '/' + dm[2] + '/' + dm[1] : '', (tag(b, 'MEMO') || tag(b, 'NAME')).replace(/\s+/g, ' '), isNaN(v) ? '' : String(-v).replace('.', ','), tag(b, 'FITID')]);
  }
  if (linhas.length < 2) throw new Error('Não encontrei lançamentos no arquivo OFX. Exporte de novo pelo banco (fatura do cartão, formato OFX) e importe. Nada foi gravado');
  return linhas;
}
/** Matriz do arquivo: OFX (texto), CSV (texto) ou Excel (.xlsx em base64, pela leitura da Frota). */
function CmpFat_matriz_(d) {
  var nome = Cmp_s_(d.nomeArquivo), txt = Cmp_s_(d.texto);
  if (!txt && d.base64 && !/\.xlsx$/i.test(nome)) { try { txt = Utilities.newBlob(Utilities.base64Decode(String(d.base64).replace(/^data:[^,]+,/, ''))).getDataAsString(); } catch (e) { txt = ''; } }
  if (/\.(ofx|qfx)$/i.test(nome) || /<OFX>|<STMTTRN>/i.test(txt.slice(0, 5000))) return { formato: 'OFX', matriz: CmpFat_lerOfx_(txt) };
  if (txt) {
    if (typeof FrotaGas_lerCsv_ !== 'function') throw new Error('Não foi possível ler o CSV: a leitura de planilhas não está disponível neste servidor. Avise o administrador');
    return { formato: 'CSV', matriz: FrotaGas_lerCsv_(txt) };
  }
  if (!d.base64) throw new Error('Não foi possível importar: escolha o arquivo do extrato da fatura (CSV, Excel .xlsx ou OFX, como o banco exporta). Nada foi gravado');
  if (/\.xls$/i.test(nome)) throw new Error('Não foi possível importar: o arquivo ' + nome + ' é do Excel antigo (.xls). Abra no Excel e salve como .xlsx ou CSV, depois importe de novo. Nada foi gravado');
  if (typeof FrotaGas_matrizDoArquivo_ !== 'function') throw new Error('Não foi possível ler o Excel neste servidor. Exporte a fatura em CSV ou OFX e importe de novo. Nada foi gravado');
  return { formato: 'XLSX', matriz: FrotaGas_matrizDoArquivo_({ base64: String(d.base64).replace(/^data:[^,]+,/, ''), nomeArquivo: nome, mimeType: d.mimeType }) };
}
/** "02/03", "PARC 02/03", "2 de 3" -> { k, n }. */
function CmpFat_parcelaDe_(t) {
  var m = /(?:PARC(?:ELA)?\.?\s*)?\b(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/i.exec(CmpFat_sem_(t));
  if (!m) return null;
  var k = Number(m[1]), n = Number(m[2]);
  return k >= 1 && n >= 2 && k <= n && n <= 48 ? { k: k, n: n } : null;
}
/** Data da célula; sem ano ("05/10"), o ano vem do mês da fatura (mês depois do da fatura = ano anterior). */
function CmpFat_data_(v, comp) {
  if (typeof v === 'number' && typeof FrotaGas_dataHoraCelula_ === 'function') { var x = FrotaGas_dataHoraCelula_(v); return x ? Cmp_dia_(x.data) : ''; }
  var s = Cmp_s_(v), m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(s);
  if (m) {
    var ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : '';
    if (!ano) { var ca = Number(comp.slice(0, 4)), cm = Number(comp.slice(5, 7)); ano = String(Number(m[2]) > cm ? ca - 1 : ca); }
    return ano + '-' + Cmp_2_(Number(m[2])) + '-' + Cmp_2_(Number(m[1]));
  }
  return Cmp_dia_(s);
}
/**
 * Acha o cabeçalho (data + valor) e lê as linhas. Devolve { linhas:[{linha, data, descricao, valor, k, n, final, chave}], ignoradas:[{linha, motivo}] }.
 */
function CmpFat_lerLinhas_(matriz, comp, finalPadrao) {
  var cab = -1, col = {};
  for (var i = 0; i < Math.min(matriz.length, 30) && cab < 0; i++) {
    var nomes = (matriz[i] || []).map(CmpFat_sem_);
    var iData = nomes.findIndex(function (n) { return /DATA|^DT\b/.test(n) && !/VENC|FECHAM|PROCESS|PAGAM/.test(n); });
    var iValor = nomes.findIndex(function (n) { return /VALOR|QUANTIA|MONTANTE|^R\$/.test(n) && !/DOLAR|USD|US\$|SALDO|LIMITE|COTAC/.test(n); });
    if (iData < 0 || iValor < 0) continue;
    cab = i; col.data = iData; col.valor = iValor;
    col.desc = nomes.findIndex(function (n) { return /DESCRI|ESTABELEC|LANCAMENTO|HISTORIC|LOJA|COMERCIO|MEMO|NOME/.test(n); });
    col.parcela = nomes.findIndex(function (n) { return /PARCELA|PRESTAC/.test(n); });
    col.final = nomes.findIndex(function (n) { return /FINAL|CARTAO/.test(n) && !/VALOR/.test(n); });
    col.id = nomes.findIndex(function (n) { return /^ID$|IDENTIFICA|AUTORIZ|FITID/.test(n); });
  }
  if (cab < 0) throw new Error('Não encontrei no arquivo a linha de títulos com a data e o valor dos lançamentos. Exporte a fatura do cartão pelo banco (CSV, Excel ou OFX) sem mudar as colunas e importe de novo. Nada foi gravado');
  var linhas = [], ignoradas = [], vistas = {};
  for (var j = cab + 1; j < matriz.length; j++) {
    var r = matriz[j] || [], n = j + 1;
    var bruto = r[col.valor], desc = col.desc >= 0 ? Cmp_s_(r[col.desc]).replace(/\s+/g, ' ').slice(0, 200) : '';
    if (!r.some(function (c) { return Cmp_s_(c) !== ''; })) continue;
    var dia = CmpFat_data_(r[col.data], comp);
    if (!dia) { ignoradas.push({ linha: n, motivo: 'sem data (linha de total, título ou observação)' }); continue; }
    var sb = Cmp_s_(bruto).replace(/\s/g, ''), neg = /^\(.*\)$/.test(sb) || /-$/.test(sb);
    var valor = typeof bruto === 'number' ? bruto : Cmp_num_(sb.replace(/^\((.*)\)$/, '$1').replace(/-$/, ''));
    if (neg && valor > 0) valor = -valor;
    if (!isFinite(valor) || isNaN(valor) || valor === 0) { ignoradas.push({ linha: n, motivo: 'valor ilegível (' + Cmp_s_(bruto) + ')' }); continue; }
    var sd = CmpFat_sem_(desc);
    if (/PAGAMENTO\s+(DE\s+)?FATURA|PAGTO\s+FATURA|PAGAMENTO\s+RECEBIDO|SALDO\s+ANTERIOR|TOTAL\s+DA\s+FATURA/.test(sd)) { ignoradas.push({ linha: n, motivo: 'pagamento ou saldo da fatura (não é compra)' }); continue; }
    if (valor < 0) { ignoradas.push({ linha: n, motivo: 'estorno ou crédito (' + Cmp_moeda_(valor) + '): não é compra' }); continue; }
    var pc = CmpFat_parcelaDe_(col.parcela >= 0 ? Cmp_s_(r[col.parcela]) : '') || CmpFat_parcelaDe_(desc);
    var fim = col.final >= 0 ? Cmp_digitos_(r[col.final]).slice(-4) : '';
    if (fim.length !== 4) fim = finalPadrao;
    var chave = [fim, comp, dia, Cmp_r2_(valor).toFixed(2), pc ? pc.k + '/' + pc.n : '', CmpFat_sem_(desc).replace(/[^A-Z0-9]/g, '').slice(0, 40), col.id >= 0 ? Cmp_s_(r[col.id]) : ''].join('|');
    if (vistas[chave]) { chave += '|' + (++vistas[chave]); } else vistas[chave] = 1;
    linhas.push({ linha: n, data: dia, descricao: desc, valor: Cmp_r2_(valor), k: pc ? pc.k : 0, n: pc ? pc.n : 0, final: fim, chave: chave });
  }
  return { linhas: linhas, ignoradas: ignoradas };
}

/** Melhor parcela livre para uma linha: mesmo final, valor (até R$ 0,05), data até 3 dias, mesma parcela quando o extrato traz. */
function CmpFat_melhorParcela_(l, livres, comp) {
  var cands = livres.filter(function (x) {
    if (Cmp_s_(x.CARTAO_FINAL) !== l.final || Math.abs((Number(x.VALOR) || 0) - l.valor) > CMP_TOL_VALOR) return false;
    if (l.n && (Number(x.PARCELA) !== l.k || Number(x.PARCELAS) !== l.n)) return false;
    var dd = Math.abs(Cmp_diasEntre_(Cmp_dia_(x.DATA_COMPRA), l.data));
    var cc = Math.abs(Cmp_diasEntre_(Cmp_s_(x.COMPETENCIA) + '-01', comp + '-01'));
    return dd <= CMP_TOL_DIAS && cc <= 62 || (l.n > 1 && Cmp_s_(x.COMPETENCIA) === comp && dd <= 31 * l.n);
  });
  cands.sort(function (a, b) {
    var ca = Cmp_s_(a.COMPETENCIA) === comp ? 0 : 1, cb = Cmp_s_(b.COMPETENCIA) === comp ? 0 : 1;
    return ca - cb || Math.abs(Cmp_diasEntre_(Cmp_dia_(a.DATA_COMPRA), l.data)) - Math.abs(Cmp_diasEntre_(Cmp_dia_(b.DATA_COMPRA), l.data)) || Math.abs(a.VALOR - l.valor) - Math.abs(b.VALOR - l.valor);
  });
  return cands[0] || null;
}
/** Parcelas que ainda podem casar: crédito, sem lançamento, A conciliar / Não está na fatura. */
function CmpFat_livres_() {
  return Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) { return Cmp_up_(x.FORMA) === 'CARTAO_CREDITO' && !Cmp_s_(x.EXTRATO_ID) && ['A_CONCILIAR', 'NAO_ESTA_NA_FATURA'].indexOf(Cmp_up_(x.SITUACAO)) >= 0; });
}

/** Casa uma linha com uma parcela (dentro da trava). A parcela vai para o mês da fatura da linha. */
function CmpFat_casarLinha_(l, x, eu, motivo) {
  var agora = Cmp_agora_(), fat = SGO_DATA.getById(CMP_ABAS.FATURAS, Cmp_s_(l.FATURA_ID)) || {}, comp = Cmp_s_(fat.COMPETENCIA) || Cmp_s_(x.COMPETENCIA);
  SGO_DATA.update(CMP_ABAS.EXTRATO, l.ID, { SITUACAO: 'CONCILIADA', PARCELA_ID: x.ID, MOTIVO: Cmp_texto_(motivo, 500), ATUALIZADO_POR_NOME: eu ? eu.nome : 'Compras', ATUALIZADO_EM: agora });
  var c = { SITUACAO: 'CONCILIADA', EXTRATO_ID: l.ID, MOTIVO: Cmp_texto_(motivo, 500), ATUALIZADO_POR_NOME: eu ? eu.nome : 'Compras', ATUALIZADO_EM: agora };
  if (comp && comp !== Cmp_s_(x.COMPETENCIA)) { c.COMPETENCIA = comp; c.ESTIMADA = ''; }
  SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, c);
  Cmp_historico_('PARCELA', x.ID, 'CONCILIADA', eu, { de: CMP_PARC_SIT[Cmp_up_(x.SITUACAO)] || '', para: 'Conciliada', texto: 'Parcela ' + x.PARCELA + '/' + x.PARCELAS + ' de ' + Cmp_s_(x.REQUISICAO_NUMERO) + ' conciliada com o lançamento de ' + Cmp_brDia_(l.DATA) + ' (' + Cmp_s_(l.DESCRICAO).slice(0, 60) + ') da fatura ' + comp + '.' + (motivo ? ' ' + motivo : '') });
}

/** Casamento automático das linhas "Não informada" da fatura; depois marca as parcelas do mês sem lançamento como "Não está na fatura". */
function CmpFat_casarFatura_(fat, eu) {
  var comp = Cmp_s_(fat.COMPETENCIA), livres = CmpFat_livres_(), casadas = 0;
  CmpFat_linhasDe_(fat.ID).filter(function (l) { return Cmp_up_(l.SITUACAO) === 'NAO_INFORMADA'; }).sort(function (a, b) { return (Number(a.LINHA) || 0) - (Number(b.LINHA) || 0); }).forEach(function (l) {
    var x = CmpFat_melhorParcela_({ final: Cmp_s_(l.CARTAO_FINAL), valor: Number(l.VALOR) || 0, data: Cmp_dia_(l.DATA), k: Number(l.PARCELA) || 0, n: Number(l.PARCELAS) || 0 }, livres, comp);
    if (!x) return;
    CmpFat_casarLinha_(l, x, eu, 'Casamento automático (valor, data e parcela).');
    livres = livres.filter(function (y) { return y.ID !== x.ID; });
    casadas++;
  });
  var finais = {};
  CmpFat_linhasDe_(fat.ID).forEach(function (l) { finais[Cmp_s_(l.CARTAO_FINAL)] = 1; });
  finais[Cmp_s_(fat.CARTAO_FINAL)] = 1;
  var agora = Cmp_agora_();
  Object.keys(finais).forEach(function (f) {
    CmpFat_parcelasDe_(f, comp).forEach(function (x) {
      if (Cmp_up_(x.SITUACAO) !== 'A_CONCILIAR' || Cmp_s_(x.EXTRATO_ID)) return;
      SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, { SITUACAO: 'NAO_ESTA_NA_FATURA', ATUALIZADO_POR_NOME: eu ? eu.nome : 'Compras', ATUALIZADO_EM: agora });
    });
  });
  return casadas;
}

/**
 * Importa o extrato. d: { final, competencia, texto | base64, nomeArquivo, mimeType, confirmar }.
 * Sem confirmar: prévia (nada é gravado), com a simulação do casamento.
 */
function CmpFat_importar_(eu, d) {
  CmpFat_exigirFin_(eu, 'importar o extrato da fatura');
  d = d || {};
  var final = Cmp_digitos_(d.final), comp = Cmp_s_(d.competencia);
  if (final.length !== 4) throw new Error('Não foi possível importar: escolha o cartão (final) da fatura antes de importar');
  if (!/^\d{4}-\d{2}$/.test(comp)) throw new Error('Não foi possível importar: escolha o mês da fatura (mês do vencimento)');
  var fat0 = CmpFat_achar_(final, comp);
  if (CmpFat_fechada_(fat0)) throw new Error('Não foi possível importar: a fatura ' + CmpI_competenciaNome_(comp) + ' do ' + CmpCart_rotulo_(CmpCart_porFinal_(final), final) + ' já foi fechada. Para mudar, a Diretoria reabre com o motivo');
  var lido = CmpFat_matriz_(d), r = CmpFat_lerLinhas_(lido.matriz, comp, final);
  var ja = {};
  Cmp_ler_(CMP_ABAS.EXTRATO).forEach(function (l) { ja[Cmp_s_(l.CHAVE)] = 1; });
  var novas = r.linhas.filter(function (l) { return !ja[l.chave]; }), repetidas = r.linhas.length - novas.length;
  var livres = CmpFat_livres_(), simul = novas.map(function (l) {
    var x = CmpFat_melhorParcela_(l, livres, comp);
    if (x) livres = livres.filter(function (y) { return y.ID !== x.ID; });
    return { linha: l.linha, data: Cmp_brDia_(l.data), descricao: l.descricao, valorTxt: Cmp_moeda_(l.valor), parcela: l.n ? l.k + '/' + l.n : '', final: l.final, casa: x ? Cmp_s_(x.REQUISICAO_NUMERO) + ' (parcela ' + x.PARCELA + '/' + x.PARCELAS + ')' : '' };
  });
  var casam = simul.filter(function (s) { return s.casa; }).length;
  var resumo = 'Arquivo ' + lido.formato + ' com ' + Cmp_plural_(r.linhas.length, 'lançamento lido', 'lançamentos lidos') + ': ' + casam + ' casam com compras informadas, ' + (novas.length - casam) + ' sem compra informada (viram cobrança ao responsável do cartão), ' +
    repetidas + ' já importados antes' + (r.ignoradas.length ? '; ' + r.ignoradas.length + ' linhas ignoradas (pagamento, estorno, total ou ilegível)' : '') + '.';
  if (d.confirmar !== true) return { previa: true, resumo: resumo, linhas: simul.slice(0, 400), ignoradas: r.ignoradas.slice(0, 100), repetidas: repetidas };
  if (!novas.length) return { gravadas: 0, resumo: resumo, message: 'Nada a gravar: ' + resumo };
  return Cmp_comTrava_(function () {
    var fat = CmpFat_obter_(final, comp, true), agora = Cmp_agora_();
    var arq = null;
    if (d.base64 || d.texto) {
      var b64 = d.base64 ? String(d.base64).replace(/^data:[^,]+,/, '') : Utilities.base64Encode(Utilities.newBlob(String(d.texto)).getBytes());
      try { arq = Cmp_salvarArquivo_({ nome: Cmp_s_(d.nomeArquivo) || ('fatura-' + final + '-' + comp + '.' + lido.formato.toLowerCase()), tipo: d.mimeType || 'text/plain', base64: b64 }, 'Faturas ' + final, 'Extrato ' + comp, CMP_RX_EXTRATO, 'do extrato'); } catch (eA) { arq = null; }
    }
    var imp = SGO_DATA.insert(CMP_ABAS.IMPORTACOES, { FATURA_ID: fat.ID, ARQUIVO_NOME: Cmp_texto_(d.nomeArquivo, 200), ARQUIVO_ID: arq ? arq.id : '', ARQUIVO_URL: arq ? arq.url : '', FORMATO: lido.formato, LINHAS: r.linhas.length,
      GRAVADAS: novas.length, REPETIDAS: repetidas, IGNORADAS: r.ignoradas.length, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora });
    var regs = novas.map(function (l) { return { FATURA_ID: fat.ID, IMPORTACAO_ID: imp.ID, LINHA: l.linha, DATA: l.data, DESCRICAO: l.descricao, VALOR: l.valor, PARCELA: l.k || '', PARCELAS: l.n || '', CARTAO_FINAL: l.final, CHAVE: l.chave,
      PARCELA_ID: '', SITUACAO: 'NAO_INFORMADA', MOTIVO: '', COBRADO_EM: '', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora }; });
    if (typeof SGO_DATA.insertMany === 'function') SGO_DATA.insertMany(CMP_ABAS.EXTRATO, regs); else regs.forEach(function (x) { SGO_DATA.insert(CMP_ABAS.EXTRATO, x); });
    var casadas = CmpFat_casarFatura_(fat, eu);
    var nao = CmpFat_linhasDe_(fat.ID).filter(function (l) { return Cmp_up_(l.SITUACAO) === 'NAO_INFORMADA'; }).length;
    SGO_DATA.update(CMP_ABAS.IMPORTACOES, imp.ID, { CASADAS: casadas, NAO_INFORMADAS: nao });
    SGO_DATA.update(CMP_ABAS.FATURAS, fat.ID, { ATUALIZADO_EM: agora });
    Cmp_historico_('FATURA', fat.ID, 'EXTRATO_IMPORTADO', eu, { texto: 'Extrato ' + Cmp_s_(d.nomeArquivo) + ' importado: ' + novas.length + ' lançamentos gravados, ' + casadas + ' conciliados na hora, ' + nao + ' sem compra informada. ' + resumo });
    return { gravadas: novas.length, casadas: casadas, naoInformadas: nao, resumo: resumo,
      message: Cmp_plural_(novas.length, 'lançamento gravado', 'lançamentos gravados') + ': ' + casadas + ' conciliados na hora' + (nao ? '; ' + Cmp_plural_(nao, 'lançamento sem compra informada virou cobrança', 'lançamentos sem compra informada viraram cobrança') + ' ao responsável do cartão' : '') + '.' };
  });
}

/**
 * Ações da conciliação, sempre com motivo (15 letras) e trilha. d: { acao, extratoId, parcelaId, motivo }
 *  casar (linha + parcela), descasar (linha conciliada), justificar (linha não informada: assinatura, tarifa...), reabrirLinha,
 *  proxima (parcela não está na fatura -> fatura seguinte), divergente (parcela), voltarParcela (divergente -> a conciliar).
 */
function CmpFat_acao_(eu, d) {
  CmpFat_exigirFin_(eu, 'mudar a conciliação');
  d = d || {};
  var acao = Cmp_s_(d.acao), motivo = Cmp_texto_(d.motivo, 500);
  if (motivo.length < 15) throw new Error('Não foi possível registrar: escreva o motivo (pelo menos 15 letras), por exemplo "valor da fatura inclui o frete cobrado depois". Fica na trilha da conciliação');
  return Cmp_comTrava_(function () {
    var l = Cmp_s_(d.extratoId) ? SGO_DATA.getById(CMP_ABAS.EXTRATO, Cmp_s_(d.extratoId)) : null, x = Cmp_s_(d.parcelaId) ? SGO_DATA.getById(CMP_ABAS.PARCELAS, Cmp_s_(d.parcelaId)) : null;
    var fat = l ? SGO_DATA.getById(CMP_ABAS.FATURAS, Cmp_s_(l.FATURA_ID)) : (x ? CmpFat_achar_(Cmp_s_(x.CARTAO_FINAL), Cmp_s_(x.COMPETENCIA)) : null);
    if (CmpFat_fechada_(fat)) throw new Error('Não foi possível mudar: a fatura já foi fechada. Para mudar, a Diretoria reabre com o motivo');
    if (x) {
      var r = SGO_DATA.getById(CMP_ABAS.REQUISICOES, Cmp_s_(x.REQUISICAO_ID)) || {};
      if (Cmp_s_(r.COMPRADO_POR_ID || r.SOLICITANTE_ID) === eu.id || Cmp_s_(r.CRIADO_POR_ID) === eu.id) throw new Error('Não foi possível mudar: a compra ' + Cmp_s_(r.NUMERO) + ' é sua. Quem comprou ou informou não concilia a própria compra; outra pessoa do Financeiro (ou a Diretoria) faz');
    }
    var agora = Cmp_agora_(), up = { ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    var hl = function (tipo, de, para, texto) { Cmp_historico_('EXTRATO', l.ID, tipo, eu, { de: de, para: para, texto: texto + ' Motivo: ' + motivo }); };
    var hp = function (tipo, de, para, texto) { Cmp_historico_('PARCELA', x.ID, tipo, eu, { de: de, para: para, texto: texto + ' Motivo: ' + motivo }); };
    if (acao === 'casar') {
      if (!l || !x) throw new Error('Não foi possível casar: escolha o lançamento da fatura e a parcela da compra');
      if (Cmp_up_(l.SITUACAO) !== 'NAO_INFORMADA') throw new Error('Não foi possível casar: o lançamento já está "' + (CMP_EXT_SIT[Cmp_up_(l.SITUACAO)] || '') + '". Desfaça antes');
      if (Cmp_s_(x.EXTRATO_ID) || ['A_CONCILIAR', 'NAO_ESTA_NA_FATURA', 'DIVERGENTE'].indexOf(Cmp_up_(x.SITUACAO)) < 0) throw new Error('Não foi possível casar: a parcela já está conciliada ou paga');
      CmpFat_casarLinha_(l, x, eu, 'Casamento manual por ' + eu.nome + ': ' + motivo);
      return { message: 'Lançamento e parcela conciliados.' };
    }
    if (acao === 'descasar') {
      if (!l || Cmp_up_(l.SITUACAO) !== 'CONCILIADA') throw new Error('Não foi possível desfazer: o lançamento não está conciliado');
      var xp = SGO_DATA.getById(CMP_ABAS.PARCELAS, Cmp_s_(l.PARCELA_ID));
      SGO_DATA.update(CMP_ABAS.EXTRATO, l.ID, Object.assign({ SITUACAO: 'NAO_INFORMADA', PARCELA_ID: '', MOTIVO: motivo }, up));
      if (xp) { SGO_DATA.update(CMP_ABAS.PARCELAS, xp.ID, Object.assign({ SITUACAO: 'A_CONCILIAR', EXTRATO_ID: '', MOTIVO: motivo }, up)); Cmp_historico_('PARCELA', xp.ID, 'DESCONCILIADA', eu, { de: 'Conciliada', para: 'A conciliar', texto: 'Conciliação desfeita. Motivo: ' + motivo }); }
      hl('DESCONCILIADA', 'Conciliada', 'Não informada', 'Conciliação desfeita.');
      return { message: 'Conciliação desfeita: o lançamento voltou a "Não informada".' };
    }
    if (acao === 'justificar') {
      if (!l || Cmp_up_(l.SITUACAO) !== 'NAO_INFORMADA') throw new Error('Não foi possível justificar: o lançamento não está "Não informada"');
      SGO_DATA.update(CMP_ABAS.EXTRATO, l.ID, Object.assign({ SITUACAO: 'JUSTIFICADA', MOTIVO: motivo }, up));
      hl('JUSTIFICADA', 'Não informada', 'Justificada', 'Lançamento de ' + Cmp_brDia_(l.DATA) + ' (' + Cmp_s_(l.DESCRICAO).slice(0, 60) + ') justificado sem compra informada.');
      return { message: 'Lançamento justificado. A cobrança ao responsável do cartão foi encerrada.' };
    }
    if (acao === 'reabrirLinha') {
      if (!l || Cmp_up_(l.SITUACAO) !== 'JUSTIFICADA') throw new Error('Não foi possível reabrir: o lançamento não está justificado');
      SGO_DATA.update(CMP_ABAS.EXTRATO, l.ID, Object.assign({ SITUACAO: 'NAO_INFORMADA', MOTIVO: motivo }, up));
      hl('REABERTA', 'Justificada', 'Não informada', 'Justificativa desfeita.');
      return { message: 'Lançamento reaberto: volta a cobrar o responsável do cartão.' };
    }
    if (!x) throw new Error('Não foi possível registrar: escolha a parcela da compra');
    var sx = Cmp_up_(x.SITUACAO);
    if (acao === 'proxima') {
      if (['NAO_ESTA_NA_FATURA', 'A_CONCILIAR', 'DIVERGENTE'].indexOf(sx) < 0 || Cmp_s_(x.EXTRATO_ID)) throw new Error('Não foi possível passar: a parcela já foi conciliada ou paga');
      var prox = CmpI_addMes_(Cmp_s_(x.COMPETENCIA), 1);
      SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, Object.assign({ SITUACAO: 'A_CONCILIAR', COMPETENCIA: prox, MOTIVO: motivo }, up));
      hp('PROXIMA_FATURA', Cmp_s_(x.COMPETENCIA), prox, 'Parcela ' + x.PARCELA + '/' + x.PARCELAS + ' de ' + Cmp_s_(x.REQUISICAO_NUMERO) + ' passada para a fatura de ' + CmpI_competenciaNome_(prox) + '.');
      return { message: 'Parcela passada para a fatura de ' + CmpI_competenciaNome_(prox) + '.' };
    }
    if (acao === 'divergente') {
      if (['NAO_ESTA_NA_FATURA', 'A_CONCILIAR'].indexOf(sx) < 0) throw new Error('Não foi possível marcar: a parcela está "' + (CMP_PARC_SIT[sx] || sx) + '"');
      SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, Object.assign({ SITUACAO: 'DIVERGENTE', MOTIVO: motivo }, up));
      hp('DIVERGENTE', CMP_PARC_SIT[sx], 'Divergente', 'Parcela ' + x.PARCELA + '/' + x.PARCELAS + ' de ' + Cmp_s_(x.REQUISICAO_NUMERO) + ' divergente.');
      var r2 = SGO_DATA.getById(CMP_ABAS.REQUISICOES, Cmp_s_(x.REQUISICAO_ID)) || {};
      Cmp_avisar_(Cmp_s_(r2.COMPRADO_POR_ID || r2.SOLICITANTE_ID), 'DIVERGENCIA_FIN', 'Divergência na fatura do cartão: ' + Cmp_s_(r2.NUMERO), eu.nome + ' apontou: ' + motivo + ' Confira a compra e fale com o Financeiro.', r2.ID, { email: true, autorId: eu.id });
      return { message: 'Parcela marcada como divergente. Quem comprou foi avisado.' };
    }
    if (acao === 'voltarParcela') {
      if (sx !== 'DIVERGENTE') throw new Error('Não foi possível voltar: a parcela não está divergente');
      SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, Object.assign({ SITUACAO: 'A_CONCILIAR', MOTIVO: motivo }, up));
      hp('VOLTOU', 'Divergente', 'A conciliar', 'Divergência resolvida.');
      return { message: 'Parcela voltou a "A conciliar".' };
    }
    throw new Error('Não foi possível registrar: ação desconhecida (' + acao + '). Atualize a tela');
  });
}

/** Fechar (ou fechar com ressalva) e reabrir (Diretoria). d: { final, competencia, ressalva, motivo, reabrir } */
function CmpFat_fechar_(eu, d) {
  CmpFat_exigirFin_(eu, 'fechar a fatura');
  d = d || {};
  var t = CmpFat_tela_(eu, { final: d.final, competencia: d.competencia }), motivo = Cmp_texto_(d.motivo, 1000);
  if (!t.fatura) throw new Error('Não foi possível fechar: importe o extrato da fatura antes. É com ele que o sistema confere as compras');
  if (d.reabrir) {
    if (!(eu.diretoria || eu.admin)) throw new Error('Não foi possível reabrir: reabrir fatura fechada é da Diretoria. Peça com o motivo');
    if (!t.fatura.fechada) throw new Error('Não foi possível reabrir: a fatura não está fechada');
    if (motivo.length < 15) throw new Error('Não foi possível reabrir: escreva o motivo (pelo menos 15 letras)');
    return Cmp_comTrava_(function () {
      SGO_DATA.update(CMP_ABAS.FATURAS, t.fatura.id, { SITUACAO: 'ABERTA', FECHAMENTO_OBS: Cmp_s_(t.fatura.obs) + ' | Reaberta por ' + eu.nome + ' em ' + Cmp_br_(Cmp_agora_()) + ': ' + motivo, ATUALIZADO_EM: Cmp_agora_() });
      Cmp_historico_('FATURA', t.fatura.id, 'REABERTA', eu, { de: t.fatura.situacaoNome, para: 'Aberta', texto: 'Fatura reaberta. Motivo: ' + motivo });
      return { message: 'Fatura reaberta.' };
    });
  }
  if (t.fatura.fechada) throw new Error('Não foi possível fechar: a fatura já está fechada');
  var res = t.resumo, abertos = res.abertos;
  if (abertos && !d.ressalva) throw new Error('Não foi possível fechar: ainda há ' + Cmp_plural_(abertos, 'item aberto', 'itens abertos') + ' (' + [res.naoInformadas ? res.naoInformadas + ' lançamento(s) não informado(s)' : '', res.foraDaFatura ? res.foraDaFatura + ' parcela(s) que não está(ão) na fatura' : '', res.divergentes ? res.divergentes + ' divergente(s)' : '', res.aConciliar ? res.aConciliar + ' a conciliar' : ''].filter(Boolean).join(', ') + '). Resolva cada um (informar, justificar, passar para a próxima fatura) ou use "Fechar com ressalva" escrevendo o motivo');
  if (d.ressalva && motivo.length < 20) throw new Error('Não foi possível fechar com ressalva: escreva o motivo (pelo menos 20 letras) e o que ficou aberto. Fica no histórico da fatura');
  return Cmp_comTrava_(function () {
    var sit = abertos ? 'FECHADA_RESSALVA' : 'FECHADA', agora = Cmp_agora_();
    SGO_DATA.update(CMP_ABAS.FATURAS, t.fatura.id, { SITUACAO: sit, TOTAL_EXTRATO: Cmp_num_(res.totalExtratoTxt), TOTAL_SISTEMA: Cmp_num_(res.totalSistemaTxt), FECHADA_POR_ID: eu.id, FECHADA_POR_NOME: eu.nome, FECHADA_EM: agora,
      FECHAMENTO_OBS: motivo || (res.diferenca ? 'Diferença ' + res.diferencaTxt : ''), ATUALIZADO_EM: agora });
    Cmp_historico_('FATURA', t.fatura.id, sit, eu, { de: 'Aberta', para: CMP_FAT_SIT[sit], texto: 'Fatura ' + t.competenciaNome + ' do ' + t.cartaoRotulo + ' fechada: extrato ' + res.totalExtratoTxt + ', sistema ' + res.totalSistemaTxt + (abertos ? '. Ressalva (' + abertos + ' em aberto): ' + motivo : '.') });
    return { message: abertos ? 'Fatura fechada com ressalva. O que ficou aberto continua na lista com o motivo.' : 'Fatura fechada: tudo conciliado.' };
  });
}

// ------------------------------------------------------------
// COBRANÇAS DO RESPONSÁVEL DO CARTÃO ("na fatura e não informado")
// ------------------------------------------------------------
/** Lançamentos não informados de um responsável (ou de todos, para a gestão). */
function CmpFat_naoInformadas_(filtroResp) {
  var cartoes = CmpCart_lista_(), fats = {};
  CmpFat_faturas_().forEach(function (f) { fats[Cmp_s_(f.ID)] = f; });
  return Cmp_ler_(CMP_ABAS.EXTRATO).filter(function (l) { return Cmp_up_(l.SITUACAO) === 'NAO_INFORMADA'; }).map(function (l) {
    var k = CmpCart_porFinal_(l.CARTAO_FINAL, cartoes), f = fats[Cmp_s_(l.FATURA_ID)] || {};
    return { l: l, k: k, respId: k ? Cmp_s_(k.RESPONSAVEL_ID) : '', respNome: k ? Cmp_s_(k.RESPONSAVEL_NOME) : '', comp: Cmp_s_(f.COMPETENCIA), fechada: CmpFat_fechada_(f), desde: Cmp_dia_(l.CRIADO_EM) || Cmp_hoje_() };
  }).filter(function (x) { return !filtroResp || x.respId === filtroResp; });
}
/** "Compras a informar" do responsável do cartão (com valor: é o cartão pelo qual ele responde). */
function CmpFat_minhasCobrancas_(eu) {
  return CmpFat_naoInformadas_(eu.id).sort(function (a, b) { return String(a.l.DATA).localeCompare(String(b.l.DATA)); }).map(function (x) {
    return { extratoId: Cmp_s_(x.l.ID), data: Cmp_brDia_(x.l.DATA), dataIso: Cmp_dia_(x.l.DATA), descricao: Cmp_s_(x.l.DESCRICAO), valor: Number(x.l.VALOR) || 0, valorTxt: Cmp_moeda_(x.l.VALOR), final: Cmp_s_(x.l.CARTAO_FINAL),
      parcela: Number(x.l.PARCELA) || 0, parcelas: Number(x.l.PARCELAS) || 0, cartao: CmpCart_rotulo_(x.k, x.l.CARTAO_FINAL), fatura: x.comp ? CmpI_competenciaNome_(x.comp) : '', diasUteis: Cmp_diasUteisEntre_(x.desde, Cmp_hoje_()) };
  });
}

/** Rotina: e-mail (evento CP02 da matriz) ao responsável com o que está há N dias úteis sem informar. Um por pessoa por rodada. */
function CmpFat_cobrarPorEmail_() {
  var inf = Cmp_regras_().informar || {}, dias = Number(inf.cobrancaEmailDiasUteis), hoje = Cmp_hoje_();
  if (!(dias >= 0)) dias = 2;
  if (typeof SGO_notificar_ !== 'function') return { enviados: 0 };
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
  if (!ex.dentro) return { fora: 'fora do expediente' };
  var porResp = {};
  CmpFat_naoInformadas_('').forEach(function (x) {
    if (!x.respId || Cmp_s_(x.l.COBRADO_EM) || x.fechada || Cmp_diasUteisEntre_(x.desde, hoje) < dias) return;
    (porResp[x.respId] = porResp[x.respId] || []).push(x);
  });
  var n = 0, agora = Cmp_agora_();
  Object.keys(porResp).forEach(function (id) {
    var l = porResp[id];
    var texto = 'Há ' + Cmp_plural_(l.length, 'lançamento', 'lançamentos') + ' na fatura do cartão pelo qual você responde sem a compra informada no SGO+:\n' +
      l.slice(0, 12).map(function (x) { return '- ' + Cmp_brDia_(x.l.DATA) + ': ' + Cmp_s_(x.l.DESCRICAO).slice(0, 60) + ' (cartão final ' + Cmp_s_(x.l.CARTAO_FINAL) + ')'; }).join('\n') + (l.length > 12 ? '\n(e mais ' + (l.length - 12) + ')' : '') +
      '\n\nComo resolver: Compras > Informar compra já feita > Compras a informar. Toque em "Informar esta compra" (data e cartão já vêm preenchidos) e anexe o comprovante. Se não foi compra (tarifa, assinatura), fale com o Financeiro.';
    try {
      SGO_notificar_({ usuarios: [id], titulo: l.length === 1 ? 'Compra no cartão da empresa sem informar' : l.length + ' compras no cartão da empresa sem informar', texto: texto, canais: ['sgo', 'email', 'whatsapp'], origem: 'COMPRAS', evento: 'CP02', refId: 'CP02-' + id + '-' + hoje });
      n++;
    } catch (e) { console.error('Compras, cobrança CP02: ' + ((e && e.message) || e)); }
    l.forEach(function (x) { SGO_DATA.update(CMP_ABAS.EXTRATO, x.l.ID, { COBRADO_EM: agora }); });
  });
  return { enviados: n };
}

/** Rotina: resumo ao Financeiro (evento CP03), uma vez por dia útil: a pagar vencido, reembolsos e lançamentos não informados. */
function CmpFat_resumoFinanceiro_() {
  var hoje = Cmp_hoje_(), props = PropertiesService.getScriptProperties();
  if (props.getProperty('CMP_CP03_DIA') === hoje || typeof SGO_notificar_ !== 'function') return { fora: 'já feito hoje' };
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
  if (!ex.dentro) return { fora: 'fora do expediente' };
  var parc = Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) { return Cmp_up_(x.SITUACAO) === 'A_PAGAR'; });
  var venc = parc.filter(function (x) { return Cmp_dia_(x.VENCIMENTO) && Cmp_dia_(x.VENCIMENTO) <= hoje; });
  var reemb = parc.filter(function (x) { return Cmp_up_(x.FORMA) === 'REEMBOLSO'; });
  var nao = CmpFat_naoInformadas_('').length;
  props.setProperty('CMP_CP03_DIA', hoje);
  if (!venc.length && !reemb.length && !nao) return { nada: true };
  var ids = CmpFin_idsFinanceiro_(Cmp_usuarios_(), []);
  if (!ids.length) ids = Cmp_diretoria_(Cmp_usuarios_(), []);
  try {
    SGO_notificar_({ usuarios: ids, titulo: 'Compras: a pagar e conciliação do dia', canais: ['sgo', 'email'], origem: 'COMPRAS', evento: 'CP03', refId: 'CP03-' + hoje,
      texto: [venc.length ? Cmp_plural_(venc.length, 'vencimento', 'vencimentos') + ' de hoje ou atrasado(s) (faturado, boleto, reembolso)' : '', reemb.length ? Cmp_plural_(reemb.length, 'reembolso a colaborador pendente', 'reembolsos a colaboradores pendentes') : '',
        nao ? Cmp_plural_(nao, 'lançamento de fatura sem compra informada', 'lançamentos de fatura sem compra informada') : ''].filter(Boolean).join('\n') + '\n\nVeja em Compras > A pagar e em Compras > Conciliação das faturas.' });
  } catch (e) { console.error('Compras, resumo CP03: ' + ((e && e.message) || e)); }
  return { enviados: ids.length };
}

// ------------------------------------------------------------
// A PAGAR (faturado, boleto, reembolso)
// ------------------------------------------------------------
function CmpPag_lista_(eu, d) {
  CmpFat_exigirFin_(eu, 'ver o que há a pagar');
  d = d || {};
  var sit = Cmp_up_(d.situacao) || 'A_PAGAR', hoje = Cmp_hoje_(), reqs = {}, peds = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { reqs[Cmp_s_(r.ID)] = r; });
  Cmp_ler_(CMP_ABAS.PEDIDOS).forEach(function (p) { peds[Cmp_s_(p.ID)] = p; });
  var lim = Cmp_somarDias_(hoje, -60);
  var l = Cmp_ler_(CMP_ABAS.PARCELAS).filter(function (x) {
    if (CMP_FORMAS_A_PAGAR.indexOf(Cmp_up_(x.FORMA)) < 0) return false;
    var s = Cmp_up_(x.SITUACAO);
    if (sit === 'A_PAGAR') return s === 'A_PAGAR';
    if (sit === 'PAGA') return s === 'PAGA' && Cmp_dia_(x.PAGO_EM) >= lim;
    return s === 'A_PAGAR' || (s === 'PAGA' && Cmp_dia_(x.PAGO_EM) >= lim);
  }).map(function (x) {
    var t = CmpI_parcelaParaTela_(x, true), r = reqs[Cmp_s_(x.REQUISICAO_ID)] || {}, p = peds[Cmp_s_(x.PEDIDO_ID)] || {};
    t.titulo = Cmp_s_(r.TITULO).slice(0, 80); t.quem = Cmp_s_(r.COMPRADO_POR_NOME || r.SOLICITANTE_NOME); t.fornecedor = Cmp_s_(p.FORNECEDOR_NOME); t.vinculo = CmpR_vinculoTexto_(r);
    t.comprovanteUrl = Cmp_s_(p.COMPROVANTE_URL); t.nfUrl = Cmp_s_(p.NF_ARQUIVO_URL); t.vencida = t.situacao === 'A_PAGAR' && t.vencimentoIso && t.vencimentoIso < hoje; t.venceHoje = t.situacao === 'A_PAGAR' && t.vencimentoIso === hoje;
    t.podePagar = t.situacao === 'A_PAGAR' && Cmp_s_(x.BENEFICIARIO_ID) !== eu.id;
    return t;
  }).sort(function (a, b) { return String(a.vencimentoIso).localeCompare(String(b.vencimentoIso)); });
  var tot = function (f) { return Cmp_moeda_(l.filter(f).reduce(function (s, x) { return s + x.valor; }, 0)); };
  return { itens: l, totais: { aPagarTxt: tot(function (x) { return x.situacao === 'A_PAGAR'; }), vencidoTxt: tot(function (x) { return x.vencida; }), vencidas: l.filter(function (x) { return x.vencida; }).length,
    reembolsos: l.filter(function (x) { return x.situacao === 'A_PAGAR' && x.forma === 'REEMBOLSO'; }).length } };
}
/** d: { parcelaId, pagoEm, comprovante } */
function CmpPag_marcarPago_(eu, d) {
  CmpFat_exigirFin_(eu, 'marcar como pago');
  d = d || {};
  var pagoEm = Cmp_dia_(d.pagoEm);
  if (!pagoEm || pagoEm > Cmp_hoje_()) throw new Error('Não foi possível marcar como pago: escolha a data do pagamento (hoje ou antes)');
  if (!(d.comprovante && d.comprovante.base64)) throw new Error('Não foi possível marcar como pago: anexe o comprovante do pagamento (transferência, boleto pago, recibo)');
  return Cmp_comTrava_(function () {
    var x = SGO_DATA.getById(CMP_ABAS.PARCELAS, Cmp_s_(d.parcelaId));
    if (!x || Cmp_up_(x.SITUACAO) !== 'A_PAGAR') throw new Error('Não foi possível marcar: o vencimento não está "A pagar". Atualize a lista');
    if (Cmp_s_(x.BENEFICIARIO_ID) === eu.id) throw new Error('Não foi possível marcar: o reembolso é para você. Outra pessoa do Financeiro (ou a Diretoria) faz a baixa');
    var arq = Cmp_salvarArquivo_(d.comprovante, Cmp_s_(x.REQUISICAO_NUMERO), 'Comprovante de pagamento ' + x.PARCELA + '-' + x.PARCELAS, CMP_RX_PDF_IMG, 'do comprovante');
    var agora = Cmp_agora_();
    SGO_DATA.update(CMP_ABAS.PARCELAS, x.ID, { SITUACAO: 'PAGA', PAGO_EM: pagoEm, PAGO_POR_ID: eu.id, PAGO_POR_NOME: eu.nome, PAGO_COMPROVANTE_URL: arq.url, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    var reemb = Cmp_up_(x.FORMA) === 'REEMBOLSO';
    Cmp_historico_('REQUISICAO', Cmp_s_(x.REQUISICAO_ID), reemb ? 'REEMBOLSADO' : 'PAGO', eu, { publico: reemb, texto: (reemb ? 'Reembolso a ' + Cmp_s_(x.BENEFICIARIO_NOME) + ' pago' : 'Vencimento de ' + Cmp_brDia_(x.VENCIMENTO) + ' pago') + ' em ' + Cmp_brDia_(pagoEm) + ' por ' + eu.nome + '.' });
    if (reemb && Cmp_s_(x.BENEFICIARIO_ID)) Cmp_avisar_(x.BENEFICIARIO_ID, 'REEMBOLSADO', 'Reembolso pago: ' + Cmp_s_(x.REQUISICAO_NUMERO), 'O Financeiro pagou o reembolso da compra ' + Cmp_s_(x.REQUISICAO_NUMERO) + ' em ' + Cmp_brDia_(pagoEm) + '. O comprovante está em Compras > Informar compra já feita > Minhas compras informadas.', Cmp_s_(x.REQUISICAO_ID), { email: true, autorId: eu.id });
    return { message: reemb ? 'Reembolso marcado como pago. O colaborador foi avisado.' : 'Vencimento marcado como pago.' };
  });
}

// ------------------------------------------------------------
// PENDÊNCIAS (central e Caixa de decisões) e CONDUTA
// ------------------------------------------------------------
function CmpFat_pendencias_(add, ctx, o) {
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.compras_nao_informada) return;
  var hoje = o.hoje, inf = o.regras.informar || {}, diasG = Number(inf.cobrancaGestaoDiasUteis) || 5, us = o.usuarios();
  var fin = CmpFin_idsFinanceiro_(us, []);
  if (Pend_abaExiste_(CMP_ABAS.EXTRATO)) {
    var porResp = {};
    CmpFat_naoInformadas_('').forEach(function (x) { (porResp[x.respId || ''] = porResp[x.respId || ''] || []).push(x); });
    Object.keys(porResp).forEach(function (rid) {
      var l = porResp[rid], desde = l.map(function (x) { return x.desde; }).sort()[0], du = Cmp_diasUteisEntre_(desde, hoje);
      var exemplos = l.slice(0, 3).map(function (x) { return Cmp_brDia_(x.l.DATA) + ' ' + Cmp_s_(x.l.DESCRICAO).slice(0, 40); }).join('; ');
      if (rid && us[rid]) {
        add(Pend_item_('compras_nao_informada', { id: 'CMP:NAOINF:' + rid, nome: us[rid].nome, publico: 'PESSOA', paraUsuarios: [rid], responsavel: us[rid].nome, responsavelId: rid,
          gravidade: du >= diasG ? 'CRITICO' : 'ATENCAO', dias: null, titulo: 'Informe ' + Cmp_plural_(l.length, 'compra', 'compras') + ' do cartão da empresa que está(ão) na fatura',
          detalhe: 'Lançamentos sem compra informada: ' + exemplos + (l.length > 3 ? ' e mais ' + (l.length - 3) : '') + '.',
          oQueFazer: 'Abra Compras > Informar compra já feita > Compras a informar e toque em "Informar esta compra" em cada lançamento (anexe o comprovante). Se não foi compra, fale com o Financeiro.',
          tela: CMP_PEND_TELA('compras_informar', 'cobrancas') }));
        if (du >= diasG) {
          var area = us[rid].area || Cmp_up_(o.regras.areaCompras);
          add(Pend_item_('compras_nao_informada_gestao', { id: 'CMP:NAOINFG:' + rid, nome: us[rid].nome, publico: 'GESTAO', responsavel: us[rid].nome, responsavelId: rid, gravidade: 'CRITICO', dias: null,
            titulo: us[rid].nome + ': ' + Cmp_plural_(l.length, 'compra', 'compras') + ' do cartão da empresa sem informar há ' + Cmp_plural_(du, 'dia útil', 'dias úteis'),
            detalhe: 'Lançamentos: ' + exemplos + '.', oQueFazer: 'Cobre de ' + us[rid].nome + ' que informe as compras hoje (Compras > Informar compra já feita). A conciliação fica em Compras > Conciliação das faturas.',
            tela: CMP_PEND_TELA('compras_conciliacao', ''), extra: { area: area, naoPode: [rid], desde: desde } }));
        }
      } else if (fin.length) {
        add(Pend_item_('compras_nao_informada', { id: 'CMP:NAOINF:SEMRESP', nome: 'Sem responsável', publico: 'PESSOA', paraUsuarios: fin, responsavel: 'Financeiro', responsavelId: '', gravidade: 'ATENCAO', dias: null,
          titulo: Cmp_plural_(l.length, 'lançamento de fatura', 'lançamentos de fatura') + ' sem compra informada e sem responsável do cartão',
          detalhe: 'Lançamentos: ' + exemplos + '. O cartão não está cadastrado ou está sem responsável, então ninguém foi cobrado.',
          oQueFazer: 'Cadastre o cartão com o responsável em Compras > Cartões da empresa, ou justifique o lançamento na conciliação.', tela: CMP_PEND_TELA('compras_cartoes', '') }));
      }
    });
  }
  if (Pend_abaExiste_(CMP_ABAS.PARCELAS) && fin.length) {
    var parc = Cmp_ler_(CMP_ABAS.PARCELAS), venc = parc.filter(function (x) { return Cmp_up_(x.SITUACAO) === 'A_PAGAR' && Cmp_dia_(x.VENCIMENTO) && Cmp_dia_(x.VENCIMENTO) <= hoje; });
    if (venc.length) add(Pend_item_('compras_a_pagar', { id: 'CMP:APAGAR', nome: 'A pagar', publico: 'PESSOA', paraUsuarios: fin, responsavel: 'Financeiro', responsavelId: '', gravidade: venc.some(function (x) { return Cmp_dia_(x.VENCIMENTO) < hoje; }) ? 'CRITICO' : 'ATENCAO', dias: null,
      titulo: Cmp_plural_(venc.length, 'vencimento de compra', 'vencimentos de compras') + ' para hoje ou atrasado(s)', detalhe: venc.slice(0, 3).map(function (x) { return Cmp_s_(x.REQUISICAO_NUMERO) + ' (' + (CMP_FORMAS_PAGAMENTO[Cmp_up_(x.FORMA)] || '') + ', ' + Cmp_brDia_(x.VENCIMENTO) + ')'; }).join('; ') + '.',
      oQueFazer: 'Pague e toque em "Marcar como pago" com a data e o comprovante em Compras > A pagar.', tela: CMP_PEND_TELA('compras_apagar', '') }));
    var fora = parc.filter(function (x) { return Cmp_up_(x.SITUACAO) === 'NAO_ESTA_NA_FATURA'; });
    if (fora.length) add(Pend_item_('compras_fora_fatura', { id: 'CMP:FORAFAT', nome: 'Fora da fatura', publico: 'PESSOA', paraUsuarios: fin, responsavel: 'Financeiro', responsavelId: '', gravidade: 'ATENCAO', dias: null,
      titulo: Cmp_plural_(fora.length, 'compra informada que não está na fatura', 'compras informadas que não estão na fatura'), detalhe: fora.slice(0, 3).map(function (x) { return Cmp_s_(x.REQUISICAO_NUMERO) + ' (parcela ' + x.PARCELA + '/' + x.PARCELAS + ', final ' + Cmp_s_(x.CARTAO_FINAL) + ')'; }).join('; ') + '.',
      oQueFazer: 'Em Compras > Conciliação das faturas, passe para a próxima fatura (compra perto do fechamento) ou marque Divergente com o motivo.', tela: CMP_PEND_TELA('compras_conciliacao', '') }));
  }
}

/** Candidatos à fila de sugestões do Conduta (SGO_Conduta_Qualidade.js): não informado há N dias úteis. A gestão decide. */
function Compras_candidatosConduta_(usuarios) {
  try {
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(CMP_ABAS.EXTRATO)) return [];
    var inf = Cmp_regras_().informar || {}, diasG = Number(inf.cobrancaGestaoDiasUteis) || 5, hoje = Cmp_hoje_();
    return CmpFat_naoInformadas_('').filter(function (x) { return x.respId && usuarios[x.respId] && Cmp_diasUteisEntre_(x.desde, hoje) >= diasG; }).map(function (x) {
      return { chave: 'COMPRAS|NAO_INFORMADA|' + Cmp_s_(x.l.ID), origem: 'COMPRAS', tipo: 'COMPRA_NAO_INFORMADA', origemId: Cmp_s_(x.l.ID), colaboradorId: x.respId, dataFato: x.desde, tipoCodigo: '', resolvivel: true,
        rotulo: 'Lançamento de ' + Cmp_brDia_(x.l.DATA) + ' no cartão final ' + Cmp_s_(x.l.CARTAO_FINAL),
        titulo: 'Compra no cartão da empresa sem informar (' + Cmp_brDia_(x.l.DATA) + ', ' + Cmp_s_(x.l.DESCRICAO).slice(0, 50) + ')',
        detalhe: 'O lançamento está na fatura importada em ' + Cmp_brDia_(x.desde) + ' e ninguém informou a compra em ' + Cmp_plural_(Cmp_diasUteisEntre_(x.desde, hoje), 'dia útil', 'dias úteis') + '. A pessoa é a responsável pelo cartão. Antes de registrar, confira se ela foi cobrada e se não é tarifa ou assinatura. A sugestão some sozinha quando a compra for informada ou o lançamento for justificado.' };
    });
  } catch (e) { return []; }
}
