/****************************************************
 * COMPRAS NA CENTRAL DE PENDÊNCIAS E NA CAIXA DE DECISÕES (21/10/2026)
 *
 * Os arquivos da central (SGO_Alertas_Central.js) e da Caixa de decisões (SGO_Gestao_*.js) são de outra equipe,
 * que está aplicando a matriz de avisos. Para não mexer neles, Compras se registra por aqui: acrescenta os próprios
 * tipos de pendência (PEND_TIPOS), a fonte (PEND_FONTES -> Compras_fontePendencias_, SGO_Compras_Painel.js), o
 * módulo e a área padrão (Compras na Logística, configurável em Regras de compras) e os tipos que são decisão da
 * gestão (GES_TIPOS). Nada é trocado: só acrescenta o que ainda não existe.
 *
 * O nome do arquivo vem depois de SGO_Alertas_Central.js e de SGO_Gestao_*.js na ordem de carga (servidor e Apps
 * Script carregam em ordem alfabética), então as listas já existem aqui. A fonte de Compras chama o registro de novo
 * (Compras_registrarTipos_) antes de montar os itens, por segurança.
 *
 * Nenhum item leva valor em reais (princípio 7 da matriz). A decisão é sempre tomada na tela de Compras; a Caixa
 * mostra, cobra pela escada e leva até lá (mesmo modelo do desconto do Comercial).
 ****************************************************/

var CMP_PEND_TELA = function (mod, id) { return { tipo: 'compras', mod: mod, id: id || '' }; };

var CMP_PEND_TIPOS = {
  compras_espec: { modulo: 'compras', um: 'pedido de compra com especificação incompleta', varios: 'pedidos de compra com especificação incompleta', rotulo: 'Completar', fazer: 'complete a especificação em Compras > Meus pedidos de compra', tela: CMP_PEND_TELA('compras_meus'), origem: 'COMPRAS' },
  compras_aprovar: { modulo: 'compras', um: 'compra aguardando aprovação', varios: 'compras aguardando aprovação', rotulo: 'Aprovar compra', fazer: 'aprove ou reprove na ficha da compra (Compras > Fila de compras)', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_aprovar_comprador: { modulo: 'compras', um: 'compra aguardando a aprovação do comprador', varios: 'compras aguardando a aprovação do comprador', rotulo: 'Aprovar compra', fazer: 'aprove ou reprove na ficha da compra (Compras > Fila de compras)', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_parado: { modulo: 'compras', um: 'compra parada (sem pedido ou com entrega atrasada)', varios: 'compras paradas (sem pedido ou com entrega atrasada)', rotulo: 'Compra parada', fazer: 'faça o pedido ou cobre o fornecedor em Compras > Fila de compras', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_parado_gestao: { modulo: 'compras', um: 'compra parada há mais de 2 dias úteis', varios: 'compras paradas há mais de 2 dias úteis', rotulo: 'Compra parada', fazer: 'cobre o comprador ou resolva em Compras > Fila de compras', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_divergencia: { modulo: 'compras', um: 'peça recebida com divergência', varios: 'peças recebidas com divergência', rotulo: 'Resolver', fazer: 'resolva com o fornecedor e registre em Compras > Fila de compras', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_conferir: { modulo: 'compras', um: 'compra para conferir no Financeiro', varios: 'compras para conferir no Financeiro', rotulo: 'Conferir', fazer: 'confira em Compras > Conferência do Financeiro', tela: CMP_PEND_TELA('compras_financeiro'), origem: 'COMPRAS' },
  compras_fin_divergente: { modulo: 'compras', um: 'divergência apontada pelo Financeiro', varios: 'divergências apontadas pelo Financeiro', rotulo: 'Corrigir', fazer: 'corrija o pagamento ou o comprovante em Compras > Fila de compras', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_sem_pedido: { modulo: 'compras', um: 'compra feita sem pedido no sistema', varios: 'compras feitas sem pedido no sistema', rotulo: 'Compra sem pedido', fazer: 'leia a justificativa e marque "Ciente" na ficha da compra (Compras > Fila de compras)', tela: CMP_PEND_TELA('compras'), origem: 'COMPRAS' },
  compras_aviso: { modulo: 'compras', um: 'aviso de Compras', varios: 'avisos de Compras', rotulo: 'Informativo', fazer: 'abra Compras para ver', tela: CMP_PEND_TELA('compras_meus'), origem: 'COMPRAS' }
};

/** Decisões da gestão (Caixa): prazo em dias úteis contado da entrada, quando o item não traz prazo próprio. */
var CMP_GES_TIPOS = { compras_aprovar: { prazo: 1 }, compras_parado_gestao: { prazo: 1 }, compras_sem_pedido: { prazo: 2 } };

function Compras_registrarTipos_() {
  try {
    if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(CMP_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = CMP_PEND_TIPOS[k]; });
    if (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS && !PEND_MODULOS.compras) PEND_MODULOS.compras = 'Compras e peças';
    if (typeof PEND_FONTES !== 'undefined' && Array.isArray(PEND_FONTES) && !PEND_FONTES.some(function (f) { return f && f.nome === 'Compras'; })) {
      PEND_FONTES.push({ nome: 'Compras', fn: function (add, ctx) { if (!ctx.cliente && typeof Compras_fontePendencias_ === 'function') Compras_fontePendencias_(add, ctx); } });
    }
    if (typeof GES_TIPOS !== 'undefined' && GES_TIPOS) Object.keys(CMP_GES_TIPOS).forEach(function (k) { if (!GES_TIPOS[k]) GES_TIPOS[k] = CMP_GES_TIPOS[k]; });
    if (typeof GES_AREA_MODULO_PADRAO !== 'undefined' && GES_AREA_MODULO_PADRAO && !GES_AREA_MODULO_PADRAO.compras) GES_AREA_MODULO_PADRAO.compras = 'LOGISTICA';
    if (typeof GES_MODULOS_CONFIG !== 'undefined' && Array.isArray(GES_MODULOS_CONFIG) && !GES_MODULOS_CONFIG.some(function (m) { return m && m[0] === 'compras'; })) GES_MODULOS_CONFIG.push(['compras', 'Compras e peças']);
  } catch (e) { try { console.error('Compras, registro na central: ' + ((e && e.message) || e)); } catch (x) {} }
}

Compras_registrarTipos_();
