/****************************************************
 * NR13 — LAUDO DE INSPEÇÃO DE VASO DE PRESSÃO
 *
 * Escopo: só vasos de pressão (item 13.5 da NR-13, Ministério do
 * Trabalho e Emprego — texto vigente, última retificação 20/10/2022).
 * NÃO cobre caldeiras (13.4), tubulações (13.6) nem tanques metálicos
 * de armazenamento (13.7) — decisão explícita do usuário (AskUserQuestion),
 * escopo focado no que a Metrolabs realmente atende (autoclaves,
 * compressores, centrais de ar comprimido/vácuo e vasos em geral).
 ****************************************************/
const NR13_CFG = Object.freeze({
  APP_TITLE: 'Laudo de Inspeção NR-13 (Vaso de Pressão)',

  TIPOS_VASO: Object.freeze([
    'Autoclave', 'Compressor', 'Central de Ar Comprimido', 'Central de Vácuo',
    'Reservatório', 'Trocador de Calor', 'Outro'
  ]),

  TIPOS_INSPECAO: Object.freeze(['Inicial', 'Periódica', 'Extraordinária']),

  /**
   * Unidades de pressão aceitas pro PMTA — o técnico digita o valor
   * exatamente como está na plaqueta do fabricante (a maioria das
   * plaquetas de autoclave/vaso no Brasil vem em bar ou kgf/cm², não em
   * MPa) e escolhe a unidade; o sistema converte pra MPa (unidade
   * canônica da NR-13) sozinho, mostrando a conversão. Fatores oficiais
   * de conversão: 1 bar = 0,1 MPa; 1 kgf/cm² = 0,0980665 MPa (aceito
   * pelo INMETRO/SI).
   */
  UNIDADES_PRESSAO: Object.freeze({
    MPa: 1,
    bar: 0.1,
    'kgf/cm²': 0.0980665
  }),

  /** Unidades de volume aceitas — litros é mais comum em plaqueta de vaso pequeno/autoclave; m³ é a unidade canônica da NR-13. */
  UNIDADES_VOLUME: Object.freeze({
    'm³': 1,
    L: 0.001
  }),

  CLASSES_FLUIDO: Object.freeze([
    { valor: 'A', label: 'A — Inflamáveis, combustíveis ≥200°C, tóxicos ≤20ppm, hidrogênio, acetileno' },
    { valor: 'B', label: 'B — Combustíveis <200°C, tóxicos >20ppm' },
    { valor: 'C', label: 'C — Vapor d\'água, gases asfixiantes simples, ar comprimido' },
    { valor: 'D', label: 'D — Outros fluidos' }
  ]),

  VEREDITOS: Object.freeze({
    APROVADO: 'APROVADO',
    APROVADO_COM_RESSALVAS: 'APROVADO_COM_RESSALVAS',
    REPROVADO: 'REPROVADO'
  }),

  STATUS: Object.freeze({ RASCUNHO: 'RASCUNHO', EMITIDO: 'EMITIDO' }),

  /**
   * Tabela 1 da NR-13 — Categorização de vasos de pressão (Classe do
   * Fluido × Grupo de Potencial de Risco). Texto oficial extraído do PDF
   * do MTE (item 13.5.1.1), retificado em 20/10/2022. NUNCA alterar sem
   * conferir contra o texto oficial vigente.
   */
  TABELA_CATEGORIA: Object.freeze({
    A: Object.freeze(['I', 'I', 'II', 'III', 'III']),
    B: Object.freeze(['I', 'II', 'III', 'IV', 'IV']),
    C: Object.freeze(['I', 'II', 'III', 'IV', 'V']),
    D: Object.freeze(['II', 'III', 'IV', 'V', 'V'])
  }),

  /**
   * Tabela 2 da NR-13 — prazos máximos de inspeção periódica (item
   * 13.5.4.5), estabelecimento SEM SPIE (caso padrão dos clientes da
   * Metrolabs — Sistema Próprio de Inspeção de Equipamentos é uma
   * certificação avançada que a esmagadora maioria dos hospitais/
   * indústrias atendidos não possui). Valores em anos.
   */
  TABELA_PERIODICIDADE: Object.freeze({
    I: Object.freeze({ externo: 1, interno: 3 }),
    II: Object.freeze({ externo: 2, interno: 4 }),
    III: Object.freeze({ externo: 3, interno: 6 }),
    IV: Object.freeze({ externo: 4, interno: 8 }),
    V: Object.freeze({ externo: 5, interno: 10 })
  }),

  NORMA_REFERENCIA: 'NR-13 — Inspeção de Caldeira, Laudo de Vaso sob Pressão, Inspeção de Tanques de Armazenamento ' +
    '(Ministério do Trabalho e Emprego, redação dada pela Portaria MTP nº 4.219/2022, com retificação de 20/10/2022).',

  /**
   * Teste Hidrostático (TH) — a pressão de teste usual é 1,5x a PMTA
   * (prática consagrada em ensaios de vasos de pressão; alguns códigos de
   * construção ou reparos aceitam entre 1,25x e 1,3x — por isso é só uma
   * SUGESTÃO inicial no formulário, sempre editável pelo técnico
   * conforme o código de construção do vaso).
   */
  TH_FATOR_PRESSAO_TESTE_SUGERIDO: 1.5,

  RESULTADOS_ITEM: Object.freeze(['Aprovado', 'Reprovado'])
});
