/****************************************************
 * PROGRAMA DE CONDUTA — AUSÊNCIAS (férias/afastamento)
 *
 * Não existia nenhum controle de férias/afastamento no Portal antes
 * deste módulo (achado da investigação, ver plano de implementação).
 * Aba nova e enxuta, só o necessário pra excluir a pessoa do divisor
 * `n` do ICO no mês em que há sobreposição (regra 9 do briefing:
 * "Ausente (férias/afastamento): fora do divisor, recebe o bônus" —
 * dois campos distintos, ausente continua elegível ao Bônus Coletivo).
 * Gestão simples (criar/listar/remover), sem fluxo de aprovação.
 ****************************************************/

function Conduta_apiRegistrarAusencia(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};

  var colaboradorId = String(payload.colaboradorId || '').trim();
  if (!colaboradorId) throw new Error('Informe o colaborador.');

  var dataInicio = String(payload.dataInicio || '').trim();
  var dataFim = String(payload.dataFim || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
    throw new Error('Datas de início/fim inválidas (use AAAA-MM-DD).');
  }
  if (dataFim < dataInicio) throw new Error('Data de fim não pode ser anterior à data de início.');

  var tipo = SGO_UTILS.safeUpper(payload.tipo);
  if (tipo !== 'FERIAS' && tipo !== 'AFASTAMENTO') throw new Error('Tipo inválido (use FERIAS ou AFASTAMENTO).');

  var registro = SGO_DATA.insert(CONDUTA_SHEETS.AUSENCIA, {
    COLABORADOR_ID: colaboradorId,
    DATA_INICIO: dataInicio,
    DATA_FIM: dataFim,
    TIPO: tipo,
    REGISTRADO_POR: sessao.userId
  });

  return { success: true, item: registro };
}

function Conduta_apiListarAusencias(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  // 2026-10-15 (auditoria): férias/afastamentos de todos ficam com a gestão; cada um vê os próprios.
  var gestor = isAdminSession(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.AUSENCIA).filter(function (a) {
    if (!gestor && String(a.COLABORADOR_ID) !== String(sessao.userId)) return false;
    if (payload.colaboradorId && String(a.COLABORADOR_ID) !== String(payload.colaboradorId)) return false;
    return true;
  }).map(function (a) {
    a.DATA_INICIO = Conduta_soData_(a.DATA_INICIO); a.DATA_FIM = Conduta_soData_(a.DATA_FIM); return a;
  }).sort(function (a, b) { return String(b.DATA_INICIO).localeCompare(String(a.DATA_INICIO)); });
}

function Conduta_apiRemoverAusencia(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var ok = SGO_DATA.remove(CONDUTA_SHEETS.AUSENCIA, payload.id);
  if (!ok) throw new Error('Ausência não encontrada.');
  return { success: true };
}

/**
 * true se o colaborador tem QUALQUER ausência que sobrepõe a competência
 * informada (YYYY-MM) — usado só pelo fechamento pra montar o divisor
 * `n` do ICO. Sobreposição por intervalo de datas (mês x [inicio,fim]).
 */
function Conduta_colaboradorAusenteNaCompetencia_(colaboradorId, competencia) {
  var inicioMes = competencia + '-01';
  var fimMes = competencia + '-31'; // comparação lexicográfica de string ISO, seguro mesmo em meses curtos
  return SGO_DATA.getAll(CONDUTA_SHEETS.AUSENCIA).some(function (a) {
    if (String(a.COLABORADOR_ID) !== String(colaboradorId)) return false;
    return Conduta_soData_(a.DATA_INICIO) <= fimMes && Conduta_soData_(a.DATA_FIM) >= inicioMes;
  });
}
