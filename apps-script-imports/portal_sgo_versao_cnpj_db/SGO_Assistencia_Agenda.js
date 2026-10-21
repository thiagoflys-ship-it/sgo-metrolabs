/****************************************************
 * ASSISTÊNCIA TÉCNICA — AGENDA E DESPACHO (21/10/2026)
 *
 * Só a gestão da área Técnica agenda. Agendar exige técnico (usuário ativo com perfil Técnico ou da área Técnica), data,
 * duração, tipo de serviço e o preparo (ferramentas, instrumentos calibrados, acesso, documentação, peças e risco).
 * Conflito de horário (outra O.S. do SGO+, tarefa aberta do Auvo no mesmo horário, ausência no ponto) é mostrado e só
 * segue com a confirmação e o motivo da gestão (como no COMMAND: avisa, não proíbe). Reagendar exige motivo e avisa o
 * técnico e o cliente. Agenda por técnico (dia e semana), rota do dia na ordem da gestão (sem roteirização automática)
 * e sugestão de veículo livre da Frota no horário, com reserva em um toque.
 ****************************************************/

/** Ausências do período por pessoa (Programa de conduta: férias e afastamentos; ponto: dispensas do RH). Lê cada aba uma vez. */
function AstA_ausencias_(diaIni, diaFim) {
  var m = {};
  var add = function (uid, de, ate, motivo) { if (uid && de && ate && de <= diaFim && ate >= diaIni) (m[uid] = m[uid] || []).push({ de: de, ate: ate, motivo: motivo }); };
  try {
    if (typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS && CONDUTA_SHEETS.AUSENCIA) {
      Ast_ler_(CONDUTA_SHEETS.AUSENCIA).forEach(function (a) {
        if (Ast_s_(a.EXCLUIDA_EM)) return;
        add(Ast_s_(a.COLABORADOR_ID), Ast_dia_(a.DATA_INICIO), Ast_dia_(a.DATA_FIM), Ast_up_(a.TIPO) === 'FERIAS' ? 'férias' : 'afastamento');
      });
    }
  } catch (e) {}
  try {
    if (typeof PONTO_ABAS !== 'undefined' && PONTO_ABAS.DISPENSAS) {
      Ast_ler_(PONTO_ABAS.DISPENSAS).forEach(function (d) {
        if (Ast_s_(d.EXCLUIDA_EM)) return;
        add(Ast_s_(d.USUARIO_ID), Ast_dia_(d.DE), Ast_dia_(d.ATE), ((typeof PONTO_MOTIVOS_DISPENSA !== 'undefined' && PONTO_MOTIVOS_DISPENSA[Ast_up_(d.MOTIVO)]) || 'dispensa').toLowerCase());
      });
    }
  } catch (e2) {}
  return m;
}

/** O que ocupa o técnico em [ini, fim): O.S. do SGO+ e tarefas abertas do Auvo (pela fonte única). */
function AstA_conflitos_(tecnicoId, iniMs, fimMs, ignorarOsId) {
  var saida = [];
  Ast_ler_(AST_ABAS.OS).forEach(function (o) {
    if (Ast_s_(o.ID) === Ast_s_(ignorarOsId) || Ast_s_(o.TECNICO_ID) !== Ast_s_(tecnicoId) || AST_OS_OCUPA_AGENDA.indexOf(Ast_up_(o.SITUACAO)) < 0) return;
    var a = Ast_ms_(o.AGENDADO_PARA); if (a === null) return;
    var b = a + (Number(o.DURACAO_MIN) || 60) * 60000;
    if (a < fimMs && iniMs < b) saida.push({ origem: 'SGO', numero: Ast_s_(o.NUMERO), texto: 'O.S. ' + Ast_s_(o.NUMERO) + ' (' + Ast_s_(o.CLIENTE_NOME) + ') de ' + Ast_hora_(Ast_agora_(a)) + ' a ' + Ast_hora_(Ast_agora_(b)) });
  });
  if (typeof SGO_Atendimentos_linhas_ === 'function') {
    try {
      SGO_Atendimentos_linhas_({ origem: 'AUVO' }).forEach(function (t) {
        if (Ast_s_(t.TECNICO_ID_SGO) !== Ast_s_(tecnicoId) || Ast_up_(t.FINALIZADA) === 'SIM') return;
        var a = Ast_ms_(t.DATA_TAREFA); if (a === null) return;
        var b = a + 60 * 60000;
        if (a < fimMs && iniMs < b) saida.push({ origem: 'AUVO', numero: Ast_s_(t.AUVO_TASK_ID), texto: 'tarefa ' + Ast_s_(t.AUVO_TASK_ID) + ' do Auvo (' + Ast_s_(t.CLIENTE_NOME_AUVO) + ') às ' + Ast_hora_(Ast_agora_(a)) });
      });
    } catch (e) {}
  }
  var dIni = Ast_agora_(iniMs).slice(0, 10), dFim = Ast_agora_(fimMs).slice(0, 10);
  ((AstA_ausencias_(dIni, dFim))[Ast_s_(tecnicoId)] || []).forEach(function (x) {
    saida.push({ origem: 'AUSENCIA', numero: '', texto: x.motivo + ' de ' + Ast_brDia_(x.de) + ' a ' + Ast_brDia_(x.ate) });
  });
  return saida;
}

/**
 * Agenda (ou reagenda) o atendimento. d: { id (chamado), tecnicoId, inicio ('aaaa-mm-ddThh:mm'), duracaoMin, tipoCodigo, orientacao,
 *   preparo:{ ferramentas, instrumentos, acesso, documentacao, pecas, pecasJustificativa, risco, observacoes }, motivo (reagendar), confirmarConflito, motivoConflito }
 * Com conflito sem confirmação devolve { conflito:true, conflitos, message } sem gravar nada.
 */
function AstA_agendar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'agendar o atendimento');
  d = d || {};
  var c = AstC_obter_(eu, d.id, 'agendar o atendimento');
  var s = Ast_up_(c.SITUACAO), reag = s === 'AGENDADO';
  if (s !== 'PLANEJADO' && !reag) throw new Error('Não foi possível agendar: o chamado ' + c.NUMERO + ' está "' + (AST_SITUACOES[s] || s) + '". ' +
    (s === 'ABERTO' || s === 'EM_TRIAGEM' ? 'Conclua a triagem com o caminho "Planejar visita" primeiro.' : s === 'AGUARDANDO_PECA' || s === 'AGUARDANDO_ORCAMENTO' ? 'Quando a peça chegar ou o orçamento for aprovado, toque em "Liberar para agendar".' : 'Só chamado planejado ou já agendado pode ser agendado.'));
  var us = Ast_usuarios_(), tec = us[Ast_s_(d.tecnicoId)];
  var tecnicos = Ast_tecnicos_(us).map(function (t) { return t.id; });
  if (!tec || !tec.ativo || tecnicos.indexOf(tec.id) < 0) throw new Error('Não foi possível agendar: escolha um técnico da lista (usuários ativos com perfil Técnico ou da área Técnica). Para incluir alguém, ajuste o perfil ou a área em Administração > Usuários');
  var iniMs = Ast_ms_(d.inicio);
  if (iniMs === null) throw new Error('Não foi possível agendar: informe a data e a hora do atendimento');
  if (iniMs < Date.now() - 10 * 60000) throw new Error('Não foi possível agendar: o horário ' + Ast_br_(Ast_agora_(iniMs)) + ' já passou (agora são ' + Ast_br_(Ast_agora_()) + '). Escolha um horário futuro');
  var dur = Math.round(Ast_num_(d.duracaoMin));
  if (!(dur >= 15 && dur <= 24 * 60)) throw new Error('Não foi possível agendar: informe a duração estimada (de 15 minutos a 24 horas)');
  var tipo = Ast_tipo_(d.tipoCodigo || c.TIPO_CODIGO);
  if (!tipo) throw new Error('Não foi possível agendar: escolha o tipo de serviço (define o checklist, as fotos e o que o relatório exige)');
  var motivo = Ast_texto_(d.motivo, 500);
  if (reag && motivo.length < 5) throw new Error('Não foi possível reagendar: escreva o motivo (pelo menos 5 letras). O técnico e o cliente recebem o horário novo');
  var p = d.preparo || {}, prep = {};
  AST_PREPARO.forEach(function (k) {
    if (!(p[k[0]] === true || String(p[k[0]]) === 'true')) throw new Error('Não foi possível agendar: confirme no preparo "' + k[1] + '". O preparo evita visita perdida; marque os quatro itens ou resolva antes de agendar');
    prep[k[0]] = true;
  });
  prep.pecas = p.pecas === true || String(p.pecas) === 'true';
  prep.pecasJustificativa = Ast_texto_(p.pecasJustificativa, 500);
  if (!prep.pecas && prep.pecasJustificativa.length < 5) throw new Error('Não foi possível agendar: confirme que as peças estão separadas ou escreva por que não precisa (ex.: "visita de diagnóstico, sem peça")');
  prep.risco = Ast_texto_(p.risco, 500);
  if (prep.risco.length < 3) throw new Error('Não foi possível agendar: registre a avaliação de risco do atendimento (ex.: "baixo, equipamento desligado na chegada")');
  prep.observacoes = Ast_texto_(p.observacoes, 1000);
  var fimMs = iniMs + dur * 60000;
  var osAtual = Ast_porId_(AST_ABAS.OS, c.OS_ID);
  if (osAtual && AST_OS_ABERTAS.indexOf(Ast_up_(osAtual.SITUACAO)) < 0) osAtual = null;
  var conf = AstA_conflitos_(tec.id, iniMs, fimMs, osAtual ? osAtual.ID : '');
  if (conf.length && !Ast_sim_(d.confirmarConflito)) {
    return { conflito: true, conflitos: conf, message: tec.nome + ' já tem compromisso nesse horário: ' + conf.map(function (x) { return x.texto; }).join('; ') +
      '. Escolha outro horário ou outro técnico. Se for isso mesmo (ex.: o atendimento anterior é rápido), marque "Agendar mesmo assim" e escreva o motivo.' };
  }
  var motivoConf = Ast_texto_(d.motivoConflito, 500);
  if (conf.length && motivoConf.length < 5) throw new Error('Não foi possível agendar com conflito: escreva o motivo (pelo menos 5 letras). Ele fica no histórico e a gestão é avisada');
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(c.CLIENTE_ID)] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(c.UNIDADE_ID)] || null;
  var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(c.EQUIPAMENTO_ID)] || null;
  var modelo = tipo.modeloCodigo ? Ast_modelo_(tipo.modeloCodigo) : null;
  var quando = Ast_agora_(iniMs), agora = Ast_agora_();
  var res = Ast_comTrava_(function () {
    var os, tecAnterior = osAtual ? Ast_s_(osAtual.TECNICO_ID) : '';
    var camposOs = { TECNICO_ID: tec.id, TECNICO_NOME: tec.nome, AGENDADO_PARA: quando, DURACAO_MIN: dur, PREPARO_JSON: JSON.stringify(prep), ORIENTACAO: Ast_texto_(d.orientacao, 1500) || (osAtual ? Ast_s_(osAtual.ORIENTACAO) : ''), ATUALIZADO_EM: agora };
    if (osAtual) {
      var mudouTipo = Ast_up_(osAtual.TIPO_CODIGO) !== tipo.codigo && !Ast_s_(osAtual.CHEGOU_EM);
      if (Ast_up_(osAtual.SITUACAO) === 'PAUSADA' || Ast_up_(osAtual.SITUACAO) === 'EM_DESLOCAMENTO') Object.assign(camposOs, { SITUACAO: 'AGENDADA', AGUARDANDO_PECA: '' });
      if (mudouTipo) Object.assign(camposOs, { TIPO_CODIGO: tipo.codigo, TIPO_NOME: tipo.nome, MODELO_CODIGO: modelo ? modelo.codigo : '', MODELO_VERSAO: modelo ? modelo.versao : '', PERGUNTAS_JSON: JSON.stringify(modelo ? modelo.perguntas : []) });
      Ast_atualizar_(AST_ABAS.OS, osAtual.ID, camposOs);
      os = Object.assign({}, osAtual, camposOs);
      Ast_evento_('OS', os.ID, 'REAGENDADO', eu, (motivo || 'Agendamento atualizado') + (conf.length ? ' · CONFLITO confirmado: ' + motivoConf : ''), { numero: os.NUMERO, de: Ast_br_(osAtual.AGENDADO_PARA) + ' · ' + Ast_s_(osAtual.TECNICO_NOME), para: Ast_br_(quando) + ' · ' + tec.nome });
    } else {
      var numero = Ast_proximoNumero_('OS', AST_ABAS.OS);
      os = Ast_inserir_(AST_ABAS.OS, Object.assign({
        NUMERO: numero, CHAMADO_ID: c.ID, CHAMADO_NUMERO: c.NUMERO, SITUACAO: 'AGENDADA', TIPO_CODIGO: tipo.codigo, TIPO_NOME: tipo.nome,
        MODELO_CODIGO: modelo ? modelo.codigo : '', MODELO_VERSAO: modelo ? modelo.versao : '', PERGUNTAS_JSON: JSON.stringify(modelo ? modelo.perguntas : []),
        CLIENTE_ID: c.CLIENTE_ID, CLIENTE_NOME: c.CLIENTE_NOME, UNIDADE_ID: c.UNIDADE_ID, UNIDADE_NOME: c.UNIDADE_NOME, EQUIPAMENTO_ID: c.EQUIPAMENTO_ID, EQUIPAMENTO_TEXTO: c.EQUIPAMENTO_TEXTO,
        ENDERECO: Ast_endereco_(un, cli), SERIE_CADASTRO: eq ? Ast_s_(eq.SERIE) : '', RESPOSTAS_JSON: '{}', QTD_FOTOS: 0, QTD_PECAS: 0, RELATORIO_VERSAO: 0
      }, camposOs));
      Ast_evento_('OS', os.ID, 'AGENDADA', eu, 'O.S. criada para o chamado ' + c.NUMERO + (conf.length ? ' · CONFLITO confirmado: ' + motivoConf : ''), { numero: os.NUMERO, para: Ast_br_(quando) + ' · ' + tec.nome });
    }
    var camposC = { TECNICO_ID: tec.id, TECNICO_NOME: tec.nome, AGENDADO_PARA: quando, DURACAO_MIN: dur, TIPO_CODIGO: tipo.codigo, OS_ID: os.ID, OS_NUMERO: os.NUMERO,
      PROXIMA_ACAO: 'Atendimento em campo ' + Ast_br_(quando) + ' com ' + tec.nome };
    var det = tec.nome + ' · ' + Ast_br_(quando) + ' · ' + Ast_duracaoTxt_(dur) + (reag ? ' · motivo: ' + motivo : '') + (conf.length ? ' · conflito: ' + conf.map(function (x) { return x.texto; }).join('; ') : '');
    var c2;
    if (reag) {
      Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, Object.assign({ ATUALIZADO_EM: agora }, camposC));
      Ast_evento_('CHAMADO', c.ID, 'REAGENDADO', eu, det, { numero: c.NUMERO, de: Ast_br_(c.AGENDADO_PARA), para: Ast_br_(quando), publico: true });
      c2 = Object.assign({}, c, camposC);
    } else c2 = AstC_mudar_(eu, c, 'AGENDADO', camposC, 'AGENDADO', det);
    // avisos: técnico (novo e o anterior, se mudou), cliente (e-mail) e gestão no conflito
    Ast_avisar_(tec.id, reag ? 'OS_REAGENDADA' : 'OS_AGENDADA', (reag ? 'Atendimento reagendado: ' : 'Atendimento agendado para você: ') + os.NUMERO,
      Ast_s_(c.CLIENTE_NOME) + ' · ' + Ast_br_(quando) + ' (' + Ast_duracaoTxt_(dur) + ')\n' + tipo.nome + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO) + (reag ? '\nMotivo: ' + motivo : '') +
        '\nVeja em Meu dia (aplicativo do técnico) ou em Assistência técnica > Minhas O.S.', os.ID, { autorId: eu.id, evento: reag ? 'AT04' : 'AT03' });
    if (tecAnterior && tecAnterior !== tec.id) Ast_avisar_(tecAnterior, 'OS_PASSADA', 'O.S. ' + os.NUMERO + ' passou para ' + tec.nome, 'O atendimento de ' + Ast_s_(c.CLIENTE_NOME) + ' saiu da sua agenda. Motivo: ' + (motivo || 'reagendamento'), os.ID, { autorId: eu.id, evento: 'AT04' });
    if (conf.length) Ast_avisar_(Ast_gestoresTecnica_(us), 'CONFLITO', 'Conflito de agenda confirmado: ' + tec.nome, os.NUMERO + ' em ' + Ast_br_(quando) + ' sobrepõe: ' + conf.map(function (x) { return x.texto; }).join('; ') + '. Motivo: ' + motivoConf, os.ID, { autorId: eu.id });
    // atividade do técnico em Minhas atividades (prazo = fim do atendimento); reagendar muda o prazo e o responsável
    var prazoAtv = Ast_agora_(fimMs).slice(0, 16);
    if (os.ATIVIDADE_ID) Ast_editarAtividade_(os.ATIVIDADE_ID, { prazo: prazoAtv, responsavelId: tec.id, motivo: motivo || 'Agendamento atualizado' });
    else {
      var osId = os.ID;
      Ast_criarAtividade_({ responsavelId: tec.id, titulo: 'Atender ' + os.NUMERO + ' · ' + Ast_s_(c.CLIENTE_NOME), prazo: prazoAtv, prioridade: Ast_up_(c.PRIORIDADE) === 'P1' ? 'Urgente' : 'Alta',
        descricao: tipo.nome + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO) + '\nProblema: ' + Ast_s_(c.SINTOMA).slice(0, 500) + '\nEndereço: ' + (Ast_endereco_(un, cli) || 'ver no cadastro') +
          '\n\nA atividade é concluída sozinha quando a O.S. fecha com a documentação completa.', clienteId: c.CLIENTE_ID, unidadeId: c.UNIDADE_ID,
        porQue: 'Chamado ' + c.NUMERO + ' (' + AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] + ').', onde: Ast_endereco_(un, cli), como: 'Pelo aplicativo do técnico (Meu dia) ou em Assistência técnica > Minhas O.S.' },
        function (idAtv) { Ast_atualizar_(AST_ABAS.OS, osId, { ATIVIDADE_ID: idAtv }); });
    }
    return { os: os, c: c2 };
  });
  if (reag) {
    Ast_depois_(function () {
      Ast_avisarCliente_(res.c, 'Visita técnica reagendada: chamado ' + c.NUMERO, 'Olá. A visita técnica do chamado ' + c.NUMERO + ' (' + Ast_s_(c.EQUIPAMENTO_TEXTO) + ') foi reagendada para ' + Ast_br_(quando) +
        '.\nMotivo: ' + motivo + '\n\nMetrolabs — Assistência técnica', 'AT08');
    });
  }
  var sug = AstA_sugerirVeiculo_(tec.id, iniMs, fimMs, res.os);
  return { chamado: AstC_publico_(res.c, eu, Date.now()), os: typeof AstO_publico_ === 'function' ? AstO_publico_(Ast_porId_(AST_ABAS.OS, res.os.ID) || res.os, eu) : null,
    conflitos: conf, veiculoSugerido: sug,
    message: (reag ? 'Atendimento reagendado' : 'Atendimento agendado') + ': ' + res.os.NUMERO + ' com ' + tec.nome + ' em ' + Ast_br_(quando) + '.' + (conf.length ? ' Conflito registrado e avisado à gestão.' : '') +
      (sug && sug.veiculo ? ' Veículo livre no horário: ' + sug.veiculo.rotulo + ' (toque em "Reservar veículo").' : '') };
}

/** Veículo livre da Frota no horário (com 30 min de folga antes e 60 depois). Nunca lança. */
function AstA_sugerirVeiculo_(tecnicoId, iniMs, fimMs, os) {
  try {
    if (os && Ast_s_(os.RESERVA_ID)) return { jaReservado: true, codigo: Ast_s_(os.RESERVA_CODIGO) };
    if (typeof FrotaRes_livres_ !== 'function') return null;
    var cond = typeof Frota_obterCondutorPorUsuario_ === 'function' ? Frota_obterCondutorPorUsuario_(tecnicoId) : null;
    var livres = FrotaRes_livres_(iniMs - 30 * 60000, fimMs + 60 * 60000, { condutorId: cond ? cond.ID : '' });
    if (!livres.length) return { veiculo: null, motivo: 'nenhum veículo livre no horário' };
    var rot = function (v) { var r = v.placa + (v.modelo ? ' (' + v.modelo + ')' : ''); try { if (typeof FrotaId_rotulo_ === 'function') { var x = FrotaId_rotulo_(Ast_mapa_(SGO_CFG.SHEETS.CAD_VEICULOS)[v.id]); if (x) r = x; } } catch (e) {} return r; };
    return { veiculo: { id: livres[0].id, placa: livres[0].placa, rotulo: rot(livres[0]) }, outros: livres.slice(1, 6).map(function (v) { return { id: v.id, placa: v.placa, rotulo: rot(v) }; }),
      condutor: !!cond, motivo: cond ? '' : 'o técnico não tem condutor vinculado na Frota (Frota > Veículos e condutores > Condutores)' };
  } catch (e) { return null; }
}

/** Reserva o veículo para a O.S. (Frota > Reservas, em nome do técnico). d: { osId, veiculoId } */
function AstA_reservarVeiculo_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'reservar o veículo');
  var os = Ast_porId_(AST_ABAS.OS, d && d.osId);
  if (!os) throw new Error('Não foi possível reservar: a O.S. não foi encontrada. Atualize a tela');
  if (Ast_s_(os.RESERVA_ID)) throw new Error('Não foi possível reservar: a O.S. ' + os.NUMERO + ' já tem a reserva ' + Ast_s_(os.RESERVA_CODIGO) + '. Para trocar o veículo, use Frota > Reservas');
  if (typeof FrotaRes_criar_ !== 'function') throw new Error('Não foi possível reservar: a Frota não está disponível neste servidor');
  var cond = typeof Frota_obterCondutorPorUsuario_ === 'function' ? Frota_obterCondutorPorUsuario_(os.TECNICO_ID) : null;
  if (!cond) throw new Error('Não foi possível reservar: ' + Ast_s_(os.TECNICO_NOME) + ' não tem condutor vinculado na Frota. Vincule em Frota > Veículos e condutores > Condutores e tente de novo');
  var ini = Ast_ms_(os.AGENDADO_PARA) - 30 * 60000, fim = Ast_ms_(os.AGENDADO_PARA) + (Number(os.DURACAO_MIN) || 60) * 60000 + 60 * 60000;
  var dt = function (ms) { var s = Ast_agora_(ms); return { d: s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4), h: s.slice(11, 16) }; };
  var a = dt(ini), b = dt(fim);
  var r = FrotaRes_criar_({ userId: eu.id, usuario: eu.login, nome: eu.nome, perfil: eu.perfil, gestao: true }, {
    tipo: 'USO', veiculoId: Ast_s_(d.veiculoId), condutorId: cond.ID, dataInicio: a.d, horaInicio: a.h, dataFim: b.d, horaFim: b.h,
    destino: (Ast_s_(os.CLIENTE_NOME) + (Ast_s_(os.ENDERECO) ? ', ' + Ast_s_(os.ENDERECO) : '')).slice(0, 200), motivo: ('Atendimento ' + os.NUMERO + ' (' + Ast_s_(os.TIPO_NOME) + ')').slice(0, 300),
    vinculoTipo: 'CLIENTE', vinculoId: Ast_s_(os.CLIENTE_ID) });
  if (!r || !r.ok) throw new Error(String((r && r.message) || 'a Frota não confirmou a reserva').replace(/[.\s]+$/, ''));
  Ast_atualizar_(AST_ABAS.OS, os.ID, { RESERVA_ID: r.id, RESERVA_CODIGO: r.codigo, ATUALIZADO_EM: Ast_agora_() });
  Ast_evento_('OS', os.ID, 'VEICULO', eu, 'Veículo ' + r.placa + ' reservado (reserva ' + r.codigo + ')', { numero: os.NUMERO });
  return { message: r.mensagem || ('Reserva ' + r.codigo + ' feita.'), reserva: { id: r.id, codigo: r.codigo, placa: r.placa } };
}

/** Agenda por técnico. f: { inicio: 'aaaa-mm-dd', dias: 1..14, tecnicoId }. Técnico vê só a própria. */
function AstA_agenda_(eu, f) {
  Ast_exigir_(eu, 'INTERNO', 'ver a agenda');
  f = f || {};
  var ini = /^\d{4}-\d{2}-\d{2}$/.test(Ast_s_(f.inicio)) ? Ast_s_(f.inicio) : Ast_hoje_();
  var dias = Math.max(1, Math.min(14, Number(f.dias) || 1)), fim = Ast_somarDias_(ini, dias - 1);
  var us = Ast_usuarios_();
  var tecnicos = Ast_tecnicos_(us);
  if (!eu.gestao && eu.tecnico) tecnicos = tecnicos.filter(function (t) { return t.id === eu.id; });
  if (f.tecnicoId) tecnicos = tecnicos.filter(function (t) { return t.id === Ast_s_(f.tecnicoId); });
  var ids = tecnicos.map(function (t) { return t.id; });
  var porTec = {};
  ids.forEach(function (id) { porTec[id] = []; });
  Ast_ler_(AST_ABAS.OS).forEach(function (o) {
    var id = Ast_s_(o.TECNICO_ID), dia = Ast_dia_(o.AGENDADO_PARA);
    if (!porTec[id] || !dia || dia < ini || dia > fim || Ast_up_(o.SITUACAO) === 'CANCELADA') return;
    var a = Ast_ms_(o.AGENDADO_PARA);
    porTec[id].push({ origem: 'SGO', id: o.ID, numero: o.NUMERO, chamadoId: o.CHAMADO_ID, chamadoNumero: o.CHAMADO_NUMERO, dia: dia, inicio: Ast_hora_(o.AGENDADO_PARA), fim: Ast_hora_(Ast_agora_(a + (Number(o.DURACAO_MIN) || 60) * 60000)),
      inicioMs: a, duracaoMin: Number(o.DURACAO_MIN) || 60, cliente: o.CLIENTE_NOME, tipo: o.TIPO_NOME, equipamento: o.EQUIPAMENTO_TEXTO, endereco: o.ENDERECO, situacao: Ast_up_(o.SITUACAO),
      situacaoNome: AST_OS_SITUACOES[Ast_up_(o.SITUACAO)] || o.SITUACAO, ordem: Number(o.ORDEM_DIA) || 0, reserva: Ast_s_(o.RESERVA_CODIGO) });
  });
  if (typeof SGO_Atendimentos_linhas_ === 'function') {
    try {
      SGO_Atendimentos_linhas_({ origem: 'AUVO' }).forEach(function (t) {
        var id = Ast_s_(t.TECNICO_ID_SGO), dia = Ast_dia_(t.DATA_TAREFA);
        if (!porTec[id] || !dia || dia < ini || dia > fim) return;
        porTec[id].push({ origem: 'AUVO', id: '', numero: Ast_s_(t.AUVO_TASK_ID), dia: dia, inicio: Ast_hora_(t.DATA_TAREFA), fim: '', inicioMs: Ast_ms_(t.DATA_TAREFA), duracaoMin: 60,
          cliente: Ast_s_(t.CLIENTE_NOME_AUVO), tipo: Ast_s_(t.TIPO_TAREFA), endereco: Ast_s_(t.ENDERECO), situacao: Ast_up_(t.FINALIZADA) === 'SIM' ? 'FINALIZADA_AUVO' : 'ABERTA_AUVO',
          situacaoNome: Ast_up_(t.FINALIZADA) === 'SIM' ? 'Finalizada no Auvo' : 'Aberta no Auvo', link: Ast_s_(t.TASK_URL) });
      });
    } catch (e) {}
  }
  var aus = AstA_ausencias_(ini, fim);
  var reservas = [];
  try {
    if (typeof FrotaRes_todas_ === 'function') {
      var condPorUsuario = {};
      Ast_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { if (Ast_s_(c.USUARIO_ID)) condPorUsuario[Ast_s_(c.ID)] = Ast_s_(c.USUARIO_ID); });
      FrotaRes_todas_().forEach(function (r) {
        var uid = Ast_s_(r.USUARIO_ID) || condPorUsuario[Ast_s_(r.CONDUTOR_ID)];
        if (!porTec[uid] || ['RESERVADA', 'INICIADA'].indexOf(Ast_up_(r.SITUACAO)) < 0) return;
        var di = typeof Frota_textoData_ === 'function' ? Frota_textoData_(r.DATA_INICIO) : Ast_s_(r.DATA_INICIO);
        var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(di); if (!m) return;
        var dia = m[3] + '-' + m[2] + '-' + m[1];
        if (dia < ini || dia > fim) return;
        reservas.push({ tecnicoId: uid, dia: dia, codigo: Ast_s_(r.CODIGO), placa: Ast_s_(r.PLACA), inicio: typeof Frota_textoHora_ === 'function' ? Frota_textoHora_(r.HORA_INICIO) : Ast_s_(r.HORA_INICIO) });
      });
    }
  } catch (e2) {}
  var listaDias = [];
  for (var i = 0; i < dias; i++) listaDias.push(Ast_somarDias_(ini, i));
  return {
    inicio: ini, fim: fim, dias: listaDias.map(function (dd) { return { dia: dd, rotulo: Ast_brDia_(dd + 'T00:00:00'), util: Ast_diaUtil_(dd, Ast_expediente_()) }; }),
    tecnicos: tecnicos.map(function (t) {
      var itens = porTec[t.id].sort(function (a, b) { return a.dia.localeCompare(b.dia) || (a.ordem || 99) - (b.ordem || 99) || (a.inicioMs || 0) - (b.inicioMs || 0); });
      return { id: t.id, nome: t.nome, itens: itens, ausencias: aus[t.id] || [], reservas: reservas.filter(function (r) { return r.tecnicoId === t.id; }) };
    })
  };
}

/** Rota do dia de um técnico: paradas na ordem da gestão (ou do horário), endereço e link do mapa com o caminho todo. */
function AstA_rotaDoDia_(eu, f) {
  f = f || {};
  var tecId = eu.gestao ? (Ast_s_(f.tecnicoId) || eu.id) : eu.id;
  var dia = /^\d{4}-\d{2}-\d{2}$/.test(Ast_s_(f.dia)) ? Ast_s_(f.dia) : Ast_hoje_();
  var ag = AstA_agenda_(eu, { inicio: dia, dias: 1, tecnicoId: tecId });
  var t = ag.tecnicos[0];
  if (!t) throw new Error('Não foi possível montar a rota: o técnico não está na lista de técnicos (perfil Técnico ou área Técnica)');
  var paradas = t.itens.filter(function (x) { return x.origem === 'SGO' || x.situacao === 'ABERTA_AUVO'; });
  var enderecos = paradas.map(function (p) { return Ast_s_(p.endereco); }).filter(Boolean);
  var link = '';
  if (enderecos.length === 1) link = Ast_linkMapa_(enderecos[0]);
  else if (enderecos.length > 1) {
    link = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(enderecos[enderecos.length - 1]) +
      (enderecos.length > 2 ? '&waypoints=' + encodeURIComponent(enderecos.slice(0, -1).join('|')) : '&waypoints=' + encodeURIComponent(enderecos[0]));
  }
  return { tecnico: { id: t.id, nome: t.nome }, dia: dia, rotulo: Ast_brDia_(dia + 'T00:00:00'), paradas: paradas.map(function (p, i) { return Object.assign({ ordemExibida: i + 1, mapa: Ast_linkMapa_(p.endereco) }, p); }),
    linkRota: link, ausencias: t.ausencias, reservas: t.reservas };
}

/** Ordem do dia definida pela gestão. d: { ordem: [osId, ...] } */
function AstA_ordenar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'mudar a ordem do dia');
  var l = (d && Array.isArray(d.ordem) ? d.ordem : []).map(Ast_s_).filter(Boolean);
  if (!l.length) throw new Error('Não foi possível salvar a ordem: a lista veio vazia. Atualize a rota e tente de novo');
  Ast_comTrava_(function () { l.forEach(function (id, i) { if (Ast_porId_(AST_ABAS.OS, id)) Ast_atualizar_(AST_ABAS.OS, id, { ORDEM_DIA: i + 1, ATUALIZADO_EM: Ast_agora_() }); }); });
  return { message: 'Ordem do dia salva. O técnico vê a mesma ordem no Meu dia.' };
}
