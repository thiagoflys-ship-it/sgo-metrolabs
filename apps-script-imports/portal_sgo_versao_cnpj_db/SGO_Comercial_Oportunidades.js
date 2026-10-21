/****************************************************
 * COMERCIAL — OPORTUNIDADES (21/10/2026)
 *
 * Regras (da metodologia; padrão trazido do COMMAND):
 *  - Toda oportunidade nasce ligada ao cadastro único: cliente, unidade (quando o cliente tem unidades),
 *    contato do cliente (CAD_CONTATOS) e, quando fizer sentido, equipamentos da unidade.
 *  - Toda oportunidade aberta tem dono, funil, etapa, origem, valor estimado e PRÓXIMA AÇÃO com data no
 *    futuro. A próxima ação é uma atividade em Minhas atividades (módulo Comercial, 5W2H, restrita ao
 *    responsável e à gestão): o SGO+ cobra a atividade como cobra qualquer outra (sistema até resolver,
 *    e-mail no expediente, WhatsApp só no resumo diário) e, atrasada, ela sobe para a Caixa de decisões do
 *    gestor comercial pela escada que já existe. Nada de cobrança a cada 2 horas.
 *  - Registrar um contato (ligação, WhatsApp, e-mail, reunião, visita) conclui a atividade atual e exige a
 *    próxima ação. Se a atividade for concluída direto em Minhas atividades, a oportunidade fica "sem
 *    próxima ação" e entra no topo da lista do dia e no Início do vendedor.
 *  - Parada (padrão 10 dias sem contato registrado): antes de mudar de etapa, registre um contato real ou a perda.
 *  - Perda só com motivo da lista e o aprendizado (mínimo 15 letras); cancela as atividades abertas e as
 *    propostas que não foram respondidas (inclusive rascunhos, falha do COMMAND corrigida aqui).
 *  - Reabrir oportunidade encerrada é decisão da gestão comercial: o vendedor pede (com o motivo) e o
 *    pedido entra na Caixa de decisões; quem reabre é a gestão, na tela da oportunidade.
 *  - O vendedor vê só as próprias oportunidades; a gestão comercial vê e troca o responsável.
 *  - ORIGEM_REF é o gancho para oportunidades nascidas de outras telas (ex.: "VENCIMENTO:<id do documento>"
 *    para renovação de calibração ou qualificação, na segunda fase).
 ****************************************************/

function ComOpo_podeVer_(eu, o) { return !!eu && (eu.gestao || (eu.vendedor && Com_s_(o.RESPONSAVEL_ID) === eu.id)); }

function ComOpo_obter_(eu, id, acao) {
  var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(id));
  if (!o) throw new Error('Não foi possível ' + acao + ': a oportunidade não foi encontrada. Atualize a lista de oportunidades');
  if (!ComOpo_podeVer_(eu, o)) throw new Error('Não foi possível ' + acao + ': a oportunidade ' + Com_s_(o.CODIGO) + ' é de ' + (Com_s_(o.RESPONSAVEL_NOME) || 'outra pessoa') + '. O vendedor vê só as próprias; a gestão comercial vê todas');
  return o;
}

/** Situação calculada: dias sem contato, parada, esfriando, estagnada, sem próxima ação, atrasada. */
function ComOpo_derivados_(o, ctx) {
  ctx = ctx || {};
  var met = ctx.met || Com_metodologia_(), agora = ctx.agora || Com_agora_(), hoje = agora.slice(0, 10);
  var etapa = Com_etapa_(Com_s_(o.FUNIL), Com_s_(o.ETAPA), met) || {};
  var base = Com_dia_(o.ULTIMO_CONTATO_EM) || Com_dia_(o.CRIADO_EM) || hoje;
  var dias = Math.max(0, Com_diasEntre_(base, hoje) || 0);
  var naEtapa = Math.max(0, Com_diasEntre_(Com_dia_(o.ETAPA_DESDE) || base, hoje) || 0);
  var aberta = Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA';
  var atv = ctx.atividades ? ctx.atividades[Com_s_(o.ATIVIDADE_ID)] : Com_atividade_(o.ATIVIDADE_ID);
  var atvAberta = Com_atividadeAberta_(atv);
  var prev = atvAberta ? Com_iso_(atv.PREVISAO_ATUAL || atv.PRAZO) : '';
  var c = met.cadencia || {};
  var r = {
    probabilidade: Number(etapa.probabilidade) || 0, etapaNome: Com_s_(etapa.nome) || Com_s_(o.ETAPA), maxDias: Number(etapa.maxDias) || 0,
    diasSemContato: dias, diasNaEtapa: naEtapa,
    parada: aberta && dias >= (Number(c.paradaDias) || 10),
    esfriando: aberta && dias >= (Number(c.esfriandoDias) || 7) && dias < (Number(c.paradaDias) || 10),
    estagnada: aberta && !!etapa.maxDias && naEtapa > Number(etapa.maxDias),
    semProxima: aberta && !atvAberta,
    proximaEm: prev, atrasada: aberta && atvAberta && !!prev && prev < agora, hoje: aberta && atvAberta && prev.slice(0, 10) === hoje,
    mudarEstrategia: aberta && (Number(o.TENTATIVAS_SEM_RESPOSTA) || 0) >= (Number(c.tentativasMudarEstrategia) || 3)
  };
  var valor = Number(o.VALOR_ESTIMADO) || 0;
  r.ponderado = Com_r2_(valor * r.probabilidade / 100);
  return r;
}

function ComOpo_paraTela_(eu, o, ctx) {
  var d = ComOpo_derivados_(o, ctx);
  var met = (ctx && ctx.met) || Com_metodologia_();
  var f = Com_funil_(Com_s_(o.FUNIL), met);
  var t = {
    id: Com_s_(o.ID), codigo: Com_s_(o.CODIGO), titulo: Com_s_(o.TITULO), clienteId: Com_s_(o.CLIENTE_ID), cliente: Com_s_(o.CLIENTE_NOME), unidadeId: Com_s_(o.UNIDADE_ID), unidade: Com_s_(o.UNIDADE_NOME),
    contatoId: Com_s_(o.CONTATO_ID), contato: Com_s_(o.CONTATO_NOME), equipamentos: Com_s_(o.EQUIPAMENTOS_IDS) ? Com_s_(o.EQUIPAMENTOS_IDS).split(',') : [],
    funil: Com_s_(o.FUNIL), funilNome: f ? f.nome : Com_s_(o.FUNIL), etapa: Com_s_(o.ETAPA), etapaNome: d.etapaNome, probabilidade: d.probabilidade,
    origem: Com_s_(o.ORIGEM), chance: Com_up_(o.CHANCE) || 'MEDIA', previsao: Com_dia_(o.PREVISAO_FECHAMENTO), previsaoBr: Com_brDia_(o.PREVISAO_FECHAMENTO),
    responsavelId: Com_s_(o.RESPONSAVEL_ID), responsavel: Com_s_(o.RESPONSAVEL_NOME), situacao: Com_up_(o.SITUACAO || 'ABERTA'), situacaoNome: COM_SITUACOES_OPO[Com_up_(o.SITUACAO || 'ABERTA')] || '',
    qualificacao: Com_json_(o.QUALIFICACAO_JSON, {}), motivoPerda: Com_s_(o.MOTIVO_PERDA), aprendizado: Com_s_(o.APRENDIZADO_PERDA),
    ultimoContato: Com_br_(o.ULTIMO_CONTATO_EM), tentativasSemResposta: Number(o.TENTATIVAS_SEM_RESPOSTA) || 0,
    proximaAcao: Com_s_(o.PROXIMA_ACAO), proximaTipo: Com_up_(o.PROXIMA_ACAO_TIPO), proximaEm: Com_br_(d.proximaEm || o.PROXIMA_ACAO_EM), atividadeId: Com_s_(o.ATIVIDADE_ID),
    ganhaEm: Com_brDia_(o.GANHA_EM), perdidaEm: Com_brDia_(o.PERDIDA_EM), reaberturaPedida: !!Com_s_(o.REABERTURA_PEDIDA_EM), reaberturaMotivo: Com_s_(o.REABERTURA_MOTIVO),
    observacoes: Com_s_(o.OBSERVACOES), origemRef: Com_s_(o.ORIGEM_REF), criadaEm: Com_brDia_(o.CRIADO_EM),
    diasSemContato: d.diasSemContato, diasNaEtapa: d.diasNaEtapa, parada: d.parada, esfriando: d.esfriando, estagnada: d.estagnada, semProxima: d.semProxima, atrasada: d.atrasada,
    venceHoje: d.hoje, mudarEstrategia: d.mudarEstrategia
  };
  if (eu.veValores) { t.valor = Number(o.VALOR_ESTIMADO) || 0; t.valorTxt = Com_moeda_(t.valor); t.ponderado = d.ponderado; }
  return t;
}

/** Atividades indexadas por id (uma leitura para a lista inteira). */
function ComOpo_mapaAtividades_() {
  var m = {};
  try { if (typeof Atividades_abas_ === 'function') Com_ler_(Atividades_abas_().ATIVIDADES).forEach(function (a) { m[Com_s_(a.ID)] = a; }); } catch (e) {}
  return m;
}

/** Lista para a tela. filtro: { situacao: 'ABERTA'|'GANHA'|'PERDIDA'|'TODAS', responsavelId, clienteId, funil, busca } */
function ComOpo_listar_(eu, filtro) {
  Com_exigir_(eu, 'VENDEDOR', 'ver as oportunidades');
  var f = filtro || {}, ctx = { met: Com_metodologia_(), agora: Com_agora_(), atividades: ComOpo_mapaAtividades_() };
  var sit = Com_up_(f.situacao) || 'ABERTA', busca = Com_s_(f.busca).toLowerCase();
  var l = Com_ler_(COM_ABAS.OPORTUNIDADES).filter(function (o) {
    if (!ComOpo_podeVer_(eu, o)) return false;
    if (sit !== 'TODAS' && Com_up_(o.SITUACAO || 'ABERTA') !== sit) return false;
    if (f.responsavelId && eu.gestao && Com_s_(o.RESPONSAVEL_ID) !== Com_s_(f.responsavelId)) return false;
    if (f.clienteId && Com_s_(o.CLIENTE_ID) !== Com_s_(f.clienteId)) return false;
    if (f.funil && Com_s_(o.FUNIL) !== Com_s_(f.funil)) return false;
    if (busca && (Com_s_(o.TITULO) + ' ' + Com_s_(o.CLIENTE_NOME) + ' ' + Com_s_(o.CODIGO) + ' ' + Com_s_(o.UNIDADE_NOME)).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  }).map(function (o) { return ComOpo_paraTela_(eu, o, ctx); });
  l.sort(function (a, b) { return (b.semProxima - a.semProxima) || (b.atrasada - a.atrasada) || (b.parada - a.parada) || String(a.proximaEm).localeCompare(String(b.proximaEm)); });
  return l;
}

// ------------------------------------------------------------
// VALIDAÇÕES COMUNS
// ------------------------------------------------------------
/** Cliente, unidade, contato e equipamentos do cadastro. Devolve os nomes. Lança no padrão do operador. */
function ComOpo_vinculos_(d, acao) {
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(d.clienteId));
  if (!cli || Com_up_(cli.STATUS || 'ATIVO') === 'INATIVO') throw new Error('Não foi possível ' + acao + ': escolha o cliente na lista (ele vem do cadastro único). Se o cliente não existe, cadastre em Cadastros > Clientes e volte aqui');
  var unidades = Com_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Com_s_(u.CLIENTE_ID) === Com_s_(cli.ID) && Com_up_(u.STATUS || 'ATIVO') === 'ATIVO'; });
  var uid = Com_s_(d.unidadeId), un = null;
  if (uid) {
    un = unidades.filter(function (u) { return Com_s_(u.ID) === uid; })[0];
    if (!un) throw new Error('Não foi possível ' + acao + ': a unidade escolhida não pertence a ' + (Com_s_(cli.NOME_FANTASIA) || Com_s_(cli.RAZAO_SOCIAL)) + '. Escolha a unidade de novo');
  } else if (unidades.length) {
    throw new Error('Não foi possível ' + acao + ': o cliente tem ' + Com_plural_(unidades.length, 'unidade', 'unidades') + ' no cadastro. Escolha em qual unidade é a oportunidade (no SGO+ documentos, equipamentos e pastas são organizados por unidade)');
  }
  var ct = null;
  if (Com_s_(d.contatoId)) {
    ct = SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(d.contatoId));
    if (!ct || Com_s_(ct.CLIENTE_ID) !== Com_s_(cli.ID) || Com_up_(ct.STATUS || 'ATIVO') !== 'ATIVO') throw new Error('Não foi possível ' + acao + ': o contato escolhido não é deste cliente (ou foi inativado). Escolha outro contato ou cadastre um novo no botão "Novo contato"');
  } else {
    throw new Error('Não foi possível ' + acao + ': escolha o contato principal do cliente (quem você vai procurar). Se ele não está na lista, toque em "Novo contato", cadastre e escolha');
  }
  var eqs = (Array.isArray(d.equipamentos) ? d.equipamentos : Com_s_(d.equipamentos).split(',')).map(Com_s_).filter(Boolean);
  if (eqs.length) {
    var mapa = {};
    Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { mapa[Com_s_(e.ID)] = e; });
    eqs.forEach(function (id) {
      var e = mapa[id];
      if (!e || Com_s_(e.CLIENTE_ID) !== Com_s_(cli.ID) || (uid && Com_s_(e.UNIDADE_ID) && Com_s_(e.UNIDADE_ID) !== uid)) throw new Error('Não foi possível ' + acao + ': um dos equipamentos escolhidos não é desta unidade (' + (e ? Com_s_(e.TAG) : id) + '). Tire o equipamento da lista ou escolha a unidade certa');
    });
  }
  return { cliente: cli, clienteNome: Com_s_(cli.NOME_FANTASIA) || Com_s_(cli.RAZAO_SOCIAL), unidade: un, unidadeNome: un ? Com_s_(un.NOME_UNIDADE) : '', contato: ct, contatoNome: ct ? Com_s_(ct.NOME) : '', equipamentos: eqs };
}

/** Próxima ação da tela: { acao, data, hora, tipo }. Lança se faltar ou estiver no passado. */
function ComOpo_proxima_(p, acao) {
  p = p || {};
  var texto = Com_texto_(p.acao, 300);
  if (texto.length < 5) throw new Error('Não foi possível ' + acao + ': toda oportunidade aberta precisa da PRÓXIMA AÇÃO (o que você vai fazer com o cliente, por exemplo "Ligar para confirmar a visita técnica"). Preencha e salve de novo');
  var prazo = Com_prazo_(p.data, p.hora);
  if (!prazo) throw new Error('Não foi possível ' + acao + ': informe a DATA da próxima ação e salve de novo');
  if (prazo < Com_agora_()) throw new Error('Não foi possível ' + acao + ': a próxima ação não pode ficar no passado (' + Com_br_(prazo) + '). O que já foi feito se registra em "Registrar contato"; aqui vai o próximo passo, com data de hoje em diante');
  var tipo = Com_up_(p.tipo);
  if (!COM_TIPOS_CONTATO[tipo]) tipo = 'LIGACAO';
  return { texto: texto, prazo: prazo, tipo: tipo };
}

/** Cria a atividade da próxima ação (Minhas atividades, restrita). Devolve o id. */
function ComOpo_criarProxima_(eu, sessionId, o, prox) {
  var resp = Com_s_(o.RESPONSAVEL_ID);
  return Com_criarAtividade_({
    sessionId: resp === eu.id ? sessionId : '', responsavelId: resp,
    titulo: 'Retorno ao cliente: ' + Com_s_(o.CLIENTE_NOME) + ' (' + (COM_TIPOS_CONTATO[prox.tipo] || 'Contato').toLowerCase() + ')',
    descricao: prox.texto + '\nOportunidade ' + Com_s_(o.CODIGO) + ': ' + Com_s_(o.TITULO) + (Com_s_(o.CONTATO_NOME) ? '\nContato: ' + Com_s_(o.CONTATO_NOME) : '') +
      '\nAo falar com o cliente, registre o contato na oportunidade (Comercial > Oportunidades): a atividade é concluída e você marca o próximo passo.',
    prazo: prox.prazo, prioridade: 'Normal', clienteId: Com_s_(o.CLIENTE_ID), unidadeId: Com_s_(o.UNIDADE_ID),
    porQue: 'Regra do Comercial: nenhuma oportunidade aberta fica sem próxima ação com data.', onde: 'Comercial > Oportunidades > ' + Com_s_(o.CODIGO),
    como: prox.texto, restrita: true
  });
}

// ------------------------------------------------------------
// GRAVAÇÕES
// ------------------------------------------------------------
/**
 * Nova oportunidade ou edição. d: { id?, titulo, clienteId, unidadeId, contatoId, equipamentos[], funil, etapa, origem, valor, chance,
 *   previsao, observacoes, qualificacao{}, responsavelId (gestão), proxima: { acao, data, hora, tipo } (obrigatória ao criar) }
 */
function ComOpo_salvar_(eu, sessionId, d) {
  Com_exigir_(eu, 'VENDEDOR', 'salvar a oportunidade');
  d = d || {};
  var acao = d.id ? 'salvar a oportunidade' : 'criar a oportunidade';
  var met = Com_metodologia_();
  var titulo = Com_texto_(d.titulo, 200);
  if (titulo.length < 4) throw new Error('Não foi possível ' + acao + ': escreva o título (o que o cliente precisa, por exemplo "Qualificação térmica de 2 autoclaves") e salve de novo');
  var funil = Com_funil_(Com_s_(d.funil), met);
  if (!funil) throw new Error('Não foi possível ' + acao + ': escolha o funil (Engenharia para serviços e contratos, Produtos para peças e equipamentos)');
  var etapa = Com_etapa_(funil, Com_s_(d.etapa) || funil.etapas[0].codigo, met);
  if (!etapa) throw new Error('Não foi possível ' + acao + ': a etapa escolhida não existe no funil ' + funil.nome + '. Escolha a etapa de novo');
  var origem = Com_s_(d.origem);
  if (met.origens.indexOf(origem) < 0) throw new Error('Não foi possível ' + acao + ': escolha a origem na lista (de onde veio a oportunidade). Ela alimenta o relatório de onde vêm as vendas');
  var valor = Com_num_(d.valor);
  if (!(valor > 0)) throw new Error('Não foi possível ' + acao + ': informe o valor estimado (maior que zero, por exemplo 4.500,00). Se ainda não sabe, use o ticket médio do serviço e ajuste depois');
  var chance = ['BAIXA', 'MEDIA', 'ALTA'].indexOf(Com_up_(d.chance)) >= 0 ? Com_up_(d.chance) : 'MEDIA';
  var previsao = Com_dia_(d.previsao);
  var vinc = ComOpo_vinculos_(d, acao);
  var qual = {};
  (met.qualificacao.itens || []).forEach(function (q) { var v = (d.qualificacao || {})[q.codigo]; if (v) qual[q.codigo] = Com_texto_(v === true ? 'SIM' : v, 300); });
  var respId = eu.id, respNome = eu.nome;
  if (Com_s_(d.responsavelId) && Com_s_(d.responsavelId) !== eu.id) {
    if (!eu.gestao) throw new Error('Não foi possível ' + acao + ': só a gestão comercial define outro responsável. Crie a oportunidade para você e peça à gestão a troca, se for o caso');
    var equipe = Com_equipeComercial_().filter(function (p) { return p.id === Com_s_(d.responsavelId); })[0];
    if (!equipe) throw new Error('Não foi possível ' + acao + ': o responsável escolhido não está ativo na equipe comercial. Escolha outra pessoa');
    respId = equipe.id; respNome = equipe.nome;
  }
  var prox = d.id ? null : ComOpo_proxima_(d.proxima, acao);
  return Com_comTrava_(function () {
    var agora = Com_agora_();
    var campos = { TITULO: titulo, CLIENTE_ID: Com_s_(vinc.cliente.ID), CLIENTE_NOME: vinc.clienteNome, UNIDADE_ID: vinc.unidade ? Com_s_(vinc.unidade.ID) : '', UNIDADE_NOME: vinc.unidadeNome,
      CONTATO_ID: vinc.contato ? Com_s_(vinc.contato.ID) : '', CONTATO_NOME: vinc.contatoNome, EQUIPAMENTOS_IDS: vinc.equipamentos.join(','), ORIGEM: origem, VALOR_ESTIMADO: Com_r2_(valor),
      CHANCE: chance, PREVISAO_FECHAMENTO: previsao, OBSERVACOES: Com_texto_(d.observacoes, 3000), QUALIFICACAO_JSON: JSON.stringify(qual), ATUALIZADO_EM: agora };
    if (!d.id) {
      Com_garantirAbas_();
      campos.CODIGO = Com_proximoNumero_('OPO', COM_ABAS.OPORTUNIDADES, 'CODIGO');
      campos.FUNIL = funil.codigo; campos.ETAPA = etapa.codigo; campos.ETAPA_DESDE = agora; campos.SITUACAO = 'ABERTA';
      campos.RESPONSAVEL_ID = respId; campos.RESPONSAVEL_NOME = respNome; campos.CRIADO_POR_ID = eu.id; campos.CRIADO_POR_NOME = eu.nome;
      campos.TENTATIVAS_SEM_RESPOSTA = 0; campos.ORIGEM_REF = Com_texto_(d.origemRef, 200);
      campos.PROXIMA_ACAO = prox.texto; campos.PROXIMA_ACAO_TIPO = prox.tipo; campos.PROXIMA_ACAO_EM = prox.prazo;
      var o = SGO_DATA.insert(COM_ABAS.OPORTUNIDADES, campos);
      var atvId = ComOpo_criarProxima_(eu, sessionId, o, prox);
      SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { ATIVIDADE_ID: atvId });
      o.ATIVIDADE_ID = atvId;
      Com_historico_('OPORTUNIDADE', o.ID, 'CRIACAO', eu, { para: etapa.nome, texto: 'Oportunidade criada no funil ' + funil.nome + ', etapa ' + etapa.nome + '. Próxima ação: ' + prox.texto + ' em ' + Com_br_(prox.prazo) + '.' });
      return { oportunidade: ComOpo_paraTela_(eu, o), message: 'Oportunidade ' + o.CODIGO + ' criada. A próxima ação já está em Minhas atividades para ' + Com_br_(prox.prazo) + '.' };
    }
    var atual = ComOpo_obter_(eu, d.id, acao);
    if (Com_up_(atual.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível salvar: a oportunidade ' + atual.CODIGO + ' está ' + COM_SITUACOES_OPO[Com_up_(atual.SITUACAO)].toLowerCase() + '. Para mudar, ela precisa ser reaberta pela gestão comercial (botão "Pedir reabertura")');
    if (Com_s_(atual.FUNIL) !== funil.codigo) { campos.FUNIL = funil.codigo; campos.ETAPA = funil.etapas[0].codigo; campos.ETAPA_DESDE = agora; }
    var trocaResp = eu.gestao && respId !== Com_s_(atual.RESPONSAVEL_ID) && Com_s_(d.responsavelId);
    if (trocaResp) { campos.RESPONSAVEL_ID = respId; campos.RESPONSAVEL_NOME = respNome; }
    var mudou = Object.keys(campos).filter(function (k) { return k !== 'ATUALIZADO_EM' && Com_s_(atual[k]) !== Com_s_(campos[k]); });
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, atual.ID, campos);
    var novo = Object.assign({}, atual, campos);
    if (trocaResp) {
      var atv = Com_atividade_(atual.ATIVIDADE_ID);
      if (Com_atividadeAberta_(atv)) {
        Com_mudarAtividade_(atual.ATIVIDADE_ID, 'Cancelada', 'Oportunidade passou para ' + respNome + ' (troca de responsável pela gestão comercial).');
        var prazoAntigo = Com_iso_(atv.PREVISAO_ATUAL || atv.PRAZO);
        var p2 = { texto: Com_s_(atual.PROXIMA_ACAO) || 'Assumir a oportunidade e falar com o cliente', tipo: Com_up_(atual.PROXIMA_ACAO_TIPO) || 'LIGACAO', prazo: prazoAntigo && prazoAntigo > agora ? prazoAntigo : Com_somarDiasUteis_(Com_hoje_(), 1) + 'T10:00' };
        var nova = ComOpo_criarProxima_(eu, '', novo, p2);
        SGO_DATA.update(COM_ABAS.OPORTUNIDADES, atual.ID, { ATIVIDADE_ID: nova, PROXIMA_ACAO_EM: p2.prazo });
        novo.ATIVIDADE_ID = nova;
      }
      Com_avisar_(respId, 'OPORTUNIDADE_RECEBIDA', 'Oportunidade ' + atual.CODIGO + ' passou para você', 'A gestão comercial passou para você a oportunidade ' + atual.CODIGO + ' (' + vinc.clienteNome + '). A próxima ação está em Minhas atividades.', { tipo: 'oportunidade', id: atual.ID }, { email: true });
    }
    Com_historico_('OPORTUNIDADE', atual.ID, 'EDICAO', eu, { texto: 'Campos alterados: ' + (mudou.join(', ') || 'nenhum') + '.' });
    return { oportunidade: ComOpo_paraTela_(eu, novo), message: 'Oportunidade ' + atual.CODIGO + ' salva.' };
  });
}

/** Mudar de etapa. d: { id, etapa, proxima? }. Parada: registre contato ou perda antes. */
function ComOpo_moverEtapa_(eu, sessionId, d) {
  Com_exigir_(eu, 'VENDEDOR', 'mudar a etapa');
  d = d || {};
  var met = Com_metodologia_();
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'mudar a etapa');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível mudar a etapa: a oportunidade ' + o.CODIGO + ' está encerrada. Peça a reabertura à gestão comercial');
    var etapa = Com_etapa_(Com_s_(o.FUNIL), Com_s_(d.etapa), met);
    if (!etapa) throw new Error('Não foi possível mudar a etapa: escolha uma etapa do funil desta oportunidade');
    if (etapa.codigo === Com_s_(o.ETAPA)) return { oportunidade: ComOpo_paraTela_(eu, o), message: 'A oportunidade já estava nesta etapa.' };
    var der = ComOpo_derivados_(o, { met: met });
    if (der.parada) throw new Error('Não foi possível mudar a etapa: a oportunidade ' + o.CODIGO + ' está parada há ' + der.diasSemContato + ' dias sem contato. Regra do Comercial: reaqueça antes, registrando um contato real com o cliente e a próxima ação ("Registrar contato"), ou registre a perda');
    var campos = { ETAPA: etapa.codigo, ETAPA_DESDE: Com_agora_(), ATUALIZADO_EM: Com_agora_() };
    var antes = Com_etapa_(Com_s_(o.FUNIL), Com_s_(o.ETAPA), met) || { nome: Com_s_(o.ETAPA) };
    if (der.semProxima || (d.proxima && Com_s_(d.proxima.acao))) {
      var prox = ComOpo_proxima_(d.proxima, 'mudar a etapa');
      if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Cancelada', 'Substituída pela nova próxima ação ao mudar de etapa.');
      campos.PROXIMA_ACAO = prox.texto; campos.PROXIMA_ACAO_TIPO = prox.tipo; campos.PROXIMA_ACAO_EM = prox.prazo;
      campos.ATIVIDADE_ID = ComOpo_criarProxima_(eu, sessionId, Object.assign({}, o, campos), prox);
    }
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, campos);
    Com_historico_('OPORTUNIDADE', o.ID, 'ETAPA', eu, { de: antes.nome, para: etapa.nome, texto: 'Mudou para a etapa ' + etapa.nome + ' (' + etapa.probabilidade + '%).' });
    return { oportunidade: ComOpo_paraTela_(eu, Object.assign({}, o, campos)), message: 'Etapa: ' + etapa.nome + '.' };
  });
}

/**
 * Registrar contato feito com o cliente. d: { id, tipo, respondeu (true/false), resumo, contatoId, estrategia, proxima: {acao,data,hora,tipo} }.
 * Conclui a atividade atual e cria a próxima (obrigatória enquanto a oportunidade estiver aberta).
 */
function ComOpo_registrarContato_(eu, sessionId, d) {
  Com_exigir_(eu, 'VENDEDOR', 'registrar o contato');
  d = d || {};
  var tipo = Com_up_(d.tipo);
  if (!COM_TIPOS_CONTATO[tipo]) throw new Error('Não foi possível registrar o contato: escolha como foi (ligação, WhatsApp, e-mail, reunião ou visita)');
  var resumo = Com_texto_(d.resumo, 3000);
  if (resumo.length < 10) throw new Error('Não foi possível registrar o contato: escreva em poucas palavras o que aconteceu (pelo menos 10 letras), por exemplo "Falei com a enfermeira da CME; ela pediu a proposta até sexta"');
  var respondeu = d.respondeu === true || Com_up_(d.respondeu) === 'SIM';
  var met = Com_metodologia_();
  var estr = Com_up_(d.estrategia);
  if (estr && !met.estrategias.some(function (e) { return e.codigo === estr; })) estr = '';
  if (estr === 'PERDA') throw new Error('Não foi possível registrar: para encerrar como perda use o botão "Registrar perda", com o motivo e o aprendizado');
  var prox = ComOpo_proxima_(d.proxima, 'registrar o contato');
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'registrar o contato');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível registrar o contato: a oportunidade ' + o.CODIGO + ' está encerrada. Peça a reabertura à gestão comercial');
    var ct = Com_s_(d.contatoId) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(d.contatoId)) : null;
    if (ct && Com_s_(ct.CLIENTE_ID) !== Com_s_(o.CLIENTE_ID)) ct = null;
    var agora = Com_agora_();
    SGO_DATA.insert(COM_ABAS.CONTATOS_REG, { OPORTUNIDADE_ID: o.ID, CLIENTE_ID: o.CLIENTE_ID, TIPO: tipo, RESPONDEU: respondeu ? 'SIM' : 'NAO', RESUMO: resumo,
      CONTATO_ID: ct ? ct.ID : Com_s_(o.CONTATO_ID), CONTATO_NOME: ct ? Com_s_(ct.NOME) : Com_s_(o.CONTATO_NOME), ESTRATEGIA: estr, USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: agora });
    if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', COM_TIPOS_CONTATO[tipo] + (respondeu ? ' (o cliente respondeu): ' : ' (sem resposta): ') + resumo);
    var tent = respondeu || estr ? 0 : (Number(o.TENTATIVAS_SEM_RESPOSTA) || 0) + 1;
    var campos = { ULTIMO_CONTATO_EM: agora, TENTATIVAS_SEM_RESPOSTA: tent, PROXIMA_ACAO: prox.texto, PROXIMA_ACAO_TIPO: prox.tipo, PROXIMA_ACAO_EM: prox.prazo, ATUALIZADO_EM: agora };
    if (ct && d.trocarPrincipal) { campos.CONTATO_ID = ct.ID; campos.CONTATO_NOME = Com_s_(ct.NOME); }
    var novo = Object.assign({}, o, campos);
    campos.ATIVIDADE_ID = ComOpo_criarProxima_(eu, sessionId, novo, prox);
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, campos);
    var est = estr ? met.estrategias.filter(function (e) { return e.codigo === estr; })[0] : null;
    Com_historico_('OPORTUNIDADE', o.ID, 'CONTATO', eu, { texto: COM_TIPOS_CONTATO[tipo] + (respondeu ? ', respondeu' : ', sem resposta') + (est ? '. Estratégia: ' + est.titulo : '') + '. Próxima ação: ' + prox.texto + ' em ' + Com_br_(prox.prazo) + '.' });
    if (estr === 'GESTAO') {
      Com_idsGestaoComercial_([eu.id]).forEach(function (gid) {
        Com_avisar_(gid, 'APOIO_GESTAO', 'Pedido de apoio na oportunidade ' + o.CODIGO, eu.nome + ' pediu apoio da gestão comercial com o cliente ' + Com_s_(o.CLIENTE_NOME) + ' (' + (Number(o.TENTATIVAS_SEM_RESPOSTA) || 0) + ' tentativas sem resposta). Veja em Comercial > Oportunidades.', { tipo: 'oportunidade', id: o.ID }, { email: true });
      });
    }
    return { oportunidade: ComOpo_paraTela_(eu, Object.assign({}, o, campos)), message: 'Contato registrado. Próxima ação marcada para ' + Com_br_(prox.prazo) + ' em Minhas atividades.' };
  });
}

/** Ganha. d: { id, texto }. Conclui a atividade aberta; o pedido aprovado segue para "Passar aos setores". */
function ComOpo_ganhar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'marcar a oportunidade como ganha');
  d = d || {};
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'marcar como ganha');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível marcar como ganha: a oportunidade ' + o.CODIGO + ' já está ' + COM_SITUACOES_OPO[Com_up_(o.SITUACAO)].toLowerCase());
    var agora = Com_agora_();
    if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Concluída', 'Oportunidade ganha. ' + Com_texto_(d.texto, 500));
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { SITUACAO: 'GANHA', GANHA_EM: agora, PROXIMA_ACAO: 'Passar o pedido aprovado aos setores', ATUALIZADO_EM: agora });
    Com_historico_('OPORTUNIDADE', o.ID, 'GANHA', eu, { de: 'Aberta', para: 'Ganha', texto: Com_texto_(d.texto, 1000) || 'Venda ganha.' });
    Com_idsGestaoComercial_([eu.id]).forEach(function (gid) { Com_avisar_(gid, 'GANHA', 'Venda ganha: ' + o.CODIGO, eu.nome + ' ganhou a oportunidade ' + o.CODIGO + ' (' + Com_s_(o.CLIENTE_NOME) + ').', { tipo: 'oportunidade', id: o.ID }); });
    var aprovada = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && Com_up_(p.SITUACAO) === 'APROVADA'; })[0];
    return { oportunidade: ComOpo_paraTela_(eu, Object.assign({}, o, { SITUACAO: 'GANHA', GANHA_EM: agora })), propostaAprovadaId: aprovada ? Com_s_(aprovada.ID) : '',
      message: 'Venda ganha. ' + (aprovada ? 'Agora passe o pedido aprovado aos setores (Propostas > ' + aprovada.NUMERO + ' > Passar aos setores).' : 'Registre a resposta do cliente na proposta e passe o pedido aos setores.') };
  });
}

/** Perdida. d: { id, motivo (da lista), aprendizado (>= 15 letras) }. */
function ComOpo_perder_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'registrar a perda');
  d = d || {};
  var met = Com_metodologia_();
  var motivo = Com_s_(d.motivo);
  if (met.motivosPerda.indexOf(motivo) < 0) throw new Error('Não foi possível registrar a perda: escolha o motivo na lista. ' + met.regraPerda);
  var apr = Com_texto_(d.aprendizado, 2000);
  if (apr.length < 15) throw new Error('Não foi possível registrar a perda: escreva o que aconteceu e o que aprender com isso (pelo menos 15 letras). Sem isso o relatório de perdas não ensina nada');
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'registrar a perda');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível registrar a perda: a oportunidade ' + o.CODIGO + ' já está ' + COM_SITUACOES_OPO[Com_up_(o.SITUACAO)].toLowerCase());
    var agora = Com_agora_();
    if (Com_atividadeAberta_(Com_atividade_(o.ATIVIDADE_ID))) Com_mudarAtividade_(o.ATIVIDADE_ID, 'Cancelada', 'Oportunidade perdida: ' + motivo + '.');
    var canceladas = 0;
    Com_ler_(COM_ABAS.PROPOSTAS).forEach(function (p) {
      if (Com_s_(p.OPORTUNIDADE_ID) !== Com_s_(o.ID)) return;
      var s = Com_up_(p.SITUACAO);
      if (['RASCUNHO', 'AGUARDANDO_APROVACAO', 'PRONTA', 'ENVIADA', 'VENCIDA'].indexOf(s) < 0) return;
      SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { SITUACAO: 'CANCELADA', CANCELADA_MOTIVO: 'Oportunidade perdida: ' + motivo, ATUALIZADO_EM: agora });
      if (Com_atividadeAberta_(Com_atividade_(p.RETORNO_ATIVIDADE_ID))) Com_mudarAtividade_(p.RETORNO_ATIVIDADE_ID, 'Cancelada', 'Oportunidade perdida.');
      Com_historico_('PROPOSTA', p.ID, 'CANCELADA', eu, { de: COM_SITUACOES_PROP[s], para: 'Cancelada', texto: 'Oportunidade perdida: ' + motivo });
      canceladas++;
    });
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { SITUACAO: 'PERDIDA', PERDIDA_EM: agora, MOTIVO_PERDA: motivo, APRENDIZADO_PERDA: apr, ATUALIZADO_EM: agora });
    Com_historico_('OPORTUNIDADE', o.ID, 'PERDIDA', eu, { de: 'Aberta', para: 'Perdida', texto: motivo + '. ' + apr });
    return { oportunidade: ComOpo_paraTela_(eu, Object.assign({}, o, { SITUACAO: 'PERDIDA', PERDIDA_EM: agora, MOTIVO_PERDA: motivo, APRENDIZADO_PERDA: apr })),
      message: 'Perda registrada' + (canceladas ? ' e ' + Com_plural_(canceladas, 'proposta cancelada', 'propostas canceladas') : '') + '.' };
  });
}

/** Vendedor pede a reabertura (vai para a Caixa de decisões). d: { id, motivo }. */
function ComOpo_pedirReabertura_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir a reabertura');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Não foi possível pedir a reabertura: escreva o motivo (pelo menos 10 letras), por exemplo "O cliente retomou o contato e pediu nova proposta"');
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'pedir a reabertura');
    if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') throw new Error('Não foi possível pedir a reabertura: a oportunidade ' + o.CODIGO + ' já está aberta');
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { REABERTURA_PEDIDA_EM: Com_agora_(), REABERTURA_PEDIDA_POR_ID: eu.id, REABERTURA_MOTIVO: motivo, ATUALIZADO_EM: Com_agora_() });
    Com_historico_('OPORTUNIDADE', o.ID, 'REABERTURA_PEDIDA', eu, { texto: motivo });
    return { message: 'Pedido de reabertura enviado à gestão comercial. Ele aparece na Caixa de decisões; você é avisado quando a gestão decidir.' };
  });
}

/** Gestão reabre. d: { id, motivo, proxima }. Ou recusa o pedido: d.recusar = true. */
function ComOpo_reabrir_(eu, sessionId, d) {
  Com_exigir_(eu, 'GESTAO', 'reabrir a oportunidade');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Não foi possível ' + (d.recusar ? 'recusar o pedido' : 'reabrir') + ': escreva o motivo da decisão (pelo menos 10 letras). Ele fica no histórico e o vendedor é avisado');
  var prox = d.recusar ? null : ComOpo_proxima_(d.proxima, 'reabrir a oportunidade');
  return Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'reabrir');
    if (Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA') throw new Error('Não foi possível reabrir: a oportunidade ' + o.CODIGO + ' já está aberta');
    if (Com_s_(o.REABERTURA_PEDIDA_POR_ID) === eu.id && !eu.diretoria) throw new Error('Não foi possível decidir: o pedido de reabertura é seu. Quem decide é outro gestor comercial ou a Diretoria');
    var agora = Com_agora_();
    if (d.recusar) {
      SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, { REABERTURA_PEDIDA_EM: '', REABERTURA_PEDIDA_POR_ID: '', ATUALIZADO_EM: agora });
      Com_historico_('OPORTUNIDADE', o.ID, 'REABERTURA_RECUSADA', eu, { texto: motivo });
      if (Com_s_(o.REABERTURA_PEDIDA_POR_ID)) Com_avisar_(o.REABERTURA_PEDIDA_POR_ID, 'REABERTURA_RECUSADA', 'Reabertura de ' + o.CODIGO + ' não aprovada', eu.nome + ': ' + motivo, { tipo: 'oportunidade', id: o.ID });
      return { message: 'Pedido de reabertura recusado. O vendedor foi avisado.' };
    }
    var antes = Com_up_(o.SITUACAO);
    var campos = { SITUACAO: 'ABERTA', GANHA_EM: '', PERDIDA_EM: '', MOTIVO_PERDA: '', APRENDIZADO_PERDA: '', REABERTURA_PEDIDA_EM: '', REABERTURA_PEDIDA_POR_ID: '',
      ETAPA_DESDE: agora, ULTIMO_CONTATO_EM: agora, TENTATIVAS_SEM_RESPOSTA: 0, PROXIMA_ACAO: prox.texto, PROXIMA_ACAO_TIPO: prox.tipo, PROXIMA_ACAO_EM: prox.prazo, ATUALIZADO_EM: agora };
    var novo = Object.assign({}, o, campos);
    campos.ATIVIDADE_ID = ComOpo_criarProxima_(eu, sessionId, novo, prox);
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, campos);
    Com_historico_('OPORTUNIDADE', o.ID, 'REABERTA', eu, { de: COM_SITUACOES_OPO[antes], para: 'Aberta', texto: motivo + (antes === 'PERDIDA' ? ' (motivo da perda anterior: ' + Com_s_(o.MOTIVO_PERDA) + ')' : '') });
    if (Com_s_(o.RESPONSAVEL_ID) !== eu.id) Com_avisar_(o.RESPONSAVEL_ID, 'REABERTA', 'Oportunidade ' + o.CODIGO + ' reaberta', eu.nome + ' reabriu a oportunidade: ' + motivo + ' A próxima ação está em Minhas atividades.', { tipo: 'oportunidade', id: o.ID }, { email: true });
    return { oportunidade: ComOpo_paraTela_(eu, Object.assign({}, o, campos)), message: 'Oportunidade reaberta. A próxima ação está em Minhas atividades do responsável.' };
  });
}

/** Ficha completa: oportunidade, contatos registrados, histórico, propostas, e-mails do cliente e sugestões da gestora. */
function ComOpo_detalhe_(eu, id) {
  Com_exigir_(eu, 'VENDEDOR', 'abrir a oportunidade');
  var o = ComOpo_obter_(eu, id, 'abrir a oportunidade');
  var met = Com_metodologia_();
  var t = ComOpo_paraTela_(eu, o, { met: met });
  var contatos = Com_ler_(COM_ABAS.CONTATOS_REG).filter(function (c) { return Com_s_(c.OPORTUNIDADE_ID) === t.id; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); })
    .map(function (c) { return { em: Com_br_(c.DATA), tipo: COM_TIPOS_CONTATO[Com_up_(c.TIPO)] || Com_s_(c.TIPO), respondeu: Com_up_(c.RESPONDEU) === 'SIM', resumo: Com_s_(c.RESUMO), contato: Com_s_(c.CONTATO_NOME), por: Com_s_(c.USUARIO_NOME), estrategia: Com_s_(c.ESTRATEGIA) }; });
  var hist = Com_ler_(COM_ABAS.HISTORICO).filter(function (h) { return Com_s_(h.ENTIDADE) === 'OPORTUNIDADE' && Com_s_(h.ENTIDADE_ID) === t.id; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); })
    .map(function (h) { return { em: Com_br_(h.DATA), tipo: Com_s_(h.TIPO), de: Com_s_(h.DE), para: Com_s_(h.PARA), texto: Com_s_(h.TEXTO), por: Com_s_(h.USUARIO_NOME) }; });
  var propostas = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === t.id; })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); })
    .map(function (p) { return { id: Com_s_(p.ID), numero: Com_s_(p.NUMERO), revisao: typeof SGO_DocA4_revisao_ === 'function' ? SGO_DocA4_revisao_(p.REVISAO) : Com_s_(p.REVISAO), situacao: Com_up_(p.SITUACAO), situacaoNome: COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || '', total: eu.veValores ? Com_moeda_(p.TOTAL) : '' }; });
  var atv = Com_atividade_(o.ATIVIDADE_ID);
  var etapa = Com_etapa_(t.funil, t.etapa, met) || {};
  var equipamentos = [];
  if (t.equipamentos.length) {
    Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { if (t.equipamentos.indexOf(Com_s_(e.ID)) >= 0) equipamentos.push({ id: Com_s_(e.ID), texto: [Com_s_(e.TIPO), Com_s_(e.TAG) ? 'TAG ' + Com_s_(e.TAG) : '', Com_s_(e.SETOR)].filter(Boolean).join(' · ') }); });
  }
  var emails = ComOpo_emailsDoCliente_(eu, o);
  var sugestoes = typeof ComG_sugestoesDaOportunidade_ === 'function' ? ComG_sugestoesDaOportunidade_(eu, o, t, contatos) : [];
  return {
    oportunidade: t, contatosRegistrados: contatos, historico: hist.slice(0, 80), propostas: propostas, equipamentos: equipamentos,
    atividade: atv ? { id: Com_s_(atv.ID), titulo: Com_s_(atv.TITULO), situacao: Com_s_(atv.SITUACAO), previsao: Com_br_(atv.PREVISAO_ATUAL || atv.PRAZO) } : null,
    etapaChecklist: etapa.checklist || [], etapaCriterio: Com_s_(etapa.criterio), contatosCliente: ComCt_listar_(t.clienteId, t.unidadeId),
    emails: emails, sugestoes: sugestoes, podeEditar: t.situacao === 'ABERTA' && (eu.gestao || t.responsavelId === eu.id)
  };
}

/**
 * E-mails do cliente ligados à oportunidade: os registrados no cliente (E-mail > Registrar no cliente) e, para o próprio
 * responsável, os recebidos na caixa dele nos últimos 30 dias cujo remetente é contato deste cliente. A gestão não abre a
 * caixa pessoal de ninguém: vê só os registrados.
 */
function ComOpo_emailsDoCliente_(eu, o) {
  var lista = [], cid = Com_s_(o.CLIENTE_ID);
  try {
    Com_ler_(typeof EMAIL_ABA_REGISTROS !== 'undefined' ? EMAIL_ABA_REGISTROS : 'EML_CLIENTE_REGISTROS').forEach(function (r) {
      if (Com_s_(r.CLIENTE_ID) !== cid) return;
      lista.push({ origem: 'registrado', ord: Com_iso_(r.DATA_EMAIL || r.CRIADO_EM), em: Com_br_(r.DATA_EMAIL || r.CRIADO_EM), de: Com_s_(r.REMETENTE), assunto: Com_s_(r.ASSUNTO), resumo: Com_s_(r.RESUMO).slice(0, 300), por: Com_s_(r.USUARIO_NOME) });
    });
  } catch (e) {}
  if (Com_s_(o.RESPONSAVEL_ID) === eu.id && typeof Email_disponivel_ === 'function' && Email_disponivel_() && typeof Email_euDoId_ === 'function') {
    try {
      var enderecos = ComCt_emailsDoCliente_(cid);
      var dominios = enderecos.map(function (e) { return e.split('@')[1]; }).filter(function (d) { return d && (typeof EMAIL_DOMINIOS_PUBLICOS === 'undefined' || EMAIL_DOMINIOS_PUBLICOS.indexOf(d) < 0); });
      var rec = Email_chamar_(Email_euDoId_(eu.id, { nome: eu.nome, perfil: eu.perfil }), 'recebidas', { dias: 30 }) || [];
      rec.forEach(function (m) {
        var de = Com_s_(m.remetente).toLowerCase();
        if (enderecos.indexOf(de) < 0 && dominios.indexOf(de.split('@')[1]) < 0) return;
        lista.push({ origem: 'caixa', ord: Com_iso_(m.recebidoEm), em: Com_br_(m.recebidoEm), de: Com_s_(m.remetenteNome) || de, assunto: Com_s_(m.assunto), resumo: '', lida: !!m.lida, conta: Com_s_(m.conta), uid: m.uid });
      });
    } catch (e) { lista.push({ origem: 'aviso', resumo: 'Não foi possível ler a sua caixa de e-mail agora. Abra E-mail para conferir as mensagens do cliente.' }); }
  }
  return lista.sort(function (a, b) { return String(b.ord || '').localeCompare(String(a.ord || '')); }).slice(0, 30);
}
