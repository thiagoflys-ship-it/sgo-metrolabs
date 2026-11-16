/****************************************************
 * GANHOS DOS VENDEDORES — ETAPA 1 (12/11/2026, pedido do dono)
 *
 * Pedido: "Cada vendedor possui uma negociação, ou seja, um contrato de trabalho [...] uma tela onde cada vendedor tem seu
 * painel de configuração de ganhos e que tanto o vendedor quanto o financeiro têm acesso para fazer fechamento e pagamento;
 * painel com índices, gráficos, desempenho, IA avaliando."
 * Tela: JS_GanhosVendedores.html (menu Ganhos dos vendedores). Ajuda: SGO_Ajuda_GanhosVendedores.js.
 * Manual: docs/MANUAL_GANHOS_VENDEDORES.md.
 *
 * DECISÕES DO DONO (12/11/2026), aplicadas aqui sem alternativa:
 *  - Base de cálculo: o valor RECEBIDO (só conta quando o cliente paga), pela data do recebimento.
 *  - Faixa cheia: a faixa atingida no mês vale sobre o total do mês (R$ 50.000,00 no mês -> 3% -> R$ 1.500,00).
 *    "Até X" inclui X: até 30.000,00 = 2%; 30.000,01 já é a faixa seguinte.
 *  - Período mensal (competência aaaa-mm).
 *  - Fechamento: o vendedor confere -> o Financeiro fecha -> a Diretoria aprova -> o Financeiro registra o pagamento.
 *    Cada passo grava quem, quando e a observação; nada é apagado (GAN_HISTORICO).
 *  - Cada vendedor tem o próprio contrato (faixas e vigência). Contrato novo vale a partir da competência informada e não
 *    altera mês fechado (o fechamento guarda a cópia do cálculo: CALCULO_JSON e CALCULO_HASH).
 *
 * DE ONDE VEM O "RECEBIDO" (levantamento de 12/11/2026)
 *  - O legado não tem título baixado nem contas a receber: COM_PROPOSTAS não guarda nota nem recebimento, e o banco
 *    principal não tem abas FIN_*. O Omie só é consultado ao vivo pela rota /financeiro do servidor Node
 *    (src/servicos/financeiro.ts: ListarContasReceber, sem gravar nada), e o código do cliente no Omie não está ligado ao
 *    cadastro de clientes nem à proposta. financeiro_conciliacoes guarda só o casamento OFX x lançamento do Omie.
 *  - Por isso a ETAPA 1 usa o lançamento do Financeiro: o recebimento é registrado aqui (data, valor, documento/nota)
 *    ligado a uma proposta aprovada pelo cliente; o vendedor é o RESPONSÁVEL da proposta (ou, sem ele, da oportunidade).
 *    Sem proposta ou sem responsável, o recebimento fica "a classificar" e não entra em nenhuma comissão (nunca se atribui
 *    por suposição). A coluna ORIGEM (MANUAL) e REF_EXTERNA ficam prontas para a sugestão automática pelo Omie (etapa 2).
 *
 * PERMISSÕES (caixas, SGO_Poderes.js, registradas por este arquivo em SGO_PODERES_MODULOS, lote 14, já ligadas):
 *   GANHOS_VER_TODOS, GANHOS_CONTRATOS, GANHOS_RECEBIMENTOS, GANHOS_FECHAR, GANHOS_APROVAR, GANHOS_PAGAR, GANHOS_REABRIR.
 *   Padrão: Financeiro (perfil ou área) vê todos, mantém contratos, lança recebimentos, fecha e paga; a Diretoria vê todos,
 *   mantém contratos, aprova e reabre. O vendedor vê só os próprios ganhos e confere o próprio mês.
 *   Proteções fixas (não dependem de caixa): ninguém mantém o próprio contrato, lança recebimento da própria venda, fecha,
 *   aprova, paga ou reabre o próprio mês; quem fechou não aprova; quem aprovou não registra o pagamento; só o vendedor
 *   confere o próprio mês.
 *
 * Abas (criadas no primeiro uso, nada é apagado): GAN_CONTRATOS, GAN_RECEBIMENTOS, GAN_FECHAMENTOS, GAN_HISTORICO,
 * GAN_AVALIACOES. Pendências: central do Início (vendedor e Financeiro) e Caixa de decisões (aprovação da Diretoria).
 * Ordem de carga: este arquivo carrega depois de SGO_Alertas_* e antes de SGO_Gestao_* e SGO_Poderes.js; as listas da Caixa
 * (GES_TIPOS) são completadas na hora do uso (GV_registrarTipos_), e a das caixas aceita registro antes do motor.
 * Nenhuma função devolve Date cru. Funções públicas: só GanhosVendedores_api (sessionId, acao, dados).
 ****************************************************/

var GV_FUSO = 'America/Sao_Paulo';
var GV_MODULO = 'ganhos';
var GV_TELA = 'ganhos_vendedores';
var GV_ABAS = { CONTRATOS: 'GAN_CONTRATOS', RECEBIMENTOS: 'GAN_RECEBIMENTOS', FECHAMENTOS: 'GAN_FECHAMENTOS', HISTORICO: 'GAN_HISTORICO', AVALIACOES: 'GAN_AVALIACOES' };
var GV_COLUNAS = {
  GAN_CONTRATOS: ['ID', 'VENDEDOR_ID', 'VENDEDOR_NOME', 'VIGENCIA_INICIO', 'BASE', 'REGRA', 'FAIXAS_JSON', 'OBSERVACAO', 'MOTIVO', 'SITUACAO', 'HASH',
    'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'CRIADO_EM', 'CANCELADO_EM', 'CANCELADO_POR_ID', 'CANCELADO_POR_NOME', 'CANCELADO_MOTIVO'],
  GAN_RECEBIMENTOS: ['ID', 'SITUACAO', 'ORIGEM', 'REF_EXTERNA', 'PROPOSTA_ID', 'PROPOSTA_NUMERO', 'OPORTUNIDADE_ID', 'CLIENTE_ID', 'CLIENTE_NOME', 'VENDEDOR_ID',
    'VENDEDOR_NOME', 'VENDEDOR_ORIGEM', 'DATA_RECEBIMENTO', 'COMPETENCIA', 'VALOR', 'DOCUMENTO', 'OBSERVACAO', 'JUSTIFICATIVA_ACIMA', 'LANCADO_POR_ID',
    'LANCADO_POR_NOME', 'LANCADO_EM', 'CLASSIFICADO_EM', 'CLASSIFICADO_POR_NOME', 'ANULADO_EM', 'ANULADO_POR_ID', 'ANULADO_POR_NOME', 'ANULADO_MOTIVO', 'CRIADO_EM'],
  GAN_FECHAMENTOS: ['ID', 'VENDEDOR_ID', 'VENDEDOR_NOME', 'COMPETENCIA', 'SITUACAO', 'CONTRATO_ID', 'RECEBIDO_TOTAL', 'PERCENTUAL', 'COMISSAO', 'CALCULO_JSON',
    'CALCULO_HASH', 'CONFERIDO_HASH', 'CONFERIDO_EM', 'CONFERIDO_POR_ID', 'CONFERIDO_POR_NOME', 'CONFERIDO_OBS', 'CONTESTADO_HASH', 'CONTESTADO_EM',
    'CONTESTADO_MOTIVO', 'RESPOSTA_CONTESTACAO', 'FECHADO_EM', 'FECHADO_POR_ID', 'FECHADO_POR_NOME', 'APROVADO_EM', 'APROVADO_POR_ID', 'APROVADO_POR_NOME',
    'APROVADO_OBS', 'DEVOLVIDO_EM', 'DEVOLVIDO_POR_ID', 'DEVOLVIDO_POR_NOME', 'DEVOLVIDO_MOTIVO', 'PAGO_EM', 'PAGO_POR_ID', 'PAGO_POR_NOME', 'PAGAMENTO_DATA',
    'PAGAMENTO_FORMA', 'PAGAMENTO_VALOR', 'PAGAMENTO_OBS', 'COMPROVANTE_ID', 'COMPROVANTE_URL', 'COMPROVANTE_NOME', 'REABERTO_EM', 'REABERTO_POR_NOME',
    'REABERTO_MOTIVO', 'REABERTURAS', 'ATUALIZADO_EM', 'CRIADO_EM'],
  GAN_HISTORICO: ['ID', 'ENTIDADE', 'ENTIDADE_ID', 'VENDEDOR_ID', 'COMPETENCIA', 'ACAO', 'DE', 'PARA', 'TEXTO', 'POR_ID', 'POR_NOME', 'EM'],
  GAN_AVALIACOES: ['ID', 'VENDEDOR_ID', 'COMPETENCIA', 'ORIGEM', 'TEXTO', 'FATOS_JSON', 'VERIFICACAO', 'POR_ID', 'POR_NOME', 'EM']
};
var GV_COLUNAS_TEXTO = {
  GAN_CONTRATOS: ['VIGENCIA_INICIO', 'CRIADO_EM', 'CANCELADO_EM'],
  GAN_RECEBIMENTOS: ['DATA_RECEBIMENTO', 'COMPETENCIA', 'DOCUMENTO', 'PROPOSTA_NUMERO', 'REF_EXTERNA', 'LANCADO_EM', 'CLASSIFICADO_EM', 'ANULADO_EM', 'CRIADO_EM'],
  GAN_FECHAMENTOS: ['COMPETENCIA', 'CONFERIDO_EM', 'CONTESTADO_EM', 'FECHADO_EM', 'APROVADO_EM', 'DEVOLVIDO_EM', 'PAGO_EM', 'PAGAMENTO_DATA', 'REABERTO_EM', 'ATUALIZADO_EM', 'CRIADO_EM'],
  GAN_HISTORICO: ['COMPETENCIA', 'EM'], GAN_AVALIACOES: ['COMPETENCIA', 'EM']
};

/** Situações do mês. EM_ANDAMENTO não é gravada: é o mês corrente (ou futuro), que ainda não pode ser conferido. */
var GV_SITUACOES = {
  EM_ANDAMENTO: 'Mês em andamento', ABERTO: 'Aberto: aguardando a conferência do vendedor', CONFERIDO: 'Conferido pelo vendedor: aguardando o Financeiro',
  CONTESTADO: 'Contestado pelo vendedor: aguardando o Financeiro', FECHADO: 'Fechado pelo Financeiro: aguardando a Diretoria',
  DEVOLVIDO: 'Devolvido pela Diretoria: aguardando o Financeiro', APROVADO: 'Aprovado pela Diretoria: aguardando o pagamento', PAGO: 'Pago'
};
/** Situações em que os números estão congelados (cópia do cálculo guardada). */
var GV_CONGELADOS = ['FECHADO', 'APROVADO', 'PAGO'];
var GV_FORMAS_PAGAMENTO = { PIX: 'PIX', TRANSFERENCIA: 'Transferência bancária', FOLHA: 'Junto com a folha de pagamento', OUTRA: 'Outra forma (descrita na observação)' };
var GV_MOTIVO_MIN = 15;
var GV_MESES_PAINEL = 12;
var GV_MESES_PENDENCIA = 12;
var GV_MAX_FAIXAS = 10;
var GV_PASTA_COMPROVANTES = 'Ganhos dos vendedores - Comprovantes';
var GV_RX_ANEXO = /\.(pdf|png|jpe?g|webp|heic)$/i;
var GV_ANEXO_MAX_BASE64 = 14 * 1024 * 1024;
var GV_NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Modelo oferecido na tela (não é gravado sozinho): a negociação da Mônica, como o dono escreveu em 12/11/2026.
 * As lacunas da mensagem (30 a 31 mil etc.) foram lidas como faixas contínuas, por decisão do dono.
 */
var GV_MODELO_MONICA = {
  nome: 'Negociação da Mônica (mensagem do dono de 12/11/2026)',
  texto: 'Até R$ 30.000,00: 2%; acima de R$ 30.000,00 até R$ 60.000,00: 3%; acima de R$ 60.000,00 até R$ 80.000,00: 4%; acima de R$ 80.000,00: 5%. Faixa cheia sobre o recebido no mês.',
  faixas: [{ ate: 30000, pct: 2 }, { ate: 60000, pct: 3 }, { ate: 80000, pct: 4 }, { ate: null, pct: 5 }]
};

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function GV_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function GV_up_(v) { return GV_s_(v).toUpperCase(); }
function GV_erro_(e) { return String((e && e.message) || e || 'erro desconhecido'); }
function GV_2_(n) { return (n < 10 ? '0' : '') + n; }
function GV_agora_() { return Utilities.formatDate(new Date(), GV_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function GV_hoje_() { return Utilities.formatDate(new Date(), GV_FUSO, 'yyyy-MM-dd'); }
function GV_compAtual_() { return GV_hoje_().slice(0, 7); }
function GV_id_() { try { return Utilities.getUuid(); } catch (e) { return 'gan-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); } }
function GV_json_(t, padrao) { try { var v = JSON.parse(GV_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function GV_texto_(v, max) { var s = GV_s_(v).replace(/\r\n/g, '\n'); return max && s.length > max ? s.slice(0, max) : s; }
/** "aaaa-mm-ddTHH:mm" de qualquer valor de data do banco ('' se não der para ler). */
function GV_iso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, GV_FUSO, "yyyy-MM-dd'T'HH:mm");
  var s = GV_s_(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (m) {
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) && m[4]) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, GV_FUSO, "yyyy-MM-dd'T'HH:mm"); }
    return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? 'T' + m[4] + ':' + m[5] : '');
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s);
  return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] : '') : '';
}
function GV_dia_(v) { return GV_iso_(v).slice(0, 10); }
function GV_br_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(GV_iso_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function GV_brDia_(v) { return GV_br_(v).slice(0, 10); }
/** Competência "aaaa-mm" de texto, Date ou "mm/aaaa" ('' se inválida). */
function GV_comp_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return GV_iso_(v).slice(0, 7);
  var s = GV_s_(v), m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) { var b = /^(\d{2})\/(\d{4})$/.exec(s); if (b) m = [s, b[2], b[1]]; }
  if (!m) return '';
  var mes = Number(m[2]), ano = Number(m[1]);
  if (mes < 1 || mes > 12 || ano < 2020 || ano > 2100) return '';
  return m[1] + '-' + m[2];
}
function GV_compBr_(comp) { var m = /^(\d{4})-(\d{2})$/.exec(GV_s_(comp)); return m ? m[2] + '/' + m[1] : GV_s_(comp); }
function GV_compNome_(comp) { var m = /^(\d{4})-(\d{2})$/.exec(GV_s_(comp)); return m ? GV_NOMES_MES[Number(m[2]) - 1] + ' de ' + m[1] : GV_s_(comp); }
function GV_somarMeses_(comp, n) {
  var m = /^(\d{4})-(\d{2})$/.exec(GV_s_(comp));
  if (!m) return '';
  var t = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
  return Math.floor(t / 12) + '-' + GV_2_((t % 12) + 1);
}
function GV_diasEntre_(diaA, diaB) {
  var a = /^(\d{4})-(\d{2})-(\d{2})/.exec(GV_s_(diaA)), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(GV_s_(diaB));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 864e5);
}
/** Número pt-BR da tela ou do banco ("1.234,56", "R$ 250,00", "2,5", 1234.56). null = vazio ou inválido. */
function GV_num_(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = GV_s_(v).replace(/R\$|%|\s/g, '');
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}
function GV_cent_(v) { var n = Number(v) || 0; return Math.round(n * 100 + (n >= 0 ? 1e-7 : -1e-7)); }
function GV_r2_(v) { return GV_cent_(v) / 100; }
function GV_numBr_(n, casas) {
  var neg = n < 0, f = Math.abs(Number(n) || 0).toFixed(casas), p = f.split('.');
  var int = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + int + (casas ? ',' + p[1] : '');
}
/** "R$ 1.234,56". */
function GV_moeda_(v) { return 'R$ ' + GV_numBr_(GV_r2_(v), 2); }
/** "2%", "2,5%". */
function GV_pct_(v) { var n = Number(v) || 0; return GV_numBr_(n, Math.round(n) === n ? 0 : (Math.round(n * 10) === n * 10 ? 1 : 2)) + '%'; }
function GV_marca_(texto) {
  try {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto || ''), Utilities.Charset.UTF_8);
    return b.map(function (x) { var h = ((x < 0 ? x + 256 : x)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  } catch (e) {
    var h1 = 5381, s = String(texto || '');
    for (var i = 0; i < s.length; i++) h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) | 0;
    return 'h' + (h1 >>> 0).toString(16);
  }
}
function GV_primeiroNome_(nome) { var p = GV_s_(nome).split(/\s+/)[0] || ''; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''; }

// ------------------------------------------------------------
// ABAS, TRAVA E HISTÓRICO
// ------------------------------------------------------------
function GV_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('GAN_ABAS_OK_V1')) return; } catch (e) { cache = null; }
  Object.keys(GV_COLUNAS).forEach(function (aba) {
    CertCal_garantirTabela_(aba, GV_COLUNAS[aba]);
    GV_COLUNAS[aba].forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    if (typeof CertCal_forcarColunaTexto_ === 'function') (GV_COLUNAS_TEXTO[aba] || []).forEach(function (c) { CertCal_forcarColunaTexto_(aba, c); });
  });
  try { if (typeof SGO_DATA !== 'undefined') { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } } catch (e) {}
  try { if (cache) cache.put('GAN_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function GV_ler_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { if (/Aba não encontrada|not found/i.test(GV_erro_(e))) return []; throw e; }
}
var GV_MEMO = null;
function GV_memoLimpar_() { GV_MEMO = null; }
function GV_memo_() { if (!GV_MEMO) GV_MEMO = {}; return GV_MEMO; }
function GV_lerMemo_(aba) { var m = GV_memo_(); if (!m[aba]) m[aba] = GV_ler_(aba); return m[aba]; }
function GV_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (e) { throw new Error('Não foi possível gravar agora: outra pessoa está gravando no SGO+ neste momento. Espere alguns segundos e toque de novo; nada foi alterado.'); }
  GV_memoLimpar_();
  try { GV_garantirAbas_(); return fn(); } finally {
    GV_memoLimpar_();
    try { SpreadsheetApp.flush(); } catch (e) {}
    try { lock.releaseLock(); } catch (e2) {}
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e3) {} }
  }
}
function GV_historico_(entidade, id, acao, eu, x) {
  x = x || {};
  try {
    SGO_DATA.insert(GV_ABAS.HISTORICO, { ID: GV_id_(), ENTIDADE: entidade, ENTIDADE_ID: GV_s_(id), VENDEDOR_ID: GV_s_(x.vendedorId), COMPETENCIA: GV_s_(x.competencia), ACAO: acao,
      DE: GV_texto_(x.de, 300), PARA: GV_texto_(x.para, 300), TEXTO: GV_texto_(x.texto, 6000), POR_ID: GV_s_(eu && eu.id), POR_NOME: GV_s_(eu && eu.nome), EM: GV_agora_() });
  } catch (e) { console.error('Ganhos dos vendedores, histórico: ' + GV_erro_(e)); }
}

// ------------------------------------------------------------
// PESSOAS E CAIXAS DE ACESSO
// ------------------------------------------------------------
var GV_FORA = ['CLIENTE', 'REPRESENTADA', 'AUVO_SYNC'];
var GV_PODERES = ['GANHOS_VER_TODOS', 'GANHOS_CONTRATOS', 'GANHOS_RECEBIMENTOS', 'GANHOS_FECHAR', 'GANHOS_APROVAR', 'GANHOS_PAGAR', 'GANHOS_REABRIR'];
function GV_ehFinanceiro_(perfil, area) { return GV_up_(perfil) === 'FINANCEIRO' || GV_up_(area) === 'FINANCEIRO'; }
/** Regra padrão de cada caixa. c: { p, diretoria } (Poderes_base_ ou o equivalente local); eu: { perfil, area }. */
var GV_PADRAO = {
  GANHOS_VER_TODOS: function (eu, c) { return !!c.diretoria || GV_ehFinanceiro_(c.p, eu.area); },
  GANHOS_CONTRATOS: function (eu, c) { return !!c.diretoria || GV_ehFinanceiro_(c.p, eu.area); },
  GANHOS_RECEBIMENTOS: function (eu, c) { return GV_ehFinanceiro_(c.p, eu.area); },
  GANHOS_FECHAR: function (eu, c) { return GV_ehFinanceiro_(c.p, eu.area); },
  GANHOS_APROVAR: function (eu, c) { return !!c.diretoria; },
  GANHOS_PAGAR: function (eu, c) { return GV_ehFinanceiro_(c.p, eu.area); },
  GANHOS_REABRIR: function (eu, c) { return !!c.diretoria; }
};
var GV_PODERES_ITENS = [
  ['GANHOS_VER_TODOS', 'Ganhos dos vendedores', 'Ver os ganhos de todos os vendedores', 'Abre o painel, a apuração, os recebimentos, os contratos e o fechamento de todos os vendedores e o comparativo entre eles. Sem esta caixa, o vendedor vê só os próprios ganhos. Padrão: Financeiro e Diretoria.', 'valores', 14],
  ['GANHOS_CONTRATOS', 'Ganhos dos vendedores', 'Manter o contrato de ganhos dos vendedores', 'Cadastra o contrato de cada vendedor (faixas, percentuais e vigência) e cancela contrato não usado em mês fechado, sempre com motivo. Ninguém mantém o próprio contrato (fixo). Padrão: Financeiro e Diretoria.', 'administrar', 14],
  ['GANHOS_RECEBIMENTOS', 'Ganhos dos vendedores', 'Lançar recebimentos para a comissão', 'Registra o valor recebido do cliente ligado à proposta (data, valor e documento), classifica o recebimento sem vendedor e anula lançamento errado com motivo. Ninguém lança a própria venda (fixo). Padrão: Financeiro.', 'valores', 14],
  ['GANHOS_FECHAR', 'Ganhos dos vendedores', 'Fechar o mês de ganhos do vendedor', 'Fecha o mês conferido (ou contestado, com a resposta) e congela os números. Ninguém fecha o próprio mês (fixo). Padrão: Financeiro.', 'operar', 14],
  ['GANHOS_APROVAR', 'Ganhos dos vendedores', 'Aprovar o fechamento de ganhos', 'Aprova ou devolve, com motivo, o mês fechado pelo Financeiro. Quem fechou e o próprio vendedor não aprovam (fixo). Padrão: Diretoria.', 'aprovar', 14],
  ['GANHOS_PAGAR', 'Ganhos dos vendedores', 'Registrar o pagamento da comissão', 'Registra o pagamento do mês aprovado (data, forma, valor e comprovante opcional). Quem aprovou e o próprio vendedor não registram (fixo). Padrão: Financeiro.', 'valores', 14],
  ['GANHOS_REABRIR', 'Ganhos dos vendedores', 'Reabrir mês de ganhos fechado', 'Reabre mês fechado ou aprovado, com motivo; o mês volta para a conferência do vendedor e o cálculo antigo fica no histórico. Padrão: Diretoria.', 'administrar', 14]
];
// Registro no catálogo de caixas (SGO_Poderes.js lê SGO_PODERES_MODULOS; a ordem de carga não importa).
var SGO_PODERES_MODULOS = (typeof SGO_PODERES_MODULOS !== 'undefined' && SGO_PODERES_MODULOS) || [];
GV_PODERES_ITENS.forEach(function (it) {
  if (SGO_PODERES_MODULOS.some(function (m) { return m && m.item && m.item[0] === it[0]; })) return;
  SGO_PODERES_MODULOS.push({ item: it, padrao: GV_PADRAO[it[0]], ligado: true });
});

/** Equipe interna: { id: { id, login, nome, perfil, area, ativo, email } }. */
function GV_usuarios_() {
  var m = GV_memo_();
  if (m.usuarios) return m.usuarios;
  var r = {};
  GV_ler_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    var perfil = GV_up_(u.PERFIL), id = GV_s_(u.ID);
    if (!id || !perfil || GV_FORA.indexOf(perfil) >= 0 || GV_s_(u.EXCLUIDO_EM)) return;
    r[id] = { id: id, login: GV_s_(u.USUARIO).toLowerCase(), nome: GV_s_(u.NOME) || GV_s_(u.USUARIO), perfil: perfil, area: GV_up_(u.AREA),
      ativo: GV_up_(u.STATUS || 'ATIVO') === 'ATIVO', email: GV_s_(u.EMAIL).toLowerCase() };
  });
  m.usuarios = r;
  return r;
}
function GV_ehDono_(login) { try { return typeof Chaves_ehDonoUsuario_ === 'function' && !!Chaves_ehDonoUsuario_(login); } catch (e) { return false; } }
function GV_eu_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = GV_up_(s.perfil);
  if (GV_FORA.indexOf(perfil) >= 0) throw new Error('Ganhos dos vendedores é da equipe interna da Metrolabs. Esta conta não usa este módulo. Volte ao Início.');
  var u = GV_usuarios_()[GV_s_(s.userId)] || {};
  return { id: GV_s_(s.userId), login: GV_s_(s.usuario).toLowerCase(), nome: GV_s_(s.nome) || u.nome || GV_s_(s.usuario), perfil: perfil, area: u.area || '', sessao: s };
}
function GV_sessaoDe_(u) { return { userId: u.id, usuario: u.login, perfil: u.perfil, nome: u.nome }; }
function GV_motorCaixas_(codigo) {
  try { return typeof SGO_pode_ === 'function' && typeof SGO_poderesCatalogo_ === 'function' && !!SGO_poderesCatalogo_().mapa[codigo]; } catch (e) { return false; }
}
/** A pessoa tem a caixa? Pelo motor de caixas quando ele está carregado; sem ele, pela mesma regra padrão (o dono, tudo). */
function GV_pode_(eu, codigo) {
  if (GV_motorCaixas_(codigo)) {
    try { return !!SGO_pode_(eu.sessao || GV_sessaoDe_(eu), codigo); } catch (e) { console.error('Ganhos dos vendedores, caixa ' + codigo + ': ' + GV_erro_(e)); return false; }
  }
  if (GV_ehDono_(eu.login)) return true;
  var p = GV_up_(eu.perfil);
  return !!GV_PADRAO[codigo](eu, { p: p, diretoria: p === 'DIRETORIA' });
}
function GV_poderes_(eu) { var r = {}; GV_PODERES.forEach(function (c) { r[c] = GV_pode_(eu, c); }); return r; }
function GV_nomeCaixa_(codigo) {
  for (var i = 0; i < GV_PODERES_ITENS.length; i++) if (GV_PODERES_ITENS[i][0] === codigo) return GV_PODERES_ITENS[i][2];
  return codigo;
}
function GV_exigir_(eu, codigo, acao, oQueFazer) {
  if (GV_pode_(eu, codigo)) return true;
  throw new Error('Não foi possível ' + acao + ': a sua conta não tem a permissão «' + GV_nomeCaixa_(codigo) + '». ' + (oQueFazer || 'Se for o caso, peça ao responsável pelo sistema para liberar esta caixa em Administração > Acessos.'));
}
/**
 * Quem é CHAMADO para um papel (pendência e Caixa): quem tem a caixa pelo padrão ou por exceção. O dono tem todas as
 * caixas, mas só é chamado quando o padrão também o inclui (mesma regra do Depósito de viagem).
 */
function GV_papel_(u, codigo) {
  var a = null;
  if (GV_motorCaixas_(codigo)) { try { a = Poderes_avaliar_(Poderes_eu_(GV_sessaoDe_(u)), Poderes_poder_(codigo)); } catch (e) { a = null; } }
  if (!a) { var p = GV_up_(u.perfil); return !!GV_PADRAO[codigo](u, { p: p, diretoria: p === 'DIRETORIA' || GV_ehDono_(u.login) }); }
  return !!a.valor && (a.origem !== 'dono' || !!a.padrao);
}
function GV_comPapel_(codigo, impedidos) {
  var us = GV_usuarios_();
  impedidos = (impedidos || []).map(GV_s_);
  return Object.keys(us).filter(function (id) { return us[id].ativo && impedidos.indexOf(id) < 0 && GV_papel_(us[id], codigo); });
}

// ------------------------------------------------------------
// FAIXAS E CÁLCULO (faixa cheia, em centavos)
// ------------------------------------------------------------
/**
 * Normaliza e confere as faixas vindas da tela: [{ ate, pct }]. "ate" vazio só na última (acima de). Devolve as faixas
 * normalizadas ou lança com o quê, por quê e o que fazer.
 */
function GV_validarFaixas_(lista) {
  if (!Array.isArray(lista) || !lista.length) throw new Error('Não foi possível gravar o contrato: informe ao menos uma faixa (o percentual e, se houver mais de uma, até que valor ela vai).');
  if (lista.length > GV_MAX_FAIXAS) throw new Error('Não foi possível gravar o contrato: são ' + lista.length + ' faixas; o limite é ' + GV_MAX_FAIXAS + '. Junte faixas e tente de novo.');
  var saida = [], antes = 0;
  lista.forEach(function (f, i) {
    var n = i + 1, ultima = i === lista.length - 1;
    var pct = GV_num_(f && f.pct), ate = GV_s_(f && f.ate) === '' ? null : GV_num_(f.ate);
    if (pct === null || pct < 0 || pct > 100) throw new Error('Não foi possível gravar o contrato: o percentual da faixa ' + n + ' precisa ser um número de 0 a 100 (exemplo: 2 ou 2,5).');
    if (GV_cent_(pct) !== Math.round(pct * 100)) throw new Error('Não foi possível gravar o contrato: o percentual da faixa ' + n + ' aceita até duas casas decimais.');
    if (ultima) {
      if (ate !== null && GV_s_(f.ate) !== '') throw new Error('Não foi possível gravar o contrato: a última faixa é "acima de" e não tem valor final. Deixe o campo "até" da faixa ' + n + ' vazio, ou acrescente mais uma faixa depois dela.');
      saida.push({ ate: null, pct: GV_cent_(pct) / 100 });
      return;
    }
    if (ate === null || ate <= 0) throw new Error('Não foi possível gravar o contrato: informe até que valor vai a faixa ' + n + ' (exemplo: 30.000,00). Só a última faixa fica sem valor final.');
    if (GV_cent_(ate) <= GV_cent_(antes)) throw new Error('Não foi possível gravar o contrato: o valor final da faixa ' + n + ' (' + GV_moeda_(ate) + ') precisa ser maior que o da faixa anterior (' + GV_moeda_(antes) + ').');
    antes = GV_r2_(ate);
    saida.push({ ate: GV_r2_(ate), pct: GV_cent_(pct) / 100 });
  });
  return saida;
}
function GV_rotuloFaixa_(faixas, i) {
  var f = faixas[i], ant = i > 0 ? faixas[i - 1].ate : null;
  if (f.ate === null) return ant === null ? 'qualquer valor' : 'acima de ' + GV_moeda_(ant);
  return ant === null ? 'até ' + GV_moeda_(f.ate) : 'acima de ' + GV_moeda_(ant) + ' até ' + GV_moeda_(f.ate);
}
/**
 * Faixa cheia: a primeira faixa cujo "até" alcança o total (inclusive) vale sobre o total inteiro.
 * Devolve { indice, pct, rotulo, comissao, proxima: { pct, aPartirDe, falta } | null }.
 */
function GV_calcularFaixa_(faixas, total) {
  var tc = GV_cent_(total), i = 0;
  while (i < faixas.length - 1 && faixas[i].ate !== null && tc > GV_cent_(faixas[i].ate)) i++;
  var f = faixas[i], pctCent = Math.round(f.pct * 100);
  var comCent = Math.round(tc * pctCent / 10000);
  var prox = null;
  if (i < faixas.length - 1 && f.ate !== null) {
    var limite = GV_cent_(f.ate) + 1;
    prox = { pct: faixas[i + 1].pct, aPartirDe: limite / 100, falta: (limite - tc) / 100, rotulo: GV_rotuloFaixa_(faixas, i + 1) };
  }
  return { indice: i, pct: f.pct, rotulo: GV_rotuloFaixa_(faixas, i), comissao: comCent / 100, proxima: prox };
}

// ------------------------------------------------------------
// CONTRATOS
// ------------------------------------------------------------
function GV_contratoParaTela_(c) {
  var faixas = GV_json_(c.FAIXAS_JSON, []);
  return { id: GV_s_(c.ID), vendedorId: GV_s_(c.VENDEDOR_ID), vendedorNome: GV_s_(c.VENDEDOR_NOME), vigencia: GV_comp_(c.VIGENCIA_INICIO), vigenciaBr: GV_compBr_(GV_comp_(c.VIGENCIA_INICIO)),
    faixas: faixas, faixasTexto: faixas.map(function (f, i) { return GV_rotuloFaixa_(faixas, i) + ': ' + GV_pct_(f.pct); }), observacao: GV_s_(c.OBSERVACAO), motivo: GV_s_(c.MOTIVO),
    situacao: GV_up_(c.SITUACAO) || 'ATIVO', criadoPor: GV_s_(c.CRIADO_POR_NOME), criadoEm: GV_br_(c.CRIADO_EM), canceladoEm: GV_br_(c.CANCELADO_EM),
    canceladoPor: GV_s_(c.CANCELADO_POR_NOME), canceladoMotivo: GV_s_(c.CANCELADO_MOTIVO), base: 'Valor recebido no mês', regra: 'Faixa cheia' };
}
function GV_contratosDe_(vendedorId, todos) {
  return GV_lerMemo_(GV_ABAS.CONTRATOS).filter(function (c) { return GV_s_(c.VENDEDOR_ID) === GV_s_(vendedorId) && (todos || GV_up_(c.SITUACAO || 'ATIVO') === 'ATIVO'); })
    .sort(function (a, b) { var x = GV_comp_(a.VIGENCIA_INICIO), y = GV_comp_(b.VIGENCIA_INICIO); return x < y ? -1 : x > y ? 1 : (GV_s_(a.CRIADO_EM) < GV_s_(b.CRIADO_EM) ? -1 : 1); });
}
/** Contrato que vale na competência: o ativo de vigência mais recente que já começou. null = sem contrato. */
function GV_contratoVigente_(vendedorId, comp) {
  var l = GV_contratosDe_(vendedorId).filter(function (c) { return GV_comp_(c.VIGENCIA_INICIO) && GV_comp_(c.VIGENCIA_INICIO) <= comp; });
  return l.length ? l[l.length - 1] : null;
}
function GV_salvarContrato_(eu, d) {
  d = d || {};
  return GV_comTrava_(function () {
    GV_exigir_(eu, 'GANHOS_CONTRATOS', 'gravar o contrato de ganhos');
    var vid = GV_s_(d.vendedorId), us = GV_usuarios_(), v = us[vid];
    if (!v) throw new Error('Não foi possível gravar o contrato: escolha o vendedor na lista (a pessoa precisa estar cadastrada e ativa em Administração > Usuários).');
    if (vid === eu.id) throw new Error('Não foi possível gravar o contrato: ninguém define o próprio contrato de ganhos. Peça a outra pessoa do Financeiro ou à Diretoria.');
    var vig = GV_comp_(d.vigencia);
    if (!vig) throw new Error('Não foi possível gravar o contrato: informe o mês em que ele começa a valer (mês e ano).');
    var faixas = GV_validarFaixas_(d.faixas);
    var fech = GV_fechamentosDe_(vid).filter(function (f) { return f.competencia >= vig && GV_CONGELADOS.indexOf(f.situacao) >= 0; });
    if (fech.length) throw new Error('Não foi possível gravar o contrato com início em ' + GV_compBr_(vig) + ': o mês ' + GV_compBr_(fech[0].competencia) + ' de ' + v.nome + ' já foi fechado e os números estão congelados. Escolha o início em ' + GV_compBr_(GV_somarMeses_(fech[fech.length - 1].competencia, 1)) + ' ou depois, ou peça à Diretoria para reabrir o mês.');
    var mesmo = GV_contratosDe_(vid).filter(function (c) { return GV_comp_(c.VIGENCIA_INICIO) === vig; })[0];
    if (mesmo) throw new Error('Não foi possível gravar o contrato: ' + v.nome + ' já tem contrato com início em ' + GV_compBr_(vig) + '. Para corrigir, cancele esse contrato (com o motivo) e cadastre de novo.');
    var anteriores = GV_contratosDe_(vid);
    var motivo = GV_texto_(d.motivo, 1000);
    if (anteriores.length && motivo.length < 10) throw new Error('Não foi possível gravar o contrato: ' + v.nome + ' já tem contrato. Escreva o motivo da mudança (10 letras ou mais), por exemplo "nova negociação assinada em 12/11/2026".');
    var linha = { ID: GV_id_(), VENDEDOR_ID: vid, VENDEDOR_NOME: v.nome, VIGENCIA_INICIO: vig, BASE: 'RECEBIDO', REGRA: 'FAIXA_CHEIA', FAIXAS_JSON: JSON.stringify(faixas),
      OBSERVACAO: GV_texto_(d.observacao, 2000), MOTIVO: motivo, SITUACAO: 'ATIVO', HASH: GV_marca_(vid + '|' + vig + '|' + JSON.stringify(faixas)),
      CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, CRIADO_EM: GV_agora_() };
    SGO_DATA.insert(GV_ABAS.CONTRATOS, linha);
    GV_memoLimpar_();
    GV_historico_('CONTRATO', linha.ID, 'CONTRATO_CRIADO', eu, { vendedorId: vid, competencia: vig, para: 'início ' + GV_compBr_(vig), texto: 'Faixas: ' + faixas.map(function (f, i) { return GV_rotuloFaixa_(faixas, i) + ' = ' + GV_pct_(f.pct); }).join('; ') + (motivo ? '. Motivo: ' + motivo : '') });
    var inval = GV_invalidarConferencias_(vid, vig, 'o contrato de ganhos mudou (início em ' + GV_compBr_(vig) + ')', eu);
    return { contrato: GV_contratoParaTela_(linha), conferenciasReabertas: inval };
  });
}
function GV_cancelarContrato_(eu, d) {
  d = d || {};
  return GV_comTrava_(function () {
    GV_exigir_(eu, 'GANHOS_CONTRATOS', 'cancelar o contrato de ganhos');
    var c = GV_lerMemo_(GV_ABAS.CONTRATOS).filter(function (x) { return GV_s_(x.ID) === GV_s_(d.id); })[0];
    if (!c) throw new Error('Não foi possível cancelar: o contrato não foi encontrado. Atualize a tela (F5).');
    if (GV_up_(c.SITUACAO || 'ATIVO') !== 'ATIVO') throw new Error('Não foi possível cancelar: este contrato já está cancelado.');
    if (GV_s_(c.VENDEDOR_ID) === eu.id) throw new Error('Não foi possível cancelar: ninguém mexe no próprio contrato de ganhos. Peça a outra pessoa do Financeiro ou à Diretoria.');
    var motivo = GV_texto_(d.motivo, 1000);
    if (motivo.length < GV_MOTIVO_MIN) throw new Error('Não foi possível cancelar: escreva o motivo (' + GV_MOTIVO_MIN + ' letras ou mais). O contrato não é apagado; fica no histórico como cancelado.');
    var usado = GV_fechamentosDe_(c.VENDEDOR_ID).filter(function (f) { return GV_CONGELADOS.indexOf(f.situacao) >= 0 && f.contratoId === GV_s_(c.ID); })[0];
    if (usado) throw new Error('Não foi possível cancelar: este contrato foi usado no fechamento de ' + GV_compBr_(usado.competencia) + ', que está congelado. Para mudar daqui para a frente, cadastre um contrato novo com início no próximo mês aberto.');
    SGO_DATA.update(GV_ABAS.CONTRATOS, c.ID, { SITUACAO: 'CANCELADO', CANCELADO_EM: GV_agora_(), CANCELADO_POR_ID: eu.id, CANCELADO_POR_NOME: eu.nome, CANCELADO_MOTIVO: motivo });
    GV_memoLimpar_();
    GV_historico_('CONTRATO', c.ID, 'CONTRATO_CANCELADO', eu, { vendedorId: c.VENDEDOR_ID, competencia: GV_comp_(c.VIGENCIA_INICIO), texto: 'Motivo: ' + motivo });
    var inval = GV_invalidarConferencias_(c.VENDEDOR_ID, GV_comp_(c.VIGENCIA_INICIO), 'um contrato de ganhos foi cancelado', eu);
    return { cancelado: true, conferenciasReabertas: inval };
  });
}

// ------------------------------------------------------------
// PROPOSTAS (só leitura do Comercial) E RECEBIMENTOS
// ------------------------------------------------------------
function GV_propostas_() {
  var m = GV_memo_();
  if (m.propostas) return m.propostas;
  var r = {};
  GV_ler_('COM_PROPOSTAS').forEach(function (p) { if (GV_s_(p.ID)) r[GV_s_(p.ID)] = p; });
  m.propostas = r;
  return r;
}
function GV_oportunidade_(id) {
  if (!GV_s_(id)) return null;
  var m = GV_memo_();
  if (!m.oportunidades) { m.oportunidades = {}; GV_ler_('COM_OPORTUNIDADES').forEach(function (o) { m.oportunidades[GV_s_(o.ID)] = o; }); }
  return m.oportunidades[GV_s_(id)] || null;
}
function GV_rotuloProposta_(p) { return GV_s_(p.NUMERO) + (Number(p.REVISAO) > 0 ? ' rev. ' + GV_s_(p.REVISAO) : ''); }
/** Vendedor da proposta: o responsável dela; sem ele, o da oportunidade. Nunca por suposição: sem os dois, ''. */
function GV_vendedorDaProposta_(p) {
  var us = GV_usuarios_(), id = GV_s_(p.RESPONSAVEL_ID);
  if (id && us[id]) return { id: id, nome: us[id].nome, origem: 'PROPOSTA' };
  var o = GV_oportunidade_(p.OPORTUNIDADE_ID), oid = GV_s_(o && o.RESPONSAVEL_ID);
  if (oid && us[oid]) return { id: oid, nome: us[oid].nome, origem: 'OPORTUNIDADE' };
  return null;
}
function GV_recebimentos_() { return GV_lerMemo_(GV_ABAS.RECEBIMENTOS); }
function GV_validos_(vendedorId) {
  return GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) === 'VALIDO' && (!vendedorId || GV_s_(r.VENDEDOR_ID) === GV_s_(vendedorId)); });
}
function GV_recebidoDaProposta_(propostaId, excetoId) {
  var c = 0;
  GV_recebimentos_().forEach(function (r) { if (GV_up_(r.SITUACAO) !== 'ANULADO' && GV_s_(r.PROPOSTA_ID) === GV_s_(propostaId) && GV_s_(r.ID) !== GV_s_(excetoId)) c += GV_cent_(r.VALOR); });
  return c / 100;
}
function GV_recParaTela_(r) {
  return { id: GV_s_(r.ID), situacao: GV_up_(r.SITUACAO), situacaoNome: { VALIDO: 'Válido', A_CLASSIFICAR: 'A classificar (sem vendedor)', ANULADO: 'Anulado' }[GV_up_(r.SITUACAO)] || GV_s_(r.SITUACAO),
    origem: GV_up_(r.ORIGEM) || 'MANUAL', propostaId: GV_s_(r.PROPOSTA_ID), proposta: GV_s_(r.PROPOSTA_NUMERO), clienteNome: GV_s_(r.CLIENTE_NOME), vendedorId: GV_s_(r.VENDEDOR_ID),
    vendedorNome: GV_s_(r.VENDEDOR_NOME), vendedorOrigem: GV_s_(r.VENDEDOR_ORIGEM), data: GV_dia_(r.DATA_RECEBIMENTO), dataBr: GV_brDia_(r.DATA_RECEBIMENTO),
    competencia: GV_comp_(r.COMPETENCIA), valor: GV_r2_(r.VALOR), valorBr: GV_moeda_(r.VALOR), documento: GV_s_(r.DOCUMENTO), observacao: GV_s_(r.OBSERVACAO),
    justificativaAcima: GV_s_(r.JUSTIFICATIVA_ACIMA), lancadoPor: GV_s_(r.LANCADO_POR_NOME), lancadoEm: GV_br_(r.LANCADO_EM), anuladoEm: GV_br_(r.ANULADO_EM),
    anuladoPor: GV_s_(r.ANULADO_POR_NOME), anuladoMotivo: GV_s_(r.ANULADO_MOTIVO), classificadoPor: GV_s_(r.CLASSIFICADO_POR_NOME), classificadoEm: GV_br_(r.CLASSIFICADO_EM) };
}
/** Recusa mexer em recebimento de mês congelado (o quê, por quê, o que fazer). */
function GV_exigirMesAberto_(vendedorId, comp, oQue) {
  if (!vendedorId) return;
  var f = GV_fechamento_(vendedorId, comp);
  if (!f || GV_CONGELADOS.indexOf(GV_up_(f.SITUACAO)) < 0) return;
  var nome = GV_s_(f.VENDEDOR_NOME) || 'do vendedor', sit = GV_up_(f.SITUACAO);
  throw new Error('Não foi possível ' + oQue + ': o mês ' + GV_compBr_(comp) + ' de ' + nome + ' está ' + (sit === 'PAGO' ? 'pago' : sit === 'APROVADO' ? 'aprovado pela Diretoria' : 'fechado pelo Financeiro') +
    ' e os números estão congelados. ' + (sit === 'PAGO' ? 'Mês pago não é reaberto nesta etapa: leve o caso à Diretoria.' : 'Se o lançamento é necessário, peça à Diretoria para reabrir o mês (com o motivo) em Ganhos dos vendedores > Fechamento do mês.'));
}
function GV_dataRecebimento_(v) {
  var dia = GV_dia_(v);
  if (!dia) throw new Error('Não foi possível lançar: informe a data em que o dinheiro entrou na conta (dia, mês e ano).');
  if (dia > GV_hoje_()) throw new Error('Não foi possível lançar: a data do recebimento (' + GV_brDia_(dia) + ') está no futuro. Lance quando o valor entrar na conta.');
  if (!GV_comp_(dia)) throw new Error('Não foi possível lançar: a data do recebimento não é válida. Use dia, mês e ano (a partir de 2020).');
  return dia;
}
function GV_lancarRecebimento_(eu, d) {
  d = d || {};
  return GV_comTrava_(function () {
    GV_exigir_(eu, 'GANHOS_RECEBIMENTOS', 'lançar o recebimento');
    var dia = GV_dataRecebimento_(d.data), comp = GV_comp_(dia), valor = GV_num_(d.valor);
    if (valor === null || GV_cent_(valor) <= 0) throw new Error('Não foi possível lançar: informe o valor recebido, maior que zero (exemplo: 12.500,00).');
    valor = GV_r2_(valor);
    var documento = GV_texto_(d.documento, 120), obs = GV_texto_(d.observacao, 1000);
    if (!documento) throw new Error('Não foi possível lançar: informe o documento do recebimento (número da nota fiscal, do boleto ou do título no Omie). Ele evita lançar o mesmo recebimento duas vezes.');
    // 15/11/2026: recebimento sugerido pelo Omie (SGO_Omie_Ganhos.js): origem OMIE e o mesmo título do Omie não entra duas vezes.
    var ref = GV_texto_(d.refExterna, 120), doOmie = /^OMIE:\d+(:\d{4}-\d{2}-\d{2})?$/.test(ref);
    if (ref && !doOmie) ref = '';
    if (doOmie) {
      var jaOmie = GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) !== 'ANULADO' && GV_s_(r.REF_EXTERNA) === ref; })[0];
      if (jaOmie) throw new Error('Não foi possível lançar: este recebimento do Omie já foi lançado' + (GV_s_(jaOmie.PROPOSTA_NUMERO) ? ' na proposta ' + GV_s_(jaOmie.PROPOSTA_NUMERO) : ' (a classificar)') + ' por ' + GV_s_(jaOmie.LANCADO_POR_NOME) + ' em ' + GV_br_(jaOmie.LANCADO_EM) + '. Se o lançamento está errado, anule-o com o motivo e lance de novo.');
    }
    var linha = { ID: GV_id_(), ORIGEM: doOmie ? 'OMIE' : 'MANUAL', REF_EXTERNA: ref, DATA_RECEBIMENTO: dia, COMPETENCIA: comp, VALOR: valor, DOCUMENTO: documento, OBSERVACAO: obs,
      LANCADO_POR_ID: eu.id, LANCADO_POR_NOME: eu.nome, LANCADO_EM: GV_agora_() };
    if (d.semProposta) {
      var cli = GV_texto_(d.clienteNome, 200);
      if (cli.length < 3) throw new Error('Não foi possível lançar sem proposta: informe o nome do cliente que pagou. O recebimento fica "a classificar" e não entra em comissão até ser ligado a uma proposta.');
      if (obs.length < 10) throw new Error('Não foi possível lançar sem proposta: escreva na observação por que não há proposta (10 letras ou mais), para quem for classificar depois.');
      Object.assign(linha, { SITUACAO: 'A_CLASSIFICAR', CLIENTE_NOME: cli, VENDEDOR_ORIGEM: '' });
    } else {
      var p = GV_propostas_()[GV_s_(d.propostaId)];
      if (!p) throw new Error('Não foi possível lançar: escolha a proposta na busca (número, cliente ou título). Se o recebimento não tem proposta, marque "Recebimento sem proposta".');
      GV_preencherDaProposta_(linha, p, eu);
      var dup = GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) !== 'ANULADO' && GV_s_(r.PROPOSTA_ID) === GV_s_(p.ID) && GV_up_(r.DOCUMENTO) === GV_up_(documento) && GV_cent_(r.VALOR) === GV_cent_(valor); })[0];
      if (dup) throw new Error('Não foi possível lançar: já existe o recebimento do documento ' + documento + ' (' + GV_moeda_(valor) + ') na proposta ' + GV_rotuloProposta_(p) + ', lançado por ' + GV_s_(dup.LANCADO_POR_NOME) + ' em ' + GV_br_(dup.LANCADO_EM) + '. Se é outra parcela, use o número da parcela no documento.');
      GV_conferirTotalProposta_(p, valor, '', d.justificativaAcima, linha);
    }
    if (linha.VENDEDOR_ID) GV_exigirMesAberto_(linha.VENDEDOR_ID, comp, 'lançar o recebimento');
    SGO_DATA.insert(GV_ABAS.RECEBIMENTOS, linha);
    GV_memoLimpar_();
    GV_historico_('RECEBIMENTO', linha.ID, 'RECEBIMENTO_LANCADO', eu, { vendedorId: linha.VENDEDOR_ID, competencia: comp, para: GV_moeda_(valor),
      texto: (linha.PROPOSTA_NUMERO ? 'Proposta ' + linha.PROPOSTA_NUMERO + ', ' : 'Sem proposta, ') + GV_s_(linha.CLIENTE_NOME) + ', ' + GV_brDia_(dia) + ', documento ' + documento + (linha.SITUACAO === 'A_CLASSIFICAR' ? '. A classificar.' : '') });
    var inval = linha.VENDEDOR_ID ? GV_invalidarConferencias_(linha.VENDEDOR_ID, comp, 'entrou um recebimento novo em ' + GV_compBr_(comp), eu, comp) : 0;
    return { recebimento: GV_recParaTela_(linha), conferenciasReabertas: inval };
  });
}
/** Liga o recebimento à proposta (cliente e vendedor). Proposta precisa estar aprovada pelo cliente. */
function GV_preencherDaProposta_(linha, p, eu) {
  if (GV_s_(p.EXCLUIDA_EM)) throw new Error('Não foi possível usar a proposta ' + GV_rotuloProposta_(p) + ': ela foi excluída no Comercial. Escolha a proposta certa.');
  if (GV_up_(p.SITUACAO) !== 'APROVADA') throw new Error('Não foi possível usar a proposta ' + GV_rotuloProposta_(p) + ': ela não está aprovada pelo cliente (situação: ' + GV_s_(p.SITUACAO).toLowerCase().replace(/_/g, ' ') + '). Só proposta ganha gera comissão. Confira no Comercial ou lance como "sem proposta".');
  var vend = GV_vendedorDaProposta_(p);
  if (vend && vend.id === eu.id) throw new Error('Não foi possível lançar: a proposta ' + GV_rotuloProposta_(p) + ' é sua (você é o vendedor responsável). Ninguém lança recebimento da própria venda; peça a outra pessoa do Financeiro.');
  Object.assign(linha, { PROPOSTA_ID: GV_s_(p.ID), PROPOSTA_NUMERO: GV_rotuloProposta_(p), OPORTUNIDADE_ID: GV_s_(p.OPORTUNIDADE_ID), CLIENTE_ID: GV_s_(p.CLIENTE_ID), CLIENTE_NOME: GV_s_(p.CLIENTE_NOME),
    VENDEDOR_ID: vend ? vend.id : '', VENDEDOR_NOME: vend ? vend.nome : '', VENDEDOR_ORIGEM: vend ? vend.origem : '', SITUACAO: vend ? 'VALIDO' : 'A_CLASSIFICAR' });
}
/** O recebido da proposta não passa do total sem justificativa (juros, multa, reajuste). */
function GV_conferirTotalProposta_(p, valor, excetoId, justificativa, linha) {
  var total = GV_r2_(p.TOTAL), ja = GV_recebidoDaProposta_(p.ID, excetoId);
  if (total > 0 && GV_cent_(ja) + GV_cent_(valor) > GV_cent_(total)) {
    var j = GV_texto_(justificativa, 600);
    if (j.length < GV_MOTIVO_MIN) throw new Error('O recebido da proposta ' + GV_rotuloProposta_(p) + ' passaria do total dela (' + GV_moeda_(total) + '; já recebido ' + GV_moeda_(ja) + ', com este ' + GV_moeda_(ja + valor) + '). Confira o valor; se está certo (juros, multa ou reajuste), escreva a justificativa (' + GV_MOTIVO_MIN + ' letras ou mais) e lance de novo.');
    linha.JUSTIFICATIVA_ACIMA = j;
  }
}
function GV_classificarRecebimento_(eu, d) {
  d = d || {};
  return GV_comTrava_(function () {
    GV_exigir_(eu, 'GANHOS_RECEBIMENTOS', 'classificar o recebimento');
    var r = GV_recebimentos_().filter(function (x) { return GV_s_(x.ID) === GV_s_(d.id); })[0];
    if (!r) throw new Error('Não foi possível classificar: o recebimento não foi encontrado. Atualize a tela (F5).');
    if (GV_up_(r.SITUACAO) !== 'A_CLASSIFICAR') throw new Error('Não foi possível classificar: este recebimento não está "a classificar" (situação: ' + GV_recParaTela_(r).situacaoNome + ').');
    var p = GV_propostas_()[GV_s_(d.propostaId)];
    if (!p) throw new Error('Não foi possível classificar: escolha a proposta na busca. O vendedor sai da proposta; ele não é escolhido à mão.');
    var campos = {};
    GV_preencherDaProposta_(campos, p, eu);
    if (!campos.VENDEDOR_ID) throw new Error('Não foi possível classificar: a proposta ' + GV_rotuloProposta_(p) + ' não tem vendedor responsável (nem na oportunidade). Peça ao Comercial para registrar o responsável e classifique de novo.');
    GV_conferirTotalProposta_(p, GV_r2_(r.VALOR), r.ID, d.justificativaAcima, campos);
    var comp = GV_comp_(r.COMPETENCIA);
    GV_exigirMesAberto_(campos.VENDEDOR_ID, comp, 'classificar o recebimento');
    campos.CLASSIFICADO_EM = GV_agora_(); campos.CLASSIFICADO_POR_NOME = eu.nome;
    SGO_DATA.update(GV_ABAS.RECEBIMENTOS, r.ID, campos);
    GV_memoLimpar_();
    GV_historico_('RECEBIMENTO', r.ID, 'RECEBIMENTO_CLASSIFICADO', eu, { vendedorId: campos.VENDEDOR_ID, competencia: comp, de: 'a classificar', para: campos.VENDEDOR_NOME, texto: 'Ligado à proposta ' + campos.PROPOSTA_NUMERO + '.' });
    var inval = GV_invalidarConferencias_(campos.VENDEDOR_ID, comp, 'um recebimento foi classificado em ' + GV_compBr_(comp), eu, comp);
    return { recebimento: GV_recParaTela_(Object.assign({}, r, campos)), conferenciasReabertas: inval };
  });
}
function GV_anularRecebimento_(eu, d) {
  d = d || {};
  return GV_comTrava_(function () {
    GV_exigir_(eu, 'GANHOS_RECEBIMENTOS', 'anular o recebimento');
    var r = GV_recebimentos_().filter(function (x) { return GV_s_(x.ID) === GV_s_(d.id); })[0];
    if (!r) throw new Error('Não foi possível anular: o recebimento não foi encontrado. Atualize a tela (F5).');
    if (GV_up_(r.SITUACAO) === 'ANULADO') throw new Error('Não foi possível anular: este recebimento já está anulado.');
    if (GV_s_(r.VENDEDOR_ID) === eu.id) throw new Error('Não foi possível anular: o recebimento é de uma venda sua. Peça a outra pessoa do Financeiro.');
    var motivo = GV_texto_(d.motivo, 1000);
    if (motivo.length < GV_MOTIVO_MIN) throw new Error('Não foi possível anular: escreva o motivo (' + GV_MOTIVO_MIN + ' letras ou mais). O lançamento não é apagado; fica na lista como anulado.');
    var comp = GV_comp_(r.COMPETENCIA);
    GV_exigirMesAberto_(GV_s_(r.VENDEDOR_ID), comp, 'anular o recebimento');
    SGO_DATA.update(GV_ABAS.RECEBIMENTOS, r.ID, { SITUACAO: 'ANULADO', ANULADO_EM: GV_agora_(), ANULADO_POR_ID: eu.id, ANULADO_POR_NOME: eu.nome, ANULADO_MOTIVO: motivo });
    GV_memoLimpar_();
    GV_historico_('RECEBIMENTO', r.ID, 'RECEBIMENTO_ANULADO', eu, { vendedorId: r.VENDEDOR_ID, competencia: comp, de: GV_moeda_(r.VALOR), texto: 'Motivo: ' + motivo });
    var inval = GV_s_(r.VENDEDOR_ID) ? GV_invalidarConferencias_(r.VENDEDOR_ID, comp, 'um recebimento de ' + GV_compBr_(comp) + ' foi anulado', eu, comp) : 0;
    return { anulado: true, conferenciasReabertas: inval };
  });
}
/** Propostas aprovadas pelo cliente para escolher no lançamento: número, cliente, total, vendedor, recebido e saldo. */
function GV_buscarPropostas_(eu, d) {
  GV_exigir_(eu, 'GANHOS_RECEBIMENTOS', 'buscar propostas');
  var q = GV_s_(d && d.q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  var termos = q ? q.split(/\s+/) : [];
  var props = GV_propostas_(), l = [];
  Object.keys(props).forEach(function (id) {
    var p = props[id];
    if (GV_up_(p.SITUACAO) !== 'APROVADA' || GV_s_(p.EXCLUIDA_EM)) return;
    var texto = (GV_s_(p.NUMERO) + ' ' + GV_s_(p.CLIENTE_NOME) + ' ' + GV_s_(p.TITULO) + ' ' + GV_s_(p.RESPONSAVEL_NOME) + ' ' + GV_s_(p.OC_NUMERO)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (termos.some(function (t) { return texto.indexOf(t) < 0; })) return;
    var v = GV_vendedorDaProposta_(p), rec = GV_recebidoDaProposta_(p.ID, '');
    l.push({ id: id, numero: GV_rotuloProposta_(p), cliente: GV_s_(p.CLIENTE_NOME), titulo: GV_s_(p.TITULO), total: GV_r2_(p.TOTAL), totalBr: GV_moeda_(p.TOTAL),
      vendedor: v ? v.nome : '', semVendedor: !v, recebido: rec, recebidoBr: GV_moeda_(rec), saldoBr: GV_moeda_(Math.max(0, GV_r2_(p.TOTAL) - rec)),
      ganhaEm: GV_brDia_(p.RESPOSTA_EM || p.ASSINADA_EM), _ord: GV_iso_(p.RESPOSTA_EM || p.ASSINADA_EM || p.ATUALIZADO_EM) });
  });
  l.sort(function (a, b) { return a._ord < b._ord ? 1 : -1; });
  return { propostas: l.slice(0, 30).map(function (x) { delete x._ord; return x; }), total: l.length };
}

// ------------------------------------------------------------
// APURAÇÃO DO MÊS
// ------------------------------------------------------------
/**
 * Cálculo ao vivo do mês: { vendedorId, competencia, contrato, recebimentos, total, faixa, pct, comissao, proxima, hash }.
 * Sem contrato vigente: contrato null, comissao null (a tela diz o que fazer).
 */
function GV_apurarAoVivo_(vendedorId, comp) {
  var c = GV_contratoVigente_(vendedorId, comp);
  var recs = GV_validos_(vendedorId).filter(function (r) { return GV_comp_(r.COMPETENCIA) === comp; })
    .sort(function (a, b) { var x = GV_dia_(a.DATA_RECEBIMENTO), y = GV_dia_(b.DATA_RECEBIMENTO); return x < y ? -1 : x > y ? 1 : 0; });
  var tc = 0;
  var lista = recs.map(function (r) { tc += GV_cent_(r.VALOR); return { id: GV_s_(r.ID), data: GV_dia_(r.DATA_RECEBIMENTO), dataBr: GV_brDia_(r.DATA_RECEBIMENTO), cliente: GV_s_(r.CLIENTE_NOME), clienteId: GV_s_(r.CLIENTE_ID), proposta: GV_s_(r.PROPOSTA_NUMERO), propostaId: GV_s_(r.PROPOSTA_ID), documento: GV_s_(r.DOCUMENTO), valor: GV_r2_(r.VALOR), valorBr: GV_moeda_(r.VALOR) }; });
  var total = tc / 100, r = { vendedorId: GV_s_(vendedorId), competencia: comp, recebimentos: lista, total: total, totalBr: GV_moeda_(total), contrato: null, faixa: null, pct: null, comissao: null, proxima: null };
  if (c) {
    var faixas = GV_json_(c.FAIXAS_JSON, []), calc = GV_calcularFaixa_(faixas, total);
    r.contrato = { id: GV_s_(c.ID), vigencia: GV_comp_(c.VIGENCIA_INICIO), faixas: faixas, hash: GV_s_(c.HASH) };
    r.faixa = { indice: calc.indice, rotulo: calc.rotulo, numero: calc.indice + 1, de: faixas.length };
    r.pct = calc.pct; r.comissao = calc.comissao; r.proxima = calc.proxima;
  }
  r.hash = GV_marca_(JSON.stringify({ c: r.contrato ? [r.contrato.id, r.contrato.faixas] : null, r: lista.map(function (x) { return [x.id, x.valor, x.data]; }), t: total, p: r.pct, k: r.comissao }));
  return r;
}
/** Cálculo valendo para o mês: a cópia congelada quando o mês está fechado, aprovado ou pago; senão, ao vivo. */
function GV_apurar_(vendedorId, comp) {
  var f = GV_fechamento_(vendedorId, comp);
  if (f && GV_CONGELADOS.indexOf(GV_up_(f.SITUACAO)) >= 0) {
    var cong = GV_json_(f.CALCULO_JSON, null);
    if (cong) { cong.congelado = true; cong.hash = GV_s_(f.CALCULO_HASH); return cong; }
  }
  var vivo = GV_apurarAoVivo_(vendedorId, comp);
  vivo.congelado = false;
  return vivo;
}

// ------------------------------------------------------------
// FECHAMENTO
// ------------------------------------------------------------
function GV_fechamento_(vendedorId, comp) {
  return GV_lerMemo_(GV_ABAS.FECHAMENTOS).filter(function (f) { return GV_s_(f.VENDEDOR_ID) === GV_s_(vendedorId) && GV_comp_(f.COMPETENCIA) === comp; })[0] || null;
}
function GV_fechamentosDe_(vendedorId) {
  return GV_lerMemo_(GV_ABAS.FECHAMENTOS).filter(function (f) { return !vendedorId || GV_s_(f.VENDEDOR_ID) === GV_s_(vendedorId); })
    .map(function (f) { return { id: GV_s_(f.ID), vendedorId: GV_s_(f.VENDEDOR_ID), competencia: GV_comp_(f.COMPETENCIA), situacao: GV_up_(f.SITUACAO), contratoId: GV_s_(f.CONTRATO_ID), linha: f }; })
    .sort(function (a, b) { return a.competencia < b.competencia ? -1 : 1; });
}
function GV_situacao_(f, comp) {
  if (f && GV_up_(f.SITUACAO)) return GV_up_(f.SITUACAO);
  return comp >= GV_compAtual_() ? 'EM_ANDAMENTO' : 'ABERTO';
}
/** Linha do mês (cria em ABERTO no primeiro passo). */
function GV_garantirFechamento_(vendedorId, comp) {
  var f = GV_fechamento_(vendedorId, comp);
  if (f) return f;
  var v = GV_usuarios_()[vendedorId] || {};
  var linha = { ID: GV_id_(), VENDEDOR_ID: vendedorId, VENDEDOR_NOME: v.nome || '', COMPETENCIA: comp, SITUACAO: 'ABERTO', REABERTURAS: 0, ATUALIZADO_EM: GV_agora_(), CRIADO_EM: GV_agora_() };
  SGO_DATA.insert(GV_ABAS.FECHAMENTOS, linha);
  GV_memoLimpar_();
  return GV_fechamento_(vendedorId, comp) || linha;
}
/**
 * Números mudaram (recebimento, contrato): a conferência e a contestação deixam de valer e o mês volta para o vendedor.
 * Só meses ainda não congelados. comp: só aquele mês; sem comp, de "desde" em diante. Devolve quantos meses voltaram.
 */
function GV_invalidarConferencias_(vendedorId, desde, porque, eu, soComp) {
  var n = 0;
  GV_fechamentosDe_(vendedorId).forEach(function (f) {
    if (soComp ? f.competencia !== soComp : f.competencia < desde) return;
    if (['CONFERIDO', 'CONTESTADO', 'DEVOLVIDO'].indexOf(f.situacao) < 0) return;
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, f.id, { SITUACAO: 'ABERTO', CONFERIDO_HASH: '', CONTESTADO_HASH: '', ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', f.id, 'VOLTOU_PARA_CONFERENCIA', eu, { vendedorId: vendedorId, competencia: f.competencia, de: f.situacao, para: 'ABERTO', texto: 'Os números mudaram: ' + porque + '. O vendedor confere de novo.' });
    n++;
  });
  if (n) GV_memoLimpar_();
  return n;
}
/** O que a pessoa pode fazer no mês: { acao: { pode, motivo } }. A mesma regra vale na tela e na gravação. */
function GV_acoes_(eu, vendedorId, comp, f, calc, pod) {
  pod = pod || GV_poderes_(eu);
  var sit = GV_situacao_(f, comp), proprio = eu.id === GV_s_(vendedorId), r = {};
  var nao = function (m) { return { pode: false, motivo: m }; }, sim = { pode: true, motivo: '' };
  var terminou = comp < GV_compAtual_();
  var semContrato = !calc.contrato;
  // conferir / contestar: só o próprio vendedor, mês terminado, com contrato, antes do fechamento
  if (!proprio) r.conferir = r.contestar = nao('Só o próprio vendedor confere o mês dele.');
  else if (!terminou) r.conferir = r.contestar = nao('O mês ainda não terminou: a conferência abre no dia 1º do mês seguinte.');
  else if (semContrato) r.conferir = r.contestar = nao('Não há contrato de ganhos valendo neste mês. Peça ao Financeiro para cadastrar o seu contrato.');
  else if (['ABERTO', 'CONFERIDO', 'CONTESTADO'].indexOf(sit) < 0) r.conferir = r.contestar = nao(sit === 'DEVOLVIDO' ? 'A Diretoria devolveu o mês ao Financeiro; se os números mudarem, ele volta para você conferir.' : 'O mês já foi fechado pelo Financeiro.');
  else { r.conferir = sit === 'CONFERIDO' && GV_s_(f && f.CONFERIDO_HASH) === calc.hash ? nao('Você já conferiu estes números.') : sim; r.contestar = sim; }
  // fechar: Financeiro, não o próprio, depois da conferência (ou da contestação, com resposta)
  if (!pod.GANHOS_FECHAR) r.fechar = nao('Fechar o mês é do Financeiro.');
  else if (proprio) r.fechar = nao('Ninguém fecha o próprio mês de ganhos.');
  else if (!terminou) r.fechar = nao('O mês ainda não terminou.');
  else if (semContrato) r.fechar = nao('Não há contrato de ganhos valendo neste mês. Cadastre o contrato do vendedor antes.');
  else if (sit === 'ABERTO') r.fechar = nao('Aguardando a conferência do vendedor.');
  else if (['CONFERIDO', 'CONTESTADO', 'DEVOLVIDO'].indexOf(sit) < 0) r.fechar = nao('O mês já está fechado.');
  else {
    var conf = GV_s_(f.CONFERIDO_HASH) === calc.hash, cont = GV_s_(f.CONTESTADO_HASH) === calc.hash;
    r.fechar = conf || cont ? sim : nao('Os números mudaram depois da conferência do vendedor; ele precisa conferir de novo.');
    r.fecharPedeResposta = !conf && cont && !GV_s_(f.RESPOSTA_CONTESTACAO);
  }
  // aprovar / devolver: Diretoria, não o próprio, não quem fechou
  if (!pod.GANHOS_APROVAR) r.aprovar = nao('Aprovar o fechamento é da Diretoria.');
  else if (sit !== 'FECHADO') r.aprovar = nao(sit === 'APROVADO' || sit === 'PAGO' ? 'O mês já foi aprovado.' : 'O mês ainda não foi fechado pelo Financeiro.');
  else if (proprio) r.aprovar = nao('Ninguém aprova o próprio mês de ganhos.');
  else if (GV_s_(f.FECHADO_POR_ID) === eu.id) r.aprovar = nao('Quem fechou o mês não aprova o mesmo fechamento.');
  else r.aprovar = sim;
  r.devolver = r.aprovar;
  // pagar: Financeiro, não o próprio, não quem aprovou, com valor
  if (!pod.GANHOS_PAGAR) r.pagar = nao('Registrar o pagamento é do Financeiro.');
  else if (sit !== 'APROVADO') r.pagar = nao(sit === 'PAGO' ? 'O pagamento já foi registrado.' : 'O pagamento é registrado depois da aprovação da Diretoria.');
  else if (proprio) r.pagar = nao('Ninguém registra o pagamento da própria comissão.');
  else if (GV_s_(f.APROVADO_POR_ID) === eu.id) r.pagar = nao('Quem aprovou não registra o pagamento do mesmo fechamento.');
  else if (GV_cent_(f.COMISSAO) <= 0) r.pagar = nao('A comissão do mês é zero: não há pagamento a registrar.');
  else r.pagar = sim;
  // reabrir: Diretoria, mês fechado ou aprovado
  if (!pod.GANHOS_REABRIR) r.reabrir = nao('Reabrir mês fechado é da Diretoria.');
  else if (proprio) r.reabrir = nao('Ninguém reabre o próprio mês de ganhos.');
  else if (sit === 'PAGO') r.reabrir = nao('Mês pago não é reaberto nesta etapa: o ajuste de mês pago depende de decisão da Diretoria.');
  else if (sit !== 'FECHADO' && sit !== 'APROVADO') r.reabrir = nao('Só mês fechado ou aprovado é reaberto.');
  else r.reabrir = sim;
  return r;
}
function GV_exigirAcao_(a, nome, oQue) { if (!a[nome] || !a[nome].pode) throw new Error('Não foi possível ' + oQue + ': ' + ((a[nome] && a[nome].motivo) || 'ação indisponível') + ' Atualize a tela (F5) se a situação mudou.'); }
/** Contexto de um passo: vendedor, mês, linha, cálculo ao vivo e as ações. */
function GV_passo_(eu, d) {
  var vid = GV_s_(d && d.vendedorId), comp = GV_comp_(d && d.competencia);
  if (!vid || !GV_usuarios_()[vid]) throw new Error('Não foi possível concluir: escolha o vendedor.');
  if (!comp) throw new Error('Não foi possível concluir: escolha o mês (mês e ano).');
  var f = GV_fechamento_(vid, comp), calc = GV_apurarAoVivo_(vid, comp);
  return { vid: vid, comp: comp, f: f, calc: calc, acoes: GV_acoes_(eu, vid, comp, f, calc), nome: GV_usuarios_()[vid].nome };
}
function GV_conferir_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'conferir', 'registrar a conferência');
    var f = GV_garantirFechamento_(x.vid, x.comp), de = GV_up_(f.SITUACAO);
    var obs = GV_texto_(d.observacao, 1000);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, f.ID, { SITUACAO: 'CONFERIDO', CONFERIDO_HASH: x.calc.hash, CONTESTADO_HASH: '', CONFERIDO_EM: GV_agora_(), CONFERIDO_POR_ID: eu.id, CONFERIDO_POR_NOME: eu.nome, CONFERIDO_OBS: obs,
      RECEBIDO_TOTAL: x.calc.total, PERCENTUAL: x.calc.pct, COMISSAO: x.calc.comissao, CONTRATO_ID: x.calc.contrato.id, ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', f.ID, 'CONFERIDO', eu, { vendedorId: x.vid, competencia: x.comp, de: de, para: 'CONFERIDO', texto: 'Recebido ' + x.calc.totalBr + ', faixa ' + GV_pct_(x.calc.pct) + ', comissão ' + GV_moeda_(x.calc.comissao) + (obs ? '. Observação: ' + obs : '') });
    return { situacao: 'CONFERIDO' };
  });
}
function GV_contestar_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'contestar', 'registrar a contestação');
    var motivo = GV_texto_(d.motivo, 2000);
    if (motivo.length < GV_MOTIVO_MIN) throw new Error('Não foi possível contestar: escreva o que está errado (' + GV_MOTIVO_MIN + ' letras ou mais), por exemplo "falta o recebimento da proposta PROP-2026-0042, pago em 20/10".');
    var f = GV_garantirFechamento_(x.vid, x.comp), de = GV_up_(f.SITUACAO);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, f.ID, { SITUACAO: 'CONTESTADO', CONTESTADO_HASH: x.calc.hash, CONFERIDO_HASH: '', CONTESTADO_EM: GV_agora_(), CONTESTADO_MOTIVO: motivo, RESPOSTA_CONTESTACAO: '',
      RECEBIDO_TOTAL: x.calc.total, PERCENTUAL: x.calc.pct, COMISSAO: x.calc.comissao, CONTRATO_ID: x.calc.contrato.id, ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', f.ID, 'CONTESTADO', eu, { vendedorId: x.vid, competencia: x.comp, de: de, para: 'CONTESTADO', texto: 'Motivo: ' + motivo });
    return { situacao: 'CONTESTADO' };
  });
}
/** Congela o cálculo: cópia completa (contrato, faixas, recebimentos, total, faixa, %, comissão) e a marca SHA-256. */
function GV_fechar_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'fechar', 'fechar o mês');
    var resposta = GV_texto_(d.resposta, 2000);
    if (x.acoes.fecharPedeResposta && resposta.length < GV_MOTIVO_MIN) throw new Error('Não foi possível fechar: o vendedor contestou o mês ("' + GV_s_(x.f.CONTESTADO_MOTIVO).slice(0, 160) + '"). Corrija os recebimentos (o mês volta para ele conferir) ou escreva a resposta à contestação (' + GV_MOTIVO_MIN + ' letras ou mais); a Diretoria lê a contestação e a resposta antes de aprovar.');
    var copia = JSON.parse(JSON.stringify(x.calc));
    copia.vendedorNome = x.nome; copia.fechadoEm = GV_agora_(); copia.fechadoPor = eu.nome;
    copia.faixasTexto = copia.contrato.faixas.map(function (fx, i) { return GV_rotuloFaixa_(copia.contrato.faixas, i) + ': ' + GV_pct_(fx.pct); });
    var json = JSON.stringify(copia), hash = GV_marca_(json), de = GV_up_(x.f.SITUACAO);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, x.f.ID, { SITUACAO: 'FECHADO', CALCULO_JSON: json, CALCULO_HASH: hash, RECEBIDO_TOTAL: copia.total, PERCENTUAL: copia.pct, COMISSAO: copia.comissao,
      CONTRATO_ID: copia.contrato.id, RESPOSTA_CONTESTACAO: x.acoes.fecharPedeResposta ? resposta : GV_s_(x.f.RESPOSTA_CONTESTACAO), FECHADO_EM: GV_agora_(), FECHADO_POR_ID: eu.id, FECHADO_POR_NOME: eu.nome,
      APROVADO_EM: '', APROVADO_POR_ID: '', APROVADO_POR_NOME: '', APROVADO_OBS: '', ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', x.f.ID, 'FECHADO', eu, { vendedorId: x.vid, competencia: x.comp, de: de, para: 'FECHADO', texto: 'Recebido ' + copia.totalBr + ', faixa ' + GV_pct_(copia.pct) + ', comissão ' + GV_moeda_(copia.comissao) + '. Cópia do cálculo ' + hash.slice(0, 12) + '.' + (x.acoes.fecharPedeResposta ? ' Resposta à contestação: ' + resposta : '') });
    return { situacao: 'FECHADO', hash: hash };
  });
}
function GV_aprovar_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'aprovar', 'aprovar o fechamento');
    if (GV_s_(d.hash) && GV_s_(d.hash) !== GV_s_(x.f.CALCULO_HASH)) throw new Error('Não foi possível aprovar: o fechamento mudou desde que a tela foi aberta. Atualize a tela (F5) e confira de novo.');
    var obs = GV_texto_(d.observacao, 1000);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, x.f.ID, { SITUACAO: 'APROVADO', APROVADO_EM: GV_agora_(), APROVADO_POR_ID: eu.id, APROVADO_POR_NOME: eu.nome, APROVADO_OBS: obs, ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', x.f.ID, 'APROVADO', eu, { vendedorId: x.vid, competencia: x.comp, de: 'FECHADO', para: 'APROVADO', texto: 'Comissão ' + GV_moeda_(x.f.COMISSAO) + ' aprovada (cópia ' + GV_s_(x.f.CALCULO_HASH).slice(0, 12) + ').' + (obs ? ' Observação: ' + obs : '') });
    return { situacao: 'APROVADO' };
  });
}
function GV_devolver_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'devolver', 'devolver o fechamento');
    var motivo = GV_texto_(d.motivo, 2000);
    if (motivo.length < GV_MOTIVO_MIN) throw new Error('Não foi possível devolver: escreva o motivo (' + GV_MOTIVO_MIN + ' letras ou mais), dizendo ao Financeiro o que conferir ou corrigir.');
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, x.f.ID, { SITUACAO: 'DEVOLVIDO', DEVOLVIDO_EM: GV_agora_(), DEVOLVIDO_POR_ID: eu.id, DEVOLVIDO_POR_NOME: eu.nome, DEVOLVIDO_MOTIVO: motivo, ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', x.f.ID, 'DEVOLVIDO', eu, { vendedorId: x.vid, competencia: x.comp, de: 'FECHADO', para: 'DEVOLVIDO', texto: 'Motivo: ' + motivo + ' Cópia anterior do cálculo: ' + GV_s_(x.f.CALCULO_HASH).slice(0, 12) + '.' });
    return { situacao: 'DEVOLVIDO' };
  });
}
function GV_salvarComprovante_(arq, comp, nomeVendedor) {
  if (!arq || !GV_s_(arq.base64)) return null;
  if (!GV_s_(arq.nome) || !GV_RX_ANEXO.test(GV_s_(arq.nome))) throw new Error('Não foi possível registrar o pagamento: o comprovante precisa ser PDF ou imagem (PNG, JPG, WEBP, HEIC). Salve em PDF ou tire o print e anexe de novo, ou registre sem comprovante.');
  if (String(arq.base64).length > GV_ANEXO_MAX_BASE64) throw new Error('Não foi possível registrar o pagamento: o comprovante passa de 10 MB. Salve em tamanho menor e anexe de novo.');
  var raiz = SGO_DocSalvar_pastaPersistente_('GAN_PASTA_COMPROVANTES_ID', GV_PASTA_COMPROVANTES, '');
  var pasta = typeof RelA4_subpasta_ === 'function' ? RelA4_subpasta_(raiz, comp) : raiz;
  var b64 = String(arq.base64).replace(/^data:[^,]+,/, '');
  var nome = SGO_DocSalvar_sanitizarNome_('Comissao ' + GV_compBr_(comp).replace('/', '-') + ' - ' + nomeVendedor + ' - ' + GV_s_(arq.nome));
  var file = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(b64), GV_s_(arq.tipo) || 'application/octet-stream', nome));
  return { id: file.getId(), nome: file.getName(), url: file.getUrl() };
}
function GV_pagar_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'pagar', 'registrar o pagamento');
    var dia = GV_dia_(d.data);
    if (!dia) throw new Error('Não foi possível registrar o pagamento: informe a data do pagamento.');
    if (dia > GV_hoje_()) throw new Error('Não foi possível registrar o pagamento: a data (' + GV_brDia_(dia) + ') está no futuro. Registre depois de pagar.');
    if (dia < GV_dia_(x.f.APROVADO_EM)) throw new Error('Não foi possível registrar o pagamento: a data (' + GV_brDia_(dia) + ') é anterior à aprovação da Diretoria (' + GV_brDia_(x.f.APROVADO_EM) + '). Confira a data.');
    var forma = GV_up_(d.forma);
    if (!GV_FORMAS_PAGAMENTO[forma]) throw new Error('Não foi possível registrar o pagamento: escolha a forma (PIX, transferência, junto com a folha ou outra).');
    var obs = GV_texto_(d.observacao, 1000);
    if (forma === 'OUTRA' && obs.length < 10) throw new Error('Não foi possível registrar o pagamento: com "outra forma", descreva na observação como foi pago (10 letras ou mais).');
    var valor = GV_num_(d.valor);
    if (valor === null || GV_cent_(valor) !== GV_cent_(x.f.COMISSAO)) throw new Error('Não foi possível registrar o pagamento: o valor informado (' + (valor === null ? 'vazio' : GV_moeda_(valor)) + ') é diferente da comissão aprovada (' + GV_moeda_(x.f.COMISSAO) + '). Pagamento parcial não existe nesta etapa; confira o valor.');
    var arq = GV_salvarComprovante_(d.comprovante, x.comp, x.nome);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, x.f.ID, { SITUACAO: 'PAGO', PAGO_EM: GV_agora_(), PAGO_POR_ID: eu.id, PAGO_POR_NOME: eu.nome, PAGAMENTO_DATA: dia, PAGAMENTO_FORMA: forma, PAGAMENTO_VALOR: GV_r2_(valor),
      PAGAMENTO_OBS: obs, COMPROVANTE_ID: arq ? arq.id : '', COMPROVANTE_URL: arq ? arq.url : '', COMPROVANTE_NOME: arq ? arq.nome : '', ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', x.f.ID, 'PAGO', eu, { vendedorId: x.vid, competencia: x.comp, de: 'APROVADO', para: 'PAGO', texto: GV_moeda_(valor) + ' em ' + GV_brDia_(dia) + ' (' + GV_FORMAS_PAGAMENTO[forma] + ')' + (arq ? ', comprovante ' + arq.nome : ', sem comprovante') + (obs ? '. ' + obs : '') });
    return { situacao: 'PAGO' };
  });
}
function GV_reabrir_(eu, d) {
  return GV_comTrava_(function () {
    var x = GV_passo_(eu, d);
    GV_exigirAcao_(x.acoes, 'reabrir', 'reabrir o mês');
    var motivo = GV_texto_(d.motivo, 2000);
    if (motivo.length < GV_MOTIVO_MIN) throw new Error('Não foi possível reabrir: escreva o motivo (' + GV_MOTIVO_MIN + ' letras ou mais). O cálculo congelado fica no histórico.');
    var de = GV_up_(x.f.SITUACAO), velho = GV_s_(x.f.CALCULO_HASH);
    SGO_DATA.update(GV_ABAS.FECHAMENTOS, x.f.ID, { SITUACAO: 'ABERTO', CALCULO_JSON: '', CALCULO_HASH: '', CONFERIDO_HASH: '', CONTESTADO_HASH: '', REABERTO_EM: GV_agora_(), REABERTO_POR_NOME: eu.nome,
      REABERTO_MOTIVO: motivo, REABERTURAS: (Number(x.f.REABERTURAS) || 0) + 1, ATUALIZADO_EM: GV_agora_() });
    GV_historico_('FECHAMENTO', x.f.ID, 'REABERTO', eu, { vendedorId: x.vid, competencia: x.comp, de: de, para: 'ABERTO', texto: 'Motivo: ' + motivo + '. Cálculo que estava congelado (' + velho.slice(0, 12) + '): ' + GV_s_(x.f.CALCULO_JSON).slice(0, 4500) });
    return { situacao: 'ABERTO' };
  });
}

// ------------------------------------------------------------
// PAINEL, ÍNDICES E COMPARATIVO
// ------------------------------------------------------------
/** Quem a pessoa pode ver: todos (caixa) ou só ela mesma. */
function GV_podeVerVendedor_(eu, vid, pod) { return GV_s_(vid) === eu.id || !!(pod || GV_poderes_(eu)).GANHOS_VER_TODOS; }
function GV_exigirVer_(eu, vid, pod) {
  if (GV_podeVerVendedor_(eu, vid, pod)) return;
  throw new Error('Não foi possível abrir: você vê só os seus próprios ganhos. Os de outras pessoas são do Financeiro e da Diretoria.');
}
/** Vendedores para os seletores: equipe comercial (vendedores e gestão) e quem já tem contrato. */
function GV_vendedores_() {
  var us = GV_usuarios_(), ids = [];
  try {
    if (typeof Com_equipeComercial_ === 'function') Com_equipeComercial_().forEach(function (p) { if (ids.indexOf(p.id) < 0) ids.push(p.id); });
  } catch (e) { /* sem o Comercial: pelo cadastro abaixo */ }
  if (!ids.length) Object.keys(us).forEach(function (id) { var u = us[id]; if (u.ativo && (u.perfil === 'COMERCIAL' || u.area === 'COMERCIAL')) ids.push(id); });
  GV_lerMemo_(GV_ABAS.CONTRATOS).forEach(function (c) { var id = GV_s_(c.VENDEDOR_ID); if (id && ids.indexOf(id) < 0) ids.push(id); });
  return ids.filter(function (id) { return us[id]; }).map(function (id) {
    return { id: id, nome: us[id].nome, ativo: us[id].ativo, temContrato: GV_contratosDe_(id).length > 0 };
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}
function GV_resumoMes_(vid, comp) {
  var f = GV_fechamento_(vid, comp), calc = GV_apurar_(vid, comp), sit = GV_situacao_(f, comp);
  return { competencia: comp, rotulo: GV_compBr_(comp), recebido: calc.total, comissao: calc.comissao, pct: calc.pct, situacao: sit, situacaoNome: GV_SITUACOES[sit] || sit, temContrato: !!calc.contrato, nRec: (calc.recebimentos || []).length };
}
/** Data em que a proposta foi ganha (resposta do cliente ou assinatura). */
function GV_ganhaEm_(p) { return GV_dia_(p.RESPOSTA_EM) || GV_dia_(p.ASSINADA_EM) || ''; }
/** Índices dos 12 meses que terminam na competência. Nada inventado: o que não tem base volta null. */
function GV_indices_(vid, comp) {
  var ini = GV_somarMeses_(comp, -(GV_MESES_PAINEL - 1));
  var recs = GV_validos_(vid).filter(function (r) { var c = GV_comp_(r.COMPETENCIA); return c >= ini && c <= comp; });
  var tc = 0, porProposta = {}, porCliente = {};
  recs.forEach(function (r) {
    tc += GV_cent_(r.VALOR);
    var pid = GV_s_(r.PROPOSTA_ID); if (pid) porProposta[pid] = true;
    var cli = GV_s_(r.CLIENTE_NOME) || 'cliente não informado'; porCliente[cli] = (porCliente[cli] || 0) + GV_cent_(r.VALOR);
  });
  var nProp = Object.keys(porProposta).length;
  var props = GV_propostas_(), ganhas = [];
  Object.keys(props).forEach(function (id) {
    var p = props[id];
    if (GV_up_(p.SITUACAO) !== 'APROVADA' || GV_s_(p.EXCLUIDA_EM)) return;
    var v = GV_vendedorDaProposta_(p); if (!v || v.id !== GV_s_(vid)) return;
    var g = GV_ganhaEm_(p); if (!g || g.slice(0, 7) < ini || g.slice(0, 7) > comp) return;
    ganhas.push({ id: id, ganhaEm: g, total: GV_r2_(p.TOTAL) });
  });
  var primeiro = {};
  GV_validos_(vid).forEach(function (r) { var pid = GV_s_(r.PROPOSTA_ID), dia = GV_dia_(r.DATA_RECEBIMENTO); if (pid && (!primeiro[pid] || dia < primeiro[pid])) primeiro[pid] = dia; });
  var recebidas = ganhas.filter(function (g) { return !!primeiro[g.id]; });
  var prazos = recebidas.map(function (g) { return GV_diasEntre_(g.ganhaEm, primeiro[g.id]); }).filter(function (n) { return n !== null && n >= 0; });
  var prazo = prazos.length ? Math.round(prazos.reduce(function (a, b) { return a + b; }, 0) / prazos.length) : null;
  var clientes = Object.keys(porCliente).map(function (k) { return { nome: k, valor: porCliente[k] / 100 }; }).sort(function (a, b) { return b.valor - a.valor; });
  var maior = clientes[0] || null;
  return {
    periodo: GV_compBr_(ini) + ' a ' + GV_compBr_(comp), recebido12: tc / 100, recebido12Br: GV_moeda_(tc / 100),
    ticketMedio: nProp ? GV_r2_(tc / 100 / nProp) : null, ticketMedioBr: nProp ? GV_moeda_(tc / 100 / nProp) : '—', propostasComRecebimento: nProp,
    ganhas: ganhas.length, ganhasRecebidas: recebidas.length, ganhasValorBr: GV_moeda_(ganhas.reduce(function (a, g) { return a + g.total; }, 0)),
    prazoMedioDias: prazo, prazoBase: prazos.length,
    clientes: clientes.length, maiorCliente: maior ? maior.nome : '', maiorClientePct: maior && tc ? Math.round(maior.valor * 10000 / (tc / 100)) / 100 : null,
    topClientes: clientes.slice(0, 5).map(function (c) { return { nome: c.nome, valorBr: GV_moeda_(c.valor), pct: tc ? Math.round(c.valor * 10000 / (tc / 100)) / 100 : 0 }; })
  };
}
function GV_historicoTela_(vid, comp) {
  return GV_lerMemo_(GV_ABAS.HISTORICO).filter(function (h) { return GV_s_(h.VENDEDOR_ID) === GV_s_(vid) && (!comp || GV_comp_(h.COMPETENCIA) === comp); })
    .sort(function (a, b) { return GV_s_(a.EM) < GV_s_(b.EM) ? 1 : -1; }).slice(0, 60)
    .map(function (h) { return { acao: GV_s_(h.ACAO), de: GV_s_(h.DE), para: GV_s_(h.PARA), texto: GV_s_(h.TEXTO).slice(0, 600), por: GV_s_(h.POR_NOME), em: GV_br_(h.EM) }; });
}
function GV_fechamentoTela_(f, comp) {
  var sit = GV_situacao_(f, comp);
  var passo = function (em, por, txt) { return em ? { em: GV_br_(em), por: GV_s_(por), texto: GV_s_(txt) } : null; };
  return { situacao: sit, situacaoNome: GV_SITUACOES[sit] || sit, existe: !!f,
    conferido: f ? passo(f.CONFERIDO_EM, f.CONFERIDO_POR_NOME, f.CONFERIDO_OBS) : null,
    contestado: f && GV_s_(f.CONTESTADO_MOTIVO) ? passo(f.CONTESTADO_EM, f.VENDEDOR_NOME, f.CONTESTADO_MOTIVO) : null, resposta: f ? GV_s_(f.RESPOSTA_CONTESTACAO) : '',
    fechado: f ? passo(f.FECHADO_EM, f.FECHADO_POR_NOME, '') : null, aprovado: f ? passo(f.APROVADO_EM, f.APROVADO_POR_NOME, f.APROVADO_OBS) : null,
    devolvido: f && GV_s_(f.DEVOLVIDO_MOTIVO) ? passo(f.DEVOLVIDO_EM, f.DEVOLVIDO_POR_NOME, f.DEVOLVIDO_MOTIVO) : null,
    pago: f && GV_s_(f.PAGO_EM) ? { em: GV_br_(f.PAGO_EM), por: GV_s_(f.PAGO_POR_NOME), data: GV_brDia_(f.PAGAMENTO_DATA), forma: GV_FORMAS_PAGAMENTO[GV_up_(f.PAGAMENTO_FORMA)] || GV_s_(f.PAGAMENTO_FORMA),
      valorBr: GV_moeda_(f.PAGAMENTO_VALOR), obs: GV_s_(f.PAGAMENTO_OBS), comprovanteUrl: GV_s_(f.COMPROVANTE_URL), comprovanteNome: GV_s_(f.COMPROVANTE_NOME) } : null,
    reaberto: f && GV_s_(f.REABERTO_EM) ? passo(f.REABERTO_EM, f.REABERTO_POR_NOME, f.REABERTO_MOTIVO) : null, reaberturas: f ? Number(f.REABERTURAS) || 0 : 0,
    hash: f ? GV_s_(f.CALCULO_HASH) : '', comissaoCongelada: f && GV_CONGELADOS.indexOf(GV_up_(f.SITUACAO)) >= 0 ? GV_r2_(f.COMISSAO) : null };
}
function GV_calcTela_(calc) {
  var c = calc.contrato;
  return { competencia: calc.competencia, rotulo: GV_compBr_(calc.competencia), nome: GV_compNome_(calc.competencia), congelado: !!calc.congelado, total: calc.total, totalBr: GV_moeda_(calc.total),
    temContrato: !!c, contrato: c ? { id: c.id, vigenciaBr: GV_compBr_(c.vigencia), faixas: c.faixas, faixasTexto: c.faixas.map(function (f, i) { return GV_rotuloFaixa_(c.faixas, i) + ': ' + GV_pct_(f.pct); }) } : null,
    faixa: calc.faixa, pct: calc.pct, pctBr: calc.pct === null ? '—' : GV_pct_(calc.pct), comissao: calc.comissao, comissaoBr: calc.comissao === null ? '—' : GV_moeda_(calc.comissao),
    proxima: calc.proxima ? { pctBr: GV_pct_(calc.proxima.pct), aPartirDeBr: GV_moeda_(calc.proxima.aPartirDe), faltaBr: GV_moeda_(calc.proxima.falta), falta: calc.proxima.falta, rotulo: calc.proxima.rotulo } : null,
    recebimentos: calc.recebimentos || [], hash: calc.hash };
}
function GV_painel_(eu, d) {
  var pod = GV_poderes_(eu), vid = GV_s_(d && d.vendedorId) || eu.id, comp = GV_comp_(d && d.competencia) || GV_compAtual_();
  GV_exigirVer_(eu, vid, pod);
  var us = GV_usuarios_();
  if (!us[vid]) throw new Error('Não foi possível abrir: o vendedor não foi encontrado no cadastro.');
  var f = GV_fechamento_(vid, comp), calcVivo = GV_apurarAoVivo_(vid, comp), calc = GV_apurar_(vid, comp);
  var serie = [];
  for (var i = GV_MESES_PAINEL - 1; i >= 0; i--) serie.push(GV_resumoMes_(vid, GV_somarMeses_(comp, -i)));
  var contratos = GV_contratosDe_(vid, true).map(GV_contratoParaTela_);
  return { vendedor: { id: vid, nome: us[vid].nome, eu: vid === eu.id }, competencia: comp, apuracao: GV_calcTela_(calc), fechamento: GV_fechamentoTela_(f, comp),
    acoes: GV_acoes_(eu, vid, comp, f, calcVivo, pod), mudouDepoisDaConferencia: !!(f && GV_up_(f.SITUACAO) === 'CONFERIDO' && GV_s_(f.CONFERIDO_HASH) !== calcVivo.hash),
    serie: serie, indices: GV_indices_(vid, comp), contratos: contratos, historico: GV_historicoTela_(vid, comp),
    ultimaAvaliacao: GV_ultimaAvaliacao_(vid, comp) };
}
function GV_comparativo_(eu, d) {
  GV_exigir_(eu, 'GANHOS_VER_TODOS', 'abrir o comparativo', 'O comparativo entre vendedores é do Financeiro e da Diretoria.');
  var comp = GV_comp_(d && d.competencia) || GV_compAtual_();
  var linhas = GV_vendedores_().map(function (v) {
    var r = GV_resumoMes_(v.id, comp), ind = GV_indices_(v.id, comp), calc = GV_apurar_(v.id, comp);
    return { id: v.id, nome: v.nome, temContrato: r.temContrato, recebido: r.recebido, recebidoBr: GV_moeda_(r.recebido), pctBr: r.pct === null ? '—' : GV_pct_(r.pct),
      faixaNumero: calc.faixa ? calc.faixa.numero + ' de ' + calc.faixa.de : '—', comissao: r.comissao, comissaoBr: r.comissao === null ? '—' : GV_moeda_(r.comissao),
      faltaBr: calc.proxima ? GV_moeda_(calc.proxima.falta) : '—', situacao: r.situacao, situacaoNome: r.situacaoNome, recebido12Br: ind.recebido12Br, prazoMedioDias: ind.prazoMedioDias };
  });
  var tot = linhas.reduce(function (a, l) { a.r += GV_cent_(l.recebido); a.c += GV_cent_(l.comissao || 0); return a; }, { r: 0, c: 0 });
  var aClassificar = GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) === 'A_CLASSIFICAR' && GV_comp_(r.COMPETENCIA) === comp; });
  return { competencia: comp, linhas: linhas, totalRecebidoBr: GV_moeda_(tot.r / 100), totalComissaoBr: GV_moeda_(tot.c / 100),
    aClassificar: aClassificar.length, aClassificarBr: GV_moeda_(aClassificar.reduce(function (a, r) { return a + GV_cent_(r.VALOR); }, 0) / 100) };
}
function GV_listarRecebimentos_(eu, d) {
  d = d || {};
  var pod = GV_poderes_(eu), comp = GV_comp_(d.competencia), sit = GV_up_(d.situacao), vid = GV_s_(d.vendedorId);
  if (!pod.GANHOS_VER_TODOS && !pod.GANHOS_RECEBIMENTOS) vid = eu.id;
  else if (vid) GV_exigirVer_(eu, vid, pod);
  var l = GV_recebimentos_().filter(function (r) {
    if (vid && GV_s_(r.VENDEDOR_ID) !== vid) return false;
    if (comp && GV_comp_(r.COMPETENCIA) !== comp) return false;
    if (sit && GV_up_(r.SITUACAO) !== sit) return false;
    return true;
  }).sort(function (a, b) { return GV_dia_(a.DATA_RECEBIMENTO) < GV_dia_(b.DATA_RECEBIMENTO) ? 1 : -1; });
  var aClass = pod.GANHOS_RECEBIMENTOS ? GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) === 'A_CLASSIFICAR'; }).length : 0;
  return { recebimentos: l.slice(0, 300).map(GV_recParaTela_), total: l.length, aClassificar: aClass, podeLancar: !!pod.GANHOS_RECEBIMENTOS,
    omie: !!pod.GANHOS_RECEBIMENTOS && typeof GV_omieDisponivel_ === 'function' && GV_omieDisponivel_() && (typeof SGO_pode_ !== 'function' || !!SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) && typeof Omie_contaNoSigilo_ === 'function' && Omie_contaNoSigilo_(eu && (eu.userId || eu.id)) };
}
function GV_listarContratos_(eu, d) {
  var pod = GV_poderes_(eu), vid = GV_s_(d && d.vendedorId);
  var lista = GV_lerMemo_(GV_ABAS.CONTRATOS).filter(function (c) { return pod.GANHOS_VER_TODOS || pod.GANHOS_CONTRATOS ? (!vid || GV_s_(c.VENDEDOR_ID) === vid) : GV_s_(c.VENDEDOR_ID) === eu.id; })
    .sort(function (a, b) { return GV_s_(a.VENDEDOR_NOME).localeCompare(GV_s_(b.VENDEDOR_NOME), 'pt-BR') || (GV_comp_(a.VIGENCIA_INICIO) < GV_comp_(b.VIGENCIA_INICIO) ? 1 : -1); });
  var hoje = GV_compAtual_();
  return { contratos: lista.map(function (c) { var t = GV_contratoParaTela_(c); var vig = GV_contratoVigente_(c.VENDEDOR_ID, hoje); t.vigenteHoje = !!vig && GV_s_(vig.ID) === t.id; return t; }),
    podeAlterar: !!pod.GANHOS_CONTRATOS, modelo: GV_MODELO_MONICA };
}

// ------------------------------------------------------------
// AVALIAÇÃO (IA com os números apurados; sem chave, regras)
// ------------------------------------------------------------
/** Fatos do mês para a avaliação: só números apurados pelo sistema (a IA não recebe nada além disto). */
function GV_fatos_(vid, comp) {
  var us = GV_usuarios_(), calc = GV_apurar_(vid, comp), ind = GV_indices_(vid, comp);
  var ant = [1, 2, 3].map(function (i) { return GV_apurar_(vid, GV_somarMeses_(comp, -i)).total; });
  var media3 = GV_r2_(ant.reduce(function (a, b) { return a + b; }, 0) / 3);
  var variacao = media3 > 0 ? Math.round((calc.total - media3) * 10000 / media3) / 100 : null;
  var porCliMes = {};
  (calc.recebimentos || []).forEach(function (r) { var k = r.cliente || 'cliente não informado'; porCliMes[k] = (porCliMes[k] || 0) + GV_cent_(r.valor); });
  var cliMes = Object.keys(porCliMes).map(function (k) { return { nome: k, v: porCliMes[k] / 100 }; }).sort(function (a, b) { return b.v - a.v; });
  return {
    vendedor: GV_primeiroNome_(us[vid] ? us[vid].nome : ''), competencia: GV_compBr_(comp), mesNome: GV_compNome_(comp), mesEmAndamento: comp >= GV_compAtual_(),
    temContrato: !!calc.contrato, recebidoMes: GV_moeda_(calc.total), recebimentosNoMes: (calc.recebimentos || []).length,
    faixaAtingida: calc.faixa ? calc.faixa.numero + ' de ' + calc.faixa.de : '', percentualAplicado: calc.pct === null ? '' : GV_pct_(calc.pct),
    comissaoMes: calc.comissao === null ? '' : GV_moeda_(calc.comissao),
    proximaFaixa: calc.proxima ? { percentual: GV_pct_(calc.proxima.pct), aPartirDe: GV_moeda_(calc.proxima.aPartirDe), faltaReceber: GV_moeda_(calc.proxima.falta) } : null,
    mediaRecebida3MesesAnteriores: GV_moeda_(media3), variacaoSobreMedia: variacao === null ? '' : GV_numBr_(variacao, 2).replace(/,00$/, '') + '%',
    clientesNoMes: cliMes.length, maiorClienteDoMes: cliMes[0] ? cliMes[0].nome : '', participacaoMaiorClienteMes: cliMes[0] && calc.total ? GV_numBr_(Math.round(cliMes[0].v * 10000 / calc.total) / 100, 2).replace(/,00$/, '') + '%' : '',
    recebido12Meses: ind.recebido12Br, ticketMedio12Meses: ind.ticketMedioBr, propostasGanhas12Meses: ind.ganhas, propostasGanhasJaRecebidas: ind.ganhasRecebidas,
    prazoMedioGanhoAteRecebimentoDias: ind.prazoMedioDias === null ? '' : ind.prazoMedioDias,
    participacaoMaiorCliente12Meses: ind.maiorClientePct === null ? '' : GV_numBr_(ind.maiorClientePct, 2).replace(/,00$/, '') + '%', maiorCliente12Meses: ind.maiorCliente
  };
}
/** Texto pelas regras (sem IA): tendência, concentração, prazo de recebimento e o que falta para subir de faixa. */
function GV_textoRegras_(f) {
  var t = [];
  if (!f.temContrato) return 'Não há contrato de ganhos valendo em ' + f.competencia + ' para ' + f.vendedor + '. Sem o contrato, o sistema não calcula a faixa nem a comissão; o Financeiro cadastra o contrato em Ganhos dos vendedores > Contratos.';
  t.push('Em ' + f.mesNome + (f.mesEmAndamento ? ' (mês em andamento)' : '') + ', ' + f.vendedor + ' teve ' + f.recebidoMes + ' recebidos em ' + f.recebimentosNoMes + (f.recebimentosNoMes === 1 ? ' lançamento' : ' lançamentos') + ', na faixa ' + f.faixaAtingida + ' (' + f.percentualAplicado + '), com comissão de ' + f.comissaoMes + '.');
  if (f.variacaoSobreMedia !== '') {
    var neg = /^-/.test(f.variacaoSobreMedia);
    t.push('Em relação à média dos três meses anteriores (' + f.mediaRecebida3MesesAnteriores + '), o recebido ' + (neg ? 'caiu ' + f.variacaoSobreMedia.replace(/^-/, '') : 'subiu ' + f.variacaoSobreMedia) + '.');
  } else t.push('Não houve recebimento nos três meses anteriores, então ainda não há tendência para comparar.');
  var part = GV_num_(f.participacaoMaiorClienteMes);
  if (part !== null && part >= 50 && f.clientesNoMes > 0) t.push('O mês ficou concentrado: ' + f.maiorClienteDoMes + ' respondeu por ' + f.participacaoMaiorClienteMes + ' do recebido. Vale ampliar a carteira para não depender de um único cliente.');
  else if (f.clientesNoMes > 1) t.push('O recebido do mês veio de ' + f.clientesNoMes + ' clientes, sem concentração acima da metade em um só.');
  if (f.prazoMedioGanhoAteRecebimentoDias !== '') {
    var pz = Number(f.prazoMedioGanhoAteRecebimentoDias);
    t.push('Entre o ganho da proposta e o primeiro recebimento passaram, em média, ' + pz + ' dias nos últimos 12 meses' + (pz > 45 ? '; acompanhar com o Financeiro a emissão da nota e a cobrança ajuda a trazer o dinheiro mais cedo.' : '.'));
  }
  if (f.propostasGanhas12Meses > f.propostasGanhasJaRecebidas) t.push('Das ' + f.propostasGanhas12Meses + ' propostas ganhas em 12 meses, ' + f.propostasGanhasJaRecebidas + ' já tiveram recebimento; as demais são o caminho mais curto para aumentar o recebido.');
  if (f.proximaFaixa) t.push('Para chegar à faixa de ' + f.proximaFaixa.percentual + ', faltam ' + f.proximaFaixa.faltaReceber + ' recebidos no mês (a partir de ' + f.proximaFaixa.aPartirDe + ').');
  else t.push('A faixa atingida já é a mais alta do contrato.');
  return t.join(' ');
}
function GV_iaDisponivel_() { try { return !!GV_s_(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')); } catch (e) { return false; } }
function GV_promptIA_(f) {
  return 'Você redige a avaliação mensal de desempenho de um vendedor da Metrolabs (empresa de metrologia e qualificação hospitalar), para o próprio vendedor, o Financeiro e a Diretoria.\n' +
    'REGRAS OBRIGATÓRIAS:\n- Português do Brasil, tom profissional e direto, de 4 a 6 frases corridas, sem listas, sem títulos, sem negrito, sem emoji e sem mencionar inteligência artificial.\n' +
    '- Use SOMENTE os números dos FATOS, escritos exatamente como aparecem (R$ 1.234,56; 12,5%; dias). Não calcule número novo, não arredonde, não estime.\n' +
    '- Comente: a tendência do recebido em relação à média dos três meses anteriores; a concentração em poucos clientes; o prazo entre o ganho e o recebimento; e o que falta para subir de faixa (ou que já está na faixa mais alta).\n' +
    '- Não prometa resultado, não garanta comissão e não sugira desconto. Comissão é sobre o valor recebido no mês, na faixa cheia do contrato.\n' +
    '- Responda só com JSON: {"texto": "..."}\n\nFATOS:\n' + JSON.stringify(f);
}
function GV_lerJson_(t) {
  var s = GV_s_(t).replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  var i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
}
/** Confere o texto da IA: só números dos fatos (com mês e ano), sem expressão proibida. */
function GV_verificarTexto_(texto, fatos) {
  var problemas = [];
  if (typeof SGO_QIAV_verificar_ === 'function') {
    var nums = typeof SGO_QIAV_numerosDe_ === 'function' ? SGO_QIAV_numerosDe_(fatos) : [];
    nums.push(3, 12, 1);
    var r = SGO_QIAV_verificar_(texto, { numeros: nums, normas: [], veredito: '', inteirosLivresAte: 6, termosProibidos: [] });
    problemas = problemas.concat(r.problemas || []);
  }
  if (/\b(garanto|garantimos|garantida|prometo|prometemos)\b/i.test(texto)) problemas.push('promessa ou garantia');
  if (/\*\*|^#|\bIA\b|intelig[eê]ncia artificial/m.test(texto)) problemas.push('formatação ou referência a IA');
  if (GV_s_(texto).length < 80) problemas.push('texto curto demais');
  return { ok: !problemas.length, problemas: problemas };
}
function GV_avaliacao_(eu, d) {
  var vid = GV_s_(d && d.vendedorId) || eu.id, comp = GV_comp_(d && d.competencia) || GV_compAtual_();
  GV_exigirVer_(eu, vid);
  var fatos = GV_fatos_(vid, comp), regras = GV_textoRegras_(fatos), texto = regras, origem = 'REGRAS', aviso = '', verif = '';
  if (fatos.temContrato && GV_iaDisponivel_() && typeof SGO_DocA4_chamarGemini_ === 'function') {
    try {
      var resp = SGO_DocA4_chamarGemini_(GV_promptIA_(fatos), { tokens: 4096, temperatura: 0.2 });
      var j = GV_lerJson_(resp), t = j && GV_s_(j.texto);
      if (!t) aviso = 'A resposta da IA não veio no formato esperado; vale a análise pelas regras.';
      else {
        var v = GV_verificarTexto_(t, fatos);
        verif = v.problemas.join('; ');
        if (v.ok) { texto = t; origem = 'IA'; }
        else aviso = 'A IA citou algo fora dos números apurados (' + v.problemas.slice(0, 2).join('; ') + '); vale a análise pelas regras.';
      }
    } catch (e) { aviso = 'A IA não respondeu agora (' + GV_erro_(e).replace(/[.\s]+$/, '').slice(0, 140) + '); vale a análise pelas regras.'; }
  } else if (fatos.temContrato && !GV_iaDisponivel_()) aviso = 'A chave da IA não está cadastrada (Administração > Chaves e senhas): a análise abaixo é pelas regras do sistema.';
  try {
    GV_garantirAbas_();
    SGO_DATA.insert(GV_ABAS.AVALIACOES, { ID: GV_id_(), VENDEDOR_ID: vid, COMPETENCIA: comp, ORIGEM: origem, TEXTO: GV_texto_(texto, 4000), FATOS_JSON: JSON.stringify(fatos).slice(0, 8000),
      VERIFICACAO: GV_texto_(verif || aviso, 1000), POR_ID: eu.id, POR_NOME: eu.nome, EM: GV_agora_() });
  } catch (e) { console.error('Ganhos dos vendedores, avaliação: ' + GV_erro_(e)); }
  return { texto: texto, origem: origem, origemNome: origem === 'IA' ? 'Redigida pela IA a partir dos números apurados e conferida pelo sistema' : 'Análise pelas regras do sistema', aviso: aviso, em: GV_br_(GV_agora_()), fatos: fatos };
}
function GV_ultimaAvaliacao_(vid, comp) {
  var l = GV_lerMemo_(GV_ABAS.AVALIACOES).filter(function (a) { return GV_s_(a.VENDEDOR_ID) === GV_s_(vid) && GV_comp_(a.COMPETENCIA) === comp; })
    .sort(function (a, b) { return GV_s_(a.EM) < GV_s_(b.EM) ? 1 : -1; });
  if (!l.length) return null;
  return { texto: GV_s_(l[0].TEXTO), origem: GV_s_(l[0].ORIGEM), origemNome: GV_s_(l[0].ORIGEM) === 'IA' ? 'Redigida pela IA a partir dos números apurados e conferida pelo sistema' : 'Análise pelas regras do sistema', em: GV_br_(l[0].EM), por: GV_s_(l[0].POR_NOME) };
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS E CAIXA DE DECISÕES
// ------------------------------------------------------------
var GV_PEND_TIPOS = {
  ganhos_conferir: { modulo: GV_MODULO, um: 'mês de ganhos para você conferir', varios: 'meses de ganhos para você conferir', rotulo: 'Conferir os ganhos', fazer: 'confira os recebimentos e a comissão em Ganhos dos vendedores > Fechamento do mês', tela: { tipo: 'modulo', mod: GV_TELA }, origem: 'GANHOS' },
  ganhos_fechar: { modulo: GV_MODULO, um: 'mês de ganhos de vendedor para fechar', varios: 'meses de ganhos de vendedores para fechar', rotulo: 'Fechar o mês', fazer: 'feche o mês em Ganhos dos vendedores > Fechamento do mês', tela: { tipo: 'modulo', mod: GV_TELA }, origem: 'GANHOS' },
  ganhos_aprovar: { modulo: GV_MODULO, um: 'fechamento de ganhos aguardando a Diretoria', varios: 'fechamentos de ganhos aguardando a Diretoria', rotulo: 'Aprovar o fechamento', fazer: 'aprove ou devolva em Ganhos dos vendedores > Fechamento do mês', tela: { tipo: 'modulo', mod: GV_TELA }, origem: 'GANHOS' },
  ganhos_pagar: { modulo: GV_MODULO, um: 'comissão aprovada para pagar', varios: 'comissões aprovadas para pagar', rotulo: 'Registrar o pagamento', fazer: 'pague e registre em Ganhos dos vendedores > Fechamento do mês', tela: { tipo: 'modulo', mod: GV_TELA }, origem: 'GANHOS' },
  ganhos_classificar: { modulo: GV_MODULO, um: 'recebimento sem vendedor para classificar', varios: 'recebimentos sem vendedor para classificar', rotulo: 'Classificar recebimentos', fazer: 'ligue cada recebimento à proposta em Ganhos dos vendedores > Recebimentos', tela: { tipo: 'modulo', mod: GV_TELA }, origem: 'GANHOS' }
};
var GV_GES_TIPOS = { ganhos_aprovar: { prazo: 2 } };
function GV_registrarTipos_() {
  try {
    if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(GV_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = GV_PEND_TIPOS[k]; });
    if (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS && !PEND_MODULOS[GV_MODULO]) PEND_MODULOS[GV_MODULO] = 'Ganhos dos vendedores';
    if (typeof PEND_FONTES !== 'undefined' && Array.isArray(PEND_FONTES) && !PEND_FONTES.some(function (f) { return f && f.nome === 'Ganhos dos vendedores'; })) {
      PEND_FONTES.push({ nome: 'Ganhos dos vendedores', fn: function (add, ctx) { if (!ctx.cliente && typeof Ganhos_fontePendencias_ === 'function') Ganhos_fontePendencias_(add, ctx); } });
    }
    if (typeof GES_TIPOS !== 'undefined' && GES_TIPOS) Object.keys(GV_GES_TIPOS).forEach(function (k) { if (!GES_TIPOS[k]) GES_TIPOS[k] = GV_GES_TIPOS[k]; });
    if (typeof GES_AREA_MODULO_PADRAO !== 'undefined' && GES_AREA_MODULO_PADRAO && !GES_AREA_MODULO_PADRAO[GV_MODULO]) GES_AREA_MODULO_PADRAO[GV_MODULO] = 'FINANCEIRO';
  } catch (e) { try { console.error('Ganhos dos vendedores, registro na central: ' + GV_erro_(e)); } catch (x) {} }
}
function GV_abaExiste_(aba) { return typeof Pend_abaExiste_ !== 'function' || Pend_abaExiste_(aba); }
/**
 * Pendências: conferir (o vendedor), fechar e pagar (Financeiro), aprovar (Diretoria, também na Caixa de decisões) e
 * classificar (Financeiro). Sem valores no título. Só meses terminados dos últimos 12, a partir do primeiro contrato.
 */
function Ganhos_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  GV_registrarTipos_();
  if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.ganhos_conferir) return;
  if (!GV_abaExiste_(GV_ABAS.CONTRATOS)) return;
  GV_memoLimpar_();
  var atual = GV_compAtual_(), limite = GV_somarMeses_(atual, -GV_MESES_PENDENCIA), us = GV_usuarios_();
  var tela = { tipo: 'modulo', mod: GV_TELA }, fin = null, dir = null;
  var vendedores = {};
  GV_lerMemo_(GV_ABAS.CONTRATOS).forEach(function (c) { if (GV_up_(c.SITUACAO || 'ATIVO') === 'ATIVO' && GV_s_(c.VENDEDOR_ID)) { var v = GV_s_(c.VENDEDOR_ID), ini = GV_comp_(c.VIGENCIA_INICIO); if (!vendedores[v] || ini < vendedores[v]) vendedores[v] = ini; } });
  Object.keys(vendedores).forEach(function (vid) {
    var nome = us[vid] ? us[vid].nome : 'vendedor', comp = vendedores[vid] > limite ? vendedores[vid] : limite;
    for (; comp < atual; comp = GV_somarMeses_(comp, 1)) {
      var f = GV_fechamento_(vid, comp), sit = GV_situacao_(f, comp), rot = GV_compBr_(comp);
      if (sit === 'ABERTO') {
        if (!GV_contratoVigente_(vid, comp) || !us[vid] || !us[vid].ativo) continue;
        add(Pend_item_('ganhos_conferir', { id: 'GAN:CONF:' + vid + ':' + comp, nome: rot, publico: 'PESSOA', paraUsuarios: [vid], responsavel: nome, responsavelId: vid, gravidade: 'ATENCAO', dias: null,
          titulo: 'Conferir os seus ganhos de ' + rot, detalhe: 'Confira os recebimentos que entraram no mês, a faixa e a comissão. Se algo estiver errado, conteste com o motivo.',
          oQueFazer: 'Abra Ganhos dos vendedores > Fechamento do mês, escolha ' + rot + ' e toque em "Conferi: está certo" ou em "Contestar".', tela: tela }));
      } else if (sit === 'CONFERIDO' || sit === 'CONTESTADO' || sit === 'DEVOLVIDO') {
        if (fin === null) fin = GV_comPapel_('GANHOS_FECHAR', []);
        add(Pend_item_('ganhos_fechar', { id: 'GAN:FECH:' + vid + ':' + comp, nome: nome + ' ' + rot, publico: 'PESSOA', paraUsuarios: fin.filter(function (id) { return id !== vid; }), responsavel: 'Financeiro', responsavelId: '',
          gravidade: sit === 'CONTESTADO' || sit === 'DEVOLVIDO' ? 'CRITICO' : 'ATENCAO', dias: null,
          titulo: (sit === 'CONTESTADO' ? 'Ganhos contestados' : sit === 'DEVOLVIDO' ? 'Ganhos devolvidos pela Diretoria' : 'Fechar os ganhos') + ': ' + nome + ', ' + rot,
          detalhe: sit === 'CONTESTADO' ? 'O vendedor contestou: ' + GV_s_(f.CONTESTADO_MOTIVO).slice(0, 200) : sit === 'DEVOLVIDO' ? 'Motivo da Diretoria: ' + GV_s_(f.DEVOLVIDO_MOTIVO).slice(0, 200) : 'O vendedor conferiu os números do mês.',
          oQueFazer: 'Abra Ganhos dos vendedores > Fechamento do mês, escolha ' + nome + ' e ' + rot + ' e feche (ou corrija os recebimentos).', tela: tela }));
      } else if (sit === 'FECHADO') {
        var impedidos = [vid, GV_s_(f.FECHADO_POR_ID)];
        if (dir === null) dir = GV_comPapel_('GANHOS_APROVAR', []);
        add(Pend_item_('ganhos_aprovar', { id: 'GAN:APR:' + vid + ':' + comp, nome: nome + ' ' + rot, publico: 'DIRETORIA', paraUsuarios: dir.filter(function (id) { return impedidos.indexOf(id) < 0; }),
          responsavel: nome, responsavelId: vid, gravidade: 'ATENCAO', dias: null,
          titulo: 'Aprovar o fechamento de ganhos de ' + nome + ', ' + rot, detalhe: 'Fechado por ' + GV_s_(f.FECHADO_POR_NOME) + ' em ' + GV_br_(f.FECHADO_EM) + '.' + (GV_s_(f.CONTESTADO_MOTIVO) && GV_s_(f.RESPOSTA_CONTESTACAO) ? ' Houve contestação, com resposta do Financeiro.' : ''),
          oQueFazer: 'Abra Ganhos dos vendedores > Fechamento do mês, escolha ' + nome + ' e ' + rot + ', confira o cálculo congelado e aprove ou devolva com o motivo.', tela: tela,
          extra: { soDiretoria: true, naoPode: impedidos.filter(Boolean), area: 'FINANCEIRO' } }));
      } else if (sit === 'APROVADO' && GV_cent_(f.COMISSAO) > 0) {
        var pagam = GV_comPapel_('GANHOS_PAGAR', [vid, GV_s_(f.APROVADO_POR_ID)]);
        add(Pend_item_('ganhos_pagar', { id: 'GAN:PAG:' + vid + ':' + comp, nome: nome + ' ' + rot, publico: 'PESSOA', paraUsuarios: pagam, responsavel: 'Financeiro', responsavelId: '', gravidade: 'ATENCAO', dias: null,
          titulo: 'Pagar a comissão aprovada de ' + nome + ', ' + rot, detalhe: 'Aprovada por ' + GV_s_(f.APROVADO_POR_NOME) + ' em ' + GV_br_(f.APROVADO_EM) + '.',
          oQueFazer: 'Faça o pagamento e registre em Ganhos dos vendedores > Fechamento do mês (data, forma, valor e, se tiver, o comprovante).', tela: tela }));
      }
    }
  });
  var aClass = GV_recebimentos_().filter(function (r) { return GV_up_(r.SITUACAO) === 'A_CLASSIFICAR'; });
  if (aClass.length) {
    add(Pend_item_('ganhos_classificar', { id: 'GAN:CLASS', nome: String(aClass.length), publico: 'PESSOA', paraUsuarios: GV_comPapel_('GANHOS_RECEBIMENTOS', []), responsavel: 'Financeiro', responsavelId: '',
      gravidade: 'ATENCAO', dias: null, titulo: aClass.length === 1 ? '1 recebimento sem vendedor para classificar' : aClass.length + ' recebimentos sem vendedor para classificar',
      detalhe: 'Recebimento sem proposta (ou proposta sem responsável) não entra em nenhuma comissão até ser classificado.',
      oQueFazer: 'Abra Ganhos dos vendedores > Recebimentos, filtre "A classificar" e ligue cada um à proposta certa.', tela: tela }));
  }
}
/** Contagens para o menu e a faixa "Para você agora". */
function GV_contagens_(eu, pod) {
  var r = { conferir: 0, fechar: 0, aprovar: 0, pagar: 0, classificar: 0, lista: [] };
  if (typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined') return r;
  GV_registrarTipos_();
  var itens = [];
  try { Ganhos_fontePendencias_(function (it) { if (it) itens.push(it); }, { userId: eu.id, perfil: eu.perfil, cliente: false, gestao: true, interno: false }); } catch (e) { return r; }
  r.lista = [];
  itens.forEach(function (it) {
    if ((it.paraUsuarios || []).indexOf(eu.id) < 0) return;
    var k = it.tipo.replace('ganhos_', '');
    if (r[k] !== undefined) r[k]++;
    var m = /^GAN:[A-Z]+:(.+):(\d{4}-\d{2})$/.exec(GV_s_(it.id));
    r.lista.push({ tipo: k, titulo: it.titulo, vendedorId: m ? m[1] : '', competencia: m ? m[2] : '' });
  });
  return r;
}

// ------------------------------------------------------------
// CHAMADA ÚNICA DA TELA
// ------------------------------------------------------------
/**
 * acao: iniciar | painel | comparativo | contratos | salvarContrato | cancelarContrato | recebimentos | propostas |
 *       lancarRecebimento | classificarRecebimento | anularRecebimento | conferir | contestar | fechar | aprovar | devolver |
 *       pagar | reabrir | avaliacao. Nunca lança: { ok, ... } ou { ok: false, message }.
 */
function GanhosVendedores_api(sessionId, acao, dados) {
  try {
    dados = dados || {};
    GV_memoLimpar_();
    if (typeof Poderes_memoLimpar_ === 'function') { try { Poderes_memoLimpar_(); } catch (e0) {} }
    var eu = GV_eu_(sessionId), r;
    switch (GV_s_(acao)) {
      case 'iniciar': {
        var pod = GV_poderes_(eu), vendedores = [];
        try { vendedores = pod.GANHOS_VER_TODOS || pod.GANHOS_CONTRATOS || pod.GANHOS_RECEBIMENTOS ? GV_vendedores_() : []; } catch (e) { vendedores = []; }
        var temContrato = false;
        try { temContrato = GV_contratosDe_(eu.id, true).length > 0; } catch (e) { temContrato = false; }
        var vendedorEquipe = false;
        try { vendedorEquipe = typeof Com_nivelDe_ === 'function' && !!Com_nivelDe_({ id: eu.id, perfil: eu.perfil, area: eu.area, login: eu.login }).vendedor; } catch (e) { vendedorEquipe = false; }
        var algum = GV_PODERES.some(function (c) { return pod[c]; });
        var cont = { conferir: 0, fechar: 0, aprovar: 0, pagar: 0, classificar: 0 };
        try { cont = GV_contagens_(eu, pod); } catch (e) { /* sem as abas ainda */ }
        r = { ver: algum || temContrato || vendedorEquipe, souVendedor: temContrato || vendedorEquipe, temContrato: temContrato, poderes: pod, eu: { id: eu.id, nome: eu.nome },
          vendedores: vendedores, competenciaAtual: GV_compAtual_(), contagens: cont, formas: GV_FORMAS_PAGAMENTO, modelo: GV_MODELO_MONICA, motor: typeof SGO_pode_ === 'function', ia: GV_iaDisponivel_() };
        break;
      }
      case 'painel': r = GV_painel_(eu, dados); break;
      case 'comparativo': r = GV_comparativo_(eu, dados); break;
      case 'contratos': r = GV_listarContratos_(eu, dados); break;
      case 'salvarContrato': r = GV_salvarContrato_(eu, dados); break;
      case 'cancelarContrato': r = GV_cancelarContrato_(eu, dados); break;
      case 'recebimentos': r = GV_listarRecebimentos_(eu, dados); break;
      case 'propostas': r = GV_buscarPropostas_(eu, dados); break;
      case 'lancarRecebimento': r = GV_lancarRecebimento_(eu, dados); break;
      case 'omieRecebimentos': // 15/11/2026: SGO_Omie_Ganhos.js
        if (typeof GV_omieRecebimentos_ !== 'function') throw new Error('Não foi possível consultar o Omie: o módulo do Painel financeiro não está carregado. Lance pelo formulário.');
        r = GV_omieRecebimentos_(eu, dados); break;
      case 'classificarRecebimento': r = GV_classificarRecebimento_(eu, dados); break;
      case 'anularRecebimento': r = GV_anularRecebimento_(eu, dados); break;
      case 'conferir': r = GV_conferir_(eu, dados); break;
      case 'contestar': r = GV_contestar_(eu, dados); break;
      case 'fechar': r = GV_fechar_(eu, dados); break;
      case 'aprovar': r = GV_aprovar_(eu, dados); break;
      case 'devolver': r = GV_devolver_(eu, dados); break;
      case 'pagar': r = GV_pagar_(eu, dados); break;
      case 'reabrir': r = GV_reabrir_(eu, dados); break;
      case 'avaliacao': r = GV_avaliacao_(eu, dados); break;
      default: throw new Error('Não foi possível concluir: ação desconhecida em Ganhos dos vendedores. Atualize a página (F5) e tente de novo.');
    }
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: GV_erro_(e) };
  } finally {
    GV_memoLimpar_();
  }
}

// registro na central de pendências (SGO_Alertas_Central.js carrega antes deste); GES_TIPOS completa na hora do uso
GV_registrarTipos_();
