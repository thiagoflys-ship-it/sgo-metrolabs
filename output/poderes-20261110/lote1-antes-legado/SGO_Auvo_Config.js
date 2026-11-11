/****************************************************
 * SGO_Auvo_Config.js
 * INTEGRAÇÃO AUVO — CONFIGURAÇÃO
 *
 * Sincronização SGO -> Auvo (mão única, SGO é a fonte da verdade).
 * Credenciais (AUVO_API_KEY / AUVO_API_TOKEN) ficam em Script Properties,
 * mesmo padrão de GEMINI_API_KEY — geradas em Menu > Integração na conta
 * Auvo, inseridas manualmente no editor do Apps Script.
 ****************************************************/
var AUVO_CFG = {
  BASE_URL: 'https://api.auvo.com.br/v2',

  ENDPOINTS: {
    LOGIN: '/login',
    CUSTOMERS: '/customers',
    USERS: '/users',
    TASKS: '/tasks',
    EQUIPMENTS: '/equipments'
  },

  // Tamanho de página máximo aceito pelo Auvo em listagens (documentado
  // na collection do usuário: "Maximum page size is 100").
  PAGE_SIZE_MAX: 100,

  // Valores possíveis de ORIGEM em CAD_CLIENTES/CAD_UNIDADES/CAD_EQUIPAMENTOS,
  // usados pela sincronização reversa (Auvo -> Portal) pra rastreabilidade.
  ORIGEM: {
    MANUAL: 'MANUAL',
    AUVO: 'AUVO'
  },

  // Token real dura ~30min sem refresh token; guardamos com margem de
  // segurança pra nunca usar um token que o Auvo já considera expirado.
  TOKEN_TTL_SEGUNDOS: 1700,

  MAX_TENTATIVAS: 3,
  DELAYS_MS: [800, 1600],

  STATUS: {
    OK: 'OK',
    ERRO: 'ERRO',
    PENDENTE: 'PENDENTE'
  },

  // Quais perfis de CAD_USUARIOS representam "técnico" pro Auvo — a
  // tabela CAD_TECNICOS é órfã (sobra do módulo de OS removido) e a
  // maioria dos registros não tem vínculo de usuário real, então a
  // sincronização usa CAD_USUARIOS como fonte.
  PERFIS_TECNICOS: ['TECNICO', 'GESTOR', 'ADMIN', 'METROLOGIA'],

  APP_TITLE: 'Integração Auvo'
};
