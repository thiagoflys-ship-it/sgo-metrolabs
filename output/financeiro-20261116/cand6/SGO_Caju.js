/****************************************************
 * CONCILIAÇÃO CAJU — MÓDULO DO FINANCEIRO (11/11/2026, pedido do dono)
 *
 * "Vamos criar um outro módulo de conciliação e usar todos os recursos da API do Caju; quero que o Financeiro tenha total
 * controle." O depósito de viagem é feito no cartão Caju. Decisões do dono (11/11/2026): o pedido de crédito é pago com o
 * SALDO DA CONTA CAJU DA EMPRESA (EXISTING_BALANCE); faltando saldo, o sistema avisa e oferece o PIX (código mostrado ao
 * Financeiro); a CATEGORIA do crédito é configurada na tela do Financeiro (sem padrão: a Wanessa escolhe na primeira carga);
 * as credenciais ainda não existem (homologação a pedir ao Caju): tudo funciona com o Caju simulado nos testes e com o
 * ambiente homologação/produção configurável em Chaves e senhas.
 *
 * ARQUIVOS
 *  SGO_Caju_Api.js            cliente da API (token, sponsorId, erros, registro de cada chamada)
 *  SGO_Caju.js (este)         tabelas, caixas de acesso, configuração, histórico, rotina, pendências e a entrada CajuConc_api
 *  SGO_Caju_Colaboradores.js  vínculo pessoa do SGO+ ↔ colaborador do Caju pelo CPF; cadastrar, arquivar e desarquivar
 *  SGO_Caju_Pedidos.js        carga do depósito de viagem pelo Caju (pedido, pagamento, acompanhamento, registro da carga)
 *  SGO_Caju_Extrato.js        importação do extrato CSV do portal (mapeamento assistido, prévia, arquivo original guardado)
 *  SGO_Caju_Conciliacao.js    cruzamento extrato × prestação × cargas × acertos, divergências, Kanban, linha do tempo,
 *                             fechamento por período e centro de custo e os relatórios A4 (inclusive individual e geral)
 *  Tela: JS_ConciliacaoCaju.html (menu Financeiro > Conciliação Caju). Ajuda: SGO_Ajuda_ConciliacaoCaju.js.
 *  Manual: docs/MANUAL_CONCILIACAO_CAJU.md. Guia: output/conciliacao-caju/GUIA_WANESSA_CONCILIACAO.md.
 *
 * CAIXAS DE ACESSO (lote 13, registradas por este módulo, no padrão do lote 12: entram no catálogo só quando o módulo está
 * carregado, por CajuConc_poderesModulo_, e já nascem ligadas). Financeiro: todas. Diretoria e Administrador: só ver. Demais: nada.
 * Proteções fixas: ninguém concilia nem resolve divergência da viagem em que viaja ou que pediu; quem aprovou ou viaja não faz a
 * carga (as mesmas regras de Via_acoes_); credenciais só pelo dono em Chaves e senhas.
 *
 * DEPENDE do Depósito de viagem (SGO_Viagem*.js): usa as funções Via_* (datas, valores, trava, pessoas, caixas) na hora da
 * chamada. Ordem de carga: estes arquivos carregam ANTES de SGO_Poderes.js, SGO_Pendencias e SGO_Viagem.js; por isso aqui só há
 * funções e constantes literais. O registro na central de pendências é feito por Via_registrarTipos_ (SGO_Viagem.js), que
 * chama Cju_registrarTipos_ quando este módulo existe. Nenhuma função devolve Date cru.
 ****************************************************/

var CJU_MODULO = 'conciliacao_caju';
var CJU_TELA = 'conciliacao_caju';
var CJU_ABAS = { CHAMADAS: 'CJU_CHAMADAS', COLABORADORES: 'CJU_COLABORADORES', PESSOAS_CAJU: 'CJU_PESSOAS_CAJU', PEDIDOS: 'CJU_PEDIDOS', IMPORTACOES: 'CJU_IMPORTACOES',
  EXTRATO: 'CJU_EXTRATO', DIVERGENCIAS: 'CJU_DIVERGENCIAS', FECHAMENTOS: 'CJU_FECHAMENTOS', CONFIG: 'CJU_CONFIG', HISTORICO: 'CJU_HISTORICO' };
var CJU_COLUNAS = {
  CJU_COLABORADORES: ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'CPF', 'EMPLOYEE_ID', 'CAJU_NOME', 'CAJU_ARQUIVADO', 'ORIGEM', 'SITUACAO', 'VINCULADO_EM', 'VINCULADO_POR_ID',
    'VINCULADO_POR_NOME', 'DESFEITO_EM', 'DESFEITO_POR_NOME', 'DESFEITO_MOTIVO', 'ATUALIZADO_EM'],
  CJU_PESSOAS_CAJU: ['ID', 'EMPLOYEE_ID', 'CPF', 'NOME', 'EMAIL', 'ARQUIVADO', 'LIDO_EM', 'SUMIU_EM'],
  CJU_PEDIDOS: ['ID', 'SOLICITACAO_ID', 'NUMERO', 'REVISAO', 'APROVADO_HASH', 'CHAVE', 'PEDIDO_CAJU_ID', 'NOME_PEDIDO', 'AMBIENTE', 'PESSOA_ID', 'PESSOA_NOME', 'EMPLOYEE_ID',
    'CATEGORIA', 'VALOR', 'VALOR_CENTAVOS', 'CENTRO_CUSTO_CODIGO', 'CENTRO_CUSTO_CAJU', 'OBSERVACAO', 'SITUACAO', 'STATUS_CAJU', 'PAGAMENTO', 'TOTAL_CENTAVOS', 'TAXA_CENTAVOS',
    'PIX_CODIGO', 'PIX_VENCE', 'NOTA_URL', 'NOTA_NUMERO', 'BOLETO_URL', 'MENSAGEM', 'CARGA_ID', 'CRIADO_EM', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'EFETIVADO_EM', 'CREDITADO_EM',
    'CANCELADO_EM', 'CANCELADO_POR_NOME', 'CANCELADO_MOTIVO', 'CONSULTADO_EM', 'ATUALIZADO_EM'],
  CJU_IMPORTACOES: ['ID', 'ARQUIVO_NOME', 'ARQUIVO_ID', 'ARQUIVO_URL', 'SHA', 'ASSINATURA', 'MAPEAMENTO_JSON', 'LINHAS', 'IMPORTADAS', 'REPETIDAS', 'IGNORADAS', 'PERIODO_DE',
    'PERIODO_ATE', 'TOTAL_GASTOS', 'POR_ID', 'POR_NOME', 'EM', 'DESFEITA_EM', 'DESFEITA_POR_NOME', 'DESFEITA_MOTIVO'],
  CJU_EXTRATO: ['ID', 'IMPORTACAO_ID', 'CHAVE', 'LINHA_NUMERO', 'IDENTIFICADOR', 'DATA', 'HORA', 'VALOR', 'TIPO', 'DESCRICAO', 'ESTABELECIMENTO', 'CNPJ', 'PESSOA_TEXTO', 'CPF',
    'CARTAO_FINAL', 'USUARIO_ID', 'USUARIO_NOME', 'PESSOA_REGRA', 'CENTRO_CUSTO_CAJU', 'CATEGORIA_TXT', 'SOLICITACAO_ID', 'NUMERO', 'GASTO_ID', 'CARGA_ID', 'ACERTO_ID',
    'SITUACAO', 'REGRA', 'CONCILIADO_EM', 'CONCILIADO_POR_NOME', 'MOTIVO', 'FECHAMENTO_ID', 'REMOVIDA_EM', 'LINHA_ORIGINAL_JSON'],
  CJU_DIVERGENCIAS: ['ID', 'CHAVE', 'TIPO', 'SITUACAO', 'SOLICITACAO_ID', 'NUMERO', 'EXTRATO_ID', 'GASTO_ID', 'PEDIDO_ID', 'VALOR', 'DIFERENCA', 'DATA', 'DESCRICAO', 'DONO_ID',
    'DONO_NOME', 'CENTRO_CUSTO_CODIGO', 'CRIADA_EM', 'ATUALIZADA_EM', 'AVISADO_EM', 'AVISADO_POR_NOME', 'RESOLUCAO', 'MOTIVO', 'RESOLVIDA_EM', 'RESOLVIDA_POR_ID',
    'RESOLVIDA_POR_NOME', 'FECHAMENTO_ID'],
  CJU_FECHAMENTOS: ['ID', 'NUMERO', 'DE', 'ATE', 'CENTRO', 'RESSALVA', 'RESUMO_JSON', 'HASH', 'POR_ID', 'POR_NOME', 'EM', 'SITUACAO', 'REABERTO_EM', 'REABERTO_POR_NOME', 'REABERTO_MOTIVO'],
  CJU_CONFIG: ['ID', 'VERSAO', 'VALOR_JSON', 'MOTIVO', 'POR_ID', 'POR_NOME', 'EM'],
  CJU_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'ACAO', 'TEXTO', 'POR_ID', 'POR_NOME', 'EM']
};
var CJU_COLUNAS_TEXTO = {
  CJU_COLABORADORES: ['CPF', 'VINCULADO_EM', 'DESFEITO_EM', 'ATUALIZADO_EM'], CJU_PESSOAS_CAJU: ['CPF', 'LIDO_EM', 'SUMIU_EM'],
  CJU_PEDIDOS: ['NUMERO', 'PEDIDO_CAJU_ID', 'CRIADO_EM', 'EFETIVADO_EM', 'CREDITADO_EM', 'CANCELADO_EM', 'CONSULTADO_EM', 'ATUALIZADO_EM', 'PIX_CODIGO', 'PIX_VENCE', 'CENTRO_CUSTO_CAJU'],
  CJU_IMPORTACOES: ['PERIODO_DE', 'PERIODO_ATE', 'EM', 'DESFEITA_EM'], CJU_EXTRATO: ['DATA', 'HORA', 'IDENTIFICADOR', 'CNPJ', 'CPF', 'CARTAO_FINAL', 'CENTRO_CUSTO_CAJU', 'NUMERO', 'CONCILIADO_EM', 'REMOVIDA_EM'],
  CJU_DIVERGENCIAS: ['NUMERO', 'DATA', 'CRIADA_EM', 'ATUALIZADA_EM', 'AVISADO_EM', 'RESOLVIDA_EM'], CJU_FECHAMENTOS: ['NUMERO', 'DE', 'ATE', 'EM', 'REABERTO_EM'],
  CJU_CONFIG: ['EM'], CJU_HISTORICO: ['EM']
};
/** Categorias do crédito aceitas pelo Caju (código da API). A Wanessa escolhe na primeira carga; sem padrão (decisão do dono). */
var CJU_CATEGORIAS = [
  ['FLEXIBLE', 'FLEXIBLE: saldo flexível (usa em qualquer estabelecimento aceito)'], ['MEAL', 'MEAL: refeição'], ['FOOD', 'FOOD: alimentação (mercado)'],
  ['FOOD_AID', 'FOOD_AID: auxílio-alimentação'], ['TRANSPORTATION', 'TRANSPORTATION: mobilidade'], ['TRANSPORTATION_VOUCHER', 'TRANSPORTATION_VOUCHER: vale-transporte'],
  ['HOME_OFFICE', 'HOME_OFFICE: home office'], ['HEALTH', 'HEALTH: saúde'], ['EDUCATION', 'EDUCATION: educação'], ['CULTURE', 'CULTURE: cultura'],
  ['CASHEW', 'CASHEW: carteira própria do Caju (confirme com o Caju para que serve)']
];
/**
 * MODO DA CARGA (11/11/2026, resposta oficial do Caju, protocolo 02527150): a API de parceiros contempla colaboradores e PEDIDOS DE
 * BENEFÍCIO, não o módulo de Despesas. Ainda não se sabe se a viagem é carregada pelo Caju Despesas ou como benefício: os dois modos
 * ficam prontos e o Financeiro escolhe na Configuração. Padrão: MANUAL (vale também enquanto as credenciais não existirem).
 */
var CJU_MODOS_CARGA = {
  API: 'Carga pelo Caju (pedido de benefício pela API): o SGO+ cria e paga o pedido de crédito no Caju, acompanha e registra a carga sozinho.',
  MANUAL: 'Carga manual (Caju Despesas ou outro): o Financeiro carrega fora do SGO+ e registra aqui a carga com o comprovante; os gastos são conciliados pelo extrato importado.'
};
var CJU_CONFIG_PADRAO = { modoCarga: '', categoria: '', toleranciaDias: 3, janelaAntesDias: 1, janelaDepoisDias: 2, pedidoAlertaHoras: 48, apelidos: {}, mapeamentos: {} };
var CJU_PODERES = ['CAJU_VER', 'CAJU_CONFIGURAR', 'CAJU_COLABORADORES', 'CAJU_CARGA', 'CAJU_CONCILIAR', 'CAJU_FECHAR'];
var CJU_PODERES_LISTA = [
  ['CAJU_VER', 'Conciliação Caju', 'Ver a conciliação Caju', 'Abre Financeiro > Conciliação Caju: créditos pedidos ao Caju, extrato importado, divergências, fechamentos e relatórios A4 (individual e geral). Padrão: Financeiro, Diretoria e Administrador.', 'valores', 13],
  ['CAJU_CONFIGURAR', 'Conciliação Caju', 'Configurar a integração com o Caju', 'Escolhe a categoria do crédito e as tolerâncias da conciliação, testa a conexão e lê o registro das chamadas. As credenciais ficam em Chaves e senhas (só o dono). Padrão: Financeiro.', 'administrar', 13],
  ['CAJU_COLABORADORES', 'Conciliação Caju', 'Manter os colaboradores no Caju', 'Vincula a pessoa do SGO+ ao cadastro do Caju pelo CPF, cadastra no Caju quem falta e arquiva ou desarquiva, sempre com confirmação. Padrão: Financeiro.', 'administrar', 13],
  ['CAJU_CARGA', 'Conciliação Caju', 'Fazer a carga do depósito de viagem pelo Caju', 'Cria o pedido de crédito no Caju (no máximo o aprovado, com a categoria configurada), paga com o saldo da conta ou por PIX, acompanha até creditado e cancela enquanto o Caju deixar. Quem aprovou ou viaja não faz (fixo). Padrão: Financeiro.', 'valores', 13],
  ['CAJU_CONCILIAR', 'Conciliação Caju', 'Conciliar o extrato do Caju', 'Importa o extrato CSV, liga cada transação ao gasto da prestação, trata as divergências com motivo e avisa o responsável. Ninguém concilia a viagem em que viaja ou que pediu (fixo). Padrão: Financeiro.', 'valores', 13],
  ['CAJU_FECHAR', 'Conciliação Caju', 'Fechar o período da conciliação', 'Fecha o período por centro de custo com o A4 de fechamento e reabre com motivo. Padrão: Financeiro.', 'aprovar', 13]
];

// ------------------------------------------------------------
// CAIXAS DE ACESSO (lote 13). SGO_Poderes.js lê por Poderes_modulosExtras_.
// ------------------------------------------------------------
function CajuConc_poderesModulo_() {
  if (typeof Viagem_api !== 'function' || typeof Via_eu_ !== 'function') return null;
  var fin = function (eu, c) { return c.p === 'FINANCEIRO'; };
  return { lista: CJU_PODERES_LISTA, ligados: CJU_PODERES.slice(),
    regras: { CAJU_VER: function (eu, c) { return c.p === 'FINANCEIRO' || !!c.diretoria || !!c.admin; }, CAJU_CONFIGURAR: fin, CAJU_COLABORADORES: fin, CAJU_CARGA: fin, CAJU_CONCILIAR: fin, CAJU_FECHAR: fin } };
}
function Cju_pode_(eu, codigo) { return Via_pode_(eu, codigo); }
function Cju_poderes_(eu) { var r = {}; CJU_PODERES.forEach(function (c) { r[c] = Cju_pode_(eu, c); }); r.VIAGEM_DEPOSITAR = Via_pode_(eu, 'VIAGEM_DEPOSITAR'); return r; }
function Cju_exigir_(eu, codigo, acao) { return Via_exigir_(eu, codigo, acao); }
function Cju_exigirVer_(eu) {
  if (!Cju_pode_(eu, 'CAJU_VER') && !Cju_pode_(eu, 'CAJU_CONCILIAR')) throw new Error('Não foi possível abrir a Conciliação Caju: o módulo é do Financeiro (a Diretoria acompanha). A sua conta não tem a permissão «' + Via_nomeCaixa_('CAJU_VER') + '». Para as suas viagens, use Operação de campo > Depósito de viagem; o relatório individual das suas viagens está lá, em Relatórios A4.');
}

// ------------------------------------------------------------
// TABELAS, MEMÓRIA DA REQUISIÇÃO, HISTÓRICO
// ------------------------------------------------------------
function Cju_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('CJU_ABAS_OK_V1')) return; } catch (e) { cache = null; }
  Object.keys(CJU_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, CJU_COLUNAS[aba]);
    CJU_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    if (typeof CertCal_forcarColunaTexto_ === 'function') (CJU_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (typeof SGO_DATA !== 'undefined') { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } } catch (e) {}
  try { if (cache) cache.put('CJU_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
/** Memória de UMA requisição (Viagem_api e CajuConc_api limpam na entrada; toda gravação limpa). */
var CJU_MEMO = {};
function Cju_memoLimpar_() { CJU_MEMO = {}; }
function Cju_ler_(aba) {
  if (CJU_MEMO[aba]) return CJU_MEMO[aba];
  var l = Via_ler_(aba);
  CJU_MEMO[aba] = l;
  return l;
}
function Cju_inserir_(aba, d) { Cju_memoLimpar_(); return SGO_DATA.insert(aba, d); }
function Cju_atualizar_(aba, id, d) { Cju_memoLimpar_(); return SGO_DATA.update(aba, id, d); }
function Cju_porId_(aba, id) { var r = id ? SGO_DATA.getById(aba, Via_s_(id)) : null; return r || null; }
function Cju_historico_(entidade, id, acao, eu, texto) {
  try {
    SGO_DATA.insert(CJU_ABAS.HISTORICO, { ID: Via_id_(), ENTIDADE: entidade, ENTIDADE_ID: Via_s_(id), ACAO: acao, TEXTO: Via_texto_(texto, 4000), POR_ID: Via_s_(eu && eu.id), POR_NOME: Via_s_(eu && eu.nome) || 'sistema', EM: Via_agora_() });
  } catch (e) { console.error('Conciliação Caju, histórico: ' + Via_erro_(e)); }
}
function Cju_cpf_(v) { return Via_s_(v).replace(/\D/g, ''); }
function Cju_cpfValido_(c) {
  c = Cju_cpf_(c);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i); if (((s * 10) % 11) % 10 !== Number(c[t])) return false; }
  return true;
}
/** CPF para a tela: só os 3 números do meio e os 2 do fim ("***.456.789-**" no padrão de LGPD da Receita). */
function Cju_cpfMascara_(c) { c = Cju_cpf_(c); return c.length === 11 ? '***.' + c.slice(3, 6) + '.' + c.slice(6, 9) + '-**' : ''; }
/** Texto normalizado para comparar nomes (sem acento, minúsculo, espaços simples). */
function Cju_norm_(t) {
  var s = Via_s_(t).toLowerCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}
function Cju_moeda_(v) { return Via_moeda_(v); }
function Cju_centMoeda_(c) { return Via_moeda_((Number(c) || 0) / 100); }
/** Eu da sessão: só a equipe interna (Via_eu_). */
function Cju_eu_(sessionId) { return Via_eu_(sessionId); }
/** Quem viaja ou pediu a viagem não concilia nem resolve divergência dela (fixo). */
function Cju_exigirNaoEnvolvido_(eu, r, oQue) {
  if (!r) return;
  if (Via_conflito_(r).indexOf(eu.id) >= 0) throw new Error('Não foi possível ' + oQue + ': você ' + (Via_s_(r.SOLICITANTE_ID) === eu.id ? 'pediu' : 'viaja n') + 'a viagem ' + Via_s_(r.NUMERO) + ', e ninguém concilia a própria despesa. Outra pessoa do Financeiro faz esta parte.');
}

// ------------------------------------------------------------
// CONFIGURAÇÃO (versões, com motivo; Financeiro)
// ------------------------------------------------------------
function Cju_configLimpa_(p) {
  p = p || {};
  var out = JSON.parse(JSON.stringify(CJU_CONFIG_PADRAO));
  var cat = Via_up_(p.categoria);
  if (CJU_CATEGORIAS.some(function (c) { return c[0] === cat; })) out.categoria = cat;
  var n = function (v, min, max, padrao) { var x = Via_num_(v); return x !== null && x >= min && x <= max && Math.round(x) === x ? x : padrao; };
  out.toleranciaDias = n(p.toleranciaDias, 0, 10, CJU_CONFIG_PADRAO.toleranciaDias);
  out.janelaAntesDias = n(p.janelaAntesDias, 0, 10, CJU_CONFIG_PADRAO.janelaAntesDias);
  out.janelaDepoisDias = n(p.janelaDepoisDias, 0, 15, CJU_CONFIG_PADRAO.janelaDepoisDias);
  out.pedidoAlertaHoras = n(p.pedidoAlertaHoras, 4, 240, CJU_CONFIG_PADRAO.pedidoAlertaHoras);
  out.modoCarga = CJU_MODOS_CARGA[Via_up_(p.modoCarga)] ? Via_up_(p.modoCarga) : '';
  if (p.apelidos && typeof p.apelidos === 'object') Object.keys(p.apelidos).forEach(function (k) { if (k && Via_s_(p.apelidos[k])) out.apelidos[k] = Via_s_(p.apelidos[k]); });
  if (p.mapeamentos && typeof p.mapeamentos === 'object') Object.keys(p.mapeamentos).slice(0, 30).forEach(function (k) { if (p.mapeamentos[k] && typeof p.mapeamentos[k] === 'object') out.mapeamentos[k] = p.mapeamentos[k]; });
  return out;
}
function Cju_config_() {
  if (CJU_MEMO.__config) return CJU_MEMO.__config;
  var c = Cju_configLimpa_({}), versao = 0, em = '', por = '';
  try {
    var l = Cju_ler_(CJU_ABAS.CONFIG).slice().sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
    if (l.length) { var u = l[l.length - 1]; c = Cju_configLimpa_(Via_json_(u.VALOR_JSON, {})); versao = Number(u.VERSAO) || l.length; em = Via_br_(u.EM); por = Via_s_(u.POR_NOME); }
  } catch (e) { /* sem a aba: o padrão vale */ }
  c.versao = versao; c.em = em; c.por = por;
  CJU_MEMO.__config = c;
  return c;
}
/** Grava uma versão nova. Chamar com a trava. mudancas: campos a trocar; motivo obrigatório (exceto as gravações automáticas). */
function Cju_gravarConfig_(eu, mudancas, motivo) {
  var atual = Cju_config_(), novo = Cju_configLimpa_(Object.assign({}, atual, mudancas || {}));
  var versao = (Number(atual.versao) || 0) + 1;
  Cju_inserir_(CJU_ABAS.CONFIG, { ID: Via_id_(), VERSAO: versao, VALOR_JSON: JSON.stringify(novo), MOTIVO: Via_texto_(motivo, 500), POR_ID: eu ? eu.id : '', POR_NOME: eu ? eu.nome : 'sistema', EM: Via_agora_() });
  Cju_historico_('CONFIG', 'CONFIG', 'CONFIG_GRAVADA', eu, 'Versão ' + versao + ': ' + Via_texto_(motivo, 500));
  return Cju_config_();
}
/** Modo em vigor: API só quando escolhido E com as credenciais completas; senão MANUAL (com o motivo). */
function Cju_modoCarga_() {
  var c = Cju_config_(), integ = CajuApi_cfg_();
  if (c.modoCarga === 'API' && integ.completo) return { modo: 'API', texto: CJU_MODOS_CARGA.API, motivo: '' };
  var motivo = c.modoCarga === 'API' ? 'A carga pelo Caju foi escolhida, mas as credenciais não estão completas (falta: ' + integ.faltam.join(', ') + '): vale a carga manual até o responsável pelo sistema gravá-las.'
    : c.modoCarga === 'MANUAL' ? 'Escolhido pelo Financeiro.' : 'Padrão: a carga pelo Caju ainda não foi escolhida na Configuração' + (integ.completo ? '.' : ' (e as credenciais do Caju ainda não existem).');
  return { modo: 'MANUAL', texto: CJU_MODOS_CARGA.MANUAL, motivo: motivo };
}
function Cju_nomeCategoria_(cod) { var c = CJU_CATEGORIAS.filter(function (x) { return x[0] === cod; })[0]; return c ? c[1] : ''; }
function Cju_salvarConfig_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONFIGURAR', 'alterar a configuração da Conciliação Caju');
  d = d || {};
  var motivo = Via_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível gravar a configuração: escreva o motivo da mudança (10 letras ou mais). Cada gravação vira uma versão com quem, quando e por quê.');
  var m = {};
  if (d.categoria !== undefined) {
    var cat = Via_up_(d.categoria);
    if (!CJU_CATEGORIAS.some(function (c) { return c[0] === cat; })) throw new Error('Não foi possível gravar a configuração: escolha a categoria do crédito na lista (é a categoria do Caju em que o dinheiro da viagem cai).');
    m.categoria = cat;
  }
  if (d.modoCarga !== undefined && d.modoCarga !== '') {
    var modo = Via_up_(d.modoCarga);
    if (!CJU_MODOS_CARGA[modo]) throw new Error('Não foi possível gravar a configuração: escolha o modo da carga (pelo Caju ou manual).');
    if (modo === 'API' && !CajuApi_cfg_().completo) throw new Error('Não foi possível escolher a carga pelo Caju: a integração ainda não está configurada (falta: ' + CajuApi_cfg_().faltam.join(', ') + '). Enquanto as credenciais não existirem, a carga é manual. O responsável pelo sistema grava as credenciais em Chaves e senhas, grupo Caju.');
    m.modoCarga = modo;
  }
  ['toleranciaDias', 'janelaAntesDias', 'janelaDepoisDias', 'pedidoAlertaHoras'].forEach(function (k) { if (d[k] !== undefined && d[k] !== '') m[k] = d[k]; });
  return Via_comTrava_(function () { Cju_garantirAbas_(); var c = Cju_gravarConfig_(eu, m, motivo); return { config: Cju_configTela_(c), message: 'Configuração gravada (versão ' + c.versao + ').' }; });
}
function Cju_configTela_(c) {
  c = c || Cju_config_();
  var versoes = [];
  try { versoes = Cju_ler_(CJU_ABAS.CONFIG).slice().sort(function (a, b) { return (Number(b.VERSAO) || 0) - (Number(a.VERSAO) || 0); }).slice(0, 20).map(function (v) { var x = Via_json_(v.VALOR_JSON, {}); return { versao: Number(v.VERSAO) || 0, em: Via_br_(v.EM), por: Via_s_(v.POR_NOME), motivo: Via_s_(v.MOTIVO), categoria: Via_s_(x.categoria) }; }); } catch (e) { versoes = []; }
  var mc = Cju_modoCarga_();
  return { modoCarga: mc.modo, modoEscolhido: c.modoCarga, modoTexto: mc.texto, modoMotivo: mc.motivo, modos: CJU_MODOS_CARGA, categoria: c.categoria, categoriaNome: Cju_nomeCategoria_(c.categoria), toleranciaDias: c.toleranciaDias, janelaAntesDias: c.janelaAntesDias, janelaDepoisDias: c.janelaDepoisDias,
    pedidoAlertaHoras: c.pedidoAlertaHoras, versao: c.versao, em: c.em, por: c.por, versoes: versoes, categorias: CJU_CATEGORIAS, apelidos: Object.keys(c.apelidos || {}).length };
}

// ------------------------------------------------------------
// ROTINA (gatilho de 15 em 15 minutos): acompanha os pedidos de crédito até creditados
// ------------------------------------------------------------
var CJU_FUNCAO_ROTINA = 'CajuConc_rotinaGatilho';
/** Gatilho (nome sem "_" para o agendador achar). Recusado quando chamado pelo navegador. */
function CajuConc_rotinaGatilho() {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  return Cju_rotina_(false);
}
function Cju_garantirRotina_() {
  try {
    var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === CJU_FUNCAO_ROTINA; });
    if (!tem) ScriptApp.newTrigger(CJU_FUNCAO_ROTINA).timeBased().everyMinutes(15).create();
    return { instalado: true, jaExistia: tem };
  } catch (e) { console.error('Conciliação Caju, gatilho: ' + Via_erro_(e)); return { instalado: false }; }
}
function Cju_rotina_(forcar) {
  Cju_memoLimpar_();
  var props = PropertiesService.getScriptProperties(), ult = Number(props.getProperty('CJU_ROTINA_EM')) || 0, agora = Date.now();
  if (!forcar && agora - ult < 9 * 60 * 1000) return { fora: 'rodou há menos de 10 minutos' };
  props.setProperty('CJU_ROTINA_EM', String(agora));
  var r = { pedidos: null };
  try { r.pedidos = typeof Cju_acompanharPedidos_ === 'function' ? Cju_acompanharPedidos_(null, 'rotina') : null; } catch (e) { r.pedidos = { erro: Via_erro_(e).slice(0, 300) }; }
  return r;
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (registrado por Via_registrarTipos_; a fonte roda pela do Depósito de viagem)
// ------------------------------------------------------------
var CJU_PEND_TIPOS = {
  caju_pedido: { modulo: 'viagem', um: 'pedido de crédito no Caju esperando você', varios: 'pedidos de crédito no Caju esperando você', rotulo: 'Resolver o pedido', fazer: 'abra Financeiro > Conciliação Caju > Créditos', tela: { tipo: 'caju' }, origem: 'CAJU' },
  caju_divergencia: { modulo: 'viagem', um: 'divergência da conciliação Caju aberta', varios: 'divergências da conciliação Caju abertas', rotulo: 'Tratar a divergência', fazer: 'abra Financeiro > Conciliação Caju > Divergências', tela: { tipo: 'caju' }, origem: 'CAJU' }
};
function Cju_registrarTipos_() {
  try { if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(CJU_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = CJU_PEND_TIPOS[k]; }); } catch (e) {}
}
/** Chamado pela fonte do Depósito de viagem (Viagem_fontePendencias_). Sem valores no título. Nunca lança. */
function Cju_fontePendencias_(add) {
  try {
    Cju_registrarTipos_();
    if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.caju_pedido) return;
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(CJU_ABAS.PEDIDOS) && !Pend_abaExiste_(CJU_ABAS.DIVERGENCIAS)) return;
    Cju_memoLimpar_();
    var acao = { SALDO_INSUFICIENTE: 'colocar saldo na conta Caju ou pagar por PIX', AGUARDANDO_PIX: 'pagar o PIX mostrado na tela', VERIFICAR: 'conferir no portal do Caju se o pedido foi criado',
      CONFERIR_VALOR: 'conferir o valor que o Caju registrou', RASCUNHO: 'pagar o pedido ou cancelar' };
    var cargas = null;
    Via_ler_(CJU_ABAS.PEDIDOS).forEach(function (p) {
      var s = Via_up_(p.SITUACAO);
      if (!acao[s]) return;
      if (cargas === null) cargas = Via_comPapel_('CAJU_CARGA', []);
      add(Pend_item_('caju_pedido', { id: 'CJU:PED:' + Via_s_(p.ID) + ':' + s, nome: Via_s_(p.NUMERO), publico: 'PESSOA', paraUsuarios: cargas, responsavel: Via_s_(p.CRIADO_POR_NOME), responsavelId: Via_s_(p.CRIADO_POR_ID),
        gravidade: s === 'SALDO_INSUFICIENTE' || s === 'VERIFICAR' ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: 'Pedido de crédito no Caju da viagem ' + Via_s_(p.NUMERO) + ': ' + acao[s], detalhe: 'Para ' + Via_s_(p.PESSOA_NOME) + '. ' + Via_s_(p.MENSAGEM).slice(0, 200),
        oQueFazer: 'Abra Financeiro > Conciliação Caju > Créditos (ou a viagem em Depósito de viagem) e ' + acao[s] + '.', tela: { tipo: 'caju', aba: 'creditos', id: Via_s_(p.SOLICITACAO_ID) } }));
    });
    var abertas = Via_ler_(CJU_ABAS.DIVERGENCIAS).filter(function (d) { return Via_up_(d.SITUACAO) === 'ABERTA'; });
    if (abertas.length) {
      var conc = Via_comPapel_('CAJU_CONCILIAR', []), porSol = {};
      abertas.forEach(function (d) { var k = Via_s_(d.SOLICITACAO_ID) || 'sem'; (porSol[k] = porSol[k] || []).push(d); });
      Object.keys(porSol).forEach(function (k) {
        var l = porSol[k], num = Via_s_(l[0].NUMERO);
        add(Pend_item_('caju_divergencia', { id: 'CJU:DIV:' + k, nome: num || 'sem viagem', publico: 'PESSOA', paraUsuarios: conc, gravidade: 'ATENCAO', dias: null,
          titulo: (l.length === 1 ? '1 divergência' : l.length + ' divergências') + ' na conciliação Caju' + (num ? ' da viagem ' + num : ' (transações sem viagem)'),
          detalhe: l.slice(0, 3).map(function (d) { return Cju_tipoDivNome_(d.TIPO); }).join('; '), oQueFazer: 'Abra Financeiro > Conciliação Caju > Divergências e trate cada uma com o motivo.', tela: { tipo: 'caju', aba: 'divergencias', id: k } }));
      });
    }
  } catch (e) { try { console.error('Conciliação Caju, pendências: ' + Via_erro_(e)); } catch (x) {} }
}
function Cju_tipoDivNome_(t) { return (typeof CJU_DIV_TIPOS !== 'undefined' && CJU_DIV_TIPOS[Via_up_(t)]) ? CJU_DIV_TIPOS[Via_up_(t)].nome : Via_s_(t); }

// ------------------------------------------------------------
// AVISOS
// ------------------------------------------------------------
function Cju_notificar_(ids, refId, titulo, texto) {
  try {
    var us = Via_usuarios_(), lista = [];
    (ids || []).forEach(function (id) { id = Via_s_(id); if (id && us[id] && us[id].ativo && lista.indexOf(id) < 0) lista.push(id); });
    if (!lista.length || typeof SGO_notificar_ !== 'function') return { avisados: 0 };
    var link = '';
    try { link = typeof Ges_linkTela_ === 'function' ? Ges_linkTela_(CJU_TELA) : (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : ''); } catch (e) { link = ''; }
    SGO_notificar_({ usuarios: lista, canais: ['sgo', 'email'], origem: 'CAJU', refId: String(refId).slice(0, 80), titulo: titulo, texto: texto, link: link || undefined });
    return { avisados: lista.length };
  } catch (e) { console.error('Conciliação Caju, aviso: ' + Via_erro_(e)); return { erro: Via_erro_(e) }; }
}

// ------------------------------------------------------------
// ENTRADA ÚNICA DA TELA
// ------------------------------------------------------------
/**
 * acao: iniciar | painel | config | salvarConfig | testarConexao | chamadas |
 *   colaboradores | lerColaboradoresCaju | vincular | desvincular | cadastrarColaborador | arquivarColaborador |
 *   creditos | pedidoCriar | pedidoAtualizar | pedidoAtualizarTodos | pedidoPagarSaldo | pedidoPagarPix | pedidoCancelar | pedidoInformar | pedidoLiberar |
 *   extratoPrevia | extratoImportar | importacoes | importacaoDesfazer |
 *   conciliar | linhas | ligar | desligar | ignorarLinha | definirPessoa | divergencias | resolverDivergencia | reabrirDivergencia | avisarDono | viagem |
 *   fechamentoPrevia | fechar | reabrirFechamento | fechamentos | relatorio (A4: FECHAMENTO, DIVERGENCIAS, CREDITOS, INDIVIDUAL, GERAL).
 * Nunca lança: { ok, ... } ou { ok: false, message }.
 */
function CajuConc_api(sessionId, acao, dados) {
  try {
    Cju_memoLimpar_();
    dados = dados || {};
    var eu = Cju_eu_(sessionId), r;
    acao = Via_s_(acao);
    // o relatório individual: o próprio colaborador gera o dele, sem a caixa do módulo
    if (acao === 'relatorio' && Via_up_(dados.tipo) === 'INDIVIDUAL') r = Cju_relatorioApi_(eu, dados);
    else if (acao === 'iniciar') {
      var pod = Cju_poderes_(eu), ver = pod.CAJU_VER || pod.CAJU_CONCILIAR;
      r = { poderes: pod, ver: ver, eu: { id: eu.id, nome: eu.nome, perfil: eu.perfil }, integracao: CajuApi_situacao_(), modoCarga: Cju_modoCarga_(),
        marca: typeof Fin_marca_ === 'function' ? Fin_marca_({ nome: eu.nome, usuario: eu.usuario || eu.login }) : null }; // 16/11/2026: marca d'água (seção 5)
      if (ver) {
        try { Cju_garantirAbas_(); r.contagens = Cju_contagens_(eu); } catch (e) { r.contagens = {}; }
        if (pod.CAJU_CARGA || pod.CAJU_CONCILIAR) Cju_garantirRotina_();
      }
    } else {
      // pedidos a partir da tela do Depósito de viagem: CAJU_CARGA basta (sem precisar abrir o módulo)
      var dePedido = /^pedido/.test(acao);
      if (!dePedido) Cju_exigirVer_(eu);
      Cju_garantirAbas_();
      switch (acao) {
        case 'painel': r = Cju_painel_(eu, dados); break;
        case 'config': r = { config: Cju_configTela_(), integracao: CajuApi_situacao_(), podeAlterar: Cju_pode_(eu, 'CAJU_CONFIGURAR') }; break;
        case 'salvarConfig': r = Cju_salvarConfig_(eu, dados); break;
        case 'testarConexao': r = Cju_testarConexao_(eu); break;
        case 'chamadas': r = Cju_chamadasTela_(eu, dados); break;
        case 'colaboradores': r = Cju_colaboradoresTela_(eu); break;
        case 'lerColaboradoresCaju': r = Cju_lerColaboradoresCaju_(eu); break;
        case 'vincular': r = Cju_vincular_(eu, dados); break;
        case 'desvincular': r = Cju_desvincular_(eu, dados); break;
        case 'cadastrarColaborador': r = Cju_cadastrarColaborador_(eu, dados); break;
        case 'arquivarColaborador': r = Cju_arquivarColaborador_(eu, dados); break;
        case 'creditos': r = Cju_creditosTela_(eu, dados); break;
        case 'pedidoCriar': r = Cju_pedidoCriar_(eu, dados); break;
        case 'pedidoAtualizar': r = Cju_pedidoAtualizarApi_(eu, dados); break;
        case 'pedidoAtualizarTodos': Cju_exigir_(eu, 'CAJU_CARGA', 'atualizar os pedidos de crédito'); r = { resumo: Cju_acompanharPedidos_(eu, 'tela') }; r.message = Cju_resumoAcompanhamento_(r.resumo); break;
        case 'pedidoPagarSaldo': r = Cju_pedidoPagarApi_(eu, dados, 'EXISTING_BALANCE'); break;
        case 'pedidoPagarPix': r = Cju_pedidoPagarApi_(eu, dados, 'PIX_CODE'); break;
        case 'pedidoCancelar': r = Cju_pedidoCancelar_(eu, dados); break;
        case 'pedidoInformar': r = Cju_pedidoInformar_(eu, dados); break;
        case 'pedidoLiberar': r = Cju_pedidoLiberar_(eu, dados); break;
        case 'extratoPrevia': r = Cju_extratoPrevia_(eu, dados); break;
        case 'extratoImportar': r = Cju_extratoImportar_(eu, dados); break;
        case 'importacoes': r = { importacoes: Cju_importacoesTela_() }; break;
        case 'importacaoDesfazer': r = Cju_importacaoDesfazer_(eu, dados); break;
        case 'conciliar': Cju_exigir_(eu, 'CAJU_CONCILIAR', 'conciliar'); r = { resumo: Cju_conciliar_(eu) }; r.message = Cju_resumoConciliacaoTxt_(r.resumo); break;
        case 'linhas': r = Cju_linhasTela_(eu, dados); break;
        case 'ligar': r = Cju_ligar_(eu, dados); break;
        case 'desligar': r = Cju_desligar_(eu, dados); break;
        case 'ignorarLinha': r = Cju_ignorarLinha_(eu, dados); break;
        case 'definirPessoa': r = Cju_definirPessoa_(eu, dados); break;
        case 'divergencias': r = Cju_divergenciasTela_(eu, dados); break;
        case 'resolverDivergencia': r = Cju_resolverDivergencia_(eu, dados); break;
        case 'reabrirDivergencia': r = Cju_reabrirDivergencia_(eu, dados); break;
        case 'avisarDono': r = Cju_avisarDono_(eu, dados); break;
        case 'viagem': r = Cju_viagemTela_(eu, dados); break;
        case 'fechamentoPrevia': r = Cju_fechamentoPrevia_(eu, dados); break;
        case 'fechar': r = Cju_fechar_(eu, dados); break;
        case 'reabrirFechamento': r = Cju_reabrirFechamento_(eu, dados); break;
        case 'fechamentos': r = { fechamentos: Cju_fechamentosTela_() }; break;
        case 'relatorio': r = Cju_relatorioApi_(eu, dados); break;
        default: throw new Error('Não foi possível concluir: ação desconhecida na Conciliação Caju. Atualize a página (F5) e tente de novo.');
      }
    }
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: Via_erro_(e) };
  }
}
function Cju_testarConexao_(eu) {
  Cju_exigir_(eu, 'CAJU_CONFIGURAR', 'testar a conexão com o Caju');
  var t = CajuApi_testar_({ origem: 'teste', porId: eu.id, porNome: eu.nome });
  Cju_historico_('CONFIG', 'CONEXAO', 'CONEXAO_TESTADA', eu, 'Conexão com o Caju testada (' + t.ambienteNome + '): acesso concedido.');
  return { teste: t, message: 'Conexão com o Caju funcionando (' + t.ambienteNome + '). Conta da empresa terminada em ' + t.sponsorFinal + '; acesso válido até ' + t.validoAte + '.' };
}
function Cju_chamadasTela_(eu, d) {
  Cju_exigir_(eu, 'CAJU_CONFIGURAR', 'ler o registro das chamadas ao Caju');
  var l = [];
  try { l = Via_ler_(CJU_ABAS.CHAMADAS); } catch (e) { l = []; }
  l = l.sort(function (a, b) { return Via_s_(b.EM).localeCompare(Via_s_(a.EM)); }).slice(0, Math.min(300, Number(d && d.limite) || 100));
  return { chamadas: l.map(function (c) { return { em: Via_br_(c.EM), ambiente: Via_s_(c.AMBIENTE), metodo: Via_s_(c.METODO), caminho: Via_s_(c.CAMINHO), http: Number(c.HTTP) || 0, ms: Number(c.MS) || 0,
    ok: Via_up_(c.RESULTADO) === 'OK', mensagem: Via_s_(c.MENSAGEM), origem: Via_s_(c.ORIGEM), ref: Via_s_(c.REF), por: Via_s_(c.POR_NOME) }; }) };
}
