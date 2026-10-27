/****************************************************
 * ASSISTÊNCIA TÉCNICA NATIVA DO SGO+ — BASE (21/10/2026)
 *
 * Projeto aprovado pelo dono: docs/PROJETO_ASSISTENCIA_TECNICA_NO_SGO_20261021.md ("eu quero isso tudo pronto").
 * A Metrolabs deixa de depender do Auvo: chamado, triagem, prazo, agenda, O.S. com checklist, fotos, peças e
 * assinatura, relatório A4, orçamento do chamado, portal do cliente e a fonte única de atendimentos. As regras vêm da
 * Assistência do COMMAND (Assistencia.js, Casos.js, OrcChamado.js, PortalCliente.js) como especificação, reescritas
 * no padrão do SGO+. A integração com o Auvo continua funcionando em paralelo; nada do Auvo é desligado aqui.
 *
 * Arquivos do módulo:
 *   SGO_Assistencia_Config.js      base, regras (configuráveis), tipos de O.S., modelos de checklist, acesso, prazos
 *   SGO_Assistencia_Chamados.js    abertura (tela, telefone, e-mail, portal, QR, Comercial), triagem, situações, casos
 *   SGO_Assistencia_Agenda.js      agenda por técnico, conflito, reagendamento, rota do dia, reserva de veículo
 *   SGO_Assistencia_OS.js          O.S.: marcos, checklist, fotos, peças, série, assinatura, trava de encerramento
 *   SGO_Assistencia_App.js         API do aplicativo do técnico (docs/API_APP_TECNICO.md)
 *   SGO_Assistencia_Relatorio.js   relatório da O.S. A4, orçamento do chamado A4, indicadores e relatório mensal
 *   SGO_Assistencia_Fonte.js       fonte única de atendimentos (Auvo + acervo + O.S. do SGO+), questionários do acervo
 *   SGO_Assistencia_Painel.js      pendências, rotina, transição do Auvo e a chamada única da tela (Assistencia_api)
 *   SGO_Pendencias_Assistencia.js  registra os tipos na central, na Caixa de decisões e na matriz de avisos
 *   SGO_Ajuda_Assistencia.js       ajuda "Como usar esta tela"
 *   JS_Assistencia.html            telas (gestão, técnico no computador e portal do cliente)
 *
 * Abas (criadas sob demanda; nada é apagado, só marcado): ATEC_CONFIG, ATEC_TIPOS, ATEC_MODELOS, ATEC_CHAMADOS, ATEC_OS,
 * ATEC_EVENTOS, ATEC_FOTOS, ATEC_PECAS, ATEC_SYNC, ATEC_SOLICITACOES, ATEC_CASOS, ATEC_ORCAMENTOS, ATEC_RELATORIOS,
 * ATEC_AVISOS, ATEC_ACERVO_EQUIP. Prefixo ATEC_ para não colidir com abas antigas AST_* do legado.
 * Nenhuma função devolve Date cru. Leitura de aba: uma vez por chamada (Ast_ler_ guarda na memória da chamada).
 ****************************************************/

var AST_FUSO = 'America/Sao_Paulo';
var AST_OFFSET_MIN = -180; // Brasília sem horário de verão (desde 2019)
var AST_ABAS = {
  CONFIG: 'ATEC_CONFIG', TIPOS: 'ATEC_TIPOS', MODELOS: 'ATEC_MODELOS', CHAMADOS: 'ATEC_CHAMADOS', OS: 'ATEC_OS', EVENTOS: 'ATEC_EVENTOS',
  FOTOS: 'ATEC_FOTOS', PECAS: 'ATEC_PECAS', SYNC: 'ATEC_SYNC', SOLICITACOES: 'ATEC_SOLICITACOES', CASOS: 'ATEC_CASOS',
  ORCAMENTOS: 'ATEC_ORCAMENTOS', RELATORIOS: 'ATEC_RELATORIOS', AVISOS: 'ATEC_AVISOS', ACERVO_EQUIP: 'ATEC_ACERVO_EQUIP',
  // 22/10/2026 (etapa 4): link de aceite do orçamento (só o resumo do token) e a trilha só-inclusão das respostas do cliente
  ORC_LINKS: 'ATEC_ORC_LINKS', ORC_ACEITES: 'ATEC_ORC_ACEITES'
};
var AST_COLUNAS = {
  ATEC_CONFIG: ['ID', 'CHAVE', 'VALOR_JSON', 'VERSAO', 'MOTIVO', 'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_TIPOS: ['ID', 'CODIGO', 'NOME', 'GRUPO', 'DESCRICAO', 'EXIGE_RELATO', 'EXIGE_ASSINATURA', 'FOTOS_MIN', 'EXIGE_QR_SERIE', 'EXIGE_CHECKLIST', 'MODELO_CODIGO',
    'DOCUMENTO_TECNICO', 'SEM_VISITA', 'AUVO_TIPOS', 'ORDEM', 'ATIVO', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_MODELOS: ['ID', 'CODIGO', 'NOME', 'VERSAO', 'PERGUNTAS_JSON', 'ORIGEM', 'AUVO_QUESTIONARIO_ID', 'ATIVO', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_CHAMADOS: ['ID', 'NUMERO', 'SITUACAO', 'CANAL', 'ORIGEM_REF', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'EQUIPAMENTO_ID', 'EQUIPAMENTO_TEXTO',
    'EQUIP_NAO_IDENTIFICADO', 'SOLICITANTE', 'CONTATO', 'SINTOMA', 'PARADA', 'PRIORIDADE', 'PRIORIDADE_MOTIVO', 'TIPO_CODIGO', 'ABERTO_EM', 'ABERTO_POR_ID', 'ABERTO_POR_NOME',
    'SLA_FONTE', 'SLA_MIN_UTEIS', 'TRIAGEM_MIN_UTEIS', 'PAUSA_PERMITIDA', 'PAUSA_DESDE', 'PAUSA_MIN', 'PRAZO_TRIAGEM_EM', 'PRAZO_ATENDIMENTO_EM',
    'TRIAGEM_RESPONSAVEL_ID', 'TRIAGEM_RESPONSAVEL_NOME', 'TRIAGEM_JSON', 'TRIAGEM_INICIO_EM', 'TRIAGEM_FIM_EM', 'ACAO_DECIDIDA', 'ORIENTACAO_REMOTA',
    'ORCAMENTO_DESCRICAO', 'ORCAMENTO_ID', 'PECA_DESCRICAO', 'REQUISICAO_ID', 'REQUISICAO_NUMERO', 'AGUARDANDO_MOTIVO', 'RETORNO_PREVISTO',
    'TECNICO_ID', 'TECNICO_NOME', 'AGENDADO_PARA', 'DURACAO_MIN', 'OS_ID', 'OS_NUMERO', 'ATENDIDO_EM', 'ENCERRADO_EM', 'CANCELADO_EM', 'CANCELADO_MOTIVO',
    'CANCELADO_POR_NOME', 'REINCIDENTE', 'REINCIDENCIA_DE', 'CASO_ID', 'PROPOSTA_ID', 'SOLICITACAO_ID', 'PROXIMA_ACAO', 'ABERTA_EM_CAMPO',
    // 22/10/2026 (etapas 2 e 3): peça disponível em Compras, prazo de chegada do contrato e alerta do P1 sem triagem
    'PECA_DISPONIVEL_EM', 'CHEGADA_MIN_UTEIS', 'PRAZO_CHEGADA_EM', 'P1_ALERTA_EM',
    // 27/10/2026: triagem com fila livre (quem assumiu e quando; quando foi liberado para qualquer colaborador) e exclusão lógica
    // de chamado de teste ou simulação (nada é apagado: EXCLUIDO_EM preenchido tira o chamado das listas; restaurar limpa só EXCLUIDO_EM)
    'ASSUMIDO_POR_ID', 'ASSUMIDO_POR_NOME', 'ASSUMIDO_EM', 'FILA_LIVRE_EM', 'EXCLUSAO_ID', 'EXCLUIDO_EM', 'EXCLUIDO_POR_ID', 'EXCLUIDO_POR_NOME', 'EXCLUIDO_MOTIVO',
    'RESTAURADO_EM', 'RESTAURADO_POR_NOME', 'RESTAURADO_MOTIVO', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_OS: ['ID', 'NUMERO', 'CHAMADO_ID', 'CHAMADO_NUMERO', 'SITUACAO', 'TIPO_CODIGO', 'TIPO_NOME', 'MODELO_CODIGO', 'MODELO_VERSAO', 'PERGUNTAS_JSON',
    'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'EQUIPAMENTO_ID', 'EQUIPAMENTO_TEXTO', 'ENDERECO', 'TECNICO_ID', 'TECNICO_NOME',
    'AGENDADO_PARA', 'DURACAO_MIN', 'ORDEM_DIA', 'PREPARO_JSON', 'ORIENTACAO', 'SAIU_EM', 'CHEGOU_EM', 'CHEGOU_EM_APARELHO', 'CHEGOU_LAT', 'CHEGOU_LNG',
    'CHEGOU_PRECISAO', 'CHEGOU_DIST_M', 'INICIO_EM', 'CONCLUIU_EM', 'CONCLUIU_EM_APARELHO', 'CONCLUIU_LAT', 'CONCLUIU_LNG', 'CONCLUIU_PRECISAO', 'OBS_LOCALIZACAO',
    'RESPOSTAS_JSON', 'RELATO', 'CONDICAO_ENCONTRADA', 'CAUSA', 'SERVICO_REALIZADO', 'TESTE_FUNCIONAL', 'RECOMENDACOES', 'SERIE_CONFIRMADA', 'SERIE_CADASTRO',
    'SERIE_DIVERGENTE', 'IDENTIFICADO_POR', 'QTD_FOTOS', 'QTD_PECAS', 'AGUARDANDO_PECA', 'ASSINATURA_ARQUIVO_ID', 'ASSINATURA_NOME', 'ASSINATURA_DOCUMENTO',
    'ASSINATURA_EM', 'SEM_ASSINATURA_MOTIVO', 'SEM_ASSINATURA_RECEBIDO_POR', 'SEM_ASSINATURA_JUSTIFICATIVA', 'FALTAS', 'DOC_TECNICO_TIPO', 'DOC_TECNICO_REF',
    'DOC_TECNICO_URL', 'RELATORIO_VERSAO', 'RELATORIO_PDF_ID', 'RELATORIO_PDF_URL', 'RELATORIO_HTML_ID', 'RELATORIO_EM', 'ENVIADO_CLIENTE_EM',
    // 22/10/2026 (etapa 2): envio ao cliente gravado de verdade (quem, canal, para quem) e a revisão do relatório (Abrir para corrigir)
    'ENVIADO_CLIENTE_POR_NOME', 'ENVIADO_CLIENTE_CANAL', 'ENVIADO_CLIENTE_PARA', 'RELATORIO_REVISAO', 'RESERVA_ID',
    'RESERVA_CODIGO', 'ATIVIDADE_ID', 'SERIE_TRATADA_EM', 'SERIE_TRATADA_POR_NOME', 'SERIE_TRATADA_TEXTO', 'ENCERRADA_EM', 'ENCERRADA_POR_NOME', 'CANCELADA_EM', 'CANCELADA_MOTIVO', 'ULTIMA_SINC_EM', 'ABERTA_EM_CAMPO',
    // 27/10/2026: O.S. de chamado excluído (teste ou simulação) sai junto, pela mesma exclusão (EXCLUSAO_ID); nada é apagado
    'EXCLUSAO_ID', 'EXCLUIDO_EM', 'EXCLUIDO_POR_NOME', 'EXCLUIDO_MOTIVO', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_EVENTOS: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'NUMERO', 'TIPO', 'DE', 'PARA', 'TEXTO', 'PUBLICO', 'USUARIO_ID', 'USUARIO_NOME', 'EM', 'EM_APARELHO', 'ID_LOCAL', 'CRIADO_EM'],
  ATEC_FOTOS: ['ID', 'OS_ID', 'ID_LOCAL', 'PERGUNTA_ID', 'LEGENDA', 'NOME', 'ARQUIVO_ID', 'URL', 'TAMANHO', 'SHA256', 'TIRADA_EM', 'RECEBIDA_EM', 'POR_ID', 'POR_NOME', 'ATIVA', 'CRIADO_EM'],
  ATEC_PECAS: ['ID', 'OS_ID', 'ID_LOCAL', 'DESCRICAO', 'CODIGO', 'QUANTIDADE', 'UNIDADE', 'SITUACAO', 'URGENCIA', 'REQUISICAO_ID', 'REQUISICAO_NUMERO', 'ATIVA', 'REMOVIDA_EM',
    'POR_ID', 'POR_NOME', 'CRIADO_EM'],
  // 22/10/2026 (etapa 1): REF_ID = registro criado por um idLocal do aparelho (cadastro em campo ou O.S. aberta em campo)
  ATEC_SYNC: ['ID', 'ID_LOCAL', 'PEDIDO_ID', 'OS_ID', 'TIPO', 'TECNICO_ID', 'RESULTADO', 'MOTIVO', 'EM_APARELHO', 'RECEBIDO_EM', 'APARELHO', 'REF_ID', 'CRIADO_EM'],
  ATEC_SOLICITACOES: ['ID', 'NUMERO', 'ORIGEM', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'EQUIPAMENTO_TEXTO', 'SOLICITANTE', 'CONTATO', 'DESCRICAO',
    'PARADA', 'EMAIL_REF', 'SITUACAO', 'CHAMADO_ID', 'CHAMADO_NUMERO', 'DESCARTE_MOTIVO', 'POR_ID', 'POR_NOME', 'TRATADA_POR_NOME', 'TRATADA_EM', 'CRIADO_EM'],
  ATEC_CASOS: ['ID', 'NUMERO', 'TIPO', 'CLIENTE_ID', 'CLIENTE_NOME', 'CHAMADO_ID', 'OS_ID', 'DESCRICAO', 'DONO_ID', 'DONO_NOME', 'PRAZO', 'SITUACAO', 'CAUSA', 'ACAO',
    'RESPOSTA_CLIENTE', 'RESOLVIDO_EM', 'POR_ID', 'POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  ATEC_ORCAMENTOS: ['ID', 'NUMERO', 'REVISAO', 'CHAMADO_ID', 'CHAMADO_NUMERO', 'CLIENTE_ID', 'CLIENTE_NOME', 'ITENS_JSON', 'VALOR_TOTAL', 'VALIDADE', 'CONDICOES',
    'SITUACAO', 'PDF_ID', 'PDF_URL', 'HTML_ID', 'EMITIDO_EM', 'EMITIDO_POR_NOME', 'ENVIADO_EM', 'ENVIADO_PARA', 'ACEITE_ARQUIVO_ID', 'ACEITE_URL', 'ACEITE_NOME', 'ACEITE_POR',
    'DECIDIDO_EM', 'DECISAO_TEXTO', 'REQUISICAO_ID', 'COMERCIAL_ATIVIDADE_ID', 'POR_ID', 'POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM', 'ACEITE_CANAL', 'ACEITE_REGISTRO_ID',
    'EXCLUSAO_ID', 'EXCLUIDO_EM', 'EXCLUIDO_POR_NOME', 'EXCLUIDO_MOTIVO'],
  ATEC_ORC_LINKS: ['ID', 'ORCAMENTO_ID', 'ORCAMENTO_NUMERO', 'REVISAO', 'CHAMADO_ID', 'CLIENTE_ID', 'TOKEN_SHA256', 'CONTEUDO_SHA256', 'PEDIDO_ID', 'CANAL', 'ENVIADO_PARA', 'VALIDO_ATE',
    'SITUACAO', 'FIM_EM', 'FIM_MOTIVO', 'VISTO_EM', 'VISTO_ULTIMO_EM', 'VISTAS', 'RESPONDIDO_EM', 'CONTATO_EMAIL', 'POR_ID', 'POR_NOME', 'CRIADO_EM'],
  ATEC_ORC_ACEITES: ['ID', 'ORCAMENTO_ID', 'ORCAMENTO_NUMERO', 'REVISAO', 'CHAMADO_ID', 'CHAMADO_NUMERO', 'CLIENTE_ID', 'LINK_ID', 'CANAL', 'DECISAO', 'NOME', 'CARGO', 'DOCUMENTO', 'EMAIL',
    'TEXTO', 'IP', 'NAVEGADOR', 'USUARIO_ID', 'EM', 'ASSINATURA_ARQUIVO_ID', 'ASSINATURA_SHA256', 'CONTEUDO_SHA256', 'PDF_SHA256', 'VALOR_TOTAL', 'ANTERIOR_SHA256', 'REGISTRO_SHA256', 'CRIADO_EM'],
  ATEC_RELATORIOS: ['ID', 'OS_ID', 'OS_NUMERO', 'VERSAO', 'REVISAO', 'MOTIVO', 'RASCUNHO', 'PDF_ID', 'PDF_URL', 'HTML_ID', 'PASTA_URL', 'MARCA', 'EMITIDO_EM', 'EMITIDO_POR_NOME', 'DOC_REGISTRADO', 'DOCREV_ID', 'CRIADO_EM'],
  ATEC_AVISOS: ['ID', 'DESTINATARIO_ID', 'TIPO', 'TITULO', 'TEXTO', 'REF_ID', 'DATA', 'LIDO_EM', 'CRIADO_EM'],
  ATEC_ACERVO_EQUIP: ['ID', 'AUVO_TASK_ID', 'DATA_TAREFA', 'TIPO_TAREFA', 'TECNICO_NOME', 'FINALIZADA', 'CLIENTE_AUVO_ID', 'CLIENTE_ID_SGO', 'EQUIP_AUVO_ID',
    'EQUIPAMENTO_ID_SGO', 'RESUMO', 'QTD_ARQUIVOS', 'CRIADO_EM']
};
var AST_COLUNAS_TEXTO = {
  ATEC_CHAMADOS: ['NUMERO', 'ABERTO_EM', 'PAUSA_DESDE', 'PRAZO_TRIAGEM_EM', 'PRAZO_ATENDIMENTO_EM', 'TRIAGEM_INICIO_EM', 'TRIAGEM_FIM_EM', 'RETORNO_PREVISTO', 'AGENDADO_PARA',
    'ATENDIDO_EM', 'ENCERRADO_EM', 'CANCELADO_EM', 'ATUALIZADO_EM', 'CONTATO', 'PECA_DISPONIVEL_EM', 'PRAZO_CHEGADA_EM', 'P1_ALERTA_EM', 'ASSUMIDO_EM', 'FILA_LIVRE_EM',
    'EXCLUIDO_EM', 'RESTAURADO_EM'],
  ATEC_OS: ['NUMERO', 'AGENDADO_PARA', 'SAIU_EM', 'CHEGOU_EM', 'CHEGOU_EM_APARELHO', 'INICIO_EM', 'CONCLUIU_EM', 'CONCLUIU_EM_APARELHO', 'ASSINATURA_EM', 'RELATORIO_EM',
    'ENVIADO_CLIENTE_EM', 'ENVIADO_CLIENTE_PARA', 'ENCERRADA_EM', 'CANCELADA_EM', 'ULTIMA_SINC_EM', 'ATUALIZADO_EM', 'SERIE_CONFIRMADA', 'SERIE_CADASTRO', 'EXCLUIDO_EM'],
  ATEC_EVENTOS: ['EM', 'EM_APARELHO'], ATEC_FOTOS: ['TIRADA_EM', 'RECEBIDA_EM'], ATEC_SYNC: ['EM_APARELHO', 'RECEBIDO_EM', 'ID_LOCAL'],
  ATEC_SOLICITACOES: ['TRATADA_EM', 'CONTATO'], ATEC_CASOS: ['PRAZO', 'RESOLVIDO_EM', 'ATUALIZADO_EM'], ATEC_ORCAMENTOS: ['VALIDADE', 'EMITIDO_EM', 'ENVIADO_EM', 'DECIDIDO_EM', 'ATUALIZADO_EM', 'EXCLUIDO_EM'],
  ATEC_RELATORIOS: ['EMITIDO_EM'], ATEC_AVISOS: ['DATA', 'LIDO_EM'], ATEC_CONFIG: ['ATUALIZADO_EM'], ATEC_TIPOS: ['ATUALIZADO_EM'], ATEC_MODELOS: ['ATUALIZADO_EM'],
  ATEC_ACERVO_EQUIP: ['AUVO_TASK_ID', 'DATA_TAREFA'],
  ATEC_ORC_LINKS: ['TOKEN_SHA256', 'CONTEUDO_SHA256', 'VALIDO_ATE', 'FIM_EM', 'VISTO_EM', 'VISTO_ULTIMO_EM', 'RESPONDIDO_EM', 'PEDIDO_ID'],
  ATEC_ORC_ACEITES: ['EM', 'DOCUMENTO', 'IP', 'ASSINATURA_SHA256', 'CONTEUDO_SHA256', 'PDF_SHA256', 'ANTERIOR_SHA256', 'REGISTRO_SHA256']
};

// ------------------------------------------------------------
// SITUAÇÕES DO CHAMADO (as 15 do COMMAND, revisadas) E DA O.S.
// ------------------------------------------------------------
var AST_SITUACOES = {
  ABERTO: 'Aberto', EM_TRIAGEM: 'Em triagem', RESOLVIDO_REMOTO: 'Resolvido remotamente', AGUARDANDO_ORCAMENTO: 'Aguardando orçamento',
  AGUARDANDO_PECA: 'Aguardando peça', PLANEJADO: 'Planejado (falta agendar)', AGENDADO: 'Agendado', EM_DESLOCAMENTO: 'Em deslocamento', NO_LOCAL: 'No local',
  EM_EXECUCAO: 'Em execução', PAUSADO: 'Pausado', AGUARDANDO_CLIENTE: 'Aguardando cliente', DOC_PENDENTE: 'Execução concluída, documentação pendente',
  ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado'
};
/**
 * Transições permitidas (de -> para); qualquer outra é recusada no servidor. Revisão de 21/10/2026 sobre o COMMAND:
 *  - PAUSADO e AGUARDANDO_CLIENTE podem ir para AGUARDANDO_PECA (a falta de peça aparece no meio do serviço);
 *  - EM_EXECUCAO, PAUSADO e AGUARDANDO_CLIENTE podem voltar a PLANEJADO ("precisa voltar outro dia"), com motivo;
 *  - AGUARDANDO_PECA pode voltar a EM_TRIAGEM (a peça não resolve; refazer o diagnóstico);
 *  - ENCERRADO e CANCELADO não saem (reabrir = chamado novo ligado ao anterior, conta como reincidência).
 */
var AST_TRANSICOES = {
  ABERTO: ['EM_TRIAGEM', 'CANCELADO'],
  EM_TRIAGEM: ['RESOLVIDO_REMOTO', 'AGUARDANDO_ORCAMENTO', 'AGUARDANDO_PECA', 'PLANEJADO', 'CANCELADO'],
  RESOLVIDO_REMOTO: ['ENCERRADO', 'EM_TRIAGEM'],
  AGUARDANDO_ORCAMENTO: ['PLANEJADO', 'AGUARDANDO_PECA', 'CANCELADO'],
  AGUARDANDO_PECA: ['PLANEJADO', 'EM_TRIAGEM', 'CANCELADO'],
  PLANEJADO: ['AGENDADO', 'AGUARDANDO_PECA', 'AGUARDANDO_ORCAMENTO', 'CANCELADO'],
  AGENDADO: ['EM_DESLOCAMENTO', 'NO_LOCAL', 'PLANEJADO', 'AGUARDANDO_PECA', 'CANCELADO'],
  EM_DESLOCAMENTO: ['NO_LOCAL', 'PLANEJADO'],
  NO_LOCAL: ['EM_EXECUCAO', 'AGUARDANDO_CLIENTE', 'PLANEJADO', 'DOC_PENDENTE'],
  EM_EXECUCAO: ['PAUSADO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_PECA', 'DOC_PENDENTE', 'PLANEJADO'],
  PAUSADO: ['EM_EXECUCAO', 'AGUARDANDO_PECA', 'PLANEJADO'],
  AGUARDANDO_CLIENTE: ['EM_EXECUCAO', 'AGUARDANDO_PECA', 'PLANEJADO', 'CANCELADO'],
  // 22/10/2026: a O.S. com documentação pendente pode voltar à triagem (o técnico descobriu em campo que precisa de orçamento ou de outro diagnóstico), com motivo
  DOC_PENDENTE: ['ENCERRADO', 'EM_TRIAGEM'],
  ENCERRADO: [],
  CANCELADO: []
};
var AST_TERMINAIS = ['ENCERRADO', 'CANCELADO'];
var AST_EM_CAMPO = ['AGENDADO', 'EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'AGUARDANDO_CLIENTE', 'DOC_PENDENTE'];
/** O que a pessoa do cliente lê (portal), em 5 etapas, sem termos internos. */
var AST_ETAPAS_CLIENTE = [
  { etapa: 1, nome: 'Recebido', situacoes: ['ABERTO'] },
  { etapa: 2, nome: 'Em análise', situacoes: ['EM_TRIAGEM', 'AGUARDANDO_ORCAMENTO', 'AGUARDANDO_PECA', 'AGUARDANDO_CLIENTE'] },
  { etapa: 3, nome: 'Visita agendada', situacoes: ['PLANEJADO', 'AGENDADO', 'EM_DESLOCAMENTO'] },
  { etapa: 4, nome: 'Em atendimento', situacoes: ['NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'DOC_PENDENTE'] },
  { etapa: 5, nome: 'Concluído', situacoes: ['RESOLVIDO_REMOTO', 'ENCERRADO'] }
];
var AST_OS_SITUACOES = {
  AGENDADA: 'Agendada', EM_DESLOCAMENTO: 'Em deslocamento', NO_LOCAL: 'No local', EM_EXECUCAO: 'Em execução', PAUSADA: 'Pausada',
  DOC_PENDENTE: 'Documentação pendente', ENCERRADA: 'Encerrada', CANCELADA: 'Cancelada'
};
var AST_OS_ABERTAS = ['AGENDADA', 'EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADA', 'DOC_PENDENTE'];
var AST_OS_OCUPA_AGENDA = ['AGENDADA', 'EM_DESLOCAMENTO', 'NO_LOCAL', 'EM_EXECUCAO', 'PAUSADA'];

var AST_PRIORIDADES = { P1: 'P1 — Crítica', P2: 'P2 — Alta', P3: 'P3 — Normal', P4: 'P4 — Baixa' };
var AST_PARADA = { TOTAL: 'Parada total', PARCIAL: 'Parada parcial', NAO: 'Sem parada' };
var AST_CANAIS = { INTERNO: 'Tela interna', TELEFONE: 'Telefone', EMAIL: 'E-mail recebido', PORTAL: 'Portal do cliente', QR: 'QR do equipamento',
  COMERCIAL: 'Pedido aprovado do Comercial', PRESENCIAL: 'Presencial', CONTRATO: 'Preventiva do contrato' };
var AST_ACOES_TRIAGEM = { RESOLVIDO_REMOTO: 'Resolvido remotamente', AGUARDANDO_ORCAMENTO: 'Precisa de orçamento', AGUARDANDO_PECA: 'Precisa de peça', PLANEJADO: 'Planejar visita' };
/** Checklist de triagem (reduzido do COMMAND: 9 itens viraram 6). */
var AST_TRIAGEM_ITENS = [
  { k: 'sintomas_confirmados', t: 'Sintomas confirmados com o cliente', obrig: true },
  { k: 'codigos_erro', t: 'Códigos de erro ou mensagens do equipamento', obrig: false },
  { k: 'intervencoes_recentes', t: 'Intervenções recentes (quem mexeu, quando)', obrig: false },
  { k: 'risco_operar', t: 'Risco de continuar usando o equipamento', obrig: true },
  { k: 'diagnostico_preliminar', t: 'Diagnóstico preliminar', obrig: true },
  { k: 'precisa_peca_instrumento', t: 'Peça, instrumento ou ferramenta especial necessária', obrig: false }
];
var AST_PREPARO = [['ferramentas', 'ferramentas separadas'], ['instrumentos', 'instrumentos calibrados e válidos'], ['acesso', 'acesso ao cliente combinado'], ['documentacao', 'documentação em mãos']];
var AST_MOTIVOS_SEM_ASSINATURA = { RESPONSAVEL_AUSENTE: 'Responsável ausente (informar quem recebeu)' };
var AST_TIPOS_PERGUNTA = { TEXTO: 'Texto', NUMERO: 'Número', SIM_NAO: 'Sim ou não', OPCAO: 'Uma opção', MULTIPLA: 'Várias opções', DATA: 'Data', FOTO: 'Foto', ASSINATURA: 'Assinatura' };
var AST_DOCS_TECNICOS = { '': 'Nenhum', CERTCAL: 'Certificado de calibração', RELCAL: 'Relatório de calibração', QUALIFICACAO: 'Relatório de qualificação (autoclave, lavadora, cadeia de frio, estufa)',
  DECLARACAO: 'Declaração de execução de serviço', QIQO: 'Relatório QI/QO/QD', NR13: 'Laudo NR-13' };
var AST_CASO_TIPOS = { RECLAMACAO: 'Reclamação do cliente', PROBLEMA: 'Problema recorrente' };
var AST_CASO_SITUACOES = { ABERTO: 'Aberto', EM_TRATAMENTO: 'Em tratamento', RESOLVIDO: 'Resolvido' };
var AST_ORC_SITUACOES = { RASCUNHO: 'Rascunho', EMITIDO: 'Emitido (aguarda o cliente)', APROVADO: 'Aprovado pelo cliente', RECUSADO: 'Recusado pelo cliente', AJUSTE: 'Cliente pediu ajuste', SUBSTITUIDO: 'Substituído por revisão' };

/**
 * REGRAS PADRÃO (decididas pelo dono em 21/10/2026: "use os padrões, tudo configurável"). Editáveis em Assistência técnica >
 * Regras da assistência (Administrador, Diretoria e Gestor); cada gravação é uma versão nova em ATEC_CONFIG com o motivo.
 * Prazo de atendimento = do chamado aberto até a execução concluída, em horas úteis do expediente da empresa (SGO_Expediente.js).
 */
var AST_REGRAS_PADRAO = {
  versao: 1,
  ligada: true,
  prazos: {
    P1: { atendimentoMin: 4 * 60, triagemMin: 30 },
    P2: { atendimentoMin: 9.5 * 60, triagemMin: 2 * 60 },
    P3: { atendimentoMin: 3 * 9.5 * 60, triagemMin: 4 * 60 },
    P4: { atendimentoMin: 7 * 9.5 * 60, triagemMin: 9.5 * 60 }
  },
  emRiscoFracao: 0.25,
  docPendenteHoras: 24,
  reincidenciaDias: 30,
  pausaPermitidaPadrao: false,
  contratos: [],
  assinatura: { obrigatoria: true },
  localizacao: { distanciaAvisoMetros: 1000 },
  fotos: { maxBytes: 2000000 },
  pecas: { faltaAbreCompras: true },
  agenda: { duracaoPadraoMin: 90 },
  avisos: { whatsappP1Gestor: true, emailCliente: true, whatsappCliente: false },
  relatorioMensal: { ligado: true },
  // 22/10/2026 (etapa 4): validade do link de aceite do orçamento, em dias corridos (1 a 90)
  orcamentoLink: { dias: 30 },
  // 27/10/2026 (decisão do dono, "Alerta + fila livre"): quem faz a triagem (lista vazia = como antes: Caixa de decisões >
  // Regras e responsáveis da área Técnica; sem ninguém lá, o Gestor da área Técnica; sem ele, a Diretoria) e, passados
  // filaLivreMin minutos úteis (expediente) sem ninguém assumir, o chamado fica na fila livre para qualquer colaborador
  triagem: { responsaveis: [], filaLivreLigada: true, filaLivreMin: 30 }
};

/**
 * Os 30 tipos de tarefa do Auvo (títulos de 28/08/2026, exigências pretendidas na tabela daquela data) viram 29 tipos de
 * O.S.: "Entrega" e "Entrega de Equipamentos" eram o mesmo serviço. Grupos: TECNICO (relato, assinatura, 2 fotos, QR ou
 * série), LOGISTICA (relato, assinatura, 1 foto), OUTROS. "Visita técnica" fica no grupo exigente para não virar atalho.
 */
var AST_TIPOS_PADRAO = [
  ['AUTOMACAO', 'Automação', 'TECNICO', 'Instalação ou manutenção de sistema de automação.', 1, 1, 2, 1, 'MOD_TECNICO', '', 0, '176594'],
  ['AVALIACAO_BANCADA', 'Avaliação técnica em bancada', 'TECNICO', 'Equipamento avaliado na oficina, sem o cliente presente (sem assinatura).', 1, 0, 2, 1, 'MOD_TECNICO', '', 0, '202916'],
  ['CALIBRACAO', 'Calibração', 'TECNICO', 'Calibração de equipamento no local do cliente, com certificado.', 1, 1, 2, 1, 'MOD_CALIBRACAO', 'CERTCAL', 0, '164058'],
  ['CALIBRACAO_BALANCA', 'Calibração de balança', 'TECNICO', 'Somente para balança.', 1, 1, 2, 1, 'MOD_CALIBRACAO', 'CERTCAL', 0, '246494'],
  ['CALIBRACAO_ESFIGMO', 'Calibração de esfigmomanômetro', 'TECNICO', 'Somente para esfigmomanômetro ou tensiômetro.', 1, 1, 2, 1, 'MOD_CALIBRACAO', 'CERTCAL', 0, '246495'],
  ['CALIBRACAO_TERMOMETRO', 'Calibração de termômetro ou termo-higrômetro', 'TECNICO', 'Somente para termômetro ou termo-higrômetro.', 1, 1, 2, 1, 'MOD_CALIBRACAO', 'CERTCAL', 0, '246502'],
  ['INSPECAO_TECNICA', 'Inspeção técnica', 'TECNICO', 'Vistoria ou diagnóstico, sem calibrar nem consertar.', 1, 1, 2, 1, 'MOD_TECNICO', '', 0, '208206'],
  ['INSTALACAO', 'Instalação de equipamento', 'TECNICO', 'Instalação de equipamento novo no cliente.', 1, 1, 3, 1, 'MOD_TECNICO', '', 0, '192167'],
  ['MANUTENCAO_CORRETIVA', 'Manutenção corretiva', 'TECNICO', 'Equipamento com defeito: conserto.', 1, 1, 2, 1, 'MOD_CORRETIVA', '', 0, '160907'],
  ['MANUTENCAO_PREVENTIVA', 'Manutenção preventiva', 'TECNICO', 'Manutenção programada, equipamento funcionando.', 1, 1, 2, 1, 'MOD_PREVENTIVA', '', 0, '160866'],
  ['PREVENTIVA_REFRIGERACAO', 'Preventiva de refrigeração', 'TECNICO', 'Manutenção preventiva de equipamento de refrigeração.', 1, 1, 2, 1, 'MOD_PREVENTIVA', '', 0, '248216'],
  ['QUALIFICACAO', 'Qualificação (QI/QO/QD)', 'TECNICO', 'Qualificação de equipamento.', 1, 1, 2, 1, 'MOD_QUALIFICACAO', 'QUALIFICACAO', 0, '163436'],
  ['QUALIFICACAO_CME', 'Qualificação CME', 'TECNICO', 'Qualificação específica da Central de Materiais.', 1, 1, 2, 1, 'MOD_QUALIFICACAO', 'QUALIFICACAO', 0, '236328'],
  ['RELATORIO_TECNICO', 'Relatório técnico avulso', 'TECNICO', 'Relatório técnico fora dos tipos acima.', 1, 1, 2, 1, 'MOD_TECNICO', '', 0, '163139'],
  ['TROCA_LACRE', 'Troca de lacre e selo', 'TECNICO', 'Balança ou esfigmomanômetro.', 1, 1, 2, 1, 'MOD_TECNICO', '', 0, '246497'],
  ['VISITA_TECNICA', 'Visita técnica', 'TECNICO', 'Quando nenhum tipo acima se aplica (mesmas exigências do serviço técnico).', 1, 1, 2, 1, 'MOD_TECNICO', '', 0, '159827'],
  ['ENTRADA_CALIBRACAO', 'Entrada de equipamento para calibração', 'LOGISTICA', 'Recebimento do equipamento do cliente; a calibração acontece depois.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '186586'],
  ['ENTREGA', 'Entrega de equipamento', 'LOGISTICA', 'Entrega ou devolução de equipamento ao cliente.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '215029,163659'],
  ['ENTREGA_DOCUMENTACAO', 'Entrega de documentação', 'LOGISTICA', 'Somente entrega de documento ou certificado impresso.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '166556'],
  ['ENTREGA_INSUMOS', 'Entrega de insumos', 'LOGISTICA', 'Entrega de peça ou consumível.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '162688'],
  ['ENVIO_EQUIPAMENTOS', 'Envio de equipamento', 'LOGISTICA', 'Envio por transportadora ou correio, sem visita (sem assinatura do cliente).', 1, 0, 1, 0, 'MOD_LOGISTICA', '', 1, '169561'],
  ['RETIRADA', 'Retirada de equipamento', 'LOGISTICA', 'Retirada geral no cliente para levar à oficina.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '163046'],
  ['RETIRADA_ANALISE', 'Retirada para análise técnica', 'LOGISTICA', 'Retirada para diagnóstico em bancada.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '202779'],
  ['RETIRADA_PREVENTIVA', 'Retirada para manutenção preventiva', 'LOGISTICA', 'Retirada específica para preventiva.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '164366'],
  ['RETIRADA_QUALIFICACAO', 'Retirada para qualificação', 'LOGISTICA', 'Retirada específica para qualificação.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '163435'],
  ['RETIRADA_SENSORES', 'Retirada dos sensores', 'LOGISTICA', 'Retirada de registrador ou sensor instalado.', 1, 1, 1, 0, 'MOD_LOGISTICA', '', 0, '174802'],
  ['TREINAMENTO', 'Treinamento', 'OUTROS', 'Capacitação ao cliente (sem foto obrigatória).', 1, 1, 0, 0, 'MOD_TREINAMENTO', '', 0, '168339'],
  ['CORRECAO_OS', 'Correção de O.S. (administrativa)', 'OUTROS', 'Ajuste administrativo em O.S. já feita, sem visita nova.', 1, 0, 0, 0, '', '', 1, '237387'],
  ['ENVIO_ORCAMENTO', 'Envio de orçamento', 'OUTROS', 'Envio de orçamento, sem visita.', 0, 0, 0, 0, '', '', 1, '203834']
];

/** Modelos de checklist de partida. Os 13 questionários do Auvo entram ao lado, pela importação do acervo (SGO_Assistencia_Fonte.js). */
var AST_MODELOS_PADRAO = [
  { codigo: 'MOD_TECNICO', nome: 'Atendimento técnico', perguntas: [
    { id: 'identificado', texto: 'Equipamento identificado no local (QR, série ou TAG conferidos)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'condicao', texto: 'Condição encontrada', tipo: 'OPCAO', opcoes: ['Funcionando', 'Funcionando com falha', 'Parado'], obrigatoria: true },
    { id: 'foto_placa', texto: 'Foto da placa de identificação', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'foto_servico', texto: 'Foto do serviço ou do equipamento depois do serviço', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'teste_ok', texto: 'Teste funcional realizado com sucesso?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'liberado', texto: 'Equipamento liberado para uso?', tipo: 'SIM_NAO', obrigatoria: true }
  ] },
  { codigo: 'MOD_CORRETIVA', nome: 'Manutenção corretiva', perguntas: [
    { id: 'identificado', texto: 'Equipamento identificado no local (QR, série ou TAG conferidos)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'defeito', texto: 'Defeito constatado', tipo: 'TEXTO', obrigatoria: true },
    { id: 'foto_defeito', texto: 'Foto do defeito ou da peça com problema', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'foto_servico', texto: 'Foto depois do conserto', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'teste_ok', texto: 'Teste funcional realizado com sucesso?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'liberado', texto: 'Equipamento liberado para uso?', tipo: 'SIM_NAO', obrigatoria: true }
  ] },
  { codigo: 'MOD_PREVENTIVA', nome: 'Manutenção preventiva', perguntas: [
    { id: 'identificado', texto: 'Equipamento identificado no local (QR, série ou TAG conferidos)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'limpeza', texto: 'Limpeza realizada', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'inspecao', texto: 'Inspeção visual (cabos, conexões, vedações, carcaça)', tipo: 'OPCAO', opcoes: ['Conforme', 'Não conforme', 'Não se aplica'], obrigatoria: true },
    { id: 'ajustes', texto: 'Ajustes ou trocas feitos', tipo: 'TEXTO', obrigatoria: false },
    { id: 'foto_antes', texto: 'Foto antes da preventiva', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'foto_depois', texto: 'Foto depois da preventiva', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'teste_ok', texto: 'Teste funcional realizado com sucesso?', tipo: 'SIM_NAO', obrigatoria: true }
  ] },
  { codigo: 'MOD_CALIBRACAO', nome: 'Calibração no cliente', perguntas: [
    { id: 'identificado', texto: 'Equipamento identificado no local (QR, série ou TAG conferidos)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'padroes', texto: 'Padrões usados conferidos e dentro da validade?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'ambiente', texto: 'Condições ambientais (temperatura e umidade)', tipo: 'TEXTO', obrigatoria: false },
    { id: 'foto_equip', texto: 'Foto do equipamento calibrado', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'etiqueta', texto: 'Etiqueta de calibração afixada?', tipo: 'SIM_NAO', obrigatoria: true }
  ] },
  { codigo: 'MOD_QUALIFICACAO', nome: 'Qualificação', perguntas: [
    { id: 'identificado', texto: 'Equipamento identificado no local (QR, série ou TAG conferidos)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'sensores', texto: 'Quantidade de sensores instalados', tipo: 'NUMERO', obrigatoria: true },
    { id: 'foto_instalacao', texto: 'Foto da instalação dos sensores', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 },
    { id: 'foto_carga', texto: 'Foto da carga ou do ciclo', tipo: 'FOTO', obrigatoria: false },
    { id: 'ciclos', texto: 'Ciclos executados', tipo: 'TEXTO', obrigatoria: true }
  ] },
  { codigo: 'MOD_LOGISTICA', nome: 'Retirada, entrega ou envio', perguntas: [
    { id: 'conferido', texto: 'Equipamento, documento ou material conferido (quantidade e identificação)?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'estado', texto: 'Estado na retirada ou entrega', tipo: 'OPCAO', opcoes: ['Bom', 'Com avaria', 'Não se aplica'], obrigatoria: true },
    { id: 'acessorios', texto: 'Acessórios que acompanham', tipo: 'TEXTO', obrigatoria: false },
    { id: 'foto', texto: 'Foto do que foi retirado, entregue ou enviado', tipo: 'FOTO', obrigatoria: true, fotosMin: 1 }
  ] },
  { codigo: 'MOD_TREINAMENTO', nome: 'Treinamento', perguntas: [
    { id: 'conteudo', texto: 'Conteúdo do treinamento', tipo: 'TEXTO', obrigatoria: true },
    { id: 'participantes', texto: 'Número de participantes', tipo: 'NUMERO', obrigatoria: true },
    { id: 'lista', texto: 'Lista de presença assinada?', tipo: 'SIM_NAO', obrigatoria: true },
    { id: 'foto', texto: 'Foto da lista de presença ou do treinamento', tipo: 'FOTO', obrigatoria: false }
  ] }
];

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Ast_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Ast_up_(v) { return Ast_s_(v).toUpperCase(); }
function Ast_2_(n) { return (n < 10 ? '0' : '') + n; }
function Ast_json_(t, padrao) { if (t && typeof t === 'object') return t; try { var v = JSON.parse(Ast_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Ast_copia_(o) { return JSON.parse(JSON.stringify(o)); }
function Ast_texto_(v, max) { var s = Ast_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }
function Ast_sim_(v) { return v === true || Ast_up_(v) === 'SIM' || Ast_up_(v) === 'TRUE' || v === 1 || Ast_s_(v) === '1'; }
function Ast_plural_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }
function Ast_semAcento_(v) { return Ast_s_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function Ast_esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/** "aaaa-mm-ddThh:mm:ss" no horário de Brasília (agora ou ms). */
function Ast_agora_(ms) { return Utilities.formatDate(ms === undefined ? new Date() : new Date(ms), AST_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function Ast_hoje_() { return Ast_agora_().slice(0, 10); }
/** Data de qualquer formato (banco, aparelho, tela) -> ms; null se não der. Sem fuso = horário de Brasília. */
function Ast_ms_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v.getTime();
  var s = Ast_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (m) {
    if (m[7]) { var t = new Date(s.replace(' ', 'T')).getTime(); return isFinite(t) ? t : null; }
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - AST_OFFSET_MIN * 60000;
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) - AST_OFFSET_MIN * 60000;
  return null;
}
function Ast_iso_(v) { var ms = Ast_ms_(v); return ms === null ? '' : Ast_agora_(ms); }
function Ast_dia_(v) { return Ast_iso_(v).slice(0, 10); }
function Ast_br_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(Ast_iso_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : ''; }
function Ast_brDia_(v) { return Ast_br_(v).slice(0, 10); }
function Ast_hora_(v) { return Ast_br_(v).slice(11, 16); }
function Ast_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Ast_s_(dia));
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Ast_2_(t.getUTCMonth() + 1) + '-' + Ast_2_(t.getUTCDate());
}
function Ast_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = Ast_s_(v).replace(/R\$|\s/g, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}
function Ast_fmtNum_(n, casas) { return typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(n) || 0, casas === undefined ? 0 : casas) : String(n).replace('.', ','); }
function Ast_moeda_(v) { return 'R$ ' + Ast_fmtNum_(Math.round((Number(v) || 0) * 100) / 100, 2); }
function Ast_marca_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  } catch (e) { var h1 = 5381, s = String(texto || ''); for (var i = 0; i < s.length; i++) h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) | 0; return (h1 >>> 0).toString(16); }
}
/** Distância em metros entre dois pontos (fórmula de haversine). */
function Ast_distM_(lat1, lng1, lat2, lng2) {
  var r = 6371000, rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * r * Math.asin(Math.min(1, Math.sqrt(a))));
}

// ------------------------------------------------------------
// TEMPO ÚTIL (expediente da empresa: SGO_Expediente.js; padrão 08:00 a 17:30, segunda a sexta, feriados nacionais)
// ------------------------------------------------------------
function Ast_expediente_() {
  try { if (typeof SGO_expediente_ === 'function') return SGO_expediente_(); } catch (e) {}
  return { ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], extras: [] };
}
function Ast_diaUtil_(dia, cfg) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m) return false;
  var semana = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  if (typeof SGO_expedienteMotivoDia_ === 'function') { try { return !SGO_expedienteMotivoDia_(dia, semana, cfg); } catch (e) {} }
  return (cfg.dias || [1, 2, 3, 4, 5]).indexOf(semana) >= 0;
}
function Ast_minDe_(hhmm) { var m = /^(\d{2}):(\d{2})/.exec(Ast_s_(hhmm)); return m ? +m[1] * 60 + +m[2] : null; }
/** ms do início do dia (00:00 de Brasília). */
function Ast_msDia_(dia) { return Ast_ms_(dia + 'T00:00:00'); }

/** inicio (ms) + minutos úteis -> ms. Fora do expediente, conta a partir da próxima abertura. */
function Ast_somarMinUteis_(inicioMs, minutos) {
  var cfg = Ast_expediente_(), ini = Ast_minDe_(cfg.ini) || 480, fim = Ast_minDe_(cfg.fim) || 1050;
  var falta = Math.max(0, Number(minutos) || 0), dia = Ast_agora_(inicioMs).slice(0, 10);
  var minAgora = Math.floor((inicioMs - Ast_msDia_(dia)) / 60000);
  for (var i = 0; i < 800; i++) {
    if (Ast_diaUtil_(dia, cfg)) {
      var de = Math.max(ini, minAgora), cabe = Math.max(0, fim - de);
      if (falta <= cabe && de < fim) return Ast_msDia_(dia) + (de + falta) * 60000;
      if (de < fim) falta -= cabe;
    }
    dia = Ast_somarDias_(dia, 1); minAgora = 0;
  }
  return inicioMs + falta * 60000;
}
/** Minutos úteis entre dois instantes (b > a). */
function Ast_minUteisEntre_(aMs, bMs) {
  if (aMs === null || bMs === null || bMs <= aMs) return 0;
  var cfg = Ast_expediente_(), ini = Ast_minDe_(cfg.ini) || 480, fim = Ast_minDe_(cfg.fim) || 1050;
  var total = 0, dia = Ast_agora_(aMs).slice(0, 10), diaFim = Ast_agora_(bMs).slice(0, 10);
  for (var i = 0; i < 800 && dia <= diaFim; i++) {
    if (Ast_diaUtil_(dia, cfg)) {
      var base = Ast_msDia_(dia), de = Math.max(base + ini * 60000, aMs), ate = Math.min(base + fim * 60000, bMs);
      if (ate > de) total += (ate - de) / 60000;
    }
    dia = Ast_somarDias_(dia, 1);
  }
  return Math.round(total);
}
function Ast_duracaoTxt_(min) {
  min = Math.round(Number(min) || 0);
  if (min < 60) return min + ' min';
  var h = Math.floor(min / 60), r = min % 60;
  return h + ' h' + (r ? ' ' + r + ' min' : '');
}

// ------------------------------------------------------------
// TABELAS (memória da chamada: cada aba é lida uma vez por chamada; gravar limpa a cópia)
// ------------------------------------------------------------
var AST_MEMO = {};
function Ast_memoLimpar_() { AST_MEMO = {}; }
function Ast_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('ATEC_ABAS_OK_V5')) return; } catch (e) {}
  Object.keys(AST_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, AST_COLUNAS[aba]);
    AST_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (AST_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('ATEC_ABAS_OK_V5', '1', 21600); } catch (e) {}
}
/**
 * 27/10/2026: chamado de teste ou simulação excluído pela gestão (EXCLUIDO_EM preenchido) e as O.S. e orçamentos que saíram
 * junto não aparecem em lista, contador, pendência, indicador, agenda, aplicativo, portal nem na fonte única de atendimentos:
 * todo leitor da Assistência passa por Ast_ler_. Só a lista de excluídos, a restauração e a numeração leem tudo (Ast_lerTudo_).
 */
var AST_ABAS_COM_EXCLUSAO = ['ATEC_CHAMADOS', 'ATEC_OS', 'ATEC_ORCAMENTOS'];
function Ast_excluido_(r) { return !!(r && Ast_s_(r.EXCLUIDO_EM)); }
function Ast_lerCru_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada|não encontrad/i.test(String((e && e.message) || e))) return []; throw e; }
}
function Ast_lerTudo_(aba) {
  var k = '__tudo_' + aba;
  if (!AST_MEMO[k]) AST_MEMO[k] = Ast_lerCru_(aba);
  return AST_MEMO[k];
}
function Ast_ler_(aba) {
  if (AST_MEMO[aba]) return AST_MEMO[aba];
  // leitura nova sempre que a cópia da aba foi descartada (quem grava direto apaga AST_MEMO[aba]); a cópia "tudo" acompanha
  var l = Ast_lerCru_(aba);
  if (AST_ABAS_COM_EXCLUSAO.indexOf(aba) >= 0) { AST_MEMO['__tudo_' + aba] = l; l = l.filter(function (r) { return !Ast_excluido_(r); }); }
  AST_MEMO[aba] = l;
  return l;
}
function Ast_memoTirar_(aba) { delete AST_MEMO[aba]; delete AST_MEMO['__tudo_' + aba]; delete AST_MEMO['__mapa_' + aba]; }
function Ast_porId_(aba, id) {
  id = Ast_s_(id);
  if (!id) return null;
  var l = Ast_ler_(aba);
  for (var i = 0; i < l.length; i++) if (Ast_s_(l[i].ID) === id) return l[i];
  return null;
}
function Ast_inserir_(aba, d) {
  var r = SGO_DATA.insert(aba, Object.assign({ CRIADO_EM: Ast_agora_() }, d));
  Ast_memoTirar_(aba);
  if (aba === AST_ABAS.OS && typeof SGO_Atendimentos_invalidar_ === 'function') SGO_Atendimentos_invalidar_();
  return r;
}
function Ast_atualizar_(aba, id, d) {
  var r = SGO_DATA.update(aba, id, d);
  Ast_memoTirar_(aba);
  if (aba === AST_ABAS.OS && typeof SGO_Atendimentos_invalidar_ === 'function') SGO_Atendimentos_invalidar_();
  return r;
}
/**
 * Trava única da Assistência. Reentrante (chamada dentro de outra roda direto) porque a trava do servidor próprio não é:
 * pegar de novo dentro da mesma chamada esperaria por si mesma. O que chama outro módulo que tem trava própria
 * (Minhas atividades, Compras, Frota) vai por Ast_depois_: roda depois que a trava é solta, e só se deu tudo certo.
 */
var AST_TRAVA = { n: 0, depois: [] };
function Ast_comTrava_(fn) {
  if (AST_TRAVA.n > 0) return fn();
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  AST_TRAVA.n++;
  var r, ok = false;
  try { r = fn(); ok = true; } finally {
    AST_TRAVA.n--;
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e2) {} }
    if (typeof SGO_Atendimentos_invalidar_ === 'function') SGO_Atendimentos_invalidar_();
    var fila = AST_TRAVA.depois; AST_TRAVA.depois = [];
    if (ok) fila.forEach(function (f) { try { f(); } catch (e3) { console.error('Assistência (depois da trava): ' + ((e3 && e3.message) || e3)); } });
  }
  return r;
}
/** Roda fn agora (sem trava) ou logo depois de soltar a trava da Assistência. */
function Ast_depois_(fn) { if (AST_TRAVA.n > 0) AST_TRAVA.depois.push(fn); else { try { fn(); } catch (e) { console.error('Assistência: ' + ((e && e.message) || e)); } } }

/** Evento no histórico (chamado ou O.S.). extra: { de, para, publico, emAparelho, idLocal, numero }. Nunca lança. */
function Ast_evento_(entidade, id, tipo, eu, texto, extra) {
  var e = extra || {};
  try {
    Ast_inserir_(AST_ABAS.EVENTOS, { ENTIDADE: entidade, ENTIDADE_ID: Ast_s_(id), NUMERO: Ast_s_(e.numero), TIPO: tipo, DE: Ast_texto_(e.de, 300), PARA: Ast_texto_(e.para, 300),
      TEXTO: Ast_texto_(texto, 4000), PUBLICO: e.publico ? 'SIM' : '', USUARIO_ID: Ast_s_(eu && eu.id), USUARIO_NOME: Ast_s_(eu && eu.nome), EM: Ast_agora_(),
      EM_APARELHO: Ast_iso_(e.emAparelho), ID_LOCAL: Ast_s_(e.idLocal) });
  } catch (x) { console.error('Assistência, histórico: ' + ((x && x.message) || x)); }
}

/** Próximo número anual (CH-2026-0001, OS-2026-0001, RC-, OA-, SOL-). Conferido contra o maior gravado. Chamar dentro da trava. */
function Ast_proximoNumero_(sigla, aba) {
  var ano = Ast_hoje_().slice(0, 4), prefixo = sigla + '-' + ano + '-';
  var chave = 'ATEC_SEQ_' + sigla + '_' + ano, props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty(chave)) || 0;
  var re = new RegExp('^' + sigla + '-' + ano + '-(\\d+)$');
  Ast_lerTudo_(aba).forEach(function (r) { var m = re.exec(Ast_s_(r.NUMERO)); if (m && Number(m[1]) > seq) seq = Number(m[1]); }); // excluídos também: número nunca se repete
  seq++;
  props.setProperty(chave, String(seq));
  var n = String(seq);
  while (n.length < 4) n = '0' + n;
  return prefixo + n;
}

// ------------------------------------------------------------
// REGRAS DA ASSISTÊNCIA (configuração editável e versionada)
// ------------------------------------------------------------
var AST_REGRAS_MEMO = null;
function Ast_regras_() {
  if (AST_REGRAS_MEMO && Date.now() - AST_REGRAS_MEMO.em < 20000) return AST_REGRAS_MEMO.r;
  var r = Ast_copia_(AST_REGRAS_PADRAO), g = null;
  try {
    var linhas = Ast_ler_(AST_ABAS.CONFIG).filter(function (x) { return Ast_s_(x.CHAVE) === 'REGRAS'; });
    linhas.sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
    if (linhas.length) {
      var ult = linhas[linhas.length - 1];
      g = Ast_json_(ult.VALOR_JSON, null);
      r.versao = Number(ult.VERSAO) || r.versao; r.atualizadaEm = Ast_br_(ult.ATUALIZADO_EM); r.atualizadaPor = Ast_s_(ult.ATUALIZADO_POR_NOME);
    }
  } catch (e) { g = null; }
  if (g && typeof g === 'object') {
    Object.keys(g).forEach(function (k) {
      if (k === 'versao' || !(k in AST_REGRAS_PADRAO)) return;
      var v = g[k], p = AST_REGRAS_PADRAO[k];
      if (p && typeof p === 'object' && !Array.isArray(p) && v && typeof v === 'object' && !Array.isArray(v)) {
        Object.keys(v).forEach(function (kk) {
          if (p[kk] && typeof p[kk] === 'object' && v[kk] && typeof v[kk] === 'object') Object.keys(v[kk]).forEach(function (k3) { r[k][kk][k3] = v[kk][k3]; });
          else r[k][kk] = v[kk];
        });
      } else if (v !== undefined && v !== null) r[k] = v;
    });
  }
  AST_REGRAS_MEMO = { em: Date.now(), r: r };
  return r;
}
function Ast_regrasInvalidar_() { AST_REGRAS_MEMO = null; delete AST_MEMO[AST_ABAS.CONFIG]; }
function Ast_ligada_() { try { return Ast_regras_().ligada !== false; } catch (e) { return true; } }

function Ast_validarRegras_(r) {
  if (!r || typeof r !== 'object') throw new Error('as regras vieram vazias. Atualize a tela e salve de novo');
  Object.keys(AST_PRIORIDADES).forEach(function (p) {
    var x = (r.prazos || {})[p] || {};
    var a = Ast_num_(x.atendimentoMin), t = Ast_num_(x.triagemMin);
    if (!(a >= 30 && a <= 60 * 24 * 60)) throw new Error('o prazo de atendimento da ' + p + ' precisa estar entre 30 minutos e 60 dias úteis. Corrija e salve de novo');
    if (!(t >= 5 && t <= a)) throw new Error('o prazo de triagem da ' + p + ' precisa ser de 5 minutos até o prazo de atendimento. Corrija e salve de novo');
  });
  if (r.prazos.P1.atendimentoMin > r.prazos.P2.atendimentoMin || r.prazos.P2.atendimentoMin > r.prazos.P3.atendimentoMin || r.prazos.P3.atendimentoMin > r.prazos.P4.atendimentoMin) {
    throw new Error('os prazos de atendimento precisam crescer de P1 (crítica) para P4 (baixa). Corrija e salve de novo');
  }
  var dl = Ast_num_((r.orcamentoLink || {}).dias);
  if (!(dl >= 1 && dl <= 90)) throw new Error('a validade do link de aceite do orçamento precisa ser de 1 a 90 dias (padrão 30). Corrija e salve de novo');
  var f = Ast_num_(r.emRiscoFracao);
  if (!(f > 0 && f < 1)) throw new Error('"em risco" precisa ser uma fração entre 0 e 1 (padrão 0,25 = resta um quarto do prazo). Corrija e salve de novo');
  var fl = Ast_num_((r.triagem || {}).filaLivreMin);
  if (!(fl >= 5 && fl <= 480)) throw new Error('o tempo até a fila livre da triagem precisa ser de 5 a 480 minutos úteis (padrão 30). Corrija e salve de novo');
  (r.contratos || []).forEach(function (c, i) {
    if (!Ast_s_(c.clienteId)) throw new Error('o contrato da linha ' + (i + 1) + ' está sem cliente. Escolha o cliente ou tire a linha e salve de novo');
    Object.keys(c.prazos || {}).forEach(function (p) {
      var a = Ast_num_((c.prazos[p] || {}).atendimentoMin), ch = (c.prazos[p] || {}).chegadaMin;
      if (!(a >= 30)) throw new Error('o contrato da linha ' + (i + 1) + ' tem prazo inválido na ' + p + '. Use pelo menos 30 minutos ou deixe em branco para valer o padrão');
      // 22/10/2026: prazo de chegada ao local (o que o hospital mais cobra), opcional, nunca maior que o de atendimento
      if (ch !== undefined && ch !== null && ch !== '' && !(Ast_num_(ch) >= 15 && Ast_num_(ch) <= a)) throw new Error('o contrato da linha ' + (i + 1) + ' tem prazo de chegada inválido na ' + p + ': use de 15 minutos até o prazo de atendimento, ou deixe em branco');
    });
  });
}
function Ast_gravarRegras_(r, eu, motivo) {
  var limpa = {};
  Object.keys(AST_REGRAS_PADRAO).forEach(function (k) { if (k !== 'versao' && r[k] !== undefined) limpa[k] = r[k]; });
  var atual = Ast_regras_();
  Object.keys(AST_REGRAS_PADRAO).forEach(function (k) { if (k !== 'versao' && limpa[k] === undefined) limpa[k] = atual[k]; });
  Object.keys(AST_PRIORIDADES).forEach(function (p) {
    limpa.prazos[p] = { atendimentoMin: Math.round(Ast_num_(limpa.prazos[p].atendimentoMin)), triagemMin: Math.round(Ast_num_(limpa.prazos[p].triagemMin)) };
  });
  limpa.emRiscoFracao = Ast_num_(limpa.emRiscoFracao);
  limpa.contratos = (limpa.contratos || []).map(function (c) {
    var pz = {};
    Object.keys(c.prazos || {}).forEach(function (p) {
      var a = Math.round(Ast_num_((c.prazos[p] || {}).atendimentoMin)), ch = Math.round(Ast_num_((c.prazos[p] || {}).chegadaMin));
      if (AST_PRIORIDADES[p] && a > 0) { pz[p] = { atendimentoMin: a }; if (ch > 0) pz[p].chegadaMin = ch; }
    });
    return { clienteId: Ast_s_(c.clienteId), clienteNome: Ast_s_(c.clienteNome), prazos: pz, pausaPermitida: !!c.pausaPermitida, observacao: Ast_texto_(c.observacao, 300) };
  });
  limpa.ligada = limpa.ligada !== false;
  // 27/10/2026: responsáveis pela triagem só da equipe interna ativa (cliente e conta do sistema fora); sem repetição
  var tr = limpa.triagem || {}, usT = Ast_usuarios_(), vistosT = {};
  limpa.triagem = {
    responsaveis: (Array.isArray(tr.responsaveis) ? tr.responsaveis : []).map(Ast_s_).filter(function (id) {
      var u = usT[id];
      if (!u || vistosT[id]) return false;
      if (!u.ativo || u.cliente || Ast_ehContaSistema_(u)) throw new Error((u.nome || 'Uma pessoa') + ' não pode ficar com a triagem: ' + (!u.ativo ? 'o usuário está inativo' : u.cliente ? 'é login de cliente' : 'é conta do sistema') + '. Tire da lista e salve de novo');
      vistosT[id] = true; return true;
    }),
    filaLivreLigada: tr.filaLivreLigada !== false,
    filaLivreMin: Math.round(Ast_num_(tr.filaLivreMin))
  };
  Ast_validarRegras_(limpa);
  var versao = (Number(atual.versao) || 1) + 1;
  Ast_inserir_(AST_ABAS.CONFIG, { CHAVE: 'REGRAS', VALOR_JSON: JSON.stringify(limpa), VERSAO: versao, MOTIVO: Ast_texto_(motivo, 500),
    ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  Ast_regrasInvalidar_();
  Ast_evento_('REGRAS', 'REGRAS', 'VERSAO', eu, Ast_texto_(motivo, 500), { para: 'versão ' + versao });
  return versao;
}

/** Valor de uma chave simples de configuração (TRANSICAO, ACERVO_INDICE...) — a última linha vale. */
function Ast_cfgChave_(chave, padrao) {
  var l = Ast_ler_(AST_ABAS.CONFIG).filter(function (x) { return Ast_s_(x.CHAVE) === chave; });
  if (!l.length) return padrao;
  l.sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0) || String(a.ATUALIZADO_EM).localeCompare(String(b.ATUALIZADO_EM)); });
  return Ast_json_(l[l.length - 1].VALOR_JSON, padrao);
}
function Ast_cfgGravar_(chave, valor, eu, motivo) {
  var l = Ast_ler_(AST_ABAS.CONFIG).filter(function (x) { return Ast_s_(x.CHAVE) === chave; });
  var v = l.reduce(function (m, x) { return Math.max(m, Number(x.VERSAO) || 0); }, 0) + 1;
  Ast_inserir_(AST_ABAS.CONFIG, { CHAVE: chave, VALOR_JSON: JSON.stringify(valor), VERSAO: v, MOTIVO: Ast_texto_(motivo, 500),
    ATUALIZADO_POR_ID: Ast_s_(eu && eu.id), ATUALIZADO_POR_NOME: Ast_s_(eu && eu.nome), ATUALIZADO_EM: Ast_agora_() });
  return v;
}

// ------------------------------------------------------------
// TIPOS DE O.S. E MODELOS DE CHECKLIST
// ------------------------------------------------------------
/** Grava os tipos e modelos de partida quando ainda não existem (só acrescenta; nunca muda o que a Qualidade editou). */
function Ast_garantirSemente_() {
  var tipos = Ast_ler_(AST_ABAS.TIPOS), modelos = Ast_ler_(AST_ABAS.MODELOS), agora = Ast_agora_();
  var temTipo = {}, temModelo = {};
  tipos.forEach(function (t) { temTipo[Ast_up_(t.CODIGO)] = true; });
  modelos.forEach(function (m) { temModelo[Ast_up_(m.CODIGO)] = true; });
  var novosM = AST_MODELOS_PADRAO.filter(function (m) { return !temModelo[m.codigo]; }).map(function (m) {
    return { ID: 'mod_' + m.codigo.toLowerCase(), CODIGO: m.codigo, NOME: m.nome, VERSAO: 1, PERGUNTAS_JSON: JSON.stringify(m.perguntas), ORIGEM: 'PADRAO', AUVO_QUESTIONARIO_ID: '', ATIVO: 'SIM', ATUALIZADO_EM: agora, CRIADO_EM: agora };
  });
  var novosT = AST_TIPOS_PADRAO.filter(function (t) { return !temTipo[t[0]]; }).map(function (t, i) {
    return { ID: 'tipo_' + t[0].toLowerCase(), CODIGO: t[0], NOME: t[1], GRUPO: t[2], DESCRICAO: t[3], EXIGE_RELATO: t[4] ? 'SIM' : '', EXIGE_ASSINATURA: t[5] ? 'SIM' : '', FOTOS_MIN: t[6],
      EXIGE_QR_SERIE: t[7] ? 'SIM' : '', EXIGE_CHECKLIST: t[8] ? 'SIM' : '', MODELO_CODIGO: t[8], DOCUMENTO_TECNICO: t[9], SEM_VISITA: t[10] ? 'SIM' : '', AUVO_TIPOS: t[11],
      ORDEM: AST_TIPOS_PADRAO.indexOf(t) + 1, ATIVO: 'SIM', ATUALIZADO_EM: agora, CRIADO_EM: agora };
  });
  if (novosM.length) { SGO_DATA.insertMany(AST_ABAS.MODELOS, novosM); delete AST_MEMO[AST_ABAS.MODELOS]; }
  if (novosT.length) { SGO_DATA.insertMany(AST_ABAS.TIPOS, novosT); delete AST_MEMO[AST_ABAS.TIPOS]; }
  return { tipos: novosT.length, modelos: novosM.length };
}
function Ast_tipoPublico_(t) {
  return { id: Ast_s_(t.ID), codigo: Ast_up_(t.CODIGO), nome: Ast_s_(t.NOME), grupo: Ast_up_(t.GRUPO), descricao: Ast_s_(t.DESCRICAO),
    exige: { relato: Ast_sim_(t.EXIGE_RELATO), assinatura: Ast_sim_(t.EXIGE_ASSINATURA), fotosMin: Number(t.FOTOS_MIN) || 0, qrOuSerie: Ast_sim_(t.EXIGE_QR_SERIE), checklist: !!Ast_s_(t.MODELO_CODIGO) },
    modeloCodigo: Ast_up_(t.MODELO_CODIGO), documentoTecnico: Ast_up_(t.DOCUMENTO_TECNICO), semVisita: Ast_sim_(t.SEM_VISITA), auvoTipos: Ast_s_(t.AUVO_TIPOS), ativo: Ast_up_(t.ATIVO || 'SIM') === 'SIM',
    ordem: Number(t.ORDEM) || 99 };
}
function Ast_tipos_(todos) {
  return Ast_ler_(AST_ABAS.TIPOS).map(Ast_tipoPublico_).filter(function (t) { return todos || t.ativo; }).sort(function (a, b) { return a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'); });
}
function Ast_tipo_(codigo) {
  codigo = Ast_up_(codigo);
  var t = Ast_ler_(AST_ABAS.TIPOS).filter(function (x) { return Ast_up_(x.CODIGO) === codigo; })[0];
  return t ? Ast_tipoPublico_(t) : null;
}
/** Perguntas normalizadas de um modelo (ids únicos, tipo válido). */
function Ast_normPerguntas_(lista) {
  var vistos = {};
  return (Array.isArray(lista) ? lista : []).map(function (p, i) {
    var id = Ast_s_(p.id).replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) || ('p' + (i + 1));
    while (vistos[id]) id = id + '_' + (i + 1);
    vistos[id] = true;
    var tipo = AST_TIPOS_PERGUNTA[Ast_up_(p.tipo)] ? Ast_up_(p.tipo) : 'TEXTO';
    var o = { id: id, texto: Ast_texto_(p.texto, 300), tipo: tipo, obrigatoria: !!p.obrigatoria };
    if (tipo === 'OPCAO' || tipo === 'MULTIPLA') o.opcoes = (p.opcoes || []).map(function (x) { return Ast_texto_(x, 120); }).filter(Boolean).slice(0, 30);
    if (tipo === 'FOTO') o.fotosMin = Math.max(o.obrigatoria ? 1 : 0, Math.min(10, Number(p.fotosMin) || (o.obrigatoria ? 1 : 0)));
    return o;
  }).filter(function (p) { return p.texto; });
}
function Ast_modeloPublico_(m) {
  return { id: Ast_s_(m.ID), codigo: Ast_up_(m.CODIGO), nome: Ast_s_(m.NOME), versao: Number(m.VERSAO) || 1, perguntas: Ast_normPerguntas_(Ast_json_(m.PERGUNTAS_JSON, [])),
    origem: Ast_up_(m.ORIGEM), auvoQuestionarioId: Ast_s_(m.AUVO_QUESTIONARIO_ID), ativo: Ast_up_(m.ATIVO || 'SIM') === 'SIM' };
}
function Ast_modelos_(todos) { return Ast_ler_(AST_ABAS.MODELOS).map(Ast_modeloPublico_).filter(function (m) { return todos || m.ativo; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }); }
function Ast_modelo_(codigo) {
  codigo = Ast_up_(codigo);
  if (!codigo) return null;
  var m = Ast_ler_(AST_ABAS.MODELOS).filter(function (x) { return Ast_up_(x.CODIGO) === codigo; })[0];
  return m ? Ast_modeloPublico_(m) : null;
}

// ------------------------------------------------------------
// QUEM É QUEM NA ASSISTÊNCIA
// ------------------------------------------------------------
function Ast_usuarios_() {
  if (AST_MEMO.__usuarios) return AST_MEMO.__usuarios;
  var mapa = {};
  Ast_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Ast_up_(u.PERFIL);
    if (!perfil || perfil === 'AUVO_SYNC') return;
    mapa[Ast_s_(u.ID)] = { id: Ast_s_(u.ID), nome: Ast_s_(u.NOME) || Ast_s_(u.USUARIO), login: Ast_s_(u.USUARIO), perfil: perfil, area: Ast_up_(u.AREA),
      email: Ast_s_(u.EMAIL).toLowerCase(), ativo: Ast_up_(u.STATUS || 'ATIVO') === 'ATIVO', clienteId: Ast_s_(u.CLIENTE_ID), cliente: perfil === 'CLIENTE' };
  });
  AST_MEMO.__usuarios = mapa;
  return mapa;
}
function Ast_ehContaSistema_(u) { try { return typeof Areas_contaDoSistema_ === 'function' ? Areas_contaDoSistema_({ USUARIO: u.login, NOME: u.nome }) : Ast_s_(u.login).toLowerCase() === 'admin'; } catch (e) { return false; } }
function Ast_ehDono_(login) { try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(login); } catch (e) { return false; } }

/** Técnicos: usuários ativos com perfil Técnico ou da área Técnica (contas do sistema e clientes fora). */
function Ast_tecnicos_(us) {
  us = us || Ast_usuarios_();
  return Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) {
    return u.ativo && !u.cliente && !Ast_ehContaSistema_(u) && (u.perfil === 'TECNICO' || u.area === 'TECNICA');
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}
/** Gestão da área Técnica (Caixa de decisões > Regras e responsáveis; senão Gestor da área Técnica; senão a Diretoria). */
function Ast_gestoresTecnica_(us) {
  us = us || Ast_usuarios_();
  var ids = [];
  try { ids = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {}).TECNICA || []; } catch (e) { ids = []; }
  ids = ids.map(Ast_s_).filter(function (id) { return us[id] && us[id].ativo; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === 'TECNICA'; });
  return ids;
}
function Ast_diretoria_(us) {
  us = us || Ast_usuarios_();
  if (typeof Ges_diretoria_ === 'function' && typeof Ges_usuarios_ === 'function') { try { var d = Ges_diretoria_(Ges_usuarios_(), []); if (d.length) return d; } catch (e) {} }
  var ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && (u.perfil === 'DIRETORIA' || Ast_ehDono_(u.login)); });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.perfil === 'ADMIN' && !Ast_ehContaSistema_(u); });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'ADMIN'; });
  return ids;
}
/**
 * Quem faz a triagem. 27/10/2026: primeiro a lista das Regras da assistência (Triagem e fila livre), configurável pela
 * gestão; vazia (ou só gente inativa), vale o de antes: os responsáveis da área Técnica na Caixa de decisões (é assim que a
 * Bruna recebe hoje), senão o Gestor da área Técnica, senão a Diretoria.
 */
function Ast_triagemPara_(us) {
  us = us || Ast_usuarios_();
  var cfg = [];
  try { cfg = ((Ast_regras_().triagem || {}).responsaveis || []).map(Ast_s_).filter(function (id) { return us[id] && us[id].ativo && !us[id].cliente; }); } catch (e) { cfg = []; }
  if (cfg.length) return { id: cfg[0], nome: us[cfg[0]].nome, ids: cfg, nomes: cfg.map(function (id) { return us[id].nome; }), motivo: 'responsáveis pela triagem nas Regras da assistência', configurado: true };
  var g = Ast_gestoresTecnica_(us);
  if (g.length) return { id: g[0], nome: us[g[0]].nome, ids: g, motivo: 'gestor da área Técnica' };
  var d = Ast_diretoria_(us);
  if (d.length) return { id: d[0], nome: us[d[0]].nome, ids: d, motivo: 'sem gestor da área Técnica: Diretoria' };
  return { id: '', nome: '', ids: [], motivo: 'ninguém cadastrado para a triagem' };
}

/**
 * Nível na Assistência. GESTAO: Administrador, Diretoria, dono do sistema, Gestor da área Técnica e responsáveis da
 * área Técnica na Caixa de decisões (triagem, agenda, tudo). TECNICO: perfil Técnico ou área Técnica (as O.S. dele).
 * INTERNO: demais colaboradores (abrem e acompanham chamados). CLIENTE: só o portal do próprio cliente.
 */
function Ast_nivelDe_(u) {
  var perfil = Ast_up_(u && u.perfil), area = Ast_up_(u && u.area), id = Ast_s_(u && u.id);
  var base = { nivel: 'NENHUM', gestao: false, tecnico: false, interno: false, cliente: false, regras: false, valores: false, admin: false, diretoria: false, comercial: false };
  if (!perfil || perfil === 'AUVO_SYNC') return base;
  if (perfil === 'CLIENTE') return Object.assign(base, { nivel: 'CLIENTE', cliente: true });
  var diretoria = perfil === 'DIRETORIA' || Ast_ehDono_(u && u.login), admin = perfil === 'ADMIN';
  var respTecnica = false;
  try { respTecnica = ((((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {}).TECNICA) || []).map(Ast_s_).indexOf(id) >= 0; } catch (e) { respTecnica = false; }
  var gestao = admin || diretoria || (perfil === 'GESTOR' && area === 'TECNICA') || respTecnica;
  var tecnico = perfil === 'TECNICO' || area === 'TECNICA';
  var comercial = perfil === 'COMERCIAL' || area === 'COMERCIAL';
  var financeiro = perfil === 'FINANCEIRO' || area === 'FINANCEIRO';
  return Object.assign(base, {
    nivel: gestao ? 'GESTAO' : tecnico ? 'TECNICO' : 'INTERNO', gestao: gestao, tecnico: tecnico, interno: true, admin: admin, diretoria: diretoria, comercial: comercial,
    gestor: perfil === 'GESTOR' || gestao,
    // Regras da assistência: Administrador, Diretoria e Gestor (pedido do dono, 21/10/2026)
    regras: admin || diretoria || perfil === 'GESTOR',
    // 27/10/2026 (decisão do dono): excluir chamado de teste ou simulação, ver os excluídos e restaurar: só Gestor, Diretoria e Administrador
    excluir: admin || diretoria || perfil === 'GESTOR',
    // valores do orçamento: gestão, Comercial, Financeiro e Diretoria (o técnico não vê valor)
    valores: gestao || comercial || financeiro || perfil === 'GESTOR'
  });
}
function Ast_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); } catch (e) { u = null; }
  var eu = { id: Ast_s_(s.userId), nome: Ast_s_(s.nome) || Ast_s_(s.usuario), login: Ast_s_(s.usuario), perfil: Ast_up_(s.perfil), area: Ast_up_(u && u.AREA),
    email: Ast_s_(u && u.EMAIL).toLowerCase(), clienteId: Ast_s_(s.clienteId) || Ast_s_(u && u.CLIENTE_ID), sessionId: sessionId };
  var n = Ast_nivelDe_(eu);
  Object.keys(n).forEach(function (k) { eu[k] = n[k]; });
  return eu;
}
/** Trava de acesso com a mensagem completa (o quê, por quê, o que fazer). */
function Ast_exigir_(eu, nivel, acao) {
  var ok = nivel === 'GESTAO' ? eu.gestao : nivel === 'INTERNO' ? eu.interno : nivel === 'REGRAS' ? eu.regras : nivel === 'VALORES' ? eu.valores :
    nivel === 'ADMIN' ? eu.perfil === 'ADMIN' : nivel === 'CLIENTE' ? eu.cliente : nivel === 'EXCLUIR' ? !!eu.excluir : false;
  if (ok) return eu;
  var porque = {
    EXCLUIR: 'excluir chamado de teste ou simulação, ver os excluídos e restaurar é só do Gestor, da Diretoria e do Administrador. Se o chamado foi aberto como teste ou por engano, peça a um deles (o motivo fica registrado); se é um atendimento real que não vai acontecer, o caminho é cancelar',
    GESTAO: 'esta ação é da gestão da área Técnica (gestor da área Técnica, Diretoria ou Administrador). Se você coordena a equipe de campo, peça ao Administrador para colocar você como responsável da área Técnica em Caixa de decisões > Regras e responsáveis',
    INTERNO: 'a Assistência técnica é da equipe interna da Metrolabs. Clientes acompanham os chamados em "Meus chamados"',
    REGRAS: 'as Regras da assistência (prazos, contratos, tipos de O.S. e checklists) são alteradas pelo Administrador, pela Diretoria e pelos gestores',
    VALORES: 'valores de orçamento ficam com a gestão, o Comercial, o Financeiro e a Diretoria',
    ADMIN: 'só o Administrador marca o desligamento do Auvo, depois de cumpridos os seis critérios do projeto',
    CLIENTE: 'esta tela é do portal do cliente'
  }[nivel] || 'você não tem acesso a esta parte da Assistência técnica';
  throw new Error('Não foi possível ' + acao + ': ' + porque);
}

// ------------------------------------------------------------
// CADASTROS (cliente, unidade, equipamento: fonte única do SGO+)
// ------------------------------------------------------------
function Ast_mapa_(aba) {
  var k = '__mapa_' + aba;
  if (AST_MEMO[k]) return AST_MEMO[k];
  var m = {};
  Ast_ler_(aba).forEach(function (r) { m[Ast_s_(r.ID)] = r; });
  AST_MEMO[k] = m;
  return m;
}
function Ast_clienteNome_(c) { return c ? (Ast_s_(c.NOME_FANTASIA) || Ast_s_(c.RAZAO_SOCIAL)) : ''; }
function Ast_equipTexto_(e) {
  if (!e) return '';
  return [Ast_s_(e.TIPO), Ast_s_(e.MODELO), Ast_s_(e.TAG) ? 'TAG ' + Ast_s_(e.TAG) : '', Ast_s_(e.SERIE) ? 'série ' + Ast_s_(e.SERIE) : '', Ast_s_(e.SETOR)].filter(Boolean).join(' · ');
}
function Ast_endereco_(un, cli) {
  if (un && (Ast_s_(un.ENDERECO) || Ast_s_(un.CIDADE))) return [Ast_s_(un.ENDERECO), [Ast_s_(un.CIDADE), Ast_s_(un.UF)].filter(Boolean).join('/')].filter(Boolean).join(', ');
  return cli ? Ast_s_(cli.ENDERECO) : '';
}
function Ast_linkMapa_(endereco) { return endereco ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(endereco) : ''; }

// ------------------------------------------------------------
// PRAZOS (SLA): padrão por prioridade, contrato do cliente prevalece
// ------------------------------------------------------------
function Ast_slaPara_(clienteId, prioridade, regras) {
  regras = regras || Ast_regras_();
  var p = AST_PRIORIDADES[Ast_up_(prioridade)] ? Ast_up_(prioridade) : 'P3';
  var base = regras.prazos[p] || AST_REGRAS_PADRAO.prazos[p];
  var c = (regras.contratos || []).filter(function (x) { return Ast_s_(x.clienteId) === Ast_s_(clienteId); })[0];
  if (c && c.prazos && c.prazos[p] && Number(c.prazos[p].atendimentoMin) > 0) {
    var at = Number(c.prazos[p].atendimentoMin), ch = Number(c.prazos[p].chegadaMin) || 0;
    return { atendimentoMin: at, triagemMin: Math.min(Number(base.triagemMin) || 30, at), chegadaMin: ch > 0 ? ch : 0, fonte: 'CONTRATO', pausaPermitida: !!c.pausaPermitida, observacao: Ast_s_(c.observacao) };
  }
  return { atendimentoMin: Number(base.atendimentoMin), triagemMin: Number(base.triagemMin), chegadaMin: 0, fonte: 'PADRAO', pausaPermitida: !!regras.pausaPermitidaPadrao, observacao: '' };
}
/**
 * 22/10/2026: prazo de chegada ao local, só quando o contrato do cliente o define (CHEGADA_MIN_UTEIS > 0).
 * { estado: EM_DIA | EM_RISCO | ESTOURADO | CUMPRIDO | FORA_DO_PRAZO | SEM_PRAZO, ate, texto }. chegouEm: a chegada da O.S.
 */
function Ast_chegadaEstado_(c, chegouEm, agoraMs) {
  var total = Number(c.CHEGADA_MIN_UTEIS) || 0, aberto = Ast_ms_(c.ABERTO_EM);
  if (!total || aberto === null) return { estado: 'SEM_PRAZO', ate: '', texto: '' };
  agoraMs = agoraMs || Date.now();
  var ateMs = Ast_ms_(c.PRAZO_CHEGADA_EM) !== null ? Ast_ms_(c.PRAZO_CHEGADA_EM) : Ast_somarMinUteis_(aberto, total), ate = Ast_agora_(ateMs);
  var chegou = Ast_ms_(chegouEm);
  if (['CANCELADO', 'RESOLVIDO_REMOTO'].indexOf(Ast_up_(c.SITUACAO)) >= 0 || (Ast_up_(c.SITUACAO) === 'ENCERRADO' && chegou === null)) return { estado: 'SEM_PRAZO', ate: ate, texto: '' };
  if (chegou !== null) return chegou <= ateMs ? { estado: 'CUMPRIDO', ate: ate, texto: 'Chegada no prazo do contrato (' + Ast_br_(Ast_agora_(chegou)) + ')' } : { estado: 'FORA_DO_PRAZO', ate: ate, texto: 'Chegada fora do prazo do contrato (' + Ast_duracaoTxt_(Ast_minUteisEntre_(ateMs, chegou)) + ' úteis depois de ' + Ast_br_(ate) + ')' };
  if (agoraMs > ateMs) return { estado: 'ESTOURADO', ate: ate, texto: 'Chegada ao local atrasada: o contrato pedia até ' + Ast_br_(ate) };
  var resta = Ast_minUteisEntre_(agoraMs, ateMs);
  if (resta <= total * 0.25) return { estado: 'EM_RISCO', ate: ate, texto: 'Chegada ao local em risco: resta ' + Ast_duracaoTxt_(resta) + ' úteis (contrato: até ' + Ast_br_(ate) + ')' };
  return { estado: 'EM_DIA', ate: ate, texto: 'Chegada ao local até ' + Ast_br_(ate) + ' (contrato)' };
}
/** Identidade do sistema para as rotinas e os ganchos de outros módulos (sem sessão de usuário). */
function Ast_sistema_(nome) { return { id: '', nome: nome || 'Rotina da Assistência', perfil: 'SISTEMA', gestao: true, interno: true, tecnico: false, cliente: false, sistema: true }; }
/**
 * Estado do prazo de um chamado agora: { estado: EM_DIA | EM_RISCO | ESTOURADO | CUMPRIDO | FORA_DO_PRAZO | PAUSADO | SEM_PRAZO, ate, restaMin, texto }.
 * Atendimento = execução concluída (ATENDIDO_EM) ou resolvido remotamente. A pausa (aguardando cliente ou peça) só conta se o contrato permitir.
 */
function Ast_slaEstado_(c, agoraMs, regras) {
  regras = regras || Ast_regras_();
  agoraMs = agoraMs || Date.now();
  var aberto = Ast_ms_(c.ABERTO_EM), total = Number(c.SLA_MIN_UTEIS) || 0;
  if (aberto === null || !total) return { estado: 'SEM_PRAZO', ate: '', texto: 'Sem prazo' };
  var pausa = Number(c.PAUSA_MIN) || 0;
  var desde = Ast_ms_(c.PAUSA_DESDE);
  if (desde !== null && Ast_sim_(c.PAUSA_PERMITIDA)) pausa += Ast_minUteisEntre_(desde, agoraMs);
  var ateMs = Ast_somarMinUteis_(aberto, total + pausa), ate = Ast_agora_(ateMs);
  var feito = Ast_ms_(c.ATENDIDO_EM);
  var sit = Ast_up_(c.SITUACAO);
  if (sit === 'CANCELADO') return { estado: 'CANCELADO', ate: ate, texto: 'Cancelado' };
  if (feito !== null) return feito <= ateMs ? { estado: 'CUMPRIDO', ate: ate, texto: 'Prazo cumprido' } : { estado: 'FORA_DO_PRAZO', ate: ate, texto: 'Atendido fora do prazo (' + Ast_duracaoTxt_(Ast_minUteisEntre_(ateMs, feito)) + ' úteis depois)' };
  if (desde !== null && Ast_sim_(c.PAUSA_PERMITIDA)) return { estado: 'PAUSADO', ate: ate, texto: 'Prazo pausado (' + (AST_SITUACOES[sit] || sit).toLowerCase() + ')' };
  if (agoraMs > ateMs) return { estado: 'ESTOURADO', ate: ate, restaMin: -Ast_minUteisEntre_(ateMs, agoraMs), texto: 'Prazo estourado em ' + Ast_br_(ate) };
  var resta = Ast_minUteisEntre_(agoraMs, ateMs);
  if (resta <= total * (Number(regras.emRiscoFracao) || 0.25)) return { estado: 'EM_RISCO', ate: ate, restaMin: resta, texto: 'Em risco: resta ' + Ast_duracaoTxt_(resta) + ' úteis (até ' + Ast_br_(ate) + ')' };
  return { estado: 'EM_DIA', ate: ate, restaMin: resta, texto: 'Em dia: até ' + Ast_br_(ate) };
}

// ------------------------------------------------------------
// AVISOS (sistema na hora; e-mail e WhatsApp pela matriz de avisos, SGO_Pendencias_Assistencia.js registra os eventos)
// ------------------------------------------------------------
/** Aviso na tela (Início, até ler na Assistência) e, se evento vier, pelo notificador (a matriz decide e-mail/WhatsApp). */
function Ast_avisar_(destIds, tipo, titulo, texto, refId, opcoes) {
  var o = opcoes || {};
  var ids = (Array.isArray(destIds) ? destIds : [destIds]).map(Ast_s_).filter(function (id, i, l) { return id && l.indexOf(id) === i && id !== Ast_s_(o.autorId); });
  if (!ids.length) return 0;
  ids.forEach(function (id) {
    try { Ast_inserir_(AST_ABAS.AVISOS, { DESTINATARIO_ID: id, TIPO: tipo, TITULO: Ast_texto_(titulo, 200), TEXTO: Ast_texto_(texto, 2000), REF_ID: Ast_s_(refId), DATA: Ast_agora_(), LIDO_EM: '' }); }
    catch (e) { console.error('Assistência, aviso: ' + ((e && e.message) || e)); }
  });
  if (o.evento && typeof SGO_notificar_ === 'function') {
    Ast_depois_(function () {
      if (typeof Assistencia_registrarTipos_ === 'function') Assistencia_registrarTipos_();
      SGO_notificar_({ usuarios: ids, canais: o.canais || ['email', 'whatsapp'], titulo: titulo, texto: texto, origem: 'ASSISTENCIA', categoria: 'ASSISTENCIA', evento: o.evento, refId: Ast_s_(refId) });
    });
  }
  return ids.length;
}
/** Aviso ao contato do cliente (e-mail; WhatsApp só se a matriz e a regra deixarem). Nunca lança. */
function Ast_avisarCliente_(c, titulo, texto, evento) {
  try {
    var regras = Ast_regras_();
    if (!regras.avisos.emailCliente || typeof SGO_notificar_ !== 'function') return { ok: 0, pulado: 1, motivo: 'avisos ao cliente desligados nas Regras da assistência' };
    var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(c.CLIENTE_ID)] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(c.UNIDADE_ID)] || {};
    var email = Ast_s_(un.EMAIL) || Ast_s_(cli.EMAIL);
    if (!email) return { ok: 0, pulado: 1, motivo: 'cliente sem e-mail no cadastro (unidade ou cliente)' };
    if (typeof Assistencia_registrarTipos_ === 'function') Assistencia_registrarTipos_();
    return SGO_notificar_({ contatos: [{ id: 'CLI_' + Ast_s_(c.CLIENTE_ID), nome: Ast_s_(un.RESPONSAVEL) || Ast_clienteNome_(cli), email: email, telefone: regras.avisos.whatsappCliente ? Ast_s_(un.TELEFONE) : '', cadastro: 'cliente' }],
      canais: regras.avisos.whatsappCliente ? ['email', 'whatsapp'] : ['email'], titulo: titulo, texto: texto, origem: 'ASSISTENCIA', categoria: 'ASSISTENCIA', evento: evento || 'AT08', refId: Ast_s_(c.ID), semLink: true }) || {};
  } catch (e) { return { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// MINHAS ATIVIDADES (atendimento agendado vira atividade do técnico; orçamento vira atividade do Comercial)
// ------------------------------------------------------------
function Ast_comoSistema_(fn) {
  var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null;
  var token = 'ASSISTENCIA-' + Utilities.getUuid();
  ATV_PONTE_CTX = { token: token, eu: { id: 'ASSISTENCIA', usuario: 'sistema', nome: 'Assistência técnica (rotina)', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  try { return fn(token); } finally { ATV_PONTE_CTX = anterior; }
}
/**
 * o: { responsavelId, titulo, descricao, prazo, prioridade, clienteId, unidadeId, porQue, onde, como }. aoCriar(id) recebe o ID.
 * Dentro da trava, cria logo depois de soltar (Minhas atividades tem trava própria). Nunca lança.
 */
function Ast_criarAtividade_(o, aoCriar) {
  if (AST_TRAVA.n > 0) { Ast_depois_(function () { var id = Ast_criarAtividade_(o); if (aoCriar && id) aoCriar(id); }); return ''; }
  try {
    if (typeof Atividades_apiCriar !== 'function') return '';
    if (typeof Atividades_garantirAbas_ === 'function') Atividades_garantirAbas_();
    var r = Ast_comoSistema_(function (t) {
      return Atividades_apiCriar(t, { titulo: Ast_texto_(o.titulo, 200), descricao: Ast_texto_(o.descricao, 4000), prazo: o.prazo, prioridade: o.prioridade || 'Normal', responsavelId: o.responsavelId,
        modulo: 'assistencia', moduloNome: 'Assistência técnica', osId: o.osId || '', clienteId: o.clienteId || '', unidadeId: o.unidadeId || '', porQue: o.porQue || '', onde: o.onde || '', como: o.como || '' });
    });
    return r && r.ok && r.item ? Ast_s_(r.item.ID) : '';
  } catch (e) { console.error('Assistência, atividade: ' + ((e && e.message) || e)); return ''; }
}
function Ast_mudarAtividade_(id, situacao, texto) {
  if (!id || typeof Atividades_apiMudarSituacao !== 'function') return false;
  if (AST_TRAVA.n > 0) { Ast_depois_(function () { Ast_mudarAtividade_(id, situacao, texto); }); return true; }
  try {
    var a = typeof Atividades_abas_ === 'function' ? SGO_DATA.getById(Atividades_abas_().ATIVIDADES, id) : null;
    if (!a || a.SITUACAO === 'Concluída' || a.SITUACAO === 'Cancelada') return false;
    var r = Ast_comoSistema_(function (t) { return Atividades_apiMudarSituacao(t, { id: id, situacao: situacao, observacao: Ast_texto_(texto, 1500), motivo: Ast_texto_(texto, 1500) || 'Encerrada pela Assistência técnica.' }); });
    return !!(r && r.ok);
  } catch (e) { return false; }
}
function Ast_editarAtividade_(id, campos) {
  if (!id || typeof Atividades_apiEditar !== 'function') return false;
  if (AST_TRAVA.n > 0) { Ast_depois_(function () { Ast_editarAtividade_(id, campos); }); return true; }
  try { var r = Ast_comoSistema_(function (t) { return Atividades_apiEditar(t, Object.assign({ id: id }, campos)); }); return !!(r && r.ok); } catch (e) { return false; }
}

// ------------------------------------------------------------
// ARQUIVOS (fotos e assinaturas: pasta privada; relatório: pasta do equipamento no prontuário)
// ------------------------------------------------------------
var AST_PASTA_PRIVADA = 'Assistência técnica - Fotos e assinaturas';
var AST_PASTA_DOCS = 'Assistência técnica - Relatórios';
function Ast_pastaPrivadaOS_(numeroOs) {
  var raiz = SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_PRIVADA_ID', AST_PASTA_PRIVADA, '');
  var ano = Ast_hoje_().slice(0, 4);
  var anoP = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(raiz, ano) : raiz;
  return numeroOs && typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(anoP, numeroOs) : anoP;
}
function Ast_subpasta_(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}
/**
 * Pasta "4. Ordens de Serviço" do equipamento no prontuário (mesma árvore do QR: pasta de documentos > cliente > unidade >
 * TAG - tipo). Sem a pasta de documentos configurada, a pasta do cliente dentro de "Assistência técnica - Relatórios".
 */
function Ast_pastaRelatorio_(os) {
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(os.UNIDADE_ID)] || {};
  var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || null;
  var rootId = '';
  try { rootId = (SGO_CFG.DRIVE && SGO_CFG.DRIVE.FOLDER_DOCUMENTOS) || PropertiesService.getScriptProperties().getProperty('FOLDER_DOCUMENTOS') || ''; } catch (e) { rootId = ''; }
  if (rootId && eq) {
    try {
      var root = DriveApp.getFolderById(rootId);
      var pc = Ast_subpasta_(root, Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli) || 'Cliente Indefinido');
      var pu = Ast_subpasta_(pc, Ast_s_(un.NOME_UNIDADE) || 'Unidade Indefinida');
      var pe = Ast_subpasta_(pu, (Ast_s_(eq.TAG) || 'SEM TAG') + ' - ' + (Ast_s_(eq.TIPO) || 'SEM TIPO'));
      return Ast_subpasta_(pe, '4. Ordens de Serviço');
    } catch (e2) { /* segue para a pasta própria */ }
  }
  var raiz = SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_DOCS_ID', AST_PASTA_DOCS, '');
  return SGO_DocSalvar_pastaClienteEm_(raiz, cli.CNPJ, Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli) || 'Sem cliente');
}
function Ast_privado_(arquivo) {
  try { if (DriveApp.Access && DriveApp.Access.PRIVATE && arquivo.setSharing) arquivo.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
}
