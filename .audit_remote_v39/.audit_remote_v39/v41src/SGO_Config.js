const SGO_CFG = (() => {
  const props = PropertiesService.getScriptProperties();


  return {

    /* =========================
       IDENTIDADE DO SISTEMA
    ========================== */
    APP_NAME: "PORTAL SGO+ VERSÃO CNPJ",
    VERSION: "1.0.1",
    LOGO_URL: "https://drive.google.com/thumbnail?id=1WuoymOh5_0S2X3jC2otSq89HMltdDEoP&sz=w800",

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

    DB_KEYS: {
      PRINCIPAL: "PRINCIPAL",
      OS: "OS",
      FROTA: "FROTA",
      ESTOQUE: "ESTOQUE"
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
      get FOLDER_ETIQUETAS() { return props.getProperty("FOLDER_ETIQUETAS") || ""; }
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
      TECNICOS: true
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
      CAD_TECNICOS: "CAD_TECNICOS"
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

    ALERTAS_V2: {
      DIAS_CONTRATO: 60,
      DIAS_FROTA_DOCUMENTO: 30,
      DIAS_FROTA_MANUTENCAO: 15,
      KM_FROTA_MANUTENCAO: 500,
      OS_SEM_TECNICO_HORAS: 24
    }

  };
})();
