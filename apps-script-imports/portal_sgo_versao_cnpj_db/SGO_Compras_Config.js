/****************************************************
 * COMPRAS E PEÇAS NATIVO DO SGO+ — BASE (21/10/2026)
 *
 * Projeto aprovado pelo dono em 21/10/2026 ("Sim pra todos"): docs/PROJETO_COMPRAS_NO_SGO_20261021.md.
 * Acaba com dois problemas: pedido vago ("uma mangueira de 1/2") que leva à compra errada e compra sem rastro
 * (sem saber para que foi, quem aprovou, como foi paga e se o Financeiro conferiu). As regras vieram do Compras do
 * COMMAND (Compras.js, ComprasRastreio.js), mais enxutas: 9 situações em vez de 16, as "missões" viram atividades de
 * Minhas atividades, a aprovação por valor aparece e é cobrada na Caixa de decisões, os avisos seguem a matriz de
 * avisos aprovada (sistema até resolver, e-mail no resumo da manhã, nunca WhatsApp, nunca valor em reais).
 *
 * Arquivos do módulo:
 *   SGO_Compras_Config.js         base, regras (configuráveis na tela), acesso, tabelas, numeração, avisos, atividades
 *   SGO_Compras_Fornecedores.js   cadastro de fornecedores (consulta de CNPJ, arquivar sem apagar, importação que só preenche)
 *   SGO_Compras_Requisicoes.js    "Pedir peça ou material", especificação, vínculo, fila, meus pedidos, cancelamento, Comercial
 *   SGO_Compras_Cotacoes.js       cotações com o arquivo do orçamento, escolha justificada, aprovação por faixa de valor
 *   SGO_Compras_Pedido.js         pedido de compra A4 (PC-AAAA-NNNN), envio ao fornecedor, recebimento, entrega
 *   SGO_Compras_Financeiro.js     pagamento, conferência do Financeiro, compra sem pedido, painel e relatório mensal A4
 *   SGO_Compras_Painel.js         pendências (central e Caixa de decisões), rotina e a chamada única da tela (Compras_api)
 *   SGO_Pendencias_Compras.js     registra os tipos de Compras na central de pendências e na Caixa de decisões (carrega depois delas)
 *   SGO_Ajuda_Compras.js          ajuda "Como usar esta tela"
 *   JS_Compras.html               telas
 *
 * SITUAÇÕES DA REQUISIÇÃO: Solicitada (com a marca "especificação incompleta" quando falta algo), Em cotação,
 * Aguardando aprovação, Aprovada, Pedido feito, Recebida com divergência, Disponível, Entregue (encerra) e Cancelada.
 * A conferência do Financeiro corre em paralelo a partir do pedido feito (aguardando, conferida, divergente).
 *
 * QUEM VÊ O QUÊ (o servidor confere em toda chamada; esconder na tela não basta):
 *   GESTAO      Administrador, Diretoria, dono do sistema e Gestor da área de Compras (Logística, configurável): tudo.
 *   COMPRADOR   quem está na lista de compradores ou de substitutos (Regras de compras): fila, fornecedores, cotar,
 *               pedido, receber, entregar, cancelar; aprova a própria faixa (até R$ 1.000 no padrão).
 *   GESTOR      Gestor de outra área: vê a fila com valores e aprova quando a faixa e a área são dele.
 *   FINANCEIRO  perfil ou área Financeiro: conferência do Financeiro e fornecedores (consulta).
 *   SOLICITANTE todos os demais colaboradores internos: pedem e acompanham os próprios pedidos, SEM valores.
 *   Técnico, Metrologia e RH nunca veem preço. Cliente não vê nada de Compras.
 *
 * Abas (criadas sob demanda; nada é apagado, só marcado): CMP_CONFIG, CMP_FORNECEDORES, CMP_REQUISICOES, CMP_ITENS,
 * CMP_COTACOES, CMP_APROVACOES, CMP_PEDIDOS, CMP_HISTORICO, CMP_AVISOS. Anexos no Drive, pasta "Compras - Anexos".
 * Nenhuma função devolve Date cru.
 ****************************************************/

var CMP_FUSO = 'America/Sao_Paulo';
var CMP_ABAS = {
  CONFIG: 'CMP_CONFIG', FORNECEDORES: 'CMP_FORNECEDORES', REQUISICOES: 'CMP_REQUISICOES', ITENS: 'CMP_ITENS', COTACOES: 'CMP_COTACOES',
  APROVACOES: 'CMP_APROVACOES', PEDIDOS: 'CMP_PEDIDOS', HISTORICO: 'CMP_HISTORICO', AVISOS: 'CMP_AVISOS'
};
var CMP_COLUNAS = {
  CMP_CONFIG: ['ID', 'CHAVE', 'VALOR_JSON', 'VERSAO', 'MOTIVO', 'ATUALIZADO_POR_ID', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_FORNECEDORES: ['ID', 'CODIGO', 'TIPO_PESSOA', 'DOCUMENTO', 'RAZAO_SOCIAL', 'NOME_FANTASIA', 'ENDERECO', 'CIDADE', 'UF', 'CONTATO', 'TELEFONE', 'WHATSAPP',
    'EMAIL_PEDIDOS', 'CATEGORIAS', 'PRAZO_MEDIO_DIAS', 'CONDICAO_PAGAMENTO', 'OBS', 'ATIVO', 'ARQUIVADO_EM', 'ARQUIVADO_MOTIVO', 'ORIGEM',
    'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_REQUISICOES: ['ID', 'NUMERO', 'TITULO', 'SOLICITANTE_ID', 'SOLICITANTE_NOME', 'SOLICITANTE_AREA', 'URGENCIA', 'FINALIDADE', 'PRECISA_ATE',
    'VINCULO_TIPO', 'CLIENTE_ID', 'CLIENTE_NOME', 'UNIDADE_ID', 'UNIDADE_NOME', 'PROPOSTA_ID', 'PROPOSTA_NUMERO', 'VEICULO_ID', 'VEICULO_PLACA', 'OS_AUVO',
    'USO_INTERNO_MOTIVO', 'SITUACAO', 'ESPEC_INCOMPLETA', 'ESPEC_FALTA', 'ESPEC_DEVOLVIDA_TEXTO', 'ESPEC_DEVOLVIDA_EM', 'ESPEC_DEVOLVIDA_POR_NOME',
    'ESPEC_CONFERIDA_POR_ID', 'ESPEC_CONFERIDA_POR_NOME', 'ESPEC_CONFERIDA_EM', 'COMPRADOR_ID', 'COMPRADOR_NOME', 'ATIVIDADE_ID',
    'COTACAO_ID', 'ESCOLHA_POR_ID', 'ESCOLHA_POR_NOME', 'ESCOLHA_EM', 'ESCOLHA_JUSTIFICATIVA', 'MINIMO_COTACOES', 'COTACOES_VALIDAS', 'COTACOES_JUSTIFICATIVA',
    'VALOR_TOTAL', 'FAIXA', 'APROVADOR_NIVEL', 'APROVACAO_PEDIDA_EM', 'APROVADA_POR_ID', 'APROVADA_POR_NOME', 'APROVADA_EM', 'APROVACAO_TEXTO', 'REPROVACOES',
    'PEDIDO_ID', 'PEDIDO_NUMERO', 'PREVISAO_ENTREGA', 'RECEBIDA_EM', 'RECEBIDA_POR_NOME', 'DIVERGENCIA_TEXTO', 'DISPONIVEL_EM',
    'ENTREGUE_EM', 'ENTREGUE_A_ID', 'ENTREGUE_A_NOME', 'ENTREGA_EVIDENCIA', 'ENTREGUE_POR_NOME', 'CANCELADA_EM', 'CANCELADA_POR_NOME', 'CANCELADA_MOTIVO',
    'SEM_PEDIDO', 'SEM_PEDIDO_JUSTIFICATIVA', 'GESTAO_CIENTE_EM', 'GESTAO_CIENTE_POR_NOME', 'GESTAO_CIENTE_TEXTO',
    'COMERCIAL_ATIVIDADE_ID', 'COMERCIAL_VENDEDOR_ID', 'COMERCIAL_CONCLUIDA_EM', 'ORIGEM', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_ITENS: ['ID', 'REQUISICAO_ID', 'ORDEM', 'CATEGORIA', 'DESCRICAO', 'QUANTIDADE', 'UNIDADE', 'PART_NUMBER', 'MARCA', 'EQUIPAMENTO_ID', 'EQUIPAMENTO_TEXTO',
    'TENSAO', 'CORRENTE', 'PRESSAO', 'ROSCA', 'DIMENSAO', 'MATERIAL', 'OUTRAS_ESPEC', 'FOTOS_JSON', 'PRODUTO_ID', 'QTD_RECEBIDA', 'ATIVO', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_COTACOES: ['ID', 'REQUISICAO_ID', 'FORNECEDOR_ID', 'FORNECEDOR_NOME', 'PRECOS_JSON', 'SUBTOTAL', 'FRETE', 'IMPOSTOS', 'TOTAL', 'PRAZO_DIAS', 'VALIDADE',
    'CONDICAO_PAGAMENTO', 'REFERENCIA', 'COMPATIBILIDADE', 'OBS', 'ARQUIVO_ID', 'ARQUIVO_NOME', 'ARQUIVO_URL', 'SITUACAO', 'RETIRADA_MOTIVO',
    'LANCADA_POR_ID', 'LANCADA_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_APROVACOES: ['ID', 'REQUISICAO_ID', 'FAIXA', 'NIVEL', 'VALOR', 'DECISAO', 'TEXTO', 'POR_ID', 'POR_NOME', 'EM', 'CRIADO_EM'],
  CMP_PEDIDOS: ['ID', 'NUMERO', 'REVISAO', 'REQUISICAO_ID', 'REQUISICAO_NUMERO', 'FORNECEDOR_ID', 'FORNECEDOR_NOME', 'COTACAO_ID', 'VALOR_TOTAL',
    'PREVISAO_ENTREGA', 'RASTREIO', 'FORMA_PAGAMENTO', 'CARTAO_FINAL', 'PARCELAS', 'BOLETO_VENCIMENTO', 'CONDICAO', 'REEMBOLSO_PARA_ID', 'REEMBOLSO_PARA_NOME',
    'ENDERECO_ENTREGA', 'OBS', 'CONGELADO_JSON', 'MARCA_CONTEUDO', 'PDF_ID', 'HTML_ID', 'PDF_URL', 'HTML_URL', 'PASTA_URL', 'ARQUIVO_NOME',
    'EMITIDO_EM', 'EMITIDO_POR_ID', 'EMITIDO_POR_NOME', 'ENVIADO_EM', 'ENVIO_COMO', 'VALOR_PAGO', 'PAGO_EM', 'COMPROVANTE_ID', 'COMPROVANTE_NOME', 'COMPROVANTE_URL',
    'PAGAMENTO_POR_ID', 'PAGAMENTO_POR_NOME', 'NF_NUMERO', 'NF_ARQUIVO_ID', 'NF_ARQUIVO_NOME', 'NF_ARQUIVO_URL',
    'FIN_SITUACAO', 'FIN_POR_ID', 'FIN_POR_NOME', 'FIN_EM', 'FIN_OBS', 'FIN_REENVIO_TEXTO', 'SEM_PEDIDO', 'SITUACAO', 'ATUALIZADO_EM', 'CRIADO_EM'],
  CMP_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'TIPO', 'DE', 'PARA', 'TEXTO', 'PUBLICO', 'USUARIO_ID', 'USUARIO_NOME', 'DATA', 'CRIADO_EM'],
  CMP_AVISOS: ['ID', 'DESTINATARIO_ID', 'TIPO', 'TITULO', 'TEXTO', 'REF_ID', 'DATA', 'LIDO_EM', 'EMAIL_SITUACAO', 'EMAIL_EM', 'EMAIL_MOTIVO', 'CRIADO_EM']
};
var CMP_COLUNAS_TEXTO = {
  CMP_FORNECEDORES: ['DOCUMENTO', 'TELEFONE', 'WHATSAPP', 'CODIGO', 'ATUALIZADO_EM', 'ARQUIVADO_EM'],
  CMP_REQUISICOES: ['NUMERO', 'PRECISA_ATE', 'ESPEC_DEVOLVIDA_EM', 'ESPEC_CONFERIDA_EM', 'ESCOLHA_EM', 'APROVACAO_PEDIDA_EM', 'APROVADA_EM', 'PREVISAO_ENTREGA',
    'RECEBIDA_EM', 'DISPONIVEL_EM', 'ENTREGUE_EM', 'CANCELADA_EM', 'GESTAO_CIENTE_EM', 'COMERCIAL_CONCLUIDA_EM', 'ATUALIZADO_EM', 'OS_AUVO'],
  CMP_ITENS: ['PART_NUMBER', 'ATUALIZADO_EM'],
  CMP_COTACOES: ['VALIDADE', 'REFERENCIA', 'ATUALIZADO_EM'],
  CMP_APROVACOES: ['EM'],
  CMP_PEDIDOS: ['NUMERO', 'PREVISAO_ENTREGA', 'CARTAO_FINAL', 'BOLETO_VENCIMENTO', 'EMITIDO_EM', 'ENVIADO_EM', 'PAGO_EM', 'NF_NUMERO', 'FIN_EM', 'ATUALIZADO_EM'],
  CMP_HISTORICO: ['DATA'], CMP_AVISOS: ['DATA', 'LIDO_EM', 'EMAIL_EM'], CMP_CONFIG: ['ATUALIZADO_EM']
};

var CMP_SITUACOES = {
  SOLICITADA: 'Solicitada', EM_COTACAO: 'Em cotação', AGUARDANDO_APROVACAO: 'Aguardando aprovação', APROVADA: 'Aprovada', PEDIDO_FEITO: 'Pedido feito',
  RECEBIDA_DIVERGENCIA: 'Recebida com divergência', DISPONIVEL: 'Disponível', ENTREGUE: 'Entregue', CANCELADA: 'Cancelada'
};
/** O que quem pediu lê sobre cada situação (Meus pedidos; nunca com valor). */
var CMP_SITUACOES_SOLICITANTE = {
  SOLICITADA: 'Recebido por Compras. O comprador confere a especificação e começa a cotar.',
  EM_COTACAO: 'Compras está pedindo orçamentos aos fornecedores.',
  AGUARDANDO_APROVACAO: 'Orçamento escolhido; aguarda a aprovação de quem tem a alçada.',
  APROVADA: 'Compra aprovada; o pedido ao fornecedor vai ser feito.',
  PEDIDO_FEITO: 'Pedido feito ao fornecedor; aguardando a entrega.',
  RECEBIDA_DIVERGENCIA: 'Chegou com divergência (quantidade, especificação ou dano); Compras está resolvendo com o fornecedor.',
  DISPONIVEL: 'Chegou e foi conferida. Retire com Compras ou confirme o recebimento aqui.',
  ENTREGUE: 'Entregue. Pedido encerrado.',
  CANCELADA: 'Cancelado.'
};
var CMP_URGENCIAS = { CRITICA: 'Crítica (parada de equipamento ou atendimento)', ALTA: 'Alta', NORMAL: 'Normal', BAIXA: 'Baixa' };
var CMP_VINCULOS = { CLIENTE: 'Cliente (atendimento, O.S. do Auvo)', COMERCIAL: 'Pedido aprovado do Comercial', VEICULO: 'Veículo da Frota', INTERNO: 'Uso interno (ferramenta, estoque, administrativo)' };
/** tecnica = exige os dados técnicos da peça (número de peça ou dados técnicos, equipamento de origem e foto). */
var CMP_CATEGORIAS_ITEM = [
  { codigo: 'PECA', nome: 'Peça de equipamento', tecnica: true },
  { codigo: 'PECA_VEICULO', nome: 'Peça de veículo', tecnica: true },
  { codigo: 'FERRAMENTA', nome: 'Ferramenta ou instrumento', tecnica: false },
  { codigo: 'INSUMO', nome: 'Insumo ou material de consumo', tecnica: false },
  { codigo: 'REVENDA', nome: 'Produto para o cliente (pedido do Comercial)', tecnica: false },
  { codigo: 'ESCRITORIO', nome: 'Material de escritório ou limpeza', tecnica: false },
  { codigo: 'SERVICO', nome: 'Serviço de terceiro', tecnica: false },
  { codigo: 'OUTRO', nome: 'Outro', tecnica: false }
];
var CMP_CATEGORIAS_FORNECEDOR = ['Peças hospitalares', 'Ferramentas e instrumentos', 'Insumos', 'Veículos (peças e oficina)', 'Serviços', 'Escritório e limpeza', 'Outros'];
var CMP_FORMAS_PAGAMENTO = {
  CARTAO_CREDITO: 'Cartão de crédito', CARTAO_DEBITO: 'Cartão de débito', PIX: 'PIX', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência bancária',
  FATURADO: 'Faturado (prazo do fornecedor)', REEMBOLSO: 'Reembolso a colaborador'
};
var CMP_COMPATIBILIDADE = { ORIGINAL: 'Original (mesmo número de peça)', EQUIVALENTE: 'Equivalente (especificação conferida)', A_CONFIRMAR: 'A confirmar' };
var CMP_FIN_SITUACOES = { '': 'Sem pagamento registrado', AGUARDANDO: 'Aguardando conferência', CONFERIDA: 'Conferida', DIVERGENTE: 'Divergente' };
var CMP_NIVEIS_APROVACAO = { COMPRADOR: 'Comprador', GESTOR_AREA: 'Gestor da área', DIRETORIA: 'Diretoria' };

/**
 * REGRAS PADRÃO (respostas do dono em 21/10/2026). Tudo editável em Compras > Regras de compras (Administrador e
 * Diretoria); cada gravação é uma versão nova em CMP_CONFIG e a anterior fica no histórico. Sem nomes no código:
 * compradores e substitutos são escolhidos na tela.
 */
var CMP_REGRAS_PADRAO = {
  versao: 1,
  compradores: [],
  substitutos: [],
  areaCompras: 'LOGISTICA',
  faixas: [
    { ate: 1000, aprovador: 'COMPRADOR', cotacoes: 1 },
    { ate: 10000, aprovador: 'GESTOR_AREA', cotacoes: 2 },
    { ate: null, aprovador: 'DIRETORIA', cotacoes: 3 }
  ],
  prazos: { cotarDiasUteis: 1, cotarBaixaDiasUteis: 2, criticaHoras: 4, pedidoDiasUteis: 1, entregaDiasUteis: 1, paradoDiasUteis: 1, gestorAposDiasUteis: 2 },
  empresa: { enderecoEntrega: '', enderecoFaturamento: '', observacaoPedido: 'Favor citar o número deste pedido de compra na nota fiscal e no documento de entrega. Mercadoria em desacordo com a especificação será devolvida.' },
  avisos: { horaResumo: '08:00' }
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function Cmp_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function Cmp_up_(v) { return Cmp_s_(v).toUpperCase(); }
function Cmp_agora_() { return Utilities.formatDate(new Date(), CMP_FUSO, "yyyy-MM-dd'T'HH:mm"); }
function Cmp_hoje_() { return Utilities.formatDate(new Date(), CMP_FUSO, 'yyyy-MM-dd'); }
function Cmp_2_(n) { return (n < 10 ? '0' : '') + n; }
function Cmp_json_(t, padrao) { try { var v = JSON.parse(Cmp_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function Cmp_copia_(o) { return JSON.parse(JSON.stringify(o)); }
function Cmp_texto_(v, max) { var s = Cmp_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }
function Cmp_sim_(v) { return v === true || Cmp_up_(v) === 'SIM' || Cmp_up_(v) === 'TRUE'; }

/** Data de qualquer formato do banco -> "aaaa-mm-ddThh:mm" (ou só a data). '' se não der para ler. */
function Cmp_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, CMP_FUSO, "yyyy-MM-dd'T'HH:mm");
  var s = Cmp_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (m) {
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) && m[4]) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, CMP_FUSO, "yyyy-MM-dd'T'HH:mm"); }
    return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] : '');
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] : '') : '';
}
function Cmp_dia_(v) { return Cmp_iso_(v).slice(0, 10); }
function Cmp_br_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(Cmp_iso_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function Cmp_brDia_(v) { return Cmp_br_(v).slice(0, 10); }
function Cmp_somarDias_(dia, n) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Cmp_s_(dia));
  if (!m) return '';
  var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + Cmp_2_(t.getUTCMonth() + 1) + '-' + Cmp_2_(t.getUTCDate());
}
function Cmp_diasEntre_(diaA, diaB) {
  var a = /^(\d{4})-(\d{2})-(\d{2})/.exec(Cmp_s_(diaA)), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(Cmp_s_(diaB));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 864e5);
}
function Cmp_expediente_() { try { return typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null; } catch (e) { return null; } }
function Cmp_somarDiasUteis_(dia, n) { return typeof Ges_somarDiasUteis_ === 'function' ? Ges_somarDiasUteis_(dia, n, Cmp_expediente_()) : Cmp_somarDias_(dia, n); }
function Cmp_diasUteisEntre_(a, b) { return typeof Ges_diasUteisEntre_ === 'function' ? Ges_diasUteisEntre_(a, b, Cmp_expediente_()) : Math.max(0, Cmp_diasEntre_(a, b) || 0); }

/** Número de entrada da tela ou do banco: number, "1.234,56", "1234.56". NaN se não for número. Nunca chama SGO_UTILS.toNumber. */
function Cmp_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = Cmp_s_(v).replace(/R\$|%|\s/g, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}
function Cmp_r2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }
/** "R$ 1.234,56" (pt-BR; nunca toFixed cru). */
function Cmp_moeda_(v) { return 'R$ ' + (typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(Number(v) || 0, 2) : String(Cmp_r2_(v)).replace('.', ',')); }
function Cmp_qtd_(v) { var n = Number(v) || 0; return typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(n, Math.round(n) === n ? 0 : 2) : String(n).replace('.', ','); }
function Cmp_plural_(n, um, varios) { return String(n) + ' ' + (Number(n) === 1 ? um : varios); }
function Cmp_digitos_(v) { return Cmp_s_(v).replace(/\D/g, ''); }

/** Marca de conferência do conteúdo (SHA-256 em hexadecimal). */
function Cmp_marca_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  } catch (e) {
    var h1 = 5381, s = String(texto || '');
    for (var i = 0; i < s.length; i++) h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) | 0;
    return (h1 >>> 0).toString(16);
  }
}

function Cmp_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  }
}

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
function Cmp_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('CMP_ABAS_OK_V1')) return; } catch (e) {}
  Object.keys(CMP_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, CMP_COLUNAS[aba]);
    CMP_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    (CMP_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (cache) cache.put('CMP_ABAS_OK_V1', '1', 21600); } catch (e) {}
}

function Cmp_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

/** Histórico. extra.publico = true: quem pediu vê esta linha em Meus pedidos (texto SEM valor). */
function Cmp_historico_(entidade, id, tipo, eu, extra) {
  var e = extra || {};
  try {
    SGO_DATA.insert(CMP_ABAS.HISTORICO, { ENTIDADE: entidade, ENTIDADE_ID: id, TIPO: tipo, DE: Cmp_texto_(e.de, 300), PARA: Cmp_texto_(e.para, 300), TEXTO: Cmp_texto_(e.texto, 4000),
      PUBLICO: e.publico ? 'SIM' : '', USUARIO_ID: Cmp_s_(eu && eu.id), USUARIO_NOME: Cmp_s_(eu && eu.nome), DATA: Cmp_agora_() });
  } catch (x) { console.error('Compras, histórico: ' + ((x && x.message) || x)); }
}

/** Próximo número anual: REQ-2026-0001, PC-2026-0001, FOR-0001 (sem ano). Conferido contra o maior já gravado. Chamar dentro da trava. */
function Cmp_proximoNumero_(sigla, aba, coluna, semAno) {
  var ano = Cmp_hoje_().slice(0, 4), prefixo = semAno ? sigla + '-' : sigla + '-' + ano + '-';
  var chave = 'CMP_SEQ_' + sigla + (semAno ? '' : '_' + ano), props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty(chave)) || 0;
  var re = new RegExp('^' + prefixo.replace(/-/g, '\\-') + '(\\d+)$');
  Cmp_ler_(aba).forEach(function (r) { var m = re.exec(Cmp_s_(r[coluna])); if (m && Number(m[1]) > seq) seq = Number(m[1]); });
  seq++;
  props.setProperty(chave, String(seq));
  var n = String(seq);
  while (n.length < 4) n = '0' + n;
  return prefixo + n;
}

// ------------------------------------------------------------
// REGRAS DE COMPRAS (configuração editável e versionada)
// ------------------------------------------------------------
var CMP_REGRAS_MEMO = null;

/** Regras em vigor: o padrão completado pela última versão gravada. Nunca lança. */
function Cmp_regras_() {
  if (CMP_REGRAS_MEMO && Date.now() - CMP_REGRAS_MEMO.em < 20000) return CMP_REGRAS_MEMO.r;
  var r = Cmp_copia_(CMP_REGRAS_PADRAO), gravada = null;
  try {
    var linhas = Cmp_ler_(CMP_ABAS.CONFIG).filter(function (x) { return Cmp_s_(x.CHAVE) === 'REGRAS'; });
    linhas.sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
    if (linhas.length) {
      var ult = linhas[linhas.length - 1];
      gravada = Cmp_json_(ult.VALOR_JSON, null);
      r.versao = Number(ult.VERSAO) || r.versao; r.atualizadaEm = Cmp_br_(ult.ATUALIZADO_EM); r.atualizadaPor = Cmp_s_(ult.ATUALIZADO_POR_NOME);
    }
  } catch (e) { gravada = null; }
  if (gravada && typeof gravada === 'object') {
    Object.keys(gravada).forEach(function (k) {
      if (k === 'versao' || !(k in CMP_REGRAS_PADRAO)) return;
      var v = gravada[k], p = CMP_REGRAS_PADRAO[k];
      if (p && typeof p === 'object' && !Array.isArray(p) && v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).forEach(function (kk) { r[k][kk] = v[kk]; });
      else if (v !== undefined && v !== null) r[k] = v;
    });
  }
  CMP_REGRAS_MEMO = { em: Date.now(), r: r };
  return r;
}

/** Confere as regras antes de gravar (mensagem no padrão "o quê + por quê + o que fazer"). */
function Cmp_validarRegras_(r) {
  if (!r || typeof r !== 'object') throw new Error('as regras vieram vazias. Atualize a tela e salve de novo');
  if (!Array.isArray(r.compradores) || !Array.isArray(r.substitutos)) throw new Error('a lista de compradores veio em formato errado. Atualize a tela e salve de novo');
  var us = Cmp_usuarios_();
  r.compradores.concat(r.substitutos).forEach(function (id) {
    if (!us[Cmp_s_(id)]) throw new Error('um dos compradores escolhidos não existe mais no cadastro de usuários. Tire a pessoa da lista e salve de novo');
  });
  if (!Array.isArray(r.faixas) || r.faixas.length < 1 || r.faixas.length > 5) throw new Error('as faixas de aprovação precisam ter de 1 a 5 linhas. Ajuste e salve de novo');
  var ultimo = 0;
  r.faixas.forEach(function (f, i) {
    var ultimaLinha = i === r.faixas.length - 1;
    if (!CMP_NIVEIS_APROVACAO[Cmp_up_(f.aprovador)]) throw new Error('a faixa ' + (i + 1) + ' precisa dizer quem aprova (comprador, gestor da área ou Diretoria). Escolha e salve de novo');
    var c = Cmp_num_(f.cotacoes);
    if (!(c >= 1 && c <= 5) || Math.round(c) !== c) throw new Error('a faixa ' + (i + 1) + ' precisa de 1 a 5 cotações mínimas. Corrija e salve de novo');
    if (ultimaLinha) { if (f.ate !== null && f.ate !== '' && f.ate !== undefined) throw new Error('a última faixa não tem teto ("acima de"). Deixe o valor dela em branco e salve de novo'); return; }
    var ate = Cmp_num_(f.ate);
    if (!(ate > ultimo)) throw new Error('os valores das faixas precisam crescer (a faixa ' + (i + 1) + ' está com ' + f.ate + '). Corrija e salve de novo');
    ultimo = ate;
  });
  if (!/^[A-Z_]{2,30}$/.test(Cmp_up_(r.areaCompras))) throw new Error('escolha a área de Compras (Logística ou Administrativo) e salve de novo');
}

function Cmp_gravarRegras_(r, eu, motivo) {
  var limpa = {};
  Object.keys(CMP_REGRAS_PADRAO).forEach(function (k) { if (k !== 'versao' && r[k] !== undefined) limpa[k] = r[k]; });
  limpa.compradores = (limpa.compradores || []).map(Cmp_s_).filter(Boolean);
  limpa.substitutos = (limpa.substitutos || []).map(Cmp_s_).filter(function (id, i, l) { return id && l.indexOf(id) === i && limpa.compradores.indexOf(id) < 0; });
  limpa.areaCompras = Cmp_up_(limpa.areaCompras || 'LOGISTICA');
  limpa.faixas = (limpa.faixas || []).map(function (f, i, l) { return { ate: i === l.length - 1 ? null : Cmp_r2_(Cmp_num_(f.ate)), aprovador: Cmp_up_(f.aprovador), cotacoes: Number(Cmp_num_(f.cotacoes)) }; });
  Cmp_validarRegras_(limpa);
  var atual = Cmp_regras_(), versao = (Number(atual.versao) || 1) + 1;
  SGO_DATA.insert(CMP_ABAS.CONFIG, { CHAVE: 'REGRAS', VALOR_JSON: JSON.stringify(limpa), VERSAO: versao, MOTIVO: Cmp_texto_(motivo, 500),
    ATUALIZADO_POR_ID: eu.id, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Cmp_agora_() });
  CMP_REGRAS_MEMO = null;
  Cmp_historico_('REGRAS', 'REGRAS', 'VERSAO', eu, { para: 'versão ' + versao, texto: Cmp_texto_(motivo, 500) });
  return versao;
}

/** Faixa de um valor total: { indice (1..n), ate, aprovador, cotacoes, nome }. */
function Cmp_faixaDe_(valor, regras) {
  regras = regras || Cmp_regras_();
  var v = Number(valor) || 0, fs = regras.faixas, ant = 0;
  for (var i = 0; i < fs.length; i++) {
    var ate = fs[i].ate === null || fs[i].ate === '' || fs[i].ate === undefined ? null : Number(fs[i].ate);
    if (ate === null || v <= ate + 1e-9) {
      return { indice: i + 1, ate: ate, de: ant, aprovador: Cmp_up_(fs[i].aprovador), cotacoes: Number(fs[i].cotacoes) || 1,
        nome: ate === null ? 'acima de ' + Cmp_moeda_(ant) : (i === 0 ? 'até ' + Cmp_moeda_(ate) : 'de ' + Cmp_moeda_(ant + 0.01) + ' a ' + Cmp_moeda_(ate)) };
    }
    ant = ate;
  }
  var u = fs[fs.length - 1];
  return { indice: fs.length, ate: null, de: ant, aprovador: Cmp_up_(u.aprovador), cotacoes: Number(u.cotacoes) || 1, nome: 'acima de ' + Cmp_moeda_(ant) };
}

// ------------------------------------------------------------
// QUEM É QUEM EM COMPRAS
// ------------------------------------------------------------
function Cmp_usuarios_() {
  var mapa = {};
  Cmp_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = Cmp_up_(u.PERFIL);
    if (!perfil || perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return;
    mapa[Cmp_s_(u.ID)] = { id: Cmp_s_(u.ID), nome: Cmp_s_(u.NOME) || Cmp_s_(u.USUARIO), login: Cmp_s_(u.USUARIO), perfil: perfil, area: Cmp_up_(u.AREA),
      email: Cmp_s_(u.EMAIL).toLowerCase(), ativo: Cmp_up_(u.STATUS || 'ATIVO') === 'ATIVO' };
  });
  return mapa;
}

function Cmp_ehDono_(login) { try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(login); } catch (e) { return false; } }
function Cmp_ehContaSistema_(u) { try { return typeof Areas_contaDoSistema_ === 'function' ? Areas_contaDoSistema_({ USUARIO: u.login, NOME: u.nome }) : Cmp_s_(u.login).toLowerCase() === 'admin'; } catch (e) { return false; } }

/**
 * Nível de uma pessoa em Compras. u: { id, perfil, area, login }.
 * { nivel: GESTAO|COMPRADOR|GESTOR|FINANCEIRO|SOLICITANTE|NENHUM, comprador, veValores, veFila, financeiro, regras (pode editar), diretoria }
 */
function Cmp_nivelDe_(u, regras) {
  regras = regras || Cmp_regras_();
  var perfil = Cmp_up_(u && u.perfil), area = Cmp_up_(u && u.area), id = Cmp_s_(u && u.id);
  if (!perfil || perfil === 'CLIENTE' || perfil === 'AUVO_SYNC') return { nivel: 'NENHUM', comprador: false, veValores: false, veFila: false, financeiro: false, regras: false, diretoria: false, gestao: false, gestor: false };
  var diretoria = perfil === 'DIRETORIA' || Cmp_ehDono_(u && u.login);
  var admin = perfil === 'ADMIN';
  var lista = (regras.compradores || []).concat(regras.substitutos || []).map(Cmp_s_);
  var gestao = admin || diretoria || (perfil === 'GESTOR' && area === Cmp_up_(regras.areaCompras));
  var compradorLista = !!id && lista.indexOf(id) >= 0;
  var gestor = perfil === 'GESTOR';
  var financeiro = perfil === 'FINANCEIRO' || area === 'FINANCEIRO';
  var comprador = gestao || compradorLista;
  var nivel = gestao ? 'GESTAO' : compradorLista ? 'COMPRADOR' : gestor ? 'GESTOR' : financeiro ? 'FINANCEIRO' : 'SOLICITANTE';
  return { nivel: nivel, gestao: gestao, comprador: comprador, compradorLista: compradorLista, gestor: gestor || gestao, financeiro: financeiro || diretoria || admin,
    veValores: comprador || gestor || financeiro, veFila: comprador || gestor, regras: admin || diretoria, diretoria: diretoria, admin: admin };
}

/** Quem está chamando (sessão), com o nível em Compras. Não lança por falta de acesso: quem chama decide. */
function Cmp_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); } catch (e) { u = null; }
  var eu = { id: Cmp_s_(s.userId), nome: Cmp_s_(s.nome) || Cmp_s_(s.usuario), login: Cmp_s_(s.usuario), perfil: Cmp_up_(s.perfil), area: Cmp_up_(u && u.AREA), email: Cmp_s_(u && u.EMAIL).toLowerCase() };
  var n = Cmp_nivelDe_(eu);
  Object.keys(n).forEach(function (k) { eu[k] = n[k]; });
  return eu;
}

/** Trava de acesso com a mensagem completa. nivel: COMPRADOR | VALORES | FINANCEIRO | REGRAS | INTERNO. */
function Cmp_exigir_(eu, nivel, acao) {
  var ok = nivel === 'COMPRADOR' ? eu.comprador : nivel === 'VALORES' ? eu.veValores : nivel === 'FILA' ? eu.veFila : nivel === 'FINANCEIRO' ? eu.financeiro :
    nivel === 'REGRAS' ? eu.regras : nivel === 'GESTAO' ? eu.gestao : nivel === 'INTERNO' ? eu.nivel !== 'NENHUM' : false;
  if (ok) return eu;
  var porque = {
    COMPRADOR: 'esta ação é do comprador (lista em Compras > Regras de compras), do gestor da área de Compras, da Diretoria ou do Administrador. Se você compra para a empresa, peça ao Administrador para incluir o seu nome na lista de compradores',
    VALORES: 'valores de compra ficam só com compradores, gestores, Financeiro e Diretoria. Acompanhe o seu pedido em Compras > Meus pedidos de compra (sem valores)',
    FILA: 'a fila de compras é dos compradores, gestores, da Diretoria e do Administrador. Acompanhe o seu pedido em Compras > Meus pedidos de compra',
    FINANCEIRO: 'a conferência das compras é do Financeiro (perfil ou área Financeiro), da Diretoria e do Administrador',
    REGRAS: 'as regras de compras (compradores, faixas de aprovação, cotações mínimas) são alteradas só pelo Administrador e pela Diretoria',
    GESTAO: 'esta ação é da gestão de Compras (gestor da área de Compras, Diretoria ou Administrador)',
    INTERNO: 'Compras é da equipe interna da Metrolabs'
  }[nivel] || 'você não tem acesso a esta parte de Compras';
  throw new Error('Não foi possível ' + acao + ': ' + porque);
}

/** Compradores ativos, na ordem: principais e depois substitutos. */
function Cmp_compradoresAtivos_(regras, us) {
  regras = regras || Cmp_regras_(); us = us || Cmp_usuarios_();
  var vistos = {};
  return (regras.compradores || []).concat(regras.substitutos || []).map(Cmp_s_).filter(function (id) {
    if (!id || vistos[id] || !us[id] || !us[id].ativo) return false;
    vistos[id] = true; return true;
  });
}

/** Gestor da área de Compras (Caixa de decisões > Regras e responsáveis, senão o Gestor com a área no cadastro). */
function Cmp_gestoresCompras_(regras, us) {
  regras = regras || Cmp_regras_(); us = us || Cmp_usuarios_();
  var area = Cmp_up_(regras.areaCompras), ids = [];
  try { ids = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {})[area] || []; } catch (e) { ids = []; }
  ids = ids.map(Cmp_s_).filter(function (id) { return us[id] && us[id].ativo; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === area; });
  return ids;
}

/** Diretoria (perfil Diretoria e o dono); sem ninguém, os administradores que não são a conta do sistema; por último qualquer administrador. */
function Cmp_diretoria_(us, excluir) {
  excluir = excluir || [];
  if (typeof Ges_diretoria_ === 'function' && typeof Ges_usuarios_ === 'function') { try { return Ges_diretoria_(Ges_usuarios_(), excluir); } catch (e) {} }
  var ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && (u.perfil === 'DIRETORIA' || Cmp_ehDono_(u.login)) && excluir.indexOf(id) < 0; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.perfil === 'ADMIN' && !Cmp_ehContaSistema_(u) && excluir.indexOf(id) < 0; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { var u = us[id]; return u.ativo && u.perfil === 'ADMIN' && excluir.indexOf(id) < 0; });
  return ids;
}

/** Comprador que recebe uma requisição nova: o primeiro ativo da lista; sem lista, o gestor da área de Compras; sem ele, a Diretoria. */
function Cmp_compradorPara_() {
  var regras = Cmp_regras_(), us = Cmp_usuarios_();
  var lista = Cmp_compradoresAtivos_(regras, us);
  if (lista.length) { var id = lista[0]; return { id: id, nome: us[id].nome, motivo: 'comprador da lista de Regras de compras' }; }
  var g = Cmp_gestoresCompras_(regras, us);
  if (g.length) return { id: g[0], nome: us[g[0]].nome, motivo: 'sem comprador na lista: gestor da área de Compras' };
  var d = Cmp_diretoria_(us, []);
  if (d.length) return { id: d[0], nome: us[d[0]].nome, motivo: 'sem comprador nem gestor de Compras: Diretoria' };
  throw new Error('não há comprador cadastrado. O Administrador escolhe o comprador em Compras > Regras de compras');
}

// ------------------------------------------------------------
// AVISOS DE COMPRAS (sistema na hora; e-mail só no resumo da manhã; nunca WhatsApp; nunca valor)
// ------------------------------------------------------------
/**
 * Aviso a uma pessoa da equipe. Aparece no Início (central de pendências) até ser lido em Compras.
 * opcoes.email: entra no resumo de e-mail da manhã (um por pessoa por dia, só no expediente).
 * Quem fez a ação não é avisado (princípio 8 da matriz): quem chama passa opcoes.autorId.
 * O texto nunca leva valor: quem chama escreve sem R$.
 */
function Cmp_avisar_(destId, tipo, titulo, texto, refId, opcoes) {
  var o = opcoes || {};
  destId = Cmp_s_(destId);
  if (!destId || (o.autorId && Cmp_s_(o.autorId) === destId)) return false;
  try {
    SGO_DATA.insert(CMP_ABAS.AVISOS, { DESTINATARIO_ID: destId, TIPO: tipo, TITULO: Cmp_texto_(titulo, 200), TEXTO: Cmp_texto_(texto, 2000), REF_ID: Cmp_s_(refId),
      DATA: Cmp_agora_(), LIDO_EM: '', EMAIL_SITUACAO: o.email ? 'PENDENTE' : '', EMAIL_EM: '', EMAIL_MOTIVO: '' });
    return true;
  } catch (e) { console.error('Compras, aviso: ' + ((e && e.message) || e)); return false; }
}

// ------------------------------------------------------------
// MINHAS ATIVIDADES (as "missões" do COMMAND viram atividades)
// ------------------------------------------------------------
function Cmp_comoSistema_(fn) {
  var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null;
  var token = 'COMPRAS-' + Utilities.getUuid();
  ATV_PONTE_CTX = { token: token, eu: { id: 'COMPRAS', usuario: 'sistema', nome: 'Compras (rotina)', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  try { return fn(token); } finally { ATV_PONTE_CTX = anterior; }
}

/**
 * Cria uma atividade em Minhas atividades. Sem valores no título nem na descrição.
 * o: { responsavelId, titulo, descricao, prazo, prioridade, clienteId, unidadeId, porQue, onde, como, comoPessoa }
 * Devolve o ID ou lança com a mensagem de Minhas atividades.
 */
function Cmp_criarAtividade_(o) {
  if (typeof Atividades_apiCriar !== 'function') throw new Error('Minhas atividades não está disponível neste servidor');
  if (typeof Atividades_garantirAbas_ === 'function') Atividades_garantirAbas_();
  var payload = { titulo: Cmp_texto_(o.titulo, 200), descricao: Cmp_texto_(o.descricao, 4000), prazo: o.prazo, prioridade: o.prioridade || 'Normal', responsavelId: o.responsavelId,
    modulo: 'compras', moduloNome: 'Compras', clienteId: o.clienteId || '', unidadeId: o.unidadeId || '', porQue: o.porQue || '', onde: o.onde || '', como: o.como || '', restrita: 'SIM' };
  var r;
  if (o.comoPessoa && Cmp_s_(o.comoPessoa.id) === Cmp_s_(o.responsavelId)) {
    // a própria pessoa disparou: a atividade é dela, sem o aviso de "nova atividade para você"
    var ant = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null, tk = 'COMPRAS-P-' + Utilities.getUuid();
    ATV_PONTE_CTX = { token: tk, eu: { id: Cmp_s_(o.comoPessoa.id), usuario: Cmp_s_(o.comoPessoa.login), nome: Cmp_s_(o.comoPessoa.nome), perfil: Cmp_up_(o.comoPessoa.perfil) || 'TECNICO', gestor: false, sistema: 'SGO+' } };
    try { r = Atividades_apiCriar(tk, payload); } finally { ATV_PONTE_CTX = ant; }
  } else r = Cmp_comoSistema_(function (t) { return Atividades_apiCriar(t, payload); });
  if (!r || !r.ok || !r.item) throw new Error(String((r && r.message) || 'Minhas atividades não respondeu').replace(/^Não foi possível [^:]+:\s*/, '').replace(/[.\s]+$/, ''));
  return Cmp_s_(r.item.ID);
}

/** Muda a situação de uma atividade ligada (Concluída / Cancelada). Nunca lança. */
function Cmp_mudarAtividade_(id, situacao, texto) {
  if (!id || typeof Atividades_apiMudarSituacao !== 'function') return false;
  try {
    var a = Cmp_atividade_(id);
    if (!Cmp_atividadeAberta_(a)) return false;
    var r = Cmp_comoSistema_(function (t) { return Atividades_apiMudarSituacao(t, { id: id, situacao: situacao, observacao: Cmp_texto_(texto, 1500), motivo: Cmp_texto_(texto, 1500) || 'Encerrada por Compras.' }); });
    return !!(r && r.ok);
  } catch (e) { return false; }
}
function Cmp_atividade_(id) {
  if (!id || typeof Atividades_abas_ !== 'function') return null;
  try { return SGO_DATA.getById(Atividades_abas_().ATIVIDADES, id); } catch (e) { return null; }
}
function Cmp_atividadeAberta_(a) { return !!a && a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; }

/** Prazo da atividade pela urgência: crítica = hoje (+ N horas, dentro do expediente); alta e normal = 1 dia útil; baixa = 2. */
function Cmp_prazoPorUrgencia_(urgencia, diasUteis) {
  var regras = Cmp_regras_(), agora = Cmp_agora_(), hoje = agora.slice(0, 10);
  var u = Cmp_up_(urgencia);
  if (u === 'CRITICA') {
    var h = Number(agora.slice(11, 13)) + (Number(regras.prazos.criticaHoras) || 4);
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(new Date()) : { dentro: true };
    if (ex.dentro && h <= 18) return hoje + 'T' + Cmp_2_(h) + agora.slice(13, 16);
    return Cmp_somarDiasUteis_(hoje, 1) + 'T12:00';
  }
  var n = diasUteis !== undefined ? diasUteis : (u === 'BAIXA' ? Number(regras.prazos.cotarBaixaDiasUteis) || 2 : Number(regras.prazos.cotarDiasUteis) || 1);
  return Cmp_somarDiasUteis_(hoje, n) + 'T17:00';
}

// ------------------------------------------------------------
// ANEXOS (pasta "Compras - Anexos", sem compartilhar)
// ------------------------------------------------------------
var CMP_PASTA_ANEXOS = 'Compras - Anexos';
var CMP_ANEXO_MAX_BASE64 = 14 * 1024 * 1024;

function Cmp_pastaAnexos_(numeroReq) {
  var raiz = SGO_DocSalvar_pastaPersistente_('CMP_PASTA_ANEXOS_ID', CMP_PASTA_ANEXOS, '');
  return numeroReq && typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(raiz, numeroReq) : raiz;
}

/**
 * Grava um arquivo enviado pela tela. arq: { nome, tipo, base64 }. aceitar: regex da extensão.
 * Devolve { id, nome, url }. Lança no padrão da tela (o quê, por quê e o que fazer).
 */
function Cmp_salvarArquivo_(arq, numeroReq, prefixo, aceitar, oQue) {
  if (!arq || !Cmp_s_(arq.base64) || !Cmp_s_(arq.nome)) throw new Error('falta o arquivo ' + oQue + '. Toque em "Escolher arquivo", selecione e tente de novo');
  if (String(arq.base64).length > CMP_ANEXO_MAX_BASE64) throw new Error('o arquivo ' + oQue + ' passa de 10 MB. Salve em tamanho menor (PDF ou foto reduzida) e anexe de novo');
  if (aceitar && !aceitar.test(Cmp_s_(arq.nome))) throw new Error('o arquivo ' + oQue + ' precisa ser PDF ou imagem (PNG, JPG). Converta e anexe de novo');
  var pasta = Cmp_pastaAnexos_(numeroReq);
  var nome = SGO_DocSalvar_sanitizarNome_((prefixo ? prefixo + ' - ' : '') + Cmp_s_(arq.nome));
  var blob = Utilities.newBlob(Utilities.base64Decode(String(arq.base64).replace(/^data:[^,]+,/, '')), Cmp_s_(arq.tipo) || 'application/octet-stream', nome);
  var f = pasta.createFile(blob);
  return { id: f.getId(), nome: f.getName(), url: f.getUrl() };
}
var CMP_RX_DOC = /\.(pdf|png|jpe?g|webp|heic|eml|msg|txt|docx?|xlsx?)$/i;
var CMP_RX_IMAGEM = /\.(png|jpe?g|webp|heic)$/i;
var CMP_RX_PDF_IMG = /\.(pdf|png|jpe?g|webp|heic)$/i;
