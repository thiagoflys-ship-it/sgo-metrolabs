/****************************************************
 * CENTRAL DE PENDÊNCIAS — fonte única dos alertas do SGO+ (2026-10-17)
 *
 * Antes, cada lugar calculava os próprios alertas: o Início, o painel de
 * alertas do dashboard, o balão de padrões, a janela ao entrar, o Painel de
 * qualidade e a ponte com o COMMAND tinham regras e janelas diferentes
 * (um contava "vence hoje" como vencido e outro não; o Painel de qualidade
 * dizia OK com manutenção de veículo vencida; a mesma O.S. contava três vezes
 * no Painel de qualidade; certificados antigos já renovados continuavam
 * "vencidos"). Agora todos leem daqui:
 *
 *   SGO_Pendencias_listar(sessionId, opcoes)   -> uso interno do servidor
 *   SGO_Pendencias_apiListar(sessionId, payload) -> google.script.run (celular e telas)
 *
 * Consumidores: Inicio_apiPendencias (SGO_Inicio.js), alertasObterDashboard e
 * balão de padrões (SGO_Alertas.js / SGO_AlertasPadroes.js), avisos ao entrar
 * (Qualidade_apiObterAvisosLogin), Painel de qualidade (Qualidade_apiObterPainel)
 * e a ponte alertas.painel / alertas.padroes do COMMAND (SGO_PonteCommand.js).
 *
 * REGRAS (iguais em todos os lugares):
 *  - Prazo: vencido ou vence hoje = CRÍTICO; vence em até 30 dias = ATENÇÃO
 *    (padrões: a antecedência configurada pelo administrador nos alertas
 *    globais de calibração, padrão 30). "Vence hoje" é crítico porque a
 *    emissão de certificado já bloqueia o padrão nesse dia e o Inventário já
 *    mostrava "Vence hoje" como vencido.
 *  - Documento, certificado ou laudo renovado substitui o anterior: vale o
 *    vencimento mais recente de cada equipamento (mesma regra do Inventário e
 *    dos documentos da Frota).
 *  - Falha de registro (O.S. concluída sem relato/foto, retirada de veículo
 *    sem checklist) conta por 30 dias; depois sai da lista.
 *  - Uma pendência = um id estável. A mesma coisa nunca entra duas vezes
 *    (ex.: o laudo NR-13 e a cópia dele em Documentos viram um item só; O.S.
 *    sem vínculo não se repete dentro de "registro incompleto").
 *
 * QUEM VÊ O QUÊ:
 *  - CLIENTE: só vencimentos de documentos, calibrações e NR-13 do próprio cliente.
 *  - ADMIN, GESTOR, DIRETORIA: tudo da equipe + o que é pessoal dele.
 *    21/10/2026 (matriz de avisos, SGO_Avisos_Matriz.js › SGO_avisoCentralVe_): o gestor vê o da sua
 *    área (Administração > Usuários e Caixa de decisões > Regras e responsáveis) e o que é dele; a
 *    Diretoria vê tudo; o Administrador sem área vê as falhas técnicas e o que é dele. Gestor sem área
 *    definida continua vendo tudo. Desliga em Administração > Matriz de avisos (filtro por área).
 *  - METROLOGIA: padrões, vencimentos dos clientes + o que é dele.
 *  - TECNICO e demais: padrões de referência (bloqueiam o trabalho de todos) +
 *    o que é dele (atividades, avisos, CNH, O.S. do Auvo, cobranças).
 *
 * Desempenho: cada aba é lida uma vez por cálculo (memória da chamada) e o
 * resultado por pessoa fica 60 segundos no cache. Quem grava algo que muda
 * pendência chama SGO_Pendencias_invalidar_().
 * Nada aqui grava na planilha. Nunca devolve Date cru.
 ****************************************************/

var PEND_FUSO = 'America/Sao_Paulo';
var PEND_DIAS_ATENCAO = 30;
var PEND_DIAS_REGISTRO = 30;
var PEND_CACHE_SEG = 60;
var PEND_CACHE_PREFIXO = 'PEND_V1_';
var PEND_GRAV_ORDEM = { CRITICO: 0, ATENCAO: 1, INFO: 2 };

var PEND_MODULOS = {
  padroes: 'Padrões de referência',
  documentos: 'Documentos',
  certificados: 'Certificados de calibração',
  nr13: 'NR-13',
  frota: 'Frota',
  conduta: 'Programa de Conduta',
  qualidade: 'Qualidade',
  auvo: 'Integração Auvo',
  atividades: 'Atividades',
  avisos: 'Avisos',
  email: 'E-mail',
  comercial: 'Comercial',
  ponto: 'Assistente do ponto'
};

/**
 * Tipos de pendência: módulo, texto no singular/plural, rótulo da faixa, o que fazer
 * (resumido, para a lista agrupada), tela do módulo e origem no formato antigo
 * (alertasObterDashboard / COMMAND). vencimento=true entra no painel "Alertas de vencimento".
 */
var PEND_TIPOS = {
  padrao_vencido: { modulo: 'padroes', um: 'padrão de referência vencido', varios: 'padrões de referência vencidos', rotulo: 'Bloqueia emissão', fazer: 'recalibre ou troque o padrão antes de emitir certificado', tela: { tipo: 'atalho', alvo: 'padroes' }, origem: 'PADRAO', vencimento: true },
  padrao_vencendo: { modulo: 'padroes', um: 'padrão de referência a vencer', varios: 'padrões de referência a vencer', rotulo: 'A vencer', fazer: 'agende a calibração antes do vencimento', tela: { tipo: 'atalho', alvo: 'padroes' }, origem: 'PADRAO', vencimento: true },
  padrao_sem_validade: { modulo: 'padroes', um: 'padrão sem validade válida', varios: 'padrões sem validade válida', rotulo: 'Revisar', fazer: 'corrija a validade no cadastro', tela: { tipo: 'atalho', alvo: 'padroes' }, origem: 'PADRAO', vencimento: true },
  documento_vencido: { modulo: 'documentos', um: 'documento vencido', varios: 'documentos vencidos', rotulo: 'Vencido', fazer: 'cadastre a versão atualizada em Documentos', tela: { tipo: 'modulo', mod: 'documentos' }, origem: 'DOCUMENTO', vencimento: true },
  documento_vencendo: { modulo: 'documentos', um: 'documento a vencer', varios: 'documentos a vencer', rotulo: 'A vencer', fazer: 'providencie a renovação antes do vencimento', tela: { tipo: 'modulo', mod: 'documentos' }, origem: 'DOCUMENTO', vencimento: true },
  calibracao_vencida: { modulo: 'certificados', um: 'calibração de equipamento vencida', varios: 'calibrações de equipamentos vencidas', rotulo: 'Vencida', fazer: 'agende a recalibração com o cliente', tela: { tipo: 'modulo', mod: 'certificado_calibracao' }, origem: 'DOCUMENTO', vencimento: true },
  calibracao_vencendo: { modulo: 'certificados', um: 'calibração de equipamento a vencer', varios: 'calibrações de equipamentos a vencer', rotulo: 'A vencer', fazer: 'agende a recalibração antes do vencimento', tela: { tipo: 'modulo', mod: 'certificado_calibracao' }, origem: 'DOCUMENTO', vencimento: true },
  // 20/10/2026 (fluxo cliente → equipamento → qualificação): relatório de qualificação com requalificação a vencer (SGO_QualifEquipamento.js).
  requalificacao_vencida: { modulo: 'qualificacao', um: 'requalificação de equipamento vencida', varios: 'requalificações de equipamentos vencidas', rotulo: 'Vencida', fazer: 'agende a requalificação com o cliente', tela: { tipo: 'modulo', mod: 'equipamentos' }, origem: 'DOCUMENTO', vencimento: true },
  requalificacao_vencendo: { modulo: 'qualificacao', um: 'requalificação de equipamento a vencer', varios: 'requalificações de equipamentos a vencer', rotulo: 'A vencer', fazer: 'agende a requalificação antes do vencimento', tela: { tipo: 'modulo', mod: 'equipamentos' }, origem: 'DOCUMENTO', vencimento: true },
  nr13_vencida: { modulo: 'nr13', um: 'inspeção NR-13 vencida', varios: 'inspeções NR-13 vencidas', rotulo: 'Vencida', fazer: 'agende a nova inspeção com o cliente', tela: { tipo: 'modulo', mod: 'nr13' }, origem: 'DOCUMENTO', vencimento: true },
  nr13_vencendo: { modulo: 'nr13', um: 'inspeção NR-13 a vencer', varios: 'inspeções NR-13 a vencer', rotulo: 'A vencer', fazer: 'agende a inspeção antes do vencimento', tela: { tipo: 'modulo', mod: 'nr13' }, origem: 'DOCUMENTO', vencimento: true },
  cnh_vencida: { modulo: 'frota', um: 'CNH vencida', varios: 'CNHs vencidas', rotulo: 'Vencida', fazer: 'renove a CNH e atualize o cadastro do condutor', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  cnh_vencendo: { modulo: 'frota', um: 'CNH a vencer', varios: 'CNHs a vencer', rotulo: 'A vencer', fazer: 'renove antes do vencimento', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  veiculo_doc_vencido: { modulo: 'frota', um: 'documento de veículo vencido', varios: 'documentos de veículos vencidos', rotulo: 'Vencido', fazer: 'renove e cadastre o novo em Frota > Documentos e multas', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  veiculo_doc_vencendo: { modulo: 'frota', um: 'documento de veículo a vencer', varios: 'documentos de veículos a vencer', rotulo: 'A vencer', fazer: 'providencie a renovação', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  manutencao_vencida: { modulo: 'frota', um: 'manutenção de veículo vencida', varios: 'manutenções de veículos vencidas', rotulo: 'Vencida', fazer: 'faça a manutenção e lance em Frota > Manutenção e paradas', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  manutencao_vencendo: { modulo: 'frota', um: 'manutenção de veículo a vencer', varios: 'manutenções de veículos a vencer', rotulo: 'A vencer', fazer: 'agende a manutenção', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  multa_conferir: { modulo: 'frota', um: 'multa sem condutor definido', varios: 'multas sem condutor definido', rotulo: 'Revisar', fazer: 'indique o condutor em Frota > Documentos e multas', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  frota_viagem_aberta: { modulo: 'frota', um: 'possível devolução esquecida (retirada aberta há mais de 12 horas)', varios: 'possíveis devoluções esquecidas (retiradas abertas há mais de 12 horas)', rotulo: 'Revisar', fazer: 'se o veículo já voltou, o condutor registra a devolução na Frota; se não puder, a gestão registra no lugar dele com justificativa', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  // 17/10/2026 (travas da Frota): KM divergente com foto do painel e registro feito pela gestão em nome do condutor.
  frota_km_conferir: { modulo: 'frota', um: 'KM de veículo a conferir', varios: 'KMs de veículos a conferir', rotulo: 'Conferir', fazer: 'confira a foto do painel em Frota > Situação e retiradas > KM a conferir', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  // 17/10/2026 (rastreador): uso sem registro, partida não liberada, bloqueio pendente há 30 min e falha de conexão (SGO_Frota_Rastreador.js).
  frota_rastreador_uso: { modulo: 'frota', um: 'veículo usado sem registro (rastreador)', varios: 'veículos usados sem registro (rastreador)', rotulo: 'Uso sem registro', fazer: 'confirme quem está com o veículo e marque como conferido em Frota > Rastreador', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  frota_rastreador_liberar: { modulo: 'frota', um: 'partida não liberada pelo rastreador', varios: 'partidas não liberadas pelo rastreador', rotulo: 'Liberar partida', fazer: 'libere em Frota > Rastreador ou pelo aplicativo do rastreador', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  frota_rastreador_bloqueio: { modulo: 'frota', um: 'bloqueio da partida pendente há mais de 30 minutos', varios: 'bloqueios da partida pendentes há mais de 30 minutos', rotulo: 'Bloqueio pendente', fazer: 'veja a posição do veículo em Frota > Rastreador', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  frota_rastreador_conexao: { modulo: 'frota', um: 'falha de comunicação com o rastreador', varios: 'falhas de comunicação com o rastreador', rotulo: 'Sem conexão', fazer: 'confira a internet do servidor e a plataforma do rastreador', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  // 19/10/2026 (revisão da Frota): avaria na devolução sem caso aberto e multa com pagamento vencendo (SGO_Frota_Gestao.js).
  // 20/10/2026 (rastreamento): pedido de comprovante de abastecimento vencido sem resposta (SGO_Frota_Rastreamento.js).
  frota_comprovante: { modulo: 'frota', um: 'comprovante de abastecimento pedido e não enviado', varios: 'comprovantes de abastecimento pedidos e não enviados', rotulo: 'Comprovante', fazer: 'fale com o condutor ou cancele o pedido em Frota > Rastreamento > Combustível e KM', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  frota_avaria: { modulo: 'frota', um: 'avaria de veículo sem tratamento', varios: 'avarias de veículos sem tratamento', rotulo: 'Tratar', fazer: 'abra o caso em Frota > Gestão e melhoria > Kanban', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  multa_vencida: { modulo: 'frota', um: 'multa vencida sem pagamento', varios: 'multas vencidas sem pagamento', rotulo: 'Vencida', fazer: 'pague ou recorra e atualize em Frota > Documentos e multas', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  multa_vencendo: { modulo: 'frota', um: 'multa a vencer', varios: 'multas a vencer', rotulo: 'A vencer', fazer: 'pague ou recorra antes do vencimento', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA', vencimento: true },
  // 20/10/2026 (reservas de veículo, SGO_Frota_Reservas.js): devolução atrasada com reserva a seguir, reserva com problema na conferência,
  // lembrete da reserva próxima e avisos (liberada pela gestão, cancelada pela gestão, não utilizada).
  frota_reserva_atraso: { modulo: 'frota', um: 'devolução atrasada com reserva a seguir', varios: 'devoluções atrasadas com reserva a seguir', rotulo: 'Reserva em risco', fazer: 'devolva o veículo ou troque a reserva por um veículo livre em Frota > Reservas', tela: { tipo: 'frota_reservas' }, origem: 'FROTA' },
  frota_reserva_problema: { modulo: 'frota', um: 'reserva de veículo com problema', varios: 'reservas de veículo com problema', rotulo: 'Conferir reserva', fazer: 'troque o veículo da reserva em Frota > Reservas ou resolva o problema do veículo', tela: { tipo: 'frota_reservas' }, origem: 'FROTA' },
  frota_reserva_proxima: { modulo: 'frota', um: 'reserva de veículo próxima', varios: 'reservas de veículo próximas', rotulo: 'Reserva', fazer: 'retire o veículo no horário ou cancele a reserva se não for usar', tela: { tipo: 'frota_reservas' }, origem: 'FROTA' },
  frota_reserva_aviso: { modulo: 'frota', um: 'aviso sobre sua reserva de veículo', varios: 'avisos sobre suas reservas de veículo', rotulo: 'Informativo', fazer: 'confira em Frota > Reservas > Minhas reservas', tela: { tipo: 'frota_reservas' }, origem: 'FROTA' },
  frota_registro_gestao: { modulo: 'frota', um: 'registro da Frota feito pela gestão em seu nome', varios: 'registros da Frota feitos pela gestão em seu nome', rotulo: 'Informativo', fazer: 'confira os dados na Frota e fale com a gestão se algo estiver errado', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  atividade_atrasada: { modulo: 'atividades', um: 'atividade atrasada', varios: 'atividades atrasadas', rotulo: 'Atrasada', fazer: 'conclua ou justifique com a nova previsão', tela: { tipo: 'modulo', mod: 'minhas_atividades' }, origem: 'ATIVIDADES' },
  atividade_hoje: { modulo: 'atividades', um: 'atividade vence hoje', varios: 'atividades vencem hoje', rotulo: 'Vence hoje', fazer: 'conclua até o horário previsto', tela: { tipo: 'modulo', mod: 'minhas_atividades' }, origem: 'ATIVIDADES' },
  atividade_aviso: { modulo: 'atividades', um: 'aviso de atividade não lido', varios: 'avisos de atividades não lidos', rotulo: 'Novo', fazer: 'abra a atividade para ver o histórico', tela: { tipo: 'modulo', mod: 'minhas_atividades' }, origem: 'ATIVIDADES' },
  aviso_ciencia: { modulo: 'avisos', um: 'aviso aguardando sua ciência', varios: 'avisos aguardando sua ciência', rotulo: 'Ciência pendente', fazer: 'leia e clique em "Li e estou ciente"', tela: { tipo: 'modulo', mod: 'avisos' }, origem: 'AVISOS' },
  aviso_leitura_atrasada: { modulo: 'avisos', um: 'aviso com leitura atrasada', varios: 'avisos com leitura atrasada', rotulo: 'Revisar', fazer: 'veja quem não leu e reenvie ou arquive', tela: { tipo: 'modulo', mod: 'avisos' }, origem: 'AVISOS' },
  conduta_ciencia: { modulo: 'conduta', um: 'aviso do Programa de Conduta', varios: 'avisos do Programa de Conduta', rotulo: 'Ciência pendente', fazer: 'confirme a leitura para registrar sua ciência', tela: { tipo: 'conduta_ciencia' }, origem: 'CONDUTA' },
  // 19/10/2026: sugestões de ocorrência vindas da Frota, Auvo, Painel de qualidade, Atividades, Avisos e do ponto (COMMAND).
  conduta_sugestao: { modulo: 'conduta', um: 'sugestão de ocorrência para decidir', varios: 'sugestões de ocorrência para decidir', rotulo: 'Decidir', fazer: 'aceite ou descarte em Programa de conduta > Sugestões', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'CONDUTA' },
  conduta_fechamento: { modulo: 'conduta', um: 'mês do Programa de Conduta a fechar', varios: 'meses do Programa de Conduta a fechar', rotulo: 'Fechamento', fazer: 'feche o mês no Programa de Conduta', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'CONDUTA' },
  qualidade_cobranca: { modulo: 'qualidade', um: 'cobrança da gestão aguardando sua ciência', varios: 'cobranças da gestão aguardando sua ciência', rotulo: 'Ciência pendente', fazer: 'leia e clique em "Estou ciente"', tela: { tipo: 'qualidade_ciencia' }, origem: 'QUALIDADE' },
  qualidade_os: { modulo: 'qualidade', um: 'O.S. concluída com registro incompleto', varios: 'O.S. concluídas com registro incompleto', rotulo: 'Revisar', fazer: 'complete o registro no Auvo', tela: { tipo: 'modulo', mod: 'qualidade' }, origem: 'QUALIDADE' },
  qualidade_mov: { modulo: 'qualidade', um: 'retirada de veículo com registro incompleto', varios: 'retiradas de veículos com registro incompleto', rotulo: 'Revisar', fazer: 'confira a movimentação na Frota', tela: { tipo: 'modulo', mod: 'qualidade' }, origem: 'QUALIDADE' },
  auvo_os_aberta: { modulo: 'auvo', um: 'O.S. aberta no Auvo', varios: 'O.S. abertas no Auvo', rotulo: 'Revisar', fazer: 'finalize ou reagende no Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },
  auvo_sem_vinculo: { modulo: 'auvo', um: 'O.S. do Auvo sem vínculo de cadastro', varios: 'O.S. do Auvo sem vínculo de cadastro', rotulo: 'Revisar', fazer: 'vincule cliente e técnico em Integração Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },
  // 21/10/2026: e-mail integrado (SGO_Email.js). Os dois primeiros são só da própria pessoa; o terceiro é da gestão (sem assunto nem texto).
  email_cliente_nao_lido: { modulo: 'email', um: 'e-mail de cliente não lido', varios: 'e-mails de cliente não lidos', rotulo: 'Ler', fazer: 'leia a mensagem do cliente em E-mail', tela: { tipo: 'modulo', mod: 'email' }, origem: 'EMAIL' },
  email_cliente_sem_resposta: { modulo: 'email', um: 'e-mail de cliente sem resposta', varios: 'e-mails de cliente sem resposta', rotulo: 'Responder', fazer: 'responda o cliente em E-mail', tela: { tipo: 'modulo', mod: 'email' }, origem: 'EMAIL' },
  email_cliente_parado: { modulo: 'email', um: 'colaborador com e-mail de cliente parado', varios: 'colaboradores com e-mail de cliente parado', rotulo: 'Cobrar resposta', fazer: 'combine com a pessoa a resposta ao cliente hoje', tela: { tipo: 'modulo', mod: 'email' }, origem: 'EMAIL' },
  auvo_importacao: { modulo: 'auvo', um: 'importação do Auvo parada', varios: 'importações do Auvo paradas', rotulo: 'Revisar', fazer: 'retome a importação em Integração Auvo', tela: { tipo: 'modulo', mod: 'auvo' }, origem: 'AUVO' },
  // 20/10/2026 (Caixa de decisões da gestão, SGO_Gestao_Decisoes.js › Gestao_fontePendencias_): decisões que a central ainda não listava.
  conduta_homologar: { modulo: 'conduta', um: 'ocorrência do Programa de conduta para homologar', varios: 'ocorrências do Programa de conduta para homologar', rotulo: 'Homologar', fazer: 'homologue ou rejeite em Programa de conduta > Ocorrências', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'CONDUTA' },
  conduta_julgar: { modulo: 'conduta', um: 'contestação ou recurso para julgar', varios: 'contestações ou recursos para julgar', rotulo: 'Julgar', fazer: 'julgue a defesa em Programa de conduta > Ocorrências', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'CONDUTA' },
  conduta_missao: { modulo: 'conduta', um: 'missão aguardando aprovação', varios: 'missões aguardando aprovação', rotulo: 'Aprovar', fazer: 'aprove ou recuse em Programa de conduta > Missões', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'CONDUTA' },
  atividade_justificativa: { modulo: 'atividades', um: 'justificativa de atraso para avaliar', varios: 'justificativas de atraso para avaliar', rotulo: 'Avaliar', fazer: 'leia a justificativa e toque em Ciente na Caixa de decisões', tela: { tipo: 'modulo', mod: 'gestao_decisoes' }, origem: 'ATIVIDADES' },
  frota_caso: { modulo: 'frota', um: 'caso da Frota em análise', varios: 'casos da Frota em análise', rotulo: 'Analisar', fazer: 'decida a causa e o tratamento em Frota > Gestão e melhoria', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  plano_atrasado: { modulo: 'qualidade', um: 'plano de ação com prazo vencido', varios: 'planos de ação com prazo vencido', rotulo: 'Plano atrasado', fazer: 'cobre as ações ou replaneje o plano', tela: { tipo: 'modulo', mod: 'conduta' }, origem: 'QUALIDADE' },
  frota_copiloto: { modulo: 'frota', um: 'sugestão do copiloto da Frota para decidir', varios: 'sugestões do copiloto da Frota para decidir', rotulo: 'Decidir', fazer: 'aceite ou descarte em Frota > Gestão e melhoria > Copiloto', tela: { tipo: 'modulo', mod: 'frota' }, origem: 'FROTA' },
  // 21/10/2026: Comercial nativo (SGO_Comercial_Painel.js › Comercial_fontePendencias_). Nenhum item leva valor.
  comercial_sem_proxima: { modulo: 'comercial', um: 'oportunidade sem próxima ação', varios: 'oportunidades sem próxima ação', rotulo: 'Sem próxima ação', fazer: 'registre o contato e marque a próxima ação em Comercial > Oportunidades', tela: { tipo: 'comercial', aba: 'oportunidades' }, origem: 'COMERCIAL' },
  comercial_parada: { modulo: 'comercial', um: 'oportunidade parada', varios: 'oportunidades paradas', rotulo: 'Parada', fazer: 'registre um contato real ou a perda em Comercial > Oportunidades', tela: { tipo: 'comercial', aba: 'oportunidades' }, origem: 'COMERCIAL' },
  comercial_desconto: { modulo: 'comercial', um: 'desconto de proposta para aprovar', varios: 'descontos de propostas para aprovar', rotulo: 'Aprovar desconto', fazer: 'aprove ou negue em Comercial > Propostas', tela: { tipo: 'comercial', aba: 'propostas' }, origem: 'COMERCIAL' },
  comercial_reabertura: { modulo: 'comercial', um: 'pedido de reabertura de oportunidade', varios: 'pedidos de reabertura de oportunidades', rotulo: 'Decidir', fazer: 'reabra ou recuse em Comercial > Oportunidades', tela: { tipo: 'comercial', aba: 'oportunidades' }, origem: 'COMERCIAL' },
  comercial_pedido_parado: { modulo: 'comercial', um: 'pedido aprovado sem passagem aos setores', varios: 'pedidos aprovados sem passagem aos setores', rotulo: 'Pedido parado', fazer: 'passe o pedido aos setores em Comercial > Propostas', tela: { tipo: 'comercial', aba: 'propostas' }, origem: 'COMERCIAL' },
  comercial_pedido_passar: { modulo: 'comercial', um: 'pedido aprovado para passar aos setores', varios: 'pedidos aprovados para passar aos setores', rotulo: 'Passar aos setores', fazer: 'toque em Passar aos setores na proposta', tela: { tipo: 'comercial', aba: 'propostas' }, origem: 'COMERCIAL' },
  comercial_aviso: { modulo: 'comercial', um: 'aviso do Comercial', varios: 'avisos do Comercial', rotulo: 'Informativo', fazer: 'abra o Comercial para ver', tela: { tipo: 'comercial', aba: 'hoje' }, origem: 'COMERCIAL' },
  // 21/10/2026: Assistente do ponto nativo (SGO_Ponto_Api.js › Ponto_fontePendencias_). Pedido do RH, parado (Caixa de decisões) e avisos.
  ponto_ajuste: { modulo: 'ponto', um: 'pedido de ajuste do ponto para tratar', varios: 'pedidos de ajuste do ponto para tratar', rotulo: 'Tratar', fazer: 'lance no relógio ou no sistema de ponto e marque em Assistente do ponto > Pedidos de ajuste', tela: { tipo: 'modulo', mod: 'ponto' }, origem: 'PONTO' },
  ponto_ajuste_parado: { modulo: 'ponto', um: 'pedido de ajuste do ponto parado', varios: 'pedidos de ajuste do ponto parados', rotulo: 'Parado', fazer: 'cobre o RH ou trate em Assistente do ponto > Pedidos de ajuste', tela: { tipo: 'modulo', mod: 'ponto' }, origem: 'PONTO' },
  ponto_aviso: { modulo: 'ponto', um: 'aviso do assistente do ponto', varios: 'avisos do assistente do ponto', rotulo: 'Informativo', fazer: 'abra o Assistente do ponto e toque em Ciente', tela: { tipo: 'modulo', mod: 'ponto' }, origem: 'PONTO' }
};

// Tipos que já têm janela própria ao entrar (não se repetem no resumo da janela de avisos).
var PEND_TIPOS_COM_JANELA_PROPRIA = ['atividade_atrasada', 'aviso_ciencia', 'conduta_ciencia', 'qualidade_cobranca'];

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Pend_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function Pend_hoje_() { return Utilities.formatDate(new Date(), PEND_FUSO, 'yyyy-MM-dd'); }

/** Data em qualquer formato do banco -> "aaaa-mm-dd" (ou '' se não der para ler). */
function Pend_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, PEND_FUSO, 'yyyy-MM-dd');
  var s = String(v).trim(), m;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] === '1899' ? '' : m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return m[3] + '-' + m[2] + '-' + m[1];
  return '';
}

function Pend_br_(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

/** Dias de hoje (horário de Brasília) até a data; negativo = já passou. */
function Pend_diasAte_(iso, hoje) {
  var a = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/), b = String(hoje || Pend_hoje_()).split('-');
  if (!a) return null;
  return Math.round((Date.UTC(+a[1], +a[2] - 1, +a[3]) - Date.UTC(+b[0], +b[1] - 1, +b[2])) / 864e5);
}

function Pend_num_(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function Pend_dias_(n) {
  n = Math.abs(Number(n) || 0);
  return Pend_num_(n) + (n === 1 ? ' dia' : ' dias');
}

function Pend_plural_(n, um, varios) { return Pend_num_(n) + ' ' + (Number(n) === 1 ? um : varios); }

function Pend_curto_(s, max) {
  s = Pend_s_(s).replace(/\s+/g, ' ');
  max = max || 60;
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s;
}

function Pend_listaCurta_(nomes, max) {
  var vistos = {}, lista = [];
  nomes.forEach(function (n) { n = Pend_curto_(n, 40); if (n && !vistos[n]) { vistos[n] = 1; lista.push(n); } });
  max = max || 3;
  if (lista.length <= max) return lista.join(', ');
  return lista.slice(0, max).join(', ') + ' e mais ' + Pend_num_(lista.length - max);
}

/** Texto do prazo: "vencido há 3 dias", "vence hoje", "vence em 12 dias". */
function Pend_textoPrazo_(dias, feminino) {
  if (dias === null || dias === undefined) return '';
  if (dias < 0) return (feminino ? 'vencida' : 'vencido') + ' há ' + Pend_dias_(dias);
  if (dias === 0) return 'vence hoje';
  return 'vence em ' + Pend_dias_(dias);
}

function Pend_semAcento_(s) {
  var t = String(s || '').toLowerCase();
  try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
  return t;
}

function Pend_hash_(s) {
  var h = 5381;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ------------------------------------------------------------
// LEITURA: cada aba uma vez por cálculo
// ------------------------------------------------------------
/** Roda fn com SGO_DATA.getAll memorizado (a mesma aba não é lida duas vezes, inclusive pelas funções dos módulos). */
function Pend_comMemoria_(fn) {
  if (SGO_DATA.__pendMemo) return fn();
  var original = SGO_DATA.getAll, memo = {};
  SGO_DATA.getAll = function (nome) {
    var k = String(nome);
    if (!Object.prototype.hasOwnProperty.call(memo, k)) memo[k] = original.call(SGO_DATA, nome);
    return memo[k].slice();
  };
  SGO_DATA.__pendMemo = true;
  try { return fn(); } finally { SGO_DATA.getAll = original; delete SGO_DATA.__pendMemo; }
}

/** Lê uma aba; aba que ainda não existe (módulo nunca usado) volta vazia sem erro. */
function Pend_ler_(aba) {
  if (!aba) return [];
  try { return SGO_DATA.getAll(aba) || []; }
  catch (e) {
    if (/Aba não encontrada/i.test(String((e && e.message) || e))) return [];
    throw e;
  }
}

function Pend_abaExiste_(aba) {
  try { return !!(aba && SGO_DATA.getDB().getSheetByName(aba)); } catch (e) { return false; }
}

// ------------------------------------------------------------
// CONTEXTO E VISIBILIDADE
// ------------------------------------------------------------
function Pend_contextoDaSessao_(sessao) {
  var perfil = SGO_UTILS.safeUpper(sessao.perfil);
  return {
    userId: SGO_UTILS.safe(sessao.userId), perfil: perfil, nome: SGO_UTILS.safe(sessao.nome) || SGO_UTILS.safe(sessao.usuario),
    clienteId: SGO_UTILS.safe(sessao.clienteId), cliente: perfil === 'CLIENTE',
    gestao: typeof isAdminPerfilAuth_ === 'function' ? isAdminPerfilAuth_(perfil) : (perfil === 'ADMIN' || perfil === 'GESTOR' || perfil === 'DIRETORIA'),
    // 21/10/2026 (pedido do dono): RH e Financeiro fazem a rotina da Frota; veem as pendências da Frota da gestão (CNH, documentos, multas).
    rotina: typeof SGO_ehGestaoRotina_ === 'function' && SGO_ehGestaoRotina_(perfil),
    // 20/10/2026: Diretoria (perfil ou dono do sistema) vê o que é só dela (sugestões sobre gestor).
    diretoria: perfil === 'DIRETORIA' || (function () { try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(sessao.usuario); } catch (e) { return false; } })(),
    interno: false
  };
}

/** Visão interna da equipe (ponte com o COMMAND): tudo o que a gestão vê, sem nada pessoal. */
function Pend_contextoInterno_() {
  return { userId: '', perfil: 'ADMIN', nome: 'COMMAND', clienteId: '', cliente: false, gestao: true, interno: true };
}

/**
 * publico: 'EQUIPE' (toda a equipe interna), 'TECNICA' (gestão + Metrologia), 'CLIENTE' (gestão +
 * Metrologia + o próprio cliente), 'GESTAO', 'ADMIN', 'PESSOA' (só paraUsuarios).
 * paraUsuarios: ids de CAD_USUARIOS que veem o item mesmo sem o perfil acima (o responsável).
 */
function Pend_podeVer_(it, ctx) {
  if (ctx.cliente) return it.publico === 'CLIENTE' && !!ctx.clienteId && Pend_s_(it.clienteId) === ctx.clienteId;
  if (ctx.userId && (it.paraUsuarios || []).indexOf(ctx.userId) >= 0) return true;
  // 21/10/2026: filtro da gestão pela área (matriz de avisos); sem a matriz carregada, a gestão vê tudo, como antes
  var daArea = function () { return typeof SGO_avisoCentralVe_ !== 'function' || SGO_avisoCentralVe_(it, ctx); };
  switch (it.publico) {
    case 'EQUIPE': return true;
    case 'CLIENTE':
    case 'TECNICA': return (ctx.gestao && daArea()) || (!ctx.gestao && ctx.perfil === 'METROLOGIA');
    case 'GESTAO': return (ctx.gestao && daArea()) || (!ctx.gestao && !!ctx.rotina && /^FROTA:/.test(Pend_s_(it.id)));
    case 'ADMIN': return ctx.perfil === 'ADMIN' && !ctx.interno;
    case 'DIRETORIA': return !!ctx.interno || !!ctx.diretoria;
    default: return false;
  }
}

// ------------------------------------------------------------
// MONTAGEM DE UM ITEM
// ------------------------------------------------------------
function Pend_item_(tipo, o) {
  var t = PEND_TIPOS[tipo];
  return {
    id: o.id, tipo: tipo, modulo: t.modulo, moduloNome: PEND_MODULOS[t.modulo] || t.modulo,
    gravidade: o.gravidade || 'ATENCAO', rotulo: o.rotulo || t.rotulo,
    titulo: o.titulo, detalhe: o.detalhe || '', oQueFazer: o.oQueFazer || '',
    oQueFazerOutro: o.oQueFazerOutro || '', oQueFazerCliente: o.oQueFazerCliente || '',
    nome: o.nome || '', vencimento: o.vencimento || '', dias: (o.dias === null || o.dias === undefined) ? null : Number(o.dias),
    tela: o.tela || t.tela, telaOutro: o.telaOutro || null, telaCliente: o.telaCliente || null,
    responsavel: o.responsavel || '', responsavelId: o.responsavelId || '',
    publico: o.publico || 'GESTAO', paraUsuarios: (o.paraUsuarios || []).filter(Boolean).map(String),
    clienteId: o.clienteId || '', textoEstavel: o.textoEstavel || '',
    // 20/10/2026: dados para a Caixa de decisões (área, prazo próprio, quem não pode decidir, dono do caso); não vai para a tela.
    extra: o.extra || null
  };
}

/** Prazo -> gravidade: vencido ou vence hoje = CRÍTICO; até o limite = ATENÇÃO; além disso não é pendência. */
function Pend_gravidadePrazo_(dias, limite) {
  if (dias === null || dias === undefined) return null;
  if (dias <= 0) return 'CRITICO';
  if (dias <= (limite || PEND_DIAS_ATENCAO)) return 'ATENCAO';
  return null;
}

// ------------------------------------------------------------
// FONTES
// ------------------------------------------------------------

/** Padrões de referência (CAD_PADROES): mesma classificação da emissão de certificado. */
function Pend_fontePadroes_(add) {
  if (!SGO_CFG.SHEETS.CAD_PADROES || typeof CertCal_classificarValidadePadrao_ !== 'function') return;
  var cfg = typeof AlertasPadroes_config_ === 'function' ? AlertasPadroes_config_() : { antecedenciaDias: PEND_DIAS_ATENCAO };
  var antecedencia = Number(cfg.antecedenciaDias) || PEND_DIAS_ATENCAO;
  Pend_ler_(SGO_CFG.SHEETS.CAD_PADROES).forEach(function (p) {
    if (SGO_UTILS.safeUpper(p.STATUS) !== 'ATIVO') return;
    var tag = Pend_s_(p.TAG) || Pend_s_(p.CODIGO) || Pend_s_(p.ID);
    var desc = Pend_curto_(p.DESCRICAO, 60);
    var v = CertCal_classificarValidadePadrao_(p.VALIDADE);
    var venc = Pend_iso_(p.VALIDADE);
    var base = { id: 'PADRAO:' + Pend_s_(p.ID || tag), nome: tag, publico: 'EQUIPE', responsavel: 'Metrologia', vencimento: Pend_br_(venc) };
    if (v.diasRestantes === null) {
      add(Pend_item_('padrao_sem_validade', Object.assign(base, {
        gravidade: 'ATENCAO', dias: null,
        titulo: 'Padrão ' + tag + ' sem validade válida',
        detalhe: (desc ? desc + '. ' : '') + v.label + '. Sem validade, o padrão não aparece para uso no certificado.',
        oQueFazer: 'Abra Padrões de referência, edite o padrão ' + tag + ' e informe a validade do certificado de calibração dele (dd/mm/aaaa).',
        textoEstavel: 'O padrão de referência \'' + tag + '\' está sem validade válida no cadastro.'
      })));
      return;
    }
    var d = Number(v.diasRestantes);
    if (v.status === 'VENCIDO' || d <= 0) {
      add(Pend_item_('padrao_vencido', Object.assign(base, {
        gravidade: 'CRITICO', dias: d,
        titulo: 'Padrão ' + tag + (d === 0 ? ' vence hoje' : ' vencido desde ' + Pend_br_(venc)),
        detalhe: (desc ? desc + '. ' : '') + (d === 0 ? 'A partir de hoje' : 'Vencido há ' + Pend_dias_(d) + '; enquanto não for recalibrado') + ' não pode ser usado em certificado.',
        oQueFazer: 'Envie o padrão ' + tag + ' para calibração e cadastre o novo certificado em Padrões de referência. Até lá, emita com outro padrão válido.',
        textoEstavel: 'O padrão de referência \'' + tag + '\'' + (desc ? ' (' + desc + ')' : '') + ' venceu em ' + Pend_br_(venc) + ' e não pode ser usado em certificado.'
      })));
    } else if (d <= antecedencia) {
      add(Pend_item_('padrao_vencendo', Object.assign(base, {
        gravidade: 'ATENCAO', dias: d,
        titulo: 'Padrão ' + tag + ' vence em ' + Pend_br_(venc),
        detalhe: (desc ? desc + '. ' : '') + 'Faltam ' + Pend_dias_(d) + '. Depois do vencimento ele não pode ser usado em certificado.',
        oQueFazer: 'Agende a calibração do padrão ' + tag + ' antes de ' + Pend_br_(venc) + ' e cadastre o novo certificado em Padrões de referência.',
        textoEstavel: 'O padrão de referência \'' + tag + '\'' + (desc ? ' (' + desc + ')' : '') + ' vence em ' + Pend_br_(venc) + '.'
      })));
    }
  });
}

/** Categoria do documento pelo tipo (mesma ideia do Inventário e da ponte com o COMMAND). */
function Pend_categoriaDocumento_(tipo) {
  var t = Pend_semAcento_(tipo);
  if (/calibra/.test(t)) return 'CAL';
  if (/nr ?-?13|vaso de press/.test(t)) return 'NR13';
  if (/qualifica/.test(t)) return 'QUAL';
  return 'DOC';
}

/** Próxima calibração gravada no certificado (DATA_VALIDADE ou DADOS_JSON.proximaCalibracao.data). */
function Pend_proximaCalibracao_(r) {
  var direta = Pend_iso_(r.DATA_VALIDADE);
  if (direta) return direta;
  try {
    var s = String(r.DADOS_JSON || '');
    if (!s || s.charAt(0) !== '{') return '';
    var o = JSON.parse(s), p = o && o.proximaCalibracao;
    return p && p.data ? Pend_iso_(p.data) : '';
  } catch (e) { return ''; }
}

/**
 * Vencimentos de documentos dos clientes: DOC_DOCUMENTOS, CERT_CALIBRACAO e NR13_LAUDOS.
 * Por equipamento e categoria vale o vencimento mais recente (renovado substitui o anterior);
 * o laudo NR-13 e a cópia dele em Documentos viram um item só.
 */
function Pend_fonteDocumentos_(add) {
  var hoje = Pend_hoje_();
  var clientes = {}, equips = {};
  Pend_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { clientes[Pend_s_(c.ID)] = c; });
  Pend_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { equips[Pend_s_(e.ID)] = e; });
  var nomeCliente = function (id) { var c = clientes[Pend_s_(id)]; return c ? (Pend_s_(c.NOME_FANTASIA) || Pend_s_(c.RAZAO_SOCIAL)) : ''; };
  var rotuloEquip = function (id) { var e = equips[Pend_s_(id)]; return e ? (Pend_s_(e.TAG) || Pend_s_(e.SERIE) || Pend_s_(e.TIPO)) : ''; };

  var porChave = {};
  var considerar = function (chave, cand) {
    var atual = porChave[chave];
    if (!atual || cand.venc > atual.venc) porChave[chave] = cand;
  };

  Pend_ler_(SGO_CFG.SHEETS.DOC_DOCUMENTOS || 'DOC_DOCUMENTOS').forEach(function (d) {
    if (SGO_UTILS.safeUpper(d.STATUS) !== 'ATIVO') return;
    var venc = Pend_iso_(d.DATA_VENCIMENTO);
    if (!venc) return;
    var cat = Pend_categoriaDocumento_(d.TIPO_DOCUMENTO);
    var eq = Pend_s_(d.EQUIPAMENTO_ID);
    var chave = eq ? cat + ':' + eq + (cat === 'DOC' ? '|' + Pend_semAcento_(d.TIPO_DOCUMENTO).replace(/\s+/g, ' ') : '') : 'DOC:' + Pend_s_(d.ID);
    considerar(chave, { cat: cat, venc: venc, clienteId: Pend_s_(d.CLIENTE_ID), equipId: eq, tipoDoc: Pend_s_(d.TIPO_DOCUMENTO).replace(/^\d+\.\s*/, ''), nomeArquivo: Pend_s_(d.NOME_ARQUIVO), numero: '' });
  });

  if (SGO_CFG.SHEETS.CERT_CALIBRACAO) {
    var ultimoCert = {};
    Pend_ler_(SGO_CFG.SHEETS.CERT_CALIBRACAO).forEach(function (r) {
      if (Pend_s_(r.STATUS) && SGO_UTILS.safeUpper(r.STATUS) !== 'ATIVO') return;
      var eq = Pend_s_(r.EQUIPAMENTO_ID);
      if (!eq) return;
      var ordem = (Pend_iso_(r.DATA_CALIBRACAO) || '0000-00-00') + '|' + Pend_s_(r.CRIADO_EM);
      if (!ultimoCert[eq] || ordem > ultimoCert[eq].ordem) ultimoCert[eq] = { ordem: ordem, r: r };
    });
    Object.keys(ultimoCert).forEach(function (eq) {
      var r = ultimoCert[eq].r, venc = Pend_proximaCalibracao_(r);
      if (!venc) return;
      considerar('CAL:' + eq, { cat: 'CAL', venc: venc, clienteId: Pend_s_(r.CLIENTE_ID), equipId: eq, tipoDoc: 'Certificado de calibração', nomeArquivo: '', numero: Pend_s_(r.NUMERO_CERTIFICADO) });
    });
  }

  var ultimoLaudo = {};
  Pend_ler_('NR13_LAUDOS').forEach(function (r) {
    if (SGO_UTILS.safeUpper(r.STATUS) !== 'EMITIDO') return;
    var eq = Pend_s_(r.EQUIPAMENTO_ID);
    if (!eq) return;
    var ordem = (Pend_iso_(r.DATA_TERMINO_INSPECAO) || '0000-00-00') + '|' + Pend_s_(r.CRIADO_EM);
    if (!ultimoLaudo[eq] || ordem > ultimoLaudo[eq].ordem) ultimoLaudo[eq] = { ordem: ordem, r: r };
  });
  Object.keys(ultimoLaudo).forEach(function (eq) {
    var r = ultimoLaudo[eq].r, venc = Pend_iso_(r.DATA_PROXIMA_INSPECAO);
    if (!venc) return;
    considerar('NR13:' + eq, { cat: 'NR13', venc: venc, clienteId: Pend_s_(r.CLIENTE_ID), equipId: eq, tipoDoc: 'Laudo NR-13', nomeArquivo: '', numero: Pend_s_(r.NUMERO_LAUDO) });
  });

  Object.keys(porChave).forEach(function (chave) {
    var c = porChave[chave];
    var dias = Pend_diasAte_(c.venc, hoje);
    var grav = Pend_gravidadePrazo_(dias, PEND_DIAS_ATENCAO);
    if (!grav) return;
    var vencido = grav === 'CRITICO';
    var cli = nomeCliente(c.clienteId), eq = rotuloEquip(c.equipId);
    var cnpj = clientes[c.clienteId] ? String(clientes[c.clienteId].CNPJ || '').replace(/\D/g, '') : '';
    var onde = [cli, eq ? 'equipamento ' + eq : ''].filter(Boolean).join(' · ');
    var prazo = Pend_textoPrazo_(dias, c.cat !== 'DOC');
    var base = { id: chave, publico: 'CLIENTE', clienteId: c.clienteId, gravidade: grav, dias: dias, vencimento: Pend_br_(c.venc), responsavel: cli ? 'Cliente ' + cli : '' };
    if (c.cat === 'CAL') {
      add(Pend_item_(vencido ? 'calibracao_vencida' : 'calibracao_vencendo', Object.assign(base, {
        nome: eq || cli || 'equipamento',
        titulo: 'Calibração ' + (eq ? 'do equipamento ' + eq + ' ' : '') + (dias === 0 ? 'vence hoje' : (vencido ? 'vencida desde ' : 'vence em ') + Pend_br_(c.venc)),
        detalhe: [onde, c.numero ? 'certificado nº ' + c.numero : ''].filter(Boolean).join(' · ') + '. Próxima calibração ' + prazo + '.',
        oQueFazer: 'Agende a recalibração com o cliente e emita o novo certificado em Certificado de calibração; o novo substitui este vencimento.',
        oQueFazerCliente: 'Entre em contato com a Metrolabs para agendar a recalibração deste equipamento.',
        tela: { tipo: 'certificado', cnpj: cnpj, numero: c.numero },
        telaCliente: { tipo: 'modulo', mod: 'documentos' },
        textoEstavel: 'A calibração ' + (eq ? 'do equipamento \'' + eq + '\' ' : '') + (cli ? 'do cliente \'' + cli + '\' ' : '') + (vencido ? 'venceu em ' : 'vence em ') + Pend_br_(c.venc) + '.'
      })));
    } else if (c.cat === 'NR13') {
      add(Pend_item_(vencido ? 'nr13_vencida' : 'nr13_vencendo', Object.assign(base, {
        nome: eq || cli || 'vaso',
        titulo: 'Inspeção NR-13 ' + (eq ? 'do equipamento ' + eq + ' ' : '') + (dias === 0 ? 'vence hoje' : (vencido ? 'vencida desde ' : 'vence em ') + Pend_br_(c.venc)),
        detalhe: [onde, c.numero ? 'laudo nº ' + c.numero : ''].filter(Boolean).join(' · ') + '. Próxima inspeção ' + prazo + '.',
        oQueFazer: 'Agende a nova inspeção com o cliente e emita o laudo em NR-13; o novo laudo substitui este vencimento.',
        oQueFazerCliente: 'Entre em contato com a Metrolabs para agendar a nova inspeção NR-13.',
        tela: { tipo: 'modulo', mod: 'nr13' },
        telaCliente: { tipo: 'modulo', mod: 'documentos' },
        textoEstavel: 'A inspeção NR-13 ' + (eq ? 'do equipamento \'' + eq + '\' ' : '') + (cli ? 'do cliente \'' + cli + '\' ' : '') + (vencido ? 'venceu em ' : 'vence em ') + Pend_br_(c.venc) + '.'
      })));
    } else if (c.cat === 'QUAL') {
      add(Pend_item_(vencido ? 'requalificacao_vencida' : 'requalificacao_vencendo', Object.assign(base, {
        nome: eq || cli || 'equipamento',
        titulo: 'Requalificação ' + (eq ? 'do equipamento ' + eq + ' ' : '') + (dias === 0 ? 'vence hoje' : (vencido ? 'vencida desde ' : 'vence em ') + Pend_br_(c.venc)),
        detalhe: [onde, c.nomeArquivo ? 'relatório ' + Pend_curto_(c.nomeArquivo, 70) : ''].filter(Boolean).join(' · ') + '. Requalificação ' + prazo + '.',
        oQueFazer: 'Agende a requalificação com o cliente e emita o novo relatório de qualificação no módulo do equipamento; o novo substitui este vencimento.',
        oQueFazerCliente: 'Entre em contato com a Metrolabs para agendar a requalificação deste equipamento.',
        tela: { tipo: 'modulo', mod: 'equipamentos' },
        telaCliente: { tipo: 'modulo', mod: 'equipamentos' },
        textoEstavel: 'A requalificação ' + (eq ? 'do equipamento \'' + eq + '\' ' : '') + (cli ? 'do cliente \'' + cli + '\' ' : '') + (vencido ? 'venceu em ' : 'vence em ') + Pend_br_(c.venc) + '.'
      })));
    } else {
      var nomeDoc = c.nomeArquivo || c.tipoDoc || 'Documento';
      add(Pend_item_(vencido ? 'documento_vencido' : 'documento_vencendo', Object.assign(base, {
        nome: nomeDoc,
        titulo: 'Documento ' + Pend_curto_(nomeDoc, 60) + (dias === 0 ? ' vence hoje' : (vencido ? ' vencido desde ' : ' vence em ') + Pend_br_(c.venc)),
        detalhe: [c.tipoDoc, onde].filter(Boolean).join(' · ') + '. ' + prazo.charAt(0).toUpperCase() + prazo.slice(1) + '.',
        oQueFazer: 'Emita ou anexe a versão atualizada em Documentos (mesmo equipamento e mesmo tipo); a nova substitui esta.',
        oQueFazerCliente: 'Entre em contato com a Metrolabs para renovar este documento.',
        tela: { tipo: 'documento', termo: c.nomeArquivo || c.tipoDoc },
        telaCliente: { tipo: 'documento', termo: c.nomeArquivo || c.tipoDoc },
        textoEstavel: 'O documento \'' + nomeDoc + '\'' + (c.tipoDoc && c.tipoDoc !== nomeDoc ? ' (' + c.tipoDoc + ')' : '') + (cli ? ' do cliente \'' + cli + '\'' : '') + (vencido ? ' venceu em ' : ' vence em ') + Pend_br_(c.venc) + '.'
      })));
    }
  });
}

/** Frota: CNH, documentos do veículo, manutenção, multa a conferir e veículo fora sem devolução. */
function Pend_fonteFrota_(add) {
  if (!SGO_CFG.SHEETS.CAD_VEICULOS || !Pend_abaExiste_(SGO_CFG.SHEETS.CAD_VEICULOS)) return;
  var limite = (typeof FROTA_CFG !== 'undefined' && FROTA_CFG.DIAS_AVISO_VENCIMENTO) || PEND_DIAS_ATENCAO;
  var diasAte = typeof Frota_diasAte_ === 'function' ? Frota_diasAte_ : function (v) { return Pend_diasAte_(Pend_iso_(v)); };
  var veiculos = {};
  Pend_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veiculos[Pend_s_(v.ID)] = v; });
  var condutores = {};
  Pend_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[Pend_s_(c.ID)] = c; });

  // Manutenção e documentos do veículo: regra do próprio módulo (última manutenção por tipo, documento renovado substitui)
  if (typeof Frota_calcularAlertasManutencao_ === 'function') {
    Frota_calcularAlertasManutencao_().forEach(function (a) {
      if (a.categoria !== 'MANUTENCAO' && a.categoria !== 'DOCUMENTO') return;
      var dias = a.vencimento ? diasAte(a.vencimento) : null;
      var critico = a.status === 'VENCIDO' || (dias !== null && dias <= 0);
      var placa = Pend_s_(a.veiculoPlaca) || 'sem placa';
      var venc = Pend_iso_(a.vencimento);
      if (a.categoria === 'DOCUMENTO') {
        add(Pend_item_(critico ? 'veiculo_doc_vencido' : 'veiculo_doc_vencendo', {
          id: 'FROTA:DOC:' + Pend_s_(a.veiculoId) + ':' + Pend_s_(a.tipo), nome: placa + ' (' + a.tipoLabel + ')', publico: 'GESTAO',
          gravidade: critico ? 'CRITICO' : 'ATENCAO', dias: dias, vencimento: Pend_br_(venc), responsavel: 'Gestão da frota',
          titulo: a.tipoLabel + ' do veículo ' + placa + (dias === 0 ? ' vence hoje' : (critico ? ' vencido' : ' vence') + (venc ? (critico ? ' desde ' : ' em ') + Pend_br_(venc) : '')),
          detalhe: 'Documento do veículo ' + Pend_textoPrazo_(dias, false) + '. Veículo com documento vencido não deve circular.',
          oQueFazer: 'Renove o ' + a.tipoLabel + ' e cadastre o novo em Frota > Documentos e multas (veículo ' + placa + '); o novo substitui o vencido.',
          textoEstavel: 'O veículo \'' + placa + '\' está com o documento \'' + a.tipoLabel + '\' ' + (critico ? 'vencido' : 'vencendo') + (venc ? ' (validade ' + Pend_br_(venc) + ')' : '') + '.'
        }));
      } else {
        var porKm = !venc;
        add(Pend_item_(critico ? 'manutencao_vencida' : 'manutencao_vencendo', {
          id: 'FROTA:MAN:' + Pend_s_(a.veiculoId) + ':' + Pend_s_(a.tipo), nome: placa + ' (' + a.tipoLabel + ')', publico: 'GESTAO',
          gravidade: critico ? 'CRITICO' : 'ATENCAO', dias: dias, vencimento: Pend_br_(venc), responsavel: 'Gestão da frota',
          titulo: a.tipoLabel + ' do veículo ' + placa + (critico ? ' vencida' : ' a vencer') + (venc ? (critico ? ' desde ' : ' em ') + Pend_br_(venc) : ''),
          detalhe: porKm ? (critico ? 'Passou da quilometragem prevista para a manutenção.' : 'Faltam menos de ' + Pend_num_((typeof FROTA_CFG !== 'undefined' && FROTA_CFG.KM_AVISO_VENCIMENTO) || 500) + ' km para a manutenção prevista.')
            : 'Manutenção ' + Pend_textoPrazo_(dias, true) + (critico ? ' (pela data ou pela quilometragem, o que vencer primeiro).' : '.'),
          oQueFazer: 'Faça a manutenção e lance em Frota > Manutenção e paradas (veículo ' + placa + '); o alerta some quando a nova manutenção for registrada.',
          textoEstavel: 'O veículo \'' + placa + '\' está com a manutenção \'' + a.tipoLabel + '\' ' + (critico ? 'vencida' : 'vencendo') + (venc ? ' (prevista para ' + Pend_br_(venc) + ')' : ' (pela quilometragem)') + '.'
        }));
      }
    });
  }

  // CNH: por condutor, com o login dele (quem tem login vinculado vê a própria CNH)
  Object.keys(condutores).forEach(function (id) {
    var c = condutores[id];
    if (SGO_UTILS.safeUpper(c.STATUS) === 'INATIVO') return;
    var dias = diasAte(c.CNH_VALIDADE);
    if (dias === null) return;
    var grav = dias < 0 ? 'CRITICO' : (dias === 0 ? 'CRITICO' : (dias <= limite ? 'ATENCAO' : null));
    if (!grav) return;
    var nome = Pend_s_(c.NOME) || 'Condutor sem nome', venc = Pend_iso_(c.CNH_VALIDADE);
    add(Pend_item_(grav === 'CRITICO' ? 'cnh_vencida' : 'cnh_vencendo', {
      id: 'FROTA:CNH:' + id, nome: nome, publico: 'GESTAO', paraUsuarios: [Pend_s_(c.USUARIO_ID)], responsavel: nome, responsavelId: Pend_s_(c.USUARIO_ID),
      gravidade: grav, dias: dias, vencimento: Pend_br_(venc),
      titulo: 'CNH de ' + nome + (dias === 0 ? ' vence hoje' : (grav === 'CRITICO' ? ' vencida desde ' : ' vence em ') + Pend_br_(venc)),
      detalhe: 'CNH ' + Pend_textoPrazo_(dias, true) + '.' + (grav === 'CRITICO' ? ' Com a CNH vencida o condutor não deve retirar veículo.' : ''),
      oQueFazer: 'Renove a CNH e atualize a validade no cadastro do condutor (Frota > Veículos e condutores > Condutores > Editar), anexando a CNH nova.',
      oQueFazerOutro: 'Cobre a renovação de ' + nome + ' e atualize a validade em Frota > Veículos e condutores > Condutores > Editar quando chegar a CNH nova.',
      textoEstavel: 'O condutor \'' + nome + '\' está com a CNH ' + (grav === 'CRITICO' ? 'vencida' : 'vencendo') + ' (validade ' + Pend_br_(venc) + ').'
    }));
  });

  // Multa aberta sem condutor (ou com mais de uma retirada no horário): a gestão indica quem pagou
  var multas = typeof Frota_registrosValidos_ === 'function' ? Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA) : Pend_ler_(SGO_CFG.SHEETS.REG_FROTA_MULTA);
  multas.forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'ABERTA') return;
    var ambigua = SGO_UTILS.safeUpper(m.STATUS_CRUZAMENTO) === 'MULTIPLOS';
    if (Pend_s_(m.CONDUTOR_ID) && !ambigua) return;
    var v = veiculos[Pend_s_(m.VEICULO_ID)] || {};
    var placa = Pend_s_(v.PLACA) || 'veículo não identificado';
    var data = Pend_br_(Pend_iso_(m.DATA_INFRACAO));
    add(Pend_item_('multa_conferir', {
      id: 'FROTA:MULTA:' + Pend_s_(m.ID), nome: placa + (data ? ' (' + data + ')' : ''), publico: 'GESTAO', gravidade: 'ATENCAO', dias: null,
      vencimento: data, responsavel: 'Gestão da frota',
      titulo: 'Multa do veículo ' + placa + (data ? ' de ' + data : '') + (ambigua ? ' com condutor a conferir' : ' sem condutor definido'),
      detalhe: ambigua ? 'Mais de uma retirada cobre o horário da infração; o condutor gravado é só um palpite.' : 'O cruzamento automático não achou retirada no horário da infração.',
      oQueFazer: 'Em Frota > Documentos e multas, confira as retiradas do horário da infração e indique o condutor responsável.',
      textoEstavel: 'O veículo \'' + placa + '\' tem uma multa' + (data ? ' (' + data + ')' : '') + (ambigua ? ' com condutor a conferir' : ' sem condutor vinculado') + '. Indique em Frota > Multas.'
    }));
  });

  // 17/10/2026 (decisão do dono): retirada aberta há mais de 12 horas = possível devolução esquecida
  // (antes: 2 dias). Vê o condutor e a gestão. "Agora" no horário de Brasília, na mesma régua das datas digitadas.
  var agoraSP = typeof Frota_agoraSP_ === 'function' ? Frota_agoraSP_().quando : new Date();
  var limiteHoras = typeof FROTA_HORAS_RETIRADA_ESQUECIDA !== 'undefined' ? FROTA_HORAS_RETIRADA_ESQUECIDA : 12;
  var movs = Pend_ler_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
  movs.forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'EM_ANDAMENTO') return;
    var saida = typeof Frota_parseDataHora_ === 'function' ? Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA) : null;
    if (!saida || !agoraSP) return;
    var horasFora = (agoraSP.getTime() - saida.getTime()) / 3600000;
    if (horasFora <= limiteHoras) return;
    var v = veiculos[Pend_s_(m.VEICULO_ID)] || {}, c = condutores[Pend_s_(m.CONDUTOR_ID)] || {};
    var placa = Pend_s_(v.PLACA) || 'veículo não identificado', nome = Pend_s_(c.NOME) || 'condutor não identificado';
    var dataSaida = typeof Frota_textoData_ === 'function' ? Frota_textoData_(m.DATA_SAIDA) : Pend_br_(Pend_iso_(m.DATA_SAIDA));
    var horaSaida = typeof Frota_textoHora_ === 'function' ? Frota_textoHora_(m.HORA_SAIDA) : Pend_s_(m.HORA_SAIDA);
    var fora = horasFora < 48 ? Pend_num_(Math.floor(horasFora)) + ' horas' : Pend_dias_(Math.floor(horasFora / 24));
    add(Pend_item_('frota_viagem_aberta', {
      id: 'FROTA:VIAGEM:' + Pend_s_(m.ID), nome: placa + ' (' + nome + ')', publico: 'GESTAO', paraUsuarios: [Pend_s_(c.USUARIO_ID)], responsavel: nome, responsavelId: Pend_s_(c.USUARIO_ID),
      gravidade: 'ATENCAO', dias: null, vencimento: dataSaida,
      titulo: 'Possível devolução esquecida: veículo ' + placa + ' fora há ' + fora,
      detalhe: 'Retirado por ' + nome + ' em ' + (dataSaida || 'data não informada') + (horaSaida ? ' às ' + horaSaida : '') + ' e sem devolução registrada há mais de ' + limiteHoras + ' horas.',
      oQueFazer: 'Se o veículo já voltou, registre a devolução agora em Frota > Situação e retiradas (botão verde "Devolver" com a placa: KM, vistoria e fotos). Se ainda está com você, nada a fazer: o aviso some quando a devolução for registrada.',
      oQueFazerOutro: 'Confirme com ' + nome + '. Se o veículo já voltou, ' + nome + ' registra a devolução; se não puder, a gestão registra no lugar dele em Frota > Situação e retiradas > "Em uso por outras pessoas", com justificativa (o condutor é avisado).',
      textoEstavel: 'O veículo \'' + placa + '\' saiu em ' + dataSaida + ' com ' + nome + ' e não tem devolução registrada.'
    }));
  });

  // KM divergente (retirada com KM diferente do registrado, devolução com KM fora do esperado): a gestão confere a foto do painel.
  if (typeof Frota_kmAConferir_ === 'function') {
    Frota_kmAConferir_().forEach(function (k) {
      var placa = k.placa || 'veículo não identificado';
      // 19/10/2026: etapa RASTREADOR_CHEGADA = KM rodado informado x KM rodado medido pelo rastreador (Rastreador_kmRodadoConferencia_).
      var etapaTxt = (/SAIDA$/.test(k.etapa) ? 'retirada' : 'devolução') + (k.rastreador ? ' (KM rodado pelo rastreador)' : '');
      add(Pend_item_('frota_km_conferir', {
        id: 'FROTA:KM:' + k.movimentacaoId + ':' + k.etapa, nome: placa + ' (' + etapaTxt + ' de ' + k.data + ')', publico: 'GESTAO',
        gravidade: 'ATENCAO', dias: null, vencimento: k.data, responsavel: 'Gestão da frota',
        titulo: 'KM a conferir: veículo ' + placa + ' na ' + etapaTxt + ' de ' + k.data,
        detalhe: k.motivo + '. Condutor: ' + (k.condutorNome || 'não identificado') + '.' + (k.fotos && k.fotos.length ? ' Registrado com foto do painel.' : ''),
        oQueFazer: k.rastreador
          ? 'Abra Frota > Situação e retiradas > KM a conferir e compare o KM rodado informado com o medido pelo rastreador (veja a foto do painel). Se o condutor digitou errado, use "Ajustar KM" com a justificativa; depois clique em "Conferido".'
          : 'Abra Frota > Situação e retiradas > KM a conferir, veja a foto do painel e clique em "Conferido". Se o KM do cadastro estiver errado, use "Ajustar KM" com a justificativa.',
        textoEstavel: 'O veículo \'' + placa + '\' tem KM divergente a conferir na ' + etapaTxt + ' de ' + k.data + '.'
      }));
    });
  }

  // Rastreador (17/10/2026): uso sem registro, partida não liberada, bloqueio pendente há 30 min, falha de conexão.
  if (typeof Rastreador_pendencias_ === 'function') Rastreador_pendencias_(add, veiculos, condutores);
  // 19/10/2026: avaria sem caso aberto e multa com pagamento vencendo (Frota > Gestão e melhoria).
  if (typeof Frota_gestaoPendencias_ === 'function') { try { Frota_gestaoPendencias_(add); } catch (eG) { console.error('Pendências da gestão da Frota: ' + ((eG && eG.message) || eG)); } }
  // 20/10/2026: comprovante de abastecimento pedido ao condutor e não enviado no prazo (Frota > Rastreamento).
  if (typeof FrotaR_pendencias_ === 'function') { try { FrotaR_pendencias_(add); } catch (eR) { console.error('Pendências do rastreamento da Frota: ' + ((eR && eR.message) || eR)); } }
  // 20/10/2026: reservas de veículo (atraso com reserva a seguir, conferência com problema, lembrete e avisos ao reservante).
  if (typeof FrotaRes_pendencias_ === 'function') { try { FrotaRes_pendencias_(add); } catch (eRes) { console.error('Pendências das reservas da Frota: ' + ((eRes && eRes.message) || eRes)); } }

  // Registro feito pela gestão em nome do condutor: informativo para o condutor por 7 dias.
  var diasInfo = typeof FROTA_DIAS_AVISO_REGISTRO_GESTAO !== 'undefined' ? FROTA_DIAS_AVISO_REGISTRO_GESTAO : 7;
  var corteInfo = Date.now() - diasInfo * 864e5;
  movs.forEach(function (m) {
    var c = condutores[Pend_s_(m.CONDUTOR_ID)] || {};
    var uid = Pend_s_(c.USUARIO_ID);
    if (!uid) return;
    var v = veiculos[Pend_s_(m.VEICULO_ID)] || {};
    var placa = Pend_s_(v.PLACA) || 'veículo não identificado';
    [['SAIDA', 'retirada'], ['CHEGADA', 'devolução']].forEach(function (e) {
      if (SGO_UTILS.safeUpper(m['REGISTRO_GESTAO_' + e[0]]) !== 'SIM') return;
      var por = Pend_s_(m['REGISTRADO_' + e[0] + '_POR_ID']);
      if (por && por === uid) return;   // o próprio condutor (data retroativa da gestão em registro próprio)
      var em = new Date(Pend_s_(m['REGISTRO_GESTAO_' + e[0] + '_EM'])).getTime();
      if (!isFinite(em) || em < corteInfo) return;
      var data = typeof Frota_textoData_ === 'function' ? Frota_textoData_(m[e[0] === 'SAIDA' ? 'DATA_SAIDA' : 'DATA_CHEGADA']) : '';
      var hora = typeof Frota_textoHora_ === 'function' ? Frota_textoHora_(m[e[0] === 'SAIDA' ? 'HORA_SAIDA' : 'HORA_CHEGADA']) : '';
      var quem = Pend_s_(m['REGISTRADO_' + e[0] + '_POR_NOME']) || 'a gestão';
      add(Pend_item_('frota_registro_gestao', {
        id: 'FROTA:GESTAO:' + Pend_s_(m.ID) + ':' + e[0], nome: placa + ' (' + e[1] + ')', publico: 'PESSOA', paraUsuarios: [uid],
        responsavel: Pend_s_(c.NOME), responsavelId: uid, gravidade: 'INFO', dias: null, vencimento: data,
        titulo: 'A gestão registrou a ' + e[1] + ' do veículo ' + placa + ' em seu nome',
        detalhe: 'Registrado por ' + quem + ' com ' + (e[0] === 'SAIDA' ? 'saída' : 'chegada') + ' em ' + data + (hora ? ' às ' + hora : '') +
          ' e KM ' + Pend_num_(typeof Frota_num_ === 'function' ? Frota_num_(m[e[0] === 'SAIDA' ? 'KM_SAIDA' : 'KM_CHEGADA'], 0) : Number(m[e[0] === 'SAIDA' ? 'KM_SAIDA' : 'KM_CHEGADA']) || 0) + '. Justificativa: ' + (Pend_s_(m['JUSTIFICATIVA_' + e[0]]) || 'não informada') + '.',
        oQueFazer: 'Confira os dados na Frota. Se algo estiver errado, fale com ' + quem + ' ou com a gestão. Este aviso some sozinho em ' + diasInfo + ' dias.',
        textoEstavel: 'A ' + e[1] + ' do veículo \'' + placa + '\' foi registrada pela gestão em nome de ' + Pend_s_(c.NOME) + '.'
      }));
    });
  });
}

/** Qualidade: falha de registro dos últimos 30 dias (O.S. do Auvo e retirada de veículo) e cobranças da gestão. */
function Pend_fonteQualidade_(add, ctx) {
  var corte = Utilities.formatDate(new Date(Date.now() - PEND_DIAS_REGISTRO * 864e5), PEND_FUSO, 'yyyy-MM-dd');

  // O.S. concluídas com registro incompleto (o vínculo de cadastro é pendência própria do Auvo, não se repete aqui)
  if (SGO_CFG.SHEETS.AUVO_TAREFAS && typeof QualidadeAuvo_motivosTarefa_ === 'function') {
    var usuarios = {};
    Pend_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[Pend_s_(u.ID)] = u; });
    Pend_ler_(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function (t) {
      if (SGO_UTILS.safeUpper(t.FINALIZADA) !== 'SIM') return;
      var data = Pend_iso_(t.DATA_TAREFA);
      if (!data || data < corte) return;
      var motivos = QualidadeAuvo_motivosTarefa_(t, { semVinculo: false });
      if (!motivos.length) return;
      var os = Pend_s_(t.AUVO_TASK_ID), tec = usuarios[Pend_s_(t.TECNICO_ID_SGO)];
      var nomeTec = (tec && Pend_s_(tec.NOME)) || Pend_s_(t.TECNICO_NOME_AUVO) || 'técnico não identificado';
      var cli = Pend_s_(t.CLIENTE_NOME_AUVO);
      add(Pend_item_('qualidade_os', {
        id: 'QUAL:OS:' + os, nome: 'O.S. ' + os, publico: 'GESTAO', paraUsuarios: [Pend_s_(t.TECNICO_ID_SGO)], responsavel: nomeTec, responsavelId: Pend_s_(t.TECNICO_ID_SGO),
        gravidade: 'ATENCAO', dias: null, vencimento: Pend_br_(data),
        titulo: 'O.S. nº ' + os + (cli ? ' (' + Pend_curto_(cli, 40) + ')' : '') + ' concluída com registro incompleto',
        detalhe: 'Falta: ' + motivos.join(', ') + '. Técnico ' + nomeTec + ', atendimento de ' + Pend_br_(data) + '.',
        oQueFazer: 'Complete no aplicativo do Auvo o que falta nesta O.S.; a correção aparece aqui depois da próxima sincronização.',
        oQueFazerOutro: 'Peça a ' + nomeTec + ' para completar o registro no Auvo; se não for possível, registre a cobrança no Painel de qualidade.',
        tela: Pend_s_(t.TASK_URL) ? { tipo: 'link', url: Pend_s_(t.TASK_URL), rotulo: 'Abrir no Auvo' } : { tipo: 'modulo', mod: 'qualidade' },
        telaOutro: { tipo: 'modulo', mod: 'qualidade' }
      }));
    });
  }

  // Retirada/devolução de veículo com registro incompleto
  if (SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO && typeof QualidadeFrota_motivosMovimentacao_ === 'function' && Pend_abaExiste_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO)) {
    var veic = {}, cond = {};
    Pend_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veic[Pend_s_(v.ID)] = v; });
    Pend_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { cond[Pend_s_(c.ID)] = c; });
    Pend_ler_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
      var data = Pend_iso_(m.DATA_SAIDA);
      if (!data || data < corte) return;
      var motivos = QualidadeFrota_motivosMovimentacao_(m);
      if (!motivos.length) return;
      var v = veic[Pend_s_(m.VEICULO_ID)] || {}, c = cond[Pend_s_(m.CONDUTOR_ID)] || {};
      var placa = Pend_s_(v.PLACA) || 'veículo não identificado', nome = Pend_s_(c.NOME) || 'condutor não identificado';
      add(Pend_item_('qualidade_mov', {
        id: 'QUAL:MOV:' + Pend_s_(m.ID), nome: placa + ' (' + Pend_br_(data) + ')', publico: 'GESTAO', paraUsuarios: [Pend_s_(c.USUARIO_ID)], responsavel: nome, responsavelId: Pend_s_(c.USUARIO_ID),
        gravidade: 'ATENCAO', dias: null, vencimento: Pend_br_(data),
        titulo: 'Retirada do veículo ' + placa + ' em ' + Pend_br_(data) + ' com registro incompleto',
        detalhe: 'Falta: ' + motivos.slice(0, 4).join('; ') + (motivos.length > 4 ? ' e mais ' + (motivos.length - 4) : '') + '. Condutor ' + nome + '.',
        oQueFazer: 'Abra a Frota, confira esta movimentação e complete o que falta (checklist, fotos e KM).',
        oQueFazerOutro: 'Confira com ' + nome + ' e complete a movimentação na Frota; se não der para corrigir, registre a observação no Painel de qualidade.',
        tela: { tipo: 'modulo', mod: 'frota' }, telaOutro: { tipo: 'modulo', mod: 'qualidade' }
      }));
    });
  }

  // Cobranças registradas pela gestão que a pessoa ainda não confirmou (só a própria pessoa)
  if (ctx.userId && !ctx.interno && Pend_abaExiste_(typeof QUALIDADE_OCORRENCIAS_SHEET !== 'undefined' ? QUALIDADE_OCORRENCIAS_SHEET : 'QUALIDADE_OCORRENCIAS')) {
    var condutorDoUsuario = null;
    Pend_ler_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) {
      if (!condutorDoUsuario && Pend_s_(c.USUARIO_ID) === ctx.userId && SGO_UTILS.safeUpper(c.STATUS) !== 'INATIVO') condutorDoUsuario = Pend_s_(c.ID);
    });
    Pend_ler_(QUALIDADE_OCORRENCIAS_SHEET).forEach(function (o) {
      if (SGO_UTILS.safeUpper(o.TIPO) !== 'COBRANCA' || SGO_UTILS.safeUpper(o.STATUS) !== 'ABERTA' || Pend_s_(o.CIENTE_EM)) return;
      var tp = SGO_UTILS.safeUpper(o.PESSOA_TIPO), pid = Pend_s_(o.PESSOA_ID);
      var minha = (tp === 'TECNICO' && pid === ctx.userId) || (tp === 'CONDUTOR' && !!condutorDoUsuario && pid === condutorDoUsuario);
      if (!minha) return;
      add(Pend_item_('qualidade_cobranca', {
        id: 'QUAL:COB:' + Pend_s_(o.ID), nome: Pend_curto_(o.DESCRICAO, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId,
        gravidade: 'ATENCAO', dias: null, vencimento: Pend_br_(Pend_iso_(o.CRIADO_EM)),
        titulo: 'Cobrança da gestão: ' + Pend_curto_(o.DESCRICAO, 80),
        detalhe: 'Registrada por ' + (Pend_s_(o.CRIADO_POR) || 'gestão') + ' em ' + (Pend_br_(Pend_iso_(o.CRIADO_EM)) || 'data não informada') + ' (área ' + (Pend_s_(o.AREA) || 'geral').toLowerCase() + ').',
        oQueFazer: 'Leia a cobrança e confirme com "Estou ciente" na janela de avisos; depois, corrija o que foi apontado.'
      }));
    });
  }
}

/** Atividades: atrasadas (responsável + gestão), vencendo hoje e avisos não lidos (só a pessoa). */
function Pend_fonteAtividades_(add, ctx) {
  if (ctx.cliente || typeof Atividades_todas_ !== 'function' || typeof Atividades_abas_ !== 'function') return;
  var abas = Atividades_abas_();
  if (!Pend_abaExiste_(abas.ATIVIDADES)) return;
  var agora = Atividades_agora_(), hoje = agora.slice(0, 10);
  Atividades_todas_().forEach(function (a) {
    if (!Atividades_aberta_(a) || !a.PREVISAO_ATUAL || !a.RESPONSAVEL_ID) return;
    var resp = Pend_s_(a.RESPONSAVEL_NOME) || 'responsável não identificado';
    var prev = Atividades_dataBr_(a.PREVISAO_ATUAL);
    if (a.PREVISAO_ATUAL < agora) {
      var dias = Pend_diasAte_(a.PREVISAO_ATUAL.slice(0, 10), hoje);
      add(Pend_item_('atividade_atrasada', {
        id: 'ATV:' + a.ID, nome: Pend_curto_(a.TITULO, 40), publico: 'GESTAO', paraUsuarios: [a.RESPONSAVEL_ID], responsavel: resp, responsavelId: a.RESPONSAVEL_ID,
        gravidade: 'CRITICO', dias: dias, vencimento: prev,
        titulo: 'Atividade atrasada: ' + Pend_curto_(a.TITULO, 80),
        detalhe: 'Previsão era ' + prev + (a.MODULO_NOME ? ' · ' + a.MODULO_NOME : '') + ' · responsável ' + resp + (a.QTD_JUSTIFICATIVAS ? ' · ' + Pend_plural_(a.QTD_JUSTIFICATIVAS, 'justificativa', 'justificativas') + ' já registrada(s)' : '') + '.',
        oQueFazer: 'Conclua a atividade ou registre a justificativa do atraso com a nova previsão (Minhas atividades).',
        oQueFazerOutro: 'Acompanhe com ' + resp + '; a justificativa e a nova previsão são registradas por ele em Minhas atividades.',
        tela: { tipo: 'atividade', id: a.ID }, telaOutro: { tipo: 'modulo', mod: 'atividades_equipe' }
      }));
    } else if (a.PREVISAO_ATUAL.slice(0, 10) === hoje) {
      add(Pend_item_('atividade_hoje', {
        id: 'ATV:' + a.ID, nome: Pend_curto_(a.TITULO, 40), publico: 'PESSOA', paraUsuarios: [a.RESPONSAVEL_ID], responsavel: resp, responsavelId: a.RESPONSAVEL_ID,
        gravidade: 'ATENCAO', dias: 0, vencimento: prev,
        titulo: 'Vence hoje: ' + Pend_curto_(a.TITULO, 80),
        detalhe: 'Previsão para hoje às ' + a.PREVISAO_ATUAL.slice(11, 16) + (a.MODULO_NOME ? ' · ' + a.MODULO_NOME : '') + '.',
        oQueFazer: 'Conclua até o horário previsto; se não for dar, registre a nova previsão antes de atrasar.',
        tela: { tipo: 'atividade', id: a.ID }
      }));
    }
  });
  if (ctx.userId && !ctx.interno && Pend_abaExiste_(abas.AVISOS)) {
    Pend_ler_(abas.AVISOS).forEach(function (v) {
      if (Pend_s_(v.DESTINATARIO_ID) !== ctx.userId || Pend_s_(v.LIDO_EM)) return;
      add(Pend_item_('atividade_aviso', {
        id: 'ATV_AVISO:' + Pend_s_(v.ID), nome: Pend_curto_(v.TITULO, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId,
        gravidade: 'INFO', dias: null, vencimento: Atividades_dataBr_(Atividades_normData_(v.DATA, '00:00')),
        titulo: Pend_s_(v.TITULO) || 'Aviso de atividade',
        detalhe: Pend_curto_(v.TEXTO, 160),
        oQueFazer: 'Abra a atividade para ver o histórico; o aviso fica marcado como lido quando aparece na tela de atividades.',
        tela: Pend_s_(v.ATIVIDADE_ID) ? { tipo: 'atividade', id: Pend_s_(v.ATIVIDADE_ID) } : { tipo: 'modulo', mod: 'minhas_atividades' }
      }));
    });
  }
}

/** Avisos da gestão com ciência: os meus sem confirmação e, para a gestão, avisos com prazo de leitura passado. */
function Pend_fonteAvisos_(add, ctx) {
  if (ctx.cliente || typeof Avisos_todos_ !== 'function' || typeof Avisos_abas_ !== 'function') return;
  if (!Pend_abaExiste_(Avisos_abas_().AVISOS)) return;
  var hoje = Avisos_agora_().slice(0, 10);
  var publicados = Avisos_todos_().filter(function (a) { return a.SITUACAO === 'PUBLICADO'; });
  if (!publicados.length) return;
  var ciencias = Avisos_ciencias_(null, null);
  if (ctx.userId && !ctx.interno) {
    publicados.forEach(function (a) {
      if (a.destinatarios.indexOf(ctx.userId) < 0) return;
      var c = ciencias[a.ID + '|' + ctx.userId];
      if (c && c.CIENTE_EM) return;
      var prazoVencido = !!(a.PRAZO_CIENCIA && a.PRAZO_CIENCIA < hoje);
      add(Pend_item_('aviso_ciencia', {
        id: 'AVISO:' + a.ID, nome: Pend_curto_(a.TITULO, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId,
        gravidade: prazoVencido ? 'CRITICO' : (a.IMPORTANCIA === 'Importante' ? 'ATENCAO' : 'INFO'),
        rotulo: prazoVencido ? 'Prazo de ciência vencido' : '',
        dias: a.PRAZO_CIENCIA ? Pend_diasAte_(a.PRAZO_CIENCIA, hoje) : null, vencimento: Pend_br_(a.PRAZO_CIENCIA),
        titulo: 'Aviso: ' + Pend_curto_(a.TITULO, 80),
        detalhe: 'Publicado por ' + (Pend_s_(a.PUBLICADO_POR_NOME) || 'gestão') + ' em ' + Pend_br_(a.PUBLICADO_EM) + (a.PRAZO_CIENCIA ? '. Prazo para confirmar a leitura: ' + Pend_br_(a.PRAZO_CIENCIA) + (prazoVencido ? ' (já passou)' : '') : '') + '.',
        oQueFazer: 'Leia o aviso e clique em "Li e estou ciente" (Principal > Avisos).'
      }));
    });
  }
  // gestão: aviso com prazo de leitura passado e gente que ainda não confirmou
  var ativos = {};
  if (typeof Avisos_usuariosAtivos_ === 'function') Avisos_usuariosAtivos_().forEach(function (u) { ativos[u.id] = true; });
  publicados.forEach(function (a) {
    if (!a.PRAZO_CIENCIA || a.PRAZO_CIENCIA >= hoje) return;
    var faltam = a.destinatarios.filter(function (u) { var c = ciencias[a.ID + '|' + u]; return ativos[u] && !(c && c.CIENTE_EM); }).length;
    if (!faltam) return;
    // 21/10/2026 (matriz de avisos, S21): quem publicou vê sempre (também fora da sua área)
    add(Pend_item_('aviso_leitura_atrasada', {
      id: 'AVISO_LEITURA:' + a.ID, nome: Pend_curto_(a.TITULO, 40), publico: 'GESTAO', paraUsuarios: Pend_s_(a.PUBLICADO_POR_ID) ? [Pend_s_(a.PUBLICADO_POR_ID)] : [], responsavel: Pend_s_(a.PUBLICADO_POR_NOME) || 'gestão',
      gravidade: 'ATENCAO', dias: Pend_diasAte_(a.PRAZO_CIENCIA, hoje), vencimento: Pend_br_(a.PRAZO_CIENCIA),
      titulo: 'Aviso "' + Pend_curto_(a.TITULO, 60) + '": ' + Pend_plural_(faltam, 'pessoa sem confirmar', 'pessoas sem confirmar') + ' a leitura',
      detalhe: 'O prazo de ciência era ' + Pend_br_(a.PRAZO_CIENCIA) + '.',
      oQueFazer: 'No painel de Avisos, veja quem não leu e clique em Reenviar, ou arquive o aviso se ele não vale mais.'
    }));
  });
}

/** Programa de Conduta: ciência pendente (a pessoa) e fechamento do mês (gestão). Não registra exibição do aviso. */
function Pend_fonteConduta_(add, ctx) {
  if (ctx.cliente) return;
  if (ctx.userId && !ctx.interno && typeof Conduta_avisosVigentes_ === 'function' && typeof Conduta_cienciasDe_ === 'function') {
    var eu = ctx.userId, ciencias = Conduta_cienciasDe_(eu);
    Conduta_avisosVigentes_().forEach(function (a) {
      var c = ciencias[a.tipo + '|' + a.ref + '|' + eu];
      if (c && Conduta_soData_(c.CIENTE_EM)) return;
      var minha = a.tipo === 'OCORRENCIA' && a.colaboradorId === eu;
      add(Pend_item_('conduta_ciencia', {
        id: 'CONDUTA:' + a.tipo + '|' + a.ref, nome: Pend_curto_(a.titulo, 40), publico: 'PESSOA', paraUsuarios: [eu], responsavel: ctx.nome, responsavelId: eu,
        gravidade: minha ? 'ATENCAO' : 'INFO', dias: null, vencimento: a.prazoContestacao ? Pend_br_(a.prazoContestacao) : '',
        rotulo: minha ? 'Em seu nome' : '',
        titulo: Pend_curto_(a.titulo, 90),
        detalhe: minha ? 'Esta ocorrência foi lançada em seu nome.' + (a.status === 'HOMOLOGADA' && a.prazoContestacao ? ' Se não concordar, conteste no Programa de Conduta até ' + Pend_br_(a.prazoContestacao) + '.' : '')
          : Pend_curto_((a.linhas || [])[0], 160),
        oQueFazer: 'Abra o aviso e clique em confirmar a leitura para registrar sua ciência.'
      }));
    });
  }
  // 20/10/2026: com a Caixa de decisões, as sugestões entram uma a uma (Gestao_fontePendencias_); a contagem só fica sem ela.
  if (ctx.gestao && typeof Conduta_qtdSugestoesPendentes_ === 'function' && typeof Gestao_fontePendencias_ !== 'function') {
    var qSug = 0;
    try { qSug = Conduta_qtdSugestoesPendentes_(); } catch (eSug) { qSug = 0; }
    if (qSug) add(Pend_item_('conduta_sugestao', { id: 'CONDUTA:SUGESTOES', nome: 'Sugestões de ocorrência', publico: 'GESTAO', responsavel: 'Gestão', gravidade: 'INFO', dias: null,
      titulo: Pend_plural_(qSug, 'sugestão de ocorrência aguarda', 'sugestões de ocorrência aguardam') + ' a decisão da gestão',
      detalhe: 'Vieram da Frota, do Auvo, do Painel de qualidade, de Minhas atividades, dos Avisos ou do ponto. Nada vira ocorrência sem a gestão aceitar.',
      oQueFazer: 'Abra Programa de conduta > Sugestões, confira a origem e aceite ou descarte com o motivo.' }));
  }
  if (!ctx.gestao || typeof Conduta_resumoMesAnterior_ !== 'function' || typeof Conduta_competenciaDe_ !== 'function') return;
  var r = Conduta_resumoMesAnterior_(Conduta_competenciaDe_(Conduta_hojeISO_()));
  if (!r || r.fechado) return;
  var limite = Pend_br_(r.limiteFechamento), pend = Number(r.pendencias) || 0;
  var item = { id: 'CONDUTA:FECHAMENTO:' + r.competencia, nome: r.nome, publico: 'GESTAO', responsavel: 'Gestão', vencimento: limite, dias: Pend_diasAte_(r.limiteFechamento) };
  if (r.prazoVencido && pend) {
    add(Pend_item_('conduta_fechamento', Object.assign(item, {
      gravidade: 'CRITICO', rotulo: 'Prazo vencido',
      titulo: 'Mês de ' + r.nome + ' passou do prazo de fechamento do Programa de Conduta',
      detalhe: 'O prazo era ' + limite + '. ' + Pend_plural_(pend, 'ocorrência ainda em defesa impede', 'ocorrências ainda em defesa impedem') + ' o fechamento automático.',
      oQueFazer: 'No Programa de Conduta, decida as defesas pendentes do mês e feche a competência.'
    })));
  } else if (r.prazoVencido) {
    add(Pend_item_('conduta_fechamento', Object.assign(item, {
      gravidade: 'INFO', rotulo: 'Fecha sozinho',
      titulo: 'Mês de ' + r.nome + ' será fechado pela rotina automática',
      detalhe: 'O prazo de fechamento (' + limite + ') passou sem pendências de defesa; a rotina diária fecha o mês.',
      oQueFazer: 'Nada a fazer. Se quiser fechar agora, use "Aplicar agora" no Programa de Conduta.'
    })));
  } else {
    add(Pend_item_('conduta_fechamento', Object.assign(item, {
      gravidade: 'ATENCAO',
      titulo: 'Fechar o mês de ' + r.nome + ' no Programa de Conduta até ' + limite,
      detalhe: pend ? Pend_plural_(pend, 'ocorrência ainda está', 'ocorrências ainda estão') + ' em defesa; com pendência o mês não fecha sozinho.' : 'Se ninguém fechar até o prazo, o sistema fecha sozinho.',
      oQueFazer: 'Confira a prévia do mês no Programa de Conduta e feche a competência.'
    })));
  }
}

/** Auvo: O.S. abertas (foto da última varredura), O.S. sem vínculo de cadastro e importação parada (administrador). */
function Pend_fonteAuvo_(add, ctx) {
  if (ctx.cliente) return;
  var usuarios = {};
  Pend_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[Pend_s_(u.ID)] = u; });

  if (SGO_CFG.SHEETS.AUVO_PENDENCIAS) {
    Pend_ler_(SGO_CFG.SHEETS.AUVO_PENDENCIAS).forEach(function (p) {
      var os = Pend_s_(p.AUVO_TASK_ID);
      if (!os) return;
      var tecId = Pend_s_(p.TECNICO_ID_SGO), tec = Pend_s_(p.TECNICO_NOME) || 'técnico não identificado';
      var dias = Number(p.DIAS_ABERTA) || 0, evid = SGO_UTILS.safeUpper(p.TEM_EVIDENCIA) === 'SIM';
      var url = Pend_s_(p.TASK_URL);
      add(Pend_item_('auvo_os_aberta', {
        id: 'AUVO:OS:' + os, nome: 'O.S. ' + os, publico: 'GESTAO', paraUsuarios: [tecId], responsavel: tec, responsavelId: tecId,
        gravidade: 'ATENCAO', rotulo: evid ? 'Falta finalizar' : 'Sem registro', dias: null, vencimento: Pend_br_(Pend_iso_(p.TASK_DATE)),
        titulo: 'O.S. nº ' + os + ' aberta no Auvo' + (dias ? ' há ' + Pend_dias_(dias) : ''),
        detalhe: [Pend_curto_(p.CLIENTE_NOME, 50), Pend_s_(p.TASK_TYPE_DESCRICAO), 'técnico ' + tec].filter(Boolean).join(' · ') + '. ' +
          (evid ? 'Tem registro de atendimento; só falta finalizar.' : 'Sem nenhum registro de atendimento (relato, questionário, check-in ou assinatura).'),
        oQueFazer: evid ? 'Finalize a O.S. no aplicativo do Auvo (o SGO+ não fecha O.S. por lá).' : 'Se o atendimento aconteceu, registre e finalize no Auvo; se não aconteceu, cancele ou reagende no Auvo.',
        oQueFazerOutro: 'Cobre a finalização de ' + tec + ' no Auvo (lista em Integração Auvo > Pendências de fechamento).',
        tela: url ? { tipo: 'link', url: url, rotulo: 'Abrir no Auvo' } : { tipo: 'modulo', mod: 'auvo' },
        telaOutro: { tipo: 'modulo', mod: 'auvo' }
      }));
    });
  }

  if (ctx.gestao && SGO_CFG.SHEETS.AUVO_TAREFAS) {
    Pend_ler_(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function (t) {
      var semCliente = !Pend_s_(t.CLIENTE_ID_SGO), semTecnico = !Pend_s_(t.TECNICO_ID_SGO);
      if (!semCliente && !semTecnico) return;
      var os = Pend_s_(t.AUVO_TASK_ID);
      if (!os) return;
      var falta = [semCliente ? 'cliente' + (Pend_s_(t.CLIENTE_NOME_AUVO) ? ' "' + Pend_curto_(t.CLIENTE_NOME_AUVO, 40) + '"' : '') : '', semTecnico ? 'técnico' + (Pend_s_(t.TECNICO_NOME_AUVO) ? ' "' + Pend_curto_(t.TECNICO_NOME_AUVO, 30) + '"' : '') : ''].filter(Boolean);
      add(Pend_item_('auvo_sem_vinculo', {
        id: 'AUVO:VINC:' + os, nome: 'O.S. ' + os, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: Pend_br_(Pend_iso_(t.DATA_TAREFA)), responsavel: 'Gestão',
        titulo: 'O.S. nº ' + os + ' sem vínculo de ' + (semCliente && semTecnico ? 'cliente e técnico' : (semCliente ? 'cliente' : 'técnico')) + ' com o SGO+',
        detalhe: 'Do Auvo, sem cadastro ligado no SGO+: ' + falta.join(' e ') + '. Sem o vínculo, a O.S. não entra nos avisos e na qualidade do técnico.',
        oQueFazer: 'Em Integração Auvo, vincule ' + (semCliente ? 'o cliente' : '') + (semCliente && semTecnico ? ' e ' : '') + (semTecnico ? 'o técnico (pelo e-mail do usuário)' : '') + ' ao cadastro do SGO+.'
      }));
    });
  }

  if (ctx.perfil === 'ADMIN' && !ctx.interno && typeof AUVO_REV_CFG !== 'undefined') {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(AUVO_REV_CFG.CHECKPOINT_KEY);
    if (!raw) return;
    var cp = {};
    try { cp = JSON.parse(raw) || {}; } catch (e) { cp = {}; }
    if (!cp.fase || cp.fase === 'CONCLUIDO') return;
    var agendado = false;
    try { agendado = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'Auvo_continuarViaTrigger_'; }); } catch (e) {}
    if (agendado && !cp.ultimoErro) return;
    var credenciais = !!(props.getProperty('AUVO_API_KEY') && props.getProperty('AUVO_API_TOKEN'));
    var desde = Pend_br_(Pend_iso_(cp.erroEm || cp.atualizadoEm));
    var fase = ({ CLIENTES: 'Clientes e unidades', EQUIPAMENTOS: 'Equipamentos' })[cp.fase] || String(cp.fase).toLowerCase();
    var motivo = cp.ultimoErro ? Pend_curto_(cp.ultimoErro, 200) : (!credenciais ? 'a conexão com o Auvo não está configurada (Chaves e senhas)' : 'a continuação automática não está agendada');
    add(Pend_item_('auvo_importacao', {
      id: 'AUVO:IMPORTACAO', nome: 'Importação do Auvo', publico: 'ADMIN', gravidade: 'ATENCAO', dias: null, vencimento: desde, responsavel: 'Administrador',
      titulo: 'Importação do Auvo parada' + (desde ? ' desde ' + desde : ''),
      detalhe: 'Fase ' + fase + (cp.indice ? ', a partir do item ' + cp.indice : '') + '. Motivo: ' + motivo + '.',
      oQueFazer: credenciais ? 'Em Integração Auvo, clique em Retomar sincronização em andamento.' : 'Grave as chaves do Auvo em Chaves e senhas e depois clique em Retomar sincronização em andamento (Integração Auvo).'
    }));
  }
}

// ------------------------------------------------------------
// CÁLCULO, ORDEM E AGRUPAMENTO
// ------------------------------------------------------------
var PEND_FONTES = [
  { nome: 'padrões de referência', fn: function (add, ctx) { Pend_fontePadroes_(add); } },
  { nome: 'vencimentos de documentos', fn: function (add, ctx) { Pend_fonteDocumentos_(add); } },
  { nome: 'frota', fn: function (add, ctx) { if (!ctx.cliente) Pend_fonteFrota_(add); } },
  { nome: 'qualidade', fn: function (add, ctx) { if (!ctx.cliente) Pend_fonteQualidade_(add, ctx); } },
  { nome: 'atividades', fn: Pend_fonteAtividades_ },
  { nome: 'avisos', fn: Pend_fonteAvisos_ },
  { nome: 'Programa de Conduta', fn: Pend_fonteConduta_ },
  { nome: 'Auvo', fn: Pend_fonteAuvo_ },
  // 21/10/2026: e-mails de cliente sem leitura/resposta (SGO_Email.js): da própria pessoa e, parados, da gestão.
  { nome: 'e-mail', fn: function (add, ctx) { if (!ctx.cliente && typeof Email_pendencias_ === 'function') Email_pendencias_(add, ctx); } },
  // 21/10/2026: Comercial nativo (SGO_Comercial_Painel.js): sem próxima ação, desconto, reabertura, pedido parado e avisos.
  { nome: 'Comercial', fn: function (add, ctx) { if (!ctx.cliente && typeof Comercial_fontePendencias_ === 'function') Comercial_fontePendencias_(add, ctx); } },
  // 21/10/2026: Assistente do ponto (SGO_Ponto_Api.js): pedidos de ajuste do RH, pedido parado (Caixa de decisões) e avisos.
  { nome: 'Assistente do ponto', fn: function (add, ctx) { if (!ctx.cliente && typeof Ponto_fontePendencias_ === 'function') Ponto_fontePendencias_(add, ctx); } },
  // 20/10/2026: decisões da gestão que só a Caixa de decisões conhecia (SGO_Gestao_Decisoes.js).
  { nome: 'decisões da gestão', fn: function (add, ctx) { if (ctx.gestao && typeof Gestao_fontePendencias_ === 'function') Gestao_fontePendencias_(add, ctx); } }
];

function Pend_ordenar_(a, b) {
  var g = PEND_GRAV_ORDEM[a.gravidade] - PEND_GRAV_ORDEM[b.gravidade];
  if (g) return g;
  if (a.meu !== b.meu) return a.meu ? -1 : 1;
  var da = a.dias === null ? -1e9 : a.dias, db = b.dias === null ? -1e9 : b.dias;
  if (a.gravidade !== 'CRITICO') { da = a.dias === null ? 1e9 : a.dias; db = b.dias === null ? 1e9 : b.dias; }
  if (da !== db) return da - db;
  return String(a.titulo).localeCompare(String(b.titulo));
}

/** Calcula as pendências que o contexto enxerga. { itens, naoVerificado }. */
function Pend_calcular_(ctx) {
  return Pend_comMemoria_(function () {
    var porId = {}, lista = [], naoVerificado = [];
    var add = function (it) {
      if (!it || !it.id || !Pend_podeVer_(it, ctx)) return;
      if (porId[it.id]) {   // mesma pendência por dois caminhos: fica a mais grave
        var atual = porId[it.id];
        if (PEND_GRAV_ORDEM[it.gravidade] < PEND_GRAV_ORDEM[atual.gravidade]) { lista[lista.indexOf(atual)] = it; porId[it.id] = it; }
        return;
      }
      porId[it.id] = it;
      lista.push(it);
    };
    PEND_FONTES.forEach(function (f) {
      try { f.fn(add, ctx); }
      catch (e) {
        naoVerificado.push(f.nome);
        try { console.error('Pendências (' + f.nome + '): ' + ((e && e.message) || e)); } catch (e2) {}
      }
    });
    lista.forEach(function (it) {
      it.meu = !!ctx.userId && it.paraUsuarios.indexOf(ctx.userId) >= 0;
      if (ctx.cliente) {
        if (it.oQueFazerCliente) it.oQueFazer = it.oQueFazerCliente;
        if (it.telaCliente) it.tela = it.telaCliente;
      } else if (!it.meu) {
        if (it.oQueFazerOutro) it.oQueFazer = it.oQueFazerOutro;
        if (it.telaOutro) it.tela = it.telaOutro;
      }
    });
    lista.sort(Pend_ordenar_);
    return { itens: lista, naoVerificado: naoVerificado };
  });
}

/** Agrupa por tipo (para a faixa do Início, a janela ao entrar e o celular). */
function Pend_agrupar_(itens) {
  var grupos = {}, ordem = [];
  itens.forEach(function (it) {
    var g = grupos[it.tipo];
    if (!g) { g = grupos[it.tipo] = { tipo: it.tipo, itens: [] }; ordem.push(g); }
    g.itens.push(it);
  });
  return ordem.map(function (g) {
    var t = PEND_TIPOS[g.tipo], primeiro = g.itens[0], n = g.itens.length;
    var pior = g.itens.reduce(function (m, i) { return PEND_GRAV_ORDEM[i.gravidade] < PEND_GRAV_ORDEM[m] ? i.gravidade : m; }, 'INFO');
    var criticos = g.itens.filter(function (i) { return i.gravidade === 'CRITICO'; }).length;
    return {
      tipo: g.tipo, modulo: t.modulo, moduloNome: PEND_MODULOS[t.modulo] || t.modulo, gravidade: pior,
      rotulo: n === 1 ? primeiro.rotulo : t.rotulo, qtd: n, criticos: criticos,
      meus: g.itens.filter(function (i) { return i.meu; }).length,
      titulo: n === 1 ? primeiro.titulo : Pend_plural_(n, t.um, t.varios),
      detalhe: n === 1 ? primeiro.detalhe : Pend_listaCurta_(g.itens.map(function (i) { return i.nome || i.titulo; }), 3) + ' · ' + t.fazer.charAt(0).toUpperCase() + t.fazer.slice(1) + '.',
      oQueFazer: n === 1 ? primeiro.oQueFazer : t.fazer.charAt(0).toUpperCase() + t.fazer.slice(1) + '.',
      tela: n === 1 ? primeiro.tela : (g.itens.every(function (i) { return i.meu; }) && primeiro.tela && primeiro.tela.tipo === 'atividade' ? { tipo: 'modulo', mod: 'minhas_atividades' } : t.tela),
      ids: g.itens.slice(0, 100).map(function (i) { return i.id; })
    };
  }).sort(function (a, b) {
    var g = PEND_GRAV_ORDEM[a.gravidade] - PEND_GRAV_ORDEM[b.gravidade];
    if (g) return g;
    if ((a.meus > 0) !== (b.meus > 0)) return a.meus > 0 ? -1 : 1;
    return 0;
  });
}

function Pend_resumo_(itens) {
  var r = { total: itens.length, criticos: 0, atencao: 0, info: 0, meus: 0, porModulo: {}, porTipo: {}, vencimentos: { total: 0, criticos: 0 } };
  itens.forEach(function (it) {
    if (it.gravidade === 'CRITICO') r.criticos++; else if (it.gravidade === 'ATENCAO') r.atencao++; else r.info++;
    if (it.meu) r.meus++;
    var m = r.porModulo[it.modulo] = r.porModulo[it.modulo] || { nome: it.moduloNome, total: 0, criticos: 0 };
    m.total++; if (it.gravidade === 'CRITICO') m.criticos++;
    r.porTipo[it.tipo] = (r.porTipo[it.tipo] || 0) + 1;
    if (PEND_TIPOS[it.tipo].vencimento) { r.vencimentos.total++; if (it.gravidade === 'CRITICO') r.vencimentos.criticos++; }
  });
  return r;
}

/** Item como sai para a tela: sem a lista de ids de quem mais vê o item. */
function Pend_paraTela_(it) {
  return {
    id: it.id, tipo: it.tipo, modulo: it.modulo, moduloNome: it.moduloNome, gravidade: it.gravidade, rotulo: it.rotulo,
    titulo: it.titulo, detalhe: it.detalhe, oQueFazer: it.oQueFazer, nome: it.nome, vencimento: it.vencimento, dias: it.dias,
    tela: it.tela || null, responsavel: it.responsavel, responsavelId: it.responsavelId, meu: it.meu, clienteId: it.clienteId,
    origem: PEND_TIPOS[it.tipo].origem, vencimentoTipo: !!PEND_TIPOS[it.tipo].vencimento,
    textoEstavel: it.textoEstavel || ''   // frase que não muda de um dia para o outro (ponte com o COMMAND)
  };
}

/** Monta a resposta completa para um contexto (com cache curto por pessoa). */
function Pend_resposta_(ctx, opcoes) {
  opcoes = opcoes || {};
  var cache = null, chave = '';
  try {
    cache = CacheService.getScriptCache();
    var geracao = cache.get('PEND_GERACAO') || '0';
    chave = PEND_CACHE_PREFIXO + geracao + '_' + (ctx.interno ? 'INTERNO' : (ctx.userId || 'anon') + '_' + ctx.perfil + '_' + (ctx.clienteId || ''));
    if (!opcoes.semCache) {
      var salvo = cache.get(chave);
      if (salvo) { var obj = JSON.parse(salvo); obj.doCache = true; return obj; }
    }
  } catch (e) { cache = null; }

  var calc = Pend_calcular_(ctx);
  var itens = calc.itens.map(Pend_paraTela_);
  var resp = {
    ok: true,
    geradoEm: Utilities.formatDate(new Date(), PEND_FUSO, 'dd/MM/yyyy HH:mm'),
    resumo: Pend_resumo_(itens),
    grupos: Pend_agrupar_(itens),
    itens: itens,
    naoVerificado: calc.naoVerificado,
    regras: { diasAtencao: PEND_DIAS_ATENCAO, diasRegistro: PEND_DIAS_REGISTRO, venceHojeCritico: true }
  };
  resp = JSON.parse(JSON.stringify(resp));
  if (cache && chave) {
    try { var txt = JSON.stringify(resp); if (txt.length < 95000) cache.put(chave, txt, PEND_CACHE_SEG); } catch (e) {}
  }
  return resp;
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
/**
 * Fonte única das pendências da pessoa logada.
 * opcoes: { semCache: true } força recalcular; { limite: n } corta a lista de itens (padrão 500).
 * Devolve { ok, geradoEm, resumo, grupos, itens, naoVerificado, regras } — ver docs/ALERTAS_UNIFICADOS_20261017.md.
 * Lança erro só se a sessão for inválida.
 */
function SGO_Pendencias_listar(sessionId, opcoes) {
  var sessao = exigirSessao(sessionId);
  // 21/10/2026: a pessoa abriu o sistema hoje (o WhatsApp de resumo do dia não vai a quem já entrou; SGO_Avisos_Matriz.js)
  if (typeof SGO_avisoMarcarPresenca_ === 'function') SGO_avisoMarcarPresenca_(sessao.userId);
  var r = Pend_resposta_(Pend_contextoDaSessao_(sessao), opcoes);
  var limite = Number((opcoes || {}).limite) || 500;
  if (r.itens.length > limite) { r.itens = r.itens.slice(0, limite); r.cortado = true; }
  return r;
}

/** Visão interna (sem sessão): para a ponte com o COMMAND. Só itens da equipe, nada pessoal. */
function SGO_Pendencias_interno_(opcoes) {
  return Pend_resposta_(Pend_contextoInterno_(), opcoes);
}

/** google.script.run (celular e telas): nunca lança; erro vem em { ok:false, message }. */
function SGO_Pendencias_apiListar(sessionId, payload) {
  try {
    return SGO_Pendencias_listar(sessionId, payload || {});
  } catch (e) {
    return { ok: false, message: 'Não foi possível verificar as pendências: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. Atualize a página; se continuar, avise o administrador.' };
  }
}

/** Depois de gravar algo que muda pendência: o próximo pedido de qualquer pessoa recalcula. */
function SGO_Pendencias_invalidar_() {
  try { CacheService.getScriptCache().put('PEND_GERACAO', String(Date.now()), 21600); } catch (e) {}
}

/**
 * 17/10/2026 (verificação geral): documentos, equipamentos, clientes, unidades, padrões,
 * certificados, laudos NR-13 e vínculos também mudam pendências. Sem isto, o documento
 * renovado continuava no Início por até 60 s. Devolve o próprio resultado da gravação.
 */
function SGO_Pendencias_aposGravar_(resultado) {
  if (!(resultado && (resultado.success === false || resultado.ok === false))) SGO_Pendencias_invalidar_();
  return resultado;
}
