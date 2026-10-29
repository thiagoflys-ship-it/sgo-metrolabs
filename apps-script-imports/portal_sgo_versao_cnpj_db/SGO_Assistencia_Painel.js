/****************************************************
 * ASSISTÊNCIA TÉCNICA — PENDÊNCIAS, ROTINA, TRANSIÇÃO DO AUVO E CHAMADA ÚNICA DA TELA (21/10/2026)
 *
 * Pendências (central do Início e Caixa de decisões; registradas em SGO_Pendencias_Assistencia.js), pela matriz de avisos:
 *  - triagem por fazer (gestão da área Técnica; P1 crítica), chamado planejado sem agenda, prazo em risco ou estourado,
 *    solicitação de cliente na fila, orçamento parado, série divergente sem conferência: Caixa de decisões da área Técnica;
 *  - O.S. com documentação pendente: o técnico, até completar; passadas 24 horas, também a gestão;
 *  - O.S. em campo sem notícia do aparelho há 4 horas (fila parada no celular): técnico e gestão;
 *  - reclamação: o dono do caso, até resolver; atrasada, a gestão;
 *  - avisos (agendado, reagendado, cancelado...): da própria pessoa, até abrir a Assistência.
 * E-mail e WhatsApp: pelo notificador e pela matriz (eventos AT01 a AT12). WhatsApp só na exceção do chamado P1 ao gestor
 * (expediente, CLT, uma vez por dia) e no resumo do dia; o cliente não recebe WhatsApp enquanto durar o piloto.
 *
 * Rotina (Assistencia_rotinaGatilho, de 15 em 15 minutos; roda de fato a cada hora): relatório A4 das O.S. encerradas que
 * ficaram sem ele, índice do acervo do Auvo por equipamento (um lote por rodada até terminar) e o relatório mensal.
 *
 * Transição do Auvo: os 6 critérios do projeto (seção 4.3). Quando todos estão cumpridos, só o Administrador marca
 * "Auvo desligado" (é um registro; nada é desligado sozinho: a integração com o Auvo continua até alguém desligá-la nela).
 ****************************************************/

var AST_ROTINA_PROP = 'ATEC_ROTINA_ULTIMA';
var AST_FUNCAO_ROTINA = 'Assistencia_rotinaGatilho';
var AST_PEND_TELA = function (mod, id) { return { tipo: 'assistencia', mod: mod, id: id || '' }; };
var AST_SEM_SINC_HORAS = 4;

// ------------------------------------------------------------
// PENDÊNCIAS
// ------------------------------------------------------------
function Assistencia_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  if (typeof Assistencia_registrarTipos_ === 'function') Assistencia_registrarTipos_();
  if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.ast_triagem) return;
  if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(AST_ABAS.CHAMADOS)) return;
  Ast_memoLimpar_();
  var agoraMs = Date.now(), regras = Ast_regras_(), us = Ast_usuarios_(), hoje = Ast_hoje_();
  var triagem = Ast_triagemPara_(us);
  // orçamento vigente de cada chamado (o mais novo que não foi substituído) e o Comercial que acompanha a resposta
  var orcPorChamado = {}, orcCom = null;
  Ast_ler_(AST_ABAS.ORCAMENTOS).forEach(function (o) { if (Ast_up_(o.SITUACAO) !== 'SUBSTITUIDO') orcPorChamado[Ast_s_(o.CHAMADO_ID)] = o; });
  try { orcCom = AstR_comercialPara_(); } catch (eCom) { orcCom = null; }
  Ast_ler_(AST_ABAS.CHAMADOS).forEach(function (c) {
    var s = Ast_up_(c.SITUACAO), num = Ast_s_(c.NUMERO), cli = Ast_s_(c.CLIENTE_NOME).slice(0, 50), p = Ast_up_(c.PRIORIDADE);
    if (AST_TERMINAIS.indexOf(s) >= 0) return;
    var base = { nome: num, publico: 'GESTAO', paraUsuarios: [], responsavel: 'Gestão da área Técnica', clienteId: Ast_s_(c.CLIENTE_ID), extra: { area: 'TECNICA' } };
    if (s === 'ABERTO' || s === 'EM_TRIAGEM') {
      var pt = Ast_ms_(c.PRAZO_TRIAGEM_EM), venc = pt !== null && agoraMs > pt;
      // 27/10/2026: "chamado pendente de triagem" para quem faz a triagem, quem assumiu e a gestão; sem ninguém em N minutos úteis: fila livre
      var est = AstC_estadoTriagem_(c, agoraMs, regras), comQuem = s === 'EM_TRIAGEM' ? (Ast_s_(c.ASSUMIDO_POR_NOME) || Ast_s_(c.TRIAGEM_RESPONSAVEL_NOME)) : '';
      var paraT = triagem.ids.concat(Ast_gestoresTecnica_(us)).concat(s === 'EM_TRIAGEM' && Ast_s_(c.TRIAGEM_RESPONSAVEL_ID) ? [Ast_s_(c.TRIAGEM_RESPONSAVEL_ID)] : []);
      add(Pend_item_('ast_triagem', Object.assign({}, base, { id: 'AST:TRIAGEM:' + c.ID, paraUsuarios: paraT, gravidade: p === 'P1' || venc ? 'CRITICO' : 'ATENCAO', dias: null, vencimento: Ast_br_(c.PRAZO_TRIAGEM_EM),
        titulo: (p === 'P1' ? 'Chamado CRÍTICO pendente de triagem: ' : 'Chamado pendente de triagem: ') + num + ' (' + cli + ')' + (venc ? ': prazo de triagem vencido' : ''),
        detalhe: AST_PRIORIDADES[p] + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO).slice(0, 80) + '. Problema: ' + Ast_s_(c.SINTOMA).slice(0, 160) + ' Prazo da triagem: ' + Ast_br_(c.PRAZO_TRIAGEM_EM) + '.' +
          (comQuem ? ' Assumido por ' + comQuem + (Ast_s_(c.ASSUMIDO_EM) ? ' em ' + Ast_br_(c.ASSUMIDO_EM) : '') + '.' : est.filaLivre ? ' Ninguém assumiu em ' + est.min + ' minutos úteis: está na fila livre.' :
            est.livreEmMs !== null ? ' Se ninguém assumir até ' + Ast_br_(Ast_agora_(est.livreEmMs)) + ', vai para a fila livre.' : ''),
        oQueFazer: 'Abra Assistência técnica > Chamados > Triagem, toque no chamado ' + num + ', toque em "Assumir chamado" (ou já preencha a triagem) e escolha o caminho (remoto, orçamento, peça ou visita).',
        tela: AST_PEND_TELA('assistencia', c.ID), extra: { area: 'TECNICA', prazo: Ast_dia_(c.PRAZO_TRIAGEM_EM) } })));
      if (est.filaLivre) {
        // fila livre: aparece também para os técnicos (qualquer colaborador interno pode assumir pela tela)
        add(Pend_item_('ast_fila_livre', Object.assign({}, base, { id: 'AST:FILA:' + c.ID, publico: 'PESSOA', paraUsuarios: Ast_tecnicos_(us).map(function (t) { return t.id; }), responsavel: 'Qualquer colaborador', gravidade: p === 'P1' ? 'CRITICO' : 'ATENCAO', dias: null,
          titulo: 'Chamado aguardando triagem na fila livre: ' + num + ' (' + cli + ')',
          detalhe: AST_PRIORIDADES[p] + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO).slice(0, 80) + '. Aberto em ' + Ast_br_(c.ABERTO_EM) + '; ninguém assumiu em ' + est.min + ' minutos úteis.',
          oQueFazer: 'Se puder, abra Assistência técnica > Chamados > Fila livre e toque em "Assumir chamado". Se já está em outro atendimento, não precisa fazer nada.', tela: AST_PEND_TELA('assistencia', c.ID) })));
      }
    }
    if (s === 'PLANEJADO' && Ast_s_(c.PECA_DISPONIVEL_EM)) {
      // 22/10/2026 (etapa 3): a peça chegou em Compras e o chamado voltou sozinho: a gestão agenda o retorno
      add(Pend_item_('ast_retorno', Object.assign({}, base, { id: 'AST:RETORNO:' + c.ID, paraUsuarios: triagem.ids, gravidade: p === 'P1' ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: 'Agendar o retorno do chamado ' + num + ' (' + cli + '): peça disponível desde ' + Ast_br_(c.PECA_DISPONIVEL_EM),
        detalhe: 'Peça ' + Ast_s_(c.PECA_DESCRICAO).slice(0, 120) + (Ast_s_(c.REQUISICAO_NUMERO) ? ' (pedido ' + Ast_s_(c.REQUISICAO_NUMERO) + ')' : '') + ' recebida e conferida por Compras. ' + AST_PRIORIDADES[p] + '. O cliente já foi avisado de que a peça chegou.',
        oQueFazer: 'Abra o chamado ' + num + ' em Assistência técnica > Chamados e toque em "Agendar o retorno" (mesma O.S.; o técnico retira a peça com Compras). O cliente recebe a data por e-mail.', tela: AST_PEND_TELA('assistencia', c.ID) })));
    } else if (s === 'PLANEJADO') {
      add(Pend_item_('ast_agendar', Object.assign({}, base, { id: 'AST:AGENDAR:' + c.ID, paraUsuarios: triagem.ids, gravidade: p === 'P1' ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: 'Agendar o atendimento do chamado ' + num + ' (' + cli + ')', detalhe: 'Triagem concluída: falta escolher técnico, data e duração. ' + AST_PRIORIDADES[p] + '.',
        oQueFazer: 'Abra o chamado ' + num + ' em Assistência técnica > Chamados e toque em "Agendar".', tela: AST_PEND_TELA('assistencia', c.ID) })));
    }
    if (p === 'P1' && (s === 'ABERTO' || s === 'EM_TRIAGEM') && !Ast_s_(c.TRIAGEM_FIM_EM)) {
      // 22/10/2026: alerta próprio do P1 sem triagem em 30 minutos (relógio corrido desde a abertura; o P1 não espera o expediente)
      var ab = Ast_ms_(c.ABERTO_EM);
      if (ab !== null && agoraMs - ab > 30 * 60000) {
        add(Pend_item_('ast_p1_triagem', Object.assign({}, base, { id: 'AST:P1:' + c.ID, paraUsuarios: triagem.ids.concat(Ast_diretoria_(us)), gravidade: 'CRITICO', dias: null, vencimento: Ast_br_(c.PRAZO_TRIAGEM_EM),
          titulo: 'Chamado CRÍTICO ' + num + ' (' + cli + ') sem triagem há ' + Ast_duracaoTxt_((agoraMs - ab) / 60000),
          detalhe: 'Aberto em ' + Ast_br_(c.ABERTO_EM) + '. Equipamento: ' + Ast_s_(c.EQUIPAMENTO_TEXTO).slice(0, 80) + '. ' + Ast_s_(c.SINTOMA).slice(0, 160),
          oQueFazer: 'Abra o chamado ' + num + ' em Assistência técnica > Chamados, confirme os sintomas e o risco e escolha o caminho agora (P1 é equipamento parado que afeta o paciente).', tela: AST_PEND_TELA('assistencia', c.ID), extra: { area: 'TECNICA', prazo: hoje } })));
        if (!Ast_s_(c.P1_ALERTA_EM)) {
          try {
            Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { P1_ALERTA_EM: Ast_agora_(agoraMs) });
            Ast_avisar_(triagem.ids.concat(Ast_diretoria_(us)), 'P1_SEM_TRIAGEM', 'Chamado CRÍTICO ' + num + ' sem triagem há mais de 30 minutos', Ast_s_(c.CLIENTE_NOME) + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO).slice(0, 80) + '\nAberto em ' + Ast_br_(c.ABERTO_EM) + '. Faça a triagem agora em Assistência técnica > Chamados.', c.ID, { evento: 'AT02' });
          } catch (eP1) { console.error('Assistência, alerta P1: ' + ((eP1 && eP1.message) || eP1)); }
        }
      }
    }
    var sla = Ast_slaEstado_(c, agoraMs, regras);
    if (sla.estado === 'ESTOURADO' || sla.estado === 'EM_RISCO') {
      add(Pend_item_('ast_sla', Object.assign({}, base, { id: 'AST:SLA:' + c.ID, paraUsuarios: triagem.ids.concat(Ast_s_(c.TECNICO_ID) ? [Ast_s_(c.TECNICO_ID)] : []), gravidade: sla.estado === 'ESTOURADO' ? 'CRITICO' : 'ATENCAO', dias: null, vencimento: Ast_br_(sla.ate),
        titulo: 'Prazo ' + (sla.estado === 'ESTOURADO' ? 'estourado' : 'em risco') + ': chamado ' + num + ' (' + cli + ')', detalhe: sla.texto + '. Situação: ' + (AST_SITUACOES[s] || s) + '. ' + Ast_s_(c.PROXIMA_ACAO),
        oQueFazer: 'Abra o chamado ' + num + ' e resolva o próximo passo: ' + (Ast_s_(c.PROXIMA_ACAO) || 'veja na ficha') + '.', tela: AST_PEND_TELA('assistencia', c.ID), extra: { area: 'TECNICA', prazo: Ast_dia_(sla.ate) } })));
    }
    // 22/10/2026 (etapa 4): o cliente recusou ou pediu ajuste (link, portal ou registro manual): a gestão decide
    var orcAtual = s === 'AGUARDANDO_ORCAMENTO' ? orcPorChamado[Ast_s_(c.ID)] : null, sitOrc = orcAtual ? Ast_up_(orcAtual.SITUACAO) : '';
    if (sitOrc === 'RECUSADO' || sitOrc === 'AJUSTE') {
      var recusa = sitOrc === 'RECUSADO';
      add(Pend_item_(recusa ? 'ast_orc_recusado' : 'ast_orc_ajuste', Object.assign({}, base, { id: 'AST:ORCRESP:' + orcAtual.ID, paraUsuarios: triagem.ids.concat(orcCom ? [orcCom.id] : []), gravidade: 'ATENCAO', dias: null,
        titulo: (recusa ? 'Orçamento recusado pelo cliente: chamado ' : 'Cliente pediu ajuste no orçamento: chamado ') + num + ' (' + cli + ')',
        detalhe: 'Orçamento ' + Ast_s_(orcAtual.NUMERO) + ' rev. ' + (Number(orcAtual.REVISAO) || 0) + ', respondido em ' + Ast_br_(orcAtual.DECIDIDO_EM) + ' por ' + Ast_s_(orcAtual.ACEITE_POR) + '. ' + (recusa ? 'Motivo: ' : 'Ajuste pedido: ') + Ast_s_(orcAtual.DECISAO_TEXTO).slice(0, 220),
        oQueFazer: recusa ? 'Abra o chamado ' + num + ' em Assistência técnica > Chamados e decida: negociar (Nova revisão do orçamento), cobrar a visita ou encerrar o chamado (com o motivo).' : 'Abra o chamado ' + num + ' em Assistência técnica > Chamados > Orçamento, faça a Nova revisão com o ajuste, emita e envie de novo com o link.',
        tela: AST_PEND_TELA('assistencia', c.ID) })));
    } else if (s === 'AGUARDANDO_ORCAMENTO') {
      var desde = Ast_dia_(c.TRIAGEM_FIM_EM) || Ast_dia_(c.ABERTO_EM);
      var parado = typeof Ges_diasUteisEntre_ === 'function' ? Ges_diasUteisEntre_(desde, hoje) : 0;
      if (parado >= 2) add(Pend_item_('ast_orcamento', Object.assign({}, base, { id: 'AST:ORC:' + c.ID, gravidade: 'ATENCAO', dias: null,
        titulo: 'Orçamento parado há ' + parado + ' dias úteis: chamado ' + num + ' (' + cli + ')', detalhe: 'O que orçar: ' + Ast_s_(c.ORCAMENTO_DESCRICAO).slice(0, 200) + '. ' + Ast_s_(c.PROXIMA_ACAO),
        oQueFazer: 'Cobre o Comercial ou registre a resposta do cliente no chamado ' + num + ' (Assistência técnica > Chamados > Orçamento).', tela: AST_PEND_TELA('assistencia', c.ID) })));
    }
  });
  var tecPend = {}, regDoc = Number(regras.docPendenteHoras) || 24;
  Ast_ler_(AST_ABAS.OS).forEach(function (o) {
    var s = Ast_up_(o.SITUACAO), num = Ast_s_(o.NUMERO), tec = Ast_s_(o.TECNICO_ID), cli = Ast_s_(o.CLIENTE_NOME).slice(0, 50);
    if (s === 'DOC_PENDENTE') {
      var desde = Ast_ms_(o.CONCLUIU_EM) || Ast_ms_(o.ATUALIZADO_EM), horas = desde !== null ? (agoraMs - desde) / 3600000 : 0;
      var falta = Ast_s_(o.FALTAS) || AstO_faltas_(o).join('; ');
      add(Pend_item_(horas > regDoc ? 'ast_doc_pendente_gestao' : 'ast_doc_pendente', { id: 'AST:DOC:' + o.ID, nome: num, publico: horas > regDoc ? 'GESTAO' : 'PESSOA', paraUsuarios: [tec], responsavel: Ast_s_(o.TECNICO_NOME), responsavelId: horas > regDoc ? '' : tec,
        gravidade: horas > regDoc ? 'CRITICO' : 'ATENCAO', dias: null, clienteId: Ast_s_(o.CLIENTE_ID),
        titulo: 'Documentação pendente na O.S. ' + num + ' (' + cli + ')' + (horas > regDoc ? ' há mais de ' + regDoc + ' horas' : ''), detalhe: 'Falta: ' + falta.slice(0, 300) + '. Técnico ' + Ast_s_(o.TECNICO_NOME) + '.',
        oQueFazer: 'Complete pelo aplicativo do técnico ou em Assistência técnica > Minhas O.S. > ' + num + '. A O.S. fecha sozinha quando tudo estiver lá.',
        oQueFazerOutro: 'Cobre ' + Ast_s_(o.TECNICO_NOME) + ' ou complete na ficha da O.S. (a gestão pode registrar em nome do técnico).', tela: AST_PEND_TELA('assistencia_os', o.ID), extra: { area: 'TECNICA' } }));
      tecPend[tec] = true;
    }
    if (['NO_LOCAL', 'EM_EXECUCAO'].indexOf(s) >= 0) {
      var ult = Ast_ms_(o.ULTIMA_SINC_EM) || Ast_ms_(o.CHEGOU_EM);
      if (ult !== null && agoraMs - ult > AST_SEM_SINC_HORAS * 3600000 && (typeof SGO_dentroDoExpediente_ !== 'function' || SGO_dentroDoExpediente_(new Date(agoraMs)).dentro)) {
        add(Pend_item_('ast_sem_sinc', { id: 'AST:SINC:' + o.ID, nome: num, publico: 'GESTAO', paraUsuarios: [tec], responsavel: Ast_s_(o.TECNICO_NOME), gravidade: 'ATENCAO', dias: null,
          titulo: 'O.S. ' + num + ' em campo sem notícia do aparelho há mais de ' + AST_SEM_SINC_HORAS + ' horas', detalhe: 'Última atualização: ' + Ast_br_(Ast_agora_(ult)) + '. Pode ser a fila de envios parada no celular (sem internet).',
          oQueFazer: 'No aplicativo do técnico, abra "Envios" com internet e toque em "Enviar agora". Se já terminou, toque em "Concluí".', tela: AST_PEND_TELA('assistencia_os', o.ID), extra: { area: 'TECNICA' } }));
      }
    }
    if (s === 'ENCERRADA' && Ast_s_(o.RELATORIO_PDF_ID) && !Ast_s_(o.ENVIADO_CLIENTE_EM)) {
      // 22/10/2026 (etapa 2): relatório gerado e ainda não enviado ao cliente: o técnico até 1 dia útil; depois, a gestão (Caixa de decisões)
      var diaEnc = Ast_dia_(o.ENCERRADA_EM) || Ast_dia_(o.RELATORIO_EM) || hoje;
      var diasSem = typeof Ges_diasUteisEntre_ === 'function' ? Ges_diasUteisEntre_(diaEnc, hoje) : 0;
      var cobraGestao = diasSem >= 1;
      add(Pend_item_(cobraGestao ? 'ast_sem_envio' : 'ast_enviar_cliente', { id: 'AST:ENVIO:' + o.ID, nome: num, publico: cobraGestao ? 'GESTAO' : 'PESSOA', paraUsuarios: cobraGestao ? triagem.ids.concat(tec ? [tec] : []) : [tec], responsavel: cobraGestao ? 'Gestão da área Técnica' : Ast_s_(o.TECNICO_NOME), responsavelId: cobraGestao ? '' : tec,
        gravidade: cobraGestao ? 'CRITICO' : 'ATENCAO', dias: null, clienteId: Ast_s_(o.CLIENTE_ID),
        titulo: 'Relatório da O.S. ' + num + ' (' + cli + ') ainda não enviado ao cliente' + (cobraGestao ? ' (encerrada há ' + diasSem + ' dia' + (diasSem === 1 ? '' : 's') + ' útil' + (diasSem === 1 ? '' : 'eis') + ')' : ''),
        detalhe: 'O.S. encerrada em ' + Ast_br_(o.ENCERRADA_EM) + '; relatório gerado em ' + Ast_br_(o.RELATORIO_EM) + '. Técnico ' + Ast_s_(o.TECNICO_NOME) + '. O cliente só tem o documento depois do envio.',
        oQueFazer: 'No aplicativo, abra a O.S. encerrada e toque em "Enviar ao cliente por e-mail" (contatos do cadastro). Ou em Assistência técnica > Ordens de serviço > ' + num + ' > Documento e envio > "Enviar ao cliente".',
        oQueFazerOutro: 'Abra Assistência técnica > Ordens de serviço > ' + num + ' > Documento e envio e toque em "Enviar ao cliente" (ou cobre ' + Ast_s_(o.TECNICO_NOME) + ').', tela: AST_PEND_TELA('assistencia_os', o.ID), extra: { area: 'TECNICA' } }));
    }
    if (s === 'ENCERRADA' && Ast_sim_(o.SERIE_DIVERGENTE) && !Ast_s_(o.SERIE_TRATADA_EM)) {
      add(Pend_item_('ast_serie', { id: 'AST:SERIE:' + o.ID, nome: num, publico: 'GESTAO', responsavel: 'Gestão da área Técnica', gravidade: 'ATENCAO', dias: null, clienteId: Ast_s_(o.CLIENTE_ID),
        titulo: 'Série divergente na O.S. ' + num + ' (' + cli + ')', detalhe: 'No local: ' + Ast_s_(o.SERIE_CONFIRMADA) + ' · no cadastro: ' + Ast_s_(o.SERIE_CADASTRO) + '. ' + Ast_s_(o.EQUIPAMENTO_TEXTO).slice(0, 80),
        oQueFazer: 'Confira o equipamento: corrija o cadastro em Cadastros > Equipamentos (se o cadastro estava errado) e marque "Série conferida" na O.S.', tela: AST_PEND_TELA('assistencia_os', o.ID), extra: { area: 'TECNICA' } }));
    }
    if (s === 'AGENDADA' && Ast_dia_(o.AGENDADO_PARA) === hoje && tec && ctx.userId === tec) {
      add(Pend_item_('ast_os_hoje', { id: 'AST:HOJE:' + o.ID, nome: num, publico: 'PESSOA', paraUsuarios: [tec], responsavel: Ast_s_(o.TECNICO_NOME), responsavelId: tec, gravidade: 'INFO', dias: null,
        titulo: 'Atendimento hoje às ' + Ast_hora_(o.AGENDADO_PARA) + ': ' + num + ' (' + cli + ')', detalhe: Ast_s_(o.TIPO_NOME) + ' · ' + Ast_s_(o.EQUIPAMENTO_TEXTO).slice(0, 80) + '. ' + Ast_s_(o.ENDERECO),
        oQueFazer: 'Abra o Meu dia no aplicativo do técnico (ou Assistência técnica > Minhas O.S.).', tela: AST_PEND_TELA('assistencia_os', o.ID) }));
    }
  });
  Ast_ler_(AST_ABAS.SOLICITACOES).forEach(function (s) {
    if (Ast_up_(s.SITUACAO) !== 'NOVA') return;
    add(Pend_item_('ast_solicitacao', { id: 'AST:SOL:' + s.ID, nome: Ast_s_(s.NUMERO), publico: 'GESTAO', paraUsuarios: triagem.ids, responsavel: 'Gestão da área Técnica', gravidade: Ast_up_(s.PARADA) === 'TOTAL' ? 'CRITICO' : 'ATENCAO', dias: null, clienteId: Ast_s_(s.CLIENTE_ID),
      titulo: 'Pedido de atendimento do cliente ' + Ast_s_(s.CLIENTE_NOME).slice(0, 50) + ' (' + (AST_CANAIS[Ast_up_(s.ORIGEM)] || s.ORIGEM) + ')', detalhe: Ast_s_(s.EQUIPAMENTO_TEXTO).slice(0, 80) + '. ' + Ast_s_(s.DESCRICAO).slice(0, 200),
      oQueFazer: 'Abra Assistência técnica > Solicitações dos clientes e toque em "Abrir chamado" (ou descarte com o motivo).', tela: AST_PEND_TELA('assistencia_solicitacoes', s.ID), extra: { area: 'TECNICA' } }));
  });
  // 22/10/2026 (etapa 1): cadastro criado em campo pelo técnico, até a gestão conferir
  if (typeof AstApp_cadastrosCampo_ === 'function') {
    AstApp_cadastrosCampo_().forEach(function (x) {
      add(Pend_item_('ast_cadastro_campo', { id: 'AST:CADCAMPO:' + x.tipo + ':' + x.id, nome: x.texto.slice(0, 40), publico: 'GESTAO', paraUsuarios: triagem.ids, responsavel: 'Gestão da área Técnica', gravidade: 'ATENCAO', dias: null, clienteId: x.clienteId,
        titulo: 'Conferir ' + x.tipoNome + ' criado em campo: ' + x.texto.slice(0, 80), detalhe: 'Criado por ' + x.porNome + ' em ' + x.em + ' pelo aplicativo do técnico. Confira se não é um cadastro repetido e se o vínculo (cliente, unidade) está certo.',
        oQueFazer: 'Abra Assistência técnica > Chamados > "Cadastros criados em campo": confira em Cadastros (Clientes, Unidades, Equipamentos ou Vínculos), corrija se precisar e toque em "Conferido".', tela: AST_PEND_TELA('assistencia', x.id), extra: { area: 'TECNICA' } }));
    });
  }
  Ast_ler_(AST_ABAS.CASOS).forEach(function (k) {
    if (Ast_up_(k.SITUACAO) === 'RESOLVIDO') return;
    var atrasado = Ast_dia_(k.PRAZO) && Ast_dia_(k.PRAZO) < hoje;
    add(Pend_item_('ast_caso', { id: 'AST:CASO:' + k.ID, nome: Ast_s_(k.NUMERO), publico: atrasado ? 'GESTAO' : 'PESSOA', paraUsuarios: [Ast_s_(k.DONO_ID)], responsavel: Ast_s_(k.DONO_NOME), responsavelId: atrasado ? '' : Ast_s_(k.DONO_ID),
      gravidade: atrasado ? 'CRITICO' : 'ATENCAO', dias: null, vencimento: Ast_brDia_(k.PRAZO), clienteId: Ast_s_(k.CLIENTE_ID),
      titulo: (AST_CASO_TIPOS[Ast_up_(k.TIPO)] || 'Caso') + ' ' + Ast_s_(k.NUMERO) + ' de ' + Ast_s_(k.CLIENTE_NOME).slice(0, 50) + (atrasado ? ' com prazo vencido' : ''), detalhe: Ast_s_(k.DESCRICAO).slice(0, 220) + ' Prazo: ' + Ast_brDia_(k.PRAZO) + '.',
      oQueFazer: 'Abra Assistência técnica > Reclamações, registre a causa, a ação e a resposta ao cliente e marque "Resolvido".', tela: AST_PEND_TELA('assistencia_casos', k.ID), extra: { area: 'TECNICA', prazo: Ast_dia_(k.PRAZO) } }));
  });
  if (ctx.userId && !ctx.interno) {
    Ast_ler_(AST_ABAS.AVISOS).forEach(function (v) {
      if (Ast_s_(v.DESTINATARIO_ID) !== ctx.userId || Ast_s_(v.LIDO_EM)) return;
      add(Pend_item_('ast_aviso', { id: 'AST:AVISO:' + v.ID, nome: Ast_s_(v.TITULO).slice(0, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId, gravidade: 'INFO', dias: null,
        titulo: Ast_s_(v.TITULO), detalhe: Ast_s_(v.TEXTO).slice(0, 220), oQueFazer: 'Abra a Assistência técnica: o aviso fica marcado como lido ao aparecer na tela.', tela: AST_PEND_TELA('assistencia', Ast_s_(v.REF_ID)) }));
    });
  }
}

// ------------------------------------------------------------
// ROTINA
// ------------------------------------------------------------
// 27/10/2026: a fila livre da triagem é conferida a cada rodada do gatilho (15 minutos), antes do limite de uma vez por hora do resto
function Assistencia_rotinaGatilho() { try { Ast_memoLimpar_(); AstC_filaLivreVerificar_(); } catch (e) {} try { if (typeof Representacao_rotina_ === 'function') Representacao_rotina_(); } catch (e2) {} return Assistencia_rotina_(new Date(), false); }
function Assistencia_garantirRotina_() {
  var tem = false;
  try { tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === AST_FUNCAO_ROTINA; }); } catch (e) {}
  if (!tem) { try { ScriptApp.newTrigger(AST_FUNCAO_ROTINA).timeBased().everyMinutes(15).create(); } catch (e2) {} }
  return { instalado: true, jaExistia: tem };
}
function Assistencia_rotina_(quando, forcar) {
  var r = {};
  // sem chamado ainda, a rotina só prepara o histórico do Auvo (índice do acervo) e os questionários; o resto fica de fora
  var props = PropertiesService.getScriptProperties(), ultima = Number(props.getProperty(AST_ROTINA_PROP)) || 0, agoraMs = (quando || new Date()).getTime();
  if (!forcar && agoraMs - ultima < 55 * 60 * 1000) return { fora: 'rodou há menos de 1 hora' };
  props.setProperty(AST_ROTINA_PROP, String(agoraMs));
  Ast_memoLimpar_();
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Assistência (' + nome + '): ' + r[nome].erro); } };
  var sis = { id: '', nome: 'Rotina da Assistência', perfil: 'SISTEMA', gestao: true, interno: true };
  passo('relatorios', function () {
    var n = 0;
    Ast_ler_(AST_ABAS.OS).forEach(function (o) { if (n < 3 && Ast_up_(o.SITUACAO) === 'ENCERRADA' && !Ast_s_(o.RELATORIO_PDF_ID)) { AstR_emitirRelatorioOS_(sis, o.ID, {}); n++; } });
    return { gerados: n };
  });
  // os 13 questionários do Auvo viram modelos de checklist assim que a lista de apoio do acervo existir (uma vez; só acrescenta)
  passo('questionarios', function () {
    if (Ast_ler_(AST_ABAS.MODELOS).some(function (m) { return Ast_up_(m.ORIGEM) === 'AUVO'; })) return { fora: 'já importados' };
    if (AstF_listaApoio_('questionarios')) return AstF_importarDoAcervo_(sis, { sistema: true });
    // lista de apoio vazia no acervo: os modelos saem das próprias tarefas copiadas, em lotes (SGO_Assistencia_Questionarios.js)
    var qd = Ast_cfgChave_('QUEST_DERIVA', null);
    if (qd && qd.concluido) return { fora: 'checklists das tarefas do Auvo já montados (rascunho)' };
    return typeof AstQ_derivar_ === 'function' ? AstQ_derivar_(sis, { sistema: true, lote: 60, orcamentoMs: 60000 }).situacao : { fora: 'derivação indisponível' };
  });
  passo('acervo', function () { var e = Ast_cfgChave_('ACERVO_INDICE', null); if (e && e.concluido) return { fora: 'índice concluído' }; return AstF_indexarAcervo_({ lote: 120, orcamentoMs: 90000 }); });
  passo('relatorioMensal', function () { return AstP_relatorioAutomatico_(quando); });
  return r;
}
/** Primeiro dia útil do mês, no expediente: relatório do mês anterior, uma vez (a Diretoria recebe pelo e-mail mensal da Caixa). */
function AstP_relatorioAutomatico_(quando) {
  if (!Ast_regras_().relatorioMensal.ligado) return { fora: 'relatório mensal desligado nas Regras da assistência' };
  var hoje = Ast_hoje_(), cfgExp = Ast_expediente_();
  var primeiro = typeof Ges_ehDiaDoMensal_ === 'function' ? Ges_ehDiaDoMensal_(hoje, cfgExp) : (Number(hoje.slice(8)) <= 3);
  if (!primeiro) return { fora: 'não é o primeiro dia útil do mês' };
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true };
  if (!ex.dentro) return { fora: 'fora do expediente' };
  var m = /^(\d{4})-(\d{2})/.exec(hoje), ano = Number(m[1]), mes = Number(m[2]) - 1;
  if (mes === 0) { ano--; mes = 12; }
  var comp = ano + '-' + Ast_2_(mes), props = PropertiesService.getScriptProperties(), chave = 'ATEC_RELMES_' + comp;
  if (props.getProperty(chave)) return { feito: comp };
  var g = Assistencia_relatorioMes_(comp, 'Rotina automática');
  props.setProperty(chave, g.salvo ? (g.pdfUrl || 'ok') : 'erro');
  Ast_diretoria_().forEach(function (id) { Ast_avisar_(id, 'RELATORIO_MES', 'Relatório mensal da assistência técnica: ' + (typeof RelA4_competencia_ === 'function' ? RelA4_competencia_(comp) : comp), g.salvo ? 'O relatório está em Assistência técnica > Indicadores e segue no e-mail mensal da Diretoria.' : 'Não foi possível salvar o relatório: ' + g.aviso, ''); });
  return { gerado: comp, salvo: g.salvo };
}
/** Usado pelo e-mail mensal da Diretoria (SGO_Gestao_Escada.js): gera uma vez por competência e devolve o link. */
function Assistencia_relatorioMesParaGestao_(comp) {
  var props = PropertiesService.getScriptProperties(), k = 'ATEC_RELMES_' + comp, v = String(props.getProperty(k) || '');
  if (v && v !== 'erro') return { salvo: true, link: v === 'ok' ? '' : v };
  var g = Assistencia_relatorioMes_(comp, 'Rotina automática') || {};
  props.setProperty(k, g.salvo ? (g.pdfUrl || 'ok') : 'erro');
  return { salvo: !!g.salvo, aviso: g.aviso || '', link: g.pdfUrl || '' };
}

// ------------------------------------------------------------
// TRANSIÇÃO DO AUVO (6 critérios do projeto, seção 4.3)
// ------------------------------------------------------------
var AST_CRITERIOS = [
  { k: 'c1', t: 'Cópia do acervo do Auvo com zero faltas (ou faltas aceitas pelo dono) e o backup do acervo conferido' },
  { k: 'c2', t: 'Quatro semanas seguidas com todos os técnicos só no SGO+, sem atendimento perdido' },
  { k: 'c3', t: 'Painel de qualidade, Conduta e Frota mostrando os dados do módulo novo, conferidos pela gestão' },
  { k: 'c4', t: 'Nenhuma O.S. aberta no Auvo, ou cada uma com destino registrado' },
  { k: 'c5', t: 'Pelo menos um atendimento feito sem internet e sincronizado sem perda, conferido' },
  { k: 'c6', t: 'Relatório da O.S. aprovado pela Qualidade e já enviado a clientes reais' }
];
function AstP_transicao_(eu) {
  var t = Ast_cfgChave_('TRANSICAO', {}) || {};
  var conf = t.confirmacoes || {}, destinos = t.destinos || {};
  var agora = Date.now(), d28 = agora - 28 * 864e5;
  var auvo = [], sgo = [];
  try { auvo = SGO_Atendimentos_linhas_({ origem: 'AUVO' }); sgo = SGO_Atendimentos_linhas_({ origem: 'SGO' }); } catch (e) {}
  // 1. acervo
  var rel = null;
  try { rel = typeof AuvoAcervo_lerJson_ === 'function' ? AuvoAcervo_lerJson_(AUVO_ACERVO_CFG.PROP_RELATORIO, null) : null; } catch (e) { rel = null; }
  var zero = !!(rel && rel.conclusao === 'ZERO_FALTAS');
  var c1 = { auto: zero ? 'Relatório de conferência do acervo: zero faltas.' : (rel ? 'Relatório de conferência com faltas: ' + ((rel.arquivos || {}).falhas || 0) + ' arquivo(s) com falha e ' + ((rel.tarefas || {}).faltando || 0) + ' tarefa(s) faltando.' : 'Ainda não há relatório de conferência do acervo (Integração Auvo > Acervo do Auvo).'),
    precisa: zero ? ['backup'] : ['faltasAceitas', 'backup'] };
  // 2. quatro semanas só no SGO+
  var auvo28 = auvo.filter(function (x) { var m = Ast_ms_(x.DATA_TAREFA); return m !== null && m >= d28; }).length, sgo28 = sgo.filter(function (x) { var m = Ast_ms_(x.DATA_TAREFA); return m !== null && m >= d28; }).length;
  var c2 = { auto: auvo28 ? auvo28 + ' tarefa(s) no Auvo nos últimos 28 dias (e ' + sgo28 + ' O.S. no SGO+).' : (sgo28 ? 'Nenhuma tarefa no Auvo nos últimos 28 dias e ' + sgo28 + ' O.S. no SGO+.' : 'Sem O.S. no SGO+ nos últimos 28 dias.'), autoOk: !auvo28 && sgo28 > 0, precisa: ['semPerda'] };
  // 3. painéis
  var c3 = { auto: sgo.length ? sgo.length + ' atendimento(s) do SGO+ já aparecem na fonte única (qualidade, Conduta, Frota, ponto).' : 'Ainda não há O.S. do SGO+ na fonte única.', autoOk: sgo.length > 0, precisa: ['paineis'] };
  // 4. O.S. abertas no Auvo
  var abertasAuvo = auvo.filter(function (x) { return Ast_up_(x.FINALIZADA) !== 'SIM'; });
  var semDestino = abertasAuvo.filter(function (x) { return !destinos[Ast_s_(x.AUVO_TASK_ID)]; });
  var c4 = { auto: abertasAuvo.length ? abertasAuvo.length + ' O.S. aberta(s) no Auvo; ' + semDestino.length + ' sem destino registrado.' : 'Nenhuma O.S. aberta no Auvo.', autoOk: !semDestino.length, precisa: [],
    abertas: semDestino.slice(0, 100).map(function (x) { return { taskId: Ast_s_(x.AUVO_TASK_ID), cliente: Ast_s_(x.CLIENTE_NOME_AUVO), data: Ast_brDia_(x.DATA_TAREFA), tecnico: Ast_s_(x.TECNICO_NOME_AUVO), clienteId: Ast_s_(x.CLIENTE_ID_SGO), link: Ast_s_(x.TASK_URL) }; }) };
  // 5. sem internet
  var offline = 0;
  try {
    var encerradas = {};
    Ast_ler_(AST_ABAS.OS).forEach(function (o) { if (Ast_up_(o.SITUACAO) === 'ENCERRADA') encerradas[Ast_s_(o.ID)] = true; });
    Ast_ler_(AST_ABAS.SYNC).forEach(function (s) { var a = Ast_ms_(s.EM_APARELHO), b = Ast_ms_(s.RECEBIDO_EM); if (Ast_up_(s.RESULTADO) === 'ACEITO' && encerradas[Ast_s_(s.OS_ID)] && a !== null && b !== null && b - a > 15 * 60000) offline++; });
  } catch (e) {}
  var c5 = { auto: offline ? offline + ' evento(s) gravados no aparelho sem internet e recebidos depois, em O.S. encerradas.' : 'Nenhum envio atrasado (sem internet) registrado ainda.', autoOk: offline > 0, precisa: ['offline'] };
  // 6. relatório aprovado e enviado
  var enviados = 0;
  try {
    var pdfs = {};
    Ast_ler_(AST_ABAS.OS).forEach(function (o) { if (Ast_s_(o.RELATORIO_PDF_ID)) pdfs[Ast_s_(o.RELATORIO_PDF_ID)] = true; });
    AstF_lerAba_('DOC_ENVIOS').forEach(function (e) { if (pdfs[Ast_s_(e.ARQUIVO_ID)] && /^(OK|ENVIADO|ENTREGUE)/.test(Ast_up_(e.SITUACAO))) enviados++; });
  } catch (e) {}
  var c6 = { auto: enviados ? enviados + ' envio(s) de relatório da O.S. a clientes.' : 'Nenhum relatório da O.S. enviado a cliente ainda (Enviar ao cliente).', autoOk: enviados > 0, precisa: ['qualidade'] };
  var rotPrecisa = { faltasAceitas: 'Faltas aceitas pelo dono', backup: 'Backup do acervo conferido', semPerda: 'Sem atendimento perdido (confirmado pela gestão)', paineis: 'Painéis conferidos pela gestão', offline: 'Atendimento sem internet conferido', qualidade: 'Relatório aprovado pela Qualidade' };
  var lista = [c1, c2, c3, c4, c5, c6].map(function (c, i) {
    var k = AST_CRITERIOS[i].k;
    var marcas = (c.precisa || []).map(function (p) { var m = conf[p]; return { chave: p, rotulo: rotPrecisa[p], feito: !!m, por: m ? m.por : '', em: m ? Ast_br_(m.em) : '', texto: m ? m.texto : '' }; });
    var autoOk = k === 'c1' ? true : !!c.autoOk;
    var ok = autoOk && marcas.every(function (m) { return m.feito; });
    return { chave: k, titulo: AST_CRITERIOS[i].t, automatico: c.auto, automaticoOk: autoOk, confirmacoes: marcas, cumprido: ok, abertas: c.abertas || null };
  });
  var todos = lista.every(function (c) { return c.cumprido; });
  return { criterios: lista, todosCumpridos: todos, auvoDesligado: t.auvoDesligado || null, podeConfirmar: eu.gestao, podeDesligar: eu.perfil === 'ADMIN' && todos && !t.auvoDesligado,
    assistenciaLigada: Ast_ligada_(), indiceAcervo: Ast_cfgChave_('ACERVO_INDICE', null) };
}
/** Confirmação manual de um item (gestão; faltas aceitas: Diretoria ou o dono). d: { chave, texto, desfazer } */
function AstP_confirmar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'confirmar o critério');
  var chave = Ast_s_(d && d.chave), validas = ['faltasAceitas', 'backup', 'semPerda', 'paineis', 'offline', 'qualidade'];
  if (validas.indexOf(chave) < 0) throw new Error('Não foi possível confirmar: item desconhecido. Atualize a tela');
  if (chave === 'faltasAceitas' && !eu.diretoria) throw new Error('Não foi possível confirmar: aceitar faltas do acervo é decisão do dono (Diretoria). Peça a ele para abrir esta tela');
  var texto = Ast_texto_(d.texto, 500);
  if (!d.desfazer && texto.length < 10) throw new Error('Não foi possível confirmar: escreva o que foi conferido (pelo menos 10 letras). Fica registrado com o seu nome');
  var t = Ast_cfgChave_('TRANSICAO', {}) || {};
  if (t.auvoDesligado) throw new Error('Não foi possível mudar: o Auvo já foi marcado como desligado em ' + Ast_br_(t.auvoDesligado.em));
  t.confirmacoes = t.confirmacoes || {};
  if (d.desfazer) delete t.confirmacoes[chave]; else t.confirmacoes[chave] = { por: eu.nome, porId: eu.id, em: Ast_agora_(), texto: texto };
  Ast_cfgGravar_('TRANSICAO', t, eu, (d.desfazer ? 'Desfez: ' : 'Confirmou: ') + chave + (texto ? ' — ' + texto : ''));
  return { transicao: AstP_transicao_(eu), message: d.desfazer ? 'Confirmação desfeita.' : 'Confirmação registrada.' };
}
/** Destino de uma O.S. aberta no Auvo. d: { taskId, destino: FECHAR_NO_AUVO|RECRIAR|SEM_ATENDIMENTO, texto, clienteId, sintoma } */
function AstP_destinoAuvo_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'registrar o destino da O.S. do Auvo');
  var id = Ast_s_(d && d.taskId), dest = Ast_up_(d && d.destino);
  if (!id) throw new Error('Não foi possível registrar: informe a O.S. do Auvo');
  if (['FECHAR_NO_AUVO', 'RECRIAR', 'SEM_ATENDIMENTO'].indexOf(dest) < 0) throw new Error('Não foi possível registrar: escolha o destino (fechar no Auvo, recriar como chamado no SGO+ ou não houve atendimento)');
  var texto = Ast_texto_(d.texto, 500);
  if (texto.length < 5) throw new Error('Não foi possível registrar: escreva uma observação (pelo menos 5 letras)');
  var t = Ast_cfgChave_('TRANSICAO', {}) || {};
  t.destinos = t.destinos || {};
  var reg = { destino: dest, texto: texto, por: eu.nome, em: Ast_agora_() };
  if (dest === 'RECRIAR') {
    var tarefa = SGO_Atendimentos_linhas_({ origem: 'AUVO' }).filter(function (x) { return Ast_s_(x.AUVO_TASK_ID) === id; })[0] || {};
    var r = AstC_abrir_(eu, { clienteId: Ast_s_(d.clienteId) || Ast_s_(tarefa.CLIENTE_ID_SGO), equipamentoId: (Ast_s_(tarefa.EQUIPAMENTOS_ID_SGO).split(',')[0] || ''), equipNaoIdentificado: !Ast_s_(tarefa.EQUIPAMENTOS_ID_SGO),
      equipamentoDescricao: 'Equipamento da tarefa ' + id + ' do Auvo', sintoma: Ast_texto_(d.sintoma, 1000) || ('Atendimento que estava aberto no Auvo (tarefa ' + id + ', ' + Ast_s_(tarefa.TIPO_TAREFA) + '): ' + texto),
      solicitante: Ast_s_(tarefa.CLIENTE_NOME_AUVO) || 'Cliente', prioridade: 'P3', canal: 'INTERNO', origemRef: 'AUVO ' + id, confirmarDuplicado: true });
    reg.chamado = r.chamado ? r.chamado.numero : '';
  }
  t.destinos[id] = reg;
  Ast_cfgGravar_('TRANSICAO', t, eu, 'Destino da tarefa ' + id + ' do Auvo: ' + dest);
  return { transicao: AstP_transicao_(eu), message: 'Destino registrado para a tarefa ' + id + (reg.chamado ? ': chamado ' + reg.chamado + ' aberto no SGO+.' : '.') };
}
/** Só o Administrador, com os 6 critérios cumpridos. Registro apenas: nada é desligado aqui. */
function AstP_marcarAuvoDesligado_(eu, d) {
  Ast_exigir_(eu, 'ADMIN', 'marcar o Auvo como desligado');
  var tr = AstP_transicao_(eu);
  if (!tr.todosCumpridos) throw new Error('Não foi possível marcar: ainda falta cumprir ' + tr.criterios.filter(function (c) { return !c.cumprido; }).map(function (c) { return '"' + c.titulo + '"'; }).join('; ') + '. Veja cada critério nesta tela');
  var texto = Ast_texto_(d && d.texto, 500);
  if (texto.length < 10) throw new Error('Não foi possível marcar: escreva a decisão (pelo menos 10 letras), por exemplo a data combinada para cancelar o contrato');
  var t = Ast_cfgChave_('TRANSICAO', {}) || {};
  t.auvoDesligado = { por: eu.nome, porId: eu.id, em: Ast_agora_(), texto: texto };
  Ast_cfgGravar_('TRANSICAO', t, eu, 'Auvo marcado como desligado: ' + texto);
  return { transicao: AstP_transicao_(eu), message: 'Registrado: Auvo desligado. Agora desligue os gatilhos em Integração Auvo e cancele o contrato; esta marcação não desliga nada sozinha.' };
}

// ------------------------------------------------------------
// REGRAS DA ASSISTÊNCIA (tela): prazos, contratos, interruptor, tipos e modelos de checklist
// ------------------------------------------------------------
function AstP_regrasTela_(eu, d) {
  d = d || {};
  if (d.salvar) {
    Ast_exigir_(eu, 'REGRAS', 'salvar as regras da assistência');
    var motivo = Ast_texto_(d.motivo, 500);
    if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 10 letras). Cada versão fica no histórico');
    var v = Ast_comTrava_(function () { return Ast_gravarRegras_(d.salvar, eu, motivo); });
    return { regras: Ast_regras_(), message: 'Regras da assistência salvas (versão ' + v + ').' };
  }
  Ast_exigir_(eu, 'INTERNO', 'ver as regras da assistência');
  var versoes = Ast_ler_(AST_ABAS.CONFIG).filter(function (c) { return Ast_s_(c.CHAVE) === 'REGRAS'; }).map(function (c) { return { versao: Number(c.VERSAO), em: Ast_br_(c.ATUALIZADO_EM), por: Ast_s_(c.ATUALIZADO_POR_NOME), motivo: Ast_s_(c.MOTIVO) }; })
    .sort(function (a, b) { return b.versao - a.versao; });
  var us = Ast_usuarios_(), triagem = Ast_triagemPara_(us);
  return { regras: Ast_regras_(), padrao: AST_REGRAS_PADRAO, podeEditar: eu.regras, versoes: versoes, tipos: Ast_tipos_(true), modelos: Ast_modelos_(true), tiposPergunta: AST_TIPOS_PERGUNTA, docsTecnicos: AST_DOCS_TECNICOS,
    tecnicos: Ast_tecnicos_(us).map(function (t) { return { id: t.id, nome: t.nome, perfil: t.perfil, area: t.area }; }),
    triagem: { nome: triagem.nome, motivo: triagem.motivo, ids: triagem.ids, nomes: triagem.ids.map(function (id) { return us[id] ? us[id].nome : id; }), configurado: !!triagem.configurado },
    // 27/10/2026: quem pode ficar com a triagem (equipe interna ativa; cliente e conta do sistema fora)
    internos: Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return u.ativo && !u.cliente && !Ast_ehContaSistema_(u); })
      .map(function (u) { return { id: u.id, nome: u.nome, perfil: u.perfil, area: u.area }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
    clientes: (eu.regras ? Ast_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) { return Ast_up_(c.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (c) { return { id: c.ID, nome: Ast_clienteNome_(c) }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }).slice(0, 3000) : []) };
}
/** Tipo de O.S. (criar ou editar; nunca apaga: inativa). d: { tipo:{ codigo?, nome, grupo, descricao, exige:{...}, modeloCodigo, documentoTecnico, semVisita, ativo }, motivo } */
function AstP_salvarTipo_(eu, d) {
  Ast_exigir_(eu, 'REGRAS', 'salvar o tipo de serviço');
  var t = (d && d.tipo) || {}, motivo = Ast_texto_(d && d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 10 letras). A Qualidade acompanha cada mudança');
  var nome = Ast_texto_(t.nome, 120);
  if (nome.length < 3) throw new Error('Não foi possível salvar: dê um nome ao tipo de serviço');
  var mod = Ast_up_(t.modeloCodigo);
  if (mod && !Ast_modelo_(mod)) throw new Error('Não foi possível salvar: o modelo de checklist escolhido não existe');
  var ex = t.exige || {}, fotos = Math.round(Ast_num_(ex.fotosMin));
  if (!(fotos >= 0 && fotos <= 20)) throw new Error('Não foi possível salvar: o mínimo de fotos vai de 0 a 20');
  var campos = { NOME: nome, GRUPO: ['TECNICO', 'LOGISTICA', 'OUTROS'].indexOf(Ast_up_(t.grupo)) >= 0 ? Ast_up_(t.grupo) : 'OUTROS', DESCRICAO: Ast_texto_(t.descricao, 300),
    EXIGE_RELATO: ex.relato ? 'SIM' : '', EXIGE_ASSINATURA: ex.assinatura ? 'SIM' : '', FOTOS_MIN: fotos, EXIGE_QR_SERIE: ex.qrOuSerie ? 'SIM' : '', EXIGE_CHECKLIST: mod ? 'SIM' : '', MODELO_CODIGO: mod,
    DOCUMENTO_TECNICO: AST_DOCS_TECNICOS[Ast_up_(t.documentoTecnico)] !== undefined ? Ast_up_(t.documentoTecnico) : '', SEM_VISITA: t.semVisita ? 'SIM' : '', ATIVO: t.ativo === false ? 'NAO' : 'SIM',
    ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() };
  var r = Ast_comTrava_(function () {
    var atual = Ast_s_(t.codigo) ? Ast_ler_(AST_ABAS.TIPOS).filter(function (x) { return Ast_up_(x.CODIGO) === Ast_up_(t.codigo); })[0] : null;
    if (atual) { Ast_atualizar_(AST_ABAS.TIPOS, atual.ID, campos); Ast_evento_('REGRAS', 'TIPO:' + atual.CODIGO, 'TIPO', eu, motivo, { de: JSON.stringify(Ast_tipoPublico_(atual).exige), para: JSON.stringify(ex) }); return atual.CODIGO; }
    var codigo = Ast_semAcento_(nome).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'TIPO';
    var ja = {}; Ast_ler_(AST_ABAS.TIPOS).forEach(function (x) { ja[Ast_up_(x.CODIGO)] = true; });
    var base = codigo, n = 2; while (ja[codigo]) codigo = base + '_' + (n++);
    Ast_inserir_(AST_ABAS.TIPOS, Object.assign({ CODIGO: codigo, AUVO_TIPOS: '', ORDEM: 200 }, campos));
    Ast_evento_('REGRAS', 'TIPO:' + codigo, 'TIPO_NOVO', eu, motivo);
    return codigo;
  });
  return { tipos: Ast_tipos_(true), message: 'Tipo de serviço "' + nome + '" salvo. Vale para as próximas O.S.; as já agendadas seguem o que tinham.', codigo: r };
}
/** Modelo de checklist (criar ou nova versão; a versão anterior fica nas O.S. que já usaram). d: { modelo:{ codigo?, nome, perguntas, ativo }, motivo } */
function AstP_salvarModelo_(eu, d) {
  Ast_exigir_(eu, 'REGRAS', 'salvar o modelo de checklist');
  var m = (d && d.modelo) || {}, motivo = Ast_texto_(d && d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 10 letras)');
  var nome = Ast_texto_(m.nome, 150);
  if (nome.length < 3) throw new Error('Não foi possível salvar: dê um nome ao modelo de checklist');
  var perg = Ast_normPerguntas_(m.perguntas);
  if (!perg.length) throw new Error('Não foi possível salvar: o modelo precisa de pelo menos uma pergunta');
  var semOpcoes = perg.filter(function (p) { return (p.tipo === 'OPCAO' || p.tipo === 'MULTIPLA') && (!p.opcoes || p.opcoes.length < 2); })[0];
  if (semOpcoes) throw new Error('Não foi possível salvar: a pergunta "' + semOpcoes.texto + '" precisa de pelo menos duas opções');
  var r = Ast_comTrava_(function () {
    var atual = Ast_s_(m.codigo) ? Ast_ler_(AST_ABAS.MODELOS).filter(function (x) { return Ast_up_(x.CODIGO) === Ast_up_(m.codigo); })[0] : null;
    if (atual) {
      var v = (Number(atual.VERSAO) || 1) + 1;
      Ast_atualizar_(AST_ABAS.MODELOS, atual.ID, { NOME: nome, VERSAO: v, PERGUNTAS_JSON: JSON.stringify(perg), ATIVO: m.ativo === false ? 'NAO' : 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
      Ast_evento_('REGRAS', 'MODELO:' + atual.CODIGO, 'MODELO_VERSAO', eu, motivo, { para: 'versão ' + v, de: Ast_texto_(atual.PERGUNTAS_JSON, 3500) });
      return { codigo: atual.CODIGO, versao: v };
    }
    var codigo = 'MOD_' + (Ast_semAcento_(nome).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 26) || 'NOVO');
    var ja = {}; Ast_ler_(AST_ABAS.MODELOS).forEach(function (x) { ja[Ast_up_(x.CODIGO)] = true; });
    var base = codigo, n = 2; while (ja[codigo]) codigo = base + '_' + (n++);
    Ast_inserir_(AST_ABAS.MODELOS, { CODIGO: codigo, NOME: nome, VERSAO: 1, PERGUNTAS_JSON: JSON.stringify(perg), ORIGEM: 'SGO', ATIVO: 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
    Ast_evento_('REGRAS', 'MODELO:' + codigo, 'MODELO_NOVO', eu, motivo);
    return { codigo: codigo, versao: 1 };
  });
  return { modelos: Ast_modelos_(true), message: 'Modelo "' + nome + '" salvo (versão ' + r.versao + '). As O.S. já agendadas continuam com a versão que tinham.' };
}

// ------------------------------------------------------------
// PORTAL DO CLIENTE (só o cliente logado, só os equipamentos dele)
// ------------------------------------------------------------
function AstP_portal_(eu) {
  Ast_exigir_(eu, 'CLIENTE', 'abrir os seus chamados');
  if (!eu.clienteId) throw new Error('Não foi possível abrir: o seu login não está ligado a um cliente. Fale com a Metrolabs para corrigir o acesso');
  var cid = eu.clienteId, osPorId = Ast_mapa_(AST_ABAS.OS);
  var chamados = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return Ast_s_(c.CLIENTE_ID) === cid; }).sort(function (a, b) { return String(b.ABERTO_EM).localeCompare(String(a.ABERTO_EM)); })
    .map(function (c) { return AstC_publicoCliente_(c, osPorId[Ast_s_(c.OS_ID)]); });
  var pedidos = Ast_ler_(AST_ABAS.SOLICITACOES).filter(function (s) { return Ast_s_(s.CLIENTE_ID) === cid && Ast_up_(s.SITUACAO) === 'NOVA'; })
    .map(function (s) { return { numero: s.NUMERO, equipamentoTexto: s.EQUIPAMENTO_TEXTO, descricao: s.DESCRICAO, em: Ast_br_(s.CRIADO_EM) }; });
  var relatorios = Ast_ler_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.CLIENTE_ID) === cid && Ast_up_(o.SITUACAO) === 'ENCERRADA' && Ast_s_(o.RELATORIO_PDF_URL); })
    .sort(function (a, b) { return String(b.ENCERRADA_EM).localeCompare(String(a.ENCERRADA_EM)); })
    .map(function (o) { return { numero: o.NUMERO, equipamentoTexto: o.EQUIPAMENTO_TEXTO, tipo: o.TIPO_NOME, encerradaEm: Ast_brDia_(o.ENCERRADA_EM), url: o.RELATORIO_PDF_URL }; });
  var equipamentos = Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Ast_s_(e.CLIENTE_ID) === cid && Ast_up_(e.STATUS || 'ATIVO') === 'ATIVO'; })
    .map(function (e) { var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(e.UNIDADE_ID)] || {}; return { id: e.ID, texto: Ast_equipTexto_(e), unidadeId: Ast_s_(e.UNIDADE_ID), unidade: Ast_s_(un.NOME_UNIDADE) }; })
    .sort(function (a, b) { return a.texto.localeCompare(b.texto, 'pt-BR'); });
  var orcamentos = typeof AstL_portalOrcamentos_ === 'function' ? AstL_portalOrcamentos_(eu) : [];
  return { chamados: chamados, pedidos: pedidos, relatorios: relatorios, equipamentos: equipamentos, orcamentos: orcamentos, cliente: Ast_clienteNome_(Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[cid]) };
}

// ------------------------------------------------------------
// CHAMADA ÚNICA DA TELA
// ------------------------------------------------------------
function AstP_inicio_(eu) {
  var base = { nivel: eu.nivel, gestao: eu.gestao, tecnico: eu.tecnico, interno: eu.interno, cliente: eu.cliente, podeRegras: eu.regras, podeExcluir: !!eu.excluir, valores: eu.valores, admin: eu.perfil === 'ADMIN', diretoria: eu.diretoria,
    eu: { id: eu.id, nome: eu.nome }, ligada: Ast_ligada_() };
  if (eu.cliente) return base;
  var us = Ast_usuarios_();
  base.situacoes = AST_SITUACOES; base.osSituacoes = AST_OS_SITUACOES; base.prioridades = AST_PRIORIDADES; base.paradas = AST_PARADA; base.canais = AST_CANAIS; base.acoesTriagem = AST_ACOES_TRIAGEM;
  base.triagemItens = AST_TRIAGEM_ITENS; base.preparo = AST_PREPARO; base.motivosSemAssinatura = AST_MOTIVOS_SEM_ASSINATURA; base.casoTipos = AST_CASO_TIPOS; base.tiposPergunta = AST_TIPOS_PERGUNTA;
  base.tipos = Ast_tipos_(false).map(function (t) { return { codigo: t.codigo, nome: t.nome, grupo: t.grupo, exige: t.exige, documentoTecnico: t.documentoTecnico, semVisita: t.semVisita }; });
  base.tecnicos = Ast_tecnicos_(us).map(function (t) { return { id: t.id, nome: t.nome }; });
  base.triagem = Ast_triagemPara_(us).nome;
  base.duracaoPadrao = Number(Ast_regras_().agenda.duracaoPadraoMin) || 90;
  base.avisos = Ast_ler_(AST_ABAS.AVISOS).filter(function (v) { return Ast_s_(v.DESTINATARIO_ID) === eu.id; }).sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); }).slice(0, 15)
    .map(function (v) { return { titulo: Ast_s_(v.TITULO), texto: Ast_s_(v.TEXTO), em: Ast_br_(v.DATA), novo: !Ast_s_(v.LIDO_EM), refId: Ast_s_(v.REF_ID) }; });
  base.solicitacoesNovas = Ast_ler_(AST_ABAS.SOLICITACOES).filter(function (s) { return Ast_up_(s.SITUACAO) === 'NOVA'; }).length;
  try { base.cadastrosCampo = typeof AstApp_cadastrosCampo_ === 'function' ? AstApp_cadastrosCampo_().length : 0; } catch (e) { base.cadastrosCampo = 0; }
  // 29/10/2026: representadas para o filtro e o selo da lista (módulo Representação)
  try { base.representadas = typeof RepI_representadas_ === 'function' ? RepI_representadas_().map(function (r) { return { id: r.id, nome: r.nome }; }) : []; } catch (e) { base.representadas = []; }
  return base;
}
function AstP_avisosLidos_(eu) {
  var n = 0, agora = Ast_agora_();
  Ast_ler_(AST_ABAS.AVISOS).forEach(function (v) { if (Ast_s_(v.DESTINATARIO_ID) === eu.id && !Ast_s_(v.LIDO_EM)) { SGO_DATA.update(AST_ABAS.AVISOS, v.ID, { LIDO_EM: agora }); n++; } });
  delete AST_MEMO[AST_ABAS.AVISOS];
  if (n && typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  return n;
}
/** Busca no cadastro único (cliente por nome ou CNPJ; unidades e equipamentos do cliente). */
function AstP_buscarCadastro_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'buscar no cadastro');
  d = d || {};
  if (Ast_s_(d.clienteId)) {
    var cid = Ast_s_(d.clienteId);
    return { unidades: Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Ast_s_(u.CLIENTE_ID) === cid && Ast_up_(u.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (u) { return { id: u.ID, nome: Ast_s_(u.NOME_UNIDADE), endereco: Ast_endereco_(u, null) }; }),
      equipamentos: Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Ast_s_(e.CLIENTE_ID) === cid && Ast_up_(e.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (e) { return { id: e.ID, unidadeId: Ast_s_(e.UNIDADE_ID), texto: Ast_equipTexto_(e) }; })
        .sort(function (a, b) { return a.texto.localeCompare(b.texto, 'pt-BR'); }) };
  }
  var termo = Ast_semAcento_(d.termo), dig = Ast_s_(d.termo).replace(/\D/g, '');
  if (termo.length < 2) return { clientes: [] };
  return { clientes: Ast_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) {
    if (Ast_up_(c.STATUS || 'ATIVO') !== 'ATIVO') return false;
    return Ast_semAcento_([c.NOME_FANTASIA, c.RAZAO_SOCIAL].join(' ')).indexOf(termo) >= 0 || (dig.length >= 4 && Ast_s_(c.CNPJ).replace(/\D/g, '').indexOf(dig) >= 0);
  }).slice(0, 25).map(function (c) { return { id: c.ID, nome: Ast_clienteNome_(c), cnpj: Ast_s_(c.CNPJ) }; }) };
}

var AST_ACOES = {
  iniciar: function (eu) { if (!eu.cliente) { AstC_filaLivreVerificar_(); Ast_memoLimpar_(); } var b = AstP_inicio_(eu); if (!eu.cliente) { try { if (eu.gestao) Assistencia_garantirRotina_(); Assistencia_rotina_(new Date(), false); } catch (e) {} } return b; },
  acesso: function (eu) {
    var r = { nivel: eu.nivel, gestao: eu.gestao, tecnico: eu.tecnico, cliente: eu.cliente, podeRegras: eu.regras, podeExcluir: !!eu.excluir, admin: eu.perfil === 'ADMIN', ligada: Ast_ligada_() };
    if (!eu.cliente) { try { r.triagem = AstC_contadorTriagem_(eu); } catch (e) { r.triagem = null; } }
    return r;
  },
  // 27/10/2026: contador do menu (pendentes de triagem e fila livre); confere a fila livre de passagem. Só lê na tela; não redesenha formulário
  contadorTriagem: function (eu) { Ast_exigir_(eu, 'INTERNO', 'ver a fila de triagem'); AstC_filaLivreVerificar_(); Ast_memoLimpar_(); return { triagem: AstC_contadorTriagem_(eu) }; },
  assumir: function (eu, d) { return AstC_assumir_(eu, d); },
  // 27/10/2026: exclusão lógica de chamado de teste ou simulação (Gestor, Diretoria e Administrador), lista dos excluídos e restauração
  previaExclusao: function (eu, d) { return AstC_previaExclusao_(eu, d); },
  excluir: function (eu, d) { return AstC_excluir_(eu, d); },
  excluidos: function (eu, d) { return AstC_excluidos_(eu, d); },
  restaurar: function (eu, d) { return AstC_restaurar_(eu, d); },
  avisosLidos: function (eu) { return { marcados: AstP_avisosLidos_(eu) }; },
  buscarCadastro: function (eu, d) { return AstP_buscarCadastro_(eu, d); },
  // cadastros criados em campo pelo técnico (etapa 1, 22/10/2026): lista e conferência pela gestão
  cadastrosCampo: function (eu) { Ast_exigir_(eu, 'INTERNO', 'ver os cadastros criados em campo'); return { cadastros: AstApp_cadastrosCampo_() }; },
  cadastroConferido: function (eu, d) { return AstApp_cadastroConferido_(eu, d); },
  // chamados
  abrir: function (eu, d) { return AstC_abrir_(eu, d); },
  lista: function (eu, d) { if (!eu.cliente) { AstC_filaLivreVerificar_(); Ast_memoLimpar_(); } return AstC_lista_(eu, d); },
  chamado: function (eu, d) { return AstC_detalhe_(eu, d && d.id); },
  anotar: function (eu, d) { return AstC_anotar_(eu, d); },
  triagem: function (eu, d) { return AstC_triagem_(eu, d); },
  retomar: function (eu, d) { return AstC_retomar_(eu, d); },
  // 22/10/2026: volta à triagem com motivo (documentação pendente ou aguardando peça) e correção do relatório encerrado (revisão com motivo)
  voltarTriagem: function (eu, d) { return AstC_voltarTriagem_(eu, d); },
  corrigirRelatorio: function (eu, d) { return AstR_corrigirRelatorio_(eu, d); },
  enviarRelatorio: function (eu, d) { var r = AstR_enviarRelatorioCliente_(eu, d); return { os: AstO_publico_(r.os, eu), enviado: r.enviado, repetido: r.repetido, message: r.message }; },
  encerrarRemoto: function (eu, d) { return AstC_encerrarRemoto_(eu, d); },
  cancelar: function (eu, d) { return AstC_cancelar_(eu, d); },
  aguardarPeca: function (eu, d) { Ast_exigir_(eu, 'GESTAO', 'marcar aguardando peça'); var c = AstC_obter_(eu, d && d.id, 'marcar aguardando peça'); var r = Ast_comTrava_(function () { return AstC_aguardarPeca_(eu, c, d || {}, {}); }); return { chamado: AstC_publico_(Ast_porId_(AST_ABAS.CHAMADOS, r.ID) || r, eu, Date.now()), message: 'Chamado ' + c.NUMERO + ' aguardando peça; o pedido de compra foi aberto em Compras.' }; },
  solicitar: function (eu, d) { return AstC_solicitar_(eu, d); },
  solicitacoes: function (eu, d) { return AstC_solicitacoes_(eu, d); },
  converter: function (eu, d) { return AstC_converter_(eu, d); },
  descartar: function (eu, d) { return AstC_descartar_(eu, d); },
  complemento: function (eu, d) { return AstC_complemento_(eu, d); },
  representacao: function (eu, d) { return typeof RepI_chamado_ === 'function' ? RepI_chamado_(eu, d) : { representacao: null }; },
  casos: function (eu, d) { return AstC_casos_(eu, d); },
  salvarCaso: function (eu, d) { return AstC_salvarCaso_(eu, d); },
  // agenda
  agendar: function (eu, d) { return AstA_agendar_(eu, d); },
  agenda: function (eu, d) { return AstA_agenda_(eu, d); },
  rota: function (eu, d) { return AstA_rotaDoDia_(eu, d); },
  ordenar: function (eu, d) { return AstA_ordenar_(eu, d); },
  reservarVeiculo: function (eu, d) { return AstA_reservarVeiculo_(eu, d); },
  // O.S.
  listaOs: function (eu, d) { return AstO_lista_(eu, d); },
  os: function (eu, d) { return { os: AstO_publico_(AstO_obter_(eu, d && d.id, 'abrir a O.S.'), eu) }; },
  osEventos: function (eu, d) { return AstO_eventosTela_(eu, d); },
  osFoto: function (eu, d) { var r = AstO_salvarFoto_(eu, d); return { duplicado: r.duplicado, os: AstO_publico_(Ast_porId_(AST_ABAS.OS, d.osId), eu), message: r.duplicado ? 'Esta foto já tinha sido recebida.' : 'Foto recebida.' }; },
  osEncerrar: function (eu, d) { return AstO_encerrar_(eu, d); },
  osDocumento: function (eu, d) { return AstO_ligarDocumento_(eu, d); },
  serieTratada: function (eu, d) {
    Ast_exigir_(eu, 'GESTAO', 'marcar a série como conferida');
    var os = AstO_obter_(eu, d && d.osId, 'marcar a série como conferida'), t = Ast_texto_(d.texto, 500);
    if (t.length < 5) throw new Error('Não foi possível marcar: escreva o que foi feito (ex.: "cadastro corrigido para a série do local")');
    Ast_atualizar_(AST_ABAS.OS, os.ID, { SERIE_TRATADA_EM: Ast_agora_(), SERIE_TRATADA_POR_NOME: eu.nome, SERIE_TRATADA_TEXTO: t });
    Ast_evento_('OS', os.ID, 'SERIE_TRATADA', eu, t, { numero: os.NUMERO });
    return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: 'Série conferida. A pendência sai da Caixa de decisões.' };
  },
  relatorio: function (eu, d) { return AstR_relatorioTela_(eu, d); },
  // orçamento
  salvarOrcamento: function (eu, d) { return AstR_salvarOrcamento_(eu, d); },
  emitirOrcamento: function (eu, d) { return AstR_emitirOrcamento_(eu, d); },
  revisarOrcamento: function (eu, d) { return AstR_revisarOrcamento_(eu, d); },
  decidirOrcamento: function (eu, d) { return AstR_decidirOrcamento_(eu, d); },
  // 22/10/2026 (etapa 4): envio com link de aceite, link para copiar, invalidar e comprovante; o cliente responde no portal
  previaEnvioOrcamento: function (eu, d) { return AstL_previaEnvio_(eu, d); },
  enviarOrcamento: function (eu, d) { return AstL_enviar_(eu, d); },
  orcLinkCopiar: function (eu, d) { return AstL_copiar_(eu, d); },
  orcLinkInvalidar: function (eu, d) { return AstL_invalidar_(eu, d); },
  orcComprovante: function (eu, d) { return AstL_comprovanteDeNovo_(eu, d); },
  responderOrcamento: function (eu, d) { return AstL_responderPortal_(eu, d); },
  // indicadores
  indicadores: function (eu, d) {
    Ast_exigir_(eu, 'INTERNO', 'ver os indicadores');
    var comp = /^\d{4}-\d{2}$/.test(Ast_s_(d && d.competencia)) ? Ast_s_(d.competencia) : Ast_hoje_().slice(0, 7);
    return { indicadores: AstR_indicadores_(comp) };
  },
  relatorioMes: function (eu, d) {
    Ast_exigir_(eu, 'GESTAO', 'gerar o relatório mensal');
    var comp = /^\d{4}-\d{2}$/.test(Ast_s_(d && d.competencia)) ? Ast_s_(d.competencia) : Ast_hoje_().slice(0, 7);
    var g = Assistencia_relatorioMes_(comp, eu.nome);
    return { html: typeof RelA4_injetarAvisos_ === 'function' ? RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_({ salvo: g.salvo, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, aviso: g.salvo ? '' : g.aviso }, [])) : g.html, salvo: g.salvo, pdfUrl: g.pdfUrl };
  },
  historicoEquipamento: function (eu, d) { Ast_exigir_(eu, 'INTERNO', 'ver o histórico'); return { historico: SGO_Atendimentos_doEquipamento_(d && d.equipamentoId, { limite: 60, sessao: eu }) }; },
  arquivosAcervo: function (eu, d) { return AstF_arquivosAcervo_(eu, d && d.taskId); },
  // regras, tipos, modelos e acervo
  regras: function (eu, d) { return AstP_regrasTela_(eu, d); },
  salvarTipo: function (eu, d) { return AstP_salvarTipo_(eu, d); },
  salvarModelo: function (eu, d) { return AstP_salvarModelo_(eu, d); },
  importarAuvo: function (eu) { return AstF_importarDoAcervo_(eu); },
  derivarQuestionarios: function (eu, d) { return AstQ_derivar_(eu, { lote: 60, orcamentoMs: 90000, gerarAgora: !!(d && d.gerarAgora), recomecar: !!(d && d.recomecar) }); },
  ligar: function (eu, d) {
    Ast_exigir_(eu, 'REGRAS', 'ligar ou desligar a Assistência do SGO+');
    var motivo = Ast_texto_(d && d.motivo, 500);
    if (motivo.length < 10) throw new Error('Não foi possível mudar: escreva o motivo (pelo menos 10 letras)');
    var r = Ast_copia_(Ast_regras_()); r.ligada = !!(d && d.ligada);
    Ast_comTrava_(function () { Ast_gravarRegras_(r, eu, (r.ligada ? 'Ligou a Assistência do SGO+: ' : 'Desligou a Assistência do SGO+: ') + motivo); });
    return { ligada: Ast_ligada_(), message: r.ligada ? 'Assistência do SGO+ ligada (uso em paralelo ao Auvo).' : 'Assistência do SGO+ desligada: o aplicativo do técnico para de receber O.S. novas; nada foi apagado.' };
  },
  // transição do Auvo e acervo
  transicao: function (eu) { Ast_exigir_(eu, 'GESTAO', 'ver a transição do Auvo'); return { transicao: AstP_transicao_(eu) }; },
  confirmarCriterio: function (eu, d) { return AstP_confirmar_(eu, d); },
  destinoAuvo: function (eu, d) { return AstP_destinoAuvo_(eu, d); },
  auvoDesligado: function (eu, d) { return AstP_marcarAuvoDesligado_(eu, d); },
  indexarAcervo: function (eu) { Ast_exigir_(eu, 'GESTAO', 'ligar o histórico do Auvo aos equipamentos'); return { indice: AstF_indexarAcervo_({ lote: 150, orcamentoMs: 100000, porNome: eu.nome }) }; },
  revisaoAcervo: function (eu) { return AstF_revisaoAcervo_(eu); },
  // portal do cliente
  portal: function (eu) { return AstP_portal_(eu); }
};
var AST_ACOES_CLIENTE = ['acesso', 'iniciar', 'portal', 'solicitar', 'relatorio', 'avisosLidos', 'responderOrcamento'];
/** Ações que criam trabalho novo e ficam bloqueadas com a Assistência desligada (as de leitura, as regras e o "ligar" continuam). */
var AST_ACOES_DESLIGADA = ['abrir', 'assumir', 'triagem', 'retomar', 'voltarTriagem', 'encerrarRemoto', 'aguardarPeca', 'converter', 'agendar', 'ordenar', 'reservarVeiculo', 'osEventos', 'osFoto', 'osEncerrar', 'salvarOrcamento', 'emitirOrcamento', 'revisarOrcamento', 'decidirOrcamento', 'enviarOrcamento', 'orcLinkCopiar'];
var AST_ACOES_DESLIGADA_NOMES = { abrir: 'abrir o chamado', assumir: 'assumir o chamado', triagem: 'fazer a triagem', retomar: 'liberar o chamado', voltarTriagem: 'voltar o chamado à triagem', encerrarRemoto: 'encerrar o chamado', aguardarPeca: 'marcar aguardando peça', converter: 'converter a solicitação',
  agendar: 'agendar o atendimento', ordenar: 'mudar a ordem do dia', reservarVeiculo: 'reservar o veículo', osEventos: 'registrar o atendimento', osFoto: 'enviar a foto', osEncerrar: 'encerrar a O.S.',
  salvarOrcamento: 'preencher o orçamento', emitirOrcamento: 'emitir o orçamento', revisarOrcamento: 'revisar o orçamento', decidirOrcamento: 'registrar a resposta do cliente', enviarOrcamento: 'enviar o orçamento com o link de aceite', orcLinkCopiar: 'gerar o link de aceite' };

/** google.script.run: Assistencia_api(sessionId, acao, dados). Nunca lança. */
function Assistencia_api(sessionId, acao, dados) {
  try {
    Ast_memoLimpar_();
    var fn = AST_ACOES[Ast_s_(acao)];
    if (!fn) return { ok: false, message: 'Ação da Assistência técnica desconhecida (' + Ast_s_(acao) + '). Atualize a página (F5) e tente de novo.' };
    var eu = Ast_eu_(sessionId);
    if (eu.nivel === 'NENHUM') return { ok: false, semAcesso: true, message: 'Não foi possível abrir: a Assistência técnica é da equipe interna da Metrolabs e dos clientes com acesso ao portal.' };
    if (eu.cliente && AST_ACOES_CLIENTE.indexOf(acao) < 0) return { ok: false, semAcesso: true, message: 'Não foi possível concluir: esta parte da Assistência técnica é da equipe interna. Acompanhe os seus chamados em "Meus chamados".' };
    if (acao !== 'acesso') { try { Ast_garantirAbas_(); Ast_garantirSemente_(); } catch (e) {} }
    // 22/10/2026: o interruptor "Assistência ligada" vale também nas telas internas: desligada, nada novo nasce (chamado, triagem, agenda,
    // registro de campo), mas tudo continua visível; a mensagem diz o porquê e o caminho para religar
    if (!eu.cliente && AST_ACOES_DESLIGADA.indexOf(Ast_s_(acao)) >= 0 && !Ast_ligada_()) {
      return { ok: false, desligada: true, message: 'Não foi possível ' + (AST_ACOES_DESLIGADA_NOMES[Ast_s_(acao)] || 'concluir') + ': a Assistência técnica do SGO+ está desligada pela gestão (Regras da assistência). ' +
        'Os chamados e as O.S. continuam visíveis; nada é apagado. Para religar, o Administrador, a Diretoria ou um gestor abre Assistência técnica > Regras da assistência e toca em "Ligar" (com o motivo). Enquanto isso, o atendimento novo segue pelo Auvo.' };
    }
    var r = fn(eu, dados || {});
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, message: (/^Não foi possível|^Sessão/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  }
}
