/**
 * ============================================================
 * METROLABS — CARTA DE CONFORMIDADE / RELATÓRIO TÉCNICO
 * ARQUIVO: Config.gs
 * VERSÃO: V2.0 PESADA — TEXTOS TÉCNICOS POR EQUIPAMENTO
 *
 * OBJETIVO:
 * - Substituir o Config anterior.
 * - Manter arquitetura por perfil.
 * - Fortalecer textos técnicos de QI, QO, QD, metodologia,
 *   rastreabilidade, normas, critérios e conclusão.
 * - Evitar redundância e impedir mistura entre equipamentos.
 *
 * REGRA CENTRAL:
 * Cada equipamento tem identidade técnica própria.
 * Nada genérico deve ser usado no relatório final.
 * ============================================================
 */

const CFG = {
  APP: {
    NOME: "METROLABS • Carta de Conformidade Técnica",
    VERSAO: "2.0.0",
    MODULO: "CARTA_CONFORMIDADE_METROLABS_V2",
    TIMEZONE: "America/Sao_Paulo"
  },

  EMPRESA: {
    NOME: "Metrolabs Soluções em Engenharia Clínica",
    CNPJ: "32.487.278/0001-21",
    ENDERECO: "Rua C-155, nº 789, Setor Jardim América, Goiânia – GO",
    RESPONSAVEL_TECNICO: "Eng. Clínico Douglas Silva dos Santos Souza",
    CREA: ""
  },

  LOGO_ID: "1WuoymOh5_0S2X3jC2otSq89HMltdDEoP",

  DRIVE: {
    PASTA_RAIZ: "METROLABS_CARTA_CONFORMIDADE_V2",
    PASTA_PDFS: "01_PDFS_GERADOS",
    PASTA_DOCS: "02_DOCS_GERADOS",
    PASTA_TEMP: "99_TEMP",
    PASTA_ASSINATURAS: "ASSINATURAS"
  },

  PLANILHA: {
    NOME: "METROLABS_CARTA_CONFORMIDADE_DB_V2",
    ABAS: {
      CONFIG: "CFG_SISTEMA",
      CLIENTES: "CAD_CLIENTES",
      EQUIPAMENTOS: "CAD_EQUIPAMENTOS",
      EXECUCOES: "MOV_EXECUCOES",
      RELATORIOS: "MOV_RELATORIOS",
      DOCUMENTOS: "MOV_DOCUMENTOS",
      ESTERILIZACAO_CICLOS: "MOV_ESTERILIZACAO_CICLOS",
      ESTERILIZACAO_INSUMOS: "MOV_ESTERILIZACAO_INSUMOS",
      LAVAGEM_CICLOS: "MOV_LAVAGEM_CICLOS",
      LAVAGEM_TESTES: "MOV_LAVAGEM_TESTES",
      ENSAIOS_TERMICOS: "MOV_ENSAIOS_TERMICOS",
      ENSAIOS_GERAIS: "MOV_ENSAIOS_GERAIS",
      INSPECOES_NR13: "MOV_INSPECOES_NR13",
      LOGS: "LOG_SISTEMA"
    }
  },

  IDS: {
    PREFIXO_CLIENTE: "CLI",
    PREFIXO_EQUIPAMENTO: "EQP",
    PREFIXO_EXECUCAO: "EXE",
    PREFIXO_RELATORIO: "REL",
    PREFIXO_DOCUMENTO: "DOC",
    PREFIXO_CICLO: "CIC",
    PREFIXO_INSUMO: "INS",
    PREFIXO_ENSAIO: "ENS",
    PREFIXO_NR13: "NR13",
    PREFIXO_LOG: "LOG"
  },

  FAMILIAS: {
    ESTERILIZACAO: "Esterilização",
    LAVAGEM_DESINFECCAO: "Limpeza / Lavagem / Desinfecção",
    CADEIA_FRIA: "Cadeia Fria / Qualificação Térmica",
    LABORATORIAL_GERAL: "Equipamentos Laboratoriais e Assistenciais",
    NR13: "NR-13 / Vaso de Pressão"
  },

  QUALIFICACOES: {
    QI: "Qualificação de Instalação",
    QO: "Qualificação de Operação",
    QD: "Qualificação de Desempenho",
    INSPECAO: "Inspeção Técnica",
    VERIFICACAO: "Verificação Técnica",
    QUALIFICACAO_TERMICA: "Qualificação Térmica"
  },

  STATUS_AVALIACAO: [
    "Aprovado",
    "Aprovado com Ressalvas",
    "Reprovado",
    "Pendente"
  ],

  TEXTOS_GERAIS: {
    CABECALHO_PRELIMINAR:
      "Este documento técnico preliminar registra, de forma estruturada e rastreável, as evidências principais observadas durante a execução das atividades declaradas. A Carta de Conformidade não substitui o relatório técnico completo, porém constitui evidência formal de que o equipamento foi avaliado dentro de um escopo definido, com critérios técnicos compatíveis com sua finalidade, seu risco operacional, seu perfil de uso e as referências normativas aplicáveis.",

    CLAUSULA_FINAL:
      "A presente Carta de Conformidade Técnica deve ser interpretada em conjunto com os registros de campo, certificados de calibração, evidências fotográficas, dados brutos, relatórios analíticos e demais documentos complementares emitidos pela Metrolabs. A validade técnica deste documento está condicionada à integridade das informações declaradas, à manutenção das condições avaliadas e à não ocorrência de intervenções posteriores que possam alterar o desempenho, a segurança ou a rastreabilidade do equipamento.",

    VALIDACAO:
      "A autenticidade deste documento pode ser verificada pelo código de validação e/ou QR Code vinculado ao histórico documental Metrolabs. Qualquer divergência entre a cópia apresentada e o registro digital validado deve ser tratada como inconsistência documental."
  },

  WHATSAPP: {
    MENSAGEM_PADRAO:
      "Olá. Segue a Carta de Conformidade Técnica referente ao equipamento avaliado pela Metrolabs. O documento apresenta o escopo executado, os principais critérios observados, a rastreabilidade aplicável e a conclusão preliminar da avaliação. A autenticidade pode ser conferida pelo QR Code/código de validação."
  },

  CAMPOS_OBRIGATORIOS_BASE: {
    CLIENTE: ["cnpj", "razaoSocial"],
    EQUIPAMENTO: ["tipoCodigo", "tipoNome", "marca", "modelo", "numeroSerie"],
    RELATORIO: ["clienteId", "equipamentoId", "statusFinal"]
  },

  TIPOS_EQUIPAMENTO: {
    AUTOCLAVE_VAPOR: "Autoclave a Vapor",
    AUTOCLAVE_PEROXIDO: "Autoclave de Peróxido de Hidrogênio",
    AUTOCLAVE_ETO: "Autoclave por Óxido de Etileno (ETO)",
    LAVADORA_ULTRASSONICA: "Lavadora Ultrassônica",
    TERMODESINFECTORA: "Termodesinfectora",
    CAMARA_FRIA: "Câmara Conservadora / Câmara Fria",
    FREEZER: "Freezer",
    CAIXA_TERMICA: "Caixa Térmica",
    CAPELA_FLUXO_LAMINAR: "Capela de Fluxo Laminar",
    CENTRIFUGA: "Centrífuga",
    ESTUFA: "Estufa",
    SECADORA_TRAQUEIA: "Secadora de Traqueia",
    VASO_PRESSAO_NR13: "Ensaio NR-13 / Vaso de Pressão"
  },

  PERFIS_EQUIPAMENTO: {
    AUTOCLAVE_VAPOR: {
      codigo: "AUTOCLAVE_VAPOR",
      nome: "Autoclave a Vapor",
      familia: "ESTERILIZACAO",
      documentoMotor: "Documento_AutoclaveVapor",
      calculoMotor: "Motor_AutoclaveVapor",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: true, usaCiclos: true, usaInsumos: true,
      usaEnsaiosTermicos: false, usaEnsaiosGerais: false, usaInspecaoNR13: false,
      usaBI: true, usaIQ: true, usaBowieDick: true, usaPrions: true, usaIntegradorPrions: true,
      usaTesteLimpeza: false,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao"],
      receitasPadrao: ["Instrumental", "Têxteis", "Termossensíveis", "Pacotes", "Príons", "Bowie-Dick"],
      insumos: [
        { codigo: "BI", nome: "Indicador Biológico", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "IQ", nome: "Integrador Químico", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "BOWIE_DICK", nome: "Teste Bowie-Dick", obrigatorioQuandoReceita: ["Bowie-Dick"] },
        { codigo: "IQ_PRIONS", nome: "Integrador Químico para Príons", obrigatorioQuandoReceita: ["Príons"] }
      ],
      criterios: {
        qoCiclosVaziosPorReceita: 3,
        qdCiclosComCargaPorReceita: 3,
        temperatura: "Avaliar estabilidade, permanência e distribuição térmica conforme a receita, o protocolo aprovado e o critério institucional.",
        pressao: "Avaliar coerência entre pressão, fase do ciclo, controle de vapor saturado e registros do equipamento.",
        secagem: "Avaliar desempenho de secagem conforme carga, embalagem, programa executado e evidência visual/documental.",
        f0: "Aplicável quando houver massa de dados térmicos suficiente para cálculo e interpretação da letalidade acumulada.",
        bowieDick: "Aplicável como ensaio específico de remoção de ar e penetração de vapor quando previsto na rotina do equipamento.",
        prions: "Quando selecionado, deve utilizar critério e integrador específico para Príons, sem misturar com integrador químico comum."
      },
      normas: [
        "RDC nº 15/2012 ANVISA",
        "ABNT NBR 16328",
        "ISO 17665-1",
        "ISO 17665-2",
        "ISO 11138",
        "ISO 11140",
        "AAMI ST79 como referência técnica complementar quando aplicável",
        "Protocolos do fabricante"
      ],
      textos: {
        qi: "A Qualificação de Instalação da autoclave a vapor verifica se o equipamento, seus componentes, utilidades e condições de infraestrutura estão instalados de forma compatível com o uso previsto. Devem ser avaliados alimentação elétrica, aterramento, proteção, vapor ou geração de vapor, água, drenagem, exaustão, nivelamento, identificação, integridade física, segurança de porta, instrumentos, impressora/registro, documentação do fabricante e rastreabilidade do equipamento. A QI não tem por finalidade comprovar desempenho microbiológico, mas estabelece a base técnica para que os ensaios operacionais e de desempenho sejam executados com segurança e confiabilidade.",
        qo: "A Qualificação de Operação da autoclave a vapor avalia a capacidade do equipamento em executar seus programas em condição controlada, normalmente com câmara vazia ou condição operacional padronizada. São observados ciclos, fases, subida de temperatura, pressão, remoção de ar, exposição, secagem, alarmes, intertravamentos, registros impressos ou digitais e repetibilidade dos parâmetros. Para ciclos de vapor, a QO deve demonstrar que o equipamento responde corretamente aos comandos e permissivos antes da avaliação com carga real.",
        qd: "A Qualificação de Desempenho da autoclave a vapor avalia o comportamento do processo com carga representativa, considerando distribuição térmica, penetração de vapor, tempo de exposição, secagem, tipo de embalagem, disposição da carga e indicadores biológicos/químicos aplicáveis. A QD deve demonstrar que o ciclo, quando executado nas condições reais de uso, apresenta evidências consistentes de desempenho e rastreabilidade suficiente para sustentar a liberação técnica preliminar.",
        escopo: "A avaliação de autoclave a vapor contempla instalação, operação e desempenho do processo de esterilização por vapor saturado sob pressão, incluindo receitas executadas, parâmetros críticos, indicadores aplicáveis, integridade dos registros, segurança operacional e coerência entre carga, programa e finalidade sanitária.",
        metodologia: "A metodologia aplicada considera a separação entre instalação, operação e desempenho. O equipamento é avaliado quanto à sua condição estrutural, funcionamento dos programas, comportamento de temperatura/pressão, registros de ciclo, rastreabilidade de indicadores, coerência dos insumos e atendimento aos critérios definidos pela instituição, pelo fabricante e pelas referências técnicas aplicáveis. Receitas como Bowie-Dick e Príons são tratadas como lógicas específicas, evitando mistura com ciclos convencionais.",
        rastreabilidade: "A rastreabilidade em autoclave a vapor deve vincular equipamento, carga, programa, operador, data, ciclo, lote dos indicadores, validade dos insumos, resultado observado, registros físicos/digitais e conclusão técnica. Quando houver ciclo Príons, deve existir integrador químico específico para essa finalidade. Quando houver Bowie-Dick, o teste deve ser identificado de forma independente.",
        conclusaoAprovado: "A autoclave a vapor apresentou evidências preliminares compatíveis com o escopo declarado, mantendo coerência entre instalação, operação, desempenho, receitas executadas, parâmetros críticos e rastreabilidade dos indicadores aplicáveis. A conclusão favorável está condicionada à manutenção das condições avaliadas e à consolidação do relatório técnico completo.",
        conclusaoRessalvas: "A autoclave a vapor apresentou atendimento preliminar aos critérios essenciais, porém foram registradas ressalvas técnicas, documentais ou de rastreabilidade que devem ser tratadas para robustecer a evidência final. As ressalvas não devem ser ignoradas, pois podem impactar repetibilidade, rastreabilidade ou interpretação do desempenho do processo.",
        conclusaoReprovado: "A autoclave a vapor não apresentou evidências suficientes para sustentar a conformidade preliminar no escopo avaliado. A condição requer análise técnica, correção das não conformidades e nova verificação antes da liberação documental ou utilização do resultado como evidência de conformidade."
      }
    },

    AUTOCLAVE_PEROXIDO: {
      codigo: "AUTOCLAVE_PEROXIDO",
      nome: "Autoclave de Peróxido de Hidrogênio",
      familia: "ESTERILIZACAO",
      documentoMotor: "Documento_AutoclavePeroxido",
      calculoMotor: "Motor_AutoclavePeroxido",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: true, usaCiclos: true, usaInsumos: true,
      usaBI: true, usaIQ: true, usaBowieDick: false, usaPrions: true, usaIntegradorPrions: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao"],
      receitasPadrao: ["Instrumental", "Termossensíveis", "Lúmens", "Príons"],
      insumos: [
        { codigo: "BI", nome: "Indicador Biológico", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "IQ", nome: "Integrador Químico", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "IQ_PRIONS", nome: "Integrador Químico para Príons", obrigatorioQuandoReceita: ["Príons"] }
      ],
      criterios: {
        qoCiclosVaziosPorReceita: 3,
        qdCiclosComCargaPorReceita: 3,
        compatibilidadeCarga: "Avaliar compatibilidade de materiais, lúmens, embalagem, limite de carga, umidade residual e restrições do fabricante.",
        cicloBaixaTemperatura: "Avaliar coerência entre programa, fase de difusão/injeção, plasma/aeração, pressão, tempo e registro do equipamento.",
        aeracao: "Avaliar remoção adequada do agente esterilizante conforme tecnologia e protocolo do fabricante.",
        prions: "Quando previsto, tratar separadamente o ciclo Príons e seu integrador específico."
      },
      normas: [
        "RDC nº 15/2012 ANVISA",
        "ABNT NBR 16328",
        "ISO 14937",
        "ISO 11138",
        "ISO 11140",
        "Protocolos do fabricante"
      ],
      textos: {
        qi: "A Qualificação de Instalação da autoclave de peróxido de hidrogênio verifica a adequação física, elétrica, ambiental e documental do equipamento, incluindo alimentação elétrica, aterramento, ventilação, integridade da câmara, sistema de vácuo, porta, sensores, impressora, cartucho/reservatório quando aplicável, identificação, número de série, local de instalação e conformidade com os requisitos do fabricante. A QI estabelece as condições mínimas para que os ciclos de baixa temperatura sejam avaliados sem interferência de falhas de instalação.",
        qo: "A Qualificação de Operação avalia se a autoclave de peróxido executa corretamente seus programas, fases, permissivos, alarmes, vácuo, dosagem/injeção do agente esterilizante, etapas de exposição, plasma ou aeração conforme tecnologia do fabricante. A QO verifica o comportamento do equipamento em condição controlada, confirmando que a lógica operacional e os registros respondem de forma compatível antes da avaliação com carga.",
        qd: "A Qualificação de Desempenho avalia o ciclo com carga representativa, considerando compatibilidade dos materiais, presença de lúmens, restrições do fabricante, distribuição da carga, embalagem, indicadores biológicos/químicos, tempo de processo, condição pós-ciclo e rastreabilidade. Em baixa temperatura, a compatibilidade do material e o correto programa são tão importantes quanto o resultado do indicador.",
        escopo: "A avaliação da autoclave de peróxido de hidrogênio contempla instalação, operação e desempenho do processo de esterilização em baixa temperatura, com foco em compatibilidade de carga, programas selecionados, rastreabilidade dos indicadores, segurança operacional e aderência ao protocolo do fabricante.",
        metodologia: "A metodologia considera programas específicos de baixa temperatura, diferenciação entre materiais termossensíveis, lúmens, cargas compatíveis, indicadores rastreáveis e registros do equipamento. O sistema não utiliza Bowie-Dick neste perfil e não mistura critérios de vapor com o processo por peróxido.",
        rastreabilidade: "A rastreabilidade deve vincular programa, carga, tipo de material, indicadores biológicos e químicos, lote, validade, resultado, operador, data, equipamento e registro do ciclo. Para ciclos Príons, o integrador específico deve ser documentado separadamente.",
        conclusaoAprovado: "A autoclave de peróxido de hidrogênio apresentou evidências preliminares compatíveis com o escopo avaliado, demonstrando coerência entre programa, carga, compatibilidade de materiais, indicadores aplicáveis e registros do processo de baixa temperatura.",
        conclusaoRessalvas: "A autoclave de peróxido de hidrogênio apresentou atendimento preliminar com ressalvas relacionadas à rastreabilidade, compatibilidade de carga, documentação, programa selecionado ou evidências complementares. As ressalvas devem ser analisadas antes da consolidação final.",
        conclusaoReprovado: "A autoclave de peróxido de hidrogênio não apresentou evidências suficientes de conformidade para o escopo avaliado, exigindo correção, complementação documental ou nova avaliação com carga e indicadores compatíveis."
      }
    },

    AUTOCLAVE_ETO: {
      codigo: "AUTOCLAVE_ETO",
      nome: "Autoclave por Óxido de Etileno (ETO)",
      familia: "ESTERILIZACAO",
      documentoMotor: "Documento_AutoclaveETO",
      calculoMotor: "Motor_AutoclaveETO",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: true, usaCiclos: true, usaInsumos: true,
      usaBI: true, usaIQ: true, usaBowieDick: false, usaPrions: false, usaIntegradorPrions: false,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao", "tipoGas", "sistemaExaustao"],
      receitasPadrao: ["Absorvíveis", "Inabsorvíveis", "Higienização / Manutenção"],
      insumos: [
        { codigo: "BI_ETO", nome: "Indicador Biológico para ETO", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "IQ_ETO", nome: "Indicador / Integrador Químico para ETO", obrigatorioQuando: ["QO", "QD"] }
      ],
      criterios: {
        temperatura: "Avaliar temperatura de processo conforme receita aprovada e protocolo validado.",
        umidade: "Avaliar umidade relativa como variável crítica para efetividade do ETO.",
        vacuo: "Avaliar profundidade de vácuo, leak test, inertização e pré-vácuo conforme lógica de ciclo.",
        gas: "Registrar estratégia de dosagem/injeção e evidência indireta ou direta de entrada do agente esterilizante.",
        aeracao: "Avaliar remoção do gás, aeração e exaustão como etapas críticas de segurança.",
        seguranca: "Avaliar intertravamentos, emergência, exaustão, alarmes críticos e resposta do equipamento."
      },
      normas: [
        "ISO 11135",
        "ISO 14937",
        "ISO 11138",
        "ISO 11140",
        "RDC nº 665/2022 ANVISA",
        "IN nº 47/2019 ANVISA",
        "NR-10",
        "NR-12",
        "Protocolos do fabricante"
      ],
      textos: {
        qi: "A Qualificação de Instalação da autoclave ETO avalia a conformidade da instalação física, elétrica, pneumática, exaustão, segurança de porta, sensores, sistema de vácuo, linhas de gás, periféricos, alarmes e registros. Por se tratar de processo com agente químico perigoso, a QI deve evidenciar que o equipamento está instalado em condição compatível com operação segura, controle de exposição ocupacional e rastreabilidade do ciclo.",
        qo: "A Qualificação de Operação avalia o comportamento da autoclave ETO em suas etapas críticas: aquecimento, pré-condicionamento, leak test, inertização, pré-vácuo, umidificação, entrada de gás, exposição, remoção do gás, aeração e fim de ciclo. A QO confirma se permissivos, alarmes, intertravamentos, sensores e registros funcionam de forma coerente antes da avaliação com carga.",
        qd: "A Qualificação de Desempenho avalia a efetividade do processo ETO com carga representativa, considerando penetração do gás, umidade, temperatura, pressão/vácuo, tempo de exposição, indicadores apropriados, remoção do gás e aeração. A QD deve ser interpretada com atenção especial à segurança, residual do agente esterilizante e compatibilidade da carga processada.",
        escopo: "A avaliação de autoclave por óxido de etileno contempla instalação, operação, desempenho, variáveis críticas do processo, segurança operacional, rastreabilidade de indicadores, remoção do gás e aeração, sem utilizar critérios próprios de vapor ou peróxido.",
        metodologia: "A metodologia considera cada fase do ciclo ETO como variável técnica relevante, incluindo condicionamento, controle de umidade, vácuo, injeção/dosagem do gás, tempo de exposição, remoção e aeração. O sistema deve registrar receitas, permissivos, alarmes, indicadores e documentação de segurança.",
        rastreabilidade: "A rastreabilidade em ETO deve vincular receita, carga, operador, indicadores específicos para ETO, lote, validade, parâmetros críticos, eventos de ciclo, alarmes, exaustão, aeração e evidência documental da liberação preliminar.",
        conclusaoAprovado: "A autoclave ETO apresentou evidências preliminares compatíveis com o escopo avaliado, incluindo coerência entre variáveis críticas, etapas do ciclo, rastreabilidade dos indicadores e requisitos de segurança operacional.",
        conclusaoRessalvas: "A autoclave ETO apresentou atendimento preliminar com ressalvas que exigem avaliação complementar de parâmetros, segurança, rastreabilidade, exaustão, aeração ou documentação técnica antes da consolidação final.",
        conclusaoReprovado: "A autoclave ETO não apresentou evidências suficientes para sustentação da conformidade preliminar, sendo necessária correção técnica, revisão de processo, complementação documental ou nova avaliação."
      }
    },

    LAVADORA_ULTRASSONICA: {
      codigo: "LAVADORA_ULTRASSONICA",
      nome: "Lavadora Ultrassônica",
      familia: "LAVAGEM_DESINFECCAO",
      documentoMotor: "Documento_LavadoraUltrassonica",
      calculoMotor: "Motor_LavadoraUltrassonica",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: true, usaCiclos: true, usaInsumos: true,
      usaBI: false, usaIQ: false, usaBowieDick: false, usaPrions: false, usaTesteLimpeza: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao"],
      receitasPadrao: ["Instrumental", "Canulados", "Instrumental Delicado"],
      insumos: [
        { codigo: "TESTE_LIMPEZA", nome: "Indicador de Limpeza / Resíduo Orgânico", obrigatorioQuando: ["QO", "QD"] },
        { codigo: "TESTE_CANULADOS", nome: "Indicador de Canulados", obrigatorioQuandoReceita: ["Canulados"] },
        { codigo: "SONOCHECK", nome: "Teste Químico de Cavitação / Sonocheck", obrigatorioQuando: ["QO", "QD"] }
      ],
      criterios: {
        qoCiclosVaziosPorReceita: 4,
        qdCiclosComCargaPorReceita: 4,
        temperaturaLavagem: "Avaliar temperatura conforme detergente, programa e compatibilidade dos materiais.",
        tempoLavagem: "Avaliar tempo de ultrassom/limpeza em relação ao programa aprovado.",
        cavitacao: "Avaliar energia ultrassônica por teste específico quando aplicável.",
        canulados: "Avaliar fluxo e remoção de sujidade simulada em dispositivos canulados quando aplicável."
      },
      normas: [
        "RDC nº 15/2012 ANVISA",
        "ABNT NBR 16328",
        "ISO 15883",
        "AAMI ST79 como referência complementar para processamento quando aplicável",
        "Protocolos do fabricante"
      ],
      textos: {
        qi: "A Qualificação de Instalação da lavadora ultrassônica verifica a condição física do tanque, tampa, transdutores, aquecimento, dreno, alimentação elétrica, aterramento, abastecimento de água, dosagem de detergente quando aplicável, sistema de fluxo para canulados, identificação, painel de comando e conformidade com as condições de instalação recomendadas pelo fabricante.",
        qo: "A Qualificação de Operação avalia se a lavadora ultrassônica executa corretamente seus programas, aquecimento, tempo de limpeza, ultrassom, recirculação/fluxo, drenagem, alarmes e comandos. Também permite verificar cavitação, funcionamento dos transdutores e estabilidade operacional antes da avaliação com carga real.",
        qd: "A Qualificação de Desempenho avalia a eficácia do processo de limpeza com carga representativa, considerando tipo de instrumental, canulados, detergente, temperatura, tempo, cavitação, fluxo, disposição da carga e testes de limpeza. A QD não deve ser confundida com esterilização; seu foco é remoção de sujidade e preparação segura do material para etapas posteriores.",
        escopo: "A avaliação de lavadora ultrassônica contempla instalação, operação e desempenho do processo de limpeza por cavitação ultrassônica, incluindo programas executados, temperatura, tempo, fluxo para canulados, testes de limpeza e evidências de funcionamento.",
        metodologia: "A metodologia utiliza avaliação funcional dos programas, testes de cavitação, indicadores de limpeza, verificação de canulados quando aplicável e análise da coerência entre parâmetros e finalidade do processo. Não são utilizados BI, IQ, Bowie-Dick ou integradores de esterilização neste perfil.",
        rastreabilidade: "A rastreabilidade da lavadora ultrassônica deve vincular programa, carga, teste de limpeza, lote, validade, detergente quando informado, resultado, operador e registros do equipamento.",
        conclusaoAprovado: "A lavadora ultrassônica apresentou evidências preliminares compatíveis com o escopo avaliado, demonstrando coerência entre programa, limpeza, cavitação, fluxo/canulados quando aplicável e rastreabilidade dos testes.",
        conclusaoRessalvas: "A lavadora ultrassônica apresentou atendimento preliminar com ressalvas relacionadas à limpeza, cavitação, canulados, documentação ou rastreabilidade dos testes, exigindo tratamento antes da consolidação final.",
        conclusaoReprovado: "A lavadora ultrassônica não apresentou evidências suficientes de conformidade do processo de limpeza, exigindo correção operacional, manutenção, repetição de ensaios ou nova avaliação."
      }
    },

    TERMODESINFECTORA: {
      codigo: "TERMODESINFECTORA",
      nome: "Termodesinfectora",
      familia: "LAVAGEM_DESINFECCAO",
      documentoMotor: "Documento_Termodesinfectora",
      calculoMotor: "Motor_Termodesinfectora",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: true, usaCiclos: true, usaInsumos: true,
      usaBI: false, usaIQ: false, usaBowieDick: false, usaTesteLimpeza: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao"],
      receitasPadrao: ["Programa 01", "Programa 02", "Instrumental", "Canulados", "Térmico"],
      insumos: [
        { codigo: "TESTE_LIMPEZA", nome: "Indicador de Limpeza / Resíduo Orgânico", obrigatorioQuando: ["QO", "QD"] }
      ],
      criterios: {
        qoCiclosVaziosPorReceita: 4,
        qdCiclosComCargaPorReceita: 4,
        a0: "Aplicável quando houver dados suficientes de tempo e temperatura para avaliação da desinfecção térmica.",
        temperaturaDesinfeccao: "Avaliar temperatura e tempo da fase de desinfecção conforme programa e protocolo aprovado.",
        secagem: "Avaliar secagem e ausência de umidade incompatível com o uso pretendido.",
        limpeza: "Avaliar evidência de remoção de sujidade e coerência dos testes de limpeza."
      },
      normas: [
        "RDC nº 15/2012 ANVISA",
        "ABNT NBR 16328",
        "ISO 15883",
        "Protocolos do fabricante"
      ],
      textos: {
        qi: "A Qualificação de Instalação da termodesinfectora verifica instalação física, alimentação elétrica, hidráulica, drenagem, detergente/químicos, vapor ou aquecimento quando aplicável, filtros, braços aspersores, sensores, portas, painel, segurança e identificação. Essa etapa confirma que o equipamento está instalado em condição adequada para executar lavagem, enxágue, desinfecção e secagem.",
        qo: "A Qualificação de Operação avalia os programas em condição controlada, verificando fases de pré-lavagem, lavagem, enxágue, desinfecção, secagem, temperatura, tempo, dosagem, alarmes, intertravamentos e registros. A QO comprova que a lógica do equipamento responde conforme previsto antes da avaliação com carga representativa.",
        qd: "A Qualificação de Desempenho avalia o processo com carga representativa, observando remoção de sujidade, distribuição da ação mecânica, temperatura de desinfecção, tempo, secagem, testes de limpeza e cálculo/interpretação de A0 quando houver dados suficientes. O foco é comprovar limpeza e desinfecção, não esterilização.",
        escopo: "A avaliação de termodesinfectora contempla instalação, operação e desempenho do processo automatizado de limpeza e desinfecção, incluindo fases do ciclo, parâmetros térmicos, secagem, testes de limpeza e rastreabilidade.",
        metodologia: "A metodologia diferencia claramente lavagem/desinfecção de esterilização. São avaliados programas, fases, temperaturas, tempos, secagem, testes de limpeza e registros do equipamento, sem uso de BI, IQ, Bowie-Dick ou integradores de esterilização.",
        rastreabilidade: "A rastreabilidade da termodesinfectora deve vincular programa, carga, teste de limpeza, lote, validade, fase do ciclo, resultado, operador e registros técnicos disponíveis.",
        conclusaoAprovado: "A termodesinfectora apresentou evidências preliminares compatíveis com o escopo avaliado, demonstrando coerência entre programa, lavagem, desinfecção, secagem, registros e rastreabilidade dos testes aplicáveis.",
        conclusaoRessalvas: "A termodesinfectora apresentou atendimento preliminar com ressalvas relacionadas a parâmetros, secagem, documentação, limpeza ou rastreabilidade, devendo ser tratadas antes da consolidação final.",
        conclusaoReprovado: "A termodesinfectora não apresentou evidências suficientes para sustentar conformidade preliminar do processo de limpeza e desinfecção, exigindo correção ou nova avaliação."
      }
    },

    CAMARA_FRIA: {
      codigo: "CAMARA_FRIA",
      nome: "Câmara Conservadora / Câmara Fria",
      familia: "CADEIA_FRIA",
      documentoMotor: "Documento_CadeiaFria",
      calculoMotor: "Motor_CamaraFria",
      usaQI: true, usaQO: false, usaQD: true,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosTermicos: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao", "faixaMin", "faixaMax"],
      ensaiosPadrao: ["Ensaio 24 Horas", "Porta Semiaberta", "Queda de Energia"],
      insumos: [],
      criterios: {
        faixaPadrao: "2 °C a 8 °C, salvo critério específico informado pela instituição.",
        estabilidade: "Avaliar permanência dentro da faixa, excursões, tendência e recuperação.",
        portaSemiaberta: "Avaliar resposta térmica frente à abertura controlada.",
        quedaEnergia: "Avaliar comportamento sem alimentação elétrica e tempo de manutenção da faixa.",
        uniformidade: "Avaliar diferença entre pontos quando houver múltiplos sensores."
      },
      normas: [
        "RDC nº 430/2020 ANVISA",
        "Boas Práticas de Armazenamento e Distribuição",
        "Rastreabilidade Metrológica",
        "Protocolos do fabricante",
        "Guias de Qualificação Térmica"
      ],
      textos: {
        qi: "A Qualificação de Instalação da câmara conservadora/câmara fria verifica identificação, local de instalação, ventilação, afastamento de paredes, nivelamento, alimentação elétrica, proteção, vedação, integridade física, prateleiras, circulação interna, sensor/controlador, alarmes, registrador quando aplicável e conformidade com o uso pretendido.",
        qo: "Para este perfil, QO tradicional não é utilizada como ciclo operacional de esterilização. A avaliação operacional é absorvida pela verificação funcional e pelos ensaios térmicos executados conforme o escopo.",
        qd: "A Qualificação de Desempenho avalia a capacidade de manter a faixa térmica definida sob condições reais ou simuladas, incluindo ensaio contínuo, abertura de porta, queda de energia e recuperação. O desempenho é interpretado por estabilidade, excursões, tempo fora de faixa, comportamento de recuperação e adequação ao produto armazenado.",
        escopo: "A avaliação de câmara conservadora/câmara fria contempla qualificação térmica, estabilidade, uniformidade, resposta a perturbações, rastreabilidade dos sensores e aderência à faixa definida para conservação de produtos termossensíveis.",
        metodologia: "A metodologia utiliza monitoramento térmico com sensores rastreáveis, análise de mínimo, máximo, média, excursões, tempo fora da faixa, comportamento de recuperação e interpretação do risco térmico. Não há uso de BI, IQ, Bowie-Dick, Príons ou integradores.",
        rastreabilidade: "A rastreabilidade é metrológica e documental, vinculando sensores, certificados de calibração, período de ensaio, faixa de aceitação, registros brutos, gráficos e conclusão técnica.",
        conclusaoAprovado: "A câmara conservadora/câmara fria apresentou evidências preliminares compatíveis com os critérios térmicos avaliados, demonstrando estabilidade e adequação à faixa definida para o escopo declarado.",
        conclusaoRessalvas: "A câmara conservadora/câmara fria apresentou atendimento preliminar com ressalvas térmicas ou documentais, como excursões, recuperação lenta, ausência de dados complementares ou necessidade de ajuste operacional.",
        conclusaoReprovado: "A câmara conservadora/câmara fria não apresentou evidências suficientes de estabilidade térmica ou permanência na faixa especificada, exigindo correção, ajuste, manutenção ou nova qualificação."
      }
    },

    FREEZER: {
      codigo: "FREEZER",
      nome: "Freezer",
      familia: "CADEIA_FRIA",
      documentoMotor: "Documento_Freezer",
      calculoMotor: "Motor_Freezer",
      usaQI: true, usaQO: false, usaQD: true,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosTermicos: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao", "faixaMin", "faixaMax"],
      ensaiosPadrao: ["Ensaio 24 Horas", "Abertura de Porta", "Queda de Energia", "Recuperação Térmica"],
      insumos: [],
      criterios: {
        faixa: "Conforme produto armazenado e especificação da instituição.",
        estabilidade: "Avaliar permanência dentro da faixa e oscilações compatíveis com freezer.",
        recuperacao: "Avaliar tempo de retorno à faixa após perturbação térmica.",
        excursao: "Avaliar criticidade, duração e recorrência de eventos fora da faixa."
      },
      normas: [
        "Rastreabilidade Metrológica",
        "Boas Práticas de Armazenamento",
        "Protocolos do fabricante",
        "Guias de Qualificação Térmica"
      ],
      textos: {
        qi: "A Qualificação de Instalação do freezer verifica instalação elétrica, ventilação, vedação, integridade física, controlador, alarmes, prateleiras, organização interna, local de instalação e condições que possam afetar a dissipação térmica e a estabilidade do equipamento.",
        qo: "QO tradicional não é aplicada como ciclo de processo. A condição operacional do freezer é avaliada funcionalmente dentro da qualificação térmica, considerando acionamento, controle, alarme e resposta do equipamento.",
        qd: "A Qualificação de Desempenho avalia a estabilidade térmica do freezer, a manutenção da faixa definida, a recuperação após abertura de porta ou queda de energia, a uniformidade entre pontos e a existência de excursões que possam comprometer o uso pretendido.",
        escopo: "A avaliação de freezer contempla qualificação térmica, estabilidade, recuperação, excursões, comportamento operacional e rastreabilidade metrológica dos sensores utilizados.",
        metodologia: "A metodologia considera monitoramento contínuo, sensores distribuídos, análise estatística, avaliação de excursões e interpretação da capacidade de conservação térmica no período ensaiado.",
        rastreabilidade: "Freezers não utilizam BI, IQ ou integradores. A evidência é térmica, metrológica e documental, vinculada aos sensores, certificados, dados brutos e gráficos.",
        conclusaoAprovado: "O freezer apresentou evidências preliminares compatíveis com os critérios térmicos avaliados para o uso pretendido.",
        conclusaoRessalvas: "O freezer apresentou atendimento preliminar com ressalvas associadas à estabilidade, excursões, recuperação térmica ou documentação complementar.",
        conclusaoReprovado: "O freezer não apresentou evidências suficientes de conformidade térmica para o uso pretendido, sendo necessária correção ou nova avaliação."
      }
    },

    CAIXA_TERMICA: {
      codigo: "CAIXA_TERMICA",
      nome: "Caixa Térmica",
      familia: "CADEIA_FRIA",
      documentoMotor: "Documento_CaixaTermica",
      calculoMotor: "Motor_CaixaTermica",
      usaQI: false, usaQO: false, usaQD: true,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosTermicos: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao", "faixaMin", "faixaMax"],
      ensaiosPadrao: ["Ensaio de Manutenção Térmica", "Recuperação", "Simulação de Transporte"],
      insumos: [],
      criterios: {
        autonomiaTermica: "Avaliar tempo em que a caixa mantém a faixa especificada.",
        cargaTermica: "Avaliar condição simulada com carga térmica compatível com o uso.",
        transporte: "Avaliar comportamento em simulação de transporte ou armazenamento temporário.",
        faixa: "Conforme produto transportado e critério institucional."
      },
      normas: [
        "Boas Práticas de Transporte",
        "Rastreabilidade Metrológica",
        "Protocolos internos da instituição",
        "Guias de qualificação térmica aplicáveis"
      ],
      textos: {
        qi: "Para caixa térmica, a instalação fixa normalmente não se aplica. A avaliação inicial deve verificar integridade física, vedação, identificação, capacidade, condição das placas ou elementos refrigerantes, limpeza e compatibilidade com o uso pretendido.",
        qo: "A operação da caixa térmica é avaliada por meio da preparação, montagem, carga térmica, elementos refrigerantes, fechamento, manipulação e condições simuladas de transporte, não por ciclos automatizados.",
        qd: "A Qualificação de Desempenho avalia a autonomia térmica e a capacidade de manutenção da faixa especificada durante o tempo necessário para transporte ou armazenamento temporário, considerando carga simulada, ambiente, excursões e recuperação.",
        escopo: "A avaliação de caixa térmica contempla capacidade de manutenção da faixa de temperatura, autonomia térmica, condição física, simulação de transporte e rastreabilidade dos sensores utilizados.",
        metodologia: "A metodologia utiliza monitoramento térmico controlado, carga simulada, análise de tempo em faixa, excursões e interpretação da adequação ao uso pretendido.",
        rastreabilidade: "Caixas térmicas não utilizam BI, IQ ou integradores. A rastreabilidade é baseada nos sensores, certificados, período de ensaio, dados brutos, gráficos e critérios de aceitação.",
        conclusaoAprovado: "A caixa térmica apresentou evidências preliminares compatíveis com a manutenção da faixa térmica no escopo avaliado.",
        conclusaoRessalvas: "A caixa térmica apresentou atendimento preliminar com ressalvas relacionadas à autonomia, excursões, preparação da carga térmica ou documentação complementar.",
        conclusaoReprovado: "A caixa térmica não apresentou evidências suficientes de manutenção da faixa especificada durante o período avaliado."
      }
    },

    CAPELA_FLUXO_LAMINAR: {
      codigo: "CAPELA_FLUXO_LAMINAR",
      nome: "Capela de Fluxo Laminar",
      familia: "LABORATORIAL_GERAL",
      documentoMotor: "Documento_CapelaFluxoLaminar",
      calculoMotor: "Motor_CapelaFluxoLaminar",
      usaQI: true, usaQO: true, usaQD: false,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosGerais: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "setor", "localInstalacao", "classeFiltro"],
      ensaiosPadrao: ["Velocidade do Fluxo", "Integridade Visual", "Condição do Filtro", "Alarmes e Segurança"],
      insumos: [],
      criterios: {
        fluxo: "Avaliar velocidade e uniformidade conforme classe, fabricante e uso pretendido.",
        filtro: "Avaliar condição e documentação de filtro quando aplicável.",
        seguranca: "Avaliar iluminação, alarmes, fluxo, ruído, vibração e integridade operacional.",
        areaTrabalho: "Avaliar área útil, limpeza, barreiras e condições de uso."
      },
      normas: [
        "Boas Práticas de Laboratório",
        "Rastreabilidade Metrológica",
        "Protocolos do fabricante",
        "ISO 14644 como referência para ambientes controlados quando aplicável"
      ],
      textos: {
        qi: "A Qualificação de Instalação da capela de fluxo laminar verifica local de instalação, alimentação elétrica, integridade física, filtros, iluminação, área de trabalho, identificação, fluxo de ar, exaustão quando aplicável e documentação técnica. A instalação deve favorecer operação segura e não comprometer o padrão de fluxo.",
        qo: "A Qualificação de Operação avalia o funcionamento da capela, incluindo acionamento, estabilidade do fluxo, alarmes, iluminação, ruído, vibração e resposta do equipamento durante a operação. O objetivo é verificar se o equipamento opera de forma coerente com sua finalidade.",
        qd: "QD tradicional com carga não é tratada neste perfil. A avaliação se concentra em operação, medições funcionais e adequação ao uso pretendido.",
        escopo: "A avaliação de capela de fluxo laminar contempla fluxo, integridade operacional, condição de filtro, área de trabalho, segurança e rastreabilidade de medições.",
        metodologia: "A metodologia utiliza inspeção técnica, medições aplicáveis, verificação funcional e análise das condições de segurança e uso. Não são utilizados BI, IQ ou integradores.",
        rastreabilidade: "A rastreabilidade é baseada em medições, instrumentos utilizados, certificados, registros de inspeção e condição documental do equipamento.",
        conclusaoAprovado: "A capela de fluxo laminar apresentou evidências preliminares compatíveis com os critérios funcionais e operacionais avaliados.",
        conclusaoRessalvas: "A capela de fluxo laminar apresentou atendimento preliminar com ressalvas quanto a fluxo, filtro, segurança, documentação ou condição operacional.",
        conclusaoReprovado: "A capela de fluxo laminar não apresentou evidências suficientes de conformidade funcional para o uso pretendido."
      }
    },

    CENTRIFUGA: {
      codigo: "CENTRIFUGA",
      nome: "Centrífuga",
      familia: "LABORATORIAL_GERAL",
      documentoMotor: "Documento_Centrifuga",
      calculoMotor: "Motor_Centrifuga",
      usaQI: true, usaQO: true, usaQD: false,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosGerais: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "setor", "localInstalacao", "rotacaoMaxima"],
      ensaiosPadrao: ["Rotação", "Tempo", "Segurança da Tampa", "Vibração / Ruído", "Estabilidade"],
      insumos: [],
      criterios: {
        rotacao: "Avaliar desvio entre rotação selecionada e rotação observada.",
        tempo: "Avaliar coerência entre tempo programado e tempo executado.",
        seguranca: "Avaliar bloqueio de tampa, integridade do rotor e resposta a condição insegura.",
        estabilidade: "Avaliar vibração, ruído, balanceamento e condição operacional."
      },
      normas: [
        "Boas Práticas de Laboratório",
        "Rastreabilidade Metrológica",
        "Protocolos do fabricante",
        "NR-12 quando aplicável aos aspectos de segurança"
      ],
      textos: {
        qi: "A Qualificação de Instalação da centrífuga verifica local de instalação, nivelamento, alimentação elétrica, identificação, integridade física, rotor, tampa, travas, acessórios, manual/documentação e condições que possam comprometer estabilidade ou segurança.",
        qo: "A Qualificação de Operação avalia rotação, tempo, aceleração/desaceleração quando aplicável, bloqueio de tampa, vibração, ruído, estabilidade e resposta do equipamento durante operação controlada.",
        qd: "QD com carga assistencial não é o foco deste perfil. Quando necessário, a avaliação de desempenho pode considerar amostras simuladas, balanceamento e repetibilidade operacional.",
        escopo: "A avaliação de centrífuga contempla rotação, tempo, segurança da tampa, estabilidade, vibração, ruído e adequação ao uso pretendido.",
        metodologia: "A metodologia utiliza verificação funcional, medições de rotação/tempo quando aplicável, inspeção visual e avaliação dos dispositivos de segurança.",
        rastreabilidade: "Centrífugas não utilizam BI, IQ ou integradores. A rastreabilidade é baseada em instrumentos de medição, registros funcionais e identificação do equipamento.",
        conclusaoAprovado: "A centrífuga apresentou evidências preliminares compatíveis com os critérios funcionais avaliados.",
        conclusaoRessalvas: "A centrífuga apresentou atendimento preliminar com ressalvas quanto a rotação, tempo, vibração, segurança ou documentação.",
        conclusaoReprovado: "A centrífuga não apresentou evidências suficientes de conformidade funcional ou segurança operacional."
      }
    },

    ESTUFA: {
      codigo: "ESTUFA",
      nome: "Estufa",
      familia: "LABORATORIAL_GERAL",
      documentoMotor: "Documento_Estufa",
      calculoMotor: "Motor_Estufa",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosTermicos: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "capacidadeLitros", "setor", "localInstalacao", "faixaMin", "faixaMax"],
      ensaiosPadrao: ["Estabilidade Térmica", "Uniformidade", "Recuperação", "Controle de Setpoint"],
      insumos: [],
      criterios: {
        estabilidade: "Avaliar capacidade de manter setpoint dentro do critério definido.",
        uniformidade: "Avaliar diferença térmica entre pontos monitorados.",
        recuperacao: "Avaliar retorno ao setpoint após abertura ou perturbação.",
        setpoint: "Avaliar coerência entre valor programado e valor observado."
      },
      normas: [
        "Rastreabilidade Metrológica",
        "Boas Práticas de Laboratório",
        "Protocolos do fabricante",
        "Guias de qualificação térmica aplicáveis"
      ],
      textos: {
        qi: "A Qualificação de Instalação da estufa verifica alimentação elétrica, local de instalação, ventilação, integridade da câmara, prateleiras, controlador, sensores, vedação, identificação e condições que possam afetar estabilidade ou uniformidade térmica.",
        qo: "A Qualificação de Operação avalia aquecimento, controle de setpoint, estabilidade inicial, alarmes, resposta do controlador, registros e funcionamento em condição controlada.",
        qd: "A Qualificação de Desempenho avalia estabilidade térmica, uniformidade, recuperação, distribuição de temperatura e atendimento à faixa definida durante período representativo de uso.",
        escopo: "A avaliação de estufa contempla estabilidade, uniformidade, controle de setpoint, recuperação térmica e rastreabilidade dos dados medidos.",
        metodologia: "A metodologia utiliza sensores rastreáveis, monitoramento térmico, análise de variação entre pontos, mínimo, máximo, média, excursões e interpretação da adequação ao uso pretendido.",
        rastreabilidade: "Estufas não utilizam BI, IQ ou integradores neste relatório. A evidência é térmica, metrológica e documental.",
        conclusaoAprovado: "A estufa apresentou evidências preliminares compatíveis com os critérios térmicos avaliados.",
        conclusaoRessalvas: "A estufa apresentou atendimento preliminar com ressalvas quanto à estabilidade, uniformidade, recuperação ou documentação.",
        conclusaoReprovado: "A estufa não apresentou evidências suficientes de conformidade térmica para o uso pretendido."
      }
    },

    SECADORA_TRAQUEIA: {
      codigo: "SECADORA_TRAQUEIA",
      nome: "Secadora de Traqueia",
      familia: "LABORATORIAL_GERAL",
      documentoMotor: "Documento_SecadoraTraqueia",
      calculoMotor: "Motor_SecadoraTraqueia",
      usaQI: true, usaQO: true, usaQD: true,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaEnsaiosGerais: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "setor", "localInstalacao", "temperaturaTrabalho"],
      ensaiosPadrao: ["Temperatura", "Tempo de Secagem", "Fluxo de Ar", "Condição Operacional"],
      insumos: [],
      criterios: {
        secagem: "Avaliar desempenho de secagem conforme uso pretendido.",
        temperatura: "Avaliar controle térmico dentro da faixa definida.",
        fluxoAr: "Avaliar circulação de ar e uniformidade de secagem.",
        seguranca: "Avaliar integridade, alarmes, proteção e operação segura."
      },
      normas: [
        "RDC nº 15/2012 ANVISA",
        "ABNT NBR 16328",
        "Protocolos do fabricante",
        "Boas práticas de processamento de produtos para saúde"
      ],
      textos: {
        qi: "A Qualificação de Instalação da secadora de traqueia verifica alimentação elétrica, local de instalação, integridade física, circulação de ar, controlador, filtros quando aplicáveis, bandejas/suportes, identificação e condições de segurança.",
        qo: "A Qualificação de Operação avalia aquecimento, fluxo de ar, tempo de processo, alarmes, comandos, estabilidade operacional e capacidade de manter parâmetros compatíveis com o processo de secagem.",
        qd: "A Qualificação de Desempenho avalia a efetividade da secagem em condição representativa, considerando tempo, temperatura, fluxo de ar, disposição dos itens e ausência de umidade incompatível com o uso pretendido.",
        escopo: "A avaliação de secadora de traqueia contempla instalação, operação, desempenho de secagem, fluxo de ar, temperatura, segurança e rastreabilidade do processo.",
        metodologia: "A metodologia utiliza verificação funcional, avaliação de temperatura, fluxo de ar, tempo de processo e aderência ao uso previsto em processamento de produtos para saúde.",
        rastreabilidade: "Secadoras de traqueia não utilizam BI, IQ, Bowie-Dick ou integradores neste relatório. A evidência concentra-se em funcionamento, parâmetros e registros técnicos.",
        conclusaoAprovado: "A secadora de traqueia apresentou evidências preliminares compatíveis com os critérios operacionais e funcionais avaliados.",
        conclusaoRessalvas: "A secadora de traqueia apresentou atendimento preliminar com ressalvas quanto à secagem, temperatura, fluxo, segurança ou documentação.",
        conclusaoReprovado: "A secadora de traqueia não apresentou evidências suficientes de conformidade operacional para o uso pretendido."
      }
    },

    VASO_PRESSAO_NR13: {
      codigo: "VASO_PRESSAO_NR13",
      nome: "Ensaio NR-13 / Vaso de Pressão",
      familia: "NR13",
      documentoMotor: "Documento_NR13",
      calculoMotor: "Motor_NR13",
      usaQI: false, usaQO: false, usaQD: false,
      usaReceitas: false, usaCiclos: false, usaInsumos: false, usaInspecaoNR13: true,
      camposEquipamento: ["marca", "modelo", "numeroSerie", "tag", "setor", "localInstalacao", "pmta", "volume", "categoriaNR13"],
      ensaiosPadrao: ["Inspeção Visual", "Ensaio Hidrostático", "Válvula de Segurança", "Manômetro", "Espessura / Integridade"],
      insumos: [],
      criterios: {
        pmta: "Avaliar Pressão Máxima de Trabalho Admissível conforme prontuário, placa ou documentação técnica.",
        ensaioHidrostatico: "Avaliar pressão de teste, tempo, estabilidade e ausência de vazamento/deformação.",
        valvulaSeguranca: "Avaliar condição, identificação, calibração e abertura/fechamento quando aplicável.",
        manometro: "Avaliar condição, escala, calibração e compatibilidade com a faixa de trabalho.",
        integridade: "Avaliar corrosão, deformação, soldas, pintura, fixação, suportes e condição documental."
      },
      normas: [
        "NR-13",
        "NR-10",
        "NR-12",
        "Protocolos do fabricante",
        "Prontuário do vaso de pressão",
        "Boas práticas de inspeção de equipamentos pressurizados"
      ],
      textos: {
        qi: "QI tradicional não se aplica como qualificação de instalação neste perfil. A avaliação deve ser tratada como inspeção técnica de segurança e conformidade documental do vaso de pressão.",
        qo: "QO tradicional não se aplica. O funcionamento é avaliado por inspeção, acessórios de segurança, condição operacional e evidências de pressão quando aplicável.",
        qd: "QD tradicional não se aplica. O desempenho é interpretado por integridade, ensaio hidrostático quando aplicável, acessórios de segurança, documentação e atendimento aos requisitos NR-13.",
        escopo: "A avaliação NR-13 / vaso de pressão contempla identificação, PMTA, categoria, prontuário, inspeção visual, ensaio hidrostático quando aplicável, válvula de segurança, manômetro, integridade e condições de segurança.",
        metodologia: "A metodologia considera inspeção visual, verificação documental, avaliação de acessórios, registros de pressão, integridade física, critérios de segurança e rastreabilidade técnica. Não há uso de BI, IQ, Bowie-Dick, Príons ou integradores.",
        rastreabilidade: "A rastreabilidade em NR-13 está vinculada ao vaso, número de série, TAG, prontuário, PMTA, acessórios de segurança, instrumentos, registros de ensaio, responsável técnico e evidências documentais.",
        conclusaoAprovado: "O vaso de pressão apresentou evidências preliminares compatíveis com os critérios avaliados no escopo NR-13 declarado.",
        conclusaoRessalvas: "O vaso de pressão apresentou atendimento preliminar com ressalvas relacionadas à documentação, acessórios de segurança, identificação, integridade ou evidências complementares.",
        conclusaoReprovado: "O vaso de pressão não apresentou evidências suficientes de conformidade ou segurança no escopo avaliado, exigindo correção técnica, interdição preventiva quando aplicável ou nova inspeção."
      }
    }
  },

  PDF: {
    TITULO_PADRAO: "Carta de Conformidade Técnica Metrolabs",
    NOME_ARQUIVO_PREFIXO: "CARTA_CONFORMIDADE_METROLABS",
    TAMANHO_PAPEL: "A4",
    ORIENTACAO: "portrait"
  }
};

/**
 * ============================================================
 * HELPERS DE CONFIGURAÇÃO
 * ============================================================
 */

function getPerfilEquipamento_(tipoCodigo) {
  const codigo = String(tipoCodigo || "").trim();
  if (!codigo) return null;
  return (CFG.PERFIS_EQUIPAMENTO && CFG.PERFIS_EQUIPAMENTO[codigo]) || null;
}

function getListaTiposEquipamento_() {
  return Object.keys(CFG.PERFIS_EQUIPAMENTO || {}).map(function(codigo) {
    const p = CFG.PERFIS_EQUIPAMENTO[codigo];
    return {
      codigo: codigo,
      nome: p.nome,
      familia: p.familia,
      usaQI: !!p.usaQI,
      usaQO: !!p.usaQO,
      usaQD: !!p.usaQD,
      usaReceitas: !!p.usaReceitas,
      usaCiclos: !!p.usaCiclos,
      usaInsumos: !!p.usaInsumos,
      usaEnsaiosTermicos: !!p.usaEnsaiosTermicos,
      usaEnsaiosGerais: !!p.usaEnsaiosGerais,
      usaInspecaoNR13: !!p.usaInspecaoNR13
    };
  });
}

function getNormasPorTipo_(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  return perfil && Array.isArray(perfil.normas) ? perfil.normas : [];
}

function getTextosPorTipo_(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  return perfil && perfil.textos ? perfil.textos : {};
}

function getInsumosPorTipo_(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  return perfil && Array.isArray(perfil.insumos) ? perfil.insumos : [];
}

function getReceitasPorTipo_(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  return perfil && Array.isArray(perfil.receitasPadrao) ? perfil.receitasPadrao : [];
}

function getEnsaiosPorTipo_(tipoCodigo) {
  const perfil = getPerfilEquipamento_(tipoCodigo);
  return perfil && Array.isArray(perfil.ensaiosPadrao) ? perfil.ensaiosPadrao : [];
}
