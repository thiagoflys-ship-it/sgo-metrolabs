const SGO_CFG = (() => {
  const props = PropertiesService.getScriptProperties();

  return {

    /* =========================
       IDENTIDADE DO SISTEMA
    ========================== */
    APP_NAME: "PORTAL SGO+ VERSÃO CNPJ",
    VERSION: "1.0.1",
    LOGO_URL: "https://drive.google.com/thumbnail?id=1z_mcZjLJdbcPy0RTtOsQVEryinWSudT4&sz=w800",

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

    /* =========================
       ARMAZENAMENTO NO DRIVE
    ========================== */
    DRIVE: {
      get FOLDER_BASE() { return props.getProperty("FOLDER_BASE") || ""; },
      get FOLDER_RELATORIOS() { return props.getProperty("FOLDER_RELATORIOS") || ""; },
      get FOLDER_QRCODES() { return props.getProperty("FOLDER_QRCODES") || ""; },
      get FOLDER_DOCUMENTOS() { return props.getProperty("FOLDER_DOCUMENTOS") || ""; },
      get FOLDER_OS_FOTOS() { return props.getProperty("FOLDER_OS_FOTOS") || ""; },
      get FOLDER_OS_ASSINATURAS() { return props.getProperty("FOLDER_OS_ASSINATURAS") || ""; },
      get FOLDER_OS_DOCUMENTOS() { return props.getProperty("FOLDER_OS_DOCUMENTOS") || ""; }
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
      // DIRETORIA: tratado como gestão em todo o sistema (isAdminPerfilAuth_,
      // Avisos, Atividades, Auvo), mas faltava aqui — não dava para cadastrar.
      "DIRETORIA",
      "GESTOR",
      "TECNICO",
      "METROLOGIA",
      "COMERCIAL",
      "FINANCEIRO",
      // RH (19/10/2026): vê o que um colaborador vê, publica avisos, consulta o
      // Programa de conduta e a lista de usuários de todos; não emite documento
      // técnico nem abre Chaves e senhas ou Configurações. Regras em SGO_Auth.js
      // (SGO_ehPerfilRH_ / SGO_bloquearRH_ / SGO_podeConsultarPessoas_).
      "RH",
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

      /* CADEIA DE FRIO — porte nativo (sem iframe), URL mantida só como
         referência do standalone original */
      CADEIA_FRIO:
        "https://script.google.com/macros/s/AKfycbycv287aWYHH9RWHthMnJ2Pc_DpNakH1n2hP0-tijg/exec",

      /* ESTUFA+BANHO-MARIA — porte nativo (sem iframe), URL mantida só como
         referência do standalone original */
      ESTUFA_BANHOMARIA:
        "https://script.google.com/macros/s/AKfycbyL-9wb0Jq0cObLPgMvU6a-fv3yS3Q_a1qTYwpfearG/dev",

      /* DECLARAÇÃO DE EXECUÇÃO DE SERVIÇO — módulo nativo desde o
         início (nunca teve standalone) — valor aqui é só um marcador
         não-vazio, exigido pelo checklist de "motor configurado" do
         renderMotorModulo_ */
      DECLARACAO_EXEC: "nativo",

      /* RELATÓRIO DE CALIBRAÇÃO — módulo nativo separado (2026-07-24),
         mesmo padrão de DECLARACAO_EXEC (nunca teve standalone) */
      RELATORIO_CALIBRACAO: "nativo",

      /* RELATÓRIO DE QUALIFICAÇÃO (QI/QO/QD) — desmembrado da Declaração
         de Execução de Serviço em 2026-07-25 (mesmo motivo do RELATORIO_
         CALIBRACAO: página única ficando comprida/confusa demais com os
         2 fluxos juntos). Backend continua o mesmo (SGO_DeclaracaoExec_*),
         só o frontend/menu virou independente — ver SGO_DeclaracaoExecQIQO_
         ConteudoModulo.js / JS_DeclaracaoExecQIQO.html */
      DECLARACAO_QIQO: "nativo",

      /* PLANEJAMENTO CME — porte nativo em 2026-07-28 (antes era iframe
         apontando pro standalone metrolabs_planejamento_cme); mesmo padrão
         de DECLARACAO_EXEC (valor aqui é só um marcador não-vazio, exigido
         pelo checklist de "motor configurado" do renderMotorModulo_) */
      PLANEJAMENTO_CME: "nativo",

      /* CRONOGRAMA DE EXECUÇÃO — módulo nativo desde o início (2026-08-11),
         mesmo padrão de DECLARACAO_EXEC/PLANEJAMENTO_CME (nunca teve
         standalone; valor aqui é só um marcador não-vazio) */
      CRONOGRAMA_EXECUCAO: "nativo",

      /* PGT E POP — ENGENHARIA CLÍNICA — módulo nativo desde o início
         (2026-08-13), mesmo padrão dos demais módulos nativos */
      PGT_POP: "nativo",

      /* REGISTROS OPERACIONAIS — módulo nativo desde o início
         (2026-08-15), mesmo padrão dos demais módulos nativos */
      REG_OP: "nativo",

      /* INVENTÁRIO DE EQUIPAMENTOS — módulo nativo desde o início
         (2026-08-18), v1 enxuta: só lê CAD_CLIENTES/CAD_UNIDADES/
         CAD_EQUIPAMENTOS/DOC_DOCUMENTOS (já existentes), sem tabela nova.
         Porte adaptado de SGO_Inventario.js (portal principal) */
      INVENTARIO: "nativo",

      /* CERTIFICADO DE CALIBRAÇÃO — módulo nativo desde o início
         (2026-08-20). Diferente do RELATORIO_CALIBRACAO (que só LÊ um
         certificado externo já pronto via IA): este EMITE o certificado
         do zero, calculando tendência/incerteza expandida/graus de
         liberdade/fator de abrangência (GUM/EA-4/02), integrado ao
         cadastro real de CAD_CLIENTES/CAD_EQUIPAMENTOS/CAD_TECNICOS.
         Valor aqui é só um marcador não-vazio, mesmo padrão dos demais
         módulos nativos */
      CERTIFICADO_CALIBRACAO: "nativo",

      /* LAUDO NR-13 (VASO DE PRESSÃO) — módulo nativo (2026-08-24).
         Relatório de Inspeção de Segurança de vaso de pressão (item 13.5
         da NR-13), categorização automática (Tabelas 1 e 2 da norma),
         integrado ao mesmo cadastro real de clientes/equipamentos. Valor
         aqui é só um marcador não-vazio, mesmo padrão dos demais módulos
         nativos */
      NR13: "nativo",

      /* FROTA — módulo nativo desde o início (2026-08-20). Controle de
         veículos/condutores, retirada/devolução com checklist de
         não-conformidades + fotos, manutenção com alerta de vencimento
         por KM/data, despesas e paradas. Valor aqui é só um marcador
         não-vazio, mesmo padrão dos demais módulos nativos */
      FROTA: "nativo",

      /* INTEGRAÇÃO AUVO — módulo nativo (2026-08-26). Sincronização de
         mão única SGO -> Auvo (Clientes, Técnicos/Usuários, Tarefas).
         Acesso restrito a Gestor/Administrador. Valor aqui é só um
         marcador não-vazio, mesmo padrão dos demais módulos nativos */
      AUVO: "nativo",

      /* PAINEL DE QUALIDADE — módulo nativo (2026-08-28). Agrega
         pendências de qualidade de outros módulos (Auvo, Frota, NR-13)
         num só lugar — não tem cadastro próprio, só lê. Acesso restrito
         a Gestor/Administrador. Valor aqui é só um marcador não-vazio,
         mesmo padrão dos demais módulos nativos */
      QUALIDADE: "nativo",

      /* PROGRAMA DE CONDUTA, PONTUAÇÃO E BONIFICAÇÃO — módulo nativo
         (2026-09-02, ANX-CAT-001 Rev.00). Catálogo de ocorrências,
         homologação, missões, fechamento mensal (ICO/farol) e os dois
         benefícios variáveis (Bônus Coletivo + Incentivo de Missão).
         Separado do PAINEL DE QUALIDADE acima (que é só cobrança/elogio
         ligado ao Auvo). Valor aqui é só um marcador não-vazio, mesmo
         padrão dos demais módulos nativos */
      CONDUTA: "nativo"
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
      CADEIA_FRIO: true,
      ESTUFA_BANHOMARIA: true,
      DECLARACAO_EXEC: true,
      RELATORIO_CALIBRACAO: true,
      DECLARACAO_QIQO: true,
      PLANEJAMENTO_CME: true,
      CRONOGRAMA_EXECUCAO: true,
      PGT_POP: true,
      REG_OP: true,
      INVENTARIO: true,
      CERTIFICADO_CALIBRACAO: true,
      NR13: true,
      FROTA: true,
      AUVO: true,
      QUALIDADE: true,
      CONDUTA: true
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
      SYS_ALERTAS: "SYS_ALERTAS",
      SYS_LOGS: "SYS_LOGS",

      /* ORDENS DE SERVIÇO + AGENDA/MISSÕES — 2026-08-17 */
      CAD_TECNICOS: "CAD_TECNICOS",

      /* CERTIFICADO DE CALIBRAÇÃO — 2026-08-20 (ver SGO_CertCal_Main.js
         Bootstrap_, que cria/repara estas 2 abas sob demanda, sem tocar
         nas outras — setupSGO() em SGO_Setup.js também as inclui pra
         instalações novas do zero, mas NUNCA deve ser reexecutado numa
         base já em produção, porque limpa todas as abas que gerencia) */
      CAD_PADROES: "CAD_PADROES",
      CERT_CALIBRACAO: "CERT_CALIBRACAO",

      /* FROTA — 2026-08-20 (ver SGO_Frota_Main.js Frota_bootstrap_, que
         cria/repara estas abas sob demanda, sem tocar nas outras) */
      CAD_VEICULOS: "CAD_VEICULOS",
      CAD_CONDUTORES: "CAD_CONDUTORES",
      REG_FROTA_MOVIMENTACAO: "REG_FROTA_MOVIMENTACAO",
      REG_FROTA_MANUTENCAO: "REG_FROTA_MANUTENCAO",
      REG_FROTA_DESPESA: "REG_FROTA_DESPESA",
      REG_FROTA_PARADA: "REG_FROTA_PARADA",
      REG_FROTA_DOCUMENTO: "REG_FROTA_DOCUMENTO", // Fase 2 (2026-08-25) — central de documentos do veículo
      REG_FROTA_MULTA: "REG_FROTA_MULTA", // Fase 3 (2026-08-25) — multas com cruzamento automático por data/hora x condutor
      REG_FROTA_ABASTECIMENTO: "REG_FROTA_ABASTECIMENTO", // Fase 6 (2026-08-25) — litros/valor, consumo médio km/L

      /* INTEGRAÇÃO AUVO — 2026-08-26 (ver SGO_Auvo_Main.js Auvo_bootstrap_,
         que cria/repara esta aba sob demanda, sem tocar nas outras).
         Mapeamento ENTIDADE_ID (SGO) <-> AUVO_ID, evita colunas novas em
         CAD_CLIENTES/CAD_USUARIOS/etc. */
      AUVO_SYNC: "AUVO_SYNC",
      /* Espelho de Tarefas/atendimentos do Auvo, trazidas sob demanda
         pela sincronização incremental diária (2026-08-27). */
      AUVO_TAREFAS: "AUVO_TAREFAS",
      /* Foto sempre atual das O.S. abertas no Auvo (qualquer idade, não só
         janela recente) — regravada por completo a cada atualização, ver
         SGO_Auvo_Pendencias.js (2026-08-31). */
      AUVO_PENDENCIAS: "AUVO_PENDENCIAS",

      /* MINHAS ATIVIDADES / ATIVIDADES DA EQUIPE — 2026-10-16 (ver
         SGO_Atividades.js Atividades_garantirAbas_, que cria/completa
         estas abas sob demanda, sem tocar nas outras) */
      ATV_ATIVIDADES: "ATV_ATIVIDADES",
      ATV_HISTORICO: "ATV_HISTORICO",
      ATV_AVISOS: "ATV_AVISOS",

      /* AVISOS DA GESTÃO COM CIÊNCIA — 2026-10-16 (ver SGO_Avisos.js
         Avisos_garantirAbas_, criadas sob demanda, sem tocar nas outras) */
      AVS_AVISOS: "AVS_AVISOS",
      AVS_CIENCIA: "AVS_CIENCIA",
      AVS_ANEXOS: "AVS_ANEXOS",

      /* REGISTRO DE NOTIFICAÇÕES POR E-MAIL/WHATSAPP — 2026-10-16
         (ver SGO_Notificar.js SGO_notificar_) */
      NTF_ENVIOS: "NTF_ENVIOS",
    },

    /* =========================
       STATUS PADRÃO
    ========================== */
    STATUS: {
      ATIVO: "ATIVO",
      INATIVO: "INATIVO",
      PENDENTE: "PENDENTE",
      BLOQUEADO: "BLOQUEADO"
    }

  };
})();