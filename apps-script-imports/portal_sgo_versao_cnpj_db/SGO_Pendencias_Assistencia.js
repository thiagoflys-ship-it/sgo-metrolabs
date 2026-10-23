/****************************************************
 * ASSISTÊNCIA TÉCNICA NA CENTRAL, NA CAIXA DE DECISÕES E NA MATRIZ DE AVISOS (21/10/2026)
 *
 * Como Compras (SGO_Pendencias_Compras.js): os arquivos da central (SGO_Alertas_Central.js), da Caixa de decisões
 * (SGO_Gestao_*.js) e da matriz de avisos (SGO_Avisos_Matriz.js) são compartilhados; a Assistência se registra por aqui,
 * só acrescentando o que ainda não existe. O nome do arquivo vem depois deles na ordem de carga (alfabética); as funções
 * de aviso e de pendência chamam o registro de novo antes de usar, por segurança.
 *
 * Eventos da matriz (AT01 a AT17): sistema na hora; e-mail na hora só no que tem prazo curto (triagem, chamado crítico,
 * reagendamento, cancelamento, pedido do cliente) e no resumo do dia no resto; WhatsApp só na exceção do chamado P1 ao
 * gestor da área Técnica (expediente, CLT, uma vez por dia) e na contagem do resumo do dia do técnico; o cliente recebe
 * só e-mail enquanto durar o piloto.
 ****************************************************/

var AST_PEND_TIPOS = {
  ast_triagem: { modulo: 'assistencia', um: 'chamado aguardando triagem', varios: 'chamados aguardando triagem', rotulo: 'Fazer a triagem', fazer: 'faça a triagem em Assistência técnica > Chamados', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_agendar: { modulo: 'assistencia', um: 'chamado planejado sem agenda', varios: 'chamados planejados sem agenda', rotulo: 'Agendar', fazer: 'agende em Assistência técnica > Chamados', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_sla: { modulo: 'assistencia', um: 'chamado com prazo em risco ou estourado', varios: 'chamados com prazo em risco ou estourado', rotulo: 'Prazo', fazer: 'resolva o próximo passo do chamado em Assistência técnica > Chamados', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_orcamento: { modulo: 'assistencia', um: 'orçamento de chamado parado', varios: 'orçamentos de chamado parados', rotulo: 'Orçamento parado', fazer: 'cobre o Comercial ou registre a resposta do cliente no chamado', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_doc_pendente: { modulo: 'assistencia', um: 'O.S. com documentação pendente', varios: 'O.S. com documentação pendente', rotulo: 'Completar a O.S.', fazer: 'complete pelo aplicativo do técnico ou em Assistência técnica > Minhas O.S.', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_doc_pendente_gestao: { modulo: 'assistencia', um: 'O.S. com documentação pendente há mais de 24 horas', varios: 'O.S. com documentação pendente há mais de 24 horas', rotulo: 'Documentação atrasada', fazer: 'cobre o técnico ou complete na ficha da O.S.', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_sem_sinc: { modulo: 'assistencia', um: 'O.S. em campo sem notícia do aparelho', varios: 'O.S. em campo sem notícia do aparelho', rotulo: 'Sem envio', fazer: 'peça ao técnico para abrir "Envios" no aplicativo com internet', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_serie: { modulo: 'assistencia', um: 'série divergente para conferir', varios: 'séries divergentes para conferir', rotulo: 'Série divergente', fazer: 'confira o cadastro do equipamento e marque "Série conferida" na O.S.', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_solicitacao: { modulo: 'assistencia', um: 'pedido de atendimento de cliente na fila', varios: 'pedidos de atendimento de clientes na fila', rotulo: 'Abrir chamado', fazer: 'converta em chamado em Assistência técnica > Solicitações dos clientes', tela: { tipo: 'assistencia', mod: 'assistencia_solicitacoes' }, origem: 'ASSISTENCIA' },
  ast_caso: { modulo: 'assistencia', um: 'reclamação de cliente em aberto', varios: 'reclamações de clientes em aberto', rotulo: 'Reclamação', fazer: 'trate em Assistência técnica > Reclamações', tela: { tipo: 'assistencia', mod: 'assistencia_casos' }, origem: 'ASSISTENCIA' },
  ast_os_hoje: { modulo: 'assistencia', um: 'atendimento seu hoje', varios: 'atendimentos seus hoje', rotulo: 'Hoje', fazer: 'abra o Meu dia no aplicativo do técnico', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_aviso: { modulo: 'assistencia', um: 'aviso da Assistência técnica', varios: 'avisos da Assistência técnica', rotulo: 'Informativo', fazer: 'abra a Assistência técnica para ver', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  // 22/10/2026 (etapa 1): cliente, unidade ou equipamento criado pelo técnico no aplicativo, fora da agenda; a gestão confere vínculo e repetição
  ast_cadastro_campo: { modulo: 'assistencia', um: 'cadastro criado em campo para conferir', varios: 'cadastros criados em campo para conferir', rotulo: 'Conferir cadastro', fazer: 'confira em Assistência técnica > Chamados > Cadastros criados em campo (e em Cadastros > Vínculos se houver repetição)', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  // 22/10/2026 (etapas 2 e 3): relatório encerrado sem envio ao cliente (o técnico até 1 dia útil; depois a gestão), retorno a agendar depois da peça e P1 sem triagem em 30 minutos
  ast_enviar_cliente: { modulo: 'assistencia', um: 'relatório de O.S. para enviar ao cliente', varios: 'relatórios de O.S. para enviar ao cliente', rotulo: 'Enviar ao cliente', fazer: 'envie pelo aplicativo (O.S. encerrada > Enviar ao cliente) ou em Assistência técnica > Ordens de serviço > Documento e envio', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_sem_envio: { modulo: 'assistencia', um: 'O.S. encerrada há 1 dia útil sem envio ao cliente', varios: 'O.S. encerradas há 1 dia útil sem envio ao cliente', rotulo: 'Relatório não enviado', fazer: 'envie o relatório ao cliente em Assistência técnica > Ordens de serviço > Documento e envio', tela: { tipo: 'assistencia', mod: 'assistencia_os' }, origem: 'ASSISTENCIA' },
  ast_retorno: { modulo: 'assistencia', um: 'peça disponível: retorno a agendar', varios: 'peças disponíveis: retornos a agendar', rotulo: 'Agendar o retorno', fazer: 'agende o retorno em Assistência técnica > Chamados (a peça já está com Compras)', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  // 22/10/2026 (etapa 4): resposta do cliente ao orçamento que pede decisão da gestão (pelo link, pelo portal ou registrada à mão)
  ast_orc_recusado: { modulo: 'assistencia', um: 'orçamento recusado pelo cliente para decidir', varios: 'orçamentos recusados pelo cliente para decidir', rotulo: 'Orçamento recusado', fazer: 'decida em Assistência técnica > Chamados: negociar (nova revisão), cobrar a visita ou encerrar', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_orc_ajuste: { modulo: 'assistencia', um: 'pedido de ajuste no orçamento para revisar', varios: 'pedidos de ajuste em orçamentos para revisar', rotulo: 'Ajustar o orçamento', fazer: 'faça a nova revisão em Assistência técnica > Chamados > Orçamento e envie de novo com o link', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' },
  ast_p1_triagem: { modulo: 'assistencia', um: 'chamado crítico (P1) sem triagem há mais de 30 minutos', varios: 'chamados críticos (P1) sem triagem há mais de 30 minutos', rotulo: 'P1 sem triagem', fazer: 'faça a triagem agora em Assistência técnica > Chamados', tela: { tipo: 'assistencia', mod: 'assistencia' }, origem: 'ASSISTENCIA' }
};
/** Decisões da gestão na Caixa (prazo em dias úteis quando o item não traz o próprio). */
var AST_GES_TIPOS = { ast_triagem: { prazo: 1 }, ast_agendar: { prazo: 1 }, ast_sla: { prazo: 1 }, ast_orcamento: { prazo: 1 }, ast_doc_pendente_gestao: { prazo: 1 }, ast_sem_sinc: { prazo: 1 },
  ast_serie: { prazo: 2 }, ast_solicitacao: { prazo: 1 }, ast_caso: { prazo: 2 }, ast_cadastro_campo: { prazo: 2 }, ast_sem_envio: { prazo: 1 }, ast_retorno: { prazo: 1 }, ast_p1_triagem: { prazo: 1 }, ast_orc_recusado: { prazo: 2 }, ast_orc_ajuste: { prazo: 1 } };

var AST_MTZ_EVENTOS = [
  { cod: 'AT01', modulo: 'assistencia', evento: 'Chamado novo para a triagem', origem: 'SGO_Assistencia_Chamados.js', publico: 'Gestor da área (Técnica)', email: 'HORA', whatsapp: 'NAO', limite: '1 por chamado', obs: 'A triagem tem prazo em horas; fora do expediente, vai no primeiro horário.', area: 'TECNICA', obrigatorio: true },
  { cod: 'AT02', modulo: 'assistencia', evento: 'Chamado crítico (P1) aberto', origem: 'SGO_Assistencia_Chamados.js', publico: 'Gestor da área (Técnica)', email: 'HORA', whatsapp: 'HORA', limite: 'WhatsApp: 1 por dia, expediente, CLT', obs: 'Equipamento parado que afeta o paciente. Fora do expediente, no resumo do dia seguinte.', area: 'TECNICA', whatsHoraPermitido: true, foraExpediente: 'RESUMO', obrigatorio: true },
  { cod: 'AT03', modulo: 'assistencia', evento: 'Atendimento agendado para você', origem: 'SGO_Assistencia_Agenda.js', publico: 'Técnico', email: 'RESUMO', whatsapp: 'RESUMO', limite: 'Resumo: 1 por dia', obs: 'Também aparece no Meu dia do aplicativo do técnico.' },
  { cod: 'AT04', modulo: 'assistencia', evento: 'Atendimento reagendado ou passado a outro técnico', origem: 'SGO_Assistencia_Agenda.js', publico: 'Técnico', email: 'HORA', whatsapp: 'NAO', limite: '1 por mudança' },
  { cod: 'AT05', modulo: 'assistencia', evento: 'O.S. cancelada', origem: 'SGO_Assistencia_Chamados.js', publico: 'Técnico', email: 'HORA', whatsapp: 'NAO', limite: '1 por O.S.' },
  { cod: 'AT06', modulo: 'assistencia', evento: 'Reclamação de cliente para você tratar', origem: 'SGO_Assistencia_Chamados.js', publico: 'Dono do caso', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', area: 'TECNICA' },
  { cod: 'AT07', modulo: 'assistencia', evento: 'Atendimento do pedido do Comercial concluído', origem: 'SGO_Assistencia_Chamados.js', publico: 'Vendedor', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por chamado', informativo: true },
  { cod: 'AT08', modulo: 'assistencia', evento: 'Chamado recebido, visita agendada ou reagendada, atendimento concluído (ao cliente)', origem: 'SGO_Assistencia_*.js', publico: 'Cliente (externo)', email: 'HORA', whatsapp: 'NAO', limite: '1 por evento', obs: 'WhatsApp ao cliente só depois do piloto, ligado aqui e nas Regras da assistência. O PDF do relatório não vai por aqui: vai pelo Enviar documento (técnico no aplicativo ou gestão na ficha da O.S.).' },
  { cod: 'AT09', modulo: 'assistencia', evento: 'Pedido de atendimento do cliente na fila', origem: 'SGO_Assistencia_Chamados.js', publico: 'Gestor da área (Técnica)', email: 'HORA', whatsapp: 'NAO', limite: '1 por pedido', area: 'TECNICA' },
  { cod: 'AT10', modulo: 'assistencia', evento: 'Série do equipamento diferente do cadastro', origem: 'SGO_Assistencia_OS.js', publico: 'Gestor da área (Técnica)', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', area: 'TECNICA' },
  { cod: 'AT11', modulo: 'assistencia', evento: 'Falta de peça no atendimento', origem: 'SGO_Assistencia_OS.js', publico: 'Gestor da área (Técnica)', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', obs: 'O pedido de compra abre sozinho em Compras.', area: 'TECNICA' },
  { cod: 'AT12', modulo: 'assistencia', evento: 'Orçamento do chamado pedido ou respondido pelo cliente', origem: 'SGO_Assistencia_Relatorio.js', publico: 'Gestor comercial; gestor da área Técnica', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia' },
  { cod: 'AT13', modulo: 'assistencia', evento: 'Cadastro criado em campo pelo técnico (cliente, unidade ou equipamento)', origem: 'SGO_Assistencia_App.js', publico: 'Gestor da área (Técnica)', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', obs: 'O cadastro entra marcado "criado em campo"; a gestão confere vínculo e repetição (vale o original).', area: 'TECNICA' },
  // 22/10/2026 (etapa 3): Compras devolve o chamado quando a peça chega; o cliente sabe que a peça chegou e quando é o retorno
  { cod: 'AT14', modulo: 'assistencia', evento: 'Peça disponível em Compras: chamado devolvido à Assistência, retorno a agendar', origem: 'SGO_Assistencia_Chamados.js (chamado por SGO_Compras_Pedido.js)', publico: 'Gestor da área (Técnica); técnico responsável', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por pedido de compra', obs: 'O chamado volta sozinho a "Planejado" e entra na Caixa de decisões como "retorno a agendar". WhatsApp interno só pelo piloto e no resumo do dia.', area: 'TECNICA' },
  { cod: 'AT15', modulo: 'assistencia', evento: 'Peça recebida e retorno técnico agendado (ao cliente)', origem: 'SGO_Assistencia_Chamados.js; SGO_Assistencia_Agenda.js', publico: 'Cliente (externo)', email: 'HORA', whatsapp: 'NAO', limite: '1 por evento', obs: 'Dois e-mails: "peça chegou, retorno será agendado" e "retorno agendado para dd/mm". Nada de WhatsApp ao cliente nesta etapa.' },
  // 22/10/2026 (etapa 4): o próprio cliente responde o orçamento pelo link (sem login) ou pelo portal "Meus chamados"
  { cod: 'AT16', modulo: 'assistencia', evento: 'Orçamento aprovado pelo cliente pelo link ou pelo portal', origem: 'SGO_Assistencia_Aceite.js; SGO_Assistencia_Relatorio.js', publico: 'Gestor da área (Técnica); gestor comercial; técnico do chamado', email: 'HORA', whatsapp: 'NAO', limite: '1 por orçamento', obs: 'O chamado vai sozinho a "Planejado" (ou "Aguardando peça", com o pedido em Compras). O cliente recebe o comprovante de aprovação por e-mail; nada de WhatsApp ao cliente.', area: 'TECNICA' },
  { cod: 'AT17', modulo: 'assistencia', evento: 'Orçamento recusado ou com pedido de ajuste pelo cliente (link ou portal)', origem: 'SGO_Assistencia_Aceite.js; SGO_Assistencia_Relatorio.js', publico: 'Gestor da área (Técnica); gestor comercial; técnico do chamado', email: 'HORA', whatsapp: 'NAO', limite: '1 por resposta', obs: 'Entra na Caixa de decisões: recusa (negociar, cobrar a visita ou encerrar) ou ajuste (nova revisão e novo envio).', area: 'TECNICA' }
];

function Assistencia_registrarTipos_() {
  try {
    if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(AST_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = AST_PEND_TIPOS[k]; });
    if (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS && !PEND_MODULOS.assistencia) PEND_MODULOS.assistencia = 'Assistência técnica';
    if (typeof PEND_FONTES !== 'undefined' && Array.isArray(PEND_FONTES) && !PEND_FONTES.some(function (f) { return f && f.nome === 'Assistencia'; })) {
      PEND_FONTES.push({ nome: 'Assistencia', fn: function (add, ctx) { if (!ctx.cliente && typeof Assistencia_fontePendencias_ === 'function') Assistencia_fontePendencias_(add, ctx); } });
    }
    if (typeof GES_TIPOS !== 'undefined' && GES_TIPOS) Object.keys(AST_GES_TIPOS).forEach(function (k) { if (!GES_TIPOS[k]) GES_TIPOS[k] = AST_GES_TIPOS[k]; });
    if (typeof GES_AREA_MODULO_PADRAO !== 'undefined' && GES_AREA_MODULO_PADRAO && !GES_AREA_MODULO_PADRAO.assistencia) GES_AREA_MODULO_PADRAO.assistencia = 'TECNICA';
    if (typeof GES_MODULOS_CONFIG !== 'undefined' && Array.isArray(GES_MODULOS_CONFIG) && !GES_MODULOS_CONFIG.some(function (m) { return m && m[0] === 'assistencia'; })) GES_MODULOS_CONFIG.push(['assistencia', 'Assistência técnica']);
    if (typeof MTZ_PADRAO !== 'undefined' && Array.isArray(MTZ_PADRAO)) AST_MTZ_EVENTOS.forEach(function (ev) { if (!MTZ_PADRAO.some(function (x) { return x && x.cod === ev.cod; })) MTZ_PADRAO.push(ev); });
    if (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES && !MTZ_MODULOS_NOMES.assistencia) MTZ_MODULOS_NOMES.assistencia = 'Assistência técnica';
  } catch (e) { try { console.error('Assistência, registro na central: ' + ((e && e.message) || e)); } catch (x) {} }
}

Assistencia_registrarTipos_();
