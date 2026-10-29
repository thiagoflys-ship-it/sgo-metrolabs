/****************************************************
 * ASSISTÊNCIA TÉCNICA — CHAMADOS (21/10/2026)
 *
 * Abertura: tela interna (telefone, presencial, e-mail recebido), portal do cliente e QR do equipamento (entram numa fila
 * de solicitações; um atendente converte em chamado, para não nascer chamado duplicado ou errado), pedido aprovado do
 * Comercial ("Passar aos setores" para a Técnica). Triagem pela gestão da área Técnica (Caixa de decisões), prazo por
 * prioridade (contrato prevalece), situações com transição controlada no servidor, histórico de tudo, reincidência
 * (mesmo equipamento em 30 dias) e casos (reclamação do cliente com dono e prazo).
 ****************************************************/

function AstC_obter_(eu, id, acao) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, id);
  if (!c) throw new Error('Não foi possível ' + acao + ': o chamado não foi encontrado. Atualize a lista (botão Atualizar) e abra de novo');
  if (!AstC_podeVer_(eu, c)) throw new Error('Não foi possível ' + acao + ': o chamado ' + c.NUMERO + ' é de outro cliente ou de outro técnico. Peça à gestão da área Técnica se precisar dele');
  return c;
}
function AstC_podeVer_(eu, c) {
  if (eu.cliente) return !!eu.clienteId && Ast_s_(c.CLIENTE_ID) === eu.clienteId;
  if (eu.gestao || (eu.interno && !eu.tecnico)) return true;
  if (eu.tecnico) return Ast_s_(c.TECNICO_ID) === eu.id || Ast_s_(c.ABERTO_POR_ID) === eu.id || Ast_s_(c.TRIAGEM_RESPONSAVEL_ID) === eu.id ||
    Ast_s_(c.ASSUMIDO_POR_ID) === eu.id || (function () { var est = AstC_estadoTriagem_(c); return est.filaLivre || (est.pendente && AstC_ehDaTriagem_(eu)); })(); // 27/10/2026: fila livre da triagem
  return false;
}

// ------------------------------------------------------------
// TRIAGEM COM ALERTA E FILA LIVRE (27/10/2026, decisão do dono: "Alerta + fila livre")
// Chamado novo fica reservado para quem faz a triagem (Ast_triagemPara_: Regras da assistência; senão a Caixa de decisões)
// e a gestão é avisada. Passados N minutos úteis (Regras da assistência > Triagem e fila livre; padrão 30) sem ninguém
// assumir, o chamado entra na fila livre: qualquer colaborador interno toca em "Assumir chamado" e faz a triagem. Quem
// assumiu e quando ficam no chamado (ASSUMIDO_*) e no histórico. Começar a triagem também é assumir.
// ------------------------------------------------------------
function AstC_triagemCfg_(regras) {
  var t = ((regras || Ast_regras_()) || {}).triagem || {};
  var min = Number(t.filaLivreMin);
  return { ligada: t.filaLivreLigada !== false, min: min >= 5 ? min : 30 };
}
/** Quem faz a triagem, uma vez por chamada (a lista inteira usa o mesmo). */
function AstC_triagemMemo_() { if (!AST_MEMO.__triagem) AST_MEMO.__triagem = Ast_triagemPara_(); return AST_MEMO.__triagem; }
function AstC_ehDaTriagem_(eu) { return !!(eu && eu.id) && (AstC_triagemMemo_().ids || []).indexOf(Ast_s_(eu.id)) >= 0; }
/** { pendente (aberto e ninguém assumiu), assumido, filaLivre, livreEmMs (quando entra/entrou na fila livre), min, ligada } */
function AstC_estadoTriagem_(c, agoraMs, regras) {
  var s = Ast_up_(c.SITUACAO), cfg = AstC_triagemCfg_(regras);
  var assumido = !!(Ast_s_(c.ASSUMIDO_POR_ID) || Ast_s_(c.ASSUMIDO_POR_NOME));
  var pendente = s === 'ABERTO' && !assumido;
  var ab = Ast_ms_(c.ABERTO_EM);
  var livreEm = pendente && cfg.ligada && ab !== null ? Ast_somarMinUteis_(ab, cfg.min) : null;
  return { pendente: pendente, assumido: assumido, filaLivre: livreEm !== null && (agoraMs || Date.now()) >= livreEm, livreEmMs: livreEm, min: cfg.min, ligada: cfg.ligada };
}
/** Fazer a triagem: gestão; no chamado aberto, quem é da triagem; em triagem, quem assumiu. */
function AstC_podeTriar_(eu, c) {
  if (!eu || eu.cliente || !eu.interno) return false;
  var s = Ast_up_(c.SITUACAO);
  if (s !== 'ABERTO' && s !== 'EM_TRIAGEM') return false;
  if (eu.gestao) return true;
  if (s === 'ABERTO') return AstC_ehDaTriagem_(eu);
  return Ast_s_(c.TRIAGEM_RESPONSAVEL_ID) === eu.id || Ast_s_(c.ASSUMIDO_POR_ID) === eu.id;
}
/** Assumir: gestão e quem é da triagem a qualquer hora; os demais colaboradores internos quando o chamado está na fila livre. */
function AstC_podeAssumir_(eu, c, est) {
  est = est || AstC_estadoTriagem_(c);
  if (!eu || eu.cliente || !eu.interno || !est.pendente) return false;
  return !!eu.gestao || AstC_ehDaTriagem_(eu) || est.filaLivre;
}
/** Por que não pode assumir ou fazer a triagem (o quê, por quê, o que fazer). */
function AstC_motivoReserva_(c, est, acao) {
  var tri = AstC_triagemMemo_(), quem = (tri.nomes || [tri.nome]).filter(Boolean).join(', ') || 'a gestão da área Técnica';
  if (est.pendente && est.livreEmMs !== null) return 'Não foi possível ' + acao + ': o chamado ' + c.NUMERO + ' está reservado para a triagem de ' + quem + ' até ' + Ast_br_(Ast_agora_(est.livreEmMs)) +
    ' (' + est.min + ' minutos úteis depois da abertura). Depois disso, se ninguém assumir, ele entra na fila livre e qualquer colaborador pode assumir. Se é urgente, fale com ' + quem + ' ou com a gestão da área Técnica';
  if (est.pendente) return 'Não foi possível ' + acao + ': a triagem do chamado ' + c.NUMERO + ' é de ' + quem + ' (a fila livre está desligada nas Regras da assistência). Fale com a gestão da área Técnica se precisar';
  return 'Não foi possível ' + acao + ': a triagem do chamado ' + c.NUMERO + ' está com ' + (Ast_s_(c.ASSUMIDO_POR_NOME) || Ast_s_(c.TRIAGEM_RESPONSAVEL_NOME) || 'outra pessoa') +
    (Ast_s_(c.ASSUMIDO_EM) ? ' desde ' + Ast_br_(c.ASSUMIDO_EM) : '') + '. Fale com essa pessoa ou com a gestão da área Técnica';
}
/** Técnicos ativos sem atendimento em andamento agora (não estão a caminho nem no cliente): os "disponíveis" da fila livre. */
function AstC_disponiveis_(us) {
  var ocupados = {};
  Ast_ler_(AST_ABAS.OS).forEach(function (o) { if (['EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO'].indexOf(Ast_up_(o.SITUACAO)) >= 0) ocupados[Ast_s_(o.TECNICO_ID)] = true; });
  return Ast_tecnicos_(us).filter(function (t) { return !ocupados[t.id]; }).map(function (t) { return t.id; });
}
/** Chamado assumido (pela fila livre ou por quem é da triagem): vai a "Em triagem" com quem assumiu. d: { id } */
function AstC_assumir_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'assumir o chamado');
  // quem chegou pela fila livre e encontrou o chamado já assumido por outro colega fica sabendo por quem e quando
  var cx = Ast_porId_(AST_ABAS.CHAMADOS, d && d.id);
  if (cx && !AstC_podeVer_(eu, cx) && Ast_s_(cx.FILA_LIVRE_EM) && Ast_s_(cx.ASSUMIDO_POR_NOME)) throw new Error('Não foi possível assumir: o chamado ' + cx.NUMERO + ' já foi assumido por ' + Ast_s_(cx.ASSUMIDO_POR_NOME) + ' em ' + Ast_br_(cx.ASSUMIDO_EM) + '. Atualize a lista; nada foi alterado');
  var c0 = AstC_obter_(eu, d && d.id, 'assumir o chamado');
  var res = Ast_comTrava_(function () {
    Ast_memoTirar_(AST_ABAS.CHAMADOS);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, c0.ID);
    if (!c) throw new Error('Não foi possível assumir: o chamado não está mais na lista (pode ter sido excluído pela gestão). Atualize a lista');
    var s = Ast_up_(c.SITUACAO), est = AstC_estadoTriagem_(c);
    if (s !== 'ABERTO' || est.assumido) throw new Error('Não foi possível assumir: o chamado ' + c.NUMERO + (s === 'ABERTO' || s === 'EM_TRIAGEM' ? ' já foi assumido por ' + (Ast_s_(c.ASSUMIDO_POR_NOME) || Ast_s_(c.TRIAGEM_RESPONSAVEL_NOME) || 'outra pessoa') +
      (Ast_s_(c.ASSUMIDO_EM) ? ' em ' + Ast_br_(c.ASSUMIDO_EM) : '') : ' já passou da triagem ("' + (AST_SITUACOES[s] || s) + '")') + '. Atualize a lista; nada foi alterado');
    if (!AstC_podeAssumir_(eu, c, est)) throw new Error(AstC_motivoReserva_(c, est, 'assumir'));
    var agora = Ast_agora_(), pelaFila = est.filaLivre && !eu.gestao && !AstC_ehDaTriagem_(eu);
    var novo = AstC_mudar_(eu, c, 'EM_TRIAGEM', { TRIAGEM_RESPONSAVEL_ID: eu.id, TRIAGEM_RESPONSAVEL_NOME: eu.nome, TRIAGEM_INICIO_EM: agora, ASSUMIDO_POR_ID: eu.id, ASSUMIDO_POR_NOME: eu.nome, ASSUMIDO_EM: agora,
      PROXIMA_ACAO: 'Fazer a triagem (assumido por ' + eu.nome + ')' }, 'ASSUMIDO', 'Chamado assumido por ' + eu.nome + (pelaFila ? ' na fila livre' : '') + ' em ' + Ast_br_(agora) + '.');
    return { c: novo, pelaFila: pelaFila };
  });
  if (res.pelaFila) {
    var tri = AstC_triagemMemo_();
    Ast_avisar_(tri.ids, 'TRIAGEM_ASSUMIDA', 'Chamado ' + res.c.NUMERO + ' assumido por ' + eu.nome + ' na fila livre', Ast_s_(res.c.CLIENTE_NOME) + ' · ' + Ast_s_(res.c.EQUIPAMENTO_TEXTO).slice(0, 80) +
      '\nA triagem agora está com ' + eu.nome + '. Nada a fazer; acompanhe em Assistência técnica > Chamados.', res.c.ID, { autorId: eu.id });
  }
  return { chamado: AstC_publico_(res.c, eu, Date.now()), message: 'Você assumiu o chamado ' + res.c.NUMERO + '. Faça a triagem abaixo: confirme os sintomas, o risco e o diagnóstico preliminar e escolha o caminho.' };
}
/**
 * Rotina (de 15 em 15 minutos e a cada abertura da lista): chamado aberto há N minutos úteis sem ninguém assumir entra na
 * fila livre uma vez (FILA_LIVRE_EM); avisa no sistema os técnicos disponíveis, quem faz a triagem e a gestão (AT19; e-mail e
 * WhatsApp só se a matriz de avisos mandar). Nunca lança.
 */
function AstC_filaLivreVerificar_(agoraMs) {
  try {
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(AST_ABAS.CHAMADOS)) return { liberados: 0 };
    if (!Ast_ligada_()) return { liberados: 0, fora: 'Assistência desligada' };
    agoraMs = agoraMs || Date.now();
    var regras = Ast_regras_();
    if (!AstC_triagemCfg_(regras).ligada) return { liberados: 0, fora: 'fila livre desligada' };
    var candidatos = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return !Ast_s_(c.FILA_LIVRE_EM) && AstC_estadoTriagem_(c, agoraMs, regras).filaLivre; });
    if (!candidatos.length) return { liberados: 0 };
    var sis = Ast_sistema_('Rotina da Assistência');
    var feitos = Ast_comTrava_(function () {
      Ast_memoTirar_(AST_ABAS.CHAMADOS);
      var l = [];
      candidatos.forEach(function (c0) {
        var c = Ast_porId_(AST_ABAS.CHAMADOS, c0.ID);
        if (!c || Ast_s_(c.FILA_LIVRE_EM) || !AstC_estadoTriagem_(c, agoraMs, regras).filaLivre) return;
        var campos = { FILA_LIVRE_EM: Ast_agora_(agoraMs), PROXIMA_ACAO: 'Fazer a triagem: chamado na fila livre (qualquer colaborador pode assumir)', ATUALIZADO_EM: Ast_agora_(agoraMs) };
        Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, campos);
        Ast_evento_('CHAMADO', c.ID, 'FILA_LIVRE', sis, 'Ninguém assumiu a triagem em ' + AstC_triagemCfg_(regras).min + ' minutos úteis: o chamado entrou na fila livre (qualquer colaborador pode assumir).', { numero: c.NUMERO });
        l.push(Object.assign({}, c, campos));
      });
      return l;
    });
    if (feitos.length) {
      var us = Ast_usuarios_(), tri = Ast_triagemPara_(us);
      var dest = AstC_disponiveis_(us).concat(tri.ids, Ast_gestoresTecnica_(us), Ast_diretoria_(us));
      feitos.forEach(function (c) {
        Ast_avisar_(dest, 'FILA_LIVRE', 'Chamado aguardando triagem: ' + c.NUMERO + ' (' + Ast_s_(c.CLIENTE_NOME).slice(0, 60) + ')',
          AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO).slice(0, 100) + '\nProblema: ' + Ast_s_(c.SINTOMA).slice(0, 200) +
          '\nAberto em ' + Ast_br_(c.ABERTO_EM) + ' e ainda sem triagem. Ficou disponível para qualquer colaborador: se puder, abra Assistência técnica > Chamados > Triagem e toque em "Assumir chamado". Se já está em outro atendimento, não precisa fazer nada.',
          c.ID, { evento: 'AT19' });
      });
    }
    return { liberados: feitos.length };
  } catch (e) { console.error('Assistência, fila livre da triagem: ' + ((e && e.message) || e)); return { liberados: 0, erro: String((e && e.message) || e) }; }
}
/** Contador de triagem para o menu e a faixa da tela: o que a pessoa pode assumir agora. */
function AstC_contadorTriagem_(eu) {
  var agoraMs = Date.now(), regras = Ast_regras_(), r = { pendentes: 0, filaLivre: 0, paraMim: 0, emTriagemComigo: 0 };
  if (!eu || eu.cliente || !eu.interno) return r;
  Ast_ler_(AST_ABAS.CHAMADOS).forEach(function (c) {
    var est = AstC_estadoTriagem_(c, agoraMs, regras);
    if (est.pendente) { r.pendentes++; if (est.filaLivre) r.filaLivre++; if (AstC_podeAssumir_(eu, c, est)) r.paraMim++; }
    if (Ast_up_(c.SITUACAO) === 'EM_TRIAGEM' && Ast_s_(c.TRIAGEM_RESPONSAVEL_ID) === eu.id) r.emTriagemComigo++;
  });
  r.minutos = AstC_triagemCfg_(regras).min; r.ligada = AstC_triagemCfg_(regras).ligada;
  return r;
}

/** Muda a situação conferindo a tabela de transições, cuida da pausa do prazo e grava o evento. */
function AstC_mudar_(eu, c, para, campos, tipoEvento, texto, extra) {
  var de = Ast_up_(c.SITUACAO);
  if ((AST_TRANSICOES[de] || []).indexOf(para) < 0) {
    throw new Error('Não foi possível mudar o chamado ' + c.NUMERO + ' de "' + (AST_SITUACOES[de] || de) + '" para "' + (AST_SITUACOES[para] || para) + '": esse caminho não é permitido. ' +
      ({ ENCERRADO: 'Chamado encerrado não muda; se o problema voltou, abra um chamado novo (ele aparece como reincidência).', CANCELADO: 'Chamado cancelado não muda; abra um chamado novo.' }[de] || 'Veja na ficha do chamado o próximo passo indicado.'));
  }
  var d = Object.assign({}, campos || {}, { SITUACAO: para, ATUALIZADO_EM: Ast_agora_() });
  var pausaveis = ['AGUARDANDO_CLIENTE', 'AGUARDANDO_PECA'];
  if (pausaveis.indexOf(para) >= 0 && !Ast_s_(c.PAUSA_DESDE)) d.PAUSA_DESDE = Ast_agora_();
  if (pausaveis.indexOf(para) < 0 && Ast_s_(c.PAUSA_DESDE)) {
    if (Ast_sim_(c.PAUSA_PERMITIDA)) d.PAUSA_MIN = (Number(c.PAUSA_MIN) || 0) + Ast_minUteisEntre_(Ast_ms_(c.PAUSA_DESDE), Date.now());
    d.PAUSA_DESDE = '';
  }
  if (['DOC_PENDENTE', 'RESOLVIDO_REMOTO'].indexOf(para) >= 0 && !Ast_s_(c.ATENDIDO_EM)) d.ATENDIDO_EM = (campos && campos.ATENDIDO_EM) || Ast_agora_();
  if (para === 'ENCERRADO') { d.ENCERRADO_EM = Ast_agora_(); if (!Ast_s_(c.ATENDIDO_EM) && !d.ATENDIDO_EM) d.ATENDIDO_EM = Ast_agora_(); }
  Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, d);
  Ast_evento_('CHAMADO', c.ID, tipoEvento || 'SITUACAO', eu, texto || '', Object.assign({ de: AST_SITUACOES[de] || de, para: AST_SITUACOES[para] || para, numero: c.NUMERO, publico: true }, extra || {}));
  var novo = Object.assign({}, c, d);
  if (para === 'ENCERRADO' && typeof AstC_aoEncerrar_ === 'function') { try { AstC_aoEncerrar_(eu, novo); } catch (e) { console.error('Assistência, ao encerrar: ' + ((e && e.message) || e)); } }
  return novo;
}

/** Chamado para a tela (sem valores; o portal do cliente usa AstC_publicoCliente_). */
function AstC_publico_(c, eu, agoraMs, regras) {
  var sla = Ast_slaEstado_(c, agoraMs, regras), s = Ast_up_(c.SITUACAO), est = AstC_estadoTriagem_(c, agoraMs, regras);
  return {
    // 27/10/2026: triagem com fila livre e exclusão de chamado de teste (Gestor, Diretoria e Administrador)
    pendenteTriagem: est.pendente, filaLivre: est.filaLivre, filaLivreAs: est.livreEmMs !== null ? Ast_br_(Ast_agora_(est.livreEmMs)) : '', filaLivreMin: est.min,
    assumidoPor: Ast_s_(c.ASSUMIDO_POR_NOME), assumidoEm: Ast_br_(c.ASSUMIDO_EM), podeAssumir: AstC_podeAssumir_(eu, c, est),
    podeExcluir: !!(eu && eu.excluir), excluido: Ast_excluido_(c), excluidoEm: Ast_br_(c.EXCLUIDO_EM), excluidoPor: Ast_s_(c.EXCLUIDO_POR_NOME), excluidoMotivo: Ast_s_(c.EXCLUIDO_MOTIVO),
    restauradoEm: Ast_br_(c.RESTAURADO_EM), restauradoPor: Ast_s_(c.RESTAURADO_POR_NOME),
    id: Ast_s_(c.ID), numero: Ast_s_(c.NUMERO), situacao: s, situacaoNome: AST_SITUACOES[s] || s, canal: Ast_up_(c.CANAL), canalNome: AST_CANAIS[Ast_up_(c.CANAL)] || Ast_s_(c.CANAL),
    clienteId: Ast_s_(c.CLIENTE_ID), clienteNome: Ast_s_(c.CLIENTE_NOME), unidadeId: Ast_s_(c.UNIDADE_ID), unidadeNome: Ast_s_(c.UNIDADE_NOME),
    equipamentoId: Ast_s_(c.EQUIPAMENTO_ID), equipamentoTexto: Ast_s_(c.EQUIPAMENTO_TEXTO), equipNaoIdentificado: Ast_sim_(c.EQUIP_NAO_IDENTIFICADO),
    solicitante: Ast_s_(c.SOLICITANTE), contato: Ast_s_(c.CONTATO), sintoma: Ast_s_(c.SINTOMA), parada: Ast_up_(c.PARADA), paradaNome: AST_PARADA[Ast_up_(c.PARADA)] || '',
    prioridade: Ast_up_(c.PRIORIDADE), prioridadeNome: AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] || '', tipoCodigo: Ast_up_(c.TIPO_CODIGO), tipoNome: (Ast_tipo_(c.TIPO_CODIGO) || {}).nome || '',
    abertoEm: Ast_br_(c.ABERTO_EM), abertoPor: Ast_s_(c.ABERTO_POR_NOME), sla: sla, slaFonte: Ast_up_(c.SLA_FONTE) === 'CONTRATO' ? 'Contrato do cliente' : 'Prazo padrão',
    prazoTriagem: Ast_br_(c.PRAZO_TRIAGEM_EM), triagemResponsavel: Ast_s_(c.TRIAGEM_RESPONSAVEL_NOME), triagem: Ast_json_(c.TRIAGEM_JSON, {}), acaoDecidida: Ast_up_(c.ACAO_DECIDIDA),
    orientacaoRemota: Ast_s_(c.ORIENTACAO_REMOTA), orcamentoDescricao: Ast_s_(c.ORCAMENTO_DESCRICAO), pecaDescricao: Ast_s_(c.PECA_DESCRICAO),
    requisicaoNumero: Ast_s_(c.REQUISICAO_NUMERO), aguardandoMotivo: Ast_s_(c.AGUARDANDO_MOTIVO), retornoPrevisto: Ast_brDia_(c.RETORNO_PREVISTO),
    tecnicoId: Ast_s_(c.TECNICO_ID), tecnicoNome: Ast_s_(c.TECNICO_NOME), agendadoPara: Ast_br_(c.AGENDADO_PARA), agendadoIso: Ast_iso_(c.AGENDADO_PARA), duracaoMin: Number(c.DURACAO_MIN) || 0,
    osId: Ast_s_(c.OS_ID), osNumero: Ast_s_(c.OS_NUMERO), atendidoEm: Ast_br_(c.ATENDIDO_EM), encerradoEm: Ast_br_(c.ENCERRADO_EM), canceladoMotivo: Ast_s_(c.CANCELADO_MOTIVO),
    reincidente: Ast_sim_(c.REINCIDENTE), reincidenciaDe: Ast_s_(c.REINCIDENCIA_DE), proximaAcao: Ast_s_(c.PROXIMA_ACAO), terminal: AST_TERMINAIS.indexOf(s) >= 0,
    abertaEmCampo: Ast_sim_(c.ABERTA_EM_CAMPO),
    // 29/10/2026: marca da representada (filtro e selo na lista; parte "Representação" na ficha)
    representadaId: Ast_s_(c.REPRESENTADA_ID), representadaNome: Ast_s_(c.REPRESENTADA_NOME), protocoloRepresentada: Ast_s_(c.PROTOCOLO_REPRESENTADA),
    podeTriar: AstC_podeTriar_(eu, c), podeAgendar: !!(eu && eu.gestao) && (s === 'PLANEJADO' || s === 'AGENDADO'),
    podeCancelar: !!(eu && eu.gestao) && (AST_TRANSICOES[s] || []).indexOf('CANCELADO') >= 0,
    // 22/10/2026 (etapa 3): peça disponível em Compras (retorno a agendar), chegada ao local pelo contrato e a volta à triagem da O.S. com documentação pendente
    pecaDisponivelEm: Ast_br_(c.PECA_DISPONIVEL_EM), retornoAAgendar: s === 'PLANEJADO' && !!Ast_s_(c.PECA_DISPONIVEL_EM),
    slaChegada: AstC_slaChegada_(c, agoraMs), podeVoltarTriagem: !!(eu && eu.gestao) && (s === 'DOC_PENDENTE' || s === 'AGUARDANDO_PECA')
  };
}
/** Selo de chegada ao local (só com prazo de chegada no contrato). Usa a chegada da O.S. do chamado. */
function AstC_slaChegada_(c, agoraMs) {
  if (!(Number(c.CHEGADA_MIN_UTEIS) > 0) || typeof Ast_chegadaEstado_ !== 'function') return null;
  var os = Ast_s_(c.OS_ID) ? Ast_porId_(AST_ABAS.OS, c.OS_ID) : null;
  var e = Ast_chegadaEstado_(c, os ? os.CHEGOU_EM : '', agoraMs);
  return e.estado === 'SEM_PRAZO' ? null : { estado: e.estado, ate: Ast_br_(e.ate), texto: e.texto };
}
/** O que o cliente vê no portal: etapa, datas e o relatório emitido; sem técnico interno, sem prazos internos nem valores. */
function AstC_publicoCliente_(c, os) {
  var s = Ast_up_(c.SITUACAO), etapa = 1, nome = 'Recebido';
  AST_ETAPAS_CLIENTE.forEach(function (e) { if (e.situacoes.indexOf(s) >= 0) { etapa = e.etapa; nome = e.nome; } });
  if (s === 'CANCELADO') { etapa = 0; nome = 'Cancelado'; }
  return { id: Ast_s_(c.ID), numero: Ast_s_(c.NUMERO), etapa: etapa, etapaNome: nome, etapas: AST_ETAPAS_CLIENTE.map(function (e) { return e.nome; }),
    equipamentoTexto: Ast_s_(c.EQUIPAMENTO_TEXTO), unidadeNome: Ast_s_(c.UNIDADE_NOME), sintoma: Ast_s_(c.SINTOMA), abertoEm: Ast_br_(c.ABERTO_EM),
    agendadoPara: ['AGENDADO', 'EM_DESLOCAMENTO'].indexOf(s) >= 0 ? Ast_br_(c.AGENDADO_PARA) : '', encerradoEm: Ast_br_(c.ENCERRADO_EM),
    relatorioUrl: os && Ast_up_(os.SITUACAO) === 'ENCERRADA' ? Ast_s_(os.RELATORIO_PDF_URL) : '', osNumero: os && Ast_up_(os.SITUACAO) === 'ENCERRADA' ? Ast_s_(os.NUMERO) : '',
    cancelado: s === 'CANCELADO' };
}

// ------------------------------------------------------------
// ABERTURA
// ------------------------------------------------------------
/** Confere cliente, unidade e equipamento no cadastro único. Devolve { cli, un, eq, texto }. */
function AstC_vinculo_(d, acao) {
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(d.clienteId)];
  if (!cli) throw new Error('Não foi possível ' + acao + ': escolha o cliente na busca "Cliente" (nome ou CNPJ). Se ele não aparece, cadastre em Cadastros > Clientes e volte aqui');
  if (Ast_up_(cli.STATUS || 'ATIVO') === 'INATIVO') throw new Error('Não foi possível ' + acao + ': o cliente ' + Ast_clienteNome_(cli) + ' está inativo no cadastro. Reative em Cadastros > Clientes ou escolha o cadastro certo (Cadastros > Vínculos mostra os repetidos)');
  var eq = null, un = null;
  if (Ast_s_(d.equipamentoId)) {
    eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(d.equipamentoId)];
    if (!eq) throw new Error('Não foi possível ' + acao + ': o equipamento escolhido não está mais no cadastro. Escolha de novo na lista de equipamentos do cliente');
    if (Ast_s_(eq.CLIENTE_ID) !== Ast_s_(cli.ID)) throw new Error('Não foi possível ' + acao + ': o equipamento ' + Ast_equipTexto_(eq) + ' não é do cliente ' + Ast_clienteNome_(cli) + '. Confira o cliente ou corrija o vínculo em Cadastros > Vínculos');
    if (Ast_up_(eq.STATUS || 'ATIVO') === 'INATIVO') throw new Error('Não foi possível ' + acao + ': o equipamento ' + Ast_equipTexto_(eq) + ' está inativo. Reative em Cadastros > Equipamentos antes de abrir o chamado');
  }
  var unId = Ast_s_(d.unidadeId) || (eq ? Ast_s_(eq.UNIDADE_ID) : '');
  if (unId) {
    un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[unId] || null;
    if (un && Ast_s_(un.CLIENTE_ID) && Ast_s_(un.CLIENTE_ID) !== Ast_s_(cli.ID)) throw new Error('Não foi possível ' + acao + ': a unidade escolhida não é do cliente ' + Ast_clienteNome_(cli) + '. Escolha a unidade de novo');
  }
  return { cli: cli, un: un, eq: eq };
}

/**
 * Abre um chamado. d: { clienteId, unidadeId, equipamentoId, equipNaoIdentificado, equipamentoDescricao, sintoma, solicitante, contato, prioridade,
 *   prioridadeMotivo, parada, canal, origemRef, tipoCodigo, confirmarDuplicado, solicitacaoId, propostaId }
 * Devolve { chamado } ou { duplicado:true, message, abertos } (pede confirmação).
 */
function AstC_abrir_(eu, d, opcoes) {
  var o = opcoes || {};
  if (!o.sistema) Ast_exigir_(eu, 'INTERNO', 'abrir o chamado');
  d = d || {};
  var acao = 'abrir o chamado';
  var v = AstC_vinculo_(d, acao);
  var naoId = !v.eq;
  var descEq = Ast_texto_(d.equipamentoDescricao, 300);
  if (naoId && !Ast_sim_(d.equipNaoIdentificado) && !o.sistema) throw new Error('Não foi possível ' + acao + ': escolha o equipamento do cliente na lista ou marque "Equipamento não identificado" e descreva qual é (tipo, marca, setor)');
  if (naoId && descEq.length < 5) throw new Error('Não foi possível ' + acao + ': descreva o equipamento não identificado (tipo, marca, setor; pelo menos 5 letras). A triagem liga ao cadastro depois');
  var sintoma = Ast_texto_(d.sintoma, 3000);
  if (sintoma.length < 10) throw new Error('Não foi possível ' + acao + ': descreva o problema relatado (pelo menos 10 letras). Exemplo: "não aquece, apita erro E04 ao iniciar o ciclo"');
  var solicitante = Ast_texto_(d.solicitante, 120);
  if (solicitante.length < 3) throw new Error('Não foi possível ' + acao + ': informe quem pediu o atendimento (nome do solicitante no cliente)');
  var prioridade = Ast_up_(d.prioridade);
  if (!AST_PRIORIDADES[prioridade]) throw new Error('Não foi possível ' + acao + ': escolha a prioridade (P1 crítica: equipamento parado que afeta o paciente; P2 alta; P3 normal; P4 baixa)');
  var parada = AST_PARADA[Ast_up_(d.parada)] ? Ast_up_(d.parada) : 'NAO';
  var canal = AST_CANAIS[Ast_up_(d.canal)] ? Ast_up_(d.canal) : 'INTERNO';
  var tipo = Ast_s_(d.tipoCodigo) ? Ast_tipo_(d.tipoCodigo) : null;
  if (Ast_s_(d.tipoCodigo) && !tipo) throw new Error('Não foi possível ' + acao + ': o tipo de serviço escolhido não existe mais. Escolha de novo');
  var regras = Ast_regras_();
  var agoraMs = Date.now(), agora = Ast_agora_(agoraMs);
  // mesmo equipamento com chamado em aberto: confirma antes (evita chamado em dobro)
  var todos = Ast_ler_(AST_ABAS.CHAMADOS);
  if (v.eq && !Ast_sim_(d.confirmarDuplicado)) {
    var abertos = todos.filter(function (x) { return Ast_s_(x.EQUIPAMENTO_ID) === Ast_s_(v.eq.ID) && AST_TERMINAIS.indexOf(Ast_up_(x.SITUACAO)) < 0; });
    if (abertos.length) {
      return { duplicado: true, abertos: abertos.map(function (x) { return { id: x.ID, numero: x.NUMERO, situacao: AST_SITUACOES[Ast_up_(x.SITUACAO)] || x.SITUACAO, abertoEm: Ast_br_(x.ABERTO_EM) }; }),
        message: 'Este equipamento já tem chamado em aberto: ' + abertos.map(function (x) { return x.NUMERO + ' (' + (AST_SITUACOES[Ast_up_(x.SITUACAO)] || x.SITUACAO) + ')'; }).join(', ') +
          '. Se é o mesmo problema, acompanhe pelo chamado aberto (registre o contato novo no histórico dele). Se é outro problema, toque em "Abrir mesmo assim".' };
    }
  }
  // reincidência: mesmo equipamento com chamado nos últimos N dias (inclusive encerrados)
  var reinc = null;
  if (v.eq) {
    var limite = agoraMs - (Number(regras.reincidenciaDias) || 30) * 864e5;
    todos.forEach(function (x) {
      if (Ast_s_(x.EQUIPAMENTO_ID) !== Ast_s_(v.eq.ID) || Ast_up_(x.SITUACAO) === 'CANCELADO') return;
      var em = Ast_ms_(x.ABERTO_EM);
      if (em !== null && em >= limite && (!reinc || em > Ast_ms_(reinc.ABERTO_EM))) reinc = x;
    });
  }
  var sla = Ast_slaPara_(v.cli.ID, prioridade, regras);
  var triagem = Ast_triagemPara_();
  var c = Ast_comTrava_(function () {
    var numero = Ast_proximoNumero_('CH', AST_ABAS.CHAMADOS);
    return Ast_inserir_(AST_ABAS.CHAMADOS, {
      NUMERO: numero, SITUACAO: 'ABERTO', CANAL: canal, ORIGEM_REF: Ast_texto_(d.origemRef, 200), CLIENTE_ID: v.cli.ID, CLIENTE_NOME: Ast_clienteNome_(v.cli),
      UNIDADE_ID: v.un ? v.un.ID : '', UNIDADE_NOME: v.un ? Ast_s_(v.un.NOME_UNIDADE) : '', EQUIPAMENTO_ID: v.eq ? v.eq.ID : '',
      EQUIPAMENTO_TEXTO: v.eq ? Ast_equipTexto_(v.eq) : descEq, EQUIP_NAO_IDENTIFICADO: naoId ? 'SIM' : '', SOLICITANTE: solicitante, CONTATO: Ast_texto_(d.contato, 200),
      SINTOMA: sintoma, PARADA: parada, PRIORIDADE: prioridade, PRIORIDADE_MOTIVO: Ast_texto_(d.prioridadeMotivo, 300), TIPO_CODIGO: tipo ? tipo.codigo : '',
      ABERTO_EM: agora, ABERTO_POR_ID: o.sistema ? '' : eu.id, ABERTO_POR_NOME: o.sistema ? (o.porNome || 'Sistema') : eu.nome,
      SLA_FONTE: sla.fonte, SLA_MIN_UTEIS: sla.atendimentoMin, TRIAGEM_MIN_UTEIS: sla.triagemMin, PAUSA_PERMITIDA: sla.pausaPermitida ? 'SIM' : '', PAUSA_DESDE: '', PAUSA_MIN: 0,
      PRAZO_TRIAGEM_EM: Ast_agora_(Ast_somarMinUteis_(agoraMs, sla.triagemMin)), PRAZO_ATENDIMENTO_EM: Ast_agora_(Ast_somarMinUteis_(agoraMs, sla.atendimentoMin)),
      CHEGADA_MIN_UTEIS: sla.chegadaMin || 0, PRAZO_CHEGADA_EM: sla.chegadaMin ? Ast_agora_(Ast_somarMinUteis_(agoraMs, sla.chegadaMin)) : '',
      TRIAGEM_RESPONSAVEL_ID: triagem.id, TRIAGEM_RESPONSAVEL_NOME: triagem.nome, TRIAGEM_JSON: '{}', REINCIDENTE: reinc ? 'SIM' : '', REINCIDENCIA_DE: reinc ? Ast_s_(reinc.NUMERO) : '',
      SOLICITACAO_ID: Ast_s_(d.solicitacaoId), PROPOSTA_ID: Ast_s_(d.propostaId),
      // 29/10/2026 (módulo Representação): chamado nascido de pedido da representada (só pela conversão da solicitação)
      REPRESENTADA_ID: Ast_s_(o.representada && o.representada.id), REPRESENTADA_NOME: Ast_s_(o.representada && o.representada.nome),
      PROTOCOLO_REPRESENTADA: Ast_s_(o.representada && o.representada.protocolo), ENQUADRAMENTO_PRETENDIDO: Ast_s_(o.representada && o.representada.enquadramento), PROXIMA_ACAO: o.campo ? 'Atendimento em campo com ' + eu.nome + ' (triagem feita em campo)' : 'Fazer a triagem (' + (triagem.nome || 'gestão da área Técnica') + ')',
      ABERTA_EM_CAMPO: o.campo ? 'SIM' : '', ATUALIZADO_EM: agora
    });
  });
  Ast_evento_('CHAMADO', c.ID, 'ABERTURA', o.sistema ? { id: '', nome: o.porNome || 'Sistema' } : eu,
    'Chamado aberto (' + AST_CANAIS[canal] + '): ' + sintoma.slice(0, 300) + (reinc ? ' · Reincidência: o equipamento teve o chamado ' + reinc.NUMERO + ' nos últimos ' + regras.reincidenciaDias + ' dias.' : ''),
    { numero: c.NUMERO, publico: true, para: AST_SITUACOES.ABERTO });
  // avisos: quem faz a triagem (matriz AT01; P1 é a exceção do WhatsApp, AT02)
  var tit = (prioridade === 'P1' ? 'Chamado CRÍTICO ' : o.campo ? 'Atendimento aberto em campo ' : 'Chamado novo ') + c.NUMERO + ': ' + Ast_clienteNome_(v.cli);
  var txt = AST_PRIORIDADES[prioridade] + ' · ' + (v.eq ? Ast_equipTexto_(v.eq) : 'equipamento não identificado: ' + descEq) + '\nProblema: ' + sintoma.slice(0, 400) +
    (o.campo ? '\nAberto pelo técnico ' + eu.nome + ' no aplicativo, fora da agenda: a triagem foi feita em campo e a O.S. já está em andamento. Acompanhe em Assistência técnica > Chamados (selo "Aberta em campo").'
      : '\nPrazo de triagem: ' + Ast_br_(c.PRAZO_TRIAGEM_EM) + '. Faça a triagem em Assistência técnica > Chamados (ou pela Caixa de decisões).' +
        (AstC_triagemCfg_(regras).ligada ? ' Se ninguém assumir em ' + AstC_triagemCfg_(regras).min + ' minutos úteis, o chamado entra na fila livre e qualquer colaborador pode assumir.' : ''));
  Ast_avisar_(triagem.ids, 'CHAMADO_NOVO', tit, txt, c.ID, { evento: prioridade === 'P1' && regras.avisos.whatsappP1Gestor ? 'AT02' : 'AT01', autorId: o.sistema ? '' : eu.id });
  if (!o.campo) {
    // 27/10/2026: a gestão (Gestor da área Técnica e Diretoria) também vê o alerta "chamado pendente de triagem" (AT18: só no sistema, salvo a matriz mandar)
    var usA = Ast_usuarios_(), gestA = Ast_gestoresTecnica_(usA).concat(Ast_diretoria_(usA)).filter(function (id) { return triagem.ids.indexOf(id) < 0; });
    Ast_avisar_(gestA, 'TRIAGEM_PENDENTE', 'Chamado pendente de triagem: ' + c.NUMERO + ' (' + Ast_clienteNome_(v.cli) + ')',
      AST_PRIORIDADES[prioridade] + ' · ' + (v.eq ? Ast_equipTexto_(v.eq) : descEq) + '\nA triagem é de ' + (triagem.nome || 'ninguém definido') + ' (prazo ' + Ast_br_(c.PRAZO_TRIAGEM_EM) + ').' +
      ' Acompanhe em Assistência técnica > Chamados > Triagem; a gestão pode assumir a qualquer momento.', c.ID, { evento: 'AT18', autorId: o.sistema ? '' : eu.id });
  }
  if (canal === 'PORTAL' || canal === 'QR' || canal === 'EMAIL' || canal === 'TELEFONE') {
    Ast_avisarCliente_(c, 'Recebemos o seu chamado ' + c.NUMERO, 'Olá. Registramos o seu pedido de atendimento técnico ' + c.NUMERO + ' (' + (v.eq ? Ast_equipTexto_(v.eq) : descEq) + ').\nProblema informado: ' +
      sintoma.slice(0, 300) + '\nNossa equipe técnica vai analisar e retornar com o agendamento. Acompanhe pelo portal do cliente do SGO+.\n\nMetrolabs — Assistência técnica', 'AT08');
  }
  return { chamado: AstC_publico_(c, eu, Date.now(), regras), message: 'Chamado ' + c.NUMERO + ' aberto. ' + (triagem.nome ? 'A triagem é de ' + triagem.nome + ' (prazo ' + Ast_br_(c.PRAZO_TRIAGEM_EM) + ').' : 'Defina quem faz a triagem em Regras da assistência > Triagem e fila livre (ou o responsável da área Técnica em Caixa de decisões > Regras e responsáveis).') +
    (reinc ? ' Atenção: reincidência do chamado ' + reinc.NUMERO + '.' : '') };
}

/** Registro de contato no histórico (ligação do cliente, e-mail, observação). */
function AstC_anotar_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'registrar no histórico');
  var c = AstC_obter_(eu, d && d.id, 'registrar no histórico');
  var t = Ast_texto_(d.texto, 2000);
  if (t.length < 5) throw new Error('Não foi possível registrar: escreva o que aconteceu (pelo menos 5 letras)');
  Ast_evento_('CHAMADO', c.ID, 'NOTA', eu, t, { numero: c.NUMERO, publico: !!d.publico });
  return { message: 'Registrado no histórico do chamado ' + c.NUMERO + '.' };
}

// ------------------------------------------------------------
// TRIAGEM (gestão da área Técnica)
// ------------------------------------------------------------
/**
 * d: { id, checklist:{...}, prioridade, prioridadeMotivo, equipamentoId, tipoCodigo, acao, orientacao, orcamentoDescricao, pecaDescricao, pecaCodigo, pecaQuantidade, observacao }
 * Sem acao: só grava o checklist (e começa a triagem). Com acao: confere o mínimo e decide o caminho.
 */
function AstC_triagem_(eu, d) {
  // 27/10/2026: além da gestão, faz a triagem quem é da triagem (Regras da assistência) e quem assumiu o chamado na fila livre
  if (!eu || eu.cliente || !eu.interno) Ast_exigir_(eu || {}, 'GESTAO', 'fazer a triagem');
  d = d || {};
  var c = AstC_obter_(eu, d.id, 'fazer a triagem');
  var s = Ast_up_(c.SITUACAO);
  if (s !== 'ABERTO' && s !== 'EM_TRIAGEM') throw new Error('Não foi possível fazer a triagem: o chamado ' + c.NUMERO + ' já passou da triagem ("' + (AST_SITUACOES[s] || s) + '"). Siga pelo próximo passo indicado na ficha');
  if (!AstC_podeTriar_(eu, c)) {
    var est = AstC_estadoTriagem_(c);
    if (est.pendente && est.filaLivre) throw new Error('Não foi possível fazer a triagem: o chamado ' + c.NUMERO + ' está na fila livre. Toque em "Assumir chamado" primeiro (fica registrado que você assumiu e quando); depois preencha a triagem');
    throw new Error(AstC_motivoReserva_(c, est, 'fazer a triagem'));
  }
  return Ast_comTrava_(function () {
    if (s === 'ABERTO') {
      var agoraT = Ast_agora_();
      // começar a triagem é assumir o chamado (quem e quando ficam registrados)
      c = AstC_mudar_(eu, c, 'EM_TRIAGEM', { TRIAGEM_RESPONSAVEL_ID: eu.id, TRIAGEM_RESPONSAVEL_NOME: eu.nome, TRIAGEM_INICIO_EM: agoraT, PROXIMA_ACAO: 'Concluir a triagem e decidir o caminho',
        ASSUMIDO_POR_ID: Ast_s_(c.ASSUMIDO_POR_ID) || eu.id, ASSUMIDO_POR_NOME: Ast_s_(c.ASSUMIDO_POR_NOME) || eu.nome, ASSUMIDO_EM: Ast_s_(c.ASSUMIDO_EM) || agoraT }, 'TRIAGEM_INICIADA', 'Triagem iniciada (chamado assumido) por ' + eu.nome);
    }
    var ck = Ast_json_(c.TRIAGEM_JSON, {}), entrada = d.checklist || {}, mudou = false;
    AST_TRIAGEM_ITENS.forEach(function (it) { if (entrada[it.k] !== undefined) { var v = Ast_texto_(entrada[it.k], 1000); if (v !== (ck[it.k] || '')) { ck[it.k] = v; mudou = true; } } });
    var extra = {};
    if (mudou) extra.TRIAGEM_JSON = JSON.stringify(ck);
    if (Ast_s_(d.equipamentoId) && Ast_s_(d.equipamentoId) !== Ast_s_(c.EQUIPAMENTO_ID)) {
      var v = AstC_vinculo_({ clienteId: c.CLIENTE_ID, equipamentoId: d.equipamentoId }, 'ligar o equipamento');
      extra.EQUIPAMENTO_ID = v.eq.ID; extra.EQUIPAMENTO_TEXTO = Ast_equipTexto_(v.eq); extra.EQUIP_NAO_IDENTIFICADO = '';
      if (!Ast_s_(c.UNIDADE_ID) && v.un) { extra.UNIDADE_ID = v.un.ID; extra.UNIDADE_NOME = Ast_s_(v.un.NOME_UNIDADE); }
      Ast_evento_('CHAMADO', c.ID, 'EQUIPAMENTO', eu, 'Equipamento ligado na triagem: ' + extra.EQUIPAMENTO_TEXTO, { numero: c.NUMERO, de: Ast_s_(c.EQUIPAMENTO_TEXTO), para: extra.EQUIPAMENTO_TEXTO });
    }
    var p = Ast_up_(d.prioridade);
    if (p && AST_PRIORIDADES[p] && p !== Ast_up_(c.PRIORIDADE)) {
      var mot = Ast_texto_(d.prioridadeMotivo, 500);
      if (mot.length < 5) throw new Error('Não foi possível mudar a prioridade: escreva o motivo (pelo menos 5 letras). O prazo do chamado muda junto');
      var sla = Ast_slaPara_(c.CLIENTE_ID, p);
      var ab = Ast_ms_(c.ABERTO_EM);
      Object.assign(extra, { PRIORIDADE: p, PRIORIDADE_MOTIVO: mot, SLA_FONTE: sla.fonte, SLA_MIN_UTEIS: sla.atendimentoMin, TRIAGEM_MIN_UTEIS: sla.triagemMin, PAUSA_PERMITIDA: sla.pausaPermitida ? 'SIM' : '',
        PRAZO_TRIAGEM_EM: Ast_agora_(Ast_somarMinUteis_(ab, sla.triagemMin)), PRAZO_ATENDIMENTO_EM: Ast_agora_(Ast_somarMinUteis_(ab, sla.atendimentoMin)),
        CHEGADA_MIN_UTEIS: sla.chegadaMin || 0, PRAZO_CHEGADA_EM: sla.chegadaMin ? Ast_agora_(Ast_somarMinUteis_(ab, sla.chegadaMin)) : '' });
      Ast_evento_('CHAMADO', c.ID, 'PRIORIDADE', eu, mot, { numero: c.NUMERO, de: Ast_up_(c.PRIORIDADE), para: p });
    }
    if (Ast_s_(d.tipoCodigo)) {
      var t = Ast_tipo_(d.tipoCodigo);
      if (!t) throw new Error('Não foi possível salvar a triagem: o tipo de serviço escolhido não existe mais. Escolha de novo');
      extra.TIPO_CODIGO = t.codigo;
    }
    if (Object.keys(extra).length) { extra.ATUALIZADO_EM = Ast_agora_(); Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, extra); c = Object.assign({}, c, extra); }
    if (mudou) Ast_evento_('CHAMADO', c.ID, 'TRIAGEM_CHECKLIST', eu, 'Checklist da triagem atualizado', { numero: c.NUMERO });
    var acao = Ast_up_(d.acao);
    if (!acao) return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Triagem salva. Quando terminar, escolha o caminho e toque em "Concluir a triagem".' };
    if (!AST_ACOES_TRIAGEM[acao]) throw new Error('Não foi possível concluir a triagem: escolha um dos caminhos (remoto, orçamento, peça ou visita)');
    var falta = AST_TRIAGEM_ITENS.filter(function (it) { return it.obrig && Ast_s_(ck[it.k]).length < 3; }).map(function (it) { return it.t.toLowerCase(); });
    if (falta.length) throw new Error('Não foi possível concluir a triagem: falta preencher ' + falta.join(', ') + '. Esses itens ficam no relatório e ajudam o técnico; preencha e conclua de novo');
    var fim = { TRIAGEM_FIM_EM: Ast_agora_(), ACAO_DECIDIDA: acao };
    if (acao === 'RESOLVIDO_REMOTO') {
      var ori = Ast_texto_(d.orientacao, 2000);
      if (ori.length < 10) throw new Error('Não foi possível concluir: descreva a orientação remota que resolveu o problema (pelo menos 10 letras)');
      c = AstC_mudar_(eu, c, 'RESOLVIDO_REMOTO', Object.assign(fim, { ORIENTACAO_REMOTA: ori, PROXIMA_ACAO: 'Confirmar com o cliente e encerrar' }), 'DECISAO', 'Resolvido remotamente: ' + ori);
    } else if (acao === 'AGUARDANDO_ORCAMENTO') {
      var oq = Ast_texto_(d.orcamentoDescricao, 1500);
      if (oq.length < 5) throw new Error('Não foi possível concluir: descreva o que precisa ser orçado (serviço ou peça fora do contrato)');
      c = AstC_mudar_(eu, c, 'AGUARDANDO_ORCAMENTO', Object.assign(fim, { ORCAMENTO_DESCRICAO: oq, TIPO_CODIGO: Ast_s_(c.TIPO_CODIGO) || 'MANUTENCAO_CORRETIVA', PROXIMA_ACAO: 'Fazer o orçamento e enviar ao cliente' }), 'DECISAO', 'Precisa de orçamento: ' + oq);
      if (typeof AstR_pedirOrcamento_ === 'function') AstR_pedirOrcamento_(eu, c, oq);
    } else if (acao === 'AGUARDANDO_PECA') {
      c = AstC_aguardarPeca_(eu, c, d, fim);
    } else {
      if (!Ast_s_(c.TIPO_CODIGO)) throw new Error('Não foi possível concluir: escolha o tipo de serviço da visita (define o checklist, as fotos e o que o relatório exige)');
      c = AstC_mudar_(eu, c, 'PLANEJADO', Object.assign(fim, { PROXIMA_ACAO: 'Agendar o atendimento (técnico, data e duração)' }), 'DECISAO', 'Visita necessária' + (Ast_s_(d.observacao) ? ': ' + Ast_texto_(d.observacao, 500) : ''));
    }
    return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Triagem concluída: ' + AST_ACOES_TRIAGEM[acao].toLowerCase() + '. ' + Ast_s_(c.PROXIMA_ACAO) + '.' };
  });
}

/** Aguardar peça (da triagem ou do campo): exige a peça; abre o pedido em Compras quando a regra manda. Chamar dentro da trava. */
function AstC_aguardarPeca_(eu, c, d, campos) {
  var desc = Ast_texto_(d.pecaDescricao, 500);
  if (desc.length < 3) throw new Error('Não foi possível marcar "aguardando peça": diga qual peça falta (descrição; se souber, o número da peça)');
  var extra = Object.assign({}, campos || {}, { PECA_DESCRICAO: desc, TIPO_CODIGO: Ast_s_(c.TIPO_CODIGO) || 'MANUTENCAO_CORRETIVA', PROXIMA_ACAO: 'Aguardar a peça e agendar o retorno' });
  var novo = AstC_mudar_(eu, c, 'AGUARDANDO_PECA', extra, 'AGUARDANDO_PECA', 'Aguardando peça: ' + desc);
  // Compras tem trava própria: o pedido de compra abre logo depois de soltar a trava da Assistência
  Ast_depois_(function () { AstC_ligarPedidoCompra_(eu, novo, { descricao: desc, codigo: d.pecaCodigo, quantidade: d.pecaQuantidade, urgencia: Ast_up_(c.PRIORIDADE) === 'P1' ? 'CRITICA' : 'ALTA', osNumero: c.OS_NUMERO }); });
  return novo;
}
/** Abre o pedido de compra e grava o número no chamado (fora da trava). */
function AstC_ligarPedidoCompra_(eu, c, p) {
  var req = AstC_pedirPecaCompras_(eu, c, p);
  if (req.numero) {
    Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { REQUISICAO_ID: req.id, REQUISICAO_NUMERO: req.numero, PROXIMA_ACAO: 'Aguardar a peça (pedido de compra ' + req.numero + ') e agendar o retorno', ATUALIZADO_EM: Ast_agora_() });
    Ast_evento_('CHAMADO', c.ID, 'COMPRAS', eu, 'Pedido de compra ' + req.numero + ' aberto para a peça: ' + p.descricao, { numero: c.NUMERO });
  } else Ast_evento_('CHAMADO', c.ID, 'COMPRAS', eu, 'Pedido de compra não aberto: ' + (req.aviso || 'motivo não informado') + '.', { numero: c.NUMERO });
  return req;
}

/** Identidade do Compras de um usuário ativo (sem sessão), para o pedido que nasce da aprovação do cliente pelo link. */
function AstC_cmpComo_(usuarioId) {
  if (!Ast_s_(usuarioId) || typeof Cmp_nivelDe_ !== 'function') return null;
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, usuarioId); } catch (e) { u = null; }
  if (!u || Ast_up_(u.STATUS || 'ATIVO') !== 'ATIVO') return null;
  var eu = { id: Ast_s_(u.ID), nome: Ast_s_(u.NOME) || Ast_s_(u.USUARIO), login: Ast_s_(u.USUARIO), perfil: Ast_up_(u.PERFIL), area: Ast_up_(u.AREA), email: Ast_s_(u.EMAIL).toLowerCase() };
  var n = Cmp_nivelDe_(eu);
  Object.keys(n).forEach(function (k) { eu[k] = n[k]; });
  return eu;
}
/** Pedido de peça no Compras nativo (vínculo ao cliente e ao chamado). Devolve { id, numero } ou { aviso }. Nunca lança. */
function AstC_pedirPecaCompras_(eu, c, p) {
  var regras = Ast_regras_();
  if (!regras.pecas.faltaAbreCompras) return { aviso: 'abertura automática do pedido de compra desligada nas Regras da assistência' };
  if (typeof CmpR_salvar_ !== 'function' || typeof Cmp_eu_ !== 'function') return { aviso: 'Compras não está disponível neste servidor' };
  try {
    if (typeof Cmp_garantirAbas_ === 'function') Cmp_garantirAbas_();
    // 22/10/2026 (etapa 4): aprovação pelo link do cliente não tem sessão; o pedido sai em nome de quem enviou o orçamento
    var euCmp = eu.sessionId ? Cmp_eu_(eu.sessionId) : AstC_cmpComo_(eu.comoUsuarioId);
    if (!euCmp) return { aviso: 'sem sessão para abrir o pedido de compra' };
    var qtd = Ast_num_(p.quantidade); if (!(qtd > 0)) qtd = 1;
    var r = CmpR_salvar_(euCmp, { urgencia: p.urgencia || 'ALTA', finalidade: 'Peça para o chamado ' + c.NUMERO + (p.osNumero ? ' (O.S. ' + p.osNumero + ')' : '') + ' de ' + Ast_s_(c.CLIENTE_NOME) + ': ' + Ast_s_(c.SINTOMA).slice(0, 120),
      vinculo: { tipo: 'CLIENTE', clienteId: c.CLIENTE_ID, unidadeId: c.UNIDADE_ID, osAuvo: c.NUMERO },
      itens: [{ categoria: 'PECA', descricao: p.descricao, quantidade: qtd, unidade: 'un.', partNumber: Ast_s_(p.codigo), equipamentoId: c.EQUIPAMENTO_ID || '' }] });
    var req = r && (r.requisicao || r);
    return { id: Ast_s_(req && req.id), numero: Ast_s_(req && req.numero) };
  } catch (e) { return { aviso: 'o pedido de compra não foi aberto (' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '); peça em Compras > Pedir peça ou material' }; }
}

/** Peça chegou ou orçamento aprovado: volta a "Planejado" (falta agendar). */
function AstC_retomar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'liberar o chamado para agendar');
  var c = AstC_obter_(eu, d && d.id, 'liberar o chamado');
  var s = Ast_up_(c.SITUACAO);
  if (s !== 'AGUARDANDO_PECA' && s !== 'AGUARDANDO_ORCAMENTO') throw new Error('Não foi possível liberar: o chamado ' + c.NUMERO + ' não está aguardando peça nem orçamento');
  var t = Ast_texto_(d.texto, 500);
  if (t.length < 5) throw new Error('Não foi possível liberar: escreva o que aconteceu (peça chegou, orçamento aprovado pelo cliente...)');
  return Ast_comTrava_(function () {
    c = AstC_mudar_(eu, c, 'PLANEJADO', { PROXIMA_ACAO: 'Agendar o atendimento (técnico, data e duração)' }, 'LIBERADO', t);
    return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Chamado ' + c.NUMERO + ' liberado para agendar.' };
  });
}

/**
 * 22/10/2026 (etapa 3): Compras recebeu e conferiu a peça (CmpP_disponivel_): o chamado que esperava por ela volta sozinho
 * a "Planejado" com a anotação "peça disponível em ...", a gestão ganha a pendência "retorno a agendar", o técnico
 * responsável e a gestão são avisados (AT14) e o cliente recebe o e-mail "peça chegou, retorno será agendado" (AT15).
 * Chamada por Compras depois de soltar a trava dele (Cmp_depois_); aqui pega a trava da Assistência. Nunca lança.
 * r: linha de CMP_REQUISICOES. Devolve { ok, numero } ou { ok:false, motivo }.
 */
function Assistencia_pecaDisponivel_(r, quem) {
  try {
    if (!r) return { ok: false, motivo: 'requisição não informada' };
    Ast_memoLimpar_();
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(AST_ABAS.CHAMADOS)) return { ok: false, motivo: 'Assistência sem chamados' };
    var reqId = Ast_s_(r.ID), reqNum = Ast_s_(r.NUMERO), ref = Ast_s_(r.OS_AUVO);
    var c = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (x) { return (reqId && Ast_s_(x.REQUISICAO_ID) === reqId) || (ref && Ast_s_(x.NUMERO) === ref); })
      .sort(function (a, b) { return (Ast_up_(b.SITUACAO) === 'AGUARDANDO_PECA' ? 1 : 0) - (Ast_up_(a.SITUACAO) === 'AGUARDANDO_PECA' ? 1 : 0); })[0];
    if (!c) return { ok: false, motivo: 'nenhum chamado ligado ao pedido ' + reqNum };
    var eu = (quem && quem.nome) ? { id: Ast_s_(quem.id), nome: 'Compras (' + quem.nome + ')', perfil: 'SISTEMA', gestao: true, interno: true } : Ast_sistema_('Compras');
    var agora = Ast_agora_(), ja = Ast_s_(c.PECA_DISPONIVEL_EM);
    var res = Ast_comTrava_(function () {
      var atual = Ast_porId_(AST_ABAS.CHAMADOS, c.ID) || c, s = Ast_up_(atual.SITUACAO);
      if (s !== 'AGUARDANDO_PECA') {
        Ast_atualizar_(AST_ABAS.CHAMADOS, atual.ID, { PECA_DISPONIVEL_EM: ja || agora, ATUALIZADO_EM: agora });
        Ast_evento_('CHAMADO', atual.ID, 'PECA_DISPONIVEL', eu, 'Peça do pedido ' + reqNum + ' disponível em Compras (o chamado estava "' + (AST_SITUACOES[s] || s) + '")', { numero: atual.NUMERO, publico: true });
        return { c: atual, mudou: false };
      }
      var novo = AstC_mudar_(eu, atual, 'PLANEJADO', { PECA_DISPONIVEL_EM: agora, PROXIMA_ACAO: 'Peça disponível (pedido ' + reqNum + '): agendar o retorno do técnico' }, 'PECA_DISPONIVEL',
        'Peça do pedido ' + reqNum + ' chegou e foi conferida por Compras: ' + Ast_s_(atual.PECA_DESCRICAO).slice(0, 200) + '. Agendar o retorno.');
      var os = Ast_porId_(AST_ABAS.OS, novo.OS_ID);
      if (os && Ast_up_(os.SITUACAO) === 'PAUSADA') Ast_evento_('OS', os.ID, 'PECA_DISPONIVEL', eu, 'Peça do pedido ' + reqNum + ' disponível: a O.S. volta a ser agendada para o retorno', { numero: os.NUMERO });
      var us = Ast_usuarios_(), gest = Ast_gestoresTecnica_(us), tec = Ast_s_(novo.TECNICO_ID);
      Ast_avisar_(gest.concat(tec ? [tec] : []), 'PECA_DISPONIVEL', 'Peça disponível: agendar o retorno do chamado ' + novo.NUMERO,
        Ast_s_(novo.CLIENTE_NOME) + ' · ' + Ast_s_(novo.EQUIPAMENTO_TEXTO) + '\nPeça: ' + Ast_s_(novo.PECA_DESCRICAO).slice(0, 200) + ' (pedido ' + reqNum + ', conferido por Compras).\n' +
        'Gestão: abra o chamado em Assistência técnica > Chamados e toque em "Agendar o retorno". Técnico: retire a peça com Compras antes do retorno.', novo.ID, { evento: 'AT14' });
      return { c: novo, mudou: true };
    });
    if (res.mudou) {
      Ast_avisarCliente_(res.c, 'Peça recebida: retorno técnico do chamado ' + res.c.NUMERO + ' será agendado',
        'Prezados,\n\nA peça necessária para o atendimento do chamado ' + res.c.NUMERO + ' (' + Ast_s_(res.c.EQUIPAMENTO_TEXTO) + ') chegou e foi conferida pela Metrolabs.\n' +
        'O retorno do técnico será agendado em seguida e a data será informada por e-mail.\n\nAcompanhe pelo portal do cliente do SGO+.\n\nMetrolabs — Assistência técnica', 'AT15');
    }
    return { ok: true, numero: res.c.NUMERO, mudou: res.mudou };
  } catch (e) { console.error('Compras -> Assistência (peça disponível): ' + ((e && e.message) || e)); return { ok: false, motivo: String((e && e.message) || e) }; }
}

/**
 * 22/10/2026: O.S. com documentação pendente (ou chamado aguardando peça) volta à triagem com motivo: o técnico descobriu
 * em campo que precisa de orçamento ou de outro diagnóstico. A O.S. fica pausada (a visita foi interrompida) e volta a ser
 * agendada quando a triagem decidir "planejar visita". d: { id, motivo }
 */
function AstC_voltarTriagem_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'voltar o chamado à triagem');
  var c = AstC_obter_(eu, d && d.id, 'voltar o chamado à triagem');
  var s = Ast_up_(c.SITUACAO);
  if ((AST_TRANSICOES[s] || []).indexOf('EM_TRIAGEM') < 0) throw new Error('Não foi possível voltar à triagem: o chamado ' + c.NUMERO + ' está "' + (AST_SITUACOES[s] || s) + '". Só chamado com documentação pendente, aguardando peça ou resolvido remotamente volta à triagem');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível voltar à triagem: escreva o motivo (pelo menos 10 letras), por exemplo "o técnico constatou que a placa precisa de orçamento". Ele fica no histórico');
  return Ast_comTrava_(function () {
    c = AstC_mudar_(eu, c, 'EM_TRIAGEM', { TRIAGEM_RESPONSAVEL_ID: eu.id, TRIAGEM_RESPONSAVEL_NOME: eu.nome, TRIAGEM_FIM_EM: '', ACAO_DECIDIDA: '', PROXIMA_ACAO: 'Refazer a triagem e decidir o caminho (orçamento, peça ou nova visita)' }, 'VOLTA_TRIAGEM', 'Voltou à triagem: ' + motivo);
    var os = Ast_porId_(AST_ABAS.OS, c.OS_ID);
    if (os && ['DOC_PENDENTE', 'PAUSADA', 'NO_LOCAL', 'EM_EXECUCAO'].indexOf(Ast_up_(os.SITUACAO)) >= 0) {
      Ast_atualizar_(AST_ABAS.OS, os.ID, { SITUACAO: 'PAUSADA', FALTAS: '', ATUALIZADO_EM: Ast_agora_() });
      Ast_evento_('OS', os.ID, 'VOLTA_TRIAGEM', eu, 'Visita interrompida: o chamado voltou à triagem (' + motivo + '). A O.S. fica pausada até a nova decisão.', { numero: os.NUMERO });
      if (Ast_s_(os.TECNICO_ID)) Ast_avisar_(os.TECNICO_ID, 'VOLTA_TRIAGEM', 'O.S. ' + os.NUMERO + ' pausada: o chamado voltou à triagem', 'Motivo: ' + motivo + '. A gestão decide o caminho e, se houver nova visita, você recebe o agendamento.', os.ID, { autorId: eu.id, evento: 'AT04' });
    }
    return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Chamado ' + c.NUMERO + ' de volta à triagem. Preencha a triagem e escolha o caminho.' };
  });
}

/** Resolvido remotamente: encerra com a confirmação do cliente. */
function AstC_encerrarRemoto_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'encerrar o chamado');
  var c = AstC_obter_(eu, d && d.id, 'encerrar o chamado');
  if (Ast_up_(c.SITUACAO) !== 'RESOLVIDO_REMOTO') throw new Error('Não foi possível encerrar aqui: o chamado ' + c.NUMERO + ' não foi resolvido remotamente. Chamado com visita fecha pela O.S. (documentação completa)');
  var quem = Ast_texto_(d.confirmadoPor, 120), teste = Ast_texto_(d.testeFuncional, 1000);
  if (quem.length < 3) throw new Error('Não foi possível encerrar: informe quem confirmou no cliente que o problema foi resolvido');
  if (teste.length < 5) throw new Error('Não foi possível encerrar: descreva o teste ou a confirmação de funcionamento');
  return Ast_comTrava_(function () {
    c = AstC_mudar_(eu, c, 'ENCERRADO', { PROXIMA_ACAO: '' }, 'ENCERRAMENTO', 'Encerrado com orientação remota. Confirmado por ' + quem + ': ' + teste);
    return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Chamado ' + c.NUMERO + ' encerrado.' };
  });
}

function AstC_cancelar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'cancelar o chamado');
  var c = AstC_obter_(eu, d && d.id, 'cancelar o chamado');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (pelo menos 10 letras). Ele fica no histórico e o cliente vê que foi cancelado');
  return Ast_comTrava_(function () {
    c = AstC_mudar_(eu, c, 'CANCELADO', { CANCELADO_EM: Ast_agora_(), CANCELADO_MOTIVO: motivo, CANCELADO_POR_NOME: eu.nome, PROXIMA_ACAO: '' }, 'CANCELAMENTO', motivo);
    var os = Ast_porId_(AST_ABAS.OS, c.OS_ID);
    if (os && AST_OS_ABERTAS.indexOf(Ast_up_(os.SITUACAO)) >= 0) {
      Ast_atualizar_(AST_ABAS.OS, os.ID, { SITUACAO: 'CANCELADA', CANCELADA_EM: Ast_agora_(), CANCELADA_MOTIVO: motivo, ATUALIZADO_EM: Ast_agora_() });
      Ast_evento_('OS', os.ID, 'CANCELAMENTO', eu, 'Chamado cancelado: ' + motivo, { numero: os.NUMERO });
      Ast_mudarAtividade_(os.ATIVIDADE_ID, 'Cancelada', 'Chamado ' + c.NUMERO + ' cancelado: ' + motivo);
      if (Ast_s_(os.TECNICO_ID)) Ast_avisar_(os.TECNICO_ID, 'OS_CANCELADA', 'O.S. ' + os.NUMERO + ' cancelada', 'O chamado ' + c.NUMERO + ' (' + Ast_s_(c.CLIENTE_NOME) + ') foi cancelado: ' + motivo, os.ID, { autorId: eu.id, evento: 'AT05' });
    }
    return { chamado: AstC_publico_(c, eu, Date.now()), message: 'Chamado ' + c.NUMERO + ' cancelado.' };
  });
}

// ------------------------------------------------------------
// EXCLUSÃO DE CHAMADO DE TESTE OU SIMULAÇÃO (27/10/2026, decisão do dono)
// Só Gestor, Diretoria e Administrador; motivo obrigatório; confirmação depois de ver os vínculos e o efeito. Exclusão
// lógica: EXCLUIDO_EM preenchido tira o chamado (e as O.S. e orçamentos dele, pela mesma EXCLUSAO_ID) de listas, contadores,
// pendências, indicadores, agenda, aplicativo, portal do cliente e fonte única de atendimentos (Ast_ler_). Nada é apagado
// do banco; a auditoria (histórico do chamado em ATEC_EVENTOS) guarda quem, quando e o motivo. A gestão vê os excluídos e
// restaura (Chamados > Excluídos).
// ------------------------------------------------------------
/** Vínculos do chamado e o efeito da exclusão em cada um: [{ tipo, texto, efeito, alerta }]. */
function AstC_vinculosExclusao_(c) {
  var v = [], cid = Ast_s_(c.ID);
  var oss = Ast_lerTudo_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === cid && !Ast_excluido_(o); });
  oss.forEach(function (o) {
    var s = Ast_up_(o.SITUACAO), campo = ['EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADA', 'DOC_PENDENTE'].indexOf(s) >= 0;
    var efeito = 'Sai junto: some da agenda, do aplicativo do técnico (Meu dia), de Minhas O.S., do histórico do equipamento e da fonte única de atendimentos (qualidade, Conduta, Frota).';
    if (Ast_s_(o.ATIVIDADE_ID) && AST_OS_ABERTAS.indexOf(s) >= 0) efeito += ' A atividade dela em Minhas atividades é cancelada.';
    if (Ast_s_(o.RELATORIO_PDF_ID)) efeito += ' O relatório já gerado continua guardado no Drive (nada é apagado).';
    if (Ast_s_(o.ENVIADO_CLIENTE_EM)) efeito += ' Atenção: o relatório já foi enviado ao cliente em ' + Ast_br_(o.ENVIADO_CLIENTE_EM) + '; a exclusão não desfaz esse envio.';
    if (campo) efeito += ' Atenção: a O.S. está em andamento com o técnico; o que ele enviar do celular para ela passa a ser recusado. Avise o técnico antes.';
    v.push({ tipo: 'OS', texto: 'O.S. ' + Ast_s_(o.NUMERO) + ' (' + (AST_OS_SITUACOES[s] || s) + (Ast_s_(o.TECNICO_NOME) ? ', técnico ' + Ast_s_(o.TECNICO_NOME) : '') + (Ast_s_(o.AGENDADO_PARA) ? ', ' + Ast_br_(o.AGENDADO_PARA) : '') + ')',
      efeito: efeito, alerta: campo || !!Ast_s_(o.ENVIADO_CLIENTE_EM) || s === 'ENCERRADA' });
  });
  var osIds = oss.map(function (o) { return Ast_s_(o.ID); });
  var pecas = Ast_ler_(AST_ABAS.PECAS).filter(function (p) { return osIds.indexOf(Ast_s_(p.OS_ID)) >= 0 && Ast_up_(p.ATIVA || 'SIM') !== 'NAO'; });
  if (pecas.length) v.push({ tipo: 'PECAS', texto: Ast_plural_(pecas.length, 'peça lançada', 'peças lançadas') + ' na O.S.', efeito: 'Ficam registradas na O.S. excluída (nada é apagado); não entram em indicador.', alerta: false });
  Ast_lerTudo_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === cid && !Ast_excluido_(o) && Ast_up_(o.SITUACAO) !== 'SUBSTITUIDO'; }).forEach(function (o) {
    var s = Ast_up_(o.SITUACAO);
    v.push({ tipo: 'ORCAMENTO', texto: 'Orçamento ' + Ast_s_(o.NUMERO) + ' rev. ' + (Number(o.REVISAO) || 0) + ' (' + (AST_ORC_SITUACOES[s] || s) + ')',
      efeito: 'Sai junto (com as revisões anteriores).' + (Ast_s_(o.ENVIADO_EM) ? ' O link de aceite enviado ao cliente deixa de abrir o orçamento.' : '') + (s === 'APROVADO' ? ' Atenção: o cliente já aprovou este orçamento.' : ''),
      alerta: s === 'APROVADO' || !!Ast_s_(o.ENVIADO_EM) });
  });
  if (Ast_s_(c.REQUISICAO_NUMERO)) v.push({ tipo: 'COMPRAS', texto: 'Pedido de compra ' + Ast_s_(c.REQUISICAO_NUMERO) + ' (Compras)', efeito: 'Não é cancelado sozinho. Se a peça não vai mais ser comprada, cancele o pedido em Compras com o motivo.', alerta: true });
  if (Ast_s_(c.CASO_ID)) {
    var k = Ast_porId_(AST_ABAS.CASOS, c.CASO_ID);
    v.push({ tipo: 'CASO', texto: 'Reclamação ' + Ast_s_(k && k.NUMERO) + (k ? ' (' + (AST_CASO_SITUACOES[Ast_up_(k.SITUACAO)] || k.SITUACAO) + ')' : ''), efeito: 'Continua em Reclamações; trate ou resolva lá.', alerta: !!(k && Ast_up_(k.SITUACAO) !== 'RESOLVIDO') });
  }
  if (Ast_s_(c.SOLICITACAO_ID)) v.push({ tipo: 'SOLICITACAO', texto: 'Pedido do cliente ' + Ast_s_(c.ORIGEM_REF), efeito: 'Continua na fila como "convertido" (histórico); o cliente não vê mais o chamado no portal.', alerta: false });
  if (Ast_s_(c.PROPOSTA_ID)) v.push({ tipo: 'COMERCIAL', texto: 'Pedido aprovado do Comercial ' + Ast_s_(c.ORIGEM_REF), efeito: 'A proposta no Comercial não muda. Se o serviço vendido ainda precisa de atendimento, abra um chamado novo.', alerta: true });
  if (/^AUVO /i.test(Ast_s_(c.ORIGEM_REF))) v.push({ tipo: 'AUVO', texto: 'Tarefa ' + Ast_s_(c.ORIGEM_REF).replace(/^AUVO\s*/i, '') + ' do Auvo (transição)', efeito: 'Nada muda no Auvo; o destino registrado na Transição do Auvo continua.', alerta: false });
  if (['PORTAL', 'QR', 'EMAIL', 'TELEFONE'].indexOf(Ast_up_(c.CANAL)) >= 0) v.push({ tipo: 'CLIENTE', texto: 'Cliente ' + Ast_s_(c.CLIENTE_NOME) + ' (canal: ' + (AST_CANAIS[Ast_up_(c.CANAL)] || c.CANAL) + ')',
    efeito: 'Os e-mails já enviados ao cliente não voltam; o chamado some de "Meus chamados" no portal.', alerta: false });
  return v;
}
function AstC_exclusaoResumo_(c) { return { id: Ast_s_(c.ID), numero: Ast_s_(c.NUMERO), situacaoNome: AST_SITUACOES[Ast_up_(c.SITUACAO)] || Ast_s_(c.SITUACAO), clienteNome: Ast_s_(c.CLIENTE_NOME), equipamentoTexto: Ast_s_(c.EQUIPAMENTO_TEXTO), abertoEm: Ast_br_(c.ABERTO_EM) }; }
/** Prévia: o que vai acontecer (a tela mostra antes de pedir o motivo e a confirmação). d: { id } */
function AstC_previaExclusao_(eu, d) {
  Ast_exigir_(eu, 'EXCLUIR', 'excluir o chamado');
  var c = AstC_obter_(eu, d && d.id, 'excluir o chamado');
  var v = AstC_vinculosExclusao_(c);
  return { chamado: AstC_exclusaoResumo_(c), vinculos: v, temAlerta: v.some(function (x) { return x.alerta; }),
    message: v.length ? 'O chamado ' + c.NUMERO + ' tem ' + Ast_plural_(v.length, 'vínculo', 'vínculos') + '. Leia o efeito de cada um antes de excluir.' : 'O chamado ' + c.NUMERO + ' não tem O.S., orçamento, pedido de compra nem outro vínculo: a exclusão só o tira das listas.' };
}
/** d: { id, motivo, confirmado: true, vinculosVistos: quantos vínculos a prévia mostrou } */
function AstC_excluir_(eu, d) {
  Ast_exigir_(eu, 'EXCLUIR', 'excluir o chamado');
  d = d || {};
  var c0 = AstC_obter_(eu, d.id, 'excluir o chamado');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível excluir: escreva o motivo (pelo menos 10 letras), por exemplo "chamado de teste aberto no treinamento da equipe". Ele fica na auditoria com o seu nome');
  if (d.confirmado !== true) throw new Error('Não foi possível excluir: falta a confirmação. Abra a exclusão, leia os vínculos e o efeito e toque em "Excluir o chamado"; nada foi alterado');
  var res = Ast_comTrava_(function () {
    [AST_ABAS.CHAMADOS, AST_ABAS.OS, AST_ABAS.ORCAMENTOS].forEach(Ast_memoTirar_);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, c0.ID);
    if (!c) throw new Error('Não foi possível excluir: o chamado ' + c0.NUMERO + ' já foi excluído por outra pessoa. Veja em Chamados > Excluídos');
    var vinc = AstC_vinculosExclusao_(c);
    if (d.vinculosVistos !== undefined && Number(d.vinculosVistos) !== vinc.length) throw new Error('Não foi possível excluir: os vínculos do chamado ' + c.NUMERO + ' mudaram desde que você abriu a janela (agora são ' + vinc.length + '). Abra a exclusão de novo e leia o efeito; nada foi alterado');
    var agora = Ast_agora_(), exId = 'EXC-' + agora.replace(/\D/g, '') + '-' + Ast_s_(c.NUMERO);
    var marca = { EXCLUSAO_ID: exId, EXCLUIDO_EM: agora, EXCLUIDO_POR_NOME: eu.nome, EXCLUIDO_MOTIVO: 'Chamado ' + c.NUMERO + ' excluído (teste ou simulação): ' + motivo };
    Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { EXCLUSAO_ID: exId, EXCLUIDO_EM: agora, EXCLUIDO_POR_ID: eu.id, EXCLUIDO_POR_NOME: eu.nome, EXCLUIDO_MOTIVO: motivo, ATUALIZADO_EM: agora });
    Ast_evento_('CHAMADO', c.ID, 'EXCLUSAO', eu, 'Chamado excluído (teste ou simulação) por ' + eu.nome + ' em ' + Ast_br_(agora) + '. Motivo: ' + motivo +
      (vinc.length ? '. Vínculos no momento: ' + vinc.map(function (x) { return x.texto; }).join('; ') : '. Sem vínculos') + '.', { numero: c.NUMERO, de: AST_SITUACOES[Ast_up_(c.SITUACAO)] || c.SITUACAO, para: 'Excluído' });
    var refs = [Ast_s_(c.ID)], nOs = [];
    Ast_lerTudo_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID) && !Ast_excluido_(o); }).forEach(function (o) {
      Ast_atualizar_(AST_ABAS.OS, o.ID, marca);
      Ast_evento_('OS', o.ID, 'EXCLUSAO', eu, 'O.S. excluída junto com o chamado ' + c.NUMERO + ' (teste ou simulação). Motivo: ' + motivo, { numero: o.NUMERO });
      if (Ast_s_(o.ATIVIDADE_ID) && AST_OS_ABERTAS.indexOf(Ast_up_(o.SITUACAO)) >= 0) Ast_mudarAtividade_(o.ATIVIDADE_ID, 'Cancelada', 'O.S. ' + o.NUMERO + ' saiu junto com o chamado ' + c.NUMERO + ', excluído pela gestão (teste ou simulação): ' + motivo);
      refs.push(Ast_s_(o.ID)); nOs.push(Ast_s_(o.NUMERO));
    });
    var nOrc = 0;
    Ast_lerTudo_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID) && !Ast_excluido_(o); }).forEach(function (o) { Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, marca); refs.push(Ast_s_(o.ID)); nOrc++; });
    // avisos ainda não lidos sobre o chamado e o que saiu junto: marcados como lidos (não cobram mais ninguém)
    Ast_ler_(AST_ABAS.AVISOS).forEach(function (a) { if (refs.indexOf(Ast_s_(a.REF_ID)) >= 0 && !Ast_s_(a.LIDO_EM)) SGO_DATA.update(AST_ABAS.AVISOS, a.ID, { LIDO_EM: agora }); });
    Ast_memoTirar_(AST_ABAS.AVISOS);
    return { c: c, nOs: nOs, nOrc: nOrc, vinc: vinc };
  });
  return { excluido: AstC_exclusaoResumo_(res.c), message: 'Chamado ' + res.c.NUMERO + ' excluído' + (res.nOs.length ? ', junto com a O.S. ' + res.nOs.join(', ') : '') + (res.nOrc ? (res.nOs.length ? ' e ' : ', junto com ') + Ast_plural_(res.nOrc, 'orçamento', 'orçamentos') : '') +
    '. Ele saiu das listas, contadores, pendências, indicadores e do portal do cliente. Nada foi apagado: a gestão vê e restaura em Chamados > Excluídos.' +
    (res.vinc.some(function (x) { return x.tipo === 'COMPRAS'; }) ? ' Lembre: o pedido de compra continua em Compras.' : '') };
}
/** Lista dos excluídos (Gestor, Diretoria e Administrador). */
function AstC_excluidos_(eu, f) {
  Ast_exigir_(eu, 'EXCLUIR', 'ver os chamados excluídos');
  f = f || {};
  var busca = Ast_semAcento_(f.busca), agoraMs = Date.now(), regras = Ast_regras_();
  var lista = Ast_lerTudo_(AST_ABAS.CHAMADOS).filter(function (c) {
    if (!Ast_excluido_(c)) return false;
    return !busca || Ast_semAcento_([c.NUMERO, c.CLIENTE_NOME, c.UNIDADE_NOME, c.EQUIPAMENTO_TEXTO, c.SINTOMA, c.EXCLUIDO_MOTIVO, c.EXCLUIDO_POR_NOME].join(' ')).indexOf(busca) >= 0;
  }).sort(function (a, b) { return String(b.EXCLUIDO_EM).localeCompare(String(a.EXCLUIDO_EM)); }).map(function (c) {
    var p = AstC_publico_(c, eu, agoraMs, regras);
    p.osExcluidas = Ast_lerTudo_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.EXCLUSAO_ID) && Ast_s_(o.EXCLUSAO_ID) === Ast_s_(c.EXCLUSAO_ID); }).map(function (o) { return Ast_s_(o.NUMERO); });
    p.podeAssumir = false; p.podeTriar = false; p.podeAgendar = false; p.podeCancelar = false; p.podeVoltarTriagem = false;
    return p;
  });
  var base = AstC_lista_(eu, { grupo: 'ABERTOS', limite: 1 });
  return { chamados: lista, total: lista.length, contagem: base.contagem, excluidos: true, podeVerExcluidos: true };
}
/** Restaura o chamado (e o que saiu junto na mesma exclusão). d: { id, motivo } */
function AstC_restaurar_(eu, d) {
  Ast_exigir_(eu, 'EXCLUIR', 'restaurar o chamado');
  d = d || {};
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível restaurar: escreva o motivo (pelo menos 10 letras), por exemplo "excluído por engano, é atendimento real". Fica na auditoria com o seu nome');
  var res = Ast_comTrava_(function () {
    [AST_ABAS.CHAMADOS, AST_ABAS.OS, AST_ABAS.ORCAMENTOS].forEach(Ast_memoTirar_);
    var c = Ast_lerTudo_(AST_ABAS.CHAMADOS).filter(function (x) { return Ast_s_(x.ID) === Ast_s_(d.id); })[0];
    if (!c) throw new Error('Não foi possível restaurar: o chamado não foi encontrado. Atualize a lista de excluídos');
    if (!Ast_excluido_(c)) throw new Error('Não foi possível restaurar: o chamado ' + c.NUMERO + ' não está excluído (alguém já restaurou). Atualize a lista');
    var agora = Ast_agora_(), exId = Ast_s_(c.EXCLUSAO_ID), volta = { EXCLUIDO_EM: '', RESTAURADO_EM: agora, RESTAURADO_POR_NOME: eu.nome, RESTAURADO_MOTIVO: motivo, ATUALIZADO_EM: agora };
    Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, volta);
    Ast_evento_('CHAMADO', c.ID, 'RESTAURACAO', eu, 'Chamado restaurado por ' + eu.nome + ' em ' + Ast_br_(agora) + ' (estava excluído desde ' + Ast_br_(c.EXCLUIDO_EM) + ' por ' + Ast_s_(c.EXCLUIDO_POR_NOME) + '). Motivo: ' + motivo, { numero: c.NUMERO, de: 'Excluído', para: AST_SITUACOES[Ast_up_(c.SITUACAO)] || c.SITUACAO });
    var nOs = [], comAtv = [];
    if (exId) {
      Ast_lerTudo_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.EXCLUSAO_ID) === exId && Ast_excluido_(o); }).forEach(function (o) {
        Ast_atualizar_(AST_ABAS.OS, o.ID, { EXCLUIDO_EM: '', ATUALIZADO_EM: agora });
        Ast_evento_('OS', o.ID, 'RESTAURACAO', eu, 'O.S. restaurada junto com o chamado ' + c.NUMERO + '. Motivo: ' + motivo, { numero: o.NUMERO });
        nOs.push(Ast_s_(o.NUMERO));
        if (Ast_s_(o.ATIVIDADE_ID) && AST_OS_ABERTAS.indexOf(Ast_up_(o.SITUACAO)) >= 0) comAtv.push(Ast_s_(o.NUMERO));
      });
      Ast_lerTudo_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.EXCLUSAO_ID) === exId && Ast_excluido_(o); }).forEach(function (o) { Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, { EXCLUIDO_EM: '', ATUALIZADO_EM: agora }); });
    }
    return { c: Object.assign({}, c, volta), nOs: nOs, comAtv: comAtv };
  });
  return { chamado: AstC_publico_(res.c, eu, Date.now()), message: 'Chamado ' + res.c.NUMERO + ' restaurado' + (res.nOs.length ? ' com a O.S. ' + res.nOs.join(', ') : '') + ': volta às listas na situação que tinha (' + (AST_SITUACOES[Ast_up_(res.c.SITUACAO)] || res.c.SITUACAO) + ').' +
    (res.comAtv.length ? ' A atividade da O.S. em Minhas atividades foi cancelada na exclusão e não volta sozinha: se o atendimento vale, reagende pela ficha do chamado.' : '') };
}

/** Ao encerrar: vendedor do pedido do Comercial avisado; caso ligado lembrado. */
function AstC_aoEncerrar_(eu, c) {
  if (Ast_s_(c.PROPOSTA_ID) && typeof COM_ABAS !== 'undefined') {
    try {
      var p = SGO_DATA.getById(COM_ABAS.PROPOSTAS, c.PROPOSTA_ID);
      if (p && Ast_s_(p.RESPONSAVEL_ID)) Ast_avisar_(p.RESPONSAVEL_ID, 'COMERCIAL_CONCLUIDO', 'Atendimento do pedido concluído: ' + c.NUMERO, 'A área Técnica concluiu o atendimento do chamado ' + c.NUMERO + ' (' + Ast_s_(c.CLIENTE_NOME) + ').', c.ID, { evento: 'AT07' });
    } catch (e) {}
  }
}

// ------------------------------------------------------------
// LISTA E FICHA
// ------------------------------------------------------------
var AST_GRUPOS_LISTA = {
  ABERTOS: function (s) { return AST_TERMINAIS.indexOf(s) < 0; },
  TRIAGEM: function (s) { return s === 'ABERTO' || s === 'EM_TRIAGEM'; },
  AGUARDANDO: function (s) { return ['AGUARDANDO_ORCAMENTO', 'AGUARDANDO_PECA', 'AGUARDANDO_CLIENTE', 'PLANEJADO', 'RESOLVIDO_REMOTO'].indexOf(s) >= 0; },
  CAMPO: function (s) { return AST_EM_CAMPO.indexOf(s) >= 0; },
  ENCERRADOS: function (s) { return AST_TERMINAIS.indexOf(s) >= 0; },
  TODOS: function () { return true; }
};
function AstC_lista_(eu, f) {
  f = f || {};
  if (Ast_up_(f.grupo) === 'EXCLUIDOS') return AstC_excluidos_(eu, f);
  var grupo = AST_GRUPOS_LISTA[Ast_up_(f.grupo)] || AST_GRUPOS_LISTA.ABERTOS, busca = Ast_semAcento_(f.busca), agoraMs = Date.now(), regras = Ast_regras_();
  var soFila = Ast_up_(f.grupo) === 'FILA_LIVRE';
  if (soFila) grupo = AST_GRUPOS_LISTA.TRIAGEM;
  var lista = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) {
    if (!AstC_podeVer_(eu, c) || !grupo(Ast_up_(c.SITUACAO))) return false;
    if (soFila && !AstC_estadoTriagem_(c, agoraMs, regras).filaLivre) return false;
    if (f.clienteId && Ast_s_(c.CLIENTE_ID) !== Ast_s_(f.clienteId)) return false;
    if (f.prioridade && Ast_up_(c.PRIORIDADE) !== Ast_up_(f.prioridade)) return false;
    if (f.tecnicoId && Ast_s_(c.TECNICO_ID) !== Ast_s_(f.tecnicoId)) return false;
    if (f.representadaId && (f.representadaId === 'TODAS' ? !Ast_s_(c.REPRESENTADA_ID) : Ast_s_(c.REPRESENTADA_ID) !== Ast_s_(f.representadaId))) return false;
    if (busca && Ast_semAcento_([c.NUMERO, c.CLIENTE_NOME, c.UNIDADE_NOME, c.EQUIPAMENTO_TEXTO, c.SINTOMA, c.SOLICITANTE, c.TECNICO_NOME, c.OS_NUMERO].join(' ')).indexOf(busca) < 0) return false;
    return true;
  }).map(function (c) { return AstC_publico_(c, eu, agoraMs, regras); });
  var ordemSla = { ESTOURADO: 0, EM_RISCO: 1, EM_DIA: 2, PAUSADO: 3 };
  lista.sort(function (a, b) {
    var x = (ordemSla[a.sla.estado] === undefined ? 9 : ordemSla[a.sla.estado]) - (ordemSla[b.sla.estado] === undefined ? 9 : ordemSla[b.sla.estado]);
    return x || a.prioridade.localeCompare(b.prioridade) || String(b.numero).localeCompare(String(a.numero));
  });
  var cont = { triagem: 0, estourados: 0, emRisco: 0, p1: 0, docPendente: 0, pendentesTriagem: 0, filaLivre: 0, paraMim: 0 };
  Ast_ler_(AST_ABAS.CHAMADOS).forEach(function (c) {
    if (!AstC_podeVer_(eu, c)) return;
    var s = Ast_up_(c.SITUACAO);
    if (AST_TERMINAIS.indexOf(s) >= 0) return;
    if (s === 'ABERTO' || s === 'EM_TRIAGEM') cont.triagem++;
    var est = AstC_estadoTriagem_(c, agoraMs, regras);
    if (est.pendente) { cont.pendentesTriagem++; if (est.filaLivre) cont.filaLivre++; if (AstC_podeAssumir_(eu, c, est)) cont.paraMim++; }
    if (Ast_up_(c.PRIORIDADE) === 'P1') cont.p1++;
    if (s === 'DOC_PENDENTE') cont.docPendente++;
    var e = Ast_slaEstado_(c, agoraMs, regras).estado;
    if (e === 'ESTOURADO') cont.estourados++; else if (e === 'EM_RISCO') cont.emRisco++;
  });
  cont.filaLivreMin = AstC_triagemCfg_(regras).min; cont.filaLivreLigada = AstC_triagemCfg_(regras).ligada;
  return { chamados: lista.slice(0, Number(f.limite) || 300), total: lista.length, contagem: cont, podeVerExcluidos: !!eu.excluir };
}

function AstC_detalhe_(eu, id) {
  var c = AstC_obter_(eu, id, 'abrir o chamado');
  var r = { chamado: AstC_publico_(c, eu, Date.now()) };
  r.eventos = Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return Ast_up_(e.ENTIDADE) === 'CHAMADO' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(c.ID); })
    .sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); })
    .map(function (e) { return { tipo: Ast_s_(e.TIPO), texto: Ast_s_(e.TEXTO), de: Ast_s_(e.DE), para: Ast_s_(e.PARA), por: Ast_s_(e.USUARIO_NOME), em: Ast_br_(e.EM) }; });
  var os = Ast_porId_(AST_ABAS.OS, c.OS_ID);
  r.os = os && typeof AstO_publico_ === 'function' ? AstO_publico_(os, eu) : null;
  r.osAnteriores = Ast_ler_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID) && Ast_s_(o.ID) !== Ast_s_(c.OS_ID); })
    .map(function (o) { return { id: o.ID, numero: o.NUMERO, situacao: AST_OS_SITUACOES[Ast_up_(o.SITUACAO)] || o.SITUACAO, tecnico: Ast_s_(o.TECNICO_NOME), agendadoPara: Ast_br_(o.AGENDADO_PARA) }; });
  r.orcamentos = typeof AstR_orcamentosDoChamado_ === 'function' ? AstR_orcamentosDoChamado_(eu, c) : [];
  r.casos = Ast_ler_(AST_ABAS.CASOS).filter(function (k) { return Ast_s_(k.CHAMADO_ID) === Ast_s_(c.ID); }).map(AstC_casoPublico_);
  r.triagemItens = AST_TRIAGEM_ITENS;
  if (c.EQUIPAMENTO_ID && typeof SGO_Atendimentos_doEquipamento_ === 'function') {
    try { r.historicoEquipamento = SGO_Atendimentos_doEquipamento_(c.EQUIPAMENTO_ID, { limite: 8, sessao: eu }); } catch (e) { r.historicoEquipamento = []; }
  }
  return r;
}

// ------------------------------------------------------------
// FILA DE SOLICITAÇÕES (portal do cliente, QR do equipamento, e-mail recebido)
// ------------------------------------------------------------
/** Solicitação do cliente (portal ou QR). Só para o próprio cliente; o equipamento precisa ser dele. */
function AstC_solicitar_(eu, d) {
  d = d || {};
  var clienteId = eu.cliente ? eu.clienteId : Ast_s_(d.clienteId);
  if (eu.cliente && !clienteId) throw new Error('Não foi possível enviar: o seu login não está ligado a um cliente. Fale com a Metrolabs para corrigir o acesso');
  var v = AstC_vinculo_({ clienteId: clienteId, equipamentoId: d.equipamentoId, unidadeId: d.unidadeId }, 'enviar a solicitação');
  var desc = Ast_texto_(d.descricao, 3000);
  if (desc.length < 10) throw new Error('Não foi possível enviar: descreva o problema (pelo menos 10 letras). Exemplo: "a autoclave não completa o ciclo e apita no final"');
  var solicitante = Ast_texto_(d.solicitante, 120) || eu.nome;
  var contato = Ast_texto_(d.contato, 200);
  if (eu.cliente && contato.length < 8) throw new Error('Não foi possível enviar: informe um telefone ou e-mail para a equipe técnica falar com você');
  var origem = ['PORTAL', 'QR', 'EMAIL'].indexOf(Ast_up_(d.origem)) >= 0 ? Ast_up_(d.origem) : (eu.cliente ? 'PORTAL' : 'EMAIL');
  var s = Ast_comTrava_(function () {
    return Ast_inserir_(AST_ABAS.SOLICITACOES, { NUMERO: Ast_proximoNumero_('SOL', AST_ABAS.SOLICITACOES), ORIGEM: origem, CLIENTE_ID: v.cli.ID, CLIENTE_NOME: Ast_clienteNome_(v.cli),
      UNIDADE_ID: v.un ? v.un.ID : '', EQUIPAMENTO_ID: v.eq ? v.eq.ID : '', EQUIPAMENTO_TEXTO: v.eq ? Ast_equipTexto_(v.eq) : Ast_texto_(d.equipamentoDescricao, 300),
      SOLICITANTE: solicitante, CONTATO: contato, DESCRICAO: desc, PARADA: AST_PARADA[Ast_up_(d.parada)] ? Ast_up_(d.parada) : '', EMAIL_REF: Ast_texto_(d.emailRef, 200),
      SITUACAO: 'NOVA', POR_ID: eu.id, POR_NOME: eu.nome });
  });
  var t = Ast_triagemPara_();
  Ast_avisar_(t.ids, 'SOLICITACAO', 'Pedido de atendimento do cliente: ' + Ast_clienteNome_(v.cli), (v.eq ? Ast_equipTexto_(v.eq) + '. ' : '') + desc.slice(0, 300) + '\nConverta em chamado em Assistência técnica > Solicitações dos clientes.', s.ID, { evento: 'AT09' });
  return { solicitacao: { id: s.ID, numero: s.NUMERO }, message: 'Pedido ' + s.NUMERO + ' enviado. A equipe técnica analisa e abre o chamado; você acompanha em "Meus chamados".' };
}
function AstC_solicitacoes_(eu, f) {
  Ast_exigir_(eu, 'INTERNO', 'ver as solicitações');
  var so = Ast_up_((f || {}).situacao) || 'NOVA';
  // 29/10/2026: "NOVA" mostra também os pedidos da representada com complemento pedido (ainda na fila)
  return { solicitacoes: Ast_ler_(AST_ABAS.SOLICITACOES).filter(function (s) { var x = Ast_up_(s.SITUACAO); return so === 'TODAS' || x === so || (so === 'NOVA' && x === 'COMPLEMENTO'); })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); })
    .map(function (s) { return { id: s.ID, numero: s.NUMERO, origem: Ast_up_(s.ORIGEM), origemNome: AST_CANAIS[Ast_up_(s.ORIGEM)] || s.ORIGEM, clienteId: s.CLIENTE_ID, clienteNome: s.CLIENTE_NOME,
      unidadeId: s.UNIDADE_ID, equipamentoId: s.EQUIPAMENTO_ID, equipamentoTexto: s.EQUIPAMENTO_TEXTO, solicitante: s.SOLICITANTE, contato: s.CONTATO, descricao: s.DESCRICAO, parada: s.PARADA,
      situacao: Ast_up_(s.SITUACAO), chamadoNumero: s.CHAMADO_NUMERO, descarteMotivo: s.DESCARTE_MOTIVO, em: Ast_br_(s.CRIADO_EM),
      representadaId: Ast_s_(s.REPRESENTADA_ID), representadaNome: Ast_s_(s.REPRESENTADA_NOME), complementoPergunta: Ast_s_(s.COMPLEMENTO_PERGUNTA), complementoResposta: Ast_s_(s.COMPLEMENTO_RESPOSTA) }; }) };
}
/** Converte a solicitação em chamado (o atendente confere prioridade e equipamento). d: campos do chamado + solicitacaoId. */
function AstC_converter_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'converter a solicitação');
  var s = Ast_porId_(AST_ABAS.SOLICITACOES, d && d.solicitacaoId);
  if (!s) throw new Error('Não foi possível converter: a solicitação não foi encontrada. Atualize a fila');
  var rep = Ast_s_(s.REPRESENTADA_ID);
  // 29/10/2026: pedido da representada com complemento pedido também pode ser aceito (a Metrolabs decide que já basta)
  if (Ast_up_(s.SITUACAO) !== 'NOVA' && !(rep && Ast_up_(s.SITUACAO) === 'COMPLEMENTO')) throw new Error('Não foi possível converter: a solicitação ' + s.NUMERO + ' já foi tratada (' + (s.CHAMADO_NUMERO ? 'virou o chamado ' + s.CHAMADO_NUMERO : Ast_up_(s.SITUACAO) === 'CANCELADA' ? 'cancelada pela representada' : 'descartada') + ')');
  var dd = Object.assign({ clienteId: s.CLIENTE_ID, unidadeId: s.UNIDADE_ID, equipamentoId: s.EQUIPAMENTO_ID, equipNaoIdentificado: !s.EQUIPAMENTO_ID, equipamentoDescricao: s.EQUIPAMENTO_TEXTO,
    sintoma: s.DESCRICAO, solicitante: s.SOLICITANTE, contato: s.CONTATO, parada: s.PARADA, canal: rep ? 'REPRESENTACAO' : Ast_up_(s.ORIGEM), origemRef: s.NUMERO }, d || {}, { solicitacaoId: s.ID });
  if (rep && !AST_PRIORIDADES[Ast_up_(dd.prioridade)]) dd.prioridade = Ast_up_(s.PARADA) === 'TOTAL' ? 'P2' : 'P3';
  var r = AstC_abrir_(eu, dd, rep ? { representada: { id: rep, nome: s.REPRESENTADA_NOME, protocolo: s.PROTOCOLO_REPRESENTADA, enquadramento: s.ENQUADRAMENTO_PRETENDIDO } } : {});
  if (r.duplicado) return r;
  Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { SITUACAO: 'CONVERTIDA', CHAMADO_ID: r.chamado.id, CHAMADO_NUMERO: r.chamado.numero, TRATADA_POR_NOME: eu.nome, TRATADA_EM: Ast_agora_(), PAUSA_DESDE: '' });
  if (rep) {
    Ast_evento_('SOLICITACAO', s.ID, 'ACEITE', eu, 'Pedido aceito pela Metrolabs: virou o chamado ' + r.chamado.numero + '.', { numero: s.NUMERO, publico: 'REPRESENTADA', de: 'Enviado', para: 'Aceito' });
    if (typeof Rep_avisarRepresentada_ === 'function') Rep_avisarRepresentada_(rep, s.POR_ID, 'Pedido ' + s.NUMERO + ' aceito: chamado ' + r.chamado.numero, 'A Metrolabs aceitou o pedido ' + s.NUMERO + ' (' + Ast_s_(s.CLIENTE_NOME) + ', ' + Ast_s_(s.EQUIPAMENTO_TEXTO) + '). Ele virou o chamado ' + r.chamado.numero + '.', r.chamado.id, 'RP06');
  }
  return r;
}
function AstC_descartar_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'descartar a solicitação');
  var s = Ast_porId_(AST_ABAS.SOLICITACOES, d && d.solicitacaoId);
  var rep = s ? Ast_s_(s.REPRESENTADA_ID) : '';
  if (!s || !(Ast_up_(s.SITUACAO) === 'NOVA' || (rep && Ast_up_(s.SITUACAO) === 'COMPLEMENTO'))) throw new Error('Não foi possível descartar: a solicitação não está mais na fila. Atualize a tela');
  var m = Ast_texto_(d.motivo, 500);
  if (m.length < 10) throw new Error('Não foi possível ' + (rep ? 'recusar' : 'descartar') + ': escreva o motivo (pelo menos 10 letras), por exemplo ' + (rep ? '"o equipamento não é da representada" ou "cliente fora da área de atendimento"' : '"repetida do chamado CH-2026-0005"'));
  Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { SITUACAO: 'DESCARTADA', DESCARTE_MOTIVO: m, TRATADA_POR_NOME: eu.nome, TRATADA_EM: Ast_agora_(), PAUSA_DESDE: '' });
  if (rep) {
    // 29/10/2026: a representada vê o motivo da recusa e é avisada por e-mail
    Ast_evento_('SOLICITACAO', s.ID, 'RECUSA', eu, 'Pedido recusado pela Metrolabs: ' + m, { numero: s.NUMERO, publico: 'REPRESENTADA', de: 'Enviado', para: 'Recusado' });
    if (typeof Rep_avisarRepresentada_ === 'function') Rep_avisarRepresentada_(rep, s.POR_ID, 'Pedido ' + s.NUMERO + ' recusado', 'A Metrolabs recusou o pedido ' + s.NUMERO + ' (' + Ast_s_(s.CLIENTE_NOME) + '). Motivo: ' + m + '\nSe houver engano, responda pela conversa do pedido.', s.ID, 'RP06');
    return { message: 'Pedido ' + s.NUMERO + ' recusado. A representada vê o motivo e foi avisada por e-mail.' };
  }
  return { message: 'Solicitação ' + s.NUMERO + ' descartada.' };
}
/**
 * 29/10/2026 (módulo Representação): pedir complemento ao pedido da representada. O pedido volta para ela com a pergunta
 * (situação COMPLEMENTO) e o prazo de aceite fica pausado até a resposta.
 */
function AstC_complemento_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'pedir complemento');
  var s = Ast_porId_(AST_ABAS.SOLICITACOES, d && d.solicitacaoId);
  if (!s || !Ast_s_(s.REPRESENTADA_ID) || Ast_up_(s.SITUACAO) !== 'NOVA') throw new Error('Não foi possível pedir complemento: o pedido não está na fila (só pedido de representada ainda não tratado). Atualize a tela');
  var p = Ast_texto_(d.pergunta, 2000);
  if (p.length < 10) throw new Error('Não foi possível pedir complemento: escreva o que falta (pelo menos 10 letras), por exemplo "envie a foto do visor com o código de erro"');
  Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { SITUACAO: 'COMPLEMENTO', COMPLEMENTO_PERGUNTA: p, COMPLEMENTO_EM: Ast_agora_(), COMPLEMENTO_POR_NOME: eu.nome, PAUSA_DESDE: Ast_agora_(), ATUALIZADO_EM: Ast_agora_() });
  Ast_evento_('SOLICITACAO', s.ID, 'COMPLEMENTO', eu, 'A Metrolabs pediu complemento: ' + p, { numero: s.NUMERO, publico: 'REPRESENTADA', de: 'Enviado', para: 'Complemento pedido' });
  if (typeof Rep_avisarRepresentada_ === 'function') Rep_avisarRepresentada_(s.REPRESENTADA_ID, s.POR_ID, 'Pedido ' + s.NUMERO + ': a Metrolabs pediu complemento', 'Para seguir com o pedido ' + s.NUMERO + ' (' + Ast_s_(s.CLIENTE_NOME) + '), a Metrolabs precisa de: ' + p, s.ID, 'RP06');
  return { message: 'Complemento pedido. O prazo de aceite fica pausado até a representada responder.' };
}

// ------------------------------------------------------------
// PEDIDO APROVADO DO COMERCIAL ("Passar aos setores" -> Técnica)
// ------------------------------------------------------------
/** Chamado da Técnica a partir do pedido aprovado (sem valores). Nunca lança: devolve { ok, numero } ou { ok:false, motivo }. */
function Assistencia_doPedidoComercial_(p, o) {
  try {
    Ast_memoLimpar_();
    if (!Ast_ligada_()) return { ok: false, motivo: 'Assistência do SGO+ desligada' };
    Ast_garantirAbas_();
    // 29/10/2026: o item automático "Despesas de deslocamento e estadia" (SGO_Comercial_Precificacao.js) não é serviço técnico
    var itens = Ast_json_(p.ITENS_JSON, []).filter(function (i) { return Ast_up_(i.tipo) !== 'PRODUTO' && !i.auto; });
    var comEq = itens.filter(function (i) { return Ast_s_(i.equipamentoId); });
    var eqId = comEq.length === 1 ? Ast_s_(comEq[0].equipamentoId) : '';
    var desc = itens.map(function (i) { return (i.quantidade || 1) + ' × ' + Ast_s_(i.descricao) + (i.equipamentoTexto ? ' (' + i.equipamentoTexto + ')' : ''); }).join('; ');
    var eu = { id: '', nome: 'Comercial (pedido aprovado)', perfil: 'SISTEMA' };
    var r = AstC_abrir_(eu, { clienteId: p.CLIENTE_ID, unidadeId: p.UNIDADE_ID, equipamentoId: eqId, equipNaoIdentificado: !eqId, equipamentoDescricao: eqId ? '' : (desc || 'Itens do pedido aprovado').slice(0, 300),
      sintoma: 'Pedido aprovado ' + Ast_s_(p.NUMERO) + ' do Comercial: ' + (desc || 'serviço técnico vendido') + '.', solicitante: Ast_s_(p.CONTATO_NOME) || Ast_s_(p.CLIENTE_NOME) || 'Cliente',
      prioridade: 'P3', canal: 'COMERCIAL', origemRef: Ast_s_(p.NUMERO), propostaId: Ast_s_(p.ID), confirmarDuplicado: true }, { sistema: true, porNome: 'Comercial (pedido aprovado)' });
    return { ok: true, numero: r.chamado && r.chamado.numero };
  } catch (e) { console.error('Comercial -> Assistência: ' + ((e && e.message) || e)); return { ok: false, motivo: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// CASOS (reclamação do cliente e problema recorrente, com dono e prazo)
// ------------------------------------------------------------
function AstC_casoPublico_(k) {
  return { id: k.ID, numero: k.NUMERO, tipo: Ast_up_(k.TIPO), tipoNome: AST_CASO_TIPOS[Ast_up_(k.TIPO)] || k.TIPO, clienteId: k.CLIENTE_ID, clienteNome: k.CLIENTE_NOME, chamadoId: k.CHAMADO_ID,
    descricao: k.DESCRICAO, donoId: k.DONO_ID, donoNome: k.DONO_NOME, prazo: Ast_brDia_(k.PRAZO), prazoIso: Ast_dia_(k.PRAZO), situacao: Ast_up_(k.SITUACAO), situacaoNome: AST_CASO_SITUACOES[Ast_up_(k.SITUACAO)] || k.SITUACAO,
    causa: k.CAUSA, acao: k.ACAO, respostaCliente: k.RESPOSTA_CLIENTE, resolvidoEm: Ast_br_(k.RESOLVIDO_EM), atrasado: Ast_up_(k.SITUACAO) !== 'RESOLVIDO' && Ast_dia_(k.PRAZO) && Ast_dia_(k.PRAZO) < Ast_hoje_(), em: Ast_br_(k.CRIADO_EM) };
}
/** d: { id?, tipo, clienteId, chamadoId, descricao, donoId, prazo, situacao, causa, acao, respostaCliente } */
function AstC_salvarCaso_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'registrar a reclamação');
  d = d || {};
  var us = Ast_usuarios_();
  if (d.id) {
    Ast_exigir_(eu, 'GESTAO', 'tratar o caso');
    var k = Ast_porId_(AST_ABAS.CASOS, d.id);
    if (!k) throw new Error('Não foi possível salvar: o caso não foi encontrado. Atualize a lista');
    var campos = { ATUALIZADO_EM: Ast_agora_() };
    ['CAUSA', 'ACAO', 'RESPOSTA_CLIENTE'].forEach(function (c) { var key = { CAUSA: 'causa', ACAO: 'acao', RESPOSTA_CLIENTE: 'respostaCliente' }[c]; if (d[key] !== undefined) campos[c] = Ast_texto_(d[key], 2000); });
    if (d.donoId && us[Ast_s_(d.donoId)]) { campos.DONO_ID = Ast_s_(d.donoId); campos.DONO_NOME = us[Ast_s_(d.donoId)].nome; }
    if (Ast_dia_(d.prazo)) campos.PRAZO = Ast_dia_(d.prazo);
    var sit = Ast_up_(d.situacao);
    if (sit && AST_CASO_SITUACOES[sit]) {
      if (sit === 'RESOLVIDO') {
        var ac = campos.ACAO !== undefined ? campos.ACAO : Ast_s_(k.ACAO), causa = campos.CAUSA !== undefined ? campos.CAUSA : Ast_s_(k.CAUSA);
        if (causa.length < 5 || ac.length < 5) throw new Error('Não foi possível resolver o caso: registre a causa e a ação tomada (pelo menos 5 letras cada). Elas entram no indicador de reclamações');
        campos.RESOLVIDO_EM = Ast_agora_();
      }
      campos.SITUACAO = sit;
    }
    Ast_atualizar_(AST_ABAS.CASOS, k.ID, campos);
    Ast_evento_('CASO', k.ID, 'ATUALIZADO', eu, (campos.SITUACAO ? 'Situação: ' + AST_CASO_SITUACOES[campos.SITUACAO] + '. ' : '') + (campos.ACAO || ''), { numero: k.NUMERO });
    return { caso: AstC_casoPublico_(Object.assign({}, k, campos)), message: 'Caso ' + k.NUMERO + ' salvo.' };
  }
  var tipo = AST_CASO_TIPOS[Ast_up_(d.tipo)] ? Ast_up_(d.tipo) : 'RECLAMACAO';
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(d.clienteId)];
  var ch = d.chamadoId ? Ast_porId_(AST_ABAS.CHAMADOS, d.chamadoId) : null;
  if (!cli && ch) cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(ch.CLIENTE_ID)];
  if (!cli) throw new Error('Não foi possível registrar: escolha o cliente da reclamação');
  var desc = Ast_texto_(d.descricao, 3000);
  if (desc.length < 10) throw new Error('Não foi possível registrar: descreva a reclamação (pelo menos 10 letras), com o que o cliente disse');
  var t = Ast_triagemPara_(us);
  var dono = us[Ast_s_(d.donoId)] ? us[Ast_s_(d.donoId)] : (t.id ? us[t.id] : null);
  var prazo = Ast_dia_(d.prazo) || (typeof Ges_somarDiasUteis_ === 'function' ? Ges_somarDiasUteis_(Ast_hoje_(), 2) : Ast_somarDias_(Ast_hoje_(), 2));
  var k2 = Ast_comTrava_(function () {
    return Ast_inserir_(AST_ABAS.CASOS, { NUMERO: Ast_proximoNumero_('RC', AST_ABAS.CASOS), TIPO: tipo, CLIENTE_ID: cli.ID, CLIENTE_NOME: Ast_clienteNome_(cli), CHAMADO_ID: ch ? ch.ID : '',
      OS_ID: ch ? Ast_s_(ch.OS_ID) : '', DESCRICAO: desc, DONO_ID: dono ? dono.id : '', DONO_NOME: dono ? dono.nome : '', PRAZO: prazo, SITUACAO: 'ABERTO', POR_ID: eu.id, POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  });
  if (ch) { Ast_atualizar_(AST_ABAS.CHAMADOS, ch.ID, { CASO_ID: k2.ID }); Ast_evento_('CHAMADO', ch.ID, 'CASO', eu, 'Reclamação registrada: ' + k2.NUMERO, { numero: ch.NUMERO }); }
  if (dono) Ast_avisar_(dono.id, 'CASO', AST_CASO_TIPOS[tipo] + ' ' + k2.NUMERO + ': ' + Ast_clienteNome_(cli), desc.slice(0, 400) + '\nPrazo para tratar: ' + Ast_brDia_(prazo) + '. Registre a causa, a ação e a resposta ao cliente em Assistência técnica > Reclamações.', k2.ID, { evento: 'AT06', autorId: eu.id });
  return { caso: AstC_casoPublico_(k2), message: 'Reclamação ' + k2.NUMERO + ' registrada para ' + (dono ? dono.nome : 'a gestão') + ' até ' + Ast_brDia_(prazo) + '.' };
}
function AstC_casos_(eu, f) {
  Ast_exigir_(eu, 'INTERNO', 'ver as reclamações');
  var so = Ast_up_((f || {}).situacao);
  return { casos: Ast_ler_(AST_ABAS.CASOS).filter(function (k) { return !so || so === 'TODOS' ? true : (so === 'ABERTOS' ? Ast_up_(k.SITUACAO) !== 'RESOLVIDO' : Ast_up_(k.SITUACAO) === so); })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); }).map(AstC_casoPublico_) };
}
