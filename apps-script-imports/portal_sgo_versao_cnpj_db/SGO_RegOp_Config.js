/****************************************************
 * REGISTROS OPERACIONAIS — módulo nativo do Portal SGO+ CNPJ/DB
 * (2026-08-15)
 *
 * Complementa o módulo PGT e POP: lá se gera a POLÍTICA (o PGTS e os
 * POPs, o que deve ser feito e como); aqui se registra a EXECUÇÃO —
 * a evidência de que o colaborador de campo realmente fez a ronda, o
 * treinamento, a conferência de inventário etc. (RDC 509/2021, Art. 8º
 * — registros sistemáticos de execução de toda atividade).
 *
 * Catálogo de POPs é reaproveitado direto de PGTPOP_CFG.CATALOGO_POPS
 * (mesmo projeto Apps Script) — este módulo não mantém cópia própria.
 ****************************************************/
const REGOP_CFG = {
  APP: {
    NOME: "METROLABS • Registros Operacionais",
    VERSAO: "1.0"
  },

  EMPRESA: {
    NOME: "Metrolabs Soluções em Engenharia Clínica"
  },

  LOGO_ID: "1WuoymOh5_0S2X3jC2otSq89HMltdDEoP",

  BASE_NORMATIVA: "Conforme RDC nº 509 de 2021 e ABNT NBR 15943:2011",

  DRIVE: {
    PASTA_RAIZ: "METROLABS_REGOP_SISTEMA",
    PASTA_PDFS: "PDFS_GERADOS"
  },

  PLANILHA: {
    NOME: "METROLABS_REGOP_DB",
    ABAS: {
      CONFIG: "CFG_SISTEMA",
      TIPOS_DOCUMENTO: "MOD_TIPOS_DOCUMENTO",
      REGISTROS: "MOV_REGISTROS",
      DOCUMENTOS: "MOV_DOCUMENTOS"
    }
  },

  /* Tipos de campo suportados num Tipo de Documento (v2, 2026-08-15 —
   * generalização de "checklist" pra "tipo de documento livre", ver
   * [[project_registros_operacionais_modulo]]). */
  TIPOS_CAMPO: Object.freeze({
    SIM_NAO_NA: 'sim_nao_na',
    TEXTO: 'texto',
    NUMERO: 'numero',
    DATA: 'data'
  })
};
