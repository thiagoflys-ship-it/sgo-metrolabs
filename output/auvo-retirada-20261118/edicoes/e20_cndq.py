ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Conduta_Qualidade.js'
PARES = [
(""" *    (Frota, Auvo, Painel de qualidade, Minhas atividades, Avisos e o""",
 """ *    (Frota, Assistência técnica, Painel de qualidade, Minhas atividades, Avisos e o"""),
(""" * O cálculo do índice, o farol, o bônus e as regras do fluxo não mudam.""",
 """ * 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). As sugestões vêm só das O.S.
 *    da Assistência do SGO+; sugestão pendente que veio do Auvo é encerrada pelo sistema, sem
 *    cobrança, com o motivo. Ocorrência já registrada a partir do Auvo continua como está.
 *
 * O cálculo do índice, o farol, o bônus e as regras do fluxo não mudam."""),
("""  AUVO: { nome: 'Integração Auvo', tela: 'auvo' },""",
 """  // 18/11/2026: Auvo descontinuado pelo dono; a origem fica só para mostrar o histórico das sugestões antigas.
  AUVO: { nome: 'Auvo (descontinuado)', tela: '' },
  SGO: { nome: 'Assistência técnica', tela: 'assistencia_os' },
  ASSISTENCIA: { nome: 'Assistência técnica', tela: 'assistencia_os' },"""),
("""function Cndq_coletarAuvo_(usuarios, desde, avisos) {
  var saida = [], semVinculo = 0;
  var dataTarefa = function (v) { return Cndq_iso_(v); };
  // 21/10/2026: fonte única de atendimentos (Auvo + O.S. da Assistência do SGO+, SGO_Assistencia_Fonte.js); a O.S. do SGO+
  // aberta há 3 dias ou mais (documentação pendente) vira a mesma sugestão de "O.S. aberta" que o Auvo dá pela varredura.
  var fonteCndq = typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Cndq_ler_(SGO_CFG.SHEETS.AUVO_TAREFAS);
  fonteCndq.forEach(function (t) {""",
 """/**
 * O.S. da Assistência do SGO+ (SGO_Assistencia_Fonte.js): aberta há 3 dias ou mais (documentação pendente) e finalizada sem
 * foto, relato ou check-out. 18/11/2026: Auvo descontinuado pelo dono; tarefa do Auvo não vira mais sugestão.
 */
function Cndq_coletarAtendimentos_(usuarios, desde, avisos) {
  var saida = [], semVinculo = 0;
  var dataTarefa = function (v) { return Cndq_iso_(v); };
  var fonteCndq = typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_({ origem: 'SGO' }) : [];
  fonteCndq.forEach(function (t) {
    if (t.ORIGEM !== 'SGO') return;"""),
("""    var orig = t.ORIGEM === 'SGO' ? 'SGO' : 'AUVO', ondeTxt = orig === 'SGO' ? 'no SGO+' : 'no Auvo';""",
 """    var orig = 'SGO', ondeTxt = 'no SGO+';"""),
("""  // O.S. aberta há 3 dias ou mais (check-out esquecido): some quando é finalizada.
  Cndq_ler_(SGO_CFG.SHEETS.AUVO_PENDENCIAS).forEach(function (p) {
    var dias = Number(p.DIAS_ABERTA) || 0, uid = SGO_UTILS.safe(p.TECNICO_ID_SGO), data = Cndq_iso_(p.TASK_DATE);
    if (dias < 3 || !data || data < desde) return;
    if (!uid) { semVinculo++; return; }
    saida.push({ chave: 'AUVO|ABERTA|' + p.AUVO_TASK_ID, origem: 'AUVO', tipo: 'OS_ABERTA', origemId: String(p.AUVO_TASK_ID), colaboradorId: uid, dataFato: data,
      tipoCodigo: 'CAM-02', resolvivel: true, link: SGO_UTILS.safe(p.TASK_URL),
      rotulo: 'O.S. ' + p.AUVO_TASK_ID + ' aberta há ' + dias + ' dias',
      titulo: 'O.S. aberta há ' + dias + ' dias no Auvo (check-out esquecido?)',
      detalhe: (p.CLIENTE_NOME ? p.CLIENTE_NOME + '. ' : '') + 'Agendada para ' + Conduta_dataBr_(data) + (SGO_UTILS.safeUpper(p.TEM_EVIDENCIA) === 'SIM' ? ', com evidência registrada.' : ', sem evidência.') });
  });
  if (semVinculo) avisos.push(semVinculo + ' O.S. do Auvo sem técnico ligado ao SGO+ não viraram sugestão (vincule o técnico em Integração Auvo).');
  return saida;
}""",
 """  if (semVinculo) avisos.push(semVinculo + ' O.S. do SGO+ sem técnico ligado não viraram sugestão (confira o técnico na O.S.).');
  return saida;
}"""),
("""  var fontes = [['FROTA', Cndq_coletarFrota_], ['AUVO', Cndq_coletarAuvo_], ['QUALIDADE', Cndq_coletarQualidade_],""",
 """  var fontes = [['FROTA', Cndq_coletarFrota_], ['ASSISTENCIA', Cndq_coletarAtendimentos_], ['QUALIDADE', Cndq_coletarQualidade_],"""),
("""  PropertiesService.getScriptProperties().setProperty(CNDQ_COLETA_PROP, agora);
  var r = { novas: novas.length, superadas: superadas, porOrigem: porOrigem, avisos: avisos, em: agora };""",
 """  // 18/11/2026: Auvo descontinuado pelo dono. Sugestão pendente que veio do Auvo é encerrada pelo sistema, sem cobrança (a linha fica).
  var retiradasAuvo = 0;
  existentes.forEach(function (s) {
    if (SGO_UTILS.safeUpper(s.STATUS) !== 'PENDENTE' || SGO_UTILS.safeUpper(s.ORIGEM_MODULO) !== 'AUVO') return;
    SGO_DATA.update(CNDQ_SHEETS.SUGESTAO, s.ID, { STATUS: 'DESCARTADA', DECIDIDA_EM: agora, DECIDIDA_POR_NOME: 'Sistema',
      MOTIVO: 'O Auvo foi descontinuado em 18/11/2026: sugestões vindas do Auvo foram encerradas sem cobrança. O registro fica guardado.' });
    retiradasAuvo++;
  });
  PropertiesService.getScriptProperties().setProperty(CNDQ_COLETA_PROP, agora);
  var r = { novas: novas.length, superadas: superadas, retiradasAuvo: retiradasAuvo, porOrigem: porOrigem, avisos: avisos, em: agora };"""),
("""  if (novas.length || superadas) SGO_DATA.log('CONDUTA_SUGESTOES_COLETA', quem || 'sistema', novas.length + ' sugestão(ões) nova(s), ' + superadas + ' superada(s). ' + avisos.join(' ').slice(0, 600), 'CONDUTA');""",
 """  if (novas.length || superadas || retiradasAuvo) SGO_DATA.log('CONDUTA_SUGESTOES_COLETA', quem || 'sistema', novas.length + ' sugestão(ões) nova(s), ' + superadas + ' superada(s)' + (retiradasAuvo ? ', ' + retiradasAuvo + ' do Auvo encerrada(s)' : '') + '. ' + avisos.join(' ').slice(0, 600), 'CONDUTA');"""),
]
