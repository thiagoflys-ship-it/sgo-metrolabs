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
  return Conduta_fecharCompetencia_(Conduta_validarCompetencia_(payload.competencia), sessao.userId, sessao.usuario, '');
}

/**
 * Fechamento (manual pelo gestor ou automático pela rotina diária — 2026-10-15).
 * quemId: CAD_USUARIOS.ID de quem fechou, ou 'SISTEMA' no automático.
 */
function Conduta_fecharCompetencia_(competencia, quemId, quemNome, observacao) {
  if (competencia >= Conduta_competenciaDe_(Conduta_hojeISO_())) throw new Error('Aguarde o término do mês para congelar a competência.');
  var sessao = { userId: quemId, usuario: quemNome || quemId };
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
  // 17/10/2026: missão com incentivo aguardando a gestão trava o fechamento (depois de
  // congelado o mês, a aprovação não teria mais efeito e o colaborador perderia o valor).
  var missoesPend = Conduta_missoesPendentesCompetencia_(competencia);
  if (missoesPend.length) throw new Error('Fechamento bloqueado: ' + (missoesPend.length === 1 ? '1 missão aguarda' : missoesPend.length + ' missões aguardam') + ' aprovação da gestão em ' + Conduta_nomeCompetencia_(competencia) + '. Abra Programa de conduta > Missões, aprove ou recuse cada uma e feche de novo.');
  var resultado = Conduta_apurarCompetencia_(competencia);

  var registro;
  if (existente) {
    SGO_DATA.update(CONDUTA_SHEETS.FECHAMENTO, existente.ID, {
      D: resultado.D, N: resultado.n, ICO: resultado.ico, FAROL: resultado.farol,
      TEM_GG: resultado.temGG, SOMBRA: resultado.sombra, CONGELADO: true,
      RESULTADO_JSON: JSON.stringify(resultado.porColaborador),
      FECHADO_EM: Conduta_hojeISO_(), FECHADO_POR: sessao.userId, OBSERVACAO: observacao || ''
    });
    registro = SGO_DATA.getById(CONDUTA_SHEETS.FECHAMENTO, existente.ID);
  } else {
    registro = SGO_DATA.insert(CONDUTA_SHEETS.FECHAMENTO, {
      COMPETENCIA: competencia, D: resultado.D, N: resultado.n, ICO: resultado.ico,
      FAROL: resultado.farol, TEM_GG: resultado.temGG, SOMBRA: resultado.sombra,
      CONGELADO: true, RESULTADO_JSON: JSON.stringify(resultado.porColaborador),
      FECHADO_EM: Conduta_hojeISO_(), FECHADO_POR: sessao.userId, OBSERVACAO: observacao || ''
    });
  }
  // 2026-10-15: toda a equipe recebe o aviso do resultado do mês (com ciência registrada)
  try { Conduta_avisarFechamento_(competencia, resultado); } catch (eAviso) { SGO_DATA.log('CONDUTA_AVISO_FALHA', sessao.usuario, String(eAviso && eAviso.message || eAviso), 'CONDUTA'); }

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
  // 2026-10-15 (auditoria): a prévia aplica os prazos vencidos, igual ao fechamento real.
  Conduta_processarPrazosVencidos_();
  var apurado = Conduta_apurarCompetencia_(competencia);
  var pendencias = Conduta_pendenciasCompetencia_(competencia);
  var fechamento = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO).find(function (f) {
    return Conduta_soComp_(f.COMPETENCIA) === competencia;
  });
  var fechamentoCongelado = !!fechamento && (fechamento.CONGELADO === true || SGO_UTILS.safeUpper(fechamento.CONGELADO) === 'TRUE');
  return { competencia: competencia, resultado: apurado, pendencias: pendencias,
    fechamentoCongelado: fechamentoCongelado, fechamentoData: fechamento ? Conduta_soData_(fechamento.FECHADO_EM) : '',
    missoesPendentes: Conduta_missoesPendentesCompetencia_(competencia).map(function (m) { return { id: m.ID, destino: m.DESTINO, data: Conduta_soData_(m.DATA) }; }),
    podeFechar: !fechamentoCongelado && !pendencias.length && !Conduta_missoesPendentesCompetencia_(competencia).length && competencia < Conduta_competenciaDe_(Conduta_hojeISO_()),
    provisorio: true, mensagem: 'Prévia sem congelamento. Datas reais e prazos de defesa permanecem intactos. ' +
      (apurado.sombra ? 'Modo sombra: valores são simulação, sem pagamento.' : 'Confira as pendências antes de enviar valores à folha.') };
}

/**
 * Núcleo puro-de-dados do fechamento: lê ocorrências/missões/ausências/
 * colaboradores já persistidos e delega toda a matemática pro motor
 * (CondutaCalculo). Não escreve nada — quem persiste é quem chama.
 */
// 16/10/2026 (desempenho): a apuração lia as mesmas abas dezenas de vezes
// (por colaborador e por ocorrência — 400 ms com 40 pessoas, e o farol roda
// na tela inicial de todos). Durante uma apuração cada aba é lida uma vez só.
// O cache vive só dentro da chamada (o processo do servidor é reaproveitado).
var CONDUTA_CACHE_LEITURA = null;
function Conduta_ler_(aba) {
  if (!CONDUTA_CACHE_LEITURA) return SGO_DATA.getAll(aba);
  if (!CONDUTA_CACHE_LEITURA[aba]) CONDUTA_CACHE_LEITURA[aba] = SGO_DATA.getAll(aba);
  return CONDUTA_CACHE_LEITURA[aba];
}

function Conduta_apurarCompetencia_(competencia) {
  var dono = !CONDUTA_CACHE_LEITURA;
  if (dono) CONDUTA_CACHE_LEITURA = {};
  try { return Conduta_apurarCompetenciaSemCache_(competencia); }
  finally { if (dono) CONDUTA_CACHE_LEITURA = null; }
}

function Conduta_apurarCompetenciaSemCache_(competencia) {
  var parametros = Conduta_obterParametros_();
  var kSensibilidade = Number(parametros.K_SENSIBILIDADE) || 5.0;
  var icoVerdeMin = Number(parametros.ICO_VERDE_MIN) || 85.0;
  var icoAmareloMin = Number(parametros.ICO_AMARELO_MIN) || 70.0;
  var valorBonus = Number(parametros.VALOR_BONUS_COLETIVO) || 300.0;
  var valorIncentivo = Number(parametros.VALOR_INCENTIVO_MISSAO) || 300.0;
  // 2026-10-15: normaliza o parâmetro (pode voltar como data completa
  // 'AAAA-MM-DDTHH:mm:ss' ou texto 'AAAA-MM'); vazio = programa valendo.
  var modoSombraAte = Conduta_soComp_(parametros.MODO_SOMBRA_ATE);
  var sombra = !!modoSombraAte && competencia <= modoSombraAte;

  // 2026-10-15 (auditoria): a conta do sistema ("Administrador") não é uma
  // pessoa — não entra no divisor n nem recebe linha de bônus.
  var colaboradores = Conduta_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && !Conduta_ehContaGenerica_(u);
  });

  var ausentes = colaboradores.filter(function (c) { return Conduta_colaboradorAusenteNaCompetencia_(c.ID, competencia); });
  var n = colaboradores.length - ausentes.length;

  var D = Conduta_calcularDCompetencia_(competencia);
  var temGG = Conduta_temGGNaCompetencia_(competencia);
  var ico = CondutaCalculo.calcularICO(D, n || 1, kSensibilidade);
  var farol = CondutaCalculo.determinarFarol(ico, temGG, icoVerdeMin, icoAmareloMin);

  var ocorrenciasGGDoMes = Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
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
  var sessaoF = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  // 2026-10-15 (auditoria): o resultado individual de todos fica com a gestão;
  // cada pessoa da equipe vê só a própria linha.
  var gestorF = Conduta_podeConsultarTodos_(sessionId); // gestão ou RH (consulta)
  var fechamento = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
    .find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === Conduta_soComp_(payload.competencia); });
  if (!fechamento) return null;
  return {
    competencia: Conduta_soComp_(fechamento.COMPETENCIA), D: fechamento.D, n: fechamento.N, ico: fechamento.ICO,
    farol: fechamento.FAROL, temGG: fechamento.TEM_GG, sombra: fechamento.SOMBRA,
    congelado: fechamento.CONGELADO, fechadoEm: Conduta_soData_(fechamento.FECHADO_EM),
    fechadoPor: fechamento.FECHADO_POR === 'SISTEMA' ? 'Fechamento automático' : fechamento.FECHADO_POR, observacao: fechamento.OBSERVACAO || '',
    porColaborador: JSON.parse(fechamento.RESULTADO_JSON || '[]').filter(function (l) { return gestorF || String(l.colaboradorId) === String(sessaoF.userId); })
  };
}

function Conduta_apiListarFechamentos(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
    .map(function (f) {
      return { competencia: Conduta_soComp_(f.COMPETENCIA), D: f.D, n: f.N, ico: f.ICO, farol: f.FAROL, congelado: f.CONGELADO, fechadoEm: Conduta_soData_(f.FECHADO_EM),
        automatico: f.FECHADO_POR === 'SISTEMA', observacao: f.OBSERVACAO || '' };
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

  var icoAmareloMinF = Number(parametros.ICO_AMARELO_MIN) || 70.0;
  var anteriorF = Conduta_resumoMesAnterior_(competencia);
  var limiteVerdeD = Math.round(((100 - icoVerdeMin) / kSensibilidade) * (apurado.n || 1));
  // 19/10/2026: o mesmo arredondamento do limite do verde, para a barra "margem até o vermelho" do farol amarelo.
  var limiteAmareloD = Math.round(((100 - icoAmareloMinF) / kSensibilidade) * (apurado.n || 1));
  var titulo, linha;

  if (apurado.temGG) {
    var ultimaGG = apurado.ocorrenciasGGDoMes.slice().sort(function (a, b) { return String(b.DATA_FATO).localeCompare(String(a.DATA_FATO)); })[0];
    titulo = 'Bônus cancelado — infração gravíssima';
    var qtdGG = apurado.ocorrenciasGGDoMes.length;
    linha = (qtdGG === 1 ? 'Registrada 1 infração gravíssima' : 'Registradas ' + qtdGG + ' infrações gravíssimas') + ' — a última em ' +
      (ultimaGG ? Conduta_dataBr_(ultimaGG.DATA_FATO) : Conduta_nomeCompetencia_(competencia)) +
      '. O cancelamento independe do índice de conduta, que está em ' + Conduta_numBr_(apurado.ico);
  } else if (apurado.farol === 'VERDE') {
    titulo = 'Bônus preservado';
    linha = 'Índice de conduta ' + Conduta_numBr_(apurado.ico) + ' — a equipe pode acumular mais ' + Math.max(0, limiteVerdeD - apurado.D) + ' pontos de demérito sem sair do verde';
  } else if (apurado.farol === 'AMARELO') {
    titulo = 'Bônus em risco';
    linha = 'Índice de conduta ' + Conduta_numBr_(apurado.ico) + ' — o mês já tem ' + Math.max(0, apurado.D - limiteVerdeD) + ' pontos de demérito além do limite do verde. Ainda dá tempo de voltar ao verde neste mês';
  } else {
    titulo = 'Bônus perdido neste mês';
    linha = 'Índice de conduta ' + Conduta_numBr_(apurado.ico) + ' — não há recuperação dentro do mês. Os incentivos de missão continuam sendo pagos';
  }

  return {
    competencia: competencia, ico: apurado.ico, farol: apurado.farol, temGG: apurado.temGG,
    D: apurado.D, n: apurado.n, sombra: apurado.sombra, titulo: titulo, linha: linha,
    // 2026-10-15: o farol passou a mostrar o que ainda está em prazo de defesa
    // (vai contar quando ficar firme) e o resultado do mês anterior.
    emApuracao: Conduta_emApuracao_(competencia, apurado),
    anterior: anteriorF,
    rotinaPendente: Conduta_rotinaPendente_(anteriorF),
    // 19/10/2026 (farol em tempo real): só leitura para o desenho — limites do
    // programa (faixas do velocímetro), margens em pontos, evolução do índice e
    // o carimbo de versão (a tela só busca o farol de novo quando ele muda).
    limites: { verde: icoVerdeMin, amarelo: icoAmareloMinF },
    limiteVerdeD: limiteVerdeD, limiteAmareloD: limiteAmareloD,
    serie: Conduta_serieFarol_(competencia, apurado, kSensibilidade),
    versao: Conduta_versaoFarol_()
  };
}

/**
 * 19/10/2026: evolução do índice para o mini gráfico do farol. Não muda nenhum
 * cálculo: usa CondutaCalculo.calcularICO com o mesmo divisor n e o mesmo K.
 *  - dias: índice de cada dia do mês corrente até hoje, somando as ocorrências
 *    FIRMES do mês pela data do fato (o último ponto é o índice de agora);
 *  - meses: últimos 6 meses fechados (valor congelado do fechamento).
 */
function Conduta_serieFarol_(competencia, apurado, kSensibilidade) {
  var saida = { dias: [], meses: [] };
  try {
    var hoje = Conduta_hojeISO_();
    var ultimoDia = Conduta_soComp_(hoje) === competencia ? Number(hoje.substring(8, 10)) : Number(Conduta_ultimoDiaCompetencia_(competencia).substring(8, 10));
    var porDia = {};
    Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA).forEach(function (o) {
      if (Conduta_soComp_(o.COMPETENCIA) !== competencia || SGO_UTILS.safeUpper(o.STATUS) !== 'FIRME') return;
      var d = Conduta_soData_(o.DATA_FATO);
      var dia = (Conduta_soComp_(d) === competencia) ? Number(d.substring(8, 10)) : 1;
      if (!(dia >= 1)) dia = 1;
      if (dia > ultimoDia) dia = ultimoDia;
      porDia[dia] = (porDia[dia] || 0) + (Number(o.PESO_APLICADO) || 0);
    });
    var acum = 0;
    for (var dd = 1; dd <= ultimoDia; dd++) {
      acum += porDia[dd] || 0;
      saida.dias.push({ dia: competencia + '-' + String(dd).padStart(2, '0'), D: acum, ico: CondutaCalculo.calcularICO(acum, apurado.n || 1, kSensibilidade) });
    }
    // o último ponto é sempre o índice oficial de agora
    if (saida.dias.length) { saida.dias[saida.dias.length - 1].ico = apurado.ico; saida.dias[saida.dias.length - 1].D = apurado.D; }
    saida.meses = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO)
      .filter(function (f) { return Conduta_soComp_(f.COMPETENCIA) < competencia && (f.CONGELADO === true || SGO_UTILS.safeUpper(f.CONGELADO) === 'TRUE') && isFinite(Number(f.ICO)) && String(f.ICO) !== ''; })
      .map(function (f) { return { competencia: Conduta_soComp_(f.COMPETENCIA), nome: Conduta_nomeCompetencia_(Conduta_soComp_(f.COMPETENCIA)), ico: Number(f.ICO), farol: f.FAROL, D: Number(f.D) || 0 }; })
      .sort(function (a, b) { return String(a.competencia).localeCompare(String(b.competencia)); })
      .slice(-6);
  } catch (e) { /* a série é só desenho: falha nunca derruba o farol */ }
  return saida;
}

/** 19/10/2026: carimbo de versão do farol (muda a cada gravação do Programa de conduta e a cada dia). */
var CONDUTA_FAROL_VERSAO_PROP = 'CONDUTA_FAROL_VERSAO';
function Conduta_versaoFarol_() {
  var v = '';
  try { v = PropertiesService.getScriptProperties().getProperty(CONDUTA_FAROL_VERSAO_PROP) || ''; } catch (e) {}
  return (v || '0') + '|' + Conduta_hojeISO_();
}
function Conduta_marcarMudancaFarol_() {
  try { PropertiesService.getScriptProperties().setProperty(CONDUTA_FAROL_VERSAO_PROP, String(Date.now())); } catch (e) {}
}
/** Consulta leve da tela: devolve só o carimbo; a tela pede o farol inteiro quando ele muda. */
function Conduta_apiObterVersaoFarol(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return { versao: Conduta_versaoFarol_() };
}
