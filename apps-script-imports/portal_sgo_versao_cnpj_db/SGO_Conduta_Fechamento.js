/****************************************************
 * PROGRAMA DE CONDUTA — FECHAMENTO MENSAL E WIDGET DO FAROL
 *
 * Liga o motor puro (SGO_Conduta_Calculo.js) aos dados reais das abas
 * transacionais. Um fechamento congelado é IMUTÁVEL (regras 10/11/14
 * do briefing) — nada além de Conduta_apiFecharCompetencia_ escreve em
 * qual_fechamento, e ele se recusa a rodar 2x pra mesma competência.
 *
 * "colaboradores(competencia)" = usuários ATIVOS hoje, perfil != CLIENTE
 * (o Portal não guarda histórico datado de desligamento — só um flag
 * binário ATIVO/INATIVO sem data — então um desligado recente não pode
 * ser reconstruído retroativamente pra competências passadas; é uma
 * limitação real do cadastro atual, avisada ao usuário).
 ****************************************************/

function Conduta_apiFecharCompetencia(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var competencia = Conduta_validarCompetencia_(payload.competencia);
  if (competencia >= Conduta_competenciaDe_(Conduta_hojeISO_())) throw new Error('Aguarde o término do mês para congelar a competência.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {

  var existente = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
    .find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === competencia; });
  if (existente && (SGO_UTILS.safeUpper(existente.CONGELADO) === 'TRUE' || existente.CONGELADO === true)) {
    throw new Error('A competência ' + competencia + ' já foi fechada e está congelada — não pode ser fechada de novo.');
  }

  // CORREÇÃO 2026-09-24: o fechamento apurava SEM aplicar os prazos vencidos.
  // Como a transição HOMOLOGADA -> FIRME por decurso de prazo só acontece em
  // Conduta_processarPrazosVencidos_ (checagem diária ou botão manual), e a
  // checagem diária nunca tinha sido ligada nesta instalação, as ocorrências
  // ficavam paradas em HOMOLOGADA -- e só FIRME entra no demérito. Resultado:
  // D zerado, ICO 100, farol verde e bônus pago num mês que podia ser
  // vermelho, sem ninguém errar nada. Agora o fechamento sanea antes de contar.
  Conduta_processarPrazosVencidos_();

  var pendencias = Conduta_pendenciasCompetencia_(competencia);
  if (pendencias.length) throw new Error('Fechamento bloqueado: ' + pendencias.length + ' ocorrência(s) com decisão ou prazo de defesa pendente. Preserve a competência do fato e aguarde os prazos; consulte a prévia.');
  var resultado = Conduta_apurarCompetencia_(competencia);

  var registro;
  if (existente) {
    SGO_DATA.update(CONDUTA_SHEETS.FECHAMENTO, existente.ID, {
      D: resultado.D, N: resultado.n, ICO: resultado.ico, FAROL: resultado.farol,
      TEM_GG: resultado.temGG, SOMBRA: resultado.sombra, CONGELADO: true,
      RESULTADO_JSON: JSON.stringify(resultado.porColaborador),
      FECHADO_EM: Conduta_hojeISO_(), FECHADO_POR: sessao.userId
    });
    registro = SGO_DATA.getById(CONDUTA_SHEETS.FECHAMENTO, existente.ID);
  } else {
    registro = SGO_DATA.insert(CONDUTA_SHEETS.FECHAMENTO, {
      COMPETENCIA: competencia, D: resultado.D, N: resultado.n, ICO: resultado.ico,
      FAROL: resultado.farol, TEM_GG: resultado.temGG, SOMBRA: resultado.sombra,
      CONGELADO: true, RESULTADO_JSON: JSON.stringify(resultado.porColaborador),
      FECHADO_EM: Conduta_hojeISO_(), FECHADO_POR: sessao.userId
    });
  }

  // Geração do relatório narrado não pode travar o fechamento (que é o
  // resultado financeiro crítico e já está persistido/congelado nesse
  // ponto) — falha de IA fica logada, gestor pode gerar de novo depois
  // via Conduta_apiGerarRelatorio.
  try {
    Conduta_gerarRelatorio_(competencia);
  } catch (erroRelatorio) {
    SGO_DATA.log('CONDUTA_RELATORIO_FALHA', sessao.usuario, String(erroRelatorio && erroRelatorio.message || erroRelatorio), 'CONDUTA');
  }

  return { success: true, item: registro };
  } finally { lock.releaseLock(); }
}

/** Competência é o mês do fato, mesmo quando a decisão real ocorre depois. */
function Conduta_pendenciasCompetencia_(competencia) {
  var hoje = Conduta_hojeISO_();
  return SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
    if (Conduta_soComp_(o.COMPETENCIA) !== competencia) return false;
    var status = SGO_UTILS.safeUpper(o.STATUS);
    return ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'EM_RECURSO'].indexOf(status) >= 0 ||
      (status === 'FIRME' && (!o.PRAZO_RECURSO || Conduta_soData_(o.PRAZO_RECURSO) >= hoje));
  }).map(function (o) {
    return { id: o.ID, status: o.STATUS, dataFato: Conduta_soData_(o.DATA_FATO), competencia: competencia,
      prazoContestacao: Conduta_soData_(o.PRAZO_CONTESTACAO), prazoRecurso: Conduta_soData_(o.PRAZO_RECURSO),
      prazoJulgamento: Conduta_soData_(o.PRAZO_JULGAMENTO) };
  });
}

function Conduta_apiPreviaFechamento(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  var competencia = Conduta_validarCompetencia_((payload || {}).competencia);
  var apurado = Conduta_apurarCompetencia_(competencia);
  var pendencias = Conduta_pendenciasCompetencia_(competencia);
  var fechamento = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO).find(function (f) {
    return Conduta_soComp_(f.COMPETENCIA) === competencia;
  });
  var fechamentoCongelado = !!fechamento && (fechamento.CONGELADO === true || SGO_UTILS.safeUpper(fechamento.CONGELADO) === 'TRUE');
  return { competencia: competencia, resultado: apurado, pendencias: pendencias,
    fechamentoCongelado: fechamentoCongelado, fechamentoData: fechamento ? Conduta_soData_(fechamento.FECHADO_EM) : '',
    podeFechar: !fechamentoCongelado && !pendencias.length && competencia < Conduta_competenciaDe_(Conduta_hojeISO_()),
    provisorio: true, mensagem: 'Prévia sem congelamento. Datas reais e prazos de defesa permanecem intactos. ' +
      (apurado.sombra ? 'Modo sombra: valores são simulação, sem pagamento.' : 'Confira as pendências antes de enviar valores à folha.') };
}

/**
 * Núcleo puro-de-dados do fechamento: lê ocorrências/missões/ausências/
 * colaboradores já persistidos e delega toda a matemática pro motor
 * (CondutaCalculo). Não escreve nada — quem persiste é quem chama.
 */
function Conduta_apurarCompetencia_(competencia) {
  var parametros = Conduta_obterParametros_();
  var kSensibilidade = Number(parametros.K_SENSIBILIDADE) || 5.0;
  var icoVerdeMin = Number(parametros.ICO_VERDE_MIN) || 85.0;
  var icoAmareloMin = Number(parametros.ICO_AMARELO_MIN) || 70.0;
  var valorBonus = Number(parametros.VALOR_BONUS_COLETIVO) || 300.0;
  var valorIncentivo = Number(parametros.VALOR_INCENTIVO_MISSAO) || 300.0;
  var modoSombraAte = String(parametros.MODO_SOMBRA_ATE || '');
  var sombra = !!modoSombraAte && competencia <= modoSombraAte.substring(0, 7);

  var colaboradores = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE';
  });

  var ausentes = colaboradores.filter(function (c) { return Conduta_colaboradorAusenteNaCompetencia_(c.ID, competencia); });
  var n = colaboradores.length - ausentes.length;

  var D = Conduta_calcularDCompetencia_(competencia);
  var temGG = Conduta_temGGNaCompetencia_(competencia);
  var ico = CondutaCalculo.calcularICO(D, n || 1, kSensibilidade);
  var farol = CondutaCalculo.determinarFarol(ico, temGG, icoVerdeMin, icoAmareloMin);

  var ocorrenciasGGDoMes = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
    return Conduta_soComp_(o.COMPETENCIA) === competencia && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG';
  });

  var porColaborador = colaboradores.map(function (c) {
    var ggPropria = ocorrenciasGGDoMes.some(function (o) { return String(o.COLABORADOR_ID) === String(c.ID); });
    var qtdMissoesElegiveis = Conduta_qtdMissoesElegiveisColaborador_(competencia, c.ID);

    var apurado = CondutaCalculo.apurarColaborador({
      farol: farol, desligado: false, ggPropria: ggPropria,
      qtdMissoesElegiveis: qtdMissoesElegiveis, sombra: sombra,
      valorBonus: valorBonus, valorIncentivo: valorIncentivo
    });

    return {
      colaboradorId: c.ID,
      nome: c.NOME,
      ggPropria: ggPropria,
      qtdMissoesElegiveis: qtdMissoesElegiveis,
      placar: Conduta_placarIndividual_(competencia, c.ID),
      recebeBonus: apurado.recebeBonus,
      valorBonus: apurado.valorBonus,
      valorIncentivo: apurado.valorIncentivo,
      valorSimuladoBonus: apurado.valorSimuladoBonus,
      valorSimuladoIncentivo: apurado.valorSimuladoIncentivo
    };
  });

  return {
    D: D, n: n, ico: ico, farol: farol, temGG: temGG, sombra: sombra,
    qtdAusentes: ausentes.length, qtdColaboradores: colaboradores.length,
    ocorrenciasGGDoMes: ocorrenciasGGDoMes,
    porColaborador: porColaborador
  };
}

function Conduta_apiObterFechamento(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var fechamento = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
    .find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === Conduta_soComp_(payload.competencia); });
  if (!fechamento) return null;
  return {
    competencia: fechamento.COMPETENCIA, D: fechamento.D, n: fechamento.N, ico: fechamento.ICO,
    farol: fechamento.FAROL, temGG: fechamento.TEM_GG, sombra: fechamento.SOMBRA,
    congelado: fechamento.CONGELADO, fechadoEm: fechamento.FECHADO_EM,
    porColaborador: JSON.parse(fechamento.RESULTADO_JSON || '[]')
  };
}

function Conduta_apiListarFechamentos(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
    .map(function (f) {
      return { competencia: f.COMPETENCIA, D: f.D, n: f.N, ico: f.ICO, farol: f.FAROL, congelado: f.CONGELADO, fechadoEm: f.FECHADO_EM };
    })
    .sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); });
}

// ------------------------------------------------------------
// WIDGET DO FAROL — leitura AO VIVO da competência corrente (nunca
// espera o fechamento oficial), textos determinísticos EXATOS da
// seção 7 do briefing, sem IA.
// ------------------------------------------------------------
function Conduta_apiObterFarolAtual(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  var competencia = Conduta_competenciaDe_(Conduta_hojeISO_());
  var apurado = Conduta_apurarCompetencia_(competencia);

  var parametros = Conduta_obterParametros_();
  var kSensibilidade = Number(parametros.K_SENSIBILIDADE) || 5.0;
  var icoVerdeMin = Number(parametros.ICO_VERDE_MIN) || 85.0;

  var limiteVerdeD = Math.round(((100 - icoVerdeMin) / kSensibilidade) * (apurado.n || 1));
  var titulo, linha;

  if (apurado.temGG) {
    var ultimaGG = apurado.ocorrenciasGGDoMes.slice().sort(function (a, b) { return String(b.DATA_FATO).localeCompare(String(a.DATA_FATO)); })[0];
    titulo = 'Bônus cancelado — infração gravíssima';
    linha = 'Registrada ' + apurado.ocorrenciasGGDoMes.length + ' infração gravíssima em ' +
      (ultimaGG ? ultimaGG.DATA_FATO : competencia) +
      ' — o cancelamento independe do ICO, que está em ' + apurado.ico;
  } else if (apurado.farol === 'VERDE') {
    titulo = 'Bônus preservado';
    linha = 'ICO ' + apurado.ico + ' — a equipe pode acumular mais ' + Math.max(0, limiteVerdeD - apurado.D) + ' pontos de demérito sem sair do verde';
  } else if (apurado.farol === 'AMARELO') {
    titulo = 'Bônus em risco';
    linha = 'ICO ' + apurado.ico + ' — o mês está ' + Math.max(0, apurado.D - limiteVerdeD) + ' pontos de demérito acima do limite do verde. Ainda dá tempo neste mês';
  } else {
    titulo = 'Bônus perdido neste mês';
    linha = 'ICO ' + apurado.ico + ' — não há recuperação dentro do mês. Os incentivos de missão continuam sendo pagos';
  }

  return {
    competencia: competencia, ico: apurado.ico, farol: apurado.farol, temGG: apurado.temGG,
    D: apurado.D, n: apurado.n, sombra: apurado.sombra, titulo: titulo, linha: linha
  };
}
