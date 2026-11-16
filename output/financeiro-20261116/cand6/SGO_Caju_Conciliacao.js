/****************************************************
 * CONCILIAÇÃO CAJU — CRUZAMENTO, DIVERGÊNCIAS, PAINEL, FECHAMENTO E RELATÓRIOS A4 (11/11/2026)
 *
 * (a) CRÉDITOS: aprovado no SGO+ × pedido no Caju × creditado × carga que aparece no extrato (linha de crédito ligada à carga).
 * (b) GASTOS: cada transação do extrato (CJU_EXTRATO) é ligada ao gasto da prestação de contas (VIA_PRESTACOES) da mesma pessoa,
 *     dentro da janela da viagem (saída − N dias a chegada + N dias), pelo valor exato (centavos) e pela data (tolerância em dias),
 *     desempatando pelo estabelecimento (palavras em comum ou o mesmo CNPJ). O que sobra vira DIVERGÊNCIA, com o dono (quem precisa
 *     agir: o responsável pelo dinheiro ou o Financeiro) e o motivo (CJU_DIV_TIPOS). Recolhimento do saldo no extrato liga ao acerto
 *     registrado na viagem (VIA_ACERTOS); estorno de compra entra como informativo.
 * A conciliação roda sozinha depois de cada importação e pelo botão "Conciliar agora". Ligação manual, linha ignorada e pessoa
 * definida à mão ficam como o Financeiro deixou. O que a condição deixou de existir é "sanado" sozinho; o que foi resolvido com
 * motivo continua resolvido. Período fechado não muda (só reabrindo, com motivo).
 * Grava nas colunas reservadas do Depósito de viagem: VIA_PRESTACOES.TRANSACAO_ID / CONCILIACAO_SITUACAO, VIA_CARGAS.EXTRATO_ID /
 * CONCILIADA_EM, VIA_ACERTOS.TRANSACAO_ID / CONCILIADO_EM e VIA_SOLICITACOES.CONCILIACAO_SITUACAO (coluna do Kanban).
 * Fechamento por período e centro de custo (CJU_FECHAMENTOS) com A4. Relatórios A4: fechamento, divergências, créditos, individual
 * (por colaborador e período: o próprio colaborador gera o dele) e geral (por colaborador, centro de custo, cliente/O.S. e categoria,
 * com gráficos e índice). Só funções (carrega antes de SGO_Viagem.js).
 ****************************************************/

var CJU_DIV_TIPOS = {
  SEM_COMPROVANTE: { nome: 'Gasto no cartão sem comprovante na prestação', dono: 'RESPONSAVEL', fazer: 'Quem levou o dinheiro lança o gasto na prestação de contas (Depósito de viagem > Prestar contas) com o comprovante e para que foi; se não foi gasto da viagem, o Financeiro glosa ou registra a devolução.' },
  VALOR_DIFERENTE: { nome: 'Valor do cartão diferente do comprovante', dono: 'RESPONSAVEL', fazer: 'Confira o comprovante: se o valor lançado está errado, quem prestou contas tira o gasto e lança de novo; se a diferença é gorjeta ou taxa, o Financeiro resolve com o motivo.' },
  FORA_DO_PERIODO: { nome: 'Gasto fora do período da viagem', dono: 'RESPONSAVEL', fazer: 'Peça a explicação a quem tem o cartão. Gasto que não é da viagem vira devolução (glosa); se a viagem mudou de data, registre o motivo.' },
  CARTAO_OUTRA_PESSOA: { nome: 'Gasto da viagem pago no cartão de outra pessoa', dono: 'RESPONSAVEL', fazer: 'O gasto lançado nesta viagem aparece no cartão de outra pessoa. Confirme quem pagou: corrija a prestação (quem pagou presta contas) ou resolva com o motivo.' },
  DUPLICIDADE: { nome: 'Transação repetida no extrato', dono: 'FINANCEIRO', fazer: 'Confira no portal do Caju se a compra foi cobrada duas vezes: se sim, peça o estorno; se foram duas compras, peça o segundo comprovante.' },
  SEM_TRANSACAO: { nome: 'Gasto lançado como cartão Caju que não aparece no extrato', dono: 'RESPONSAVEL', fazer: 'Se foi pago com dinheiro próprio, quem prestou contas corrige "Pago com"; se foi no cartão, confira se o extrato importado cobre a data.' },
  CENTRO_DIFERENTE: { nome: 'Centro de custo do extrato diferente da viagem', dono: 'FINANCEIRO', fazer: 'Confira o centro de custo usado no Caju na carga e corrija no Caju ou registre o motivo.' },
  PESSOA_DESCONHECIDA: { nome: 'Transação de pessoa sem vínculo no SGO+', dono: 'FINANCEIRO', fazer: 'Vincule a pessoa em Colaboradores (pelo CPF) ou diga de quem é a linha ("Definir a pessoa").' },
  CREDITO_SEM_CARGA: { nome: 'Crédito no extrato sem carga registrada no SGO+', dono: 'FINANCEIRO', fazer: 'Registre a carga na viagem (Depósito de viagem) ou explique de onde veio o crédito.' },
  CREDITO_PENDENTE: { nome: 'Pedido de crédito pago e ainda não creditado', dono: 'FINANCEIRO', fazer: 'Toque em Atualizar no pedido; se continuar, confira no portal do Caju ou fale com o Caju.' },
  CREDITO_ACIMA_APROVADO: { nome: 'Carregado acima do aprovado', dono: 'FINANCEIRO', fazer: 'Recolha a diferença no Caju ou peça nova aprovação da solicitação com o valor certo.' },
  DEVOLUCAO_SEM_REGISTRO: { nome: 'Recolhimento no extrato sem acerto registrado na viagem', dono: 'FINANCEIRO', fazer: 'Registre o acerto (devolução, recolhimento no Caju) na viagem, com o comprovante.' },
  SALDO_NAO_DEVOLVIDO: { nome: 'Saldo não gasto ainda no cartão', dono: 'FINANCEIRO', fazer: 'Recolha o saldo na carteira de despesas do Caju e registre o acerto na viagem.' },
  SEM_DESCRICAO: { nome: 'Gasto sem a descrição de para que foi', dono: 'RESPONSAVEL', fazer: 'Peça a quem prestou contas para dizer para que foi o gasto (atendimento, cliente ou O.S.).' }
};
var CJU_RESOLUCOES = { JUSTIFICADA: 'Aceita com justificativa', CORRIGIDA: 'Corrigida (prestação, extrato ou cadastro)', GLOSA: 'Vai para glosa na conferência da prestação', DESCONSIDERADA: 'Não é gasto de viagem (registrado o porquê)' };
var CJU_LIN_SIT = { PENDENTE: 'A conciliar', CONCILIADO: 'Conciliada', DIVERGENTE: 'Com divergência', RESOLVIDO: 'Resolvida com motivo', IGNORADO: 'Desconsiderada' };
var CJU_COLUNAS_KANBAN = [['AGUARDANDO_CARGA', 'Aprovada, aguardando a carga', '#1f5fa8'], ['CREDITO', 'Crédito em andamento no Caju', '#0e7490'], ['EM_VIAGEM', 'Em viagem', '#4d7c0f'],
  ['SEM_EXTRATO', 'Aguardando o extrato', '#a87406'], ['A_CONCILIAR', 'A conciliar', '#b45309'], ['DIVERGENCIA', 'Com divergência', '#a61b1b'], ['CONCILIADA', 'Conciliada', '#1d6b3f'], ['FECHADA', 'Fechada', '#1f2933']];

// ------------------------------------------------------------
// APOIO
// ------------------------------------------------------------
function Cju_colNome_(c) { var x = CJU_COLUNAS_KANBAN.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c; }
function Cju_colCor_(c) { var x = CJU_COLUNAS_KANBAN.filter(function (k) { return k[0] === c; })[0]; return x ? x[2] : '#6b7480'; }
function Cju_palavras_(t) { return Cju_norm_(t).split(' ').filter(function (w) { return w.length > 2 && ['ltda', 'eireli', 'com', 'comercio', 'servicos', 'restaurante'].indexOf(w) < 0; }); }
function Cju_parecido_(a, b, cnpjA, cnpjB) {
  if (cnpjA && cnpjB && Cju_cpf_(cnpjA) === Cju_cpf_(cnpjB)) return 1;
  var x = Cju_palavras_(a), y = Cju_palavras_(b);
  if (!x.length || !y.length) return 0;
  var comum = x.filter(function (w) { return y.indexOf(w) >= 0; }).length;
  return comum / Math.min(x.length, y.length);
}
function Cju_diff_(a, b) { var d = Via_diasEntre_(a, b); return d === null ? 999 : Math.abs(d); }
/** Linha do extrato ativa (não removida). */
function Cju_linhasAtivas_() { return Cju_ler_(CJU_ABAS.EXTRATO).filter(function (x) { return !Via_s_(x.REMOVIDA_EM); }); }
/** Períodos importados (importações não desfeitas). */
function Cju_cobertura_() { return Cju_ler_(CJU_ABAS.IMPORTACOES).filter(function (x) { return !Via_s_(x.DESFEITA_EM) && Via_s_(x.PERIODO_DE); }).map(function (x) { return [Via_dia_(x.PERIODO_DE), Via_dia_(x.PERIODO_ATE)]; }); }
function Cju_coberto_(cob, dia) { return !!dia && cob.some(function (p) { return p[0] <= dia && dia <= p[1]; }); }
function Cju_centroCajuDe_(r) { return typeof Via_centroCaju_ === 'function' ? Via_up_(Via_centroCaju_(r)) : Via_up_(r.CENTRO_CUSTO_CODIGO); }
/** Desfaz o que a linha gravou nas colunas reservadas do Depósito de viagem. */
function Cju_desfazerLigacoes_(x) {
  if (Via_s_(x.GASTO_ID)) { var g = SGO_DATA.getById(VIA_ABAS.PRESTACOES, Via_s_(x.GASTO_ID)); if (g && Via_s_(g.TRANSACAO_ID) === Via_s_(x.ID)) SGO_DATA.update(VIA_ABAS.PRESTACOES, g.ID, { TRANSACAO_ID: '', CONCILIACAO_SITUACAO: '' }); }
  if (Via_s_(x.CARGA_ID)) { var c = SGO_DATA.getById(VIA_ABAS.CARGAS, Via_s_(x.CARGA_ID)); if (c && Via_s_(c.EXTRATO_ID) === Via_s_(x.ID)) SGO_DATA.update(VIA_ABAS.CARGAS, c.ID, { EXTRATO_ID: '', CONCILIADA_EM: '' }); }
  if (Via_s_(x.ACERTO_ID)) { var a = SGO_DATA.getById(VIA_ABAS.ACERTOS, Via_s_(x.ACERTO_ID)); if (a && Via_s_(a.TRANSACAO_ID) === Via_s_(x.ID)) SGO_DATA.update(VIA_ABAS.ACERTOS, a.ID, { TRANSACAO_ID: '', CONCILIADO_EM: '' }); }
}

// ------------------------------------------------------------
// O CRUZAMENTO
// ------------------------------------------------------------
function Cju_conciliar_(eu) {
  return Via_comTrava_(function () { Cju_garantirAbas_(); Via_garantirAbas_(); Cju_memoLimpar_(); var r = Cju_conciliarDentro_(eu); Cju_memoLimpar_(); return r; });
}
function Cju_conciliarDentro_(eu) {
  var cfg = Cju_config_(), tol = cfg.toleranciaDias, agora = Via_agora_(), hoje = Via_hoje_(), cob = Cju_cobertura_();
  var sols = Via_ler_(VIA_ABAS.SOLICITACOES), porSol = {};
  sols.forEach(function (r) { porSol[Via_s_(r.ID)] = r; });
  var viagens = sols.filter(function (r) { return Number(r.CARREGADO_TOTAL) > 0; });
  var deP = {}; viagens.forEach(function (r) { var k = Via_s_(r.RESPONSAVEL_ID); (deP[k] = deP[k] || []).push(r); });
  var janela = function (r) { return [Via_somarDias_(Via_dia_(r.SAIDA_EM), -cfg.janelaAntesDias), Via_somarDias_(Via_dia_(r.CHEGADA_EM), cfg.janelaDepoisDias)]; };
  var noPeriodo = function (r, dia) { var j = janela(r); return !!dia && j[0] <= dia && dia <= j[1]; };
  var gastos = Via_ler_(VIA_ABAS.PRESTACOES).filter(function (g) { return !Via_s_(g.REMOVIDO_EM) && porSol[Via_s_(g.SOLICITACAO_ID)] && Number(porSol[Via_s_(g.SOLICITACAO_ID)].CARREGADO_TOTAL) > 0; });
  var cargas = Via_ler_(VIA_ABAS.CARGAS).filter(function (c) { return porSol[Via_s_(c.SOLICITACAO_ID)]; });
  var acertos = Via_ler_(VIA_ABAS.ACERTOS).filter(function (a) { return porSol[Via_s_(a.SOLICITACAO_ID)]; });
  var linhas = Cju_linhasAtivas_(), ctxP = Cju_ctxPessoas_();
  var L = {}, usG = {}, usC = {}, usA = {}, divs = {};
  var div = function (tipo, o) {
    var chave = tipo + ':' + [o.extrato || '', o.gasto || '', o.sol || '', o.pedido || ''].join(':');
    var r = o.sol ? porSol[o.sol] : null, t = CJU_DIV_TIPOS[tipo];
    var dono = t.dono === 'RESPONSAVEL' && r ? { id: Via_s_(r.RESPONSAVEL_ID), nome: Via_s_(r.RESPONSAVEL_NOME) } : { id: '', nome: 'Financeiro' };
    divs[chave] = { CHAVE: chave, TIPO: tipo, SOLICITACAO_ID: o.sol || '', NUMERO: r ? Via_s_(r.NUMERO) : '', EXTRATO_ID: o.extrato || '', GASTO_ID: o.gasto || '', PEDIDO_ID: o.pedido || '',
      VALOR: Via_r2_(o.valor || 0), DIFERENCA: Via_r2_(o.diferenca || 0), DATA: o.data || '', DESCRICAO: Via_texto_(o.texto, 600), DONO_ID: dono.id, DONO_NOME: dono.nome,
      CENTRO_CUSTO_CODIGO: r ? Via_up_(r.CENTRO_CUSTO_CODIGO) : '' };
    if (o.extrato && L[o.extrato]) L[o.extrato].divs.push(chave);
  };
  // 0. o que fica como está: período fechado, ligação manual, linha desconsiderada
  linhas.forEach(function (x) {
    var fixo = !!Via_s_(x.FECHAMENTO_ID) || ['MANUAL', 'IGNORADA'].indexOf(Via_up_(x.REGRA)) >= 0;
    if (!Via_s_(x.USUARIO_ID) && Via_up_(x.PESSOA_REGRA) !== 'MANUAL') { var p = Cju_pessoaDaLinha_(x.PESSOA_TEXTO, x.CPF, ctxP); if (p) { x.USUARIO_ID = p.id; x.USUARIO_NOME = p.nome; x.PESSOA_REGRA = p.regra; x._pessoaNova = true; } }
    L[x.ID] = { x: x, fixo: fixo, sol: fixo ? Via_s_(x.SOLICITACAO_ID) : '', gasto: fixo ? Via_s_(x.GASTO_ID) : '', carga: fixo ? Via_s_(x.CARGA_ID) : '', acerto: fixo ? Via_s_(x.ACERTO_ID) : '',
      situacao: fixo ? Via_up_(x.SITUACAO) : 'PENDENTE', regra: fixo ? Via_up_(x.REGRA) : '', divs: [] };
    if (fixo) { if (L[x.ID].gasto) usG[L[x.ID].gasto] = x.ID; if (L[x.ID].carga) usC[L[x.ID].carga] = x.ID; if (L[x.ID].acerto) usA[L[x.ID].acerto] = x.ID; }
  });
  var livres = function (tipo) { return linhas.filter(function (x) { return !L[x.ID].fixo && Via_up_(x.TIPO) === tipo; }).sort(function (a, b) { return Via_s_(a.DATA).localeCompare(Via_s_(b.DATA)) || Via_s_(a.HORA).localeCompare(Via_s_(b.HORA)); }); };
  var cent = function (v) { return Via_cent_(v); };
  // 1. créditos no extrato × cargas
  livres('CREDITO').forEach(function (x) {
    var u = Via_s_(x.USUARIO_ID), dia = Via_dia_(x.DATA), best = null, bd = 99;
    cargas.forEach(function (c) { var r = porSol[Via_s_(c.SOLICITACAO_ID)]; if (usC[c.ID] || Via_s_(r.RESPONSAVEL_ID) !== u || cent(c.VALOR) !== cent(x.VALOR)) return; var d = Cju_diff_(c.DATA, dia); if (d <= tol + 2 && d < bd) { bd = d; best = c; } });
    var l = L[x.ID];
    if (best) { usC[best.ID] = x.ID; l.carga = best.ID; l.sol = Via_s_(best.SOLICITACAO_ID); l.situacao = 'CONCILIADO'; l.regra = 'AUTO'; }
    else if (u) { l.situacao = 'DIVERGENTE'; div('CREDITO_SEM_CARGA', { extrato: x.ID, valor: x.VALOR, data: dia, texto: 'Crédito de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' no cartão de ' + Via_s_(x.USUARIO_NOME) + ' sem carga registrada no SGO+ com o mesmo valor.' }); }
  });
  // 2. recolhimento do saldo × acertos de devolução
  livres('RECOLHIMENTO').forEach(function (x) {
    var u = Via_s_(x.USUARIO_ID), dia = Via_dia_(x.DATA), best = null, bd = 99, l = L[x.ID];
    acertos.forEach(function (a) { var r = porSol[Via_s_(a.SOLICITACAO_ID)]; if (usA[a.ID] || Via_up_(a.TIPO) !== 'DEVOLUCAO' || Via_s_(r.RESPONSAVEL_ID) !== u || cent(a.VALOR) !== cent(x.VALOR)) return; var d = Cju_diff_(a.DATA, dia); if (d <= tol + 7 && d < bd) { bd = d; best = a; } });
    if (best) { usA[best.ID] = x.ID; l.acerto = best.ID; l.sol = Via_s_(best.SOLICITACAO_ID); l.situacao = 'CONCILIADO'; l.regra = 'AUTO'; return; }
    var prev = (deP[u] || []).filter(function (r) { return Via_dia_(r.SAIDA_EM) <= dia; }).sort(function (a, b) { return Via_s_(b.CHEGADA_EM).localeCompare(Via_s_(a.CHEGADA_EM)); })[0];
    if (prev) l.sol = Via_s_(prev.ID);
    if (u) { l.situacao = 'DIVERGENTE'; div('DEVOLUCAO_SEM_REGISTRO', { extrato: x.ID, sol: l.sol, valor: x.VALOR, data: dia, texto: 'Recolhimento de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' do cartão de ' + Via_s_(x.USUARIO_NOME) + ' sem acerto de devolução registrado' + (prev ? ' na viagem ' + Via_s_(prev.NUMERO) : '') + '.' }); }
  });
  // 3. estorno de compra: informativo, na viagem da data
  livres('ESTORNO').forEach(function (x) {
    var u = Via_s_(x.USUARIO_ID), dia = Via_dia_(x.DATA), r = (deP[u] || []).filter(function (v) { return noPeriodo(v, dia); })[0] || null, l = L[x.ID];
    l.sol = r ? Via_s_(r.ID) : ''; l.situacao = 'CONCILIADO'; l.regra = 'ESTORNO';
  });
  // 4. gastos no cartão × gastos da prestação
  var grupos = {};
  livres('GASTO').forEach(function (x) { var k = [Via_s_(x.USUARIO_ID), Via_dia_(x.DATA), cent(x.VALOR), Cju_norm_(x.ESTABELECIMENTO || x.DESCRICAO)].join('|'); (grupos[k] = grupos[k] || []).push(x.ID); });
  var gastoCaju = function (g) { return Via_up_(g.PAGO_COM || 'CAJU') !== 'PROPRIO'; };
  var procurar = function (lista, x, exato) {
    var dia = Via_dia_(x.DATA), best = null, nota = -1;
    lista.forEach(function (g) {
      if (usG[g.ID] || !gastoCaju(g)) return;
      var d = Cju_diff_(g.DATA, dia); if (d > tol) return;
      var sim = Cju_parecido_(g.ESTABELECIMENTO, x.ESTABELECIMENTO || x.DESCRICAO, g.CNPJ, x.CNPJ);
      if (exato ? cent(g.VALOR) !== cent(x.VALOR) : (cent(g.VALOR) === cent(x.VALOR) || sim < 0.5)) return;
      var n = (exato ? 100 : 0) - d * 10 + sim * 5;
      if (n > nota) { nota = n; best = g; }
    });
    return best;
  };
  livres('GASTO').forEach(function (x) {
    var u = Via_s_(x.USUARIO_ID), dia = Via_dia_(x.DATA), l = L[x.ID];
    if (!u) { l.situacao = 'DIVERGENTE'; div('PESSOA_DESCONHECIDA', { extrato: x.ID, valor: x.VALOR, data: dia, texto: 'Transação de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' (' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + ') de "' + (Via_s_(x.PESSOA_TEXTO) || Cju_cpfMascara_(x.CPF)) + '", sem vínculo no SGO+.' }); return; }
    var minhas = deP[u] || [], dentro = minhas.filter(function (r) { return noPeriodo(r, dia); });
    dentro.sort(function (a, b) { var ea = Via_dia_(a.SAIDA_EM) <= dia && dia <= Via_dia_(a.CHEGADA_EM) ? 0 : 1, eb = Via_dia_(b.SAIDA_EM) <= dia && dia <= Via_dia_(b.CHEGADA_EM) ? 0 : 1; return ea - eb; });
    var gastosDe = function (rs) { var ids = rs.map(function (r) { return Via_s_(r.ID); }); return gastos.filter(function (g) { return ids.indexOf(Via_s_(g.SOLICITACAO_ID)) >= 0; }); };
    var r = dentro[0] || null;
    if (r) {
      l.sol = Via_s_(r.ID);
      var g = procurar(gastosDe(dentro), x, true);
      if (g) { usG[g.ID] = x.ID; l.gasto = g.ID; l.sol = Via_s_(g.SOLICITACAO_ID); l.situacao = 'CONCILIADO'; l.regra = 'AUTO'; return; }
      var gv = procurar(gastosDe(dentro), x, false);
      l.situacao = 'DIVERGENTE';
      if (gv) { usG[gv.ID] = x.ID; l.gasto = gv.ID; div('VALOR_DIFERENTE', { extrato: x.ID, gasto: gv.ID, sol: Via_s_(gv.SOLICITACAO_ID), valor: x.VALOR, diferenca: Via_r2_(Number(x.VALOR) - Number(gv.VALOR)), data: dia,
        texto: 'No cartão: ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' (' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + '). Na prestação: gasto nº ' + Via_s_(gv.ITEM_NUMERO) + ', ' + Via_moeda_(gv.VALOR) + ' em ' + Via_brDia_(gv.DATA) + ' (' + Via_s_(gv.ESTABELECIMENTO) + ').' }); return; }
      var k = [u, dia, cent(x.VALOR), Cju_norm_(x.ESTABELECIMENTO || x.DESCRICAO)].join('|');
      if ((grupos[k] || []).length > 1) { div('DUPLICIDADE', { extrato: x.ID, sol: l.sol, valor: x.VALOR, data: dia, texto: (grupos[k].length) + ' transações iguais de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' (' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + ') no cartão de ' + Via_s_(x.USUARIO_NOME) + ', e não há comprovante para todas.' }); return; }
      div('SEM_COMPROVANTE', { extrato: x.ID, sol: l.sol, valor: x.VALOR, data: dia, texto: 'Gasto de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' (' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + ') no cartão de ' + Via_s_(x.USUARIO_NOME) + ' sem gasto lançado na prestação da viagem ' + Via_s_(r.NUMERO) + '.' });
      return;
    }
    // fora de toda janela de viagem desta pessoa
    var perto = minhas.slice().sort(function (a, b) { return Math.min(Cju_diff_(a.SAIDA_EM, dia), Cju_diff_(a.CHEGADA_EM, dia)) - Math.min(Cju_diff_(b.SAIDA_EM, dia), Cju_diff_(b.CHEGADA_EM, dia)); })[0] || null;
    var gf = procurar(gastos.filter(function (g) { return minhas.some(function (r2) { return Via_s_(r2.ID) === Via_s_(g.SOLICITACAO_ID); }); }), x, true);
    if (gf) { usG[gf.ID] = x.ID; l.gasto = gf.ID; perto = porSol[Via_s_(gf.SOLICITACAO_ID)]; }
    l.sol = perto ? Via_s_(perto.ID) : ''; l.situacao = 'DIVERGENTE';
    div('FORA_DO_PERIODO', { extrato: x.ID, gasto: gf ? gf.ID : '', sol: l.sol, valor: x.VALOR, data: dia, texto: 'Gasto de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(dia) + ' (' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + ') no cartão de ' + Via_s_(x.USUARIO_NOME) + ', fora do período de qualquer viagem' + (perto ? ' (a mais perto é a ' + Via_s_(perto.NUMERO) + ', de ' + Via_brDia_(perto.SAIDA_EM) + ' a ' + Via_brDia_(perto.CHEGADA_EM) + ')' : '') + '.' + (gf ? ' Está lançado na prestação (gasto nº ' + Via_s_(gf.ITEM_NUMERO) + ').' : '') });
  });
  // 5. gastos da prestação pagos com o cartão e sem transação
  gastos.forEach(function (g) {
    if (usG[g.ID] || !gastoCaju(g)) return;
    var r = porSol[Via_s_(g.SOLICITACAO_ID)], dia = Via_dia_(g.DATA);
    var outra = linhas.filter(function (x) { var l = L[x.ID]; return !l.fixo && !l.gasto && Via_up_(x.TIPO) === 'GASTO' && Via_s_(x.USUARIO_ID) && Via_s_(x.USUARIO_ID) !== Via_s_(r.RESPONSAVEL_ID) && cent(x.VALOR) === cent(g.VALOR) && Cju_diff_(x.DATA, dia) <= tol; })[0];
    if (outra) {
      var lo = L[outra.ID]; lo.divs.forEach(function (k) { delete divs[k]; }); lo.divs = [];
      usG[g.ID] = outra.ID; lo.gasto = g.ID; lo.sol = Via_s_(r.ID); lo.situacao = 'DIVERGENTE';
      div('CARTAO_OUTRA_PESSOA', { extrato: outra.ID, gasto: g.ID, sol: Via_s_(r.ID), valor: g.VALOR, data: dia, texto: 'Gasto nº ' + Via_s_(g.ITEM_NUMERO) + ' da viagem ' + Via_s_(r.NUMERO) + ' (' + Via_moeda_(g.VALOR) + ', ' + Via_s_(g.ESTABELECIMENTO) + ') aparece no cartão de ' + Via_s_(outra.USUARIO_NOME) + ', não no de ' + Via_s_(r.RESPONSAVEL_NOME) + '.' });
      return;
    }
    if (Cju_coberto_(cob, dia)) div('SEM_TRANSACAO', { gasto: g.ID, sol: Via_s_(r.ID), valor: g.VALOR, data: dia, texto: 'Gasto nº ' + Via_s_(g.ITEM_NUMERO) + ' (' + Via_moeda_(g.VALOR) + ' em ' + Via_brDia_(dia) + ', ' + Via_s_(g.ESTABELECIMENTO) + ') lançado como cartão Caju e não aparece no extrato de ' + Via_s_(r.RESPONSAVEL_NOME) + '.' });
  });
  // 6. centro de custo do extrato × da viagem
  linhas.forEach(function (x) {
    var l = L[x.ID], r = l.sol ? porSol[l.sol] : null, cc = Via_up_(x.CENTRO_CUSTO_CAJU);
    if (!r || !cc || l.fixo || Via_up_(x.TIPO) === 'ESTORNO') return;
    if (cc !== Cju_centroCajuDe_(r) && cc !== Via_up_(r.CENTRO_CUSTO_CODIGO)) div('CENTRO_DIFERENTE', { extrato: x.ID, sol: l.sol, valor: x.VALOR, data: Via_dia_(x.DATA), texto: 'O extrato traz o centro de custo ' + cc + ' e a viagem ' + Via_s_(r.NUMERO) + ' é do ' + Via_up_(r.CENTRO_CUSTO_CODIGO) + (Cju_centroCajuDe_(r) !== Via_up_(r.CENTRO_CUSTO_CODIGO) ? ' (no Caju: ' + Cju_centroCajuDe_(r) + ')' : '') + '.' });
  });
  // 7. gastos sem a descrição de para que foi (lançados antes da regra)
  var minDesc = typeof VIA_DESCRICAO_MIN !== 'undefined' ? VIA_DESCRICAO_MIN : 10;
  gastos.forEach(function (g) { if ((typeof Via_letras_ === 'function' ? Via_letras_(g.DESCRICAO) : Via_s_(g.DESCRICAO).length) < minDesc) div('SEM_DESCRICAO', { gasto: g.ID, sol: Via_s_(g.SOLICITACAO_ID), valor: g.VALOR, data: Via_dia_(g.DATA), texto: 'Gasto nº ' + Via_s_(g.ITEM_NUMERO) + ' da viagem ' + Via_s_(porSol[Via_s_(g.SOLICITACAO_ID)].NUMERO) + ' (' + Via_moeda_(g.VALOR) + ', ' + Via_s_(g.ESTABELECIMENTO) + ') sem dizer para que foi.' }); });
  // 8. créditos: acima do aprovado e pedido pago parado
  viagens.forEach(function (r) { if (cent(r.CARREGADO_TOTAL) > cent(r.APROVADO_TOTAL) && cent(r.APROVADO_TOTAL) > 0) div('CREDITO_ACIMA_APROVADO', { sol: Via_s_(r.ID), valor: r.CARREGADO_TOTAL, diferenca: Via_r2_(Number(r.CARREGADO_TOTAL) - Number(r.APROVADO_TOTAL)), texto: 'Carregado ' + Via_moeda_(r.CARREGADO_TOTAL) + ', aprovado ' + Via_moeda_(r.APROVADO_TOTAL) + '.' }); });
  Cju_pedidosEmAndamento_().forEach(function (p) {
    if (!Via_s_(p.EFETIVADO_EM)) return;
    var horas = (Date.now() - Date.parse(Via_iso_(p.EFETIVADO_EM) + ':00-03:00')) / 36e5;
    if (horas > cfg.pedidoAlertaHoras) div('CREDITO_PENDENTE', { pedido: p.ID, sol: Via_s_(p.SOLICITACAO_ID), valor: p.VALOR, data: Via_dia_(p.EFETIVADO_EM), texto: 'Pedido ' + Via_s_(p.PEDIDO_CAJU_ID) + ' de ' + Via_moeda_(p.VALOR) + ' pago em ' + Via_br_(p.EFETIVADO_EM) + ' e ainda não creditado (' + (CJA_STATUS_PEDIDO[Via_up_(p.STATUS_CAJU)] || Via_s_(p.STATUS_CAJU) || 'sem status') + ').' });
  });
  // 9. saldo que ficou no cartão depois do fechamento da viagem
  viagens.forEach(function (r) {
    var s = Via_up_(r.SITUACAO);
    if (['AGUARDANDO_CIENCIA', 'ENCERRADA'].indexOf(s) < 0 || !Cju_coberto_(cob, Via_dia_(r.CHEGADA_EM))) return;
    var k = Cju_saldoCartao_(r, linhas, L);
    if (k.saldo > 0) div('SALDO_NAO_DEVOLVIDO', { sol: Via_s_(r.ID), valor: k.saldo / 100, texto: 'Pelo extrato, sobraram ' + Cju_centMoeda_(k.saldo) + ' no cartão de ' + Via_s_(r.RESPONSAVEL_NOME) + ' (carregado ' + Cju_centMoeda_(k.carregado) + ', gasto ' + Cju_centMoeda_(k.gasto) + ', estornos ' + Cju_centMoeda_(k.estorno) + ', recolhido ' + Cju_centMoeda_(k.recolhido) + ').' });
  });
  return Cju_gravarConciliacao_(eu, linhas, L, divs, gastos, cargas, acertos, viagens, agora);
}
/** Saldo pelo extrato (centavos): carregado − gasto no cartão + estornos − recolhido. */
function Cju_saldoCartao_(r, linhas, L) {
  var id = Via_s_(r.ID), k = { carregado: Via_cent_(r.CARREGADO_TOTAL), gasto: 0, estorno: 0, recolhido: 0 };
  linhas.forEach(function (x) {
    var sol = L ? L[x.ID].sol : Via_s_(x.SOLICITACAO_ID), sit = L ? L[x.ID].situacao : Via_up_(x.SITUACAO);
    if (sol !== id || sit === 'IGNORADO') return;
    var t = Via_up_(x.TIPO), v = Via_cent_(x.VALOR);
    if (t === 'GASTO') k.gasto += v; else if (t === 'ESTORNO') k.estorno += v; else if (t === 'RECOLHIMENTO') k.recolhido += v;
  });
  k.saldo = k.carregado - k.gasto + k.estorno - k.recolhido;
  return k;
}
function Cju_gravarConciliacao_(eu, linhas, L, divs, gastos, cargas, acertos, viagens, agora) {
  var res = { linhas: linhas.length, conciliadas: 0, divergentes: 0, pendentes: 0, resolvidas: 0, novas: 0, sanadas: 0, reabertas: 0 };
  var existentes = Via_ler_(CJU_ABAS.DIVERGENCIAS), porChave = {};
  existentes.forEach(function (d) { porChave[Via_s_(d.CHAVE)] = d; });
  // divergências: novas, atualizadas, sanadas
  Object.keys(divs).forEach(function (k) {
    var n = divs[k], e = porChave[k];
    if (!e) { Cju_inserir_(CJU_ABAS.DIVERGENCIAS, Object.assign({ ID: Via_id_(), SITUACAO: 'ABERTA', CRIADA_EM: agora, ATUALIZADA_EM: agora, AVISADO_EM: '', AVISADO_POR_NOME: '', RESOLUCAO: '', MOTIVO: '', RESOLVIDA_EM: '', RESOLVIDA_POR_ID: '', RESOLVIDA_POR_NOME: '', FECHAMENTO_ID: '' }, n)); res.novas++; return; }
    if (Via_s_(e.FECHAMENTO_ID)) return;
    var s = Via_up_(e.SITUACAO), mud = {};
    ['VALOR', 'DIFERENCA', 'DESCRICAO', 'DONO_ID', 'DONO_NOME', 'NUMERO', 'SOLICITACAO_ID', 'GASTO_ID'].forEach(function (c) { if (Via_s_(e[c]) !== Via_s_(n[c])) mud[c] = n[c]; });
    if (s === 'SANADA') { mud.SITUACAO = 'ABERTA'; mud.RESOLUCAO = ''; mud.MOTIVO = ''; mud.RESOLVIDA_EM = ''; res.reabertas++; }
    if (Object.keys(mud).length) { mud.ATUALIZADA_EM = agora; Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, e.ID, mud); }
  });
  existentes.forEach(function (e) {
    if (divs[Via_s_(e.CHAVE)] || Via_s_(e.FECHAMENTO_ID) || Via_up_(e.SITUACAO) !== 'ABERTA') return;
    // a linha virou decisão do Financeiro (ligada à mão ou desconsiderada): a divergência fica resolvida com a decisão dela
    var lx = Via_s_(e.EXTRATO_ID) && L[Via_s_(e.EXTRATO_ID)] ? L[Via_s_(e.EXTRATO_ID)] : null;
    if (lx && lx.fixo && !Via_s_(lx.x.FECHAMENTO_ID)) {
      var ign = lx.regra === 'IGNORADA';
      Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, e.ID, { SITUACAO: 'RESOLVIDA', RESOLUCAO: ign ? 'DESCONSIDERADA' : 'CORRIGIDA', MOTIVO: (ign ? 'Transação desconsiderada: ' : 'Ligada à mão: ') + (Via_s_(lx.x.MOTIVO) || 'decisão do Financeiro'),
        RESOLVIDA_EM: agora, RESOLVIDA_POR_NOME: Via_s_(lx.x.CONCILIADO_POR_NOME) || 'Financeiro', ATUALIZADA_EM: agora });
      res.resolvidasDecisao = (res.resolvidasDecisao || 0) + 1; return;
    }
    if (lx && lx.fixo) return;
    Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, e.ID, { SITUACAO: 'SANADA', RESOLUCAO: 'SANADA', MOTIVO: 'A condição deixou de existir na conciliação de ' + Via_br_(agora) + '.', RESOLVIDA_EM: agora, RESOLVIDA_POR_NOME: 'sistema', ATUALIZADA_EM: agora });
    res.sanadas++;
  });
  Cju_memoLimpar_();
  var abertas = {};
  Via_ler_(CJU_ABAS.DIVERGENCIAS).forEach(function (d) { if (Via_up_(d.SITUACAO) === 'ABERTA' && Via_s_(d.EXTRATO_ID)) abertas[Via_s_(d.EXTRATO_ID)] = true; });
  var porGasto = {}, porCarga = {}, porAcerto = {};
  // linhas
  linhas.forEach(function (x) {
    var l = L[x.ID];
    if (!l.fixo) {
      if (l.situacao === 'DIVERGENTE' && !abertas[x.ID]) l.situacao = 'RESOLVIDO';
      var novo = { SOLICITACAO_ID: l.sol, NUMERO: l.sol ? Via_s_((SGO_DATA.getById(VIA_ABAS.SOLICITACOES, l.sol) || {}).NUMERO) : '', GASTO_ID: l.gasto, CARGA_ID: l.carga, ACERTO_ID: l.acerto, SITUACAO: l.situacao, REGRA: l.regra };
      if (x._pessoaNova) { novo.USUARIO_ID = x.USUARIO_ID; novo.USUARIO_NOME = x.USUARIO_NOME; novo.PESSOA_REGRA = x.PESSOA_REGRA; }
      if (l.situacao === 'CONCILIADO' && Via_up_(x.SITUACAO) !== 'CONCILIADO') { novo.CONCILIADO_EM = agora; novo.CONCILIADO_POR_NOME = eu ? eu.nome + ' (automático)' : 'sistema'; }
      var muda = Object.keys(novo).some(function (c) { return Via_s_(x[c]) !== Via_s_(novo[c]); });
      if (muda) { if (Via_s_(x.GASTO_ID) && Via_s_(x.GASTO_ID) !== l.gasto || Via_s_(x.CARGA_ID) && Via_s_(x.CARGA_ID) !== l.carga || Via_s_(x.ACERTO_ID) && Via_s_(x.ACERTO_ID) !== l.acerto) Cju_desfazerLigacoes_(x); SGO_DATA.update(CJU_ABAS.EXTRATO, x.ID, novo); }
    }
    var sitFinal = l.fixo ? Via_up_(x.SITUACAO) : l.situacao;
    if (sitFinal === 'CONCILIADO') res.conciliadas++; else if (sitFinal === 'DIVERGENTE') res.divergentes++; else if (sitFinal === 'RESOLVIDO' || sitFinal === 'IGNORADO') res.resolvidas++; else res.pendentes++;
    if (l.gasto) porGasto[l.gasto] = { id: x.ID, sit: sitFinal === 'CONCILIADO' || sitFinal === 'RESOLVIDO' ? 'CONCILIADO' : 'DIVERGENTE' };
    if (l.carga) porCarga[l.carga] = x.ID;
    if (l.acerto) porAcerto[l.acerto] = x.ID;
  });
  // colunas reservadas do Depósito de viagem
  var divGasto = {};
  Object.keys(divs).forEach(function (k) { if (divs[k].GASTO_ID && !divs[k].EXTRATO_ID) divGasto[divs[k].GASTO_ID] = divs[k].TIPO; });
  gastos.forEach(function (g) {
    var p = porGasto[g.ID], sit = p ? p.sit : divGasto[g.ID] === 'SEM_TRANSACAO' ? 'SEM_TRANSACAO' : '', tid = p ? p.id : '';
    if (Via_s_(g.TRANSACAO_ID) !== tid || Via_s_(g.CONCILIACAO_SITUACAO) !== sit) SGO_DATA.update(VIA_ABAS.PRESTACOES, g.ID, { TRANSACAO_ID: tid, CONCILIACAO_SITUACAO: sit });
  });
  cargas.forEach(function (c) { var t = porCarga[c.ID] || ''; if (Via_s_(c.EXTRATO_ID) !== t) SGO_DATA.update(VIA_ABAS.CARGAS, c.ID, { EXTRATO_ID: t, CONCILIADA_EM: t ? agora : '' }); });
  acertos.forEach(function (a) { var t = porAcerto[a.ID] || ''; if (Via_s_(a.TRANSACAO_ID) !== t) SGO_DATA.update(VIA_ABAS.ACERTOS, a.ID, { TRANSACAO_ID: t, CONCILIADO_EM: t ? agora : '' }); });
  Cju_memoLimpar_();
  // coluna do Kanban gravada na solicitação
  var vs = Cju_viagens_();
  vs.forEach(function (v) { if (Via_s_(v.r.CONCILIACAO_SITUACAO) !== v.coluna) SGO_DATA.update(VIA_ABAS.SOLICITACOES, v.r.ID, { CONCILIACAO_SITUACAO: v.coluna }); });
  res.viagens = vs.length; res.conciliadasViagens = vs.filter(function (v) { return v.coluna === 'CONCILIADA' || v.coluna === 'FECHADA'; }).length;
  Cju_historico_('CONCILIACAO', 'GERAL', 'CONCILIADO', eu, Cju_resumoConciliacaoTxt_(res));
  Cju_memoLimpar_();
  return res;
}
function Cju_resumoConciliacaoTxt_(r) {
  if (!r) return '';
  return 'Conciliação: ' + r.linhas + (r.linhas === 1 ? ' transação' : ' transações') + ' do extrato; ' + r.conciliadas + ' conciliadas, ' + r.divergentes + ' com divergência' + (r.pendentes ? ', ' + r.pendentes + ' a conciliar' : '') +
    (r.resolvidas ? ', ' + r.resolvidas + ' resolvidas ou desconsideradas' : '') + '. Divergências novas: ' + r.novas + (r.sanadas ? '; sanadas sozinhas: ' + r.sanadas : '') + '.';
}

// ------------------------------------------------------------
// VIAGENS (números de cada uma, para painel, fechamento e relatórios)
// ------------------------------------------------------------
function Cju_viagens_(filtro) {
  filtro = filtro || {};
  var sols = Via_ler_(VIA_ABAS.SOLICITACOES), pedidos = Cju_ler_(CJU_ABAS.PEDIDOS), linhas = Cju_linhasAtivas_(), divs = Cju_ler_(CJU_ABAS.DIVERGENCIAS), cob = Cju_cobertura_();
  var gastos = Via_ler_(VIA_ABAS.PRESTACOES).filter(function (g) { return !Via_s_(g.REMOVIDO_EM); }), hoje = Via_agora_().slice(0, 16);
  var fechos = Cju_ler_(CJU_ABAS.FECHAMENTOS).filter(function (f) { return Via_up_(f.SITUACAO) === 'FECHADO'; });
  return sols.filter(function (r) {
    var temPed = pedidos.some(function (p) { return Via_s_(p.SOLICITACAO_ID) === Via_s_(r.ID); });
    if (!(Number(r.CARREGADO_TOTAL) > 0 || temPed || (Via_up_(r.APROVACAO_VALIDA) === 'SIM' && ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0))) return false;
    if (filtro.centro && Via_up_(r.CENTRO_CUSTO_CODIGO) !== Via_up_(filtro.centro)) return false;
    if (filtro.pessoa && Via_s_(r.RESPONSAVEL_ID) !== Via_s_(filtro.pessoa)) return false;
    var s = Via_dia_(r.SAIDA_EM), c = Via_dia_(r.CHEGADA_EM);
    if (filtro.de && (!c || c < filtro.de)) return false;
    if (filtro.ate && (!s || s > filtro.ate)) return false;
    return true;
  }).map(function (r) {
    var id = Via_s_(r.ID), ps = pedidos.filter(function (p) { return Via_s_(p.SOLICITACAO_ID) === id; }), ls = linhas.filter(function (x) { return Via_s_(x.SOLICITACAO_ID) === id; });
    var ds = divs.filter(function (d) { return Via_s_(d.SOLICITACAO_ID) === id; }), abertas = ds.filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; });
    var gs = gastos.filter(function (g) { return Via_s_(g.SOLICITACAO_ID) === id; }), k = Cju_saldoCartao_(r, ls, null);
    var emAnd = ps.filter(function (p) { return CJU_PED_FINAIS.indexOf(Via_up_(p.SITUACAO)) < 0; }).length;
    var carregado = Via_cent_(r.CARREGADO_TOTAL), terminou = !!Via_iso_(r.CHEGADA_EM) && Via_iso_(r.CHEGADA_EM) <= hoje;
    var coberta = Cju_coberto_(cob, Via_dia_(r.SAIDA_EM)) && Cju_coberto_(cob, Via_dia_(r.CHEGADA_EM));
    var semTransacao = gs.filter(function (g) { return Via_up_(g.PAGO_COM || 'CAJU') !== 'PROPRIO' && !Via_s_(g.TRANSACAO_ID); }).length;
    var pend = ls.filter(function (x) { return Via_up_(x.SITUACAO) === 'PENDENTE'; }).length;
    var fechada = Via_up_(r.CONCILIACAO_SITUACAO) === 'FECHADA' && fechos.some(function (f) { return Cju_fechamentoCobre_(f, r); });
    var col = fechada ? 'FECHADA' : emAnd ? 'CREDITO' : carregado === 0 ? 'AGUARDANDO_CARGA' : !terminou ? 'EM_VIAGEM' : !coberta ? 'SEM_EXTRATO' : abertas.length ? 'DIVERGENCIA' : (pend || semTransacao) ? 'A_CONCILIAR' : 'CONCILIADA';
    if (col === 'EM_VIAGEM' && abertas.length) col = 'DIVERGENCIA';
    var contas = typeof Via_contasPrestacao_ === 'function' && carregado > 0 ? Via_contasPrestacao_(r) : null;
    var taxa = ps.filter(function (p) { return Via_up_(p.SITUACAO) === 'CREDITADO'; }).reduce(function (s2, p) { return s2 + (Number(p.TAXA_CENTAVOS) || 0); }, 0);
    return { r: r, id: id, numero: Via_s_(r.NUMERO), pessoaId: Via_s_(r.RESPONSAVEL_ID), pessoa: Via_s_(r.RESPONSAVEL_NOME), centro: Via_up_(r.CENTRO_CUSTO_CODIGO), centroCaju: Cju_centroCajuDe_(r),
      destino: Via_s_(r.DESTINO_CIDADE) + '/' + Via_up_(r.DESTINO_UF), saida: Via_iso_(r.SAIDA_EM), chegada: Via_iso_(r.CHEGADA_EM), situacao: Via_sitEfetiva_(r), situacaoNome: VIA_SITUACOES[Via_sitEfetiva_(r)] || '',
      vinculo: Cju_vinculoTexto_(r), aprovado: Via_cent_(r.APROVADO_TOTAL), carregado: carregado, taxa: taxa, pedidos: ps.length, pedidosAndamento: emAnd,
      gastoCartao: k.gasto, estorno: k.estorno, recolhido: k.recolhido, saldoCartao: k.saldo, coberta: coberta, linhas: ls.length, linhasPendentes: pend, semTransacao: semTransacao,
      divAbertas: abertas.length, divTotal: ds.length, coluna: col, terminou: terminou, contas: contas, gastos: gs };
  });
}
function Cju_vinculoTexto_(r) {
  var t = Via_up_(r.VINCULO_TIPO), nome = (VIA_VINCULOS && VIA_VINCULOS[t]) || '';
  if (t === 'CLIENTE') return 'Cliente: ' + (Via_s_(r.CLIENTE_NOME) || '—');
  if (t === 'PROPOSTA' || t === 'OS') return nome + ' ' + Via_s_(r.VINCULO_REF) + (Via_s_(r.CLIENTE_NOME) ? ' (' + Via_s_(r.CLIENTE_NOME) + ')' : '');
  if (t === 'INTERNA') return 'Viagem interna';
  return nome || '—';
}
function Cju_fechamentoCobre_(f, r) {
  var c = Via_dia_(r.CHEGADA_EM), cc = Via_up_(f.CENTRO);
  return !!c && Via_dia_(f.DE) <= c && c <= Via_dia_(f.ATE) && (!cc || cc === Via_up_(r.CENTRO_CUSTO_CODIGO));
}
function Cju_viagemResumo_(v) {
  return { id: v.id, numero: v.numero, pessoa: v.pessoa, pessoaId: v.pessoaId, centro: v.centro, destino: v.destino, saida: Via_br_(v.saida), chegada: Via_br_(v.chegada), saidaIso: v.saida, chegadaIso: v.chegada,
    situacaoNome: v.situacaoNome, coluna: v.coluna, colunaNome: Cju_colNome_(v.coluna), cor: Cju_colCor_(v.coluna), vinculo: v.vinculo, aprovadoTxt: Cju_centMoeda_(v.aprovado), carregadoTxt: Cju_centMoeda_(v.carregado),
    gastoCartaoTxt: Cju_centMoeda_(v.gastoCartao), saldoCartaoTxt: Cju_centMoeda_(v.saldoCartao), saldoCartao: v.saldoCartao / 100, gastoLancadoTxt: v.contas ? Via_moeda_(v.contas.gasto) : '',
    divAbertas: v.divAbertas, linhasPendentes: v.linhasPendentes, semTransacao: v.semTransacao, coberta: v.coberta, pedidosAndamento: v.pedidosAndamento, taxaTxt: v.taxa ? Cju_centMoeda_(v.taxa) : '' };
}

// ------------------------------------------------------------
// TELAS: painel, linhas, divergências, viagem
// ------------------------------------------------------------
function Cju_contagens_(eu) {
  var pedidos = Cju_ler_(CJU_ABAS.PEDIDOS), divs = Cju_ler_(CJU_ABAS.DIVERGENCIAS), linhas = Cju_linhasAtivas_();
  return { pedidosAcao: pedidos.filter(function (p) { return ['SALDO_INSUFICIENTE', 'AGUARDANDO_PIX', 'VERIFICAR', 'CONFERIR_VALOR', 'RASCUNHO'].indexOf(Via_up_(p.SITUACAO)) >= 0; }).length,
    pedidosAndamento: pedidos.filter(function (p) { return CJU_PED_FINAIS.indexOf(Via_up_(p.SITUACAO)) < 0; }).length,
    divergencias: divs.filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; }).length, pendentes: linhas.filter(function (x) { return Via_up_(x.SITUACAO) === 'PENDENTE'; }).length,
    aguardandoCarga: Via_ler_(VIA_ABAS.SOLICITACOES).filter(function (r) { return ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0 && Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0)) > 0 && !Cju_pedidoEmAndamentoDe_(r.ID); }).length,
    importacoes: Cju_ler_(CJU_ABAS.IMPORTACOES).filter(function (x) { return !Via_s_(x.DESFEITA_EM); }).length };
}
function Cju_painel_(eu, d) {
  d = d || {};
  var vs = Cju_viagens_({ centro: d.centro, pessoa: d.pessoa, de: Via_dia_(d.de), ate: Via_dia_(d.ate) });
  var soma = function (k) { return vs.reduce(function (s, v) { return s + (Number(v[k]) || 0); }, 0); };
  var centros = {}, pessoas = {};
  Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (r) { if (Via_s_(r.CENTRO_CUSTO_CODIGO)) centros[Via_up_(r.CENTRO_CUSTO_CODIGO)] = true; if (Via_s_(r.RESPONSAVEL_ID)) pessoas[Via_s_(r.RESPONSAVEL_ID)] = Via_s_(r.RESPONSAVEL_NOME); });
  return { viagens: vs.map(Cju_viagemResumo_), colunas: CJU_COLUNAS_KANBAN.map(function (c) { return { cod: c[0], nome: c[1], cor: c[2] }; }), contagens: Cju_contagens_(eu), integracao: CajuApi_situacao_(),
    totais: { viagens: vs.length, aprovadoTxt: Cju_centMoeda_(soma('aprovado')), carregadoTxt: Cju_centMoeda_(soma('carregado')), taxaTxt: Cju_centMoeda_(soma('taxa')), gastoCartaoTxt: Cju_centMoeda_(soma('gastoCartao')),
      saldoCartaoTxt: Cju_centMoeda_(vs.filter(function (v) { return v.coberta; }).reduce(function (s, v) { return s + v.saldoCartao; }, 0)), divAbertas: soma('divAbertas') },
    centros: Object.keys(centros).sort(), pessoas: Object.keys(pessoas).map(function (k) { return { id: k, nome: pessoas[k] }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
    poderes: Cju_poderes_(eu), config: { categoria: Cju_config_().categoria }, ganttJs: typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() : '' };
}
function Cju_linhaTela_(x) {
  var s = Via_up_(x.SITUACAO);
  return { id: Via_s_(x.ID), data: Via_brDia_(x.DATA) + (Via_s_(x.HORA) ? ' ' + Via_s_(x.HORA) : ''), dataIso: Via_dia_(x.DATA), valor: Number(x.VALOR) || 0, valorTxt: Via_moeda_(x.VALOR), tipo: Via_up_(x.TIPO), tipoNome: CJU_TIPOS_LINHA[Via_up_(x.TIPO)] || '',
    estabelecimento: Via_s_(x.ESTABELECIMENTO) || Via_s_(x.DESCRICAO), descricao: Via_s_(x.DESCRICAO), cnpj: Via_s_(x.CNPJ), pessoaTexto: Via_s_(x.PESSOA_TEXTO) || Cju_cpfMascara_(x.CPF), usuarioId: Via_s_(x.USUARIO_ID), usuarioNome: Via_s_(x.USUARIO_NOME),
    pessoaRegra: Via_s_(x.PESSOA_REGRA), centroCaju: Via_s_(x.CENTRO_CUSTO_CAJU), numero: Via_s_(x.NUMERO), solicitacaoId: Via_s_(x.SOLICITACAO_ID), gastoId: Via_s_(x.GASTO_ID), cargaId: Via_s_(x.CARGA_ID), acertoId: Via_s_(x.ACERTO_ID),
    situacao: s, situacaoNome: CJU_LIN_SIT[s] || s, regra: Via_up_(x.REGRA), motivo: Via_s_(x.MOTIVO), fechada: !!Via_s_(x.FECHAMENTO_ID), cartao: Via_s_(x.CARTAO_FINAL), identificador: Via_s_(x.IDENTIFICADOR) };
}
function Cju_linhasTela_(eu, d) {
  d = d || {};
  var l = Cju_linhasAtivas_().filter(function (x) {
    if (d.situacao && Via_up_(x.SITUACAO) !== Via_up_(d.situacao)) return false;
    if (d.pessoa && Via_s_(x.USUARIO_ID) !== Via_s_(d.pessoa)) return false;
    if (d.solicitacao && Via_s_(x.SOLICITACAO_ID) !== Via_s_(d.solicitacao)) return false;
    if (d.de && Via_dia_(x.DATA) < Via_dia_(d.de)) return false;
    if (d.ate && Via_dia_(x.DATA) > Via_dia_(d.ate)) return false;
    return true;
  }).sort(function (a, b) { return Via_s_(b.DATA).localeCompare(Via_s_(a.DATA)); });
  var us = Cju_usuariosTodos_();
  return { linhas: l.slice(0, 500).map(Cju_linhaTela_), total: l.length, pessoas: Object.keys(us).filter(function (k) { return us[k].ativo; }).map(function (k) { return { id: k, nome: us[k].nome }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
    situacoes: CJU_LIN_SIT, podeConciliar: Cju_pode_(eu, 'CAJU_CONCILIAR') };
}
function Cju_divTela_(d) {
  var t = CJU_DIV_TIPOS[Via_up_(d.TIPO)] || { nome: d.TIPO, fazer: '' }, s = Via_up_(d.SITUACAO);
  return { id: Via_s_(d.ID), tipo: Via_up_(d.TIPO), tipoNome: t.nome, oQueFazer: t.fazer, situacao: s, situacaoNome: s === 'ABERTA' ? 'Aberta' : s === 'SANADA' ? 'Sanada sozinha' : s === 'RESOLVIDA' ? 'Resolvida' : s,
    numero: Via_s_(d.NUMERO), solicitacaoId: Via_s_(d.SOLICITACAO_ID), extratoId: Via_s_(d.EXTRATO_ID), gastoId: Via_s_(d.GASTO_ID), pedidoId: Via_s_(d.PEDIDO_ID), valorTxt: Via_moeda_(d.VALOR),
    diferencaTxt: Number(d.DIFERENCA) ? Via_moeda_(d.DIFERENCA) : '', data: Via_brDia_(d.DATA), descricao: Via_s_(d.DESCRICAO), dono: Via_s_(d.DONO_NOME), donoId: Via_s_(d.DONO_ID), centro: Via_s_(d.CENTRO_CUSTO_CODIGO),
    criada: Via_br_(d.CRIADA_EM), avisadoEm: Via_br_(d.AVISADO_EM), avisadoPor: Via_s_(d.AVISADO_POR_NOME), resolucao: Via_up_(d.RESOLUCAO), resolucaoNome: CJU_RESOLUCOES[Via_up_(d.RESOLUCAO)] || (Via_up_(d.RESOLUCAO) === 'SANADA' ? 'Sanada sozinha' : ''),
    motivo: Via_s_(d.MOTIVO), resolvidaEm: Via_br_(d.RESOLVIDA_EM), resolvidaPor: Via_s_(d.RESOLVIDA_POR_NOME), fechada: !!Via_s_(d.FECHAMENTO_ID) };
}
function Cju_divergenciasTela_(eu, d) {
  d = d || {};
  var sit = Via_up_(d.situacao || 'ABERTA');
  var l = Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (x) { return (sit === 'TODAS' || Via_up_(x.SITUACAO) === sit) && (!d.solicitacao || Via_s_(x.SOLICITACAO_ID) === Via_s_(d.solicitacao)) && (!d.tipo || Via_up_(x.TIPO) === Via_up_(d.tipo)); })
    .sort(function (a, b) { return Via_s_(b.CRIADA_EM).localeCompare(Via_s_(a.CRIADA_EM)); });
  var porTipo = {}; Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (x) { return Via_up_(x.SITUACAO) === 'ABERTA'; }).forEach(function (x) { porTipo[Via_up_(x.TIPO)] = (porTipo[Via_up_(x.TIPO)] || 0) + 1; });
  return { divergencias: l.slice(0, 400).map(Cju_divTela_), total: l.length, resolucoes: CJU_RESOLUCOES, tipos: Object.keys(CJU_DIV_TIPOS).map(function (k) { return { cod: k, nome: CJU_DIV_TIPOS[k].nome, abertas: porTipo[k] || 0 }; }),
    podeConciliar: Cju_pode_(eu, 'CAJU_CONCILIAR') };
}
function Cju_viagemTela_(eu, d) {
  var r = Via_solicitacao_(d.id), v = Cju_viagens_({}).filter(function (x) { return x.id === Via_s_(r.ID); })[0];
  var ls = Cju_linhasAtivas_().filter(function (x) { return Via_s_(x.SOLICITACAO_ID) === Via_s_(r.ID) || (Via_s_(x.USUARIO_ID) === Via_s_(r.RESPONSAVEL_ID) && Via_up_(x.SITUACAO) === 'PENDENTE'); }).map(Cju_linhaTela_);
  var gastos = Via_itensAtivos_(r.ID).map(function (g) { var t = Via_itemParaTela_(g, r); t.transacaoId = Via_s_(g.TRANSACAO_ID); t.conciliacao = Via_s_(g.CONCILIACAO_SITUACAO); return t; });
  return { viagem: v ? Cju_viagemResumo_(v) : { id: Via_s_(r.ID), numero: Via_s_(r.NUMERO), pessoa: Via_s_(r.RESPONSAVEL_NOME), colunaNome: 'Sem carga' }, linhas: ls, gastos: gastos,
    cargas: Via_ler_(VIA_ABAS.CARGAS).filter(function (c) { return Via_s_(c.SOLICITACAO_ID) === Via_s_(r.ID); }).map(function (c) { return { id: Via_s_(c.ID), data: Via_brDia_(c.DATA), valorTxt: Via_moeda_(c.VALOR), origem: Via_up_(c.ORIGEM) === 'CAJU_API' ? 'Pelo Caju (pedido ' + Via_s_(c.PEDIDO_CAJU_ID) + ')' : 'Registro manual', noExtrato: !!Via_s_(c.EXTRATO_ID) }; }),
    acertos: Via_acertosDe_(r.ID).map(function (a) { return { id: Via_s_(a.ID), tipo: Via_up_(a.TIPO) === 'DEVOLUCAO' ? 'Devolução' : 'Reembolso', data: Via_brDia_(a.DATA), valorTxt: Via_moeda_(a.VALOR), noExtrato: !!Via_s_(a.TRANSACAO_ID) }; }),
    pedidos: Cju_pedidosDe_(r.ID).map(function (p) { return Cju_pedidoTela_(p, eu); }), divergencias: Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (x) { return Via_s_(x.SOLICITACAO_ID) === Via_s_(r.ID); }).map(Cju_divTela_),
    envolvido: Via_conflito_(r).indexOf(eu.id) >= 0, podeConciliar: Cju_pode_(eu, 'CAJU_CONCILIAR') };
}

// ------------------------------------------------------------
// AÇÕES MANUAIS DO FINANCEIRO (sempre com a trava, e a conciliação roda de novo)
// ------------------------------------------------------------
function Cju_linha_(id) { var x = Cju_porId_(CJU_ABAS.EXTRATO, id); if (!x || Via_s_(x.REMOVIDA_EM)) throw new Error('Transação do extrato não encontrada. Atualize a tela.'); return x; }
function Cju_exigirAberta_(x) { if (Via_s_(x.FECHAMENTO_ID)) throw new Error('Não foi possível mudar: esta transação está em período fechado. Reabra o fechamento (com motivo) antes.'); }
function Cju_depoisDeMudar_(eu, msg) { var conc = Cju_conciliar_(eu); return { resumo: conc, message: msg + ' ' + Cju_resumoConciliacaoTxt_(conc) }; }
/** Liga à mão. d: { linhaId, gastoId | cargaId | acertoId, motivo }. Valor diferente exige motivo. */
function Cju_ligar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'ligar a transação');
  d = d || {};
  var msg = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_linha_(d.linhaId), alvo, aba, campo, nome;
    Cju_exigirAberta_(x);
    if (d.gastoId) { aba = VIA_ABAS.PRESTACOES; campo = 'GASTO_ID'; nome = 'gasto'; }
    else if (d.cargaId) { aba = VIA_ABAS.CARGAS; campo = 'CARGA_ID'; nome = 'carga'; }
    else if (d.acertoId) { aba = VIA_ABAS.ACERTOS; campo = 'ACERTO_ID'; nome = 'acerto'; }
    else throw new Error('Não foi possível ligar: escolha o gasto, a carga ou o acerto.');
    alvo = SGO_DATA.getById(aba, Via_s_(d.gastoId || d.cargaId || d.acertoId));
    if (!alvo || Via_s_(alvo.REMOVIDO_EM)) throw new Error('Não foi possível ligar: o ' + nome + ' escolhido não existe mais. Atualize a tela.');
    var r = Via_solicitacao_(alvo.SOLICITACAO_ID);
    Cju_exigirNaoEnvolvido_(eu, r, 'ligar a transação');
    var outra = Cju_linhasAtivas_().filter(function (y) { return Via_s_(y.ID) !== Via_s_(x.ID) && Via_s_(y[campo]) === Via_s_(alvo.ID) && Via_up_(y.REGRA) === 'MANUAL'; })[0];
    if (outra) throw new Error('Não foi possível ligar: este ' + nome + ' já está ligado à mão a outra transação (' + Via_brDia_(outra.DATA) + ', ' + Via_moeda_(outra.VALOR) + '). Desligue antes.');
    var motivo = Via_texto_(d.motivo, 400), dif = Via_cent_(alvo.VALOR) !== Via_cent_(x.VALOR);
    if (dif && motivo.length < 15) throw new Error('Não foi possível ligar: os valores são diferentes (' + Via_moeda_(x.VALOR) + ' no extrato, ' + Via_moeda_(alvo.VALOR) + ' no ' + nome + '). Escreva o motivo (15 letras ou mais), por exemplo "gorjeta paga à parte".');
    Cju_desfazerLigacoes_(x);
    var c = { SOLICITACAO_ID: r.ID, NUMERO: r.NUMERO, GASTO_ID: '', CARGA_ID: '', ACERTO_ID: '', SITUACAO: 'CONCILIADO', REGRA: 'MANUAL', MOTIVO: motivo, CONCILIADO_EM: Via_agora_(), CONCILIADO_POR_NOME: eu.nome };
    c[campo] = Via_s_(alvo.ID);
    Cju_atualizar_(CJU_ABAS.EXTRATO, x.ID, c);
    Cju_historico_('EXTRATO', x.ID, 'LIGADA_A_MAO', eu, 'Transação de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(x.DATA) + ' ligada ao ' + nome + ' da viagem ' + Via_s_(r.NUMERO) + (motivo ? '. Motivo: ' + motivo : '') + '.');
    return 'Transação ligada ao ' + nome + ' da viagem ' + Via_s_(r.NUMERO) + '.';
  });
  return Cju_depoisDeMudar_(eu, msg);
}
function Cju_desligar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'desligar a transação');
  var msg = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_linha_(d.linhaId); Cju_exigirAberta_(x);
    if (['MANUAL', 'IGNORADA'].indexOf(Via_up_(x.REGRA)) < 0) throw new Error('Não foi possível desligar: só a ligação feita à mão ou a linha desconsiderada voltam atrás. A ligação automática muda sozinha quando a prestação muda.');
    if (Via_s_(x.SOLICITACAO_ID)) Cju_exigirNaoEnvolvido_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, Via_s_(x.SOLICITACAO_ID)), 'desligar a transação');
    Cju_desfazerLigacoes_(x);
    Cju_atualizar_(CJU_ABAS.EXTRATO, x.ID, { SOLICITACAO_ID: '', NUMERO: '', GASTO_ID: '', CARGA_ID: '', ACERTO_ID: '', SITUACAO: 'PENDENTE', REGRA: '', MOTIVO: '', CONCILIADO_EM: '', CONCILIADO_POR_NOME: '' });
    Cju_historico_('EXTRATO', x.ID, 'DESLIGADA', eu, 'Ligação feita à mão (ou desconsideração) desfeita.');
    return 'Transação solta: a conciliação automática decide de novo.';
  });
  return Cju_depoisDeMudar_(eu, msg);
}
function Cju_ignorarLinha_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'desconsiderar a transação');
  var motivo = Via_texto_(d && d.motivo, 400);
  if (motivo.length < 15) throw new Error('Não foi possível desconsiderar: escreva o motivo (15 letras ou mais). A transação desconsiderada aparece no A4 do fechamento com o motivo.');
  var msg = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_linha_(d.linhaId); Cju_exigirAberta_(x);
    if (Via_s_(x.SOLICITACAO_ID)) Cju_exigirNaoEnvolvido_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, Via_s_(x.SOLICITACAO_ID)), 'desconsiderar a transação');
    Cju_desfazerLigacoes_(x);
    Cju_atualizar_(CJU_ABAS.EXTRATO, x.ID, { GASTO_ID: '', CARGA_ID: '', ACERTO_ID: '', SITUACAO: 'IGNORADO', REGRA: 'IGNORADA', MOTIVO: motivo, CONCILIADO_EM: Via_agora_(), CONCILIADO_POR_NOME: eu.nome });
    Cju_historico_('EXTRATO', x.ID, 'DESCONSIDERADA', eu, 'Transação de ' + Via_moeda_(x.VALOR) + ' em ' + Via_brDia_(x.DATA) + ' desconsiderada. Motivo: ' + motivo);
    return 'Transação desconsiderada, com o motivo.';
  });
  return Cju_depoisDeMudar_(eu, msg);
}
/** d: { linhaId, usuarioId, lembrar } — lembrar: o nome do extrato passa a valer como apelido da pessoa nas próximas importações. */
function Cju_definirPessoa_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'definir a pessoa da transação');
  d = d || {};
  var msg = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_linha_(d.linhaId); Cju_exigirAberta_(x);
    var u = Cju_usuarioInterno_(d.usuarioId, false);
    Cju_atualizar_(CJU_ABAS.EXTRATO, x.ID, { USUARIO_ID: u.id, USUARIO_NOME: u.nome, PESSOA_REGRA: 'MANUAL' });
    var n = Cju_norm_(x.PESSOA_TEXTO);
    if (d.lembrar && n) { var ap = Object.assign({}, Cju_config_().apelidos || {}); ap[n] = u.id; Cju_gravarConfig_(eu, { apelidos: ap }, 'Nome do extrato "' + Via_s_(x.PESSOA_TEXTO).slice(0, 60) + '" passa a valer para ' + u.nome); }
    Cju_historico_('EXTRATO', x.ID, 'PESSOA_DEFINIDA', eu, 'Transação atribuída a ' + u.nome + (d.lembrar ? ' (nome lembrado para as próximas importações)' : '') + '.');
    return 'Transação atribuída a ' + u.nome + '.';
  });
  return Cju_depoisDeMudar_(eu, msg);
}
function Cju_resolverDivergencia_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'resolver a divergência');
  d = d || {};
  var res = Via_up_(d.resolucao), motivo = Via_texto_(d.motivo, 600);
  if (!CJU_RESOLUCOES[res]) throw new Error('Não foi possível resolver: escolha como a divergência foi resolvida (aceita com justificativa, corrigida, vai para glosa ou não é gasto de viagem).');
  if (motivo.length < 15) throw new Error('Não foi possível resolver: escreva o motivo (15 letras ou mais). Ele vai para o histórico e para o A4 do fechamento.');
  Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_porId_(CJU_ABAS.DIVERGENCIAS, d.id);
    if (!x) throw new Error('Divergência não encontrada. Atualize a tela.');
    if (Via_s_(x.FECHAMENTO_ID)) throw new Error('Não foi possível resolver: a divergência está num período fechado. Reabra o fechamento antes.');
    if (Via_up_(x.SITUACAO) !== 'ABERTA') throw new Error('Não foi possível resolver: a divergência não está aberta (' + Via_s_(x.SITUACAO).toLowerCase() + ').');
    if (Via_s_(x.SOLICITACAO_ID)) Cju_exigirNaoEnvolvido_(eu, SGO_DATA.getById(VIA_ABAS.SOLICITACOES, Via_s_(x.SOLICITACAO_ID)), 'resolver a divergência');
    Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, x.ID, { SITUACAO: 'RESOLVIDA', RESOLUCAO: res, MOTIVO: motivo, RESOLVIDA_EM: Via_agora_(), RESOLVIDA_POR_ID: eu.id, RESOLVIDA_POR_NOME: eu.nome, ATUALIZADA_EM: Via_agora_() });
    Cju_historico_('DIVERGENCIA', x.ID, 'RESOLVIDA', eu, Cju_tipoDivNome_(x.TIPO) + ' (' + Via_s_(x.NUMERO) + '): ' + CJU_RESOLUCOES[res] + '. Motivo: ' + motivo);
    if (Via_s_(x.SOLICITACAO_ID)) Via_historico_('SOLICITACAO', x.SOLICITACAO_ID, 'CONCILIACAO_DIVERGENCIA_RESOLVIDA', eu, { texto: Cju_tipoDivNome_(x.TIPO) + ': ' + CJU_RESOLUCOES[res] + '. ' + motivo });
  });
  var out = Cju_depoisDeMudar_(eu, 'Divergência resolvida (' + CJU_RESOLUCOES[res].toLowerCase() + ').');
  out.divergencias = Cju_divergenciasTela_(eu, { situacao: d.voltarPara || 'ABERTA' }).divergencias;
  return out;
}
function Cju_reabrirDivergencia_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'reabrir a divergência');
  var motivo = Via_texto_(d && d.motivo, 400);
  if (motivo.length < 15) throw new Error('Não foi possível reabrir: escreva o motivo (15 letras ou mais).');
  Via_comTrava_(function () {
    Cju_memoLimpar_();
    var x = Cju_porId_(CJU_ABAS.DIVERGENCIAS, d.id);
    if (!x || Via_up_(x.SITUACAO) !== 'RESOLVIDA') throw new Error('Não foi possível reabrir: só a divergência resolvida com motivo volta a ficar aberta.');
    if (Via_s_(x.FECHAMENTO_ID)) throw new Error('Não foi possível reabrir: a divergência está num período fechado. Reabra o fechamento antes.');
    Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, x.ID, { SITUACAO: 'ABERTA', RESOLUCAO: '', MOTIVO: '', RESOLVIDA_EM: '', RESOLVIDA_POR_ID: '', RESOLVIDA_POR_NOME: '', ATUALIZADA_EM: Via_agora_() });
    Cju_historico_('DIVERGENCIA', x.ID, 'REABERTA', eu, 'Reaberta. Motivo: ' + motivo);
  });
  var out = Cju_depoisDeMudar_(eu, 'Divergência reaberta.');
  out.divergencias = Cju_divergenciasTela_(eu, { situacao: 'ABERTA' }).divergencias;
  return out;
}
/** Avisa o dono da divergência (sistema e e-mail), com o que fazer. Uma vez por dia por divergência. */
function Cju_avisarDono_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONCILIAR', 'avisar o responsável');
  var x = Cju_porId_(CJU_ABAS.DIVERGENCIAS, d && d.id);
  if (!x || Via_up_(x.SITUACAO) !== 'ABERTA') throw new Error('Não foi possível avisar: a divergência não está aberta. Atualize a tela.');
  if (!Via_s_(x.DONO_ID)) throw new Error('Não foi possível avisar: esta divergência é do próprio Financeiro (não há outra pessoa a avisar).');
  if (Via_dia_(x.AVISADO_EM) === Via_hoje_()) throw new Error('Não foi possível avisar de novo: ' + Via_s_(x.DONO_NOME) + ' já foi avisado hoje (' + Via_br_(x.AVISADO_EM) + ' por ' + Via_s_(x.AVISADO_POR_NOME) + ').');
  var t = CJU_DIV_TIPOS[Via_up_(x.TIPO)] || { nome: x.TIPO, fazer: '' };
  Cju_notificar_([Via_s_(x.DONO_ID)], 'CJU-DIV-' + Via_s_(x.ID) + '-' + Via_hoje_(), 'Conciliação do cartão Caju: ' + t.nome.toLowerCase() + (Via_s_(x.NUMERO) ? ' (viagem ' + Via_s_(x.NUMERO) + ')' : ''),
    'O Financeiro conferiu o extrato do cartão Caju e encontrou: ' + Via_s_(x.DESCRICAO) + '\nO que fazer: ' + t.fazer + '\nDúvidas: fale com ' + eu.nome + ' (Financeiro).');
  Via_comTrava_(function () { Cju_atualizar_(CJU_ABAS.DIVERGENCIAS, x.ID, { AVISADO_EM: Via_agora_(), AVISADO_POR_NOME: eu.nome }); Cju_historico_('DIVERGENCIA', x.ID, 'DONO_AVISADO', eu, Via_s_(x.DONO_NOME) + ' avisado.'); });
  return { divergencias: Cju_divergenciasTela_(eu, { situacao: 'ABERTA' }).divergencias, message: Via_s_(x.DONO_NOME) + ' foi avisado no SGO+ e por e-mail, com o que fazer.' };
}

// ------------------------------------------------------------
// FECHAMENTO POR PERÍODO E CENTRO DE CUSTO
// ------------------------------------------------------------
function Cju_periodo_(d) {
  var de = Via_dia_(d.de), ate = Via_dia_(d.ate), centro = Via_up_(d.centro);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new Error('Informe o período (data inicial e final).');
  if (ate < de) throw new Error('A data final é antes da inicial. Confira o período.');
  if (Via_diasEntre_(de, ate) > 400) throw new Error('O período passa de 400 dias. Feche por mês ou por trimestre.');
  return { de: de, ate: ate, centro: centro };
}
/** O que entra no período: viagens que chegaram no período (e do centro); transações datadas no período (das viagens do centro ou, sem centro, todas). */
function Cju_escopo_(p) {
  var vs = Cju_viagens_({ centro: p.centro }).filter(function (v) { var c = Via_dia_(v.chegada); return c && p.de <= c && c <= p.ate; });
  var ids = {}; vs.forEach(function (v) { ids[v.id] = true; });
  var porSol = {}; Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (r) { porSol[Via_s_(r.ID)] = r; });
  var linhas = Cju_linhasAtivas_().filter(function (x) {
    var dia = Via_dia_(x.DATA), sol = Via_s_(x.SOLICITACAO_ID);
    if (sol) return !!ids[sol];
    return !p.centro && dia >= p.de && dia <= p.ate;
  });
  var divs = Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (d) { var s = Via_s_(d.SOLICITACAO_ID); return s ? !!ids[s] : (!p.centro && linhas.some(function (x) { return Via_s_(x.ID) === Via_s_(d.EXTRATO_ID); })); });
  return { viagens: vs, linhas: linhas, divs: divs };
}
function Cju_resumoEscopo_(p, e) {
  var soma = function (k) { return e.viagens.reduce(function (s, v) { return s + (Number(v[k]) || 0); }, 0); };
  var pend = [];
  var abertas = e.divs.filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; });
  if (abertas.length) pend.push(abertas.length + (abertas.length === 1 ? ' divergência aberta' : ' divergências abertas'));
  var lp = e.linhas.filter(function (x) { return Via_up_(x.SITUACAO) === 'PENDENTE'; }).length;
  if (lp) pend.push(lp + (lp === 1 ? ' transação a conciliar' : ' transações a conciliar'));
  var sem = e.viagens.filter(function (v) { return !v.coberta; });
  if (sem.length) pend.push(sem.length + (sem.length === 1 ? ' viagem sem extrato importado do período' : ' viagens sem extrato importado do período') + ' (' + sem.map(function (v) { return v.numero; }).join(', ') + ')');
  var andam = e.viagens.filter(function (v) { return v.pedidosAndamento; });
  if (andam.length) pend.push(andam.length + ' com pedido de crédito em andamento');
  var naoConf = e.viagens.filter(function (v) { return v.contas && !v.contas.conferida; });
  if (naoConf.length) pend.push(naoConf.length + (naoConf.length === 1 ? ' prestação de contas ainda não conferida' : ' prestações de contas ainda não conferidas') + ' (' + naoConf.map(function (v) { return v.numero; }).join(', ') + ')');
  var gastoLanc = e.viagens.reduce(function (s, v) { return s + (v.contas ? Via_cent_(v.contas.gasto) : 0); }, 0);
  var aceito = e.viagens.reduce(function (s, v) { return s + (v.contas && v.contas.conferida ? Via_cent_(v.contas.aceito) : 0); }, 0);
  var devolvido = e.viagens.reduce(function (s, v) { return s + (v.contas ? Via_cent_(v.contas.devolvido) : 0); }, 0);
  var reemb = e.viagens.reduce(function (s, v) { return s + (v.contas ? Via_cent_(v.contas.reembolsado) : 0); }, 0);
  var saldo = e.viagens.filter(function (v) { return v.coberta; }).reduce(function (s, v) { return s + v.saldoCartao; }, 0);
  return { de: p.de, ate: p.ate, centro: p.centro, viagens: e.viagens.length, transacoes: e.linhas.length, aprovado: soma('aprovado'), carregado: soma('carregado'), taxa: soma('taxa'), gastoCartao: soma('gastoCartao'),
    gastoLancado: gastoLanc, aceito: aceito, devolvido: devolvido, reembolsado: reemb, saldoCartao: saldo, divAbertas: abertas.length, divTotal: e.divs.length, pendencias: pend };
}
function Cju_sobrepostos_(p) {
  return Cju_ler_(CJU_ABAS.FECHAMENTOS).filter(function (f) { return Via_up_(f.SITUACAO) === 'FECHADO' && Via_dia_(f.DE) <= p.ate && p.de <= Via_dia_(f.ATE) && (!Via_s_(f.CENTRO) || !p.centro || Via_up_(f.CENTRO) === p.centro); });
}
function Cju_fechamentoPrevia_(eu, d) {
  var p = Cju_periodo_(d || {}), e = Cju_escopo_(p), res = Cju_resumoEscopo_(p, e), sob = Cju_sobrepostos_(p);
  return { resumo: Cju_resumoTela_(res), viagens: e.viagens.map(Cju_viagemResumo_), sobrepostos: sob.map(function (f) { return Via_s_(f.NUMERO) + ' (' + Via_brDia_(f.DE) + ' a ' + Via_brDia_(f.ATE) + (Via_s_(f.CENTRO) ? ', ' + Via_s_(f.CENTRO) : ', todos os centros') + ')'; }),
    exigeRessalva: res.pendencias.length > 0, podeFechar: Cju_pode_(eu, 'CAJU_FECHAR') && !sob.length };
}
function Cju_resumoTela_(r) {
  var m = Cju_centMoeda_;
  return { de: Via_brDia_(r.de), ate: Via_brDia_(r.ate), centro: r.centro || 'Todos os centros de custo', viagens: r.viagens, transacoes: r.transacoes, aprovadoTxt: m(r.aprovado), carregadoTxt: m(r.carregado), taxaTxt: m(r.taxa),
    gastoCartaoTxt: m(r.gastoCartao), gastoLancadoTxt: m(r.gastoLancado), aceitoTxt: m(r.aceito), devolvidoTxt: m(r.devolvido), reembolsadoTxt: m(r.reembolsado), saldoCartaoTxt: m(r.saldoCartao),
    divAbertas: r.divAbertas, divTotal: r.divTotal, pendencias: r.pendencias };
}
function Cju_fechar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_FECHAR', 'fechar o período da conciliação');
  d = d || {};
  var p = Cju_periodo_(d), ressalva = Via_texto_(d.ressalva, 1000);
  Cju_conciliar_(eu);
  var f = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var sob = Cju_sobrepostos_(p);
    if (sob.length) throw new Error('Não foi possível fechar: o período se sobrepõe ao fechamento ' + Via_s_(sob[0].NUMERO) + ' (' + Via_brDia_(sob[0].DE) + ' a ' + Via_brDia_(sob[0].ATE) + '). Escolha outro período ou reabra aquele com o motivo.');
    var e = Cju_escopo_(p), res = Cju_resumoEscopo_(p, e);
    if (!e.viagens.length && !e.linhas.length) throw new Error('Não foi possível fechar: não há viagem nem transação neste período' + (p.centro ? ' e centro de custo' : '') + '.');
    if (res.pendencias.length && ressalva.length < 20) throw new Error('Não foi possível fechar sem ressalva: ' + res.pendencias.join('; ') + '. Resolva antes ou escreva a ressalva (20 letras ou mais): ela sai no A4 do fechamento.');
    var ano = p.ate.slice(0, 4), seq = Cju_ler_(CJU_ABAS.FECHAMENTOS).filter(function (x) { return Via_s_(x.NUMERO).indexOf('FCJ-' + ano + '-') === 0; }).length + 1;
    var numero = 'FCJ-' + ano + '-' + ('000' + seq).slice(-4), id = Via_id_(), agora = Via_agora_();
    var resumoJson = JSON.stringify({ resumo: res, viagens: e.viagens.map(function (v) { var x = Cju_viagemResumo_(v); x.contas = v.contas ? { gasto: v.contas.gasto, aceito: v.contas.aceito, glosado: v.contas.glosado, devolvido: v.contas.devolvido, reembolsado: v.contas.reembolsado, conferida: v.contas.conferida } : null; return x; }) });
    Cju_inserir_(CJU_ABAS.FECHAMENTOS, { ID: id, NUMERO: numero, DE: p.de, ATE: p.ate, CENTRO: p.centro, RESSALVA: res.pendencias.length ? ressalva : '', RESUMO_JSON: resumoJson.slice(0, 45000), HASH: Via_marca_(resumoJson),
      POR_ID: eu.id, POR_NOME: eu.nome, EM: agora, SITUACAO: 'FECHADO', REABERTO_EM: '', REABERTO_POR_NOME: '', REABERTO_MOTIVO: '' });
    e.linhas.forEach(function (x) { SGO_DATA.update(CJU_ABAS.EXTRATO, x.ID, { FECHAMENTO_ID: id }); });
    e.divs.forEach(function (x) { SGO_DATA.update(CJU_ABAS.DIVERGENCIAS, x.ID, { FECHAMENTO_ID: id }); });
    e.viagens.forEach(function (v) { SGO_DATA.update(VIA_ABAS.SOLICITACOES, v.id, { CONCILIACAO_SITUACAO: 'FECHADA' }); Via_historico_('SOLICITACAO', v.id, 'CONCILIACAO_FECHADA', eu, { texto: 'Conciliação Caju fechada no ' + numero + ' (' + Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate) + ').' }); });
    Cju_historico_('FECHAMENTO', id, 'FECHADO', eu, numero + ': ' + Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate) + ', ' + (p.centro || 'todos os centros') + '; ' + e.viagens.length + ' viagens, ' + e.linhas.length + ' transações.' + (res.pendencias.length ? ' Com ressalva: ' + ressalva : ''));
    Cju_memoLimpar_();
    return { id: id, numero: numero, pend: res.pendencias.length };
  });
  return { fechamento: f, fechamentos: Cju_fechamentosTela_(), message: 'Período fechado: ' + f.numero + (f.pend ? ' (com ressalva)' : '') + '. O A4 do fechamento está na lista; as transações e divergências do período não mudam mais (só reabrindo, com motivo).' };
}
function Cju_reabrirFechamento_(eu, d) {
  Cju_exigir_(eu, 'CAJU_FECHAR', 'reabrir o fechamento');
  var motivo = Via_texto_(d && d.motivo, 600);
  if (motivo.length < 15) throw new Error('Não foi possível reabrir: escreva o motivo (15 letras ou mais). Fica no histórico e no A4 do fechamento.');
  var num = Via_comTrava_(function () {
    Cju_memoLimpar_();
    var f = Cju_porId_(CJU_ABAS.FECHAMENTOS, d.id);
    if (!f || Via_up_(f.SITUACAO) !== 'FECHADO') throw new Error('Não foi possível reabrir: fechamento não encontrado ou já reaberto.');
    Via_ler_(CJU_ABAS.EXTRATO).forEach(function (x) { if (Via_s_(x.FECHAMENTO_ID) === Via_s_(f.ID)) SGO_DATA.update(CJU_ABAS.EXTRATO, x.ID, { FECHAMENTO_ID: '' }); });
    Via_ler_(CJU_ABAS.DIVERGENCIAS).forEach(function (x) { if (Via_s_(x.FECHAMENTO_ID) === Via_s_(f.ID)) SGO_DATA.update(CJU_ABAS.DIVERGENCIAS, x.ID, { FECHAMENTO_ID: '' }); });
    Cju_atualizar_(CJU_ABAS.FECHAMENTOS, f.ID, { SITUACAO: 'REABERTO', REABERTO_EM: Via_agora_(), REABERTO_POR_NOME: eu.nome, REABERTO_MOTIVO: motivo });
    Via_ler_(VIA_ABAS.SOLICITACOES).forEach(function (r) { if (Via_up_(r.CONCILIACAO_SITUACAO) === 'FECHADA' && Cju_fechamentoCobre_(f, r)) SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, { CONCILIACAO_SITUACAO: '' }); });
    Cju_historico_('FECHAMENTO', f.ID, 'REABERTO', eu, Via_s_(f.NUMERO) + ' reaberto. Motivo: ' + motivo);
    return Via_s_(f.NUMERO);
  });
  Cju_conciliar_(eu);
  return { fechamentos: Cju_fechamentosTela_(), message: 'Fechamento ' + num + ' reaberto. As transações do período voltam para a conciliação.' };
}
function Cju_fechamentosTela_() {
  return Cju_ler_(CJU_ABAS.FECHAMENTOS).slice().sort(function (a, b) { return Via_s_(b.EM).localeCompare(Via_s_(a.EM)); }).map(function (f) {
    var j = Via_json_(f.RESUMO_JSON, {}), r = j.resumo || {};
    return { id: Via_s_(f.ID), numero: Via_s_(f.NUMERO), de: Via_brDia_(f.DE), ate: Via_brDia_(f.ATE), centro: Via_s_(f.CENTRO) || 'Todos', situacao: Via_up_(f.SITUACAO), em: Via_br_(f.EM), por: Via_s_(f.POR_NOME),
      ressalva: Via_s_(f.RESSALVA), viagens: r.viagens || 0, carregadoTxt: Cju_centMoeda_(r.carregado), gastoCartaoTxt: Cju_centMoeda_(r.gastoCartao), reabertoEm: Via_br_(f.REABERTO_EM), reabertoPor: Via_s_(f.REABERTO_POR_NOME), reabertoMotivo: Via_s_(f.REABERTO_MOTIVO) };
  });
}

// ------------------------------------------------------------
// RELATÓRIOS A4
// ------------------------------------------------------------
function Cju_relatorioApi_(eu, d) {
  d = d || {};
  var tipo = Via_up_(d.tipo), ver = Cju_pode_(eu, 'CAJU_VER') || Cju_pode_(eu, 'CAJU_CONCILIAR'), html, nome;
  var periodo = function () { var de = Via_dia_(d.de), ate = Via_dia_(d.ate); if (!de || !ate) { var h = Via_hoje_(); de = de || h.slice(0, 8) + '01'; ate = ate || h; } return Cju_periodo_({ de: de, ate: ate, centro: d.centro }); };
  if (tipo === 'INDIVIDUAL') {
    var pessoa = Via_s_(d.pessoa) || eu.id;
    if (pessoa !== eu.id && !ver) throw new Error('Não foi possível gerar o relatório individual de outra pessoa: ele é do Financeiro e da Diretoria (caixa «' + Via_nomeCaixa_('CAJU_VER') + '»). O seu relatório você gera sem escolher pessoa.');
    var p = periodo(); html = Cju_a4Individual_(pessoa, p, eu); nome = 'Relatorio_individual_' + Cju_norm_((Cju_usuariosTodos_()[pessoa] || {}).nome || pessoa).replace(/ /g, '_') + '_' + p.de + '_' + p.ate + '.html';
  } else {
    if (!ver) Cju_exigirVer_(eu);
    if (tipo === 'GERAL') { var pg = periodo(); html = Cju_a4Geral_(pg, eu); nome = 'Relatorio_geral_viagens_' + pg.de + '_' + pg.ate + '.html'; }
    else if (tipo === 'FECHAMENTO') {
      if (d.id) { var f = Cju_porId_(CJU_ABAS.FECHAMENTOS, d.id); if (!f) throw new Error('Fechamento não encontrado.'); html = Cju_a4Fechamento_({ de: Via_dia_(f.DE), ate: Via_dia_(f.ATE), centro: Via_up_(f.CENTRO) }, eu, f); nome = 'Fechamento_' + Via_s_(f.NUMERO) + '.html'; }
      else { var pf = periodo(); html = Cju_a4Fechamento_(pf, eu, null); nome = 'Fechamento_previa_' + pf.de + '_' + pf.ate + '.html'; }
    } else if (tipo === 'DIVERGENCIAS') { var pd = periodo(); html = Cju_a4Divergencias_(pd, eu); nome = 'Divergencias_Caju_' + pd.de + '_' + pd.ate + '.html'; }
    else if (tipo === 'CREDITOS') { var pc = periodo(); html = Cju_a4Creditos_(pc, eu); nome = 'Creditos_Caju_' + pc.de + '_' + pc.ate + '.html'; }
    else throw new Error('Escolha o relatório: individual, geral, fechamento, divergências ou créditos.');
  }
  Cju_historico_('RELATORIO', tipo, 'RELATORIO_GERADO', eu, 'Relatório A4 ' + tipo + ' gerado (' + nome + ').');
  return { html: html, nomeArquivo: nome };
}
function Cju_n_(v) { return { t: Cju_centMoeda_(v), cls: 'num' }; }
function Cju_r_(v) { return { t: Via_moeda_(v), cls: 'num' }; }
/** Gráfico de barras horizontais em SVG (valores em centavos). */
function Cju_svgBarras_(itens, cor) {
  itens = (itens || []).filter(function (x) { return x.valor > 0; }).slice(0, 14);
  if (!itens.length) return '';
  var max = itens.reduce(function (m, x) { return Math.max(m, x.valor); }, 0), W = 680, rot = 210, lh = 24, H = itens.length * lh + 8, esc = SGO_DocA4_esc_;
  var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" style="max-width:' + W + 'px;font-family:sans-serif">';
  itens.forEach(function (x, i) {
    var y = 4 + i * lh, w = Math.max(2, Math.round((x.valor / max) * (W - rot - 120)));
    h += '<text x="' + (rot - 6) + '" y="' + (y + 15) + '" font-size="11" text-anchor="end" fill="#333">' + esc(String(x.rotulo).slice(0, 34)) + '</text>' +
      '<rect x="' + rot + '" y="' + (y + 3) + '" width="' + w + '" height="16" rx="2" fill="' + (x.cor || cor || '#1f5fa8') + '"></rect>' +
      '<text x="' + (rot + w + 6) + '" y="' + (y + 15) + '" font-size="11" fill="#333">' + esc(Cju_centMoeda_(x.valor)) + '</text>';
  });
  return h + '</svg>';
}
function Cju_ficha_(p) { return [['Período', Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate)], ['Centro de custo', p.centro || 'Todos']]; }
function Cju_rodape_(eu) { return '<p>Documento gerado pelo SGO+ (Financeiro > Conciliação Caju) em ' + SGO_DocA4_esc_(Via_br_(Via_agora_())) + (eu ? ' por ' + SGO_DocA4_esc_(eu.nome) : '') + '. Nenhum valor é digitado: aprovado, carregado e gastos vêm das solicitações, das cargas, da prestação de contas e do extrato importado do Caju.</p>'; }
function Cju_situacaoConcTxt_(v) { return Cju_colNome_(v.coluna) + (v.divAbertas ? ' (' + v.divAbertas + ' div.)' : ''); }

/** RELATÓRIO INDIVIDUAL: todas as viagens em que a pessoa levou o dinheiro, no período. */
function Cju_a4Individual_(pessoaId, p, eu) {
  var u = Cju_usuariosTodos_()[pessoaId] || { nome: pessoaId }, esc = SGO_DocA4_esc_, m = Cju_centMoeda_;
  var vs = Cju_viagens_({ pessoa: pessoaId, de: p.de, ate: p.ate, centro: p.centro });
  var equipe = Via_ler_(VIA_ABAS.SOLICITACOES).filter(function (r) { return Via_s_(r.RESPONSAVEL_ID) !== pessoaId && Via_equipeIds_(r).indexOf(pessoaId) >= 0 && Via_dia_(r.CHEGADA_EM) >= p.de && Via_dia_(r.SAIDA_EM) <= p.ate; });
  var tot = { carregado: 0, gasto: 0, caju: 0, proprio: 0, aceito: 0, glosado: 0, devolvido: 0, reembolsado: 0, aDev: 0, aRee: 0, cartao: 0, div: 0 }, cats = {};
  vs.forEach(function (v) {
    tot.carregado += v.carregado; tot.cartao += v.gastoCartao; tot.div += v.divAbertas;
    if (v.contas) { var k = v.contas; tot.gasto += Via_cent_(k.gasto); tot.caju += Via_cent_(k.gastoCaju); tot.proprio += Via_cent_(k.gastoProprio); tot.aceito += k.conferida ? Via_cent_(k.aceito) : 0; tot.glosado += Via_cent_(k.glosado); tot.devolvido += Via_cent_(k.devolvido); tot.reembolsado += Via_cent_(k.reembolsado); tot.aDev += Via_cent_(k.aDevolver); tot.aRee += Via_cent_(k.aReembolsar);
      k.porCategoria.forEach(function (c) { var x = cats[c.cod] = cats[c.cod] || { nome: c.nome, gasto: 0, aceito: 0, glosado: 0 }; x.gasto += Via_cent_(c.gasto); x.aceito += Via_cent_(c.aceito); x.glosado += Via_cent_(c.glosado); }); }
  });
  var resultado = tot.aDev > 0 ? { classe: 'nok', rotulo: 'A devolver', valor: m(tot.aDev), texto: 'Soma do que falta devolver nas viagens do período.' } : tot.aRee > 0 ? { classe: 'info', rotulo: 'A reembolsar', valor: m(tot.aRee), texto: 'Soma do que a empresa ainda deve reembolsar.' } : { classe: 'ok', rotulo: 'Contas', valor: m(tot.gasto), texto: 'Gasto lançado nas viagens do período; sem saldo a acertar pela conta de hoje.' };
  var doc = { titulo: 'Relatório individual de viagens', subtitulo: 'Cargas no cartão Caju, prestação de contas, conferência e conciliação', tituloCurto: 'Relatório individual', rotuloNumero: 'Colaborador', numero: u.nome, revisao: '0',
    ficha: [['Colaborador', u.nome]].concat(Cju_ficha_(p)).concat([['Viagens com o dinheiro', String(vs.length)], ['Emitido por', eu.nome]]), resultado: resultado };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  h.push('<p><b>Índice:</b> 1. Resumo · 2. Por categoria · 3. Viagens · 4. Gastos com comprovante e para que foi · 5. Glosas · 6. Acertos · 7. Pendências · 8. Transações do cartão sem comprovante</p>');
  h.push('<h2 id="r1">1. Resumo</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Conta' }, { t: 'Valor', cls: 'num' }], [['Carregado no cartão Caju', Cju_n_(tot.carregado)], ['Gasto no cartão (extrato do Caju)', Cju_n_(tot.cartao)], ['Gasto lançado na prestação', Cju_n_(tot.gasto)],
    ['   no cartão Caju', Cju_n_(tot.caju)], ['   com dinheiro próprio', Cju_n_(tot.proprio)], ['Aceito pelo Financeiro', Cju_n_(tot.aceito)], ['Glosado', Cju_n_(tot.glosado)], ['Devolvido', Cju_n_(tot.devolvido)],
    ['Reembolsado', Cju_n_(tot.reembolsado)], ['Falta devolver', Cju_n_(tot.aDev)], ['Falta reembolsar', Cju_n_(tot.aRee)], ['Divergências abertas na conciliação', String(tot.div)]]));
  h.push('<h2 id="r2">2. Por categoria</h2>');
  var lc = Object.keys(cats).map(function (k) { return cats[k]; });
  h.push(lc.length ? SGO_DocA4_tabela_([{ t: 'Categoria' }, { t: 'Gasto', cls: 'num' }, { t: 'Aceito', cls: 'num' }, { t: 'Glosado', cls: 'num' }], lc.map(function (c) { return [c.nome, Cju_n_(c.gasto), Cju_n_(c.aceito), Cju_n_(c.glosado)]; })) +
    SGO_DocA4_figura_(Cju_svgBarras_(lc.map(function (c) { return { rotulo: c.nome, valor: c.gasto }; }), '#0e7490'), 1, 'Gasto lançado por categoria') : '<p>Nenhum gasto lançado no período.</p>');
  h.push('<h2 id="r3">3. Viagens</h2>');
  h.push(vs.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Destino e datas' }, { t: 'Centro / vínculo' }, { t: 'Carregado', cls: 'num' }, { t: 'Gasto', cls: 'num' }, { t: 'Prestação' }, { t: 'Conciliação' }],
    vs.map(function (v) { return [v.numero, v.destino + ', ' + Via_brDia_(v.saida) + ' a ' + Via_brDia_(v.chegada), v.centro + ' · ' + v.vinculo, Cju_n_(v.carregado), v.contas ? Cju_r_(v.contas.gasto) : '—', v.situacaoNome, Cju_situacaoConcTxt_(v)]; })) : '<p>Nenhuma viagem com o dinheiro no período.</p>');
  if (equipe.length) h.push('<p>Viagens em que participou sem levar o dinheiro: ' + esc(equipe.map(function (r) { return Via_s_(r.NUMERO) + ' (' + Via_s_(r.DESTINO_CIDADE) + ', dinheiro com ' + Via_s_(r.RESPONSAVEL_NOME) + ')'; }).join('; ')) + '.</p>');
  h.push('<h2 id="r4">4. Gastos com comprovante e para que foi</h2>');
  var linhasG = [];
  vs.forEach(function (v) { v.gastos.forEach(function (g) {
    var cat = (VIA_CAT[Via_up_(g.CATEGORIA)] || { nome: g.CATEGORIA }).nome, sit = Via_up_(g.SITUACAO), desc = Via_letras_(g.DESCRICAO) >= VIA_DESCRICAO_MIN ? Via_s_(g.DESCRICAO) : 'SEM DESCRIÇÃO';
    linhasG.push([v.numero + ' nº ' + Via_s_(g.ITEM_NUMERO), Via_brDia_(g.DATA), cat, { html: '<b>' + esc(desc) + '</b><br>' + esc(Via_s_(g.ESTABELECIMENTO)) + ' · ' + (Via_up_(g.SEM_COMPROVANTE) === 'SIM' ? 'sem comprovante: ' + esc(g.JUSTIFICATIVA_SEM_COMPROVANTE) : (Via_s_(g.COMPROVANTE_URL) ? '<a href="' + esc(g.COMPROVANTE_URL) + '">' + esc(g.COMPROVANTE_NOME) + '</a>' : esc(g.COMPROVANTE_NOME))) },
      Via_up_(g.PAGO_COM) === 'PROPRIO' ? 'Próprio' : 'Caju', Cju_r_(g.VALOR), sit === 'ACEITO' ? 'Aceito' : sit === 'GLOSADO' ? 'Glosado' : 'A conferir', Via_s_(g.CONCILIACAO_SITUACAO) === 'CONCILIADO' ? 'No extrato' : Via_s_(g.CONCILIACAO_SITUACAO) === 'DIVERGENTE' ? 'Divergente' : Via_s_(g.CONCILIACAO_SITUACAO) === 'SEM_TRANSACAO' ? 'Não está no extrato' : '—']);
  }); });
  h.push(linhasG.length ? SGO_DocA4_tabela_([{ t: 'Gasto' }, { t: 'Data' }, { t: 'Categoria' }, { t: 'Para que foi, estabelecimento e comprovante' }, { t: 'Pago' }, { t: 'Valor', cls: 'num' }, { t: 'Conferência' }, { t: 'Cartão' }], linhasG) : '<p>Nenhum gasto lançado.</p>');
  h.push('<h2 id="r5">5. Glosas</h2>');
  var glosas = []; vs.forEach(function (v) { v.gastos.filter(function (g) { return Via_up_(g.SITUACAO) === 'GLOSADO'; }).forEach(function (g) { glosas.push([v.numero + ' nº ' + Via_s_(g.ITEM_NUMERO), Cju_r_(g.VALOR_GLOSADO), Via_s_(g.GLOSA_MOTIVO), Via_s_(g.CONFERIDO_POR_NOME)]); }); });
  h.push(glosas.length ? SGO_DocA4_tabela_([{ t: 'Gasto' }, { t: 'Glosado', cls: 'num' }, { t: 'Motivo' }, { t: 'Por' }], glosas) : '<p>Nenhuma glosa.</p>');
  h.push('<h2 id="r6">6. Acertos (devolução e reembolso)</h2>');
  var ac = []; vs.forEach(function (v) { Via_acertosDe_(v.id).forEach(function (a) { ac.push([v.numero, Via_up_(a.TIPO) === 'DEVOLUCAO' ? 'Devolução' : 'Reembolso', Via_brDia_(a.DATA), Cju_r_(a.VALOR), Via_s_(a.TRANSACAO_ID) ? 'No extrato' : '—']); }); });
  h.push(ac.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Tipo' }, { t: 'Data' }, { t: 'Valor', cls: 'num' }, { t: 'Extrato' }], ac) : '<p>Nenhum acerto registrado.</p>');
  h.push('<h2 id="r7">7. Pendências</h2>');
  var pend = [];
  vs.forEach(function (v) {
    var pz = typeof Via_prazoInfo_ === 'function' ? Via_prazoInfo_(v.r) : null;
    if (pz && pz.vencida) pend.push(v.numero + ': prestação de contas vencida em ' + pz.prazoTxt + '.');
    else if (v.situacao === 'PRESTACAO_PENDENTE') pend.push(v.numero + ': prestação de contas a fazer' + (pz ? ' até ' + pz.prazoTxt : '') + '.');
    var sd = v.gastos.filter(function (g) { return Via_letras_(g.DESCRICAO) < VIA_DESCRICAO_MIN; }).length;
    if (sd) pend.push(v.numero + ': ' + sd + (sd === 1 ? ' gasto sem dizer para que foi.' : ' gastos sem dizer para que foi.'));
    if (v.contas && v.contas.aDevolver > 0) pend.push(v.numero + ': devolver ' + Via_moeda_(v.contas.aDevolver) + '.');
  });
  Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA' && vs.some(function (v) { return v.id === Via_s_(d.SOLICITACAO_ID); }); }).forEach(function (d) { pend.push(Via_s_(d.NUMERO) + ': ' + Cju_tipoDivNome_(d.TIPO) + ' — ' + Via_s_(d.DESCRICAO)); });
  h.push(pend.length ? '<ul>' + pend.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p>Nenhuma pendência.</p>');
  h.push('<h2 id="r8">8. Transações do cartão sem comprovante na prestação</h2>');
  var semC = Cju_linhasAtivas_().filter(function (x) { return Via_s_(x.USUARIO_ID) === pessoaId && Via_up_(x.TIPO) === 'GASTO' && !Via_s_(x.GASTO_ID) && Via_up_(x.SITUACAO) !== 'IGNORADO' && Via_dia_(x.DATA) >= p.de && Via_dia_(x.DATA) <= p.ate; });
  h.push(semC.length ? SGO_DocA4_tabela_([{ t: 'Data' }, { t: 'Estabelecimento' }, { t: 'Valor', cls: 'num' }, { t: 'Situação' }], semC.map(function (x) { return [Via_brDia_(x.DATA), Via_s_(x.ESTABELECIMENTO || x.DESCRICAO), Cju_r_(x.VALOR), CJU_LIN_SIT[Via_up_(x.SITUACAO)] || x.SITUACAO]; })) : '<p>Nenhuma (ou o extrato do período ainda não foi importado).</p>');
  h.push(SGO_DocA4_assinaturas_([{ papel: 'Colaborador (ciente)', nome: u.nome, cargo: 'Responsável pelo dinheiro das viagens' }, { papel: 'Financeiro', nome: eu.nome, cargo: 'Conferência e conciliação' }]));
  h.push(Cju_rodape_(eu)); h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
/** RELATÓRIO GERAL do período: por colaborador, centro de custo, cliente/O.S. e categoria, com gráficos e índice. */
function Cju_a4Geral_(p, eu) {
  var esc = SGO_DocA4_esc_, m = Cju_centMoeda_;
  var vs = Cju_viagens_({ de: p.de, ate: p.ate, centro: p.centro }), e = { viagens: vs, linhas: Cju_linhasAtivas_().filter(function (x) { return Via_dia_(x.DATA) >= p.de && Via_dia_(x.DATA) <= p.ate; }), divs: Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (d) { return vs.some(function (v) { return v.id === Via_s_(d.SOLICITACAO_ID); }); }) };
  var res = Cju_resumoEscopo_(p, e);
  var grupo = function (fk) { var g = {}; vs.forEach(function (v) { var k = fk(v), x = g[k] = g[k] || { nome: k, viagens: 0, aprovado: 0, carregado: 0, cartao: 0, gasto: 0, aceito: 0, glosado: 0, devolvido: 0, div: 0 }; x.viagens++; x.aprovado += v.aprovado; x.carregado += v.carregado; x.cartao += v.gastoCartao; x.div += v.divAbertas; if (v.contas) { x.gasto += Via_cent_(v.contas.gasto); x.aceito += v.contas.conferida ? Via_cent_(v.contas.aceito) : 0; x.glosado += Via_cent_(v.contas.glosado); x.devolvido += Via_cent_(v.contas.devolvido); } }); return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.carregado - a.carregado; }); };
  var tabelaGrupo = function (l, rot) { return SGO_DocA4_tabela_([{ t: rot }, { t: 'Viagens', cls: 'num' }, { t: 'Aprovado', cls: 'num' }, { t: 'Carregado', cls: 'num' }, { t: 'Gasto no cartão', cls: 'num' }, { t: 'Lançado', cls: 'num' }, { t: 'Aceito', cls: 'num' }, { t: 'Glosado', cls: 'num' }, { t: 'Div.', cls: 'num' }],
    l.map(function (x) { return [x.nome, { t: String(x.viagens), cls: 'num' }, Cju_n_(x.aprovado), Cju_n_(x.carregado), Cju_n_(x.cartao), Cju_n_(x.gasto), Cju_n_(x.aceito), Cju_n_(x.glosado), { t: String(x.div), cls: 'num' }]; })); };
  var doc = { titulo: 'Relatório geral de viagens e conciliação Caju', subtitulo: 'Por colaborador, centro de custo, cliente ou O.S. e categoria', tituloCurto: 'Relatório geral', rotuloNumero: 'Período', numero: Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate), revisao: '0',
    ficha: Cju_ficha_(p).concat([['Viagens', String(vs.length)], ['Emitido por', eu.nome]]), resultado: { classe: res.divAbertas ? 'nok' : 'ok', rotulo: 'Carregado no período', valor: m(res.carregado), texto: res.divAbertas ? res.divAbertas + (res.divAbertas === 1 ? ' divergência aberta' : ' divergências abertas') + ' na conciliação.' : 'Sem divergências abertas.' } };
  var h = [SGO_DocA4_inicioDocumento_(doc)], fig = 0;
  h.push('<h2>Índice</h2><ol><li><a href="#g1">Resumo do período</a></li><li><a href="#g2">Por colaborador</a></li><li><a href="#g3">Por centro de custo</a></li><li><a href="#g4">Por cliente ou O.S.</a></li><li><a href="#g5">Por categoria</a></li><li><a href="#g6">Divergências abertas</a></li><li><a href="#g7">Créditos pelo Caju</a></li><li><a href="#g8">Situação de cada viagem</a></li></ol>');
  h.push('<h2 id="g1">1. Resumo do período</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Conta' }, { t: 'Valor', cls: 'num' }], [['Viagens', { t: String(res.viagens), cls: 'num' }], ['Aprovado', Cju_n_(res.aprovado)], ['Carregado no cartão Caju', Cju_n_(res.carregado)], ['Taxas do Caju (pedidos pela API)', Cju_n_(res.taxa)],
    ['Gasto no cartão (extrato)', Cju_n_(res.gastoCartao)], ['Gasto lançado na prestação', Cju_n_(res.gastoLancado)], ['Aceito pelo Financeiro', Cju_n_(res.aceito)], ['Devolvido', Cju_n_(res.devolvido)], ['Reembolsado', Cju_n_(res.reembolsado)],
    ['Saldo no cartão (viagens com extrato)', Cju_n_(res.saldoCartao)], ['Divergências abertas', { t: String(res.divAbertas), cls: 'num' }]]));
  h.push(SGO_DocA4_figura_(Cju_svgBarras_([{ rotulo: 'Aprovado', valor: res.aprovado, cor: '#1f5fa8' }, { rotulo: 'Carregado', valor: res.carregado, cor: '#0e7490' }, { rotulo: 'Gasto no cartão', valor: res.gastoCartao, cor: '#b45309' }, { rotulo: 'Lançado', valor: res.gastoLancado, cor: '#4d7c0f' }, { rotulo: 'Aceito', valor: res.aceito, cor: '#1d6b3f' }]), ++fig, 'Aprovado, carregado, gasto e aceito no período'));
  if (res.pendencias.length) h.push('<p><b>Pendências do período:</b> ' + esc(res.pendencias.join('; ')) + '.</p>');
  var gp = grupo(function (v) { return v.pessoa || '—'; }), gc = grupo(function (v) { return v.centro || '—'; }), gv = grupo(function (v) { return v.vinculo || '—'; });
  h.push('<h2 id="g2">2. Por colaborador</h2>' + (gp.length ? tabelaGrupo(gp, 'Colaborador') + SGO_DocA4_figura_(Cju_svgBarras_(gp.map(function (x) { return { rotulo: x.nome, valor: x.carregado }; }), '#0e7490'), ++fig, 'Carregado por colaborador') : '<p>Nenhuma viagem.</p>'));
  h.push('<h2 id="g3">3. Por centro de custo</h2>' + (gc.length ? tabelaGrupo(gc, 'Centro de custo') + SGO_DocA4_figura_(Cju_svgBarras_(gc.map(function (x) { return { rotulo: x.nome, valor: x.carregado }; }), '#1f5fa8'), ++fig, 'Carregado por centro de custo') : '<p>Nenhuma viagem.</p>'));
  h.push('<h2 id="g4">4. Por cliente ou O.S.</h2>' + (gv.length ? tabelaGrupo(gv, 'Vínculo da viagem') : '<p>Nenhuma viagem.</p>'));
  var cats = {}; vs.forEach(function (v) { if (v.contas) v.contas.porCategoria.forEach(function (c) { var x = cats[c.cod] = cats[c.cod] || { nome: c.nome, aprovado: 0, gasto: 0, aceito: 0, glosado: 0 }; x.aprovado += Via_cent_(c.aprovado); x.gasto += Via_cent_(c.gasto); x.aceito += Via_cent_(c.aceito); x.glosado += Via_cent_(c.glosado); }); });
  var lc = Object.keys(cats).map(function (k) { return cats[k]; });
  h.push('<h2 id="g5">5. Por categoria</h2>' + (lc.length ? SGO_DocA4_tabela_([{ t: 'Categoria' }, { t: 'Aprovado', cls: 'num' }, { t: 'Gasto', cls: 'num' }, { t: 'Aceito', cls: 'num' }, { t: 'Glosado', cls: 'num' }], lc.map(function (c) { return [c.nome, Cju_n_(c.aprovado), Cju_n_(c.gasto), Cju_n_(c.aceito), Cju_n_(c.glosado)]; })) +
    SGO_DocA4_figura_(Cju_svgBarras_(lc.map(function (c) { return { rotulo: c.nome, valor: c.gasto }; }), '#4d7c0f'), ++fig, 'Gasto lançado por categoria') : '<p>Nenhum gasto lançado.</p>'));
  var ab = e.divs.filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; });
  h.push('<h2 id="g6">6. Divergências abertas</h2>' + (ab.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Divergência' }, { t: 'Dono' }, { t: 'Valor', cls: 'num' }, { t: 'Desde' }], ab.map(function (d) { return [Via_s_(d.NUMERO), Cju_tipoDivNome_(d.TIPO) + ': ' + Via_s_(d.DESCRICAO), Via_s_(d.DONO_NOME), Cju_r_(d.VALOR), Via_brDia_(d.CRIADA_EM)]; })) : '<p>Nenhuma divergência aberta.</p>'));
  var peds = Cju_ler_(CJU_ABAS.PEDIDOS).filter(function (x) { return Via_dia_(x.CRIADO_EM) >= p.de && Via_dia_(x.CRIADO_EM) <= p.ate; });
  h.push('<h2 id="g7">7. Créditos pelo Caju</h2>' + (peds.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Pedido' }, { t: 'Colaborador' }, { t: 'Situação' }, { t: 'Crédito', cls: 'num' }, { t: 'Taxa', cls: 'num' }], peds.map(function (x) { return [Via_s_(x.NUMERO), Via_s_(x.PEDIDO_CAJU_ID) || '—', Via_s_(x.PESSOA_NOME), CJU_PED_SIT[Via_up_(x.SITUACAO)] || x.SITUACAO, Cju_r_(x.VALOR), Number(x.TAXA_CENTAVOS) ? Cju_n_(x.TAXA_CENTAVOS) : '—']; })) : '<p>Nenhum pedido de crédito pela API no período (cargas manuais aparecem nos totais).</p>'));
  h.push('<h2 id="g8">8. Situação de cada viagem</h2>' + (vs.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Colaborador' }, { t: 'Centro' }, { t: 'Carregado', cls: 'num' }, { t: 'Gasto no cartão', cls: 'num' }, { t: 'Saldo no cartão', cls: 'num' }, { t: 'Conciliação' }],
    vs.map(function (v) { return [v.numero + ' (' + v.destino + ')', v.pessoa, v.centro, Cju_n_(v.carregado), Cju_n_(v.gastoCartao), v.coberta ? Cju_n_(v.saldoCartao) : 'sem extrato', Cju_situacaoConcTxt_(v)]; })) : '<p>Nenhuma viagem.</p>'));
  h.push(Cju_rodape_(eu)); h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
function Cju_a4Fechamento_(p, eu, f) {
  var esc = SGO_DocA4_esc_, e = Cju_escopo_(p), res = Cju_resumoEscopo_(p, e), fechado = f && Via_up_(f.SITUACAO) === 'FECHADO';
  var doc = { titulo: 'Fechamento da conciliação do cartão Caju', subtitulo: 'Aprovado × creditado × gasto no cartão × comprovado, por viagem', tituloCurto: 'Fechamento Caju', rotuloNumero: 'Nº', numero: f ? Via_s_(f.NUMERO) : 'PRÉVIA', revisao: '0',
    ficha: Cju_ficha_(p).concat([['Situação', f ? (fechado ? 'Fechado por ' + Via_s_(f.POR_NOME) + ' em ' + Via_br_(f.EM) : 'Reaberto por ' + Via_s_(f.REABERTO_POR_NOME) + ' em ' + Via_br_(f.REABERTO_EM) + ': ' + Via_s_(f.REABERTO_MOTIVO)) : 'Prévia (ainda não fechado)']]),
    resultado: { classe: res.divAbertas ? 'nok' : 'ok', rotulo: 'Saldo no cartão', valor: Cju_centMoeda_(res.saldoCartao), texto: res.viagens + (res.viagens === 1 ? ' viagem; ' : ' viagens; ') + res.transacoes + (res.transacoes === 1 ? ' transação; ' : ' transações; ') + res.divAbertas + (res.divAbertas === 1 ? ' divergência aberta.' : ' divergências abertas.') } };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  if (!f) h.push('<p><b>Prévia.</b> O documento que vale é o emitido depois do fechamento.</p>');
  if (f && Via_s_(f.RESSALVA)) h.push('<p><b>Fechado com ressalva:</b> ' + esc(f.RESSALVA) + '</p>');
  if (res.pendencias.length) h.push('<p><b>Pendências no período:</b> ' + esc(res.pendencias.join('; ')) + '.</p>');
  h.push('<h2>1. Resumo</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Conta' }, { t: 'Valor', cls: 'num' }], [['Aprovado', Cju_n_(res.aprovado)], ['Carregado no cartão', Cju_n_(res.carregado)], ['Taxas do Caju', Cju_n_(res.taxa)], ['Gasto no cartão (extrato)', Cju_n_(res.gastoCartao)],
    ['Gasto lançado (prestação)', Cju_n_(res.gastoLancado)], ['Aceito', Cju_n_(res.aceito)], ['Devolvido', Cju_n_(res.devolvido)], ['Reembolsado', Cju_n_(res.reembolsado)], ['Saldo no cartão (pelo extrato)', Cju_n_(res.saldoCartao)]]));
  h.push('<h2>2. Viagens</h2>');
  h.push(e.viagens.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Colaborador' }, { t: 'Aprovado', cls: 'num' }, { t: 'Carregado', cls: 'num' }, { t: 'Gasto no cartão', cls: 'num' }, { t: 'Comprovado', cls: 'num' }, { t: 'Saldo', cls: 'num' }, { t: 'Conciliação' }],
    e.viagens.map(function (v) { return [v.numero + ' · ' + v.centro, v.pessoa, Cju_n_(v.aprovado), Cju_n_(v.carregado), Cju_n_(v.gastoCartao), v.contas ? Cju_r_(v.contas.conferida ? v.contas.aceito : v.contas.gastoCaju) : '—', v.coberta ? Cju_n_(v.saldoCartao) : 'sem extrato', Cju_situacaoConcTxt_(v)]; })) : '<p>Nenhuma viagem.</p>');
  h.push('<h2>3. Divergências</h2>');
  h.push(e.divs.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Divergência' }, { t: 'Dono' }, { t: 'Valor', cls: 'num' }, { t: 'Situação e motivo' }],
    e.divs.map(function (d) { var t = Cju_divTela_(d); return [t.numero, t.tipoNome + ': ' + t.descricao, t.dono, Cju_r_(d.VALOR), t.situacaoNome + (t.resolucaoNome ? ' · ' + t.resolucaoNome : '') + (t.motivo ? ': ' + t.motivo : '') + (t.resolvidaPor ? ' (' + t.resolvidaPor + ')' : '')]; })) : '<p>Nenhuma divergência.</p>');
  var ign = e.linhas.filter(function (x) { return Via_up_(x.SITUACAO) === 'IGNORADO'; }), man = e.linhas.filter(function (x) { return Via_up_(x.REGRA) === 'MANUAL'; });
  h.push('<h2>4. Decisões manuais do Financeiro</h2>');
  h.push(ign.length || man.length ? SGO_DocA4_tabela_([{ t: 'Transação' }, { t: 'Valor', cls: 'num' }, { t: 'Decisão' }, { t: 'Por' }], ign.concat(man).map(function (x) { return [Via_brDia_(x.DATA) + ' · ' + Via_s_(x.ESTABELECIMENTO || x.DESCRICAO) + ' · ' + Via_s_(x.USUARIO_NOME), Cju_r_(x.VALOR), (Via_up_(x.REGRA) === 'MANUAL' ? 'Ligada à mão' : 'Desconsiderada') + (Via_s_(x.MOTIVO) ? ': ' + Via_s_(x.MOTIVO) : ''), Via_s_(x.CONCILIADO_POR_NOME)]; })) : '<p>Nenhuma.</p>');
  h.push(SGO_DocA4_assinaturas_([{ papel: 'Fechado (Financeiro)', nome: f ? Via_s_(f.POR_NOME) : '—', cargo: f ? 'Em ' + Via_br_(f.EM) : 'Prévia' }, { papel: 'Ciência (Diretoria)', nome: ' ', cargo: '' }]));
  if (f) h.push('<p>Marca de conferência (SHA-256): ' + esc(f.HASH) + '.</p>');
  h.push(Cju_rodape_(eu)); h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
function Cju_a4Divergencias_(p, eu) {
  var vs = Cju_viagens_({ de: p.de, ate: p.ate, centro: p.centro }), ids = {}; vs.forEach(function (v) { ids[v.id] = true; });
  var l = Cju_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (d) { return ids[Via_s_(d.SOLICITACAO_ID)] || (!Via_s_(d.SOLICITACAO_ID) && Via_dia_(d.DATA) >= p.de && Via_dia_(d.DATA) <= p.ate); });
  var ab = l.filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; });
  var doc = { titulo: 'Divergências da conciliação Caju', subtitulo: 'Com o dono, o motivo e o que fazer', tituloCurto: 'Divergências Caju', rotuloNumero: 'Período', numero: Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate), revisao: '0', ficha: Cju_ficha_(p),
    resultado: { classe: ab.length ? 'nok' : 'ok', rotulo: 'Abertas', valor: String(ab.length), texto: l.length + ' no total (abertas, resolvidas e sanadas).' } };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  h.push(l.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Divergência' }, { t: 'O que fazer' }, { t: 'Dono' }, { t: 'Valor', cls: 'num' }, { t: 'Situação' }],
    l.map(function (d) { var t = Cju_divTela_(d); return [t.numero || '—', t.tipoNome + ': ' + t.descricao, t.oQueFazer, t.dono + (t.avisadoEm ? ' (avisado em ' + t.avisadoEm + ')' : ''), Cju_r_(d.VALOR), t.situacaoNome + (t.motivo ? ': ' + t.motivo : '')]; })) : '<p>Nenhuma divergência no período.</p>');
  h.push(Cju_rodape_(eu)); h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
function Cju_a4Creditos_(p, eu) {
  var peds = Cju_ler_(CJU_ABAS.PEDIDOS).filter(function (x) { return Via_dia_(x.CRIADO_EM) >= p.de && Via_dia_(x.CRIADO_EM) <= p.ate; });
  var cred = peds.filter(function (x) { return Via_up_(x.SITUACAO) === 'CREDITADO'; });
  var soma = function (l, k) { return l.reduce(function (s, x) { return s + (k === 'VALOR' ? Via_cent_(x.VALOR) : Number(x[k]) || 0); }, 0); };
  var doc = { titulo: 'Créditos pedidos ao Caju', subtitulo: 'Aprovado no SGO+ × pedido no Caju × creditado', tituloCurto: 'Créditos Caju', rotuloNumero: 'Período', numero: Via_brDia_(p.de) + ' a ' + Via_brDia_(p.ate), revisao: '0', ficha: Cju_ficha_(p),
    resultado: { classe: 'ok', rotulo: 'Creditado', valor: Cju_centMoeda_(soma(cred, 'VALOR')), texto: cred.length + ' de ' + peds.length + ' pedidos creditados; taxas ' + Cju_centMoeda_(soma(cred, 'TAXA_CENTAVOS')) + '.' } };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  h.push(peds.length ? SGO_DocA4_tabela_([{ t: 'Viagem' }, { t: 'Pedido no Caju' }, { t: 'Colaborador' }, { t: 'Categoria' }, { t: 'Situação' }, { t: 'Crédito', cls: 'num' }, { t: 'Taxa', cls: 'num' }, { t: 'Total cobrado', cls: 'num' }, { t: 'Por' }],
    peds.map(function (x) { return [Via_s_(x.NUMERO), Via_s_(x.PEDIDO_CAJU_ID) || '—', Via_s_(x.PESSOA_NOME), Via_s_(x.CATEGORIA), (CJU_PED_SIT[Via_up_(x.SITUACAO)] || x.SITUACAO) + (Via_s_(x.AMBIENTE) !== 'producao' ? ' (homologação)' : ''), Cju_r_(x.VALOR), Number(x.TAXA_CENTAVOS) ? Cju_n_(x.TAXA_CENTAVOS) : '—', Number(x.TOTAL_CENTAVOS) ? Cju_n_(x.TOTAL_CENTAVOS) : '—', Via_s_(x.CRIADO_POR_NOME)]; })) : '<p>Nenhum pedido no período.</p>');
  h.push(Cju_rodape_(eu)); h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
