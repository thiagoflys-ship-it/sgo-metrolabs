/****************************************************
 * DECLARAÇÃO DE EXECUÇÃO DE SERVIÇO — CONFIG
 *
 * Documento SEM veredito (nunca Aprovado/Reprovado) — registra que o
 * serviço técnico foi executado no equipamento, como foi conduzido, e
 * o que foi calibrado/qualificado. Resultado técnico (conforme/não
 * conforme) é sempre tratado à parte, no relatório final.
 *
 * MVP: 2 perfis (Autoclave a Vapor, Câmara Fria/Cadeia de Frio geral).
 * Adicionar novos perfis aqui expande o módulo para outros
 * equipamentos (termodesinfectora, lavadora ultrassônica, autoclave a
 * peróxido/ETO/formaldeído, estufa+banho-maria, centrífuga etc.) sem
 * mexer no motor de IA/documento — eles já leem a config genericamente.
 *
 * usaQD (2026-07-24, significado atualizado): habilita a seção de
 * Qualificação de Desempenho no RELATÓRIO DE QI/QO — baseada em
 * certificado de calibração real anexado por instrumento (um slot por
 * item de itensCalibraveis), lido por IA (Gemini Vision, PDF ou
 * imagem), nunca em autoavaliação/checkbox. Ver SGO_DeclaracaoExec_IA.js
 * (DeclExecIA_lerCertificado_) e SGO_DeclaracaoExec_Main.js
 * (DeclExec_resolverCertificadosQD_). Esse flag também é lido (sem
 * efeito prático) por um caminho morto da Declaração SIMPLES
 * (qi/qo/qd/qdObservacoes em DeclExec_montarDadosContexto_ e o
 * marcador ###QD### em IA.js) que o frontend nunca chama — não
 * remover nem "consertar" esse caminho achando que está quebrado.
 ****************************************************/
var DECLEXEC_CFG = Object.freeze({

  APP_TITLE: 'Declaração de Execução de Serviço',

  PERFIS: Object.freeze({

    AUTOCLAVE_VAPOR: Object.freeze({
      codigo: 'AUTOCLAVE_VAPOR',
      label: 'Autoclave a Vapor',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: true,
      // Só calibra o que fisicamente existe no equipamento — itens de
      // pressão/temperatura próprios de esterilização a vapor.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'VALVULA_SEGURANCA', label: 'Válvula de Segurança' }),
        Object.freeze({ codigo: 'MANOMETRO', label: 'Manômetro' }),
        Object.freeze({ codigo: 'MANOVACUOMETRO', label: 'Manovacuômetro' }),
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' }),
        Object.freeze({ codigo: 'PRESSOSTATO', label: 'Pressostato' }),
        Object.freeze({ codigo: 'TRANSDUTOR_PRESSAO', label: 'Transdutor de Pressão' })
      ]),
      // QI/QO — baseado no POP.STEC.132 (Ebserh/HU-UFGD, calibração de
      // autoclave vertical) + prática geral de qualificação de instalação
      // e operação de equipamento médico-hospitalar. Distâncias de
      // parede/bitola de fio/vazão de água NÃO têm número fixo em norma —
      // por isso os itens pedem para o técnico confirmar contra o manual
      // do fabricante daquele modelo, não um valor genérico.
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante (tensão, bitola do cabo, disjuntor dedicado)' }),
        Object.freeze({ codigo: 'INSTALACAO_HIDRAULICA', label: 'Alimentação de água conforme especificação do fabricante (qualidade/osmose reversa, quando aplicável)' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos de parede, laterais e espaço de ventilação conforme manual do fabricante' }),
        Object.freeze({ codigo: 'DRENO', label: 'Ponto de dreno para escoamento de vapor/água disponível e funcional' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'TRAVAS_SEGURANCA', label: 'Travas de segurança da porta e alarmes testados' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação/guarnição da porta íntegra, sem vazamentos' }),
        Object.freeze({ codigo: 'INSTRUMENTOS_FUNCIONAMENTO', label: 'Manômetro, manovacuômetro, pressostato e transdutor de pressão verificados em funcionamento' }),
        Object.freeze({ codigo: 'ESTABILIZACAO', label: 'Estabilização de temperatura e pressão no ponto de trabalho verificada durante o ciclo' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'ABNT NBR ISO 17665-1 — Esterilização de produtos para saúde — Vapor',
        'ABNT NBR 11816 — Esterilizadores a vapor com vácuo',
        'ABNT NBR 11817 — Esterilizadores a vapor — Esterilizadores pequenos',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em autoclave a vapor.'
    }),

    // Equipamento de cadeia de frio: ANTES era 1 perfil só ("Câmara de
    // Conservação / Câmara Fria / Refrigerador / Freezer"), o que fazia o
    // documento imprimir esse rótulo composto inteiro como "Equipamento" —
    // ficava com cara de modelo genérico, não de atendimento individual a
    // um equipamento específico. Corrigido em 2026-07-24: virou 4 perfis
    // com o mesmo conteúdo técnico (QI/QO/itens calibráveis/normas
    // idênticos) e só o rótulo/código muda — o técnico escolhe o tipo
    // exato do equipamento atendido e só esse nome aparece no documento.
    // Também corrigido nesta rodada: QO estava ausente (usaQO:false) —
    // achado incorreto de sessão anterior. Existe sim etapa de operação
    // distinta da instalação em equipamento de refrigeração (alarme de
    // desvio de temperatura, sistema de refrigeração em funcionamento,
    // ciclo de degelo, bateria de backup do alarme) — adicionado.
    CAMARA_CONSERVACAO: Object.freeze({
      codigo: 'CAMARA_CONSERVACAO',
      label: 'Câmara de Conservação',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'POSICAO_SENSORES', label: 'Sensores de temperatura instalados na posição correta (mínimo 12, distribuídos geometricamente, um adjacente ao sensor de controle do equipamento)' }),
        Object.freeze({ codigo: 'DISTANCIA_SENSORES', label: 'Sensores sem contato com a superfície interna, respeitando distância mínima de 3 cm das laterais' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação da porta íntegra, sem infiltração de ar externo' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'ALARME_TEMPERATURA', label: 'Alarme de desvio de temperatura (alta/baixa) testado' }),
        Object.freeze({ codigo: 'SISTEMA_REFRIGERACAO', label: 'Sistema de refrigeração (compressor/motor) funcionando corretamente, sem ruído ou vibração anormal' }),
        Object.freeze({ codigo: 'CICLO_DESCONGELAMENTO', label: 'Ciclo de degelo/descongelamento automático testado (quando equipado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e display de temperatura funcionando corretamente' }),
        Object.freeze({ codigo: 'BATERIA_BACKUP', label: 'Sistema de alarme com bateria de backup testado (quando equipado)' })
      ]),
      normas: Object.freeze([
        'ABNT NBR 16328, Anexo G — Refrigeradores, freezers, câmaras frias e ultrafreezers',
        'RDC nº 430/2020 (Anvisa) — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em câmara de conservação.'
    }),

    CAMARA_FRIA: Object.freeze({
      codigo: 'CAMARA_FRIA',
      label: 'Câmara Fria',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'POSICAO_SENSORES', label: 'Sensores de temperatura instalados na posição correta (mínimo 12, distribuídos geometricamente, um adjacente ao sensor de controle do equipamento)' }),
        Object.freeze({ codigo: 'DISTANCIA_SENSORES', label: 'Sensores sem contato com a superfície interna, respeitando distância mínima de 3 cm das laterais' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação da porta íntegra, sem infiltração de ar externo' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'ALARME_TEMPERATURA', label: 'Alarme de desvio de temperatura (alta/baixa) testado' }),
        Object.freeze({ codigo: 'SISTEMA_REFRIGERACAO', label: 'Sistema de refrigeração (compressor/motor) funcionando corretamente, sem ruído ou vibração anormal' }),
        Object.freeze({ codigo: 'CICLO_DESCONGELAMENTO', label: 'Ciclo de degelo/descongelamento automático testado (quando equipado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e display de temperatura funcionando corretamente' }),
        Object.freeze({ codigo: 'BATERIA_BACKUP', label: 'Sistema de alarme com bateria de backup testado (quando equipado)' })
      ]),
      normas: Object.freeze([
        'ABNT NBR 16328, Anexo G — Refrigeradores, freezers, câmaras frias e ultrafreezers',
        'RDC nº 430/2020 (Anvisa) — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em câmara fria.'
    }),

    REFRIGERADOR: Object.freeze({
      codigo: 'REFRIGERADOR',
      label: 'Refrigerador',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'POSICAO_SENSORES', label: 'Sensores de temperatura instalados na posição correta (mínimo 12, distribuídos geometricamente, um adjacente ao sensor de controle do equipamento)' }),
        Object.freeze({ codigo: 'DISTANCIA_SENSORES', label: 'Sensores sem contato com a superfície interna, respeitando distância mínima de 3 cm das laterais' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação da porta íntegra, sem infiltração de ar externo' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'ALARME_TEMPERATURA', label: 'Alarme de desvio de temperatura (alta/baixa) testado' }),
        Object.freeze({ codigo: 'SISTEMA_REFRIGERACAO', label: 'Sistema de refrigeração (compressor/motor) funcionando corretamente, sem ruído ou vibração anormal' }),
        Object.freeze({ codigo: 'CICLO_DESCONGELAMENTO', label: 'Ciclo de degelo/descongelamento automático testado (quando equipado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e display de temperatura funcionando corretamente' }),
        Object.freeze({ codigo: 'BATERIA_BACKUP', label: 'Sistema de alarme com bateria de backup testado (quando equipado)' })
      ]),
      normas: Object.freeze([
        'ABNT NBR 16328, Anexo G — Refrigeradores, freezers, câmaras frias e ultrafreezers',
        'RDC nº 430/2020 (Anvisa) — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em refrigerador.'
    }),

    FREEZER: Object.freeze({
      codigo: 'FREEZER',
      label: 'Freezer / Ultrafreezer',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'POSICAO_SENSORES', label: 'Sensores de temperatura instalados na posição correta (mínimo 12, distribuídos geometricamente, um adjacente ao sensor de controle do equipamento)' }),
        Object.freeze({ codigo: 'DISTANCIA_SENSORES', label: 'Sensores sem contato com a superfície interna, respeitando distância mínima de 3 cm das laterais' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação da porta/tampa íntegra, sem infiltração de ar externo' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'ALARME_TEMPERATURA', label: 'Alarme de desvio de temperatura (alta/baixa) testado' }),
        Object.freeze({ codigo: 'SISTEMA_REFRIGERACAO', label: 'Sistema de refrigeração (compressor/motor) funcionando corretamente, sem ruído ou vibração anormal' }),
        Object.freeze({ codigo: 'CICLO_DESCONGELAMENTO', label: 'Ciclo de degelo/descongelamento automático testado (quando equipado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e display de temperatura funcionando corretamente' }),
        Object.freeze({ codigo: 'BATERIA_BACKUP', label: 'Sistema de alarme com bateria de backup testado (quando equipado)' })
      ]),
      normas: Object.freeze([
        'ABNT NBR 16328, Anexo G — Refrigeradores, freezers, câmaras frias e ultrafreezers',
        'RDC nº 430/2020 (Anvisa) — Boas Práticas de Distribuição, Armazenagem e Transporte de Medicamentos'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em freezer/ultrafreezer.'
    }),

    CENTRIFUGA: Object.freeze({
      codigo: 'CENTRIFUGA',
      label: 'Centrífuga (sem refrigeração)',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      // Baseado no POP.STEC.137 (Ebserh/HU-UFGD, calibração de
      // equipamentos do tipo centrífuga): tempo de ciclo verificado
      // contra cronômetro externo; rotação (RPM) verificada com
      // tacômetro digital sem contato + fita reflexiva no rotor. Não
      // foi possível extrair as tolerâncias numéricas do PDF original
      // (documento digitalizado, sem camada de texto) — por isso,
      // assim como nos outros perfis, o critério fica com o técnico
      // confrontando o resultado contra o certificado de calibração
      // do instrumento de referência, não um número fixo aqui.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'TEMPORIZADOR', label: 'Temporizador/Cronômetro do ciclo' }),
        Object.freeze({ codigo: 'INDICADOR_ROTACAO', label: 'Indicador de Rotação (RPM)' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'NIVELAMENTO_BASE', label: 'Equipamento nivelado e fixado sobre superfície firme e estável, conforme manual do fabricante (crítico pela vibração em alta rotação)' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos e espaço de ventilação ao redor do equipamento conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'TRAVA_TAMPA', label: 'Trava/interlock de segurança da tampa testado (impede abertura com o rotor em movimento)' }),
        Object.freeze({ codigo: 'BALANCEAMENTO_ROTOR', label: 'Balanceamento do rotor verificado (amostras/contrapesos distribuídos simetricamente antes do ciclo)' }),
        Object.freeze({ codigo: 'FRENAGEM', label: 'Sistema de frenagem testado (parada do rotor dentro do tempo esperado, sem choque ou ruído anormal)' }),
        Object.freeze({ codigo: 'ALARME_DESBALANCEAMENTO', label: 'Alarme de desbalanceamento/vibração excessiva testado' }),
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'POP.STEC.137 (Ebserh/HU-UFGD) — Calibração de equipamentos do tipo centrífuga',
        'RDC nº 302/2005 (Anvisa) — Regulamento técnico para funcionamento de laboratórios clínicos (calibração/verificação periódica de equipamentos de medição)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em centrífuga.'
    }),

    CENTRIFUGA_REFRIGERADA: Object.freeze({
      codigo: 'CENTRIFUGA_REFRIGERADA',
      label: 'Centrífuga Refrigerada',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      // Mesma base da Centrífuga comum (POP.STEC.137) + item de
      // temperatura interna, que o POP trata como parâmetro adicional
      // só nos modelos com sistema de refrigeração.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'TEMPORIZADOR', label: 'Temporizador/Cronômetro do ciclo' }),
        Object.freeze({ codigo: 'INDICADOR_ROTACAO', label: 'Indicador de Rotação (RPM)' }),
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'NIVELAMENTO_BASE', label: 'Equipamento nivelado e fixado sobre superfície firme e estável, conforme manual do fabricante (crítico pela vibração em alta rotação)' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos e espaço de ventilação ao redor do equipamento conforme manual do fabricante' }),
        Object.freeze({ codigo: 'SISTEMA_REFRIGERACAO', label: 'Sistema de refrigeração instalado e operando conforme especificação do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'TRAVA_TAMPA', label: 'Trava/interlock de segurança da tampa testado (impede abertura com o rotor em movimento)' }),
        Object.freeze({ codigo: 'BALANCEAMENTO_ROTOR', label: 'Balanceamento do rotor verificado (amostras/contrapesos distribuídos simetricamente antes do ciclo)' }),
        Object.freeze({ codigo: 'FRENAGEM', label: 'Sistema de frenagem testado (parada do rotor dentro do tempo esperado, sem choque ou ruído anormal)' }),
        Object.freeze({ codigo: 'ALARME_DESBALANCEAMENTO', label: 'Alarme de desbalanceamento/vibração excessiva testado' }),
        Object.freeze({ codigo: 'ESTABILIZACAO_TEMPERATURA', label: 'Estabilização da temperatura interna no ponto de trabalho verificada durante o ciclo' }),
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'POP.STEC.137 (Ebserh/HU-UFGD) — Calibração de equipamentos do tipo centrífuga',
        'RDC nº 302/2005 (Anvisa) — Regulamento técnico para funcionamento de laboratórios clínicos (calibração/verificação periódica de equipamentos de medição)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em centrífuga refrigerada.'
    }),

    TERMODESINFECTORA: Object.freeze({
      codigo: 'TERMODESINFECTORA',
      label: 'Termodesinfectora / Lavadora Desinfetadora Automática',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      // Baseado na família de normas ANSI/AAMI ST15883 (ISO 15883,
      // adotada localmente): o parâmetro central de desempenho é o
      // valor A0 (ISO 15883-1) — tempo em segundos a 80°C, Z=10, que
      // expressa a letalidade da desinfecção térmica. A0 ≥ 600
      // (equivalente a 1 min a 90°C) é o critério da ISO 15883-2 para
      // instrumental cirúrgico; A0 ≥ 3000 é usado quando se exige maior
      // margem contra vírus resistentes ao calor. RDC nº 15/2012
      // (Anvisa) exige QI/QO/QD documentados pra equipamento de limpeza
      // automatizada de produtos para saúde, mesma base já usada no
      // perfil de Autoclave a Vapor.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura da câmara de lavagem/desinfecção' }),
        Object.freeze({ codigo: 'CONDUTIVIMETRO', label: 'Sensor/Indicador de Condutividade da água de enxágue final' }),
        Object.freeze({ codigo: 'DOSADOR_QUIMICO', label: 'Dosador de detergente/produto químico' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'INSTALACAO_HIDRAULICA', label: 'Alimentação de água (fria/quente/osmose, conforme especificação do fabricante) instalada e funcionando' }),
        Object.freeze({ codigo: 'DRENO', label: 'Ponto de dreno/esgoto para escoamento de água disponível e funcional' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos de parede, laterais e espaço de ventilação conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação/guarnição da porta íntegra, sem vazamentos' }),
        Object.freeze({ codigo: 'BRACOS_ASPERSAO', label: 'Braços de aspersão (spray arms) girando livremente, bicos sem obstrução' }),
        Object.freeze({ codigo: 'FILTROS_RESIDUO', label: 'Filtros/telas de retenção de resíduos limpos e posicionados corretamente' }),
        Object.freeze({ codigo: 'DOSAGEM_QUIMICOS', label: 'Sistema de dosagem de detergente/produto químico verificado' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'ANSI/AAMI ST15883-1 (ISO 15883-1) — Washer-disinfectors — Requisitos gerais',
        'ANSI/AAMI ST15883-2 (ISO 15883-2) — Washer-disinfectors — Desinfecção térmica (valor A0)',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (equipamento de limpeza automatizada)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em termodesinfectora (lavadora desinfetadora automática).'
    }),

    LAVADORA_ULTRASSONICA: Object.freeze({
      codigo: 'LAVADORA_ULTRASSONICA',
      label: 'Lavadora Ultrassônica',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      // Existe POP.STEC.150 (Ebserh/HU-UFGD, "LavadoraUS") específico pra
      // este equipamento, mas o PDF publicado é digitalizado (sem
      // camada de texto), então não foi possível extrair os valores
      // exatos de tolerância. O método de verificação de desempenho é
      // amplamente documentado e consistente entre fontes: teste de
      // cavitação por folha de alumínio ou indicador químico tipo
      // Sonocheck (mudança de cor verde→amarelo), alinhado à ISO 15883
      // e exigido junto com QI/QO/QD pela RDC nº 15/2012.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'TEMPORIZADOR', label: 'Temporizador/Cronômetro do ciclo' }),
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura do tanque' }),
        Object.freeze({ codigo: 'GERADOR_ULTRASSOM', label: 'Gerador/Transdutor de ultrassom (frequência/potência)' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'INSTALACAO_HIDRAULICA', label: 'Enchimento/dreno do tanque conforme especificação do fabricante' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos e espaço de ventilação ao redor do equipamento conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'TAMPA_TANQUE', label: 'Tampa/proteção do tanque presente e funcional (redução de aerossol)' }),
        Object.freeze({ codigo: 'TESTE_CAVITACAO', label: 'Teste de cavitação (folha de alumínio ou indicador tipo Sonocheck) realizado, confirmando atividade ultrassônica uniforme no tanque' }),
        Object.freeze({ codigo: 'NIVEL_SOLUCAO', label: 'Nível/volume da solução de limpeza dentro da faixa especificada pelo fabricante' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'POP.STEC.150 (Ebserh/HU-UFGD) — Lavadora Ultrassônica',
        'ISO 15883 (referência de desempenho de equipamento de limpeza pré-desinfecção)',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (QI/QO/QD anual)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em lavadora ultrassônica.'
    }),

    AUTOCLAVE_PEROXIDO: Object.freeze({
      codigo: 'AUTOCLAVE_PEROXIDO',
      label: 'Esterilizador a Peróxido de Hidrogênio (Gás Plasma)',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: true,
      // Baseado na ISO 14937 (requisitos gerais de esterilização de
      // produtos para saúde) e na prática documentada de equipamentos
      // do tipo (ex.: família Sterrad): ciclo por vácuo profundo +
      // injeção de peróxido de hidrogênio vaporizado + fase de plasma,
      // validado com indicador biológico de Geobacillus/Bacillus
      // stearothermophilus, visando nível de garantia de esterilidade
      // (SAL) de 10⁻⁶. RDC nº 15/2012 exige QI/QO/QD anuais, mesma base
      // já usada no perfil de Autoclave a Vapor.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_VACUO', label: 'Sensor/Transdutor de vácuo da câmara' }),
        Object.freeze({ codigo: 'SENSOR_PRESSAO', label: 'Sensor de Pressão da câmara' }),
        Object.freeze({ codigo: 'MONITOR_CONCENTRACAO_H2O2', label: 'Monitor de concentração de peróxido de hidrogênio (quando o modelo possuir)' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'VENTILACAO_EXAUSTAO', label: 'Sistema de exaustão/ventilação do ambiente conforme especificação do fabricante (manuseio seguro do cassete de peróxido de hidrogênio)' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos de parede, laterais e espaço de ventilação conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação/guarnição da porta íntegra, sem vazamentos' }),
        Object.freeze({ codigo: 'SISTEMA_VACUO', label: 'Sistema de vácuo da câmara testado (atinge e sustenta o nível de vácuo especificado)' }),
        Object.freeze({ codigo: 'CASSETE_PEROXIDO', label: 'Sistema de leitura/inserção do cassete de peróxido de hidrogênio funcionando corretamente' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' }),
        Object.freeze({ codigo: 'INDICADOR_BIOLOGICO_QUIMICO', label: 'Indicador biológico (Geobacillus/Bacillus stearothermophilus) e indicador químico utilizados conforme especificado' })
      ]),
      normas: Object.freeze([
        'ABNT NBR ISO 14937 — Esterilização de produtos para saúde — Requisitos gerais',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (QI/QO/QD anual)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em esterilizador a peróxido de hidrogênio (gás plasma).'
    }),

    AUTOCLAVE_ETO: Object.freeze({
      codigo: 'AUTOCLAVE_ETO',
      label: 'Esterilizador a Óxido de Etileno (ETO)',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: true,
      // Baseado na ABNT NBR ISO 11135 (esterilização por óxido de
      // etileno): faixa operacional de referência — concentração 450 a
      // 1200 mg/L, temperatura 37 a 63°C, umidade relativa 40 a 80%,
      // tempo de exposição 1 a 6h — variando por ciclo/fabricante, por
      // isso os itens de QO pedem conferência contra a receita
      // registrada do equipamento, não um valor único fixo aqui. RDC nº
      // 15/2012 exige QI/QO/QD anuais.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura da câmara' }),
        Object.freeze({ codigo: 'SENSOR_UMIDADE', label: 'Sensor de Umidade relativa da câmara' }),
        Object.freeze({ codigo: 'SENSOR_PRESSAO', label: 'Sensor de Pressão da câmara' }),
        Object.freeze({ codigo: 'MONITOR_CONCENTRACAO_ETO', label: 'Monitor de concentração de óxido de etileno' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'SISTEMA_EXAUSTAO_ETO', label: 'Sistema de exaustão/aeração de óxido de etileno instalado conforme especificação do fabricante (gás tóxico e inflamável)' }),
        Object.freeze({ codigo: 'ARMAZENAMENTO_CARTUCHOS', label: 'Área de armazenamento dos cartuchos/cilindros de óxido de etileno conforme normas de segurança' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos de parede, laterais e espaço de ventilação conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação/guarnição da porta íntegra, sem vazamentos' }),
        Object.freeze({ codigo: 'CONDICIONAMENTO', label: 'Fase de condicionamento (pré-aquecimento/umidificação da câmara) testada, atingindo temperatura e umidade dentro da faixa especificada antes da admissão do gás' }),
        Object.freeze({ codigo: 'FASE_AERACAO', label: 'Fase de aeração pós-ciclo testada (remoção do gás residual dentro do tempo especificado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' }),
        Object.freeze({ codigo: 'INDICADOR_BIOLOGICO_QUIMICO', label: 'Indicador biológico e indicador químico utilizados conforme especificado' })
      ]),
      normas: Object.freeze([
        'ABNT NBR ISO 11135 — Esterilização de produtos para saúde — Óxido de etileno',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (QI/QO/QD anual)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em esterilizador a óxido de etileno.'
    }),

    AUTOCLAVE_FORMALDEIDO: Object.freeze({
      codigo: 'AUTOCLAVE_FORMALDEIDO',
      label: 'Esterilizador a Vapor de Baixa Temperatura e Formaldeído (VBTF)',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: true,
      // Baseado na ISO 25424:2009 (processos de esterilização por vapor
      // de baixa temperatura e formaldeído) e na RDC nº 91/2008
      // (Anvisa): faixa de referência — concentração de formaldeído 8 a
      // 16 mg/L, temperatura 60 a 80°C, umidade relativa 75 a 100%.
      // Indicador biológico de referência: Geobacillus stearothermophilus
      // ATCC 10149. RDC nº 15/2012 exige QI/QO/QD anuais.
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura da câmara' }),
        Object.freeze({ codigo: 'SENSOR_UMIDADE', label: 'Sensor de Umidade relativa da câmara' }),
        Object.freeze({ codigo: 'SENSOR_PRESSAO', label: 'Sensor de Pressão da câmara' }),
        Object.freeze({ codigo: 'MONITOR_CONCENTRACAO_FORMOL', label: 'Monitor/dosador de concentração de formaldeído' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'SISTEMA_EXAUSTAO_FORMOL', label: 'Sistema de exaustão/ventilação para manuseio seguro de formaldeído instalado conforme especificação do fabricante' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Afastamentos de parede, laterais e espaço de ventilação conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'CICLOS_PROGRAMADOS', label: 'Ciclos programados do equipamento testados e funcionando conforme especificado' }),
        Object.freeze({ codigo: 'VEDACAO_PORTA', label: 'Vedação/guarnição da porta íntegra, sem vazamentos' }),
        Object.freeze({ codigo: 'SISTEMA_VACUO', label: 'Sistema de vácuo/extração de ar da câmara testado (pulsos fracionados, conforme ISO 25424)' }),
        Object.freeze({ codigo: 'DOSAGEM_FORMALDEIDO', label: 'Sistema de dosagem da solução de formaldeído verificado' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' }),
        Object.freeze({ codigo: 'INDICADOR_BIOLOGICO_QUIMICO', label: 'Indicador biológico (Geobacillus stearothermophilus ATCC 10149) e indicador químico utilizados conforme especificado' })
      ]),
      normas: Object.freeze([
        'ISO 25424:2009 — Esterilização de produtos para saúde — Vapor de baixa temperatura e formaldeído',
        'RDC nº 91/2008 (Anvisa) — Requisitos para uso de formaldeído em esterilização',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (QI/QO/QD anual)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em esterilizador a vapor de baixa temperatura e formaldeído.'
    }),

    CAPELA_FLUXO_LAMINAR: Object.freeze({
      codigo: 'CAPELA_FLUXO_LAMINAR',
      label: 'Capela de Fluxo Laminar',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      // Baseado na ABNT NBR 15767 (equipamentos de fluxo unidirecional)
      // e na família ABNT NBR ISO 14644 (salas limpas — classificação e
      // métodos de ensaio), além do POP.STEC.146 (Ebserh/HU-UFGD,
      // "Qualificação de Desempenho de Equipamentos do Tipo Capela de
      // Fluxo Laminar"). Testes centrais: velocidade do fluxo de ar
      // (anemômetro), ensaio de fumaça (padrão unidirecional, sem
      // turbulência), contagem de partículas (classificação ISO 14644-1)
      // e integridade do filtro HEPA (retenção ≥99,97% de partículas
      // ≥0,3 µm).
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'MANOMETRO_DIFERENCIAL', label: 'Manômetro diferencial de pressão do filtro HEPA' }),
        Object.freeze({ codigo: 'INDICADOR_VELOCIDADE_AR', label: 'Indicador de velocidade do fluxo de ar (quando equipado)' }),
        Object.freeze({ codigo: 'TEMPORIZADOR_UV', label: 'Temporizador da lâmpada UV germicida (quando equipado)' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'NIVELAMENTO_BASE', label: 'Bancada/base nivelada e estável, conforme manual do fabricante' }),
        Object.freeze({ codigo: 'AFASTAMENTOS', label: 'Posicionamento sem interferência de portas, janelas ou correntes de ar que possam perturbar o fluxo laminar' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'FILTRO_HEPA', label: 'Integridade do filtro HEPA verificada (retenção ≥99,97% de partículas ≥0,3 µm)' }),
        Object.freeze({ codigo: 'VELOCIDADE_AR', label: 'Velocidade do fluxo de ar medida com anemômetro, dentro da faixa especificada pelo fabricante' }),
        Object.freeze({ codigo: 'ENSAIO_FUMACA', label: 'Ensaio de fumaça (visualização do padrão de fluxo unidirecional) realizado, sem turbulência ou recirculação' }),
        Object.freeze({ codigo: 'CONTAGEM_PARTICULAS', label: 'Contagem de partículas em suspensão realizada, classificação da área conforme ABNT NBR ISO 14644-1' }),
        Object.freeze({ codigo: 'LAMPADA_UV', label: 'Lâmpada UV germicida testada (quando equipada)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'ABNT NBR 15767 — Equipamentos de fluxo unidirecional — Requisitos e métodos de ensaio',
        'ABNT NBR ISO 14644-1 / 14644-3 — Salas limpas e ambientes controlados associados — Classificação e métodos de ensaio',
        'POP.STEC.146 (Ebserh/HU-UFGD) — Qualificação de Desempenho de Equipamentos do Tipo Capela de Fluxo Laminar'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em capela de fluxo laminar.'
    }),

    // 2026-07-25 (backlog pedido pelo usuário): pesquisado ABNT NBR ISO
    // 11607-1/2 (embalagens para produtos para saúde esterilizados
    // terminalmente — requisitos e validação de selagem) e RDC nº 15/2012
    // (Anvisa, processamento de produtos para saúde em CME). Achado
    // importante: a força mínima de selagem (peel/seal strength) NÃO tem
    // valor numérico fixo na própria ISO 11607-1 — o critério de aceitação
    // é definido pelo fabricante do material/seladora e pela gestão de
    // risco local (mesma honestidade já usada em Centrífuga/Lavadora
    // Ultrassônica quando a fonte não traz tolerância pronta); por isso o
    // item de QO pede conferência contra o teste de selagem (fita/tira
    // indicadora tipo Seal Test) e o manual do fabricante, não um número
    // fixo aqui.
    SELADORA_GRAU_CIRURGICO: Object.freeze({
      codigo: 'SELADORA_GRAU_CIRURGICO',
      label: 'Seladora de Grau Cirúrgico',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura da barra de selagem' }),
        Object.freeze({ codigo: 'TEMPORIZADOR', label: 'Temporizador/Velocidade de avanço do rolo de selagem' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço (área limpa do CME, entre preparo e esterilização)' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'NIVELAMENTO_BASE', label: 'Bancada/base nivelada e estável, com espaço suficiente para acomodar a embalagem antes e depois da selagem' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'AJUSTE_TEMPERATURA_VELOCIDADE', label: 'Temperatura da barra de selagem e velocidade do rolo ajustadas conforme especificação do fabricante para o papel grau cirúrgico em uso' }),
        Object.freeze({ codigo: 'TESTE_SELAGEM', label: 'Teste de integridade de selagem realizado (fita/tira indicadora tipo Seal Test ou inspeção visual de canais, rugas e falhas), conforme ABNT NBR ISO 11607-1' }),
        Object.freeze({ codigo: 'LARGURA_SELAGEM', label: 'Largura da selagem conferida dentro da faixa especificada pelo fabricante (mínimo usual de 6 mm de área selada contínua)' }),
        Object.freeze({ codigo: 'ALARME_FALHA', label: 'Alarme/indicador de falha de temperatura ou papel testado (quando equipado)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'ABNT NBR ISO 11607-1 — Embalagens para produtos para saúde esterilizados terminalmente — Requisitos para materiais, sistemas de barreira estéril e sistemas de embalagem',
        'ABNT NBR ISO 11607-2 — Requisitos de validação para os processos de formação, selagem e montagem',
        'RDC nº 15/2012 (Anvisa) — Boas práticas para o processamento de produtos para saúde (verificação diária de rotina da seladora no CME)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em seladora de grau cirúrgico.'
    }),

    // 2026-07-25 (backlog): Incubadora de Testes Biológicos — usada para
    // incubar indicador biológico (IB) após ciclo de esterilização,
    // exigência da RDC nº 15/2012 (Anvisa), Art. 42 (a área de
    // monitoramento de esterilização deve dispor de incubadoras de IB),
    // Art. 98 (IB obrigatório em cada carga com produto implantável) e
    // Art. 99 (leitura diária em pacote desafio, ponto de maior desafio).
    // Faixa de incubação típica p/ IB de vapor: 55-60°C (fabricantes tipo
    // 3M Attest); IB de óxido de etileno/peróxido usam faixas próprias —
    // por isso o item de QO pede conferência contra o rótulo do IB em
    // uso, não um valor único fixo. Também existe COMO calibração simples
    // no módulo Relatório de Calibração (ver SGO_RelCal_Config.js) — o
    // usuário pediu os dois, mesmo raciocínio já aplicado à Centrífuga:
    // este perfil cobre a qualificação completa de instalação/operação
    // (equipamento novo/reposicionado na área de monitoramento), o outro
    // cobre só a calibração periódica de rotina.
    INCUBADORA_TESTES_BIOLOGICOS: Object.freeze({
      codigo: 'INCUBADORA_TESTES_BIOLOGICOS',
      label: 'Incubadora de Testes Biológicos',
      usaQI: true,
      usaQO: true,
      usaQD: true,
      usaReceitas: false,
      itensCalibraveis: Object.freeze([
        Object.freeze({ codigo: 'SENSOR_TEMPERATURA', label: 'Sensor de Temperatura da câmara de incubação' })
      ]),
      itensQI: Object.freeze([
        Object.freeze({ codigo: 'IDENTIFICACAO', label: 'Identificação do equipamento conferida (nº de série, modelo, fabricante, patrimônio)' }),
        Object.freeze({ codigo: 'LOCALIZACAO', label: 'Localização/setor do equipamento conforme ordem de serviço (área de monitoramento de esterilização, conforme RDC nº 15/2012)' }),
        Object.freeze({ codigo: 'INSTALACAO_ELETRICA', label: 'Instalação elétrica compatível com a especificação do fabricante' }),
        Object.freeze({ codigo: 'POSICAO_CUBETAS', label: 'Suportes/orifícios para os indicadores biológicos posicionados conforme manual do fabricante' }),
        Object.freeze({ codigo: 'CONDICOES_AMBIENTAIS', label: 'Condições ambientais do local (temperatura/umidade) registradas' }),
        Object.freeze({ codigo: 'DOCUMENTACAO', label: 'Documentação técnica do equipamento (manual do usuário) disponível no setor' })
      ]),
      itensQO: Object.freeze([
        Object.freeze({ codigo: 'ESTABILIZACAO_TEMPERATURA', label: 'Estabilização de temperatura na faixa de incubação especificada pelo fabricante do indicador biológico em uso verificada' }),
        Object.freeze({ codigo: 'ALARME_TEMPERATURA', label: 'Alarme de desvio de temperatura testado (quando equipado)' }),
        Object.freeze({ codigo: 'TEMPORIZADOR_LEITURA', label: 'Temporizador/indicador de tempo de leitura testado (quando o modelo possuir leitura automática/fluorescente)' }),
        Object.freeze({ codigo: 'PAINEL_COMANDOS', label: 'Painel de comando e indicadores funcionando corretamente' })
      ]),
      normas: Object.freeze([
        'RDC nº 15/2012 (Anvisa), Art. 42/98/99 — Incubadora de indicador biológico na área de monitoramento de esterilização',
        'ABNT NBR ISO 11138-1 — Indicadores biológicos para esterilização — Requisitos gerais (referência para a faixa de incubação do IB utilizado)'
      ]),
      escopoPadrao: 'Execução de serviço técnico de calibração e qualificação de instalação/operação/desempenho em incubadora de testes biológicos.'
    })

  }),

  UPLOAD_FOLDER_PROP: 'DECLEXEC_UPLOAD_FOLDER_ID'
});
