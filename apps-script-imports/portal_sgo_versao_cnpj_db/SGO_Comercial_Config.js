/****************************************************
 * COMERCIAL NATIVO DO SGO+ — BASE (21/10/2026)
 *
 * Decisão do dono (21/10/2026): o Comercial nasce dentro do SGO+ (cadastro único de cliente,
 * unidade e equipamento; Minhas atividades; Caixa de decisões; Enviar documento; documentos A4;
 * e-mail integrado) e a IA passa a ser a GESTORA COMERCIAL (copiloto): conhece a metodologia
 * que a gestão escreve aqui (playbook, etapas, critérios de qualificação, cadência de retorno,
 * política de desconto, motivos de perda) e, todo dia útil, diz a cada vendedor o que fazer
 * hoje. Ela só sugere: não envia nada ao cliente, não aprova desconto e não inventa número.
 * Projeto aprovado: docs/PROJETO_COMERCIAL_NO_SGO_20261021.md.
 *
 * Este arquivo: utilitários, quem é quem no Comercial (acesso), a METODOLOGIA (configuração
 * editável, padrão trazido do Comercial do COMMAND: só as regras, nenhum código) e as tabelas.
 *
 * Arquivos do módulo:
 *   SGO_Comercial_Config.js         base, acesso, metodologia, tabelas, numeração, avisos
 *   SGO_Comercial_Contatos.js       contatos por cliente e unidade (CAD_CONTATOS) e a migração
 *   SGO_Comercial_Oportunidades.js  oportunidades, contato registrado, próxima ação (atividade), ganho, perda, reabertura
 *   SGO_Comercial_Propostas.js      catálogo, proposta (rascunho, desconto, revisão, envio, resposta), passagem aos setores
 *   SGO_Comercial_Documento.js      proposta A4 e relatório mensal A4
 *   SGO_Comercial_Gestora.js        a gestora comercial: lista do dia, próximo passo, revisão da proposta, análise, perguntas
 *   SGO_Comercial_Painel.js         indicadores, pendências (central e Caixa de decisões), rotina e a chamada única da tela
 *   SGO_Comercial_Quadro.js         quadro Kanban do funil, Gantt comercial e tempo por etapa (21/10/2026)
 *   SGO_Ajuda_Comercial.js          ajuda "Como usar esta tela"
 *   JS_Comercial.html               telas
 *
 * QUEM VÊ O QUÊ (servidor confere em toda chamada; esconder na tela não basta):
 *   GESTAO      Administrador, Diretoria, dono do sistema, Gestor com área Comercial no cadastro e quem a
 *               metodologia ou a Caixa de decisões (gestoresPorArea.COMERCIAL) lista como gestor comercial.
 *               Vê tudo, inclusive custo e margem; aprova desconto (pela tela, a Caixa leva até lá).
 *   VENDEDOR    perfil Comercial ou área Comercial no cadastro: só as próprias oportunidades e propostas.
 *   FINANCEIRO  perfil Financeiro ou área Financeiro: só os pedidos aprovados (com valor, para faturar).
 *   NENHUM      Técnico, Metrologia, RH, Cliente e demais gestores: não veem o módulo nem valores. As
 *               atividades que os setores recebem não levam valor.
 *
 * Abas (criadas sob demanda; nada é apagado, só marcado):
 *   COM_CONFIG, COM_OPORTUNIDADES, COM_CONTATOS_REGISTRO, COM_HISTORICO, COM_PRODUTOS, COM_PROPOSTAS,
 *   COM_IA_SUGESTOES, COM_DIA, COM_AVISOS e CAD_CONTATOS (cadastro, fora do Comercial).
 * Nenhuma função devolve Date cru.
 ****************************************************/

var COM_FUSO = 'America/Sao_Paulo';
var COM_ABAS = {
  CONFIG: 'COM_CONFIG', OPORTUNIDADES: 'COM_OPORTUNIDADES', CONTATOS_REG: 'COM_CONTATOS_REGISTRO', HISTORICO: 'COM_HISTORICO',
  PRODUTOS: 'COM_PRODUTOS', PROPOSTAS: 'COM_PROPOSTAS', SUGESTOES: 'COM_IA_SUGESTOES', DIA: 'COM_DIA', AVISOS: 'COM_AVISOS', CONTATOS: 'CAD_CONTATOS'
};
var COM_COLUNAS = {
  COM_CONFIG: ['ID', 'CHAVE', 'VALOR_JSON', 'VERSAO', 'MOTIVO', 'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  COM_OPORTUNIDADES: ['ID', 'CODIGO', 'TITULO', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'CONTATO_ID', 'CONTATO_NOME', 'EQUIPAMENTOS_IDS',
    'FUNIL', 'ETAPA', 'ORIGEM', 'VALOR_ESTIMADO', 'CHANCE', 'PREVISAO_FECHAMENTO', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'SITUACAO', 'QUALIFICACAO_JSON',
    'MOTIVO_PERDA', 'APRENDIZADO_PERDA', 'ETAPA_DESDE', 'ULTIMO_CONTATO_EM', 'TENTATIVAS_SEM_RESPOSTA', 'PROXIMA_ACAO', 'PROXIMA_ACAO_TIPO', 'PROXIMA_ACAO_EM',
    'ATIVIDADE_ID', 'GANHA_EM', 'PERDIDA_EM', 'REABERTURA_PEDIDA_EM', 'REABERTURA_PEDIDA_POR_ID', 'REABERTURA_MOTIVO', 'ORIGEM_REF', 'OBSERVACOES',
    'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM',
    // 21/10/2026: itens da lista de cada etapa confirmados pelo vendedor ao avançar ({ "<etapa>": { itens: [texto], por, em } })
    'CRITERIOS_JSON'],
  COM_CONTATOS_REGISTRO: ['ID', 'OPORTUNIDADE_ID', 'CLIENTE_ID', 'TIPO', 'RESPONDEU', 'RESUMO', 'CONTATO_ID', 'CONTATO_NOME', 'ESTRATEGIA', 'USUARIO_ID', 'USUARIO_NOME', 'DATA', 'CRIADO_EM'],
  COM_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'TIPO', 'DE', 'PARA', 'TEXTO', 'USUARIO_ID', 'USUARIO_NOME', 'DATA', 'CRIADO_EM'],
  COM_PRODUTOS: ['ID', 'CODIGO', 'NOME', 'TIPO', 'CATEGORIA', 'UNIDADE_MEDIDA', 'DESCRICAO', 'PRECO', 'CUSTO', 'ATIVO', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  COM_PROPOSTAS: ['ID', 'NUMERO', 'REVISAO', 'OPORTUNIDADE_ID', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'CONTATO_ID', 'CONTATO_NOME',
    'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'MODELO', 'TITULO', 'ESCOPO', 'APRESENTACAO', 'ITENS_JSON', 'CONDICOES_JSON', 'VALIDADE_DIAS', 'VALIDA_ATE',
    'SUBTOTAL', 'DESCONTO_GERAL', 'TOTAL', 'DESCONTO_PCT', 'MARGEM_PCT', 'CUSTO_TOTAL', 'SITUACAO',
    'DESCONTO_SITUACAO', 'DESCONTO_MOTIVO', 'DESCONTO_PEDIDO_EM', 'DESCONTO_DECISAO_POR_ID', 'DESCONTO_DECISAO_POR_NOME', 'DESCONTO_DECISAO_EM', 'DESCONTO_DECISAO_TEXTO',
    'CONGELADO_JSON', 'MARCA_CONTEUDO', 'PDF_ID', 'HTML_ID', 'PDF_URL', 'HTML_URL', 'PASTA_URL', 'ARQUIVO_NOME', 'GERADA_EM',
    'ENVIADA_EM', 'ENVIO_COMO', 'RETORNO_ATIVIDADE_ID', 'VENCIMENTO_AVISADO_EM', 'RESPOSTA_EM', 'RESPOSTA_POR_NOME', 'RESPOSTA_TEXTO', 'MOTIVO_RECUSA',
    'ACEITE_ARQUIVO_ID', 'ACEITE_ARQUIVO_NOME', 'ACEITE_ARQUIVO_URL', 'PEDIDO_SITUACAO', 'PASSAGEM_EM', 'PASSAGEM_JSON', 'PASSAGEM_CONCLUIDA_EM',
    'REVISAO_DE', 'SUBSTITUIDA_POR', 'CANCELADA_MOTIVO', 'REVISAO_GESTORA_JSON', 'ATUALIZADO_EM', 'CRIADO_POR_ID', 'CRIADO_EM'],
  COM_IA_SUGESTOES: ['ID', 'TIPO', 'REGRA', 'USUARIO_ID', 'OPORTUNIDADE_ID', 'PROPOSTA_ID', 'ORIGEM', 'TITULO', 'CONTEUDO_JSON', 'VERIFICACAO', 'DECISAO', 'DECISAO_EM', 'DECISAO_MOTIVO', 'DIA', 'CRIADO_EM'],
  COM_DIA: ['ID', 'DIA', 'USUARIO_ID', 'USUARIO_NOME', 'PAPEL', 'ITENS_JSON', 'RESUMO', 'ORIGEM', 'AVISO', 'GERADO_EM', 'CRIADO_EM'],
  COM_AVISOS: ['ID', 'DESTINATARIO_ID', 'TIPO', 'TITULO', 'TEXTO', 'REF_TIPO', 'REF_ID', 'DATA', 'LIDO_EM', 'EMAIL_SITUACAO', 'EMAIL_EM', 'EMAIL_MOTIVO', 'CRIADO_EM'],
  CAD_CONTATOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'NOME', 'CARGO', 'PAPEL', 'EMAIL', 'CELULAR', 'TELEFONE', 'PRINCIPAL', 'ORIGEM', 'OBS', 'STATUS',
    'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM']
};
var COM_COLUNAS_TEXTO = {
  COM_OPORTUNIDADES: ['ETAPA_DESDE', 'ULTIMO_CONTATO_EM', 'PROXIMA_ACAO_EM', 'GANHA_EM', 'PERDIDA_EM', 'REABERTURA_PEDIDA_EM', 'PREVISAO_FECHAMENTO', 'ATUALIZADO_EM', 'CODIGO'],
  COM_PROPOSTAS: ['VALIDA_ATE', 'DESCONTO_PEDIDO_EM', 'DESCONTO_DECISAO_EM', 'GERADA_EM', 'ENVIADA_EM', 'VENCIMENTO_AVISADO_EM', 'RESPOSTA_EM', 'PASSAGEM_EM', 'PASSAGEM_CONCLUIDA_EM', 'ATUALIZADO_EM', 'NUMERO'],
  COM_CONTATOS_REGISTRO: ['DATA'], COM_HISTORICO: ['DATA'], COM_DIA: ['DIA', 'GERADO_EM'], COM_AVISOS: ['DATA', 'LIDO_EM', 'EMAIL_EM'],
  COM_IA_SUGESTOES: ['DIA', 'DECISAO_EM'], CAD_CONTATOS: ['CELULAR', 'TELEFONE', 'ATUALIZADO_EM'], COM_CONFIG: ['ATUALIZADO_EM']
};

var COM_SITUACOES_OPO = { ABERTA: 'Aberta', GANHA: 'Ganha', PERDIDA: 'Perdida' };
var COM_SITUACOES_PROP = {
  RASCUNHO: 'Rascunho', AGUARDANDO_APROVACAO: 'Aguardando aprovação do desconto', PRONTA: 'Pronta para enviar', ENVIADA: 'Enviada ao cliente',
  APROVADA: 'Aprovada pelo cliente', RECUSADA: 'Recusada pelo cliente', VENCIDA: 'Vencida sem resposta', CANCELADA: 'Cancelada', SUBSTITUIDA: 'Substituída por nova revisão'
};
var COM_TIPOS_CONTATO = { LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', REUNIAO: 'Reunião', VISITA: 'Visita' };
var COM_PAPEIS_CONTATO = { COMPRA: 'Compra', APROVA: 'Aprova (decisor)', USA: 'Usa o serviço', TECNICO: 'Validação técnica', FINANCEIRO: 'Financeiro', OUTRO: 'Outro' };
var COM_SETORES = { TECNICA: 'Área técnica', COMPRAS: 'Compras', FINANCEIRO: 'Financeiro' };

/**
 * METODOLOGIA PADRÃO — trazida do Comercial do COMMAND (Crm.js, CrmCobranca.js, Orcamentos.js, PosVenda.js,
 * Metas.js, Vendedores.js, Playbook). A gestão edita em Comercial > Metodologia; cada gravação é uma versão nova
 * em COM_CONFIG (a anterior fica no histórico). A gestora comercial (IA) lê ESTA configuração, não um texto fixo.
 */
var COM_METODOLOGIA_PADRAO = {
  versao: 1,
  tese: 'Hospital não compra produto: compra continuidade operacional, segurança do paciente e conformidade. Venda valor técnico, não desconto.',
  regrasDeOuro: [
    'Se não está no SGO+, não existe para a gestão, para a previsão nem para a meta.',
    'Toda oportunidade tem dono, etapa, valor, origem e próxima ação com data.',
    'Toda proposta enviada tem retorno agendado.',
    'Toda perda tem motivo claro: não use "sem retorno" quando faltou cadência.',
    'Nenhuma oportunidade avança sem próxima ação, decisor mapeado e histórico registrado.',
    'Venda valor técnico, não desconto. Negociar fora de alçada é proibido.'
  ],
  funis: [
    { codigo: 'ENGENHARIA', nome: 'Engenharia', descricao: 'Serviços técnicos, contratos e soluções consultivas', etapas: [
      { codigo: 'ENG_1', nome: 'Prospecção e qualificação', probabilidade: 20, maxDias: 7, criterio: 'Validar hospital, dor, decisor e potencial',
        checklist: ['Hospital ou clínica no perfil de cliente (CME, engenharia clínica, centro cirúrgico, UTI)', 'Dor técnica identificada', 'Decisor técnico e financeiro mapeados', 'Origem e dono registrados'] },
      { codigo: 'ENG_2', nome: 'Diagnóstico e reunião técnica', probabilidade: 40, maxDias: 10, criterio: 'Entender problema, impacto, prazo de atendimento e escopo',
        checklist: ['Equipamento, modelo e número de série', 'Impacto operacional e urgência', 'Histórico e fornecedor atual', 'Escopo e prazo entendidos'] },
      { codigo: 'ENG_3', nome: 'Proposta comercial', probabilidade: 60, maxDias: 7, criterio: 'Enviar solução, prazo, valor e condições',
        checklist: ['Resumo da dor', 'Escopo claro e responsabilidades', 'Prazo, condição e validade', 'Retorno agendado antes de terminar o dia'] },
      { codigo: 'ENG_4', nome: 'Negociação e ajustes', probabilidade: 80, maxDias: 10, criterio: 'Tratar preço, prazo, decisor e objeções',
        checklist: ['Condições e objeções registradas', 'Decisor financeiro envolvido', 'Desconto dentro da alçada', 'Data de decisão combinada'] },
      { codigo: 'ENG_5', nome: 'Aprovado e aguardando faturamento', probabilidade: 100, maxDias: 5, criterio: 'Garantir aceite, documentos e faturamento',
        checklist: ['Aceite, contrato ou pedido', 'Documentos do cliente', 'Faturamento encaminhado', 'Pós-venda acionado'] }
    ] },
    { codigo: 'PRODUTOS', nome: 'Produtos', descricao: 'Peças, insumos, equipamentos e maquinários', etapas: [
      { codigo: 'PRO_1', nome: 'Levantamento de interesse', probabilidade: 20, maxDias: 3, criterio: 'Identificar necessidade, produto e urgência', checklist: ['Item e urgência', 'Quem pediu e quem valida'] },
      { codigo: 'PRO_2', nome: 'Qualificação', probabilidade: 40, maxDias: 5, criterio: 'Validar item, decisor, valor, prazo e condição', checklist: ['Especificação confirmada', 'Decisor e prazo'] },
      { codigo: 'PRO_3', nome: 'Proposta', probabilidade: 60, maxDias: 5, criterio: 'Cotação enviada com validade e próxima ação', checklist: ['Validade da cotação', 'Retorno agendado'] },
      { codigo: 'PRO_4', nome: 'Negociação', probabilidade: 80, maxDias: 7, criterio: 'Preço, prazo, desconto, frete e pagamento', checklist: ['Condição de pagamento', 'Frete e prazo de entrega', 'Desconto dentro da alçada'] },
      { codigo: 'PRO_5', nome: 'Contrato ou pedido', probabilidade: 100, maxDias: 3, criterio: 'Pedido ou aceite e encaminhamento para faturamento', checklist: ['Pedido ou aceite formal', 'Faturamento encaminhado'] }
    ] }
  ],
  origens: ['Prospecção ativa', 'Indicação', 'Cliente da carteira', 'Plataforma de cotação', 'Licitação', 'Site ou redes sociais', 'WhatsApp', 'E-mail', 'Evento ou feira', 'Vencimento de calibração ou qualificação', 'Outro'],
  motivosPerda: ['Preço ou condição de pagamento', 'Concorrente escolhido', 'Sem verba no momento', 'Cliente fora do perfil atendido', 'Demora na decisão ou sem prazo',
    'Produto ou serviço indisponível ou fora de escopo', 'Falha de acompanhamento ou oportunidade abandonada'],
  regraPerda: 'O motivo de perda deve ser real. Não use "sem retorno" quando o problema foi falta de cadência.',
  /**
   * Critérios de saída ao AVANÇAR de etapa (quadro, ficha da oportunidade, qualquer tela): o servidor confere sempre.
   * exigirLista: o vendedor confirma cada item da lista da etapa que está deixando (e das etapas puladas).
   * exigirDecisor / exigirContato: regra de ouro "nenhuma oportunidade avança sem decisor mapeado e histórico registrado".
   * exigirPropostaEnviada: passar da etapa de proposta (a 1ª com 60% ou mais) só com proposta já enviada ao cliente.
   * exigirAceite: a etapa de 100% só com a aprovação do cliente registrada na proposta (com o arquivo do aceite).
   * Voltar de etapa pede o motivo (fica no histórico).
   */
  avanco: { exigirLista: true, exigirDecisor: true, exigirContato: true, exigirPropostaEnviada: true, exigirAceite: true },
  qualificacao: {
    criterio: 'Oportunidade qualificada tem dor, decisor, prazo e caminho de compra.',
    perguntas: ['Qual equipamento, área ou processo precisa de atenção?', 'Isso impacta a rotina, o prazo de atendimento ou o funcionamento do hospital?', 'Quem participa da decisão técnica?',
      'Quem aprova compra, contrato ou pagamento?', 'Existe prazo ou urgência para resolver?', 'Vocês já possuem fornecedor atual?', 'O que faria vocês trocarem ou adicionarem fornecedor?', 'Qual o melhor próximo passo?'],
    itens: [
      { codigo: 'DOR', nome: 'Dor (necessidade real)', pergunta: 'Qual dor real? Qual risco? Por que resolver agora?' },
      { codigo: 'DECISOR', nome: 'Decisor mapeado', pergunta: 'Quem usa? Quem valida tecnicamente? Quem aprova? Quem assina?' },
      { codigo: 'VERBA', nome: 'Verba', pergunta: 'Existe verba prevista ou compra emergencial? Tem centro de custo? Limite de aprovação?' },
      { codigo: 'PRAZO', nome: 'Prazo', pergunta: 'Qual prazo? Existe auditoria? Existe parada? É compra do mês?' }
    ],
    perfilCliente: 'Hospitais e clínicas de médio porte, com CME, engenharia clínica, centro cirúrgico, UTI ou equipamentos críticos; potencial de contrato e recompra. Não perder tempo com conta sem dor, sem decisor, sem prazo, sem verba ou sem aderência técnica.'
  },
  cadencia: {
    esfriandoDias: 7, paradaDias: 10, tentativasMudarEstrategia: 3, propostaLembreteDiaUtil: 2, propostaEscalaDiaUtil: 5, propostaVencendoDias: 3, carteiraEsquecidaDias: 60,
    passos: [
      { dia: 1, canal: 'LIGACAO', titulo: 'Ligação e mensagem curta' },
      { dia: 2, canal: 'LIGACAO', titulo: 'Nova ligação em horário diferente' },
      { dia: 3, canal: 'EMAIL', titulo: 'E-mail ou mensagem com a dor específica' },
      { dia: 5, canal: 'LIGACAO', titulo: 'Tentativa com outro contato da conta' },
      { dia: 7, canal: 'WHATSAPP', titulo: 'Mensagem de valor com pergunta objetiva' },
      { dia: 10, canal: 'EMAIL', titulo: 'Encerramento educado ou nutrição futura' }
    ]
  },
  estrategias: [
    { codigo: 'CANAL', titulo: 'Trocar o canal', texto: 'WhatsApp, depois ligação, depois visita. O mesmo canal repetido costuma dar o mesmo silêncio.' },
    { codigo: 'CONTATO', titulo: 'Falar com outro contato ou decisor', texto: 'Procure quem decide, quem usa ou quem influencia a compra na mesma empresa.' },
    { codigo: 'PROPOSTA', titulo: 'Revisar a proposta', texto: 'Prazo, condição de pagamento, escopo menor ou em fases. Pergunte o que trava.' },
    { codigo: 'GESTAO', titulo: 'Envolver a gestão', texto: 'Um contato da gestão comercial com o decisor do cliente pode destravar.' },
    { codigo: 'PERDA', titulo: 'Registrar perda honesta', texto: 'Se não há dor, verba ou prazo, encerre com o motivo certo e aprenda com ele.' }
  ],
  objecoes: [
    { objecao: 'Está caro', resposta: 'Compare com o custo da parada, o risco e o prazo de atendimento.' },
    { objecao: 'Já tenho fornecedor', resposta: 'Pergunte onde ele não atende bem e ofereça ser o fornecedor reserva para urgência.' },
    { objecao: 'Sem verba agora', resposta: 'Mapeie o prazo, a urgência e uma alternativa (escopo em fases).' },
    { objecao: 'Manda por e-mail', resposta: 'Peça uma pergunta para personalizar a proposta.' },
    { objecao: 'Vou ver e retorno', resposta: 'Combine a data e o canal do retorno.' },
    { objecao: 'Preciso falar com compras', resposta: 'Mapeie quem aprova e como ajudar.' }
  ],
  modelosMensagem: {
    proposta: 'Olá, {nome}. Passando para confirmar se você conseguiu avaliar a proposta {proposta} da Metrolabs. Ficou alguma dúvida técnica, de prazo ou de condição que eu possa ajustar com você? Podemos conversar hoje para combinar o próximo passo?',
    parada: 'Olá, {nome}. A nossa conversa sobre {assunto} ficou pendente. Como esse ponto pode afetar a rotina da unidade, gostaria de entender se ainda faz sentido avançarmos agora ou se devo programar um retorno para outro momento. Qual o melhor caminho?',
    reativacao: 'Olá, {nome}. Aqui é {eu}, da Metrolabs. Faz um tempo que não falamos e gostaria de saber como está hoje a parte de manutenção, calibração e qualificação dos equipamentos. Há algum item que valha revisarmos para evitar urgência futura?',
    encerramento: 'Olá, {nome}. Tentei falar algumas vezes sobre {assunto}, mas imagino que agora não seja prioridade. Vou pausar o meu contato por aqui. Se fizer sentido retomar depois, fico à disposição.'
  },
  politica: {
    descontoMaxPct: 15,
    margemMinPct: 0,
    descontoPorVendedor: {},
    texto: 'O vendedor concede até o limite de desconto sem pedir aprovação. Acima do limite (ou com margem abaixo da mínima, quando o item tem custo cadastrado), a proposta vai para a Caixa de decisões do gestor comercial antes de poder ser enviada. Quem pediu não aprova o próprio desconto.'
  },
  proposta: {
    validadeDias: 15,
    apresentacao: 'Prezados(as),\n\nA Metrolabs agradece a oportunidade e apresenta a seguir a sua proposta técnica e comercial. Atuamos em engenharia clínica hospitalar (manutenção preventiva e corretiva, calibração, qualificação e validação de equipamentos médico-hospitalares) com equipe técnica própria, instrumentos rastreáveis e foco na segurança do paciente e na conformidade com as normas sanitárias.\n\nFicamos à disposição para esclarecer qualquer ponto desta proposta.',
    condicoes: {
      pagamento: 'Boleto bancário com vencimento em 28 dias após a emissão da nota fiscal.',
      prazoExecucao: 'A combinar após o aceite da proposta.',
      garantia: '90 dias para os serviços executados; peças conforme a garantia do fabricante.',
      frete: 'Não se aplica.',
      impostos: 'Inclusos no preço.',
      local: 'Nas instalações do cliente.',
      gerais: 'Serviços, peças ou materiais não descritos nesta proposta serão orçados à parte e só executados com aprovação do cliente.\nAs datas de execução serão agendadas em comum acordo após o aceite.\nO aceite desta proposta formaliza o pedido nas condições aqui descritas.'
    },
    responsabilidades: 'Da Metrolabs:\n- Executar os serviços descritos nesta proposta com equipe técnica qualificada e instrumentos calibrados e rastreáveis.\n- Emitir os documentos técnicos correspondentes (relatórios, certificados ou ordens de serviço).\n- Comunicar previamente qualquer necessidade fora do escopo, com orçamento à parte.\n- Manter sigilo sobre as informações do cliente.\nDo cliente:\n- Disponibilizar os equipamentos, o acesso às áreas e um responsável para acompanhar a execução nas datas combinadas.\n- Fornecer as utilidades necessárias (energia, água, vapor, ar comprimido), quando aplicável.\n- Informar previamente regras de acesso, integração de segurança e documentos exigidos.\n- Efetuar os pagamentos nas condições acordadas.',
    textoAceite: 'Após essa data, os preços e as condições podem ser revistos e uma nova revisão será emitida. Ao aprovar, o cliente declara que leu e concorda com o escopo, os valores e as condições desta proposta e autoriza a execução nos termos aqui descritos.'
  },
  posVenda: {
    TECNICA: { prazoDiasUteis: 2, modulo: 'cronograma_execucao', checklist: ['Conferir o escopo e os itens vendidos', 'Abrir o processo: contrato, ordem de serviço ou ordem de metrologia', 'Agendar a execução com o cliente', 'Definir a equipe e a logística da viagem'] },
    COMPRAS: { prazoDiasUteis: 1, modulo: 'comercial', checklist: ['Conferir os produtos e peças do pedido', 'Verificar estoque ou cotar fornecedores', 'Emitir o pedido de compra', 'Informar o prazo de entrega ao vendedor'] },
    FINANCEIRO: { prazoDiasUteis: 2, modulo: 'comercial', checklist: ['Conferir os dados de faturamento do cliente (CNPJ, endereço, e-mail)', 'Faturar e emitir a nota fiscal conforme a condição de pagamento', 'Programar a bonificação de viagem dos técnicos (quando houver)', 'Acompanhar o recebimento'] },
    areaDoSetor: { TECNICA: 'TECNICA', COMPRAS: 'LOGISTICA', FINANCEIRO: 'FINANCEIRO' },
    destinatarios: { TECNICA: [], COMPRAS: [], FINANCEIRO: [] },
    pedidoParadoDiasUteis: 1
  },
  referencias: { metaMensal: 600000, ticketServicos: 3817.64, ticketContratos: 10000, primeiraRespostaHoras: 24, higieneMetaPct: 100 },
  gestores: [],
  // cobrança sutil: WhatsApp nunca pelo Comercial (o retorno é atividade, e a atividade já entra no resumo diário).
  avisos: { emailExpediente: true }
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Com_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Com_up_(v) { return Com_s_(v).toUpperCase(); }
// BUSCA (27/10/2026): os cadastros misturam "FUNDACAO" e "FUNDAÇÃO", "URUACU" e "Uruaçu"; a busca antiga só passava para
// minúsculas e exigia o texto inteiro, na ordem, e por isso "não achava nada". Agora: sem acento, sem maiúscula, sem
// pontuação, por partes (todas as palavras digitadas, em qualquer ordem) e números também sem pontuação (CNPJ, PROP-2026-0001).
function Com_normBusca_(v) {
  var s = Com_s_(v).toLowerCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}
function Com_termosBusca_(q) { var n = Com_normBusca_(q); return n ? n.split(' ') : []; }
/** true quando todas as palavras de termos (Com_termosBusca_) aparecem no texto (string ou lista de partes). */
function Com_casaBusca_(termos, texto) {
  if (!termos || !termos.length) return true;
  var n = Com_normBusca_(Array.isArray(texto) ? texto.join(' ') : texto);
  if (!n) return false;
  var t = n + ' ' + n.replace(/ /g, '');
  for (var i = 0; i < termos.length; i++) if (t.indexOf(termos[i]) < 0) return false;
  return true;
}
function Com_agora_() { return Utilities.formatDate(new Date(), COM_FUSO, "yyyy-MM-dd'T'HH:mm"); }
function Com_hoje_() { return Utilities.formatDate(new Date(), COM_FUSO, 'yyyy-MM-dd'); }
function Com_2_(n) { return (n < 10 ? '0' : '') + n; }
function Com_json_(t, padrao) { try { var v = JSON.parse(Com_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Com_copia_(o) { return JSON.parse(JSON.stringify(o)); }
function Com_texto_(v, max) { var s = Com_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }

/** Data de qualquer formato do banco -> "aaaa-mm-ddThh:mm" (ou só a data). '' se não der para ler. */
function Com_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, COM_FUSO, "yyyy-MM-dd'T'HH:mm");
  var s = Com_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (m) {
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) && m[4]) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, COM_FUSO, "yyyy-MM-dd'T'HH:mm"); }
    return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] : '');
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] : '') : '';
}
function Com_dia_(v) { return Com_iso_(v).slice(0, 10); }
function Com_br_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(Com_iso_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function Com_brDia_(v) { return Com_br_(v).slice(0, 10); }
function Com_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Com_s_(dia));
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Com_2_(t.getUTCMonth() + 1) + '-' + Com_2_(t.getUTCDate());
}
function Com_diasEntre_(diaA, diaB) {
  var a = /^(\d{4})-(\d{2})-(\d{2})/.exec(Com_s_(diaA)), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(Com_s_(diaB));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 864e5);
}
function Com_expediente_() { try { return typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null; } catch (e) { return null; } }
function Com_somarDiasUteis_(dia, n) { return typeof Ges_somarDiasUteis_ === 'function' ? Ges_somarDiasUteis_(dia, n, Com_expediente_()) : Com_somarDias_(dia, n); }
function Com_diasUteisEntre_(a, b) { return typeof Ges_diasUteisEntre_ === 'function' ? Ges_diasUteisEntre_(a, b, Com_expediente_()) : Math.max(0, Com_diasEntre_(a, b) || 0); }

/** Número de entrada da tela ou do banco: number, "1.234,56", "1234.56", "15%". NaN se não for número. Nunca chama SGO_UTILS.toNumber. */
function Com_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = Com_s_(v).replace(/R\$|%|\s/g, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}
function Com_r2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }
/** "R$ 1.234,56" (pt-BR, nunca toFixed cru na tela). */
function Com_moeda_(v) { return 'R$ ' + (typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(v) || 0, 2) : String(Com_r2_(v)).replace('.', ',')); }
function Com_pct_(v, casas) { return (typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(v) || 0, casas === undefined ? 1 : casas) : String(v)) + '%'; }
function Com_plural_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }

/** Marca de conferência do conteúdo (SHA-256 em hexadecimal; sem o serviço, uma marca simples). */
function Com_marca_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  } catch (e) {
    var h1 = 5381, h2 = 52711, s = String(texto || '');
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = ((h1 << 5) + h1 + c) | 0; h2 = ((h2 << 5) + h2 ^ c) | 0; }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
}

function Com_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  }
}

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
function Com_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('COM_ABAS_OK_V2')) return; } catch (e) {}
  Object.keys(COM_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, COM_COLUNAS[aba]);
    COM_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (COM_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('COM_ABAS_OK_V2', '1', 21600); } catch (e) {}
}

function Com_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

function Com_historico_(entidade, id, tipo, eu, extra) {
  var e = extra || {};
  try {
    SGO_DATA.insert(COM_ABAS.HISTORICO, { ENTIDADE: entidade, ENTIDADE_ID: id, TIPO: tipo, DE: Com_texto_(e.de, 300), PARA: Com_texto_(e.para, 300), TEXTO: Com_texto_(e.texto, 4000),
      USUARIO_ID: Com_s_(eu && eu.id), USUARIO_NOME: Com_s_(eu && eu.nome), DATA: Com_agora_() });
  } catch (x) { console.error('Comercial, histórico: ' + ((x && x.message) || x)); }
}

/** Próximo número anual: PROP-2026-0001, OPO-2026-0001. Conferido contra o maior número já gravado (nunca repete). Chamar dentro da trava. */
function Com_proximoNumero_(sigla, aba, coluna) {
  var ano = Com_hoje_().slice(0, 4), chave = 'COM_SEQ_' + sigla + '_' + ano, props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty(chave)) || 0;
  var re = new RegExp('^' + sigla + '-' + ano + '-(\\d+)$');
  Com_ler_(aba).forEach(function (r) { var m = re.exec(Com_s_(r[coluna])); if (m && Number(m[1]) > seq) seq = Number(m[1]); });
  seq++;
  props.setProperty(chave, String(seq));
  var n = String(seq);
  while (n.length < 4) n = '0' + n;
  return sigla + '-' + ano + '-' + n;
}

// ------------------------------------------------------------
// METODOLOGIA (configuração editável e versionada)
// ------------------------------------------------------------
var COM_METODOLOGIA_MEMO = null;

/** Metodologia em vigor: o padrão completado pela última versão gravada. Nunca lança. */
function Com_metodologia_() {
  // memória curta: o servidor reaproveita o processo entre chamadas, e outra pessoa pode ter gravado uma versão nova
  if (COM_METODOLOGIA_MEMO && Date.now() - COM_METODOLOGIA_MEMO.em < 20000) return COM_METODOLOGIA_MEMO.m;
  var m = Com_copia_(COM_METODOLOGIA_PADRAO), gravada = null;
  try {
    var linhas = Com_ler_(COM_ABAS.CONFIG).filter(function (r) { return Com_s_(r.CHAVE) === 'METODOLOGIA'; });
    linhas.sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
    if (linhas.length) { gravada = Com_json_(linhas[linhas.length - 1].VALOR_JSON, null); m.versao = Number(linhas[linhas.length - 1].VERSAO) || m.versao; m.atualizadaEm = Com_br_(linhas[linhas.length - 1].ATUALIZADO_EM); m.atualizadaPor = Com_s_(linhas[linhas.length - 1].ATUALIZADO_POR_NOME); }
  } catch (e) { gravada = null; }
  if (gravada && typeof gravada === 'object') {
    Object.keys(gravada).forEach(function (k) {
      if (k === 'versao' || !(k in COM_METODOLOGIA_PADRAO)) return;
      var v = gravada[k], p = COM_METODOLOGIA_PADRAO[k];
      if (p && typeof p === 'object' && !Array.isArray(p) && v && typeof v === 'object' && !Array.isArray(v)) {
        Object.keys(v).forEach(function (kk) { m[k][kk] = v[kk]; });
      } else if (v !== undefined && v !== null) m[k] = v;
    });
  }
  COM_METODOLOGIA_MEMO = { em: Date.now(), m: m };
  return m;
}

/** Confere uma metodologia antes de gravar. Lança erro no padrão "o que + por que + o que fazer". */
function Com_validarMetodologia_(m) {
  if (!m || typeof m !== 'object') throw new Error('a metodologia veio vazia. Atualize a tela e salve de novo');
  if (!Array.isArray(m.funis) || !m.funis.length) throw new Error('é preciso pelo menos um funil com etapas. Recarregue o padrão ou acrescente um funil e salve de novo');
  m.funis.forEach(function (f) {
    if (!Com_s_(f.codigo) || !Com_s_(f.nome)) throw new Error('todo funil precisa de código e nome. Preencha e salve de novo');
    if (!Array.isArray(f.etapas) || f.etapas.length < 2) throw new Error('o funil ' + f.nome + ' precisa de pelo menos duas etapas. Acrescente as etapas e salve de novo');
    var ult = -1;
    f.etapas.forEach(function (e) {
      var p = Com_num_(e.probabilidade);
      if (!Com_s_(e.codigo) || !Com_s_(e.nome)) throw new Error('toda etapa do funil ' + f.nome + ' precisa de código e nome. Preencha e salve de novo');
      if (!(p >= 0 && p <= 100) || p < ult) throw new Error('a probabilidade das etapas do funil ' + f.nome + ' precisa crescer de 0 a 100 (a etapa ' + e.nome + ' está com ' + e.probabilidade + '). Corrija e salve de novo');
      ult = p;
    });
  });
  if (!Array.isArray(m.motivosPerda) || m.motivosPerda.length < 2) throw new Error('a lista de motivos de perda precisa de pelo menos dois motivos. Acrescente e salve de novo');
  if (!Array.isArray(m.origens) || !m.origens.length) throw new Error('a lista de origens está vazia. Acrescente pelo menos uma origem e salve de novo');
  var d = Com_num_(m.politica && m.politica.descontoMaxPct);
  if (!(d >= 0 && d <= 100)) throw new Error('o desconto máximo sem aprovação precisa ficar entre 0% e 100%. Corrija em Política de desconto e salve de novo');
  var mg = Com_num_(m.politica && m.politica.margemMinPct);
  if (!(mg >= 0 && mg < 100)) throw new Error('a margem mínima precisa ficar entre 0% e 99%. Use 0 para não conferir margem. Corrija e salve de novo');
  var c = m.cadencia || {};
  if (!(Com_num_(c.paradaDias) > Com_num_(c.esfriandoDias))) throw new Error('"parada" precisa ser mais dias que "esfriando" (hoje ' + c.paradaDias + ' e ' + c.esfriandoDias + '). Corrija em Cadência e salve de novo');
  if (!(Com_num_(c.propostaEscalaDiaUtil) > Com_num_(c.propostaLembreteDiaUtil))) throw new Error('a gestão entra depois do lembrete ao vendedor nas propostas sem resposta. Corrija em Cadência e salve de novo');
  var v = Com_num_(m.proposta && m.proposta.validadeDias);
  if (!(v >= 1 && v <= 365)) throw new Error('a validade padrão da proposta fica entre 1 e 365 dias. Corrija e salve de novo');
}

function Com_gravarMetodologia_(m, eu, motivo) {
  Com_validarMetodologia_(m);
  var atual = Com_metodologia_(), limpa = {};
  Object.keys(COM_METODOLOGIA_PADRAO).forEach(function (k) { if (k !== 'versao' && m[k] !== undefined) limpa[k] = m[k]; });
  var versao = (Number(atual.versao) || 1) + 1;
  SGO_DATA.insert(COM_ABAS.CONFIG, { CHAVE: 'METODOLOGIA', VALOR_JSON: JSON.stringify(limpa), VERSAO: versao, MOTIVO: Com_texto_(motivo, 500),
    ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Com_agora_() });
  COM_METODOLOGIA_MEMO = null;
  Com_historico_('METODOLOGIA', 'METODOLOGIA', 'VERSAO', eu, { para: 'versão ' + versao, texto: Com_texto_(motivo, 500) });
  return versao;
}

function Com_funil_(codigo, met) {
  met = met || Com_metodologia_();
  return met.funis.filter(function (f) { return f.codigo === codigo; })[0] || null;
}
function Com_etapa_(funil, codigo, met) {
  var f = typeof funil === 'string' ? Com_funil_(funil, met) : funil;
  return f ? f.etapas.filter(function (e) { return e.codigo === codigo; })[0] || null : null;
}

// ------------------------------------------------------------
// QUEM É QUEM NO COMERCIAL
// ------------------------------------------------------------
function Com_usuarios_() {
  var mapa = {};
  Com_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Com_up_(u.PERFIL);
    if (!perfil || perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return;
    mapa[Com_s_(u.ID)] = { id: Com_s_(u.ID), nome: Com_s_(u.NOME) || Com_s_(u.USUARIO), login: Com_s_(u.USUARIO), perfil: perfil, area: Com_up_(u.AREA),
      email: Com_s_(u.EMAIL).toLowerCase(), ativo: Com_up_(u.STATUS || 'ATIVO') === 'ATIVO' };
  });
  return mapa;
}

function Com_ehDono_(login) { try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(login); } catch (e) { return false; } }

/** Gestores comerciais configurados: metodologia.gestores + Caixa de decisões (gestoresPorArea.COMERCIAL). */
function Com_gestoresConfigurados_() {
  var ids = (Com_metodologia_().gestores || []).map(Com_s_).filter(Boolean);
  try { var g = typeof Ges_cfg_ === 'function' ? (Ges_cfg_().gestoresPorArea || {}).COMERCIAL : null; (g || []).forEach(function (id) { if (ids.indexOf(Com_s_(id)) < 0) ids.push(Com_s_(id)); }); } catch (e) {}
  return ids;
}

/**
 * Nível de acesso de uma pessoa: { nivel: GESTAO|VENDEDOR|FINANCEIRO|NENHUM, gestao, vendedor, financeiro, veValores, veCusto, diretoria }.
 * u: { id, perfil, area, login }.
 */
function Com_nivelDe_(u, gestoresCfg) {
  var perfil = Com_up_(u && u.perfil), area = Com_up_(u && u.area), id = Com_s_(u && u.id);
  var diretoria = perfil === 'DIRETORIA' || Com_ehDono_(u && u.login);
  var gestores = gestoresCfg || Com_gestoresConfigurados_();
  var gestao = perfil === 'ADMIN' || diretoria || (perfil === 'GESTOR' && area === 'COMERCIAL') || (!!id && gestores.indexOf(id) >= 0 && perfil !== 'CLIENTE');
  var vendedor = !gestao && (perfil === 'COMERCIAL' || (area === 'COMERCIAL' && perfil !== 'CLIENTE' && perfil !== 'RH'));
  var financeiro = !gestao && !vendedor && (perfil === 'FINANCEIRO' || area === 'FINANCEIRO');
  var nivel = gestao ? 'GESTAO' : vendedor ? 'VENDEDOR' : financeiro ? 'FINANCEIRO' : 'NENHUM';
  // 21/10/2026 (pedido do dono): o catálogo de produtos e serviços (preço e custo) é mantido também pelo Financeiro. O RH não
  // entra no Comercial (não vê valores de venda).
  var catalogo = gestao || financeiro;
  return { nivel: nivel, gestao: gestao, vendedor: vendedor, financeiro: financeiro, veValores: nivel !== 'NENHUM', veCusto: catalogo, catalogo: catalogo, diretoria: diretoria };
}

/** Quem está chamando (sessão), com o nível no Comercial. Não lança por falta de acesso: quem chama decide. */
function Com_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); } catch (e) { u = null; }
  var eu = { id: Com_s_(s.userId), nome: Com_s_(s.nome) || Com_s_(s.usuario), login: Com_s_(s.usuario), perfil: Com_up_(s.perfil), area: Com_up_(u && u.AREA), email: Com_s_(u && u.EMAIL).toLowerCase() };
  var n = Com_nivelDe_(eu);
  Object.keys(n).forEach(function (k) { eu[k] = n[k]; });
  return eu;
}

var COM_MSG_SEM_ACESSO = 'o Comercial é da equipe comercial (perfil Comercial ou área Comercial), da gestão comercial, da Diretoria e do Administrador; o Financeiro vê só os pedidos aprovados. ' +
  'Se você precisa trabalhar no Comercial, peça ao Administrador para ajustar o seu perfil ou a sua área em Administração > Usuários';

function Com_exigir_(eu, nivel, acao) {
  var ok = nivel === 'GESTAO' ? eu.gestao : nivel === 'VENDEDOR' ? (eu.gestao || eu.vendedor) : nivel === 'FINANCEIRO' ? (eu.gestao || eu.vendedor || eu.financeiro) : false;
  if (ok) return eu;
  if (eu.financeiro && nivel === 'VENDEDOR') throw new Error('Não foi possível ' + acao + ': o Financeiro vê só os pedidos aprovados (Comercial > Pedidos aprovados). Oportunidades e propostas em andamento ficam com a equipe comercial');
  if ((eu.vendedor || eu.financeiro) && nivel === 'GESTAO') throw new Error('Não foi possível ' + acao + ': esta ação é da gestão comercial (gestor com área Comercial, Diretoria ou Administrador). Peça a um deles');
  throw new Error('Não foi possível ' + acao + ': ' + COM_MSG_SEM_ACESSO);
}

/** Vendedores ativos (perfil Comercial ou área Comercial) e a gestão comercial, para os seletores. */
function Com_equipeComercial_() {
  var us = Com_usuarios_(), gest = Com_gestoresConfigurados_(), lista = [];
  Object.keys(us).forEach(function (id) {
    var u = us[id];
    if (!u.ativo) return;
    var n = Com_nivelDe_(u, gest);
    if (n.vendedor || (n.gestao && (u.perfil !== 'ADMIN' || u.area === 'COMERCIAL') && !(typeof Areas_contaDoSistema_ === 'function' && Areas_contaDoSistema_({ USUARIO: u.login, NOME: u.nome })))) {
      lista.push({ id: id, nome: u.nome, papel: n.gestao ? 'Gestão comercial' : 'Vendedor', gestao: n.gestao, email: !!u.email });
    }
  });
  return lista.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** Ids da gestão comercial que recebem decisões: configurados ou Gestor com área Comercial; sem ninguém, a Diretoria (reserva). */
function Com_idsGestaoComercial_(excluir) {
  excluir = excluir || [];
  var us = Com_usuarios_(), ids = Com_gestoresConfigurados_().filter(function (id) { return us[id] && us[id].ativo; });
  Object.keys(us).forEach(function (id) { var u = us[id]; if (u.ativo && u.perfil === 'GESTOR' && u.area === 'COMERCIAL' && ids.indexOf(id) < 0) ids.push(id); });
  ids = ids.filter(function (id) { return excluir.indexOf(id) < 0; });
  if (ids.length) return ids;
  var dir = Object.keys(us).filter(function (id) { return us[id].ativo && (us[id].perfil === 'DIRETORIA' || Com_ehDono_(us[id].login)) && excluir.indexOf(id) < 0; });
  if (dir.length) return dir;
  return Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'ADMIN' && excluir.indexOf(id) < 0; });
}

// ------------------------------------------------------------
// AVISOS DO COMERCIAL (sistema na hora; e-mail só no expediente; nunca WhatsApp; nunca valor)
// ------------------------------------------------------------
/**
 * Aviso a uma pessoa da equipe. Aparece no Início (central de pendências) até ser lido na tela do Comercial.
 * opcoes.email: também por e-mail, que sai pelo notificador comum (categoria COMERCIAL) só dentro do expediente.
 * O texto nunca leva valor: quem chama escreve sem R$.
 */
function Com_avisar_(destId, tipo, titulo, texto, ref, opcoes) {
  if (!destId) return;
  var o = opcoes || {};
  try {
    SGO_DATA.insert(COM_ABAS.AVISOS, { DESTINATARIO_ID: Com_s_(destId), TIPO: tipo, TITULO: Com_texto_(titulo, 200), TEXTO: Com_texto_(texto, 2000),
      REF_TIPO: Com_s_(ref && ref.tipo), REF_ID: Com_s_(ref && ref.id), DATA: Com_agora_(), LIDO_EM: '', EMAIL_SITUACAO: o.email ? 'PENDENTE' : '', EMAIL_EM: '', EMAIL_MOTIVO: '' });
  } catch (e) { console.error('Comercial, aviso: ' + ((e && e.message) || e)); }
}

/** E-mails guardados dos avisos: um por pessoa por rodada, só no expediente, pelo notificador comum. Nunca lança. */
function Com_enviarEmailsPendentes_() {
  try {
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
    if (!ex.dentro || typeof SGO_notificar_ !== 'function') return { enviados: 0, fora: !ex.dentro };
    var porPessoa = {}, limite = Com_somarDias_(Com_hoje_(), -5), velhos = [];
    Com_ler_(COM_ABAS.AVISOS).forEach(function (v) {
      if (Com_s_(v.EMAIL_SITUACAO) !== 'PENDENTE') return;
      if (Com_dia_(v.DATA) && Com_dia_(v.DATA) < limite) { velhos.push(v); return; }
      (porPessoa[Com_s_(v.DESTINATARIO_ID)] = porPessoa[Com_s_(v.DESTINATARIO_ID)] || []).push(v);
    });
    var enviados = 0, agora = Com_agora_();
    Object.keys(porPessoa).forEach(function (dest) {
      var l = porPessoa[dest];
      var titulo = l.length === 1 ? 'Comercial: ' + l[0].TITULO : 'Comercial: ' + l.length + ' avisos';
      var texto = l.map(function (v, i) { return (l.length > 1 ? (i + 1) + '. ' : '') + v.TITULO + '\n' + v.TEXTO; }).join('\n\n') + '\n\nVeja no SGO+, em Comercial.';
      var r = { ok: 0 };
      try { r = SGO_notificar_({ usuarios: [dest], canais: ['email'], titulo: titulo, texto: texto, origem: 'COMERCIAL', categoria: 'COMERCIAL', refId: l.map(function (v) { return v.ID; }).join(',').slice(0, 80) }) || { ok: 0 }; }
      catch (e) { r = { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
      var sit = r.ok ? 'ENVIADO' : (r.pulado ? 'PULADO' : 'ERRO');
      if (r.ok) enviados++;
      l.forEach(function (v) { SGO_DATA.update(COM_ABAS.AVISOS, v.ID, { EMAIL_SITUACAO: sit, EMAIL_EM: agora, EMAIL_MOTIVO: Com_texto_(r.motivo, 300) }); });
    });
    velhos.forEach(function (v) { SGO_DATA.update(COM_ABAS.AVISOS, v.ID, { EMAIL_SITUACAO: 'PULADO', EMAIL_EM: agora, EMAIL_MOTIVO: 'aviso guardado há mais de 5 dias; não foi mais enviado' }); });
    return { enviados: enviados };
  } catch (e) { console.error('Comercial, e-mails: ' + ((e && e.message) || e)); return { enviados: 0, erro: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// MINHAS ATIVIDADES (retornos ao cliente e pendências dos setores)
// ------------------------------------------------------------
/** Roda fn com a identidade da rotina do Comercial nas APIs de Minhas atividades (vale só nesta execução). */
function Com_comoSistema_(fn) {
  var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null;
  var token = 'COMERCIAL-' + Utilities.getUuid();
  ATV_PONTE_CTX = { token: token, eu: { id: 'COMERCIAL', usuario: 'sistema', nome: 'Comercial (rotina)', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  try { return fn(token); } finally { ATV_PONTE_CTX = anterior; }
}

/**
 * Cria uma atividade em Minhas atividades. Sem valores no título nem na descrição.
 * o: { sessionId (quando é a própria pessoa lançando), responsavelId, titulo, descricao, prazo ('aaaa-mm-ddThh:mm'), prioridade,
 *      modulo, moduloNome, clienteId, unidadeId, porQue, onde, como, restrita }
 * Devolve o ID ou lança com a mensagem de Minhas atividades.
 */
function Com_criarAtividade_(o) {
  if (typeof Atividades_apiCriar !== 'function') throw new Error('Minhas atividades não está disponível neste servidor');
  // a identidade da rotina (Com_comoSistema_) não passa por Atividades_sessao_, que é quem cria as abas: garante aqui
  if (typeof Atividades_garantirAbas_ === 'function') Atividades_garantirAbas_();
  var payload = { titulo: Com_texto_(o.titulo, 200), descricao: Com_texto_(o.descricao, 4000), prazo: o.prazo, prioridade: o.prioridade || 'Normal', responsavelId: o.responsavelId,
    modulo: o.modulo || 'comercial', moduloNome: o.moduloNome || 'Comercial', clienteId: o.clienteId || '', unidadeId: o.unidadeId || '',
    porQue: o.porQue || '', onde: o.onde || '', como: o.como || '', restrita: o.restrita === false ? '' : 'SIM' };
  var r;
  if (o.sessionId) r = Atividades_apiCriar(o.sessionId, payload);
  else if (o.comoPessoa && Com_s_(o.comoPessoa.id) === Com_s_(o.responsavelId)) {
    // a própria pessoa disparou (enviou a proposta, registrou a resposta): a atividade é dela, sem o aviso de "nova atividade para você"
    var ant = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null, tk = 'COMERCIAL-P-' + Utilities.getUuid();
    ATV_PONTE_CTX = { token: tk, eu: { id: Com_s_(o.comoPessoa.id), usuario: Com_s_(o.comoPessoa.login), nome: Com_s_(o.comoPessoa.nome), perfil: Com_up_(o.comoPessoa.perfil) || 'COMERCIAL', gestor: false, sistema: 'SGO+' } };
    try { r = Atividades_apiCriar(tk, payload); } finally { ATV_PONTE_CTX = ant; }
  } else r = Com_comoSistema_(function (t) { return Atividades_apiCriar(t, payload); });
  if (!r || !r.ok || !r.item) throw new Error(String((r && r.message) || 'Minhas atividades não respondeu').replace(/^Não foi possível [^:]+:\s*/, '').replace(/[.\s]+$/, ''));
  return Com_s_(r.item.ID);
}

/** Muda a situação de uma atividade ligada (Concluída / Cancelada). Nunca lança. */
function Com_mudarAtividade_(id, situacao, texto) {
  if (!id || typeof Atividades_apiMudarSituacao !== 'function') return false;
  try {
    var r = Com_comoSistema_(function (t) { return Atividades_apiMudarSituacao(t, { id: id, situacao: situacao, observacao: Com_texto_(texto, 1500), motivo: Com_texto_(texto, 1500) || 'Encerrada pelo Comercial.' }); });
    return !!(r && r.ok);
  } catch (e) { return false; }
}

/** Atividade (linha) por id; null se não existir. */
function Com_atividade_(id) {
  if (!id || typeof Atividades_abas_ !== 'function') return null;
  try { return SGO_DATA.getById(Atividades_abas_().ATIVIDADES, id); } catch (e) { return null; }
}
function Com_atividadeAberta_(a) { return !!a && a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; }

/** Prazo "aaaa-mm-ddThh:mm" a partir de data (e hora opcional) da tela. '' se inválido. */
function Com_prazo_(data, hora) {
  var d = Com_dia_(data);
  if (!d) return '';
  var h = /^([01]\d|2[0-3]):[0-5]\d$/.test(Com_s_(hora)) ? Com_s_(hora) : (Com_iso_(data).slice(11, 16) || '17:00');
  return d + 'T' + h;
}
