/****************************************************
 * ESTERILIZAÇÃO A BAIXA TEMPERATURA — CONFIGURAÇÃO (21/10/2026)
 *
 * Qualificação (QI/QO/QD) de esterilizadores a baixa temperatura:
 *   PEROXIDO    — peróxido de hidrogênio vaporizado (com ou sem fase de plasma)
 *   FORMALDEIDO — vapor a baixa temperatura com formaldeído (VBTF)
 *
 * Regra de ouro deste módulo: nenhum valor de norma foi inventado. Os limites
 * de aceitação vêm da especificação do ciclo declarada pelo fabricante do
 * equipamento (digitada no ensaio) ou de parâmetros internos marcados como
 * "a confirmar pelo responsável técnico". Cada critério traz a fonte, e a
 * lista de normas traz o que ainda precisa ser confirmado pelo dono.
 * Alterar critério: editar este arquivo (revisão do responsável técnico) e
 * atualizar a ajuda (SGO_Ajuda_BaixaTemp.js) e o manual no mesmo commit.
 *
 * Arquivos do módulo: SGO_BaixaTemp_{Config,Parser,Motor,IA,Documento,Main,Tela}.js,
 * JS_BaixaTemp.html, SGO_Ajuda_BaixaTemp.js e o componente comum
 * SGO_QualIA_Verificador.js (conferência do texto da IA).
 ****************************************************/

var BAIXATEMP_CFG = {
  VERSAO: '1.0',
  APP_TITULO: 'Esterilização a baixa temperatura',
  TZ: 'America/Sao_Paulo',
  ABA_ENSAIOS: 'BT_ENSAIOS',
  ABA_HISTORICO: 'BT_HISTORICO',
  PASTA_LAUDOS: 'Baixa Temperatura - Laudos',
  PASTA_LAUDOS_PROP: 'BAIXATEMP_LAUDOS_FOLDER_ID',
  PASTA_UPLOADS: 'Baixa Temperatura - Planilhas enviadas',
  PASTA_UPLOADS_PROP: 'BAIXATEMP_UPLOAD_PASTA_ID',
  PASTA_DADOS: 'Baixa Temperatura - Ensaios (dados)',
  PASTA_DADOS_PROP: 'BAIXATEMP_DADOS_PASTA_ID',
  NUMERO_PROP_PREFIXO: 'BAIXATEMP_NUMERO_',
  SIGLA_NUMERO: 'QBT',
  // 21/10/2026: categoria da NBR 15943 do Arquivo de documentos, a mesma dos outros relatórios de qualificação (antes saía como
  // "categoria antiga" na edição do documento). Documentos já registrados com o nome antigo continuam reconhecidos.
  TIPO_DOCUMENTO_ARQUIVO: '3. RELATÓRIOS DE QUALIFICAÇÃO',
  VALIDADE_DOCUMENTO_MESES: 12,           // vencimento no Arquivo de documentos: requalificação anual (prática do laboratório; confirmar com o RT)

  /* Perfis */
  PERFIS_EQUIPE: ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'],
  PERFIS_CONSULTA: ['COMERCIAL', 'FINANCEIRO'],
  PERFIS_APROVADORES: ['ADMIN', 'DIRETORIA', 'GESTOR'],
  EXIGIR_APROVADOR_DIFERENTE: true,       // quem elaborou não aprova o próprio ensaio

  /* Leitura dos arquivos */
  LEITURA: {
    MAX_LINHAS: 50000,
    MAX_ARQUIVOS_POR_CICLO: 24,
    PREVIA_LINHAS: 15,
    INTERVALO_MIN_S: 1,
    INTERVALO_MAX_S: 600,
    LACUNA_FATOR_AVISO: 3,                // lacuna maior que 3 vezes o intervalo típico: aviso
    LACUNA_MAX_FRACAO: 0.05,              // mais de 5 % do tempo em lacunas: trava
    TOLERANCIA_ALINHAMENTO_FRACAO: 0.5,   // arquivos por sensor: leitura casada até meio intervalo de distância
    TEMPERATURA_MIN_C: -20,
    TEMPERATURA_MAX_C: 150
  },

  /*
   * Regra de decisão (aplicada pelo motor; o texto aparece no documento).
   * SIMPLES: compara a leitura com o limite (a incerteza é declarada, não reduz o limite).
   * BANDA_GUARDA: o limite é reduzido pela incerteza expandida do instrumento.
   * Fonte: decisão do responsável técnico do laboratório (registrar no plano de validação).
   */
  REGRA_DECISAO: 'SIMPLES',

  /* Ciclos de QD aprovados exigidos (prática usual de validação: três ciclos consecutivos; confirmar com o RT e com o plano do cliente). */
  CICLOS_QD_MINIMOS: 3,
  CICLOS_QO_MINIMOS: 1,

  /* Fontes citadas nos critérios (texto exibido no documento) */
  FONTES: {
    FABRICANTE_CICLO: 'Especificação do ciclo declarada pelo fabricante do equipamento (programa e tolerâncias informados no ensaio)',
    FABRICANTE_INDICADOR: 'Instruções de uso do fabricante do indicador',
    PLANO_VALIDACAO: 'Plano de validação acordado com o cliente e aprovado pelo responsável técnico',
    CRITERIO_INTERNO: 'Critério interno do laboratório, aprovado pelo responsável técnico',
    CHECKLIST: 'Lista de verificação do laboratório baseada nos requisitos de instalação e operação do fabricante'
  },

  /*
   * Normas e documentos de referência. confirmada=false: o número, a edição ou o título
   * precisam ser confirmados pelo dono antes de valer como referência firme.
   * usarNoDocumento=false: não sai no documento até a confirmação.
   * A IA só pode citar as normas com usarNoDocumento=true do tipo do ensaio.
   */
  NORMAS: [
    { id: 'RDC15', codigo: 'RDC ANVISA nº 15/2012', titulo: 'Resolução da Diretoria Colegiada nº 15, de 15 de março de 2012 — requisitos de boas práticas para o processamento de produtos para saúde', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: true, usarNoDocumento: true },
    { id: 'ISO14937', codigo: 'ISO 14937:2009', titulo: 'Esterilização de produtos para saúde — Requisitos gerais para caracterização de um agente esterilizante e para o desenvolvimento, validação e controle de rotina de um processo de esterilização de produtos para saúde', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: true, usarNoDocumento: true, observacao: 'Confirmar se existe edição ABNT NBR ISO 14937 vigente e qual adotar.' },
    { id: 'ISO22441', codigo: 'ISO 22441:2022', titulo: 'Esterilização de produtos para saúde — Peróxido de hidrogênio vaporizado a baixa temperatura — Requisitos para o desenvolvimento, validação e controle de rotina de um processo de esterilização de produtos para saúde', tipos: ['PEROXIDO'], confirmada: false, usarNoDocumento: true, observacao: 'Título traduzido; confirmar edição e se há versão ABNT.' },
    { id: 'ISO25424', codigo: 'ISO 25424:2018', titulo: 'Esterilização de produtos para saúde — Vapor a baixa temperatura e formaldeído — Requisitos para o desenvolvimento, validação e controle de rotina de um processo de esterilização de produtos para saúde', tipos: ['FORMALDEIDO'], confirmada: false, usarNoDocumento: true, observacao: 'Título traduzido; confirmar edição vigente (houve emenda) e se há versão ABNT.' },
    { id: 'EN14180', codigo: 'EN 14180:2014', titulo: 'Esterilizadores para uso médico — Esterilizadores a vapor a baixa temperatura e formaldeído — Requisitos e ensaios', tipos: ['FORMALDEIDO'], confirmada: false, usarNoDocumento: true, observacao: 'Norma europeia de equipamento; confirmar edição.' },
    { id: 'ISO11140_1', codigo: 'ISO 11140-1:2014', titulo: 'Esterilização de produtos para saúde — Indicadores químicos — Parte 1: Requisitos gerais', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: true, usarNoDocumento: true, observacao: 'Confirmar edição ABNT NBR ISO 11140-1 equivalente.' },
    { id: 'ISO11138_1', codigo: 'ISO 11138-1:2017', titulo: 'Esterilização de produtos para saúde — Indicadores biológicos — Parte 1: Requisitos gerais', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: true, usarNoDocumento: true, observacao: 'Confirmar edição ABNT NBR ISO 11138-1 equivalente.' },
    { id: 'ISO11138_5', codigo: 'ISO 11138-5:2017', titulo: 'Esterilização de produtos para saúde — Indicadores biológicos — Parte 5: Indicadores biológicos para processos de esterilização a vapor a baixa temperatura e formaldeído', tipos: ['FORMALDEIDO'], confirmada: false, usarNoDocumento: true, observacao: 'Título traduzido; confirmar edição.' },
    { id: 'GUM', codigo: 'JCGM 100:2008', titulo: 'Avaliação de dados de medição — Guia para a expressão de incerteza de medição (GUM)', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: true, usarNoDocumento: true },
    { id: 'BI_PEROXIDO', codigo: 'ISO 11138 (parte para peróxido de hidrogênio)', titulo: 'Indicadores biológicos para processos com peróxido de hidrogênio vaporizado — parte específica da série ISO 11138', tipos: ['PEROXIDO'], confirmada: false, usarNoDocumento: false, observacao: 'Confirmar o número da parte e a edição antes de citar.' },
    { id: 'EQUIP_PEROXIDO', codigo: 'Norma de equipamento para esterilizadores a peróxido de hidrogênio', titulo: 'Requisitos e ensaios de esterilizadores a peróxido de hidrogênio vaporizado (norma europeia de equipamento)', tipos: ['PEROXIDO'], confirmada: false, usarNoDocumento: false, observacao: 'Confirmar número, edição e aplicabilidade antes de citar.' },
    { id: 'ABNT_EQUIV', codigo: 'Normas ABNT equivalentes', titulo: 'Adoções ABNT NBR ISO das normas acima', tipos: ['PEROXIDO', 'FORMALDEIDO'], confirmada: false, usarNoDocumento: false, observacao: 'Levantar quais adoções ABNT existem e substituir as referências ISO pelas ABNT vigentes quando aplicável.' }
  ],

  /* Tipos de processo */
  TIPOS: {
    PEROXIDO: {
      codigo: 'PEROXIDO',
      rotulo: 'Peróxido de hidrogênio',
      rotuloLongo: 'Esterilizador a peróxido de hidrogênio vaporizado (com ou sem fase de plasma)',
      rotuloFrase: 'esterilizador a peróxido de hidrogênio vaporizado (com ou sem fase de plasma)',
      rotuloCurto: 'Peróxido de hidrogênio',
      agente: 'peróxido de hidrogênio vaporizado',
      janelaAuto: 'PULSOS',                 // janela de exposição proposta pelos pulsos de pressão
      fases: ['Preparação e vácuo', 'Injeção e difusão do agente (exposição)', 'Fase final (plasma, ventilação ou aeração)'],
      deteccao: { elevacaoMinimaPulsoMbar: 3 },   // parâmetro de detecção, não é critério de aceitação
      microrganismoSugerido: 'Geobacillus stearothermophilus',
      checklistQI: [
        ['QI_LOCAL', 'Local de instalação, espaço de serviço e ventilação conforme o manual do fabricante'],
        ['QI_ELETRICA', 'Alimentação elétrica (tensão, frequência, aterramento e proteção) conforme o fabricante'],
        ['QI_IDENT', 'Identificação do equipamento (TAG, número de série) conferida com o cadastro'],
        ['QI_DOC', 'Manual de operação, registros de manutenção e certificados disponíveis'],
        ['QI_INSUMO', 'Insumo do agente esterilizante dentro da validade e armazenado conforme o fabricante'],
        ['QI_REGISTRO', 'Registro do ciclo (impressão ou arquivo) funcionando e com data e hora corretas'],
        ['QI_EPI', 'Orientações de segurança ao operador e meios de proteção disponíveis']
      ],
      checklistQO: [
        ['QO_PORTA', 'Intertravamento da porta: o ciclo não inicia com a porta aberta'],
        ['QO_ALARME', 'Alarmes de falha de ciclo exibidos e registrados'],
        ['QO_CANCELAR', 'Cancelamento de ciclo: o equipamento conclui a fase segura antes de liberar a porta'],
        ['QO_PROGRAMAS', 'Programas disponíveis conferidos com a especificação do fabricante']
      ]
    },
    FORMALDEIDO: {
      codigo: 'FORMALDEIDO',
      rotulo: 'Vapor a baixa temperatura com formaldeído (VBTF)',
      rotuloLongo: 'Esterilizador a vapor a baixa temperatura com formaldeído (VBTF)',
      rotuloFrase: 'esterilizador a vapor a baixa temperatura com formaldeído (VBTF)',
      rotuloCurto: 'VBTF',
      agente: 'vapor a baixa temperatura com formaldeído',
      janelaAuto: 'TEMPERATURA',            // janela proposta pelo patamar de temperatura
      fases: ['Remoção de ar e aquecimento', 'Exposição (pulsos de vapor e formaldeído)', 'Dessorção e secagem'],
      deteccao: { elevacaoMinimaPulsoMbar: 20 },
      microrganismoSugerido: 'Geobacillus stearothermophilus',
      checklistQI: [
        ['QI_LOCAL', 'Local de instalação, espaço de serviço e exaustão conforme o manual do fabricante'],
        ['QI_ELETRICA', 'Alimentação elétrica (tensão, frequência, aterramento e proteção) conforme o fabricante'],
        ['QI_AGUA', 'Água de alimentação e drenagem conforme a especificação do fabricante'],
        ['QI_IDENT', 'Identificação do equipamento (TAG, número de série) conferida com o cadastro'],
        ['QI_DOC', 'Manual de operação, registros de manutenção e certificados disponíveis'],
        ['QI_INSUMO', 'Solução de formaldeído dentro da validade e armazenada conforme o fabricante'],
        ['QI_REGISTRO', 'Registro do ciclo (impressão ou arquivo) funcionando e com data e hora corretas']
      ],
      checklistQO: [
        ['QO_PORTA', 'Intertravamento da porta: o ciclo não inicia com a porta aberta'],
        ['QO_ALARME', 'Alarmes de falha de ciclo exibidos e registrados'],
        ['QO_CANCELAR', 'Cancelamento de ciclo: o equipamento conclui a dessorção antes de liberar a porta'],
        ['QO_PROGRAMAS', 'Programas disponíveis conferidos com a especificação do fabricante']
      ]
    }
  },

  /*
   * Critérios avaliados pelo motor. etapas: onde valem. exigeParametro: campo do ciclo
   * programado sem o qual o critério não pode ser avaliado (trava a emissão).
   * opcional=true: sem o parâmetro, o resultado sai como informativo.
   */
  CRITERIOS: [
    { codigo: 'C01', chave: 'TEMP_CARGA', titulo: 'Temperatura na carga durante a exposição', etapas: ['QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['temperaturaProgramada', 'tolInf', 'tolSup'] },
    { codigo: 'C02', chave: 'TEMP_CAMARA', titulo: 'Temperatura da câmara durante a exposição', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['temperaturaProgramada', 'tolInf', 'tolSup'] },
    { codigo: 'C03', chave: 'UNIFORMIDADE', titulo: 'Uniformidade entre sensores (maior diferença no mesmo instante)', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['uniformidadeMax'], opcional: true },
    { codigo: 'C04', chave: 'TEMPO_EXPOSICAO', titulo: 'Tempo de exposição', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['tempoExposicaoMin'] },
    { codigo: 'C05', chave: 'PULSOS', titulo: 'Número de pulsos de injeção do agente', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['pulsosProgramados'], opcional: true },
    { codigo: 'C06', chave: 'VACUO', titulo: 'Pressão mínima atingida no vácuo', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['pressaoVacuoMbar'], opcional: true },
    { codigo: 'C07', chave: 'IQ', titulo: 'Indicadores químicos', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_INDICADOR' },
    { codigo: 'C08', chave: 'IB', titulo: 'Indicadores biológicos', etapas: ['QD'], fonte: 'FABRICANTE_INDICADOR' },
    { codigo: 'C09', chave: 'CONCENTRACAO', titulo: 'Concentração ou umidade registrada durante a exposição', etapas: ['QO', 'QD'], fonte: 'FABRICANTE_CICLO', exigeParametro: ['concentracaoMin'], opcional: true },
    { codigo: 'C10', chave: 'ESTANQUEIDADE', titulo: 'Estanqueidade da câmara (elevação de pressão em vácuo)', etapas: ['QO'], fonte: 'FABRICANTE_CICLO' },
    { codigo: 'C11', chave: 'QI_CHECKLIST', titulo: 'Verificações de instalação', etapas: ['QI'], fonte: 'CHECKLIST' },
    { codigo: 'C12', chave: 'QO_CHECKLIST', titulo: 'Verificações funcionais (intertravamentos e alarmes)', etapas: ['QO'], fonte: 'CHECKLIST' },
    { codigo: 'C13', chave: 'CICLOS_QD', titulo: 'Ciclos de desempenho aprovados', etapas: ['QD'], fonte: 'PLANO_VALIDACAO' }
  ],

  /* Exigências de evidência por etapa (sem elas a emissão trava) */
  EXIGE_IB_NO_QD: true,       // fonte: PLANO_VALIDACAO
  EXIGE_IQ_NO_QD: true,       // fonte: PLANO_VALIDACAO
  EXIGE_CONTROLE_POSITIVO: true,

  /* IA */
  IA: { TOKENS: 32768, TEMPERATURA: 0.2, TENTATIVAS: 2 }
};

/** Normas do tipo que podem ser citadas no documento e pela IA. */
function BaixaTemp_normasDoTipo_(tipo, todas) {
  return BAIXATEMP_CFG.NORMAS.filter(function (n) {
    return n.tipos.indexOf(tipo) >= 0 && (todas || n.usarNoDocumento);
  });
}

/** Normas que o dono ainda precisa confirmar (todas as do tipo, ou de todos os tipos). */
function BaixaTemp_normasAConfirmar_(tipo) {
  return BAIXATEMP_CFG.NORMAS.filter(function (n) {
    return !n.confirmada && (!tipo || n.tipos.indexOf(tipo) >= 0);
  });
}

function BaixaTemp_tipoCfg_(tipo) {
  var t = BAIXATEMP_CFG.TIPOS[String(tipo || '').toUpperCase()];
  if (!t) throw new Error('Tipo de processo não reconhecido: "' + tipo + '". Escolha "Peróxido de hidrogênio" ou "Vapor a baixa temperatura com formaldeído" em 1. Identificação e salve de novo.');
  return t;
}
