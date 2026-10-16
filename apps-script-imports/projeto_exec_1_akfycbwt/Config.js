/****************************************************
 * METROLABS — RELATÓRIO AUTOCLAVE
 * ARQUIVO: Config.gs
 * FUNÇÃO:
 * Configurações globais do módulo de geração
 * de relatório DOC + PDF a partir de template.
 ****************************************************/

const CONFIG = {
  APP_NAME: 'Autoclave',
  APP_SUBTITLE: 'Relatório de qualificação térmica de autoclaves a partir do modelo oficial.',
  TEMPLATE_ID: '10yOcEVhCXO3lsmCIBHeF8yY_gVdpzVzxuSD9jZPdM04',
  OUTPUT_FOLDER_ID: '1FiWs9EmnnOBnFNqmXYF2oF-8flfRDgiQ',
  LOGO_ID: '1WuoymOh5_0S2X3jC2otSq89HMltdDEoP',

  STATUS_VALIDOS: ['APROVADO', 'REPROVADO'],

  PLACEHOLDERS: {
    numero: '{{NUMERO_RELATORIO}}',
    data: '{{DATA_CICLO}}',
    cliente: '{{CLIENTE}}',
    unidade: '{{UNIDADE_LOCAL}}',
    equipamento: '{{EQUIPAMENTO}}',
    marcaModelo: '{{MARCA_MODELO}}',
    numeroSerie: '{{NUMERO_SERIE}}',
    tag: '{{TAG}}',
    status: '{{APROVADO}}'
  },

  NOME_ARQUIVO: function(dados) {
    const partes = [
      'RELATORIO',
      'AUTOCLAVE',
      sanitizarNomeArquivo_(dados.numero),
      sanitizarNomeArquivo_(dados.cliente),
      sanitizarNomeArquivo_(dados.data)
    ].filter(Boolean);

    return partes.join('_');
  }
};
