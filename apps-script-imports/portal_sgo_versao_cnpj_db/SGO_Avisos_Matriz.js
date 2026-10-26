/****************************************************
 * MATRIZ DE AVISOS DO SGO+ (21/10/2026)
 *
 * Aprovada pelo dono em 21/10/2026 ("Sim pra todos"): todas as respostas da
 * seção 8 do estudo docs/MATRIZ_DE_AVISOS_20261021.md são a recomendação do
 * documento. Esta é a TABELA ÚNICA de regras (evento -> público -> canal ->
 * frequência) que o notificador (SGO_Notificar.js, SGO_notificar_) consulta
 * em todo envio. A matriz aprovada é o padrão (MTZ_PADRAO); o Administrador e
 * a Diretoria ajustam em Administração > Matriz de avisos, e cada mudança fica
 * na trilha (aba NTF_REGRAS: uma linha por mudança, com antes, depois, motivo,
 * quem e quando; a última linha de cada evento é a que vale; nada é apagado).
 *
 * OS TRÊS CANAIS
 *  - Sistema: sempre, na hora (sino, central de pendências, Início, Caixa de
 *    decisões). Cobra até ser resolvido. Não passa por aqui.
 *  - E-mail: "RESUMO" = entra no e-mail de resumo do dia (um por pessoa, a
 *    partir das 08:00 do dia útil, só se houver algo); "HORA" = sai na hora,
 *    dentro do expediente (fora dele espera a primeira rodada do expediente
 *    seguinte, agrupado por pessoa); "NAO" = só no sistema.
 *  - WhatsApp: "RESUMO" = entra na contagem do único WhatsApp do dia (09:30,
 *    só CLT, só se a pessoa ainda não abriu o sistema, só quem está no piloto
 *    enquanto ele durar); "HORA" = só as quatro exceções da Frota, só no
 *    expediente, só CLT, uma por pessoa por dia em cada exceção; "NAO".
 *
 * REGRAS GERAIS (valem para todo envio pelo notificador)
 *  - WhatsApp só para vínculo liberado (padrão CLT, Atividades da equipe >
 *    Avisos e horários). PJ e vínculo não informado: sistema e e-mail.
 *  - WhatsApp avulso acabou: sem evento com "HORA" permitido (as quatro
 *    exceções) e fora do resumo do dia, nada sai pelo WhatsApp. Fica PULADO
 *    em NTF_ENVIOS com o motivo.
 *  - Cliente e contato externo: WhatsApp só depois do piloto, e só se o
 *    evento for ligado aqui (S56 começa em "NAO").
 *  - Evento "vira histórico": ninguém é avisado; o fato continua no histórico
 *    do próprio registro.
 *  - O ASSISTENTE DO PONTO (categoria PONTO, origem PONTO) tem identificação e
 *    regra próprias (SGO_Ponto_*.js): nada daqui se aplica a ele, e o resumo do
 *    dia não leva assunto do ponto nem sai perto (10 minutos) de um lembrete
 *    do ponto da mesma pessoa.
 *
 * RESUMO DO DIA ÚNICO (SGO_resumoDiaRodada_, chamado pela rotina da gestão a
 * cada 15 minutos e pela rotina das atividades de hora em hora): junta numa só
 * mensagem atividades, Caixa de decisões, Comercial, Frota, avisos com ciência
 * (só a contagem) e bate-papo (só a contagem de não lidas). Substitui os e-mails
 * separados de atividades, Comercial, reservas e da Caixa de decisões, o resumo
 * de atividades das 09:00 e o resumo da gestão pelo WhatsApp. Registro de cada
 * resumo: aba NTF_RESUMOS (pessoa, dia, canal, situação, motivo).
 *
 * PREFERÊNCIAS (Menu > Meus avisos): cada pessoa liga ou desliga o que pode
 * (seção 6 do estudo); o obrigatório aparece travado com o porquê. Só a própria
 * pessoa altera; a gestão vê na tela da matriz. Aba NTF_PREFERENCIAS (uma linha
 * por mudança; a última vale).
 *
 * CENTRAL DE PENDÊNCIAS POR ÁREA (SGO_avisoCentralVe_): o gestor vê o da sua
 * área e o que é dele; a Diretoria vê tudo; o Administrador vê as falhas
 * técnicas e o que é dele. Gestor sem área definida continua vendo tudo, para
 * ninguém ficar sem enxergar o que precisa (configure a área em Administração >
 * Usuários ou em Caixa de decisões > Regras e responsáveis).
 *
 * Abas próprias (criadas sob demanda; nada é apagado): NTF_REGRAS,
 * NTF_RESUMO_FILA, NTF_RESUMOS, NTF_PREFERENCIAS. Nenhuma função devolve Date
 * cru. Mensagens sóbrias, sem emoji.
 ****************************************************/

var MTZ_FUSO = 'America/Sao_Paulo';
var MTZ_ABAS = { REGRAS: 'NTF_REGRAS', FILA: 'NTF_RESUMO_FILA', RESUMOS: 'NTF_RESUMOS', PREFS: 'NTF_PREFERENCIAS' };
var MTZ_COLUNAS = {
  NTF_REGRAS: ['ID', 'CODIGO', 'DEPOIS_JSON', 'ANTES_JSON', 'MOTIVO', 'ALTERADO_POR_ID', 'ALTERADO_POR_NOME', 'ALTERADO_EM', 'CRIADO_EM'],
  NTF_RESUMO_FILA: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'EVENTO', 'MODULO', 'MODO', 'TITULO', 'TEXTO', 'LINK', 'SENSIVEL', 'ORIGEM', 'REF_ID', 'QUANDO', 'SITUACAO', 'ENVIADO_EM', 'MOTIVO', 'CRIADO_EM'],
  NTF_RESUMOS: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'CANAL', 'SITUACAO', 'ITENS', 'CONTAGENS', 'MOTIVO', 'AVALIADO_EM', 'CRIADO_EM'],
  NTF_PREFERENCIAS: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'PREFS_JSON', 'ALTERADO_EM', 'CRIADO_EM']
};
var MTZ_TEXTO = { NTF_REGRAS: ['ALTERADO_EM'], NTF_RESUMO_FILA: ['QUANDO', 'ENVIADO_EM'], NTF_RESUMOS: ['DIA', 'AVALIADO_EM'], NTF_PREFERENCIAS: ['ALTERADO_EM'] };
// 26/10/2026: whatsTetoDia = quantos WhatsApp "na hora" cada pessoa recebe por dia, somando os eventos marcados "na hora"
// (as quatro exceções da Frota e a campainha, whatsHoraPermitido, ficam fora da conta; o ponto e o resumo do dia também).
var MTZ_CFG_PADRAO = { horaEmail: '08:00', horaEmailAlternativa: '12:00', horaWhats: '09:30', whatsResumo: true, centralPorArea: true, whatsTetoDia: 3 };
var MTZ_FILA_VALIDADE_DIAS = 7;       // item guardado há mais que isto não sai mais (fica PULADO com o motivo)
var MTZ_PONTO_JANELA_MIN = 10;        // o resumo do WhatsApp não sai a menos de 10 minutos de um lembrete do ponto da mesma pessoa
var MTZ_MAX_ITENS_EMAIL = 30;
var MTZ_CANAIS_EMAIL = ['NAO', 'RESUMO', 'HORA'];
var MTZ_CANAIS_WHATS = ['NAO', 'RESUMO', 'HORA'];
var MTZ_DECISOES = ['AVISA', 'HISTORICO'];
// Módulos que a pessoa pode tirar do e-mail de resumo (seção 6). Atividades, Caixa de decisões e avisos com ciência não.
var MTZ_MODULOS_SILENCIAVEIS = { comercial: 'Comercial', frota: 'Frota (reservas e registros em seu nome)', auvo: 'Integração Auvo' };
// Pendências da central que são falha técnica (o Administrador sem área vê só estas e as dele).
var MTZ_TIPOS_TECNICOS = ['frota_rastreador_conexao', 'auvo_importacao'];
// Módulos cujo assunto nunca vai detalhado em e-mail de resumo nem WhatsApp (conduta, incentivo, ponto de colega).
var MTZ_MODULOS_SENSIVEIS = ['conduta', 'qualidade', 'ponto'];
var MTZ_ROTULO_EMAIL = { NAO: 'Só no sistema', RESUMO: 'E-mail no resumo do dia', HORA: 'E-mail na hora (no expediente)' };
var MTZ_ROTULO_WHATS = { NAO: 'Sem WhatsApp', RESUMO: 'Na contagem do WhatsApp do dia', HORA: 'WhatsApp na hora (exceção)' };

/**
 * A matriz aprovada (seção 3.1 do estudo), evento a evento. Campos:
 *  cod, modulo (chave do módulo), moduloNome, evento, origem (arquivo onde nasce), publico (texto),
 *  email, whatsapp (NAO | RESUMO | HORA), decisao (AVISA | HISTORICO), limite (texto), obs (texto),
 *  area (área do "gestor da área", quando o público é o gestor), whatsHoraPermitido (só as exceções),
 *  foraExpediente ('RESUMO' = o que nasce fora do expediente vai no resumo do dia seguinte),
 *  obrigatorio (a pessoa não desliga), sensivel (só a contagem no resumo), horaSeHoje (atividade com prazo hoje = e-mail na hora).
 */
var MTZ_PADRAO = [
  // Minhas atividades
  { cod: 'S01', modulo: 'atividades', evento: 'Nova atividade lançada para você', origem: 'SGO_Atividades.js', publico: 'Responsável', email: 'RESUMO', whatsapp: 'RESUMO', limite: 'Resumo: 1 por dia', obs: 'Prazo para hoje: e-mail na hora, no expediente.', horaSeHoje: true },
  { cod: 'S02', modulo: 'atividades', evento: 'Atividade passada para você', origem: 'SGO_Atividades.js', publico: 'Novo responsável', email: 'RESUMO', whatsapp: 'RESUMO', limite: 'Resumo: 1 por dia', horaSeHoje: true },
  { cod: 'S03', modulo: 'atividades', evento: 'Atividade passada para outra pessoa', origem: 'SGO_Atividades.js', publico: 'Responsável anterior', email: 'NAO', whatsapp: 'NAO', limite: '1 por troca' },
  { cod: 'S04', modulo: 'atividades', evento: 'Atividade replanejada (mudança de prazo)', origem: 'SGO_Atividades.js', publico: 'Responsável', email: 'NAO', whatsapp: 'NAO', limite: 'Só mudança de prazo', obs: 'Outras alterações (texto, cliente) ficam só no histórico da atividade.' },
  { cod: 'S05', modulo: 'atividades', evento: 'Atividade concluída ou aguardando', origem: 'SGO_Atividades.js', publico: 'Quem lançou', email: 'NAO', whatsapp: 'NAO', limite: '1 por mudança', informativo: true },
  { cod: 'S06', modulo: 'atividades', evento: 'Comentário em atividade', origem: 'SGO_Atividades.js', publico: 'O outro lado', email: 'NAO', whatsapp: 'NAO', limite: '-', informativo: true },
  { cod: 'S07', modulo: 'atividades', evento: 'Justificativa de atraso registrada', origem: 'SGO_Atividades.js', publico: 'Quem lançou (gestor)', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia' },
  { cod: 'S08', modulo: 'atividades', evento: 'Atividade atrasada', origem: 'SGO_Atividades.js', publico: 'Responsável', email: 'RESUMO', whatsapp: 'RESUMO', limite: '1 vez por previsão vencida', obs: 'A cobrança no sistema continua até concluir ou justificar.', obrigatorio: true },
  { cod: 'S09', modulo: 'atividades', evento: 'Atividade devolvida (responsável inativo ou sem responsável)', origem: 'SGO_Gestao_Escada.js', publico: 'Gestor da área', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por atividade' },
  { cod: 'S10', modulo: 'atividades', evento: 'E-mails das atividades', origem: 'SGO_Atividades_Avisos.js', publico: 'Individual', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por dia', obs: 'Faz parte do resumo do dia único.' },
  { cod: 'S11', modulo: 'atividades', evento: 'Resumo do dia no WhatsApp', origem: 'SGO_Avisos_Matriz.js', publico: 'Individual, só CLT', email: 'NAO', whatsapp: 'RESUMO', limite: '1 por dia', obs: 'Resumo único: atividades, Caixa de decisões, Comercial, Frota, avisos e bate-papo (só contagens).' },
  // Caixa de decisões
  { cod: 'S12', modulo: 'gestao', evento: 'Decisões aguardando o gestor (e-mail diário)', origem: 'SGO_Gestao_Escada.js', publico: 'Gestor da área; Diretoria', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por dia', obrigatorio: true },
  { cod: 'S13', modulo: 'gestao', evento: 'Item parado há 2 dias úteis', origem: 'SGO_Gestao_Escada.js', publico: 'Gestor da área, só CLT', email: 'NAO', whatsapp: 'RESUMO', limite: '1 por dia' },
  { cod: 'S14', modulo: 'gestao', evento: 'Escalada à Diretoria (parado há 5 dias úteis)', origem: 'SGO_Gestao_Escada.js', publico: 'Diretoria', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por dia', obrigatorio: true },
  { cod: 'S15', modulo: 'gestao', evento: 'Relatório semanal da gestão (A4)', origem: 'SGO_Gestao_Escada.js', publico: 'Diretoria', email: 'RESUMO', whatsapp: 'NAO', limite: 'Semanal' },
  { cod: 'S16', modulo: 'gestao', evento: 'Relatórios mensais', origem: 'SGO_Gestao_Escada.js', publico: 'Diretoria', email: 'RESUMO', whatsapp: 'NAO', limite: 'Mensal' },
  { cod: 'S17', modulo: 'frota', evento: 'CNH vencendo em 30, 15 e 7 dias', origem: 'SGO_Gestao_Escada.js', publico: 'Condutor; com 7 dias, também o gestor da Frota', email: 'RESUMO', whatsapp: 'NAO', limite: '3 marcos', area: 'ADMINISTRATIVO' },
  { cod: 'S18', modulo: 'frota', evento: 'Manutenção preventiva prevista vira atividade', origem: 'SGO_Gestao_Escada.js', publico: 'Gestor da área (Frota)', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por veículo e tipo a cada 60 dias', area: 'ADMINISTRATIVO' },
  // Avisos com ciência
  { cod: 'S19', modulo: 'avisos', evento: 'Aviso publicado pela gestão ou RH', origem: 'SGO_Avisos.js', publico: 'Público escolhido', email: 'HORA', whatsapp: 'RESUMO', limite: 'No WhatsApp, só a contagem no resumo (CLT)', obs: 'Ciência obrigatória. Sem WhatsApp avulso.', obrigatorio: true },
  { cod: 'S20', modulo: 'avisos', evento: 'Reenvio a quem não confirmou', origem: 'SGO_Avisos.js', publico: 'Quem não leu', email: 'HORA', whatsapp: 'NAO', limite: 'No máximo 1 reenvio por dia', obrigatorio: true },
  { cod: 'S21', modulo: 'avisos', evento: 'Leitura atrasada', origem: 'SGO_Alertas_Central.js', publico: 'Quem publicou', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia' },
  // Comercial
  { cod: 'S22', modulo: 'comercial', evento: 'Oportunidade passou para você', origem: 'SGO_Comercial_Oportunidades.js', publico: 'Vendedor', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por troca', area: 'COMERCIAL' },
  { cod: 'S23', modulo: 'comercial', evento: 'Pedido de apoio à gestão comercial', origem: 'SGO_Comercial_Oportunidades.js', publico: 'Gestor da área (Comercial)', email: 'HORA', whatsapp: 'NAO', limite: '1 por pedido', obs: 'Quem pede apoio espera resposta no mesmo dia.', area: 'COMERCIAL' },
  { cod: 'S24', modulo: 'comercial', evento: 'Venda ganha', origem: 'SGO_Comercial_Oportunidades.js', publico: 'Gestor da área (Comercial)', email: 'NAO', whatsapp: 'NAO', limite: '-', obs: 'Diretoria vê no relatório mensal.', informativo: true, area: 'COMERCIAL' },
  { cod: 'S25', modulo: 'comercial', evento: 'Reabertura não aprovada', origem: 'SGO_Comercial_Oportunidades.js', publico: 'Quem pediu', email: 'NAO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S26', modulo: 'comercial', evento: 'Oportunidade reaberta', origem: 'SGO_Comercial_Oportunidades.js', publico: 'Vendedor', email: 'RESUMO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S27', modulo: 'comercial', evento: 'Desconto aprovado ou negado', origem: 'SGO_Comercial_Propostas.js', publico: 'Vendedor', email: 'NAO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S28', modulo: 'comercial', evento: 'Cliente aprovou ou recusou a proposta', origem: 'SGO_Comercial_Propostas.js', publico: 'Vendedor (na hora); gestor comercial (resumo)', email: 'HORA', whatsapp: 'NAO', limite: '1 por resposta' },
  { cod: 'S29', modulo: 'comercial', evento: 'Setor concluiu a parte do pedido', origem: 'SGO_Comercial_Propostas.js', publico: 'Vendedor', email: 'NAO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S30', modulo: 'comercial', evento: 'Pedido aprovado passado aos setores', origem: 'SGO_Comercial_Propostas.js', publico: 'Área (Técnica, Metrologia, Financeiro, Logística)', email: 'RESUMO', whatsapp: 'NAO', limite: 'Como atividade' },
  { cod: 'S31', modulo: 'comercial', evento: 'Atividades do vendedor (retorno, proposta vencendo, decidir após recusa)', origem: 'SGO_Comercial_Propostas.js', publico: 'Vendedor', email: 'RESUMO', whatsapp: 'NAO', limite: 'Como atividade' },
  { cod: 'S32', modulo: 'comercial', evento: 'E-mails guardados do Comercial', origem: 'SGO_Comercial_Config.js', publico: 'Cada destinatário', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por dia', obs: 'Faz parte do resumo do dia único.' },
  // Frota
  { cod: 'S33', modulo: 'frota', evento: 'Retirada registrada em seu nome pela gestão', origem: 'SGO_Frota_Main.js', publico: 'Condutor', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por registro', obs: 'Sem WhatsApp (é informativo).' },
  { cod: 'S34', modulo: 'frota', evento: 'Devolução registrada em seu nome pela gestão', origem: 'SGO_Frota_Main.js', publico: 'Condutor', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por registro' },
  { cod: 'S35', modulo: 'frota', evento: 'Veículo em uso sem registro (rastreador)', origem: 'SGO_Frota_Rastreador.js', publico: 'Gestor da Frota', email: 'HORA', whatsapp: 'HORA', limite: '1 por alerta', obs: 'WhatsApp na hora só no expediente; fora dele, no resumo do dia seguinte.', area: 'ADMINISTRATIVO', whatsHoraPermitido: true, foraExpediente: 'RESUMO', obrigatorio: true },
  { cod: 'S36', modulo: 'frota', evento: 'Partida não liberada pelo rastreador', origem: 'SGO_Frota_Rastreador.js', publico: 'Gestor da Frota', email: 'NAO', whatsapp: 'HORA', limite: '1 por retirada', obs: 'O condutor está parado esperando. Só no expediente.', area: 'ADMINISTRATIVO', whatsHoraPermitido: true, obrigatorio: true },
  { cod: 'S37', modulo: 'frota', evento: 'Bloqueio da partida pendente há 30 minutos', origem: 'SGO_Frota_Rastreador.js', publico: 'Gestor da Frota', email: 'HORA', whatsapp: 'NAO', limite: '1 por pedido', area: 'ADMINISTRATIVO' },
  { cod: 'S38', modulo: 'frota', evento: 'Reserva feita pela gestão em seu nome', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'RESUMO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S39', modulo: 'frota', evento: 'Reserva cancelada pela gestão', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'NAO', limite: '-' },
  { cod: 'S40', modulo: 'frota', evento: 'Reserva mudou de veículo', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'NAO', limite: '-' },
  { cod: 'S41', modulo: 'frota', evento: 'Veículo da sua reserva de hoje liberado a outra pessoa', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'HORA', limite: 'WhatsApp só no mesmo dia, expediente, CLT', obs: 'A pessoa ia sair com o veículo hoje.', whatsHoraPermitido: true, obrigatorio: true },
  { cod: 'S42', modulo: 'frota', evento: 'Veículo da sua reserva foi devolvido', origem: 'SGO_Frota_Reservas.js', publico: 'Próximo reservante', email: 'NAO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S43', modulo: 'frota', evento: 'Reserva não utilizada (veículo liberado)', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'RESUMO', whatsapp: 'NAO', limite: '-' },
  { cod: 'S44', modulo: 'frota', evento: 'Devolução atrasada com reserva no mesmo dia (a quem está com o veículo)', origem: 'SGO_Frota_Reservas.js', publico: 'Condutor atual', email: 'NAO', whatsapp: 'HORA', limite: 'Mesmo dia, expediente, CLT, 1 por dia', obs: 'Outra pessoa espera o veículo.', whatsHoraPermitido: true, obrigatorio: true },
  { cod: 'S45', modulo: 'frota', evento: 'Devolução atrasada: aviso ao próximo reservante', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'NAO', limite: '-' },
  { cod: 'S46', modulo: 'frota', evento: 'Devolução atrasada: aviso à gestão', origem: 'SGO_Frota_Reservas.js', publico: 'Gestor da Frota', email: 'NAO', whatsapp: 'NAO', limite: '-', obs: 'Fica na Caixa de decisões.', area: 'ADMINISTRATIVO' },
  { cod: 'S47', modulo: 'frota', evento: 'Lembrete da reserva (véspera, 14h)', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'NAO', limite: '1 por reserva' },
  { cod: 'S48', modulo: 'frota', evento: 'Problema na reserva (ao reservante)', origem: 'SGO_Frota_Reservas.js', publico: 'Reservante', email: 'HORA', whatsapp: 'NAO', limite: '1 por conferência' },
  { cod: 'S49', modulo: 'frota', evento: 'Problema na reserva (à gestão)', origem: 'SGO_Frota_Reservas.js', publico: 'Gestor da Frota', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', area: 'ADMINISTRATIVO' },
  { cod: 'S50', modulo: 'frota', evento: 'Pedido de comprovante de abastecimento (atividade)', origem: 'SGO_Frota_Rastreamento.js', publico: 'Condutor', email: 'RESUMO', whatsapp: 'NAO', limite: 'Como atividade' },
  // Programa de conduta
  { cod: 'S51', modulo: 'conduta', evento: 'Missão aguardando aprovação', origem: 'SGO_Conduta_Missao.js', publico: 'Gestor da área do executante', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', obs: 'Sem WhatsApp: assunto de incentivo.', sensivel: true },
  { cod: 'S52', modulo: 'conduta', evento: 'Missão aprovada ou recusada', origem: 'SGO_Conduta_Missao.js', publico: 'Quem registrou e executantes', email: 'RESUMO', whatsapp: 'NAO', limite: '-', sensivel: true },
  { cod: 'S53', modulo: 'conduta', evento: 'Missão cadastrada em que você é executante', origem: 'SGO_Conduta_Missao.js', publico: 'Executantes', email: 'NAO', whatsapp: 'NAO', limite: '-', obs: 'Só no sistema.' },
  // Integração Auvo
  { cod: 'S54', modulo: 'auvo', evento: 'Chamado técnico aberto', origem: 'SGO_Auvo_Incremental.js', publico: 'Técnico (a gestão vê no painel)', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', obs: 'O aplicativo do Auvo já avisa o técnico. A gestão deixa de receber um aviso por chamado.', area: 'TECNICA' },
  { cod: 'S55', modulo: 'auvo', evento: 'Chamado técnico concluído', origem: 'SGO_Auvo_Incremental.js', publico: 'Ninguém', email: 'NAO', whatsapp: 'NAO', decisao: 'HISTORICO', limite: '-', obs: 'Fica no painel do Auvo e no relatório.' },
  { cod: 'S56', modulo: 'auvo', evento: 'Chamado aberto ou concluído (ao cliente)', origem: 'SGO_Auvo_Incremental.js', publico: 'Cliente (externo)', email: 'HORA', whatsapp: 'NAO', limite: '1 por evento', obs: 'WhatsApp ao cliente só depois do piloto e com modelo aprovado.', whatsHoraPermitido: true },
  // Bate-papo e piloto
  { cod: 'S57', modulo: 'bate_papo', evento: 'Mensagem direta ou menção para quem está fora do sistema', origem: 'SGO_ComunicacaoWhatsapp.js', publico: 'Individual', email: 'NAO', whatsapp: 'RESUMO', limite: 'No resumo: só a contagem de não lidas', obs: 'A ponte do bate-papo para o WhatsApp não volta.' },
  { cod: 'S58', modulo: 'piloto', evento: 'Resumo diário do piloto do WhatsApp', origem: 'SGO_WhatsappPiloto.js', publico: 'Diretoria (dono)', email: 'HORA', whatsapp: 'NAO', limite: '1 por dia, durante o piloto' },
  // 21/10/2026: bloqueio e liberação da partida (SGO_Frota_Bloqueio.js). A liberação aguardando sinal à gestão usa o S36 (exceção do WhatsApp).
  { cod: 'S59', modulo: 'frota', evento: 'Liberação da partida aguardando sinal (ao condutor)', origem: 'SGO_Frota_Bloqueio.js', publico: 'Condutor da retirada', email: 'NAO', whatsapp: 'NAO', limite: '1 por retirada', obs: 'Só no sistema.' },
  { cod: 'S60', modulo: 'frota', evento: 'Devolução fora da base: decidir o bloqueio', origem: 'SGO_Frota_Bloqueio.js', publico: 'Gestor da Frota', email: 'HORA', whatsapp: 'NAO', limite: '1 por devolução', obs: 'Fica na Caixa de decisões.', area: 'ADMINISTRATIVO' },
  { cod: 'S61', modulo: 'frota', evento: 'Retirada esquecida: pergunta ao condutor', origem: 'SGO_Frota_Bloqueio.js', publico: 'Condutor da retirada', email: 'NAO', whatsapp: 'NAO', limite: '1 por parada na base', obs: 'Só no sistema (pergunta na tela da Frota).' },
  { cod: 'S62', modulo: 'frota', evento: 'Retirada esquecida sem resposta do condutor', origem: 'SGO_Frota_Bloqueio.js', publico: 'Gestor da Frota', email: 'HORA', whatsapp: 'NAO', limite: '1 por retirada', obs: 'Fica na Caixa de decisões.', area: 'ADMINISTRATIVO' },
  { cod: 'S63', modulo: 'frota', evento: 'Bloqueio da partida na fila do rastreador (carro sem conexão)', origem: 'SGO_Frota_Bloqueio.js', publico: 'Gestor da Frota', email: 'HORA', whatsapp: 'NAO', limite: '1 por comando', area: 'ADMINISTRATIVO' },
  { cod: 'S64', modulo: 'frota', evento: 'Passar o carro: pedido e conclusão', origem: 'SGO_Frota_Bloqueio.js', publico: 'Quem passa e quem recebe', email: 'NAO', whatsapp: 'NAO', limite: '-', obs: 'Só no sistema.' },
  { cod: 'S65', modulo: 'frota', evento: 'Relatório diário do piloto do bloqueio da partida (18h)', origem: 'SGO_Frota_Bloqueio.js', publico: 'Gestor da Frota; Diretoria (dono)', email: 'HORA', whatsapp: 'NAO', limite: '1 por dia', area: 'ADMINISTRATIVO' },
  // 22/10/2026: Segurança e automação predial (SGO_Automacao_Predial.js)
  { cod: 'S66', modulo: 'automacao', evento: 'Automação predial: comando aceito pela API sem confirmação do dispositivo', origem: 'SGO_Automacao_Predial.js', publico: 'Diretoria; Administrador (só portões)', email: 'HORA', whatsapp: 'NAO', limite: '1 por comando', obs: 'Porta da Diretoria: só a Diretoria é avisada.', area: 'ADMINISTRATIVO' },
  // 22/10/2026: a campainha da fechadura abre um pedido de abertura de cerca de 60 a 90 s; o aviso só serve se chegar na hora.
  { cod: 'S67', modulo: 'automacao', evento: 'Automação predial: pedido de abertura pela campainha da Porta da Diretoria', origem: 'SGO_Automacao_Predial.js', publico: 'Quem pode destravar a porta (responsável pelo sistema e diretores autorizados)', email: 'NAO', whatsapp: 'HORA', limite: '1 por toque da campainha', obs: 'No sistema sempre; WhatsApp só para quem está liberado no piloto. O pedido vale cerca de 60 a 90 segundos.', area: 'ADMINISTRATIVO', whatsHoraPermitido: true },
  // 23/10/2026 (dono): abertura automática da porta quando tocam a campainha; quem pode destravar sabe na hora que a porta abriu
  { cod: 'S68', modulo: 'automacao', evento: 'Automação predial: abertura automática da Porta da Diretoria (aberta sozinha, não abriu, opção ligada ou desligada)', origem: 'SGO_Automacao_Predial.js', publico: 'Quem pode destravar a porta (responsável pelo sistema e diretores autorizados)', email: 'NAO', whatsapp: 'HORA', limite: '1 por pedido da campainha; 1 por mudança da opção', obs: 'No sistema sempre; WhatsApp só para quem está liberado no piloto (ligar e desligar: só no sistema).', area: 'ADMINISTRATIVO', whatsHoraPermitido: true },
  // 26/10/2026 (plano de avisos aprovado pelo dono): "vence hoje" (individual, desligado até a gestão marcar) e comunicado urgente.
  { cod: 'S69', modulo: 'atividades', evento: 'Atividade vence hoje', origem: 'SGO_Atividades_Avisos.js', publico: 'Responsável', email: 'NAO', whatsapp: 'NAO', limite: '1 por atividade por dia', obs: 'Na primeira rodada do expediente do dia do prazo. Desligado por padrão: o resumo do dia já conta o que vence hoje. Marque "na hora" para avisar pelo WhatsApp.' },
  { cod: 'S70', modulo: 'avisos', evento: 'Aviso urgente publicado pela gestão ou RH', origem: 'SGO_Avisos.js', publico: 'Público escolhido', email: 'HORA', whatsapp: 'HORA', limite: 'Teto de WhatsApp na hora por pessoa por dia', obs: 'Quem publica escolhe a importância "Urgente". Só no expediente; fora dele, no sistema e no e-mail.' }
];
var MTZ_MODULOS_NOMES = { atividades: 'Minhas atividades', gestao: 'Caixa de decisões', avisos: 'Avisos com ciência', comercial: 'Comercial', frota: 'Frota', conduta: 'Programa de conduta', auvo: 'Integração Auvo', bate_papo: 'Bate-papo', piloto: 'Piloto do WhatsApp', automacao: 'Segurança e automação predial' };
// Avisos do Comercial (COM_AVISOS.TIPO) que saem por e-mail na hora; os demais vão no resumo do dia (S32).
var MTZ_COMERCIAL_HORA = { APOIO_GESTAO: 'S23', RESPOSTA_APROVADA: 'S28', RESPOSTA_RECUSADA: 'S28' };
// Origem sem evento -> evento da matriz (chamadas que não passam o código).
var MTZ_ORIGEM_EVENTO = { GESTAO_CNH: 'S17', AVISOS: 'S19', COMERCIAL: 'S32' };

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Mtz_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Mtz_up_(v) { return Mtz_s_(v).toUpperCase(); }
function Mtz_json_(t, padrao) { try { var v = JSON.parse(Mtz_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Mtz_agora_(q) { return Utilities.formatDate(q instanceof Date ? q : new Date(), MTZ_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function Mtz_hoje_(q) { return Mtz_agora_(q).slice(0, 10); }
function Mtz_br_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(Mtz_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function Mtz_plural_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }
function Mtz_texto_(v, max) { var s = Mtz_s_(v); return max && s.length > max ? s.slice(0, max - 3).replace(/\s+$/, '') + '...' : s; }
function Mtz_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, MTZ_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
  var s = Mtz_s_(v);
  if (/^\d{4}-\d{2}-\d{2}T.*([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, MTZ_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
  var m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?/.exec(s);
  return m ? m[1] + (m[2] ? 'T' + m[2] + ':' + (m[3] || '00') : '') : '';
}

function Mtz_garantirAba_(aba) {
  var cache = null, chave = 'MTZ_ABA_OK_V1_' + aba;
  try { cache = CacheService.getScriptCache(); if (cache.get(chave)) return; } catch (e) { cache = null; }
  CertCal_garantirTabela_(aba, MTZ_COLUNAS[aba]);
  MTZ_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
  (MTZ_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  try { if (cache) cache.put(chave, '1', 21600); } catch (e) {}
}

function Mtz_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

function Mtz_trava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { try { SpreadsheetApp.flush(); } catch (e) {} lock.releaseLock(); }
}

// ------------------------------------------------------------
// REGRAS EM VIGOR (padrão + mudanças gravadas) E CONFIGURAÇÃO
// ------------------------------------------------------------
function Mtz_padraoDe_(cod) {
  for (var i = 0; i < MTZ_PADRAO.length; i++) if (MTZ_PADRAO[i].cod === cod) return MTZ_PADRAO[i];
  return null;
}

function Mtz_normRegra_(base) {
  var r = JSON.parse(JSON.stringify(base));
  r.moduloNome = MTZ_MODULOS_NOMES[r.modulo] || r.modulo;
  r.decisao = MTZ_DECISOES.indexOf(Mtz_up_(r.decisao)) >= 0 ? Mtz_up_(r.decisao) : 'AVISA';
  r.email = MTZ_CANAIS_EMAIL.indexOf(Mtz_up_(r.email)) >= 0 ? Mtz_up_(r.email) : 'NAO';
  r.whatsapp = MTZ_CANAIS_WHATS.indexOf(Mtz_up_(r.whatsapp)) >= 0 ? Mtz_up_(r.whatsapp) : 'NAO';
  // 26/10/2026: "na hora" vale para qualquer evento marcado pela gestão (antes só as exceções whatsHoraPermitido)
  if (r.decisao === 'HISTORICO') { r.email = 'NAO'; r.whatsapp = 'NAO'; }
  r.area = Mtz_up_(r.area);
  return r;
}

/** Mudanças gravadas (a última de cada código), lidas uma vez e guardadas 5 min. */
function Mtz_mudancas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); var c = cache.get('MTZ_MUDANCAS_V1'); if (c) return JSON.parse(c); } catch (e) { cache = null; }
  var ult = {};
  Mtz_ler_(MTZ_ABAS.REGRAS).forEach(function (l) {
    var cod = Mtz_up_(l.CODIGO);
    if (!cod) return;
    var em = Mtz_iso_(l.ALTERADO_EM) || '';
    if (!ult[cod] || em >= ult[cod].em) ult[cod] = { em: em, depois: Mtz_json_(l.DEPOIS_JSON, {}) };
  });
  var saida = {};
  Object.keys(ult).forEach(function (k) { saida[k] = ult[k].depois; });
  try { if (cache) cache.put('MTZ_MUDANCAS_V1', JSON.stringify(saida), 300); } catch (e) {}
  return saida;
}

function Mtz_invalidar_() { try { CacheService.getScriptCache().remove('MTZ_MUDANCAS_V1'); } catch (e) {} }

/** Regras em vigor: { cod: regra }. Nunca lança (sem leitura, vale o padrão aprovado). */
function Mtz_regras_() {
  // eventos dos setores (SGO_Avisos_Setores.js) entram mesmo que o arquivo carregue depois deste
  if (typeof Setores_registrarEventos_ === 'function') Setores_registrarEventos_();
  var mud = {};
  try { mud = Mtz_mudancas_(); } catch (e) { mud = {}; }
  var mapa = {};
  MTZ_PADRAO.forEach(function (p) {
    var r = Object.assign({}, p), m = mud[p.cod];
    if (m && typeof m === 'object') ['email', 'whatsapp', 'decisao', 'area', 'obsGestao'].forEach(function (k) { if (m[k] !== undefined) r[k] = m[k]; });
    var n = Mtz_normRegra_(r);
    n.alterada = !!m;
    mapa[p.cod] = n;
  });
  return mapa;
}

/** Regra em vigor de um evento (null = evento fora da matriz). */
function SGO_avisoRegra_(cod) {
  cod = Mtz_up_(cod);
  if (!cod) return null;
  return Mtz_regras_()[cod] || null;
}

/** Horários do resumo e filtro por área (padrão + mudança gravada com o código CONFIG). */
function Mtz_cfg_() {
  var c = JSON.parse(JSON.stringify(MTZ_CFG_PADRAO)), g = {};
  try { g = Mtz_mudancas_().CONFIG || {}; } catch (e) { g = {}; }
  var hv = function (h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(Mtz_s_(h)); };
  if (hv(g.horaEmail)) c.horaEmail = g.horaEmail;
  if (hv(g.horaWhats)) c.horaWhats = g.horaWhats;
  if (g.whatsResumo === false) c.whatsResumo = false;
  if (g.centralPorArea === false) c.centralPorArea = false;
  var teto = Number(g.whatsTetoDia);
  if (teto >= 1 && teto <= 10 && Math.round(teto) === teto) c.whatsTetoDia = teto;
  return c;
}

// ------------------------------------------------------------
// PESSOAS, ÁREAS E GESTOR DA ÁREA
// ------------------------------------------------------------
/** Mapa id -> pessoa (usa o da Caixa de decisões quando existe). */
function Mtz_usuarios_() {
  if (typeof Ges_usuarios_ === 'function') return Ges_usuarios_();
  var mapa = {};
  Mtz_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Mtz_up_(u.PERFIL);
    if (perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return;
    var dono = false;
    try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(u.USUARIO); } catch (e) { dono = false; }
    mapa[Mtz_s_(u.ID)] = { id: Mtz_s_(u.ID), nome: Mtz_s_(u.NOME) || Mtz_s_(u.USUARIO), login: Mtz_s_(u.USUARIO), perfil: perfil, ativo: Mtz_up_(u.STATUS || 'ATIVO') === 'ATIVO',
      area: Mtz_up_(u.AREA), email: Mtz_s_(u.EMAIL).toLowerCase(), gestao: perfil === 'ADMIN' || perfil === 'GESTOR' || perfil === 'DIRETORIA',
      // 21/10/2026: RH e Financeiro responsáveis de área recebem a parte da Caixa de decisões no resumo do dia (rotina da empresa).
      rotina: typeof SGO_ehGestaoRotina_ === 'function' && SGO_ehGestaoRotina_(perfil), diretoria: perfil === 'DIRETORIA' || dono, dono: dono,
      sistema: Mtz_s_(u.USUARIO).toLowerCase() === 'admin' };
  });
  return mapa;
}

/**
 * Gestor da área de um módulo (Caixa de decisões > Regras e responsáveis). Área sem gestor: Diretoria (reserva).
 * o: { area (força a área), responsavelId (área da pessoa envolvida), excluir: [ids] }. Devolve ids.
 */
function SGO_avisoGestoresDe_(modulo, o) {
  o = o || {};
  try {
    if (typeof Ges_rotear_ === 'function' && typeof Ges_cfg_ === 'function') {
      var it = { modulo: modulo, responsavelId: Mtz_s_(o.responsavelId), publico: 'GESTAO', extra: { area: Mtz_up_(o.area), naoPode: (o.excluir || []).map(String) } };
      return Ges_rotear_(it, Ges_cfg_(), Mtz_usuarios_()).ids || [];
    }
  } catch (e) { console.error('Matriz de avisos, gestor da área: ' + ((e && e.message) || e)); }
  // sem a Caixa de decisões: quem tem perfil de gestão (como antes)
  var us = Mtz_usuarios_(), fora = (o.excluir || []).map(String);
  return Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.gestao && fora.indexOf(id) < 0; });
}

/** Áreas pelas quais a pessoa responde: a área do cadastro (se for da gestão) e as de Regras e responsáveis. */
function Mtz_areasDe_(uid, us, gcfg) {
  var u = us[uid], areas = [];
  if (u && u.gestao && u.area) areas.push(u.area);
  if (gcfg && typeof Ges_areasDoGestor_ === 'function') Ges_areasDoGestor_(uid, gcfg).forEach(function (a) { if (areas.indexOf(a) < 0) areas.push(a); });
  return areas;
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS FILTRADA PELA ÁREA DO GESTOR
// ------------------------------------------------------------
/**
 * Chamado por Pend_podeVer_ (SGO_Alertas_Central.js) para itens de público GESTAO, TECNICA ou CLIENTE vistos pela
 * gestão. Diretoria e visão interna: tudo. Gestor: o da sua área (e o que é dele, já liberado antes). Gestor sem área:
 * tudo (como antes). Administrador sem área: falhas técnicas e itens sem área.
 */
function SGO_avisoCentralVe_(it, ctx) {
  try {
    if (!ctx || ctx.interno || ctx.diretoria || ctx.cliente) return true;
    if (!ctx.__mtz) {
      var cfg = Mtz_cfg_();
      var us = Mtz_usuarios_(), gcfg = typeof Ges_cfg_ === 'function' ? Ges_cfg_() : null;
      ctx.__mtz = { ligado: cfg.centralPorArea, us: us, gcfg: gcfg, areas: Mtz_areasDe_(ctx.userId, us, gcfg) };
    }
    var m = ctx.__mtz;
    if (!m.ligado) return true;
    if (MTZ_TIPOS_TECNICOS.indexOf(it.tipo) >= 0) return ctx.perfil === 'ADMIN' || m.areas.length > 0 || ctx.perfil === 'GESTOR';
    if (!m.areas.length) return ctx.perfil !== 'ADMIN' || !Mtz_areaDoItem_(it, m);
    var area = Mtz_areaDoItem_(it, m);
    return !area || m.areas.indexOf(area) >= 0;
  } catch (e) { return true; }
}

function Mtz_areaDoItem_(it, m) {
  var ex = it.extra || {};
  if (ex.area) return Mtz_up_(ex.area);
  var p = it.responsavelId && m.us[Mtz_s_(it.responsavelId)];
  if (p && p.area) return p.area;
  if (typeof Ges_areaDoModulo_ === 'function' && m.gcfg) return Ges_areaDoModulo_(it.modulo, m.gcfg);
  return '';
}

// ------------------------------------------------------------
// PRESENÇA (o resumo do WhatsApp só vai a quem ainda não abriu o sistema no dia)
// ------------------------------------------------------------
/** Marca que a pessoa abriu o sistema hoje (chamado pela central de pendências a cada abertura do Início). */
function SGO_avisoMarcarPresenca_(uid) {
  uid = Mtz_s_(uid);
  if (!uid) return;
  try {
    var cache = CacheService.getScriptCache(), k = 'MTZ_ABRIU_' + Mtz_hoje_() + '_' + uid;
    if (!cache.get(k)) cache.put(k, Mtz_agora_().slice(11, 16), 21600);
  } catch (e) {}
}

/** A pessoa abriu o sistema hoje? (marca do dia, acesso da gestão em GES_ACESSOS ou login de hoje). */
function Mtz_abriuHoje_(u, dia, acessos) {
  try { if (CacheService.getScriptCache().get('MTZ_ABRIU_' + dia + '_' + u.id)) return true; } catch (e) {}
  if (acessos && acessos.gestao && acessos.gestao[u.id + '|' + dia]) return true;
  if (acessos && acessos.login) {
    var l = acessos.login[Mtz_s_(u.login).toLowerCase()];
    if (l && Mtz_iso_(l).slice(0, 10) === dia) return true;
  }
  return false;
}

function Mtz_acessos_(dia) {
  var a = { gestao: {}, login: {} };
  try {
    if (typeof GES_ABA_ACESSOS !== 'undefined') Mtz_ler_(GES_ABA_ACESSOS).forEach(function (r) { a.gestao[Mtz_s_(r.USUARIO_ID) + '|' + Mtz_s_(r.DIA).slice(0, 10)] = true; });
  } catch (e) {}
  try { if (typeof Usuarios_ultimosAcessos_ === 'function') a.login = Usuarios_ultimosAcessos_() || {}; } catch (e) {}
  return a;
}

/** Algum lembrete do assistente do ponto desta pessoa está a menos de 10 minutos (antes ou depois)? Só leitura. */
function Mtz_pertoDoPonto_(uid, agora) {
  try {
    var hm = function (v) {
      if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? NaN : (function (t) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); })(Utilities.formatDate(v, MTZ_FUSO, 'HH:mm'));
      var m = /^'?(\d{1,2}):(\d{2})/.exec(Mtz_s_(v)); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
    };
    var hora = Utilities.formatDate(agora, MTZ_FUSO, 'HH:mm'), agoraMin = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
    var perto = function (min) { return isFinite(min) && Math.abs(agoraMin - min) <= MTZ_PONTO_JANELA_MIN; };
    var aba = (typeof PONTO_ABAS !== 'undefined' && PONTO_ABAS.PESSOAS) || 'PONTO_PESSOAS';
    var p = Mtz_ler_(aba).filter(function (r) { return Mtz_s_(r.USUARIO_ID) === uid; }).pop();
    if (p && /^(SIM|TRUE|1)$/i.test(Mtz_s_(p.PARTICIPA))) {
      var ent = hm(p.ENTRADA), alm = hm(p.ALMOCO), sai = hm(p.SAIDA), ret = isFinite(alm) ? alm + (Number(p.RETORNO_MIN) || 60) : NaN;
      if (perto(ent - 5) || perto(alm) || perto(ret) || perto(sai - 5) || perto(hm(p.SAIDA_SEXTA) - 5)) return true;
    }
    // lembrete do ponto enviado há pouco (NTF_ENVIOS, origem PONTO)
    var limite = Mtz_agora_(new Date(agora.getTime() - MTZ_PONTO_JANELA_MIN * 60000));
    return Mtz_ler_(Notificar_aba_()).some(function (r) {
      return Mtz_s_(r.USUARIO_ID) === uid && Mtz_up_(r.ORIGEM).indexOf('PONTO') === 0 && Mtz_s_(r.CANAL).toLowerCase() === 'whatsapp' && Mtz_iso_(r.QUANDO) >= limite;
    });
  } catch (e) { return false; }
}

// ------------------------------------------------------------
// GANCHOS DO NOTIFICADOR (SGO_Notificar.js)
// ------------------------------------------------------------
/**
 * Ponto (regra própria), resumo do dia (já é o resumo) e o resumo do piloto do WhatsApp (o piloto continua como
 * está) não passam pela matriz.
 */
function Mtz_foraDaMatriz_(o) {
  var cat = Mtz_up_(o.categoria), org = Mtz_up_(o.origem);
  return cat === 'PONTO' || org.indexOf('PONTO') === 0 || cat === 'RESUMO_DIA' || org === 'RESUMO_DIA' || org === 'WA_PILOTO';
}

/** Evento da chamada: o informado ou o da origem (Comercial: pelo tipo do aviso guardado). */
function Mtz_eventoDa_(o) {
  var ev = Mtz_up_(o.evento);
  if (ev) return ev;
  var org = Mtz_up_(o.origem);
  if (org === 'COMERCIAL') {
    var ids = Mtz_s_(o.refId).split(',').map(Mtz_s_).filter(Boolean);
    if (ids.length && typeof COM_ABAS !== 'undefined') {
      var hora = '';
      try {
        Mtz_ler_(COM_ABAS.AVISOS).forEach(function (v) { if (!hora && ids.indexOf(Mtz_s_(v.ID)) >= 0 && MTZ_COMERCIAL_HORA[Mtz_up_(v.TIPO)]) hora = MTZ_COMERCIAL_HORA[Mtz_up_(v.TIPO)]; });
      } catch (e) {}
      if (hora) return hora;
    }
    return 'S32';
  }
  return MTZ_ORIGEM_EVENTO[org] || '';
}

/**
 * Antes de enviar: aplica a regra do evento ao e-mail. Devolve null (sem mudança) ou
 * { canais, evento, historico, semEmail: { usuárioId: { modo: 'NAO'|'RESUMO'|'HORA', motivo } } }.
 * Para quem está em semEmail o e-mail não sai agora: "NAO" fica só no sistema; "RESUMO" e "HORA" fora do expediente
 * vão para a fila (NTF_RESUMO_FILA). "Vira histórico" tira e-mail e WhatsApp da chamada.
 * Contato externo (cliente) não entra na fila: recebe na hora, como antes.
 */
function SGO_avisoMatrizPreparar_(o, ids, canais) {
  try {
    if (!o || Mtz_foraDaMatriz_(o)) return null;
    var evento = Mtz_eventoDa_(o);
    var regra = evento ? SGO_avisoRegra_(evento) : null;
    var saida = { canais: canais.slice(), evento: evento, semEmail: {}, historico: !!(regra && regra.decisao === 'HISTORICO') };
    if (!regra) return saida;
    if (saida.historico) { saida.canais = canais.filter(function (c) { return c !== 'email' && c !== 'whatsapp'; }); return saida; }
    // 26/10/2026: evento marcado "na hora" pela gestão vai também pelo WhatsApp, mesmo que o módulo tenha pedido só sistema
    // ou e-mail (a regra do WhatsApp em SGO_avisoMotivoWhatsapp_ confere expediente, vínculo, piloto e teto). o.semWhatsapp barra.
    if (regra.whatsapp === 'HORA' && !o.semWhatsapp && saida.canais.indexOf('whatsapp') < 0 && (saida.canais.indexOf('email') >= 0 || saida.canais.indexOf('sgo') >= 0)) saida.canais.push('whatsapp');
    if (canais.indexOf('email') < 0) return saida;
    var internos = ids.filter(function (id) { return String(id).indexOf('EXT:') !== 0; });
    var modo = regra.email;
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
    if (modo === 'RESUMO' && regra.horaSeHoje && o.prazoHoje) modo = 'HORA';
    if (modo === 'HORA' && !ex.dentro) modo = regra.foraExpediente === 'RESUMO' ? 'RESUMO' : 'HORA_FILA';
    if (modo === 'HORA' || !internos.length) return saida;
    if (modo === 'NAO') {
      internos.forEach(function (uid) { saida.semEmail[uid] = { modo: 'NAO', motivo: 'Matriz de avisos (' + evento + '): este aviso fica só no sistema, sem e-mail.' }; });
      return saida;
    }
    var nomes = {};
    try { var us = Mtz_usuarios_(); internos.forEach(function (id) { nomes[id] = us[id] ? us[id].nome : ''; }); } catch (e) {}
    var titulo = Mtz_texto_(o.titulo || 'Aviso do SGO+', 180), texto = Mtz_texto_(o.texto, 3000);
    var link = Mtz_s_(o.link), quando = Mtz_agora_();
    var filaModo = modo === 'HORA_FILA' ? 'HORA' : 'RESUMO';
    Mtz_garantirAba_(MTZ_ABAS.FILA);
    var linhas = internos.map(function (uid) {
      return { USUARIO_ID: uid, USUARIO_NOME: nomes[uid] || '', EVENTO: evento, MODULO: regra.modulo, MODO: filaModo, TITULO: titulo, TEXTO: texto, LINK: link.slice(0, 500),
        SENSIVEL: regra.sensivel ? 'SIM' : '', ORIGEM: Mtz_s_(o.origem).slice(0, 40), REF_ID: Mtz_s_(o.refId).slice(0, 80), QUANDO: quando, SITUACAO: 'PENDENTE', ENVIADO_EM: '', MOTIVO: '' };
    });
    SGO_DATA.insertMany(MTZ_ABAS.FILA, linhas);
    var motivo = filaModo === 'HORA'
      ? 'Fora do expediente (' + (ex.motivo || 'fora do horário') + '): guardado e enviado na primeira rodada do próximo expediente (matriz de avisos, ' + evento + ').'
      : 'Guardado para o e-mail de resumo do dia (matriz de avisos, ' + evento + ').';
    internos.forEach(function (uid) { saida.semEmail[uid] = { modo: filaModo, motivo: motivo }; });
    return saida;
  } catch (e) {
    console.error('Matriz de avisos (preparar): ' + ((e && e.message) || e));
    return null;
  }
}

/**
 * Motivo para NÃO mandar WhatsApp a este contato ('' = pode). Vale para todo envio pelo notificador, menos o
 * assistente do ponto (regra própria). ctx: { categoria, origem, evento }.
 */
function SGO_avisoMotivoWhatsapp_(c, ctx) {
  ctx = ctx || {};
  if (Mtz_foraDaMatriz_(ctx) && Mtz_up_(ctx.categoria) !== 'RESUMO_DIA' && Mtz_up_(ctx.origem) !== 'RESUMO_DIA') return '';
  var evento = Mtz_up_(ctx.evento) || Mtz_eventoDa_(ctx);
  var regra = evento ? SGO_avisoRegra_(evento) : null;
  var resumoDia = Mtz_up_(ctx.categoria) === 'RESUMO_DIA';
  if (c && c.externo) {
    if (regra && regra.whatsapp === 'HORA') return '';
    return 'Matriz de avisos: cliente e contato externo não recebem WhatsApp do SGO+ até o fim do piloto (o aviso vai por e-mail, quando há e-mail no cadastro).';
  }
  var cfgV = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
  var lib = (cfgV.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
  var v = String((c && c.vinculo) || '').toUpperCase();
  if (lib.indexOf(v || 'VAZIO') < 0) {
    return v === 'PJ' ? 'PJ: pela matriz de avisos o WhatsApp é só para CLT (o aviso segue no sistema e por e-mail).'
      : v === 'DIRETORIA' ? 'Diretoria: pela matriz de avisos o WhatsApp é só para CLT (o aviso segue no sistema e por e-mail; a gestão libera a Diretoria em Atividades da equipe > Avisos e horários).'
      : (v ? 'Vínculo ' + v + ' fora da lista do WhatsApp (Atividades da equipe > Avisos e horários).' : 'Vínculo de trabalho não informado (Administração > Usuários > Vínculo): o aviso segue no sistema e por e-mail.');
  }
  if (resumoDia) return '';
  if (!regra || regra.whatsapp !== 'HORA') {
    return 'Matriz de avisos: este aviso não vai pelo WhatsApp' + (evento ? ' (' + evento + ')' : '') + '. Fica no sistema e no e-mail' + (regra && regra.whatsapp === 'RESUMO' ? ', e entra na contagem do resumo do dia' : '') + '.';
  }
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
  if (!ex.dentro) return 'Fora do expediente (' + ex.motivo + '): WhatsApp na hora só no expediente' + (regra.foraExpediente === 'RESUMO' ? '; o aviso vai no resumo do dia seguinte' : '') + '.';
  var hoje = Mtz_hoje_(), uid = String(c.id || '');
  var hojeOk = Mtz_ler_(Notificar_aba_()).filter(function (r) {
    return Mtz_s_(r.USUARIO_ID) === uid && Mtz_s_(r.CANAL).toLowerCase() === 'whatsapp' && Mtz_up_(r.SITUACAO) === 'OK' && Mtz_iso_(r.QUANDO).slice(0, 10) === hoje;
  });
  if (regra.whatsHoraPermitido) {
    // exceções aprovadas (Frota, campainha): uma por pessoa por dia em cada uma, fora do teto
    if (hojeOk.some(function (r) { return Mtz_up_(r.EVENTO) === evento; })) return 'Limite da matriz de avisos: um WhatsApp por pessoa por dia nesta exceção (' + evento + ') já enviado hoje; o aviso segue no sistema.';
    return '';
  }
  // 26/10/2026: demais eventos marcados "na hora" somam no teto diário da pessoa
  var regras = Mtz_regras_(), teto = Mtz_cfg_().whatsTetoDia;
  var usados = hojeOk.filter(function (r) { var rg = regras[Mtz_up_(r.EVENTO)]; return rg && rg.whatsapp === 'HORA' && !rg.whatsHoraPermitido; }).length;
  if (usados >= teto) return 'Limite da matriz de avisos: esta pessoa já recebeu hoje ' + usados + ' WhatsApp na hora (teto de ' + teto + ' por dia); o aviso segue no sistema e no e-mail.';
  return '';
}

/** Guarda um item para o e-mail de resumo (quem chama já sabe que é resumo). itens: { titulo, texto, link, evento, origem, refId }. */
function SGO_avisoGuardarResumo_(uids, item) {
  var regra = SGO_avisoRegra_(item.evento) || { modulo: item.modulo || '', sensivel: false };
  var us = {};
  try { us = Mtz_usuarios_(); } catch (e) {}
  Mtz_garantirAba_(MTZ_ABAS.FILA);
  var quando = Mtz_agora_();
  var linhas = (uids || []).filter(Boolean).map(function (uid) {
    uid = String(uid);
    return { USUARIO_ID: uid, USUARIO_NOME: us[uid] ? us[uid].nome : '', EVENTO: Mtz_up_(item.evento), MODULO: regra.modulo || item.modulo || '', MODO: item.modo === 'HORA' ? 'HORA' : 'RESUMO',
      TITULO: Mtz_texto_(item.titulo, 180), TEXTO: Mtz_texto_(item.texto, 3000), LINK: Mtz_s_(item.link).slice(0, 500), SENSIVEL: regra.sensivel ? 'SIM' : '',
      ORIGEM: Mtz_s_(item.origem).slice(0, 40), REF_ID: Mtz_s_(item.refId).slice(0, 80), QUANDO: quando, SITUACAO: 'PENDENTE', ENVIADO_EM: '', MOTIVO: '' };
  });
  if (linhas.length) SGO_DATA.insertMany(MTZ_ABAS.FILA, linhas);
  return linhas.length;
}

// ------------------------------------------------------------
// PREFERÊNCIAS (Menu > Meus avisos)
// ------------------------------------------------------------
// horaEmail vazia = a hora geral do resumo (Mtz_cfg_); a pessoa pode escolher 12:00.
var MTZ_PREFS_PADRAO = { whatsResumo: true, horaEmail: '', emailInformativos: false, silenciar: [] };

function Mtz_prefsTodas_() {
  var ult = {};
  Mtz_ler_(MTZ_ABAS.PREFS).forEach(function (l) {
    var uid = Mtz_s_(l.USUARIO_ID), em = Mtz_iso_(l.ALTERADO_EM);
    if (uid && (!ult[uid] || em >= ult[uid].em)) ult[uid] = { em: em, p: Mtz_json_(l.PREFS_JSON, {}) };
  });
  var saida = {};
  Object.keys(ult).forEach(function (k) { saida[k] = Mtz_prefsNorm_(ult[k].p, ult[k].em); });
  return saida;
}

function Mtz_prefsNorm_(p, em) {
  var c = JSON.parse(JSON.stringify(MTZ_PREFS_PADRAO));
  p = p || {};
  if (p.whatsResumo === false) c.whatsResumo = false;
  if (p.horaEmail === MTZ_CFG_PADRAO.horaEmailAlternativa) c.horaEmail = MTZ_CFG_PADRAO.horaEmailAlternativa;
  else c.horaEmail = '';
  if (p.emailInformativos === true) c.emailInformativos = true;
  if (Array.isArray(p.silenciar)) c.silenciar = p.silenciar.map(String).filter(function (m, i, l) { return MTZ_MODULOS_SILENCIAVEIS[m] && l.indexOf(m) === i; });
  if (em) c.alteradoEm = em;
  return c;
}

function Mtz_prefsDe_(uid, todas) {
  var t = todas || Mtz_prefsTodas_();
  return t[uid] || Mtz_prefsNorm_({}, '');
}

// ------------------------------------------------------------
// RESUMO DO DIA: CONTEÚDO
// ------------------------------------------------------------
/** Contexto da central de pendências para uma pessoa (sem cache, só o que é dela e o que ela vê). */
function Mtz_ctxPessoa_(u) {
  return { userId: u.id, perfil: u.perfil, nome: u.nome, clienteId: '', cliente: false, gestao: !!u.gestao, diretoria: !!u.diretoria, interno: false };
}

function Mtz_naoLidasBatePapo_(uid) {
  try {
    if (typeof comBanco_ !== 'function' || typeof comPessoaDoUsuario_ !== 'function' || typeof comContagens_ !== 'function') return 0;
    var ss = comBanco_(false);
    if (!ss) return 0;
    var eu = comPessoaDoUsuario_(ss, { id: uid }, false);
    if (!eu) return 0;
    return Number(comContagens_(ss, eu, 'SGO').contagens.mensagens) || 0;
  } catch (e) { return 0; }
}

/**
 * Parte da Caixa de decisões de um gestor: { linhas: [], qtd, paradas, ids, esperarRelatorios, diretoria }.
 * cx: Ges_caixa_() (lido uma vez por rodada). Programa de conduta e ponto vão só como contagem (assunto de colega).
 */
function Mtz_parteGestao_(u, cx, ex, rel) {
  var r = { linhas: [], qtd: 0, paradas: 0, ids: [], idsParadas: [], esperar: false };
  if (!cx || !(u.gestao || u.rotina) || typeof Ges_meusItens_ !== 'function') return r;
  var cfg = cx.cfg, e = cfg.escada;
  var minhas = Ges_meusItens_(cx.itens, u.id, cx.us).filter(function (i) { return i.responsaveis.indexOf(u.id) >= 0 && !i.acompanhamento; });
  var paradas = minhas.filter(function (i) { return i.diasParado >= e.whatsDiasUteis && i.etapa !== 'PAUSADO'; });
  r.qtd = minhas.length; r.paradas = paradas.length;
  r.ids = minhas.map(function (i) { return i.id; }); r.idsParadas = paradas.map(function (i) { return i.id; });
  var sens = minhas.filter(function (i) { return MTZ_MODULOS_SENSIVEIS.indexOf(i.modulo) >= 0; });
  var abertas = minhas.filter(function (i) { return sens.indexOf(i) < 0; });
  var ordem = abertas.slice().sort(function (a, b) { return (b.diasParado || 0) - (a.diasParado || 0); });
  ordem.slice(0, MTZ_MAX_ITENS_EMAIL).forEach(function (i) { r.linhas.push(typeof Ges_linhaItem_ === 'function' ? Ges_linhaItem_(i) : '- ' + i.titulo); });
  if (ordem.length > MTZ_MAX_ITENS_EMAIL) r.linhas.push('E mais ' + (ordem.length - MTZ_MAX_ITENS_EMAIL) + ' na Caixa de decisões.');
  if (sens.length) r.linhas.push('- ' + Mtz_plural_(sens.length, 'decisão do Programa de conduta ou do ponto', 'decisões do Programa de conduta ou do ponto') + ' (o detalhe fica só no sistema). Abra a Caixa de decisões.');
  if (paradas.length) r.linhas.unshift('Paradas há ' + e.whatsDiasUteis + ' dias úteis ou mais: ' + paradas.length + '. Com ' + e.diretoriaDiasUteis + ' dias úteis o item vai para a Diretoria com o seu nome.');
  var acompItens = cx.itens.filter(function (i) { return i.acompanhamento && i.responsaveis.indexOf(u.id) >= 0; }), acomp = acompItens.length;
  r.idsAcomp = acompItens.map(function (i) { return i.id; });
  if (acomp) r.linhas.push('Para acompanhar (vencimentos de clientes): ' + acomp + ' item(ns) na aba Acompanhamento da Caixa de decisões.');
  if (u.diretoria && typeof Ges_textoDiretoria_ === 'function') {
    if (rel && rel.pendente && ex.hora < (typeof GES_HORA_LIMITE_RELATORIOS !== 'undefined' ? GES_HORA_LIMITE_RELATORIOS : '10:30')) r.esperar = true;
    var cxSeg = { cfg: cx.cfg, us: cx.us, itens: cx.itens.map(function (i) {
      if (MTZ_MODULOS_SENSIVEIS.indexOf(i.modulo) < 0) return i;
      var c = Object.assign({}, i); c.titulo = (MTZ_MODULOS_NOMES[i.modulo] || 'Programa de conduta') + ': decisão escalada (detalhe na Caixa de decisões)'; return c;
    }) };
    var d = Ges_textoDiretoria_(cxSeg, ex, rel ? rel.lista : []);
    if (d && d.texto) { r.diretoria = d.texto; r.escalados = d.escalados || 0; }
  }
  return r;
}

/**
 * Monta o resumo de uma pessoa. Devolve { titulo, texto, itens: n, contagens, fila: [ids], atv: [ids], gestao, vazio }.
 * fontes: { pend (função ctx -> itens), filaPorPessoa, atvPorPessoa, cx, rel, ex, prefs }.
 */
function Mtz_montarResumo_(u, f) {
  var prefs = f.prefs || MTZ_PREFS_PADRAO, cont = { atividadesAtrasadas: 0, atividadesHoje: 0, atividadesNovas: 0, decisoes: 0, decisoesParadas: 0, avisosCiencia: 0, avisosVencidos: 0, batePapo: 0, outros: 0 };
  var blocos = [], usadosFila = [], usadosAtv = [];
  var silencio = prefs.silenciar || [];
  // 1. o que é seu na central de pendências (atividades, frota, comercial, e-mail de clientes, avisos com ciência)
  var itens = [];
  try { itens = (f.pend ? f.pend(Mtz_ctxPessoa_(u)) : []).filter(function (i) { return i.meu && i.modulo !== 'ponto'; }); } catch (e) { itens = []; }
  var atv = itens.filter(function (i) { return i.modulo === 'atividades' && (i.tipo === 'atividade_atrasada' || i.tipo === 'atividade_hoje'); });
  cont.atividadesAtrasadas = atv.filter(function (i) { return i.tipo === 'atividade_atrasada'; }).length;
  cont.atividadesHoje = atv.filter(function (i) { return i.tipo === 'atividade_hoje'; }).length;
  var avisos = itens.filter(function (i) { return i.tipo === 'aviso_ciencia'; });
  cont.avisosCiencia = avisos.length;
  cont.avisosVencidos = avisos.filter(function (i) { return i.gravidade === 'CRITICO'; }).length;
  var outros = itens.filter(function (i) {
    if (atv.indexOf(i) >= 0 || avisos.indexOf(i) >= 0) return false;
    if (MTZ_MODULOS_SILENCIAVEIS[i.modulo] && silencio.indexOf(i.modulo) >= 0) return false;
    if (i.gravidade === 'INFO' && !prefs.emailInformativos) return false;
    return true;
  });
  if (atv.length) {
    var la = ['SUAS ATIVIDADES'];
    atv.slice(0, MTZ_MAX_ITENS_EMAIL).forEach(function (i) { la.push('- ' + i.titulo + (i.vencimento ? ' (previsão ' + i.vencimento + ')' : '') + '.'); });
    if (atv.length > MTZ_MAX_ITENS_EMAIL) la.push('E mais ' + (atv.length - MTZ_MAX_ITENS_EMAIL) + ' em Minhas atividades.');
    la.push('Atividade atrasada pede justificativa com nova previsão, ou a conclusão (Minhas atividades).');
    blocos.push(la.join('\n'));
  }
  // 2. avisos de atividades guardados (nova, passada para você, atrasada, justificativa)
  var atvAvisos = (f.atvPorPessoa && f.atvPorPessoa[u.id]) || [];
  if (atvAvisos.length) {
    cont.atividadesNovas = atvAvisos.filter(function (v) { return Mtz_up_(v.TIPO) === 'NOVA'; }).length;
    var lv = ['AVISOS DE ATIVIDADES'];
    atvAvisos.slice(0, MTZ_MAX_ITENS_EMAIL).forEach(function (v) { lv.push('- ' + Mtz_texto_(v.TITULO, 160) + ': ' + Mtz_texto_(v.TEXTO, 300)); usadosAtv.push(v.ID); });
    if (atvAvisos.length > MTZ_MAX_ITENS_EMAIL) atvAvisos.slice(MTZ_MAX_ITENS_EMAIL).forEach(function (v) { usadosAtv.push(v.ID); });
    blocos.push(lv.join('\n'));
  }
  // 3. Caixa de decisões (gestão)
  var g = f.cx ? Mtz_parteGestao_(u, f.cx, f.ex, f.rel) : { linhas: [], qtd: 0, paradas: 0 };
  cont.decisoes = g.qtd; cont.decisoesParadas = g.paradas;
  if (g.qtd) blocos.push(['DECISÕES QUE DEPENDEM DE VOCÊ (' + g.qtd + ')'].concat(g.linhas).join('\n'));
  if (g.diretoria) blocos.push(g.diretoria);
  // 21/10/2026: o que já está na Caixa de decisões (inclusive em acompanhamento) não se repete em "Outras pendências suas"
  var naCaixa = (g.ids || []).concat(g.idsAcomp || []);
  if (naCaixa.length) outros = outros.filter(function (i) { return naCaixa.indexOf(i.id) < 0; });
  // 4. avisos do dia guardados pelos módulos (Frota, Comercial, Programa de conduta, Auvo, CNH...)
  var fila = ((f.filaPorPessoa && f.filaPorPessoa[u.id]) || []);
  var filaVisivel = fila.filter(function (v) { return !(MTZ_MODULOS_SILENCIAVEIS[Mtz_s_(v.MODULO)] && silencio.indexOf(Mtz_s_(v.MODULO)) >= 0); });
  fila.forEach(function (v) { usadosFila.push(v.ID); });
  if (filaVisivel.length) {
    var porMod = {};
    filaVisivel.forEach(function (v) { var m = Mtz_s_(v.MODULO) || 'outros'; (porMod[m] = porMod[m] || []).push(v); });
    Object.keys(porMod).forEach(function (m) {
      var l = porMod[m], nome = (MTZ_MODULOS_NOMES[m] || 'Outros avisos').toUpperCase();
      var sens = l.filter(function (v) { return Mtz_up_(v.SENSIVEL) === 'SIM'; }), abertos = l.filter(function (v) { return sens.indexOf(v) < 0; });
      var linhas = [nome];
      abertos.slice(0, MTZ_MAX_ITENS_EMAIL).forEach(function (v) { linhas.push('- ' + Mtz_texto_(v.TITULO, 160) + '\n  ' + Mtz_texto_(v.TEXTO, 600).replace(/\n+/g, '\n  ')); });
      if (abertos.length > MTZ_MAX_ITENS_EMAIL) linhas.push('E mais ' + (abertos.length - MTZ_MAX_ITENS_EMAIL) + ' no sistema.');
      if (sens.length) linhas.push('- ' + Mtz_plural_(sens.length, 'aviso', 'avisos') + ' do ' + (MTZ_MODULOS_NOMES[m] || 'módulo') + ' (o detalhe fica só no sistema).');
      blocos.push(linhas.join('\n'));
    });
    cont.outros += filaVisivel.length;
  }
  // 5. outras pendências suas (Frota, Comercial, e-mail de clientes...)
  if (outros.length) {
    var lo = ['OUTRAS PENDÊNCIAS SUAS'];
    var sensO = outros.filter(function (i) { return MTZ_MODULOS_SENSIVEIS.indexOf(i.modulo) >= 0; }), abO = outros.filter(function (i) { return sensO.indexOf(i) < 0; });
    abO.slice(0, MTZ_MAX_ITENS_EMAIL).forEach(function (i) { lo.push('- ' + i.moduloNome + ': ' + i.titulo + (i.oQueFazer ? ' O que fazer: ' + i.oQueFazer : '')); });
    if (sensO.length) lo.push('- ' + Mtz_plural_(sensO.length, 'pendência', 'pendências') + ' do Programa de conduta ou da Qualidade (o detalhe fica só no sistema).');
    blocos.push(lo.join('\n'));
    cont.outros += outros.length;
  }
  // 6. avisos com ciência e bate-papo: só a contagem
  var contagens = [];
  if (cont.avisosCiencia) contagens.push('Você tem ' + Mtz_plural_(cont.avisosCiencia, 'aviso', 'avisos') + ' para confirmar a leitura' + (cont.avisosVencidos ? ' (' + cont.avisosVencidos + ' com o prazo vencido)' : '') + ' em Principal > Avisos.');
  cont.batePapo = f.batePapo ? f.batePapo(u.id) : 0;
  if (cont.batePapo) contagens.push('Você tem ' + Mtz_plural_(cont.batePapo, 'mensagem não lida', 'mensagens não lidas') + ' no bate-papo.');
  if (contagens.length) blocos.push(contagens.join('\n'));
  var temAlgo = !!(atv.length || atvAvisos.length || g.qtd || g.diretoria || filaVisivel.length || outros.length || cont.avisosCiencia);
  var primeiro = typeof Notificar_primeiroNome_ === 'function' ? Notificar_primeiroNome_(u.nome) : u.nome;
  var partesTit = [];
  if (cont.atividadesAtrasadas + cont.atividadesHoje) partesTit.push(Mtz_plural_(cont.atividadesAtrasadas + cont.atividadesHoje, 'atividade', 'atividades'));
  if (g.qtd) partesTit.push(Mtz_plural_(g.qtd, 'decisão', 'decisões'));
  if (cont.avisosCiencia) partesTit.push(Mtz_plural_(cont.avisosCiencia, 'aviso', 'avisos'));
  var titulo = 'Resumo do dia' + (partesTit.length ? ': ' + partesTit.join(', ') : '') + ' (' + Mtz_br_(f.ex ? f.ex.dia : Mtz_hoje_()).slice(0, 5) + ')';
  var texto = 'Bom dia, ' + primeiro + '.\n\nEste é o seu resumo do dia no SGO+: um e-mail só, com o que espera por você. Cada item diz o que fazer; tudo continua no sistema (Início e central de pendências) até ser resolvido.\n\n' +
    blocos.join('\n\n') + '\n\nO que você recebe por e-mail e WhatsApp está em Menu > Meus avisos.';
  return { titulo: titulo, texto: texto, contagens: cont, fila: usadosFila, atv: usadosAtv, gestao: g, vazio: !temAlgo };
}

/** Frase das contagens do WhatsApp (sem nome de colega, valor, conduta ou ponto). */
function Mtz_fraseWhats_(c) {
  var p = [];
  if (c.atividadesAtrasadas) p.push(Mtz_plural_(c.atividadesAtrasadas, 'atividade atrasada', 'atividades atrasadas'));
  if (c.atividadesHoje) p.push(c.atividadesHoje === 1 ? '1 atividade vence hoje' : c.atividadesHoje + ' atividades vencem hoje');
  if (c.atividadesNovas) p.push(Mtz_plural_(c.atividadesNovas, 'atividade nova', 'atividades novas'));
  if (c.decisoesParadas) p.push(Mtz_plural_(c.decisoesParadas, 'decisão parada', 'decisões paradas') + ' na Caixa de decisões');
  else if (c.decisoes) p.push(Mtz_plural_(c.decisoes, 'decisão', 'decisões') + ' na Caixa de decisões');
  if (c.avisosCiencia) p.push(Mtz_plural_(c.avisosCiencia, 'aviso', 'avisos') + ' para confirmar a leitura');
  if (c.batePapo) p.push(Mtz_plural_(c.batePapo, 'mensagem não lida', 'mensagens não lidas') + ' no bate-papo');
  return p.join(', ');
}

// ------------------------------------------------------------
// RESUMO DO DIA: RODADA (rotinas da gestão e das atividades)
// ------------------------------------------------------------
function Mtz_registroResumo_(linhas) {
  if (!linhas.length) return;
  Mtz_garantirAba_(MTZ_ABAS.RESUMOS);
  SGO_DATA.insertMany(MTZ_ABAS.RESUMOS, linhas);
}

/** E-mails "na hora" que nasceram fora do expediente: saem agrupados por pessoa na primeira rodada do expediente. */
function Mtz_enviarFilaHora_(ex) {
  var fila = Mtz_ler_(MTZ_ABAS.FILA).filter(function (v) { return Mtz_up_(v.SITUACAO) === 'PENDENTE' && Mtz_up_(v.MODO) === 'HORA'; });
  if (!fila.length) return { enviados: 0 };
  var porPessoa = {};
  fila.forEach(function (v) { (porPessoa[Mtz_s_(v.USUARIO_ID)] = porPessoa[Mtz_s_(v.USUARIO_ID)] || []).push(v); });
  var enviados = 0, agora = Mtz_agora_();
  Object.keys(porPessoa).forEach(function (uid) {
    var l = porPessoa[uid];
    var titulo = l.length === 1 ? Mtz_s_(l[0].TITULO) : 'Avisos do SGO+ (' + l.length + ')';
    var texto = l.map(function (v, i) { return (l.length > 1 ? (i + 1) + '. ' + Mtz_s_(v.TITULO) + '\n' : '') + Mtz_s_(v.TEXTO); }).join('\n\n');
    var r = { ok: 0 };
    try { r = SGO_notificar_({ usuarios: [uid], canais: ['email'], categoria: 'RESUMO_DIA', origem: 'RESUMO_DIA', evento: Mtz_s_(l[0].EVENTO), refId: 'FILA-' + l.map(function (v) { return v.ID; }).join(',').slice(0, 70), titulo: titulo, texto: texto, link: Mtz_s_(l[0].LINK) || undefined }) || { ok: 0 }; }
    catch (e) { r = { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
    var sit = r.ok ? 'ENVIADO' : (r.pulado ? 'PULADO' : '');
    if (!sit) return;   // erro: tenta de novo na próxima rodada
    if (r.ok) enviados++;
    l.forEach(function (v) { SGO_DATA.update(MTZ_ABAS.FILA, v.ID, { SITUACAO: sit, ENVIADO_EM: agora, MOTIVO: Mtz_texto_(r.ok ? 'enviado na primeira rodada do expediente' : r.motivo, 300) }); });
  });
  return { enviados: enviados };
}

/**
 * Rodada do resumo do dia (idempotente; cada pessoa recebe no máximo um e-mail e um WhatsApp de resumo por dia).
 * quando: Date (testes); padrão agora. Devolve o que fez.
 */
function SGO_resumoDiaRodada_(quando) {
  quando = quando || new Date();
  var r = {};
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando) : { dentro: true, hora: Utilities.formatDate(quando, MTZ_FUSO, 'HH:mm'), dia: Mtz_hoje_(quando) };
  if (!ex.dentro) return { fora: ex.motivo };
  [MTZ_ABAS.FILA, MTZ_ABAS.RESUMOS].forEach(Mtz_garantirAba_);
  try { r.filaHora = Mtz_enviarFilaHora_(ex); } catch (e) { r.filaHora = { erro: String((e && e.message) || e) }; }
  var cfg = Mtz_cfg_();
  var primeiraHora = cfg.horaEmail < cfg.horaWhats ? cfg.horaEmail : cfg.horaWhats;
  if (ex.hora < primeiraHora) { r.fora = 'antes da hora do resumo (' + primeiraHora + ')'; return r; }
  // 26/10/2026: vencimentos do dia (VC01, SGO_Avisos_Setores.js) entram na fila antes de montar o resumo
  if (typeof Setores_vencimentosDia_ === 'function') r.vencimentos = Setores_vencimentosDia_(quando);
  // duas rotinas ao mesmo tempo (gestão a cada 15 min e atividades de hora em hora) não fazem o resumo duas vezes
  var cacheTrava = null;
  try { cacheTrava = CacheService.getScriptCache(); if (cacheTrava.get('MTZ_RODADA_EM_CURSO')) { r.fora = 'outra rodada do resumo em andamento'; return r; } cacheTrava.put('MTZ_RODADA_EM_CURSO', '1', 300); } catch (e) { cacheTrava = null; }
  var dia = ex.dia;
  var feitos = { email: {}, whatsapp: {} };
  Mtz_ler_(MTZ_ABAS.RESUMOS).forEach(function (l) {
    if (Mtz_s_(l.DIA).slice(0, 10) !== dia) return;
    var sit = Mtz_up_(l.SITUACAO), canal = Mtz_s_(l.CANAL).toLowerCase();
    if (sit === 'ERRO' || sit === 'ADIADO') return;
    if (feitos[canal]) feitos[canal][Mtz_s_(l.USUARIO_ID)] = sit;
  });
  var us = Mtz_usuarios_(), prefs = Mtz_prefsTodas_();
  var pessoas = Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) {
    return u.ativo && !u.sistema && u.perfil !== 'CLIENTE' && u.perfil !== 'AUVO_SYNC';
  });
  var horaWhats = cfg.horaWhats;
  var querEmail = pessoas.filter(function (u) { return !feitos.email[u.id] && ex.hora >= (Mtz_prefsDe_(u.id, prefs).horaEmail || cfg.horaEmail); });
  var querWhats = cfg.whatsResumo && ex.hora >= horaWhats ? pessoas.filter(function (u) { return !feitos.whatsapp[u.id]; }) : [];
  if (!querEmail.length && !querWhats.length) { r.email = { avaliados: 0 }; r.whatsapp = { avaliados: 0 }; Mtz_soltarRodada_(cacheTrava); return r; }
  // fontes lidas uma vez (memória da central de pendências)
  var executar = function () {
    var filaPorPessoa = {}, atvPorPessoa = {};
    var limite = Mtz_agora_(new Date(quando.getTime() - MTZ_FILA_VALIDADE_DIAS * 864e5));
    var velhos = [];
    Mtz_ler_(MTZ_ABAS.FILA).forEach(function (v) {
      if (Mtz_up_(v.SITUACAO) !== 'PENDENTE') return;
      if (Mtz_iso_(v.QUANDO) && Mtz_iso_(v.QUANDO) < limite) { velhos.push(v); return; }
      (filaPorPessoa[Mtz_s_(v.USUARIO_ID)] = filaPorPessoa[Mtz_s_(v.USUARIO_ID)] || []).push(v);
    });
    var abaAtv = typeof Atividades_abas_ === 'function' ? Atividades_abas_().AVISOS : '';
    var atvVelhos = [];
    if (abaAtv) Mtz_ler_(abaAtv).forEach(function (v) {
      if (Mtz_s_(v.EMAIL_SITUACAO) !== 'PENDENTE') return;
      var d = Mtz_iso_(v.DATA);
      if (d && d < limite) { atvVelhos.push(v); return; }
      (atvPorPessoa[Mtz_s_(v.DESTINATARIO_ID)] = atvPorPessoa[Mtz_s_(v.DESTINATARIO_ID)] || []).push(v);
    });
    var cx = null, rel = null;
    try { if (typeof Ges_caixa_ === 'function' && pessoas.some(function (u) { return u.gestao || u.rotina; })) cx = Ges_caixa_(); } catch (e) { console.error('Resumo do dia, Caixa de decisões: ' + ((e && e.message) || e)); }
    try {
      if (cx && typeof Ges_relatoriosDoDia_ === 'function' && typeof Ges_envios_ === 'function') rel = Ges_relatoriosDoDia_(Ges_envios_(), dia, typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null);
    } catch (e) { rel = null; }
    var fontes = {
      pend: function (ctx) { return typeof Pend_calcular_ === 'function' ? Pend_calcular_(ctx).itens : []; },
      filaPorPessoa: filaPorPessoa, atvPorPessoa: atvPorPessoa, cx: cx, rel: rel, ex: ex,
      batePapo: Mtz_naoLidasBatePapo_
    };
    var agoraTxt = Mtz_agora_(quando);
    // itens velhos: não saem mais (ficam registrados)
    velhos.forEach(function (v) { SGO_DATA.update(MTZ_ABAS.FILA, v.ID, { SITUACAO: 'PULADO', ENVIADO_EM: agoraTxt, MOTIVO: 'guardado há mais de ' + MTZ_FILA_VALIDADE_DIAS + ' dias; não foi mais enviado' }); });
    atvVelhos.forEach(function (v) { SGO_DATA.update(abaAtv, v.ID, { EMAIL_SITUACAO: 'PULADO', EMAIL_EM: agoraTxt, EMAIL_MOTIVO: 'aviso guardado há mais de ' + MTZ_FILA_VALIDADE_DIAS + ' dias; não foi mais enviado' }); });
    var regs = [], resE = { avaliados: 0, enviados: 0 }, resW = { avaliados: 0, enviados: 0 };
    var montados = {};
    var montar = function (u) {
      if (!montados[u.id]) { fontes.prefs = Mtz_prefsDe_(u.id, prefs); montados[u.id] = Mtz_montarResumo_(u, fontes); }
      return montados[u.id];
    };
    // E-MAIL
    querEmail.forEach(function (u) {
      var m = montar(u);
      resE.avaliados++;
      var reg = { USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: dia, CANAL: 'email', ITENS: 0, CONTAGENS: JSON.stringify(m.contagens), AVALIADO_EM: agoraTxt };
      if (m.gestao && m.gestao.esperar) return;   // Diretoria: espera os relatórios do dia (até 10:30)
      if (m.vazio) { reg.SITUACAO = 'SEM_NOVIDADE'; reg.MOTIVO = 'nada para avisar hoje'; regs.push(reg); return; }
      var rr = { ok: 0 };
      try {
        rr = SGO_notificar_({ usuarios: [u.id], canais: ['email'], categoria: 'RESUMO_DIA', origem: 'RESUMO_DIA', evento: 'S10', refId: 'RESUMO-EMAIL-' + dia + '-' + u.id, titulo: m.titulo, texto: m.texto }) || { ok: 0 };
      } catch (e) { rr = { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
      reg.SITUACAO = rr.ok ? 'ENVIADO' : (rr.pulado ? 'PULADO' : 'ERRO');
      reg.MOTIVO = Mtz_texto_(rr.ok ? 'entregue ao serviço de e-mail' : rr.motivo, 480);
      reg.ITENS = m.fila.length + m.atv.length;
      regs.push(reg);
      if (reg.SITUACAO === 'ERRO') return;   // tenta de novo na próxima rodada
      if (rr.ok) resE.enviados++;
      var sitFila = rr.ok ? 'ENVIADO' : 'PULADO', mot = rr.ok ? 'no e-mail de resumo do dia ' + Mtz_br_(dia).slice(0, 10) : Mtz_texto_(rr.motivo, 280);
      m.fila.forEach(function (id) { SGO_DATA.update(MTZ_ABAS.FILA, id, { SITUACAO: sitFila, ENVIADO_EM: agoraTxt, MOTIVO: mot }); });
      m.atv.forEach(function (id) { SGO_DATA.update(abaAtv, id, { EMAIL_SITUACAO: sitFila, EMAIL_EM: agoraTxt, EMAIL_MOTIVO: mot }); });
      // Caixa de decisões: o envio continua contando para a escada e para a avaliação do gestor (GES_ENVIOS)
      if ((u.gestao || u.rotina) && typeof Ges_registrarEnvio_ === 'function' && (m.gestao.qtd || m.gestao.diretoria)) {
        Ges_registrarEnvio_({ tipo: u.diretoria ? 'EMAIL_DIRETORIA' : 'EMAIL_GESTOR', uid: u.id, nome: u.nome, dia: dia, qtd: m.gestao.qtd, itens: (m.gestao.ids || []).join(','),
          situacao: rr.ok ? 'OK' : 'PULADO', motivo: rr.ok ? 'no e-mail de resumo do dia (matriz de avisos)' : rr.motivo });
      }
    });
    // WHATSAPP (09:30, só CLT, só quem não abriu o sistema, só com item para hoje, atrasado ou decisão parada)
    if (querWhats.length) {
      var acessos = Mtz_acessos_(dia);
      var cfgV = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
      var lib = (cfgV.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
      var vinculos = {};
      Mtz_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (x) { vinculos[Mtz_s_(x.ID)] = String(x.VINCULO_TRABALHO || '').replace(/\s+/g, '').toUpperCase(); });
      querWhats.forEach(function (u) {
        var reg = { USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: dia, CANAL: 'whatsapp', ITENS: 0, CONTAGENS: '', AVALIADO_EM: agoraTxt };
        var v = vinculos[u.id] || '';
        if (lib.indexOf(v || 'VAZIO') < 0) { reg.SITUACAO = 'SEM_WHATSAPP'; reg.MOTIVO = v === 'PJ' ? 'PJ: o resumo vai só por e-mail' : v === 'DIRETORIA' ? 'Diretoria: o resumo vai só por e-mail (a gestão libera a Diretoria em Avisos e horários)' : 'vínculo ' + (v || 'não informado') + ': o resumo vai só por e-mail'; regs.push(reg); return; }
        if (!Mtz_prefsDe_(u.id, prefs).whatsResumo) { reg.SITUACAO = 'DESLIGADO_PELA_PESSOA'; reg.MOTIVO = 'a pessoa desligou o WhatsApp de resumo em Meus avisos'; regs.push(reg); return; }
        if (Mtz_abriuHoje_(u, dia, acessos)) { reg.SITUACAO = 'ABRIU_O_SISTEMA'; reg.MOTIVO = 'a pessoa já abriu o sistema hoje'; regs.push(reg); return; }
        var m = montar(u);
        resW.avaliados++;
        reg.CONTAGENS = JSON.stringify(m.contagens);
        var c = m.contagens;
        var gatilho = c.atividadesAtrasadas + c.atividadesHoje + c.atividadesNovas + c.decisoesParadas + c.avisosVencidos;
        if (!gatilho) { reg.SITUACAO = 'SEM_NOVIDADE'; reg.MOTIVO = 'nada para hoje, atrasado ou decisão parada'; regs.push(reg); return; }
        if (Mtz_pertoDoPonto_(u.id, quando)) return;   // perto de um lembrete do ponto: tenta na próxima rodada
        var frase = Mtz_fraseWhats_(c);
        var texto = 'Bom dia, ' + (typeof Notificar_primeiroNome_ === 'function' ? Notificar_primeiroNome_(u.nome) : u.nome) + '. Resumo do dia no SGO+: ' + frase + '. Abra o SGO+ para ver e resolver.';
        var rr = { ok: 0 };
        try {
          rr = SGO_notificar_({ usuarios: [u.id], canais: ['whatsapp'], categoria: 'RESUMO_DIA', origem: 'RESUMO_DIA', evento: 'S11', refId: 'RESUMO-WA-' + dia + '-' + u.id,
            titulo: 'Resumo do dia no SGO+', texto: texto, modelo: { nome: 'sgo_aviso_geral', parametros: ['Resumo do dia no SGO+', texto, '@LINK'] } }) || { ok: 0 };
        } catch (e) { rr = { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
        reg.SITUACAO = rr.ok ? 'ENVIADO' : (rr.pulado && /piloto/i.test(String(rr.motivo || '')) ? 'RETIDO' : rr.pulado ? 'PULADO' : 'ERRO');
        reg.MOTIVO = Mtz_texto_(rr.ok ? 'aceito pelo provedor' : rr.motivo, 480);
        regs.push(reg);
        if (rr.ok) resW.enviados++;
        if (rr.ok && c.decisoesParadas && typeof Ges_registrarEnvio_ === 'function') {
          Ges_registrarEnvio_({ tipo: 'WHATS_GESTOR', uid: u.id, nome: u.nome, dia: dia, qtd: c.decisoesParadas, itens: (m.gestao.idsParadas || []).join(','), situacao: 'OK', motivo: 'no WhatsApp de resumo do dia (matriz de avisos)' });
        }
      });
    }
    Mtz_registroResumo_(regs);
    r.email = resE; r.whatsapp = resW;
  };
  try {
    if (typeof Pend_comMemoria_ === 'function') Pend_comMemoria_(executar); else executar();
  } catch (e) { r.erro = String((e && e.message) || e).slice(0, 300); console.error('Resumo do dia: ' + r.erro); }
  Mtz_soltarRodada_(cacheTrava);
  return r;
}

function Mtz_soltarRodada_(cache) { try { if (cache) cache.remove('MTZ_RODADA_EM_CURSO'); } catch (e) {} }

/** Prévia do resumo de hoje de uma pessoa (Meus avisos): o texto do e-mail, sem enviar nada. */
function Mtz_previa_(uid) {
  var us = Mtz_usuarios_(), u = us[uid];
  if (!u) return null;
  var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true, hora: '09:00', dia: Mtz_hoje_() };
  var montar = function () {
    var fila = Mtz_ler_(MTZ_ABAS.FILA).filter(function (v) { return Mtz_up_(v.SITUACAO) === 'PENDENTE' && Mtz_s_(v.USUARIO_ID) === uid; });
    var abaAtv = typeof Atividades_abas_ === 'function' ? Atividades_abas_().AVISOS : '';
    var atv = abaAtv ? Mtz_ler_(abaAtv).filter(function (v) { return Mtz_s_(v.EMAIL_SITUACAO) === 'PENDENTE' && Mtz_s_(v.DESTINATARIO_ID) === uid; }) : [];
    var cx = null;
    try { if ((u.gestao || u.rotina) && typeof Ges_caixa_ === 'function') cx = Ges_caixa_(); } catch (e) { cx = null; }
    var f = { pend: function (ctx) { return typeof Pend_calcular_ === 'function' ? Pend_calcular_(ctx).itens : []; }, filaPorPessoa: {}, atvPorPessoa: {}, cx: cx, rel: null, ex: ex, batePapo: Mtz_naoLidasBatePapo_, prefs: Mtz_prefsDe_(uid) };
    f.filaPorPessoa[uid] = fila; f.atvPorPessoa[uid] = atv;
    return Mtz_montarResumo_(u, f);
  };
  return typeof Pend_comMemoria_ === 'function' ? Pend_comMemoria_(montar) : montar();
}

// ------------------------------------------------------------
// MEDIÇÃO (seção 7): avisos por pessoa por dia, antes e depois
// ------------------------------------------------------------
/**
 * Contagem por pessoa e dia útil a partir de NTF_ENVIOS: e-mails e WhatsApp enviados, retidos pelo piloto, guardados para o
 * resumo, WhatsApp fora do expediente e WhatsApp para PJ ou vínculo vazio. p: { antesIni, antesFim, depoisIni, depoisFim } (aaaa-mm-dd).
 */
function Mtz_medicao_(p) {
  p = p || {};
  var hoje = Mtz_hoje_();
  var per = {
    antes: { ini: Mtz_s_(p.antesIni) || '2026-10-16', fim: Mtz_s_(p.antesFim) || '2026-10-20' },
    depois: { ini: Mtz_s_(p.depoisIni) || '2026-10-22', fim: Mtz_s_(p.depoisFim) || hoje }
  };
  var vinculos = {}, nomes = {};
  Mtz_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { vinculos[Mtz_s_(u.ID)] = String(u.VINCULO_TRABALHO || '').replace(/\s+/g, '').toUpperCase(); nomes[Mtz_s_(u.ID)] = Mtz_s_(u.NOME) || Mtz_s_(u.USUARIO); });
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  var util = function (dia) {
    if (typeof SGO_expedienteMotivoDia_ !== 'function') { var w = new Date(dia + 'T12:00:00Z').getUTCDay(); return w !== 0 && w !== 6; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia); return !!m && !SGO_expedienteMotivoDia_(dia, new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(), cfgExp);
  };
  var vazio = function () { return { email: 0, whatsapp: 0, retidos: 0, noResumo: 0, whatsForaExpediente: 0, whatsPjOuVazio: 0, pessoasDias: {}, dias: {} }; };
  var res = { antes: vazio(), depois: vazio() };
  Mtz_ler_(typeof Notificar_aba_ === 'function' ? Notificar_aba_() : 'NTF_ENVIOS').forEach(function (r) {
    var q = Mtz_iso_(r.QUANDO), dia = q.slice(0, 10);
    var k = dia >= per.antes.ini && dia <= per.antes.fim ? 'antes' : (dia >= per.depois.ini && dia <= per.depois.fim ? 'depois' : '');
    if (!k) return;
    var uid = Mtz_s_(r.USUARIO_ID);
    if (!uid || uid.indexOf('EXT:') === 0) return;
    var canal = Mtz_s_(r.CANAL).toLowerCase(), sit = Mtz_up_(r.SITUACAO), x = res[k];
    if (sit === 'RETIDO') x.retidos++;
    if (sit === 'NO_RESUMO') x.noResumo++;
    if (sit !== 'OK') return;
    if (canal === 'email') x.email++; else if (canal === 'whatsapp') x.whatsapp++; else return;
    x.dias[dia] = true;
    var pd = uid + '|' + dia;
    var e = x.pessoasDias[pd] = x.pessoasDias[pd] || { uid: uid, dia: dia, email: 0, whatsapp: 0 };
    e[canal]++;
    if (canal === 'whatsapp') {
      var hora = q.slice(11, 16), exp = cfgExp || { ini: '08:00', fim: '17:30' };
      if (!util(dia) || hora < exp.ini || hora >= exp.fim) x.whatsForaExpediente++;
      var v = vinculos[uid] || '';
      if (v !== 'CLT' && Mtz_up_(r.ORIGEM).indexOf('PONTO') !== 0) x.whatsPjOuVazio++;
    }
  });
  // relatório do piloto (servidor próprio): WhatsApp do COMMAND e bloqueios do servidor, por telefone -> pessoa do cadastro
  try {
    if (typeof SGO_WHATSAPP !== 'undefined' && SGO_WHATSAPP && typeof SGO_WHATSAPP.pilotoRegistros === 'function' && typeof SGO_waPilotoCanon_ === 'function') {
      var contatos = Notificar_contatos_(Object.keys(nomes)), porFone = {};
      Object.keys(contatos).forEach(function (id) { var k = SGO_waPilotoCanon_(contatos[id].telefone); if (k && !porFone[k]) porFone[k] = id; });
      ['antes', 'depois'].forEach(function (k) {
        var ini = new Date(per[k].ini + 'T00:00:00-03:00'), fim = new Date(new Date(per[k].fim + 'T00:00:00-03:00').getTime() + 864e5);
        (SGO_WHATSAPP.pilotoRegistros({ desde: ini.toISOString(), ate: fim.toISOString() }) || []).forEach(function (reg) {
          var x = res[k], s = Mtz_up_(reg.situacao);
          if (s === 'BLOQUEADO' || s === 'RETIDO') { x.retidos++; return; }
          if (String(reg.sistema) !== 'command' || (s !== 'OK' && s !== 'ENVIADO')) return;
          var uid = porFone[SGO_waPilotoCanon_(reg.destino)];
          if (!uid) return;
          var q = Mtz_iso_(reg.em), dia = q.slice(0, 10), pd = uid + '|' + dia;
          x.whatsapp++; x.comando = (x.comando || 0) + 1;
          var e = x.pessoasDias[pd] = x.pessoasDias[pd] || { uid: uid, dia: dia, email: 0, whatsapp: 0 };
          e.whatsapp++;
        });
      });
    }
  } catch (eP) { console.error('Medição, relatório do piloto: ' + ((eP && eP.message) || eP)); }
  var fechar = function (x) {
    var lista = Object.keys(x.pessoasDias).map(function (k) { return x.pessoasDias[k]; });
    var n = lista.length || 1;
    var maxE = 0, maxW = 0, acimaE = 0, acimaW = 0;
    lista.forEach(function (e) { if (e.email > maxE) maxE = e.email; if (e.whatsapp > maxW) maxW = e.whatsapp; if (e.email > 2) acimaE++; if (e.whatsapp > 1) acimaW++; });
    var porPessoa = {};
    lista.forEach(function (e) { var p = porPessoa[e.uid] = porPessoa[e.uid] || { nome: nomes[e.uid] || 'Pessoa removida', dias: 0, email: 0, whatsapp: 0 }; p.dias++; p.email += e.email; p.whatsapp += e.whatsapp; });
    return {
      email: x.email, whatsapp: x.whatsapp, whatsappCommand: x.comando || 0, retidos: x.retidos, noResumo: x.noResumo, whatsForaExpediente: x.whatsForaExpediente, whatsPjOuVazio: x.whatsPjOuVazio,
      pessoasDias: lista.length, mediaEmail: Math.round(x.email / n * 10) / 10, mediaWhatsapp: Math.round(x.whatsapp / n * 10) / 10,
      maxEmail: maxE, maxWhatsapp: maxW, pessoasDiasAcimaMetaEmail: acimaE, pessoasDiasAcimaMetaWhatsapp: acimaW,
      porPessoa: Object.keys(porPessoa).map(function (k) { var p = porPessoa[k]; return { nome: p.nome, dias: p.dias, mediaEmail: Math.round(p.email / p.dias * 10) / 10, mediaWhatsapp: Math.round(p.whatsapp / p.dias * 10) / 10 }; })
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); })
    };
  };
  return { periodos: per, antes: fechar(res.antes), depois: fechar(res.depois), metas: { emailPorPessoaDia: 2, whatsappPorPessoaDia: 1, whatsForaExpediente: 0, whatsPjOuVazio: 0 } };
}

// ------------------------------------------------------------
// API: Administração > Matriz de avisos (Administrador e Diretoria)
// ------------------------------------------------------------
function Mtz_sessao_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = Mtz_up_(s.perfil), dono = false;
  try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(s.usuario); } catch (e) { dono = false; }
  return { id: Mtz_s_(s.userId), login: Mtz_s_(s.usuario), nome: Mtz_s_(s.nome) || Mtz_s_(s.usuario), perfil: perfil, admin: perfil === 'ADMIN' || perfil === 'DIRETORIA' || dono, cliente: perfil === 'CLIENTE' };
}

function Mtz_regraTela_(r) {
  return { cod: r.cod, modulo: r.modulo, moduloNome: r.moduloNome, evento: r.evento, origem: r.origem, publico: r.publico, email: r.email, whatsapp: r.whatsapp, decisao: r.decisao,
    limite: r.limite || '', obs: r.obs || '', area: r.area || '', whatsHoraPermitido: !!r.whatsHoraPermitido, obrigatorio: !!r.obrigatorio, sensivel: !!r.sensivel, alterada: !!r.alterada,
    rotuloEmail: MTZ_ROTULO_EMAIL[r.email], rotuloWhats: MTZ_ROTULO_WHATS[r.whatsapp] };
}

function Mtz_gravarMudanca_(eu, cod, antes, depois, motivo) {
  Mtz_garantirAba_(MTZ_ABAS.REGRAS);
  SGO_DATA.insert(MTZ_ABAS.REGRAS, { CODIGO: cod, DEPOIS_JSON: JSON.stringify(depois), ANTES_JSON: JSON.stringify(antes), MOTIVO: Mtz_texto_(motivo, 500),
    ALTERADO_POR_ID: eu.id, ALTERADO_POR_NOME: eu.nome, ALTERADO_EM: Mtz_agora_() });
  Mtz_invalidar_();
  try { SGO_DATA.log('MATRIZ_AVISOS', eu.login, cod + ': ' + JSON.stringify(depois).slice(0, 400), 'AVISOS'); } catch (e) {}
}

function Mtz_trilha_(limite) {
  return Mtz_ler_(MTZ_ABAS.REGRAS).map(function (l) {
    return { codigo: Mtz_s_(l.CODIGO), em: Mtz_iso_(l.ALTERADO_EM), emBr: Mtz_br_(Mtz_iso_(l.ALTERADO_EM)), por: Mtz_s_(l.ALTERADO_POR_NOME), motivo: Mtz_s_(l.MOTIVO), antes: Mtz_json_(l.ANTES_JSON, {}), depois: Mtz_json_(l.DEPOIS_JSON, {}) };
  }).sort(function (a, b) { return a.em < b.em ? 1 : -1; }).slice(0, limite || 200);
}

/** Gestores por área e quem da gestão não tem área (para a tela avisar). */
function Mtz_situacaoAreas_() {
  var us = Mtz_usuarios_(), gcfg = typeof Ges_cfg_ === 'function' ? Ges_cfg_() : { gestoresPorArea: {} };
  var nomesAreas = typeof Areas_mapaNomes_ === 'function' ? Areas_mapaNomes_() : {};
  var areas = Object.keys(nomesAreas).length ? Object.keys(nomesAreas) : ['ADMINISTRATIVO', 'COMERCIAL', 'FINANCEIRO', 'RH', 'QUALIDADE', 'METROLOGIA', 'TECNICA', 'LOGISTICA'];
  var porArea = areas.filter(function (a) { return a !== 'DIRETORIA'; }).map(function (a) {
    var ids = ((gcfg.gestoresPorArea || {})[a] || []).filter(function (id) { return us[id] && us[id].ativo; });
    return { area: a, nome: nomesAreas[a] || a, gestores: ids.map(function (id) { return us[id].nome; }), reserva: !ids.length };
  });
  var semArea = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && !u.sistema && u.perfil === 'GESTOR' && !Mtz_areasDe_(id, us, gcfg).length; }).map(function (id) { return us[id].nome; });
  return { porArea: porArea, gestoresSemArea: semArea };
}

/**
 * google.script.run: SGO_AvisosMatriz_api(sessionId, acao, dados). acao:
 *  'carregar' | 'salvarRegra' { cod, email, whatsapp, decisao, area, motivo } | 'salvarCfg' { horaEmail, horaWhats, whatsResumo, centralPorArea, motivo }
 *  | 'restaurar' { cod, motivo } | 'trilha' | 'medicao' { antesIni, antesFim, depoisIni, depoisFim } | 'resumos' { dia }
 * Nunca lança: erro em { ok:false, message }.
 */
function SGO_AvisosMatriz_api(sessionId, acao, dados) {
  try {
    var eu = Mtz_sessao_(sessionId);
    if (!eu.admin) throw new Error('Não foi possível abrir a Matriz de avisos: esta tela é do Administrador e da Diretoria. O que você recebe por e-mail e WhatsApp está em Menu > Meus avisos.');
    var d = dados || {};
    if (acao === 'salvarRegra' || acao === 'restaurar') {
      var cod = Mtz_up_(d.cod), base = Mtz_padraoDe_(cod);
      if (!base) throw new Error('Não foi possível salvar: o evento ' + (cod || '(vazio)') + ' não está na matriz. Atualize a tela e escolha o evento de novo.');
      var motivo = Mtz_s_(d.motivo);
      if (motivo.length < 8) throw new Error('Não foi possível salvar: escreva o motivo da mudança (pelo menos 8 caracteres). Ele fica na trilha de mudanças, com o seu nome e a data.');
      var atual = Mtz_regras_()[cod];
      var antes = { email: atual.email, whatsapp: atual.whatsapp, decisao: atual.decisao, area: atual.area };
      var depois;
      if (acao === 'restaurar') depois = { email: base.email, whatsapp: base.whatsapp, decisao: base.decisao || 'AVISA', area: Mtz_up_(base.area), restaurada: true };
      else {
        depois = { email: Mtz_up_(d.email), whatsapp: Mtz_up_(d.whatsapp), decisao: Mtz_up_(d.decisao) || 'AVISA', area: Mtz_up_(d.area) };
        if (MTZ_CANAIS_EMAIL.indexOf(depois.email) < 0 || MTZ_CANAIS_WHATS.indexOf(depois.whatsapp) < 0 || MTZ_DECISOES.indexOf(depois.decisao) < 0) throw new Error('Não foi possível salvar: escolha o canal do e-mail, o do WhatsApp e a decisão nas listas da tela e toque em Salvar de novo.');
        // 26/10/2026: "na hora" liberado para qualquer evento (teto diário em Mtz_cfg_().whatsTetoDia)
        if (base.obrigatorio && (depois.decisao === 'HISTORICO' || (base.email !== 'NAO' && depois.email === 'NAO') || (base.whatsapp === 'HORA' && depois.whatsapp !== 'HORA'))) {
          throw new Error('Não foi possível salvar: ' + cod + ' (' + base.evento + ') é obrigatório pela matriz aprovada pelo dono e não pode deixar de avisar. Você pode trocar entre "na hora" e "no resumo", mas não desligar. Se a regra precisa mudar, leve ao dono.');
        }
        if (depois.area && typeof Areas_mapaNomes_ === 'function' && !Areas_mapaNomes_()[depois.area]) throw new Error('Não foi possível salvar: a área ' + depois.area + ' não existe no cadastro de áreas (Administração > Usuários > Áreas).');
      }
      Mtz_trava_(function () { Mtz_gravarMudanca_(eu, cod, antes, depois, motivo); });
      return { ok: true, regra: Mtz_regraTela_(Mtz_regras_()[cod]), message: (acao === 'restaurar' ? 'Regra ' + cod + ' voltou ao padrão aprovado.' : 'Regra ' + cod + ' salva.') + ' A mudança vale a partir do próximo aviso e está na trilha.' };
    }
    if (acao === 'salvarCfg') {
      var mot = Mtz_s_(d.motivo);
      if (mot.length < 8) throw new Error('Não foi possível salvar: escreva o motivo da mudança (pelo menos 8 caracteres).');
      var hv = function (h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(Mtz_s_(h)); };
      if (!hv(d.horaEmail) || !hv(d.horaWhats)) throw new Error('Não foi possível salvar: use HH:MM nas duas horas (por exemplo 08:00 e 09:30).');
      var exp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30' };
      if (d.horaEmail < exp.ini || d.horaWhats < exp.ini || d.horaEmail >= exp.fim || d.horaWhats >= exp.fim) throw new Error('Não foi possível salvar: as horas do resumo precisam ficar dentro do expediente (' + exp.ini + ' a ' + exp.fim + '). O expediente fica em Atividades da equipe > Avisos e horários.');
      var antesCfg = Mtz_cfg_();
      var novo = { horaEmail: d.horaEmail, horaWhats: d.horaWhats, whatsResumo: d.whatsResumo !== false, centralPorArea: d.centralPorArea !== false, whatsTetoDia: antesCfg.whatsTetoDia };
      if (d.whatsTetoDia !== undefined && d.whatsTetoDia !== '') {
        var tt = Number(d.whatsTetoDia);
        if (!(tt >= 1 && tt <= 10 && Math.round(tt) === tt)) throw new Error('Não foi possível salvar: o teto de WhatsApp na hora por pessoa por dia precisa ser um número inteiro de 1 a 10.');
        novo.whatsTetoDia = tt;
      }
      Mtz_trava_(function () { Mtz_gravarMudanca_(eu, 'CONFIG', antesCfg, novo, mot); });
      return { ok: true, cfg: Mtz_cfg_(), message: 'Horários do resumo salvos. A mudança está na trilha.' };
    }
    if (acao === 'trilha') return { ok: true, trilha: Mtz_trilha_(300) };
    if (acao === 'medicao') return { ok: true, medicao: Mtz_medicao_(d) };
    if (acao === 'resumos') {
      var dia = Mtz_s_(d.dia) || Mtz_hoje_();
      var lin = Mtz_ler_(MTZ_ABAS.RESUMOS).filter(function (l) { return Mtz_s_(l.DIA).slice(0, 10) === dia; }).map(function (l) {
        return { nome: Mtz_s_(l.USUARIO_NOME), canal: Mtz_s_(l.CANAL), situacao: Mtz_s_(l.SITUACAO), motivo: Mtz_s_(l.MOTIVO), itens: Number(l.ITENS) || 0, hora: Mtz_iso_(l.AVALIADO_EM).slice(11, 16) };
      });
      return { ok: true, dia: dia, resumos: lin };
    }
    // carregar
    var regras = Mtz_regras_();
    var prefs = Mtz_prefsTodas_(), us = Mtz_usuarios_();
    var prefsEquipe = Object.keys(prefs).filter(function (id) { return us[id]; }).map(function (id) {
      var p = prefs[id];
      return { nome: us[id].nome, whatsResumo: p.whatsResumo, horaEmail: p.horaEmail, emailInformativos: p.emailInformativos, silenciar: p.silenciar.map(function (m) { return MTZ_MODULOS_SILENCIAVEIS[m]; }), alteradoEm: Mtz_br_(p.alteradoEm) };
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    return {
      ok: true, cfg: Mtz_cfg_(), regras: MTZ_PADRAO.map(function (p) { return Mtz_regraTela_(regras[p.cod]); }),
      modulos: MTZ_MODULOS_NOMES, rotulosEmail: MTZ_ROTULO_EMAIL, rotulosWhats: MTZ_ROTULO_WHATS,
      areas: Mtz_situacaoAreas_(), prefsEquipe: prefsEquipe, trilha: Mtz_trilha_(30),
      expediente: typeof SGO_expediente_ === 'function' ? (function (e) { return { ini: e.ini, fim: e.fim }; })(SGO_expediente_()) : { ini: '08:00', fim: '17:30' }
    };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

// ------------------------------------------------------------
// API: Menu > Meus avisos (cada pessoa, só as suas preferências)
// ------------------------------------------------------------
/**
 * google.script.run: SGO_MeusAvisos_api(sessionId, acao, dados). acao: 'carregar' | 'salvar' { whatsResumo, horaEmail, emailInformativos, silenciar } | 'previa'.
 * Só a própria pessoa altera as suas preferências. Nunca lança.
 */
function SGO_MeusAvisos_api(sessionId, acao, dados) {
  try {
    var eu = Mtz_sessao_(sessionId);
    if (eu.cliente) throw new Error('Meus avisos é da equipe da Metrolabs. Os avisos do seu acesso de cliente chegam pelo e-mail cadastrado.');
    var d = dados || {};
    if (acao === 'salvar') {
      var novo = Mtz_prefsNorm_({ whatsResumo: d.whatsResumo !== false, horaEmail: d.horaEmail, emailInformativos: d.emailInformativos === true, silenciar: d.silenciar || [] });
      delete novo.alteradoEm;
      var horaGeral = Mtz_cfg_().horaEmail;
      if (d.horaEmail && d.horaEmail !== horaGeral && d.horaEmail !== MTZ_CFG_PADRAO.horaEmailAlternativa) throw new Error('Não foi possível salvar: a hora do e-mail de resumo é ' + horaGeral + ' ou ' + MTZ_CFG_PADRAO.horaEmailAlternativa + '. Escolha uma das duas e toque em Salvar.');
      Mtz_trava_(function () {
        Mtz_garantirAba_(MTZ_ABAS.PREFS);
        SGO_DATA.insert(MTZ_ABAS.PREFS, { USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, PREFS_JSON: JSON.stringify(novo), ALTERADO_EM: Mtz_agora_() });
      });
      try { SGO_DATA.log('MEUS_AVISOS', eu.login, 'Preferências de avisos: ' + JSON.stringify(novo).slice(0, 300), 'AVISOS'); } catch (e) {}
    }
    if (acao === 'previa') {
      var pv = Mtz_previa_(eu.id);
      return { ok: true, previa: pv ? { titulo: pv.titulo, texto: pv.texto, vazio: pv.vazio, whats: Mtz_fraseWhats_(pv.contagens) } : null };
    }
    var p = Mtz_prefsDe_(eu.id);
    var u = null;
    try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, eu.id); } catch (e) { u = null; }
    var vinculo = String((u && u.VINCULO_TRABALHO) || '').replace(/\s+/g, '').toUpperCase();
    // 22/10/2026: liberado = vínculo na lista de Avisos e horários (padrão só CLT; a gestão pode liberar PJ ou Diretoria).
    var cfgVinc = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
    var libVinc = (cfgVinc.vinculosWhatsapp || ['CLT']).map(function (x) { return String(x).toUpperCase(); });
    var cfg = Mtz_cfg_();
    var regras = Mtz_regras_();
    var excecoes = ['S35', 'S36', 'S41', 'S44'].map(function (c) { return regras[c]; }).filter(function (r) { return r && r.whatsapp === 'HORA'; }).map(function (r) { return r.evento; });
    return {
      ok: true, prefs: { whatsResumo: p.whatsResumo, horaEmail: p.horaEmail, emailInformativos: p.emailInformativos, silenciar: p.silenciar },
      alteradoEm: Mtz_br_(p.alteradoEm || ''), vinculo: vinculo, vinculoRotulo: typeof SGO_rotuloVinculo_ === 'function' ? SGO_rotuloVinculo_(vinculo) : vinculo, whatsLiberado: libVinc.indexOf(vinculo || 'VAZIO') >= 0, temEmail: !!(u && String(u.EMAIL || '').indexOf('@') > 0), temCelular: !!(u && String(u.CELULAR || '').replace(/\D/g, '')),
      horas: { email: cfg.horaEmail, emailAlternativa: MTZ_CFG_PADRAO.horaEmailAlternativa, whats: cfg.horaWhats }, whatsResumoLigado: cfg.whatsResumo,
      silenciaveis: MTZ_MODULOS_SILENCIAVEIS, excecoesWhats: excecoes,
      message: acao === 'salvar' ? 'Preferências salvas. Valem a partir do próximo resumo.' : ''
    };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
