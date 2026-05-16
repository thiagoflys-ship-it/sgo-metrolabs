const SGO_CFG = (() => {
  const props = PropertiesService.getScriptProperties();


  return {

    /* =========================
       IDENTIDADE DO SISTEMA
    ========================== */
    APP_NAME: "PORTAL SGO+ VERSÃO CNPJ",
    VERSION: "1.0.1",
    LOGO_URL: "https://drive.google.com/thumbnail?id=1WuoymOh5_0S2X3jC2otSq89HMltdDEoP&sz=w800",
    LOGO_FILE_ID: "1WuoymOh5_0S2X3jC2otSq89HMltdDEoP",

    /* =========================
       EMPRESA EMISSORA (dados fixos que aparecem nos PDFs)
    ========================== */
    EMPRESA_EMISSORA: {
      RAZAO_SOCIAL:  "METROLABS SOLUCOES EM ENGENHARIA CLINICA LTDA",
      NOME_FANTASIA: "METROLABS SOLUCOES EM ENGENHARIA CLINICA",
      CNPJ:          "32.487.278/0001-21",
      ENDERECO:      "Rua C 155, n 789, Quadra 365, Lote 08, Jardim America",
      CIDADE_UF:     "Goiania/GO",
      CEP:           "74.275-150",
      TELEFONE:      "(62) 3123-1595",
      EMAIL:         "administrativo@metrolabs.com.br",
      SITE:          ""
    },

    /* =========================
       BANCO DE DADOS (SPREADSHEET ID)
    ========================== */
    get DB_ID() {
      return props.getProperty("DB_ID");
    },

    set DB_ID(value) {
      if (value && String(value).trim() !== "") {
        props.setProperty("DB_ID", String(value).trim());
      } else {
        props.deleteProperty("DB_ID");
      }
    },

    get DB_OS_ID() {
      return props.getProperty("DB_OS_ID");
    },

    set DB_OS_ID(value) {
      if (value && String(value).trim() !== "") {
        props.setProperty("DB_OS_ID", String(value).trim());
      } else {
        props.deleteProperty("DB_OS_ID");
      }
    },

    get DB_FROTA_ID() {
      return props.getProperty("DB_FROTA_ID");
    },

    set DB_FROTA_ID(value) {
      if (value && String(value).trim() !== "") {
        props.setProperty("DB_FROTA_ID", String(value).trim());
      } else {
        props.deleteProperty("DB_FROTA_ID");
      }
    },

    get DB_ESTOQUE_ID() {
      return props.getProperty("DB_ESTOQUE_ID");
    },

    set DB_ESTOQUE_ID(value) {
      if (value && String(value).trim() !== "") {
        props.setProperty("DB_ESTOQUE_ID", String(value).trim());
      } else {
        props.deleteProperty("DB_ESTOQUE_ID");
      }
    },

    get DB_COMERCIAL_ID() {
      return props.getProperty("DB_COMERCIAL_ID");
    },

    set DB_COMERCIAL_ID(value) {
      if (value && String(value).trim() !== "") {
        props.setProperty("DB_COMERCIAL_ID", String(value).trim());
      } else {
        props.deleteProperty("DB_COMERCIAL_ID");
      }
    },

    DB_KEYS: {
      PRINCIPAL: "PRINCIPAL",
      OS: "OS",
      FROTA: "FROTA",
      ESTOQUE: "ESTOQUE",
      COMERCIAL: "COMERCIAL"
    },

    /* =========================
       ARMAZENAMENTO NO DRIVE
    ========================== */
    DRIVE: {
      get FOLDER_BASE() { return props.getProperty("FOLDER_BASE") || ""; },
      get FOLDER_RELATORIOS() { return props.getProperty("FOLDER_RELATORIOS") || ""; },
      get FOLDER_QRCODES() { return props.getProperty("FOLDER_QRCODES") || ""; },
      get FOLDER_DOCUMENTOS() { return props.getProperty("FOLDER_DOCUMENTOS") || ""; },
      get FOLDER_CLIENTES() { return props.getProperty("FOLDER_CLIENTES") || ""; },
      get FOLDER_OS() { return props.getProperty("FOLDER_OS") || ""; },
      get FOLDER_MISSOES() { return props.getProperty("FOLDER_MISSOES") || ""; },
      get FOLDER_FROTA() { return props.getProperty("FOLDER_FROTA") || ""; },
      get FOLDER_PECAS() { return props.getProperty("FOLDER_PECAS") || ""; },
      get FOLDER_FORNECEDORES() { return props.getProperty("FOLDER_FORNECEDORES") || ""; },
      get FOLDER_ESTOQUE() { return props.getProperty("FOLDER_ESTOQUE") || ""; },
      get FOLDER_ETIQUETAS() { return props.getProperty("FOLDER_ETIQUETAS") || ""; },
      get FOLDER_ASSISTENCIA_TECNICA() { return props.getProperty("FOLDER_ASSISTENCIA_TECNICA") || props.getProperty("FOLDER_DOCUMENTOS") || ""; },
      get FOLDER_ORCAMENTOS() { return props.getProperty("FOLDER_ORCAMENTOS") || ""; }
    },

    /* =========================
       SESSÃO E PERFORMANCE
    ========================== */
    SESSION_TTL: 21600,
    CACHE_TTL: 21600,

    /* =========================
       PERFIS DE USUÁRIOS
    ========================== */
    PROFILES: [
      "ADMIN",
      "DIRETORIA",
      "GESTOR",
      "TECNICO",
      "METROLOGIA",
      "COMERCIAL",
      "FINANCEIRO",
      "CLIENTE"
    ],

    /* =========================
       MOTORES (WEBAPPS EXTERNOS)
    ========================== */
    MOTORES: {

      /* AUTOCLAVE */
      AUTOCLAVE_TEMPLATE:
        "https://script.google.com/macros/s/AKfycbwtVx6AJD3WwLCQShW3u5Vxovr1qmnskzjxHm8E8R1dFc1iMrWRecgrPfunRYzjJ4g55g/exec",

      AUTOCLAVE_RELATORIO:
        "https://script.google.com/macros/s/AKfycbyJGLvJ0riegSOziZIClvGtS-c2ZFnXlA5w2mqwmR0SQxshA5CE9PXiICTX_dMSesabSA/exec",

      /* LAVADORA */
      LAVADORA_TEMPLATE:
        "https://script.google.com/macros/s/AKfycbwv1iylXlf9RZAiOYQrfpJSnis3_C-cvXyOMl11JK3EkBe5VAHYPjVih5nPOW7mIT6IoQ/exec",

      LAVADORA_RELATORIO:
        "https://script.google.com/macros/s/AKfycbw7MQaNi1yMU2MfH6Qqj3ICATfVG3_m9qp5Sz7khSztIVv2NjJf_48VwU5OD__Y8t8/exec",

      /* NOVO MÓDULO */
      RELATORIO_CONFORMIDADE:
        "https://script.google.com/macros/s/AKfycbyvQX6Kt0P5n2bn313MsOYQGeEwxht_z3tLH96p9cPLTBYAgiFpEPrM3h69mTs9J-11/exec"
    },

    /* =========================
       OCIOSIDADE
    ========================== */
    OCIOSIDADE: {
      TEMPO_LIMITE_SEGUNDOS: 300,
      SOM_ATIVO_PADRAO: true,
      ALERTA_VISUAL: true
    },

    /* =========================
       ALERTAS
    ========================== */
    ALERTAS: {
      DIAS_ANTECEDENCIA_PADRAO: 30,
      MOSTRAR_NO_DASHBOARD: true
    },

    /* =========================
       MENSAGENS MOTIVACIONAIS
    ========================== */
    MENSAGENS_MOTIVACIONAIS: [
      "Disciplina vence talento todos os dias.",
      "Qualidade não é opção, é padrão.",
      "Você não trabalha com equipamentos, você trabalha com vidas.",
      "Excelência é fazer bem feito mesmo quando ninguém está vendo.",
      "Cada relatório seu sustenta a credibilidade da Metrolabs.",
      "Foco, padrão e consistência — esse é o jogo.",
      "Pequenos detalhes fazem grandes auditorias passarem.",
      "Quem domina o processo domina o resultado.",
      "Seu trabalho impacta diretamente a segurança do paciente.",
      "Alta performance é hábito, não evento."
    ],

    /* =========================
       CONFIGURAÇÕES GERAIS
    ========================== */
    SISTEMA: {
      NOME_EXIBICAO: "PORTAL SGO+ VERSÃO CNPJ",
      MODO_DEBUG: false,
      TIMEZONE: "America/Sao_Paulo",
      LOCALE: "pt_BR"
    },

    /* =========================
       MÓDULOS ATIVOS
    ========================== */
    MODULOS: {
      DASHBOARD: true,
      CLIENTES: true,
      EQUIPAMENTOS: true,
      DOCUMENTOS: true,
      ADMIN: true,
      AUTOCLAVE: true,
      LAVADORA: true,
      RELATORIO_CONFORMIDADE: true,
      PECAS: true,
      CONTRATOS: true,
      OS: true,
      MISSOES: true,
      FROTA: true,
      DASHBOARD_BI: true,
      FORNECEDORES: true,
      ESTOQUE: true,
      RASTREABILIDADE: true,
      ETIQUETAS: true,
      TECNICOS: true,
      ASSISTENCIA_TECNICA: true,
      ORCAMENTOS: true
    },

    /* =========================
       ABAS OFICIAIS
    ========================== */
    SHEETS: {
      CFG_SISTEMA: "CFG_SISTEMA",
      CAD_USUARIOS: "CAD_USUARIOS",
      CAD_CLIENTES: "CAD_CLIENTES",
      CAD_UNIDADES: "CAD_UNIDADES",
      CAD_EQUIPAMENTOS: "CAD_EQUIPAMENTOS",
      DOC_DOCUMENTOS: "DOC_DOCUMENTOS",
      REG_TECNICO: "REG_TECNICO",
      SYS_ALERTAS: "SYS_ALERTAS",
      SYS_LOGS: "SYS_LOGS",
      CAD_PECAS: "CAD_PECAS",
      CAD_CONTRATOS: "CAD_CONTRATOS",
      CAD_CONTRATOS_EQP: "CAD_CONTRATOS_EQP",
      SYS_ASSINATURAS: "SYS_ASSINATURAS",
      OS_ORDENS: "OS_ORDENS",
      OS_FOTOS: "OS_FOTOS",
      OS_CHECKLIST_MODELOS: "OS_CHECKLIST_MODELOS",
      OS_CHECKLIST_PERGUNTAS: "OS_CHECKLIST_PERGUNTAS",
      OS_CHECKLIST_RESPOSTAS: "OS_CHECKLIST_RESPOSTAS",
      OS_CHECKLIST_TEMPLATE: "OS_CHECKLIST_TEMPLATE",
      OS_MATERIAIS: "OS_MATERIAIS",
      AGD_MISSOES: "AGD_MISSOES",
      AGD_APONTAMENTOS: "AGD_APONTAMENTOS",
      FRT_VEICULOS: "FRT_VEICULOS",
      FRT_AGENDAMENTOS: "FRT_AGENDAMENTOS",
      FRT_VISTORIAS: "FRT_VISTORIAS",
      FRT_ABASTECIMENTOS: "FRT_ABASTECIMENTOS",
      FRT_MANUTENCAO: "FRT_MANUTENCAO",
      FRT_MOVIMENTOS: "FRT_MOVIMENTOS",
      FRT_LAVAGENS: "FRT_LAVAGENS",
      FRT_MULTAS: "FRT_MULTAS",
      FRT_ALERTAS: "FRT_ALERTAS",
      FRT_DOCUMENTOS: "FRT_DOCUMENTOS",
      FROTA_VEICULOS: "FROTA_VEICULOS",
      FROTA_RESERVAS: "FROTA_RESERVAS",
      FROTA_MOVIMENTOS: "FROTA_MOVIMENTOS",
      FROTA_VISTORIAS: "FROTA_VISTORIAS",
      FROTA_ABASTECIMENTOS: "FROTA_ABASTECIMENTOS",
      FROTA_MANUTENCOES: "FROTA_MANUTENCOES",
      FROTA_LAVAGENS: "FROTA_LAVAGENS",
      FROTA_MULTAS: "FROTA_MULTAS",
      FROTA_ALERTAS: "FROTA_ALERTAS",
      FROTA_DOCUMENTOS: "FROTA_DOCUMENTOS",
      FROTA_UPLOADS: "FROTA_UPLOADS",
      FROTA_LOGS: "FROTA_LOGS",
      CAD_FORNECEDORES: "CAD_FORNECEDORES",
      FORN_DOCUMENTOS: "FORN_DOCUMENTOS",
      FORN_QUALIFICACAO: "FORN_QUALIFICACAO",
      EST_ITENS: "EST_ITENS",
      EST_LOTES: "EST_LOTES",
      EST_NOTAS_FISCAIS: "EST_NOTAS_FISCAIS",
      EST_ENTRADAS: "EST_ENTRADAS",
      EST_SAIDAS: "EST_SAIDAS",
      EST_MOVIMENTACOES: "EST_MOVIMENTACOES",
      HST_PECAS_EQUIPAMENTO: "HST_PECAS_EQUIPAMENTO",
      SYS_ETIQUETAS: "SYS_ETIQUETAS",
      CAD_TECNICOS: "CAD_TECNICOS",
      AST_ENTRADAS: "AST_ENTRADAS",
      AST_ACESSORIOS: "AST_ACESSORIOS",
      AST_FOTOS: "AST_FOTOS",
      AST_DIAGNOSTICOS: "AST_DIAGNOSTICOS",
      AST_PECAS: "AST_PECAS",
      AST_MOVIMENTACOES: "AST_MOVIMENTACOES",
      AST_DOCUMENTOS: "AST_DOCUMENTOS",
      AST_ALERTAS: "AST_ALERTAS",
      AST_TERCEIROS: "AST_TERCEIROS",
      AST_TERCEIROS_ACESSORIOS: "AST_TERCEIROS_ACESSORIOS",
      AST_TERCEIROS_ANEXOS: "AST_TERCEIROS_ANEXOS",
      AST_TERCEIROS_ACOMPANHAMENTOS: "AST_TERCEIROS_ACOMPANHAMENTOS",
      AST_TERCEIROS_DOCUMENTOS: "AST_TERCEIROS_DOCUMENTOS",
      AST_LAB_ENTRADAS: "AST_LAB_ENTRADAS",
      AST_LAB_ENSAIOS: "AST_LAB_ENSAIOS",
      AST_LAB_PADROES: "AST_LAB_PADROES",
      AST_LAB_RESULTADOS: "AST_LAB_RESULTADOS",
      AST_LAB_DOCUMENTOS: "AST_LAB_DOCUMENTOS",
      AST_LAB_EVIDENCIAS: "AST_LAB_EVIDENCIAS",
      AST_TESTES_BANCADA: "AST_TESTES_BANCADA",
      AST_EXECUCOES: "AST_EXECUCOES",
      AST_INDICADORES_DIARIOS: "AST_INDICADORES_DIARIOS",
      AST_PRODUTIVIDADE_TECNICOS: "AST_PRODUTIVIDADE_TECNICOS",
      AST_CONFORMIDADE: "AST_CONFORMIDADE",
      AST_RELATORIOS_GERADOS: "AST_RELATORIOS_GERADOS",
      // V2 — núcleo reconstruído da Assistência Técnica
      AST_ENTRADAS_LEGADO: "AST_ENTRADAS_LEGADO",
      AST_ATENDIMENTOS: "AST_ATENDIMENTOS",
      AST_HISTORICO: "AST_HISTORICO",
      AST_ASSINATURAS: "AST_ASSINATURAS",
      AST_SOLICITACOES: "AST_SOLICITACOES",
      // Orçamentos / Mini-CRM
      ORC_CONFIG: "ORC_CONFIG",
      ORC_ORCAMENTOS: "ORC_ORCAMENTOS",
      ORC_ITENS: "ORC_ITENS",
      ORC_TEMPLATES: "ORC_TEMPLATES",
      ORC_TEMPLATES_ITENS: "ORC_TEMPLATES_ITENS",
      ORC_HISTORICO: "ORC_HISTORICO",
      ORC_EMAILS: "ORC_EMAILS",
      ORC_APROVACOES: "ORC_APROVACOES",
      ORC_DOCUMENTOS: "ORC_DOCUMENTOS",
      ORC_ANEXOS: "ORC_ANEXOS",
      ORC_ALERTAS: "ORC_ALERTAS",
      ORC_FOLLOWUPS: "ORC_FOLLOWUPS",
      ORC_LEADS: "ORC_LEADS"
    },

    /* =========================
       STATUS PADRÃO
    ========================== */
    STATUS: {
      ATIVO: "ATIVO",
      INATIVO: "INATIVO",
      PENDENTE: "PENDENTE",
      BLOQUEADO: "BLOQUEADO"
    },

    OS: {
      TIPOS: [
        "MANUTENCAO_CORRETIVA",
        "MANUTENCAO_PREVENTIVA",
        "ATENDIMENTO",
        "CALIBRACAO",
        "QUALIFICACAO",
        "ENSAIO_SEGURANCA_ELETRICA",
        "VISTORIA",
        "INSTALACAO",
        "ORCAMENTO",
        "TREINAMENTO",
        "OUTRO"
      ],
      PRIORIDADES: ["BAIXA", "NORMAL", "ALTA", "CRITICA"],

      RESULTADO_ATENDIMENTO: [
        "RESOLVIDO",
        "RESOLVIDO_COM_RESSALVA",
        "NAO_RESOLVIDO",
        "NECESSITA_ORCAMENTO",
        "NECESSITA_RETORNO"
      ],

      TIPOS_FOTO: [
        "PLAQUETA",
        "ANTES",
        "DURANTE",
        "DEPOIS",
        "DEFEITO_ENCONTRADO",
        "PECA_SUBSTITUIDA",
        "TESTE_FINAL",
        "DOCUMENTO",
        "OUTRO"
      ],
      STATUS: {
        ABERTA: "ABERTA",
        AGUARDANDO_AGENDAMENTO: "AGUARDANDO_AGENDAMENTO",
        AGENDADA: "AGENDADA",
        EM_DESLOCAMENTO: "EM_DESLOCAMENTO",
        EM_EXECUCAO: "EM_EXECUCAO",
        AGUARDANDO_ASSINATURA: "AGUARDANDO_ASSINATURA",
        CONCLUIDA_TECNICAMENTE: "CONCLUIDA_TECNICAMENTE",
        CONCLUIDA: "CONCLUIDA",
        EM_APROVACAO: "EM_APROVACAO",
        APROVADA: "APROVADA",
        REJEITADA: "REJEITADA",
        FATURADA: "FATURADA",
        CANCELADA: "CANCELADA"
      },
      STATUS_FATURAMENTO: {
        NAO_LIBERADO: "NAO_LIBERADO",
        LIBERADO: "LIBERADO",
        FATURADO: "FATURADO",
        NAO_FATURAVEL: "NAO_FATURAVEL"
      },
      SLA_DEFAULTS_HORAS: {
        MANUTENCAO_CORRETIVA: 24,
        MANUTENCAO_PREVENTIVA: 72,
        CORRETIVA: 24,
        PREVENTIVA: 72,
        CALIBRACAO: 120,
        QUALIFICACAO: 120,
        ENSAIO_SEGURANCA_ELETRICA: 120,
        ENSAIO_ELETRICO: 120,
        VISTORIA: 72,
        INSTALACAO: 72,
        ORCAMENTO: 48,
        TREINAMENTO: 72,
        OUTRO: 72
      }
    },

    MISSOES: {
      STATUS: {
        CRIADA: "CRIADA",
        AGENDADA: "AGENDADA",
        EM_DESLOCAMENTO: "EM_DESLOCAMENTO",
        EM_EXECUCAO: "EM_EXECUCAO",
        CONCLUIDA: "CONCLUIDA",
        CANCELADA: "CANCELADA"
      }
    },

    FROTA: {
      STATUS_VEICULO: {
        DISPONIVEL: "DISPONIVEL",
        EM_USO: "EM_USO",
        MANUTENCAO: "MANUTENCAO",
        BLOQUEADO: "BLOQUEADO",
        INATIVO: "INATIVO"
      }
    },

    ESTOQUE: {
      STATUS_ITEM: {
        ATIVO: "ATIVO",
        INATIVO: "INATIVO",
        BLOQUEADO: "BLOQUEADO"
      },
      STATUS_LOTE: {
        DISPONIVEL: "DISPONIVEL",
        RESERVADO: "RESERVADO",
        ESGOTADO: "ESGOTADO",
        VENCIDO: "VENCIDO",
        BLOQUEADO: "BLOQUEADO"
      },
      MOVIMENTOS: {
        ENTRADA_NF: "ENTRADA_NF",
        SAIDA_OS: "SAIDA_OS",
        AJUSTE_ENTRADA: "AJUSTE_ENTRADA",
        AJUSTE_SAIDA: "AJUSTE_SAIDA",
        BLOQUEIO: "BLOQUEIO",
        DESBLOQUEIO: "DESBLOQUEIO"
      }
    },

    FORNECEDORES: {
      DOCUMENTOS_OBRIGATORIOS: ["ALVARA", "ANVISA"],
      STATUS_QUALIFICACAO: {
        QUALIFICADO: "QUALIFICADO",
        PENDENTE: "PENDENTE",
        VENCIDO: "VENCIDO",
        BLOQUEADO: "BLOQUEADO"
      }
    },

    ASSISTENCIA_TECNICA: {
      STATUS: {
        ENTRADA: "ENTRADA",
        TRIAGEM: "TRIAGEM",
        DIAGNOSTICO: "DIAGNOSTICO",
        ORCAMENTO: "ORCAMENTO",
        AGUARDANDO_APROVACAO: "AGUARDANDO_APROVACAO",
        AGUARDANDO_PECAS: "AGUARDANDO_PECAS",
        MANUTENCAO: "MANUTENCAO",
        TESTE: "TESTE",
        LABORATORIO: "LABORATORIO",
        ENTRADA_LABORATORIO: "ENTRADA_LABORATORIO",
        LAB_EM_PROCESSO: "LAB_EM_PROCESSO",
        LAB_ENTRADA_REGISTRADA: "LAB_ENTRADA_REGISTRADA",
        LAB_AGUARDANDO_ENSAIO: "LAB_AGUARDANDO_ENSAIO",
        LAB_EM_ENSAIO: "LAB_EM_ENSAIO",
        LAB_AGUARDANDO_ANALISE: "LAB_AGUARDANDO_ANALISE",
        LAB_ANALISE_CONCLUIDA: "LAB_ANALISE_CONCLUIDA",
        LAB_AGUARDANDO_CERTIFICADO: "LAB_AGUARDANDO_CERTIFICADO",
        LAB_CERTIFICADO_GERADO: "LAB_CERTIFICADO_GERADO",
        LAB_RELATORIO_GERADO: "LAB_RELATORIO_GERADO",
        LAB_AGUARDANDO_APROVACAO: "LAB_AGUARDANDO_APROVACAO",
        LAB_APROVADO: "LAB_APROVADO",
        LAB_APROVADO_COM_RESSALVA: "LAB_APROVADO_COM_RESSALVA",
        LAB_REPROVADO: "LAB_REPROVADO",
        LAB_BLOQUEADO: "LAB_BLOQUEADO",
        LAB_PRONTO_PARA_ENTREGA: "LAB_PRONTO_PARA_ENTREGA",
        LAB_ENTREGUE: "LAB_ENTREGUE",
        LAB_CANCELADO: "LAB_CANCELADO",
        TERCEIROS: "TERCEIROS",
        AGUARDANDO_TERCEIRO: "AGUARDANDO_TERCEIRO",
        ENVIADO_PARA_TERCEIRO: "ENVIADO_PARA_TERCEIRO",
        TERCEIRO_RECEBIDO_METROLABS: "TERCEIRO_RECEBIDO_METROLABS",
        TERCEIRO_INSPECAO_RETORNO: "TERCEIRO_INSPECAO_RETORNO",
        TERCEIRO_ATRASADO: "TERCEIRO_ATRASADO",
        TERCEIRO_EXTRAVIADO: "TERCEIRO_EXTRAVIADO",
        PRONTO_ENTREGA: "PRONTO_ENTREGA",
        ENTREGUE: "ENTREGUE",
        CANCELADO: "CANCELADO",
        SEM_REPARO: "SEM_REPARO",
        ATRASADO: "ATRASADO"
      },
      PRIORIDADES: ["BAIXA", "NORMAL", "ALTA", "CRITICA"],
      TIPOS_FOTO: [
        "CHEGADA", "AVARIA", "ACESSORIO", "ETIQUETA", "NUMERO_SERIE",
        "PARTE_INTERNA", "PLACA", "DEFEITO", "TESTE_BANCADA", "PECA",
        "SAIDA", "RETORNO_TERCEIRO", "ENTREGA"
      ],
      BANDEIRAS: {
        VERDE: ["PRONTO_ENTREGA", "ENTREGUE", "TESTE_APROVADO", "CONCLUIDO", "LAB_APROVADO", "LAB_CERTIFICADO_GERADO", "LAB_RELATORIO_GERADO", "LAB_PRONTO_PARA_ENTREGA"],
        AMARELO: ["DIAGNOSTICO", "ORCAMENTO", "AGUARDANDO_APROVACAO", "AGUARDANDO_PECAS", "TESTE", "TERCEIROS", "AGUARDANDO_TERCEIRO", "ENVIADO_PARA_TERCEIRO", "LABORATORIO", "ENTRADA_LABORATORIO", "LAB_EM_PROCESSO", "LAB_AGUARDANDO_ENSAIO", "LAB_EM_ENSAIO", "LAB_AGUARDANDO_ANALISE", "LAB_AGUARDANDO_CERTIFICADO"],
        VERMELHO: ["ATRASADO", "PARADO", "SEM_ATUALIZACAO", "SEM_RESPONSAVEL", "CRITICO", "TERCEIRO_ATRASADO", "TERCEIRO_EXTRAVIADO", "LAB_REPROVADO", "LAB_BLOQUEADO"],
        AZUL_CINZA: ["ENTRADA", "TRIAGEM"]
      },

      // V2 — status padronizados do rebuild
      STATUS_V2: {
        ENTRADA_REGISTRADA: "ENTRADA_REGISTRADA",
        AGUARDANDO_DIAGNOSTICO: "AGUARDANDO_DIAGNOSTICO",
        EM_BANCADA: "EM_BANCADA",
        DIAGNOSTICO_EM_ANDAMENTO: "DIAGNOSTICO_EM_ANDAMENTO",
        DIAGNOSTICO_CONCLUIDO: "DIAGNOSTICO_CONCLUIDO",
        AGUARDANDO_ORCAMENTO: "AGUARDANDO_ORCAMENTO",
        ORCAMENTO_ENVIADO: "ORCAMENTO_ENVIADO",
        AGUARDANDO_APROVACAO_CLIENTE: "AGUARDANDO_APROVACAO_CLIENTE",
        ORCAMENTO_APROVADO: "ORCAMENTO_APROVADO",
        ORCAMENTO_RECUSADO: "ORCAMENTO_RECUSADO",
        AGUARDANDO_PECA: "AGUARDANDO_PECA",
        AGUARDANDO_TERCEIRO: "AGUARDANDO_TERCEIRO",
        LIBERADO_PARA_EXECUCAO: "LIBERADO_PARA_EXECUCAO",
        EXECUCAO_EM_ANDAMENTO: "EXECUCAO_EM_ANDAMENTO",
        EXECUCAO_CONCLUIDA: "EXECUCAO_CONCLUIDA",
        AGUARDANDO_CALIBRACAO: "AGUARDANDO_CALIBRACAO",
        CONCLUIDO_TECNICAMENTE: "CONCLUIDO_TECNICAMENTE",
        AGUARDANDO_ENTREGA: "AGUARDANDO_ENTREGA",
        ENTREGUE: "ENTREGUE",
        CANCELADO: "CANCELADO",
        NAO_REPARADO: "NAO_REPARADO"
      },

      BANDEIRAS_V2: {
        AZUL_CINZA: ["ENTRADA_REGISTRADA"],
        AMARELO: [
          "AGUARDANDO_DIAGNOSTICO", "EM_BANCADA", "DIAGNOSTICO_EM_ANDAMENTO",
          "DIAGNOSTICO_CONCLUIDO", "AGUARDANDO_ORCAMENTO", "ORCAMENTO_ENVIADO",
          "AGUARDANDO_APROVACAO_CLIENTE", "ORCAMENTO_APROVADO", "AGUARDANDO_PECA",
          "AGUARDANDO_TERCEIRO", "LIBERADO_PARA_EXECUCAO", "EXECUCAO_EM_ANDAMENTO",
          "AGUARDANDO_CALIBRACAO"
        ],
        VERDE: ["EXECUCAO_CONCLUIDA", "CONCLUIDO_TECNICAMENTE", "AGUARDANDO_ENTREGA", "ENTREGUE"],
        VERMELHO: ["ORCAMENTO_RECUSADO", "CANCELADO", "NAO_REPARADO"]
      },

      TIPOS_ASSINATURA_V2: [
        "RECEBIMENTO_CLIENTE",
        "RECEBIMENTO_FUNCIONARIO",
        "ENTREGA_CLIENTE",
        "ENTREGA_FUNCIONARIO",
        "AUTORIZACAO_SERVICO",
        "CIENCIA_ORCAMENTO",
        "CIENCIA_NAO_REPARO"
      ],

      TIPOS_FOTO_V2: [
        "CHEGADA", "AVARIA", "ACESSORIO", "ETIQUETA", "NUMERO_SERIE",
        "PARTE_INTERNA", "PLACA", "DEFEITO", "DIAGNOSTICO", "PECA",
        "EXECUCAO", "TESTE_FINAL", "SAIDA", "ENTREGA", "OUTRO"
      ],

      TIPOS_SOLICITACAO: ["PECA", "SERVICO", "TERCEIRO", "OUTRO"],

      STATUS_SOLICITACAO: {
        AGUARDANDO_ORCAMENTO: "AGUARDANDO_ORCAMENTO",
        ORCAMENTO_ENVIADO: "ORCAMENTO_ENVIADO",
        AGUARDANDO_APROVACAO_CLIENTE: "AGUARDANDO_APROVACAO_CLIENTE",
        ORCAMENTO_APROVADO: "ORCAMENTO_APROVADO",
        ORCAMENTO_RECUSADO: "ORCAMENTO_RECUSADO",
        AGUARDANDO_PECA: "AGUARDANDO_PECA",
        PECA_COMPRADA: "PECA_COMPRADA",
        PECA_RECEBIDA: "PECA_RECEBIDA",
        LIBERADO_PARA_EXECUCAO: "LIBERADO_PARA_EXECUCAO",
        CANCELADO: "CANCELADO"
      },

      RESULTADO_EXECUCAO_V2: [
        "REPARADO_COM_SUCESSO",
        "REPARADO_PARCIALMENTE",
        "NAO_FOI_POSSIVEL_REPARAR",
        "CLIENTE_NAO_AUTORIZOU",
        "AGUARDANDO_CALIBRACAO",
        "ENCAMINHADO_TERCEIRO"
      ],

      RESULTADO_CONCLUSAO_V2: [
        "APROVADO_PARA_DEVOLUCAO",
        "APROVADO_COM_RESSALVA",
        "REPROVADO",
        "NAO_REPARADO_SEM_AUTORIZACAO",
        "NAO_REPARADO_INVIABILIDADE_TECNICA",
        "ENCAMINHADO_CALIBRACAO",
        "ENCAMINHADO_DESCARTE_SUBSTITUICAO"
      ]
    },

    ALERTAS_V2: {
      DIAS_CONTRATO: 60,
      DIAS_FROTA_DOCUMENTO: 30,
      DIAS_FROTA_MANUTENCAO: 15,
      KM_FROTA_MANUTENCAO: 500,
      OS_SEM_TECNICO_HORAS: 24
    }

  };
})();
