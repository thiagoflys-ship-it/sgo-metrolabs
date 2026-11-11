/**
 * ALERTAS DE VENCIMENTO DO DASHBOARD (painel "Alertas e pendências", KPI "alertas vencidos",
 * faixa da Frota e balões Padrões/Frota do menu — JS_Core.html).
 *
 * 17/10/2026: deixou de calcular por conta própria. Lê a central de pendências
 * (SGO_Alertas_Central.js) e devolve só os VENCIMENTOS (padrões, documentos, calibrações,
 * NR-13 e Frota), no formato antigo { tipo: 'CRÍTICO'|'ATENÇÃO', mensagem, dias, origem }.
 * Assim o painel, o KPI, os balões, o Início e a ponte com o COMMAND contam igual:
 * mesma regra de prazo (vencido ou vence hoje = crítico; até 30 dias = atenção), mesma
 * trava de perfil e documento renovado substituindo o anterior.
 * Um alerta por pendência (o balão do menu conta as linhas), já na ordem da central.
 * Campos a mais (sem quebrar quem já lê): id, modulo, rotulo, titulo, detalhe, oQueFazer, tela.
 * Pendência que não é vencimento (atividade, ciência, Auvo, qualidade) fica no Início.
 */
const SGO_ALERTAS = (() => {
  function paraAlerta_(it) {
    return {
      tipo: it.gravidade === 'CRITICO' ? 'CRÍTICO' : 'ATENÇÃO',
      mensagem: it.titulo + '. ' + it.detalhe + (it.oQueFazer ? ' O que fazer: ' + it.oQueFazer : ''),
      dias: it.dias,
      origem: it.origem,
      id: it.id, modulo: it.modulo, rotulo: it.rotulo, titulo: it.titulo, detalhe: it.detalhe, oQueFazer: it.oQueFazer, tela: it.tela
    };
  }

  function obterAlertasDashboard(sessionId) {
    const r = SGO_Pendencias_listar(sessionId, { limite: 2000 });
    const vencimentos = (r.itens || []).filter(it => it.vencimentoTipo);
    return {
      success: true,
      items: vencimentos.map(paraAlerta_),
      resumo: { total: r.resumo.vencimentos.total, criticos: r.resumo.vencimentos.criticos, pendenciasTotal: r.resumo.total, pendenciasCriticas: r.resumo.criticos },
      naoVerificado: r.naoVerificado,
      geradoEm: r.geradoEm
    };
  }

  return { obterAlertasDashboard, paraAlerta_ };
})();

/* =========================
   WRAPPERS PARA GOOGLE.SCRIPT.RUN COM BLINDAGEM JSON
========================= */
function alertasObterDashboard(sessionId) {
  try {
    return JSON.parse(JSON.stringify(SGO_ALERTAS.obterAlertasDashboard(sessionId)));
  } catch (e) {
    return { success: false, message: SGO_textoFalhaOperador_('carregar os alertas', e) };
  }
}
