ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Alertas_Central.js'
PARES = [
(" *    o que é dele (atividades, avisos, CNH, O.S. do Auvo, cobranças).",
 " *    o que é dele (atividades, avisos, CNH, O.S. da Assistência, cobranças).\n *  - 18/11/2026: o Auvo foi descontinuado pelo dono; a fonte de pendências do Auvo saiu (SGO_Auvo_Retirada.js)."),
("  auvo: 'Integração Auvo',\n", ""),
("  // 19/10/2026: sugestões de ocorrência vindas da Frota, Auvo, Painel de qualidade, Atividades, Avisos e do ponto (COMMAND).",
 "  // 19/10/2026: sugestões de ocorrência vindas da Frota, Painel de qualidade, Atividades, Avisos e do ponto (COMMAND). Auvo: fora desde 18/11/2026."),
("fazer: 'complete o registro no Auvo', tela: { tipo: 'modulo', mod: 'qualidade' }",
 "fazer: 'peça a correção na ficha da O.S.', tela: { tipo: 'modulo', mod: 'qualidade' }"),
("  auvo_os_aberta: { modulo: 'auvo', um: 'O.S. aberta no Auvo', varios: 'O.S. abertas no Auvo', rotulo: 'Revisar', fazer: 'finalize ou reagende no Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },\n"
 "  auvo_sem_vinculo: { modulo: 'auvo', um: 'O.S. do Auvo sem vínculo de cadastro', varios: 'O.S. do Auvo sem vínculo de cadastro', rotulo: 'Revisar', fazer: 'vincule cliente e técnico em Integração Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },\n",
 ""),
("  auvo_importacao: { modulo: 'auvo', um: 'importação do Auvo parada', varios: 'importações do Auvo paradas', rotulo: 'Revisar', fazer: 'retome a importação em Integração Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },\n",
 ""),
("""/** Qualidade: falha de registro dos últimos 30 dias (O.S. do Auvo e retirada de veículo) e cobranças da gestão. */""",
 """/** Qualidade: falha de registro dos últimos 30 dias (O.S. da Assistência do SGO+ e retirada de veículo) e cobranças da gestão. */"""),
("""  // O.S. concluídas com registro incompleto (o vínculo de cadastro é pendência própria do Auvo, não se repete aqui)
  if (SGO_CFG.SHEETS.AUVO_TAREFAS && typeof QualidadeAuvo_motivosTarefa_ === 'function') {
    var usuarios = {};
    Pend_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[Pend_s_(u.ID)] = u; });
    // 21/10/2026: fonte única de atendimentos (Auvo + O.S. da Assistência do SGO+, SGO_Assistencia_Fonte.js)
    (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Pend_ler_(SGO_CFG.SHEETS.AUVO_TAREFAS)).forEach(function (t) {""",
 """  // O.S. concluídas com registro incompleto. 18/11/2026: Auvo descontinuado pelo dono; só as O.S. da Assistência do SGO+
  // (SGO_Assistencia_Fonte.js, origem SGO). Tarefa antiga do Auvo não gera mais cobrança.
  if (typeof SGO_Atendimentos_linhas_ === 'function' && typeof QualidadeAuvo_motivosTarefa_ === 'function') {
    var usuarios = {};
    Pend_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[Pend_s_(u.ID)] = u; });
    SGO_Atendimentos_linhas_({ origem: 'SGO' }).forEach(function (t) {
      if (t.ORIGEM !== 'SGO') return;"""),
("""      var nomeTec = (tec && Pend_s_(tec.NOME)) || Pend_s_(t.TECNICO_NOME_AUVO) || 'técnico não identificado';
      var cli = Pend_s_(t.CLIENTE_NOME_AUVO);
      add(Pend_item_('qualidade_os', {""",
 """      var nomeTec = (tec && Pend_s_(tec.NOME)) || Pend_s_(t.TECNICO_NOME_AUVO) || 'técnico não identificado';
      var cli = Pend_s_(t.CLIENTE_NOME_AUVO);
      add(Pend_item_('qualidade_os', {"""),
("""        oQueFazer: t.ORIGEM === 'SGO' ? 'A O.S. do SGO+ já foi encerrada: peça à gestão da área Técnica para registrar a correção na ficha da O.S. (Assistência técnica > O.S.).' : 'Complete no aplicativo do Auvo o que falta nesta O.S.; a correção aparece aqui depois da próxima sincronização.',
        oQueFazerOutro: 'Peça a ' + nomeTec + ' para completar o registro ' + (t.ORIGEM === 'SGO' ? 'na O.S. do SGO+' : 'no Auvo') + '; se não for possível, registre a cobrança no Painel de qualidade.',
        tela: t.ORIGEM === 'SGO' ? { tipo: 'assistencia', mod: 'assistencia_os', id: Pend_s_(t.OS_ID_SGO) } : (Pend_s_(t.TASK_URL) ? { tipo: 'link', url: Pend_s_(t.TASK_URL), rotulo: 'Abrir no Auvo' } : { tipo: 'modulo', mod: 'qualidade' }),""",
 """        oQueFazer: 'A O.S. do SGO+ já foi encerrada: peça à gestão da área Técnica para registrar a correção na ficha da O.S. (Assistência técnica > O.S.).',
        oQueFazerOutro: 'Peça a ' + nomeTec + ' para completar o registro na O.S. do SGO+; se não for possível, registre a cobrança no Painel de qualidade.',
        tela: { tipo: 'assistencia', mod: 'assistencia_os', id: Pend_s_(t.OS_ID_SGO) },"""),
("detalhe: 'Vieram da Frota, do Auvo, do Painel de qualidade, de Minhas atividades, dos Avisos ou do ponto.",
 "detalhe: 'Vieram da Frota, do Painel de qualidade, de Minhas atividades, dos Avisos ou do ponto."),
('__RE__', r"/\*\* 18/11/2026: tarefas do Auvo da sincronização frequente.*?\n}\n\n(// -{60}\n// CÁLCULO, ORDEM E AGRUPAMENTO)",
 r"// 18/11/2026: a fonte de pendências do Auvo (O.S. abertas, O.S. sem vínculo e importação parada) saiu: o Auvo foi\n// descontinuado pelo dono (SGO_Auvo_Retirada.js). As abas AUVO_PENDENCIAS e AUVO_TAREFAS ficam só como histórico.\n\n\1", 1),
("  { nome: 'Auvo', fn: Pend_fonteAuvo_ },\n", ""),
]
