/****************************************************
 * SERVIÇO TÉCNICO PELA NOVA ATIVIDADE (26/10/2026, agenda única aprovada pelo dono, etapa 4)
 *
 * Em Atividades da equipe > Nova atividade, a opção "É serviço técnico em cliente" abre o serviço na Assistência técnica,
 * sem lançar duas vezes: chamado (canal Interno, serviço iniciado pela empresa) → triagem "Planejar visita" → O.S.
 * agendada ao técnico. A atividade do técnico nasce sozinha no agendamento (ligada à O.S.; quem manda é a O.S.).
 * Regras (ajustes da pesquisa aprovada):
 *  - só quem agenda na Assistência (gestão da área Técnica, Diretoria, Administrador); os demais veem a opção apagada;
 *  - chamado aberto do mesmo equipamento: pergunta "é um destes?" antes de abrir outro (chamado do cliente continua pela
 *    triagem da Assistência; esta opção é para preventiva, retorno, visita e o que a empresa inicia);
 *  - tudo é conferido ANTES de abrir o chamado (tipo, técnico, horário, duração, preparo e conflito de agenda), para nada
 *    ficar pela metade; conflito com O.S. ou tarefa do Auvo do técnico: avisa e a gestão decide (com motivo).
 * Funções da tela (Atividades): Atividades_apiServicoOpcoes, Atividades_apiServicoEquipamentos, Atividades_apiServicoCriar.
 ****************************************************/

var AST_PRIORIDADE_DA_ATIVIDADE = { Urgente: 'P1', Alta: 'P2', Normal: 'P3', Baixa: 'P4' };

function AstS_resposta_(sessionId, fn) {
  try {
    Ast_memoLimpar_();
    var eu = Ast_eu_(sessionId);
    if (eu.cliente || eu.nivel === 'NENHUM') return { ok: false, message: 'Não foi possível abrir o serviço técnico: esta parte é da equipe interna da Metrolabs.' };
    try { Ast_garantirAbas_(); Ast_garantirSemente_(); } catch (e) {}
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, fn(eu) || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, message: (/^Não foi possível/.test(m) ? m : 'Não foi possível abrir o serviço técnico: ' + m) + '.' };
  }
}

/** Para o formulário: se a pessoa pode usar a opção (e por quê não), tipos de serviço com visita e técnicos. */
function Atividades_apiServicoOpcoes(sessionId) {
  return AstS_resposta_(sessionId, function (eu) {
    var pode = !!eu.gestao, ligada = Ast_ligada_();
    return {
      podeServico: pode && ligada, ligada: ligada,
      motivo: !pode ? 'Só quem agenda na Assistência técnica (gestão da área Técnica, Diretoria e Administrador) abre serviço técnico por aqui. Lance como tarefa interna ou peça a um deles.'
        : !ligada ? 'A Assistência técnica está desligada pela gestão (Regras da assistência). Enquanto isso, o atendimento segue pelo Auvo.' : '',
      tipos: pode ? Ast_tipos_(false).filter(function (t) { return !t.semVisita; }).map(function (t) { return { codigo: t.codigo, nome: t.nome }; }) : [],
      tecnicos: pode ? Ast_tecnicos_().map(function (t) { return { id: t.id, nome: t.nome }; }) : [],
      preparo: AST_PREPARO.map(function (k) { return { chave: k[0], nome: k[1] }; }),
      duracaoPadraoMin: Number((Ast_regras_().agenda || {}).duracaoPadraoMin) || 90
    };
  });
}

/** Unidades e equipamentos do cliente (a mesma busca da Assistência). */
function Atividades_apiServicoEquipamentos(sessionId, payload) {
  return AstS_resposta_(sessionId, function (eu) {
    Ast_exigir_(eu, 'GESTAO', 'listar os equipamentos do cliente');
    return AstP_buscarCadastro_(eu, { clienteId: Ast_s_((payload || {}).clienteId) });
  });
}

/**
 * Abre o serviço: chamado → triagem (Planejar visita) → O.S. agendada. Devolve { chamado, os, message },
 * { duplicado, abertos, message } ou { conflito, conflitos, message } (nada é criado nesses dois casos).
 * payload: { clienteId, unidadeId, equipamentoId, descricao, solicitante, prioridade (da atividade), tipoCodigo, tecnicoId,
 *            inicio, duracaoMin, preparo: { ferramentas, instrumentos, acesso, documentacao, pecas, pecasJustificativa, risco },
 *            orientacao, confirmarDuplicado, confirmarConflito, motivoConflito }
 */
function Atividades_apiServicoCriar(sessionId, payload) {
  return AstS_resposta_(sessionId, function (eu) {
    var d = payload || {}, acao = 'abrir o serviço técnico';
    Ast_exigir_(eu, 'GESTAO', acao);
    if (!Ast_ligada_()) throw new Error('Não foi possível ' + acao + ': a Assistência técnica está desligada pela gestão (Regras da assistência). Enquanto isso, o atendimento segue pelo Auvo');
    // 1. confere tudo antes de abrir o chamado
    var tipo = Ast_tipo_(d.tipoCodigo);
    if (!tipo || tipo.semVisita) throw new Error('Não foi possível ' + acao + ': escolha o tipo de serviço (define o checklist, as fotos e o que o relatório exige)');
    var us = Ast_usuarios_(), tec = us[Ast_s_(d.tecnicoId)];
    if (!tec || !tec.ativo || Ast_tecnicos_(us).map(function (t) { return t.id; }).indexOf(tec.id) < 0) throw new Error('Não foi possível ' + acao + ': escolha o técnico na lista (usuários ativos com perfil Técnico ou da área Técnica)');
    var iniMs = Ast_ms_(d.inicio);
    if (iniMs === null) throw new Error('Não foi possível ' + acao + ': informe a data e a hora do atendimento');
    if (iniMs < Date.now() - 10 * 60000) throw new Error('Não foi possível ' + acao + ': o horário ' + Ast_br_(Ast_agora_(iniMs)) + ' já passou. Escolha um horário futuro');
    var dur = Math.round(Ast_num_(d.duracaoMin));
    if (!(dur >= 15 && dur <= 24 * 60)) throw new Error('Não foi possível ' + acao + ': informe a duração estimada (de 15 minutos a 24 horas)');
    var p = d.preparo || {};
    AST_PREPARO.forEach(function (k) { if (!(p[k[0]] === true || String(p[k[0]]) === 'true')) throw new Error('Não foi possível ' + acao + ': confirme no preparo "' + k[1] + '"'); });
    if (!(p.pecas === true || String(p.pecas) === 'true') && Ast_texto_(p.pecasJustificativa, 500).length < 5) throw new Error('Não foi possível ' + acao + ': confirme que as peças estão separadas ou escreva por que não precisa (ex.: "visita preventiva, sem peça")');
    if (Ast_texto_(p.risco, 500).length < 3) throw new Error('Não foi possível ' + acao + ': registre a avaliação de risco do atendimento (ex.: "baixo, equipamento desligado na chegada")');
    var descricao = Ast_texto_(d.descricao, 3000);
    if (descricao.length < 10) throw new Error('Não foi possível ' + acao + ': descreva o serviço na descrição da atividade (pelo menos 10 letras). Ela vai para o chamado e para o técnico');
    var conf = AstA_conflitos_(tec.id, iniMs, iniMs + dur * 60000, '');
    if (conf.length && !Ast_sim_(d.confirmarConflito)) {
      return { conflito: true, conflitos: conf, message: tec.nome + ' já tem compromisso nesse horário: ' + conf.map(function (x) { return x.texto; }).join('; ') + '. Escolha outro horário ou outro técnico, ou marque "Agendar mesmo assim" e escreva o motivo.' };
    }
    if (conf.length && Ast_texto_(d.motivoConflito, 500).length < 5) throw new Error('Não foi possível ' + acao + ' com conflito de agenda: escreva o motivo (pelo menos 5 letras). Ele fica no histórico e a gestão é avisada');
    // 2. chamado (mesmo equipamento com chamado aberto: "é um destes?")
    var r1 = AstC_abrir_(eu, { clienteId: d.clienteId, unidadeId: d.unidadeId, equipamentoId: d.equipamentoId, sintoma: descricao,
      solicitante: Ast_texto_(d.solicitante, 120) || ('Metrolabs (' + eu.nome + ')'), prioridade: AST_PRIORIDADE_DA_ATIVIDADE[d.prioridade] || 'P3', parada: 'NAO', canal: 'INTERNO',
      tipoCodigo: tipo.codigo, confirmarDuplicado: d.confirmarDuplicado });
    if (r1 && r1.duplicado) {
      return { duplicado: true, abertos: r1.abertos, message: 'Este equipamento já tem chamado em aberto na Assistência técnica: ' + r1.abertos.map(function (x) { return x.numero + ' (' + x.situacao + ')'; }).join(', ') +
        '. É um destes? Se for, acompanhe pelo chamado (Assistência técnica > Chamados). Se for outro serviço, marque "É outro serviço" e salve de novo.' };
    }
    var c = r1.chamado;
    // 3. triagem: serviço iniciado pela empresa, caminho "Planejar visita"
    AstC_triagem_(eu, { id: c.id, tipoCodigo: tipo.codigo, acao: 'PLANEJADO', observacao: 'Serviço aberto pela Nova atividade (Atividades da equipe)',
      checklist: { sintomas_confirmados: 'Serviço iniciado pela Metrolabs, aberto por ' + eu.nome + ' em Atividades da equipe.', risco_operar: Ast_texto_(p.risco, 500), diagnostico_preliminar: descricao.slice(0, 1000) } });
    // 4. agenda: cria a O.S. e a atividade do técnico (ligada à O.S.)
    var r3 = AstA_agendar_(eu, { id: c.id, tecnicoId: tec.id, inicio: d.inicio, duracaoMin: dur, tipoCodigo: tipo.codigo, preparo: p, orientacao: Ast_texto_(d.orientacao, 1500),
      confirmarConflito: conf.length ? true : '', motivoConflito: d.motivoConflito });
    var os = r3 && r3.os ? r3.os : null;
    return { chamado: { id: c.id, numero: c.numero }, os: os ? { id: os.id || os.ID, numero: os.numero || os.NUMERO } : null,
      message: 'Serviço técnico aberto: chamado ' + c.numero + (os ? ' e O.S. ' + (os.numero || os.NUMERO) : '') + ' agendada para ' + tec.nome + ' em ' + Ast_br_(Ast_agora_(iniMs)) +
        '. A atividade do técnico foi criada sozinha: aparece no Gantt (azul), em Minhas atividades e no aplicativo dele. O acompanhamento técnico é na Assistência.' };
  });
}
