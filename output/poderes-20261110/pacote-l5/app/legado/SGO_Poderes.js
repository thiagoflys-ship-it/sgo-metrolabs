/****************************************************
 * ACESSOS POR CAIXAS — LOTE 0 (10/11/2026, pedido do dono)
 *
 * Cada "poder" (caixa) é uma permissão com nome para o dono: o que a pessoa pode ver ou fazer no SGO+. O catálogo
 * (150 poderes) e o desenho estão em output/poderes-20261110/CATALOGO_PODERES.md e catalogo.json.
 *
 * O QUE O LOTE 0 FAZ (nenhuma trava existente muda de comportamento):
 *   - Catálogo dos 150 poderes, cada um com padrao(eu, c): a regra de hoje, lida pelas MESMAS funções-base do
 *     legado (isAdminPerfilAuth_, SGO_ehGestaoRotina_, Com_nivelDe_, Cmp_nivelDe_, Ast_nivelDe_, Ges_cfg_, listas
 *     de configuração...). Sem nenhuma exceção gravada, SGO_pode_ responde exatamente o que o sistema faz hoje.
 *   - Exceções por pessoa (aba SYS_PODERES_EXCECOES) e o histórico de cada mudança (aba SYS_PODERES_LOG, nunca apagado).
 *   - SGO_pode_ / SGO_podeExigir_ / SGO_poderesEfetivos_ para os próximos lotes.
 *   - Tela Administração > Acessos (JS_Acessos.html) pela função Poderes_api.
 *   - ligado = false no lote 0: nenhuma trava do sistema consultava as caixas. Cada lote que trocar uma trava
 *     acrescenta o código em SGO_PODERES_LIGADOS; até lá a caixa grava, mas não tem efeito (a tela avisa).
 *     Lote 1 (11/11/2026): Contas, senhas e acessos ligado (ver SGO_PODERES_LIGADOS e SGO_poderRecusa_).
 *
 * PROTEÇÕES FIXAS (não dependem de caixa):
 *   - Dono do sistema (SGO_DONOS, SGO_Chaves.js): sempre tudo; ninguém tira poder dele.
 *   - Contas de fora (Cliente, Representada, conta técnica do Auvo): nenhuma caixa vale (usam só o próprio portal).
 *   - Só o dono, ou quem tiver ACESSOS_GERIR (padrão: só o dono), grava exceções; ninguém altera as próprias caixas.
 *   - Toda mudança pede motivo (5 caracteres ou mais) e fica no histórico com antes, depois, quem e quando.
 ****************************************************/

/**
 * Códigos cujas travas no sistema já consultam SGO_pode_. Os próximos lotes acrescentam aqui.
 * Lote 1 (11/11/2026, Contas, senhas e acessos): as travas de SGO_Usuarios.js, SGO_Areas.js, SGO_SegurancaAcesso.js e
 * SGO_ModoPersonalizado.js perguntam a caixa. Ficam de fora SISTEMA_SEGREDOS_SERVIDOR e SISTEMA_PAINEL_SERVIDOR: as
 * travas delas estão no servidor Node (src/servicos/segredos.ts e estado.ts), que este lote não recompila.
 */
var SGO_PODERES_LIGADOS = ['CONTAS_VER', 'CONTAS_CRIAR', 'CONTAS_ALTERAR_OUTROS', 'CONTAS_MUDAR_PERFIL', 'CONTAS_REDEFINIR_SENHA', 'CONTAS_INATIVAR',
  'CONTAS_EXCLUIR', 'CONTAS_GERIR_ADMINISTRADOR', 'CONTAS_DAR_DIRETORIA', 'AREAS_GERIR', 'AREAS_DEFINIR_PESSOA', 'SEGURANCA_VER_REGISTRO',
  'SEGURANCA_ALTERAR', 'MODO_PERSONALIZADO_DESIGNAR', 'ACESSOS_GERIR',
  // Lote 4 (11/11/2026, aprovação de relatório técnico): SGO_QE_podeCaixa_ / SGO_QE_msgRecusa_ (SGO_QualifEmissao.js) nas travas de
  // Autoclave, Lavadora, Cadeia de frio, Estufa/Banho-maria/Secadora e Baixa temperatura. RELATORIO_INTERNO_SIMULADO fica de fora (ver LOTE4_IMPLEMENTACAO.md).
  'RELATORIO_TECNICO_APROVAR', 'RELATORIO_BAIXATEMP_APROVAR', 'RELATORIO_MODELO_ESCOLHER',
  // Lote 5 (11/11/2026, Compras): Cmp_aplicarCaixas_ / Cmp_cx_ / Cmp_msgCaixa_ (SGO_Compras_Config.js), Cmp_exigir_ e CmpC_podeAprovar_ (faixa -> caixa).
  'COMPRAS_PEDIR', 'COMPRAS_VER_FILA', 'COMPRAS_VER_VALORES', 'COMPRAS_COMPRAR', 'COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA',
  'COMPRAS_APROVAR_SEM_LIMITE', 'COMPRAS_GESTAO', 'COMPRAS_REGRAS_EDITAR', 'COMPRAS_CIENCIA_GESTAO'];

var PODERES_ABA_EXC = 'SYS_PODERES_EXCECOES';
var PODERES_ABA_LOG = 'SYS_PODERES_LOG';
var PODERES_COLS_EXC = ['ID', 'USUARIO_ID', 'PODER', 'VALOR', 'MOTIVO', 'ALTERADO_POR_ID', 'ALTERADO_POR_NOME', 'ALTERADO_EM'];
var PODERES_COLS_LOG = ['ID', 'QUANDO', 'USUARIO_ID', 'USUARIO_NOME', 'PODER', 'PODER_NOME', 'ACAO', 'ANTES_EXCECAO', 'DEPOIS_EXCECAO',
  'ANTES_EFETIVO', 'DEPOIS_EFETIVO', 'MOTIVO', 'POR_ID', 'POR_NOME', 'LOTE'];
var PODERES_ESTRUTURA_CACHE = 'PODERES_ESTRUTURA_OK_V1';
var PODERES_FUSO = 'America/Sao_Paulo';
var PODERES_MEMO_MS = 3000;          // memória por requisição (no servidor cada chamada já começa com o contexto limpo)
var PODERES_MOTIVO_MIN = 5;
var PODERES_PERFIS_FORA = ['CLIENTE', 'REPRESENTADA', 'AUVO_SYNC', ''];
var PODERES_ROTULO_ORIGEM = { dono: 'Responsável pelo sistema', excecao: 'Alterado para esta pessoa', padrao: 'Padrão do perfil', fixo: 'Conta de fora da equipe' };
var PODERES_ROTULO_CATEGORIA = { ver: 'Ver', operar: 'Operar', aprovar: 'Aprovar', excluir: 'Excluir', administrar: 'Administrar', valores: 'Valores', sigiloso: 'Sigiloso' };
var PODERES_SETORES_FILA = ['TECNICA', 'METROLOGIA', 'COMERCIAL', 'LOGISTICA', 'ADMINISTRATIVO'];   // AstO_setorTipo_ (SGO_Assistencia_OS.js)
var PODERES_RELATORIO_INTERNO = { id: 'b36756b2-d5e1-474d-9ae3-f5e5826a6c13', login: 'bento' };     // bentoAutorizado nos *_ConteudoModulo.js

// ------------------------------------------------------------
// CATÁLOGO (gerado de output/poderes-20261110/catalogo.json por ferramentas-catalogo/gerar-lista-lote0.cjs)
// [codigo, modulo, nome, descricao, categoria, lote]
// ------------------------------------------------------------
var SGO_PODERES_LISTA = [
  ["CONTAS_VER", "Contas e acessos", "Ver a lista de contas", "Abre Administração > Usuários: nomes, e-mails, perfis, áreas e situação das contas.", "ver", 1],
  ["CONTAS_CRIAR", "Contas e acessos", "Criar conta", "Cadastra uma pessoa nova no SGO+ (perfis comuns; Administrador e Diretoria têm caixa própria).", "operar", 1],
  ["CONTAS_ALTERAR_OUTROS", "Contas e acessos", "Alterar dados de outra pessoa", "Muda nome, e-mail, celular e vínculo de trabalho de outra conta. Atenção: o e-mail recebe o link de nova senha.", "operar", 1],
  ["CONTAS_MUDAR_PERFIL", "Contas e acessos", "Mudar o perfil de outra pessoa", "Troca o perfil (ex.: Técnico para Gestor). Hoje é a mesma trava de \"alterar dados\"; ninguém muda o próprio perfil (proteção fixa).", "administrar", 1],
  ["CONTAS_REDEFINIR_SENHA", "Contas e acessos", "Redefinir senha de outra pessoa", "Envia o link de nova senha ou define senha provisória de outra conta.", "administrar", 1],
  ["CONTAS_INATIVAR", "Contas e acessos", "Inativar e reativar conta", "Tira ou devolve o acesso de uma pessoa, guardando o histórico.", "excluir", 1],
  ["CONTAS_EXCLUIR", "Contas e acessos", "Excluir conta de vez", "Exclusão lógica definitiva da conta (some da lista e dos seletores).", "excluir", 1],
  ["CONTAS_GERIR_ADMINISTRADOR", "Contas e acessos", "Gerir contas de Administrador", "Criar, alterar, inativar, excluir ou mandar link para conta de perfil Administrador, ou dar esse perfil.", "administrar", 1],
  ["CONTAS_DAR_DIRETORIA", "Contas e acessos", "Dar ou alterar o perfil Diretoria", "Promover alguém a Diretoria ou mexer numa conta Diretoria (a Diretoria decide casos próprios no Conduta).", "administrar", 1],
  ["AREAS_GERIR", "Contas e acessos", "Cadastrar áreas", "Cria, renomeia, inativa áreas e preenche área vazia pelo perfil.", "administrar", 1],
  ["AREAS_DEFINIR_PESSOA", "Contas e acessos", "Mudar a área de uma pessoa", "Define a área do cadastro. Atenção: a área dá acessos (Qualidade = nomes do Conduta; Comercial = vendas e custos; RH = ponto de todos).", "administrar", 1],
  ["SEGURANCA_VER_REGISTRO", "Contas e acessos", "Ver a Segurança do acesso e o registro de entradas", "Painel de segurança: quem entrou, IP, aparelho, horários, troca de senha pendente.", "sigiloso", 1],
  ["SEGURANCA_ALTERAR", "Contas e acessos", "Alterar a Segurança do acesso", "Liga o código no celular, exige troca de senha de todos ou de uma pessoa, zera o segundo fator, cadastra o modelo do WhatsApp.", "administrar", 1],
  ["SISTEMA_SEGREDOS_SERVIDOR", "Contas e acessos", "Gravar chaves e senhas no servidor (/_sgo/segredos)", "Grava ou apaga chaves da IA, Omie, Auvo, e-mail do sistema, Z-API e Meta na tela do servidor.", "administrar", 1],
  ["SISTEMA_PAINEL_SERVIDOR", "Contas e acessos", "Ver o painel do servidor (/_sgo/estado)", "Backup, restauração, vigia, fila de e-mails e erros das últimas 24 h.", "ver", 1],
  ["MODO_PERSONALIZADO_DESIGNAR", "Contas e acessos", "Designar responsáveis do modo personalizado", "Escolhe quem ajusta parâmetros dos geradores e aprova documentos personalizados; apaga senha e desbloqueia.", "administrar", 1],
  ["ACESSOS_GERIR", "Contas e acessos", "Gerir os acessos (tela Acessos)", "Marca e desmarca caixas de outras pessoas, aplica modelos e copia acessos. Ninguém altera as próprias caixas.", "administrar", 1],
  ["CONDUTA_PARTICIPAR", "Programa de conduta", "Participar do Programa de conduta", "Registrar ocorrência e evento positivo, ver as próprias, dar ciência, contestar e recorrer do que é seu, lançar missão, biblioteca.", "operar", 2],
  ["CONDUTA_CONSULTAR_EQUIPE", "Programa de conduta", "Consultar o Conduta de toda a equipe", "Ausências, missões, fechamentos (com valores por pessoa) e relatórios gerenciais de todos, sem o nome do envolvido nas ocorrências.", "ver", 2],
  ["CONDUTA_VER_NOMES", "Programa de conduta", "Ver quem é o envolvido (sigilo)", "Nome do envolvido, foto da evidência, extrato de outra pessoa, relatório da equipe, sugestões, planos e indicadores.", "sigiloso", 2],
  ["CONDUTA_DECIDIR", "Programa de conduta", "Decidir ocorrências", "Homologar, julgar, aceitar ou descartar sugestão, análise de causa e plano de ação.", "aprovar", 2],
  ["CONDUTA_DECIDIR_COMO_DIRETORIA", "Programa de conduta", "Decidir como Diretoria (casos próprios e de gestores)", "Decide ocorrência ou missão em que é envolvido (com fundamentação), sugestões vindas da avaliação de gestor; registro nasce homologado.", "aprovar", 2],
  ["CONDUTA_MISSAO_DECIDIR", "Programa de conduta", "Aprovar e remover missões (incentivo em R$)", "Aprova ou recusa missão de viagem (incentivo) e remove missão lançada.", "valores", 2],
  ["CONDUTA_AUSENCIA_GERIR", "Programa de conduta", "Lançar e remover ausências", "Registra e remove ausência de colaborador no programa.", "sigiloso", 2],
  ["CONDUTA_FECHAR_MES", "Programa de conduta", "Fechar o mês do Conduta", "Prévia e fechamento da competência (bônus coletivo).", "aprovar", 2],
  ["CONDUTA_PAINEIS_GESTAO", "Programa de conduta", "Painéis e relatórios da gestão do programa", "Painel de ciência, relatório do programa, relatório semanal e de missões.", "ver", 2],
  ["CONDUTA_CONFIGURAR", "Programa de conduta", "Configurar rotinas do programa", "Rotina de ciência, checagem diária de prazos, relatório semanal automático, destinos de viagem, coleta de sugestões.", "administrar", 2],
  ["FIN_VER_CONTAS", "Financeiro", "Ver contas a pagar, a receber, caixa e extrato (Omie)", "Tela /financeiro do servidor: consultas ao Omie e histórico de conciliações.", "valores", 3],
  ["FIN_CONCILIAR_BANCO", "Financeiro", "Conciliar o extrato bancário (OFX)", "Confirma transação do OFX contra o Omie e grava a conciliação.", "operar", 3],
  ["FIN_CONFERIR_COMPRAS", "Financeiro", "Conferir compras (Financeiro)", "Conferência das compras recebidas e relatório da conciliação.", "aprovar", 3],
  ["FIN_FATURAS_CONCILIAR", "Financeiro", "Conciliar faturas de cartão", "Importa extrato da fatura, concilia e fecha a fatura.", "operar", 3],
  ["FIN_A_PAGAR", "Financeiro", "Ver e baixar o que há a pagar", "Lista de compras a pagar e marcar como pago.", "valores", 3],
  ["FIN_FATURA_REABRIR", "Financeiro", "Reabrir fatura fechada", "Reabre fatura de cartão já fechada.", "administrar", 3],
  ["FIN_CARTOES_VER", "Financeiro", "Ver os cartões da empresa", "Lista de cartões (final, responsável, limites).", "valores", 3],
  ["FIN_CARTOES_EDITAR", "Financeiro", "Cadastrar e alterar cartões", "Cria e altera cartões da empresa.", "administrar", 3],
  ["RELATORIO_TECNICO_APROVAR", "Documentos técnicos", "Aprovar relatório técnico de qualificação", "Responsável técnico: confere, aprova, emite ou devolve relatório de Autoclave, Lavadora, Cadeia de frio e Estufa/Banho-maria.", "aprovar", 4],
  ["RELATORIO_BAIXATEMP_APROVAR", "Documentos técnicos", "Aprovar ensaio de baixa temperatura", "Revisa e aprova o ensaio de esterilizador a baixa temperatura (quem elaborou não aprova: proteção fixa).", "aprovar", 4],
  ["RELATORIO_MODELO_ESCOLHER", "Documentos técnicos", "Escolher o modelo dos relatórios oficiais", "Define o modelo do relatório oficial (Autoclave, Lavadora, Estufa, Cadeia de frio).", "administrar", 4],
  ["RELATORIO_INTERNO_SIMULADO", "Documentos técnicos", "Usar o relatório interno (dados reconstituídos)", "Gera dados simulados de ciclo para o relatório interno. Exige também a senha do simulador (proteção fixa).", "sigiloso", 4],
  ["DOCTEC_GERAR", "Documentos técnicos", "Gerar documentos técnicos", "Abre e gera Autoclave, Lavadora, Cadeia de frio, Estufa, PGT/POP, Planejamento CME, Cronograma, Registros operacionais, Relatório de calibração e Declaração de execução; consulta Calibração, NR-13 e Baixa temperatura.", "operar", 11],
  ["DOCTEC_EMITIR_OFICIAL", "Documentos técnicos", "Emitir certificado, laudo e relatório oficial", "Preenche e emite Certificado de calibração, Laudo NR-13, Baixa temperatura e relatórios oficiais de qualificação; completa cadastro de equipamento pelo ensaio.", "operar", 11],
  ["CALIBRACAO_GESTAO", "Documentos técnicos", "Relatórios de gestão da calibração", "Relatório de renovação e de desempenho; ver o controle de padrões de todos os técnicos.", "ver", 11],
  ["PADROES_ATUALIZAR_ACERVO", "Documentos técnicos", "Atualizar o acervo de padrões pelos certificados", "Atualiza os padrões de referência a partir dos certificados.", "administrar", 11],
  ["LAVCICLO_CONFIRMAR_REFERENCIA", "Documentos técnicos", "Confirmar referência do ciclo da lavadora", "Confirma as referências do relatório do ciclo (.sgolav).", "aprovar", 11],
  ["ALERTAS_PADROES_CONFIGURAR", "Documentos técnicos", "Configurar alertas de vencimento de padrões", "Quem recebe e quando aparecem os lembretes de vencimento dos padrões.", "administrar", 11],
  ["COMPRAS_PEDIR", "Compras", "Pedir compra e informar compra feita", "Abre pedido de compra, informa compra feita, acompanha os próprios pedidos (sem valores).", "operar", 5],
  ["COMPRAS_VER_FILA", "Compras", "Ver a fila e o painel de compras", "Fila de todas as compras, painel e relatórios de compras.", "ver", 5],
  ["COMPRAS_VER_VALORES", "Compras", "Ver valores de compras e fornecedores", "Valores, orçamentos e cadastro de fornecedores.", "valores", 5],
  ["COMPRAS_COMPRAR", "Compras", "Cotar e comprar", "Lança e escolhe orçamento, emite pedido ao fornecedor, registra recebimento, entrega e pagamento, cadastra fornecedor.", "operar", 5],
  ["COMPRAS_APROVAR_ATE_LIMITE", "Compras", "Aprovar compra até o limite do comprador", "Aprova compra da faixa do comprador (hoje até R$ 1.000,00). Quem pediu não aprova a própria compra (fixo).", "aprovar", 5],
  ["COMPRAS_APROVAR_DA_AREA", "Compras", "Aprovar compra da própria área (faixa do gestor)", "Aprova compra da faixa do gestor (hoje até R$ 10.000,00) pedida por alguém da área dele. Quem cotou não aprova (fixo).", "aprovar", 5],
  ["COMPRAS_APROVAR_SEM_LIMITE", "Compras", "Aprovar compra acima de todas as faixas", "Faixa da Diretoria (acima de R$ 10.000,00) e reserva de todas as faixas.", "aprovar", 5],
  ["COMPRAS_GESTAO", "Compras", "Gestão de Compras", "Relatório mensal e decisões da gestão de Compras (gestor da área de Compras, Diretoria, Administrador).", "administrar", 5],
  ["COMPRAS_REGRAS_EDITAR", "Compras", "Alterar as regras de compras", "Compradores, substitutos, faixas de aprovação e cotações mínimas.", "administrar", 5],
  ["COMPRAS_CIENCIA_GESTAO", "Compras", "Dar ciência de compra fora do fluxo", "Ciência da gestão em compra informada (sem pedido).", "aprovar", 5],
  ["FROTA_LOCALIZAR", "Frota", "Ver localização, mapa e rotas dos veículos", "Rastreamento: mapa, rotas, retiradas, combustível, copiloto, relatório de rastreamento.", "sigiloso", 6],
  ["FROTA_RASTREADOR_CONFIGURAR", "Frota", "Configurar rastreador e alertas", "Vincular rastreador, conferir comandos e alertas, configuração do rastreamento.", "administrar", 6],
  ["FROTA_BLOQUEAR_PARTIDA", "Frota", "Bloqueio da partida", "Modo do bloqueio, triagem, fora da base, área da base, integridade, encerrar emergência, bloquear pelo rastreador, decidir passagem.", "aprovar", 6],
  ["FROTA_LIBERAR_PARTIDA", "Frota", "Liberar a partida agora", "\"Liberar agora\" um veículo bloqueado.", "operar", 6],
  ["FROTA_BLOQUEIO_ROUBO", "Frota", "Bloqueio de roubo", "Bloqueio do veículo em caso de roubo.", "administrar", 6],
  ["FROTA_ODOMETRO_CORRIGIR", "Frota", "Corrigir o hodômetro do bloqueio", "Ajusta a leitura do hodômetro no módulo de bloqueio.", "operar", 6],
  ["COM_USAR", "Comercial", "Trabalhar no Comercial", "Oportunidades, propostas, assinatura, envio, passagem aos setores, especialista, orçamentista, gestora, banco de preços (consulta).", "operar", 7],
  ["COM_TODAS_AS_VENDAS", "Comercial", "Ver e mexer nas vendas de todos", "Oportunidades e propostas de todos os vendedores, indicadores por vendedor, trocar responsável.", "ver", 7],
  ["COM_GESTAO_COMERCIAL", "Comercial", "Gestão comercial", "Reabrir oportunidade, criar atividade na oportunidade, relatório mensal, perguntar à gestora, metodologia, decidir preço de item, itens oficiais.", "aprovar", 7],
  ["COM_DECIDIR_DESCONTO", "Comercial", "Decidir desconto acima da alçada", "Aprova ou recusa desconto que passou do limite do vendedor (não decide o próprio: fixo).", "aprovar", 7],
  ["COM_DESCONTO_DIRETORIA", "Comercial", "Aprovar desconto da faixa da Diretoria", "Desconto ou margem que a política manda para a Diretoria.", "aprovar", 7],
  ["COM_PEDIDOS_APROVADOS", "Comercial", "Ver os pedidos aprovados", "Pedidos aprovados com valor, condição de pagamento e dados de faturamento.", "ver", 7],
  ["COM_VER_VALORES", "Comercial", "Ver valores de venda", "Valor estimado, ponderado e preço nas oportunidades, propostas, quadro e Gantt.", "valores", 7],
  ["COM_VER_CUSTO", "Comercial", "Ver custo e margem", "Custo dos itens, margem, preço mínimo e política de precificação.", "valores", 7],
  ["COM_CATALOGO_EDITAR", "Comercial", "Manter o catálogo (preço e custo)", "Cadastra e altera produto ou serviço com custo, ficha de custo, reativa item arquivado.", "operar", 7],
  ["COM_CATALOGO_EDITAR_VENDA", "Comercial", "Cadastrar item e preço de venda (vendedor)", "Vendedor cadastra item novo e altera preço de venda dentro da alçada; não vê custo.", "operar", 7],
  ["COM_POLITICA_PRECOS", "Comercial", "Política de preços e termos", "Reajuste do catálogo, catálogo oficial, decisão do dono na política, termos e condições, política de precificação.", "administrar", 7],
  ["COM_BANCO_PRECOS_GERIR", "Comercial", "Gerir o banco de preços", "Carga, tirar preço das contas, fora da curva, indicadores do banco de preços.", "administrar", 7],
  ["COM_CONTATOS_CLIENTES", "Comercial", "Ver e editar contatos dos clientes", "Nome, telefone e e-mail dos contatos (dados pessoais).", "sigiloso", 7],
  ["COM_EXCLUIR", "Comercial", "Excluir oportunidade ou proposta", "Exclui oportunidade ou proposta que não foi ao cliente.", "excluir", 7],
  ["RONDA_SUGESTAO_DECIDIR", "Comercial", "Decidir sugestão da ronda ao Comercial", "Aceita (vira oportunidade) ou descarta a sugestão da ronda de engenharia clínica.", "aprovar", 8],
  ["AST_USAR", "Assistência técnica", "Usar a Assistência técnica", "Abrir e acompanhar chamados, agenda, rondas, indicadores, histórico, recebimento, solicitações, reclamações, app de campo.", "operar", 8],
  ["AST_VER_TODOS_CHAMADOS", "Assistência técnica", "Ver todos os chamados", "Todos os chamados e O.S. (o técnico vê só os seus e a fila livre).", "ver", 8],
  ["AST_TRIAGEM", "Assistência técnica", "Fazer a triagem dos chamados novos", "Recebe chamado novo e faz a triagem antes da fila livre.", "operar", 8],
  ["AST_GESTAO", "Assistência técnica", "Gestão da Assistência técnica", "Agendar, ordenar o dia, reservar veículo, cancelar e encerrar chamado, rondas, contratos de ronda, corrigir relatório, aguardar peça, transição do Auvo, relatório mensal.", "aprovar", 8],
  ["AST_EXECUTAR_OS_DE_OUTROS", "Assistência técnica", "Registrar atendimento em O.S. de outro técnico", "Registrar atendimento, foto, encerrar e enviar relatório em O.S. que não é sua (a própria é sempre permitida).", "operar", 8],
  ["AST_TRANSFERIR_OS", "Assistência técnica", "Transferir O.S. para outro técnico", "Distribui e transfere O.S. entre técnicos.", "aprovar", 8],
  ["AST_GERIR_FILA_SETOR", "Assistência técnica", "Gerir a fila do setor", "Escolhe o executor e gere a fila de O.S. de um setor (Técnica, Metrologia, Comercial, Logística, Administrativo).", "aprovar", 8],
  ["AST_REGRAS", "Assistência técnica", "Alterar as regras da Assistência", "Prazos, contratos, tipos de serviço, checklists, ligar/desligar, trazer questionários do Auvo.", "administrar", 8],
  ["AST_VER_VALORES", "Assistência técnica", "Ver e preencher valores de orçamento", "Preencher, emitir, revisar e registrar resposta do orçamento da O.S.", "valores", 8],
  ["AST_EXCLUIR", "Assistência técnica", "Excluir e restaurar chamado", "Excluir chamado de teste ou simulação, ver excluídos e restaurar.", "excluir", 8],
  ["AST_DESLIGAR_AUVO", "Assistência técnica", "Marcar o Auvo como desligado", "Marca o desligamento do Auvo depois dos seis critérios.", "administrar", 8],
  ["AST_ACEITAR_FALTAS_ACERVO", "Assistência técnica", "Aceitar faltas do acervo do Auvo", "Confirma o critério \"faltas aceitas\" na transição do Auvo.", "aprovar", 8],
  ["REP_USAR", "Representação", "Abrir o módulo Representação (equipe)", "Ver pedidos das representadas, conversar, documentos.", "operar", 8],
  ["REP_ADMINISTRAR", "Representação", "Administrar representadas", "Cadastro da representada, catálogo, modelos e registro de ações das representadas.", "administrar", 8],
  ["REP_ABRIR_EM_NOME", "Representação", "Abrir pedido em nome da representada", "Abre pedido e liga chamado à representada.", "operar", 8],
  ["REP_CONFIGURAR", "Representação", "Configurar quem abre em nome e desligar chamado", "Lista \"quem pode abrir pedido em nome da representada\" e desligar chamado da representada.", "administrar", 8],
  ["REP_RECEBER_ALERTAS", "Representação", "Receber aviso de pedido novo da representada", "Aviso de pedido novo e dispensar o aviso.", "operar", 8],
  ["REP_LIBERAR_FOTO", "Representação", "Liberar foto à representada", "Libera a foto do atendimento para a representada.", "aprovar", 8],
  ["FROTA_USAR", "Frota", "Usar a Frota", "Retirar, devolver, reservar, abastecer e registrar o próprio uso dos veículos.", "operar", 9],
  ["FROTA_OPERAR_PELOS_OUTROS", "Frota", "Operar a Frota por outra pessoa", "Iniciar e finalizar viagem por outro condutor, ajustar e conferir km, justificar abastecimento, enviar comprovante.", "operar", 9],
  ["FROTA_VEICULOS_CADASTRAR", "Frota", "Cadastrar veículos e documentos", "Criar, alterar, inativar veículo, documentos do veículo, bases, identificação, checklist, auditoria e eventos.", "operar", 9],
  ["FROTA_CONDUTORES_E_MULTAS", "Frota", "Condutores, CNH e multas", "Cadastro de condutor, foto da CNH, multas e indicação de condutor.", "sigiloso", 9],
  ["FROTA_ABASTECIMENTO_CONFERIR", "Frota", "Conferir abastecimentos", "Painel de abastecimento, liberar, decidir justificativa, conferir, configurar e corrigir.", "aprovar", 9],
  ["FROTA_GASTOS_VER", "Frota", "Ver gastos e relatórios da Frota", "Gastos, extrato de pedágio, despesas, relatório geral e mensal.", "valores", 9],
  ["FROTA_MANUTENCAO_GERIR", "Frota", "Manutenção da Frota", "Plano de manutenção, paradas agendadas, registrar manutenção, despesa e parada.", "operar", 9],
  ["FROTA_GESTAO_MELHORIA", "Frota", "Gestão e melhoria da Frota", "Casos, análise, planos de ação e indicadores da Frota.", "aprovar", 9],
  ["FROTA_RESERVAS_GERIR", "Frota", "Gerir reservas dos outros", "Cancelar, trocar veículo e decidir reservas de outras pessoas.", "aprovar", 9],
  ["FROTA_VALORES_SUSPEITOS", "Frota", "Levantamento de valores suspeitos da Frota", "Lista de lançamentos com valor suspeito.", "administrar", 9],
  ["GESTAO_CAIXA_DECISOES", "Caixa de decisões e desempenho", "Usar a Caixa de decisões", "Abre a caixa, registra providência nos itens de que é responsável, regras (consulta).", "aprovar", 9],
  ["GESTAO_CAIXA_VER_TODAS", "Caixa de decisões e desempenho", "Ver as decisões de todas as áreas", "Na Caixa de decisões, vê os itens de todas as áreas (sem esta caixa, só os seus).", "ver", 9],
  ["GESTAO_VER_SIGILO", "Caixa de decisões e desempenho", "Ver itens sigilosos (Conduta) na gestão", "Itens do Programa de conduta com nome na Caixa e relatórios da empresa com nomes.", "sigiloso", 9],
  ["GESTAO_AVALIACAO_GESTORES", "Caixa de decisões e desempenho", "Avaliação dos gestores (Diretoria)", "Desempenho de todos os gestores, relatório semanal da gestão, relatórios gerados, itens só da Diretoria.", "sigiloso", 9],
  ["GESTAO_AVALIACAO_REGRAS", "Caixa de decisões e desempenho", "Regras da avaliação dos gestores", "Pesos e faixas da nota dos gestores.", "administrar", 9],
  ["GESTAO_CONFIGURAR", "Caixa de decisões e desempenho", "Regras e responsáveis da Caixa de decisões", "Responsáveis por área (dá poderes na Assistência, Comercial, Compras e Ponto), escada de avisos, destinatários dos relatórios da empresa.", "administrar", 9],
  ["GESTAO_RELATORIOS_EMPRESA", "Caixa de decisões e desempenho", "Relatórios da empresa", "Abre os relatórios da empresa e o histórico de envios.", "ver", 9],
  ["GESTAO_RESUMO_DIARIO", "Caixa de decisões e desempenho", "Resumo diário da gestão (início)", "Resumo do dia (Sedna) e resumo do Auvo no painel inicial.", "ver", 9],
  ["ATIVIDADES_GERIR_EQUIPE", "Atividades e avisos", "Gerir atividades da equipe", "Lançar atividade para outra pessoa, trocar responsável, editar e mudar situação da atividade dos outros, decidir pedido de nova data.", "aprovar", 10],
  ["ATIVIDADES_VER_RESTRITAS", "Atividades e avisos", "Ver atividades restritas de outros", "Atividades restritas (ex.: do Conduta) de outras pessoas.", "sigiloso", 10],
  ["ATIVIDADES_AVISOS_HORARIOS", "Atividades e avisos", "Avisos e horários (expediente)", "Expediente, feriados e envio de resumos pelo WhatsApp.", "administrar", 10],
  ["AVISOS_PUBLICAR", "Atividades e avisos", "Publicar avisos com ciência", "Publicar, reenviar, arquivar aviso e ver quem leu.", "operar", 10],
  ["AVISOS_MATRIZ", "Atividades e avisos", "Matriz de avisos", "Define quem recebe o quê por sistema, e-mail e WhatsApp.", "administrar", 10],
  ["AVISOS_ABRIR_DE_OUTROS", "Atividades e avisos", "Abrir aviso da gestão de outra pessoa", "Abre pelo link um aviso destinado a outra pessoa.", "ver", 10],
  ["PONTO_CONFIGURAR", "Assistente do ponto", "Configurar o Assistente do ponto", "Ligar, desligar, jornada geral, feriados, avisos e jornada da pessoa, folgas e dispensas, prévia.", "administrar", 9],
  ["PONTO_VER_TODOS", "Assistente do ponto", "Ver o ponto de todos", "Painel do dia e do mês de todas as pessoas, quem participa, resumo do mês.", "sigiloso", 9],
  ["PONTO_TRATAR_AJUSTES", "Assistente do ponto", "Tratar pedidos de ajuste do ponto", "Decide pedido de ajuste e vê justificativa e evidência dos outros.", "aprovar", 9],
  ["PONTO_VER_EQUIPE_AREA", "Assistente do ponto", "Acompanhar o ponto da própria área", "Painel do dia e do mês das pessoas da área que gere.", "sigiloso", 9],
  ["CHAT_GESTAO", "Comunicação", "Gestão no bate-papo", "Lê \"Recebidas pelo WhatsApp\", publica comunicados e edita qualquer grupo.", "operar", 10],
  ["CHAT_ADMINISTRAR", "Comunicação", "Administrar o bate-papo", "Vincular pessoas, sincronizar, status, configuração e trilha do WhatsApp do bate-papo.", "administrar", 10],
  ["CHAT_IMAGENS_CONFIGURAR", "Comunicação", "Ligar o envio de imagens no bate-papo", "Liga e desliga o envio de imagens para todos.", "administrar", 10],
  ["EMAIL_CAIXAS_COMPARTILHADAS", "Comunicação", "Caixas de e-mail compartilhadas", "Cadastra caixas compartilhadas, define quem acessa, assinatura e trilha.", "administrar", 10],
  ["WHATSAPP_PILOTO_GERIR", "Comunicação", "Piloto do WhatsApp", "Quem participa do piloto de avisos pelo WhatsApp.", "administrar", 10],
  ["WHATSAPP_PILOTO_LIGAR", "Comunicação", "Ligar e desligar o piloto do WhatsApp", "Liga ou desliga o piloto para todos.", "administrar", 10],
  ["WHATSAPP_VER_TELEFONES", "Comunicação", "Ver telefones completos no piloto", "Mostra o celular completo das pessoas (os demais veem só o final).", "sigiloso", 10],
  ["ASSISTENTE_PAINEL_PERGUNTAS", "Comunicação", "Painel de perguntas ao assistente", "Vê as perguntas feitas ao assistente \"Tire sua dúvida\" e sugere melhorias.", "ver", 10],
  ["CADASTROS_EDITAR", "Cadastros e documentos", "Cadastrar clientes, unidades e equipamentos", "Criar, editar e inativar cliente, unidade, equipamento e documento.", "operar", 11],
  ["CADASTROS_EXCLUIR", "Cadastros e documentos", "Excluir cadastro de vez", "Excluir cliente, unidade, equipamento, documento e vínculo definitivamente.", "excluir", 11],
  ["CADASTROS_ROTINA_GESTAO", "Cadastros e documentos", "Rotina de cadastros da gestão", "Transferir, consolidar e desvincular cadastros, histórico de vínculos, alterar documento com arquivo, painel de cadastros.", "operar", 11],
  ["CADASTROS_JUNTAR_DUPLICADOS", "Cadastros e documentos", "Juntar cadastros repetidos", "Juntar duplicados, marcar \"não é duplicado\", relatório de qualidade dos cadastros, atribuir correção, vínculo sem CNPJ.", "administrar", 11],
  ["EQUIPAMENTO_QR_COMPLETO", "Cadastros e documentos", "Ver tudo pelo QR do equipamento", "Pelo QR Code, vê a ficha completa do equipamento (cliente vê só o dele).", "ver", 11],
  ["AUVO_INTEGRACAO", "Integração Auvo e painel de qualidade", "Usar a integração com o Auvo", "Conexão, sincronização diária e incremental, pendências, envio de cadastro pendente, relatório, buscar e sincronizar um cliente.", "operar", 11],
  ["AUVO_IMPLANTACAO", "Integração Auvo e painel de qualidade", "Ferramentas de implantação do Auvo", "Sincronizar em lote, importação reversa, técnicos e auditoria de nomes.", "administrar", 11],
  ["AUVO_ACERVO", "Integração Auvo e painel de qualidade", "Acervo do Auvo", "Consulta o acervo histórico importado do Auvo.", "ver", 11],
  ["QUALIDADE_VER_PAINEL", "Integração Auvo e painel de qualidade", "Painel de qualidade", "Painel, lista de ocorrências de qualidade e relatório.", "ver", 11],
  ["QUALIDADE_REGISTRAR", "Integração Auvo e painel de qualidade", "Registrar e resolver ocorrência de qualidade", "Ocorrências de qualidade ligadas a O.S. do Auvo e à Frota.", "operar", 11],
  ["LIC_USAR", "Licitações", "Trabalhar em Licitações", "Radar, fichas, pareceres, preços, proposta, disputa, habilitação, contratos, mercado e relatórios.", "operar", 11],
  ["LIC_ALCADAS", "Licitações", "Alterar alçadas dos pareceres", "Quem dá parecer e as alçadas de participação.", "administrar", 11],
  ["LIC_ATOS_EXCEPCIONAIS", "Licitações", "Atos excepcionais em Licitações", "Reabrir contrato encerrado e reconhecer quebra do registro de lances.", "administrar", 11],
  ["AUT_PORTOES", "Automação predial", "Abrir e fechar portões", "Ver e acionar os portões e o alarme.", "operar", 11],
  ["AUT_PORTA_DIRETORIA", "Automação predial", "Destravar a porta da Diretoria", "Acionar dispositivo restrito à Diretoria (os demais diretores só veem, salvo permissão ACIONAR).", "operar", 11],
  ["AUT_ADMINISTRAR", "Automação predial", "Administrar a automação predial", "Dispositivos, canais, permissões, homologação, saúde da infraestrutura, registro de todos os comandos, alarme.", "administrar", 11],
  ["INICIO_PENDENCIAS_GESTAO", "Início", "Ver pendências da gestão no Início", "Pendências de público \"gestão\" na central do Início (filtradas pela área na matriz de avisos), sugestões do Conduta e decisões da gestão.", "ver", 10],
  ["INICIO_PENDENCIAS_TECNICAS", "Início", "Ver pendências técnicas e de clientes no Início", "Pendências de público \"técnica\" e \"cliente\" (vencimentos de calibração e qualificação) na central do Início.", "ver", 10],
  ["INICIO_PENDENCIAS_ADMIN", "Início", "Ver pendências do Administrador no Início", "Pendências de público \"administrador\" (ex.: revisão do Auvo) na central do Início.", "ver", 10],
  ["INICIO_PENDENCIAS_ROTINA", "Início", "Ver pendências de rotina da Frota no Início", "RH e Financeiro (rotina) veem as pendências de Frota de público \"gestão\".", "ver", 10]
];

// ------------------------------------------------------------
// REGRA PADRÃO DE CADA PODER (espelho de hoje)
// padrao(eu, c): eu = { id, login, nome, perfil, area, vinculo, ativo, cadastro }; c = Poderes_base_(eu), com as
// funções-base do legado já calculadas (uma vez por pessoa por requisição). Cada regra cita a origem da trava de hoje.
// Contas de fora e o dono nunca chegam aqui (proteções fixas em Poderes_avaliar_).
// ------------------------------------------------------------
function Poderes_regras_() {
  var em = function (lista) { return function (eu, c) { return lista.indexOf(c.p) >= 0; }; };
  var rotina = function (eu, c) { return c.rotina; };                       // SGO_ehGestaoRotina_ (SGO_Auth.js)
  var gestao = function (eu, c) { return c.gd; };                           // isAdminPerfilAuth_ (SGO_Auth.js)
  var gestaoOuRotina = function (eu, c) { return c.gd || c.rotina; };       // SGO_rotinaSessao_ (SGO_Auth.js)
  var admin = function (eu, c) { return c.admin; };
  var adminOuDiretoriaPerfil = function (eu, c) { return c.admin || c.p === 'DIRETORIA'; };
  var interno = function () { return true; };                                // contas de fora já saíram antes
  return {
    // ---------------- Contas e acessos (SGO_Usuarios.js, SGO_Areas.js, SGO_SegurancaAcesso.js, SGO_ModoPersonalizado.js)
    CONTAS_VER: rotina, CONTAS_CRIAR: rotina, CONTAS_ALTERAR_OUTROS: rotina, CONTAS_MUDAR_PERFIL: rotina, CONTAS_REDEFINIR_SENHA: rotina, CONTAS_INATIVAR: rotina,
    CONTAS_EXCLUIR: admin, CONTAS_GERIR_ADMINISTRADOR: admin, CONTAS_DAR_DIRETORIA: adminOuDiretoriaPerfil,
    AREAS_GERIR: function (eu, c) { return SGO_podeConsultarPessoas_(c.p); },
    AREAS_DEFINIR_PESSOA: rotina,
    SEGURANCA_VER_REGISTRO: function (eu, c) { return !!SegAcesso_podeVer_(c.sessao); },
    SEGURANCA_ALTERAR: function (eu, c) { return !!SegAcesso_ehAdmin_(c.sessao); },
    // /_sgo/segredos: desde 10/11/2026 só o dono no servidor Node (Chaves_exigirDono_); o dono chega aqui já com tudo. /_sgo/estado: isAdminSession.
    SISTEMA_SEGREDOS_SERVIDOR: function () { return false; }, SISTEMA_PAINEL_SERVIDOR: gestao,
    MODO_PERSONALIZADO_DESIGNAR: function (eu, c) { return c.admin || c.dono; },
    ACESSOS_GERIR: function (eu, c) { return c.dono; },
    // ---------------- Programa de conduta (Conduta_exigirGestor_, Conduta_veIdentidadeUsuario_)
    CONDUTA_PARTICIPAR: interno,
    CONDUTA_CONSULTAR_EQUIPE: function (eu, c) { return c.gd || c.p === 'RH'; },
    CONDUTA_VER_NOMES: function (eu, c) { return c.gd && c.sigilo(); },
    CONDUTA_DECIDIR: function (eu, c) { return c.gd && c.sigilo(); },
    CONDUTA_DECIDIR_COMO_DIRETORIA: function (eu, c) { return c.diretoria; },
    CONDUTA_MISSAO_DECIDIR: gestao, CONDUTA_AUSENCIA_GERIR: gestao, CONDUTA_FECHAR_MES: gestao, CONDUTA_PAINEIS_GESTAO: gestao, CONDUTA_CONFIGURAR: gestao,
    // ---------------- Financeiro (Omie: ADMIN/DIRETORIA/FINANCEIRO; Compras: Cmp_nivelDe_, CmpCart_pode*_)
    FIN_VER_CONTAS: em(['ADMIN', 'DIRETORIA', 'FINANCEIRO']), FIN_CONCILIAR_BANCO: em(['ADMIN', 'DIRETORIA', 'FINANCEIRO']),
    FIN_CONFERIR_COMPRAS: function (eu, c) { return !!c.cmp().financeiro; },
    FIN_FATURAS_CONCILIAR: function (eu, c) { return !!(c.cmp().financeiro || c.cmp().gestao); },
    FIN_A_PAGAR: function (eu, c) { return !!(c.cmp().financeiro || c.cmp().gestao); },
    FIN_FATURA_REABRIR: function (eu, c) { return !!(c.cmp().diretoria || c.admin); },
    FIN_CARTOES_VER: function (eu, c) { return !!CmpCart_podeVer_(c.cmp()); },
    FIN_CARTOES_EDITAR: function (eu, c) { return !!CmpCart_podeEditar_(c.cmp()); },
    // ---------------- Documentos técnicos (SGO_QE_ehAprovador_ com os perfis de cada módulo)
    RELATORIO_TECNICO_APROVAR: function (eu, c) {
      var perfis = (typeof AutoRel_UCFG !== 'undefined' && AutoRel_UCFG.EMISSAO && AutoRel_UCFG.EMISSAO.perfisAprovadores) || ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'];
      return !!SGO_QE_ehAprovador_(c.sessao, perfis);
    },
    RELATORIO_BAIXATEMP_APROVAR: function (eu, c) {
      var perfis = (typeof BAIXATEMP_CFG !== 'undefined' && BAIXATEMP_CFG.PERFIS_APROVADORES) || ['ADMIN', 'DIRETORIA', 'GESTOR'];
      return !!SGO_QE_ehAprovador_(c.sessao, perfis);
    },
    RELATORIO_MODELO_ESCOLHER: admin,
    RELATORIO_INTERNO_SIMULADO: function (eu, c) { return c.admin || (eu.id === PODERES_RELATORIO_INTERNO.id && String(eu.login).toLowerCase() === PODERES_RELATORIO_INTERNO.login); },
    DOCTEC_GERAR: function (eu, c) { return c.p !== 'RH'; },                // SGO_bloquearRH_
    DOCTEC_EMITIR_OFICIAL: function (eu, c) { return c.equipeTecnica(); },
    CALIBRACAO_GESTAO: gestao, PADROES_ATUALIZAR_ACERVO: gestao,
    LAVCICLO_CONFIRMAR_REFERENCIA: em(['METROLOGIA', 'ADMIN', 'DIRETORIA', 'GESTOR']),
    ALERTAS_PADROES_CONFIGURAR: admin,
    // ---------------- Compras (Cmp_nivelDe_, CmpC_rota_)
    COMPRAS_PEDIR: function (eu, c) { return c.cmp().nivel !== 'NENHUM'; },
    COMPRAS_VER_FILA: function (eu, c) { return !!c.cmp().veFila; },
    COMPRAS_VER_VALORES: function (eu, c) { return !!c.cmp().veValores; },
    COMPRAS_COMPRAR: function (eu, c) { return !!c.cmp().comprador; },
    COMPRAS_APROVAR_ATE_LIMITE: function (eu, c) {
      var r = c.cmpRegras(), lista = (r.compradores || []).concat(r.substitutos || []).map(String);
      return lista.indexOf(eu.id) >= 0 || c.gestoresCompras().indexOf(eu.id) >= 0 || c.diretoria;
    },
    COMPRAS_APROVAR_DA_AREA: function (eu, c) { return (c.p === 'GESTOR' && !!eu.area) || c.areasResponsavel().length > 0 || c.diretoria; },
    COMPRAS_APROVAR_SEM_LIMITE: function (eu, c) { return c.diretoria; },
    COMPRAS_GESTAO: function (eu, c) { return !!c.cmp().gestao; },
    COMPRAS_REGRAS_EDITAR: function (eu, c) { return !!c.cmp().regras; },
    COMPRAS_CIENCIA_GESTAO: function (eu, c) { return !!(c.cmp().gestor || c.cmp().diretoria || c.admin); },
    // ---------------- Frota: localização e bloqueio (Frota_exigirGestao_ = SGO_rotinaSessao_)
    FROTA_LOCALIZAR: gestaoOuRotina, FROTA_RASTREADOR_CONFIGURAR: gestaoOuRotina, FROTA_BLOQUEAR_PARTIDA: gestaoOuRotina,
    FROTA_LIBERAR_PARTIDA: function (eu, c) { return (c.gd || c.rotina) && ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH'].indexOf(c.p) >= 0; },
    FROTA_BLOQUEIO_ROUBO: function (eu, c) { return (c.gd || c.rotina) && c.p === 'DIRETORIA'; },
    FROTA_ODOMETRO_CORRIGIR: function (eu, c) { return (c.gd || c.rotina) && ['ADMIN', 'GESTOR'].indexOf(c.p) >= 0; },
    // ---------------- Comercial (Com_nivelDe_, ComCt_podeVer_, ComCat_podeMudarPreco_)
    COM_USAR: function (eu, c) { return !!(c.com().gestao || c.com().vendedor); },
    COM_TODAS_AS_VENDAS: function (eu, c) { return !!c.com().gestao; },
    COM_GESTAO_COMERCIAL: function (eu, c) { return !!c.com().gestao; },
    COM_DECIDIR_DESCONTO: function (eu, c) { return !!c.com().gestao; },
    COM_DESCONTO_DIRETORIA: function (eu, c) { return !!(c.com().diretoria || c.admin); },
    COM_PEDIDOS_APROVADOS: function (eu, c) { return !!(c.com().gestao || c.com().vendedor || c.com().financeiro); },
    COM_VER_VALORES: function (eu, c) { return !!c.com().veValores; },
    COM_VER_CUSTO: function (eu, c) { return !!c.com().veCusto; },
    COM_CATALOGO_EDITAR: function (eu, c) { return !!c.com().catalogo; },
    COM_CATALOGO_EDITAR_VENDA: function (eu, c) { return !!c.com().catalogoVenda; },
    COM_POLITICA_PRECOS: function (eu, c) { return !!ComCat_podeMudarPreco_(Poderes_junta_({ perfil: c.p }, c.com())); },
    COM_BANCO_PRECOS_GERIR: function (eu, c) { return !!c.com().gestao; },
    COM_CONTATOS_CLIENTES: function (eu, c) { return !!ComCt_podeVer_(Poderes_junta_({ perfil: c.p }, c.com())); },
    COM_EXCLUIR: function (eu, c) { return !!(c.com().gestao || c.com().vendedor); },
    // ---------------- Assistência técnica e Representação (Ast_nivelDe_, AstO_*, Rep_*)
    RONDA_SUGESTAO_DECIDIR: function (eu, c) { return !!AstRd_podeSugestao_(c.ast()); },
    AST_USAR: function (eu, c) { return !!c.ast().interno; },
    AST_VER_TODOS_CHAMADOS: function (eu, c) { var a = c.ast(); return !!(a.interno && (a.gestao || !a.tecnico)); },
    AST_TRIAGEM: function (eu, c) { return !!c.ast().gestao || c.triagem().indexOf(eu.id) >= 0; },
    AST_GESTAO: function (eu, c) { return !!c.ast().gestao; },
    AST_EXECUTAR_OS_DE_OUTROS: function (eu, c) { return !!c.ast().gestao; },
    AST_TRANSFERIR_OS: function (eu, c) { return !!AstO_podeTransferir_(c.ast()); },
    AST_GERIR_FILA_SETOR: function (eu, c) { var a = c.ast(); return PODERES_SETORES_FILA.some(function (s) { return !!AstO_podeGerirFila_(a, s); }); },
    AST_REGRAS: function (eu, c) { return !!c.ast().regras; },
    AST_VER_VALORES: function (eu, c) { return !!c.ast().valores; },
    AST_EXCLUIR: function (eu, c) { return !!c.ast().excluir; },
    AST_DESLIGAR_AUVO: admin,
    AST_ACEITAR_FALTAS_ACERVO: function (eu, c) { return !!c.ast().diretoria; },
    REP_USAR: function (eu, c) { return !!c.ast().interno; },
    REP_ADMINISTRAR: function (eu, c) { return !!RepI_podeAdministrar_({ id: eu.id, perfil: c.p, diretoria: !!c.ast().diretoria }); },
    REP_ABRIR_EM_NOME: function (eu, c) { return !!Rep_podeAbrirEmNome_({ id: eu.id, externo: false }); },
    REP_CONFIGURAR: admin,
    REP_RECEBER_ALERTAS: function (eu, c) { return !!c.ast().gestao || c.repResponsaveis().indexOf(eu.id) >= 0 || c.triagem().indexOf(eu.id) >= 0; },   // RepAl_podeReceber_
    REP_LIBERAR_FOTO: function (eu, c) { return !!c.ast().gestao || c.repResponsaveis().indexOf(eu.id) >= 0; },                                          // RepD_liberarFoto_
    // ---------------- Frota (uso e gestão), Caixa de decisões, Assistente do ponto
    FROTA_USAR: interno,
    FROTA_OPERAR_PELOS_OUTROS: gestaoOuRotina, FROTA_VEICULOS_CADASTRAR: gestaoOuRotina, FROTA_CONDUTORES_E_MULTAS: gestaoOuRotina, FROTA_ABASTECIMENTO_CONFERIR: gestaoOuRotina,
    FROTA_GASTOS_VER: gestaoOuRotina, FROTA_MANUTENCAO_GERIR: gestaoOuRotina, FROTA_GESTAO_MELHORIA: gestaoOuRotina,
    FROTA_RESERVAS_GERIR: function (eu, c) { return !!FrotaRes_ehGestaoRotina_(c.p); },
    FROTA_VALORES_SUSPEITOS: admin,
    GESTAO_CAIXA_DECISOES: function (eu, c) { return !!Ges_ehRotinaPerfil_(c.p); },
    GESTAO_CAIXA_VER_TODAS: function (eu, c) { return !!Ges_ehGestaoPerfil_(c.p); },
    GESTAO_VER_SIGILO: function (eu, c) { return !!Ges_veSigilo_({ ativo: true, sistema: false, perfil: c.p, area: eu.area, diretoria: c.diretoria }); },
    GESTAO_AVALIACAO_GESTORES: function (eu, c) { return !!Ges_ehDiretoriaSessao_(c.sessao); },
    GESTAO_AVALIACAO_REGRAS: function (eu, c) { return !!Ges_ehDiretoriaSessao_(c.sessao); },
    GESTAO_CONFIGURAR: function (eu, c) { return !!Ges_podeConfigurar_(c.sessao); },
    GESTAO_RELATORIOS_EMPRESA: function (eu, c) { return c.diretoria || c.admin; },
    GESTAO_RESUMO_DIARIO: gestaoOuRotina,
    PONTO_CONFIGURAR: function (eu, c) { return c.pto().configurar; },
    PONTO_VER_TODOS: function (eu, c) { return c.pto().verTodos; },
    PONTO_TRATAR_AJUSTES: function (eu, c) { return c.pto().tratar; },
    PONTO_VER_EQUIPE_AREA: function (eu, c) { return c.pto().verTodos || c.pto().gestor; },
    // ---------------- Atividades, avisos, Início e comunicação
    ATIVIDADES_GERIR_EQUIPE: gestaoOuRotina,
    ATIVIDADES_VER_RESTRITAS: function (eu, c) { return c.gd || c.p === 'RH'; },
    ATIVIDADES_AVISOS_HORARIOS: adminOuDiretoriaPerfil,
    AVISOS_PUBLICAR: function (eu, c) { return c.gd || c.p === 'RH' || c.rotina; },
    AVISOS_MATRIZ: function (eu, c) { return c.admin || c.p === 'DIRETORIA' || c.dono; },
    AVISOS_ABRIR_DE_OUTROS: function (eu, c) { return c.diretoria || c.gd || (c.rotina && c.areasResponsavel().length > 0); },   // AvG_ehGestao_
    CHAT_GESTAO: gestao, CHAT_ADMINISTRAR: admin, CHAT_IMAGENS_CONFIGURAR: adminOuDiretoriaPerfil,
    EMAIL_CAIXAS_COMPARTILHADAS: admin,
    WHATSAPP_PILOTO_GERIR: em(['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO']),
    WHATSAPP_PILOTO_LIGAR: adminOuDiretoriaPerfil, WHATSAPP_VER_TELEFONES: admin,
    ASSISTENTE_PAINEL_PERGUNTAS: adminOuDiretoriaPerfil,
    INICIO_PENDENCIAS_GESTAO: gestao,
    INICIO_PENDENCIAS_TECNICAS: function (eu, c) { return c.gd || c.p === 'METROLOGIA'; },
    INICIO_PENDENCIAS_ADMIN: admin,
    INICIO_PENDENCIAS_ROTINA: rotina,
    // ---------------- Cadastros, Auvo e qualidade, Licitações, automação predial
    CADASTROS_EDITAR: interno, CADASTROS_EXCLUIR: gestao, CADASTROS_ROTINA_GESTAO: gestaoOuRotina,
    CADASTROS_JUNTAR_DUPLICADOS: function (eu, c) { return !!CadQ_podeJuntar_(c.sessao); },
    EQUIPAMENTO_QR_COMPLETO: function (eu, c) { return c.equipeTecnica(); },
    AUVO_INTEGRACAO: gestao, AUVO_IMPLANTACAO: admin,
    AUVO_ACERVO: function (eu, c) { return ((typeof AUVO_ACERVO_CFG !== 'undefined' && AUVO_ACERVO_CFG.PERFIS) || ['ADMIN', 'DIRETORIA']).indexOf(c.p) >= 0; },
    QUALIDADE_VER_PAINEL: gestao, QUALIDADE_REGISTRAR: gestao,
    LIC_USAR: function (eu, c) { return !!Lic_nivelDe_({ perfil: c.p, login: eu.login }).gestao; },
    LIC_ALCADAS: function (eu, c) { return !!LicPar_podeMudarCfg_({ perfil: c.p, login: eu.login }); },
    LIC_ATOS_EXCEPCIONAIS: admin,
    AUT_PORTOES: interno,
    AUT_PORTA_DIRETORIA: function (eu, c) {                                  // AutPred_direitos_: dono aciona; outro diretor só com a permissão ACIONAR
      if (c.dono) return true;
      if (!AutPred_usuarioEhDiretor_(c.linhaCadastro())) return false;
      var perms = AutPred_permissoesDe_(eu.id), restritos = c.dispositivosRestritos();
      return restritos.some(function (id) { return String(perms[id] || '').toUpperCase() === 'ACIONAR'; });
    },
    AUT_ADMINISTRAR: function (eu, c) { return c.admin || !!AutPred_usuarioEhDiretor_(c.linhaCadastro()); }   // AutPred_administra_
  };
}

// ------------------------------------------------------------
// MODELOS (conjuntos de poderes aplicados de uma vez; ver LOTE0_IMPLEMENTACAO.md)
// Montados a partir do padrão de hoje de uma conta de referência, sem as listas de configuração (compradores, triagem,
// responsáveis de área) e sem nada exclusivo do dono. Nenhum modelo inclui ACESSOS_GERIR.
// "Gestor de área" usa a área da própria pessoa (cada área tem as caixas de gestão dela).
// ------------------------------------------------------------
var SGO_PODERES_MODELOS = {
  GERENTE: { nome: 'Gerente', descricao: 'Gestão geral do dia a dia: o que um Gestor tem hoje, sem área específica (rotina da empresa, Caixa de decisões, Frota, Conduta sem o sigilo, aprovações de relatório).', referencia: { perfil: 'GESTOR', area: '' } },
  GESTOR_AREA: { nome: 'Gestor de área', descricao: 'O que um Gestor tem hoje na área da própria pessoa (ex.: Gestor da área Comercial ganha a gestão comercial; da área Técnica, a gestão da Assistência).', referencia: { perfil: 'GESTOR', area: '*' } },
  TECNICO: { nome: 'Técnico', descricao: 'Equipe de campo: Frota, Assistência (as próprias O.S.), pedidos de compra, cadastros, documentos técnicos e emissão oficial.', referencia: { perfil: 'TECNICO', area: 'TECNICA' } },
  METROLOGIA: { nome: 'Metrologia', descricao: 'O do técnico mais aprovar relatório técnico, confirmar referência do ciclo da lavadora, ver todos os chamados e as pendências técnicas no Início.', referencia: { perfil: 'METROLOGIA', area: 'METROLOGIA' } },
  COMERCIAL: { nome: 'Comercial', descricao: 'Vendedor: Comercial nas próprias oportunidades e propostas, valores de venda, contatos dos clientes, catálogo de venda e as sugestões da ronda.', referencia: { perfil: 'COMERCIAL', area: 'COMERCIAL' } },
  FINANCEIRO: { nome: 'Financeiro', descricao: 'Contas, conciliação, conferência de compras, faturas e cartões, pedidos aprovados do Comercial, catálogo (preço e custo) e a rotina da empresa.', referencia: { perfil: 'FINANCEIRO', area: 'FINANCEIRO' } },
  RH: { nome: 'RH', descricao: 'Rotina da empresa (contas, áreas, Frota, avisos, atividades), Conduta (consulta, sem decidir), ponto de todos, sem documentos técnicos.', referencia: { perfil: 'RH', area: 'RH' } }
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Poderes_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function Poderes_up_(v) { return Poderes_s_(v).toUpperCase(); }
function Poderes_junta_(a, b) { var o = {}; [a || {}, b || {}].forEach(function (x) { Object.keys(x).forEach(function (k) { o[k] = x[k]; }); }); return o; }
function Poderes_agora_() {
  try { return Utilities.formatDate(new Date(), PODERES_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); } catch (e) { return new Date().toISOString().slice(0, 19); }
}
function Poderes_dataBr_(v) {
  var t = Poderes_s_(v);
  var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(t);
  return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : t;
}
function Poderes_id_() {
  try { return Utilities.getUuid(); } catch (e) { return 'pd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
}
function Poderes_ehDono_(login) {
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && !!Chaves_ehDonoUsuario_(login); } catch (e) { return false; }
}
function Poderes_ehFora_(perfil) { return PODERES_PERFIS_FORA.indexOf(Poderes_up_(perfil)) >= 0; }

/** Memória curta (uma requisição). Gravar uma exceção limpa tudo. */
var PODERES_MEMO = { em: 0 };
function Poderes_memo_() {
  if (!PODERES_MEMO.em || Date.now() - PODERES_MEMO.em > PODERES_MEMO_MS) PODERES_MEMO = { em: Date.now(), bases: {}, avaliacoes: {} };
  return PODERES_MEMO;
}
function Poderes_memoLimpar_() { PODERES_MEMO = { em: 0 }; }

// ------------------------------------------------------------
// CATÁLOGO MONTADO
// ------------------------------------------------------------
var PODERES_CATALOGO_MEMO = null;
/** { lista: [poder], mapa: { CODIGO: poder }, modulos: [nome] }. poder = { codigo, modulo, nome, descricao, categoria, lote, ligado, padrao }. */
function SGO_poderesCatalogo_() {
  if (PODERES_CATALOGO_MEMO) return PODERES_CATALOGO_MEMO;
  var regras = Poderes_regras_(), lista = [], mapa = {}, modulos = [];
  SGO_PODERES_LISTA.forEach(function (l) {
    var p = { codigo: l[0], modulo: l[1], nome: l[2], descricao: l[3], categoria: l[4], lote: l[5], ligado: SGO_PODERES_LIGADOS.indexOf(l[0]) >= 0, padrao: regras[l[0]] };
    if (typeof p.padrao !== 'function') throw new Error('Poder sem regra padrão: ' + p.codigo + ' (SGO_Poderes.js).');
    lista.push(p); mapa[p.codigo] = p;
    if (modulos.indexOf(p.modulo) < 0) modulos.push(p.modulo);
  });
  PODERES_CATALOGO_MEMO = { lista: lista, mapa: mapa, modulos: modulos };
  return PODERES_CATALOGO_MEMO;
}
function Poderes_poder_(codigo) {
  var p = SGO_poderesCatalogo_().mapa[Poderes_up_(codigo)];
  if (!p) throw new Error('Poder desconhecido: ' + codigo + '. Confira o código no catálogo (SGO_Poderes.js).');
  return p;
}

// ------------------------------------------------------------
// QUEM É A PESSOA
// ------------------------------------------------------------
/** Linhas de CAD_USUARIOS por ID (inclui as contas de representada, escondidas fora de Usuários). */
function Poderes_cadastros_() {
  var memo = Poderes_memo_();
  if (memo.cadastros) return memo.cadastros;
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL, linhas = [];
  try { SGO_DATA_REP_VISIVEL = true; linhas = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS); } catch (e) { linhas = []; } finally { try { SGO_DATA_REP_VISIVEL = antes; } catch (e2) {} }
  var m = {};
  linhas.forEach(function (u) { var id = Poderes_s_(u.ID); if (id) m[id] = u; });
  memo.cadastros = m;
  return m;
}
function Poderes_euDaLinha_(u, perfilSessao) {
  if (!u) return null;
  return { id: Poderes_s_(u.ID), login: Poderes_s_(u.USUARIO).toLowerCase(), nome: Poderes_s_(u.NOME) || Poderes_s_(u.USUARIO),
    perfil: Poderes_up_(perfilSessao || u.PERFIL), area: Poderes_up_(u.AREA), vinculo: Poderes_up_(u.VINCULO_TRABALHO).replace(/\s+/g, ''),
    ativo: Poderes_up_(u.STATUS || 'ATIVO') === 'ATIVO' && !Poderes_s_(u.EXCLUIDO_EM), excluido: !!Poderes_s_(u.EXCLUIDO_EM), cadastro: u };
}
/**
 * Aceita: o ID da sessão (texto), a sessão já validada { userId, usuario, perfil } ou a pessoa { id, login, perfil, area }.
 * O perfil vale o da sessão (reconferido pelo login a cada 5 minutos); área e vínculo vêm do cadastro.
 */
function Poderes_eu_(x) {
  if (!x) return null;
  if (typeof x === 'string') x = exigirSessao(x);
  if (x.userId !== undefined || x.usuario !== undefined) {
    var linha = Poderes_cadastros_()[Poderes_s_(x.userId)];
    var eu = Poderes_euDaLinha_(linha, x.perfil);
    if (eu) { if (!eu.login) eu.login = Poderes_s_(x.usuario).toLowerCase(); return eu; }
    return { id: Poderes_s_(x.userId), login: Poderes_s_(x.usuario).toLowerCase(), nome: Poderes_s_(x.nome) || Poderes_s_(x.usuario), perfil: Poderes_up_(x.perfil), area: '', vinculo: '', ativo: true, cadastro: null };
  }
  return { id: Poderes_s_(x.id), login: Poderes_s_(x.login).toLowerCase(), nome: Poderes_s_(x.nome) || Poderes_s_(x.login), perfil: Poderes_up_(x.perfil), area: Poderes_up_(x.area),
    vinculo: Poderes_up_(x.vinculo).replace(/\s+/g, ''), ativo: x.ativo !== false, cadastro: x.cadastro || null };
}

/**
 * Funções-base do legado, calculadas uma vez por pessoa (as pesadas só quando alguma regra pede).
 * Nada aqui duplica regra: cada item chama a função que a trava de hoje usa.
 */
function Poderes_base_(eu) {
  var memo = Poderes_memo_(), chave = eu.id + '|' + eu.login + '|' + eu.perfil + '|' + eu.area + '|' + eu.vinculo;
  if (memo.bases[chave]) return memo.bases[chave];
  var p = eu.perfil, dono = Poderes_ehDono_(eu.login);
  var preguica = function (fn) { var feito = false, v; return function () { if (!feito) { v = fn(); feito = true; } return v; }; };
  var c = {
    p: p, admin: p === 'ADMIN', dono: dono, diretoria: p === 'DIRETORIA' || dono,
    rotina: !!SGO_ehGestaoRotina_(p), gd: !!isAdminPerfilAuth_(p),
    sessao: { userId: eu.id, usuario: eu.login, perfil: p, nome: eu.nome }
  };
  var pessoa = { id: eu.id, perfil: p, area: eu.area, login: eu.login, nome: eu.nome };
  c.linhaCadastro = preguica(function () {
    var l = eu.cadastro || Poderes_cadastros_()[eu.id] || {};
    return Poderes_junta_(l, { ID: eu.id, USUARIO: eu.login, PERFIL: p, AREA: eu.area, VINCULO_TRABALHO: eu.vinculo, STATUS: 'ATIVO' });
  });
  c.equipeTecnica = function () { return ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'].indexOf(p) >= 0; };   // BAIXATEMP_CFG.PERFIS_EQUIPE / SGO_QEQ_PERFIS_EQUIPE
  c.sigilo = preguica(function () { return !!Conduta_veIdentidadeUsuario_(c.linhaCadastro()); });
  c.com = preguica(function () { return Com_nivelDe_(pessoa); });
  c.cmpRegras = preguica(function () { return Cmp_regras_(); });
  c.cmp = preguica(function () { return Cmp_nivelDe_(pessoa, c.cmpRegras()); });
  c.gestoresCompras = preguica(function () { try { return (Cmp_gestoresCompras_(c.cmpRegras()) || []).map(String); } catch (e) { return []; } });
  c.ast = preguica(function () { return Poderes_junta_(pessoa, Ast_nivelDe_(pessoa)); });
  c.gpa = preguica(function () { try { return (Ges_cfg_().gestoresPorArea) || {}; } catch (e) { return {}; } });
  c.areasResponsavel = preguica(function () { var g = c.gpa(); return Object.keys(g).filter(function (a) { return (g[a] || []).map(String).indexOf(eu.id) >= 0; }); });
  c.triagem = preguica(function () { try { return ((Ast_triagemPara_() || {}).ids || []).map(String); } catch (e) { return []; } });
  c.repResponsaveis = preguica(function () { try { return ((Rep_responsaveis_() || {}).ids || []).map(String); } catch (e) { return []; } });
  c.pto = preguica(function () {                                           // Ponto_eu_ (SGO_Ponto_Config.js)
    var rhIds = []; try { rhIds = (Ponto_cfg_().rhIds || []).map(String); } catch (e) { rhIds = []; }
    var rh = p === 'RH' || eu.area === 'RH' || rhIds.indexOf(eu.id) >= 0;
    var verTodos = c.admin || c.diretoria || rh;
    var areas = verTodos ? [] : Ponto_areasDoGestor_({ id: eu.id, perfil: p, area: eu.area });
    return { configurar: !!(c.admin || c.diretoria || rh || c.rotina), verTodos: !!verTodos, tratar: !!verTodos, gestor: !verTodos && areas.length > 0 };
  });
  c.dispositivosRestritos = preguica(function () {
    try { return AutPred_ler_(AUT_ABA_DISPOSITIVOS).filter(function (d) { return AutPred_restrito_(d); }).map(function (d) { return Poderes_s_(d.ID); }); } catch (e) { return []; }
  });
  memo.bases[chave] = c;
  return c;
}

// ------------------------------------------------------------
// EXCEÇÕES E HISTÓRICO (abas)
// ------------------------------------------------------------
/** Cria as abas novas uma vez a cada 6 horas. Nunca lança (sem a aba, ninguém tem exceção). */
function Poderes_garantirEstrutura_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get(PODERES_ESTRUTURA_CACHE)) return; } catch (e) { cache = null; }
  try {
    if (typeof CertCal_garantirTabela_ === 'function') { CertCal_garantirTabela_(PODERES_ABA_EXC, PODERES_COLS_EXC); CertCal_garantirTabela_(PODERES_ABA_LOG, PODERES_COLS_LOG); }
    if (typeof CertCal_garantirColuna_ === 'function') {
      PODERES_COLS_EXC.forEach(function (c) { CertCal_garantirColuna_(PODERES_ABA_EXC, c); });
      PODERES_COLS_LOG.forEach(function (c) { CertCal_garantirColuna_(PODERES_ABA_LOG, c); });
    }
    if (typeof SGO_DATA !== 'undefined') { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; }
    if (cache) cache.put(PODERES_ESTRUTURA_CACHE, '1', 21600);
  } catch (e) {
    try { console.warn('Acessos: não foi possível preparar as abas: ' + ((e && e.message) || e)); } catch (x) {}
  }
}
function Poderes_lerAba_(aba) {
  try { if (SGO_DATA.getDB && !SGO_DATA.getDB().getSheetByName(aba)) return []; } catch (e) { return []; }
  try { return SGO_DATA.getAll(aba); } catch (e2) { return []; }
}
/** { usuarioId: { CODIGO: linha } } — só SIM ou NAO de poderes do catálogo. */
function Poderes_excecoes_() {
  var memo = Poderes_memo_();
  if (memo.excecoes) return memo.excecoes;
  var cat = SGO_poderesCatalogo_().mapa, m = {};
  Poderes_lerAba_(PODERES_ABA_EXC).forEach(function (l) {
    var uid = Poderes_s_(l.USUARIO_ID), cod = Poderes_up_(l.PODER), v = Poderes_up_(l.VALOR).replace('Ã', 'A');
    if (!uid || !cat[cod] || (v !== 'SIM' && v !== 'NAO')) return;
    (m[uid] = m[uid] || {})[cod] = { id: Poderes_s_(l.ID), valor: v, motivo: Poderes_s_(l.MOTIVO), porId: Poderes_s_(l.ALTERADO_POR_ID), porNome: Poderes_s_(l.ALTERADO_POR_NOME), em: Poderes_s_(l.ALTERADO_EM) };
  });
  memo.excecoes = m;
  return m;
}

// ------------------------------------------------------------
// DECISÃO
// ------------------------------------------------------------
/**
 * { valor, origem: 'dono'|'excecao'|'padrao'|'fixo', padrao, excecao, erro }. Proteções fixas antes da caixa:
 * conta de fora (cliente, representada, conta técnica) = NÃO em tudo; dono = SIM em tudo.
 * Regra padrão que falhar ao calcular vale NÃO (nunca libera por erro) e o erro volta para a tela.
 */
function Poderes_avaliar_(eu, poder, ctx) {
  var memo = Poderes_memo_(), chave = eu.id + '|' + eu.perfil + '|' + eu.area + '|' + poder.codigo;
  if (!ctx && memo.avaliacoes[chave]) return memo.avaliacoes[chave];
  var r;
  if (Poderes_ehFora_(eu.perfil)) r = { valor: false, origem: 'fixo', padrao: false, excecao: null };
  else {
    var c = Poderes_base_(eu), padrao = false, erro = '';
    try { padrao = !!poder.padrao(eu, c, ctx || {}); } catch (e) { padrao = false; erro = String((e && e.message) || e); }
    var exc = (Poderes_excecoes_()[eu.id] || {})[poder.codigo] || null;
    if (c.dono) r = { valor: true, origem: 'dono', padrao: padrao, excecao: exc };
    else if (exc) r = { valor: exc.valor === 'SIM', origem: 'excecao', padrao: padrao, excecao: exc };
    else r = { valor: padrao, origem: 'padrao', padrao: padrao, excecao: null };
    if (erro) r.erro = erro;
  }
  if (!ctx) memo.avaliacoes[chave] = r;
  return r;
}

/** A pessoa (sessão, ID da sessão ou pessoa) tem o poder? ctx: reservado para o alcance do registro nos próximos lotes. */
function SGO_pode_(sessaoOuEu, codigo, ctx) {
  var poder = Poderes_poder_(codigo);
  var eu = Poderes_eu_(sessaoOuEu);
  if (!eu || !eu.id) return false;
  return Poderes_avaliar_(eu, poder, ctx).valor;
}

/** Igual a SGO_pode_, mas recusa com a mensagem completa (o quê, por quê, o que fazer). acao: "aprovar a compra", por exemplo. */
function SGO_podeExigir_(sessaoOuEu, codigo, ctx, acao) {
  if (SGO_pode_(sessaoOuEu, codigo, ctx)) return true;
  throw new Error(Poderes_msgSemPoder_(Poderes_poder_(codigo), acao));
}
function Poderes_msgSemPoder_(poder, acao) {
  return 'Você não tem a permissão «' + poder.nome + '»' + (acao ? ' para ' + acao : '') + ': ' + poder.descricao.replace(/[\s.]+$/, '') +
    '. Peça ao responsável pelo sistema para liberar esta caixa em Administração > Acessos, se for o caso.';
}

/**
 * Lote 1 (11/11/2026): troca de trava sem mudar o que o operador lê. Devolve '' quando a pessoa tem o poder. Sem o poder:
 *   - recusa pelo padrão do perfil (nenhuma exceção gravada) -> msgPadrao, a mesma mensagem da trava de antes;
 *   - recusa por exceção NÃO gravada para a pessoa -> a mensagem da caixa (qual permissão falta e como pedir).
 */
function SGO_poderRecusa_(sessaoOuEu, codigo, msgPadrao, acao) {
  var poder = Poderes_poder_(codigo), eu = Poderes_eu_(sessaoOuEu);
  if (!eu || !eu.id) return msgPadrao || Poderes_msgSemPoder_(poder, acao);
  var a = Poderes_avaliar_(eu, poder);
  if (a.valor) return '';
  if (a.origem === 'excecao' || !msgPadrao) return Poderes_msgSemPoder_(poder, acao);
  return msgPadrao;
}

/** Os poderes já ligados da própria pessoa, para a tela mostrar ou esconder botões: { CODIGO: true|false }. A trava continua no servidor. */
function SGO_poderesDaSessao_(sessaoOuEu) {
  var eu = Poderes_eu_(sessaoOuEu), r = {};
  SGO_PODERES_LIGADOS.forEach(function (c) { r[c] = !!(eu && eu.id) && Poderes_avaliar_(eu, Poderes_poder_(c)).valor; });
  return r;
}

/** Lista de todos os poderes de uma pessoa: { codigo, modulo, nome, descricao, categoria, lote, ligado, valor, origem, padrao, excecao }. */
function SGO_poderesEfetivos_(usuarioId) {
  var linha = Poderes_cadastros_()[Poderes_s_(usuarioId)];
  if (!linha) throw new Error('Pessoa não encontrada no cadastro de usuários (ID ' + usuarioId + '). Atualize a lista e escolha a pessoa de novo.');
  var eu = Poderes_euDaLinha_(linha);
  return SGO_poderesCatalogo_().lista.map(function (p) {
    var a = Poderes_avaliar_(eu, p);
    return { codigo: p.codigo, modulo: p.modulo, nome: p.nome, descricao: p.descricao, categoria: p.categoria, lote: p.lote, ligado: p.ligado,
      valor: a.valor, origem: a.origem, padrao: a.padrao, excecao: a.excecao, erro: a.erro || '' };
  });
}

// ------------------------------------------------------------
// GRAVAÇÃO (com as proteções fixas)
// ------------------------------------------------------------
/** Quem grava: dono ou quem tem ACESSOS_GERIR. Lança a mensagem completa. */
function Poderes_exigirGestor_(sessao) {
  if (SGO_pode_(sessao, 'ACESSOS_GERIR')) return true;
  throw new Error('Não foi possível abrir a tela Acessos: alterar as caixas de acesso é do responsável pelo sistema (ou de quem ele liberar com a caixa «Gerir os acessos (tela Acessos)»). ' +
    'Peça a ele a mudança de que você precisa; para ver o que você mesmo pode fazer, use o menu normalmente.');
}
function Poderes_alvo_(usuarioId) {
  var linha = Poderes_cadastros_()[Poderes_s_(usuarioId)];
  if (!linha) throw new Error('Não foi possível continuar: a pessoa escolhida não está no cadastro de usuários. Atualize a tela (F5) e escolha de novo.');
  return Poderes_euDaLinha_(linha);
}
/** Proteções fixas sobre a pessoa que recebe a mudança. */
function Poderes_conferirAlvo_(sessao, alvo) {
  if (Poderes_s_(sessao.userId) === alvo.id) throw new Error('Não foi possível gravar: ninguém altera as próprias caixas de acesso. Peça a outra pessoa que gere os acessos (o responsável pelo sistema) para fazer a mudança.');
  if (Poderes_ehDono_(alvo.login)) throw new Error('Não foi possível gravar: ' + alvo.nome + ' é o responsável pelo sistema e tem sempre todas as caixas. Não é possível tirar poderes dele nem gravar exceções para ele.');
  if (Poderes_ehFora_(alvo.perfil)) throw new Error('Não foi possível gravar: ' + alvo.nome + ' tem conta de fora da equipe (perfil ' + (alvo.perfil || 'sem perfil') + '). Contas de cliente e de representada usam só o próprio portal e não têm caixas de acesso. Se a pessoa é da equipe, corrija o perfil em Administração > Usuários.');
  if (alvo.excluido) throw new Error('Não foi possível gravar: a conta de ' + alvo.nome + ' foi excluída. Escolha uma conta ativa.');
}
function Poderes_motivo_(m) {
  var t = Poderes_s_(m);
  if (t.length < PODERES_MOTIVO_MIN) throw new Error('Não foi possível gravar: escreva o motivo da mudança (pelo menos ' + PODERES_MOTIVO_MIN + ' letras). Ele fica no histórico com o seu nome, a data e a hora.');
  return t.slice(0, 500);
}
function Poderes_comTrava_(fn) {
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { throw new Error('Não foi possível gravar agora: outra pessoa está gravando acessos neste momento. Espere alguns segundos e toque em Salvar de novo; nada foi alterado.'); }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (e2) {} Poderes_memoLimpar_(); }
}
/**
 * Aplica mudanças numa pessoa. mudancas: [{ codigo, valor: 'SIM'|'NAO'|'PADRAO' }]. Grava a exceção (ou apaga, para
 * voltar ao padrão) e uma linha de histórico por caixa mudada, com antes e depois. Devolve { alteradas, iguais }.
 */
function Poderes_aplicar_(sessao, alvo, mudancas, motivo, acao) {
  Poderes_conferirAlvo_(sessao, alvo);
  motivo = Poderes_motivo_(motivo);
  if (!Array.isArray(mudancas) || !mudancas.length) throw new Error('Não foi possível gravar: nenhuma caixa foi alterada. Marque ou desmarque as caixas e toque em Salvar.');
  var vistos = {}, lista = mudancas.map(function (m) {
    var p = Poderes_poder_(m && m.codigo), v = Poderes_up_(m && m.valor).replace('Ã', 'A');
    if (['SIM', 'NAO', 'PADRAO'].indexOf(v) < 0) throw new Error('Não foi possível gravar: valor inválido para «' + p.nome + '». Use marcado, desmarcado ou "voltar ao padrão".');
    if (vistos[p.codigo]) throw new Error('Não foi possível gravar: a caixa «' + p.nome + '» veio duas vezes. Atualize a tela e tente de novo.');
    vistos[p.codigo] = true;
    return { poder: p, valor: v };
  });
  Poderes_garantirEstrutura_();
  return Poderes_comTrava_(function () {
    Poderes_memoLimpar_();
    var porNome = Poderes_s_(sessao.nome) || Poderes_s_(sessao.usuario), porId = Poderes_s_(sessao.userId), quando = Poderes_agora_(), lote = Poderes_id_();
    var excAtuais = Poderes_excecoes_()[alvo.id] || {}, alteradas = 0, iguais = 0;
    lista.forEach(function (m) {
      var cod = m.poder.codigo, antes = excAtuais[cod] || null, aval = Poderes_avaliar_(alvo, m.poder);
      var antesExc = antes ? antes.valor : '', depoisExc = m.valor === 'PADRAO' ? '' : m.valor;
      if (antesExc === depoisExc) { iguais++; return; }
      if (antes && antes.id) SGO_DATA.remove(PODERES_ABA_EXC, antes.id);
      if (depoisExc) SGO_DATA.insert(PODERES_ABA_EXC, { ID: Poderes_id_(), USUARIO_ID: alvo.id, PODER: cod, VALOR: depoisExc, MOTIVO: motivo, ALTERADO_POR_ID: porId, ALTERADO_POR_NOME: porNome, ALTERADO_EM: quando });
      var depoisEf = depoisExc ? depoisExc === 'SIM' : aval.padrao;
      SGO_DATA.insert(PODERES_ABA_LOG, { ID: Poderes_id_(), QUANDO: quando, USUARIO_ID: alvo.id, USUARIO_NOME: alvo.nome, PODER: cod, PODER_NOME: m.poder.nome,
        ACAO: acao || (depoisExc ? 'EXCECAO' : 'VOLTAR_AO_PADRAO'), ANTES_EXCECAO: antesExc || 'PADRAO', DEPOIS_EXCECAO: depoisExc || 'PADRAO',
        ANTES_EFETIVO: aval.valor ? 'SIM' : 'NAO', DEPOIS_EFETIVO: depoisEf ? 'SIM' : 'NAO', MOTIVO: motivo, POR_ID: porId, POR_NOME: porNome, LOTE: lote });
      alteradas++;
    });
    return { alteradas: alteradas, iguais: iguais };
  });
}

/** Mudanças que levam a pessoa ao conjunto desejado { CODIGO: true|false }: exceção só onde o desejado difere do padrão. */
function Poderes_mudancasPara_(alvo, desejado) {
  var exc = Poderes_excecoes_()[alvo.id] || {}, out = [];
  SGO_poderesCatalogo_().lista.forEach(function (p) {
    if (!(p.codigo in desejado) || p.codigo === 'ACESSOS_GERIR') return;
    var quer = !!desejado[p.codigo], padrao = Poderes_avaliar_(alvo, p).padrao, atual = exc[p.codigo] ? exc[p.codigo].valor : '';
    var novo = quer === padrao ? '' : (quer ? 'SIM' : 'NAO');
    if (novo !== atual) out.push({ codigo: p.codigo, valor: novo || 'PADRAO' });
  });
  return out;
}

/** Conjunto de poderes de um modelo para a pessoa (Gestor de área usa a área dela). */
function Poderes_conjuntoModelo_(chave, alvo) {
  var m = SGO_PODERES_MODELOS[Poderes_up_(chave)];
  if (!m) throw new Error('Não foi possível aplicar: modelo desconhecido. Escolha um dos modelos da lista.');
  var ref = { id: '', login: '', nome: 'Modelo ' + m.nome, perfil: m.referencia.perfil, area: m.referencia.area === '*' ? (alvo ? alvo.area : '') : m.referencia.area, vinculo: '', ativo: true, cadastro: null };
  if (m.referencia.area === '*' && !ref.area) throw new Error('Não foi possível aplicar o modelo Gestor de área: ' + (alvo ? alvo.nome : 'a pessoa') + ' está sem área no cadastro. Defina a área em Administração > Usuários e tente de novo, ou use o modelo Gerente.');
  var c = Poderes_base_(ref), conj = {};
  SGO_poderesCatalogo_().lista.forEach(function (p) {
    if (p.codigo === 'ACESSOS_GERIR') return;
    var v = false; try { v = !!p.padrao(ref, c, {}); } catch (e) { v = false; }
    if (v) conj[p.codigo] = true;
  });
  return conj;
}

// ------------------------------------------------------------
// API DA TELA (Administração > Acessos, JS_Acessos.html)
// ------------------------------------------------------------
function Poderes_pessoaResumo_(eu, exc) {
  var areaNome = eu.area;
  try { if (typeof SGO_areaDoUsuario_ === 'function') areaNome = SGO_areaDoUsuario_(eu.cadastro || { AREA: eu.area }).nome; } catch (e) { areaNome = eu.area; }
  return { id: eu.id, nome: eu.nome, email: Poderes_s_(eu.cadastro && eu.cadastro.EMAIL).toLowerCase(), perfil: eu.perfil, area: eu.area, areaNome: areaNome, vinculo: eu.vinculo,
    ativo: eu.ativo, dono: Poderes_ehDono_(eu.login), excecoes: Object.keys(exc || {}).length };
}
function Poderes_historico_(usuarioId, limite) {
  var linhas = Poderes_lerAba_(PODERES_ABA_LOG).filter(function (l) { return !usuarioId || Poderes_s_(l.USUARIO_ID) === usuarioId; });
  linhas.sort(function (a, b) { return Poderes_s_(b.QUANDO).localeCompare(Poderes_s_(a.QUANDO)); });
  return linhas.slice(0, limite || 300).map(function (l) {
    return { quando: Poderes_dataBr_(l.QUANDO), pessoa: Poderes_s_(l.USUARIO_NOME), poder: Poderes_s_(l.PODER), poderNome: Poderes_s_(l.PODER_NOME), acao: Poderes_s_(l.ACAO),
      antes: Poderes_s_(l.ANTES_EXCECAO), depois: Poderes_s_(l.DEPOIS_EXCECAO), antesEfetivo: Poderes_s_(l.ANTES_EFETIVO), depoisEfetivo: Poderes_s_(l.DEPOIS_EFETIVO),
      motivo: Poderes_s_(l.MOTIVO), por: Poderes_s_(l.POR_NOME) };
  });
}
function Poderes_telaPessoa_(alvo) {
  var efetivos = SGO_poderesEfetivos_(alvo.id), grupos = [];
  SGO_poderesCatalogo_().modulos.forEach(function (mod) {
    var itens = efetivos.filter(function (p) { return p.modulo === mod; }).map(function (p) {
      return { codigo: p.codigo, nome: p.nome, descricao: p.descricao, categoria: p.categoria, categoriaNome: PODERES_ROTULO_CATEGORIA[p.categoria] || p.categoria, lote: p.lote, ligado: p.ligado,
        valor: p.valor, padrao: p.padrao, origem: p.origem, origemNome: PODERES_ROTULO_ORIGEM[p.origem] || p.origem, erro: p.erro,
        excecao: p.excecao ? { valor: p.excecao.valor, motivo: p.excecao.motivo, por: p.excecao.porNome, em: Poderes_dataBr_(p.excecao.em) } : null };
    });
    grupos.push({ modulo: mod, itens: itens, total: itens.length, comPoder: itens.filter(function (i) { return i.valor; }).length, alteradas: itens.filter(function (i) { return i.origem === 'excecao'; }).length });
  });
  return { pessoa: Poderes_pessoaResumo_(alvo, Poderes_excecoes_()[alvo.id]), grupos: grupos };
}

/** Entrada única da tela. acao: pode | pessoas | pessoa | salvar | copiar | modelos | aplicarModelo | voltarPadrao | historico | verComo. */
function Poderes_api(sessionId, acao, dados) {
  try {
    dados = dados || {};
    var sessao = exigirSessao(sessionId);
    acao = Poderes_s_(acao);
    if (acao === 'pode') return JSON.parse(JSON.stringify({ ok: true, pode: SGO_pode_(sessao, 'ACESSOS_GERIR'), meus: SGO_poderesDaSessao_(sessao) }));
    Poderes_exigirGestor_(sessao);
    var r;
    switch (acao) {
      case 'pessoas': {
        var exc = Poderes_excecoes_(), cad = Poderes_cadastros_();
        var pessoas = Object.keys(cad).map(function (id) { return Poderes_euDaLinha_(cad[id]); })
          .filter(function (eu) { return eu && !eu.excluido && !Poderes_ehFora_(eu.perfil); })
          .map(function (eu) { return Poderes_pessoaResumo_(eu, exc[eu.id]); })
          .sort(function (a, b) { return (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'); });
        r = { pessoas: pessoas, eu: Poderes_s_(sessao.userId), totalPoderes: SGO_poderesCatalogo_().lista.length, ligados: SGO_PODERES_LIGADOS.slice() };
        break;
      }
      case 'pessoa':
      case 'verComo': {
        var alvo = Poderes_alvo_(dados.usuarioId);
        if (Poderes_ehFora_(alvo.perfil)) throw new Error('Não foi possível abrir: ' + alvo.nome + ' tem conta de fora da equipe e não usa caixas de acesso.');
        r = Poderes_telaPessoa_(alvo);
        r.podeAlterar = Poderes_s_(sessao.userId) !== alvo.id && !r.pessoa.dono;
        r.porQueNaoAltera = Poderes_s_(sessao.userId) === alvo.id ? 'Estas são as suas caixas: ninguém altera as próprias. Peça ao responsável pelo sistema.' :
          r.pessoa.dono ? 'Responsável pelo sistema: tem sempre todas as caixas.' : '';
        if (acao === 'verComo') {
          r = { pessoa: r.pessoa, resumo: r.grupos.map(function (g) {
            return { modulo: g.modulo, pode: g.itens.filter(function (i) { return i.valor; }).map(function (i) { return { nome: i.nome, ligado: i.ligado, origem: i.origem }; }), naoPode: g.total - g.comPoder };
          }).filter(function (g) { return g.pode.length; }) };
        }
        break;
      }
      case 'salvar': {
        var alvoS = Poderes_alvo_(dados.usuarioId);
        r = Poderes_aplicar_(sessao, alvoS, dados.mudancas, dados.motivo, '');
        r.message = r.alteradas ? (r.alteradas === 1 ? '1 caixa alterada' : r.alteradas + ' caixas alteradas') + ' para ' + alvoS.nome + '. O histórico guardou o motivo.' : 'Nada mudou: as caixas já estavam assim.';
        r.tela = Poderes_telaPessoa_(alvoS);
        break;
      }
      case 'voltarPadrao': {
        var alvoV = Poderes_alvo_(dados.usuarioId), codigos = Array.isArray(dados.codigos) ? dados.codigos : [dados.codigo];
        r = Poderes_aplicar_(sessao, alvoV, codigos.filter(Boolean).map(function (c) { return { codigo: c, valor: 'PADRAO' }; }), dados.motivo, 'VOLTAR_AO_PADRAO');
        r.message = r.alteradas ? 'Voltou ao padrão do perfil (' + r.alteradas + ').' : 'Esta caixa já estava no padrão do perfil.';
        r.tela = Poderes_telaPessoa_(alvoV);
        break;
      }
      case 'copiar': {
        var destino = Poderes_alvo_(dados.usuarioId), origem = Poderes_alvo_(dados.deUsuarioId);
        Poderes_conferirAlvo_(sessao, destino);
        if (origem.id === destino.id) throw new Error('Não foi possível copiar: escolha uma pessoa diferente da que está aberta.');
        if (Poderes_ehFora_(origem.perfil)) throw new Error('Não foi possível copiar: ' + origem.nome + ' tem conta de fora da equipe e não tem caixas.');
        var desejado = {};
        SGO_poderesEfetivos_(origem.id).forEach(function (p) { desejado[p.codigo] = p.valor; });
        var mud = Poderes_mudancasPara_(destino, desejado);
        if (!mud.length) { r = { alteradas: 0, iguais: 0, message: destino.nome + ' já tem as mesmas caixas de ' + origem.nome + '.' }; r.tela = Poderes_telaPessoa_(destino); break; }
        r = Poderes_aplicar_(sessao, destino, mud, Poderes_motivo_(dados.motivo) + ' (copiado de ' + origem.nome + ')', 'COPIAR');
        r.message = 'Caixas copiadas de ' + origem.nome + ': ' + r.alteradas + ' mudança(s) para ' + destino.nome + '. A caixa «Gerir os acessos» nunca é copiada.';
        r.tela = Poderes_telaPessoa_(destino);
        break;
      }
      case 'modelos': {
        var alvoM = dados.usuarioId ? Poderes_alvo_(dados.usuarioId) : null;
        r = { modelos: Object.keys(SGO_PODERES_MODELOS).map(function (k) {
          var m = SGO_PODERES_MODELOS[k], conj = null, erroM = '';
          try { conj = Poderes_conjuntoModelo_(k, alvoM); } catch (e) { erroM = String((e && e.message) || e); }
          return { chave: k, nome: m.nome, descricao: m.descricao, poderes: conj ? Object.keys(conj) : [], erro: erroM };
        }) };
        break;
      }
      case 'aplicarModelo': {
        var alvoA = Poderes_alvo_(dados.usuarioId);
        Poderes_conferirAlvo_(sessao, alvoA);
        var conjA = Poderes_conjuntoModelo_(dados.modelo, alvoA), modo = Poderes_up_(dados.modo) === 'SOMAR' ? 'SOMAR' : 'SUBSTITUIR';
        var desejadoA = {};
        SGO_poderesCatalogo_().lista.forEach(function (p) { if (conjA[p.codigo]) desejadoA[p.codigo] = true; else if (modo === 'SUBSTITUIR') desejadoA[p.codigo] = false; });
        var mudA = Poderes_mudancasPara_(alvoA, desejadoA), nomeM = SGO_PODERES_MODELOS[Poderes_up_(dados.modelo)].nome;
        if (!mudA.length) { r = { alteradas: 0, iguais: 0, message: alvoA.nome + ' já está igual ao modelo ' + nomeM + '.' }; r.tela = Poderes_telaPessoa_(alvoA); break; }
        r = Poderes_aplicar_(sessao, alvoA, mudA, Poderes_motivo_(dados.motivo) + ' (modelo ' + nomeM + (modo === 'SOMAR' ? ', somado' : '') + ')', 'MODELO');
        r.message = 'Modelo ' + nomeM + ' aplicado: ' + r.alteradas + ' mudança(s) para ' + alvoA.nome + '.';
        r.tela = Poderes_telaPessoa_(alvoA);
        break;
      }
      case 'historico':
        r = { historico: Poderes_historico_(dados.usuarioId ? Poderes_s_(dados.usuarioId) : '', Number(dados.limite) || 300) };
        break;
      default:
        throw new Error('Não foi possível concluir: ação desconhecida na tela Acessos. Atualize a página (F5) e tente de novo.');
    }
    return JSON.parse(JSON.stringify(Poderes_junta_({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
