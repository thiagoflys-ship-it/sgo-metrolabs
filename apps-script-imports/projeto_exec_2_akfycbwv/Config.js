/****************************************************
 * METROLABS — GERADOR DE RELATÓRIOS
 * ARQUIVO: Config.gs
 * ESCOPO:
 * - Lavadora Ultrassônica
 * - Termodesinfectora
 ****************************************************/

const CONFIG = {
  APP_NAME: 'METROLABS - SISTEMA LAVADORAS',
  APP_SUBTITLE: 'Suíte técnica para lavadora ultrassônica, termodesinfectora, rastreabilidade e emissão documental.',
  LOGO_ID: '1WuoymOh5_0S2X3jC2otSq89HMltdDEoP',

  MODULOS: {
    LAVADORA: {
      chave: 'LAVADORA',
      nome: 'Lavadora Ultrassônica',
      templateId: '1tMsIsW5Ng6Mz0KSC5s8ujYyWHi1tWqaio13RHbdSctc',
      outputFolderId: '1BOKYbVvsuvZYxw56pK-xoi21BG5oOycE',
      statusValidos: ['APROVADO', 'REPROVADO'],
      placeholders: {
        numeroRelatorio: '{{NUMERO_RELATORIO}}',
        cliente: '{{CLIENTE}}',
        equipamento: '{{EQUIPAMENTO}}',
        tag: '{{TAG}}',
        identificacao: '{{IDENTIFICACAO}}',
        tipoEnsaio: '{{TIPO_ENSAIO}}',
        perfil: '{{PERFIL}}',
        cnpj: '{{CNPJ}}',
        setorLocal: '{{SETOR_LOCAL}}',
        observacoes: '{{OBSERVACOES}}',
        dataCiclo: '{{DATA_CICLO}}'
      },
      campos: [
        'numeroRelatorio',
        'cliente',
        'equipamento',
        'tag',
        'identificacao',
        'tipoEnsaio',
        'perfil',
        'cnpj',
        'setorLocal',
        'observacoes',
        'dataCiclo'
      ],
      nomeArquivo: function(dados) {
        return [
          'RELATORIO',
          'LAVADORA_ULTRASSONICA',
          sanitizarNomeArquivo_(dados.numeroRelatorio),
          sanitizarNomeArquivo_(dados.cliente),
          sanitizarNomeArquivo_(dados.dataCiclo)
        ].filter(Boolean).join('_');
      }
    },

    TERMODESINFECTORA: {
      chave: 'TERMODESINFECTORA',
      nome: 'Termodesinfectora',
      templateId: '1nnUGRulKtf9C_rgp_4dnws43YXG5pTg4QOKIBH1wNds',
      outputFolderId: '18NFqpFosi7mHOwvNxX4grfSM5SDlL9kL',
      statusValidos: ['APROVADO', 'REPROVADO'],
      placeholders: {
        numeroRelatorio: '{{NUMERO_RELATORIO}}',
        dataCiclo: '{{DATA_CICLO}}',
        cliente: '{{CLIENTE}}',
        cnpjCliente: '{{CNPJ_CLIENTE}}',
        tag: '{{TAG}}',
        marca: '{{MARCA}}',
        modelo: '{{MODELO}}',
        ns: '{{NS}}',
        localizacao: '{{LOCALIZACAO}}',
        statusFinal: '{{STATUS_FINAL}}'
      },
      campos: [
        'numeroRelatorio',
        'dataCiclo',
        'cliente',
        'cnpjCliente',
        'tag',
        'marca',
        'modelo',
        'ns',
        'localizacao',
        'statusFinal'
      ],
      nomeArquivo: function(dados) {
        return [
          'RELATORIO',
          'TERMODESINFECTORA',
          sanitizarNomeArquivo_(dados.numeroRelatorio),
          sanitizarNomeArquivo_(dados.cliente),
          sanitizarNomeArquivo_(dados.dataCiclo)
        ].filter(Boolean).join('_');
      }
    }
  }
}
