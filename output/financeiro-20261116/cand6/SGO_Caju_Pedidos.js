/****************************************************
 * CONCILIAÇÃO CAJU — CARGA DO DEPÓSITO DE VIAGEM PELO CAJU (11/11/2026)
 *
 * Na solicitação aprovada (Depósito de viagem > Carga no cartão), além do registro manual que já existia, o Financeiro toca em
 * "Fazer a carga pelo Caju": o SGO+ cria o pedido de crédito (name "VIAGEM <número>", até 27 letras; valor = o que falta carregar
 * do aprovado, em centavos; categoria configurada), paga com o SALDO DA CONTA CAJU (EXISTING_BALANCE) e acompanha o status
 * (rotina de 15 em 15 minutos e botão Atualizar) até REDEEMED (creditado). Creditado, a carga entra sozinha no depósito
 * (VIA_CARGAS, ORIGEM CAJU_API) com o número do pedido, o total cobrado, a taxa, o centro de custo e um comprovante gerado com os
 * dados do pedido, da nota e do PIX. Faltou saldo: o pedido fica "saldo insuficiente" e a tela oferece o PIX (o código aparece
 * para o Financeiro) ou tentar de novo com o saldo; dá para cancelar enquanto o Caju deixar.
 *
 * REGRAS FIXAS
 *  - Nunca passa do aprovado: o valor é no máximo o que falta carregar da revisão aprovada; menor só com o motivo.
 *  - Nunca dois pedidos para a mesma carga: a linha do pedido (CRIANDO) é gravada DENTRO da trava antes de chamar o Caju; enquanto
 *    houver pedido em andamento a solicitação não aceita outro pedido, carga manual, edição nem cancelamento (Via_acoes_ pergunta
 *    Cju_ajustarAcoes_). Rede caiu na criação: o pedido fica "VERIFICAR" até o Financeiro informar o número do portal ou liberar.
 *  - As proteções da carga valem igual: quem aprovou ou viaja não faz; responsável com prestação vencida não recebe.
 *  - Homologação (conta fictícia do Caju): o pedido corre inteiro, mas a carga NÃO entra no depósito (dinheiro fictício).
 * Só funções (carrega antes de SGO_Viagem.js).
 ****************************************************/

var CJU_PED_SIT = { CRIANDO: 'Criando no Caju', VERIFICAR: 'Conferir no portal do Caju (criação incerta)', RECUSADO: 'Recusado pelo Caju', RASCUNHO: 'Criado, falta pagar',
  SALDO_INSUFICIENTE: 'Saldo insuficiente na conta Caju', CONFERIR_VALOR: 'Valor no Caju diferente do pedido', PAGANDO: 'Pagamento enviado, aguardando o Caju',
  AGUARDANDO_PIX: 'Aguardando o pagamento do PIX', PROCESSANDO: 'Em processamento no Caju', CREDITADO: 'Creditado no cartão', CANCELADO: 'Cancelado' };
var CJU_PED_FINAIS = ['RECUSADO', 'CREDITADO', 'CANCELADO'];
var CJU_PED_CORES = { CRIANDO: '#6b7480', VERIFICAR: '#a61b1b', RECUSADO: '#a61b1b', RASCUNHO: '#a87406', SALDO_INSUFICIENTE: '#a61b1b', CONFERIR_VALOR: '#a61b1b', PAGANDO: '#1f5fa8',
  AGUARDANDO_PIX: '#b45309', PROCESSANDO: '#1f5fa8', CREDITADO: '#1d6b3f', CANCELADO: '#52606d' };

function Cju_pedidos_() { return Cju_ler_(CJU_ABAS.PEDIDOS); }
function Cju_pedidosDe_(solId) { return Cju_pedidos_().filter(function (p) { return Via_s_(p.SOLICITACAO_ID) === Via_s_(solId); }).sort(function (a, b) { return Via_s_(a.CRIADO_EM).localeCompare(Via_s_(b.CRIADO_EM)); }); }
function Cju_pedidosEmAndamento_() { var l = []; try { l = Cju_pedidos_(); } catch (e) { l = []; } return l.filter(function (p) { return CJU_PED_FINAIS.indexOf(Via_up_(p.SITUACAO)) < 0; }); }
function Cju_pedidoEmAndamentoDe_(solId) { return Cju_pedidosEmAndamento_().filter(function (p) { return Via_s_(p.SOLICITACAO_ID) === Via_s_(solId); })[0] || null; }
function Cju_pedido_(id) {
  var p = Cju_porId_(CJU_ABAS.PEDIDOS, id);
  if (!p) throw new Error('Pedido de crédito não encontrado. Atualize a tela e abra de novo.');
  return p;
}
function Cju_ctx_(eu, origem, ref) { return { origem: origem || 'tela', ref: ref || '', porId: eu ? eu.id : '', porNome: eu ? eu.nome : 'sistema' }; }

/** Gancho de Via_acoes_ (SGO_Viagem.js): com pedido em andamento, nada de carga manual, edição ou cancelamento; e a ação cargaCaju. */
function Cju_ajustarAcoes_(eu, r, pod, a) {
  var p = null;
  try { p = Cju_pedidoEmAndamentoDe_(r.ID); } catch (e) { p = null; }
  var nao = function (m) { return { pode: false, motivo: m }; };
  if (p) {
    var m = 'Há um pedido de crédito no Caju em andamento (' + (CJU_PED_SIT[Via_up_(p.SITUACAO)] || p.SITUACAO).toLowerCase() + ', ' + Via_moeda_(p.VALOR) + '). Espere o crédito ou cancele o pedido na própria solicitação.';
    if (a.carga && a.carga.pode) a.carga = nao(m);
    if (a.editar && a.editar.pode) a.editar = nao(m);
    if (a.enviar && a.enviar.pode) a.enviar = nao(m);
    if (a.cancelar && a.cancelar.pode) a.cancelar = nao(m);
    a.cargaCaju = nao(m);
    return a;
  }
  if (!(a.carga && a.carga.pode)) { a.cargaCaju = nao((a.carga && a.carga.motivo) || 'Só depois da aprovação.'); return a; }
  var mc = Cju_modoCarga_();
  if (mc.modo !== 'API') { a.cargaCaju = nao('A carga está no modo manual (Caju Despesas ou outro): registre a carga feita com o comprovante. ' + mc.motivo); a.cargaCaju.modoManual = true; return a; }
  if (!Cju_pode_(eu, 'CAJU_CARGA')) { a.cargaCaju = nao('A carga pelo Caju é do Financeiro (caixa «' + Via_nomeCaixa_('CAJU_CARGA') + '»). O registro manual continua disponível.'); return a; }
  a.cargaCaju = { pode: true, motivo: '', saldo: a.carga.saldo };
  return a;
}
function Cju_pedidoTela_(p, eu) {
  var s = Via_up_(p.SITUACAO), verPix = !eu || Cju_pode_(eu, 'CAJU_CARGA');
  return { id: Via_s_(p.ID), solicitacaoId: Via_s_(p.SOLICITACAO_ID), numero: Via_s_(p.NUMERO), pedidoCaju: Via_s_(p.PEDIDO_CAJU_ID), nome: Via_s_(p.NOME_PEDIDO), ambiente: Via_s_(p.AMBIENTE),
    pessoa: Via_s_(p.PESSOA_NOME), pessoaId: Via_s_(p.PESSOA_ID), categoria: Via_s_(p.CATEGORIA), valor: Number(p.VALOR) || 0, valorTxt: Via_moeda_(p.VALOR),
    totalTxt: p.TOTAL_CENTAVOS !== '' && p.TOTAL_CENTAVOS !== undefined && p.TOTAL_CENTAVOS !== null && Number(p.TOTAL_CENTAVOS) > 0 ? Cju_centMoeda_(p.TOTAL_CENTAVOS) : '',
    taxaTxt: p.TAXA_CENTAVOS !== '' && p.TAXA_CENTAVOS !== undefined && p.TAXA_CENTAVOS !== null ? Cju_centMoeda_(p.TAXA_CENTAVOS) : '',
    situacao: s, situacaoNome: CJU_PED_SIT[s] || s, cor: CJU_PED_CORES[s] || '#6b7480', statusCaju: Via_s_(p.STATUS_CAJU), statusCajuNome: CJA_STATUS_PEDIDO[Via_up_(p.STATUS_CAJU)] || Via_s_(p.STATUS_CAJU),
    pagamento: Via_s_(p.PAGAMENTO), pix: verPix ? Via_s_(p.PIX_CODIGO) : '', pixVence: Via_br_(p.PIX_VENCE), notaUrl: Via_s_(p.NOTA_URL), notaNumero: Via_s_(p.NOTA_NUMERO), boletoUrl: Via_s_(p.BOLETO_URL),
    mensagem: Via_s_(p.MENSAGEM), centro: Via_s_(p.CENTRO_CUSTO_CODIGO), centroCaju: Via_s_(p.CENTRO_CUSTO_CAJU), cargaId: Via_s_(p.CARGA_ID), observacao: Via_s_(p.OBSERVACAO),
    criadoEm: Via_br_(p.CRIADO_EM), criadoPor: Via_s_(p.CRIADO_POR_NOME), efetivadoEm: Via_br_(p.EFETIVADO_EM), creditadoEm: Via_br_(p.CREDITADO_EM), canceladoEm: Via_br_(p.CANCELADO_EM),
    canceladoMotivo: Via_s_(p.CANCELADO_MOTIVO), consultadoEm: Via_br_(p.CONSULTADO_EM), final: CJU_PED_FINAIS.indexOf(s) >= 0,
    podePagarSaldo: ['RASCUNHO', 'SALDO_INSUFICIENTE'].indexOf(s) >= 0, podePix: ['RASCUNHO', 'SALDO_INSUFICIENTE'].indexOf(s) >= 0,
    podeCancelar: ['RASCUNHO', 'SALDO_INSUFICIENTE', 'AGUARDANDO_PIX', 'CONFERIR_VALOR'].indexOf(s) >= 0, podeAtualizar: !!Via_s_(p.PEDIDO_CAJU_ID) && CJU_PED_FINAIS.indexOf(s) < 0,
    verificar: s === 'VERIFICAR' };
}
/** Para Via_paraTela_ (a solicitação na tela do Depósito de viagem). */
function Cju_infoSolicitacao_(eu, r, acoes) {
  var pod = { carga: Cju_pode_(eu, 'CAJU_CARGA') }, cfg = Cju_config_(), v = Cju_vinculoDe_(r.RESPONSAVEL_ID);
  var ac = acoes && acoes.cargaCaju ? acoes.cargaCaju : { pode: false, motivo: '' };
  var falta = [];
  var integ = CajuApi_situacao_();
  if (ac.pode) {
    if (!integ.configurada) falta.push('A integração com o Caju ainda não está configurada (falta: ' + integ.faltam.join(', ') + '). O responsável pelo sistema grava as credenciais em Administração > Chaves e senhas. Enquanto isso, use o registro manual abaixo.');
    if (!v) falta.push(Via_s_(r.RESPONSAVEL_NOME) + ' não está vinculado ao Caju. Vincule em Financeiro > Conciliação Caju > Colaboradores.');
    else if (Via_up_(v.CAJU_ARQUIVADO) === 'SIM') falta.push(Via_s_(r.RESPONSAVEL_NOME) + ' está arquivado no Caju. Desarquive em Conciliação Caju > Colaboradores.');
  }
  var mc = Cju_modoCarga_();
  return { modo: mc.modo, modoTexto: mc.texto, modoMotivo: mc.motivo, pode: !!ac.pode, motivo: ac.motivo || '', saldo: ac.saldo || 0, falta: falta, categoria: cfg.categoria, categoriaNome: Cju_nomeCategoria_(cfg.categoria), categorias: CJU_CATEGORIAS,
    podeConfigurar: Cju_pode_(eu, 'CAJU_CONFIGURAR'), integracao: integ, vinculado: !!v, podeCarga: pod.carga,
    pedidos: Cju_pedidosDe_(r.ID).map(function (p) { return Cju_pedidoTela_(p, eu); }).reverse() };
}
function Cju_resposta_(eu, d, pedidoId, msg) {
  Cju_memoLimpar_();
  var p = pedidoId ? Cju_porId_(CJU_ABAS.PEDIDOS, pedidoId) : null, out = { message: msg, pedido: p ? Cju_pedidoTela_(p, eu) : null };
  if (d && d.daViagem && p) { var r = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, Via_s_(p.SOLICITACAO_ID)); if (r) out.solicitacao = Via_paraTela_(eu, r); }
  return out;
}
/** Quem aprovou ou viaja não mexe no dinheiro desta viagem (mesma regra da carga manual). */
function Cju_exigirSeparacaoCarga_(eu, r, oQue) {
  if (Via_equipeIds_(r).indexOf(eu.id) >= 0) throw new Error('Não foi possível ' + oQue + ': você viaja nesta solicitação, e a carga do próprio cartão é feita por outra pessoa do Financeiro.');
  if (Via_aprovadoresDaRevisao_(r).indexOf(eu.id) >= 0) throw new Error('Não foi possível ' + oQue + ': você aprovou esta solicitação, e quem aprova não faz a carga (separação de funções).');
}

// ------------------------------------------------------------
// CRIAR E PAGAR
// ------------------------------------------------------------
/** d: { id (solicitação), valor (opcional; padrão = o que falta carregar), observacao, categoria (só na primeira vez), daViagem }. */
function Cju_pedidoCriar_(eu, d) {
  d = d || {};
  Cju_exigir_(eu, 'CAJU_CARGA', 'fazer a carga pelo Caju');
  var modo = Cju_modoCarga_();
  if (modo.modo !== 'API') throw new Error('Não foi possível fazer a carga pelo Caju: a carga está no modo manual (Caju Despesas ou outro). ' + modo.motivo + ' Para usar o pedido de benefício pela API, o Financeiro escolhe "Carga pelo Caju" em Conciliação Caju > Configuração.');
  var integ = CajuApi_cfg_();
  if (!integ.completo) throw CajuApi_naoConfigurada_(integ);
  var cfg = Cju_config_();
  if (!cfg.categoria) {
    var cat = Via_up_(d.categoria);
    if (!cat) throw new Error('Não foi possível fazer a carga pelo Caju: escolha antes a categoria do crédito (em que saldo do Caju o dinheiro da viagem cai). A escolha fica gravada e vale para as próximas cargas; muda em Conciliação Caju > Configuração.');
    if (!Cju_pode_(eu, 'CAJU_CONFIGURAR')) throw new Error('Não foi possível fazer a carga pelo Caju: a categoria do crédito ainda não foi escolhida, e quem escolhe é quem tem a caixa «' + Via_nomeCaixa_('CAJU_CONFIGURAR') + '».');
    Cju_salvarConfig_(eu, { categoria: cat, motivo: 'Categoria do crédito escolhida na primeira carga pelo Caju' });
    cfg = Cju_config_();
  }
  var obs = Via_texto_(d.observacao, 600);
  var res = Via_comTrava_(function () {
    Cju_garantirAbas_(); Via_garantirAbas_(); Cju_memoLimpar_();
    var r = Via_solicitacao_(d.id), ac = Via_acoes_(eu, r);
    if (!ac.cargaCaju || !ac.cargaCaju.pode) throw new Error('Não foi possível fazer a carga pelo Caju na solicitação ' + Via_s_(r.NUMERO) + ': ' + ((ac.cargaCaju && ac.cargaCaju.motivo) || ac.carga.motivo));
    Cju_exigirSeparacaoCarga_(eu, r, 'fazer a carga pelo Caju');
    if (typeof Via_travaPrestacao_ === 'function') { var tv = Via_travaPrestacao_(Via_s_(r.RESPONSAVEL_ID), Via_s_(r.ID)); if (tv) throw new Error('Não foi possível fazer a carga pelo Caju: ' + tv.texto); }
    var v = Cju_vinculoDe_(r.RESPONSAVEL_ID);
    if (!v) throw new Error('Não foi possível fazer a carga pelo Caju: ' + Via_s_(r.RESPONSAVEL_NOME) + ' (responsável pelo dinheiro) não está vinculado ao Caju. O que fazer: em Financeiro > Conciliação Caju > Colaboradores, vincule pelo CPF (ou cadastre no Caju) e volte aqui.');
    if (Via_up_(v.CAJU_ARQUIVADO) === 'SIM') throw new Error('Não foi possível fazer a carga pelo Caju: ' + Via_s_(r.RESPONSAVEL_NOME) + ' está arquivado no Caju. Desarquive em Conciliação Caju > Colaboradores e tente de novo.');
    var saldo = ac.cargaCaju.saldo, valor = d.valor === undefined || d.valor === null || Via_s_(d.valor) === '' ? saldo : Via_num_(d.valor);
    if (valor === null || !(valor > 0)) throw new Error('Não foi possível fazer a carga pelo Caju: informe o valor (maior que zero).');
    if (Via_cent_(valor) > Via_cent_(saldo)) throw new Error('Não foi possível fazer a carga pelo Caju: ' + Via_moeda_(valor) + ' passa do que falta carregar (' + Via_moeda_(saldo) + ' de ' + Via_moeda_(r.APROVADO_TOTAL) + ' aprovados na revisão ' + Via_s_(r.APROVADO_REVISAO) + '). Carga acima do aprovado só depois de nova aprovação.');
    if (Via_cent_(valor) < Via_cent_(saldo) && obs.length < 10) throw new Error('Não foi possível fazer a carga pelo Caju: o valor (' + Via_moeda_(valor) + ') é menor que o que falta carregar (' + Via_moeda_(saldo) + '). Escreva na observação por que a carga é parcial (10 letras ou mais).');
    var chave = Via_s_(r.ID) + ':' + Via_s_(r.APROVADO_REVISAO) + ':' + Via_s_(r.APROVADO_HASH).slice(0, 16) + ':' + Via_cent_(r.CARREGADO_TOTAL);
    if (Cju_pedidos_().some(function (p) { return Via_s_(p.CHAVE) === chave && ['RECUSADO', 'CANCELADO'].indexOf(Via_up_(p.SITUACAO)) < 0; })) throw new Error('Não foi possível fazer a carga pelo Caju: já existe pedido para esta carga (mesma revisão aprovada e mesmo valor já carregado). Atualize a tela.');
    var agora = Via_agora_(), id = Via_id_(), nome = ('VIAGEM ' + Via_s_(r.NUMERO)).slice(0, 27);
    var centroCaju = typeof Via_centroCaju_ === 'function' ? Via_centroCaju_(r) : Via_s_(r.CENTRO_CUSTO_CODIGO);
    Cju_inserir_(CJU_ABAS.PEDIDOS, { ID: id, SOLICITACAO_ID: r.ID, NUMERO: r.NUMERO, REVISAO: r.APROVADO_REVISAO, APROVADO_HASH: r.APROVADO_HASH, CHAVE: chave, PEDIDO_CAJU_ID: '', NOME_PEDIDO: nome,
      AMBIENTE: integ.ambiente, PESSOA_ID: Via_s_(r.RESPONSAVEL_ID), PESSOA_NOME: Via_s_(r.RESPONSAVEL_NOME), EMPLOYEE_ID: Via_s_(v.EMPLOYEE_ID), CATEGORIA: cfg.categoria, VALOR: Via_r2_(valor),
      VALOR_CENTAVOS: Via_cent_(valor), CENTRO_CUSTO_CODIGO: Via_s_(r.CENTRO_CUSTO_CODIGO), CENTRO_CUSTO_CAJU: centroCaju, OBSERVACAO: obs, SITUACAO: 'CRIANDO', STATUS_CAJU: '', PAGAMENTO: '',
      TOTAL_CENTAVOS: '', TAXA_CENTAVOS: '', PIX_CODIGO: '', PIX_VENCE: '', NOTA_URL: '', NOTA_NUMERO: '', BOLETO_URL: '', MENSAGEM: '', CARGA_ID: '', CRIADO_EM: agora, CRIADO_POR_ID: eu.id,
      CRIADO_POR_NOME: eu.nome, EFETIVADO_EM: '', CREDITADO_EM: '', CANCELADO_EM: '', CANCELADO_POR_NOME: '', CANCELADO_MOTIVO: '', CONSULTADO_EM: '', ATUALIZADO_EM: agora });
    Via_historico_('SOLICITACAO', r.ID, 'CAJU_PEDIDO_CRIANDO', eu, { revisao: r.APROVADO_REVISAO, texto: 'Carga pelo Caju iniciada: pedido "' + nome + '" de ' + Via_moeda_(valor) + ' para ' + Via_s_(r.RESPONSAVEL_NOME) + ' (categoria ' + cfg.categoria + ', ' + integ.ambiente + ').' });
    return { id: id, nome: nome, valor: valor, emp: Via_s_(v.EMPLOYEE_ID), sol: r };
  });
  Cju_garantirRotina_();
  var ctx = Cju_ctx_(eu, 'carga', res.id), criado;
  try { criado = CajuApi_criarPedido_(res.nome, res.emp, cfg.categoria, Via_cent_(res.valor), ctx); }
  catch (e) {
    var incerto = !!e.cajuRede || !!e.cajuSemId;
    Cju_mudarPedido_(res.id, { SITUACAO: incerto ? 'VERIFICAR' : 'RECUSADO', MENSAGEM: Via_erro_(e) }, eu, incerto ? 'CAJU_PEDIDO_INCERTO' : 'CAJU_PEDIDO_RECUSADO');
    if (incerto) return Cju_resposta_(eu, d, res.id, 'O Caju não confirmou a criação do pedido. Confira no portal do Caju se existe o pedido "' + res.nome + '": se existir, informe o número aqui; se não, toque em "Não foi criado, liberar" e faça de novo.');
    throw e;
  }
  Cju_mudarPedido_(res.id, { PEDIDO_CAJU_ID: criado.id, SITUACAO: 'RASCUNHO', STATUS_CAJU: criado.status, MENSAGEM: '' }, eu, 'CAJU_PEDIDO_CRIADO', 'Pedido criado no Caju (nº ' + criado.id + ').');
  // confere o valor que o Caju registrou e lê o total com a taxa antes de pagar
  var ped = null;
  try { ped = CajuApi_consultarPedido_(criado.id, ctx); } catch (e) { ped = null; }
  if (ped) {
    Cju_gravarConsulta_(res.id, ped);
    if (ped.allowanceTotal !== null && ped.allowanceTotal !== Via_cent_(res.valor)) {
      Cju_mudarPedido_(res.id, { SITUACAO: 'CONFERIR_VALOR', MENSAGEM: 'O Caju registrou ' + Cju_centMoeda_(ped.allowanceTotal) + ' de crédito, diferente do pedido (' + Via_moeda_(res.valor) + '). O pedido NÃO foi pago. Cancele e faça de novo.' }, eu, 'CAJU_VALOR_DIFERENTE');
      return Cju_resposta_(eu, d, res.id, 'Atenção: o Caju registrou um valor diferente do pedido. O pedido não foi pago; cancele e faça de novo.');
    }
  }
  return Cju_pedidoPagar_(eu, d, res.id, 'EXISTING_BALANCE');
}
/** Paga (efetiva) o pedido. tipo: EXISTING_BALANCE (saldo da conta) ou PIX_CODE (código aparece ao Financeiro). */
function Cju_pedidoPagar_(eu, d, pedidoId, tipo) {
  var p = Cju_pedido_(pedidoId), ctx = Cju_ctx_(eu, 'carga', pedidoId);
  var total = Number(p.TOTAL_CENTAVOS) > 0 ? Number(p.TOTAL_CENTAVOS) : Number(p.VALOR_CENTAVOS);
  Cju_mudarPedido_(pedidoId, { SITUACAO: 'PAGANDO', PAGAMENTO: tipo, MENSAGEM: '' });
  try { CajuApi_efetivarPedido_(Via_s_(p.PEDIDO_CAJU_ID), tipo, total, ctx); }
  catch (e) {
    if (e.cajuCodigo === 'SALDO_INSUFICIENTE') {
      Cju_mudarPedido_(pedidoId, { SITUACAO: 'SALDO_INSUFICIENTE', MENSAGEM: 'Saldo da conta Caju da empresa insuficiente para ' + Cju_centMoeda_(total) + ' (crédito ' + Via_moeda_(p.VALOR) + (Number(p.TAXA_CENTAVOS) > 0 ? ' + taxa ' + Cju_centMoeda_(p.TAXA_CENTAVOS) : '') + ').' }, eu, 'CAJU_SALDO_INSUFICIENTE');
      Cju_notificar_(Via_comPapel_('CAJU_CARGA', []), 'CJU-SALDO-' + pedidoId, 'Saldo insuficiente na conta Caju: viagem ' + Via_s_(p.NUMERO), 'O pedido de crédito da viagem ' + Via_s_(p.NUMERO) + ' (' + Via_s_(p.PESSOA_NOME) + ') não foi pago: o saldo da conta Caju da empresa não cobre ' + Cju_centMoeda_(total) + '.\nO que fazer: coloque saldo na conta Caju e toque em "Tentar de novo com o saldo", ou toque em "Pagar por PIX" para gerar o código (Depósito de viagem ou Conciliação Caju > Créditos).');
      return Cju_resposta_(eu, d, pedidoId, 'O saldo da conta Caju da empresa não cobre ' + Cju_centMoeda_(total) + '. O pedido está criado e NÃO foi pago. Escolha: colocar saldo e "Tentar de novo com o saldo", ou "Pagar por PIX" (o código aparece aqui).');
    }
    if (e.cajuRede) { Cju_mudarPedido_(pedidoId, { SITUACAO: 'PAGANDO', MENSAGEM: 'O Caju não confirmou o pagamento (rede). O SGO+ confere na próxima atualização.' }, eu, 'CAJU_PAGAMENTO_INCERTO'); return Cju_resposta_(eu, d, pedidoId, 'O Caju não confirmou o pagamento. Toque em "Atualizar" em alguns minutos: o SGO+ confere a situação no Caju antes de qualquer nova tentativa.'); }
    Cju_mudarPedido_(pedidoId, { SITUACAO: 'RASCUNHO', MENSAGEM: Via_erro_(e) }, eu, 'CAJU_PAGAMENTO_RECUSADO');
    throw e;
  }
  Cju_mudarPedido_(pedidoId, { SITUACAO: 'PROCESSANDO', EFETIVADO_EM: Via_agora_() }, eu, 'CAJU_PEDIDO_PAGO', tipo === 'PIX_CODE' ? 'PIX solicitado ao Caju.' : 'Pago com o saldo da conta Caju (' + Cju_centMoeda_(total) + ').');
  var msg = '';
  try { var r2 = Cju_pedidoAtualizar_(Cju_pedido_(pedidoId), ctx, eu); msg = r2.texto; } catch (e2) { msg = 'Situação no Caju ainda não lida (' + Via_erro_(e2) + ').'; }
  var pf = Cju_pedido_(pedidoId);
  var base = tipo === 'PIX_CODE' ? (Via_s_(pf.PIX_CODIGO) ? 'PIX gerado: copie o código abaixo e pague no banco da empresa. Pago, o crédito segue sozinho.' : 'PIX pedido ao Caju; o código aparece aqui quando o Caju gerar (toque em Atualizar).')
    : 'Pedido pago com o saldo da conta Caju.';
  return Cju_resposta_(eu, d, pedidoId, base + (tipo === 'PIX_CODE' ? '' : ' ' + msg) + (Via_up_(pf.SITUACAO) === 'CREDITADO' ? '' : ' O SGO+ acompanha o pedido sozinho e registra a carga quando o Caju creditar.'));
}
function Cju_pedidoPagarApi_(eu, d, tipo) {
  Cju_exigir_(eu, 'CAJU_CARGA', tipo === 'PIX_CODE' ? 'gerar o PIX do pedido' : 'pagar o pedido com o saldo');
  var p = Cju_pedido_(d.pedidoId), r = Via_solicitacao_(p.SOLICITACAO_ID);
  Cju_exigirSeparacaoCarga_(eu, r, 'pagar o pedido');
  if (['RASCUNHO', 'SALDO_INSUFICIENTE'].indexOf(Via_up_(p.SITUACAO)) < 0) throw new Error('Não foi possível pagar: o pedido está "' + (CJU_PED_SIT[Via_up_(p.SITUACAO)] || p.SITUACAO).toLowerCase() + '". Toque em Atualizar para ver a situação no Caju.');
  if (Via_s_(p.AMBIENTE) !== CajuApi_cfg_().ambiente) throw new Error('Não foi possível pagar: o pedido é do ambiente ' + Via_s_(p.AMBIENTE) + ' e a integração está hoje em ' + (CajuApi_cfg_().ambiente || 'nenhum ambiente') + '.');
  // antes de pagar de novo, confere no Caju que ele continua em rascunho
  var ped = CajuApi_consultarPedido_(Via_s_(p.PEDIDO_CAJU_ID), Cju_ctx_(eu, 'carga', p.ID));
  Cju_gravarConsulta_(p.ID, ped);
  if (ped.status && ped.status !== 'DRAFT') { Cju_pedidoAtualizar_(Cju_pedido_(p.ID), Cju_ctx_(eu, 'carga', p.ID), eu); return Cju_resposta_(eu, d, p.ID, 'O pedido já saiu do rascunho no Caju (' + (CJA_STATUS_PEDIDO[ped.status] || ped.status) + '): não foi pago de novo.'); }
  return Cju_pedidoPagar_(eu, d, p.ID, tipo);
}

// ------------------------------------------------------------
// ACOMPANHAR ATÉ CREDITADO
// ------------------------------------------------------------
function Cju_mudarPedido_(id, campos, eu, acao, texto) {
  campos.ATUALIZADO_EM = Via_agora_();
  Cju_atualizar_(CJU_ABAS.PEDIDOS, id, campos);
  if (acao) {
    var p = Cju_porId_(CJU_ABAS.PEDIDOS, id);
    Cju_historico_('PEDIDO', id, acao, eu, texto || Via_s_(campos.MENSAGEM) || acao);
    if (p) Via_historico_('SOLICITACAO', p.SOLICITACAO_ID, acao, eu || { id: '', nome: 'sistema' }, { texto: 'Pedido Caju ' + (Via_s_(p.PEDIDO_CAJU_ID) || '(sem número)') + ': ' + (texto || Via_s_(campos.MENSAGEM) || CJU_PED_SIT[Via_up_(p.SITUACAO)] || acao) });
  }
}
function Cju_gravarConsulta_(id, ped) {
  var c = { STATUS_CAJU: ped.status, CONSULTADO_EM: Via_agora_() };
  if (ped.total !== null) c.TOTAL_CENTAVOS = ped.total;
  if (ped.taxa !== null) c.TAXA_CENTAVOS = ped.taxa;
  if (ped.pix) c.PIX_CODIGO = ped.pix;
  if (ped.pixVence) c.PIX_VENCE = ped.pixVence;
  if (ped.notaUrl) c.NOTA_URL = ped.notaUrl;
  if (ped.notaNumero) c.NOTA_NUMERO = ped.notaNumero;
  if (ped.boletoUrl) c.BOLETO_URL = ped.boletoUrl;
  Cju_atualizar_(CJU_ABAS.PEDIDOS, id, c);
}
/** Lê o status no Caju e anda a situação. Devolve { mudou, texto }. */
function Cju_pedidoAtualizar_(p, ctx, eu) {
  var id = Via_s_(p.ID), antes = Via_up_(p.SITUACAO);
  if (!Via_s_(p.PEDIDO_CAJU_ID) || CJU_PED_FINAIS.indexOf(antes) >= 0) return { mudou: false, texto: '' };
  var ped = CajuApi_consultarPedido_(Via_s_(p.PEDIDO_CAJU_ID), ctx);
  Cju_gravarConsulta_(id, ped);
  var st = ped.status, novo = antes, texto = '';
  if (st === 'REDEEMED') { var rc = Cju_registrarCargaPedido_(Cju_pedido_(id), ped, eu); novo = 'CREDITADO'; texto = rc.texto; }
  else if (st === 'CANCELED') { novo = 'CANCELADO'; texto = 'O Caju informou o pedido como cancelado.'; Cju_mudarPedido_(id, { SITUACAO: 'CANCELADO', CANCELADO_EM: Via_agora_(), CANCELADO_MOTIVO: Via_s_(p.CANCELADO_MOTIVO) || 'cancelado no Caju' }, eu, 'CAJU_PEDIDO_CANCELADO', texto); }
  else if (st === 'DRAFT') { if (antes === 'PAGANDO' || antes === 'PROCESSANDO') { novo = 'RASCUNHO'; texto = 'O Caju mostra o pedido ainda em rascunho: o pagamento não foi confirmado. Pague com o saldo ou por PIX.'; Cju_mudarPedido_(id, { SITUACAO: novo, MENSAGEM: texto }, eu, 'CAJU_PAGAMENTO_NAO_CONFIRMADO', texto); } }
  else if (st === 'PAYMENT_PENDING') { novo = ped.pix || Via_s_(p.PAGAMENTO) === 'PIX_CODE' ? 'AGUARDANDO_PIX' : 'PROCESSANDO'; if (novo !== antes) { texto = novo === 'AGUARDANDO_PIX' ? 'PIX gerado pelo Caju: aguardando o pagamento.' : 'Aguardando o pagamento no Caju.'; Cju_mudarPedido_(id, { SITUACAO: novo, MENSAGEM: '' }, eu, 'CAJU_STATUS', texto); } }
  else if (st) { novo = 'PROCESSANDO'; if (novo !== antes) { texto = 'Pagamento confirmado; crédito em andamento no Caju (' + (CJA_STATUS_PEDIDO[st] || st) + ').'; Cju_mudarPedido_(id, { SITUACAO: novo, MENSAGEM: '' }, eu, 'CAJU_STATUS', texto); } }
  if (novo !== 'CREDITADO' && novo !== 'CANCELADO' && Via_s_(p.EFETIVADO_EM)) {
    var horas = (Date.now() - Date.parse(Via_iso_(p.EFETIVADO_EM) + ':00-03:00')) / 36e5, lim = Cju_config_().pedidoAlertaHoras;
    if (horas > lim) Cju_atualizar_(CJU_ABAS.PEDIDOS, id, { MENSAGEM: 'Pago há mais de ' + lim + ' horas e ainda não creditado (' + (CJA_STATUS_PEDIDO[st] || st) + '). Confira no portal do Caju.' });
  }
  return { mudou: novo !== antes, texto: texto || ('Situação no Caju: ' + (CJA_STATUS_PEDIDO[st] || st || 'sem status') + '.') };
}
function Cju_pedidoAtualizarApi_(eu, d) {
  if (!Cju_pode_(eu, 'CAJU_CARGA') && !Cju_pode_(eu, 'CAJU_VER')) Cju_exigir_(eu, 'CAJU_CARGA', 'atualizar o pedido de crédito');
  var p = Cju_pedido_(d.pedidoId);
  if (!Via_s_(p.PEDIDO_CAJU_ID)) return Cju_resposta_(eu, d, p.ID, 'Este pedido não tem número do Caju: ' + (Via_up_(p.SITUACAO) === 'VERIFICAR' ? 'confira no portal e informe o número, ou libere.' : 'nada a atualizar.'));
  if (Via_s_(p.AMBIENTE) !== CajuApi_cfg_().ambiente) return Cju_resposta_(eu, d, p.ID, 'Este pedido é do ambiente ' + Via_s_(p.AMBIENTE) + ' e a integração está hoje em ' + (CajuApi_cfg_().ambiente || 'nenhum ambiente') + ': não foi consultado.');
  var r = Cju_pedidoAtualizar_(p, Cju_ctx_(eu, 'tela', p.ID), eu);
  return Cju_resposta_(eu, d, p.ID, r.texto);
}
/** Rotina e "Atualizar todos": cada pedido em andamento do ambiente atual. Criação parada há mais de 10 min vira VERIFICAR. */
function Cju_acompanharPedidos_(eu, origem) {
  var resumo = { lidos: 0, creditados: 0, mudaram: 0, erros: 0, pulados: 0 }, amb = CajuApi_cfg_();
  if (!amb.completo) return { fora: 'integração não configurada' };
  Cju_memoLimpar_();
  Cju_pedidosEmAndamento_().forEach(function (p) {
    if (Via_s_(p.AMBIENTE) !== amb.ambiente) { resumo.pulados++; return; }
    if (Via_up_(p.SITUACAO) === 'CRIANDO' && !Via_s_(p.PEDIDO_CAJU_ID)) {
      var min = (Date.now() - Date.parse(Via_iso_(p.CRIADO_EM) + ':00-03:00')) / 6e4;
      if (min > 10) Cju_mudarPedido_(p.ID, { SITUACAO: 'VERIFICAR', MENSAGEM: 'A criação no Caju não terminou. Confira no portal do Caju se o pedido "' + Via_s_(p.NOME_PEDIDO) + '" existe.' }, eu, 'CAJU_PEDIDO_INCERTO');
      resumo.pulados++; return;
    }
    if (!Via_s_(p.PEDIDO_CAJU_ID)) { resumo.pulados++; return; }
    try {
      resumo.lidos++;
      var r = Cju_pedidoAtualizar_(p, Cju_ctx_(eu, origem || 'rotina', p.ID), eu);
      if (r.mudou) resumo.mudaram++;
      if (Via_up_(Cju_pedido_(p.ID).SITUACAO) === 'CREDITADO') resumo.creditados++;
    } catch (e) { resumo.erros++; console.error('Conciliação Caju, acompanhar ' + p.ID + ': ' + Via_erro_(e)); }
  });
  return resumo;
}
function Cju_resumoAcompanhamento_(r) {
  if (!r || r.fora) return 'Nada consultado: ' + ((r && r.fora) || 'sem pedidos') + '.';
  return 'Pedidos consultados no Caju: ' + r.lidos + '. Mudaram de situação: ' + r.mudaram + '; creditados agora: ' + r.creditados + (r.erros ? '; com erro na consulta: ' + r.erros + ' (veja o registro das chamadas)' : '') + '.';
}

// ------------------------------------------------------------
// CREDITADO: A CARGA ENTRA SOZINHA NO DEPÓSITO (com o comprovante gerado)
// ------------------------------------------------------------
function Cju_registrarCargaPedido_(p, ped, eu) {
  var homolog = Via_s_(p.AMBIENTE) !== 'producao';
  var quem = { id: Via_s_(p.CRIADO_POR_ID), nome: Via_s_(p.CRIADO_POR_NOME) + ' (pedido Caju, automático)' };
  if (Via_s_(p.CARGA_ID) || Via_up_(p.SITUACAO) === 'CREDITADO') return { texto: 'Já creditado e registrado.' };
  if (homolog) {
    Cju_mudarPedido_(p.ID, { SITUACAO: 'CREDITADO', CREDITADO_EM: Via_agora_(), MENSAGEM: 'Homologação: crédito fictício. A carga NÃO entra no depósito.' }, eu, 'CAJU_CREDITADO_HOMOLOGACAO', 'Creditado no Caju (homologação, conta fictícia): a carga não entra no depósito.');
    return { texto: 'Creditado no Caju (homologação): a carga não entra no depósito porque o dinheiro é fictício.' };
  }
  var texto = '';
  Via_comTrava_(function () {
    Via_garantirAbas_(); Cju_memoLimpar_();
    var p2 = Cju_pedido_(p.ID);
    if (Via_s_(p2.CARGA_ID)) { texto = 'Já registrado.'; return; }
    var r = Via_solicitacao_(p2.SOLICITACAO_ID), valor = Number(p2.VALOR) || 0, agora = Via_agora_(), hoje = Via_hoje_();
    var saldo = Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0));
    var html = Cju_comprovantePedidoHtml_(p2, ped, r);
    var arq = Cju_salvarHtml_(html, Via_s_(r.NUMERO), 'Comprovante do pedido Caju ' + Via_s_(p2.PEDIDO_CAJU_ID) + '.html');
    var anexoId = Via_id_(), cargaId = Via_id_();
    SGO_DATA.insert(VIA_ABAS.ANEXOS, { ID: anexoId, SOLICITACAO_ID: r.ID, LINHA_ID: '', CATEGORIA: '', TIPO: 'COMPROVANTE_CARGA', NOME: arq.nome, ARQUIVO_ID: arq.id, URL: arq.url, MIME: 'text/html',
      TAMANHO: arq.tamanho, SHA: arq.sha, ENVIADO_POR_ID: quem.id, ENVIADO_POR_NOME: quem.nome, ENVIADO_EM: agora });
    SGO_DATA.insert(VIA_ABAS.CARGAS, { ID: cargaId, SOLICITACAO_ID: r.ID, REVISAO: p2.REVISAO, DATA: hoje, VALOR: Via_r2_(valor), CENTRO_CUSTO_CAJU: Via_s_(p2.CENTRO_CUSTO_CAJU), OBSERVACAO: 'Pedido de crédito Caju nº ' + Via_s_(p2.PEDIDO_CAJU_ID) + (Via_s_(p2.OBSERVACAO) ? '. ' + Via_s_(p2.OBSERVACAO) : ''),
      COMPROVANTE_ID: anexoId, COMPROVANTE_URL: arq.url, COMPROVANTE_NOME: arq.nome, POR_ID: quem.id, POR_NOME: quem.nome, EM: agora, EXTRATO_ID: '', CONCILIADA_EM: '',
      ORIGEM: 'CAJU_API', PEDIDO_CAJU_ID: Via_s_(p2.PEDIDO_CAJU_ID), TAXA_CAJU: ped.taxa !== null ? ped.taxa / 100 : '', TOTAL_CAJU: ped.total !== null ? ped.total / 100 : '' });
    var novoTotal = Via_r2_((Number(r.CARREGADO_TOTAL) || 0) + valor), s = Via_up_(r.SITUACAO);
    var campos = { CARREGADO_TOTAL: novoTotal, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: quem.nome };
    if (s === 'APROVADA' || s === 'CARGA_FEITA') { campos.SITUACAO = 'CARGA_FEITA'; campos.PRESTACAO_PRAZO = typeof Via_prazoCalcular_ === 'function' ? Via_prazoCalcular_(r.CHEGADA_EM) : ''; campos.PRESTACAO_SITUACAO = 'EM_ABERTO'; }
    SGO_DATA.update(VIA_ABAS.SOLICITACOES, r.ID, campos);
    Via_historico_('SOLICITACAO', r.ID, 'CARGA_REGISTRADA', quem, { revisao: p2.REVISAO, de: VIA_SITUACOES[s], para: campos.SITUACAO ? VIA_SITUACOES.CARGA_FEITA : VIA_SITUACOES[s],
      texto: 'Carga de ' + Via_moeda_(valor) + ' creditada pelo Caju (pedido ' + Via_s_(p2.PEDIDO_CAJU_ID) + (ped.taxa !== null ? ', taxa ' + Cju_centMoeda_(ped.taxa) : '') + (ped.total !== null ? ', total cobrado ' + Cju_centMoeda_(ped.total) : '') + ') no cartão de ' + Via_s_(r.RESPONSAVEL_NOME) + ', centro de custo ' + Via_s_(p2.CENTRO_CUSTO_CAJU) + '. Carregado: ' + Via_moeda_(novoTotal) + ' de ' + Via_moeda_(r.APROVADO_TOTAL) + '.' });
    Cju_mudarPedido_(p2.ID, { SITUACAO: 'CREDITADO', CREDITADO_EM: agora, CARGA_ID: cargaId, MENSAGEM: Via_cent_(valor) > Via_cent_(saldo) ? 'Atenção: o crédito passou do que faltava carregar no momento do registro.' : '' }, eu, 'CAJU_CREDITADO', 'Creditado no cartão; carga de ' + Via_moeda_(valor) + ' registrada no depósito.');
    texto = 'Creditado no cartão Caju de ' + Via_s_(r.RESPONSAVEL_NOME) + ': a carga de ' + Via_moeda_(valor) + ' foi registrada no depósito com o comprovante do pedido.';
    var r2 = SGO_DATA.getById(VIA_ABAS.SOLICITACOES, r.ID);
    Via_depois_(function () {
      Via_notificar_([Via_s_(r2.RESPONSAVEL_ID), Via_s_(r2.SOLICITANTE_ID)], r2, 'Carga no cartão Caju: ' + Via_s_(r2.NUMERO), 'O Caju creditou ' + Via_moeda_(valor) + ' no cartão Caju de ' + Via_s_(r2.RESPONSAVEL_NOME) + ' para a viagem ' + Via_s_(r2.NUMERO) + ' (' + Via_s_(r2.DESTINO_CIDADE) + '/' + Via_s_(r2.DESTINO_UF) + ').\nGaste no cartão Caju e guarde todos os comprovantes: a prestação de contas é gasto a gasto, no SGO+ (Depósito de viagem > Prestar contas), com a foto do comprovante e para que foi cada gasto' + (r2.PRESTACAO_PRAZO ? ', até ' + Via_brDia_(r2.PRESTACAO_PRAZO) : '') + '.');
      Cju_notificar_([Via_s_(p2.CRIADO_POR_ID)], 'CJU-CRED-' + p2.ID, 'Creditado pelo Caju: viagem ' + Via_s_(r2.NUMERO), 'O pedido ' + Via_s_(p2.PEDIDO_CAJU_ID) + ' foi creditado e a carga de ' + Via_moeda_(valor) + ' entrou no depósito com o comprovante do pedido.');
    });
  });
  return { texto: texto };
}
function Cju_salvarHtml_(html, numero, nome) {
  var raiz = SGO_DocSalvar_pastaPersistente_('VIA_PASTA_ANEXOS_ID', VIA_PASTA_ANEXOS, '');
  var pasta = numero && typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(raiz, numero) : raiz;
  var blob = Utilities.newBlob(html, 'text/html', SGO_DocSalvar_sanitizarNome_(nome));
  var f = pasta.createFile(blob);
  return { id: f.getId(), nome: f.getName(), url: f.getUrl(), sha: Via_marca_(html), tamanho: String(html).length };
}
function Cju_comprovantePedidoHtml_(p, ped, r) {
  var esc = SGO_DocA4_esc_, c = function (v) { return v === null || v === undefined || v === '' ? '—' : Cju_centMoeda_(v); };
  var doc = { titulo: 'Comprovante de carga no cartão Caju', subtitulo: 'Pedido de crédito feito pelo SGO+ na API do Caju', tituloCurto: 'Carga Caju', rotuloNumero: 'Viagem', numero: Via_s_(r.NUMERO),
    revisao: String(Number(p.REVISAO) || 0), emissao: Via_br_(Via_agora_()),
    ficha: [['Pedido no Caju', Via_s_(p.PEDIDO_CAJU_ID)], ['Nome do pedido', Via_s_(p.NOME_PEDIDO)], ['Situação no Caju', CJA_STATUS_PEDIDO[ped.status] || ped.status], ['Colaborador (cartão)', Via_s_(p.PESSOA_NOME)],
      ['Categoria do crédito', Via_s_(p.CATEGORIA)], ['Centro de custo', Via_s_(p.CENTRO_CUSTO_CODIGO) + (Via_s_(p.CENTRO_CUSTO_CAJU) && Via_s_(p.CENTRO_CUSTO_CAJU) !== Via_s_(p.CENTRO_CUSTO_CODIGO) ? ' (no Caju: ' + Via_s_(p.CENTRO_CUSTO_CAJU) + ')' : '')],
      ['Pagamento', Via_s_(p.PAGAMENTO) === 'PIX_CODE' ? 'PIX' : 'Saldo da conta Caju da empresa'], ['Pedido por', Via_s_(p.CRIADO_POR_NOME) + ' em ' + Via_br_(p.CRIADO_EM)], ['Ambiente', Via_s_(p.AMBIENTE)]],
    resultado: { classe: 'ok', rotulo: 'Creditado', valor: Via_moeda_(p.VALOR), texto: 'Crédito no cartão Caju de ' + Via_s_(p.PESSOA_NOME) + ' para a viagem ' + Via_s_(r.NUMERO) + '.' } };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  h.push('<h2>Valores do pedido</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Item' }, { t: 'Valor', cls: 'num' }], [['Crédito no cartão (aprovado na revisão ' + Via_s_(p.REVISAO) + ')', { t: Via_moeda_(p.VALOR), cls: 'num' }], ['Crédito informado pelo Caju', { t: c(ped.allowanceTotal), cls: 'num' }],
    ['Taxa de serviço do Caju', { t: c(ped.taxa), cls: 'num' }], ['Total cobrado da empresa', { t: c(ped.total), cls: 'num' }]]));
  var extras = [];
  if (ped.notaUrl || ped.notaNumero) extras.push(['Nota fiscal', (ped.notaNumero ? 'nº ' + ped.notaNumero + ' ' : '') + (ped.notaUrl || '')]);
  if (ped.pix) extras.push(['Código PIX usado', ped.pix]);
  if (ped.boletoUrl) extras.push(['Boleto', ped.boletoUrl]);
  if (ped.criadoEm) extras.push(['Criado no Caju em', ped.criadoEm.replace('T', ' ')]);
  if (ped.venceEm) extras.push(['Validade do crédito', ped.venceEm.replace('T', ' ')]);
  if (extras.length) { h.push('<h2>Documentos do Caju</h2>'); h.push(SGO_DocA4_tabela_([{ t: 'Documento' }, { t: 'Dados' }], extras)); }
  h.push('<p>Comprovante gerado pelo SGO+ em ' + esc(Via_br_(Via_agora_())) + ' a partir da consulta ao pedido na API do Caju (status ' + esc(ped.status) + '). A conciliação com o extrato fica no módulo Conciliação Caju.</p>');
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}

// ------------------------------------------------------------
// CANCELAR, INFORMAR O NÚMERO, LIBERAR
// ------------------------------------------------------------
function Cju_pedidoCancelar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CARGA', 'cancelar o pedido de crédito');
  d = d || {};
  var p = Cju_pedido_(d.pedidoId), motivo = Via_texto_(d.motivo, 400), s = Via_up_(p.SITUACAO);
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (10 letras ou mais).');
  if (['RASCUNHO', 'SALDO_INSUFICIENTE', 'AGUARDANDO_PIX', 'CONFERIR_VALOR'].indexOf(s) < 0) throw new Error('Não foi possível cancelar: o pedido está "' + (CJU_PED_SIT[s] || s).toLowerCase() + '". Depois de pago, o cancelamento só pelo portal do Caju (se o Caju ainda deixar); se o crédito já caiu, o saldo volta pelo recolhimento.');
  if (Via_s_(p.PEDIDO_CAJU_ID)) {
    var ped = CajuApi_consultarPedido_(Via_s_(p.PEDIDO_CAJU_ID), Cju_ctx_(eu, 'carga', p.ID));
    Cju_gravarConsulta_(p.ID, ped);
    if (['DRAFT', 'PAYMENT_PENDING'].indexOf(ped.status) < 0 && ped.status !== 'CANCELED') { Cju_pedidoAtualizar_(Cju_pedido_(p.ID), Cju_ctx_(eu, 'carga', p.ID), eu); throw new Error('Não foi possível cancelar: o Caju já está processando o pedido (' + (CJA_STATUS_PEDIDO[ped.status] || ped.status) + '). Confira no portal do Caju.'); }
    if (ped.status !== 'CANCELED') CajuApi_cancelarPedido_(Via_s_(p.PEDIDO_CAJU_ID), Cju_ctx_(eu, 'carga', p.ID));
  }
  Cju_mudarPedido_(p.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: Via_agora_(), CANCELADO_POR_NOME: eu.nome, CANCELADO_MOTIVO: motivo, MENSAGEM: '' }, eu, 'CAJU_PEDIDO_CANCELADO', 'Pedido cancelado por ' + eu.nome + '. Motivo: ' + motivo);
  return Cju_resposta_(eu, d, p.ID, 'Pedido cancelado. A solicitação volta a aceitar a carga (pelo Caju ou manual).');
}
function Cju_pedidoInformar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CARGA', 'informar o número do pedido');
  var p = Cju_pedido_(d.pedidoId), num = Via_s_(d.pedidoCajuId);
  if (Via_up_(p.SITUACAO) !== 'VERIFICAR') throw new Error('Não foi possível informar: este pedido não está esperando conferência.');
  if (!/^[A-Za-z0-9-]{6,80}$/.test(num)) throw new Error('Não foi possível informar: copie do portal do Caju o número (identificador) do pedido, sem espaços.');
  if (Cju_pedidos_().some(function (x) { return Via_s_(x.PEDIDO_CAJU_ID) === num; })) throw new Error('Não foi possível informar: este número já está ligado a outro pedido do SGO+.');
  var ped = CajuApi_consultarPedido_(num, Cju_ctx_(eu, 'carga', p.ID));
  if (ped.allowanceTotal !== null && ped.allowanceTotal !== Number(p.VALOR_CENTAVOS)) throw new Error('Não foi possível informar: o pedido ' + num + ' no Caju tem ' + Cju_centMoeda_(ped.allowanceTotal) + ', diferente deste (' + Via_moeda_(p.VALOR) + '). Confira se é o pedido certo.');
  Cju_mudarPedido_(p.ID, { PEDIDO_CAJU_ID: num, SITUACAO: ped.status === 'DRAFT' ? 'RASCUNHO' : 'PROCESSANDO', MENSAGEM: '' }, eu, 'CAJU_PEDIDO_INFORMADO', 'Número do pedido informado pelo Financeiro: ' + num + '.');
  Cju_gravarConsulta_(p.ID, ped);
  if (ped.status !== 'DRAFT') Cju_pedidoAtualizar_(Cju_pedido_(p.ID), Cju_ctx_(eu, 'carga', p.ID), eu);
  return Cju_resposta_(eu, d, p.ID, 'Pedido ' + num + ' ligado. ' + (ped.status === 'DRAFT' ? 'Ele está em rascunho no Caju: pague com o saldo ou por PIX.' : 'Situação: ' + (CJA_STATUS_PEDIDO[ped.status] || ped.status) + '.'));
}
function Cju_pedidoLiberar_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CARGA', 'liberar o pedido');
  var p = Cju_pedido_(d.pedidoId), motivo = Via_texto_(d.motivo, 400);
  if (Via_up_(p.SITUACAO) !== 'VERIFICAR') throw new Error('Não foi possível liberar: este pedido não está esperando conferência.');
  if (motivo.length < 10) throw new Error('Não foi possível liberar: escreva o que você conferiu no portal do Caju (10 letras ou mais), por exemplo "não há pedido com este nome no portal".');
  Cju_mudarPedido_(p.ID, { SITUACAO: 'RECUSADO', MENSAGEM: 'Não criado no Caju (conferido no portal por ' + eu.nome + '): ' + motivo }, eu, 'CAJU_PEDIDO_LIBERADO', 'Liberado: ' + motivo);
  return Cju_resposta_(eu, d, p.ID, 'Liberado. A solicitação aceita um pedido novo.');
}

// ------------------------------------------------------------
// TELA "CRÉDITOS": aprovado no SGO+ × pedido no Caju × creditado
// ------------------------------------------------------------
function Cju_creditosTela_(eu, d) {
  var sols = Via_ler_(VIA_ABAS.SOLICITACOES), pedidos = Cju_pedidos_(), cargas = Via_ler_(VIA_ABAS.CARGAS);
  var aguardando = sols.filter(function (r) { return ['APROVADA', 'CARGA_FEITA'].indexOf(Via_up_(r.SITUACAO)) >= 0 && Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0)) > 0; })
    .map(function (r) { var em = Cju_pedidoEmAndamentoDe_(r.ID); return { id: Via_s_(r.ID), numero: Via_s_(r.NUMERO), pessoa: Via_s_(r.RESPONSAVEL_NOME), destino: Via_s_(r.DESTINO_CIDADE) + '/' + Via_up_(r.DESTINO_UF), saida: Via_br_(r.SAIDA_EM),
      aprovadoTxt: Via_moeda_(r.APROVADO_TOTAL), faltaTxt: Via_moeda_(Via_r2_((Number(r.APROVADO_TOTAL) || 0) - (Number(r.CARREGADO_TOTAL) || 0))), vinculado: !!Cju_vinculoDe_(r.RESPONSAVEL_ID), pedido: em ? Cju_pedidoTela_(em, eu) : null }; });
  var porSol = {};
  sols.forEach(function (r) { porSol[Via_s_(r.ID)] = r; });
  var comCarga = sols.filter(function (r) { return Number(r.CARREGADO_TOTAL) > 0 || pedidos.some(function (p) { return Via_s_(p.SOLICITACAO_ID) === Via_s_(r.ID); }); }).map(function (r) {
    var cs = cargas.filter(function (g) { return Via_s_(g.SOLICITACAO_ID) === Via_s_(r.ID); }), ps = pedidos.filter(function (p) { return Via_s_(p.SOLICITACAO_ID) === Via_s_(r.ID); });
    var cred = ps.filter(function (p) { return Via_up_(p.SITUACAO) === 'CREDITADO'; }).reduce(function (s, p) { return s + Via_cent_(p.VALOR); }, 0);
    var taxa = ps.filter(function (p) { return Via_up_(p.SITUACAO) === 'CREDITADO'; }).reduce(function (s, p) { return s + (Number(p.TAXA_CENTAVOS) || 0); }, 0);
    var carregado = Via_cent_(r.CARREGADO_TOTAL), aprovado = Via_up_(r.APROVACAO_VALIDA) === 'SIM' || VIA_POS_CARGA.indexOf(Via_up_(r.SITUACAO)) >= 0 || carregado > 0 ? Via_cent_(r.APROVADO_TOTAL) : 0;
    var manual = cs.filter(function (g) { return Via_up_(g.ORIGEM) !== 'CAJU_API'; }).reduce(function (s, g) { return s + Via_cent_(g.VALOR); }, 0);
    var noExtrato = cs.filter(function (g) { return Via_s_(g.EXTRATO_ID); }).reduce(function (s, g) { return s + Via_cent_(g.VALOR); }, 0);
    var sit = carregado > aprovado ? 'ACIMA' : carregado === aprovado ? 'OK' : 'FALTA';
    return { id: Via_s_(r.ID), numero: Via_s_(r.NUMERO), pessoa: Via_s_(r.RESPONSAVEL_NOME), centro: Via_s_(r.CENTRO_CUSTO_CODIGO), aprovadoTxt: Cju_centMoeda_(aprovado), carregadoTxt: Cju_centMoeda_(carregado),
      cajuTxt: Cju_centMoeda_(cred), manualTxt: Cju_centMoeda_(manual), taxaTxt: Cju_centMoeda_(taxa), noExtratoTxt: Cju_centMoeda_(noExtrato), conferidoNoExtrato: carregado > 0 && noExtrato === carregado,
      situacao: sit, situacaoNome: sit === 'ACIMA' ? 'Carregado acima do aprovado' : sit === 'OK' ? 'Aprovado = carregado' : 'Falta carregar', pedidos: ps.length };
  }).sort(function (a, b) { return b.numero.localeCompare(a.numero); });
  return { aguardando: aguardando, viagens: comCarga, pedidos: pedidos.slice().sort(function (a, b) { return Via_s_(b.CRIADO_EM).localeCompare(Via_s_(a.CRIADO_EM)); }).map(function (p) { return Cju_pedidoTela_(p, eu); }),
    integracao: CajuApi_situacao_(), categoria: Cju_config_().categoria, poderes: Cju_poderes_(eu), modoCarga: Cju_modoCarga_() };
}
