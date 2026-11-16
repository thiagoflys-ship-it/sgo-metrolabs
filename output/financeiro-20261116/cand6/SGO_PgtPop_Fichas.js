/****************************************************
 * PGT E POP — FICHAS TÉCNICAS (14/11/2026)
 * GERADO por output/pgtpop-refacao-20261114/dev/gerar-fichas.cjs a partir de
 * especialista/FICHAS_TECNICAS.json (versão 1.0, 2026-11-14) e
 * especialista/NORMAS_VERIFICADAS.json (só normas VIGENTE). NÃO EDITAR À MÃO: gere de novo.
 * Usado por SGO_PgtPop_IA.js (pedido à IA e conferência), SGO_PgtPop_Main.js (dados obrigatórios,
 * POPs condicionais, seções montadas pelo sistema) e pela tela (perguntas, via bootstrap).
 ****************************************************/
var PGTPOP_FICHAS = {
 "versao": "1.0",
 "elaboradoEm": "2026-11-14",
 "comoUsar": "Cada ficha é a fonte do conteúdo técnico mínimo de um documento. A IA recebe a ficha inteira (objetivo, escopo, seções na ordem, conteudoMinimo, passosEssenciais, responsabilidades, registros, indicadores, periodicidade) e as respostas do hospital a dadosDoHospital. 'normas' lista ids de NORMAS_VERIFICADAS.json (só VIGENTE); a IA só pode citar essas, na forma 'comoCitar'. 'verificacao': após normalizar acentos e caixa, o item é considerado presente quando pelo menos UMA das expressões aparece no texto da seção (expressões terminadas em radical, como 'segreg', valem como prefixo). Item ausente = pedir nova geração daquela seção ou marcar 'Revisar texto'.",
 "subgrupos": [
  [
   "ec",
   "Engenharia clínica e responsável pelo plano"
  ],
  [
   "estrutura",
   "Setores, natureza jurídica e estruturas"
  ],
  [
   "impl",
   "Situação de implantação de cada etapa"
  ]
 ],
 "perguntas": [
  {
   "id": "ec_modelo",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Modelo da engenharia clínica",
   "tipo": "opcoes",
   "opcoes": [
    [
     "propria",
     "Própria (equipe do estabelecimento)"
    ],
    [
     "contratada",
     "Contratada (empresa especializada)"
    ],
    [
     "mista",
     "Mista (equipe própria e empresa contratada)"
    ]
   ],
   "porQue": "Define quem executa cada etapa e se há contrato formal (RDC 509, art. 6º). Sem isso a IA inventa equipes.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "ec_empresa",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Nome da empresa contratada",
   "tipo": "texto",
   "exigeSe": {
    "pergunta": "ec_modelo",
    "valores": [
     "contratada",
     "mista"
    ]
   },
   "dica": "Obrigatório quando a engenharia clínica é contratada ou mista. É a empresa de engenharia clínica, não fabricante de equipamento.",
   "porQue": "Define quem executa cada etapa e se há contrato formal (RDC 509, art. 6º). Sem isso a IA inventa equipes.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "resp_nome",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Nome do responsável designado pelo plano",
   "tipo": "texto",
   "porQue": "Exigência do art. 7º da RDC 509 (nível superior, registro ativo quando couber).",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "resp_cargo",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Cargo do responsável designado",
   "tipo": "texto",
   "porQue": "Exigência do art. 7º da RDC 509 (nível superior, registro ativo quando couber).",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "resp_formacao",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Formação de nível superior do responsável",
   "tipo": "texto",
   "exemplo": "Engenharia biomédica",
   "porQue": "Exigência do art. 7º da RDC 509 (nível superior, registro ativo quando couber).",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "resp_registro",
   "grupo": "COMUM",
   "sub": "ec",
   "rotulo": "Registro profissional do responsável (quando couber)",
   "tipo": "texto",
   "exemplo": "CREA-UF 000000/D (fictício)",
   "porQue": "Exigência do art. 7º da RDC 509 (nível superior, registro ativo quando couber).",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "setores",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Unidades e setores assistenciais e de apoio existentes",
   "tipo": "textoLongo",
   "exemplo": "Internação clínica; centro cirúrgico; ambulatório; almoxarifado.",
   "dica": "Escreva só os setores que existem hoje. O texto não cita setor que não esteja nesta lista.",
   "porQue": "Escopo, codificação de ambientes, rondas, transferências. A IA não pode supor UTI, centro cirúrgico ou radiologia.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "natureza",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Natureza jurídica",
   "tipo": "opcoes",
   "opcoes": [
    [
     "privado",
     "Privado"
    ],
    [
     "filantropico",
     "Filantrópico ou sem fins lucrativos"
    ],
    [
     "publico_direta",
     "Público: administração direta, autarquia ou fundação"
    ],
    [
     "estatal",
     "Empresa estatal"
    ]
   ],
   "porQue": "Muda o rito de aquisição e de baixa patrimonial (Lei 14.133/2021 só para público).",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "registro_forma",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Onde os registros são feitos",
   "tipo": "opcoes",
   "opcoes": [
    [
     "sistema",
     "Sistema informatizado de gestão"
    ],
    [
     "planilha",
     "Planilha eletrônica"
    ],
    [
     "papel",
     "Formulários em papel"
    ],
    [
     "misto",
     "Mais de um desses meios"
    ]
   ],
   "dica": "Os POPs dizem onde se registra, sem citar nome comercial de sistema.",
   "porQue": "Os POPs descrevem onde se registra; não pode citar marca.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "est_nsp",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Tem Núcleo de Segurança do Paciente (NSP)?",
   "tipo": "simnao",
   "porQue": "Responsabilidades e fluxos de notificação dependem dessas estruturas.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "est_risco",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Tem gerência de risco ou de qualidade?",
   "tipo": "simnao",
   "porQue": "Responsabilidades e fluxos de notificação dependem dessas estruturas.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "est_sesmt",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Tem SESMT (serviço de segurança e medicina do trabalho)?",
   "tipo": "simnao",
   "porQue": "Responsabilidades e fluxos de notificação dependem dessas estruturas.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "est_ccih",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Tem CCIH (comissão de controle de infecção)?",
   "tipo": "simnao",
   "porQue": "Responsabilidades e fluxos de notificação dependem dessas estruturas.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "est_padronizacao",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Tem comissão de padronização ou equipe multiprofissional de seleção?",
   "tipo": "simnao",
   "porQue": "Responsabilidades e fluxos de notificação dependem dessas estruturas.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "parque",
   "grupo": "COMUM",
   "sub": "estrutura",
   "rotulo": "Quantidade aproximada de equipamentos e se o inventário já existe",
   "tipo": "texto",
   "exemplo": "Cerca de 300 equipamentos; inventário em planilha, desatualizado.",
   "porQue": "Dimensiona inventário, auditorias e cronogramas; evita afirmar que algo 'foi implantado' quando não foi.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_planejamento",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Planejamento e seleção",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_aquisicao",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Aquisição",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_recebimento",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Recebimento e ensaio de aceitação",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_inventario",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Inventário e identificação",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_instalacao",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Instalação",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_historico",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Registro histórico",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_treinamento",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Treinamento",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_armazenamento",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Armazenamento",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_transferencia",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Transferência",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_uso",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Uso e rondas",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_intervencao",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Intervenção técnica (manutenção, calibração e ensaios)",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_desativacao",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Desativação",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "impl_descarte",
   "grupo": "COMUM",
   "sub": "impl",
   "rotulo": "Descarte",
   "tipo": "opcoes",
   "opcoes": [
    [
     "existe",
     "Já existe e funciona"
    ],
    [
     "implantacao",
     "Em implantação"
    ],
    [
     "nao",
     "Ainda não existe"
    ]
   ],
   "porQue": "O texto deve dizer 'deve' ou 'é feito' conforme a realidade; o original e a IA afirmam como fato o que pode não existir.",
   "onde": "comum",
   "ondeTexto": "etapa 1, caixa 1.5"
  },
  {
   "id": "rec_gerador",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem grupo gerador de energia elétrica?",
   "tipo": "simnao",
   "porQue": "Seções e POPs condicionais; a IA não pode supor.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_cilindros",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Usa cilindros de gases medicinais?",
   "tipo": "simnao",
   "porQue": "Condição de geração.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_central_gases",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem central de gases medicinais?",
   "tipo": "simnao",
   "porQue": "Seções e POPs condicionais; a IA não pode supor.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_cme",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem CME (Central de Material e Esterilização)?",
   "tipo": "simnao",
   "porQue": "Seções e POPs condicionais; a IA não pode supor.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_radiologia",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem radiologia diagnóstica ou intervencionista?",
   "tipo": "simnao",
   "porQue": "Seções e POPs condicionais; a IA não pode supor.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_fonte_radioativa",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem equipamento com fonte radioativa?",
   "tipo": "simnao",
   "porQue": "Seções e POPs condicionais; a IA não pode supor.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_sentinela",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Faz parte da Rede Sentinela da Anvisa?",
   "tipo": "simnao",
   "porQue": "RDC 872/2024.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "rec_area_guarda",
   "grupo": "RECURSO",
   "sub": "",
   "rotulo": "Tem área própria de recebimento, guarda ou oficina de equipamentos?",
   "tipo": "simnao",
   "porQue": "Não inventar áreas.",
   "onde": "recurso",
   "ondeTexto": "etapa 1, caixa 1.6"
  },
  {
   "id": "pgt_demais_planos",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Onde estão os planos das demais tecnologias (medicamentos, saneantes, produtos para saúde, higiene e cosméticos) e quem responde por eles",
   "tipo": "textoLongo",
   "exemplo": "Plano de medicamentos e saneantes da farmácia; a cargo da coordenação de farmácia.",
   "porQue": "Art. 5º: o PGTS de equipamentos deve indicar onde está o restante.",
   "onde": "pgt",
   "ondeTexto": "etapa 2, caixa 2.1"
  },
  {
   "id": "pgt_alvaras",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Mais de um serviço com alvará sanitário próprio? Quais?",
   "tipo": "texto",
   "porQue": "Art. 5º, §2º (plano único possível).",
   "onde": "pgt",
   "ondeTexto": "etapa 2, caixa 2.1"
  },
  {
   "id": "pgt_areas",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Áreas para oficina, recebimento, guarda e equipamentos inservíveis: existem? onde?",
   "tipo": "textoLongo",
   "porQue": "Art. 17; o original traz metragens que não são exigência normativa verificada.",
   "onde": "pgt",
   "ondeTexto": "etapa 2, caixa 2.1"
  },
  {
   "id": "metas",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Indicadores e metas que o estabelecimento já usa",
   "tipo": "textoLongo",
   "exemplo": "Cumprimento da preventiva: meta 95%.",
   "referencia": "As fichas trazem metas de referência de mercado (por exemplo, cumprimento da preventiva de 90%). Elas só entram no documento como meta se o estabelecimento adotar e informar aqui.",
   "porQue": "Evita metas inventadas.",
   "onde": "pgt",
   "ondeTexto": "etapa 2, caixa 2.1"
  },
  {
   "id": "doc_local",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Onde ficam os documentos vigentes",
   "tipo": "texto",
   "exemplo": "Pasta do setor e intranet.",
   "porQue": "Descrever acesso real.",
   "onde": "pop:POP001",
   "ondeTexto": "etapa 3, cartão do POP001"
  },
  {
   "id": "doc_politica_arquivo",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Existe política de arquivo ou tabela de temporalidade do estabelecimento?",
   "tipo": "texto",
   "porQue": "Art. 16 remete à Lei 8.159; se não houver, vale 5 anos.",
   "onde": "pop:POP001",
   "ondeTexto": "etapa 3, cartão do POP001"
  },
  {
   "id": "resp_substituto",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Substituto do responsável nas ausências",
   "tipo": "texto",
   "porQue": "Continuidade.",
   "onde": "pop:POP002",
   "ondeTexto": "etapa 3, cartão do POP002"
  },
  {
   "id": "ec_contrato",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Contrato de engenharia clínica: existe? vigência e escopo",
   "tipo": "texto",
   "porQue": "Art. 6º.",
   "onde": "pop:POP002",
   "ondeTexto": "etapa 3, cartão do POP002"
  },
  {
   "id": "inv_meio",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "O inventário existe? Em que meio?",
   "tipo": "texto",
   "porQue": "Situação real.",
   "onde": "pop:POP003",
   "ondeTexto": "etapa 3, cartão do POP003"
  },
  {
   "id": "inv_auditoria_freq",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Frequência da auditoria do inventário escolhida pelo estabelecimento",
   "tipo": "texto",
   "porQue": "Original diverge entre POP e PGT.",
   "onde": "pop:POP003",
   "ondeTexto": "etapa 3, cartão do POP003",
   "referencia": "Referência da ficha técnica, a definir pelo estabelecimento (o sistema nunca preenche): Atualização contínua; auditoria no mínimo anual (o original prevê anual no POP e semestral no PGT: o hospital deve escolher)."
  },
  {
   "id": "inv_terceiros",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Há equipamentos em comodato, locação ou de médicos?",
   "tipo": "texto",
   "porQue": "Critério de inclusão.",
   "onde": "pop:POP003",
   "ondeTexto": "etapa 3, cartão do POP003"
  },
  {
   "id": "cod_regra",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Regra de codificação já usada (patrimônio, sigla)",
   "tipo": "texto",
   "porQue": "Não inventar sigla.",
   "onde": "pop:POP004",
   "ondeTexto": "etapa 3, cartão do POP004"
  },
  {
   "id": "cod_setor",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "O código inclui o setor?",
   "tipo": "simnao",
   "porQue": "Se sim, explicar o que ocorre na transferência.",
   "onde": "pop:POP004",
   "ondeTexto": "etapa 3, cartão do POP004"
  },
  {
   "id": "etq_tipo",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "A etiqueta usa código de barras ou QR?",
   "tipo": "texto",
   "porQue": "Conteúdo da etiqueta.",
   "onde": "pop:POP005",
   "ondeTexto": "etapa 3, cartão do POP005"
  },
  {
   "id": "etq_cores",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Cores de etiqueta já adotadas",
   "tipo": "texto",
   "porQue": "Não inventar código de cores.",
   "onde": "pop:POP005",
   "ondeTexto": "etapa 3, cartão do POP005"
  },
  {
   "id": "sel_aprova",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem aprova a incorporação de equipamentos",
   "tipo": "texto",
   "porQue": "Fluxo.",
   "onde": "pop:POP006",
   "ondeTexto": "etapa 3, cartão do POP006"
  },
  {
   "id": "compras_quem",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem conduz as compras e quem aprova",
   "tipo": "texto",
   "porQue": "Fluxo.",
   "onde": "pop:POP007",
   "ondeTexto": "etapa 3, cartão do POP007"
  },
  {
   "id": "receb_local",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Onde os equipamentos chegam (almoxarifado, setor)",
   "tipo": "texto",
   "porQue": "Fluxo.",
   "onde": "pop:POP008",
   "ondeTexto": "etapa 3, cartão do POP008"
  },
  {
   "id": "receb_analisador",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Há analisador de segurança elétrica (próprio ou da contratada)?",
   "tipo": "texto",
   "porQue": "Como o ensaio é feito.",
   "onde": "pop:POP008",
   "ondeTexto": "etapa 3, cartão do POP008"
  },
  {
   "id": "infra_responsavel",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem responde pela infraestrutura predial",
   "tipo": "texto",
   "porQue": "Responsabilidades.",
   "onde": "popsComum",
   "ondeTexto": "etapa 3, caixa 3.3"
  },
  {
   "id": "area_local",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Onde ficam guardados os equipamentos fora de uso",
   "tipo": "texto",
   "porQue": "Não inventar.",
   "onde": "pop:POP010",
   "ondeTexto": "etapa 3, cartão do POP010"
  },
  {
   "id": "transf_emprestimos",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Há empréstimos de equipamentos a outras unidades?",
   "tipo": "texto",
   "porQue": "Saída externa.",
   "onde": "pop:POP011",
   "ondeTexto": "etapa 3, cartão do POP011"
  },
  {
   "id": "hist_meio",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Onde o registro histórico é mantido",
   "tipo": "texto",
   "porQue": "Descrição real.",
   "onde": "pop:POP012",
   "ondeTexto": "etapa 3, cartão do POP012"
  },
  {
   "id": "chamado_canais",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Canais de abertura de chamado e horário de cobertura",
   "tipo": "texto",
   "porQue": "Não inventar plantão.",
   "onde": "pop:POP013",
   "ondeTexto": "etapa 3, cartão do POP013"
  },
  {
   "id": "tempos_resposta",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Tempos de resposta contratados (por classe de criticidade, se houver)",
   "tipo": "texto",
   "porQue": "Prazos reais.",
   "onde": "popsComum",
   "ondeTexto": "etapa 3, caixa 3.3"
  },
  {
   "id": "forn_tipos",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Tipos de fornecedores e prestadores atuais (sem nomes)",
   "tipo": "texto",
   "porQue": "Escopo.",
   "onde": "pop:POP014",
   "ondeTexto": "etapa 3, cartão do POP014"
  },
  {
   "id": "ronda_freq",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Frequência da ronda desejada em cada setor",
   "tipo": "textoLongo",
   "porQue": "Original fixa diária sem base.",
   "onde": "pop:POP015",
   "ondeTexto": "etapa 3, cartão do POP015",
   "referencia": "Referência da ficha técnica, a definir pelo estabelecimento (o sistema nunca preenche): A definir pelo hospital por setor (o original fixa diária para todos, o que pode ser inviável)."
  },
  {
   "id": "ronda_presenca",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Presença da engenharia clínica no local (dias e horários)",
   "tipo": "texto",
   "porQue": "Viabilidade.",
   "onde": "pop:POP015",
   "ondeTexto": "etapa 3, cartão do POP015"
  },
  {
   "id": "baixa_aprova",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem aprova a baixa patrimonial",
   "tipo": "texto",
   "porQue": "Fluxo.",
   "onde": "pop:POP016",
   "ondeTexto": "etapa 3, cartão do POP016"
  },
  {
   "id": "pgrss",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Existe PGRSS? Quem é o responsável?",
   "tipo": "texto",
   "porQue": "Integração obrigatória.",
   "onde": "pop:POP017",
   "ondeTexto": "etapa 3, cartão do POP017"
  },
  {
   "id": "destinacao_empresas",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Empresas de destinação de resíduos contratadas (tipo, sem nome)",
   "tipo": "texto",
   "porQue": "Não inventar.",
   "onde": "pop:POP017",
   "ondeTexto": "etapa 3, cartão do POP017"
  },
  {
   "id": "nsp_notifica",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem notifica no sistema da Anvisa",
   "tipo": "texto",
   "porQue": "Fluxo real.",
   "onde": "pop:POP018",
   "ondeTexto": "etapa 3, cartão do POP018"
  },
  {
   "id": "alertas_recebe",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Como o estabelecimento recebe os alertas da Anvisa",
   "tipo": "texto",
   "porQue": "Fluxo.",
   "onde": "pop:POP018",
   "ondeTexto": "etapa 3, cartão do POP018"
  },
  {
   "id": "criticidade_uso",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Uso clínico dos setores (há equipamentos de suporte à vida?)",
   "tipo": "texto",
   "porQue": "A IA supôs UTI em clínica.",
   "onde": "pop:POP020",
   "ondeTexto": "etapa 3, cartão do POP020"
  },
  {
   "id": "educacao_setor",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Existe setor de educação continuada?",
   "tipo": "texto",
   "porQue": "Responsabilidades.",
   "onde": "pop:POP021",
   "ondeTexto": "etapa 3, cartão do POP021"
  },
  {
   "id": "interv_executa",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem executa as intervenções (equipe própria, contratada, fabricante) por tipo de equipamento",
   "tipo": "textoLongo",
   "porQue": "Fluxo.",
   "onde": "pop:POP022",
   "ondeTexto": "etapa 3, cartão do POP022"
  },
  {
   "id": "instrumentos_ensaio",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Instrumentos de ensaio e calibração disponíveis",
   "tipo": "texto",
   "porQue": "Viabilidade.",
   "onde": "pop:POP022",
   "ondeTexto": "etapa 3, cartão do POP022"
  },
  {
   "id": "gerador_qtd",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quantos grupos geradores",
   "tipo": "texto",
   "porQue": "Condição de geração.",
   "onde": "pop:POP023",
   "ondeTexto": "etapa 3, cartão do POP023"
  },
  {
   "id": "gerador_opera",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem opera e quem mantém o gerador",
   "tipo": "texto",
   "porQue": "Responsabilidades.",
   "onde": "pop:POP023",
   "ondeTexto": "etapa 3, cartão do POP023"
  },
  {
   "id": "gerador_testes",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Frequência e duração dos testes do gerador adotadas",
   "tipo": "texto",
   "porQue": "Não inventar.",
   "onde": "pop:POP023",
   "ondeTexto": "etapa 3, cartão do POP023",
   "referencia": "Referência da ficha técnica, a definir pelo estabelecimento (o sistema nunca preenche): Conforme fabricante e projeto; o original usa verificação semanal com 1 h de operação com carga: manter como referência a confirmar pelo hospital."
  },
  {
   "id": "gases_quais",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quais gases em cilindro",
   "tipo": "texto",
   "porQue": "Condição de geração.",
   "onde": "pop:POP024",
   "ondeTexto": "etapa 3, cartão do POP024"
  },
  {
   "id": "cilindros_quem",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quem solicita, transporta e instala os cilindros",
   "tipo": "texto",
   "porQue": "Fluxo real.",
   "onde": "pop:POP024",
   "ondeTexto": "etapa 3, cartão do POP024"
  },
  {
   "id": "aval_periodo",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Período de referência da avaliação anual (ano civil ou do contrato)",
   "tipo": "texto",
   "porQue": "Data da avaliação.",
   "onde": "pop:POP025",
   "ondeTexto": "etapa 3, cartão do POP025",
   "referencia": "Referência da ficha técnica, a definir pelo estabelecimento (o sistema nunca preenche): Anual."
  },
  {
   "id": "areas_quais",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Quais áreas de recebimento, guarda ou oficina existem e quem as administra",
   "tipo": "texto",
   "porQue": "Não inventar áreas.",
   "onde": "pop:POP026",
   "ondeTexto": "etapa 3, cartão do POP026"
  },
  {
   "id": "laudos",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Existem laudos recentes das instalações elétricas e de gases?",
   "tipo": "texto",
   "porQue": "Não afirmar conformidade sem laudo.",
   "onde": "pop:POP027",
   "ondeTexto": "etapa 3, cartão do POP027"
  },
  {
   "id": "risco_metodo",
   "grupo": "DOC",
   "sub": "",
   "rotulo": "Método institucional de gerenciamento de risco",
   "tipo": "texto",
   "porQue": "Integração, não duplicar.",
   "onde": "pop:POP028",
   "ondeTexto": "etapa 3, cartão do POP028"
  }
 ],
 "comuns": [
  {
   "id": "ec_modelo",
   "obrigatorio": true
  },
  {
   "id": "ec_empresa",
   "obrigatorio": true
  },
  {
   "id": "resp_nome",
   "obrigatorio": true
  },
  {
   "id": "resp_cargo",
   "obrigatorio": true
  },
  {
   "id": "resp_formacao",
   "obrigatorio": true
  },
  {
   "id": "resp_registro",
   "obrigatorio": false
  },
  {
   "id": "setores",
   "obrigatorio": true
  },
  {
   "id": "natureza",
   "obrigatorio": true
  },
  {
   "id": "registro_forma",
   "obrigatorio": true
  },
  {
   "id": "est_nsp",
   "obrigatorio": true
  },
  {
   "id": "est_risco",
   "obrigatorio": true
  },
  {
   "id": "est_sesmt",
   "obrigatorio": true
  },
  {
   "id": "est_ccih",
   "obrigatorio": true
  },
  {
   "id": "est_padronizacao",
   "obrigatorio": true
  },
  {
   "id": "parque",
   "obrigatorio": false
  },
  {
   "id": "impl_planejamento",
   "obrigatorio": true
  },
  {
   "id": "impl_aquisicao",
   "obrigatorio": true
  },
  {
   "id": "impl_recebimento",
   "obrigatorio": true
  },
  {
   "id": "impl_inventario",
   "obrigatorio": true
  },
  {
   "id": "impl_instalacao",
   "obrigatorio": true
  },
  {
   "id": "impl_historico",
   "obrigatorio": true
  },
  {
   "id": "impl_treinamento",
   "obrigatorio": true
  },
  {
   "id": "impl_armazenamento",
   "obrigatorio": true
  },
  {
   "id": "impl_transferencia",
   "obrigatorio": true
  },
  {
   "id": "impl_uso",
   "obrigatorio": true
  },
  {
   "id": "impl_intervencao",
   "obrigatorio": true
  },
  {
   "id": "impl_desativacao",
   "obrigatorio": true
  },
  {
   "id": "impl_descarte",
   "obrigatorio": true
  }
 ],
 "docs": {
  "PGTS": {
   "codigo": "PGTS",
   "nome": "Plano de Gerenciamento de Tecnologias em Saúde — Equipamentos de Saúde",
   "nomeAnterior": "Plano de Gerenciamento de Tecnologias em Saúde (PGTS)",
   "explicacao": "O plano que descreve como o hospital gerencia seus equipamentos de saúde, da compra ao descarte, como exige a Anvisa.",
   "objetivo": "Descrever os critérios, responsabilidades, recursos e registros adotados pelo estabelecimento para gerenciar os equipamentos de saúde em todas as etapas do ciclo de vida, garantindo rastreabilidade, qualidade, eficácia, efetividade, segurança e desempenho, conforme a RDC 509/2021.",
   "escopo": "Equipamentos de saúde do estabelecimento (médico-assistenciais, de apoio e de infraestrutura), próprios ou cedidos com uso exclusivo; exclui equipamentos gerais (RDC 509, art. 2º, §1º). Não abrange medicamentos, saneantes, produtos de higiene e cosméticos nem produtos para saúde não equipamentos, que exigem plano próprio ou complemento (art. 5º).",
   "secoes": [
    "1. Identificação do estabelecimento e escopo do plano",
    "2. Finalidade e objetivos",
    "3. Justificativa e base legal",
    "4. Termos e definições",
    "5. Organização, responsabilidades e terceirização",
    "6. Infraestrutura para as atividades de gerenciamento",
    "7. Pessoas: capacitação, educação continuada e proteção",
    "8. Documentação, registros, rastreabilidade e guarda",
    "9. Etapas do gerenciamento (ciclo de vida)",
    "9.1 Planejamento e seleção",
    "9.2 Aquisição",
    "9.3 Recebimento e ensaio de aceitação",
    "9.4 Inventário e identificação",
    "9.5 Instalação",
    "9.6 Registro histórico",
    "9.7 Treinamento",
    "9.8 Armazenamento",
    "9.9 Transferência",
    "9.10 Uso e rondas",
    "9.11 Intervenção técnica (corretiva, preventiva, calibração, ensaios de segurança, priorização por risco)",
    "9.12 Desativação",
    "9.13 Descarte",
    "10. Gerenciamento de risco, eventos adversos, queixas técnicas e alertas sanitários",
    "11. Indicadores, monitoramento e avaliação anual da efetividade",
    "12. Utilidades críticas (energia de emergência, gases medicinais) — só se existirem no estabelecimento",
    "13. Implantação: situação atual, prioridades e cronograma"
   ],
   "secoesSistema": [
    "14. Documentos relacionados (tabela montada pelo sistema)",
    "15. Referências normativas (lista montada pelo sistema a partir da ficha)"
   ],
   "conteudoMinimo": [
    {
     "item": "Escopo limitado a equipamentos de saúde",
     "descricao": "Dizer que o plano cobre equipamentos de saúde (médico-assistenciais, apoio e infraestrutura), que equipamentos gerais estão excluídos e onde estão os planos das demais tecnologias (ou que são responsabilidade de outra área).",
     "verificacao": [
      "equipamentos gerais",
      "médico-assistenciais",
      "infraestrutura",
      "medicamentos"
     ],
     "blocos": [
      1
     ]
    },
    {
     "item": "Responsável designado",
     "descricao": "Nome, cargo, formação e registro do responsável pelo plano (art. 7º) e, se houver, coordenadores por etapa.",
     "verificacao": [
      "responsável",
      "nível superior",
      "registro"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Terceirização formal",
     "descricao": "Quais etapas são terceirizadas, existência de contrato formal e a responsabilidade que permanece com o estabelecimento.",
     "verificacao": [
      "contrato",
      "terceiriz",
      "responsabilidade"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Organograma",
     "descricao": "Posição da engenharia clínica na estrutura e a quem reporta (art. 10).",
     "verificacao": [
      "organograma",
      "estrutura organizacional"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Critério por etapa",
     "descricao": "Para cada etapa do ciclo de vida: critério adotado, responsável, registro gerado e POP de referência.",
     "verificacao": [
      "planejamento",
      "aquisição",
      "recebimento",
      "desativação",
      "descarte"
     ],
     "blocos": [
      3,
      4
     ]
    },
    {
     "item": "Ensaio de aceitação antes do primeiro uso",
     "descricao": "Nenhum equipamento entra em uso sem inspeção e ensaio de aceitação registrados.",
     "verificacao": [
      "ensaio de aceitação",
      "primeiro uso"
     ],
     "blocos": [
      3
     ]
    },
    {
     "item": "Inventário e código único",
     "descricao": "Critério de inclusão no inventário, dados mínimos, código de identificação individual e auditoria periódica.",
     "verificacao": [
      "inventário",
      "código",
      "auditoria"
     ],
     "blocos": [
      3
     ]
    },
    {
     "item": "Registro histórico",
     "descricao": "Conteúdo do registro histórico e vínculo com cada intervenção, transferência, falha e evento.",
     "verificacao": [
      "registro histórico",
      "intervenções",
      "transferências"
     ],
     "blocos": [
      3
     ]
    },
    {
     "item": "Intervenção técnica e priorização por risco",
     "descricao": "Manutenção corretiva, preventiva, calibração, ensaios de segurança elétrica após reparo e critério de priorização por risco/criticidade.",
     "verificacao": [
      "preventiva",
      "corretiva",
      "calibração",
      "segurança elétrica",
      "criticidade"
     ],
     "blocos": [
      4
     ]
    },
    {
     "item": "Notificação e alertas",
     "descricao": "Notificação de eventos adversos e queixas técnicas ao SNVS (art. 19), interface com o Núcleo de Segurança do Paciente e tratamento de alertas e ações de campo.",
     "verificacao": [
      "evento adverso",
      "queixa técnica",
      "notifica",
      "alerta"
     ],
     "blocos": [
      5
     ]
    },
    {
     "item": "Guarda de documentos",
     "descricao": "Prazo de guarda: o maior entre a política arquivística aplicável e 5 anos (art. 16); para registro histórico, durante a vida útil mais o prazo mínimo após a baixa.",
     "verificacao": [
      "5 anos",
      "cinco anos",
      "guarda",
      "arquiv"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Educação continuada e EPI",
     "descricao": "Programa de educação continuada com registro (art. 11) e fornecimento/uso de EPI e EPC (art. 13).",
     "verificacao": [
      "educação continuada",
      "EPI",
      "EPC"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Áreas sem alimentos",
     "descricao": "Proibição de alimentos, bebidas e objetos alheios nas áreas de recebimento, guarda e distribuição (art. 14).",
     "verificacao": [
      "alimentos",
      "bebidas"
     ],
     "blocos": [
      2
     ]
    },
    {
     "item": "Indicadores e avaliação anual",
     "descricao": "Indicadores com fórmula, avaliação anual da efetividade, plano de ação e divulgação dos resultados (arts. 7º §2º e 9º).",
     "verificacao": [
      "indicador",
      "avaliação anual",
      "efetividade",
      "divulga"
     ],
     "blocos": [
      5
     ]
    },
    {
     "item": "Situação de implantação",
     "descricao": "O que já existe e o que está em implantação, com prioridades; sem afirmar como implantado o que não foi informado.",
     "verificacao": [
      "implantação",
      "cronograma"
     ],
     "blocos": [
      6
     ]
    }
   ],
   "passos": [
    "Coletar os dados do estabelecimento (dadosDoHospital) antes de gerar.",
    "Gerar seção a seção com a ficha; cada etapa do ciclo de vida cita o POP correspondente pelo código e título do catálogo.",
    "Montar pelo sistema as seções 14 (documentos relacionados) e 15 (referências), a partir do registro e de NORMAS_VERIFICADAS.",
    "Conferir automaticamente a presença dos itens de conteudoMinimo e a ausência de normas fora da lista da ficha.",
    "Aprovar pelo responsável designado do hospital e pela Metrolabs; revisar anualmente ou quando mudar o parque, a estrutura ou a norma."
   ],
   "responsabilidades": [
    {
     "papel": "Direção do estabelecimento",
     "atribuicoes": "Designar formalmente o responsável pelo plano, prover recursos, aprovar o plano e o organograma, garantir contratos formais com terceiros."
    },
    {
     "papel": "Responsável pelo plano (art. 7º)",
     "atribuicoes": "Elaborar, implantar, monitorar a execução, promover a avaliação anual e divulgar os resultados."
    },
    {
     "papel": "Engenharia Clínica (própria ou contratada)",
     "atribuicoes": "Executar ou coordenar as etapas técnicas, manter inventário, registro histórico e indicadores."
    },
    {
     "papel": "Gestores das unidades",
     "atribuicoes": "Zelar pelo uso correto, comunicar falhas e eventos, liberar o equipamento para intervenções, indicar o responsável pelo equipamento no setor."
    },
    {
     "papel": "Núcleo de Segurança do Paciente / gerência de risco",
     "atribuicoes": "Receber, investigar e notificar eventos adversos; integrar os dados de tecnovigilância."
    },
    {
     "papel": "Suprimentos, patrimônio e SESMT",
     "atribuicoes": "Aquisição conforme critérios técnicos, baixa patrimonial, EPI e segurança do trabalho."
    }
   ],
   "registros": [
    "Ato de designação do responsável",
    "Organograma",
    "Lista mestra de documentos",
    "Inventário",
    "Registros históricos",
    "Cronograma de manutenção preventiva e calibração",
    "Relatório anual de avaliação de efetividade",
    "Registros de treinamento",
    "Contratos com terceiros"
   ],
   "indicadores": [
    {
     "indicador": "Cumprimento do cronograma de manutenção preventiva",
     "formula": "MP realizadas no período ÷ MP programadas no período × 100",
     "metaSugerida": "Referência usual de mercado ≥ 90%; meta a definir pelo hospital"
    },
    {
     "indicador": "Disponibilidade dos equipamentos críticos",
     "formula": "(horas do período − horas paradas) ÷ horas do período × 100, por equipamento crítico",
     "metaSugerida": "A definir pelo hospital por classe de criticidade"
    },
    {
     "indicador": "Acurácia do inventário",
     "formula": "itens conferidos sem divergência ÷ itens conferidos na auditoria × 100",
     "metaSugerida": "A definir; referência ≥ 95%"
    },
    {
     "indicador": "Tempo médio de atendimento da corretiva",
     "formula": "soma (fim − abertura) das OS corretivas ÷ número de OS corretivas",
     "metaSugerida": "A definir por criticidade, conforme contrato"
    },
    {
     "indicador": "Calibrações em dia",
     "formula": "equipamentos com calibração válida ÷ equipamentos que exigem calibração × 100",
     "metaSugerida": "A definir; referência 100% para críticos"
    }
   ],
   "periodicidade": "Revisão anual, junto com a avaliação de efetividade, e sempre que houver mudança de estrutura, de parque tecnológico relevante, de contrato de terceirização ou de norma.",
   "erros": [
    "Copiar para o documento os rótulos do pedido ('PROCEDIMENTOS... SELECIONADOS', 'DOCUMENTOS JÁ EXISTENTES') e listar PDFs de revisões substituídas (achados C1/C2).",
    "Mencionar 'especialista sênior' e 'roteiro fornecido' (M2).",
    "Afirmar como fato que o hospital 'estabeleceu e implementou' cada etapa, sem que isso tenha sido informado.",
    "Não delimitar o escopo às tecnologias de equipamentos, dando a entender que o plano cobre medicamentos e saneantes.",
    "Glossário com definições inventadas ou inconsistentes entre si e com os POPs (ex.: evento adverso incluindo 'dano ao ambiente').",
    "Prosa longa e repetitiva por causa da regra 'PGT longo', em vez de critério, responsável e registro por etapa.",
    "Citar normas de fabricante (ISO 13485, RDC 665/2022) como obrigações do hospital, ou citar normas canceladas (NBR 10004:2004, ISO 9001:2015).",
    "Inventar dimensionamento de equipe e metragem de áreas como exigência normativa."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-63-2011",
    "RDC-36-2013",
    "RDC-222-2018",
    "RDC-50-2002",
    "LEI-6437-1977",
    "LEI-8159-1991",
    "NR-32",
    "RDC-551-2021"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "pgt_demais_planos",
     "obrigatorio": true
    },
    {
     "id": "pgt_alvaras",
     "obrigatorio": false
    },
    {
     "id": "rec_gerador",
     "obrigatorio": true
    },
    {
     "id": "rec_central_gases",
     "obrigatorio": true
    },
    {
     "id": "rec_cme",
     "obrigatorio": true
    },
    {
     "id": "rec_radiologia",
     "obrigatorio": true
    },
    {
     "id": "rec_fonte_radioativa",
     "obrigatorio": true
    },
    {
     "id": "pgt_areas",
     "obrigatorio": false
    },
    {
     "id": "metas",
     "obrigatorio": false
    }
   ],
   "condicao": null,
   "mapaRDC509": [
    {
     "artigo": "Art. 1º (objetivo: critérios mínimos, rastreabilidade, qualidade, eficácia, efetividade, segurança, desempenho, da entrada ao destino final, recursos e capacitação)",
     "secao": "2. Finalidade e objetivos; 9. Etapas"
    },
    {
     "artigo": "Art. 2º, caput e incisos (tecnologias abrangidas)",
     "secao": "1. Escopo (declarar que este plano cobre equipamentos de saúde e indicar onde estão as demais tecnologias)"
    },
    {
     "artigo": "Art. 2º, §1º (exclui equipamentos gerais)",
     "secao": "1. Escopo"
    },
    {
     "artigo": "Art. 2º, §2º e §3º (estabelecimentos alcançados; exclusão de farmácias e drogarias)",
     "secao": "1. Escopo (só quando pertinente)"
    },
    {
     "artigo": "Art. 3º (definições)",
     "secao": "4. Termos e definições"
    },
    {
     "artigo": "Art. 4º, caput (definir e padronizar critérios para cada etapa)",
     "secao": "9. Etapas (cada subseção traz o critério e o POP correspondente)"
    },
    {
     "artigo": "Art. 4º, parágrafo único (normas e rotinas padronizadas, atualizadas, registradas e acessíveis)",
     "secao": "8. Documentação; 14. Documentos relacionados; POP001"
    },
    {
     "artigo": "Art. 5º, caput e §1º (elaborar e implantar plano compatível com as tecnologias usadas)",
     "secao": "1. Escopo; 13. Implantação"
    },
    {
     "artigo": "Art. 5º, §2º (plano único para estabelecimento com vários serviços)",
     "secao": "1. Escopo (só se houver mais de um alvará)"
    },
    {
     "artigo": "Art. 5º, §3º (plano único ou por tecnologia; disponível à autoridade sanitária)",
     "secao": "1. Escopo; 8. Documentação"
    },
    {
     "artigo": "Art. 6º (terceirização mediante contrato formal; não isenta o contratante)",
     "secao": "5. Organização, responsabilidades e terceirização"
    },
    {
     "artigo": "Art. 7º, caput (designar profissional de nível superior com registro ativo)",
     "secao": "5. Organização; POP002"
    },
    {
     "artigo": "Art. 7º, §1º (coordenadores distintos por etapa)",
     "secao": "5. Organização"
    },
    {
     "artigo": "Art. 7º, §2º (monitorar a execução e promover avaliação anual de efetividade)",
     "secao": "11. Indicadores e avaliação anual; POP025"
    },
    {
     "artigo": "Art. 8º (registrar de forma sistemática a execução de cada etapa)",
     "secao": "8. Documentação e registros; 9. Etapas (registro de cada etapa)"
    },
    {
     "artigo": "Art. 9º (resultados da avaliação anual disponíveis aos profissionais)",
     "secao": "11. Avaliação anual (forma de divulgação); POP025"
    },
    {
     "artigo": "Art. 10 (estrutura organizacional documentada; atividades no organograma)",
     "secao": "5. Organização (organograma ou indicação de onde está)"
    },
    {
     "artigo": "Art. 11 (programa de educação continuada com registro de realização e participação)",
     "secao": "7. Pessoas; 9.7 Treinamento; POP021"
    },
    {
     "artigo": "Art. 12 (atribuições formalmente designadas, descritas, divulgadas e compreendidas)",
     "secao": "5. Organização; POP002"
    },
    {
     "artigo": "Art. 13 (fornecer e assegurar uso de EPI e EPC)",
     "secao": "7. Pessoas; POP019"
    },
    {
     "artigo": "Art. 14 (sem alimentos, bebidas e objetos alheios nas áreas de recebimento, armazenagem, preparo e distribuição)",
     "secao": "6. Infraestrutura; POP026"
    },
    {
     "artigo": "Art. 15 (mecanismos de rastreabilidade)",
     "secao": "8. Rastreabilidade; 9.4 Inventário; 9.6 Registro histórico"
    },
    {
     "artigo": "Art. 16 (guarda da documentação: Lei 8.159/1991 ou, na falta, mínimo de 5 anos)",
     "secao": "8. Guarda"
    },
    {
     "artigo": "Art. 17 (infraestrutura física compatível, conforme RDC 509 e RDC 50/2002)",
     "secao": "6. Infraestrutura; 12. Utilidades críticas; POP027"
    },
    {
     "artigo": "Art. 18 (sistemática de monitorização e gerenciamento de risco)",
     "secao": "10. Gerenciamento de risco; 9.11 priorização; POP020; POP028"
    },
    {
     "artigo": "Art. 19 (notificar ao SNVS eventos adversos e queixas técnicas)",
     "secao": "10. Eventos adversos e queixas técnicas; POP018"
    },
    {
     "artigo": "Art. 20 (descumprimento é infração sanitária, Lei 6.437/1977)",
     "secao": "3. Justificativa e base legal"
    },
    {
     "artigo": "Arts. 21 e 22 (revogações e vigência)",
     "secao": "Não geram conteúdo; não citar a RDC 2/2010 como vigente"
    }
   ]
  },
  "POP001": {
   "codigo": "POP001",
   "nome": "Controle de Documentos e Registros",
   "nomeAnterior": "Controle de Documentos",
   "explicacao": "Como os documentos e registros do plano são criados, aprovados, divulgados, revisados, guardados e retirados de uso.",
   "objetivo": "Garantir que os procedimentos do gerenciamento de equipamentos estejam padronizados, aprovados, atualizados, acessíveis e que os registros gerados sejam identificados, protegidos e guardados pelo prazo exigido.",
   "escopo": "Plano, POPs, formulários, registros e documentos externos (manuais, normas) do gerenciamento de equipamentos de saúde do estabelecimento.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Tipos de documento",
     "descricao": "Distinguir plano, POP, formulário, registro e documento externo.",
     "verificacao": [
      "formulário",
      "registro",
      "documento externo"
     ]
    },
    {
     "item": "Identificação e lista mestra",
     "descricao": "Código, título, revisão e data de cada documento; lista mestra com a revisão vigente.",
     "verificacao": [
      "lista mestra",
      "revisão vigente",
      "código"
     ]
    },
    {
     "item": "Elaboração, revisão e aprovação",
     "descricao": "Quem elabora, quem revisa, quem aprova (inclusive o responsável do hospital) e registro do motivo de cada revisão.",
     "verificacao": [
      "aprovação",
      "motivo da revisão",
      "elabora"
     ]
    },
    {
     "item": "Distribuição e acesso",
     "descricao": "Como a versão vigente fica acessível aos envolvidos e como se evita uso de cópia não controlada.",
     "verificacao": [
      "acess",
      "cópia controlada",
      "vigente"
     ]
    },
    {
     "item": "Documento obsoleto",
     "descricao": "Retirada de uso, identificação como obsoleto e guarda da versão anterior.",
     "verificacao": [
      "obsoleto",
      "substituíd"
     ]
    },
    {
     "item": "Registros e guarda",
     "descricao": "Identificação, proteção, cópia de segurança e prazo de guarda: o maior entre a política arquivística aplicável e 5 anos (art. 16 da RDC 509).",
     "verificacao": [
      "guarda",
      "5 anos",
      "cinco anos",
      "cópia de segurança"
     ]
    },
    {
     "item": "Dados pessoais",
     "descricao": "Registros com dados de pacientes ou colaboradores com acesso restrito (LGPD), se a norma for aprovada pelo dono.",
     "verificacao": [
      "acesso restrito",
      "dados pessoais"
     ]
    }
   ],
   "passos": [
    "Identificar a necessidade de documento novo ou revisão e registrar o motivo.",
    "Elaborar com o modelo padrão e o código da lista mestra.",
    "Revisar tecnicamente.",
    "Aprovar (Metrolabs e responsável do hospital) e datar.",
    "Publicar a versão vigente e comunicar os envolvidos.",
    "Recolher ou marcar a versão anterior como obsoleta e guardá-la.",
    "Revisar periodicamente e sempre que mudar processo, estrutura ou norma."
   ],
   "responsabilidades": [
    {
     "papel": "Responsável pelo plano",
     "atribuicoes": "Aprovar documentos e garantir acesso à versão vigente."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Elaborar, revisar, manter a lista mestra e os registros."
    },
    {
     "papel": "Gestores das unidades",
     "atribuicoes": "Garantir que a equipe use só a versão vigente."
    }
   ],
   "registros": [
    "Lista mestra de documentos",
    "Registro de revisões com motivo",
    "Registro de distribuição/ciência"
   ],
   "indicadores": [
    {
     "indicador": "Documentos com revisão no prazo",
     "formula": "documentos revisados dentro do prazo ÷ documentos com revisão prevista × 100",
     "metaSugerida": "A definir; referência 100%"
    }
   ],
   "periodicidade": "Revisão de cada documento no máximo anual (prática do original) e sempre que houver mudança; guarda de registros pelo prazo do art. 16 da RDC 509.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Escrever 'Histórico de revisões' e 'Versão 1.0' dentro do corpo (A2).",
    "Ensinar a usar recurso de editor de texto (o original manda usar 'Inserir > Rodapé' do Word: é marca e detalhe irrelevante)."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-63-2011",
    "LEI-8159-1991",
    "LEI-13709-2018"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "doc_local",
     "obrigatorio": true
    },
    {
     "id": "doc_politica_arquivo",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP002": {
   "codigo": "POP002",
   "nome": "Responsável pelo Plano de Gerenciamento de Tecnologias em Saúde e Atribuições",
   "nomeAnterior": "Responsável Técnico pela Engenharia Clínica",
   "explicacao": "Quem é designado pelo hospital para elaborar, implantar e acompanhar o plano, o que faz e quem o substitui.",
   "objetivo": "Formalizar a designação do responsável pelo plano de equipamentos de saúde, suas atribuições, as dos coordenadores por etapa e a substituição nas ausências.",
   "escopo": "Responsável designado pelo estabelecimento e coordenadores das etapas, próprios ou da empresa contratada.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Designação formal",
     "descricao": "Ato da direção designando o responsável, com formação de nível superior e registro ativo no conselho, quando couber.",
     "verificacao": [
      "designa",
      "nível superior",
      "registro"
     ]
    },
    {
     "item": "Atribuições",
     "descricao": "Elaborar, implantar, monitorar a execução, promover a avaliação anual e divulgar resultados (art. 7º §2º e art. 9º).",
     "verificacao": [
      "avaliação anual",
      "monitorar",
      "implantar"
     ]
    },
    {
     "item": "Coordenadores por etapa",
     "descricao": "Quando houver, quem coordena cada etapa (art. 7º §1º).",
     "verificacao": [
      "coordena",
      "etapa"
     ]
    },
    {
     "item": "Atribuições divulgadas",
     "descricao": "Atribuições de todos os envolvidos descritas, divulgadas e compreendidas (art. 12).",
     "verificacao": [
      "divulgad",
      "compreendid"
     ]
    },
    {
     "item": "Terceirização",
     "descricao": "Se a engenharia clínica é contratada: contrato formal, responsável técnico da contratada com ART, e responsabilidade que permanece com o hospital (art. 6º).",
     "verificacao": [
      "contrato",
      "ART",
      "não isenta"
     ]
    },
    {
     "item": "Substituição",
     "descricao": "Quem responde nas ausências e como é comunicado.",
     "verificacao": [
      "substitu",
      "ausência"
     ]
    }
   ],
   "passos": [
    "Direção designa formalmente o responsável.",
    "Registrar formação, registro profissional e ART da contratada, se houver.",
    "Descrever e divulgar as atribuições.",
    "Definir substituto.",
    "Revisar a designação quando houver troca de pessoa ou de contrato."
   ],
   "responsabilidades": [
    {
     "papel": "Direção",
     "atribuicoes": "Designar, prover recursos e aprovar."
    },
    {
     "papel": "Responsável pelo plano",
     "atribuicoes": "Elaborar, implantar, monitorar, avaliar anualmente."
    },
    {
     "papel": "Empresa contratada (se houver)",
     "atribuicoes": "Manter responsável técnico com ART e cumprir o contrato."
    }
   ],
   "registros": [
    "Ato de designação",
    "Comprovante de registro profissional",
    "ART (quando contratada)",
    "Registro de ciência das atribuições"
   ],
   "indicadores": [
    {
     "indicador": "Avaliação anual realizada no prazo",
     "formula": "1 se o relatório anual foi emitido até a data prevista; 0 se não",
     "metaSugerida": "Realizar anualmente"
    }
   ],
   "periodicidade": "Revisão anual ou a cada troca de responsável ou contrato.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Tratar 'responsável técnico' como cargo obrigatório do conselho do hospital.",
    "Inventar nome, CREA ou formação do responsável."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-63-2011",
    "LEI-6496-1977",
    "RES-CONFEA-1137-2023"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "resp_substituto",
     "obrigatorio": true
    },
    {
     "id": "ec_contrato",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP003": {
   "codigo": "POP003",
   "nome": "Inventário de Equipamentos de Saúde",
   "nomeAnterior": "Inventário de Equipamento",
   "explicacao": "Como levantar, manter atualizada e auditar a relação dos equipamentos de saúde do hospital.",
   "objetivo": "Manter inventário completo e exato dos equipamentos de saúde sob gerenciamento, como base da rastreabilidade (art. 15 da RDC 509).",
   "escopo": "Equipamentos de saúde próprios e cedidos com uso exclusivo (comodato, locação, convênio); equipamentos de terceiros em uso eventual seguem política própria registrada.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Critério de inclusão",
     "descricao": "Quais equipamentos entram (próprios e cedidos com uso exclusivo) e regra para equipamentos de terceiros/consignados/de médicos.",
     "verificacao": [
      "próprios",
      "cedidos",
      "comodato"
     ]
    },
    {
     "item": "Dados mínimos",
     "descricao": "Nome técnico, fabricante, modelo, número de série, código de identificação, setor, situação, regularização na Anvisa, data de aceitação, criticidade, acessórios e documentos.",
     "verificacao": [
      "número de série",
      "fabricante",
      "modelo",
      "setor",
      "Anvisa"
     ]
    },
    {
     "item": "Atualização",
     "descricao": "Atualizar a cada entrada, transferência, desativação e baixa.",
     "verificacao": [
      "atualiz",
      "entrada",
      "baixa"
     ]
    },
    {
     "item": "Auditoria",
     "descricao": "Conferência física periódica (total ou por amostragem) com tratamento das divergências: não encontrado, sem etiqueta, sem cadastro.",
     "verificacao": [
      "auditoria",
      "divergênc",
      "não encontrado"
     ]
    },
    {
     "item": "Rastreabilidade",
     "descricao": "Possibilidade de emitir a lista a qualquer momento e localizar cada item.",
     "verificacao": [
      "rastreabilidade",
      "localiza"
     ]
    }
   ],
   "passos": [
    "Levantar campo a campo por setor.",
    "Identificar cada equipamento com o código (POP004/POP005).",
    "Cadastrar os dados mínimos.",
    "Validar com o gestor do setor.",
    "Atualizar a cada movimentação.",
    "Auditar periodicamente e corrigir divergências.",
    "Registrar resultado da auditoria."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Levantar, cadastrar, atualizar e auditar."
    },
    {
     "papel": "Gestor da unidade",
     "atribuicoes": "Informar entradas, saídas e equipamentos de terceiros."
    },
    {
     "papel": "Patrimônio",
     "atribuicoes": "Conciliar com o cadastro patrimonial."
    }
   ],
   "registros": [
    "Inventário",
    "Ficha de cadastro do equipamento",
    "Relatório de auditoria do inventário"
   ],
   "indicadores": [
    {
     "indicador": "Acurácia do inventário",
     "formula": "itens conferidos sem divergência ÷ itens conferidos × 100",
     "metaSugerida": "A definir; referência ≥ 95%"
    },
    {
     "indicador": "Equipamentos sem identificação",
     "formula": "itens sem etiqueta ÷ itens conferidos × 100",
     "metaSugerida": "A definir; referência 0%"
    }
   ],
   "periodicidade": "Atualização contínua; auditoria no mínimo anual (o original prevê anual no POP e semestral no PGT: o hospital deve escolher).",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Incluir 'valor contábil' e 'marca' como obrigatórios sem pedir ao hospital.",
    "Supor quantidade de equipamentos."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "inv_meio",
     "obrigatorio": true
    },
    {
     "id": "inv_auditoria_freq",
     "obrigatorio": true
    },
    {
     "id": "inv_terceiros",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP004": {
   "codigo": "POP004",
   "nome": "Código de Identificação Individual de Equipamentos de Saúde",
   "nomeAnterior": "Código Individual de Identificação de Equipamentos de Saúde",
   "explicacao": "A regra do código único que identifica cada equipamento durante toda a permanência no hospital.",
   "objetivo": "Definir a regra de formação do código de identificação individual e garantir que seja único, permanente e ligado ao inventário e ao registro histórico.",
   "escopo": "Todos os equipamentos inventariados.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Regra de formação",
     "descricao": "Estrutura do código (ex.: prefixo do estabelecimento + sequencial), número de caracteres e o que cada parte significa.",
     "verificacao": [
      "prefixo",
      "sequencial",
      "caracteres"
     ]
    },
    {
     "item": "Unicidade e permanência",
     "descricao": "Código nunca reutilizado e que não muda na transferência; a localização fica no inventário, não no código.",
     "verificacao": [
      "único",
      "não é reutilizado",
      "transferência"
     ]
    },
    {
     "item": "Acessórios e partes",
     "descricao": "Regra para acessórios relevantes (código próprio ou vinculado).",
     "verificacao": [
      "acessório"
     ]
    },
    {
     "item": "Vínculo",
     "descricao": "O código é a chave do inventário, do registro histórico e das ordens de serviço.",
     "verificacao": [
      "inventário",
      "registro histórico",
      "ordem de serviço"
     ]
    }
   ],
   "passos": [
    "Definir com o hospital a regra de formação.",
    "Atribuir o código no recebimento ou no levantamento inicial.",
    "Registrar no inventário.",
    "Emitir etiqueta (POP005).",
    "Bloquear reutilização de códigos baixados."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Atribuir e controlar os códigos."
    },
    {
     "papel": "Patrimônio",
     "atribuicoes": "Conciliar com o número patrimonial, se distinto."
    }
   ],
   "registros": [
    "Tabela de regra de codificação",
    "Inventário"
   ],
   "indicadores": [
    {
     "indicador": "Códigos duplicados",
     "formula": "número de códigos repetidos no inventário",
     "metaSugerida": "0"
    }
   ],
   "periodicidade": "Na entrada de cada equipamento; revisão da regra só quando necessário.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Inventar sigla do hospital e lista de setores.",
    "Exemplo de código incoerente com o número de caracteres."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "cod_regra",
     "obrigatorio": true
    },
    {
     "id": "cod_setor",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP005": {
   "codigo": "POP005",
   "nome": "Etiquetagem e Identificação de Situação dos Equipamentos",
   "nomeAnterior": "Etiquetagem de Equipamentos",
   "explicacao": "Como e onde fixar as etiquetas de identificação e de situação nos equipamentos.",
   "objetivo": "Padronizar as etiquetas de identificação e de situação (manutenção, calibração, interdição) para que qualquer pessoa reconheça o equipamento e sua condição de uso.",
   "escopo": "Todos os equipamentos inventariados.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Etiqueta de identificação",
     "descricao": "Conteúdo (código, eventual código de barras ou QR), material resistente à limpeza e local de fixação visível sem cobrir avisos do fabricante.",
     "verificacao": [
      "código",
      "local de fixação",
      "limpeza"
     ]
    },
    {
     "item": "Etiquetas de situação",
     "descricao": "Modelos para 'em manutenção', 'interditado/não usar', 'aguardando avaliação' e data da próxima preventiva/calibração.",
     "verificacao": [
      "interditado",
      "próxima",
      "calibração"
     ]
    },
    {
     "item": "Reposição",
     "descricao": "Troca de etiqueta danificada e conferência nas rondas.",
     "verificacao": [
      "reposição",
      "danificad"
     ]
    },
    {
     "item": "Não cobrir informações",
     "descricao": "Não cobrir placa de identificação do fabricante, número de série e alertas de segurança.",
     "verificacao": [
      "placa",
      "número de série"
     ]
    }
   ],
   "passos": [
    "Emitir a etiqueta após o cadastro.",
    "Limpar a superfície e fixar no local padronizado.",
    "Fixar etiqueta de situação quando aplicável.",
    "Conferir nas rondas e auditorias.",
    "Substituir etiqueta danificada."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Emitir, fixar e conferir etiquetas."
    },
    {
     "papel": "Operadores",
     "atribuicoes": "Respeitar a etiqueta de interdição e comunicar etiqueta danificada."
    }
   ],
   "registros": [
    "Modelo de etiqueta",
    "Registro de fixação/reposição no inventário"
   ],
   "indicadores": [
    {
     "indicador": "Equipamentos com etiqueta conforme na auditoria",
     "formula": "conformes ÷ conferidos × 100",
     "metaSugerida": "A definir; referência ≥ 98%"
    }
   ],
   "periodicidade": "Na entrada, após cada intervenção (situação) e nas auditorias.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Inventar código de cores.",
    "Confundir com o POP004 e repetir a regra de codificação."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "etq_tipo",
     "obrigatorio": false
    },
    {
     "id": "etq_cores",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP006": {
   "codigo": "POP006",
   "nome": "Planejamento e Seleção de Equipamentos de Saúde",
   "nomeAnterior": "Planejamento e Seleção de Equipamento",
   "explicacao": "Como definir a necessidade e escolher o equipamento antes da compra.",
   "objetivo": "Estabelecer critérios para planejar a incorporação e selecionar equipamentos considerando demanda, infraestrutura, pessoas, regularização sanitária, custo do ciclo de vida e histórico.",
   "escopo": "Incorporação, substituição e ampliação de equipamentos de saúde, inclusive por doação, comodato ou locação.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Justificativa da necessidade",
     "descricao": "Demanda assistencial, substituição por obsolescência ou falha, nova atividade.",
     "verificacao": [
      "demanda",
      "necessidade",
      "substituição"
     ]
    },
    {
     "item": "Infraestrutura e pessoas",
     "descricao": "Verificação prévia de espaço, elétrica, gases, climatização, rede e da equipe para operar e manter (ligação com POP027 e POP021).",
     "verificacao": [
      "infraestrutura",
      "elétrica",
      "capacitação"
     ]
    },
    {
     "item": "Regularização sanitária",
     "descricao": "Exigir que o equipamento esteja notificado/registrado na Anvisa e o fornecedor autorizado.",
     "verificacao": [
      "registro",
      "Anvisa",
      "regulariza"
     ]
    },
    {
     "item": "Especificação técnica",
     "descricao": "Requisitos técnicos, acessórios, consumíveis, conformidade com normas de segurança aplicáveis, manuais em português e treinamento.",
     "verificacao": [
      "especificação",
      "manual",
      "português"
     ]
    },
    {
     "item": "Custo do ciclo de vida",
     "descricao": "Considerar manutenção, peças, consumíveis, calibração e vida útil, não só o preço.",
     "verificacao": [
      "ciclo de vida",
      "manutenção",
      "consumíveis"
     ]
    },
    {
     "item": "Avaliação multiprofissional",
     "descricao": "Participação do usuário, engenharia clínica e, quando houver, comissão de padronização.",
     "verificacao": [
      "multiprofissional",
      "usuário"
     ]
    }
   ],
   "passos": [
    "Receber a solicitação com justificativa.",
    "Avaliar demanda e alternativas.",
    "Verificar infraestrutura e equipe.",
    "Elaborar especificação técnica.",
    "Avaliar opções e regularização.",
    "Emitir parecer técnico.",
    "Encaminhar à aquisição (POP007)."
   ],
   "responsabilidades": [
    {
     "papel": "Unidade solicitante",
     "atribuicoes": "Justificar a necessidade."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Especificar, avaliar e emitir parecer."
    },
    {
     "papel": "Direção",
     "atribuicoes": "Aprovar a incorporação."
    }
   ],
   "registros": [
    "Solicitação de incorporação",
    "Especificação técnica",
    "Parecer técnico de seleção"
   ],
   "indicadores": [
    {
     "indicador": "Incorporações com parecer técnico",
     "formula": "incorporações com parecer ÷ incorporações × 100",
     "metaSugerida": "A definir; referência 100%"
    }
   ],
   "periodicidade": "Sempre que houver incorporação; revisão do planejamento anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar marcas como exemplo.",
    "Ignorar regularização sanitária ou infraestrutura."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-751-2022",
    "NBR-IEC-60601-1-2010"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "sel_aprova",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP007": {
   "codigo": "POP007",
   "nome": "Aquisição de Equipamentos de Saúde",
   "nomeAnterior": "Aquisição de Equipamentos de Saúde",
   "explicacao": "As etapas da compra: especificação, propostas, avaliação técnica, regularização e contrato.",
   "objetivo": "Garantir que a compra, locação, comodato ou doação de equipamentos siga a especificação aprovada e só envolva produtos regularizados e fornecedores qualificados.",
   "escopo": "Compra, locação, comodato, doação e importação direta de equipamentos de saúde.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Origem na seleção",
     "descricao": "A aquisição parte do parecer do POP006.",
     "verificacao": [
      "especificação",
      "parecer"
     ]
    },
    {
     "item": "Avaliação técnica das propostas",
     "descricao": "Conferência ponto a ponto com a especificação, regularização na Anvisa e documentos do fornecedor.",
     "verificacao": [
      "proposta",
      "regularização",
      "Anvisa"
     ]
    },
    {
     "item": "Condições contratuais técnicas",
     "descricao": "Garantia, treinamento, manuais, ensaio de aceitação com o fornecedor, assistência técnica, peças e prazos.",
     "verificacao": [
      "garantia",
      "treinamento",
      "assistência técnica"
     ]
    },
    {
     "item": "Fornecedor qualificado",
     "descricao": "Comprar de fornecedor qualificado (POP014).",
     "verificacao": [
      "qualificad"
     ]
    },
    {
     "item": "Doação e comodato",
     "descricao": "Mesmo rigor técnico para doação, comodato e locação.",
     "verificacao": [
      "doação",
      "comodato",
      "locação"
     ]
    }
   ],
   "passos": [
    "Receber a especificação aprovada.",
    "Solicitar propostas.",
    "Avaliar tecnicamente e conferir regularização.",
    "Negociar condições técnicas.",
    "Emitir parecer de aprovação técnica.",
    "Formalizar contrato/pedido.",
    "Agendar recebimento (POP008)."
   ],
   "responsabilidades": [
    {
     "papel": "Suprimentos/Compras",
     "atribuicoes": "Conduzir a compra."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Avaliar tecnicamente propostas e documentos."
    },
    {
     "papel": "Direção",
     "atribuicoes": "Aprovar."
    }
   ],
   "registros": [
    "Parecer técnico das propostas",
    "Pedido/contrato",
    "Comprovante de regularização"
   ],
   "indicadores": [
    {
     "indicador": "Aquisições com parecer técnico",
     "formula": "aquisições com parecer ÷ aquisições × 100",
     "metaSugerida": "A definir; referência 100%"
    }
   ],
   "periodicidade": "A cada aquisição.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar ISO 13485 e ISO 9001 como exigência do hospital (M1).",
    "Inventar valores de alçada."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-751-2022",
    "LEI-6360-1976",
    "LEI-14133-2021"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "compras_quem",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP008": {
   "codigo": "POP008",
   "nome": "Recebimento e Ensaio de Aceitação de Equipamentos de Saúde",
   "nomeAnterior": "Recebimento de Equipamento",
   "explicacao": "A conferência na chegada e os testes que liberam o equipamento para o primeiro uso.",
   "objetivo": "Garantir que todo equipamento seja conferido na chegada e só seja usado após ensaio de aceitação registrado.",
   "escopo": "Todo equipamento que entra no estabelecimento: compra, locação, comodato, doação, empréstimo e retorno de conserto externo.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Conferência documental",
     "descricao": "Nota fiscal/remessa, número de série, regularização na Anvisa, manuais em português, certificados, garantia.",
     "verificacao": [
      "nota fiscal",
      "número de série",
      "manual",
      "Anvisa"
     ]
    },
    {
     "item": "Conferência física",
     "descricao": "Embalagem, integridade, acessórios e quantidades conforme o pedido.",
     "verificacao": [
      "integridade",
      "acessórios",
      "embalagem"
     ]
    },
    {
     "item": "Ensaio de aceitação",
     "descricao": "Inspeção visual, ensaio funcional e, para eletromédicos, ensaio de segurança elétrica; participação do fornecedor quando previsto.",
     "verificacao": [
      "ensaio de aceitação",
      "segurança elétrica",
      "funcional"
     ]
    },
    {
     "item": "Bloqueio até a aprovação",
     "descricao": "Equipamento não aprovado fica identificado e segregado, sem uso.",
     "verificacao": [
      "não pode ser usado",
      "segreg",
      "identificad"
     ]
    },
    {
     "item": "Cadastro e comunicação",
     "descricao": "Cadastro no inventário, código e etiqueta, abertura do registro histórico; comunicar setor, patrimônio e treinamento.",
     "verificacao": [
      "inventário",
      "registro histórico",
      "comunica"
     ]
    },
    {
     "item": "Recusa",
     "descricao": "Registro de não conformidade e devolução ao fornecedor.",
     "verificacao": [
      "recusa",
      "não conformidade",
      "devolução"
     ]
    }
   ],
   "passos": [
    "Receber e conferir documentos.",
    "Conferir físico e acessórios.",
    "Segregar e identificar como 'aguardando aceitação'.",
    "Realizar ensaio de aceitação e registrar.",
    "Aprovar ou recusar.",
    "Cadastrar, codificar e etiquetar.",
    "Abrir registro histórico.",
    "Liberar para instalação/treinamento."
   ],
   "responsabilidades": [
    {
     "papel": "Almoxarifado/recebimento",
     "atribuicoes": "Receber e acionar a Engenharia Clínica."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Conferir, ensaiar, aprovar ou recusar."
    },
    {
     "papel": "Fornecedor",
     "atribuicoes": "Entregar documentos e participar do ensaio quando previsto."
    }
   ],
   "registros": [
    "Checklist de recebimento",
    "Termo/laudo de aceitação",
    "Registro de não conformidade"
   ],
   "indicadores": [
    {
     "indicador": "Equipamentos com ensaio de aceitação antes do uso",
     "formula": "aceitos com ensaio ÷ equipamentos recebidos × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "A cada recebimento.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Omitir ensaio de segurança elétrica.",
    "Liberar uso só com 'teste de funcionamento'."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-751-2022",
    "NBR-IEC-62353-2019",
    "NBR-IEC-60601-1-2010"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "receb_local",
     "obrigatorio": true
    },
    {
     "id": "receb_analisador",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP009": {
   "codigo": "POP009",
   "nome": "Instalação de Equipamentos de Saúde",
   "nomeAnterior": "Instalação de Equipamento de Saúde",
   "explicacao": "Requisitos de instalação, verificação da infraestrutura e liberação para uso.",
   "objetivo": "Garantir que a instalação siga o fabricante e as normas aplicáveis, com infraestrutura verificada e liberação registrada.",
   "escopo": "Equipamentos que exigem instalação (fixos, com utilidades, de imagem, de infraestrutura).",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Requisitos do fabricante",
     "descricao": "Levantar requisitos de instalação no manual (espaço, elétrica, aterramento, gases, água, climatização, rede).",
     "verificacao": [
      "requisitos",
      "fabricante",
      "aterramento"
     ]
    },
    {
     "item": "Comissionamento da infraestrutura",
     "descricao": "Verificar a infraestrutura antes da instalação (ligação com POP027).",
     "verificacao": [
      "infraestrutura",
      "comissionamento"
     ]
    },
    {
     "item": "Execução habilitada",
     "descricao": "Instalação por fornecedor ou técnico habilitado, com acompanhamento.",
     "verificacao": [
      "habilitad",
      "acompanha"
     ]
    },
    {
     "item": "Testes e liberação",
     "descricao": "Ensaio funcional e de segurança após instalação; termo de liberação.",
     "verificacao": [
      "liberação",
      "ensaio"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Data de instalação no inventário e no registro histórico.",
     "verificacao": [
      "data de instalação",
      "registro histórico"
     ]
    }
   ],
   "passos": [
    "Levantar requisitos.",
    "Verificar infraestrutura.",
    "Agendar com fornecedor e setor.",
    "Acompanhar a instalação.",
    "Realizar testes.",
    "Registrar e liberar.",
    "Treinar operadores (POP021)."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Coordenar, verificar e liberar."
    },
    {
     "papel": "Infraestrutura/manutenção predial",
     "atribuicoes": "Adequar utilidades."
    },
    {
     "papel": "Fornecedor",
     "atribuicoes": "Instalar conforme o fabricante."
    }
   ],
   "registros": [
    "Checklist de instalação",
    "Termo de liberação"
   ],
   "indicadores": [
    {
     "indicador": "Instalações com liberação registrada",
     "formula": "instalações com termo ÷ instalações × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "A cada instalação.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar valores elétricos genéricos inventados."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-63-2011",
    "RDC-50-2002",
    "NBR-13534-2008",
    "NBR-IEC-62353-2019"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "infra_responsavel",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP010": {
   "codigo": "POP010",
   "nome": "Armazenamento de Equipamentos de Saúde",
   "nomeAnterior": "Armazenamento de Equipamento de Saúde",
   "explicacao": "Como guardar equipamentos fora de uso sem dano, com controle e sem risco de uso indevido.",
   "objetivo": "Preservar integridade e desempenho dos equipamentos guardados e impedir o uso dos que não estão liberados.",
   "escopo": "Equipamentos novos aguardando aceitação, reserva, aguardando manutenção, interditados e aguardando descarte.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Condições do fabricante",
     "descricao": "Temperatura, umidade, empilhamento, proteção contra poeira; registro quando exigir controle ambiental.",
     "verificacao": [
      "temperatura",
      "umidade",
      "fabricante"
     ]
    },
    {
     "item": "Segregação",
     "descricao": "Separados de produtos químicos, inflamáveis e radioativos; áreas distintas para liberados, aguardando aceitação, interditados e descarte.",
     "verificacao": [
      "segreg",
      "interditad",
      "químic"
     ]
    },
    {
     "item": "Baterias",
     "descricao": "Manutenção de carga de baterias conforme o fabricante.",
     "verificacao": [
      "bateria",
      "carga"
     ]
    },
    {
     "item": "Controle",
     "descricao": "Registro de entrada e saída e localização no inventário.",
     "verificacao": [
      "entrada",
      "saída",
      "localização"
     ]
    },
    {
     "item": "Área sem alimentos",
     "descricao": "Sem alimentos, bebidas e objetos alheios (art. 14).",
     "verificacao": [
      "alimentos",
      "bebidas"
     ]
    }
   ],
   "passos": [
    "Receber e identificar a situação.",
    "Guardar na área correta.",
    "Registrar entrada e localização.",
    "Monitorar condições exigidas.",
    "Registrar saída."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Controlar e monitorar."
    },
    {
     "papel": "Almoxarifado",
     "atribuicoes": "Manter a área."
    }
   ],
   "registros": [
    "Controle de entrada e saída",
    "Registro de temperatura/umidade quando exigido"
   ],
   "indicadores": [
    {
     "indicador": "Equipamentos guardados com situação identificada",
     "formula": "identificados ÷ guardados × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Contínuo; conferência mensal sugerida (a definir).",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Mandar deixar todos os equipamentos com bateria ligados à rede sem considerar o fabricante."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-611-2022"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "area_local",
     "obrigatorio": true
    },
    {
     "id": "rec_fonte_radioativa",
     "obrigatorio": false
    },
    {
     "id": "rec_area_guarda",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP011": {
   "codigo": "POP011",
   "nome": "Transferência de Equipamentos de Saúde (Interna e Externa)",
   "nomeAnterior": "Transferência de Equipamento de Saúde",
   "explicacao": "Movimentação entre setores ou para fora do hospital, com registro e conferência.",
   "objetivo": "Garantir que toda movimentação preserve integridade, segurança e rastreabilidade, com registro no histórico.",
   "escopo": "Transferência entre setores, empréstimo, envio para conserto externo e cessão temporária a outra unidade.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Solicitação e autorização",
     "descricao": "Quem pode pedir e autorizar.",
     "verificacao": [
      "solicita",
      "autoriz"
     ]
    },
    {
     "item": "Condição antes e depois",
     "descricao": "Conferência do estado e acessórios na saída e na chegada; limpeza/descontaminação quando aplicável.",
     "verificacao": [
      "acessórios",
      "condição",
      "limpeza"
     ]
    },
    {
     "item": "Transporte seguro",
     "descricao": "Meio adequado, proteção contra impacto, separação de produtos que possam afetar o equipamento.",
     "verificacao": [
      "transporte",
      "impacto"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Origem, destino, datas, responsáveis; atualização do inventário e do histórico.",
     "verificacao": [
      "origem",
      "destino",
      "registro histórico"
     ]
    },
    {
     "item": "Saída externa",
     "descricao": "Termo de saída, prazo de retorno e dados do paciente apagados/protegidos quando o equipamento sai do hospital.",
     "verificacao": [
      "termo",
      "retorno",
      "dados"
     ]
    }
   ],
   "passos": [
    "Solicitar.",
    "Autorizar.",
    "Conferir e registrar condição.",
    "Transportar.",
    "Conferir na chegada.",
    "Atualizar inventário e histórico.",
    "Controlar retorno."
   ],
   "responsabilidades": [
    {
     "papel": "Gestor da unidade",
     "atribuicoes": "Solicitar e receber."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Autorizar, registrar, conferir."
    }
   ],
   "registros": [
    "Formulário de transferência",
    "Termo de saída externa"
   ],
   "indicadores": [
    {
     "indicador": "Transferências registradas",
     "formula": "transferências com registro ÷ transferências identificadas na auditoria × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "A cada transferência.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Esquecer saída para conserto externo."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "LEI-13709-2018"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "transf_emprestimos",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP012": {
   "codigo": "POP012",
   "nome": "Registro Histórico de Equipamentos de Saúde",
   "nomeAnterior": "Registro Histórico de Equipamentos",
   "explicacao": "O que se registra de cada equipamento ao longo da vida e por quanto tempo se guarda.",
   "objetivo": "Manter, para cada equipamento, o histórico completo que permita rastrear sua vida no estabelecimento.",
   "escopo": "Todos os equipamentos inventariados.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Conteúdo",
     "descricao": "Dados do inventário, data de aceitação, localização e transferências, responsável no setor, intervenções, calibrações, falhas, eventos adversos e queixas, ações de campo, desativação.",
     "verificacao": [
      "aceitação",
      "transferências",
      "intervenções",
      "falhas",
      "eventos"
     ]
    },
    {
     "item": "Ações corretivas e notificações",
     "descricao": "Registro das ações tomadas e das notificações à Anvisa e ao fornecedor.",
     "verificacao": [
      "notifica",
      "ação corretiva"
     ]
    },
    {
     "item": "Documentos anexos",
     "descricao": "Manuais, certificados, laudos, ordens de serviço.",
     "verificacao": [
      "certificado",
      "laudo",
      "manual"
     ]
    },
    {
     "item": "Guarda",
     "descricao": "Durante a permanência do equipamento e, após a baixa, pelo maior prazo entre a política arquivística aplicável e 5 anos (art. 16 da RDC 509).",
     "verificacao": [
      "guarda",
      "5 anos",
      "cinco anos",
      "baixa"
     ]
    }
   ],
   "passos": [
    "Abrir o registro no recebimento.",
    "Registrar cada evento no mesmo dia.",
    "Anexar documentos.",
    "Revisar nas auditorias.",
    "Encerrar na desativação e guardar pelo prazo."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Manter o registro."
    },
    {
     "papel": "Prestadores de serviço",
     "atribuicoes": "Entregar os relatórios de intervenção."
    }
   ],
   "registros": [
    "Registro histórico",
    "Ordens de serviço",
    "Certificados"
   ],
   "indicadores": [
    {
     "indicador": "Intervenções com registro no histórico",
     "formula": "OS registradas ÷ OS executadas × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Contínuo.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar prazo de guarda inventado ou 'Art. 17'."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "LEI-8159-1991",
    "RDC-551-2021",
    "LEI-13709-2018"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "hist_meio",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP013": {
   "codigo": "POP013",
   "nome": "Chamado Técnico de Equipamentos de Saúde",
   "nomeAnterior": "Chamado Técnico de Equipamento",
   "explicacao": "Abertura, prioridade, atendimento e encerramento dos chamados de manutenção.",
   "objetivo": "Padronizar a abertura e o acompanhamento dos chamados para que toda falha seja registrada, priorizada pela criticidade e resolvida com retorno ao solicitante.",
   "escopo": "Chamados de corretiva, instalação, transferência, treinamento e dúvidas técnicas sobre equipamentos de saúde.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Canais e horários",
     "descricao": "Como abrir o chamado (sistema, telefone) e o que fazer fora do horário.",
     "verificacao": [
      "abertura",
      "canal",
      "plantão"
     ]
    },
    {
     "item": "Dados obrigatórios",
     "descricao": "Código do equipamento, setor, solicitante, descrição da falha, data e hora, se houve dano a paciente.",
     "verificacao": [
      "código",
      "descrição",
      "data e hora"
     ]
    },
    {
     "item": "Ação imediata do usuário",
     "descricao": "Retirar de uso, identificar 'não usar', usar equipamento reserva; se houve dano ao paciente, preservar o equipamento e acessórios e acionar o POP018.",
     "verificacao": [
      "retirar de uso",
      "não usar",
      "POP018"
     ]
    },
    {
     "item": "Prioridade",
     "descricao": "Prioridade pela criticidade (POP020) e tempos de resposta acordados.",
     "verificacao": [
      "prioridade",
      "criticidade",
      "tempo de resposta"
     ]
    },
    {
     "item": "Encerramento",
     "descricao": "Registro do serviço, teste, liberação, ciência do solicitante e atualização do histórico.",
     "verificacao": [
      "encerra",
      "liberação",
      "registro histórico"
     ]
    },
    {
     "item": "Descontaminação",
     "descricao": "Equipamento limpo/descontaminado antes do atendimento (NR-32).",
     "verificacao": [
      "descontamina",
      "limpeza"
     ]
    }
   ],
   "passos": [
    "Usuário identifica a falha e retira de uso.",
    "Abre o chamado com os dados obrigatórios.",
    "Engenharia Clínica classifica a prioridade.",
    "Atende no prazo.",
    "Executa ou encaminha (POP022).",
    "Testa e libera.",
    "Encerra com ciência do setor."
   ],
   "responsabilidades": [
    {
     "papel": "Operador/gestor da unidade",
     "atribuicoes": "Abrir chamado, retirar de uso, liberar o equipamento."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Classificar, atender, encerrar."
    },
    {
     "papel": "Higienização/enfermagem",
     "atribuicoes": "Limpeza prévia."
    }
   ],
   "registros": [
    "Chamado/ordem de serviço"
   ],
   "indicadores": [
    {
     "indicador": "Tempo médio de resposta por criticidade",
     "formula": "soma (início do atendimento − abertura) ÷ nº de chamados",
     "metaSugerida": "Conforme contrato/POP020"
    },
    {
     "indicador": "Chamados reabertos em 30 dias",
     "formula": "reabertos ÷ encerrados × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Contínuo.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar nome de sistema comercial (achado: 'AUVO').",
    "Inventar tempos de resposta."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NR-32"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "chamado_canais",
     "obrigatorio": true
    },
    {
     "id": "tempos_resposta",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP014": {
   "codigo": "POP014",
   "nome": "Qualificação de Fornecedores de Equipamentos e de Serviços",
   "nomeAnterior": "Qualificação de Fornecedores",
   "explicacao": "Critérios para aprovar, acompanhar e reavaliar as empresas que fornecem ou mantêm equipamentos.",
   "objetivo": "Qualificar fornecedores de equipamentos e prestadores de serviços técnicos antes da contratação e reavaliá-los periodicamente.",
   "escopo": "Fabricantes, importadores, distribuidores, assistências técnicas, laboratórios de calibração e demais prestadores de serviço técnico.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Documentos de fornecedor de equipamento",
     "descricao": "Autorização de funcionamento (AFE) quando aplicável, licença sanitária, regularização do produto, autorização do fabricante para representante.",
     "verificacao": [
      "AFE",
      "licença",
      "regularização"
     ]
    },
    {
     "item": "Documentos de prestador de serviço",
     "descricao": "Registro no conselho, ART, comprovação de capacitação, padrões calibrados com rastreabilidade e, para calibração, certificado de laboratório preferencialmente acreditado.",
     "verificacao": [
      "ART",
      "rastreabilidade",
      "acreditad",
      "capacitação"
     ]
    },
    {
     "item": "Avaliação de desempenho",
     "descricao": "Critérios (prazo, qualidade, reincidência, documentação) e reavaliação periódica.",
     "verificacao": [
      "desempenho",
      "reavalia"
     ]
    },
    {
     "item": "Lista de qualificados",
     "descricao": "Lista vigente e bloqueio de desqualificados.",
     "verificacao": [
      "lista",
      "qualificados"
     ]
    }
   ],
   "passos": [
    "Solicitar documentos.",
    "Analisar.",
    "Aprovar ou reprovar e registrar.",
    "Incluir na lista.",
    "Acompanhar desempenho.",
    "Reavaliar periodicamente."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Analisar e avaliar tecnicamente."
    },
    {
     "papel": "Compras",
     "atribuicoes": "Só contratar qualificados."
    }
   ],
   "registros": [
    "Ficha de qualificação",
    "Lista de fornecedores qualificados",
    "Avaliação de desempenho"
   ],
   "indicadores": [
    {
     "indicador": "Fornecedores ativos qualificados",
     "formula": "qualificados ÷ ativos × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Na contratação; reavaliação anual sugerida (a definir).",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Exigir ISO 13485/ISO 9001 como condição obrigatória e citar RDC 665 como norma do hospital (M1).",
    "Citar nome de software."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-751-2022",
    "RDC-67-2009",
    "NBR-ISO-IEC-17025-2017",
    "LEI-6496-1977",
    "RES-CONFEA-1137-2023"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "forn_tipos",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP015": {
   "codigo": "POP015",
   "nome": "Ronda Técnica nos Setores (Inspeção de Rotina)",
   "nomeAnterior": "Ronda Interna",
   "explicacao": "Visitas programadas aos setores para verificar o estado e o uso dos equipamentos e antecipar falhas.",
   "objetivo": "Detectar precocemente danos, uso inadequado e falhas por inspeção visual e conversa com o operador, gerando chamado quando necessário.",
   "escopo": "Setores assistenciais e de apoio definidos pelo hospital, priorizando os de equipamentos de maior criticidade.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Roteiro e frequência",
     "descricao": "Setores, frequência por setor e prioridade pela criticidade.",
     "verificacao": [
      "roteiro",
      "frequência",
      "criticidade"
     ]
    },
    {
     "item": "Itens de inspeção",
     "descricao": "Integridade de gabinete, cabos, plugues, acessórios, sensores, alarmes, etiquetas e prazos de preventiva/calibração.",
     "verificacao": [
      "cabo",
      "acessórios",
      "alarme",
      "etiqueta"
     ]
    },
    {
     "item": "Escuta do operador",
     "descricao": "Perguntar ao operador sobre falhas e dificuldades e registrar.",
     "verificacao": [
      "operador"
     ]
    },
    {
     "item": "Ação sobre achados",
     "descricao": "Retirar de uso o que oferece risco, abrir chamado, orientar uso correto.",
     "verificacao": [
      "retirar de uso",
      "chamado",
      "orient"
     ]
    },
    {
     "item": "Limite da ronda",
     "descricao": "A ronda não substitui manutenção preventiva nem ensaio de segurança.",
     "verificacao": [
      "não substitui"
     ]
    }
   ],
   "passos": [
    "Planejar o roteiro.",
    "Inspecionar conforme checklist.",
    "Ouvir o operador.",
    "Tratar achados.",
    "Registrar a ronda e atualizar o histórico."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Executar e registrar."
    },
    {
     "papel": "Gestor da unidade",
     "atribuicoes": "Acompanhar e tratar orientações."
    }
   ],
   "registros": [
    "Checklist de ronda por setor"
   ],
   "indicadores": [
    {
     "indicador": "Cumprimento das rondas",
     "formula": "rondas realizadas ÷ programadas × 100",
     "metaSugerida": "A definir; referência ≥ 90%"
    },
    {
     "indicador": "Achados por ronda",
     "formula": "achados ÷ rondas",
     "metaSugerida": "Acompanhar tendência"
    }
   ],
   "periodicidade": "A definir pelo hospital por setor (o original fixa diária para todos, o que pode ser inviável).",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Fixar ronda diária em clínica pequena sem equipe residente."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NBR-IEC-62353-2019"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "ronda_freq",
     "obrigatorio": true
    },
    {
     "id": "ronda_presenca",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP016": {
   "codigo": "POP016",
   "nome": "Desativação de Equipamentos de Saúde",
   "nomeAnterior": "Desativação de Equipamentos",
   "explicacao": "Critérios e laudo para retirar definitivamente um equipamento de uso.",
   "objetivo": "Definir critérios técnicos para a desativação e garantir laudo, segregação e atualização dos registros.",
   "escopo": "Equipamentos inventariados retirados definitivamente de uso, inclusive os devolvidos ao locador/comodante.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Critérios",
     "descricao": "Falha irreparável, reparo economicamente inviável, falta de peças/suporte, obsolescência, risco à segurança, ação de campo do fabricante.",
     "verificacao": [
      "inviável",
      "obsolescência",
      "peças",
      "risco"
     ]
    },
    {
     "item": "Laudo de desativação",
     "descricao": "Dados do equipamento, motivo, data, responsável técnico e ciência do setor.",
     "verificacao": [
      "laudo",
      "motivo",
      "data"
     ]
    },
    {
     "item": "Dados armazenados",
     "descricao": "Apagar ou proteger dados de pacientes antes de o equipamento sair do controle do hospital.",
     "verificacao": [
      "dados",
      "apagar"
     ]
    },
    {
     "item": "Segregação e identificação",
     "descricao": "Identificar como desativado e guardar separado até o destino.",
     "verificacao": [
      "segreg",
      "desativado"
     ]
    },
    {
     "item": "Registros",
     "descricao": "Baixa no inventário e no patrimônio; encerramento do registro histórico.",
     "verificacao": [
      "baixa",
      "inventário",
      "patrimônio"
     ]
    }
   ],
   "passos": [
    "Identificar o equipamento candidato.",
    "Avaliar tecnicamente.",
    "Emitir laudo.",
    "Aprovar com a direção/patrimônio.",
    "Tratar dados armazenados.",
    "Segregar e identificar.",
    "Dar baixa e encaminhar ao descarte, doação ou devolução."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Avaliar e emitir laudo."
    },
    {
     "papel": "Patrimônio",
     "atribuicoes": "Baixa patrimonial."
    },
    {
     "papel": "TI",
     "atribuicoes": "Tratamento de dados, quando aplicável."
    }
   ],
   "registros": [
    "Laudo de desativação",
    "Registro de baixa"
   ],
   "indicadores": [
    {
     "indicador": "Desativações com laudo",
     "formula": "com laudo ÷ desativações × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Quando ocorrer; revisão anual da lista de candidatos.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar LGPD sem a norma estar aprovada na base (decisão do dono)."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-222-2018",
    "LEI-13709-2018"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "baixa_aprova",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP017": {
   "codigo": "POP017",
   "nome": "Descarte de Equipamentos de Saúde",
   "nomeAnterior": "Descarte de Equipamentos",
   "explicacao": "Destino final do equipamento desativado, de suas partes e resíduos, com rastreabilidade.",
   "objetivo": "Dar destino final ambientalmente adequado e rastreável aos equipamentos desativados e seus resíduos, conforme o plano de resíduos do hospital.",
   "escopo": "Equipamentos desativados, peças substituídas, baterias, lâmpadas, componentes com mercúrio ou outros resíduos perigosos gerados pela engenharia clínica.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Integração ao PGRSS",
     "descricao": "O descarte segue o plano de gerenciamento de resíduos do hospital.",
     "verificacao": [
      "PGRSS",
      "plano de gerenciamento de resíduos"
     ]
    },
    {
     "item": "Descontaminação prévia",
     "descricao": "Limpeza/descontaminação antes do manuseio.",
     "verificacao": [
      "descontamina"
     ]
    },
    {
     "item": "Classificação dos resíduos",
     "descricao": "Separar resíduos perigosos (baterias, mercúrio, componentes químicos, fontes radioativas) dos comuns.",
     "verificacao": [
      "bateria",
      "mercúrio",
      "perigos"
     ]
    },
    {
     "item": "Destinação rastreável",
     "descricao": "Empresa licenciada ou retorno ao fabricante, com comprovante de destinação.",
     "verificacao": [
      "licenciad",
      "comprovante",
      "destinação"
     ]
    },
    {
     "item": "Dados apagados",
     "descricao": "Confirmar remoção de dados antes da saída.",
     "verificacao": [
      "dados"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Data e destino no registro histórico.",
     "verificacao": [
      "registro histórico",
      "destino"
     ]
    }
   ],
   "passos": [
    "Receber laudo de desativação.",
    "Descontaminar.",
    "Remover dados.",
    "Desmontar e separar resíduos, se aplicável.",
    "Encaminhar a destinatário licenciado.",
    "Arquivar comprovante e registrar."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Preparar e registrar."
    },
    {
     "papel": "Responsável pelo PGRSS",
     "atribuicoes": "Definir destinação."
    },
    {
     "papel": "Patrimônio",
     "atribuicoes": "Baixa."
    }
   ],
   "registros": [
    "Comprovante de destinação",
    "Registro de descarte"
   ],
   "indicadores": [
    {
     "indicador": "Descartes com comprovante",
     "formula": "com comprovante ÷ descartes × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Quando ocorrer.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Prever 'venda como sucata' ou 'incineração' sem análise.",
    "Citar Decreto 10.240/2020 (só uso doméstico)."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-222-2018",
    "LEI-12305-2010",
    "DEC-10936-2022",
    "NBR-10004-1-2024",
    "LEI-13709-2018"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "pgrss",
     "obrigatorio": true
    },
    {
     "id": "destinacao_empresas",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP018": {
   "codigo": "POP018",
   "nome": "Notificação de Eventos Adversos e Queixas Técnicas e Atendimento a Alertas Sanitários",
   "nomeAnterior": "Notificação de Eventos",
   "explicacao": "Registro, investigação e notificação à Anvisa de eventos adversos e queixas técnicas com equipamentos, e resposta a alertas.",
   "objetivo": "Garantir que eventos adversos e queixas técnicas envolvendo equipamentos sejam registrados, investigados, notificados ao Sistema Nacional de Vigilância Sanitária e comunicados ao fornecedor, e que alertas e ações de campo sejam verificados.",
   "escopo": "Eventos adversos, incidentes e queixas técnicas com equipamentos de saúde e alertas/ações de campo sobre equipamentos do inventário.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Definições corretas",
     "descricao": "Evento adverso, incidente, queixa técnica e alerta, coerentes com o glossário do PGTS.",
     "verificacao": [
      "evento adverso",
      "queixa técnica",
      "incidente"
     ]
    },
    {
     "item": "Preservação",
     "descricao": "Retirar de uso, não ajustar, não limpar além do necessário à biossegurança, preservar acessórios, descartáveis e lote, identificar 'não usar'.",
     "verificacao": [
      "preserv",
      "não usar",
      "lote"
     ]
    },
    {
     "item": "Comunicação interna",
     "descricao": "Comunicação imediata ao NSP/gerência de risco e à engenharia clínica.",
     "verificacao": [
      "Núcleo de Segurança do Paciente",
      "comunica"
     ]
    },
    {
     "item": "Investigação técnica",
     "descricao": "Análise do equipamento, histórico, uso e causa, com laudo técnico.",
     "verificacao": [
      "investiga",
      "causa",
      "laudo"
     ]
    },
    {
     "item": "Notificação ao SNVS",
     "descricao": "Notificação pelos sistemas eletrônicos da Anvisa; eventos adversos pelo NSP mensalmente até o 15º dia útil do mês seguinte, e óbito em até 72 h (RDC 36/2013, art. 10); queixas técnicas conforme art. 19 da RDC 509.",
     "verificacao": [
      "notifica",
      "Anvisa",
      "72"
     ]
    },
    {
     "item": "Comunicação ao fornecedor",
     "descricao": "Informar o detentor de registro/fabricante.",
     "verificacao": [
      "fabricante",
      "fornecedor"
     ]
    },
    {
     "item": "Alertas e ações de campo",
     "descricao": "Verificar se o produto do alerta existe no inventário, executar a ação e registrar.",
     "verificacao": [
      "alerta",
      "ação de campo",
      "inventário"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Registro no histórico do equipamento e retorno ao setor.",
     "verificacao": [
      "registro histórico"
     ]
    }
   ],
   "passos": [
    "Identificar e cuidar do paciente.",
    "Retirar o equipamento de uso e preservar.",
    "Comunicar NSP e engenharia clínica.",
    "Registrar a ocorrência.",
    "Investigar tecnicamente.",
    "Notificar à Anvisa nos prazos.",
    "Comunicar o fornecedor.",
    "Implantar ações e registrar no histórico.",
    "Para alertas: conferir inventário, agir e registrar."
   ],
   "responsabilidades": [
    {
     "papel": "Profissional que identifica",
     "atribuicoes": "Retirar de uso, preservar e comunicar."
    },
    {
     "papel": "Núcleo de Segurança do Paciente",
     "atribuicoes": "Notificar ao SNVS e coordenar a investigação."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Investigação técnica, laudo, comunicação ao fornecedor, verificação de alertas."
    }
   ],
   "registros": [
    "Ficha de ocorrência",
    "Laudo técnico",
    "Comprovante de notificação",
    "Registro de verificação de alerta"
   ],
   "indicadores": [
    {
     "indicador": "Notificações no prazo",
     "formula": "notificadas no prazo ÷ eventos notificáveis × 100",
     "metaSugerida": "100%"
    },
    {
     "indicador": "Alertas verificados",
     "formula": "alertas verificados ÷ alertas recebidos aplicáveis × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Imediato após a ocorrência; prazos de notificação da RDC 36/2013; verificação de alertas assim que publicados.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Definir evento adverso incluindo 'dano ao ambiente' ou 'ao profissional'.",
    "Notificar só 'eventos graves' (achado em produção) quando a RDC 36 exige notificar os eventos adversos e o art. 19 da RDC 509 inclui queixas técnicas.",
    "Omitir preservação do equipamento e do lote.",
    "Inventar prazos."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-36-2013",
    "RDC-551-2021",
    "RDC-67-2009",
    "PRC-MS-5-2017",
    "RDC-872-2024"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "nsp_notifica",
     "obrigatorio": true
    },
    {
     "id": "rec_sentinela",
     "obrigatorio": false
    },
    {
     "id": "alertas_recebe",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP019": {
   "codigo": "POP019",
   "nome": "Entrega e Controle de EPI",
   "nomeAnterior": "Entrega de EPI's",
   "explicacao": "Fornecimento, registro, orientação e substituição dos equipamentos de proteção individual da equipe técnica.",
   "objetivo": "Garantir que a equipe que intervém em equipamentos receba EPI adequado ao risco, com certificado de aprovação válido, orientação e registro.",
   "escopo": "Equipe própria de engenharia clínica; para equipe contratada, o fornecimento é da empresa empregadora, e o hospital verifica.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Seleção pelo risco",
     "descricao": "EPI definido pela avaliação de riscos da atividade (programa de gerenciamento de riscos), não por lista fixa.",
     "verificacao": [
      "riscos",
      "atividade",
      "gerenciamento de riscos"
     ]
    },
    {
     "item": "Certificado de aprovação",
     "descricao": "Só EPI com certificado de aprovação válido.",
     "verificacao": [
      "certificado de aprovação"
     ]
    },
    {
     "item": "Fornecimento gratuito e registro",
     "descricao": "Entrega gratuita, registrada em ficha ou sistema eletrônico.",
     "verificacao": [
      "gratuit",
      "registro",
      "ficha"
     ]
    },
    {
     "item": "Orientação e treinamento",
     "descricao": "Uso, guarda, higienização e limitações.",
     "verificacao": [
      "orient",
      "treinamento",
      "higieniza"
     ]
    },
    {
     "item": "Substituição",
     "descricao": "Troca quando danificado, extraviado ou vencido.",
     "verificacao": [
      "substitu",
      "danificad"
     ]
    },
    {
     "item": "Exigência do uso",
     "descricao": "Supervisão do uso e responsabilidade de quem contrata.",
     "verificacao": [
      "uso obrigatório",
      "exigir"
     ]
    }
   ],
   "passos": [
    "Identificar riscos por atividade.",
    "Definir EPI.",
    "Entregar e registrar.",
    "Orientar.",
    "Supervisionar o uso.",
    "Substituir quando necessário."
   ],
   "responsabilidades": [
    {
     "papel": "Empregador (hospital ou empresa contratada)",
     "atribuicoes": "Fornecer, orientar, exigir, substituir e registrar."
    },
    {
     "papel": "Trabalhador",
     "atribuicoes": "Usar, guardar, conservar e comunicar danos."
    },
    {
     "papel": "SESMT",
     "atribuicoes": "Definir EPI pelo risco."
    }
   ],
   "registros": [
    "Ficha ou registro eletrônico de entrega de EPI",
    "Registro de orientação"
   ],
   "indicadores": [
    {
     "indicador": "Trabalhadores com registro de EPI em dia",
     "formula": "com registro ÷ trabalhadores × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Na admissão, na troca e conforme vida útil do EPI.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Lista fixa de EPI sem avaliação de risco (inclui 'cinto de segurança' e 'capacete' para todos).",
    "Citar 'Portaria 3.214/1978' e itens antigos da NR-6."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NR-06",
    "NR-01",
    "NR-32",
    "NR-10"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP020": {
   "codigo": "POP020",
   "nome": "Classificação de Criticidade de Equipamentos de Saúde",
   "nomeAnterior": "Nível de Criticidade",
   "explicacao": "Como classificar os equipamentos pelo risco e usar a classificação para priorizar atendimento e manutenção.",
   "objetivo": "Estabelecer método documentado para classificar a criticidade dos equipamentos e usá-lo na priorização de manutenção preventiva, tempos de resposta e reposição.",
   "escopo": "Todos os equipamentos inventariados.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Critérios",
     "descricao": "Função (suporte à vida, terapia, diagnóstico, monitoração, apoio), risco ao paciente na falha, requisitos de manutenção do fabricante, histórico de falhas e incidentes, existência de reserva.",
     "verificacao": [
      "função",
      "suporte à vida",
      "histórico",
      "reserva"
     ]
    },
    {
     "item": "Método e escala",
     "descricao": "Fórmula ou matriz com pontuação e faixas claras, aplicada igual a todos.",
     "verificacao": [
      "pontuação",
      "faixa",
      "matriz"
     ]
    },
    {
     "item": "Uso da classificação",
     "descricao": "Liga criticidade a tempo de resposta, prioridade de preventiva e necessidade de reserva.",
     "verificacao": [
      "tempo de resposta",
      "prioridade",
      "preventiva"
     ]
    },
    {
     "item": "Revisão",
     "descricao": "Reclassificar quando mudar uso, setor ou histórico.",
     "verificacao": [
      "revis",
      "reclassific"
     ]
    }
   ],
   "passos": [
    "Levantar dados de cada equipamento.",
    "Aplicar o método.",
    "Validar com os setores.",
    "Registrar no inventário.",
    "Definir tempos e prioridades.",
    "Revisar periodicamente."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Classificar e manter."
    },
    {
     "papel": "Gestores assistenciais",
     "atribuicoes": "Informar uso clínico e reservas."
    }
   ],
   "registros": [
    "Matriz de criticidade"
   ],
   "indicadores": [
    {
     "indicador": "Equipamentos classificados",
     "formula": "classificados ÷ inventariados × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Na entrada; revisão anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Classes A/B/C sem método nem pontuação; exemplos de setores inexistentes no cliente (achado).",
    "Citar ISO 14971 como exigência do hospital."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NBR-ISO-14971-2020"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "tempos_resposta",
     "obrigatorio": true
    },
    {
     "id": "criticidade_uso",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP021": {
   "codigo": "POP021",
   "nome": "Treinamento de Operadores e da Equipe Técnica",
   "nomeAnterior": "Treinamentos",
   "explicacao": "Capacitação registrada de quem opera e de quem mantém os equipamentos.",
   "objetivo": "Garantir que operadores e técnicos sejam capacitados antes do uso e de forma continuada, com registro e avaliação.",
   "escopo": "Operadores dos equipamentos e equipe técnica; educação continuada dos envolvidos no gerenciamento (art. 11 da RDC 509).",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Antes do primeiro uso",
     "descricao": "Operador capacitado antes de usar o equipamento novo ou desconhecido (NR-32, 32.10.3).",
     "verificacao": [
      "antes",
      "primeiro uso"
     ]
    },
    {
     "item": "Plano anual",
     "descricao": "Programa de educação continuada com temas, público e periodicidade.",
     "verificacao": [
      "plano",
      "educação continuada"
     ]
    },
    {
     "item": "Conteúdo mínimo",
     "descricao": "Uso seguro, alarmes, limpeza conforme fabricante, falhas comuns, o que fazer em defeito e evento adverso.",
     "verificacao": [
      "alarme",
      "limpeza",
      "evento adverso"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Data, horário, carga horária, conteúdo, instrutor e participantes.",
     "verificacao": [
      "carga horária",
      "instrutor",
      "participantes"
     ]
    },
    {
     "item": "Avaliação de eficácia",
     "descricao": "Avaliar se o treinamento atingiu o objetivo.",
     "verificacao": [
      "eficácia",
      "avaliação"
     ]
    },
    {
     "item": "Manuais em português",
     "descricao": "Manuais disponíveis em português no local de uso.",
     "verificacao": [
      "manual",
      "português"
     ]
    }
   ],
   "passos": [
    "Levantar necessidades.",
    "Planejar.",
    "Realizar (fabricante, fornecedor ou equipe interna).",
    "Registrar presença e conteúdo.",
    "Avaliar eficácia.",
    "Registrar no histórico do equipamento quando ligado a um equipamento."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Planejar e registrar treinamentos técnicos."
    },
    {
     "papel": "Educação continuada/gestores",
     "atribuicoes": "Liberar equipes e acompanhar."
    },
    {
     "papel": "Fornecedor",
     "atribuicoes": "Treinar conforme contrato."
    }
   ],
   "registros": [
    "Plano anual",
    "Lista de presença",
    "Avaliação de eficácia"
   ],
   "indicadores": [
    {
     "indicador": "Cumprimento do plano",
     "formula": "treinamentos realizados ÷ planejados × 100",
     "metaSugerida": "A definir"
    },
    {
     "indicador": "Operadores treinados por equipamento crítico",
     "formula": "treinados ÷ operadores × 100",
     "metaSugerida": "A definir; referência 100%"
    }
   ],
   "periodicidade": "Na entrada do equipamento, na admissão do profissional e conforme plano anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-63-2011",
    "NR-32",
    "NR-01"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "educacao_setor",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP022": {
   "codigo": "POP022",
   "nome": "Intervenções Técnicas: Manutenção Corretiva, Preventiva, Calibração e Ensaios de Segurança",
   "nomeAnterior": "Intervenções Técnicas",
   "explicacao": "Como são feitas, registradas e liberadas as manutenções, calibrações e testes dos equipamentos.",
   "objetivo": "Padronizar a execução, o registro e a liberação das intervenções técnicas para que todo equipamento volte ao uso seguro e com desempenho verificado.",
   "escopo": "Manutenção corretiva, preventiva, calibração, verificação e ensaios de segurança elétrica, próprios ou terceirizados.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Plano de manutenção preventiva",
     "descricao": "Cronograma por equipamento com periodicidade baseada no fabricante, na criticidade e no histórico.",
     "verificacao": [
      "cronograma",
      "periodicidade",
      "fabricante"
     ]
    },
    {
     "item": "Descontaminação prévia",
     "descricao": "Equipamento limpo/descontaminado antes da intervenção (NR-32).",
     "verificacao": [
      "descontamina"
     ]
    },
    {
     "item": "Execução conforme fabricante",
     "descricao": "Seguir o manual de serviço; peças originais ou equivalentes aprovadas; sem modificar características do registro.",
     "verificacao": [
      "manual de serviço",
      "peças"
     ]
    },
    {
     "item": "Ensaio após reparo",
     "descricao": "Ensaio de segurança elétrica e funcional após intervenção que possa afetar a segurança, conforme NBR IEC 62353.",
     "verificacao": [
      "segurança elétrica",
      "após reparo",
      "62353"
     ]
    },
    {
     "item": "Calibração rastreável",
     "descricao": "Instrumentos e padrões calibrados com rastreabilidade; certificado com incerteza; critério de aceitação.",
     "verificacao": [
      "rastreabilidade",
      "incerteza",
      "certificado"
     ]
    },
    {
     "item": "Liberação",
     "descricao": "Critério de liberação, etiqueta e comunicação ao setor; reprovado fica interditado.",
     "verificacao": [
      "liberação",
      "interdit"
     ]
    },
    {
     "item": "Registro",
     "descricao": "Ordem de serviço com executor, datas, serviço, peças, resultados, no registro histórico.",
     "verificacao": [
      "ordem de serviço",
      "executor",
      "registro histórico"
     ]
    },
    {
     "item": "Terceiros",
     "descricao": "Intervenção de terceiro acompanhada e documentada.",
     "verificacao": [
      "terceir"
     ]
    }
   ],
   "passos": [
    "Planejar (cronograma) ou receber chamado.",
    "Retirar de uso e descontaminar.",
    "Executar conforme manual.",
    "Ensaiar (funcional, segurança, calibração).",
    "Comparar com critérios de aceitação.",
    "Liberar ou interditar.",
    "Registrar e comunicar."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Planejar, executar ou acompanhar, liberar, registrar."
    },
    {
     "papel": "Setor usuário",
     "atribuicoes": "Disponibilizar o equipamento e receber liberado."
    },
    {
     "papel": "Prestador",
     "atribuicoes": "Executar com profissional capacitado e entregar relatório."
    }
   ],
   "registros": [
    "Cronograma de preventiva e calibração",
    "Ordem de serviço",
    "Relatório de ensaio de segurança elétrica",
    "Certificado de calibração"
   ],
   "indicadores": [
    {
     "indicador": "Cumprimento da preventiva",
     "formula": "MP realizadas ÷ programadas × 100",
     "metaSugerida": "Referência usual ≥ 90%; a definir"
    },
    {
     "indicador": "Calibrações válidas",
     "formula": "com calibração válida ÷ que exigem × 100",
     "metaSugerida": "A definir; referência 100% críticos"
    },
    {
     "indicador": "Corretivas por preventiva",
     "formula": "nº corretivas ÷ nº preventivas no período",
     "metaSugerida": "Acompanhar tendência"
    }
   ],
   "periodicidade": "Preventiva e calibração conforme fabricante, criticidade e histórico (não fixar 'anual' para todos); corretiva quando houver falha.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Omitir ensaio de segurança após reparo.",
    "Fixar periodicidade anual para tudo.",
    "Definir calibração copiando texto de vocabulário protegido.",
    "Citar IEC 60601-1 como roteiro de manutenção (é norma de projeto)."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NBR-IEC-62353-2019",
    "NBR-ISO-IEC-17025-2017",
    "NR-32",
    "NR-10",
    "RDC-63-2011",
    "RDC-611-2022",
    "RDC-15-2012"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "interv_executa",
     "obrigatorio": true
    },
    {
     "id": "rec_cme",
     "obrigatorio": true
    },
    {
     "id": "rec_radiologia",
     "obrigatorio": true
    },
    {
     "id": "instrumentos_ensaio",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP023": {
   "codigo": "POP023",
   "nome": "Verificação e Teste Periódico de Grupos Geradores de Energia Elétrica",
   "nomeAnterior": "Verificação e Utilização de Grupos Geradores de Energia Elétrica",
   "explicacao": "Verificações e testes periódicos dos grupos geradores que alimentam as cargas essenciais.",
   "objetivo": "Garantir que o grupo gerador assuma as cargas essenciais em falta de energia, com verificações e testes periódicos registrados.",
   "escopo": "Grupos geradores e quadros de transferência do estabelecimento.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Verificações de rotina",
     "descricao": "Combustível, óleo, arrefecimento, bateria de partida, vazamentos, modo automático.",
     "verificacao": [
      "combustível",
      "óleo",
      "arrefecimento",
      "bateria"
     ]
    },
    {
     "item": "Teste periódico com carga",
     "descricao": "Teste com transferência de carga programado e comunicado aos setores críticos.",
     "verificacao": [
      "teste",
      "carga",
      "transferência"
     ]
    },
    {
     "item": "Segurança",
     "descricao": "Somente pessoal autorizado e capacitado em eletricidade; protetor auricular; parada de emergência.",
     "verificacao": [
      "autorizad",
      "NR-10",
      "auricular"
     ]
    },
    {
     "item": "Anormalidades",
     "descricao": "Registrar e abrir chamado para empresa especializada.",
     "verificacao": [
      "anormalidade",
      "chamado"
     ]
    },
    {
     "item": "Manutenção especializada",
     "descricao": "A rotina não substitui a manutenção preventiva da empresa especializada.",
     "verificacao": [
      "não substitui",
      "preventiva"
     ]
    }
   ],
   "passos": [
    "Colocar em modo manual para inspeção.",
    "Verificar níveis e vazamentos.",
    "Retornar ao automático.",
    "Executar teste conforme plano.",
    "Registrar resultados.",
    "Tratar anormalidades."
   ],
   "responsabilidades": [
    {
     "papel": "Infraestrutura/manutenção predial",
     "atribuicoes": "Executar rotina e testes."
    },
    {
     "papel": "Empresa especializada",
     "atribuicoes": "Preventiva e corretiva."
    },
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Verificar se as cargas dos equipamentos críticos estão na rede de emergência."
    }
   ],
   "registros": [
    "Ficha de verificação e teste do gerador"
   ],
   "indicadores": [
    {
     "indicador": "Testes realizados",
     "formula": "realizados ÷ programados × 100",
     "metaSugerida": "100%"
    }
   ],
   "periodicidade": "Conforme fabricante e projeto; o original usa verificação semanal com 1 h de operação com carga: manter como referência a confirmar pelo hospital.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Gerar o POP para clínica sem gerador (achado: gerado para todos os clientes).",
    "Inventar autonomia mínima e rotinas diárias."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NBR-13534-2008",
    "RDC-50-2002",
    "NR-10",
    "NBR-ISO-8528-1-2025"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "rec_gerador",
     "obrigatorio": true
    },
    {
     "id": "gerador_qtd",
     "obrigatorio": true
    },
    {
     "id": "gerador_opera",
     "obrigatorio": true
    },
    {
     "id": "gerador_testes",
     "obrigatorio": true
    }
   ],
   "condicao": {
    "pergunta": "rec_gerador",
    "valor": "sim",
    "recurso": "grupo gerador de energia elétrica"
   }
  },
  "POP024": {
   "codigo": "POP024",
   "nome": "Distribuição, Transporte e Armazenamento de Cilindros de Gases Medicinais",
   "nomeAnterior": "Distribuição, Transporte e Armazenamento de Cilindros de Gases Medicinais",
   "explicacao": "Como receber, guardar, transportar, instalar e devolver cilindros de gases medicinais com segurança.",
   "objetivo": "Garantir segurança no manuseio de cilindros de gases medicinais, conforme a NR-32 e as instruções do fornecedor.",
   "escopo": "Cilindros de gases medicinais e seus reguladores/manômetros no estabelecimento.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Identificação do gás",
     "descricao": "Cilindro identificado conforme a norma de identificação; recusar cilindro sem identificação ou sem válvula de segurança.",
     "verificacao": [
      "identificação",
      "válvula"
     ]
    },
    {
     "item": "Armazenamento",
     "descricao": "Em pé, fixados, área ventilada, cheios separados de vazios, gases incompatíveis separados (inflamáveis afastados dos oxidantes).",
     "verificacao": [
      "fixad",
      "ventilad",
      "cheios",
      "vazios"
     ]
    },
    {
     "item": "Transporte",
     "descricao": "Carrinho próprio com fixação, válvula fechada, capacete protetor quando houver; proibido rolar, arrastar ou usar meios improvisados.",
     "verificacao": [
      "carrinho",
      "válvula fechada",
      "proibido"
     ]
    },
    {
     "item": "Sem óleo ou graxa",
     "descricao": "Proibido óleo, graxa e mãos sujas de óleo em válvulas e reguladores, especialmente de oxigênio.",
     "verificacao": [
      "óleo",
      "graxa"
     ]
    },
    {
     "item": "Ficha de segurança",
     "descricao": "Ficha com dados de segurança de cada gás disponível no local de uso.",
     "verificacao": [
      "ficha",
      "segurança"
     ]
    },
    {
     "item": "Vazamento e emergência",
     "descricao": "Fechar válvula, ventilar, afastar pessoas, acionar responsável.",
     "verificacao": [
      "vazamento",
      "emergência"
     ]
    },
    {
     "item": "Pessoal capacitado",
     "descricao": "Somente pessoal treinado e com EPI.",
     "verificacao": [
      "capacitad",
      "EPI"
     ]
    }
   ],
   "passos": [
    "Receber e conferir identificação e validade do teste do cilindro.",
    "Armazenar corretamente.",
    "Transportar com carrinho.",
    "Instalar regulador adequado.",
    "Monitorar conteúdo e devolver vazios.",
    "Registrar."
   ],
   "responsabilidades": [
    {
     "papel": "Farmácia/almoxarifado ou setor definido pelo hospital",
     "atribuicoes": "Solicitar e controlar estoque."
    },
    {
     "papel": "Infraestrutura",
     "atribuicoes": "Transportar e instalar."
    },
    {
     "papel": "Operadores",
     "atribuicoes": "Uso seguro."
    }
   ],
   "registros": [
    "Controle de entrada/saída de cilindros"
   ],
   "indicadores": [
    {
     "indicador": "Inspeções de armazenamento conformes",
     "formula": "conformes ÷ inspeções × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Contínuo; inspeção da área de guarda com frequência a definir.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Gerar para quem não usa cilindros.",
    "Citar 'NBR 12276' (número errado) ou edição antiga da NBR 12176."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NR-32",
    "NBR-12176-2026",
    "NBR-12188-2016",
    "RDC-50-2002",
    "NR-06"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "rec_cilindros",
     "obrigatorio": true
    },
    {
     "id": "gases_quais",
     "obrigatorio": true
    },
    {
     "id": "cilindros_quem",
     "obrigatorio": true
    },
    {
     "id": "rec_central_gases",
     "obrigatorio": true
    }
   ],
   "condicao": {
    "pergunta": "rec_cilindros",
    "valor": "sim",
    "recurso": "cilindros de gases medicinais"
   }
  },
  "POP025": {
   "codigo": "POP025",
   "nome": "Avaliação Anual da Efetividade do Plano de Gerenciamento de Tecnologias em Saúde",
   "nomeAnterior": "Avaliação Anual de Efetividade do Programa de Gerenciamento de Tecnologias em Saúde",
   "explicacao": "Avaliação anual, com indicadores, do quanto o plano está funcionando, e divulgação do resultado.",
   "objetivo": "Avaliar anualmente a efetividade do plano com dados objetivos, definir ações de melhoria e divulgar os resultados (art. 7º §2º e art. 9º da RDC 509).",
   "escopo": "Todas as etapas do plano de equipamentos de saúde.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Indicadores com fórmula",
     "descricao": "Indicadores definidos, fórmula, fonte de dados e meta do hospital.",
     "verificacao": [
      "indicador",
      "fórmula",
      "meta"
     ]
    },
    {
     "item": "Análise crítica",
     "descricao": "Comparação com metas e ano anterior, causas e pontos fortes e fracos.",
     "verificacao": [
      "análise",
      "meta",
      "ano anterior"
     ]
    },
    {
     "item": "Plano de ação",
     "descricao": "Ações, responsáveis e prazos.",
     "verificacao": [
      "plano de ação",
      "prazo",
      "responsável"
     ]
    },
    {
     "item": "Divulgação",
     "descricao": "Resultados disponíveis a todos os envolvidos (art. 9º).",
     "verificacao": [
      "divulga",
      "disponíve"
     ]
    },
    {
     "item": "Revisão do plano",
     "descricao": "Atualizar PGTS e POPs conforme o resultado.",
     "verificacao": [
      "revisão",
      "atualiza"
     ]
    }
   ],
   "passos": [
    "Coletar dados do período.",
    "Calcular indicadores.",
    "Analisar.",
    "Elaborar relatório e plano de ação.",
    "Aprovar com a direção.",
    "Divulgar.",
    "Revisar documentos."
   ],
   "responsabilidades": [
    {
     "papel": "Responsável pelo plano",
     "atribuicoes": "Conduzir e assinar."
    },
    {
     "papel": "Direção",
     "atribuicoes": "Aprovar e prover recursos."
    }
   ],
   "registros": [
    "Relatório anual de efetividade",
    "Plano de ação"
   ],
   "indicadores": [
    {
     "indicador": "Ações do plano anterior concluídas",
     "formula": "concluídas ÷ planejadas × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Inventar resultados ou metas."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "aval_periodo",
     "obrigatorio": true
    },
    {
     "id": "metas",
     "obrigatorio": true
    }
   ],
   "condicao": null
  },
  "POP026": {
   "codigo": "POP026",
   "nome": "Organização e Higiene das Áreas de Recebimento, Guarda e Distribuição de Equipamentos",
   "nomeAnterior": "Controle Sanitário e Higiene em Áreas de Recebimento, Armazenagem e Distribuição de Tecnologias em Saúde",
   "explicacao": "Regras de organização e higiene nas áreas onde equipamentos são recebidos, guardados e distribuídos.",
   "objetivo": "Manter as áreas de recebimento, guarda, oficina e distribuição de equipamentos limpas, organizadas e livres de alimentos, bebidas e objetos alheios (art. 14).",
   "escopo": "Áreas de recebimento, guarda, oficina e distribuição de equipamentos.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Proibição",
     "descricao": "Proibido guardar e consumir alimentos e bebidas e manter objetos alheios.",
     "verificacao": [
      "alimentos",
      "bebidas",
      "objetos"
     ]
    },
    {
     "item": "Limpeza",
     "descricao": "Rotina de limpeza das áreas e de superfícies, conforme serviço de higienização do hospital.",
     "verificacao": [
      "limpeza",
      "rotina"
     ]
    },
    {
     "item": "Separação limpo/contaminado",
     "descricao": "Equipamento aguardando descontaminação separado do liberado.",
     "verificacao": [
      "contaminado",
      "liberado"
     ]
    },
    {
     "item": "Sinalização e inspeção",
     "descricao": "Sinalização das regras e inspeção periódica registrada.",
     "verificacao": [
      "sinaliza",
      "inspeção"
     ]
    }
   ],
   "passos": [
    "Sinalizar regras.",
    "Executar limpeza conforme rotina.",
    "Separar fluxos.",
    "Inspecionar e registrar.",
    "Tratar desvios."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Manter a área e inspecionar."
    },
    {
     "papel": "Higienização",
     "atribuicoes": "Limpeza."
    }
   ],
   "registros": [
    "Checklist de inspeção da área"
   ],
   "indicadores": [
    {
     "indicador": "Inspeções sem desvio",
     "formula": "inspeções conformes ÷ inspeções × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Inspeção com frequência a definir pelo hospital.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Transformar em POP de controle de infecção hospitalar ou de farmácia."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "NR-32",
    "RDC-63-2011"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "rec_area_guarda",
     "obrigatorio": true
    },
    {
     "id": "areas_quais",
     "obrigatorio": true
    }
   ],
   "condicao": {
    "pergunta": "rec_area_guarda",
    "valor": "sim",
    "recurso": "área própria de recebimento, guarda ou oficina",
    "senao": "Sem área própria, as regras de organização e higiene dessas áreas entram no POP010 (Armazenamento de Equipamentos de Saúde)."
   }
  },
  "POP027": {
   "codigo": "POP027",
   "nome": "Avaliação da Infraestrutura para Instalação e Uso de Equipamentos de Saúde",
   "nomeAnterior": "Avaliação e Adequação de Infraestrutura Física para Tecnologias em Saúde",
   "explicacao": "Se a infraestrutura (elétrica, gases, climatização, espaço) atende aos equipamentos instalados ou a instalar.",
   "objetivo": "Verificar, antes de incorporar ou instalar e periodicamente, se a infraestrutura atende aos requisitos dos equipamentos e das normas, encaminhando adequações.",
   "escopo": "Utilidades e espaços que servem aos equipamentos de saúde; o projeto físico em si é de responsabilidade de arquitetura/engenharia predial.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Requisitos do equipamento",
     "descricao": "Levantar requisitos do fabricante (alimentação, aterramento, gases, água, climatização, espaço, rede).",
     "verificacao": [
      "requisitos",
      "aterramento",
      "climatização"
     ]
    },
    {
     "item": "Verificação",
     "descricao": "Conferir a infraestrutura existente contra os requisitos e normas aplicáveis.",
     "verificacao": [
      "verifica",
      "conform"
     ]
    },
    {
     "item": "Encaminhamento de adequações",
     "descricao": "Registrar não conformidades e encaminhar à área responsável com prioridade.",
     "verificacao": [
      "adequação",
      "não conformidade"
     ]
    },
    {
     "item": "Limites de competência",
     "descricao": "Engenharia clínica avalia e comunica; projeto e execução predial são de profissional habilitado da área.",
     "verificacao": [
      "habilitad",
      "projeto"
     ]
    }
   ],
   "passos": [
    "Levantar requisitos.",
    "Inspecionar.",
    "Registrar achados.",
    "Encaminhar adequações.",
    "Confirmar adequação antes da instalação."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Avaliar e comunicar."
    },
    {
     "papel": "Engenharia/manutenção predial",
     "atribuicoes": "Projetar e executar adequações."
    }
   ],
   "registros": [
    "Relatório de avaliação de infraestrutura"
   ],
   "indicadores": [
    {
     "indicador": "Adequações concluídas no prazo",
     "formula": "concluídas ÷ abertas × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Antes de cada instalação relevante e revisão anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Afirmar que a infraestrutura 'está conforme' sem laudo.",
    "Ditar valores de projeto."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-50-2002",
    "NBR-13534-2008",
    "NBR-5410-2004",
    "NBR-12188-2016",
    "NR-10"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "infra_responsavel",
     "obrigatorio": true
    },
    {
     "id": "laudos",
     "obrigatorio": false
    }
   ],
   "condicao": null
  },
  "POP028": {
   "codigo": "POP028",
   "nome": "Gerenciamento de Risco das Tecnologias e Tratamento de Não Conformidades",
   "nomeAnterior": "Gerenciamento de Risco e Tratamento de Não Conformidades",
   "explicacao": "Como identificar riscos dos equipamentos e tratar as não conformidades até a eficácia.",
   "objetivo": "Manter sistemática de monitorização e gerenciamento de risco dos equipamentos (art. 18 da RDC 509) e tratar não conformidades com análise de causa e verificação de eficácia.",
   "escopo": "Riscos relacionados aos equipamentos de saúde e não conformidades das etapas do plano.",
   "secoes": [
    "Objetivo",
    "Abrangência",
    "Definições",
    "Responsabilidades",
    "Periodicidade",
    "Materiais e registros",
    "Procedimento",
    "Exceções e tratamento de não conformidades",
    "Indicadores"
   ],
   "secoesSistema": [
    "Referências normativas (montada pelo sistema)"
   ],
   "conteudoMinimo": [
    {
     "item": "Fontes de risco",
     "descricao": "Rondas, chamados, falhas repetidas, eventos adversos, queixas técnicas, alertas e auditorias.",
     "verificacao": [
      "fontes",
      "falhas",
      "alertas",
      "auditoria"
     ]
    },
    {
     "item": "Análise e avaliação",
     "descricao": "Probabilidade e gravidade, critério de aceitabilidade definido.",
     "verificacao": [
      "probabilidade",
      "gravidade",
      "aceit"
     ]
    },
    {
     "item": "Ações e responsáveis",
     "descricao": "Ações de controle com prazo e responsável.",
     "verificacao": [
      "ação",
      "prazo",
      "responsável"
     ]
    },
    {
     "item": "Tratamento de não conformidade",
     "descricao": "Registro, contenção, causa, ação corretiva e verificação de eficácia.",
     "verificacao": [
      "causa",
      "ação corretiva",
      "eficácia"
     ]
    },
    {
     "item": "Integração com o NSP",
     "descricao": "Interface com o Núcleo de Segurança do Paciente e com o POP018.",
     "verificacao": [
      "Núcleo de Segurança do Paciente",
      "POP018"
     ]
    }
   ],
   "passos": [
    "Coletar sinais de risco.",
    "Registrar não conformidade.",
    "Conter.",
    "Analisar causa.",
    "Definir ação.",
    "Implantar.",
    "Verificar eficácia.",
    "Revisar a matriz de riscos."
   ],
   "responsabilidades": [
    {
     "papel": "Engenharia Clínica",
     "atribuicoes": "Coordenar no escopo dos equipamentos."
    },
    {
     "papel": "Núcleo de Segurança do Paciente/qualidade",
     "atribuicoes": "Integrar ao gerenciamento de risco institucional."
    }
   ],
   "registros": [
    "Registro de não conformidade",
    "Matriz de riscos dos equipamentos"
   ],
   "indicadores": [
    {
     "indicador": "Não conformidades encerradas com eficácia",
     "formula": "encerradas com eficácia ÷ abertas × 100",
     "metaSugerida": "A definir"
    }
   ],
   "periodicidade": "Contínuo; revisão da matriz de riscos anual.",
   "erros": [
    "Seção 'Base Normativa' repetindo a frase fixa; seção de histórico de revisões/versão escrita pela IA; título com código ou nome do hospital.",
    "Citar a ISO 14971 como obrigação do hospital."
   ],
   "normas": [
    "RDC-509-2021",
    "NBR-15943-2011",
    "RDC-36-2013",
    "RDC-551-2021",
    "PRC-MS-5-2017",
    "NBR-ISO-14971-2020"
   ],
   "perguntas": [
    {
     "id": "ec_modelo",
     "obrigatorio": true
    },
    {
     "id": "ec_empresa",
     "obrigatorio": true
    },
    {
     "id": "resp_nome",
     "obrigatorio": true
    },
    {
     "id": "resp_cargo",
     "obrigatorio": true
    },
    {
     "id": "resp_formacao",
     "obrigatorio": true
    },
    {
     "id": "resp_registro",
     "obrigatorio": false
    },
    {
     "id": "setores",
     "obrigatorio": true
    },
    {
     "id": "natureza",
     "obrigatorio": true
    },
    {
     "id": "registro_forma",
     "obrigatorio": true
    },
    {
     "id": "est_nsp",
     "obrigatorio": true
    },
    {
     "id": "est_risco",
     "obrigatorio": true
    },
    {
     "id": "est_sesmt",
     "obrigatorio": true
    },
    {
     "id": "est_ccih",
     "obrigatorio": true
    },
    {
     "id": "est_padronizacao",
     "obrigatorio": true
    },
    {
     "id": "parque",
     "obrigatorio": false
    },
    {
     "id": "impl_planejamento",
     "obrigatorio": true
    },
    {
     "id": "impl_aquisicao",
     "obrigatorio": true
    },
    {
     "id": "impl_recebimento",
     "obrigatorio": true
    },
    {
     "id": "impl_inventario",
     "obrigatorio": true
    },
    {
     "id": "impl_instalacao",
     "obrigatorio": true
    },
    {
     "id": "impl_historico",
     "obrigatorio": true
    },
    {
     "id": "impl_treinamento",
     "obrigatorio": true
    },
    {
     "id": "impl_armazenamento",
     "obrigatorio": true
    },
    {
     "id": "impl_transferencia",
     "obrigatorio": true
    },
    {
     "id": "impl_uso",
     "obrigatorio": true
    },
    {
     "id": "impl_intervencao",
     "obrigatorio": true
    },
    {
     "id": "impl_desativacao",
     "obrigatorio": true
    },
    {
     "id": "impl_descarte",
     "obrigatorio": true
    },
    {
     "id": "risco_metodo",
     "obrigatorio": true
    }
   ],
   "condicao": null
  }
 },
 "normas": {
  "RDC-509-2021": {
   "id": "RDC-509-2021",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 509, de 27 de maio de 2021, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 509"
   ],
   "ano": "",
   "se": null
  },
  "NBR-15943-2011": {
   "id": "NBR-15943-2011",
   "comoCitar": "ABNT NBR 15943:2011 — Diretrizes para um programa de gerenciamento de equipamentos de infraestrutura de serviços de saúde e de equipamentos para a saúde",
   "chaves": [
    "NBR 15943"
   ],
   "ano": "2011",
   "se": null
  },
  "RDC-63-2011": {
   "id": "RDC-63-2011",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 63, de 25 de novembro de 2011, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 63"
   ],
   "ano": "",
   "se": null
  },
  "RDC-36-2013": {
   "id": "RDC-36-2013",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 36, de 25 de julho de 2013, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 36"
   ],
   "ano": "",
   "se": null
  },
  "RDC-222-2018": {
   "id": "RDC-222-2018",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 222, de 28 de março de 2018, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 222"
   ],
   "ano": "",
   "se": null
  },
  "RDC-50-2002": {
   "id": "RDC-50-2002",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 50, de 21 de fevereiro de 2002, da Agência Nacional de Vigilância Sanitária, e suas alterações",
   "chaves": [
    "RDC 50"
   ],
   "ano": "",
   "se": null
  },
  "LEI-6437-1977": {
   "id": "LEI-6437-1977",
   "comoCitar": "Lei nº 6.437, de 20 de agosto de 1977",
   "chaves": [
    "LEI 6437"
   ],
   "ano": "",
   "se": null
  },
  "LEI-8159-1991": {
   "id": "LEI-8159-1991",
   "comoCitar": "Lei nº 8.159, de 8 de janeiro de 1991",
   "chaves": [
    "LEI 8159"
   ],
   "ano": "",
   "se": null
  },
  "NR-32": {
   "id": "NR-32",
   "comoCitar": "Norma Regulamentadora nº 32 (NR-32) — Segurança e Saúde no Trabalho em Serviços de Saúde, do Ministério do Trabalho e Emprego",
   "chaves": [
    "NR 32"
   ],
   "ano": "",
   "se": null
  },
  "RDC-551-2021": {
   "id": "RDC-551-2021",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 551, de 30 de agosto de 2021, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 551"
   ],
   "ano": "",
   "se": null
  },
  "LEI-13709-2018": {
   "id": "LEI-13709-2018",
   "comoCitar": "Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais — LGPD)",
   "chaves": [
    "LEI 13709"
   ],
   "ano": "",
   "se": null
  },
  "LEI-6496-1977": {
   "id": "LEI-6496-1977",
   "comoCitar": "Lei nº 6.496, de 7 de dezembro de 1977 (Anotação de Responsabilidade Técnica)",
   "chaves": [
    "LEI 6496"
   ],
   "ano": "",
   "se": null
  },
  "RES-CONFEA-1137-2023": {
   "id": "RES-CONFEA-1137-2023",
   "comoCitar": "Resolução Confea nº 1.137, de 31 de março de 2023",
   "chaves": [
    "CONFEA 1137"
   ],
   "ano": "",
   "se": null
  },
  "RDC-751-2022": {
   "id": "RDC-751-2022",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 751, de 15 de setembro de 2022, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 751"
   ],
   "ano": "",
   "se": null
  },
  "NBR-IEC-60601-1-2010": {
   "id": "NBR-IEC-60601-1-2010",
   "comoCitar": "ABNT NBR IEC 60601-1 — Equipamento eletromédico — Parte 1: Requisitos gerais para segurança básica e desempenho essencial (edição vigente)",
   "chaves": [
    "IEC 60601-1"
   ],
   "ano": "",
   "se": null
  },
  "LEI-6360-1976": {
   "id": "LEI-6360-1976",
   "comoCitar": "Lei nº 6.360, de 23 de setembro de 1976",
   "chaves": [
    "LEI 6360"
   ],
   "ano": "",
   "se": null
  },
  "LEI-14133-2021": {
   "id": "LEI-14133-2021",
   "comoCitar": "Lei nº 14.133, de 1º de abril de 2021",
   "chaves": [
    "LEI 14133"
   ],
   "ano": "",
   "se": {
    "qualquer": [
     [
      "natureza",
      "publico_direta"
     ]
    ],
    "texto": "só para o público da administração direta, autarquia ou fundação"
   }
  },
  "NBR-IEC-62353-2019": {
   "id": "NBR-IEC-62353-2019",
   "comoCitar": "ABNT NBR IEC 62353:2019 — Equipamento eletromédico — Ensaio recorrente e ensaio após reparo de equipamento eletromédico",
   "chaves": [
    "IEC 62353"
   ],
   "ano": "2019",
   "se": null
  },
  "NBR-13534-2008": {
   "id": "NBR-13534-2008",
   "comoCitar": "ABNT NBR 13534:2008 — Instalações elétricas de baixa tensão — Requisitos específicos para instalação em estabelecimentos assistenciais de saúde",
   "chaves": [
    "NBR 13534"
   ],
   "ano": "2008",
   "se": null
  },
  "RDC-611-2022": {
   "id": "RDC-611-2022",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 611, de 9 de março de 2022, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 611"
   ],
   "ano": "",
   "se": {
    "qualquer": [
     [
      "rec_radiologia",
      "sim"
     ],
     [
      "rec_fonte_radioativa",
      "sim"
     ]
    ],
    "texto": "só quando há radiologia ou fonte radioativa"
   }
  },
  "RDC-67-2009": {
   "id": "RDC-67-2009",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 67, de 21 de dezembro de 2009, da Agência Nacional de Vigilância Sanitária (obrigações do detentor de registro)",
   "chaves": [
    "RDC 67"
   ],
   "ano": "",
   "se": null
  },
  "NBR-ISO-IEC-17025-2017": {
   "id": "NBR-ISO-IEC-17025-2017",
   "comoCitar": "ABNT NBR ISO/IEC 17025:2017 — Requisitos gerais para a competência de laboratórios de ensaio e calibração",
   "chaves": [
    "ISO 17025",
    "IEC 17025"
   ],
   "ano": "2017",
   "se": null
  },
  "LEI-12305-2010": {
   "id": "LEI-12305-2010",
   "comoCitar": "Lei nº 12.305, de 2 de agosto de 2010 (Política Nacional de Resíduos Sólidos)",
   "chaves": [
    "LEI 12305"
   ],
   "ano": "",
   "se": null
  },
  "DEC-10936-2022": {
   "id": "DEC-10936-2022",
   "comoCitar": "Decreto nº 10.936, de 12 de janeiro de 2022",
   "chaves": [
    "DECRETO 10936"
   ],
   "ano": "",
   "se": null
  },
  "NBR-10004-1-2024": {
   "id": "NBR-10004-1-2024",
   "comoCitar": "ABNT NBR 10004-1:2024 — Resíduos sólidos — Classificação",
   "chaves": [
    "NBR 10004-1"
   ],
   "ano": "2024",
   "se": null
  },
  "PRC-MS-5-2017": {
   "id": "PRC-MS-5-2017",
   "comoCitar": "Portaria de Consolidação GM/MS nº 5, de 28 de setembro de 2017, arts. 157 e seguintes (Programa Nacional de Segurança do Paciente; origem: Portaria GM/MS nº 529/2013)",
   "chaves": [],
   "ano": "",
   "se": null
  },
  "RDC-872-2024": {
   "id": "RDC-872-2024",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 872, de 17 de maio de 2024, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 872"
   ],
   "ano": "",
   "se": {
    "qualquer": [
     [
      "rec_sentinela",
      "sim"
     ]
    ],
    "texto": "só para a Rede Sentinela"
   }
  },
  "NR-06": {
   "id": "NR-06",
   "comoCitar": "Norma Regulamentadora nº 6 (NR-6) — Equipamento de Proteção Individual, do Ministério do Trabalho e Emprego",
   "chaves": [
    "NR 6"
   ],
   "ano": "",
   "se": null
  },
  "NR-01": {
   "id": "NR-01",
   "comoCitar": "Norma Regulamentadora nº 1 (NR-1) — Disposições Gerais e Gerenciamento de Riscos Ocupacionais, do Ministério do Trabalho e Emprego",
   "chaves": [
    "NR 1"
   ],
   "ano": "",
   "se": null
  },
  "NR-10": {
   "id": "NR-10",
   "comoCitar": "Norma Regulamentadora nº 10 (NR-10) — Segurança em Instalações e Serviços em Eletricidade, do Ministério do Trabalho e Emprego",
   "chaves": [
    "NR 10"
   ],
   "ano": "",
   "se": null
  },
  "NBR-ISO-14971-2020": {
   "id": "NBR-ISO-14971-2020",
   "comoCitar": "ABNT NBR ISO 14971:2020 — Dispositivos médicos — Aplicação de gerenciamento de risco a dispositivos médicos (referência de método)",
   "chaves": [
    "ISO 14971"
   ],
   "ano": "2020",
   "se": null
  },
  "RDC-15-2012": {
   "id": "RDC-15-2012",
   "comoCitar": "Resolução da Diretoria Colegiada (RDC) nº 15, de 15 de março de 2012, da Agência Nacional de Vigilância Sanitária",
   "chaves": [
    "RDC 15"
   ],
   "ano": "",
   "se": {
    "qualquer": [
     [
      "rec_cme",
      "sim"
     ]
    ],
    "texto": "só quando há CME"
   }
  },
  "NBR-ISO-8528-1-2025": {
   "id": "NBR-ISO-8528-1-2025",
   "comoCitar": "ABNT NBR ISO 8528-1:2025 — Grupos geradores de corrente alternada acionados por motores alternativos de combustão interna — Parte 1: Aplicação, características e desempenho",
   "chaves": [
    "ISO 8528-1"
   ],
   "ano": "2025",
   "se": null
  },
  "NBR-12176-2026": {
   "id": "NBR-12176-2026",
   "comoCitar": "ABNT NBR 12176 — Cilindros de gases — Identificação do conteúdo (edição vigente)",
   "chaves": [
    "NBR 12176"
   ],
   "ano": "",
   "se": null
  },
  "NBR-12188-2016": {
   "id": "NBR-12188-2016",
   "comoCitar": "ABNT NBR 12188:2016 — Sistemas centralizados de suprimento de gases medicinais, de gases para dispositivos médicos e de vácuo para uso em serviços de saúde",
   "chaves": [
    "NBR 12188"
   ],
   "ano": "2016",
   "se": null
  },
  "NBR-5410-2004": {
   "id": "NBR-5410-2004",
   "comoCitar": "ABNT NBR 5410:2004 — Instalações elétricas de baixa tensão",
   "chaves": [
    "NBR 5410"
   ],
   "ano": "2004",
   "se": null
  }
 },
 "edicoesInvalidas": [
  {
   "chave": "NBR 12176",
   "ano": "2010",
   "texto": "ABNT NBR 12176:2010 (substituída pela edição de 2026)"
  },
  {
   "chave": "CONAMA 358",
   "ano": "2005",
   "texto": "CONAMA 358:2005 (situação não confirmada)"
  },
  {
   "chave": "PORTARIA 529",
   "ano": "2013",
   "texto": "PORTARIA 529:2013 (substituída; vale Portaria de Consolidação GM/MS nº 5/2017 (revogada por consolidação no art. 864, XIX))"
  },
  {
   "chave": "CONFEA 1025",
   "ano": "2009",
   "texto": "CONFEA 1025:2009 (substituída; vale Resolução Confea nº 1.137/2023)"
  },
  {
   "chave": "PORTARIA 232",
   "ano": "2012",
   "texto": "PORTARIA 232:2012 (situação não confirmada)"
  },
  {
   "chave": "ISO 7396-1",
   "ano": "2016",
   "texto": "ISO 7396-1:2016 (situação não confirmada)"
  },
  {
   "chave": "NBR 10004",
   "ano": "2004",
   "texto": "NBR 10004:2004 (substituída; vale ABNT NBR 10004-1:2024 e ABNT NBR 10004-2:2024)"
  },
  {
   "chave": "ISO 9001",
   "ano": "2015",
   "texto": "ISO 9001:2015 (substituída; vale ABNT NBR ISO 9001:2026 (publicada em 13/10/2026))"
  },
  {
   "chave": "NBR 14664",
   "ano": "2001",
   "texto": "NBR 14664:2001 (revogada)"
  }
 ],
 "glossario": [
  {
   "termo": "Acessório",
   "definicao": "Item destinado a ser usado com um equipamento para permitir ou ampliar seu uso previsto, sem ser o equipamento principal."
  },
  {
   "termo": "Ação de campo",
   "definicao": "Medida adotada pelo detentor do registro para reduzir o risco de um produto já distribuído, como recolhimento, correção, troca de peça ou comunicado de segurança."
  },
  {
   "termo": "Alerta sanitário",
   "definicao": "Comunicado da autoridade sanitária ou do detentor do registro sobre risco identificado em um produto, que pede verificação e ação do serviço de saúde."
  },
  {
   "termo": "Autoridade sanitária competente",
   "definicao": "Órgão do Sistema Nacional de Vigilância Sanitária (federal, estadual ou municipal) com atribuição legal de regular e fiscalizar o estabelecimento ou o produto."
  },
  {
   "termo": "Calibração",
   "definicao": "Operação que compara, em condições especificadas, a indicação de um equipamento ou instrumento com valores de referência rastreáveis, registrando os desvios e a incerteza."
  },
  {
   "termo": "Código de identificação individual",
   "definicao": "Combinação única de letras e/ou números atribuída a um equipamento para identificá-lo sem ambiguidade durante toda a sua permanência no estabelecimento."
  },
  {
   "termo": "Comissionamento",
   "definicao": "Conjunto de verificações que confirma que a instalação e a infraestrutura necessárias ao funcionamento seguro do equipamento estão prontas e conformes."
  },
  {
   "termo": "Confiabilidade",
   "definicao": "Capacidade de um equipamento cumprir sua função, nas condições previstas, durante um período, sem falhar."
  },
  {
   "termo": "Criticidade",
   "definicao": "Classificação do equipamento conforme a consequência de sua falha para o paciente e para o serviço, usada para priorizar atendimento e manutenção."
  },
  {
   "termo": "Dano",
   "definicao": "Lesão ou prejuízo à saúde de pessoas, ou prejuízo à propriedade ou ao ambiente, decorrente de um evento."
  },
  {
   "termo": "Desativação",
   "definicao": "Retirada definitiva de um equipamento de uso, com laudo que registra o motivo, a data e o responsável."
  },
  {
   "termo": "Descarte",
   "definicao": "Destinação final do equipamento desativado, de suas partes e resíduos, conforme a legislação sanitária e ambiental e o plano de resíduos do estabelecimento."
  },
  {
   "termo": "Detentor de registro",
   "definicao": "Empresa titular da notificação ou do registro do produto na Anvisa, responsável legal por ele no mercado, inclusive por tecnovigilância e ações de campo."
  },
  {
   "termo": "Disponibilidade",
   "definicao": "Proporção do tempo em que o equipamento está apto a ser usado quando requisitado."
  },
  {
   "termo": "Documentos acompanhantes",
   "definicao": "Instruções de uso, manual de serviço, certificados e demais documentos fornecidos com o equipamento."
  },
  {
   "termo": "Educação continuada",
   "definicao": "Processo permanente de atualização dos profissionais, formal e registrado, dentro ou fora do estabelecimento."
  },
  {
   "termo": "Ensaio de aceitação",
   "definicao": "Inspeção e ensaios feitos antes do primeiro uso para confirmar que o equipamento recebido está completo, seguro e funcionando conforme o especificado."
  },
  {
   "termo": "Ensaio após reparo",
   "definicao": "Ensaio de segurança elétrica e funcional realizado depois de manutenção que possa ter afetado a segurança do equipamento eletromédico, antes de devolvê-lo ao uso."
  },
  {
   "termo": "Ensaio recorrente",
   "definicao": "Ensaio de segurança elétrica e funcional repetido em intervalos definidos durante a vida útil do equipamento eletromédico."
  },
  {
   "termo": "Equipamento de proteção coletiva (EPC)",
   "definicao": "Dispositivo instalado no ambiente para proteger simultaneamente várias pessoas, como barreiras, sinalização e sistemas de exaustão."
  },
  {
   "termo": "Equipamento de proteção individual (EPI)",
   "definicao": "Dispositivo de uso pessoal destinado a proteger o trabalhador de riscos à sua segurança e saúde, com certificado de aprovação válido."
  },
  {
   "termo": "Equipamento de apoio",
   "definicao": "Equipamento que dá suporte à atividade assistencial sem atuar diretamente no paciente, como autoclave, refrigerador, balança e banho-maria."
  },
  {
   "termo": "Equipamento de infraestrutura",
   "definicao": "Equipamento ou sistema das instalações elétricas, hidráulicas, fluido-mecânicas, de climatização ou de circulação vertical que sustenta o funcionamento das áreas assistenciais e de apoio."
  },
  {
   "termo": "Equipamento de saúde",
   "definicao": "Conjunto de aparelhos, máquinas, partes e acessórios usados pelo estabelecimento nas ações de diagnóstico, terapia e monitoração; inclui médico-assistenciais, de apoio, de infraestrutura e gerais."
  },
  {
   "termo": "Equipamento médico-assistencial",
   "definicao": "Equipamento de uso médico, odontológico ou laboratorial empregado direta ou indiretamente no diagnóstico, terapia ou monitoração, sem ação farmacológica, imunológica ou metabólica como função principal."
  },
  {
   "termo": "Equipamentos gerais",
   "definicao": "Móveis, utensílios e sistemas de uso geral, não específicos da assistência, como mobiliário, informática de escritório e telefonia; ficam fora do plano."
  },
  {
   "termo": "Estabelecimento de saúde",
   "definicao": "Local destinado a ações e serviços de saúde, de qualquer porte ou complexidade."
  },
  {
   "termo": "Evento adverso",
   "definicao": "Agravo ou dano à saúde de paciente ou usuário associado ao uso de um produto ou à prestação do cuidado; na segurança do paciente, é o incidente que resulta em dano."
  },
  {
   "termo": "Fabricante",
   "definicao": "Pessoa jurídica responsável pelo projeto, fabricação, montagem, rotulagem e colocação do equipamento no mercado, diretamente ou por terceiros."
  },
  {
   "termo": "Falha",
   "definicao": "Perda da capacidade do equipamento de executar a função requerida."
  },
  {
   "termo": "Fornecedor",
   "definicao": "Pessoa física ou jurídica que fabrica, importa, distribui, comercializa ou presta serviços relacionados ao equipamento."
  },
  {
   "termo": "Gerenciamento de risco",
   "definicao": "Aplicação sistemática de políticas, procedimentos e práticas para analisar, avaliar, controlar e monitorar riscos."
  },
  {
   "termo": "Gerenciamento de tecnologias em saúde",
   "definicao": "Conjunto de procedimentos de gestão planejados com base técnica, científica e normativa para garantir rastreabilidade, qualidade, eficácia, efetividade, segurança e desempenho das tecnologias, da entrada ao descarte."
  },
  {
   "termo": "Incidente",
   "definicao": "Evento ou circunstância que poderia ter resultado, ou resultou, em dano desnecessário ao paciente."
  },
  {
   "termo": "Inspeção",
   "definicao": "Verificação visual e funcional, feita por pessoa capacitada, para detectar sinais de dano, desgaste ou mau funcionamento."
  },
  {
   "termo": "Intervenção técnica",
   "definicao": "Qualquer ação técnica no equipamento: inspeção, ensaio, manutenção, ajuste, calibração ou modificação autorizada."
  },
  {
   "termo": "Inventário",
   "definicao": "Relação atualizada dos equipamentos sob gerenciamento, com os dados cadastrais de cada um."
  },
  {
   "termo": "Manutenção corretiva",
   "definicao": "Intervenção feita após a ocorrência de falha para restabelecer a condição de funcionamento do equipamento."
  },
  {
   "termo": "Manutenção preventiva",
   "definicao": "Intervenção programada para reduzir a probabilidade de falha e confirmar a condição segura do equipamento, em periodicidade baseada no fabricante, no risco e no histórico."
  },
  {
   "termo": "Mantenabilidade",
   "definicao": "Facilidade com que um equipamento pode ser mantido ou reparado em tempo e custo adequados."
  },
  {
   "termo": "Não conformidade",
   "definicao": "Não atendimento de um requisito especificado, legal, normativo, contratual ou interno."
  },
  {
   "termo": "Notificação",
   "definicao": "Comunicação formal de evento adverso, queixa técnica ou incidente ao Sistema Nacional de Vigilância Sanitária pelos meios eletrônicos da Anvisa."
  },
  {
   "termo": "Núcleo de Segurança do Paciente (NSP)",
   "definicao": "Instância do serviço de saúde, criada pela direção, responsável pelas ações de segurança do paciente e pela notificação dos eventos adversos."
  },
  {
   "termo": "Operador",
   "definicao": "Profissional que manuseia o equipamento no uso assistencial ou de apoio."
  },
  {
   "termo": "Ordem de serviço",
   "definicao": "Registro que abre, acompanha e encerra uma intervenção técnica, com dados do equipamento, serviço executado, peças, resultados e responsável."
  },
  {
   "termo": "Perigo",
   "definicao": "Fonte potencial de dano."
  },
  {
   "termo": "Plano de gerenciamento",
   "definicao": "Documento que descreve os critérios definidos pelo estabelecimento para executar cada etapa do gerenciamento de suas tecnologias, do planejamento ao descarte."
  },
  {
   "termo": "Queixa técnica",
   "definicao": "Suspeita de alteração, irregularidade ou desvio de qualidade de um produto, com ou sem dano ao paciente."
  },
  {
   "termo": "Rastreabilidade",
   "definicao": "Capacidade de reconstituir o histórico, a aplicação ou a localização de um item a partir de registros feitos previamente."
  },
  {
   "termo": "Rastreabilidade metrológica",
   "definicao": "Propriedade de um resultado de medição de ser relacionado a uma referência por uma cadeia documentada e ininterrupta de calibrações, cada uma com sua incerteza."
  },
  {
   "termo": "Registro histórico",
   "definicao": "Conjunto de informações de um equipamento ao longo de toda a sua permanência: aceitação, localização, intervenções, falhas, eventos, transferências e baixa."
  },
  {
   "termo": "Regularização sanitária",
   "definicao": "Situação do produto notificado ou registrado na Anvisa e da empresa autorizada a exercer a atividade."
  },
  {
   "termo": "Resíduos de serviços de saúde (RSS)",
   "definicao": "Resíduos gerados nas atividades de atenção à saúde, classificados e manejados conforme o plano de gerenciamento de resíduos do estabelecimento."
  },
  {
   "termo": "Risco",
   "definicao": "Combinação da probabilidade de ocorrência de um dano com a gravidade desse dano."
  },
  {
   "termo": "Tecnovigilância",
   "definicao": "Vigilância de eventos adversos e queixas técnicas de produtos para saúde depois da comercialização, para proteger a saúde da população."
  },
  {
   "termo": "Tempo de resposta",
   "definicao": "Intervalo entre a abertura do chamado e o início do atendimento técnico."
  },
  {
   "termo": "Treinamento",
   "definicao": "Capacitação registrada de operadores e técnicos sobre o uso seguro, os cuidados e a manutenção de um equipamento."
  },
  {
   "termo": "Uso impróprio",
   "definicao": "Uso fora das instruções do fabricante ou da finalidade prevista, por erro ou por decisão do usuário."
  },
  {
   "termo": "Verificação",
   "definicao": "Confirmação, por evidência objetiva, de que requisitos especificados foram atendidos."
  },
  {
   "termo": "Vida útil",
   "definicao": "Período em que o equipamento pode ser usado com segurança e desempenho adequados, segundo o fabricante e o histórico de uso."
  }
 ]
};
