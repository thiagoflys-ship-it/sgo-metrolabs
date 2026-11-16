/****************************************************
 * COMERCIAL — GESTORA AUTOMÁTICA (11/11/2026)
 *
 * Pedido do dono (11/11/2026): "a gestora cria as estratégias automaticamente e cria as atividades para o vendedor, pois se
 * depender de alguém para ficar monitorando, por agora que não temos um gestor de verdade, irá ficar pendente ... cria um botão
 * seletor se fazemos isso automático ou não, para quando eu contratar um gestor".
 *
 * O que faz (rotina do Comercial, chamada pela rotina da gestão; só em dia útil e no expediente; no máximo uma vez por hora):
 *   1. Levanta, por vendedor responsável, os itens da lista do dia (ComG_itensVendedor_) que pedem ação num ORÇAMENTO:
 *      proposta pronta e não enviada, enviada sem resposta, vencendo, vencida sem resposta, desconto negado, recusa sem decisão
 *      e pedido aprovado sem passagem aos setores. Das oportunidades, só as de prioridade "Antes de tudo" que já têm orçamento em
 *      andamento (sem próxima ação, parada, mudar a estratégia): é o mesmo dinheiro da proposta e, sem gestor, é exatamente o que
 *      fica esquecido. Oportunidades sem orçamento (prospecção, CRM antigo) continuam só na lista do dia, para não inundar.
 *      O retorno atrasado comum não vira atividade: a atividade do retorno já existe e Minhas atividades já cobra o atraso.
 *   2. Cria UMA atividade em Minhas atividades do responsável por item (chave estável: regra + proposta ou oportunidade), com o
 *      porquê, o que fazer, a estratégia (regras da metodologia; texto reescrito pela gestora quando há chave da IA e o
 *      verificador aprova; senão, o das regras), a mensagem sugerida (o vendedor revisa e envia) e onde fazer.
 *      Quando o item já tem a atividade automática do próprio fluxo aberta (retorno sobre a proposta, aviso de vencimento,
 *      próxima ação da oportunidade), não cria outra: deixa a estratégia como comentário nessa atividade (COMPLEMENTO).
 *   3. Item que deixou de existir (proposta enviada, respondida, renovada, pedido passado...) = atividade concluída sozinha,
 *      com o motivo. Atividade concluída ou cancelada pela pessoa com o item ainda pendente = a gestora espera 2 dias úteis
 *      antes de lembrar de novo.
 *   4. Teto por vendedor: 5 atividades novas por dia e 10 abertas da gestora ao mesmo tempo, as mais urgentes primeiro
 *      (prioridade e valor). O resto espera a próxima rodada ou o próximo dia.
 *   5. Prazo: "Antes de tudo" = 4 horas de expediente; "Hoje" = fim do expediente de hoje, ou do próximo dia útil quando
 *      faltam menos de 4 horas.
 *   6. Registro de tudo em COM_GESTORA_AUTOMATICA (chave, atividade, quando, situação, estratégia e origem do texto) e no
 *      histórico da proposta ou da oportunidade.
 *
 * Nunca envia nada ao cliente, nunca muda etapa, situação ou preço e nunca aprova desconto (as mesmas proibições da gestora).
 *
 * Seletor "Gestora automática: ligada / desligada" (COM_CONFIG, CHAVE 'GESTORA_AUTO', uma linha por versão, com quem, quando e
 * o motivo). Padrão: LIGADA (pedido do dono, 11/11/2026). Muda quem é da gestão comercial (Com_exigir_ 'GESTAO', o poder
 * COM_GESTAO_COMERCIAL: Administrador, Diretoria, dono e gestor comercial), porque o seletor existe para quando houver gestor
 * comercial: é ele quem assume o acompanhamento. Desligada: nenhuma atividade nova; as abertas continuam com os vendedores e
 * são concluídas sozinhas quando o item se resolve; a lista do dia continua igual.
 ****************************************************/

var COM_GA_ABA = 'COM_GESTORA_AUTOMATICA';
var COM_GA_COLUNAS = ['ID', 'CHAVE', 'REGRA', 'PRIORIDADE', 'USUARIO_ID', 'USUARIO_NOME', 'REF_TIPO', 'REF_ID', 'REF_ROTULO', 'MODO', 'ATIVIDADE_ID', 'TITULO',
  'SITUACAO', 'ORIGEM_TEXTO', 'ESTRATEGIA', 'VERIFICACAO', 'PRAZO', 'DIA', 'ENCERRADA_EM', 'MOTIVO_ENCERRAMENTO', 'CRIADO_EM'];
var COM_GA_COLUNAS_TEXTO = ['DIA', 'PRAZO', 'ENCERRADA_EM'];
var COM_GA_TETO_DIA = 5, COM_GA_TETO_ABERTAS = 10, COM_GA_ESPERA_DIAS_UTEIS = 2;
var COM_GA_EU = { id: 'COMERCIAL', nome: 'Gestora automática do Comercial' };
var COM_GA_PROP_ULTIMA = 'COM_GESTORA_AUTO_ULTIMA';
/** Regras que viram atividade: o que fazer (início do título), e se é de oportunidade (só com orçamento em andamento). */
var COM_GA_REGRAS = {
  PEDIDO_SEM_PASSAGEM: { verbo: 'Passar o pedido aprovado aos setores' },
  PROPOSTA_PRONTA: { verbo: 'Enviar a proposta pronta' },
  PROPOSTA_SEM_RESPOSTA: { verbo: 'Combinar a decisão da proposta sem resposta', estrategia: true, existente: 'RETORNO_ATIVIDADE_ID' },
  PROPOSTA_VENCENDO: { verbo: 'Confirmar a decisão antes do vencimento', estrategia: true, existente: 'VENCIMENTO_ATIVIDADE_ID' },
  PROPOSTA_VENCIDA: { verbo: 'Renovar ou encerrar a proposta vencida', estrategia: true },
  DESCONTO_NEGADO: { verbo: 'Ajustar a proposta (desconto não aprovado)' },
  RECUSA_SEM_DECISAO: { verbo: 'Decidir o próximo passo da proposta recusada' },
  MUDAR_ESTRATEGIA: { verbo: 'Mudar a estratégia de contato', estrategia: true, oportunidade: true, existente: 'ATIVIDADE_ID' },
  SEM_PROXIMA: { verbo: 'Marcar a próxima ação', oportunidade: true, grupo: 'OPO_REAQUECER' },
  PARADA: { verbo: 'Reaquecer a oportunidade parada', estrategia: true, oportunidade: true, grupo: 'OPO_REAQUECER' }
};
var COM_GA_SITUACOES = { ABERTA: 'Atividade aberta', COMPLEMENTO: 'Estratégia deixada na atividade existente', RESOLVIDA: 'Resolvida (concluída sozinha)', ENCERRADA_PELA_PESSOA: 'Encerrada pela pessoa com o item ainda pendente' };

// ------------------------------------------------------------
// TABELA E CONFIGURAÇÃO
// ------------------------------------------------------------
function ComGA_garantirAba_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('COM_GA_ABA_OK_V1')) return; } catch (e) {}
  CertCal_garantirTabela_(COM_GA_ABA, COM_GA_COLUNAS);
  COM_GA_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(COM_GA_ABA, c); });
  COM_GA_COLUNAS_TEXTO.forEach(function (c) { CertCal_forcarColunaTexto_(COM_GA_ABA, c); });
  try { if (cache) cache.put('COM_GA_ABA_OK_V1', '1', 21600); } catch (e) {}
}

/** Versões do seletor, a mais nova primeiro. */
function ComGA_versoes_() {
  return Com_ler_(COM_ABAS.CONFIG).filter(function (r) { return Com_s_(r.CHAVE) === 'GESTORA_AUTO'; })
    .sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); });
}

/** { ligada, versao, em, por, motivo }. Sem nenhuma versão gravada: LIGADA (padrão pedido pelo dono). Nunca lança. */
function ComGA_config_() {
  var l = [];
  try { l = ComGA_versoes_(); } catch (e) { l = []; }
  var v = l[0] ? (Com_json_(l[0].VALOR_JSON, {}) || {}) : {};
  return { ligada: l[0] ? v.ligada !== false : true, versao: l[0] ? Number(l[0].VERSAO) || 1 : 0, em: l[0] ? Com_br_(l[0].ATUALIZADO_EM || l[0].CRIADO_EM) : '',
    por: l[0] ? Com_s_(l[0].ATUALIZADO_POR_NOME) : '', motivo: l[0] ? Com_s_(l[0].MOTIVO) : '' };
}

/** Liga ou desliga. d: { ligada: true|false, motivo (>= 10 letras) }. Só a gestão comercial (Administrador, Diretoria, dono, gestor comercial). */
function ComGA_salvarSeletor_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'ligar ou desligar a gestora automática');
  d = d || {};
  if (typeof d.ligada !== 'boolean') throw new Error('Não foi possível mudar a gestora automática: escolha "Ligar" ou "Desligar" e confirme de novo');
  var motivo = Com_texto_(d.motivo, 500).trim();
  if (motivo.length < 10) throw new Error('Não foi possível mudar a gestora automática: escreva o motivo da mudança (pelo menos 10 letras). Ele fica no histórico, para todos saberem por que mudou');
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var atual = ComGA_config_();
    if (atual.ligada === d.ligada) return { message: 'A gestora automática já estava ' + (d.ligada ? 'ligada' : 'desligada') + '. Nada mudou.', painel: ComGA_painel_(eu) };
    var versao = (atual.versao || 0) + 1, agora = Com_agora_();
    SGO_DATA.insert(COM_ABAS.CONFIG, { CHAVE: 'GESTORA_AUTO', VALOR_JSON: JSON.stringify({ ligada: d.ligada }), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
    Com_historico_('CONFIG', 'GESTORA_AUTO', 'GESTORA_AUTO', eu, { de: atual.ligada ? 'Ligada' : 'Desligada', para: d.ligada ? 'Ligada' : 'Desligada', texto: 'Gestora automática ' + (d.ligada ? 'ligada' : 'desligada') + ' (versão ' + versao + '). Motivo: ' + motivo });
    return { message: d.ligada ? 'Gestora automática ligada. Na próxima rodada do Comercial (até 1 hora, só em dia útil e no expediente) ela cria as atividades dos orçamentos que precisam de ação.'
      : 'Gestora automática desligada. Nenhuma atividade nova será criada; as que já estão abertas continuam com os vendedores e são concluídas sozinhas quando o item se resolver. A lista do dia continua igual.', painel: ComGA_painel_(eu) };
  });
}

/** Quadro da tela (área de gestão do Hoje no Comercial). */
function ComGA_painel_(eu) {
  Com_exigir_(eu, 'GESTAO', 'ver a gestora automática');
  var cfg = ComGA_config_(), hoje = Com_hoje_(), corte = Com_somarDias_(hoje, -7), regs = Com_ler_(COM_GA_ABA);
  var abertas = regs.filter(function (r) { return Com_s_(r.SITUACAO) === 'ABERTA'; });
  var ultima = '';
  try { var u = Number(PropertiesService.getScriptProperties().getProperty(COM_GA_PROP_ULTIMA)) || 0; if (u) ultima = Utilities.formatDate(new Date(u), COM_FUSO, 'dd/MM/yyyy HH:mm'); } catch (e) {}
  return {
    ligada: cfg.ligada, versao: cfg.versao, em: cfg.em, por: cfg.por, motivo: cfg.motivo, podeMudar: !!eu.gestao, ultimaRodada: ultima,
    tetoDia: COM_GA_TETO_DIA, tetoAbertas: COM_GA_TETO_ABERTAS, esperaDiasUteis: COM_GA_ESPERA_DIAS_UTEIS,
    numeros: { abertas: abertas.length, criadasHoje: regs.filter(function (r) { return Com_s_(r.MODO) === 'CRIADA' && Com_dia_(r.DIA) === hoje; }).length,
      complementosHoje: regs.filter(function (r) { return Com_s_(r.MODO) === 'COMPLEMENTO' && Com_dia_(r.DIA) === hoje; }).length,
      resolvidas7d: regs.filter(function (r) { return Com_s_(r.SITUACAO) === 'RESOLVIDA' && Com_dia_(r.ENCERRADA_EM) >= corte; }).length },
    abertasLista: abertas.sort(function (a, b) { return String(a.PRAZO).localeCompare(String(b.PRAZO)); }).slice(0, 20)
      .map(function (r) { return { vendedor: Com_s_(r.USUARIO_NOME), titulo: Com_s_(r.TITULO), prazo: Com_br_(r.PRAZO), origem: Com_s_(r.ORIGEM_TEXTO) === 'IA' ? 'texto da gestora conferido' : 'texto das regras' }; }),
    historico: ComGA_versoes_().slice(0, 10).map(function (r) { var v = Com_json_(r.VALOR_JSON, {}) || {}; return { versao: Number(r.VERSAO) || 0, situacao: v.ligada === false ? 'Desligada' : 'Ligada', em: Com_br_(r.ATUALIZADO_EM || r.CRIADO_EM), por: Com_s_(r.ATUALIZADO_POR_NOME), motivo: Com_s_(r.MOTIVO) }; })
  };
}

// ------------------------------------------------------------
// APOIO
// ------------------------------------------------------------
function ComGA_chave_(it) { var g = (COM_GA_REGRAS[it.regra] || {}).grupo || it.regra; return g + ':' + Com_s_(it.ref && it.ref.tipo) + ':' + Com_s_(it.ref && it.ref.id); }

function ComGA_minutos_(hm) { return Number(String(hm).slice(0, 2)) * 60 + Number(String(hm).slice(3, 5)); }
function ComGA_hm_(m) { var h = Math.floor(m / 60), x = m % 60; return (h < 10 ? '0' : '') + h + ':' + (x < 10 ? '0' : '') + x; }

/** Prazo pela prioridade e pelo expediente: 1 = 4 horas de expediente; 2 = fim do expediente de hoje (ou do próximo dia útil se faltam menos de 4 horas). */
function ComGA_prazo_(prioridade, agora) {
  var cfg = Com_expediente_() || { ini: '08:00', fim: '17:30' };
  var ini = ComGA_minutos_(cfg.ini), fim = ComGA_minutos_(cfg.fim), dia = agora.slice(0, 10), t = Math.max(ComGA_minutos_(agora.slice(11, 16)), ini);
  if (t >= fim) { dia = Com_somarDiasUteis_(dia, 1); t = ini; }
  if (prioridade !== 1) return (fim - t >= 240 ? dia : Com_somarDiasUteis_(dia, 1)) + 'T' + ComGA_hm_(fim);
  var falta = 240, guarda = 0;
  while (falta > 0 && guarda++ < 10) {
    if (falta <= fim - t) { t += falta; falta = 0; }
    else { falta -= fim - t; dia = Com_somarDiasUteis_(dia, 1); t = ini; }
  }
  return dia + 'T' + ComGA_hm_(t);
}

function ComGA_proposta_(ctx, id) { return ctx.propostas.filter(function (p) { return Com_s_(p.ID) === Com_s_(id); })[0] || null; }
function ComGA_oportunidade_(ctx, id) { return ctx.oportunidades.filter(function (o) { return Com_s_(o.ID) === Com_s_(id); })[0] || null; }

/** A oportunidade tem orçamento em andamento (proposta não substituída, fora do investimento)? */
function ComGA_temOrcamento_(o, ctx) {
  if (typeof ComP_opInvestimento_ === 'function' && ComP_opInvestimento_(o, ctx.propostas)) return false;
  return ctx.propostas.some(function (p) {
    return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && !Com_s_(p.SUBSTITUIDA_POR) && ['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA', 'VENCIDA', 'RECUSADA'].indexOf(Com_up_(p.SITUACAO)) >= 0;
  });
}

function ComGA_elegivel_(it, ctx) {
  var r = COM_GA_REGRAS[it.regra];
  if (!r || !it.ref || !it.ref.id) return false;
  if (r.oportunidade) { var o = ComGA_oportunidade_(ctx, it.ref.id); return !!o && ComGA_temOrcamento_(o, ctx); }
  return it.ref.tipo === 'proposta';
}

/** Atividade do próprio fluxo, já aberta, para o mesmo item (não duplica: a gestora comenta nela). '' se não houver. */
function ComGA_atividadeExistente_(it, ctx) {
  var campo = (COM_GA_REGRAS[it.regra] || {}).existente;
  if (!campo) return '';
  var reg = it.ref.tipo === 'proposta' ? ComGA_proposta_(ctx, it.ref.id) : ComGA_oportunidade_(ctx, it.ref.id);
  var id = reg ? Com_s_(reg[campo]) : '';
  return id && Com_atividadeAberta_(Com_atividade_(id)) ? id : '';
}

/** Oportunidade do item (a da proposta, quando o item é de proposta). */
function ComGA_oportunidadeDoItem_(it, ctx) {
  if (it.ref.tipo === 'oportunidade') return ComGA_oportunidade_(ctx, it.ref.id);
  var p = ComGA_proposta_(ctx, it.ref.id);
  return p ? ComGA_oportunidade_(ctx, p.OPORTUNIDADE_ID) : null;
}

/** Estratégia pelas regras da metodologia (canal, outro contato, proposta, gestão) para quem não responde. '' quando não se aplica. */
function ComGA_estrategia_(it, ctx) {
  if (!(COM_GA_REGRAS[it.regra] || {}).estrategia) return '';
  var o = ComGA_oportunidadeDoItem_(it, ctx);
  if (!o) return '';
  var regs = ctx.contatosReg.filter(function (r) { return Com_s_(r.OPORTUNIDADE_ID) === Com_s_(o.ID); }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); });
  var temProp = ctx.propostas.some(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && Com_up_(p.SITUACAO) === 'ENVIADA'; });
  var est = ComG_estrategia_(o, regs, temProp, ctx.contatosCli[Com_s_(o.CLIENTE_ID)] || 0, ctx.met);
  return Com_s_(est.titulo) + ': ' + Com_s_(est.detalhe) + (Com_s_(est.texto) ? ' ' + Com_s_(est.texto) : '');
}

/** Por que o item saiu da lista (situação de agora da proposta ou da oportunidade). */
function ComGA_motivoResolvido_(r, ctx) {
  if (Com_s_(r.REF_TIPO) === 'proposta') {
    var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, Com_s_(r.REF_ID));
    if (!p || (typeof ComP_excluida_ === 'function' && ComP_excluida_(p))) return 'a proposta foi excluída.';
    if (Com_s_(p.SUBSTITUIDA_POR)) return 'a proposta foi substituída por uma nova revisão.';
    if (Com_up_(p.SITUACAO) === 'APROVADA' && Com_s_(r.REGRA) === 'PEDIDO_SEM_PASSAGEM') return 'o pedido foi passado aos setores.';
    if (typeof ComP_investimento_ === 'function' && ComP_investimento_(p)) return 'o orçamento foi marcado como investimento (sem cobrança de retorno).';
    return 'a proposta agora está "' + (COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || Com_s_(p.SITUACAO)) + '".';
  }
  var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(r.REF_ID));
  if (!o || Com_up_(o.SITUACAO) === 'EXCLUIDA') return 'a oportunidade foi excluída.';
  if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') return 'a oportunidade foi ' + (Com_up_(o.SITUACAO) === 'GANHA' ? 'ganha.' : 'encerrada como ' + Com_s_(COM_SITUACOES_OPO[Com_up_(o.SITUACAO)] || o.SITUACAO).toLowerCase() + '.');
  return Com_s_(r.REGRA) === 'MUDAR_ESTRATEGIA' ? 'o cliente respondeu ou o retorno foi refeito com data nova.' : 'a oportunidade voltou a ter contato e próxima ação com data.';
}

/** Texto da gestora aceito pelo verificador e sem valor em reais (atividade não leva valor). */
function ComGA_textoSeguro_(t) { return !!Com_s_(t) && !/R\$\s*\d/.test(t); }

// ------------------------------------------------------------
// RODADA (rotina do Comercial)
// ------------------------------------------------------------
/**
 * Uma rodada: conclui o que se resolveu e, ligada, cria as atividades novas dentro do teto. Idempotente.
 * opcoes.semIA: não chama a IA (testes ou quem quiser só as regras). Devolve os números da rodada. Nunca lança por item.
 */
function ComGA_rodada_(quando, opcoes) {
  opcoes = opcoes || {};
  var data = quando || new Date();
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(data) : { dentro: true };
  if (!ex.dentro) return { fora: 'fora do expediente: ' + ex.motivo };
  Com_garantirAbas_();
  ComGA_garantirAba_();
  try { PropertiesService.getScriptProperties().setProperty(COM_GA_PROP_ULTIMA, String(data.getTime())); } catch (e) {}
  var cfg = ComGA_config_(), agora = Com_agora_(), hoje = Com_hoje_(), res = { ligada: cfg.ligada, criadas: 0, complementos: 0, resolvidas: 0, encerradasPelaPessoa: 0, aguardandoTeto: 0, erros: 0 };
  var ctx = ComG_ctx_(), us = Com_usuarios_();
  ctx.contatosCli = {};
  Com_ler_(COM_ABAS.CONTATOS).forEach(function (k) { if (Com_up_(k.STATUS || 'ATIVO') === 'ATIVO') ctx.contatosCli[Com_s_(k.CLIENTE_ID)] = (ctx.contatosCli[Com_s_(k.CLIENTE_ID)] || 0) + 1; });

  // itens de agora (só os que viram atividade), por chave
  var uids = {};
  ctx.oportunidades.forEach(function (o) { if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') uids[Com_s_(o.RESPONSAVEL_ID)] = true; });
  ctx.propostas.forEach(function (p) { if (['RASCUNHO', 'PRONTA', 'ENVIADA', 'VENCIDA', 'RECUSADA', 'APROVADA'].indexOf(Com_up_(p.SITUACAO)) >= 0) uids[Com_s_(p.RESPONSAVEL_ID)] = true; });
  var atuais = {}, porVendedor = {}, comErro = {};
  Object.keys(uids).forEach(function (uid) {
    if (!uid || !us[uid] || !us[uid].ativo) return;
    var itens = [];
    try { itens = ComG_itensVendedor_(uid, ctx); } catch (e) { res.erros++; comErro[uid] = true; console.error('Comercial, gestora automática (itens de ' + uid + '): ' + ((e && e.message) || e)); return; }
    itens.forEach(function (it) {
      if (!ComGA_elegivel_(it, ctx)) return;
      var k = ComGA_chave_(it);
      if (atuais[k]) return;
      atuais[k] = { it: it, uid: uid };
      (porVendedor[uid] = porVendedor[uid] || []).push(k);
    });
  });

  // 1. o que já foi feito: concluir sozinha o que se resolveu; anotar o que a pessoa encerrou
  var regs = Com_ler_(COM_GA_ABA);
  var ativos = {}, ultimaEncerrada = {};
  regs.forEach(function (r) {
    var sit = Com_s_(r.SITUACAO), k = Com_s_(r.CHAVE);
    if (sit === 'ABERTA' || sit === 'COMPLEMENTO') {
      var cur = atuais[k], a = Com_atividade_(r.ATIVIDADE_ID), aberta = Com_atividadeAberta_(a);
      // itens deste vendedor não puderam ser levantados nesta rodada: não conclui nada por falta de dado
      if (comErro[Com_s_(r.USUARIO_ID)]) { ativos[k] = r; return; }
      var dono = us[Com_s_(r.USUARIO_ID)];
      if (!cur && (!dono || !dono.ativo)) {
        // responsável inativado: a atividade fica aberta para a gestão passar a proposta a outra pessoa (Atividades da equipe)
        if (!r.MOTIVO_ENCERRAMENTO) SGO_DATA.update(COM_GA_ABA, r.ID, { MOTIVO_ENCERRAMENTO: 'Responsável inativo no SGO+: a gestão precisa passar o item a outra pessoa.' });
        ativos[k] = r; return;
      }
      if (!cur || cur.uid !== Com_s_(r.USUARIO_ID)) {
        var motivo = cur ? 'o item passou para outro responsável (' + Com_s_((us[cur.uid] || {}).nome) + ').' : ComGA_motivoResolvido_(r, ctx);
        if (sit === 'ABERTA' && aberta) Com_mudarAtividade_(Com_s_(r.ATIVIDADE_ID), 'Concluída', 'Concluída sozinha pela gestora automática: ' + motivo);
        SGO_DATA.update(COM_GA_ABA, r.ID, { SITUACAO: 'RESOLVIDA', ENCERRADA_EM: agora, MOTIVO_ENCERRAMENTO: Com_texto_(motivo, 500) });
        Com_historico_(Com_s_(r.REF_TIPO) === 'proposta' ? 'PROPOSTA' : 'OPORTUNIDADE', Com_s_(r.REF_ID), 'GESTORA_AUTOMATICA', COM_GA_EU,
          { texto: (sit === 'ABERTA' ? 'Atividade "' + Com_s_(r.TITULO) + '" concluída sozinha: ' : 'Item da gestora automática resolvido: ') + motivo });
        res.resolvidas++;
        return;
      }
      if (!aberta) {
        var quem = a ? 'A atividade foi ' + Com_s_(a.SITUACAO).toLowerCase() + ' com o item ainda pendente.' : 'A atividade não existe mais.';
        SGO_DATA.update(COM_GA_ABA, r.ID, { SITUACAO: 'ENCERRADA_PELA_PESSOA', ENCERRADA_EM: agora, MOTIVO_ENCERRAMENTO: quem + ' A gestora volta a lembrar depois de ' + COM_GA_ESPERA_DIAS_UTEIS + ' dias úteis se continuar pendente.' });
        ultimaEncerrada[k] = agora;
        res.encerradasPelaPessoa++;
        return;
      }
      ativos[k] = r;
    } else if (sit === 'ENCERRADA_PELA_PESSOA') {
      var em = Com_s_(r.ENCERRADA_EM);
      if (!ultimaEncerrada[k] || em > ultimaEncerrada[k]) ultimaEncerrada[k] = em;
    }
  });
  if (!cfg.ligada) return res;

  // 2. novas, por vendedor, dentro do teto
  Object.keys(porVendedor).forEach(function (uid) {
    var hojeN = regs.filter(function (r) { return Com_s_(r.USUARIO_ID) === uid && Com_dia_(r.DIA) === hoje && ['CRIADA', 'COMPLEMENTO'].indexOf(Com_s_(r.MODO)) >= 0; }).length;
    var abertasN = Object.keys(ativos).filter(function (k) { return Com_s_(ativos[k].USUARIO_ID) === uid && Com_s_(ativos[k].SITUACAO) === 'ABERTA'; }).length;
    var candidatos = porVendedor[uid].filter(function (k) {
      if (ativos[k]) return false;
      var enc = ultimaEncerrada[k];
      return !(enc && Com_diasUteisEntre_(Com_dia_(enc), hoje) < COM_GA_ESPERA_DIAS_UTEIS);
    }).map(function (k) { return atuais[k].it; });
    candidatos.sort(function (a, b) { return a.prioridade - b.prioridade || (b.ponderado || b.valor || 0) - (a.ponderado || a.valor || 0); });
    var vagas = Math.max(0, Math.min(COM_GA_TETO_DIA - hojeN, COM_GA_TETO_ABERTAS - abertasN));
    var escolhidos = candidatos.slice(0, vagas);
    res.aguardandoTeto += candidatos.length - escolhidos.length;
    if (!escolhidos.length) return;
    // a gestora reescreve com a metodologia (o verificador confere); recusado ou sem IA = texto das regras
    var ref = { aviso: '' };
    if (!opcoes.semIA) { try { ref = ComG_refinarComIA_(escolhidos, 'VENDEDOR', ctx.met) || ref; } catch (eIA) { ref = { aviso: 'A IA não respondeu; valem as regras.' }; } }
    escolhidos.forEach(function (it) {
      try {
        var r = ComGA_criarItem_(it, uid, us[uid], ctx, agora, hoje, ref.aviso);
        if (r === 'CRIADA') res.criadas++; else if (r === 'COMPLEMENTO') res.complementos++;
      } catch (e) { res.erros++; console.error('Comercial, gestora automática (' + it.chave + '): ' + ((e && e.message) || e)); }
    });
  });
  return res;
}

/** Cria a atividade (ou o comentário na atividade existente) de um item e registra. Devolve 'CRIADA' ou 'COMPLEMENTO'. */
function ComGA_criarItem_(it, uid, u, ctx, agora, hoje, avisoIA) {
  var regra = COM_GA_REGRAS[it.regra], k = ComGA_chave_(it);
  var p = it.ref.tipo === 'proposta' ? ComGA_proposta_(ctx, it.ref.id) : null, o = ComGA_oportunidadeDoItem_(it, ctx) || {};
  var rotulo = p ? ComP_rotulo_(p) : Com_s_(o.CODIGO), cliente = Com_s_((p || o).CLIENTE_NOME);
  var usouIA = ComGA_textoSeguro_(it.porqueIA) && ComGA_textoSeguro_(it.acaoIA);
  var porque = usouIA ? it.porqueIA : it.porque, acao = usouIA ? it.acaoIA : it.acao;
  var estrategia = ComGA_estrategia_(it, ctx);
  var verif = usouIA ? 'Texto da gestora aceito pelo verificador.' : (it.recusaIA ? 'Texto da gestora recusado pelo verificador (' + it.recusaIA + '); valem as regras.' : (it.porqueIA || it.acaoIA ? 'Texto da gestora com valor em reais; valem as regras.' : (avisoIA || 'Sem texto da gestora; valem as regras.')));
  var onde = p ? 'Comercial > Propostas > ' + rotulo : 'Comercial > Oportunidades > ' + rotulo;
  var titulo = Com_texto_(regra.verbo + ': ' + rotulo + (cliente ? ' · ' + cliente : ''), 200);
  var existente = ComGA_atividadeExistente_(it, ctx);
  var l = [];
  l.push('Por quê: ' + porque);
  l.push('O que fazer: ' + acao);
  if (estrategia) l.push('Estratégia da metodologia: ' + estrategia);
  if (it.tambem && it.tambem.length) l.push('Também pendente no mesmo item: ' + it.tambem.join('; ') + '.');
  if (it.mensagem) l.push('Mensagem sugerida (revise antes de enviar; o sistema não envia nada ao cliente):\n' + it.mensagem);
  l.push('Onde fazer: ' + onde + ' (ou pelo Hoje no Comercial, botão "Abrir").');
  var rodape = 'Orientação ' + (usouIA ? 'da gestora conferida contra os dados do sistema' : 'pelas regras da metodologia comercial') + '. A gestora não envia nada, não muda etapa nem preço e não aprova desconto.';
  return Com_comTrava_(function () {
    // conferência dentro da trava: outra rodada pode ter registrado a mesma chave
    var ja = Com_ler_(COM_GA_ABA).some(function (r) { return Com_s_(r.CHAVE) === k && ['ABERTA', 'COMPLEMENTO'].indexOf(Com_s_(r.SITUACAO)) >= 0; });
    if (ja) return '';
    var atvId = '', modo = 'CRIADA', prazo = '';
    if (existente) {
      modo = 'COMPLEMENTO'; atvId = existente;
      var rc = Com_comoSistema_(function (t) { return Atividades_apiComentar(t, { id: existente, texto: 'Gestora automática (' + COM_G_PRIORIDADE[it.prioridade] + '): ' + l.join('\n') + '\n' + rodape }); });
      if (!rc || !rc.ok) throw new Error(String((rc && rc.message) || 'Minhas atividades não respondeu'));
    } else {
      prazo = ComGA_prazo_(it.prioridade, agora);
      var desc = l.join('\n') + '\n' + rodape + '\nEsta atividade é concluída sozinha quando o item se resolver. Se não se aplicar, conclua com o motivo; se o item continuar pendente, a gestora volta a lembrar depois de ' + COM_GA_ESPERA_DIAS_UTEIS + ' dias úteis.';
      var dados = { responsavelId: uid, titulo: titulo, descricao: desc, prazo: prazo, prioridade: it.prioridade === 1 ? 'Alta' : 'Normal',
        clienteId: Com_s_((p || o).CLIENTE_ID), unidadeId: Com_s_((p || o).UNIDADE_ID), porQue: Com_texto_(porque, 500), onde: onde, como: Com_texto_(acao, 500), restrita: true };
      try { atvId = Com_criarAtividade_(dados); }
      catch (eC) { dados.clienteId = ''; dados.unidadeId = ''; atvId = Com_criarAtividade_(dados); }
    }
    SGO_DATA.insert(COM_GA_ABA, { CHAVE: k, REGRA: it.regra, PRIORIDADE: it.prioridade, USUARIO_ID: uid, USUARIO_NOME: Com_s_(u && u.nome), REF_TIPO: it.ref.tipo, REF_ID: Com_s_(it.ref.id), REF_ROTULO: rotulo,
      MODO: modo, ATIVIDADE_ID: atvId, TITULO: titulo, SITUACAO: modo === 'CRIADA' ? 'ABERTA' : 'COMPLEMENTO', ORIGEM_TEXTO: usouIA ? 'IA' : 'REGRAS', ESTRATEGIA: Com_texto_(estrategia, 1000),
      VERIFICACAO: Com_texto_(verif, 1000), PRAZO: prazo, DIA: hoje, ENCERRADA_EM: '', MOTIVO_ENCERRAMENTO: '' });
    Com_historico_(it.ref.tipo === 'proposta' ? 'PROPOSTA' : 'OPORTUNIDADE', Com_s_(it.ref.id), 'GESTORA_AUTOMATICA', COM_GA_EU,
      { texto: modo === 'CRIADA' ? 'Atividade "' + titulo + '" criada para ' + Com_s_(u && u.nome) + ' com prazo ' + Com_br_(prazo) + '.' : 'Estratégia deixada como comentário na atividade já aberta deste item (' + Com_s_(u && u.nome) + ').' });
    return modo;
  });
}
