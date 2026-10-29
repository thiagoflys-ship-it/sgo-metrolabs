/****************************************************
 * COMERCIAL — A GESTORA COMERCIAL (IA COMO COPILOTO DA GESTÃO) (21/10/2026)
 *
 * Pedido do dono: "que a IA se tornasse o gestor comercial: as estratégias, as regras e a metodologia".
 * A gestora conhece a METODOLOGIA gravada pela gestão (SGO_Comercial_Config.js › Com_metodologia_: playbook,
 * etapas e critérios de saída, qualificação, cadência de retorno, estratégias quando o cliente não responde,
 * objeções, política de desconto, motivos de perda) e trabalha SEMPRE em duas camadas:
 *
 *   1. REGRAS (funcionam sem IA): a lista "o que fazer hoje" de cada vendedor e o panorama da gestão, o próximo
 *      passo de cada oportunidade com o texto de mensagem do modelo, a revisão da proposta antes do envio, a
 *      análise do mês e os números para as perguntas da gestão. É o que aparece quando não há chave da IA, quando
 *      ela falha ou quando o texto dela é recusado.
 *   2. IA (Gemini, raciocínio ligado): reescreve o motivo e o próximo passo de cada item com a metodologia,
 *      sugere perguntas e o texto do e-mail ou da mensagem, comenta a coerência da proposta, escreve a análise do
 *      mês e responde perguntas da gestão. Tudo passa pelo verificador (SGO_QIAV_verificar_, o mesmo dos
 *      documentos de qualificação): número que não está nos dados do sistema, norma citada, promessa
 *      ("garantimos", "desconto de..."), afirmação de que enviou algo ou referência à própria IA = texto recusado
 *      e trocado pelo das regras.
 *
 * O que ela NÃO faz: não envia nada ao cliente (o vendedor copia, revisa e envia pelo e-mail ou pelo "Enviar
 * documento"); não aprova desconto (a decisão é do gestor humano na Caixa de decisões); não muda etapa nem
 * situação; não inventa preço, prazo, cliente ou número. Cada sugestão fica em COM_IA_SUGESTOES com a decisão
 * do vendedor ("Feito", "Usei", "Não se aplica"), para a gestão ver quais regras funcionam.
 *
 * 21/10/2026 — ESPECIALISTA NO QUADRO E NO GANTT: "Pedir à especialista" (ComG_especialista_: próximo passo, estratégia
 * para a etapa com o que falta para avançar, objeções prováveis com a resposta, perguntas, mensagem e e-mail) e a
 * "Leitura do funil" (ComG_leituraFunil_: gargalos, oportunidades em risco e tempo por etapa contra a meta). Mesmas duas
 * camadas e o mesmo verificador; nada é enviado e nenhuma etapa muda; a decisão do vendedor fica em COM_IA_SUGESTOES.
 *
 * Quando: a rotina do Comercial (chamada pela rotina da gestão, a cada 15 min) monta a lista de cada vendedor e
 * o panorama da gestão uma vez por dia útil, no início do expediente (COM_DIA). A tela sempre recalcula as
 * regras com os dados de agora e usa os textos da gestora do dia para os itens que ainda valem.
 ****************************************************/

var COM_G_PRIORIDADE = { 1: 'Antes de tudo', 2: 'Hoje', 3: 'Hoje, se der tempo', 4: 'Nesta semana', 5: 'Rotina' };
var COM_G_PROIBIDOS = [
  /\b(eu\s+)?(enviei|enviarei|vou enviar|já enviei|mandei)\b/i,
  /\b(garanto|garantimos|prometo|prometemos)\b/i,
  /\b(ofere[cç]a|conceda|d[eê]|dar)\s+(um\s+|mais\s+)?desconto/i,
  /\bdesconto\s+(extra|adicional|especial)\b/i,
  /\b(aprovei|aprovado pela gestora|eu aprovo)\b/i
];

// ------------------------------------------------------------
// FATOS (o que a gestora pode usar)
// ------------------------------------------------------------
function ComG_primeiroNome_(n) { var p = Com_s_(n).split(/\s+/)[0] || ''; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''; }

function ComG_preencher_(modelo, v) {
  return Com_s_(modelo).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined && v[k] !== '' ? v[k] : (k === 'nome' ? '' : m); }).replace(/Olá, \./, 'Olá.').replace(/\s+([,.])/g, '$1');
}

/** Estratégia sugerida pelas regras (CANAL, CONTATO, PROPOSTA, GESTAO) para quem não responde. */
function ComG_estrategia_(o, contatosReg, temProposta, qtdContatosCliente, met) {
  var usados = {};
  contatosReg.slice(0, 6).forEach(function (c) { usados[Com_up_(c.TIPO || c.tipo)] = true; });
  var ordem = ['WHATSAPP', 'LIGACAO', 'VISITA'];
  var prox = ordem.filter(function (c) { return !usados[c]; })[0];
  var t = Number(o.TENTATIVAS_SEM_RESPOSTA) || 0, est;
  if (prox) est = { codigo: 'CANAL', detalhe: 'Próximo contato por ' + (COM_TIPOS_CONTATO[prox] || prox).toLowerCase() + (Object.keys(usados).length ? ' (já tentou: ' + Object.keys(usados).map(function (u) { return (COM_TIPOS_CONTATO[u] || u).toLowerCase(); }).join(', ') + ').' : '.') };
  else if (qtdContatosCliente > 1) est = { codigo: 'CONTATO', detalhe: (qtdContatosCliente - 1) + ' outro(s) contato(s) cadastrado(s) neste cliente: procure quem decide ou quem usa.' };
  else if (temProposta) est = { codigo: 'PROPOSTA', detalhe: 'Há proposta enviada: ofereça prazo ou condição diferente, ou escopo em fases. Pergunte o que trava.' };
  else est = { codigo: t >= 5 ? 'GESTAO' : 'CONTATO', detalhe: t >= 5 ? 'Peça apoio da gestão comercial com o decisor do cliente.' : 'Nenhum outro contato cadastrado: descubra quem decide e cadastre.' };
  var e = met.estrategias.filter(function (x) { return x.codigo === est.codigo; })[0] || {};
  est.titulo = e.titulo || est.codigo; est.texto = e.texto || '';
  return est;
}

/** Item da qualificação que falta (dor, decisor, verba, prazo), com a pergunta da metodologia. */
function ComG_qualificacaoFaltando_(o, met) {
  var q = Com_json_(o.QUALIFICACAO_JSON, {}) || {};
  return (met.qualificacao.itens || []).filter(function (i) { return !Com_s_(q[i.codigo]); });
}

// ------------------------------------------------------------
// LISTA DO DIA (regras)
// ------------------------------------------------------------
/** Itens "o que fazer hoje" de um vendedor, pelas regras da metodologia. Sem IA. */
function ComG_itensVendedor_(uid, ctx) {
  ctx = ctx || {};
  var met = ctx.met || Com_metodologia_(), agora = ctx.agora || Com_agora_(), hoje = agora.slice(0, 10), c = met.cadencia;
  var atvs = ctx.atividades || ComOpo_mapaAtividades_();
  var ops = (ctx.oportunidades || Com_ler_(COM_ABAS.OPORTUNIDADES)).filter(function (o) { return Com_s_(o.RESPONSAVEL_ID) === uid; });
  var props = (ctx.propostas || Com_ler_(COM_ABAS.PROPOSTAS)).filter(function (p) { return Com_s_(p.RESPONSAVEL_ID) === uid; });
  var regs = ctx.contatosReg || Com_ler_(COM_ABAS.CONTATOS_REG);
  var contatosCli = ctx.contatosCli || {};
  if (!ctx.contatosCli) Com_ler_(COM_ABAS.CONTATOS).forEach(function (k) { if (Com_up_(k.STATUS || 'ATIVO') === 'ATIVO') contatosCli[Com_s_(k.CLIENTE_ID)] = (contatosCli[Com_s_(k.CLIENTE_ID)] || 0) + 1; });
  var itens = [];
  var add = function (it) { it.prioridadeNome = COM_G_PRIORIDADE[it.prioridade]; itens.push(it); };
  var abertas = ops.filter(function (o) { return Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA'; });
  abertas.forEach(function (o) {
    var d = ComOpo_derivados_(o, { met: met, agora: agora, atividades: atvs });
    var ref = { tipo: 'oportunidade', id: Com_s_(o.ID) }, base = Com_s_(o.CODIGO) + ' · ' + Com_s_(o.CLIENTE_NOME);
    var valor = Number(o.VALOR_ESTIMADO) || 0;
    var meusRegs = regs.filter(function (r) { return Com_s_(r.OPORTUNIDADE_ID) === Com_s_(o.ID); }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); });
    var temProp = props.some(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(o.ID) && Com_up_(p.SITUACAO) === 'ENVIADA'; });
    if (d.semProxima) add({ chave: 'SEM_PROXIMA:' + o.ID, regra: 'SEM_PROXIMA', prioridade: 1, titulo: base + ': sem próxima ação', ref: ref, valor: valor, ponderado: d.ponderado,
      porque: 'Regra de ouro: toda oportunidade aberta tem próxima ação com data. Esta ficou sem nenhuma atividade futura.', acao: 'Registre o contato que foi feito e marque o próximo passo (botão "Registrar contato").' });
    if (d.parada) add({ chave: 'PARADA:' + o.ID, regra: 'PARADA', prioridade: 1, titulo: base + ': parada há ' + d.diasSemContato + ' dias sem contato', ref: ref, valor: valor, ponderado: d.ponderado,
      porque: 'Oportunidade sem contato real há ' + d.diasSemContato + ' dias (o limite da metodologia é ' + c.paradaDias + ').', acao: 'Reaqueça hoje com um contato real e a próxima ação, ou registre a perda honesta com o motivo certo.',
      mensagem: ComG_preencher_(met.modelosMensagem.parada, { nome: ComG_primeiroNome_(o.CONTATO_NOME), assunto: Com_s_(o.TITULO).toLowerCase() }) });
    else if (d.atrasada) {
      var est = d.mudarEstrategia ? ComG_estrategia_(o, meusRegs, temProp, contatosCli[Com_s_(o.CLIENTE_ID)] || 0, met) : null;
      add({ chave: 'ATRASADA:' + o.ID, regra: est ? 'MUDAR_ESTRATEGIA' : 'RETORNO_ATRASADO', prioridade: 1, titulo: base + ': retorno atrasado desde ' + Com_br_(d.proximaEm), ref: ref, valor: valor, ponderado: d.ponderado,
        porque: est ? Com_s_(o.TENTATIVAS_SEM_RESPOSTA) + ' tentativas sem resposta: a metodologia manda mudar a estratégia (' + est.titulo + ').' : 'O retorno combinado (' + Com_s_(o.PROXIMA_ACAO) + ') passou do prazo.',
        acao: est ? est.titulo + ': ' + est.detalhe : 'Faça hoje o retorno combinado: ' + Com_s_(o.PROXIMA_ACAO) + '.' });
    } else if (d.hoje) add({ chave: 'HOJE:' + o.ID, regra: 'RETORNO_HOJE', prioridade: 2, titulo: base + ': retorno de hoje', ref: ref, valor: valor, ponderado: d.ponderado,
      porque: 'Retorno combinado para hoje às ' + d.proximaEm.slice(11, 16) + '.', acao: Com_s_(o.PROXIMA_ACAO) || 'Fazer o contato combinado.' });
    else if (d.esfriando) add({ chave: 'ESFRIANDO:' + o.ID, regra: 'ESFRIANDO', prioridade: 3, titulo: base + ': esfriando (' + d.diasSemContato + ' dias sem contato)', ref: ref, valor: valor, ponderado: d.ponderado,
      porque: 'Cliente sem contato há ' + d.diasSemContato + ' dias; com ' + c.paradaDias + ' dias a oportunidade fica parada.', acao: 'Antecipe o contato: ' + (Com_s_(o.PROXIMA_ACAO) || 'retome a conversa e marque o próximo passo') + '.' });
    if (d.estagnada && !d.parada) {
      var et = Com_etapa_(Com_s_(o.FUNIL), Com_s_(o.ETAPA), met) || {};
      add({ chave: 'ESTAGNADA:' + o.ID, regra: 'ESTAGNADA', prioridade: 3, titulo: base + ': ' + d.diasNaEtapa + ' dias na etapa ' + d.etapaNome, ref: ref, valor: valor, ponderado: d.ponderado,
        porque: 'A metodologia prevê até ' + et.maxDias + ' dias nesta etapa. Critério para sair: ' + Com_s_(et.criterio) + '.', acao: 'Confira a lista da etapa (' + (et.checklist || []).slice(0, 2).join('; ') + ') e avance ou mude a estratégia.' });
    }
    if (d.probabilidade >= 40) {
      var falta = ComG_qualificacaoFaltando_(o, met);
      if (falta.length) add({ chave: 'QUALIFICACAO:' + o.ID, regra: 'QUALIFICACAO', prioridade: 4, titulo: base + ': qualificação incompleta (' + falta.map(function (f) { return f.nome.toLowerCase(); }).join(', ') + ')', ref: ref, valor: valor, ponderado: d.ponderado,
        porque: met.qualificacao.criterio, acao: 'No próximo contato, pergunte: ' + falta[0].pergunta });
    }
  });
  props.forEach(function (p) {
    var s = Com_up_(p.SITUACAO), ref = { tipo: 'proposta', id: Com_s_(p.ID) }, base = ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME), valor = Number(p.TOTAL) || 0;
    if (s === 'APROVADA' && (Com_up_(p.PEDIDO_SITUACAO) === 'SEM_PASSAGEM' || !Com_s_(p.PEDIDO_SITUACAO))) add({ chave: 'PEDIDO:' + p.ID, regra: 'PEDIDO_SEM_PASSAGEM', prioridade: 1, titulo: base + ': pedido aprovado sem passagem aos setores', ref: ref, valor: valor,
      porque: 'O cliente aprovou em ' + Com_brDia_(p.RESPOSTA_EM) + '. Sem a passagem, a técnica, compras e o financeiro não sabem do pedido.', acao: 'Toque em "Passar aos setores" na proposta.' });
    if (s === 'ENVIADA') {
      var ate = Com_dia_(p.VALIDA_ATE), falta = ate ? Com_diasEntre_(hoje, ate) : 99;
      var du = Com_diasUteisEntre_(Com_dia_(p.ENVIADA_EM), hoje);
      var o = ops.filter(function (x) { return Com_s_(x.ID) === Com_s_(p.OPORTUNIDADE_ID); })[0] || {};
      if (falta <= (Number(c.propostaVencendoDias) || 3)) add({ chave: 'VENCENDO:' + p.ID, regra: 'PROPOSTA_VENCENDO', prioridade: 2, titulo: base + ': vence em ' + Com_brDia_(ate), ref: ref, valor: valor,
        porque: 'A validade termina em ' + Com_brDia_(ate) + ' e não há resposta do cliente.', acao: 'Confirme a decisão do cliente ou renove a validade com uma nova revisão.' });
      else if (du >= (Number(c.propostaLembreteDiaUtil) || 2)) add({ chave: 'SEM_RESPOSTA:' + p.ID, regra: 'PROPOSTA_SEM_RESPOSTA', prioridade: 2, titulo: base + ': enviada há ' + du + ' dias úteis sem resposta', ref: ref, valor: valor,
        porque: 'Enviar a proposta e sumir costuma ser venda perdida.', acao: 'Ligue para o cliente e combine a data de decisão.',
        mensagem: ComG_preencher_(met.modelosMensagem.proposta, { nome: ComG_primeiroNome_(p.CONTATO_NOME || o.CONTATO_NOME), proposta: Com_s_(p.NUMERO) }) });
    }
    if (s === 'PRONTA') add({ chave: 'PRONTA:' + p.ID, regra: 'PROPOSTA_PRONTA', prioridade: 2, titulo: base + ': pronta e ainda não enviada', ref: ref, valor: valor,
      porque: 'A proposta passou na revisão e na política de desconto' + (Com_s_(p.PDF_ID) ? ' e o documento já está na pasta do cliente.' : '.'), acao: Com_s_(p.PDF_ID) ? 'Toque em "Enviar ao cliente".' : 'Gere o documento e envie ao cliente.' });
    if (s === 'RASCUNHO' && Com_up_(p.DESCONTO_SITUACAO) === 'NEGADO') add({ chave: 'NEGADO:' + p.ID, regra: 'DESCONTO_NEGADO', prioridade: 2, titulo: base + ': desconto não aprovado', ref: ref, valor: valor,
      porque: 'A gestão comercial não aprovou o desconto: ' + Com_s_(p.DESCONTO_DECISAO_TEXTO).slice(0, 200), acao: 'Ajuste o rascunho (escopo, prazo ou condição em vez de desconto) e conclua de novo.' });
    if (s === 'VENCIDA') {
      var op = ops.filter(function (x) { return Com_s_(x.ID) === Com_s_(p.OPORTUNIDADE_ID); })[0];
      if (op && Com_up_(op.SITUACAO || 'ABERTA') === 'ABERTA' && !Com_s_(p.SUBSTITUIDA_POR)) add({ chave: 'VENCIDA:' + p.ID, regra: 'PROPOSTA_VENCIDA', prioridade: 2, titulo: base + ': venceu sem resposta', ref: ref, valor: valor,
        porque: 'A validade terminou em ' + Com_brDia_(p.VALIDA_ATE) + ' sem resposta registrada.', acao: 'Fale com o cliente: renove com uma nova revisão ou registre a perda com o motivo real.' });
    }
    if (s === 'RECUSADA' && !Com_s_(p.SUBSTITUIDA_POR)) {
      var op2 = ops.filter(function (x) { return Com_s_(x.ID) === Com_s_(p.OPORTUNIDADE_ID); })[0];
      if (op2 && Com_up_(op2.SITUACAO || 'ABERTA') === 'ABERTA') add({ chave: 'RECUSADA:' + p.ID, regra: 'RECUSA_SEM_DECISAO', prioridade: 2, titulo: base + ': recusada (' + Com_s_(p.MOTIVO_RECUSA) + ')', ref: ref, valor: valor,
        porque: 'Toda recusa tem um próximo passo.', acao: 'Entenda a recusa e decida: nova revisão ou registrar a perda.' });
    }
  });
  // 29/10/2026: rascunhos com o checklist de custos da viagem ou do frete incompleto (especialista em precificação)
  if (typeof ComPr_itensVendedor_ === 'function') { try { ComPr_itensVendedor_(props, ComPr_politica_(met)).forEach(add); } catch (ePr) { console.error('Comercial, gestora (precificação): ' + ((ePr && ePr.message) || ePr)); } }
  if (abertas.length < 5) add({ chave: 'FUNIL_BAIXO:' + uid, regra: 'FUNIL_BAIXO', prioridade: 5, titulo: 'Funil com ' + Com_plural_(abertas.length, 'oportunidade aberta', 'oportunidades abertas'), ref: { tipo: 'oportunidades' },
    porque: 'Com menos de 5 oportunidades abertas a meta fica dependente de poucas vendas.', acao: 'Prospecte contas do perfil atendido (' + Com_s_(met.qualificacao.perfilCliente).split(';')[0] + ') e cadastre as novas oportunidades.' });
  // proposta sem resposta cujo retorno já está na lista da oportunidade: a mensagem vai para esse item (sem repetir)
  itens = itens.filter(function (it) {
    if (it.regra !== 'PROPOSTA_SEM_RESPOSTA') return true;
    var p = props.filter(function (x) { return Com_s_(x.ID) === it.ref.id; })[0];
    var irmao = p && itens.filter(function (x) { return x.ref.tipo === 'oportunidade' && x.ref.id === Com_s_(p.OPORTUNIDADE_ID) && ['RETORNO_ATRASADO', 'RETORNO_HOJE', 'MUDAR_ESTRATEGIA'].indexOf(x.regra) >= 0; })[0];
    if (!irmao) return true;
    irmao.mensagem = irmao.mensagem || it.mensagem;
    irmao.porque = irmao.porque + ' A proposta ' + ComP_rotulo_(p) + ' está sem resposta: combine a data de decisão.';
    return false;
  });
  // uma linha por oportunidade/proposta: fica a mais urgente, as outras viram complemento
  var porRef = {};
  itens.sort(function (a, b) { return a.prioridade - b.prioridade || (b.ponderado || b.valor || 0) - (a.ponderado || a.valor || 0); });
  var saida = [];
  itens.forEach(function (it) {
    var k = it.ref.tipo + ':' + (it.ref.id || it.chave);
    if (porRef[k]) { porRef[k].tambem = (porRef[k].tambem || []).concat([it.titulo.split(': ').slice(1).join(': ')]); return; }
    porRef[k] = it; saida.push(it);
  });
  return saida;
}

/** Panorama da gestão comercial: funil, equipe, decisões pendentes e alertas de cadência. */
function ComG_panorama_(ctx) {
  ctx = ctx || {};
  var met = ctx.met || Com_metodologia_(), agora = ctx.agora || Com_agora_(), hoje = agora.slice(0, 10);
  var atvs = ctx.atividades || ComOpo_mapaAtividades_(), ops = ctx.oportunidades || Com_ler_(COM_ABAS.OPORTUNIDADES), props = ctx.propostas || Com_ler_(COM_ABAS.PROPOSTAS);
  var regs = ctx.contatosReg || Com_ler_(COM_ABAS.CONTATOS_REG);
  var equipe = {}, itens = [];
  ops.forEach(function (o) {
    var uid = Com_s_(o.RESPONSAVEL_ID), e = equipe[uid] = equipe[uid] || { id: uid, nome: Com_s_(o.RESPONSAVEL_NOME), abertas: 0, semProxima: 0, atrasadas: 0, paradas: 0, valorAberto: 0, contatos10d: 0 };
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') return;
    var d = ComOpo_derivados_(o, { met: met, agora: agora, atividades: atvs });
    e.abertas++; e.valorAberto += Number(o.VALOR_ESTIMADO) || 0;
    var criada = Com_dia_(o.CRIADO_EM) || hoje; if (!e.maisAntiga || criada < e.maisAntiga) e.maisAntiga = criada;
    if (d.semProxima) e.semProxima++; if (d.atrasada) e.atrasadas++; if (d.parada) e.paradas++;
  });
  var corte = Com_somarDias_(hoje, -10);
  regs.forEach(function (r) { var e = equipe[Com_s_(r.USUARIO_ID)]; if (e && Com_dia_(r.DATA) >= corte) e.contatos10d++; });
  Object.keys(equipe).forEach(function (uid) {
    var e = equipe[uid];
    if (e.abertas && !e.contatos10d && e.maisAntiga && e.maisAntiga <= corte) itens.push({ chave: 'CADENCIA:' + uid, regra: 'CADENCIA_QUEBRADA', prioridade: 1, titulo: e.nome + ': ' + Com_plural_(e.abertas, 'oportunidade aberta', 'oportunidades abertas') + ' e nenhum contato registrado em 10 dias', ref: { tipo: 'oportunidades', responsavelId: uid },
      porque: 'Cadência quebrada: sem contato registrado o funil esfria e a previsão perde valor.', acao: 'Converse com ' + ComG_primeiroNome_(e.nome) + ' citando os códigos e peça o porquê e o próximo passo com data.' });
    if (e.abertas >= 2 && e.paradas * 2 >= e.abertas) itens.push({ chave: 'PARADO:' + uid, regra: 'FUNIL_PARADO', prioridade: 2, titulo: e.nome + ': ' + e.paradas + ' de ' + e.abertas + ' oportunidades paradas', ref: { tipo: 'oportunidades', responsavelId: uid },
      porque: 'Metade ou mais do funil está sem contato há ' + met.cadencia.paradaDias + ' dias ou mais.', acao: 'Revise com o vendedor quais reaquecer e quais encerrar com o motivo real.' });
    if (e.semProxima) itens.push({ chave: 'SEMPROX:' + uid, regra: 'SEM_PROXIMA_EQUIPE', prioridade: 2, titulo: e.nome + ': ' + Com_plural_(e.semProxima, 'oportunidade sem próxima ação', 'oportunidades sem próxima ação'), ref: { tipo: 'oportunidades', responsavelId: uid },
      porque: 'Regra de ouro quebrada: nada sem dono, nada sem prazo, nada sem próxima ação.', acao: 'Peça a ' + ComG_primeiroNome_(e.nome) + ' para marcar a próxima ação hoje.' });
  });
  var aguardando = props.filter(function (p) { return Com_up_(p.SITUACAO) === 'AGUARDANDO_APROVACAO'; });
  aguardando.forEach(function (p) { itens.push({ chave: 'DESCONTO:' + p.ID, regra: 'DESCONTO_PENDENTE', prioridade: 1, titulo: ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME) + ': desconto aguardando a sua decisão', ref: { tipo: 'proposta', id: Com_s_(p.ID) },
    porque: 'Pedido de ' + Com_s_(p.RESPONSAVEL_NOME) + ' em ' + Com_br_(p.DESCONTO_PEDIDO_EM) + ': ' + Com_s_(p.DESCONTO_MOTIVO).slice(0, 200), acao: 'Abra a proposta e aprove ou negue com a fundamentação. A gestora não decide desconto.' }); });
  ops.filter(function (o) { return Com_s_(o.REABERTURA_PEDIDA_EM); }).forEach(function (o) { itens.push({ chave: 'REABRIR:' + o.ID, regra: 'REABERTURA_PEDIDA', prioridade: 2, titulo: o.CODIGO + ' · ' + Com_s_(o.CLIENTE_NOME) + ': pedido de reabertura', ref: { tipo: 'oportunidade', id: Com_s_(o.ID) },
    porque: Com_s_(o.REABERTURA_MOTIVO).slice(0, 200), acao: 'Abra a oportunidade e reabra (com a próxima ação) ou recuse com o motivo.' }); });
  props.filter(function (p) { return Com_up_(p.SITUACAO) === 'APROVADA' && (!Com_s_(p.PEDIDO_SITUACAO) || Com_up_(p.PEDIDO_SITUACAO) === 'SEM_PASSAGEM'); }).forEach(function (p) {
    var du = Com_diasUteisEntre_(Com_dia_(p.RESPOSTA_EM), hoje);
    if (du >= (Number(met.posVenda.pedidoParadoDiasUteis) || 1)) itens.push({ chave: 'PEDIDO:' + p.ID, regra: 'PEDIDO_PARADO', prioridade: 1, titulo: ComP_rotulo_(p) + ' · ' + Com_s_(p.CLIENTE_NOME) + ': aprovado há ' + du + ' dia(s) útil(eis) sem passagem aos setores', ref: { tipo: 'proposta', id: Com_s_(p.ID) },
      porque: 'Pedido aprovado sem passagem: é aqui que se perde o elo entre vender e executar.', acao: 'Cobre de ' + ComG_primeiroNome_(p.RESPONSAVEL_NOME) + ' a passagem hoje (Propostas > Passar aos setores).' });
  });
  // 29/10/2026: especialista em precificação: política incompleta, propostas com custo de viagem fora ou margem baixa, catálogo sem reajuste
  if (typeof ComPr_itensGestora_ === 'function') { try { itens = itens.concat(ComPr_itensGestora_({ met: met, propostas: props })); } catch (ePr) { console.error('Comercial, gestora (precificação): ' + ((ePr && ePr.message) || ePr)); } }
  itens.sort(function (a, b) { return a.prioridade - b.prioridade; });
  itens.forEach(function (i) { i.prioridadeNome = COM_G_PRIORIDADE[i.prioridade]; });
  return { itens: itens, equipe: Object.keys(equipe).map(function (k) { var e = equipe[k]; e.valorAbertoTxt = Com_moeda_(e.valorAberto); return e; }).filter(function (e) { return e.abertas; })
    .sort(function (a, b) { return b.valorAberto - a.valorAberto; }) };
}

// ------------------------------------------------------------
// IA: chamada, leitura do JSON e verificação
// ------------------------------------------------------------
function ComG_iaDisponivel_() {
  try { return !!Com_s_(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')); } catch (e) { return false; }
}

/** Metodologia em texto para o prompt (é a gestão que escreve; nada aqui é regra fixa do código). */
function ComG_metodologiaTexto_(met) {
  var l = [];
  l.push('TESE: ' + met.tese);
  l.push('REGRAS DE OURO: ' + met.regrasDeOuro.join(' | '));
  met.funis.forEach(function (f) { l.push('FUNIL ' + f.nome + ': ' + f.etapas.map(function (e) { return e.nome + ' (' + e.probabilidade + '%, até ' + e.maxDias + ' dias; sair quando: ' + e.criterio + ')'; }).join(' > ')); });
  l.push('QUALIFICAÇÃO: ' + met.qualificacao.criterio + ' Itens: ' + met.qualificacao.itens.map(function (i) { return i.nome + ' (' + i.pergunta + ')'; }).join('; ') + '. Perfil de cliente: ' + met.qualificacao.perfilCliente);
  l.push('CADÊNCIA: esfriando com ' + met.cadencia.esfriandoDias + ' dias sem contato; parada com ' + met.cadencia.paradaDias + '; mudar a estratégia após ' + met.cadencia.tentativasMudarEstrategia + ' tentativas sem resposta. Passos: ' + met.cadencia.passos.map(function (p) { return 'dia ' + p.dia + ' ' + p.titulo; }).join('; '));
  l.push('ESTRATÉGIAS QUANDO NÃO RESPONDE: ' + met.estrategias.map(function (e) { return e.titulo + ' (' + e.texto + ')'; }).join(' | '));
  l.push('OBJEÇÕES: ' + met.objecoes.map(function (o) { return '"' + o.objecao + '": ' + o.resposta; }).join(' | '));
  l.push('POLÍTICA DE DESCONTO: ' + met.politica.texto);
  if (met.precificacao && Com_s_(met.precificacao.texto)) l.push('POLÍTICA DE PRECIFICAÇÃO: ' + Com_s_(met.precificacao.texto));
  l.push('PERDA: ' + met.regraPerda + ' Motivos: ' + met.motivosPerda.join('; '));
  return l.join('\n');
}

function ComG_regrasPrompt_() {
  return [
    'Você é a gestora comercial de uma empresa de engenharia clínica (manutenção, calibração e qualificação de equipamentos hospitalares). Você orienta o vendedor com a METODOLOGIA abaixo, escrita pela gestão da empresa.',
    'Regras obrigatórias:',
    '- Use somente os FATOS enviados. Não invente cliente, pessoa, preço, prazo, data, número, norma ou resultado. Se faltar informação, diga o que perguntar ao cliente.',
    '- Você só sugere. Nunca diga que enviou, aprovou, mudou ou registrou algo. Não prometa desconto, prazo ou preço; venda valor técnico, não desconto.',
    '- Não cite marca, fabricante ou modelo comercial. Não cite norma. Não use emojis, markdown, listas com asterisco, termos em inglês nem tom de propaganda. Não diga que é inteligência artificial.',
    '- Português do Brasil, frases curtas e diretas, tom sóbrio de gestor comercial B2B. Valores em reais com vírgula decimal, exatamente como nos fatos.',
    '- Responda APENAS com o JSON pedido, sem texto antes ou depois.'
  ].join('\n');
}

/** JSON da resposta da IA (tolera cercas de código). null se não der para ler. */
function ComG_lerJson_(t) {
  var s = Com_s_(t).replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  var i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
}

/** Confere um texto da IA contra os fatos. { ok, problemas }. */
function ComG_verificar_(texto, fatos, extra) {
  var t = Com_s_(texto);
  if (!t) return { ok: false, problemas: ['texto vazio'] };
  var problemas = [];
  if (typeof SGO_QIAV_verificar_ === 'function') {
    var nums = typeof SGO_QIAV_numerosDe_ === 'function' ? SGO_QIAV_numerosDe_(fatos) : [];
    var r = SGO_QIAV_verificar_(t, { numeros: nums, normas: [], veredito: '', inteirosLivresAte: (extra && extra.livres) || 10, termosProibidos: COM_G_PROIBIDOS });
    problemas = problemas.concat(r.problemas || []);
  } else {
    COM_G_PROIBIDOS.forEach(function (re) { if (re.test(t)) problemas.push('expressão proibida: ' + t.match(re)[0]); });
  }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) problemas.push('emoji');
  if (/\*\*|^#|\bAI\b|\bIA\b/m.test(t)) problemas.push('formatação ou referência a IA');
  return { ok: !problemas.length, problemas: problemas };
}

/** Chama a IA; devolve { json, aviso }. Nunca lança. */
function ComG_chamarIA_(prompt, tokens) {
  if (!ComG_iaDisponivel_()) return { json: null, aviso: 'A gestora está trabalhando só pelas regras: a chave da IA não está cadastrada (Administração > Chaves e senhas).' };
  try {
    var t = typeof SGO_DocA4_chamarGemini_ === 'function' ? SGO_DocA4_chamarGemini_(prompt, { tokens: tokens || 16384, temperatura: 0.2 }) : RelA4_gemini_(prompt, { tokens: 4096, temperatura: 0.2 });
    var j = ComG_lerJson_(t);
    return j ? { json: j, aviso: '' } : { json: null, aviso: 'A resposta da IA não veio no formato esperado; valem as regras.' };
  } catch (e) { return { json: null, aviso: 'A IA não respondeu agora (' + String((e && e.message) || e).replace(/[.\s]+$/, '').slice(0, 160) + '); valem as regras.' }; }
}

/** Registro de uma sugestão (para saber depois o que foi usado). Devolve o id. */
function ComG_registrar_(tipo, regra, uid, ref, origem, titulo, conteudo, verificacao) {
  try {
    var r = SGO_DATA.insert(COM_ABAS.SUGESTOES, { TIPO: tipo, REGRA: regra, USUARIO_ID: uid, OPORTUNIDADE_ID: ref && ref.tipo === 'oportunidade' ? ref.id : '', PROPOSTA_ID: ref && ref.tipo === 'proposta' ? ref.id : '',
      ORIGEM: origem, TITULO: Com_texto_(titulo, 300), CONTEUDO_JSON: JSON.stringify(conteudo || {}).slice(0, 20000), VERIFICACAO: Com_texto_(verificacao, 1000), DECISAO: '', DIA: Com_hoje_() });
    return Com_s_(r.ID);
  } catch (e) { return ''; }
}

/** A IA reescreve porque/ação de cada item; o que passar no verificador substitui o texto das regras. */
function ComG_refinarComIA_(itens, papel, met) {
  if (!itens.length) return { itens: itens, resumo: '', origem: 'REGRAS', aviso: '' };
  var fatos = itens.slice(0, 15).map(function (i) { return { chave: i.chave, regra: i.regra, prioridade: i.prioridadeNome, titulo: i.titulo, motivoPelasRegras: i.porque, acaoPelasRegras: i.acao, valor: i.valor ? Com_moeda_(i.valor) : '' }; });
  var prompt = ComG_regrasPrompt_() + '\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(met) + '\n\nFATOS (lista ' + (papel === 'GESTAO' ? 'da gestão comercial' : 'do vendedor') + ' para hoje, ' + Com_brDia_(Com_hoje_()) + '):\n' + JSON.stringify(fatos) +
    '\n\nTAREFA: para cada item, escreva em uma ou duas frases por que ele importa hoje (porque) e o próximo passo concreto (acao), aplicando a metodologia (estratégia, cadência, qualificação, objeções). ' +
    'Escreva também um resumo de no máximo duas frases para abrir o dia. Formato: {"resumo":"...","itens":[{"chave":"...","porque":"...","acao":"..."}]}';
  var r = ComG_chamarIA_(prompt, 16384);
  if (!r.json || !Array.isArray(r.json.itens)) return { itens: itens, resumo: '', origem: 'REGRAS', aviso: r.aviso };
  var porChave = {}, aceitos = 0, recusados = 0;
  r.json.itens.forEach(function (x) { if (x && x.chave) porChave[x.chave] = x; });
  itens.forEach(function (i) {
    var x = porChave[i.chave];
    if (!x) return;
    var f = { titulo: i.titulo, porque: i.porque, acao: i.acao, valor: i.valor, ponderado: i.ponderado, hoje: Com_hoje_() };
    var v1 = ComG_verificar_(x.porque, f), v2 = ComG_verificar_(x.acao, f);
    if (v1.ok && v2.ok) { i.porqueIA = Com_texto_(x.porque, 400); i.acaoIA = Com_texto_(x.acao, 400); aceitos++; }
    else { recusados++; i.recusaIA = v1.problemas.concat(v2.problemas).slice(0, 3).join('; '); }
  });
  var resumo = Com_s_(r.json.resumo), vr = ComG_verificar_(resumo, fatos);
  return { itens: itens, resumo: vr.ok ? Com_texto_(resumo, 400) : '', origem: aceitos ? 'IA' : 'REGRAS',
    aviso: recusados ? Com_plural_(recusados, 'texto da IA foi recusado', 'textos da IA foram recusados') + ' pelo verificador (citavam dado que não está no sistema ou fugiam das regras); nesses itens vale o texto das regras.' : '' };
}

// ------------------------------------------------------------
// "O QUE FAZER HOJE" (tela e rotina)
// ------------------------------------------------------------
function ComG_ctx_() {
  return { met: Com_metodologia_(), agora: Com_agora_(), atividades: ComOpo_mapaAtividades_(), oportunidades: Com_ler_(COM_ABAS.OPORTUNIDADES), propostas: Com_ler_(COM_ABAS.PROPOSTAS), contatosReg: Com_ler_(COM_ABAS.CONTATOS_REG) };
}

/** Gera e grava a lista do dia de uma pessoa (rotina da manhã ou pedido na tela). comIA: tenta a IA. */
function ComG_gerarDia_(uid, nome, papel, comIA, ctx) {
  ctx = ctx || ComG_ctx_();
  var itens = papel === 'GESTAO' ? ComG_panorama_(ctx).itens : ComG_itensVendedor_(uid, ctx);
  var ref = comIA ? ComG_refinarComIA_(itens, papel, ctx.met) : { itens: itens, resumo: '', origem: 'REGRAS', aviso: '' };
  var resumo = ref.resumo || ComG_resumoRegras_(ref.itens, papel);
  var guardar = ref.itens.map(function (i) { return { chave: i.chave, porqueIA: i.porqueIA || '', acaoIA: i.acaoIA || '' }; });
  try { SGO_DATA.insert(COM_ABAS.DIA, { DIA: Com_hoje_(), USUARIO_ID: uid, USUARIO_NOME: nome, PAPEL: papel, ITENS_JSON: JSON.stringify(guardar).slice(0, 40000), RESUMO: resumo, ORIGEM: ref.origem, AVISO: ref.aviso, GERADO_EM: Com_agora_() }); } catch (e) {}
  return { itens: ref.itens, resumo: resumo, origem: ref.origem, aviso: ref.aviso };
}

function ComG_resumoRegras_(itens, papel) {
  var urg = itens.filter(function (i) { return i.prioridade === 1; }).length, hoje = itens.filter(function (i) { return i.prioridade === 2; }).length;
  if (!itens.length) return papel === 'GESTAO' ? 'Equipe em dia: nenhuma decisão pendente e nenhum alerta de cadência.' : 'Tudo em dia. Bom momento para prospectar contas novas do perfil atendido.';
  return (urg ? Com_plural_(urg, 'item pede atenção antes de tudo', 'itens pedem atenção antes de tudo') + (hoje ? ' e ' : '.') : '') + (hoje ? Com_plural_(hoje, 'item é para hoje', 'itens são para hoje') + '.' : '') + (urg || hoje ? '' : 'Itens de acompanhamento para a semana.');
}

/** Lista do dia para a tela: regras de agora + textos da gestora gravados hoje para os itens que ainda valem. */
function ComG_hoje_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ver o que fazer hoje');
  d = d || {};
  var papel = eu.gestao && d.papel !== 'VENDEDOR' ? 'GESTAO' : 'VENDEDOR';
  var uid = eu.gestao && d.vendedorId ? Com_s_(d.vendedorId) : eu.id;
  if (uid !== eu.id) papel = 'VENDEDOR';
  var ctx = ComG_ctx_();
  if (d.gerarComIA) {
    var g = ComG_gerarDia_(uid, eu.nome, papel, true, ctx);
    return ComG_montarHoje_(eu, uid, papel, g.itens, { RESUMO: g.resumo, ORIGEM: g.origem, AVISO: g.aviso, GERADO_EM: Com_agora_() }, ctx);
  }
  var itens = papel === 'GESTAO' ? ComG_panorama_(ctx).itens : ComG_itensVendedor_(uid, ctx);
  var dia = Com_ler_(COM_ABAS.DIA).filter(function (r) { return Com_s_(r.USUARIO_ID) === uid && Com_s_(r.PAPEL) === papel && Com_dia_(r.DIA) === Com_hoje_(); })
    .sort(function (a, b) { return String(b.GERADO_EM).localeCompare(String(a.GERADO_EM)); })[0] || null;
  if (dia) {
    var guard = {};
    Com_json_(dia.ITENS_JSON, []).forEach(function (x) { guard[x.chave] = x; });
    itens.forEach(function (i) { var x = guard[i.chave]; if (x) { if (x.porqueIA) i.porqueIA = x.porqueIA; if (x.acaoIA) i.acaoIA = x.acaoIA; } });
  }
  return ComG_montarHoje_(eu, uid, papel, itens, dia, ctx);
}

function ComG_montarHoje_(eu, uid, papel, itens, dia, ctx) {
  var decididas = {};
  Com_ler_(COM_ABAS.SUGESTOES).forEach(function (s) { if (Com_s_(s.TIPO) === 'LISTA_DIA' && Com_s_(s.USUARIO_ID) === uid && Com_dia_(s.DIA) === Com_hoje_() && Com_s_(s.DECISAO)) decididas[Com_s_(s.TITULO)] = Com_s_(s.DECISAO); });
  var lista = itens.map(function (i) {
    var o = { chave: i.chave, regra: i.regra, prioridade: i.prioridade, prioridadeNome: i.prioridadeNome, titulo: i.titulo, porque: i.porqueIA || i.porque, acao: i.acaoIA || i.acao,
      daGestora: !!(i.porqueIA || i.acaoIA), mensagem: i.mensagem || '', ref: i.ref, tambem: i.tambem || [], decisao: decididas[i.chave] || '' };
    if (eu.veValores && i.valor) o.valorTxt = Com_moeda_(i.valor);
    return o;
  });
  var r = { papel: papel, itens: lista, resumo: dia ? Com_s_(dia.RESUMO) : ComG_resumoRegras_(itens, papel), origem: dia ? Com_s_(dia.ORIGEM) : 'REGRAS',
    geradoEm: dia ? Com_br_(dia.GERADO_EM) : '', aviso: dia ? Com_s_(dia.AVISO) : '', iaDisponivel: ComG_iaDisponivel_(), hoje: Com_brDia_(Com_hoje_()) };
  if (papel === 'GESTAO') r.equipe = ComG_panorama_(ctx).equipe;
  return r;
}

/** "Feito" / "Não se aplica" / "Usei" / "Descartei" numa sugestão. d: { chave | sugestaoId, tipo, regra, decisao, motivo, ref } */
function ComG_decidirSugestao_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'registrar a decisão sobre a sugestão');
  d = d || {};
  var dec = Com_up_(d.decisao);
  if (['FEITO', 'NAO_SE_APLICA', 'USEI', 'DESCARTEI'].indexOf(dec) < 0) throw new Error('Não foi possível registrar: escolha "Feito", "Não se aplica", "Usei" ou "Descartei"');
  if ((dec === 'NAO_SE_APLICA' || dec === 'DESCARTEI') && Com_texto_(d.motivo, 500).length < 5) throw new Error('Não foi possível registrar: diga em poucas palavras por que a sugestão não serve (assim a gestão ajusta a metodologia)');
  Com_garantirAbas_();
  if (Com_s_(d.sugestaoId)) {
    var s = SGO_DATA.getById(COM_ABAS.SUGESTOES, Com_s_(d.sugestaoId));
    if (!s || Com_s_(s.USUARIO_ID) !== eu.id) throw new Error('Não foi possível registrar: a sugestão não é sua ou não existe mais');
    SGO_DATA.update(COM_ABAS.SUGESTOES, s.ID, { DECISAO: dec, DECISAO_EM: Com_agora_(), DECISAO_MOTIVO: Com_texto_(d.motivo, 500) });
  } else {
    var reg = ComG_registrar_('LISTA_DIA', Com_s_(d.regra), eu.id, d.ref || null, 'REGRAS', Com_s_(d.chave), { chave: d.chave }, '');
    if (reg) SGO_DATA.update(COM_ABAS.SUGESTOES, reg, { DECISAO: dec, DECISAO_EM: Com_agora_(), DECISAO_MOTIVO: Com_texto_(d.motivo, 500) });
  }
  return { message: dec === 'FEITO' || dec === 'USEI' ? 'Anotado.' : 'Anotado. A gestão vê quais sugestões não serviram para ajustar a metodologia.' };
}

/** Quais regras e sugestões funcionam (para a tela Metodologia). */
function ComG_aprendizado_() {
  var porRegra = {};
  Com_ler_(COM_ABAS.SUGESTOES).forEach(function (s) {
    var k = Com_s_(s.TIPO) + '|' + (Com_s_(s.REGRA) || '-');
    var r = porRegra[k] = porRegra[k] || { tipo: Com_s_(s.TIPO), regra: Com_s_(s.REGRA) || '-', total: 0, usadas: 0, descartadas: 0, ia: 0, motivos: [] };
    r.total++;
    if (Com_up_(s.ORIGEM) === 'IA') r.ia++;
    var d = Com_up_(s.DECISAO);
    if (d === 'FEITO' || d === 'USEI') r.usadas++;
    if (d === 'NAO_SE_APLICA' || d === 'DESCARTEI') { r.descartadas++; if (Com_s_(s.DECISAO_MOTIVO) && r.motivos.length < 5) r.motivos.push(Com_s_(s.DECISAO_MOTIVO)); }
  });
  return Object.keys(porRegra).map(function (k) { return porRegra[k]; }).sort(function (a, b) { return b.total - a.total; });
}

// ------------------------------------------------------------
// PRÓXIMO PASSO DE UMA OPORTUNIDADE (e o texto da mensagem)
// ------------------------------------------------------------
/** Sugestões das regras para a ficha (sem IA, rápidas). */
function ComG_sugestoesDaOportunidade_(eu, o, t, contatos) {
  var met = Com_metodologia_(), l = [];
  if (t.situacao !== 'ABERTA') return l;
  var temProp = Com_ler_(COM_ABAS.PROPOSTAS).some(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === t.id && Com_up_(p.SITUACAO) === 'ENVIADA'; });
  if (t.mudarEstrategia || t.parada) {
    var est = ComG_estrategia_(o, contatos.map(function (c) { return { TIPO: Object.keys(COM_TIPOS_CONTATO).filter(function (k) { return COM_TIPOS_CONTATO[k] === c.tipo; })[0] }; }), temProp, (ComCt_listar_(t.clienteId) || []).length, met);
    l.push({ tipo: 'ESTRATEGIA', titulo: 'Mude a estratégia: ' + est.titulo, texto: est.detalhe + ' ' + est.texto });
  }
  ComG_qualificacaoFaltando_(o, met).slice(0, 2).forEach(function (q) { l.push({ tipo: 'QUALIFICACAO', titulo: 'Falta: ' + q.nome, texto: 'Pergunte: ' + q.pergunta }); });
  return l;
}

/** Próximo passo e texto de mensagem/e-mail (regras + IA conferida). Registra a sugestão. */
function ComG_proximoPasso_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir o próximo passo à gestora');
  var o = ComOpo_obter_(eu, d && d.id, 'pedir o próximo passo');
  var c = ComG_contextoOportunidade_(eu, o);
  var met = c.met, t = c.t, regras = c.regras, fatos = c.fatos;
  var saida = Com_copia_(regras), origem = 'REGRAS', aviso = '';
  if (d && d.comIA !== false) {
    var prompt = ComG_regrasPrompt_() + '\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(met) + '\n\nFATOS:\n' + JSON.stringify(fatos) + '\n\nSUGESTÃO DAS REGRAS:\n' + JSON.stringify(regras) +
      '\n\nTAREFA: como gestora comercial, diga ao vendedor o próximo passo concreto desta oportunidade e por quê (aplicando a metodologia), até 3 perguntas para o cliente (qualificação ou SPIN) e escreva a mensagem curta de WhatsApp e o e-mail de retorno, em nome do vendedor, para ele revisar e enviar. ' +
      'Formato: {"proximoPasso":"...","porque":"...","perguntas":["..."],"mensagem":"...","emailAssunto":"...","emailCorpo":"..."}';
    var r = ComG_chamarIA_(prompt, 16384);
    aviso = r.aviso;
    if (r.json) {
      var recusas = [];
      ['proximoPasso', 'porque', 'mensagem', 'emailAssunto', 'emailCorpo'].forEach(function (k) {
        if (!Com_s_(r.json[k])) return;
        var v = ComG_verificar_(r.json[k], fatos);
        if (v.ok) { saida[k] = Com_texto_(r.json[k], 3000); origem = 'IA'; } else recusas.push(k + ' (' + v.problemas.slice(0, 2).join('; ') + ')');
      });
      if (Array.isArray(r.json.perguntas)) {
        var pg = r.json.perguntas.map(Com_s_).filter(function (q) { return q && ComG_verificar_(q, fatos).ok; }).slice(0, 3);
        if (pg.length) saida.perguntas = pg;
      }
      if (recusas.length) aviso = 'O verificador recusou parte do texto da IA (' + recusas.join(', ') + '); nessa parte vale o texto das regras.';
    }
  }
  var id = ComG_registrar_('PROXIMO_PASSO', origem === 'IA' ? 'IA' : 'REGRAS', eu.id, { tipo: 'oportunidade', id: t.id }, origem, t.codigo, saida, aviso);
  return { sugestaoId: id, sugestao: saida, origem: origem, aviso: aviso,
    lembrete: 'A gestora só sugere. Revise o texto, ajuste e envie você mesmo pelo seu e-mail ou WhatsApp; depois registre o contato na oportunidade.' };
}

/**
 * Contexto de uma oportunidade para a gestora: a tela da oportunidade, os contatos, as propostas, a sugestão das regras
 * (próximo passo, perguntas, mensagem, e-mail) e os FATOS (a única fonte que a IA pode usar). Só lê.
 */
function ComG_contextoOportunidade_(eu, o) {
  var met = Com_metodologia_(), t = ComOpo_paraTela_(eu, o, { met: met });
  if (t.situacao !== 'ABERTA') throw new Error('Não foi possível: a oportunidade ' + t.codigo + ' está encerrada');
  var regs = Com_ler_(COM_ABAS.CONTATOS_REG).filter(function (c) { return Com_s_(c.OPORTUNIDADE_ID) === t.id; }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); });
  var props = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === t.id; });
  var enviada = props.filter(function (p) { return Com_up_(p.SITUACAO) === 'ENVIADA'; })[0];
  var etapa = Com_etapa_(t.funil, t.etapa, met) || {};
  var nome = ComG_primeiroNome_(t.contato), eunome = ComG_primeiroNome_(eu.nome);
  // regras
  var passo, porque, modelo;
  if (enviada) { passo = 'Ligar para ' + (nome || 'o contato') + ' e combinar a data de decisão da proposta ' + Com_s_(enviada.NUMERO) + '.'; porque = 'Proposta enviada sem resposta: o retorno é o que mais converte.'; modelo = met.modelosMensagem.proposta; }
  else if (t.parada) { passo = 'Reaquecer com contato real hoje ou registrar a perda.'; porque = 'Parada há ' + t.diasSemContato + ' dias.'; modelo = met.modelosMensagem.parada; }
  else if (t.mudarEstrategia) { var est = ComG_estrategia_(o, regs, !!enviada, (ComCt_listar_(t.clienteId) || []).length, met); passo = est.titulo + ': ' + est.detalhe; porque = t.tentativasSemResposta + ' tentativas sem resposta.'; modelo = (Number(o.TENTATIVAS_SEM_RESPOSTA) || 0) >= 5 ? met.modelosMensagem.encerramento : met.modelosMensagem.parada; }
  else { var n = regs.length, pz = met.cadencia.passos.filter(function (p) { return p.dia > n; })[0] || met.cadencia.passos[met.cadencia.passos.length - 1]; passo = 'Cumprir o critério da etapa ' + t.etapaNome + ': ' + Com_s_(etapa.criterio) + '.'; porque = 'Cadência: ' + pz.titulo + '.'; modelo = met.modelosMensagem.parada; }
  var faltam = ComG_qualificacaoFaltando_(o, met);
  var regras = { proximoPasso: passo, porque: porque, perguntas: faltam.slice(0, 3).map(function (q) { return q.pergunta; }),
    mensagem: ComG_preencher_(modelo, { nome: nome, assunto: t.titulo.toLowerCase(), eu: eunome, proposta: enviada ? Com_s_(enviada.NUMERO) : '' }), emailAssunto: 'Metrolabs: ' + t.titulo, emailCorpo: '' };
  regras.emailCorpo = regras.mensagem + '\n\nAtenciosamente,\n' + eu.nome + '\nMetrolabs';
  var fatos = { oportunidade: { codigo: t.codigo, titulo: t.titulo, cliente: t.cliente, unidade: t.unidade, contatoPrimeiroNome: nome, funil: t.funilNome, etapa: t.etapaNome, probabilidade: t.probabilidade,
      criterioEtapa: etapa.criterio, checklistEtapa: etapa.checklist, diasSemContato: t.diasSemContato, diasNaEtapa: t.diasNaEtapa, tentativasSemResposta: t.tentativasSemResposta, proximaAcao: t.proximaAcao,
      origem: t.origem, valorEstimado: Com_moeda_(o.VALOR_ESTIMADO), qualificacaoRegistrada: t.qualificacao, qualificacaoFaltando: faltam.map(function (f) { return f.nome; }) },
    ultimosContatos: regs.slice(0, 10).map(function (r) { return { data: Com_brDia_(r.DATA), tipo: COM_TIPOS_CONTATO[Com_up_(r.TIPO)] || r.TIPO, respondeu: Com_up_(r.RESPONDEU) === 'SIM', resumo: Com_s_(r.RESUMO).slice(0, 300) }; }),
    propostas: props.map(function (p) { return { numero: ComP_rotulo_(p), situacao: COM_SITUACOES_PROP[Com_up_(p.SITUACAO)], total: Com_moeda_(p.TOTAL), validaAte: Com_brDia_(p.VALIDA_ATE), motivoRecusa: Com_s_(p.MOTIVO_RECUSA) }; }),
    vendedorPrimeiroNome: eunome, hoje: Com_brDia_(Com_hoje_()) };
  return { met: met, t: t, o: o, regs: regs, props: props, enviada: enviada, etapa: etapa, faltam: faltam, regras: regras, fatos: fatos };
}

// ------------------------------------------------------------
// ESPECIALISTA EM COMERCIAL (cartão do quadro e Gantt): próximo passo, estratégia para a etapa, objeções e e-mail
// ------------------------------------------------------------
/** Objeções prováveis pelas regras: escolhidas da lista da metodologia pelo momento da oportunidade. */
function ComG_objecoesProvaveis_(c) {
  var met = c.met, t = c.t, l = met.objecoes || [], escolha = [];
  var pega = function (re) { l.forEach(function (x) { if (re.test(Com_s_(x.objecao)) && escolha.indexOf(x) < 0) escolha.push(x); }); };
  var falta = c.faltam.map(function (q) { return q.codigo; });
  if (c.enviada) { pega(/caro|pre[cç]o/i); pega(/retorno|vou ver/i); }
  if (falta.indexOf('VERBA') >= 0) pega(/verba/i);
  if (falta.indexOf('DECISOR') >= 0) pega(/compras|decis/i);
  if (t.probabilidade <= 40) { pega(/fornecedor/i); pega(/e-?mail/i); }
  l.forEach(function (x) { if (escolha.length < 3 && escolha.indexOf(x) < 0) escolha.push(x); });
  return escolha.slice(0, 3).map(function (x) { return { objecao: Com_s_(x.objecao), resposta: Com_s_(x.resposta) }; });
}

/**
 * "Pedir à especialista": a gestora comercial olha uma oportunidade com a metodologia e devolve o próximo passo, a
 * estratégia para a etapa (o critério de saída e o que falta para avançar), as objeções prováveis com a resposta, as
 * perguntas e o texto da mensagem e do e-mail. Regras primeiro; a IA reescreve e o verificador confere campo a campo.
 * NÃO envia nada, NÃO muda etapa nem grava na oportunidade: só registra a sugestão (COM_IA_SUGESTOES, tipo ESPECIALISTA).
 * d: { id, comIA }
 */
function ComG_especialista_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir à especialista');
  d = d || {};
  var o = ComOpo_obter_(eu, d.id, 'pedir à especialista');
  var c = ComG_contextoOportunidade_(eu, o), met = c.met, t = c.t;
  var f = Com_funil_(t.funil, met), idx = -1;
  (f ? f.etapas : []).forEach(function (e, i) { if (e.codigo === t.etapa) idx = i; });
  var proxima = f && idx >= 0 && idx < f.etapas.length - 1 ? f.etapas[idx + 1] : null;
  var crit = proxima ? ComOpo_criteriosMudanca_(o, proxima.codigo, { met: met }) : { confirmar: [], faltas: [] };
  var passos = crit.faltas.map(function (x) { return x.texto + ' ' + x.oQueFazer; })
    .concat(crit.confirmar.filter(function (x) { return !x.confirmado; }).map(function (x) { return 'Cumprir e confirmar: ' + x.texto + '.'; })).slice(0, 6);
  var estrategia = { titulo: 'Estratégia para a etapa ' + t.etapaNome, texto: 'Critério para sair: ' + (Com_s_(c.etapa.criterio) || 'não definido na metodologia') + '.' + (proxima ? ' A próxima etapa é ' + proxima.nome + ' (' + proxima.probabilidade + '%).' : ' É a última etapa do funil: garanta o aceite, os documentos e a passagem aos setores.'),
    passos: passos.length ? passos : ['Nada pendente pelas regras para avançar: confirme a lista da etapa ao mover o cartão.'] };
  var regras = Com_copia_(c.regras);
  regras.estrategia = estrategia;
  regras.objecoes = ComG_objecoesProvaveis_(c);
  var fatos = Com_copia_(c.fatos);
  fatos.paraAvancar = { proximaEtapa: proxima ? proxima.nome : '', faltas: crit.faltas.map(function (x) { return x.texto; }), listaPendente: crit.confirmar.filter(function (x) { return !x.confirmado; }).map(function (x) { return x.texto; }) };
  fatos.objecoesDaMetodologia = met.objecoes;
  var saida = Com_copia_(regras), origem = 'REGRAS', aviso = '';
  if (d.comIA !== false) {
    var prompt = ComG_regrasPrompt_() + '\nVocê é também especialista em gestão comercial B2B de serviços técnicos para hospitais.\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(met) + '\n\nFATOS:\n' + JSON.stringify(fatos) +
      '\n\nSUGESTÃO DAS REGRAS:\n' + JSON.stringify(regras) +
      '\n\nTAREFA: para esta oportunidade, como especialista: (1) o próximo passo concreto e por quê; (2) a estratégia para cumprir o critério de saída da etapa atual, em até 5 passos curtos, usando o que falta para avançar; ' +
      '(3) até 3 objeções prováveis do cliente neste momento, cada uma com a resposta que vende valor técnico (não desconto); (4) até 3 perguntas para o cliente; (5) a mensagem curta de WhatsApp e o e-mail, em nome do vendedor, para ele revisar e enviar. ' +
      'Formato: {"proximoPasso":"...","porque":"...","estrategia":{"texto":"...","passos":["..."]},"objecoes":[{"objecao":"...","resposta":"..."}],"perguntas":["..."],"mensagem":"...","emailAssunto":"...","emailCorpo":"..."}';
    var r = ComG_chamarIA_(prompt, 16384);
    aviso = r.aviso;
    if (r.json) {
      var recusas = [], aceitos = 0;
      ['proximoPasso', 'porque', 'mensagem', 'emailAssunto', 'emailCorpo'].forEach(function (k) {
        if (!Com_s_(r.json[k])) return;
        var v = ComG_verificar_(r.json[k], fatos);
        if (v.ok) { saida[k] = Com_texto_(r.json[k], 3000); aceitos++; } else recusas.push(k + ' (' + v.problemas.slice(0, 2).join('; ') + ')');
      });
      var e = r.json.estrategia;
      if (e && typeof e === 'object') {
        var vt = ComG_verificar_(e.texto, fatos);
        var ps = (Array.isArray(e.passos) ? e.passos : []).map(Com_s_).filter(function (x) { return x && ComG_verificar_(x, fatos).ok; }).slice(0, 5);
        if (vt.ok && ps.length) { saida.estrategia = { titulo: estrategia.titulo, texto: Com_texto_(e.texto, 1500), passos: ps.map(function (x) { return Com_texto_(x, 500); }) }; aceitos++; }
        else recusas.push('estratégia' + (vt.ok ? '' : ' (' + vt.problemas.slice(0, 2).join('; ') + ')'));
      }
      if (Array.isArray(r.json.objecoes)) {
        var ob = r.json.objecoes.filter(function (x) { return x && Com_s_(x.objecao) && Com_s_(x.resposta) && ComG_verificar_(x.objecao, fatos).ok && ComG_verificar_(x.resposta, fatos).ok; }).slice(0, 3)
          .map(function (x) { return { objecao: Com_texto_(x.objecao, 300), resposta: Com_texto_(x.resposta, 800) }; });
        if (ob.length) { saida.objecoes = ob; aceitos++; } else if (r.json.objecoes.length) recusas.push('objeções');
      }
      if (Array.isArray(r.json.perguntas)) {
        var pg = r.json.perguntas.map(Com_s_).filter(function (q) { return q && ComG_verificar_(q, fatos).ok; }).slice(0, 3);
        if (pg.length) saida.perguntas = pg;
      }
      if (aceitos) origem = 'IA';
      if (recusas.length) aviso = 'O verificador recusou parte do texto da IA (' + recusas.join(', ') + '); nessa parte vale o texto das regras.';
    }
  }
  var id = ComG_registrar_('ESPECIALISTA', origem, eu.id, { tipo: 'oportunidade', id: t.id }, origem, t.codigo, saida, aviso);
  return { sugestaoId: id, sugestao: saida, origem: origem, aviso: aviso, oportunidade: { id: t.id, codigo: t.codigo, cliente: t.cliente, titulo: t.titulo, etapaNome: t.etapaNome },
    lembrete: 'A especialista só sugere: nada é enviado ao cliente e a etapa não muda sozinha. Revise o texto, envie você mesmo pelo seu e-mail ou WhatsApp e registre o contato na oportunidade.' };
}

// ------------------------------------------------------------
// LEITURA DO FUNIL (topo do quadro)
// ------------------------------------------------------------
/**
 * Leitura do funil: gargalos por etapa, oportunidades em risco e tempo médio por etapa contra a meta da metodologia.
 * Sempre sai pelas regras (ComQ_leituraRegras_); com d.comIA, a gestora reescreve com os NÚMEROS DO SISTEMA e o
 * verificador recusa número que não está nos fatos (aí vale o texto das regras). Só registra a sugestão; não muda nada.
 * d: os filtros do quadro + { comIA }.
 */
function ComG_leituraFunil_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir a leitura do funil');
  d = d || {};
  var m = ComQ_montar_(eu, d);
  var regras = m.leitura, saida = Com_copia_(regras), aviso = '';
  var fatos = {
    funil: m.f.nome, periodo: Com_brDia_(m.fl.de) + ' a ' + Com_brDia_(m.fl.ate), hoje: Com_brDia_(m.b.hoje), visao: eu.gestao ? (m.fl.responsavelId ? 'um vendedor' : 'equipe toda') : 'funil do próprio vendedor',
    abertas: m.abertas, ganhasNoPeriodo: m.ganhas.qtd, perdidasNoPeriodo: m.perdidas.qtd,
    etapas: m.colunas.map(function (c, i) { var t = m.tempos[i]; var x = { etapa: c.nome, probabilidade: c.probabilidade, abertas: c.qtd, metaDias: t.maxDias, passagensConcluidas: t.passagens, mediaDiasParaSair: t.mediaDias, mediaDiasDasAtuais: t.mediaAtuais, acimaDoPrazoAgora: t.acimaDoPrazo };
      if (eu.veValores) x.valorEmAberto = Com_moeda_(c.valor || 0); return x; }),
    emRisco: m.risco.slice(0, 12).map(function (r) { var x = { codigo: r.codigo, cliente: r.cliente, vendedor: r.responsavel, motivos: r.motivos }; if (eu.veValores && r.valorTxt) x.valor = r.valorTxt; return x; }),
    leituraDasRegras: regras
  };
  if (eu.veValores) fatos.valorEmAberto = Com_moeda_(m.colunas.reduce(function (s, c) { return s + (c.valor || 0); }, 0));
  if (d.comIA) {
    var prompt = ComG_regrasPrompt_() + '\nVocê é também especialista em gestão comercial B2B de serviços técnicos para hospitais.\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(m.b.met) + '\n\nNÚMEROS DO FUNIL (do sistema):\n' + JSON.stringify(fatos) +
      '\n\nTAREFA: escreva a leitura do funil para ' + (eu.gestao ? 'a gestão comercial' : 'o vendedor') + ': em 2 ou 3 parágrafos curtos, onde o funil está travando (etapas com tempo acima da meta ou acúmulo), quais oportunidades estão em risco e por quê, e o que fazer nesta semana segundo a metodologia. ' +
      'Liste também os gargalos (uma frase por etapa) e os riscos (uma frase por oportunidade, citando o código). Use só os números enviados. Formato: {"texto":"...","gargalos":["..."],"riscos":["..."]}';
    var r = ComG_chamarIA_(prompt, 16384);
    aviso = r.aviso;
    if (r.json) {
      var vt = ComG_verificar_(r.json.texto, fatos, { livres: 10 });
      var gs = (Array.isArray(r.json.gargalos) ? r.json.gargalos : []).map(Com_s_).filter(function (x) { return x && ComG_verificar_(x, fatos).ok; }).map(function (x) { return Com_texto_(x, 500); });
      var rs = (Array.isArray(r.json.riscos) ? r.json.riscos : []).map(Com_s_).filter(function (x) { return x && ComG_verificar_(x, fatos).ok; }).map(function (x) { return Com_texto_(x, 500); });
      if (vt.ok) { saida.texto = Com_texto_(r.json.texto, 4000); saida.origem = 'IA'; }
      else aviso = 'O verificador recusou a leitura escrita pela IA (' + vt.problemas.slice(0, 2).join('; ') + '); vale o texto das regras, com os números do sistema.';
      if (vt.ok && gs.length) saida.gargalos = gs.slice(0, 8);
      if (vt.ok && rs.length) saida.riscos = rs.slice(0, 10);
    }
  }
  var id = ComG_registrar_('LEITURA_FUNIL', saida.origem, eu.id, null, saida.origem, m.f.codigo + ' ' + fatos.periodo, saida, aviso);
  return { sugestaoId: id, leitura: saida, origem: saida.origem, aviso: aviso, tempos: m.tempos, emRisco: m.risco.slice(0, 10),
    lembrete: 'A leitura só aponta: nenhuma oportunidade muda de etapa e nada é enviado ao cliente por ela.' };
}

// ------------------------------------------------------------
// REVISÃO DA PROPOSTA
// ------------------------------------------------------------
/** Regras (sem IA). { erros[] (impedem), alertas[] }. */
function ComG_revisarPropostaRegras_(p) {
  var erros = [], alertas = [], met = Com_metodologia_();
  var itens = Com_json_(p.ITENS_JSON, []), cond = Com_json_(p.CONDICOES_JSON, {}) || {};
  if (!itens.length) erros.push('a proposta não tem itens');
  itens.forEach(function (i, k) {
    if (!(Number(i.quantidade) > 0)) erros.push('o item ' + (k + 1) + ' está com quantidade zero');
    if (!(Number(i.precoUnitario) > 0)) erros.push('o item ' + (k + 1) + ' (' + Com_s_(i.descricao).slice(0, 40) + ') está sem preço');
  });
  var calc = ComP_calcular_(itens, p.DESCONTO_GERAL);
  if (Math.abs(calc.total - (Number(p.TOTAL) || 0)) > 0.01) erros.push('o total gravado não confere com os itens (salve o rascunho de novo)');
  if (!(calc.total > 0)) erros.push('o total da proposta precisa ser maior que zero');
  // 28/10/2026: pelo tipo de orçamento (escolhido pelo vendedor ou automático pelos itens)
  var tipoOrc = typeof ComP_tipoOrcamento_ === 'function' ? ComP_tipoOrcamento_(p, itens).tipo : (itens.some(function (i) { return i.tipo !== 'PRODUTO'; }) ? 'SERVICOS' : 'PRODUTOS');
  var servico = tipoOrc !== 'PRODUTOS';
  // 28/10/2026 (dono): a descrição da proposta fica em branco e só se escreve quando precisar (as cláusulas vão fixas nos
  // termos e condições). Escopo curto deixou de impedir a conclusão: vira alerta.
  var escopo = typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO);
  if (servico && escopo.length < 30) alertas.push('a descrição (escopo) está em branco ou curta: o documento diz "Conforme os itens da tabela"; se o serviço precisa de detalhe (onde, o que o cliente recebe), escreva na descrição');
  var avulsos = itens.filter(function (i) { return !i.produtoId && !i.auto; });
  if (avulsos.length) alertas.push(Com_plural_(avulsos.length, 'item avulso', 'itens avulsos') + ' (fora do catálogo de Produtos e serviços): confira a descrição e o preço' + (avulsos.length <= 3 ? ' (' + avulsos.map(function (i) { return Com_s_(i.descricao).slice(0, 40); }).join('; ') + ')' : ''));
  var acima = itens.filter(function (i) { return i.produtoId && Number(i.precoTabela) > 0 && Number(i.precoUnitario) > Number(i.precoTabela) + 0.004; });
  if (acima.length) alertas.push('preço acima da tabela do catálogo em ' + acima.slice(0, 3).map(function (i) { return (Com_s_(i.codigo) || Com_s_(i.descricao).slice(0, 30)) + ' (tabela ' + Com_moeda_(i.precoTabela) + ', proposta ' + Com_moeda_(i.precoUnitario) + ')'; }).join('; ') + (acima.length > 3 ? ' e mais ' + (acima.length - 3) : ''));
  if (!Com_s_(cond.pagamento)) erros.push('falta a forma de pagamento');
  if (!Com_s_(cond.prazoExecucao)) erros.push('falta o prazo de ' + (tipoOrc === 'MISTO' ? 'execução e de entrega' : servico ? 'execução' : 'entrega'));
  if (servico && !Com_s_(cond.garantia)) alertas.push('a garantia está em branco');
  if (Com_dia_(p.VALIDA_ATE) && Com_dia_(p.VALIDA_ATE) < Com_hoje_()) erros.push('a validade já passou (' + Com_brDia_(p.VALIDA_ATE) + ')');
  var o = SGO_DATA.getById(COM_ABAS.OPORTUNIDADES, Com_s_(p.OPORTUNIDADE_ID));
  if (!o || Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') erros.push('a oportunidade da proposta não está aberta');
  var cli = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, Com_s_(p.CLIENTE_ID)) || {};
  var un = Com_s_(p.UNIDADE_ID) ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, Com_s_(p.UNIDADE_ID)) || {} : {};
  if ((Com_s_(un.CNPJ_UNIDADE) || Com_s_(cli.CNPJ)).replace(/\D/g, '').length !== 14) alertas.push('o cliente está sem CNPJ completo no cadastro (a pasta fica pelo nome e o faturamento vai pedir o CNPJ): complete em Cadastros > Clientes');
  if (!Com_s_(cli.ENDERECO) && !Com_s_(un.ENDERECO)) alertas.push('o cliente está sem endereço no cadastro');
  var ct = Com_s_(p.CONTATO_ID) ? SGO_DATA.getById(COM_ABAS.CONTATOS, Com_s_(p.CONTATO_ID)) : null;
  if (!ct) alertas.push('a proposta não tem contato do cliente (A/C)');
  else if (!Com_s_(ct.EMAIL)) alertas.push('o contato ' + Com_s_(ct.NOME) + ' está sem e-mail: o envio pelo e-mail vai pedir outro endereço');
  // 29/10/2026: especialista em precificação (SGO_Comercial_Precificacao.js): checklist de custos da viagem e do frete,
  // margem depois de impostos e da viagem, benefício do Programa de conduta e desconto sobre o deslocamento
  var xPr = typeof ComPr_daProposta_ === 'function' ? ComPr_daProposta_(p, null, itens) : null;
  var pol = ComP_avaliarPolitica_(calc, Com_s_(p.RESPONSAVEL_ID), met, xPr && xPr.analise);
  if (!pol.dentro && ['APROVADO', 'EXCECAO_GESTAO'].indexOf(Com_up_(p.DESCONTO_SITUACAO)) < 0 && Com_up_(p.SITUACAO) === 'PRONTA') erros.push('a proposta tem ' + pol.motivos.join(' e ') + ' sem aprovação registrada');
  if (xPr) {
    var legado = !Com_s_(p.DESLOCAMENTO_JSON) && Com_up_(p.SITUACAO) !== 'RASCUNHO';
    if (!xPr.checklist.ok) {
      if (legado) alertas.push('proposta concluída antes do checklist de custos da viagem e do frete (29/10/2026): confira se o custo de campo está no preço; numa nova revisão o checklist é cobrado');
      else erros.push('o checklist de custos está incompleto (' + xPr.checklist.faltas.map(function (f) { return f.texto; }).join('; ') + '). Todo custo de campo precisa entrar no preço ou ficar registrado como "não se aplica" com o motivo: preencha "Custos da viagem e do frete" no rascunho');
    }
    var polPr = ComPr_politica_(met);
    ComPr_problemas_(p, polPr, xPr).forEach(function (q) { if (['CHECKLIST', 'VIAGEM_SEM_CALCULO', 'MARGEM_MINIMA'].indexOf(q.regra) < 0) alertas.push(q.texto); });
    if (xPr.analise.semImpostos && Number(p.TOTAL) > 0 && polPr.margemMinPct !== null) alertas.push('a política de precificação ainda não tem o percentual de impostos: a margem está calculada sem impostos (maior do que é)');
  }
  if (calc.itensSemCusto && Number(met.politica.margemMinPct) > 0) alertas.push(Com_plural_(calc.itensSemCusto, 'item sem custo cadastrado ficou fora da conta de margem', 'itens sem custo cadastrado ficaram fora da conta de margem'));
  if (pol.dentro && calc.descontoPct > 0.6 * pol.limite && pol.limite > 0) alertas.push('desconto de ' + Com_pct_(calc.descontoPct) + ' perto do limite: a metodologia pede vender valor técnico, não desconto');
  var outra = Com_ler_(COM_ABAS.PROPOSTAS).filter(function (x) { return Com_s_(x.OPORTUNIDADE_ID) === Com_s_(p.OPORTUNIDADE_ID) && Com_s_(x.ID) !== Com_s_(p.ID) && Com_up_(x.SITUACAO) === 'ENVIADA' && Com_s_(x.NUMERO) !== Com_s_(p.NUMERO); })[0];
  if (outra) alertas.push('já existe a ' + ComP_rotulo_(outra) + ' enviada nesta oportunidade (duas propostas abertas confundem o cliente)');
  var eqsOpo = o ? Com_s_(o.EQUIPAMENTOS_IDS).split(',').filter(Boolean) : [];
  var eqsItens = itens.map(function (i) { return i.equipamentoId; }).filter(Boolean);
  eqsOpo.forEach(function (id) { if (eqsItens.indexOf(id) < 0 && eqsItens.length) alertas.push('um equipamento da oportunidade não aparece em nenhum item'); });
  return { erros: erros.filter(function (x, i, l) { return l.indexOf(x) === i; }), alertas: alertas.filter(function (x, i, l) { return l.indexOf(x) === i; }), calc: calc };
}

/** Revisão completa (regras + comentário da IA, conferido). d: { id } */
function ComG_revisarProposta_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'revisar a proposta');
  var p = ComP_obter_(eu, d && d.id, 'revisar a proposta');
  var r = ComG_revisarPropostaRegras_(p);
  var obs = [], origem = 'REGRAS', aviso = '';
  if (!d || d.comIA !== false) {
    var itens = Com_json_(p.ITENS_JSON, []).map(function (i) { return { tipo: COM_TIPOS_ITEM[i.tipo], descricao: i.descricao, detalhe: i.detalhe, equipamento: i.equipamentoTexto, quantidade: i.quantidade, unidade: i.unidade, precoUnitario: Com_moeda_(i.precoUnitario) }; });
    var fatos = { proposta: ComP_rotulo_(p), titulo: Com_s_(p.TITULO), escopo: (typeof ComP_escopo_ === 'function' ? ComP_escopo_(p) : Com_s_(p.ESCOPO)).slice(0, 3000), itens: itens, condicoes: Com_json_(p.CONDICOES_JSON, {}), total: Com_moeda_(p.TOTAL), desconto: Com_pct_(p.DESCONTO_PCT), validaAte: Com_brDia_(p.VALIDA_ATE), cliente: Com_s_(p.CLIENTE_NOME), unidade: Com_s_(p.UNIDADE_NOME), regras: { erros: r.erros, alertas: r.alertas } };
    var prompt = ComG_regrasPrompt_() + '\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(Com_metodologia_()) + '\n\nPROPOSTA (fatos):\n' + JSON.stringify(fatos) +
      '\n\nTAREFA: revise a proposta antes do envio como gestora comercial: coerência entre escopo e itens, clareza das condições, se a proposta mostra a dor do cliente e o valor técnico, e o que pode gerar dúvida ou objeção. Não repita os erros e alertas já listados pelas regras. ' +
      'Até 5 observações curtas e acionáveis. Formato: {"observacoes":["..."]}';
    var ia = ComG_chamarIA_(prompt, 12288);
    aviso = ia.aviso;
    if (ia.json && Array.isArray(ia.json.observacoes)) {
      var recus = 0;
      ia.json.observacoes.forEach(function (x) { var v = ComG_verificar_(x, fatos); if (v.ok) obs.push(Com_texto_(x, 500)); else recus++; });
      if (obs.length) origem = 'IA';
      if (recus) aviso = Com_plural_(recus, 'observação da IA foi recusada', 'observações da IA foram recusadas') + ' pelo verificador (citavam dado que não está na proposta).';
    }
  }
  var id = ComG_registrar_('REVISAO_PROPOSTA', origem, eu.id, { tipo: 'proposta', id: Com_s_(p.ID) }, origem, ComP_rotulo_(p), { erros: r.erros, alertas: r.alertas, observacoes: obs }, aviso);
  try { if (Com_up_(p.SITUACAO) === 'RASCUNHO' || Com_up_(p.SITUACAO) === 'PRONTA') SGO_DATA.update(COM_ABAS.PROPOSTAS, p.ID, { REVISAO_GESTORA_JSON: JSON.stringify({ em: Com_agora_(), erros: r.erros, alertas: r.alertas, observacoes: obs, origem: origem }) }); } catch (e) {}
  return { sugestaoId: id, erros: r.erros, alertas: r.alertas, observacoes: obs, origem: origem, aviso: aviso,
    message: r.erros.length ? 'A revisão encontrou ' + Com_plural_(r.erros.length, 'problema que impede o envio', 'problemas que impedem o envio') + '.' : 'Nenhum problema que impeça o envio.' };
}

// ------------------------------------------------------------
// ANÁLISE DO MÊS E PERGUNTAS DA GESTÃO
// ------------------------------------------------------------
/** Análise por regras (sempre sai) e, com IA, o texto conferido. { texto, sugestoes[], origem, aviso } */
function ComG_analiseMes_(ind, comIA) {
  var met = Com_metodologia_(), sug = [], par = [];
  par.push('Em ' + RelA4_competencia_(ind.competencia) + ', ' + Com_plural_(ind.ganho.qtd, 'oportunidade foi ganha', 'oportunidades foram ganhas') + ' (' + Com_moeda_(ind.ganho.valor) + ') e ' + Com_plural_(ind.perdido.qtd, 'foi perdida', 'foram perdidas') + ' (' + Com_moeda_(ind.perdido.valor) + '), com conversão de ' + ind.conversaoTxt + ' sobre as oportunidades decididas.');
  par.push('O funil termina o mês com ' + Com_plural_(ind.aberto.qtd, 'oportunidade aberta', 'oportunidades abertas') + ' (' + Com_moeda_(ind.aberto.valor) + ', ponderado ' + Com_moeda_(ind.aberto.ponderado) + '), ' + ind.higieneTxt + ' delas com a próxima ação em dia. Propostas enviadas no mês: ' + ind.propostas.enviadas + '; aprovadas: ' + ind.propostas.aprovadas + '; recusadas: ' + ind.propostas.recusadas + '.');
  var mp = ind.perdasPorMotivo.filter(function (m) { return m.qtd; }).sort(function (a, b) { return b.qtd - a.qtd; });
  if (mp.length) par.push('O principal motivo de perda foi "' + mp[0].motivo + '" (' + mp[0].qtd + ').');
  var preco = mp.filter(function (m) { return /^Preço/.test(m.motivo); })[0];
  if (preco && ind.perdido.qtd && preco.qtd * 10 >= ind.perdido.qtd * 3) sug.push('Perdas por preço passaram de 30%: reforce o valor técnico (custo da parada, risco e prazo de atendimento) antes de falar de desconto.');
  if (mp.some(function (m) { return /acompanhamento/i.test(m.motivo); })) sug.push('Houve perda por falha de acompanhamento: confira a cadência de retorno e as oportunidades paradas na reunião semanal.');
  if (ind.ganho.qtd + ind.perdido.qtd >= 4 && ind.conversao < 25) sug.push('Conversão abaixo de 25%: qualifique (dor, decisor, verba e prazo) antes de enviar proposta.');
  if (ind.higienePct < 90) sug.push('Menos de 90% das oportunidades abertas têm próxima ação em dia: a regra de ouro é 100%.');
  if (ind.aberto.qtd < 5) sug.push('Funil com menos de 5 oportunidades abertas: prospecte contas do perfil atendido todos os dias.');
  if (ind.pedidosSemPassagem) sug.push('Há pedidos aprovados sem passagem aos setores: cobre a passagem no mesmo dia do aceite.');
  if (ind.propostas.vencidas) sug.push(ind.propostas.vencidas + ' proposta(s) venceram sem resposta: o retorno no 2º dia útil depois do envio precisa ser cumprido.');
  var regras = { texto: par.join('\n\n'), sugestoes: sug, origem: 'REGRAS', aviso: '' };
  if (!comIA) return regras;
  var fatos = JSON.parse(JSON.stringify(ind));
  var prompt = ComG_regrasPrompt_() + '\n\nMETODOLOGIA:\n' + ComG_metodologiaTexto_(met) + '\n\nNÚMEROS DO MÊS (só agregados):\n' + JSON.stringify(fatos) +
    '\n\nTAREFA: escreva a análise do mês para a Diretoria em 2 a 4 parágrafos (ganhos, perdas e motivos, funil, cadência, propostas) e até 5 sugestões de ajuste de estratégia para o próximo mês, citando só os números enviados. ' +
    'Formato: {"texto":"parágrafos separados por linha em branco","sugestoes":["..."]}';
  var r = ComG_chamarIA_(prompt, 16384);
  if (!r.json) { regras.aviso = r.aviso; return regras; }
  var vt = ComG_verificar_(r.json.texto, fatos);
  var sOk = (Array.isArray(r.json.sugestoes) ? r.json.sugestoes : []).filter(function (s) { return ComG_verificar_(s, fatos).ok; }).map(function (s) { return Com_texto_(s, 400); });
  if (!vt.ok) return { texto: regras.texto, sugestoes: sOk.length ? sOk : sug, origem: sOk.length ? 'IA' : 'REGRAS', aviso: 'O verificador recusou a análise escrita pela IA (' + vt.problemas.slice(0, 2).join('; ') + '); vale o texto das regras.' };
  return { texto: Com_texto_(r.json.texto, 6000), sugestoes: sOk.length ? sOk : sug, origem: 'IA', aviso: '' };
}

/** Pergunta da gestão sobre o funil, respondida só com os números do sistema. d: { pergunta } */
function ComG_perguntar_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'perguntar à gestora');
  var q = Com_texto_(d && d.pergunta, 500);
  if (q.length < 8) throw new Error('Escreva a pergunta (por exemplo "Quais oportunidades acima de R$ 10 mil estão paradas?")');
  var ind = typeof Com_indicadores_ === 'function' ? Com_indicadores_(Com_hoje_().slice(0, 7)) : {};
  var ctx = ComG_ctx_();
  var abertas = ctx.oportunidades.filter(function (o) { return Com_up_(o.SITUACAO || 'ABERTA') === 'ABERTA'; }).slice(0, 120).map(function (o) {
    var dd = ComOpo_derivados_(o, ctx);
    return { codigo: o.CODIGO, cliente: o.CLIENTE_NOME, vendedor: o.RESPONSAVEL_NOME, funil: o.FUNIL, etapa: dd.etapaNome, valor: Com_moeda_(o.VALOR_ESTIMADO), diasSemContato: dd.diasSemContato, parada: dd.parada, semProximaAcao: dd.semProxima, atrasada: dd.atrasada, origem: o.ORIGEM };
  });
  var props = ctx.propostas.filter(function (p) { return ['ENVIADA', 'AGUARDANDO_APROVACAO', 'PRONTA', 'APROVADA', 'VENCIDA'].indexOf(Com_up_(p.SITUACAO)) >= 0; }).slice(0, 80)
    .map(function (p) { return { numero: ComP_rotulo_(p), cliente: p.CLIENTE_NOME, vendedor: p.RESPONSAVEL_NOME, situacao: COM_SITUACOES_PROP[Com_up_(p.SITUACAO)], total: Com_moeda_(p.TOTAL), desconto: Com_pct_(p.DESCONTO_PCT), validaAte: Com_brDia_(p.VALIDA_ATE) }; });
  var fatos = { hoje: Com_brDia_(Com_hoje_()), indicadoresDoMes: ind, oportunidadesAbertas: abertas, propostas: props };
  var resp = { resposta: '', origem: 'REGRAS', aviso: '', fatos: { abertas: abertas.length, propostas: props.length } };
  var r = ComG_chamarIA_(ComG_regrasPrompt_() + '\n\nFATOS DO SISTEMA:\n' + JSON.stringify(fatos) + '\n\nPERGUNTA DA GESTÃO: ' + q +
    '\n\nTAREFA: responda só com os fatos acima, citando códigos e valores exatamente como aparecem. Se os fatos não bastam para responder, diga isso e o que falta. Formato: {"resposta":"..."}', 12288);
  if (r.json && Com_s_(r.json.resposta)) {
    var v = ComG_verificar_(r.json.resposta, fatos, { livres: 31 });
    if (v.ok) { resp.resposta = Com_texto_(r.json.resposta, 4000); resp.origem = 'IA'; }
    else resp.aviso = 'A resposta da IA foi recusada pelo verificador (' + v.problemas.slice(0, 2).join('; ') + '). Não respondo sem ter certeza: veja os números do Painel comercial.';
  } else resp.aviso = r.aviso || 'Sem a IA, as perguntas livres não são respondidas; os números estão no Painel comercial.';
  ComG_registrar_('PERGUNTA', resp.origem, eu.id, null, resp.origem, q, { resposta: resp.resposta }, resp.aviso);
  return resp;
}
